// 판 만들기 — 반드시 풀리는 판 (위에서부터 벗기는 순서를 먼저 정하고 그 순서대로 그림 · 얼음 · 사슬을 붙임)
//   좌표 단위 = 타일 한 칸 · 층(z)이 높을수록 위 · 위층 타일과 가로 · 세로 모두 1칸 미만으로 겹치면 덮임
//   얼음(iceAt = k): 판 시작부터 칸에 스티커를 k장 담으면 녹음 · 사슬(chain): 같은 층 · 같은 줄 바로 옆 타일이 모두 빠져야 풀림

/* 시드 고정 난수 (같은 날 = 같은 판) */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/* 줄 너비 목록 → 가운데 맞춘 칸 좌표 */
function rows(z, y0, widths, cx) {
  const out = [];
  widths.forEach((w, r) => { for (let i = 0; i < w; i++) out.push({ x: cx - (w - 1) / 2 + i, y: y0 + r, z }); });
  return out;
}

const stack = spec => spec.flatMap(([w, h], z) => { const o = []; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) o.push({ x: 3 - (w - 1) / 2 + i, y: 3.5 - (h - 1) / 2 + j, z }); return o; });
/* 엇갈림 판 (2026-10-30 대표: "아래 블록의 일부만 보이게"): 위층을 반 칸씩 어긋나게 쌓아 아래 타일이 위 타일 2~4장에 부분적으로 덮임
   · 층마다 엇갈림 방향(가로 · 세로 · 대각)을 바꾸고, 일부 층은 줄마다 반 칸 띄운 '벽돌' 줄
   · 반 칸 단위라 타일을 4칸(2×2)으로 나눠 가려진 칸을 셈 → 판을 만들 때 모든 타일이 4칸 중 2칸 이상(50%) 보이도록 위 타일을 넣지 않음 (최소 30% 규칙 충족) */
const quarters = t => [[t.x - .25, t.y - .25], [t.x + .25, t.y - .25], [t.x - .25, t.y + .25], [t.x + .25, t.y + .25]];
const coversPt = (b, [px, py]) => Math.abs(b.x - px) < 0.5 && Math.abs(b.y - py) < 0.5;
export function visibleQuarters(t, list) { return quarters(t).filter(q => !list.some(b => b.z > t.z && coversPt(b, q))).length; }
/* 층마다 반 칸 격자 위의 자리를 가운데부터 채움 (같은 층끼리는 겹치지 않게) · 아래 타일이 2칸(50%) 미만만 보이게 되는 자리는 건너뜀
   spec: [가로 칸 수, 세로 칸 수, 선호 어긋남 x, 선호 어긋남 y, 벽돌(줄마다 반 칸)] — 층마다 다르게 주면 가로 · 세로 · 대각 엇갈림이 섞임 */
