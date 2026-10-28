// 모델을 코드로 직접 만듦: 낮은 다각형 + 만화풍 3단 음영 (마루미 베이글과 같은 결)
//   감성커피 공간: 나무 · 돌 · 베이지 회벽 · 리넨 · 한글 서예 · 따뜻한 빛
import * as THREE from 'three';
import { BRAND, MENU } from './data.js?v=0.86.0';

const gm = (() => { const d = new Uint8Array([95, 185, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const mats = {};
export const M = c => mats[c] ||= new THREE.MeshToonMaterial({ color: c, gradientMap: gm });
export function mesh(g, m, x = 0, y = 0, z = 0, p) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; if (p) p.add(o); return o; }
const G = {}; const geo = (k, f) => G[k] ||= f();
export const box = (w, h, d, c, x, y, z, p) => mesh(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), M(c), x, y + h / 2, z, p);
export const cyl = (rt, rb, h, c, x, y, z, p, s = 16) => mesh(geo(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s)), M(c), x, y + h / 2, z, p);
export const sph = (r, c, x, y, z, p, ws = 14, hs = 10) => mesh(geo(`s${r},${ws}`, () => new THREE.SphereGeometry(r, ws, hs)), M(c), x, y, z, p);
const cvTex = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), c); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
export const C = { wood: 0xA67A50, woodD: 0x7A5234, woodL: 0xC8A27A, wall: 0xEDE3D3, wallB: 0xE4D8C6, linen: 0xF4EEE4, stone: 0xA9A39A, stoneD: 0x8A857C, leaf: 0x6E8F5A, leaf2: 0x87A86E, pot: 0xE6DCCB, ink: 0x3B2A20, red: BRAND.redHex };

// ── 사람 (마루미 베이글과 같은 몸) · sit = 앉은 자세
export function person(o = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  mesh(geo('pbody', () => new THREE.CapsuleGeometry(30, 34, 6, 12)), M(o.body || 0xD9CBB5), 0, 62, 0, body);
  if (o.apron) mesh(geo('papron', () => new THREE.CapsuleGeometry(31, 20, 6, 12)), M(o.apron), 0, 54, 4, body).scale.set(0.96, 1, 0.92);
  sph(32, 0xFFDDBF, 0, 128, 0, body, 18, 14);
  mesh(geo('phair', () => new THREE.SphereGeometry(33, 18, 14, 0, 6.28, 0, 1.4)), M(o.hair || 0x3A2A1E), 0, 132, -2, body);
  if (o.bun) sph(14, o.hair || 0x3A2A1E, 0, 166, -14, body, 10, 8);
  if (o.glasses) for (const s of [-1, 1]) mesh(geo('glass', () => new THREE.TorusGeometry(7, 1.5, 6, 14)), M(0x2A1A10), s * 12, 130, 31, body);
  for (const s of [-1, 1]) { sph(4, 0x2A1A10, s * 11, 130, 29, body, 8, 6); sph(5, 0xFFB3A0, s * 20, 120, 24, body, 8, 6); }
  const legs = [-1, 1].map(s => { const L = new THREE.Group(); L.position.set(s * 14, 26, 0); g.add(L); mesh(geo('pleg', () => new THREE.CapsuleGeometry(10, 12, 4, 8)), M(o.pants || 0x5A4A3A), 0, -12, 0, L); return L; });
  const arms = [-1, 1].map(s => { const A = new THREE.Group(); A.position.set(s * 31, 88, 0); body.add(A); mesh(geo('parm', () => new THREE.CapsuleGeometry(8, 20, 4, 8)), M(o.body || 0xD9CBB5), 0, -16, 0, A); return A; });
  const hand = new THREE.Group(); hand.position.set(0, 80, 32); body.add(hand);
  const P = { g, body, legs, arms, hand, t: Math.random() * 6, sit: false };
  P.anim = (dt, moving) => { P.t += dt * (moving ? 11 : 2); const s = moving ? Math.sin(P.t) : 0;
    if (P.sit) { for (const L of legs) L.rotation.x = -1.45; body.position.y = -26 + Math.sin(P.t) * 0.8; } else { legs[0].rotation.x = s * 0.7; legs[1].rotation.x = -s * 0.7; body.position.y = moving ? Math.abs(Math.cos(P.t)) * 4 : Math.sin(P.t) * 1.2; }
    for (let i = 0; i < 2; i++) arms[i].rotation.x = hand.children.length ? -1.15 : (i ? s : -s) * 0.6; };
  return P;
}

