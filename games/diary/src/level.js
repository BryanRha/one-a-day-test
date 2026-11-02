// 판 만들기 — 반드시 풀리는 판 (위에서부터 벗기는 순서를 먼저 정하고 그 순서대로 그림 · 얼음 · 사슬을 붙임)
//   좌표 단위 = 타일 한 칸 · 층(z)이 높을수록 위 · 위층 타일과 가로 · 세로 모두 1칸 미만으로 겹치면 덮임
//   얼음(iceAt = k): 판 시작부터 칸에 스티커를 k장 담으면 녹음 · 사슬(chain): 같은 층 · 같은 줄 바로 옆 타일이 모두 빠져야 풀림

/* 시드 고정 난수 (같은 날 = 같은 판) */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/* 타일을 2×2 칸으로 나눠 위에 안 덮인 칸 수 (0 = 완전히 숨음 · 봇 · 판 통계가 '보이는 그림'을 셀 때 씀) */
const quarters = t => [[t.x - .25, t.y - .25], [t.x + .25, t.y - .25], [t.x - .25, t.y + .25], [t.x + .25, t.y + .25]];
const coversPt = (b, [px, py]) => Math.abs(b.x - px) < 0.5 && Math.abs(b.y - py) < 0.5;
export function visibleQuarters(t, list) { return quarters(t).filter(q => !list.some(b => b.z > t.z && coversPt(b, q))).length; }
/* ---------- 판 모양 라이브러리 (2026-11-02 대표 "원작의 타일 배치를 제대로 벤치마킹") ----------
   장르 히트작 판 30여 장을 해부한 원리(team/dev/tasks/261102-diary-balance/research.md '배치 해부')를 우리 식으로 새로 만든 판 · 원작 좌표 복제 없음
   · 외곽: 대칭 실루엣(마름모 · 하트 · 고리 · 십자 · 나비 · 모래시계 · 섬 · 계단 …)을 아래층 글자 그림(SIL)으로 정함
   · 층: 아래층 위에 '받침이 넉넉한 자리'에만 올림 → 층마다 크기가 줄어드는 더미(위가 좁고 아래가 넓음 · 맨 위 노출 타일 6~16장)
   · 어긋남: half(반 칸 대각) · quarter(1/4 칸) · col(세로 반 칸) · row(가로 반 칸) · same(통칸 — 테두리만 남기고 그대로 쌓음)
   · 맨 위층 성기게(top: 'checker') · 측면 더미(decks: 한자리에 여러 장을 비스듬히 포갠 줄 — 맨 위 한 장만 누를 수 있음)
   · 장 수는 3의 배수: 완전히 가려진 맨 아래 타일을 가운데부터 뺌(보이는 모양은 그대로) */
