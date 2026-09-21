/**
 * applications.js — Kanban board for tracking job applications.
 *
 * Features:
 *  - Loads all jobs from /api/jobs
 *  - Groups them by status into 5 columns
 *  - Drag-and-drop between columns updates status via PUT /api/jobs/:id
 *  - Optimistic UI: moves card immediately, reverts on error
 *  - Search filter (title / company), with debounce
 *  - Mobile: uses dropdown "Move to" instead of drag-and-drop
 */

import { api } from '../api.js';

/* --------------------------------------------------------------------------
   Config
   -------------------------------------------------------------------------- */
const COLUMNS = [
  { status: 'saved', title: 'Saved' },
  { status: 'applied', title: 'Applied' },
  { status: 'interview', title: 'Interview' },
  { status: 'offer', title: 'Offer' },
  { status: 'rejected', title: 'Rejected' },
];

// Statuses that collapse into a single column.
const STATUS_GROUP = {
  saved: 'saved',
  applied: 'applied',
  recruiter_contacted: 'applied',
  interview: 'interview',
  technical_task: 'interview',
  offer: 'offer',
  rejected: 'rejected',
};

/* --------------------------------------------------------------------------
   State
   -------------------------------------------------------------------------- */
let allJobs = [];
let filteredJobs = [];
let searchTerm = '';
let searchTimer = null;

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

function getJobsForColumn(statusGroup) {
  return filteredJobs.filter((job) => STATUS_GROUP[job.status] === statusGroup);
}

/* --------------------------------------------------------------------------
   Render
   -------------------------------------------------------------------------- */
function renderBoard() {
  const container = document.getElementById('kanban-container');
  if (!container) return;

  const columnsHtml = COLUMNS.map((col) => {
    const jobs = getJobsForColumn(col.status);
    const cards = jobs.map(renderCard).join('');
    const empty = jobs.length === 0
      ? '<div class="kanban-column__empty">No jobs here</div>'
      : '';

    return `
      <section class="kanban-column" data-status="${col.status}" aria-label="${col.title}">
        <div class="kanban-column__header">
          <span class="kanban-column__title">${escapeHtml(col.title)}</span>
          <span class="kanban-column__count">${jobs.length}</span>
        </div>
        <div class="kanban-column__body">
          ${cards}
          ${empty}
        </div>
      </section>
    `;
  }).join('');

  container.innerHTML = `<div class="kanban-board">${columnsHtml}</div>`;

  attachDragAndDrop();
  attachMoveDropdowns();
}

function renderCard(job) {
  const match = job.match_score !== null && job.match_score !== undefined
    ? `${job.match_score}%`
    : '';

  // Build a <select> with all column statuses. Selected = current group.
  const statusOptions = COLUMNS.map((c) => {
    const isSelected = STATUS_GROUP[job.status] === c.status;
    return `<option value="${c.status}" ${isSelected ? 'selected' : ''}>${escapeHtml(c.title)}</option>`;
  }).join('');

  return `
    <article class="kanban-card" draggable="true" data-job-id="${job.id}">
      <div class="kanban-card__title">${escapeHtml(job.title)}</div>
      ${job.company ? `<div class="kanban-card__company">${escapeHtml(job.company)}</div>` : ''}
      <div class="kanban-card__footer">
        <a href="job-details.html?id=${job.id}" class="kanban-card__link" draggable="false">Details</a>
        ${match ? `<span class="badge badge--accent">${escapeHtml(match)}</span>` : ''}
      </div>
      <div class="kanban-card__move">
        <label class="kanban-card__move-label" for="move-${job.id}">Move to:</label>
        <select
          id="move-${job.id}"
          class="kanban-card__select"
          data-move-id="${job.id}"
        >
          ${statusOptions}
        </select>
      </div>
    </article>
  `;
}

