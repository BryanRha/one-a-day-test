// 매장 그리기 v2: 바깥 · 방 바닥(지점 재질) · 벽 · 잠긴 방 점선 · 지점 인테리어(조명 · 소품 · 외관) · 방 가구 · 공사장
//   지점마다 확실히 다르게 (계획안 2-2) + 실제 매장 공통 요소(회색 벽 흰 로고 · 흰 세로 타일 진열대 · 테라조 · 검은 칠판 가격표 · 주황 m 상자 선반)는 모든 지점
//   모든 모델은 코드로 (새 그림 리소스 없음) · 작은 소품은 그림자를 안 드리움(가벼움)
import * as THREE from 'three';
import { M, box, cyl, sph, mesh } from './models.js?v=0.99.17';
import { ROOMS, STAIRS, inRect } from './layout.js?v=0.99.17';
import { BRAND, THEME_SETS } from './data.js?v=0.99.17';

const T = {};   /* 무늬 텍스처 캐시 */
const LOGO = (() => { const im = new Image(); im.src = 'assets/brand/logo.png'; return im; })();
const noShadow = o => { o.traverse(m => { if (m.isMesh) m.castShadow = false; }); return o; };
/* 가림막 표시: 키 큰 것(파라솔 · 어닝 · 조명 · 나무 · 간판 · 2층 받침)은 테이블 · 설비 · 사장님을 가리면 game.js 가 흐리게 (0.3.1 대표 「어닝이 테이블을 가림」) */
export const occ = o => { o.userData.occ = true; return o; };
const glow = c => new THREE.MeshBasicMaterial({ color: c });
// ── 바닥 무늬 (캔버스 256 · 한 장 = 세계 400)
function pattern(kind, a, b, line) {
  const k = [kind, a, b, line].join(); if (T[k]) return T[k];
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = a; x.fillRect(0, 0, 256, 256);
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  if (kind === 'plank') { for (let r = 0; r < 8; r++) { let px = -rnd() * 120; while (px < 256) { const w = 90 + rnd() * 80; x.fillStyle = rnd() < 0.5 ? a : b; x.fillRect(px, r * 32, w, 32); x.fillStyle = line; x.fillRect(px, r * 32, 2, 32); px += w; } x.fillStyle = line; x.fillRect(0, r * 32 + 31, 256, 1.5); } }
  else if (kind === 'check') { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? b : a; x.fillRect(i * 64, j * 64, 64, 64); } }
  else if (kind === 'bigtile') { x.fillStyle = b; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2) x.fillRect(i * 128, j * 128, 128, 128); x.fillStyle = line; for (let i = 0; i <= 2; i++) { x.fillRect(i * 128 - 1, 0, 2, 256); x.fillRect(0, i * 128 - 1, 256, 2); } }
  else if (kind === 'terracotta') { for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { x.fillStyle = rnd() < 0.5 ? a : b; x.fillRect(i * 64 + (j % 2) * 32, j * 32, 64, 32); } x.fillStyle = line; for (let j = 0; j < 8; j++) { x.fillRect(0, j * 32, 256, 2); for (let i = 0; i < 5; i++) x.fillRect(i * 64 + (j % 2) * 32, j * 32, 2, 32); } }
  else if (kind === 'mint') { x.fillStyle = line; for (let i = 0; i <= 8; i++) { x.fillRect(i * 32 - 1, 0, 2, 256); x.fillRect(0, i * 32 - 1, 256, 2); } }
  else if (kind === 'parquet') { for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { x.fillStyle = (i + j) % 2 ? a : b; if ((i + j) % 2) x.fillRect(i * 32, j * 32, 32, 32); else { x.fillRect(i * 32, j * 32, 32, 32); } x.fillStyle = line; if ((i + j) % 2) for (let s = 0; s < 3; s++) x.fillRect(i * 32 + s * 11, j * 32, 1.5, 32); else for (let s = 0; s < 3; s++) x.fillRect(i * 32, j * 32 + s * 11, 32, 1.5); } }
  else if (kind === 'concrete') { for (let i = 0; i < 900; i++) { x.fillStyle = rnd() < 0.5 ? b : line; x.fillRect(rnd() * 256, rnd() * 256, 2, 2); } }
  else if (kind === 'deck') { for (let r = 0; r < 8; r++) { x.fillStyle = r % 2 ? a : b; x.fillRect(0, r * 32, 256, 32); x.fillStyle = line; x.fillRect(0, r * 32 + 30, 256, 2); } }
  else if (kind === 'grass') { for (let i = 0; i < 1400; i++) { x.fillStyle = rnd() < 0.5 ? b : line; x.fillRect(rnd() * 256, rnd() * 256, 2, 4); } }
  else if (kind === 'paving') { x.fillStyle = line; for (let j = 0; j < 4; j++) { x.fillRect(0, j * 64, 256, 3); for (let i = 0; i < 4; i++) x.fillRect(i * 64 + (j % 2) * 32, j * 64, 3, 64); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return (T[k] = t); }
function floor(g, r, kind, a, b, line, y = 0, tile = 400) { const w = r[2] - r[0], d = r[3] - r[1], t = pattern(kind, a, b, line).clone(); t.needsUpdate = true; t.repeat.set(w / tile, d / tile);
  const f = new THREE.Mesh(new THREE.BoxGeometry(w, 20, d), new THREE.MeshLambertMaterial({ map: t })); f.position.set((r[0] + r[2]) / 2, y - 10, (r[1] + r[3]) / 2); f.receiveShadow = true; g.add(f); return f; }
/* 점선 테두리 (잠긴 방) */
function dashed(g, r, col = 0xB08A5E) { const m = glow(col), L = 34, gap = 22;
  const run = (x0, z0, x1, z1) => { const l = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(l / (L + gap)); for (let i = 0; i < n; i++) { const u = (i * (L + gap) + L / 2) / l; const b = new THREE.Mesh(new THREE.BoxGeometry(x1 !== x0 ? L : 7, 2, z1 !== z0 ? L : 7), m); b.position.set(x0 + (x1 - x0) * u, 3, z0 + (z1 - z0) * u); g.add(b); } };
  const [x0, z0, x1, z1] = r, e = 14; run(x0 + e, z0 + e, x1 - e, z0 + e); run(x0 + e, z1 - e, x1 - e, z1 - e); run(x0 + e, z0 + e, x0 + e, z1 - e); run(x1 - e, z0 + e, x1 - e, z1 - e); }
/* 벽 텍스처 (지점 벽 종류) */
function wallTex(I, len, h) { const k = ['wall', I.wall, I.wallC, I.grout, I.wood, len, h].join(); if (T[k]) return T[k]; const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d'), hex = v => '#' + (v >>> 0).toString(16).padStart(6, '0');
  x.fillStyle = hex(I.wallC); x.fillRect(0, 0, 512, 128);
  if (I.wall === 'vtile') { x.fillStyle = hex(I.grout || 0xA8D8C8); for (let i = 0; i < 512; i += 12) x.fillRect(i, 0, 1.5, 128); for (let j = 0; j < 128; j += 40) x.fillRect(0, j, 512, 1.5); }
  if (I.wall === 'louver') { x.fillStyle = hex(I.wood || 0xB98A5A); for (let i = 0; i < 512; i += 16) { x.fillRect(i, 0, 9, 128); x.fillStyle = '#00000018'; x.fillRect(i + 7, 0, 2, 128); x.fillStyle = hex(I.wood || 0xB98A5A); } }
  if (I.wall === 'wainscot') { x.fillStyle = hex(I.wain || 0x5A3A22); x.fillRect(0, 76, 512, 52); x.fillStyle = '#ffffff22'; for (let i = 0; i < 512; i += 64) x.fillRect(i + 6, 82, 52, 40); x.fillStyle = '#C8A060'; x.fillRect(0, 74, 512, 4); }
  if (I.wall === 'plain') { x.fillStyle = hex(I.trim); x.fillRect(0, 116, 512, 12); }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(Math.max(1, len / 600), 1); return (T[k] = t); }
function wall(g, x0, z0, x1, z1, h, I, tex = true) { const len = Math.hypot(x1 - x0, z1 - z0), alongX = x1 !== x0, t = tex ? wallTex(I, len, h) : null;
  const mat = t ? new THREE.MeshLambertMaterial({ map: t }) : M(I.wallB || I.wallC), w = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 30, h, alongX ? 30 : len), mat); w.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2); w.castShadow = true; w.receiveShadow = true; g.add(w);
  const cap = box(alongX ? len + 4 : 36, 14, alongX ? 36 : len + 4, I.trim, (x0 + x1) / 2, h, (z0 + z1) / 2, g); cap.castShadow = false; return w; }
