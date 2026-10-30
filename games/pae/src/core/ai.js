// 봇 두뇌 (밸런스 봇 · 화면 시험이 같이 씀) — skill 0(처음 해 보는 사람) ~ 1(숙련)
import { CHARM } from './charms.js?v=0.95.2';

// 손패에서 낼 수 있는 모든 조합 (최대 maxPlay 장) → 점수 큰 순
export function plays(run) {
  const h = run.hand, n = h.length, out = [];
  const rec = (start, pick) => {
    if (pick.length) { const r = run.preview(pick); out.push({ uids: pick.slice(), total: r.total, yaku: r.yaku.id }); }
    if (pick.length >= run.maxPlay) return;
    for (let i = start; i < n; i++) { pick.push(h[i]); rec(i + 1, pick); pick.pop(); }
  };
  rec(0, []);
  return out.sort((a, b) => b.total - a.total || a.uids.length - b.uids.length);
}

// 남길 가치 (바람에 실을 패 고르기)
function keepVal(run, u) {
  const c = run.card(u), hand = run.hand.map(x => run.card(x));
  let v = 0;
  v += (hand.filter(x => x.month === c.month).length - 1) * 3;
  if (c.kind === 'gwang') v += 4;
  if (c.ribbon && hand.filter(x => x.ribbon === c.ribbon).length >= 2) v += 3;
  if (c.tags.includes('bird') && hand.filter(x => x.tags.includes('bird')).length >= 2) v += 3;
  if (c.month === run.month) v += 3;
  if (c.gold || c.pearl) v += 2;
  for (const ch of run.charms) { const d = CHARM[ch.id]; if (!d || !d.card) continue; const r = d.card(c, { month: run.month, seasonOf: run.rules.seasonOf }); if (r) v += r.x ? 4 : 2; }
  return v;
}

// 한 수 고르기 → { act: 'play'|'wind', uids }
export function decide(run, skill, rand = Math.random) {
  const ps = plays(run), best = ps[0], need = run.target - run.score;
  if (skill < 0.5) {
    /* 초보: 바람은 거의 안 씀 · 가장 센 패를 늘 알아보진 못함 */
    if (run.winds > 0 && run.hands > 1 && best.yaku === 'high' && rand() < 0.3) return { act: 'wind', uids: run.hand.slice(0, 3) };
    if (rand() < 0.45 + skill) return { act: 'play', uids: best.uids };
    const top = ps.slice(0, 10); return { act: 'play', uids: top[Math.floor(rand() * top.length)].uids };
  }
  if (best.total >= need || run.winds <= 0 || run.hands <= 1) return { act: 'play', uids: best.uids };
  // 남은 손으로 모자랄 것 같으면 바람으로 손패를 다듬음 (다음 달 패는 바람에 실어 보내면 다음 관문 '제철'로 돌아옴)
  const enough = best.total * run.hands >= need * (1.15 - skill * 0.1);
  if (enough && rand() < skill) return { act: 'play', uids: best.uids };
  const nextM = run.gate < run.gates ? run.months[run.gate].n : -1;
  const inBest = new Set(best.yaku !== 'high' ? best.uids : []);
  const ranked = run.hand.filter(u => !inBest.has(u)).map(u => ({ u, v: run.card(u).month === nextM ? -2 : keepVal(run, u) })).sort((a, b) => a.v - b.v);
  const k = Math.min(5, ranked.filter(x => x.v <= 3).length || 2);
  const uids = ranked.slice(0, k).map(x => x.u);
  if (!uids.length) return { act: 'play', uids: best.uids };
  return { act: 'wind', uids };
}

// 장터: 초보는 아무거나, 숙련은 곱하기 · 쓸모 있는 부적 + 금박
export function shopTurn(run, skill, rand = Math.random) {
  const s = run.shop; if (!s) return;
  const score = id => { const d = CHARM[id]; return d.rarity * 10 + (/×/.test(d.desc) ? 8 : 0) + (rand() * 6); };
  const order = s.charms.map((o, i) => ({ o, i })).filter(x => !x.o.sold).sort((a, b) => skill >= 0.5 ? score(b.o.id) - score(a.o.id) : rand() - 0.5);
  for (const { i } of order) {
    if (skill < 0.5 && rand() < 0.5) continue;
    if (run.charms.length >= 5 && skill >= 0.5) {
      /* 숙련: 칸이 차면 가장 약한(흔함) 부적을 팔고 귀한 걸 삼 */
      const o = s.charms[i], d = CHARM[o.id];
      const weak = run.charms.map((c, k) => ({ c, k })).filter(x => !x.c.today && CHARM[x.c.id].rarity < d.rarity)[0];
      if (weak && run.coins + run.sellValue(weak.k) >= o.cost) run.sell(weak.k);
    }
    run.buyCharm(i);
  }
  if (skill >= 0.5) s.tools.forEach((t, i) => {
    if (t.sold || run.coins < t.cost + 2) return;
    const cs = t.picks.map(u => run.cards.find(c => c.uid === u)).filter(Boolean).map(c => ({ c, b: run.rules.base[c.id] }));
    if (t.id === 'gold' || t.id === 'pearl') { const pick = cs.filter(x => !x.c[t.id]).sort((a, b) => run.rules.pts(b.b) - run.rules.pts(a.b))[0]; if (pick) run.buyTool(i, pick.c.uid); }
    else if (t.id === 'erase') { const pick = cs.filter(x => x.b.kind === 'pi' && x.b.pi === 1)[0]; if (pick) run.buyTool(i, pick.c.uid); }
    else if (t.id === 'seed') { const pick = cs.filter(x => x.b.kind === 'gwang')[0]; if (pick) run.buyTool(i, pick.c.uid); }
  });
}
