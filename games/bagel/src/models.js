// 모델을 코드로 직접 만듦: 낮은 다각형 + 만화풍 3단 음영 (사람 · 베이글 · 커피 · 설비 · 가게)
import * as THREE from 'three';
import { BRAND } from './data.js?v=0.99.42';

const gm = (() => { const d = new Uint8Array([95, 190, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const mats = {};
export const M = c => mats[c] ||= new THREE.MeshToonMaterial({ color: c, gradientMap: gm });
export function mesh(g, m, x = 0, y = 0, z = 0, p) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; if (p) p.add(o); return o; }
const G = {}; const geo = (k, f) => G[k] ||= f();
export const box = (w, h, d, c, x, y, z, p) => mesh(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), M(c), x, y + h / 2, z, p);
export const cyl = (rt, rb, h, c, x, y, z, p, s = 16) => mesh(geo(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s)), M(c), x, y + h / 2, z, p);
export const sph = (r, c, x, y, z, p, ws = 14, hs = 10) => mesh(geo(`s${r},${ws}`, () => new THREE.SphereGeometry(r, ws, hs)), M(c), x, y, z, p);
// ── 물건: 베이글 · 크림치즈 베이글 · 커피 · 쓰레기
export const ITEM_H = { drink: 29, bagel: 15, cream: 16, coffee: 27, trash: 12, box: 30, dough: 14, boiled: 15 };
export const LOOK = { cream: 'salt', coffee: 'cup_plain' };
export function item(kind) {
  const g = new THREE.Group(), torus = () => geo('torus', () => new THREE.TorusGeometry(15, 7.5, 8, 18).rotateX(Math.PI / 2));
  const look = kind === 'cream' ? LOOK.cream : kind === 'coffee' ? LOOK.coffee : kind;
  const dots = (n, c, r = 2, y = 14) => { for (let i = 0; i < n; i++) { const a = i / n * 6.28 + i, rr = 11 + (i % 3) * 3; sph(r, c, Math.cos(a) * rr, y, Math.sin(a) * rr, g, 5, 4); } };
  if (look === 'bagel') mesh(torus(), M(0xE2A55A), 0, 7.5, 0, g);
  else if (look === 'salt') { mesh(torus(), M(0xCF8A2E), 0, 7.5, 0, g); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; box(3, 2, 3, 0xFFFFFF, Math.cos(a) * 15, 14, Math.sin(a) * 15, g); } box(12, 3, 8, 0xFFE27A, 0, 14, 12, g); }
  else if (look === 'olive') { mesh(torus(), M(0xD9A866), 0, 7.5, 0, g); dots(7, 0x3A4A22, 2.6); dots(4, 0x1E2418, 2.2, 12); }
  else if (look === 'spinach') { mesh(torus(), M(0xE2A55A), 0, 7.5, 0, g); cyl(17, 15, 4, 0xF2A23A, 0, 11, 0, g, 14); dots(8, 0x4A8A3A, 1.8, 15.5); }
  else if (look === 'cranberry') { mesh(torus(), M(0xC0844A), 0, 7.5, 0, g); dots(8, 0xA0202A, 2.2); }
  else if (look.startsWith('cup')) { cyl(12, 10, 18, 0xEEF4F6, 0, 0, 0, g, 12); const top = { cup_plain: 0xFFFBF2, cup_blue: 0xB49AD8, cup_scallion: 0xFFF8EE, cup_fig: 0xF2E2D6 }[look] || 0xFFFBF2; if (look === 'cup_fig') dots(5, 0x7A3A2A, 2, 24);
    sph(12.5, top, 0, 19, 0, g, 12, 8).scale.set(1, 0.7, 1); if (look === 'cup_blue') dots(6, 0x3A2A6A, 1.8, 24); if (look === 'cup_scallion') { dots(5, 0x4AA04A, 1.8, 24); dots(3, 0xC04A3A, 1.6, 23); } }
  else if (kind === 'drink') { cyl(11, 8.5, 26, 0xE8F2F6, 0, 0, 0, g, 12); cyl(10, 8, 17, 0x4A2A16, 0, 2, 0, g, 12); cyl(11.5, 11.5, 3, 0xFFFFFF, 0, 26, 0, g, 12); cyl(1.2, 1.2, 18, 0xFF6720, 3, 26, 0, g, 6); }   /* 아이스 아메리카노 */
  else if (kind === 'dough') { sph(14, 0xFFF4E2, 0, 9, 0, g, 12, 8).scale.set(1, 0.65, 1); }
  else if (kind === 'boiled') { mesh(torus(), new THREE.MeshToonMaterial({ color: 0xE8C08A, gradientMap: gm, emissive: 0x3A2208 }), 0, 7.5, 0, g); }
  else if (kind === 'prem') { mesh(torus(), new THREE.MeshToonMaterial({ color: 0xB86A20, gradientMap: gm, emissive: 0x3A1A00 }), 0, 7.5, 0, g); sph(3, 0xFFFFFF, 8, 15, -6, g, 6, 4); }
  else if (kind === 'trash') { box(30, 3, 22, 0x6A4A3A, 0, 0, 0, g); sph(7, 0xB8B8B8, -6, 8, 0, g, 6, 4); sph(6, 0xA8A8A8, 6, 7, 3, g, 6, 4); cyl(4, 3, 10, 0xD84A3A, 8, 3, -6, g, 6); }   /* 쟁반 + 구겨진 종이 (음식과 구분) */
  return g;
}
// ── 사람: 동그란 몸 · 머리 · 모자 · 팔다리 (걸을 때 흔듦)
export function person(o = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  mesh(geo('pbody', () => new THREE.CapsuleGeometry(30, 34, 6, 12)), M(o.body || 0xF28C38), 0, 62, 0, body);
  if (o.apron) mesh(geo('papron', () => new THREE.CapsuleGeometry(31, 20, 6, 12)), M(o.apronC || 0xFFFFFF), 0, 54, 4, body).scale.set(0.96, 1, 0.92);
  if (o.scarf) { mesh(geo('pscarf', () => new THREE.TorusGeometry(24, 6, 6, 16).rotateX(Math.PI / 2)), M(o.scarf), 0, 98, 0, body); box(14, 18, 6, o.scarf, 6, 80, 27, body).rotation.z = 0.3; }   /* 사장님 목수건 */
  sph(32, 0xFFDDBF, 0, 128, 0, body, 18, 14);
  mesh(geo('phair', () => new THREE.SphereGeometry(33, 18, 14, 0, 6.28, 0, 1.4)), M(o.hair || 0x5A3A22), 0, 132, -2, body);
  const hat = o.hat || (o.cap ? 'cap' : null), hc = o.cap || 0xFFFFFF;
  if (hat === 'cap') { cyl(30, 32, 22, hc, 0, 150, 0, body); cyl(22, 22, 4, hc, 0, 150, 24, body); }
  else if (hat === 'toque') { cyl(30, 31, 16, 0xFFFFFF, 0, 148, 0, body); cyl(34, 28, 46, 0xFFFFFF, 0, 162, 0, body); sph(36, 0xFFFFFF, 0, 214, 0, body, 16, 10).scale.set(1, 0.62, 1); cyl(31.5, 31.5, 6, hc, 0, 150, 0, body); }   /* 사장님 셰프 모자 (직원은 캡 → 실루엣으로 구분) */
  else if (hat === 'beret') { const b = sph(34, hc, 4, 156, -2, body, 16, 8); b.scale.set(1.05, 0.38, 1.05); b.rotation.z = -0.18; sph(4, hc, 4, 170, -2, body, 6, 4); }
  else if (hat === 'bandana') { cyl(33.5, 33.5, 12, hc, 0, 140, 0, body); sph(36, hc, 0, 146, -4, body, 16, 8).scale.set(0.98, 0.5, 0.98); sph(7, hc, 0, 142, -34, body, 6, 4); }
  for (const s of [-1, 1]) { sph(4, 0x2A1A10, s * 11, 130, 29, body, 8, 6); sph(5, 0xFFB3A0, s * 20, 120, 24, body, 8, 6); }
  const legs = [-1, 1].map(s => { const L = new THREE.Group(); L.position.set(s * 14, 26, 0); g.add(L); mesh(geo('pleg', () => new THREE.CapsuleGeometry(10, 12, 4, 8)), M(o.pants || 0x6A4A3A), 0, -12, 0, L); return L; });
  const arms = [-1, 1].map(s => { const A = new THREE.Group(); A.position.set(s * 31, 88, 0); body.add(A); mesh(geo('parm', () => new THREE.CapsuleGeometry(8, 20, 4, 8)), M(o.body || 0xF28C38), 0, -16, 0, A); return A; });
  const hand = new THREE.Group(); hand.position.set(0, 74, 34); body.add(hand);   /* 들고 있는 물건이 쌓이는 곳 */
  const P = { g, body, legs, arms, hand, t: Math.random() * 6, carry: false };
  P.anim = (dt, moving) => { P.t += dt * (moving ? 12 : 2); const s = moving ? Math.sin(P.t) : 0;
    legs[0].rotation.x = s * 0.7; legs[1].rotation.x = -s * 0.7; body.position.y = moving ? Math.abs(Math.cos(P.t)) * 4 : Math.sin(P.t) * 1.2;
    for (let i = 0; i < 2; i++) arms[i].rotation.x = P.carry ? -1.25 : (i ? s : -s) * 0.6; };
  if (o.bubble) { const b = new THREE.Group(); b.position.set(0, 210, 0); g.add(b); mesh(geo('bub', () => new THREE.SphereGeometry(28, 16, 12)), M(0xFFFFFF), 0, 0, 0, b).scale.set(1.25, 1, 0.5); P.bubble = b; }
  return P;
}
// ── 가게 바닥 · 벽 · 창 · 간판 — 매장별 인테리어 (기준판 재정비 ③ · data.js theme): 틀 · 창 · 액자 · 간판 자리는 4지점 같고 바닥 · 벽 마감 · 벽등 · 차양 · 간판 · 바깥만 다름
//   지킬 것 (tools/gate_look.mjs L4): 가게 안에는 바닥(높이 2 이하) · 벽 띠(뒤 · 왼 벽에서 70 안) · 머리 위(180 위)에만 · 바깥 장식은 문 길 · 드라이브스루 길을 피하고 앞쪽은 낮게
//   바닥 무늬 두 색 대비 ≤ 1.25 · 베이글과 바닥 대비 ≥ 1.5 (0.3.1 「바닥이 화려해 베이글이 안 보임」)
const canvasTex = (w, h, draw, rx = 1, ry = 1) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; };
const hex = c => '#' + c.toString(16).padStart(6, '0');
const glowM = c => new THREE.MeshBasicMaterial({ color: c });
function floorTex(th, W, D) { const A = th.floorA, B = th.floorB;
  if (th.floor === 'plank') return canvasTex(256, 256, (x, w, h) => { for (let r = 0; r < 8; r++) { const y = r * 32, off = (r % 2) * 96; x.fillStyle = r % 3 === 1 ? B : A; x.fillRect(0, y, w, 32); x.fillStyle = B; x.fillRect(0, y, w, 2); for (let k = -1; k < 3; k++) x.fillRect(off + k * 160, y, 2, 32); } }, W / 320, D / 320);
  if (th.floor === 'tile') return canvasTex(128, 128, (x, w, h) => { x.fillStyle = A; x.fillRect(0, 0, w, h); x.fillStyle = B; x.fillRect(0, 0, w, 3); x.fillRect(0, 0, 3, h); }, W / 120, D / 120);
  if (th.floor === 'terra') return canvasTex(128, 128, (x, w, h) => { for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { x.fillStyle = (r + c) % 2 ? B : A; x.fillRect(c * 64, r * 64, 64, 64); } x.fillStyle = '#FBF3EA'; for (const k of [0, 64]) { x.fillRect(k, 0, 2, h); x.fillRect(0, k, w, 2); } }, W / 120, D / 120);
  return canvasTex(128, 128, (x, w, h) => { x.fillStyle = A; x.fillRect(0, 0, w, h); x.fillStyle = B; x.fillRect(0, 0, 64, 64); x.fillRect(64, 64, 64, 64); }, W / 140, D / 140); }
