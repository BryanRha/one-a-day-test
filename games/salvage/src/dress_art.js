// 지도 꾸밈 그리기 (v0.5 레벨 아트) — 계획은 dress.js(three 없음), 여기선 그림 조각 아틀라스 · 바닥/벽 그림 한 덩어리 · 소품 · 배관 · 랜드마크 · 지도 밖 물안개
//  그리기 횟수: 바닥/벽 그림 1 + 빛 웅덩이 1 + 지도 밖 물 1 + 소품·랜드마크(정점 색 재질 2개 — 구역별로 합침) → 지도당 +5~8
//  그림 조각은 코드로 그림(내려받기 0) · 한 번 만들어 계속 씀
import * as THREE from 'three';
import { dress } from './dress.js?v=0.99.19';
import { prop, A } from './assets.js?v=0.99.19';

/* ───── 아틀라스: 1024² · 128px 칸 8×8 (표지판은 가로로 여러 칸) ───── */
const S = 128, N = 8;
const CELLS = {}; /* 이름 → [열, 행, 가로칸, 세로칸] */
['crack', 'rust', 'silt', 'scuff', 'tags', 'lane', 'bay', 'drain',
  'flow', 'oil', 'weed', 'edge', 'tire', 'tactile', 'ticket', 'sleeper',
  'rope', 'p_evac', 'p_tags', 'tide', 'graf', 'p_keep', 'p_fest', 'p_ferry',
  'p_line', 'p_exit', 'graf_isle', 'tile', 'g_pool', 'g_teal', 'g_red', 'g_green', 'grime', 'debris', 'patch', 'bayzone'].forEach((k, i) => CELLS[k] = [i % N, Math.floor(i / N), 1, 1]);
