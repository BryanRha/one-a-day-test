// ⑥ 직원 작업 목록 (DESIGN 6-3): 작업 큐 하나 + 고정 자리 — 역할마다 문턱 숫자 없음
//   큐: 「진열이 2 보다 적은 메뉴」 · 「줄 맨 앞 손님이 기다리는 메뉴」 · 「창구 손님이 기다리는 메뉴」 · 「테이블 쓰레기」가 작업을 만들어요
//   우선순위 = ① 줄 맨 앞이 기다림 ② 진열 0 ③ 진열이 가장 적음 · 직원은 작업 하나를 잠그고 가져가요 (같은 받침에 두 명이 안 감)
import { person } from './models.js?v=0.99.26';
import { STAFF, OUTFITS, OUTFITS_PRO, REST, CHAIN, outsOf, slotOf, INTER, STAFF_HAND_MAX } from './data.js?v=0.99.26';
import { S } from './state.js?v=0.99.26';
import { applyRules, hand, FOOD } from './rules.js?v=0.99.26';
import { R, tableSide } from './space.js?v=0.99.26';
import { sfx } from './audio.js?v=0.99.26';

const inR = (r, x, z) => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3];
const SRC = { bagel: 'oven', cream: 'top', coffee: 'cream', drink: 'coffee' };
const SPD = 300;
export class Staff {
  constructor(g) { this.g = g; this.jobs = []; this.jt = 0; this.restGap = 0; }
  home(role) { const sp = this.g.sp, N = sp.nodes; return { cashier: sp.counter.till, runner: sp.spots.runner, topper: N.top.staff, baker: N.kettle.staff, barista: N.cream.staff, cleaner: sp.spots.cleaner, picker: sp.window?.staff, driver: sp.window?.staff, server: sp.upper?.staff, cleaner2: sp.spots.cleaner2 }[role]; }
  look(role) { const o = [...OUTFITS, ...OUTFITS_PRO].find(x => x.id === S.outfit && x.id !== 'basic'), c = STAFF[role]?.cap || 0x888888;
    return o ? { body: o.body, apron: true, apronC: o.apronC, hat: o.hat, cap: o.cap } : { body: 0xFFFFFF, apron: true, apronC: c, hat: 'cap', cap: c, pants: 0x5A5A62 }; }
  /* 뽑힌 직원 = 저장의 own 에 든 역할 */
  sync() { const g = this.g, want = Object.keys(STAFF).filter(r => g.br.own.includes(r) && this.home(r));
    for (const r of want) if (!g.staff.some(w => w.role === r)) { const h = this.home(r), P = person(this.look(r)), up = r === 'server' ? g.sp.upper.y : 0; P.g.position.set(h[0], up, h[1]); g.root.add(P.g);
      g.staff.push({ role: r, P, g: P.g, pos: P.g.position, r: R.staff, y: up, stack: [], cap: Math.min(STAFF_HAND_MAX, 3 + g.lv('scarry') + (r === 'runner' ? 1 : 0)), state: 'idle', path: null, rest: false, boostT: 0, atSpot: false, home: h, hiredAt: g.time, workAt: null }); } }   /* workAt: 처음 일을 잡은 시각 (계산원은 계산 자리에 선 때) — 뽑힌 직원은 다 일함 (gate_cust K7 · gate_rhythm R9) */
  restyle() { for (const w of this.g.staff) { const pos = w.pos.clone(); this.g.root.remove(w.g); const P = person(this.look(w.role)); P.g.position.copy(pos); this.g.root.add(P.g); for (const s of w.stack) P.hand.add(s.m); w.P = P; w.g = P.g; w.pos = P.g.position; } }
  // ── 작업 큐 (0.4초마다 다시 셈)
  buildJobs() {
    const g = this.g, front = g.cust.find(c => c.state === 'order'), want = {}; if (front) for (const o of front.order) if (o.got < o.n) want[o.k] = 1;
    const out = [];
    for (const k of FOOD) { const src = SRC[k]; if (!g.own(src) || !g.own('counter')) continue; const d = g.dispCount(k), t = g.trayCount(src); if (!t) continue;
      const carried = g.staff.filter(w => w.job?.k === k && w.job.to === 'disp').length; if (d >= 4 && !want[k]) continue; if (carried && d >= 2 && !want[k]) continue;
      out.push({ k, from: src, to: 'disp', prio: want[k] ? 1 : d === 0 ? 2 : 3 + d / 10 }); }
    /* 나르기 (DESIGN 3-0 · 6-3): 받는 곳이 2칸 이상 비고, 앞 시설 쌓이는 곳에 받는 물건이 있으면 feed 일 하나 — 받는 물건 순서대로(오븐은 데친 반죽 먼저) */
    for (const [id, C] of Object.entries(CHAIN)) { if (!C.in || !g.own(id) || !g.sp.nodes[id]?.in) continue; const room = g.inRoom(id) - g.staff.filter(w => w.job?.to === 'feed' && w.job.node === id).reduce((n, w) => n + Math.max(1, w.stack.length), 0); if (room < 2) continue;
      for (const k of C.in) { const src = Object.keys(CHAIN).find(s0 => s0 !== id && g.own(s0) && g.sp.nodes[s0]?.pick && outsOf(s0).includes(k) && g.nodes[s0]?.tray.some(t => t.k === k)); if (src) { out.push({ k, from: src, to: 'feed', node: id, prio: id === 'top' ? (g.dispCount('cream') < 2 ? 1.8 : 2.6) : id === 'oven' ? (g.dispCount('bagel') < 2 ? 1.7 : 2.4) : 2.8 }); break; } } }
    /* 창구: 맨 앞 창구 손님 주문 기준(선반에 이미 있는 것 · 다른 직원이 들고 가는 것 빼고) — 한 종류씩 */
    if (g.window && g.own(g.sp.feat)) { const need = g.custSys.frontNeed(); for (const w of g.staff) for (const it of w.stack) if (w.job?.to === 'shelf' && need[it.k] > 0) need[it.k]--; for (const k of FOOD) if (need[k] > 0 && g.dispCount(k) > 0) out.push({ k, n: need[k], from: 'disp', to: 'shelf', prio: 1.5 }); }
    /* 쓰레기: 6초 묵었거나 두 군데 이상이면 한 번에 (홀을 덜 가로지름) */
    const ground = Object.values(g.tables).filter(t => t.trash > 0 && !t.y && t.id.length < 4 && !['u', 'p'].includes(t.id[0])), many = ground.length >= 2 || g.custSys.freeSeats().length < 2;
    const busyT = t => g.cust.some(c => !c.y && ((c.seat && c.seat.table === t.id) || (c.state === 'leave' && c.fromSeat && c.pi <= 3 && Math.hypot(c.pos.x - t.x, c.pos.z - t.z) < 260)));   /* 같은 테이블에 아직 손님이 있거나 막 일어나 나가는 중이면 그 뒤에 치움 (남쪽 틈에서 스치지 않음 · U3) */
    for (const t of ground) if ((many || g.time - (t.trashAt || 0) >= 6) && !busyT(t)) out.push({ k: 'trash', table: t.id, to: 'bin', prio: 2 });
    for (const t of Object.values(g.tables)) if (t.trash > 0 && t.y) out.push({ k: 'trash', table: t.id, to: 'up', prio: 2 });
    for (const t of Object.values(g.tables)) if (t.trash > 0 && t.id[0] === 'p') out.push({ k: 'trash', table: t.id, to: 'ter', prio: 2 });
    this.jobs = out.sort((a, b) => a.prio - b.prio);
  }
  can(w, j) { const T = STAFF[w.role]; return !w.rest && !!T && T.jobs.includes(j.to) && (!T.kinds || T.kinds.includes(j.k)) && (j.to !== 'feed' || (T.feeds || []).includes(j.node)); }   /* 나르기는 맡은 받는 곳만 (사슬 구간) */   /* data.js STAFF 표 하나 */
  /* 테이블 쓰레기 줍는 자리: 통로(손님 길) 반대쪽 — 서쪽 열은 벽 쪽(직원 통로), 막혔으면 동쪽 */
  trashSpot(t, j) { if (j.to !== 'bin' || t.id === 'bar') return [t.x, t.z]; return tableSide(this.g.sp, t); }   /* space.js 바깥쪽 일 자리 하나 */
  acc(j) { return j.to === 'feed' ? CHAIN[j.node].in : j.k === 'bagel' ? ['bagel', 'chewy'] : [j.k]; }   /* 이 일이 받는 물건 (베이글 진열 = 플레인 · 쫄깃) */
  same(a, b) { return a && b && a.k === b.k && a.to === b.to && a.table === b.table && a.node === b.node; }
  update(dt) {
    const g = this.g; this.jt -= dt; if (this.jt <= 0) { this.jt = 0.4; this.buildJobs(); }
    for (const w of g.staff) {
      if (w.boostT > 0) w.boostT -= dt;
      const k = (w.boostT > 0 ? REST.boostK : 1) * (1 + 0.1 * g.lv('swalk')) * ((+S.fx.staff || 0) > Date.now() ? 1.3 : 1);
      w.cap = Math.min(STAFF_HAND_MAX, 3 + g.lv('scarry') + (w.role === 'runner' ? 1 : 0));
      if (w.rest) { w.restT = (w.restT || 0) + dt; if (w.restT < REST.nap) { w.P.anim(dt, false); continue; } w.rest = false; w.restT = 0; }   /* 0.4.3: 졸기는 최대 60초 (사장이 깨우면 기운 충전 · 안 깨워도 창구 손님이 20분 기다리지 않음) */
      // 작업 잡기 (잠금) · 필요 없어진 작업은 손이 비었을 때 버림
      if (!w.job) { const j = this.jobs.find(j => this.can(w, j) && !g.staff.some(o => o !== w && this.same(o.job, j))); if (j) { w.job = j; w.state = 'get'; w.path = null; } }
      else if (w.state === 'get' && !w.stack.length && !this.jobs.some(j => this.same(j, w.job))) { w.job = null; w.state = 'idle'; w.path = null; }
      if (!w.job && w.stack.length && w.role !== 'server' && w.role !== 'cleaner2') { w.job = { k: w.stack[0].k, to: 'return' }; w.state = 'return'; w.path = null; }   /* 불변식: 일 없이 손에 든 것은 늘 되돌려 놓음 */
      const j = w.job; let tgt = w.home;
      if (j) { const sp = g.sp;
        if (w.state === 'get') { w.want = j.k; tgt = j.to === 'disp' || j.to === 'feed' ? sp.nodes[j.from].pick : j.to === 'shelf' ? sp.counter.fetch : j.to === 'up' && g.tables[j.table] ? [g.tables[j.table].x, sp.upper.serveZ] : g.tables[j.table] ? this.trashSpot(g.tables[j.table], j) : w.home;
          const acc = this.acc(j), h = hand(w), lim = j.to === 'feed' ? Math.max(1, g.inRoom(j.node)) : 99, srcEmpty = j.to === 'disp' || j.to === 'feed' ? !g.nodes[j.from]?.tray.some(t => acc.includes(t.k)) : j.to === 'shelf' ? g.dispCount(j.k) === 0 || w.stack.filter(x => x.k === j.k).length >= (j.n || 1) : g.tableTrash(j.table) === 0;
          if (w.stack.some(x => !acc.includes(x.k))) { w.state = 'return'; w.path = null; }   /* 불변식: 이 일과 다른 물건이 손에 있으면 먼저 되돌려 놓음 */
          else if (h.full || h.n >= lim || (h.n && srcEmpty)) { w.state = 'put'; w.path = null; } else if (!h.n && srcEmpty) { w.job = null; w.state = 'idle'; } }
        else if (w.state === 'put') { w.want = null; tgt = j.to === 'disp' ? sp.counter.drop : j.to === 'feed' ? sp.nodes[j.node].in : j.to === 'shelf' ? sp.window.shelf : j.to === 'bin' ? sp.bin.at : w.home;
          /* 쓸 곳 없는 물건 (불변식): 내려놓을 곳에 0.6초 서 있어도 손이 안 비면 → 진열대(음식) · 쓰레기통(쓰레기)으로 되돌려 놓고 끝 */
          w.putT = Math.hypot(tgt[0] - w.pos.x, tgt[1] - w.pos.z) <= 50 ? (w.putT || 0) + dt : 0; if (w.putT > 0.6 && w.stack.length && j.to !== 'up' && j.to !== 'ter') { w.state = 'return'; w.putT = 0; w.path = null; }
          if (!w.stack.length) { w.job = null; w.state = 'idle'; w.path = null; }
          if ((j.to === 'up' || j.to === 'ter') && w.stack.length && Math.hypot(w.pos.x - w.home[0], w.pos.z - w.home[1]) < 40) { for (let i = w.stack.length - 1; i >= 0; i--) g.fromHand(w, i); w.job = null; w.state = 'idle'; } } }
      if (j && w.state === 'return') { const it0 = w.stack[w.stack.length - 1], dest = it0 ? g.homeOf(it0.k) : null; tgt = dest ? dest.at : g.sp.bin.at; w.want = null;
        /* 되돌려 놓기 (불변식 · 0.4.3 상한 지킴): 손 맨 위 물건의 「돌아갈 곳」 하나 — 음식은 진열(칸 16 안) → 나온 쌓이는 곳(칸 안) → 쓰레기통 · 중간 물건은 나온 쌓이는 곳 → 쓰레기통 · 쓰레기는 쓰레기통 (g.homeOf) */
        if (Math.hypot(tgt[0] - w.pos.x, tgt[1] - w.pos.z) <= 90) { for (let i = w.stack.length - 1; i >= 0; i--) { const d2 = g.homeOf(w.stack[i].k); if (!dest || !d2 || d2.id !== dest.id) continue; const it = g.fromHand(w, i); g.putHome(it.k, d2); }
          if (!dest) for (let i = w.stack.length - 1; i >= 0; i--) g.discard(w);
          if (!w.stack.length) { w.job = null; w.state = 'idle'; } w.path = null; } }
      if (!j) w.want = null;
      // 이동: 바닥(사장과 같은 길 찾기 · 같은 밀어내기) · 2층 · 테라스는 그 판 위에서 곧게
      const d = Math.hypot(tgt[0] - w.pos.x, tgt[1] - w.pos.z), reach = j && w.state === 'return' ? 60 : j && ((w.state === 'get' && (j.to === 'disp' || j.to === 'feed' || j.to === 'shelf')) || (w.state === 'put' && j.to === 'feed')) ? 45 : 25;   /* 집는 일은 규칙 범위(받침 80 · 꺼내기 70) 안이면 도착 */
      if (d > reach) { if (w.role === 'server' || w.role === 'cleaner2') this.straight(w, tgt, SPD * k * dt); else this.follow(w, tgt, SPD * k * dt); w.P.anim(dt, true); }
      else { w.P.anim(dt, false); if (!j && w.role !== 'cashier') w.g.rotation.y = 0; }
      w.atSpot = w.role === 'cashier' && Math.hypot(w.pos.x - w.home[0], w.pos.z - w.home[1]) < 40;
      if (w.role === 'cashier' && w.atSpot) w.g.rotation.y = 0;
      if (w.needAt == null && (w.role === 'cashier' || this.jobs.some(j => this.can(w, j)))) w.needAt = g.time;   /* 이 직원이 할 일이 처음 생긴 때 */
      if (w.workAt == null && (w.job || (w.role === 'cashier' && w.atSpot))) { w.workAt = g.time; (window.__staffWork ||= []).push([w.role, g.bi, +(w.workAt - w.hiredAt).toFixed(1), +(w.workAt - (w.needAt ?? w.workAt)).toFixed(1)]); }
      if (w.role === 'server' || w.role === 'cleaner2') this.deckRules(w, dt); else applyRules(g, w, dt);
      g.wobble(w, dt);
    }
  }
  follow(w, tgt, step) { const g = this.g; if (!w.path || w.pathFor !== tgt + '' || w.pathVer !== g.nav.ver || (w.stuckT || 0) > 1.2) { w.path = g.nav.path(w.pos.x, w.pos.z, tgt[0], tgt[1], true) || [];   /* 직원 격자 하나 (모든 직원 자리에 갈 수 있음은 gate_space 가 봄) */ w.pathFor = tgt + ''; w.pathVer = g.nav.ver; w.stuckT = 0; }
    const p = w.path[0]; if (!p) return; const dx = p[0] - w.pos.x, dz = p[1] - w.pos.z, d = Math.hypot(dx, dz); const x0 = w.lp ? w.lp[0] : w.pos.x, z0 = w.lp ? w.lp[1] : w.pos.z;   /* 지난 프레임 자리 (밀어내기까지 포함해서 실제로 나아갔나) */
    if (d < 8) { w.path.shift(); return; }
    /* 교차점(space.js crossings — 손님 길과 직원 길이 만나는 곳): 들어가기 직전, 안에 걷는 손님이 있으면 가장자리에서 기다림 · 기다리는 동안 새 손님은 교차점 앞에서 멈춤 → 늘 건넘 */
    const nx = w.pos.x + dx / d * Math.min(d, step + 40), nz = w.pos.z + dz / d * Math.min(d, step + 40), X = g.sp.crossings.find(c => inR(c.rect, nx, nz) && !inR(c.rect, w.pos.x, w.pos.z));
    w.waitX = X && g.cust.some(c => !c.win && !c.y && (c.state === 'toSeat' || c.state === 'leave') && inR(X.rect, c.pos.x, c.pos.z)) ? X.id : null; if (w.waitX) return;
        const ux = dx / d, uz = dz / d, inX = g.sp.crossings.some(X => inR(X.rect, w.pos.x, w.pos.z)); if (!inX && g.cust.some(c => !c.win && !c.y && (c.state === 'toSeat' || c.state === 'leave') && (c.vx || c.vz) && (() => { const rx = c.pos.x - w.pos.x, rz = c.pos.z - w.pos.z, ah = rx * ux + rz * uz; return ah > -10 && ah < 110 && Math.abs(rx * uz - rz * ux) < 65; })())) return;   /* 걷는(실제로 움직이는) 손님이 앞이면 비켜 줌 — 멈춘 손님은 안 기다림(서로 기다리는 일 없음 · K6) (손님은 늘 움직이므로 기다림이 끝남 · 앉은 · 줄 선 손님은 안 기다림) · 교차점 안에서는 안 멈춤(손님이 교차점 앞에서 기다리므로) */
    const s = Math.min(d, step);
    /* 사람끼리 막힘 풀기: 0.8초 못 갔고 바로 앞에 사장 · 다른 직원이 있으면 오른쪽으로 비켜 걸음 (마주 오면 둘 다 오른쪽 → 지나감 · 서 있는 계산원은 돌아감) — K6 */
    const blk = (w.stuckT || 0) > 0.8 && [g.pl, ...g.staff].find(o => o !== w && !o.y && Math.hypot(o.pos.x - w.pos.x, o.pos.z - w.pos.z) < w.r + (o.r || 32) + 12 && (o.pos.x - w.pos.x) * ux + (o.pos.z - w.pos.z) * uz > 0);
    if (blk) w.sideT = 0.45; if (w.sideT > 0) { w.sideT -= step / SPD; g.nav.move(w.pos, (ux * 0.3 - uz) * s, (uz * 0.3 + ux) * s, w.r); } else
    g.nav.move(w.pos, ux * s, uz * s, w.r); w.g.rotation.y = Math.atan2(dx, dz);
    w.stuckT = Math.hypot(w.pos.x - x0, w.pos.z - z0) < s * 0.2 ? (w.stuckT || 0) + step / SPD : 0; w.lp = [w.pos.x, w.pos.z]; }
  straight(w, tgt, step) { const dx = tgt[0] - w.pos.x, dz = tgt[1] - w.pos.z, d = Math.hypot(dx, dz); if (d < 1) return; const s = Math.min(d, step); w.pos.x += dx / d * s; w.pos.z += dz / d * s; w.g.rotation.y = Math.atan2(dx, dz); }
  /* 2층 · 테라스 직원: 그 판의 쓰레기만 (규칙표의 쓰레기 줍기와 같은 시간) */
  deckRules(w, dt) { const j = w.job; if (!j || w.state !== 'get') return; const t = this.g.tables[j.table]; if (!t || Math.hypot(w.pos.x - t.x, w.pos.z - t.z) > 235) return;   /* 2층 직원은 데크 남쪽 끝 직원 줄(serveZ)에서 손 뻗어 치움 — 손님 걷는 줄과 안 겹침 */ w.cool ||= {}; w.cool.d = (w.cool.d || 0) + dt; if (w.cool.d >= 0.15 && t.trash > 0 && w.stack.length < w.cap) { w.cool.d = 0; this.g.takeTrash(w, t.id); } }
  // ── 쉬기: 화면을 45초 안 만지면 고정 자리 직원 1명이 zZ (계산원 제외) · 사장 1.5m → 깨움(규칙표 wake)
  restTick(dt) { const g = this.g; this.restGap -= dt; if (g.idleInput < REST.after || this.restGap > 0 || g.staff.some(w => w.rest)) return;
    if (g.cust.some(c => c.state !== 'gone' && g.time - (c.at || 0) > 20 && (c.win || c.state === 'order'))) return;   /* 오래 기다리는 손님이 있으면 안 졺 */
    const c = g.staff.filter(w => ['topper', 'baker', 'barista', 'picker', 'driver', 'runner'].includes(w.role) && !w.stack.length); if (!c.length) return; const w = c[Math.floor(Math.random() * c.length)]; w.rest = true; w.job = null; w.state = 'idle'; this.restGap = REST.gap; sfx('grumpy', { vol: -8 }); }
}
