// 원어데이 계정: 구글 로그인 (Supabase) · 서버의 /api/me 로 플레이어 기록 + 골드 잔액
//   서버가 있는 주소에서만 (test.oneaday.kr · oneaday.kr · vercel.app) · 게임은 로그인 없이도 그대로
//   원스토어 앱 안(onestore.js · 2026-11-24): 구글 로그인 대신 원스토어 playerId → 서버가 준 세션 표(os1.)로 같은 /api/me 를 씀 (늘 '로그인됨' · 이름 · 이메일 없음)
import * as OS from './onestore.js?v=0.99.82';
const HOST = location.hostname;
export const ON = /(^|\.)oneaday\.kr$/.test(HOST) || HOST.endsWith('.vercel.app');
let sb = null, cfg = null, me = null, listeners = [];
const emit = () => listeners.forEach(f => { try { f(me); } catch { /* */ } });
export const onChange = f => { listeners.push(f); return () => { listeners = listeners.filter(x => x !== f); }; };   /* 끄개를 돌려줌 (너랑 iframe 이 닫힐 때 떼어 냄) */
export const current = () => me;

/* 로그인 정보가 깨졌을 때(만료된 refresh 토큰 등) 멈추지 않게: 6초 안에 못 받거나 오류면 이 기기 로그인 정보를 지우고 '로그아웃' 상태로 */
async function safeSession(c) {
  try {
    const r = await Promise.race([c.auth.getSession(), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 6000))]);
    if (r.error) throw r.error;
    return r.data.session;
  } catch {
    try { await c.auth.signOut({ scope: 'local' }); } catch { /* */ }
    try { for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && /^sb-.*-auth-token/.test(k)) localStorage.removeItem(k); } } catch { /* */ }
    return null;
  }
}
/* 서버 공개 설정 (anon 키 · 메인 원격 스위치 home 등) — 한 번만 받음 · 실패하면 null */
export async function remote() { if (!ON) return null; cfg = cfg || await fetch('/api/admin/config').then(r => r.json()).catch(() => null); return cfg; }
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
/* 원스토어 앱 안의 계정 (2026-11-27 대표 '원스토어 앱 안에도 진짜 로그인'): 기본 = 원스토어 번호 계정(os1.) · 로그인하면 그 계정
   oad_os_acct: '' 원스토어 번호 · 'google' 이 WebView 안에서 구글 로그인이 된 경우(Supabase 세션) · 'link' 바깥 브라우저에서 로그인하고 받은 표(lk1. · oad_lk) */
const OSA = 'oad_os_acct', LK = 'oad_lk';
const lsg = k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const lss = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* */ } };
export const osMode = () => (OS.on ? lsg(OSA) : '');
const lkOk = t => { const p = String(t || '').split('.'); return p[0] === 'lk1' && Number(p[2]) > Date.now(); };
async function osTok() {
  const m = lsg(OSA);
  if (m === 'link' && lkOk(lsg(LK))) return lsg(LK);
  if (m === 'google') { const c = await client(); const s = c && await safeSession(c); if (s) return s.access_token; }
  return (await OS.token().catch(() => null)) || '';
}
/* 연결한 계정 표만 (게스트면 '') — 원스토어 결제 · 광고 보상이 연결한 계정으로 가게 OS.api 에 끼움 */
async function acctTok() { const m = lsg(OSA); if (m === 'link' && lkOk(lsg(LK))) return lsg(LK); if (m === 'google') { const c = await client(); const s = c && await safeSession(c); if (s) return s.access_token; } return ''; }
OS.setAcct(acctTok);
/* 원스토어 번호 계정으로 돌아가기 (시험 · 로그인 해제) */
export async function osPlain() { lss(OSA, ''); lss(LK, ''); return init(); }
/* 앱을 열 때: 로그인돼 있으면 계정 불러오기 */
export async function init() { if (OS.looks) await OS.ready; if (OS.looks && !OS.on) return null;   /* 원스토어 안인데 연결 실패: 웹 로그인으로 가지 않음 (11-27 QA A1) */
  if (OS.on) { const t = await osTok(); return t ? load({ access_token: t }) : null; } if (!ON) return null; const c = await client(); if (!c) return null; const session = await safeSession(c); return session ? load(session) : null; }
