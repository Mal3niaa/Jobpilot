import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Rate limiter presets.
 *
 * We use different strategies for different endpoints:
 *   - authLimiter    — strict (brute-force protection on login/register)
 *   - aiLimiter      — moderate (AI endpoints are expensive / slow)
 *   - generalLimiter — lenient (all other API routes)
 *
 * In development (NODE_ENV=development) limits are relaxed or disabled
 * to avoid breaking local testing.
 */

const isDev = env.NODE_ENV !== 'production';

/**
 * Standard JSON response when rate limit is exceeded.
 */
function limitReachedHandler(req, res) {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.',
  });
}

/**
 * Auth endpoints: 10 requests per 15 minutes per IP.
 * Brute-force protection.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,       // 15 min
  max: isDev ? 100 : 10,          // relaxed in dev
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: limitReachedHandler,
});

/**
 * AI endpoints: 20 requests per minute per IP.
 * AI is slow and (potentially) paid.
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,            // 1 min
  max: isDev ? 200 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: limitReachedHandler,
});

/**
 * General API: 300 requests per minute per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 2000 : 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: limitReachedHandler,
});