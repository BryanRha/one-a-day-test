// 맵 4 '가라앉은 공장' 배치 계획 (three 없음 · plan.js 가 부름 — node 시험 · 봇 · 시뮬에서도 씀) — M3-B
//  하역장(구역 1) → 용광로 · 컨베이어(2) → 동력 코어실(3) · 보스방 = 주조장(crucible)
//  방 안 장치: 컨베이어 벨트(전원과 상관없이 돌다 정전이면 멈춤 · 몸을 밈) · 증기 배관(뿜기 전 예고) · 쇳물 도랑(문 없는 벽 쪽 · 구르면 안 데임)
//  검은 닻 무리: 진영 3 — 방 하나에 2~3 (쥐 소총수 · 오소리 갈퀴꾼 · 흰족제비 화약꾼) + 고철 바리케이드(엄폐물) + 닻 깃발
//  출구: 하역장 사다리(3분) · 컨베이어 반출구(전원 · 발판에 올라 벨트 타고 벽 반출구로) · 크레인 바구니(부르면 8초 뒤)
import { MAPS } from './data.js?v=0.99.29';

const T = 4, RT = 4, RS = 16; /* plan.js 와 같은 값 (서로 부르는 고리를 피해 따로 둠) */
/* 엄폐물 · 장식 (방 종류별) — f_* 는 map_factory.glb / dress_factory.glb */
export const F_COVERS = {
  loading: ['k_cont_a', 'k_cont_b', 'crates', 'k_boxwide', 'f_crate'], store: ['crates', 'k_crate', 'box_large', 'k_boxwide', 'f_crate'],
  furnace: ['k_hopper', 'f_press', 'k_tank', 'f_mold'], conveyor: ['k_machine', 'k_boxwide', 'f_press', 'crates'], foundry: ['f_mold', 'k_hopper', 'f_press', 'k_machine'],
  workshop: ['table', 'cabinet', 'f_mold', 'k_screen'], core: ['k_tank', 'f_press', 'k_machine', 'f_coil'], fcontrol: ['k_screen', 'cabinet', 'f_press', 'f_coil'], crucible: ['k_tank', 'f_press'] };
export const F_DECOS = {
  loading: ['pallet', 'box_a', 'can_a', 'k_bucket'], store: ['box_a', 'can_a', 'bottle_b', 'trunk'], furnace: ['k_bucket', 'k_pipe', 'k_cog'], conveyor: ['k_cog', 'k_bucket', 'k_pipe'],
  foundry: ['k_cog', 'k_bucket', 'k_arm'], workshop: ['k_arm', 'k_cog', 'box_a'], core: ['k_pipe', 'k_cog', 'k_bucket'], fcontrol: ['k_pipe', 'k_cog', 'can_a'], crucible: ['k_pipe', 'k_bucket'] };
/* 판정 크기 [가로 반, 세로 반, 총알 막음] */
export const F_SOLID = { f_press: [0.95, 1.15, 1], f_mold: [1.15, 1.15, 1], f_crate: [0.82, 0.75, 1], f_coil: [0.9, 0.9, 1], f_barricade: [1.35, 0.45, 1] };

const VENT_ROOMS = { furnace: 1, foundry: 1, conveyor: 1, core: 1, fcontrol: 1, crucible: 1, workshop: 1 };
const HOT_ROOMS = { furnace: 1, foundry: 1, crucible: 1 };
const NA = new WeakMap();
export const noAnchor = f => { if (!NA.has(f)) { const o = { ...f }; delete o.anchor; NA.set(f, o); } return NA.get(f); };

/* 출구 다듬기: 반출구는 방 위쪽 벽을 따라 벨트 (발판 → 옆벽 반출구) · 바구니는 크레인 표시 */
export function factoryExits(exits, byId) {
  for (const e of exits) {
    const r = byId[e.room];
    if (e.kind === 'power') {
      const left = e.x < r.x0 + RS / 2; const zc = r.z0 + 2.6;
      const padX = left ? r.x0 + 12.2 : r.x0 + 3.8, hatchX = left ? r.x0 + 0.55 : r.x0 + RS - 0.55;
      e.x = padX; e.z = zc;
      e.belt = { x0: Math.min(padX, hatchX), x1: Math.max(padX, hatchX), z0: zc - 1.15, z1: zc + 1.15, dx: left ? -1 : 1, dz: 0, hatch: { x: hatchX, z: zc }, room: e.room, exit: true };
      e.keep = []; for (let x = Math.min(padX, hatchX); x <= Math.max(padX, hatchX); x += 2.4) e.keep.push([x, zc, 2.2]);
    }
    if (e.kind === 'sub') e.crane = true;
  }
}

