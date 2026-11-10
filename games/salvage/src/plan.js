// 지도 배치 계획 (three 없이 — 봇 · node 시험 · 시뮬에서도 씀) — 침수 창고 · 밤의 항구 · 해저 터널 (v0.4)
//  구역 3단: 아래(입구, 2줄) → 가운데(3줄 · 발전기) → 위(보스 · 금고, 2줄) — 세 지도 모두 같은 뼈대, 지도마다 방 종류 · 적 · 상자 · 특수 물건이 다름
//  ※ 'ware'(침수 창고)는 v0.3 과 같은 seed → 같은 지도 (지난번 쓰러진 자리를 다시 열어야 함) — 새 난수는 다른 지도 갈래 안에서만 뽑음
//  1칸(tile) = 4m · 방 = 4×4칸(16m) · 격자 3열 × 7행 · 아래(+z)가 카메라 쪽 · 시작은 맨 아래 가운데
//  문 잠금: 창고→기관실 '전원 문'(발전기) · 금고실 문(금고 열쇠)
import { ZONES, LOOT_TABLE, MAPS, CONDS, ENEMIES } from './data.js?v=0.99.18';
import { F_COVERS, F_DECOS, F_SOLID, factoryRoom, factoryExits, factorySquad, noAnchor } from './plan_factory.js?v=0.99.18'; /* M3-B 가라앉은 공장 */
import { L_TYPES, L_COVERS, L_DECOS, L_SOLID, labPre, labRoom, labExits, labFoes } from './plan_lab.js?v=0.99.18'; /* M4-B 심해 연구소 */
import { planGate } from './plan_gate.js?v=0.99.18'; /* M5-A 6장 최종 무대 대수문 꼭대기 (고정 무대) */

