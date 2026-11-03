// 저장 — 기기(localStorage) 한 덩어리 · 원어데이 소장자는 같은 키를 계정 클라우드로 (catalog.js SAVES: hanson: ['hanson_v1'])
import { keyOf, parse } from './engine.js?v=0.97.0';
export const KEY = 'hanson_v1';
const Q = new URLSearchParams(location.search);
const NOSAVE = Q.get('nosave') === '1';
/* 시험용: ?day=2026-11-03 로 날짜를 바꿔 봄 · 봇은 window.__setDay 로 바꿈 */
let fixed = Q.get('day');
export const setDay = k => { fixed = k; };
export const today = () => (fixed ? fixed : keyOf(new Date()));

function fresh() {
  return {
    v: 1, first: today(), coins: 0, rep: { dan: 0, gol: 0, pa: 0 },
    days: {},        /* 날짜: { id, choice, grade, offer, found, asked, ledger, coins, replay } — 본 손님 */
    weeks: {},       /* 주 번호: { rep: {dan,gol,pa} (그 주에 오른 만큼), settled, unlocked, doubled } */
    shop: {},        /* 날짜: { slots: [{ kind: 'alley'|'main', id, rec }], ad, gold, settled } — 하루 영업 (무료 4명 + 영업 연장) */
    alleySeen: {},   /* 골목 손님 id: 만난 날 (2주 안 다시 안 옴) */
    xp: 0,           /* 감정사 경험치 → 등급 · 도구 */
    met: {},         /* 얼굴: 만난 횟수 */
    last: {},        /* 얼굴: 지난번 들고 온 물건 이름 (다시 오면 한 줄) */
    deco: { own: {}, on: { sign: 'wood', fur: 'base' } },
    set: { sfx: true, bgm: true, haptic: true },
    tut: 0, warm: 0, helpDay: null, plays: 0, prog: null,
  };
}
export let S = fresh();
export function load() {
  try { const raw = NOSAVE ? null : localStorage.getItem(KEY); if (raw) { const o = JSON.parse(raw); if (o && o.v === 1) S = Object.assign(fresh(), o, { set: { ...fresh().set, ...(o.set || {}) }, deco: { ...fresh().deco, ...(o.deco || {}), on: { ...fresh().deco.on, ...((o.deco || {}).on || {}) } } }); } } catch { S = fresh(); }
  if (parse(S.first) > parse(today())) S.first = today();
  return S;
}
let tm = 0;
export function save(now = false) {
  if (NOSAVE) return;
  const w = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 저장 공간 부족 등 — 게임은 계속 */ } };
  clearTimeout(tm); if (now) w(); else tm = setTimeout(w, 200);
}
export function reset() { S = fresh(); save(true); }
export const week = n => S.weeks[n] || (S.weeks[n] = { rep: { dan: 0, gol: 0, pa: 0 }, settled: false, unlocked: false, doubled: false });
export const shopDay = k => S.shop[k] || null;
addEventListener('pagehide', () => save(true));
addEventListener('visibilitychange', () => { if (document.hidden) save(true); });
