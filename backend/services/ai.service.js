/**
 * AI service — facade that picks the right provider.
 *
 * Three modes (based on .env):
 *   MOCK_MODE=true                  → mockAi
 *   MOCK_MODE=false, N8N_ENABLED=false → openai (direct)
 *   MOCK_MODE=false, N8N_ENABLED=true  → n8n webhook (falls back to openai)
 *
 * All providers return the same shape:
 *   { categoryScores, summary, strongMatches, partialMatches,
 *     missingSkills, requirements, recommendations, modelUsed }
 */

import { env } from '../config/env.js';
import * as mockAi from './mockAi.service.js';
import * as openai from './openai.service.js';
import { ApiError } from '../utils/ApiError.js';

/* --------------------------------------------------------------------------
   n8n provider — optional webhook (Phase 10)
   -------------------------------------------------------------------------- */

async function analyzeViaN8n({ resumeText, job }) {
  if (!env.N8N_WEBHOOK_URL) {
    throw ApiError.badRequest('N8N_WEBHOOK_URL is not configured');
  }

  const response = await fetch(env.N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resumeText,
      job: {
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
      },
    }),
  });

  if (!response.ok) {
    throw new ApiError(502, `n8n webhook failed (${response.status})`);
  }

  const data = await response.json();
  return { ...data, modelUsed: data.modelUsed || 'n8n' };
}

/* --------------------------------------------------------------------------
   Public API
   -------------------------------------------------------------------------- */

/**
 * Analyze a job vs. a resume.
 *
 * Provider selection:
 *   - MOCK_MODE → mock
 *   - N8N_ENABLED → n8n (fallback to direct on error)
 *   - otherwise → direct OpenAI
 */
export async function analyzeJob({ resumeText, job }) {
  if (!resumeText || resumeText.trim().length < 30) {
    throw ApiError.badRequest(
      'No resume text available. Upload your CV first (Resume page).'
    );
  }

  if (!job.description || job.description.trim().length < 20) {
    throw ApiError.badRequest(
      'Job description is too short. Add more details to the job before analyzing.'
    );
  }

  if (env.MOCK_MODE) {
    return mockAi.analyzeJob({ resumeText, job });
  }

  if (env.N8N_ENABLED) {
    try {
      return await analyzeViaN8n({ resumeText, job });
    } catch (err) {
      console.warn('[ai] n8n failed, falling back to direct OpenAI:', err.message);
      // fall through to direct
    }
  }

  return openai.analyzeJob({ resumeText, job });
}


/* --------------------------------------------------------------------------
   Cover letter
   -------------------------------------------------------------------------- */

/**
 * Generate a cover letter for a job.
 * Same provider selection logic as analyzeJob.
 */
export async function generateCoverLetter({ resumeText, job, language, tone }) {
  if (!resumeText || resumeText.trim().length < 30) {
    throw ApiError.badRequest(
      'No resume text available. Upload your CV first (Resume page).'
    );
  }

  if (env.MOCK_MODE) {
    return mockAi.generateCoverLetter({ resumeText, job, language, tone });
  }

  if (env.N8N_ENABLED) {
    // n8n provider not implemented for cover letters yet — fall through to direct.
    console.warn('[ai] n8n not implemented for cover letters — using direct OpenAI');
  }

  return openai.generateCoverLetter({ resumeText, job, language, tone });
}


/* --------------------------------------------------------------------------
   Recruiter reply
   -------------------------------------------------------------------------- */

export async function generateRecruiterReply({ message, language }) {
  if (!message || message.trim().length < 10) {
    throw ApiError.badRequest('Recruiter message is too short.');
  }

  if (env.MOCK_MODE) {
    return mockAi.generateRecruiterReply({ message, language });
  }

  if (env.N8N_ENABLED) {
    console.warn('[ai] n8n not implemented for recruiter replies — using direct OpenAI');
  }

  return openai.generateRecruiterReply({ message, language });
}