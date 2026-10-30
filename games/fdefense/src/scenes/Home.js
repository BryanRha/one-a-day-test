// 홈: 세계 지도(출정) · 강화 · 영웅 · 기록 — 아래 탭 4개, 시작까지 탭 1번
import { W, H, C, FONT } from '../config.js?v=0.95.0';
import { T, CHAPTERS, STAGE_NAMES, UP_NAMES, HERO_UP_NAMES, HERO_NAMES, ITEM_NAMES, ITEM_ICONS, UNIT_ICONS, itemDesc, SPECIAL_NAMES } from '../core/data.js?v=0.95.0';
import * as M from '../core/meta.js?v=0.95.0';
import { AWARDS, missions, claimMission, checkAwards, MISSION_REWARD, MISSION_BONUS } from '../core/awards.js?v=0.95.0';
import { EST } from '../core/balance.js?v=0.95.0';
import { text, panel, button, toast, icon, scrollList } from '../ui.js?v=0.95.0';
import { audio } from '../audio.js?v=0.95.0';
import { load, save, loadResume, saveResume, dayKey } from '../save.js?v=0.95.0';
import { FRAME_ATLAS, queueHome, indexFrames } from './Boot.js?v=0.95.0';
import { pushBack } from '../oad.js?v=0.95.0';
import { oadOn, owned, bm, track } from '../bmflow.js?v=0.95.0';

const TOP = 150, TAB = 176;
const CH_POS = [[0.28, 0.83], [0.70, 0.67], [0.25, 0.43], [0.74, 0.29], [0.28, 0.10]];
const TABS = [['map', '출정'], ['up', '강화'], ['hero', '영웅'], ['rec', '기록']];

export class HomeScene extends Phaser.Scene {
  constructor() { super('Home'); }
  init(d) { this.tab = d?.tab || 'map'; this.flash = d?.flash || null; }
  preload() {
    queueHome(this);
    const g = this.add.graphics();
    this.load.on('progress', p => { g.clear(); g.fillStyle(0x2A3142, 1).fillRoundedRect(340, H / 2, 400, 12, 6); g.fillStyle(0xFFC94A, 1).fillRoundedRect(340, H / 2, 400 * p, 12, 6); });
    this.load.once('complete', () => g.destroy());
  }
  create() {
    indexFrames(this);
    this.d = load(); this.popup = null; this.popBack = null; this.layer = null; this.scroll = null; this.heroSel = this.heroSel ?? 0; this.cls = this.cls ?? 0; this.heroSub = this.heroSub ?? 'up'; this.cat = this.cat ?? 1;
    missions(this.d, dayKey());
    const got = M.claimMilestones(this.d); checkAwards(this.d); save();
    this.add.rectangle(W / 2, H / 2, W, H, 0x0E1118);
    this.drawTop(); this.drawTabs(); this.show(this.tab);
    audio.music('bgm_2', this);
    this.cameras.main.fadeIn(220, 0, 0, 0);
    if (got.length) this.time.delayedCall(400, () => this.milestonePopup(got));
    else if (this.flash) this.time.delayedCall(300, () => toast(this, this.flash, H - TAB - 80, C.gold));
  }
  frame(n) { return FRAME_ATLAS[n] ? [FRAME_ATLAS[n], n] : null; }
  img(x, y, n, s = 1) { const f = this.frame(n); return f ? this.add.image(x, y, f[0], f[1]).setScale(s) : this.add.rectangle(x, y, 10, 10, 0, 0); }