/* 로고 판 (회색 + 흰 로고 · 실제 매장 공통) */
export function logoWall(w, h, bg = '#8E8C88') { const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const x = c.getContext('2d'), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const draw = () => { x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); if (LOGO.complete && LOGO.naturalWidth) { const r = Math.min(c.width * 0.62 / LOGO.naturalWidth, c.height * 0.5 / LOGO.naturalHeight), lw = LOGO.naturalWidth * r, lh = LOGO.naturalHeight * r; x.drawImage(LOGO, (c.width - lw) / 2, (c.height - lh) / 2, lw, lh); } t.needsUpdate = true; };
  draw(); if (!LOGO.complete) LOGO.addEventListener('load', draw, { once: true }); return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t })); }
/* 칠판 가격표 (검은 판 + 흰 줄 + 주황 점) */
function chalk(g, x, y, z, ry = 0, w = 120) { const b = new THREE.Group(); b.position.set(x, y, z); b.rotation.y = ry; g.add(b); box(w, 80, 6, 0x24282A, 0, 0, 0, b); box(w + 10, 6, 8, 0x9A643A, 0, 80, 0, b); for (let i = 0; i < 4; i++) box(w * (0.66 - i * 0.08), 3, 2, 0xF2F2EE, -6, 62 - i * 15, 4, b); for (let i = 0; i < 4; i++) box(10, 3, 2, BRAND.accentHex, w * 0.36, 62 - i * 15, 4, b); return noShadow(b); }
/* 주황 m 이 찍힌 흰 상자 선반 */
function boxShelf(g, x, z, ry = 0, n = 3) { const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry; g.add(s); for (const y of [40, 110, 180]) box(170, 6, 46, 0x9A643A, 0, y, 0, s); for (const xx of [-82, 82]) box(6, 200, 46, 0x9A643A, xx, 0, 0, s);
  for (let r = 0; r < n; r++) for (let i = 0; i < 3; i++) { box(44, 34, 36, 0xFFFFFF, -50 + i * 50, 46 + r * 70, 0, s); box(14, 10, 2, BRAND.accentHex, -50 + i * 50, 58 + r * 70, 19, s); } return noShadow(s); }