const SIL = {
  rect: ['#######', '#######', '#######', '#######', '#######', '#######', '#######', '#######'],
  rect5: ['.#####.', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.'],
  diamond: ['...#...', '..###..', '.#####.', '#######', '#######', '.#####.', '..###..', '...#...'],
  heart: ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
  ring: ['#######', '#######', '##...##', '##...##', '##...##', '##...##', '#######', '#######'],
  cross: ['..###..', '..###..', '#######', '#######', '#######', '..###..', '..###..', '..###..'],
  xshape: ['##...##', '###.###', '.#####.', '..###..', '..###..', '.#####.', '###.###', '##...##'],
  butterfly: ['##...##', '###.###', '#######', '.#####.', '.#####.', '#######', '###.###', '##...##'],
  hourglass: ['#######', '#######', '.#####.', '..###..', '..###..', '.#####.', '#######', '#######'],
  ibeam: ['#######', '#######', '..###..', '..###..', '..###..', '..###..', '#######', '#######'],
  arch: ['##...##', '##...##', '##...##', '##...##', '#######', '#######', '#######', '.#####.'],
  circle: ['..###..', '.#####.', '#######', '#######', '#######', '#######', '.#####.', '..###..'],
  islands: ['###.###', '###.###', '###.###', '.......', '.......', '###.###', '###.###', '###.###'],
  twins: ['###.###', '###.###', '###.###', '###.###', '###.###', '###.###', '###.###', '###.###'],
  stairs: ['###....', '####...', '#####..', '.#####.', '..#####', '...####', '....###'],
  house: ['...#...', '..###..', '.#####.', '#######', '#######', '##.#.##', '##.#.##', '#######'],
  crown: ['#..#..#', '##.#.##', '#######', '#######', '#######', '.#####.', '.#####.'],
  bowtie: ['##...##', '###.###', '#######', '#######', '#######', '#######', '###.###', '##...##'],
  frame: ['#######', '#######', '##...##', '##.#.##', '##.#.##', '##...##', '#######', '#######'],
  flower: ['..###..', '.#####.', '###.###', '##...##', '###.###', '.#####.', '..###..'],
  tower: ['..###..', '..###..', '.#####.', '.#####.', '#######', '#######', '#######', '#######'],
  vase: ['.#####.', '..###..', '.#####.', '#######', '#######', '#######', '.#####.', '..###..'],
  leaf: ['....###', '...####', '..#####', '.######', '######.', '#####..', '####...', '###....'],
  pillars: ['##.#.##', '##.#.##', '#######', '#######', '#######', '#######', '##.#.##', '##.#.##'],
  star: ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '##...##'],
  wide: ['#######', '#######', '#######', '#######', '#######', '#######'],
  small: ['.#####.', '.#####.', '.#####.', '.#####.', '.#####.'],
  tiny: ['..###..', '.#####.', '.#####.', '.#####.', '..###..'],
};
const OFF = { half: [0.5, 0.5], quarter: [0.25, 0.25], col: [0, 0.5], row: [0.5, 0], same: [0, 0] };
/* 판 짓기: sil 실루엣 · layers 층 수 · mode 어긋남 · top 맨 위층 모양 · decks [[x, y, 장수, 방향 l|r|d]] · y0 세로 위치 */
export function build(sil, { layers = 3, mode = 'half', top = 'full', decks = [], y0 = 0 } = {}) {
  const rows = SIL[sil], out = [], H = rows.length, oy = y0 + (8 - H) / 2;
  rows.forEach((r, j) => [...r].forEach((c, i) => { if (c === '#') out.push({ x: i, y: oy + j, z: 0 }); }));
  let below = out.slice();
  for (let z = 1; z < layers; z++) {
    const [ox, oy2] = OFF[mode], s = z % 2 ? 1 : -1, cur = [];
    const at = (x, y) => below.some(b => Math.abs(b.x - x) < 0.01 && Math.abs(b.y - y) < 0.01);
    for (const b of below) {
      const x = b.x + ox * s, y = b.y + oy2 * s;
      /* 받침: 이 자리와 겹치는 아래 타일이 모두 있어야 함(가장자리에서 공중에 뜨지 않게) — 통칸은 상하좌우 이웃이 모두 있어야 함 */
      let ok;
      if (mode === 'same') ok = [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => at(b.x + dx, b.y + dy));
      else {
        const xs = ox ? [b.x, b.x + s] : [b.x], ys = oy2 ? [b.y, b.y + s] : [b.y];
        ok = xs.every(xx => ys.every(yy => at(xx, yy)));
      }
      if (ok && !cur.some(c => Math.abs(c.x - x) < 0.01 && Math.abs(c.y - y) < 0.01)) cur.push({ x, y, z });
    }
    if (!cur.length) break;
    let layer = cur;
    /* 맨 위층 성기게: 바둑판 무늬로 한 칸 건너 하나 (아래층이 더 많이 드러나 미리 읽을 거리가 생김) */
    if (z === layers - 1 && top === 'checker') layer = cur.filter(c => (Math.floor(c.x + 0.01) + Math.floor(c.y + 0.01)) % 2 === 0);
    out.push(...layer); below = cur;
  }
  /* 측면 더미: 한자리에 n장을 비스듬히 포갬 (맨 위만 누를 수 있음 · 나머지는 옆면만 보임) */
  for (const [x, y, n, dir = 'd'] of decks) {
    const st = { l: [-0.13, 0], r: [0.13, 0], d: [0, 0.16], u: [0, -0.16] }[dir];
    for (let k = 0; k < n; k++) {
      const p = { x: x + st[0] * k, y: oy + y + st[1] * k, z: k, deck: 1 };
      if (out.some(b => !b.deck && Math.abs(b.x - p.x) < 1 && Math.abs(b.y - p.y) < 1)) break;
      out.push(p);
    }
  }
  /* 3의 배수: 위가 덮인 맨 아래 타일을 가운데부터 뺌 → 없으면 맨 위층 바깥쪽 */
  const cov = t => out.some(b => b.z > t.z && Math.abs(b.x - t.x) < 1 && Math.abs(b.y - t.y) < 1);
  const holds = t => out.filter(u => u.z === t.z + 1 && Math.abs(u.x - t.x) < 1 && Math.abs(u.y - t.y) < 1).every(u => out.some(v => v !== t && v.z === t.z && Math.abs(u.x - v.x) < 1 && Math.abs(u.y - v.y) < 1));
  const cx = 3, cy = 3.5 + y0;
  for (let n = out.length % 3; n > 0; n--) {
    const hid = out.filter(t => t.z === 0 && !t.deck && cov(t) && holds(t)).sort((p, q) => Math.hypot(p.x - cx, p.y - cy) - Math.hypot(q.x - cx, q.y - cy));
    const zt = Math.max(...out.map(t => t.z)), alt = out.filter(t => t.z === zt).sort((p, q) => Math.hypot(q.x - cx, q.y - cy) - Math.hypot(p.x - cx, p.y - cy));
    const kill = hid[0] || alt[0]; out.splice(out.indexOf(kill), 1);
  }
  return out;
}
/* 판 이름 = 모양_어긋남층수(장 수는 tools/board_stats.mjs 로 확인) · 쉬움 → 어려움 순 */
export const LAYOUTS = {
  /* 연습 · 쉬움 (2층 · 33~66장 · 처음 노출 12~22장 · 바로 셋 맞는 그림이 2~4개 보여 규칙을 익힘) */
  tiny_h2: () => build('tiny', { layers: 2 }),
  small_h2: () => build('small', { layers: 2 }),
  heart_q2: () => build('heart', { layers: 2, mode: 'quarter', top: 'checker' }),
  diamond_h2: () => build('diamond', { layers: 2 }),
  islands_h2: () => build('islands', { layers: 2 }),
  flower_h3: () => build('flower', { layers: 3 }),
  star_h3: () => build('star', { layers: 3 }),
  ring_h2: () => build('ring', { layers: 2 }),
  /* 일반 (3~4층 · 48~99장 · 처음 노출 5~18장) */
  diamond_h3: () => build('diamond', { layers: 3 }),
  heart_h3: () => build('heart', { layers: 3 }),
  xshape_q3: () => build('xshape', { layers: 3, mode: 'quarter' }),
  butterfly_h3: () => build('butterfly', { layers: 3, top: 'checker' }),
  ibeam_h3: () => build('ibeam', { layers: 3 }),
  arch_q3: () => build('arch', { layers: 3, mode: 'quarter' }),
  circle_h3: () => build('circle', { layers: 3, top: 'checker' }),
  islands_q3: () => build('islands', { layers: 3, mode: 'quarter', decks: [[3, 3.4, 4, 'r']] }),
  stairs_q3: () => build('stairs', { layers: 3, mode: 'quarter' }),
  house_h3: () => build('house', { layers: 3 }),
  leaf_q3: () => build('leaf', { layers: 3, mode: 'quarter' }),
  rect5_d3: () => build('rect5', { layers: 3, decks: [[0, 1, 4], [6, 1, 4]] }),
  cross_h3: () => build('cross', { layers: 3 }),
  crown_h4: () => build('crown', { layers: 4 }),
  tower_h3: () => build('tower', { layers: 3, top: 'checker' }),
  /* 어려움 (4~5층 · 75~111장 · 처음 노출 10~16장 · 측면 더미) */
  vase_h4: () => build('vase', { layers: 4 }),
  bowtie_h4: () => build('bowtie', { layers: 4, top: 'checker' }),
  pillars_q4: () => build('pillars', { layers: 4, mode: 'quarter' }),
  tower_h4: () => build('tower', { layers: 4 }),
  wide_h4: () => build('wide', { layers: 4, decks: [[0, 6.6, 4, 'r'], [6, 6.6, 4, 'l']] }),
  twins_q4: () => build('twins', { layers: 4, mode: 'quarter', decks: [[3, 1, 5], [3, 5.5, 5]] }),
  circle_h4: () => build('circle', { layers: 4 }),
  butterfly_h4: () => build('butterfly', { layers: 4 }),
  /* 보스 (4~5층 · 138~159장 · 처음 노출 8~12장) */
  rect_h4: () => build('rect', { layers: 4, top: 'checker' }),
  rect_h5: () => build('rect', { layers: 5 }),
  rect_q5: () => build('rect', { layers: 5, mode: 'quarter', top: 'checker' }),
};
export function layout(name = 'diamond_h3') {
  return LAYOUTS[name]().map((p, i) => ({ x: p.x, y: p.y, z: p.z, id: i, iceAt: 0, chain: false }));
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

/* 깊이로 흩어 붙이기 (2026-11-02 원작 해부: '같은 그림 세 장이 멀리 떨어져 있을수록 칸이 빨리 막힘' · 맨 위에 셋이 같이 드러나는 일은 드묾)
   벗기는 순서를 따라가며 묶음(같은 그림 3장)을 여는데, 동시에 열린 묶음 수가 아니라 '정답대로 두었을 때 칸에 남는 장 수'(hold ≤ 6)로 묶음
   → 열린 묶음이 칸에 1장씩만 있으면 4~6묶음까지 동시에 열림(원작처럼 넓게 흩어짐) · 그래도 정답 순서의 칸은 hold 장을 넘지 않아 반드시 풀림
   spread: 새 묶음을 열 확률(클수록 세 장이 멀리 · 깊이 흩어짐) · old: 이어 붙일 때 가장 오래된 묶음을 고를 확률(한 묶음이 끝없이 늘어지지 않게) */
export function assignDepth(tiles, typesPool, rand, { hold = 6, spread = 0.55, old = 0.5, zw = 0.6, taps0 = 0 } = {}) {
  const order = peel(tiles, rand, zw, taps0); if (!order) return null;
  const groups = typesPool.slice();
  for (let i = groups.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [groups[i], groups[j]] = [groups[j], groups[i]]; }
  const open = []; let gi = 0, inTray = 0;
  for (let i = 0; i < order.length; i++) {
    const R = order.length - i, need = open.reduce((a, g) => a + 3 - g.c, 0);
    /* 칸이 hold 장으로 꽉 찰 때는 셋째 장을 기다리는 묶음(2장)이 있어야 다음 수가 생김 → 그런 묶음이 없으면 새 묶음을 열지 않음 */
    const canNew = gi < groups.length && (inTray + 1 < hold || (inTray + 1 === hold && open.some(g => g.c === 2))) && R - need >= 3;
    const grow = open.filter(g => g.c === 2 || inTray + 1 <= hold);
    let g;
    if (canNew && (!grow.length || rand() < spread)) { g = { type: groups[gi++], c: 0 }; open.push(g); }
    else if (grow.length) g = rand() < old ? grow[0] : grow[Math.floor(rand() * grow.length)];
    else return null;
    order[i].type = g.type; g.c++; inTray++;
    if (g.c === 3) { open.splice(open.indexOf(g), 1); inTray -= 3; }
  }
  return open.length ? null : order.map(t => t.id);
}
/* 그림 묶음 나누기: 장 수 / 3 묶음을 종류에 나눠 줌 · skew > 0 이면 어떤 그림은 2~3묶음, 어떤 그림은 1묶음 (원작의 '고르지 않은 분포' — 고르면 쉬움) */
function pool(types, groups, rand, skew = 0) {
  const n = Math.min(types.length, groups), cnt = Array(n).fill(1);
  for (let g = n; g < groups; g++) cnt[rand() < skew ? Math.floor(rand() * rand() * n) : g % n]++;
  const out = []; cnt.forEach((c, i) => { for (let k = 0; k < c; k++) out.push(types[i]); });
  return out;
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
    /* 셋이 안 맞은 채 칸이 다 차면 실제 게임에선 실패 */
    if (tray.length >= slots) return { ok: false, why: '칸 가득', peak };
  }
  return { ok: left.length === 0 && tray.length === 0, peak };
}

