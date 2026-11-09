// 로딩 + 코드로 그리는 그림들: 블록 스킨 7종 × 7색 · 보석 3종 · 배경 테마 · 아이콘
import { W, H, TITLE } from '../config.js?v=0.99.14';
import { SFX } from '../audio.js?v=0.99.14';
import { makeTextures } from '../fx.js?v=0.99.14';
import { makeIcons } from '../pui.js?v=0.99.14';
import { load } from '../save.js?v=0.99.14';
import { helloOnce, effSkin } from '../bmflow.js?v=0.99.14';

// 블록 색: [기본, 밝은 면, 어두운 면]
export const PALETTE = [
  ['#FF4D6A', '#FF9DAE', '#B8203F'],
  ['#FF9433', '#FFC685', '#C45E0A'],
  ['#FFCF2E', '#FFEA90', '#C99300'],
  ['#3FD37A', '#9AF2BE', '#1E8E4E'],
  ['#2FC4F0', '#9DE9FF', '#127FB0'],
  ['#4F72FF', '#A9BBFF', '#2840C0'],
  ['#A85CFF', '#D9B8FF', '#6E2BC8'],
];
export const TINT = PALETTE.map(p => parseInt(p[0].slice(1), 16));

// 배경 테마 = '블록 하늘' 5가지 (2026-11-09 QA 시트 #1 · #9): 판을 다 비울 때마다 바뀜
//   노을 · 새벽 · 오로라 밤 · 라벤더 구름 · 별빛 — 하늘 그라데이션 + 해/달 빛 + 구름 띠 (떠다니는 보석 블록 · 흐르는 구름은 sky.js 가 움직임)
//   판은 자두빛 유리라 블록 색이 가장 먼저 보임 · 룬 다이스(어두운 신전)와 한눈에 다르게
export const THEMES = [
  { name: '노을 하늘', stops: [[0, '#1B1140'], [0.36, '#47297C'], [0.66, '#B4568C'], [0.86, '#F28C86'], [1, '#FFC79A']], sun: [0.5, 0.8, 0.5, 'rgba(255,214,150,0.55)'], cloud: [255, 196, 214], stars: 0.35, board: 0x1E1240, cell: '#2E1E58', drift: 0xFFC2D8 },
  { name: '새벽 하늘', stops: [[0, '#0E1A40'], [0.4, '#2E4C8E'], [0.7, '#7EA6D8'], [0.9, '#F4C9C0'], [1, '#FFE2BE']], sun: [0.72, 0.84, 0.42, 'rgba(255,236,200,0.6)'], cloud: [236, 240, 255], stars: 0.25, board: 0x14204A, cell: '#22336A', drift: 0xD6E6FF },
  { name: '오로라 밤', stops: [[0, '#050B22'], [0.45, '#0C2446'], [0.8, '#13445A'], [1, '#1C6266']], sun: [0.3, 0.2, 0.3, 'rgba(200,230,255,0.35)'], aurora: true, cloud: [120, 200, 210], stars: 0.6, board: 0x0B1E36, cell: '#163452', drift: 0x8CFFE0 },
  { name: '라벤더 구름', stops: [[0, '#21143E'], [0.38, '#563C8C'], [0.72, '#A88BD2'], [1, '#F3C8E2']], sun: [0.25, 0.74, 0.45, 'rgba(255,230,250,0.5)'], cloud: [255, 236, 250], stars: 0.2, board: 0x24164A, cell: '#36245E', drift: 0xF0D2FF },
  { name: '별빛 하늘', stops: [[0, '#08061C'], [0.5, '#1E164C'], [1, '#3C2A74']], sun: [0.78, 0.18, 0.28, 'rgba(255,240,210,0.45)'], cloud: [150, 130, 220], stars: 1, moon: true, board: 0x180F38, cell: '#2A1D52', drift: 0xFFE7A8 },
];

