// 도감: 족보 · 계절신 12 · 부적(장터 등장 확률 공개) · 패 48장 — 판마다 조금씩 채워짐
import { W, H, C } from '../config.js?v=0.91.4';
import { load } from '../save.js?v=0.91.4';
import { txt, button, roundButton, boxTex } from '../ui.js?v=0.91.4';
import { DECK, yakuOrder } from '../meta.js?v=0.91.4';
import { yakuRow } from '../yakuview.js?v=0.91.4';
import { GODS } from '../core/gods.js?v=0.91.4';
import { CHARMS, RARITY_P, RARITY_NAME, COST } from '../core/charms.js?v=0.91.4';

const TABS = [['yaku', '족보'], ['gods', '계절신'], ['charms', '부적'], ['cards', '패']];

export class BookScene extends Phaser.Scene {
  constructor() { super('Book'); }
  init(data) { this.tab = (data && data.tab) || 'yaku'; }
  create() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a0809, 1);
    const bg = this.add.image(W / 2, H / 2, 'bg_winter'); bg.setScale(Math.max(W / bg.width, H / bg.height)).setAlpha(0.45);
    roundButton(this, 70, 70, 44, '‹', () => this.scene.start('Home'), { size: 60 });
    txt(this, W / 2, 70, '도감', 56, C.gold, { thick: 4, ls: 8 });
    const b = load().book;
    const cnt = { yaku: [b.yaku.length, DECK.yaku.length], gods: [b.gods.length, GODS.length], charms: [b.charms.length, CHARMS.length], cards: [b.cards.length, DECK.cards.length] };
    TABS.forEach(([id, name], i) => { const x = W / 2 + (i - 1.5) * 250; button(this, x, 180, 230, 92, `${name} ${cnt[id][0]}/${cnt[id][1]}`, () => this.scene.restart({ tab: id }), { style: id === this.tab ? 'gold' : 'dark', size: 28 }); });
    this.body = this.add.container(0, 260);
    this[this.tab](b);
  }
  onBack() { this.scene.start('Home'); return true; }
  yaku(b) {
    const ys = yakuOrder(), gap = Math.min(80, (H - 420) / ys.length);
    ys.forEach((y, i) => {
      const yy = 40 + i * gap, got = b.yaku.includes(y.id);
      this.body.add(this.add.image(W / 2, yy, boxTex(this, got ? 'dark' : 'panel', 1020, Math.round(gap - 8), 16, 2)).setAlpha(got ? 1 : 0.6));
      yakuRow(this, this.body, W / 2, yy, y, got, 1000);
    });
    this.body.add(txt(this, W / 2, 40 + ys.length * gap + 4, '금빛 이름 = 낸 적 있는 족보 · 패 점수: 광 20 · 열끗 12 · 띠 8 · 피 4', 22, C.dim, { thick: 2, weight: '700' }));
  }
  gods(b) {
    GODS.forEach((g, i) => {
      const x = W / 2 + ((i % 3) - 1) * 330, y = 170 + Math.floor(i / 3) * 360, got = b.gods.includes(g.id);
      const im = this.add.image(x, y, 'godc_' + g.id).setScale(260 / 640); this.body.add(im);
      if (!got) im.setTint(0x222222).setAlpha(0.7);
      this.body.add(this.add.circle(x, y, 132).setStrokeStyle(4, got ? 0xe8c27a : 0x4a3f33));
      this.body.add(txt(this, x, y + 154, got ? g.name : `${g.month}월의 신 · ?`, 28, got ? C.gold : C.dim, { thick: 3 }));
      if (got) this.body.add(txt(this, x, y + 186, g.rule, 18, C.ivory, { thick: 2, weight: '700', wrap: 300 }));
    });
  }
  charms(b) {
    const p = Object.entries(RARITY_P).map(([k, v]) => `${RARITY_NAME[k]} ${Math.round(v * 100)}% (엽전 ${COST[k]})`).join(' · ');
    this.body.add(txt(this, W / 2, 10, `장터 등장 확률: ${p}`, 24, C.pink, { thick: 2, weight: '700', wrap: 980 }));
    this.body.add(txt(this, W / 2, 46, '부적은 판 안 엽전으로만 사요 · 골드로 팔지 않아요', 22, C.dim, { thick: 2, weight: '700' }));
    CHARMS.forEach((c, i) => {
      const x = W / 2 + ((i % 3) - 1) * 340, y = 130 + Math.floor(i / 3) * 150, got = b.charms.includes(c.id);
      this.body.add(this.add.image(x, y, boxTex(this, 'dark', 320, 136, 18, 2)).setAlpha(got ? 1 : 0.5));
      this.body.add(txt(this, x - 120, y, c.glyph, 52, got ? c.color : '#4A4038', { stroke: null, weight: '900' }));
      this.body.add(txt(this, x - 70, y - 34, got ? c.name : '?', 26, got ? C.gold : C.dim, { ox: 0, thick: 3 }));
      this.body.add(txt(this, x - 70, y + 16, got ? c.desc : RARITY_NAME[c.rarity], 17, got ? C.ivory : '#7A6F60', { ox: 0, thick: 2, weight: '700', wrap: 220, align: 'left' }));
    });
  }
  cards(b) {
    const per = 8, sc = 0.25, dx = 124, dy = 146;
    DECK.cards.forEach((c, i) => {
      const x = W / 2 + ((i % per) - (per - 1) / 2) * dx, y = 90 + Math.floor(i / per) * dy, got = b.cards.includes(c.id);
      const im = this.add.image(x, y, 'card_' + c.id).setScale(sc); this.body.add(im);
      if (!got) im.setTint(0x555555).setAlpha(0.55);
    });
    this.body.add(txt(this, W / 2, 90 + 6 * dy, '점수에 들었던 패가 밝게 빛나요', 24, C.dim, { thick: 2, weight: '700' }));
  }
}
