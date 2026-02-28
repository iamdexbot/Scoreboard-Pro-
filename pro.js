/* =====================================================
   HOOPS PRO — pro.js
   Roster · Stats · Standings · History
   ===================================================== */

// ── localStorage helpers ─────────────────────────────
const DB = {
  get: function(k)    { try { return JSON.parse(localStorage.getItem('pro_' + k)); } catch(e) { return null; } },
  set: function(k, v) { localStorage.setItem('pro_' + k, JSON.stringify(v)); },
};

// ── Data ─────────────────────────────────────────────
let proRoster    = DB.get('roster')    || { home: [], away: [] };
let proStats     = DB.get('stats')     || { home: {}, away: {} };
let proStandings = DB.get('standings') || [];
let proHistory   = DB.get('history')  || [];

let activeTab = 'scoreboard';

function blankStats() { return { pts:0, reb:0, ast:0, stl:0, blk:0, to:0, pf:0, min:0 }; }
function uid()        { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }


// ── Tab system ───────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-panel').forEach(function(p) {
    p.classList.toggle('active', p.id === 'tab-' + tab);
  });
  if (tab === 'roster')    renderRoster();
  if (tab === 'stats')     renderStatsTab();
  if (tab === 'standings') renderStandings();
  if (tab === 'history')   renderHistory();
}


// ── ROSTER ───────────────────────────────────────────
function saveRoster() { DB.set('roster', proRoster); }

function addPlayer(side) {
  const numInput  = document.getElementById(side + 'PlayerNum');
  const nameInput = document.getElementById(side + 'PlayerName');
  const posSelect = document.getElementById(side + 'PlayerPos');
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  const player = { id: uid(), num: numInput.value.trim() || '?', name: name, pos: posSelect.value };
  proRoster[side].push(player);
  if (!proStats[side][player.id]) proStats[side][player.id] = blankStats();
  saveRoster();
  DB.set('stats', proStats);
  numInput.value = ''; nameInput.value = ''; posSelect.value = 'PG';
  renderRoster();
}

function removePlayer(side, id) {
  proRoster[side] = proRoster[side].filter(function(p){ return p.id !== id; });
  saveRoster();
  renderRoster();
  if (activeTab === 'stats') renderStatsTab();
}

function renderRoster() {
  ['home','away'].forEach(function(side) {
    const teamName = (document.getElementById(side + 'Name') || {}).value || (side === 'home' ? 'HOME' : 'AWAY');
    const titleEl = document.getElementById(side + 'RosterTitle');
    if (titleEl) titleEl.textContent = teamName;

    const list = document.getElementById(side + 'RosterList');
    if (!list) return;
    list.innerHTML = '';

    if (proRoster[side].length === 0) {
      list.innerHTML = '<div class="roster-empty">No players yet. Add one above.</div>';
      return;
    }
    proRoster[side].forEach(function(p) {
      const row = document.createElement('div');
      row.className = 'roster-row';
      row.innerHTML =
        '<span class="roster-num">#' + p.num + '</span>' +
        '<span class="roster-pos">' + p.pos + '</span>' +
        '<span class="roster-name">' + p.name + '</span>' +
        '<button class="roster-del" onclick="removePlayer(\'' + side + '\',\'' + p.id + '\')" title="Remove">&#10005;</button>';
      list.appendChild(row);
    });
  });
}


// ── STATS ────────────────────────────────────────────
let selectedPlayer = null;

