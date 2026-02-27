/* =========================================
   PRO DATA LAYER — pro.js
   Roster · Stats · Standings · History
   ========================================= */

// ── Storage helpers ───────────────────────
const DB = {
  get: k => { try { return JSON.parse(localStorage.getItem('pro_' + k)); } catch { return null; } },
  set: (k, v) => localStorage.setItem('pro_' + k, JSON.stringify(v)),
};

// ── Data ─────────────────────────────────
let proRoster   = DB.get('roster')   || { home: [], away: [] };   // players per side
let proStats    = DB.get('stats')    || { home: {}, away: {} };   // playerId → stat obj
let proStandings = DB.get('standings') || [];                     // array of team records
let proHistory  = DB.get('history')  || [];                       // saved games
let currentGameId = null;

// Active tab inside admin
let activeTab = 'scoreboard';

// Player stat template
function blankStats() {
  return { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0, min: 0 };
}

// ── ID generator ─────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ─────────────────────────────────────────
// TAB SYSTEM
// ─────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
  if (tab === 'roster')     renderRoster();
  if (tab === 'stats')      renderStatsTab();
  if (tab === 'standings')  renderStandings();
  if (tab === 'history')    renderHistory();
}

// ─────────────────────────────────────────
// ROSTER TAB
// ─────────────────────────────────────────
const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C', '-'];

function saveRoster() { DB.set('roster', proRoster); }

function addPlayer(side) {
  const numInput  = document.getElementById(side + 'PlayerNum');
  const nameInput = document.getElementById(side + 'PlayerName');
  const posSelect = document.getElementById(side + 'PlayerPos');
  const num  = numInput.value.trim();
  const name = nameInput.value.trim();
  const pos  = posSelect.value;
  if (!name) { nameInput.focus(); return; }
  const player = { id: uid(), num: num || '?', name, pos };
  proRoster[side].push(player);
  if (!proStats[side][player.id]) proStats[side][player.id] = blankStats();
  saveRoster();
  DB.set('stats', proStats);
  numInput.value = '';
  nameInput.value = '';
  posSelect.value = 'PG';
  renderRoster();
}

function removePlayer(side, id) {
  proRoster[side] = proRoster[side].filter(p => p.id !== id);
  saveRoster();
  renderRoster();
  if (activeTab === 'stats') renderStatsTab();
}

function renderRoster() {
  ['home', 'away'].forEach(side => {
    const teamName = document.getElementById(side + 'Name')?.value || (side === 'home' ? 'HOME' : 'AWAY');
    const titleEl = document.getElementById(side + 'RosterTitle');
    if (titleEl) titleEl.textContent = teamName;

    const list = document.getElementById(side + 'RosterList');
    if (!list) return;
    list.innerHTML = '';
    if (proRoster[side].length === 0) {
      list.innerHTML = '<div class="roster-empty">No players yet. Add one above.</div>';
      return;
    }
    proRoster[side].forEach(p => {
      const row = document.createElement('div');
      row.className = 'roster-row';
      row.innerHTML = `
        <span class="roster-num">#${p.num}</span>
        <span class="roster-pos">${p.pos}</span>
        <span class="roster-name">${p.name}</span>
        <button class="roster-del" onclick="removePlayer('${side}','${p.id}')" title="Remove">&#10005;</button>
      `;
      list.appendChild(row);
    });
  });
}

// ─────────────────────────────────────────
// STATS TAB — live tap-to-record
// ─────────────────────────────────────────
let selectedPlayer = null; // { side, id }

