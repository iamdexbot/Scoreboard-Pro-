/* =====================================================
   AUTH HELPER — auth.js
   Shared across all protected pages.
   ===================================================== */

const _supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Get current session ──────────────────
async function getSession() {
  const { data } = await _supa.auth.getSession();
  return data.session;
}

// ── Protect a page: redirect to login if not authed ──
async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

// ── Sign out ─────────────────────────────
async function signOut() {
  await _supa.auth.signOut();
  window.location.href = 'login.html';
}

// ── Get user profile ─────────────────────
async function getUserProfile(userId) {
  const { data } = await _supa.from('profiles').select('*').eq('id', userId).single();
  return data;
}

// ── Update user display name ──────────────
async function updateDisplayName(userId, name) {
  await _supa.from('profiles').upsert({ id: userId, display_name: name, updated_at: new Date() });
}

// ── League data helpers ───────────────────
const DB = {
  // Save entire scoreboard state to Supabase
  async saveState(state) {
    const session = await getSession();
    if (!session) return;
    await _supa.from('game_state').upsert({
      user_id: session.user.id,
      state: state,
      updated_at: new Date()
    }, { onConflict: 'user_id' });
  },

  // Load scoreboard state
  async loadState() {
    const session = await getSession();
    if (!session) return null;
    const { data } = await _supa.from('game_state').select('state').eq('user_id', session.user.id).single();
    return data?.state || null;
  },

  // Pro data: roster, stats, standings, history
  async savePro(key, value) {
    const session = await getSession();
    if (!session) return;
    await _supa.from('pro_data').upsert({
      user_id: session.user.id,
      data_key: key,
      data_value: value,
      updated_at: new Date()
    }, { onConflict: 'user_id,data_key' });
  },

  async loadPro(key) {
    const session = await getSession();
    if (!session) return null;
    const { data } = await _supa.from('pro_data').select('data_value').eq('user_id', session.user.id).eq('data_key', key).single();
    return data?.data_value || null;
  },

  // Upcoming games
  async saveUpcoming(games) {
    const session = await getSession();
    if (!session) return;
    await _supa.from('upcoming_games').upsert({
      user_id: session.user.id,
      games: games,
      updated_at: new Date()
    }, { onConflict: 'user_id' });
  },

  async loadUpcoming() {
    const session = await getSession();
    if (!session) return [];
    const { data } = await _supa.from('upcoming_games').select('games').eq('user_id', session.user.id).single();
    return data?.games || [];
  }
};
