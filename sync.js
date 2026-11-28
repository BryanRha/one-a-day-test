// 계정 기준 앱 상태 (2026-11-27 대표 "서버로 옮길 수 있는 데이터는 서버에서" · team/dev/tasks/261127-server-state/intent.md)
//   로그인(구글 · 카카오 · 원스토어 연결) 또는 원스토어 게스트 계정이면: 하루 기록(링) · 연속 출석 · 게임 기록 · 하루 열기 · 이용권 장부 · 화면 모드를 계정에 두고
//   어느 기기 · 어느 그릇(원스토어 앱 · 설치 아이콘 · 브라우저)으로 열어도 같게 · 로그인 안 한 브라우저는 지금처럼 기기만
//   합치기: 링 · 출석 날은 합집합(켜진 것은 안 꺼짐) · 게임 판 수는 큰 쪽 · 날짜는 늦은 쪽 · 이용권은 장부 합집합 · 설정은 늦게 바꾼 쪽
//   흐름: 계정이 생기면 pull → 합침 → 기기에 씀 → (달라졌으면) push · 그 뒤 15초마다 바뀐 게 있으면 push · 화면을 떠날 때 한 번 · 충돌(409)이면 다시 받아 합쳐 올림
//   점방 내 정보: 카카오 · 구글 계정만(게스트 안 됨) · 동의(기본 켬 · rules.js FORTUNE_ME_CLOUD_DEFAULT)일 때만 · 서버가 암호화해 저장 · 계산은 기기에서
import * as R from './rules.js?v=0.99.104';
import * as A from './account.js?v=0.99.104';
import * as OS from './onestore.js?v=0.99.104';