function renderEmptyState(message, description, showAdd) {
  const container = document.getElementById('kanban-container');
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <p class="empty-state__title">${escapeHtml(message)}</p>
      <p class="empty-state__description text-muted">${escapeHtml(description)}</p>
      ${showAdd ? '<a href="job-new.html" class="btn btn--primary">Add your first job</a>' : ''}
    </div>
  `;
}

/* --------------------------------------------------------------------------
   Data
   -------------------------------------------------------------------------- */
async function loadJobs() {
  const container = document.getElementById('kanban-container');
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state">
      <span class="spinner spinner--lg" aria-hidden="true"></span>
      <p class="text-muted">Loading applications…</p>
    </div>
  `;

  try {
    const data = await api.get('/jobs?sort=created_at&order=desc');
    allJobs = data.jobs;

    if (allJobs.length === 0) {
      renderEmptyState(
        'No applications yet',
        'Add your first job to start tracking your pipeline.',
        true
      );
      return;
    }

    applyFilter();
  } catch (err) {
    console.error('[applications] failed to load', err);
    container.innerHTML = `
      <div class="alert alert--danger">Failed to load applications. Please refresh.</div>
    `;
  }
}

function applyFilter() {
  const term = searchTerm.trim().toLowerCase();
  if (!term) {
    filteredJobs = allJobs;
  } else {
    filteredJobs = allJobs.filter((job) => {
      const title = (job.title || '').toLowerCase();
      const company = (job.company || '').toLowerCase();
      return title.includes(term) || company.includes(term);
    });
  }
  renderBoard();
}

/* --------------------------------------------------------------------------
   Move job to a new status (shared by DnD and dropdown)
   -------------------------------------------------------------------------- */
async function moveJob(job, newStatus) {
  const oldStatus = job.status;

  if (STATUS_GROUP[oldStatus] === newStatus) return; // no-op

  // Optimistic update.
  job.status = newStatus;
  applyFilter();

  try {
    const data = await api.put(`/jobs/${job.id}`, { status: newStatus });
    const idx = allJobs.findIndex((j) => j.id === job.id);
    if (idx >= 0) allJobs[idx] = data.job;
  } catch (err) {
    console.error('[applications] status update failed', err);
    job.status = oldStatus;
    applyFilter();
    alert('Failed to update status. Please try again.');
  }
}

/* --------------------------------------------------------------------------
   Drag and drop (desktop)
   -------------------------------------------------------------------------- */
function attachDragAndDrop() {
  const cards = document.querySelectorAll('.kanban-card');
  const columns = document.querySelectorAll('.kanban-column');

  let draggedJobId = null;

  cards.forEach((card) => {
    card.addEventListener('dragstart', (event) => {
      draggedJobId = card.getAttribute('data-job-id');
      card.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', draggedJobId);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('is-dragging');
      document.querySelectorAll('.kanban-column').forEach((c) => {
        c.classList.remove('is-drop-target');
      });
      draggedJobId = null;
    });
  });

  columns.forEach((column) => {
    column.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      column.classList.add('is-drop-target');
    });

    column.addEventListener('dragleave', (event) => {
      if (!column.contains(event.relatedTarget)) {
        column.classList.remove('is-drop-target');
      }
    });

    column.addEventListener('drop', async (event) => {
      event.preventDefault();
      column.classList.remove('is-drop-target');

      const targetGroup = column.getAttribute('data-status');
      if (!draggedJobId || !targetGroup) return;

      const job = allJobs.find((j) => String(j.id) === String(draggedJobId));
      if (!job) return;

      await moveJob(job, targetGroup);
    });
  });
}

/* --------------------------------------------------------------------------
   Move-to dropdown (mobile)
   -------------------------------------------------------------------------- */
function attachMoveDropdowns() {
  document.querySelectorAll('[data-move-id]').forEach((select) => {
    // Prevent drag from starting when interacting with the select.
    select.addEventListener('dragstart', (event) => event.preventDefault());

    // Avoid duplicated handlers if the same select is re-bound.
    if (select.dataset.bound === 'true') return;
    select.dataset.bound = 'true';

    select.addEventListener('change', async (event) => {
      const jobId = event.target.getAttribute('data-move-id');
      const newStatus = event.target.value;

      const job = allJobs.find((j) => String(j.id) === String(jobId));
      if (!job) return;

      await moveJob(job, newStatus);
    });
  });
}

/* --------------------------------------------------------------------------
   Search (debounced)
   -------------------------------------------------------------------------- */
function setupSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;

  input.addEventListener('input', (event) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchTerm = event.target.value;
      applyFilter();
    }, 300);
  });
}

/* --------------------------------------------------------------------------
   Init
   -------------------------------------------------------------------------- */
setupSearch();
loadJobs();