function renderStatsTab() {
  ['home', 'away'].forEach(side => {
    const teamName = document.getElementById(side + 'Name')?.value || (side === 'home' ? 'HOME' : 'AWAY');
    const title = document.getElementById(side + 'StatsTitle');
    if (title) title.textContent = teamName;

    const list = document.getElementById(side + 'StatsList');
    if (!list) return;
    list.innerHTML = '';

    if (proRoster[side].length === 0) {
      list.innerHTML = '<div class="roster-empty">Add players in the Roster tab first.</div>';
      return;
    }

    proRoster[side].forEach(p => {
      const s = proStats[side][p.id] || blankStats();
      const isSelected = selectedPlayer && selectedPlayer.side === side && selectedPlayer.id === p.id;
      const row = document.createElement('div');
      row.className = 'stats-player-row' + (isSelected ? ' selected' : '');
      row.onclick = () => selectPlayer(side, p.id);
      row.innerHTML = `
        <div class="stats-player-info">
          <span class="stats-num">#${p.num}</span>
          <span class="stats-name">${p.name}</span>
          <span class="stats-pos">${p.pos}</span>
        </div>
        <div class="stats-nums">
          <span class="stat-chip pts">${s.pts}<em>PTS</em></span>
          <span class="stat-chip reb">${s.reb}<em>REB</em></span>
          <span class="stat-chip ast">${s.ast}<em>AST</em></span>
          <span class="stat-chip stl">${s.stl}<em>STL</em></span>
          <span class="stat-chip blk">${s.blk}<em>BLK</em></span>
          <span class="stat-chip to">${s.to}<em>TO</em></span>
          <span class="stat-chip pf">${s.pf}<em>PF</em></span>
        </div>
      `;
      list.appendChild(row);
    });
  });

  updateStatButtons();
}

function selectPlayer(side, id) {
  if (selectedPlayer && selectedPlayer.side === side && selectedPlayer.id === id) {
    selectedPlayer = null;
  } else {
    selectedPlayer = { side, id };
  }
  renderStatsTab();
}

function updateStatButtons() {
  const panel = document.getElementById('statBtnPanel');
  if (!panel) return;
  if (!selectedPlayer) {
    panel.classList.remove('visible');
    return;
  }
  const p = proRoster[selectedPlayer.side].find(x => x.id === selectedPlayer.id);
  if (!p) { panel.classList.remove('visible'); return; }
  const teamName = document.getElementById(selectedPlayer.side + 'Name')?.value || selectedPlayer.side.toUpperCase();
  document.getElementById('statPlayerLabel').textContent = '#' + p.num + ' ' + p.name + ' · ' + teamName;
  panel.classList.add('visible');
}

function recordStat(stat, delta) {
  if (!selectedPlayer) return;
  const { side, id } = selectedPlayer;
  if (!proStats[side][id]) proStats[side][id] = blankStats();
  proStats[side][id][stat] = Math.max(0, (proStats[side][id][stat] || 0) + delta);
  DB.set('stats', proStats);
  renderStatsTab();

  // Flash feedback
  const panel = document.getElementById('statBtnPanel');
  panel.classList.add('flash-stat');
  setTimeout(() => panel.classList.remove('flash-stat'), 180);
}

function resetGameStats() {
  if (!confirm('Reset all player stats for this game?')) return;
  proStats = { home: {}, away: {} };
  proRoster.home.forEach(p => proStats.home[p.id] = blankStats());
  proRoster.away.forEach(p => proStats.away[p.id] = blankStats());
  DB.set('stats', proStats);
  selectedPlayer = null;
  renderStatsTab();
}

// ─────────────────────────────────────────
// SAVE GAME → History + Standings
// ─────────────────────────────────────────
function saveGame() {
  const homeName = document.getElementById('homeName')?.value || 'HOME';
  const awayName = document.getElementById('awayName')?.value || 'AWAY';
  const homeScoreVal = parseInt(document.getElementById('homeScore')?.textContent) || 0;
  const awayScoreVal = parseInt(document.getElementById('awayScore')?.textContent) || 0;

  if (homeScoreVal === 0 && awayScoreVal === 0) {
    alert('Start the game first before saving!'); return;
  }
  if (!confirm('Save this game result to history and standings?')) return;

  const gameId = uid();
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Build box score snapshot
  const boxScore = {
    home: proRoster.home.map(p => ({ ...p, stats: { ...(proStats.home[p.id] || blankStats()) } })),
    away: proRoster.away.map(p => ({ ...p, stats: { ...(proStats.away[p.id] || blankStats()) } })),
  };

  const game = {
    id: gameId,
    date,
    homeName, awayName,
    homeScore: homeScoreVal,
    awayScore: awayScoreVal,
    boxScore,
    leagueName,
  };
  proHistory.unshift(game);
  DB.set('history', proHistory);

  // Update standings
  updateStandings(homeName, homeScoreVal, awayName, awayScoreVal);

  alert('Game saved! ✓');
  renderHistory();
  renderStandings();
}