// ── 잔 · 디저트 (메뉴마다 층과 색)
const glass = (g, h = 34, r = 13) => { const m = new THREE.MeshToonMaterial({ color: 0xF4FAFC, gradientMap: gm, transparent: true, opacity: 0.45 }); mesh(geo(`gl${h}`, () => new THREE.CylinderGeometry(r, r * 0.82, h, 14)), m, 0, h / 2, 0, g); };
const layer = (g, c, y0, h, r = 12) => cyl(r, r * 0.84, h, c, 0, y0, 0, g, 14);
const mug = (g, c = 0xF2EBE0) => { cyl(14, 12, 24, c, 0, 0, 0, g, 14); mesh(geo('handle', () => new THREE.TorusGeometry(6, 2.2, 6, 10)), M(c), 15, 13, 0, g).rotation.y = Math.PI / 2; cyl(22, 22, 3, c, 0, 0, 0, g, 16); };
export function cup(look) {
  const g = new THREE.Group();
  if (look === 'americano') { glass(g); layer(g, 0x3A1E10, 2, 26); for (let i = 0; i < 3; i++) box(6, 6, 6, 0xE8F4F8, -4 + i * 4, 24, (i % 2) * 4, g); }
  else if (look === 'latte') { mug(g); cyl(12.5, 12.5, 2, 0xD8B48A, 0, 22, 0, g, 14); sph(4, 0xFFF6E8, 0, 24, 2, g, 8, 6).scale.set(1, 0.3, 1.4); }
  else if (look === 'vanilla') { glass(g); layer(g, 0xF6E6C8, 2, 14); layer(g, 0xC89A6A, 16, 12); cyl(12, 12, 3, 0xFFFBF2, 0, 28, 0, g, 14); }
  else if (look === 'coldbrew') { glass(g, 40, 11); layer(g, 0x2A140A, 2, 32, 10); cyl(1.4, 1.4, 22, C.red, 4, 32, 0, g, 6); }
  else if (look === 'mygamsung') { mug(g, 0xF6F0E6); cyl(12.5, 12.5, 2, 0xC88A5A, 0, 22, 0, g, 14); const h = sph(5, 0xFFF4E2, 0, 24, 0, g, 8, 6); h.scale.set(1.4, 0.3, 1.1); sph(3, 0xFFF4E2, 4, 24, -4, g, 6, 4).scale.set(1, 0.3, 1); }
  else if (look === 'dawn') { glass(g); layer(g, 0x9CB878, 2, 15); layer(g, 0x8A5A38, 17, 9); cyl(12, 12, 4, 0xF6F0E2, 0, 26, 0, g, 14); sph(2.5, 0x4E7A3A, 3, 31, 0, g, 6, 4); }
  else if (look === 'jeju') { glass(g); layer(g, 0x4A7AC8, 2, 13); layer(g, 0xD8E6F2, 15, 4); layer(g, 0x6A3A1E, 19, 8); cyl(12, 12, 4, 0xFFFFFF, 0, 27, 0, g, 14); }
  else if (look === 'berry') { const m = new THREE.MeshToonMaterial({ color: 0xF4FAFC, gradientMap: gm, transparent: true, opacity: 0.45 }); mesh(geo('goblet', () => new THREE.CylinderGeometry(15, 9, 26, 14)), m, 0, 26, 0, g); cyl(2, 2, 12, 0xE8F2F6, 0, 0, 0, g, 6); cyl(9, 9, 2, 0xE8F2F6, 0, 0, 0, g, 12); layer(g, 0xB0283A, 14, 10, 10); layer(g, 0xFFF4EC, 24, 12, 13); sph(4, 0xD8203A, 0, 40, 0, g, 8, 6); }
  else if (look === 'tea') { mug(g, 0xFFFFFF); cyl(12.5, 12.5, 2, 0xD9A066, 0, 22, 0, g, 14); const pot = new THREE.Group(); pot.position.set(-28, 0, -8); g.add(pot); sph(14, 0xF6F0E6, 0, 14, 0, pot, 12, 8).scale.set(1, 0.85, 1); cyl(3, 4, 12, 0xF6F0E6, 14, 12, 0, pot, 6).rotation.z = -0.9; }
  else if (look === 'croffle') { cyl(22, 22, 3, 0xFFFFFF, 0, 0, 0, g, 16); for (let i = 0; i < 2; i++) { const w = box(26, 7, 20, 0xD8963A, i * 8 - 4, 3 + i * 7, i * 4 - 2, g); w.rotation.y = i * 0.4; } sph(5, 0xFFFBF2, 2, 21, 0, g, 8, 6); }
  else if (look === 'basque') { cyl(22, 22, 3, 0xFFFFFF, 0, 0, 0, g, 16); const w = mesh(geo('wedge', () => new THREE.CylinderGeometry(20, 20, 18, 3, 1, false, 0, 1.2)), M(0xF2D9A0), 0, 12, 0, g); w.rotation.y = 2; const t = mesh(geo('wedgeT', () => new THREE.CylinderGeometry(20.5, 20.5, 4, 3, 1, false, 0, 1.2)), M(0x5A2E14), 0, 22, 0, g); t.rotation.y = 2; }
  else if (look === 'macaron') { cyl(22, 22, 3, 0xFFFFFF, 0, 0, 0, g, 16); [0xF6B8C8, 0xC8E0A0, 0xF6E0A0].forEach((c, i) => { const m = new THREE.Group(); m.position.set(-12 + i * 12, 3, (i % 2) * 6); g.add(m); cyl(6, 6, 4, c, 0, 0, 0, m, 12); cyl(5.5, 5.5, 2, 0xFFF8F0, 0, 4, 0, m, 12); cyl(6, 6, 4, c, 0, 6, 0, m, 12); }); }
  return g;
}

