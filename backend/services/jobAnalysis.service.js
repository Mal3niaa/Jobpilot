import { ApiError } from '../utils/ApiError.js';
import * as jobsDb from '../db/jobs.js';
import * as resumesDb from '../db/resumes.js';
import * as jobAnalysisDb from '../db/jobAnalysis.js';
import * as aiService from './ai.service.js';
import { computeMatchScore, validateWeights } from '../config/scoring.js';

// Fail fast on startup if weights are broken.
validateWeights();

/**
 * Run AI analysis on a job.
 *
 * Flow:
 *   1. Get the job (scoped by user_id).
 *   2. Get the user's active resume.
 *   3. Call AI provider.
 *   4. Compute final match score from category scores + weights.
 *   5. Persist to job_analysis.
 *   6. Update job.match_score for quick list display.
 *   7. Return the analysis.
 */
export async function analyzeJob(userId, jobId) {
  const job = await jobsDb.findJobById(userId, jobId);
  if (!job) throw ApiError.notFound('Job not found');

  const resume = await resumesDb.findActiveByUser(userId);
  if (!resume) {
    throw ApiError.badRequest('No active resume. Upload your CV first.');
  }
  if (!resume.raw_text || resume.raw_text.trim().length < 30) {
    throw ApiError.badRequest('Your resume has no extractable text.');
  }

  // AI call (mock / direct / n8n).
  const ai = await aiService.analyzeJob({
    resumeText: resume.raw_text,
    job,
  });

  // Final score from category scores + weights.
  const matchScore = computeMatchScore(ai.categoryScores);

  // Persist analysis.
  const saved = await jobAnalysisDb.createAnalysis(job.id, resume.id, {
    matchScore,
    summary: ai.summary,
    strongMatches: ai.strongMatches,
    partialMatches: ai.partialMatches,
    missingSkills: ai.missingSkills,
    requirements: ai.requirements,
    recommendations: ai.recommendations,
    modelUsed: ai.modelUsed,
  });

  // Update job.match_score (denormalized for list view).
  await jobsDb.updateJob(userId, job.id, { matchScore });

  return shapeAnalysis(saved);
}

/**
 * Get the latest analysis for a job (scoped by user_id).
 * Returns null if none exists.
 */
export async function getLatestAnalysis(userId, jobId) {
  const job = await jobsDb.findJobById(userId, jobId);
  if (!job) throw ApiError.notFound('Job not found');

  const analysis = await jobAnalysisDb.findLatestByJobId(jobId);
  return analysis ? shapeAnalysis(analysis) : null;
}

/**
 * Convert snake_case DB row → camelCase JSON for the API.
 */
function shapeAnalysis(row) {
  return {
    id: row.id,
    jobId: row.job_id,
    resumeId: row.resume_id,
    matchScore: row.match_score,
    summary: row.summary,
    strongMatches: row.strong_matches || [],
    partialMatches: row.partial_matches || [],
    missingSkills: row.missing_skills || [],
    requirements: row.requirements || [],
    recommendations: row.recommendations || [],
    modelUsed: row.model_used,
    createdAt: row.created_at,
  };
}