/* 방 하나: 무리 자리(바리케이드 · 깃발) · 벨트 · 증기 배관 · 쇳물 도랑 */
export function factoryRoom(c) {
  const { rm, R, at, take, occ, feat, exits, genRoom, bossRoom, start, roomDoors, cond, keepOut, props } = c;
  const Z = MAPS.factory.zones[rm.zone]; const hasExit = exits.some(e => e.room === rm.id);
  const D = roomDoors(rm);
  const wallDoor = { left: D.some(d => d.axis === 'z' && Math.abs(d.x - rm.x0) < 0.1), right: D.some(d => d.axis === 'z' && Math.abs(d.x - rm.x0 - RS) < 0.1), top: D.some(d => d.axis === 'x' && Math.abs(d.z - rm.z0) < 0.1), bottom: D.some(d => d.axis === 'x' && Math.abs(d.z - rm.z0 - RS) < 0.1) };
  const hitsKeep = (x0, z0, x1, z1, pad = 0) => keepOut.some(([kx, kz, r]) => { const dx = kx - Math.max(x0, Math.min(kx, x1)), dz = kz - Math.max(z0, Math.min(kz, z1)); return dx * dx + dz * dz < (r + pad) ** 2; });
  /* 쇳물 도랑: 문 없는 벽을 따라 (폭 1.6 · 과열이면 2.4 + 하나 더) — 그 줄 칸은 비움(상자 · 엄폐물 안 놓음) */
  if (HOT_ROOMS[rm.type] && rm.id !== start) {
    const w = cond === 'overheat' ? 2.4 : 1.6; let n = cond === 'overheat' ? 2 : 1;
    for (const side of ['left', 'right', 'top', 'bottom'].sort(() => R() - 0.5)) {
      if (n <= 0 || wallDoor[side]) continue;
      const o = 0.75; let rc;
      if (side === 'left') rc = [rm.x0 + o, rm.z0 + 2.5, rm.x0 + o + w, rm.z0 + RS - 2.5]; else if (side === 'right') rc = [rm.x0 + RS - o - w, rm.z0 + 2.5, rm.x0 + RS - o, rm.z0 + RS - 2.5];
      else if (side === 'top') rc = [rm.x0 + 2.5, rm.z0 + o, rm.x0 + RS - 2.5, rm.z0 + o + w]; else rc = [rm.x0 + 2.5, rm.z0 + RS - o - w, rm.x0 + RS - 2.5, rm.z0 + RS - o];
      if (hitsKeep(...rc, 0.3) || (feat.belts.some(b => b.room === rm.id))) continue;
      const vert = side === 'left' || side === 'right'; const line = side === 'left' || side === 'top' ? 0 : 3;
      for (let k = 0; k < RT; k++) occ.add(vert ? line + ',' + k : k + ',' + line);
      feat.molten.push({ x0: rc[0], z0: rc[1], x1: rc[2], z1: rc[3], room: rm.id, side }); n--;
    }
  }
  /* 컨베이어 벨트: 방 위나 아래 줄을 가로지름 (발전기 · 출구 방 빼고) — 그 줄 칸은 비움 */
  if (rm.type === 'conveyor' && rm.id !== genRoom && !hasExit && !feat.molten.some(m => m.room === rm.id)) {
    const j = R() < 0.5 ? 0 : 3; const zc = rm.z0 + (j === 0 ? 2.6 : RS - 2.6); const sg = R() < 0.5 ? -1 : 1;
    if (!hitsKeep(rm.x0, zc - 1.1, rm.x0 + RS, zc + 1.1)) { for (let i = 0; i < RT; i++) occ.add(i + ',' + j);
      feat.belts.push({ x0: rm.x0 + 0.6, x1: rm.x0 + RS - 0.6, z0: zc - 1.1, z1: zc + 1.1, dx: sg, dz: 0, room: rm.id }); }
  }
  for (const e of exits) if (e.belt && e.room === rm.id) { feat.belts.push(e.belt); for (let i = 0; i < RT; i++) occ.add(i + ',0'); }
  /* 증기 배관 (바닥 창살 · 판정 없음) */
  if (VENT_ROOMS[rm.type] && rm.id !== start) {
    const n = cond === 'steam' ? (R() < 0.7 ? 2 : 1) : (R() < 0.45 ? 1 : 0);
    for (let k = 0; k < n; k++) { const p = take(); if (p) feat.vents.push({ x: p[0], z: p[1], room: rm.id }); }
  }
  /* 검은 닻 무리 자리: 바리케이드(엄폐물 · 총알 막음) + 닻 깃발(장식) */
  if (rm.type !== 'vault' && rm.id !== bossRoom && rm.id !== start && R() * 100 < (Z.foes.anchor || 0)) {
    const p = take(); if (p) { const ry = Math.floor(R() * 4) * Math.PI / 2; props.push({ k: 'f_barricade', x: p[0], z: p[1], ry, cover: true });
      const q = take(); feat.camps.push({ room: rm.id, x: p[0], z: p[1], fx: q ? q[0] : p[0] + 1.6, fz: q ? q[1] : p[1] - 1.6 }); if (q) props.push({ k: 'f_flag', x: q[0], z: q[1], ry: R() * 6.28, deco: true }); }
  }
}

/* 검은 닻 무리: 구역마다 2~3 (소총수 1~2 + 갈퀴꾼/화약꾼) — 같은 무리 번호(squad) = 방 번호 */
export function factorySquad(enemies, rm, x, z, R, elite) {
  const K = rm.zone === 1 ? ['raider', R() < 0.5 ? 'brute' : 'bomber'] : rm.zone === 2 ? ['raider', 'brute', ...(R() < 0.5 ? ['bomber'] : [])] : ['raider', 'raider', R() < 0.6 ? 'brute' : 'bomber'];
  K.forEach((kind, i) => { const a = i * 2.1 + R(); enemies.push({ kind, x: Math.max(rm.x0 + 2.5, Math.min(rm.x0 + RS - 2.5, x + Math.cos(a) * 1.6 * (i ? 1 : 0))), z: Math.max(rm.z0 + 2.5, Math.min(rm.z0 + RS - 2.5, z + Math.sin(a) * 1.6 * (i ? 1 : 0))), room: rm.id, zone: rm.zone, elite, squad: rm.id }); });
}
