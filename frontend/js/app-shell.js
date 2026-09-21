/**
 * app-shell.js — Shared logic for all authenticated app pages.
 *
 * Responsibilities:
 *  - Auth guard: redirect to login if no token.
 *  - Sidebar toggle (mobile).
 *  - Active link highlighting based on current path.
 *  - Render user email in sidebar.
 *  - Sign out.
 *  - Theme toggle (delegates to theme.js pattern).
 *  - Page title from <body data-page-title>.
 *
 * Must be loaded AFTER api.js (uses auth helpers).
 */

import { auth, api } from './api.js';

/* --------------------------------------------------------------------------
   1. Auth guard
   -------------------------------------------------------------------------- */
if (!auth.isAuthenticated()) {
  // Preserve intent — after login, come back here.
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `../login.html?next=${next}`;
  // Stop execution — the redirect will happen.
  throw new Error('Not authenticated');
}

/* --------------------------------------------------------------------------
   2. Cache current user info
   -------------------------------------------------------------------------- */
let currentUser = null;

async function loadCurrentUser() {
  try {
    const data = await api.get('/auth/me');
    currentUser = data.user;
    renderUser();
  } catch (err) {
    // 401 is handled by api.js (auto-redirect). Other errors — log.
    console.error('[app-shell] failed to load current user', err);
  }
}

function renderUser() {
  const emailEl = document.querySelector('[data-user-email]');
  const avatarEl = document.querySelector('[data-user-avatar]');

  if (emailEl && currentUser) {
    emailEl.textContent = currentUser.email;
  }
  if (avatarEl && currentUser) {
    avatarEl.textContent = (currentUser.email || '?')[0].toUpperCase();
  }
}

/* --------------------------------------------------------------------------
   3. Sidebar toggle (mobile)
   -------------------------------------------------------------------------- */
const sidebar = document.getElementById('sidebar');
const backdrop = document.getElementById('sidebar-backdrop');
const menuToggle = document.getElementById('menu-toggle');

function openSidebar() {
  sidebar?.classList.add('is-open');
  backdrop?.classList.add('is-open');
  menuToggle?.setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  sidebar?.classList.remove('is-open');
  backdrop?.classList.remove('is-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
}

function toggleSidebar() {
  if (!sidebar) return;
  sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar();
}

menuToggle?.addEventListener('click', toggleSidebar);
backdrop?.addEventListener('click', closeSidebar);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && sidebar?.classList.contains('is-open')) {
    closeSidebar();
  }
});

// Close sidebar on mobile when clicking any nav link.
sidebar?.querySelectorAll('.sidebar__link').forEach((link) => {
  link.addEventListener('click', () => {
    if (window.matchMedia('(max-width: 900px)').matches) closeSidebar();
  });
});

/* --------------------------------------------------------------------------
   4. Active sidebar link
   -------------------------------------------------------------------------- */
function markActiveLink() {
  const path = window.location.pathname;
  document.querySelectorAll('.sidebar__link').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (href && path.endsWith(href)) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

/* --------------------------------------------------------------------------
   5. Sign out
   -------------------------------------------------------------------------- */
document.querySelectorAll('[data-sign-out]').forEach((btn) => {
  btn.addEventListener('click', () => {
    auth.clearToken();
    window.location.href = '../index.html';
  });
});

/* --------------------------------------------------------------------------
   6. Theme toggle (app pages)
   -------------------------------------------------------------------------- */
const THEME_KEY = 'jobpilot-theme';

function getInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    const isDark = theme === 'dark';
    toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.setAttribute('aria-pressed', String(isDark));
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

applyTheme(getInitialTheme());
document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

/* --------------------------------------------------------------------------
   7. Page title
   -------------------------------------------------------------------------- */
const pageTitle = document.body.dataset.pageTitle;
if (pageTitle) {
  // IMPORTANT: narrow the selector — `[data-page-title]` also matches <body>
  // and `body.textContent = ...` would wipe the entire page.
  const titleEl = document.querySelector('h1[data-page-title]');
  if (titleEl) titleEl.textContent = pageTitle;
  document.title = `${pageTitle} — JobPilot`;
}

/* --------------------------------------------------------------------------
   8. Init
   -------------------------------------------------------------------------- */
markActiveLink();
loadCurrentUser();