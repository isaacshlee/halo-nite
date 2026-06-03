// ── Season selector ────────────────────────────────────────────────────────
function getCurrentSeason() {
  return localStorage.getItem('hn_season') || 'Lifetime';
}

function setCurrentSeason(s) {
  localStorage.setItem('hn_season', s);
  window.dispatchEvent(new CustomEvent('seasonchange', { detail: s }));
}

function getSeasonData(data) {
  const s = getCurrentSeason();
  return data.data[s] || data.data['Lifetime'];
}

// ── Nav ────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'OVERVIEW', href: 'index.html' },
  { label: 'PLAYERS',  href: 'players.html' },
  { label: 'TEAMS',    href: 'teams.html' },
  { label: 'GAMES',    href: 'games.html' },
  { label: 'NITES',    href: 'nites.html' },
  { label: 'MAPS',     href: 'maps.html' },
  { label: 'RECORDS',  href: 'records.html' },
];

function renderNav(activePage, data) {
  const el = document.getElementById('nav');
  if (!el) return;
  const seasons = data ? data.seasons : ['Lifetime'];
  const cur = getCurrentSeason();
  el.innerHTML = `
    <div class="nav-inner">
      <div class="nav-brand">⬡ HALO NITE</div>
      <nav class="nav-links">
        ${NAV_ITEMS.map(n =>
          `<a class="nav-link${n.href === activePage ? ' active' : ''}" href="${n.href}">${n.label}</a>`
        ).join('')}
      </nav>
      <div class="nav-season">
        <label>SEASON</label>
        <select id="season-sel" onchange="setCurrentSeason(this.value);window.location.reload()">
          ${seasons.map(s => `<option value="${s}"${s === cur ? ' selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
    </div>`;
}

// ── Display helpers ────────────────────────────────────────────────────────
function dn(gamertag, data) {
  return (data && data.display_names && data.display_names[gamertag]) || gamertag;
}

function pc(gamertag, data) {
  return (data && data.player_colors && data.player_colors[gamertag]) || '#00e5ff';
}

function teamColor(teamName, data) {
  return (data && data.team_colors && data.team_colors[teamName]) || '#aaaaaa';
}

function loadStats() {
  return fetch('data/stats.json').then(r => {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  });
}

function playerDot(gamertag, data) {
  const c = pc(gamertag, data);
  return `<span class="player-dot" style="background:${c};box-shadow:0 0 4px ${c}"></span>`;
}

function teamBadge(team, color) {
  return `<span class="team-badge" style="color:${color};border-color:${color}55;background:${color}14">${team}</span>`;
}

function fmtKdr(v) { return parseFloat(v || 0).toFixed(2); }
function fmtPct(v) { return parseFloat(v || 0).toFixed(1) + '%'; }
function fmtTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function sectionHdr(label) {
  return `<div class="section-hdr"><div class="hex"></div><span>${label}</span></div>`;
}

// ── Chart.js helpers ───────────────────────────────────────────────────────
const CHART_DEFAULTS = {
  plugins: {
    legend: { labels: { color: '#7aacba', font: { family: 'Share Tech Mono', size: 13 }, boxWidth: 12 } },
    tooltip: {
      backgroundColor: '#0a1418', borderColor: '#1a3a44', borderWidth: 1,
      titleColor: '#00e5ff', bodyColor: '#c8eef5',
      titleFont: { family: 'Share Tech Mono', size: 14 },
      bodyFont:  { family: 'Share Tech Mono', size: 13 },
    },
  },
  scales: {
    x: { ticks: { color: '#3a7080', font: { family: 'Share Tech Mono', size: 12 } }, grid: { color: 'rgba(26,58,68,.45)' } },
    y: { ticks: { color: '#3a7080', font: { family: 'Share Tech Mono', size: 12 } }, grid: { color: 'rgba(26,58,68,.45)' } },
  },
};

function makeChart(canvasId, type, labels, datasets, extra = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  const isXY = ['bar','line'].includes(type);
  return new Chart(ctx, {
    type,
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: true,
      ...CHART_DEFAULTS,
      scales: isXY ? CHART_DEFAULTS.scales : {},
      ...extra,
    },
  });
}

function makePie(canvasId, labels, values, colors, extra = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  return new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor: colors,
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#7aacba', font: { family: 'Share Tech Mono', size: 12 }, boxWidth: 12 } },
        tooltip: CHART_DEFAULTS.plugins.tooltip,
      },
      ...extra,
    },
  });
}

// cumulative line chart helper (all 4 players, same y-key)
function makeCumChart(canvasId, data, sd, key, label, skipZero = false) {
  const players = data.players;
  const labels = sd.aggregates[players[0]].game_labels;
  const datasets = players.map(p => ({
    label: dn(p, data),
    data: sd.aggregates[p].cumulative[key],
    borderColor: pc(p, data),
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    pointRadius: 0,
    pointHoverRadius: 4,
    tension: 0.3,
  }));
  return makeChart(canvasId, 'line', labels, datasets, {
    plugins: { legend: { position: 'top', ...CHART_DEFAULTS.plugins.legend } },
  });
}
