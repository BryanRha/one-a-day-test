// 가까운 목표 (v0.6.1 · 검수 M3 Top 1 · Top 4) — 시설 탭 '가장 가까운 공사' · 카드 '거의 됨' 순서 · 출격 준비 '이번 판 목표' · '깊게' 권유
//  three · DOM 없음 → node 시험(tools/test_grow.mjs) · 시뮬에서도 씀. 진행 = 칸마다 min(1, 가진/필요) 의 평균 (결과 화면 '다음엔?'과 같은 기준)
import { ITEMS, MATS, MARKET, LOOT_TABLE, MAPS, MAP_KEYS, ENEMIES, FACILITIES, FAC_KEYS } from './data.js?v=0.99.39';
import * as E from './econ.js?v=0.99.39';

/* 비용 하나의 진행 0~1 */
export const progressOf = (S, cost) => { const c = Object.entries(cost || {}); return c.length ? c.reduce((s, [m, n]) => s + Math.min(1, E.count(S, m) / n), 0) / c.length : 1; };

/* 시설 카드 하나의 상태: building 공사 중 · ready 바로 지음 · buy 조개로 채움 · lack 모자람 · locked 잠김 · max 최고 */
export function facState(S, f) {
  const lv = E.facLvl(S, f), nx = E.facNext(S, f), un = E.facUnlocked(S, f);
  if (S.build?.k === f) return { f, lv, nx, st: 'building', k: 1 };
  if (!nx) return { f, lv, nx, st: 'max', k: 1 };
  if (!un) return { f, lv, nx, st: 'locked', k: 0 };
  const c = nx.cost || {}; const k = progressOf(S, c); const lp = E.lackPrice(S, c);
  return { f, lv, nx, k, lp, lack: E.lack(S, c), st: E.canPay(S, c) ? 'ready' : lp.ok ? 'buy' : 'lack' };
}
const RANK = { building: 0, ready: 1, buy: 2, lack: 3, locked: 4, max: 5 };
/* 카드 순서: 공사 중 → 바로 지음 → 조개로 채움 → '거의 됨'(진행 높은 순 · 같으면 싼 것) → 잠김 → 최고 단계 */
export function facOrder(S) {
  return FAC_KEYS.map(f => facState(S, f)).sort((a, b) => RANK[a.st] - RANK[b.st] || (b.k - a.k) || (E.costValue(a.nx?.cost) - E.costValue(b.nx?.cost))).map(x => x.f);
}

/* 상자 하나에서 그 물건(또는 분해해서 그 재료)이 나오는 기대량 */
function yieldOf(box, k) {
  const T = LOOT_TABLE[box]; if (!T) return 0; const tot = Object.values(T.w).reduce((a, b) => a + b, 0) || 1; const n = (T.n[0] + T.n[1]) / 2;
  let y = 0; for (const [i, w] of Object.entries(T.w)) y += w / tot * (i === k ? 1 : (k in MATS ? (ITEMS[i]?.dis?.[k] || 0) : 0));
  return y * n + ((T.fixed || []).includes(k) ? 1 : 0);
}
/* 상자 → 그 상자가 놓이는 지도 (구역 상자 · 보스 잔해) */
function boxMaps(box) {
  const out = MAP_KEYS.filter(m => Object.values(MAPS[m].zones || {}).some(z => z.boxes && box in z.boxes));
  if (!out.length) for (const m of MAP_KEYS) if (ENEMIES[MAPS[m].bossKind]?.loot === box) out.push(m);
  return out;
}
/* 그 물건이 어디서 나오나: 열린 지도의 상자 중 기대량이 가장 큰 것 · 고물상 값(기본 재료만) */
export function sourceOf(S, k) {
  const open = E.openMaps(S); let best = null;
  for (const box of Object.keys(LOOT_TABLE)) { const y = yieldOf(box, k); if (!y) continue; const maps = boxMaps(box); const on = maps.filter(m => open.includes(m));
    const sc = y * (on.length ? 1 : maps.length ? 0.01 : 0.6) * (LOOT_TABLE[box].fixed ? 0.25 : 1); /* 아직 안 열린 지도 상자는 뒤로 · 적 잔해(지도 없음)는 조금 덜 · 보스 잔해는 한 판에 하나라 덜 */
    if (!best || sc > best.sc) best = { box, name: LOOT_TABLE[box].name, maps: on.length ? on : maps, sc, enemy: !maps.length }; }
  return { ...(best || {}), buy: MARKET[k] || null, trader: k === 'core' };
}
const mapNames = ms => ms.map(m => MAPS[m]?.short || MAPS[m]?.name || m).join(' · ');
export const sourceTxt = (S, k) => { const s = sourceOf(S, k); if (!s.box) return s.buy ? '고물상' : ''; return `${s.name}${s.maps?.length ? ` (${mapNames(s.maps.slice(0, 2))})` : ''}${s.trader ? ' · 바람 행상' : ''}`; };