function plant(g, x, z, s = 1, pot = 0xE7B98A) { const p = new THREE.Group(); p.position.set(x, 0, z); p.scale.setScalar(s); g.add(p); cyl(26, 20, 44, pot, 0, 0, 0, p, 12); sph(42, 0x7FBF6A, 0, 82, 0, p, 12, 10).scale.set(1, 1.15, 1); sph(28, 0x5FA85A, 18, 104, 10, p, 10, 8); return p; }
function tree(g, x, z, s = 1, leaf = 0x7FBF6A) { const p = occ(new THREE.Group()); p.position.set(x, 0, z); p.scale.setScalar(s); g.add(p); cyl(12, 16, 150, 0x7A5A3A, 0, 0, 0, p, 8); sph(80, leaf, 0, 200, 0, p, 12, 10); sph(56, leaf, 40, 250, 20, p, 10, 8); return p; }
function pendant(g, x, z, y = 250) { const p = occ(new THREE.Group()); p.position.set(x, 0, z); g.add(p); const cord = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 120, 4), glow(0x3A2A1A)); cord.position.y = y + 60; p.add(cord); const sh = mesh(new THREE.SphereGeometry(30, 14, 8, 0, 6.28, 0, 1.4), M(0xFFF1D6), 0, y, 0, p); sh.rotation.x = Math.PI; const b = new THREE.Mesh(new THREE.SphereGeometry(10, 8, 6), glow(0xFFD98A)); b.position.y = y - 8; p.add(b); return noShadow(p); }
function sconce(g, x, z, ry) { const p = new THREE.Group(); p.position.set(x, 150, z); p.rotation.y = ry; g.add(p); box(14, 30, 8, 0xC8A050, 0, 0, 0, p); const b = new THREE.Mesh(new THREE.SphereGeometry(9, 8, 6), glow(0xFFE2A0)); b.position.set(0, 36, 12); p.add(b); box(24, 4, 20, 0xC8A050, 0, 26, 8, p); return noShadow(p); }
function chandelier(g, x, z) { const p = occ(new THREE.Group()); p.position.set(x, 270, z); g.add(p); const r = mesh(new THREE.TorusGeometry(46, 4, 6, 24).rotateX(Math.PI / 2), M(0xC8A050), 0, 0, 0, p); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28, b = new THREE.Mesh(new THREE.SphereGeometry(7, 8, 6), glow(0xFFE2A0)); b.position.set(Math.cos(a) * 46, 10, Math.sin(a) * 46); p.add(b); } const c = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 80, 4), glow(0x6A5A3A)); c.position.y = 40; p.add(c); return noShadow(p); }
function led(g, x0, z0, x1, z1, y = 260) { const l = Math.hypot(x1 - x0, z1 - z0), m = occ(new THREE.Mesh(new THREE.BoxGeometry(x1 !== x0 ? l : 8, 5, x1 !== x0 ? 8 : l), glow(0xF4FAFF))); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); g.add(m);
  for (const [px, pz] of [[x0, z0], [x1, z1]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 60, 4), glow(0xB8C0C8)); c.position.set(px, y + 30, pz); g.add(c); } return m; }