const DKEY = 'oad_days', SETAT = 'oad_set_at', MEK = 'oad_fortune_me', MEC = 'oad_fme_cloud';
const js = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } };
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/* ── 이 기기의 모습 ── */
export function collect() {
  const s = R.state(), days = js(DKEY) || {}, out = { v: 1, days: {}, lib: {}, unl: {}, streak: {}, tk: { got: {}, used: {} }, set: {} };
  for (const [k, v] of Object.entries(days)) if (DAY.test(k) && v) { const d = {}; if (v.f) d.f = 1; if (v.n) d.n = 1; if (v.v) d.v = 1; if (Object.keys(d).length) out.days[k] = d; }
  for (const [k, g] of Object.entries(s.history || {})) if (DAY.test(k) && g) (out.days[k] ||= {}).g = String(g);
  for (const [g, e] of Object.entries(s.library || {})) out.lib[g] = { first: e.first, last: e.last, td: e.td, plays: e.plays | 0, tn: e.tn | 0 };
  for (const [g, d] of Object.entries(s.unlocks || {})) if (DAY.test(d || '')) out.unl[g] = d;
  out.streak = { ...(s.streak || {}) };
  R.tickets(); const t = s.tk || { got: {}, used: {} }; out.tk = { got: { ...t.got }, used: { ...t.used } };
  const at = js(SETAT) || {}; out.set.theme = [localStorage.getItem('oad_theme') || 'auto', at.theme || 0];
  return out;
}
const maxD = (a, b) => (!a ? b : !b ? a : a > b ? a : b), minD = (a, b) => (!a ? b : !b ? a : a < b ? a : b);
/* 둘을 합침 (순서 상관없음 — merge(a,b) = merge(b,a)) */
export function merge(a, b) {
  a = a || {}; b = b || {};
  const o = { v: 1, days: {}, lib: {}, unl: {}, streak: {}, tk: { got: {}, used: {} }, set: {} };
  for (const k of new Set([...Object.keys(a.days || {}), ...Object.keys(b.days || {})])) {
    const x = (a.days || {})[k] || {}, y = (b.days || {})[k] || {}, d = {};
    for (const f of ['f', 'n', 'v']) if (x[f] || y[f]) d[f] = 1;
    const g = x.g && y.g ? (x.g < y.g ? x.g : y.g) : x.g || y.g; if (g) d.g = g;
    o.days[k] = d;
  }
  for (const g of new Set([...Object.keys(a.lib || {}), ...Object.keys(b.lib || {})])) {
    const x = (a.lib || {})[g], y = (b.lib || {})[g];
    if (!x || !y) { o.lib[g] = { ...(x || y) }; continue; }
    const td = maxD(x.td, y.td), tn = x.td === y.td ? Math.max(x.tn | 0, y.tn | 0) : ((x.td === td ? x : y).tn | 0);
    o.lib[g] = { first: minD(x.first, y.first), last: maxD(x.last, y.last), td, plays: Math.max(x.plays | 0, y.plays | 0), tn };
  }
  for (const g of new Set([...Object.keys(a.unl || {}), ...Object.keys(b.unl || {})])) o.unl[g] = maxD((a.unl || {})[g], (b.unl || {})[g]);
  const sa = a.streak || {}, sb = b.streak || {};
  const win = (sa.last || '') > (sb.last || '') ? sa : (sb.last || '') > (sa.last || '') ? sb : (sa.count | 0) > (sb.count | 0) ? sa : (sb.count | 0) > (sa.count | 0) ? sb : JSON.stringify(sa) >= JSON.stringify(sb) ? sa : sb;   /* 같으면 늘 같은 쪽(순서 상관없게) */
  o.streak = { ...win, rest: maxD(sa.rest, sb.rest), rested: maxD(sa.rested, sb.rested), filled: [...new Set([...(sa.filled || []), ...(sb.filled || [])])].sort().slice(-30) };
  for (const k of Object.keys(o.streak)) if (o.streak[k] === undefined || o.streak[k] === null) delete o.streak[k];
  if (!o.streak.filled.length) delete o.streak.filled;
  for (const [k, n] of [...Object.entries((a.tk || {}).got || {}), ...Object.entries((b.tk || {}).got || {})]) o.tk.got[k] = Math.max(o.tk.got[k] || 0, n | 0);
  for (const k of [...Object.keys((a.tk || {}).used || {}), ...Object.keys((b.tk || {}).used || {})]) o.tk.used[k] = 1;
  for (const k of new Set([...Object.keys(a.set || {}), ...Object.keys(b.set || {})])) { const x = (a.set || {})[k], y = (b.set || {})[k]; o.set[k] = !x ? y : !y ? x : y[1] > x[1] ? y : x[1] > y[1] ? x : String(y[0]) > String(x[0]) ? y : x; }
  return o;
}
const canon = o => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([p], [q]) => (p < q ? -1 : 1))) : v));
/* 합친 모습을 이 기기에 씀 → 바뀌었으면 true */
function apply(st) {
  const before = canon(collect());
  const days = js(DKEY) || {};
  for (const [k, d] of Object.entries(st.days || {})) { const cur = days[k] || {}; const nx = { ...cur }; for (const f of ['f', 'n', 'v']) if (d[f]) nx[f] = 1; if (Object.keys(nx).length) days[k] = nx; }
  const keep = Object.keys(days).sort().slice(-400); put(DKEY, Object.fromEntries(keep.map(k => [k, days[k]])));
  const s = R.state();
  for (const [k, d] of Object.entries(st.days || {})) if (d.g && !s.history[k]) s.history[k] = d.g;
  for (const [g, e] of Object.entries(st.lib || {})) s.library[g] = { ...(s.library[g] || {}), ...Object.fromEntries(Object.entries(e || {}).filter(([, v]) => v != null)) };
  for (const [g, d] of Object.entries(st.unl || {})) if (!s.unlocks[g] || d > s.unlocks[g]) s.unlocks[g] = d;
  s.streak = { ...(st.streak || s.streak) };
  s.tk = { got: { ...((st.tk || {}).got || {}) }, used: { ...((st.tk || {}).used || {}) } }; delete s.tickets;
  R.save();
  const th = (st.set || {}).theme, at = js(SETAT) || {};
  if (th && th[1] > (at.theme || 0)) { try { if (th[0] === 'auto') localStorage.removeItem('oad_theme'); else localStorage.setItem('oad_theme', th[0]); } catch { /* */ } put(SETAT, { ...at, theme: th[1] }); if (window.__oadTheme) window.__oadTheme(); }
  return canon(collect()) !== before;
}
/* 화면 모드를 바꿀 때 app.js 가 부름 (늦게 바꾼 쪽이 이기게 시각을 남김) */
export const touchSet = k => { const at = js(SETAT) || {}; at[k] = Date.now(); put(SETAT, at); };

