// 마루미 0.4 — 게임 한 판(지점 하나)의 바탕: 지점 짓기 · 생산 줄(받침 자동 넘김) · 손 · 진열 · 계산 · 돈 더미 · 테이블 · 카메라 · 한 프레임
//   공간 = space.js · 이동 = nav.js · 손님 = cust.js · 직원 = staff.js · 칸 = pads.js · 규칙표 = rules.js · 안내 = guide.js · 소리 = audio.js
import * as THREE from 'three';
import { SPACES, R, seatsOf } from './space.js?v=0.99.20';
import { Nav, separate } from './nav.js?v=0.99.20';
import { BRANCHES, MENU, PROD, PLAYER, MASTERY, MASTERY_K, setBranchMenu, BRAND, TIER_AT, tierOf, REGULARS, FAVOR, DECO, REST, VIP, EVENTS } from './data.js?v=0.99.20';
import { item, person, STATION, tierDeco, ownerRing, billBundle, bill, ghostify, M, ITEM_H } from './models.js?v=0.99.20';
import { buildWorld, buildDeco } from './world.js?v=0.99.20';
import { S, save, addSold, mission, vipOn } from './state.js?v=0.99.20';
import { sfx, loopLevel, music, BGM, stopLoops } from './audio.js?v=0.99.20';
import { applyRules, hand, FOOD } from './rules.js?v=0.99.20';
import { Cust } from './cust.js?v=0.99.20';
import { Staff } from './staff.js?v=0.99.20';
import { Pads } from './pads.js?v=0.99.20';
import { Guide } from './guide.js?v=0.99.20';
import { track } from './oad.js?v=0.99.20';

export const V = (x, z) => new THREE.Vector3(x, 0, z);
const NODE_PROD = { oven: 'bagel', top: 'cream', cream: 'coffee', coffee: 'drink' };
const HOP_SEMI = { retard: -5, mixer: 0, kettle: 4, oven: 7, top: 12 };   /* 받침 넘김 음: 반죽 C · 솥 E · 오븐 G · 작업대 C' */
export const starOf = nm => MASTERY.filter(x => (S.mast[nm] || 0) >= x).length;
export const favLv = f => FAVOR.filter(x => f >= x).length;
export const fxOn = k => (+S.fx[k] || 0) > Date.now();