function updateStandings(homeName, homeScore, awayName, awayScore) {
  function getOrCreate(name) {
    let t = proStandings.find(x => x.name === name);
    if (!t) { t = { name, w: 0, l: 0, pf: 0, pa: 0, streak: 'W0', streakType: null, streakCount: 0 }; proStandings.push(t); }
    return t;
  }
  const home = getOrCreate(homeName);
  const away = getOrCreate(awayName);
  const homeWin = homeScore > awayScore;

  home.pf += homeScore; home.pa += awayScore;
  away.pf += awayScore; away.pa += homeScore;

  if (homeWin) {
    home.w++; away.l++;
    home.streakType === 'W' ? home.streakCount++ : (home.streakType = 'W', home.streakCount = 1);
    away.streakType === 'L' ? away.streakCount++ : (away.streakType = 'L', away.streakCount = 1);
  } else {
    away.w++; home.l++;
    away.streakType === 'W' ? away.streakCount++ : (away.streakType = 'W', away.streakCount = 1);
    home.streakType === 'L' ? home.streakCount++ : (home.streakType = 'L', home.streakCount = 1);
  }
  home.streak = (home.streakType || 'W') + home.streakCount;
  away.streak = (away.streakType || 'W') + away.streakCount;

  proStandings.sort((a, b) => {
    const wpA = a.w / (a.w + a.l || 1);
    const wpB = b.w / (b.w + b.l || 1);
    return wpB - wpA || (b.pf - b.pa) - (a.pf - a.pa);
  });
  DB.set('standings', proStandings);
}

// ─────────────────────────────────────────
// STANDINGS TAB
// ─────────────────────────────────────────
function renderStandings() {
  const tbody = document.getElementById('standingsBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (proStandings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="standings-empty">No games saved yet. Save a game result to populate standings.</td></tr>';
    return;
  }

  // Calculate games behind leader
  const leader = proStandings[0];
  const leaderGP = leader.w + leader.l;

  proStandings.forEach((t, i) => {
    const gp = t.w + t.l;
    const wp = gp ? (t.w / gp * 100).toFixed(1) : '0.0';
    const diff = t.pf - t.pa;
    const gb = i === 0 ? '—' : (((leader.w - leader.l) - (t.w - t.l)) / 2).toFixed(1);
    const strClass = t.streakType === 'W' ? 'streak-w' : 'streak-l';
    const tr = document.createElement('tr');
    tr.className = i === 0 ? 'standings-leader' : '';
    tr.innerHTML = `
      <td class="rank">${i + 1}</td>
      <td class="team-name-cell">${t.name}</td>
      <td>${t.w}</td>
      <td>${t.l}</td>
      <td>${wp}%</td>
      <td>${gb}</td>
      <td class="${diff >= 0 ? 'diff-pos' : 'diff-neg'}">${diff >= 0 ? '+' : ''}${diff}</td>
      <td><span class="streak-badge ${strClass}">${t.streak}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function resetStandings() {
  if (!confirm('Clear all standings data?')) return;
  proStandings = [];
  DB.set('standings', proStandings);
  renderStandings();
}

function removeTeamFromStandings(name) {
  proStandings = proStandings.filter(t => t.name !== name);
  DB.set('standings', proStandings);
  renderStandings();
}

// ─────────────────────────────────────────
// HISTORY TAB
// ─────────────────────────────────────────
function renderHistory() {
  const list = document.getElementById('historyList');
  if (!list) return;
  list.innerHTML = '';

  if (proHistory.length === 0) {
    list.innerHTML = '<div class="history-empty">No games saved yet.</div>';
    return;
  }

  proHistory.forEach(g => {
    const homeWin = g.homeScore > g.awayScore;
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <div class="history-card-header">
        <span class="history-date">${g.date}</span>
        <span class="history-league">${g.leagueName || 'Game'}</span>
        <button class="history-del" onclick="deleteGame('${g.id}')" title="Delete">&#10005;</button>
      </div>
      <div class="history-score-row">
        <span class="history-team ${homeWin ? 'winner' : ''}">${g.homeName}</span>
        <span class="history-score ${homeWin ? 'winner' : ''}">${g.homeScore}</span>
        <span class="history-vs">—</span>
        <span class="history-score ${!homeWin ? 'winner' : ''}">${g.awayScore}</span>
        <span class="history-team ${!homeWin ? 'winner' : ''}">${g.awayName}</span>
      </div>
      <button class="boxscore-toggle" onclick="toggleBoxScore('${g.id}')">&#128196; Box Score</button>
      <div class="boxscore-wrap" id="bs-${g.id}" style="display:none;">
        ${buildBoxScoreHTML(g)}
      </div>
    `;
    list.appendChild(card);
  });
}

