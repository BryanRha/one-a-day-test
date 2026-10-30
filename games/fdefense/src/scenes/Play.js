// 판 화면 (세로): 원작 판을 시계 방향 90° 돌려 10×15칸 · 위 HUD · 아래 엄지 조작 칸
import { W, H, C, SCALE } from '../config.js?v=0.94.0';
import { T, A, CHAR_NAMES, HERO_NAMES, SPECIAL_NAMES } from '../core/data.js?v=0.94.0';
import { Sim, TICK, BUY_ROWS, DETAIL_SPRITE, CHAR } from '../core/sim.js?v=0.94.0';
import { text, panel, button, toast, icon } from '../ui.js?v=0.94.0';
import { audio, S } from '../audio.js?v=0.94.0';
import { load, save } from '../save.js?v=0.94.0';
import { FRAME_ATLAS } from './Boot.js?v=0.94.0';
import { pushBack } from '../oad.js?v=0.94.0';

const HUD_H = 176, TRAY_MIN = 520;
// 효과 번호 → 그림 묶음 (원작 렌더러 표)
const FX_SET = { 0: 500, 33: 532, 2: 502, 3: 503, 4: 504, 5: 505, 9: 509, 10: 510, 12: 533, 13: 512, 14: 513, 15: 514, 36: 502, 37: 534, 38: 535 };
const ARROW_IMG = { 0: ['arrow_0_0'], 2: ['arrow_2_0', 'arrow_2_1'], 3: ['arrow_3_0', 'arrow_3_1'], 5: ['arrow_1_0', 'arrow_1_1'], 10: ['arrow_4_0', 'arrow_4_1', 'arrow_4_2', 'arrow_4_3', 'arrow_4_4', 'arrow_4_5'], 12: ['arrow_9_0', 'arrow_9_1'] };
const CARDS = [
  { kind: 'warrior', row: BUY_ROWS.warrior, name: '전사', tip: '근접 · 단단함' },
  { kind: 'archer', row: BUY_ROWS.archer, name: '궁수', tip: '원거리 · 빠름' },
  { kind: 'wizard', row: BUY_ROWS.wizard, name: '마법사', tip: '마법 · 강한 한 방' },
  { kind: 'hero', row: 0, name: '챔피언', tip: '영웅 · 필살기' },
];

export class PlayScene extends Phaser.Scene {
  constructor() { super('Play'); }
  init(d) { this.stageNo = d.stage ?? 0; }
  create() {
    // 씬 재사용 대비: 상태 전부 초기화 (Phaser 규칙)
    this.sim = new Sim(this.stageNo, { seed: (Date.now() & 0xffff) + 1 });
    this.views = new Map(); this.fxs = []; this.pops = []; this.acc = 0; this.paused = false; this.menu = null; this.drag = null; this.armed = null;
    this.speed = load().speed || 1; this.ended = false; this.cutin = null; this.hintStep = load().tips.place ? 9 : 0; this.lastTap = 0;
    this.layout();
    this.drawBoard();
    this.drawHud();
    this.drawTray();
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.cameras.main.fadeIn(300, 0, 0, 0);
    audio.music('bgm_3', this);
    if (this.hintStep === 0) this.time.delayedCall(700, () => this.showHint());
    this.events.once('shutdown', () => { this.input.off('pointerdown', this.onDown, this); this.input.off('pointermove', this.onMove, this); this.input.off('pointerup', this.onUp, this); });
  }

  // ---------- 배치 계산 ----------
  layout() {
    const room = H - HUD_H - TRAY_MIN;
    this.k = Math.min(W / 450, room / 675);
    this.bw = 450 * this.k; this.bh = 675 * this.k;
    this.bx = (W - this.bw) / 2; this.by = HUD_H;
    this.trayTop = this.by + this.bh;
    this.sp = this.k / SCALE;   // 그림 배율
  }
  rot(x, y) { return [this.bx + (450 - y / 50) * this.k, this.by + (x / 50) * this.k]; }
  // 화면 좌표 → 원작 칸
  tileAt(sx, sy) {
    const px = (sy - this.by) / this.k, py = 450 - (sx - this.bx) / this.k;
    if (px < 0 || py < 0 || px >= 675 || py >= 450) return null;
    return [Math.floor(px / 45), Math.floor(py / 45)];
  }
  tileCenter(i, j) { return this.rot((i * 45 + 22) * 50, (j * 45 + 22) * 50); }
  frame(name) { return FRAME_ATLAS[name] ? [FRAME_ATLAS[name], name] : null; }

  // ---------- 판 ----------
  drawBoard() {
    const ch = Math.floor(this.stageNo / 10) % 5;
    this.add.image(this.bx, this.by, 'bg0').setOrigin(0).setDisplaySize(this.bw, this.bh);
    const s = this.sim;
    for (let i = 0; i < 15; i++) for (let j = 0; j < 10; j++) {
      const t = s.tiles[i][j]; if (t < 0) continue;
      const f = this.frame(`map_t${ch}_${t}`); if (!f) continue;
      this.add.image(this.bx + (450 - (j + 1) * 45) * this.k, this.by + i * 45 * this.k, f[0], f[1]).setOrigin(0).setScale(this.sp);
    }
    // 판 테두리 그림자
    const g = this.add.graphics().setDepth(4000);
    for (let i = 0; i < 10; i++) { g.fillStyle(0x000000, 0.22 * (1 - i / 10)); g.fillRect(this.bx, this.by + i * 4, this.bw, 4); g.fillRect(this.bx, this.trayTop - (i + 1) * 4, this.bw, 4); }
    this.placeLayer = this.add.graphics().setDepth(5);
    this.rangeG = this.add.graphics().setDepth(6);
    this.markG = this.add.graphics().setDepth(3500);
    for (const o of s.objects) this.objectView(o);
  }
  objectView(o) {
    const names = ['object_manacrystal1', 'object_manacrystal2', 'object_manacrystal3', 'object_goldvault1', 'object_goldvault2', 'object_goldvault3', 'object_woodbox', 'object_stone', 'object_hugestone', 'object_tree', 'object_hugetree', 'object_rottenwood', 'object_rottentree', 'object_blackstone', 'object_darkstone', 'object_roughreed', 'object_cowskull', 'object_gravestone', 'object_cactus', 'object_strangestone', 'object_hugestrangestone', 'object_sandhell', 'object_basalt', 'object_hugebasalt', 'object_lava1', 'object_lava2', 'object_blacktornado', 'object_hugeblacktornado', 'object_starts', 'object_startw', 'object_goals', 'object_goalw', 'object_starte', 'object_goale'];
    let n = names[o.type];
    if (o.role === 'start' || o.role === 'goal') {
      const [sx, sy] = this.rot(o.x, o.y);
      n = o.role === 'start' ? 'object_starts' : 'object_goals';
      if (sx < this.bx + 30 * this.k) n = o.role === 'start' ? 'object_startw' : 'object_goalw';
      else if (sx > this.bx + this.bw - 30 * this.k) n = o.role === 'start' ? 'object_starte' : 'object_goale';
    }
    const f = this.frame(n); if (!f) return;
    let [sx, sy] = this.rot(o.x, o.y);
    let bottom = sy + 22 * this.k;
    if (o.size === 1) sx += 22.5 * this.k;
    if (o.size === 2) { sx += 22.5 * this.k; bottom = sy + 45 * this.k; }
    const img = this.add.image(sx, bottom, f[0], f[1]).setOrigin(0.5, 1).setScale(this.sp).setDepth(bottom);
    const v = { img, o };
    if (o.destroyable) {
      v.bar = this.add.graphics().setDepth(3600);
      img.setInteractive({ useHandCursor: true });
    }
    this.views.set(o, v);
  }

