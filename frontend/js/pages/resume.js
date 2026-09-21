/**
 * resume.js — Resume page logic.
 *
 * - Loads current resume (GET /api/resume)
 * - Uploads new resume (POST /api/resume, multipart/form-data)
 * - Displays preview of extracted text
 * - Deletes active resume (DELETE /api/resume)
 */

import { api, ApiError } from '../api.js';

/* --------------------------------------------------------------------------
   State
   -------------------------------------------------------------------------- */
let currentResume = null;
let fullRawText = null;

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

function getContainer() {
  return document.getElementById('resume-container');
}

/* --------------------------------------------------------------------------
   Views
   -------------------------------------------------------------------------- */

/**
 * Render the empty state (no resume uploaded yet) with a file drop zone.
 */
function renderEmpty() {
  const container = getContainer();
  if (!container) return;

  container.innerHTML = `
    <div class="form-card" style="max-width: 640px;">
      <h3 style="margin-bottom: var(--space-2);">Upload your CV</h3>
      <p class="text-muted" style="margin-bottom: var(--space-6); font-size: var(--text-sm);">
        PDF only · Max 5 MB · We'll extract the text automatically.
      </p>

      <label
        for="file-input"
        id="dropzone"
        class="dropzone"
        tabindex="0"
        style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-3); padding: var(--space-12) var(--space-6); border: 2px dashed var(--color-border-strong); border-radius: var(--radius-lg); cursor: pointer; transition: border-color 150ms, background-color 150ms; text-align: center;"
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="color: var(--color-accent);">
          <path d="M12 16V4M12 4l-4 4M12 4l4 4M4 20h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div>
          <div style="font-weight: var(--weight-medium);">Click to choose a PDF</div>
          <div class="text-muted" style="font-size: var(--text-xs); margin-top: var(--space-1);">or drag and drop it here</div>
        </div>
      </label>

      <input type="file" id="file-input" accept="application/pdf,.pdf" hidden>

      <div id="upload-status" hidden style="margin-top: var(--space-4);"></div>
      <div id="upload-error" hidden style="margin-top: var(--space-4);"></div>
    </div>
  `;

  attachDropzoneHandlers();
}

/**
 * Render the "resume uploaded" state with metadata + preview.
 */
function renderResume(resume) {
  const container = getContainer();
  if (!container) return;

  const preview = resume.preview || '';
  const textLength = resume.textLength ?? 0;
  const uploadDate = formatDate(resume.created_at);

  container.innerHTML = `
    <div class="detail-grid">
      <div class="panel">
        <div class="panel__header">
          <h3 class="panel__title">Extracted text preview</h3>
          <button type="button" class="btn btn--ghost btn--sm" id="toggle-full-text">
            Show full text
          </button>
        </div>
        <pre
          id="resume-text-preview"
          style="white-space: pre-wrap; font-family: var(--font-mono); font-size: var(--text-xs); line-height: var(--leading-relaxed); color: var(--color-text); max-height: 480px; overflow: auto; padding: var(--space-4); background-color: var(--color-bg); border-radius: var(--radius-md); border: 1px solid var(--color-border);"
        >${escapeHtml(preview)}</pre>
        <p class="text-muted" style="font-size: var(--text-xs); margin-top: var(--space-3);">
          Total extracted: <strong>${textLength}</strong> characters.
        </p>
      </div>

      <aside class="panel">
        <h3 class="panel__title" style="margin-bottom: var(--space-5);">Resume info</h3>
        <div class="detail-list">
          <div>
            <div class="detail-item__label">Status</div>
            <div class="detail-item__value">
              <span class="badge badge--success">Active</span>
            </div>
          </div>

          <div>
            <div class="detail-item__label">Uploaded</div>
            <div class="detail-item__value">${escapeHtml(uploadDate)}</div>
          </div>

          <div>
            <div class="detail-item__label">Text length</div>
            <div class="detail-item__value">${textLength} characters</div>
          </div>

          <hr class="divider">

          <button type="button" class="btn btn--secondary btn--block" id="replace-btn">
            Replace with new PDF
          </button>

          <button type="button" class="btn btn--ghost btn--block" id="delete-resume-btn">
            Delete resume
          </button>
        </div>
      </aside>
    </div>
  `;

  // Toggle full text
  const toggleBtn = container.querySelector('#toggle-full-text');
  const previewEl = container.querySelector('#resume-text-preview');

  toggleBtn?.addEventListener('click', async () => {
    if (previewEl.dataset.expanded === 'true') {
      previewEl.textContent = preview;
      previewEl.dataset.expanded = 'false';
      toggleBtn.textContent = 'Show full text';
      return;
    }

    // Lazy-load full text from API
    try {
      if (!fullRawText) {
        const data = await api.get('/resume/text');
        fullRawText = data.rawText;
      }
      previewEl.textContent = fullRawText;
      previewEl.dataset.expanded = 'true';
      toggleBtn.textContent = 'Show preview';
    } catch (err) {
      console.error('[resume] failed to load full text', err);
      alert('Failed to load full text.');
    }
  });

  // Replace
  container.querySelector('#replace-btn')?.addEventListener('click', () => {
    fullRawText = null;
    renderEmpty();
  });

  // Delete
  container.querySelector('#delete-resume-btn')?.addEventListener('click', async () => {
    const confirmed = window.confirm('Delete your resume? You can upload a new one later.');
    if (!confirmed) return;

    try {
      await api.delete('/resume');
      currentResume = null;
      fullRawText = null;
      renderEmpty();
    } catch (err) {
      console.error('[resume] delete failed', err);
      alert('Failed to delete resume.');
    }
  });
}

