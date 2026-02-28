/* =====================================================
   HOOPS PRO — script.js
   Core scoreboard: clocks, score, fouls, timeouts,
   themes, logos, buzzer, localStorage sync.
   ===================================================== */

// ── State ────────────────────────────────────────────
let homeScore  = 0;
let awayScore  = 0;
let homeFouls  = 0;
let awayFouls  = 0;
let period     = 1;
let possession = 'home';

// Quarter clock (centiseconds = 1/100 sec)
let minsPerQuarter    = 12;
let timerCentiseconds = minsPerQuarter * 60 * 100;
let timerRunning      = false;
let timerInterval     = null;

// Shot clock
let shotClockSeconds  = 24;
let shotClockDefault  = 24;
let shotClockRunning  = false;
let shotClockInterval = null;

// Timeouts
let homeTimeouts = 5;
let awayTimeouts = 5;
let MAX_TIMEOUTS = 5;

// Theme & logos
let currentTheme  = 'default';
let homeLogoData  = null;
let awayLogoData  = null;

// League name
let leagueName = 'Hoops';

const PERIOD_NAMES = ['—', '1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter', 'OT'];
const MAX_FOULS    = 5;


// ── Preset themes ────────────────────────────────────
const THEMES = [
  { id:'default', name:'Fire',   accent:'#FF5E1A', homeColor:'#FF5E1A', awayColor:'#00C2FF', yellow:'#FFD600', dark:'#0D0D0D', panel:'#161616' },
  { id:'nba',     name:'NBA',    accent:'#C9082A', homeColor:'#C9082A', awayColor:'#1D428A', yellow:'#FDB927', dark:'#0A0A0A', panel:'#141414' },
  { id:'midnight',name:'Night',  accent:'#7B2FBE', homeColor:'#A855F7', awayColor:'#22D3EE', yellow:'#F0ABFC', dark:'#05020D', panel:'#0F0A1A' },
  { id:'forest',  name:'Forest', accent:'#16A34A', homeColor:'#22C55E', awayColor:'#FACC15', yellow:'#BEF264', dark:'#050D07', panel:'#0C1610' },
  { id:'ice',     name:'Ice',    accent:'#0EA5E9', homeColor:'#38BDF8', awayColor:'#F97316', yellow:'#E0F2FE', dark:'#020B12', panel:'#071622' },
  { id:'gold',    name:'Gold',   accent:'#CA8A04', homeColor:'#EAB308', awayColor:'#DC2626', yellow:'#FEF08A', dark:'#0C0900', panel:'#1A1400' },
  { id:'mono',    name:'Mono',   accent:'#E5E5E5', homeColor:'#FFFFFF', awayColor:'#999999', yellow:'#D4D4D4', dark:'#000000', panel:'#111111' },
  { id:'cherry',  name:'Cherry', accent:'#E11D48', homeColor:'#FB7185', awayColor:'#FCD34D', yellow:'#FCA5A5', dark:'#0C0007', panel:'#180010' },
];


// ── Theme ────────────────────────────────────────────
function applyTheme(t, save) {
  if (save === undefined) save = true;
  const r = document.documentElement.style;
  r.setProperty('--accent',     t.accent);
  r.setProperty('--orange',     t.accent);
  r.setProperty('--home-color', t.homeColor);
  r.setProperty('--away-color', t.awayColor);
  r.setProperty('--yellow',     t.yellow);
  r.setProperty('--dark',       t.dark);
  r.setProperty('--panel',      t.panel);
  r.setProperty('--panel2',     adjustHex(t.panel, 12));

  // Sync color pickers
  document.getElementById('colorAccent').value = t.accent;
  document.getElementById('colorHome').value   = t.homeColor;
  document.getElementById('colorAway').value   = t.awayColor;
  document.getElementById('colorClock').value  = t.yellow;
  document.getElementById('colorBg').value     = t.dark;
  document.getElementById('colorPanel').value  = t.panel;

  if (save) { currentTheme = t.id || 'custom'; syncState(); }

  document.querySelectorAll('.theme-swatch').forEach(function(sw) {
    sw.classList.toggle('active', sw.dataset.id === (t.id || ''));
  });
}

function adjustHex(hex, amount) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(function(c){ return c+c; }).join('');
  const r = Math.min(255, parseInt(hex.slice(0,2),16) + amount);
  const g = Math.min(255, parseInt(hex.slice(2,4),16) + amount);
  const b = Math.min(255, parseInt(hex.slice(4,6),16) + amount);
  return '#' + [r,g,b].map(function(v){ return v.toString(16).padStart(2,'0'); }).join('');
}