  // ---------- 원작 프레임 애니메이션 그리기 ----------
  // parts 풀: 이미지 여러 장을 한 유닛처럼 (원작은 한 프레임에 조각 1~3장)
  drawAnim(v, set, action, fi, sx, sy, scale, alpha = 1, depth, glow = null) {
    const an = A[set]; if (!an) return;
    const acts = an.actions[action] || an.actions[0];
    const fr = an.frames[acts[fi % acts.length]] || [];
    v.parts ||= [];
    for (let i = 0; i < Math.max(fr.length, v.parts.length); i++) {
      const p = fr[i];
      if (!p) { if (v.parts[i]) v.parts[i].setVisible(false); continue; }
      const f = this.frame(`unit_${set}_${p[0]}`); if (!f) continue;
      let im = v.parts[i];
      if (!im) { im = this.add.image(0, 0, f[0], f[1]).setOrigin(0); v.parts[i] = im; }
      im.setTexture(f[0], f[1]).setVisible(true).setFlipX(p[4] === 1).setScale(this.sp * scale)
        .setPosition(sx + p[1] * this.k * scale, sy + (10 + p[2]) * this.k * scale).setAlpha(alpha * p[3] / 1000 * (glow != null && i === 0 ? glow : 1)).setDepth(depth ?? sy);
    }
  }
  clearParts(v) { for (const p of v.parts || []) p.destroy(); v.parts = []; }

  // ---------- HUD ----------
  drawHud() {
    const g = this.add.graphics().setDepth(6000);
    g.fillStyle(0x0C0F16, 0.96).fillRect(0, 0, W, HUD_H);
    g.lineStyle(3, 0x2A3142, 1).lineBetween(0, HUD_H, W, HUD_H);
    icon(this, 'life', 52, 58, 1.05).setDepth(6001);
    icon(this, 'gold', 252, 58, 1.1).setDepth(6001);
    icon(this, 'mana', 482, 58, 1.1).setDepth(6001);
    this.tLife = text(this, 86, 58, '20', 46, C.ink, { ox: 0 }).setDepth(6001);
    this.tGold = text(this, 284, 58, '0', 46, C.gold, { ox: 0 }).setDepth(6001);
    this.tMana = text(this, 512, 58, '0', 46, C.mana, { ox: 0 }).setDepth(6001);
    this.tWave = text(this, 36, 132, '', 32, C.mute, { ox: 0, weight: '700' }).setDepth(6001);
    this.waveBar = this.add.graphics().setDepth(6001);
    this.pauseBtn = button(this, W - 82, 88, 120, 120, 'II', () => this.pause(), { size: 44, r: 30 });
    this.pauseBtn.setDepth(6002);
  }
  updateHud() {
    const s = this.sim;
    this.tLife.setText(String(s.life)); this.tGold.setText(String(s.money)); this.tMana.setText(String(s.mana));
    this.tWave.setText(`웨이브 ${Math.min(s.wave + 1, s.waveTotal)} / ${s.waveTotal}`);
    const g = this.waveBar; g.clear();
    g.fillStyle(0x2A3142, 1).fillRoundedRect(300, 124, 590, 16, 8);
    g.fillStyle(0xFFC94A, 1).fillRoundedRect(300, 124, Math.max(16, 590 * s.progress()), 16, 8);
  }

