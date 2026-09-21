/**
 * main.js — Landing page interactions.
 *
 * Features:
 *  - Sticky header shadow on scroll.
 *  - Mobile menu toggle with proper a11y (aria-expanded).
 *  - Close menu on link click, outside click, or Escape.
 *  - Smooth scroll to anchors, offset by header height.
 */
import { auth } from './api.js';
const header = document.getElementById('header');
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');

// ─── 1. Header shadow on scroll ─────────────────────────────
function onScroll() {
  if (!header) return;
  header.classList.toggle('is-scrolled', window.scrollY > 8);
}

window.addEventListener('scroll', onScroll, { passive: true });
onScroll(); // run once on load in case page opens scrolled

// ─── 2. Mobile menu ─────────────────────────────────────────
function openMenu() {
  if (!mobileMenu || !menuToggle) return;
  mobileMenu.hidden = false;
  mobileMenu.classList.add('is-open');
  menuToggle.setAttribute('aria-expanded', 'true');
  menuToggle.setAttribute('aria-label', 'Close menu');
}

function closeMenu() {
  if (!mobileMenu || !menuToggle) return;
  mobileMenu.classList.remove('is-open');
  mobileMenu.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open menu');
}

function toggleMenu() {
  if (!mobileMenu) return;
  const isOpen = mobileMenu.classList.contains('is-open');
  isOpen ? closeMenu() : openMenu();
}

if (menuToggle) {
  menuToggle.addEventListener('click', toggleMenu);
}

// Close menu when clicking any link inside it.
if (mobileMenu) {
  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
}

// Close menu on Escape.
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mobileMenu?.classList.contains('is-open')) {
    closeMenu();
  }
});

// Close menu when clicking outside header.
document.addEventListener('click', (event) => {
  if (!mobileMenu?.classList.contains('is-open')) return;
  if (header && !header.contains(event.target)) {
    closeMenu();
  }
});

// ─── 3. Smooth scroll for anchor links ──────────────────────
const HEADER_OFFSET = 80; // px — accounts for sticky header height

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const href = link.getAttribute('href');
    if (!href || href === '#') return;

    const target = document.querySelector(href);
    if (!target) return;

    event.preventDefault();

    const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });

    // Update URL without jumping.
    history.pushState(null, '', href);
  });
});

// ─── 4. Auth-aware header ───────────────────────────────────
// Toggle between [Sign in / Get started] and [Dashboard / Sign out]
// based on whether the user has a token.

function renderAuthState() {
  const isAuthed = auth.isAuthenticated();

  document.querySelectorAll('[data-auth="guest"]').forEach((el) => {
    el.hidden = isAuthed;
  });
  document.querySelectorAll('[data-auth="user"]').forEach((el) => {
    el.hidden = !isAuthed;
  });
}

function setupSignOut() {
  document.querySelectorAll('[data-sign-out]').forEach((btn) => {
    btn.addEventListener('click', () => {
      auth.clearToken();
      window.location.reload();
    });
  });
}

renderAuthState();
setupSignOut();