function applyCustomTheme() {
  applyTheme({
    id: 'custom', name: 'Custom',
    accent:    document.getElementById('colorAccent').value,
    homeColor: document.getElementById('colorHome').value,
    awayColor: document.getElementById('colorAway').value,
    yellow:    document.getElementById('colorClock').value,
    dark:      document.getElementById('colorBg').value,
    panel:     document.getElementById('colorPanel').value,
  });
}

function buildThemeSwatches() {
  const container = document.getElementById('themePresets');
  container.innerHTML = '';
  THEMES.forEach(function(t) {
    const sw = document.createElement('div');
    sw.className  = 'theme-swatch';
    sw.dataset.id = t.id;
    sw.title      = t.name;
    sw.innerHTML  =
      '<div class="theme-swatch-circle" style="background:linear-gradient(135deg,' + t.accent + ' 50%,' + t.awayColor + ' 50%)"></div>' +
      '<span class="theme-swatch-name">' + t.name + '</span>';
    sw.addEventListener('click', function(){ applyTheme(t); });
    container.appendChild(sw);
  });
}

function openThemeModal() {
  buildThemeSwatches();
  document.querySelectorAll('.theme-swatch').forEach(function(sw) {
    sw.classList.toggle('active', sw.dataset.id === currentTheme);
  });
  document.getElementById('themeModal').classList.add('open');
}
function closeThemeModal() { document.getElementById('themeModal').classList.remove('open'); }
document.getElementById('themeModal').addEventListener('click', function(e){ if (e.target === this) closeThemeModal(); });


// ── Logo upload ──────────────────────────────────────
function uploadLogo(event, team) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const url = e.target.result;
    if (team === 'home') { homeLogoData = url; showLogo('home', url); }
    else                 { awayLogoData = url; showLogo('away', url); }
    syncState();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}
function showLogo(team, url) {
  document.getElementById(team + 'LogoImg').src              = url;
  document.getElementById(team + 'LogoImg').style.display    = 'block';
  document.getElementById(team + 'LogoPlaceholder').style.display = 'none';
  document.getElementById(team + 'LogoRemove').style.display = 'flex';
}
function removeLogo(event, team) {
  event.stopPropagation();
  if (team === 'home') { homeLogoData = null; hideLogo('home'); }
  else                 { awayLogoData = null; hideLogo('away'); }
  syncState();
}
function hideLogo(team) {
  document.getElementById(team + 'LogoImg').src              = '';
  document.getElementById(team + 'LogoImg').style.display    = 'none';
  document.getElementById(team + 'LogoPlaceholder').style.display = '';
  document.getElementById(team + 'LogoRemove').style.display = 'none';
}


// ── LocalStorage sync (for viewer / overlay) ─────────
function syncState() {
  const root  = document.documentElement.style;
  const state = {
    homeScore, awayScore, homeFouls, awayFouls,
    period, possession,
    timerCentiseconds, timerRunning,
    shotClockSeconds, shotClockRunning,
    homeName:    document.getElementById('homeName').value  || 'HOME',
    awayName:    document.getElementById('awayName').value  || 'AWAY',
    leagueName,
    periodLabel: PERIOD_NAMES[period] || 'OT',
    theme: {
      accent:    root.getPropertyValue('--accent').trim()     || '#FF5E1A',
      homeColor: root.getPropertyValue('--home-color').trim() || '#FF5E1A',
      awayColor: root.getPropertyValue('--away-color').trim() || '#00C2FF',
      yellow:    root.getPropertyValue('--yellow').trim()     || '#FFD600',
      dark:      root.getPropertyValue('--dark').trim()       || '#0D0D0D',
      panel:     root.getPropertyValue('--panel').trim()      || '#161616',
    },
    homeLogoData, awayLogoData,
    homeTimeouts, awayTimeouts, maxTimeouts: MAX_TIMEOUTS,
  };
  localStorage.setItem('scoreboard', JSON.stringify(state));
}


// ── Scoring ──────────────────────────────────────────
function addScore(team, pts) {
  if (team === 'home') {
    homeScore = Math.max(0, homeScore + pts);
    document.getElementById('homeScore').textContent = homeScore;
    animateBump('homeScore');
  } else {
    awayScore = Math.max(0, awayScore + pts);
    document.getElementById('awayScore').textContent = awayScore;
    animateBump('awayScore');
  }
  syncState();
}
function animateBump(id) {
  const el = document.getElementById(id);
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}


