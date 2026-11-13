// 바깥 구역 (0.7.0 · 대표 「바깥 구역으로」 · team/dev/tasks/261112-marumi-expand/intent.md): 가게 앞 왼쪽 띠에 손님 자리 + 구역 직원 + 바깥 판매대
//   가게 안 23자리 · 한 바퀴 · 손님 줄 · 문 · 돈 더미는 그대로 — 구역은 그 바깥에만 · 한 칸(「바깥 구역 열기」)으로 한 번에 열림 · 청소 직원 뒤에만 나옴
//   판매대 손님은 실내 손님과 따로 생기고(가게 앞 왼쪽 바깥에서 옴 · 문 · 줄을 안 지남) · 돈은 계산대 더미에 바로 더해짐(구역 다발은 금빛) · 더미 위에 구역 「+금액」(2.5초 묶음)
//   구역 직원: 원료 설비(오븐 · 토핑 바)에서 바로 받아 정해진 길(way · 76cm 틈을 안 지남)로 판매대 · 구역 테이블을 치움 · 쉬지 않음 · 청소 직원 · 실내 손님은 구역을 안 봄
//   지점 공통 구조(OUT_ZONE[지점]) — 1단계는 1호점만 켬
import * as THREE from 'three';
import { OUT_ZONE, MENU, BRAND, DECO } from './data.js?v=0.99.43';
import { box, cyl, sph, mesh, M, item, person, ITEM_H } from './models.js?v=0.99.43';
import { S, save, addSold } from './state.js?v=0.99.43';
import { sfx } from './audio.js?v=0.99.43';

const V = THREE.Vector3, rnd = (a, b) => a + Math.random() * (b - a), fmt = n => Math.round(n).toLocaleString('en-US');
const LANE_DX = [-45, 45];   /* 판매대 두 줄 (구역 메뉴 순서대로) */
const SRC = { bagel: ['oven', 'out'], cream: ['cc', 'io'], coffee: ['coffee', 'out'], drink: ['espresso', 'out'] };   /* 메뉴 → 원료 설비 · 꺼내는 칸 */

/* 지점마다 구역 모습 (0.7.1): 1 테라스(흰 파라솔 · 산책로) · 2 호숫가 창가 바(판자 데크 · 남색 줄무늬 차양 · 벚꽃 · 스탠딩 바) · 3 통로 스탠딩 바(흰 타일 · 민트 줄눈 · 라인 조명 · 높은 테이블) · 4 잔디 피크닉(잔디 · 체크 매트 · 나무 수레)
   floor 바닥 · top 테이블 위 높이(쓰레기 놓는 곳) · seatDz 자리를 테이블 앞(+z)으로 · sitY 먹을 때 몸 높이 · bin 쓰레기통 색 — 자리 좌표 · 길 · 판매대 자리는 4지점 같음 */
