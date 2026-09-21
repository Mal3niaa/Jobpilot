/**
 * ai-assistant.js — AI Assistant page logic.
 *
 * Features:
 *   - Recruiter reply generation
 *   - Interview question generation
 */
import { api } from '../api.js';

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

const INTENT_LABELS = {
  interview_invite: 'Interview invitation',
  rejection: 'Rejection',
  question: 'Question',
  salary_question: 'Salary question',
  general: 'General',
};

/* --------------------------------------------------------------------------
   Recruiter Reply
   -------------------------------------------------------------------------- */
function initRecruiterReply() {
  const messageEl = document.getElementById('rr-message');
  const languageEl = document.getElementById('rr-language');
  const generateBtn = document.getElementById('rr-generate-btn');
  const statusEl = document.getElementById('rr-status');
  const resultWrap = document.getElementById('rr-result-wrap');
  const resultEl = document.getElementById('rr-result');
  const copyBtn = document.getElementById('rr-copy-btn');
  const intentBadge = document.getElementById('rr-intent-badge');
  const errorEl = document.querySelector('[data-error-for="rr-message"]');

  if (!messageEl || !generateBtn) return;

  const setLoading = (isLoading) => {
    generateBtn.disabled = isLoading;
    generateBtn.classList.toggle('is-loading', isLoading);
    const spinner = generateBtn.querySelector('.spinner');
    const label = generateBtn.querySelector('.btn__label');
    if (spinner) spinner.hidden = !isLoading;
    if (label) label.style.visibility = isLoading ? 'hidden' : '';
  };

  const clearErrors = () => {
    if (errorEl) { errorEl.textContent = ''; errorEl.hidden = true; }
    statusEl.hidden = true;
  };

  generateBtn.addEventListener('click', async () => {
    clearErrors();

    const message = messageEl.value.trim();
    if (message.length < 10) {
      if (errorEl) {
        errorEl.textContent = 'Please paste a message (at least 10 characters).';
        errorEl.hidden = false;
      }
      return;
    }

    setLoading(true);
    statusEl.hidden = false;
    statusEl.innerHTML = `
      <div class="alert alert--info">
        <span class="spinner" aria-hidden="true"></span>
        <span>Generating reply…</span>
      </div>
    `;
    resultWrap.hidden = true;

    try {
      const data = await api.post('/ai/recruiter-reply', {
        message,
        language: languageEl.value,
      });

      resultEl.textContent = data.reply;
      resultWrap.hidden = false;
      statusEl.hidden = true;

      // Show intent badge if provided (mock only).
      if (data.intent && INTENT_LABELS[data.intent]) {
        intentBadge.textContent = INTENT_LABELS[data.intent];
        intentBadge.style.display = 'inline-flex';
      } else {
        intentBadge.style.display = 'none';
      }
    } catch (err) {
      console.error('[ai-assistant] recruiter reply failed', err);
      statusEl.innerHTML = `
        <div class="alert alert--danger">${escapeHtml(err.message || 'Failed to generate reply.')}</div>
      `;
    } finally {
      setLoading(false);
    }
  });

  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(resultEl.textContent);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
    } catch (err) {
      console.error('[ai-assistant] copy failed', err);
      copyBtn.textContent = 'Copy failed';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
    }
  });
}


/* --------------------------------------------------------------------------
   Interview Preparation
   -------------------------------------------------------------------------- */
const CATEGORY_LABELS = {
  technical: 'Technical',
  behavioral: 'Behavioral',
  'role-specific': 'Role-specific',
};

const CATEGORY_ORDER = ['technical', 'behavioral', 'role-specific'];

/**
 * Load the user's jobs into the select.
 * Filters out jobs without a description — they can't be used for prep.
 */
async function loadJobsForInterviewPrep() {
  const select = document.getElementById('ip-job');
  if (!select) return;

  try {
    const data = await api.get('/jobs?sort=created_at&order=desc');
    const jobs = data.jobs.filter((j) => j.description && j.description.trim().length >= 20);

    if (jobs.length === 0) {
      select.innerHTML = '<option value="">No eligible jobs (need a description)</option>';
      select.disabled = true;
      return;
    }

    select.innerHTML = jobs
      .map((j) => `<option value="${j.id}">${escapeHtml(j.title)}${j.company ? ` — ${escapeHtml(j.company)}` : ''}</option>`)
      .join('');
  } catch (err) {
    console.error('[ai-assistant] failed to load jobs', err);
    select.innerHTML = '<option value="">Failed to load jobs</option>';
    select.disabled = true;
  }
}

