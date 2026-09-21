import { query } from './pool.js';

/**
 * Save a new analysis for a job.
 * Multiple analyses per job are allowed (history).
 */
export async function createAnalysis(jobId, resumeId, analysis) {
  const sql = `
    INSERT INTO job_analysis (
      job_id, resume_id, match_score, summary,
      strong_matches, partial_matches, missing_skills,
      requirements, recommendations, model_used
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;
  const params = [
    jobId,
    resumeId,
    analysis.matchScore,
    analysis.summary || '',
    JSON.stringify(analysis.strongMatches || []),
    JSON.stringify(analysis.partialMatches || []),
    JSON.stringify(analysis.missingSkills || []),
    JSON.stringify(analysis.requirements || []),
    JSON.stringify(analysis.recommendations || []),
    analysis.modelUsed || 'unknown',
  ];
  const { rows } = await query(sql, params);
  return rows[0];
}

/**
 * Get the latest analysis for a given job.
 * Returns null if none.
 */
export async function findLatestByJobId(jobId) {
  const sql = `
    SELECT *
    FROM job_analysis
    WHERE job_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const { rows } = await query(sql, [jobId]);
  return rows[0] ?? null;
}

/**
 * Delete all analyses for a given job.
 * Useful when a job is deleted (though FK CASCADE handles it automatically).
 */
export async function deleteByJobId(jobId) {
  const sql = `DELETE FROM job_analysis WHERE job_id = $1`;
  const result = await query(sql, [jobId]);
  return result.rowCount;
}