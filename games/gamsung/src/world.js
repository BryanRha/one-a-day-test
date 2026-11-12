// 매장 그리기 v2 (0.2.0 개편): 층마다 · 열린 구역 바닥(지점 재질) · 벽(뒤 · 왼쪽 = 높게, 앞 = 낮게 · 구역 사이 = 낮은 유리 칸막이) · 문 · 계단 · 잠긴 구역 점선 · 공사장 · 지점 인테리어(조명 · 소품 · 외관)
//   지점마다 확실히 다르게 (계획안 4-2) + 모든 지점 공통: 나무 기둥 · 지역 돌 · 큰 창 · 서예 액자 · #A92E2B 간판 · 3000K 빛
//   그리기 수 관리: 움직이지 않는 것(바닥 · 벽 · 소품)은 층마다 색별로 하나로 합침(bake) · 화면 밖 층은 카메라가 알아서 뺌(frustum) · 조명은 지금 층만 켬
//   바닥 대비 (마루미 0.3.1 원칙): 바닥은 채도 · 대비를 낮춤 · 물건엔 외곽선(models.js) — tools/floor_check.mjs
import * as THREE from 'three';
import { M, box, cyl, sph, mesh, C, gm, cvTex } from './models.js?v=0.99.39';
import { CELL, FDX, gi } from './layout.js?v=0.99.39';
import { BRAND } from './data.js?v=0.99.39';