function weave(spec, piles = 0, minVis = 2) {
  const out = [];
  spec.forEach(([w, h, dx, dy, brick], z) => {
    const cand = [];
    for (let y2 = 0; y2 <= (h - 1) * 2; y2++) for (let x2 = 0; x2 <= (w - 1) * 2; x2++) {
      const x = 3 - (w - 1) / 2 + x2 / 2 + dx, y = 3.5 - (h - 1) / 2 + y2 / 2 + dy;
      const row = Math.round(y2 / 2), want = brick ? (x2 % 2) === (row % 2) && y2 % 2 === 0 : x2 % 2 === 0 && y2 % 2 === 0;
      cand.push({ x, y, z, pri: (want ? 0 : 10) + Math.hypot(x - 3, (y - 3.5) * 0.9) });
    }
    cand.sort((p, q) => p.pri - q.pri);
    for (const t of cand) {
      if (t.x < -0.01 || t.x > 6.01 || t.y < -0.01 || t.y > 7.01) continue;
      if (out.some(b => b.z === z && Math.abs(b.x - t.x) < 1 && Math.abs(b.y - t.y) < 1)) continue;
      const under = out.filter(b => b.z < z && Math.abs(b.x - t.x) < 1 && Math.abs(b.y - t.y) < 1);
      if (z > 0 && !under.length) continue;
      if (under.some(b => visibleQuarters(b, [...out, t]) < minVis)) continue;
      out.push({ x: t.x, y: t.y, z });
    }
  });
  /* 더미(pile): 맨 위로 드러난 타일 바로 위에 똑같이 한 장 더 → 아래 장은 완전히 숨음(부분 가림은 늘지 않음 · 쌓인 옆면으로 장 수가 보임) */
  for (let n = 0; n < piles; n++) {
    const top = out.filter(a => !out.some(b => b.z > a.z && Math.abs(b.x - a.x) < 1 && Math.abs(b.y - a.y) < 1));
    top.sort((p, q) => Math.hypot(p.x - 3, p.y - 3.5) - Math.hypot(q.x - 3, q.y - 3.5) + (n % 3) * 0.01 * (p.x - q.x));
    const t = top[n % Math.max(1, Math.min(top.length, 18))]; if (!t) break;
    out.push({ x: t.x, y: t.y, z: t.z + 1 });
  }
  return out;
}
/* 판 모양 (장 수는 3의 배수로 맞춤) · 홀수 층은 반 칸 어긋나 아래층이 반쯤 보임 */
export const LAYOUTS = {
  /* 연습 36장 (3층) */
  small: () => [...rows(0, 0, [3, 5, 5, 5, 3], 3), ...rows(1, 0.5, [2, 4, 4, 2], 3), ...rows(2, 1.5, [1, 1, 1], 3)],
  /* 66장 (3층) */
  diamond: () => [...rows(0, 0, [3, 5, 7, 7, 7, 7, 5, 3], 3), ...rows(1, 1.5, [2, 4, 4, 4, 4, 2], 3), ...rows(2, 3, [1, 1], 3)],
  /* 72장 (2층 · 넓음) */
  wide: () => [...rows(0, 0, [7, 7, 7, 7, 7, 7], 3), ...rows(1, 0.5, [6, 6, 6, 6, 6], 3)],
  /* 81장 (4층) */
  tower: () => [...rows(0, 0, [5, 5, 5, 5, 5, 5, 5], 3), ...rows(1, 0.5, [4, 4, 4, 4, 4, 4], 3), ...rows(2, 1, [3, 3, 3, 3, 3], 3), ...rows(3, 1.5, [1, 2, 2, 2], 3)],
  /* 아래부터 직사각형을 쌓은 판 (가장자리가 고리처럼 드러나 고를 거리가 넉넉함 · 같은 크기를 두 번 쌓으면 아래가 완전히 가려져 어려워짐) */
  /* 엇갈림 판: [폭, 높이, 가로 어긋남, 세로 어긋남, 벽돌 줄] */
  e39: () => weave([[5, 6, 0, 0], [4, 5, .5, .5]]),
  e81: () => weave([[7, 8, 0, 0], [6, 7, .5, .5], [5, 6, 0, 0], [4, 5, .5, 0], [3, 4, 0, .5], [2, 2, .5, .5]]),
  e90: () => weave([[7, 8, 0, 0], [6, 7, .5, .5], [5, 6, 0, 0], [4, 5, .5, 0], [3, 4, 0, .5], [2, 2, .5, .5]], 9),
  e108: () => weave([[7, 8, 0, 0], [6, 7, .5, .5], [7, 6, 0, 0, 1], [5, 6, .5, 0], [4, 5, 0, .5], [3, 4, .5, .5], [2, 3, 0, 0]], 24),
  e126: () => weave([[7, 8, 0, 0], [6, 8, .5, 0], [7, 7, 0, .5], [6, 7, .5, .5], [6, 6, 0, 0, 1], [4, 6, .5, 0], [4, 4, 0, .5], [2, 3, .5, .5]], 39),
  e144: () => weave([[7, 8, 0, 0], [6, 7, .5, .5], [7, 7, 0, .5, 1], [6, 8, .5, 0], [7, 6, 0, 0], [5, 6, .5, .5], [6, 5, 0, .5, 1], [4, 5, .5, 0], [3, 4, 0, .5], [2, 2, .5, .5]], 54),
  a42: () => stack([[5, 6], [3, 4], [1, 2]]),
  a69: () => stack([[7, 6], [5, 4], [3, 2], [1, 2]]),
  a99: () => stack([[7, 8], [5, 6], [3, 4], [1, 2]]),
  m117: () => stack([[7, 8], [5, 6], [3, 6], [3, 4], [1, 2]]),
  h114: () => stack([[7, 8], [5, 6], [3, 4], [3, 4], [1, 2], [1, 2]]),
  j129: () => stack([[7, 8], [5, 6], [5, 6], [3, 4], [1, 2]]),
  k147: () => stack([[7, 8], [7, 6], [5, 6], [3, 4], [3, 2], [1, 2]]),
};
export function layout(name = 'diamond') {
  let t = LAYOUTS[name]();
  t = t.slice(0, t.length - (t.length % 3));
  return t.map((p, i) => ({ ...p, id: i, iceAt: 0, chain: false }));
}

