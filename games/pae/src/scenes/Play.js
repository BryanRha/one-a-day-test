// 판 화면: 관문 소개 → 손패 고르기(점수 미리보기) → 내기(점수 연출) / 바람 → 통과 · 장터 → 다음 달 … → 판 끝
//   규칙은 전부 core/run.js(엔진) — 이 파일은 보여 주기와 입력만
import { W, H, C, N } from '../config.js?v=0.91.5';
import { load, save } from '../save.js?v=0.91.5';
import { audio } from '../audio.js?v=0.91.5';
import { txt, button, roundButton, modal, toast, boxTex, panel, fmt, pressable } from '../ui.js?v=0.91.5';
import { CardView, CW, CH } from '../cards.js?v=0.91.5';
import { ambient, burst } from '../fx.js?v=0.91.5';
import { DECK, rules, praise, pickLine, recordBook, noteRunEnd, today, yakuOrder } from '../meta.js?v=0.91.5';
import { yakuRow } from '../yakuview.js?v=0.91.5';
import { Run, TOOL, TUNE } from '../core/run.js?v=0.91.5';
import { CHARM, RARITY_NAME } from '../core/charms.js?v=0.91.5';
import { GOD } from '../core/gods.js?v=0.91.5';
import { bm, bmOn, owned, price, buyContinue, adLeft, effBack, track, roundOver } from '../bmflow.js?v=0.91.5';

const S_HAND = 0.52, S_STAGE = 0.42;
const wait = (sc, ms) => new Promise(r => sc.time.delayedCall(Math.max(0, ms / (sc.speed || 1)), r));

export class PlayScene extends Phaser.Scene {
  constructor() { super('Play'); }
  init(data) { this.run = data.run; this.fresh = !!data.fresh; }
  create() {
    // 씬 재사용: 상태 초기화
    this.views = new Map(); this.sel = []; this.busy = false; this.speed = 1; this.sortBy = 'month'; this.overlay = null; this.tutStep = 0; this.bubble = null;
    this.finished = false; this.barTw = null; this.shown = 0; this.introGo = false; this.newSeen = null; this.tutPair = null; this.tutGlow = null; this.bg = null; this.shade = null; this.amb = null;
    const run = this.run;
    this.L = { top: 0, hY: 300, chY: 640, handY: H - 500, btnY: H - 140, infoY: H - 262 };
    this.L.stBot = this.L.handY - 170;
    this.L.stTop = Math.max(this.L.chY + 150, Math.round((this.L.chY + 120 + this.L.stBot) / 2 - 210));
    this.L.stY = (this.L.stTop + this.L.stBot) / 2;
    this.drawBg();
    this.buildHud();
    this.input.on('pointerdown', () => { if (this.busy) this.speed = 3.2; });
    this.input.on('pointerup', () => { this.speed = this.busy ? this.speed : 1; });
    this.saveRun();
    if (run.phase === 'intro') this.showIntro();
    else if (run.phase === 'play') { this.layoutHand(true); this.refresh(); }
    else if (run.phase === 'clear') this.showClear(true);
    else if (run.phase === 'shop') this.showShop();
    else if (run.phase === 'fail') this.onFail();
    else this.finish();
  }
  saveRun() { const d = load(); d.run = this.run.toJSON(); d.runOpen = true; save(); }
  onBack() { if (this.busy) return true; this.menu(); return true; }

  // ── 배경 · 머리판 ──
  drawBg() {
    const s = this.run.season;
    if (this.bg) { this.bg.destroy(); this.amb && this.amb.destroy(); }
    this.bg = this.add.image(W / 2, H / 2, s.bg).setDepth(-10); this.bg.setScale(Math.max(W / this.bg.width, H / this.bg.height));
    if (!this.shade) { this.shade = this.add.graphics().setDepth(-9); this.shade.fillStyle(0x070505, 0.45); this.shade.fillRect(0, 0, W, H); this.shade.fillGradientStyle(0x070505, 0x070505, 0x070505, 0x070505, 0, 0, 0.85, 0.85); this.shade.fillRect(0, H * 0.55, W, H * 0.45); }
    this.amb = ambient(this, s.id, -8);
  }
  buildHud() {
    const run = this.run, L = this.L;
    // 위 줄: 메뉴 · 판 이름 · 엽전
    roundButton(this, 66, 64, 40, '☰', () => this.menu(), { size: 34 }).setDepth(50);
    roundButton(this, 166, 64, 40, '?', () => this.yakuTable(), { size: 36 }).setDepth(50);
    this.modeT = txt(this, W / 2, 64, run.mode === 'daily' ? '오늘의 판' : run.mode === 'first' ? '첫 판 · 연습 · 순위 밖' : '자유 판', 28, C.dim, { thick: 3, weight: '700' }).setDepth(50);
    const coin = this.add.container(W - 150, 64).setDepth(50);
    coin.add(this.add.image(0, 0, boxTex(this, 'dark', 220, 76, 38, 3)));
    coin.add(this.coinIcon = this.add.circle(-66, 0, 22, N('#B08D57')).setStrokeStyle(4, N('#6E5530')));
    coin.add(this.add.rectangle(-66, 0, 12, 12, N('#2A1C10')));
    this.coinT = txt(this, -6, 0, '0', 40, C.goldHi, { thick: 4 }); coin.add(this.coinT);
    coin.add(txt(this, 62, 2, '엽전', 22, C.dim, { thick: 2, weight: '700' }));
    this.coinBox = coin;
    // 머리판
    const hp = this.add.container(0, 0).setDepth(10);
    hp.add(this.add.image(W / 2, L.hY, boxTex(this, 'panel', 1030, 380, 34, 3)).setAlpha(0.92));
    this.portrait = this.add.container(196, L.hY); hp.add(this.portrait);
    this.gateT = txt(this, 370, L.hY - 140, '', 46, C.gold, { ox: 0, thick: 4 }); hp.add(this.gateT);
    this.seasonT = txt(this, 1010, L.hY - 140, '', 26, C.ivory, { ox: 1, thick: 3, weight: '700' }); hp.add(this.seasonT);
    this.subT = txt(this, 370, L.hY - 82, '', 26, C.pink, { ox: 0, thick: 3, weight: '700', wrap: 640, align: 'left' }); hp.add(this.subT);
    hp.add(txt(this, 370, L.hY - 14, '목표 꽃 점수', 24, C.dim, { ox: 0, thick: 2, weight: '700' }));
    this.targetT = txt(this, 370, L.hY + 34, '', 60, C.ivory, { ox: 0, thick: 5, weight: '900' }); hp.add(this.targetT);
    this.barBg = this.add.image(690, L.hY + 104, boxTex(this, 'dark', 640, 40, 20, 2)); hp.add(this.barBg);
    this.barFill = this.add.rectangle(376, L.hY + 104, 0, 26, N('#C8343A')).setOrigin(0, 0.5); hp.add(this.barFill);
    this.barGlow = this.add.rectangle(376, L.hY + 96, 0, 6, N('#FFB0A0'), 0.6).setOrigin(0, 0.5); hp.add(this.barGlow);
    this.scoreT = txt(this, 690, L.hY + 104, '', 28, C.ivory, { thick: 4 }); hp.add(this.scoreT);
    this.handsChip = this.chip(hp, 470, L.hY + 160, '손', C.blue);
    this.windsChip = this.chip(hp, 680, L.hY + 160, '바람', C.jade);
    this.cheerChip = txt(this, 1000, L.hY + 160, '', 24, C.pink, { ox: 1, thick: 3, weight: '700' }); hp.add(this.cheerChip);
    this.hud = hp;
    // 부적 줄
    this.charmRow = this.add.container(0, L.chY).setDepth(12);
    // 무대(미리보기)
    this.stage = this.add.container(0, 0).setDepth(20);
    this.yakuT = txt(this, W / 2, L.stTop + 60, '', 58, C.goldHi, { thick: 6, shadow: true }); this.stage.add(this.yakuT);
    this.chipBox = this.scoreBox(W / 2 - 170, L.stTop + 160, '#F3E9D2', '#2A1C10', '점수');
    this.multBox = this.scoreBox(W / 2 + 170, L.stTop + 160, '#C8343A', '#FFFFFF', '배수');
    this.xT = txt(this, W / 2, L.stTop + 160, '×', 54, C.gold, { thick: 4 }); this.stage.add(this.xT);
    this.totT = txt(this, W / 2, L.stTop + 262, '', 46, C.ivory, { thick: 5 }); this.stage.add(this.totT);
    this.hintT = txt(this, W / 2, L.stTop + 330, '', 30, C.dim, { thick: 3, weight: '700', wrap: 960 }); this.stage.add(this.hintT);
    // 아래: 정렬 · 남은 패 · 버튼
    this.sortB = button(this, 120, L.infoY, 190, 64, '달 순', () => { this.sortBy = this.sortBy === 'month' ? 'kind' : 'month'; this.sortB.setLabel(this.sortBy === 'month' ? '달 순' : '종류 순'); this.layoutHand(); }, { style: 'dark', size: 26, r: 32 }).setDepth(40);
    this.deckB = this.add.container(W - 110, L.infoY).setDepth(40);
    this.deckB.add(this.add.image(-50, 0, 'cardback_' + effBack()).setScale(0.13).setAngle(-8));
    this.deckB.add(this.add.image(-44, -2, 'cardback_' + effBack()).setScale(0.13));
    this.deckT = txt(this, 18, 0, '', 30, C.ivory, { ox: 0, thick: 4 }); this.deckB.add(this.deckT);
    pressable(this, this.deckB, 200, 80, () => this.deckView());
    this.windB = button(this, 250, L.btnY, 400, 136, '바람', () => this.doWind(), { style: 'dark', sub: '다음 달로 보내기' }).setDepth(40);
    this.playB = button(this, 740, L.btnY, 560, 136, '내기', () => this.doPlay(), { style: 'red', sub: '고른 패로 꽃 점수' }).setDepth(40);
  }
  chip(parent, x, y, label, color) {
    const c = this.add.container(x, y);
    c.add(this.add.image(0, 0, boxTex(this, 'dark', 190, 58, 29, 2)));
    c.add(txt(this, -40, 0, label, 24, color, { thick: 2, weight: '700' }));
    const v = txt(this, 44, 0, '', 34, C.ivory, { thick: 4 }); c.add(v); c.v = v;
    parent.add(c); return c;
  }
  scoreBox(x, y, fill, ink, label) {
    const c = this.add.container(x, y);
    c.add(this.add.image(0, 0, boxTex(this, fill === '#C8343A' ? 'red' : 'ivory', 260, 112, 22, 3)));
    c.lab = txt(this, 0, -76, label, 22, C.dim, { thick: 2, weight: '700' }); c.add(c.lab);
    const v = txt(this, 0, 0, '0', 56, ink, { thick: 0, stroke: null, weight: '900' }); c.add(v); c.v = v;
    this.stage.add(c); return c;
  }

