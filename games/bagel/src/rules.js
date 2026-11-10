// ⑤ 상호작용 규칙표 (DESIGN 6-1) — 「손 상태 × 닿는 곳 → 일」 표 하나를 사장 · 직원이 같이 써요
//   지나가며 되는 일만 여기 (멈출 필요 없음) · 돈 쓰는 칸(멈춰서 붓기)은 pads.js · 책상 카드는 desk.js
//   표 순서: 시간 없는 일(돈 · 계산 자리 · 깨우기 · 통화)은 늘 함께 · 손이 바뀌는 일은 앞에서부터 하나만
//   who: 이 일을 하는 사람 · hand(h): 손 상태 조건 · near(g, a): 닿는 곳 목록 [{ x, z, r, ... }] · every: 한 개에 걸리는 초 · act: 한 번 일어나는 일
import { R } from './space.js?v=0.99.20';
export const FOOD = ['bagel', 'cream', 'coffee', 'drink'];
const isFood = k => FOOD.includes(k);
export const hand = a => { const n = a.stack.length, trash = a.stack.some(s => s.k === 'trash'); return { n, trash, food: n && !trash, empty: !n, full: n >= a.cap }; };
export const RULES = [
  { id: 'cash', who: ['owner'], every: 0, hand: () => true,
    near: g => g.piles.filter(p => p.v > 0 && !p.up).map(p => ({ x: p.x, z: p.z, r: 160, p })), act: (g, a, t) => g.collect(t.p) },
  { id: 'till', who: ['owner'], every: 0, hand: () => true,
    near: g => g.own('counter') && !g.hasStaff('cashier') ? [{ x: g.sp.counter.till[0], z: g.sp.counter.till[1], r: 60 }] : [], act: (g, a) => { g.tillBy = a; } },
  { id: 'wake', who: ['owner'], every: 0, hand: () => true,
    near: g => g.staff.filter(w => w.rest).map(w => ({ x: w.pos.x, z: w.pos.z, r: 150, w })), act: (g, a, t) => g.wake(t.w) },
  { id: 'phone', who: ['owner'], every: 0, hand: () => true,
    near: g => g.cust.filter(c => c.phone).map(c => ({ x: c.pos.x, z: c.pos.z, r: 150, c })), act: (g, a, t, dt) => g.phoneNear(t.c, dt) },
  { id: 'pick', who: ['owner', 'runner', 'barista', 'picker'], every: 0.12, hand: h => !h.trash && !h.full,
    near: (g, a) => g.trays(a).map(t => ({ ...t, r: 80 })), ok: (g, a, t) => g.trayCount(t.id) > 0 && (!a.want || a.want === t.k), act: (g, a, t) => g.takeFromTray(a, t.id) },
  { id: 'place', who: ['owner', 'runner', 'barista'], every: 0.10, hand: h => h.food,
    near: g => g.own('counter') ? [{ x: g.sp.counter.drop[0], z: g.sp.counter.drop[1], r: g.sp.counter.dropR }] : [], ok: (g, a) => g.canDisplay(a), act: (g, a) => g.putOnDisplay(a) },
  { id: 'shelf', who: ['owner', 'picker'], every: 0.10, hand: h => h.food,
    near: g => g.window && g.own(g.sp.feat) ? [{ x: g.sp.window.shelf[0], z: g.sp.window.shelf[1], r: 85 }] : [], ok: (g, a) => g.shelfWants(a), act: (g, a) => g.putOnShelf(a) },
  { id: 'fetch', who: ['picker'], every: 0.12, hand: h => !h.trash && !h.full,
    near: g => g.own('counter') ? [{ x: g.sp.counter.drop[0], z: g.sp.counter.drop[1], r: g.sp.counter.dropR }] : [], ok: (g, a) => !!a.want && g.dispCount(a.want) > 0, act: (g, a) => g.takeFromDisplay(a, a.want) },
  { id: 'trash_pick', who: ['owner', 'cleaner'], every: 0.15, hand: h => h.empty || (h.trash && !h.full),
    near: g => g.trashSpots(), ok: (g, a, t) => g.tableTrash(t.id) > 0, act: (g, a, t) => g.takeTrash(a, t.id) },
  { id: 'trash_drop', who: ['owner', 'cleaner'], every: 0.08, hand: h => h.trash,
    near: g => [{ x: g.sp.bin.at[0], z: g.sp.bin.at[1], r: 90 }], act: (g, a) => g.dropTrash(a) },
];
/* 한 사람의 한 프레임: 범위 안 규칙을 표 순서대로 · 규칙마다 따로 시간 (집으면서 돈 줍기 같은 동시 동작 허용) */
export function applyRules(g, a, dt) {
  const h = hand(a); a.cool ||= {}; a.doing = null;
  for (const R0 of RULES) { if (!R0.who.includes(a.role)) continue; if (!R0.hand(h)) { a.cool[R0.id] = 0; continue; }
    const ts = R0.near(g, a); let hit = null; for (const t of ts) { if (Math.hypot(a.pos.x - t.x, a.pos.z - t.z) <= t.r && (!R0.ok || R0.ok(g, a, t))) { hit = t; break; } }
    if (!hit) { a.cool[R0.id] = 0; continue; }
    a.doing = R0.id;
    if (!R0.every) { R0.act(g, a, hit, dt); continue; }
    a.cool[R0.id] = (a.cool[R0.id] || 0) + dt;
    while (a.cool[R0.id] >= R0.every) { a.cool[R0.id] -= R0.every; const h2 = hand(a); if (!R0.hand(h2) || (R0.ok && !R0.ok(g, a, hit))) break; R0.act(g, a, hit); }
    return;   /* 손이 바뀌는 일은 한 번에 하나 */ }
}
export { isFood, R };
