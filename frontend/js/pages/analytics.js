/**
 * analytics.js — Analytics page with Chart.js visualizations.
 *
 * Loads GET /api/analytics and renders:
 *   - Stat cards (Response rate, Interview rate, Offer rate, Avg match)
 *   - Doughnut: status distribution
 *   - Line: applications over time (12 weeks)
 *   - Bar: match score distribution
 *   - Horizontal bar: top companies
 *
 * Handles theme changes — rebuilds charts with correct colors.
 */

import { api } from '../api.js';

/* --------------------------------------------------------------------------
   Theme-aware colors
   -------------------------------------------------------------------------- */
function getThemeColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    text: style.getPropertyValue('--color-text').trim() || '#111827',
    textMuted: style.getPropertyValue('--color-text-muted').trim() || '#6B7280',
    border: style.getPropertyValue('--color-border').trim() || '#E5E7EB',
    accent: style.getPropertyValue('--color-accent').trim() || '#5B5CE2',
    success: style.getPropertyValue('--color-success').trim() || '#16A34A',
    warning: style.getPropertyValue('--color-warning').trim() || '#D97706',
    danger: style.getPropertyValue('--color-danger').trim() || '#DC2626',
  };
}

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

function formatWeek(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* --------------------------------------------------------------------------
   Main render
   -------------------------------------------------------------------------- */
let chartInstances = [];    // keep track of Chart.js instances for destroy()
let lastData = null;

function renderLayout(container, data) {
  const { stats } = data;

  container.innerHTML = `
    <section class="stats-row" aria-label="Key metrics">
      <div class="stat-card stat-card--accent">
        <span class="stat-card__label">Total jobs</span>
        <span class="stat-card__value">${stats.totalJobs}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">Applications</span>
        <span class="stat-card__value">${stats.totalApplications}</span>
      </div>
      <div class="stat-card stat-card--success">
        <span class="stat-card__label">Response rate</span>
        <span class="stat-card__value">${stats.responseRate}%</span>
      </div>
      <div class="stat-card stat-card--warning">
        <span class="stat-card__label">Interview rate</span>
        <span class="stat-card__value">${stats.interviewRate}%</span>
      </div>
      <div class="stat-card stat-card--success">
        <span class="stat-card__label">Offer rate</span>
        <span class="stat-card__value">${stats.offerRate}%</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__label">Avg match</span>
        <span class="stat-card__value">${stats.averageMatchScore !== null ? `${stats.averageMatchScore}%` : '—'}</span>
      </div>
    </section>

    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel__header">
          <h3 class="panel__title">Applications over time</h3>
        </div>
        <div class="chart-wrap">
          <canvas id="chart-over-time"></canvas>
        </div>
      </section>

      <section class="panel">
        <div class="panel__header">
          <h3 class="panel__title">By status</h3>
        </div>
        <div class="chart-wrap chart-wrap--sm">
          <canvas id="chart-status"></canvas>
        </div>
      </section>
    </div>

    <div class="dashboard-grid" style="margin-top: var(--space-6);">
      <section class="panel">
        <div class="panel__header">
          <h3 class="panel__title">Match score distribution</h3>
        </div>
        <div class="chart-wrap">
          <canvas id="chart-match"></canvas>
        </div>
      </section>

      <section class="panel">
        <div class="panel__header">
          <h3 class="panel__title">Top companies</h3>
        </div>
        <div class="chart-wrap">
          <canvas id="chart-companies"></canvas>
        </div>
      </section>
    </div>
  `;
}

/* --------------------------------------------------------------------------
   Charts
   -------------------------------------------------------------------------- */
function destroyCharts() {
  for (const c of chartInstances) {
    try { c.destroy(); } catch { /* ignore */ }
  }
  chartInstances = [];
}

function buildCharts(data) {
  destroyCharts();

  const c = getThemeColors();
  const gridColor = c.border;

  // Common options
  const commonScales = {
    x: {
      ticks: { color: c.textMuted, font: { size: 11 } },
      grid: { color: gridColor },
    },
    y: {
      ticks: { color: c.textMuted, font: { size: 11 } },
      grid: { color: gridColor },
      beginAtZero: true,
    },
  };

  // 1. Over time (line)
  const overTimeCtx = document.getElementById('chart-over-time');
  if (overTimeCtx) {
    const labels = data.overTime.map((w) => formatWeek(w.weekStart));
    const values = data.overTime.map((w) => w.count);

    chartInstances.push(new Chart(overTimeCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Jobs added',
          data: values,
          borderColor: c.accent,
          backgroundColor: 'transparent',
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: c.accent,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: commonScales,
      },
    }));
  }

  // 2. By status (doughnut)
  const statusCtx = document.getElementById('chart-status');
  if (statusCtx) {
    const labels = ['Saved', 'Applied', 'Recruiter', 'Interview', 'Tech task', 'Offer', 'Rejected'];
    const values = [
      data.byStatus.saved,
      data.byStatus.applied,
      data.byStatus.recruiter_contacted,
      data.byStatus.interview,
      data.byStatus.technical_task,
      data.byStatus.offer,
      data.byStatus.rejected,
    ];
    const colors = [
      c.textMuted,       // saved
      c.accent,          // applied
      c.accent,          // recruiter
      c.warning,         // interview
      c.warning,         // tech task
      c.success,         // offer
      c.danger,          // rejected
    ];

    chartInstances.push(new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: c.border,
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: c.text, font: { size: 11 }, boxWidth: 12 },
          },
        },
      },
    }));
  }

  // 3. Match score distribution (bar)
  const matchCtx = document.getElementById('chart-match');
  if (matchCtx) {
    const labels = ['0–25', '25–50', '50–75', '75–100'];
    const values = [
      data.matchDistribution.b0_25,
      data.matchDistribution.b25_50,
      data.matchDistribution.b50_75,
      data.matchDistribution.b75_100,
    ];

    chartInstances.push(new Chart(matchCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Jobs',
          data: values,
          backgroundColor: [c.danger, c.warning, c.warning, c.success],
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: commonScales,
      },
    }));
  }

  // 4. Top companies (horizontal bar)
  const companiesCtx = document.getElementById('chart-companies');
  if (companiesCtx) {
    const labels = data.topCompanies.map((c) => c.company);
    const values = data.topCompanies.map((c) => c.count);

    chartInstances.push(new Chart(companiesCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Jobs',
          data: values,
          backgroundColor: c.accent,
          borderRadius: 6,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: { color: c.textMuted, font: { size: 11 } },
            grid: { color: gridColor },
            beginAtZero: true,
          },
          y: {
            ticks: { color: c.textMuted, font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
    }));
  }
}

