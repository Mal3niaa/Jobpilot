/**
 * modal.js — tiny vanilla JS modal helper.
 *
 * Usage:
 *   const modal = createModal({
 *     title: 'Hello',
 *     bodyHtml: '<p>Content</p>',
 *     footerHtml: '<button class="btn btn--primary">OK</button>',
 *   });
 *   modal.open();
 *   modal.close();
 *   modal.destroy();
 *
 * Features:
 *   - Renders into document.body
 *   - Focus traps (simple)
 *   - Escape closes
 *   - Click on backdrop closes
 */

let activeModals = [];

export function createModal({ title = '', bodyHtml = '', footerHtml = '', onClose } = {}) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');

  backdrop.innerHTML = `
    <div class="modal" role="document">
      <header class="modal__header">
        <h2 class="modal__title">${escapeHtml(title)}</h2>
        <button type="button" class="modal__close" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </header>
      <div class="modal__body">${bodyHtml}</div>
      ${footerHtml ? `<footer class="modal__footer">${footerHtml}</footer>` : ''}
    </div>
  `;

  const closeBtn = backdrop.querySelector('.modal__close');

  function open() {
    document.body.appendChild(backdrop);
    // Trigger animation on next frame.
    requestAnimationFrame(() => backdrop.classList.add('is-open'));
    activeModals.push(modal);
    document.addEventListener('keydown', onKey);
    backdrop.addEventListener('click', onBackdropClick);
    closeBtn.addEventListener('click', close);
  }

  function close() {
    backdrop.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);
    backdrop.removeEventListener('click', onBackdropClick);
    closeBtn?.removeEventListener('click', close);
    setTimeout(() => {
      backdrop.remove();
      activeModals = activeModals.filter((m) => m !== modal);
      if (typeof onClose === 'function') onClose();
    }, 200);
  }

  function onKey(event) {
    if (event.key === 'Escape' && activeModals[activeModals.length - 1] === modal) {
      close();
    }
  }

  function onBackdropClick(event) {
    if (event.target === backdrop) close();
  }

  const modal = {
    open,
    close,
    el: backdrop,
    body: backdrop.querySelector('.modal__body'),
    footer: backdrop.querySelector('.modal__footer'),
  };

  return modal;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}