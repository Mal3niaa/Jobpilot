/**
 * theme.js — Light/dark theme toggle with persistence.
 *
 * Behavior:
 *  - Restores saved theme from localStorage on load.
 *  - Falls back to system preference (prefers-color-scheme).
 *  - Toggles on button click, updates <html data-theme>.
 *  - Syncs across browser tabs via the `storage` event.
 */

const STORAGE_KEY = 'jobpilot-theme';
const THEMES = { LIGHT: 'light', DARK: 'dark' };

/**
 * Returns the initial theme:
 *   1. Saved choice from localStorage, if any.
 *   2. System preference otherwise.
 */
function getInitialTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === THEMES.LIGHT || saved === THEMES.DARK) return saved;

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? THEMES.DARK : THEMES.LIGHT;
}

/**
 * Applies the theme to <html> and updates the toggle button state.
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    const isDark = theme === THEMES.DARK;
    toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.setAttribute('aria-pressed', String(isDark));
  }
}

/**
 * Saves the theme and re-applies it.
 */
function setTheme(theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

/**
 * Toggles between light and dark.
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
  setTheme(next);
}

// ─── Init ────────────────────────────────────────────────────
// Apply theme synchronously to avoid a flash of the wrong theme (FOUC).
applyTheme(getInitialTheme());

// Wire up the toggle button.
const toggleButton = document.getElementById('theme-toggle');
if (toggleButton) {
  toggleButton.addEventListener('click', toggleTheme);
}

// Sync theme across browser tabs.
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY && event.newValue) {
    applyTheme(event.newValue);
  }
});

// React to system theme changes if the user hasn't chosen explicitly.
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    applyTheme(event.matches ? THEMES.DARK : THEMES.LIGHT);
  }
});