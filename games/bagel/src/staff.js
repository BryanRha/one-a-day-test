// ⑥ 직원 작업 목록 (DESIGN 6-3): 작업 큐 하나 + 고정 자리 — 역할마다 문턱 숫자 없음
//   큐: 「진열이 2 보다 적은 메뉴」 · 「줄 맨 앞 손님이 기다리는 메뉴」 · 「창구 손님이 기다리는 메뉴」 · 「테이블 쓰레기」가 작업을 만들어요
//   우선순위 = ① 줄 맨 앞이 기다림 ② 진열 0 ③ 진열이 가장 적음 · 직원은 작업 하나를 잠그고 가져가요 (같은 받침에 두 명이 안 감)
import { person } from './models.js?v=0.99.20';
import { STAFF, OUTFITS, OUTFITS_PRO, REST } from './data.js?v=0.99.20';
import { S } from './state.js?v=0.99.20';
import { applyRules, hand, FOOD } from './rules.js?v=0.99.20';
import { R } from './space.js?v=0.99.20';
import { sfx } from './audio.js?v=0.99.20';

const SRC = { bagel: 'oven', cream: 'top', coffee: 'cream', drink: 'coffee' };
const SPD = 300;
export class Staff {
  constructor(g) { this.g = g; this.jobs = []; this.jt = 0; this.restGap = 0; }
  home(role) { const sp = this.g.sp, N = sp.nodes; return { cashier: sp.counter.till, runner: sp.spots.runner, topper: N.top.staff, barista: N.cream.staff, cleaner: sp.spots.cleaner, picker: sp.window?.staff, driver: sp.window?.staff, server: sp.upper?.staff, cleaner2: sp.spots.cleaner2 }[role]; }
  look(role) { const o = [...OUTFITS, ...OUTFITS_PRO].find(x => x.id === S.outfit && x.id !== 'basic'), c = STAFF[role]?.cap || 0x888888;
    return o ? { body: o.body, apron: true, apronC: o.apronC, hat: o.hat, cap: o.cap } : { body: 0xFFFFFF, apron: true, apronC: c, hat: 'cap', cap: c, pants: 0x5A5A62 }; }
  /* 뽑힌 직원 = 저장의 own 에 든 역할 */
  sync() { const g = this.g, want = Object.keys(STAFF).filter(r => g.br.own.includes(r) && this.home(r));
    for (const r of want) if (!g.staff.some(w => w.role === r)) { const h = this.home(r), P = person(this.look(r)), up = r === 'server' ? g.sp.upper.y : 0; P.g.position.set(h[0], up, h[1]); g.root.add(P.g);
      g.staff.push({ role: r, P, g: P.g, pos: P.g.position, r: R.staff, y: up, stack: [], cap: 3 + g.lv('scarry') + (r === 'runner' ? 1 : 0), state: 'idle', path: null, rest: false, boostT: 0, fixed: ['cashier', 'topper', 'barista'].includes(r) && false, atSpot: false, home: h }); } }
  restyle() { for (const w of this.g.staff) { const pos = w.pos.clone(); this.g.root.remove(w.g); const P = person(this.look(w.role)); P.g.position.copy(pos); this.g.root.add(P.g); for (const s of w.stack) P.hand.add(s.m); w.P = P; w.g = P.g; w.pos = P.g.position; } }
  // ── 작업 큐 (0.4초마다 다시 셈)
  buildJobs() {
    const g = this.g, front = g.cust.find(c => c.state === 'order'), want = {}; if (front) for (const o of front.order) if (o.got < o.n) want[o.k] = 1;
    const out = [];
    for (const k of FOOD) { const src = SRC[k]; if (!g.own(src) || !g.own('counter')) continue; const d = g.dispCount(k), t = g.trayCount(src); if (!t) continue;
      const carried = g.staff.filter(w => w.job?.k === k && w.job.to === 'disp').length; if (d >= 4 && !want[k]) continue; if (carried && d >= 2 && !want[k]) continue;
      out.push({ k, from: src, to: 'disp', prio: want[k] ? 1 : d === 0 ? 2 : 3 + d / 10 }); }
    if (g.window && g.own(g.sp.feat)) { const need = g.custSys.windowNeed(); for (const k of FOOD) if (need[k] > 0 && g.dispCount(k) > 0) out.push({ k, from: 'disp', to: 'shelf', prio: 1.5 }); }
    /* 쓰레기: 6초 묵었거나 두 군데 이상이면 한 번에 (홀을 덜 가로지름) */
    const ground = Object.values(g.tables).filter(t => t.trash > 0 && !t.y && t.id.length < 4 && !['u', 'p'].includes(t.id[0])), many = ground.length >= 2 || g.custSys.freeSeats().length < 2;
    for (const t of ground) if (many || g.time - (t.trashAt || 0) >= 6) out.push({ k: 'trash', table: t.id, to: 'bin', prio: 2 });
    for (const t of Object.values(g.tables)) if (t.trash > 0 && t.y) out.push({ k: 'trash', table: t.id, to: 'up', prio: 2 });
    for (const t of Object.values(g.tables)) if (t.trash > 0 && t.id[0] === 'p') out.push({ k: 'trash', table: t.id, to: 'ter', prio: 2 });
    this.jobs = out.sort((a, b) => a.prio - b.prio);
  }
  can(w, j) { if (w.rest) return false; if (w.role === 'runner') return j.to === 'disp'; if (w.role === 'barista') return j.to === 'disp' && (j.k === 'coffee' || j.k === 'drink');
    if (w.role === 'picker' || w.role === 'driver') return j.to === 'shelf'; if (w.role === 'cleaner') return j.to === 'bin'; if (w.role === 'server') return j.to === 'up'; if (w.role === 'cleaner2') return j.to === 'ter'; return false; }
  same(a, b) { return a && b && a.k === b.k && a.to === b.to && a.table === b.table; }
  update(dt) {
    const g = this.g; this.jt -= dt; if (this.jt <= 0) { this.jt = 0.4; this.buildJobs(); }
    for (const w of g.staff) {
      if (w.boostT > 0) w.boostT -= dt;
      const k = (w.boostT > 0 ? REST.boostK : 1) * (1 + 0.1 * g.lv('swalk')) * ((+S.fx.staff || 0) > Date.now() ? 1.3 : 1);
      w.cap = 3 + g.lv('scarry') + (w.role === 'runner' ? 1 : 0);
      if (w.rest) { w.P.anim(dt, false); continue; }
      // 작업 잡기 (잠금) · 필요 없어진 작업은 손이 비었을 때 버림
      if (!w.job) { const j = this.jobs.find(j => this.can(w, j) && !g.staff.some(o => o !== w && this.same(o.job, j))); if (j) { w.job = j; w.state = 'get'; w.path = null; } }
      else if (w.state === 'get' && !w.stack.length && !this.jobs.some(j => this.same(j, w.job))) { w.job = null; w.state = 'idle'; w.path = null; }
      const j = w.job; let tgt = w.home;
      if (j) { const sp = g.sp;
        if (w.state === 'get') { w.want = j.k; tgt = j.to === 'disp' ? sp.nodes[j.from].pick : j.to === 'shelf' ? sp.counter.drop : j.to === 'up' && g.tables[j.table] ? [g.tables[j.table].x, sp.upper.walkN - 10] : g.tables[j.table] ? [g.tables[j.table].x + (j.to === 'bin' && j.table !== 'bar' ? 110 : 0), g.tables[j.table].z] : w.home;
          const h = hand(w), srcEmpty = j.to === 'disp' ? g.trayCount(j.from) === 0 : j.to === 'shelf' ? g.dispCount(j.k) === 0 || h.n >= g.custSys.windowNeed()[j.k] + h.n : g.tableTrash(j.table) === 0;
          if (h.full || (h.n && srcEmpty)) { w.state = 'put'; w.path = null; } else if (!h.n && srcEmpty) { w.job = null; w.state = 'idle'; } }
        else if (w.state === 'put') { w.want = null; tgt = j.to === 'disp' ? sp.counter.drop : j.to === 'shelf' ? sp.window.shelf : j.to === 'bin' ? sp.bin.at : w.home;
          if (!w.stack.length) { w.job = null; w.state = 'idle'; w.path = null; }
          if ((j.to === 'up' || j.to === 'ter') && w.stack.length && Math.hypot(w.pos.x - w.home[0], w.pos.z - w.home[1]) < 40) { for (let i = w.stack.length - 1; i >= 0; i--) g.fromHand(w, i); w.job = null; w.state = 'idle'; } } }
      else w.want = null;
      // 이동: 바닥(사장과 같은 길 찾기 · 같은 밀어내기) · 2층 · 테라스는 그 판 위에서 곧게
      const d = Math.hypot(tgt[0] - w.pos.x, tgt[1] - w.pos.z), reach = j && w.state === 'get' && j.to === 'disp' ? 55 : 25;
      if (d > reach) { if (w.role === 'server' || w.role === 'cleaner2') this.straight(w, tgt, SPD * k * dt); else this.follow(w, tgt, SPD * k * dt); w.P.anim(dt, true); }
      else { w.P.anim(dt, false); if (!j && w.role !== 'cashier') w.g.rotation.y = 0; }
      w.atSpot = w.role === 'cashier' && Math.hypot(w.pos.x - w.home[0], w.pos.z - w.home[1]) < 40;
      if (w.role === 'cashier' && w.atSpot) w.g.rotation.y = 0;
      if (w.role === 'server' || w.role === 'cleaner2') this.deckRules(w, dt); else applyRules(g, w, dt);
      g.wobble(w, dt);
    }
  }
  follow(w, tgt, step) { const g = this.g; if (!w.path || w.pathFor !== tgt + '' || w.pathVer !== g.nav.ver || (w.stuckT || 0) > 1.2) { w.path = g.nav.path(w.pos.x, w.pos.z, tgt[0], tgt[1]) || [tgt]; w.pathFor = tgt + ''; w.pathVer = g.nav.ver; w.stuckT = 0; }
    const p = w.path[0]; if (!p) return; const dx = p[0] - w.pos.x, dz = p[1] - w.pos.z, d = Math.hypot(dx, dz); const x0 = w.pos.x, z0 = w.pos.z;
    if (d < 8) { w.path.shift(); return; }
    /* 손님이 앞쪽(110 · 옆 65 안)이면 잠깐 기다림 (최대 3초 — 그 뒤 1초는 그냥 지나감 · 갇힘 없음) */
    const ux = dx / d, uz = dz / d; if ((w.yieldT || 0) >= 0 && (w.yieldT || 0) < 3 && g.cust.some(c => !c.win && c.state !== 'gone' && !(c.y) && (() => { const rx = c.pos.x - w.pos.x, rz = c.pos.z - w.pos.z, ah = rx * ux + rz * uz; return ah > -10 && ah < 110 && Math.abs(rx * uz - rz * ux) < 65; })())) { w.yieldT = (w.yieldT || 0) + step / SPD; return; } if (w.yieldT >= 3) w.yieldT = -1; else w.yieldT = Math.min(0, (w.yieldT || 0) + step / SPD);
    const s = Math.min(d, step); g.nav.move(w.pos, ux * s, uz * s, w.r); w.g.rotation.y = Math.atan2(dx, dz);
    w.stuckT = Math.hypot(w.pos.x - x0, w.pos.z - z0) < s * 0.2 ? (w.stuckT || 0) + step / SPD : 0; }
  straight(w, tgt, step) { const dx = tgt[0] - w.pos.x, dz = tgt[1] - w.pos.z, d = Math.hypot(dx, dz); if (d < 1) return; const s = Math.min(d, step); w.pos.x += dx / d * s; w.pos.z += dz / d * s; w.g.rotation.y = Math.atan2(dx, dz); }
  /* 2층 · 테라스 직원: 그 판의 쓰레기만 (규칙표의 쓰레기 줍기와 같은 시간) */
  deckRules(w, dt) { const j = w.job; if (!j || w.state !== 'get') return; const t = this.g.tables[j.table]; if (!t || Math.hypot(w.pos.x - t.x, w.pos.z - t.z) > 175) return; w.cool ||= {}; w.cool.d = (w.cool.d || 0) + dt; if (w.cool.d >= 0.15 && t.trash > 0 && w.stack.length < w.cap) { w.cool.d = 0; this.g.takeTrash(w, t.id); } }
  // ── 쉬기: 화면을 45초 안 만지면 고정 자리 직원 1명이 zZ (계산원 제외) · 사장 1.5m → 깨움(규칙표 wake)
  restTick(dt) { const g = this.g; this.restGap -= dt; if (g.idleInput < REST.after || this.restGap > 0 || g.staff.some(w => w.rest)) return;
    const c = g.staff.filter(w => ['topper', 'barista', 'picker', 'driver', 'runner'].includes(w.role) && !w.stack.length); if (!c.length) return; const w = c[Math.floor(Math.random() * c.length)]; w.rest = true; w.job = null; w.state = 'idle'; this.restGap = REST.gap; sfx('grumpy', { vol: -8 }); }
}
