// 사장 동선 (0.2.0 개편 · EXPANSION_PLAN 3장): 「머신은 시간을 쓰고, 사장은 발을 쓴다」
//   사장님은 바에서 정성 한 잔(정성 머신은 사장 전용) · 바를 떠나 홀 일을 하고(탭 = 그 자리로 걸어가 그 일) · 잔이 나올 때 맞춰 돌아오면 「딱 맞춤」 · 일을 이어 가면 동선 ×N (바에 돌아올 때 한꺼번에)
//   바를 비워도 잔은 식지 않음(머신 안에서 보온 · 벌 없음) · 일은 그 칸에 OWNER.dwell 초 머문 뒤에만 일어남(지나가면 그대로 · 마루미 0.3.1 원칙)
//   일 10가지(data.js OWNER_JOBS) · 돌발 일 8가지(EVENTS) · 동료(은재 · 보람 · 태민 · 무진 · 도윤)는 같은 일을 대신 함 · 동료는 가끔 쉬고 사장님이 깨우면 응원 +30%
//   Game.prototype 에 섞어 씀 (game.js 끝)
import * as THREE from 'three';
import { MENU, OWNER, OWNER_JOBS, EVENTS, EVENT_GAP, STAFF, BEAN_MAX, BRAND, APRONS, STORES, FURN } from './data.js?v=0.99.22';
import { S, ST, save, today, now } from './state.js?v=0.99.22';
import { person, tray, box, cyl, sph, FURN_MODEL } from './models.js?v=0.99.22';
import { sfx } from './audio.js?v=0.99.22';
import { FDX, floorOfX, SPOT, gi } from './layout.js?v=0.99.22';
import { ownerAdd, track } from './oad.js?v=0.99.22';
import { cx, cz, ci, cj, BAR_PICK, BAR_EXIT, LANE, LANE_X, BIN, DOOR, K, storeMult, fmt, isJeong } from './game.js?v=0.99.22';

