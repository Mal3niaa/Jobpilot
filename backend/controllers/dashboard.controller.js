import * as jobService from '../services/job.service.js';
import { query } from '../db/pool.js';

/**
 * GET /api/dashboard/stats
 * Aggregated counters for the authenticated user.
 */
export async function getStats(req, res, next) {
  try {
    const userId = req.user.id;

    // Counts by status (single query).
    const counts = await jobService.getStatusCounts(userId);

    // Average match score (nullable — null if no jobs analyzed yet).
    const { rows: scoreRows } = await query(
      `SELECT ROUND(AVG(match_score))::int AS avg_score
       FROM jobs
       WHERE user_id = $1 AND match_score IS NOT NULL`,
      [userId]
    );
    const averageMatchScore = scoreRows[0]?.avg_score ?? null;

    // Applications this week (jobs moved out of 'saved' in last 7 days).
    const { rows: weekRows } = await query(
      `SELECT COUNT(*)::int AS count
       FROM jobs
       WHERE user_id = $1
         AND status <> 'saved'
         AND updated_at >= NOW() - INTERVAL '7 days'`,
      [userId]
    );
    const applicationsThisWeek = weekRows[0]?.count ?? 0;

    res.json({
      success: true,
      data: {
        totalJobs: counts.total,
        totalApplications: counts.total - counts.saved,
        interviews: counts.interview,
        offers: counts.offer,
        averageMatchScore,
        applicationsThisWeek,
        byStatus: {
          saved: counts.saved,
          applied: counts.applied,
          recruiter_contacted: counts.recruiter_contacted,
          interview: counts.interview,
          technical_task: counts.technical_task,
          offer: counts.offer,
          rejected: counts.rejected,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}