/* --------------------------------------------------------------------------
   Upload handlers
   -------------------------------------------------------------------------- */
function attachDropzoneHandlers() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const statusEl = document.getElementById('upload-status');
  const errorEl = document.getElementById('upload-error');

  if (!dropzone || !fileInput) return;

  // Click → open file picker
  dropzone.addEventListener('click', () => fileInput.click());

  // Keyboard: Enter / Space
  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput.click();
    }
  });

  // File input change
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) handleFile(file);
  });

  // Drag events
  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (event) => {
      event.preventDefault();
      dropzone.style.borderColor = 'var(--color-accent)';
      dropzone.style.backgroundColor = 'var(--color-accent-soft)';
    });
  });

  ['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (event) => {
      event.preventDefault();
      dropzone.style.borderColor = '';
      dropzone.style.backgroundColor = '';
    });
  });

  dropzone.addEventListener('drop', (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });

  // Helper — set status message
  function setStatus(message) {
    statusEl.innerHTML = `
      <div class="alert alert--info">
        <span class="spinner" aria-hidden="true"></span>
        <span>${escapeHtml(message)}</span>
      </div>
    `;
    statusEl.hidden = false;
    errorEl.hidden = true;
  }

  function setError(message) {
    errorEl.innerHTML = `
      <div class="alert alert--danger">${escapeHtml(message)}</div>
    `;
    errorEl.hidden = false;
    statusEl.hidden = true;
  }

  async function handleFile(file) {
    // Client-side validation
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File is too large (max 5 MB).');
      return;
    }

    setStatus(`Uploading ${file.name}…`);

    try {
      // Build FormData
      const formData = new FormData();
      formData.append('file', file);

      // Use raw fetch because our api wrapper always sets Content-Type: application/json.
      const token = localStorage.getItem('jobpilot_token');
      const response = await fetch('http://localhost:3000/api/resume', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || `Upload failed (${response.status})`);
      }

      // Success — re-render with new resume.
      currentResume = payload.data.resume;
      fullRawText = null;
      renderResume(currentResume);
    } catch (err) {
      console.error('[resume] upload failed', err);
      setError(err.message || 'Upload failed. Please try again.');
    }
  }
}

/* --------------------------------------------------------------------------
   Init
   -------------------------------------------------------------------------- */
async function init() {
  const container = getContainer();
  if (!container) return;

  try {
    const data = await api.get('/resume');
    currentResume = data.resume;

    if (currentResume) {
      renderResume(currentResume);
    } else {
      renderEmpty();
    }
  } catch (err) {
    console.error('[resume] init failed', err);
    container.innerHTML = `
      <div class="alert alert--danger">Failed to load resume data. Please refresh.</div>
    `;
  }
}

init();