import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Signs a JWT for a user.
 * Payload contains only `sub` (user id) and `email` — no sensitive data.
 */
export function signToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/**
 * Verifies a JWT and returns the decoded payload.
 * Throws if token is invalid or expired.
 */
export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}