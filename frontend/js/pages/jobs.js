/**
 * jobs.js — Jobs list page.
 *
 * Loads jobs from /api/jobs with optional filters, renders them in a table,
 * supports deletion, and reacts to filter changes (search debounce).
 */

import { api } from '../api.js';

/* --------------------------------------------------------------------------
   Labels & helpers
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

const STATUS_BADGE_CLASS = {
  saved: 'badge--neutral',
  applied: 'badge--accent',
  recruiter_contacted: 'badge--accent',
  interview: 'badge--warning',
  technical_task: 'badge--warning',
  offer: 'badge--success',
  rejected: 'badge--danger',
};

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/* --------------------------------------------------------------------------
   Rendering
   -------------------------------------------------------------------------- */
function renderEmptyState(container, { message, description, showAddButton }) {
  container.innerHTML = `
    <div class="empty-state">
      <p class="empty-state__title">${escapeHtml(message)}</p>
      <p class="empty-state__description text-muted">${escapeHtml(description)}</p>
      ${showAddButton ? '<a href="job-new.html" class="btn btn--primary">Add job</a>' : ''}
    </div>
  `;
}

function renderTable(jobs) {
  const rows = jobs.map((job) => {
    const statusClass = STATUS_BADGE_CLASS[job.status] || 'badge--neutral';
    const statusLabel = STATUS_LABELS[job.status] || job.status;
    const match = job.match_score !== null && job.match_score !== undefined
      ? `${job.match_score}%`
      : '—';

    return `
      <tr>
        <td>
          <a href="job-details.html?id=${job.id}" class="table__link">
            ${escapeHtml(job.title)}
          </a>
        </td>
        <td>${escapeHtml(job.company || '—')}</td>
        <td>
          <span class="badge ${statusClass}">${escapeHtml(statusLabel)}</span>
        </td>
        <td>${match}</td>
        <td class="text-muted">${formatDate(job.created_at)}</td>
        <td>
          <div class="table__actions">
            <a href="job-details.html?id=${job.id}" class="btn btn--ghost btn--sm">View</a>
            <button
              type="button"
              class="btn btn--ghost btn--sm"
              data-delete-id="${job.id}"
              data-delete-title="${escapeHtml(job.title)}"
            >Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Company</th>
            <th>Status</th>
            <th>Match</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

/* --------------------------------------------------------------------------
   Data loading
   -------------------------------------------------------------------------- */
let currentFilters = { search: '', status: '' };
let currentJobs = [];

function buildQuery(filters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  params.set('sort', 'created_at');
  params.set('order', 'desc');
  return params.toString();
}

async function loadJobs() {
  const container = document.getElementById('jobs-container');
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state">
      <span class="spinner spinner--lg" aria-hidden="true"></span>
      <p class="text-muted">Loading…</p>
    </div>
  `;

  try {
    const query = buildQuery(currentFilters);
    const data = await api.get(`/jobs?${query}`);
    currentJobs = data.jobs;

    if (currentJobs.length === 0) {
      const hasFilters = currentFilters.search || currentFilters.status;
      renderEmptyState(container, {
        message: hasFilters ? 'No jobs match your filters' : 'No jobs yet',
        description: hasFilters
          ? 'Try changing the search or clearing the status filter.'
          : 'Add your first job to start tracking.',
        showAddButton: !hasFilters,
      });
      return;
    }

    container.innerHTML = renderTable(currentJobs);
    attachDeleteHandlers();
  } catch (err) {
    console.error('[jobs] failed to load', err);
    container.innerHTML = `
      <div class="alert alert--danger">Failed to load jobs. Please refresh.</div>
    `;
  }
}

/* --------------------------------------------------------------------------
   Delete
   -------------------------------------------------------------------------- */
function attachDeleteHandlers() {
  document.querySelectorAll('[data-delete-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-delete-id');
      const title = btn.getAttribute('data-delete-title');
      const confirmed = window.confirm(`Delete "${title}"? This cannot be undone.`);
      if (!confirmed) return;

      btn.disabled = true;
      btn.textContent = 'Deleting…';

      try {
        await api.delete(`/jobs/${id}`);
        // Optimistic: remove from current list and re-render.
        currentJobs = currentJobs.filter((j) => String(j.id) !== String(id));
        const container = document.getElementById('jobs-container');
        if (currentJobs.length === 0) {
          renderEmptyState(container, {
            message: 'No jobs yet',
            description: 'Add your first job to start tracking.',
            showAddButton: true,
          });
        } else {
          container.innerHTML = renderTable(currentJobs);
          attachDeleteHandlers();
        }
      } catch (err) {
        console.error('[jobs] delete failed', err);
        btn.disabled = false;
        btn.textContent = 'Delete';
        alert(`Failed to delete: ${err.message}`);
      }
    });
  });
}

/* --------------------------------------------------------------------------
   Filters (search with debounce, status select)
   -------------------------------------------------------------------------- */
let searchTimer = null;

function setupFilters() {
  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        currentFilters.search = event.target.value.trim();
        loadJobs();
      }, 300);
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', (event) => {
      currentFilters.status = event.target.value;
      loadJobs();
    });
  }
}

/* --------------------------------------------------------------------------
   Init
   -------------------------------------------------------------------------- */
setupFilters();
loadJobs();