// 맵 4 '가라앉은 공장' 장치 · 연출 · 보스 (M3-B) — map.js(그림) · raid.js(판) 가 부름. 계획(자리)은 plan_factory.js
//  · 컨베이어 벨트: 고무 띠 무늬가 흐름(한 재질 · 텍스처 밀기) · 위에 짐 상자가 실려 감 · 정전이면 멈춤 · 몸을 밈
//  · 컨베이어 반출구(새 출구): 전원이 들어오면 발판(초록 원)에 1.2초 서 있기 → 벨트가 벽 반출구까지 실어 감(2.6초 · 그동안 쏠 수 있음 · 구르면 내림)
//  · 크레인 바구니: 레버로 부르면(소리 큼) 8초 동안 내려옴 → 3초 버티면 올라감. 정전이면 못 부름
//  · 증기 배관: 바닥 하얀 원이 차오르는 예고(0.95초) → 2.2초 뿜음(피해 · 증기 속은 서로 안 보임)
//  · 쇳물 도랑: 문 없는 벽 쪽을 따라 흐르는 쇳물(셰이더 하나) · 들어가면 피해(구르면 안 데임)
//  · 보스 쇳물 감독관: 쇳물 붓기(줄 경고) · 내려찍기(원 경고 → 가슴 용광로 2초 약점 ×2) · 쇳물 비(체력 60% 아래 · 떨어질 자리 원 5개)
import * as THREE from 'three';
import { BOSS } from './data.js?v=0.99.22';
import { STEAM, MOLTEN, BELT, CRANE } from './data/map_factory.js?v=0.99.22';
import { sfx } from './audio.js?v=0.99.22';
import { hazard } from './a11y.js?v=0.99.22'; /* M6-C 색약 보조: 위험 예고 빗금 */

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tv = V();
const M = {}; const mat = (k, f) => M[k] ||= f();
/* ───── 텍스처 (코드로 그림 · 한 번) ───── */
let BELT_T = null;
function beltTex() {
  if (BELT_T) return BELT_T; const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#2a2c2f'; x.fillRect(0, 0, 128, 64);
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#34373b' : '#232528'; x.fillRect(i * 16, 6, 9, 52); x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(i * 16, 6, 2, 52); }
  x.fillStyle = '#d8a83a'; x.fillRect(0, 0, 128, 5); x.fillRect(0, 59, 128, 5); x.fillStyle = '#1b1c1e'; for (let i = 0; i < 8; i++) { x.fillRect(i * 16 + 8, 0, 8, 5); x.fillRect(i * 16, 59, 8, 5); }
  BELT_T = new THREE.CanvasTexture(c); BELT_T.wrapS = BELT_T.wrapT = THREE.RepeatWrapping; BELT_T.colorSpace = THREE.SRGBColorSpace; BELT_T.anisotropy = 4; return BELT_T;
}
const moltenMat = () => mat('molten', () => new THREE.ShaderMaterial({ fog: true, transparent: false,
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uHeat: { value: 1 } }]),
  vertexShader: ['varying vec2 vW;', '#include <fog_pars_vertex>', 'void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;', '#include <fog_vertex>', '}'].join('\n'),
  fragmentShader: `uniform float uTime; uniform float uHeat; varying vec2 vW;
    #include <fog_pars_fragment>
    float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h1(i), h1(i + vec2(1., 0.)), f.x), mix(h1(i + vec2(0., 1.)), h1(i + vec2(1., 1.)), f.x), f.y); }
    void main(){ vec2 p = vW * 1.3; float t = uTime * 0.35;
      float a = n2(p + vec2(t, t * 0.6)) * 0.6 + n2(p * 2.3 - vec2(t * 1.4, t)) * 0.4;
      float crust = smoothstep(0.55, 0.75, n2(p * 0.9 + vec2(-t * 0.5, t * 0.3)));
      vec3 hot = mix(vec3(1.0, 0.42, 0.08), vec3(1.0, 0.86, 0.45), smoothstep(0.45, 0.85, a));
      vec3 col = mix(hot * (0.8 + 0.4 * uHeat), vec3(0.22, 0.09, 0.05), crust * (1.1 - uHeat * 0.4));
      gl_FragColor = vec4(col, 1.);
      #include <fog_fragment>
    }` }));

