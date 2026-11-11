// ② 바닥 칸 하나 (DESIGN 3 · 6-2장): 칸 3종(새로 생김 주황 점선 · 강화 남색 ↑ · 받기 초록) + 별채 책상(카드 창) · 붓기 규칙 하나
//   멈춤 판정: 칸 안에서 실제 이동 속도 < 0.2m/s 가 0.3초 → 붓기 시작 · 금액과 상관없이 0.5초 · 부분 납부는 칸이 기억 · 돈 0 = 조용히 멈춤 · 걸어 나가면 즉시 멈춤(날아간 지폐는 칸에 남음)
//   되돌리기 없음 — 칸이 일하는 길 밖이라 지나가다 밟을 일이 없어요 (시험 Q3 · P1 · P4)
import * as THREE from 'three';
import { padSpot, openingFund } from './space.js?v=0.99.28';
import { STATION, bill, M } from './models.js?v=0.99.28';
import { S, save, mission } from './state.js?v=0.99.28';
import { UP_K, UP_MAX, PROD, DESK_UP } from './data.js?v=0.99.28';
import { FEATURES } from './space.js?v=0.99.28';
import { sfx } from './audio.js?v=0.99.28';
import { track } from './oad.js?v=0.99.28';

/* 붓기 규칙 (DESIGN 6-2): 칸 밖에서 들어와 멈춤 → 멈춤 0.3초(작은 칸) · 0.6초(큰 칸 = 남은 값이 가진 돈의 25% 넘음) → 준비 0.35초(링이 차오름 · 돈 안 나감 · 움직이면 취소) → 0.5초 붓기
   → 돈이 실제로 나가는 때 = 멈추고 0.65초(작은 칸) · 0.95초(큰 칸): 손가락을 고쳐 쥐는 0.3~0.6초 멈칫으로는 안 나감 */