const TX = {};
/* 가림막 표시: 키 큰 것(파라솔 · 펜던트 · 계단 · 난간 · 처마)은 테이블 · 설비 · 사장님 · 손님을 가리면 game.js 가 흐리게 */
export const occ = o => { o.userData.occ = true; return o; };
const glow = c => new THREE.MeshBasicMaterial({ color: c });
const live = o => { o.userData.live = true; return o; };   /* 합치지 않는 것 (글자 판 · 빛나는 것 · 나중에 바뀌는 것) */
const css = c => '#' + c.toString(16).padStart(6, '0');
// ── 무늬 (캔버스 256 = 세계 200 · 두 칸)
function pattern(kind, I) {
  const key = kind + I.id; if (TX[key]) return TX[key];
  const t = cvTex(256, 256, x => { const a = I.fa, b = I.fb, ln = I.line; x.fillStyle = a; x.fillRect(0, 0, 256, 256); let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    if (kind === 'concrete') { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? a : b; x.fillRect(i * 128, j * 128, 128, 128); } x.fillStyle = ln; x.fillRect(0, 0, 256, 2); x.fillRect(0, 128, 256, 1.5); x.fillRect(0, 0, 2, 256); x.fillRect(128, 0, 1.5, 256); for (let i = 0; i < 60; i++) { x.fillStyle = rnd() < 0.5 ? b : ln + '88'; x.fillRect(rnd() * 256, rnd() * 256, 2, 2); } }
    else if (kind === 'terracotta') { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = rnd() < 0.5 ? a : b; x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); } x.fillStyle = ln; for (let i = 0; i <= 4; i++) { x.fillRect(i * 64 - 1, 0, 3, 256); x.fillRect(0, i * 64 - 1, 256, 3); } }
    else if (kind === 'wood' || kind === 'maru' || kind === 'deck') { const h = kind === 'maru' ? 42 : kind === 'deck' ? 36 : 32; for (let r = 0; r * h < 256; r++) { let px = -rnd() * 120; while (px < 256) { const w = (kind === 'maru' ? 200 : 90) + rnd() * 80; x.fillStyle = rnd() < 0.5 ? a : b; x.fillRect(px, r * h, w, h); x.fillStyle = ln; x.fillRect(px, r * h, 2, h); px += w; } x.fillStyle = ln; x.fillRect(0, r * h + h - 1.5, 256, kind === 'deck' ? 4 : 1.5); } }
    else if (kind === 'terrazzo') { x.fillStyle = b; for (let i = 0; i < 260; i++) { x.fillStyle = [b, ln, '#CFC6B6', '#E8E2D6'][i % 4]; x.beginPath(); x.arc(rnd() * 256, rnd() * 256, 1.5 + rnd() * 2.5, 0, 6.3); x.fill(); } x.fillStyle = ln; x.fillRect(0, 0, 256, 1.5); x.fillRect(0, 0, 1.5, 256); }
    else if (kind === 'epoxy') { x.fillStyle = b; x.fillRect(0, 128, 256, 128); x.fillStyle = ln; x.fillRect(0, 0, 256, 2); x.fillRect(0, 128, 256, 2); x.fillRect(0, 0, 2, 256); for (const [px, py] of [[20, 20], [236, 20], [20, 108], [236, 108], [20, 148], [236, 148], [20, 236], [236, 236]]) { x.beginPath(); x.arc(px, py, 2.5, 0, 6.3); x.fill(); } }
    else if (kind === 'stone') { let y = 0; while (y < 256) { const h = 44 + rnd() * 30; let px = -rnd() * 60; while (px < 256) { const w = 50 + rnd() * 70; x.fillStyle = rnd() < 0.5 ? a : b; x.fillRect(px + 2, y + 2, w - 3, h - 3); px += w; } y += h; } x.strokeStyle = ln; x.lineWidth = 2; }
    else if (kind === 'ghost') { x.fillStyle = '#E9E2D6'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#B9AE9C'; x.lineWidth = 3; x.setLineDash([10, 10]); x.strokeRect(4, 4, 248, 248); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return TX[key] = t; }
/* 벽 무늬 (캔버스 256 × 128 = 세계 400 × 320) */
function wallTex(I) { const key = 'w' + I.id; if (TX[key]) return TX[key];
  const t = cvTex(256, 128, x => { const A = css(I.wallC), B = css(I.wallB); x.fillStyle = A; x.fillRect(0, 0, 256, 128); let s = 5; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    if (I.wall === 'basalt') { for (let i = 0; i < 70; i++) { x.fillStyle = ['#3E3A38', '#55504D', '#4A4644', '#5E5956'][i % 4]; x.beginPath(); x.ellipse(rnd() * 256, rnd() * 96, 10 + rnd() * 10, 7 + rnd() * 6, rnd() * 3, 0, 6.3); x.fill(); } x.fillStyle = css(I.plaster); x.fillRect(0, 0, 256, 14); }
    else if (I.wall === 'brick') { for (let r = 0; r < 16; r++) for (let c = -1; c < 9; c++) { x.fillStyle = (r * 7 + c * 3) % 5 ? A : B; x.fillRect(c * 32 + (r % 2) * 16 + 1, r * 8 + 1, 30, 6); } }
    else if (I.wall === 'hanji') { x.strokeStyle = css(I.beam); x.lineWidth = 2; for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * 32, 20); x.lineTo(i * 32, 128); x.stroke(); } for (let j = 0; j <= 4; j++) { x.beginPath(); x.moveTo(0, 20 + j * 27); x.lineTo(256, 20 + j * 27); x.stroke(); } x.fillStyle = css(I.beam); x.fillRect(0, 0, 256, 18); }
    else if (I.wall === 'pine') { for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? A : B; x.fillRect(i * 16, 0, 16, 128); x.fillStyle = '#9A7652'; x.fillRect(i * 16, 0, 1.5, 128); } }
    else if (I.wall === 'earth') { for (let i = 0; i < 120; i++) { x.fillStyle = i % 2 ? B : '#D8C6A6'; x.fillRect(rnd() * 256, rnd() * 116, 3, 2); } x.fillStyle = css(I.tile); x.fillRect(0, 0, 256, 14); for (let i = 0; i < 16; i++) { x.fillStyle = '#6E6A66'; x.fillRect(i * 16, 10, 12, 4); } }
    else if (I.wall === 'wainscot') { x.fillStyle = css(I.wain); x.fillRect(0, 88, 256, 40); x.fillStyle = '#7A5A3A'; x.fillRect(0, 86, 256, 3); for (let i = 0; i < 8; i++) x.fillRect(i * 32 + 15, 92, 2, 34); }
    else { x.fillStyle = B; for (let i = 0; i < 40; i++) x.fillRect(rnd() * 256, rnd() * 128, 3, 2); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return TX[key] = t; }
const texMat = (t, rx, ry) => { const m = new THREE.MeshToonMaterial({ map: t.clone(), gradientMap: gm }); m.map.repeat.set(rx, ry); m.map.needsUpdate = true; return m; };
// ── 구역 좌표 (세계) · 이웃 판단
export const areaBox = a => { const f = a.floor; return { x0: -700 + gi(f, a.rect[0]) * CELL, x1: -700 + gi(f, a.rect[2]) * CELL, z0: -700 + a.rect[1] * CELL, z1: -700 + a.rect[3] * CELL, f }; };
export const areaCenter = a => { const b = areaBox(a); return [(b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2]; };
export function areaAt(B, f, i, j) { for (const a of B.areas) if (a.floor === f && i >= a.rect[0] && i < a.rect[2] && j >= a.rect[1] && j < a.rect[3]) return a; return null; }
/* 두 칸 사이가 열려 있나 (같은 구역 · openTo · 문) */
export function linked(B, a, b, i1, j1, i2, j2) { if (a === b) return true; if (!a || !b) return false; if ((a.openTo || []).includes(b.id) || (b.openTo || []).includes(a.id)) return true;
  for (const d of [...(a.doors || []), ...(b.doors || [])]) if ((d[0] === i1 && d[1] === j1 && d[2] === i2 && d[3] === j2) || (d[0] === i2 && d[1] === j2 && d[2] === i1 && d[3] === j1)) return true; return false; }

// ── 층 하나 그리기: open = 열린 구역 id 집합 · next = 다음에 열 구역 id 집합(점선) · building = 공사 중 구역 id 집합
export function drawFloor(G, B, f, open, next, building, opt = {}) {
  const I = B.interior, isOpen = a => open.has(a.id);
  /* 바깥 땅 (층마다 · 하늘색) — 2층 위는 아래층 지붕처럼 */
  const ox = f * FDX; { const out = live(mesh(new THREE.BoxGeometry(9000, 10, 9000), M(f === 0 ? I.out : f === 3 ? 0xD8D2C8 : 0xE2DCD2), ox + 300, -22, 300, G)); out.castShadow = false; out.userData.ground = true; }
  if (f === 0) exterior(G, B, open);
  for (const a of B.areas) { if (a.floor !== f) continue; const bx = areaBox(a), w = bx.x1 - bx.x0, d = bx.z1 - bx.z0, cx = (bx.x0 + bx.x1) / 2, cz = (bx.z0 + bx.z1) / 2;
    if (isOpen(a)) { const kind = a.outdoor ? (a.yard ? 'wood' : 'deck') : a.kind === 'roast' || a.kind === 'store' ? 'concrete' : a.tea ? 'maru' : I.floor;
      const fl = live(mesh(new THREE.BoxGeometry(w, 20, d), texMat(pattern(kind, a.outdoor && !a.yard ? { ...I, id: I.id + 'd', fa: '#CDBBA2', fb: '#C8B59B', line: '#BCA88D' } : kind === 'concrete' && I.floor !== 'concrete' ? { ...I, id: I.id + 'c', fa: '#CBC7C0', fb: '#C5C1BA', line: '#BBB6AE' } : I), w / 200, d / 200), cx, -10, cz, G)); fl.castShadow = false;
      if (a.kind === 'shop' && I.strip) for (const z of [60, 420]) { const st = box(w - 40, 2, 56, parseInt(I.strip.slice(1), 16), cx, 0, z, G); st.castShadow = false; }   /* 영도: 콘크리트 위 데크 나무 띠 */
      if (a.kind === 'shop' && I.step) for (const [x, z] of [[-480, 160], [-400, 300], [-300, 430]]) { const st = cyl(34, 38, 3, parseInt(I.step.slice(1), 16), x, 0, z, G, 9); st.scale.set(1.2, 1, 0.9); st.castShadow = false; }   /* 강정: 현무암 디딤돌 */
      if (a.yard) for (let k = 0; k < 6; k++) { const s = cyl(30, 34, 3, 0x6F6A66, bx.x0 + 120 + k * 210, 0, bx.z0 + 160 + (k % 2) * 260, G, 9); s.castShadow = false; }
    } else if (next.has(a.id) || building.has(a.id)) { const fl = live(mesh(new THREE.BoxGeometry(w - 8, 6, d - 8), texMat(pattern('ghost', I), w / 200, d / 200), cx, -14, cz, G)); fl.castShadow = false; fl.userData.ghost = a.id;
      if (building.has(a.id)) site(G, bx); }
  }
  /* 벽: 열린 구역의 가장자리 칸마다 이웃 확인 → 뒤(북 · 서) = 높은 벽 · 앞(남 · 동) = 낮은 벽/난간 · 열린 이웃 사이 = 낮은 유리 칸막이 · 문 = 빈칸 */
  const segs = [];   /* [x0, z0, x1, z1, 종류] */
  for (const a of B.areas) { if (a.floor !== f || !isOpen(a)) continue; const [i0, j0, i1, j1] = a.rect;
    const edge = (i, j, ni, nj, side) => { const n = areaAt(B, f, ni, nj), on = n && isOpen(n); if (on && linked(B, a, n, i, j, ni, nj)) return; if (on && (side === 'S' || side === 'E')) return;   /* 열린 이웃과의 칸막이는 북 · 서 쪽 구역에서 한 번만 */
      const x = -700 + gi(f, i) * CELL, z = -700 + j * CELL, k = on ? 'glass' : (side === 'N' || side === 'W') && !a.wallLow ? (a.outdoor ? 'rail' : 'tall') : a.outdoor ? 'rail' : 'low';
      if (side === 'N') segs.push([x, z, x + CELL, z, k]); else if (side === 'S') segs.push([x, z + CELL, x + CELL, z + CELL, k]); else if (side === 'W') segs.push([x, z, x, z + CELL, k]); else segs.push([x + CELL, z, x + CELL, z + CELL, k]); };
    for (let i = i0; i < i1; i++) { edge(i, j0, i, j0 - 1, 'N'); edge(i, j1 - 1, i, j1, 'S'); } for (let j = j0; j < j1; j++) { edge(i0, j, i0 - 1, j, 'W'); edge(i1 - 1, j, i1, j, 'E'); } }
  /* 문 앞 (손님이 들어오는 곳): 1층 가게 오른쪽 (13,8) 은 벽을 안 세움 */
  const merged = mergeSegs(segs.filter(s => !(f === 0 && s[0] === 700 && s[2] === 700 && s[1] >= 0 && s[3] <= 300)));
  const wm = wallTex(I);
  for (const [x0, z0, x1, z1, k] of merged) { const L = Math.hypot(x1 - x0, z1 - z0), alongX = z0 === z1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (k === 'tall') { const wl = live(mesh(new THREE.BoxGeometry(alongX ? L : 30, 320, alongX ? 30 : L), texMat(wm, L / 400, 1), cx, 160, cz, G)); wl.castShadow = true;
      box(alongX ? L + 4 : 40, 18, alongX ? 40 : L + 4, C.wood, cx, 320, cz, G); box(alongX ? L : 34, 30, alongX ? 34 : L, C.woodD, cx, 0, cz + (alongX ? 2 : 0), G);
      wallTrim(G, I, x0, z0, x1, z1, alongX); if (L >= 300 && opt.windows !== false) windows(G, I, x0, z0, x1, z1, alongX); }
    else if (k === 'low') { box(alongX ? L : 24, 70, alongX ? 24 : L, I.wallC, cx, 0, cz, G); box(alongX ? L + 4 : 30, 8, alongX ? 30 : L + 4, C.wood, cx, 70, cz, G); }
    else if (k === 'glass') { box(alongX ? L : 16, 26, alongX ? 16 : L, C.woodD, cx, 0, cz, G); const gl = live(mesh(new THREE.BoxGeometry(alongX ? L : 6, 110, alongX ? 6 : L), new THREE.MeshToonMaterial({ color: 0xDCEAEA, gradientMap: gm, transparent: true, opacity: 0.35 }), cx, 81, cz, G)); gl.castShadow = false; gl.receiveShadow = false;
      for (let u = 0; u <= L; u += 200) box(10, 140, 10, C.woodD, alongX ? x0 + u : cx, 0, alongX ? cz : z0 + u, G); }
    else { /* 난간 */ for (let u = 0; u <= L; u += 50) box(6, 70, 6, 0xF2ECE2, alongX ? x0 + u : cx, 0, alongX ? cz : z0 + u, G); box(alongX ? L : 8, 8, alongX ? 8 : L, 0xF2ECE2, cx, 70, cz, G); }
  }
  /* 계단 (아래층 칸 = 올라가는 계단 그림) */
  for (const s of B.stairs) { if (s.a[0] !== f || !open.has(s.need)) continue; stairs(G, -700 + gi(f, s.a[1]) * CELL, -700 + s.a[2] * CELL, f, s.a[1] === 1 && s.a[2] === 13); }
  for (const s of B.stairs) { if (s.b[0] !== f || !open.has(s.need)) continue; const x = -700 + (gi(f, s.b[1]) + 0.5) * CELL, z = -700 + (s.b[2] + 0.5) * CELL; const r = cyl(40, 40, 3, 0xC8A27A, x, 0, z, G, 18); r.castShadow = false; }
  lights(G, B, f, open);
}
/* 같은 줄에 이어진 같은 종류 벽 조각을 하나로 */
function mergeSegs(segs) { const out = []; const key = s => s[1] === s[3] ? `h${s[1]}${s[4]}` : `v${s[0]}${s[4]}`; const by = {};
  for (const s of segs) (by[key(s)] ||= []).push(s);
  for (const list of Object.values(by)) { const hz = list[0][1] === list[0][3]; list.sort((p, q) => hz ? p[0] - q[0] : p[1] - q[1]); let cur = null;
    for (const s of list) { if (cur && (hz ? cur[2] === s[0] : cur[3] === s[1])) { cur[2] = s[2]; cur[3] = s[3]; } else { if (cur) out.push(cur); cur = s.slice(); } } if (cur) out.push(cur); }
  return out; }
/* 벽 장식: 지점 벽 재질에 맞춘 띠 · 기둥 */
function wallTrim(G, I, x0, z0, x1, z1, alongX) { const L = Math.hypot(x1 - x0, z1 - z0), off = 18;
  if (I.wall === 'steel') { for (let u = 0; u <= L; u += 400) box(22, 330, 22, I.steel, alongX ? x0 + u : x0 + off, 0, alongX ? z0 + off : z0 + u, G); box(alongX ? L : 20, 22, alongX ? 20 : L, I.steel, (x0 + x1) / 2 + (alongX ? 0 : off), 290, (z0 + z1) / 2 + (alongX ? off : 0), G); }
  else if (I.wall === 'brick') for (let u = 0; u <= L; u += 300) { box(alongX ? 8 : 300, 8, alongX ? 300 : 8, I.truss, alongX ? x0 + u : x0 + 150, 300, alongX ? z0 + 150 : z0 + u, G); }
  else if (I.wall === 'hanji') for (let u = 0; u <= L; u += 200) box(alongX ? 14 : 60, 14, alongX ? 60 : 14, I.beam, alongX ? x0 + u : x0 + 30, 318, alongX ? z0 + 30 : z0 + u, G);
}
/* 큰 창 + 리넨 커튼 (바람) — 4~5칸마다 */
function windows(G, I, x0, z0, x1, z1, alongX) { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.floor(L / 500)), sky = I.sky2 || 0xDCEAEA;
  for (let k = 0; k < n; k++) { const u = (k + 0.5) * L / n, x = alongX ? x0 + u : x0 + 18, z = alongX ? z0 + 18 : z0 + u;
    box(alongX ? 240 : 8, 170, alongX ? 8 : 240, sky, x, 80, z, G); for (const d of [-120, 0, 120]) box(alongX ? 12 : 14, 180, alongX ? 14 : 12, C.woodD, alongX ? x + d : x + 4, 75, alongX ? z + 4 : z + d, G);
    for (const y of [75, 255]) box(alongX ? 250 : 14, 10, alongX ? 14 : 250, C.woodD, alongX ? x : x + 4, y, alongX ? z + 4 : z, G); box(alongX ? 44 : 6, 190, alongX ? 6 : 44, C.linen, alongX ? x + 96 : x + 12, 68, alongX ? z + 12 : z + 96, G); } }
/* 계단: 칸 하나에 6단 · 위로 갈수록 높게 (위층 쪽으로) */
function stairs(G, x, z, f, side) { const g = occ(new THREE.Group()); g.position.set(x - 100, 0, z - 100); if (side) { g.position.set(x - 100, 0, z + 100); g.rotation.y = Math.PI / 2; } G.add(g); for (let k = 0; k < 7; k++) box(100, 30 + k * 40, 26, 0xB89270, 50, 0, 186 - k * 26, g); box(8, 330, 8, C.woodD, 4, 0, 196, g); box(8, 8, 190, C.woodD, 4, 300, 100, g); const t = cvTex(128, 48, x2 => { x2.fillStyle = '#3B2A20'; x2.fillRect(0, 0, 128, 48); x2.fillStyle = '#F6EFE4'; x2.font = '700 28px P, sans-serif'; x2.textAlign = 'center'; x2.fillText(`${f + 2 > 3 ? '루프탑' : f + 2 + 'F'} ↑`, 64, 34); });
  live(mesh(new THREE.PlaneGeometry(64, 24), new THREE.MeshBasicMaterial({ map: t }), 50, 120, 200, g)); }
/* 공사장: 비계 · 가림막 · 안전 띠 */
function site(G, b) { const g = new THREE.Group(); G.add(g); g.userData.site = true; const w = b.x1 - b.x0, d = b.z1 - b.z0;
  for (const [x, z] of [[b.x0 + 40, b.z0 + 40], [b.x1 - 40, b.z0 + 40], [b.x0 + 40, b.z1 - 40], [b.x1 - 40, b.z1 - 40]]) { box(10, 220, 10, 0xC9A050, x, 0, z, g); }
  box(w - 60, 8, 10, 0xC9A050, (b.x0 + b.x1) / 2, 210, b.z0 + 40, g); box(10, 8, d - 60, 0xC9A050, b.x0 + 40, 210, (b.z0 + b.z1) / 2, g);
  for (let k = 0; k < Math.floor(w / 120); k++) box(60, 40, 6, k % 2 ? 0xF2C230 : 0x3B3B42, b.x0 + 80 + k * 120, 30, b.z1 - 30, g);
  box(80, 40, 60, 0xD8CDBC, (b.x0 + b.x1) / 2, 0, (b.z0 + b.z1) / 2, g); box(60, 30, 50, 0xB89270, (b.x0 + b.x1) / 2 + 20, 40, (b.z0 + b.z1) / 2, g); }
// ── 조명 (지점마다 · 3000K) · 진짜 빛은 층마다 2~3개만 (가벼움)
function lights(G, B, f, open) { const I = B.interior, pts = [];
  for (const a of B.areas) { if (a.floor !== f || !open.has(a.id) || a.outdoor || a.kind === 'visit' || a.kind === 'hall') continue; const b = areaBox(a), w = b.x1 - b.x0, d = b.z1 - b.z0;
    const nx = Math.max(1, Math.round(w / 700)), nz = Math.max(1, Math.round(d / 700)); for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const x = b.x0 + (i + 0.5) * w / nx, z = b.z0 + (j + 0.5) * d / nz; if (a.kind === 'shop' && z < -350) continue; pendant(G, I.light, x, z); pts.push([x, z]); } }
  for (const [x, z] of pts.slice(0, f === 0 ? 2 : 3)) { const l = new THREE.PointLight(0xFFC98A, 7000, 520, 2); l.position.set(x, 210, z); l.userData.floorLight = f; G.add(l); } }