/* 판 만들기: cfg = { layout, types(그림 번호 목록), hold · spread · old · zw · skew(깊이로 흩어 붙이기), top(처음 노출 중 바로 셋 맞는 그림 최대 수) · same(처음 노출에 같은 그림 최대 장 수), ice, chain, ease(같은 판 실패 횟수) }
   ease: 원작처럼 다시 할수록 조금씩 쉬워짐(새 묶음 확률 ↓ · 바로 셋 허용 ↑ · 최대 3번까지) — 판 모양은 그대로 */
export function makeLevel(seed, cfg = {}) {
  const { layout: lname = 'diamond_h3', types = [0, 1, 2, 3, 4, 5, 6, 7, 8], hold = 6, spread = 0.55, old = 0.5, zw = 0.6, skew = 0, top = 9, same = 9, ice = 0, chain = 0, ease = 0 } = cfg;
  const e = Math.min(3, ease || 0), sp = spread * (1 - 0.15 * e), tp = top + e;
  const rand = rng(seed);
  let best = null;
  for (let tries = 0; tries < 160; tries++) {
    const tiles = layout(lname);
    const order = assignDepth(tiles, pool(types, tiles.length / 3, rand, skew), rand, { hold, spread: sp, old, zw }); if (!order) continue;
    if (ice || chain) obstacles(tiles, order, rand, { ice, chain });
    const v = verify(tiles, order); if (!v.ok) continue;
    /* 처음 화면: 누를 수 있는 타일 중 셋이 바로 맞는 그림 수 ≤ tp · 둘이 보이는 그림(미끼 · 실마리)은 하나 이상 */
    const f = freeOf(tiles), c = {}; f.forEach(t => { c[t.type] = (c[t.type] || 0) + 1; });
    const t3 = Object.values(c).filter(n => n >= 3).length, t2 = Object.values(c).filter(n => n === 2).length;
    const lv = { tiles, solution: order, peak: v.peak };
    if (t3 <= tp && t2 + t3 >= 1 && Math.max(...Object.values(c)) <= same + e) return lv;
    if (!best || t3 < best.t3) best = { ...lv, t3 };
  }
  if (best) { delete best.t3; return best; }
  throw new Error('판 만들기 실패');
}