function renderStatsTab() {
  ['home','away'].forEach(function(side) {
    const teamName = (document.getElementById(side + 'Name') || {}).value || (side === 'home' ? 'HOME' : 'AWAY');
    const title = document.getElementById(side + 'StatsTitle');
    if (title) title.textContent = teamName;

    const list = document.getElementById(side + 'StatsList');
    if (!list) return;
    list.innerHTML = '';

    if (proRoster[side].length === 0) {
      list.innerHTML = '<div class="roster-empty">Add players in the Roster tab first.</div>';
      return;
    }
    proRoster[side].forEach(function(p) {
      const s = proStats[side][p.id] || blankStats();
      const isSelected = selectedPlayer && selectedPlayer.side === side && selectedPlayer.id === p.id;
      const row = document.createElement('div');
      row.className = 'stats-player-row' + (isSelected ? ' selected' : '');
      row.onclick = function(){ selectPlayer(side, p.id); };
      row.innerHTML =
        '<div class="stats-player-info">' +
          '<span class="stats-num">#' + p.num + '</span>' +
          '<span class="stats-name">' + p.name + '</span>' +
          '<span class="stats-pos">' + p.pos + '</span>' +
        '</div>' +
        '<div class="stats-nums">' +
          '<span class="stat-chip pts">' + s.pts + '<em>PTS</em></span>' +
          '<span class="stat-chip reb">' + s.reb + '<em>REB</em></span>' +
          '<span class="stat-chip ast">' + s.ast + '<em>AST</em></span>' +
          '<span class="stat-chip stl">' + s.stl + '<em>STL</em></span>' +
          '<span class="stat-chip blk">' + s.blk + '<em>BLK</em></span>' +
          '<span class="stat-chip to">'  + s.to  + '<em>TO</em></span>' +
          '<span class="stat-chip pf">'  + s.pf  + '<em>PF</em></span>' +
        '</div>';
      list.appendChild(row);
    });
  });
  updateStatButtons();
}

function selectPlayer(side, id) {
  if (selectedPlayer && selectedPlayer.side === side && selectedPlayer.id === id) {
    selectedPlayer = null;
  } else {
    selectedPlayer = { side: side, id: id };
  }
  renderStatsTab();
}

function updateStatButtons() {
  const panel = document.getElementById('statBtnPanel');
  if (!panel) return;
  if (!selectedPlayer) { panel.classList.remove('visible'); return; }
  const p = proRoster[selectedPlayer.side].find(function(x){ return x.id === selectedPlayer.id; });
  if (!p) { panel.classList.remove('visible'); return; }
  const teamName = (document.getElementById(selectedPlayer.side + 'Name') || {}).value || selectedPlayer.side.toUpperCase();
  document.getElementById('statPlayerLabel').textContent = '#' + p.num + ' ' + p.name + ' · ' + teamName;
  panel.classList.add('visible');
}

function recordStat(stat, delta) {
  if (!selectedPlayer) return;
  const side = selectedPlayer.side;
  const id   = selectedPlayer.id;
  if (!proStats[side][id]) proStats[side][id] = blankStats();
  proStats[side][id][stat] = Math.max(0, (proStats[side][id][stat] || 0) + delta);
  DB.set('stats', proStats);
  renderStatsTab();
  const panel = document.getElementById('statBtnPanel');
  panel.classList.add('flash-stat');
  setTimeout(function(){ panel.classList.remove('flash-stat'); }, 180);
}

function resetGameStats() {
  if (!confirm('Reset all player stats for this game?')) return;
  proStats = { home: {}, away: {} };
  proRoster.home.forEach(function(p){ proStats.home[p.id] = blankStats(); });
  proRoster.away.forEach(function(p){ proStats.away[p.id] = blankStats(); });
  DB.set('stats', proStats);
  selectedPlayer = null;
  renderStatsTab();
}


