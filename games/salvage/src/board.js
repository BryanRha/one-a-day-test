// 판 의뢰 (M3-C · v0.6) — 본 사슬(econ.questNow · 순서대로 하나씩)과 따로, 은신처에 와 있는 인물이 주는 의뢰가 여러 개 함께 열림
//  데이터 = data/quests.js BOARD · 대사 = talk/common.js QTALK · 화면 = story_ui.js (의뢰 탭 '인물 의뢰' · 결과 화면 금빛 카드)
//  three · DOM 없음 → node 시험(tools/test_logic.mjs)에서도 씀
//  저장: S.quests.board = { prog: { 의뢰: 누적 }, rep: { 반복 의뢰: 끝낸 주 } } (salvage_v4 그대로 · 없으면 여기서 만듦) · 끝낸 판 의뢰 id 는 S.quests.done 에 같이 들어감
import { ITEMS, MAPS, ENEMIES, MATS, CONDS } from './data.js?v=0.99.43';
import * as D from './data.js?v=0.99.43'; /* D.MAP_GEAR (M4-B 맵 장비 — 없으면 그 의뢰는 안 보임) */
import { BOARD, QBY } from './data/quests.js?v=0.99.43';
import * as ST from './story.js?v=0.99.43';

export { BOARD, QBY };
/* v0.7 공통 판 상태 5 (M4-B data/weather.js WX_KEYS 와 같은 키 — ROADMAP M4 고정) · 판 결과 res.wx 로 옴 */
export const WX5 = new Set(['night', 'storm', 'fog', 'cold', 'toxic']);
export const ACTIVE_MAX = 4;   /* 한 번에 보이는 인물 의뢰 (반복 납품은 따로) */
const HOME_GOALS = new Set(['deliver', 'fac', 'weapon', 'mod', 'gear', 'codex', 'tapes', 'graf', 'beat', 'pay', 'rebuild', 'endings']); /* M5-A pay(조개 내기) · rebuild(은포 되살리기) · endings(본 엔딩 길) */
/* 은신처 버튼으로 끝내는 것 (납품 · 조개 내기) */
export const BUTTON = new Set(['deliver', 'pay']);
export const isHome = q => HOME_GOALS.has(q.goal.t);
/* 한국 날짜 → 주 번호 (월요일 시작) */
export const weekOf = d => Math.floor((Date.parse(d) / 864e5 + 3) / 7);

export function board(S) {
  const Q = S.quests || (S.quests = { done: [], prog: 0 }); let b = Q.board;
  if (!b || typeof b !== 'object') b = Q.board = { prog: {}, rep: {} };
  if (!b.prog || typeof b.prog !== 'object') b.prog = {}; if (!b.rep || typeof b.rep !== 'object') b.rep = {};
  for (const k of Object.keys(b.prog)) if (!QBY[k]) delete b.prog[k];
  for (const k of Object.keys(b.rep)) if (!QBY[k]?.repeat) delete b.rep[k];
  return b;
}
const doneList = S => S.quests?.done || [];
export const isDone = (S, q, today) => (q.repeat ? board(S).rep[q.id] === (q.repeat === 'day' ? today : weekOf(today)) : doneList(S).includes(q.id)); /* M5-A repeat 'day' = 매일 */