  // ── 상태 → 화면 ──
  refresh() {
    const run = this.run;
    this.coinT.setText(String(run.coins));
    const m = run.months[run.gate - 1], god = run.god;
    this.gateT.setText(`${m.n}월 · ${m.name}`);
    this.seasonT.setText(`${run.season.name} ${run.pos + 1}/${run.season.months.length}`).setColor(run.season.color);
    this.subT.setText(god ? `${god.name} — ${god.rule}` : this.first ? `이달의 꽃 ${m.flower} · 점수 2배` : `이달의 꽃 ${m.flower} · 패 점수 ×2 · 배수 +1`).setColor(god ? '#FF9A8A' : C.pink);
    this.targetT.setText(fmt(run.target || run.gateTarget()));
    if (!this.barTw || !this.barTw.isPlaying()) this.setBar(run.score);
    this.handsChip.v.setText(String(run.hands)); this.windsChip.v.setText(String(run.winds));
    this.cheerChip.setText(run.isBoss && run.cheerOn() ? '♥ 응원 −10%' : '');
    this.deckT.setText(String(run.pile.length));
    this.drawPortrait();
    this.drawCharms();
    this.updatePreview();
  }
  setBar(score, anim) {
    const t = this.run.target || 1, w = Math.min(1, score / t) * 612;
    if (this.barTw) { this.barTw.stop(); this.barTw = null; }
    if (anim) {
      this.tweens.add({ targets: [this.barFill, this.barGlow], width: w, duration: 520, ease: 'Quad.out' });
      const o = { v: this.shown || 0 };
      this.barTw = this.tweens.add({ targets: o, v: score, duration: 520, ease: 'Quad.out', onUpdate: () => this.scoreT.setText(`${fmt(o.v)} / ${fmt(t)}`) });
    } else { this.barFill.width = w; this.barGlow.width = w; this.scoreT.setText(`${fmt(score)} / ${fmt(t)}`); }
    this.shown = score;
  }
  drawPortrait() {
    const run = this.run, p = this.portrait; p.removeAll(true);
    const god = run.god;
    if (god) {
      const img = this.add.image(0, 0, 'godc_' + god.id); img.setScale(296 / img.width);
      p.add(img); p.add(this.add.circle(0, 0, 150).setStrokeStyle(6, N('#E8C27A')));
      p.add(this.add.circle(0, 0, 160).setStrokeStyle(2, N('#B3262B')));
    } else {
      const c = DECK.cards.find(x => x.month === run.month && x.kind !== 'pi' && x.kind !== 'tti') || DECK.cards.find(x => x.month === run.month);
      const im = this.add.image(0, 0, 'card_' + c.id).setScale(0.62).setAngle(-4);
      p.add(this.add.image(8, 10, 'card_shadow').setScale(0.62).setAngle(-4)); p.add(im);
    }
  }
  drawCharms() {
    const run = this.run, row = this.charmRow; row.removeAll(true);
    for (let i = 0; i < TUNE.slots; i++) {
      const x = 130 + i * 205, ch = run.charms[i];
      const slot = this.add.container(x, 0); row.add(slot);
      slot.add(this.add.image(0, 0, boxTex(this, 'dark', 186, 186, 22, 2)).setAlpha(ch ? 1 : 0.45));
      if (!ch) { slot.add(txt(this, 0, 0, '부적 자리', 22, '#6B6052', { stroke: null, weight: '700' })); continue; }
      const d = CHARM[ch.id];
      slot.add(this.add.image(0, -8, 'talisman').setScale(150 / this.textures.get('talisman').getSourceImage().height * 1.05).setAngle(i % 2 ? 3 : -3));
      slot.add(txt(this, 0, -2, d.glyph, 58, '#B01E1E', { stroke: '#F6D88A', thick: 2, weight: '900' }));
      slot.add(txt(this, 0, 112, d.name, 24, C.ivory, { thick: 3, weight: '700' }));
      if (ch.today) slot.add(txt(this, -70, -76, '오늘', 20, '#3A1E08', { stroke: null, ox: 0 }).setBackgroundColor('#E8C27A').setPadding(8, 3));
      if (ch.st && ch.st.n) slot.add(txt(this, 70, -76, `+${ch.st.n}`, 22, C.goldHi, { ox: 1, thick: 3 }));
      slot.charm = ch; slot.idx = i;
      pressable(this, slot, 186, 186, () => this.charmInfo(i), { silent: false });
    }
  }
  charmInfo(i) {
    const run = this.run, ch = run.charms[i], d = CHARM[ch.id];
    const m = modal(this, 860, 620, { title: d.name });
    m.add(txt(this, 0, -150, `${ch.today ? '오늘의 부적 · ' : ''}${RARITY_NAME[d.rarity] || '선물'}`, 28, C.dim, { thick: 2, weight: '700' }));
    m.add(txt(this, 0, -40, d.desc, 36, C.ivory, { wrap: 740, weight: '700', thick: 3 }));
    if (run.phase === 'shop' && !ch.today) {
      m.add(button(this, 0, 180, 460, 110, `팔기 · 엽전 +${run.sellValue(i)}`, () => { run.sell(i); audio.play('sfx_coin'); m.close(); this.saveRun(); this.refresh(); this.showShop(); }, { style: 'dark', size: 32 }));
    } else m.add(txt(this, 0, 170, ch.today ? '오늘의 부적은 팔 수 없어요 · 매일 바뀌어요' : '장터에서 팔 수 있어요', 26, C.dim, { thick: 2, weight: '700' }));
  }