export function pendant(G, kind, x, z) { const p = occ(new THREE.Group()); p.userData.noShadow = true; p.position.set(x, 0, z); G.add(p); const cord = c => box(2, 70, 2, c, 0, 250, 0, p);
  if (kind === 'ship') { cord(0x2F4A5E); live(mesh(new THREE.SphereGeometry(16, 12, 10), glow(0xF0603A), 0, 228, 0, p)); cyl(10, 10, 6, 0x2F4A5E, 0, 244, 0, p, 10); }   /* 배 등불 (붉은 유리 · 시안 03) */
  else if (kind === 'globe') { cord(0x3B2A20); live(mesh(new THREE.SphereGeometry(20, 14, 10), glow(0xFFE6BE), 0, 232, 0, p)); }
  else if (kind === 'gammul') { cord(0x5A3A22); cyl(10, 34, 22, 0xB5652A, 0, 226, 0, p, 14); live(mesh(new THREE.SphereGeometry(8, 8, 6), glow(0xFFE0B0), 0, 222, 0, p)); }
  else if (kind === 'hanji') { cord(0x6B4A30); live(mesh(new THREE.BoxGeometry(34, 40, 34), glow(0xFFF0D8), 0, 214, 0, p)); for (const s of [-1, 1]) { box(36, 3, 3, 0x6B4A30, 0, 214, s * 17, p); box(3, 3, 36, 0x6B4A30, s * 17, 214, 0, p); } }
  else if (kind === 'factory') { cord(0x3B3B42); cyl(8, 30, 24, 0x2E3A3A, 0, 226, 0, p, 14); live(mesh(new THREE.SphereGeometry(9, 8, 6), glow(0xFFE2B0), 0, 222, 0, p)); }
  else if (kind === 'spot') { box(160, 6, 8, 0x2A2A30, 0, 300, 0, p); for (const s of [-60, 0, 60]) { cyl(7, 10, 18, 0x2A2A30, s, 280, 0, p, 10); live(mesh(new THREE.CylinderGeometry(6, 6, 2, 10), glow(0xFFF0D0), s, 280, 0, p)); } }
  else { cord(0x5A5652); live(mesh(new THREE.CylinderGeometry(15, 15, 34, 10), glow(0xF6D9A8), 0, 220, 0, p)); for (const y of [203, 237]) cyl(16, 16, 4, 0xA92E2B, 0, y, 0, p, 10); }
  p.traverse(m => { if (m.isMesh) m.castShadow = false; }); return p; }
