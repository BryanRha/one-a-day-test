// 프리미엄 UI 키트: 깔끔한 글자 · 유리 패널 · 그라데이션 버튼 · 선 아이콘 (모두 코드로 그림 — 선명하고 가벼움)
//   2026-11-09 QA 시트 #1: 룬 다이스(남색 + 금빛)와 같은 색이라 구분이 안 됨 → 블록 블리스만의 '노을 하늘' 색 —
//   자두빛 유리 패널 · 복숭아→산호 주 버튼 · 하늘빛 보조 버튼 · 민트 시작 버튼 (보석 블록이 가장 돋보이게 바탕은 차분하게)
import { W, H, FONT } from './config.js?v=0.99.15';
import { audio } from './audio.js?v=0.99.15';
import { pushBack } from './oad.js?v=0.99.15';

export const C = {
  ink: '#1A0F33', text: '#FFF8FC', sub: '#D6C4EC', dim: '#9C88BC', gold: '#FFD36A', cyan: '#7FE7FF', pink: '#FF8FBF', green: '#6FF0B0', coral: '#FF9A7A',
};
export const fmt = n => Math.floor(n).toLocaleString('en-US');

// 글자: 굵기(700/800/900) · 자간 · 은은한 그림자 (굵은 외곽선 없이)
export function T(scene, x, y, s, size = 44, color = C.text, o = {}) {
  const t = scene.add.text(x, y, s, {
    fontFamily: FONT, fontStyle: String(o.w || 800), fontSize: `${size}px`, color, align: o.align || 'center',
    wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined, lineSpacing: o.lh ?? 6, resolution: 2,
    stroke: o.stroke || '#000000', strokeThickness: o.stroke ? (o.thick || 6) : 0,
  }).setOrigin(o.ox ?? 0.5, o.oy ?? 0.5);
  if (o.ls) t.setLetterSpacing(o.ls);
  if (o.shadow !== false) t.setShadow(0, Math.max(2, size * 0.06), 'rgba(0,0,0,0.45)', Math.max(4, size * 0.12), false, true);
  return t;
}