// 테이블에 남은 닦을 자국 (커피 얼룩 · 빵 부스러기)
export function spill() { const g = new THREE.Group(); cyl(16, 16, 1, 0xB08A62, -6, 0, 4, g, 12).scale.set(1, 1, 0.7); for (let i = 0; i < 4; i++) sph(2.5, 0xD8A060, 8 + i * 5, 2, -6 + (i % 2) * 6, g, 5, 4); return g; }
// 쟁반: 나무 쟁반 위 잔 + 냅킨 (셀프 픽업)
export function tray(look, items) { const g = new THREE.Group(); box(54, 4, 38, C.woodL, 0, 0, 0, g); box(56, 2, 40, C.wood, 0, 0, 0, g); box(14, 1, 18, 0xFFFFFF, 18, 4, 4, g);
  const looks = items ? items.flatMap(it => Array(it.n).fill(MENU[it.k].look)).slice(0, 3) : [look]; looks.forEach((lk, i) => { const c = cup(lk); c.position.set(-14 + i * 16, 4, (i % 2) * 8 - 4); c.scale.setScalar(looks.length > 1 ? 0.8 : 1); g.add(c); }); return g; }

// ── 매장: 나무 바닥 · 베이지 회벽 · 큰 창 · 나무 기둥 · 서예 · 바 카운터
export const ROOM = { W: 1400, D: 1400 };
export function room(sc, theme = {}) {
  const W = ROOM.W, D = ROOM.D;
  const ft = cvTex(256, 256, x => { x.fillStyle = theme.floor || '#D2B08A'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? (theme.floorA || '#CBA77F') : (theme.floorB || '#D8B892'); x.fillRect(0, i * 32, 256, 31); x.fillStyle = '#B8936C'; x.fillRect((i * 97) % 256, i * 32, 2, 32); x.fillRect((i * 97 + 128) % 256, i * 32, 2, 32); } });
  ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(5.5, 5.5);
  const fl = mesh(new THREE.BoxGeometry(W, 20, D), new THREE.MeshToonMaterial({ map: ft, gradientMap: gm }), 0, -10, 0, sc); fl.castShadow = false; fl.name = 'floor';
  const out = mesh(new THREE.BoxGeometry(W + 12000, 10, D + 12000), M(theme.out || 0xE9DFD0), 0, -16, 0, sc); out.castShadow = false;
  /* 가게 앞 돌길 (손님이 들어오는 곳) */ for (let i = 0; i < 6; i++) { const s = cyl(34, 34, 4, C.stone, 760 + (i % 2) * 40, -8, 200 - i * 0 + (i - 2.5) * 70, sc, 10); s.scale.set(1, 1, 0.8); }
  box(W, 320, 30, C.wall, 0, 0, -D / 2, sc); box(30, 320, D, C.wallB, -W / 2, 0, 0, sc);
  box(W, 36, 34, C.woodD, 0, 0, -D / 2 + 2, sc); box(34, 36, D, C.woodD, -W / 2 + 2, 0, 0, sc);
  box(W + 4, 18, 40, C.wood, 0, 320, -D / 2, sc); box(40, 18, D + 4, C.wood, -W / 2, 320, 0, sc);
  /* 큰 창 + 리넨 커튼 (바람) */
  const win = (z) => { box(8, 190, 280, 0xDCEAEA, -W / 2 + 18, 70, z, sc); for (const dz of [-140, 0, 140]) box(14, 200, 10, C.woodD, -W / 2 + 22, 65, z + dz, sc); for (const y of [65, 265]) box(14, 10, 290, C.woodD, -W / 2 + 22, y, z, sc); box(6, 210, 50, C.linen, -W / 2 + 30, 60, z + 110, sc); };
  win(-80); win(330);
  /* 나무 기둥 (고정) */
  const tree = new THREE.Group(); tree.position.set(-560, 0, -230); sc.add(tree); cyl(34, 42, 330, 0x8E6038, 0, 0, 0, tree, 14);
  for (let i = 0; i < 4; i++) { const b = cyl(9, 22, 170, 0x8E6038, 0, 0, 0, tree, 10); b.position.set(Math.cos(i * 1.57 + 0.4) * 40, 250, Math.sin(i * 1.57 + 0.4) * 40); b.rotation.set(Math.sin(i * 1.57 + 0.4) * 0.9, 0, -Math.cos(i * 1.57 + 0.4) * 0.9); }
  /* 간판: 뒤쪽 모서리 벽 위, 카메라 정면 (마루미 베이글과 같은 자리 · 놀이 공간을 가리지 않음) */
  { const hd = new THREE.Group(); hd.position.set(-470, 400, -D / 2 + 40); hd.rotation.y = Math.PI / 4; sc.add(hd);
    const draw = (x, img) => { x.fillStyle = '#A92E2B'; x.beginPath(); x.roundRect(0, 0, 512, 150, 34); x.fill(); x.fillStyle = '#F6EFE4'; if (img && img.naturalWidth) { x.save(); x.filter = 'brightness(0) invert(1)'; x.drawImage(img, 30, 22, 96, 106); x.restore(); } x.textAlign = 'left'; x.font = '700 64px "Gowun Batang", serif'; x.fillText('감성커피', 150, 92); x.font = '800 20px P, sans-serif'; x.fillText('GAMSUNG COFFEE · 마음이 쉬어가는 곳', 152, 126); };
    const st = cvTex(512, 150, x => draw(x)); const im = new Image(); im.onload = () => { draw(st.image.getContext('2d'), im); st.needsUpdate = true; }; im.src = 'assets/brand/bi.png';
    document.fonts && document.fonts.ready.then(() => { draw(st.image.getContext('2d'), im); st.needsUpdate = true; });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(440, 129), new THREE.MeshBasicMaterial({ map: st, transparent: true })); sg.position.set(0, 80, 6); hd.add(sg); box(456, 140, 10, C.woodD, 0, 10, 0, hd); for (const sx of [-140, 140]) box(12, 40, 12, C.woodD, sx, -30, 0, hd); }
  /* 서예 (고정, 뒷벽): 「이 한잔으로 마음을 달랠 수만 있다면」 */
  callig(sc, '이한잔으로/마음을/달랠수만/있다면', -150, 285, -D / 2 + 18, 0, 120, 200);
  /* 제작 공간: 타일 바닥 · 뒷벽 작업대(머신 · 오븐) · 선반 · 메뉴판 */
  const tt = cvTex(128, 128, x => { x.fillStyle = '#E8E2D8'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#CFC6B8'; x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, 128); x.stroke(); x.beginPath(); x.moveTo(0, i * 32); x.lineTo(128, i * 32); x.stroke(); } });
  tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(10, 1.6); mesh(new THREE.BoxGeometry(W - 30, 2, 200), new THREE.MeshToonMaterial({ map: tt, gradientMap: gm }), 15, 1, -D / 2 + 115, sc).castShadow = false;
  box(700, 95, 90, 0xEFE6D8, -130, 0, -625, sc); box(716, 12, 100, C.wood, -130, 95, -625, sc); box(700, 22, 6, C.woodL, -130, 18, -578, sc);
  for (const y of [190, 252]) box(560, 8, 44, C.wood, -130, y, -672, sc);
  for (let i = 0; i < 8; i++) cyl(10, 10, 26, [0xF2EBE0, 0xE8D8C4, 0xFFFFFF][i % 3], -300 + i * 70, 198, -670, sc, 10);
  for (let i = 0; i < 6; i++) box(34, 40, 30, [0xD8C8B0, 0xB8946A, 0xE8DCCB][i % 3], -280 + i * 90, 260, -670, sc);
  for (let i = 0; i < 3; i++) { box(80, 120, 8, 0x6B4A30, 300 + i * 95, 175, -D / 2 + 20, sc); box(64, 96, 2, 0x3B3028, 300 + i * 95, 187, -D / 2 + 25, sc); for (let k = 0; k < 4; k++) box(44 - k * 4, 3, 1, 0xF4ECDD, 300 + i * 95, 270 - k * 20, -D / 2 + 26.5, sc); }
  /* 경계: 낮은 나무 칸막이 + 화분 (손님 쪽과 제작 공간을 나눔) */
  for (const [cx0, w] of [[-190, 300], [470, 180]]) { box(w, 88, 30, C.woodD, cx0, 0, -455, sc); box(w + 10, 8, 40, C.wood, cx0, 88, -455, sc); }
  /* 반납대 (왼쪽 칸막이 위): 앞면 「반납 RETURN」 */ { const rd = x => { x.fillStyle = '#3B2A20'; x.fillRect(0, 0, 400, 64); x.fillStyle = '#F6EFE4'; x.textAlign = 'center'; x.font = '700 30px "Gowun Batang", serif'; x.fillText('반납', 120, 44); x.font = '900 28px P, sans-serif'; x.fillText('RETURN', 280, 44); };
    const rt = cvTex(400, 64, rd); const rp = new THREE.Mesh(new THREE.PlaneGeometry(250, 40), new THREE.MeshBasicMaterial({ map: rt })); rp.position.set(-190, 50, -439); sc.add(rp); document.fonts && document.fonts.ready.then(() => { rd(rt.image.getContext('2d')); rt.needsUpdate = true; }); }
  for (const x of [430, 520]) { cyl(16, 13, 22, C.pot, x, 96, -455, sc, 10); sph(20, x % 3 ? C.leaf : C.leaf2, x, 128, -455, sc, 10, 8); }
  /* 받는 공간: 픽업대 + 「PICK UP」 간판 */
  box(380, 105, 100, 0xEFE6D8, 150, 0, -455, sc); box(396, 12, 112, C.wood, 150, 105, -455, sc); box(380, 14, 6, C.woodD, 150, 18, -403, sc);
  const pk = new THREE.Group(); pk.position.set(150, 0, -455); sc.add(pk);
  /* 「PICK UP」 은 픽업대 앞면에 (뒤쪽 머신을 가리지 않음) */
  const draw = x => { x.fillStyle = '#A92E2B'; x.fillRect(0, 0, 512, 80); x.fillStyle = '#F6EFE4'; x.textAlign = 'center'; x.font = '900 46px P, sans-serif'; x.fillText('PICK UP', 200, 56); x.font = '700 34px "Gowun Batang", serif'; x.fillText('픽업', 410, 54); };
  const pt = cvTex(512, 80, draw); const pl = new THREE.Mesh(new THREE.PlaneGeometry(330, 52), new THREE.MeshBasicMaterial({ map: pt })); pl.position.set(0, 66, 51); pk.add(pl);
  document.fonts && document.fonts.ready.then(() => { draw(pt.image.getContext('2d')); pt.needsUpdate = true; });
  /* 조명: 픽업대 위 펜던트 · 작업대 위 은은하게 */
  for (const x of [60, 240]) { cyl(1.5, 1.5, 80, C.ink, x, 250, -455, sc, 6); cyl(28, 8, 24, 0xE8C48A, x, 230, -455, sc, 14); const l = new THREE.PointLight(0xFFC77A, 9000, 460, 2); l.position.set(x, 210, -445); sc.add(l); }
  for (const x of [-200, 100]) { const l = new THREE.PointLight(0xFFE2BC, 5000, 420, 2); l.position.set(x, 260, -600); sc.add(l); }
}
export function callig(p, txt, x, y, z, ry, w = 110, h = 180, poem = false) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g); box(w + 12, h + 12, 6, C.woodD, 0, -h / 2 - 6, 0, g);
  const t = cvTex(220, 360, c => { c.fillStyle = '#F4ECDD'; c.fillRect(0, 0, 220, 360); c.fillStyle = '#3B2A20'; const lines = txt.split('/'); const fs = poem ? 36 : 30; c.font = `${fs}px "Gowun Batang", serif`;
    lines.forEach((l, i) => [...l].forEach((ch, j) => c.fillText(ch, 220 / 2 + (lines.length - 1) * fs * 0.6 - i * fs * 1.2 - fs / 2, 50 + j * fs * 1.08))); c.fillStyle = '#A92E2B'; c.fillRect(30, 300, 28, 28); });
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t })); pic.position.z = 4; g.add(pic);
  document.fonts && document.fonts.load('30px "Gowun Batang"').then(() => { /* 글꼴이 늦게 오면 다시 그림 */ const c = t.image, x2 = c.getContext('2d'); x2.fillStyle = '#F4ECDD'; x2.fillRect(0, 0, 220, 360); x2.fillStyle = '#3B2A20'; const lines = txt.split('/'), fs = poem ? 36 : 30; x2.font = `${fs}px "Gowun Batang", serif`; lines.forEach((l, i) => [...l].forEach((ch, j) => x2.fillText(ch, 110 + (lines.length - 1) * fs * 0.6 - i * fs * 1.2 - fs / 2, 50 + j * fs * 1.08))); x2.fillStyle = '#A92E2B'; x2.fillRect(30, 300, 28, 28); t.needsUpdate = true; }).catch(() => {});
  return g;
}

