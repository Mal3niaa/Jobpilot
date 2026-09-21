/**
 * auth.js — login & register form logic.
 *
 * On page load, detects which form is present and wires it up.
 * Uses api.js for HTTP + token storage.
 */

import { api, auth, ApiError } from './api.js';

/* --------------------------------------------------------------------------
   UI helpers
   -------------------------------------------------------------------------- */

/** Show a field-level error under an input. */
function setFieldError(form, fieldName, message) {
  const errorEl = form.querySelector(`[data-error-for="${fieldName}"]`);
  if (!errorEl) return;
  if (message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  } else {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
}

/** Clear all field errors in the form. */
function clearFieldErrors(form) {
  form.querySelectorAll('[data-error-for]').forEach((el) => {
    el.textContent = '';
    el.hidden = true;
  });
}

/** Show the banner at the top of the form. */
function showBanner(form, message) {
  const banner = form.querySelector('#form-error-banner');
  if (!banner) return;
  banner.textContent = message;
  banner.hidden = false;
}

/** Hide the banner. */
function hideBanner(form) {
  const banner = form.querySelector('#form-error-banner');
  if (!banner) return;
  banner.textContent = '';
  banner.hidden = true;
}

/** Toggle loading state on the submit button. */
function setLoading(form, isLoading) {
  const btn = form.querySelector('#submit-btn');
  if (!btn) return;
  btn.classList.toggle('is-loading', isLoading);
  btn.disabled = isLoading;

  const spinner = btn.querySelector('.spinner');
  const label = btn.querySelector('.btn__label');
  if (spinner) spinner.hidden = !isLoading;
  if (label) label.style.visibility = isLoading ? 'hidden' : '';
}

/* --------------------------------------------------------------------------
   Client-side validation
   -------------------------------------------------------------------------- */

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Validate register form.
 * Returns true if valid, otherwise populates field errors and returns false.
 */
function validateRegister(form, { email, password, passwordConfirm }) {
  let ok = true;

  if (!isValidEmail(email)) {
    setFieldError(form, 'email', 'Please enter a valid email.');
    ok = false;
  }
  if (!password || password.length < 8) {
    setFieldError(form, 'password', 'Password must be at least 8 characters.');
    ok = false;
  }
  if (password !== passwordConfirm) {
    setFieldError(form, 'passwordConfirm', 'Passwords do not match.');
    ok = false;
  }
  return ok;
}

function validateLogin(form, { email, password }) {
  let ok = true;
  if (!isValidEmail(email)) {
    setFieldError(form, 'email', 'Please enter a valid email.');
    ok = false;
  }
  if (!password) {
    setFieldError(form, 'password', 'Password is required.');
    ok = false;
  }
  return ok;
}

/* --------------------------------------------------------------------------
   Error display from backend
   -------------------------------------------------------------------------- */

/**
 * Convert ApiError into visible UI.
 * If backend sent field errors — show them under inputs.
 * Otherwise — show the general banner.
 */
function displayApiError(form, err) {
  if (err instanceof ApiError) {
    if (err.errors) {
      Object.entries(err.errors).forEach(([field, msg]) => {
        setFieldError(form, field, msg);
      });
      return;
    }
    showBanner(form, err.message);
    return;
  }
  showBanner(form, 'Something went wrong. Please try again.');
  console.error('[auth] unexpected error', err);
}

/* --------------------------------------------------------------------------
   Redirect helper
   -------------------------------------------------------------------------- */

/**
 * After successful auth, decide where to send the user.
 *  - If `?next=` is present in the URL (set by the auth guard), go there.
 *  - Otherwise, go to the dashboard.
 *
 * `next` is expected to be a path like `/app/dashboard` (from app-shell.js).
 * We prefix with `..` because we're in `frontend/login.html`.
 */
function redirectAfterAuth() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  if (next) {
    window.location.href = `..${next}`;
  } else {
    window.location.href = 'app/dashboard.html';
  }
}

/* --------------------------------------------------------------------------
   Register form
   -------------------------------------------------------------------------- */

function setupRegisterForm(form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    hideBanner(form);

    const formData = new FormData(form);
    const payload = {
      fullName: (formData.get('fullName') || '').toString().trim() || undefined,
      email: (formData.get('email') || '').toString().trim(),
      password: (formData.get('password') || '').toString(),
      passwordConfirm: (formData.get('passwordConfirm') || '').toString(),
    };

    if (!validateRegister(form, payload)) return;

    setLoading(form, true);
    try {
      const { user, token } = await api.post('/auth/register', {
        email: payload.email,
        password: payload.password,
        fullName: payload.fullName,
      });
      auth.setToken(token);
      console.log('[auth] registered', user);
      redirectAfterAuth();
    } catch (err) {
      displayApiError(form, err);
    } finally {
      setLoading(form, false);
    }
  });
}

/* --------------------------------------------------------------------------
   Login form
   -------------------------------------------------------------------------- */

function setupLoginForm(form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    hideBanner(form);

    const formData = new FormData(form);
    const payload = {
      email: (formData.get('email') || '').toString().trim(),
      password: (formData.get('password') || '').toString(),
    };

    if (!validateLogin(form, payload)) return;

    setLoading(form, true);
    try {
      const { user, token } = await api.post('/auth/login', payload);
      auth.setToken(token);
      console.log('[auth] logged in', user);
      redirectAfterAuth();
    } catch (err) {
      displayApiError(form, err);
    } finally {
      setLoading(form, false);
    }
  });
}

/* --------------------------------------------------------------------------
   Init
   -------------------------------------------------------------------------- */

const registerForm = document.getElementById('register-form');
if (registerForm) setupRegisterForm(registerForm);

const loginForm = document.getElementById('login-form');
if (loginForm) setupLoginForm(loginForm);