/* 가장 가까운 공사: 열린 시설의 다음 단계 중 진행이 가장 높은 것 (공사 중인 것 빼고) */
export function nearestBuild(S) {
  let best = null;
  for (const f of FAC_KEYS) { const x = facState(S, f); if (!['ready', 'buy', 'lack'].includes(x.st)) continue;
    if (!best || x.k > best.k + 1e-9 || (Math.abs(x.k - best.k) < 1e-9 && E.costValue(x.nx.cost) < E.costValue(best.nx.cost))) best = x; }
  if (!best) return null;
  const L = Object.entries(best.lack); const items = L.filter(([m]) => m !== 'shells');
  /* 판에서 찾아올 것: 고물상에서 못 사는 부품이 먼저 · 그다음 가장 많이 모자란 재료 */
  const key = items.sort((a, b) => (!!MARKET[a[0]] - !!MARKET[b[0]]) || (b[1] * (ITEMS[b[0]]?.val || 5) - a[1] * (ITEMS[a[0]]?.val || 5)))[0] || null;
  return { ...best, lv: best.lv + 1, miss: L.map(([m, n]) => `${E.costName(m)} ${n.toLocaleString('ko-KR')}`).slice(0, 3).join(' · '), shellsLack: best.lack.shells || 0,
    key: key ? { item: key[0], n: key[1], src: sourceTxt(S, key[0]), buy: !!MARKET[key[0]] } : null };
}

/* 출격 준비 '이번 판 목표' 한 줄 (가장 가까운 공사에서) — 없으면 null */
export function raidGoal(S) {
  const nb = nearestBuild(S); if (!nb) return null; const F = FACILITIES[nb.f];
  if (nb.st === 'ready') return { txt: `${F.name} ${nb.lv}단계 재료가 다 모였어요 — 은신처에서 짓기`, nb, done: true };
  if (nb.key) return { txt: `${E.costName(nb.key.item)} ${nb.key.n}개${nb.key.src ? ` — ${nb.key.src}` : ''}${nb.st === 'buy' ? ` · 아니면 고물상 조개 ${nb.lp.price}` : ''}`, why: `${F.name} ${nb.lv}단계`, nb, item: nb.key.item };
  if (nb.shellsLack) return { txt: `조개 ${nb.shellsLack.toLocaleString('ko-KR')}어치 건져 오기 — 보물을 팔면 돼요`, why: `${F.name} ${nb.lv}단계`, nb };
  return null;
}

/* '깊게' 권유 (Top 4 임시 대책 · 본격 위협 곡선은 M4): 최근 5판 탈출률 95% 이상 · 지금 '깊게'가 아님 */
export const DEEP_HINT_N = 5;
export function deepHint(S) {
  if ((S.diff || 'normal') === 'deep') return null; const log = (S.log || []).slice(-DEEP_HINT_N); if (log.length < DEEP_HINT_N) return null;
  const rate = log.filter(r => r.o === 'extract').length / log.length; return rate >= 0.95 ? { rate, n: log.length } : null;
}