  // ── 손패 ──
  sortedHand() {
    const run = this.run, kO = { gwang: 0, yeol: 1, tti: 2, pi: 3 };
    return run.hand.slice().sort((a, b) => { const x = run.card(a), y = run.card(b); return this.sortBy === 'month' ? (x.month - y.month || kO[x.kind] - kO[y.kind]) : (kO[x.kind] - kO[y.kind] || x.month - y.month); });
  }
  viewOf(uid) {
    let v = this.views.get(uid);
    if (!v) {
      v = new CardView(this, W + 200, this.L.handY, this.run.card(uid), S_HAND, 'cardback_' + effBack()).setDepth(30);
      v.setInteractive({ useHandCursor: true });
      let t0 = 0, held = null;
      v.on('pointerdown', () => { t0 = performance.now(); held = this.time.delayedCall(380, () => { held = null; this.zoom(v); }); });
      v.on('pointerup', () => { if (held) { held.remove(); held = null; this.toggle(uid); } });
      v.on('pointerout', () => { if (held) { held.remove(); held = null; } });
      this.views.set(uid, v);
    }
    return v;
  }
  layoutHand(instant = false, fromDeck = []) {
    const hand = this.sortedHand(), n = hand.length, mid = (n - 1) / 2;
    const sp = n > 1 ? Math.min(116, 880 / (n - 1)) : 0;
    hand.forEach((u, i) => {
      const v = this.viewOf(u), k = i - mid;
      const x = W / 2 + k * sp, y = this.L.handY + k * k * 3.2 - (this.sel.includes(u) ? 54 : 0), a = k * 2.6;
      v.setDepth(30 + i); v.home = { x, y, a };
      if (instant) { v.setPosition(x, y).setAngle(a); return; }
      if (fromDeck.includes(u)) {
        const di = fromDeck.indexOf(u);
        v.setPosition(W - 120, this.L.infoY).setAngle(-30).setBack(true).setScale(0.5);
        this.tweens.add({ targets: v, x, y, angle: a, scale: 1, duration: 300, delay: di * 70, ease: 'Cubic.out', onStart: () => audio.play('sfx_deal', { volume: 0.5, gap: 30 }), onComplete: () => v.flip(true) });
      } else this.tweens.add({ targets: v, x, y, angle: a, duration: 220, ease: 'Cubic.out' });
    });
  }
  toggle(uid) {
    if (this.busy || this.run.phase !== 'play') return;
    const i = this.sel.indexOf(uid), v = this.viewOf(uid);
    if (i >= 0) { this.sel.splice(i, 1); v.setSelected(false); audio.play('sfx_unpick', { volume: 0.5 }); }
    else {
      if (this.sel.length >= 5) { audio.play('sfx_err', { volume: 0.5 }); toast(this, '한 번에 5장까지 고를 수 있어요'); return; }
      this.sel.push(uid); v.setSelected(true); audio.play('sfx_pick', { volume: 0.6, rate: 1 + this.sel.length * 0.04 }); audio.buzz(8);
    }
    this.layoutHand(); this.updatePreview(); this.tutCheck();
  }
  zoom(v) {
    const c = v.card, K = DECK.kinds[c.kind], m = DECK.months.find(x => x.n === c.month);
    const md = modal(this, 900, 1240, {});
    md.add(this.add.image(0, -140, 'card_' + c.id).setScale(1.6));
    const tags = [K.name + (c.kind === 'pi' && c.pi > 1 ? ' (쌍피)' : ''), c.ribbon ? DECK.ribbons[c.ribbon].name : null, ...c.tags.map(t => DECK.tags[t] + ' 그림')].filter(Boolean).join(' · ');
    md.add(txt(this, 0, 300, `${c.month}월 ${m.name} · ${m.flower}`, 42, C.gold, { thick: 4 }));
    md.add(txt(this, 0, 360, tags, 32, C.ivory, { weight: '700', thick: 3 }));
    md.add(txt(this, 0, 420, `패 점수 ${rules.pts(c)}${c.month === this.run.month ? ' → 이달의 꽃이라 ×2' : ''}${c.gold ? ' · 금박 배수 +2' : ''}${c.pearl ? ' · 자개 점수 +20' : ''}`, 30, C.pink, { weight: '700', thick: 3 }));
    md.add(txt(this, 0, 540, '바깥을 누르면 닫혀요', 24, C.dim, { thick: 2, weight: '700' }));
  }

  // ── 미리보기 (점수 미리보기: 고른 패의 족보 · 점수 × 배수 = 꽃 점수가 그대로 나옴) ──
  updatePreview() {
    const run = this.run;
    this.stage.setVisible(run.phase === 'play' || this.busy);
    if (this.busy) return;
    const can = run.canPlay(this.sel), canW = run.canWind(this.sel);
    this.playB.setEnabled(!can, can); this.windB.setEnabled(!canW, canW);
    this.windB.setLabel(`바람 ${run.winds}`);
    this.windB.subT.setText(run.gate >= run.gates ? '패 바꾸기 · 마지막 달' : this.first && run.gate === 1 ? '패 바꾸기' : '패 바꾸기 · 다음 달로');
    const simple = this.first;
    this.chipBox.lab.setVisible(!simple); this.multBox.lab.setVisible(!simple);
    if (!this.sel.length) {
      this.yakuT.setText(''); this.chipBox.v.setText('0'); this.multBox.v.setText('0'); this.totT.setText('');
      this.chipBox.setAlpha(simple ? 0 : 0.35); this.multBox.setAlpha(simple ? 0 : 0.35); this.xT.setAlpha(simple ? 0 : 0.35);
      this.hintT.setText(run.hand.length ? '패를 눌러 골라 보세요 · 길게 누르면 크게 보여요' : '').setColor(C.dim);
      return;
    }
    const r = run.preview(this.sel);
    this.chipBox.setAlpha(simple ? 0 : 1); this.multBox.setAlpha(simple ? 0 : 1); this.xT.setAlpha(simple ? 0 : 1);
    const ex = r.extras.length ? ` + ${r.extras.map(e => e.name).join(' + ')}` : '';
    this.yakuT.setText(r.yaku.name + ex);
    this.chipBox.v.setText(fmt(r.chips)); this.multBox.v.setText(r.x !== 1 ? `${fmt(r.mult)}×${+r.x.toFixed(2)}` : fmt(r.mult));
    this.totT.setText(simple ? `꽃 점수 ${fmt(r.total)}` : `= ${fmt(r.total)}`).setFontSize(simple ? 64 : 46).setY(simple ? this.L.stTop + 170 : this.L.stTop + 262);
    /* 첫 판: 족보가 바뀌면 꽃 점수가 톡 튀어 커짐 (계단을 눈으로) */
    if (simple && this.lastPrevY !== r.yaku.id) { this.lastPrevY = r.yaku.id; this.tweens.add({ targets: [this.totT, this.yakuT], scale: { from: 1.25, to: 1 }, duration: 260, ease: 'Back.out' }); audio.play('sfx_chip_' + Math.min(7, this.sel.length * 2), { volume: 0.5 }); }
    const need = run.target - run.score, unused = this.sel.length - r.scoring.length;
    if (r.total >= need) this.hintT.setText('이 손이면 이번 달 통과!').setColor('#FFD88A');
    else if (simple) this.hintT.setText(`목표까지 ${fmt(need)}`).setColor(C.dim);
    else if (unused > 0 && r.yaku.id !== 'high') this.hintT.setText(`점수에 안 드는 패 ${unused}장 — 빼고 내거나 바람에 실어도 돼요`).setColor(C.dim);
    else this.hintT.setText(`남은 목표 ${fmt(need)}`).setColor(C.dim);
    for (const [u, v] of this.views) if (run.hand.includes(u)) v.img.setAlpha(this.sel.includes(u) && !r.scoring.includes(u) ? 0.72 : 1);
  }

