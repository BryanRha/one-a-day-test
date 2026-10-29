// 걷는 곳 (2026-10-29 · 대표 피드백 "건물 위로 캐릭터가 막 다니고")
//   배경마다 '걸을 수 있는 영역'(길 · 잔디 · 마당 · 데크 다각형 + 길 띠)과 '막힌 영역'(건물 · 조리대 · 식탁 · 호수 · 지은 시설)을 격자로 굽고
//   A* 로 길을 찾은 뒤 보이는 곳끼리 이어 붙여(줄 당기기) 꺾인 점만 남김 → sim(시간 계산) · 화면(걷기)이 같은 길을 씀
//   구역마다 다각형에 zone 이 붙어 있어, 구역이 열리면 그 구역의 걷는 곳이 함께 붙음 (rebuild)
//   화면 없이도 돎 (봇이 같이 씀)
const CELL = 8, GW = 90, GH = 210;   /* 판 720 × 1680 (화면 아래 입구 길까지) */
let grid = new Uint8Array(GW * GH), pgrid = new Uint8Array(GW * GH), MAP = null, openZones = new Set(['lawn']), extraBlocks = [];
const inPoly = (x, y, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const segD = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L)) : 0; return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy); };
const inShape = (x, y, s) => s.poly ? inPoly(x, y, s.poly) : s.line ? s.line.some((a, i) => i && segD(x, y, s.line[i - 1], a) <= s.r) : s.ell ? ((x - s.ell[0]) / s.ell[2]) ** 2 + ((y - s.ell[1]) / s.ell[3]) ** 2 <= 1 : false;
/* map = { walk: [{ zone, poly | line+r }], block: [{ zone?, poly | ell }] } (판 좌표) · extra = 지은 시설 같은 움직이는 막힘 */
export function setMap(map) { MAP = map; rebuild(); }
/* ── 길 그래프: 길 위 점을 이은 선만 따라감 · 시작 · 끝은 가장 가까운 길 토막에 수직으로 짧은 가지 ── */
let GRAPH = null; const branches = new Map();
export function setGraph(g) { GRAPH = g; cache.clear(); }
const nodeOpen = id => { const n = GRAPH.nodes[id]; return n && (!n[2] || openZones.has(n[2])); };
export const activeEdges = () => GRAPH ? GRAPH.edges.filter(([a, b]) => nodeOpen(a) && nodeOpen(b)) : [];
function proj(p) { let best = null; for (const [a, b] of activeEdges()) { const A = GRAPH.nodes[a], B = GRAPH.nodes[b], dx = B[0] - A[0], dy = B[1] - A[1], L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / L)) : 0, q = [A[0] + t * dx, A[1] + t * dy], d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (!best || d < best.d) best = { a, b, t, q, d }; } return best; }
export const pathDist = (x, y) => { let m = 1e9; for (const [a, b] of activeEdges()) m = Math.min(m, segD(x, y, GRAPH.nodes[a], GRAPH.nodes[b])); return m; };
export const branchDist = (x, y) => { let m = 1e9; for (const [, s] of branches) m = Math.min(m, segD(x, y, s[0], s[1])); return m; };
export const branchList = () => [...branches.values()];
/* 서는 자리(자리 · 조리대 옆 · 집)를 미리 길에 잇기 (가지 등록) */
export function addAnchor(p) { const q = GRAPH && proj(p); if (q) addBranch(p, q.q); }
const addBranch = (p, q) => { if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 1) return; branches.set(`${Math.round(p[0])},${Math.round(p[1])}`, [[...p], [...q]]); if (branches.size > 3000) branches.clear(); };
function graphRoute(a, b) {
  const pa = proj(a), pb = proj(b); if (!pa || !pb) return null; const N = GRAPH.nodes;
  let mid;
  if ((pa.a === pb.a && pa.b === pb.b) || (pa.a === pb.b && pa.b === pb.a)) mid = [];
  else { /* 다익스트라: 시작 토막 양 끝 → 끝 토막 양 끝 */
    const adj = {}; for (const [u, v] of activeEdges()) { const L = Math.hypot(N[u][0] - N[v][0], N[u][1] - N[v][1]); (adj[u] ||= []).push([v, L]); (adj[v] ||= []).push([u, L]); }
    const dist = {}, prev = {}, done = new Set(); const dA = id => Math.hypot(N[id][0] - pa.q[0], N[id][1] - pa.q[1]);
    dist[pa.a] = dA(pa.a); dist[pa.b] = dA(pa.b);
    for (;;) { let u = null; for (const k in dist) if (!done.has(k) && (u === null || dist[k] < dist[u])) u = k; if (u === null) break; done.add(u); for (const [v, L] of adj[u] || []) if (!done.has(v) && (dist[v] === undefined || dist[u] + L < dist[v])) { dist[v] = dist[u] + L; prev[v] = u; } }
    const dB = id => (dist[id] ?? 1e9) + Math.hypot(N[id][0] - pb.q[0], N[id][1] - pb.q[1]); const end = dB(pb.a) <= dB(pb.b) ? pb.a : pb.b; if (dist[end] === undefined) return null;
    mid = []; for (let k = end; k !== undefined; k = prev[k]) mid.unshift([N[k][0], N[k][1]]); }
  addBranch(a, pa.q); addBranch(b, pb.q);
  const out = [[...a]]; const push = p => { const l = out[out.length - 1]; if (Math.hypot(l[0] - p[0], l[1] - p[1]) > 0.5) out.push([...p]); };
  push(pa.q); mid.forEach(push); push(pb.q); push(b); return smooth(out);
}
/* 모퉁이는 부드럽게 (꼭짓점 앞뒤 r 만큼을 곡선으로) */
function smooth(p) { if (p.length < 3) return p; const out = [p[0]];
  for (let i = 1; i < p.length - 1; i++) { const A = p[i - 1], B = p[i], C = p[i + 1], l1 = Math.hypot(B[0] - A[0], B[1] - A[1]), l2 = Math.hypot(C[0] - B[0], C[1] - B[1]); const r = Math.min(12, l1 * 0.35, l2 * 0.35); if (r < 2) { out.push(B); continue; }
    const P1 = [B[0] + (A[0] - B[0]) * r / l1, B[1] + (A[1] - B[1]) * r / l1], P2 = [B[0] + (C[0] - B[0]) * r / l2, B[1] + (C[1] - B[1]) * r / l2];
    for (let k = 0; k <= 3; k++) { const t = k / 3, u = 1 - t; out.push([u * u * P1[0] + 2 * u * t * B[0] + t * t * P2[0], u * u * P1[1] + 2 * u * t * B[1] + t * t * P2[1]]); } }
  out.push(p[p.length - 1]); return out; }