const rr = (g, x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
function canvasTex(scene, key, w, h, draw) { if (scene.textures.exists(key)) return key; const c = scene.textures.createCanvas(key, w, h); draw(c.getContext(), w, h); c.refresh(); return key; }

// 유리 패널 (반투명 자두빛 + 얇은 밝은 테두리 + 위쪽 은은한 빛)
export function panel(scene, x, y, w, h, o = {}) {
  const r = o.r ?? 36, key = `pnl3_${w}_${h}_${r}_${o.tone || 'n'}`;
  canvasTex(scene, key, w + 96, h + 96, (g) => {
    g.translate(48, 48);
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 24; g.shadowOffsetY = 10;
    rr(g, 0, 0, w, h, r);
    const gr = g.createLinearGradient(0, 0, 0, h);
    if (o.tone === 'gold') { gr.addColorStop(0, 'rgba(92,44,58,0.86)'); gr.addColorStop(1, 'rgba(52,22,44,0.9)'); }
    else { gr.addColorStop(0, 'rgba(62,34,104,0.74)'); gr.addColorStop(1, 'rgba(34,18,66,0.84)'); }
    g.fillStyle = gr; g.fill(); g.shadowColor = 'transparent';
    rr(g, 1.5, 1.5, w - 3, h - 3, r - 1.5); g.lineWidth = 3; g.strokeStyle = o.tone === 'gold' ? 'rgba(255,170,130,0.6)' : 'rgba(255,255,255,0.2)'; g.stroke();
    const hl = g.createLinearGradient(0, 0, 0, Math.min(120, h * 0.4)); hl.addColorStop(0, 'rgba(255,255,255,0.12)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    rr(g, 3, 3, w - 6, Math.min(120, h * 0.4), r - 3); g.fillStyle = hl; g.fill();
  });
  return scene.add.image(x, y, key);
}

// 버튼: gold(주 버튼 · 복숭아→산호) · indigo(보조 · 하늘빛) · green(민트) · ghost(테두리만) · ad(광고 보상 · 눈에 띄는 보랏빛 분홍)
const STY = {
  gold: { a: '#FFD9A0', b: '#FF8C72', c: '#C8506A', text: '#3E0F2A' },
  indigo: { a: '#A8EBFF', b: '#55A9FF', c: '#3466CC', text: '#08224A' },
  green: { a: '#B2F9DA', b: '#3FD3A0', c: '#1F9774', text: '#053326' },
  ghost: { a: 'rgba(255,255,255,0.16)', b: 'rgba(255,255,255,0.08)', c: 'rgba(255,255,255,0.32)', text: '#FFF8FC' },
  ad: { a: '#F3B4FF', b: '#B65CFF', c: '#7A2FC8', text: '#FFFFFF' },
};
export function btn(scene, x, y, w, h, label, onClick, o = {}) {
  const st = STY[o.style || 'gold'], r = o.r ?? h / 2, key = `btn3_${o.style || 'gold'}_${w}_${h}`;
  canvasTex(scene, key, w + 80, h + 80, (g) => {
    g.translate(40, 34);
    g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 18; g.shadowOffsetY = 10;
    rr(g, 0, 6, w, h - 6, r); g.fillStyle = st.c; g.fill(); g.shadowColor = 'transparent';
    rr(g, 0, 0, w, h - 8, r); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, st.a); gr.addColorStop(1, st.b); g.fillStyle = gr; g.fill();
    rr(g, 6, 5, w - 12, (h - 8) * 0.45, r * 0.8); const hl = g.createLinearGradient(0, 0, 0, h * 0.45); hl.addColorStop(0, 'rgba(255,255,255,0.45)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = hl; g.fill();
    if (o.style === 'ghost') { rr(g, 1, 1, w - 2, h - 10, r); g.lineWidth = 3; g.strokeStyle = st.c; g.stroke(); }
  });
  const c = scene.add.container(x, y);
  const img = scene.add.image(0, 0, key);
  c.add(img);
  let tx = 0;
  if (o.icon) { const ic = scene.add.image(-w / 2 + h * 0.55, -4, o.icon).setDisplaySize(h * 0.42, h * 0.42).setTint(Phaser.Display.Color.HexStringToColor(st.text).color); c.add(ic); tx = h * 0.18; }
  const t = T(scene, tx, -4, label, o.size || Math.round(h * 0.34), st.text, { w: 900, shadow: false, ls: o.ls ?? 1 });
  c.add(t); c.label = t;
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  let down = false;
  c.on('pointerdown', () => { if (c.disabled) return; down = true; c.setScale(0.96); });
  const up = fire => { if (!down) return; down = false; c.setScale(1); if (fire && !c.disabled) { audio.play('sfx_click', { volume: 0.5 }); onClick && onClick(); } };
  c.on('pointerup', () => up(true)); c.on('pointerout', () => up(false));
  c.setEnabled = on => { c.disabled = !on; c.setAlpha(on ? 1 : 0.45); return c; };
  c.setLabel = s => { t.setText(s); return c; };
  return c;
}

// 동그란 유리 아이콘 버튼
export function iconBtn(scene, x, y, icon, onClick, size = 104) {
  const key = `ib3_${size}`;
  canvasTex(scene, key, size + 20, size + 20, g => {
    g.translate(10, 10); g.beginPath(); g.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    const gr = g.createLinearGradient(0, 0, 0, size); gr.addColorStop(0, 'rgba(98,58,150,0.82)'); gr.addColorStop(1, 'rgba(42,22,78,0.9)'); g.fillStyle = gr; g.fill();
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.24)'; g.stroke();
  });
  const c = scene.add.container(x, y);
  const ic = scene.add.image(0, 0, icon).setDisplaySize(size * 0.46, size * 0.46);
  c.add([scene.add.image(0, 0, key), ic]); c.icon = ic;
  c.setSize(size, size).setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => c.setScale(0.92));
  c.on('pointerout', () => c.setScale(1));
  c.on('pointerup', () => { c.setScale(1); audio.play('sfx_click', { volume: 0.5 }); onClick && onClick(); });
  return c;
}