  // ---------- 위 · 아래 ----------
  drawTop() {
    const g = this.add.graphics().setDepth(50);
    g.fillStyle(0x0C0F16, 0.96).fillRect(0, 0, W, TOP).lineStyle(3, 0x2A3142, 1).lineBetween(0, TOP, W, TOP);
    this.add.image(40, TOP / 2, 'title_logo').setOrigin(0, 0.5).setScale(0.36).setDepth(51);
    icon(this, 'medal', 690, TOP / 2 + 4, 1.1).setDepth(51);
    this.tHero = text(this, 722, TOP / 2, '0', 44, C.gold, { ox: 0 }).setDepth(51);
    const gear = this.add.zone(W - 70, TOP / 2, 120, 120).setInteractive({ useHandCursor: true }).setDepth(52);
    icon(this, 'gear', W - 70, TOP / 2, 1.3).setDepth(51);
    gear.on('pointerup', () => this.settings());
    this.updateTop();
  }
  updateTop() { this.tHero.setText(this.d.heroism.toLocaleString()); }
  drawTabs() {
    const g = this.add.graphics().setDepth(50);
    g.fillStyle(0x0C0F16, 0.98).fillRect(0, H - TAB, W, TAB).lineStyle(3, 0x2A3142, 1).lineBetween(0, H - TAB, W, H - TAB);
    this.tabUI = TABS.map(([k, label], i) => {
      const x = W / 8 + i * W / 4, y = H - TAB / 2;
      const t = text(this, x, y, label, 40, C.mute, { weight: '800' }).setDepth(51);
      const bar = this.add.rectangle(x, H - TAB + 6, 120, 8, 0xFFC94A).setDepth(51).setVisible(false);
      const dot = this.add.circle(x + 58, y - 26, 10, 0xFF4D4D).setDepth(52).setVisible(false);
      const z = this.add.zone(x, y, W / 4, TAB).setInteractive({ useHandCursor: true }).setDepth(52);
      z.on('pointerup', () => { if (this.tab !== k) { audio.id(14, { volume: 0.4 }); this.show(k); } });
      return { k, t, bar, dot };
    });
  }
  updateTabs() {
    const d = this.d, ms = d.missions.list;
    const dots = { map: ms.some(m => m.done && !m.got), hero: [1, 2].some(g => d.meta.open[g] && !d.meta.owned[g] && d.heroism >= M.HERO_PRICE[g]) };
    for (const u of this.tabUI) { const on = u.k === this.tab; u.t.setColor(on ? C.gold : C.mute); u.bar.setVisible(on); u.dot.setVisible(!!dots[u.k]); }
  }
  show(k) {
    this.tab = k; if (this.layer) this.layer.destroy(); this.scroll?.destroy(); this.scroll = null;
    this.layer = this.add.container(0, 0);
    ({ map: () => this.drawMap(), up: () => this.drawUp(), hero: () => this.drawHero(), rec: () => this.drawRec() })[k]();
    this.updateTabs(); this.updateTop();
  }
  L(o) { this.layer.add(o); return o; }

