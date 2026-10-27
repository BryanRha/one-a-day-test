// 카페 놀이: 머신으로 메뉴 내리기 → 바에 진열 → 손님이 앉아 주문 → 사장(나)이 내어 줌 → 치우기 · 원두 볶기 · 꾸미기 · 단골
//   바닥은 100 단위 칸 — 가구가 놓인 칸은 못 지나감 · 길(문 → 모든 자리 · 바)이 막히는 배치는 안 됨
import * as THREE from 'three';
import { MENU, FURN, MACHINES, STAFF, STORES, MOOD, REGULARS, ROAST, BEAN_MAX, BRAND } from './data.js?v=0.68.1';
import { S, ST, save, levelOf, dayTick, today, now } from './state.js?v=0.68.1';
import { M, box, cyl, sph, person, cup, tray, spill, room, STATION, FURN_MODEL, poemFrame, ROOM } from './models.js?v=0.68.1';
import { sfx } from './audio.js?v=0.68.1';

const V = THREE.Vector3, CELL = 100, N = 14, rnd = (a, b) => a + Math.random() * (b - a);
export const fmt = n => Math.round(n).toLocaleString('en-US');
const cx = i => -ROOM.W / 2 + CELL / 2 + i * CELL, cz = j => -ROOM.D / 2 + CELL / 2 + j * CELL;
const ci = x => Math.floor((x + ROOM.W / 2) / CELL), cj = z => Math.floor((z + ROOM.D / 2) / CELL);
const DOOR = [13, 8], BAR_PICK = [8, 3], HOME = [6, 3];   /* 문 칸 · 픽업대 앞 칸 · (예전) 사장 자리 */
const FIXED = new Set(['1,4', '12,6']);   /* 나무 기둥 · 키오스크 */
const NOPLACE = new Set(['13,8', '13,9', '12,8', '12,7', '11,7', '10,7', '10,8', '4,3', '3,3']);   /* 문 앞 · 키오스크 줄 · 반납대 앞 */
export const WALL_SLOTS = [[-683, -60, Math.PI / 2], [-683, 180, Math.PI / 2], [-683, 520, Math.PI / 2], [-250, -683, 0], [600, -683, 0]];
const ESP_POS = [[-170, -630], [-40, -630], [90, -630]], OVEN_POS = [[-420, -630], [-295, -630]], ROASTER = [-590, -540];   /* 제작: 뒷벽 작업대 위 · 화면 오른쪽 버튼에 가리지 않게 왼쪽·가운데로 */   /* 제작: 뒷벽 작업대 위 */
const PICK = { x0: -5, x1: 310, z: -455, y: 117 }, LANE = -543;
const KQ = [[12, 7], [11, 7], [10, 7], [10, 8]];   /* 키오스크 줄 (입구 옆) */
const RET = { x: -190, z: -455, y: 98 }, RET_SPOT = [4, 3], RET_MAX = 8;   /* 반납대 */
const KIOSK = [560, -20];   /* 받는 곳: 픽업대 · 사장이 오가는 통로 */
export const machineCount = kind => MACHINES[kind].filter(l => S.lv >= l).length;
export const storeMult = () => STORES[S.si].mult;

