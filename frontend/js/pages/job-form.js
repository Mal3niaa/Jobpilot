/**
 * job-form.js — Create / edit job form.
 *
 * Detects mode by ?id= in URL:
 *   - No id  → create mode → POST /api/jobs
 *   - Has id → edit mode  → GET /api/jobs/:id, then PUT /api/jobs/:id
 */

import { api, ApiError } from '../api.js';

/* --------------------------------------------------------------------------
   Field helpers
   -------------------------------------------------------------------------- */
const FIELDS = [
  'title', 'company', 'location',
  'salaryMin', 'salaryMax', 'employmentType',
  'url', 'description', 'notes',
];

function getFormEl() { return document.getElementById('job-form'); }

function setFieldError(fieldName, message) {
  const el = document.querySelector(`[data-error-for="${fieldName}"]`);
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.hidden = false;
  } else {
    el.textContent = '';
    el.hidden = true;
  }
}

function clearAllErrors() {
  document.querySelectorAll('[data-error-for]').forEach((el) => {
    el.textContent = '';
    el.hidden = true;
  });
  const banner = document.getElementById('form-error-banner');
  if (banner) { banner.textContent = ''; banner.hidden = true; }
}

function showBanner(message) {
  const banner = document.getElementById('form-error-banner');
  if (!banner) return;
  banner.textContent = message;
  banner.hidden = false;
}

function setLoading(isLoading) {
  const btn = document.getElementById('submit-btn');
  if (!btn) return;
  btn.classList.toggle('is-loading', isLoading);
  btn.disabled = isLoading;
  const spinner = btn.querySelector('.spinner');
  const label = btn.querySelector('.btn__label');
  if (spinner) spinner.hidden = !isLoading;
  if (label) label.style.visibility = isLoading ? 'hidden' : '';
}

/* --------------------------------------------------------------------------
   Form <-> object
   -------------------------------------------------------------------------- */
function readForm() {
  const form = getFormEl();
  const fd = new FormData(form);
  const data = {};

  for (const field of FIELDS) {
    const raw = fd.get(field);
    if (raw === null) continue;
    const value = String(raw).trim();
    if (value === '') continue;

    if (field === 'salaryMin' || field === 'salaryMax') {
      const num = Number(value);
      if (Number.isFinite(num)) data[field] = num;
    } else {
      data[field] = value;
    }
  }

  return data;
}

function fillForm(job) {
  for (const field of FIELDS) {
    const el = document.getElementById(field);
    if (!el) continue;
    const value = job[fieldToApiKey(field)];
    if (value !== null && value !== undefined) el.value = value;
  }
}

/**
 * Map form field name → API/DB field name.
 * Our API accepts camelCase and converts to snake_case server-side.
 * The job object we get back uses snake_case for some fields.
 */
function fieldToApiKey(field) {
  const map = {
    title: 'title',
    company: 'company',
    location: 'location',
    salaryMin: 'salary_min',
    salaryMax: 'salary_max',
    employmentType: 'employment_type',
    url: 'url',
    description: 'description',
    notes: 'notes',
  };
  return map[field] || field;
}

/* --------------------------------------------------------------------------
   Client-side validation
   -------------------------------------------------------------------------- */
function validate(data) {
  let ok = true;

  if (!data.title || data.title.length < 2) {
    setFieldError('title', 'Job title is required (at least 2 characters).');
    ok = false;
  }
  if (data.url && !/^https?:\/\//i.test(data.url)) {
    setFieldError('url', 'URL must start with http:// or https://');
    ok = false;
  }
  if (data.salaryMin !== undefined && data.salaryMax !== undefined && data.salaryMin > data.salaryMax) {
    setFieldError('salaryMin', 'Min salary cannot be greater than max salary.');
    ok = false;
  }

  return ok;
}

/* --------------------------------------------------------------------------
   Error display
   -------------------------------------------------------------------------- */
function displayError(err) {
  if (err instanceof ApiError) {
    if (err.errors) {
      Object.entries(err.errors).forEach(([field, msg]) => setFieldError(field, msg));
      return;
    }
    showBanner(err.message);
    return;
  }
  showBanner('Something went wrong. Please try again.');
  console.error('[job-form] unexpected error', err);
}

/* --------------------------------------------------------------------------
   Mode detection
   -------------------------------------------------------------------------- */
function getJobIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  return id ? Number(id) : null;
}

function setPageTitles(mode, job) {
  const isEdit = mode === 'edit';
  const pageTitle = isEdit ? 'Edit job' : 'New job';
  const headingTitle = isEdit ? 'Edit job' : 'Add a new job';
  const submitLabel = isEdit ? 'Save changes' : 'Save job';

  document.title = `${pageTitle} - JobPilot`;

  const topTitle = document.querySelector('.topbar__title');
  if (topTitle) topTitle.textContent = pageTitle;

  const h2 = document.getElementById('page-title');
  if (h2) h2.textContent = isEdit && job ? `Edit: ${job.title}` : headingTitle;

  const label = document.querySelector('#submit-btn .btn__label');
  if (label) label.textContent = submitLabel;
}

/* --------------------------------------------------------------------------
   Init
   -------------------------------------------------------------------------- */
async function init() {
  const jobId = getJobIdFromUrl();
  const isEdit = Number.isInteger(jobId) && jobId > 0;

  // In edit mode — load existing job and fill the form.
  if (isEdit) {
    setPageTitles('edit', null);
    try {
      const data = await api.get(`/jobs/${jobId}`);
      fillForm(data.job);
      setPageTitles('edit', data.job);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        showBanner('Job not found.');
      } else {
        displayError(err);
      }
      setLoading(false);
      // Disable form — no point editing non-existent job.
      getFormEl()?.querySelectorAll('input, textarea, select, button').forEach((el) => {
        el.disabled = true;
      });
      return;
    }
  } else {
    setPageTitles('create', null);
  }

  // Submit handler.
  const form = getFormEl();
  if (!form) return;

  // Guard against double submit (rapid double-click before setLoading kicks in).
  let submitting = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return;
    submitting = true;

    clearAllErrors();

    const data = readForm();
    if (!validate(data)) {
      submitting = false;
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/jobs/${jobId}`, data);
        window.location.href = `job-details.html?id=${jobId}`;
      } else {
        const created = await api.post('/jobs', data);
        const newId = created.job.id;
        window.location.href = `job-details.html?id=${newId}`;
      }
    } catch (err) {
      displayError(err);
      submitting = false;
      setLoading(false);
    }
  });
}

init();