// ── SAVE GAME ────────────────────────────────────────
function saveGame() {
  const homeName    = (document.getElementById('homeName') || {}).value || 'HOME';
  const awayName    = (document.getElementById('awayName') || {}).value || 'AWAY';
  const homeScoreV  = parseInt((document.getElementById('homeScore') || {}).textContent) || 0;
  const awayScoreV  = parseInt((document.getElementById('awayScore') || {}).textContent) || 0;

  if (homeScoreV === 0 && awayScoreV === 0) { alert('Start the game first before saving!'); return; }
  if (!confirm('Save this game result to history and standings?')) return;

  const date = new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  const boxScore = {
    home: proRoster.home.map(function(p){ return Object.assign({}, p, { stats: Object.assign({}, proStats.home[p.id] || blankStats()) }); }),
    away: proRoster.away.map(function(p){ return Object.assign({}, p, { stats: Object.assign({}, proStats.away[p.id] || blankStats()) }); }),
  };
  const game = {
    id: uid(), date: date,
    homeName: homeName, awayName: awayName,
    homeScore: homeScoreV, awayScore: awayScoreV,
    boxScore: boxScore,
    leagueName: typeof leagueName !== 'undefined' ? leagueName : 'Hoops',
  };
  proHistory.unshift(game);
  DB.set('history', proHistory);
  updateStandings(homeName, homeScoreV, awayName, awayScoreV);
  alert('Game saved! ✓');
  renderHistory();
  renderStandings();
}

