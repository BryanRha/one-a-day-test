// 한 판(열두 달) 진행 엔진: 관문 · 손 · 바람 · 장터 · 이어하기 — 화면과 분리된 순수 로직 (봇 · 저장 · 화면이 같은 걸 씀)
//   상태는 전부 JSON 으로 저장됨 (앱이 게임을 닫아도 이어서)
import { Rng } from './rng.js?v=0.82.4';
import { CHARMS, CHARM, COST, RARITY_P } from './charms.js?v=0.82.4';
import { GODS, GOD } from './gods.js?v=0.82.4';

export const TUNE = {
  target: [260, 490, 880, 1580],   /* 계절마다 첫 관문 목표 (tools/bot.js 로 맞춤) */
  step: [1, 1.5, 2],                 /* 계절 안 관문: 작은 달 · 큰 달 · 계절신 */
  reward: [3, 4, 5], hands: 4, winds: 3, handSize: 8, maxPlay: 5, slots: 5, coins: 4,
  rerollBase: 2, minDeck: 32,
};
export const TOOLS = [
  { id: 'gold', name: '금박 붓', cost: 3, desc: '고른 패에 금박 — 점수에 들면 배수 +2' },
  { id: 'pearl', name: '자개 조각', cost: 3, desc: '고른 패에 자개 — 점수에 들면 점수 +20' },
  { id: 'erase', name: '먹 지우개', cost: 2, desc: '고른 패를 이번 판 덱에서 빼요 — 남은 패가 더 자주 와요' },
  { id: 'seed', name: '꽃씨', cost: 4, desc: '고른 패를 똑같이 한 장 더 덱에 넣어요' },
];
export const TOOL = Object.fromEntries(TOOLS.map(t => [t.id, t]));
// 꽃 덱: 판 시작 성격 (플레이로 모은 꽃잎으로만 열림 · 능력치 판매 아님)
export const DECKS = [
  { id: 'moon', name: '달빛 덱', desc: '기본 덱 · 손 4번 · 바람 3번', cost: 0 },
  { id: 'wind', name: '바람 덱', desc: '바람 4번 · 바람에 실은 패가 다음 달 첫 손에', cost: 40, winds: 1 },
  { id: 'gold', name: '금박 덱', desc: '금박 패 4장을 들고 시작', cost: 80, gold: 4 },
  { id: 'coin', name: '엽전 덱', desc: '엽전 10개로 시작 · 장터 새로 고침 1개 싸게', cost: 120, coins: 6, reroll: -1 },
  { id: 'bloom', name: '꽃바구니 덱', desc: '손패 9장 · 손 3번', cost: 160, handSize: 1, hands: -1 },
];
export const DECK_OPT = Object.fromEntries(DECKS.map(d => [d.id, d]));

export class Run {
  // opt: { seed, mode('daily'|'free'), variant(꽃 덱 id), today(오늘의 부적 id), cheer(응원 부적), tutorial }
  constructor(rules, opt) {
    this.rules = rules;
    if (!opt) return;
    const rng = new Rng(opt.seed);
    const deck = rules.deck, dv = DECK_OPT[opt.variant] || DECKS[0];
    Object.assign(this, {
      v: 1, seed: opt.seed, mode: opt.mode || 'free', variant: dv.id, tutorial: !!opt.tutorial, cheer: opt.cheer === true ? -1 : (Number.isInteger(opt.cheer) ? opt.cheer : null),
      gate: 1, phase: 'intro', coins: TUNE.coins + (dv.coins || 0), rerollCost: TUNE.rerollBase + (dv.reroll || 0),
      cards: deck.cards.map((c, i) => ({ uid: i + 1, id: c.id, gold: false, pearl: false })), nextUid: deck.cards.length + 1,
      charms: opt.today ? [{ id: opt.today, today: true, st: {} }] : [],
      windNext: [], hand: [], pile: [], score: 0, target: 0, hands: 0, winds: 0, handSize: 8, maxPlay: 5, used: [],
      conts: 0, assisted: opt.cheer != null && opt.cheer !== false, total: 0, best: 0, cleared: 0, beaten: [], found: [], seen: [], shop: null, last: null, rng: 0,
    });
    // 계절마다 계절신 하나 (같은 시드 = 같은 계절신)
    this.bosses = deck.seasons.map(s => { const pool = GODS.filter(g => s.months.includes(g.month)); return (pool.length ? rng.pick(pool) : rng.pick(GODS)).id; });
    if (dv.gold) rng.shuffle(this.cards.slice()).slice(0, dv.gold).forEach(c => { c.gold = true; });
    this.rng = rng.s;
  }
  static from(rules, json) { const r = new Run(rules); Object.assign(r, json); return r; }
  toJSON() { const o = { ...this }; delete o.rules; return o; }
  R() { const r = new Rng(1); r.s = this.rng; return r; }
  keep(r) { this.rng = r.s; }

