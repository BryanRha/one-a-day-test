// 설비 단계 모습 (기준판 재정비 ② · team/dev/tasks/261112-marumi-rebase/plan.md 3-1 · 대표 11-12 「시설 업그레이드 하면 룩도 다르게」)
//   단계 = 그 설비 업그레이드 Lv 0~2 기본 · 3~5 브랜드 · 6~8 프로 · 9~10 마스터 (data.js TIER_AT) — 단계마다 몸체 모델을 통째로 바꿈
//   지킬 것: 충돌(game.js SIZE) · 물건이 놓이는 자리와 높이(오븐 앞 받침 · 토핑 바 · 냉장고 · 커피 상판 · 계산대 진열)는 모든 단계가 같음
//            모습의 바닥 크기는 기본 모습 안쪽 (tools/gate_look.mjs L1) — 모습이 커져도 막히는 길이 생기지 않음
//   작은 변화(매 단계): 효과와 같은 것이 보임 — 오븐 판 · 불빛 / 반죽기 속도 눈금 · 도는 빠르기 / 솥 안 베이글 · 김 / 토핑 병 / 냉장고 컵 / 커피 잔 / 계산대 메뉴 카드
import * as THREE from 'three';
import { M, box, cyl, sph, mesh, logoPanel, STATION } from './models.js?v=0.99.41';
import { BRAND } from './data.js?v=0.99.41';

const OR = BRAND.accentHex, OR2 = 0xE2581C, BR = 0x5A3A22, CR = 0xF6EDE2, TILE = 0xFFF8F0, ST = 0xD8DEE3, ST2 = 0xB4BEC6, BK = 0x2B2A2E, BK2 = 0x3C3A40, BRASS = 0xC9A24A, WOOD = 0x9A643A, MARBLE = 0xF4F1EC;
const glow = c => new THREE.MeshBasicMaterial({ color: c });
const GLASS = new THREE.MeshToonMaterial({ color: 0xCFEAF5, transparent: true, opacity: 0.45, depthWrite: false });
const plane = (w, h, mat, x, y, z, p) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); o.position.set(x, y, z); p.add(o); return o; };
const win = (w, h, x, y, z, p) => { const o = plane(w, h, glow(0xFFB24A), x, y, z, p); o.userData.win = true; return o; };   /* 오븐 불빛 창 (단계마다 밝아짐) */
const logo = (w, h, x, y, z, p) => { const l = logoPanel(w, h); l.position.set(x, y, z); p.add(l); return l; };
const torus = () => new THREE.TorusGeometry(11, 5.5, 8, 16).rotateX(Math.PI / 2);
const TOR = torus();
const bagel = (c, x, y, z, p) => mesh(TOR, M(c), x, y, z, p);