export const covers = (top, low) => top.z > low.z && Math.abs(top.x - low.x) < 0.999 && Math.abs(top.y - low.y) < 0.999;
export const neighbors = (t, list) => list.filter(b => b !== t && b.z === t.z && Math.abs(b.y - t.y) < 0.01 && Math.abs(Math.abs(b.x - t.x) - 1) < 0.01);

/* 지금 누를 수 있는가: 덮이지 않음 · 얼음 녹음(taps = 지금까지 칸에 담은 수) · 사슬 옆이 비었음 */
export const isCoveredIn = (t, list) => list.some(b => b !== t && covers(b, t));
export const iced = (t, taps) => t.iceAt > 0 && taps < t.iceAt;
export const chained = (t, list) => t.chain && neighbors(t, list).length > 0;
export function canTake(t, list, taps) { return !isCoveredIn(t, list) && !iced(t, taps) && !chained(t, list); }
export function freeOf(list, taps = 1e9) { return list.filter(a => canTake(a, list, taps)); }

/* 벗기는 순서 정하기 (얼음 · 사슬 규칙도 지키면서) */
function peel(tiles, rand, zw = 0.6, taps0 = 0) {
  const left = tiles.slice(), order = [];
  while (left.length) {
    const f = freeOf(left, taps0 + order.length);
    if (!f.length) return null;
    f.sort((a, b) => (b.z - a.z) * zw + (rand() - 0.5) * 2);
    const pick = f[0]; order.push(pick); left.splice(left.indexOf(pick), 1);
  }
  return order;
}

/* 그림 붙이기: 두 묶음씩 섞어(ABABBA 꼴) 같은 그림 세 장씩 배정 → 그 순서대로 두면 칸에 5장 넘게 쌓이지 않음
   pre: 칸에 이미 있는 그림이 마저 필요한 장 수 (섞기 때 사용) → 맨 앞 타일들로 먼저 채움 */
export function assign(tiles, typesPool, rand, pre = [], mix = 0.4, taps0 = 0) {
  const order = peel(tiles, rand, 0.6, taps0); if (!order) return null;
  let k = 0;
  for (const need of pre) for (let i = 0; i < need.n; i++) order[k++].type = need.type;
  const rest = order.slice(k);
  const groups = typesPool.slice();
  for (let i = groups.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [groups[i], groups[j]] = [groups[j], groups[i]]; }
  let gi = 0;
  for (let i = 0; i < rest.length; i += 6) {
    const chunk = rest.slice(i, i + 6);
    if (chunk.length === 6 && rand() < mix) {
      const A = groups[gi++], B = groups[gi++];
      const pat = rand() < 0.5 ? [A, B, A, B, B, A] : [A, A, B, A, B, B];
      chunk.forEach((t, j) => { t.type = pat[j]; });
    } else {
      for (let j = 0; j < chunk.length; j += 3) { const A = groups[gi++]; chunk.slice(j, j + 3).forEach(t => { t.type = A; }); }
    }
  }
  return order.map(t => t.id);
}

/* 흩어 붙이기 (난이도용): 벗기는 순서를 따라가며 묶음(같은 그림 3장)을 동시에 최대 cap 개까지 열어 둠
   열린 묶음은 칸에 2장까지만 남으므로 정답 순서의 칸은 2 × cap 장을 넘지 않음 (cap ≤ 3 → 6장 ≤ 7칸 → 반드시 풀림)
   cap · pNew 가 클수록 같은 그림이 깊은 층까지 흩어져 칸 관리가 어려워짐 */