function wallMat(th, len, flip) { const a = hex(th.wallA);
  if (th.wall === 'wainscot') return new THREE.MeshToonMaterial({ gradientMap: gm, map: canvasTex(256, 230, (x, w, h) => { x.fillStyle = a; x.fillRect(0, 0, w, h); const wn = hex(th.wain); x.fillStyle = wn; x.fillRect(0, h - 92, w, 92); x.fillStyle = '#8A6A4C'; x.fillRect(0, h - 98, w, 8); x.fillStyle = 'rgba(0,0,0,0.12)'; for (let k = 16; k < w; k += 64) x.fillRect(k, h - 80, 44, 3); for (let k = 16; k < w; k += 64) x.fillRect(k, h - 20, 44, 3); }, len / 256, 1) });
  if (th.wall === 'vtile') return new THREE.MeshToonMaterial({ gradientMap: gm, map: canvasTex(64, 64, (x, w, h) => { x.fillStyle = a; x.fillRect(0, 0, w, h); x.fillStyle = th.grout; x.fillRect(0, 0, 2, h); x.fillRect(0, 0, w, 2); x.fillRect(32, 0, 2, h); }, len / 40, 230 / 60) });
  if (th.wall === 'louver') return new THREE.MeshToonMaterial({ gradientMap: gm, map: canvasTex(64, 64, (x, w, h) => { x.fillStyle = a; x.fillRect(0, 0, w, h); x.fillStyle = hex(th.slat); x.fillRect(6, 0, 14, h); x.fillRect(38, 0, 14, h); x.fillStyle = 'rgba(0,0,0,0.10)'; x.fillRect(18, 0, 2, h); x.fillRect(50, 0, 2, h); }, len / 50, 1) });
  return M(flip ? th.wallB : th.wallA); }