  card(uid) { const c = this.cards.find(x => x.uid === uid); return c ? { ...this.rules.base[c.id], uid, gold: c.gold, pearl: c.pearl } : null; }
  get months() { return this.rules.deck.months; }
  get gates() { return this.months.length; }
  get month() { return this.months[this.gate - 1].n; }
  get seasonI() { return Math.max(0, this.rules.seasonIdx(this.month)); }
  get season() { return this.rules.deck.seasons[this.seasonI]; }
  get pos() { return this.season.months.indexOf(this.month); }
  get isBoss() { return this.pos === this.season.months.length - 1; }
  get god() { return this.isBoss ? GOD[this.bosses[this.seasonI]] : null; }
  get mod() { const g = this.god; return g ? g.mod : {}; }
  get dv() { return DECK_OPT[this.variant] || DECKS[0]; }
  gateTarget(gate = this.gate) {
    const m = this.months[gate - 1].n, si = Math.max(0, this.rules.seasonIdx(m)), s = this.rules.deck.seasons[si], pos = s.months.indexOf(m), boss = pos === s.months.length - 1;
    const g = boss ? GOD[this.bosses[si]] : null;
    let t = TUNE.target[Math.min(si, TUNE.target.length - 1)] * TUNE.step[Math.min(pos, 2)] * ((g && g.mod.target) || 1);
    if (boss && this.cheerOn(si)) t *= 0.9;
    if (this.tutorial && gate === 1) t = 300;   /* 첫 판 첫 달: 같은 달 짝 두 번이면 넘는 크기 (안내가 바람까지 닿게) */
    return Math.round(t / 10) * 10;
  }

  // 응원 부적: 막혔던 계절(번호)의 계절신 관문만 −10% (-1 = 모든 계절 — 시험용)
  cheerOn(si = this.seasonI) { return this.cheer != null && this.cheer !== false && (this.cheer === -1 || this.cheer === si); }