function renderInterviewQuestions(container, questions) {
  // Group by category.
  const byCategory = {};
  for (const q of questions) {
    const cat = q.category || 'technical';
    (byCategory[cat] ||= []).push(q);
  }

  const sections = CATEGORY_ORDER
    .filter((cat) => byCategory[cat]?.length)
    .map((cat) => {
      const items = byCategory[cat]
        .map((q) => `<li>${escapeHtml(q.question)}</li>`)
        .join('');
      return `
        <div style="margin-bottom: var(--space-5);">
          <div class="detail-item__label" style="margin-bottom: var(--space-3);">${CATEGORY_LABELS[cat] || cat}</div>
          <ul style="list-style: disc; padding-left: var(--space-5); font-size: var(--text-sm); line-height: var(--leading-relaxed);">${items}</ul>
        </div>
      `;
    })
    .join('');

  container.innerHTML = `
    <div style="padding: var(--space-4); background-color: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md);">
      ${sections}
    </div>
  `;
}

function initInterviewPrep() {
  const select = document.getElementById('ip-job');
  const generateBtn = document.getElementById('ip-generate-btn');
  const statusEl = document.getElementById('ip-status');
  const resultWrap = document.getElementById('ip-result-wrap');
  const resultEl = document.getElementById('ip-result');
  const copyBtn = document.getElementById('ip-copy-btn');

  if (!generateBtn) return;

  const setLoading = (isLoading) => {
    generateBtn.disabled = isLoading;
    generateBtn.classList.toggle('is-loading', isLoading);
    const spinner = generateBtn.querySelector('.spinner');
    const label = generateBtn.querySelector('.btn__label');
    if (spinner) spinner.hidden = !isLoading;
    if (label) label.style.visibility = isLoading ? 'hidden' : '';
  };

  let lastQuestions = [];

  generateBtn.addEventListener('click', async () => {
    const jobId = select.value;
    if (!jobId) {
      statusEl.hidden = false;
      statusEl.innerHTML = `<div class="alert alert--warning">Select a job first.</div>`;
      return;
    }

    setLoading(true);
    statusEl.hidden = false;
    statusEl.innerHTML = `
      <div class="alert alert--info">
        <span class="spinner" aria-hidden="true"></span>
        <span>Generating questions…</span>
      </div>
    `;
    resultWrap.hidden = true;

    try {
      const data = await api.post('/ai/interview-questions', { jobId: Number(jobId) });
      lastQuestions = data.questions;

      renderInterviewQuestions(resultEl, data.questions);
      resultWrap.hidden = false;
      statusEl.hidden = true;
    } catch (err) {
      console.error('[ai-assistant] interview questions failed', err);
      statusEl.innerHTML = `<div class="alert alert--danger">${escapeHtml(err.message || 'Generation failed.')}</div>`;
    } finally {
      setLoading(false);
    }
  });

  copyBtn?.addEventListener('click', async () => {
    if (!lastQuestions.length) return;

    // Format as plain text for clipboard.
    const byCategory = {};
    for (const q of lastQuestions) {
      const cat = q.category || 'technical';
      (byCategory[cat] ||= []).push(q);
    }

    const lines = [];
    for (const cat of CATEGORY_ORDER) {
      if (!byCategory[cat]?.length) continue;
      lines.push(`== ${CATEGORY_LABELS[cat].toUpperCase()} ==`);
      for (const q of byCategory[cat]) {
        lines.push(`- ${q.question}`);
      }
      lines.push('');
    }

    const text = lines.join('\n');

    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy all'; }, 1500);
    } catch (err) {
      console.error('[ai-assistant] copy failed', err);
      copyBtn.textContent = 'Copy failed';
      setTimeout(() => { copyBtn.textContent = 'Copy all'; }, 1500);
    }
  });

  // Load jobs on page load.
  loadJobsForInterviewPrep();
}

/* --------------------------------------------------------------------------
   Init (both features)
   -------------------------------------------------------------------------- */
initRecruiterReply();
initInterviewPrep();