// ── Quarter clock ────────────────────────────────────
function formatTime(cs) {
  const tot = Math.floor(cs / 100);
  const m   = Math.floor(tot / 60);
  const s   = tot % 60;
  const cc  = Math.floor(cs % 100);
  return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0') + '.' + String(cc).padStart(2,'0');
}

function toggleTimer() {
  timerRunning = !timerRunning;
  document.getElementById('playBtn').textContent = timerRunning ? '⏸' : '▶';
  document.getElementById('timer').classList.toggle('running', timerRunning);

  if (timerRunning) {
    timerInterval = setInterval(function() {
      if (timerCentiseconds > 0) {
        timerCentiseconds--;
        document.getElementById('timer').textContent = formatTime(timerCentiseconds);
        if (timerCentiseconds % 10 === 0) syncState();
      } else {
        stopTimer(); buzzer(); syncState();
      }
    }, 10);
    if (!shotClockRunning) startShotClock();
  } else {
    clearInterval(timerInterval);
    syncState();
  }
}
function stopTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  document.getElementById('playBtn').textContent = '▶';
  document.getElementById('timer').classList.remove('running');
}
function resetTimer() {
  stopTimer();
  timerCentiseconds = minsPerQuarter * 60 * 100;
  document.getElementById('timer').textContent = formatTime(timerCentiseconds);
  syncState();
}


// ── Minutes-per-quarter modal ────────────────────────
function openMinsEditor() {
  document.getElementById('minsModal').classList.add('open');
  document.querySelectorAll('.mins-opt').forEach(function(btn) {
    btn.classList.toggle('active', parseInt(btn.textContent) === minsPerQuarter);
  });
}
function closeMinsEditor() {
  document.getElementById('minsModal').classList.remove('open');
  document.getElementById('customMins').value = '';
}
function setMinsPerQuarter(mins) {
  minsPerQuarter = Math.max(1, Math.min(60, mins));
  resetTimer();
  document.querySelectorAll('.mins-opt').forEach(function(btn) {
    btn.classList.toggle('active', parseInt(btn.textContent) === minsPerQuarter);
  });
}
function applyCustomMins() {
  const val = parseInt(document.getElementById('customMins').value);
  if (!isNaN(val) && val >= 1 && val <= 60) { setMinsPerQuarter(val); closeMinsEditor(); }
  else document.getElementById('customMins').focus();
}
document.getElementById('minsModal').addEventListener('click', function(e){ if (e.target === this) closeMinsEditor(); });


// ── Period ───────────────────────────────────────────
function changePeriod(delta) {
  period = Math.max(1, Math.min(5, period + delta));
  document.getElementById('periodNum').textContent   = period;
  document.getElementById('periodLabel').textContent = PERIOD_NAMES[period] || 'OT';
  resetTimer(); resetShotClock(); syncState();
}


// ── Shot clock ───────────────────────────────────────
function updateShotClockDisplay() {
  const el = document.getElementById('shotClock');
  el.textContent = shotClockSeconds;
  el.classList.remove('warning', 'critical');
  if (shotClockSeconds <= 5)       el.classList.add('critical');
  else if (shotClockSeconds <= 10) el.classList.add('warning');
}
function startShotClock() {
  clearInterval(shotClockInterval);
  shotClockRunning = true;
  document.getElementById('scPlayBtn').textContent = '⏸';
  document.getElementById('shotClock').classList.add('running');
  shotClockInterval = setInterval(function() {
    if (shotClockSeconds > 0) {
      shotClockSeconds--;
      updateShotClockDisplay();
      syncState();
    } else {
      stopShotClock(); shotClockViolation(); syncState();
    }
  }, 1000);
}
function stopShotClock() {
  clearInterval(shotClockInterval);
  shotClockRunning = false;
  const btn = document.getElementById('scPlayBtn');
  if (btn) btn.textContent = '▶';
  document.getElementById('shotClock').classList.remove('running');
}
function toggleShotClock() {
  if (shotClockRunning) { stopShotClock(); syncState(); }
  else                  { startShotClock(); syncState(); }
}
function setShotClock(secs) {
  stopShotClock();
  shotClockSeconds = secs; shotClockDefault = secs;
  updateShotClockDisplay(); startShotClock(); syncState();
}
function resetShotClock() {
  stopShotClock();
  shotClockSeconds = shotClockDefault;
  updateShotClockDisplay(); startShotClock(); syncState();
}
function shotClockViolation() {
  const flash = document.getElementById('flash');
  flash.style.background = '#FF3333';
  flash.classList.remove('active'); void flash.offsetWidth; flash.classList.add('active');
  flash.style.background = '';
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 1200; osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
  } catch(e) {}
}