  // ---------- 출정 (세계 지도) ----------
  unlockedCh(c) { return c === 0 || !!this.d.cleared[c * 10 - 1]; }
  unlockedSt(s) { return s === 0 || !!this.d.cleared[s - 1]; }
  drawMap() {
    const d = this.d, SHEET = 800, sheetY = H - TAB - SHEET;
    const mapH = sheetY + 40 - TOP, s = Math.min(1, mapH / 1296 * 1.06);
    const mw = 1080 * s, mh = 1296 * s, mx = (W - mw) / 2, my = TOP;
    this.L(this.add.image(mx, my, 'world').setOrigin(0).setScale(s));
    if (mw < W) { const gg = this.L(this.add.graphics()); gg.fillStyle(0x0E1118, 1).fillRect(0, TOP, mx, mh).fillRect(mx + mw, TOP, W - mx - mw, mh); }
    let sel = d.sel.stage; if (!this.unlockedSt(sel)) sel = 0;
    const curCh = Math.floor(sel / 10);
    const g = this.L(this.add.graphics());
    const pts = CH_POS.map(([fx, fy]) => [mx + fx * mw, my + fy * mh]);
    g.lineStyle(8, 0xFFE7A0, 0.5);
    for (let i = 0; i < 4; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; const n = 14; for (let k = 0; k < n; k += 2) g.lineBetween(x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n, x1 + (x2 - x1) * (k + 1) / n, y1 + (y2 - y1) * (k + 1) / n); }
    pts.forEach(([x, y], c) => {
      const open = this.unlockedCh(c), on = c === curCh;
      const stars = [...Array(10)].reduce((a, _, i) => a + (d.stars[c * 10 + i] || 0), 0);
      const mk = this.L(this.add.container(x, y));
      const b = this.add.graphics();
      b.fillStyle(0x000000, 0.45).fillCircle(4, 10, 66);
      b.fillStyle(open ? (on ? 0x5A3B12 : 0x1E2430) : 0x15171C, 1).fillCircle(0, 0, 64);
      b.lineStyle(on ? 8 : 4, on ? 0xFFC94A : open ? 0x8A7A52 : 0x3A3F4C, 1).strokeCircle(0, 0, 64);
      mk.add(b);
      mk.add(text(this, 0, -6, `${c + 1}장`, 40, open ? (on ? C.gold : C.ink) : '#5A5F6A'));
      mk.add(text(this, 0, 32, CHAPTERS[c], 26, open ? C.ink : '#5A5F6A', { weight: '700' }));
      const lab = text(this, 0, 96, open ? `★ ${stars}/30` : '', 28, C.gold); mk.add(lab);
      if (!open) mk.add(icon(this, 'lock', 0, -60, 1.1));
      if (on) this.tweens.add({ targets: mk, scale: 1.06, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const z = this.add.zone(0, 0, 150, 150).setInteractive({ useHandCursor: true }); mk.add(z);
      z.on('pointerup', () => { if (!open) { toast(this, `${c}장 마지막 스테이지를 깨면 열려요`, sheetY - 40, C.life); return; } let st = c * 10; for (let i = 9; i >= 0; i--) if (this.unlockedSt(c * 10 + i)) { st = c * 10 + i; break; } d.sel.stage = st; d.sel.mode = 0; save(); this.show('map'); });
    });
    // 아래 판
    this.L(panel(this, 0, sheetY, W, SHEET + 40, { r: 44, fill: 0x121620, alpha: 0.98 }));
    const ch = curCh;
    this.L(text(this, 48, sheetY + 52, `${ch + 1}장 · ${CHAPTERS[ch]}`, 40, C.ink, { ox: 0 }));
    // 오늘의 작전 (한 줄)
    const ms = d.missions.list, done = ms.filter(m => m.got).length, claim = ms.some(m => m.done && !m.got);
    const mb = this.L(button(this, W - 230, sheetY + 52, 380, 80, `오늘의 작전 ${done}/3`, () => this.missionPopup(), { size: 32, fill: claim ? 0x5A3B12 : 0x1E2430, edge: claim ? C.accent : C.line, color: claim ? C.gold : C.ink }));
    if (claim) this.L(this.add.circle(W - 52, sheetY + 22, 11, 0xFF4D4D));
    // 스테이지 칸 10개
    for (let i = 0; i < 10; i++) {
      const s2 = ch * 10 + i, x = 108 + (i % 5) * 216, y = sheetY + 170 + Math.floor(i / 5) * 150;
      const open = this.unlockedSt(s2), on = s2 === sel, boss = i === 9;
      const gg = this.L(this.add.graphics());
      gg.fillStyle(0x000000, 0.4).fillCircle(x + 3, y + 8, 56);
      gg.fillStyle(on ? 0x5A3B12 : open ? (d.cleared[s2] ? 0x24301E : 0x1E2430) : 0x15171C, 1).fillCircle(x, y, 54);
      gg.lineStyle(on ? 7 : 4, on ? 0xFFC94A : boss ? 0xC0503A : open ? 0x4A5268 : 0x2A2E38, 1).strokeCircle(x, y, 54);
      this.L(text(this, x, y - 4, open ? `${i + 1}` : '', 42, on ? C.gold : C.ink));
      if (!open) this.L(icon(this, 'lock', x, y - 6, 1));
      const st = d.stars[s2] || 0;
      if (open) this.L(text(this, x, y + 74, '★'.repeat(st) + '☆'.repeat(3 - st), 26, st ? C.gold : '#4A4F5A', { weight: '700', st: 3 }));
      const z = this.L(this.add.zone(x, y, 160, 150).setInteractive({ useHandCursor: true }));
      z.on('pointerup', () => { if (!open) { toast(this, '앞 스테이지를 먼저 깨 주세요', sheetY - 40, C.life); return; } d.sel.stage = s2; if (!d.cleared[s2]) d.sel.mode = 0; save(); this.show('map'); });
    }
    // 고른 스테이지 · 모드
    const y0 = sheetY + 470, mode = d.cleared[sel] ? d.sel.mode : 0;
    this.L(text(this, 48, y0, `${ch + 1}-${sel % 10 + 1}  ${STAGE_NAMES[ch][sel % 10]}`, 44, C.ink, { ox: 0 }));
    M.MODES.forEach((m, k) => {
      const ok = k === 0 || d.cleared[sel];
      const b = this.L(button(this, [565, 740, 935][k], y0, k === 2 ? 210 : 160, 74, m, () => { if (!ok) { toast(this, '일반 모드를 깨면 열려요', sheetY - 40, C.life); return; } d.sel.mode = k; save(); this.show('map'); }, { size: 28, fill: mode === k ? 0x5A3B12 : 0x1E2430, edge: mode === k ? C.accent : C.line, color: mode === k ? C.gold : ok ? C.ink : '#5A5F6A', r: 22 }));
    });
    const res = loadResume();
    const sub = mode === 1 ? `끝없는 웨이브 · 최고 ${d.infBest[sel] || 0}` : mode === 2 ? `적 성문을 부수면 승리 · 약 ${Math.max(5, Math.round((EST[sel] || 10) * 0.6))}분` : `웨이브 ${T.waveCount[sel]} · 약 ${EST[sel] || 10}분${d.cleared[sel] ? '' : ` · 처음 깨면 명예 +${M.heroismFor({ stage: sel, mode: 0, win: true, stars: 2, first: true })}`}`;
    if (res && res.stage != null) {
      this.L(button(this, W / 2 - 130, y0 + 150, 560, 130, `▶ 이어서 ${Math.floor(res.stage / 10) + 1}-${res.stage % 10 + 1} · 웨이브 ${res.wave + 1}`, () => this.go(res.stage, res.mode, res), { fill: 0x5A3B12, edge: C.accent, size: 38, color: C.gold }));
      this.L(button(this, W - 150, y0 + 150, 220, 130, '새로 하기', () => { saveResume(null); this.show('map'); }, { size: 32 }));
    } else {
      const go = this.L(button(this, W / 2, y0 + 150, W - 96, 136, '▶  출정', () => this.go(sel, mode), { fill: 0x5A3B12, edge: C.accent, size: 58, color: C.gold, r: 36 }));
      this.tweens.add({ targets: go, scale: 1.02, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.L(text(this, W / 2, y0 + 250, sub, 30, C.mute, { weight: '700' }));
  }
  go(stage, mode, resume = null, giftGold = 0) {
    const d = this.d; d.sel.stage = stage; d.sel.mode = mode; save();
    // 연속 실패 응원 선물 (다음 판을 시작할 때 · 같은 스테이지 3연속 · 하루 2번 · docs/bm-policy.md 6장)
    if (!resume && !giftGold && mode === 0 && d.help.stage === stage && d.help.fails >= 3) {
      if (d.help.date !== dayKey()) { d.help.date = dayKey(); d.help.used = 0; }
      if (d.help.used < 2) {
        const on = bm.helpOn(); track('help_eligible', { on: on ? 1 : 0, stage, fails: d.help.fails });
        if (on) { this.giftPopup(stage, mode); return; }
        d.help.used++; save();
      }
    }
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Play', { stage, mode, resume, giftGold }));
  }
  giftPopup(stage, mode) {
    const d = this.d, gold = Math.round(T.stage[stage][0] * (d.help.fails >= 6 ? 0.35 : 0.2));
    track('help_offer', { stage, gold });
    this.openPopup(760, (c, y) => {
      c.add(text(this, W / 2, y + 100, '여기까지 오느라 고생했어요', 46, C.ink));
      c.add(text(this, W / 2, y + 170, `${d.help.fails}번 도전한 끈기에 응원 선물`, 34, C.mute, { weight: '700' }));
      c.add(icon(this, 'gold', W / 2 - 120, y + 300, 2));
      c.add(text(this, W / 2 + 40, y + 300, `시작 골드 +${gold}`, 52, C.gold));
      c.add(button(this, W / 2, y + 470, 600, 130, '응원 선물 · 챙겨 갈게요', () => { d.help.used++; save(); track('help_take', { stage }); this.closePopup(); this.go(stage, mode, null, gold); }, { fill: 0x5A3B12, edge: C.accent, color: C.gold, size: 40 }));
      c.add(button(this, W / 2, y + 630, 420, 100, '혼자 해 볼게요', () => { d.help.used++; save(); track('help_decline', { stage }); this.closePopup(); this.go(stage, mode, null, -1); }, { size: 34 }));
    });
  }

  // ---------- 강화 ----------
  drawUp() {
    const d = this.d, m = d.meta, y0 = TOP + 40;
    this.L(text(this, 48, y0 + 30, '병사 강화', 52, C.ink, { ox: 0 }));
    this.L(text(this, W - 48, y0 + 34, `한계 ${M.unitMax(m)}단계`, 30, C.mute, { ox: 1, weight: '700' }));
    ['전사', '궁수', '마법사'].forEach((n, k) => this.L(button(this, 200 + k * 340, y0 + 140, 300, 90, n, () => { this.cls = k; this.show('up'); }, { size: 38, fill: this.cls === k ? 0x5A3B12 : 0x1E2430, edge: this.cls === k ? C.accent : C.line, color: this.cls === k ? C.gold : C.ink })));
    const rowH = Math.min(170, (H - TAB - (y0 + 230) - 140) / 6);
    for (let r = 0; r < 6; r++) {
      const i = this.cls * 6 + r, u = T.upUnit[i], lv = m.unit[i], max = M.unitMax(m), cost = M.unitCost(m, i), y = y0 + 230 + r * rowH;
      this.L(panel(this, 36, y, W - 72, rowH - 16, { r: 26 }));
      const ic = this.img(36 + 80, y + (rowH - 16) / 2, UNIT_ICONS[i], 0.9); this.L(ic);
      const nm = UP_NAMES[u[4]] || '';
      this.L(text(this, 210, y + 40, nm, 38, C.ink, { ox: 0 }));
      const per = u[0], tot = per * lv;
      this.L(text(this, 210, y + 88, `${per > 0 ? '+' : ''}${per}% / 단계 · 지금 ${tot > 0 ? '+' : ''}${tot}%`, 28, C.mute, { ox: 0, weight: '700' }));
      const pg = this.L(this.add.graphics());
      for (let k = 0; k < max; k++) pg.fillStyle(k < lv ? 0xFFC94A : 0x2E3442, 1).fillRoundedRect(210 + k * (360 / max), y + rowH - 50, 360 / max - 6, 12, 4);
      if (cost < 0) this.L(text(this, W - 170, y + (rowH - 16) / 2, '최고 단계', 32, C.gold));
      else {
        const b = this.L(button(this, W - 170, y + (rowH - 16) / 2, 230, 100, `${cost}`, () => { if (M.buyUnit(d, i)) { checkAwards(d); save(); audio.id(13, { volume: 0.5 }); this.show('up'); } else toast(this, '명예가 모자라요 · 판을 깨면 모여요', H - TAB - 80, C.life); }, { size: 40, fill: d.heroism >= cost ? 0x2B3A1E : 0x262A33, edge: d.heroism >= cost ? 0x9BD56A : C.line, color: C.gold }));
        b.label.x = 16; b.add(icon(this, 'medal', -64, 4, 0.9));
      }
    }
    this.L(text(this, W / 2, H - TAB - 70, M.unitMax(m) < 10 ? '1-20 을 깨면 강화 한계가 10단계로 늘어요' : '강화 한계 해제는 영웅 › 장비 › 기타에서', 30, C.mute, { weight: '700' }));
  }

  // ---------- 영웅 ----------
  drawHero() {
    const d = this.d, m = d.meta, y0 = TOP + 30, g = this.heroSel;
    const cw = 320;
    for (let k = 0; k < 3; k++) {
      const x = 36 + k * (cw + 18), on = g === k;
      this.L(panel(this, x, y0, cw, 360, { r: 30, fill: on ? 0x2A2010 : 0x161A24, line: on ? 0xFFC94A : 0x2A3142, lw: on ? 5 : 3 }));
      const im = this.L(this.add.image(x + cw / 2, y0 + 150, `hero_${k}`));
      im.setScale(Math.min((cw - 20) / im.width, 250 / im.height));
      if (!m.owned[k]) im.setTint(0x555555);
      this.L(text(this, x + cw / 2, y0 + 296, HERO_NAMES[k], 36, on ? C.gold : C.ink));
      this.L(text(this, x + cw / 2, y0 + 336, m.owned[k] ? `필살기 · ${SPECIAL_NAMES[k]}` : m.open[k] ? `명예 ${M.HERO_PRICE[k]}` : (k === 1 ? '1-10 을 깨면' : '1-25 를 깨면'), 26, C.mute, { weight: '700' }));
      const z = this.L(this.add.zone(x + cw / 2, y0 + 180, cw, 360).setInteractive({ useHandCursor: true }));
      z.on('pointerup', () => { this.heroSel = k; this.show('hero'); });
    }
    const y1 = y0 + 400;
    if (!m.owned[g]) {
      this.L(panel(this, 36, y1, W - 72, 300, { r: 30 }));
      if (m.open[g]) {
        this.L(text(this, W / 2, y1 + 80, `${HERO_NAMES[g]}을(를) 데려올까요?`, 42, C.ink));
        const b = this.L(button(this, W / 2, y1 + 200, 520, 120, `명예 ${M.HERO_PRICE[g]} · 데려오기`, () => { if (M.buyHero(d, g)) { checkAwards(d); save(); audio.id(13); this.show('hero'); } else toast(this, '명예가 모자라요', H - TAB - 80, C.life); }, { fill: 0x5A3B12, edge: C.accent, color: C.gold, size: 40 }));
      } else this.L(text(this, W / 2, y1 + 150, `${g === 1 ? '1-10' : '1-25'} 을 처음 깨면 만날 수 있어요`, 38, C.mute));
      return;
    }
    ['강화', '장비'].forEach((n, k) => { const key = k ? 'eq' : 'up'; this.L(button(this, 290 + k * 500, y1 + 50, 460, 90, n, () => { this.heroSub = key; this.show('hero'); }, { size: 36, fill: this.heroSub === key ? 0x5A3B12 : 0x1E2430, edge: this.heroSub === key ? C.accent : C.line, color: this.heroSub === key ? C.gold : C.ink })); });
    const y2 = y1 + 120;
    if (this.heroSub === 'up') {
      const rowH = Math.min(150, (H - TAB - y2 - 40) / 6);
      for (let i = 0; i < 6; i++) {
        const u = T.upHero[i], lv = m.hero[g][i], max = M.heroMax(m), cost = M.heroUpCost(m, g, i), y = y2 + i * rowH;
        this.L(panel(this, 36, y, W - 72, rowH - 14, { r: 24 }));
        this.L(this.img(36 + 70, y + (rowH - 14) / 2, `ui_uphero_up${i}`, 0.8));
        this.L(text(this, 190, y + 36, HERO_UP_NAMES[i], 36, C.ink, { ox: 0 }));
        this.L(text(this, 190, y + 80, `${u[0] > 0 ? '+' : ''}${u[0]}% / 단계 · ${lv}/${max}`, 28, C.mute, { ox: 0, weight: '700' }));
        if (cost < 0) this.L(text(this, W - 170, y + (rowH - 14) / 2, '최고 단계', 32, C.gold));
        else { const b = this.L(button(this, W - 170, y + (rowH - 14) / 2, 230, 92, `${cost}`, () => { if (M.buyHeroUp(d, g, i)) { checkAwards(d); save(); audio.id(13, { volume: 0.5 }); this.show('hero'); } else toast(this, '명예가 모자라요', H - TAB - 80, C.life); }, { size: 38, fill: d.heroism >= cost ? 0x2B3A1E : 0x262A33, edge: d.heroism >= cost ? 0x9BD56A : C.line, color: C.gold })); b.label.x = 16; b.add(icon(this, 'medal', -64, 4, 0.85)); }
      }
    } else this.drawEquip(g, y2);
  }
  drawEquip(g, y2) {
    const d = this.d, m = d.meta;
    for (let s = 0; s < 2; s++) {
      const x = 36 + s * 260, it = m.equip[g][s];
      this.L(panel(this, x, y2, 240, 200, { r: 26, line: it >= 0 ? 0xFFC94A : 0x3A4256 }));
      if (it >= 0) { this.L(this.img(x + 120, y2 + 80, ITEM_ICONS[it], 1)); this.L(text(this, x + 120, y2 + 168, ITEM_NAMES[it], 26, C.ink, { weight: '700' })); }
      else this.L(text(this, x + 120, y2 + 100, `빈 칸 ${s + 1}`, 30, C.mute));
      const z = this.L(this.add.zone(x + 120, y2 + 100, 240, 200).setInteractive({ useHandCursor: true }));
      z.on('pointerup', () => { if (m.equip[g][s] >= 0) { m.equip[g][s] = -1; save(); this.show('hero'); } });
    }
    this.L(text(this, 600, y2 + 70, '장비 칸을 누르면 빼요', 28, C.mute, { ox: 0, weight: '700' }));
    this.L(text(this, 600, y2 + 120, '영웅마다 2개까지', 28, C.mute, { ox: 0, weight: '700' }));
    const cats = [['투구', [1, 2, 3, 4]], ['반지', [5, 6, 7, 8]], ['장화', [9, 10, 11, 12]], ['목걸이', [13, 14, 15, 16]], ['필살', [17, 18, 19, 20]], ['부적', [21, 22, 23, 24]], ['특수', [25, 26, 27, 28]], ['기타', [0, 29]]];
    const y3 = y2 + 230;
    cats.forEach(([n], k) => this.L(button(this, 162 + (k % 4) * 252, y3 + 40 + Math.floor(k / 4) * 96, 230, 80, n, () => { this.cat = k; this.show('hero'); }, { size: 30, r: 22, fill: this.cat === k ? 0x5A3B12 : 0x1E2430, edge: this.cat === k ? C.accent : C.line, color: this.cat === k ? C.gold : C.ink })));
    const list = cats[this.cat][1], y4 = y3 + 220, rowH = Math.min(150, (H - TAB - y4 - 20) / 4);
    list.forEach((i, r) => {
      const y = y4 + r * rowH, have = m.items.includes(i), cost = M.itemCost(i), eqAt = m.equip.findIndex(e => e.includes(i));
      this.L(panel(this, 36, y, W - 72, rowH - 12, { r: 24 }));
      this.L(this.img(36 + 70, y + (rowH - 12) / 2, ITEM_ICONS[i], 0.85));
      this.L(text(this, 190, y + 36, ITEM_NAMES[i], 34, C.ink, { ox: 0 }));
      this.L(text(this, 190, y + 78, itemDesc(i), 26, C.mute, { ox: 0, weight: '700' }));
      const special = T.item[i][0] === 1 || T.item[i][0] === 5;
      let label, act, ok;
      if (special) { label = `${cost}`; ok = d.heroism >= cost && (T.item[i][0] !== 5 || m.limit < 2); act = () => { if (M.buyItem(d, i)) { save(); audio.id(13); this.show('hero'); toast(this, T.item[i][0] === 1 ? '강화 명예를 돌려받았어요' : '강화 한계가 늘었어요', H - TAB - 80, C.gold); } else toast(this, '지금은 살 수 없어요', H - TAB - 80, C.life); }; }
      else if (!have) { label = `${cost}`; ok = d.heroism >= cost; act = () => { if (M.buyItem(d, i)) { const e = m.equip[g].indexOf(-1); if (e >= 0) M.equip(d, g, e, i); checkAwards(d); save(); audio.id(13); this.show('hero'); } else toast(this, '명예가 모자라요', H - TAB - 80, C.life); }; }
      else if (eqAt === g) { label = '장착 중'; ok = false; act = null; }
      else { label = eqAt >= 0 ? '가져오기' : '장착'; ok = true; act = () => { const e = m.equip[g].indexOf(-1); M.equip(d, g, e >= 0 ? e : 1, i); checkAwards(d); save(); this.show('hero'); }; }
      const b = this.L(button(this, W - 160, y + (rowH - 12) / 2, 220, 86, label, act || (() => {}), { size: 32, fill: ok ? 0x2B3A1E : 0x262A33, edge: ok ? 0x9BD56A : C.line, color: special || !have ? C.gold : C.ink }));
      if (special || !have) { b.label.x = 16; b.add(icon(this, 'medal', -62, 4, 0.8)); }
    });
  }

  // ---------- 기록 ----------
  drawRec() {
    const d = this.d, y0 = TOP + 30;
    const cleared = Object.keys(d.cleared).length, stars = Object.values(d.stars).reduce((a, b) => a + b, 0), aw = Object.keys(d.awards).length;
    this.L(panel(this, 36, y0, W - 72, 250, { r: 30 }));
    [[`${cleared}/50`, '깬 스테이지'], [`${stars}/150`, '별'], [d.kills.toLocaleString(), '처치'], [`${aw}/62`, '업적']].forEach(([v, l], k) => {
      const x = 36 + (W - 72) / 8 + k * (W - 72) / 4;
      this.L(text(this, x, y0 + 100, v, 44, C.gold)); this.L(text(this, x, y0 + 170, l, 28, C.mute, { weight: '700' }));
    });
    // 꾸미기 (소장자 전용 황금 성문)
    const own = owned();
    this.L(panel(this, 36, y0 + 280, W - 72, 150, { r: 28, line: own ? 0xFFC94A : 0x2A3142 }));
    this.L(text(this, 76, y0 + 330, '황금 성문', 38, own ? C.gold : C.ink, { ox: 0 }));
    this.L(text(this, 76, y0 + 380, '소장자 전용 꾸미기 · 우리 성문이 금빛으로 빛나요', 26, C.mute, { ox: 0, weight: '700' }));
    if (own) this.L(button(this, W - 170, y0 + 355, 220, 90, d.look.gate === 'gold' ? '쓰는 중' : '쓰기', () => { d.look.gate = d.look.gate === 'gold' ? 'normal' : 'gold'; save(); this.show('rec'); }, { size: 32, fill: d.look.gate === 'gold' ? 0x5A3B12 : 0x2B3A1E, edge: C.accent, color: C.gold }));
    else this.L(text(this, W - 170, y0 + 355, oadOn() ? '소장하면 열려요' : '원어데이에서', 26, C.mute, { weight: '700' }));
    // 업적 목록 (끌어서 보기)
    const ly = y0 + 460, lh = H - TAB - ly - 20;
    this.L(text(this, 48, ly + 6, '업적', 40, C.ink, { ox: 0 }));
    const sl = scrollList(this, 36, ly + 50, W - 72, lh - 50, 20); this.scroll = sl;
    const order = AWARDS.map((a, i) => i).sort((a, b) => (d.awards[b] ? 1 : 0) - (d.awards[a] ? 1 : 0));
    order.forEach((i, r) => {
      const a = AWARDS[i], y = r * 110, ok = !!d.awards[i];
      const g = this.add.graphics(); g.fillStyle(ok ? 0x231F12 : 0x161A24, 1).fillRoundedRect(0, y, W - 72, 96, 20).lineStyle(2, ok ? 0x8A6A2A : 0x2A3142, 1).strokeRoundedRect(0, y, W - 72, 96, 20);
      sl.c.add(g);
      sl.c.add(text(this, 30, y + 32, (ok ? '✓ ' : '') + a[0], 32, ok ? C.gold : C.ink, { ox: 0 }));
      sl.c.add(text(this, 30, y + 70, a[1], 24, C.mute, { ox: 0, weight: '700' }));
      sl.c.add(text(this, W - 110, y + 48, `+${a[2] * 5}`, 30, ok ? '#7A6A40' : C.gold, { ox: 1 }));
    });
    sl.setContent(AWARDS.length * 110);
  }

  // ---------- 창 ----------
  closePopup() { if (this.popup) { this.popup.destroy(); this.popup = null; } if (this.popBack) { this.popBack(); this.popBack = null; } }
  openPopup(h, build) {
    this.closePopup();
    const c = this.add.container(0, 0).setDepth(900);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.66).setInteractive().on('pointerup', () => this.closePopup()));
    const y = (H - h) / 2;
    c.add(this.add.zone(W / 2, y + h / 2, W - 120, h).setInteractive());
    c.add(panel(this, 60, y, W - 120, h, { r: 40 }));
    build(c, y); this.popup = c; this.popBack = pushBack(() => { this.closePopup(); return true; });
    c.setAlpha(0); this.tweens.add({ targets: c, alpha: 1, duration: 160 });
  }
  missionPopup() {
    const d = this.d;
    this.openPopup(900, (c, y) => {
      c.add(text(this, W / 2, y + 80, '오늘의 작전', 56, C.ink));
      c.add(text(this, W / 2, y + 140, `하나에 명예 ${MISSION_REWARD} · 셋 다 하면 +${MISSION_BONUS}`, 28, C.mute, { weight: '700' }));
      d.missions.list.forEach((m, i) => {
        const yy = y + 210 + i * 180;
        c.add(panel(this, 100, yy, W - 200, 150, { r: 26, line: m.done && !m.got ? 0xFFC94A : 0x2A3142 }));
        c.add(text(this, 140, yy + 50, m.text, 34, m.got ? C.mute : C.ink, { ox: 0 }));
        const g = this.add.graphics(); g.fillStyle(0x2A3142, 1).fillRoundedRect(140, yy + 96, 440, 16, 8).fillStyle(0xFFC94A, 1).fillRoundedRect(140, yy + 96, Math.max(16, 440 * m.n / m.goal), 16, 8); c.add(g);
        c.add(text(this, 600, yy + 104, `${m.n}/${m.goal}`, 26, C.mute, { ox: 0, weight: '700' }));
        const b = button(this, W - 230, yy + 75, 200, 96, m.got ? '받음' : m.done ? '받기' : '진행 중', () => { const v = claimMission(d, i); if (v) { save(); audio.id(13); toast(this, `명예 +${v}`, H / 2 + 420, C.gold); this.updateTop(); this.missionPopup(); this.updateTabs(); } }, { size: 32, fill: m.done && !m.got ? 0x5A3B12 : 0x1E2430, edge: m.done && !m.got ? C.accent : C.line, color: m.done && !m.got ? C.gold : C.mute });
        c.add(b);
      });
      c.add(button(this, W / 2, y + 800, 400, 110, '닫기', () => { this.closePopup(); this.show('map'); }, { size: 40 }));
    });
  }
  settings() {
    this.openPopup(760, (c, y) => {
      const d = this.d;
      c.add(text(this, W / 2, y + 90, '설정', 56, C.ink));
      const b1 = button(this, W / 2, y + 230, 600, 120, `배경음 ${d.music ? '켬' : '끔'}`, () => { const on = audio.toggleMusic(); b1.label.setText(`배경음 ${on ? '켬' : '끔'}`); if (on) audio.music('bgm_2', this); }, { size: 42 });
      const b2 = button(this, W / 2, y + 380, 600, 120, `효과음 ${d.sfx ? '켬' : '끔'}`, () => { const on = audio.toggleSfx(); b2.label.setText(`효과음 ${on ? '켬' : '끔'}`); }, { size: 42 });
      const b3 = button(this, W / 2, y + 530, 600, 120, '처음 안내 다시 보기', () => { d.tips = {}; save(); toast(this, '다음 판에서 안내가 다시 나와요', y + 640, C.gold); }, { size: 38 });
      c.add([b1, b2, b3]);
      c.add(text(this, W / 2, y + 680, `v${'0.2.0'} · 원작 SN · One a Day`, 24, '#5A5F6A', { weight: '700' }));
    });
  }
  milestonePopup(list) {
    this.openPopup(260 + list.length * 110, (c, y) => {
      c.add(text(this, W / 2, y + 80, '새로 열렸어요!', 56, C.gold));
      list.forEach((ms, i) => c.add(text(this, W / 2, y + 180 + i * 110, ms.text, 38, C.ink)));
      audio.id(10, { volume: 0.6 });
    });
  }
  onBack() {
    if (this.popup) { this.closePopup(); return true; }
    if (this.tab !== 'map') { this.show('map'); return true; }
    return undefined;
  }
}
