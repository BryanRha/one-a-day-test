// 봇 (개입 0): 사람과 같은 입력(조이스틱 IN)으로 걷고, 책상 카드는 같은 단추 일(pads.buyDesk)을 눌러요 — 돈 · 칸 · 손님을 직접 바꾸지 않음
//   ?bot=1 (?speed=N 배속) · ?bot=human = 사람 흉내 (곧게 끌기 + 0.6~3초마다 손 뗌 · 목적 없이 돌아다님 — 실수 결제 시험 P1)
//   기록: window.__bot = { opens:[[초, id, 값]], t, err } · 시험 도구(gate_*.mjs)가 읽음
import { S } from './state.js?v=0.99.20';
import { IN } from './ui.js?v=0.99.20';
import { isDesk } from './pads.js?v=0.99.20';
import { hand } from './rules.js?v=0.99.20';

export function startBot(app, q) {
  const mode = q.get('bot'), log = (window.__bot = { opens: [], t: 0, mode, coll: 0, stuck: 0 }), g0 = () => app.game;
  const az = 18 * Math.PI / 180, c = Math.cos(az), s = Math.sin(az);
  const steer = (dx, dz) => { const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L; IN.x = dx * c - dz * s; IN.y = dx * s + dz * c; };
  let path = null, pathFor = '', hold = 0, prevOwn = 0, lastPos = null, stuckT = 0;
  const go = (g, at, reach = 18) => { const p = g.pl.pos, d = Math.hypot(at[0] - p.x, at[1] - p.z); if (d <= reach) { IN.x = IN.y = 0; return true; }
    const key = at.join(','); if (key !== pathFor || !path || !path.length || stuckT > 1) { path = g.nav.path(p.x, p.z, at[0], at[1]) || [at]; pathFor = key; stuckT = 0; }
    while (path.length > 1 && Math.hypot(path[0][0] - p.x, path[0][1] - p.z) < 14) path.shift(); const w = path[0]; steer(w[0] - p.x, w[1] - p.z); return false; };
  // ── 일하는 봇: 「다음 할 일」 하나를 골라 끝까지
  const plan = (g, work) => {
    const sp = g.sp, pl = g.pl, h = hand(pl), pads = g.pads, list = pads.list.filter(p => !p.done);
    // 1. 살 수 있는 다음 칸 (여는 순서 첫 칸) · 책상 일 (사람 흉내는 건너뜀)
    const first = g.sp.order.find(o => !g.bought(o.id) && pads.req(o));
    if (!work && first && isDesk(first)) { const room = first.kind === 'hire' || /^s(walk|carry)/.test(first.id) ? 'crew' : 'boss'; if (S.coins >= first.cost) { if (pads.deskOpen === room) { pads.buyDesk(first, false); app.ui.deskRefresh(); return { k: 'wait' }; } return { k: 'desk', at: sp.rooms[room].desk, reach: 10 }; } }
    /* 여는 순서대로만 삼 (다음 칸이 책상 일이면 모아 둠 · 순서 밖 강화는 순서를 다 산 뒤에) */
    const pad = first ? list.find(p => p.o.id === first.id) : list[0]; if (!work && pad && S.coins >= pad.cost - pad.paid && pad.cost - pad.paid > 0) return { k: 'pad', at: pad.at, reach: 10 };
    // 통화 손님 · 조는 직원: 다가감 (사람이 하는 일)
    const ph = g.cust.find(c => c.phone); if (ph) return { k: 'phone', at: [ph.pos.x - 110, ph.pos.z], reach: 30 };
    const zz = g.staff.find(w => w.rest); if (zz && !work) return { k: 'wake', at: [zz.pos.x, zz.pos.z], reach: 100 };
    // 2. 돈 더미 (다음 칸 값의 일부라도 · 오래된 더미)
    const need = pad ? pad.cost - pad.paid - S.coins : 0; const piles = g.piles.filter(p => p.v > 0).sort((a, b) => b.v - a.v);
    if (piles.length && (piles[0].v >= Math.max(1, need * 0.5) || (!h.food && !g.trays(pl).length))) return { k: 'cash', at: [piles[0].x, piles[0].z], reach: 60 };
    // 3. 쓰레기 (청소 직원 없이 자리가 막힘)
    if (h.trash) return { k: 'bin', at: sp.bin.at, reach: 50 };
    if (!g.hasStaff('cleaner') && g.seats.length && g.custSys.freeSeats().length <= 1 && !h.food) { const t = Object.values(g.tables).find(t => t.trash > 0 && !t.y && t.id !== 'bar'); if (t) return { k: 'trash', at: [t.x + 100, t.z], reach: 20 }; }
    // 4. 나르기: 손에 음식 → 진열 · 창구 · 빈손 → 받침
    const front = g.cust.find(x => x.state === 'order'), dispLow = ['bagel', 'cream', 'coffee', 'drink'].filter(k => g.menuKinds().includes(k)).sort((a, b) => g.dispCount(a) - g.dispCount(b));
    const win = g.window && g.own(sp.feat) ? g.custSys.windowNeed() : null; if (win && h.food && pl.stack.some(x => win[x.k] > 0) && !g.hasStaff(sp.F.staff)) return { k: 'shelf', at: sp.window.shelf, reach: 50 };
    if (h.food && (h.full || !g.trays(pl).length || g.dispCount(pl.stack[0].k) === 0)) return { k: 'drop', at: sp.counter.drop, reach: 60 };
    // 5. 계산 (계산원 없으면 사장이 계산 자리)
    if (!g.hasStaff('cashier') && front && front.order.every(o => o.got >= o.n || g.dispCount(o.k) > 0)) return { k: 'till', at: sp.counter.till, reach: 25 };
    const tr = g.trays(pl).filter(t => !h.full).sort((a, b) => g.dispCount(a.k) - g.dispCount(b.k))[0];
    if (tr && g.dispCount(tr.k) < 12) return { k: 'pick', at: [tr.x, tr.z], reach: 50 };
    if (h.food) return { k: 'drop', at: sp.counter.drop, reach: 60 };
    if (!g.hasStaff('cashier') && front) return { k: 'till', at: sp.counter.till, reach: 25 };
    if (piles.length) return { k: 'cash', at: [piles[0].x, piles[0].z], reach: 60 };
    return { k: 'idle', at: sp.counter.till, reach: 40 };
  };
  // ── 사람 흉내 (P1): 일만 함(칸 · 책상은 일부러 안 감) · 목표 쪽으로 곧게 끌고 0.6~3초마다 손을 떼 0.2~0.8초 멈춤(아무 데서나) · 조금씩 빗나감 — 칸에 돈이 들어가면 실수 결제
  let hum = { t: 0.6 + Math.random() * 2.4, rest: 0, err: 0 }; const humanStep = (g, dt) => { const pl = g.pl.pos;
    if (hum.rest > 0) { hum.rest -= dt; IN.x = IN.y = 0; return; } hum.t -= dt; if (hum.t <= 0) { hum.t = 0.6 + Math.random() * 2.4; hum.rest = 0.2 + Math.random() * 0.6; hum.err = (Math.random() - 0.5) * 0.5; IN.x = IN.y = 0; return; }
    if (!cur || repl <= 0) { cur = plan(g, true); repl = 0.5; } repl -= dt; const d = Math.hypot(cur.at[0] - pl.x, cur.at[1] - pl.z); if (d <= cur.reach) { IN.x = IN.y = 0; return; }
    const key = cur.at.join(','); if (key !== pathFor || !path || stuckT > 1) { path = g.nav.path(pl.x, pl.z, cur.at[0], cur.at[1]) || [cur.at]; pathFor = key; stuckT = 0; } while (path.length > 1 && Math.hypot(path[0][0] - pl.x, path[0][1] - pl.z) < 20) path.shift();
    const w = path[0], a = Math.atan2(w[1] - pl.z, w[0] - pl.x) + hum.err; steer(Math.cos(a), Math.sin(a)); };
  let cur = null, repl = 0; const wd = { t: 0, x: 0, z: 0, esc: 0, dx: 0, dz: 0 };
  const tick = (dt) => { const g = g0(); if (!g?.pads) return; log.t += dt; const ok = document.querySelector('#modal #mOk'); if (ok) ok.click(); else if (document.querySelector('#modal .mback')) app.ui.close(); if (document.getElementById('mapv') && !document.getElementById('mapv').hidden) app.ui.mapClose();
    if (log.bi !== g.bi) { log.bi = g.bi; prevOwn = g.br.own.length; log.enter = log.enter || {}; log.enter[g.bi] = +log.t.toFixed(1); }
    const n = g.br.own.length; if (n !== prevOwn) { for (const id of g.br.own.slice(prevOwn)) log.opens.push([+log.t.toFixed(1), id, g.bi, g.sp.order.find(o => o.id === id)?.cost || 0]); prevOwn = n; }
    if (mode === 'human') { const p0 = g.pl.pos; if (lastPos) stuckT = Math.hypot(p0.x - lastPos[0], p0.z - lastPos[1]) < 1 && (IN.x || IN.y) ? stuckT + dt : 0; lastPos = [p0.x, p0.z]; return humanStep(g, dt); }
    const p = g.pl.pos; if (lastPos) { stuckT = Math.hypot(p.x - lastPos[0], p.z - lastPos[1]) < 1 && (IN.x || IN.y) ? stuckT + dt : 0; } lastPos = [p.x, p.z];
    /* 몸이 끼면(5초 동안 30cm 도 못 감) 0.6초 반대쪽으로 빠져나온 뒤 길을 다시 찾음 — 봇의 손놀림일 뿐 게임 상태는 안 건드림 */
    wd.t += dt; if (Math.hypot(p.x - wd.x, p.z - wd.z) > 30 || (!IN.x && !IN.y)) { wd.t = 0; wd.x = p.x; wd.z = p.z; }
    if (wd.esc > 0) { wd.esc -= dt; steer(wd.dx, wd.dz); return; } if (wd.t > 5) { log.stuck++; wd.t = 0; const a = Math.random() * Math.PI * 2; wd.dx = Math.cos(a); wd.dz = Math.sin(a); wd.esc = 0.6; path = null; return; }
    repl -= dt; if (!cur || repl <= 0 || cur.done) { cur = plan(g); repl = 0.35; }
    log.cur = cur.k; log.at = cur.at; log.path = path && path.slice(0, 3);
    if (cur.k === 'wait') { IN.x = IN.y = 0; return; }
    if (go(g, cur.at, cur.reach)) { IN.x = IN.y = 0; if (cur.k === 'pad' || cur.k === 'desk') repl = Math.min(repl, 0.1); }
    if (g.br.own.includes('next') && S.bi === g.bi && g.bi < 3) { log.next = log.next || log.t; }
  };
  /* 게임 한 프레임마다 (배속이면 여러 번) — game.update 를 감싸서 같은 dt 로 */
  const up = app.game.update.bind(app.game); app.game.update = (dt, I) => { try { tick(dt); } catch (e) { log.err = String(e); } up(dt, I); };
  prevOwn = app.game.br.own.length;
}
