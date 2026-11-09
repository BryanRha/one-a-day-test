// 방 모양 → 걸을 수 있는 곳 · 벽 · 높이 · 길 찾기 (직원 · 손님 · 안내 화살표)
//   사장님: 열린 방(+ 연결 통로)만 걸음 · 벽에 막힘 · 손님/직원(npc): + 매장 앞 거리
//   길 찾기: 50 칸 격자 BFS → 보이는 가장 먼 점으로 줄임(직선으로 갈 수 있으면 바로)
import { ROOMS, DOOR_W, WALL_T, STAIRS, STREET, inRect } from './layout.js?v=0.99.14';
const CELL = 50, X0 = -1350, Z0 = -1250, NX = 60, NZ = 58;
/* 문 위치: 방 rect 의 변(N 위 = z0 · S 아래 = z1 · W 왼 = x0 · E 오른 = x1) 위 at 에서 폭 DOOR_W */
export function doorBox(r, d) { const [x0, z0, x1, z1] = r, h = DOOR_W / 2;
  if (d.side === 'N') return { x: d.at, z: z0, axis: 'x', a: d.at - h, b: d.at + h }; if (d.side === 'S') return { x: d.at, z: z1, axis: 'x', a: d.at - h, b: d.at + h };
  if (d.side === 'W') return { x: x0, z: d.at, axis: 'z', a: d.at - h, b: d.at + h }; return { x: x1, z: d.at, axis: 'z', a: d.at - h, b: d.at + h }; }
