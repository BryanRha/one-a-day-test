// 봇 (개입 0): 사람과 같은 입력(조이스틱 IN)으로 걷고, 책상 카드는 같은 단추 일(pads.buyDesk)을 눌러요 — 돈 · 칸 · 손님을 직접 바꾸지 않음
//   ?bot=1 (?speed=N 배속) · ?bot=human = 사람 흉내 (곧게 끌기 + 0.6~3초마다 손 뗌 · 목적 없이 돌아다님 — 실수 결제 시험 P1)
//   기록: window.__bot = { opens:[[초, id, 값]], t, err } · 시험 도구(gate_*.mjs)가 읽음
import { S } from './state.js?v=0.99.29';
import { IN } from './ui.js?v=0.99.29';
import { isDesk } from './pads.js?v=0.99.29';
import { hand } from './rules.js?v=0.99.29';
import { tableSide } from './space.js?v=0.99.29';
import { CHAIN, INTER, slotOf } from './data.js?v=0.99.29';
const DISP = ['bagel', 'cream', 'coffee', 'drink'];

export function startBot(app, q) {
  const mode = q.get('bot'), log = (window.__bot = { opens: [], t: 0, mode, coll: 0, stuck: 0 }), g0 = () => app.game;
  const az = 18 * Math.PI / 180, c = Math.cos(az), s = Math.sin(az);
  const steer = (dx, dz) => { const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L; IN.x = dx * c - dz * s; IN.y = dx * s + dz * c; };
  let path = null, pathFor = '', hold = 0, prevOwn = 0, lastPos = null, stuckT = 0, handT = 0, handSig = '';
  const go = (g, at, reach = 18) => { const p = g.pl.pos, d = Math.hypot(at[0] - p.x, at[1] - p.z); if (d <= reach) { IN.x = IN.y = 0; return true; }
    const key = at.join(','); if (key !== pathFor || !path || !path.length || stuckT > 1) { path = g.nav.path(p.x, p.z, at[0], at[1], true) || g.nav.path(p.x, p.z, at[0], at[1]) || [at];   /* 봇도 직원처럼 교차점으로 건넘 (사람은 아무 데로나 건널 수 있음 · 봇의 습관) */ pathFor = key; stuckT = 0; }
    while (path.length > 1 && Math.hypot(path[0][0] - p.x, path[0][1] - p.z) < 14) path.shift(); const w = path[0]; steer(w[0] - p.x, w[1] - p.z); return false; };
  // ── 일하는 봇: 「다음 할 일」 하나를 골라 끝까지
  const plan = (g, work) => {
    const sp = g.sp, pl = g.pl, h = hand(pl), pads = g.pads, list = pads.list.filter(p => !p.done);
    // 1. 살 수 있는 다음 칸 (여는 순서 첫 칸) · 책상 일 (사람 흉내는 건너뜀)
    const first = g.sp.order.find(o => !g.bought(o.id) && pads.req(o));
    if (!work && first && isDesk(first)) { const room = first.kind === 'hire' || /^s(walk|carry)/.test(first.id) ? 'crew' : 'boss'; if (S.coins >= first.cost) { if (pads.deskOpen === room) { pads.buyDesk(first, false); app.ui.deskRefresh(); return { k: 'wait' }; } return { k: 'desk', at: sp.rooms[room].desk, reach: 10 }; } }
    /* 여는 순서대로만 삼 (다음 칸이 책상 일이면 모아 둠 · 순서 밖 강화는 순서를 다 산 뒤에) */
    const pad = first ? list.find(p => p.o.id === first.id) : list[0];
    if (!work && pad && (pads.pour?.p === pad || S.coins + (pad.flight || 0) >= pad.cost - pad.paid) && pad.cost - pad.paid > 0) return { k: 'pad', at: pad.at, reach: 10 };   /* 붓는 중 · 날아가는 지폐도 셈 (그 사이 다른 일로 안 감) */
    // 통화 손님 · 조는 직원: 다가감 (사람이 하는 일)
    const ph = g.cust.find(c => c.phone); if (ph) return { k: 'phone', at: [ph.pos.x - 110, ph.pos.z], reach: 30 };
    const zz = g.staff.find(w => w.rest); if (zz && !work) return { k: 'wake', at: [zz.pos.x, zz.pos.z], reach: 100 };
    // 2. 쓰레기를 든 손은 먼저 비움 (쓰레기가 있으면 음식을 못 집음 · 돈 더미가 계속 생겨도 버리러 감 — R8 이 찾음: 0.4.2 첫 판 266초)
    if (h.trash) return { k: 'bin', at: sp.bin.at, reach: 50 };
    /* 음식을 12초 넘게 같은 채로 들고 돈만 줍고 다니면 먼저 내려놓음 (진열 · 못 하면 쓰레기통 — R8 이 찾음: 커피 6잔 64초) */
    if (h.food && handT > 12) return g.canDisplay(pl) ? { k: 'drop', at: sp.counter.drop, reach: 60 } : { k: 'discard', at: sp.bin.at, reach: 75 };
    /* 창구 손님이 15초 넘게 기다리면 돈 줍기보다 먼저 (창구 직원 없을 때 · K8) */
    if (g.window && g.own(sp.feat) && !g.hasStaff(sp.F.staff) && g.cust.some(c => c.win && c.state === 'wwait' && g.time - (c.at || 0) > 15)) { const w0 = g.custSys.windowNeed(), SRC = { bagel: 'oven', cream: 'top', coffee: 'cream', drink: 'coffee' };
      if (h.food && pl.stack.some(x => w0[slotOf(x.k)] > 0)) return { k: 'shelf', at: sp.window.shelf, reach: 50 };
      if (!h.full && !h.trash) { if (DISP.some(k => w0[k] > 0 && g.dispCount(k) > 0)) return { k: 'fetch', at: sp.counter.fetch, reach: 30 }; const k = DISP.find(k => w0[k] > 0 && g.trayCount(SRC[k]) > 0); if (k) return { k: 'pick', at: sp.nodes[SRC[k]].pick, reach: 50 }; } }
    // 2. 돈 더미 (다음 칸 값의 일부라도 · 오래된 더미)
    const need = pad ? pad.cost - pad.paid - S.coins : 0; const piles = g.piles.filter(p => p.v > 0).sort((a, b) => b.v - a.v);
    if (piles.length && (piles[0].v >= Math.max(1, need * 0.5) || (!h.food && !g.trays(pl).length))) return { k: 'cash', at: [piles[0].x, piles[0].z], reach: 60 };
    // 3. 쓰레기 (청소 직원 없이 자리가 막힘)
    if (h.trash) return { k: 'bin', at: sp.bin.at, reach: 50 };
    if (!g.hasStaff('cleaner') && g.seats.length && g.custSys.freeSeats().length <= 1 && !h.food) { const t = Object.values(g.tables).find(t => t.trash > 0 && !t.y && t.id !== 'bar'); if (t) return { k: 'trash', at: tableSide(sp, t), reach: 20 }; }
    // 4. 나르기: 손에 음식 → 진열 · 창구 · 빈손 → 받침
    const front = g.cust.find(x => x.state === 'order'), dispLow = ['bagel', 'cream', 'coffee', 'drink'].filter(k => g.menuKinds().includes(k)).sort((a, b) => g.dispCount(a) - g.dispCount(b));
    const win = g.window && g.own(sp.feat) ? g.custSys.windowNeed() : null; if (win && h.food && pl.stack.some(x => win[slotOf(x.k)] > 0) && !g.hasStaff(sp.F.staff)) return { k: 'shelf', at: sp.window.shelf, reach: 50 };
    /* 창구 직원이 없으면 사장이 창구를 채움 (0.4.3 K8): 창구가 기다리는 메뉴를 쌓이는 곳에서 집어 선반으로 */
    if (win && !g.hasStaff(sp.F.staff) && !h.full) { const SRC = { bagel: 'oven', cream: 'top', coffee: 'cream', drink: 'coffee' }, k = DISP.find(k => win[k] > 0 && !pl.stack.some(x => slotOf(x.k) === k) && g.trayCount(SRC[k]) > 0); if (k) return { k: 'pick', at: sp.nodes[SRC[k]].pick, reach: 50 }; }
    /* 사슬 (DESIGN 3-0): 중간 물건(반죽 · 숙성 반죽 · 데친 반죽)은 받는 곳으로 — 반죽은 숙성고 → 솥 → 오븐 순 · 데친 반죽은 오븐 (가는 길에 지나는 받는 곳이 먼저 받음) */
    const inter = pl.stack.filter(x => INTER.includes(x.k)), baker = g.staff.some(w => !w.rest && w.role === 'baker');
    if (inter.length) { const k = inter[inter.length - 1].k, order = k === 'boiled' ? ['oven'] : ['retard', 'kettle', 'oven'], dest = order.find(id => g.own(id) && sp.nodes[id]?.in && CHAIN[id].in.includes(k) && g.inRoom(id) > 0) || order.filter(id => g.own(id) && sp.nodes[id]?.in && CHAIN[id].in.includes(k)).pop(); if (dest) return { k: 'feed', at: sp.nodes[dest].in, reach: 40 }; }
    /* 작업대 받는 곳: 플레인 · 쫄깃을 들었고 작업대가 비어 가면 먼저 (토핑 직원 없을 때) */
    const feeder = g.staff.some(w => !w.rest && w.role === 'topper'), topLow = g.own('top') && g.inRoom('top') >= 3 && !feeder, hasB = pl.stack.some(x => x.k === 'bagel' || x.k === 'chewy');
    if (topLow && hasB && (g.dispCount('bagel') >= 2 || !g.nodes.top.inQ.length)) return { k: 'feed', at: sp.nodes.top.in, reach: 40 };
    /* 손 막힘 출구: 같은 손으로 12초 넘게 받아 줄 곳이 없으면 쓰레기통 앞에 서서 버림 (사람이 하는 일 · gate_rhythm 이 같은 손 상태 지속을 봄) */
    if (h.food && handT > 12 && !g.canDisplay(pl) && !(g.inRoom('top') > 0 && hasB)) return { k: 'discard', at: sp.bin.at, reach: 75 };
    const dt0 = g.trays(pl).filter(t => DISP.includes(t.k));
    if (h.food && (h.full || !dt0.length || g.dispCount(slotOf(pl.stack[0].k)) === 0)) return { k: 'drop', at: sp.counter.drop, reach: 60 };
    // 5. 계산 (계산원 없으면 사장이 계산 자리)
    if (!g.hasStaff('cashier') && front && front.order.every(o => o.got >= o.n || g.dispCount(o.k) > 0)) return { k: 'till', at: sp.counter.till, reach: 25 };
    if (topLow && !h.full && g.trayCount('oven') > 0 && g.dispCount('bagel') >= 2) return { k: 'pick', at: sp.nodes.oven.pick, reach: 50 };
    /* 오븐 받는 곳이 비어 가면 (반죽 직원 없을 때): 솥 · 숙성고 · 반죽기 쌓이는 곳에서 집음 — 진열 베이글이 넉넉하거나 오븐에 구운 것이 없을 때 */
    const ovenLow = g.own('oven') && g.nodes.oven.inQ.length <= 2 && g.trayCount('oven') < g.trayCap('oven');
    if (!baker && ovenLow && !h.full && (g.dispCount('bagel') >= 2 || !g.trayCount('oven'))) { const src = ['kettle', 'retard', 'mixer'].find(id => g.own(id) && sp.nodes[id]?.pick && g.trayCount(id) > 0); if (src) return { k: 'pick', at: sp.nodes[src].pick, reach: 50 }; }
    const tr = dt0.filter(t => !h.full).sort((a, b) => g.dispCount(a.k) - g.dispCount(b.k))[0];
    if (tr && g.dispCount(tr.k) < 12) return { k: 'pick', at: [tr.x, tr.z], reach: 50 };
    if (h.food) return { k: 'drop', at: sp.counter.drop, reach: 60 };
    if (!g.hasStaff('cashier') && front) return { k: 'till', at: sp.counter.till, reach: 25 };
    if (piles.length) return { k: 'cash', at: [piles[0].x, piles[0].z], reach: 60 };
    return { k: 'idle', at: sp.counter.till, reach: 40 };
  };
  // ── 사람 흉내 (P1): 칸 · 책상은 일부러 안 감 · 세 가지 손놀림을 섞음
  //   ① 일하러 곧게 끌기(길 찾기 없이 목표 쪽으로 · 막히면 그때만 길 따라) ② 매장 아무 데나 배회 ③ 손가락 다시 잡기(0.6~3초마다 0.3~0.6초 손 뗌)
  //   칸에 돈이 한 푼이라도 들어가면 실수 결제
  let hum = { t: 1, rest: 0, err: 0, mode: 'work', dir: [1, 0], modeT: 8 }; const humanStep = (g, dt) => { const pl = g.pl.pos;
    if (hum.rest > 0) { hum.rest -= dt; IN.x = IN.y = 0; return; } hum.t -= dt; if (hum.t <= 0) { hum.t = 0.6 + Math.random() * 2.4; hum.rest = 0.3 + Math.random() * 0.3; IN.x = IN.y = 0; return; }
    hum.modeT -= dt; if (hum.modeT <= 0) { hum.mode = Math.random() < 0.7 ? 'work' : 'wander'; hum.modeT = hum.mode === 'work' ? 6 + Math.random() * 10 : 2 + Math.random() * 4; const a = Math.random() * Math.PI * 2; hum.dir = [Math.cos(a), Math.sin(a)]; hum.err = (Math.random() - 0.5) * 0.4; }
    if (hum.mode === 'wander') { if (stuckT > 0.5) { const a = Math.random() * Math.PI * 2; hum.dir = [Math.cos(a), Math.sin(a)]; stuckT = 0; } steer(hum.dir[0], hum.dir[1]); return; }
    if (!cur || repl <= 0) { cur = plan(g, true); repl = 0.5; } repl -= dt; const d = Math.hypot(cur.at[0] - pl.x, cur.at[1] - pl.z); if (d <= cur.reach) { IN.x = IN.y = 0; return; }
    if (stuckT > 0.6 || (path && path.length)) { const key = cur.at.join(','); if (key !== pathFor || !path || stuckT > 1.5) { path = g.nav.path(pl.x, pl.z, cur.at[0], cur.at[1]) || [cur.at]; pathFor = key; stuckT = 0; } while (path.length > 1 && Math.hypot(path[0][0] - pl.x, path[0][1] - pl.z) < 20) path.shift(); const w = path[0]; if (Math.hypot(w[0] - pl.x, w[1] - pl.z) < 20) path = null; else { steer(w[0] - pl.x, w[1] - pl.z); return; } }
    const a = Math.atan2(cur.at[1] - pl.z, cur.at[0] - pl.x) + hum.err; steer(Math.cos(a), Math.sin(a)); };   /* 곧게 끌기 */
  let cur = null, repl = 0; const wd = { t: 0, x: 0, z: 0, esc: 0, dx: 0, dz: 0 };
  const tick = (dt) => { const g = g0(); if (!g?.pads) return; log.t += dt; const ok = document.querySelector('#modal #mOk'); if (ok) ok.click(); else if (document.querySelector('#modal .mback')) app.ui.close(); if (document.getElementById('mapv') && !document.getElementById('mapv').hidden) app.ui.mapClose();
    /* 같은 손 상태 지속(초) — 손에 무언가 있는데 한 개도 안 바뀌면 늘어남 · log.handMax 를 gate_rhythm 이 봄 (손 막힘 [A]) */
    { const sig = g.pl.stack.map(x => x.k).join(','); handT = sig && sig === handSig ? handT + (g.pads.pour ? 0 : dt) : 0;   /* 빼는 것은 칸에 돈을 붓는 동안뿐 (0.4.3: 칸 · 책상 · 기다림을 빼서 86분 막힘을 못 잡던 구멍을 막음) */ handSig = sig; log.handMax = Math.max(log.handMax || 0, handT); if (handT > (log.handMax0 || 0)) { log.handMax0 = handT; log.handAt = [+log.t.toFixed(1), sig, g.bi]; } }
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
