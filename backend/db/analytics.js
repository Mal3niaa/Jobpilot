import { query } from './pool.js';

/**
 * All analytics queries are scoped by user_id.
 */

/**
 * Counts per status.
 * Returns: { saved, applied, recruiter_contacted, interview, technical_task, offer, rejected, total }
 */
export async function getStatusCounts(userId) {
  const sql = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'saved')::int               AS saved,
      COUNT(*) FILTER (WHERE status = 'applied')::int             AS applied,
      COUNT(*) FILTER (WHERE status = 'recruiter_contacted')::int AS recruiter_contacted,
      COUNT(*) FILTER (WHERE status = 'interview')::int           AS interview,
      COUNT(*) FILTER (WHERE status = 'technical_task')::int      AS technical_task,
      COUNT(*) FILTER (WHERE status = 'offer')::int               AS offer,
      COUNT(*) FILTER (WHERE status = 'rejected')::int            AS rejected
    FROM jobs
    WHERE user_id = $1
  `;
  const { rows } = await query(sql, [userId]);
  return rows[0];
}

/**
 * Weekly counts of jobs added (created_at) over the last N weeks.
 * Returns array of { week, count } — oldest first.
 */
export async function getJobsOverTime(userId, weeks = 12) {
  const sql = `
    WITH weeks AS (
      SELECT generate_series(
        date_trunc('week', NOW()) - ($2::int - 1) * INTERVAL '1 week',
        date_trunc('week', NOW()),
        INTERVAL '1 week'
      ) AS week_start
    )
    SELECT
      w.week_start,
      COUNT(j.id)::int AS count
    FROM weeks w
    LEFT JOIN jobs j
      ON j.user_id = $1
     AND date_trunc('week', j.created_at) = w.week_start
    GROUP BY w.week_start
    ORDER BY w.week_start ASC
  `;
  const { rows } = await query(sql, [userId, weeks]);
  return rows;
}

/**
 * Match score distribution in 4 buckets.
 * Only includes jobs with a non-null match_score.
 */
export async function getMatchScoreDistribution(userId) {
  const sql = `
    SELECT
      COUNT(*) FILTER (WHERE match_score >= 0  AND match_score < 25)::int  AS "b0_25",
      COUNT(*) FILTER (WHERE match_score >= 25 AND match_score < 50)::int  AS "b25_50",
      COUNT(*) FILTER (WHERE match_score >= 50 AND match_score < 75)::int  AS "b50_75",
      COUNT(*) FILTER (WHERE match_score >= 75 AND match_score <= 100)::int AS "b75_100",
      COUNT(*) FILTER (WHERE match_score IS NOT NULL)::int AS total_scored
    FROM jobs
    WHERE user_id = $1
  `;
  const { rows } = await query(sql, [userId]);
  return rows[0];
}

/**
 * Top N companies by number of jobs.
 */
export async function getTopCompanies(userId, limit = 5) {
  const sql = `
    SELECT
      COALESCE(NULLIF(TRIM(company), ''), 'Unknown') AS company,
      COUNT(*)::int AS count
    FROM jobs
    WHERE user_id = $1
    GROUP BY COALESCE(NULLIF(TRIM(company), ''), 'Unknown')
    ORDER BY count DESC, company ASC
    LIMIT $2
  `;
  const { rows } = await query(sql, [userId, limit]);
  return rows;
}

/**
 * Average match score across all jobs with a score.
 */
export async function getAverageMatchScore(userId) {
  const sql = `
    SELECT ROUND(AVG(match_score))::int AS avg
    FROM jobs
    WHERE user_id = $1 AND match_score IS NOT NULL
  `;
  const { rows } = await query(sql, [userId]);
  return rows[0]?.avg ?? null;
}