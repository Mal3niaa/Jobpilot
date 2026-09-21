import * as authService from '../services/auth.service.js';

/**
 * POST /api/auth/register
 * Body: { email, password, fullName? }
 */
export async function register(req, res, next) {
  try {
    const { email, password, fullName } = req.body;
    const { user, token } = await authService.register({ email, password, fullName });
    res.status(201).json({ success: true, data: { user, token } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login({ email, password });
    res.json({ success: true, data: { user, token } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me (protected)
 * Requires: Authorization: Bearer <jwt>
 */
export async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}
/**
 * PUT /api/auth/me (protected)
 * Update the user's profile (currently: full_name).
 */
export async function updateProfile(req, res, next) {
  try {
    const { fullName } = req.body;
    const user = await authService.updateProfile(req.user.id, { fullName });
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/auth/password (protected)
 * Change the user's password.
 */
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, { currentPassword, newPassword });
    res.json({ success: true, data: { changed: true } });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/auth/me (protected)
 * Delete the user's account and all related data.
 */
export async function deleteAccount(req, res, next) {
  try {
    await authService.deleteAccount(req.user.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
}