function rr(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// 스킨별 블록 그리기
function drawBlock(g, S, [base, light, dark], skin) {
  const p = S * 0.035, s = S - p * 2, r = S * 0.14;
  g.save();
  if (skin === 'neon') {
    rr(g, p + 4, p + 4, s - 8, s - 8, r); g.fillStyle = 'rgba(8,10,30,0.92)'; g.fill();
    g.shadowColor = base; g.shadowBlur = S * 0.16; g.lineWidth = S * 0.075; g.strokeStyle = base; rr(g, p + 8, p + 8, s - 16, s - 16, r * 0.8); g.stroke();
    g.shadowBlur = 0; g.lineWidth = S * 0.025; g.strokeStyle = light; rr(g, p + 8, p + 8, s - 16, s - 16, r * 0.8); g.stroke();
    rr(g, p + s * 0.3, p + s * 0.3, s * 0.4, s * 0.4, r * 0.5); g.fillStyle = base; g.globalAlpha = 0.35; g.fill();
    g.restore(); return;
  }
  if (skin === 'glass') {
    rr(g, p, p, s, s, r); const gr = g.createLinearGradient(0, p, S, p + s); gr.addColorStop(0, light); gr.addColorStop(1, base); g.globalAlpha = 0.78; g.fillStyle = gr; g.fill(); g.globalAlpha = 1;
    rr(g, p, p, s, s, r); g.lineWidth = S * 0.045; g.strokeStyle = 'rgba(255,255,255,0.75)'; g.stroke();
    g.beginPath(); g.moveTo(p + s * 0.12, p + s * 0.62); g.lineTo(p + s * 0.62, p + s * 0.12); g.lineTo(p + s * 0.82, p + s * 0.12); g.lineTo(p + s * 0.12, p + s * 0.82); g.closePath(); g.fillStyle = 'rgba(255,255,255,0.42)'; g.fill();
    g.restore(); return;
  }
  if (skin === 'matte') {
    rr(g, p, p, s, s, r); g.fillStyle = dark; g.fill();
    rr(g, p, p, s, s * 0.94, r); g.fillStyle = base; g.fill();
    rr(g, p + s * 0.08, p + s * 0.08, s * 0.84, s * 0.76, r * 0.7); const gi = g.createLinearGradient(0, p, 0, p + s); gi.addColorStop(0, 'rgba(255,255,255,0.16)'); gi.addColorStop(1, 'rgba(0,0,0,0.08)'); g.fillStyle = gi; g.fill();
    g.restore(); return;
  }
  if (skin === 'aurora') {
    /* 오로라: 깊은 밤색 몸체 + 아래에서 번지는 제 색 빛 + 청록→보라 빛띠 + 얇은 빛 테두리 */
    rr(g, p, p, s, s, r); g.fillStyle = '#0A1030'; g.fill();
    g.save(); rr(g, p, p, s, s, r); g.clip();
    const rg = g.createRadialGradient(p + s * 0.3, p + s * 0.95, 0, p + s * 0.3, p + s * 0.95, s * 1.05); rg.addColorStop(0, light); rg.addColorStop(0.45, base); rg.addColorStop(1, 'rgba(10,16,48,0)');
    g.globalAlpha = 0.95; g.fillStyle = rg; g.fillRect(p, p, s, s);
    const band = g.createLinearGradient(p, p + s * 0.2, p + s, p + s * 0.55); band.addColorStop(0, 'rgba(90,255,210,0)'); band.addColorStop(0.35, 'rgba(90,255,210,0.55)'); band.addColorStop(0.7, 'rgba(190,120,255,0.45)'); band.addColorStop(1, 'rgba(190,120,255,0)');
    g.globalAlpha = 1; g.fillStyle = band; g.beginPath(); g.moveTo(p, p + s * 0.38); g.bezierCurveTo(p + s * 0.35, p + s * 0.12, p + s * 0.65, p + s * 0.5, p + s, p + s * 0.22); g.lineTo(p + s, p + s * 0.42); g.bezierCurveTo(p + s * 0.65, p + s * 0.7, p + s * 0.35, p + s * 0.32, p, p + s * 0.58); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; [[0.22, 0.2, 0.022], [0.72, 0.14, 0.016], [0.84, 0.7, 0.014]].forEach(([x, y, k]) => { g.beginPath(); g.arc(p + s * x, p + s * y, S * k, 0, Math.PI * 2); g.fill(); });
    g.restore();
    rr(g, p + 2, p + 2, s - 4, s - 4, r); g.lineWidth = S * 0.035; g.strokeStyle = light; g.globalAlpha = 0.85; g.stroke(); g.globalAlpha = 1;
    g.restore(); return;
  }
  if (skin === 'prism') {
    /* 프리즘: 가운데로 모이는 네 면(크리스탈 컷) + 무지개 빛줄기 + 가운데 반짝임 */
    const cx = p + s / 2, cy = p + s / 2, tri = (ax, ay, bx, by, col, a = 1) => { g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(cx, cy); g.closePath(); g.globalAlpha = a; g.fillStyle = col; g.fill(); g.globalAlpha = 1; };
    g.save(); rr(g, p, p, s, s, r); g.clip();
    tri(p, p, p + s, p, light); tri(p + s, p, p + s, p + s, base); tri(p + s, p + s, p, p + s, dark); tri(p, p + s, p, p, base, 0.8);
    const rb = g.createLinearGradient(p, p + s, p + s, p); ['#FF5C7A', '#FFB347', '#FFF27A', '#7CFFB2', '#6FD3FF', '#9C8CFF', '#FF7AE0'].forEach((c, k) => rb.addColorStop(k / 6, c));
    g.globalAlpha = 0.5; g.fillStyle = rb; g.beginPath(); g.moveTo(p + s * 0.05, p + s); g.lineTo(p + s * 0.62, p); g.lineTo(p + s * 0.84, p); g.lineTo(p + s * 0.27, p + s); g.closePath(); g.fill(); g.globalAlpha = 1;
    g.restore();
    g.beginPath(); g.moveTo(cx, cy - s * 0.16); g.lineTo(cx + s * 0.05, cy); g.lineTo(cx, cy + s * 0.16); g.lineTo(cx - s * 0.05, cy); g.closePath(); g.fillStyle = 'rgba(255,255,255,0.95)'; g.fill();
    g.beginPath(); g.moveTo(cx - s * 0.16, cy); g.lineTo(cx, cy - s * 0.05); g.lineTo(cx + s * 0.16, cy); g.lineTo(cx, cy + s * 0.05); g.closePath(); g.fill();
    rr(g, p + 1, p + 1, s - 2, s - 2, r); g.lineWidth = S * 0.03; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.stroke();
    g.restore(); return;
  }
  if (skin === 'gold') { base = '#E8B54A'; light = '#FFF0B8'; dark = '#8A5F12'; }
  // 주얼(기본): 깎은 보석 — 가장자리 4면 경사 + 가운데 볼록 + 광택
  rr(g, p, p, s, s, r); g.fillStyle = dark; g.fill();
  const i = s * 0.16;
  g.beginPath(); g.moveTo(p, p); g.lineTo(p + s, p); g.lineTo(p + s - i, p + i); g.lineTo(p + i, p + i); g.closePath(); g.fillStyle = light; g.fill();        // 위 경사
  g.beginPath(); g.moveTo(p, p); g.lineTo(p + i, p + i); g.lineTo(p + i, p + s - i); g.lineTo(p, p + s); g.closePath(); g.fillStyle = light; g.globalAlpha = 0.75; g.fill(); g.globalAlpha = 1; // 왼 경사
  g.beginPath(); g.moveTo(p + s, p); g.lineTo(p + s, p + s); g.lineTo(p + s - i, p + s - i); g.lineTo(p + s - i, p + i); g.closePath(); g.fillStyle = base; g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1; // 오른 경사
  const gr = g.createLinearGradient(0, p + i, 0, p + s - i); gr.addColorStop(0, light); gr.addColorStop(0.35, base); gr.addColorStop(1, base);
  g.fillStyle = gr; g.fillRect(p + i, p + i, s - i * 2, s - i * 2);   // 윗면
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(p + i + s * 0.06, p + i + s * 0.06, s * 0.22, s * 0.06);
  g.save(); rr(g, p, p, s, s, r); g.clip(); g.restore();
  if (skin === 'gold') { g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(p + s * 0.2, p + s); g.lineTo(p + s * 0.55, p); g.lineTo(p + s * 0.7, p); g.lineTo(p + s * 0.35, p + s); g.closePath(); g.fill(); }
  g.restore();
}

// 보석: 사파이어(마름모) · 루비(원) · 에메랄드(팔각)
function drawGem(g, S, k) {
  const cols = [['#7FE8FF', '#1FA6E0', '#0B5A9A'], ['#FF9EC0', '#F0306A', '#8A0E35'], ['#9CFFC4', '#22C46E', '#0B6B39']][k];
  g.save(); g.translate(S / 2, S / 2);
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = S * 0.08; g.shadowOffsetY = S * 0.04;
  const R = S * 0.36;
  g.beginPath();
  if (k === 0) { g.moveTo(0, -R); g.lineTo(R * 0.85, 0); g.lineTo(0, R); g.lineTo(-R * 0.85, 0); }
  else if (k === 1) g.arc(0, 0, R * 0.92, 0, Math.PI * 2);
  else for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; g.lineTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92); }
  g.closePath();
  const gr = g.createLinearGradient(-R, -R, R, R); gr.addColorStop(0, cols[0]); gr.addColorStop(0.5, cols[1]); gr.addColorStop(1, cols[2]);
  g.fillStyle = gr; g.fill(); g.shadowColor = 'transparent';
  g.lineWidth = S * 0.04; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.stroke();
  // 면 반사
  g.beginPath(); g.moveTo(-R * 0.45, -R * 0.15); g.lineTo(0, -R * 0.6); g.lineTo(R * 0.15, -R * 0.35); g.lineTo(-R * 0.25, R * 0.05); g.closePath(); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
  g.beginPath(); g.arc(R * 0.32, R * 0.3, S * 0.035, 0, Math.PI * 2); g.fill();
  g.restore();
}

