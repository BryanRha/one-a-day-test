// 가게 놀이: 끌어서 이동 · 굽기/바르기/내리기 · 진열 · 손님 줄 · 계산 · 돈 줍기 · 열기 칸 · 직원 · 테이블 치우기 · 드라이브스루
import * as THREE from 'three';
import { BRANCHES, MENU, PLAYER, STAFF, CUST_COLORS, BRAND, BRANCH_MENU, setBranchMenu, DECO, REGULARS, MASTERY, MASTERY_K, MOOD, FAVOR, josa } from './data.js?v=0.91.4';
export const L = id => (S.branch[S.bi]?.lv?.[id]) || 0;   /* 이 지점 업그레이드 단계 */
import { M, box, cyl, item, person, shopShell, STATION, car, ITEM_H, LOOK, DECO_MODEL } from './models.js?v=0.91.4';
import { S, save, addSold, mission, today } from './state.js?v=0.91.4';
import { sfx } from './audio.js?v=0.91.4';

const V = THREE.Vector3, R = 85, rnd = (a, b) => a + Math.random() * (b - a);
const RIGHT = new V(1, 0, -1).normalize(), DOWN = new V(1, 0, 1).normalize();
const SHELF = { bagel: -125, cream: -62, coffee: 1, drink: 64 };
/* 메뉴 숙련 ★1~5 (메뉴 이름별 판매 수) · 별 하나마다 값 +6% */
export const starOf = name => { const n = S.mast[name] || 0; let st = 1; for (let i = 1; i < MASTERY.length; i++) if (n >= MASTERY[i]) st = i + 1; return st; };
export const starK = k => 1 + (starOf(MENU[k].name) - 1) * MASTERY_K;
export const favLv = f => FAVOR.filter(x => f >= x).length;   /* 단골 하트 단계 0~5 */

