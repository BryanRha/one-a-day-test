// 캐릭터 모듈 (2026-10-29 · 숲속 캠프) — 마루미 계열 사람 캐릭터 · 3D 툰 코드 모델 + 코드 동작
//   교체 가능하게 분리: 다른 몸(예: 3D 여우 glb)을 쓰려면 같은 모양의 클래스를 만들어 register(kind, factory) 로 등록
//   인터페이스: new X(look, sx, sy, seed) → .root(THREE.Group) · play(act) · walkTo(sx, sy, then) · face(sx, sy, k) · hold(obj) · update(dt, now) · act/t
//   동작: idle · walk · stir · taste · sit · eat · happy · wave · serve (+ 각 몸이 추가 가능)
import * as THREE from 'three';
export let SPRING = true;
const TAU = Math.PI * 2, lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
let toWorld = null;
let PERSP = () => 1, EL = 30 * Math.PI / 180;
export function setup(o) { toWorld = o.toWorld; SPRING = o.spring !== false; if (o.persp) PERSP = o.persp; if (o.el) EL = o.el; }
const grad = new THREE.DataTexture(new Uint8Array([214, 214, 214, 255, 255, 255, 255, 255]), 2, 1, THREE.RGBAFormat); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
const grad3 = new THREE.DataTexture(new Uint8Array([176, 176, 176, 255, 222, 222, 222, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat); grad3.minFilter = grad3.magFilter = THREE.NearestFilter; grad3.needsUpdate = true;   /* 봄판: 밝음 · 기본 · 그림자 3단 */
/* 배경 수채와 결을 맞춘 툰 (대표 지시 10-29 · 3D 유지): 부드러운 3단 음영 · 그늘은 따뜻한 보라 · 갈색(조명 쪽에서) · 아주 옅은 종이 결 노이즈 */
const grad3w = new THREE.DataTexture(new Uint8Array([168, 168, 168, 255, 214, 214, 214, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat); grad3w.minFilter = grad3w.magFilter = THREE.NearestFilter; grad3w.needsUpdate = true;
const paper = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
    vec2 pc = floor(gl_FragCoord.xy / 2.0); float n = fract(sin(dot(pc, vec2(12.9898, 78.233))) * 43758.5453); float n2 = fract(sin(dot(floor(gl_FragCoord.xy / 9.0), vec2(39.3468, 11.1352))) * 24634.6345);
    gl_FragColor.rgb *= 0.968 + 0.035 * n + 0.02 * n2; gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * vec3(1.02, 0.99, 0.96), 0.6);`); };
const MATS = {}; const toon = (c, map) => MATS[c + (map ? map.uuid : '')] ||= (() => { const m = new THREE.MeshToonMaterial({ color: map ? 0xffffff : c, map: map || null, gradientMap: SPRING ? grad3w : grad }); m.onBeforeCompile = paper; return m; })();
const outline = new THREE.MeshBasicMaterial({ color: 0x6A4630, side: THREE.BackSide });
let SHT = null; function shadowTex() { if (SHT) return SHT; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); SHT = new THREE.CanvasTexture(c); return SHT; }
export const sceneRef = { scene: null };
const OUT = {};   /* 봄판 외곽선: 그 색의 진한 같은 계열 (검정 X) */
function outlineFor(c) {
  if (!SPRING) return outline; if (OUT[c]) return OUT[c];
  const col = new THREE.Color(c), hsl = {}; col.getHSL(hsl); col.setHSL(hsl.h, Math.min(0.55, hsl.s * 0.5 + 0.12), Math.max(0.2, hsl.l * 0.4));
  const m = outline.clone(); m.color = col; m.onBeforeCompile = outline.onBeforeCompile; return OUT[c] = m;
}
/* 무늬 텍스처 (작은 줄무늬 · 체크 · 니트 결 · 꽃무늬) — 바탕색 위에 같은 계열로 */
const PAT = {};
function pattern(kind, a, b) {
  const k = kind + a + b; if (PAT[k]) return PAT[k];
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), A = '#' + new THREE.Color(a).getHexString(), Bc = '#' + new THREE.Color(b).getHexString();
  x.fillStyle = A; x.fillRect(0, 0, 128, 128); x.fillStyle = Bc; x.strokeStyle = Bc;
  if (kind === 'stripe') for (let y = 0; y < 128; y += 16) x.fillRect(0, y, 128, 6);
  else if (kind === 'check') { x.globalAlpha = 0.55; for (let i = 0; i < 128; i += 32) { x.fillRect(i, 0, 14, 128); x.fillRect(0, i, 128, 14); } }
  else if (kind === 'knit') { x.lineWidth = 4; for (let i = 0; i < 128; i += 16) { x.beginPath(); for (let y = 0; y <= 128; y += 16) { x.moveTo(i, y); x.lineTo(i + 8, y + 8); x.lineTo(i + 16, y); } x.stroke(); } }
  else if (kind === 'floral') { for (let i = 0; i < 14; i++) { const fx_ = (i * 37) % 128, fy = (i * 53) % 128; for (let p = 0; p < 5; p++) { x.beginPath(); x.arc(fx_ + 5 * Math.cos(p * 1.26), fy + 5 * Math.sin(p * 1.26), 3.5, 0, TAU); x.fill(); } } }
  else if (kind === 'fringe') { x.lineWidth = 3; for (let i = 0; i < 128; i += 10) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 10, 22); x.lineTo(i + 20, 0); x.stroke(); } for (let y = 30; y < 128; y += 14) for (let i = 0; i < 128; i += 14) { x.beginPath(); x.arc(i + (y % 28 ? 7 : 0), y, 3, 0, TAU); x.fill(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(kind === 'stripe' ? 1 : 2, kind === 'stripe' ? 2 : 2); t.colorSpace = THREE.SRGBColorSpace; return PAT[k] = t;
}
outline.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'float wob = 1.0 + 0.25 * sin(position.x * 0.31 + position.y * 0.23) * sin(position.z * 0.27);\n vec3 transformed = position + normal * 2.8 * wob;'); };
const G = {}; const geo = (k, f) => G[k] ||= f();
function part(parent, g, c, x = 0, y = 0, z = 0, line = true, map = null) {
  const m = new THREE.Mesh(g, toon(c, map)); m.position.set(x, y, z); parent.add(m);
  if (line) { const o = new THREE.Mesh(g, outlineFor(c)); m.add(o); o.renderOrder = -1; }
  return m;
}
const sph = r => geo('s' + r, () => new THREE.SphereGeometry(r, 22, 16));
const cap = (r, l) => geo('c' + r + ',' + l, () => new THREE.CapsuleGeometry(r, l, 6, 14));
const cyl = (a, b, h, s = 20) => geo(`y${a},${b},${h}`, () => new THREE.CylinderGeometry(a, b, h, s));

/* ── 얼굴 그림 ── */
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.lineCap = 'round'; x.lineJoin = 'round'; draw(x, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const FACE_T = {};
function faceTex(eye, mouth, lash) {   /* 말랑한 얼굴 (대표 피드백 10-29): 큰 눈 + 하이라이트 2개 · 둥근 볼터치 · 입 5종(미소 · 기쁨 · 집중 · 놀람 · 오물오물) */
  const k = eye + mouth + lash; if (FACE_T[k]) return FACE_T[k];
  return FACE_T[k] = canvasTex(256, 192, (x, w, h) => {
    const ey = h * 0.47, ex = w * 0.18, r = 20;
    const bl = x.createRadialGradient(0, 0, 2, 0, 0, 26); bl.addColorStop(0, 'rgba(255,128,120,0.62)'); bl.addColorStop(1, 'rgba(255,150,140,0)');
    for (const s of [-1, 1]) { x.save(); x.translate(w / 2 + s * w * 0.3, h * 0.66); x.scale(1.25, 0.8); x.fillStyle = bl; x.beginPath(); x.arc(0, 0, 26, 0, TAU); x.fill(); x.restore(); }
    x.strokeStyle = '#3A2418'; x.fillStyle = '#3A2418'; x.lineWidth = 7;
    for (const s of [-1, 1]) { const cx = w / 2 + s * ex;
      if (eye === 'open') { x.fillStyle = '#3A2418'; x.beginPath(); x.ellipse(cx, ey, r * 0.8, r, 0, 0, TAU); x.fill(); x.fillStyle = '#6A3A26'; x.beginPath(); x.ellipse(cx, ey + 6, r * 0.55, r * 0.5, 0, 0, TAU); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(cx - 5, ey - 8, 6.5, 0, TAU); x.fill(); x.beginPath(); x.arc(cx + 6, ey + 7, 3, 0, TAU); x.fill(); x.fillStyle = '#3A2418';
        if (lash) { x.lineWidth = 4; x.beginPath(); x.moveTo(cx + s * 12, ey - 13); x.lineTo(cx + s * 20, ey - 19); x.stroke(); x.lineWidth = 7; } }
      else if (eye === 'happy') { x.beginPath(); x.moveTo(cx - 15, ey + 6); x.quadraticCurveTo(cx, ey - 16, cx + 15, ey + 6); x.stroke(); }
      else { x.beginPath(); x.moveTo(cx - 14, ey + 1); x.quadraticCurveTo(cx, ey + 10, cx + 14, ey + 1); x.stroke(); } }
    const my = h * 0.7; x.lineWidth = 5; x.strokeStyle = '#6A3A28'; x.fillStyle = '#8A3A30';
    if (mouth === 'smile') { x.beginPath(); x.moveTo(w / 2 - 11, my); x.quadraticCurveTo(w / 2 - 5, my + 7, w / 2, my + 2); x.quadraticCurveTo(w / 2 + 5, my + 7, w / 2 + 11, my); x.stroke(); }   /* ω 꼴 */
    else if (mouth === 'open') { x.beginPath(); x.moveTo(w / 2 - 14, my - 2); x.quadraticCurveTo(w / 2, my + 22, w / 2 + 14, my - 2); x.closePath(); x.fill(); x.stroke(); x.fillStyle = '#F08A78'; x.beginPath(); x.ellipse(w / 2, my + 9, 7, 4, 0, 0, TAU); x.fill(); }
    else if (mouth === 'focus') { x.beginPath(); x.moveTo(w / 2 - 7, my + 3); x.lineTo(w / 2 + 7, my + 1); x.stroke(); }
    else if (mouth === 'wow') { x.beginPath(); x.ellipse(w / 2, my + 4, 6, 8, 0, 0, TAU); x.fill(); x.stroke(); }
    else if (mouth === 'chew') { x.beginPath(); x.ellipse(w / 2, my + 3, 9, 7, 0, 0, TAU); x.fill(); x.stroke(); }
  });
}

/* ── 사람 (마루미 person 을 다듬음: 큰 머리 · 짧은 팔다리 · 둥근 몸 · 머리카락 덩어리) ── */
const SKIN = 0xFFE0C4;
const T = (o, key, base) => o[key + 'Pat'] ? pattern(o[key + 'Pat'][0], base, o[key + 'Pat'][1]) : null;   /* 옷에 무늬가 있으면 텍스처 */
function makePerson(o) {
  const J = {}, root = new THREE.Group(), hips = new THREE.Group(); root.add(hips); hips.position.y = 34; J.hips = hips;
  const torso = new THREE.Group(); hips.add(torso); J.torso = torso;
  const body = part(torso, cap(26, 17), o.top, 0, 24, 0, true, T(o, 'top', o.top)); body.scale.set(1, 1, 0.92); J.body = body;   /* 몸통 짧고 둥글게 */
  if (o.apron) { const ap = part(torso, cap(26, 16), o.apron, 0, 22, 2.5, true, T(o, 'apron', o.apron)); ap.scale.set(0.97, 0.92, 0.88);
    const pk = part(torso, geo('pk', () => new THREE.BoxGeometry(18, 9, 3)), 0xFFF3E0, 0, 16, 26); pk.rotation.x = -0.15; }
  if (o.scarf) part(torso, geo('scarf', () => new THREE.TorusGeometry(17, 4.5, 8, 20)), o.scarf, 0, 54, 0).rotation.x = Math.PI / 2;
  const neck = new THREE.Group(); neck.position.y = 52; torso.add(neck); J.neck = neck;
  const head = new THREE.Group(); head.position.y = 36; head.scale.setScalar(1.1); neck.add(head); J.head = head;   /* 머리 1.1배 → 약 2.3등신 */
  part(head, sph(36), SKIN).scale.set(1.08, 0.95, 1.02); for (const s2 of [-1, 1]) part(head, sph(11), SKIN, s2 * 17, -14, 25, false).scale.set(1, 0.82, 0.7);   /* 말랑한 볼 (얼굴 안쪽 · 아래) */
  /* 머리카락: 뒤 반구 + 앞머리 덩어리 3 (움직일 때 늦게 흔들림) */
  const hairG = new THREE.Group(); head.add(hairG); J.hair = hairG;
  const back = part(hairG, geo('hb', () => new THREE.SphereGeometry(40.5, 22, 16, 0, TAU, 0, 1.8)), o.hair, 0, 4, -4); back.rotation.x = -0.35;   /* 볼륨 */
  [[-25, 19, 22, 13], [-12, 26, 28, 15], [3, 28, 30, 15], [17, 25, 28, 14], [28, 16, 21, 11]].forEach(([x, y, z, r]) => part(hairG, sph(r), o.hair, x, o.bucket ? y - 6 : y, o.bucket ? z - 2 : z).scale.set(1.1, 0.8, 0.75));   /* 앞머리 5 덩어리 */
  for (const s2 of [-1, 1]) part(hairG, cap(6.5, 9), o.hair, s2 * 35, 2, 8).rotation.z = s2 * 0.12;   /* 옆머리 */
  if (o.bun) { const b = part(hairG, sph(15), o.hair, 0, 34, -22); J.bun = b; }
  if (o.pony) { const p = new THREE.Group(); p.position.set(0, 12, -36); hairG.add(p); part(p, cap(10, 22), o.hair, 0, -16, -4); J.pony = p; }
  /* 얼굴 */
  const face = new THREE.Mesh(geo('face', () => new THREE.SphereGeometry(36.6, 32, 20, Math.PI / 2 - 0.95, 1.9, Math.PI / 2 - 0.62, 1.3)), new THREE.MeshBasicMaterial({ map: faceTex('open', 'smile', !!o.lash), transparent: true, depthWrite: false }));
  face.scale.set(1.04, 0.97, 1); head.add(face); J.face = face;
  /* 모자 */
  if (o.bucket) { const h = new THREE.Group(); h.position.y = 20; h.rotation.x = -0.12; head.add(h); J.hat = h; part(h, geo('bkt', () => new THREE.SphereGeometry(42, 22, 12, 0, TAU, 0, 1.5)), o.bucket, 0, -6, 0); part(h, cyl(52, 54, 3, 28), o.bucket, 0, -2, 0); part(h, cyl(36, 36, 4, 22), o.bucketBand || o.bucket, 0, 1.5, 0, false); }
  if (o.glasses) for (const s2 of [-1, 1]) { const gl = part(head, geo('glass', () => new THREE.TorusGeometry(8, 1.3, 6, 16)), o.glasses, s2 * 12.5, 2, 34.5, false); gl.rotation.y = s2 * 0.28; }
  if (o.chef) { const h = new THREE.Group(); h.position.set(0, 30, -2); h.rotation.set(-0.15, 0, 0.12); head.add(h); J.hat = h;
    if (o.ribbon) { part(h, sph(5), o.ribbon, -20, 6, 14).scale.set(1.2, 0.8, 0.5); part(h, sph(5), o.ribbon, -11, 6, 19).scale.set(1.2, 0.8, 0.5); part(h, sph(3), o.ribbon, -15.5, 6, 17); }
    part(h, cyl(25, 27, 14), 0xFFFFFF, 0, 4, 0); [[0, 22, 0, 18], [-14, 17, 0, 13], [14, 17, 0, 13], [0, 17, 12, 13], [0, 17, -12, 13]].forEach(([x, y, z, r]) => part(h, sph(r), 0xFFFFFF, x, y, z)); }
  if (o.beanie) { const h = new THREE.Group(); h.position.y = 14; head.add(h); J.hat = h; part(h, geo('bn', () => new THREE.SphereGeometry(39, 22, 14, 0, TAU, 0, 1.25)), o.beanie, 0, 0, 0); part(h, sph(9), 0xFFF6E8, 0, 40, 0); }
  if (o.bandana) { const h = new THREE.Group(); h.position.y = 12; head.add(h); J.hat = h; part(h, geo('bd', () => new THREE.SphereGeometry(39, 22, 12, 0, TAU, 0, 1.05)), o.bandana, 0, 0, 0).rotation.x = -0.25; }
  /* ── 의상 디테일 (봄판) ── */
  if (o.collar) { const cl = part(torso, geo('collar', () => new THREE.TorusGeometry(15, 4, 8, 20, Math.PI * 1.3)), o.collar, 0, 51, 3, true, T(o, 'collar', o.collar)); cl.rotation.set(Math.PI / 2 + 0.25, 0, Math.PI * 0.85); }
  if (o.buttons) for (let i = 0; i < 3; i++) for (const s2 of (o.double ? [-1, 1] : [0])) part(torso, sph(2.6), o.buttons, s2 * 8, 44 - i * 9, 22.5 - i * 0.6);
  if (o.pocket) { const pk = part(torso, geo('pkt', () => new THREE.BoxGeometry(16, 10, 2)), o.pocket, 0, 14, 27.5); pk.rotation.x = -0.2; }
  if (o.ties) { const t1 = part(torso, cap(1.8, 16), o.ties, 8, 26, -24); t1.rotation.z = 0.5; const t2 = part(torso, cap(1.8, 16), o.ties, -8, 26, -24); t2.rotation.z = -0.5; part(torso, sph(5), o.ties, 0, 31, -25).scale.set(1.4, 0.8, 0.6); J.ties = [t1, t2]; }
  if (o.shawl) { const sw = part(torso, geo('shawl', () => new THREE.ConeGeometry(36, 28, 22, 1, true)), o.shawl, 0, 46, 0, true, T(o, 'shawl', o.shawl)); sw.material.side = THREE.DoubleSide; J.shawl = sw; }
  if (o.straps) for (const s2 of [-1, 1]) { const st = part(torso, geo('strap', () => new THREE.BoxGeometry(5, 36, 3)), o.straps, s2 * 13, 34, 21); st.rotation.z = s2 * 0.08; }
  if (o.teddy) { const td = new THREE.Group(); td.position.set(10, 18, 25); torso.add(td); part(td, sph(5), o.teddy); part(td, sph(3.6), o.teddy, 0, 6, 0); part(td, sph(1.6), o.teddy, -2.6, 9, 0); part(td, sph(1.6), o.teddy, 2.6, 9, 0); }
  if (o.skirt) { const sk = part(hips, geo('skirt', () => new THREE.CylinderGeometry(20, 30, 26, 22, 1, true)), o.skirt, 0, -6, 0, true, T(o, 'skirt', o.skirt)); sk.material.side = THREE.DoubleSide; }
  if (o.pack) { const pk = part(torso, geo('pack', () => new THREE.BoxGeometry(34, 34, 16)), o.pack, 0, 30, -26); pk.geometry.computeVertexNormals();
    if (SPRING) { part(torso, geo('flap', () => new THREE.BoxGeometry(35, 12, 17)), o.packFlap || o.pack, 0, 44, -26); for (const s2 of [-1, 1]) part(torso, geo('buckle', () => new THREE.BoxGeometry(5, 5, 2)), 0xE8D2A0, s2 * 8, 38, -35); part(torso, geo('ppk', () => new THREE.BoxGeometry(20, 12, 5)), o.packFlap || o.pack, 0, 20, -36); } }
  /* 팔 (어깨 → 팔꿈치 → 손) */
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 25, 44, 0); torso.add(sh);
    part(sh, cap(8.5, 8), o.top, 0, -8, 0, true, T(o, 'top', o.top));
    const el = new THREE.Group(); el.position.y = -16; sh.add(el); part(el, cap(7.5, 6), o.sleeve || o.top, 0, -6, 0, true, T(o, 'top', o.top)); if (o.rolled) part(el, geo('cuff', () => new THREE.TorusGeometry(8, 2.6, 6, 14)), o.rolled, 0, -11, 0).rotation.x = Math.PI / 2;   /* 소매 접힘 */ part(el, sph(10), SKIN, 0, -15, 0);   /* 동그란 손 */
    J[s < 0 ? 'armR' : 'armL'] = sh; J[s < 0 ? 'elbR' : 'elbL'] = el;
  }
  /* 다리 (엉덩이 → 무릎 → 발) */
  for (const s of [-1, 1]) {
    const hp = new THREE.Group(); hp.position.set(s * 12, 0, 0); hips.add(hp); part(hp, cap(10, 6), o.pants, 0, -8, 0);
    const kn = new THREE.Group(); kn.position.y = -13; hp.add(kn); part(kn, cap(9.5, 3), o.pants, 0, -4, 0); part(kn, geo('shoe', () => new THREE.SphereGeometry(11.5, 16, 10)), o.shoe || 0x6A4A3A, 0, -13, 4).scale.set(1.05, 0.72, 1.25);   /* 짧고 동그란 발 */ if (o.boots) part(kn, cyl(9.5, 10, 14), o.boots, 0, -8, 0); if (o.socks) part(kn, geo('sock', () => new THREE.TorusGeometry(8.6, 2.4, 6, 14)), o.socks, 0, -6, 0).rotation.x = Math.PI / 2;
    J[s < 0 ? 'legR' : 'legL'] = hp; J[s < 0 ? 'kneeR' : 'kneeL'] = kn;
  }
  /* 손에 드는 것 */
  const held = new THREE.Group(); held.position.set(0, 46, 32); torso.add(held); J.held = held;
  const sh = new THREE.Mesh(new THREE.CircleGeometry(30, 24), new THREE.MeshBasicMaterial({ map: shadowTex(), color: 0x6A4A5A, transparent: true, opacity: 0.42, depthWrite: false }));   /* 배경 그림 같은 부드러운 접지 그림자 */ sh.rotation.x = -Math.PI / 2; sh.position.y = 0.5; root.add(sh); J.shadow = sh;
  return { root, J };
}
/* 소품 */
export function dish(kind) {
  const g = new THREE.Group();
  if (kind === 'bagel') { part(g, cyl(16, 14, 4), SPRING ? 0xF9D4DC : 0xFFF6E8, 0, 2, 0); const b = part(g, geo('tor', () => new THREE.TorusGeometry(10, 5.5, 10, 18)), 0xDFA055, 0, 9, 0); b.rotation.x = Math.PI / 2; part(g, geo('crm', () => new THREE.BoxGeometry(9, 3, 6)), 0xFFF0C0, 0, 15, 0); }
  else if (kind === 'soup') { part(g, cyl(14, 9, 11), SPRING ? 0xBFE6D6 : 0xFFB060, 0, 6, 0); part(g, cyl(12, 12, 1, 18), SPRING ? 0xF4C27A : 0xE87A3A, 0, 11.6, 0, false); }
  else { part(g, cyl(9, 8, 16), 0xFFF6E8, 0, 8, 0); part(g, cyl(8, 8, 1, 14), 0x8A5030, 0, 16.2, 0, false); part(g, sph(5), 0xFFFFFF, 0, 18, 0); }
  return g;
}
export function ladle() { const g = new THREE.Group(); part(g, cap(1.8, 26), 0xB57E52, 0, -10, 6).rotation.x = 0.4; part(g, sph(6), 0xB57E52, 0, -24, 12).scale.set(1, 0.6, 1); return g; }

/* ── 자세 ── 모든 값은 라디안 · 몸무게 이동 · 머리 지연은 따로 */
const KEYS = ['hipY', 'lean', 'sway', 'twist', 'hx', 'hy', 'hz', 'aLx', 'aLz', 'aRx', 'aRz', 'eL', 'eR', 'lL', 'lR', 'kL', 'kR', 'carry'];
const base = () => Object.fromEntries(KEYS.map(k => [k, 0]));
const STRIDE = 2 * 2 * 26 * Math.sin(0.5);   /* 다리 길이 ≈ 26 · 진폭 0.5 → 한 주기 이동 거리 */
const POSE = {
  idle(t, a) { const p = base(), b = Math.sin(t * TAU / 3.2 + a.seed), g = (t + a.seed * 2) % 5.5, tilt = g < 1.6 ? Math.sin(g / 1.6 * Math.PI) : 0, lk = (t + a.seed * 3) % 7.5, look = lk > 5.8 ? Math.sin((lk - 5.8) / 1.7 * TAU) : 0;   /* 숨쉬기 + 가끔 두리번 */
    p.hipY = 0.8 * b; p.lean = 0.025 * b; p.hz = 0.22 * tilt; p.hy = 0.15 * Math.sin(t * 0.5 + a.seed) + 0.55 * look; p.aLz = 0.12 + 0.03 * b; p.aRz = 0.12 + 0.03 * b; p.eL = -0.25; p.eR = -0.25;
    const sh = Math.sin(t * 0.37 + a.seed) > 0.6 ? 1 : 0; p.sway = 0.04 * sh; p.lR = -0.05 * sh; p.kR = 0.12 * sh; return p; },
  walk(t, a) { const ph = a.walkPh, s = Math.sin(ph), p = base();
    p.lL = 0.5 * s; p.lR = -0.5 * s; p.kL = 0.55 * Math.max(0, Math.sin(ph + 0.9)); p.kR = 0.55 * Math.max(0, Math.sin(ph + Math.PI + 0.9));
    p.hipY = 2.2 * Math.abs(Math.cos(ph)) - 1; p.sway = 0.05 * s; p.twist = 0.12 * s; p.lean = 0.06;
    p.aLx = a.carry ? -1.2 : -0.55 * s; p.aRx = a.carry ? -1.2 : 0.55 * s; p.eL = a.carry ? -0.6 : -0.35; p.eR = p.eL; p.aLz = 0.08; p.aRz = 0.08;
    p.hz = -0.04 * s; p.hx = 0.03 * Math.cos(ph * 2 - 0.6); return p; },
  stir(t) { const ph = t % 3.4; if (ph > 2.4) { const k = Math.sin((ph - 2.4) / 1.0 * Math.PI), p = base();   /* 2단계: 젓다가 → 들여다보고 한 줌 넣기 */
      p.lean = 0.28 * k; p.hx = 0.32 * k; p.aLx = -0.6 - 1.2 * k; p.aLz = 0.3; p.eL = -1.0 - 0.3 * Math.sin(t * 20) * k; p.aRx = -0.9; p.aRz = 0.3; p.eR = -1.0; p.hipY = -1.2 * k; return p; }
    const a = TAU * t / 1.5, p = base();   /* 국자 원 · 몸 쏠림 · 머리 반 박자 늦게 */
    p.lean = 0.18 + 0.07 * Math.sin(a); p.sway = 0.05 * Math.cos(a); p.twist = 0.08 * Math.cos(a);
    p.aRx = -1.0 + 0.25 * Math.sin(a); p.aRz = 0.25 + 0.25 * Math.cos(a); p.eR = -0.9 + 0.2 * Math.sin(a - 0.4);
    p.aLx = -0.5; p.aLz = 0.35; p.eL = -1.6; p.hx = 0.18 + 0.06 * Math.sin(a - 0.9); p.hz = 0.06 * Math.cos(a - 1.1); p.hipY = 0.8 * Math.cos(a * 2); return p; },
  taste(t) { const p = base(), c = clamp(t / 2.4, 0, 1), up = Math.sin(Math.min(1, c * 1.6) * Math.PI);
    p.aRx = -1.0 - 1.0 * up; p.eR = -0.9 - 0.9 * up; p.aRz = 0.25 - 0.2 * up; p.hx = 0.15 - 0.25 * up; p.lean = 0.12 - 0.12 * up;
    const hop = c > 0.7 && c < 0.85 ? Math.sin((c - 0.7) / 0.15 * Math.PI) : 0; p.hipY = 6 * hop; p.aLx = -0.4 - 1.2 * hop; p.aLz = 0.4 + 0.4 * hop; return p; },
  sit(t, a) { const k = ease(t / 0.5), p = base(), b = Math.sin(t * TAU / 3 + a.seed);
    p.hipY = -12 * k; p.lL = -1.45 * k; p.lR = -1.45 * k; p.kL = 1.45 * k; p.kR = 1.45 * k; p.lean = 0.05 * b; p.aLx = -0.6 * k; p.aRx = -0.6 * k; p.eL = -0.6 * k; p.eR = -0.6 * k;
    p.hx = 0.08; p.hz = 0.18 * Math.sin(t * 0.7 + a.seed) * k; return p; },
  eat(t, a) { const p = POSE.sit(9, a), bite = Math.max(0, Math.sin(TAU * t / 1.1)), nod = (t % 2.2) > 1.6 ? Math.sin(((t % 2.2) - 1.6) / 0.6 * TAU * 2) : 0;   /* 먹다가 '맛있다' 끄덕끄덕 */
    p.aRx = -1.1 - 0.7 * bite; p.eR = -1.2 - 0.6 * bite; p.hx = 0.18 - 0.15 * bite + 0.16 * nod; p.lean = 0.12 - 0.06 * bite; p.hy = 0.05 * Math.sin(t * 9) * bite; return p; },
  happy(t, a) { const p = POSE.sit(9, a), k = Math.sin(clamp(t / 1.2, 0, 1) * Math.PI); p.aLx = -0.6 - 1.6 * k; p.aRx = -0.6 - 1.6 * k; p.aLz = 0.5 * k; p.aRz = 0.5 * k; p.hx = -0.15 * k; p.hipY = -12 + 4 * k; p.sway = 0.1 * Math.sin(t * 14) * k; return p; },
  wave(t) { const p = base(), k = Math.sin(clamp(t / 1.6, 0, 1) * Math.PI); p.aRx = -0.4 * k; p.aRz = 2.4 * k; p.eR = (-0.3 - 0.5 * Math.max(0, Math.sin(t * 16))) * k; p.hz = -0.15 * k; p.sway = -0.04 * k; p.hipY = 1.2 * Math.sin(t * 7) * k; return p; },
  serve(t) { const p = base(), up = clamp(t / 0.3, 0, 1), dn = clamp((t - 0.3) / 0.35, 0, 1), bow = clamp((t - 0.65) / 0.35, 0, 1), k = Math.sin(bow * Math.PI);   /* 3단계: 들어 올림 → 내려놓음 → 꾸벅 */
    p.aLx = -1.2 - 0.6 * up + 0.5 * dn; p.aRx = p.aLx; p.eL = -0.6 - 0.3 * up; p.eR = p.eL; p.lean = 0.12 * dn + 0.28 * k; p.hx = 0.1 * dn + 0.3 * k; p.hipY = 1.5 * up - 1.5 * dn; return p; }
};
const FACEOF = { idle: ['open', 'smile'], walk: ['open', 'smile'], stir: ['open', 'focus'], serve: ['open', 'smile'], taste: ['happy', 'open'], sit: ['open', 'smile'], eat: ['happy', 'chew'], happy: ['happy', 'open'], wave: ['happy', 'open'], serve: ['open', 'open'] };

class Spring { constructor(k, c) { this.k = k; this.c = c; this.x = 0; this.v = 0; } step(t, dt) { this.v += ((t - this.x) * this.k - this.v * this.c) * dt; this.x += this.v * dt; return this.x; } }
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const BLEND = 0.3;

export class Person {
  constructor(look, sx, sy, seed = Math.random() * 5) {
    const m = makePerson(look); this.root = m.root; this.J = m.J; sceneRef.scene.add(this.root); this.k0 = (look.h || 60) / 165; this.root.scale.setScalar(this.k0);   /* 키 = look.h (어른 = 문 높이 × 0.8) · 원근은 update 에서 */
    this.meshes = []; this.root.traverse(o => { if (o.isMesh) this.meshes.push([o, o.renderOrder || 0]); });
    this.root.position.copy(toWorld(sx, sy)); this.look = look; this.seed = seed; this.speed = look.speed || 70;
    this.yaw = 0; this.act = 'idle'; this.t = 0; this.from = null; this.fromT = 9; this.cur = base(); this.walkPh = 0; this.carry = false;
    this.blinkAt = rnd(1, 4); this.blinkEnd = 0; this.fx = '';
    this.sp = { hair: new Spring(80, 7), hairZ: new Spring(80, 7), lag: new Spring(70, 9) }; this.prevYaw = 0; this.prevPos = this.root.position.clone(); this.vel = 0;
  }
  play(a) { if (a === this.act) return; this.from = { ...this.cur }; this.fromT = 0; this.act = a; this.t = 0; }
  walkTo(sx, sy, then) { this.target = toWorld(sx, sy); this.then = then; this.play('walk'); }
  face(sx, sy, k = 1) { const w = toWorld(sx, sy); this.yawT = Math.atan2(w.x - this.root.position.x, w.z - this.root.position.z) * k; }   /* k < 1: 카메라 쪽으로 돌려 얼굴이 보이게 */
  hold(obj) { this.J.held.clear(); if (obj) this.J.held.add(obj); this.carry = !!obj; this.refreshMeshes(); }
  refreshMeshes() { this.meshes = []; this.root.traverse(o => { if (o.isMesh) this.meshes.push([o, o.renderOrder > 0 ? 0 : o.renderOrder || 0]); }); }
  update(dt, now) {
    this.t += dt; this.fromT += dt; const P = this.root.position;
    if (this.act === 'walk' && this.target) {
      const dx = this.target.x - P.x, dz = this.target.z - P.z, d = Math.hypot(dx, dz);
      if (d < 2) { this.target = null; this.play('idle'); this.settle = 0; const f = this.then; this.then = null; f && f(); }
      else { this.yawT = Math.atan2(dx, dz); const off = Math.abs(angDiff(this.yaw, this.yawT)), v = this.speed * (off > 1.0 ? 0 : Math.max(0.2, Math.cos(off)))   /* 크게 돌 땐 몸을 먼저 돌리고 출발 */ * Math.min(1, this.t / 0.3 + 0.3) * Math.min(1, d / 25 + 0.4);
        const st = Math.min(d, v * dt); P.x += dx / d * st; P.z += dz / d * st; this.walkPh += st / (STRIDE * (this.k0 || 0.36) * (this.persp || 1)) * TAU; }   /* 실제 크기 기준 보폭 → 발이 미끄러지지 않음 */   /* 걸음 박자 = 이동 거리 ÷ 보폭 → 발 미끄러짐 없음 */
    }
    if (this.yawT !== undefined) { this.yaw += angDiff(this.yaw, this.yawT) * Math.min(1, dt * 6); this.root.rotation.y = this.yaw; }
    let p = POSE[this.act](this.t, this);
    if (this.from && this.fromT < BLEND) { const w = ease(this.fromT / BLEND), q = {}; for (const k of KEYS) q[k] = lerp(this.from[k], p[k], w); p = q; }
    this.cur = p; const J = this.J;
    /* 2차 움직임: 출발/멈춤 쏠림 · 돌 때 머리카락 · 묶은 머리 · 모자 */
    const v = P.distanceTo(this.prevPos) / Math.max(dt, 1e-3); this.prevPos.copy(P); const acc = (v - this.vel) / Math.max(dt, 1e-3); this.vel = v;
    const yawV = angDiff(this.prevYaw, this.yaw) / Math.max(dt, 1e-3); this.prevYaw = this.yaw;
    const lag = this.sp.lag.step(clamp(-acc * 0.0012, -0.15, 0.15), dt), hx = this.sp.hair.step(clamp(-acc * 0.002 + (p.hipY - (this.pHip ?? p.hipY)) * 0.25, -0.3, 0.3), dt), hz = this.sp.hairZ.step(clamp(yawV * 0.1, -0.4, 0.4), dt); this.pHip = p.hipY;
    /* 멈출 때 살짝 기울었다 서기 */ if (this.settle !== undefined && this.settle < 0.7) { this.settle += dt; p.lean += 0.16 * Math.exp(-this.settle * 6) * Math.sin(this.settle * 15); }
    J.hips.position.y = 31 + p.hipY; J.hips.rotation.set(0, p.twist * 0.4, p.sway);
    /* 걸을 때 통통 (위아래 늘었다 줄었다 · 소량) */ const sq = this.act === 'walk' ? 0.045 * Math.cos(this.walkPh * 2) : this.act === 'happy' ? 0.05 * Math.sin(this.t * 14) : 0; J.torso.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
    J.torso.rotation.set(p.lean + lag, -p.twist * 0.7, -p.sway * 0.6);
    const br = Math.sin(now * TAU / 3.2 + this.seed); J.body.scale.set(1 - 0.012 * br, 1 + 0.025 * br, 0.9);
    J.neck.rotation.set(p.hx - (p.lean + lag) * 0.5, p.hy + p.twist * 0.4, p.hz);
    J.armL.rotation.set(p.aLx, 0, p.aLz); J.armR.rotation.set(p.aRx, 0, -p.aRz); J.elbL.rotation.x = p.eL; J.elbR.rotation.x = p.eR;
    J.legL.rotation.x = -p.lL; J.legR.rotation.x = -p.lR; J.kneeL.rotation.x = p.kL; J.kneeR.rotation.x = p.kR;
    J.hair.rotation.set(hx * 0.25, 0, hz * 0.15); if (J.pony) J.pony.rotation.set(0.3 + hx * 1.6, 0, hz * 1.5); if (J.bun) J.bun.position.x = hz * 2; if (J.hat) J.hat.rotation.z = (this.look.chef ? 0.12 : 0) + hz * 0.2;
    J.held.position.set(0, 44, 30); J.held.visible = this.carry;
    if (now > this.blinkAt) { this.blinkEnd = now + rnd(0.08, 0.16); this.blinkAt = now + rnd(2.2, 5); }
    if (!this.smileAt) this.smileAt = now + rnd(4, 9); if (now > this.smileAt) { this.smileEnd = now + rnd(0.6, 1.1); this.smileAt = now + rnd(6, 11); }   /* 가끔 웃는 눈 */
    let [e, m] = FACEOF[this.act] || ['open', 'smile']; if (e === 'open' && now < this.blinkEnd) e = 'closed'; else if (e === 'open' && now < (this.smileEnd || 0) && (this.act === 'idle' || this.act === 'walk' || this.act === 'sit')) e = 'happy';
    const key = e + m; if (key !== this.fx) { J.face.material.map = faceTex(e, m, !!this.look.lash); J.face.material.needsUpdate = true; this.fx = key; }
    J.shadow.scale.setScalar(1 - p.hipY * 0.01);
    /* 원근 + 앞뒤 순서 (발 y 로 · 건물 가림판과 같은 규칙) */
    const sy = P.z * Math.sin(EL) + 780; this.persp = PERSP(sy); this.root.scale.setScalar(this.k0 * this.persp); const base = Math.round((sy + 220) * 10); for (const [m, off] of this.meshes) m.renderOrder = base + off;
  }
}

export const LOOKS = {
  hero: { name: '주인공 · 캠프 셰프', top: 0xFF7A2E, apron: 0xFFF6E6, hair: 0x6A3E22, pants: 0x7A5236, shoe: 0x5A3A22, chef: true, scarf: 0xFFC94A, pony: true, lash: true, size: 1.08, speed: 72 },
  helper: { name: '도우미', top: 0x7FB26A, apron: 0xFFF0DC, hair: 0x2E2420, pants: 0x5A4A3A, bandana: 0xFF8A3D, size: 1.0, speed: 82 },
  g1: { name: '손님 · 등산객', top: 0x5E8FC8, hair: 0x4A3020, pants: 0x55606A, beanie: 0xE8504A, pack: 0xC98C52, size: 1.0, speed: 66 },
  g2: { name: '손님 · 할머니', top: 0xC77DB0, hair: 0xE8E2DA, pants: 0x8A7A6A, bun: true, scarf: 0xFFE7A8, size: 0.95, speed: 52, lash: true },
  g3: { name: '손님 · 꼬마', top: 0xFFD24A, hair: 0x8A5A2A, pants: 0x5E8FC8, size: 0.82, speed: 76 }
};
/* 봄 파스텔: 채도 낮게 · 명도 높게 · 마루미 주황은 주인공 스카프 한 곳만 · 외곽선 · 머리카락은 진하게 둬서 배경에 안 묻힘 */
if (SPRING) {   /* 봄판 의상 (shots/costume_sheet_spring_2d.png 기준) */
  LOOKS.hero = { ...LOOKS.hero, top: 0xFFF6E6, apron: 0xF3A9BA, hair: 0x7A4A30, pants: 0xF2E8D8, shoe: 0x8A5A3A, scarf: null, buttons: 0xB98A5E, double: true, collar: 0xFFFBF2, pocket: 0xEE96AA, ties: 0xF3A9BA, ribbon: 0xFF8A3D, rolled: 0xFFFBF2 };
  LOOKS.helper = { ...LOOKS.helper, top: 0xF7F0DC, topPat: ['stripe', 0xC9DDB0], apron: 0x9CC48A, hair: 0xA9805C, pants: 0xE2D2B4, shoe: 0x8A5A3A, bandana: 0xF6EAD0, pocket: 0x8AB678, ties: 0x9CC48A, rolled: 0xF7F0DC };
  LOOKS.g1 = { ...LOOKS.g1, top: 0x8DB4DE, topPat: ['knit', 0x7AA2CE], hair: 0x6E4A36, pants: 0xA98A62, shoe: 0x7A5236, beanie: null, bucket: 0xF2E6CC, bucketBand: 0xD9C8A8, collar: 0xFFF8EC, pack: 0x9A6A44, packFlap: 0x84583A, straps: 0x84583A, socks: 0xFFF3DE };
  LOOKS.g2 = { ...LOOKS.g2, top: 0xBFB0D0, hair: 0xB5ACA6, pants: 0xBFB0D0, shoe: 0x8A5A3A, scarf: null, buttons: 0x8A7A9A, shawl: 0xFBF3E2, shawlPat: ['fringe', 0xEADCC2], glasses: 0xC88A5A, skirt: 0xF4EEF6, skirtPat: ['floral', 0xC9B8E0] };
  LOOKS.g3 = { ...LOOKS.g3, top: 0xFBE59A, hair: 0xB08A64, pants: 0xFBF1D8, shoe: 0xF0A0B2, boots: 0xF0A0B2, collar: 0xCFE3B4, collarPat: ['check', 0xA9C98E], buttons: 0xC9A04A, teddy: 0xB07A4E };
}

/* 추가 의상 (요리사 2 · 서빙 2) — 같은 원칙(주색 1 · 보조 1 · 포인트 1 · 따뜻한 갈색 머리) */
Object.assign(LOOKS, {
  cook1: { name: '솔', top: 0xFFF6E6, apron: 0xBFE0C8, hair: 0x5E3E2A, pants: 0xE2D2B4, shoe: 0x8A5A3A, bandana: 0x9CC48A, collar: 0xFFFBF2, buttons: 0xB98A5E, pocket: 0xA8D2B4, ties: 0xBFE0C8, rolled: 0xFFF6E6, size: 1.0, speed: 80 },
  cook2: { name: '바다', top: 0xEAF3FB, topPat: ['stripe', 0xBFD8EE], apron: 0xF6E2B8, hair: 0x8A6448, pants: 0xA8B8C8, shoe: 0x8A5A3A, chef: true, pocket: 0xEED4A0, ties: 0xF6E2B8, rolled: 0xEAF3FB, pony: true, size: 1.0, speed: 80 },
  helper2: { name: '별', top: 0xFCEFF2, apron: 0xC9B8E0, hair: 0x6E4A36, pants: 0xE2D2B4, shoe: 0x8A5A3A, bandana: 0xF3A9BA, pocket: 0xB8A6D2, ties: 0xC9B8E0, rolled: 0xFCEFF2, size: 0.98, speed: 92 },
  couple: { name: '손님 · 커플', top: 0xF7E3D0, topPat: ['knit', 0xEBD0B8], hair: 0x5E3E2A, pants: 0x9AB0C8, shoe: 0x7A5236, collar: 0xFFFBF2, size: 1.0, speed: 64 },
  family: { name: '손님 · 가족', top: 0xCFE6C2, hair: 0xA9805C, pants: 0xE8D8B8, shoe: 0x8A5A3A, bucket: 0xFBF1D8, size: 0.92, speed: 70 },
});
/* 몸 교체 등록부 */
const REG = { person: (look, sx, sy, seed) => new Person(look, sx, sy, seed) };
export const register = (kind, f) => { REG[kind] = f; };
export const create = (kind, look, sx, sy, seed) => (REG[kind] || REG.person)(look, sx, sy, seed);

/* ── 동행 펫 · 비숑 (v0.2 BM · 능력치 없음) — 마루미 계열: 동글동글 털뭉치 · 같은 툰 · 같은 외곽선 · 같은 원근/앞뒤 규칙
   셰프 옆을 길 따라 졸졸 · 손님이 가까이 오면 그쪽을 보고 꼬리를 세차게 흔들며 콩콩 뜀 · 가만히 있으면 앉아서 숨 고르기 */
export class Pet {
  constructor(sx, sy, o = {}) {
    const W_ = o.fur || 0xFFFBF4, C_ = o.ear || 0xF4E6D4, root = new THREE.Group(), J = {};
    const sh = new THREE.Mesh(new THREE.CircleGeometry(30, 24), new THREE.MeshBasicMaterial({ map: shadowTex(), color: 0x6A4A5A, transparent: true, opacity: 0.4, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.5; sh.scale.set(0.8, 1.15, 1); sh.renderOrder = -2; root.add(sh); J.shadow = sh;
    const bd = new THREE.Group(); bd.position.y = 17; root.add(bd); J.body = bd;
    part(bd, sph(14), W_).scale.set(1, 0.86, 1.32);
    for (const [x, y, z, r] of [[-9, 3, 6, 7], [9, 3, 6, 7], [-9, 2, -8, 7], [9, 2, -8, 7], [0, 9, -2, 8], [0, -4, 12, 7]]) part(bd, sph(r), W_, x, y, z, false);   /* 털뭉치 */
    J.legs = [[-7, 9], [7, 9], [-7, -10], [7, -10]].map(([x, z]) => { const g = new THREE.Group(); g.position.set(x, 10, z); bd.parent.add(g); part(g, cap(4, 5), W_, 0, -5, 0); part(g, sph(4.6), W_, 0, -9.5, 1, false); return g; });
    const hd = new THREE.Group(); hd.position.set(0, 33, 15); root.add(hd); J.head = hd;
    part(hd, sph(13), W_).scale.set(1.05, 0.95, 0.95); part(hd, sph(10), W_, 0, 9, -2, false); part(hd, sph(6.5), W_, -8, -3, 4, false); part(hd, sph(6.5), W_, 8, -3, 4, false);
    J.ears = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 11, 3, -1); hd.add(g); part(g, sph(6), C_, 0, -6, 0).scale.set(0.75, 1.35, 0.7); return g; });
    part(hd, sph(5.5), 0xFFFFFF, 0, -5, 10, false).scale.set(1.15, 0.8, 0.9);   /* 주둥이 */
    for (const s of [-1, 1]) { part(hd, sph(2.3), 0x2E2420, s * 5, 1.5, 11.5, false); part(hd, sph(0.8), 0xFFFFFF, s * 5 + 0.8, 2.6, 13.4, false); part(hd, sph(2.2), 0xF6B8C4, s * 8.5, -3.5, 9.5, false).scale.set(1, 0.6, 0.4); }   /* 눈 · 반짝 · 볼터치 */
    part(hd, sph(2.1), 0x2E2420, 0, -2.6, 15.4, false); J.tongue = part(hd, cap(1.6, 1.6), 0xF08A9A, 0, -8, 13, false); J.tongue.visible = false;
    const tl = new THREE.Group(); tl.position.set(0, 24, -17); root.add(tl); J.tail = tl; part(tl, sph(6.5), W_, 0, 6, -3); part(tl, sph(4.5), W_, 0, 10, -1, false);
    if (o.collar) { const c = part(hd, new THREE.TorusGeometry(9, 1.8, 8, 20), o.collar, 0, -9, -2, false); c.rotation.x = Math.PI / 2 - 0.3; }
    this.root = root; this.J = J; sceneRef.scene.add(root); this.k0 = (o.h || 60) / 165; root.scale.setScalar(this.k0); root.position.copy(toWorld(sx, sy));
    this.meshes = []; root.traverse(m => { if (m.isMesh) this.meshes.push([m, m.renderOrder || 0]); });
    this.path = []; this.speed = o.speed || 92; this.yaw = 0; this.t = 0; this.excite = 0; this.lookAt = null; this.idleT = 0; this.ph = 0;
  }
  goPath(pts) { this.path = pts.map(([x, y]) => toWorld(x, y)); }
  cheer(sx, sy) { this.excite = 1.6; this.lookAt = toWorld(sx, sy); }   /* 손님을 보고 꼬리 흔들기 */
  get moving() { return this.path.length > 0; }
  update(dt, now) {
    this.t += dt; const P = this.root.position, J = this.J; let v = 0;
    if (this.path.length) { const tg = this.path[0], dx = tg.x - P.x, dz = tg.z - P.z, d = Math.hypot(dx, dz);
      if (d < 2) this.path.shift(); else { const yt = Math.atan2(dx, dz); this.yaw += angDiff(this.yaw, yt) * Math.min(1, dt * 9); const st = Math.min(d, this.speed * dt); P.x += dx / d * st; P.z += dz / d * st; v = st / dt; } this.idleT = 0; }
    else { this.idleT += dt; if (this.lookAt) { const yt = Math.atan2(this.lookAt.x - P.x, this.lookAt.z - P.z); this.yaw += angDiff(this.yaw, yt) * Math.min(1, dt * 6); } }
    this.root.rotation.y = this.yaw; this.excite = Math.max(0, this.excite - dt); if (this.excite <= 0) this.lookAt = null;
    /* 걷기: 종종걸음 (다리 4개 엇갈림 · 몸 통통) · 신남: 콩콩 뛰기 · 가만히: 앉아 숨 고르기 */
    this.ph += dt * (v > 1 ? 16 : this.excite > 0 ? 13 : 3);
    const walk = v > 1, hop = !walk && this.excite > 0 ? Math.abs(Math.sin(this.ph)) * 5 : 0, sit = !walk && this.excite <= 0 && this.idleT > 1.2;
    J.legs.forEach((g, i) => { g.rotation.x = walk ? Math.sin(this.ph + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.7 : 0; });
    J.body.position.y = 17 + (walk ? Math.abs(Math.sin(this.ph)) * 1.6 : 0) + hop - (sit ? 3 : 0); J.body.rotation.x = sit ? -0.28 : 0; J.head.position.y = 33 + hop - (sit ? 1 : 0) + (walk ? Math.abs(Math.sin(this.ph)) * 1.2 : 0);
    J.legs[2].position.y = J.legs[3].position.y = sit ? 6 : 10;
    const wag = this.excite > 0 ? 18 : walk ? 9 : 4; J.tail.rotation.z = Math.sin(now * wag) * (this.excite > 0 ? 0.7 : 0.35); J.tail.rotation.x = -0.3;
    J.head.rotation.set(sit ? 0.08 : 0, 0, Math.sin(now * 1.7) * 0.06 + (this.excite > 0 ? Math.sin(now * 9) * 0.12 : 0)); for (const [i, e] of J.ears.entries()) e.rotation.z = (i ? -1 : 1) * (0.1 + (walk || this.excite > 0 ? Math.abs(Math.sin(this.ph)) * 0.35 : 0));
    J.tongue.visible = this.excite > 0 || (sit && Math.sin(now * 0.7) > 0.3); if (J.tongue.visible) J.tongue.position.y = -8 - Math.abs(Math.sin(now * 8)) * 0.8;
    J.shadow.scale.set(0.8 - hop * 0.02, 1.15 - hop * 0.03, 1);
    const sy = P.z * Math.sin(EL) + 780; this.persp = PERSP(sy); this.root.scale.setScalar(this.k0 * this.persp); const base = Math.round((sy + 220) * 10); for (const [m, off] of this.meshes) m.renderOrder = base + off;
  }
}
