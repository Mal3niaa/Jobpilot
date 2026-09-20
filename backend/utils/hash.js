import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hashes a plain-text password.
 * Uses bcryptjs (pure JS) — no native compilation required.
 */
export async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compares a plain-text password with a stored hash.
 * Returns true if they match.
 *
 * Note: bcrypt.compare is timing-safe — it does not short-circuit.
 */
export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}