export function shopShell(sc, W, D, theme) {
  const th = { floor: 'check', wall: 'plain', ...theme }, I = new THREE.Group(); I.name = 'interior'; sc.add(I); const O = new THREE.Group(); O.name = 'outside'; sc.add(O);
  const f = mesh(new THREE.BoxGeometry(W, 20, D), new THREE.MeshToonMaterial({ map: floorTex(th, W, D), gradientMap: gm }), 0, -10, 0, I); f.castShadow = false; f.userData.floor = true;
  const out = mesh(new THREE.BoxGeometry(W + 12000, 10, D + 12000), M(theme.outside), 0, -16, 0, O); out.castShadow = false; out.userData.floor = true;
  mesh(new THREE.BoxGeometry(W, 230, 30), wallMat(th, W), 0, 115, -D / 2, I); mesh(new THREE.BoxGeometry(30, 230, D), wallMat(th, D, true), -W / 2, 115, 0, I); box(W + 4, 24, 36, theme.trim, 0, 230, -D / 2, I); box(36, 24, D + 4, theme.trim, -W / 2, 230, 0, I);
  if (th.wall === 'plain') { box(W - 30, 12, 6, theme.trim, 15, 0, -D / 2 + 18, I); box(6, 12, D - 30, theme.trim, -W / 2 + 18, 0, 15, I); }   /* 걸레받이 */
  const WX = []; for (let x = -W / 2 + 260; x < W / 2 - 150; x += 380) { WX.push(x); box(220, 120, 8, 0xBFE3F2, x, 70, -D / 2 + 16, I); box(230, 10, 14, th.wall === 'vtile' ? 0xC8D0D6 : 0xFFFFFF, x, 60, -D / 2 + 18, I); }
  for (let z = -D / 2 + 300; z < D / 2 - 200; z += 420) { box(8, 120, 200, 0xBFE3F2, -W / 2 + 16, 70, z, I); }
  // 창 위 차양 (1호점 흰 차양 · 2호점 주황 줄무늬)
  if (th.awn) { const t = canvasTex(64, 32, (x, w, h) => { if (th.awn === 'stripe') { for (let k = 0; k < 4; k++) { x.fillStyle = k % 2 ? '#FFFFFF' : hex(BRAND.accentHex); x.fillRect(k * 16, 0, 16, h); } } else { x.fillStyle = '#FFFCF6'; x.fillRect(0, 0, w, h); x.fillStyle = '#EADFCF'; x.fillRect(0, h - 6, w, 6); } }, 4, 1);
    for (const x of WX) { const a = mesh(new THREE.BoxGeometry(240, 4, 54), new THREE.MeshToonMaterial({ map: t, gradientMap: gm }), x, 205, -D / 2 + 40, I); a.rotation.x = 0.42; for (let k = -3; k <= 3; k++) cyl(9, 9, 4, th.awn === 'stripe' ? BRAND.accentHex : 0xFFFCF6, x + k * 34, 186, -D / 2 + 64, I, 10).rotation.x = Math.PI / 2; } }
  // 벽등 (뒤 벽 · 창 사이)
  const LX = [-660, -300, 80, 470];
  if (th.lamp === 'globe') for (const x of LX) { box(10, 26, 6, 0xB07A48, x, 160, -D / 2 + 18, I); mesh(geo('lampg', () => new THREE.SphereGeometry(14, 12, 10)), glowM(0xFFE2A8), x, 186, -D / 2 + 30, I); }
  if (th.lamp === 'brass') for (const x of LX) { box(8, 30, 6, 0xC9A24A, x, 150, -D / 2 + 18, I); box(6, 6, 26, 0xC9A24A, x, 176, -D / 2 + 30, I); mesh(new THREE.ConeGeometry(16, 20, 12, 1, true), M(0xF6EDE2), x, 176, -D / 2 + 44, I); mesh(geo('lampb', () => new THREE.SphereGeometry(8, 10, 8)), glowM(0xFFD48A), x, 172, -D / 2 + 44, I); }
  if (th.lamp === 'line') for (const x of LX) { box(90, 6, 8, 0xC8D0D6, x, 196, -D / 2 + 20, I); mesh(new THREE.BoxGeometry(84, 3, 2), glowM(0xEAF4FF), x, 196, -D / 2 + 25, I); }
  if (th.lamp === 'string') { const n = 22; for (let i = 0; i <= n; i++) { const x = -W / 2 + 40 + i * (W - 80) / n, sag = Math.sin((i % 6) / 6 * Math.PI) * 14; mesh(geo('bulb', () => new THREE.SphereGeometry(5, 8, 6)), glowM(i % 3 ? 0xFFE3A0 : 0xFFC46A), x, 212 - sag, -D / 2 + 22, I); }
    box(W - 80, 1.5, 1.5, 0x3A2A1A, 0, 214, -D / 2 + 20, I); }
  // 3호점 네온 m
  if (th.neon) { const t = canvasTex(256, 96, (x, w, h) => { x.clearRect(0, 0, w, h); x.font = '700 64px "Pretendard", sans-serif'; x.textAlign = 'center'; x.shadowColor = '#FF6720'; x.shadowBlur = 18; x.fillStyle = '#FFB27A'; x.fillText('marumi', w / 2, 66); x.shadowBlur = 6; x.fillStyle = '#FFF2E8'; x.fillText('marumi', w / 2, 66); });
    box(220, 80, 4, 0x2E3236, 590, 132, -D / 2 + 17, I); const n = new THREE.Mesh(new THREE.PlaneGeometry(210, 78), new THREE.MeshBasicMaterial({ map: t, transparent: true })); n.position.set(590, 172, -D / 2 + 20); I.add(n); }
  /* 간판: 공식 로고 (assets/brand/logo.png, 흰 글씨) 를 브랜드 주황 판에 — 틀은 지점마다 */
  const st = document.createElement('canvas'); st.width = 512; st.height = 160; const sx = st.getContext('2d'); sx.fillStyle = BRAND.accent; sx.beginPath(); sx.roundRect(4, 4, 504, 152, th.sign === 'round' ? 70 : th.sign === 'box' ? 10 : 40); sx.fill();
  const tx = new THREE.CanvasTexture(st); tx.colorSpace = THREE.SRGBColorSpace; const lg = new Image(); lg.onload = () => { sx.drawImage(lg, 46, 22, 420, 117); tx.needsUpdate = true; }; lg.src = 'assets/brand/logo.png';
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(470, 147), new THREE.MeshBasicMaterial({ map: tx, transparent: true })); /* 뒤쪽 모서리 꼭대기 간판: 카메라를 정면으로 봄 · 벽 위라 설비·놀이 공간을 가리지 않음 */
  const hd = new THREE.Group(); hd.position.set(-W / 2 + 60, 250, -D / 2 + 60); hd.rotation.y = Math.PI / 4; I.add(hd); sign.position.set(0, 95, 6); hd.add(sign);
  if (th.sign === 'brass') { box(492, 166, 10, 0x6E4C33, 0, 12, 0, hd); for (const [w, h, y] of [[500, 6, 172], [500, 6, 10]]) box(w, h, 12, 0xC9A24A, 0, y, 0, hd); for (const x of [-247, 247]) box(6, 168, 12, 0xC9A24A, x, 10, 0, hd); for (const x of [-150, 150]) box(10, 40, 10, 0xC9A24A, x, -25, 0, hd); }
  else if (th.sign === 'box') { box(496, 170, 26, 0xFAFAF8, 0, 8, -8, hd); mesh(new THREE.BoxGeometry(482, 156, 2), glowM(0xFFF6EE), 0, 93, 4, hd); for (const x of [-150, 150]) box(8, 40, 8, 0xC8D0D6, x, -25, 0, hd); }
  else if (th.sign === 'wood') { for (let k = 0; k < 3; k++) box(500, 54, 12, k % 2 ? 0x8A5E3A : 0x9C6C44, 0, 14 + k * 54, 0, hd); for (const x of [-170, 170]) box(4, 50, 4, 0xD8C8A8, x, -30, 0, hd); }
  else { box(486, 160, 10, 0xFFFCF6, 0, 15, 0, hd); box(490, 6, 12, 0xB07A48, 0, 172, 0, hd); for (const sx of [-150, 150]) box(12, 40, 12, 0xB07A48, sx, -25, 0, hd); }
  /* 벽 사진 액자: 공식 홈페이지 제조 과정 사진 */
  const tl = new THREE.TextureLoader(); const frame = (img, x, y, z, ry, w = 110, h = 130) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; I.add(g);
    mesh(new THREE.BoxGeometry(w + 14, h + 14, 4), M(th.sign === 'brass' ? 0xC9A24A : th.wall === 'vtile' ? 0x2E3236 : 0x5A3A22), 0, 0, 0, g); const t = tl.load(`assets/brand/${img}.jpg`); t.colorSpace = THREE.SRGBColorSpace; const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t })); pic.position.z = 2.5; g.add(pic); };
  frame('dough', -W / 2 + 17, 150, -D / 2 + 520, Math.PI / 2); frame('oven', -W / 2 + 17, 150, -D / 2 + 900, Math.PI / 2); frame('sandwich', -W / 2 + 17, 150, -D / 2 + 1260, Math.PI / 2);
  frame('boil2', -W / 2 + 360, 200, -D / 2 + 17, 0, 90, 90);   /* 데치기 솥 위 */
  outside(O, W, D, th); return { I, O };
}
/* 바깥 (지점 분위기): 앞쪽은 낮게(가게 안을 가리지 않음) · 키 큰 것은 왼쪽 바깥 · 문 길(x 200~600) · 드라이브스루 길(x 950~1200)은 비움 */
function outside(O, W, D, th) { const F = D / 2, L = -W / 2;
  const tree = (x, z, c, h = 200, r = 90) => { cyl(12, 16, h, 0x7A5A3A, x, 0, z, O, 8); sph(r, c, x, h + r * 0.5, z, O, 12, 10); };
  if (th.out === 'walk') { box(1500, 2, 280, 0xE9E5DE, -300, 0, F + 260, O); for (let x = -1000; x < 100; x += 70) box(66, 1, 2, 0xD8D2C8, x, 2, F + 260, O); for (const x of [-900, -620, -340, -60]) { box(200, 46, 40, 0x7FB06A, x, 0, F + 440, O); } tree(L - 320, 200, 0x8FC27A); tree(L - 420, 900, 0x7FB06A, 220, 100); tree(L - 300, -500, 0x8FC27A); }
  if (th.out === 'lake') { const lk = new THREE.Mesh(new THREE.CircleGeometry(520, 40).rotateX(-Math.PI / 2), M(0xA8D4EC)); lk.scale.set(1.5, 1, 0.8); lk.position.set(L - 900, 1, F + 500); O.add(lk); lk.userData.floor = true;
    box(1300, 2, 200, 0xE6DCCB, -350, 0, F + 230, O); for (const [x, z] of [[L - 300, 100], [L - 380, 800], [L - 260, -600], [L - 700, F + 1100]]) tree(x, z, 0xF6C8D4, 210, 100); box(160, 40, 40, 0x8A5E3A, -600, 0, F + 360, O); }
  if (th.out === 'under') { box(1700, 2, 420, 0xD9D6D0, -250, 0, F + 300, O); for (let x = -1050; x < 600; x += 120) box(2, 1, 420, 0xC2BEB6, x, 2, F + 300, O); for (const z of [-500, 300, 1100]) { box(80, 300, 80, 0xD4D2CE, L - 260, 0, z, O); box(84, 26, 84, 0xFF6720, L - 260, 210, z, O); }
    for (let x = -1000; x <= 100; x += 100) box(6, 90, 6, 0xB8C0C6, x, 0, F + 470, O); box(1110, 4, 6, 0xB8C0C6, -450, 88, F + 470, O); mesh(new THREE.BoxGeometry(1100, 80, 3), new THREE.MeshToonMaterial({ color: 0xCFEAF5, transparent: true, opacity: 0.35, depthWrite: false }), -450, 48, F + 470, O); }
  if (th.out === 'park') { /* 0.6.2: 가게 앞 판자 데크를 뺌(걸을 수 있어 보이는데 못 가는 곳) — 잔디만 · 테라스를 사면 그 자리가 걸을 수 있는 바닥 */ for (const [x, z, h] of [[L - 300, 100, 220], [L - 420, 800, 260], [L - 280, -600, 240], [L - 700, F + 900, 230]]) tree(x, z, 0x7FB06A, h, 110);
    for (let k = 0; k < 4; k++) { const tq = mesh(new THREE.TorusGeometry(26, 3, 6, 12, Math.PI), M(0x4A5058), -560 + k * 50, 0, F + 520, O); } box(240, 2, 30, 0x4A5058, -485, 0, F + 520, O); }
}
// ── 설비 (위치는 group 기준 · 받는 곳/내놓는 곳 좌표는 game.js 에서)
export const STATION = {
  oven(p) { box(200, 170, 140, 0xC0583A, 0, 0, 0, p); box(210, 16, 150, 0x8A3A26, 0, 170, 0, p); mesh(new THREE.BoxGeometry(120, 60, 4), new THREE.MeshBasicMaterial({ color: 0xFFB24A }), 0, 90, 72, p); box(30, 80, 30, 0x8A3A26, 60, 186, -30, p); box(180, 10, 60, 0x9A643A, 0, 0, 100, p); },
  counter(p) { box(320, 100, 110, 0xF7F0E6, 0, 0, 0, p); box(330, 14, 120, 0x9A643A, 0, 100, 0, p); box(70, 50, 50, 0x4A4A55, 110, 114, -10, p);
 },
  ccbar(p) { box(220, 95, 110, 0xFFFFFF, 0, 0, 0, p); box(230, 12, 120, 0x9A643A, 0, 95, 0, p); [0xFFFBF2, 0xF6D6E8, 0xE6F2C8, 0xFFE9B8].forEach((c, i) => cyl(18, 18, 22, c, -75 + i * 50, 107, -20, p)); },
  coffee(p) { box(130, 150, 100, 0xF4F7F8, 0, 0, 0, p); box(140, 12, 110, 0xC8D2D8, 0, 150, 0, p); box(110, 80, 6, 0xBFE3F2, 0, 50, 50, p); for (let i = 0; i < 3; i++) cyl(10, 9, 16, 0xFFFBF2, -30 + i * 30, 70, 46, p, 10); },   /* 크림치즈 냉장고 */
  table(p, th = {}) { const st = th.table || 'round', seat = (f) => { for (const a of [0, Math.PI]) { const c = new THREE.Group(); c.position.set(Math.cos(a) * 95, 0, 0); c.rotation.y = a; c.userData.seat = 1; p.add(c); f(c); } };   /* 자리 · 의자 x ±95 는 모든 지점 같음 (손님이 앉는 자리 · 충돌 그대로) */
    if (st === 'square') { box(150, 10, 116, 0x7A5236, 0, 76, 0, p); box(12, 76, 12, 0x5A3A22, 0, 0, 0, p); box(80, 6, 60, 0x5A3A22, 0, 0, 0, p); seat(c => { box(56, 8, 56, 0x7A5236, 0, 42, 0, c); box(8, 44, 50, 0x7A5236, 26, 46, 0, c); for (const [x, z] of [[-22, -22], [-22, 22], [22, -22], [22, 22]]) box(5, 42, 5, 0x5A3A22, x, 0, z, c); }); }
    else if (st === 'white') { cyl(70, 70, 8, 0xFAFAF8, 0, 78, 0, p, 28); cyl(4, 4, 78, 0x4A5058, 0, 0, 0, p, 8); cyl(28, 28, 3, 0x4A5058, 0, 0, 0, p, 16); seat(c => { const sh = sph(28, 0xBFDDD2, 0, 50, 0, c, 14, 10); sh.scale.set(1, 0.42, 1); box(6, 34, 46, 0xBFDDD2, 22, 50, 0, c); for (const [x, z] of [[-16, -16], [-16, 16], [16, -16], [16, 16]]) cyl(2, 2, 44, 0x4A5058, x, 0, z, c, 6); });   /* 민트 의자 · 짙은 다리 (흰 바닥에 묻히지 않게) */ }
    else if (st === 'picnic') { box(150, 8, 110, 0xB98A5A, 0, 74, 0, p); for (let k = -2; k <= 2; k++) box(150, 1, 2, 0x9C6C44, 0, 82, k * 22, p); for (const x of [-56, 56]) { const l = box(8, 82, 90, 0x8A5E3A, x, 0, 0, p); } seat(c => { box(34, 8, 120, 0xB98A5A, 0, 38, 0, c); for (const z of [-46, 46]) box(26, 38, 6, 0x8A5E3A, 0, 0, z, c); }); }
    else { cyl(70, 70, 10, 0xEBCFA6, 0, 78, 0, p, 24); cyl(10, 16, 78, 0x9A643A, 0, 0, 0, p, 10); seat(c => { cyl(30, 30, 10, 0xD2A86E, 0, 40, 0, c); cyl(6, 6, 40, 0x9A643A, 0, 0, 0, c, 8); const b = mesh(new THREE.TorusGeometry(24, 4, 6, 16, Math.PI), M(0xC9A06A), 26, 64, 0, c); b.rotation.y = Math.PI / 2; }); } },
  bin(p) { cyl(34, 30, 80, 0x5A8A5A, 0, 0, 0, p); cyl(36, 36, 8, 0x3A6A3A, 0, 80, 0, p); },
  drive(p) { box(30, 230, 320, 0xEFD9BC, 0, 0, 0, p); box(10, 110, 280, 0xBFE3F2, 18, 80, 0, p); box(110, 14, 300, 0x9A643A, 70, 95, 0, p); for (const z of [-140, 140]) box(16, 95, 16, 0x7A4A2A, 115, 0, z, p); for (const z of [-70, 0, 70]) box(100, 3, 4, 0xFFFFFF, 70, 109, z, p); },   /* 창구 + 메뉴별 4줄 판매대 */
  espresso(p) { box(130, 95, 100, 0x5A3A22, 0, 0, 0, p); box(140, 12, 110, 0x9A643A, 0, 95, 0, p); box(90, 70, 70, 0xC8CED4, 0, 107, -10, p); box(60, 14, 20, 0x2A2A30, 0, 140, 30, p); cyl(6, 6, 18, 0x2A2A30, -18, 120, 32, p, 8); cyl(6, 6, 18, 0x2A2A30, 18, 120, 32, p, 8); },   /* 커피 머신 */
  mixer(p) { box(110, 60, 90, 0x9AA4AC, 0, 0, 0, p); cyl(14, 14, 90, 0x9AA4AC, -30, 60, -20, p, 10); box(110, 26, 40, 0x9AA4AC, -10, 140, -20, p); cyl(44, 36, 54, 0xD8DEE2, 10, 60, 10, p, 18); sph(36, 0xFFF6E6, 10, 112, 10, p, 14, 10).scale.set(1, 0.55, 1); cyl(4, 4, 50, 0x7A848C, 10, 96, 10, p, 6); },   /* 반죽기 */
  kettle(p) { box(130, 80, 110, 0x6A707A, 0, 0, 0, p); cyl(52, 48, 50, 0xC8CED4, 0, 80, 0, p, 20); cyl(46, 46, 4, 0x9ACFE8, 0, 124, 0, p, 20); for (let i = 0; i < 4; i++) mesh(geo('torus', () => new THREE.TorusGeometry(15, 7.5, 8, 18).rotateX(Math.PI / 2)), M(0xE8C08A), -18 + (i % 2) * 36, 128, -14 + Math.floor(i / 2) * 28, p); },   /* 데치기 솥 */
  plant(p) { cyl(34, 26, 60, 0xE7B98A, 0, 0, 0, p, 12); sph(55, 0x7FBF6A, 0, 110, 0, p, 12, 10).scale.set(1, 1.2, 1); },
  desk(p) { box(160, 80, 80, 0x9A643A, 0, 0, 0, p); box(170, 10, 90, 0xC08A5A, 0, 80, 0, p); box(40, 30, 6, 0x4A4A55, 0, 90, -20, p); },
};
// 브랜드 로고 판: 주황 바탕 + 공식 로고(흰 글씨) · 이미지가 늦게 와도 다시 그림
const LOGO = (() => { const im = new Image(); im.src = 'assets/brand/logo.png'; return im; })();
export function logoPanel(w, h) { const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const x = c.getContext('2d'), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const draw = () => { x.clearRect(0, 0, c.width, c.height); x.fillStyle = BRAND.accent; x.beginPath(); x.roundRect(0, 0, c.width, c.height, c.height * 0.22); x.fill(); if (LOGO.complete && LOGO.naturalWidth) { const r = Math.min(c.width * 0.86 / LOGO.naturalWidth, c.height * 0.74 / LOGO.naturalHeight), lw = LOGO.naturalWidth * r, lh = LOGO.naturalHeight * r; x.drawImage(LOGO, (c.width - lw) / 2, (c.height - lh) / 2, lw, lh); } t.needsUpdate = true; };
  draw(); if (!LOGO.complete) LOGO.addEventListener('load', draw, { once: true });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true })); }