function garland(g, ax, az, bx, bz, y = 230, sag = 50) { const n = Math.max(6, Math.round(Math.hypot(bx - ax, bz - az) / 45)), bm = glow(0xFFE29A), wm = glow(0x4A3A2A), pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n; pts.push(new THREE.Vector3(ax + (bx - ax) * u, y - Math.sin(u * Math.PI) * sag, az + (bz - az) * u)); if (i % 1 === 0) { const b = new THREE.Mesh(new THREE.SphereGeometry(6, 6, 4), bm); b.position.copy(pts[i]).y -= 7; g.add(b); } }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x4A3A2A })); g.add(line); return wm; }
function awning(g0, x0, x1, z, y, cols, depth = 110) { const g = occ(new THREE.Group()); g0.add(g); const n = Math.max(2, Math.round((x1 - x0) / 60)), w = (x1 - x0) / n; for (let i = 0; i < n; i++) { const m = mesh(new THREE.BoxGeometry(w, 6, depth), M(cols[i % cols.length]), x0 + w * (i + 0.5), y, z + depth / 2 - 10, g); m.rotation.x = 0.35; m.castShadow = false; } box(x1 - x0, 14, 8, cols[0], (x0 + x1) / 2, y - 26, z + depth - 4, g).castShadow = false; }
function roundSign(g, x, z, y = 240) { const s = occ(new THREE.Group()); s.position.set(x, y, z); s.rotation.y = Math.PI / 4; g.add(s); const d = mesh(new THREE.CylinderGeometry(60, 60, 10, 28).rotateX(Math.PI / 2), M(BRAND.accentHex), 0, 0, 0, s); d.castShadow = false; const lp = logoWall(90, 30, '#FF6720'); lp.position.z = 6; s.add(lp); box(8, 70, 8, 0x5A3A22, 0, -100, -10, s); return s; }
// ── 방 가구 (방문형 방 · 작업실)
const FURN = {
  crew(g, r, I) { const [x0, z0] = r; for (let i = 0; i < 4; i++) { box(70, 190, 50, i % 2 ? 0xFF8A3C : 0x8A9AA4, x0 + 90 + i * 76, 0, z0 + 40, g); box(30, 6, 2, 0xFFFFFF, x0 + 90 + i * 76, 150, z0 + 66, g); }
    box(240, 46, 80, 0xFF8A3C, x0 + 430, 0, z0 + 625, g); box(240, 60, 20, 0xE8742A, x0 + 430, 40, z0 + 662, g); plant(g, x0 + 40, z0 + 650, 0.8);
    const wd = new THREE.Group(); wd.position.set(x0 + 40, 0, z0 + 300); g.add(wd); box(50, 210, 150, 0x9A643A, 0, 0, 0, wd); box(6, 4, 130, 0xC8A050, 26, 180, 0, wd); for (let i = 0; i < 4; i++) box(10, 70, 26, [0xFF6720, 0xF3E7D6, 0x2E3A5A, 0x6A4426][i], 22, 100, -48 + i * 32, wd);   /* 유니폼 옷장 */
    box(130, 90, 6, 0xF6EEDC, x0 + 450, 120, z0 + 18, g); for (let i = 0; i < 3; i++) box(26, 20, 2, [0xFFE27A, 0xBFE3F2, 0xF6D6E8][i], x0 + 410 + i * 40, 160, z0 + 22, g); },
  boss(g, r, I) { const [x0, z0, x1, z1] = r; box(200, 80, 90, 0x5A3A22, x0 + 370, 0, z0 + 700, g); box(210, 10, 100, 0x7A5032, x0 + 370, 80, z0 + 700, g); box(60, 40, 6, 0x2A2A30, x0 + 370, 90, z0 + 680, g); box(70, 110, 60, 0x9A643A, x0 + 370, 0, z0 + 780, g);   /* 지점 계약 책상 · 의자 */
    const sf = new THREE.Group(); sf.position.set(x0 + 90, 0, z1 - 120); g.add(sf); box(120, 130, 110, 0x3A3E44, 0, 0, 0, sf); box(124, 10, 114, 0x2A2E34, 0, 130, 0, sf); mesh(new THREE.CylinderGeometry(22, 22, 6, 20).rotateZ(Math.PI / 2), M(0xE8B23A), 62, 70, 0, sf); box(4, 70, 4, 0xC8A050, 62, 50, 30, sf); sf.userData.safe = true;   /* 금고 */
    box(220, 130, 6, 0xEDE3D0, x0 + 300, 110, z0 + 18, g); for (let i = 0; i < 4; i++) sph(9, BRAND.accentHex, x0 + 220 + i * 50, 170 - (i % 2) * 30, z0 + 24, g, 8, 6); box(160, 3, 2, 0x9A643A, x0 + 300, 150, z0 + 23, g);   /* 매장 찾기 지도 */
    for (let i = 0; i < 3; i++) box(46, 170, 40, 0x7A5032, x1 - 70, 0, z0 + 140 + i * 50, g); },
  store(g, r) { const [x0, z0, x1, z1] = r; for (let i = 0; i < 3; i++) boxShelf(g, x0 + 140 + i * 200, z0 + 40); for (let i = 0; i < 5; i++) { const x = x1 - 120 - (i % 2) * 70, z = z1 - 130 - Math.floor(i / 2) * 70; box(56, 44, 56, 0xC8A070, x, Math.floor(i / 4) * 44, z, g); box(58, 6, 10, 0xE8C090, x, 44 + Math.floor(i / 4) * 44, z, g); }
    box(200, 14, 140, 0xB08A5A, x0 + 300, 0, z1 - 140, g); },
  dough(g, r) { const [x0, z0] = r; for (let i = 0; i < 3; i++) { box(60, 40, 40, 0xF2EAD8, x0 + 560 - i * 30, i * 30, z0 + 60, g); } const rk = new THREE.Group(); rk.position.set(x0 + 70, 0, z0 + 330); g.add(rk); for (const y of [30, 80, 130, 180]) { box(70, 4, 120, 0xC8CED4, 0, y, 0, rk); for (let i = 0; i < 3; i++) sph(12, 0xFFF4E2, 0, y + 8, -40 + i * 40, rk, 8, 6).scale.set(1, 0.6, 1); } noShadow(rk); },
  cream(g, r) { const [x0, z0] = r; box(500, 8, 40, 0x9A643A, x0 + 330, 170, z0 + 26, g); for (let i = 0; i < 9; i++) cyl(14, 14, 30, [0xFFFBF2, 0xB49AD8, 0xF2E2D6, 0xE6F2C8][i % 4], x0 + 110 + i * 55, 178, z0 + 26, g, 10); chalk(g, x0 + 560, 140, z0 + 20, 0, 110); },
  cafe(g, r) { const [x0, z0, x1] = r; box(70, 90, 300, 0x5A3A22, x1 - 55, 0, z0 + 450, g); box(80, 10, 310, 0x9A643A, x1 - 55, 90, z0 + 450, g); for (let i = 0; i < 5; i++) cyl(10, 8, 22, 0xFFFFFF, x1 - 55, 100, z0 + 330 + i * 60, g, 10); chalk(g, x0 + 420, 130, z0 + 20, 0, 140); },   /* 0.3.2: 바 카운터는 오른쪽 벽에 붙임 (방 가운데 = 걷는 길) */
};
// ── 지점 소품 세트 (계획안 2-2)
const PROPS = {
  oak(g, open) { plant(g, -210, 420, 1.15); plant(g, 610, 410, 0.9); for (const [x, z] of [[-215, 250], [-215, 330]]) { const c = new THREE.Group(); c.position.set(x, 0, z); g.add(c); cyl(26, 22, 44, 0xD8B07A, 0, 0, 0, c, 10); cyl(28, 28, 6, 0xC89A60, 0, 44, 0, c, 10); noShadow(c); }   /* 라탄 의자 */
    const h = new THREE.Group(); h.position.set(-235, 0, 200); g.add(h); box(6, 200, 26, 0xFFFFFF, 0, 0, 0, h); for (let i = 0; i < 9; i++) box(8, 2, i % 3 ? 10 : 20, [0xFF6720, 0x5AB0E8, 0x9ACF6A][i % 3], 4, 20 + i * 20, 0, h); noShadow(h);   /* 아이 키 재는 벽 */
    if (open.has('hall')) { plant(g, -610, -400, 1); plant(g, -600, 410, 1.1); } },
  classic(g, open) { for (const z of [-900, -700]) { const s = new THREE.Group(); s.position.set(-1232, 0, z); g.add(s); for (const y of [120, 170, 220]) { box(40, 6, 170, 0x5A3A22, 0, y, 0, s); for (let i = 0; i < 3; i++) { const b = cyl(20, 16, 24, 0xC8A070, 6, y + 6, -50 + i * 50, s, 10); } } noShadow(s); }   /* 빵 바구니 벽 선반 */
    const f = new THREE.Group(); f.position.set(330, 150, -432); g.add(f); box(110, 80, 6, 0xC8A050, 0, 0, 0, f); box(96, 66, 2, 0xF3E7D6, 0, 7, 4, f); box(60, 6, 2, 0x5A3A22, 0, 40, 6, f); noShadow(f);   /* 본점 개업 액자 */
    chalk(g, -240, 90, -60, Math.PI / 2, 100); plant(g, 610, 410, 0.9, 0x5A3A22); },
  modern(g, open) { const n = new THREE.Group(); n.position.set(200, 210, -1132); g.add(n); const nm = glow(0xFF7A3A); const t1 = new THREE.Mesh(new THREE.TorusGeometry(26, 5, 6, 16, Math.PI), nm); t1.position.x = -26; n.add(t1); const t2 = t1.clone(); t2.position.x = 26; n.add(t2); for (const x of [-52, 0, 52]) { const l = new THREE.Mesh(new THREE.BoxGeometry(10, 30, 10), nm); l.position.set(x, -15, 0); n.add(l); }   /* 네온 m */
    for (let i = 0; i < 2; i++) { const s = new THREE.Group(); s.position.set(610, 0, -280 + i * 640); g.add(s); for (const y of [40, 100, 160]) box(60, 4, 140, 0xD6DDE2, 0, y, 0, s); for (let k = 0; k < 6; k++) box(40, 30, 36, 0xFFFFFF, 0, 44 + Math.floor(k / 2) * 60, -36 + (k % 2) * 60, s); noShadow(s); }   /* 스테인리스 상자 선반 */
    box(90, 30, 160, 0xE6E2DC, 600, 0, 150, g); for (let i = 0; i < 18; i++) box(5, 2, 5, [0xC8B8A8, 0x9AA4AC, 0xE8B98A][i % 3], 565 + (i * 37) % 70, 30, 80 + (i * 23) % 140, g); },   /* 테라조 진열대 (오른쪽 벽 쪽 · 0.3.2) */
  forest(g, open) { for (const [x, z] of [[-220, 420], [620, 420], [-220, -420]]) { const p = new THREE.Group(); p.position.set(x, 0, z); g.add(p); box(70, 50, 70, 0xB98A5A, 0, 0, 0, p); sph(48, 0x7FBF6A, 0, 90, 0, p, 10, 8); }
    const hp = [[0, -200], [300, -150], [-120, 150]]; for (const [x, z] of hp) { const p = new THREE.Group(); p.position.set(x, 230, z); g.add(p); cyl(18, 14, 20, 0xE7B98A, 0, 0, 0, p, 10); for (let i = 0; i < 5; i++) { const l = sph(8, 0x6FAF5A, Math.cos(i) * 14, -10 - i * 8, Math.sin(i) * 14, p, 6, 4); } const c = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 80, 4), glow(0x5A4A3A)); c.position.y = 50; p.add(c); noShadow(p); }   /* 행잉 플랜트 */ },
};
// ── 외관 · 거리 (지점마다)
const EXT = {
  awning(g, I) { awning(g, -250, 300, 450, 250, [0xFFFFFF, 0xF4F0EA]); roundSign(g, 600, 520); floor(g, [-250, 450, 1250, 1500], 'paving', '#E8DFD2', '#E8DFD2', '#D2C6B4', -2, 300); for (const x of [-120, 780, 1180]) tree(g, x, 1300, 1); for (let i = 0; i < 4; i++) { box(180, 400, 140, 0xEDE3D6, -600 + i * 240, 0, 1520, g); for (let f = 0; f < 5; f++) box(150, 26, 4, 0xBFD8E6, -600 + i * 240, 60 + f * 70, 1449, g).castShadow = false; } },   /* 아파트 상가 산책로 (창) */
  stripe(g, I) { awning(g, -250, 300, 450, 250, [BRAND.accentHex, 0xFFFFFF]); floor(g, [-250, 450, 1250, 1500], 'paving', '#E2DED6', '#E2DED6', '#CAC2B6', -2, 300);
    const lk = new THREE.Mesh(new THREE.BoxGeometry(2400, 6, 1500), new THREE.MeshLambertMaterial({ color: 0x9CC8E2 })); lk.position.set(-2500, -6, 900); g.add(lk); box(2400, 8, 40, 0xD8D0C4, -2500, -6, 140, g);   /* 석촌호수 */
    for (const [x, z] of [[-1400, 300], [-1400, 700], [-80, 1300], [800, 1300], [1300, 1250]]) tree(g, x, z, 1, 0xF6B8C8); },   /* 벚나무 */
  glass(g, I) { const gm = new THREE.MeshLambertMaterial({ color: 0xCFE8F2, transparent: true, opacity: 0.35 }); for (const [a, b] of [[-250, 240]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(b - a, 230, 8), gm); p.position.set((a + b) / 2, 115, 452); g.add(p); for (let x = a; x <= b; x += 122) box(6, 230, 10, 0xC8CCCC, x, 0, 452, g); }
    const sb = occ(new THREE.Group()); sb.position.set(620, 300, 470); g.add(sb); box(220, 70, 30, 0xFFFFFF, 0, 0, 0, sb); const lp = logoWall(180, 44, '#FFFFFF'); lp.material.color.set(0x222222); lp.position.z = 16; sb.add(lp); const gl = new THREE.Mesh(new THREE.BoxGeometry(230, 4, 34), glow(0xF4FAFF)); gl.position.y = -4; sb.add(gl);   /* 흰 박스 간판 */
    floor(g, [-1250, 450, 1600, 1500], 'bigtile', '#DCDEE0', '#D2D5D8', '#B8BCC0', -2, 300); for (const x of [-700, 0, 900]) { box(60, 330, 60, 0xC8CCCC, x, 0, 1320, g); } box(2900, 30, 40, 0xB8BCC0, 150, 300, 1320, g); },   /* 지하 상가 통로 */
  wood(g, I) { const s = occ(new THREE.Group()); s.position.set(560, 0, 560); g.add(s); for (const x of [-60, 60]) box(12, 200, 12, 0x7A5A3A, x, 0, 0, s); box(170, 60, 12, 0xB98A5A, 0, 170, 0, s); const lp = logoWall(130, 36, '#B98A5A'); lp.position.set(0, 200, 7); s.add(lp);   /* 나무 간판 */
    const ar = occ(new THREE.Group()); ar.position.set(230, 0, 1320); g.add(ar); for (const x of [-220, 220]) box(26, 260, 26, 0x7A5A3A, x, 0, 0, ar); mesh(new THREE.TorusGeometry(220, 14, 6, 20, Math.PI), M(0x7A5A3A), 0, 260, 0, ar); for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI; sph(20, 0x6FAF5A, Math.cos(a) * 220, 260 + Math.sin(a) * 220, 0, ar, 8, 6); }   /* 공원 입구 아치 */
    for (const [x, z] of [[-150, 1250], [900, 1250], [1350, 900], [-1400, 300], [-1400, 800]]) tree(g, x, z, 1.1); for (let i = 0; i < 3; i++) { const b = new THREE.Group(); b.position.set(-200 + i * 50, 0, 560); g.add(b); mesh(new THREE.TorusGeometry(22, 3, 6, 14), M(0x3A3A3A), 0, 26, 0, b); } },   /* 자전거 거치대 */
};
// ── 지점 특색 방 그림 (열렸을 때)
const FEAT = {
  pickup(g, r, I) { floor(g, r, 'deck', '#ECE2D3', '#E5D9C8', '#D2C3AE', 0, 300); awning(g, 900, 1240, 560, 230, [BRAND.accentHex, 0xFFFFFF], 90); chalk(g, 1200, 120, 900, -Math.PI / 2, 110); box(26, 30, 100, 0xE8E0D0, 1238, 120, 760, g); },
  drive(g, r, I) { floor(g, r, 'bigtile', '#E9EBEA', '#E1E4E3', '#C4C9C8', 0, 300); const road = new THREE.Mesh(new THREE.BoxGeometry(300, 6, 3400), new THREE.MeshLambertMaterial({ color: 0x5A5E66 })); road.position.set(1440, -4, 300); g.add(road);
    for (let z = -1200; z < 1900; z += 160) box(8, 2, 80, 0xFFFFFF, 1440, 0, z, g); const mb = new THREE.Group(); mb.position.set(1610, 0, 1100); g.add(mb); box(10, 160, 10, 0x3A3A3A, 0, 0, 0, mb); box(16, 110, 160, 0x24282A, 0, 150, 0, mb); for (let i = 0; i < 4; i++) box(4, 6, 110, i % 2 ? BRAND.accentHex : 0xFFFFFF, -10, 180 + i * 20, 0, mb); },
  up2(g, r, I) { const H = 150, [x0, z0, x1, z1] = r; const pl = floor(g, [x0, z0, STAIRS.x0, z1], 'check', I.fa, I.fb, I.line, H, 300); floor(g, [STAIRS.x0, STAIRS.z1, x1, z1], 'check', I.fa, I.fb, I.line, H, 300);
    occ(box(STAIRS.x0 - x0, H - 20, z1 - z0, 0x6A4A32, (x0 + STAIRS.x0) / 2, 0, (z0 + z1) / 2, g)); occ(box(x1 - STAIRS.x0, H - 20, z1 - STAIRS.z1, 0x6A4A32, (STAIRS.x0 + x1) / 2, 0, (STAIRS.z1 + z1) / 2, g));
    const n = 8, sd = (STAIRS.z1 - STAIRS.z0) / n; for (let i = 0; i < n; i++) box(STAIRS.x1 - STAIRS.x0, H * (i + 1) / n, sd + 2, i % 2 ? 0x8A5A3A : 0x9A6A44, (STAIRS.x0 + STAIRS.x1) / 2, 0, STAIRS.z0 + sd * (i + 0.5), g);   /* 계단 */
    for (let x = x0 + 40; x < STAIRS.x0; x += 60) box(6, 50, 6, 0xC8A050, x, H, z1 - 8, g); box(STAIRS.x0 - x0, 6, 8, 0xC8A050, (x0 + STAIRS.x0) / 2, H + 50, z1 - 8, g); for (let z = z0 + 40; z < z1; z += 60) box(6, 50, 6, 0xC8A050, x0 + 8, H, z, g); box(8, 6, z1 - z0, 0xC8A050, x0 + 8, H + 50, (z0 + z1) / 2, g);   /* 황동 난간 · 호수 쪽 */
    box(STAIRS.x0 - x0, 6, 8, 0xC8A050, (x0 + STAIRS.x0) / 2, H + 50, z0 + 4, g); for (let z = STAIRS.z0; z < STAIRS.z1; z += 60) box(6, 50, 6, 0xC8A050, STAIRS.x0, H * (z - STAIRS.z0) / (STAIRS.z1 - STAIRS.z0), z, g);
    chandelier(g, -850, 780); },
  terrace(g, r, I) { floor(g, r, 'deck', '#ECE3D7', '#E6DCCE', '#D3C5B3', 0, 260); for (const [x, z] of [[-1180, 500], [-1180, 1000], [-300, 1000]]) { box(10, 260, 10, 0x7A5A3A, x, 0, z, g); } garland(g, -1180, 500, -1180, 1000, 250); garland(g, -1180, 1000, -300, 1000, 250); garland(g, -1180, 500, -300, 1000, 255, 70);
    for (const [x, z] of [[-1200, 760], [-700, 1020], [-420, 560]]) { const p = new THREE.Group(); p.position.set(x, 0, z); g.add(p); box(80, 50, 60, 0xB98A5A, 0, 0, 0, p); sph(46, 0x7FBF6A, 0, 80, 0, p, 10, 8); }
    for (const [x, z, c] of [[-640, 560, BRAND.accentHex], [-1180, 960, 0x6FAF5A]]) { const u = occ(new THREE.Group()); u.position.set(x, 0, z); g.add(u); cyl(4, 4, 220, 0xE8E0D0, 0, 0, 0, u, 6); mesh(new THREE.ConeGeometry(120, 44, 12), M(c), 0, 230, 0, u); } },
};
/* 공사장: 비계 · 가림막 · 콘 · 크레인 팔 */
function site(g, r) { const [x0, z0, x1, z1] = r, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, s = new THREE.Group(); g.add(s);
  floor(s, r, 'concrete', '#D8D2C8', '#C8C2B8', '#BEB6AA', 1, 300);
  for (const [x, z] of [[x0 + 60, z0 + 60], [x1 - 60, z0 + 60], [x0 + 60, z1 - 60], [x1 - 60, z1 - 60]]) box(12, 220, 12, 0xC8A050, x, 0, z, s);
  for (const y of [100, 200]) { box(x1 - x0 - 100, 8, 12, 0xC8A050, cx, y, z0 + 60, s); box(12, 8, z1 - z0 - 100, 0xC8A050, x0 + 60, y, cz, s); }
  for (let i = 0; i < 6; i++) box(46, 12, 46, [0xFF6720, 0xFFFFFF][i % 2], x0 + 100 + i * 60, 0, z1 - 40, s);
  for (const [x, z] of [[cx - 80, cz], [cx + 60, cz + 70]]) { cyl(4, 22, 50, 0xFF6720, 0, 0, 0, s, 8).position.set(x, 25, z); }
  box(120, 60, 80, 0xB08A5A, cx + 40, 0, cz - 80, s); box(80, 80, 60, 0xE8E2D6, cx - 100, 0, cz - 90, s); return noShadow(s); }
