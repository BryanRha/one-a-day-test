// ⑤ 상호작용 규칙표 (DESIGN 6-1) — 「손 상태 × 닿는 곳 → 일」 표 하나를 사장 · 직원이 같이 써요
//   지나가며 되는 일만 여기 (멈출 필요 없음) · 돈 쓰는 칸(멈춰서 붓기)은 pads.js · 책상 카드는 desk.js
//   표 순서: 시간 없는 일(돈 · 계산 자리 · 깨우기 · 통화)은 늘 함께 · 손이 바뀌는 일은 앞에서부터 하나만
//   누가: 사장은 전부 · 직원은 data.js STAFF[역할].can · ownerOnly = 사장만 · hand(h): 손 상태 조건 · near(g, a): 닿는 곳 목록 [{ x, z, r, ... }] · every: 한 개에 걸리는 초 · act: 한 번 일어나는 일
import { R } from './space.js?v=0.99.29';
import { STAFF, CHAIN } from './data.js?v=0.99.29';
/* 누가 하나: 사장은 모든 일 · 직원은 data.js STAFF[역할].can 에 적힌 일만 (역할 목록을 규칙마다 따로 적지 않음) */
export const canDo = (a, id) => a.role === 'owner' || (!RULES.find(r => r.id === id)?.ownerOnly && (STAFF[a.role]?.can || []).includes(id));
export const FOOD = ['bagel', 'cream', 'coffee', 'drink'];
export const STILL_EXIT = 0.6;   /* 출구(되돌려 놓기 · 버리기)는 손 떼고 0.6초 서 있을 때만 — 지나가다 잘못 버리지 않음 */
const isFood = k => FOOD.includes(k);
export const hand = a => { const n = a.stack.length, trash = a.stack.some(s => s.k === 'trash'); return { n, trash, food: n && !trash, empty: !n, full: n >= a.cap }; };
export const RULES = [
  { id: 'cash', ownerOnly: true, every: 0, hand: () => true,
    near: g => g.piles.filter(p => p.v > 0 && !p.up).map(p => ({ x: p.x, z: p.z, r: 160, p })), act: (g, a, t) => g.collect(t.p) },
  { id: 'till', ownerOnly: true, every: 0, hand: () => true,
    near: g => g.own('counter') && !g.hasStaff('cashier') ? [{ x: g.sp.counter.till[0], z: g.sp.counter.till[1], r: 60 }] : [], act: (g, a) => { g.tillBy = a; } },
  { id: 'wake', ownerOnly: true, every: 0, hand: () => true,
    near: g => g.staff.filter(w => w.rest).map(w => ({ x: w.pos.x, z: w.pos.z, r: 150, w })), act: (g, a, t) => g.wake(t.w) },
  { id: 'phone', ownerOnly: true, every: 0, hand: () => true,
    near: g => g.cust.filter(c => c.phone).map(c => ({ x: c.pos.x, z: c.pos.z, r: 150, c })), act: (g, a, t, dt) => g.phoneNear(t.c, dt) },
  /* 멈춰 서서 하는 출구 (사장만 · 0.4.3): 쓸 곳 없는 물건(진열 가득 · 받는 곳 가득 — g.useful)을 든 채 그 물건이 나온 받침 앞에 0.6초 서 있으면 되돌려 놓음 · 쓰레기통 앞 0.6초 = 버림
     둘 다 발밑에 링이 차오름(game.exitRing) · 쓸 곳 없는 물건은 받침에서 더 안 집음(다가가면 다시 채워지는 역동작 없음) — 손 상태가 어떻든 늘 빠져나감 (gate_hand) */
  { id: 'back', ownerOnly: true, every: 0.12, hand: h => h.food,
    near: g => g.trayPoints().map(t => ({ ...t, r: 80 })), ok: (g, a, t) => (a.backLatch || a.still >= STILL_EXIT) && !a.input && g.backRoom(a, t), act: (g, a, t) => { a.backLatch = 1; g.backToTray(a, t); } },
  { id: 'discard', ownerOnly: true, every: 0.12, hand: h => h.food,
    near: g => [{ x: g.sp.bin.at[0], z: g.sp.bin.at[1], r: 90 }], ok: (g, a) => a.still >= STILL_EXIT && !a.input, act: (g, a) => g.discard(a) },
  { id: 'pick', every: 0.12, hand: h => !h.trash && !h.full,
    near: (g, a) => g.trays(a).map(t => ({ ...t, r: 80 })), ok: (g, a, t) => g.trayCount(t.id) > 0 && !a.backLatch && (a.role === 'owner' ? g.useful(g.nodes[t.id].tray.at(-1).k) : (!!a.want && a.job?.from === t.id)),   /* 직원은 가져간 일(want)의 물건만 집음 — 일 없이 손이 차는 일 없음 */ act: (g, a, t) => g.takeFromTray(a, t.id) },
  /* 받는 곳 (DESIGN 3-0 · CHAIN): 받는 물건을 들고 지나가면 한 개씩 — 사장은 아무 받는 곳 · 직원은 가져간 feed 일의 받는 곳만 */
  { id: 'feed', every: 0.12, hand: h => h.food,
    near: g => Object.keys(CHAIN).filter(id => CHAIN[id].in && g.own(id) && g.sp.nodes[id]?.in).map(id => ({ id, x: g.sp.nodes[id].in[0], z: g.sp.nodes[id].in[1], r: 80 })), ok: (g, a, t) => g.canFeed(a, t.id) && (a.role === 'owner' || (a.job?.to === 'feed' && a.job.node === t.id)), act: (g, a, t) => g.feed(a, t.id) },
  { id: 'place', every: 0.10, hand: h => h.food,
    near: g => g.own('counter') ? [{ x: g.sp.counter.drop[0], z: g.sp.counter.drop[1], r: g.sp.counter.dropR }] : [], ok: (g, a) => g.canDisplay(a), act: (g, a) => g.putOnDisplay(a) },
  { id: 'shelf', every: 0.10, hand: h => h.food,
    near: g => g.window && g.own(g.sp.feat) ? [{ x: g.sp.window.shelf[0], z: g.sp.window.shelf[1], r: 85 }] : [], ok: (g, a) => g.shelfWants(a), act: (g, a) => g.putOnShelf(a) },
  { id: 'fetch', every: 0.12, hand: h => !h.trash && !h.full,
    near: g => g.own('counter') ? [{ x: g.sp.counter.fetch[0], z: g.sp.counter.fetch[1], r: 70 }] : [], ok: (g, a) => a.role === 'owner' ? !!g.winFetchKind(a) : !!a.want && g.dispCount(a.want) > 0, act: (g, a) => g.takeFromDisplay(a, a.role === 'owner' ? g.winFetchKind(a) : a.want) },   /* 사장: 창구 직원이 없을 때 꺼내는 자리에 0.4초 서면 창구가 기다리는 메뉴를 꺼냄 (0.4.3 K8) */
  { id: 'trash_pick', every: 0.15, hand: h => h.empty || (h.trash && !h.full),
    near: g => g.trashSpots(), ok: (g, a, t) => g.tableTrash(t.id) > 0, act: (g, a, t) => g.takeTrash(a, t.id) },
  { id: 'trash_drop', every: 0.08, hand: h => h.trash,
    near: g => [{ x: g.sp.bin.at[0], z: g.sp.bin.at[1], r: 90 }], act: (g, a) => g.dropTrash(a) },
];
/* 한 사람의 한 프레임: 범위 안 규칙을 표 순서대로 · 규칙마다 따로 시간 (집으면서 돈 줍기 같은 동시 동작 허용) */
export function applyRules(g, a, dt) {
  const h = hand(a); a.cool ||= {}; a.doing = null; if (a.role === 'owner' && a.still < 0.05) a.backLatch = 0;   /* 움직이면 「되돌려 놓는 중」 풀림 */
  for (const R0 of RULES) { if (!canDo(a, R0.id)) continue; if (!R0.hand(h)) { a.cool[R0.id] = 0; continue; }
    const ts = R0.near(g, a); let hit = null; for (const t of ts) { if (Math.hypot(a.pos.x - t.x, a.pos.z - t.z) <= t.r && (!R0.ok || R0.ok(g, a, t))) { hit = t; break; } }
    if (!hit) { a.cool[R0.id] = 0; continue; }
    a.doing = R0.id;
    if (!R0.every) { R0.act(g, a, hit, dt); continue; }
    a.cool[R0.id] = (a.cool[R0.id] || 0) + dt;
    while (a.cool[R0.id] >= R0.every) { a.cool[R0.id] -= R0.every; const h2 = hand(a); if (!R0.hand(h2) || (R0.ok && !R0.ok(g, a, hit))) break; R0.act(g, a, hit); }
    return;   /* 손이 바뀌는 일은 한 번에 하나 */ }
}
export { isFood, R };
