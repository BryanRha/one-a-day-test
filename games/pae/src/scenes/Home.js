// 첫 화면: 오늘의 패(화투점) 한 장 뒤집기 · 오늘의 판 / 자유 판 / 이어서 · 도감 · 꽃 덱 · 꾸미기 · 소리
import { W, H, C, TITLE, VERSION } from '../config.js?v=0.86.0';
import { load, save } from '../save.js?v=0.86.0';
import { audio } from '../audio.js?v=0.86.0';
import { txt, button, roundButton, modal, toast, boxTex, fmt } from '../ui.js?v=0.86.0';
import { CardView } from '../cards.js?v=0.86.0';
import { DECK, rules, fortuneCard, dailySeed, todayCharm, today, helpDue, helpGiven } from '../meta.js?v=0.86.0';
import { DECKS, Run } from '../core/run.js?v=0.86.0';
import { CHARM, CHEER } from '../core/charms.js?v=0.86.0';
import { GOD } from '../core/gods.js?v=0.86.0';
import { bmOn, owned, BACKS, backShown, backOpen, buyBack, effBack, price, fortuneSeed, helpOn, track } from '../bmflow.js?v=0.86.0';
import { inOAD, exitToOAD } from '../oad.js?v=0.86.0';

export class HomeScene extends Phaser.Scene {
  constructor() { super('Home'); }
  init(data) { this.go = data && (data.again ? 'free' : data.go) || null; }
  create() {
    const d = load();
    this.busy = false;
    const bg = this.add.image(W / 2, H / 2, 'key_art'); bg.setScale(Math.max(W / bg.width, H / bg.height));
    const sh = this.add.graphics(); sh.fillGradientStyle(0x0a0809, 0x0a0809, 0x0a0809, 0x0a0809, 0.0, 0.0, 0.92, 0.92); sh.fillRect(0, H * 0.42, W, H * 0.58);
    sh.fillStyle(0x0a0809, 0.35); sh.fillRect(0, 0, W, H);
    this.add.particles(0, 0, 'fx_petal', { x: { min: 0, max: W }, y: -30, lifespan: 15000, speedY: { min: 40, max: 80 }, speedX: { min: -20, max: 40 }, scale: { min: 0.5, max: 1 }, rotate: { start: 0, end: 360 }, alpha: { start: 0.9, end: 0.2 }, frequency: 900 });
    audio.music('bgm_main', this);

    // 제목
    const top = Math.max(150, H * 0.1);
    txt(this, W / 2, top, TITLE, 132, C.gold, { thick: 0, stroke: null, shadow: true, ls: 10, weight: '900' });
    txt(this, W / 2, top + 98, '열두 달 꽃패 · 하루 한 판', 34, C.ivory, { thick: 0, stroke: null, weight: '700', ls: 4 }).setAlpha(0.85);
    // 꽃잎 · 설정
    const pet = this.add.container(40, 60);
    pet.add(this.add.image(0, 0, 'fx_petal').setScale(1.3).setOrigin(0, 0.5));
    this.petT = txt(this, 66, 0, fmt(d.petals), 38, C.pink, { ox: 0, thick: 4 }); pet.add(this.petT);
    roundButton(this, W - 70, 70, 44, '⚙', () => this.settings(), { size: 40 });

    // 오늘의 패 (화투점)
    const fc = fortuneCard(fortuneSeed());
    const cy = H * 0.43;
    this.fc = fc;
    const card = new CardView(this, W / 2, cy, { ...fc.card, uid: 0 }, 0.62, 'cardback_' + effBack());
    const seen = d.fortuneSeen === today();
    card.setBack(!seen);
    const label = txt(this, W / 2, cy - 200, '오늘의 패', 34, C.gold, { thick: 4, ls: 6 });
    const reading = this.add.container(W / 2, cy + 230);
    const showReading = () => {
      reading.removeAll(true);
      const m = DECK.months.find(x => x.n === fc.card.month);
      reading.add(txt(this, 0, 0, `${fc.card.month}월 ${m.name} · ${fc.title}`, 44, C.goldHi, { thick: 5 }));
      reading.add(txt(this, 0, 62, fc.line, 32, C.ivory, { wrap: 880, thick: 4, weight: '700' }));
      reading.add(txt(this, 0, 122, fc.kind, 26, C.dim, { thick: 3, weight: '700' }));
    };
    if (seen) showReading();
    else {
      reading.add(txt(this, 0, 10, '패를 눌러 오늘의 운을 떼 보세요', 34, C.ivory, { thick: 4, weight: '700' }));
      this.tweens.add({ targets: card, y: cy - 10, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    card.setInteractive({ useHandCursor: true }).on('pointerup', () => {
      if (!card.faceUp) {
        this.tweens.killTweensOf(card); card.y = cy;
        card.flip(true).then(() => { audio.play('sfx_season'); audio.buzz(15); showReading(); });
        d.fortuneSeen = today(); save(); track('fortune_flip', { m: fc.card.month });
      } else this.tweens.add({ targets: card, angle: { from: -3, to: 3 }, duration: 80, yoyo: true, repeat: 1, onComplete: () => { card.angle = 0; } });
    });
    label.setDepth(2);

    // 버튼 — 첫 방문은 「첫 판」 하나만 크게, 나머지는 흐리게(누르면 이유)
    const by = H - 560;
    const seed = dailySeed(fortuneSeed()), tc = CHARM[todayCharm(seed)];
    const saved = d.run && d.run.phase !== 'won' && d.run.phase !== 'over' ? d.run : null;
    const firstDone = !!(d.firstDone || d.plays > 0), lock = '첫 판을 마치면 열려요';
    if (!d.homeFirst) { d.homeFirst = true; save(); track('home_first', { fortune: fortuneSeed() ? 1 : 0 }); }
    const seenNew = d.seenNew || (d.seenNew = {});
    const dot = (c, key, w) => { if (!d.newMenus || seenNew[key]) return; const t = txt(this, w / 2 - 20, -c.height / 2 + 6, '새로', 22, '#FFFFFF', { stroke: null }).setBackgroundColor('#D9406A').setPadding(10, 4).setOrigin(1, 0.5); c.add(t); c.once('pointerup', () => { seenNew[key] = 1; save(); }); };
    let y = by;
    if (saved) {
      const nm = saved.mode === 'daily' ? '오늘의 판' : saved.mode === 'first' ? '첫 판' : '자유 판';
      button(this, W / 2, y, 760, 132, '이어서 하기', () => this.resume(), { style: 'gold', sub: `${saved.gate}월 · ${nm}` });
      y += 150;
    }
    if (!firstDone) {
      if (!saved) txt(this, W / 2, y - 110, '같은 달 꽃패를 모아 내면 점수!\n목표를 넘기면 다음 달로 · 12월까지', 32, C.ivory, { thick: 4, weight: '800' });
      if (!saved) button(this, W / 2, y, 760, 140, '첫 판 시작', () => this.start('first'), { style: 'red', sub: '1월부터 · 연습 · 순위 밖' });
      y += saved ? 0 : 160;
      const b1 = button(this, W / 2 - 195, y, 370, 100, '오늘의 판', () => {}, { style: 'dark', size: 32 }); b1.setEnabled(false, lock);
      const b2 = button(this, W / 2 + 195, y, 370, 100, '자유 판', () => {}, { style: 'dark', size: 32 }); b2.setEnabled(false, lock);
    } else {
      const b1 = button(this, W / 2, y, 760, 132, '오늘의 판', () => this.start('daily'), { style: 'red', sub: `오늘 모두 같은 패 · 오늘의 부적 「${tc.name}」` }); dot(b1, 'daily', 760);
      const b2 = button(this, W / 2, y + 150, 760, 112, '자유 판', () => this.start('free'), { style: 'dark', sub: '매번 새 패 · 응원 선물 있음' }); dot(b2, 'free', 760);
    }
    // 아래 줄
    const ry = H - 130, gap = 190;
    const r1 = roundButton(this, W / 2 - gap * 1.5, ry, 54, '書', () => this.scene.start('Book'), { label: '도감', size: 44 });
    const r2 = roundButton(this, W / 2 - gap * 0.5, ry, 54, '牌', () => this.decks(), { label: '꽃 덱', size: 44 });
    const r3 = roundButton(this, W / 2 + gap * 0.5, ry, 54, '飾', () => this.looks(), { label: '꾸미기', size: 44 });
    roundButton(this, W / 2 + gap * 1.5, ry, 54, '?', () => this.howto(), { label: '놀이법', size: 46 });
    [[r1, 'book'], [r2, 'deck'], [r3, 'look']].forEach(([r, k]) => { if (!firstDone) r.setEnabled(false, lock); else dot(r, k, 108); });
    txt(this, W - 20, H - 18, `v${VERSION}`, 20, '#6B6052', { ox: 1, oy: 1, thick: 0, stroke: null, weight: '700' });
    if (this.go) { const g = this.go; this.go = null; this.time.delayedCall(60, () => this.start(g)); }
  }
  onBack() { return false; }

  resume() {
    const d = load();
    try { const run = Run.from(rules, d.run); this.scene.start('Play', { run }); }
    catch (e) { console.warn(e); d.run = null; save(); toast(this, '저장된 판을 열 수 없어 새로 시작해요'); }
  }
  start(mode) {
    if (this.busy) return;
    const d = load();
    const go = (cheer = null) => {
      const seed = mode === 'daily' ? dailySeed(fortuneSeed()) : (Math.random() * 2 ** 32) >>> 0;
      const run = new Run(rules, { seed, mode, variant: mode === 'first' ? 'moon' : d.variant, today: todayCharm(mode === 'daily' ? seed : dailySeed(fortuneSeed())), cheer, tutorial: mode === 'first' });
      d.run = run.toJSON(); save();
      this.scene.start('Play', { run, fresh: true });
    };
    const confirmNew = d.run && d.run.phase !== 'won' && d.run.phase !== 'over';
    const next = () => {
      // 응원 부적: 자유 판에서만 (오늘의 판은 같은 시드 순위라 도움 끔)
      const due = mode === 'free' && helpDue();
      if (due) track('help_eligible', { on: helpOn() ? 1 : 0 });
      if (due && helpOn()) return this.offerCheer(go);
      go(null);
    };
    if (confirmNew) {
      const m = modal(this, 860, 460, { title: '새 판을 시작할까요?' });
      m.add(txt(this, 0, -40, `하던 판(${d.run.gate}월)은 사라져요`, 36, C.ivory, { weight: '700', thick: 3 }));
      m.add(button(this, -190, 120, 340, 110, '이어서 하기', () => { m.close(); this.resume(); }, { style: 'dark' }));
      m.add(button(this, 190, 120, 340, 110, '새로 시작', () => { m.close(); d.run = null; save(); next(); }, { style: 'red' }));
      return;
    }
    next();
  }
  offerCheer(go) {
    const h = load().help;
    track('help_offer', { god: h.fails.god });
    const m = modal(this, 900, 820, { title: '응원 선물', locked: true });
    m.add(this.add.image(0, -170, 'talisman').setScale(0.26).setTint(0xffd0dc));
    m.add(txt(this, 0, -166, CHEER.glyph, 60, '#B01E1E', { stroke: '#F6D88A', thick: 2 }));
    m.add(txt(this, 0, 40, `${GOD[h.fails.god] ? GOD[h.fails.god].name : '계절신'} 앞에서 세 번이나 버텼어요.\n원어데이가 챙겨 드릴게요`, 36, C.ivory, { weight: '700', thick: 3 }));
    m.add(txt(this, 0, 150, `「${CHEER.name}」 ${CHEER.desc}`, 30, C.pink, { thick: 3, wrap: 780 }));
    const si = rules.seasonIdx(GOD[h.fails.god] ? GOD[h.fails.god].month : 12);
    m.add(button(this, -200, 300, 360, 110, '혼자 해 볼게요', () => { track('help_decline', {}); m.close(); go(null); }, { style: 'dark' }));
    m.add(button(this, 200, 300, 360, 110, '받을게요', () => { track('help_take', {}); helpGiven(); m.close(); go(si); }, { style: 'red' }));
  }

  decks() {
    const d = load(), m = modal(this, 940, 1240, { title: '꽃 덱' });
    m.add(txt(this, 0, -520, `꽃잎 ${fmt(d.petals)} · 판을 끝낼 때마다 모여요 (능력이 아니라 '고를 거리'가 늘어요)`, 26, C.dim, { weight: '700', thick: 3, wrap: 820 }));
    DECKS.forEach((dk, i) => {
      const y = -380 + i * 190, open = !!d.decks[dk.id], sel = d.variant === dk.id;
      m.add(this.add.image(0, y, boxTex(this, sel ? 'ivory' : 'dark', 820, 170, 26, 3)));
      m.add(txt(this, -380, y - 32, dk.name, 40, sel ? '#3A1E08' : C.gold, { ox: 0, stroke: null }));
      m.add(txt(this, -380, y + 28, dk.desc, 26, sel ? '#5A3A18' : C.ivory, { ox: 0, stroke: null, weight: '700', wrap: 480 }));
      const act = open ? (sel ? '쓰는 중' : '고르기') : `꽃잎 ${dk.cost}`;
      const b = button(this, 290, y, 210, 96, act, () => {
        if (open) { d.variant = dk.id; save(); m.close(); this.decks(); return; }
        d.petals -= dk.cost; d.decks[dk.id] = true; d.variant = dk.id; save(); audio.play('sfx_buy'); m.close(); this.petT.setText(fmt(d.petals)); this.decks();
      }, { style: open ? (sel ? 'gold' : 'dark') : 'red', size: 32 });
      if (!open && d.petals < dk.cost) b.setEnabled(false, `꽃잎이 ${dk.cost - d.petals}장 모자라요 — 판을 끝낼 때마다 모여요`);
      if (sel) b.setEnabled(false, '지금 쓰는 덱이에요');
      m.add(b);
    });
  }
  looks() {
    const d = load(), m = modal(this, 940, 1000, { title: '꾸미기 · 패 뒷면' });
    const list = BACKS.filter(backShown);
    list.forEach((b, i) => {
      const x = (i - (list.length - 1) / 2) * 280, y = -80, open = backOpen(b), sel = effBack() === b.id;
      const img = this.add.image(x, y, 'cardback_' + b.id).setScale(0.6);
      m.add(img);
      if (sel) m.add(this.add.image(x, y, 'card_glow').setScale(0.6));
      m.add(txt(this, x, y + 180, b.name, 32, C.gold, { thick: 3 }));
      let lab = sel ? '쓰는 중' : open ? '고르기' : b.owner ? '소장자 전용' : `🪙 ${price(b.sku) || '-'}`;
      const bt = button(this, x, y + 260, 240, 90, lab, async () => {
        if (open) { d.back = b.id; save(); m.close(); this.scene.restart(); return; }
        const r = await buyBack(b);
        if (r.ok) { d.back = b.id; save(); audio.play('sfx_buy'); m.close(); this.scene.restart(); }
        else if (r.reason !== 'cancel') toast(this, r.reason === 'short' ? '골드가 모자라요' : r.reason === 'login' ? '로그인하면 살 수 있어요' : '지금은 살 수 없어요');
      }, { style: open ? 'dark' : 'gold', size: 28 });
      if (sel) bt.setEnabled(false, '지금 쓰는 뒷면이에요');
      if (!open && b.owner) bt.setEnabled(false, '원어데이에서 「오늘의 패」를 소장하면 열려요');
      if (!open && b.sku && !price(b.sku)) bt.setEnabled(false, '지금은 살 수 없어요');
      m.add(bt);
    });
    m.add(txt(this, 0, 400, '꾸미기는 모양만 바뀌어요 · 점수와 판정은 똑같아요', 26, C.dim, { weight: '700', thick: 3 }));
    if (!bmOn()) m.add(txt(this, 0, 300, '원어데이 앱에서 더 많은 꾸미기를 고를 수 있어요', 26, C.dim, { weight: '700', thick: 3 }));
  }
  settings() {
    const d = load(), m = modal(this, 820, 820, { title: '설정' });
    const row = (y, label, get, toggle) => {
      m.add(txt(this, -300, y, label, 38, C.ivory, { ox: 0, weight: '700' }));
      const b = button(this, 230, y, 200, 90, get() ? '켬' : '끔', () => { toggle(); b.setLabel(get() ? '켬' : '끔'); }, { style: get() ? 'jade' : 'dark', size: 34 });
      m.add(b);
    };
    row(-200, '효과음', () => load().sfx, () => audio.toggleSfx());
    row(-80, '배경음', () => load().music, () => audio.toggleMusic());
    row(40, '진동', () => load().vib !== false, () => { d.vib = d.vib === false; save(); });
    if (inOAD) m.add(button(this, 0, 230, 520, 100, '원어데이로', () => exitToOAD(), { style: 'dark', size: 34 }));
    m.add(txt(this, 0, 340, `오늘의 패 v${VERSION} · 혼자 하는 점수 퍼즐 (판돈 · 대결 없음)`, 22, C.dim, { weight: '700', thick: 2 }));
  }
  howto() {
    const d = load(); track('howto_open', { from: 'home', first: d.firstDone ? 0 : 1 });
    const hh = 1240, m = modal(this, 980, hh, { title: '놀이법' });
    const top = -hh / 2 + 150, P = (y, h) => m.add(this.add.image(0, y, boxTex(this, 'dark', 900, h, 26, 2)));
    // ① 같은 달 계단
    P(top + 200, 380);
    m.add(txt(this, -420, top + 50, '① 같은 달을 모을수록 점수가 커져요', 32, C.gold, { ox: 0 }));
    const m1 = DECK.cards.filter(c => c.month === 1).slice(0, 3);
    [1, 2, 3].forEach((n, k) => {
      const cs = m1.slice(0, n).map((c, i) => ({ ...c, uid: i + 1 })), r = rules.evaluate(cs, { month: 1 });
      const x = -280 + k * 280;
      cs.forEach((c, i) => m.add(this.add.image(x + (i - (n - 1) / 2) * 44, top + 190, 'card_' + c.id).setScale(0.3).setAngle((i - (n - 1) / 2) * 6)));
      m.add(txt(this, x, top + 310, `${r.yaku.name}  ${fmt(r.total)}`, 30, k === 2 ? C.goldHi : C.ivory, { thick: 3 }));
      if (k < 2) m.add(txt(this, x + 140, top + 190, '→', 44, C.pink, { stroke: null }));
    });
    // ② 목표 · 열두 달
    P(top + 520, 220);
    m.add(txt(this, -420, top + 450, '② 한 달에 4번 내요. 목표를 넘기면 다음 달로', 30, C.gold, { ox: 0 }));
    for (let i = 0; i < 12; i++) { const x = -385 + i * 70; m.add(this.add.circle(x, top + 545, 26, i < 3 ? 0xB3262B : 0x3A302A).setStrokeStyle(2, 0xE8C27A)); m.add(txt(this, x, top + 545, String(i + 1), 24, C.ivory, { stroke: null })); }
    m.add(txt(this, 0, top + 600, '1월부터 12월까지 · 3 · 6 · 9 · 12월엔 계절신이 규칙 하나를 바꿔요', 22, C.dim, { thick: 2, weight: '700' }));
    // ③ 바람
    P(top + 790, 260);
    m.add(txt(this, -420, top + 700, '③ 짝이 없으면 「바람」으로 패 바꾸기', 30, C.gold, { ox: 0 }));
    m.add(txt(this, -420, top + 790, '바꾼 패는 사라지지 않고 다음 달 첫 손에 돌아와요.\n다음 달 꽃을 미리 보내 두면 그 달에 점수 2배!', 26, C.ivory, { ox: 0, thick: 2, weight: '700', align: 'left', wrap: 820 }));
    const by = Math.min(top + 990, hh / 2 - 90);
    m.add(button(this, -230, by, 420, 104, '더 알아보기', () => { m.close(); this.howtoMore(); }, { style: 'dark', size: 32 }));
    m.add(button(this, 230, by, 420, 104, '족보 표 보기', () => { m.close(); this.scene.start('Book', { tab: 'yaku' }); }, { style: 'gold', size: 32 }));
  }
  howtoMore() {
    const m = modal(this, 960, 1560, { title: '더 알아보기' });
    const lines = [
      ['꽃 점수', '(족보 점수 + 든 패의 패 점수) × 배수. 패 점수: 광 20 · 열끗 12 · 띠 8 · 피 4'],
      ['이달의 꽃', '그 달의 꽃 패는 패 점수 2배 · 배수 +1'],
      ['겹 족보', '다른 갈래 족보가 함께 들면 배수를 더해요 (예: 홍단 + 한 쌍)'],
      ['부적', '부적 자리 다섯 칸 · 첫 칸은 오늘의 부적. 장터에서 엽전으로 사요'],
      ['장터 · 엽전', '달을 넘길 때마다 열려요. 엽전은 판 안에서만 쓰고 판이 끝나면 사라져요'],
      ['계절신', '3 · 6 · 9 · 12월 · 그 달만 규칙 하나가 바뀌어요'],
      ['비슷한 놀이', '포커의 원페어 · 트리플과 비슷해요 — 같은 달이 많을수록 세요'],
    ];
    lines.forEach(([h, t], i) => { const y = -580 + i * 165; m.add(txt(this, -400, y, h, 36, C.gold, { ox: 0 })); m.add(txt(this, -400, y + 56, t, 27, C.ivory, { ox: 0, weight: '700', wrap: 800, align: 'left' })); });
  }
}