  // ── 관문 소개 ──
  showIntro() {
    const run = this.run, m = run.months[run.gate - 1], god = run.god;
    this.refresh(); this.stage.setVisible(false);
    this.setButtons(false);
    const ov = this.add.container(0, 0).setDepth(3000); this.overlay = ov;
    ov.add(this.add.rectangle(W / 2, H / 2, W, H, 0x050304, 0.82).setInteractive());
    const cy = H * 0.4;
    if (god) {
      audio.play('sfx_boss'); audio.music('bgm_boss', this); audio.buzz([30, 60, 30]);
      ov.add(this.add.image(W / 2, cy - 40, 'fx_rays').setScale(2.2).setAlpha(0.25).setTint(0xff6a5a));
      const img = this.add.image(W / 2, cy - 60, 'godf_' + god.id).setScale(1.25);
      ov.add(img);
      img.setAlpha(0).setScale(1.4); this.tweens.add({ targets: img, alpha: 1, scale: 1.25, duration: 900, ease: 'Cubic.out' });
      ov.add(txt(this, W / 2, cy + 300, `${run.season.name}의 계절신`, 30, '#FF9A8A', { thick: 3, ls: 6 }));
      ov.add(txt(this, W / 2, cy + 360, god.name, 84, C.gold, { thick: 6, shadow: true, weight: '900' }));
      ov.add(txt(this, W / 2, cy + 440, `“${god.line}”`, 30, C.ivory, { thick: 3, weight: '700' }).setAlpha(0.85));
      const rb = this.add.image(W / 2, cy + 540, boxTex(this, 'red', 900, 100, 50, 3)); ov.add(rb);
      ov.add(txt(this, W / 2, cy + 540, god.rule, 32, C.ivory, { thick: 3, wrap: 840 }));
      if (this.first) ov.add(txt(this, W / 2, cy + 600, '계절신이 나오는 달은 규칙 하나가 바뀌어요 (이번 달만)', 28, '#FFB0A0', { thick: 3, weight: '700' }));
    } else {
      audio.music('bgm_main', this);
      const c = DECK.cards.find(x => x.month === m.n && (x.kind === 'gwang' || x.kind === 'yeol')) || DECK.cards.find(x => x.month === m.n);
      ov.add(this.add.image(W / 2, cy - 40, 'fx_rays').setScale(1.8).setAlpha(0.2));
      const cv = this.add.image(W / 2, cy - 40, 'card_' + c.id).setScale(1.05); ov.add(this.add.image(W / 2 + 14, cy - 22, 'card_shadow').setScale(1.05)); ov.add(cv);
      cv.setAngle(-6).setScale(0.7).setAlpha(0); this.tweens.add({ targets: cv, angle: 0, scale: 1.05, alpha: 1, duration: 600, ease: 'Back.out' });
      ov.add(txt(this, W / 2, cy + 330, `${run.season.name} · ${run.pos + 1}번째 달`, 30, run.season.color, { thick: 3, ls: 4 }));
      ov.add(txt(this, W / 2, cy + 400, `${m.n}월 · ${m.name}`, 84, C.gold, { thick: 6, shadow: true, weight: '900' }));
      ov.add(txt(this, W / 2, cy + 480, this.first ? `이달의 꽃 「${m.flower}」 — 점수 2배` : `이달의 꽃 「${m.flower}」 — 패 점수 ×2 · 배수 +1`, 32, C.pink, { thick: 3 }));
    }
    ov.add(txt(this, W / 2, cy + (god ? 680 : 620), `목표 꽃 점수 ${fmt(run.gateTarget())}`, 44, C.ivory, { thick: 4 }));
    if (run.windNext.length) ov.add(txt(this, W / 2, cy + 690, `바람에 실은 패 ${run.windNext.length}장이 첫 손에 돌아와요`, 30, C.jade, { thick: 3, weight: '700' }));
    const go = button(this, W / 2, H - 200, 600, 140, god ? '맞서기' : '시작', () => {
      if (this.introGo) return; this.introGo = true;
      this.tweens.add({ targets: ov, alpha: 0, duration: 250, onComplete: () => { ov.destroy(); this.overlay = null; this.introGo = false; } });
      const back = run.windNext.slice();
      run.startGate(); this.saveRun();
      if (this.first && run.gate === 2) this.tstep(6);
      this.sel = []; for (const v of this.views.values()) v.destroy(); this.views.clear();
      this.refresh(); this.setButtons(true);
      this.layoutHand(false, run.hand.slice());
      this.time.delayedCall(800, () => { this.tutStart(); this.tutDeal(back); });
    }, { style: 'red' });
    ov.add(go);
  }
  setButtons(on) { for (const b of [this.playB, this.windB, this.sortB]) b.setVisible(on); this.deckB.setVisible(on); }

