/**
 * dashboard.js — Dashboard page logic.
 *
 * Loads:
 *  - GET /api/dashboard/stats   → counters
 *  - GET /api/jobs?sort=created_at&order=desc (first 5) → recent jobs
 */

import { api } from '../api.js';

/* --------------------------------------------------------------------------
   Stat cards
   -------------------------------------------------------------------------- */
function setStat(key, value) {
  const el = document.querySelector(`[data-stat="${key}"]`);
  if (!el) return;
  el.textContent = value === null || value === undefined ? '—' : value;
}

function renderStats(stats) {
  setStat('totalJobs', stats.totalJobs);
  setStat('totalApplications', stats.totalApplications);
  setStat('interviews', stats.interviews);
  setStat('offers', stats.offers);
  setStat('averageMatchScore', stats.averageMatchScore !== null ? `${stats.averageMatchScore}%` : '—');
  setStat('applicationsThisWeek', stats.applicationsThisWeek);
}

/* --------------------------------------------------------------------------
   Status breakdown
   -------------------------------------------------------------------------- */
const STATUS_LABELS = {
  saved: 'Saved',
  applied: 'Applied',
  recruiter_contacted: 'Recruiter',
  interview: 'Interview',
  technical_task: 'Tech task',
  offer: 'Offer',
  rejected: 'Rejected',
};

function renderStatusBreakdown(byStatus) {
  const container = document.getElementById('status-breakdown');
  if (!container) return;

  const max = Math.max(1, ...Object.values(byStatus)); // avoid /0
  const entries = Object.entries(byStatus);

  container.innerHTML = entries
    .map(([key, count]) => {
      const label = STATUS_LABELS[key] || key;
      const pct = Math.round((count / max) * 100);
      return `
        <div class="status-bar__item">
          <span class="status-bar__label">${label}</span>
          <span class="status-bar__track">
            <span class="status-bar__fill" style="width: ${pct}%"></span>
          </span>
          <span class="status-bar__value">${count}</span>
        </div>
      `;
    })
    .join('');
}

/* --------------------------------------------------------------------------
   Recent jobs
   -------------------------------------------------------------------------- */
function renderRecentJobs(jobs) {
  const container = document.getElementById('recent-jobs');
  if (!container) return;

  if (!jobs.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-state__title">No jobs yet</p>
        <p class="empty-state__description text-muted">Add your first job to see it here.</p>
        <a href="job-new.html" class="btn btn--primary">Add job</a>
      </div>
    `;
    return;
  }

  container.innerHTML = jobs
    .map((job) => `
      <a href="job-details.html?id=${job.id}" class="table__link" style="display:block;padding:var(--space-3) 0;border-bottom:1px solid var(--color-border);">
        <div style="display:flex;align-items:center;gap:var(--space-3);">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(job.title)}</div>
            <div class="text-muted" style="font-size:var(--text-xs);">${escapeHtml(job.company || '—')}</div>
          </div>
          <span class="badge badge--neutral">${STATUS_LABELS[job.status] || job.status}</span>
        </div>
      </a>
    `)
    .join('');
}

/**
 * Minimal HTML escape for user-provided text inserted into innerHTML.
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* --------------------------------------------------------------------------
   Greeting
   -------------------------------------------------------------------------- */
function renderGreeting() {
  const el = document.getElementById('greeting');
  if (!el) return;
  const hour = new Date().getHours();
  let greet = 'Hello';
  if (hour < 12) greet = 'Good morning';
  else if (hour < 18) greet = 'Good afternoon';
  else greet = 'Good evening';
  el.textContent = `${greet}, welcome back.`;
}

/* --------------------------------------------------------------------------
   Init
   -------------------------------------------------------------------------- */
async function init() {
  renderGreeting();

  try {
    const [stats, jobs] = await Promise.all([
      api.get('/dashboard/stats'),
      api.get('/jobs?sort=created_at&order=desc'),
    ]);

    renderStats(stats);
    renderStatusBreakdown(stats.byStatus);
    renderRecentJobs(jobs.jobs.slice(0, 5));
  } catch (err) {
    console.error('[dashboard] failed to load', err);
    const statsRow = document.querySelector('.stats-row');
    if (statsRow) {
      statsRow.insertAdjacentHTML('afterend', `
        <div class="alert alert--danger">Failed to load dashboard data. Please refresh.</div>
      `);
    }
  }
}

init();