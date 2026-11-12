// 맵 5 '심해 연구소' 배치 계획 (three 없음 · plan.js 가 부름 — node 시험 · 봇 · 시뮬에서도 씀) — M4-B
//  연구동 입구(구역 1) → 수조 · 배양실(2) → 관제실 · 파수 코어 앞(3) · 보스방 = 대수조(basin, 청록 어미)
//  방 안 장치: 배양조(엄폐물 · 총알에 깨짐 — 판정은 엄폐물 그대로 'l_tank') · 빛이끼 번식 자리(바닥 원 · 느려짐 · 빛남) · 관제 터미널 2(구역 2 · 3 하나씩)
//  문 장치: 수압 문 2~3 (구역 2 · 3 의 잠기지 않은 문 — 열림 7초 → 노란 불 1초 → 닫힘 3초 · 길 찾기 검사엔 '열린 문')
//  출구: 연구동 비상 계단(3분) · 수압 승강기(전원) · 파수 반출 해치(새 방식 — 관제 터미널 두 곳 승인 뒤 열림)
import { PRESS } from './data/map_lab.js?v=0.99.38';

const RS = 16; /* plan.js 와 같은 값 (서로 부르는 고리를 피해 따로 둠) */
export const L_TYPES = { 1: ['lobby', 'dorm', 'decon', 'lobby'], 2: ['tankhall', 'culture', 'coldroom', 'culture'], 3: ['records', 'lcontrol', 'corehall'], boss: 'basin' };
/* 엄폐물 · 장식 (방 종류별) — l_* 는 dress_lab.glb (늦게 받음) */
export const L_COVERS = {
  lobby: ['cabinet', 'l_bench', 'k_screen', 'box_large'], dorm: ['cabinet', 'l_bench', 'table', 'l_cryo'], decon: ['l_cryo', 'cabinet', 'k_screen'],
  tankhall: ['l_tank', 'l_tank', 'k_tank', 'l_bench'], culture: ['l_tank', 'l_bench', 'l_tank', 'k_machine'], coldroom: ['l_cryo', 'k_tank', 'l_cryo', 'cabinet'],
  records: ['l_rack', 'l_rack', 'cabinet'], lcontrol: ['l_console', 'k_screen', 'l_rack'], corehall: ['l_rack', 'k_machine', 'l_console'], basin: ['l_tank', 'l_tank'] };
export const L_DECOS = {
  lobby: ['box_a', 'book', 'bottle_b'], dorm: ['book', 'trunk', 'bottle_b'], decon: ['bottle_g', 'k_bucket', 'can_a'], tankhall: ['k_pipe', 'bottle_g', 'k_bucket'], culture: ['bottle_g', 'k_pipe', 'box_a'],
  coldroom: ['k_pipe', 'k_bucket', 'can_a'], records: ['book', 'box_a', 'k_cog'], lcontrol: ['k_pipe', 'book', 'k_cog'], corehall: ['k_pipe', 'k_cog', 'k_bucket'], basin: ['k_pipe', 'bottle_g'] };
/* 판정 크기 [가로 반, 세로 반, 총알 막음] — 배양조는 원통(유리) · 깨지면 총알은 지나감(lab.js) */
export const L_SOLID = { l_tank: [0.85, 0.85, 1], l_bench: [1.1, 0.5, 0], l_rack: [1.0, 0.45, 1], l_console: [1.05, 0.5, 1], l_cryo: [0.6, 1.1, 1] };
/* 이끼 자리가 나는 방 (이끼 번성이면 더) */
const MOSS_ROOMS = { tankhall: 0.6, culture: 0.75, coldroom: 0.35, records: 0.35, lcontrol: 0.3, corehall: 0.55, basin: 1 };
/* 지도 상태 → 적 가중치 (이끼 번성 = 포자낭 · 봉쇄 = 경비 기계) */
const FOE = new Map();
export function labFoes(f, cond) {
  const key = cond + JSON.stringify(f); if (FOE.has(key)) return FOE.get(key);
  const o = { ...f }; if (cond === 'bloom' && o.sporer) o.sporer *= 1.7; if (cond === 'lockdown' && o.warden) o.warden *= 1.7; FOE.set(key, o); return o;
}