/* ───── 그림 (map.js buildExtras 안) ───── */
export function buildFactory(P, statics, group, put, addBox, out, add, own) {
  const steel = mat('steel', () => new THREE.MeshLambertMaterial({ color: 0x6d7378, flatShading: true })), dark = mat('dark', () => new THREE.MeshLambertMaterial({ color: 0x2c2e31, flatShading: true }));
  const yel = mat('yel', () => new THREE.MeshLambertMaterial({ color: 0xd8a83a, flatShading: true })), rim = mat('rim', () => new THREE.MeshLambertMaterial({ color: 0x3e3631, flatShading: true }));
  const fx = out.fx = { belts: [], cargo: null, vents: [], ventIM: null, warnIM: null, molten: null, hatches: [] };
  /* 컨베이어: 띠(한 덩어리 · 텍스처가 흐름) + 양옆 난간 · 끝 롤러(정적) */
  const bp = [], bu = [], bi = [];
  for (const b of P.belts) {
    const along = b.dx !== 0, L = along ? b.x1 - b.x0 : b.z1 - b.z0, W = along ? b.z1 - b.z0 : b.x1 - b.x0, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2; const sgn = (b.dx || b.dz) > 0 ? 1 : -1;
    const n0 = bp.length / 3; const U = L / 1.6;
    for (const [la, lw, u, v] of [[-L / 2, -W / 2, 0, 0], [L / 2, -W / 2, U, 0], [L / 2, W / 2, U, 1], [-L / 2, W / 2, 0, 1]]) { const x = along ? cx + la : cx + lw, z = along ? cz + lw : cz + la; bp.push(x, 0.3, z); bu.push(sgn > 0 ? -u : u, v); }
    bi.push(n0, n0 + 2, n0 + 1, n0, n0 + 3, n0 + 2);
    for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(along ? L + 0.4 : 0.22, 0.42, along ? 0.22 : L + 0.4), s > 0 ? yel : steel); r.position.set(along ? cx : cx + s * (W / 2 + 0.11), 0.21, along ? cz + s * (W / 2 + 0.11) : cz); add(r, false); }
    for (const e of [-1, 1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, W + 0.1, 10), dark); r.rotation[along ? 'x' : 'z'] = Math.PI / 2; r.position.set(along ? cx + e * L / 2 : cx, 0.18, along ? cz : cz + e * L / 2); add(r, false); }
    const legM = steel; for (let k = 0; k <= Math.floor(L / 3); k++) { const la = -L / 2 + 0.3 + k * (L - 0.6) / Math.max(1, Math.floor(L / 3)); for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), legM); l.position.set(along ? cx + la : cx + s * W / 2, 0.15, along ? cz + s * W / 2 : cz + la); add(l, false); } }
    fx.belts.push({ ...b, L, along, sgn, cx, cz });
    if (b.exit) { /* 반출구: 옆벽에 검은 구멍 + 고무 띠 커튼 + 노랑/검정 틀 + 불(전원 = 초록) */
      const h = b.hatch; const g = new THREE.Group(); g.position.set(h.x, 0, h.z); g.rotation.y = b.dx < 0 ? Math.PI / 2 : -Math.PI / 2;
      const hole = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.9, 0.12), mat('hole', () => new THREE.MeshBasicMaterial({ color: 0x050505 }))); hole.position.set(0, 1.15, -0.02); g.add(hole);
      for (let i = 0; i < 9; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.7, 0.04), dark); s.position.set(-1.12 + i * 0.28, 1.15, 0.08); s.rotation.x = (i % 2 ? 0.04 : -0.03); g.add(s); }
      for (const [w, h, x, y] of [[0.2, 2.3, -1.45, 1.15], [0.2, 2.3, 1.45, 1.15], [3.1, 0.2, 0, 2.3]]) { const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.18), yel); t.position.set(x, y, 0.06); g.add(t); for (let k = 0; k < 4; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(w > 1 ? 0.3 : 0.22, w > 1 ? 0.22 : 0.3, 0.2), dark); st.position.set(w > 1 ? -1.1 + k * 0.75 : x, w > 1 ? y : 0.3 + k * 0.6, 0.07); g.add(st); } }
      const lampM = own(new THREE.MeshBasicMaterial({ color: 0xff4a30 })); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), lampM); lamp.position.set(0, 2.55, 0.1); g.add(lamp);
      g.traverse(o => { if (o.isMesh) o.userData.own = true; }); group.add(g); fx.hatches.push({ g, lampM, b }); }
  }
  if (bi.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(bu, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(bp.length / 3).fill(0).flatMap(() => [0, 1, 0]), 3)); g.setIndex(bi);
    const bm = own(new THREE.MeshLambertMaterial({ map: beltTex() })); const m = new THREE.Mesh(g, bm); m.receiveShadow = true; m.userData.own = true; m.name = 'belt'; group.add(m); fx.beltMesh = m; out.geos.push(g); }
  /* 벨트 위 짐 상자 (출구 벨트 빼고 · 벨트마다 3) */
  const cb = P.belts.filter(b => !b.exit); if (cb.length) { const cg = new THREE.BoxGeometry(0.85, 0.6, 0.85); out.geos.push(cg); const cm = own(new THREE.MeshLambertMaterial({ color: 0x9a6a3a, flatShading: true }));
    const im = new THREE.InstancedMesh(cg, cm, cb.length * 3); im.castShadow = true; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.userData.keepGeo = true; group.add(im); fx.cargo = im; fx.cargoK = cb.map(() => [0.1, 0.43, 0.76]); }
  /* 증기 배관: 바닥 창살(정적) + 예고 원 · 증기 기둥(인스턴스 둘) */
  for (const v of P.vents) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.08, 16), rim); ring.position.set(v.x, 0.16, v.z); add(ring, false);
    const grate = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.1, 16), dark); grate.position.set(v.x, 0.18, v.z); add(grate, false);
    for (let k = -1; k <= 1; k++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.08), steel); bar.position.set(v.x, 0.2, v.z + k * 0.3); add(bar, false); }
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.0, 8), steel); pipe.position.set(v.x + 0.9, 0.5, v.z - 0.2); add(pipe, false);
    const valve = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 6, 12), mat('red', () => new THREE.MeshLambertMaterial({ color: 0xb8402f, flatShading: true }))); valve.position.set(v.x + 0.9, 1.05, v.z - 0.2); valve.rotation.x = Math.PI / 2; add(valve, false);
    fx.vents.push({ x: v.x, z: v.z });
  }
  if (fx.vents.length) { const n = fx.vents.length;
    const wg = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), cg = new THREE.CylinderGeometry(0.7, 1.5, 4.5, 14, 1, true); out.geos.push(wg, cg);
    const wm = own(new THREE.MeshBasicMaterial({ color: 0xf2f6f8, transparent: true, opacity: 0.32, depthWrite: false })), sm = own(new THREE.MeshBasicMaterial({ color: 0xe8eef0, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }));
    fx.warnIM = new THREE.InstancedMesh(wg, wm, n); fx.ventIM = new THREE.InstancedMesh(cg, sm, n); const m0 = new THREE.Matrix4().makeScale(0.001, 0.001, 0.001);
    for (const im of [fx.warnIM, fx.ventIM]) { for (let i = 0; i < n; i++) im.setMatrixAt(i, m0); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.userData.keepGeo = true; im.renderOrder = 4; group.add(im); } }
  /* 쇳물 도랑: 돌 테두리(정적) + 흐르는 쇳물(셰이더 한 덩어리) + 열기 빛(가산) */
  if (P.molten.length) { const ps = [], ix = [], gs = [], gx = [];
    const quad = (A, I, x0, z0, x1, z1, y) => { const n = A.length / 3; A.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1); I.push(n, n + 2, n + 1, n, n + 3, n + 2); };
    for (const m of P.molten) { quad(ps, ix, m.x0, m.z0, m.x1, m.z1, 0.17); quad(gs, gx, m.x0 - 0.9, m.z0 - 0.9, m.x1 + 0.9, m.z1 + 0.9, 0.2);
      const w = m.x1 - m.x0, d = m.z1 - m.z0; for (const [x, z, sx, sz] of [[m.x0 - 0.12, (m.z0 + m.z1) / 2, 0.24, d + 0.48], [m.x1 + 0.12, (m.z0 + m.z1) / 2, 0.24, d + 0.48], [(m.x0 + m.x1) / 2, m.z0 - 0.12, w, 0.24], [(m.x0 + m.x1) / 2, m.z1 + 0.12, w, 0.24]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.3, sz), rim); b.position.set(x, 0.15, z); add(b, false); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3)); g.setIndex(ix); g.computeVertexNormals(); out.geos.push(g);
    const mm = moltenMat(); mm.uniforms.uHeat.value = P.cond === 'overheat' ? 1 : 0.55; const mesh = new THREE.Mesh(g, mm); mesh.userData.own = true; mesh.userData.keepGeo = true; mesh.name = 'molten'; mesh.renderOrder = 1; group.add(mesh); fx.molten = mesh;
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gs, 3)); gg.setIndex(gx); out.geos.push(gg);
    const glm = own(new THREE.MeshBasicMaterial({ color: 0xff6a20, transparent: true, opacity: P.cond === 'overheat' ? 0.22 : 0.12, depthWrite: false, blending: THREE.AdditiveBlending })); const gm = new THREE.Mesh(gg, glm); gm.userData.keepGeo = true; gm.renderOrder = 3; group.add(gm); fx.heat = gm; }
  /* 크레인 바구니 출구: 천장 레일(정적 · 방을 가로지름) — 바구니 자체는 raid 출구 장식(exitDeco) */
  for (const e of P.exits) if (e.crane) { const rm = P.rooms.find(r => r.id === e.room);
    for (const s of [-1, 1]) { const beam = new THREE.Mesh(new THREE.BoxGeometry(16, 0.35, 0.3), yel); beam.position.set(rm.x0 + 8, 7.2, e.z + s * 0.9); add(beam, false); }
    const trol = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 2.2), dark); trol.position.set(e.x, 6.9, e.z); add(trol, false); }
  return fx;
}