/* 열리는 조건 — 의뢰인이 와 있어야(합류 전 인물은 말하지 않음 · story.present) · 튜토리얼 뒤 · 지도/적 키가 게임에 있어야 */
export function reqMet(S, q) {
  const st = S.story; if (!st || st.tut < 4) return false;
  if (!q.auto && !ST.present(S, q.giver)) return false;
  const r = q.req || {}; const d = doneList(S);
  if (r.q && !d.includes(r.q)) return false;
  if (r.prev && !d.includes(r.prev)) return false;
  if (r.beat && !st.beatsDone[r.beat]) return false;
  if (r.end && !(st.ending || st.ended)) return false; /* M5-A 엔딩 뒤 */
  if (r.ch && ST.chapter(S) < r.ch) return false;
  if (r.fac && (S.fac?.[r.fac[0]] || 0) < r.fac[1]) return false;
  if (r.map && !MAPS[r.map]) return false;
  if (r.enemy && !ENEMIES[r.enemy]) return false;
  const g = q.goal; if (g.map && !MAPS[g.map]) return false; if (g.item && !ITEMS[g.item]) return false;
  if (g.kind && !ENEMIES[g.kind]) return false;
  if (g.mg && !D.MAP_GEAR?.[g.k]) return false;
  /* v0.7 날씨 의뢰(M4-B 판 상태): 고른 상태 중 게임에 있는 게 하나도 없으면 안 보임 (지도가 정해진 의뢰는 그 지도의 상태로) */
  if (g.conds && !g.conds.some(c => (g.map && MAPS[g.map].conds?.[c]) || WX5.has(c) || (!g.map && CONDS[c]))) return false;
  return true;
}
export const available = (S, today) => BOARD.filter(q => !isDone(S, q, today) && reqMet(S, q));
/* 지금 진행 중인 것: 인물 의뢰 앞에서 4개 + 반복 납품 전부 (auto 는 카드 없이 조건만) */
/* 열린 이야기 걸음이 기다리는 판 의뢰(goal.t 'quest' — 4장 q59 · q60)와 그 앞 의뢰는 늘 앞으로 (네 칸 뒤에 밀려 이야기가 막히지 않게) */
function beatWants(S) {
  const out = new Set(); let id = ST.openBeat(S)?.goal?.t === 'quest' ? ST.openBeat(S).goal.q : null;
  for (let g = 0; id && QBY[id] && g < 6; g++) { out.add(id); id = QBY[id].req?.prev; }
  return out;
}
export function active(S, today) {
  const bw = beatWants(S); const av = available(S, today).sort((a, b) => bw.has(b.id) - bw.has(a.id)); const once = av.filter(q => !q.repeat && !q.auto).slice(0, ACTIVE_MAX);
  return [...once, ...av.filter(q => q.repeat)];
}
export const waiting = (S, today) => Math.max(0, available(S, today).filter(q => !q.repeat && !q.auto).length - ACTIVE_MAX);

/* 진행 { cur, n } */
const stashN = (S, k) => (S.stash || []).filter(x => x === k).length;
export function progress(S, q) {
  const g = q.goal; const b = board(S); const st = S.story || {};
  switch (g.t) {
    case 'kill': case 'boss': return { cur: Math.min(g.n, b.prog[q.id] || 0), n: g.n };
    case 'deliver': return { cur: Math.min(g.n, g.mat ? (S.mats?.[g.mat] || 0) : stashN(S, g.item)), n: g.n };
    case 'fac': return { cur: Math.min(g.lv, S.fac?.[g.k] || 0), n: g.lv };
    case 'weapon': return { cur: S.weapons?.[g.k] ? 1 : 0, n: 1 };
    case 'mod': { let n = 0; for (const w of Object.values(S.weapons || {})) for (const v of Object.values(w || {})) if (typeof v === 'number') n += v; return { cur: Math.min(g.n, n), n: g.n }; }
    case 'gear': return { cur: Math.min(g.lv, S.gear?.[g.k] || 0), n: g.lv };
    case 'codex': return { cur: Math.min(g.n, ST.CODEX_KEYS.filter(k => st.codex?.[k]).length), n: g.n };
    case 'tapes': return { cur: Math.min(g.n, (st.tapes || []).length), n: g.n };
    case 'graf': return { cur: Math.min(g.n, (st.graf || []).length), n: g.n };
    case 'beat': return { cur: st.beatsDone?.[g.id] ? 1 : 0, n: 1 };
    case 'pay': return { cur: Math.min(g.n, Math.max(0, Math.floor(S.shells || 0))), n: g.n };
    case 'rebuild': return { cur: Math.min(g.n, st.rebuild || 0), n: g.n };
    case 'endings': return { cur: Math.min(g.n, Object.keys(st.endings || {}).length), n: g.n };
    default: return { cur: 0, n: 1 };
  }
}

/* 끝내기: 보상 · 의뢰인과 사이 +1 · 지도 여는 의뢰면 그 지도의 해금 키도 done 에 (M3-B 'map_factory') */
function give(S, r) {
  for (const [k, n] of Object.entries(r || {})) {
    if (k === 'cos') { S.owned ||= []; if (S.owned.includes(n)) S.shells += 150; else S.owned.push(n); }
    else if (k === 'rebuild') { if (S.story) S.story.rebuild = (S.story.rebuild || 0) + n; } /* M5-A 은포 되살리기 */
    else if (k === 'shells') S.shells += n; else if (k in MATS) S.mats[k] = (S.mats[k] || 0) + n; else if (ITEMS[k]) for (let i = 0; i < n; i++) S.stash.push(k);
  }
}
export function complete(S, q, today) {
  const b = board(S); const d = S.quests.done;
  if (q.repeat) b.rep[q.id] = q.repeat === 'day' ? today : weekOf(today); else if (!d.includes(q.id)) d.push(q.id);
  const u = q.map && MAPS[q.map]?.unlock; if (u && u !== q.id && !d.includes(u)) d.push(u);
  delete b.prog[q.id]; give(S, q.reward); if (S.story && ST.CAST[q.giver]) ST.addRel(S, q.giver, 1);
  return q;
}

