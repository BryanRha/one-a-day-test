// 봇 (사람처럼: 판에 보이는 것만 보고 0.5초마다 한 가지씩 함) — 밸런스 · 막힘 검사용
import { T } from './data.js?v=0.95.1';
import { BUY_ROWS, CHAR } from './sim.js?v=0.95.1';

const ROAD_R = 1.9;   // 길 칸 세는 반경 (칸)
export function spots(sim) {
  const out = [], gates = sim.mode === 2 ? sim.objects.filter(o => o.role === 'start' && o.alive) : [];
  for (let i = 0; i < 15; i++) for (let j = 0; j < 10; j++) {
    if (!sim.canPlace(i, j)) continue;
    let road = 0;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) if (sim.tiles[i + a]?.[j + b] >= 0 && Math.hypot(a, b) <= ROAD_R) road++;
    // 성문 부수기: 성문 가까운 칸을 크게 쳐 줌
    for (const g of gates) { const d = Math.hypot(i - g.x / 2250, j - g.y / 2250); if (d < 2.6) road += 8; }
    if (road) out.push({ i, j, road });
  }
  return out.sort((a, b) => b.road - a.road);
}
// opt.style: 'mix'(기본) · 'warrior' · 'archer' · 'wizard' (업적 · 다양성 시험)
export function makeBot(opt = {}) {
  const st = { k: 0, last: -99, order: opt.style && opt.style !== 'mix' ? [opt.style] : ['archer', 'warrior', 'wizard', 'archer', 'wizard', 'warrior'] };
  return function act(sim) {
    if (sim.state !== 'play' && sim.state !== 'ready') return;
    if (sim.time - st.last < 20) return;
    st.last = sim.time;
    if (!sim.focus || !sim.focus.alive) {
      const o = sim.objects.filter(o => o.alive && o.destroyable && o.role === 'obj' && o.reward >= 0 && sim.towers.some(t => sim.inRange(t, o.x, o.y))).sort((a, b) => a.hp - b.hp)[0];
      if (o) sim.focus = o;
    }
    // 1) 영웅
    for (let g = 0; g < 3; g++) {
      if (!sim.heroAvailable(g)) continue;
      if (sim.mana >= sim.heroCost(g * 5)) { const sp = spots(sim)[0]; if (sp) { sim.place('hero' + g, sp.i, sp.j); return; } }
    }
    // 2) 필살기: 몬스터가 많거나 보스가 있거나 목숨이 위험할 때
    const alive = sim.monsters.filter(m => m.alive && m.status === 0);
    if (sim.canSpecial() && (alive.length >= 8 || alive.some(m => m.boss) || (sim.life < 12 && alive.length >= 3))) { sim.useSpecial(); return; }
    // 3) 영웅 레벨업 (마나 남으면)
    for (const h of sim.heroes()) { const li = sim.levelInfo(h); if (li && sim.mana >= li.cost + (sim.meta.special ? 200 : 0)) { sim.levelUp(h); return; } }
    // 4) 골드 쓰기: 칸이 넉넉하면 새로 세우고, 아니면 강화 · 전직
    const sp = spots(sim), units = sim.towers.filter(t => !t.hero);
    const want = Math.min(sp.length + units.length, 6 + Math.floor(sim.wave / 4));
    const kind = st.order[st.k % st.order.length];
    if (units.length < want && sp.length && sim.money >= sim.buyPrice(BUY_ROWS[kind])) { sim.place(kind, sp[0].i, sp[0].j); st.k++; return; }
    let best = null;
    for (const t of units) {
      const li = sim.levelInfo(t), ci = sim.classInfo(t);
      if (li && (!best || li.cost < best.cost)) best = { cost: li.cost, f: () => sim.levelUp(t) };
      if (!li && ci && (!best || ci.cost < best.cost)) best = { cost: ci.cost, f: () => sim.classChange(t) };
    }
    if (best && sim.money >= best.cost) { best.f(); return; }
    if (units.length < sp.length + units.length && sp.length && sim.money >= 1200) { sim.place(kind, sp[0].i, sp[0].j); st.k++; return; }
    // 5) 보상 물건 노리기 (상자 · 금고 · 마나 수정) — 몬스터가 없을 때만 칼이 가므로 늘 걸어 둠
    if (!sim.focus || !sim.focus.alive) {
      const o = sim.objects.filter(o => o.alive && o.destroyable && o.role === 'obj' && o.reward >= 0 && sim.towers.some(t => sim.inRange(t, o.x, o.y))).sort((a, b) => a.hp - b.hp)[0];
      if (o) sim.focus = o;
    }
  };
}