const V = THREE.Vector3, rnd = (a, b) => a + Math.random() * (b - a);
const BAR_DOOR = { x: 640, z: -543 };   /* 바 안 오른쪽 끝 (나가는 곳 · game.js LANE) */
export const OwnerMixin = {
  // ── 사장님
  ownerInit() { const ap = APRONS.find(a => a.id === S.apron) || APRONS[0], P = person({ body: ap.body, apron: ap.apron, hair: 0x3A2A1E, pants: 0x3B2A20, bun: true }); P.g.position.set(100, 0, LANE); this.sc.add(P.g);
    const ring = new THREE.Mesh(new THREE.RingGeometry(34, 42, 24), new THREE.MeshBasicMaterial({ color: BRAND.redHex, transparent: true, opacity: 0.8 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 2; P.g.add(ring);   /* 발밑 붉은 고리 = 사장님 */
    this.owner = { P, pos: P.g.position, tx: 100, mode: 'bar', route: null, steps: [], carry: [], idleT: 0, out: null, dwell: 0 }; this.events = this.events?.filter(e => false) || []; this.eventT = rnd(...EVENT_GAP) * 0.5; this._room = null;
    for (const w of this.workers) w.restT = rnd(...OWNER.restAfter); this.pet = null; if (S.items.includes('pet')) this.petOn(); },
  /* 돌담 고양이 귤이 (골드 · 겉모습): 사장님을 졸졸 */
  petOn() { if (this.pet) return; const g = new THREE.Group(); box(40, 26, 24, 0xF09A30, 0, 10, 0, g); sph(15, 0xF09A30, 0, 40, 16, g, 8, 6); for (const s of [-1, 1]) box(6, 8, 4, 0xF09A30, s * 8, 54, 16, g); box(4, 30, 4, 0xF09A30, 0, 22, -16, g).rotation.x = -0.6; g.position.copy(this.owner.pos).add(new V(-60, 0, 40)); this.sc.add(g); this.pet = { g }; },
  bossK(k) { return { walk: 0.08, hand: 1, tip: 0.1, greet: 0.15 }[k] * (S.boss[k] || 0); },
  ownerSp() { return OWNER.sp * (1 + this.bossK('walk')) * (this.fxSpeed ? 1.4 : 1); },
  handCap() { return Math.min(5, OWNER.hand + (S.boss.hand || 0)); },
  handFree() { return this.handCap() - this.owner.carry.length; },
  atBar() { return this.owner.mode === 'bar'; },
  ownerCell() { const o = this.owner; return o.mode === 'bar' ? BAR_EXIT : [ci(o.pos.x), Math.max(3, cj(o.pos.z))]; },
  /* 걷는 길 → 점 목록 (바 안이면 먼저 바 끝 → 바 나가는 칸) */
  routePts(cell) { const o = this.owner, pts = []; let from = this.ownerCell();
    if (o.mode === 'bar') { pts.push([BAR_DOOR.x, BAR_DOOR.z]); pts.push([cx(BAR_EXIT[0]), cz(BAR_EXIT[1])]); }
    const p = this.path(from, cell); if (!p) return null; for (const [i, j] of p) pts.push([cx(i), cz(j)]); return pts; },
  /* 일 맡기기: steps = [{ cell, act, name }] · 사람이 탭한 일은 지금 하던 것을 바꿈(들고 있는 것은 그대로) */
  assign(steps, job) { const o = this.owner; if (!steps.length) return false; if (o.job && o.job !== job && o.job.cancel) o.job.cancel(); o.steps = steps; o.job = job || null; o.route = null; o.idleT = 0; if (o.mode === 'bar') this.leaveBar(); return true; },
  leaveBar() { const o = this.owner; o.mode = 'walk'; let dl = 0, val = 0; for (const m of this.machines) { const p = this.progress(m); if (p && p.u < 1 && !m.bak) { const left = p.left; if (!dl || left < dl) { dl = left; val = MENU[p.s.menu].price * p.s.n; } } }
    o.out = { n: 0, pot: 0, t0: this.t, deadline: dl ? this.t + dl : 0, val }; },
  goBar(then) { const o = this.owner; if (o.mode === 'bar') { then && then(); return; } if (o.job?.cancel) o.job.cancel(); const pts = this.routePts(BAR_EXIT) || []; pts.push([BAR_DOOR.x, BAR_DOOR.z]); o.steps = [{ pts, bar: true, then }]; o.job = null; o.route = null; },
  /* 바 일(주문표 · 머신 · 쟁반)은 바에서만: 밖에 있으면 먼저 돌아와서 */
  atBarThen(fn) { if (this.atBar()) return fn(); this.goBar(fn); return null; },
  /* 바에 돌아옴: 동선 보너스 · 딱 맞춤 */
  backAtBar() { const o = this.owner, out = o.out; o.mode = 'bar'; o.tx = BAR_DOOR.x - 40; o.out = null; if (!out) return; const n = out.n;
    if (n > 0) { const mult = Math.min(n, OWNER.chainMax), chain = out.pot * mult, fit = out.deadline && this.t <= out.deadline + OWNER.grace, fitV = fit ? out.val * storeMult() * OWNER.fit * (1 + this.bossK('tip')) : 0, v = this.earn(chain + fitV);
      if (v > 0) { this.ui.float(`${fit ? '딱 맞춤! ' : ''}${n > 1 ? `동선 ×${mult} ` : ''}+${fmt(v)}`, new V(o.pos.x, 260, o.pos.z), 'pay'); sfx('reward', { vol: 0.45 }); }
      this.ui.praiseOwner && this.ui.praiseOwner(fit, mult, v); ownerAdd(null, !!fit); S.ostat.out = (S.ostat.out || 0) + 1; if (fit) S.ostat.fit = (S.ostat.fit || 0) + 1; (window.__ownStat ||= { out: 0, fit: 0, jobs: 0 }).out++; if (fit) window.__ownStat.fit++; }
    for (const h of o.carry.filter(h => h.kind === 'bean')) { S.beans = Math.min(BEAN_MAX, S.beans + h.n); this.ui.float(`원두통 +${h.n}`, new V(BIN.x, 220, BIN.z), 'bean'); } o.carry = o.carry.filter(h => h.kind !== 'bean'); this.handShow(); save(); this.ui.progress(); },
  /* 일 하나를 끝냄: 바로 보상 + 동선 단지(바에 돌아올 때 ×N) · 몰리면 고르게(바 주문이 밀리면 홀 보상 ↓) */
  jobDone(kind, base, at) { const o = this.owner, out = o.out; S.ostat.jobs ||= {}; S.ostat.jobs[kind] = (S.ostat.jobs[kind] || 0) + 1; ownerAdd(kind); (window.__ownStat ||= { out: 0, fit: 0, jobs: 0 }).jobs++;
    const back = this.tickets.filter(t => t.items.some(it => this.need(it.k) > 0)).length, k = Math.max(0.7, Math.min(1.3, 1.25 - back * 0.08)), v = Math.round(base * k);
    if (out) { out.n++; out.pot += Math.max(1, v * OWNER.chainK); if (out.n >= 2) this.ui.chain && this.ui.chain(Math.min(out.n, OWNER.chainMax), out); } this.jobChip = { kind, t: this.t }; return v; },
  handShow() { const o = this.owner; o.P.hand.clear(); o.carry.forEach((h, i) => { let m; if (h.kind === 'tray') { m = tray(MENU[h.c.menu].look, h.c.items); m.scale.setScalar(0.8); } else if (h.kind === 'bean') { m = new THREE.Group(); const s = cyl(14, 17, 30, 0xC8B08A, 0, 0, 0, m, 8); s.scale.set(1, 1, 0.8); } else if (h.kind === 'dessert') { m = tray(MENU[h.k].look); m.scale.setScalar(0.8); } else { m = new THREE.Group(); sph(10, h.c || 0xF09A30, 0, 6, 0, m, 8, 6); } m.position.set(0, -6 + i * 16, 0); o.P.hand.add(m); }); },
  // ── 매 프레임
  ownerAI(dt) { const o = this.owner; if (!o) return; if (this.pet) { const p = this.pet.g.position, tx = o.pos.x - 70, tz = o.pos.z + 50, d = Math.hypot(tx - p.x, tz - p.z); if (d > FDX / 2) p.set(tx, 0, tz); else if (d > 30) { p.x += (tx - p.x) * Math.min(1, dt * 3); p.z += (tz - p.z) * Math.min(1, dt * 3); this.pet.g.rotation.y = Math.atan2(tx - p.x, tz - p.z); } }
    if (o.mode === 'bar' && !o.steps.length) { const d = o.tx - o.pos.x; if (Math.abs(o.pos.z - LANE) > 4) { this.stepTo(o, o.pos.x, LANE, dt, 300); return; } if (Math.abs(d) > 4) { o.pos.x += Math.sign(d) * Math.min(Math.abs(d), 260 * dt); o.P.g.rotation.y = d > 0 ? Math.PI / 2 : -Math.PI / 2; o.P.anim(dt, true); } else { o.P.g.rotation.y = 0; o.P.anim(dt, false); } return; }
    const st = o.steps[0]; if (!st) { o.P.anim(dt, false); o.idleT += dt; this.roomCheck(); if (o.idleT > 5 && !this._room && !this.deco && !o.hold) this.goBar(); return; }
    if (!o.route) { o.route = st.pts ? st.pts.slice() : this.routePts(st.cell); if (!o.route) { o.steps.shift(); if (o.job?.cancel) o.job.cancel(); if (!o.steps.length) o.job = null; return; } if (o.mode === 'bar') this.leaveBar(); o.dwell = 0; }
    if (o.route.length) { const [tx, tz] = o.route[0]; if (Math.abs(tx - o.pos.x) > FDX / 2) { o.pos.set(tx, 0, tz); o.route.shift(); this.onFloor(o); return; }
      if (this.stepTo(o, tx, tz, dt, this.ownerSp())) o.route.shift(); this.greetNear(); return; }
    o.P.anim(dt, false); o.dwell += dt; if (o.dwell < (st.bar ? 0 : OWNER.dwell)) return;   /* 그 칸에 0.4초 머문 뒤에만 */
    o.steps.shift(); o.route = null; if (st.face) o.P.g.rotation.y = Math.atan2(st.face[0] - o.pos.x, st.face[1] - o.pos.z);
    if (st.bar) { this.backAtBar(); if (st.then) try { st.then(); } catch (e) { console.error(e); } return; }
    let ok = true; try { ok = st.act ? st.act() !== false : true; } catch (e) { console.error(e); ok = false; }
    if (!ok) { if (o.job?.cancel) o.job.cancel(); o.steps = []; } if (!o.steps.length) { o.job = null; o.idleT = 0; } },
  onFloor(w) { if (w === this.owner && this.ui.setFloor) { const f = floorOfX(w.pos.x); if (f !== this.view.f) this.ui.setFloor(f); } },
  /* 첫인사: 손님이 들어올 때 사장님이 문 가까이 있으면 자동 · 아니면 6초 동안 레일에 */
  onEnter(c) { const o = this.owner, d = Math.hypot(o.pos.x - cx(DOOR[0]), o.pos.z - cz(DOOR[1])); c.enterT = this.t; if (o.mode !== 'bar' && d < OWNER.greetR * (1 + this.bossK('greet'))) this.greet(c); },
  greetNear() { if (!this._gT || this.t - this._gT > 0.5) { this._gT = this.t; for (const c of this.cust) if (!c.greet && c.enterT != null && this.t - c.enterT < 8 && ['in', 'queue', 'kiosk'].includes(c.state) && Math.hypot(this.owner.pos.x - c.pos.x, this.owner.pos.z - c.pos.z) < OWNER.greetR * 0.6) this.greet(c); } },
  greet(c) { if (c.greet) return; c.greet = true; S.hearts += 1; sfx('blip', { vol: 0.35, rate: 1.5 }); this.jobDone('greet', 2 * storeMult()); },
  /* 방문형 방 (동료 쉼터 · 사장실 · 원두 창고): 들어가면 창 */
  roomCheck() { const a = this.cells?.get(K(...this.ownerCell())), v = a && a.visit; if (v && this._room !== v) { this._room = v; this.ui.room && this.ui.room(v); } else if (!v) this._room = null; },
  // ── 동료 쉬기 · 깨우기 (마루미 REST 구조): 가끔 30초 쉼 → 스스로 일어나거나 사장님이 깨우면 3분 응원 +30%
  restTick(w, dt) { if (w.rest > 0) { w.rest -= dt; w.P.anim(dt, false); if (w.rest <= 0) { w.rest = 0; w.restT = rnd(...OWNER.restAfter); } return true; }
    w.restT = (w.restT ?? rnd(...OWNER.restAfter)) - dt; if (w.restT <= 0 && !(w.carry && w.carry.length) && !w.task && !(this.t < (w.cheerUntil || 0))) { w.rest = OWNER.restLen; w.restT = 0; } return false; },
  cheerK(w) { return this.t < (w.cheerUntil || 0) ? 1 + OWNER.wake : 1; },
  wake(w) { if (!w.rest) return false; w.rest = 0; w.restT = rnd(...OWNER.restAfter); w.cheerUntil = this.t + OWNER.wakeT; this.sparkle(w.pos.clone().setY(150)); sfx('unlock', { vol: 0.4 }); this.ui.float('힘낼게요! +30%', w.pos.clone().setY(240), 'pay sm'); this.jobDone('wake', 3 * storeMult()); return true; },
  // ── 일감 목록 (레일 · 안내 · 봇): 가까운 순 · 급한 것 먼저
  jobList() { const o = this.owner, out = [], me = this.ownerCell(), dist = c => c ? Math.hypot(c[0] - me[0], c[1] - me[1]) + (floorOfX(cx(c[0])) !== floorOfX(cx(me[0])) ? 20 : 0) : 99;
    const add = (kind, cell, run, urgent, label, extra = {}) => { if (cell) out.push({ kind, cell, run, urgent: !!urgent, label: label || OWNER_JOBS[kind].name, d: dist(cell), ...extra }); };
    /* 원두 나르기 */ if (this.bagAt && ST().bags > 0 && S.beans < BEAN_MAX * 0.6) add('bean', this.accessNear([ci(this.bagAt[0]), cj(this.bagAt[1])]), () => this.jobBean(), S.beans < 20, `원두 나르기 · 손 ${o.carry.filter(h => h.kind === 'bean').length || Math.min(this.handFree(), Math.ceil(ST().bags / OWNER.bag))}/${this.handCap()}`);
    /* 가져다 드리기 */ const far = this.cust.filter(c => c.reserved && !c.taken && !c.delBy && c.state === 'seated' && this.seatFar(c.seat)); if (far.length) add('serve', BAR_PICK, () => this.jobServe(), far.some(c => this.t - c.readyT > 20), `가져다 드리기 · ${far.length}`, { n: far.length });
    /* 포장 건네기 */ const car = (this.cars || []).find(c => c.reserved && !c.taken && !c.delBy); if (car) add('takeout', BAR_PICK, () => this.jobTakeout(car), this.t - car.readyT > 30, car.rider ? '배달 건네기' : '드라이브스루 건네기');
    /* 치우기 */ const dirty = this.seats().filter(x => x.s.dirty && x.s.cell && !this.workers.some(w => w.task && w.task.o === x.o && w.task.k === x.k)).sort((a, b) => dist(a.s.cell) - dist(b.s.cell))[0]; if (dirty) add('clean', dirty.s.cell, () => this.jobClean(dirty.o, dirty.k), !this.freeSeats().length);
    /* 디저트 나르기 */ if (this.caseAt && this.caseTotal() && Object.keys(ST().case).some(k => (ST().case[k] || 0) > 0)) add('dessert', this.accessNear([ci(this.caseAt[0]), cj(this.caseAt[1])]), () => this.jobDessert(), this.tickets.some(t => t.items.some(it => MENU[it.k].oven && (ST().case[it.k] || 0) > 0)));
    /* 첫인사는 문 가까이 있으면 저절로 (레일에는 안 올림) */
    /* 동료 깨우기 */ for (const w of [...this.workers, this.barista].filter(w => w && w.rest > 0)) { add('wake', w === this.barista ? BAR_EXIT : this.accessNear(this.cellOf(w)), () => this.jobWake(w), false, `${STAFF[w.role].name.split('· ')[1]} 깨우기`); }
    /* 돌발 일 */ for (const e of this.events) add('event', e.cells[0], () => this.jobEvent(e), e.t < 20, e.def.name, { ev: e });
    /* 단골 사연 */ const sc2 = this.cust.find(c => c.state === 'story' || (c.story && c.state === 'seated')); if (sc2) add('story', sc2.state === 'story' ? this.nearFree([11, 8]) : sc2.seat.s.cell, () => this.jobStory(sc2), false, `${sc2.reg.name} 사연`);
    /* 화분 돌보기 */ const pot = (this.pots || []).find(p => (ST().plants || {})[p.id] !== today()); if (pot) add('plant', this.accessNear(pot.cell), () => this.jobPlant(pot), false, this.B.feat.yard ? '귤 따기 · 돌담 화분' : OWNER_JOBS.plant.name);
    return out.sort((a, b) => (b.urgent - a.urgent) || ((b.kind === 'event') - (a.kind === 'event')) || a.d - b.d); },
  /* 그 칸이 막혔으면(가구) 가장 가까운 걸을 수 있는 칸 */
  nearFree([i, j]) { if (this.walkable(i, j)) return [i, j]; for (let r = 1; r <= 3; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) if (Math.max(Math.abs(di), Math.abs(dj)) === r && this.walkable(i + di, j + dj)) return [i + di, j + dj]; return [i, j]; },
  /* 레일에서 누른 일 · 머리 위 표시를 누른 일 */
  doJob(j) { if (!j) return false; sfx('tap', { vol: 0.35 }); j.run(); return true; },
  // ── 일 하나하나 (steps)
  jobBean() { const at = this.accessNear([ci(this.bagAt[0]), cj(this.bagAt[1])]); return this.assign([{ cell: at, face: this.bagAt, act: () => { const st = ST(), n = Math.min(this.handFree(), Math.ceil(st.bags / OWNER.bag)); if (n <= 0 || st.bags <= 0) return false; for (let k = 0; k < n && st.bags > 0; k++) { const q = Math.min(OWNER.bag, st.bags); st.bags -= q; this.owner.carry.push({ kind: 'bean', n: q }); } this.refreshBags(); this.handShow(); sfx('pick', { vol: 0.4 }); } },
      { cell: BAR_EXIT, face: [BIN.x, BIN.z], act: () => { let n = 0; for (const h of this.owner.carry.filter(h => h.kind === 'bean')) n += h.n; this.owner.carry = this.owner.carry.filter(h => h.kind !== 'bean'); this.handShow(); if (!n) return false; const add = Math.min(BEAN_MAX - S.beans, n); S.beans += add; ST().bags += n - add; this.refreshBags(); this.ui.float(`원두통 +${add}`, new V(BIN.x, 220, BIN.z), 'bean'); sfx('drop', { vol: 0.5 }); this.jobDone('bean', 4 * storeMult() * Math.ceil(n / OWNER.bag)); save(); this.ui.progress(); } }], { kind: 'bean' }); },
  jobServe() { const list = this.cust.filter(c => c.reserved && !c.taken && !c.delBy && c.state === 'seated' && this.seatFar(c.seat)).sort((a, b) => a.readyT - b.readyT).slice(0, Math.max(1, this.handFree())); if (!list.length) return false;
    for (const c of list) c.delBy = this.owner; const job = { kind: 'serve', cancel: () => { for (const c of list) if (c.delBy === this.owner && !c.taken) c.delBy = null; const back = this.owner.carry.filter(h => h.kind === 'tray'); for (const h of back) this.untake(h.c); this.owner.carry = this.owner.carry.filter(h => h.kind !== 'tray'); this.handShow(); } };
    const steps = [{ cell: BAR_PICK, face: [150, -455], act: () => { for (const c of list) if (c.delBy === this.owner && !c.taken && c.state === 'seated') { this.takeTray(c); this.owner.carry.push({ kind: 'tray', c }); } this.handShow(); sfx('pick', { vol: 0.4 }); if (!this.owner.carry.some(h => h.kind === 'tray')) return false; } }];
    /* 가까운 순으로 돌기 (층이 같으면 함께) */ const order = list.slice().sort((a, b) => floorOfX(a.pos.x) - floorOfX(b.pos.x) || a.seat.s.cell[1] - b.seat.s.cell[1]);
    for (const c of order) steps.push({ cell: c.seat.s.cell, face: [c.pos.x, c.pos.z], act: () => { const h = this.owner.carry.find(h => h.kind === 'tray' && h.c === c); if (!h) return true; this.owner.carry = this.owner.carry.filter(x => x !== h); this.handShow(); this.handTo(c, true); } });
    return this.assign(steps, job); },
  /* 쟁반을 손님에게 (먼 자리 · 사장님이면 팁 +20%) */
  handTo(c, byOwner) { if (c.gone || c.state !== 'seated') { this.untake(c); return; } const t = tray(MENU[c.menu].look, c.items); t.scale.setScalar(0.85); t.position.set(0, -6, 0); c.P.hand.add(t); this.served(c); c.state = 'drink'; c.t = rnd(7, 11);
    if (byOwner) { const tip = Math.round(c.pay * OWNER.far * (1 + this.bossK('tip'))); c.pay += tip; this.ui.float(`가져다 드림 · 팁 +${fmt(tip)}`, c.pos.clone().setY(240), 'pay sm'); this.jobDone('serve', tip); } sfx('blip', { vol: 0.4, rate: 1.4 }); },
  /* 들었던 쟁반을 픽업대로 되돌림 */
  untake(c) { if (!c.taken) return; for (const it of c.items) ST().bar[it.k] = (ST().bar[it.k] || 0) + it.n; c.taken = false; c.reserved = false; c.delBy = null; this.refreshBar(); if (!c.gone && c.state === 'seated') { c.readyT = this.t; } },
  jobClean(o, k) { const s = o.seats[k]; if (!s.cell) return false; return this.assign([{ cell: s.cell, face: [s.x, s.z], act: () => { if (!s.dirty) return true; const v = this.clean(o, k); this.sparkle(new V(s.x, 100, s.z)); this.jobDone('clean', v); } }], { kind: 'clean' }); },
  jobDessert() { const at = this.accessNear([ci(this.caseAt[0]), cj(this.caseAt[1])]);
    return this.assign([{ cell: at, face: this.caseAt, act: () => { const st = ST(); let took = 0; for (const [k, n] of Object.entries(st.case)) { while (st.case[k] > 0 && this.handFree() > 0) { const q = Math.min(st.case[k], MENU[k].n); st.case[k] -= q; this.owner.carry.push({ kind: 'dessert', k, n: q }); took++; } } this.refreshCase(); this.handShow(); if (!took) return false; sfx('pick', { vol: 0.4 }); } },
      { cell: BAR_PICK, face: [150, -455], act: () => { const st = ST(); let n = 0; for (const h of this.owner.carry.filter(h => h.kind === 'dessert')) { st.bar[h.k] = (st.bar[h.k] || 0) + h.n; n += h.n; } this.owner.carry = this.owner.carry.filter(h => h.kind !== 'dessert'); this.handShow(); this.refreshBar(); sfx('drop', { vol: 0.5 }); this.jobDone('dessert', 2 * n * storeMult()); save(); this.ui.progress(); } }], { kind: 'dessert' }); },
  jobGreet(c) { return this.assign([{ cell: this.nearFree([12, 8]), act: () => { if (!c.gone) this.greet(c); } }], { kind: 'greet' }); },
  jobWake(w) { const at = w === this.barista ? BAR_EXIT : this.accessNear(this.cellOf(w)); return this.assign([{ cell: at, face: [w.pos.x, w.pos.z], act: () => { this.wake(w); } }], { kind: 'wake' }); },
  jobStory(c) { const at = c.state === 'story' ? this.nearFree([11, 8]) : c.seat.s.cell; return this.assign([{ cell: at, face: [c.pos.x, c.pos.z], act: () => { if (c.gone || !c.story) return true; this.jobDone('story', 3 * storeMult()); if (window.__bot) { const ep = c.reg.eps[(S.reg[c.reg.id]?.ep) || 0]; if (ep) this.storyDone(c, ep.ch.slice().sort((a, b) => b[2] - a[2])[0]); } else this.ui.story(c); } }], { kind: 'story' }); },
  jobPlant(p) { return this.assign([{ cell: this.accessNear(p.cell), face: [p.x, p.z], act: () => { ST().plants[p.id] = today(); this.sparkle(new V(p.x, 120, p.z)); sfx('drop', { vol: 0.4, rate: 1.3 }); const v = this.jobDone('plant', (this.B.feat.yard ? 12 : 3) * storeMult()); if (this.B.feat.yard) { this.earn(v); this.ui.float(`귤 한 바구니 +${fmt(v)}`, new V(p.x, 220, p.z), 'pay sm'); } else this.ui.float('감성 지수 +6 (오늘)', new V(p.x, 220, p.z), 'heart'); save(); this.ui.progress(); } }], { kind: 'plant' }); },
  /* 바닥을 누름 = 그 칸으로 걸어감 (탭 이동) */
  walkTo(x, z) { const c = [ci(x), cj(z)], k = K(...c); if (!this.cells.has(k)) { const near = this.accessNear(c); if (!near) return false; return this.assign([{ cell: near }], { kind: 'walk' }); } if (this.block.has(k)) { const a = this.accessNear(c); if (!a) return false; return this.assign([{ cell: a }], { kind: 'walk' }); } return this.assign([{ cell: c }], { kind: 'walk' }); },
  // ── 돌발 일 8가지 (2~3분에 하나 · 지점마다 섞임 · 놓쳐도 사라질 뿐)
  eventAI(dt) { if (this.deco) return; const open = ST().open.length; if (open >= 2 || S.lv >= 4) { this.eventT -= dt; if (this.eventT <= 0 && this.events.length < 2) { this.eventT = rnd(...EVENT_GAP); this.spawnEvent(); } }
    if (ST().tasks && ST().tasks.length && this.events.length < 3 && this.t > 4) { ST().tasks.pop(); this.spawnEvent(true); save(); }   /* 순회 일감: 지점에 들르면 3개 */
    for (const e of this.events) { e.t -= dt; if (e.t <= 0) this.endEvent(e, false); else if (e.spin) e.g.rotation.y += dt; } },
  spawnEvent(patrol, only) { const pool = EVENTS.filter(d => (!only || d.id === only) && (!d.tour || d.tour.includes(S.si)) && (d.at !== 'seat' || this.cust.some(c => c.state === 'seated' || c.state === 'drink')));
    const def = pool[Math.floor(Math.random() * pool.length)]; if (!def) return; const e = { def, t: def.t * (patrol ? 1.5 : 1), patrol, cells: [], g: new THREE.Group(), id: Math.random().toString(36).slice(2, 7) }; this.sc.add(e.g);
    const floorCells = () => { const opts = [...this.cells.keys()].filter(k => !this.block.has(k) && !this.noPlace.has(k)).map(k => k.split(',').map(Number)); return opts[Math.floor(Math.random() * opts.length)]; };
    if (def.at === 'door') { e.cells = [this.nearFree([12, 9])]; const p = person({ body: def.id === 'flower' ? 0xE8B8A8 : def.id === 'tour' ? 0x6AA8C8 : 0x9AB0C8, hair: 0x3A2A1E }); p.g.position.set(cx(13) + 40, 0, cz(9)); p.g.rotation.y = -Math.PI / 2; e.g.add(p.g);
      if (def.id === 'group') for (let k = 0; k < 3; k++) { const q = person({ body: [0xC8A890, 0x8AA0B8, 0xB8C8A0][k], hair: 0x2A1E16 }); q.g.position.set(cx(14) + k * 50, 0, cz(9) + 40 - k * 30); q.g.scale.setScalar(0.92); e.g.add(q.g); }
      if (def.id === 'rain') { const u = cyl(4, 50, 30, 0x3A5A8A, 0, 150, 0, p.g, 10); u.position.y = 170; }
      if (def.id === 'flower') for (let k = 0; k < 5; k++) sph(8, [0xF6B8C8, 0xF6E0A0, 0xE8829A][k % 3], -8 + k * 5, 96, 30, p.g, 6, 4); }
    else if (def.at === 'seat') { const c = this.cust.filter(c => c.state === 'seated' || c.state === 'drink')[Math.floor(Math.random() * this.cust.filter(c => c.state === 'seated' || c.state === 'drink').length)]; e.c = c; e.cells = [c.seat.s.cell];
      if (def.id === 'dog') { const d = new THREE.Group(); d.position.set(c.pos.x + 50, 0, c.pos.z + 30); e.g.add(d); box(40, 26, 22, 0xD8B48A, 0, 12, 0, d); sph(14, 0xD8B48A, 22, 40, 0, d, 8, 6); }
      else { const ph = new THREE.Group(); ph.position.set(c.pos.x, 230, c.pos.z); e.g.add(ph); box(30, 22, 6, 0x3B3B42, 0, 0, 0, ph); e.spin = true; } }
    else { const n = def.n || 1; for (let k = 0; k < n; k++) { const c = floorCells(); if (!c) break; e.cells.push(c); const m = def.id === 'spill' ? (() => { const s = new THREE.Group(); cyl(30, 30, 2, 0x6A4228, 0, 1, 0, s, 14).scale.set(1, 1, 0.7); return s; })() : (() => { const s = new THREE.Group(); const rot = rnd(0, 3), bd = box(36, 1.5, 46, 0x5A3A22, 0, 2.5, 0, s); bd.rotation.y = rot; const pp = box(30, 2, 40, 0xFFFDF6, 0, 4, 0, s); pp.rotation.y = rot; for (let r = 0; r < 4; r++) box(20, 0.5, 2, 0x3B2A20, 0, 5.5, -12 + r * 7, s); return s; })(); m.position.set(cx(c[0]), 0, cz(c[1])); e.g.add(m); } }
    if (!e.cells.length) { this.sc.remove(e.g); return; } this.events.push(e); this.ui.event && this.ui.event(e, true); sfx('order', { vol: 0.35, rate: 1.3 }); },
  endEvent(e, done) { this.events = this.events.filter(x => x !== e); this.sc.remove(e.g); if (this.owner.job?.ev === e) this.owner.job = null; this.ui.event && this.ui.event(e, false, done); },
  /* 돌발 일 보상: 분치 돈(최근 1분 수익 기준) · ♥ · 시 글자 · 순회 일감은 ×1.5 */
  minuteValue() { return Math.max(40 * STORES[S.si].mult, (this.eps || 0) * 60); },
  jobEvent(e) { const d = e.def, steps = [], job = { kind: 'event', ev: e };
    const reward = () => { const v = this.earn(this.minuteValue() * d.min * (e.patrol ? 1.5 : 1) * (e.x2 ? 2 : 1)); S.hearts += d.heart; if (d.poem) this.addPoem(null, d.poem * 3); if (d.rush) this.rushUntil = this.t + d.rush; this.ui.float(`${d.icon} +${fmt(v)} ♥+${d.heart}`, this.owner.pos.clone().setY(260), 'pay'); sfx('reward', { vol: 0.5 }); this.jobDone('event', v * 0.2); this.endEvent(e, true); track('gs_event', { id: d.id }); save(); this.ui.progress(); this.ui.eventDone && this.ui.eventDone(e, v); };
    if (d.id === 'poem') { const left = e.cells.slice(); for (const c of left) steps.push({ cell: c, act: () => { const i = e.cells.findIndex(x => x[0] === c[0] && x[1] === c[1]); if (i >= 0) { e.cells.splice(i, 1); const m = e.g.children[i]; m && e.g.remove(m); sfx('pick', { vol: 0.4, rate: 1.2 }); } if (!e.cells.length) reward(); } }); }
    else if (d.id === 'group') steps.push({ cell: e.cells[0], act: () => { this.seatGroup(e); reward(); } });
    else if (d.id === 'flower') { steps.push({ cell: e.cells[0], act: () => { this.owner.carry.push({ kind: 'flower', c: 0xF6B8C8 }); this.handShow(); e.g.clear(); } }); const vase = this.seats().find(x => x.o.f.id === 'window' && x.s.cell) || this.seats().find(x => x.s.cell); steps.push({ cell: vase ? vase.s.cell : this.nearFree([7, 6]), act: () => { this.owner.carry = this.owner.carry.filter(h => h.kind !== 'flower'); this.handShow(); ST().plants.vase = today(); reward(); } }); job.cancel = () => { this.owner.carry = this.owner.carry.filter(h => h.kind !== 'flower'); this.handShow(); }; }
    else steps.push({ cell: d.at === 'seat' ? (e.c && !e.c.gone ? e.c.seat.s.cell : e.cells[0]) : e.cells[0], act: () => reward() });
    return this.assign(steps, job); },
  /* 단체 손님: 같은 구역 빈자리(넉넉한 곳)로 안내 → 주문 ×1.5 */
  seatGroup(e) { const by = new Map(); for (const x of this.freeSeats()) { const a = this.cells.get(K(...x.s.cell)); if (!a) continue; if (!by.has(a)) by.set(a, []); by.get(a).push(x); } const best = [...by.values()].sort((a, b) => b.length - a.length)[0]; if (!best) return 0;
    let n = 0; for (const seat of best.slice(0, e.def.seat || 6)) { const c = this.spawnDirect(seat, true); if (c) n++; } return n; },
  /* 줄을 안 서고 바로 주문 · 자리로 (단체 · 안내받은 손님) */
  spawnDirect(seat, group) { const P = person({ body: [0xC8A890, 0x8AA0B8, 0xB8C8A0, 0xE3B9A8][Math.floor(Math.random() * 4)], hair: 0x2A1E16, pants: 0x4A4A55 }); P.g.position.set(cx(DOOR[0]), 0, cz(DOOR[1])); this.sc.add(P.g); const items = this.pickItems();
    const c = { P, pos: P.g.position, seat, state: 'kiosk', items, menu: items[0].k, w: 0, group, greet: true, tag: this.ui.bubble(), cloud: this.ui.cloud ? this.ui.cloud() : null }; seat.s.who = c; this.cust.push(c); this.order(c); return c; },
  // ── 드라이브스루 · 배달 창구 (별관): 차가 창구에 서면 주문 → 픽업대에 나오면 사장님(또는 태민)이 창구로 → 포장 값 + 별점
  spawnCar() { if (!this.windowAt || (this.cars || []).length >= 3) return; const lane = this.windowAt[0] + 220, rider = this.B.feat.delivery && Math.random() < 0.4, g = new THREE.Group(); this.sc.add(g);
    if (rider) { const p = person({ body: 0x3A8A5A, hair: 0x1E1A16 }); g.add(p.g); box(30, 40, 90, 0x2E2E34, 30, 0, 0, g); } else { const col = [0xD8D2C8, 0x3A5A8A, 0xA92E2B, 0x5A5652, 0xE8E2D6][Math.floor(Math.random() * 5)]; box(120, 60, 220, col, 0, 20, 0, g); box(110, 50, 120, 0xDCEAEA, 0, 80, -10, g); for (const [x, z] of [[-60, -70], [60, -70], [-60, 70], [60, 70]]) { const w = cyl(22, 22, 16, 0x2A2A2E, x, 22, z, g, 10); w.rotation.z = Math.PI / 2; } }
    const items = this.pickItems(), q = (this.cars || []).length; g.position.set(lane, 0, this.windowAt[1] + 1400); const car = { g, pos: g.position, state: 'in', items, menu: items[0].k, w: 0, stopZ: this.windowAt[1] + q * 260, rider, P: { anim() {} } }; (this.cars ||= []).push(car); },
  carAI(dt) { if (!this.cars) return; const win = this.windowAt; for (const c of this.cars) { if (!win) { c.gone = true; continue; }
      if (c.state === 'in') { c.pos.z -= Math.min(300 * dt, c.pos.z - c.stopZ); if (c.pos.z - c.stopZ < 2) { c.state = 'line'; } }
      else if (c.state === 'line') { const ahead = this.cars.filter(x => x !== c && x.state !== 'out' && x.pos.z < c.pos.z - 10).length; c.stopZ = win[1] + ahead * 260; if (c.pos.z > c.stopZ + 2) c.pos.z -= Math.min(200 * dt, c.pos.z - c.stopZ); else if (!ahead) { c.state = 'wait'; this.ticketNo = (this.ticketNo || 0) + 1; c.ticket = { no: this.ticketNo, menu: c.menu, items: c.items, c, at: now(), car: true }; this.tickets.push(c.ticket); sfx('order', { vol: 0.3 }); } }
      else if (c.state === 'wait') { c.w += dt; if (!c.reserved && this.ready(c)) { for (const it of c.items) this.resv[it.k] = (this.resv[it.k] || 0) + it.n; c.reserved = true; c.readyT = this.t; }
        if (c.reserved && !c.taken && !c.delBy && this.t - c.readyT > 90) { const v = this.takeaway(c); this.dropTicket(c); this.ui.float(`포장해 갈게요 +${fmt(v)}`, c.pos.clone().setY(220), 'pay sm'); c.state = 'out'; }   /* 아무도 안 와도 벌 없음 */
        else if (!c.reserved && c.w > 150) { this.dropTicket(c); c.state = 'out'; } }
      else if (c.state === 'out') { c.pos.z -= 320 * dt; if (c.pos.z < win[1] - 1500) c.gone = true; } }
    this.cars = this.cars.filter(c => { if (c.gone) { this.sc.remove(c.g); if (c.reserved && !c.taken) for (const it of c.items) this.resv[it.k] -= it.n; return false; } return true; }); },
  jobTakeout(car, by = this.owner) { if (!car || car.delBy) return false; car.delBy = by; const hand = this.spot(SPOT.hand), hc = [ci(hand[0]), cj(hand[1])], job = { kind: 'takeout', cancel: () => { if (car.taken && !car.done) { this.untake(car); car.reserved = false; } car.delBy = null; this.owner.carry = this.owner.carry.filter(h => h.c !== car); this.handShow(); } };
    const steps = [{ cell: BAR_PICK, face: [150, -455], act: () => { if (car.gone || car.state !== 'wait' || !car.reserved) return false; this.takeTray(car); by.carry && (by.carry.push({ kind: 'tray', c: car }), this.handShow()); } },
      { cell: hc, face: this.windowAt, act: () => { by.carry && (by.carry = by.carry.filter(h => h.c !== car)); this.handShow(); car.done = true; const v0 = Math.round(car.items.reduce((a, it) => a + MENU[it.k].price * it.n, 0) * storeMult()), star = by === this.owner ? Math.round(v0 * 0.15 * (1 + this.bossK('tip'))) : 0; this.earn(v0 + star); for (const it of car.items) this.countSold(it.k, it.n); this.gainXp(car.items.reduce((a, it) => a + MENU[it.k].xp * it.n, 0)); car.state = 'out'; this.ui.float(`포장 ★ +${fmt(v0 + star)}`, new V(this.windowAt[0], 240, this.windowAt[1]), 'pay sm'); sfx('coin', { vol: 0.45 }); if (by === this.owner) this.jobDone('takeout', star); save(); this.ui.progress(); } }];
    if (by === this.owner) return this.assign(steps, job); by.task = { steps, job }; return true; },
  // ── 동료 (걷는 동료): 도윤 치우기 · 무진 원두 자루 · 은재 먼 자리 · 보람 디저트 · 태민 포장
  workerAI(w, dt) { if (this.restTick(w, dt)) return; w.P.anim(dt, false); const T = w.task;
    if (!T) { w.t -= dt; if (w.t <= 0) { w.t = 0.6 / this.cheerK(w); this.workerPick(w); } if (!w.task) { const h = w.home || [9, 4]; if (this.cellOf(w).join() !== h.join()) { if (!w.route || !w.route.length) w.route = this.path(this.cellOf(w), h); if (!w.route) { w.pos.set(cx(h[0]), 0, cz(h[1])); } this.walk(w, dt, w.sp * 0.6); } else w.P.g.rotation.y = Math.PI * 0.95; } return; }
    if (T.kind === 'clean') { if (this.walk(w, dt, STAFF.hall.lvx(this.lvOf('hall')).sp * this.cheerK(w))) { this.clean(T.o, T.k, w); w.task = null; } return; }
    /* steps 일 (자루 · 서빙 · 디저트 · 포장) */ const st = T.steps[0]; if (!st) { w.task = null; return; }
    if (!w.route) { w.route = this.path(this.cellOf(w), st.cell); if (!w.route) { w.pos.set(cx(st.cell[0]), 0, cz(st.cell[1])); w.route = []; } w.dw = 0; }
    if (!this.walk(w, dt, (STAFF[w.role].lvx ? (STAFF[w.role].lvx(this.lvOf(w.role)).sp || 300) : 300) * this.cheerK(w))) return; w.dw = (w.dw || 0) + dt; if (w.dw < OWNER.dwell) return;
    T.steps.shift(); w.route = null; let ok = true; try { ok = st.act() !== false; } catch (e) { console.error(e); ok = false; } if (!ok) { T.job?.cancel && T.job.cancel(); w.task = null; } else if (!T.steps.length) w.task = null; },
  workerPick(w) { const r = w.role;
    if (r === 'hall') { const d = this.seats().find(x => x.s.dirty && x.s.cell && !this.workers.some(o => o.task && o.task.kind === 'clean' && o.task.o === x.o && o.task.k === x.k) && !(this.owner.job?.kind === 'clean')); if (d) { w.task = { kind: 'clean', o: d.o, k: d.k }; w.route = this.path(this.cellOf(w), d.s.cell); } return; }
    if (r === 'roaster' && this.bagAt && ST().bags > 0 && S.beans < STAFF.roaster.lvx(this.lvOf('roaster')).low + 40) { w.carry = []; const at = w.home;
      w.task = { steps: [{ cell: at, act: () => { const st = ST(), n = Math.min(2, Math.ceil(st.bags / OWNER.bag)); for (let k = 0; k < n && st.bags > 0; k++) { const q = Math.min(OWNER.bag, st.bags); st.bags -= q; w.carry.push({ kind: 'bean', n: q }); } this.refreshBags(); if (!w.carry.length) return false; this.carryShow(w); } },
        { cell: BAR_EXIT, act: () => { let n = 0; for (const h of w.carry) n += h.n; w.carry = []; this.carryShow(w); const add = Math.min(BEAN_MAX - S.beans, n); S.beans += add; ST().bags += n - add; this.refreshBags(); this.sparkle(new V(BIN.x, 140, BIN.z)); save(); this.ui.progress(); } }], job: { cancel: () => { for (const h of w.carry) ST().bags += h.n; w.carry = []; this.carryShow(w); this.refreshBags(); } } }; return; }
    if (r === 'server') { const list = this.cust.filter(c => c.reserved && !c.taken && !c.delBy && c.state === 'seated' && this.seatFar(c.seat)).sort((a, b) => a.readyT - b.readyT).slice(0, 2); if (!list.length) return; for (const c of list) c.delBy = w; w.carry = [];
      const steps = [{ cell: BAR_PICK, act: () => { for (const c of list) if (c.delBy === w && !c.taken && c.state === 'seated') { this.takeTray(c); w.carry.push({ kind: 'tray', c }); } this.carryShow(w); if (!w.carry.length) return false; } }];
      for (const c of list) steps.push({ cell: c.seat.s.cell, act: () => { const h = w.carry.find(h => h.c === c); if (!h) return true; w.carry = w.carry.filter(x => x !== h); this.carryShow(w); this.handTo(c, false); } });
      w.task = { steps, job: { cancel: () => { for (const c of list) if (c.delBy === w) c.delBy = null; for (const h of w.carry) this.untake(h.c); w.carry = []; this.carryShow(w); } } }; return; }
    if (r === 'baker') { for (const m of this.machines.filter(m => m.bak)) { const p = this.progress(m); if (p && p.u >= 1) this.collect(m, 'baker'); else if (!p) { const k = Object.keys(MENU).find(q => MENU[q].oven && this.need(q) > 0 && S.lv >= MENU[q].lv); if (k) this.brew(m, k); } }
      if (this.caseAt && this.caseTotal() > 0) { w.carry = []; const at = w.home; w.task = { steps: [{ cell: at, act: () => { const st = ST(); for (const [k, n] of Object.entries(st.case)) if (n > 0 && w.carry.length < 2) { w.carry.push({ kind: 'dessert', k, n }); st.case[k] = 0; } this.refreshCase(); this.carryShow(w); if (!w.carry.length) return false; } },
        { cell: BAR_PICK, act: () => { const st = ST(); for (const h of w.carry) st.bar[h.k] = (st.bar[h.k] || 0) + h.n; w.carry = []; this.carryShow(w); this.refreshBar(); save(); } }], job: { cancel: () => { const st = ST(); for (const h of w.carry) st.case[h.k] = (st.case[h.k] || 0) + h.n; w.carry = []; this.carryShow(w); this.refreshCase(); } } }; } return; }
    if (r === 'takeout') { const car = (this.cars || []).find(c => c.reserved && !c.taken && !c.delBy); if (car) { w.carry = []; this.jobTakeout(car, w); } return; } },
  carryShow(w) { w.P.hand.clear(); (w.carry || []).forEach((h, i) => { const m = h.kind === 'tray' ? tray(MENU[h.c.menu].look, h.c.items) : h.kind === 'dessert' ? tray(MENU[h.k].look) : (() => { const g = new THREE.Group(); const s = cyl(14, 17, 30, 0xC8B08A, 0, 0, 0, g, 8); s.scale.set(1, 1, 0.8); return g; })(); m.scale.setScalar(0.8); m.position.set(0, -6 + i * 16, 0); w.P.hand.add(m); }); },
  // ── 누르기: 사장님 일감 대상 (돌발 일 · 자루 선반 · 진열장 · 창구 · 화분 · 쉬는 동료 · 금고 · 계약 책상 · 옷장 · 선물 · 잠긴 구역)
  pickOwner(ray) { const near = (x, y, z, r) => ray.distanceToPoint(new V(x, y, z)) < r;
    for (const e of this.events) for (const c of e.cells) if (near(cx(c[0]), 60, cz(c[1]), 90)) return { kind: 'event', e };
    for (const w of [...this.workers, this.barista].filter(w => w && w.rest > 0)) if (near(w.pos.x, 110, w.pos.z, 80)) return { kind: 'wake', w };
    if (this.bagAt && near(this.bagAt[0], 60, this.bagAt[1], 110)) return { kind: 'bags' };
    if (this.caseAt && near(this.caseAt[0], 80, this.caseAt[1], 90)) return { kind: 'case' };
    if (this.windowAt && near(this.windowAt[0], 80, this.windowAt[1], 120)) return { kind: 'window' };
    for (const p of this.pots || []) if (near(p.x, 60, p.z, 70)) return { kind: 'pot', p };
    if (this.officeAt) { if (near(this.officeAt.safe[0], 60, this.officeAt.safe[1], 80)) return { kind: 'visit', v: 'boss', at: this.officeAt.safe }; if (near(this.officeAt.desk[0], 60, this.officeAt.desk[1], 100)) return { kind: 'visit', v: 'boss', at: this.officeAt.desk }; }
    if (this.giftAt && near(this.giftAt[0], 50, this.giftAt[1], 90)) return { kind: 'visit', v: 'store', at: this.giftAt };
    for (const c of this.cars || []) if (near(c.pos.x, 60, c.pos.z, 130)) return { kind: 'car', c };
    return null; },
};
export { OWNER_JOBS };
