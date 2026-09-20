import { ApiError } from '../utils/ApiError.js';

/**
 * Tiny validation primitives.
 * We deliberately avoid heavy libraries (Zod, Joi) at this stage —
 * the goal is to understand the fundamentals.
 */

export function isEmail(value) {
  if (typeof value !== 'string') return false;
  // Simple, pragmatic email check. Good enough for MVP.
  // Real verification happens by sending an email — not by regex.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isStrongEnoughPassword(value) {
  if (typeof value !== 'string') return false;
  if (value.length < 8) return false;
  if (value.length > 128) return false; // bcrypt silently truncates at 72 bytes anyway
  return true;
}

/**
 * Express middleware factory.
 * Usage:
 *   router.post('/register', validate(registerSchema), ctrl.register)
 *
 * The schema is a plain object: { fieldName: validatorFn }.
 * Validator returns true or an error message (string).
 */
export function validate(schema) {
  return (req, res, next) => {
    const errors = {};

    for (const [field, validator] of Object.entries(schema)) {
      const value = req.body?.[field];
      const result = validator(value);
      if (result !== true) {
        errors[field] = typeof result === 'string' ? result : 'Invalid value';
      }
    }

    if (Object.keys(errors).length > 0) {
      return next(ApiError.badRequest(JSON.stringify({ errors })));
    }

    next();
  };
}

/* --------------------------------------------------------------------------
   Common field validators — reusable across routes.
   Each returns true on success, or a string error message.
   -------------------------------------------------------------------------- */

export function requiredString(maxLen = 255) {
  return (value) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return 'This field is required';
    }
    if (value.length > maxLen) return `Must be at most ${maxLen} characters`;
    return true;
  };
}

export function optionalString(maxLen = 255) {
  return (value) => {
    if (value === undefined || value === null) return true;
    if (typeof value !== 'string') return 'Must be a string';
    if (value.length > maxLen) return `Must be at most ${maxLen} characters`;
    return true;
  };
}