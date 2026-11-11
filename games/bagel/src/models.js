// 모델을 코드로 직접 만듦: 낮은 다각형 + 만화풍 3단 음영 (사람 · 베이글 · 커피 · 설비 · 가게)
import * as THREE from 'three';
import { BRAND } from './data.js?v=0.99.25';

const gm = (() => { const d = new Uint8Array([95, 190, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const mats = {};
export const M = c => mats[c] ||= new THREE.MeshToonMaterial({ color: c, gradientMap: gm });
export function mesh(g, m, x = 0, y = 0, z = 0, p) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; if (p) p.add(o); return o; }
const G = {}; const geo = (k, f) => G[k] ||= f();
export const box = (w, h, d, c, x, y, z, p) => mesh(geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), M(c), x, y + h / 2, z, p);
export const cyl = (rt, rb, h, c, x, y, z, p, s = 16) => mesh(geo(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s)), M(c), x, y + h / 2, z, p);
export const sph = (r, c, x, y, z, p, ws = 14, hs = 10) => mesh(geo(`s${r},${ws}`, () => new THREE.SphereGeometry(r, ws, hs)), M(c), x, y, z, p);
// ── 물건: 베이글 · 크림치즈 베이글 · 커피 · 쓰레기
export const ITEM_H = { drink: 29, bagel: 15, chewy: 15, cream: 16, coffee: 27, trash: 12, box: 30, dough: 14, aged: 14, boiled: 15 };
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
  else if (kind === 'aged') { sph(15, 0xF2DDB0, 0, 9, 0, g, 12, 8).scale.set(1, 0.75, 1); sph(4, 0xFFFFFF, 6, 15, -4, g, 6, 4); }   /* 숙성 반죽: 부푼 노란 반죽 */
  else if (kind === 'chewy') { mesh(torus(), new THREE.MeshToonMaterial({ color: 0xB8742E, gradientMap: gm, emissive: 0x2A1400 }), 0, 7.5, 0, g); sph(2.4, 0xFFF4D0, -7, 15, 6, g, 5, 4); sph(2.4, 0xFFF4D0, 8, 15, -3, g, 5, 4); }   /* 쫄깃 베이글: 윤기 나는 진한 갈색 */
  else if (kind === 'boiled') { mesh(torus(), new THREE.MeshToonMaterial({ color: 0xE8C08A, gradientMap: gm, emissive: 0x3A2208 }), 0, 7.5, 0, g); }
  else if (kind === 'prem') { mesh(torus(), new THREE.MeshToonMaterial({ color: 0xB86A20, gradientMap: gm, emissive: 0x3A1A00 }), 0, 7.5, 0, g); sph(3, 0xFFFFFF, 8, 15, -6, g, 6, 4); }
  else if (kind === 'trash') { box(30, 3, 22, 0x6A4A3A, 0, 0, 0, g); sph(7, 0xB8B8B8, -6, 8, 0, g, 6, 4); sph(6, 0xA8A8A8, 6, 7, 3, g, 6, 4); cyl(4, 3, 10, 0xD84A3A, 8, 3, -6, g, 6); }   /* 쟁반 + 구겨진 종이 (음식과 구분) */
  outline(g); g.userData.item = kind; return g;
}
/* 물건 외곽선 (바닥에서도 베이글이 또렷이) — 뒷면만 그리는 짙은 껍데기를 살짝 크게 · 바닥 색과 상관없이 테두리가 보임 */
const OUTM = new THREE.MeshBasicMaterial({ color: 0x3A2414, side: THREE.BackSide });
function outline(g) { for (const m of [...g.children]) if (m.isMesh) { if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere(); if (m.geometry.boundingSphere.radius * Math.max(m.scale.x, m.scale.z) < 7) continue; const o = new THREE.Mesh(m.geometry, OUTM); o.position.copy(m.position); o.rotation.copy(m.rotation); o.scale.copy(m.scale).multiplyScalar(1.16); o.castShadow = false; o.userData.outline = 1; g.add(o); } }
// ── 사람: 동그란 몸 · 머리 · 모자 · 팔다리 (걸을 때 흔듦)
export function person(o = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  mesh(geo('pbody', () => new THREE.CapsuleGeometry(30, 34, 6, 12)), M(o.body || 0xF28C38), 0, 62, 0, body);
  if (o.apron) mesh(geo('papron', () => new THREE.CapsuleGeometry(31, 20, 6, 12)), M(o.apronC || 0xFFFFFF), 0, 54, 4, body).scale.set(0.96, 1, 0.92);
  if (o.scarf) { mesh(geo('pscarf', () => new THREE.TorusGeometry(24, 6, 6, 16).rotateX(Math.PI / 2)), M(o.scarf), 0, 98, 0, body); box(14, 18, 6, o.scarf, 6, 80, 27, body).rotation.z = 0.3; }   /* 사장님 목수건 */
  sph(32, o.faceless ? o.body : 0xFFDDBF, 0, 128, 0, body, 18, 14);   /* 손님: 얼굴 없는 단색 (머리도 몸과 같은 계열) */
  if (!o.faceless) mesh(geo('phair', () => new THREE.SphereGeometry(33, 18, 14, 0, 6.28, 0, 1.4)), M(o.hair || 0x5A3A22), 0, 132, -2, body);
  const hat = o.hat || (o.cap ? 'cap' : null), hc = o.cap || 0xFFFFFF;
  if (hat === 'cap') { cyl(30, 32, 22, hc, 0, 150, 0, body); cyl(22, 22, 4, hc, 0, 150, 24, body); }
  else if (hat === 'toque') { cyl(30, 31, 16, 0xFFFFFF, 0, 148, 0, body); cyl(34, 28, 46, 0xFFFFFF, 0, 162, 0, body); sph(36, 0xFFFFFF, 0, 214, 0, body, 16, 10).scale.set(1, 0.62, 1); cyl(31.5, 31.5, 6, hc, 0, 150, 0, body); }   /* 사장님 셰프 모자 (직원은 캡 → 실루엣으로 구분) */
  else if (hat === 'beret') { const b = sph(34, hc, 4, 156, -2, body, 16, 8); b.scale.set(1.05, 0.38, 1.05); b.rotation.z = -0.18; sph(4, hc, 4, 170, -2, body, 6, 4); }
  else if (hat === 'bandana') { cyl(33.5, 33.5, 12, hc, 0, 140, 0, body); sph(36, hc, 0, 146, -4, body, 16, 8).scale.set(0.98, 0.5, 0.98); sph(7, hc, 0, 142, -34, body, 6, 4); }
  if (!o.faceless) for (const s of [-1, 1]) { sph(4, 0x2A1A10, s * 11, 130, 29, body, 8, 6); sph(5, 0xFFB3A0, s * 20, 120, 24, body, 8, 6); }
  const legs = [-1, 1].map(s => { const L = new THREE.Group(); L.position.set(s * 14, 26, 0); g.add(L); mesh(geo('pleg', () => new THREE.CapsuleGeometry(10, 12, 4, 8)), M(o.pants || (o.faceless ? o.body : 0x6A4A3A)), 0, -12, 0, L); return L; });
  const arms = [-1, 1].map(s => { const A = new THREE.Group(); A.position.set(s * 31, 88, 0); body.add(A); mesh(geo('parm', () => new THREE.CapsuleGeometry(8, 20, 4, 8)), M(o.arm || o.body || 0xF28C38), 0, -16, 0, A); return A; });
  const hand = new THREE.Group(); hand.position.set(0, 74, 34); body.add(hand);   /* 들고 있는 물건이 쌓이는 곳 */
  const P = { g, body, legs, arms, hand, t: Math.random() * 6, carry: false };
  P.anim = (dt, moving) => { P.t += dt * (moving ? 12 : 2); const s = moving ? Math.sin(P.t) : 0;
    legs[0].rotation.x = s * 0.7; legs[1].rotation.x = -s * 0.7; body.position.y = moving ? Math.abs(Math.cos(P.t)) * 4 : Math.sin(P.t) * 1.2;
    for (let i = 0; i < 2; i++) arms[i].rotation.x = P.carry ? -1.25 : (i ? s : -s) * 0.6; };
  if (o.bubble) { const b = new THREE.Group(); b.position.set(0, 210, 0); g.add(b); mesh(geo('bub', () => new THREE.SphereGeometry(28, 16, 12)), M(0xFFFFFF), 0, 0, 0, b).scale.set(1.25, 1, 0.5); P.bubble = b; }
  return P;
}
// ── 설비 (위치는 group 기준 · 받는 곳/내놓는 곳 좌표는 game.js 에서)
export const STATION = {
  oven(p) { box(200, 170, 140, 0xCFD6DB, 0, 0, 0, p); box(210, 16, 150, 0xA8B0B6, 0, 170, 0, p); mesh(new THREE.BoxGeometry(120, 60, 4), new THREE.MeshBasicMaterial({ color: 0xFFB24A }), 0, 90, 72, p); box(130, 6, 6, 0x6A7278, 0, 130, 72, p); box(30, 80, 30, 0xA8B0B6, 60, 186, -30, p); box(180, 10, 60, 0x9A643A, 0, 0, 100, p); box(200, 8, 4, BRAND.accentHex, 0, 150, 71, p); },   /* 스테인리스 오븐 (실제 매장 공통) */
  counter(p) { mesh(geo('ctr', () => new THREE.BoxGeometry(520, 100, 120)), [M(0xF7F7F3), M(0xF7F7F3), M(0xF7F7F3), M(0xF7F7F3), VTILE(), M(0xF7F7F3)], 0, 50, 0, p); mesh(geo('ctrtop', () => new THREE.BoxGeometry(530, 14, 128)), TERRAZZO(), 0, 107, 0, p); box(520, 8, 122, 0xD8D2C8, 0, 0, 0, p); box(532, 6, 4, BRAND.accentHex, 0, 98, 63, p);
    box(64, 44, 48, 0x4A4A55, -160, 114, 0, p); box(50, 6, 40, 0x6A6A75, -160, 158, 0, p);   /* 계산기 (계산 자리 x 940) */
    for (let i = 0; i < 5; i++) box(4, 16, 100, 0xC8B8A4, -30 + i * 70, 114, 0, p); },   /* 5.4m 흰 세로 타일 진열대 + 테라조 상판 + 진열 4칸 칸막이 */
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
  retard(p) { box(144, 190, 110, 0xD6DDE2, 0, 0, 0, p); box(150, 10, 116, 0xA8B0B6, 0, 190, 0, p); box(120, 120, 6, 0x9CC8E2, 0, 50, 56, p); for (let i = 0; i < 3; i++) box(110, 3, 4, 0xFFFFFF, 0, 70 + i * 34, 59, p); mesh(new THREE.TorusGeometry(14, 4, 6, 14, 4.2), new THREE.MeshBasicMaterial({ color: 0x3A5A8A }), 40, 175, 58, p); },   /* 저온 숙성고 (밤새 숙성 · 달 표시) */
  rider(p) { box(220, 40, 60, 0x9A643A, 0, 0, 0, p); box(220, 50, 10, 0x9A643A, 0, 40, -26, p); for (const x of [-90, 90]) box(10, 40, 50, 0x5A3A22, x, 0, 0, p); box(60, 70, 50, 0xFF6720, 150, 0, 0, p); box(50, 10, 40, 0xFFFFFF, 150, 70, 0, p); },   /* 라이더 대기석 + 배달 가방 */
  bar(p, w, d) { box(w, 10, d, 0xC08A5A, 0, 100, 0, p); for (const s of [-1, 1]) box(20, 100, 20, 0x8A5A3A, 40, 0, s * d * 0.36, p); },   /* 창가 바 (긴 상판) */
  picnic(p) { box(220, 10, 110, 0xB98A5A, 0, 78, 0, p); for (const x of [-90, 90]) box(10, 78, 90, 0x8A6A44, x, 0, 0, p); for (const z of [-95, 95]) { box(220, 8, 34, 0xB98A5A, 0, 40, z, p); for (const x of [-90, 90]) box(8, 40, 26, 0x8A6A44, x, 0, z, p); } box(40, 20, 30, 0xE8C090, 50, 88, -10, p); },   /* 피크닉 테이블 (숲 테라스) */
  desk(p) { box(160, 80, 80, 0x9A643A, 0, 0, 0, p); box(170, 10, 90, 0xC08A5A, 0, 80, 0, p); box(40, 30, 6, 0x4A4A55, -40, 90, -20, p); for (let i = 0; i < 3; i++) { const c = box(26, 36, 3, [0xFF6720, 0xFFFFFF, 0x2C4A6B][i], 10 + i * 30, 92, 10, p); c.rotation.x = -0.35; } },   /* 책상 + 카드 받침 3장 */
  window(p) { box(60, 230, 300, 0xEFD9BC, 0, 0, 0, p); box(10, 100, 260, 0xBFE3F2, 26, 90, 0, p); box(90, 12, 290, 0x9A643A, -45, 96, 0, p); box(60, 40, 300, BRAND.accentHex, 0, 230, 0, p); },   /* 픽업 · 드라이브 창구 (동쪽 벽 · 안쪽 선반) */
  tray(p) { box(70, 8, 46, 0x9AA4AC, 0, 74, 0, p); for (const x of [-30, 30]) box(5, 74, 5, 0x7A848C, x, 0, 0, p); },   /* 집는 받침 선반 */
  basket(p) { cyl(30, 24, 26, 0xC89A62, 0, 0, 0, p, 12); for (let i = 0; i < 4; i++) sph(9, 0xFFF4E2, -10 + (i % 2) * 20, 28, -6 + Math.floor(i / 2) * 12, p, 8, 6); },   /* 생지 바구니 */
  frozen(p) { box(70, 120, 50, 0xDDE6EC, 0, 0, 0, p); for (let i = 0; i < 3; i++) box(62, 3, 44, 0xFFFFFF, 0, 30 + i * 32, 0, p); for (let i = 0; i < 6; i++) sph(8, 0xFFF4E2, -20 + (i % 3) * 20, 36 + Math.floor(i / 3) * 32, 0, p, 8, 6); },   /* 냉동 생지 선반 */
};
// 흰 세로 타일 · 테라조 (실제 매장 공통 요소)
let _vt = null, _tz = null;
function VTILE() { if (_vt) return _vt; const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#FAFAF7'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#D9DAD6'; for (let i = 0; i < 256; i += 10) x.fillRect(i, 0, 1.5, 64); x.fillStyle = '#E9E6E0'; x.fillRect(0, 58, 256, 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (_vt = new THREE.MeshToonMaterial({ map: t, gradientMap: gm })); }
function TERRAZZO() { if (_tz) return _tz; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#EEEAE3'; x.fillRect(0, 0, 128, 128); let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 160; i++) { x.fillStyle = ['#C8B8A8', '#9AA4AC', '#E8B98A', '#B8A898'][i % 4]; x.fillRect(r() * 128, r() * 128, 2 + r() * 3, 2 + r() * 3); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (_tz = new THREE.MeshToonMaterial({ map: t, gradientMap: gm })); }
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
  rug(p) { cyl(198, 198, 3, 0xD8B48A, 0, 0, 0, p, 40).scale.set(1, 1, 0.68); cyl(180, 180, 4, 0xE6C9A2, 0, 0, 0, p, 40).scale.set(1, 1, 0.66); cyl(150, 150, 5, 0xD8B48A, 0, 0, 0, p, 40).scale.set(1, 1, 0.64); },
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

// ── 지폐 다발 (36×9×20 · 흰 띠) — 돈 더미는 가로 3 × 2 × 층 12
export function billBundle() { const g = new THREE.Group(); box(36, 8, 20, 0x5FB66A, 0, 0, 0, g); box(8, 8.5, 20.5, 0xFFFFFF, 0, 0, 0, g); return g; }
export function bill() { const g = new THREE.Group(); box(30, 1.5, 16, 0x6FC27A, 0, 0, 0, g); box(6, 2, 16.5, 0xFFFFFF, 0, 0, 0, g); return g; }
// ── 베이글 풍선 (보상형 광고 자리 · 고정 자리에 묶여 살짝 흔들림): 주황 풍선 + 끈 + 작은 베이글
export function balloon() { const g = new THREE.Group(), top = new THREE.Group(); g.add(top); top.position.y = 260;
  sph(36, BRAND.accentHex, 0, 0, 0, top, 16, 12).scale.set(1, 1.15, 1); cyl(4, 8, 10, 0xD8501A, 0, -48, 0, top, 8);
  const b = item('bagel'); b.scale.setScalar(1.1); b.position.set(0, -6, 30); b.rotation.x = Math.PI / 2; top.add(b);
  cyl(1, 1, 210, 0xFFFFFF, 0, 0, 0, g, 4); cyl(10, 12, 10, 0x8A6A44, 0, 0, 0, g, 10); g.userData.top = top; return g; }
// ── 사장님 발밑 표시: 브랜드 주황 고리 (어디 있는지 한눈에)
export function ownerRing() { const g = new THREE.Group(); const r = new THREE.Mesh(new THREE.RingGeometry(40, 52, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: BRAND.accentHex, transparent: true, opacity: 0.85, depthWrite: false }));
  r.position.y = 3; g.add(r); const d = new THREE.Mesh(new THREE.CircleGeometry(40, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: BRAND.accentHex, transparent: true, opacity: 0.18, depthWrite: false })); d.position.y = 2.5; g.add(d); g.userData.ring = r; return g; }
