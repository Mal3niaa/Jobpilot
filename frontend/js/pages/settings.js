/**
 * settings.js — Settings page logic.
 *
 * Sections:
 *   - Profile (update full_name)
 *   - Appearance (theme: light/dark/system)
 *   - Change password
 *   - Delete account
 */

import { api } from '../api.js';

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showStatus(el, type, message) {
  el.innerHTML = `<div class="alert alert--${type}">${escapeHtml(message)}</div>`;
  el.hidden = false;
  // Auto-hide success messages
  if (type === 'success') {
    setTimeout(() => { el.hidden = true; }, 3000);
  }
}

function setLoading(btn, isLoading) {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.classList.toggle('is-loading', isLoading);
  const spinner = btn.querySelector('.spinner');
  const label = btn.querySelector('.btn__label');
  if (spinner) spinner.hidden = !isLoading;
  if (label) label.style.visibility = isLoading ? 'hidden' : '';
}

/* --------------------------------------------------------------------------
   Profile
   -------------------------------------------------------------------------- */
async function initProfile() {
  const form = document.getElementById('profile-form');
  const fullNameEl = document.getElementById('profile-fullName');
  const emailEl = document.getElementById('profile-email');
  const statusEl = document.getElementById('profile-status');
  const saveBtn = document.getElementById('profile-save-btn');
  if (!form) return;

  // Load current user
  try {
    const data = await api.get('/auth/me');
    const user = data.user;
    if (fullNameEl) fullNameEl.value = user.full_name || '';
    if (emailEl) emailEl.value = user.email || '';
  } catch (err) {
    console.error('[settings] failed to load user', err);
    showStatus(statusEl, 'danger', 'Failed to load profile.');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    statusEl.hidden = true;

    const fullName = fullNameEl.value.trim();

    setLoading(saveBtn, true);
    try {
      await api.put('/auth/me', { fullName });
      showStatus(statusEl, 'success', 'Profile updated.');
    } catch (err) {
      console.error('[settings] update failed', err);
      showStatus(statusEl, 'danger', err.message || 'Failed to update profile.');
    } finally {
      setLoading(saveBtn, false);
    }
  });
}

/* --------------------------------------------------------------------------
   Appearance (theme)
   -------------------------------------------------------------------------- */
function initTheme() {
  const select = document.getElementById('settings-theme');
  if (!select) return;

  const STORAGE_KEY = 'jobpilot-theme';

  // Determine current value: saved theme, or 'system' if none.
  const saved = localStorage.getItem(STORAGE_KEY);
  select.value = saved === 'light' || saved === 'dark' ? saved : 'system';

  select.addEventListener('change', () => {
    const value = select.value;
    if (value === 'system') {
      localStorage.removeItem(STORAGE_KEY);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      localStorage.setItem(STORAGE_KEY, value);
      document.documentElement.setAttribute('data-theme', value);
    }
  });
}

/* --------------------------------------------------------------------------
   Change password
   -------------------------------------------------------------------------- */
function initPassword() {
  const form = document.getElementById('password-form');
  const currentEl = document.getElementById('currentPassword');
  const newEl = document.getElementById('newPassword');
  const statusEl = document.getElementById('password-status');
  const saveBtn = document.getElementById('password-save-btn');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    statusEl.hidden = true;

    const currentPassword = currentEl.value;
    const newPassword = newEl.value;

    if (!currentPassword || !newPassword) {
      showStatus(statusEl, 'danger', 'All fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      showStatus(statusEl, 'danger', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword === currentPassword) {
      showStatus(statusEl, 'danger', 'New password must be different from the current one.');
      return;
    }

    setLoading(saveBtn, true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      showStatus(statusEl, 'success', 'Password changed.');
      form.reset();
    } catch (err) {
      console.error('[settings] password change failed', err);
      showStatus(statusEl, 'danger', err.message || 'Failed to change password.');
    } finally {
      setLoading(saveBtn, false);
    }
  });
}

/* --------------------------------------------------------------------------
   Delete account
   -------------------------------------------------------------------------- */
function initDeleteAccount() {
  const btn = document.getElementById('delete-account-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account?\n\n' +
      'All your jobs, resumes, and AI analyses will be permanently deleted. ' +
      'This cannot be undone.'
    );
    if (!confirmed) return;

    const second = window.prompt('Type DELETE in uppercase to confirm:');
    if (second !== 'DELETE') {
      alert('Account deletion cancelled.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Deleting…';

    try {
      await api.delete('/auth/me');
      localStorage.removeItem('jobpilot_token');
      alert('Your account has been deleted.');
      window.location.href = '../index.html';
    } catch (err) {
      console.error('[settings] delete failed', err);
      alert('Failed to delete account. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Delete my account';
    }
  });
}

/* --------------------------------------------------------------------------
   Init
   -------------------------------------------------------------------------- */
initProfile();
initTheme();
initPassword();
initDeleteAccount();