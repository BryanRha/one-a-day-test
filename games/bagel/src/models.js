// 모델을 코드로 직접 만듦: 낮은 다각형 + 만화풍 3단 음영 (사람 · 베이글 · 커피 · 설비 · 가게)
import * as THREE from 'three';
import { BRAND } from './data.js?v=0.91.6';

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
  if (o.apron) mesh(geo('papron', () => new THREE.CapsuleGeometry(31, 20, 6, 12)), M(0xFFFFFF), 0, 54, 4, body).scale.set(0.96, 1, 0.92);
  sph(32, 0xFFDDBF, 0, 128, 0, body, 18, 14);
  mesh(geo('phair', () => new THREE.SphereGeometry(33, 18, 14, 0, 6.28, 0, 1.4)), M(o.hair || 0x5A3A22), 0, 132, -2, body);
  if (o.cap) { cyl(30, 32, 22, o.cap, 0, 150, 0, body); cyl(22, 22, 4, o.cap, 0, 150, 24, body); }
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
// ── 가게 바닥 · 벽 · 창 · 간판
export function shopShell(sc, W, D, theme) {
  const ft = document.createElement('canvas'); ft.width = ft.height = 128; const fx = ft.getContext('2d'); fx.fillStyle = theme.floorA; fx.fillRect(0, 0, 128, 128); fx.fillStyle = theme.floorB; fx.fillRect(0, 0, 64, 64); fx.fillRect(64, 64, 64, 64);
  const t = new THREE.CanvasTexture(ft); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(W / 140, D / 140); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  const f = mesh(new THREE.BoxGeometry(W, 20, D), new THREE.MeshToonMaterial({ map: t, gradientMap: gm }), 0, -10, 0, sc); f.castShadow = false;
  const out = mesh(new THREE.BoxGeometry(W + 12000, 10, D + 12000), M(theme.outside), 0, -16, 0, sc); out.castShadow = false;
  box(W, 230, 30, theme.wallA, 0, 0, -D / 2, sc); box(30, 230, D, theme.wallB, -W / 2, 0, 0, sc); box(W + 4, 24, 36, theme.trim, 0, 230, -D / 2, sc); box(36, 24, D + 4, theme.trim, -W / 2, 230, 0, sc);
  for (let x = -W / 2 + 260; x < W / 2 - 150; x += 380) { box(220, 120, 8, 0xBFE3F2, x, 70, -D / 2 + 16, sc); box(230, 10, 14, 0xFFFFFF, x, 60, -D / 2 + 18, sc); }
  for (let z = -D / 2 + 300; z < D / 2 - 200; z += 420) { box(8, 120, 200, 0xBFE3F2, -W / 2 + 16, 70, z, sc); }
  /* 간판: 공식 로고 (assets/brand/logo.png, 흰 글씨) 를 브랜드 주황 판에 */
  const st = document.createElement('canvas'); st.width = 512; st.height = 160; const sx = st.getContext('2d'); sx.fillStyle = BRAND.accent; sx.beginPath(); sx.roundRect(4, 4, 504, 152, 40); sx.fill();
  const tx = new THREE.CanvasTexture(st); tx.colorSpace = THREE.SRGBColorSpace; const lg = new Image(); lg.onload = () => { sx.drawImage(lg, 46, 22, 420, 117); tx.needsUpdate = true; }; lg.src = 'assets/brand/logo.png';
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(470, 147), new THREE.MeshBasicMaterial({ map: tx, transparent: true })); /* 뒤쪽 모서리 꼭대기 간판: 카메라를 정면으로 봄 · 벽 위라 설비·놀이 공간을 가리지 않음 */
  const hd = new THREE.Group(); hd.position.set(-W / 2 + 60, 250, -D / 2 + 60); hd.rotation.y = Math.PI / 4; sc.add(hd); sign.position.set(0, 95, 6); hd.add(sign); box(486, 160, 10, 0x5A3A22, 0, 15, 0, hd); for (const sx of [-150, 150]) box(12, 40, 12, 0x5A3A22, sx, -25, 0, hd);
  /* 벽 사진 액자: 공식 홈페이지 제조 과정 사진 */
  const tl = new THREE.TextureLoader(); const frame = (img, x, y, z, ry, w = 110, h = 130) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; sc.add(g);
    mesh(new THREE.BoxGeometry(w + 14, h + 14, 4), M(0x5A3A22), 0, 0, 0, g); const t = tl.load(`assets/brand/${img}.jpg`); t.colorSpace = THREE.SRGBColorSpace; const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t })); pic.position.z = 2.5; g.add(pic); };
  frame('dough', -W / 2 + 17, 150, -D / 2 + 520, Math.PI / 2); frame('oven', -W / 2 + 17, 150, -D / 2 + 900, Math.PI / 2); frame('sandwich', -W / 2 + 17, 150, -D / 2 + 1260, Math.PI / 2);
  frame('boil2', -W / 2 + 360, 200, -D / 2 + 17, 0, 90, 90);   /* 데치기 솥 위 */
}
// ── 설비 (위치는 group 기준 · 받는 곳/내놓는 곳 좌표는 game.js 에서)
export const STATION = {
  oven(p) { box(200, 170, 140, 0xC0583A, 0, 0, 0, p); box(210, 16, 150, 0x8A3A26, 0, 170, 0, p); mesh(new THREE.BoxGeometry(120, 60, 4), new THREE.MeshBasicMaterial({ color: 0xFFB24A }), 0, 90, 72, p); box(30, 80, 30, 0x8A3A26, 60, 186, -30, p); box(180, 10, 60, 0x9A643A, 0, 0, 100, p); },
  counter(p) { box(320, 100, 110, 0xF7F0E6, 0, 0, 0, p); box(330, 14, 120, 0x9A643A, 0, 100, 0, p); box(70, 50, 50, 0x4A4A55, 110, 114, -10, p);
 },
  ccbar(p) { box(220, 95, 110, 0xFFFFFF, 0, 0, 0, p); box(230, 12, 120, 0x9A643A, 0, 95, 0, p); [0xFFFBF2, 0xF6D6E8, 0xE6F2C8, 0xFFE9B8].forEach((c, i) => cyl(18, 18, 22, c, -75 + i * 50, 107, -20, p)); },
  coffee(p) { box(130, 150, 100, 0xF4F7F8, 0, 0, 0, p); box(140, 12, 110, 0xC8D2D8, 0, 150, 0, p); box(110, 80, 6, 0xBFE3F2, 0, 50, 50, p); for (let i = 0; i < 3; i++) cyl(10, 9, 16, 0xFFFBF2, -30 + i * 30, 70, 46, p, 10); },   /* 크림치즈 냉장고 */
  table(p) { cyl(70, 70, 10, 0xFFFFFF, 0, 78, 0, p, 24); cyl(10, 16, 78, 0x9A643A, 0, 0, 0, p, 10);
    for (const a of [0, Math.PI]) { const c = new THREE.Group(); c.position.set(Math.cos(a) * 95, 0, Math.sin(a) * 95); p.add(c); cyl(30, 30, 10, BRAND.accentHex, 0, 40, 0, c); cyl(6, 6, 40, 0x9A643A, 0, 0, 0, c, 8); } },
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
  bench(p) { box(80, 40, 260, WOOD, 0, 0, 0, p); box(70, 16, 250, 0xF2E2C8, 0, 40, 0, p); box(14, 60, 260, WOOD, -36, 40, 0, p); for (const z of [-80, 0, 80]) { const c = box(18, 44, 50, [0xFF8A50, 0xF2C14E, 0xE8E0D0][(z + 80) / 80], -20, 56, z, p); c.rotation.z = -0.2; } },
  lamp(p) { cyl(26, 30, 8, 0x4A4A55, 0, 0, 0, p, 14); cyl(4, 4, 170, 0x4A4A55, 0, 8, 0, p, 6); cyl(22, 38, 40, 0xFFE9C2, 0, 170, 0, p, 16); const l = new THREE.PointLight(0xFFC77A, 6000, 420, 2); l.position.set(0, 175, 0); p.add(l); },
  shelf(p) { for (const y of [150, 205]) { box(220, 8, 40, WOOD, 0, y, 20, p); for (let i = 0; i < 5; i++) { const b = mesh(geo('torus', () => new THREE.TorusGeometry(15, 7.5, 8, 18).rotateX(Math.PI / 2)), M(i % 2 ? 0xCF8A2E : 0xE2A55A), -80 + i * 40, y + 15, 22, p); b.rotation.x = Math.PI / 2.3; } } },
  board(p) { box(90, 130, 8, 0x2A3A32, 0, 30, 0, p); box(100, 8, 14, LIGHT, 0, 160, 0, p); box(8, 160, 8, LIGHT, -40, 0, -20, p); box(8, 160, 8, LIGHT, 40, 0, -20, p); for (let i = 0; i < 4; i++) box(60 - i * 8, 4, 2, 0xFFFFFF, 0, 130 - i * 22, 5, p); box(20, 14, 2, BRAND.accentHex, 26, 60, 5, p); },
  gallery(p) { [[-70, 170, 80, 100], [40, 190, 100, 70], [30, 120, 60, 50]].forEach(([z, y, w, h], i) => { box(6, h + 10, w + 10, WOOD, 0, y - h / 2 - 5, z, p); box(8, h, w, [0xBFE3F2, 0xF6D6A0, 0xE6F2C8][i], 2, y - h / 2, z, p); }); },
  vase(p) { cyl(8, 10, 22, 0xFFFFFF, 0, 0, 0, p, 10); for (let i = 0; i < 3; i++) sph(7, [0xFF8A9A, 0xFFD24A, 0xFF7A59][i], -6 + i * 6, 30 + (i % 2) * 6, 0, p, 8, 6); },
  plants2(p) { for (const [y, w] of [[0, 120], [60, 100], [120, 80]]) box(w, 8, 50, WOOD, 0, y + 50, 0, p); for (const x of [-48, 48]) box(8, 180, 8, WOOD, x, 0, -20, p); [[-30, 58], [30, 58], [-20, 118], [25, 118], [0, 178]].forEach(([x, y], i) => { cyl(14, 11, 20, POT, x, y, 0, p, 10); sph(18, i % 2 ? LEAF : LEAF2, x, y + 32, 0, p, 10, 8); }); },
  terrace(p) { for (const x of [-170, 170]) { cyl(70, 70, 8, 0xFFFFFF, x, 70, 0, p, 20); cyl(8, 12, 70, WOOD, x, 0, 0, p, 8); cyl(4, 4, 200, 0xE8E0D0, x, 70, 0, p, 6); const u = mesh(new THREE.ConeGeometry(130, 50, 12), M(x < 0 ? BRAND.accentHex : 0xFFFFFF), x, 285, 0, p); u.castShadow = true; for (const s of [-1, 1]) cyl(24, 24, 10, LIGHT, x + s * 95, 40, 0, p); } box(560, 4, 200, 0xE6D2B4, 0, 0, 0, p); },
  photo(p) { for (let i = 0; i < 6; i++) { const z = -120 + (i % 3) * 110, y = 200 - Math.floor(i / 3) * 90; box(6, 76, 90, 0xFFFFFF, 0, y - 38, z, p); box(8, 60, 74, [0xF6D6A0, 0xBFE3F2, 0xE6F2C8, 0xF6D6E8, 0xFFE9B8, 0xD8E8C8][i], 2, y - 30, z, p); } box(6, 14, 100, BRAND.accentHex, 0, 230, 0, p); },
};