// ── Fouls ────────────────────────────────────────────
function buildDots() {
  ['home','away'].forEach(function(team) {
    const container = document.getElementById(team + 'DotsContainer');
    container.innerHTML = '';
    const count = team === 'home' ? homeFouls : awayFouls;
    for (let i = 0; i < MAX_FOULS; i++) {
      const dot = document.createElement('div');
      dot.className = 'foul-dot ' + team;
      if (count > i) dot.classList.add('active');
      dot.title = 'Set ' + team + ' fouls to ' + (i + 1);
      dot.addEventListener('click', (function(t, idx) { return function(){ toggleFoul(t, idx); }; })(team, i));
      container.appendChild(dot);
    }
  });
}
function updateFoulDisplay(id, count) {
  const el = document.getElementById(id);
  if (count >= MAX_FOULS) { el.textContent = 'PENALTY'; el.classList.add('penalty'); }
  else                    { el.textContent = count;     el.classList.remove('penalty'); }
}
function toggleFoul(team, idx) {
  if (team === 'home') {
    homeFouls = (homeFouls === idx + 1) ? idx : idx + 1;
    updateFoulDisplay('homeFoulsCount', homeFouls);
  } else {
    awayFouls = (awayFouls === idx + 1) ? idx : idx + 1;
    updateFoulDisplay('awayFoulsCount', awayFouls);
  }
  buildDots(); syncState();
}


// ── Possession ───────────────────────────────────────
function setPossession(team) {
  possession = team;
  document.getElementById('possHome').classList.toggle('inactive', team !== 'home');
  document.getElementById('possAway').classList.toggle('inactive', team !== 'away');
  syncState();
}


// ── Buzzer (NBA-style foghorn) ───────────────────────
function buzzer() {
  const flash = document.getElementById('flash');
  flash.style.background = '#FFD600';
  flash.classList.remove('active'); void flash.offsetWidth; flash.classList.add('active');
  flash.style.background = '';

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    function makeHorn(freq, type, start, dur, vol) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo  = ctx.createOscillator();
      const lfog = ctx.createGain();
      lfo.frequency.value = 8;
      lfog.gain.value = freq * 0.015;
      lfo.connect(lfog); lfog.connect(osc.frequency);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.linearRampToValueAtTime(freq * 0.94, start + dur);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.03);
      gain.gain.setValueAtTime(vol, start + dur - 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      lfo.start(start); lfo.stop(start + dur);
      osc.start(start); osc.stop(start + dur);
    }
    makeHorn(110, 'sawtooth', now,        1.15, 0.45);
    makeHorn(220, 'square',   now,        1.15, 0.20);
    makeHorn(440, 'square',   now,        1.15, 0.08);
    makeHorn(110, 'sawtooth', now + 1.25, 0.9,  0.45);
    makeHorn(220, 'square',   now + 1.25, 0.9,  0.20);
  } catch(e) {}
}


// ── League name ──────────────────────────────────────
function openLeagueEditor() {
  document.getElementById('leagueInput').value = leagueName;
  document.getElementById('leagueModal').classList.add('open');
  setTimeout(function(){ document.getElementById('leagueInput').select(); }, 50);
}
function closeLeagueEditor() { document.getElementById('leagueModal').classList.remove('open'); }
function applyLeagueName() {
  const val = document.getElementById('leagueInput').value.trim();
  if (val) {
    leagueName = val;
    document.getElementById('headerLeagueName').textContent = '⬡ ' + leagueName;
    syncState();
  }
  closeLeagueEditor();
}
document.getElementById('leagueModal').addEventListener('click', function(e){ if (e.target === this) closeLeagueEditor(); });
document.getElementById('leagueInput').addEventListener('keydown', function(e){ if (e.key === 'Enter') applyLeagueName(); });


