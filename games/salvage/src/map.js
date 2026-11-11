// 지도 장면 만들기 — 배치 계획은 plan.js (three 없이), 여기선 그림 · 판정 상자 · 잠긴 문 · 발전기
//  v0.4: 지도마다 바닥 · 벽 · 엄폐물 모양(STYLE) + 항구(등불 · 등대 · 크레인 · 바다) · 터널(막힌 모서리 · 화물칸 · 레일 · 잠긴 방 · 공기 방울 · 물살)
import * as THREE from 'three';
import { mergeGeometries } from '../lib/BufferGeometryUtils.js?v=0.99.26';
import { prop } from './assets.js?v=0.99.26';
import { buildDress, farWater } from './dress_art.js?v=0.99.26';
import { buildFactory } from './factory.js?v=0.99.26'; /* M3-B 가라앉은 공장 */
import { buildLab } from './lab.js?v=0.99.26'; /* M4-B 심해 연구소 */
import { buildGate } from './gate.js?v=0.99.26'; /* M5-A 대수문 꼭대기 */
import { DUCK, TONE, duckWallH, addBand, addDoor, floorMat, standMat } from './look_duck.js?v=0.99.26'; /* 시안용 ?look=duck */

import { plan, rng, rollLoot, T, RT, COLS, ROWS, RS, zoneOfRow, SOLID } from './plan.js?v=0.99.26';
export { plan, rng, rollLoot, T, RT, COLS, ROWS, RS, zoneOfRow };

