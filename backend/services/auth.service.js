import { ApiError } from '../utils/ApiError.js';
import { hashPassword, verifyPassword } from '../utils/hash.js';
import { signToken } from '../utils/jwt.js';
import * as usersDb from '../db/users.js';

/**
 * Normalizes email: trims whitespace and lowercases.
 * Prevents duplicate accounts like "User@x.com" vs "user@x.com".
 */
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

/**
 * Register a new user.
 * Returns { user, token }.
 *
 * Throws 409 if email already exists.
 */
export async function register({ email, password, fullName }) {
  const normalized = normalizeEmail(email);

  const existing = await usersDb.findByEmail(normalized);
  if (existing) {
    throw ApiError.conflict('Email is already registered');
  }

  const passwordHash = await hashPassword(password);
  const user = await usersDb.createUser({
    email: normalized,
    passwordHash,
    fullName,
  });

  const token = signToken({ sub: user.id, email: user.email });
  return { user, token };
}

/**
 * Log in an existing user.
 * Returns { user, token }.
 *
 * Throws 401 for both "user not found" and "wrong password"
 * — never reveal which one failed (prevents user enumeration).
 */
export async function login({ email, password }) {
  const normalized = normalizeEmail(email);

  const user = await usersDb.findByEmail(normalized);
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Strip password_hash before returning.
  const { password_hash, ...safeUser } = user;
  const token = signToken({ sub: safeUser.id, email: safeUser.email });
  return { user: safeUser, token };
}

/**
 * Get the current user by id (from JWT `sub`).
 * Used by GET /api/auth/me.
 */
export async function getCurrentUser(userId) {
  const user = await usersDb.findById(userId);
  if (!user) {
    throw ApiError.unauthorized('User no longer exists');
  }
  return user;
}