export class Game {
  constructor(sc, cam) { this.sc = sc; this.cam = cam; this.root = null; this.time = 0; this.hudZ = 1; }
  // ── 지점 짓기
  build(bi) {
    if (this.root) { this.sc.remove(this.root); this.root.traverse(o => { if (o.geometry && !o.geometry.userData?.shared) o.geometry.dispose?.(); }); }
    for (const o of [...this.sc.children]) if (o.name === 'world' || o.name === 'deco') this.sc.remove(o);
    this.ui?.clearTags?.();
    this.bi = bi; this.B = BRANCHES[bi]; this.sp = SPACES[bi]; setBranchMenu(bi);
    const br = (S.branch[bi] ||= { own: [], paid: {}, build: {}, stock: null }); br.own ||= []; br.paid ||= {}; br.build ||= {}; this.br = br;
    this.root = new THREE.Group(); this.sc.add(this.root);
    this.lights();
    this.world = buildWorld(this.sc, this.sp, this.B, S.theme[bi]);
    this.nav = new Nav(this.sp);
    this.window = this.sp.window;
    this.nodes = {}; this.display = { bagel: [], cream: [], coffee: [], drink: [] }; this.shelf = []; this.piles = []; this.tables = {}; this.flying = []; this.staff = []; this.cust = []; this.fx = []; this.floatN = [];
    this.tillBy = null; this.payT = 0; this.camPull = null; this.ev = null; this.evT = EVENTS.first; this.idleInput = 0; this.restAt = 0;
    // 사장님
    const P = person({ ...PLAYER.look, ...(S.outfit && S.outfit !== 'basic' ? {} : {}) }); P.g.position.set(940, 0, 320); this.root.add(P.g); const ring = ownerRing(); P.g.add(ring);
    this.pl = { role: 'owner', P, g: P.g, pos: P.g.position, r: R.owner, stack: [], cap: PLAYER.carry, still: 0, spd: 0, last: new THREE.Vector3(940, 0, 320) };
    this.redrawAll();
    this.custSys = new Cust(this); this.staffSys = new Staff(this); this.pads = new Pads(this); this.guide = new Guide(this);
    this.staffSys.sync();
    if (br.stock) this.restock(br.stock);
    this.camT = new THREE.Vector3().copy(this.pl.pos); this.fitView(true);
    music(BGM[bi]); track('bg_branch', { b: bi, st: 'enter' });
    if (this.ui) this.ui.onBuild?.();
  }
  lights() { const I = this.B.interior; const h = new THREE.HemisphereLight(I.hemi[0], I.hemi[1], I.hemi[2]); const sun = new THREE.DirectionalLight(I.sun, 1.9); sun.position.set(-500, 1400, 700); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -1300, right: 1300, top: 1300, bottom: -1300, near: 10, far: 4000 }); sun.shadow.bias = -0.0006; sun.target.position.set(700, 0, 900); this.root.add(h, sun, sun.target); this.sun = sun; }
  // ── 열림 상태
  own(id) { return this.br.own.includes(id) && !this.br.build[id]; }
  bought(id) { return this.br.own.includes(id); }
  lv(k) { let n = 0; for (const id of this.br.own) { const [a, b] = id.split('+'); if (a === k && b) n = Math.max(n, +b); } return n; }
  roomOpen(k) { return this.own(k); }
  hasStaff(role) { return this.staff.some(w => w.role === role); }
  open = id => this.own(id);
  /* 열린 것이 바뀌면 한 번: 시설 모델 · 테이블 · 칸 · 장애물 격자 · 직원 */
  redrawAll() {
    const sp = this.sp;
    this.nav.rebuild(this.open, k => this.roomOpen(k));
    this.world.setOpen(this.open, k => this.roomOpen(k), this.own(sp.feat));
    for (const n of Object.values(this.nodes)) { n.g && this.root.remove(n.g); n.tr && this.root.remove(n.tr); }
    for (const [id, nd] of Object.entries(sp.nodes)) { const n = (this.nodes[id] ||= { id, tray: [], input: 0, t: 0, inT: [] }); n.g = null; if (!this.own(id)) continue;
      const g = new THREE.Group(), r = nd.rect; g.position.set((r[0] + r[2]) / 2, 0, (r[1] + r[3]) / 2); g.rotation.y = nd.face === 'W' ? -Math.PI / 2 : nd.face === 'E' ? Math.PI / 2 : 0; STATION[nd.model](g);
      const t = tierOf(this.lv(id)); if (t) g.add(tierDeco(nd.model === 'ccbar' ? 'cc' : nd.model, t, { oven: [200, 170, 140], mixer: [110, 60, 90], kettle: [130, 80, 110], ccbar: [220, 95, 110], coffee: [130, 150, 100], espresso: [130, 95, 100], retard: [144, 190, 110] }[nd.model] || [150, 100, 100]));
      if (nd.pick) { const tr = new THREE.Group(); tr.position.set(nd.pick[0], 0, nd.pick[1]); STATION.tray(tr); this.root.add(tr); n.tr = tr; }
      n.g = g; this.root.add(g); n.tier = t; }
    // 계산대
    if (this.ctrG) this.root.remove(this.ctrG); this.ctrG = null;
    if (this.own('counter')) { const r = sp.counter.rect, g = new THREE.Group(); g.position.set((r[0] + r[2]) / 2, 0, (r[1] + r[3]) / 2); STATION.counter(g); this.root.add(g); this.ctrG = g; }
    // 테이블 · 창가 바 · 2층 · 테라스
    if (this.tabG) this.root.remove(this.tabG); this.tabG = new THREE.Group(); this.root.add(this.tabG);
    const allT = [...sp.tables, ...(sp.upper && this.own(sp.feat) ? sp.upper.tables : []), ...(sp.terrace && this.own(sp.feat) ? sp.terrace.tables : [])];
    for (const t of allT) { if (!(t.y || t.picnic) && !this.own(t.id)) continue; const g = new THREE.Group(); g.position.set(t.x, t.y || 0, t.z); if (t.picnic) { g.rotation.y = Math.PI / 2; STATION.picnic(g); } else { g.rotation.y = Math.PI / 2; STATION.table(g); } this.tabG.add(g); this.tables[t.id] ||= { id: t.id, trash: 0, x: t.x, z: t.z, y: t.y || 0, meshes: [] }; this.tables[t.id].g = g; }
    if (this.own('bar')) { const r = sp.bar.rect, g = new THREE.Group(); g.position.set((r[0] + r[2]) / 2, 0, (r[1] + r[3]) / 2); STATION.bar(g, r[2] - r[0], r[3] - r[1]);
      for (const s of sp.bar.seats) { const st = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 8, 12), M(BRAND.accentHex)); st.position.set(s[0] - g.position.x + 30, 68, s[1] - g.position.z); g.add(st); } this.tabG.add(g); this.tables.bar ||= { id: 'bar', trash: 0, x: r[0] - 20, z: (r[1] + r[3]) / 2, y: 0, meshes: [] }; }
    this.seats = seatsOf(sp, this.open);
    // 직원 자리: 점선 원 (서 있으면 초록) — 계산 자리 · 토핑 · 음료 · 창구
    if (this.ringG) this.root.remove(this.ringG); this.ringG = new THREE.Group(); this.root.add(this.ringG); this.rings = {};
    const spots = { cashier: sp.counter.till, topper: sp.nodes.top.staff, barista: sp.nodes.cream.staff, ...(sp.window ? { [sp.F.staff]: sp.window.staff } : {}) };
    for (const [role, at] of Object.entries(spots)) { if (!at || !this.br.own.includes(role)) continue; const m = new THREE.Mesh(new THREE.RingGeometry(36, 44, 24, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2FA36B, transparent: true, opacity: 0.6, depthWrite: false })); m.position.set(at[0], 2, at[1]); this.ringG.add(m); this.rings[role] = m; }
    // 꾸미기
    if (this.decoG) this.sc.remove(this.decoG); this.decoG = buildDeco(this.sc, sp, S.deco[this.bi], this.open);
    // 돈 칸 (계산대 · 창구 · 테이블 · 2층 · 테라스)
    const want = [];
    if (this.own('counter')) want.push(['ctr', sp.counter.cash]);
    if (sp.window && this.own(sp.feat)) want.push(['win', sp.window.cash]);
    if (sp.upper && this.own(sp.feat)) want.push(['up2', sp.upper.cash]);
    if (sp.terrace && this.own(sp.feat)) want.push(['ter', sp.spots.terraceCash]);
    for (const t of sp.tables) if (this.own(t.id)) want.push([t.id, [t.x + 120, t.z]]);   /* 테이블 돈 칸: 테이블 동쪽 (통로 · 의자 길 밖) */
    if (this.own('bar')) want.push(['bar', [sp.bar.lane + 90, 1330]]);
    for (const [id, at] of want) if (!this.piles.find(p => p.id === id)) { const g = new THREE.Group(); g.position.set(at[0], 0, at[1]); const pad = new THREE.Mesh(new THREE.PlaneGeometry(120, 80).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9AD6A6, transparent: true, opacity: 0.55, depthWrite: false })); pad.position.y = 1.5; g.add(pad); this.root.add(g); this.piles.push({ id, x: at[0], z: at[1], v: 0, g, n: 0, bundles: [] }); }
    this.pl.cap = PLAYER.carry + this.lv('carry') + (fxOn('tray') ? 4 : 0);
    this.staffSys?.sync(); this.pads?.refresh();
  }
  // ── 생산: 받침 자동 넘김 (DESIGN 2장) — 앞 시설 → 다음 시설로 0.35초 포물선 · 사람은 줄 사이를 나르지 않음
  rate(id) { const L = this.lv(id), boost = (+S.fx.staff || 0) > Date.now() ? 1.3 : 1;   /* 상점 「직원 응원 커피」 */
    if (id === 'oven') return (this.own('mixer') ? PROD.mixer.boost : 1) * (1 + PROD.oven.k * L) * (1 + PROD.mixer.k * this.lv('mixer')) * (this.own('retard') ? PROD.retard.boost : 1);
    if (id === 'top') return (1 + PROD.top.k * L) * (this.staffAt('topper') ? 1.5 : 1) * boost;
    if (id === 'cream' || id === 'coffee') return (1 + PROD[id].k * L) * (this.staffAt('barista') ? 1.4 : 1) * boost;
    return 1; }
  staffAt(role) { const w = this.staff.find(x => x.role === role); return w && !w.rest ? (w.boostT > 0 ? REST.boostK : 1) : 0; }
  trayCap(id) { return PROD[id].tray + Math.floor(this.lv(id) / 2); }
  prodTick(dt) {
    const N = this.nodes;
    if (this.own('oven')) { const n = N.oven, sec = PROD.oven.sec / this.rate('oven'); const topIn = this.own('top') && N.top.input + N.top.inT.length < PROD.top.input, full = n.tray.length >= this.trayCap('oven') && !topIn;
      if (!full) { n.t += dt; const pre = sec - 0.5; if (n.t >= pre && !n.pre) { n.pre = 1; this.upstreamHop('oven'); }
        if (n.t >= sec) { n.t = 0; n.pre = 0; sfx('oven_ding', this.at3(this.sp.nodes.oven.pick)); if (topIn) this.hop('oven', 'top', 'bagel'); else this.trayAdd('oven', 'bagel'); } } }
    if (this.own('top')) { const n = N.top, sec = PROD.top.sec / this.rate('top'); if (n.input > 0 && n.tray.length < this.trayCap('top')) { n.t += dt; if (n.t >= sec) { n.t = 0; n.input--; this.inputDraw('top'); this.trayAdd('top', 'cream'); } } }
    for (const id of ['cream', 'coffee']) if (this.own(id)) { const n = N[id], sec = PROD[id].sec / this.rate(id); if (n.tray.length < this.trayCap(id)) { n.t += dt; if (n.t >= sec) { n.t = 0; this.trayAdd(id, NODE_PROD[id]); if (id === 'coffee') this.grind = 1.4; } } }
  }
  /* 오븐이 한 판 굽기 전: 앞 시설들이 차례로 「통통」 넘겨 줌 (숙성고 → 반죽기 → 솥 → 오븐) */
  upstreamHop(to) { if (to === 'oven') sfx('oven_door', this.at3(this.sp.nodes.oven.pick)); const chain = []; let cur = to; for (;;) { const prev = Object.entries(this.sp.nodes).find(([k, n]) => n.next === cur && this.own(k)); if (!prev) break; chain.unshift(prev[0]); cur = prev[0]; }
    chain.forEach((id, k) => setTimeout(() => this.hop(id, this.sp.nodes[id].next, this.sp.nodes[id].out), k * 120)); }
  hop(from, to, kind) { const a = this.sp.nodes[from], b = this.sp.nodes[to], ra = a.rect, rb = b.rect, m = item(kind === 'bagel' && from === 'kettle' ? 'boiled' : kind);
    const p0 = V((ra[0] + ra[2]) / 2, (ra[1] + ra[3]) / 2), p1 = V((rb[0] + rb[2]) / 2, (rb[1] + rb[3]) / 2); p0.y = 110; p1.y = 110; m.position.copy(p0); this.root.add(m);
    this.flying.push({ m, p0, p1, t: 0, T: 0.35, h: 90, done: () => { this.root.remove(m); if (to === 'top') { this.nodes.top.input++; this.inputDraw('top'); } } });
    sfx('hop', { semi: HOP_SEMI[from] || 0, ...this.at3([(ra[0] + ra[2]) / 2, ra[3]]) }); }
  inputDraw(id) { const n = this.nodes[id]; for (const m of n.inT) this.root.remove(m); n.inT = []; const nd = this.sp.nodes[id], r = nd.rect; for (let i = 0; i < n.input; i++) { const m = item('bagel'); m.position.set(r[0] + 30, 96 + i * ITEM_H.bagel, (r[1] + r[3]) / 2); this.root.add(m); n.inT.push(m); } }
  trayAdd(id, k) { const n = this.nodes[id], p = this.sp.nodes[id].pick, m = item(k); m.position.set(p[0], 82 + n.tray.length * ITEM_H[k], p[1]); this.root.add(m); n.tray.push({ k, m }); this.pop(m); }
  trays(a) { const out = []; for (const [id, k] of Object.entries(NODE_PROD)) if (this.own(id) && this.nodes[id].tray.length) { const p = this.sp.nodes[id].pick; out.push({ id, k, x: p[0], z: p[1] }); } return out; }
  trayCount(id) { return this.nodes[id]?.tray.length || 0; }
  takeFromTray(a, id) { const n = this.nodes[id], it = n.tray.pop(); if (!it) return; this.toHand(a, it.k, it.m); if (a.role === 'owner') { sfx('pick'); this.firstPick ??= this.time; } }
  // ── 손: 탑으로 쌓음 (걸으면 출렁임 · 놓을 때 0.1초 튀어오름)
  toHand(a, k, from) { const m = item(k); a.stack.push({ k, m }); const P = a.P; P.hand.add(m); m.position.set(0, (a.stack.length - 1) * (ITEM_H[k] || 15), 0); P.carry = true;
    if (from) { this.root.remove(from); } }
  fromHand(a, idx) { const it = a.stack.splice(idx, 1)[0]; if (!it) return null; it.m.parent?.remove(it.m); this.restack(a); return it; }
  restack(a) { let y = 0; for (const s of a.stack) { s.m.position.set(0, y, 0); y += ITEM_H[s.k] || 15; } a.P.carry = a.stack.length > 0; }
  // ── 진열 (계산대 4칸)
  dispCap() { return 16; }
  dispCount(k) { return this.display[k].length; }
  canDisplay(a) { return a.stack.some(s => FOOD.includes(s.k) && this.display[s.k].length < this.dispCap()); }
  putOnDisplay(a) { for (let i = a.stack.length - 1; i >= 0; i--) { const s = a.stack[i]; if (FOOD.includes(s.k) && this.display[s.k].length < this.dispCap()) { this.fromHand(a, i); this.dispAdd(s.k); if (a.role === 'owner') sfx('place'); this.jobsDirty = 1; return true; } } return false; }
  dispAdd(k) { const sh = this.sp.counter.shelf[k], L = this.display[k], m = item(k), n = L.length, col = n % 2, row = Math.floor(n / 2) % 2, lay = Math.floor(n / 4); m.position.set(sh[0] - 15 + col * 30, 114 + lay * ITEM_H[k], sh[1] - 20 + row * 34); this.root.add(m); L.push(m); this.pop(m, 0.1); }
  dispTake(k) { const m = this.display[k].pop(); if (m) this.root.remove(m); return !!m; }
  takeFromDisplay(a, k) { if (!this.dispTake(k)) return; this.toHand(a, k); }
  // ── 창구 선반 (픽업 · 드라이브)
  shelfWants(a) { const need = this.custSys.windowNeed(); return a.stack.some(s => need[s.k] > 0); }
  putOnShelf(a) { const need = this.custSys.windowNeed(); for (let i = a.stack.length - 1; i >= 0; i--) { const s = a.stack[i]; if (need[s.k] > 0) { this.fromHand(a, i); const m = item(s.k), sh = this.sp.window.shelf; m.position.set(sh[0] + (this.shelf.length % 3) * 20 - 20, 104 + Math.floor(this.shelf.length / 3) * 16, sh[1] - 40 + (this.shelf.length % 2) * 30); this.root.add(m); this.shelf.push({ k: s.k, m }); if (a.role === 'owner') sfx('place'); return; } } }
  shelfTake(k) { const i = this.shelf.findIndex(s => s.k === k); if (i < 0) return false; this.root.remove(this.shelf[i].m); this.shelf.splice(i, 1); return true; }
  // ── 쓰레기
  trashSpots() { const out = []; for (const t of Object.values(this.tables)) if (t.trash > 0 && !t.y && !t.out) out.push({ id: t.id, x: t.x, z: t.z, r: t.id === 'bar' ? 160 : 150 }); return out; }
  tableTrash(id) { return this.tables[id]?.trash || 0; }
  takeTrash(a, id) { const t = this.tables[id]; if (!t || t.trash <= 0) return; t.trash--; const m = t.meshes.pop(); if (m) m.parent?.remove(m); this.toHand(a, 'trash'); this.seatsFree(); if (a.role === 'owner') sfx('pick', { semi: -5 }); }
  dropTrash(a) { const i = a.stack.findIndex(s => s.k === 'trash'); if (i < 0) return; this.fromHand(a, i); sfx('trash', { vol: a.role === 'owner' ? 0 : -6 }); mission('clean'); }
  addTrash(seat) { const t = this.tables[seat.table]; if (!t) return; if (!t.trash) t.trashAt = this.time; t.trash++; const m = item('trash'); m.position.set(seat.at[0] * 0.4 + seat.tx * 0.6, (t.y || 0) + 86, seat.at[1] * 0.4 + seat.tz * 0.6); this.root.add(m); t.meshes.push(m); }
  seatsFree() { this.custSys?.seatsChanged(); }
  // ── 돈: 더미 (가로 3 × 2 × 층 최대 12) · 줍기 = 0.4초에 빨려 옴 · 더미 하나에 「찰칵」 한 번 (금액 크면 3단)
  addCash(pid, v) { const p = this.piles.find(q => q.id === pid) || this.piles[0]; if (!p) return; p.v += v; this.pileDraw(p); sfx('cash_land', this.at3([p.x, p.z])); }
  pileDraw(p) { const unit = 4 * this.B.mult, want = Math.min(72, Math.ceil(p.v / unit)); while (p.bundles.length < want) { const i = p.bundles.length, b = billBundle(), col = i % 3, row = Math.floor(i / 3) % 2, lay = Math.floor(i / 6); b.position.set(-38 + col * 38, 4 + lay * 9, -11 + row * 22); b.rotation.y = (i * 0.37 % 0.2) - 0.1; p.g.add(b); p.bundles.push(b); }
    while (p.bundles.length > want) p.g.remove(p.bundles.pop()); }
  collect(p) { if (p.v <= 0) return; const v = Math.round(p.v * (this.boostOn() ? 2 : 1)); p.v = 0; const n = Math.min(10, p.bundles.length);
    for (let i = 0; i < n; i++) { const b = p.bundles.pop(); const w = new THREE.Vector3(); b.getWorldPosition(w); p.g.remove(b); this.root.add(b); b.position.copy(w); this.flying.push({ m: b, p0: w.clone(), p1: this.pl.pos, follow: true, t: -i * 0.03, T: 0.4, h: 60, done: () => this.root.remove(b) }); }
    for (const b of p.bundles) p.g.remove(b); p.bundles = [];
    S.coins += v; S.earned += v; mission('cash'); if (this.firstPick != null && !window.__firstLoop) window.__firstLoop = { loop: this.time - this.firstPick, cash: this.time };   /* 시험 R6: 첫 집기 → 첫 줍기 */ const nx = this.pads?.nextCost() || 100, tier = v >= nx ? 3 : v >= nx * 0.5 ? 2 : 1; sfx('cash_get', { v: tier }); this.ui?.money(v, p); this.lastCollect = this.time; save(); }
  boostOn() { return Date.now() < (+S.boostUntil || 0); }
  // ── 값
  price(k) { const B = this.B, base = k === 'bagel' && this.own('kettle') ? PROD.kettle.chewy * (1 + PROD.kettle.k * this.lv('kettle')) : MENU[k].price;
    return base * B.mult * (1 + 0.06 * this.lv('price')) * (1 + MASTERY_K * (starOf(MENU[k].name) - 1)) * (this.own('retard') && k === 'bagel' ? 1 + PROD.retard.premium : 1) * (vipOn() ? VIP.mult : 1); }
  menuKinds() { return FOOD.filter(k => this.own({ bagel: 'oven', cream: 'top', coffee: 'cream', drink: 'coffee' }[k])); }
  sold(k, n) { const nm = MENU[k].name; S.mast[nm] = (S.mast[nm] || 0) + n; addSold(n); S.sales = S.sales?.day === S.day ? S.sales : { day: S.day, n: {} }; S.sales.n[k] = (S.sales.n[k] || 0) + n; }
  // ── 돌봄
  wake(w) { if (!w.rest) return; w.rest = false; w.boostT = REST.boost; sfx('hello'); this.ui?.say('직원이 다시 힘내요!', w.pos); }
  phoneNear(c, dt) { c.phoneHold = (c.phoneHold || 0) + dt; if (c.phoneHold >= EVENTS.phone.hold) this.custSys.endPhone(c, true); }
  // ── 작은 연출
  pop(m, T = 0.2) { m.scale.setScalar(0.4); this.fx.push({ t: 0, T, f: k => m.scale.setScalar(0.4 + 0.6 * (k < 0.7 ? k / 0.7 * 1.15 : 1.15 - 0.15 * (k - 0.7) / 0.3)) }); }
  at3(p) { if (!p) return {}; const dx = p[0] - this.pl.pos.x, dz = p[1] - this.pl.pos.z; return { dist: Math.hypot(dx, dz), pan: dx / 900 }; }
  // ── 카메라 (DESIGN 9장): 직교 · 남서쪽 수평 18° · 내려다봄 55° · 폰 가로 11.6m · 목표 = 사장과 계산대 사이 35% · 새 시설 때만 2.5초
  fitView(snap) { const w = innerWidth, h = innerHeight, a = w / h; this.pc = a > 0.8; const HW = this.pc ? Math.max(1350, 980 * a) : 580;   /* 폰: 가로 11.6m · PC: 본관 + 별채(폭 24m)를 가운데 판에 */
    this.cam.left = -HW; this.cam.right = HW; this.cam.top = HW / a; this.cam.bottom = -HW / a; this.cam.near = 1; this.cam.far = 9000; this.cam.updateProjectionMatrix(); if (snap) this.camUpdate(1, true); }
  camUpdate(dt, snap) { const sp = this.sp, anc = sp.spots.camAnchor; let tx, tz;
    if (this.pc) { tx = sp.spots.pcCenter[0]; tz = sp.spots.pcCenter[1]; }
    else { const k = 0.35; tx = this.pl.pos.x + (anc[0] - this.pl.pos.x) * k; tz = this.pl.pos.z + (anc[1] - this.pl.pos.z) * k; }
    if (this.camPull) { const c = this.camPull; c.t += dt; const e = c.t < 0.5 ? c.t / 0.5 : c.t > 2.0 ? Math.max(0, (2.5 - c.t) / 0.5) : 1; tx += (c.x - tx) * e; tz += (c.z - tz) * e; if (c.t >= 2.5) this.camPull = null; }
    const T = this.camT; T.x += (tx - T.x) * (snap ? 1 : Math.min(1, dt * 6)); T.z += (tz - T.z) * (snap ? 1 : Math.min(1, dt * 6));
    const az = 18 * Math.PI / 180, el = 55 * Math.PI / 180, D = 3000; this.cam.position.set(T.x - Math.sin(az) * Math.cos(el) * D, Math.sin(el) * D, T.z + Math.cos(az) * Math.cos(el) * D); this.cam.lookAt(T.x, 0, T.z); }
  // ── 한 프레임
  update(dt, IN) {
    this.time += dt;
    const pl = this.pl, moving = Math.hypot(IN.x, IN.y) > 0.05;
    if (moving) this.idleInput = 0; else this.idleInput += dt;
    // 사장 이동 (화면 기준 끌기 → 바닥 방향 · 카메라 수평 18°)
    const spd = PLAYER.speed * (1 + 0.08 * this.lv('walk')) * (fxOn('speed') ? 1.4 : 1);
    if (moving && !this.ui?.blocking?.()) { const az = 18 * Math.PI / 180, c = Math.cos(az), s = Math.sin(az), dx = (IN.x * c + IN.y * s) * spd * dt, dz = (-IN.x * s + IN.y * c) * spd * dt; this.nav.move(pl.pos, dx, dz, pl.r); pl.g.rotation.y = Math.atan2(dx, dz); }
    pl.spd = pl.last.distanceTo(pl.pos) / Math.max(dt, 1e-4); pl.last.copy(pl.pos); pl.still = pl.spd < 20 ? pl.still + dt : 0;
    pl.P.anim(dt, pl.spd > 20); this.wobble(pl, dt);
    pl.cap = PLAYER.carry + this.lv('carry') + (fxOn('tray') ? 4 : 0);
    this.tillBy = null; applyRules(this, pl, dt);
    this.prodTick(dt);
    this.custSys.update(dt);
    this.staffSys.update(dt);
    separate([pl, ...this.staff.filter(w => !w.y)], this.nav);   /* 사장 · 직원끼리만 밀어냄 · 손님은 정해진 고리 위라 사장 · 직원이 사이를 지나갈 수 있음 (줄을 막지도, 사장이 손님에게 밀려 갇히지도 않음) */
    this.pads.update(dt);
    this.guide.update(dt);
    // 날아가는 것 · 연출
    for (let i = this.flying.length - 1; i >= 0; i--) { const f = this.flying[i]; f.t += dt; if (f.t < 0) continue; const k = Math.min(1, f.t / f.T), p1 = f.follow ? new THREE.Vector3(f.p1.x, 150, f.p1.z) : f.p1;
      f.m.position.lerpVectors(f.p0, p1, k); f.m.position.y += Math.sin(k * Math.PI) * f.h; if (k >= 1) { this.flying.splice(i, 1); f.done && f.done(); } }
    for (let i = this.fx.length - 1; i >= 0; i--) { const e = this.fx[i]; e.t += dt; e.f(Math.min(1, e.t / e.T)); if (e.t >= e.T) this.fx.splice(i, 1); }
    // 소리: 설비 루프 (3m 안 최대 · 8m 밖 0) · 홀 웅성임 (앉은 손님 수)
    if ((this._lt = (this._lt || 0) + dt) > 0.25) { this._lt = 0; for (const [id, L] of [['mixer', 'mixer'], ['kettle', 'kettle'], ['oven', 'oven']]) { if (!this.own(id)) { loopLevel(L, 0); continue; } const r = this.sp.nodes[id].rect, d = Math.hypot(pl.pos.x - (r[0] + r[2]) / 2, pl.pos.z - (r[1] + r[3]) / 2) / 100; loopLevel(L, d < 3 ? 1 : Math.max(0, 1 - (d - 3) / 5)); }
      if (this.own('coffee')) { const r = this.sp.nodes.coffee.rect, d = Math.hypot(pl.pos.x - (r[0] + r[2]) / 2, pl.pos.z - (r[1] + r[3]) / 2) / 100; loopLevel('coffee', this.grind > 0 ? (d < 3 ? 1 : Math.max(0, 1 - (d - 3) / 5)) : 0); }
      loopLevel('hall', Math.min(1, this.cust.filter(c => c.state === 'eat').length / 6)); }
    if (this.grind > 0) this.grind -= dt;
    // 직원 쉬기: 화면을 45초 안 만지면 고정 자리 직원 1명 zZ (계산원 제외)
    this.staffSys.restTick(dt);
    this.eventTick(dt);
    this.camUpdate(dt);
    if (this.rings) for (const [role, m] of Object.entries(this.rings)) { const w = this.staff.find(x => x.role === role); m.material.color.setHex(w && !w.rest && Math.hypot(w.pos.x - m.position.x, w.pos.z - m.position.z) < 45 ? 0x2FA36B : 0xC9B79C); }
    for (const n of Object.values(this.nodes)) if (n.g) n.g.traverse(o => { if (o.userData.spin) o.rotation.y += dt * 2; });
  }
  wobble(a, dt) { const h = a.P.hand, sp = Math.min(1, (a.spd || 0) / 300); a.wob = (a.wob || 0) + dt * 12.5; const ang = Math.sin(a.wob) * 0.052 * sp;
    let i = 0; for (const s of a.stack) { s.m.rotation.z = ang * (1 + i * 0.25); s.m.position.x = Math.sin(a.wob) * sp * i * 0.8; i++; } }
  // ── 돌발 이벤트: 통화 손님 · 단체 · 인플루언서 (놓쳐도 벌 없음)
  eventTick(dt) { if (this.ev) { this.ev.t -= dt; if (this.ev.t <= 0) { if (this.ev.type === 'phone' && this.ev.c?.phone) this.custSys.endPhone(this.ev.c, false); this.ev = null; } return; }
    const opened = ['oven', 'kettle', 'top', 'mixer', 'cream', 'coffee'].filter(k => this.own(k)).length; if (opened < EVENTS.minOpen || this.pads.progress() < 0.2) return;
    this.evT -= dt; if (this.evT > 0) return; this.evT = EVENTS.every[0] + Math.random() * (EVENTS.every[1] - EVENTS.every[0]);
    const type = ['phone', 'group', 'influencer'][Math.floor(Math.random() * 3)];
    if (type === 'phone') { const c = this.cust.find(x => x.state === 'order' && !x.phone); if (!c) return; c.phone = true; c.phoneHold = 0; this.ev = { type, t: EVENTS.phone.sec, c }; sfx('phone', this.at3([c.pos.x, c.pos.z])); }
    if (type === 'group') { if (!this.custSys.group()) return; this.ev = { type, t: EVENTS.group.sec }; }
    if (type === 'influencer') { this.ev = { type, t: EVENTS.influencer.sec }; this.ui?.note('📸 인플루언서 방문 · 손님 두 배!'); }
  }
  // ── 저장: 진열 · 받침 재고 · 바닥 돈
  snap() { const st = { disp: Object.fromEntries(FOOD.map(k => [k, this.display[k].length])), tray: Object.fromEntries(Object.entries(this.nodes).map(([k, n]) => [k, n.tray.length])), pile: Object.fromEntries(this.piles.map(p => [p.id, Math.round(p.v)])) }; this.br.stock = st; }
  restock(st) { for (const k of FOOD) for (let i = 0; i < Math.min(16, st.disp?.[k] || 0); i++) this.dispAdd(k); for (const [id, n] of Object.entries(st.tray || {})) if (this.own(id) && NODE_PROD[id]) for (let i = 0; i < Math.min(this.trayCap(id), n); i++) this.trayAdd(id, NODE_PROD[id]); for (const p of this.piles) if (st.pile?.[p.id]) { p.v = st.pile[p.id]; this.pileDraw(p); } }
  leave() { this.snap(); let v = 0; for (const p of this.piles) { v += p.v; p.v = 0; } S.coins += Math.round(v); stopLoops(); return Math.round(v); }
  /* 새로 열림 (pads.js 가 부름): 저장 → 다시 그림 → 연출 */
  /* 반짝임 0.3초 (강화 · 등급) — 작은 별 6개가 솟았다 사라짐 */
  sparkle(x, z, big) { const n = big ? 12 : 6; for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(big ? 9 : 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xFFD24A : 0xFFFFFF, transparent: true })); const a = i / n * Math.PI * 2; m.position.set(x, 120, z); this.root.add(m);
    this.fx.push({ t: 0, T: big ? 0.6 : 0.3, f: k => { m.position.set(x + Math.cos(a) * 80 * k, 120 + 90 * k, z + Math.sin(a) * 80 * k); m.material.opacity = 1 - k; m.rotation.y = k * 6; if (k >= 1) this.root.remove(m); } }); } }
  opened(o, at) { this.redrawAll();
    if (o.kind === 'up') { const [k, lv] = o.id.split('+'), nd = this.sp.nodes[k]; if (nd) { const r = nd.rect, cx = (r[0] + r[2]) / 2, cz = (r[1] + r[3]) / 2; this.sparkle(cx, cz, [3, 6, 9].includes(+lv)); if (this.nodes[k]?.g) this.pop(this.nodes[k].g, 0.2); } } if (o.kind === 'node' || o.kind === 'table' || o.kind === 'zone' || o.kind === 'feat' || o.kind === 'room') { if (at && o.kind !== 'table') this.camPull = { x: at[0], z: at[1], t: 0 }; }
    const g = o.kind === 'node' ? this.nodes[o.id]?.g : o.kind === 'table' ? this.tables[o.id]?.g : null; if (g) this.pop(g, 0.6);
    this.custSys.seatsChanged(); }
  ovenRoom() { return this.own('oven') ? Math.max(0, 16 - this.nodes.oven.tray.length) : 0; }
  ovenBatch(n) { for (let i = 0; i < Math.min(n, this.ovenRoom()); i++) this.trayAdd('oven', 'bagel'); }
  addDeco(id) { const own = (S.deco[this.bi] ||= []); if (!own.includes(id)) own.push(id); save(true); this.redrawAll(); }
  scent() { return (S.deco[this.bi] || []).reduce((a, id) => a + (DECO.find(d => d.id === id)?.score || 0), 0); }
  restaff() { this.staffSys.restyle(); }
  redraw() { this.build(this.bi); }
}