/* 판정 크기(벽 · 엄폐물) — 반지름(가로, 세로) · 총알 막음 여부 */
/* 뒤질 곳 모델 */
export const LOOT_MODEL = { crate: 'k_boxopen', barrel: 'k_barrel', locker: 'cabinet', chest: 'k_chest', toolbox: 'k_crate', vault: 'chest', net: 'k_bucket', cargo: 'cont_b', kiosk: 'cabinet', cart: 'k_crate', bench: 'k_bench', stash: 'f_stash', corebox: 'f_corebox', lshelf: 'l_specimen', labcab: 'l_drawer', culture: 'l_culture', archive: 'l_archive', gstair: 'k_crate' }; /* M5-A 대수문 관제 보관함 */
export const LOOT_SCALE = { k_boxopen: 4.2, k_barrel: 5, k_chest: 5.5, k_crate: 1.6, chest: 1.3, k_bucket: 5.5, cont_b: 3.2, k_bench: 5 };
/* 지도 모양: 바닥(방 종류 · 칸) · 벽(구역 · 카메라 쪽 낮은 벽) — [키, 세로 배수, 크기 배수, 회전 더함] */
const STYLE = {
  ware: { floor: (rm, i, j) => (rm.type === 'pump' || rm.type === 'engine') && (i + j) % 3 === 0 ? 'floor_grate' : rm.type === 'office' || rm.type === 'vault' ? 'floor_wood' : 'floor',
    wall: (z, low) => low ? ['wall_broken', 0.28, 1, 0] : ['wall', 1, 1, 0] },
  /* 다른 지도 벽: [키, 높이 m, 모델의 길이 축, 두께 m] — 모델 크기를 재서 4m 칸에 맞춤 */
  harbor: { floor: (rm, i, j) => rm.zone === 1 || rm.type === 'shed' ? 'floor_wood' : rm.type === 'office' || rm.type === 'vault' ? 'floor_wood' : rm.type === 'crane' && (i + j) % 2 ? 'floor_grate' : 'floor',
    wall: (z, low, n) => low ? ['h_fence', 0.95, 'x', 0.2] : z === 2 ? [['k_cont_a', 'k_cont_b', 'h_cont_c'][n % 3], 2.3, 'z', 2.0] : z === 1 ? ['h_fence', 1.8, 'x', 0.22] : ['h_mwall', 2.4, 'x', 0.4] },
  tunnel: { floor: (rm, i, j) => rm.type === 'track' && (i === 1 || i === 2) ? 'floor_grate' : rm.type === 'vault' || rm.type === 'control' ? 'floor_wood' : rm.type === 'reservoir' && (i + j) % 2 ? 'floor_grate' : 'floor',
    wall: (z, low) => low ? ['t_wall', 0.9, 'z', 0.7] : ['t_wall', 3.0, 'z', 0.7] },
  factory: { floor: (rm, i, j) => (rm.type === 'furnace' || rm.type === 'foundry' || rm.type === 'crucible') && (i + j) % 2 ? 'floor_grate' : rm.type === 'workshop' || rm.type === 'fcontrol' || rm.type === 'vault' ? 'floor_wood' : 'f_floor',
    wall: (z, low) => low ? ['f_wall', 0.9, 'z', 0.7] : ['f_wall', 3.0, 'z', 0.7] },
  lab: { floor: (rm, i, j) => rm.type === 'tankhall' || rm.type === 'basin' || rm.type === 'decon' ? ((i + j) % 2 ? 'floor_grate' : 'l_floor') : rm.type === 'records' || rm.type === 'dorm' || rm.type === 'vault' ? 'floor_wood' : 'l_floor',
    wall: (z, low) => low ? ['l_wall', 0.9, 'z', 0.5] : ['l_wall', 3.2, 'z', 0.5] }, /* M4-B 연구소: 흰 패널 벽 · 청록 줄 */
  gate: { floor: (rm, i, j) => rm.type === 'garena' || rm.type === 'gtop' ? null : rm.type === 'gstair' || (i + j) % 5 === 0 ? 'floor_grate' : 'floor', /* M6-B: 꼭대기 무대 바닥 = gate.js 수문 철판 */
    wall: (z, low) => low || z === 3 ? ['h_fence', 1.0, 'x', 0.22] : ['h_mwall', 2.0, 'x', 0.4] }, /* M5-A 대수문 꼭대기: 난간 · 승강로만 낮은 벽 */
};
const dimCache = {};
function dimsOf(k) { if (dimCache[k]) return dimCache[k]; const o = prop(k); o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o); const v = b.getSize(new THREE.Vector3()); return dimCache[k] = { x: Math.max(0.01, v.x), y: Math.max(0.01, v.y), z: Math.max(0.01, v.z) }; }
/* 너무 높아 주인공을 가리는 것은 낮춤 */
const LOW = { k_cont_a: 0.62, k_cont_b: 0.62, cont: 0.6, k_tank: 0.8 };
const SCALE = { f_floor: 2, f_press: 1.5, f_mold: 1.0, f_crate: 1.5, f_hopper: 1.5, h_cont_c: 6, h_tank: 2.2, t_machine: 1.5, t_bench: 2.6, h_planks: 3, h_fish: 4, h_stand: 4, h_magnet: 2.2, t_pipe: 1.4, t_lever: 2, t_sign: 1.6, cont: 3.2, box_a: 4, cont_a: 3, cont_b: 3, cargo: 2, cargo_b: 3, k_cont_a: 6, k_cont_b: 6, k_machine: 1.5, k_hopper: 1.6, k_tank: 4, k_boxwide: 2.5, k_crate: 2.5, k_screen: 1.25, k_bucket: 4, k_pipe: 1.4, k_conveyor: 1.6 };