/* 출구 장식 (raid.start 의 exits 안에서) — 사다리 · 반출구 발판 · 크레인 바구니 */
export function exitDeco(R, e) {
  const g = new THREE.Group(); const own = m => { R.ownMats.push(m); return m; };
  const yel = own(new THREE.MeshLambertMaterial({ color: 0xe0b23a, flatShading: true })), dk = own(new THREE.MeshLambertMaterial({ color: 0x2c2e31, flatShading: true })), st = own(new THREE.MeshLambertMaterial({ color: 0x8a9096, flatShading: true }));
  const box = (w, h, d, m, x, y, z, rx = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.x = rx; o.castShadow = true; o.userData.own = true; g.add(o); return o; };
  if (e.kind === 'early') { /* 벽에 기댄 노란 사다리 + 손잡이 고리 */ for (const s of [-0.45, 0.45]) box(0.1, 4.2, 0.1, yel, s, 2.0, -2.6, -0.18); for (let i = 0; i < 9; i++) box(0.9, 0.07, 0.07, dk, 0, 0.35 + i * 0.44, -2.6 + 0.35 - i * 0.08, 0); }
  else if (e.kind === 'power') { /* 발판: 노랑/검정 줄무늬 판 + 손잡이 기둥 */ for (let i = 0; i < 6; i++) box(0.4, 0.06, 2.2, i % 2 ? dk : yel, -1.0 + i * 0.4, 0.33, 0); box(0.1, 1.1, 0.1, st, 1.3, 0.8, -1.0); box(0.6, 0.1, 0.1, yel, 1.1, 1.35, -1.0); }
  else if (e.crane) { /* 바구니: 쇠 틀 · 바닥 판 · 난간 · 줄 — 처음엔 위에 매달림(y 4.6) */
    const b = new THREE.Group(); g.add(b); const add = (o) => { b.add(o); return o; };
    const bb = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.userData.own = true; return add(o); };
    bb(2.6, 0.12, 2.6, dk, 0, 0.1, 0); for (const [x, z] of [[-1.25, -1.25], [1.25, -1.25], [-1.25, 1.25], [1.25, 1.25]]) bb(0.1, 1.2, 0.1, yel, x, 0.7, z);
    for (const s of [-1, 1]) { bb(2.6, 0.08, 0.08, yel, 0, 1.3, s * 1.25); bb(0.08, 0.08, 2.6, yel, s * 1.25, 1.3, 0); bb(2.6, 0.06, 0.06, st, 0, 0.7, s * 1.25); }
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 6), st); rope.userData.own = true; rope.position.y = 1.3; b.add(rope); b.userData.rope = rope; g.userData.basket = b; b.position.y = 4.6; }
  return g;
}

