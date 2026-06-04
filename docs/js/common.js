// ── Season state ────────────────────────────────────────────────────────────

function getSelectedSeasonNums() {
  try {
    const v = localStorage.getItem('hn_seasons_v2');
    if (!v) return null; // null = Lifetime (all)
    const arr = JSON.parse(v);
    if (Array.isArray(arr) && arr.length > 0) return arr.slice().sort((a, b) => a - b);
    return null;
  } catch { return null; }
}

function setSelectedSeasonNums(nums) {
  if (!nums || nums.length === 0) {
    localStorage.removeItem('hn_seasons_v2');
  } else {
    localStorage.setItem('hn_seasons_v2', JSON.stringify(nums.slice().sort((a, b) => a - b)));
  }
}

function getCurrentSeason() {
  const nums = getSelectedSeasonNums();
  if (!nums) return 'Lifetime';
  if (nums.length === 1) return `S${nums[0]}`;
  return nums.map(n => `S${n}`).join('+');
}

function getSeasonLabel() {
  const nums = getSelectedSeasonNums();
  if (!nums) return 'LIFETIME';
  if (nums.length === 1) return `SEASON ${nums[0]}`;
  return nums.map(n => `S${n}`).join(' + ');
}

// True when showing combined data (Lifetime or multi-season pick) → use lifetime labels
function isMultiSeasonView() {
  const nums = getSelectedSeasonNums();
  return !nums || nums.length > 1;
}

function getSeasonData(data) {
  const nums = getSelectedSeasonNums();
  if (!nums) return data.data['Lifetime'];
  if (nums.length === 1) return data.data[`S${nums[0]}`] || data.data['Lifetime'];
  return buildCombinedData(nums.map(n => `S${n}`), data);
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

  const availableNums = data
    ? data.seasons
        .filter(s => /^S\d+$/.test(s))
        .map(s => parseInt(s.slice(1)))
        .sort((a, b) => a - b)
    : [];
  const selectedNums = getSelectedSeasonNums() || [];

  el.innerHTML = `
    <div class="nav-inner">
      <div class="nav-brand">⬡ HALO NITE</div>
      <nav class="nav-links">
        ${NAV_ITEMS.map(n =>
          `<a class="nav-link${n.href === activePage ? ' active' : ''}" href="${n.href}">${n.label}</a>`
        ).join('')}
      </nav>
      <div class="nav-season">
        <div class="season-picker" id="season-picker">
          <button class="season-trigger" id="season-trigger" onclick="toggleSeasonPicker(event)">
            <span id="season-trigger-lbl">${getSeasonLabel()}</span>
            <span class="season-caret">▾</span>
          </button>
          <div class="season-dropdown" id="season-dropdown">
            <div class="season-opts">
              <label class="season-opt">
                <input type="checkbox" class="season-cb" value="0"
                  id="season-cb-all"
                  ${selectedNums.length === 0 ? 'checked' : ''}
                  onchange="handleAllSeasonCheck(this)">
                <span>ALL (LIFETIME)</span>
              </label>
              ${availableNums.map(n => `
                <label class="season-opt">
                  <input type="checkbox" class="season-cb season-cb-num" value="${n}"
                    ${selectedNums.includes(n) ? 'checked' : ''}
                    onchange="handleSeasonCheck(this)">
                  <span>SEASON ${n}</span>
                </label>
              `).join('')}
            </div>
            <button class="season-apply" onclick="applySeasonFilter()">APPLY</button>
          </div>
        </div>
      </div>
    </div>`;

  // Close dropdown when clicking outside
  document.addEventListener('click', closeSeasonPickerOutside, { once: false });
}

function toggleSeasonPicker(e) {
  e.stopPropagation();
  const dd = document.getElementById('season-dropdown');
  if (dd) dd.classList.toggle('open');
}

function closeSeasonPickerOutside(e) {
  const picker = document.getElementById('season-picker');
  if (picker && !picker.contains(e.target)) {
    const dd = document.getElementById('season-dropdown');
    if (dd) dd.classList.remove('open');
  }
}