/* 장면 만들기: 정적인 것은 재질별로 합쳐 그리기 수 줄이기 */
export function build(P, scene) {
  const map = P.map || 'ware', ST = STYLE[map];
  const group = new THREE.Group(); group.name = 'map';
  const statics = new THREE.Group();
  const boxes = []; /* {x0,z0,x1,z1,bullet} */
  const addBox = (x, z, hx, hz, bullet = 1, ry = 0) => { if (Math.abs(Math.sin(ry)) > 0.7) [hx, hz] = [hz, hx]; boxes.push({ x0: x - hx, z0: z - hz, x1: x + hx, z1: z + hz, bullet }); };
  const put = (k, x, z, ry = 0, sy = 1, s = 1) => { const o = k === 'cont' ? prop('cargo') : prop(k); o.position.set(x, 0, z); o.rotation.y = ry; const sc = (SCALE[k] || 1) * s; o.scale.set(sc, sc * sy * (LOW[k] || 1), sc); o.userData.zone = zoneOfRow(Math.max(0, Math.min(ROWS - 1, Math.floor((z - 0.01) / RS)))); statics.add(o); return o; };
  /* 바닥: 방마다 4×4 타일 (물 많은 곳은 철망) */
  for (const rm of P.rooms) for (let j = 0; j < RT; j++) for (let i = 0; i < RT; i++) { const fk = ST.floor(rm, i, j); if (fk) { const o = put(fk, rm.x0 + i * T + T / 2, rm.z0 + j * T + T / 2, 0); if (DUCK.on) o.userData.floor = 1; } } /* M6-B: null = 지도 특수물이 바닥을 그림(대수문 꼭대기 수문 철판) */
  /* 벽: 방 경계 칸마다. 문 자리는 비움. 가로벽(카메라를 가리는 쪽)은 낮게 */
  const has = (c, r) => P.rooms.some(x => x.c === c && x.r === r);
  const doorAt = (x, z) => P.doors.find(d => Math.abs(d.x - x) < 0.1 && Math.abs(d.z - z) < 0.1);
  const seg = new Set(); const WB = new THREE.Box3(), wallOff = {};
  for (const rm of P.rooms) {
    for (let t = 0; t < RT; t++) {
      const edges = [
        { x: rm.x0 + t * T + T / 2, z: rm.z0, ry: 0, horiz: true, out: !has(rm.c, rm.r - 1), top: true },
        { x: rm.x0 + t * T + T / 2, z: rm.z0 + RS, ry: 0, horiz: true, out: !has(rm.c, rm.r + 1) },
        { x: rm.x0, z: rm.z0 + t * T + T / 2, ry: Math.PI / 2, horiz: false },
        { x: rm.x0 + RS, z: rm.z0 + t * T + T / 2, ry: Math.PI / 2, horiz: false },
      ];
      for (const e of edges) {
        const key = e.x.toFixed(1) + ',' + e.z.toFixed(1); if (seg.has(key)) continue; seg.add(key);
        if (doorAt(e.x, e.z)) continue;
        const low = e.horiz && !(e.top && e.out);
        const zn = zoneOfRow(Math.min(ROWS - 1, Math.max(0, Math.floor((e.z - 0.01) / RS))));
        let o;
        if (map === 'ware') { const wk = low && !DUCK.on ? 'wall_broken' : 'wall'; const d = dimsOf(wk); o = put(wk, e.x, e.z, e.ry, DUCK.on ? TONE.ware.wallH / d.y : low ? 0.28 : 1); }
        else { const [wk, H0, ax, th] = ST.wall(zn, low && !DUCK.on, seg.size); /* 시안용: 카메라 쪽 벽도 같은 높이 (가리면 성기게) */ const H = DUCK.on ? duckWallH(map, wk, H0, low) : H0; const d = dimsOf(wk);
          o = put(wk, e.x, e.z, e.ry + (ax === 'z' ? Math.PI / 2 : 0)); o.scale.set(ax === 'x' ? 4.06 / d.x : th / d.x, H / d.y, ax === 'z' ? 4.06 / d.z : th / d.z); }
        addBox(e.x, e.z, T / 2, 0.5, 1, e.ry); boxes[boxes.length - 1].wall = 1;
        /* 벽 칸 목록 (퀄리티 G4 측정 · 2026-11-10): 실제 모델 상자 가운데 · 윗면 높이 · 두께 — 모델 기준점이 가운데가 아닌 벽(터널 · 공장 · 연구소)도 맞게 */
        o.updateMatrixWorld(true); const B = WB.setFromObject(o); const cx = (B.min.x + B.max.x) / 2, cz = (B.min.z + B.max.z) / 2, top = B.max.y, thk = e.horiz ? B.max.z - B.min.z : B.max.x - B.min.x;
        if (!wallOff[e.horiz ? 'h' : 'v']) wallOff[e.horiz ? 'h' : 'v'] = { x: cx - e.x, z: cz - e.z, th: thk, H: top };
        (P.wallList ||= []).push({ x: +cx.toFixed(2), z: +cz.toFixed(2), horiz: e.horiz, H: +top.toFixed(2), th: +thk.toFixed(2), out: e.horiz ? !!e.out : !has(rm.c + (Math.abs(e.x - rm.x0) < 0.1 ? -1 : 1), rm.r) });
        if (DUCK.on) addBand(statics, map, cx, cz, e.ry, top, Math.min(1.2, thk), zn);
      }
    }
  }
  /* 시안용: 문 = 벽 끊긴 자리 양끝 띠 + 바닥 문턱 (색 규칙 하나) */
  if (DUCK.on) { P.wallH = (wallOff.h || wallOff.v)?.H || 1.4;
    for (const d of P.doors) { const zn = zoneOfRow(Math.min(ROWS - 1, Math.max(0, Math.floor((d.z - 0.01) / RS)))); const off = wallOff[d.axis === 'x' ? 'h' : 'v'] || { x: 0, z: 0, th: 0.6, H: P.wallH }; addDoor(statics, { ...d, x: d.x + off.x, z: d.z + off.z }, off.H, Math.min(off.th, 1.2), zn); } }
  /* 기둥: 방 모서리 */
  const corners = new Set();
  for (const rm of P.rooms) for (const [x, z] of [[rm.x0, rm.z0], [rm.x0 + RS, rm.z0], [rm.x0, rm.z0 + RS], [rm.x0 + RS, rm.z0 + RS]]) { const k = x + ',' + z; if (corners.has(k)) continue; corners.add(k); put('pillar', x, z, 0, DUCK.on ? ((TONE[map]?.wallH || 1.4) + 0.08) / (dimsOf('pillar').y * 0.7) : z === Math.min(...P.rooms.map(r => r.z0)) ? 1 : 0.3, 0.7); }
  /* 엄폐물 */
  const tanks = [];
  for (const p of P.props) {
    if (p.k === 'l_tank') { const s = SOLID[p.k]; addBox(p.x, p.z, s[0], s[1], s[2], p.ry); tanks.push({ ...p, box: boxes[boxes.length - 1] }); continue; } /* M4-B 배양조 = 깨지는 엄폐물 (lab.js 가 그림) */
    const o = put(p.k, p.x, p.z, p.ry); if (p.deco) continue;
    const s = SOLID[p.k] || [0.8, 0.8, 1]; addBox(p.x, p.z, s[0], s[1], s[2], p.ry);
    if (p.k === 'cont') { o.scale.y *= 1; }
  }
  /* v0.4 지도 특수물 (정적인 것은 아래 합치기에 들어감) */
  const extra = buildExtras(P, map, statics, group, put, addBox, boxes, tanks);
  /* v0.5 레벨 아트: 바닥 무늬 · 벽 그림 · 주제 소품 · 옆벽 배관 · 구역 랜드마크 (dress.js 계획 · dress_art.js 그림) */
  buildDress(P, map, statics, group, addBox, extra);
  /* 물: 전체 얕은 물(반투명) + 웅덩이(진한 물) — 한 장의 셰이더 평면 */
  const water = makeWater(P); group.add(water);
  /* 지도 밖: 검정 대신 어두운 물 + 물안개 (항구 바다도 이것) */
  const fw = farWater(P, map, water.material.uniforms.uTime); group.add(fw);
  if (DUCK.on) { fw.material.uniforms.uDeep.value.multiplyScalar(0.18); fw.material.uniforms.uMist.value.multiplyScalar(0.12); water.material.uniforms.uDuck.value = 1; } /* 시안용: 바닥 밖은 확실히 어둡게 · 웅덩이 옅게 */
  /* 합치기 */
  statics.updateMatrixWorld(true);
  const byMat = new Map();
  statics.traverse(o => { if (!o.isMesh) return; let zp = o; while (zp && zp.userData.zone == null) zp = zp.parent; const g = toFloat(o.geometry).applyMatrix4(o.matrixWorld); let m = o.material;
    if (DUCK.on) { let fp = o; while (fp && !fp.userData.floor && !fp.userData.band) fp = fp.parent; m = fp?.userData.floor ? floorMat(m) : fp?.userData.band ? m : standMat(m); } /* 시안용: 바닥 무늬 약하게 · 서 있는 것은 주인공 앞이면 성기게 */
    const key = (m.map ? m.map.uuid : m.uuid) + '/' + (zp?.userData.zone || 0) + (DUCK.on ? '/' + m.uuid : ''); if (!byMat.has(key)) byMat.set(key, { m, gs: [] }); byMat.get(key).gs.push(g); });
  for (const { m, gs } of byMat.values()) { const mg = mergeGeometries(gs, false); gs.forEach(g => g.dispose()); const mesh = new THREE.Mesh(mg, m); mesh.receiveShadow = !m.isMeshBasicMaterial; mesh.castShadow = !m.isMeshBasicMaterial; mesh.name = 'static'; group.add(mesh); }
  scene.add(group);
  /* 잠긴 문: 판정 상자 + 창살(열리면 내려감) */
  const gates = [];
  for (const d of P.doors) {
    if (!d.lock && d.gate !== 'flood') continue;
    const g = new THREE.Group(); g.position.set(d.x, 0, d.z); if (d.axis === 'z') g.rotation.y = Math.PI / 2;
    const col = d.lock === 'vault' ? 0xffc94a : d.lock === 'power' ? 0xff8a3d : 0x5fc7d0;
    const mat = new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 0.25 });
    if (d.lock) { for (let i = -3; i <= 3; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.6, 0.16), mat); bar.position.set(i * 0.55, 1.3, 0); g.add(bar); }
      const top = new THREE.Mesh(new THREE.BoxGeometry(4, 0.22, 0.3), mat); top.position.y = 2.6; g.add(top); const bot = top.clone(); bot.position.y = 0.4; g.add(bot); }
    /* 문 위 표지 (수문 = 깊은 창고 입구) */
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.12), new THREE.MeshBasicMaterial({ color: col })); sign.position.set(0, 3.3, 0); g.add(sign);
    g.traverse(o => { if (o.isMesh) o.userData.own = true; });
    group.add(g);
    let box = null; if (d.lock) { const hx = d.axis === 'x' ? T / 2 : 0.5, hz = d.axis === 'x' ? 0.5 : T / 2; box = { x0: d.x - hx, z0: d.z - hz, x1: d.x + hx, z1: d.z + hz, bullet: 1, gate: true }; boxes.push(box); }
    gates.push({ door: d, g, box, mat, open: !d.lock, lift: 0 });
  }
  /* 발전기 */
  const G = P.generator; const gen = prop('k_machine'); gen.scale.setScalar(1.7); gen.position.set(G.x, 0, G.z - 0.4); group.add(gen);
  boxes.push({ x0: G.x - 0.9, z0: G.z - 1.4, x1: G.x + 0.9, z1: G.z + 0.5, bullet: 1 });
  const lampM = new THREE.MeshBasicMaterial({ color: 0xff5a3a }); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), lampM); lamp.position.set(G.x, 2.3, G.z); lamp.userData.own = true; group.add(lamp);
  return { group, boxes, water, gates, generator: { pos: G, lamp, lampM }, extra };
}
/* ───── v0.4 지도 특수물 ─────
 *  항구: 등불 기둥(켜짐/꺼짐 — 빛 웅덩이 · 불빛) · 등대(돌아가는 빛줄기) · 바깥 바다
 *  터널: 모서리 막음 덩어리 · 화물칸 + 레일 · 공기 방울 기둥 · 물살 화살(움직임은 raid 가) */