export class Game {
  constructor(sc, cam, ui) { this.sc = sc; this.cam = cam; this.ui = ui; this.t = 0; this.fly = []; this.fx = []; }
  build(bi) {
    const sc = this.sc; sc.clear(); this.B = BRANCHES[bi]; const B = this.B; this.bi = bi; setBranchMenu(bi); LOOK.cream = MENU.cream.look; LOOK.coffee = MENU.coffee.look;
    sc.background = new THREE.Color(BRAND.cream);
    sc.add(new THREE.HemisphereLight(0xFFF6EA, 0xC9A882, 1.6)); const sun = new THREE.DirectionalLight(0xFFF1DC, 2.2); sun.position.set(-500, 1200, 700); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -1100, right: 1100, top: 1100, bottom: -1100, near: 10, far: 3200 }); sun.shadow.radius = 4; sun.shadow.bias = -0.0005; sc.add(sun, sun.target); this.sun = sun;
    shopShell(sc, B.W, B.D, B.theme);
    for (const p of this.pads || []) p.tag.remove(); for (const c of [...(this.cust || []), ...(this.cars || [])]) c.tag && c.tag.remove(); this.ui && this.ui.floats && (this.ui.floats.innerHTML = '');   /* 지점 바꿀 때 화면 글자 정리 */
    this.nexting = false; this.st = {}; this.zones = []; this.pads = []; this.cust = []; this.cars = []; this.staff = []; this.piles = [];
    this.unl = new Set(S.branch[bi]?.unl || []); B.slots.forEach(s => { if (s.free) this.unl.add(s.id); });
    for (const s of B.slots) if (this.unl.has(s.id)) this.place(s, false);
    this.refreshPads();
    const P = person({ body: BRAND.accentHex, apron: true, cap: 0xFFFFFF }); P.g.position.set(-380, 0, -330); sc.add(P.g);   /* 반죽기·오븐 앞에서 시작 */
    this.pl = { P, pos: P.g.position, stack: [], kind: null, cap: S.up.carry ? PLAYER.carryUp : PLAYER.carry, tick: 0, isPlayer: true };
    for (const k of S.branch[bi]?.staff || []) this.hire(k, true);
    this.decoObjs = []; for (const id of S.deco[bi] || []) this.placeDeco(id, false);
    this.regT = 20;   /* 첫 단골은 금방 찾아옴 */
    this.spawnT = 1; this.carT = 4; this.camT = this.pl.pos.clone();
    this.fitView();
    /* 안내 화살표 (처음 몇 단계) */ this.arrow = new THREE.Group(); const cone = new THREE.Mesh(new THREE.ConeGeometry(26, 50, 4), M(0xFF6A3A)); cone.rotation.x = Math.PI; this.arrow.add(cone); sc.add(this.arrow);
  }
  // ── 설비 놓기
  place(s, anim) {
    if (s.type === 'hire' || s.type === 'up' || s.type === 'next') return;
    const g = new THREE.Group(); g.position.set(s.x, 0, s.z); this.sc.add(g); STATION[s.type](g);
    const o = { s, g, type: s.type, x: s.x, z: s.z, stack: [], in: 0, inStack: [], t: 0, feed: [], ft: 0 };   /* 상태는 놓을 때 전부 만들어 둠 (늦게 만들면 순서에 따라 오류) */
    if (s.type === 'table') { o.seats = [-95, 95].map(dx => ({ x: s.x + dx, z: s.z, who: null })); o.trash = []; if ((S.deco[this.bi] || []).includes('vase')) this.tableVase(o); }
    if (s.type === 'counter') { o.shelf = { bagel: [], cream: [], coffee: [], drink: [] }; o.cash = this.pile(s.x + 230, s.z + 10); }
    if (s.type === 'drive') { o.glass = []; g.children.slice(0, 2).forEach(m => { m.material = m.material.clone(); m.material.transparent = true; o.glass.push(m); });   /* 벽·창: 가까이 가면 유리처럼 */
      o.cash = this.pile(s.x - 140, s.z + 210); o.lane = { bagel: [], cream: [], coffee: [], drink: [] }; }
    this.st[s.id] = o; o.Z = {}; for (const [k, dx, dz, w, d, col, ring] of ZONES[s.type] || []) o.Z[k] = this.zone(s.x + dx, s.z + dz, w, d, col, ring); 
    if (anim) { g.scale.setScalar(0.01); this.fx.push({ t: 0, d: 0.5, f: u => g.scale.setScalar(u < 0.7 ? u / 0.7 * 1.15 : 1.15 - (u - 0.7) / 0.3 * 0.15) }); this.confetti(s.x, 120, s.z); }
  }
  // ── 꾸미기: 정해진 자리에 소품 (모든 지점 같은 배치)
  placeDeco(id, anim) {
    const d = DECO.find(x => x.id === id); if (!d || this.decoObjs.some(o => o.id === id)) return;
    if (id === 'vase') { for (const o of Object.values(this.st)) if (o.type === 'table') this.tableVase(o); this.decoObjs.push({ id }); return; }
    const g = new THREE.Group(); g.position.set(d.pos[0], 0, d.pos[1]); this.sc.add(g); DECO_MODEL[id](g); this.decoObjs.push({ id, g, x: d.pos[0], z: d.pos[1], r: d.r });
    if (anim) { g.scale.setScalar(0.01); this.fx.push({ t: 0, d: 0.5, f: u => g.scale.setScalar(u < 0.7 ? u / 0.7 * 1.15 : 1.15 - (u - 0.7) / 0.3 * 0.15) }); this.confetti(d.pos[0], 120, d.pos[1]); }
  }
  tableVase(o) { if (o.vase) return; const g = new THREE.Group(); g.position.set(o.x, 88, o.z - 30); this.sc.add(g); DECO_MODEL.vase(g); o.vase = g; }
  scent() { return (S.deco[this.bi] || []).reduce((a, id) => a + (DECO.find(d => d.id === id)?.score || 0), 0); }   /* 베이글 향 */
  addDeco(id) { const l = (S.deco[this.bi] ||= []); if (l.includes(id)) return false; l.push(id); this.placeDeco(id, true); save(); return true; }
  // 동작 칸: 바닥에 그린 칸 = 실제로 동작하는 범위 (들어서면 밝아짐)
  zone(x, z, w, d, col, ring) { if (ring === 2) return { x, z, w, d, hidden: true, g: { visible: true } };   /* 직원 목표 지점만 */
    const g = new THREE.Group(); g.position.set(x, 0, z); this.sc.add(g);
    if (ring) { /* 테이블 둘레 테두리: 어느 쪽에서 다가가도 됨 */ const mt = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.75 }); for (const [sx, sz, sw, sd] of [[0, -d / 2, w, 16], [0, d / 2, w, 16], [-w / 2, 0, 16, d], [w / 2, 0, 16, d]]) { const e = new THREE.Mesh(new THREE.BoxGeometry(sw, 3, sd), mt); e.position.set(sx, 1.5, sz); g.add(e); }
      const Z = { x, z, w, d, g, inner: { material: mt }, col: new THREE.Color(col), ring: true }; this.zones.push(Z); return Z; }
    const edge = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 })); edge.position.y = 1.5; g.add(edge);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(w - 14, 4, d - 14), new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.6 })); inner.position.y = 2; g.add(inner);
    const Z = { x, z, w, d, g, inner, col: new THREE.Color(col) }; (this.zones ||= []).push(Z); return Z; }
  in(w, Z) { return !!Z && Z.g.visible && Math.abs(w.pos.x - Z.x) < Z.w / 2 && Math.abs(w.pos.z - Z.z) < Z.d / 2; }
  pile(x, z) { const p = { x, z, v: 0, meshes: [] }; this.piles.push(p); return p; }
  addCash(p, v) { p.v += v; const n = Math.min(36, Math.ceil(p.v / Math.max(1, 6 * this.B.mult))); while (p.meshes.length < n) { const i = p.meshes.length, m = box(40, 10, 24, 0x6FCB7A, p.x + (i % 3) * 44 - 44, Math.floor(i / 6) * 11, p.z + (Math.floor(i / 3) % 2) * 28, this.sc); p.meshes.push(m); } }
  // ── 열기 칸: 열리지 않은 것 중 앞의 2개
  refreshPads() {
    for (const p of this.pads) { this.sc.remove(p.g); p.tag.remove(); } this.pads = [];
    const next = this.B.slots.filter(s => !s.free && !this.unl.has(s.id)).slice(0, 2);
    for (const s of next) { const g = new THREE.Group(); g.position.set(s.px ?? s.x, 0, s.pz ?? s.z); this.sc.add(g);   /* 칸 위치 (설비와 다르면 px·pz) */
      const base = new THREE.Mesh(new THREE.BoxGeometry(PAD, 4, PAD), new THREE.MeshToonMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.9 })); base.position.y = 7; g.add(base);   /* 동작 칸(높이 2)보다 위 → 겹쳐도 깜빡이지 않음 */
      const fill = new THREE.Mesh(new THREE.BoxGeometry(PAD - 22, 6, PAD - 22), M(0xFFD782)); fill.position.y = 8; fill.scale.z = 0.001; g.add(fill);
      const paid = S.branch[this.bi]?.paid?.[s.id] || 0; const tag = this.ui.tag(); this.pads.push({ s, g, fill, paid, tag }); this.updPad(this.pads[this.pads.length - 1]); }
  }
  updPad(p) { const u = Math.min(1, p.paid / p.s.cost); p.fill.scale.z = Math.max(0.001, u); p.fill.position.z = -(PAD - 22) / 2 * (1 - u); p.tag.innerHTML = `<i class="c"></i>${fmt(p.s.cost - p.paid)}<small>${p.s.label || NAMES[p.s.type] || ''}</small>`; }
  unlock(p) {
    const s = p.s; if (this.unl.has(s.id)) return; (window.unlockLog ||= []).push([s.id, Math.round(this.t), this.bi]); console.log('#unlock', s.id, Math.round(this.t)); this.unl.add(s.id); const br = (S.branch[this.bi] ||= { unl: [], staff: [], paid: {} }); br.unl = [...this.unl]; delete br.paid[s.id];
    sfx('unlock', { vol: 0.8 }); mission('unlock');
    if (s.type === 'drive') setTimeout(() => this.fitView(), 0);   /* 드라이브스루가 생기면 화면에 담을 범위가 넓어짐 */
    if (s.type === 'hire') this.hire(s.staff); else if (s.type === 'up') { S.up[s.up] = 1; if (s.up === 'carry') this.pl.cap = PLAYER.carryUp; this.ui.toast(s.up === 'carry' ? '한 번에 10개까지 들 수 있어요!' : '더 빨리 걸어요!'); this.confetti(s.x, 80, s.z); }
    else if (s.type === 'next') { /* 한 번만: 칸을 지우고 다음 지점 창 */ for (const q of this.pads) { this.sc.remove(q.g); q.tag.remove(); } this.pads = []; this.nexting = true; save(true); this.ui.nextBranch(this.bi + 1); return; }
    else { this.place(s, true); if (s.type === 'mixer') this.ui.toast('반죽을 오븐에 넣으면 베이글 2개가 바로 구워져요!'); if (s.type === 'kettle') this.ui.toast('반죽을 들고 솥 칸을 지나가면 데쳐져요 → 오븐에서 쫄깃 베이글(값 1.5배)!'); }
    save(); this.refreshPads(); this.ui.progress();
  }
  hire(k, silent) {
    const d = STAFF[k], P = person({ body: d.body, apron: true, cap: d.cap || 0xFFFFFF, hair: 0x2A1A10 }); const c = this.st.counter;
    const pos = k === 'cashier' ? [c.Z.cash.x, c.Z.cash.z] : [c.x - 200 + Math.random() * 80, c.z - 200]; P.g.position.set(pos[0], 0, pos[1]); this.sc.add(P.g);
    const w = { k, P, pos: P.g.position, stack: [], kind: null, cap: d.carry || 4, state: 'idle', tick: 0 }; this.staff.push(w);
    if (!silent) { const br = (S.branch[this.bi] ||= { unl: [], staff: [], paid: {} }); if (!br.staff.includes(k)) br.staff.push(k); this.confetti(pos[0], 160, pos[1]); this.ui.toast(STAFF[k].hello); }
  }
  // ── 매 프레임
  update(dt, input) {
    this.t += dt; const pl = this.pl; const mult = this.B.mult * (this.ui.boost() ? 2 : 1);
    // 이동
    const mv = new V().addScaledVector(RIGHT, input.x).addScaledVector(DOWN, input.y); const ml = Math.min(1, mv.length());
    if (ml > 0.08) { mv.normalize(); const sp = PLAYER.speed * (S.up.speed ? PLAYER.speedUp : 1) * ml; pl.pos.addScaledVector(mv, sp * dt); pl.P.g.rotation.y = Math.atan2(mv.x, mv.z); }
    this.collide(pl.pos, 34); pl.P.carry = pl.stack.length > 0; pl.P.anim(dt, ml > 0.08);
    this.interact(pl, dt);
    // 직원
    for (const w of this.staff) this.staffAI(w, dt);
    // 오븐 · 크림치즈 · 커피 생산
    const ov = this.st.oven; ov.t += dt; ov.feed ||= []; const ovCap = 10 + L('ovenCap') * 2; ov.ft = (ov.ft || 0) + dt; const ovPos = () => [ov.x - 60 + (ov.stack.length % 5) * 30, 12 + Math.floor(ov.stack.length / 5) * 16, ov.z + 100];
    if (ov.feed.length && ov.ft > 0.35 / (1 + L('oven') * 0.15) && ov.stack.length < ovCap) { ov.ft = 0; const prem = ov.feed.shift(); const m = item(prem ? 'prem' : 'bagel'); m.userData.prem = prem; this.put(ov.stack, m, ...ovPos(), 'bagel'); if (prem) this.sparkle(m.position); }   /* 넣은 반죽 빠르게 굽기 */
    /* 오븐은 넣은 반죽만 구움 (스스로 굽지 않음) */
    const es = this.st.espresso; if (es) { es.t += dt; if (es.t > 1.5 / (1 + L('espresso') * 0.15) && es.stack.length < 8) { es.t = 0; this.put(es.stack, item('drink'), es.x - 40 + (es.stack.length % 3) * 30, 107 + Math.floor(es.stack.length / 3) * 30, es.z + 25, 'drink'); } }
    const mx = this.st.mixer; if (mx) { mx.t += dt; if (mx.t > 1.2 / (1 + L('mixer') * 0.15) && mx.stack.length < 8) { mx.t = 0; this.put(mx.stack, item('dough'), mx.x - 40 + (mx.stack.length % 3) * 30, 6 + Math.floor(mx.stack.length / 3) * 14, mx.z + 80, 'dough'); } }
    if (this.st.kettle) { this.st.kettle.t += dt; if (this.st.kettle.t > 0.4) { this.st.kettle.t = 0; this.steam(this.st.kettle.x, 135, this.st.kettle.z); } }
    const cc = this.st.cc; if (cc) { cc.t += dt; if (cc.inStack.length && cc.t > 0.9 / (1 + L('bar') * 0.15) && cc.stack.length < 8) { cc.t = 0; const m = cc.inStack.pop(); this.sc.remove(m.m); this.put(cc.stack, item('cream'), cc.x + 40 + (cc.stack.length % 2) * 36, 107 + Math.floor(cc.stack.length / 2) * 18, cc.z + 30, 'cream'); } }
    const cf = this.st.coffee; if (cf) { cf.t += dt; if (cf.t > 1.6 / (1 + L('fridge') * 0.15) && cf.stack.length < 8) { cf.t = 0; this.put(cf.stack, item('coffee'), cf.x - 30 + (cf.stack.length % 3) * 30, 164 + Math.floor(cf.stack.length / 3) * 30, cf.z + 10, 'coffee'); } }
    // 손님
    this.spawnT -= dt; const qMax = 6; const inQ = this.cust.filter(c => c.state === 'queue' || c.state === 'walkQ').length;
    if (this.spawnT <= 0 && inQ < qMax) { this.spawnT = Math.max(1.2, 5 - this.unl.size * 0.22) / (1 + L('ads') * 0.1) / (1 + this.scent() / 300) * rnd(0.8, 1.2); this.spawnCustomer(); }
    this.regT -= dt; if (this.regT <= 0 && inQ < qMax) { this.regT = rnd(60, 110); const R0 = this.nextRegular(); if (R0) this.spawnCustomer(R0); }
    this.serve(dt, mult); for (const c of this.cust) this.custAI(c, dt);
    this.cust = this.cust.filter(c => { if (c.gone) { this.sc.remove(c.P.g); c.tag && c.tag.remove(); return false; } return true; });
    // 드라이브스루
    if (this.st.drive) { this.driveUpdate(dt, mult); const dv = this.st.drive, near = pl.pos.x > dv.x - 320 && Math.abs(pl.pos.z - dv.z) < 300; for (const m of dv.glass) { const t = near ? 0.25 : 1; m.material.opacity += (t - m.material.opacity) * Math.min(1, dt * 8); m.material.depthWrite = m.material.opacity > 0.9; } }
    // 날아가는 물건 · 연출
    for (let i = this.fly.length - 1; i >= 0; i--) { const f = this.fly[i]; f.t += dt / f.d; const u = Math.min(1, f.t); const to = typeof f.to === 'function' ? f.to() : f.to;
      f.m.position.lerpVectors(f.from, to, u); f.m.position.y += Math.sin(u * Math.PI) * 70; if (u >= 1) { this.fly.splice(i, 1); f.done && f.done(); } }
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.t += dt / f.d; f.f(Math.min(1, f.t)); if (f.t >= 1) this.fx.splice(i, 1); }
    for (const Z of this.zones) { const on = this.in(pl, Z); if (Z.ring) { Z.inner.material.opacity = on ? 1 : 0.6; continue; } Z.inner.material.color.copy(on ? Z.col : WHITE); Z.inner.material.opacity = on ? 0.85 : 0.55; }
    // 안내: 다음에 할 일 (설비 3개 열 때까지)
    const gd = this.guide(dt); this.arrow.visible = !!gd; if (gd) { this.arrow.position.set(gd[0], 150 + Math.sin(this.t * 6) * 14, gd[1]); this.arrow.rotation.y += dt * 2; } this.ui.hint(gd && gd[2]);
    // 카메라 · 그림자 따라감
    if (this.fitT) this.camT.copy(this.fitT); else this.camT.lerp(pl.pos, Math.min(1, dt * 5));   /* 넓은 화면: 매장 전체 고정 · 폰: 주인공 따라감 */ this.cam.position.set(this.camT.x + 900, 1150, this.camT.z + 900); this.cam.lookAt(this.camT.x, 0, this.camT.z);
    this.sun.position.set(this.camT.x - 500, 1200, this.camT.z + 700); this.sun.target.position.copy(this.camT);
    this.ui.frame(this);
  }
  // ── 화면 맞춤: 넓은 화면(PC · 태블릿 가로)은 매장 전체(간판 ~ 계산대 · 줄 · 드라이브스루)를 HUD 를 피한 영역에 담아 고정
  //   폰(세로)이나 너무 작아지는 화면은 지금처럼 주인공을 따라감 · 창 크기가 바뀌면 다시 (main.js fit)
  fitView() { const cam = this.cam, w = innerWidth, h = innerHeight, z = this.hudZ || 1; if (!this.B) return;
    const follow = () => { const S2 = w / h < 0.8 ? 900 : 560; cam.left = -S2 * w / h; cam.right = S2 * w / h; cam.top = S2; cam.bottom = -S2; cam.updateProjectionMatrix(); this.fitT = null; };
    if (w / h < 0.8 && Math.min(w, h) < 700) return follow();   /* 폰 세로: 그대로 */
    const W = this.B.W / 2, D = this.B.D / 2, P = [];
    for (const [x, zz] of [[-W, -D], [W, -D], [-W, D], [W, D]]) P.push([x, 0, zz]); for (const [x, zz] of [[-W, -D], [W, -D], [-W, D]]) P.push([x, 260, zz]);
    const sx = -W + 60, sz = -D + 60; for (const d of [-250, 250]) P.push([sx + d * Math.SQRT1_2, 425, sz + d * Math.SQRT1_2]);   /* 간판 (벽 위 · 45도) */
    P.push([320, 230, 930], [440, 230, 930], [260, 260, 820]);   /* 문 앞 · 줄 끝 손님과 말풍선 */
    if (this.st.drive) { const dv = this.st.drive; P.push([dv.x + 250, 130, dv.z - 120], [dv.x + 410, 130, dv.z - 120], [dv.x + 410, 130, dv.z + 640]); }   /* 드라이브스루 차 줄 */
    const c0 = new THREE.OrthographicCamera(); c0.position.set(900, 1150, 900); c0.lookAt(0, 0, 0); c0.updateMatrixWorld(); const v = new V(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of P) { v.set(...p).applyMatrix4(c0.matrixWorldInverse); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
    const L = 86 * z, R0 = 86 * z, T = 64 * z, Bt = 86 * z, k = Math.max((x1 - x0) / (w - L - R0), (y1 - y0) / (h - T - Bt));   /* 화면 1px 당 세계 크기 */
    if (!(k > 0) || k > 4.2) return follow();   /* 너무 작게 보이면 따라가기 (폰 가로 등) */
    cam.left = -w / 2 * k; cam.right = w / 2 * k; cam.top = h / 2 * k; cam.bottom = -h / 2 * k; cam.updateProjectionMatrix();
    const ox = (x0 + x1) / 2 - (L - R0) / 2 * k, oy = (y0 + y1) / 2 - (Bt - T) / 2 * k, rt = new V().setFromMatrixColumn(c0.matrixWorld, 0), up = new V().setFromMatrixColumn(c0.matrixWorld, 1);
    this.fitT = new V().addScaledVector(rt, ox).addScaledVector(up, oy); this.camT && this.camT.copy(this.fitT); }
  collide(p, r) {
    const B = this.B; p.x = Math.max(-B.W / 2 + 40 + r, Math.min(B.W / 2 - 20 - r, p.x)); p.z = Math.max(-B.D / 2 + 40 + r, Math.min(B.D / 2 - 20, p.z));
    for (const o of this.decoObjs || []) if (o.r) { const d = Math.hypot(p.x - o.x, p.z - o.z), m = o.r + r; if (d < m && d > 0.1) { p.x = o.x + (p.x - o.x) / d * m; p.z = o.z + (p.z - o.z) / d * m; } }
    for (const o of Object.values(this.st)) { const [hw, hd] = SIZE[o.type] || [0, 0]; if (!hw) continue;
      if (o.type === 'bin' || o.type === 'plant') { const d = Math.hypot(p.x - o.x, p.z - o.z), m = hw + r; if (d < m && d > 0.1) { p.x = o.x + (p.x - o.x) / d * m; p.z = o.z + (p.z - o.z) / d * m; } continue; }
      const dx = p.x - o.x, dz = p.z - o.z, ox = hw + r - Math.abs(dx), oz = hd + r - Math.abs(dz); if (ox > 0 && oz > 0) { if (ox < oz) p.x += Math.sign(dx) * ox; else p.z += Math.sign(dz) * oz; } }
  }
  near(w, x, z, r = R) { return Math.hypot(w.pos.x - x, w.pos.z - z) < r; }
  // 물건 쌓기 (보관 장소) · 사람 손으로 옮기기
  put(arr, m, x, y, z, kind) { m.position.set(x, y, z); this.sc.add(m); arr.push({ m, kind }); }
  take(from, w) { const it = from.pop(); if (!it) return false; w.kind = it.kind; const m = it.m, start = m.position.clone(); this.sc.remove(m); w.P.hand.add(m); m.position.set(0, w.stack.length * ITEM_H[it.kind] + 6, 0);
    w.stack.push(it); w.P.hand.updateWorldMatrix(true, true); return true; }
  give(w, arr, pos, cb, d = 0.18) { const it = w.stack.pop(); if (!it) return null; if (!w.stack.length) w.kind = null; const m = it.m, wp = new V(); m.getWorldPosition(wp); w.P.hand.remove(m); this.sc.add(m); m.position.copy(wp);
    const target = new V(...pos); this.fly.push({ m, from: wp, to: target, t: 0, d, done: () => cb && cb(it) }); arr.push(it); return it; }
  // ── 손 바꾸기: 손에 든 것을 나온 곳(제자리)으로 돌려보냄 · 잃는 것 없음
  //   주인공: 다른 재료 칸에 서면 / 쓰레기통 칸에 서면 · 직원: 3초 동안 내려놓지 못하면 · 쓰레기만 쓰레기통으로 (치운 것으로 셈)
  home(kind) { const ov = this.st.oven, cc = this.st.cc, cf = this.st.coffee, es = this.st.espresso, mx = this.st.mixer;
    if (kind === 'bagel' && ov) return { arr: ov.stack, name: '오븐', pos: n => [ov.x - 60 + (n % 5) * 30, 12 + Math.floor(n / 5) * 16, ov.z + 100] };
    if (kind === 'cream' && cc) return { arr: cc.stack, name: BRANCH_MENU[this.bi]?.cream.bar || '토핑 바', pos: n => [cc.x + 40 + (n % 2) * 36, 107 + Math.floor(n / 2) * 18, cc.z + 30] };
    if (kind === 'coffee' && cf) return { arr: cf.stack, name: '냉장고', pos: n => [cf.x - 30 + (n % 3) * 30, 164 + Math.floor(n / 3) * 30, cf.z + 10] };
    if (kind === 'drink' && es) return { arr: es.stack, name: '커피 머신', pos: n => [es.x - 40 + (n % 3) * 30, 107 + Math.floor(n / 3) * 30, es.z + 25] };
    if (kind === 'dough' && mx) return { arr: mx.stack, name: '반죽기', pos: n => [mx.x - 40 + (n % 3) * 30, 6 + Math.floor(n / 3) * 14, mx.z + 80] };   /* 데친 반죽도 표시(userData.b)를 그대로 갖고 돌아감 */
    return null; }
  sendHome(w) { if (!w.stack.length) return null; const kind = w.kind, H = this.home(kind);
    if (!H) { const n = w.stack.length; for (const it of w.stack) w.P.hand.remove(it.m); w.stack = []; w.kind = null; if (kind === 'trash') mission('clean', n); return kind === 'trash' ? '쓰레기통' : null; }   /* 쓰레기 (또는 설비가 없어진 물건) */
    while (w.stack.length) this.give(w, H.arr, H.pos(H.arr.length), null, 0.35);
    return H.name; }
  say(t, key, pos) { this.sayT ||= {}; if ((this.sayT[key] || 0) > this.t) return; this.sayT[key] = this.t + 2.5; this.ui.float(t, (pos || this.pl.pos).clone().setY(330), 'say'); }
  /* 재료 칸: 주인공이 서 있는 칸과 그 칸에서 집는 것 */
  srcAt(w) { const L0 = [['mixer', 'out', 'dough'], ['oven', 'out', 'bagel'], ['cc', 'io', 'cream'], ['coffee', 'out', 'coffee'], ['espresso', 'out', 'drink']];
    for (const [id, z, kind] of L0) { const o = this.st[id]; if (o && this.in(w, o.Z[z])) return { o, kind }; } return null; }
  interact(w, dt) {
    w.tick -= dt; if (w.tick > 0) return; const step = () => { w.tick = 0.07; };
    const full = w.stack.length >= w.cap;
    // 집기: 오븐 · 크림치즈 · 커피 · 쓰레기
    const ov = this.st.oven; ov.feed ||= [];
    if ((w.kind === 'dough' || w.kind === 'boiled') && this.in(w, ov.Z.out)) { const it = w.stack.pop(); const prem = !!it.m.userData.b; w.P.hand.remove(it.m); if (!w.stack.length) w.kind = null; ov.feed.push(prem, prem); sfx('drop', { vol: 0.25, rate: 0.8 }); mission('dough'); return step(); }
    const es = this.st.espresso; if (es && !full && (!w.kind || w.kind === 'drink') && this.in(w, es.Z.out) && es.stack.length) { this.take(es.stack, w); sfx('pick', { vol: 0.25 }); return step(); }
    const mx = this.st.mixer; if (mx && !full && (!w.kind || w.kind === 'dough') && this.in(w, mx.Z.out) && mx.stack.length) { this.take(mx.stack, w); sfx('pick', { vol: 0.2, rate: 0.8 }); return step(); }
    const kt = this.st.kettle; if (kt && w.kind === 'dough' && this.in(w, kt.Z.io)) {   /* 솥 칸을 지나가면 손에 든 반죽이 하나씩 데쳐짐 */
      const it = w.stack.find(x => !x.m.userData.b); if (it) { const i = w.stack.indexOf(it), pos = it.m.position.clone(); w.P.hand.remove(it.m); const m = item('boiled'); m.userData.b = true; m.position.copy(pos); w.P.hand.add(m); it.m = m;
        this.steam(kt.x, 130, kt.z); sfx('blip', { vol: 0.2, rate: 0.7 + i * 0.05 }); w.tick = 0.15 / (1 + L('kettle') * 0.12); return; } }
    if (w.isPlayer && w.kind) { const sa = this.srcAt(w);   /* 다른 재료 칸에 서면 손에 든 것은 제자리로 → 다음 순간 새 것을 집음 */
      if (sa && sa.o.stack.length && sa.kind !== w.kind && !(w.kind === 'dough' && sa.kind === 'bagel') && !(w.kind === 'bagel' && sa.kind === 'cream' && sa.o.inStack.length < 8)) {
        const nm = NAMES2[w.kind] ? NAMES2[w.kind]() : '', to = this.sendHome(w); if (to) this.say(`${nm ? josa(nm, '은/는') + ' ' : ''}${josa(to, '으로/로')} 돌려놨어요`, 'swap'); sfx('drop', { vol: 0.25, rate: 1.2 }); return step(); }
      if (sa && sa.kind === w.kind && full && sa.o.stack.length) this.say('손이 가득 찼어요', 'full-hand'); }
    if (!full && (!w.kind || w.kind === 'bagel') && this.in(w, ov.Z.out) && ov.stack.length) { this.take(ov.stack, w); sfx('pick', { vol: 0.25, rate: 1 + w.stack.length * 0.05 }); return step(); }
    const cc = this.st.cc; if (cc && this.in(w, cc.Z.io)) {
      if (w.kind === 'bagel' && cc.inStack.length < 8) { const i = cc.inStack.length; this.give(w, cc.inStack, [cc.x - 70 + (i % 2) * 34, 107 + Math.floor(i / 2) * 16, cc.z + 30]); sfx('drop', { vol: 0.2 }); return step(); }
      if (!full && (!w.kind || w.kind === 'cream') && cc.stack.length) { this.take(cc.stack, w); sfx('pick', { vol: 0.25 }); return step(); } }
    const cf = this.st.coffee; if (cf && !full && (!w.kind || w.kind === 'coffee') && this.in(w, cf.Z.out) && cf.stack.length) { this.take(cf.stack, w); sfx('pick', { vol: 0.25 }); return step(); }
    // 내려놓기: 계산대 진열
    const c = this.st.counter; if (w.kind && SHELF[w.kind] != null && this.in(w, c.Z.shelf)) { const sh = c.shelf[w.kind]; if (sh.length < 12) { const i = sh.length;
      this.give(w, sh, [c.x + SHELF[w.kind] + (i % 2) * 26 - 13, 114 + Math.floor(i / 2) * ITEM_H[w.kind], c.z + 18]); sfx('drop', { vol: 0.2, rate: 1 + i * 0.03 }); return step(); }
      if (w.isPlayer) this.say(`${NAMES2[w.kind]()} 진열대가 가득 찼어요`, 'shelf'); }   /* 말없이 거절하지 않음 */
    // 드라이브스루 진열
    const dv = this.st.drive; if (dv && w.kind && dv.lane[w.kind] && this.in(w, dv.Z.all) && dv.lane[w.kind].length < 9) { const L2 = dv.lane[w.kind], i = L2.length; this.give(w, L2, [dv.x + 40 + (i % 3) * 26, 104 + Math.floor(i / 3) * ITEM_H[w.kind], dv.z + LANE[w.kind]]); sfx('drop', { vol: 0.2 }); return step(); }   /* 드라이브스루: 메뉴별 줄에 반듯하게 */
    // 쓰레기: 테이블에서 줍기 → 통에 버리기
    if (!full && (!w.kind || w.kind === 'trash')) for (const t of Object.values(this.st)) if (t.type === 'table' && t.trash.length && this.in(w, t.Z.trash)) { this.take(t.trash, w); sfx('pick', { vol: 0.2 }); return step(); }
    const bin = this.st.bin; if (w.kind && w.kind !== 'trash' && w.isPlayer && this.in(w, bin.Z.drop)) { const nm = NAMES2[w.kind]?.() || '', to = this.sendHome(w); if (to) this.say(`${nm ? josa(nm, '은/는') + ' ' : ''}${josa(to, '으로/로')} 돌려놨어요`, 'swap'); return step(); }   /* 쓰레기통: 물건은 버리지 않고 제자리로 (잃는 것 없음) */
    if (w.kind === 'trash' && this.in(w, bin.Z.drop)) {   /* 쓰레기 버리기 */ const it = w.stack.pop(); w.P.hand.remove(it.m); if (!w.stack.length) w.kind = null; sfx('drop', { vol: 0.2 }); if (it.kind === 'trash') mission('clean'); return step(); }
    if (!w.isPlayer) return;
    // 돈 줍기
    for (const p of this.piles) if (p.v > 0 && this.near(w, p.x, p.z + 20, 110)) { const v = Math.round(p.v); S.coins += v; S.earned += v; mission('coins', v); p.v = 0; const ms = p.meshes; p.meshes = [];
      ms.forEach((m, i) => { const from = m.position.clone(); setTimeout(() => this.fly.push({ m, from, to: () => w.pos.clone().setY(120), t: 0, d: 0.25, done: () => this.sc.remove(m) }), i * 18); });
      sfx('coin', { vol: 0.5 }); this.ui.float('+' + fmt(v), w.pos, 'cash'); save(); return step(); }
    // 열기 칸에 돈 붓기
    if (this.nexting) return;
    for (const p of this.pads) if (Math.abs(w.pos.x - (p.s.px ?? p.s.x)) < PAD / 2 && Math.abs(w.pos.z - (p.s.pz ?? p.s.z)) < PAD / 2 && S.coins > 0) { const need = p.s.cost - p.paid, pay = Math.min(need, S.coins, Math.max(1, Math.ceil(p.s.cost / 30))); S.coins -= pay; p.paid += pay;
      const br = (S.branch[this.bi] ||= { unl: [], staff: [], paid: {} }); br.paid[p.s.id] = p.paid; this.updPad(p); sfx('coin', { vol: 0.15, rate: 1.4 });
      const m = cyl(10, 10, 4, 0xF2B533, 0, 0, 0, this.sc, 10); m.position.copy(w.pos).setY(120); this.fly.push({ m, from: m.position.clone(), to: new V(p.s.x, 10, p.s.z), t: 0, d: 0.2, done: () => this.sc.remove(m) });
      if (p.paid >= p.s.cost) { this.unlock(p); } w.tick = 0.03; return; }
  }
  // ── 계산: 계산원(또는 주인공)이 계산대 뒤에 있으면 맨 앞 손님 주문을 진열대에서 채워 줌
  serve(dt, mult) {
    const c = this.st.counter; c.t -= dt; if (c.t > 0) return; const behind = this.in(this.pl, c.Z.cash);
    const cashier = this.staff.find(w => w.k === 'cashier') || (behind ? this.pl : null);
    const f = this.cust.find(x => x.state === 'queue' && x.qi === 0); if (!f || !cashier) return;
    const need = f.order.find(o => o.got < o.n); if (!need) return;
    const sh = c.shelf[need.k]; if (!sh.length) return;
    c.t = cashier.isPlayer ? 0.32 : STAFF.cashier.serve / (1 + this.sl('cashier') * 0.12); const it = sh.pop(); const wp = it.m.position.clone(); if (it.m.userData.prem) f.prem = (f.prem || 0) + 1;
    this.fly.push({ m: it.m, from: wp, to: () => f.pos.clone().setY(100), t: 0, d: 0.2, done: () => { this.sc.remove(it.m); } }); need.got++; sfx('blip', { vol: 0.3, rate: 1.2 });
    if (f.order.every(o => o.got >= o.n)) { let v = Math.round((f.order.reduce((a, o) => a + MENU[o.k].price * o.n * starK(o.k), 0) + (f.prem || 0) * MENU.bagel.price * this.premK()) * mult * this.priceK()); if (f.prem) this.ui.float('쫄깃!', new V(c.x + 60, 200, c.z), 'tip');
      /* 손님 기분: 빨리 받으면 하트 + 팁 · 오래 기다리면 시무룩 (팁만 없음) */ const wt = f.w || 0, happy = wt <= MOOD.happy; f.mood = happy ? 2 : wt <= MOOD.ok ? 1 : 0;
      let tip = 0; if (happy) tip += Math.round(v * MOOD.tip); if (Math.random() < L('tip') * 0.05 + this.scent() / 2000) tip += Math.max(1, Math.round(v * 0.5));
      if (tip) { v += tip; setTimeout(() => this.ui.float('팁 +' + fmt(tip), new V(c.x + 110, 170, c.z), 'tip'), 250); }
      this.ui.float(happy ? '♥' : f.mood ? '🙂' : '😐', f.pos.clone().setY(250), happy ? 'heart' : 'pay'); for (const o of f.order) this.addMast(o.k, o.n); this.addCash(c.cash, v); this.ui.float('+' + fmt(v), new V(c.x + 110, 120, c.z), 'pay'); sfx('order', { vol: 0.4 });
      addSold(f.order.reduce((a, o) => a + o.n, 0)); mission('serve'); this.ui.progress(); this.checkout(f); }
  }
  checkout(f) {
    if (f.reg) this.regServed(f);
    f.tag && (f.tag.remove(), f.tag = null); for (const o of f.order) for (let i = 0; i < o.n && i < 3; i++) { const m = item(o.k); m.scale.setScalar(0.8); f.P.hand.add(m); m.position.y = i * 14; } f.P.carry = true;
    const seat = Math.random() < 0.6 && this.freeSeat(); this.cust.forEach(x => { if (x.state === 'queue' && x.qi > 0) x.qi--; });
    if (seat) { seat.s.who = f; f.seat = seat; f.state = 'toSeat'; f.target = new V(seat.s.x, 0, seat.s.z); } else { f.state = 'leave'; f.target = new V(...this.B.door); } this.reQ();
  }
  freeSeat() { for (const t of Object.values(this.st)) if (t.type === 'table' && !t.trash.length) for (const s of t.seats) if (!s.who) return { t, s }; return null; }
  spawnCustomer(reg) {
    const P = person(reg ? { body: reg.body, hair: reg.hair, pants: 0x4A4A55, bubble: true } : { body: CUST_COLORS[Math.floor(Math.random() * CUST_COLORS.length)], hair: [0x3A2A1A, 0x8A5A2A, 0x1A1A1A, 0x6A3A1A, 0xC08A4A][Math.floor(Math.random() * 5)], pants: [0x4A5A7A, 0x6A4A3A, 0x3A3A4A][Math.floor(Math.random() * 3)], bubble: true });
    const [dx, dz] = this.B.door; P.g.position.set(dx + rnd(-60, 60), 0, dz); this.sc.add(P.g);
    const ks = ['bagel', 'bagel', 'bagel']; if (this.st.cc) ks.push('cream'); if (this.st.coffee) ks.push('coffee'); if (this.st.espresso) ks.push('drink'); const n = 1 + Math.floor(Math.random() * Math.min(3, 1 + this.unl.size / 4)); const order = [{ k: ks[Math.floor(Math.random() * ks.length)], n, got: 0 }];   /* 한 손님 = 한 가지 메뉴 */
    if (reg) order[0] = { k: ks.includes(reg.fav) ? reg.fav : 'bagel', n: 1 + (Math.random() < 0.4 ? 1 : 0), got: 0 };   /* 단골은 좋아하는 메뉴 */
    const c = { P, pos: P.g.position, state: 'walkQ', order, qi: this.cust.filter(x => x.state === 'queue' || x.state === 'walkQ').length, bubble: true, reg, w: 0 };
    if (reg) { (S.reg[reg.id] ||= { f: 0, day: '', lv: 0 }).day = today(); save(); setTimeout(() => this.ui.float(`💌 ${reg.name}: ${reg.hi}`, P.g.position.clone().setY(260), 'say'), 400); }
    P.bubble.visible = false; c.tag = this.ui.bubble(); this.cust.push(c); this.reQ();
  }
  reQ() { const [q, gap] = this.B.queue, c = this.st.counter; let i = 0; for (const x of this.cust) if (x.state === 'queue' || x.state === 'walkQ') { x.qi = i++; x.target = new V(c.x + 110, 0, c.z + 170 + x.qi * gap); } }
  custAI(c, dt) {
    const moveTo = (sp = 230) => { const d = new V().subVectors(c.target, c.pos); d.y = 0; const l = d.length(); if (l < 6) return true; d.normalize();
      /* 테이블 피하기: 가는 길에 테이블이 있으면 옆으로 돌아감 (앉을 테이블은 제외) */ const own = (c.seat && c.seat.t) || (c.state === 'leave' && c.leftT && Math.hypot(c.pos.x - c.leftT.x, c.pos.z - c.leftT.z) < 130 ? c.leftT : null);
      for (const t of Object.values(this.st)) { if (t.type !== 'table' || t === own) continue; const tx = t.x - c.pos.x, tz = t.z - c.pos.z, dist = Math.hypot(tx, tz); if (dist > 320) continue;
        const ahead = tx * d.x + tz * d.z; if (ahead <= 0) continue; const side = tx * d.z - tz * d.x; if (Math.abs(side) < 190) { const k = (190 - Math.abs(side)) / 190 * 1.4, sg = side > 0 ? -1 : 1, px = d.z, pz = -d.x; d.x += px * sg * k; d.z += pz * sg * k; d.normalize(); } }   /* 테이블 반대쪽으로 비켜감 */
      c.pos.addScaledVector(d, Math.min(l, sp * dt));
      for (const t of Object.values(this.st)) { if (t.type !== 'table' || t === own) continue; const dx = c.pos.x - t.x, dz = c.pos.z - t.z, dd = Math.hypot(dx, dz); const ox = 125 - Math.abs(dx), oz = 70 - Math.abs(dz); if (ox > 0 && oz > 0) { if (ox < oz) c.pos.x += Math.sign(dx) * ox; else c.pos.z += Math.sign(dz) * oz; } }
      c.P.g.rotation.y = Math.atan2(d.x, d.z); c.P.anim(dt, true); return false; };
    if (c.state === 'walkQ' || c.state === 'queue') c.w += dt;   /* 기다린 시간 (기분) */
    if (c.state === 'walkQ') { if (moveTo()) c.state = 'queue'; }
    else if (c.state === 'queue') { if (!moveTo(180)) {} else { c.P.anim(dt, false); c.P.g.rotation.y = Math.PI; } }
    else if (c.state === 'toSeat') { if (moveTo()) { c.state = 'eat'; c.t = rnd(5, 8); c.P.g.rotation.y = c.seat.s.x < c.seat.t.x ? Math.PI / 2 : -Math.PI / 2; c.P.carry = false; while (c.P.hand.children.length) c.P.hand.remove(c.P.hand.children[0]); c.pos.y = 12; } }
    else if (c.state === 'eat') { c.P.anim(dt, false); c.t -= dt; if (c.t <= 0) { const t = c.seat.t; for (let i = 0; i < c.order.reduce((a, o) => a + o.n, 0) && t.trash.length < 6; i++) this.put(t.trash, item('trash'), t.x + rnd(-30, 30), 88 + t.trash.length * 6, t.z + rnd(-25, 25), 'trash');
      c.seat.s.who = null; c.leftT = c.seat.t; c.seat = null; c.pos.y = 0; c.state = 'leave'; c.target = new V(...this.B.door); } }
    else if (c.state === 'leave') { if (moveTo(260)) c.gone = true; }
  }
  // ── 직원 AI
  staffAI(w, dt) {
    const mv = (x, z, sp) => { const d = new V(x - w.pos.x, 0, z - w.pos.z), l = d.length(); if (l < 12) { w.P.anim(dt, false); return true; } d.normalize(); if (l > 140) this.steer(w.pos, d, x, z); w.pos.addScaledVector(d, Math.min(l, sp * dt)); w.P.g.rotation.y = Math.atan2(d.x, d.z); w.P.anim(dt, true); return false; };
    w.P.carry = w.stack.length > 0;
    if (w.k === 'cashier') { const c = this.st.counter; mv(c.Z.cash.x, c.Z.cash.z, 200); w.P.g.rotation.y = 0; return; }
    /* 나르는 직원: 역할마다 (가져올 곳 → 놓을 곳) · 직원 단계: 속도 +10% · 들기 +1 */
    const RL = this.roleRoute(w); if (RL) { const sp = (STAFF[w.k].speed || 300) * (1 + this.sl(w.k) * 0.1);
      if (!w.stack.length) { const src = RL.src(); if (!src) { const h = RL.home; mv(h[0], h[1], sp * 0.6); this.collide(w.pos, 30); return; } if (mv(src.x, src.z, sp)) { this.interact(w, dt); if (w.stack.length >= w.cap || (w.stack.length && src.empty())) w.go = 1; } }
      else { const d = RL.dst(w.kind); if (mv(d.x, d.z, sp)) { const n = w.stack.length; this.interact(w, dt); if (w.stack.length === n && w.tick <= 0) { w.idle = (w.idle || 0) + dt; if (w.idle > 3) { this.sendHome(w); w.idle = 0; }   /* 못 내려놓으면 제자리로 (전엔 없앴음) */ } else w.idle = 0; } }
      this.collide(w.pos, 30); return; }
    if (w.k === 'cleaner') { const sp = STAFF.cleaner.speed * (1 + this.sl('cleaner') * 0.1); w.cap = 4 + this.sl('cleaner'); if (w.kind === 'trash' && (w.stack.length >= w.cap || !Object.values(this.st).some(t => t.type === 'table' && t.trash.length))) { const b = this.st.bin; if (mv(b.Z.drop.x, b.Z.drop.z, sp)) this.interact(w, dt); }
      else { const t = Object.values(this.st).find(t => t.type === 'table' && t.trash.length); if (t) { const sd = w.pos.z < t.z ? -125 : 125; if (mv(t.x, t.z + sd, sp)) this.interact(w, dt); } else mv(-300, 100, sp * 0.5); } this.collide(w.pos, 30); }
  }
  /* 안내: 손에 든 것과 실제 상태를 보고 「지금 가면 되는 곳」만 가리킴
     · 다른 재료 칸에 가면 손에 든 것은 제자리로 돌아가므로 손에 무엇을 들었든 재료 칸 안내는 성공함 */
  guide(dt = 1 / 60) {
    const pl = this.pl, c = this.st.counter, ov = this.st.oven, mx = this.st.mixer, pile = this.piles.find(p => p.v > 0), pad = this.pads[0];
    const at = (Z, t) => [Z.x, Z.z, t], hk = pl.kind, swapTo = k => hk && hk !== k && hk !== 'trash' ? ` · ${josa(NAMES2[hk](), '은/는')} 제자리로` : '';
    const bagelRoute = (pre = '') => ov.stack.length ? at(ov.Z.out, `${pre}오븐에서 플레인을 집어요${hk === 'dough' ? '' : swapTo('bagel')}`)
      : hk === 'dough' ? (this.st.kettle && pl.stack.some(x => !x.m.userData.b) ? at(this.st.kettle.Z.io, '솥 칸을 지나 오븐에 넣어요 (쫄깃!)') : at(ov.Z.out, `${pre}반죽을 오븐에 넣어요`))
      : ov.feed.length ? at(ov.Z.out, `${pre}굽는 중… 오븐 앞에서 잠깐 기다려요`) : at(mx.Z.out, `${pre}반죽기에서 반죽을 집어요${swapTo('dough')}`);
    /* 맨 앞 손님이 진열대에 없는 메뉴를 기다리면 그 메뉴로 가는 길 */ const f = this.cust.find(x => x.state === 'queue' && x.qi === 0), need = f && f.order.find(o => o.got < o.n);
    if (need && !c.shelf[need.k].length) { this.blockT = (this.blockT || 0) + dt; if (this.blockT > 2.5) { const k = need.k, nm = MENU[k].name, wait = `손님이 ${josa(nm, '을/를')} 기다려요 · `;
      if (hk === k) return at(c.Z[k], `${josa(nm, '을/를')} 계산대 뒤 주황 칸에 진열해요`);
      if (k === 'cream') { const cc = this.st.cc, bar = BRANCH_MENU[this.bi]?.cream.bar || '토핑 바';
        if (cc.stack.length) return at(cc.Z.io, `${wait}${bar}에서 집어요${hk === 'bagel' && cc.inStack.length < 8 ? '' : swapTo('cream')}`);
        if (hk === 'bagel' && cc.inStack.length < 8) return at(cc.Z.io, `${bar}에 플레인 베이글을 넣어요`);
        if (cc.inStack.length) return at(cc.Z.io, `${bar}에서 만드는 중… 잠깐 기다려요`);
        return bagelRoute(`${wait}먼저 `); }
      if (k === 'drink') { const es = this.st.espresso; return at(es.Z.out, es.stack.length ? `${wait}커피 머신에서 집어요${swapTo('drink')}` : '커피를 내리는 중… 커피 머신 앞에서 잠깐 기다려요'); }
      if (k === 'coffee') { const cf = this.st.coffee; return at(cf.Z.out, cf.stack.length ? `${wait}냉장고에서 집어요${swapTo('coffee')}` : '냉장고가 채우는 중… 잠깐 기다려요'); }
      return bagelRoute(wait); } } else this.blockT = 0;
    if (hk === 'trash') return at(this.st.bin.Z.drop, '쓰레기는 쓰레기통에 버려요');
    const room = hk && SHELF[hk] != null && c.shelf[hk].length < 12;
    if (this.unl.size > 10) return null;
    if (pad && S.coins >= pad.s.cost - pad.paid) return [pad.s.x, pad.s.z, '돈을 들고 바닥 칸에 서 있으면 열려요'];
    if (pile && pile.v >= 10 && !pl.stack.length) return [pile.x, pile.z, '돈을 주워요'];
    if (room) return at(c.Z[hk], '계산대 뒤 주황 칸에 서면 진열돼요');
    if (hk && SHELF[hk] != null) return f && !this.staff.some(w => w.k === 'cashier') ? at(c.Z.cash, `${NAMES2[hk]()} 진열대가 가득 찼어요 · 초록 칸에서 손님을 받아요`) : null;   /* 진열대가 가득: 손님이 사 가야 자리가 남 */
    if (c.shelf.bagel.length >= 2 && this.cust.some(x => x.state === 'queue') && !this.staff.some(w => w.k === 'cashier')) return at(c.Z.cash, '초록 칸에 서 있으면 손님을 받아요');
    if (hk === 'dough') return bagelRoute();
    if (ov.stack.length) return at(ov.Z.out, '구워진 베이글을 집어요');
    if (ov.feed && ov.feed.length) return at(ov.Z.out, '굽는 중… 잠깐 기다려요');
    return at(mx.Z.out, '반죽기 앞 칸에서 반죽을 집어요');
  }
  // 장애물 피하기 (테이블·계산대·설비): 가는 방향 d 를 옆으로 꺾음
  steer(pos, d, gx, gz) { for (const o of Object.values(this.st)) { const sz = SIZE[o.type]; if (!sz) continue; const R0 = Math.max(sz[0], sz[1] || sz[0]) + 50; if (Math.hypot(o.x - gx, o.z - gz) < R0 + 90) continue;   /* 목적지 설비는 피하지 않음 */
      const tx = o.x - pos.x, tz = o.z - pos.z; if (Math.hypot(tx, tz) > R0 + 200) continue; const ahead = tx * d.x + tz * d.z; if (ahead <= 0) continue; const side = tx * d.z - tz * d.x;
      if (Math.abs(side) < R0) { const k = (R0 - Math.abs(side)) / R0 * 1.4, sg = side > 0 ? -1 : 1, px = d.z, pz = -d.x; d.x += px * sg * k; d.z += pz * sg * k; d.normalize(); } } return d; }
  // ── 메뉴 숙련: 별이 오르면 알림
  addMast(k, n) { const name = MENU[k]?.name; if (!name) return; const b = starOf(name); S.mast[name] = (S.mast[name] || 0) + n; const a = starOf(name);
    if (a > b) { this.ui.toast(`${name} ★${a}! 값 +${Math.round((a - 1) * MASTERY_K * 100)}%`); sfx('levelup', { vol: 0.5 }); const c = this.st.counter; this.confetti(c.x, 160, c.z); } }
  // ── 단골: 오늘 아직 안 온 사람 중 가게 크기가 맞는 사람
  nextRegular() { const opened = [...this.unl].filter(id => !this.B.slots.find(s => s.id === id)?.free).length, d = today();
    return REGULARS.find(R0 => R0.need <= opened && (S.reg[R0.id]?.day !== d) && !this.cust.some(c => c.reg === R0)) || null; }
  regServed(f) { const R0 = f.reg, r = (S.reg[R0.id] ||= { f: 0, day: today(), lv: 0 }); r.f += 1 + (f.mood === 2 ? 1 : 0); const lv = favLv(r.f), mult = this.B.mult;
    this.ui.float(f.mood === 2 ? '♥♥ 호감 +2' : '♥ 호감 +1', f.pos.clone().setY(290), 'heart');
    while ((r.lv || 0) < lv) { r.lv = (r.lv || 0) + 1; let gift = null; if (r.lv === 2 || r.lv === 4) { const id = R0.gift[r.lv === 2 ? 0 : 1]; if (this.addDeco(id)) gift = DECO.find(x => x.id === id).name; }
      let coins = 0; if (!gift) { coins = 150 * r.lv * mult; S.coins += coins; } this.ui.regLevel(R0, r.lv, gift, coins); sfx('reward'); }
    if (REGULARS.every(x => (S.reg[x.id]?.lv || 0) >= 5)) this.addDeco('photo');
    save(); }
  priceK() { return 1 + L('price') * 0.08; }
  premK() { return 0.5 + L('kettle') * 0.06; }   /* 쫄깃 베이글 추가 값 (기본 +50%) */
  sparkle(p) { for (let i = 0; i < 6; i++) { const m = box(5, 5, 5, 0xFFE27A, p.x, p.y + 10, p.z, this.sc); const a = Math.random() * 6.28; this.fx.push({ t: 0, d: 0.5, f: u => { m.position.set(p.x + Math.cos(a) * 30 * u, p.y + 10 + 40 * u, p.z + Math.sin(a) * 30 * u); if (u >= 1) this.sc.remove(m); } }); } }
  steam(x, y, z) { const m = new THREE.Mesh(STEAM_G, new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.6 })); m.position.set(x + rnd(-30, 30), y, z + rnd(-30, 30)); this.sc.add(m); this.fx.push({ t: 0, d: 1.2, f: u => { m.position.y = y + u * 120; m.scale.setScalar(1 + u * 2); m.material.opacity = 0.6 * (1 - u); if (u >= 1) this.sc.remove(m); } }); }
  sl(k) { return (S.branch[this.bi]?.slv?.[k]) || 0; }   /* 직원 단계 */
  roleRoute(w) {
    const NEED = { topper: 'cc', fridge: 'coffee', dougher: 'mixer', driver: 'drive', baker: 'oven' }; if (NEED[w.k] && !this.st[NEED[w.k]]) { const c0 = this.st.counter; return { home: [c0.x - 150, c0.z - 220], src: () => null, dst: () => ({ x: c0.x - 150, z: c0.z - 220 }) }; }   /* 담당 설비가 없으면 대기 */
    const c = this.st.counter, ov = this.st.oven, cc = this.st.cc, cf = this.st.coffee, mx = this.st.mixer, kt = this.st.kettle, dv = this.st.drive, Zp = Z => ({ x: Z.x, z: Z.z });
    const S2 = (st, Z, ok = () => true) => st && st.stack.length && ok() ? { ...Zp(Z), empty: () => !st.stack.length } : null; w.cap = (STAFF[w.k]?.carry || 4) + this.sl(w.k);
    const toDv = k => dv && dv.lane[k] && ({ bagel: 1, cream: this.st.cc, coffee: this.st.coffee, drink: this.st.espresso })[k] && dv.lane[k].length < 6 && c.shelf[k].length >= 5 ? Zp(dv.Z[k]) : null;   /* 계산대가 넉넉하면 드라이브스루 줄도 채움 */
    if (w.k === 'baker') return { home: [ov.Z.out.x + 120, ov.Z.out.z + 60], src: () => c.shelf.bagel.length < 10 || (dv && dv.lane.bagel.length < 6) ? S2(ov, ov.Z.out) : null,
      dst: () => toDv('bagel') || Zp(c.Z.bagel) };
    if (w.k === 'topper') return { home: [cc.Z.io.x + 80, cc.Z.io.z + 40], src: () => cc.stack.length && (c.shelf.cream.length < 8 || (dv && dv.lane.cream.length < 6)) ? S2(cc, cc.Z.io) : cc.inStack.length < 6 && c.shelf.cream.length + cc.stack.length + cc.inStack.length < 8 && !(c.shelf.bagel.length < 2 && c.shelf.cream.length >= 3) ? S2(ov, ov.Z.out) : null,   /* 특별 베이글이 모자라면 오븐에서 가져감 · 플레인이 바닥났고 특별이 충분하면 양보 */
      dst: k => k === 'bagel' ? Zp(cc.Z.io) : toDv('cream') || Zp(c.Z.cream) };
    if (w.k === 'fridge') { const es = this.st.espresso; return { home: [cf.Z.out.x + 60, cf.Z.out.z + 40], src: () => (es && c.shelf.drink.length < Math.min(8, c.shelf.coffee.length + 1) ? S2(es, es.Z.out) : null) || (c.shelf.coffee.length < 8 ? S2(cf, cf.Z.out) : null) || (es && c.shelf.drink.length < 8 ? S2(es, es.Z.out) : null), dst: k => toDv(k) || Zp(c.Z[k]) }; }
    if (w.k === 'driver' && dv) { const SRC = { bagel: [ov, ov.Z.out], cream: cc && [cc, cc.Z.io], coffee: cf && [cf, cf.Z.out], drink: this.st.espresso && [this.st.espresso, this.st.espresso.Z.out] };
      const need = () => { const cr = this.cars.find(x => x.state === 'wait') || this.cars[0]; const want = cr ? Object.keys(cr.order).filter(k => (cr.order[k] - (cr.got[k] || 0)) > dv.lane[k].length) : []; return [...want, 'bagel', 'drink', 'cream', 'coffee'].find(k => SRC[k] && dv.lane[k].length < 6 && SRC[k][0].stack.length); };
      return { home: [dv.Z.bagel.x - 80, dv.Z.bagel.z], src: () => { const k = need(); return k ? S2(SRC[k][0], SRC[k][1]) : null; }, dst: k => Zp(dv.Z[k]) }; }
    if (w.k === 'dougher') return { home: [mx.Z.out.x + 40, mx.Z.out.z + 90], src: () => ov.feed.length < 6 && ov.stack.length < 12 ? S2(mx, mx.Z.out) : null,
      dst: () => kt && w.stack.some(x => !x.m.userData.b) ? Zp(kt.Z.io) : Zp(ov.Z.out) };
    return null;
  }
  // 겹침 검사 (시험용): 모든 열기 칸 · 동작 칸 · 설비 바닥이 서로 겹치는지
  overlaps() { const R = []; for (const s of this.B.slots) { if (!s.free) R.push({ n: 'pad:' + s.id, x: s.px ?? s.x, z: s.pz ?? s.z, w: PAD, d: PAD });
      const sz = SIZE[s.type]; if (sz && s.type !== 'table') R.push({ n: 'st:' + s.id, x: s.x, z: s.z, w: sz[0] * 2, d: (sz[1] || sz[0]) * 2 }); if (s.type === 'table') R.push({ n: 'st:' + s.id, x: s.x, z: s.z, w: 256, d: 144 });
      for (const [k, dx, dz, w, d, , ring] of ZONES[s.type] || []) if (!ring) R.push({ n: 'zone:' + s.id + '.' + k, x: s.x + dx, z: s.z + dz, w, d }); }
    const out = []; for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i], b = R[j]; if (a.n.split(/[:.]/)[1] === b.n.split(/[:.]/)[1]) continue; if (a.n.startsWith('st:') && b.n.startsWith('st:')) continue;
      if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 1 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 1) out.push(a.n + ' × ' + b.n); } return out; }
  srcEmpty(s) { if (s === 'mx') return !this.st.mixer.stack.length; if (s === 'kt') return !this.st.kettle.stack.length; return s === 'cc' ? !this.st.cc.stack.length : s === 'cf' ? !this.st.coffee.stack.length : !this.st.oven.stack.length; }
  // ── 드라이브스루: 차가 와서 베이글 여러 개를 사 감 (창구 진열대에서 자동)
  driveUpdate(dt, mult) {
    const dv = this.st.drive; this.carT -= dt; if (this.carT <= 0 && this.cars.length < 3) { this.carT = rnd(8, 12); const g = car([0xE86A6A, 0x6A9AE8, 0xF2C14E, 0x9ACF6A][Math.floor(Math.random() * 4)]); g.position.set(dv.x + 330, 0, dv.z + 1200); g.rotation.y = Math.PI / 2; this.sc.add(g); const ks = ['bagel', 'bagel']; if (this.st.cc) ks.push('cream'); if (this.st.coffee) ks.push('coffee'); if (this.st.espresso) ks.push('drink'); const order = {}; for (let n = 2 + Math.floor(Math.random() * 4); n > 0; n--) { const k = ks[Math.floor(Math.random() * ks.length)]; order[k] = (order[k] || 0) + 1; }
      this.cars.push({ g, order, got: {}, prem: 0, state: 'in', tag: this.ui.bubble() }); }
    this.cars.forEach((cr, i) => { const tz = dv.z + i * 260; if (cr.state === 'in') { cr.g.position.z = Math.max(tz, cr.g.position.z - 300 * dt); if (i === 0 && Math.abs(cr.g.position.z - tz) < 2) cr.state = 'wait'; }
      else if (cr.state === 'wait') { dv.t -= dt; const k = Object.keys(cr.order).find(k => (cr.got[k] || 0) < cr.order[k] && dv.lane[k].length);
        if (dv.t <= 0 && k) { dv.t = 0.4; const it = dv.lane[k].pop(); if (it.m.userData.prem) cr.prem++; this.fly.push({ m: it.m, from: it.m.position.clone(), to: cr.g.position.clone().setY(90), t: 0, d: 0.25, done: () => this.sc.remove(it.m) }); cr.got[k] = (cr.got[k] || 0) + 1; sfx('blip', { vol: 0.25 }); }
        cr.wt = (cr.wt || 0) + dt; const done = Object.keys(cr.order).every(k => (cr.got[k] || 0) >= cr.order[k]), late = cr.wt > 16;   /* 오래 기다리면 받은 것만 계산하고 떠남 */
        if (late && !done) { for (const k in cr.order) cr.order[k] = cr.got[k] || 0; for (const k in cr.order) if (!cr.order[k]) delete cr.order[k]; if (!Object.keys(cr.order).length) { cr.state = 'out'; cr.tag.remove(); cr.tag = null; this.ui.float('😢', new V(dv.x, 160, dv.z), 'pay'); } }
        if (cr.state === 'wait' && Object.keys(cr.order).every(k => (cr.got[k] || 0) >= cr.order[k])) { const n = Object.values(cr.order).reduce((a, b) => a + b, 0); const v = Math.round((Object.entries(cr.order).reduce((a, [k, n]) => a + MENU[k].price * n * starK(k), 0) * 1.3 + cr.prem * MENU.bagel.price * this.premK()) * mult * this.priceK());
          this.addCash(dv.cash, v); this.ui.float('+' + fmt(v), new V(dv.x, 140, dv.z), 'pay'); addSold(n); for (const [k, m] of Object.entries(cr.order)) this.addMast(k, m); sfx('order', { vol: 0.4 }); cr.state = 'out'; cr.tag.remove(); cr.tag = null; } }
      else { cr.g.position.z -= 320 * dt; } });
    this.cars = this.cars.filter(cr => { if (cr.g.position.z < dv.z - 1600) { this.sc.remove(cr.g); cr.tag && cr.tag.remove(); return false; } return true; });
  }
  confetti(x, y, z) { for (let i = 0; i < 26; i++) { const m = box(12, 12, 4, [0xF28C38, 0xFFD24A, 0x6FCB7A, 0x6A9AE8, 0xE86A8A][i % 5], x, y, z, this.sc); const v = new V(rnd(-1, 1), rnd(1.2, 2.2), rnd(-1, 1)).multiplyScalar(260), r0 = new V(rnd(0, 6), rnd(0, 6), 0);
    this.fx.push({ t: 0, d: 1.1, f: u => { m.position.set(x + v.x * u, y + v.y * u - 400 * u * u, z + v.z * u); m.rotation.set(r0.x + u * 8, r0.y + u * 6, 0); if (u >= 1) this.sc.remove(m); } }); } }
  // 화면 위 표시용 위치
  padList() { return this.pads; }
}
/* 동작 칸: [이름, 설비 기준 x, z, 가로, 세로, 색] */
const ZONES = {
  mixer: [['out', 0, 115, 130, 80, 0xE8E0D0]], kettle: [['io', 0, 120, 150, 90, 0x9ACFE8]],
  oven: [['out', 0, 135, 180, 100, 0xF2A23A]], ccbar: [['io', 0, 140, 180, 100, 0xF6D6A0]], coffee: [['out', 0, 130, 140, 100, 0x9A643A]],
  counter: [['shelf', -30, -118, 246, 96, 0xF2A23A], ['bagel', -125, -118, 60, 96, 0, 2], ['cream', -62, -118, 60, 96, 0, 2], ['coffee', 1, -118, 60, 96, 0, 2], ['drink', 64, -118, 60, 96, 0, 2], ['cash', 150, -118, 110, 96, 0x4FBF6A]],   /* shelf: 어떤 메뉴든 알맞은 줄에 진열 · 나머지는 직원 목표 지점(안 보임) */
  espresso: [['out', 0, 120, 130, 90, 0x6A3A1A]],
  bin: [['drop', 0, 95, 120, 80, 0x5A8A5A]], table: [['trash', 0, 0, 420, 310, 0xB8B0A8, 1]], drive: [['all', -105, 0, 90, 276, 0xF2A23A], ['bagel', -105, -105, 90, 64, 0, 2], ['cream', -105, -35, 90, 64, 0, 2], ['coffee', -105, 35, 90, 64, 0, 2], ['drink', -105, 105, 90, 64, 0, 2]],
};
const WHITE = new THREE.Color(0xFFFFFF), STEAM_G = new THREE.SphereGeometry(10, 8, 6);
const PAD = 160, LANE = { bagel: -105, cream: -35, coffee: 35, drink: 105 };   /* 열기 칸 크기 */
const SIZE = { espresso: [72, 58], mixer: [60, 50], kettle: [68, 58], oven: [105, 80], counter: [168, 62], ccbar: [118, 62], coffee: [72, 58], table: [128, 72], bin: [40], plant: [40], drive: [20, 160] };   /* 테이블: 의자 포함 직사각형 */
const NAMES2 = { bagel: () => '플레인', cream: () => MENU.cream.short, coffee: () => MENU.coffee.short, drink: () => '아메리카노', dough: () => '반죽', trash: () => '쓰레기' };   /* 손에 든 것 이름 (지점마다 바뀜) */
const NAMES = { espresso: '커피 머신', mixer: '반죽기', kettle: '데치기 솥', table: '테이블', ccbar: '토핑 바', coffee: '크림치즈 냉장고', drive: '드라이브스루' };
export const fmt = n => Math.round(n).toLocaleString('en-US');
