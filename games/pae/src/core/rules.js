// 카드 규칙 엔진: 낸 패 → 족보 · 점수 단계(연출용) · 총점
//   덱(deck)의 데이터만 읽음 — 덱 파일을 바꿔도 이 파일은 그대로
//   점수 = (족보 점수 + 점수에 든 패의 패 점수) × (족보 배수 + 보탬) × 부적 곱
//   제철(이달의 꽃): 패 점수 ×2 · 배수 +1 / 금박: 배수 +2 / 자개: 점수 +20 / 겹 족보: 다른 갈래 족보가 함께 들면 그 배수를 더함
import { CHARM } from './charms.js?v=0.92.6';

export function makeRules(deck) {
  const seasonOf = m => { const i = deck.seasons.findIndex(s => s.months.includes(m)); return i >= 0 ? deck.seasons[i].id : null; };
  const seasonIdx = m => deck.seasons.findIndex(s => s.months.includes(m));
  const base = Object.fromEntries(deck.cards.map(c => [c.id, c]));
  const pts = c => deck.kinds[c.kind].pts * (c.kind === 'pi' ? c.pi : 1);
  const order = deck.months.map(m => m.n);

  // 족보 한 개 검사 → 점수에 드는 패 목록 | null
  function match(rule, cs) {
    if (rule.high) { if (!cs.length) return null; return [cs.reduce((a, b) => pts(b) > pts(a) ? b : a)]; }
    if (rule.kind || rule.ribbon || rule.tag) {
      const f = cs.filter(c => (!rule.kind || c.kind === rule.kind) && (!rule.ribbon || c.ribbon === rule.ribbon) && (!rule.tag || c.tags.includes(rule.tag)) && (!rule.without || !c.tags.includes(rule.without)));
      if (rule.without && cs.some(c => c.kind === rule.kind && c.tags.includes(rule.without))) return null;
      const n = rule.weight === 'pi' ? f.reduce((s, c) => s + (c.pi || 1), 0) : f.length;
      return n >= rule.count ? f : null;
    }
    if (rule.month) {
      const g = {}; for (const c of cs) (g[c.month] = g[c.month] || []).push(c);
      const groups = Object.values(g).sort((a, b) => b.length - a.length);
      const need = rule.month, used = [];
      for (let i = 0; i < need.length; i++) { if (!groups[i] || groups[i].length < need[i]) return null; used.push(...groups[i]); }
      return used;
    }
    if (rule.season) {
      const g = {}; for (const c of cs) { const s = seasonOf(c.month); (g[s] = g[s] || []).push(c); }
      const best = Object.values(g).sort((a, b) => b.length - a.length)[0];
      return best && best.length >= rule.season ? best : null;
    }
    if (rule.run) {
      const ms = [...new Set(cs.map(c => order.indexOf(c.month)))].sort((a, b) => a - b);
      let run = [ms[0]];
      for (let i = 1; i < ms.length; i++) { if (ms[i] === run[run.length - 1] + 1) run.push(ms[i]); else if (run.length < rule.run) run = [ms[i]]; else break; }
      if (run.length < rule.run) return null;
      return run.map(mi => cs.filter(c => c.month === order[mi]).reduce((a, b) => pts(b) > pts(a) ? b : a));
    }
    return null;
  }

  // 낸 패에서 성립하는 족보 전부 (갈래마다 가장 센 것 하나)
  function detect(cs, banned = null) {
    const out = [], fams = new Set();
    for (const y of deck.yaku) {
      if (fams.has(y.fam)) continue;
      if (banned && banned.has(y.id)) continue;
      const sc = match(y.rule, cs);
      if (sc) { out.push({ y, sc }); fams.add(y.fam); }
    }
    return out;
  }

  // ctx: { month, mod(계절신), charms:[{id, st}], windsLeft, handsLeft(이 손 포함), coins, used:Set(쓴 족보) }
  function evaluate(cs, ctx = {}) {
    const mod = ctx.mod || {};
    if (!cs.length) return null;
    const found = detect(cs, mod.once ? ctx.used : null);
    const cardPts = c => (mod.zeroKind === c.kind ? 0 : pts(c));
    const val = ({ y, sc }) => (y.chips + sc.reduce((s, c) => s + cardPts(c), 0)) * y.mult;
    found.sort((a, b) => val(b) - val(a));
    const main = found[0] || { y: deck.yaku.find(y => y.rule.high), sc: match({ high: 1 }, cs) };
    const extras = found.slice(1).filter(e => e.y.fam !== 'high' && e.y.fam !== main.y.fam);
    const scoringSet = new Set([...main.sc, ...extras.flatMap(e => e.sc)].map(c => c.uid));
    const scoring = cs.filter(c => scoringSet.has(c.uid));
    const steps = [];
    let chips = main.y.chips, mult = main.y.mult, x = 1;
    steps.push({ t: 'yaku', id: main.y.id, name: main.y.name, chips, mult });
    for (const e of extras) { mult += e.y.mult; steps.push({ t: 'extra', id: e.y.id, name: e.y.name, mult: e.y.mult }); }
    const fams = new Set([main.y.fam, ...extras.map(e => e.y.fam)]);
    const byMonth = {}; for (const c of cs) byMonth[c.month] = (byMonth[c.month] || 0) + 1;
    const nKind = {}; for (const k of Object.keys(deck.kinds)) nKind[k] = cs.filter(c => c.kind === k).length;
    const charms = (ctx.charms || []).map((ch, slot) => ({ def: CHARM[ch.id], st: ch.st || (ch.st = {}), slot })).filter(c => c.def);
    const X = { yaku: main.y.id, fams, sel: cs, scoring, month: ctx.month, seasonOf, windsLeft: ctx.windsLeft || 0, coins: ctx.coins || 0, lastHand: ctx.handsLeft === 1,
      maxMonth: Math.max(0, ...Object.values(byMonth)), distinctMonths: Object.keys(byMonth).length, nKind };
    const apply = (r, step) => { if (!r) return false; if (r.chips) { chips += r.chips; step.chips = r.chips; } if (r.mult) { mult += r.mult; step.mult = r.mult; } if (r.x && r.x !== 1) { x *= r.x; step.x = r.x; } return true; };
    for (const c of scoring) {
      const inSeason = !mod.noSeason && c.month === ctx.month;
      const p = cardPts(c) * (inSeason ? 2 : 1) + (c.pearl ? 20 : 0);
      const m = (inSeason ? 1 : 0) + (c.gold ? 2 : 0);
      chips += p; mult += m;
      steps.push({ t: 'card', uid: c.uid, chips: p, mult: m, season: inSeason, gold: !!c.gold, pearl: !!c.pearl });
      for (const ch of charms) if (ch.def.card) { const st = { t: 'charm', slot: ch.slot, id: ch.def.id, uid: c.uid }; if (apply(ch.def.card(c, X), st)) steps.push(st); }
    }
    for (const ch of charms) if (ch.def.hand) { const st = { t: 'charm', slot: ch.slot, id: ch.def.id }; if (apply(ch.def.hand(X, ctx.dry ? { ...ch.st } : ch.st), st)) steps.push(st); }
    const total = Math.floor(chips * mult * x);
    return { yaku: main.y, extras: extras.map(e => e.y), scoring: scoring.map(c => c.uid), chips, mult, x, total, steps };
  }

  return { deck, base, pts, seasonOf, seasonIdx, match, detect, evaluate };
}