  // ---------- 아래 조작 칸 ----------
  drawTray() {
    const top = this.trayTop, h = H - top;
    const g = this.add.graphics().setDepth(6000);
    g.fillStyle(0x0C0F16, 0.97).fillRect(0, top, W, h);
    g.lineStyle(3, 0x2A3142, 1).lineBetween(0, top, W, top);
    const cw = 242, gap = (W - cw * 4) / 5, cardH = Math.min(270, h - 210);
    this.cards = CARDS.map((cd, i) => {
      const x = gap + i * (cw + gap), y = top + 22;
      const c = this.add.container(x, y).setDepth(6001);
      const bg = this.add.graphics(); c.add(bg);
      const hero = cd.kind === 'hero';
      const draw = (lit) => { bg.clear(); bg.fillStyle(0x000000, 0.35).fillRoundedRect(3, 8, cw, cardH, 26); bg.fillStyle(hero ? 0x2A1E3C : 0x1B2130, 1).fillRoundedRect(0, 0, cw, cardH, 26); bg.fillStyle(0xFFFFFF, 0.06).fillRoundedRect(4, 4, cw - 8, cardH * 0.45, { tl: 22, tr: 22, bl: 6, br: 6 }); bg.lineStyle(lit ? 5 : 3, lit ? 0xFFC94A : hero ? 0x9A6BE0 : 0x3A4256, 1).strokeRoundedRect(0, 0, cw, cardH, 26); };
      draw(false);
      const set = hero ? 300 : DETAIL_SPRITE[T.char[cd.row][CHAR.DETAIL]];
      const pv = { parts: [] };
      const portrait = this.add.container(0, 0); c.add(portrait);
      this.cardPortrait(portrait, set, cw / 2, cardH * 0.56);
      const nm = text(this, cw / 2, cardH - 74, cd.name, 36, C.ink); c.add(nm);
      const cost = hero ? T.hero[0][0] : T.char[cd.row][CHAR.PRICE];
      const ct = text(this, cw / 2 + 16, cardH - 30, String(cost), 34, hero ? C.mana : C.gold); c.add(ct);
      const ic = icon(this, hero ? 'mana' : 'gold', cw / 2 - ct.width / 2 - 8, cardH - 30, 0.75); c.add(ic);
      const zone = this.add.zone(cw / 2, cardH / 2, cw, cardH).setInteractive({ useHandCursor: true }); c.add(zone);
      zone.on('pointerdown', (p) => this.cardDown(i, p));
      return { c, cd, draw, cost, hero, pv, zone, x, y, w: cw, h: cardH, ct };
    });
    const rowY = top + 22 + cardH + 30, bh = Math.min(140, H - rowY - 30);
    this.spBtn = button(this, gap + 250, rowY + bh / 2, 500, bh, '칼춤', () => this.useSpecial(), { fill: 0x4A1E1E, edge: 0xFF7A5A, size: 42, color: '#FFD9C9' });
    this.spBtn.setDepth(6001);
    this.spSub = text(this, gap + 250, rowY + bh / 2 + 34, '', 24, '#FFB9A0', { weight: '700' }).setDepth(6003);
    this.spBtn.label.y = -12;
    this.spFill = this.add.graphics().setDepth(6002);
    this.speedBtn = button(this, gap + 500 + gap + 120, rowY + bh / 2, 240, bh, this.speed === 2 ? '×2 배속' : '×1 배속', () => this.toggleSpeed(), { size: 38 });
    this.speedBtn.setDepth(6001);
    this.earlyBtn = button(this, W - gap - cw / 2, rowY + bh / 2, cw, bh, '당기기', () => this.callEarly(), { size: 36, fill: 0x2E3A22, edge: 0x9BD56A, color: '#DFF5C6' });
    this.earlyBtn.setDepth(6001); this.earlyBtn.label.y = -14;
    this.earlySub = text(this, W - gap - cw / 2, rowY + bh / 2 + 30, '', 24, '#BFE59A', { weight: '700' }).setDepth(6003);
  }
  cardPortrait(cont, set, x, y) {
    const an = A[set]; if (!an) return;
    const fr = an.frames[an.actions[1][0]], sc = 1.25;
    for (const p of fr.slice(set >= 300 ? 1 : 0)) {
      const f = this.frame(`unit_${set}_${p[0]}`); if (!f) continue;
      cont.add(this.add.image(x + p[1] * SCALE * sc, y + (10 + p[2]) * SCALE * sc, f[0], f[1]).setOrigin(0).setFlipX(p[4] === 1).setScale(sc));
    }
  }
  updateTray() {
    const s = this.sim, heroOn = s.towers.some(t => t.hero);
    for (const c of this.cards) {
      const ok = c.hero ? (!heroOn && s.mana >= c.cost) : s.money >= c.cost;
      c.c.setAlpha(ok ? 1 : 0.42);
      if (c.hero && heroOn) c.ct.setText('배치됨');
    }
    const h = s.towers.find(t => t.hero);
    const g = this.spFill; g.clear();
    if (!h) { this.spBtn.setEnabled(false); this.spSub.setText('영웅을 먼저 세우세요'); }
    else {
      const ready = s.canSpecial();
      this.spBtn.setEnabled(ready);
      if (h.specialCool > 0) { this.spSub.setText(`준비 중 ${Math.ceil(h.specialCool / TICK)}초`); const b = this.spBtn; g.fillStyle(0xFF7A5A, 0.25).fillRoundedRect(b.x - b.w / 2, b.y - b.h / 2, b.w * (1 - h.specialCool / h.specialCoolMax), b.h, 26); }
      else this.spSub.setText(s.mana >= h.specialMana ? `마나 ${h.specialMana} · 준비 완료` : `마나 ${h.specialMana} 필요`);
    }
    const can = s.canCallEarly();
    this.earlyBtn.setEnabled(can);
    this.earlySub.setText(can ? `+${s.earlyBonus()} 골드` : '다음 웨이브').setAlpha(can ? 1 : 0.5);
  }

