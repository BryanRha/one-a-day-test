// 시안용 (2026-11-10 · 대표 승인 전): 배경 · 지도 표현을 덕코프 방식으로 — 주소에 ?look=duck 일 때만 켜짐 (끄면 v0.9.0 그대로)
//   방향 문서: team/dev/tasks/261110-salvage-readability/DIRECTION.md · 클린룸(원리만 — 그림 · UI 배치 · 색 복제 X)
//   ① 시야: 원뿔 밖 = 흐리게(30~40%) + 색 빼기 · 벽에 막혀 그림자 쐐기 (검게 덮지 않음)
//   ② 걷는 판: 바닥 밝게 · 바닥 밖(지도 밖 물) 확실히 어둡게
//   ③ 벽: 낮게(실내 1.4m) · 윗면 밝은 띠(지도별 톤) · 주인공 앞을 가리는 것은 성기게(투명)
//   ④ 문: 벽 끊긴 자리 양끝 띠 + 바닥 문턱 — 색 규칙 하나(열림 초록 · 전원 주황 · 금고 금색 · 수문 하늘)
//   ⑤ 바닥 무늬 · 물웅덩이 약하게
//   ⑥ 카메라 약 68° · 세로 시야 42° (위 끝 47°) · 가로 폭 ?cam= (기본 14m)
//   ⑦ UI 얇게(css .duck) · ⑧ 급할 때 길잡이(바닥 점선 · 가장자리 표시 하나) · ⑨ 방 칸 미니맵(?mini=0 끔)
import * as THREE from 'three';
import { RS, COLS, ROWS } from './plan.js?v=0.99.19';
import { COLD, TOXIC } from './data/weather.js?v=0.99.19';

const Q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
export const DUCK = { on: Q.get('look') === 'duck', ang: +(Q.get('ang') || 68), vfov: +(Q.get('vfov') || 42), mini: Q.get('mini') !== '0', fogAdd: 0, dist: 0 };
/* 지도별 톤 (art.md 4장) — 벽 윗면 띠 · 빛 재질(정전에도 보임) · 실내 벽 높이 m */
export const TONE = {
  ware: { band: 0xeadfc4, wallH: 1.4 }, harbor: { band: 0xf4f1e8, wallH: 1.4, fenceH: 1.1, contH: 1.5 }, tunnel: { band: 0xffd25a, wallH: 1.4 },
  factory: { band: 0xf2c230, stripe: true, wallH: 1.4 }, lab: { band: 0x1e3a4a, wallH: 1.4 }, gate: { band: 0xf4f1e8, wallH: 1.3 },
};
/* 문턱 색 규칙 (모든 지도 같음) */
export const DOOR_C = { open: 0x6fe39a, power: 0xff8a3d, vault: 0xffc94a, flood: 0x5fc7d0, key: 0x9aa4aa };
export const doorColor = d => d.lock === 'vault' ? DOOR_C.vault : d.lock === 'power' ? DOOR_C.power : d.lock ? DOOR_C.key : d.gate === 'flood' ? DOOR_C.flood : DOOR_C.open;
/* 벽 높이 바꿈: [키, 높이, 축, 두께] → 낮춘 높이 */
export function duckWallH(map, wk, H, low) {
  const t = TONE[map] || {}; if (low) return Math.min(H, 0.6);
  if (map === 'harbor') return wk === 'h_fence' ? t.fenceH : /cont/.test(wk) ? t.contH : t.wallH;
  return t.wallH ? Math.min(H, t.wallH) : H;
}