// ── 전체 그리기 · open: 열린 방 · build: 공사 중인 방 · I: 지점 인테리어 · set: 테마 세트 id
export function drawWorld(sc, B, open, build, setId) {
  const g = new THREE.Group(); g.name = 'world'; sc.add(g); const I0 = B.interior, ts = THEME_SETS.find(t => t.id === setId), I = ts ? { ...I0, fa: ts.floor[0], fb: ts.floor[1], line: ts.floor[1], wallC: ts.wall, wallB: ts.wall, trim: ts.trim } : I0;
  const ground = new THREE.Mesh(new THREE.BoxGeometry(14000, 10, 14000), M(I.lawn ? 0xBFD9A8 : I0.ground)); ground.position.set(0, -16, 0); ground.receiveShadow = true; g.add(ground);
  if (I.lawn) floor(g, [-2000, -2000, 2600, 2600], 'grass', '#CFE0BF', '#C4D8B2', '#BAD0A6', -6, 260);
  EXT[I0.ext](g, I);
  /* 건물 바닥: 모든 방 (잠긴 방 = 밝은 맨바닥 + 점선) */
  const feat = B.feature, all = ['shop', 'dough', 'cream', 'cafe', 'hall', 'crew', 'boss', 'store', feat];
  for (const id of all) { const R = ROOMS[id], r = R.rect, on = open.has(id);
    if (build && build.has(id)) { site(g, r); continue; }
    if (!on) { if (!R.feature) floor(g, r, 'concrete', '#ECE6DC', '#E2DBCF', '#DDD5C8', -3, 400); dashed(g, r); continue; }
    if (R.feature) { FEAT[feat](g, r, I); continue; }
    if (id === 'crew') floor(g, r, 'mint', '#F1F5F2', '#F1F5F2', '#D2E4DB', 0, 260);
    else if (id === 'boss') floor(g, r, 'parquet', '#ECE4DA', '#E5DBCF', '#D2C4B4', 0, 260);
    else if (id === 'store') floor(g, r, 'concrete', '#D8D4CC', '#C8C2B8', '#BAB2A6', 0, 300);
    else floor(g, r, I.floor, I.fa, I.fb, I.line, 0, I.floor === 'check' ? 300 : 400);
    if (FURN[id]) { const fg = new THREE.Group(); fg.userData.furn = id; g.add(fg); FURN[id](fg, r, I); } }   /* 가구 묶음 표시: flow_check 가 걷는 길 위 가구를 찾음 */
  /* 바깥 벽 (뒤 · 왼쪽) — 지점 벽 재질 + 창 */
  wall(g, -1250, -1150, 1250, -1150, 260, I); wall(g, -1250, -1150, -1250, 450, 260, I);
  for (let x = -1050; x < 1200; x += 420) { if (Math.abs(x - 470) < 200) continue; box(200, 110, 8, 0xBFE3F2, x, 90, -1132, g).castShadow = false; box(210, 8, 12, 0xFFFFFF, x, 86, -1130, g).castShadow = false; }
  return g; }