export const T = 4, RT = 4, COLS = 3, ROWS = 7, RS = T * RT;
export const zoneOfRow = r => (r >= 5 ? 1 : r >= 2 ? 2 : 3);
const ZROWS = { 1: [5, 6], 2: [2, 4], 3: [0, 1] };
export const mix32 = h => { h = h >>> 0; h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

/* 지도별 방 종류 (구역 1 · 2 · 3 · 보스방) — 엄폐물 · 장식 · 바닥이 여기서 갈림 */
const TYPES = {
  ware:   { 1: ['dock', 'storage', 'dock', 'cold'], 2: ['storage', 'office', 'pump', 'cold', 'storage'], 3: ['engine', 'office', 'engine'], boss: 'engine' },
  harbor: { 1: ['pier', 'pier', 'shed', 'pier'], 2: ['yard', 'yard', 'office', 'yard'], 3: ['crane', 'yard', 'crane'], boss: 'crane' },
  tunnel: { 1: ['platform', 'hall', 'platform'], 2: ['track', 'passage', 'track', 'passage'], 3: ['passage', 'control', 'track'], boss: 'reservoir' },
  factory: { 1: ['loading', 'loading', 'store', 'loading'], 2: ['furnace', 'conveyor', 'foundry', 'conveyor', 'workshop'], 3: ['core', 'fcontrol', 'core'], boss: 'crucible' }, /* M3-B 가라앉은 공장 */
  lab: L_TYPES, /* M4-B 심해 연구소 */
};
const COVERS = { dock: ['k_cont_a', 'k_cont_b', 'crates', 'barrels', 'cont'], storage: ['crates', 'k_crate', 'k_boxwide', 'pallet_s', 'box_large'], office: ['table', 'cabinet', 'box_large', 'k_screen'], pump: ['k_machine', 'k_hopper', 'k_tank', 'barrels'], cold: ['crate_r', 'k_crate', 'box_large'], engine: ['k_machine', 'k_tank', 'k_hopper', 'k_boxwide'], vault: ['shelf', 'trunk', 'box_large'],
  pier: ['barrels', 'crates', 'h_cont_c', 'k_cont_a', 'h_tank'], shed: ['crates', 'k_crate', 'box_large', 'h_cont_c'], yard: ['k_cont_a', 'k_cont_b', 'h_cont_c', 'cont', 'crates'], crane: ['k_cont_a', 'h_tank', 'k_machine', 'k_boxwide'],
  platform: ['t_bench', 'cabinet', 'box_large', 't_bench'], hall: ['t_machine', 'box_large', 'cabinet', 't_bench'], track: ['k_crate', 'k_boxwide', 't_machine'], passage: ['t_machine', 'k_tank', 'barrels'], control: ['t_machine', 'k_screen', 'cabinet', 'k_machine'], reservoir: ['k_tank', 't_machine'],
  ...F_COVERS, ...L_COVERS };
const DECOS = { pier: ['h_planks', 'h_fish', 'h_stand', 'k_bucket', 'can_a'], shed: ['bottle_b', 'trunk', 'can_a', 'h_fish'], yard: ['box_a', 'cont_a', 'pallet', 'h_planks'], crane: ['h_magnet', 'k_pipe', 'k_bucket', 'h_planks'],
  platform: ['can_a', 'box_a', 't_lever', 'bottle_b', 't_sign'], hall: ['can_a', 'box_a', 't_sign', 'trunk'], track: ['t_pipe', 'k_bucket', 't_lever', 'can_a'], passage: ['t_pipe', 'k_bucket', 't_lever'], control: ['t_pipe', 't_lever', 'k_screen'], reservoir: ['t_pipe', 'k_bucket'],
  ...F_DECOS, ...L_DECOS };
/* 해저 터널 '좁은 통로': 방 네 모서리 칸(4×4m)을 막아 + 모양 통로(폭 8m)만 남김 — 문(가운데 두 칸)은 늘 통로 위 */
const NARROW = { passage: 1, platform: 1, control: 1 };
export const mapOf = k => MAPS[k] ? k : 'ware';
/* 판정 크기(엄폐물) — 반지름(가로, 세로) · 총알 막음 여부 (map.js 가 그대로 씀 · node 시험의 길 찾기 검사도 같은 값) */
export const SOLID = { h_cont_c: [1.1, 2.4, 1], h_tank: [1.6, 1.5, 1], t_machine: [0.9, 1.2, 1], t_bench: [1.1, 0.45, 0], k_cont_a: [1.15, 2.45, 1], k_cont_b: [1.15, 2.45, 1], k_machine: [0.9, 1.1, 1], k_hopper: [0.9, 0.9, 1], k_tank: [1.7, 1.05, 1], k_boxwide: [0.75, 1.25, 1], k_crate: [0.7, 1.25, 1], k_screen: [0.75, 0.4, 1], crates: [1.1, 1.1, 1], box_large: [0.8, 0.8, 1], pallet_s: [1, 1, 1], barrel: [0.9, 0.9, 1], barrels: [0.95, 0.55, 1], cont: [1.65, 1.65, 1], table: [1, 1, 0], cabinet: [1.05, 0.55, 1], crate_r: [1, 1, 1], keg: [0.9, 1, 1], chest: [0.85, 0.75, 1], locker: [1.05, 0.55, 1], crate: [0.8, 0.8, 1], shelf: [1.4, 0.5, 1], trunk: [0.8, 0.5, 1], ...F_SOLID, ...L_SOLID };

export function plan(seed, mapKey = 'ware', opt = {}) { /* opt.cond: 판 예보로 지도 상태를 정함(항구 — M4-B 판 상태 5) · 없으면 seed 로 */
  if (mapKey === 'gate' && MAPS.gate) return planGate(seed, opt);
  const map = mapOf(mapKey); const ware = map === 'ware'; const MZ = MAPS[map].zones; const TY = TYPES[map];
  const R = rng(seed); const ri = (a, b) => a + Math.floor(R() * (b - a + 1)); const pick = a => a[Math.floor(R() * a.length)];
  const wpick = w => { const tot = Object.values(w).reduce((a, b) => a + b, 0); let r = R() * tot; for (const [k, v] of Object.entries(w)) { r -= v; if (r <= 0) return k; } return Object.keys(w)[0]; };
  const id = (c, r) => r * COLS + c; const cr = k => ({ c: k % COLS, r: Math.floor(k / COLS) });
  const rooms = new Map(); const links = []; /* [a, b, lock?] */
  const inZone = (z, c, r) => c >= 0 && c < COLS && r >= ZROWS[z][0] && r <= ZROWS[z][1];
  const nb = (c, r) => [[c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]];
  const add = (k, from, lock) => { if (!rooms.has(k)) rooms.set(k, cr(k)); if (from != null) links.push([from, k, lock || null]); };
  /* 구역 하나를 나무 모양으로 키움 */
  const grow = (z, seedK, want) => {
    const mine = [seedK]; let guard = 0;
    while (mine.length < want && guard++ < 400) {
      const f = cr(pick(mine)); const [c, r] = pick(nb(f.c, f.r)); if (!inZone(z, c, r)) continue; const k = id(c, r);
      if (rooms.has(k)) continue; add(k, id(f.c, f.r)); mine.push(k);
    }
    return mine;
  };
  /* 구역 안에서 특정 줄까지 길 보장 */
  const reachRow = (z, mine, row) => {
    if (mine.some(k => cr(k).r === row)) return;
    let cur = cr(mine.reduce((a, b) => (Math.abs(cr(b).r - row) < Math.abs(cr(a).r - row) ? b : a)));
    while (cur.r !== row) { const nr = cur.r + (row < cur.r ? -1 : 1); const k = id(cur.c, nr); if (!rooms.has(k)) { add(k, id(cur.c, cur.r)); mine.push(k); } cur = { c: cur.c, r: nr }; }
  };
  /* 1 입구 */
  const start = id(1, 6); add(start);
  const z1 = grow(1, start, ri(4, 5)); reachRow(1, z1, 5);
  const g1from = pick(z1.filter(k => cr(k).r === 5)); const z2seed = id(cr(g1from).c, 4); add(z2seed, g1from, null);
  const gate1 = links.length - 1;
  /* 2 깊은 창고 */
  const z2 = grow(2, z2seed, ri(5, 7)); reachRow(2, z2, 2);
  /* 문 그래프 거리 (잠금 무시) */
  const bfs = (from, allow) => { const d = { [from]: 0 }; const q = [from]; while (q.length) { const k = q.shift(); for (const [a, b] of links) { const o = a === k ? b : b === k ? a : null; if (o != null && d[o] == null && (!allow || allow(o))) { d[o] = d[k] + 1; q.push(o); } } } return d; };
  const d2 = bfs(z2seed, k => z2.includes(k));
  const row2 = z2.filter(k => cr(k).r === 2).sort((a, b) => d2[b] - d2[a]);
  const g2from = row2[0]; const z3seed = id(cr(g2from).c, 1); add(z3seed, g2from, 'power');
  /* 3 기관실 · 금고 */
  const z3 = grow(3, z3seed, ri(4, 5));
  /* 고리 1~2개 (도망 길) — 같은 구역 안에서만 */
  const linked = (a, b) => links.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const loopIn = (zone, n) => { let tries = 0; while (n > 0 && tries++ < 60) { const k = pick(zone); const a = cr(k); const [c, r] = pick(nb(a.c, a.r)); const k2 = id(c, r); if (!zone.includes(k2) || linked(k, k2)) continue; links.push([k, k2, null]); n--; } };
  loopIn(z2, ri(1, 2)); if (z1.length >= 4) loopIn(z1, ri(0, 1));
  /* 금고실: 기관실 구역의 잎(연결 1개) 중 입구에서 가장 먼 곳 (z3seed 제외) */
  const deg = k => links.filter(([a, b]) => a === k || b === k).length;
  const d3 = bfs(z3seed, k => z3.includes(k));
  let leaves = z3.filter(k => k !== z3seed && deg(k) === 1).sort((a, b) => d3[b] - d3[a]);
  let vault = leaves[0];
  if (vault == null) vault = z3.filter(k => k !== z3seed).sort((a, b) => d3[b] - d3[a])[0];
  /* 금고실이 여러 문을 가지면 하나만 남김 (기관실 쪽 가장 가까운 것) */
  const vl = links.filter(([a, b]) => a === vault || b === vault);
  if (vl.length > 1) { const keep = vl.sort((x, y) => d3[x[0] === vault ? x[1] : x[0]] - d3[y[0] === vault ? y[1] : y[0]])[0]; for (const l of vl) if (l !== keep) links.splice(links.indexOf(l), 1); }
  const vlink = links.find(([a, b]) => a === vault || b === vault); vlink[2] = 'vault';
  const bossRoom = vlink[0] === vault ? vlink[1] : vlink[0];
  /* 방 종류 */
  const dist = bfs(start);
  const roomList = [...rooms.entries()].map(([k, v]) => { const zone = zoneOfRow(v.r);
    const type = k === start ? 'entry' : k === vault ? 'vault' : k === bossRoom ? TY.boss : pick(TY[zone]);
    return { id: k, c: v.c, r: v.r, zone, x0: v.c * RS, z0: v.r * RS, type }; });
  const byId = Object.fromEntries(roomList.map(r => [r.id, r]));
  /* 발전기: 깊은 창고에서 입구 수문 · 기관실 문과 먼 방 */
  const genRoom = z2.filter(k => k !== z2seed).sort((a, b) => (d2[b] + (b === g2from ? -2 : 0)) - (d2[a] + (a === g2from ? -2 : 0)))[0] ?? z2seed;
  /* 문: 공유 벽의 가운데 두 칸 중 하나 */
  const doors = links.map(([a, b, lock]) => { const A = byId[a], B = byId[b]; const horiz = A.r === B.r; const t = ri(1, 2);
    return horiz ? { x: Math.max(A.c, B.c) * RS, z: A.r * RS + t * T + T / 2, axis: 'z', a, b, lock } : { x: A.c * RS + t * T + T / 2, z: Math.max(A.r, B.r) * RS, axis: 'x', a, b, lock }; });
  doors[gate1].gate = 'flood';
  /* 출구 3곳 */
  const d1 = bfs(start, k => z1.includes(k));
  const earlyRoom = z1.filter(k => k !== start).sort((a, b) => d1[b] - d1[a] || R() - 0.5)[0] ?? start;
  const powerRoom = z2.filter(k => k !== genRoom && k !== z2seed).sort((a, b) => R() - 0.5)[0] ?? z2seed;
  const subRoom = z3.filter(k => k !== vault && k !== bossRoom).sort((a, b) => d3[b] - d3[a])[0] ?? z3seed;
  const exits = [['early', earlyRoom], ['power', powerRoom], ['sub', subRoom]].map(([kind, k]) => { const r = byId[k]; return { kind, room: k, zone: r.zone, x: r.x0 + RS / 2 + (R() < 0.5 ? -3.5 : 3.5), z: r.z0 + RS / 2 - 3.5 }; });
  if (map === 'factory') factoryExits(exits, byId, doors); /* 컨베이어 반출구(벽 옆 시작 발판 → 반출구) · 크레인 바구니 */
  if (map === 'lab') labExits(exits); /* M4-B 파수 반출 해치 = 관제 터미널 승인 */
  const gr = byId[genRoom]; const generator = { room: genRoom, x: gr.x0 + RS / 2, z: gr.z0 + 4.2 };
  const br = byId[bossRoom]; const boss = { room: bossRoom, x: br.x0 + RS / 2, z: br.z0 + RS / 2 };
  /* 방 안 물건: 4×4 칸 격자에서 문 앞 · 출구 · 발전기 둘레 비우기 */
  const props = [], loots = [], enemies = [], waters = [];
  const keepOut = [...exits.map(e => [e.x, e.z, 4]), ...exits.flatMap(e => e.keep || []), [generator.x, generator.z, 3.2], [boss.x, boss.z, 3]];
  /* v0.4 지도별 특수: 등불(항구) · 좁은 통로 막음 · 화물칸 · 잠긴 방 · 공기 방울 · 물살(터널) · 등대 — 'ware' 는 안 뽑음 */
  const RC = rng(mix32(seed * 31 + 7) || 1); /* 이웃 seed 끼리 상태가 몰리지 않게 섞어서 */ let cond = ware ? 'normal' : (() => { const w = MAPS[map].conds; const tot = Object.values(w).reduce((a, b) => a + b, 0); let r = RC() * tot; for (const [k, v] of Object.entries(w)) { r -= v; if (r <= 0) return k; } return Object.keys(w)[0]; })();
  if (opt.cond && !ware && MAPS[map].conds[opt.cond]) cond = opt.cond;
  const feat = { lamps: [], airs: [], currents: [], flooded: [], blocks: [], cars: [], lighthouse: null, belts: [], vents: [], molten: [], camps: [], terms: [], moss: [] };
  const roomDoors = rm => doors.filter(d => d.a === rm.id || d.b === rm.id);
  const pre = map === 'lab' ? labPre({ R, z2, z3, z2seed, genRoom, vault, bossRoom, exits, doors, links, byId, cond }) : null; /* M4-B 터미널 방 · 수압 문 */
  for (const rm of roomList) {
    const cells = []; for (let j = 0; j < RT; j++) for (let i = 0; i < RT; i++) cells.push([i, j]);
    const free = cells.filter(([i, j]) => !(i >= 1 && i <= 2 && j >= 1 && j <= 2) || R() < 0.25);
    const occ = new Set();
    const nearDoor = (x, z) => doors.some(d => (d.a === rm.id || d.b === rm.id) && Math.hypot(d.x - x, d.z - z) < 4.2);
    const blocked = (x, z) => keepOut.some(([kx, kz, r]) => Math.hypot(kx - x, kz - z) < r);
    const at = (i, j) => [rm.x0 + i * T + T / 2, rm.z0 + j * T + T / 2];
    const take = () => { for (let n = 0; n < 30; n++) { const [i, j] = pick(free); const k = i + ',' + j; if (occ.has(k)) continue; const [x, z] = at(i, j); if (nearDoor(x, z) || blocked(x, z)) continue; occ.add(k); return [x + (R() - 0.5) * 1.2, z + (R() - 0.5) * 1.2]; } return null; };
    /* 물웅덩이 (입구 쪽 많음) */
    const nw = ware ? (rm.type === 'dock' ? 3 : rm.type === 'pump' || rm.type === 'engine' ? 2 : rm.zone === 1 ? ri(1, 2) : ri(0, 1)) : rm.type === 'pier' ? 4 : rm.zone === 1 ? ri(1, 2) : ri(0, 1);
    for (let n = 0; n < nw; n++) waters.push({ x: rm.x0 + 3 + R() * (RS - 6), z: rm.z0 + 3 + R() * (RS - 6), rx: 2 + R() * 2.5, rz: 1.6 + R() * 2 });
    if (!ware) {
      const hasExit = exits.some(e => e.room === rm.id) || rm.id === genRoom;
      if (map === 'tunnel') {
        if (NARROW[rm.type]) for (const [i, j] of [[0, 0], [3, 0], [0, 3], [3, 3]]) { occ.add(i + ',' + j); const [x, z] = at(i, j); feat.blocks.push({ x, z, room: rm.id }); }
        if (rm.type === 'track' && !hasExit) { const D = roomDoors(rm).filter(d => d.axis === 'z'); const left = D.some(d => Math.abs(d.x - rm.x0) < 0.1), right = D.some(d => Math.abs(d.x - rm.x0 - RS) < 0.1);
          const col = !left ? 0 : !right ? 3 : -1; if (col >= 0) { occ.add(col + ',1'); occ.add(col + ',2'); feat.cars.push({ x: rm.x0 + col * T + T / 2, z: rm.z0 + RS / 2, room: rm.id }); } }
        if (rm.id !== start && (rm.id === bossRoom || (rm.zone === 2 && R() < 0.5) || (rm.zone === 3 && R() < 0.7))) feat.flooded.push(rm.id);
        const wet = feat.flooded.includes(rm.id);
        if ((wet && rm.id !== bossRoom) || (rm.zone === 1 && rm.id !== start && R() < 0.5)) { const p = take(); if (p) feat.airs.push({ x: p[0], z: p[1], room: rm.id }); }
        if (rm.id !== start && rm.type !== 'vault' && rm.id !== bossRoom && !hasExit && !feat.airs.some(a => a.room === rm.id) && R() < (CONDS[cond].more ? 0.55 : 0.3)) {
          const D = roomDoors(rm); const ax = D.some(d => d.axis === 'x') && (R() < 0.6 || !D.some(d => d.axis === 'z')) ? 'z' : 'x'; const sg = R() < 0.5 ? -1 : 1;
          feat.currents.push(ax === 'z' ? { x0: rm.x0 + 4, x1: rm.x0 + 12, z0: rm.z0, z1: rm.z0 + RS, dx: 0, dz: sg, room: rm.id } : { x0: rm.x0, x1: rm.x0 + RS, z0: rm.z0 + 4, z1: rm.z0 + 12, dx: sg, dz: 0, room: rm.id });
        }
      } else if (map === 'factory') { factoryRoom({ rm, R, ri, at, take, occ, feat, exits, genRoom, bossRoom, start, roomDoors, cond, keepOut, props });
      } else if (map === 'lab') { labRoom({ rm, R, take, feat, start, bossRoom, cond, keepOut, waters, pre });
      } else if (map === 'harbor') {
        if (exits.some(e => e.kind === 'sub' && e.room === rm.id)) { const p = take(); if (p) feat.lighthouse = { x: p[0], z: p[1], room: rm.id }; }
        const nL = rm.id === start ? 1 : rm.type === 'vault' ? 0 : ri(1, 2);
        for (let n = 0; n < nL; n++) { const p = take(); if (p) feat.lamps.push({ x: p[0], z: p[1], room: rm.id, lit: rm.id === start || R() < [0, 0.7, 0.5, 0.35][rm.zone] }); }
      }
    }
    if (rm.type === 'entry') { const p = take(); if (p) props.push({ k: 'crates', x: p[0], z: p[1], ry: R() * 6.28, cover: true }); continue; }
    const Z = MZ[rm.zone];
    /* 엄폐물 2~4 */
    const covers = COVERS[rm.type];
    for (let n = rm.type === 'vault' ? 2 : ri(2, 4); n > 0; n--) { const p = take(); if (p) props.push({ k: pick(covers), x: p[0], z: p[1], ry: Math.floor(R() * 4) * Math.PI / 2, cover: true }); }
    /* 뒤질 곳 */
    if (rm.type === 'vault') { for (let n = 0; n < 3; n++) { const p = take(); if (p) loots.push({ kind: 'vault', x: p[0], z: p[1], ry: 0, zone: 3 }); } const p = take(); if (p) loots.push({ kind: 'chest', x: p[0], z: p[1], ry: 0, zone: 3 }); }
    else { const nl = ri(Z.nLoot[0], Z.nLoot[1]) + (rm.id === genRoom ? 0 : 0);
      for (let n = 0; n < nl; n++) { const p = take(); if (!p) continue; loots.push({ kind: wpick(Z.boxes), x: p[0], z: p[1], ry: Math.floor(R() * 4) * Math.PI / 2, zone: rm.zone }); } }
    /* 적 — 창고는 드론/해골 반반(v0.3 그대로) · 다른 지도는 구역별 가중치(게는 둘씩) */
    if (rm.type !== 'vault' && rm.id !== bossRoom) {
      const ne = ri(Z.nEnemy[0], Z.nEnemy[1]);
      for (let n = 0; n < ne; n++) { const x = rm.x0 + 3 + R() * (RS - 6), z = rm.z0 + 3 + R() * (RS - 6);
        if (ware) { enemies.push({ kind: R() < 0.5 ? 'drone' : 'skel', x, z, room: rm.id, zone: rm.zone, elite: !!Z.elite }); continue; }
        if (map === 'factory' && feat.camps.some(c => c.room === rm.id)) { if (n === 0) factorySquad(enemies, rm, x, z, R, !!Z.elite); continue; } /* 검은 닻 무리 = 그 방 적 전부 */
        const kind = wpick(map === 'factory' ? noAnchor(Z.foes) : map === 'lab' ? labFoes(Z.foes, cond) : Z.foes); const nn = ENEMIES[kind].pack || 1;
        for (let m = 0; m < nn; m++) enemies.push({ kind, x: x + (m ? (R() - 0.5) * 3 : 0), z: z + (m ? 1.2 + R() : 0), room: rm.id, zone: rm.zone, elite: !!Z.elite }); }
    }
    /* 장식 (판정 없음) */
    for (let n = ri(1, 3); n > 0; n--) { const p = take(); if (p) props.push({ k: pick(ware || rm.type === 'vault' ? (rm.type === 'pump' || rm.type === 'engine' ? ['k_bucket', 'k_pipe', 'can_a', 'k_conveyor'] : rm.type === 'vault' ? ['coins', 'chest', 'trunk'] : ['can_a', 'box_a', 'cont_a', 'cont_b', 'trunk', 'bottle_b', 'k_bucket']) : DECOS[rm.type] || DECOS.shed), x: p[0], z: p[1], ry: R() * 6.28, deco: true }); }
  }
  const sr = byId[start]; const spawn = { x: sr.x0 + RS / 2, z: sr.z0 + RS - 4 };
  /* 막힘 풀기 (v0.4 · 세 지도 공통): 방마다 문 · 상자 · 출구 · 발전기 · 공기 방울 · 등불이 서로 걸어서 닿는지 0.5m 칸으로 확인 →
     큰 엄폐물이 문 앞 · 구석 상자를 둘러막으면 큰 것부터 하나씩 뺌 (난수 안 씀 → 다른 것은 그대로 · 창고는 v0.3 의 약 1% 지도에서 엄폐물만 빠짐) */
  for (const rm of roomList) unblock(rm, { props, loots, doors, exits, generator, boss, spawn, start, feat, genRoom, bossRoom, ware });
  const out = { seed, rooms: roomList, links, doors, exits, props, loots, enemies, waters, spawn, dist, start, vault, bossRoom, generator, boss, zones: { 1: z1, 2: z2, 3: z3 }, W: COLS * RS, H: ROWS * RS };
  if (!ware) Object.assign(out, { map, cond, ...feat }); /* 창고는 v0.3 과 같은 모양 그대로 (map 은 읽는 쪽에서 기본값) */
  return out;
}

function unblock(rm, A) {
  const C = A.ware ? 0.25 : 0.5, N = RS / C, r = A.ware ? 0.45 : 0.62; /* 실제 반지름 0.45 보다 넉넉히(새 지도 — 틈이 1.2m 아래면 막힌 걸로) · 창고는 v0.3 모양을 되도록 지킴 */ const inRoom = (x, z) => x >= rm.x0 && x < rm.x0 + RS && z >= rm.z0 && z < rm.z0 + RS;
  const myDoors = A.doors.filter(d => d.a === rm.id || d.b === rm.id);
  const fixed = []; const addB = (x, z, hx, hz, ry = 0) => { if (Math.abs(Math.sin(ry)) > 0.7) [hx, hz] = [hz, hx]; return [x - hx, z - hz, x + hx, z + hz]; };
  /* 벽: 방 네 변 (문 자리 4m 빼고) — 두께 0.5 안쪽 */
  for (let t = 0; t < RT; t++) for (const [x, z, h] of [[rm.x0 + t * T + T / 2, rm.z0, 1], [rm.x0 + t * T + T / 2, rm.z0 + RS, 1], [rm.x0, rm.z0 + t * T + T / 2, 0], [rm.x0 + RS, rm.z0 + t * T + T / 2, 0]]) {
    if (myDoors.some(d => Math.abs(d.x - x) < 0.1 && Math.abs(d.z - z) < 0.1)) continue; fixed.push(h ? addB(x, z, T / 2, 0.5) : addB(x, z, 0.5, T / 2)); }
  for (const l of A.loots) if (inRoom(l.x, l.z)) fixed.push(addB(l.x, l.z, 0.6, 0.6));
  for (const L of A.feat.lamps) if (inRoom(L.x, L.z)) fixed.push(addB(L.x, L.z, 0.28, 0.28)); for (const t of A.feat.terms) if (t.room === rm.id) fixed.push(addB(t.x, t.z, 0.45, 0.35)); /* M4-B 관제 터미널 */ if (A.feat.lighthouse && inRoom(A.feat.lighthouse.x, A.feat.lighthouse.z)) fixed.push(addB(A.feat.lighthouse.x, A.feat.lighthouse.z, 1.1, 1.1));
  for (const b of A.feat.blocks) if (b.room === rm.id) fixed.push(addB(b.x, b.z, 1.85, 1.85)); for (const c of A.feat.cars) if (c.room === rm.id) fixed.push(addB(c.x, c.z, 1.1, 3.7));
  const G = A.generator; if (A.genRoom === rm.id) fixed.push([G.x - 0.9, G.z - 1.4, G.x + 0.9, G.z + 0.5]);
  const covers = A.props.filter(p => !p.deco && inRoom(p.x, p.z));
  /* 닿아야 하는 곳: 문 안쪽 · (시작방) 시작점 · 상자 · 출구 · 발전기 · 공기 방울 · 등불 · 보스 자리 */
  const starts = myDoors.map(d => d.axis === 'x' ? [d.x, d.z + (d.z <= rm.z0 + 0.1 ? 1.2 : -1.2), 0.6] : [d.x + (d.x <= rm.x0 + 0.1 ? 1.2 : -1.2), d.z, 0.6]);
  if (rm.id === A.start) starts.push([A.spawn.x, A.spawn.z, 0.6]);
  const goals = [...(A.ware ? [] : starts), ...A.loots.filter(l => inRoom(l.x, l.z)).map(l => [l.x, l.z, 1.9]), ...A.exits.filter(e => e.room === rm.id).map(e => [e.x, e.z, 1.8]), ...(A.genRoom === rm.id ? [[G.x, G.z, 2.4]] : []),
    ...A.feat.airs.filter(a => a.room === rm.id).map(a => [a.x, a.z, 1.5]), ...A.feat.lamps.filter(L => inRoom(L.x, L.z)).map(L => [L.x, L.z, 1.85]), ...A.feat.terms.filter(t => t.room === rm.id).map(t => [t.x, t.z, 1.8]), ...(A.bossRoom === rm.id ? [[A.boss.x, A.boss.z, 2.5]] : [])];
  if (!starts.length) return;
  const test = list => {
    const block = new Uint8Array(N * N);
    for (const [x0, z0, x1, z1] of list) for (let j = Math.max(0, Math.floor((z0 - r - rm.z0) / C)); j <= Math.min(N - 1, Math.floor((z1 + r - rm.z0) / C)); j++) for (let i = Math.max(0, Math.floor((x0 - r - rm.x0) / C)); i <= Math.min(N - 1, Math.floor((x1 + r - rm.x0) / C)); i++) {
      const px = rm.x0 + (i + 0.5) * C, pz = rm.z0 + (j + 0.5) * C; const dx = px - Math.max(x0, Math.min(px, x1)), dz = pz - Math.max(z0, Math.min(pz, z1)); if (dx * dx + dz * dz < r * r) block[j * N + i] = 1; }
    const cell = (x, z) => Math.min(N - 1, Math.max(0, Math.floor((z - rm.z0) / C))) * N + Math.min(N - 1, Math.max(0, Math.floor((x - rm.x0) / C)));
    /* 새 지도: 첫 문에서 시작해 다른 문까지 다 닿아야(방이 둘로 갈리지 않게) · 창고: 문 아무 데서나 시작(v0.3 모양을 되도록 지킴 — 정말 갇힌 것만 풂) */
    const seen = new Uint8Array(N * N); const q = []; for (const st of (A.ware ? starts : starts.slice(0, 1))) { const s0 = cell(st[0], st[1]); if (!block[s0] && !seen[s0]) { seen[s0] = 1; q.push(s0); } } if (!q.length) return false;
    while (q.length) { const k = q.pop(); const i = k % N, j = (k - i) / N; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= N || b >= N) continue; const n = b * N + a; if (!seen[n] && !block[n]) { seen[n] = 1; q.push(n); } } }
    return goals.every(([x, z, d]) => { for (let j = Math.max(0, Math.floor((z - d - rm.z0) / C)); j <= Math.min(N - 1, Math.floor((z + d - rm.z0) / C)); j++) for (let i = Math.max(0, Math.floor((x - d - rm.x0) / C)); i <= Math.min(N - 1, Math.floor((x + d - rm.x0) / C)); i++) if (seen[j * N + i] && (rm.x0 + (i + 0.5) * C - x) ** 2 + (rm.z0 + (j + 0.5) * C - z) ** 2 < d * d) return true; return false; });
  };
  const box = p => { const so = SOLID[p.k] || [0.8, 0.8]; return addB(p.x, p.z, so[0], so[1], p.ry); };
  let live = covers.slice(); const order = covers.slice().sort((a, b) => { const A1 = SOLID[a.k] || [0.8, 0.8], B1 = SOLID[b.k] || [0.8, 0.8]; return B1[0] * B1[1] - A1[0] * A1[1]; });
  for (const victim of order) { if (test([...fixed, ...live.map(box)])) return; live = live.filter(p => p !== victim); A.props.splice(A.props.indexOf(victim), 1); }
}

/* 상자 내용 미리 굴리기 (판 시작 때 한 번 — 연구대 '상자 등급 빛'이 미리 알 수 있게) */
/*  bonus: 지도 상자 가치 배수 − 1 (항구 0.25 · 터널 0.5) = 한 개 더 나올 확률 — 창고는 0 (난수 그대로) */
export function rollLoot(kind, zone, R, vkeyChance = 0, bonus = 0) {
  const T = LOOT_TABLE[kind] || LOOT_TABLE.crate; const n = T.n[0] + Math.floor(R() * (T.n[1] - T.n[0] + 1)) + (bonus > 0 && kind !== 'body' && R() < bonus ? 1 : 0); const out = [...(T.fixed || [])];
  const tot = Object.values(T.w).reduce((a, b) => a + b, 0);
  for (let i = 0; i < n; i++) { let r = R() * tot; for (const [k, w] of Object.entries(T.w)) { r -= w; if (r <= 0) { out.push(k); break; } } }
  if ((kind === 'locker' || kind === 'toolbox') && R() < vkeyChance) out.push('vkey');
  return out;
}