// ── 설비: 에스프레소 머신(바 위) · 디저트 오븐 · 로스터
export const STATION = {
  espresso(p) { box(96, 76, 70, 0x3B3B42, 0, 0, 0, p); box(86, 14, 60, 0xC9C9CF, 0, 76, 0, p); box(70, 10, 10, 0xA92E2B, 0, 60, 36, p); cyl(6, 6, 20, 0x999999, -20, 22, 30, p, 8); cyl(6, 6, 20, 0x999999, 20, 22, 30, p, 8); box(60, 4, 34, 0x2A2A30, 0, 4, 34, p); },
  oven(p) { box(110, 90, 80, 0xD8D2C8, 0, 0, 0, p); box(80, 50, 4, 0x2A2420, 0, 22, 41, p); mesh(new THREE.BoxGeometry(70, 40, 2), new THREE.MeshBasicMaterial({ color: 0xFFB24A }), 0, 47, 42, p); box(90, 8, 6, C.woodD, 0, 82, 42, p); },
  kiosk(p) { box(56, 20, 44, 0x3B3B42, 0, 0, 0, p); box(14, 100, 14, 0x3B3B42, 0, 20, 0, p); const sc2 = box(64, 90, 10, 0x2A2A30, 0, 115, -6, p); sc2.rotation.x = -0.25; mesh(new THREE.PlaneGeometry(52, 74), new THREE.MeshBasicMaterial({ color: 0xF6EFE4 }), 0, 162, 0, p).rotation.x = -0.25; box(60, 14, 4, BRAND.redHex, 0, 190, 2, p).rotation.x = -0.25; },   /* 키오스크 */
  roaster(p) { box(130, 120, 110, C.red, 0, 0, 0, p); cyl(52, 52, 74, 0x3B3B42, 0, 120, 0, p, 18); cyl(34, 20, 56, 0xC9C9CF, 0, 194, 0, p, 14); box(70, 10, 60, 0x2A2A30, 0, 70, 60, p); cyl(46, 46, 6, 0x5A3A22, 0, 60, 80, p, 18); },
};