export class Game {
  constructor(sc, cam, ui) { this.sc = sc; this.cam = cam; this.ui = ui; this.t = 0; this.fx = []; this.cust = []; this.view = { x: 0, z: 60, zoom: 1 }; }
  // ── 매장 짓기
  build() {
    const sc = this.sc; sc.clear(); for (const c of this.cust) c.tag && c.tag.remove(); this.cust = []; this.ui.clearTags && this.ui.clearTags();
    sc.background = new THREE.Color(0xE9DFD0);
    sc.add(new THREE.HemisphereLight(0xFFF4E6, 0x8A6A50, 1.35)); const sun = new THREE.DirectionalLight(0xFFE2BC, 1.7); sun.position.set(700, 1400, 900); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -1100, right: 1100, top: 1100, bottom: -1100, near: 10, far: 4000 }); sun.shadow.bias = -0.0006; sun.shadow.radius = 4; sc.add(sun);
    room(sc);
    const ro = new THREE.Group(); ro.position.set(...[ROASTER[0], 0, ROASTER[1]]); sc.add(ro); STATION.roaster(ro); this.roaster = { g: ro, x: ROASTER[0], z: ROASTER[1], kind: 'roaster' };
    this.machines = []; const add = (kind, pos, i) => { const g = new THREE.Group(); g.position.set(pos[0], 107, pos[1]); sc.add(g); STATION[kind](g); const m = { kind, i, key: kind[0] + i, g, x: pos[0], z: pos[1] }; this.machines.push(m); };
    for (let i = 0; i < machineCount('espresso'); i++) add('espresso', ESP_POS[i], i); for (let i = 0; i < machineCount('oven'); i++) add('oven', OVEN_POS[i], i);
    this.barG = new THREE.Group(); sc.add(this.barG); this.tickets = []; this.resv = {}; ST().bar = {}; this.refreshBar();   /* 주문 없이 남은 진열은 비움 (주문 들어와야 만듦) */
    this.retG = new THREE.Group(); sc.add(this.retG); ST().ret = ST().ret || 0; this.refreshRet();
    { const k = new THREE.Group(); k.position.set(KIOSK[0], 0, KIOSK[1]); sc.add(k); STATION.kiosk(k); }
    this.furn = []; for (const f of ST().furn) this.addFurn(f); this.walls = []; this.refreshWalls(); this.rebuildGrid();
    const P = person({ body: 0xF4EEE4, apron: BRAND.redHex, hair: 0x3A2A1E, pants: 0x3B2A20, bun: true }); P.g.position.set(cx(HOME[0]), 0, cz(HOME[1])); sc.add(P.g);
    P.g.position.set(100, 0, LANE); P.g.rotation.y = 0; this.owner = { P, pos: P.g.position, tx: 100 }; this.workers = [];   /* 사장은 바 안에서 커피를 내림 · 손님은 쟁반을 직접 가져감 */
    if (S.staff.barista) this.hireBarista(true); if (S.staff.hall) this.hireHall(true);
    this.spawnT = 3; this.regT = 25; this.boostUntil = this.boostUntil || 0;
    this.arrow = new THREE.Group(); const cone = new THREE.Mesh(new THREE.ConeGeometry(22, 44, 4), M(BRAND.redHex)); cone.rotation.x = Math.PI; this.arrow.add(cone); sc.add(this.arrow); this.arrow.visible = false;
    this.deco = null; this.ui.progress();
  }
  // ── 가구
  footprint(f) { const d = FURN[f.id], [w, h] = f.r % 2 ? [d.size[1], d.size[0]] : d.size; const i0 = Math.round((f.x + ROOM.W / 2) / CELL - w / 2), j0 = Math.round((f.z + ROOM.D / 2) / CELL - h / 2); const out = []; for (let i = i0; i < i0 + w; i++) for (let j = j0; j < j0 + h; j++) out.push([i, j]); return out; }
  addFurn(f) {
    const d = FURN[f.id]; if (!d || d.wall) return; const g = new THREE.Group(); g.position.set(f.x, 0, f.z); g.rotation.y = -f.r * Math.PI / 2; this.sc.add(g); FURN_MODEL[f.id](g);
    const seats = (d.seats || []).map(([x, z, ry]) => { const v = new V(x, 0, z).applyAxisAngle(new V(0, 1, 0), -f.r * Math.PI / 2); return { x: f.x + v.x, z: f.z + v.z, ry: ry - f.r * Math.PI / 2, who: null, dirty: null }; });
    const o = { f, g, seats }; this.furn.push(o); const dirty = ST().dirty[f.uid]; if (dirty) for (const k of dirty) if (seats[k]) this.makeDirty(o, k, true); return o;
  }
  refreshWalls() { for (const w of this.walls) this.sc.remove(w); this.walls = []; for (let k = 0; k < WALL_SLOTS.length; k++) { const id = ST().wall[k]; if (!id) continue; const [x, z, ry] = WALL_SLOTS[k]; const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; this.sc.add(g);
    if (id.startsWith('poem:')) { const R = REGULARS.find(r => r.id === id.slice(5)); poemFrame(g, R ? R.poem : '마음이/쉬어가는/곳'); } else FURN_MODEL[id](g); g.userData.slot = k; this.walls.push(g); } }
  rebuildGrid() { this.block = new Set(FIXED); for (const o of this.furn) for (const [i, j] of this.footprint(o.f)) this.block.add(i + ',' + j); for (const o of this.furn) for (const s of o.seats) s.cell = this.accessCell(s, o); }
  walkable(i, j, block = this.block) { return i >= 0 && j >= 3 && i < N && j < N && !block.has(i + ',' + j); }
  accessCell(s, o, block = this.block) { const si = ci(s.x), sj = cj(s.z); let best = null, bd = 1e9; for (const [di, dj] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const i = si + di, j = sj + dj; if (!this.walkable(i, j, block)) continue; const d = Math.hypot(cx(i) - s.x, cz(j) - s.z); if (d < bd) { bd = d; best = [i, j]; } } return best; }
  /* 길: 칸 위 A* (8방향, 대각선은 양옆이 비어야) */
  path(a, b) {
    if (!a || !b) return null; const key = (i, j) => i * 32 + j, open = [[a[0], a[1], 0, 0]], from = new Map(), gs = new Map([[key(...a), 0]]), seen = new Set();
    while (open.length) { open.sort((p, q) => p[3] - q[3]); const [i, j, g] = open.shift(); const k = key(i, j); if (seen.has(k)) continue; seen.add(k);
      if (i === b[0] && j === b[1]) { const out = [[i, j]]; let c = k; while (from.has(c)) { c = from.get(c); out.unshift([Math.floor(c / 32), c % 32]); } return out; }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const ni = i + di, nj = j + dj; if (!this.walkable(ni, nj)) continue; if (di && dj && (!this.walkable(i + di, j) || !this.walkable(i, j + dj))) continue;
        const ng = g + (di && dj ? 1.414 : 1), nk = key(ni, nj); if (ng < (gs.get(nk) ?? 1e9)) { gs.set(nk, ng); from.set(nk, k); open.push([ni, nj, ng, ng + Math.hypot(b[0] - ni, b[1] - nj)]); } } }
    return null;
  }
  /* 배치 검사: 범위 · 겹침 · 문에서 모든 자리와 바까지 갈 수 있는지 */
  canPlace(f, ignoreUid) {
    const cells = this.footprint(f); for (const [i, j] of cells) if (i < 0 || j < 4 || i >= N || j >= N || FIXED.has(i + ',' + j) || NOPLACE.has(i + ',' + j)) return '여기에는 놓을 수 없어요';
    const block = new Set(FIXED); for (const o of this.furn) if (o.f.uid !== ignoreUid) for (const [i, j] of this.footprint(o.f)) block.add(i + ',' + j);
    for (const [i, j] of cells) if (block.has(i + ',' + j)) return '다른 가구와 겹쳐요'; for (const [i, j] of cells) block.add(i + ',' + j);
    const seen = new Set([DOOR.join(',')]), q = [DOOR]; while (q.length) { const [i, j] = q.shift(); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + di, nj = j + dj, k = ni + ',' + nj; if (seen.has(k) || !this.walkable(ni, nj, block)) continue; seen.add(k); q.push([ni, nj]); } }
    if (!seen.has(BAR_PICK.join(','))) return '바로 가는 길이 막혀요';
    const d = FURN[f.id]; const tmp = { f, seats: [] }; const all = [...this.furn.filter(o => o.f.uid !== ignoreUid), tmp];
    for (const o of all) { const seats = o === tmp ? (d.seats || []).map(([x, z]) => { const v = new V(x, 0, z).applyAxisAngle(new V(0, 1, 0), -f.r * Math.PI / 2); return { x: f.x + v.x, z: f.z + v.z }; }) : o.seats;
      for (const s of seats) { const a = this.accessCell(s, o, block); if (!a || !seen.has(a.join(','))) return '앉을 자리로 가는 길이 막혀요'; } }
    return null;
  }
  // ── 바 진열 (잔 모양으로 보여 줌)
  refreshBar() { this.barG.clear(); this.trayX = {}; let x = PICK.x0; for (const [k, n] of Object.entries(ST().bar)) { if (n <= 0) continue; if (x > PICK.x1) break; this.trayX[k] = x;   /* 픽업대: 메뉴마다 한 줄 (앞뒤 최대 2개) */
    for (let i = 0; i < Math.min(n, 2); i++) { const m = tray(MENU[k].look); m.scale.setScalar(1.25); m.position.set(x, PICK.y, PICK.z + 22 - i * 44); m.rotation.y = i ? 0.06 : -0.05; this.barG.add(m); } x += 78; } }
  barTotal() { return Object.values(ST().bar).reduce((a, b) => a + b, 0); }
  // ── 머신 · 로스터 (시간은 실제 시각 기준 → 나가 있어도 계속)
  mstate(m) { return ST().mach[m.key] || null; }
  progress(m) { const s = this.mstate(m); if (!s) return null; const T = MENU[s.menu].t * 1000, u = (now() - s.start) / T; return { s, u: Math.min(1, u), left: Math.max(0, Math.ceil((T - (now() - s.start)) / 1000)) }; }
  brew(m, k, want) { const d = MENU[k]; if (this.mstate(m)) return '이미 내리는 중이에요'; if (S.lv < d.lv) return `Lv.${d.lv}에 열려요`; if (!!d.oven !== (m.kind === 'oven')) return d.oven ? '오븐에서 구워요' : '머신에서 내려요';
    const n = Math.max(1, Math.min(d.n, want || this.need(k) || 1));   /* 주문된 만큼, 최대 한 번에 d.n(3) */
    this.owner.tx = m.x; const need = d.bean * n; if (S.beans < need) return `원두가 모자라요 (${need}잔분 필요)`; S.beans -= need; ST().mach[m.key] = { menu: k, start: now(), n }; ST().last = ST().last || {}; ST().last[m.key] = k; sfx('build', { vol: 0.5 }); save(); this.steam(m.x, 220, m.z); return null; }
  collect(m) { const p = this.progress(m); if (!p || p.u < 1) return false; const st = ST(), k = p.s.menu, room = Math.max(0, 12 - (st.bar[k] || 0)); if (!room) { this.ui.toast('바에 자리가 없어요 · 손님이 가져가면 다시 놓아요'); return false; }
    this.owner.tx = PICK.x0 - 40; const n = Math.min(room, p.s.n); st.bar[k] = (st.bar[k] || 0) + n; p.s.n -= n; if (p.s.n <= 0) delete st.mach[m.key];
    { const t = tray(MENU[k].look), from = new V(m.x, 140, m.z), to = new V(PICK.x0 + 40, PICK.y + 10, PICK.z); this.sc.add(t); this.fx.push({ t: 0, d: 0.45, f: u => { t.position.lerpVectors(from, to, u); t.position.y += Math.sin(u * Math.PI) * 60; if (u >= 1) { this.sc.remove(t); this.refreshBar(); } } }); }   /* 작업대 → 픽업대로 옮김 */ sfx('pick', { vol: 0.5 }); this.ui.float(`${MENU[k].name} +${n}`, new V(m.x, 260, m.z), 'pay'); save(); this.ui.progress(); return true; }
  finishNow(m) { const s = this.mstate(m); if (s) s.start = now() - MENU[s.menu].t * 1000; const r = ST().roast; if (m.kind === 'roaster' && r) r.start = 0; save(); }
  roastState() { const r = ST().roast; if (!r) return null; const R = ROAST.find(x => x.id === r.id), T = R.t * 1000; return { r, R, u: Math.min(1, (now() - r.start) / T), left: Math.max(0, Math.ceil((T - (now() - r.start)) / 1000)) }; }
  roast(id) { const R = ROAST.find(x => x.id === id); if (ST().roast) return '로스터가 쉬고 있지 않아요'; if (S.lv < R.lv) return `Lv.${R.lv}에 열려요`; const c = R.cost * storeMult(); if (S.coins < c) return '돈이 모자라요'; S.coins -= c; ST().roast = { id, start: now() }; sfx('build'); save(); this.ui.progress(); return null; }
  collectBeans() { const s = this.roastState(); if (!s || s.u < 1) return false; const room = BEAN_MAX - S.beans; if (room <= 0) { this.ui.toast('원두 창고가 가득 찼어요'); return false; } const n = Math.min(room, s.R.beans); S.beans += n; ST().roast = null; sfx('coin'); this.ui.float(`원두 +${n}`, new V(this.roaster.x, 260, this.roaster.z), 'bean'); this.gainXp(2); save(); this.ui.progress(); return true; }
  // ── 손님
  seats() { const out = []; for (const o of this.furn) o.seats.forEach((s, k) => out.push({ o, s, k })); return out; }
  freeSeats() { return this.seats().filter(x => !x.s.who && !x.s.dirty && x.s.cell); }
  menuPool() { return Object.entries(MENU).filter(([, d]) => S.lv >= d.lv && (!d.oven || machineCount('oven'))).map(([k]) => k); }
  spawn(reg) {   /* 입장 → 키오스크 줄 → 주문 → 자리 · 자리는 들어올 때 미리 정해 둠 */
    const free = this.freeSeats(), qn = this.cust.filter(c => ['in', 'queue', 'kiosk', 'story'].includes(c.state)).length, open = this.tickets.length + qn, cap = 2 + this.machines.length * 2;   /* 밀린 주문이 머신 수에 비해 많으면 손님이 덜 옴 */
    if (!free.length || qn >= KQ.length || (!reg && open >= cap)) return false; const seat = free[Math.floor(Math.random() * free.length)];
    const P = person(reg ? { body: reg.body, hair: reg.hair, bun: reg.bun, pants: 0x4A3A30 } : { body: [0x8FA6C2, 0xE3B9A8, 0xC9B27A, 0x9DBF9A, 0xD9D2C8, 0xB8A0C8, 0xE8C8A0, 0x7A8A9A][Math.floor(Math.random() * 8)], hair: [0x2A1E16, 0x6A4A32, 0x1E1612, 0x8A5A3A, 0x4A3A2A][Math.floor(Math.random() * 5)], pants: [0x4A4A55, 0x7A6A5A, 0x3B3B42, 0x5A4A3A][Math.floor(Math.random() * 4)], bun: Math.random() < 0.3, glasses: Math.random() < 0.25 });
    P.g.position.set(cx(DOOR[0]) + 160, 0, cz(DOOR[1]) + rnd(-40, 40)); this.sc.add(P.g);
    const items = this.pickItems();
    const c = { P, pos: P.g.position, seat, state: 'in', items, menu: items[0].k, w: 0, reg, story: !!reg, tag: this.ui.bubble() }; seat.s.who = c;
    this.cust.push(c); this.reQ(); return true;
  }
  /* 키오스크 줄: 앞사람부터 KQ[0] · 뒤로 한 칸씩 */
  pickItems(first) {   /* 1개 70% · 2개 24% · 3개 6% · 같은 메뉴 2잔도 있음 · 레벨이 낮으면 대부분 1개 */
    const pool = this.menuPool(), pick = () => pool[Math.floor(Math.random() * pool.length)] || 'americano', r = Math.random(), lvK = Math.min(1, S.lv / 5);
    const total = r < 1 - 0.3 * lvK ? 1 : r < 1 - 0.06 * lvK ? 2 : 3, items = [];
    for (let i = 0; i < total; i++) { const k = i === 0 && first ? first : pick(), it = items.find(x => x.k === k); if (it) it.n++; else items.push({ k, n: 1 }); }
    return items;
  }
  reQ() { let i = 0; for (const c of this.cust) if (['in', 'queue', 'kiosk', 'story'].includes(c.state)) { const q = KQ[Math.min(i, KQ.length - 1)]; if (!c.qc || c.qc.join() !== q.join()) { c.qc = q; c.route = this.path(this.cellOf(c).join() === '13,8' || c.state === 'in' ? [DOOR[0], DOOR[1]] : this.cellOf(c), q); if (c.state === 'in') c.route && c.route.unshift(null); if (c.state !== 'in') c.state = 'queue'; } c.qi = i++; } }
  /* 주문 묶음: c.items = [{ k, n }] (한 손님 최대 3잔/개) · need(k) = 주문됐는데 아직 픽업대에도 머신에도 없는 수 */
  need(k) { let want = 0; for (const t of this.tickets) for (const it of t.items) if (it.k === k) want += it.n; for (const m of this.machines) { const p = this.progress(m); if (p && p.s.menu === k) want -= p.s.n; } return Math.max(0, want - (ST().bar[k] || 0)); }
  ready(c) { return c.items.every(it => this.avail(it.k) >= it.n); }
  avail(k) { return (ST().bar[k] || 0) - (this.resv[k] || 0); }   /* 픽업대에 놓였고 아직 누가 맡지 않은 쟁반 */
  /* 픽업대 앞 칸 (쟁반을 집는 곳) */
  freeSpot() { const used = new Set(this.cust.filter(c => c.spot).map(c => c.spot.join())); const opts = []; for (let i = 6; i <= 10; i++) if (!used.has(i + ',3') && this.walkable(i, 3)) opts.push([i, 3]); return opts.length ? opts[Math.floor(Math.random() * opts.length)] : [8, 3]; }
  walk(w, dt, sp) {   /* 경로 따라 걷기: 끝나면 true */
    if (!w.route || !w.route.length) return true; let nx = w.route[0]; if (!nx) { w.route.shift(); nx = w.route[0]; if (!nx) return true; }
    const tx = cx(nx[0]), tz = cz(nx[1]), d = new V(tx - w.pos.x, 0, tz - w.pos.z), l = d.length();
    if (l < 6) { w.route.shift(); return !w.route.length; } d.normalize(); w.pos.addScaledVector(d, Math.min(l, sp * dt)); w.P.g.rotation.y = Math.atan2(d.x, d.z); w.P.anim(dt, true); return false;
  }
  stepTo(w, x, z, dt, sp = 200) { const d = new V(x - w.pos.x, 0, z - w.pos.z), l = d.length(); if (l < 4) return true; d.normalize(); w.pos.addScaledVector(d, Math.min(l, sp * dt)); w.P.g.rotation.y = Math.atan2(d.x, d.z); w.P.anim(dt, true); return false; }
  custAI(c, dt) {
    const Q = ['in', 'queue', 'kiosk', 'story'];
    if (c.state === 'in' || c.state === 'queue') { if (this.walk(c, dt, 240)) { c.P.anim(dt, false); c.P.g.rotation.y = Math.PI; if (c.qi === 0) { c.state = c.story ? 'story' : 'kiosk'; c.t = 2.2; if (c.reg) this.ui.float('💌', c.pos.clone().setY(220), 'heart'); } else c.state = 'queue'; } }
    else if (c.state === 'story') { c.P.anim(dt, false); c.P.g.rotation.y = Math.PI; }
    else if (c.state === 'kiosk') { c.P.anim(dt, false); c.P.g.rotation.y = Math.PI; c.t -= dt; if (c.t <= 0) this.order(c); }
    else if (c.state === 'toSeat' || c.state === 'back') { if (this.walk(c, dt, 220)) c.state = c.state === 'toSeat' ? 'sitting' : 'sitting2'; }
    else if (c.state === 'sitting' || c.state === 'sitting2') { if (this.stepTo(c, c.seat.s.x, c.seat.s.z, dt)) { c.P.sit = true; c.P.g.rotation.y = c.seat.s.ry; if (c.state === 'sitting') { c.state = 'seated'; } else { c.state = 'drink'; c.t = rnd(9, 14); } } }
    else if (c.state === 'seated') { c.P.anim(dt, false); c.w += dt;   /* 주문한 메뉴가 픽업대에 나오면 진동벨 → 가지러 감 */
      if (this.ready(c)) { for (const it of c.items) this.resv[it.k] = (this.resv[it.k] || 0) + it.n; c.reserved = true; this.ui.float('🔔', c.pos.clone().setY(230), 'heart'); sfx('blip', { vol: 0.5, rate: 1.4 }); c.P.sit = false; c.spot = this.freeSpot(); c.state = 'toPick'; c.route = this.path(c.seat.s.cell, c.spot); return; }
      if (c.w > 240) { this.ui.float('다음에 올게요', c.pos.clone().setY(260), 'say'); this.dropTicket(c); c.P.sit = false; c.seat.s.who = null; c.state = 'out'; c.route = this.path(c.seat.s.cell, DOOR); c.route && c.route.push([DOOR[0] + 2, DOOR[1]]); } }
    else if (c.state === 'toPick') { c.pt = (c.pt || 0) + dt; if (c.pt > 25 && c.route) { c.route = null; c.pos.set(cx(c.spot[0]), 0, cz(c.spot[1])); }   /* 길이 막혀도 25초면 도착 처리 */
      if (this.walk(c, dt, 240)) { c.P.g.rotation.y = Math.PI;   /* 자기 쟁반을 집어 듦 */
        const fromX = (this.trayX && this.trayX[c.menu]) ?? c.pos.x; for (const it of c.items) { ST().bar[it.k] -= it.n; this.resv[it.k] -= it.n; } this.refreshBar();
        const t = tray(MENU[c.menu].look, c.items); t.scale.setScalar(0.85); this.sc.add(t); const from = new V(fromX, 125, PICK.z); this.fx.push({ t: 0, d: 0.35, f: u => { t.position.lerpVectors(from, c.pos.clone().setY(80), u); t.position.y += Math.sin(u * Math.PI) * 40; if (u >= 1) { this.sc.remove(t); t.position.set(0, -6, 0); c.P.hand.add(t); } } });
        this.dropTicket(c); this.served(c); c.state = 'back'; c.route = this.path(c.spot, c.seat.s.cell); c.spot = null; } }
    else if (c.state === 'drink') { c.P.anim(dt, false); c.t -= dt; if (c.t <= 0) { c.P.sit = false; this.makeDirty(c.seat.o, c.seat.k, false, ST().ret >= RET_MAX); c.seat.s.who = null;   /* 테이블에는 닦을 자국 · 반납대가 꽉 차면 쟁반째 두고 감 */
        if (ST().ret >= RET_MAX) { c.P.hand.clear(); c.state = 'out'; c.route = this.path(c.seat.s.cell, DOOR); } else { c.state = 'toReturn'; c.route = this.path(c.seat.s.cell, RET_SPOT); } c.route && c.state === 'out' && c.route.push([DOOR[0] + 2, DOOR[1]]); } }
    else if (c.state === 'toReturn') { if (this.walk(c, dt, 240)) { c.P.hand.clear(); ST().ret = Math.min(RET_MAX, (ST().ret || 0) + 1); this.refreshRet(); sfx('drop', { vol: 0.3 }); c.state = 'out'; c.route = this.path(RET_SPOT, DOOR); c.route && c.route.push([DOOR[0] + 2, DOOR[1]]); } }
    else if (c.state === 'out') { if (this.walk(c, dt, 260)) c.gone = true; }
    if (Q.includes(c.state) === false && c.qc) { c.qc = null; this.reQ(); }
  }
  /* 키오스크 주문 → 주문표 (화면 아래 주문 레일) */
  order(c) { this.ticketNo = (this.ticketNo || 0) + 1; c.ticket = { no: this.ticketNo, menu: c.menu, items: c.items, c, at: now() }; this.tickets.push(c.ticket); c.w = 0; sfx('order', { vol: 0.4 }); this.ui.float(`주문 #${c.ticket.no}`, c.pos.clone().setY(240), 'pay');
    c.state = 'toSeat'; c.qc = null; c.route = this.path(this.cellOf(c), c.seat.s.cell); this.reQ(); this.ui.progress(); }
  dropTicket(c) { if (!c.ticket) return; this.tickets = this.tickets.filter(t => t !== c.ticket); c.ticket = null; }
  refreshRet() { this.retG.clear(); const n = ST().ret || 0; for (let i = 0; i < n; i++) { const t = tray('latte'); t.scale.setScalar(0.9); t.position.set(RET.x - 90 + (i % 4) * 60, RET.y + Math.floor(i / 4) * 14, RET.z); this.retG.add(t); } }
  wash(by) { const n = ST().ret || 0; if (!n) return false; ST().ret = 0; this.refreshRet(); const v = Math.round(n * 2 * storeMult()); S.coins += v; this.gainXp(n); this.ui.float(`설거지 +${v}`, new V(RET.x, 200, RET.z), 'pay'); sfx('drop', { vol: 0.5 }); this.sparkle(new V(RET.x, 140, RET.z)); save(); this.ui.progress(); return true; }
  makeDirty(o, k, silent, withTray = true) { const s = o.seats[k]; if (!s || s.dirty) return; const m = withTray ? tray('latte') : spill(); m.scale.setScalar(0.8); m.position.set(s.x + (o.f.x - s.x) * 0.45, FURN[o.f.id].cat === 'table' && o.f.id === 'floor' ? 50 : o.f.id === 'sofa' ? 40 : 80, s.z + (o.f.z - s.z) * 0.45); this.sc.add(m); s.dirty = m;
    if (!silent) { const d = (ST().dirty[o.f.uid] ||= []); if (!d.includes(k)) d.push(k); save(); } }
  clean(o, k, w) { const s = o.seats[k]; if (!s.dirty) return; this.sc.remove(s.dirty); s.dirty = null; const d = ST().dirty[o.f.uid] || []; ST().dirty[o.f.uid] = d.filter(x => x !== k); if (!ST().dirty[o.f.uid].length) delete ST().dirty[o.f.uid];
    const v = Math.round(3 * storeMult()); S.coins += v; this.gainXp(1); this.ui.float('반짝 +' + v, new V(s.x, 160, s.z), 'pay'); sfx('drop', { vol: 0.4 }); save(); }
  serveValue(c) { let v = c.items.reduce((a, it) => a + MENU[it.k].price * it.n, 0) * storeMult(); const happy = c.w <= MOOD.happy; c.mood = happy ? 2 : c.w <= MOOD.ok ? 1 : 0; let tip = happy ? Math.round(v * MOOD.tip) : 0; tip += Math.random() < this.score() / 1500 ? Math.round(v * 0.5) : 0; return { v: Math.round(v), tip }; }
  served(c) {
    const { v, tip } = this.serveValue(c); S.coins += v + tip; dayTick(); for (const it of c.items) { S.sold += it.n; S.soldBy[it.k] = (S.soldBy[it.k] || 0) + it.n; S.menuSold[it.k] = (S.menuSold[it.k] || 0) + it.n; }
    if (c.mood === 2) S.hearts += 1; this.gainXp(c.items.reduce((a, it) => a + MENU[it.k].xp * it.n, 0)); this.ui.float(`+${fmt(v + tip)}${tip ? ' 팁!' : ''}`, c.pos.clone().setY(200), 'pay'); this.ui.float(c.mood === 2 ? '♥' : c.mood ? '🙂' : '😌', c.pos.clone().setY(250), 'heart');
    sfx('coin', { vol: 0.5 }); c.tag && (c.tag.style.display = 'none');
    for (const o of S.orders) if (!o.done && c.items.some(it => it.k === o.menu) && (S.soldBy[o.menu] || 0) >= o.n) this.ui.orderReady && this.ui.orderReady(o);
    save(); this.ui.progress();
  }
  // ── 사장 · 동료: 잔 내어 주기 · 치우기
  workerAI(w, dt) {
    w.P.anim(dt, false);
    if (!w.task) {
      if (w.q.length) { const t = w.q.shift(); w.task = { kind: 'clean', ...t, step: 0 }; w.route = this.path(this.cellOf(w), t.o.seats[t.k].cell); }
      else if (w.auto) { const d = this.seats().find(x => x.s.dirty && !this.workers.some(o => o.task && o.task.kind === 'clean' && o.task.o === x.o && o.task.k === x.k)); if (d) { w.task = { kind: 'clean', o: d.o, k: d.k, step: 0 }; w.route = this.path(this.cellOf(w), d.s.cell); } }
      if (!w.task) { const h = w.home || HOME; if (this.cellOf(w).join() !== h.join()) { if (!w.route || !w.route.length) w.route = this.path(this.cellOf(w), h); this.walk(w, dt, w.sp * 0.6); } else w.P.g.rotation.y = Math.PI * 0.95; }
      return;
    }
    const T = w.task;
    if (T.kind === 'serve') { const c = T.c;
      if (c.gone || c.state !== 'order') { if (T.step === 1) { w.P.hand.clear(); ST().bar[c.menu] = (ST().bar[c.menu] || 0) + 1; this.refreshBar(); } else if (T.step === 0) { ST().bar[c.menu] = (ST().bar[c.menu] || 0) + 1; this.refreshBar(); } w.task = null; return; }
      if (T.step === 0) { if (this.walk(w, dt, w.sp)) { const m = cup(MENU[c.menu].look); w.P.hand.add(m); T.step = 1; w.route = this.path(BAR_PICK, c.seat.s.cell); sfx('pick', { vol: 0.3 }); } }
      else if (T.step === 1) { if (this.walk(w, dt, w.sp)) { w.P.hand.clear(); w.P.g.rotation.y = Math.atan2(c.pos.x - w.pos.x, c.pos.z - w.pos.z); this.served(c); w.task = null; } } }
    else if (T.kind === 'clean') { if (this.walk(w, dt, w.sp)) { this.clean(T.o, T.k, w); w.task = null; } }
  }
  cellOf(w) { return [Math.max(0, Math.min(N - 1, ci(w.pos.x))), Math.max(3, Math.min(N - 1, cj(w.pos.z)))]; }
  requestClean(o, k) { if (this.workers.some(w => w.task && w.task.kind === 'clean' && w.task.o === o && w.task.k === k)) return; const s = o.seats[k]; if (!s.dirty) return; const p = s.dirty.position.clone(); this.clean(o, k); this.sparkle(p); }   /* 누르면 바로 반짝 */
  hireBarista(silent) { const d = STAFF.barista, P = person({ body: d.body, apron: BRAND.redHex, hair: d.hair, pants: 0x3B2A20 }); P.g.position.set(-100, 0, LANE); this.sc.add(P.g); this.barista = { P, pos: P.g.position, t: 0 }; if (!silent) { S.staff.barista = 1; save(); this.ui.toast('하린: 내린 잔은 제가 바로 진열할게요!'); } }
  hireHall(silent) { const d = STAFF.hall, P = person({ body: d.body, apron: 0x6B4A30, hair: d.hair, pants: 0x3B3B42 }); P.g.position.set(cx(9), 0, cz(3)); this.sc.add(P.g); const w = { P, pos: P.g.position, task: null, q: [], sp: 280, auto: true, home: [9, 3] }; this.workers.push(w); if (!silent) { S.staff.hall = 1; save(); this.ui.toast('도윤: 서빙이랑 정리는 저한테 맡기세요!'); } }
  baristaAI(dt) { const b = this.barista; if (!b) return; b.t -= dt; b.P.anim(dt, false); if (b.t > 0) return; b.t = 1.2;
    if ((ST().ret || 0) >= 4) { this.wash(); b.pos.x = RET.x; b.pos.z = LANE; return; }
    for (const m of this.machines) { const p = this.progress(m); if (p && p.u >= 1) { if (this.collect(m)) { b.pos.x = m.x; b.pos.z = LANE; return; } } else if (!p) { const k = Object.keys(MENU).find(x => this.need(x) > 0 && !!MENU[x].oven === (m.kind === 'oven') && S.lv >= MENU[x].lv); if (k && !this.brew(m, k)) { b.pos.x = m.x; b.pos.z = LANE; return; } } } }
  // ── 경험치 · 레벨
  gainXp(n) { const before = S.lv; S.xp += n; S.lv = levelOf(S.xp); if (S.lv > before) { sfx('levelup'); this.ui.levelUp(S.lv); const need = machineCount('espresso') + machineCount('oven'); if (need !== this.machines.length) this.rebuildMachines(); } }
  rebuildMachines() { for (const m of this.machines) this.sc.remove(m.g); this.machines = []; const add = (kind, pos, i) => { const g = new THREE.Group(); g.position.set(pos[0], 107, pos[1]); this.sc.add(g); STATION[kind](g); this.machines.push({ kind, i, key: kind[0] + i, g, x: pos[0], z: pos[1] }); this.confetti(pos[0], 200, pos[1]); };
    for (let i = 0; i < machineCount('espresso'); i++) add('espresso', ESP_POS[i], i); for (let i = 0; i < machineCount('oven'); i++) add('oven', OVEN_POS[i], i); }
  score() { let s = 0; for (const f of ST().furn) s += FURN[f.id]?.score || 0; for (const id of Object.values(ST().wall)) s += id.startsWith('poem:') ? 20 : (FURN[id]?.score || 0); return s; }   /* 감성 지수 */
  // ── 매 프레임
  update(dt) {
    this.t += dt; const boost = now() < this.boostUntil ? 2 : 1;
    if (!this.deco) {
      this.spawnT -= dt * boost; if (this.spawnT <= 0) { this.spawnT = Math.max(3.5, 11 - this.score() / 25) * rnd(0.8, 1.2); this.spawn(); }
      this.regT -= dt; if (this.regT <= 0) { this.regT = rnd(70, 120); const R = this.nextRegular(); if (R) this.spawn(R); }
    }
    for (const c of this.cust) this.custAI(c, dt); this.cust = this.cust.filter(c => { if (c.gone) { this.sc.remove(c.P.g); c.tag && c.tag.remove(); if (c.seat.s.who === c) c.seat.s.who = null; return false; } return true; });
    for (const w of this.workers) this.workerAI(w, dt); this.baristaAI(dt); { const o = this.owner, d = o.tx - o.pos.x; if (Math.abs(d) > 4) { o.pos.x += Math.sign(d) * Math.min(Math.abs(d), 260 * dt); o.P.g.rotation.y = d > 0 ? Math.PI / 2 : -Math.PI / 2; o.P.anim(dt, true); } else { o.P.g.rotation.y = 0; o.P.anim(dt, false); } }
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.t += dt / f.d; f.f(Math.min(1, f.t)); if (f.t >= 1) this.fx.splice(i, 1); }
    for (const m of this.machines) { const p = this.progress(m); if (p && p.u < 1 && Math.random() < dt * 2) this.steam(m.x, 220, m.z); }
    const r = this.roastState(); if (r && r.u < 1 && Math.random() < dt * 1.5) this.steam(this.roaster.x, 330, this.roaster.z);
    const gd = this.ui.guide && this.ui.guide(); this.arrow.visible = !!gd; if (gd) { this.arrow.position.set(gd[0], gd[2] + Math.sin(this.t * 3) * 6, gd[1]); this.arrow.rotation.y += dt * 0.8;   /* 안내 화살표: 천천히 */ }
    this.ui.frame(this);
  }
  nextRegular() { const d = today(); return REGULARS.find(R => S.lv >= R.lv && (S.reg[R.id]?.day !== d) && (S.reg[R.id]?.ep || 0) < R.eps.length && !this.cust.some(c => c.reg === R)) || null; }
  storyDone(c, choice) {   /* 사연에서 고른 것: 메뉴면 그 메뉴를 주문 · 아니면 늘 마시는 카페라떼 */
    const R = c.reg, r = (S.reg[R.id] ||= { ep: 0, f: 0, day: '' }), ep = R.eps[r.ep]; r.f += choice[2]; r.ep++; r.day = today(); c.story = false; c.state = 'kiosk'; c.t = 0.8; c.w = 0;
    const first = choice[1] && this.menuPool().includes(choice[1]) ? choice[1] : this.menuPool().includes('latte') ? 'latte' : 'americano'; c.items = [{ k: first, n: 1 }]; c.menu = first;
    if (r.ep >= R.eps.length) { S.inv['poem:' + R.id] = 1; this.ui.toast(`${R.name}의 「시 한 줄」 액자를 받았어요 · 꾸미기에서 벽에 걸어요`); sfx('reward'); }
    this.gainXp(5); save(); this.ui.progress(); return ep;
  }
  sparkle(p) { for (let i = 0; i < 8; i++) { const m = box(6, 6, 6, 0xFFF4C2, p.x, p.y + 10, p.z, this.sc); const a = Math.random() * 6.28; this.fx.push({ t: 0, d: 0.6, f: u => { m.position.set(p.x + Math.cos(a) * 40 * u, p.y + 10 + 50 * u, p.z + Math.sin(a) * 40 * u); m.scale.setScalar(1 - u * 0.7); if (u >= 1) this.sc.remove(m); } }); } }
  steam(x, y, z) { const m = new THREE.Mesh(new THREE.SphereGeometry(9, 8, 6), new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.55 })); m.position.set(x + rnd(-15, 15), y, z + rnd(-15, 15)); this.sc.add(m); this.fx.push({ t: 0, d: 1.3, f: u => { m.position.y = y + u * 110; m.scale.setScalar(1 + u * 2); m.material.opacity = 0.55 * (1 - u); if (u >= 1) this.sc.remove(m); } }); }
  confetti(x, y, z) { for (let i = 0; i < 24; i++) { const m = box(10, 10, 3, [0xA92E2B, 0xE8C48A, 0x87A86E, 0xF4EEE4, 0xC88A5A][i % 5], x, y, z, this.sc); const v = new V(rnd(-1, 1), rnd(1.2, 2.2), rnd(-1, 1)).multiplyScalar(240), r0 = rnd(0, 6);
    this.fx.push({ t: 0, d: 1.1, f: u => { m.position.set(x + v.x * u, y + v.y * u - 400 * u * u, z + v.z * u); m.rotation.set(r0 + u * 8, r0 + u * 6, 0); if (u >= 1) this.sc.remove(m); } }); } }
  // ── 꾸미기 모드
  decoStart() { this.deco = { ghost: null }; this.ui.progress(); }
  decoEnd() { if (this.deco?.ghost) this.ghostCancel(); this.deco = null; this.rebuildGrid(); this.ui.decoBar && this.ui.decoBar(null); this.ui.progress(); }
  ghostNew(id, f) {   /* 새 가구 또는 옮길 가구를 반투명으로 */
    if (this.deco.ghost) this.ghostCancel(); const center = this.view; const d = FURN[id]; const g = new THREE.Group(); FURN_MODEL[id](g); this.sc.add(g);
    g.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.75; } });
    const ring = new THREE.Mesh(new THREE.BoxGeometry(100, 4, 100), new THREE.MeshBasicMaterial({ color: 0x4FBF6A, transparent: true, opacity: 0.45 })); this.sc.add(ring);
    const gh = { id, g, ring, f: f ? { ...f } : { uid: null, id, x: 0, z: 0, r: 0 }, moving: f || null };
    if (!f) { const p = this.snap(id, 0, center.x, Math.max(-200, center.z)); gh.f.x = p[0]; gh.f.z = p[1]; }
    this.deco.ghost = gh; this.ghostUpdate(); return gh;
  }
  snap(id, r, x, z) { const d = FURN[id], [w, h] = r % 2 ? [d.size[1], d.size[0]] : d.size; const sx = Math.round((x + ROOM.W / 2) / CELL - w / 2) * CELL - ROOM.W / 2 + w * CELL / 2, sz = Math.round((z + ROOM.D / 2) / CELL - h / 2) * CELL - ROOM.D / 2 + h * CELL / 2; return [sx, sz]; }
  ghostMove(x, z) { const gh = this.deco?.ghost; if (!gh) return; const p = this.snap(gh.id, gh.f.r, x, z); gh.f.x = p[0]; gh.f.z = p[1]; this.ghostUpdate(); }
  ghostRotate() { const gh = this.deco?.ghost; if (!gh) return; gh.f.r = (gh.f.r + 1) % 4; const p = this.snap(gh.id, gh.f.r, gh.f.x, gh.f.z); gh.f.x = p[0]; gh.f.z = p[1]; this.ghostUpdate(); sfx('tap', { vol: 0.4 }); }
  ghostUpdate() { const gh = this.deco.ghost, d = FURN[gh.id]; gh.g.position.set(gh.f.x, 0, gh.f.z); gh.g.rotation.y = -gh.f.r * Math.PI / 2; const [w, h] = gh.f.r % 2 ? [d.size[1], d.size[0]] : d.size; gh.ring.scale.set(w, 1, h); gh.ring.position.set(gh.f.x, 3, gh.f.z);
    gh.err = this.canPlace(gh.f, gh.moving?.uid); gh.ring.material.color.set(gh.err ? 0xE04A3A : 0x4FBF6A); this.ui.decoBar && this.ui.decoBar(gh); }
  ghostCancel() { const gh = this.deco?.ghost; if (!gh) return; this.sc.remove(gh.g); this.sc.remove(gh.ring); if (gh.moving) { this.addFurn(gh.moving); } this.deco.ghost = null; this.rebuildGrid(); this.ui.decoBar && this.ui.decoBar(null); }
  ghostConfirm(pay) {   /* pay(): 새 가구 값 치르기 · 실패면 false */
    const gh = this.deco?.ghost; if (!gh || gh.err) return gh ? gh.err : null; if (!gh.moving && pay && !pay()) return '돈이 모자라요';
    this.sc.remove(gh.g); this.sc.remove(gh.ring); const st = ST(); let f = gh.f; if (gh.moving) { const o = st.furn.find(x => x.uid === gh.moving.uid); Object.assign(o, { x: f.x, z: f.z, r: f.r }); f = o; } else { f.uid = ++st.uid; st.furn.push(f); }
    this.addFurn(f); this.rebuildGrid(); this.confetti(f.x, 120, f.z); sfx('unlock', { vol: 0.6 }); this.deco.ghost = null; save(); this.ui.decoBar && this.ui.decoBar(null); this.ui.progress(); return null;
  }
  pickFurn(o) {   /* 놓인 가구 들어 올리기 (손님이 앉아 있거나 치울 잔이 있으면 안 됨) */
    if (o.seats.some(s => s.who || s.dirty)) return '손님이 있거나 치울 잔이 있어요'; this.sc.remove(o.g); this.furn = this.furn.filter(x => x !== o); this.rebuildGrid(); this.ghostNew(o.f.id, o.f); return null;
  }
  storeFurn() { const gh = this.deco?.ghost; if (!gh) return; this.sc.remove(gh.g); this.sc.remove(gh.ring); if (gh.moving) { ST().furn = ST().furn.filter(x => x.uid !== gh.moving.uid); delete ST().dirty[gh.moving.uid]; S.inv[gh.id] = (S.inv[gh.id] || 0) + 1; } this.deco.ghost = null; this.rebuildGrid(); save(); this.ui.decoBar && this.ui.decoBar(null); this.ui.progress(); }
  // ── 누르기: 무엇을 눌렀는지
  pick(ray) {
    const hit = (g, r = 90, h = 200) => { const c = new V(g.x ?? g.position.x, h / 2, g.z ?? g.position.z); return ray.distanceToPoint(c) < r; };
    if (this.deco) { const gh = this.deco.ghost; if (gh && ray.distanceToPoint(new V(gh.f.x, 40, gh.f.z)) < 110) return { kind: 'ghost' };
      for (const w of this.walls) { const p = w.position; if (ray.distanceToPoint(new V(p.x, 180, p.z)) < 80) return { kind: 'wall', slot: w.userData.slot }; }
      let best = null, bd = 1e9; for (const o of this.furn) { const d = ray.distanceToPoint(new V(o.f.x, 40, o.f.z)); if (d < 100 && d < bd) { bd = d; best = o; } } return best ? { kind: 'furn', o: best } : { kind: 'floor' }; }
    for (const c of this.cust) if (c.state === 'story' && ray.distanceToPoint(c.pos.clone().setY(100)) < 80) return { kind: 'story', c };
    for (const m of this.machines) if (ray.distanceToPoint(new V(m.x, 160, m.z)) < 95) return { kind: 'machine', m };
    if (ray.distanceToPoint(new V(this.roaster.x, 120, this.roaster.z)) < 100) return { kind: 'roaster' };
    for (const o of this.furn) o.seats.forEach((s, k) => { if (s.dirty && ray.distanceToPoint(s.dirty.position) < 70) this._dk = { o, k }; }); if (this._dk) { const d = this._dk; this._dk = null; return { kind: 'dirty', ...d }; }
    for (const c of this.cust) if (c.state === 'seated' && ray.distanceToPoint(c.pos.clone().setY(100)) < 70) return { kind: 'cust', c };
    if (ray.distanceToPoint(new V(RET.x, 110, RET.z)) < 140) return { kind: 'return' };
    if (ray.distanceToPoint(new V(150, 110, PICK.z)) < 150) return { kind: 'bar' };
    return null;
  }
}
export { cx, cz, ci, cj, CELL, DOOR, BAR_PICK };