/* 유리 알약 버튼 (아이콘 + 짧은 글자) — 동그란 아이콘 버튼과 같은 유리 · 같은 높이. 원어데이로 나가기(QA #3 · 룬 다이스 #21 과 같은 방식) */
export function pillBtn(scene, x, y, w, h, icon, label, onClick) {
  const key = `pill3_${w}_${h}`;
  canvasTex(scene, key, w + 20, h + 20, g => {
    g.translate(10, 10); rr(g, 2, 2, w - 4, h - 4, (h - 4) / 2);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(98,58,150,0.82)'); gr.addColorStop(1, 'rgba(42,22,78,0.9)'); g.fillStyle = gr; g.fill();
    g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.24)'; g.stroke();
  });
  const c = scene.add.container(x, y), ic = scene.add.image(-w / 2 + h * 0.5, 0, icon).setDisplaySize(h * 0.42, h * 0.42);
  const t = T(scene, -w / 2 + h * 0.86, -1, label, Math.round(h * 0.3), C.text, { ox: 0, w: 800, shadow: false });
  c.add([scene.add.image(0, 0, key), ic, t]); c.icon = ic; c.label = t;
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => c.setScale(0.94));
  c.on('pointerout', () => c.setScale(1));
  c.on('pointerup', () => { c.setScale(1); audio.play('sfx_click', { volume: 0.5 }); onClick && onClick(); });
  return c;
}

