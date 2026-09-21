import * as aiService from '../services/ai.service.js';
import * as jobsDb from '../db/jobs.js';
import * as resumesDb from '../db/resumes.js';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED_LANGUAGES = ['en', 'pl', 'uk'];
const ALLOWED_TONES = ['professional', 'friendly', 'concise'];

/**
 * POST /api/ai/cover-letter
 * Body: { jobId, language, tone }
 * Protected.
 *
 * Returns: { letter, language, tone, modelUsed }
 */
export async function coverLetter(req, res, next) {
  try {
    const userId = req.user.id;
    const { jobId, language = 'en', tone = 'professional' } = req.body;

    if (!jobId) throw ApiError.badRequest('jobId is required');
    if (!ALLOWED_LANGUAGES.includes(language)) {
      throw ApiError.badRequest(`language must be one of: ${ALLOWED_LANGUAGES.join(', ')}`);
    }
    if (!ALLOWED_TONES.includes(tone)) {
      throw ApiError.badRequest(`tone must be one of: ${ALLOWED_TONES.join(', ')}`);
    }

    // Load job (scoped to owner).
    const job = await jobsDb.findJobById(userId, Number(jobId));
    if (!job) throw ApiError.notFound('Job not found');

    // Load active resume.
    const resume = await resumesDb.findActiveByUser(userId);
    if (!resume) {
      throw ApiError.badRequest('No active resume. Upload your CV first.');
    }
    if (!resume.raw_text || resume.raw_text.trim().length < 30) {
      throw ApiError.badRequest('Your resume has no extractable text.');
    }

    const result = await aiService.generateCoverLetter({
      resumeText: resume.raw_text,
      job,
      language,
      tone,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}