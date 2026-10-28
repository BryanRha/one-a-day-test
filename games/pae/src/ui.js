// 공용 UI: 글자 · 옻칠 판 · 버튼 · 토스트 · 팝업 (나전칠기 톤 — 옻칠 검정 + 금박 테두리 + 주칠 버튼)
import { W, H, FONT, C } from './config.js?v=0.82.4';
import { audio } from './audio.js?v=0.82.4';
import { pushBack } from './oad.js?v=0.82.4';

export const fmt = n => Math.floor(n).toLocaleString('en-US');

export function txt(scene, x, y, s, size = 44, color = C.ivory, o = {}) {
  const t = scene.add.text(x, y, s, {
    fontFamily: FONT, fontSize: `${size}px`, fontStyle: o.weight || '800', color, align: o.align || 'center',
    stroke: o.stroke ?? '#0A0607', strokeThickness: o.thick ?? (o.stroke === null ? 0 : Math.max(0, Math.round(size * 0.1))),
    wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined, lineSpacing: o.lineSpacing ?? 6,
    resolution: o.res || 2, letterSpacing: o.ls || 0,
  }).setOrigin(o.ox ?? 0.5, o.oy ?? 0.5);
  if (o.shadow) t.setShadow(0, Math.round(size * 0.08), '#000000', Math.round(size * 0.2), true, true);
  return t;
}

// 둥근 사각형 캔버스 텍스처 (크기 · 모양마다 한 번 만들어 재사용 — 매 프레임 그래픽 다시 그리기 없음)
export function rr(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const STYLES = {
  red: { top: '#C8343A', bot: '#7E1519', edge: '#F0C77A', hi: 'rgba(255,220,200,0.22)' },
  dark: { top: '#2A2122', bot: '#120D0E', edge: '#B8893A', hi: 'rgba(255,240,220,0.10)' },
  gold: { top: '#F2D08A', bot: '#B07A2E', edge: '#FFF0C0', hi: 'rgba(255,255,255,0.35)' },
  jade: { top: '#3E8A6C', bot: '#1C4A3A', edge: '#CDE8C0', hi: 'rgba(220,255,230,0.18)' },
  panel: { top: '#1D1614', bot: '#0D0909', edge: '#9C7434', hi: 'rgba(255,230,190,0.05)' },
  ivory: { top: '#F6EDD8', bot: '#E2D3B2', edge: '#B8893A', hi: 'rgba(255,255,255,0.4)' },
};
export function boxTex(scene, style, w, h, r = 28, edgeW = 4) {
  const key = `box_${style}_${w}x${h}_${r}_${edgeW}`;
  if (scene.textures.exists(key)) return key;
  const S = STYLES[style] || STYLES.dark, pad = 6;
  const tex = scene.textures.createCanvas(key, w + pad * 2, h + pad * 2), g = tex.getContext();
  g.save(); g.translate(pad, pad);
  g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
  rr(g, 0, 0, w, h, r); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, S.top); gr.addColorStop(1, S.bot); g.fillStyle = gr; g.fill();
  g.shadowColor = 'transparent';
  rr(g, 2, 2, w - 4, h * 0.48, r * 0.9); g.fillStyle = S.hi; g.fill();
  rr(g, edgeW / 2, edgeW / 2, w - edgeW, h - edgeW, r - edgeW / 2); g.lineWidth = edgeW; g.strokeStyle = S.edge; g.stroke();
  rr(g, edgeW + 4, edgeW + 4, w - edgeW * 2 - 8, h - edgeW * 2 - 8, Math.max(2, r - edgeW - 4)); g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,230,180,0.18)'; g.stroke();
  g.restore(); tex.refresh();
  return key;
}
export function panel(scene, x, y, w, h, style = 'panel', r = 30) { return scene.add.image(x, y, boxTex(scene, style, w, h, r, 3)); }