/* 열린 방 목록 → { rects 사장님이 걷는 곳 · npc 손님/직원 · walls 벽 상자 [x,z,반가로,반세로, 높이, 바깥쪽?] · raised 2층 } */
export function geom(open, feat) {
  const rects = [], walls = [], seen = new Set();
  for (const id of open) { const R = ROOMS[id]; if (!R) continue; rects.push(R.rect); if (R.link) rects.push(R.link); }
  /* 특색 방 연결 통로 (방끼리 모서리로만 닿는 곳): 픽업 · 드라이브스루 = 매장 오른쪽 앞 · 테라스 = 왼쪽 앞 */
  if (open.has('pickup') || open.has('drive')) rects.push([470, 440, 660, 720]);
  if (open.has('terrace')) rects.push([-260, 440, -90, 720]);
  const seg = (x0, z0, x1, z1, h, front) => { const k = [x0, z0, x1, z1].map(Math.round).join(','); if (seen.has(k)) return; seen.add(k);
    walls.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: Math.max(WALL_T / 2, Math.abs(x1 - x0) / 2), hd: Math.max(WALL_T / 2, Math.abs(z1 - z0) / 2), h, front }); };
  /* 벽에 문 구멍 내기 */
  const side = (a, b, fixed, axis, gaps, h, front) => { let s = a; for (const [g0, g1] of gaps.sort((p, q) => p[0] - q[0])) { if (g0 > s) axis === 'x' ? seg(s, fixed, g0, fixed, h, front) : seg(fixed, s, fixed, g0, h, front); s = Math.max(s, g1); } if (s < b) axis === 'x' ? seg(s, fixed, b, fixed, h, front) : seg(fixed, s, fixed, b, h, front); };
  for (const id of open) { const R = ROOMS[id]; if (!R || R.kind !== 'encl') continue; const [x0, z0, x1, z1] = R.rect, ds = (R.doors || []).map(d => ({ ...doorBox(R.rect, d), side: d.side }));
    const gaps = s => ds.filter(d => d.side === s).map(d => [d.a, d.b]);
    /* 이웃 방(같은 변을 쓰는 방)의 문도 구멍으로 */ for (const oid of open) { const O = ROOMS[oid]; if (oid === id || !O.doors) continue; for (const d of O.doors) { const b = doorBox(O.rect, d); if (b.axis === 'x' && (b.z === z0 || b.z === z1) && b.a < x1 && b.b > x0) ds.push({ ...b, side: b.z === z0 ? 'N' : 'S' }); if (b.axis === 'z' && (b.x === x0 || b.x === x1) && b.a < z1 && b.b > z0) ds.push({ ...b, side: b.x === x0 ? 'W' : 'E' }); } }
    side(x0, x1, z0, 'x', gaps('N'), 230, false); side(z0, z1, x0, 'z', gaps('W'), 230, false); side(x0, x1, z1, 'x', gaps('S'), 70, true); side(z0, z1, x1, 'z', gaps('E'), 70, true); }   /* 앞(카메라 쪽) 벽은 낮게 잘라 방 안이 보이게 */
  /* 매대 뒤 로고 벽 (실제 매장 공통: 회색 벽 + 흰 로고) — 왼쪽은 반죽실 · 공방으로 넘어가는 통로 */
  seg(380, -450, 560, -450, 270, false);
  /* 2층: 계단 옆 난간 · 2층 뒤 끝(아래층과 높이 차) */
  if (open.has('up2')) { seg(STAIRS.x0, STAIRS.z0, STAIRS.x0, STAIRS.z1, 40, true); seg(-1250, 450, STAIRS.x0, 450, 40, false); }
  return { rects, walls, raised: open.has('up2'), npc: [...rects, STREET, [650, 1050, 1600, 1550], [-1250, 1050, -250, 1550]] };
}
/* 높이: 2층(계단은 비탈) */
export function heightAt(G, x, z) { if (!G.raised) return 0; const r = ROOMS.up2.rect; if (!inRect(r, x, z)) return 0; if (x >= STAIRS.x0 && z < STAIRS.z1) return Math.max(0, Math.min(1, (z - STAIRS.z0) / (STAIRS.z1 - STAIRS.z0))) * 150; return 150; }
export class Nav {
  constructor(G) { this.G = G; this.grid = { p: this.mk(G.rects), n: this.mk(G.npc) }; this.cache = new WeakMap(); }
  mk(rects) { const g = new Uint8Array(NX * NZ); for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const x = X0 + (i + 0.5) * CELL, z = Z0 + (j + 0.5) * CELL; g[j * NX + i] = this.free(rects, x, z, 36) ? 1 : 0; } return g; }
  /* 점이 걸을 수 있는 곳인가: 반지름 r 만큼 네 방향도 어떤 방 안 · 벽 상자와 안 겹침 */
  free(rects, x, z, r = 34) { const inAny = (px, pz) => rects.some(R => px >= R[0] && px <= R[2] && pz >= R[1] && pz <= R[3]);
    if (!inAny(x, z) || !inAny(x + r, z) || !inAny(x - r, z) || !inAny(x, z + r) || !inAny(x, z - r)) return false;
    for (const w of this.G.walls) if (Math.abs(x - w.x) < w.hw + r && Math.abs(z - w.z) < w.hd + r) return false; return true; }
  ok(x, z, r = 34) { return this.free(this.G.rects, x, z, r); }
  /* 직선으로 갈 수 있나 (25 마다 확인) */
  clear(ax, az, bx, bz, npc) { const R = npc ? this.G.npc : this.G.rects, l = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(l / 25)); for (let i = 1; i <= n; i++) { const u = i / n; if (!this.free(R, ax + (bx - ax) * u, az + (bz - az) * u, 34)) return false; } return true; }
  cellOf(x, z) { return [Math.max(0, Math.min(NX - 1, Math.floor((x - X0) / CELL))), Math.max(0, Math.min(NZ - 1, Math.floor((z - Z0) / CELL)))]; }
  /* 격자 BFS (8방향) → 칸 중심 경로 */
  path(ax, az, bx, bz, npc) { const g = npc ? this.grid.n : this.grid.p, [si, sj] = this.near(g, ...this.cellOf(ax, az)), [ti, tj] = this.near(g, ...this.cellOf(bx, bz)); if (si < 0 || ti < 0) return null;
    const prev = new Int32Array(NX * NZ).fill(-1), s = sj * NX + si, t = tj * NX + ti, q = [s]; prev[s] = s;
    for (let h = 0; h < q.length; h++) { const c = q[h]; if (c === t) break; const ci = c % NX, cj = (c / NX) | 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= NX || j >= NZ) continue; const k = j * NX + i; if (prev[k] >= 0 || !g[k]) continue; if (di && dj && (!g[cj * NX + i] || !g[j * NX + ci])) continue; prev[k] = c; q.push(k); } }
    if (prev[t] < 0) return null; const P = []; for (let c = t; c !== s; c = prev[c]) P.push([X0 + (c % NX + 0.5) * CELL, Z0 + (((c / NX) | 0) + 0.5) * CELL]); P.reverse(); P.push([bx, bz]); return P; }
  near(g, i, j) { if (g[j * NX + i]) return [i, j]; for (let r = 1; r < 6; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < NX && b < NZ && g[b * NX + a]) return [a, b]; } return [-1, -1]; }
  /* 지금 향할 점: 목표가 바로 보이면 목표 · 아니면 경로에서 보이는 가장 먼 점 (o 마다 경로 기억) */
  next(o, x, z, npc) { const p = o.pos; let c = this.cache.get(o); if (!c || c.x !== x || c.z !== z || c.npc !== npc) { c = { x, z, npc, k: 0, w: null, P: null }; this.cache.set(o, c); }
    if (c.k-- > 0 && (!c.w || Math.hypot(p.x - c.w[0], p.z - c.w[1]) > 30)) return c.w;   /* 몇 프레임마다만 다시 봄 (가벼움) */
    c.k = 10; if (this.clear(p.x, p.z, x, z, npc)) { c.w = null; c.P = null; return null; }
    if (!c.P || !c.P.length) c.P = this.path(p.x, p.z, x, z, npc); if (!c.P) { c.w = null; return null; }
    let bi = 0; for (let i = Math.min(c.P.length - 1, 10); i > 0; i--) if (this.clear(p.x, p.z, c.P[i][0], c.P[i][1], npc)) { bi = i; break; }
    c.w = c.P[bi]; c.P = c.P.slice(bi); return c.w; }
}
