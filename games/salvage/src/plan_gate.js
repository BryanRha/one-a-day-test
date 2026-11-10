// 6장 최종 무대 '대수문 꼭대기' 배치 (M5-A) — three 없이 (시험 · 시뮬에서도 씀) · plan.js 가 map === 'gate' 면 이걸 돌려줌
//  고정 무대: 승강로(3열 가운데 · 3행) → 대수문 계단(2행 · 경비 기계 · 수리 드론) → 꼭대기 무대(1행 + 0행을 문 넷으로 터서 16 × 32m 한 마당 · 파수)
//  plan.js 와 같은 모양(rooms · links · doors · exits · props · loots · enemies · waters · spawn · boss · generator …)이라 map.js · raid.js 가 그대로 그림
//  · 출구 둘: 승강로 승강기(늘 열림 — 물러나기) · 꼭대기 구조 보트(파수를 쓰러뜨리면 열림) — 둘 다 'sub' 버티기 6초 · gate.js 가 조건을 붙임
//  · 발전기는 지도 밖(무대에 없음 — map.js 가 늘 그리는 것을 바다 밖으로)
const T = 4, RT = 4, COLS = 3, RS = T * RT, ROWS = 7;
const zoneOfRow = r => (r >= 5 ? 1 : r >= 2 ? 2 : 3);
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
export const GATE_ARENA = { x0: 16, x1: 32, z0: 0, z1: 32, enterZ: 29.5 }; /* 무대 = 1 · 0행 · 이 z 보다 위로 오면 파수가 깨어남 */

export function planGate(seed, opt = {}) {
  const R = rng(seed * 7 + 19); const id = (c, r) => r * COLS + c;
  const mk = (c, r, type) => ({ id: id(c, r), c, r, zone: zoneOfRow(r), x0: c * RS, z0: r * RS, type });
  const entry = mk(1, 3, 'gentry'), stair = mk(1, 2, 'gstair'), arena = mk(1, 1, 'garena'), top = mk(1, 0, 'gtop');
  const rooms = [entry, stair, arena, top];
  const links = [[entry.id, stair.id, null], [stair.id, arena.id, null], [arena.id, top.id, null], [arena.id, top.id, null], [arena.id, top.id, null], [arena.id, top.id, null]];
  const vdoor = (A, B, t) => ({ x: A.c * RS + t * T + T / 2, z: Math.max(A.r, B.r) * RS, axis: 'x', a: A.id, b: B.id, lock: null });
  const doors = [vdoor(entry, stair, 1 + (R() < 0.5 ? 0 : 1)), vdoor(stair, arena, 1 + (R() < 0.5 ? 0 : 1)), vdoor(arena, top, 0), vdoor(arena, top, 1), vdoor(arena, top, 2), vdoor(arena, top, 3)];
  const spawn = { x: entry.x0 + RS / 2, z: entry.z0 + RS - 4 };
  const exits = [
    { kind: 'sub', gate: 'retreat', room: entry.id, zone: entry.zone, x: entry.x0 + 3.6, z: entry.z0 + RS - 3.2 },
    { kind: 'sub', gate: 'top', room: top.id, zone: top.zone, x: top.x0 + RS - 3.4, z: top.z0 + 3.2 },
  ];
  const boss = { room: top.id, x: top.x0 + RS / 2, z: top.z0 + 5.2 };
  const generator = { room: -1, x: -80, z: -80 };
  /* 엄폐물: 계단 둘 · 무대 넷(파수 앞 가운데 길은 비움 — 줄 공격을 옆으로 피할 자리) */
  const props = [], loots = [], enemies = [], waters = [];
  const cover = (k, x, z, ry = 0) => props.push({ k, x, z, ry, cover: true });
  cover('k_machine', stair.x0 + 3.6, stair.z0 + 6 + R() * 3); cover('k_boxwide', stair.x0 + RS - 3.6, stair.z0 + 5 + R() * 4, Math.PI / 2);
  cover('k_machine', arena.x0 + 3.4, arena.z0 + 7.5); cover('k_machine', arena.x0 + RS - 3.4, arena.z0 + 7.5);
  cover('k_boxwide', arena.x0 + 3.2, top.z0 + RS - 4.5, Math.PI / 2); cover('k_boxwide', arena.x0 + RS - 3.2, top.z0 + RS - 4.5, Math.PI / 2);
  for (const [x, z] of [[stair.x0 + 2.4, stair.z0 + 13], [arena.x0 + 13.5, arena.z0 + 13], [top.x0 + 2.4, top.z0 + 9.5], [top.x0 + 13.6, top.z0 + 11]]) props.push({ k: R() < 0.5 ? 'k_pipe' : 'k_bucket', x, z, ry: R() * 6.28, deco: true });
  /* 뒤질 곳 */
  loots.push({ kind: 'locker', x: entry.x0 + RS - 2.6, z: entry.z0 + 6.5, ry: -Math.PI / 2, zone: 1 });
  loots.push({ kind: 'gstair', x: stair.x0 + RS - 2.4, z: stair.z0 + 12.5, ry: -Math.PI / 2, zone: 2 }); loots.push({ kind: R() < 0.5 ? 'chest' : 'gstair', x: stair.x0 + 2.4, z: stair.z0 + 3.2, ry: Math.PI / 2, zone: 2 });
  loots.push({ kind: 'chest', x: top.x0 + 2.6, z: top.z0 + 2.6, ry: 0, zone: 3 });
  /* 적: 계단 수리 드론 2 + 경비 기계 1 (무대는 파수와 단계 바뀜 때 부르는 드론만) */
  enemies.push({ kind: 'drone', x: stair.x0 + 5 + R() * 2, z: stair.z0 + 5, room: stair.id, zone: 2, elite: false });
  enemies.push({ kind: 'drone', x: stair.x0 + 10 + R() * 2, z: stair.z0 + 9, room: stair.id, zone: 2, elite: false });
  enemies.push({ kind: 'warden', x: stair.x0 + RS / 2, z: stair.z0 + 3.5, room: stair.id, zone: 2, elite: false });
  /* 비 고인 자리 */
  for (let n = 0; n < 5; n++) waters.push({ x: arena.x0 + 3 + R() * (RS - 6), z: 3 + R() * 26, rx: 1.4 + R() * 1.6, rz: 1.2 + R() * 1.4 });
  const dist = { [entry.id]: 0, [stair.id]: 1, [arena.id]: 2, [top.id]: 3 };
  const feat = { lamps: [], airs: [], currents: [], flooded: [], blocks: [], cars: [], lighthouse: null, belts: [], vents: [], molten: [], camps: [], terms: [], moss: [] };
  return { seed, rooms, links, doors, exits, props, loots, enemies, waters, spawn, dist, start: entry.id, vault: -1, bossRoom: top.id, generator, boss, zones: { 1: [], 2: [entry.id, stair.id], 3: [arena.id, top.id] }, W: COLS * RS, H: ROWS * RS,
    map: 'gate', cond: opt.cond && opt.cond !== 'gale' ? 'gale' : 'gale', arena: GATE_ARENA, ...feat };
}
