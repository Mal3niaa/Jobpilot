import * as analyticsDb from '../db/analytics.js';

/**
 * Compute all analytics data for a user's dashboard.
 * Single entry point — controller calls only this.
 */
export async function getAnalytics(userId) {
  // Run all queries in parallel.
  const [statusCounts, overTime, matchDist, topCompanies, avgScore] = await Promise.all([
    analyticsDb.getStatusCounts(userId),
    analyticsDb.getJobsOverTime(userId, 12),
    analyticsDb.getMatchScoreDistribution(userId),
    analyticsDb.getTopCompanies(userId, 5),
    analyticsDb.getAverageMatchScore(userId),
  ]);

  // Response rate: jobs that moved out of 'saved', divided by total.
  const total = statusCounts.total || 0;
  const active = total - (statusCounts.saved || 0);
  const responseRate = total > 0 ? Math.round((active / total) * 100) : 0;

  // Interview rate: reached interview or beyond.
  const reachedInterview =
    (statusCounts.interview || 0) +
    (statusCounts.technical_task || 0) +
    (statusCounts.offer || 0);
  const interviewRate = total > 0 ? Math.round((reachedInterview / total) * 100) : 0;

  // Offer rate.
  const offerRate = total > 0 ? Math.round(((statusCounts.offer || 0) / total) * 100) : 0;

  return {
    stats: {
      totalJobs: total,
      totalApplications: active,
      responseRate,
      interviewRate,
      offerRate,
      averageMatchScore: avgScore,
    },
    byStatus: {
      saved: statusCounts.saved,
      applied: statusCounts.applied,
      recruiter_contacted: statusCounts.recruiter_contacted,
      interview: statusCounts.interview,
      technical_task: statusCounts.technical_task,
      offer: statusCounts.offer,
      rejected: statusCounts.rejected,
    },
    overTime: overTime.map((row) => ({
      weekStart: row.week_start,
      count: row.count,
    })),
    matchDistribution: {
      b0_25: matchDist.b0_25,
      b25_50: matchDist.b25_50,
      b50_75: matchDist.b50_75,
      b75_100: matchDist.b75_100,
      totalScored: matchDist.total_scored,
    },
    topCompanies: topCompanies.map((row) => ({
      company: row.company,
      count: row.count,
    })),
  };
}