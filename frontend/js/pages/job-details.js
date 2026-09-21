/**
 * job-details.js — View, update status, delete a job, run AI analysis, generate cover letter.
 *
 * Reads ?id= from URL. Loads GET /api/jobs/:id and GET /api/jobs/:id/analysis.
 * Status dropdown → PUT /api/jobs/:id { status }.
 * Delete → DELETE /api/jobs/:id → redirect jobs.html.
 * Edit → redirect job-new.html?id=X.
 * Analyze → POST /api/jobs/:id/analyze → render analysis below.
 * Cover letter → modal with language/tone → POST /api/ai/cover-letter.
 */

import { api, ApiError } from '../api.js';
import { createModal } from '../ui/modal.js';

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

/* --------------------------------------------------------------------------
   Main render
   -------------------------------------------------------------------------- */
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
            <div class="detail-item__value" id="overview-match-score">${match}</div>
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

          <button type="button" class="btn btn--primary btn--block" id="analyze-btn">
            Analyze with AI
          </button>

          <button type="button" class="btn btn--secondary btn--block" id="cover-letter-btn">
            Generate cover letter
          </button>

          <button type="button" class="btn btn--ghost btn--block" id="delete-btn">
            Delete job
          </button>
        </div>
      </aside>
    </div>

    <section id="analysis-section" style="margin-top: var(--space-6);"></section>
  `;
}

/* --------------------------------------------------------------------------
   Analysis render
   -------------------------------------------------------------------------- */
function renderAnalysisLoading(section) {
  section.innerHTML = `
    <div class="panel">
      <div class="empty-state">
        <span class="spinner spinner--lg" aria-hidden="true"></span>
        <p class="text-muted">Analyzing your CV against this job…</p>
        <p class="text-muted" style="font-size: var(--text-xs);">This may take a few seconds.</p>
      </div>
    </div>
  `;
}

function renderAnalysisError(section, message) {
  section.innerHTML = `
    <div class="alert alert--danger">
      ${escapeHtml(message || 'Failed to analyze. Please try again.')}
    </div>
  `;
}

function renderAnalysis(section, a) {
  const scoreColor = a.matchScore >= 75 ? 'var(--color-success)'
                  : a.matchScore >= 50 ? 'var(--color-warning)'
                  : 'var(--color-danger)';

  const badgeRow = (items, cls, emptyText) => {
    if (!items || items.length === 0) {
      return `<span class="text-muted" style="font-size: var(--text-sm);">${escapeHtml(emptyText)}</span>`;
    }
    return items.map((s) => `<span class="badge ${cls}">${escapeHtml(s)}</span>`).join('');
  };

  const listItems = (items) => items.map((r) => `<li>${escapeHtml(r)}</li>`).join('');

  const strongHtml = badgeRow(a.strongMatches, 'badge--success', 'None detected');
  const partialHtml = badgeRow(a.partialMatches, 'badge--warning', 'None');
  const missingHtml = badgeRow(a.missingSkills, 'badge--danger', 'None — great fit!');

  const requirementsHtml = (a.requirements && a.requirements.length)
    ? `<ul style="list-style: disc; padding-left: var(--space-5); font-size: var(--text-sm); line-height: var(--leading-relaxed);">${listItems(a.requirements)}</ul>`
    : '<p class="text-muted" style="font-size: var(--text-sm);">No explicit requirements detected.</p>';

  const recommendationsHtml = (a.recommendations && a.recommendations.length)
    ? `<ul style="list-style: disc; padding-left: var(--space-5); font-size: var(--text-sm); line-height: var(--leading-relaxed);">${listItems(a.recommendations)}</ul>`
    : '';

  const modelLabel = a.modelUsed === 'mock' ? 'mock (no API key)' : escapeHtml(a.modelUsed);
  const dateStr = formatDate(a.createdAt);

  section.innerHTML = `
    <div class="panel">
      <div class="panel__header">
        <h3 class="panel__title">AI Analysis</h3>
        <span class="text-muted" style="font-size: var(--text-xs);">
          ${escapeHtml(modelLabel)} · ${escapeHtml(dateStr)}
        </span>
      </div>

      <div style="display: flex; align-items: baseline; gap: var(--space-3); margin-bottom: var(--space-6);">
        <span style="font-size: var(--text-6xl); font-weight: var(--weight-bold); color: ${scoreColor}; letter-spacing: -0.03em; line-height: 1;">
          ${a.matchScore}%
        </span>
        <span class="text-muted" style="font-size: var(--text-sm); text-transform: uppercase; letter-spacing: 0.06em;">Match</span>
      </div>

      ${a.summary ? `<p style="margin-bottom: var(--space-6); color: var(--color-text); line-height: var(--leading-relaxed);">${escapeHtml(a.summary)}</p>` : ''}

      <hr class="divider">

      <div style="display: flex; flex-direction: column; gap: var(--space-4);">
        <div>
          <div class="detail-item__label">Strong matches</div>
          <div class="badge-row">${strongHtml}</div>
        </div>

        <div>
          <div class="detail-item__label">Partial matches</div>
          <div class="badge-row">${partialHtml}</div>
        </div>

        <div>
          <div class="detail-item__label">Missing skills</div>
          <div class="badge-row">${missingHtml}</div>
        </div>
      </div>

      <hr class="divider">

      <div style="display: flex; flex-direction: column; gap: var(--space-4);">
        <div>
          <div class="detail-item__label">Requirements</div>
          ${requirementsHtml}
        </div>

        ${recommendationsHtml ? `
        <div>
          <div class="detail-item__label">Recommendations</div>
          ${recommendationsHtml}
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

/* --------------------------------------------------------------------------
   Actions
   -------------------------------------------------------------------------- */
function attachActions(container, job) {
  const statusSelect = container.querySelector('#status-select');
  const statusBadge = container.querySelector('#status-badge');
  const deleteBtn = container.querySelector('#delete-btn');
  const analyzeBtn = container.querySelector('#analyze-btn');
  const analysisSection = document.getElementById('analysis-section');
  const coverLetterBtn = container.querySelector('#cover-letter-btn');

  // Status change
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

  // Delete
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

  // Analyze
  if (analyzeBtn && analysisSection) {
    analyzeBtn.addEventListener('click', async () => {
      analyzeBtn.disabled = true;
      const originalLabel = analyzeBtn.textContent;
      analyzeBtn.textContent = 'Analyzing…';

      renderAnalysisLoading(analysisSection);
      analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

      try {
        const data = await api.post(`/jobs/${job.id}/analyze`);
        renderAnalysis(analysisSection, data.analysis);

        const scoreEl = document.getElementById('overview-match-score');
        if (scoreEl) scoreEl.textContent = `${data.analysis.matchScore}%`;

        analyzeBtn.textContent = 'Re-analyze';
      } catch (err) {
        console.error('[job-details] analyze failed', err);
        renderAnalysisError(analysisSection, err.message);
        analyzeBtn.textContent = originalLabel;
      } finally {
        analyzeBtn.disabled = false;
      }
    });
  }

  // Cover letter
  if (coverLetterBtn) {
    coverLetterBtn.addEventListener('click', () => {
      openCoverLetterModal(job);
    });
  }
}

/* --------------------------------------------------------------------------
   Cover letter modal
   -------------------------------------------------------------------------- */
function openCoverLetterModal(job) {
  const bodyHtml = `
    <div class="form-group">
      <label for="cl-language" class="label">Language</label>
      <select id="cl-language" class="select">
        <option value="en">English</option>
        <option value="pl">Polish</option>
        <option value="uk">Ukrainian</option>
      </select>
    </div>

    <div class="form-group">
      <label for="cl-tone" class="label">Tone</label>
      <select id="cl-tone" class="select">
        <option value="professional">Professional</option>
        <option value="friendly">Friendly</option>
        <option value="concise">Concise</option>
      </select>
    </div>

    <div id="cl-status" hidden style="margin-top: var(--space-4);"></div>

    <div id="cl-result-wrap" hidden style="margin-top: var(--space-4);">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-2);">
        <span class="detail-item__label" style="margin: 0;">Generated letter</span>
        <button type="button" class="btn btn--ghost btn--sm" id="cl-copy-btn">Copy</button>
      </div>
      <div class="cover-letter-result" id="cl-result"></div>
    </div>
  `;

  const footerHtml = `
    <button type="button" class="btn btn--secondary" id="cl-cancel-btn">Close</button>
    <button type="button" class="btn btn--primary" id="cl-generate-btn">
      <span class="btn__label">Generate</span>
      <span class="spinner" hidden aria-hidden="true"></span>
    </button>
  `;

  const modal = createModal({
    title: 'Generate cover letter',
    bodyHtml,
    footerHtml,
  });

  modal.open();

  const languageEl = modal.el.querySelector('#cl-language');
  const toneEl = modal.el.querySelector('#cl-tone');
  const statusEl = modal.el.querySelector('#cl-status');
  const resultWrap = modal.el.querySelector('#cl-result-wrap');
  const resultEl = modal.el.querySelector('#cl-result');
  const copyBtn = modal.el.querySelector('#cl-copy-btn');
  const generateBtn = modal.el.querySelector('#cl-generate-btn');
  const cancelBtn = modal.el.querySelector('#cl-cancel-btn');

  const setLoading = (isLoading) => {
    generateBtn.disabled = isLoading;
    generateBtn.classList.toggle('is-loading', isLoading);
    const spinner = generateBtn.querySelector('.spinner');
    const label = generateBtn.querySelector('.btn__label');
    if (spinner) spinner.hidden = !isLoading;
    if (label) label.style.visibility = isLoading ? 'hidden' : '';
  };

  cancelBtn.addEventListener('click', () => modal.close());

  generateBtn.addEventListener('click', async () => {
    setLoading(true);
    statusEl.hidden = false;
    statusEl.innerHTML = `<div class="alert alert--info"><span class="spinner" aria-hidden="true"></span> Generating cover letter…</div>`;
    resultWrap.hidden = true;

    try {
      const data = await api.post('/ai/cover-letter', {
        jobId: job.id,
        language: languageEl.value,
        tone: toneEl.value,
      });

      resultEl.textContent = data.letter;
      resultWrap.hidden = false;
      statusEl.hidden = true;
    } catch (err) {
      console.error('[job-details] cover letter failed', err);
      statusEl.innerHTML = `<div class="alert alert--danger">${escapeHtml(err.message || 'Generation failed.')}</div>`;
    } finally {
      setLoading(false);
    }
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(resultEl.textContent);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
    } catch (err) {
      console.error('[job-details] copy failed', err);
      copyBtn.textContent = 'Copy failed';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
    }
  });
}

/* --------------------------------------------------------------------------
   Init
   -------------------------------------------------------------------------- */
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

    // Try to load existing analysis (silently).
    try {
      const analysisData = await api.get(`/jobs/${id}/analysis`);
      if (analysisData.analysis) {
        const section = document.getElementById('analysis-section');
        if (section) renderAnalysis(section, analysisData.analysis);

        const analyzeBtn = container.querySelector('#analyze-btn');
        if (analyzeBtn) analyzeBtn.textContent = 'Re-analyze';
      }
    } catch (analysisErr) {
      console.debug('[job-details] no previous analysis');
    }
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