const STY = {
  terrace: { floor: 0xE6D2B4, top: 80, seatDz: 0, sitY: 12, bin: 0x5A8A5A },
  lake: { floor: 0xC9A27A, top: 116, seatDz: 46, sitY: 0, bin: 0x2F5D8A },
  under: { floor: 0xF1F0EC, top: 108, seatDz: 0, sitY: 0, bin: 0x9AA4AC },
  park: { floor: 0xA9CF8E, top: 12, seatDz: 0, sitY: 4, bin: 0x7A5A3A },
};
const LINE = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });   /* 라인 조명 (빛나는 띠) */
function zFloor(sty, g, x0, x1, z0, z1) { const cz = (z0 + z1) / 2 + 10, dz = z1 - z0;
  if (sty === 'terrace') for (let x = x0 + 20; x < x1; x += 60) box(2, 1, dz, 0xD8C2A0, x, 3, cz, g);
  if (sty === 'lake') for (let z = z0 + 10; z < z1 + 10; z += 42) box(x1 - x0, 1, 2, 0xA97F57, (x0 + x1) / 2, 3, z, g);
  if (sty === 'under') { for (let x = x0 + 60; x < x1; x += 60) box(2, 1, dz, 0xBFE0D4, x, 3, cz, g); for (let z = z0 + 50; z < z1 + 10; z += 60) box(x1 - x0, 1, 2, 0xBFE0D4, (x0 + x1) / 2, 3, z, g); }
  if (sty === 'park') { for (let x = x0 + 45; x < x1; x += 90) box(44, 1, dz, 0xB6D99C, x, 3, cz, g); box(150, 1, dz, 0xD9C7A2, 40, 4, cz, g); }   /* 잔디 줄무늬 · 판매대 앞 흙길 */
}
function zEdge(sty, g, x0, x1, z0, z1) {   /* 띠 앞 낮은 장식 (가게 안을 가리지 않음 · 띠 밖) */
  const pots = [[x0 - 30, z1 + 30], [x0 + 200, z1 + 40], [x1 - 300, z1 + 40]];
  if (sty === 'terrace') for (const [ex, ez] of pots) { cyl(26, 20, 34, 0xE7B98A, ex, 0, ez, g, 10); sph(28, 0x7FBF6A, ex, 56, ez, g, 10, 8).scale.set(1, 0.8, 1); }
  if (sty === 'lake') { for (let x = x0 + 10; x <= x1 - 10; x += 110) box(8, 46, 8, 0x8A5E3A, x, 0, z1 + 24, g); box(x1 - x0 - 10, 6, 8, 0x8A5E3A, (x0 + x1) / 2, 44, z1 + 24, g);   /* 호수 쪽 낮은 난간 */
    for (const [ex, ez] of [[x0 - 70, z0 + 40], [x0 - 60, z1 + 60]]) { cyl(9, 12, 120, 0x7A5A3A, ex, 0, ez, g, 8); sph(62, 0xF6C8D4, ex, 150, ez, g, 12, 10); sph(40, 0xF9DCE4, ex + 30, 175, ez - 10, g, 10, 8); } }
  if (sty === 'under') { box(x1 - x0, 4, 6, 0xFFFFFF, (x0 + x1) / 2, 3, z1 + 18, g).material = LINE; box(6, 4, z1 - z0, 0xFFFFFF, x0 - 8, 3, (z0 + z1) / 2 + 10, g).material = LINE;   /* 바닥 라인 조명 */
    for (const [ex, ez] of pots) { box(46, 40, 46, 0xFBFBF9, ex, 0, ez, g); box(48, 4, 48, 0xBFE0D4, ex, 40, ez, g); sph(24, 0x6FAF7A, ex, 60, ez, g, 10, 8); } }
  if (sty === 'park') { for (const [ex, ez] of pots) sph(30, 0x7FB06A, ex, 16, ez, g, 10, 8).scale.set(1.3, 0.6, 1); cyl(8, 8, 120, 0x8A6A44, x0 + 40, 0, z1 + 40, g, 8); box(110, 50, 8, 0xB8875A, x0 + 40, 100, z1 + 44, g); box(96, 6, 9, 0xFFF2DA, x0 + 40, 122, z1 + 45, g); }   /* 덤불 · 나무 간판 */
}
function zStand(sty, st) {
  if (sty === 'terrace') { box(200, 90, 80, 0xF6EDE2, 0, 0, 0, st); box(210, 10, 90, 0x9A643A, 0, 90, 0, st); box(202, 26, 3, BRAND.accentHex, 0, 52, 41.5, st);
    for (const ox of [-96, 96]) box(6, 120, 6, 0x9A643A, ox, 100, -36, st); const aw = box(220, 6, 70, BRAND.accentHex, 0, 224, -12, st); aw.rotation.x = -0.25; for (let i = -3; i <= 3; i++) box(14, 4, 72, 0xFFFFFF, i * 30, 228, -12, st).rotation.x = -0.25; return; }
  if (sty === 'lake') { box(200, 90, 80, 0xA8754A, 0, 0, 0, st); box(210, 10, 90, 0x6E4C33, 0, 90, 0, st); for (let i = -3; i <= 3; i++) box(3, 80, 2, 0x8A5E3A, i * 28, 5, 41, st);
    for (const ox of [-96, 96]) box(6, 130, 6, 0x6E4C33, ox, 100, -36, st); for (let i = -3; i <= 3; i++) { const b = box(30, 6, 74, i % 2 ? 0xFFFFFF : 0x2F5D8A, i * 30, 236, -12, st); b.rotation.x = -0.25; } return; }   /* 남색 · 흰 줄무늬 차양 */
  if (sty === 'under') { box(200, 92, 80, 0xFBFBF9, 0, 0, 0, st); box(204, 6, 84, 0xE6E8E6, 0, 92, 0, st); box(202, 10, 3, 0xBFE0D4, 0, 60, 41.5, st);
    for (const ox of [-90, 90]) box(5, 150, 5, 0x9AA4AC, ox, 98, -36, st); box(190, 34, 12, 0xFBFBF9, 0, 220, -36, st); const ln = box(170, 5, 3, 0xFFFFFF, 0, 232, -29, st); ln.material = LINE; return; }   /* 흰 타일 · 민트 줄 · 라인 조명 간판 */
  if (sty === 'park') { box(190, 70, 80, 0xB8875A, 0, 22, 0, st); box(200, 8, 90, 0x8A6A44, 0, 92, 0, st); for (const ox of [-70, 70]) { const w = cyl(24, 24, 8, 0x5A4030, ox, 0, 44, st, 14); w.rotation.x = Math.PI / 2; w.position.y = 24; }
    for (const ox of [-92, 92]) box(6, 130, 6, 0x8A6A44, ox, 100, -36, st); const aw = box(220, 6, 74, 0x6FA05A, 0, 232, -12, st); aw.rotation.x = -0.25; cyl(30, 22, 26, 0xC89A5A, 70, 100, 10, st, 12); }   /* 나무 수레 · 초록 차양 · 바구니 */
}
function zTable(sty, tg, i) { const seat = m => { m.userData.seat = 1; return m; };
  if (sty === 'terrace') { cyl(70, 70, 8, 0xFFFFFF, 0, 70, 0, tg, 20); cyl(8, 12, 70, 0x9A643A, 0, 0, 0, tg, 8); cyl(4, 4, 200, 0xE8E0D0, 0, 70, 0, tg, 6); mesh(new THREE.ConeGeometry(130, 50, 12), M(i % 2 ? 0xFFFFFF : BRAND.accentHex), 0, 285, 0, tg);
    for (const s of [-1, 1]) { seat(cyl(24, 24, 10, 0xC08A5A, s * 95, 40, 0, tg)); cyl(5, 5, 40, 0x9A643A, s * 95, 0, 0, tg, 6); } return; }
  if (sty === 'lake') { box(300, 8, 50, 0x8A5E3A, 0, 108, 0, tg); for (const ox of [-130, 130]) box(10, 108, 10, 0x6E4C33, ox, 0, 0, tg); box(280, 4, 4, 0xB8A070, 0, 22, 22, tg);   /* 호수를 보는 긴 바 · 발 받침 */
    for (const s of [-1, 1]) seat(cyl(22, 22, 3, 0xE8D5B5, s * 95, 0, 46, tg, 14)); return; }   /* 서는 자리 표시 */
  if (sty === 'under') { cyl(50, 50, 6, 0xFBFBF9, 0, 102, 0, tg, 20); cyl(5, 5, 102, 0x9AA4AC, 0, 0, 0, tg, 8); cyl(26, 26, 3, 0x9AA4AC, 0, 0, 0, tg, 14); box(80, 2, 3, 0xBFE0D4, 0, 108, 0, tg);
    for (const s of [-1, 1]) seat(cyl(22, 22, 3, 0xBFE0D4, s * 95, 0, 0, tg, 14)); return; }   /* 높은 테이블 · 서는 자리 표시 */
  if (sty === 'park') { const N = 6; for (let a = 0; a < N; a++) for (let b = 0; b < 3; b++) box(260 / N, 2, 50, (a + b) % 2 ? 0xFFFFFF : 0xE0584A, -130 + 130 / N + a * 260 / N, 3, -50 + b * 50, tg);   /* 체크 피크닉 매트 */
    cyl(26, 20, 24, 0xC89A5A, 0, 5, 0, tg, 12); box(40, 4, 6, 0x8A6A44, 0, 34, 0, tg); for (const s of [-1, 1]) seat(cyl(24, 24, 8, 0xF2C14E, s * 95, 4, 0, tg, 14)); }   /* 바구니 · 방석 */
}