// 누르면 살짝 눌리고 → 손을 떼면 실행
export function pressable(scene, c, w, h, onClick, o = {}) {
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  let down = false;
  c.on('pointerdown', () => { down = true; c.setScale((c.baseScale || 1) * 0.95); });
  const up = fire => {
    if (!down) return; down = false; c.setScale(c.baseScale || 1);
    if (!fire) return;
    if (c.disabled) { if (c.why) { audio.play('sfx_err', { volume: 0.5 }); toast(scene, typeof c.why === 'function' ? c.why() : c.why); } return; }
    if (!o.silent) audio.play('sfx_click', { volume: 0.45 });
    onClick && onClick();
  };
  c.on('pointerup', () => up(true));
  c.on('pointerout', () => up(false));
  return c;
}
// 버튼: style red(주칠) · dark(옻칠) · gold(금박) · jade · ivory / sub = 작은 설명 줄
export function button(scene, x, y, w, h, label, onClick, o = {}) {
  const style = o.style || 'red', c = scene.add.container(x, y);
  const img = scene.add.image(0, 0, boxTex(scene, style, w, h, o.r ?? Math.min(h / 2, 40), 4));
  c.add(img);
  const dark = style === 'gold' || style === 'ivory';
  const size = o.size || Math.round(h * (o.sub ? 0.32 : 0.38));
  const t = txt(scene, 0, o.sub ? -h * 0.13 : -2, label, size, dark ? '#3A1E08' : C.ivory, { stroke: dark ? null : '#00000088', thick: dark ? 0 : 3 });
  c.add(t); c.label = t;
  if (o.sub) { const s = txt(scene, 0, h * 0.23, o.sub, Math.round(size * 0.5), dark ? '#5A3A18' : '#E9D9BC', { stroke: null, weight: '700' }); c.add(s); c.subT = s; }
  c.setLabel = s => t.setText(s);
  c.setEnabled = (on, why) => { c.disabled = !on; c.why = why; c.setAlpha(on ? 1 : 0.5); };
  return pressable(scene, c, w, h, onClick, o);
}
// 동그란 아이콘 버튼 (글자 아이콘 — 그림 대신 한 글자 · 기호)
export function roundButton(scene, x, y, r, glyph, onClick, o = {}) {
  const c = scene.add.container(x, y);
  c.add(scene.add.image(0, 0, boxTex(scene, o.style || 'dark', r * 2, r * 2, r, 3)));
  const t = txt(scene, 0, -1, glyph, o.size || r * 0.8, o.color || C.gold, { stroke: null }); c.add(t); c.label = t;
  if (o.label) c.add(txt(scene, 0, r + 22, o.label, 24, C.dim, { weight: '700', thick: 3 }));
  c.setEnabled = (on, why) => { c.disabled = !on; c.why = why; c.setAlpha(on ? 1 : 0.5); };
  return pressable(scene, c, r * 2 + 10, r * 2 + 10, onClick, o);
}

// 토스트: 짧은 안내 (입력을 말없이 거절하지 않음)
export function toast(scene, msg, o = {}) {
  const y = o.y ?? H * 0.42;
  const t = txt(scene, 0, 0, msg, o.size || 36, o.color || C.ivory, { wrap: 820, thick: 0, stroke: null, weight: '700' });
  const w = Math.min(900, t.width + 80), h = t.height + 44;
  const c = scene.add.container(W / 2, y, [scene.add.image(0, 0, boxTex(scene, 'panel', Math.round(w), Math.round(h), 26, 2)).setAlpha(0.96), t]).setDepth(5000).setAlpha(0);
  scene.tweens.add({ targets: c, alpha: 1, y: y - 16, duration: 180, ease: 'Quad.out' });
  scene.tweens.add({ targets: c, alpha: 0, delay: o.ms || 1700, duration: 300, onComplete: () => c.destroy() });
  return c;
}

// 팝업: 어둡게 + 옻칠 판 + 닫기(뒤로가기 · 바깥 누르기). 반환: { box, close, add(x) }
export function modal(scene, w, h, o = {}) {
  const depth = o.depth || 4000;
  const dim = scene.add.rectangle(W / 2, H / 2, W, H * 2, 0x050304, o.dim ?? 0.72).setDepth(depth).setInteractive();
  const box = scene.add.container(W / 2, o.y ?? H / 2).setDepth(depth + 1);
  box.add(scene.add.image(0, 0, boxTex(scene, 'panel', w, h, 36, 4)));
  if (o.title) box.add(txt(scene, 0, -h / 2 + 70, o.title, o.titleSize || 52, C.gold, { thick: 4 }));
  let closed = false;
  const close = () => { if (closed) return; closed = true; off(); scene.tweens.add({ targets: [box, dim], alpha: 0, duration: 140, onComplete: () => { box.destroy(); dim.destroy(); } }); o.onClose && o.onClose(); };
  const off = pushBack(() => { if (o.locked) return true; close(); return true; });
  if (!o.locked) dim.on('pointerup', close);
  box.setScale(0.92).setAlpha(0); dim.setAlpha(0);
  scene.tweens.add({ targets: box, scale: 1, alpha: 1, duration: 200, ease: 'Back.out' });
  scene.tweens.add({ targets: dim, alpha: 1, duration: 150 });
  return { box, dim, close, add: x => { box.add(x); return x; } };
}