/* ───── 판 (raid.js) ───── */
export function factoryStart(R) {
  const X = R.X, P = R.P;
  R.F = { belts: X.fx.belts, vents: X.fx.vents.map(v => ({ ...v, st: 'idle', t: 1.5 + R.R() * (STEAM.every[1] - 1.5), tick: 0 })), molten: P.molten, ride: null, hurtT: 0, told: {}, cargo: X.fx.cargoK };
  for (const x of R.exits) { if (x.crane) { x.call = 'idle'; x.need = CRANE.hold; } if (x.belt) x.need = 1.2; }
}
const inR = (r, p, pad = 0) => p.x > r.x0 - pad && p.x < r.x1 + pad && p.z > r.z0 - pad && p.z < r.z1 + pad;
/* 주인공: 벨트에 밀림 · 쇳물 · 증기 · 반출구 타기 */
export function factoryPlayer(R, dt) {
  const F = R.F, pl = R.pl; if (!F || pl.dead) return;
  const run = !(R.dark > 0);
  if (F.ride) { const r = F.ride;
    if (pl.roll > 0) { F.ride = null; R.ui.toast('벨트에서 뛰어내렸어요', 'soft'); }
    else { r.s += BELT.ride * dt; const b = r.b; pl.pos.set(b.dx ? r.x0 + b.dx * r.s : pl.pos.x, 0, b.dz ? r.z0 + b.dz * r.s : (b.z0 + b.z1) / 2); pl.vel.set(0, 0, 0); pl.face = Math.atan2(b.dx, b.dz);
      if (R.R() < dt * 8) R.fx.burst(pl.pos.x, 0.4, pl.pos.z, 2, 0xd9c7a0, 1.5, 0.06, 0.3);
      if (r.s >= r.len) { F.ride = null; R.extract(r.x); } return; } }
  pl.onBelt = null; if (run) for (const b of F.belts) if (inR(b, pl.pos)) { pl.pos.x += b.dx * BELT.speed * dt; pl.pos.z += b.dz * BELT.speed * dt; pl.onBelt = b; }
  F.hurtT -= dt; if (F.hurtT > 0 || pl.roll > 0) return;
  for (const m of F.molten) if (inR(m, pl.pos, -0.15)) { F.hurtT = 0.5; R.hurtRaw(MOLTEN.dps * 0.5 * (R.cond === 'overheat' ? 1.3 : 1), '쇳물 도랑 — 뜨거워요! 구르면 안 데어요'); R.fx.burst(pl.pos.x, 0.3, pl.pos.z, 6, 0xffa040, 3, 0.07, 0.4, -4); return; }
  for (const v of F.vents) if (v.st === 'burst' && (pl.pos.x - v.x) ** 2 + (pl.pos.z - v.z) ** 2 < STEAM.r ** 2) { F.hurtT = 0.5; R.hurtRaw(STEAM.dps * 0.5, '증기! 하얀 원 밖으로'); return; }
}
/* 반출구 타기 시작 (출구 발판에 1.2초) */
export function startRide(R, x) {
  if (R.F.ride || R.pl.dead) return; const b = x.belt; const len = Math.abs(b.dx ? b.hatch.x - x.pos.x : b.hatch.z - x.pos.z) - 0.75;
  R.F.ride = { x, b, s: 0, len, x0: x.pos.x, z0: x.pos.z }; R.pl.pos.set(x.pos.x, 0, x.pos.z); sfx.power(); R.noise(R.pl.pos, 10);
  R.ui.event(`${x.name} — 벨트에 실려 나가요! (구르면 내림)`, 'good'); R.pl.anim.play('Idle', { fade: 0.1, force: true });
}
/* 크레인 바구니 부르기 (레버) — 정전이면 안 됨 */
export function callCrane(R, x) {
  if (R.dark > 0) { R.ui.toast('정전 — 크레인이 멈췄어요. 발전기를 켜요', 'soft'); return false; }
  x.call = 'wait'; x.arrive = CRANE.arrive; R.noise(x.pos, 20); sfx.gate(); R.shake = Math.max(R.shake, 0.2);
  R.ui.event(`${x.name}${'를'} 불렀어요 — ${CRANE.arrive}초 뒤 내려와요 (소리가 컸어요)`, 'warn'); return true;
}
/* 매 프레임: 증기 · 벨트 · 쇳물 · 반출구 불 · 바구니 · 보스 쇳물 비 */
const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), s3 = V(), p3 = V();
export function factoryTick(R, dt) {
  const F = R.F, X = R.X.fx; if (!F) return; const run = !(R.dark > 0);
  /* 증기 */
  for (let i = 0; i < F.vents.length; i++) { const v = F.vents[i]; v.t -= dt;
    if (v.st === 'idle' && v.t <= 0) { v.st = 'warn'; v.t = STEAM.warn; if (Math.hypot(v.x - R.pl.pos.x, v.z - R.pl.pos.z) < 16) sfx.steamWarn?.((v.x - R.pl.pos.x) / 12); }
    else if (v.st === 'warn' && v.t <= 0) { v.st = 'burst'; v.t = STEAM.burst; R.smokes.push({ x: v.x, z: v.z, r: STEAM.r + 0.4, t: STEAM.burst + 0.6, g: new THREE.Group(), mats: [] }); if (Math.hypot(v.x - R.pl.pos.x, v.z - R.pl.pos.z) < 18) sfx.steam?.((v.x - R.pl.pos.x) / 12); }
    else if (v.st === 'burst' && v.t <= 0) { v.st = 'idle'; v.t = STEAM.every[0] + R.R() * (STEAM.every[1] - STEAM.every[0]) * (R.cond === 'steam' ? 0.7 : 1.15); }
    const k = v.st === 'warn' ? 1 - v.t / STEAM.warn : 0;
    X.warnIM.setMatrixAt(i, m4.compose(p3.set(v.x, 0.24, v.z), q0, s3.setScalar(v.st === 'warn' ? STEAM.r * (0.25 + 0.75 * k) : 0.001)));
    const b = v.st === 'burst' ? Math.min(1, (STEAM.burst - v.t) * 5) * Math.min(1, v.t * 2.5) : 0;
    X.ventIM.setMatrixAt(i, m4.compose(p3.set(v.x, 2.25 * b + 0.1, v.z), q0, s3.set(b * 1.1 + 0.001, b + 0.001, b * 1.1 + 0.001)));
    if (v.st === 'burst' && R.R() < dt * 14 && Math.hypot(v.x - R.pl.pos.x, v.z - R.pl.pos.z) < 24) R.fx.burst(v.x + (R.R() - 0.5), 0.4, v.z + (R.R() - 0.5), 3, 0xeef4f6, 3.5, 0.22, 0.9, -6);
  }
  if (X.warnIM) { X.warnIM.instanceMatrix.needsUpdate = X.ventIM.instanceMatrix.needsUpdate = true; X.warnIM.material.opacity = 0.2 + 0.25 * Math.sin(R.t * 18) ** 2; X.ventIM.material.opacity = 0.3 + 0.08 * Math.sin(R.t * 9); }
  /* 벨트 무늬 · 짐 상자 */
  if (X.beltMesh && run) X.beltMesh.material.map.offset.x = (X.beltMesh.material.map.offset.x + dt * BELT.speed / 1.6) % 1;
  if (X.cargo) { let n = 0; const cb = X.belts.filter(b => !b.exit);
    cb.forEach((b, bi) => { const K = F.cargo[bi]; for (let j = 0; j < 3; j++) { if (run) K[j] = (K[j] + dt * BELT.speed / b.L) % 1; const s = K[j] < 0.06 ? K[j] / 0.06 : K[j] > 0.94 ? (1 - K[j]) / 0.06 : 1; const u = (b.sgn > 0 ? K[j] : 1 - K[j]) - 0.5;
      p3.set(b.along ? b.cx + u * b.L : b.cx, 0.62, b.along ? b.cz : b.cz + u * b.L); X.cargo.setMatrixAt(n++, m4.compose(p3, q0, s3.setScalar(Math.max(0.001, s)))); } });
    X.cargo.instanceMatrix.needsUpdate = true; }
  if (X.molten) { X.molten.material.uniforms.uTime.value += dt; if (X.heat) X.heat.material.opacity = (R.cond === 'overheat' ? 0.2 : 0.11) * (0.85 + 0.15 * Math.sin(R.t * 2.3)); }
  for (const h of X.hatches) h.lampM.color.setHex(R.power && run ? 0x7dffb2 : 0xff4a30);
  /* 크레인 바구니 내려옴 */
  for (const x of R.exits) if (x.crane && x.deco?.userData.basket) { const b = x.deco.userData.basket; const y = x.call === 'wait' ? 4.6 * Math.max(0, x.arrive / CRANE.arrive) : x.call === 'ready' ? 0 : 4.6; b.position.y += (y - b.position.y) * Math.min(1, dt * 6); const rope = b.userData.rope; const L = 6.9 - b.position.y - 1.3; rope.scale.y = Math.max(0.1, L); rope.position.y = 1.3 + L / 2; if (x.call === 'ready' && x.hold > 0) b.position.y = Math.min(0.6, x.hold / x.need * 0.6); }
  /* 보스 쇳물 비 예고 원 */
  const B = R.boss; if (B && B.rain && B.wind > 0) { const k = 1 - B.wind / B.windMax; for (const r of B.rain) { r.m.scale.setScalar(BOSS.smelter.rain.r * (0.3 + 0.7 * k)); r.m.material.opacity = 0.25 + 0.35 * Math.sin(k * 20) ** 2; } }
}
export const factoryLook = { bg: 0x17130f, hemi: [1.2, 0xffe2c4, 0x2e2620], sun: [1.1, 0xffe8d0] };

