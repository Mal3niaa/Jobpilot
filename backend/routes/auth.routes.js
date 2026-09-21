import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate, isEmail, isStrongEnoughPassword, requiredString, optionalString } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  validate({
    email: (v) => isEmail(v) || 'Invalid email format',
    password: (v) => isStrongEnoughPassword(v) || 'Password must be 8–128 characters',
    fullName: optionalString(255),
  }),
  authController.register
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  validate({
    email: (v) => isEmail(v) || 'Invalid email format',
    password: requiredString(128),
  }),
  authController.login
);

// GET /api/auth/me — protected
router.get('/me', requireAuth, authController.me);

export default router;