// ── Timeout Setup ────────────────────────────────────
function openTimeoutSetup() {
  document.getElementById('timeoutSetupModal').classList.add('open');
  document.querySelectorAll('.to-opt').forEach(function(btn) {
    btn.classList.toggle('active', parseInt(btn.dataset.val) === MAX_TIMEOUTS);
  });
  document.getElementById('customToInput').value = '';
}
function closeTimeoutSetup() { document.getElementById('timeoutSetupModal').classList.remove('open'); }
function setMaxTimeouts(n) {
  n = Math.max(1, Math.min(10, n));
  MAX_TIMEOUTS = n;
  homeTimeouts = awayTimeouts = n;
  updateTimeoutDisplay('homeTimeoutsCount', homeTimeouts);
  updateTimeoutDisplay('awayTimeoutsCount', awayTimeouts);
  buildAllTimeoutDots(); syncState();
  document.querySelectorAll('.to-opt').forEach(function(btn) {
    btn.classList.toggle('active', parseInt(btn.dataset.val) === n);
  });
}
function applyCustomTimeouts() {
  const val = parseInt(document.getElementById('customToInput').value);
  if (!isNaN(val) && val >= 1 && val <= 10) { setMaxTimeouts(val); closeTimeoutSetup(); }
  else document.getElementById('customToInput').focus();
}
document.addEventListener('DOMContentLoaded', function() {
  const m = document.getElementById('timeoutSetupModal');
  if (m) m.addEventListener('click', function(e){ if (e.target === this) closeTimeoutSetup(); });
});


// ── Timeouts ─────────────────────────────────────────
function useTimeout(team) {
  if (team === 'home') {
    if (homeTimeouts <= 0) return;
    homeTimeouts--;
    updateTimeoutDisplay('homeTimeoutsCount', homeTimeouts);
    buildTimeoutDots('homeTimeoutDots', homeTimeouts, 'home');
  } else {
    if (awayTimeouts <= 0) return;
    awayTimeouts--;
    updateTimeoutDisplay('awayTimeoutsCount', awayTimeouts);
    buildTimeoutDots('awayTimeoutDots', awayTimeouts, 'away');
  }
  syncState();
}
function restoreTimeout(team) {
  if (team === 'home') {
    if (homeTimeouts >= MAX_TIMEOUTS) return;
    homeTimeouts++;
    updateTimeoutDisplay('homeTimeoutsCount', homeTimeouts);
    buildTimeoutDots('homeTimeoutDots', homeTimeouts, 'home');
  } else {
    if (awayTimeouts >= MAX_TIMEOUTS) return;
    awayTimeouts++;
    updateTimeoutDisplay('awayTimeoutsCount', awayTimeouts);
    buildTimeoutDots('awayTimeoutDots', awayTimeouts, 'away');
  }
  syncState();
}
function updateTimeoutDisplay(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = count;
  el.classList.toggle('zero', count === 0);
}
function buildTimeoutDots(containerId, count, team) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  for (let i = 0; i < MAX_TIMEOUTS; i++) {
    const dot = document.createElement('div');
    dot.className = 'timeout-dot ' + team;
    if (count > i) dot.classList.add('active');
    el.appendChild(dot);
  }
}
function buildAllTimeoutDots() {
  buildTimeoutDots('homeTimeoutDots', homeTimeouts, 'home');
  buildTimeoutDots('awayTimeoutDots', awayTimeouts, 'away');
}


// ── Full reset ───────────────────────────────────────
function resetAll() {
  if (!confirm('Reset the entire scoreboard?')) return;

  homeScore = awayScore = homeFouls = awayFouls = 0;
  period = 1;

  document.getElementById('homeScore').textContent = '0';
  document.getElementById('awayScore').textContent = '0';
  updateFoulDisplay('homeFoulsCount', 0);
  updateFoulDisplay('awayFoulsCount', 0);
  document.getElementById('periodNum').textContent   = '1';
  document.getElementById('periodLabel').textContent = '1st Quarter';

  stopTimer();
  timerCentiseconds = minsPerQuarter * 60 * 100;
  document.getElementById('timer').textContent = formatTime(timerCentiseconds);

  stopShotClock();
  shotClockSeconds = shotClockDefault;
  updateShotClockDisplay();

  homeTimeouts = awayTimeouts = MAX_TIMEOUTS;
  updateTimeoutDisplay('homeTimeoutsCount', homeTimeouts);
  updateTimeoutDisplay('awayTimeoutsCount', awayTimeouts);
  buildAllTimeoutDots();
  setPossession('home');
  buildDots();
  syncState();
}


// ── Team name sync ───────────────────────────────────
document.getElementById('homeName').addEventListener('input', syncState);
document.getElementById('awayName').addEventListener('input', syncState);


// ── Init ─────────────────────────────────────────────
buildDots();
buildAllTimeoutDots();
setPossession('home');
updateShotClockDisplay();
document.getElementById('timer').textContent = formatTime(timerCentiseconds);
applyTheme(THEMES[0], false);
syncState();