/* ───── 보스: 쇳물 감독관 ───── */
export function smelterWind(R, e, dist, rage) {
  const pl = R.pl, B = BOSS.smelter; const ang = Math.atan2(pl.pos.x - e.pos.x, pl.pos.z - e.pos.z);
  if (e.hp < e.maxHp * B.rain.below && e.pcd <= 0) { e.pat = 'rain'; e.windMax = e.wind = B.rain.wind; e.pcd = B.rain.cd;
    e.rain = []; for (let i = 0; i < B.rain.n; i++) { const a = i / (B.rain.n - 1) * Math.PI * 2 + R.R(); const r = i === 0 ? 0 : 2.4 + R.R() * 1.2; const x = pl.pos.x + Math.cos(a) * r, z = pl.pos.z + Math.sin(a) * r;
      const m = new THREE.Mesh(new THREE.CircleGeometry(1, 28), hazard(new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.3, depthWrite: false }))); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.23, z); m.scale.setScalar(0.3); R.root.add(m); e.rain.push({ x, z, m }); }
    e.anim.play('Taunt', { once: true, fade: 0.05, speed: 0.9, force: true }); sfx.roar(); }
  else if (dist < 4.2) { e.pat = 'slam'; e.windMax = e.wind = B.slam.wind / rage; e.lockFace = e.face; R.warnDisc(e, B.slam.r, 0xff4a30); e.anim.play('1H_Melee_Attack_Chop', { once: true, fade: 0.05, speed: 0.75 * rage, force: true }); }
  else { e.pat = 'pour'; e.windMax = e.wind = B.pour.wind / rage; e.lockFace = ang; e.face = ang; R.warnLine(e, B.pour.len, B.pour.w, 0xff8a2a); e.anim.play('Unarmed_Melee_Attack_Punch_A', { once: true, fade: 0.05, speed: 0.55, force: true }); }
  e.cd = e.D.cd / rage; sfx.warn();
}
export function smelterAttack(R, e, dist) {
  const pl = R.pl, B = BOSS.smelter;
  if (e.pat === 'slam') { sfx.slam(); R.shake = Math.max(R.shake, 0.7); R.fx.ring(e.pos.x, e.pos.z, B.slam.r, 0xff9a5a); R.fx.burst(e.pos.x, 0.3, e.pos.z, 34, 0xffb347, 8, 0.14, 0.8, 20); if (dist < B.slam.r) R.hurt(B.slam.dmg, e.pos);
    e.weakT = B.weak; e.stun = B.weak * 0.8; R.ui.weak('가슴 용광로가 열렸어요 — 약점!'); return; }
  if (e.pat === 'pour') { const dx = Math.sin(e.lockFace), dz = Math.cos(e.lockFace); (sfx.pour || sfx.slam)(); R.shake = Math.max(R.shake, 0.35);
    const px = pl.pos.x - e.pos.x, pz = pl.pos.z - e.pos.z, along = px * dx + pz * dz, side = Math.abs(px * dz - pz * dx);
    if (along > 0 && along < B.pour.len + 0.5 && side < B.pour.w / 2 + 0.3) R.hurt(B.pour.dmg, e.pos);
    for (let s = 1.6; s < B.pour.len; s += 1.7) { const x = e.pos.x + dx * s, z = e.pos.z + dz * s; tv.set(x, 0, z); R.collide(tv, 0.2); if (Math.hypot(tv.x - x, tv.z - z) > 0.3) break; R.addFire(x, z, 1.2, B.pour.pool, B.pour.poolDps); R.fx.burst(x, 0.4, z, 8, 0xffa040, 5, 0.1, 0.6, 14); }
    return; }
  if (e.pat === 'rain') { sfx.slam(); R.shake = Math.max(R.shake, 0.5);
    for (const r of e.rain || []) { R.root.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); R.fx.burst(r.x, 0.5, r.z, 18, 0xffa040, 7, 0.12, 0.7, 12); R.fx.ring(r.x, r.z, B.rain.r, 0xffb060); R.addFire(r.x, r.z, B.rain.r * 0.9, B.rain.pool, 10);
      if ((pl.pos.x - r.x) ** 2 + (pl.pos.z - r.z) ** 2 < B.rain.r ** 2) R.hurt(B.rain.dmg, tv.set(r.x, 0, r.z)); }
    e.rain = null; R.ui.toast('쇳물이 쏟아졌어요 — 불 웅덩이를 피해요', 'warn'); }
}
export function clearRain(R, e) { for (const r of e.rain || []) { R.root?.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); } e.rain = null; }