  // ── 관문 ──
  startGate() {
    const r = this.R(), mod = this.mod, dv = this.dv;
    this.target = this.gateTarget();
    this.hands = Math.max(1, TUNE.hands + (dv.hands || 0) + (mod.hands || 0));
    this.winds = TUNE.winds + (dv.winds || 0); if (mod.winds != null) this.winds = Math.min(this.winds, mod.winds);
    this.handSize = TUNE.handSize + (dv.handSize || 0) + (mod.handSize || 0);
    this.maxPlay = mod.maxPlay || TUNE.maxPlay;
    this.score = 0; this.used = []; this.last = null; this.playedN = 0;
    const back = this.windNext.filter(u => this.cards.some(c => c.uid === u));
    const rest = r.shuffle(this.cards.map(c => c.uid).filter(u => !back.includes(u)));
    if (this.tutorial && this.gate === 1) {
      /* 첫 판 첫 손: 이달(1월)의 꽃 두 장이 꼭 들어오게 → '같은 달 두 장' 안내가 늘 성공 */
      const m1 = rest.filter(u => this.card(u).month === this.month).slice(0, 2);
      for (const u of m1) rest.splice(rest.indexOf(u), 1);
      rest.splice(3, 0, ...m1);
    }
    this.pile = [...back, ...rest]; this.windNext = []; this.hand = [];
    this.draw(); this.keep(r);
    this.phase = 'play';
  }
  draw() { const got = []; while (this.hand.length < this.handSize && this.pile.length) { const u = this.pile.shift(); this.hand.push(u); got.push(u); } return got; }
  ctx(dry) { return { month: this.month, mod: this.mod, charms: this.charms, windsLeft: this.winds, handsLeft: this.hands, coins: this.coins, used: new Set(this.used), dry }; }
  preview(uids) { const cs = uids.map(u => this.card(u)).filter(Boolean); return cs.length ? this.rules.evaluate(cs, this.ctx(true)) : null; }
  // 낼 수 있나 (안 되면 이유 — 입력을 말없이 거절하지 않음)
  canPlay(uids) {
    if (this.phase !== 'play') return '지금은 낼 수 없어요';
    if (!uids.length) return '낼 패를 골라 주세요';
    if (uids.length > this.maxPlay) return `한 번에 ${this.maxPlay}장까지 낼 수 있어요`;
    if (this.hands <= 0) return '이번 달 손을 다 썼어요';
    return null;
  }
  canWind(uids) {
    if (this.phase !== 'play') return '지금은 바람을 쓸 수 없어요';
    if (this.winds <= 0) return '이번 달 바람을 다 썼어요';
    if (!uids.length) return '바람에 실을 패를 골라 주세요';
    if (uids.length > TUNE.maxPlay) return `바람에는 ${TUNE.maxPlay}장까지 실을 수 있어요`;
    return null;
  }
  play(uids) {
    const why = this.canPlay(uids); if (why) return { error: why };
    const cs = uids.map(u => this.card(u));
    const res = this.rules.evaluate(cs, this.ctx(false));
    this.score += res.total; this.total += res.total; this.best = Math.max(this.best, res.total);
    this.used.push(res.yaku.id); this.hands--; this.playedN = (this.playedN || 0) + 1;
    for (const y of [res.yaku, ...res.extras]) if (!this.found.includes(y.id)) this.found.push(y.id);
    for (const u of res.scoring) { const id = this.card(u).id; if (!this.seen.includes(id)) this.seen.push(id); }
    this.hand = this.hand.filter(u => !uids.includes(u));
    let gust = null;
    if (this.mod.gust && this.hand.length && this.gate < this.gates) { const r = this.R(); gust = this.hand[r.int(this.hand.length)]; this.keep(r); this.hand = this.hand.filter(u => u !== gust); this.windNext.push(gust); }
    const drawn = this.draw();
    this.last = { uids, total: res.total, yaku: res.yaku.id };
    if (this.score >= this.target) this.clear();
    else if (this.hands <= 0 || (!this.hand.length && !this.pile.length)) this.phase = 'fail';
    return { res, drawn, gust };
  }
  wind(uids) {
    const why = this.canWind(uids); if (why) return { error: why };
    this.winds--;
    this.hand = this.hand.filter(u => !uids.includes(u));
    if (this.gate < this.gates) this.windNext.push(...uids);
    const drawn = this.draw();
    /* 막힘 방지: 덱이 바닥나 손패가 비면 그 달은 여기까지 (손이 남아도 낼 패가 없음) */
    if (!this.hand.length && !this.pile.length) this.phase = 'fail';
    return { drawn };
  }
  clear() {
    this.phase = 'clear'; this.cleared = Math.max(this.cleared, this.gate);
    const g = this.god;
    if (g && !this.beaten.includes(g.id)) this.beaten.push(g.id);
    const rw = { base: TUNE.reward[Math.min(this.pos, 2)], hands: this.hands, interest: Math.min(5, Math.floor(this.coins / 5)), charms: 0, boss: (g && g.mod.bonus) || 0 };
    for (const ch of this.charms) { const d = CHARM[ch.id]; if (d && d.end) rw.charms += d.end; }
    rw.sum = rw.base + rw.hands + rw.interest + rw.charms + rw.boss;
    this.coins += rw.sum; this.reward = rw;
    if (this.gate >= this.gates) this.phase = 'won';
  }
  // 이어하기 '한 손 더' (+1 손) — 계절신 관문 · 목표 70% 이상 · 판당 2번 (화면에서 BM 확인 뒤 부름)
  canContinue() { return this.phase === 'fail' && this.isBoss && this.conts < 2 && this.score >= this.target * 0.7; }
  continueHand() { if (this.phase !== 'fail') return false; this.hands = 1; this.phase = 'play'; this.conts++; this.assisted = true; if (!this.hand.length) this.draw(); return true; }