Object.assign(CELLS, { s_station: [0, 5, 4, 1], s_pile: [4, 5, 3, 1], s_ferry: [0, 6, 3, 1], s_sea: [3, 6, 3, 1], s_crane: [0, 7, 3, 1], s_gate: [3, 7, 2, 1], s_car: [5, 7, 1, 1] });
/* M3-B 가라앉은 공장: 1칸 4 (검은 닻 낙서 · 등불 공방 포스터 · 작업 수칙 · 쇳물 자국) + 남는 칸 (줄무늬 바닥 · 표지판 2) */
Object.assign(CELLS, { anchor: [4, 4, 1, 1], p_lampw: [5, 4, 1, 1], p_rule: [6, 4, 1, 1], slag: [7, 4, 1, 1], hazard: [7, 5, 1, 1], s_works: [6, 6, 2, 1], s_relay: [6, 7, 2, 1] }); /* 0~4행 = 1칸짜리(최대 40개) */
export const SIGN_ASPECT = k => (CELLS[k] || LCELLS[k])[2] / (CELLS[k] || LCELLS[k])[3];
/* M4-B 심해 연구소: 큰 아틀라스가 꽉 차서 연구소 몫은 따로 512² (4×4) — 연구소 판에서만 그리기 +1 */
const LN = 4; const LCELLS = { p_coral: [0, 0, 1, 1], p_lrule: [1, 0, 1, 1], mossd: [2, 0, 1, 1], frost: [3, 0, 1, 1], lgrid: [0, 1, 1, 1], toxd: [1, 1, 1, 1], p_noeul: [2, 1, 1, 1], p_hold: [3, 1, 1, 1], s_lab: [0, 2, 2, 1], s_core: [2, 2, 2, 1], s_origin: [0, 3, 2, 1], s_noeul: [2, 3, 2, 1] };
let LATLAS = null;
function latlas() {
  if (LATLAS) return LATLAS;
  const cv = document.createElement('canvas'); cv.width = cv.height = S * LN; const x = cv.getContext('2d');
  let seed = 23; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const cell = (k, f) => { const [c, r, w, h] = LCELLS[k]; x.save(); x.translate(c * S, r * S); x.beginPath(); x.rect(0, 0, w * S, h * S); x.clip(); f(w * S, h * S); x.restore(); };
  const txt = (t, cx, cy, size, col, weight = 800, align = 'center') => { x.font = `${weight} ${size}px ${FONT}`; x.textAlign = align; x.textBaseline = 'middle'; x.fillStyle = col; x.fillText(t, cx, cy); };
  const wear = (w, h, n = 60, a = 0.9) => { x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < n; i++) { x.globalAlpha = a * rnd(); x.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 7, 1 + rnd() * 4); } x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; };
  const board = c => { x.fillStyle = c; x.fillRect(8, 8, 112, 112); x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 3; x.strokeRect(8, 8, 112, 112); };
  cell('p_coral', () => { board('#e8f2f0'); x.fillStyle = '#2f9a92'; x.fillRect(8, 8, 112, 22); txt('산호 복원 3호', 64, 19, 13, '#f4fffd'); for (let i = 0; i < 5; i++) { x.strokeStyle = '#e88a9a'; x.lineWidth = 5 - i * 0.6; x.beginPath(); x.moveTo(64, 108); x.quadraticCurveTo(40 + i * 12, 70, 34 + i * 15, 44 + (i % 2) * 10); x.stroke(); }
    x.fillStyle = '#3fd8b4'; for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(30 + rnd() * 70, 50 + rnd() * 55, 3, 0, 7); x.fill(); } txt('지키려고 키웁니다', 64, 112, 9, '#2a3438', 700); wear(128, 128, 50, 0.6); });
  cell('p_lrule', () => { board('#d8e2e2'); x.fillStyle = '#2a3438'; x.fillRect(8, 8, 112, 22); txt('연구 수칙', 64, 19, 13, '#7dffd8'); x.font = `700 10px ${FONT}`; x.textAlign = 'left'; x.fillStyle = '#2a3438';
    ['1. 수조 뚜껑 닫기', '2. 빛이끼에 빛 X', '3. 따뜻하면 자람', '4. 관제실 = 파수'].forEach((t, i) => x.fillText(t, 16, 48 + i * 18)); wear(128, 128, 50, 0.6); });
  cell('mossd', () => { for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * 50, r = 4 + rnd() * 10; x.fillStyle = `rgba(${40 + rnd() * 30 | 0},${120 + rnd() * 60 | 0},${100 + rnd() * 40 | 0},${0.35 + rnd() * 0.35})`; x.beginPath(); x.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, r, 0, 7); x.fill(); } for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(160,255,230,0.6)'; x.fillRect(20 + rnd() * 88, 20 + rnd() * 88, 2, 2); } });
  cell('frost', () => { const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(230,248,255,0.7)'); g.addColorStop(1, 'rgba(230,248,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); x.strokeStyle = 'rgba(255,255,255,0.8)'; x.lineWidth = 1.2; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50); x.stroke(); } });
  cell('lgrid', () => { x.strokeStyle = 'rgba(47,154,146,0.55)'; x.lineWidth = 3; x.strokeRect(10, 10, 108, 108); x.setLineDash([8, 6]); x.lineWidth = 2; x.strokeRect(22, 22, 84, 84); x.setLineDash([]); txt('B-3', 64, 64, 22, 'rgba(47,154,146,0.6)', 900); wear(128, 128, 80, 0.7); });
  cell('toxd', () => { for (let i = 0; i < 12; i++) { x.fillStyle = `rgba(${110 + rnd() * 40 | 0},${200 + rnd() * 50 | 0},50,${0.3 + rnd() * 0.3})`; x.beginPath(); x.arc(30 + rnd() * 68, 30 + rnd() * 68, 6 + rnd() * 14, 0, 7); x.fill(); } });
  cell('p_noeul', () => { x.fillStyle = 'rgba(255,216,138,0.92)'; x.lineCap = 'round'; x.strokeStyle = 'rgba(255,216,138,0.92)'; x.lineWidth = 7; x.beginPath(); x.moveTo(14, 70); x.lineTo(96, 70); x.moveTo(78, 50); x.lineTo(100, 70); x.lineTo(78, 90); x.stroke(); x.beginPath(); x.arc(30, 40, 11, 0, 7); x.fill(); txt('관제실', 64, 108, 14, 'rgba(255,216,138,0.95)', 900); txt('— 노을', 92, 30, 11, 'rgba(255,216,138,0.85)', 700); wear(128, 128, 90, 0.8); });
  cell('p_hold', () => { x.fillStyle = '#04201f'; x.fillRect(8, 8, 112, 112); x.font = `700 9px ${FONT}`; x.textAlign = 'left'; for (let i = 0; i < 9; i++) { x.fillStyle = i === 4 ? '#ffd88a' : '#7dffd8'; x.fillText(`${412880 - i * 3}  보관 중`, 14, 22 + i * 11); } });
  cell('s_lab', (w, h) => { x.fillStyle = '#e8f2f0'; x.fillRect(0, 0, w, h); x.fillStyle = '#2f9a92'; x.fillRect(0, 0, w, 14); x.fillRect(0, h - 14, w, 14); txt('은포 해양 연구소', w / 2, 56, 28, '#2a3438', 900); txt('산호 복원동 · 대수문 아래', w / 2, 92, 15, '#2f9a92', 700); wear(w, h, 50, 0.5); });
  cell('s_core', (w, h) => { x.fillStyle = '#1f2a2e'; x.fillRect(0, 0, w, h); txt('파수 관제실', w / 2, 56, 30, '#ffd88a', 900); txt('관계자 외 출입 금지', w / 2, 94, 15, '#7dffd8', 700); wear(w, h, 40, 0.5); });
  cell('s_origin', (w, h) => { x.fillStyle = '#e8f2f0'; x.fillRect(0, 0, w, h); x.fillStyle = '#e88a9a'; x.fillRect(0, 0, 14, h); txt('3호 수조', w / 2 + 6, 52, 30, '#2a3438', 900); txt('첫 배양 · 손대지 마시오', w / 2 + 6, 92, 15, '#b05a6a', 700); wear(w, h, 60, 0.6); });
  cell('s_noeul', (w, h) => { x.fillStyle = '#26355a'; x.fillRect(0, 0, w, h); txt('등불 수색대', w / 2, 52, 28, '#ffd88a', 900); txt('불빛 하나가 길 하나', w / 2, 92, 15, '#e8dcc4', 700); wear(w, h, 60, 0.6); });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  return LATLAS = { tex, cv };
}
const FONT = "'Pretendard', -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif";
let ATLAS = null;
function atlas() {
  if (ATLAS) return ATLAS;
  const cv = document.createElement('canvas'); cv.width = cv.height = S * N; const x = cv.getContext('2d');
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const cell = (k, f) => { const [c, r, w, h] = CELLS[k]; x.save(); x.translate(c * S, r * S); x.beginPath(); x.rect(0, 0, w * S, h * S); x.clip(); f(w * S, h * S); x.restore(); };
  const blob = (cx, cy, r, col, n = 14) => { x.fillStyle = col; x.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, rr = r * (0.7 + rnd() * 0.45); x[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); };
  const speck = (n, col, a = 0.5, s0 = 1, s1 = 3, R = 54) => { for (let i = 0; i < n; i++) { const r = Math.sqrt(rnd()) * R, t = rnd() * 6.28; x.globalAlpha = a * rnd(); x.fillStyle = col; const s = s0 + rnd() * (s1 - s0); x.fillRect(64 + Math.cos(t) * r, 64 + Math.sin(t) * r, s, s); } x.globalAlpha = 1; };
  const wear = (w, h, n = 60, a = 0.9) => { x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < n; i++) { x.globalAlpha = a * rnd(); x.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 7, 1 + rnd() * 4); } x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; };
  const txt = (t, cx, cy, size, col, weight = 800, align = 'center') => { x.font = `${weight} ${size}px ${FONT}`; x.textAlign = align; x.textBaseline = 'middle'; x.fillStyle = col; x.fillText(t, cx, cy); };
  const radial = (c0, c1) => (w, h) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 60); g.addColorStop(0, c0); g.addColorStop(1, c1); x.fillStyle = g; x.fillRect(0, 0, 128, 128); };
  /* 바닥 */
  cell('crack', () => { x.lineCap = 'round'; const br = (px, py, a, len, w, d) => { let cx = px, cy = py; x.beginPath(); x.moveTo(cx, cy); for (let i = 0; i < len; i++) { a += (rnd() - 0.5) * 0.9; cx += Math.cos(a) * 6; cy += Math.sin(a) * 6; x.lineTo(cx, cy); if (d < 2 && rnd() < 0.18) { x.strokeStyle = 'rgba(18,22,24,0.8)'; x.lineWidth = w; x.stroke(); br(cx, cy, a + (rnd() - 0.5) * 2, len / 2, w * 0.6, d + 1); x.beginPath(); x.moveTo(cx, cy); } } x.strokeStyle = 'rgba(18,22,24,0.8)'; x.lineWidth = w; x.stroke(); };
    for (let i = 0; i < 4; i++) br(64, 64, i * 1.6 + rnd(), 9, 2.6, 0); x.strokeStyle = 'rgba(230,240,240,0.12)'; x.lineWidth = 1; x.beginPath(); x.arc(64, 64, 7, 0, 6.3); x.stroke(); });
  cell('rust', () => { for (let i = 0; i < 7; i++) blob(40 + rnd() * 48, 40 + rnd() * 48, 10 + rnd() * 18, `rgba(${130 + rnd() * 40 | 0},${60 + rnd() * 20 | 0},${25 + rnd() * 10 | 0},${0.18 + rnd() * 0.2})`); speck(160, '#7a3a1a', 0.7); for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(120,58,26,0.35)'; x.fillRect(46 + rnd() * 36, 60, 2 + rnd() * 2, 30 + rnd() * 30); } });
  cell('silt', () => { for (let i = 0; i < 16; i++) blob(30 + rnd() * 68, 30 + rnd() * 68, 12 + rnd() * 16, `rgba(${96 + rnd() * 20 | 0},${86 + rnd() * 14 | 0},${64 + rnd() * 10 | 0},0.2)`); speck(260, '#5a4c36', 0.45, 1, 2); });
  cell('scuff', () => { x.lineCap = 'round'; for (let i = 0; i < 6; i++) { x.strokeStyle = `rgba(20,20,22,${0.2 + rnd() * 0.2})`; x.lineWidth = 3 + rnd() * 6; x.beginPath(); const y = 20 + rnd() * 88; x.moveTo(12, y); x.quadraticCurveTo(64, y + (rnd() - 0.5) * 40, 116, y + (rnd() - 0.5) * 30); x.stroke(); } });
  cell('tags', () => { for (let i = 0; i < 7; i++) { x.save(); x.translate(18 + rnd() * 92, 18 + rnd() * 92); x.rotate(rnd() * 6.28); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(-9, -13, 20, 28); x.fillStyle = '#efe6d2'; x.fillRect(-10, -14, 20, 28); x.fillStyle = '#c8452f'; x.fillRect(-2, -14, 4, 4); x.strokeStyle = '#c8452f'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, -12); x.quadraticCurveTo(8, -24, 2 + rnd() * 8, -30); x.stroke();
      x.strokeStyle = '#3a3a40'; x.lineWidth = 1.2; for (let l = 0; l < 3; l++) { x.beginPath(); x.moveTo(-6, -4 + l * 6); for (let s = 0; s < 4; s++) x.lineTo(-6 + s * 4, -4 + l * 6 + (rnd() - 0.5) * 3); x.stroke(); } x.restore(); } });
  cell('lane', () => { x.fillStyle = 'rgba(224,178,58,0.75)'; x.fillRect(52, 0, 24, 128); x.fillStyle = 'rgba(224,178,58,0.8)'; x.beginPath(); x.moveTo(44, 70); x.lineTo(64, 92); x.lineTo(84, 70); x.lineTo(76, 66); x.lineTo(64, 80); x.lineTo(52, 66); x.fill(); wear(128, 128, 90); });
  cell('bay', () => { x.strokeStyle = 'rgba(230,226,210,0.6)'; x.lineWidth = 4; x.strokeRect(14, 14, 100, 100); txt('B-07', 64, 66, 34, 'rgba(230,226,210,0.75)', 900); wear(128, 128, 70); });
  cell('drain', () => { x.fillStyle = 'rgba(110,60,30,0.35)'; x.beginPath(); x.arc(64, 64, 52, 0, 6.3); x.fill(); x.fillStyle = '#25292b'; x.beginPath(); x.arc(64, 64, 42, 0, 6.3); x.fill(); x.fillStyle = '#5c6366'; for (let i = -3; i <= 3; i++) x.fillRect(60 + i * 11, 26, 6, 76); x.strokeStyle = '#6d7578'; x.lineWidth = 5; x.beginPath(); x.arc(64, 64, 42, 0, 6.3); x.stroke(); x.fillStyle = 'rgba(10,14,16,0.6)'; x.beginPath(); x.arc(64, 64, 40, 0, 6.3); x.fill(); x.fillStyle = '#5c6366'; for (let i = -3; i <= 3; i++) x.fillRect(61 + i * 11, 26, 5, 76); });
  cell('flow', () => { x.strokeStyle = 'rgba(160,226,232,0.28)'; x.lineWidth = 2; for (let i = 0; i < 9; i++) { x.beginPath(); const sx = 20 + i * 11; x.moveTo(sx, 0); x.bezierCurveTo(sx + 10, 40, sx - 10, 80, sx + 4, 128); x.stroke(); }
    x.fillStyle = 'rgba(190,240,236,0.62)'; for (const y of [26, 60, 94]) { x.beginPath(); x.moveTo(36, y); x.lineTo(64, y + 20); x.lineTo(92, y); x.lineTo(92, y + 9); x.lineTo(64, y + 29); x.lineTo(36, y + 9); x.fill(); } wear(128, 128, 50); });
  cell('oil', () => { const g = x.createRadialGradient(64, 64, 4, 64, 64, 56); g.addColorStop(0, 'rgba(12,12,16,0.75)'); g.addColorStop(0.7, 'rgba(20,18,30,0.6)'); g.addColorStop(0.86, 'rgba(70,40,110,0.35)'); g.addColorStop(0.93, 'rgba(40,120,120,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; blob(64, 64, 54, g, 18); blob(96, 90, 14, 'rgba(14,14,18,0.6)'); });
  cell('weed', () => { x.lineCap = 'round'; for (let i = 0; i < 9; i++) { x.strokeStyle = `rgba(${50 + rnd() * 30 | 0},${90 + rnd() * 40 | 0},${50 + rnd() * 20 | 0},0.75)`; x.lineWidth = 3 + rnd() * 3; x.beginPath(); let px = 20 + rnd() * 88, py = 20 + rnd() * 88, a = rnd() * 6.28; x.moveTo(px, py); for (let s = 0; s < 8; s++) { a += (rnd() - 0.5) * 1.2; px += Math.cos(a) * 7; py += Math.sin(a) * 7; x.lineTo(px, py); } x.stroke(); } speck(40, '#c8d8b0', 0.4, 1, 2); });
  cell('edge', () => { x.save(); x.beginPath(); x.rect(46, 0, 36, 128); x.clip(); for (let i = -4; i < 12; i++) { x.fillStyle = i % 2 ? 'rgba(30,30,30,0.8)' : 'rgba(230,180,50,0.85)'; x.beginPath(); x.moveTo(46, i * 18); x.lineTo(82, i * 18 + 24); x.lineTo(82, i * 18 + 42); x.lineTo(46, i * 18 + 18); x.fill(); } x.restore(); wear(128, 128, 80); });
  cell('tire', () => { for (const cx of [38, 90]) { x.fillStyle = 'rgba(16,16,18,0.4)'; x.fillRect(cx - 9, 0, 18, 128); x.fillStyle = 'rgba(16,16,18,0.4)'; for (let y = 0; y < 128; y += 8) x.fillRect(cx - 9, y, 18, 3); } wear(128, 128, 40, 0.6); });
  cell('tactile', () => { x.fillStyle = 'rgba(226,190,60,0.85)'; x.fillRect(44, 0, 40, 128); x.fillStyle = 'rgba(160,130,30,0.9)'; for (let y = 5; y < 128; y += 10) for (let c = 0; c < 4; c++) { x.beginPath(); x.arc(50 + c * 9.5, y, 2.6, 0, 6.3); x.fill(); } wear(128, 128, 60); });
  cell('ticket', () => { for (let i = 0; i < 6; i++) { x.save(); x.translate(20 + rnd() * 88, 20 + rnd() * 88); x.rotate(rnd() * 6.28); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(-15, -7, 32, 16); x.fillStyle = '#ece4cf'; x.fillRect(-16, -8, 32, 16); x.fillStyle = i % 2 ? '#2f8a8a' : '#d07a8a'; x.fillRect(-16, -8, 32, 4); x.fillStyle = '#4a4a50'; x.fillRect(-12, 0, 14, 2); x.fillRect(-12, 4, 9, 2); x.fillStyle = 'rgba(0,0,0,0.5)'; x.beginPath(); x.arc(10, 2, 2.2, 0, 6.3); x.fill(); x.restore(); } });
  cell('sleeper', () => { for (let y = 6; y < 128; y += 21) { x.fillStyle = 'rgba(58,40,28,0.82)'; x.fillRect(8, y, 112, 9); x.fillStyle = 'rgba(30,22,16,0.5)'; x.fillRect(8, y + 7, 112, 2); } speck(120, '#6a6050', 0.5, 1, 3, 60); });
  cell('rope', () => { x.lineCap = 'round'; x.strokeStyle = 'rgba(194,163,107,0.95)'; x.lineWidth = 6; x.beginPath(); for (let i = 0; i < 160; i++) { const a = i * 0.16, r = 4 + i * 0.22; x[i ? 'lineTo' : 'moveTo'](56 + Math.cos(a) * r, 60 + Math.sin(a) * r); } x.stroke(); x.beginPath(); x.moveTo(90, 70); x.bezierCurveTo(110, 90, 96, 110, 120, 124); x.stroke(); x.strokeStyle = 'rgba(90,70,40,0.5)'; x.lineWidth = 1; x.setLineDash([2, 4]); x.beginPath(); for (let i = 0; i < 160; i++) { const a = i * 0.16, r = 4 + i * 0.22; x[i ? 'lineTo' : 'moveTo'](56 + Math.cos(a) * r, 60 + Math.sin(a) * r); } x.stroke(); x.setLineDash([]); });
  cell('grime', () => { for (let i = 0; i < 22; i++) blob(26 + rnd() * 76, 26 + rnd() * 76, 10 + rnd() * 22, `rgba(${22 + rnd() * 20 | 0},${30 + rnd() * 18 | 0},${28 + rnd() * 14 | 0},${0.06 + rnd() * 0.07})`, 16); speck(200, '#1c2224', 0.35, 1, 3); });
  cell('debris', () => { for (let i = 0; i < 26; i++) { x.save(); x.translate(20 + rnd() * 88, 20 + rnd() * 88); x.rotate(rnd() * 6.28); const s = 3 + rnd() * 7; x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(-s / 2 + 1.5, -s / 2 + 1.5, s, s * 0.7); x.fillStyle = ['#6f7476', '#8d999b', '#5e3c24', '#9a6a3a', '#4a5257'][i % 5]; x.fillRect(-s / 2, -s / 2, s, s * 0.7); x.restore(); } x.strokeStyle = '#3a4044'; x.lineWidth = 2; for (let i = 0; i < 3; i++) { x.beginPath(); const a = rnd() * 6.28, px = 30 + rnd() * 68, py = 30 + rnd() * 68; x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 18, py + Math.sin(a) * 18); x.stroke(); } });
  cell('patch', () => { const dark = rnd() < 0.5; x.fillStyle = dark ? 'rgba(20,26,28,0.22)' : 'rgba(200,190,160,0.12)'; x.fillRect(4, 4, 120, 120); for (let i = 0; i < 18; i++) blob(10 + rnd() * 108, 10 + rnd() * 108, 6 + rnd() * 14, dark ? 'rgba(10,14,16,0.12)' : 'rgba(110,90,60,0.14)', 10); x.strokeStyle = 'rgba(10,12,14,0.16)'; x.lineWidth = 2; x.strokeRect(4, 4, 120, 120); });
  cell('bayzone', () => { x.strokeStyle = 'rgba(224,178,58,0.8)'; x.lineWidth = 6; x.strokeRect(8, 8, 112, 112); x.save(); x.beginPath(); x.rect(8, 8, 112, 112); x.clip(); x.strokeStyle = 'rgba(224,178,58,0.35)'; x.lineWidth = 5; for (let i = -6; i < 8; i++) { x.beginPath(); x.moveTo(i * 20, 0); x.lineTo(i * 20 + 128, 128); x.stroke(); } x.restore(); x.fillStyle = 'rgba(30,30,30,0.5)'; x.fillRect(38, 50, 52, 28); txt('짐 내림', 64, 64, 15, 'rgba(240,226,190,0.95)'); wear(128, 128, 120); });
  /* 벽 */
  const board = (bg, w = 128, h = 128, m = 8) => { x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(m + 3, m + 3, w - m * 2, h - m * 2); x.fillStyle = bg; x.fillRect(m, m, w - m * 2, h - m * 2); };
  const tear = (w, h) => { x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.moveTo(w, h * 0.55); for (let i = 0; i < 8; i++) x.lineTo(w - 8 - rnd() * 26 - i * 4, h * 0.55 + i * h * 0.06); x.lineTo(w, h); x.fill(); x.globalCompositeOperation = 'source-over'; };
  cell('p_evac', () => { board('#2f7a4a'); x.strokeStyle = '#e9e4d8'; x.lineWidth = 3; x.strokeRect(14, 14, 100, 100); txt('대피 안내', 64, 34, 21, '#f2f0e6'); txt('언덕 위 학교', 64, 64, 15, '#f2f0e6', 700); x.fillStyle = '#f2f0e6'; x.fillRect(36, 88, 44, 8); x.beginPath(); x.moveTo(80, 80); x.lineTo(96, 92); x.lineTo(80, 104); x.fill(); tear(128, 128); wear(128, 128, 40); });
  cell('p_tags', () => { board('#8a6a44'); txt('맡긴 짐 번호표', 64, 22, 14, '#2a2420'); for (let i = 0; i < 8; i++) { const px = 22 + (i % 4) * 24, py = 44 + Math.floor(i / 4) * 38; x.fillStyle = '#efe6d2'; x.save(); x.translate(px, py); x.rotate((rnd() - 0.5) * 0.4); x.fillRect(-8, -12, 16, 26); x.fillStyle = '#c8452f'; x.beginPath(); x.arc(0, -9, 2.4, 0, 6.3); x.fill(); x.fillStyle = '#3a3a40'; x.font = `700 9px ${FONT}`; x.textAlign = 'center'; x.fillText(String(11 + i * 7), 0, 4); x.restore(); } if (rnd() < 2) { x.fillStyle = 'rgba(0,0,0,0)'; } wear(128, 128, 30); });
  cell('tide', () => { x.fillStyle = 'rgba(40,70,60,0.35)'; x.fillRect(0, 70, 128, 58); x.fillStyle = 'rgba(30,40,38,0.55)'; x.fillRect(0, 66, 128, 6); x.fillStyle = 'rgba(232,226,206,0.85)'; x.fillRect(54, 6, 20, 116); x.fillStyle = '#2a2a2e'; for (let i = 0; i < 12; i++) x.fillRect(54, 10 + i * 9.6, i % 2 ? 8 : 14, 2); txt('1.5', 92, 12, 13, 'rgba(232,226,206,0.85)', 800); txt('1.0', 92, 50, 13, 'rgba(232,226,206,0.85)', 800); txt('0.5', 92, 88, 13, 'rgba(232,226,206,0.85)', 800); wear(128, 128, 40); });
  cell('graf', () => { x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = 'rgba(240,236,220,0.8)'; x.lineWidth = 4; x.beginPath(); x.arc(44, 56, 22, 0, 6.3); x.stroke(); x.beginPath(); x.arc(30, 36, 7, 0, 6.3); x.arc(58, 36, 7, 0, 6.3); x.stroke(); x.fillStyle = 'rgba(240,236,220,0.85)'; x.beginPath(); x.arc(37, 54, 3, 0, 6.3); x.arc(51, 54, 3, 0, 6.3); x.fill(); x.beginPath(); x.moveTo(38, 66); x.quadraticCurveTo(44, 72, 50, 66); x.stroke();
    x.strokeStyle = 'rgba(232,120,60,0.85)'; x.lineWidth = 3.5; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(78 + i * 9, 40); x.lineTo(78 + i * 9, 74); x.stroke(); } x.beginPath(); x.moveTo(72, 70); x.lineTo(114, 44); x.stroke(); x.strokeStyle = 'rgba(120,200,210,0.75)'; x.beginPath(); x.moveTo(20, 104); x.bezierCurveTo(50, 90, 80, 118, 110, 98); x.stroke(); });
  cell('p_keep', () => { board('#2a2d30'); txt('보관 구역', 64, 46, 22, '#e0b23a'); txt('B', 64, 80, 30, '#e0b23a', 900); x.save(); x.beginPath(); x.rect(8, 100, 112, 18); x.clip(); for (let i = -2; i < 10; i++) { x.fillStyle = i % 2 ? '#22262a' : '#e0b23a'; x.beginPath(); x.moveTo(i * 16, 100); x.lineTo(i * 16 + 16, 100); x.lineTo(i * 16 + 34, 118); x.lineTo(i * 16 + 18, 118); x.fill(); } x.restore(); wear(128, 128, 60); });
  cell('p_fest', () => { const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#e0782f'); g.addColorStop(1, '#a8406a'); board(g); for (let i = 0; i < 5; i++) { x.strokeStyle = ['#ffe9a0', '#fff', '#7dffd8'][i % 3]; x.lineWidth = 2; const cx = 30 + rnd() * 68, cy = 28 + rnd() * 30, r = 8 + rnd() * 10; for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; x.beginPath(); x.moveTo(cx + Math.cos(a) * r * 0.4, cy + Math.sin(a) * r * 0.4); x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); x.stroke(); } }
    txt('은포 바다 축제', 64, 82, 15, '#fff6e0'); txt('등불 띄우는 밤', 64, 102, 11, '#ffe9c0', 600); tear(128, 128); wear(128, 128, 40); });
  cell('p_ferry', () => { board('#22344e'); txt('출항 시간', 64, 24, 15, '#f2f0e6'); x.font = `700 12px ${FONT}`; x.textAlign = 'left'; x.fillStyle = '#c8d4e0'; x.fillText('18:00  섬', 22, 52); x.fillText('20:00  섬', 22, 72); x.fillStyle = '#c8452f'; x.fillRect(16, 84, 96, 20); x.fillStyle = '#fff2d8'; x.fillText('22:00 마지막 배', 20, 95); wear(128, 128, 40); });
  cell('p_line', () => { board('#ece8de'); x.strokeStyle = '#2f8a8a'; x.lineWidth = 6; x.beginPath(); x.moveTo(18, 74); x.lineTo(60, 74); x.lineTo(78, 54); x.lineTo(112, 54); x.stroke(); for (const [px, py, n] of [[22, 74, '은포'], [60, 74, ''], [88, 54, ''], [110, 54, '섬']]) { x.fillStyle = '#fff'; x.beginPath(); x.arc(px, py, 6, 0, 6.3); x.fill(); x.strokeStyle = '#1f5a5e'; x.lineWidth = 2.5; x.stroke(); if (n) txt(n, px, py + 22, 13, '#22262a'); } txt('해저선', 64, 24, 14, '#1f5a5e'); wear(128, 128, 30); });
  cell('p_exit', () => { x.fillStyle = '#1f9a52'; x.fillRect(6, 30, 116, 68); x.fillStyle = '#f2fff4'; x.beginPath(); x.arc(30, 46, 6, 0, 6.3); x.fill(); x.lineWidth = 5; x.strokeStyle = '#f2fff4'; x.lineCap = 'round'; x.beginPath(); x.moveTo(28, 54); x.lineTo(24, 70); x.lineTo(34, 82); x.moveTo(24, 70); x.lineTo(16, 84); x.moveTo(27, 58); x.lineTo(38, 64); x.stroke(); txt('비상구', 80, 64, 22, '#f2fff4'); });
  cell('graf_isle', () => { x.lineCap = 'round'; x.strokeStyle = 'rgba(240,236,220,0.85)'; x.lineWidth = 7; x.beginPath(); x.moveTo(14, 64); x.lineTo(76, 64); x.moveTo(58, 44); x.lineTo(78, 64); x.lineTo(58, 84); x.stroke(); txt('섬', 102, 64, 30, 'rgba(126,216,210,0.9)', 900); x.fillStyle = 'rgba(240,236,220,0.6)'; for (let i = 0; i < 5; i++) x.fillRect(20 + i * 12, 68, 2, 8 + rnd() * 18); });
  cell('tile', () => { for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 3 === 0 ? '#2f8a8a' : (i + j) % 3 === 1 ? '#d8d2c0' : '#1f5a5e'; x.fillRect(i * 8 + 0.5, 48 + j * 8 + 0.5, 7, 7); } wear(128, 128, 50); });
  cell('g_pool', radial('rgba(255,214,140,1)', 'rgba(255,170,80,0)')); cell('g_teal', radial('rgba(140,255,230,1)', 'rgba(60,200,200,0)')); cell('g_red', radial('rgba(255,120,90,1)', 'rgba(255,60,40,0)')); cell('g_green', radial('rgba(140,255,170,1)', 'rgba(60,200,100,0)'));
  /* 랜드마크 표지판 */
  cell('s_station', (w, h) => { x.fillStyle = '#2a3d5a'; x.fillRect(0, 0, w, h); x.fillStyle = '#ece8de'; x.fillRect(0, 40, w, 48); txt('은 포', 150, 66, 40, '#1b2433', 900); txt('EUNPO', 300, 66, 26, '#1b2433', 800); txt('섬 방면 →', 430, 66, 22, '#2f8a8a', 800); txt('해저선', 60, 20, 18, '#c8d4e0', 700); wear(w, h, 60, 0.6); });
  cell('s_pile', (w, h) => { x.fillStyle = '#e8dcc4'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(120,90,60,0.25)'; for (let i = 0; i < 30; i++) x.fillRect(rnd() * w, rnd() * h, 20, 2); txt('맡긴 짐', w / 2, 46, 44, '#4a2a1a', 900); txt('꼭 찾으러 올게요', w / 2, 98, 22, '#7a3a2e', 700); });
  cell('s_ferry', (w, h) => { x.fillStyle = '#22344e'; x.fillRect(0, 0, w, h); txt('마지막 배', w / 2 - 50, 64, 44, '#f2f0e6', 900); txt('22:00', w / 2 + 120, 64, 40, '#ffd88a', 900); wear(w, h, 40, 0.6); });
  cell('s_sea', (w, h) => { x.fillStyle = '#22262a'; x.fillRect(0, 0, w, h); txt('해저 통로 B', w / 2, 52, 40, '#e0b23a', 900); txt('섬 방면 · 수압 주의', w / 2, 100, 20, '#c8c8c0', 700); wear(w, h, 50, 0.6); });
  cell('s_crane', (w, h) => { x.fillStyle = '#e0b23a'; x.fillRect(0, 0, w, h); txt('은포항 3', w / 2, 66, 54, '#22262a', 900); wear(w, h, 60, 0.7); });
  cell('s_gate', (w, h) => { x.fillStyle = '#8e4a2c'; x.fillRect(0, 0, w, h); txt('수문 2', w / 2, 60, 52, '#efe6d2', 900); x.fillStyle = 'rgba(239,230,210,0.8)'; x.fillRect(16, 104, w - 32, 6); wear(w, h, 70, 0.7); });
  cell('s_car', () => { x.fillStyle = '#2f8a8a'; x.fillRect(0, 0, 128, 128); txt('3', 64, 66, 80, '#ece8de', 900); });
  /* M3-B 공장 */
  const anc = (cx, cy, s, col, lw = 6) => { x.save(); x.translate(cx, cy); x.scale(s, s); x.strokeStyle = col; x.fillStyle = col; x.lineCap = 'round'; x.lineWidth = lw; x.beginPath(); x.arc(0, -34, 8, 0, 6.3); x.stroke(); x.beginPath(); x.moveTo(0, -26); x.lineTo(0, 30); x.moveTo(-18, -14); x.lineTo(18, -14); x.stroke(); x.beginPath(); x.arc(0, 4, 28, 0.25, Math.PI - 0.25); x.stroke(); for (const sx of [-1, 1]) { x.beginPath(); x.moveTo(sx * 27, 12); x.lineTo(sx * 36, 4); x.lineTo(sx * 31, 18); x.fill(); } x.restore(); };
  cell('anchor', () => { x.fillStyle = 'rgba(20,20,22,0.85)'; x.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28, r = 52 + rnd() * 10; x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r * 0.9); } x.fill(); anc(64, 66, 1.15, 'rgba(236,232,222,0.92)', 7); for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(20,20,22,0.8)'; x.fillRect(30 + rnd() * 70, 108 + rnd() * 8, 3, 6 + rnd() * 12); } wear(128, 128, 50); });
  cell('p_lampw', () => { board('#2a3550'); x.fillStyle = '#ffd88a'; x.beginPath(); x.moveTo(64, 26); x.lineTo(78, 42); x.lineTo(74, 70); x.lineTo(54, 70); x.lineTo(50, 42); x.closePath(); x.globalAlpha = 0.9; x.fill(); x.globalAlpha = 1; x.strokeStyle = '#c99a4a'; x.lineWidth = 3; x.stroke(); x.fillStyle = 'rgba(255,216,138,0.25)'; x.beginPath(); x.arc(64, 52, 30, 0, 6.3); x.fill(); txt('은포 등불 공방', 64, 88, 14, '#f2ead8'); txt('불빛 하나가 길 하나', 64, 106, 10, '#ffd88a', 600); wear(128, 128, 40); tear(128, 128); });
  cell('p_rule', () => { board('#e8dcc4'); x.fillStyle = '#c8452f'; x.fillRect(12, 12, 104, 20); txt('작업 수칙', 64, 23, 14, '#fff6e0'); x.font = `700 10px ${FONT}`; x.textAlign = 'left'; x.fillStyle = '#3a3a40'; ['1. 국자는 둘이서', '2. 쇳물 앞 장갑', '3. 불은 끄고 퇴근', '4. 대수문 회로 3층'].forEach((t, i) => x.fillText(t, 18, 48 + i * 17)); wear(128, 128, 60); });
  cell('slag', () => { for (let i = 0; i < 9; i++) blob(36 + rnd() * 56, 36 + rnd() * 56, 8 + rnd() * 16, `rgba(${40 + rnd() * 20 | 0},${34 + rnd() * 10 | 0},${30 + rnd() * 10 | 0},${0.55 + rnd() * 0.3})`); for (let i = 0; i < 5; i++) blob(40 + rnd() * 48, 40 + rnd() * 48, 3 + rnd() * 5, `rgba(${150 + rnd() * 60 | 0},${70 + rnd() * 30 | 0},30,0.6)`, 8); speck(120, '#1a1614', 0.6); });
  cell('hazard', () => { x.save(); x.beginPath(); x.rect(0, 40, 128, 48); x.clip(); for (let i = -4; i < 12; i++) { x.fillStyle = i % 2 ? 'rgba(20,20,22,0.75)' : 'rgba(224,178,58,0.82)'; x.beginPath(); x.moveTo(i * 16, 40); x.lineTo(i * 16 + 16, 40); x.lineTo(i * 16 + 64, 88); x.lineTo(i * 16 + 48, 88); x.fill(); } x.restore(); wear(128, 128, 120); });
  cell('s_works', (w, h) => { x.fillStyle = '#2a2d30'; x.fillRect(0, 0, w, h); x.fillStyle = '#c99a4a'; x.fillRect(6, 6, w - 12, 6); x.fillRect(6, h - 12, w - 12, 6); txt('은포 등불 공방', w / 2, 58, 30, '#efe6d2', 900); txt('조력 발전소 · 2주조장', w / 2, 96, 16, '#c99a4a', 700); wear(w, h, 60, 0.6); });
  cell('s_relay', (w, h) => { x.fillStyle = '#1f2a2e'; x.fillRect(0, 0, w, h); x.save(); x.beginPath(); x.rect(0, 0, w, 18); x.clip(); for (let i = -2; i < 20; i++) { x.fillStyle = i % 2 ? '#22262a' : '#e0b23a'; x.beginPath(); x.moveTo(i * 16, 0); x.lineTo(i * 16 + 16, 0); x.lineTo(i * 16 + 34, 18); x.lineTo(i * 16 + 18, 18); x.fill(); } x.restore(); txt('파수 관제 연결선', w / 2, 62, 28, '#ffd88a', 900); txt('은포 수리공사 · 대수문 직결', w / 2, 100, 15, '#9fc8c8', 700); wear(w, h, 50, 0.6); });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.anisotropy = 4; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  return ATLAS = { tex, cv };
}
const MAT = {};
function decalMat() { return MAT.decal ||= new THREE.MeshLambertMaterial({ map: atlas().tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, alphaTest: 0.03 }); }
function decalMatL() { return MAT.decalL ||= new THREE.MeshLambertMaterial({ map: latlas().tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, alphaTest: 0.03 }); }
function glowMat() { return MAT.glow ||= new THREE.MeshBasicMaterial({ map: atlas().tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }); }

/* 그림 조각을 사각형 하나씩 한 기하에 모음 (바닥 = 눕힘 · 벽 = 세움) */
class Quads {
  constructor(cells = CELLS, n = N) { this.p = []; this.n = []; this.u = []; this.i = []; this.C = cells; this.NN = n; }
  add(k, cx, cy, cz, w, h, ry, vert, M) {
    const N = this.NN; const [c, r, cw, ch] = this.C[k]; const pad = 2 / (S * N); const u0 = c / N + pad, u1 = (c + cw) / N - pad, v0 = r / N + pad, v1 = (r + ch) / N - pad;
    const cs = Math.cos(ry), sn = Math.sin(ry); const base = this.p.length / 3; const V = new THREE.Vector3(), Nn = new THREE.Vector3();
    /* 모서리: (로컬 x, 로컬 y/z) → 바닥이면 (x, 0, z) · 벽이면 (x, y, 0) — 앞 = +z */
    for (const [lx, ly, uu, vv] of [[-w / 2, -h / 2, u0, v0], [w / 2, -h / 2, u1, v0], [w / 2, h / 2, u1, v1], [-w / 2, h / 2, u0, v1]]) {
      if (vert) { V.set(lx * cs, -ly, -lx * sn); Nn.set(sn, 0, cs); } else { V.set(lx * cs + ly * sn, 0, -lx * sn + ly * cs); Nn.set(0, 1, 0); }
      V.x += cx; V.y += cy; V.z += cz; if (M) { V.applyMatrix4(M); Nn.transformDirection(M); }
      this.p.push(V.x, V.y, V.z); this.n.push(Nn.x, Nn.y, Nn.z); this.u.push(uu, vv);
    }
    this.i.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  mesh(mat, name) {
    if (!this.i.length) return null; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); g.setIndex(this.i); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.name = name; m.frustumCulled = false; return m;
  }
}
/* 랜드마크 위 표지판 · 빛 (모델 기준 자리) */
const MARK_SIGNS = { lm_noeul: [['s_noeul', 0, 3.55, 0.14, 2.6]], lm_origin: [['s_origin', 0, 1.25, 3.12, 1.7]], lm_screens: [['s_core', 0, 5.75, 0.34, 2.8]], lm_furnace: [['s_works', 0, 3.5, 2.42, 3.4]], lm_relay: [['s_relay', 0, 3.75, 0.5, 3.0]], lm_pile: [['s_pile', 0.4, 5.4, 0.37, 2.25]], lm_wheel: [['s_gate', 0, 4.6, 0.16, 2.0]], lm_booth: [['s_ferry', 2.0, 5.6, 1.06, 2.4]], lm_gantry: [['s_crane', -3.2, 11.3, 0.74, 3.0]], lm_clock: [['s_station', 0, 4.3, 0.11, 5.3]], lm_hatch: [['s_sea', 0, 6.4, 0.22, 3.4]], lm_train: [['s_car', 0, 3.1, 5.53, 0.7]] };
const MARK_GLOW = { lm_noeul: [['g_pool', 0, 3]], lm_origin: [['g_teal', 0, 7]], lm_screens: [['g_teal', 0, 5]], lm_anchor: [['g_red', -1.6, 3.0], ['g_red', 1.4, 3.0]], lm_furnace: [['g_red', 0, 4.4]], lm_relay: [['g_pool', 0, 4.0]], lm_pile: [['g_pool', 1.9, 3.2]], lm_wheel: [['g_red', 3.0, 2.2]], lm_boiler: [['g_red', 0, 3.4], ['g_red', 0.9, 2.4]], lm_booth: [['g_pool', 0, 4.2], ['g_pool', 2.0, 2.6]], lm_gantry: [['g_pool', 1.6, 3.2]], lm_light: [['g_pool', 0, 6]], lm_clock: [['g_pool', 0, 4.2]], lm_train: [['g_pool', 2.2, 5], ['g_pool', -2.2, 5]], lm_hatch: [['g_teal', 0, 7]] };
const FAR = { ware: [0.05, 0.16, 0.18], harbor: [0.04, 0.12, 0.18], tunnel: [0.04, 0.13, 0.13], factory: [0.06, 0.1, 0.1], lab: [0.03, 0.11, 0.12] };

/* map.js build() 안에서 부름 — statics(합쳐짐) · group(따로) · addBox(판정) · out(가진 재질/기하 정리용) */
/* 꾸밈을 켠 지도 (지도마다 따로 켜고 끔 — 묶음 파일이 없으면 끔) */
export const DRESS_ON = { ware: 1, harbor: 1, tunnel: 1, factory: 1, lab: 1 };
export function buildDress(P, map, statics, group, addBox, out) {
  if (!DRESS_ON[map]) return null;
  const D = dress(P); const has = k => !!A.props[k];
  const dec = new Quads(), glow = new Quads();
  const decL = new Quads(LCELLS, LN); const pick = k => LCELLS[k] ? decL : dec; /* M4-B 연구소 아틀라스 */
  for (const d of D.decals) { if (!CELLS[d.c] && !LCELLS[d.c]) continue; pick(d.c).add(d.c, d.x, d.v ? d.y : 0.062 + (d.zone * 0.0005), d.z, d.w, d.h, d.ry, !!d.v); }
  /* 주제 소품 (판정은 벽 쪽 작은 상자) */
  for (const p of D.props) { if (!has(p.k)) continue; const o = prop(p.k); o.position.set(p.x, 0, p.z); o.rotation.y = p.ry; if (p.s) o.scale.setScalar(p.s); if (p.tilt) { o.rotation.z = p.tilt; o.position.y = 0.15 * (p.s || 1); } if (p.y != null) { o.position.y = p.y; o.rotation.set(p.rx, p.ry, p.rz); } o.userData.zone = p.zone; statics.add(o); if (p.solid) addBox(p.x, p.z, p.solid[0], p.solid[1], p.solid[2]); }
  /* 옆벽 배관 (4m 마디 · 굵은 관 + 가는 관 · 벽 판정 안) — 꾸밈 묶음 모델이라 재질 합쳐짐 */
  for (const r of D.pipes) { if (!has(r.k)) continue; const L = r.z1 - r.z0, n = Math.max(1, Math.round(L / 4)), seg = L / n;
    for (let i = 0; i < n; i++) { const o = prop(r.k); o.rotation.y = Math.PI / 2 + (i % 2 ? Math.PI : 0); o.scale.set(seg / 4 + 0.01, 1, 1); o.position.set(r.x, r.y, r.z0 + seg * (i + 0.5)); o.userData.zone = r.zone; statics.add(o); } }
  /* 랜드마크 */
  const M4 = new THREE.Matrix4();
  for (const m of D.marks) {
    if (!has(m.k)) continue; const o = prop(m.k); o.position.set(m.x, -0.6, m.z); /* 밑동이 물에 잠기게 */ o.rotation.y = m.ry; o.userData.zone = m.zone; statics.add(o);
    o.updateMatrix(); M4.copy(o.matrix);
    for (const [k, lx, ly, lz, w] of MARK_SIGNS[m.k] || []) pick(k).add(k, lx, ly, lz, w, w / SIGN_ASPECT(k), 0, true, M4);
    for (const [k, lx, s] of MARK_GLOW[m.k] || []) glow.add(k, lx, -0.12, 1.2, s, s, 0, false, M4);
    if (m.k === 'lm_light') { /* 등대 빛줄기 2개 (raid 가 X.beams 를 돌림) */
      const beamM = new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }); out.mats.push(beamM);
      const piv = new THREE.Group(); piv.position.set(m.x, 10.3, m.z); group.add(piv);
      const bg = new THREE.ConeGeometry(3.2, 30, 16, 1, true); out.geos.push(bg);
      for (const a of [0, Math.PI]) { const b = new THREE.Mesh(bg, beamM); b.rotation.z = Math.PI / 2; b.position.x = 15; b.userData.keepGeo = true; const h = new THREE.Group(); h.rotation.y = a; h.add(b); piv.add(h); }
      out.beams.push(piv); }
  }
  for (const g of D.glows || []) glow.add(g.c, g.x, 0.075, g.z, g.s, g.s, 0, false); /* 공장 작업등 빛 웅덩이 (M3-B) */
  const dml = decL.mesh(decalMatL(), 'static'); if (dml) { dml.renderOrder = 1; dml.receiveShadow = true; group.add(dml); }
  const dm = dec.mesh(decalMat(), 'static'); if (dm) { dm.renderOrder = 1; dm.receiveShadow = true; group.add(dm); }
  const gm = glow.mesh(glowMat(), 'static'); if (gm) { gm.renderOrder = 3; group.add(gm); }
  out.dress = D;
  return D;
}