// 자동차 (드라이브스루)
export function car(col) { const g = new THREE.Group(); box(200, 60, 110, col, 0, 20, 0, g); box(120, 50, 100, col, -10, 80, 0, g); box(110, 40, 102, 0xBFE3F2, -10, 84, 0, g).scale.set(1, 1, 1.01);
  for (const [x, z] of [[60, 55], [-60, 55], [60, -55], [-60, -55]]) mesh(geo('wheel', () => new THREE.CylinderGeometry(22, 22, 16, 14).rotateX(Math.PI / 2)), M(0x2A2A30), x, 22, z, g); return g; }
// ── 꾸미기 소품 (설비와 같은 3단 음영 · 브랜드 주황/브라운)
const WOOD = 0x9A643A, LIGHT = 0xC08A5A, LEAF = 0x7FBF6A, LEAF2 = 0x5FA85A, POT = 0xE7B98A;
export const DECO_MODEL = {
  monstera(p) { cyl(40, 30, 60, POT, 0, 0, 0, p, 14); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28, l = sph(34, i % 2 ? LEAF : LEAF2, Math.cos(a) * 34, 90 + (i % 3) * 22, Math.sin(a) * 34, p, 10, 8); l.scale.set(1, 0.35, 0.7); l.rotation.y = -a; l.rotation.z = 0.5; } cyl(4, 4, 70, 0x5A8A3A, 0, 50, 0, p, 6); },
  rug(p) { cyl(330, 330, 3, 0xD8B48A, 0, 0, 0, p, 40).scale.set(1, 1, 0.68); cyl(300, 300, 4, 0xE6C9A2, 0, 0, 0, p, 40).scale.set(1, 1, 0.66); cyl(250, 250, 5, 0xD8B48A, 0, 0, 0, p, 40).scale.set(1, 1, 0.64); },
  bench(p) { box(80, 40, 260, WOOD, 0, 0, 0, p); box(84, 6, 264, LIGHT, 0, 40, 0, p); for (const z of [-95, 25, 95]) { cyl(14, 11, 22, POT, 0, 46, z, p, 10); sph(17, z > 0 ? LEAF : LEAF2, 0, 78, z, p, 10, 8); } for (let i = 0; i < 3; i++) box(26, 7, 34, [0xE86A4A, 0x5A8AE0, 0xF2C14E][i], 4, 46 + i * 7, -30, p); },   /* 0.6.2: 창가 화분 벤치 — 앉을 것처럼 보이던 쿠션을 화분 · 책으로 (아무도 안 앉는 자리는 앉을 자리로 보이지 않게 · 보이는 자리는 갈 수 있다) */
  lamp(p) { cyl(26, 30, 8, 0x4A4A55, 0, 0, 0, p, 14); cyl(4, 4, 170, 0x4A4A55, 0, 8, 0, p, 6); cyl(22, 38, 40, 0xFFE9C2, 0, 170, 0, p, 16); const l = new THREE.PointLight(0xFFC77A, 6000, 420, 2); l.position.set(0, 175, 0); p.add(l); },
  shelf(p) { for (const y of [150, 205]) { box(220, 8, 40, WOOD, 0, y, 20, p); for (let i = 0; i < 5; i++) { const b = mesh(geo('torus', () => new THREE.TorusGeometry(15, 7.5, 8, 18).rotateX(Math.PI / 2)), M(i % 2 ? 0xCF8A2E : 0xE2A55A), -80 + i * 40, y + 15, 22, p); b.rotation.x = Math.PI / 2.3; } } },
  board(p) { box(90, 130, 8, 0x2A3A32, 0, 30, 0, p); box(100, 8, 14, LIGHT, 0, 160, 0, p); box(8, 160, 8, LIGHT, -40, 0, -20, p); box(8, 160, 8, LIGHT, 40, 0, -20, p); for (let i = 0; i < 4; i++) box(60 - i * 8, 4, 2, 0xFFFFFF, 0, 130 - i * 22, 5, p); box(20, 14, 2, BRAND.accentHex, 26, 60, 5, p); },
  gallery(p) { [[-70, 170, 80, 100], [40, 190, 100, 70], [30, 120, 60, 50]].forEach(([z, y, w, h], i) => { box(6, h + 10, w + 10, WOOD, 0, y - h / 2 - 5, z, p); box(8, h, w, [0xBFE3F2, 0xF6D6A0, 0xE6F2C8][i], 2, y - h / 2, z, p); }); },
  vase(p) { cyl(8, 10, 22, 0xFFFFFF, 0, 0, 0, p, 10); for (let i = 0; i < 3; i++) sph(7, [0xFF8A9A, 0xFFD24A, 0xFF7A59][i], -6 + i * 6, 30 + (i % 2) * 6, 0, p, 8, 6); },
  plants2(p) { for (const [y, w] of [[0, 120], [60, 100], [120, 80]]) box(w, 8, 50, WOOD, 0, y + 50, 0, p); for (const x of [-48, 48]) box(8, 180, 8, WOOD, x, 0, -20, p); [[-30, 58], [30, 58], [-20, 118], [25, 118], [0, 178]].forEach(([x, y], i) => { cyl(14, 11, 20, POT, x, y, 0, p, 10); sph(18, i % 2 ? LEAF : LEAF2, x, y + 32, 0, p, 10, 8); }); },
  terrace(p) { for (const x of [-170, 170]) { cyl(70, 70, 8, 0xFFFFFF, x, 70, 0, p, 20); cyl(8, 12, 70, WOOD, x, 0, 0, p, 8); cyl(4, 4, 200, 0xE8E0D0, x, 70, 0, p, 6); const u = mesh(new THREE.ConeGeometry(130, 50, 12), M(x < 0 ? BRAND.accentHex : 0xFFFFFF), x, 285, 0, p); u.castShadow = true; for (const s of [-1, 1]) { const st = cyl(24, 24, 10, LIGHT, x + s * 95, 40, 0, p); st.userData.seat = 1; cyl(5, 5, 40, WOOD, x + s * 95, 0, 0, p, 6); } } const fl = box(560, 4, 200, 0xE6D2B4, 0, 0, 0, p); fl.userData.walk = 1; },   /* 0.6.2: 손님 자리(의자) · 걸을 수 있는 바닥 표시 (game.js terraceSync · gate_reach W5) */
  photo(p) { for (let i = 0; i < 6; i++) { const z = -120 + (i % 3) * 110, y = 200 - Math.floor(i / 3) * 90; box(6, 76, 90, 0xFFFFFF, 0, y - 38, z, p); box(8, 60, 74, [0xF6D6A0, 0xBFE3F2, 0xE6F2C8, 0xF6D6E8, 0xFFE9B8, 0xD8E8C8][i], 2, y - 30, z, p); } box(6, 14, 100, BRAND.accentHex, 0, 230, 0, p); },
};

