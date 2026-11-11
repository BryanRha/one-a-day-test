// ③ 이동 · 충돌 하나 — 장애물 표(space.js obstacles) 1벌 → 격자 1벌 → 사장 · 직원 · 봇이 같은 길 찾기와 같은 밀어내기
//   손님은 정해진 고리(줄 · 통로 · 나감 길) 위를 걸어서 길 찾기가 필요 없어요 (space.js entryPath · seatPath · exitPath)
import { R } from './space.js?v=0.99.25';

const CELL = 20, X0 = -640, Z0 = -40, X1 = 1640, Z1 = 1840, NX = Math.ceil((X1 - X0) / CELL), NZ = Math.ceil((Z1 - Z0) / CELL);
export class Nav {
  constructor(sp) { this.sp = sp; this.active = []; this.grid = new Uint8Array(NX * NZ); }
  /* open(id) 로 지금 있는 장애물만 고름 (열린 시설 몸통 · 잠긴 방) → 격자를 다시 만듦 */
  rebuild(open, roomOpen) {
    this.active = this.sp.obstacles.filter(o => o.lockedRoom ? !roomOpen(o.lockedRoom) : !o.need || open(o.need));
    const g = this.grid, sg = (this.sgrid ||= new Uint8Array(NX * NZ)), r = R.owner + 4; g.fill(0); sg.fill(0);
    for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) { const x = X0 + (ix + 0.5) * CELL, z = Z0 + (iz + 0.5) * CELL, i = iz * NX + ix, inn = this.inside(x, z); if (!inn || this.hit(x, z, r)) g[i] = sg[i] = 1; else if (this.hit(x, z, r, false, true)) sg[i] = 1; }   /* grid = 사장 · 봇 · sgrid = 직원 (직원 통로 규칙 더함) */
    this.ver = (this.ver || 0) + 1;
  }
  /* 걸을 수 있는 바닥 (본관 · 별채 · 문턱) */
  inside(x, z) { const H = this.sp.hall, A = this.sp.annex; return (x > 0 && x < H.w && z > 0 && z < H.d - 10) || (x > A.x0 && x < 0 && z > A.z0 && z < A.z1); }
  hit(x, z, r, body, staff) { for (const o of this.active) if ((body && o.pathOnly) || (o.staffOnly && !staff)) continue; else if (o.rect ? rectD(o.rect, x, z) < r : Math.hypot(o.circle[0] - x, o.circle[1] - z) < o.circle[2] + r) return o; return null; }
  free(x, z, g = this.grid) { const ix = Math.floor((x - X0) / CELL), iz = Math.floor((z - Z0) / CELL); return ix >= 0 && iz >= 0 && ix < NX && iz < NZ && !g[iz * NX + ix]; }
  /* 한 걸음: 원하는 이동 → 장애물에서 밀어냄(미끄러짐) · 바닥 밖이면 안 감 */
  move(p, dx, dz, r) {
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 12));
    for (let i = 0; i < n; i++) { let x = p.x + dx / n, z = p.z + dz / n;
      for (let k = 0; k < 3; k++) { let pushed = false; for (const o of this.active) { if (o.pathOnly) continue; const q = push(o, x, z, r); if (q) { x = q[0]; z = q[1]; pushed = true; } } if (!pushed) break; }
      if (!this.inside(x, z)) { if (this.inside(x, p.z)) z = p.z; else if (this.inside(p.x, z)) x = p.x; else continue; }
      p.x = x; p.z = z; }
  }
  /* 길 찾기 (A* · 8방향) → 시선이 닿는 점만 남김 */
  path(ax, az, bx, bz, staff) {
    const c = (x, z) => [Math.max(0, Math.min(NX - 1, Math.floor((x - X0) / CELL))), Math.max(0, Math.min(NZ - 1, Math.floor((z - Z0) / CELL)))];
    let [sx, sz] = c(ax, az), [tx, tz] = c(bx, bz); const g = staff ? this.sgrid : this.grid;
    const near = (ix, iz) => { if (!g[iz * NX + ix]) return [ix, iz]; for (let r = 1; r < 12; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const x = ix + dx, z = iz + dz; if (x >= 0 && z >= 0 && x < NX && z < NZ && !g[z * NX + x]) return [x, z]; } return [ix, iz]; };
    [sx, sz] = near(sx, sz); [tx, tz] = near(tx, tz);
    const N = NX * NZ, from = new Int32Array(N).fill(-1), cost = new Float32Array(N).fill(1e9), open = [[0, sz * NX + sx]], goal = tz * NX + tx; cost[sz * NX + sx] = 0;
    const H = (i) => { const x = i % NX, z = (i / NX) | 0, dx = Math.abs(x - tx), dz = Math.abs(z - tz); return Math.max(dx, dz) + 0.41 * Math.min(dx, dz); };
    let it = 0;
    while (open.length && it++ < 40000) { let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i; const [, cur] = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      if (cur === goal) break; const x = cur % NX, z = (cur / NX) | 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dz) continue; const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= NX || nz >= NZ) continue; const ni = nz * NX + nx; if (g[ni]) continue;
        if (dx && dz && (g[z * NX + nx] || g[nz * NX + x])) continue; const nc = cost[cur] + (dx && dz ? 1.414 : 1); if (nc < cost[ni]) { cost[ni] = nc; from[ni] = cur; open.push([nc + H(ni), ni]); } } }
    if (from[goal] < 0 && goal !== sz * NX + sx) return null;
    const pts = []; for (let i = goal; i >= 0 && i !== sz * NX + sx; i = from[i]) pts.push([X0 + (i % NX + 0.5) * CELL, Z0 + (((i / NX) | 0) + 0.5) * CELL]);
    pts.reverse(); pts.push([bx, bz]);
    const out = []; let px = ax, pz = az;   /* 시선 줄이기 */
    for (let i = 0; i < pts.length; i++) { const nx = pts[i + 1]; if (nx && this.los(px, pz, nx[0], nx[1], g)) continue; out.push(pts[i]); [px, pz] = pts[i]; }
    return out;
  }
  los(ax, az, bx, bz, g = this.grid) { const n = Math.ceil(Math.hypot(bx - ax, bz - az) / (CELL / 2)); for (let i = 1; i <= n; i++) { const t = i / n; if (!this.free(ax + (bx - ax) * t, az + (bz - az) * t, g)) return false; } return true; }
  /* 거리 (길 찾기 기준 cm) — 시험 Q1 · Q4 가 씀 */
  dist(ax, az, bx, bz) { const p = this.path(ax, az, bx, bz); if (!p) return Infinity; let d = 0, x = ax, z = az; for (const [px, pz] of p) { d += Math.hypot(px - x, pz - z); x = px; z = pz; } return d; }
}
export function rectD(r, x, z) { const dx = Math.max(r[0] - x, 0, x - r[2]), dz = Math.max(r[1] - z, 0, z - r[3]); return Math.hypot(dx, dz); }
function push(o, x, z, r) {
  if (o.circle) { const [cx, cz, cr] = o.circle, d = Math.hypot(x - cx, z - cz), m = cr + r; if (d >= m) return null; const k = d ? m / d : 1; return d ? [cx + (x - cx) * k, cz + (z - cz) * k] : [cx + m, cz]; }
  const [x0, z0, x1, z1] = o.rect, qx = Math.max(x0, Math.min(x, x1)), qz = Math.max(z0, Math.min(z, z1)), dx = x - qx, dz = z - qz, d = Math.hypot(dx, dz);
  if (d >= r) return null;
  if (d > 0) return [qx + dx / d * r, qz + dz / d * r];
  const L = x - x0, Rr = x1 - x, T = z - z0, B = z1 - z, m = Math.min(L, Rr, T, B);   /* 안에 들어감: 가장 가까운 변으로 */
  return m === L ? [x0 - r, z] : m === Rr ? [x1 + r, z] : m === T ? [x, z0 - r] : [x, z1 + r];
}
/* 사람끼리 부드럽게 비켜남 (같은 규칙 하나): 서로 반지름 합보다 가까우면 반씩 밀어냄 · fixed 는 안 밀림 */
export function separate(people, nav) {
  for (let i = 0; i < people.length; i++) for (let j = i + 1; j < people.length; j++) { const a = people[i], b = people[j]; if (a.ghost || b.ghost || (a.y || 0) !== (b.y || 0)) continue;
    const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, d = Math.hypot(dx, dz), m = a.r + b.r; if (d >= m || d < 0.01) continue;
    const o = (m - d), ux = dx / d, uz = dz / d, wa = a.fixed ? 0 : b.fixed ? 1 : 0.5, wb = 1 - wa; if (a.fixed && b.fixed) continue;
    if (wa) nav.move(a.pos, -ux * o * wa, -uz * o * wa, a.r); if (wb) nav.move(b.pos, ux * o * wb, uz * o * wb, b.r); }
}
