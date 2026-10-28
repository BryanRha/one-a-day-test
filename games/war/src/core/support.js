// 지원 부대: 작전 시작 때 아군 본부 가까이에 유닛을 더 배치 (화면과 무관 — Node 봇에서도 씀)
//   광고 보급 보너스(작전 실패 1~2번째) · 응원 선물(같은 작전 3연속 패배 · 6번째 조금 더)이 같은 방식을 씀
//   크기 근거: tools/help_bot.mjs (봇 승률 변화) — 응원 선물은 보급 보너스 효과의 ½ 이하
import { TERRAIN, UNITS } from './data.js?v=0.76.0';
import { TCH } from './sim.js?v=0.76.0';

export const SUPPORT = {
  supply: { units: ['ltank', 'inf'], name: '보급 보너스', desc: '경전차 · 소총병 지원' },   /* 광고 1회 (작전 실패 후 '같은 배치로 다시') */
  gift: { units: ['inf:50'], name: '응원 선물', desc: '소총병 반 분대(체력 5) 지원' },    /* 같은 작전 3연속 패배 */
  gift2: { units: ['inf'], name: '응원 선물', desc: '소총병 1기 지원' },                 /* 6번째 패배부터 조금 더 */
  /* 측정 (2026-10-28 · node tools/help_bot.mjs 40 easy m4,m5,m8,m13,m14,m15,m20,m25 — 아군 봇 쉬움 · 지는 판이 있는 작전 8곳 × 40판):
     기본 76.6% → 보급 +14.1%p · 선물 +3.4%p(보급의 0.24배) · 선물+ +6.9%p(0.49배) — 기준 ½ 이하
     (소총병 1기 = 경전차 1기만큼 효과가 커서 선물은 반 분대로, 보급은 경전차+소총병으로 정함 · 보급트럭은 효과 0) */
};


// map 에 지원 유닛을 더한 새 지도 (원래 지도는 그대로)
export function withSupport(map, kind) {
  const sp = SUPPORT[kind]; if (!sp) return map;
  const rows = map.rows.map(r => r.trim().split(/\s+/)), h = rows.length, w = rows[0].length;
  const tile = (x, y) => { const c = rows[y][x]; return { t: TCH[c[0]], owner: +(c[1] || 0) || 0 }; };
  const taken = new Set((map.units || []).map(u => `${u.x},${u.y}`));
  // 시작점: 아군 본부 → 없으면 아군 유닛 무게중심 가까운 아군 유닛
  let sx = -1, sy = -1;
  for (let y = 0; y < h && sx < 0; y++) for (let x = 0; x < w; x++) { const t = tile(x, y); if (t.t === 'hq' && t.owner === 1) { sx = x; sy = y; break; } }
  if (sx < 0) { const mine = (map.units || []).filter(u => u.p === 1); if (mine.length) { sx = mine[0].x; sy = mine[0].y; } }
  const out = [];
  for (const spec of sp.units || []) {
    const [type, hp] = spec.split(':');   /* 'inf:50' = 체력 5 */
    const mt = UNITS[type].mt, ok = (x, y) => { const t = tile(x, y); return TERRAIN[t.t].cost[mt] != null && !(TERRAIN[t.t].prop && t.owner === 2) && !taken.has(`${x},${y}`); };
    // 본부에서 가까운 칸부터 (본부 칸은 비워 둠 · 생산 건물 칸도 비워 둠)
    if (sx < 0) break;
    const seen = new Set([`${sx},${sy}`]), q = [[sx, sy]]; let at = null;
    while (q.length && !at) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const nx = x + dx, ny = y + dy, k = `${nx},${ny}`; if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen.has(k)) continue; seen.add(k);
        const t = tile(nx, ny); if (TERRAIN[t.t].cost.foot == null && TERRAIN[t.t].cost.tread == null) continue;   /* 땅으로만 퍼짐 */
        if (ok(nx, ny) && !TERRAIN[t.t].builds) { at = [nx, ny]; break; }
        q.push([nx, ny]);
      }
    }
    if (!at) continue;
    taken.add(`${at[0]},${at[1]}`); out.push({ t: type, p: 1, x: at[0], y: at[1], support: 1, ...(hp ? { hp: +hp } : {}) });
  }
  const funds = sp.funds ? [((map.funds || [0, 0])[0] || 0) + sp.funds, (map.funds || [0, 0])[1] || 0] : map.funds;
  return { ...map, units: [...(map.units || []), ...out], funds, support: kind };
}
