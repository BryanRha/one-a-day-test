// 원어데이 계정: 구글 로그인 (Supabase) · 서버의 /api/me 로 플레이어 기록 + 골드 잔액
//   서버가 있는 주소에서만 (test.oneaday.kr · oneaday.kr · vercel.app) · 게임은 로그인 없이도 그대로
const HOST = location.hostname;
export const ON = /(^|\.)oneaday\.kr$/.test(HOST) || HOST.endsWith('.vercel.app');
let sb = null, cfg = null, me = null, listeners = [];
const emit = () => listeners.forEach(f => { try { f(me); } catch { /* */ } });
export const onChange = f => { listeners.push(f); };
export const current = () => me;

async function client() {
  if (sb || !ON) return sb;
  cfg = cfg || await fetch('/api/admin/config').then(r => r.json()).catch(() => null);
  if (!cfg || !cfg.url || !cfg.anon) return null;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  sb = createClient(cfg.url, cfg.anon);
  sb.auth.onAuthStateChange((_e, s) => { if (!s) { me = null; emit(); } });
  return sb;
}
async function load(session) {
  const d = (() => { try { return localStorage.getItem('oad_did') || ''; } catch { return ''; } })();
  const r = await fetch('/api/me', { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ d }) }).catch(() => null);
  me = r && r.ok ? await r.json() : null; emit(); return me;
}
/* 앱을 열 때: 로그인돼 있으면 계정 불러오기 */
export async function init() { if (!ON) return null; const c = await client(); if (!c) return null; const { data: { session } } = await c.auth.getSession(); return session ? load(session) : null; }
export async function login() { const c = await client(); if (!c) throw new Error('로그인은 곧 열려요'); await c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/?login=1' } }); }
/* 서버에 계정 일 시키기 (골드 쓰기 · 내역): 로그인 토큰을 붙여 /api/me 로 */
export async function token() { const c = await client(); if (!c) return ''; const { data: { session } } = await c.auth.getSession(); return session ? session.access_token : ''; }
export async function call(body) {
  const t = await token(); if (!t) throw new Error('로그인이 필요해요');
  const r = await fetch('/api/me', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || '연결에 실패했어요'), j);
  if (me && j.gold) { me.gold = j.gold; if (j.items) me.items = j.items; emit(); }
  return j;
}
export async function refresh() { const c = await client(); if (!c) return null; const { data: { session } } = await c.auth.getSession(); return session ? load(session) : null; }
export async function logout() { const c = await client(); if (c) await c.auth.signOut(); me = null; emit(); }