export async function login(provider = 'google') { if (OS.looks) { await OS.ready; if (!OS.on) throw new Error(OS.failText()); if (!(await init())) throw new Error(OS.failText()); return; } const c = await client(); if (!c) throw new Error('로그인은 곧 열려요'); await c.auth.signInWithOAuth({ provider: provider === 'kakao' ? 'kakao' : 'google', options: { redirectTo: location.origin + '/?login=1' } }); }
/* 켜져 있는 로그인 공급자 (Supabase Auth 공개 설정 · 카카오는 대표가 키를 넣으면 켜짐 — 꺼져 있으면 단추를 그리지 않음) · 한 번만 받음 */
export let prov = null;
export async function providers() {
  if (prov) return prov; if (!ON) return (prov = { google: false, kakao: false });
  const cf = await remote().catch(() => null); if (!cf || !cf.url || !cf.anon) return { google: true, kakao: false };
  const j = await fetch(cf.url + '/auth/v1/settings', { headers: { apikey: cf.anon } }).then(r => (r.ok ? r.json() : null)).catch(() => null);
  prov = { google: !j || !j.external || j.external.google !== false, kakao: !!(j && j.external && j.external.kakao) };
  return prov;
}

/* ── 원스토어 앱 안 구글 로그인 시험 (테스트 서버만 · 2026-11-27) ──
   how: frame = 이 화면(iframe)에서 바로 · top = 원스토어 화면 전체를 구글로 · pop = 새 창
   돌아오면(?login=1 또는 #access_token) googleBack() 이 세션을 확인 → 되면 이 앱의 계정을 구글로 (oad_os_acct=google) */
