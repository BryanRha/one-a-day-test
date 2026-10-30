// 저장 — 기기(localStorage) 한 덩어리 · 원어데이 소장자는 같은 키를 계정 클라우드로 (catalog.js SAVES: diary: ['oad_diary_v1'])
import { TOOLS_DAILY, PAGES } from './data.js?v=0.93.4';
export const KEY = 'oad_diary_v1';
const Q = new URLSearchParams(location.search);
const NOSAVE = Q.get('nosave') === '1';

export const pad = n => String(n).padStart(2, '0');
export const dayKey = (d = today()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/* 시험용: ?day=2026-11-03 처럼 날짜를 바꿔 볼 수 있음 */
export function today() { const q = Q.get('day'); if (q) { const [y, m, d] = q.split('-').map(Number); return new Date(y, m - 1, d, 12); } return new Date(); }
export const parseDay = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };

function fresh() {
  return {
    v: 1, first: dayKey(), days: {}, drawer: {}, seen: {}, notes: {}, owned: {}, map: 0, free: 0, plays: 0,
    tools: { ...TOOLS_DAILY }, toolsDay: dayKey(), fails: {}, help: 0, sound: true, foil: false,
  };
}
export let S = fresh();
export function load() {
  try { const raw = NOSAVE ? null : localStorage.getItem(KEY); if (raw) { const o = JSON.parse(raw); if (o && o.v === 1) S = Object.assign(fresh(), o); } } catch { S = fresh(); }
  /* 날이 바뀌면 오늘 무료 도구 다시 채움 (가진 게 더 많으면 그대로) */
  if (S.toolsDay !== dayKey()) { for (const [k, n] of Object.entries(TOOLS_DAILY)) S.tools[k] = Math.max(S.tools[k] || 0, n); S.toolsDay = dayKey(); }
  return S;
}
let tm = 0;
export function save(now = false) {
  if (NOSAVE) return;
  const w = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 저장 공간 부족 등 — 게임은 계속 */ } };
  clearTimeout(tm); if (now) w(); else tm = setTimeout(w, 200);
}
export function reset() { S = fresh(); save(true); }

/* 오늘 페이지 */
export function day(k = dayKey()) { return S.days[k] || (S.days[k] = { wins: 0, got: [], stickers: [], done: false }); }
/* 놓친 날: 처음 연 날부터 어제까지 중 페이지를 못 만든 날 (벌 없음 · 표시만) */
export function missedDays(limit = 60) {
  const out = []; const t = parseDay(dayKey()); const f = parseDay(S.first);
  for (let i = 1; i <= limit; i++) { const d = new Date(t); d.setDate(t.getDate() - i); if (d < f) break; const k = dayKey(d); if (!S.days[k]?.done) out.push(k); }
  return out;
}

/* 스티커 서랍 */
export function give(id, n = 1) { S.drawer[id] = (S.drawer[id] || 0) + n; S.seen[id] = 1; }
export function take(id) { if (!(S.drawer[id] > 0)) return false; S.drawer[id]--; return true; }

/* 노트 */
export function note(id) { return S.notes[id] || (S.notes[id] = { pages: Array.from({ length: PAGES }, () => []), cur: 0, done: false }); }