function updateStandings(homeName, homeScore, awayName, awayScore) {
  function getOrCreate(name) {
    var t = proStandings.find(function(x){ return x.name === name; });
    if (!t) { t = { name:name, w:0, l:0, pf:0, pa:0, streak:'W0', streakType:null, streakCount:0 }; proStandings.push(t); }
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

  proStandings.sort(function(a, b) {
    const wpA = a.w / (a.w + a.l || 1);
    const wpB = b.w / (b.w + b.l || 1);
    return wpB - wpA || (b.pf - b.pa) - (a.pf - a.pa);
  });
  DB.set('standings', proStandings);
}


// ── STANDINGS ────────────────────────────────────────
function renderStandings() {
  const tbody = document.getElementById('standingsBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (proStandings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="standings-empty">No games saved yet. Save a game to populate standings.</td></tr>';
    return;
  }
  const leader = proStandings[0];
  proStandings.forEach(function(t, i) {
    const gp   = t.w + t.l;
    const wp   = gp ? (t.w / gp * 100).toFixed(1) : '0.0';
    const diff = t.pf - t.pa;
    const gb   = i === 0 ? '—' : (((leader.w - leader.l) - (t.w - t.l)) / 2).toFixed(1);
    const sc   = t.streakType === 'W' ? 'streak-w' : 'streak-l';
    const tr   = document.createElement('tr');
    tr.className = i === 0 ? 'standings-leader' : '';
    tr.innerHTML =
      '<td class="rank">' + (i+1) + '</td>' +
      '<td class="team-name-cell">' + t.name + '</td>' +
      '<td>' + t.w + '</td>' +
      '<td>' + t.l + '</td>' +
      '<td>' + wp + '%</td>' +
      '<td>' + gb + '</td>' +
      '<td class="' + (diff >= 0 ? 'diff-pos' : 'diff-neg') + '">' + (diff >= 0 ? '+' : '') + diff + '</td>' +
      '<td><span class="streak-badge ' + sc + '">' + t.streak + '</span></td>';
    tbody.appendChild(tr);
  });
}

function resetStandings() {
  if (!confirm('Clear all standings data?')) return;
  proStandings = [];
  DB.set('standings', proStandings);
  renderStandings();
}


// ── HISTORY ──────────────────────────────────────────
function renderHistory() {
  const list = document.getElementById('historyList');
  if (!list) return;
  list.innerHTML = '';

  if (proHistory.length === 0) {
    list.innerHTML = '<div class="history-empty">No games saved yet.</div>';
    return;
  }
  proHistory.forEach(function(g) {
    const homeWin = g.homeScore > g.awayScore;
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML =
      '<div class="history-card-header">' +
        '<span class="history-date">' + g.date + '</span>' +
        '<span class="history-league">' + (g.leagueName || 'Game') + '</span>' +
        '<button class="history-del" onclick="deleteGame(\'' + g.id + '\')" title="Delete">&#10005;</button>' +
      '</div>' +
      '<div class="history-score-row">' +
        '<span class="history-team ' + (homeWin ? 'winner' : '') + '">' + g.homeName + '</span>' +
        '<span class="history-score ' + (homeWin ? 'winner' : '') + '">' + g.homeScore + '</span>' +
        '<span class="history-vs">—</span>' +
        '<span class="history-score ' + (!homeWin ? 'winner' : '') + '">' + g.awayScore + '</span>' +
        '<span class="history-team ' + (!homeWin ? 'winner' : '') + '">' + g.awayName + '</span>' +
      '</div>' +
      '<button class="boxscore-toggle" onclick="toggleBoxScore(\'' + g.id + '\')">&#128196; Box Score</button>' +
      '<div class="boxscore-wrap" id="bs-' + g.id + '" style="display:none;">' +
        buildBoxScoreHTML(g) +
      '</div>';
    list.appendChild(card);
  });
}

function buildBoxScoreHTML(g) {
  function teamTable(players, teamName, side) {
    if (!players || players.length === 0) return '<div class="bs-empty">No player data</div>';
    var rows = players.map(function(p) {
      const s = p.stats || blankStats();
      return '<tr>' +
        '<td>#' + p.num + '</td>' +
        '<td class="bs-name">' + p.name + '</td>' +
        '<td>' + p.pos + '</td>' +
        '<td class="bs-pts">' + s.pts + '</td>' +
        '<td>' + s.reb + '</td><td>' + s.ast + '</td>' +
        '<td>' + s.stl + '</td><td>' + s.blk + '</td>' +
        '<td>' + s.to  + '</td><td>' + s.pf  + '</td>' +
      '</tr>';
    }).join('');
    var totals = players.reduce(function(acc, p) {
      const s = p.stats || blankStats();
      Object.keys(acc).forEach(function(k){ acc[k] += s[k] || 0; });
      return acc;
    }, { pts:0, reb:0, ast:0, stl:0, blk:0, to:0, pf:0 });
    return '<div class="bs-team-label ' + side + '">' + teamName + '</div>' +
      '<div class="bs-table-wrap"><table class="bs-table">' +
      '<thead><tr><th>#</th><th>Player</th><th>Pos</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '<tfoot><tr><td colspan="3">Total</td><td class="bs-pts">' + totals.pts + '</td>' +
        '<td>' + totals.reb + '</td><td>' + totals.ast + '</td><td>' + totals.stl + '</td>' +
        '<td>' + totals.blk + '</td><td>' + totals.to  + '</td><td>' + totals.pf  + '</td></tr></tfoot>' +
      '</table></div>';
  }
  return teamTable(g.boxScore && g.boxScore.home, g.homeName, 'home') +
         teamTable(g.boxScore && g.boxScore.away, g.awayName, 'away');
}

function toggleBoxScore(id) {
  const el = document.getElementById('bs-' + id);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}
function deleteGame(id) {
  if (!confirm('Delete this game from history?')) return;
  proHistory = proHistory.filter(function(g){ return g.id !== id; });
  DB.set('history', proHistory);
  renderHistory();
}
function clearHistory() {
  if (!confirm('Clear ALL game history? This cannot be undone.')) return;
  proHistory = [];
  DB.set('history', proHistory);
  renderHistory();
}


// ── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Ensure stat objects exist for every rostered player
  ['home','away'].forEach(function(side) {
    proRoster[side].forEach(function(p) {
      if (!proStats[side][p.id]) proStats[side][p.id] = blankStats();
    });
  });

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function(){ switchTab(btn.dataset.tab); });
  });

  // Enter key adds player
  ['home','away'].forEach(function(side) {
    const ni = document.getElementById(side + 'PlayerName');
    if (ni) ni.addEventListener('keydown', function(e){ if (e.key === 'Enter') addPlayer(side); });
  });

  switchTab('scoreboard');
});