/* 벽(방 · 로고 벽 · 2층 난간)과 지점 조명 · 소품 — 방이 열릴 때마다 다시 */
export function drawWalls(g, B, G, open, opt = {}) { const I = B.interior;
  for (const w of G.walls) { if (w.h <= 50) continue; const x0 = w.x - w.hw, x1 = w.x + w.hw, z0 = w.z - w.hd, z1 = w.z + w.hd, ax = w.hw > w.hd; wall(g, ax ? x0 : w.x, ax ? w.z : z0, ax ? x1 : w.x, ax ? w.z : z1, w.h, I, !w.front); }
  const hs = occ(new THREE.Group()); hs.position.set(450, 300, -420); hs.rotation.y = 0; g.add(hs); const lw = logoWall(200, 80, opt.owned ? '#2A2A2E' : '#8E8C88'); lw.position.z = 4; hs.add(lw); box(212, 92, 6, opt.owned ? 0x1A1A1E : 0x6E6C68, 0, -46, 0, hs); for (const x of [-80, 80]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 120, 4), glow(0x4A4A4A)); c.position.set(x, 100, 0); hs.add(c); } if (opt.owned) { const t = new THREE.Mesh(new THREE.BoxGeometry(200, 6, 4), glow(0xFF6720)); t.position.set(0, -46, 5); hs.add(t); }   /* 회색 판 흰 로고 (실제 매장 공통) = 오븐 위에 매단 간판 · 바닥은 비움 */   /* 소장 전용 「TOKYO 블랙 간판」 · 회색 벽 흰 로고 (실제 매장 공통) */
  chalk(g, 600, 30, 430, Math.PI / 4, 80); boxShelf(g, -150, -1110, 0, 2);   /* 검은 칠판 가격표 · 주황 m 상자 선반 (로고 벽 앞) */
  const L = I.light;
  if (L === 'pendant') { for (const [x, z] of [[70, 310], [250, 80], [-60, 60]]) pendant(g, x, z); if (open.has('hall')) for (const z of [-260, 30, 320]) pendant(g, -450, z); }
  if (L === 'brass') { for (const x of [-900, -400, 100, 900]) sconce(g, x, -1132, 0); for (const z of [-900, -300]) sconce(g, -1232, z, Math.PI / 2); chandelier(g, 120, 160); if (open.has('hall')) chandelier(g, -450, 30); }
  if (L === 'led') { led(g, -200, -100, 600, -100); led(g, -200, 250, 600, 250); if (open.has('hall')) led(g, -450, -400, -450, 400); if (open.has('cream')) led(g, 50, -800, 600, -800); }
  if (L === 'garland') { garland(g, -240, -440, 640, -440, 240, 40); garland(g, -240, 440, 640, 440, 240, 60); garland(g, -240, -440, -240, 440, 245, 50); }
  const pg = new THREE.Group(); pg.userData.furn = 'props'; g.add(pg); PROPS[I.props](pg, open); }
