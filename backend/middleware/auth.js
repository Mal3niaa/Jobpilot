import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/jwt.js';

/**
 * Express middleware — requires a valid JWT.
 * On success, attaches { id, email } to req.user.
 *
 * Client must send: Authorization: Bearer <token>
 */
export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Missing or invalid Authorization header');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw ApiError.unauthorized('Missing token');
    }

    const payload = verifyToken(token); // throws if invalid/expired
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    // jsonwebtoken throws its own errors — convert to ApiError
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token expired'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(ApiError.unauthorized('Invalid token'));
    }
    next(err);
  }
}