// 매장 그리기 (고정된 것): 바닥 한 톤 · 벽(뒤 · 동 = 높게, 서 · 남 = 0.4m 턱) · 문 매트 · 화분 띠 · 반쪽 문 · 별채 · 거리 · 창구 · 2층 · 테라스 · 지점 인테리어
//   명도 3층(DESIGN 7장): 바닥(가장 밝고 한 톤) → 설비(중간) → 물건(가장 선명) · 매장 안 벽 0
import * as THREE from 'three';
import { box, cyl, sph, M, mesh, logoPanel, STATION, DECO_MODEL } from './models.js?v=0.99.29';
import { BRAND, THEME_SETS, DECO } from './data.js?v=0.99.29';
import { ANNEX_WALLS } from './space.js?v=0.99.29';

const flat = c => new THREE.MeshToonMaterial({ color: c });
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const plane = (p, w, d, mat, x, z, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat); m.position.set(x, y, z); m.receiveShadow = true; p.add(m); return m; };
const rectP = (p, r, mat, y = 0) => plane(p, r[2] - r[0], r[3] - r[1], mat, (r[0] + r[2]) / 2, (r[1] + r[3]) / 2, y);
const wallBox = (p, r, h, c) => box(r[2] - r[0], h, r[3] - r[1], c, (r[0] + r[2]) / 2, 0, (r[1] + r[3]) / 2, p);

