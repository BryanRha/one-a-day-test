// ④ 손님 상태 기계 (DESIGN 2장 손님 고리 · 11장): 걷기 → 줄(매장 안) → 주문 · 받기 · 결제(계산대 앞) → 앉기 / 포장 / 2층 / 테라스 → 먹기 → 나감 길 → 문 → 거리
//   길은 정해진 고리 위 (space.js entryPath · seatPath · exitPath) — 길 찾기 · 비켜가기 · 갇힘 순간이동 없음
//   창구 손님(픽업 걷기 · 드라이브 차)은 매장 밖 동쪽 길에서 따로 줄을 서요
import * as THREE from 'three';
import { queueSlot, entryPath, seatPath, exitPath, R } from './space.js?v=0.99.27';
import { person, car, item } from './models.js?v=0.99.27';
import { CUST_COLORS, MENU, MOOD, REGULARS, FAVOR, EVENTS, DECO } from './data.js?v=0.99.27';
import { S, save, mission } from './state.js?v=0.99.27';
import { sfx } from './audio.js?v=0.99.27';
import { favLv } from './game.js?v=0.99.27';

const SPD = 230, TAKEOUT = 0.22;
export class Cust {
  constructor(g) { this.g = g; this.t = 0.6; this.wt = 6; this.list = g.cust; this.log = { paid: [], cross: 0, stuck: 0, waits: [], leftWithSeat: 0, dineIn: 0, takeout: 0, served: 0 }; this.n = 0; this.firstPlaced = false; }
  get sp() { return this.g.sp; }
  rate() { const g = this.g, tables = g.sp.tables.filter(t => g.own(t.id)).length; let ppl = 0.27 * (1 + 0.16 * tables + (g.own('bar') ? 0.25 : 0)) * (1 + 0.08 * g.lv('ads')) * (1 + g.scent() / 300);
    if (g.ev?.type === 'influencer' || (+S.fx.rush || 0) > Date.now()) ppl *= 2; return ppl; }
  queueLen() { return this.list.filter(c => c.slot != null).length; }
  // ── 하나 만들기
  spawn(atDoor) {
    const g = this.g, kinds = g.menuKinds(); if (!kinds.length) return null;
    const reg = this.pickRegular(), col = reg ? reg.body : CUST_COLORS[this.n++ % CUST_COLORS.length];
    const P = person({ body: col, faceless: true, arm: col }); g.root.add(P.g);
    const slot = this.queueLen(); const path = entryPath(this.sp, slot); if (atDoor) path.splice(0, 1, [this.sp.door.inX, this.sp.hall.d - 60]);
    P.g.position.set(path[0][0], 0, path[0][1]);
    const c = { uid: (this.uidN = (this.uidN || 0) + 1), P, g: P.g, pos: P.g.position, r: R.cust, fixed: true, y: 0, state: 'enter', path, pi: 1, slot, order: this.makeOrder(kinds, reg), w: 0, idle: 0, reg, at: this.g.time, stack: [] };
    if (this.groupNext) { c.group = true; c.order = [{ k: kinds[Math.floor(Math.random() * kinds.length)], n: EVENTS.group.n[0] + Math.floor(Math.random() * 3), got: 0 }]; this.groupNext = false; }
    this.list.push(c); if (!atDoor) sfx('door_bell', g.at3([this.sp.door.inX, this.sp.hall.d])); return c;
  }
  makeOrder(kinds, reg) { const want = reg ? [reg.fav].filter(k => kinds.includes(k)) : []; const n = 1 + (Math.random() < 0.5 ? 1 : 0) + (Math.random() < 0.2 ? 1 : 0);
    const k1 = want[0] || kinds[Math.floor(Math.random() * kinds.length)]; const o = [{ k: k1, n: kinds.length > 1 && n > 1 && Math.random() < 0.35 ? 1 : n, got: 0 }];
    if (o[0].n < n) { const k2 = kinds.filter(k => k !== k1)[Math.floor(Math.random() * (kinds.length - 1))]; o.push({ k: k2, n: n - o[0].n, got: 0 }); } return o; }
  pickRegular() { const g = this.g, opened = g.br.own.length; if (Math.random() > 0.12) return null;
    for (const R0 of REGULARS) { const r = (S.reg[R0.id] ||= { f: 0, lv: 0, day: '' }); if (r.day === S.day || R0.need > opened || this.list.some(c => c.reg === R0)) continue; if (!g.menuKinds().includes(R0.fav)) continue; return R0; } return null; }
  group() { if (this.groupNext) return false; this.groupNext = true; this.g.ui?.note('👥 단체 주문이 와요 · 다 내주면 값 ×1.6'); return true; }
  seatsChanged() { /* 자리 판단은 결제 순간에 (free 는 그때 셈) */ }
  freeSeats() { const g = this.g, used = new Set(this.list.filter(c => c.seat).map(c => c.seat.id)); return g.seats.filter(s => !used.has(s.id) && (g.tables[s.table]?.trash || 0) === 0); }
  // ── 한 프레임
  update(dt) {
    const g = this.g, sp = this.sp;
    // 새 손님 (문이 열리고 계산대가 있을 때 · 줄 9명까지)
    if (g.own('door') && g.own('counter') && g.own('oven')) {
      if (!this.firstPlaced) { this.firstPlaced = true; if (!this.list.length) this.spawn(true); }
      this.t -= dt; if (this.t <= 0 && this.queueLen() < sp.queue.max) { this.spawn(); this.t = (1 / this.rate()) * (0.7 + Math.random() * 0.6); }
    }
    if (sp.window && g.own(sp.feat)) { this.wt -= dt; const wq = this.list.filter(c => c.win && c.state !== 'gone' && c.state !== 'wleave').length; if (this.wt <= 0 && wq < 3) { this.spawnWin(wq); this.wt = 10 + Math.random() * 6; } }
    // 계산: 줄 맨 앞(계산대 앞)에서만 · 계산원 또는 계산 자리에 선 사장
    const front = this.list.find(c => c.state === 'order');
    const server = g.staff.find(w => w.role === 'cashier' && w.atSpot) || g.tillBy;
    if (front && !front.phone && server) this.checkout(front, dt, server.role === 'owner' ? 1.3 : 0.5, server.role === 'owner' ? 0.15 : 0.1);   /* 사장 1.3초 · 계산원 0.5초 (DESIGN 6-1 · K5 여유) */
    for (let i = this.list.length - 1; i >= 0; i--) { const c = this.list[i]; this.step(c, dt); if (c.state === 'gone') { g.root.remove(c.g); c.tag?.remove(); this.list.splice(i, 1); } }
    this.windowServe(dt);
  }
  /* 정해진 길 따라 걷기 (y = 2층 계단) · 앞사람과 줄 간격 유지 */
  walk(c, dt) {
    const p = c.path[c.pi]; if (!p) return true; const dx = p[0] - c.pos.x, dz = p[1] - c.pos.z, d = Math.hypot(dx, dz);
    /* 같은 길의 앞사람과 간격 (줄은 95 · 걷는 길은 75) · 마주 오면 둘 다 오른쪽으로 비켜 감 (멈추지 않음 → 갇힘 없음) */
    const ux = d ? dx / d : 0, uz = d ? dz / d : 0, inQ = c.state === 'enter' || c.state === 'queue'; let blocked = false, side = 0;
    for (const o of this.list) { if (o === c || o.win || o.state === 'gone' || (o.y || 0) !== (c.y || 0)) continue; const rx = o.pos.x - c.pos.x, rz = o.pos.z - c.pos.z, ah = rx * ux + rz * uz, lat = Math.abs(rx * uz - rz * ux); if (ah <= -10 || lat > (inQ ? 55 : 62)) continue;
      if (inQ) { if ((o.slot == null || o.slot < c.slot) && Math.hypot(rx, rz) < 95) blocked = true; continue; }
      if (ah > 85) continue; const ov = (o.vx || 0) * ux + (o.vz || 0) * uz; if (o.slot != null || o.state === 'eat') continue; if (ov < -20) side = 1; else if (ah < 75 && (ov > 20 || o.uid < c.uid)) blocked = true; }   /* 같은 쪽 · 옆에서 합류 = 먼저 온 사람 먼저 · 마주 오면 오른쪽으로 */
    /* 자리에서 일어나 통로로 들어서는 첫 걸음: 통로를 걷는 사람이 1m 안이면 지나갈 때까지 자리 앞에서 기다림 (옆에서 끼어들다 스치는 일 · U3) */
    if (!inQ && !blocked && c.state === 'leave' && c.pi <= 1 && c.fromSeat) for (const o of this.list) { if (o === c || o.win || (o.y || 0) !== (c.y || 0) || !(o.state === 'toSeat' || (o.state === 'leave' && o.pi > 1)) || !(o.vx || o.vz)) continue;   /* 멈춰 선 사람은 안 기다림 (서로 기다리는 일 없음) */ if (Math.hypot(o.pos.x - p[0], o.pos.z - p[1]) < 100) { blocked = true; break; } }
    /* 교차점: 사장 · 직원이 건너는 중이거나 기다리면 손님은 교차점 앞에서 멈춤 (이미 안에 있으면 그대로 지나감) */
    if (!inQ && !blocked) { const nx = c.pos.x + ux * 60, nz = c.pos.z + uz * 60; for (const X of this.sp.crossings) if (X.rect[0] <= nx && nx <= X.rect[2] && X.rect[1] <= nz && nz <= X.rect[3] && !(X.rect[0] <= c.pos.x && c.pos.x <= X.rect[2] && X.rect[1] <= c.pos.z && c.pos.z <= X.rect[3]) && [this.g.pl, ...this.g.staff].some(w => w.waitX === X.id || (!w.y && X.rect[0] - 20 <= w.pos.x && w.pos.x <= X.rect[2] + 20 && X.rect[1] <= w.pos.z && w.pos.z <= X.rect[3]))) blocked = true; }   /* 사장 · 직원이 교차점 안에 있거나 건너려고 기다리면 */
    if (blocked) { c.vx = c.vz = 0; if (inQ) c.qAt ??= this.g.time; c.P.anim(dt, false); return false; }   /* 줄 시간 = 처음 멈춘 때부터 */
    /* 사장 · 직원이 바로 앞이면 오른쪽으로 비켜 감 (멈추지 않음) */
    if (!inQ && !side) for (const w of [this.g.pl, ...this.g.staff]) { if ((w.y || 0) !== (c.y || 0)) continue; const rx = w.pos.x - c.pos.x, rz = w.pos.z - c.pos.z, ah = rx * ux + rz * uz; if (ah > 0 && ah < 80 && Math.abs(rx * uz - rz * ux) < 55) { side = 1; break; } }
    const st = Math.min(d, SPD * dt); if (d > 0.5) { c.pos.x += ux * st + (side ? -uz * 120 * dt : 0); c.pos.z += uz * st + (side ? ux * 120 * dt : 0); c.g.rotation.y = Math.atan2(dx, dz); } c.vx = ux * SPD; c.vz = uz * SPD;
    if (p[2] != null) { const prev = c.path[c.pi - 1], tot = prev ? Math.hypot(p[0] - prev[0], p[1] - prev[1]) : 1, from = prev && prev[2] != null ? prev[2] : c.y; c.y = tot > 1 ? from + (p[2] - from) * (1 - (d - st) / tot) : p[2]; c.pos.y = c.y; }
    c.P.anim(dt, d > 1); if (d - st < 1) { c.pi++; } return c.pi >= c.path.length; }
  step(c, dt) {
    const g = this.g, sp = this.sp; c.w += dt; const before = c.pos.clone();
    if (c.win) return this.stepWin(c, dt);
    if (c.state === 'enter' || c.state === 'queue') {
      const tgt = queueSlot(sp, c.slot); if (c.path[c.path.length - 1][1] !== tgt[1]) { c.path = [...c.path.slice(0, c.pi), tgt]; c.pi = Math.min(c.pi, c.path.length - 1); }
      if (this.walk(c, dt)) { c.state = c.slot === 0 ? 'order' : 'queue'; c.qAt ??= g.time; if (c.slot === 0) { c.orderAt = g.time; c.g.rotation.y = Math.PI; } } else if (c.state === 'enter' && c.pos.z < sp.hall.d) c.state = 'queue';
    } else if (c.state === 'order') { c.P.anim(dt, false); }
    else if (c.state === 'toSeat') { if (this.walk(c, dt)) { c.state = 'eat'; c.eatT = 6 + Math.random() * 3; c.g.rotation.y = Math.atan2(c.seat.face[0] - c.pos.x, c.seat.face[1] - c.pos.z); this.sitFood(c); } }
    else if (c.state === 'eat') { c.eatT -= dt; c.P.anim(dt, false); if (c.eatT <= 0) this.doneEating(c); }
    else if (c.state === 'leave') { if (this.walk(c, dt)) c.state = 'gone'; }
    // 갇힘 감시 (안전장치 아님 · 시험이 0 인지 봄): 걸어야 하는 상태에서 8초 넘게 제자리
    if (['enter', 'toSeat', 'leave'].includes(c.state)) { c.idle = before.distanceTo(c.pos) < 0.5 * dt * 10 && !(c.state === 'enter' && this.list.some(o => o !== c && o.slot != null && o.slot < c.slot)) ? c.idle + dt : 0; if (c.idle > 8 && !c.stuckLogged) { c.stuckLogged = 1; this.log.stuck++; } }
    // 줄 가로지르기 감시: 나가는 손님이 줄 선 사람 0.6m 안을 지나감
    if (c.state === 'leave' || c.state === 'toSeat') for (const o of this.list) if (o.slot != null && o !== c && Math.hypot(o.pos.x - c.pos.x, o.pos.z - c.pos.z) < 60 && Math.abs(o.pos.x - c.pos.x) < 40 && !c.crossed) { c.crossed = 1; this.log.cross++; }
  }
  // ── 계산 (계산대 앞): 진열에서 한 개씩 0.15초 → 다 받으면 결제 (사장 1.3초 · 계산원 1.0초) → 돈 더미
  checkout(c, dt, payT, each = 0.15) {
    const g = this.g; c.ck = (c.ck || 0) + dt;
    const need = c.order.find(o => o.got < o.n);
    if (need) { if (c.ck >= each && g.dispCount(need.k) > 0) { c.ck = 0; const m = g.dispTake(need.k); if (m?.userData.chewy) need.chewy = (need.chewy || 0) + 1; need.got++; this.handItem(c, m?.userData.chewy ? 'chewy' : need.k); } return; }
    c.pay = (c.pay || 0) + dt; if (c.pay < payT) return;
    let v = 0, n = 0; for (const o of c.order) { const ch = o.chewy || 0; v += (g.price(o.k) * (o.n - ch) + g.price(o.k, true) * ch) * (c.group ? EVENTS.group.k : 1);   /* 쫄깃 베이글은 쫄깃 값 */ g.sold(o.k, o.n); n += o.n; }
    const wait = g.time - (c.qAt ?? c.at ?? 0), qw = g.time - (c.orderAt || g.time); this.log.waits.push(wait);
    if (qw <= MOOD.happy) { v *= 1 + MOOD.tip; sfx('happy'); c.happy = 1; }
    if (c.phoneTip) v *= 1 + EVENTS.phone.tip;
    g.addCash('ctr', Math.round(v)); sfx('till'); mission('serve'); this.log.served++; this.log.paid.push([c.pos.x, c.pos.z, g.time]);
    if (c.reg) this.regServed(c, qw <= MOOD.happy);
    // 다음 사람 한 칸 앞으로
    c.slot = null; for (const o of this.list) if (o.slot != null) o.slot--;
    // 자리 고르기 (빈자리가 있으면 앉음 · 포장 손님은 디자인 비율)
    const free = this.freeSeats(); const take = Math.random() < TAKEOUT || c.group;
    if (!take && free.length) { const seat = free.sort((a, b) => (a.up || a.out ? 1 : 0) - (b.up || b.out ? 1 : 0) || Math.hypot(a.at[0] - c.pos.x, a.at[1] - c.pos.z) - Math.hypot(b.at[0] - c.pos.x, b.at[1] - c.pos.z))[Math.floor(Math.random() * Math.min(2, free.length))]; c.seat = seat; c.path = [[c.pos.x, c.pos.z], ...seatPath(this.sp, seat)]; c.pi = 1; c.state = 'toSeat'; this.log.dineIn++; }
    else { if (!take && free.length) this.log.leftWithSeat++; c.path = [[c.pos.x, c.pos.z], ...exitPath(this.sp, null)]; c.pi = 1; c.state = 'leave'; this.log.takeout++; }
    c.P.carry = true;
  }
  handItem(c, k) { const m = item(k); c.P.hand.add(m); m.position.set(0, c.stack.length * 15, 0); c.stack.push(m); c.P.carry = true; sfx('place', { vol: -6, semi: -3 }); }
  sitFood(c) { for (const m of c.stack) c.P.hand.remove(m); c.stack = []; c.P.carry = false; const t = this.g.tables[c.seat.table]; if (!t) return; const m = item('bagel'); m.position.set(c.seat.at[0] * 0.4 + c.seat.tx * 0.6, (t.y || 0) + 86, c.seat.at[1] * 0.4 + c.seat.tz * 0.6); this.g.root.add(m); c.food = m; }
  doneEating(c) { const g = this.g; if (c.food) g.root.remove(c.food); const s = c.seat;
    const keepTrash = (s.up && !g.staff.some(w => w.role === 'server')) || (s.out && !g.staff.some(w => w.role === 'cleaner2'));
    if (!keepTrash) g.addTrash(s);
    const pid = s.up ? 'up2' : s.out ? 'ter' : s.bar ? 'bar' : s.table; g.addCash(pid, Math.round(1.5 * g.B.mult * (g.hasStaff('cleaner') ? 1.3 : 1) * (1 + g.scent() / 400) * (c.happy ? 1.5 : 1)));
    sfx('happy', { vol: -4, ...g.at3([c.pos.x, c.pos.z]) }); c.path = [[c.pos.x, c.pos.z, c.y], ...exitPath(this.sp, s)]; c.pi = 1; c.state = 'leave'; c.seat = null; c.fromSeat = 1; }
  // ── 통화 손님: 사장이 1.5m 안 2초 → 비켜 서서 바로 주문(+팁) · 30초 지나면 스스로 끝냄 (벌 없음)
  endPhone(c, byOwner) { c.phone = false; if (byOwner) { c.phoneTip = 1; sfx('hello'); this.g.ui?.say('죄송해요! 주문할게요', c.pos); } if (this.g.ev?.c === c) this.g.ev = null; }
  // ── 단골
  regServed(c, quick) { const R0 = c.reg, r = (S.reg[R0.id] ||= { f: 0, lv: 0 }); r.day = S.day; const lv0 = favLv(r.f); r.f += quick ? 2 : 1; const lv1 = favLv(r.f);
    if (lv1 > lv0) { r.lv = lv1; const gid = (lv1 === 2 || lv1 === 4) ? R0.gift[lv1 === 2 ? 0 : 1] : null, own = (S.deco[this.g.bi] ||= []); let gift = null, coins = 0;
      if (gid && !own.includes(gid)) { own.push(gid); gift = DECO.find(d => d.id === gid)?.name; this.g.redrawAll(); } else { coins = Math.round(this.g.B.mult * 60 * lv1); S.coins += coins; }
      if (lv1 === 5 && Object.values(S.reg).filter(x => (x.lv || 0) >= 5).length >= REGULARS.length && !own.includes('photo')) own.push('photo');
      if (lv1 === 5) S.setsFree = (S.setsFree || 0) + 1; this.g.ui?.regLevel(R0, lv1, gift, coins); sfx('levelup'); }
    save(); }
  // ── 창구 손님 (픽업 · 드라이브스루): 동쪽 길에서 줄 → 창구 앞에서 선반 물건을 받음 → 결제 → 북쪽으로
  spawnWin(k) { const g = this.g, w = this.sp.window, kinds = g.menuKinds(); if (!kinds.length) return; const isCar = w.kind === 'car';
    const col = CUST_COLORS[this.n++ % CUST_COLORS.length], P = isCar ? null : person({ body: col, faceless: true, arm: col }), vis = isCar ? car(col) : P.g;
    const x = isCar ? w.outside[0] + 200 : w.outside[0]; vis.position.set(x, 0, 2500); if (isCar) vis.rotation.y = Math.PI / 2; g.root.add(vis);
    const n = 1 + Math.floor(Math.random() * (isCar ? 3 : 2)); const ord = {}; for (let i = 0; i < n; i++) { const kk = kinds[Math.floor(Math.random() * kinds.length)]; ord[kk] = (ord[kk] || 0) + 1; }
    const c = { win: true, car: isCar, g: vis, P: P || { anim() {}, hand: vis }, pos: vis.position, r: 30, fixed: true, ghost: true, state: 'wwalk', wslot: k, order: Object.entries(ord).map(([k2, n2]) => ({ k: k2, n: n2, got: 0 })), w: 0, at: g.time, stack: [] };
    this.list.push(c); }
  stepWin(c, dt) { const w = this.sp.window, x = c.car ? w.outside[0] + 200 : w.outside[0];
    if (c.state === 'wwalk' || c.state === 'wwait') { const ahead = this.list.filter(o => o.win && (o.state === 'wwalk' || o.state === 'wwait') && o.wslot < c.wslot).length; c.wslot = ahead; const tz = w.outside[1] + ahead * (c.car ? 320 : 110);
      const d = tz - c.pos.z, st = Math.sign(d) * Math.min(Math.abs(d), (c.car ? 300 : SPD) * dt); c.pos.z += st; c.pos.x += (x - c.pos.x) * Math.min(1, dt * 4); c.P.anim(dt, Math.abs(d) > 1); if (!c.car && c.g.children) c.g.rotation.y = Math.PI;
      if (Math.abs(d) < 2) c.state = ahead === 0 ? 'wwait' : 'wwalk'; return; }
    if (c.state === 'wleave') { c.pos.z -= (c.car ? 320 : SPD) * dt; c.P.anim(dt, true); if (c.pos.z < -400) c.state = 'gone'; } }
  /* 맨 앞 창구 손님이 아직 못 받은 것 − 선반에 있는 것 (창구 직원 일의 기준) */
  frontNeed() { const need = { bagel: 0, cream: 0, coffee: 0, drink: 0 }, c = this.list.filter(o => o.win && (o.state === 'wwait' || o.state === 'wwalk')).sort((a, b) => a.wslot - b.wslot)[0]; if (!c) return need; for (const o of c.order) need[o.k] += o.n - o.got; for (const s of this.g.shelf) if (need[s.k] > 0) need[s.k]--; return need; }
  windowNeed() { const need = { bagel: 0, cream: 0, coffee: 0, drink: 0 }; for (const c of this.list) if (c.win && c.state !== 'wleave' && c.state !== 'gone') for (const o of c.order) need[o.k] += o.n - o.got; for (const s of this.g.shelf) need[s.k]--; return need; }
  windowServe(dt) { const g = this.g; const c = this.list.find(o => o.win && o.state === 'wwait'); if (!c) return; c.ck = (c.ck || 0) + dt;
    if (c.order.some(o => o.got < o.n)) { if (c.ck >= 0.15) for (const o of c.order) if (o.got < o.n && g.shelfTake(o.k)) { c.ck = 0; o.got++; sfx('place', { vol: -6, semi: -5 }); break; } return; }
    c.pay = (c.pay || 0) + dt; if (c.pay < 0.8) return; let v = 0; for (const o of c.order) { v += g.price(o.k) * o.n * 1.1; g.sold(o.k, o.n); }
    g.addCash('win', Math.round(v)); sfx('till', { vol: -4 }); c.state = 'wleave'; this.log.served++; }
}