const TRY = 'oad_os_login_try';
export async function googleTry(how) {
  const c = await client(); if (!c) return { ok: 0, reason: 'no_client' };
  const back = location.origin + location.pathname + '?login=1';
  const { data, error } = await c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back, skipBrowserRedirect: true } });
  if (error || !data || !data.url) return { ok: 0, reason: String((error && error.message) || 'no_url').slice(0, 60) };
  lss(TRY, JSON.stringify({ how, at: Date.now() }));
  try {
    if (how === 'pop') { const w = window.open(data.url, '_blank'); return { ok: w ? 1 : 0, reason: w ? 'opened' : 'popup_null' }; }
    if (how === 'top') { window.top.location.href = data.url; return { ok: 1, reason: 'top_nav' }; }
    location.assign(data.url); return { ok: 1, reason: 'frame_nav' };
  } catch (e) { return { ok: 0, reason: String(e && e.name || 'err').slice(0, 40) }; }
}
/* 로그인 뒤 돌아왔을 때 (원스토어 안 · 밖 모두): { how, ok, reason } | null(시험 중이 아님) */
export async function googleBack() {
  const q = new URLSearchParams(location.search), h = location.hash || '';
  let t = null; try { t = JSON.parse(lsg(TRY) || 'null'); } catch { /* */ }
  if (!t && !OS.looks) return null;   /* 일반 웹 로그인은 원래 길(app.js ?login=1)이 맡음 */
  if (!q.has('login') && !/access_token|error_description|[?&]code=/.test(h + location.search)) return null;
  const err = new URLSearchParams(h.replace(/^#/, '')).get('error_description') || q.get('error_description') || '';
  const c = await client(); const s = c && await safeSession(c);
  lss(TRY, '');
  if (s && OS.looks) { await OS.ready; if (OS.on) { lss(OSA, 'google'); await mergeGuest(); await init(); } }
  return { how: (t && t.how) || '?', ok: s ? 1 : 0, reason: s ? 'session' : (err ? 'err:' + err.slice(0, 50) : 'no_session') };
}

/* ── 바깥 브라우저로 로그인하고 돌아오기 (대표 11-27 "브라우저에서 로그인 하고 뒤로가기하면 다시 원어데이로") ──
   ① 앱(원스토어 번호 계정)이 서버에 한 번 쓰는 열쇠를 받음(10분) → 바깥 브라우저로 /link/?k=<열쇠>
   ② 브라우저에서 구글 로그인 → 서버가 열쇠에 그 계정을 묶음
   ③ 앱이 돌아왔을 때 · 몇 초마다 열쇠를 물어 묶였으면 표(lk1.)를 받아 그 계정으로 */
const LINKK = 'oad_link_k';
async function osCall(body) {
  const t = (await OS.token().catch(() => null)) || ''; if (!t) throw new Error('원스토어 연결을 준비하고 있어요');
  const r = await fetch('/api/me', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || '연결에 실패했어요'), j, { status: r.status });
  return j;
}
export async function linkStart(p = '') {
  const j = await osCall({ act: 'link', sub: 'new' });
  lss(LINKK, JSON.stringify({ k: j.k, exp: j.exp }));
  return { k: j.k, url: `${location.origin}/link/?k=${encodeURIComponent(j.k)}${p === 'kakao' || p === 'google' ? '&p=' + p : ''}` };
}
export const linkPending = () => { try { const x = JSON.parse(lsg(LINKK) || 'null'); return x && x.exp > Date.now() ? x : null; } catch { return null; } };
/* 묶였으면 true (그 계정으로 다시 불러옴) · 아직이면 false · 끝났으면(만료 · 이미 씀) 열쇠를 버림 */
export async function linkPoll() {
  const x = linkPending(); if (!x) { lss(LINKK, ''); return false; }
  let j; try { j = await osCall({ act: 'link', sub: 'poll', k: x.k }); } catch (e) { if (e.status === 410 || e.status === 404) lss(LINKK, ''); return false; }
  if (!j.token) return false;
  lss(LINKK, ''); lss(LK, j.token); lss(OSA, 'link'); await mergeGuest(); await init(); return true;
}
/* 게스트(원스토어 계정)의 골드 · 소장 · 산 풀이를 연결한 계정으로 (서버가 한 번만 · 다시 불러도 그대로) → { moved, copied } | null */
export let lastMerge = null;
async function mergeGuest() {
  try { const g = (await OS.token().catch(() => null)) || ''; if (!g) return null; lastMerge = await call({ act: 'merge', from: g }); return lastMerge; } catch { return null; }
}
/* 서버에 계정 일 시키기 (골드 쓰기 · 내역): 로그인 토큰을 붙여 /api/me 로 */
export async function token() { if (OS.looks) await OS.ready; if (OS.on) return osTok(); if (OS.looks) return ''; const c = await client(); if (!c) return ''; const session = await safeSession(c); return session ? session.access_token : ''; }
export async function call(body) {
  const t = await token(); if (!t) throw new Error('로그인이 필요해요');
  const r = await fetch('/api/me', { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || '연결에 실패했어요'), j);
  if (me && j.gold) { me.gold = j.gold; if (j.items) me.items = j.items; emit(); }
  return j;
}
export async function refresh() { if (OS.looks) return init(); const c = await client(); if (!c) return null; const session = await safeSession(c); return session ? load(session) : null; }
export async function logout() { if (OS.looks) return; const c = await client(); if (c) await c.auth.signOut(); me = null; emit(); }
/* 같은 주소 iframe(너랑 등)이 셸과 같은 계정 하나를 보게 (2026-11-27 대표 제보 '원어데이는 로그인인데 너랑은 로그인 전 · 로그아웃이 안 이어짐')
   iframe 이 account.js 를 따로 불러오면 모듈이 하나 더 생겨 원스토어 세션 · 로그인 변화를 모름 → 셸 창에 이 모듈을 걸어 두고 iframe 은 window.parent.__oadAcct 를 씀 */
try { window.__oadAcct = { ON, current, onChange, init, token, refresh }; } catch { /* */ }
