import { query } from './pool.js';

/**
 * Deactivate all resumes for a user.
 * Used before inserting a new one — only one active resume per user.
 */
export async function deactivateAll(userId) {
  const sql = `
    UPDATE resumes
    SET is_active = FALSE
    WHERE user_id = $1 AND is_active = TRUE
  `;
  await query(sql, [userId]);
}

/**
 * Create a new resume for a user and mark it active.
 * Assumes the caller has already deactivated previous ones (see service).
 */
export async function createResume(userId, { filePath, rawText, parsedJson = null }) {
  const sql = `
    INSERT INTO resumes (user_id, file_path, raw_text, parsed_json, is_active)
    VALUES ($1, $2, $3, $4, TRUE)
    RETURNING id, user_id, file_path, raw_text, parsed_json, is_active, created_at
  `;
  const { rows } = await query(sql, [userId, filePath, rawText, parsedJson]);
  return rows[0];
}

/**
 * Get the user's active resume (with full text).
 * Returns null if none.
 */
export async function findActiveByUser(userId) {
  const sql = `
    SELECT id, user_id, file_path, raw_text, parsed_json, is_active, created_at
    FROM resumes
    WHERE user_id = $1 AND is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const { rows } = await query(sql, [userId]);
  return rows[0] ?? null;
}

/**
 * Get only the raw text of the active resume — for AI service.
 * Returns null if none.
 */
export async function findActiveRawText(userId) {
  const sql = `
    SELECT raw_text
    FROM resumes
    WHERE user_id = $1 AND is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const { rows } = await query(sql, [userId]);
  return rows[0]?.raw_text ?? null;
}

/**
 * Delete the user's active resume.
 * Returns true if a row was deleted.
 */
export async function deleteActiveByUser(userId) {
  const sql = `
    DELETE FROM resumes
    WHERE user_id = $1 AND is_active = TRUE
  `;
  const result = await query(sql, [userId]);
  return result.rowCount > 0;
}