// ── 설비 단계 외형 (업그레이드 Lv 3 · 6 · 9 에서 바뀜): 1 브랜드 띠 · 2 스테인리스 + 브랜드 판 · 3 금색 테 + 별
//   sz: [가로, 높이, 깊이] 설비 몸통 크기 · 단계마다 앞의 장식을 쌓음
const GOLD = 0xE8B23A, STEEL = 0xD6DDE2;
export function tierDeco(type, tier, sz) {
  const g = new THREE.Group(); if (!tier) return g; const [w, h, d] = sz;
  box(w + 6, 12, d + 6, BRAND.accentHex, 0, Math.round(h * 0.2), 0, g);   /* 1: 브랜드 주황 띠 */
  if (type === 'oven') box(60, 8, 8, 0xFFFFFF, 0, h - 26, d / 2 + 3, g);
  if (tier >= 2) { box(w + 10, 8, d + 10, STEEL, 0, h + 2, 0, g); const lp = logoPanel(Math.min(110, w * 0.6), Math.min(34, w * 0.19)); lp.position.set(0, Math.round(h * 0.2) + 6, d / 2 + 4.5); g.add(lp);   /* 2: 스테인리스 상판 + 로고 판 */
    if (type === 'oven') { box(w - 30, 40, d - 20, 0xB04A30, 0, h + 10, 0, g); mesh(new THREE.BoxGeometry(90, 18, 4), new THREE.MeshBasicMaterial({ color: 0xFFC46A }), 0, h + 30, d / 2 - 8, g); }   /* 오븐 2단 */
    if (type === 'mixer') cyl(48, 40, 10, STEEL, 10, 60, 10, g, 18);
    if (type === 'espresso') { cyl(6, 6, 18, 0x2A2A30, 0, 120, 32, g, 8); box(40, 8, 30, STEEL, 0, 107, 30, g); }
    if (type === 'kettle') cyl(56, 56, 6, STEEL, 0, 128, 0, g, 20); }
  if (tier >= 3) { for (const sy of [0, h - 4]) box(w + 14, 5, d + 14, GOLD, 0, sy, 0, g);   /* 3: 금색 테 + 꼭대기 별 */
    const st = new THREE.Mesh(new THREE.OctahedronGeometry(14), new THREE.MeshToonMaterial({ color: 0xFFD24A, gradientMap: gm, emissive: 0x8A5A00 })); st.position.set(0, h + 46, 0); st.userData.spin = true; g.add(st); }
  return g;
}
// ── 미리보기(반투명 그림자): 모델을 통째로 반투명 단색으로 · ok=false 면 빨강
export function ghostify(g, ok = true) { const col = ok ? 0x5FCB6A : 0xE8504A; g.traverse(o => { if (o.isMesh) { o.material = (ok ? GH.ok : GH.no); o.castShadow = false; } if (o.isLight) o.visible = false; }); return g; }
const GH = { ok: new THREE.MeshBasicMaterial({ color: 0x6FD07A, transparent: true, opacity: 0.45, depthWrite: false }), no: new THREE.MeshBasicMaterial({ color: 0xE8504A, transparent: true, opacity: 0.45, depthWrite: false }) };
