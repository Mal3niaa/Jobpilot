import { query } from './pool.js';

/**
 * Create a new user.
 * Returns the created user (without password_hash).
 */
export async function createUser({ email, passwordHash, fullName }) {
  const sql = `
    INSERT INTO users (email, password_hash, full_name)
    VALUES ($1, $2, $3)
    RETURNING id, email, full_name, created_at
  `;
  const { rows } = await query(sql, [email, passwordHash, fullName ?? null]);
  return rows[0];
}

/**
 * Find a user by email.
 * Used during login — needs password_hash for verification.
 * Returns null if not found.
 */
export async function findByEmail(email) {
  const sql = `
    SELECT id, email, password_hash, full_name, created_at
    FROM users
    WHERE email = $1
    LIMIT 1
  `;
  const { rows } = await query(sql, [email]);
  return rows[0] ?? null;
}

/**
 * Find a user by id.
 * Used by `GET /api/auth/me` — never exposes password_hash.
 * Returns null if not found.
 */
export async function findById(id) {
  const sql = `
    SELECT id, email, full_name, created_at
    FROM users
    WHERE id = $1
    LIMIT 1
  `;
  const { rows } = await query(sql, [id]);
  return rows[0] ?? null;
}