// ── 사장님 발밑 표시: 브랜드 주황 고리 (어디 있는지 한눈에)
export function ownerRing() { const g = new THREE.Group(); const r = new THREE.Mesh(new THREE.RingGeometry(40, 52, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: BRAND.accentHex, transparent: true, opacity: 0.85, depthWrite: false }));
  r.position.y = 3; g.add(r); const d = new THREE.Mesh(new THREE.CircleGeometry(40, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: BRAND.accentHex, transparent: true, opacity: 0.18, depthWrite: false })); d.position.y = 2.5; g.add(d); g.userData.ring = r; return g; }
// ── 미리보기(반투명 그림자): 모델을 통째로 반투명 단색으로 · ok=false 면 빨강
export function ghostify(g, ok = true) { const col = ok ? 0x5FCB6A : 0xE8504A; g.traverse(o => { if (o.isMesh) { o.material = (ok ? GH.ok : GH.no); o.castShadow = false; } if (o.isLight) o.visible = false; }); return g; }
const GH = { ok: new THREE.MeshBasicMaterial({ color: 0x6FD07A, transparent: true, opacity: 0.45, depthWrite: false }), no: new THREE.MeshBasicMaterial({ color: 0xE8504A, transparent: true, opacity: 0.45, depthWrite: false }) };