export function assignSpread(tiles, typesPool, rand, { cap = 2, pNew = 0.5, zw = 0.35, taps0 = 0 } = {}) {
  const order = peel(tiles, rand, zw, taps0); if (!order) return null;
  const groups = typesPool.slice();
  for (let i = groups.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [groups[i], groups[j]] = [groups[j], groups[i]]; }
  const open = []; let gi = 0;
  for (let i = 0; i < order.length; i++) {
    const R = order.length - i, need = open.reduce((a, g) => a + 3 - g.c, 0);
    const canNew = gi < groups.length && open.length < cap && R - need >= 3;
    let g;
    if (canNew && (!open.length || rand() < pNew)) { g = { type: groups[gi++], c: 0 }; open.push(g); }
    else if (open.length) g = open[Math.floor(rand() * open.length)];
    else return null;
    order[i].type = g.type; g.c++;
    if (g.c === 3) open.splice(open.indexOf(g), 1);
  }
  return open.length ? null : order.map(t => t.id);
}

/* 얼음 · 사슬 붙이기: 정답 순서에서 '그때 이미 풀려 있을' 타일에만 → 풀리는 판이 그대로 유지됨 */
function obstacles(tiles, order, rand, { ice = 0, chain = 0 }) {
  const byId = new Map(tiles.map(t => [t.id, t])), idx = new Map(order.map((id, i) => [id, i]));
  const cand = order.map(id => byId.get(id)).filter((t, i) => i >= 4);
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
  let ni = 0, nc = 0;
  for (const t of cand) {
    const at = idx.get(t.id);
    if (ni < ice && !t.chain) { const k = 3 + Math.floor(rand() * 5); if (k <= at) { t.iceAt = k; ni++; continue; } }
    if (nc < chain && !t.iceAt) { const nb = neighbors(t, tiles); if (nb.length && nb.every(b => idx.get(b.id) < at)) { t.chain = true; nc++; } }
  }
}

/* 정해 둔 순서대로 두었을 때 정말 깨지는지 (칸 7 · 최대로 쌓인 수 · 얼음 · 사슬 규칙) */
export function verify(tiles, order, slots = 7, tray0 = [], taps0 = 0) {
  const left = tiles.slice(); const tray = tray0.slice(); let peak = tray.length, taps = taps0;
  const byId = new Map(tiles.map(t => [t.id, t]));
  for (const id of order) {
    const t = byId.get(id); if (!t || !left.includes(t)) return { ok: false, why: '없는 타일' };
    if (!canTake(t, left, taps)) return { ok: false, why: '아직 못 누르는 타일' };
    left.splice(left.indexOf(t), 1); tray.push(t.type); taps++; peak = Math.max(peak, tray.length);
    if (tray.length > slots) return { ok: false, why: '칸 넘침', peak };
    if (tray.filter(x => x === t.type).length === 3) for (let i = 0; i < 3; i++) tray.splice(tray.indexOf(t.type), 1);
  }
  return { ok: left.length === 0 && tray.length === 0, peak };
}

/* 판 만들기: cfg = { layout, types(그림 번호 목록), cap · pNew(흩어 붙이기) 또는 mix(옛 방식), ice, chain } */
export function makeLevel(seed, cfg = {}) {
  const { layout: lname = 'diamond', types = [0, 1, 2, 3, 4, 5, 6, 7, 8], mix = 0.4, cap = 0, pNew = 0.5, zw = 0.35, ice = 0, chain = 0 } = cfg;
  const rand = rng(seed);
  for (let tries = 0; tries < 120; tries++) {
    const tiles = layout(lname);
    const groups = tiles.length / 3, pool = []; for (let g = 0; g < groups; g++) pool.push(types[g % types.length]);
    const order = cap ? assignSpread(tiles, pool, rand, { cap, pNew, zw }) : assign(tiles, pool, rand, [], mix); if (!order) continue;
    if (ice || chain) obstacles(tiles, order, rand, { ice, chain });
    const v = verify(tiles, order);
    if (v.ok) return { tiles, solution: order, peak: v.peak };
  }
  throw new Error('판 만들기 실패');
}