export function installZone(Game, { starK }) {
  const P = Game.prototype;
  /* 예전 테라스 꾸미기(0.6.2 · 0.6.3)를 산 저장 → 그 지점 구역이 열린 것으로 (손해 0 · 받는 것이 더 큼) */
  P.zoneMigrate = function (bi) { const z = OUT_ZONE[bi]; if (!z?.on) return; const own = S.deco[bi] || []; if (!own.includes('terrace')) return;
    S.deco[bi] = own.filter(id => id !== 'terrace'); if (S.decoPos[bi]) delete S.decoPos[bi].terrace; const br = (S.branch[bi] ||= { unl: [], staff: [], paid: {} });
    if (!br.unl.includes('zone')) br.unl.push('zone'); if (!br.staff.includes('zoner')) br.staff.push('zoner'); delete br.paid.zone; S.zoneFrom = 'terrace'; save(); };
  P.zoneCfg = function () { const z = OUT_ZONE[this.bi]; return z?.on && this.unl.has('zone') ? z : null; };
  /* 구역을 만들거나(열림 · 다시 그림) 지움 */
  P.zoneSync = function (reveal) {
    if (this.oz) { this.sc.remove(this.oz.g); for (const c of this.oz.cust) { this.sc.remove(c.P.g); c.tag && c.tag.remove(); } for (const id of Object.keys(this.st)) if (this.st[id].zone) { const o = this.st[id]; for (const t of o.trash || []) this.sc.remove(t.m); if (o.vase) this.sc.remove(o.vase); if (o.Z?.trash) { this.sc.remove(o.Z.trash.g); this.zones = this.zones.filter(Z => Z !== o.Z.trash); } delete this.st[id]; } this.oz = null; }
    const cf = this.zoneCfg(); if (!cf) return;
    const g = new THREE.Group(); g.name = 'zone'; this.sc.add(g); const [x0, x1, z0, z1] = cf.band;
    const sty = cf.style || 'terrace', TS = STY[sty], [sx, sz] = cf.stand;
    const fl = box(x1 - x0, 3, z1 - z0 + 20, TS.floor, (x0 + x1) / 2, 0, (z0 + z1) / 2 + 10, g); fl.userData.walk = 1; fl.receiveShadow = true; fl.castShadow = false;   /* 걸을 수 있는 바닥 (gate_reach W5) */
    zFloor(sty, g, x0, x1, z0, z1); zEdge(sty, g, x0, x1, z0, z1);
    // 판매대 (손님 쪽이 앞 · 직원은 뒤) — 지점마다 모습만 다름
    const st = new THREE.Group(); st.position.set(sx, 0, sz); g.add(st); zStand(sty, st);
    const zst = { s: { id: 'zstand', type: 'zstand', x: sx, z: sz }, type: 'zstand', x: sx, z: sz, zone: true, stack: [], inStack: [], feed: [], t: 0, lane: Object.fromEntries(Object.keys(SRC).map(k => [k, []])), Z: {} };
    this.st.zstand = zst;
    // 구역 자리 (자리 2개씩 · 쓰레기 칸) · 쓰레기통
    cf.tables.forEach(([tx, tz], i) => { const tg = new THREE.Group(); tg.position.set(tx, 0, tz); g.add(tg); zTable(sty, tg, i);
      const id = 'zt' + i, o = { s: { id, type: 'table', x: tx, z: tz }, type: 'table', x: tx, z: tz, zone: true, top: TS.top, stack: [], inStack: [], feed: [], t: 0, trash: [], seats: [-95, 95].map(dx => ({ x: tx + dx, z: tz + TS.seatDz, who: null })), Z: {} };
      o.Z.trash = this.zoneRing(tx, tz); this.st[id] = o; if ((S.deco[this.bi] || []).includes('vase') && sty !== 'park') this.tableVase(o); });
    const [bx, bz] = cf.bin; cyl(26, 22, 70, TS.bin, bx, 0, bz, g, 12); cyl(28, 28, 6, 0x3A4A3A, bx, 70, bz, g, 12); this.st.zbin = { s: { id: 'zbin', type: 'plant', x: bx, z: bz }, type: 'plant', x: bx, z: bz, zone: true, stack: [], Z: {} };
    this.oz = { cfg: cf, band: cf.band, g, stand: zst, cust: [], spawnT: reveal ? 0 : rnd(2, 4), acc: 0, accT: 0, sales: [], pathLen: 0, first: reveal };
    if (!this.staff.some(w => w.k === 'zoner')) this.hire('zoner', !reveal); const zw = this.staff.find(x => x.k === 'zoner'); if (zw) { zw.pos.set(sx, 0, sz - 95); zw.path = []; zw.job = null; }   /* 판매대 뒤에서 시작 */
    if (reveal) { this.focus = { x: (x0 + x1) / 2, z: (z0 + z1) / 2, t: 0 }; this.confetti(sx, 200, sz); sfx('levelup', { vol: 0.5 }); this.ui.banner && this.ui.banner(cf.icon, `${cf.name}가 열렸어요`, '바깥 손님이 판매대에서 사 가요 · 돈은 계산대 더미로'); }
  };
  P.zoneRing = function (x, z) { return this.zone(x, z, 420, 310, 0xB8B0A8, 1); };
  /* 구역 직원 손이 닿는 판매대 줄 자리 */
  P.zLanePos = function (k, n) { const s = this.oz.stand; return [s.x + LANE_DX[Math.max(0, this.zMenu().indexOf(k))] + (n % 3) * 22 - 22, 100 + Math.floor(n / 3) * ITEM_H[k], s.z - 8]; };
  /* 구역 직원이 받는 곳: 원료 설비에 5개 이상 쌓여 있으면 거기서 바로(설비가 꽉 차 노는 몫 · 음료 직원 한 번 몫 3개는 남김 · 의도서 개발 요청 1) → 그 설비가 없을 때만 계산대 진열대가 5개 이상일 때(드라이브스루와 같은 규칙)
     1호점 실측(다 연 판 · 봇): 커피 머신 · 크림치즈 냉장고는 평균 7.4~7.6개로 늘 꽉 차 있고 진열대가 비는 건 나르는 손 때문 → 구역 메뉴를 그 둘로 (오븐 플레인은 실내가 늘 모자라 빼면 실내 손님이 기다림) */
  P.zSrc = function (k) { const c = this.st.counter, [id, zk] = SRC[k] || [], o = this.st[id];
    if (o?.stack.length >= 5 && o.Z[zk]) return { arr: o.stack, at: [o.Z[zk].x, o.Z[zk].z] };
    if (!o && c.shelf[k]?.length >= 5) return { arr: c.shelf[k], at: [c.Z[k].x, c.Z[k].z] }; return null; };   /* 진열대는 그 설비가 없을 때만(예전 테라스 저장 · 플레인) — 0.7.1 3호점 출근길 몰림에서 진열대를 빼 가 실내 기다림 +7% */
  /* 지금 팔 수 있는 구역 메뉴 (그 설비가 있는 것만 · 예전 테라스 저장처럼 커피 설비가 아직 없으면 플레인) */
  P.zMenu = function () { const m = this.oz.cfg.menu.filter(k => this.st[SRC[k][0]]); return m.length ? m : ['bagel']; };
  P.zPileSeen = function (p) { const v = new V(p.x, 150, p.z + 20).project(this.cam); return Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.92; };
  P.zPath = function (w, pts) { w.path = pts.map(p => [p[0], p[1]]); let L = 0, a = [w.pos.x, w.pos.z]; for (const b of w.path) { L += Math.hypot(b[0] - a[0], b[1] - a[1]); a = b; } this.oz.pathLen += L; };
  /* 구역 직원 AI: 판매대 채우기 · 구역 테이블 치우기 · 쉬지 않음 */
  P.zoneAI = function (w, dt) { const Z = this.oz; w.P.carry = w.stack.length > 0; if (!Z) { w.P.anim(dt, false); return; } const cf = Z.cfg, st = Z.stand, back = [st.x, st.z - 95], sp = 360 * (1 + this.sl('zoner') * 0.1); w.cap = 6 + this.sl('zoner');   /* 왕복 약 30m — 한 번에 넉넉히 */
    const mv = (x, z) => { const d = new V(x - w.pos.x, 0, z - w.pos.z), l = d.length(); if (l < 14) { w.P.anim(dt, false); return true; } d.normalize(); w.pos.addScaledVector(d, Math.min(l, sp * dt)); w.P.g.rotation.y = Math.atan2(d.x, d.z); w.P.anim(dt, true); this.collide(w.pos, 30); return false; };
    w.busy = !!(w.path && w.path.length) || !!w.job;
    if (w.path && w.path.length) { const [x, z] = w.path[0]; if (mv(x, z)) w.path.shift(); return; }
    const job = w.job;
    if (job === 'fetch') { const src = this.zSrc(w.want); w.wt = (w.wt || 0) + dt; if (src && w.stack.length < Math.min(w.cap, 9 - st.lane[w.want].length) && (!w.kind || w.kind === w.want)) {   /* 판매대 빈자리만큼만 */ w.tk = (w.tk || 0) - dt; if (w.tk <= 0) { this.take(src.arr, w); w.tk = 0.12; } return; }
      if (!w.stack.length && !(w.path && w.path.length)) { w.busy = false; w.P.anim(dt, false); }   /* 진열대 옆에서 남는 것을 기다리는 중 (막힌 것 아님) */
      if (w.stack.length || (w.wt > 8 && (Object.values(this.st).some(t => t.zone && t.type === 'table' && t.trash.length >= 3) || st.lane[w.want].length >= 3))) { w.job = 'back'; w.wt = 0; this.zPath(w, [...cf.way, back]); } return; }   /* 정해진 길 그대로 돌아감 · 빈손으로는 구역 테이블이 많이 더럽거나 판매대가 찼을 때만 (빈 왕복 없음) */
    if (job === 'back') { if (SRC[w.kind]) { const L = st.lane[w.kind]; w.tk = (w.tk || 0) - dt; if (w.tk <= 0 && L.length < 9 && w.stack.length) { this.give(w, L, this.zLanePos(w.kind, L.length), null, 0.18); sfx('drop', { vol: 0.12 }); w.tk = 0.12; return; } if (w.stack.length && L.length < 9) return; if (w.stack.length) { w.busy = false; w.P.anim(dt, false); return; } }   /* 판매대가 꽉 차면 손님이 사 갈 때까지 판매대 뒤에서 기다림 */
      w.job = null; return; }
    if (job === 'clean') { const t = this.st[w.tbl]; if (t && t.trash.length && w.stack.length < w.cap) { if (mv(t.x, t.z - 120)) {   /* 가게 쪽 면(띠 안)에서 치움 */ w.tk = (w.tk || 0) - dt; if (w.tk <= 0) { this.take(t.trash, w); w.tk = 0.1; } } return; }
      if (w.stack.length) { if (mv(cf.bin[0] + 60, cf.bin[1])) { w.tk = (w.tk || 0) - dt; if (w.tk <= 0) { const it = w.stack.pop(); w.P.hand.remove(it.m); if (!w.stack.length) w.kind = null; sfx('drop', { vol: 0.12 }); w.tk = 0.08; } } return; } w.job = null; return; }
    // 다음 일 고르기: 손에 든 것 정리 → 판매대가 비면 채우기 → 구역 테이블 치우기 → 판매대 뒤에서 기다림
    if (w.stack.length) { w.job = w.kind === 'trash' ? 'clean' : 'back'; return; }
    const need = this.zMenu().filter(k => st.lane[k].length < 6).sort((a, b) => st.lane[a].length - st.lane[b].length)[0];
    const dirty = Object.values(this.st).find(t => t.zone && t.type === 'table' && t.trash.length);
    const lack = need && (this.zSrc(need) || st.lane[need].length < 3);   /* 넉넉하지 않아도 판매대가 거의 비면 진열대 옆에 가서 기다림 (일하는 화면에서 보임 · 남는 순간 바로 집음) */
    if (lack && (!dirty || st.lane[need].length < 2)) { w.job = 'fetch'; w.want = need; w.wt = 0; const src = this.zSrc(need), c = this.st.counter, at = src ? src.at : [c.Z[need].x - 40, c.Z[need].z - 60]; this.zPath(w, w.pos.z > cf.band[2] - 40 ? [...cf.way].reverse().concat([at]) : [at]); return; }   /* 띠 안이면 정해진 길을 거꾸로 · 가게 안이면 바로 */
    if (dirty) { w.job = 'clean'; w.tbl = Object.keys(this.st).find(k => this.st[k] === dirty); return; }
    mv(back[0], back[1]); };
  /* 판매대 손님 (실내 손님과 따로) · 판매 · 돈 · 더미 위 「+금액」 */
  P.zoneUpdate = function (dt, mult) { const Z = this.oz, cf = Z.cfg, st = Z.stand, c = this.st.counter, alive = Z.cust.filter(q => q.state !== 'go').length;
    Z.spawnT -= dt; if (Z.spawnT <= 0 && alive < 6 && Z.cust.filter(q => ['come', 'buy', 'wait'].includes(q.state)).length < 4) { Z.spawnT = rnd(...(cf.rush && (this.t % cf.rush[0]) < cf.rush[1] ? cf.rush[2] : cf.every));   /* 출근길처럼 짧게 몰림 */ this.zSpawn(Z.first); Z.first = false; }
    const line = Z.cust.filter(q => ['come', 'buy', 'wait'].includes(q.state)); line.forEach((q, i) => { q.qi = i; q.spot = i === 0 ? [st.x, st.z + 105] : [st.x - 80 * i, st.z + 160]; });
    for (const q of [...Z.cust]) this.zCustAI(q, dt, mult);
    Z.cust = Z.cust.filter(q => { if (q.gone) { this.sc.remove(q.P.g); q.tag && q.tag.remove(); return false; } return true; });
    Z.accT += dt; if (Z.acc > 0 && Z.accT > 2.5 && (this.zPileSeen(c.cash) || this.t - Z.acc0 > 6)) {   /* 더미가 화면 밖이면 보일 때 띄움 (최대 6초) */ this.ui.float(`${cf.icon} +${fmt(Z.acc)}`, new V(c.cash.x, 150, c.cash.z + 20), 'pay zone'); Z.acc = 0; Z.accT = 0; } };
  P.zSpawn = function (near) { const Z = this.oz, cf = Z.cfg, P = person({ body: [0x6A9AE8, 0xE86A8A, 0x9ACF6A, 0xF2C14E, 0xC08AE0, 0x5AC0B0][Math.floor(Math.random() * 6)], hair: [0x3A2A1A, 0x8A5A2A, 0x1A1A1A][Math.floor(Math.random() * 3)], pants: 0x4A5A7A });
    const from = near ? [Z.stand.x - 260, Z.stand.z + 200] : cf.from; P.g.position.set(from[0], 0, from[1]); this.sc.add(P.g); const ks = this.zMenu(), order = {};
    const pick = () => ks[Math.floor(Math.random() * ks.length)], n = Math.round(rnd(...cf.n));   /* 손님 결 (data.js OUT_ZONE.order) */
    if (cf.order === 'set') for (let i = 0; i < n; i++) for (const k of ks) order[k] = (order[k] || 0) + 1;   /* 산책 세트: 아메리카노 + 크림치즈 한 쌍씩 */
    else if (cf.order === 'quick') for (let i = 0; i < n; i++) { const k = Math.random() < 0.7 && ks.includes('drink') ? 'drink' : pick(); order[k] = (order[k] || 0) + 1; }   /* 출근길: 아메리카노 위주 1~2개 */
    else for (let i = 0; i < n; i++) { const k = pick(); order[k] = (order[k] || 0) + 1; }   /* mix · basket(큰 바구니) */
    Z.cust.push({ P, pos: P.g.position, state: 'come', order, got: {}, w: 0, sit: Math.random() < cf.sit }); };
  P.zCustAI = function (q, dt, mult) { const Z = this.oz, cf = Z.cfg, st = Z.stand, walk = (x, z, sp = 230) => this.walk(q, new V(x, 0, z), sp, dt);
    if (q.state === 'come' || q.state === 'wait') { q.w += dt; if (walk(...q.spot)) { q.P.g.rotation.y = Math.PI; if (q.qi === 0) q.state = 'buy'; else q.state = 'wait'; } else q.state = 'come'; if (q.state === 'wait' && q.qi === 0) q.state = 'come'; return; }
    if (q.state === 'buy') { q.w += dt; if (q.qi !== 0) { q.state = 'come'; return; } st.t -= dt; const k = Object.keys(q.order).find(k => (q.got[k] || 0) < q.order[k] && st.lane[k].length);
      if (st.t <= 0 && k) { st.t = 0.4; const it = st.lane[k].pop(); this.fly.push({ m: it.m, from: it.m.position.clone(), to: q.pos.clone().setY(100), t: 0, d: 0.22, done: () => this.sc.remove(it.m) }); q.got[k] = (q.got[k] || 0) + 1; sfx('blip', { vol: 0.15 }); }
      const done = Object.keys(q.order).every(k => (q.got[k] || 0) >= q.order[k]), late = q.w > 30; if (!done && !late) return;
      if (late) for (const kk in q.order) q.order[kk] = q.got[kk] || 0; const n = Object.values(q.order).reduce((a, b) => a + b, 0);
      if (n) { const v = Math.round(Object.entries(q.order).reduce((a, [kk, m]) => a + MENU[kk].price * m * starK(kk), 0) * cf.k * mult * this.priceK()); this.addCash(this.st.counter.cash, v, true); if (!Z.acc) Z.acc0 = this.t; Z.acc += v; Z.sales.push({ t: this.t, v }); addSold(n); for (const [kk, m] of Object.entries(q.order)) if (m) this.addMast(kk, m); sfx('order', { vol: 0.2 }); }
      for (const [kk, m] of Object.entries(q.order)) for (let i = 0; i < Math.min(2, m); i++) { const it = item(kk); it.scale.setScalar(0.8); q.P.hand.add(it); it.position.y = i * 14; } q.P.carry = n > 0;
      const seat = q.sit && n ? (() => { for (const t of Object.values(this.st)) if (t.zone && t.type === 'table' && t.trash.length < 4) for (const s of t.seats) if (!s.who) return { t, s }; return null; })() : null;
      if (seat) { seat.s.who = q; q.seat = seat; q.state = 'toSeat'; q.leg = [[seat.s.x, cf.band[3] + 40], [seat.s.x, seat.s.z]]; } else { q.state = 'go'; q.leg = [cf.from]; } return; }
    if (q.state === 'toSeat') { const [x, z] = q.leg[0]; if (walk(x, z)) { q.leg.shift(); if (!q.leg.length) { q.state = 'eat'; q.t = rnd(...cf.eat); const TS = STY[cf.style || 'terrace']; q.P.g.rotation.y = TS.seatDz ? Math.PI : q.seat.s.x < q.seat.t.x ? Math.PI / 2 : -Math.PI / 2; q.P.carry = false; while (q.P.hand.children.length) q.P.hand.remove(q.P.hand.children[0]); q.pos.y = TS.sitY;   /* 스탠딩 바 · 높은 테이블은 서서 · 피크닉은 매트 위 */ } } return; }
    if (q.state === 'eat') { q.P.anim(dt, false); q.t -= dt; if (q.t <= 0) { const t = q.seat.t, n = Math.min(3, Object.values(q.order).reduce((a, b) => a + b, 0)); for (let i = 0; i < n && t.trash.length < 6; i++) this.put(t.trash, item('trash'), t.x + rnd(-30, 30), (t.top ?? 80) + t.trash.length * 6, t.z + rnd(-25, 25), 'trash');
        q.seat.s.who = null; q.seat = null; q.pos.y = 0; q.state = 'go'; q.leg = [[q.pos.x, cf.band[3] + 40], cf.from]; } return; }
    if (q.state === 'go') { const [x, z] = q.leg[0]; if (walk(x, z, 250)) { q.leg.shift(); if (!q.leg.length) q.gone = true; } } };
}