export const STILL_V = 20, STILL_T = 0.3, STILL_BIG = 0.6, BIG_K = 0.25, BIG_ABS = 1000, HOLD_T = 0.35, POUR_T = 0.5, DONE_T = 0.25, SHOW = 3;   /* 멈춤 = 손을 뗀 채 실제 속도 < 0.2m/s (손을 댄 채 벽에 막혀 미끄러지는 것은 멈춤이 아님) */
const DESK_KIND = new Set(['hire', 'next']), DESK_UPS = new Set(['walk', 'carry', 'ads', 'price', 'swalk', 'scarry']);
export const isDesk = o => DESK_KIND.has(o.kind) || (o.kind === 'up' && DESK_UPS.has(o.id.split('+')[0]));
const ghostMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.38, depthWrite: false });
function dashTex(col) { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = 'rgba(255,231,210,0.5)'; x.beginPath(); x.roundRect(8, 8, 240, 240, 26); x.fill(); x.setLineDash([26, 16]); x.lineWidth = 14; x.strokeStyle = col; x.beginPath(); x.roundRect(12, 12, 232, 232, 24); x.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function upTex() { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#2C4A6B'; g.beginPath(); g.roundRect(10, 10, 236, 236, 40); g.fill(); g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(128, 46); g.lineTo(200, 132); g.lineTo(154, 132); g.lineTo(154, 204); g.lineTo(102, 204); g.lineTo(102, 132); g.lineTo(56, 132); g.closePath(); g.fill(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const TEX = {}; const tex = k => TEX[k] ||= k === 'up' ? upTex() : dashTex(k === 'ok' ? '#2FA36B' : '#FF6720');
export const PAD_COLOR = { new: '#FF6720', up: '#2C4A6B', get: '#2FA36B' };   /* 칸 종류마다 색 1개 (P3) */

export class Pads {
  constructor(g) { this.g = g; this.list = []; this.pour = null; this.deskOpen = null; this.deskT = 0; this.ver = -1; this.refresh(); }
  get order() { return this.g.sp.order; }
  // ── 진행률 · 다음 값
  progress() { const O = this.order.filter(o => o.kind !== 'next'); return O.filter(o => this.g.bought(o.id)).length / O.length; }
  nextCost() { const p = this.list.find(p => !p.done); return p ? p.cost - p.paid : 1000 * this.g.B.mult; }
  req(o) { const g = this.g, id = o.id.split('+')[0];
    if (o.kind === 'up') { if (DESK_UPS.has(id)) return g.own('boss') || (id.startsWith('s') && g.own('crew')); return g.own(id); }
    if (o.kind === 'room') return o.id === 'crew' || (o.id === 'boss' && g.own('crew')) || (o.id === 'store' && g.own('boss'));
    if (o.kind === 'hire') return g.own('crew') && this.hireOk(o.id);
    if (o.kind === 'next') return g.own('boss') && this.progress() >= 0.9;
    if (o.kind === 'node' && id === 'retard') return g.own(g.sp.feat);
    if (o.kind === 'zone') return g.own('counter');
    return true; }
  hireOk(r) { const g = this.g; return { cashier: g.own('counter'), runner: g.own('oven'), baker: g.own('mixer') && g.own('oven'), topper: g.own('top'), barista: g.own('cream') || g.own('coffee'), cleaner: g.own('t1'), picker: g.own('pickup'), driver: g.own('drive'), server: g.own('up2'), cleaner2: g.own('terrace') }[r] ?? true; }
  /* 강화 값: 여는 순서에 있는 단계는 그 값 · 그 밖은 시설 값 × 1.45^단계 */
  upCost(k, lv) { const g = this.g, o = this.order.find(x => x.id === `${k}+${lv}`); if (o) return o.cost; const base = this.order.find(x => x.id === k)?.cost || (DESK_UP[k]?.base || 500) * g.B.mult; return Math.round(base * 0.8 * Math.pow(UP_K, lv) / 10) * 10; }
  /* 바닥에 보이는 칸: 여는 순서에서 아직 안 산 바닥 칸 앞 3개 (책상 일은 빼고) · 다 사면 남은 시설 강화 중 싼 2개 */
  floorWant() { const g = this.g, out = []; let first = this.order.findIndex(o => !g.bought(o.id)); if (first < 0) first = this.order.length;
    for (let i = 0; i < this.order.length && out.length < SHOW; i++) { const o = this.order[i]; if (g.bought(o.id) || isDesk(o) || !this.req(o) || i > first + 6) continue; out.push(o); }
    if (out.length < 2) { const ex = []; for (const k of Object.keys(g.sp.nodes)) { if (!g.own(k)) continue; const lv = g.lv(k); if (lv >= UP_MAX || this.order.some(o => o.id === `${k}+${lv + 1}` && !g.bought(o.id))) continue; ex.push({ id: `${k}+${lv + 1}`, kind: 'up', cost: this.upCost(k, lv + 1) }); }
      ex.sort((a, b) => a.cost - b.cost); for (const e of ex) if (out.length < 2) out.push(e); }
    return out; }
  refresh() { const g = this.g; if (!g.root) return; const want = this.floorWant(), key = want.map(o => o.id).join(',');
    if (key === this.key) return; this.key = key;
    for (const p of this.list) if (!want.some(o => o.id === p.o.id)) { g.root.remove(p.mesh); p.tag?.remove(); }
    this.list = want.map(o => this.list.find(p => p.o.id === o.id) || this.make(o)); }
  make(o) { const g = this.g, s = padSpot(g.sp, o); const kind = o.kind === 'up' ? 'up' : 'new', grp = new THREE.Group(); grp.position.set(s.at[0], 0, s.at[1]);
    const [w, d] = s.size;
    if (kind === 'up') { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex('up'), transparent: true, depthWrite: false })); m.position.y = 2; grp.add(m); }
    else { const m = new THREE.Mesh(new THREE.PlaneGeometry(w + 20, d + 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex('new'), transparent: true, depthWrite: false })); m.position.y = 2; grp.add(m); grp.userData.dash = m;
      const model = this.ghostModel(o); if (model) { model.traverse(x => { if (x.isMesh) { x.material = ghostMat; x.castShadow = false; } if (x.isLight) x.visible = false; }); grp.add(model); } }
    g.root.add(grp); const name = this.label(o);
    return { o, at: s.at, size: s.size, kind, mesh: grp, cost: o.cost, get paid() { return +(g.br.paid[o.id] || 0); }, still: 0, silent: false, name, done: false }; }
  ghostModel(o) { const g = this.g, id = o.id, sp = g.sp, m = new THREE.Group();
    if (o.kind === 'node') { const nd = id === 'counter' ? { model: 'counter' } : sp.nodes[id]; if (!nd) return null; m.rotation.y = nd.face === 'W' ? -Math.PI / 2 : nd.face === 'E' ? Math.PI / 2 : 0; STATION[nd.model](m); return m; }
    if (o.kind === 'table') { STATION.table(m); return m; }
    if (o.kind === 'door') { const b = new THREE.Mesh(new THREE.BoxGeometry(70, 50, 6), M(0xFF6720)); b.position.y = 90; m.add(b); const l = new THREE.Mesh(new THREE.BoxGeometry(6, 90, 6), M(0x5A3A22)); l.position.y = 45; m.add(l); return m; }
    if (o.kind === 'feat' && sp.window) { m.position.x = 40; STATION.window(m); return m; }
    return null; }
  label(o) { const g = this.g, [k, lv] = o.id.split('+'); if (o.kind === 'up') return `${g.sp.nodes[k]?.name || DESK_UP[k]?.name || k} ${lv}단계`;
    if (o.kind === 'node') return k === 'counter' ? '계산대' : g.sp.nodes[k]?.name || k; if (o.kind === 'table') return '테이블'; if (o.kind === 'door') return '문 열기';
    if (o.kind === 'room') return g.sp.rooms[k].name; if (o.kind === 'zone') return '창가 바'; if (o.kind === 'feat') return FEATURES[g.sp.feat].name; return k; }
  inside(p, x, z) { const [w, d] = p.size; return Math.abs(x - p.at[0]) <= w / 2 + 5 && Math.abs(z - p.at[1]) <= d / 2 + 5; }
  // ── 한 프레임: 멈춤 → 붓기 → 다 참 · 공사 · 책상
  update(dt) {
    const g = this.g, pl = g.pl; this.refresh();
    for (const p of this.list) { if (p.done) continue; const on = this.inside(p, pl.pos.x, pl.pos.z);
      if (!on) { p.still = 0; p.silent = false; p.armed = true; if (this.pour?.p === p) this.pour = null; continue; }   /* 칸 밖에 한 번 나가야 그 칸이 「켜짐」 (서 있는 자리에 칸이 생기면 안 붓음) */
      if (!p.armed) continue;
      p.still = pl.spd < STILL_V && !pl.input ? p.still + dt : 0;
      if (this.pour?.p === p && p.still === 0) this.pour = null;   /* 다시 움직임 = 즉시 멈춤 (준비 중이면 돈 0) */
      const left = p.cost - p.paid - (p.flight || 0), need = left > S.coins * BIG_K || p.cost >= BIG_ABS ? STILL_BIG : STILL_T;
      if (!this.pour && p.still >= need && !p.silent) { const amt = Math.min(Math.floor(S.coins), left);
        if (left <= 0) continue; if (amt <= 0) { p.silent = true; continue; }
        const n = Math.max(6, Math.min(8, Math.ceil(amt / Math.max(1, p.cost / 8)))); this.pour = { p, amt, n, sent: 0, t: -HOLD_T, left: amt }; }
      // 칸 테두리: 살 돈이 충분하면 초록으로 숨쉼 · 모자라면 주황
    }
    for (const p of this.list) if (p.mesh.userData.dash) { const ok = S.coins >= p.cost - p.paid; const m = p.mesh.userData.dash.material; const want = ok ? tex('ok') : tex('new'); if (m.map !== want) { m.map = want; m.needsUpdate = true; } m.opacity = ok ? 0.75 + 0.25 * Math.sin(g.time * 4) : 1; }
    // 붓기: 0.5초 동안 n 장 (0.065초 간격 · 반음씩) · 지폐 = 사장 머리 위 → 칸 포물선 · 칸 숫자는 도착한 만큼 줄어듦
    const P = this.pour; if (P) { P.t += dt; P.p.hold = Math.min(1, 1 + P.t / HOLD_T); if (P.t >= 0) while (P.sent < P.n && P.t >= (P.sent + 1) * (POUR_T / P.n) - 1e-6) { const part = P.sent === P.n - 1 ? P.left : Math.floor(P.amt / P.n); P.left -= part; P.sent++; S.coins -= part; this.flyBill(P.p, part); sfx('bill'); }
      if (P.sent >= P.n) this.pour = null; }
    for (const p of this.list) if (this.pour?.p !== p) p.hold = 0;
    // 다 참 → 0.25초 뒤 결과
    for (const p of this.list) if (!p.done && p.paid >= p.cost && !(p.flight > 0) && !p.doneT) p.doneT = g.time + DONE_T;
    for (const p of this.list) if (p.doneT && g.time >= p.doneT && !p.done) { p.done = true; this.complete(p.o, p.at); }
    // 공사 끝
    for (const [id, end] of Object.entries(g.br.build)) if (Date.now() >= end) { delete g.br.build[id]; save(true); sfx('hammer'); g.ui?.note(`🎉 ${this.label({ id, kind: id === g.sp.feat ? 'feat' : 'node' })} 공사 끝!`); g.opened({ id, kind: 'feat' }, null); }
    // 별채 책상: 책상 앞 0.3초 멈춤 → 카드 창 · 걸어 나가면 닫힘
    let near = null; for (const [k, r] of Object.entries(g.sp.rooms)) if (g.own(k) && Math.hypot(pl.pos.x - r.desk[0], pl.pos.z - r.desk[1]) < 80) near = k;
    if (near) { this.deskT = pl.spd < STILL_V ? this.deskT + dt : this.deskT; if (this.deskT >= STILL_T && this.deskOpen !== near) { this.deskOpen = near; sfx('card'); g.ui?.desk(near); } }
    else { this.deskT = 0; if (this.deskOpen) { const r = g.sp.rooms[this.deskOpen]; if (Math.hypot(pl.pos.x - r.desk[0], pl.pos.z - r.desk[1]) > 130) { this.deskOpen = null; g.ui?.desk(null); } } }
  }
  flyBill(p, part) { p.flight = (p.flight || 0) + part; const g = this.g, m = bill(), p0 = new THREE.Vector3(g.pl.pos.x, 230, g.pl.pos.z), p1 = new THREE.Vector3(p.at[0], 10, p.at[1]); m.position.copy(p0); g.root.add(m);
    g.flying.push({ m, p0, p1, t: 0, T: 0.32, h: 70, done: () => { g.root.remove(m); p.flight -= part; g.br.paid[p.o.id] = (+(g.br.paid[p.o.id] || 0)) + part; } }); }
  /* 산 것: 저장 → 열림(공사면 공사 시작) → 연출 · 소리 · 알림 한 줄 */
  complete(o, at) { const g = this.g, br = g.br; if (br.own.includes(o.id)) return; br.own.push(o.id); delete br.paid[o.id];
    if (o.build) br.build[o.id] = Date.now() + o.build * 1000;
    if (o.kind === 'next') { const nb = (S.branch[g.bi + 1] ||= { own: [], paid: {}, build: {} }); if (!nb.fund) { nb.fund = openingFund(g.bi + 1); S.coins += nb.fund; } }   /* 개업 자금 (한 번만) */
    save(true); mission('unlock'); track('bg_unlock', { b: g.bi, id: o.id, n: br.own.length });
    if (o.kind === 'up') { sfx('upgrade', { v: [3, 6, 9].includes(+o.id.split('+')[1]) ? 3 : 1 }); } else { sfx('pad_done'); setTimeout(() => sfx(o.build ? 'hammer' : 'build'), 120); }
    this.key = null; g.opened(o, at); g.ui?.unlocked(o, this.label(o));
    if (this.progress() >= 1 && !br.done) { br.done = true; save(true); } }
  /* 책상 카드에서 산 것 (돈 · 광고 무료) */
  buyDesk(o, free) { const g = this.g; if (g.bought(o.id)) return false; if (!free) { if (S.coins < o.cost) return false; S.coins -= o.cost; } this.complete(o, null); if (o.kind === 'hire') { g.staffSys.sync(); sfx('hello'); } return true; }
  /* 책상 카드 목록 (방마다 · 지금 살 수 있는 것 먼저) */
  deskCards(room) { const g = this.g, out = [];
    for (const o of this.order) { if (g.bought(o.id) || !isDesk(o) || !this.req(o)) continue; const k = o.id.split('+')[0], R0 = o.kind === 'hire' || k === 'swalk' || k === 'scarry' ? 'crew' : 'boss'; if (R0 !== room) continue; if (out.some(x => x.o.kind === o.kind && x.o.id.split('+')[0] === k)) continue; out.push({ o }); }
    for (const [k, U] of Object.entries(DESK_UP)) { if (U.room !== room || out.some(x => x.o.id.split('+')[0] === k)) continue; const lv = g.lv(k); if (lv >= UP_MAX) continue; if (!this.req({ id: k, kind: 'up' })) continue; if (this.order.some(o => o.id === `${k}+${lv + 1}`)) continue; out.push({ o: { id: `${k}+${lv + 1}`, kind: 'up', cost: this.upCost(k, lv + 1) } }); }
    return out; }
}