// ── 가구 (중심 기준 · 회전은 world.js 에서)
const chair = (p, x, z, ry, c = C.woodL) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); box(46, 42, 46, c, 0, 0, 0, g); box(46, 50, 8, c, 0, 42, -20, g); for (const s of [-1, 1]) box(6, 42, 6, C.woodD, s * 18, 0, 18, g); return g; };
const potPlant = (p, x, z, s = 1, leaf = C.leaf) => { cyl(26 * s, 20 * s, 40 * s, C.pot, x, 0, z, p, 12); sph(34 * s, leaf, x, 72 * s, z, p, 10, 8); sph(24 * s, C.leaf2, x + 16 * s, 94 * s, z + 8 * s, p, 10, 8); };
export const FURN_MODEL = {
  table2(p) { cyl(46, 46, 8, C.wood, 0, 72, 0, p, 20); cyl(7, 12, 72, C.woodD, 0, 0, 0, p, 10); chair(p, -60, 0, Math.PI / 2); chair(p, 60, 0, -Math.PI / 2); },
  table4(p) { box(200, 8, 100, C.wood, 0, 72, 0, p); for (const [x, z] of [[-90, -40], [90, -40], [-90, 40], [90, 40]]) box(8, 72, 8, C.woodD, x, 0, z, p); for (const [x, z, r] of [[-80, -82, 0], [80, -82, 0], [-80, 82, Math.PI], [80, 82, Math.PI]]) chair(p, x, z, r); },
  window(p) { box(90, 8, 46, C.wood, 0, 90, -24, p); for (const x of [-40, 40]) box(6, 90, 6, C.woodD, x, 0, -40, p); const c = chair(p, 0, 22, Math.PI); c.scale.set(0.95, 1.25, 0.95); },
  sofa(p) { box(180, 40, 70, 0xE8DFD0, 0, 0, -50, p); box(180, 60, 20, 0xE8DFD0, 0, 40, -80, p); for (const x of [-95, 95]) box(16, 56, 70, 0xD8CDBC, x, 0, -50, p); for (const x of [-40, 40]) box(70, 14, 60, 0xF4EEE4, x, 40, -46, p); box(110, 40, 60, C.wood, 0, 0, 50, p); cyl(6, 8, 18, 0xFFFFFF, 20, 40, 50, p, 10); },
  floor(p) { box(190, 20, 190, C.woodL, 0, 0, 0, p); box(120, 30, 70, C.wood, 0, 20, 0, p); for (const x of [-60, 60]) box(46, 8, 46, 0xD8C0A0, x, 20, 0, p); cyl(10, 10, 6, 0xF2EBE0, 0, 50, 0, p, 10); },
  plant(p) { potPlant(p, 0, 0, 1.1, 0x8AA87A); },
  fern(p) { cyl(26, 20, 34, 0xD8CDBC, 0, 0, 0, p, 12); for (let i = 0; i < 7; i++) { const l = sph(26, i % 2 ? C.leaf : C.leaf2, Math.cos(i) * 20, 50 + (i % 3) * 8, Math.sin(i) * 20, p, 8, 6); l.scale.set(1.4, 0.35, 0.6); l.rotation.y = i; } },
  pine(p) { box(70, 24, 50, 0x6B4A30, 0, 0, 0, p); cyl(5, 8, 60, 0x6B4A30, 0, 24, 0, p, 8).rotation.z = 0.3; for (const [x, y, s] of [[-14, 86, 1], [16, 104, 0.8], [-4, 118, 0.6]]) sph(26 * s, 0x4E6E3A, x, y, 0, p, 10, 8).scale.set(1.4, 0.45, 1); },
  stone(p) { sph(36, C.stone, 0, 14, 0, p, 10, 8).scale.set(1, 0.55, 0.85); sph(20, C.stoneD, 24, 8, 16, p, 8, 6).scale.set(1, 0.5, 1); },
  stones(p) { box(180, 6, 180, 0xE8DCC4, 0, 0, 0, p); for (let i = 0; i < 4; i++) box(170, 1, 4, 0xD8C8AC, 0, 6, -60 + i * 40, p); for (const [x, z, s] of [[-40, -30, 1.1], [45, 20, 0.8], [-10, 55, 0.6]]) sph(30 * s, C.stone, x, 16 * s, z, p, 10, 8).scale.set(1, 0.6, 0.85); },
  lamp(p) { cyl(18, 22, 6, C.woodD, 0, 0, 0, p, 12); cyl(3, 3, 120, C.woodD, 0, 6, 0, p, 6); box(46, 60, 46, 0xFFF4DE, 0, 120, 0, p); const l = new THREE.PointLight(0xFFC77A, 5000, 380, 2); l.position.set(0, 150, 0); p.add(l); },
  rug(p) { const t = cvTex(128, 96, c => { c.fillStyle = '#E8DFD0'; c.fillRect(0, 0, 128, 96); c.strokeStyle = '#C8B89E'; c.lineWidth = 3; c.strokeRect(8, 8, 112, 80); c.strokeRect(16, 16, 96, 64); }); mesh(new THREE.BoxGeometry(280, 3, 180), new THREE.MeshToonMaterial({ map: t, gradientMap: gm }), 0, 1.5, 0, p).castShadow = false; },
  shelf(p) { for (const y of [0, 60, 120]) box(180, 8, 50, C.wood, 0, y + 20, 0, p); for (const x of [-86, 86]) box(8, 150, 50, C.woodD, x, 0, 0, p); for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) box(28, 36, 20, [0xD8C8B0, 0xB8946A, 0xE8DCCB][(i + k) % 3], -60 + i * 40, 28 + k * 60, 0, p); },
  goods(p) { box(80, 70, 70, C.woodL, 0, 0, 0, p); box(86, 8, 76, C.wood, 0, 70, 0, p); cyl(10, 9, 40, 0xF2EBE0, -20, 78, 0, p, 10); cyl(10, 9, 40, 0xE8D8C4, 0, 78, 10, p, 10); box(24, 30, 6, 0xF4ECDD, 22, 78, -6, p); },
  wind(p) { box(70, 8, 70, C.stone, 0, 0, 0, p); box(8, 180, 8, C.woodD, 0, 8, 0, p); box(60, 8, 8, C.woodD, 15, 180, 0, p); cyl(12, 16, 24, 0x6E7A6A, 40, 150, 0, p, 10); box(2, 30, 14, 0xF4ECDD, 40, 120, 0, p); },
  /* 벽에 거는 것: 벽 자리 기준 (뒤로 붙임) */
  calli(p) { callig(p, '바람과함께/쉬어가세요', 0, 230, 0, 0, 100, 160); },
  board(p) { box(90, 120, 8, 0x6B4A30, 0, 110, 0, p); box(74, 100, 2, 0x3B3028, 0, 120, 5, p); for (let k = 0; k < 5; k++) box(50 - k * 4, 3, 1, 0xF4ECDD, 0, 205 - k * 18, 6.5, p); },
  photo(p) { for (let i = 0; i < 2; i++) { box(66, 80, 6, 0x2A2420, -36 + i * 72, 150 + i * 30, 0, p); box(54, 66, 2, [0xC8C2B8, 0x9A948A][i], -36 + i * 72, 157 + i * 30, 4, p); } },
};
export function poemFrame(p, txt) { callig(p, txt, 0, 240, 0, 0, 100, 170, true); }
/* 오늘의 시 액자: 세로 서예 + 아래 붉은 이름표 「오늘의 시」 */
export function todayFrame(p, txt) { callig(p, txt, 0, 262, 0, 0, 120, 196, true); const t = cvTex(160, 44, x => { x.fillStyle = '#A92E2B'; x.fillRect(0, 0, 160, 44); x.fillStyle = '#F6EFE4'; x.textAlign = 'center'; x.font = '700 24px "Gowun Batang", serif'; x.fillText('오늘의 시', 80, 31); });
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(84, 23), new THREE.MeshBasicMaterial({ map: t })); pl.position.set(0, 44, 5); p.add(pl); box(90, 28, 4, C.woodD, 0, 30, 0, p);
  document.fonts && document.fonts.ready.then(() => { const x = t.image.getContext('2d'); x.fillStyle = '#A92E2B'; x.fillRect(0, 0, 160, 44); x.fillStyle = '#F6EFE4'; x.textAlign = 'center'; x.font = '700 24px "Gowun Batang", serif'; x.fillText('오늘의 시', 80, 31); t.needsUpdate = true; }); }
/* 찻값: 테이블 위 동전 더미 (값이 클수록 높게) */
export function coinPile(v) { const g = new THREE.Group(), n = Math.max(3, Math.min(12, Math.round(v / 6))); for (let i = 0; i < n; i++) { const col = i % 3, k = Math.floor(i / 3); const c = cyl(9, 9, 3.2, i % 2 ? 0xE8B44A : 0xF2C85E, [-10, 9, 0][col], k * 3.4, [4, 2, -10][col], g, 12); c.rotation.z = (i % 4 - 1.5) * 0.04; } return g; }
/* 손편지: 하얀 봉투 + 붉은 하트 봉인 */
export function letter() { const g = new THREE.Group(); const e = box(30, 2, 21, 0xFFFDF8, 0, 0, 0, g); e.rotation.y = 0.35; const f = box(30, 0.6, 10, 0xF1E8DA, 0, 2, -4, g); f.rotation.y = 0.35; const h = sph(4.2, BRAND.redHex, 0, 3, 1, g, 8, 6); h.scale.set(1, 0.4, 1); return g; }