// 선 아이콘 (흰색, 틴트로 색 변경)
export function makeIcons(scene) {
  const S = 96, L = 8;
  const ic = (k, f) => canvasTex(scene, k, S, S, g => { g.strokeStyle = '#FFFFFF'; g.fillStyle = '#FFFFFF'; g.lineWidth = L; g.lineCap = 'round'; g.lineJoin = 'round'; f(g); });
  ic('i_pause', g => { g.fillRect(28, 22, 13, 52); g.fillRect(55, 22, 13, 52); });
  ic('i_play', g => { g.beginPath(); g.moveTo(32, 20); g.lineTo(76, 48); g.lineTo(32, 76); g.closePath(); g.fill(); });
  ic('i_home', g => { g.beginPath(); g.moveTo(18, 46); g.lineTo(48, 20); g.lineTo(78, 46); g.stroke(); g.beginPath(); g.moveTo(28, 40); g.lineTo(28, 76); g.lineTo(68, 76); g.lineTo(68, 40); g.stroke(); });
  ic('i_retry', g => { g.beginPath(); g.arc(48, 50, 26, -Math.PI * 0.9, Math.PI * 0.6); g.stroke(); g.beginPath(); g.moveTo(18, 22); g.lineTo(22, 42); g.lineTo(40, 36); g.stroke(); });
  ic('i_sound', g => { g.beginPath(); g.moveTo(18, 38); g.lineTo(32, 38); g.lineTo(50, 22); g.lineTo(50, 74); g.lineTo(32, 58); g.lineTo(18, 58); g.closePath(); g.fill(); g.beginPath(); g.arc(52, 48, 18, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(52, 48, 32, -0.8, 0.8); g.stroke(); });
  ic('i_sound_off', g => { g.beginPath(); g.moveTo(18, 38); g.lineTo(32, 38); g.lineTo(50, 22); g.lineTo(50, 74); g.lineTo(32, 58); g.lineTo(18, 58); g.closePath(); g.fill(); g.beginPath(); g.moveTo(62, 36); g.lineTo(84, 60); g.moveTo(84, 36); g.lineTo(62, 60); g.stroke(); });
  ic('i_music', g => { g.beginPath(); g.moveTo(38, 66); g.lineTo(38, 22); g.lineTo(74, 16); g.lineTo(74, 58); g.stroke(); g.beginPath(); g.arc(30, 68, 10, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(66, 60, 10, 0, Math.PI * 2); g.fill(); });
  ic('i_music_off', g => { g.globalAlpha = 0.5; g.beginPath(); g.moveTo(38, 66); g.lineTo(38, 22); g.lineTo(74, 16); g.lineTo(74, 58); g.stroke(); g.globalAlpha = 1; g.beginPath(); g.moveTo(20, 20); g.lineTo(80, 80); g.stroke(); });
  ic('i_crown', g => { g.beginPath(); g.moveTo(16, 70); g.lineTo(12, 30); g.lineTo(32, 48); g.lineTo(48, 20); g.lineTo(64, 48); g.lineTo(84, 30); g.lineTo(80, 70); g.closePath(); g.fill(); });
  ic('i_flame', g => { g.beginPath(); g.moveTo(48, 12); g.bezierCurveTo(70, 34, 80, 52, 70, 70); g.bezierCurveTo(62, 86, 34, 86, 26, 70); g.bezierCurveTo(18, 54, 30, 44, 34, 30); g.bezierCurveTo(40, 42, 44, 44, 48, 40); g.bezierCurveTo(52, 30, 50, 22, 48, 12); g.fill(); });
  ic('i_trophy', g => { g.beginPath(); g.moveTo(28, 16); g.lineTo(68, 16); g.lineTo(66, 44); g.bezierCurveTo(62, 58, 34, 58, 30, 44); g.closePath(); g.fill(); g.fillRect(43, 56, 10, 14); g.fillRect(30, 70, 36, 10); g.beginPath(); g.arc(24, 30, 10, Math.PI * 0.5, Math.PI * 1.5); g.stroke(); g.beginPath(); g.arc(72, 30, 10, -Math.PI * 0.5, Math.PI * 0.5); g.stroke(); });
  ic('i_star', g => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? 17 : 38; g.lineTo(48 + Math.cos(a) * rr2, 50 + Math.sin(a) * rr2); } g.closePath(); g.fill(); });
  ic('i_gear', g => { g.lineWidth = 9; g.beginPath(); g.arc(48, 48, 16, 0, Math.PI * 2); g.stroke(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(48 + Math.cos(a) * 26, 48 + Math.sin(a) * 26); g.lineTo(48 + Math.cos(a) * 36, 48 + Math.sin(a) * 36); g.stroke(); } });
  ic('i_close', g => { g.beginPath(); g.moveTo(26, 26); g.lineTo(70, 70); g.moveTo(70, 26); g.lineTo(26, 70); g.stroke(); });
  ic('i_lock', g => { g.fillRect(24, 44, 48, 36); g.beginPath(); g.arc(48, 42, 16, Math.PI, 0); g.stroke(); });
  ic('i_check', g => { g.lineWidth = 11; g.beginPath(); g.moveTo(20, 50); g.lineTo(40, 70); g.lineTo(78, 28); g.stroke(); });
  ic('i_grid', g => { for (const [x, y] of [[18, 18], [52, 18], [18, 52], [52, 52]]) g.fillRect(x, y, 26, 26); });
  ic('i_film', g => { g.lineWidth = 7; g.strokeRect(16, 24, 64, 48); g.beginPath(); g.moveTo(42, 38); g.lineTo(58, 48); g.lineTo(42, 58); g.closePath(); g.fill(); });
  /* 원어데이로 · 폭탄 · 한 줄 · 바꾸기 · 비우기 · 미션 (2026-11-09 QA 시트) */
  ic('i_exit', g => { g.beginPath(); g.moveTo(50, 18); g.lineTo(78, 18); g.lineTo(78, 78); g.lineTo(50, 78); g.stroke(); g.beginPath(); g.moveTo(62, 48); g.lineTo(18, 48); g.stroke(); g.beginPath(); g.moveTo(34, 32); g.lineTo(18, 48); g.lineTo(34, 64); g.stroke(); });
  ic('i_bomb', g => { g.beginPath(); g.arc(44, 56, 28, 0, Math.PI * 2); g.fill(); g.lineWidth = 6; g.beginPath(); g.moveTo(62, 34); g.quadraticCurveTo(70, 18, 82, 20); g.stroke(); g.beginPath(); g.arc(84, 16, 6, 0, Math.PI * 2); g.fill(); });
  ic('i_line', g => { for (let k = 0; k < 4; k++) g.fillRect(12 + k * 19, 38, 15, 20); g.lineWidth = 6; g.beginPath(); g.moveTo(6, 22); g.lineTo(90, 22); g.moveTo(6, 74); g.lineTo(90, 74); g.stroke(); });
  ic('i_shuffle', g => { g.beginPath(); g.moveTo(14, 30); g.lineTo(34, 30); g.bezierCurveTo(52, 30, 50, 66, 68, 66); g.lineTo(80, 66); g.moveTo(14, 66); g.lineTo(34, 66); g.bezierCurveTo(52, 66, 50, 30, 68, 30); g.lineTo(80, 30); g.stroke(); g.beginPath(); g.moveTo(72, 20); g.lineTo(84, 30); g.lineTo(72, 40); g.moveTo(72, 56); g.lineTo(84, 66); g.lineTo(72, 76); g.stroke(); });
  ic('i_sparkle', g => { const st = (cx, cy, r) => { g.beginPath(); g.moveTo(cx, cy - r); g.quadraticCurveTo(cx, cy, cx + r, cy); g.quadraticCurveTo(cx, cy, cx, cy + r); g.quadraticCurveTo(cx, cy, cx - r, cy); g.quadraticCurveTo(cx, cy, cx, cy - r); g.fill(); }; st(42, 52, 32); st(74, 22, 14); st(78, 76, 10); });
  ic('i_target', g => { g.lineWidth = 7; g.beginPath(); g.arc(48, 48, 34, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(48, 48, 18, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(48, 48, 6, 0, Math.PI * 2); g.fill(); });
}

// 팝업: 어두운 막 + 유리 패널 + 제목
export function popup(scene, title, w = 900, h = 900, o = {}) {
  const root = scene.add.container(0, 0).setDepth(o.depth || 1000);
  const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x04060F, 0.72).setInteractive();
  root.add(dim);
  const box = scene.add.container(W / 2, o.y || H / 2);
  root.add(box);
  box.add(panel(scene, 0, 0, w, h, { r: 44 }));
  if (title) box.add(T(scene, 0, -h / 2 + 80, title, 56, C.text, { w: 900, ls: 1 }));
  const content = scene.add.container(0, 0); box.add(content);
  const close = () => { if (root.closing) return; root.closing = true; scene.tweens.add({ targets: box, scale: 0.92, alpha: 0, duration: 140, onComplete: () => { root.destroy(); o.onClose && o.onClose(); } }); scene.tweens.add({ targets: dim, alpha: 0, duration: 140 }); };
  if (o.closable !== false) { box.add(iconBtn(scene, w / 2 - 70, -h / 2 + 70, 'i_close', close, 88)); if (o.dimClose !== false) dim.on('pointerup', close); }
  // 뒤로가기 (One a Day): 맨 위 팝업부터 — 닫을 수 있으면 닫고, 닫기 없는 창은 onBack 이 있으면 그것(예: 일시정지 → 계속하기), 없으면 그대로 둠
  const unback = pushBack(() => { if (root.closing) return false; if (o.onBack) { o.onBack(); return true; } if (o.closable === false) return true; close(); return true; });
  root.once('destroy', unback);
  box.setScale(0.92); box.alpha = 0;
  scene.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 200, ease: 'Cubic.easeOut' });
  Object.assign(root, { box, content, close, w, h });
  return root;
}

export function toast(scene, msg, color = C.text, y = H * 0.4) {
  const t = T(scene, W / 2, y, msg, 42, color, { w: 800 }).setDepth(3000).setAlpha(0);
  scene.tweens.add({ targets: t, alpha: 1, y: y - 20, duration: 180, yoyo: true, hold: 1100, onComplete: () => t.destroy() });
}