/* 판 뒤 (story_ui.afterRaid — 이야기 물건을 도감으로 빼기 전에) → 끝낸 판 의뢰 */
export function boardRaid(S, res, today) {
  const out = []; const rm = res.map || 'ware'; const ex = res.outcome === 'extract'; const b = board(S);
  const kept = ex ? [...(res.items || []), ...(res.safe || []), ...(res.pet || [])] : [];
  for (const q of active(S, today)) {
    const g = q.goal; if (isHome(q) || (g.map && g.map !== rm)) continue; let done = false;
    const wx = res.wx || res.weather; const condOk = !g.conds || g.conds.includes(res.cond) || (!!wx && g.conds.includes(wx)); /* v0.7 판 상태 5(M4-B — 지도 상태와 따로 옴)도 */
    if (g.t === 'extract') done = ex;
    else if (g.t === 'zone') done = ex && res.zoneMax >= g.zone && condOk;
    else if (g.t === 'power') done = ex && !!res.power;
    else if (g.t === 'value') done = ex && res.value >= g.n;
    else if (g.t === 'cond') done = ex && condOk;
    else if (g.t === 'carry') done = ex && kept.includes(g.item);
    else if (g.t === 'kill') { const k = Object.entries(res.kills || {}).reduce((s, [e, n]) => s + (g.kind ? (e === g.kind ? n : 0) : g.fac ? (ENEMIES[e]?.fac === g.fac ? n : 0) : 0), 0); b.prog[q.id] = (b.prog[q.id] || 0) + k; done = b.prog[q.id] >= g.n; }
    else if (g.t === 'boss') { if ((res.kills?.boss || 0) > 0 && condOk) b.prog[q.id] = (b.prog[q.id] || 0) + res.kills.boss; done = (b.prog[q.id] || 0) >= g.n; }
    if (done) out.push(complete(S, q, today));
  }
  return out;
}
/* 은신처에서 확인 (시설 · 무기 · 장비 · 도감 · 녹음기 · 낙서 · 이야기 걸음) — 카드 없는 auto 도 */
export function boardTick(S, today) {
  const out = [];
  for (let guard = 0; guard < 6; guard++) {
    const list = [...active(S, today), ...available(S, today).filter(q => q.auto)].filter(q => isHome(q) && !BUTTON.has(q.goal.t));
    const q = list.find(x => { const p = progress(S, x); return p.cur >= p.n; }); if (!q) break;
    out.push(complete(S, q, today));
  }
  return out;
}
export function boardDeliver(S, id, today) {
  const q = QBY[id]; if (!q || !BUTTON.has(q.goal.t) || !active(S, today).includes(q)) return { ok: false, why: 'none' };
  const g = q.goal; const p = progress(S, q); if (p.cur < p.n) return { ok: false, why: 'cost' };
  if (g.t === 'pay') S.shells -= g.n; /* M5-A 조개 쓰는 곳 */
  else if (g.mat) S.mats[g.mat] -= g.n; else for (let i = 0; i < g.n; i++) S.stash.splice(S.stash.indexOf(g.item), 1);
  return { ok: true, q: complete(S, q, today) };
}
/* 판에 넣을 이야기 물건 (금빛 고리 상자): 진행 중인 carry 판 의뢰 중 이 지도 것 */
export const boardWants = (S, map, today) => active(S, today).filter(q => q.goal.t === 'carry' && q.goal.map === map).map(q => ({ item: q.goal.item, zone: q.goal.zone, q: q.id }));
/* 창고 물건 중 지금 납품할 수 있는 판 의뢰 (의뢰 탭 점) */
export const deliverReady = (S, today) => active(S, today).some(q => q.goal.t === 'deliver' && progress(S, q).cur >= q.goal.n); /* 조개 내기(pay)는 점 안 띄움 — 조르지 않음 */