function buildBoxScoreHTML(g) {
  function teamTable(players, teamName, side) {
    if (!players || players.length === 0) return `<div class="bs-empty">No player data</div>`;
    let rows = players.map(p => {
      const s = p.stats || blankStats();
      return `<tr>
        <td>#${p.num}</td>
        <td class="bs-name">${p.name}</td>
        <td>${p.pos}</td>
        <td class="bs-pts">${s.pts}</td>
        <td>${s.reb}</td>
        <td>${s.ast}</td>
        <td>${s.stl}</td>
        <td>${s.blk}</td>
        <td>${s.to}</td>
        <td>${s.pf}</td>
      </tr>`;
    }).join('');
    const totals = players.reduce((acc, p) => {
      const s = p.stats || blankStats();
      Object.keys(acc).forEach(k => acc[k] += s[k] || 0);
      return acc;
    }, { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0 });
    return `
      <div class="bs-team-label ${side}">${teamName}</div>
      <div class="bs-table-wrap">
      <table class="bs-table">
        <thead><tr><th>#</th><th>Player</th><th>Pos</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="3">Total</td><td class="bs-pts">${totals.pts}</td><td>${totals.reb}</td><td>${totals.ast}</td><td>${totals.stl}</td><td>${totals.blk}</td><td>${totals.to}</td><td>${totals.pf}</td></tr></tfoot>
      </table>
      </div>`;
  }
  return teamTable(g.boxScore?.home, g.homeName, 'home') + teamTable(g.boxScore?.away, g.awayName, 'away');
}

function toggleBoxScore(id) {
  const el = document.getElementById('bs-' + id);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function deleteGame(id) {
  if (!confirm('Delete this game from history?')) return;
  proHistory = proHistory.filter(g => g.id !== id);
  DB.set('history', proHistory);
  renderHistory();
}

function clearHistory() {
  if (!confirm('Clear ALL game history? This cannot be undone.')) return;
  proHistory = [];
  DB.set('history', proHistory);
  renderHistory();
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Ensure stats entries exist for all roster players
  ['home', 'away'].forEach(side => {
    proRoster[side].forEach(p => {
      if (!proStats[side][p.id]) proStats[side][p.id] = blankStats();
    });
  });

  // Tab button listeners
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Enter key on player name adds player
  ['home', 'away'].forEach(side => {
    const ni = document.getElementById(side + 'PlayerName');
    if (ni) ni.addEventListener('keydown', e => { if (e.key === 'Enter') addPlayer(side); });
  });

  // Start on scoreboard tab
  switchTab('scoreboard');
});