/* 단계 몸체: tier 0 = 기준판 모델 그대로 */
const BODY = {
  oven: [null,
    p => { box(204, 18, 144, BR, 0, 0, 0, p); box(200, 152, 140, 0xF07A3E, 0, 18, 0, p); for (const y of [50, 82, 114, 146]) box(202, 2, 142, 0xD8622C, 0, y, 0, p); box(212, 14, 150, BR, 0, 170, 0, p); box(126, 70, 4, BR, 0, 58, 70, p); win(110, 56, 0, 93, 72.5, p); box(30, 64, 30, 0xEDE4DA, 62, 184, -34, p); box(180, 10, 60, WOOD, 0, 0, 100, p); },
    p => { box(200, 14, 140, BK, 0, 0, 0, p); box(200, 164, 140, ST, 0, 14, 0, p); for (const y of [36, 100]) { box(124, 50, 4, BK2, 0, y, 70, p); win(108, 34, 0, y + 25, 72.5, p); box(90, 4, 6, ST2, 0, y + 54, 72, p); }
      box(200, 22, 6, BK, 0, 158, 70, p); for (let i = 0; i < 4; i++) box(8, 8, 4, i ? 0x6FD07A : OR, -70 + i * 16, 165, 73.5, p); box(186, 28, 126, ST2, 0, 178, 0, p); logo(96, 22, 36, 192, 63.5, p); box(180, 10, 60, ST2, 0, 0, 100, p); },
    p => { box(204, 12, 144, BRASS, 0, 0, 0, p); box(200, 172, 140, BK, 0, 12, 0, p); for (const y of [24, 68, 112]) { box(126, 38, 4, BRASS, 0, y, 70, p); win(112, 28, 0, y + 19, 72.5, p); box(70, 4, 6, BRASS, 0, y + 40, 72, p); }
      for (const x of [-98, 98]) box(6, 172, 6, BRASS, x, 12, 68, p); box(204, 8, 144, BRASS, 0, 184, 0, p); box(196, 22, 136, BK2, 0, 192, 0, p); logo(110, 24, 0, 203, 68.5, p); box(180, 10, 60, BK2, 0, 0, 100, p); box(184, 3, 64, BRASS, 0, 8, 100, p); }],
  mixer: [null,
    p => { box(114, 8, 94, BR, 0, 0, 0, p); box(110, 38, 90, OR, 0, 8, 0, p); box(30, 112, 30, OR, -34, 46, -26, p); box(104, 32, 46, OR, -4, 150, -24, p); cyl(42, 32, 46, ST, 10, 46, 12, p, 18); sph(32, 0xFFF4E2, 10, 94, 12, p, 14, 10).scale.set(1, 0.5, 1); const h = cyl(4, 4, 48, ST2, 10, 98, 12, p, 6); h.userData.spin = true; },
    p => { box(110, 10, 90, BK, 0, 0, 0, p); box(110, 62, 90, ST, 0, 10, 0, p); logo(70, 18, 0, 42, 45.5, p); box(34, 100, 34, ST, -36, 72, -30, p); box(92, 28, 52, ST2, -2, 170, -28, p); const b = cyl(48, 40, 56, ST2, 12, 72, 12, p, 20); b.userData.spin = true; sph(38, 0xFFF4E2, 12, 126, 12, p, 14, 10).scale.set(1, 0.45, 1); cyl(5, 5, 60, BK, 12, 128, 12, p, 6); },
    p => { box(112, 8, 92, BRASS, 0, 0, 0, p); box(110, 56, 90, BK, 0, 8, 0, p); box(112, 5, 92, BRASS, 0, 64, 0, p); logo(64, 16, 0, 36, 45.5, p); for (const x of [-26, 28]) { const b = cyl(26, 22, 44, BK2, x, 69, 14, p, 16); b.userData.spin = true; cyl(27, 27, 4, BRASS, x, 112, 14, p, 16); sph(21, 0xFFF4E2, x, 114, 14, p, 12, 8).scale.set(1, 0.45, 1); } box(30, 100, 26, BK, 0, 69, -34, p); box(100, 24, 30, BK2, 0, 166, -30, p); box(102, 4, 32, BRASS, 0, 166, -30, p); }],
  kettle: [null,
    p => { box(130, 70, 110, BR, 0, 0, 0, p); box(132, 6, 112, OR2, 0, 64, 0, p); cyl(54, 48, 56, OR, 0, 70, 0, p, 22); cyl(57, 57, 6, 0xFFFFFF, 0, 124, 0, p, 22); cyl(49, 49, 3, 0x9ACFE8, 0, 125, 0, p, 22); for (const x of [-60, 60]) box(12, 8, 22, BR, x, 108, 0, p); },
    p => { box(130, 80, 110, ST2, 0, 0, 0, p); box(40, 44, 6, BK, -36, 22, 55, p); for (let i = 0; i < 3; i++) box(6, 6, 4, i === 1 ? OR : 0x6FD07A, -48 + i * 12, 54, 58.5, p); logo(50, 14, 30, 50, 55.5, p); cyl(56, 52, 54, ST, 0, 80, 0, p, 22); cyl(58, 58, 5, ST2, 0, 128, 0, p, 22); cyl(51, 51, 3, 0x9ACFE8, 0, 129, 0, p, 22); box(110, 38, 6, ST2, 0, 128, -54, p).rotation.x = -0.35; },
    p => { box(130, 76, 110, BK, 0, 0, 0, p); box(132, 5, 112, BRASS, 0, 72, 0, p); logo(60, 15, 0, 36, 55.5, p); for (const x of [-32, 32]) { cyl(32, 30, 50, BK2, x, 77, 4, p, 18); cyl(34, 34, 4, BRASS, x, 125, 4, p, 18); cyl(29, 29, 3, 0x9ACFE8, x, 126, 4, p, 18); } }],
  ccbar: [null,
    p => { box(220, 95, 110, TILE, 0, 0, 0, p); box(222, 34, 3, OR, 0, 22, 55.5, p); for (let i = 0; i < 9; i++) box(2, 34, 4, 0xFFFFFF, -100 + i * 25, 22, 56, p); box(230, 12, 120, WOOD, 0, 95, 0, p); },
    p => { box(220, 95, 110, ST, 0, 0, 0, p); logo(80, 20, 0, 52, 55.5, p); box(230, 12, 120, ST2, 0, 95, 0, p); mesh(new THREE.BoxGeometry(206, 40, 3), GLASS, 0, 136, -10, p); for (const x of [-102, 102]) box(4, 46, 4, ST2, x, 107, -10, p); box(208, 4, 6, ST2, 0, 154, -10, p); },
    p => { box(220, 92, 110, BK, 0, 0, 0, p); box(222, 4, 112, BRASS, 0, 88, 0, p); logo(80, 20, 0, 50, 55.5, p); box(230, 12, 120, MARBLE, 0, 95, 0, p); for (const [x, w] of [[-70, 60], [10, 40], [80, 50]]) box(w, 1, 3, 0xC8C2BA, x, 107, 20 - x / 6, p);
      for (const x of [-104, 104]) box(4, 54, 4, BRASS, x, 107, -48, p); box(212, 5, 26, BRASS, 0, 158, -48, p); plane(200, 3, glow(0xFFE6A8), 0, 156, -34.5, p).rotation.x = -Math.PI / 2; box(226, 4, 4, BRASS, 0, 70, 60, p); }],
  coffee: [null,
    p => { box(130, 150, 100, 0xFFFFFF, 0, 0, 0, p); box(122, 118, 3, OR, 0, 18, 50.5, p); mesh(new THREE.BoxGeometry(104, 104, 3), GLASS, 0, 77, 52.5, p); box(6, 40, 6, BR, 44, 60, 55, p); box(140, 12, 110, OR, 0, 150, 0, p); },
    p => { box(130, 150, 100, ST, 0, 0, 0, p); for (const x of [-32, 32]) { box(60, 120, 3, ST2, x, 14, 50.5, p); mesh(new THREE.BoxGeometry(48, 106, 3), GLASS, x, 74, 52.5, p); box(4, 44, 6, BK, x + (x < 0 ? 24 : -24), 56, 55, p); } logo(60, 14, 0, 6, 51, p); box(140, 12, 110, ST2, 0, 150, 0, p); },
    p => { box(130, 150, 100, BK, 0, 0, 0, p); for (const x of [-42, 0, 42]) { box(40, 124, 3, BK2, x, 12, 50.5, p); mesh(new THREE.BoxGeometry(32, 108, 3), GLASS, x, 70, 52.5, p); box(3, 40, 5, BRASS, x + 14, 52, 55, p); } plane(118, 3, glow(0xFFF2D0), 0, 136, 50.6, p); box(140, 12, 110, BK2, 0, 150, 0, p); box(142, 4, 112, BRASS, 0, 148, 0, p); }],
  espresso: [null,
    p => { box(130, 95, 100, CR, 0, 0, 0, p); box(132, 30, 3, OR, 0, 50, 50.5, p); box(140, 12, 110, WOOD, 0, 95, 0, p); box(80, 66, 64, OR, 0, 107, -12, p); box(82, 8, 66, 0xFFFFFF, 0, 173, -12, p); box(26, 12, 14, BK, 0, 140, 24, p); cyl(5, 5, 16, BK, 0, 124, 27, p, 8); cyl(2, 2, 30, ST2, 32, 122, 20, p, 6); },
    p => { box(130, 95, 100, ST, 0, 0, 0, p); logo(64, 16, 0, 60, 50.5, p); box(140, 12, 110, ST2, 0, 95, 0, p); box(92, 70, 66, ST, 0, 107, -12, p); box(94, 6, 68, ST2, 0, 177, -12, p); for (const x of [-22, 22]) { box(22, 12, 14, BK, x, 142, 24, p); cyl(5, 5, 16, BK, x, 126, 27, p, 8); } box(6, 6, 4, OR, 38, 165, 21.5, p); },
    p => { box(130, 92, 100, BK, 0, 0, 0, p); box(132, 4, 102, BRASS, 0, 88, 0, p); logo(64, 16, 0, 56, 50.5, p); box(140, 12, 110, BK2, 0, 95, 0, p); box(104, 72, 66, BK, -8, 107, -12, p); box(106, 5, 68, BRASS, -8, 179, -12, p); for (const x of [-38, -8, 22]) { box(18, 12, 14, BRASS, x, 144, 24, p); cyl(4, 4, 16, BK2, x, 128, 27, p, 8); }
      cyl(10, 12, 30, BK2, 52, 107, -30, p, 10); mesh(new THREE.ConeGeometry(14, 22, 10).rotateX(Math.PI), M(0x8A5A3A), 52, 148, -30, p); }],
  counter: [null,
    p => { box(320, 100, 110, CR, 0, 0, 0, p); box(322, 18, 3, OR, 0, 66, 55.5, p); box(330, 14, 120, WOOD, 0, 100, 0, p); box(70, 50, 50, 0x4A4A55, 110, 114, -10, p); },
    p => { const t = terrazzo(); mesh(new THREE.BoxGeometry(320, 100, 110), new THREE.MeshToonMaterial({ map: t }), 0, 50, 0, p); box(330, 14, 120, 0x5A3A22, 0, 100, 0, p); box(130, 56, 3, 0x2A3A32, -70, 26, 55.5, p); box(136, 4, 5, WOOD, -70, 82, 56, p); logo(60, 16, 80, 58, 55.5, p); box(70, 50, 50, BK, 110, 114, -10, p); box(30, 6, 30, OR, 110, 164, -10, p); },
    p => { box(320, 100, 110, BK, 0, 0, 0, p); mesh(new THREE.BoxGeometry(300, 62, 3), GLASS, 0, 52, 56.5, p); for (const x of [-150, 0, 150]) box(4, 66, 5, BRASS, x, 20, 57, p); box(304, 4, 5, BRASS, 0, 84, 57, p); box(304, 4, 5, BRASS, 0, 18, 57, p);
      for (let i = 0; i < 9; i++) bagel(i % 3 ? 0xE2A55A : 0xCF8A2E, -120 + i * 30, 40 + (i % 2) * 18, 40, p); box(330, 14, 120, MARBLE, 0, 100, 0, p); box(332, 4, 122, BRASS, 0, 98, 0, p); box(70, 50, 50, BK2, 110, 114, -10, p); box(72, 4, 52, BRASS, 110, 164, -10, p); box(334, 4, 4, BRASS, 0, 10, 66, p); }],
};
let TZ = null;
function terrazzo() { if (TZ) return TZ; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#F3EEE6'; x.fillRect(0, 0, 128, 128); const C = ['#E8B08A', '#C8C2BA', '#F2C9A8', '#B9AFA4', '#FFB27A'];
  let s = 7; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280; for (let i = 0; i < 70; i++) { x.fillStyle = C[i % C.length]; x.beginPath(); x.ellipse(r() * 128, r() * 128, 1.5 + r() * 3, 1 + r() * 2, r() * 3, 0, 6.3); x.fill(); }
  TZ = new THREE.CanvasTexture(c); TZ.colorSpace = THREE.SRGBColorSpace; TZ.wrapS = TZ.wrapT = THREE.RepeatWrapping; TZ.repeat.set(3, 1); return TZ; }