export function setOpen(zones) { openZones = new Set(zones); rebuild(); cache.clear(); }
export function setExtra(blocks) { extraBlocks = blocks; rebuild(); }
export function rebuild() {
  if (!MAP) return; grid = new Uint8Array(GW * GH); cache.clear();
  const walks = MAP.walk.filter(s => !s.zone || openZones.has(s.zone)), blocks = [...MAP.block, ...extraBlocks];
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) { const x = gx * CELL + CELL / 2, y = gy * CELL + CELL / 2;
    if (walks.some(s => inShape(x, y, s)) && !blocks.some(s => inShape(x, y, s))) grid[gy * GW + gx] = 1; }
  /* 길 찾기용 격자: 막힌 곳에서 한 칸 떨어진 칸만 (걷는 그림이 살짝 흔들려도 막힌 곳에 안 닿게) */
  pgrid = new Uint8Array(GW * GH); for (let gy = 1; gy < GH - 1; gy++) for (let gx = 1; gx < GW - 1; gx++) { let ok = 1; for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) if (!grid[(gy + dy) * GW + gx + dx]) { ok = 0; break; } pgrid[gy * GW + gx] = ok; }
}
const cellOf = (x, y) => [Math.max(0, Math.min(GW - 1, Math.floor(x / CELL))), Math.max(0, Math.min(GH - 1, Math.floor(y / CELL)))];
export const walkable = (x, y) => { if (x < 0 || x >= GW * CELL || y < 0 || y >= GH * CELL) return false; const [gx, gy] = cellOf(x, y); return grid[gy * GW + gx] === 1; };
/* 가장 가까운 걷는 칸 (목표가 막힌 칸이면) */
export function nearest(x, y, gr = grid) { const [cx0, cy0] = cellOf(x, y); if (gr[cy0 * GW + cx0]) return [x, y]; const [cx, cy] = [cx0, cy0];
  for (let r = 1; r < 40; r++) { let best = null, bd = 1e9; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const gx = cx + dx, gy = cy + dy; if (gx < 0 || gy < 0 || gx >= GW || gy >= GH || !gr[gy * GW + gx]) continue; const px = gx * CELL + CELL / 2, py = gy * CELL + CELL / 2, d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = [px, py]; } } if (best) return best; }
  return [x, y]; }