/* 지도 밖: 검정 대신 어두운 물 + 천천히 흐르는 물안개 (한 장 · 안개 적용) — uTime 은 물 평면과 같이 씀 */
export function farWater(P, map, uTime) {
  const c = FAR[map] || FAR.ware;
  const mat = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uDeep: { value: new THREE.Vector3(...c) }, uMist: { value: new THREE.Vector3(0.36, 0.52, 0.56) }, uC: { value: new THREE.Vector2(P.W / 2, P.H / 2) }, uHalf: { value: new THREE.Vector2(P.W / 2, P.H / 2) } }]),
    vertexShader: ['varying vec2 vW;', '#include <fog_pars_vertex>', 'void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;', '#include <fog_vertex>', '}'].join('\n'),
    fragmentShader: `uniform float uTime; uniform vec3 uDeep; uniform vec3 uMist; uniform vec2 uC; uniform vec2 uHalf; varying vec2 vW;
      #include <fog_pars_fragment>
      float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h1(i), h1(i + vec2(1., 0.)), f.x), mix(h1(i + vec2(0., 1.)), h1(i + vec2(1., 1.)), f.x), f.y); }
      void main(){
        vec2 p = vW;
        float r = sin(p.x * 0.8 + uTime * 0.9) * sin(p.y * 0.62 - uTime * 0.7) + sin((p.x - p.y) * 0.45 + uTime * 0.55) * 0.55;
        float hi = smoothstep(0.95, 1.45, r);
        float m = n2(p * 0.07 + vec2(uTime * 0.035, uTime * 0.02)) * 0.62 + n2(p * 0.19 - vec2(uTime * 0.06, uTime * 0.01)) * 0.38;
        vec2 d = max(abs(p - uC) - uHalf, 0.); float e = length(d);
        vec3 col = uDeep + hi * vec3(0.09, 0.15, 0.16);
        col = mix(col, uMist * 0.5, smoothstep(0.3, 0.95, m) * 0.45);
        col += uMist * 0.1 * exp(-e * 0.18);
        gl_FragColor = vec4(col, 1.);
        #include <fog_fragment>
      }`,
  });
  mat.uniforms.uTime = uTime;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), mat); mesh.rotation.x = -Math.PI / 2; mesh.position.set(P.W / 2, -0.75, P.H / 2); mesh.name = 'static'; mesh.userData.own = true; mesh.frustumCulled = false;
  return mesh;
}