/* 몸체 만들기: 단계 0 = 기준판 STATION */
export function stationBody(type, tier) { const g = new THREE.Group(); const f = BODY[type]?.[tier]; if (f) f(g); else STATION[type](g); g.userData.tier = tier; return g; }

/* 작은 변화 (매 단계 · 효과와 같은 것): lv = 그 설비 업그레이드 단계 · lv2 = 오븐 「판 늘리기」 */
export function stationDetail(type, tier, lv, lv2 = 0) {
  const g = new THREE.Group(), n = Math.max(0, Math.min(10, lv | 0)), cup = (x, y, z, c = 0xFFFFFF) => { cyl(5, 4, 9, c, x, y, z, g, 8); };
  if (type === 'oven') { const top = [184, 206, 214][tier - 1] ?? 186, m = Math.max(0, Math.min(10, lv2 | 0)); for (let i = 0; i < m; i++) { box(64, 3, 46, i % 2 ? ST2 : ST, -52, top + i * 4, -26, g); } }   /* 판 늘리기 = 위 선반의 판 */
  if (type === 'mixer') { const y = [40, 30, 18, 14][tier]; box(92, 8, 2, 0xC8C2BA, 0, y - 1, 45.5, g); for (let i = 0; i < n; i++) box(6, 6, 3, OR, -40 + i * 9, y, 46.5, g); }   /* 속도 눈금 (켜진 칸 = 단계) */
  if (type === 'kettle') { const pots = tier === 3 ? [[-32, 4, 24], [32, 4, 24]] : [[0, 0, 40]]; let k = 0; for (let i = 0; i < 2 + n; i++) { const [px, pz, r] = pots[i % pots.length], j = Math.floor(i / pots.length), a = j * 2.4, rr = Math.min(r, 8 + j * 7); bagel(0xE8C08A, px + Math.cos(a) * rr, 130 + (j % 2), pz + Math.sin(a) * rr, g); k++; } }   /* 데치는 베이글 */
  if (type === 'ccbar') { const C = [0xFFFBF2, 0xF6D6E8, 0xE6F2C8, 0xFFE9B8, 0xFFD8B0, 0xD8E8F8, 0xF2E2D6]; for (let i = 0; i < 4 + n; i++) { const row = i < 7 ? 0 : 1, k = i % 7; cyl(10, 10, 16 + row * 2, C[k], -84 + k * 28, 107, -22 - row * 22, g, 10); cyl(10.5, 10.5, 3, tier === 3 ? BRASS : tier === 2 ? ST2 : BR, -84 + k * 28, 123 + row * 2, -22 - row * 22, g, 10); } }   /* 토핑 병 */
  if (type === 'coffee') { const C = [0xFFFBF2, 0xB49AD8, 0xE6F2C8, 0xF2E2D6]; for (let i = 0; i < 3 + n; i++) cup(-36 + (i % 5) * 18, 22 + Math.floor(i / 5) * 26, 47, C[i % 4]); }   /* 유리문 안 크림치즈 컵 */
  if (type === 'espresso') { const y = [177, 181, 183, 184][tier]; for (let i = 0; i < n; i++) cup(-30 + (i % 5) * 15, y + Math.floor(i / 5) * 10, -30, tier === 3 ? 0xF2E6D0 : 0xFFFFFF); }   /* 잔 데우는 곳의 잔 */
  if (type === 'counter') { for (let i = 0; i < n; i++) { const x = tier === 2 ? -122 + (i % 5) * 26 : -150 + i * 30, y = tier === 2 ? 66 - Math.floor(i / 5) * 16 : tier === 3 ? 92 : 44; box(22, tier === 2 ? 3 : 12, 2, tier === 2 ? 0xFFFFFF : i % 2 ? 0xFFE9B8 : 0xFFFFFF, x, y, tier === 3 ? 60 : 57, g); } }   /* 메뉴 카드 (프로는 칠판 글줄) */
  g.userData.n = n; return g; }

/* 오븐 창 불빛: 오븐 성능 단계만큼 밝게 */
export function ovenGlow(body, lv) { const c = new THREE.Color(0xFFA23A).lerp(new THREE.Color(0xFFF0B0), Math.min(1, (lv | 0) / 10)); body.traverse(o => { if (o.userData.win) o.material.color.copy(c); }); }