  // ---------- 입력 ----------
  cardDown(i, p) {
    if (this.paused || this.ended || this.cutin) return;
    const c = this.cards[i];
    this.closeMenu();
    this.drag = { i, sx: p.x, sy: p.y, moved: false, ghost: null };
    c.draw(true);
  }
  onDown(p) {
    if (this.paused || this.ended || this.cutin || this.drag) return;
    if (p.y < this.by || p.y > this.trayTop) return;
    const tl = this.tileAt(p.x, p.y);
    if (this.armed != null && tl) { this.tryPlace(this.armed, tl); return; }
    if (this.menu && this.menu.hit(p.x, p.y)) return;
    this.closeMenu();
    if (!tl) return;
    const s = this.sim, t = s.towerAt(tl[0], tl[1]);
    if (t) { this.openMenu(t); return; }
    // 몬스터 누르기 → 집중 공격
    let best = null, bd = 70;
    for (const m of s.monsters) { if (!m.alive || m.status) continue; const [mx, my] = this.rot(m.x, m.y); const d = Math.hypot(mx - p.x, my - 20 * this.k - p.y); if (d < bd) { bd = d; best = m; } }
    if (best) { s.setFocus(best); audio.id(S.TAP, { volume: 0.4 }); return; }
    const o = s.objectAt(tl[0], tl[1]);
    if (o && o.destroyable) { s.setFocus(o); audio.id(S.TAP, { volume: 0.4 }); toast(this, s.focus ? '병사들이 이 물건을 노립니다' : '노리기 해제', this.trayTop - 80, C.gold); return; }
  }
  onMove(p) {
    const d = this.drag; if (!d) return;
    if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 24) {
      d.moved = true;
      const c = this.cards[d.i];
      if (!this.affordable(c)) { this.cancelDrag(c.hero ? (this.sim.towers.some(t => t.hero) ? '영웅은 한 명만 세울 수 있어요' : `마나 ${c.cost} 필요`) : `골드 ${c.cost} 필요`); return; }
      d.ghost = { parts: [] }; this.showPlaceable(true);
    }
    if (d.moved && d.ghost) {
      const gy = p.y - 150;
      const c = this.cards[d.i], set = c.hero ? 300 : DETAIL_SPRITE[T.char[c.cd.row][CHAR.DETAIL]];
      const tl = this.tileAt(p.x, gy);
      d.tile = tl && this.sim.canPlace(tl[0], tl[1]) ? tl : null;
      let [gx, gyy] = d.tile ? this.tileCenter(d.tile[0], d.tile[1]) : [p.x, gy];
      this.drawAnim(d.ghost, set, 1, 0, gx, gyy, 1, d.tile ? 0.95 : 0.55, 9000);
      this.rangeG.clear();
      if (d.tile) {
        const r = c.hero ? T.hero[0][3] : T.char[c.cd.row][CHAR.RANGE], dist = ((r * 45 / 100) + 22) * this.k;
        this.rangeG.fillStyle(0xFFFFFF, 0.08).fillCircle(gx, gyy, dist).lineStyle(4, 0xFFFFFF, 0.5).strokeCircle(gx, gyy, dist);
        this.rangeG.fillStyle(0x9BFF8A, 0.35).fillRoundedRect(gx - 22 * this.k, gyy - 22 * this.k, 45 * this.k, 45 * this.k, 10);
      }
    }
  }
  onUp(p) {
    const d = this.drag; if (!d) return;
    const c = this.cards[d.i];
    if (!d.moved) {
      // 누르기만 함 → 놓을 칸 고르기 상태 (한 번 더 누르면 해제)
      if (this.armed === d.i) { this.armed = null; this.showPlaceable(false); c.draw(false); }
      else if (!this.affordable(c)) { c.draw(false); toast(this, c.hero ? (this.sim.towers.some(t => t.hero) ? '영웅은 한 명만 세울 수 있어요' : `마나 ${c.cost} 필요`) : `골드 ${c.cost} 필요`, this.trayTop - 80, C.life); }
      else { this.cards.forEach(x => x.draw(false)); this.armed = d.i; c.draw(true); this.showPlaceable(true); toast(this, '밝은 칸을 눌러 세우세요', this.trayTop - 80); }
      this.drag = null; return;
    }
    if (d.tile) this.tryPlace(d.i, d.tile);
    else if (d.ghost) toast(this, '밝은 칸에만 세울 수 있어요', this.trayTop - 80, C.life);
    this.cancelDrag();
  }
  cancelDrag(msg) {
    const d = this.drag;
    if (d) { if (d.ghost) this.clearParts(d.ghost); this.cards[d.i].draw(this.armed === d.i); }
    this.drag = null; this.rangeG.clear(); if (this.armed == null) this.showPlaceable(false);
    if (msg) toast(this, msg, this.trayTop - 80, C.life);
  }
  affordable(c) { const s = this.sim; return c.hero ? (!s.towers.some(t => t.hero) && s.mana >= c.cost) : s.money >= c.cost; }
  tryPlace(i, tl) {
    const c = this.cards[i];
    const r = this.sim.place(c.cd.kind, tl[0], tl[1]);
    if (!r.ok) { toast(this, r.why, this.trayTop - 80, C.life); return; }
    this.armed = null; this.cards.forEach(x => x.draw(false)); this.showPlaceable(false); this.rangeG.clear();
    if (this.hintStep < 9) { load().tips.place = 1; save(); this.hideHint(); this.hintStep = 9; }
  }
  showPlaceable(on) {
    const g = this.placeLayer; g.clear(); if (!on) return;
    const s = this.sim;
    for (let i = 0; i < 15; i++) for (let j = 0; j < 10; j++) if (s.canPlace(i, j)) {
      const [x, y] = this.tileCenter(i, j);
      g.fillStyle(0xBFFFB0, 0.18).fillRoundedRect(x - 20 * this.k, y - 20 * this.k, 40 * this.k, 40 * this.k, 8);
      g.lineStyle(2, 0xDFFFD6, 0.45).strokeRoundedRect(x - 20 * this.k, y - 20 * this.k, 40 * this.k, 40 * this.k, 8);
    }
  }

  // ---------- 병사 둥근 메뉴 ----------
  openMenu(t) {
    this.closeMenu();
    const s = this.sim, [x, y] = this.rot(t.ox, t.oy);
    const items = [];
    const li = s.levelInfo(t), ci = s.classInfo(t);
    if (li) items.push({ label: '강화', sub: `${li.cost}`, cur: li.cur, ok: (li.cur === 'money' ? s.money : s.mana) >= li.cost, act: () => s.levelUp(t) });
    else items.push({ label: '최고 단계', sub: '', ok: false, act: null });
    if (ci) items.push({ label: '전직', sub: `${ci.cost}`, cur: 'money', ok: s.money >= ci.cost, act: () => s.classChange(t), note: ci.name });
    if (!t.hero) items.push({ label: '판매', sub: `+${s.sellValue(t)}`, cur: 'money', ok: true, act: () => s.sell(t), sell: true });
    const c = this.add.container(0, 0).setDepth(8100);
    const dist = ((t.range * 45 / 100) + 22) * this.k;
    const rg = this.add.graphics(); rg.fillStyle(0xFFFFFF, 0.07).fillCircle(x, y, dist).lineStyle(4, 0xFFC94A, 0.6).strokeCircle(x, y, dist); c.add(rg);
    const nm = t.hero ? `${HERO_NAMES[t.group]} Lv.${t.level}` : `${CHAR_NAMES[t.detail]} Lv.${t.level}`;
    const angs = items.length === 3 ? [-90, 150, 30] : items.length === 2 ? [-120, -60] : [-90];
    const R = 150, btns = [];
    items.forEach((it, k) => {
      const a = Phaser.Math.DegToRad(angs[k]);
      let bx = x + Math.cos(a) * R, by = y + Math.sin(a) * R;
      bx = Phaser.Math.Clamp(bx, 90, W - 90); by = Phaser.Math.Clamp(by, this.by + 90, this.trayTop - 70);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.4).fillCircle(bx + 3, by + 8, 78);
      g.fillStyle(it.sell ? 0x3A2222 : it.ok ? 0x2B3A1E : 0x262A33, 1).fillCircle(bx, by, 78);
      g.lineStyle(4, it.sell ? 0xFF8A7A : it.ok ? 0xFFC94A : 0x4A5060, 1).strokeCircle(bx, by, 78);
      c.add(g);
      c.add(text(this, bx, by - (it.sub ? 18 : 0), it.label, 34, it.ok ? C.ink : C.mute));
      if (it.sub) c.add(text(this, bx, by + 24, it.sub, 30, it.cur === 'mana' ? C.mana : C.gold));
      if (it.note) c.add(text(this, bx, by + 104, `→ ${it.note}`, 26, C.mute, { weight: '700' }));
      btns.push({ x: bx, y: by, it });
    });
    const tag = text(this, x, Math.min(y + 98, this.trayTop - 30), nm, 30, C.ink).setDepth(7001); c.add(tag);
    this.menu = { c, t, hit: (px, py) => {
      for (const b of btns) if (Math.hypot(px - b.x, py - b.y) < 82) {
        if (b.it.act && b.it.ok) { b.it.act(); audio.buzz(12); this.closeMenu(); if (!b.it.sell && this.sim.towers.includes(t)) this.time.delayedCall(10, () => this.openMenu(t)); }
        else if (b.it.act) toast(this, b.it.cur === 'mana' ? '마나가 모자라요' : '골드가 모자라요', this.trayTop - 80, C.life);
        return true;
      }
      return false;
    } };
    this.menuBack = pushBack(() => { this.closeMenu(); return true; });
  }
  closeMenu() { if (this.menu) { this.menu.c.destroy(); this.menu = null; } if (this.menuBack) { this.menuBack(); this.menuBack = null; } }

  // ---------- 버튼 ----------
  toggleSpeed() { this.speed = this.speed === 1 ? 2 : 1; load().speed = this.speed; save(); this.speedBtn.label.setText(this.speed === 2 ? '×2 배속' : '×1 배속'); }
  callEarly() { const b = this.sim.callEarly(); if (b) { this.popText(W / 2, this.by + 160, `+${b} 골드 · 웨이브 당김!`, C.gold, 44); } }
  useSpecial() {
    if (!this.sim.useSpecial()) { toast(this, '아직 쓸 수 없어요', this.trayTop - 80, C.life); return; }
  }

  // ---------- 매 프레임 ----------
  update(time, dt) {
    if (this.paused) return;
    dt = Math.min(dt, 100);
    this.flush();
    this.acc += dt * TICK / 1000 * (this.cutin ? 1 : this.speed);
    let n = 0;
    while (this.acc >= 1 && n < 8) { this.acc -= 1; n++; this.tick(); }
    this.render();
  }
  // 버튼으로 생긴 일(배치 · 필살기 등)은 다음 틱 전에 처리
  flush() { const s = this.sim; for (const e of s.events) this.onEvent(e); s.events.length = 0; }
  tick() {
    const s = this.sim;
    s.step();
    for (const e of s.events) this.onEvent(e);
    s.events.length = 0;
    for (const f of this.fxs) f.t++;
    if (this.cutin) this.cutin.t++;
  }
  onEvent(e) {
    const s = this.sim;
    switch (e.type) {
      case 'sound': audio.id(e.id, { volume: e.soft ? 0.32 : 0.45, gap: 70 }); break;
      case 'fx': this.addFx(e.kind, e.x, e.y); break;
      case 'dmg': { const v = this.views.get(e.m); if (v) v.flash = 3; break; }
      case 'kill': {
        const [x, y] = this.rot(e.m.x, e.m.y); this.addFx(13, e.m.x, e.m.y);
        this.popText(x, y - 50 * this.k, `+${e.gold}`, C.gold, 34);
        if (e.mana) this.popText(x + 50, y - 20 * this.k, `+${e.mana}`, C.mana, 28);
        break;
      }
      case 'obreak': { const [x, y] = this.rot(e.o.x, e.o.y); this.addFx(13, e.o.x, e.o.y); const v = this.views.get(e.o); if (v) { v.img.destroy(); v.bar?.destroy(); this.views.delete(e.o); }
        this.popText(x, y - 60, e.gold ? `+${e.gold} 골드` : `+${e.mana} 마나`, e.gold ? C.gold : C.mana, 42); audio.id(S.LEVELUP, { volume: 0.4 }); this.cameras.main.shake(120, 0.004); break; }
      case 'leak': this.leakFx(e); break;
      case 'levelup': this.addFx(14, e.t.ox, e.t.oy); audio.id(S.LEVELUP, { volume: 0.5 }); break;
      case 'place': { const [x, y] = this.rot(e.t.ox, e.t.oy); this.addFx(14, e.t.ox, e.t.oy); audio.id(S.LEVELUP, { volume: 0.35 }); this.cameras.main.shake(60, 0.002); this.dust(x, y + 18 * this.k); break; }
      case 'sell': { const v = this.views.get(e.t); if (v) { this.clearParts(v); v.sh?.destroy(); v.pip?.destroy(); this.views.delete(e.t); } audio.id(S.BACK, { volume: 0.5 }); break; }
      case 'wave': this.waveBanner(e.n, e.boss); break;
      case 'special': this.startCutin(e.hero); break;
      case 'specialHit': audio.id(S.BLADE, { volume: 0.7 }); this.cameras.main.shake(320, 0.012); break;
      case 'early': audio.id(S.TAP, { volume: 0.6 }); break;
      case 'clear': case 'over': this.time.delayedCall(900, () => this.showResult(e.type === 'clear')); break;
    }
  }

  // ---------- 그리기 ----------
  render() {
    const s = this.sim;
    // 몬스터
    for (const m of s.monsters) {
      let v = this.views.get(m);
      if (!v) { v = { parts: [], lx: null, back: false, face: 0 }; const f = this.frame('etc_sha34'); v.sh = this.add.image(0, 0, f[0], f[1]).setAlpha(0.5); v.bar = this.add.graphics(); this.views.set(m, v); }
      const [x, y] = this.rot(m.x, m.y);
      if (v.lx != null) { const dx = x - v.lx, dy = y - v.ly; if (Math.abs(dx) > 0.3) v.face = dx > 0 ? 1 : 0; if (Math.abs(dy) > 0.3 || Math.abs(dx) > 0.3) v.back = dy < -0.3 && Math.abs(dy) > Math.abs(dx); }
      v.lx = x; v.ly = y;
      const set = m.type < 100 ? m.type % 25 : 100 + ((m.type - 100) % 5);
      const sc = m.body / 100;
      const alpha = m.status === 1 ? (10 - m.sc) * 0.1 : m.sc < 16 ? m.sc / 16 : 1;
      this.drawAnim(v, set, (v.back ? 2 : 0) + v.face, Math.floor(m.sc / 3), x, y, sc, alpha);
      if (v.flash > 0) { v.flash--; for (const p of v.parts) p.setTintFill(0xFFFFFF).setAlpha(p.alpha * 0.85); } else for (const p of v.parts) p.clearTint();
      v.sh.setPosition(x, y + 10 * this.k).setScale(this.sp * sc * 0.9).setDepth(y - 1).setAlpha(0.45 * alpha);
      const g = v.bar; g.clear();
      if (m.status === 0 && m.hp < m.maxHp) {
        const by = y + (10 - T.monster[m.type][9]) * this.k * 0.9, w = 30 * this.k * (m.boss ? 1.6 : 1);
        g.fillStyle(0x000000, 0.6).fillRoundedRect(x - w / 2 - 2, by - 2, w + 4, 12, 4);
        g.fillStyle(m.boss ? 0xFF6B4A : 0x7BE38C, 1).fillRoundedRect(x - w / 2, by, Math.max(4, w * m.hp / m.maxHp), 8, 3);
        g.setDepth(3600);
      }
      if (m.stun > 0) { g.fillStyle(0xFFE27A, 0.9); for (let i = 0; i < 3; i++) { const a = s.time * 0.25 + i * 2.1; g.fillCircle(x + Math.cos(a) * 18 * this.k, y - 40 * this.k + Math.sin(a) * 5 * this.k, 5); } }
    }
    for (const [m, v] of this.views) if (m.monster && !m.alive) { this.clearParts(v); v.sh.destroy(); v.bar.destroy(); this.views.delete(m); }
    // 병사 · 영웅
    for (const t of s.towers) {
      let v = this.views.get(t);
      if (!v) { v = { parts: [], face: 1 }; const f = this.frame('etc_sha34'); v.sh = this.add.image(0, 0, f[0], f[1]).setAlpha(0.45); v.pip = this.add.graphics(); this.views.set(t, v); }
      const [x, y] = this.rot(t.x, t.y);
      const tg = t.lock[0];
      if (tg && t.status === 1) { const [tx] = this.rot(tg.x, tg.y); if (Math.abs(tx - x) > 2) v.face = tx > x ? 1 : 0; }
      let act, spd;
      if (t.status === 1) { act = 2 + v.face; spd = 3; } else { act = v.face; spd = 5; }
      if (t.hero && t.specialCool <= 0 && s.mana >= t.specialMana && t.status === 0) act = 4 + v.face;
      const glow = t.hero && t.status === 0 ? (t.specialCool > 0 ? 0.15 + 0.5 * (1 - t.specialCool / t.specialCoolMax) : 0.75 + 0.25 * Math.sin(s.time * 0.2)) : null;
      this.drawAnim(v, t.sprite, act, Math.floor(t.sc / spd), x, y, 1, 1, undefined, glow);
      v.sh.setPosition(x, y + 10 * this.k).setScale(this.sp).setDepth(y - 1);
      const [ox, oy] = this.rot(t.ox, t.oy);
      const g = v.pip; g.clear().setDepth(oy + 1);
      for (let i = 0; i < t.level; i++) { const px = ox - (t.level - 1) * 9 + i * 18, py = oy + 24 * this.k; g.fillStyle(t.hero ? 0xC8A2FF : 0xFFC94A, 1).fillPoints([{ x: px, y: py - 8 }, { x: px + 7, y: py }, { x: px, y: py + 8 }, { x: px - 7, y: py }], true); }
    }
    // 화살
    this.arrowViews ||= new Map();
    for (const a of s.arrows) {
      let im = this.arrowViews.get(a);
      const imgs = ARROW_IMG[a.kind] || ARROW_IMG[10];
      const nm = imgs[Math.floor(s.time / 2) % imgs.length], f = this.frame(nm);
      if (!im) { im = this.add.image(0, 0, f[0], f[1]).setScale(this.sp); this.arrowViews.set(a, im); }
      im.setTexture(f[0], f[1]);
      const [x, y] = this.rot(a.x, a.y); const [tx, ty] = this.rot(a.target.x, a.target.y);
      im.setPosition(x, y - 20 * this.k).setRotation(Math.atan2(ty - y, tx - x) + Math.PI / 2).setDepth(y + 400);
    }
    for (const [a, im] of this.arrowViews) if (!a.alive) { im.destroy(); this.arrowViews.delete(a); }
    // 효과
    for (const f of this.fxs) {
      const an = A[f.set]; if (!an) { f.dead = true; continue; }
      const seq = an.actions[0], n = seq.length;
      const fi = f.t < n ? f.t : n - 1, alpha = f.t < n ? 1 : 1 - (f.t - n) * 0.1;
      if (alpha <= 0) { f.dead = true; this.clearParts(f); continue; }
      const [x, y] = this.rot(f.x, f.y);
      this.drawAnim(f, f.set, 0, fi, x, y + (f.kind === 14 ? 0 : -25) * this.k, 1, alpha, y + 500);
    }
    this.fxs = this.fxs.filter(f => !f.dead);
    // 물건 체력 · 노리기 표시
    for (const [o, v] of this.views) if (o.role && v.bar) { v.bar.clear(); if (o.hp < o.maxHp) { const [x, y] = this.rot(o.x, o.y); v.bar.fillStyle(0x000000, 0.6).fillRoundedRect(x - 42, y - 70 * this.k, 84, 12, 4).fillStyle(0xFFC94A, 1).fillRoundedRect(x - 40, y - 70 * this.k + 2, 80 * o.hp / o.maxHp, 8, 3); } }
    const mg = this.markG; mg.clear();
    if (s.focus && s.focus.alive) { const [x, y] = this.rot(s.focus.x, s.focus.y); const r = 34 + Math.sin(s.time * 0.3) * 4; mg.lineStyle(5, 0xFF5A5A, 0.9).strokeCircle(x, y - (s.focus.monster ? 18 : 30) * this.k, r); mg.lineBetween(x - r - 10, y - (s.focus.monster ? 18 : 30) * this.k, x - r + 8, y - (s.focus.monster ? 18 : 30) * this.k); mg.lineBetween(x + r - 8, y - (s.focus.monster ? 18 : 30) * this.k, x + r + 10, y - (s.focus.monster ? 18 : 30) * this.k); }
    this.updateHud(); this.updateTray();
    if (this.cutin) this.renderCutin();
  }
  addFx(kind, x, y) { const set = FX_SET[kind] ?? 500; this.fxs.push({ kind, set, x, y, t: 0, parts: [] }); }
  popText(x, y, s, color, size = 34) {
    const t = text(this, x, y, s, size, color).setDepth(8000).setScale(0.6);
    this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.out' });
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 900, delay: 250, ease: 'Quad.in', onComplete: () => t.destroy() });
  }
  dust(x, y) {
    for (let i = 0; i < 8; i++) {
      const d = this.add.circle(x, y, Phaser.Math.Between(6, 11), 0xE8DCC0, 0.7).setDepth(y + 2);
      const a = (i / 8) * Math.PI * 2;
      this.tweens.add({ targets: d, x: x + Math.cos(a) * 60, y: y + Math.sin(a) * 22, alpha: 0, scale: 1.6, duration: 420, ease: 'Quad.out', onComplete: () => d.destroy() });
    }
  }
  leakFx(e) {
    audio.id(S.LEAK, { volume: 0.7 }); audio.buzz(60);
    this.cameras.main.shake(180, 0.008);
    const r = this.add.graphics().setDepth(8500);
    for (let i = 0; i < 14; i++) { r.fillStyle(0xFF2A2A, 0.26 * (1 - i / 14)); r.fillRect(0, this.by + i * 6, W, 6); r.fillRect(0, this.trayTop - (i + 1) * 6, W, 6); r.fillRect(i * 6, this.by, 6, this.bh); r.fillRect(W - (i + 1) * 6, this.by, 6, this.bh); }
    this.tweens.add({ targets: r, alpha: 0, duration: 650, onComplete: () => r.destroy() });
    const [x, y] = this.rot(e.m.x, e.m.y); this.popText(x, y - 40, `-${e.loss}`, C.life, 44);
  }
  waveBanner(n, boss) {
    const y = this.by + 210;
    const c = this.add.container(W / 2, y).setDepth(8200).setAlpha(0);
    const g = this.add.graphics(); g.fillStyle(boss ? 0x3A0E0E : 0x0C0F16, 0.85).fillRoundedRect(-330, -70, 660, 140, 30).lineStyle(4, boss ? 0xFF6B4A : 0xFFC94A, 1).strokeRoundedRect(-330, -70, 660, 140, 30);
    c.add(g); c.add(text(this, 0, boss ? -18 : 0, `웨이브 ${n}`, 64, boss ? '#FFB09A' : C.gold));
    if (boss) c.add(text(this, 0, 36, '보스가 옵니다', 32, '#FFD2C6', { weight: '700' }));
    this.tweens.add({ targets: c, alpha: 1, scale: { from: 1.3, to: 1 }, duration: 260, ease: 'Back.out' });
    this.tweens.add({ targets: c, alpha: 0, y: y - 40, delay: 1300, duration: 350, onComplete: () => c.destroy() });
    if (n > 1) audio.id(S.TAP, { volume: 0.5 });
  }

  // ---------- 필살기 연출 (칼춤) ----------
  startCutin(h) {
    audio.id(S.SPECIAL, { volume: 0.8 });
    const c = this.add.container(0, 0).setDepth(9500);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.0); c.add(dim);
    const cy = this.by + this.bh * 0.42;
    const bf = this.frame('special_sword_background');
    const band = this.add.image(W / 2, cy, bf[0], bf[1]).setScale(this.sp * 1.15, this.sp * 1.6).setAlpha(0); c.add(band);
    const lines = []; for (let i = 0; i < 14; i++) { const nm = ['special_sword_lines', 'special_sword_linem', 'special_sword_lineb'][i % 3], f = this.frame(nm); const l = this.add.image(Phaser.Math.Between(0, W * 1.5), cy + Phaser.Math.Between(-200, 200), f[0], f[1]).setScale(this.sp * 1.4).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD); c.add(l); lines.push(l); }
    const hero = this.add.image(W + 600, cy + 20, 'hero_cut_sword').setScale(0.95); c.add(hero);
    const name = text(this, W / 2, cy + 420, SPECIAL_NAMES[h.group] + '!', 96, '#FFF3C4', { stroke: '#7A3A00', st: 12 }).setAlpha(0); c.add(name);
    this.cutin = { c, dim, band, hero, lines, name, t: 0, blades: [], h };
  }
  renderCutin() {
    const k = this.cutin, t = k.t;
    k.dim.fillAlpha = Math.min(0.6, t / 10 * 0.6) * (t > 120 ? Math.max(0, (150 - t) / 30) : 1);
    k.band.setAlpha(t < 8 ? t / 8 : t > 58 ? Math.max(0, (66 - t) / 8) : 1);
    k.band.scaleY = this.sp * 1.6 * (t < 8 ? t / 8 : 1);
    const hx = t < 14 ? W + 600 - (t / 14) * (600 + 40) : t < 50 ? W / 2 + 120 - (t - 14) * 3 : W / 2 + 12 - (t - 50) ** 2 * 6;
    k.hero.x = hx; k.hero.setAlpha(t > 60 ? Math.max(0, (66 - t) / 6) : 1);
    k.name.setAlpha(t > 12 && t < 60 ? 1 : 0).setScale(t < 18 ? 1.4 - (t - 12) * 0.066 : 1);
    for (const l of k.lines) { l.x -= 70; if (l.x < -400) l.x = W + 400; l.setAlpha(t < 60 ? 0.8 : 0); }
    if (t === 52) {
      for (const m of this.sim.monsters) {
        if (!m.alive || m.status) continue;
        const f = this.frame(`special_sword_blade${Phaser.Math.Between(0, 3)}`);
        const [x, y] = this.rot(m.x, m.y);
        const b = this.add.image(x + 140, y - 700, f[0], f[1]).setOrigin(0.02, 0.5).setScale(this.sp * 0.9).setRotation(-Math.PI / 2 + 0.18).setDepth(9400);
        k.blades.push({ b, x, y });
      }
    }
    for (const bl of k.blades) { const p = Phaser.Math.Clamp((t - 52) / 13, 0, 1); bl.b.setPosition(bl.x + 140 * (1 - p), bl.y - 6 * this.k - 700 * (1 - p)); bl.b.setAlpha(t > 110 ? Math.max(0, (130 - t) / 20) : 1); }
    if (t === 65) { const fl = this.add.rectangle(W / 2, H / 2, W, H, 0xFFF6D0, 0.55).setDepth(9600).setBlendMode(Phaser.BlendModes.ADD); this.tweens.add({ targets: fl, alpha: 0, duration: 320, onComplete: () => fl.destroy() }); }
    if (t >= 150) { k.c.destroy(); for (const bl of k.blades) bl.b.destroy(); this.cutin = null; }
  }

  // ---------- 안내 (첫 판) ----------
  showHint() {
    if (this.hintStep >= 9 || this.ended) return;
    const s = this.sim;
    // 길과 가까운 빈칸 하나 고르기
    let best = null, bs = -1;
    for (let i = 0; i < 15; i++) for (let j = 0; j < 10; j++) if (s.canPlace(i, j)) { let r = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (s.tiles[i + a]?.[j + b] >= 0) r++; if (r > bs) { bs = r; best = [i, j]; } }
    if (!best) return;
    const c = this.cards[0], [tx, ty] = this.tileCenter(best[0], best[1]);
    const g = this.add.container(0, 0).setDepth(9800);
    const ring = this.add.graphics(); ring.lineStyle(6, 0xFFC94A, 1).strokeRoundedRect(tx - 24 * this.k, ty - 24 * this.k, 48 * this.k, 48 * this.k, 12); g.add(ring);
    this.tweens.add({ targets: ring, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    const hand = this.add.circle(c.x + c.w / 2, c.y + c.h / 2, 30, 0xFFFFFF, 0.9).setStrokeStyle(6, 0xFFC94A); g.add(hand);
    this.tweens.add({ targets: hand, x: tx, y: ty, duration: 1100, ease: 'Sine.inOut', repeat: -1, repeatDelay: 400, hold: 300 });
    const bubble = panel(this, 90, this.trayTop - 190, W - 180, 120, { r: 30, fill: 0x2A2010, line: 0xFFC94A }); g.add(bubble);
    g.add(text(this, W / 2, this.trayTop - 130, '전사 카드를 끌어 길 옆 칸에 세우세요', 40, C.ink));
    this.hint = g;
  }
  hideHint() { if (this.hint) { this.hint.destroy(); this.hint = null; } }

  // ---------- 일시정지 · 결과 ----------
  onBack() { if (this.ended) return false; if (this.paused) { this.resume(); return true; } this.pause(); return true; }
  pause() {
    if (this.paused || this.ended) return;
    this.paused = true; this.closeMenu(); this.cancelDrag();
    const c = this.add.container(0, 0).setDepth(9900);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.62).setInteractive());
    c.add(panel(this, 140, H / 2 - 430, W - 280, 860, { r: 40 }));
    c.add(text(this, W / 2, H / 2 - 340, '잠깐 쉬기', 64, C.ink));
    const d = load();
    const rows = [
      ['계속하기', () => this.resume(), { fill: 0x5A3B12, edge: C.accent, color: C.gold }],
      [`배경음 ${d.music ? '켬' : '끔'}`, (b) => { const on = audio.toggleMusic(); this.pauseBtns[1].label.setText(`배경음 ${on ? '켬' : '끔'}`); if (on) audio.music('bgm_3', this); }],
      [`효과음 ${d.sfx ? '켬' : '끔'}`, () => { const on = audio.toggleSfx(); this.pauseBtns[2].label.setText(`효과음 ${on ? '켬' : '끔'}`); }],
      ['처음부터 다시', () => { this.paused = false; this.scene.restart({ stage: this.stageNo }); }],
      ['타이틀로', () => { this.paused = false; audio.stopMusic(); this.scene.start('Title'); }],
    ];
    this.pauseBtns = rows.map((r, i) => { const b = button(this, W / 2, H / 2 - 200 + i * 145, 600, 118, r[0], r[1], { size: 44, ...(r[2] || {}) }); c.add(b); return b; });
    this.pauseUI = c;
    this.pauseBack = pushBack(() => { this.resume(); return true; });
  }
  resume() { if (!this.paused) return; this.paused = false; this.pauseUI?.destroy(); this.pauseUI = null; if (this.pauseBack) { this.pauseBack(); this.pauseBack = null; } }
  showResult(win) {
    if (this.ended) return; this.ended = true; this.closeMenu();
    const s = this.sim, stars = win ? (s.life >= 20 ? 3 : s.life >= 10 ? 2 : 1) : 0;
    const d = load(); d.plays++;
    if (win) { d.cleared[this.stageNo] = 1; d.stars[this.stageNo] = Math.max(d.stars[this.stageNo] || 0, stars); }
    d.best[this.stageNo] = Math.max(d.best[this.stageNo] || 0, s.wave); save();
    audio.id(win ? S.CLEAR : S.OVER, { volume: 0.8 });
    const c = this.add.container(0, 0).setDepth(9900);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.66).setInteractive());
    c.add(panel(this, 100, H / 2 - 520, W - 200, 1000, { r: 44, line: win ? 0xFFC94A : 0x5A6278 }));
    c.add(text(this, W / 2, H / 2 - 420, win ? '1-1 지켜냈다!' : '성문이 무너졌어요', 70, win ? C.gold : C.ink));
    if (win) {
      for (let i = 0; i < 3; i++) {
        const st = text(this, W / 2 + (i - 1) * 170, H / 2 - 250, '★', 150, i < stars ? C.gold : '#3A3F4C', { st: 10 }).setScale(0); c.add(st);
        this.tweens.add({ targets: st, scale: 1, duration: 360, delay: 300 + i * 260, ease: 'Back.out', onStart: () => i < stars && audio.id(S.LEVELUP, { volume: 0.6 }) });
      }
    } else c.add(text(this, W / 2, H / 2 - 250, `웨이브 ${s.wave + 1}까지 버텼어요 · 잘했어요`, 42, C.ink, { weight: '700' }));
    const lines = win ? [`남은 목숨 ${s.life} / 20`, `처치 ${s.kills}`, `완벽한 웨이브 ${s.perfectWaves}`] : [`처치 ${s.kills}`, '병사를 길이 굽는 곳에 모아 보세요', '강화로 더 강해질 수 있어요'];
    lines.forEach((l, i) => c.add(text(this, W / 2, H / 2 - 70 + i * 66, l, 40, i === 0 ? C.ink : C.mute, { weight: '700' })));
    const b1 = button(this, W / 2, H / 2 + 240, 640, 140, win ? '▶  다시 하기' : '▶  다시 도전', () => this.scene.restart({ stage: this.stageNo }), { fill: 0x5A3B12, edge: C.accent, size: 54, color: C.gold });
    const b2 = button(this, W / 2, H / 2 + 400, 640, 118, '타이틀로', () => { audio.stopMusic(); this.scene.start('Title'); }, { size: 44 });
    c.add(b1); c.add(b2);
    c.setAlpha(0); this.tweens.add({ targets: c, alpha: 1, duration: 300 });
  }
}