/* 두 점 사이가 걷는 칸만 지나는가 (줄 당기기 · 검사) */
export function clear(a, b, gr = grid) {   /* 선이 지나는 모든 칸을 빠짐없이 (격자 따라 걷기 · 모서리만 스쳐도 검사) */
  let x = a[0] / CELL, y = a[1] / CELL; const x1 = b[0] / CELL, y1 = b[1] / CELL, dx = x1 - x, dy = y1 - y;
  let cx = Math.floor(x), cy = Math.floor(y); const ex = Math.floor(x1), ey = Math.floor(y1), sx = Math.sign(dx), sy = Math.sign(dy);
  const tdx = dx ? Math.abs(1 / dx) : Infinity, tdy = dy ? Math.abs(1 / dy) : Infinity; let tx = dx ? (sx > 0 ? (cx + 1 - x) : (x - cx)) * tdx : Infinity, ty = dy ? (sy > 0 ? (cy + 1 - y) : (y - cy)) * tdy : Infinity;
  const ok = (gx, gy) => gx >= 0 && gy >= 0 && gx < GW && gy < GH && gr[gy * GW + gx] === 1;
  for (let n = 0; n < 2000; n++) { if (!ok(cx, cy)) return false; if (cx === ex && cy === ey) return true;
    if (Math.abs(tx - ty) < 1e-9) { if (!ok(cx + sx, cy) || !ok(cx, cy + sy)) return false; cx += sx; cy += sy; tx += tdx; ty += tdy; } else if (tx < ty) { cx += sx; tx += tdx; } else { cy += sy; ty += tdy; } }
  return true; }
const cache = new Map();
/* 작은 이진 힙 (A* 열린 목록) */
function hpush(h, v) { h.push(v); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } }
function hpop(h) { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return top; }
/* 길 찾기: [시작, …꺾이는 점…,끝] (시작 · 끝이 막힌 칸이면 가까운 걷는 칸을 거쳐 감) */
export function route(a, b) {
  const key = `${Math.round(a[0])},${Math.round(a[1])}>${Math.round(b[0])},${Math.round(b[1])}`; const hit = cache.get(key); if (hit) return hit.map(p => [...p]);
  let out = GRAPH ? graphRoute(a, b) : null; if (out) { cache.set(key, out.map(p => [...p])); return out; }   /* 길 그래프가 기본 · 없을 때만 격자 */
  out = plan(a, b, pgrid); if (out && (!clear(a, out[0]) || !clear(out[out.length - 1], b))) out = null; if (!out) out = plan(a, b, grid);   /* 여유 있는 길이 없으면 (좁은 계단 등) 그냥 걷는 칸으로 */
  if (!out) { const A = nearest(a[0], a[1]), B = nearest(b[0], b[1]); out = [A, B]; }
  const A = out[0], B = out[out.length - 1];
  if (Math.hypot(a[0] - A[0], a[1] - A[1]) > 1) out.unshift([...a]); if (Math.hypot(b[0] - B[0], b[1] - B[1]) > 1) out.push([...b]);
  if (cache.size > 4000) cache.clear(); cache.set(key, out.map(p => [...p])); return out;
}
function plan(a, b, gr) {
  const A = nearest(a[0], a[1], gr), B = nearest(b[0], b[1], gr); if (clear(A, B, gr)) return [A, B];
  const [sx, sy] = cellOf(...A), [tx, ty] = cellOf(...B), N = GW * GH, g = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  if (!gr[sy * GW + sx] || !gr[ty * GW + tx]) return null;
  const open = [[0, sy * GW + sx]]; g[sy * GW + sx] = 0; const T = ty * GW + tx; let found = false;
  const h = i => { const x = i % GW, y = (i / GW) | 0, dx = Math.abs(x - tx), dy = Math.abs(y - ty); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  while (open.length) { const [, cur] = hpop(open); if (done[cur]) continue; done[cur] = 1; if (cur === T) { found = true; break; } const cx = cur % GW, cy = (cur / GW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue; const ni = ny * GW + nx; if (!gr[ni] || done[ni]) continue;
      if (dx && dy && (!gr[cy * GW + nx] || !gr[ny * GW + cx])) continue; const ng = g[cur] + (dx && dy ? 1.414 : 1); if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; hpush(open, [ng + h(ni), ni]); } } }
  if (!found) return null;
  const cells = []; for (let i = T; i !== -1; i = from[i]) cells.push([(i % GW) * CELL + CELL / 2, ((i / GW) | 0) * CELL + CELL / 2]); cells.reverse(); cells[0] = A; cells[cells.length - 1] = B;
  const out = [A]; let k = 0; while (k < cells.length - 1) { let j = cells.length - 1; while (j > k + 1 && !clear(cells[k], cells[j], gr)) j--; out.push(cells[j]); k = j; } return out;
}
/* 여러 점을 차례로 (경유지) */
export function routeVia(pts) { let out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const r = route(out[out.length - 1], pts[i]); out = out.concat(r.slice(1)); } return out; }
export const pathLen = p => { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; };
export function pointAt(p, d) { for (let i = 1; i < p.length; i++) { const L = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); if (d <= L) { const t = L ? d / L : 0; return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t]; } d -= L; } return [...p[p.length - 1]]; }
export const G = { CELL, GW, GH, graph: () => GRAPH, grid: () => grid, extra: () => extraBlocks, open: () => [...openZones] };