/* 방 고르기 (방 돌기 전에 한 번): 관제 터미널 두 방 · 수압 문 */
export function labPre(c) {
  const { R, z2, z3, z2seed, genRoom, vault, bossRoom, exits, doors, links, byId, cond } = c;
  const exitRoom = k => exits.some(e => e.room === k);
  const pickOne = (L) => L.length ? L[Math.floor(R() * L.length)] : null;
  const t2 = pickOne(z2.filter(k => k !== z2seed && k !== genRoom && !exitRoom(k))) ?? pickOne(z2.filter(k => k !== genRoom)) ?? z2seed;
  const t3 = pickOne(z3.filter(k => k !== vault && k !== bossRoom && !exitRoom(k))) ?? pickOne(z3.filter(k => k !== vault && k !== bossRoom)) ?? z3[0];
  /* 수압 문: 잠기지 않은 문 중 한쪽이라도 구역 2 · 3 (입구 수문 · 전원 문 · 금고 문 빼고) */
  const cand = doors.filter(d => !d.lock && !d.gate && Math.max(byId[d.a].zone, byId[d.b].zone) >= 2 && d.a !== vault && d.b !== vault);
  const n = Math.min(cand.length, PRESS.n[0] + Math.floor(R() * (PRESS.n[1] - PRESS.n[0] + 1)) + (cond === 'lockdown' ? 1 : 0));
  for (let i = 0; i < n; i++) { const k = Math.floor(R() * cand.length); const d = cand.splice(k, 1)[0]; d.press = true; d.phase = Math.round(R() * 60) / 10; }
  return { termRooms: [t2, t3] };
}
/* 출구 다듬기: 반출 해치는 관제 승인이 필요 · 계단 · 승강기는 표시만 */
export function labExits(exits) { for (const e of exits) { if (e.kind === 'sub') e.term = true; } }

/* 방 하나: 관제 터미널 · 이끼 자리 · (누수) 물웅덩이 */
export function labRoom(c) {
  const { rm, R, take, feat, start, bossRoom, cond, keepOut, waters, pre } = c;
  if (pre.termRooms.includes(rm.id) && !feat.terms.some(t => t.room === rm.id)) { const p = take(); if (p) feat.terms.push({ x: p[0], z: p[1], room: rm.id, zone: rm.zone, i: feat.terms.length }); }
  /* 이끼 자리 (바닥 원): 출구 · 발전기 · 보스 자리는 피함 — 밟고 지나갈 수는 있음 */
  const pm = (MOSS_ROOMS[rm.type] || 0) * (cond === 'bloom' ? 1.5 : 1);
  if (rm.id !== start) for (let n = (rm.id === bossRoom ? 2 : 1) + (cond === 'bloom' && R() < 0.5 ? 1 : 0); n > 0; n--) { if (R() >= pm) continue;
    for (let t = 0; t < 12; t++) { const r = (1.8 + R() * 1.2) * (cond === 'bloom' ? 1.2 : 1); const x = rm.x0 + 2.5 + R() * (RS - 5), z = rm.z0 + 2.5 + R() * (RS - 5);
      if (keepOut.some(([kx, kz, kr]) => Math.hypot(kx - x, kz - z) < kr + r * 0.5)) continue; if (rm.id === bossRoom && Math.hypot(x - (rm.x0 + RS / 2), z - (rm.z0 + RS / 2)) < 4) continue;
      feat.moss.push({ x, z, r, room: rm.id, zone: rm.zone }); break; } }
  /* 누수: 물웅덩이 1~2 더 · 대수조 방은 넓은 물 */
  if (cond === 'leak' && rm.id !== start) for (let n = 1 + (R() < 0.5 ? 1 : 0); n > 0; n--) waters.push({ x: rm.x0 + 3 + R() * (RS - 6), z: rm.z0 + 3 + R() * (RS - 6), rx: 2.2 + R() * 2.5, rz: 1.8 + R() * 2 });
  if (rm.id === bossRoom) waters.push({ x: rm.x0 + RS / 2, z: rm.z0 + RS / 2, rx: 6.2, rz: 5.6 });
}