function handleAllSeasonCheck(cb) {
  if (cb.checked) {
    document.querySelectorAll('.season-cb-num').forEach(el => { el.checked = false; });
  }
}

function handleSeasonCheck(cb) {
  if (cb.checked) {
    const allCb = document.getElementById('season-cb-all');
    if (allCb) allCb.checked = false;
  } else {
    // If nothing checked, revert to All
    const anyChecked = [...document.querySelectorAll('.season-cb-num')].some(el => el.checked);
    if (!anyChecked) {
      const allCb = document.getElementById('season-cb-all');
      if (allCb) allCb.checked = true;
    }
  }
}

function applySeasonFilter() {
  const checked = [...document.querySelectorAll('.season-cb-num:checked')]
    .map(cb => parseInt(cb.value))
    .filter(n => !isNaN(n));
  setSelectedSeasonNums(checked.length > 0 ? checked : null);
  window.location.reload();
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

// ── Client-side multi-season data combination ─────────────────────────────

const _MATCHUP_PAIRS_JS = {
  'Blue vs Red':   ['Blue',  'Red'],
  'Pink vs Green': ['Pink',  'Green'],
  'Gold vs Brown': ['Gold',  'Brown'],
};
const _TEAM_COLORS_JS = {
  Red:'#ff4444', Blue:'#4488ff', Green:'#44dd88',
  Pink:'#ff88cc', Gold:'#ffcc00', Brown:'#cc8855',
};
const _DISPLAY_NAMES_JS = {
  BrundonDru:'Brundo', HDTurkie:'HD', IKEMAN2684:'Ike', walsh696969:'Walsh',
};

function buildCombinedData(seasonKeys, data) {
  let allGames = [];
  for (const key of seasonKeys) {
    const sd = data.data[key];
    if (sd && sd.games) allGames = allGames.concat(sd.games);
  }
  allGames.sort((a, b) => a.game_num_lifetime - b.game_num_lifetime);

  const players = data.players;
  const combineSuicides = seasonKeys.some(k => {
    const n = parseInt(k.replace('S', ''));
    return isNaN(n) || n < 6;
  });

  return {
    season_num: null,
    combine_suicides: combineSuicides,
    summary:       _jsSummary(allGames, players, combineSuicides),
    games:         allGames,
    aggregates:    _jsAggregates(allGames, players, true),
    teams:         _jsTeams(allGames, players, true),
    matchups:      _jsMatchups(allGames),
    maps:          _jsMaps(allGames, players),
    halo_nites:    _jsNites(allGames, players, true),
    records:       _jsRecords(allGames, players, combineSuicides),
    personal_bests:_jsPersonalBests(allGames, players),
  };
}

function _jsSummary(games, players, combineSuicides) {
  const t = { kills:0,assists:0,deaths:0,betrayals:0,suicides:0,
    weapon_kills:0,grenade_kills:0,melee_kills:0,other_kills:0,medals:0,score:0 };
  let totalSecs = 0;
  const mgames = {}, msecs = {};
  for (const g of games) {
    totalSecs += g.seconds_played;
    mgames[g.matchup] = (mgames[g.matchup] || 0) + 1;
    msecs[g.matchup]  = (msecs[g.matchup]  || 0) + g.seconds_played;
    for (const p of players) {
      const ps = g.players[p];
      t.kills += ps.kills; t.assists += ps.assists; t.deaths += ps.deaths;
      t.betrayals += ps.betrayals; t.suicides += ps.suicides;
      t.weapon_kills += ps.weapon_kills; t.grenade_kills += ps.grenade_kills;
      t.melee_kills  += ps.melee_kills;  t.other_kills   += ps.other_kills;
      t.medals += ps.total_medals; t.score += ps.score;
    }
  }
  return {
    total_games:   games.length,
    total_sets:    games.filter(g => g.set_decider).length,
    total_nites:   new Set(games.map(g => g.halonite_num_lifetime)).size,
    total_seconds: totalSecs,
    matchup_games: mgames, matchup_seconds: msecs,
    combine_suicides: combineSuicides,
    ...t,
  };
}

function _jsAggregates(games, players, useLifetime) {
  const agg = {};
  const cum = {}, run = {}, setRun = {};
  const labels = [];

  for (const p of players) {
    agg[p] = { games:0,wins:0,losses:0,kills:0,deaths:0,assists:0,betrayals:0,suicides:0,
      weapon_kills:0,grenade_kills:0,melee_kills:0,other_kills:0,score:0,medals:0,kc:0,qike:0,
      set_wins:0,set_losses:0,best_kills:0,best_kdr:0,best_score:0,
      kills_against:{}, medals_detail:{} };
    cum[p] = { wl_spread:[],set_wl_spread:[],kills:[],deaths:[],assists:[],
      score:[],kd_spread:[],qike:[],weapon_kills:[],grenade_kills:[],melee_kills:[],other_kills:[] };
    run[p] = { wl:0,kills:0,deaths:0,assists:0,score:0,kd:0,qike:0,wk:0,gk:0,mk:0,ok:0 };
    setRun[p] = { spread:0 };
  }

  for (const g of games) {
    labels.push(useLifetime ? g.game_num_lifetime : g.game_num_season);
    const wt = g.winning_team, sw = g.set_winner;

    for (const p of players) {
      const ps = g.players[p];
      const a = agg[p];
      const won = ps.team === wt;
      a.games++;
      a.wins   += won ? 1 : 0;
      a.losses += won ? 0 : 1;
      a.kills += ps.kills; a.deaths += ps.deaths; a.assists += ps.assists;
      a.betrayals += ps.betrayals; a.suicides += ps.suicides;
      a.weapon_kills += ps.weapon_kills; a.grenade_kills += ps.grenade_kills;
      a.melee_kills  += ps.melee_kills;  a.other_kills   += ps.other_kills;
      a.score += ps.score; a.medals += ps.total_medals;
      a.kc += ps.kc; a.qike += ps.qike;
      a.best_kills = Math.max(a.best_kills, ps.kills);
      a.best_kdr   = Math.max(a.best_kdr,   ps.kdr);
      a.best_score = Math.max(a.best_score,  ps.score);
      for (const [suf, cnt] of Object.entries(ps.medals || {}))
        a.medals_detail[suf] = (a.medals_detail[suf] || 0) + cnt;
      for (const [opp, cnt] of Object.entries(ps.kills_against || {}))
        a.kills_against[opp] = (a.kills_against[opp] || 0) + cnt;
      if (g.set_decider && sw) {
        const swWon = ps.team === sw;
        a.set_wins   += swWon ? 1 : 0;
        a.set_losses += swWon ? 0 : 1;
        setRun[p].spread += swWon ? 1 : -1;
      }
      const r = run[p];
      r.wl += won ? 1 : -1; r.kills += ps.kills; r.deaths += ps.deaths;
      r.assists += ps.assists; r.score += ps.score; r.kd += ps.kd_spread;
      r.qike += ps.qike; r.wk += ps.weapon_kills; r.gk += ps.grenade_kills;
      r.mk += ps.melee_kills; r.ok += ps.other_kills;

      const c = cum[p];
      c.wl_spread.push(r.wl); c.set_wl_spread.push(setRun[p].spread);
      c.kills.push(r.kills); c.deaths.push(r.deaths); c.assists.push(r.assists);
      c.score.push(r.score); c.kd_spread.push(r.kd);
      c.qike.push(Math.round(r.qike * 1e4) / 1e4);
      c.weapon_kills.push(r.wk); c.grenade_kills.push(r.gk);
      c.melee_kills.push(r.mk); c.other_kills.push(r.ok);
    }
  }

  const result = {};
  for (const p of players) {
    const a = agg[p], g = a.games || 1, d = a.deaths || 1;
    result[p] = {
      games: a.games, wins: a.wins, losses: a.losses,
      wl_spread: a.wins - a.losses,
      win_pct: Math.round(a.wins / g * 1e3) / 10,
      set_wins: a.set_wins, set_losses: a.set_losses,
      set_wl_spread: a.set_wins - a.set_losses,
      set_win_pct: Math.round(a.set_wins / ((a.set_wins + a.set_losses) || 1) * 1e3) / 10,
      total_kills: a.kills, total_deaths: a.deaths, total_assists: a.assists,
      total_betrayals: a.betrayals, total_suicides: a.suicides,
      total_weapon_kills: a.weapon_kills, total_grenade_kills: a.grenade_kills,
      total_melee_kills:  a.melee_kills,  total_other_kills:   a.other_kills,
      total_score: a.score, total_medals: a.medals,
      total_kc:   Math.round(a.kc   * 100) / 100,
      total_qike: Math.round(a.qike * 1e4) / 1e4,
      kdr:        Math.round(a.kills / d   * 1e3) / 1e3,
      avg_kills:  Math.round(a.kills  / g  * 100) / 100,
      avg_deaths: Math.round(a.deaths / g  * 100) / 100,
      avg_score:  Math.round(a.score  / g  * 100) / 100,
      avg_kc:     Math.round(a.kc     / g  * 100) / 100,
      avg_qike:   Math.round(a.qike   / g  * 1e4) / 1e4,
      kd_spread:  a.kills - a.deaths,
      kcd_spread: Math.round((a.kc - a.deaths) * 100) / 100,
      best_kills: a.best_kills, best_kdr: Math.round(a.best_kdr * 1e3) / 1e3,
      best_score: a.best_score,
      combine_suicides: true,
      medals: a.medals_detail,
      kills_against: a.kills_against,
      cumulative: cum[p], game_labels: labels,
    };
  }
  return result;
}

function _jsTeams(games, players, useLifetime) {
  const acc = {}, cum = {}, run = {};
  const labels = [];

  for (const g of games) {
    labels.push(useLifetime ? g.game_num_lifetime : g.game_num_season);
    const wt = g.winning_team, sw = g.set_winner;

    for (const p of players) {
      const ps = g.players[p];
      const t = ps.team;
      if (!acc[t]) {
        acc[t] = { games:0,wins:0,losses:0,kills:0,deaths:0,assists:0,score:0,
          kc:0,qike:0,weapon_kills:0,grenade_kills:0,melee_kills:0,other_kills:0,
          betrayals:0,suicides:0,set_wins:0,set_losses:0,total_mov:0 };
      }
      const a = acc[t], won = t === wt;
      a.games++; a.wins += won?1:0; a.losses += won?0:1;
      a.kills += ps.kills; a.deaths += ps.deaths; a.assists += ps.assists;
      a.score += ps.score; a.kc += ps.kc; a.qike += ps.qike;
      a.weapon_kills += ps.weapon_kills; a.grenade_kills += ps.grenade_kills;
      a.melee_kills  += ps.melee_kills;  a.other_kills   += ps.other_kills;
      a.betrayals += ps.betrayals; a.suicides += ps.suicides;
      if (won) a.total_mov += g.mov;
      if (g.set_decider && sw) {
        a.set_wins   += t === sw ? 1 : 0;
        a.set_losses += t === sw ? 0 : 1;
      }
      if (!cum[t]) { cum[t] = { wl_spread:[],set_wl_spread:[],qike:[] }; run[t] = {wl:0,qike:0,set_wl:0}; }
      run[t].wl   += won ? 1 : -1;
      run[t].qike += ps.qike;
      run[t].set_wl += (g.set_decider && sw) ? (t === sw ? 1 : -1) : 0;
    }
    for (const t of Object.keys(cum)) {
      cum[t].wl_spread.push(Math.floor(run[t].wl / 2));
      cum[t].set_wl_spread.push(Math.floor(run[t].set_wl / 2));
      cum[t].qike.push(Math.round(run[t].qike * 1e4) / 1e4);
    }
  }

  const result = {};
  for (const [t, a] of Object.entries(acc)) {
    const gc = Math.floor(a.games / 2) || 1;
    const wins = Math.floor(a.wins / 2), losses = Math.floor(a.losses / 2);
    const d = a.deaths || 1;
    const sw_ = Math.floor(a.set_wins / 2), sl_ = Math.floor(a.set_losses / 2);
    result[t] = {
      color: _TEAM_COLORS_JS[t] || '#aaa',
      games: gc, wins, losses,
      wl_spread: wins - losses,
      win_pct: Math.round(wins / gc * 1e3) / 10,
      set_wins: sw_, set_losses: sl_,
      set_wl_spread: sw_ - sl_,
      set_win_pct: Math.round(sw_ / ((sw_ + sl_) || 1) * 1e3) / 10,
      total_kills: a.kills, total_deaths: a.deaths, total_assists: a.assists,
      total_score: a.score,
      total_kc:   Math.round(a.kc   * 100) / 100,
      total_qike: Math.round(a.qike * 1e4) / 1e4,
      kdr:        Math.round(a.kills / d * 1e3) / 1e3,
      kd_spread:  a.kills - a.deaths,
      avg_kills:  Math.round(a.kills  / gc * 100) / 100,
      avg_deaths: Math.round(a.deaths / gc * 100) / 100,
      avg_score:  Math.round(a.score  / gc * 100) / 100,
      avg_qike:   Math.round(a.qike   / (a.games || 1) * 1e4) / 1e4,
      avg_mov:    Math.round(a.total_mov / (a.wins || 1) * 100) / 100,
      weapon_kills: a.weapon_kills, grenade_kills: a.grenade_kills,
      melee_kills:  a.melee_kills,  other_kills:   a.other_kills,
      betrayals: a.betrayals, suicides: a.suicides,
      cumulative: cum[t] || {}, game_labels: labels,
    };
  }
  return result;
}

function _jsMatchups(games) {
  const acc = {};
  for (const g of games) {
    const m = g.matchup;
    if (!acc[m]) acc[m] = { games:0,seconds:0,a_wins:0,b_wins:0,a_set_wins:0,b_set_wins:0 };
    const a = acc[m];
    a.games++; a.seconds += g.seconds_played;
    const [ta, tb] = _MATCHUP_PAIRS_JS[m] || ['', ''];
    if (g.winning_team === ta) a.a_wins++;
    else if (g.winning_team === tb) a.b_wins++;
    if (g.set_decider && g.set_winner) {
      if (g.set_winner === ta) a.a_set_wins++;
      else if (g.set_winner === tb) a.b_set_wins++;
    }
  }
  const result = {};
  for (const [m, a] of Object.entries(acc)) {
    const [ta, tb] = _MATCHUP_PAIRS_JS[m] || ['', ''];
    const g = a.games || 1;
    result[m] = { team_a:ta, team_b:tb, games:a.games, seconds:a.seconds,
      a_wins:a.a_wins, b_wins:a.b_wins, a_set_wins:a.a_set_wins, b_set_wins:a.b_set_wins,
      a_win_pct: Math.round(a.a_wins / g * 1e3) / 10,
      b_win_pct: Math.round(a.b_wins / g * 1e3) / 10 };
  }
  return result;
}

function _jsMaps(games, players) {
  const acc = {}, pk = {}, ps_ = {}, pg = {}, pw = {};
  const tw = {}, tg = {}, mug = {}, muw = {};

  for (const g of games) {
    const mn = g.map;
    if (!mn || mn === 'Unknown') continue;
    if (!acc[mn]) {
      acc[mn] = { games:0,seconds:0,mov_sum:0,kills:0,assists:0,deaths:0,
        weapon_kills:0,grenade_kills:0,melee_kills:0,other_kills:0,betrayals:0,suicides:0 };
      pk[mn]={}; ps_[mn]={}; pg[mn]={}; pw[mn]={};
      tw[mn]={}; tg[mn]={}; mug[mn]={}; muw[mn]={};
    }
    const a = acc[mn];
    a.games++; a.seconds += g.seconds_played; a.mov_sum += g.mov;
    const wt = g.winning_team, lt = g.losing_team, mu = g.matchup;
    tw[mn][wt] = (tw[mn][wt] || 0) + 1;
    tg[mn][wt] = (tg[mn][wt] || 0) + 1;
    tg[mn][lt] = (tg[mn][lt] || 0) + 1;
    mug[mn][mu] = (mug[mn][mu] || 0) + 1;
    if (!muw[mn][mu]) muw[mn][mu] = {};
    muw[mn][mu][wt] = (muw[mn][mu][wt] || 0) + 1;

    for (const p of players) {
      const pps = g.players[p];
      a.kills += pps.kills; a.assists += pps.assists; a.deaths += pps.deaths;
      a.weapon_kills += pps.weapon_kills; a.grenade_kills += pps.grenade_kills;
      a.melee_kills  += pps.melee_kills;  a.other_kills   += pps.other_kills;
      a.betrayals += pps.betrayals; a.suicides += pps.suicides;
      pk[mn][p]  = (pk[mn][p]  || 0) + pps.kills;
      ps_[mn][p] = (ps_[mn][p] || 0) + pps.score;
      pg[mn][p]  = (pg[mn][p]  || 0) + 1;
      pw[mn][p]  = (pw[mn][p]  || 0) + (pps.team === wt ? 1 : 0);
    }
  }

  const result = {};
  for (const mn of Object.keys(acc).sort()) {
    const a = acc[mn], g = a.games || 1, n = players.length, tk = a.kills || 1;
    const pal = {}, pas = {}, pwp = {};
    for (const p of players) {
      const pgg = pg[mn][p] || 1;
      pal[p] = Math.round((pk[mn][p]  || 0) / pgg * 100) / 100;
      pas[p] = Math.round((ps_[mn][p] || 0) / pgg * 100) / 100;
      pwp[p] = Math.round((pw[mn][p]  || 0) / pgg * 1e3) / 10;
    }
    const twp = {};
    for (const t of Object.keys(tg[mn]))
      twp[t] = Math.round((tw[mn][t] || 0) / (tg[mn][t] || 1) * 1e3) / 10;
    const mub = {};
    for (const [mun, gc] of Object.entries(mug[mn])) {
      const [ta, tb] = _MATCHUP_PAIRS_JS[mun] || ['',''];
      mub[mun] = { games:gc,
        a_wins: (muw[mn][mun]||{})[ta]||0, b_wins: (muw[mn][mun]||{})[tb]||0,
        a_win_pct: Math.round(((muw[mn][mun]||{})[ta]||0)/(gc||1)*1e3)/10,
        b_win_pct: Math.round(((muw[mn][mun]||{})[tb]||0)/(gc||1)*1e3)/10 };
    }
    result[mn] = {
      games: g, avg_mov: Math.round(a.mov_sum/g*10)/10,
      avg_seconds: Math.round(a.seconds/g),
      avg_kills_per_player:  Math.round(a.kills /g/n*100)/100,
      avg_deaths_per_player: Math.round(a.deaths/g/n*100)/100,
      avg_assists_pct:    Math.round(a.assists/tk*1e3)/10,
      avg_betray_suicide: Math.round((a.betrayals+a.suicides)/g*100)/100,
      weapon_pct:  Math.round(a.weapon_kills /tk*1e3)/10,
      grenade_pct: Math.round(a.grenade_kills/tk*1e3)/10,
      melee_pct:   Math.round(a.melee_kills  /tk*1e3)/10,
      other_pct:   Math.round(a.other_kills  /tk*1e3)/10,
      player_avg_kills:pal, player_avg_score:pas, player_win_pct:pwp,
      team_win_pct:twp, mu_breakdown:mub,
      top_player: players.reduce((b,p) => pal[p] > pal[b] ? p : b, players[0]),
    };
  }
  return result;
}

function _jsNites(games, players, useLifetime) {
  const niteMap = {};
  for (const g of games) {
    const key = useLifetime ? g.halonite_num_lifetime : g.halonite_num;
    if (!niteMap[key]) niteMap[key] = [];
    niteMap[key].push(g);
  }
  const result = [];
  for (const niteNum of Object.keys(niteMap).map(Number).sort((a,b)=>a-b)) {
    const ng = niteMap[niteNum];
    const st = {};
    for (const p of players)
      st[p] = { games:0,kills:0,deaths:0,assists:0,score:0,kc:0,kd_spread:0,kcd_spread:0,qike:0,
        weapon_kills:0,grenade_kills:0,melee_kills:0,other_kills:0,medals:0,betrayals:0,suicides:0,
        wins:0,losses:0,set_wins:0,set_losses:0 };
    const gl = [];
    for (const g of ng) {
      gl.push({ game_num_season:g.game_num_season, game_num_nite:g.game_num_nite,
        map:g.map, matchup:g.matchup, winning_team:g.winning_team, seconds_played:g.seconds_played });
      const wt = g.winning_team, sw = g.set_winner;
      for (const p of players) {
        const ps = g.players[p], s = st[p];
        s.games++; s.kills+=ps.kills; s.deaths+=ps.deaths; s.assists+=ps.assists;
        s.score+=ps.score; s.kc+=ps.kc; s.kd_spread+=ps.kd_spread; s.kcd_spread+=ps.kcd_spread;
        s.qike+=ps.qike; s.weapon_kills+=ps.weapon_kills; s.grenade_kills+=ps.grenade_kills;
        s.melee_kills+=ps.melee_kills; s.other_kills+=ps.other_kills;
        s.medals+=ps.total_medals; s.betrayals+=ps.betrayals; s.suicides+=ps.suicides;
        s.wins  += ps.team===wt ? 1 : 0;
        s.losses += ps.team!==wt ? 1 : 0;
        if (g.set_decider && sw) {
          s.set_wins  += ps.team===sw ? 1 : 0;
          s.set_losses += ps.team!==sw ? 1 : 0;
        }
      }
    }
    const ps2 = {};
    for (const p of players) {
      const s = st[p], gn = s.games || 1;
      ps2[p] = { games:s.games, wins:s.wins, losses:s.losses,
        wl_spread:s.wins-s.losses, win_pct:Math.round(s.wins/gn*1e3)/10,
        set_wins:s.set_wins, set_losses:s.set_losses,
        score:s.score, kills:s.kills, deaths:s.deaths, assists:s.assists,
        kd_spread:s.kd_spread, kc:Math.round(s.kc*100)/100,
        kcd_spread:Math.round(s.kcd_spread*100)/100,
        avg_qike:Math.round(s.qike/gn*1e4)/1e4,
        weapon_kills:s.weapon_kills, grenade_kills:s.grenade_kills,
        melee_kills:s.melee_kills, other_kills:s.other_kills,
        medals:s.medals, betrayals:s.betrayals, suicides:s.suicides,
        combine_suicides:true };
    }
    result.push({ nite_num:niteNum, game_count:ng.length, game_log:gl, player_stats:ps2 });
  }
  return result;
}

function _jsRecords(games, players, combineSuicides) {
  const mk = (min) => ({ val: min ? Infinity : -Infinity, instances: [] });
  const chk = (tr, val, info, min) => {
    if (val == null) return;
    if (min ? val < tr.val : val > tr.val) { tr.val = val; tr.instances = [info]; }
    else if (val === tr.val) tr.instances.push(info);
  };
  const fin = t => ({ value: isFinite(t.val) ? t.val : null, instances: t.instances });

  const pp = { most_points:mk(0),most_kills:mk(0),most_assists:mk(0),fewest_deaths:mk(1),
    most_weapon_kills:mk(0),most_grenade_kills:mk(0),most_melee_kills:mk(0),most_other_kills:mk(0),
    greatest_spread:mk(0),longest_spree:mk(0) };
  const pn = { fewest_points:mk(1),fewest_kills:mk(1),most_deaths:mk(0),lowest_spread:mk(1),
    most_betrayals:mk(0),most_suicides:mk(0),most_betray_suicide:mk(0) };
  const tp = { most_kills:mk(0),most_assists:mk(0),fewest_deaths:mk(1),greatest_spread:mk(0) };
  const tn = { fewest_points:mk(1),fewest_kills:mk(1),most_deaths:mk(0),lowest_spread:mk(1) };

  for (const g of games) {
    const ib = { game_num_season:g.game_num_season, halonite_num:g.halonite_num,
      season:g.season, map:g.map, matchup:g.matchup };
    for (const p of players) {
      const ps = g.players[p];
      const info = { ...ib, player:p, display:_DISPLAY_NAMES_JS[p]||p };
      const sb = ps.betrayals + ps.suicides;
      chk(pp.most_points,       ps.score,             info, 0);
      chk(pp.most_kills,        ps.kills,             info, 0);
      chk(pp.most_assists,      ps.assists,           info, 0);
      chk(pp.fewest_deaths,     ps.deaths,            info, 1);
      chk(pp.most_weapon_kills, ps.weapon_kills,      info, 0);
      chk(pp.most_grenade_kills,ps.grenade_kills,     info, 0);
      chk(pp.most_melee_kills,  ps.melee_kills,       info, 0);
      chk(pp.most_other_kills,  ps.other_kills,       info, 0);
      chk(pp.greatest_spread,   ps.kd_spread,         info, 0);
      chk(pp.longest_spree,     ps.most_kills_in_row, info, 0);
      chk(pn.fewest_points, ps.score,     info, 1);
      chk(pn.fewest_kills,  ps.kills,     info, 1);
      chk(pn.most_deaths,   ps.deaths,    info, 0);
      chk(pn.lowest_spread, ps.kd_spread, info, 1);
      if (combineSuicides) chk(pn.most_betray_suicide, sb, info, 0);
      else { chk(pn.most_betrayals, ps.betrayals, info, 0); chk(pn.most_suicides, ps.suicides, info, 0); }
    }
    for (const [tn_, tm] of Object.entries(g.teams)) {
      const spread = tm.kills - tm.deaths;
      const ti = { ...ib, team:tn_ };
      chk(tp.most_kills,      tm.kills,  ti, 0); chk(tp.most_assists,  tm.assists, ti, 0);
      chk(tp.fewest_deaths,   tm.deaths, ti, 1); chk(tp.greatest_spread, spread,   ti, 0);
      chk(tn.fewest_points,   tm.score,  ti, 1); chk(tn.fewest_kills,    tm.kills, ti, 1);
      chk(tn.most_deaths,     tm.deaths, ti, 0); chk(tn.lowest_spread,   spread,   ti, 1);
    }
  }
  return {
    player_positive: Object.fromEntries(Object.entries(pp).map(([k,v])=>[k,fin(v)])),
    player_negative: Object.fromEntries(Object.entries(pn).map(([k,v])=>[k,fin(v)])),
    team_positive:   Object.fromEntries(Object.entries(tp).map(([k,v])=>[k,fin(v)])),
    team_negative:   Object.fromEntries(Object.entries(tn).map(([k,v])=>[k,fin(v)])),
    combine_suicides: combineSuicides,
  };
}

function _jsPersonalBests(games, players) {
  const cats = { most_kills:{f:'kills',min:0}, most_points:{f:'score',min:0},
    most_assists:{f:'assists',min:0}, best_kdr:{f:'kdr',min:0},
    best_spread:{f:'kd_spread',min:0}, fewest_deaths:{f:'deaths',min:1} };
  const bests = {};
  for (const p of players) { bests[p] = {}; for (const k of Object.keys(cats)) bests[p][k]={val:null,instances:[]}; }
  for (const g of games) {
    for (const p of players) {
      const ps = g.players[p];
      const info = { player:p, display:_DISPLAY_NAMES_JS[p]||p,
        game_num_season:g.game_num_season, halonite_num:g.halonite_num,
        season:g.season, map:g.map, matchup:g.matchup };
      for (const [cat, {f, min}] of Object.entries(cats)) {
        const val = ps[f];
        if (val == null) continue;
        const b = bests[p][cat], entry = {...info, value:val};
        if (b.val===null) { b.val=val; b.instances=[entry]; }
        else if (min ? val<b.val : val>b.val) { b.val=val; b.instances=[entry]; }
        else if (val===b.val) b.instances.push(entry);
      }
    }
  }
  return bests;
}
