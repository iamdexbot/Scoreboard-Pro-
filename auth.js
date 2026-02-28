/* =====================================================
   AUTH HELPER — auth.js
   Shared across all protected pages.
   Requires: supabase CDN + supabase-config.js loaded first.
   ===================================================== */

const _supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Get current session ──────────────────────────────
async function getSession() {
  const { data } = await _supa.auth.getSession();
  return data.session;
}

// ── Protect a page: redirect to /login if not authed ─
async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = '/login';
    return null;
  }
  return session;
}

// ── Sign out and redirect ────────────────────────────
async function signOut() {
  await _supa.auth.signOut();
  window.location.href = '/login';
}

// ── Get user profile row ─────────────────────────────
async function getUserProfile(userId) {
  const { data } = await _supa.from('profiles').select('*').eq('id', userId).single();
  return data;
}

// ── Update display name ──────────────────────────────
async function updateDisplayName(userId, name) {
  await _supa.from('profiles').upsert({ id: userId, display_name: name, updated_at: new Date() });
}
