import { query } from './pool.js';

/**
 * All queries below are scoped by user_id.
 * A user must NEVER see or modify another user's jobs.
 * This is enforced at the SQL level (not only in the service layer).
 */

/**
 * Create a new job for a user.
 * Returns the created row.
 */
export async function createJob(userId, data) {
  const sql = `
    INSERT INTO jobs (
      user_id, title, company, location,
      salary_min, salary_max, employment_type,
      url, description, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;
  const params = [
    userId,
    data.title,
    data.company ?? null,
    data.location ?? null,
    data.salaryMin ?? null,
    data.salaryMax ?? null,
    data.employmentType ?? null,
    data.url ?? null,
    data.description ?? null,
    data.notes ?? null,
  ];
  const { rows } = await query(sql, params);
  return rows[0];
}

/**
 * List a user's jobs with optional filters and sorting.
 * Supported filters: status, search (matches title or company).
 * Returns an array of rows.
 */
export async function findJobsByUser(userId, { status, search, sort, order } = {}) {
  const where = ['user_id = $1'];
  const params = [userId];
  let idx = 2;

  if (status) {
    where.push(`status = $${idx}`);
    params.push(status);
    idx += 1;
  }

  if (search) {
    // Case-insensitive match on title OR company.
    where.push(`(title ILIKE $${idx} OR company ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx += 1;
  }

  // Whitelist sortable columns to prevent SQL injection via `sort`.
  const sortable = {
    created_at: 'created_at',
    updated_at: 'updated_at',
    title: 'title',
    company: 'company',
    match_score: 'match_score',
    status: 'status',
  };
  const sortCol = sortable[sort] || 'created_at';
  const direction = order === 'asc' ? 'ASC' : 'DESC';

  const sql = `
    SELECT *
    FROM jobs
    WHERE ${where.join(' AND ')}
    ORDER BY ${sortCol} ${direction}
  `;

  const { rows } = await query(sql, params);
  return rows;
}

/**
 * Find one job by id, scoped to its owner.
 * Returns null if not found OR if it belongs to another user.
 * This is critical: never leak other users' data.
 */
export async function findJobById(userId, jobId) {
  const sql = `
    SELECT *
    FROM jobs
    WHERE id = $1 AND user_id = $2
    LIMIT 1
  `;
  const { rows } = await query(sql, [jobId, userId]);
  return rows[0] ?? null;
}

/**
 * Update a job (partial update).
 * Only whitelisted fields can be updated — prevents mass-assignment attacks.
 * Returns the updated row, or null if not found / not owned.
 */
export async function updateJob(userId, jobId, patch) {
  // Field whitelist: SQL column name <- camelCase key from API.
  const fieldMap = {
    title: 'title',
    company: 'company',
    location: 'location',
    salaryMin: 'salary_min',
    salaryMax: 'salary_max',
    employmentType: 'employment_type',
    url: 'url',
    description: 'description',
    notes: 'notes',
    status: 'status',
    matchScore: 'match_score',
  };

  const sets = [];
  const params = [];
  let idx = 1;

  for (const [key, column] of Object.entries(fieldMap)) {
    if (patch[key] === undefined) continue;
    sets.push(`${column} = $${idx}`);
    params.push(patch[key]);
    idx += 1;
  }

  if (sets.length === 0) {
    // Nothing to update — return current row (or null if not found).
    return findJobById(userId, jobId);
  }

  // userId and jobId go last, after all SET params.
  params.push(jobId, userId);

  const sql = `
    UPDATE jobs
    SET ${sets.join(', ')}
    WHERE id = $${idx} AND user_id = $${idx + 1}
    RETURNING *
  `;

  const { rows } = await query(sql, params);
  return rows[0] ?? null;
}

/**
 * Delete a job, scoped to its owner.
 * Returns true if a row was deleted, false otherwise.
 */
export async function deleteJob(userId, jobId) {
  const sql = `
    DELETE FROM jobs
    WHERE id = $1 AND user_id = $2
  `;
  const result = await query(sql, [jobId, userId]);
  return result.rowCount > 0;
}

/**
 * Aggregate counters for the dashboard.
 * Returns: { total, saved, applied, interview, offer, rejected }.
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