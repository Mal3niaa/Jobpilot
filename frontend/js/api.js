/**
 * api.js — fetch wrapper for JobPilot backend.
 *
 * Features:
 *  - Base URL from a single place.
 *  - Automatically adds Authorization header if a token exists.
 *  - Parses JSON responses.
 *  - Throws ApiError { status, message, errors? } on failure.
 *  - On 401 (except for /auth/login and /auth/register), clears token
 *    and redirects to login.html.
 *
 * Exports: api.get, api.post, api.put, api.delete, ApiError, auth helpers.
 */

const API_BASE = 'http://localhost:3000/api';
const TOKEN_KEY = 'jobpilot_token';

/* --------------------------------------------------------------------------
   Token storage (localStorage)
   -------------------------------------------------------------------------- */
export const auth = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },
  isAuthenticated() {
    return Boolean(this.getToken());
  },
};

/* --------------------------------------------------------------------------
   Custom error class — carries HTTP status and optional field errors.
   -------------------------------------------------------------------------- */
export class ApiError extends Error {
  constructor(status, message, errors = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors; // { email: "...", password: "..." } | null
  }
}

/* --------------------------------------------------------------------------
   Core request function
   -------------------------------------------------------------------------- */
async function request(method, path, body = null, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = auth.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body !== null) {
    config.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkErr) {
    // Network error — backend not running, DNS failure, etc.
    throw new ApiError(0, 'Cannot reach the server. Is the backend running?');
  }

  // Parse JSON (even on errors — backend returns JSON for errors too).
  let payload = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  // Success path.
  if (response.ok) {
    // Backend wraps everything as { success: true, data: {...} } — unwrap `data`.
    return payload?.data ?? payload;
  }

  // Error path.
  const message = payload?.message || `Request failed with status ${response.status}`;

  // Try to extract field-level errors if backend sent them as JSON string.
  let fieldErrors = null;
  if (typeof message === 'string' && message.startsWith('{')) {
    try {
      const parsed = JSON.parse(message);
      fieldErrors = parsed.errors || null;
    } catch { /* ignore */ }
  }

  // 401 → token expired or invalid. Redirect to login, unless this IS the login request.
  const isAuthEndpoint = path.startsWith('/auth/login') || path.startsWith('/auth/register');
  if (response.status === 401 && !isAuthEndpoint) {
    auth.clearToken();
    // Avoid redirect loop if already on login page.
    if (!window.location.pathname.endsWith('login.html')) {
      window.location.href = 'login.html';
    }
  }

  throw new ApiError(response.status, message, fieldErrors);
}

/* --------------------------------------------------------------------------
   Public API
   -------------------------------------------------------------------------- */
export const api = {
  get:    (path, options)        => request('GET',    path, null, options),
  post:   (path, body, options)  => request('POST',   path, body, options),
  put:    (path, body, options)  => request('PUT',    path, body, options),
  delete: (path, options)        => request('DELETE', path, null, options),
};