  // ── 내기 ──
  async doPlay() {
    const run = this.run;
    if (this.busy) return;
    const why = run.canPlay(this.sel); if (why) { toast(this, why); return; }
    this.busy = true; this.speed = 1; this.tutHide(); this.tstep(2); this.lastPrevY = null;
    const uids = this.sel.slice(); this.sel = [];
    const before = run.score;
    const { res, drawn, gust } = run.play(uids);
    this.saveRun();
    this.stage.setVisible(true);
    this.yakuT.setText(''); this.totT.setText(''); this.hintT.setText('');
    this.chipBox.setAlpha(1); this.multBox.setAlpha(1); this.xT.setAlpha(1);
    this.totT.setFontSize(46).setY(this.L.stTop + 262);
    this.playB.setEnabled(false); this.windB.setEnabled(false);
    // 1) 낸 패가 무대로
    audio.play('sfx_play'); audio.buzz(12);
    const n = uids.length, rowY = this.L.stTop + 390;
    const views = uids.map(u => this.viewOf(u));
    views.forEach((v, i) => { v.setSelected(false); v.img.setAlpha(1); v.setDepth(200 + i); this.tweens.add({ targets: v, x: W / 2 + (i - (n - 1) / 2) * 168, y: rowY, angle: 0, scale: S_STAGE / S_HAND * 1.05, duration: 260, delay: i * 40, ease: 'Cubic.out' }); });
    this.layoutHand();
    await wait(this, 380);
    // 점수에 안 드는 패는 흐리게
    views.forEach(v => { if (!res.scoring.includes(v.uid)) this.tweens.add({ targets: v, alpha: 0.4, y: rowY + 20, duration: 200 }); });
    // 2) 족보
    let chips = 0, mult = 0;
    const setBoxes = () => { this.chipBox.v.setText(fmt(chips)); this.multBox.v.setText(fmt(mult)); };
    for (const st of res.steps) {
      if (st.t === 'yaku') {
        chips = st.chips; mult = st.mult; setBoxes();
        this.yakuT.setText(st.name).setScale(0.4).setAlpha(0);
        this.tweens.add({ targets: this.yakuT, scale: 1, alpha: 1, duration: 280, ease: 'Back.out' });
        audio.play('sfx_flip'); this.pulse(this.chipBox); this.pulse(this.multBox);
        const newY = !load().book.yaku.includes(st.id) && st.id !== 'high' && !(this.newSeen || (this.newSeen = new Set())).has(st.id);
        if (newY) { this.newSeen.add(st.id); this.floatText(W / 2, this.L.stTop + 10, '새 족보 발견!', 30, C.pink); }
        await wait(this, 420);
      } else if (st.t === 'extra') {
        mult += st.mult; setBoxes(); this.yakuT.setText(this.yakuT.text + ' + ' + st.name); this.pulse(this.multBox);
        this.floatText(this.multBox.x, this.multBox.y - 70, `겹 족보 +${st.mult}`, 32, '#FF9A8A'); audio.play('sfx_mult');
        await wait(this, 380);
      } else if (st.t === 'card') {
        const v = this.views.get(st.uid), k = res.scoring.indexOf(st.uid);
        chips += st.chips; mult += st.mult; setBoxes();
        if (v) { this.tweens.add({ targets: v, y: rowY - 36, duration: 90, yoyo: true, ease: 'Quad.out' }); this.floatText(v.x, rowY - 150, `+${st.chips}`, 44, C.goldHi); }
        audio.play('sfx_chip_' + Math.min(7, k), { volume: 0.75 }); this.pulse(this.chipBox, 1.08);
        if (st.season && v) { this.floatText(v.x, rowY - 196, '제철!', 30, C.pink); audio.play('sfx_season', { volume: 0.4 }); }
        if (st.mult && v) { this.floatText(v.x, rowY + 130, `배수 +${st.mult}`, 30, '#FF9A8A'); this.pulse(this.multBox); }
        await wait(this, Math.max(150, 300 - k * 25));
      } else if (st.t === 'charm') {
        const slot = this.charmRow.list[st.slot], v = st.uid ? this.views.get(st.uid) : null;
        if (st.chips) chips += st.chips; if (st.mult) mult += st.mult; if (st.x) mult = mult * st.x;
        setBoxes(); if (st.x) this.multBox.v.setText(fmt(mult));
        const lab = st.x ? `×${+st.x.toFixed(2)}` : st.mult ? `배수 +${st.mult}` : `+${st.chips}`;
        if (slot) { this.tweens.add({ targets: slot, scale: 1.15, angle: { from: -6, to: 0 }, duration: 160, yoyo: true }); this.floatText(slot.x, this.L.chY - 110, lab, 34, st.x ? '#FFB27A' : st.mult ? '#FF9A8A' : C.goldHi); }
        if (v) this.tweens.add({ targets: v, angle: { from: -5, to: 5 }, duration: 70, yoyo: true, onComplete: () => { v.angle = 0; } });
        audio.play(st.x ? 'sfx_xmult' : st.mult ? 'sfx_mult' : 'sfx_chip_7', { volume: 0.6 }); this.pulse(st.chips && !st.mult ? this.chipBox : this.multBox, st.x ? 1.25 : 1.1);
        if (st.x) { this.cameras.main.shake(120, 0.004); audio.buzz(18); }
        await wait(this, st.x ? 380 : 280);
      }
    }
    // 3) 총점 폭발
    const need = run.target - before, ratio = res.total / Math.max(1, need), cleared = run.phase === 'clear' || run.phase === 'won';
    const big = ratio >= 1.4 || res.total >= run.target * 0.8 || ['ogwang', 'sagwang', 'chongtong', 'samgwang'].includes(res.yaku.id);
    this.chipBox.v.setText(fmt(res.chips)); this.multBox.v.setText(fmt(res.mult * res.x));
    this.tweens.add({ targets: [this.chipBox, this.multBox], x: W / 2, duration: 220, ease: 'Quad.in' });
    await wait(this, 230);
    this.chipBox.setAlpha(0); this.multBox.setAlpha(0); this.xT.setAlpha(0);
    const tot = txt(this, W / 2, this.L.stTop + 170, fmt(res.total), big ? 120 : 96, C.goldHi, { thick: 8, shadow: true, weight: '900' }).setDepth(400).setScale(0.3);
    this.tweens.add({ targets: tot, scale: 1.12, duration: 260, ease: 'Back.out', onComplete: () => this.tweens.add({ targets: tot, scale: 1, duration: 120 }) });
    const rays = this.add.image(W / 2, this.L.stTop + 170, 'fx_rays').setDepth(390).setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: rays, alpha: big ? 0.8 : 0.45, scale: big ? 2 : 1.3, angle: 40, duration: 700, yoyo: true, onComplete: () => rays.destroy() });
    burst(this, W / 2, this.L.stTop + 170, Math.min(1, 0.25 + ratio * 0.5), 395);
    audio.play(big ? 'sfx_big' : 'sfx_total', { volume: 0.8 }); audio.buzz(big ? [25, 40, 60] : 30);
    if (big) this.cameras.main.shake(260, 0.008);
    this.yakuT.setText(pickLine(praise(ratio, cleared)));
    this.tweens.add({ targets: this.yakuT, scale: { from: 0.6, to: 1 }, duration: 260, ease: 'Back.out' });
    await wait(this, big ? 900 : 650);
    // 4) 점수가 막대로
    this.tweens.add({ targets: tot, x: 690, y: this.L.hY + 104, scale: 0.3, alpha: 0.2, duration: 380, ease: 'Cubic.in', onComplete: () => tot.destroy() });
    await wait(this, 360);
    this.setBar(run.score, true); this.pulse(this.scoreT, 1.2); audio.play('sfx_coin', { volume: 0.4 });
    // 5) 낸 패 치우기 · 새 패
    views.forEach((v, i) => { this.tweens.add({ targets: v, x: -200, y: rowY - 100 + i * 20, angle: -30, alpha: 0, duration: 360, delay: i * 40, ease: 'Cubic.in', onComplete: () => v.destroy() }); this.views.delete(v.uid); });
    if (gust) { const gv = this.views.get(gust); if (gv) { this.floatText(gv.x, gv.y - 160, '국화 바람!', 32, C.jade); this.tweens.add({ targets: gv, x: W + 200, y: this.L.hY, angle: 200, alpha: 0, duration: 600, onComplete: () => gv.destroy() }); this.views.delete(gust); audio.play('sfx_wind', { volume: 0.5 }); } }
    await wait(this, 300);
    this.speed = 1; this.busy = false;
    this.chipBox.setPosition(W / 2 - 170, this.L.stTop + 160); this.multBox.setPosition(W / 2 + 170, this.L.stTop + 160);
    if (run.phase === 'clear' || run.phase === 'won') { this.refresh(); this.showClear(); return; }
    this.layoutHand(false, drawn);
    this.refresh();
    if (run.phase === 'fail') { await wait(this, 500); this.onFail(); return; }
    this.time.delayedCall(450, () => this.tutAfterPlay());
  }
  pulse(o, s = 1.12) { this.tweens.add({ targets: o, scale: s, duration: 90, yoyo: true, ease: 'Quad.out' }); }
  floatText(x, y, s, size, color) {
    const t = txt(this, x, y, s, size, color, { thick: Math.round(size * 0.14), weight: '900' }).setDepth(600);
    this.tweens.add({ targets: t, y: y - 70, alpha: { from: 1, to: 0 }, duration: 900 / (this.speed || 1), ease: 'Quad.out', onComplete: () => t.destroy() });
  }

  // ── 바람 ──
  async doWind() {
    const run = this.run;
    if (this.busy) return;
    const why = run.canWind(this.sel); if (why) { toast(this, why); return; }
    this.busy = true; this.tutHide(); this.tstep(3);
    const uids = this.sel.slice(); this.sel = [];
    const { drawn } = run.wind(uids); this.saveRun();
    const last = run.gate >= run.gates;
    audio.play('sfx_wind'); audio.buzz(10);
    const e = this.add.particles(0, 0, 'fx_petal', { x: { min: 200, max: W - 200 }, y: this.L.handY, speedX: { min: 300, max: 700 }, speedY: { min: -500, max: -200 }, rotate: { min: 0, max: 360 }, scale: { min: 0.6, max: 1.2 }, lifespan: 1200, alpha: { start: 1, end: 0 }, emitting: false }).setDepth(500);
    e.explode(26); this.time.delayedCall(1400, () => e.destroy());
    uids.forEach((u, i) => { const v = this.views.get(u); if (!v) return; v.setSelected(false); this.views.delete(u); this.tweens.add({ targets: v, x: W + 260, y: this.L.hY - 100 + i * 30, angle: 140 + i * 30, scale: 0.5, alpha: 0.2, duration: 650, delay: i * 60, ease: 'Cubic.in', onComplete: () => v.destroy() }); });
    this.floatText(W / 2, this.L.handY - 260, last ? '바람에 흩어졌어요' : `${uids.length}장 · 다음 달 첫 손으로`, 38, C.jade);
    await wait(this, 520);
    this.layoutHand(false, drawn);
    this.busy = false; this.refresh();
    if (!load().tut.wind) { load().tut.wind = true; save(); }
    if (run.phase === 'fail') this.onFail();
  }

  // ── 통과 · 보상 ──
  showClear(resume = false) {
    const run = this.run, god = GOD[run.bosses[run.seasonI]], wasBoss = run.isBoss, rw = run.reward || { base: 0, hands: 0, interest: 0, charms: 0, boss: 0, sum: 0 };
    this.setButtons(false); this.stage.setVisible(false);
    for (const v of this.views.values()) this.tweens.add({ targets: v, y: H + 300, duration: 400, onComplete: () => v.destroy() });
    this.views.clear();
    const d = load(); if (run.gate === 1 && !d.tut.first) { d.tut.first = true; save(); }
    if (!resume) { track('gate_end', { gate: run.gate, ok: 1, hands: run.playedN || 0, winds: (run.windsMax || 3) - run.winds, first: this.first ? 1 : 0, mode: run.mode }); if (run.gate === 1) this.tstep(4); }
    const ov = this.add.container(0, 0).setDepth(3000); this.overlay = ov;
    ov.add(this.add.rectangle(W / 2, H / 2, W, H, 0x050304, 0.7).setInteractive());
    const cy = H * 0.4;
    ov.add(this.add.image(W / 2, cy, 'fx_rays').setScale(2.4).setAlpha(0.5));
    if (wasBoss) {
      const img = this.add.image(W / 2, cy, 'godf_' + god.id).setScale(1.1); ov.add(img);
      this.tweens.add({ targets: img, alpha: 0.15, scale: 0.9, duration: 1400, delay: 300 });
      audio.play('sfx_bosswin'); audio.buzz([40, 50, 80]);
      ov.add(txt(this, W / 2, cy + 40, `${god.name}을 넘었어요!`, 70, C.gold, { thick: 6, shadow: true, weight: '900' }));
      ov.add(txt(this, W / 2, cy + 130, run.phase === 'won' ? '열두 달을 모두 넘겼어요' : `${run.season.name}이 지나갑니다`, 34, C.ivory, { thick: 3 }));
    } else {
      audio.play('sfx_clear'); audio.buzz([20, 30, 20]);
      ov.add(txt(this, W / 2, cy, `${run.month}월 통과`, 96, C.gold, { thick: 7, shadow: true, weight: '900' }));
      ov.add(txt(this, W / 2, cy + 100, `${fmt(run.score)} / ${fmt(run.target)}`, 36, C.ivory, { thick: 3 }));
    }
    burst(this, W / 2, cy, 0.9, 3001);
    const lines = [['통과 보상', rw.base], ['남은 손', rw.hands], ['이자 (엽전 5개마다)', rw.interest], ['부적', rw.charms], ['계절신 보너스', rw.boss]].filter(x => x[1] > 0);
    const ly = cy + 230;
    lines.forEach(([k, v], i) => {
      const a = txt(this, W / 2 - 300, ly + i * 64, k, 34, C.ivory, { ox: 0, thick: 3, weight: '700' }), b = txt(this, W / 2 + 300, ly + i * 64, `엽전 +${v}`, 36, C.goldHi, { ox: 1, thick: 4 });
      ov.add(a); ov.add(b); a.setAlpha(0); b.setAlpha(0);
      this.tweens.add({ targets: [a, b], alpha: 1, x: '+=0', duration: 200, delay: resume ? 0 : 500 + i * 220, onStart: () => audio.play('sfx_coin', { volume: 0.5, rate: 1 + i * 0.08 }) });
    });
    ov.add(txt(this, W / 2, ly + lines.length * 64 + 30, `합계 엽전 +${rw.sum}`, 44, C.gold, { thick: 4 }));
    this.refresh();
    const label = run.phase === 'won' ? '판 마무리' : '장터로';
    ov.add(button(this, W / 2, H - 200, 600, 140, label, () => {
      ov.destroy(); this.overlay = null;
      if (run.phase === 'won') { this.finish(); return; }
      run.openShop(); this.saveRun(); this.showShop();
    }, { style: 'red' }));
  }

  // ── 장터 (엽전으로만 · 골드 환전 없음) ──
  showShop() {
    const run = this.run;
    if (this.overlay) this.overlay.destroy();
    this.setButtons(false); this.stage.setVisible(false);
    for (const v of this.views.values()) v.destroy(); this.views.clear();
    audio.music('bgm_shop', this);
    this.refresh();
    const ov = this.add.container(0, 0).setDepth(1500); this.overlay = ov;
    const top = this.L.chY + 120, bot = H - 30;
    ov.add(this.add.image(W / 2, (top + bot) / 2, boxTex(this, 'panel', 1040, bot - top, 36, 4)).setInteractive());
    ov.add(txt(this, W / 2, top + 60, '장터', 56, C.gold, { thick: 4, ls: 8 }));
    ov.add(txt(this, W / 2, top + 112, '엽전으로 부적과 패 손질을 사요 · 위의 부적을 누르면 팔 수 있어요', 24, C.dim, { thick: 2, weight: '700' }));
    // 부적 3
    const s = run.shop, cy = top + 360;
    this.shopCards = [];
    s.charms.forEach((o, i) => {
      const x = W / 2 + (i - 1) * 335, d = CHARM[o.id], c = this.add.container(x, cy); ov.add(c); this.shopCards[i] = c;
      c.add(this.add.image(0, 0, boxTex(this, 'dark', 318, 440, 26, 2)).setAlpha(o.sold ? 0.4 : 1));
      if (o.sold) { c.add(txt(this, 0, 0, '샀어요', 34, C.dim, { thick: 3 })); return; }
      c.add(this.add.image(0, -118, 'talisman').setScale(0.24).setAngle(i % 2 ? 3 : -3));
      c.add(txt(this, 0, -112, d.glyph, 64, '#B01E1E', { stroke: '#F6D88A', thick: 2, weight: '900' }));
      c.add(txt(this, 0, 14, d.name, 32, C.gold, { thick: 3 }));
      c.add(txt(this, 0, 48, RARITY_NAME[d.rarity], 20, d.rarity === 3 ? '#FFB27A' : d.rarity === 2 ? C.blue : C.dim, { thick: 2, weight: '700' }));
      c.add(txt(this, 0, 112, d.desc, 23, C.ivory, { wrap: 290, thick: 2, weight: '700' }));
      const b = button(this, 0, 196, 230, 70, `엽전 ${o.cost}`, () => {
        const r = run.buyCharm(i); if (r.error) { toast(this, r.error); return; }
        audio.play('sfx_buy'); audio.buzz(12); this.tutHide(); this.tstep(5); this.saveRun(); this.refresh(); this.showShop();
        const slot = this.charmRow.list[run.charms.length - 1]; if (slot) { slot.setScale(0.3); this.tweens.add({ targets: slot, scale: 1, duration: 300, ease: 'Back.out' }); }
      }, { style: 'gold', size: 28 });
      const why = run.canBuyCharm(i); if (why) b.setEnabled(false, why);
      c.add(b);
    });
    // 패 손질 2
    const ty = cy + 380;
    ov.add(txt(this, 80, ty - 90, '패 손질', 32, C.gold, { ox: 0, thick: 3 }));
    s.tools.forEach((o, i) => {
      const t = TOOL[o.id], x = W / 2 + (i - 0.5) * 500, c = this.add.container(x, ty + 20); ov.add(c);
      c.add(this.add.image(0, 0, boxTex(this, 'dark', 480, 170, 24, 2)).setAlpha(o.sold ? 0.4 : 1));
      c.add(txt(this, -220, -44, t.name, 32, o.sold ? C.dim : C.ivory, { ox: 0, thick: 3 }));
      c.add(txt(this, -220, 14, o.sold ? '썼어요' : t.desc, 22, C.dim, { ox: 0, wrap: 290, thick: 2, weight: '700', align: 'left' }));
      if (o.sold) return;
      const b = button(this, 150, 0, 150, 76, `엽전 ${o.cost}`, () => this.pickCard(i), { style: 'gold', size: 26 });
      const why = run.canBuyTool(i); if (why) b.setEnabled(false, why);
      c.add(b);
    });
    // 아래: 새로 고침 · 다음 달
    const rb = button(this, 260, bot - 110, 380, 120, `새로 고침`, () => { const r = run.reroll(); if (r.error) { toast(this, r.error); return; } audio.play('sfx_charm'); this.saveRun(); this.refresh(); this.showShop(); }, { style: 'dark', sub: `부적만 · 엽전 ${run.rerollCost}` });
    const rwhy = run.canReroll(); if (rwhy) rb.setEnabled(false, rwhy);
    ov.add(rb);
    const next = run.months[run.gate] || run.months[run.gate - 1];
    ov.add(button(this, 760, bot - 110, 500, 120, '다음 달로', () => { this.tutHide(); if (this.first && run.gate === 1 && this.once('done')) track('tut_done', { sec: this.sec() }); run.leaveShop(); this.saveRun(); ov.destroy(); this.overlay = null; if (run.season.bg !== this.bg.texture.key) this.drawBg(); this.showIntro(); }, { style: 'red', sub: `${next.n}월 · ${next.name}` }));
    if (this.first && run.charms.length < 2 && this.once('shop')) {
      /* 첫 장터: 지금 살 수 있는 부적 하나만 빛나게 (안내는 늘 성공하는 행동만) */
      const k = s.charms.findIndex((o, i) => !run.canBuyCharm(i));
      this.time.delayedCall(400, () => {
        this.say(k >= 0 ? '엽전으로 부적 하나 사 볼까요?\n점수를 키워 줘요 · 위 부적 자리에 들어가요' : '엽전이 모이면 부적을 살 수 있어요', W / 2, top + 86, { ms: 7000 });
        if (k >= 0 && this.shopCards && this.shopCards[k]) this.tutGlow = [this.tweens.add({ targets: this.shopCards[k], scale: { from: 1, to: 1.05 }, duration: 450, yoyo: true, repeat: -1 })];
      });
    }
  }
  pickCard(i) {
    const run = this.run, o = run.shop.tools[i], t = TOOL[o.id];
    const why = run.canBuyTool(i); if (why) { toast(this, why); return; }
    const picks = o.picks.filter(u => run.cards.some(c => c.uid === u));
    const m = modal(this, 1020, 820, { title: `${t.name} — 패 한 장 고르기`, titleSize: 40, depth: 4200 });
    m.add(txt(this, 0, -300, t.desc, 26, C.dim, { thick: 2, weight: '700', wrap: 900 }));
    picks.forEach((u, k) => {
      const c = run.card(u), x = (k - (picks.length - 1) / 2) * 190, cv = new CardView(this, x, 20, c, 0.5); m.add(cv);
      const bad = run.canBuyTool(i, u);
      if (bad) cv.setAlpha(0.45);
      cv.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        const r = run.buyTool(i, u); if (r.error) { toast(this, r.error); return; }
        audio.play('sfx_buy'); audio.buzz(15); burst(this, W / 2 + x, H / 2 + 20, 0.4, 4300);
        this.saveRun(); m.close(); this.refresh(); this.showShop();
        toast(this, o.id === 'erase' ? '덱에서 뺐어요' : o.id === 'seed' ? '같은 패가 한 장 늘었어요' : o.id === 'gold' ? '금박을 입혔어요' : '자개를 박았어요');
      });
    });
    m.add(txt(this, 0, 320, '바깥을 누르면 그만둬요 (엽전은 그대로)', 24, C.dim, { thick: 2, weight: '700' }));
  }

  // ── 막혔을 때: 이어하기 '한 손 더' (계절신 · 70% 이상 · 판당 2번) ──
  onFail() {
    const run = this.run, d = load();
    this.setButtons(false);
    const allowBM = bmOn() && run.canContinue() && d.plays >= 2;
    if (!allowBM) { this.finish(); return; }
    const nth = run.conts, gold = price(nth === 0 ? 'continue' : 'continue2'), ad = nth === 0 && adLeft();
    if (!gold && !ad) { this.finish(); return; }
    track('cont_offer', { gate: run.gate, pct: Math.round(run.score / run.target * 100), nth });
    const m = modal(this, 920, 900, { locked: true, depth: 4100 });
    const pct = Math.floor(run.score / run.target * 100);
    m.add(txt(this, 0, -340, '정말 아까워요!', 60, C.gold, { thick: 5 }));
    m.add(txt(this, 0, -260, `${run.god.name} 앞에서 ${pct}%까지 왔어요`, 36, C.ivory, { thick: 3, weight: '700' }));
    m.add(txt(this, 0, -200, `남은 ${fmt(run.target - run.score)}점 — 한 손이면 넘겠어요`, 34, C.pink, { thick: 3, weight: '700' }));
    const cd = txt(this, 0, -90, '8', 90, C.goldHi, { thick: 6 }); m.add(cd);
    let left = 8, done = false;
    const tick = this.time.addEvent({ delay: 1000, repeat: 7, callback: () => { left--; cd.setText(String(left)); if (left <= 0 && !done) { done = true; m.close(); this.finish(); } } });
    const take = async how => {
      if (done) return; done = true; tick.remove();
      const r = await buyContinue(nth, how);
      if (!r.ok) { done = false; if (r.reason !== 'cancel') toast(this, r.reason === 'short' ? '골드가 모자라요' : r.reason === 'login' ? '로그인하면 쓸 수 있어요' : '지금은 쓸 수 없어요'); return; }
      m.close(); run.continueHand(); this.saveRun(); audio.play('sfx_season'); this.floatText(W / 2, this.L.stY, '한 손 더!', 64, C.goldHi);
      this.setButtons(true); this.layoutHand(false, run.hand.filter(u => !this.views.has(u))); this.refresh();
    };
    let y = 60;
    if (ad) { m.add(button(this, 0, y, 640, 120, '광고 보고 한 손 더', () => take('ad'), { style: 'red', sub: owned() ? '소장 혜택 · 광고 없이' : '보상형 광고 1회' })); y += 140; }
    if (gold) { m.add(button(this, 0, y, 640, 120, `🪙 ${gold} 한 손 더`, () => take('gold'), { style: ad ? 'dark' : 'red', sub: '원어데이 골드' })); y += 140; }
    m.add(button(this, 0, y + 20, 400, 96, '여기까지 할게요', () => { if (done) return; done = true; tick.remove(); m.close(); this.finish(); }, { style: 'dark', size: 30 }));
  }

  // ── 판 끝 ──
  finish() {
    const run = this.run, d = load();
    if (this.finished) return; this.finished = true;
    if (run.phase !== 'won') { run.phase = 'over'; audio.play('sfx_fail', { volume: 0.6 }); }
    if (run.phase !== 'won') track('gate_end', { gate: run.gate, ok: 0, hands: run.playedN || 0, winds: (run.windsMax || 3) - run.winds, first: this.first ? 1 : 0, mode: run.mode });
    const isNewBook = recordBook(run);
    noteRunEnd(run);
    const petals = run.petals();
    d.petals += petals; d.plays++; if (run.phase === 'won') d.wins++;
    d.best = Math.max(d.best, run.total); d.bestMonth = Math.max(d.bestMonth, run.phase === 'won' ? 12 : run.cleared);
    if (run.mode === 'daily') { const t = today(); if (d.daily.date !== t) d.daily = { date: t, plays: 0, best: 0, won: false }; d.daily.plays++; d.daily.best = Math.max(d.daily.best, run.total); d.daily.won = d.daily.won || run.phase === 'won'; }
    const summary = { mode: run.mode, won: run.phase === 'won', cleared: run.cleared, gate: run.gate, total: run.total, best: run.best, petals, newBook: isNewBook, beaten: run.beaten.slice(), assisted: run.assisted, seed: run.seed, endGod: run.isBoss ? run.bosses[run.seasonI] : null, found: run.found.length };
    if (this.first && !d.firstDone) { d.firstDone = true; d.newMenus = true; }
    d.run = null; d.runOpen = false; save();
    track('run_end', { mode: run.mode, cleared: run.cleared, gates: run.cleared, won: run.phase === 'won' ? 1 : 0, total: run.total, conts: run.conts, first: this.first ? 1 : 0 });
    roundOver();
    const fin = { ...summary, line: null };
    this.time.delayedCall(run.phase === 'won' ? 200 : 700, () => this.scene.start('Result', { s: fin, run: run.toJSON() }));
  }

  // ── 메뉴 · 족보 표 · 덱 보기 ──
  menu() {
    const m = modal(this, 820, 900, { title: '잠깐 쉬기' });
    m.add(button(this, 0, -200, 560, 120, '계속하기', () => m.close(), { style: 'red' }));
    m.add(button(this, 0, -50, 560, 110, '족보 표', () => { m.close(); this.yakuTable(); }, { style: 'dark' }));
    const sLabel = () => audio.isOn() ? '소리 끄기' : '소리 켜기';
    const sb = button(this, 0, 90, 560, 110, sLabel(), () => { const on = !audio.isOn(); audio.setAll(on); sb.setLabel(sLabel()); }, { style: 'dark' }); m.add(sb);
    m.add(button(this, 0, 230, 560, 110, '처음 화면으로', () => { m.close(); this.saveRun(); track('run_quit', { gate: this.run.gate, phase: this.run.phase, sec: this.sec(), first: this.first ? 1 : 0, how: 'menu' }); const d = load(); d.runOpen = false; save(); this.scene.start('Home'); }, { style: 'dark' }));
    m.add(txt(this, 0, 340, '판은 저장돼요 · 처음 화면에서 「이어서 하기」', 26, C.dim, { thick: 2, weight: '700' }));
  }
  yakuTable() {
    track('yaku_open', { from: 'play', first: this.first ? 1 : 0 });
    const hh = Math.min(H - 100, 1820), m = modal(this, 1040, hh, { title: '족보 표', depth: 4300 });
    const ys = yakuOrder(), top = -hh / 2 + 150, gap = Math.min(78, (hh - 330) / ys.length);
    const found = load().book.yaku;
    m.add(txt(this, 0, top - 40, '같은 달이 많을수록 세요 · 위에서 아래로 갈수록 큰 족보', 24, C.pink, { thick: 2, weight: '700' }));
    ys.forEach((y, i) => yakuRow(this, m.box, 0, top + 20 + i * gap, y, found.includes(y.id), 980));
    m.add(txt(this, 0, top + 20 + ys.length * gap + 10, '꽃 점수 = (족보 점수 + 든 패의 패 점수) × 배수 · 패 점수: 광 20 · 열끗 12 · 띠 8 · 피 4', 22, C.dim, { thick: 2, weight: '700', wrap: 960 }));
  }
  deckView() {
    const run = this.run, m = modal(this, 1040, Math.min(H - 80, 1500), { title: `이번 판 덱 ${run.cards.length}장`, titleSize: 40 });
    const left = new Set(run.pile), wn = new Set(run.windNext);
    const cs = run.cards.slice().sort((a, b) => run.card(a.uid).month - run.card(b.uid).month);
    const per = 8, sc = 0.24, dx = 118, dy = 132, top = -Math.min(H - 80, 1500) / 2 + 170;
    cs.forEach((c, i) => {
      const x = ((i % per) - (per - 1) / 2) * dx, y = top + Math.floor(i / per) * dy;
      const im = this.add.image(x, y, 'card_' + c.id).setScale(sc); m.add(im);
      if (!left.has(c.uid)) im.setAlpha(0.3);
      if (c.gold) m.add(this.add.image(x, y, 'mark_gold').setScale(sc));
      if (c.pearl) m.add(this.add.image(x, y, 'mark_pearl').setScale(sc));
      if (wn.has(c.uid)) m.add(txt(this, x, y + 50, '바람', 18, C.jade, { thick: 3 }));
    });
    m.add(txt(this, 0, Math.min(H - 80, 1500) / 2 - 60, '흐린 패 = 이번 달에 이미 나온 패', 24, C.dim, { thick: 2, weight: '700' }));
  }

  // ── 첫 판 안내 (안내는 지금 실제로 성공하는 행동만 가리킴) ──
  say(msg, x, y, o = {}) {
    this.tutHide();
    const t = txt(this, 0, 0, msg, 32, '#2A1C10', { stroke: null, weight: '800', wrap: 760 });
    const w = Math.min(860, t.width + 70), h = t.height + 50;
    const c = this.add.container(x, y, [this.add.image(0, 0, boxTex(this, 'ivory', Math.round(w), Math.round(h), 26, 3)), t]).setDepth(4500);
    c.setScale(0.8).setAlpha(0); this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.out' });
    this.tweens.add({ targets: c, y: y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.bubble = c;
    if (o.ms) this.time.delayedCall(o.ms, () => { if (this.bubble === c) this.tutHide(); });
    return c;
  }
  tutHide() {
    if (this.bubble) { this.bubble.destroy(); this.bubble = null; }
    if (this.tutGlow) { this.tutGlow.forEach(t => t.remove()); this.tutGlow = null; for (const v of this.views.values()) v.glow.setAlpha(v.selected ? 1 : 0); this.playB.setScale(1); }
  }
  get first() { return this.run.mode === 'first'; }
  tY() { return this.L.stTop + 400; }   /* 안내 말풍선 자리: 미리보기 아래 · 손패 위 */
  // 첫 판 단계 공개: 한 번 보인 안내는 판 저장(run.seenTut)에 남아 이어서 해도 다시 안 나옴
  once(k) { const s = this.run.seenTut || (this.run.seenTut = {}); if (s[k]) return false; s[k] = 1; this.saveRun(); return true; }
  tstep(step) { if (!this.first) return; const s = this.run.seenTut || (this.run.seenTut = {}); if (s['st' + step]) return; s['st' + step] = 1; track('tut_step', { step, sec: this.sec() }); }
  sec() { return Math.round((Date.now() - (this.run.t0 || Date.now())) / 1000); }
  // 1월 첫 손: 빛나는 1월 세 장을 한 장씩 → 낱장 → 한 쌍 → 세 장 (계단)
  tutStart() {
    const run = this.run;
    if (!run.tutorial || run.gate !== 1 || run.playedN) return;
    const ms = run.hand.filter(u => run.card(u).month === run.month).slice(0, 3);
    if (ms.length < 2) return;
    this.tutStep = 1; this.tutPair = ms;
    this.say(`${run.month}월 패 ${ms.length}장이 빛나요.\n한 장씩 눌러 보세요`, W / 2, this.tY());
    this.tutGlow = ms.filter(u => this.views.get(u)).map(u => { const v = this.views.get(u); return this.tweens.add({ targets: v.glow, alpha: { from: 0.2, to: 0.9 }, duration: 500, yoyo: true, repeat: -1 }); });
  }
  tutCheck() {
    if (this.tutStep !== 1 || !this.tutPair) return;
    /* 안내한 패가 바람 등으로 손을 떠나면 안내를 접음 (없는 패를 가리키지 않음) */
    if (this.tutPair.some(u => !this.run.hand.includes(u) || !this.views.get(u))) { this.tutHide(); this.tutStep = 3; return; }
    const n = this.tutPair.filter(u => this.sel.includes(u)).length, all = this.tutPair.length;
    const glowRest = () => { if (this.tutGlow) this.tutGlow.forEach(t => t.remove()); this.tutGlow = this.tutPair.filter(u => !this.sel.includes(u)).map(u => this.tweens.add({ targets: this.views.get(u).glow, alpha: { from: 0.2, to: 0.9 }, duration: 500, yoyo: true, repeat: -1 })); };
    if (n === all) {
      this.tutHide(); this.tutStep = 2; this.tstep(1);
      for (const u of this.sel) this.viewOf(u).setSelected(true);
      this.say(`${this.run.preview(this.sel).yaku.name}!! 같은 달이 많을수록 점수가 커져요.\n「내기」를 눌러요`, W / 2, this.L.stTop - 40);
      this.tutGlow = [this.tweens.add({ targets: this.playB, scale: { from: 1, to: 1.06 }, duration: 450, yoyo: true, repeat: -1 })];
    } else if (n > 0 && this.bubble) {
      const y = this.run.preview(this.sel).yaku.name;
      this.say(n === 1 ? `${y} — 한 장 더 눌러 보세요` : `${y}! 점수가 커졌죠? 한 장 더`, W / 2, this.tY());
      glowRest();
    }
  }
  tutAfterPlay() {
    const run = this.run;
    if (this.tutStep === 2) { this.tutStep = 3; this.playB.setScale(1); }
    if (!this.first || run.phase !== 'play') return;
    // 1월: 짝 맞는 패가 없을 때만 '바꾸기' 한 줄 (다음 달 이야기는 아직 안 함)
    const best = run.hand.length ? this.bestYaku() : 'high';
    if (run.gate === 1 && best === 'high' && run.winds > 0 && this.once('wind1')) {
      this.say('맞는 짝이 없으면 「바람」으로 패를 바꿔요\n(바꿀 패를 골라 「바람」)', W / 2, this.tY(), { ms: 6000 });
    } else if (run.gate === 2 && this.once('wind2')) {
      this.say('다음 달(3월) 꽃을 「바람」에 실어 두면,\n다음 달 첫 손에 돌아와요', W / 2, this.tY(), { ms: 6000 });
    }
  }
  // 지금 손패에서 가장 센 족보 (같은 달 짝이 있나) — 엔진 미리보기만 씀
  bestYaku() {
    const run = this.run, h = run.hand, byM = {};
    for (const u of h) { const m = run.card(u).month; (byM[m] = byM[m] || []).push(u); }
    const grp = Object.values(byM).filter(g => g.length >= 2);
    return grp.length ? run.preview(grp[0]).yaku.id : 'high';
  }
  // 새 달 첫 손 안내: 2월 이달의 꽃 · 바람 패가 돌아옴
  tutDeal(back) {
    const run = this.run;
    if (!this.first) return;
    if (back && back.length && this.once('back')) { this.say(`지난달 「바람」에 실은 패 ${back.length}장이 돌아왔어요!`, W / 2, this.tY(), { ms: 4500 }); return; }
    if (run.gate === 2 && this.once('season2')) this.say('2월 꽃(매화)은 점수 2배!\n손에 있으면 같이 내 보세요', W / 2, this.tY(), { ms: 5000 });
  }
}
