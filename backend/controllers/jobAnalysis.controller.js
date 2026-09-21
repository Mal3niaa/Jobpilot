import * as jobAnalysisService from '../services/jobAnalysis.service.js';

/**
 * POST /api/jobs/:id/analyze
 * Run AI analysis on a job. Protected.
 */
export async function analyze(req, res, next) {
  try {
    const analysis = await jobAnalysisService.analyzeJob(
      req.user.id,
      req.params.id
    );
    res.json({ success: true, data: { analysis } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/jobs/:id/analysis
 * Fetch the latest saved analysis for a job.
 */
export async function getAnalysis(req, res, next) {
  try {
    const analysis = await jobAnalysisService.getLatestAnalysis(
      req.user.id,
      req.params.id
    );
    res.json({ success: true, data: { analysis } });
  } catch (err) {
    next(err);
  }
}