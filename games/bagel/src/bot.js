// 시험용 자동 플레이 (?bot=1): 굽기 → 진열 → 계산 → 돈 줍기 → 열기 칸 · 크림치즈 · 커피 · 쓰레기
import * as THREE from 'three';
import { IN } from './ui.js?v=0.99.16';
import { S } from './state.js?v=0.99.16';
import { SIZE } from './game.js?v=0.99.16';
const SPD = +(new URLSearchParams(location.search).get('speed') || 1);
export function startBot(app) {
  let padGoal = null, padT = 0, goal = null, wait = 0, log = [], lastP = null, stuck = 0, side = 0;
  const me = { get pos() { return app.game.pl.pos; } };
  /* 길 찾기 (봇 전용): 25 칸 격자 · 벽 · 잠긴 방 · 설비 몸통을 피해 BFS → 보이는 가장 먼 칸 */
  let grid = null, gkey = '', plan = null, planT = 0; const C = 25, GX = -1300, GZ = -1200, NX = 112, NZ = 100;
  const mkGrid = g => { const key = Object.keys(g.st).length + '|' + [...g.open].join() + '|' + (g.decoObjs || []).length; if (key === gkey) return; gkey = key; grid = new Uint8Array(NX * NZ);
    const bbs = Object.values(g.st).filter(o => SIZE[o.type]).map(o => { const [hw, hd = hw] = SIZE[o.type]; return [o.x - hw - 26, o.x + hw + 26, o.z - hd - 26, o.z + hd + 26, o]; });
    for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const x = GX + (i + 0.5) * C, z = GZ + (j + 0.5) * C; grid[j * NX + i] = g.nav.ok(x, z, 30) && !bbs.some(B => x > B[0] && x < B[1] && z > B[2] && z < B[3] && !(B[4].type === 'table')) ? 1 : 0; } };
  const cell = (x, z) => [Math.max(0, Math.min(NX - 1, Math.floor((x - GX) / C))), Math.max(0, Math.min(NZ - 1, Math.floor((z - GZ) / C)))];
  const nearFree = (i, j) => { if (grid[j * NX + i]) return [i, j]; for (let r = 1; r < 8; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < NX && b < NZ && grid[b * NX + a]) return [a, b]; } return null; };
  const los = (ax, az, bx, bz) => { const l = Math.hypot(bx - ax, bz - az), n = Math.ceil(l / 12); for (let k = 1; k <= n; k++) { const [i, j] = cell(ax + (bx - ax) * k / n, az + (bz - az) * k / n); if (!grid[j * NX + i]) return false; } return true; };
  const route = (g, x, z) => { mkGrid(g); const p = g.pl.pos; if (Math.hypot(x - p.x, z - p.z) < 150 || los(p.x, p.z, x, z)) return [x, z]; const pc = cell(p.x, p.z), s0 = nearFree(...pc), t0 = nearFree(...cell(x, z)); if (!s0 || !t0) return [x, z]; if (s0[0] !== pc[0] || s0[1] !== pc[1]) return [GX + (s0[0] + 0.5) * C, GZ + (s0[1] + 0.5) * C];   /* 설비에 붙어 있으면 먼저 빈 칸으로 */
    if (!plan || plan.x !== x || plan.z !== z || g.t - planT > 1) { planT = g.t; const prev = new Int32Array(NX * NZ).fill(-1), s = s0[1] * NX + s0[0], t = t0[1] * NX + t0[0], q = [s]; prev[s] = s;
      for (let h = 0; h < q.length && prev[t] < 0; h++) { const c0 = q[h], ci = c0 % NX, cj = (c0 / NX) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= NX || j >= NZ) continue; const k = j * NX + i; if (prev[k] >= 0 || !grid[k] || (di && dj && (!grid[cj * NX + i] || !grid[j * NX + ci]))) continue; prev[k] = c0; q.push(k); } }
      const P = []; if (prev[t] >= 0) for (let c0 = t; c0 !== s; c0 = prev[c0]) P.push([GX + (c0 % NX + 0.5) * C, GZ + (((c0 / NX) | 0) + 0.5) * C]); P.reverse(); plan = { x, z, P }; }
    const P = plan.P; for (let k = Math.min(P.length - 1, 30); k >= 0; k--) if (los(p.x, p.z, P[k][0], P[k][1])) return P[k]; return P[0] || [x, z]; };
  const go = (x, z) => { const g = app.game, p = g.pl.pos, fx = x, fz = z; [x, z] = route(g, x, z); window.botW = [Math.round(x), Math.round(z)]; const fin = Math.hypot(fx - p.x, fz - p.z) < 30;   /* 다 왔는지는 최종 목표로 */
    if (side > 0) { side -= 0.1; const sx = (-(z - p.z) - (x - p.x)) / Math.SQRT2, sy = ((-(z - p.z)) + (x - p.x)) / Math.SQRT2, mm = Math.hypot(sx, sy) || 1; IN.x = sx / mm; IN.y = sy / mm; return false; }
    if (lastP && Math.hypot(p.x - lastP[0], p.z - lastP[1]) < 3 && Math.hypot(x - p.x, z - p.z) > 40) { if ((stuck += 0.1) > 0.8) { stuck = 0; side = 0.7; } } else stuck = 0; lastP = [p.x, p.z];
    const dx = x - p.x, dz = z - p.z, l = Math.hypot(dx, dz); if (fin || l < 4) { IN.x = IN.y = 0; return fin; }
    /* 세계 방향 → 화면 방향 (RIGHT=(1,-1)/√2, DOWN=(1,1)/√2) */ const sx = (dx - dz) / Math.SQRT2, sy = (dx + dz) / Math.SQRT2, m = Math.hypot(sx, sy); const k = Math.max(0.12, Math.min(1, Math.hypot(fx - p.x, fz - p.z) / (120 * SPD))); IN.x = sx / m * k; IN.y = sy / m * k; return false; };   /* 목표 가까이선 천천히 (배속이어도 칸 위에 멈춰 설 수 있게 · 0.3.2 바닥 칸은 멈춰야 동작) */
  setInterval(() => {
    const g = app.game; if (!g || !g.st) return; const pl = g.pl, c = g.st.counter, ov = g.st.oven; wait -= 0.1;
    if (document.querySelector('#modal').firstChild) { const b = document.querySelector('#modal #mOk') || document.querySelector('#modal #s1') || document.querySelector('#modal .btn'); b && b.click(); return; }
    const pad = g.pads.find(p => S.coins >= Math.min(p.s.cost - p.paid, 30)) || (S.coins > 0 ? (g.lvPads || []).filter(q => !q.free && S.coins >= (q.u.eq ? g.eqCost(q) : g.lvCost(q.u.id)) * 1.5).sort((a, b) => (a.u.eq ? g.eqCost(a) : g.lvCost(a.u.id)) - (b.u.eq ? g.eqCost(b) : g.lvCost(b.u.id)))[0] : null); const pile = g.piles.find(p => p.v > 0);
    let t;
    const mx = g.st.mixer, kt = g.st.kettle;
    if (pl.kind === 'dough') t = kt && pl.stack.some(x => !x.m.userData.b) ? [kt.Z.io.x, kt.Z.io.z] : [ov.Z.out.x, ov.Z.out.z];
    else if (!pl.stack.length && mx && mx.stack.length >= 2 && ov.stack.length < 3 && (ov.feed || []).length < 4) t = [mx.Z.out.x, mx.Z.out.z];
    else if (pl.kind === 'trash') t = [g.st.bin.Z.drop.x, g.st.bin.Z.drop.z];
    else if (pl.stack.length && pl.kind && g.st.counter.shelf[pl.kind] && g.st.counter.shelf[pl.kind].length >= 12) t = pl.kind === 'bagel' && g.st.cc && g.st.cc.inStack.length < 8 ? [g.st.cc.Z.io.x, g.st.cc.Z.io.z] : [g.st.bin.Z.drop.x, g.st.bin.Z.drop.z];
    else if (pl.stack.length) t = pl.kind === 'bagel' && g.st.cc && c.shelf.cream.length < 2 && g.st.cc.inStack.length < 4 ? [g.st.cc.x, g.st.cc.z + 135] : pl.kind === 'bagel' && g.st.drive && g.st.drive.lane.bagel.length < 4 && c.shelf.bagel.length > 6 ? [g.st.drive.Z.all.x, g.st.drive.Z.all.z] : [c.Z[pl.kind].x, c.Z[pl.kind].z];
    else if (pile && pile.v > 60 * (g.B.mult)) t = [pile.x, pile.z + 20];
    else if (pad && S.coins > 0 && !(g.cust.find(x => x.state === 'queue' && x.qi === 0)?.order.some(o => o.got < o.n && !c.shelf[o.k].length) && !g.staff.some(w => w.k === 'baker'))) t = [pad.x, pad.z];   /* 손님이 기다리는데 진열대가 비었으면 먼저 채움 (방이 멀어져서) */
    else { const tt = Object.values(g.st).find(o => o.type === 'table' && o.trash.length >= 3); const need = g.cust.find(x => x.state === 'queue' && x.qi === 0)?.order.find(o => o.got < o.n);
      if (tt && !g.staff.some(w => w.k === 'cleaner')) t = [tt.x, tt.z + (pl.pos.z < tt.z ? -125 : 125)];
      else if (need && c.shelf[need.k].length) t = g.staff.some(w => w.k === 'cashier') ? (pile ? [pile.x, pile.z + 20] : [ov.x, ov.z + 130]) : [c.Z.cash.x, c.Z.cash.z];
      else if (need && need.k === 'cream' && g.st.cc) t = g.st.cc.stack.length ? [g.st.cc.x, g.st.cc.z + 135] : [ov.x, ov.z + 130];
      else if (need && need.k === 'drink' && g.st.espresso) t = [g.st.espresso.Z.out.x, g.st.espresso.Z.out.z];
      else if (need && need.k === 'coffee' && g.st.coffee) t = [g.st.coffee.Z.out.x, g.st.coffee.Z.out.z];
      else if (pile) t = [pile.x, pile.z + 20];
      else t = [ov.x, ov.z + 130]; }
    if (pad && t && t[0] === pad.x && t[1] === pad.z && g.pads.includes(pad)) { if (padGoal !== pad) { padGoal = pad; padT = g.t; } }   /* 칸으로 가기로 했으면 도착할 때까지 (지나가며 붓기가 없어져서) */
    if (padGoal && g.pads.includes(padGoal) && S.coins > 0 && !pl.stack.length && g.t - padT < 10) t = [padGoal.x, padGoal.z]; else padGoal = null;
    const onPad = g.pads.find(q => Math.hypot(pl.pos.x - q.x, pl.pos.z - q.z) < 45);   /* 칸 위에 섰으면 다 부을 때까지 머묾 (멈춰야 붓기 · 0.3.2) */
    if (onPad && S.coins > 0 && !pl.stack.length && (g.pads.includes(onPad) ? onPad.paid < onPad.s.cost : true) && (!onPad.u || (onPad.u.eq ? g.eqCost(onPad) < S.coins : true))) t = [onPad.x, onPad.z];
    window.botT = t; go(t[0], t[1]);
  }, 100);
  setInterval(() => { const g = app.game; log.push({ t: Math.round(performance.now() / 1000), coins: S.coins, earned: S.earned, unl: g.unl.size, sold: S.totalSold, bi: S.bi }); window.botLog = log; console.log('#bot', JSON.stringify(log[log.length - 1])); }, 10000);
}
