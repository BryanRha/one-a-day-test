// 공용 UI: 판 · 버튼 · 글자 (세련된 어두운 유리판 + 금빛 강조)
import { FONT, C } from './config.js?v=0.95.2';
import { audio, S } from './audio.js?v=0.95.2';

export function text(sc, x, y, s, size = 40, color = C.ink, opt = {}) {
  const t = sc.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: opt.weight || '800', color, align: opt.align || 'center', stroke: opt.stroke || '#0B0D12', strokeThickness: opt.st ?? Math.round(size / 9), wordWrap: opt.wrap ? { width: opt.wrap } : undefined, lineSpacing: opt.ls ?? 4 });
  t.setOrigin(opt.ox ?? 0.5, opt.oy ?? 0.5);
  if (opt.shadow !== false) t.setShadow(0, Math.round(size / 14), '#000000', Math.round(size / 8), true, true);
  return t;
}
export function panel(sc, x, y, w, h, opt = {}) {
  const g = sc.add.graphics();
  const r = opt.r ?? 28;
  g.fillStyle(0x000000, 0.35).fillRoundedRect(x + 4, y + 10, w, h, r);
  g.fillStyle(opt.fill ?? C.panel, opt.alpha ?? 0.92).fillRoundedRect(x, y, w, h, r);
  g.fillStyle(0xFFFFFF, 0.05).fillRoundedRect(x + 4, y + 4, w - 8, Math.min(h / 2, 60), { tl: r - 4, tr: r - 4, bl: 8, br: 8 });
  g.lineStyle(opt.lw ?? 3, opt.line ?? C.line, opt.lineAlpha ?? 1).strokeRoundedRect(x, y, w, h, r);
  return g;
}
// 세로로 끄는 목록 (보기 영역 밖은 가림) — add(obj) 로 넣고, 높이는 setContent(h)
export function scrollList(sc, x, y, w, h, depth = 10) {
  const c = sc.add.container(x, y).setDepth(depth);
  const shape = sc.make.graphics({}).fillStyle(0xffffff).fillRect(x, y, w, h);
  c.setMask(shape.createGeometryMask());
  let contentH = h, drag = null, vy = 0;
  const zone = sc.add.zone(x + w / 2, y + h / 2, w, h).setInteractive().setDepth(depth - 1);
  zone.on('pointerdown', p => { drag = { y: p.y, cy: c.y, t: p.time }; vy = 0; });
  const mv = p => { if (!drag || !p.isDown) return; const ny = Phaser.Math.Clamp(drag.cy + (p.y - drag.y), y - Math.max(0, contentH - h), y); vy = ny - c.y; c.y = ny; };
  const up = () => { drag = null; };
  const tick = () => { if (!drag && Math.abs(vy) > 0.5) { c.y = Phaser.Math.Clamp(c.y + vy, y - Math.max(0, contentH - h), y); vy *= 0.9; } };
  sc.input.on('pointermove', mv); sc.input.on('pointerup', up); sc.events.on('update', tick);
  return { c, zone, setContent: v => { contentH = v; }, destroy: () => { sc.input.off('pointermove', mv); sc.input.off('pointerup', up); sc.events.off('update', tick); c.destroy(); zone.destroy(); shape.destroy(); } };
}
// 누르면 살짝 눌리고 소리 · 진동. onTap 은 손을 뗄 때
export function button(sc, x, y, w, h, label, onTap, opt = {}) {
  const c = sc.add.container(x, y);
  const g = sc.add.graphics(); c.add(g);
  const draw = (down) => {
    g.clear();
    const fill = opt.fill ?? 0x2A3142, edge = opt.edge ?? C.line;
    g.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2 + 3, -h / 2 + (down ? 4 : 9), w, h, opt.r ?? 26);
    g.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2 + (down ? 4 : 0), w, h, opt.r ?? 26);
    g.fillStyle(0xFFFFFF, down ? 0.04 : 0.1).fillRoundedRect(-w / 2 + 5, -h / 2 + 5 + (down ? 4 : 0), w - 10, h * 0.42, { tl: (opt.r ?? 26) - 5, tr: (opt.r ?? 26) - 5, bl: 6, br: 6 });
    g.lineStyle(3, edge, 1).strokeRoundedRect(-w / 2, -h / 2 + (down ? 4 : 0), w, h, opt.r ?? 26);
  };
  draw(false);
  const t = text(sc, 0, 0, label, opt.size ?? 44, opt.color ?? C.ink); c.add(t);
  c.label = t; c.w = w; c.h = h; c.redraw = draw; c.enabled = true;
  const hit = sc.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true }); c.add(hit);
  hit.on('pointerdown', () => { if (!c.enabled) return; draw(true); t.y = 4; audio.id(S.TAP, { volume: 0.4 }); audio.buzz(8); });
  const up = (ok) => { draw(false); t.y = 0; if (ok && c.enabled) onTap && onTap(); };
  hit.on('pointerup', () => up(true)); hit.on('pointerout', () => up(false));
  c.setEnabled = on => { c.enabled = on; c.setAlpha(on ? 1 : 0.45); };
  return c;
}
// 화면 위에 잠깐 뜨는 안내 한 줄
export function toast(sc, s, y, color = C.ink) {
  const t = text(sc, 540, y, s, 40, color).setDepth(9000).setAlpha(0);
  sc.tweens.add({ targets: t, alpha: 1, y: y - 20, duration: 180, ease: 'Quad.out', yoyo: false, onComplete: () => sc.tweens.add({ targets: t, alpha: 0, delay: 1100, duration: 300, onComplete: () => t.destroy() }) });
  return t;
}
// 벡터 아이콘 (하트 · 골드 · 마나)
export function icon(sc, kind, x, y, s = 1) {
  const g = sc.add.graphics({ x, y });
  if (kind === 'life') { g.fillStyle(0xFF5A6A, 1); g.fillCircle(-9 * s, -5 * s, 11 * s); g.fillCircle(9 * s, -5 * s, 11 * s); g.fillTriangle(-19.5 * s, -1 * s, 19.5 * s, -1 * s, 0, 20 * s); g.fillStyle(0xFFFFFF, 0.5).fillCircle(-12 * s, -9 * s, 4 * s); }
  if (kind === 'gold') { g.fillStyle(0xB8862B, 1).fillCircle(0, 2 * s, 19 * s); g.fillStyle(0xFFD45A, 1).fillCircle(0, 0, 18 * s); g.lineStyle(3 * s, 0xC9962F, 1).strokeCircle(0, 0, 12 * s); g.fillStyle(0xFFFFFF, 0.6).fillCircle(-6 * s, -7 * s, 4 * s); }
  if (kind === 'mana') { g.fillStyle(0x2C7BD6, 1); g.fillPoints([{ x: 0, y: -22 * s }, { x: 15 * s, y: 0 }, { x: 0, y: 22 * s }, { x: -15 * s, y: 0 }], true); g.fillStyle(0x8FE3FF, 1); g.fillPoints([{ x: 0, y: -18 * s }, { x: 9 * s, y: -2 * s }, { x: 0, y: 6 * s }, { x: -9 * s, y: -2 * s }], true); }
  if (kind === 'medal') { g.fillStyle(0xB0322E, 1).fillTriangle(-14 * s, -24 * s, -2 * s, -24 * s, -10 * s, 0); g.fillStyle(0x2E5DB0, 1).fillTriangle(14 * s, -24 * s, 2 * s, -24 * s, 10 * s, 0); g.fillStyle(0xB8862B, 1).fillCircle(0, 8 * s, 17 * s); g.fillStyle(0xFFD45A, 1).fillCircle(0, 6 * s, 16 * s); g.fillStyle(0xC9962F, 1); g.fillPoints([{ x: 0, y: -4 * s }, { x: 3 * s, y: 3 * s }, { x: 10 * s, y: 4 * s }, { x: 4 * s, y: 9 * s }, { x: 6 * s, y: 16 * s }, { x: 0, y: 12 * s }, { x: -6 * s, y: 16 * s }, { x: -4 * s, y: 9 * s }, { x: -10 * s, y: 4 * s }, { x: -3 * s, y: 3 * s }], true); }
  if (kind === 'lock') { g.fillStyle(0x0B0D12, 0.85).fillRoundedRect(-16 * s, -4 * s, 32 * s, 26 * s, 5 * s); g.lineStyle(5 * s, 0xA9A391, 1).strokeCircle(0, -6 * s, 10 * s); g.fillStyle(0xA9A391, 1).fillRoundedRect(-16 * s, -4 * s, 32 * s, 26 * s, 5 * s); g.fillStyle(0x30343E, 1).fillCircle(0, 7 * s, 4 * s); }
  if (kind === 'gear') { g.fillStyle(0xC9C3B0, 1); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.fillCircle(Math.cos(a) * 17 * s, Math.sin(a) * 17 * s, 6 * s); } g.fillCircle(0, 0, 16 * s); g.fillStyle(0x1B2130, 1).fillCircle(0, 0, 7 * s); }
  return g;
}