export function makeBlockTextures(scene, skin) {
  const T = scene.textures, S = 128;
  PALETTE.forEach((p, i) => {
    const k = `blk_${i}`;
    if (T.exists(k)) T.remove(k);
    const c = T.createCanvas(k, S, S); drawBlock(c.getContext(), S, p, skin); c.refresh();
  });
}
// 스킨 미리보기용 (컬렉션 화면)
export function makeSkinPreview(scene, skin) {
  const T = scene.textures, k = `skin_${skin}`, S = 128;
  if (T.exists(k)) return k;
  const c = T.createCanvas(k, S * 2, S * 2), g = c.getContext();
  [[0, 0, 0], [1, 0, 2], [0, 1, 4], [1, 1, 6]].forEach(([x, y, col]) => { g.save(); g.translate(x * S, y * S); drawBlock(g, S, PALETTE[col], skin); g.restore(); });
  c.refresh(); return k;
}

// 하늘 한 장 그리기 (테마마다 같은 모양이 나오게 고정 난수)
function paintSky(g, w, h, th, seed) {
  let a = 1234567 + seed * 7919; const R = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
  const gr = g.createLinearGradient(0, 0, 0, h); for (const [p, col] of th.stops) gr.addColorStop(p, col); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // 별 (위쪽일수록 많이)
  for (let n = 0; n < 160 * th.stars; n++) { const y = Math.pow(R(), 1.8) * h * 0.6; g.fillStyle = `rgba(255,255,255,${0.15 + R() * 0.6})`; g.beginPath(); g.arc(R() * w, y, R() * 1.4 + 0.3, 0, Math.PI * 2); g.fill(); }
  // 해 · 달 빛
  const [sx, sy, sr, sc] = th.sun, rg = g.createRadialGradient(w * sx, h * sy, 0, w * sx, h * sy, w * sr * 1.6); rg.addColorStop(0, sc); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h);
  if (th.moon) { g.fillStyle = 'rgba(255,246,220,0.95)'; g.beginPath(); g.arc(w * sx, h * sy, 26, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(w * sx + 12, h * sy - 8, 24, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = 'source-over'; }
  // 오로라 띠
  if (th.aurora) for (let k = 0; k < 3; k++) {
    const y0 = h * (0.16 + k * 0.08), bg = g.createLinearGradient(0, y0 - 80, 0, y0 + 120); bg.addColorStop(0, 'rgba(80,255,200,0)'); bg.addColorStop(0.5, k === 1 ? 'rgba(170,120,255,0.22)' : 'rgba(80,255,200,0.24)'); bg.addColorStop(1, 'rgba(80,255,200,0)');
    g.fillStyle = bg; g.beginPath(); g.moveTo(0, y0 + 40); for (let x = 0; x <= w; x += 20) g.lineTo(x, y0 + Math.sin(x / 70 + k * 2) * 40); for (let x = w; x >= 0; x -= 20) g.lineTo(x, y0 + 120 + Math.sin(x / 90 + k) * 30); g.closePath(); g.fill();
  }
  // 구름 띠: 뒤(옅고 높음) → 앞(짙고 낮음) · 동그라미를 겹쳐 뭉게구름
  const [cr, cg, cb] = th.cloud;
  [[0.5, 0.1, 22], [0.64, 0.16, 26], [0.8, 0.22, 30], [0.93, 0.3, 34]].forEach(([yb, al, rad], L) => {
    for (let x = -40; x < w + 60; x += rad * (0.9 + R() * 0.6)) {
      const y = h * yb + Math.sin(x / 60 + L) * 18 + (R() - 0.5) * 20, r = rad * (1.2 + R() * 1.4);
      const cgd = g.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r); cgd.addColorStop(0, `rgba(${cr},${cg},${cb},${al + 0.08})`); cgd.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      g.fillStyle = cgd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  });
  // 아래쪽 은은한 빛 안개
  const fg = g.createLinearGradient(0, h * 0.82, 0, h); fg.addColorStop(0, 'rgba(255,255,255,0)'); fg.addColorStop(1, `rgba(${cr},${cg},${cb},0.18)`); g.fillStyle = fg; g.fillRect(0, h * 0.82, w, h * 0.18);
}

export function makeThemeTextures(scene) {
  const T = scene.textures;
  THEMES.forEach((th, i) => {
    const k = `bg_t${i}`; if (T.exists(k)) return;
    const w = 540, h = 1300, c = T.createCanvas(k, w, h), g = c.getContext();
    paintSky(g, w, h, th, i);
    c.refresh();
    // 빈 칸
    const ck = `cell_t${i}`, S = 128, cc = T.createCanvas(ck, S, S), cg = cc.getContext();
    rr(cg, 6, 6, S - 12, S - 12, S * 0.12); cg.fillStyle = th.cell; cg.fill();
    rr(cg, 6, 6, S - 12, S - 12, S * 0.12); cg.lineWidth = 2; cg.strokeStyle = 'rgba(255,255,255,0.08)'; cg.stroke();
    const ig = cg.createLinearGradient(0, 6, 0, 30); ig.addColorStop(0, 'rgba(0,0,0,0.28)'); ig.addColorStop(1, 'rgba(0,0,0,0)'); rr(cg, 6, 6, S - 12, 30, S * 0.12); cg.fillStyle = ig; cg.fill();
    cc.refresh();
  });
  for (let k = 0; k < 3; k++) { const key = `gem_${k}`; if (T.exists(key)) continue; const c = T.createCanvas(key, 96, 96); drawGem(c.getContext(), 96, k); c.refresh(); }
  if (!T.exists('ghost')) { const c = T.createCanvas('ghost', 128, 128), g = c.getContext(); rr(g, 7, 7, 114, 114, 18); g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.stroke(); c.refresh(); }
}

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    const bar = this.add.rectangle(W / 2 - 240, H / 2 + 90, 4, 6, 0xF5C451).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2 + 90, 480, 6, 0xFFFFFF, 0.12);
    this.add.text(W / 2, H / 2, TITLE, { fontFamily: 'Pretendard', fontStyle: '900', fontSize: '84px', color: '#F4F6FF' }).setOrigin(0.5).setLetterSpacing(2);
    this.load.on('progress', v => { bar.width = 480 * v; });
    this.load.json('manifest', 'assets/manifest.json');
    this.load.once('filecomplete-json-manifest', (k, t, m) => {
      for (const n of m.images) { const [key, ext] = Array.isArray(n) ? n : [n, 'png']; this.load.image(key, `assets/img/${key}.${ext}`); }
      for (const [n, s] of Object.entries(m.sheets)) this.load.spritesheet(n, `assets/fx/${n}.png`, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
      for (const n of SFX) this.load.audio(n, [`assets/audio/${n}.m4a`]);
    });
  }
  create() {
    makeTextures(this);
    makeIcons(this);
    makeThemeTextures(this);
    const m = this.cache.json.get('manifest');
    for (const [n, s] of Object.entries(m.sheets)) this.anims.create({ key: n, frames: this.anims.generateFrameNumbers(n, { start: 0, end: s.frames - 1 }), frameRate: s.fps, repeat: 0 });
    const q = new URLSearchParams(location.search);
    /* 원어데이 전용 스킨은 hello 결과로 열림 판단 (최대 0.8초 · 밖이면 바로) */
    helloOnce().then(() => {
      makeBlockTextures(this, effSkin());
      this.scene.start(q.has('play') ? 'Play' : q.has('adv') ? 'Adventure' : 'Home');
    });
  }
}