const M3 = {};
function mat3(key, make) { return M3[key] ||= make(); }
function buildExtras(P, map, statics, group, put, addBox, boxes, tanks) {
  const out = { lamps: [], airs: [], currents: [], beams: [], mats: [], geos: [] };
  const own = (m) => { out.mats.push(m); return m; };
  const add = (mesh, dyn = true) => { (dyn ? group : statics).add(mesh); if (!dyn) mesh.userData.zone = zoneOfRow(Math.max(0, Math.min(ROWS - 1, Math.floor(mesh.position.z / RS)))); else mesh.userData.own = true; return mesh; };
  if (map === 'harbor') {
    const glowTex = radial('rgba(255,214,140,1)', 'rgba(255,170,80,0)'); out.geos.push(glowTex);
    const poolM = own(new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    const bulbOn = own(new THREE.MeshBasicMaterial({ color: 0xffffff }));
    /* 등불 20개 안팎 → 빛 웅덩이 · 전구 · 불빛 테를 각각 인스턴스 하나로 (그리기 3번) — 켜고 끄기는 크기 0 / 색 */
    const n = P.lamps.length; const poolG = new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), bulbG = new THREE.SphereGeometry(0.26, 10, 8), haloG = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2); out.geos.push(poolG, bulbG, haloG);
    const haloM = own(new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffd090, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    const pools = new THREE.InstancedMesh(poolG, poolM, n), bulbs = new THREE.InstancedMesh(bulbG, bulbOn, n), halos = new THREE.InstancedMesh(haloG, haloM, n);
    pools.renderOrder = 3; for (const im of [pools, bulbs, halos]) { im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.userData.keepGeo = true; group.add(im); }
    bulbs.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    out.lampFx = { pools, bulbs, halos, m: new THREE.Matrix4(), c: new THREE.Color(), set(i, L, on) { const m = this.m; m.makeScale(on ? 6 : 0.001, 1, on ? 6 : 0.001).setPosition(L.x, 0.16, L.z); pools.setMatrixAt(i, m); m.makeScale(on ? 1.3 : 0.001, 1, on ? 1.3 : 0.001).setPosition(L.x, 3.2, L.z); halos.setMatrixAt(i, m); m.makeTranslation(L.x, 3.05, L.z); bulbs.setMatrixAt(i, m); bulbs.setColorAt(i, this.c.setHex(on ? 0xffd88a : 0x3a3a34)); pools.instanceMatrix.needsUpdate = halos.instanceMatrix.needsUpdate = bulbs.instanceMatrix.needsUpdate = true; bulbs.instanceColor.needsUpdate = true; } };
    P.lamps.forEach((L, i) => {
      const o = put('h_post', L.x, L.z, Math.atan2(P.W / 2 - L.x, 1)); o.scale.setScalar(1.05);
      addBox(L.x, L.z, 0.28, 0.28, 1);
      const lamp = { x: L.x, z: L.z, lit: L.lit, i, shown: null }; out.lamps.push(lamp); out.lampFx.set(i, lamp, L.lit); lamp.shown = L.lit;
    });
    /* 등대: 흰 · 빨강 띠 탑 + 등롱 + 빛줄기 2개 (돌아감) */
    if (P.lighthouse) { const { x, z } = P.lighthouse; const wM = mat3('lhw', () => new THREE.MeshLambertMaterial({ color: 0xe9e4d8, flatShading: true })), rM = mat3('lhr', () => new THREE.MeshLambertMaterial({ color: 0xb8402f, flatShading: true }));
      for (let i = 0; i < 4; i++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(1.15 - (i + 1) * 0.12, 1.15 - i * 0.12, 1.1, 10), i % 2 ? rM : wM); seg.position.set(x, 0.55 + i * 1.1, z); add(seg, false); }
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.15, 10), rM); top.position.set(x, 4.5, z); add(top, false);
      const lampM = own(new THREE.MeshBasicMaterial({ color: 0xfff1b8 })); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), lampM); lamp.position.set(x, 4.95, z); add(lamp);
      const beamM = own(new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      const piv = new THREE.Group(); piv.position.set(x, 4.95, z); group.add(piv);
      for (const a of [0, Math.PI]) { const b = new THREE.Mesh(new THREE.ConeGeometry(2.4, 22, 16, 1, true), beamM); b.rotation.z = Math.PI / 2; b.position.x = 11; const h = new THREE.Group(); h.rotation.y = a; h.add(b); piv.add(h); b.userData.own = true; }
      addBox(x, z, 1.1, 1.1, 1); out.beams.push(piv); }
    /* 바깥 바다는 v0.5 부터 지도 밖 물(dress_art.js farWater) 하나로 */
  }
  if (map === 'tunnel') {
    const conc = mat3('conc', () => new THREE.MeshLambertMaterial({ color: 0x8d999b, flatShading: true })), stripe = mat3('stripe', () => new THREE.MeshLambertMaterial({ color: 0xd8b13a, flatShading: true })), steel = mat3('steel', () => new THREE.MeshLambertMaterial({ color: 0x8a8f91, flatShading: true }));
    /* 막힌 모서리: 콘크리트 덩어리 + 노란 띠 + 위 배관 */
    for (const b of P.blocks) { const m = new THREE.Mesh(new THREE.BoxGeometry(3.7, 2.6, 3.7), conc); m.position.set(b.x, 1.3, b.z); add(m, false);
      const st = new THREE.Mesh(new THREE.BoxGeometry(3.75, 0.22, 3.75), stripe); st.position.set(b.x, 0.5, b.z); add(st, false);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.16, 3.8), stripe); cap.position.set(b.x, 2.66, b.z); add(cap, false);
      const top = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 3.2), conc); top.position.set(b.x, 2.78, b.z); add(top, false);
      addBox(b.x, b.z, 1.85, 1.85, 1); boxes[boxes.length - 1].wall = 1; }
    /* 레일 (선로 방 가운데 + 화물칸 칸) */
    for (const rm of P.rooms) if (rm.type === 'track') for (const cx of [rm.x0 + 6.8, rm.x0 + 9.2]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, RS), steel); r.position.set(cx, 0.08, rm.z0 + RS / 2); add(r, false); }
    for (const c of P.cars) { for (const dx of [-0.75, 0.75]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, RS), steel); r.position.set(c.x + dx, 0.08, c.z); add(r, false); }
      const o = put('k_cont_a', c.x, c.z, 0); const d = dimsOf('k_cont_a'); o.scale.set(2.2 / d.x, 2.4 / d.y, 7.4 / d.z); o.position.y = 0.35;
      for (const dz of [-2.6, 2.6]) { const w = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 0.9), steel); w.position.set(c.x, 0.2, c.z + dz); add(w, false); }
      addBox(c.x, c.z, 1.1, 3.7, 1); }
    /* 공기 방울 기둥: 바닥 창살 원 + 위로 퍼지는 빛 기둥 (방울은 raid 가 fx 로 뿜음) */
    const ringM = own(new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.75, depthWrite: false })), colM = own(new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    if (P.airs.length) { const rg = new THREE.RingGeometry(0.9, 1.15, 24).rotateX(-Math.PI / 2), cg = new THREE.CylinderGeometry(0.7, 1.0, 5, 14, 1, true); out.geos.push(rg, cg);
      const rings = new THREE.InstancedMesh(rg, ringM, P.airs.length), cols = new THREE.InstancedMesh(cg, colM, P.airs.length); const m = new THREE.Matrix4();
      P.airs.forEach((a, i) => { rings.setMatrixAt(i, m.makeTranslation(a.x, 0.2, a.z)); cols.setMatrixAt(i, m.makeTranslation(a.x, 2.5, a.z)); out.airs.push({ x: a.x, z: a.z }); });
      for (const im of [rings, cols]) { im.frustumCulled = false; im.userData.keepGeo = true; group.add(im); } }
    /* 물살: 물 위 갈매기 모양 화살 (raid 가 흘려 보냄) */
    const arrM = own(new THREE.MeshBasicMaterial({ color: 0xcff6ff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide })); const arrG = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.5, -0.35), new THREE.Vector2(0, 0.15), new THREE.Vector2(0.5, -0.35), new THREE.Vector2(0.5, -0.05), new THREE.Vector2(0, 0.45), new THREE.Vector2(-0.5, -0.05)])); out.geos.push(arrG);
    /* 물살 화살: 지도 전체 하나의 인스턴스 (raid 가 매 프레임 자리만 옮김) */
    const NA = 6; if (P.currents.length) { const im = new THREE.InstancedMesh(arrG, arrM, P.currents.length * NA); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.userData.keepGeo = true; group.add(im); out.arrowIM = im; }
    P.currents.forEach((c, ci) => { const arrows = []; for (let i = 0; i < NA; i++) arrows.push({ idx: ci * NA + i, k: i / NA, off: (i % 3 - 1) * 2.2 }); out.currents.push({ ...c, arrows, rot: Math.atan2(-c.dx, c.dz) + Math.PI }); });
  }
  if (map === 'factory') buildFactory(P, statics, group, put, addBox, out, add, own);
  if (map === 'lab') buildLab(P, statics, group, put, addBox, out, add, own, boxes, tanks);
  if (map === 'gate') buildGate(P, statics, group, put, addBox, out, add, own);
  return out;
}
function radial(c0, c1) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, c0); g.addColorStop(1, c1); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
/* 양자화 속성 → float (합치기 · 변환용) */
function toFloat(geo) {
  const g = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv', 'color']) { /* color = 꾸밈 소품 정점 색 */
    const a = geo.getAttribute(name); if (!a) continue; const n = a.count, s = a.itemSize; const arr = new Float32Array(n * s);
    const get = [a.getX, a.getY, a.getZ, a.getW].map(f => f.bind(a));
    for (let i = 0; i < n; i++) for (let k = 0; k < s; k++) arr[i * s + k] = get[k](i);
    g.setAttribute(name, new THREE.BufferAttribute(arr, s));
  }
  if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.getAttribute('position').count * 2), 2));
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  if (geo.index) g.setIndex(Array.from(geo.index.array));
  return g;
}
/* 물 평면: 웅덩이 모양은 작은 텍스처(데이터)로 · 시간에 따라 물결 */
function makeWater(P) {
  const N = 128; const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const wx = (x + 0.5) / N * P.W, wz = (y + 0.5) / N * P.H; let v = 0;
    for (const w of P.waters) { const d = ((wx - w.x) / w.rx) ** 2 + ((wz - w.z) / w.rz) ** 2; v = Math.max(v, 1 - d); }
    if (P.flooded) for (const id of P.flooded) { const rm = P.rooms.find(r => r.id === id); const e = Math.min(wx - rm.x0, rm.x0 + RS - wx, wz - rm.z0, rm.z0 + RS - wz); if (e > 0) v = Math.max(v, Math.min(1.2, 0.5 + e * 0.6)); }
    const i = (y * N + x) * 4; data[i] = Math.max(0, Math.min(255, v * 400)); data[i + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, N, N); tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uMask: { value: tex }, uTime: { value: 0 }, uSize: { value: new THREE.Vector2(P.W, P.H) }, uFlood: { value: 1e4 }, uDeep: { value: P.map === 'tunnel' ? new THREE.Vector3(0.1, 0.34, 0.4) : new THREE.Vector3(0.07, 0.2, 0.25) }, uDeepA: { value: P.map === 'tunnel' ? 0.6 : 0.72 }, uDuck: { value: 0 } }]),
    vertexShader: [
      'varying vec2 vW;', '#include <fog_pars_vertex>',
      'void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;', '#include <fog_vertex>', '}'].join('\n'),
    fragmentShader: `uniform sampler2D uMask; uniform float uTime; uniform vec2 uSize; uniform float uFlood; uniform vec3 uDeep; uniform float uDeepA; uniform float uDuck; varying vec2 vW;
      #include <fog_pars_fragment>
      void main(){ float m = texture2D(uMask, vW/uSize).r; m = max(m, smoothstep(uFlood - 1.5, uFlood + 1.5, vW.y) * 0.75);
        float r = sin(vW.x*1.7+uTime*1.3)*sin(vW.y*1.3-uTime*1.1) + sin((vW.x+vW.y)*0.9+uTime*0.8)*0.6;
        float hi = smoothstep(0.85, 1.4, r);
        vec3 base = mix(vec3(0.16,0.32,0.36), uDeep, m);
        float a = mix(0.16, uDeepA, smoothstep(0.02, 0.4, m));
        vec3 col = base + hi*vec3(0.35,0.5,0.5)*(0.35+m*0.6);
        if (uDuck > 0.5) { a = mix(0.08, 0.3, smoothstep(0.02, 0.4, m)); float rim = smoothstep(0.03, 0.12, m) * (1. - smoothstep(0.12, 0.24, m)); col = mix(col, vec3(0.62,0.85,0.9), rim*0.7); a = max(a, rim*0.55); }
        gl_FragColor = vec4(col, a + hi*0.12);
        #include <fog_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(P.W, P.H), mat); mesh.rotation.x = -Math.PI / 2; mesh.position.set(P.W / 2, 0.12, P.H / 2); mesh.renderOrder = 2; mesh.name = 'water';
  mesh.userData.flood = 1e4; mesh.userData.mask = (x, z) => { if (z > mesh.userData.flood) return 0.6; const u = Math.floor(x / P.W * N), v = Math.floor(z / P.H * N); if (u < 0 || v < 0 || u >= N || v >= N) return 0; return data[(v * N + u) * 4] / 255; };
  return mesh;
}