/* --------------------------------------------------------------------------
   Empty state
   -------------------------------------------------------------------------- */
function renderEmpty(container) {
  container.innerHTML = `
    <div class="empty-state">
      <p class="empty-state__title">No data yet</p>
      <p class="empty-state__description text-muted">Add some jobs and run AI analyses to see your analytics.</p>
      <a href="job-new.html" class="btn btn--primary">Add job</a>
    </div>
  `;
}

/* --------------------------------------------------------------------------
   Init
   -------------------------------------------------------------------------- */
async function init() {
  const container = document.getElementById('analytics-container');
  if (!container) return;

  try {
    const data = await api.get('/analytics');
    lastData = data;

    if (data.stats.totalJobs === 0) {
      renderEmpty(container);
      return;
    }

    renderLayout(container, data);
    // Wait a tick for canvases to be in DOM.
    requestAnimationFrame(() => buildCharts(data));
  } catch (err) {
    console.error('[analytics] load failed', err);
    container.innerHTML = `
      <div class="alert alert--danger">Failed to load analytics. Please refresh.</div>
    `;
  }
}

/* --------------------------------------------------------------------------
   React to theme changes
   -------------------------------------------------------------------------- */
const themeObserver = new MutationObserver(() => {
  if (lastData) {
    // Rebuild charts with new colors.
    buildCharts(lastData);
  }
});
themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

init();