/* ── 서버와 맞추기 ── */
const Z = { rev: 0, last: '', busy: false, t: 0, on: false, redraw: null };
const call = body => A.call(body);
export async function sync(why) {
  if (!A.current() || Z.busy) return null;
  Z.busy = true;
  try {
    for (let i = 0; i < 3; i++) {
      const p = await call({ act: 'state', sub: 'pull' });
      const merged = merge(collect(), p.st || {}), changed = apply(merged), now = canon(collect());
      Z.rev = p.rev || 0;
      if (changed && Z.redraw) Z.redraw(why);
      if (p.st && canon(merge(p.st, {})) === canon(merge(collect(), {}))) { Z.last = now; return { ok: true, rev: Z.rev, changed }; }
      try { const r = await call({ act: 'state', sub: 'push', base: Z.rev, st: collect(), ver: window.OAD_VERSION || '' }); Z.rev = r.rev; Z.last = now; return { ok: true, rev: Z.rev, changed, pushed: true }; }
      catch (e) { if (!e.conflict) throw e; }   /* 다른 기기가 먼저 올림 → 다시 받아 합침 */
    }
    return { ok: false };
  } catch (e) { return { ok: false, error: e.message }; }
  finally { Z.busy = false; }
}
/* 설정 「모든 기록 지우기」 (대표 11-28 실서버 제보 '초기화해도 점방 내 정보가 남음'): R.resetAll 은 앱 기록 한 칸만 비움 → 따로 둔 점방 내 정보 · 하루 링도 비우고,
   계정이 있으면 서버 사본도 비움(안 그러면 다음 맞추기 때 합집합으로 되살아남) · 하루 열기 · 이용권은 서버가 남겨 다시 내려옴 · 기기 번호(oad_did) · 계정 표는 그대로 */
export async function resetAll() {
  for (const k of [MEK, DKEY, SETAT]) { try { localStorage.removeItem(k); } catch { /* */ } }
  FME.last = '';
  if (!A.current()) return { ok: true, local: true };
  await fmeDel();
  try { const r = await call({ act: 'state', sub: 'reset', ver: window.OAD_VERSION || '' }); Z.rev = r.rev || 0; Z.last = ''; apply(merge(collect(), r.st || {})); if (Z.redraw) Z.redraw('reset'); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
}
/* 바뀐 게 있을 때만 올림 (15초마다 · 화면을 떠날 때) */
async function tick() { if (!A.current() || Z.busy) return; if (canon(collect()) !== Z.last) await sync('tick'); }
export function start(redraw) {
  if (Z.on) return; Z.on = true; Z.redraw = redraw;
  A.onChange(m => { if (m) { sync('login'); fmeSync(); } else { Z.last = ''; Z.rev = 0; } });
  setInterval(tick, 15000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') tick(); else if (A.current()) sync('resume'); });
}

/* ── 점방 내 정보 (카카오 · 구글 계정 · 동의했을 때만) ── */
export const fmeAllowed = () => { const m = A.current(); return !!m && m.fme === true && (!R.PROD || R.PROD_FME_OPEN) && (!OS.on || !!A.osMode()); };   /* 서버가 켜짐(fme · 열쇠 있음 · 실서버 스위치)일 때만 — 아니면 줄을 그리지 않고 동의도 받지 않음 (QA R2) */
export const fmeOn = () => { const v = localStorage.getItem(MEC); return v == null ? R.FORTUNE_ME_CLOUD_DEFAULT : v === '1'; };
export const FME = { off: false, last: '' };
/* 동의 바꾸기: 끄면 서버 것을 바로 지움 */
export async function fmeSet(on) { try { localStorage.setItem(MEC, on ? '1' : '0'); } catch { /* */ } if (!fmeAllowed()) return; if (on) return fmeSync(); return call({ act: 'me', sub: 'del' }).catch(() => null); }
/* 이 기기에 있으면 올림(이 기기가 이김) · 없으면 계정 것을 받아 둠 · 열쇠 없는 서버(off)면 아무것도 안 함 */
export async function fmeSync() {
  if (!fmeAllowed() || !fmeOn()) return null;
  const local = localStorage.getItem(MEK);
  try {
    if (local) { if (local === FME.last) return { same: true }; const r = await call({ act: 'me', sub: 'put', me: JSON.parse(local) }); if (r.off) FME.off = true; else FME.last = local; return r; }
    const r = await call({ act: 'me', sub: 'get' }); if (r.off) { FME.off = true; return r; }
    if (r.me && !localStorage.getItem(MEK)) { localStorage.setItem(MEK, JSON.stringify(r.me)); FME.last = localStorage.getItem(MEK); if (Z.redraw) Z.redraw('fme'); }
    return r;
  } catch { return null; }
}
/* 계정에 저장된 내 정보 지우기 (설정 · 점방 '내 정보 지우기') */
export const fmeDel = () => (fmeAllowed() ? call({ act: 'me', sub: 'del' }).then(() => { FME.last = ''; return true; }, () => false) : Promise.resolve(false));
