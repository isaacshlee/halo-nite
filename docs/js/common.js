// Player color palette — consistent across all charts
const PLAYER_COLORS = {
  'BrundonDru':  '#00e5ff',
  'HDTurkie':    '#ff6b6b',
  'IKEMAN2684':  '#ffd93d',
  'walsh696969': '#6bcb77',
};

// Nav definition
const NAV_ITEMS = [
  { label: 'OVERVIEW', href: 'index.html' },
  { label: 'PLAYERS',  href: 'players.html' },
  { label: 'GAMES',    href: 'games.html' },
  { label: 'TEAMS',    href: 'teams.html' },
  { label: 'MAPS',     href: 'maps.html' },
  { label: 'RECORDS',  href: 'records.html' },
];

function renderNav(activePage) {
  const el = document.getElementById('nav');
  if (!el) return;
  el.innerHTML = `
    <div class="nav-inner">
      <div class="nav-brand"><span class="hex">⬡</span> HALO NITE S6</div>
      <nav class="nav-links">
        ${NAV_ITEMS.map(n => `
          <a class="nav-link${n.href === activePage ? ' active' : ''}" href="${n.href}">${n.label}</a>
        `).join('')}
      </nav>
    </div>`;
}

function dn(gamertag, data) {
  return (data && data.display_names && data.display_names[gamertag]) || gamertag;
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

function playerDot(gamertag) {
  const c = PLAYER_COLORS[gamertag] || '#aaa';
  return `<span class="player-dot" style="background:${c};box-shadow:0 0 5px ${c}"></span>`;
}

function teamBadge(team, color) {
  return `<span class="team-badge" style="color:${color};border-color:${color}44;background:${color}14">${team}</span>`;
}

function fmtKdr(v) {
  return parseFloat(v).toFixed(2);
}

function sectionHdr(label) {
  return `<div class="section-hdr"><div class="hex"></div><span>${label}</span></div>`;
}

// Thin Chart.js wrapper — returns Chart instance
function makeChart(canvasId, type, labels, datasets, opts = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  const defaults = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        labels: { color: '#7aacba', font: { family: 'Share Tech Mono', size: 11 }, boxWidth: 12 },
      },
      tooltip: {
        backgroundColor: '#0a1418',
        borderColor: '#1a3a44',
        borderWidth: 1,
        titleColor: '#00e5ff',
        bodyColor: '#c8eef5',
        titleFont: { family: 'Share Tech Mono' },
        bodyFont: { family: 'Share Tech Mono' },
      },
    },
    scales: type === 'bar' || type === 'line' ? {
      x: {
        ticks: { color: '#3a7080', font: { family: 'Share Tech Mono', size: 10 } },
        grid: { color: 'rgba(26,58,68,.5)' },
      },
      y: {
        ticks: { color: '#3a7080', font: { family: 'Share Tech Mono', size: 10 } },
        grid: { color: 'rgba(26,58,68,.5)' },
      },
    } : {},
  };
  return new Chart(ctx, {
    type,
    data: { labels, datasets },
    options: { ...defaults, ...opts },
  });
}
