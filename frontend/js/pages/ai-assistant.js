/**
 * ai-assistant.js — AI Assistant page logic.
 *
 * Current features:
 *   - Recruiter reply generation
 *
 * Future:
 *   - Interview preparation (Phase 13)
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
   Init
   -------------------------------------------------------------------------- */
initRecruiterReply();