// ── 지점 외관 · 바깥 풍경 (1층) — 앞(+z) · 오른쪽 거리(+x)
function exterior(G, B, open) { const I = B.interior, e = I.ext, g = new THREE.Group(); G.add(g);
  /* 가게 앞 돌길 (손님이 들어오는 곳 · 지역 돌) */ for (let i = 0; i < 6; i++) { const s = cyl(34, 34, 4, I.stone, 770 + (i % 2) * 40, -8, 30 + i * 60, g, 10); s.scale.set(1, 1, 0.8); s.castShadow = false; }
  if (e === 'glass') { /* 영도: 바다 · 다리 · 남색 차양 */ live(mesh(new THREE.BoxGeometry(6000, 4, 2600), new THREE.MeshToonMaterial({ color: 0x8FB4C4, gradientMap: gm }), 300, -14, 3500, g)).castShadow = false;
    const br = occ(new THREE.Group()); br.position.set(-2200, 0, 2600); g.add(br); for (let k = 0; k < 6; k++) box(40, 260, 40, 0x6E7A86, k * 500, 0, 0, br); box(2800, 40, 80, 0x7A8692, 1250, 240, 0, br);
    awning(g, 720, 20, 260, 0x2F4A5E); }
  else if (e === 'brick') { for (let k = 0; k < 5; k++) box(300, 160, 40, 0x9A5A44, 1500 + k * 0, 0, -600 + k * 320, g); awning(g, 720, -100, 300, 0xB86A4A); box(30, 140, 30, 0x3B3B42, 900, 0, 450, g); live(mesh(new THREE.SphereGeometry(22, 12, 8), glow(0xFFE6BE), 900, 160, 450, g)); }
  else if (e === 'stonewall') { for (let k = 0; k < 14; k++) { const s = sph(34, k % 2 ? 0x4A4644 : 0x55504D, 1450 + (k % 7) * 0, 20, -500 + k * 110, g, 8, 6); s.scale.set(1.2, 0.8, 1); }
    for (const [x, z] of [[1700, -200], [1850, 300], [1650, 700], [-1600, 2000], [-1000, 2300]]) orange(g, x, z); }
  else if (e === 'giwa') { const r = occ(new THREE.Group()); r.position.set(720, 300, 150); g.add(r); const rf = box(160, 16, 520, I.tile || 0x5A5652, 0, 0, 0, r); rf.rotation.z = -0.35; for (const z of [-260, 260]) cyl(8, 8, 300, 0x6B4A30, -40, -300, z, r, 8); }
  else if (e === 'deck') { live(mesh(new THREE.BoxGeometry(6000, 4, 2600), new THREE.MeshToonMaterial({ color: 0x9CC4CC, gradientMap: gm }), 300, -14, 3600, g)).castShadow = false; for (const [x, z] of [[1700, -400], [1900, 200], [-1500, 2200], [1600, 900]]) pine(g, x, z); }
  else if (e === 'factory') { for (let k = 0; k < 4; k++) box(260, 260, 260, 0x9A4A36, 1700, 0, -700 + k * 300, g); cyl(40, 50, 600, 0x7A3A2A, 1800, 0, -600, g, 10); awning(g, 720, -100, 300, 0x3B3B42); }
  /* 공통: 나무 몇 그루 (바깥) */ for (const [x, z] of [[1250, -650], [-1700, -900]]) tree(g, x, z);
  if (I.id === 'gyeongju') { const m = new THREE.Group(); m.position.set(-2600, 0, 2400); g.add(m); const hill = sph(700, 0x8FA87A, 0, -420, 0, m, 20, 12); hill.scale.set(1, 0.9, 1); }
}
function awning(g, x, z0, z1, c) { const a = occ(new THREE.Group()); g.add(a); const n = Math.round((z1 - z0) / 60); for (let k = 0; k < n; k++) { const s = box(70, 6, (z1 - z0) / n, k % 2 ? c : 0xF2ECE2, x + 35, 262, z0 + (k + 0.5) * (z1 - z0) / n, a); s.rotation.z = -0.3; } }
export function tree(g, x, z, s = 1) { const p = occ(new THREE.Group()); p.position.set(x, 0, z); p.scale.setScalar(s); g.add(p); cyl(14, 18, 150, 0x7A5A3A, 0, 0, 0, p, 8); sph(80, 0x7FA06A, 0, 200, 0, p, 10, 8); sph(56, 0x8FB07A, 40, 240, 20, p, 10, 8); return p; }
export function pine(g, x, z, s = 1) { const p = occ(new THREE.Group()); p.position.set(x, 0, z); p.scale.setScalar(s); g.add(p); cyl(10, 14, 80, 0x6B4A30, 0, 0, 0, p, 8); for (const [y, r] of [[80, 70], [150, 55], [210, 38]]) cyl(0, r, 90, 0x3E6A44, 0, y, 0, p, 10); return p; }
export function orange(g, x, z, s = 1) { const p = occ(new THREE.Group()); p.position.set(x, 0, z); p.scale.setScalar(s); g.add(p); cyl(10, 14, 60, 0x6B4A30, 0, 0, 0, p, 8); sph(56, 0x4E7A44, 0, 110, 0, p, 10, 8); for (let k = 0; k < 6; k++) sph(8, 0xF09A30, Math.cos(k) * 46, 100 + (k % 3) * 18, Math.sin(k) * 46, p, 6, 4); return p; }
// ── 지점 소품 (계획안 4-2 대표 소품) — 벽에 걸거나 구석 고정 칸에 · 걷는 칸은 안 막음
export function props(G, B, open) { const I = B.interior, p = I.props, g = new THREE.Group(); G.add(g);
  /* 바 뒤 오른쪽 구석 화분 (지역 나무 · 걷는 칸 밖) */ { const c = { sea: 'pine', jeju: 'orange', hanok: 'plum', roastery: 'pine', silla: 'pine' }[p] || 'olive'; if (c === 'pine') pine(g, 655, -655, 0.8); else if (c === 'orange') orange(g, 655, -655, 0.75); else { cyl(22, 18, 34, 0xD8CDBC, 655, 0, -655, g, 12); sph(34, c === 'plum' ? 0xE8B8C8 : 0x8AA87A, 655, 80, -655, g, 10, 8); } }
  if (p === 'sea') { const r = mesh(new THREE.TorusGeometry(26, 6, 6, 16), M(0xC8A878), -560, 4, 560, g); r.rotation.x = Math.PI / 2; r.castShadow = false; for (const [x, c] of [[-470, 0xE85A3A], [-430, 0xF2ECE2]]) sph(14, c, x, 14, 620, g, 10, 8); }   /* 밧줄 · 부표 (앞 왼쪽 구석 · 바닥 장식) */
  const onBack = (x, h = 200) => new THREE.Vector3(x, h, -682), onLeft = (z, h = 200) => new THREE.Vector3(-682, h, z);
  if (p === 'sea') { /* 밧줄 · 부표 조명 · 해송 */ const r = onBack(520, 150); mesh(new THREE.TorusGeometry(30, 7, 6, 18), M(0xC8A878), r.x, r.y, r.z + 6, g); for (const [x, c] of [[420, 0xE85A3A], [460, 0xF2ECE2]]) sph(16, c, x, 270, -676, g, 10, 8); }
  else if (p === 'alley') { /* 동네 게시판 (손편지) · 자전거 */ const b = new THREE.Group(); b.position.set(560, 150, -682); g.add(b); box(150, 110, 8, 0x8A6A4A, 0, 0, 0, b); for (let k = 0; k < 5; k++) box(34, 26, 2, [0xFFF6E0, 0xF6E0E0, 0xE0F0F6][k % 3], -50 + (k % 3) * 50, 20 + Math.floor(k / 3) * 40, 5, b); }
  else if (p === 'jeju') { /* 귤나무 화분 · 감물 방석 · 돌 */ for (const x of [520]) orange(g, x, -600, 0.55); }
  else if (p === 'hanok') { /* 장독 · 매화 분재 (벽 선반) */ for (const x of [460, 540]) { cyl(18, 22, 40, 0x5A3A22, x, 140, -670, g, 10); cyl(10, 12, 8, 0x3B2A1E, x, 180, -670, g, 10); } box(220, 8, 40, C.woodD, 500, 132, -672, g); }
  else if (p === 'roastery') { /* 생두 자루 · 서핑보드 */ for (let k = 0; k < 3; k++) { const s = sph(22, 0xC8B08A, 440 + k * 46, 130, -666, g, 8, 6); s.scale.set(1, 1.3, 0.8); } const sb = box(30, 200, 10, 0x6AB4C8, 600, 60, -676, g); sb.rotation.z = 0.1; }
  else if (p === 'gallery') { /* 갤러리 액자 · 재봉틀 */ for (let k = 0; k < 3; k++) { box(70, 90, 6, 0x2A2420, 380 + k * 90, 150, -682, g); box(58, 76, 2, [0xD8C8B0, 0x9AA8B8, 0xC8A090][k], 380 + k * 90, 157, -678, g); } }
  else if (p === 'silla') { /* 석등 · 기와 조각 */ const s = new THREE.Group(); s.position.set(560, 130, -672); g.add(s); box(30, 30, 30, 0xA8A08E, 0, 0, 0, s); box(50, 10, 50, 0x8E8678, 0, 30, 0, s); box(24, 30, 24, 0xA8A08E, 0, 40, 0, s); box(56, 10, 56, 0x5A5652, 0, 70, 0, s); }
}
// ── 합치기 (bake): 층 그룹 안 움직이지 않는 단색 메시를 색마다 하나로 → 그리기 수 줄임
export function bake(G) {
  G.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(G.matrixWorld).invert(), by = new Map(), kill = [];
  G.traverse(o => { if (!o.isMesh || o.userData.live) return; let p = o; while (p && p !== G) { if (p.userData.live || p.userData.occ || p.userData.site) return; p = p.parent; }
    const m = o.material; if (!m || m.map || m.transparent || Array.isArray(m) || !m.isMeshToonMaterial) return;
    const k = m.uuid + (o.castShadow ? 's' : 'n'); if (!by.has(k)) by.set(k, { m, cast: o.castShadow, list: [] }); by.get(k).list.push(o); });
  const mt = new THREE.Matrix4(), nm = new THREE.Matrix3();
  for (const { m, cast, list } of by.values()) { if (list.length < 2) continue; let n = 0; const parts = list.map(o => { const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry; n += g.attributes.position.count; return [o, g]; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let off = 0; const v = new THREE.Vector3();
    for (const [o, g] of parts) { mt.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(mt); const P = g.attributes.position, N = g.attributes.normal;
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(mt); pos.set([v.x, v.y, v.z], (off + i) * 3); v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], (off + i) * 3); } off += P.count; kill.push(o); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.computeBoundingSphere();
    const mm = new THREE.Mesh(geo, m); mm.castShadow = cast; mm.receiveShadow = true; mm.userData.baked = true; G.add(mm); }
  for (const o of kill) o.parent && o.parent.remove(o);
  /* 빈 그룹 정리 */ const empty = []; G.traverse(o => { if (o !== G && o.isGroup && !o.children.length && !o.userData.live) empty.push(o); }); for (const o of empty) o.parent && o.parent.remove(o);
}
