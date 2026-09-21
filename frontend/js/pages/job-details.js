/**
 * job-details.js — View, update status, delete a job.
 *
 * Reads ?id= from URL. Loads GET /api/jobs/:id.
 * Status dropdown → PUT /api/jobs/:id { status }.
 * Delete → DELETE /api/jobs/:id → redirect jobs.html.
 * Edit → redirect job-new.html?id=X.
 */

import { api, ApiError } from '../api.js';

const STATUSES = [
  { value: 'saved', label: 'Saved' },
  { value: 'applied', label: 'Applied' },
  { value: 'recruiter_contacted', label: 'Recruiter contacted' },
  { value: 'interview', label: 'Interview' },
  { value: 'technical_task', label: 'Technical task' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_BADGE = {
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
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatSalary(min, max) {
  const hasMin = min !== null && min !== undefined;
  const hasMax = max !== null && max !== undefined;
  if (!hasMin && !hasMax) return '—';
  if (hasMin && hasMax) return `${min} – ${max}`;
  if (hasMin) return `from ${min}`;
  return `up to ${max}`;
}

function getJobIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  return id ? Number(id) : null;
}

function renderDetails(container, job) {
  const statusClass = STATUS_BADGE[job.status] || 'badge--neutral';
  const match = job.match_score !== null && job.match_score !== undefined
    ? `${job.match_score}%`
    : '—';

  const statusOptions = STATUSES.map((s) =>
    `<option value="${s.value}" ${s.value === job.status ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
  ).join('');

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-header__title">${escapeHtml(job.title)}</h2>
        <p class="page-header__subtitle">
          ${escapeHtml(job.company || '—')}
          ${job.location ? ` · ${escapeHtml(job.location)}` : ''}
        </p>
      </div>
      <div class="page-header__actions">
        <a href="jobs.html" class="btn btn--secondary btn--sm">Back</a>
        <a href="job-new.html?id=${job.id}" class="btn btn--primary btn--sm">Edit</a>
      </div>
    </div>

    <div class="detail-grid">
      <div class="panel">
        <h3 class="panel__title" style="margin-bottom: var(--space-5);">Details</h3>
        <div class="detail-list">
          <div>
            <div class="detail-item__label">Status</div>
            <select id="status-select" class="select" style="max-width: 240px;">
              ${statusOptions}
            </select>
          </div>

          <div>
            <div class="detail-item__label">Salary</div>
            <div class="detail-item__value">
              ${escapeHtml(formatSalary(job.salary_min, job.salary_max))}
              ${job.employment_type ? ` · ${escapeHtml(job.employment_type)}` : ''}
            </div>
          </div>

          ${job.url ? `
          <div>
            <div class="detail-item__label">URL</div>
            <div class="detail-item__value">
              <a href="${escapeHtml(job.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(job.url)}</a>
            </div>
          </div>
          ` : ''}

          ${job.description ? `
          <div>
            <div class="detail-item__label">Description</div>
            <div class="detail-item__value detail-item__value--pre">${escapeHtml(job.description)}</div>
          </div>
          ` : ''}

          ${job.notes ? `
          <div>
            <div class="detail-item__label">Notes</div>
            <div class="detail-item__value detail-item__value--pre">${escapeHtml(job.notes)}</div>
          </div>
          ` : ''}
        </div>
      </div>

      <aside class="panel">
        <h3 class="panel__title" style="margin-bottom: var(--space-5);">Overview</h3>
        <div class="detail-list">
          <div>
            <div class="detail-item__label">Current status</div>
            <div class="detail-item__value">
              <span class="badge ${statusClass}" id="status-badge">${escapeHtml(job.status)}</span>
            </div>
          </div>

          <div>
            <div class="detail-item__label">Match score</div>
            <div class="detail-item__value">${match}</div>
          </div>

          <div>
            <div class="detail-item__label">Created</div>
            <div class="detail-item__value">${escapeHtml(formatDate(job.created_at))}</div>
          </div>

          <div>
            <div class="detail-item__label">Updated</div>
            <div class="detail-item__value">${escapeHtml(formatDate(job.updated_at))}</div>
          </div>

          <hr class="divider">

          <button type="button" class="btn btn--secondary btn--block" id="analyze-btn" disabled title="AI analysis coming in Phase 9">
            Analyze with AI (soon)
          </button>

          <button type="button" class="btn btn--ghost btn--block" id="delete-btn">
            Delete job
          </button>
        </div>
      </aside>
    </div>
  `;
}

function attachActions(container, job) {
  const statusSelect = container.querySelector('#status-select');
  const statusBadge = container.querySelector('#status-badge');
  const deleteBtn = container.querySelector('#delete-btn');

  if (statusSelect) {
    statusSelect.addEventListener('change', async (event) => {
      const newStatus = event.target.value;
      const oldStatus = job.status;
      if (newStatus === oldStatus) return;

      statusSelect.disabled = true;
      try {
        const data = await api.put(`/jobs/${job.id}`, { status: newStatus });
        job.status = data.job.status;

        statusBadge.textContent = data.job.status;
        statusBadge.className = `badge ${STATUS_BADGE[data.job.status] || 'badge--neutral'}`;
      } catch (err) {
        console.error('[job-details] status update failed', err);
        statusSelect.value = oldStatus;
        alert('Failed to update status.');
      } finally {
        statusSelect.disabled = false;
      }
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const confirmed = window.confirm(`Delete "${job.title}"? This cannot be undone.`);
      if (!confirmed) return;

      deleteBtn.disabled = true;
      deleteBtn.textContent = 'Deleting…';
      try {
        await api.delete(`/jobs/${job.id}`);
        window.location.href = 'jobs.html';
      } catch (err) {
        console.error('[job-details] delete failed', err);
        alert('Failed to delete job.');
        deleteBtn.disabled = false;
        deleteBtn.textContent = 'Delete job';
      }
    });
  }
}

async function init() {
  const container = document.getElementById('job-details-container');
  if (!container) return;

  const id = getJobIdFromUrl();
  if (!id) {
    container.innerHTML = `
      <div class="empty-state">
        <p class="empty-state__title">Job not specified</p>
        <p class="empty-state__description text-muted">Missing ?id= in the URL.</p>
        <a href="jobs.html" class="btn btn--primary">Back to jobs</a>
      </div>
    `;
    return;
  }

  try {
    const data = await api.get(`/jobs/${id}`);
    renderDetails(container, data.job);
    attachActions(container, data.job);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      container.innerHTML = `
        <div class="empty-state">
          <p class="empty-state__title">Job not found</p>
          <p class="empty-state__description text-muted">This job may have been deleted or belongs to another user.</p>
          <a href="jobs.html" class="btn btn--primary">Back to jobs</a>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="alert alert--danger">Failed to load job. Please refresh.</div>
      `;
      console.error('[job-details] load failed', err);
    }
  }
}

init();