  // ── 장터 ──
  openShop() {
    this.phase = 'shop';
    const r = this.R();
    this.shop = { charms: this.rollCharms(r), tools: r.shuffle(TOOLS.slice()).slice(0, 2).map(t => ({ id: t.id, cost: t.cost, sold: false, picks: this.rollPicks(r) })) };
    this.keep(r);
  }
  rollCharms(r) {
    const own = new Set(this.charms.map(c => c.id)), out = [];
    for (let i = 0; i < 3; i++) {
      const rar = r.weighted([1, 2, 3], k => RARITY_P[k]);
      const pool = CHARMS.filter(c => c.rarity === rar && !own.has(c.id) && !out.some(o => o.id === c.id));
      const pool2 = pool.length ? pool : CHARMS.filter(c => !own.has(c.id) && !out.some(o => o.id === c.id));
      if (!pool2.length) break;
      const c = r.pick(pool2); out.push({ id: c.id, cost: COST[c.rarity], sold: false });
    }
    return out;
  }
  rollPicks(r) { return r.shuffle(this.cards.map(c => c.uid)).slice(0, 5); }
  canBuyCharm(i) {
    const o = this.shop && this.shop.charms[i]; if (!o || o.sold) return '이미 샀어요';
    if (this.charms.length >= TUNE.slots) return '부적 칸이 가득 찼어요 — 부적을 눌러 팔 수 있어요';
    if (this.coins < o.cost) return `엽전이 ${o.cost - this.coins}개 모자라요`;
    return null;
  }
  buyCharm(i) { const why = this.canBuyCharm(i); if (why) return { error: why }; const o = this.shop.charms[i]; this.coins -= o.cost; o.sold = true; this.charms.push({ id: o.id, st: {} }); return { ok: true }; }
  canBuyTool(i, uid) {
    const o = this.shop && this.shop.tools[i]; if (!o || o.sold) return '이미 썼어요';
    if (this.coins < o.cost) return `엽전이 ${o.cost - this.coins}개 모자라요`;
    if (o.id === 'erase' && this.cards.length <= TUNE.minDeck) return `덱이 ${TUNE.minDeck}장보다 적어지면 안 돼요`;
    if (uid != null) { const c = this.cards.find(x => x.uid === uid); if (!c) return '그 패는 이제 덱에 없어요'; if (o.id === 'gold' && c.gold) return '이미 금박이 있어요'; if (o.id === 'pearl' && c.pearl) return '이미 자개가 있어요'; }
    return null;
  }
  buyTool(i, uid) {
    const why = this.canBuyTool(i, uid); if (why) return { error: why };
    const o = this.shop.tools[i], c = this.cards.find(x => x.uid === uid);
    this.coins -= o.cost; o.sold = true;
    if (o.id === 'gold') c.gold = true;
    else if (o.id === 'pearl') c.pearl = true;
    else if (o.id === 'erase') this.cards = this.cards.filter(x => x.uid !== uid);
    else if (o.id === 'seed') this.cards.push({ uid: this.nextUid++, id: c.id, gold: false, pearl: false });
    return { ok: true };
  }
  canReroll() { return this.coins < this.rerollCost ? `엽전이 ${this.rerollCost - this.coins}개 모자라요` : null; }
  reroll() { const why = this.canReroll(); if (why) return { error: why }; this.coins -= this.rerollCost; this.rerollCost++; const r = this.R(); this.shop.charms = this.rollCharms(r); this.keep(r); return { ok: true }; }
  sellValue(slot) { const c = this.charms[slot]; const d = c && CHARM[c.id]; return d && !c.today ? Math.max(1, Math.floor(COST[d.rarity] / 2)) : 0; }
  sell(slot) { const c = this.charms[slot]; if (!c) return { error: '부적이 없어요' }; if (c.today) return { error: '오늘의 부적은 팔 수 없어요' }; this.coins += this.sellValue(slot); this.charms.splice(slot, 1); return { ok: true }; }
  leaveShop() { this.shop = null; this.rerollCost = TUNE.rerollBase + (this.dv.reroll || 0); this.gate++; this.phase = 'intro'; }
  // 판이 끝났을 때 꽃잎 (판 밖 메타 재화 — 판 안 능력에는 영향 없음)
  petals() { const won = this.phase === 'won'; return this.cleared * 2 + this.beaten.length * 3 + (won ? 10 : 0); }
}
