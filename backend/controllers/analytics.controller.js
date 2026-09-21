import * as analyticsService from '../services/analytics.service.js';

/**
 * GET /api/analytics
 * Protected. Returns aggregated data for the authenticated user.
 */
export async function getAnalytics(req, res, next) {
  try {
    const data = await analyticsService.getAnalytics(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}