export function buildWorld(sc, sp, B, themeId) {
  const g = new THREE.Group(); g.name = 'world'; sc.add(g);
  const I0 = B.interior, ts = THEME_SETS.find(t => t.id === themeId), I = ts ? { ...I0, fa: ts.floor[0], fb: ts.floor[1], line: ts.floor[1], wallC: ts.wall, wallB: ts.wall, trim: ts.trim } : I0;
  sc.background = new THREE.Color(I.sky);
  const H = sp.hall, A = sp.annex, D = sp.door;
  // 땅 · 거리 · 인도
  plane(g, 9000, 9000, flat(I.ground), 600, 900, -3);
  plane(g, 3400, 700, flat(0xDCD3C3), 600, H.d + 380, -1);
  plane(g, 600, 2600, flat(0xDCD3C3), H.w + 300, 900, -1);
  if (sp.window && sp.window.kind === 'car') { plane(g, 260, 3200, flat(0x8E8A86), H.w + 290, 800, 0); for (let z = -600; z < 2300; z += 160) plane(g, 10, 80, flat(0xFFFFFF), H.w + 290, z, 0.5); }
  // 본관 바닥: 한 톤 + 아주 옅은 줄눈 (대비 ≤ 6%)
  const floorT = canvasTex(256, 256, (x, w, h) => { x.fillStyle = I.fa; x.fillRect(0, 0, w, h); x.globalAlpha = 0.35; x.fillStyle = I.line; if (I.floor === 'plank') for (let i = 0; i < 4; i++) x.fillRect(0, i * 64, w, 2); else { x.fillRect(0, 0, w, 2); x.fillRect(0, 0, 2, h); } });
  floorT.wrapS = floorT.wrapT = THREE.RepeatWrapping; floorT.repeat.set(H.w / 200, H.d / 200);
  rectP(g, [0, 0, H.w, H.d], new THREE.MeshToonMaterial({ map: floorT }), 0);
  // 별채 바닥 (방마다 조금 다른 톤) — 잠긴 방은 공사 천으로 덮음 (setRooms)
  const cloth = {};
  for (const [k, r] of Object.entries(sp.rooms)) { rectP(g, r.rect, flat(k === 'boss' ? 0xE6DACB : k === 'crew' ? 0xE9DFD0 : 0xE2D7C6), 0.5);
    const c = new THREE.Group(); c.position.set((r.rect[0] + r.rect[2]) / 2, 0, (r.rect[1] + r.rect[3]) / 2); const w = r.rect[2] - r.rect[0] - 30, d = r.rect[3] - r.rect[1] - 30;
    /* 잠긴 별채 방: 낮은 공사 띠(30cm) + 흐린 바닥 + 책상 실루엣 — 화면을 가리지 않음 */
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8A7A66, transparent: true, opacity: 0.25, depthWrite: false })); fl.position.y = 2; c.add(fl);
    const sil = new THREE.Group(); sil.position.set(r.desk[0] - (r.rect[0] + r.rect[2]) / 2, 0, r.desk[1] - 80 - (r.rect[1] + r.rect[3]) / 2); STATION.desk(sil); sil.traverse(o => { if (o.isMesh) { o.material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.3, depthWrite: false }); o.castShadow = false; } }); c.add(sil);
    const st = canvasTex(256, 64, (x, W, Hh) => { x.fillStyle = '#E7A33A'; x.fillRect(0, 0, W, Hh); x.fillStyle = '#2A2A2A'; for (let i = -2; i < 12; i++) { x.beginPath(); x.moveTo(i * 32, Hh); x.lineTo(i * 32 + 16, Hh); x.lineTo(i * 32 + 32, 0); x.lineTo(i * 32 + 16, 0); x.fill(); } });
    for (const [tw, td, tx, tz] of [[w, 6, 0, -d / 2], [w, 6, 0, d / 2], [6, d, -w / 2, 0], [6, d, w / 2, 0]]) { const tape = new THREE.Mesh(new THREE.BoxGeometry(tw, 14, td), new THREE.MeshBasicMaterial({ map: st })); tape.position.set(tx, 30, tz); c.add(tape); } g.add(c); cloth[k] = c; }
  // 벽: 뒤(북) · 동 = 높게 (카메라 반대쪽) · 서 · 남 = 낮은 턱 (안을 가리지 않음) · 매장 안 칸막이 0
  const WC = I.wallC, TR = I.trim, WH = 300, LH = 40;
  wallBox(g, [-15, -25, H.w + 25, 0], WH, WC); box(H.w + 40, 18, 27, TR, H.w / 2, 0, -12, g);
  wallBox(g, [H.w, 0, H.w + 25, H.d], WH, WC); box(27, 18, H.d, TR, H.w + 12, 0, H.d / 2, g);
  if (sp.window) { const r = sp.window.rect; const hole = new THREE.Mesh(new THREE.BoxGeometry(30, 120, r[3] - r[1] - 20), new THREE.MeshBasicMaterial({ color: 0xBFE3F2 })); hole.position.set(H.w + 12, 150, (r[1] + r[3]) / 2); g.add(hole); }
  if (I.wall === 'wainscot') { box(H.w, 110, 6, I.wain, H.w / 2, 0, 3, g); box(6, 110, H.d, I.wain, H.w - 3, 0, H.d / 2, g); }
  if (I.wall === 'louver') for (let x = 40; x < H.w; x += 60) box(14, 220, 8, I.wood, x, 30, 6, g);
  if (I.wall === 'vtile') for (let x = 20; x < H.w; x += 40) box(2, WH - 20, 3, I.grout, x, 10, 2, g);
  const cd = sp.rooms.crew.door;
  const low = (r) => wallBox(g, r, LH, TR);
  low([-25, 0, 0, cd[1]]); low([-25, cd[3], 0, H.d]);
  const sx = sp.terrace ? [[-25, sp.terrace.door[0]], [sp.terrace.door[1], D.x0], [D.x1, H.w + 25]] : [[-25, D.x0], [D.x1, H.w + 25]];
  for (const [a, b] of sx) low([a, H.d, b, H.d + 25]);
  // 별채 벽 (낮게 — 위에서 들여다봄)
  wallBox(g, [A.x0 - 25, -25, 0, 0], 180, WC); wallBox(g, [A.x0 - 25, 0, A.x0, A.z1], 60, TR); wallBox(g, [A.x0 - 25, A.z1, 0, A.z1 + 25], LH, TR);
  for (const w of ANNEX_WALLS) { wallBox(g, [A.x0, w.z - 12, w.gap[0], w.z + 12], 60, TR); wallBox(g, [w.gap[1], w.z - 12, 0, w.z + 12], 60, TR); }
  // 뒤 벽 로고 (오븐 위) · 칠판
  const lp = logoPanel(300, 94); lp.position.set(940, 236, 6); g.add(lp);
  box(130, 90, 6, 0x2A3A32, 1500, 170, 4, g); box(140, 8, 10, 0xC08A5A, 1500, 260, 4, g);
  // 문 매트: OUT ↓ (왼쪽) · ↑ IN (오른쪽)
  const mt = canvasTex(512, 160, (x, w, h) => { x.fillStyle = '#E8C9A0'; x.fillRect(0, 0, w, h); x.fillStyle = '#A87A4A'; x.font = '900 70px sans-serif'; x.textAlign = 'center'; x.fillText('OUT ↓', w * 0.27, 108); x.fillText('↑ IN', w * 0.7, 108); });
  rectP(g, [D.x0, H.d - 150, D.x1, H.d], new THREE.MeshToonMaterial({ map: mt }), 1);
  // 낮은 화분 띠 · 반쪽 문 (직원 통로)
  for (const r of sp.planters) { const w = r[2] - r[0], d = r[3] - r[1]; wallBox(g, r, 45, 0xC8A27A); const n = Math.max(1, Math.round(Math.max(w, d) / 110));
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, s = sph(30, i % 2 ? 0x7FBF6A : 0x6AAE5C, w > d ? r[0] + w * t : (r[0] + r[2]) / 2, 62, w > d ? (r[1] + r[3]) / 2 : r[1] + d * t, g, 10, 8); s.scale.y = 0.7; } }
  { const P = sp.pass; box(P.x1 - P.x0 - 30, 55, 6, 0xD9C3A5, (P.x0 + P.x1) / 2, 0, (P.z0 + P.z1) / 2, g); }
  // 바깥 (지점 외관): 어닝 · 유리 · 나무 등 (남쪽 벽 바깥, 낮게)
  const ext = I.ext; if (ext === 'awning' || ext === 'stripe') for (let x = 0; x < H.w; x += 80) box(78, 8, 60, (x / 80) % 2 ? 0xFFFFFF : BRAND.accentHex, x + 40, 46, H.d + 50, g);
  if (I.lake) { const lk = new THREE.Mesh(new THREE.CircleGeometry(500, 32).rotateX(-Math.PI / 2), flat(0xA8D4EC)); lk.scale.set(1.6, 1, 0.7); lk.position.set(-1100, 0, 2100); g.add(lk); }
  if (I.cherry) for (const [x, z] of [[-200, 2000], [1900, 1900], [1900, -200]]) { cyl(12, 16, 200, 0x7A5A3A, x, 0, z, g); sph(110, 0xF6C8D4, x, 260, z, g, 12, 10); }
  if (I.lawn) for (const [x, z] of [[-900, 1700], [1950, 300], [1950, 1500]]) { cyl(14, 18, 180, 0x6A4A2A, x, 0, z, g); sph(120, 0x8FC27A, x, 260, z, g, 12, 10); }
  // 조명: 천장 조명은 그리지 않음 (위에서 보면 바닥 물건처럼 보여 명도 3층을 흐림) · 지점 분위기는 벽 · 바깥 · 빛 색으로
  // 창구 (1 · 3호점) · 2층 (2호점) · 테라스 (4호점) — 몸통은 열려야 보임 (game 이 붙임)
  const feat = new THREE.Group(); g.add(feat);
  if (sp.window) { const r = sp.window.rect, w = new THREE.Group(); w.position.set((r[0] + r[2]) / 2, 0, (r[1] + r[3]) / 2); STATION.window(w); feat.add(w); }
  if (sp.upper) { const U = sp.upper, s = U.stairs, n = 12; for (let i = 0; i < n; i++) { const z0 = s[1] + (s[3] - s[1]) * i / n; box(s[2] - s[0], U.y * (i + 1) / n, (s[3] - s[1]) / n, i % 2 ? 0xB98A5A : 0xA87A4A, (s[0] + s[2]) / 2, 0, z0 + (s[3] - s[1]) / n / 2, feat); }
    const dk = U.deck; box(dk[2] - dk[0], 16, dk[3] - dk[1], 0xC8A27A, (dk[0] + dk[2]) / 2, U.y - 16, (dk[1] + dk[3]) / 2, feat); for (const [x, z] of [[dk[0] + 20, dk[1] + 20], [dk[2] - 20, dk[1] + 20], [dk[0] + 20, dk[3] - 20], [dk[2] - 20, dk[3] - 20]]) box(20, U.y - 16, 20, 0x8A6A44, x, 0, z, feat);
    box(dk[2] - dk[0] - 70, 40, 8, 0xFFFFFF, (dk[0] + 70 + dk[2]) / 2, U.y, dk[3], feat);   /* 남쪽 난간 (서쪽 끝은 바깥 계단 입구) */
    for (let i = 0; i < 10; i++) box(70, U.y * (10 - i) / 10, 30, i % 2 ? 0xB98A5A : 0xA87A4A, U.outX, 0, dk[3] + 15 + i * 30, feat);   /* 바깥 계단 (데크 → 거리) */ box(8, 40, dk[3] - dk[1], 0xFFFFFF, dk[0], U.y, (dk[1] + dk[3]) / 2, feat); }
  if (sp.terrace) { const T = sp.terrace, dk = T.deck; box(dk[2] - dk[0], 8, dk[3] - dk[1], 0xC8A27A, (dk[0] + dk[2]) / 2, 0, (dk[1] + dk[3]) / 2, feat); for (let x = dk[0] + 30; x < dk[2]; x += 60) box(3, 9, dk[3] - dk[1], 0xB08A5A, x, 0, (dk[1] + dk[3]) / 2, feat);
    for (const [x, z] of [[dk[0] - 40, dk[1] + 60], [dk[2] + 40, dk[3] - 40]]) { cyl(14, 18, 200, 0x6A4A2A, x, 0, z, feat); sph(100, 0x7FB86A, x, 260, z, feat, 12, 10); } }
  feat.visible = false;
  // 별채 책상 (방이 열리면 보임)
  const desks = {}; for (const [k, r] of Object.entries(sp.rooms)) { const d = new THREE.Group(); d.position.set(r.desk[0], 0, r.desk[1] - 80); STATION.desk(d); g.add(d); desks[k] = d; d.visible = false; }
  // 고정 소품: 쓰레기통 · 생지 바구니 · 냉동 생지 선반 (반죽기 · 데치기 자리 앞에 두지 않음)
  const bin = new THREE.Group(); bin.position.set(sp.bin.at[0], 0, sp.bin.at[1]); STATION.bin(bin); g.add(bin);
  const frozen = new THREE.Group(); frozen.position.set(770, 0, 30); STATION.frozen(frozen); g.add(frozen);
  return { g, cloth, desks, feat, frozen,
    setOpen(open, roomOpen, featOn) { for (const [k, c] of Object.entries(cloth)) c.visible = !roomOpen(k); for (const [k, d] of Object.entries(desks)) d.visible = roomOpen(k); feat.visible = !!featOn; frozen.visible = !open('kettle'); } };
}
/* 꾸미기 소품 (정해진 자리) */
export function buildDeco(sc, sp, own, open) {
  const g = new THREE.Group(); g.name = 'deco'; sc.add(g);
  for (const id of own || []) { const d = DECO.find(x => x.id === id); if (!d || !DECO_MODEL[d.id]) continue;
    if (!d.pos) { for (const t of sp.tables) if (open(t.id)) { const v = new THREE.Group(); v.position.set(t.x, 83, t.z); DECO_MODEL.vase(v); g.add(v); } continue; }
    const m = new THREE.Group(); m.position.set(d.pos[0], 0, d.pos[1]); if (d.wall === 'left') m.rotation.y = 0; if (d.wall === 'back') m.rotation.y = -Math.PI / 2; DECO_MODEL[d.id](m);
    if (sp.upper && d.pos[0] < 200 && d.pos[1] > 1100) m.position.x += 200; g.add(m); }
  return g;
}