/* ───── 재질: 바닥(무늬 약하게 · 밝게) · 서 있는 것(주인공 앞이면 성기게) ───── */
export const CUT = { uPl: { value: new THREE.Vector3(0, 0, -999) } };
const fc = new Map(), sc = new Map();
export function floorMat(m) {
  if (fc.has(m)) return fc.get(m); const c = m.clone();
  c.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `#ifdef USE_MAP
      vec4 sampledDiffuseColor = texture2D( map, vMapUv ); vec4 avgC = texture2D( map, vMapUv, 3.5 );
      sampledDiffuseColor.rgb = mix( avgC.rgb, sampledDiffuseColor.rgb, 0.42 ) * 1.24; diffuseColor *= sampledDiffuseColor;
    #endif`); };
  c.customProgramCacheKey = () => 'duckfloor'; fc.set(m, c); return c;
}
export function standMat(m) {
  if (sc.has(m)) return sc.get(m); if (m.isShaderMaterial) return m; const c = m.clone(); if (m.transparent && m.polygonOffset) { c.opacity = 0.5; sc.set(m, c); return c; } /* 바닥 얼룩(데칼) 약하게 */
  c.onBeforeCompile = s => {
    s.uniforms.uPl = CUT.uPl;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vDW;').replace('#include <project_vertex>', '#include <project_vertex>\nvDW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vDW; uniform vec3 uPl;').replace('void main() {', `void main() {
      { float dz = vDW.z - uPl.z; float dx = abs(vDW.x - uPl.x);
        float k = step(0.45, vDW.y) * smoothstep(0.2, 0.9, dz) * (1.0 - smoothstep(3.6, 5.0, dz)) * (1.0 - smoothstep(1.4, 2.4, dx));
        vec2 g = mod(floor(gl_FragCoord.xy), 2.0); if (k > 0.5 && (g.x + g.y) != 1.0) discard; if (k > 0.85 && g.x == 0.0) discard; }`);
  };
  c.customProgramCacheKey = () => 'duckcut'; sc.set(m, c); return c;
}
/* 벽 윗면 띠 · 문 띠 재질 */
const BM = {};
export function bandMat(map) {
  if (BM[map]) return BM[map]; const t = TONE[map] || TONE.ware;
  if (t.stripe) { const c = document.createElement('canvas'); c.width = 64; c.height = 16; const x = c.getContext('2d'); x.fillStyle = '#f2c230'; x.fillRect(0, 0, 64, 16); x.fillStyle = '#1d1a14'; for (let i = -16; i < 64; i += 16) { x.beginPath(); x.moveTo(i, 16); x.lineTo(i + 8, 0); x.lineTo(i + 14, 0); x.lineTo(i + 6, 16); x.fill(); }
    const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(5, 1); tx.colorSpace = THREE.SRGBColorSpace; return BM[map] = new THREE.MeshBasicMaterial({ map: tx }); }
  return BM[map] = new THREE.MeshBasicMaterial({ color: t.band });
}
const DM = {};
export function doorMat(col, a = 1) { const k = col + '/' + a; return DM[k] ||= new THREE.MeshBasicMaterial({ color: col, transparent: a < 1, opacity: a, depthWrite: a >= 1 }); }
/* map.js build 에서: 벽 칸 하나 위에 띠 (statics 에 넣어 합침) */
export function addBand(statics, map, x, z, ry, H, th, zone) {
  const g = new THREE.BoxGeometry(4.06, 0.07, th + 0.1); const m = new THREE.Mesh(g, bandMat(map)); m.position.set(x, H + 0.035, z); m.rotation.y = ry; m.userData.zone = zone; m.userData.band = 1; statics.add(m);
}
/* 문: 벽 끊긴 자리 양끝 띠 기둥(벽 높이 + 조금) · 바닥 문턱 띠 */
export function addDoor(statics, d, H, th, zone) {
  const col = doorColor(d); const along = d.axis === 'x';
  for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(along ? 0.5 : th + 0.14, 0.09, along ? th + 0.14 : 0.5); const m = new THREE.Mesh(g, doorMat(col)); m.position.set(d.x + (along ? s * 2.0 : 0), H + 0.06, d.z + (along ? 0 : s * 2.0)); m.userData.zone = zone; m.userData.band = 1; statics.add(m);
    const p = new THREE.Mesh(new THREE.BoxGeometry(along ? 0.14 : th + 0.12, H, along ? th + 0.12 : 0.14), doorMat(col)); p.position.set(d.x + (along ? s * 1.97 : 0), H / 2, d.z + (along ? 0 : s * 1.97)); p.userData.zone = zone; p.userData.band = 1; statics.add(p); }
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(along ? 3.7 : 0.42, along ? 0.42 : 3.7).rotateX(-Math.PI / 2), doorMat(col, d.lock || d.gate ? 0.85 : 0.55)); strip.position.set(d.x, 0.085, d.z); strip.userData.zone = zone; strip.userData.band = 1; strip.renderOrder = 1; statics.add(strip);
}

/* ───── 시야: 벽에 막히는 다각형 (월드) → 화면 ───── */
function rayWalls(ox, oz, dx, dz, maxL, walls) {
  let best = maxL;
  for (const b of walls) {
    let t0 = 0, t1 = best;
    if (Math.abs(dx) < 1e-6) { if (ox < b.x0 || ox > b.x1) continue; } else { let a = (b.x0 - ox) / dx, c = (b.x1 - ox) / dx; if (a > c) [a, c] = [c, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) continue; }
    if (Math.abs(dz) < 1e-6) { if (oz < b.z0 || oz > b.z1) continue; } else { let a = (b.z0 - oz) / dz, c = (b.z1 - oz) / dz; if (a > c) [a, c] = [c, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) continue; }
    if (t0 < best) best = t0;
  }
  return best;
}
export function wallLos(R, a, b) { const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz); if (L < 0.01) return true; const w = R.boxes.filter(x => x.wall && !x.off); return rayWalls(a.x, a.z, dx / L, dz / L, L, w) >= L - 0.05; }
const NR = 180; const PX = new Float32Array(NR * 2); const tv = new THREE.Vector3();
export const VEIL_STATS = { ms: 0, n: 0 };
export function duckVeil(ui, R, cam) {
  const c = ui.veil, x = ui.vx, c2 = ui.veil2, x2 = ui.vx2; const W = c.width, H = c.height; x.clearRect(0, 0, W, H); x2.clearRect(0, 0, W, H);
  if (!R || !R.alive) return;
  const t0 = performance.now();
  const VP = R.veilParams(); const vis = VP.vis, pl = R.pl, ox = pl.pos.x, oz = pl.pos.z;
  const half = 0.62 * Math.min(1.25, vis), Lc = 15 * vis, r0 = 3.2;
  const walls = []; for (const b of R.boxes) if (b.wall && !b.off && b.x1 > ox - Lc - 2 && b.x0 < ox + Lc + 2 && b.z1 > oz - Lc - 2 && b.z0 < oz + Lc + 2) walls.push(b);
  const ext = 0.5 + (R.P.wallH || 1.4) * 0.55; /* 벽 몸(윗면 띠)까지는 보이게 */
  for (let i = 0; i < NR; i++) {
    const a = pl.face - Math.PI + (i / NR) * Math.PI * 2; let dd = a - pl.face; while (dd > Math.PI) dd -= 6.283; while (dd < -Math.PI) dd += 6.283;
    const kk = Math.min(1, Math.max(0, (half + 0.08 - Math.abs(dd)) / 0.16)); const range = r0 + (Lc - r0) * kk;
    const dx = Math.sin(a), dz = Math.cos(a); const hit = rayWalls(ox, oz, dx, dz, range, walls); const L = hit < range - 0.01 ? Math.min(range, hit + ext) : range;
    tv.set(ox + dx * L, 0.2, oz + dz * L).project(cam); PX[i * 2] = (tv.x * 0.5 + 0.5) * W; PX[i * 2 + 1] = (-tv.y * 0.5 + 0.5) * H;
  }
  /* 밝기: 낮 32% · 밤 43% · 정전 54% 흐림 (형태는 보임) · 색은 원뿔 밖에서 85% 빠짐 */
  const dim = Math.min(0.6, 0.32 + Math.max(0, VP.dark - 0.62) * 0.9) * (R.flash > 0 ? 0.3 : 1);
  const poly = (ctx) => { ctx.beginPath(); ctx.moveTo(PX[0], PX[1]); for (let i = 1; i < NR; i++) ctx.lineTo(PX[i * 2], PX[i * 2 + 1]); ctx.closePath(); ctx.fill(); };
  const q0 = tv; const pr = (w, z) => { q0.set(w, 0.3, z).project(cam); return [(q0.x * 0.5 + 0.5) * W, (-q0.y * 0.5 + 0.5) * H]; };
  for (const [ctx, col] of [[x, `rgba(4,10,16,${dim})`], [x2, 'rgba(128,128,128,0.85)']]) {
    ctx.fillStyle = col; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'destination-out'; ctx.filter = 'blur(3px)'; ctx.fillStyle = '#000'; poly(ctx); ctx.filter = 'none';
    for (const P of VP.pools) { if (Math.abs(P.x - ox) > 24 || Math.abs(P.z - oz) > 32) continue; const [cx, cy] = pr(P.x, P.z); const [ex] = pr(P.x + P.r, P.z); const rr = Math.max(8, Math.abs(ex - cx));
      const gp = ctx.createRadialGradient(cx, cy, rr * 0.35, cx, cy, rr); gp.addColorStop(0, 'rgba(0,0,0,0.9)'); gp.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gp; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
  }
  /* 적: 원뿔 안 · 벽에 안 막힘 (또는 아주 가까움 · 빛 속 · 번쩍) */
  const sc = W / innerWidth;
  for (const e of R.enemies) {
    if (e.sleep) { e.root.visible = false; continue; } if (e.dead) { e.root.visible = true; continue; }
    const d = e.pos.distanceTo(pl.pos); const a = Math.atan2(e.pos.x - ox, e.pos.z - oz); let dd = a - pl.face; while (dd > Math.PI) dd -= 6.283; while (dd < -Math.PI) dd += 6.283;
    const seeLine = d < 3.2 || (Math.abs(dd) < half + 0.15 && d < Lc && rayWalls(ox, oz, Math.sin(a), Math.cos(a), d, walls) >= d - 0.3);
    const v = seeLine || e.flash > 0 || e.D.boss && d < 10 || R.flash > 0 || ((e.D.light || VP.pools.length) && R.inLight(e.pos, 0.3)); e.root.visible = v || e.state === 'chase' && d < 6;
    if (!e.root.visible && R.L.sense && d < 10) { const q = e.pos.clone(); q.y = 0.5; q.project(cam); x.fillStyle = 'rgba(255,90,69,.7)'; x.beginPath(); x.arc((q.x * 0.5 + 0.5) * W, (-q.y * 0.5 + 0.5) * H, 5 * sc + 2, 0, 7); x.fill(); }
  }
  const ms = performance.now() - t0; VEIL_STATS.ms = VEIL_STATS.ms * 0.95 + ms * 0.05; VEIL_STATS.n++;
}
export function initVeil2(ui) {
  if (ui.veil2) return; const c = document.createElement('canvas'); c.id = 'veil2'; ui.veil.parentNode.insertBefore(c, ui.veil); ui.veil2 = c; ui.vx2 = c.getContext('2d');
  c.width = ui.veil.width; c.height = ui.veil.height; document.getElementById('frame').classList.add('duck');
}

/* ───── 카메라 ───── */
export function duckFov(camera, camW) {
  const asp = camera.aspect; camera.fov = asp < 1 ? DUCK.vfov : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(DUCK.vfov / 2)) / asp * 0.62));
  const th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * asp; DUCK.dist = camW / (2 * th); DUCK.fogAdd = DUCK.dist - 26.5;
}
export function duckCam(camera, look, kick, kickK, shakeV) {
  const a = THREE.MathUtils.degToRad(DUCK.ang), d = DUCK.dist;
  camera.position.set(look.x, d * Math.sin(a), look.z + d * Math.cos(a)).addScaledVector(kick, kickK).add(shakeV); camera.lookAt(look.x + shakeV.x * 0.5, 0, look.z);
}

/* ───── 급할 때 길잡이: 방 그래프 길 (문 BFS) · 바닥 빛 점선 ───── */
function roomPath(R, from, to) {
  const A = R.roomOf(from), B = R.roomOf(to); if (!A || !B) return null; if (A === B) return { pts: [from, to], len: Math.hypot(to.x - from.x, to.z - from.z) };
  const prev = { [A.id]: null }; const q = [A.id];
  while (q.length) { const k = q.shift(); if (k === B.id) break; for (const d of R.P.doors) { if (!R.doorOpen(d)) continue; const o = d.a === k ? d.b : d.b === k ? d.a : null; if (o != null && !(o in prev)) { prev[o] = { k, d }; q.push(o); } } }
  if (!(B.id in prev)) return null; const doors = []; let k = B.id; while (prev[k]) { doors.unshift(prev[k].d); k = prev[k].k; }
  const pts = [{ x: from.x, z: from.z }]; for (const d of doors) pts.push({ x: d.x, z: d.z }); pts.push({ x: to.x, z: to.z });
  let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); return { pts, len };
}
export const CRISIS_C = { o2: 0x7fd8ff, cold: 0xffa24a, toxic: 0xb4ff5a, exit: 0x7dffb2 };
const CRISIS_T = { o2: ['🫧', '공기 방울'], cold: ['🔥', '온열 배관'], toxic: ['🚿', '소독 샤워'], exit: ['🚪', ''] };
/* 지금 급한 것: 산소 < 60% (전 45%) · 체온 < 50 · 독 ≥ 경고 · 물 차기 1분 전 */
export function crisisOf(R) {
  const W = R.WX; const p = R.pl.pos;
  const best = (list, kind) => { let b = null; for (const s of list) { const r = roomPath(R, p, s); if (r && (!b || r.len < b.len)) b = { ...r, kind, at: s }; } return b; };
  if (R.o2 != null && R.o2 < R.o2Max * 0.6 && R.airs.length && !R.pl.air) return best(R.airs, 'o2');
  if (W?.wx === 'cold' && W.temp < 50 && !R.pl.warm && W.plan.heat.length) return best(W.plan.heat, 'cold');
  if (W?.wx === 'toxic' && W.poison >= TOXIC.warn && W.plan.showers.length) return best(W.plan.showers, 'toxic');
  if (R.time <= 60) { const ex = R.exits.filter(x => x.open).map(x => ({ x: x.pos.x, z: x.pos.z, name: x.name })); const b = best(ex, 'exit'); if (b) b.name = b.at.name; return b; }
  return null;
}
const ND = 140;
export class Guide {
  constructor(R) {
    this.R = R; this.t = 0; this.cur = null; this.flow = 0;
    const g = new THREE.CircleGeometry(0.15, 10).rotateX(-Math.PI / 2); this.m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
    this.im = new THREE.InstancedMesh(g, this.m, ND); this.im.count = 0; this.im.frustumCulled = false; this.im.renderOrder = 4; this.im.userData.own = true; R.root.add(this.im); R.ownMats.push(this.m);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 28).rotateX(-Math.PI / 2), this.m); this.ring.visible = false; this.ring.userData.own = true; this.ring.renderOrder = 4; R.root.add(this.ring);
    this.mx = new THREE.Matrix4();
  }
  tick(dt) {
    const R = this.R; this.t -= dt; this.flow = (this.flow + dt * 1.6) % 0.7;
    if (this.t <= 0) { this.t = 0.3; this.cur = crisisOf(R); }
    const c = this.cur; if (!c) { this.im.count = 0; this.ring.visible = false; return; }
    this.m.color.setHex(CRISIS_C[c.kind]); this.m.opacity = 0.65 + 0.3 * Math.sin(R.t * 5);
    const pts = c.pts.slice(); pts[0] = { x: R.pl.pos.x, z: R.pl.pos.z }; let n = 0; let carry = 0.7 - this.flow;
    for (let i = 1; i < pts.length && n < ND; i++) { const a = pts[i - 1], b = pts[i]; const L = Math.hypot(b.x - a.x, b.z - a.z); let s = carry; while (s < L && n < ND) { const k = s / L; if (n > 0 || s > 0.9) { this.mx.makeTranslation(a.x + (b.x - a.x) * k, 0.16, a.z + (b.z - a.z) * k); this.im.setMatrixAt(n++, this.mx); } s += 0.7; } carry = s - L; }
    this.im.count = n; this.im.instanceMatrix.needsUpdate = true; const e = pts[pts.length - 1]; this.ring.visible = true; this.ring.position.set(e.x, 0.18, e.z); this.ring.scale.setScalar(1 + 0.12 * Math.sin(R.t * 4));
  }
}
/* 가장자리 표시: 급할 때 = 해결 지점 하나(크게) · 평소 = 2개까지 (내 가방 > 열린 출구 > 그 밖) */
export function pickTargets(R, targets, guide) {
  const c = guide?.cur;
  if (c) { const [ic, nm] = CRISIS_T[c.kind]; return [{ raw: c.at, t: `${ic} ${c.kind === 'exit' ? (c.name || '출구') : nm}`, c: 'crisis k-' + c.kind, dist: Math.round(c.len) }]; }
  const rank = tg => tg.c === 'co' && tg.t === '내 가방' ? 0 : tg.c === 'ex' ? 1 : tg.c.startsWith('gen hot') ? 2 : tg.c === 'pet' ? 3 : tg.c === 'gen' ? 4 : 5;
  const p = R.pl.pos; const d = tg => { const s = tg.raw || tg.p; return Math.hypot(s.x - p.x, s.z - p.z); };
  return targets.slice().sort((a, b) => rank(a) - rank(b) || d(a) - d(b)).slice(0, 2);
}

/* ───── 방 칸 미니맵 (왼쪽 위 · 가 본 방만 밝게) ───── */
export class Mini {
  constructor(R) {
    this.R = R; this.seen = new Set(); this.t = 0; const host = document.querySelector('.raidui'); const c = this.c = document.createElement('canvas'); c.className = 'dmini';
    const cell = 14, gap = 3; this.cell = cell; this.gap = gap; const w = COLS * cell + (COLS + 1) * gap, h = ROWS * cell + (ROWS + 1) * gap; c.width = w * 2; c.height = h * 2; c.style.width = w + 'px'; c.style.height = h + 'px'; host?.appendChild(c); this.x = c.getContext('2d'); this.x.scale(2, 2); this.w = w; this.h = h;
  }
  tick(dt, guide) {
    const R = this.R; const rm = R.roomOf(R.pl.pos); if (rm) this.seen.add(rm.id); this.t -= dt; if (this.t > 0) return; this.t = 0.25;
    const x = this.x, { cell, gap } = this; x.clearRect(0, 0, this.w, this.h); x.fillStyle = 'rgba(4,10,16,.55)'; x.fillRect(0, 0, this.w, this.h);
    const at = (wx, wz) => [gap + (wx / RS) * (cell + gap), gap + (wz / RS) * (cell + gap)];
    for (const r of R.P.rooms) { const [px, py] = [gap + r.c * (cell + gap), gap + r.r * (cell + gap)]; const s = this.seen.has(r.id); x.fillStyle = s ? 'rgba(220,232,236,.55)' : 'rgba(120,140,150,.18)'; x.fillRect(px, py, cell, cell); }
    for (const d of R.P.doors) { if (!this.seen.has(d.a) && !this.seen.has(d.b)) continue; const [px, py] = at(d.x, d.z); x.fillStyle = '#' + doorColor(d).toString(16).padStart(6, '0'); if (d.axis === 'x') x.fillRect(px - 2.5, py - gap - 0.5, 5, gap + 1); else x.fillRect(px - gap - 0.5, py - 2.5, gap + 1, 5); }
    for (const e of R.exits) if (e.open) { const [px, py] = at(e.pos.x, e.pos.z); x.fillStyle = '#7dffb2'; x.beginPath(); x.arc(px, py, 2.6, 0, 7); x.fill(); }
    const c = guide?.cur; if (c) { const [px, py] = at(c.at.x, c.at.z); x.strokeStyle = '#' + CRISIS_C[c.kind].toString(16).padStart(6, '0'); x.lineWidth = 1.6; x.beginPath(); x.arc(px, py, 3.6, 0, 7); x.stroke(); }
    const [px, py] = at(R.pl.pos.x, R.pl.pos.z); x.fillStyle = '#ffd166'; x.beginPath(); x.arc(px, py, 2.4, 0, 7); x.fill();
  }
}
/* 판마다: 길잡이 · 미니맵 · 앞 가림 위치 */
export function duckRaidTick(R, dt) {
  if (!DUCK.on || !R?.alive) return;
  if (!R.duck) { R.duck = { guide: new Guide(R), mini: DUCK.mini ? new Mini(R) : null }; }
  CUT.uPl.value.set(R.pl.pos.x, 0, R.pl.pos.z);
  R.duck.guide.tick(dt); R.duck.mini?.tick(dt, R.duck.guide);
}

/* ───── UI 면적 줄이기 (시안용 css · #frame.duck 안에서만) ─────
 *  아래 조작부: 반투명 · 얇게(쏘기 104 → 80 · 구르기 66 → 52 · 가방 54 → 44 · 조이스틱 120 → 96, 30% 투명) — 판을 가리는 높이 33% → 약 22%
 *  위: 한 줄(시간 · 체력 · 조개) 높이 줄임 · 알림 띠는 짧고 작게 · 산소 · 체온 막대는 체력 밑 왼쪽(알림 띠와 안 겹침 — QA issue_cold_templow) */
const CSS = `
#veil2 { position: absolute; inset: 0; width: 100%; height: 100%; display: block; pointer-events: none; mix-blend-mode: saturation; }
#frame.duck .raidui .top { top: calc(env(safe-area-inset-top) + 6px); gap: 8px; }
#frame.duck .timer { padding: 3px 10px; font-size: 15px; background: rgba(0,0,0,.35); }
#frame.duck .zone { font-size: 11px; }
#frame.duck .b { background: rgba(14,30,40,.3); border-color: rgba(255,255,255,.16); backdrop-filter: none; }
#frame.duck .b.fire { right: 16px; bottom: calc(env(safe-area-inset-bottom) + 22px); width: 80px; height: 80px; font-size: 15px; background: radial-gradient(circle at 50% 35%, rgba(255,170,80,.62), rgba(220,90,40,.5)); border-color: rgba(255,220,170,.55); box-shadow: none; }
#frame.duck .b.roll { right: 30px; bottom: calc(env(safe-area-inset-bottom) + 112px); width: 52px; height: 52px; font-size: 12px; }
#frame.duck .b.bag { right: 108px; bottom: calc(env(safe-area-inset-bottom) + 22px); width: 44px; height: 44px; font-size: 11px; }
#frame.duck .b.med { right: 20px; bottom: calc(env(safe-area-inset-bottom) + 172px); width: 44px; height: 44px; background: rgba(60,140,90,.55); }
#frame.duck .b.nade { right: 20px; bottom: calc(env(safe-area-inset-bottom) + 222px); width: 44px; height: 44px; } #frame.duck .b.smoke { right: 20px; bottom: calc(env(safe-area-inset-bottom) + 272px); width: 44px; height: 44px; }
#frame.duck .b.act { right: 96px; bottom: calc(env(safe-area-inset-bottom) + 112px); height: 40px; }
#frame.duck .ammo { right: 100px; bottom: calc(env(safe-area-inset-bottom) + 170px); } #frame.duck .ammo b { font-size: 17px; }
#frame.duck .stick { width: 96px; height: 96px; margin: -48px 0 0 -48px; opacity: .3; } #frame.duck .stick.on { opacity: .8; }
#frame.duck .stick:not(.on) { left: 72px !important; bottom: calc(env(safe-area-inset-bottom) + 26px); margin: 0 0 0 -48px; } #frame.duck .stick i { left: 26px; top: 26px; width: 44px; height: 44px; }
#frame.duck .stickhint { display: none; }
#frame.duck .wxfx { opacity: .45; } /* 날씨 화면 층이 바닥 밖 어둠 · 벽 띠를 씻지 않게 */
#frame.duck .evt { top: calc(env(safe-area-inset-top) + 62px); padding: 4px 10px; font-size: 12px; border-radius: 9px; max-width: 62%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: rgba(8,20,28,.72); }
#frame.duck .radio { top: calc(env(safe-area-inset-top) + 62px); padding: 4px 10px 4px 4px; max-width: 64%; background: rgba(8,20,28,.72); } #frame.duck .radio span { font-size: 12.5px; }
#frame.duck .o2 { left: auto; right: 12px; transform: none; width: 118px; top: calc(env(safe-area-inset-top) + 34px) !important; height: 13px; } #frame.duck .o2 span { font-size: 11px; line-height: 12px; }
#frame.duck .o2.wxg { top: calc(env(safe-area-inset-top) + 34px) !important; }
#frame.duck .o2 + .o2.wxg, #frame.duck #o2 ~ .wxg { top: calc(env(safe-area-inset-top) + 50px) !important; }
#frame.duck .dmini { position: absolute; left: 12px; top: calc(env(safe-area-inset-top) + 58px); border-radius: 6px; pointer-events: none; opacity: .9; }
#frame.duck .arr.crisis { width: 120px; margin: -26px 0 0 -60px; animation: pulse .5s infinite alternate; } #frame.duck .arr.crisis i { border-left-width: 20px; border-top-width: 13px; border-bottom-width: 13px; }
#frame.duck .arr.crisis span { font-size: 15px; font-weight: 900; max-width: 160px; }
#frame.duck .arr.k-o2 { color: #7fd8ff; } #frame.duck .arr.k-cold { color: #ffa24a; } #frame.duck .arr.k-toxic { color: #b4ff5a; } #frame.duck .arr.k-exit { color: #7dffb2; }
`;
if (DUCK.on && typeof document !== 'undefined') { const st = document.createElement('style'); st.id = 'duckcss'; st.textContent = CSS; document.head.appendChild(st); }
