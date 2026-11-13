// 카페 놀이: 머신으로 메뉴 내리기 → 픽업대 → 손님이 앉아 기다리다 가져감 → 치우기 · 원두 볶기 · 꾸미기 · 단골
//   0.2.0 개편 (EXPANSION_PLAN.md): 지점 = 구역 여러 개 · 8단계로 넓어짐(공사) · 층(1F · 2F · 3F · 루프탑) · 사장님이 매장을 걸어 다님(owner.js) · 지점 7곳
//   바닥은 100 단위 칸 — 가구가 놓인 칸 · 벽은 못 지나감 · 길(문 → 모든 자리 · 바 · 일하는 곳)이 막히는 배치는 안 됨
import * as THREE from 'three';
import { THEME_SETS, MENU, FURN, MACHINES, STAFF, STAFF_UP, OFFLINE, HAND_ROAST, STORES, MOOD, REGULARS, ROAST, BEAN_MAX, BRAND, PULL, POEMS, POEM_PER, LETTERS, CHEER, STORY_WAIT, OWNER, IDLE, VIP, APRONS } from './data.js?v=0.99.40';
import { S, ST, save, levelOf, dayTick, today, now, newStore } from './state.js?v=0.99.40';
import { M, box, cyl, person, cup, tray, spill, room, STATION, FURN_MODEL, poemFrame, todayFrame, coinPile, letter, ROOM } from './models.js?v=0.99.40';
import { sfx } from './audio.js?v=0.99.40';
import { BRANCHES, SPOT, FDX, gi, furnAt, floorOfX, FINISHED, hms } from './layout.js?v=0.99.40';
import { drawFloor, props, bake, areaAt, linked, areaBox, occ, orange } from './world.js?v=0.99.40';
import { track, salesAdd } from './oad.js?v=0.99.40';
import { OwnerMixin } from './owner.js?v=0.99.40';

const V = THREE.Vector3, CELL = 100, rnd = (a, b) => a + Math.random() * (b - a);
export const fmt = n => Math.round(n).toLocaleString('en-US');
const cx = i => -ROOM.W / 2 + CELL / 2 + i * CELL, cz = j => -ROOM.D / 2 + CELL / 2 + j * CELL;
const ci = x => Math.floor((x + ROOM.W / 2) / CELL), cj = z => Math.floor((z + ROOM.D / 2) / CELL);
const K = (i, j) => i + ',' + j;
const DOOR = [13, 8], BAR_PICK = [8, 3], HOME = [6, 3], BAR_EXIT = [13, 3];   /* 문 칸 · 픽업대 앞 칸 · 홀 동료 자리 · 바 나가는 칸 */
const FIXED = new Set(['1,4', '12,6']);   /* 나무 기둥 · 키오스크 */
const NOPLACE = new Set(['13,8', '13,9', '12,8', '12,7', '11,7', '10,7', '10,8', '4,3', '3,3', '13,3', '12,3', '13,4']);   /* 문 앞 · 키오스크 줄 · 반납대 앞 · 바 나가는 길 */
export const WALL_SLOTS = [[-683, -30, Math.PI / 2], [-683, 110, Math.PI / 2], [-683, 560, Math.PI / 2], [-250, -683, 0], [600, -683, 0]];   /* 0.2.0: 왼쪽 벽 문(로스팅실 · 베이커리)을 피해 조금 옮김 */
const ESP_POS = [[-170, -630], [-40, -630], [90, -630], [-295, -630], [-420, -630], [205, -630]], OVEN_BAR = [[-420, -630], [-295, -630]], ROASTER = [-590, -540];   /* 에스프레소 4 · 5 · 6 번은 오븐이 베이커리로 이사한 뒤 그 자리 */
const PICK = { x0: 80, x1: 310, z: -455, y: 117 }, LANE = -543, LANE_X = [-480, 640];
const STACK = { x: -4, z: -462, y: 117 };   /* 다 내린 잔이 탑으로 쌓이는 곳 (픽업대 왼쪽 끝) → 쟁반을 누르면(끌어도) 픽업대로 */
const BIN = { x: 640, z: -560 };   /* 바 원두통 (바 오른쪽 끝 · 사장님이 원두 자루를 붓는 곳) */
const ROAST_BOY = [-505, -455];
const TODAY = [-683, -450, Math.PI / 2];   /* 오늘의 시 액자 (왼쪽 벽 안쪽 · 꾸미기 벽 자리와 따로) */
export const poemLen = line => [...line.replace(/ /g, '')].length;
const KQ = [[12, 7], [11, 7], [10, 7], [10, 8]];   /* 키오스크 줄 (입구 옆) */
const RET = { x: -190, z: -455, y: 98 }, RET_SPOT = [4, 3], RET_MAX = 8;   /* 반납대 */
const KIOSK = [560, -20];
export const machineCount = kind => MACHINES[kind].filter(l => S.lv >= l).length;
export const storeMult = () => STORES[S.si].mult * vipK() * (1 + STAGE_K * Math.max(0, (S.stores[S.si]?.open.length || 1) - 1));   /* 단계마다 찻값 +STAGE_K (매장이 자랄수록 손님 지갑도) */
export const STAGE_K = 0.06, STAGE_XP = 250;
export const priceMult = () => STORES[S.si].mult;   /* 값(가구 · 원두) 배수 — VIP 와 상관없음 */
export const vipOn = () => (S.vipUntil || 0) > Date.now();
export const vipK = () => vipOn() ? VIP.mult : 1;
export const isJeong = m => m.kind === 'espresso' && m.i === 0;   /* 1번 에스프레소 = 사장님의 정성 머신 (하린은 안 씀) */
const josaWa = w => { const c = String(w).charCodeAt(String(w).length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 ? '과' : '와'; };
const markMachine = m => { if (isJeong(m)) cyl(54, 58, 3, 0xE8C46A, 0, 1, 0, m.g, 28); };
/* 칸 중심 (층 i 포함) */
export const cellPos = (i, j) => new V(cx(i), 0, cz(j));

export class Game {
  constructor(sc, cam, ui) { this.sc = sc; this.cam = cam; this.ui = ui; this.t = 0; this.fx = []; this.cust = []; this.cars = []; this.view = { x: 0, z: 60, zoom: 1, f: 0 }; this.FG = []; }
  get B() { return BRANCHES[S.si]; }
  /* 열린 구역 id · 단계 */
  stageOpen(si) { return ST().open.includes(si); }
  openIds() { const s = new Set(); for (const st of this.B.stages) if (this.stageOpen(st.i)) for (const id of st.ids) s.add(id); return s; }
  areaOpen(id) { return this.openIds().has(id); }
  hasKind(kind) { return this.B.areas.some(a => (kind === 'far' ? a.far : a.kind === kind) && this.areaOpen(a.id)); }
  area(id) { return this.B.areas.find(a => a.id === id); }
  /* 지점 진행 = 열린 칸 / 전체 칸 */
  progressFrac(si = S.si) { const B = BRANCHES[si], st = S.stores[si]; if (!st) return 0; return B.stages.filter(s => st.open.includes(s.i)).reduce((n, s) => n + s.cells, 0) / B.total; }
  // ── 매장 짓기
  build() {
    const sc = this.sc; sc.clear(); for (const c of this.cust) { c.tag && c.tag.remove(); c.cloud && c.cloud.remove(); } this.cust = []; this.cars = []; this.ui.clearTags && this.ui.clearTags(); this.fx = [];
    const I = this.B.interior; sc.background = new THREE.Color(I.sky);
    sc.add(new THREE.HemisphereLight(...I.hemi)); const sun = new THREE.DirectionalLight(I.sun, 1.7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -1300, right: 1300, top: 1300, bottom: -1300, near: 10, far: 5000 }); sun.shadow.bias = -0.0006; sun.shadow.radius = 4; sc.add(sun); sc.add(sun.target); this.sun = sun;
    this.buildWorld();
    this.barG = new THREE.Group(); sc.add(this.barG); this.tickets = []; this.resv = {}; ST().bar = {}; this.gold = {}; this.refreshBar();   /* 주문 없이 남은 진열은 비움 (주문 들어와야 만듦) · gold = 픽업대의 정성 한 잔 수 */
    this.stackG = new THREE.Group(); sc.add(this.stackG); this.stack = []; this.combo = 0; this.refreshStack();
    this.todayG = new THREE.Group(); this.todayG.position.set(TODAY[0], 0, TODAY[1]); this.todayG.rotation.y = TODAY[2]; sc.add(this.todayG); this.refreshToday();
    this.retG = new THREE.Group(); sc.add(this.retG); ST().ret = ST().ret || 0; this.refreshRet();
    this.furn = []; this.ensureSeats(); for (const f of ST().furn) this.addFurn(f); this.walls = []; this.refreshWalls(); this.rebuildGrid();
    for (const o of this.furn) o.seats.forEach((s, k) => { const c = ST().coinsAt[o.f.uid + '_' + k]; if (c) { if (!s.dirty) this.makeDirty(o, k, true, false); this.leaveCoins(o, k, c, true); } });   /* 테이블에 남은 찻값 다시 놓기 */
    this.workers = []; this.barista = null; this.roastBoy = null;
    this.ownerInit();
    for (const k of ['barista', 'hall', 'roaster', 'server', 'baker', 'takeout']) if (S.staff[k]) this.hireStaff(k, true);   /* 매장을 옮기거나 다시 지을 때 예전 동료 참조를 비우고 다시 */
    this.spawnT = 2.5; this.regT = 25; this.carT = 20;
    this.arrow = new THREE.Group(); const cone = new THREE.Mesh(new THREE.ConeGeometry(22, 44, 4), M(BRAND.redHex)); cone.rotation.x = Math.PI; this.arrow.add(cone); sc.add(this.arrow); this.arrow.visible = false;
    this.deco = null; this.collectOcc(); this.ui.progress(); this.ui.setFloor && this.ui.setFloor(this.view.f || 0, true);
  }
  /* 움직이지 않는 매장(층마다) + 설비 — 구역이 열리면 이것만 다시 (손님 · 동료는 그대로) */
  buildWorld() {
    for (const G of this.FG) this.sc.remove(G); this.FG = [];
    const set = S.theme[S.si] && THEME_SETS.find(t => t.id === S.theme[S.si]), B = set ? { ...this.B, interior: { ...this.B.interior, id: this.B.interior.id + set.id, fa: set.floor[0], fb: set.floor[1], line: set.floor[1], wallC: set.wall, wallB: set.wall, trim: set.trim, strip: null } } : this.B, I = B.interior, open = this.openIds(), next = new Set(), building = new Set();   /* 계절 세트 = 바닥 · 벽 색만 (능력치 0) */
    for (const st of B.stages) { if (this.stageOpen(st.i)) continue; const b = ST().build[st.i]; for (const id of st.ids) (b ? building : this.nextStage() === st ? next : null)?.add(id); }
    for (let f = 0; f < 4; f++) { if (!B.areas.some(a => a.floor === f && (open.has(a.id) || next.has(a.id) || building.has(a.id)))) { this.FG.push(null); continue; }
      const G = new THREE.Group(); G.userData.floor = f; this.sc.add(G); this.FG.push(G);
      if (f === 0) { room(G, { shell: false, callig: I.callig }); props(G, B, open); }
      drawFloor(G, B, f, open, next, building); bake(G); }
    /* 설비 */
    if (this.roasterG) for (const r of this.roasterG) this.sc.remove(r); this.roasterG = [];
    const roastOpen = open.has('roast'), nR = roastOpen ? machineCount('roaster') : 1;
    for (let k = 0; k < nR; k++) { const p = roastOpen ? this.spot(SPOT.roasters[k]) : ROASTER, g = new THREE.Group(); g.position.set(p[0], 0, p[1]); if (roastOpen) g.scale.setScalar(0.78); this.sc.add(g); STATION.roaster(g); this.roasterG.push(g); }
    { const p = roastOpen ? this.spot(SPOT.roasters[0]) : ROASTER; this.roaster = { g: this.roasterG[0], x: p[0], z: p[1], kind: 'roaster', room: roastOpen }; }
    if (this.machines) for (const m of this.machines) this.sc.remove(m.g); this.machines = []; this.placeMachines(false);
    if (this.statG) this.sc.remove(this.statG); this.statG = new THREE.Group(); this.sc.add(this.statG);
    { const k = new THREE.Group(); k.position.set(KIOSK[0], 0, KIOSK[1]); this.statG.add(k); STATION.kiosk(k); }
    { const b = new THREE.Group(); b.position.set(BIN.x, 0, BIN.z); this.statG.add(b); cyl(30, 26, 70, 0x6B4A30, 0, 0, 0, b, 12); cyl(32, 32, 6, 0x3B2A20, 0, 70, 0, b, 12); this.binG = b; }
    this.bagG = null; if (roastOpen) { const p = this.spot(SPOT.bags), g = new THREE.Group(); g.position.set(p[0], 0, p[1]); this.statG.add(g); box(190, 10, 80, 0x7A5234, 0, 40, 0, g); for (const x of [-90, 90]) box(10, 40, 80, 0x5A3A22, x, 0, 0, g); this.bagG = new THREE.Group(); g.add(this.bagG); this.bagAt = p; this.refreshBags(); }
    this.caseG = null; if (open.has('bakery')) { const p = this.spot(SPOT.showcase), g = new THREE.Group(); g.position.set(p[0], 0, p[1]); this.statG.add(g); box(90, 80, 80, 0xEFE6D8, 0, 0, 0, g); box(96, 50, 84, 0xDCEAEA, 0, 80, 0, g).material = new THREE.MeshToonMaterial({ color: 0xDCEAEA, transparent: true, opacity: 0.5 }); this.caseG = new THREE.Group(); g.add(this.caseG); this.caseAt = p; this.refreshCase(); }
    this.windowAt = null; if (open.has('annex')) { const p = this.spot(SPOT.window), g = new THREE.Group(); g.position.set(p[0], 0, p[1]); this.statG.add(g); box(80, 100, 180, 0xEFE6D8, 0, 0, 0, g); box(90, 10, 190, BRAND.redHex, 0, 100, 0, g); box(10, 120, 60, 0xDCEAEA, 40, 110, 0, g); this.windowAt = p;
      if (this.B.feat.drive) { const lane = new THREE.Group(); lane.position.set(p[0] + 220, 0, p[1]); this.statG.add(lane); const r = box(160, 4, 1300, 0x8A8680, 0, -2, 0, lane); r.castShadow = false; for (let z = -600; z < 650; z += 120) box(8, 5, 50, 0xF2ECE2, 0, 0, z, lane); } }
    this.officeAt = null; if (open.has('boss')) { const s = this.spot(SPOT.safe, 2), d = this.spot(SPOT.desk, 2), g = new THREE.Group(); this.statG.add(g); box(80, 110, 70, 0x3B3B42, s[0], 0, s[1], g); box(14, 14, 4, 0xC8A04A, s[0], 60, s[1] + 37, g); box(160, 75, 80, C_DESK, d[0], 0, d[1], g); box(170, 8, 90, 0x7A5234, d[0], 75, d[1], g); this.officeAt = { safe: s, desk: d }; }
    if (open.has('crew')) { const w = this.spot(SPOT.wardrobe, 2), g = new THREE.Group(); this.statG.add(g); box(90, 200, 60, 0x7A5234, w[0], 0, w[1], g); for (let k = 0; k < 3; k++) box(18, 70, 30, [BRAND.redHex, 0x3B3028, 0xC0504A][k], w[0] - 25 + k * 25, 110, w[1] + 20, g); }
    if (open.has('beanstore')) { const p = this.spot(SPOT.gift), g = new THREE.Group(); this.statG.add(g); for (let k = 0; k < 4; k++) { const s = cyl(26, 30, 50, 0xC8B08A, p[0] - 60 + k * 40, k % 2 ? 40 : 0, p[1], g, 10); s.scale.set(1, 1, 0.8); } box(120, 70, 70, 0x8A6A4A, p[0] + 140, 0, p[1], g); box(124, 6, 74, 0xC8A04A, p[0] + 140, 70, p[1], g); this.giftAt = [p[0] + 140, p[1]]; }
    /* 화분 (돌보기) */ this.pots = []; for (const [aid, list] of Object.entries(SPOT.pots)) { const a = this.area(aid); if (!a || !open.has(aid)) continue; for (const [i, j] of list) { const p = [cx(gi(a.floor, i)), cz(j)], g = new THREE.Group(); g.position.set(p[0], 0, p[1]); this.statG.add(g); { const pk = { sea: 'pine', jeju: 'orange', hanok: 'fern', roastery: 'pine', silla: 'stone' }[this.B.interior.props] || 'plant'; if (pk === 'orange') orange(g, 0, 0, 0.55); else FURN_MODEL[pk](g); } this.pots.push({ id: aid + i + '_' + j, x: p[0], z: p[1], g, cell: [gi(a.floor, i), j] }); } }
    this.applySun();
  }
  /* 층 안 칸 [i, j] (소수 가능) → 세계 [x, z] (그 구역 층 · 기본 1층) */
  spot([i, j], f = 0) { return [-700 + (gi(f, i) + 0.5) * CELL, -700 + (j + 0.5) * CELL]; }
  applySun() { const f = this.view.f || 0, ox = f * FDX + (this.view.x - f * FDX); if (!this.sun) return; this.sun.position.set(ox + 700, 1400, (this.view.z || 0) + 900); this.sun.target.position.set(ox, 0, this.view.z || 0); this.sun.target.updateMatrixWorld();
    this.sc.traverse(o => { if (o.isPointLight && o.userData.floorLight != null) o.visible = o.userData.floorLight === f; }); }
  placeMachines(fx) { const bak = this.areaOpen('bakery'), nE = Math.min(machineCount('espresso'), bak ? 6 : 3), nO = Math.min(machineCount('oven'), bak ? 3 : 2);
    const add = (kind, pos, i) => { const g = new THREE.Group(); g.position.set(pos[0], kind === 'oven' && bak ? 0 : 107, pos[1]); this.sc.add(g); STATION[kind](g); if (kind === 'oven' && bak) box(110, 107, 80, 0xEFE6D8, 0, -107, 0, g); const m = { kind, i, key: kind[0] + i, g, x: pos[0], z: pos[1], bak: kind === 'oven' && bak }; markMachine(m); this.machines.push(m); if (fx) this.confetti(pos[0], 200, pos[1]); };
    for (let i = 0; i < nE; i++) add('espresso', ESP_POS[i], i); for (let i = 0; i < nO; i++) add('oven', bak ? this.spot(SPOT.ovens[i]) : OVEN_BAR[i], i); }
  rebuildMachines() { for (const m of this.machines) this.sc.remove(m.g); this.machines = []; this.placeMachines(true); }
  /* 구역에 함께 놓이는 자리 (단계를 열 때 한 번) */
  ensureSeats() { const st = ST(); st.zs ||= {}; for (const a of this.B.areas) { if (!this.areaOpen(a.id) || st.zs[a.id] || !a.seats.length) continue; st.zs[a.id] = 1;
    for (const [id, i, j, r = 0] of a.seats) { const p = furnAt(a.floor, i, j, FURN[id].size, r); st.furn.push({ uid: ++st.uid, id, x: p.x, z: p.z, r, zone: a.id }); } } }
  // ── 가구
  footprint(f) { const d = FURN[f.id], [w, h] = f.r % 2 ? [d.size[1], d.size[0]] : d.size; const i0 = Math.round((f.x + ROOM.W / 2) / CELL - w / 2), j0 = Math.round((f.z + ROOM.D / 2) / CELL - h / 2); const out = []; for (let i = i0; i < i0 + w; i++) for (let j = j0; j < j0 + h; j++) out.push([i, j]); return out; }
  addFurn(f) {
    const d = FURN[f.id]; if (!d || d.wall) return; const g = new THREE.Group(); g.position.set(f.x, 0, f.z); g.rotation.y = -f.r * Math.PI / 2; this.sc.add(g); FURN_MODEL[f.id](g); g.traverse(o => { if (o.userData.occ && this.occ) this._occDirty = true; });
    const seats = (d.seats || []).map(([x, z, ry]) => { const v = new V(x, 0, z).applyAxisAngle(new V(0, 1, 0), -f.r * Math.PI / 2); return { x: f.x + v.x, z: f.z + v.z, ry: ry - f.r * Math.PI / 2, who: null, dirty: null }; });
    const o = { f, g, seats }; this.furn.push(o); const dirty = ST().dirty[f.uid]; if (dirty) for (const k of dirty) if (seats[k]) this.makeDirty(o, k, true); return o;
  }
  refreshWalls() { for (const w of this.walls) this.sc.remove(w); this.walls = []; for (let k = 0; k < WALL_SLOTS.length; k++) { const id = ST().wall[k]; if (!id) continue; const [x, z, ry] = WALL_SLOTS[k]; const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; this.sc.add(g);
    if (id.startsWith('poem:')) { const R = REGULARS.find(r => r.id === id.slice(5)); poemFrame(g, R ? R.poem : '마음이/쉬어가는/곳'); } else FURN_MODEL[id](g); g.userData.slot = k; this.walls.push(g); } }
  // ── 길 (칸 · 구역 · 벽 · 문 · 계단)
  /* 걸을 수 있는 칸 = 열린 구역 칸 − 구역 고정 칸 − 가게 바 안(0~2줄) · 가구는 block */
  rebuildGrid() { const B = this.B, open = this.openIds(); this.cells = new Map(); this.links = new Map(); this.fixed = new Set(FIXED); this.service = [];
    for (const a of B.areas) { if (!open.has(a.id)) continue; for (let i = a.rect[0]; i < a.rect[2]; i++) for (let j = a.rect[1]; j < a.rect[3]; j++) { if (a.kind === 'shop' && j < 3) continue; this.cells.set(K(gi(a.floor, i), j), a); }
      for (const [i, j] of a.fixed) this.fixed.add(K(gi(a.floor, i), j)); }
    for (const s of B.stairs) if (open.has(s.need)) { const a = K(gi(s.a[0], s.a[1]), s.a[2]), b = K(gi(s.b[0], s.b[1]), s.b[2]); this.links.set(a, [gi(s.b[0], s.b[1]), s.b[2]]); this.links.set(b, [gi(s.a[0], s.a[1]), s.a[2]]); this.service.push(a.split(',').map(Number), b.split(',').map(Number)); }
    this.noPlace = new Set(NOPLACE); for (const k of this.links.keys()) this.noPlace.add(k);
    for (const a of B.areas) if (open.has(a.id)) for (const d of a.doors || []) for (const [i, j] of [[d[0], d[1]], [d[2], d[3]]]) { const k = K(gi(a.floor, i), j); this.noPlace.add(k); }
    this.block = new Set(this.fixed); for (const o of this.furn) for (const [i, j] of this.footprint(o.f)) this.block.add(K(i, j));
    for (const p of this.servicePts()) { const c = [ci(p[0]), cj(p[1])], a = this.accessNear(c); if (a) { this.service.push(a); this.noPlace.add(K(...a)); } } for (const o of this.furn) for (const s of o.seats) s.cell = this.accessCell(s, o);
    /* 동선 (마루미 0.3.1 원칙): 다른 일하는 칸 앞(픽업대 줄 · 반납대 · 바 출구 · 설비 칸)은 목적지가 아니면 피해서 감 — tools/flow_check.mjs */
    this.avoid = new Set(['6,3', '7,3', '8,3', '9,3', '10,3', '3,3', '4,3', '13,3', '12,3', ...this.service.map(c => K(...c))]); }
  /* 일하는 곳 (사장님 · 동료가 가야 하는 곳) — 가구가 길을 막지 않게 */
  servicePts() { const out = []; if (this.bagAt) out.push(this.bagAt); if (this.caseAt) out.push(this.caseAt); if (this.windowAt) out.push(this.spot(SPOT.hand)); if (this.officeAt) out.push(this.officeAt.safe, this.officeAt.desk); if (this.giftAt) out.push(this.giftAt);
    for (const m of this.machines || []) if (m.bak) out.push([m.x, m.z]); if (this.roaster?.room) out.push([this.roaster.x, this.roaster.z]); for (const p of this.pots || []) out.push([p.x, p.z]); return out; }
  accessNear([i, j]) { for (const pass of [0, 1]) for (const [di, dj] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 0], [0, 2], [2, 0], [-2, 0]]) { const k = K(i + di, j + dj); if (this.cells.has(k) && !this.fixed.has(k) && (pass || !(this.block && this.block.has(k)))) return [i + di, j + dj]; } return null; }   /* 가구가 없는 칸 먼저 */
  walkable(i, j, block = this.block) { const k = K(i, j); return this.cells.has(k) && !block.has(k); }
  /* 두 칸 사이를 지날 수 있나 (벽 · 문) */
  pass(i, j, ni, nj) { const a = this.cells.get(K(i, j)), b = this.cells.get(K(ni, nj)); if (!a || !b) return false; if (a === b) return true; const fa = floorOfX(cx(i)); const li = i - fa * 60, lni = ni - fa * 60; return linked(this.B, a, b, li, j, lni, nj); }
  accessCell(s, o, block = this.block) { const si = ci(s.x), sj = cj(s.z); let best = null, bd = 1e9; for (const [di, dj] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const i = si + di, j = sj + dj; if (!this.walkable(i, j, block)) continue; const a = this.cells.get(K(si, sj)), b = this.cells.get(K(i, j)); if (a && b && a !== b && !this.pass(si, sj, i, j)) continue; const d = Math.hypot(cx(i) - s.x, cz(j) - s.z); if (d < bd) { bd = d; best = [i, j]; } } return best; }
  /* 이웃 칸들 (8방향 · 대각선은 양옆이 비어야 · 계단은 다른 층으로) */
  nbrs(i, j, block = this.block) { const out = []; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const ni = i + di, nj = j + dj; if (!this.walkable(ni, nj, block) || !this.pass(i, j, ni, nj)) continue;
      if (di && dj && (!this.walkable(i + di, j, block) || !this.walkable(i, j + dj, block) || !this.pass(i, j, i + di, j) || !this.pass(i, j, i, j + dj) || !this.pass(i + di, j, ni, nj) || !this.pass(i, j + dj, ni, nj))) continue; out.push([ni, nj, di && dj ? 1.414 : 1]); }
    const l = this.links.get(K(i, j)); if (l && this.walkable(l[0], l[1], block)) out.push([l[0], l[1], 3]); return out; }
  /* 길: 칸 위 A* */
  path(a, b) {
    if (!a || !b) return null; const kk = (i, j) => (i + 500) * 4096 + (j + 500), open = [[a[0], a[1], 0, 0]], from = new Map(), gs = new Map([[kk(...a), 0]]), seen = new Set(); let n = 0;
    while (open.length && n++ < 6000) { let bi = 0; for (let q = 1; q < open.length; q++) if (open[q][3] < open[bi][3]) bi = q; const [i, j, g] = open.splice(bi, 1)[0]; const k = kk(i, j); if (seen.has(k)) continue; seen.add(k);
      if (i === b[0] && j === b[1]) { const out = [[i, j]]; let c = k; while (from.has(c)) { c = from.get(c); out.unshift([Math.floor(c / 4096) - 500, c % 4096 - 500]); } return out; }
      for (const [ni, nj, w] of this.nbrs(i, j)) { const ng = g + w + (this.avoid && this.avoid.has(K(ni, nj)) && !(ni === b[0] && nj === b[1]) ? 4 : 0), nk = kk(ni, nj); if (ng < (gs.get(nk) ?? 1e9)) { gs.set(nk, ng); from.set(nk, k); const fh = Math.abs(floorOfX(cx(ni)) - floorOfX(cx(b[0]))) ? 0 : Math.hypot(b[0] - ni, b[1] - nj); open.push([ni, nj, ng, ng + fh]); } } }
    return null;
  }
  /* 배치 검사: 범위 · 겹침 · 문에서 모든 자리 · 바 · 일하는 곳까지 갈 수 있는지 */
  canPlace(f, ignoreUid) {
    const cells = this.footprint(f), fl = floorOfX(f.x); for (const [i, j] of cells) { const a = this.cells.get(K(i, j)); if (!a || this.fixed.has(K(i, j)) || this.noPlace.has(K(i, j)) || (a.kind === 'shop' && j < 4)) return '여기에는 놓을 수 없어요'; if (floorOfX(cx(i)) !== fl) return '여기에는 놓을 수 없어요'; }
    if (!FURN[f.id].outdoor && cells.some(([i, j]) => this.cells.get(K(i, j)).outdoor) && FURN[f.id].cat === 'table' && f.id !== 'table2' && f.id !== 'window') return '바깥에는 놓기 어려워요';
    const block = new Set(this.fixed); for (const o of this.furn) if (o.f.uid !== ignoreUid) for (const [i, j] of this.footprint(o.f)) block.add(K(i, j));
    for (const [i, j] of cells) if (block.has(K(i, j))) return '다른 가구와 겹쳐요'; for (const [i, j] of cells) block.add(K(i, j));
    const seen = new Set([K(...DOOR)]), q = [DOOR]; while (q.length) { const [i, j] = q.shift(); for (const [ni, nj] of this.nbrs(i, j, block)) { const k = K(ni, nj); if (seen.has(k)) continue; seen.add(k); q.push([ni, nj]); } }
    if (!seen.has(K(...BAR_PICK)) || !seen.has(K(...BAR_EXIT))) return '바로 가는 길이 막혀요';
    for (const c of this.service) if (!block.has(K(...c)) && !seen.has(K(...c))) return '일하는 곳으로 가는 길이 막혀요';
    const d = FURN[f.id]; const tmp = { f, seats: [] }; const all = [...this.furn.filter(o => o.f.uid !== ignoreUid), tmp];
    for (const o of all) { const seats = o === tmp ? (d.seats || []).map(([x, z]) => { const v = new V(x, 0, z).applyAxisAngle(new V(0, 1, 0), -f.r * Math.PI / 2); return { x: f.x + v.x, z: f.z + v.z }; }) : o.seats;
      for (const s of seats) { const a = this.accessCell(s, o, block); if (!a || !seen.has(K(...a))) return '앉을 자리로 가는 길이 막혀요'; } }
    return null;
  }
  // ── 바 진열 (잔 모양으로 보여 줌)
  refreshBar() { this.barG.clear(); this.trayX = {}; let x = PICK.x0; const ks = Object.entries(ST().bar).filter(([, n]) => n > 0), step = ks.length > 1 ? Math.min(78, (PICK.x1 - PICK.x0) / (ks.length - 1)) : 78, sz = 1.25 * Math.max(0.7, Math.min(1, step / 78));
    for (const [k, n] of ks) { this.trayX[k] = x;
    for (let i = 0; i < Math.min(n, 2); i++) { const m = tray(MENU[k].look); m.scale.setScalar(sz); m.position.set(x, PICK.y, PICK.z + 22 - i * 44); m.rotation.y = i ? 0.06 : -0.05; this.barG.add(m); if ((this.gold[k] || 0) > i) cyl(30 * sz / 1.25, 30 * sz / 1.25, 1.5, 0xF3C46A, x, PICK.y - 1, PICK.z + 22 - i * 44, this.barG, 18); } x += step; } }
  refreshStack() { this.stackG.clear(); const cups = this.stack.flatMap(e => Array(e.n).fill(e)); if (!cups.length) return; box(84, 5, 60, 0xC8A27A, STACK.x, STACK.y, STACK.z, this.stackG); box(88, 2, 64, 0xA67A50, STACK.x, STACK.y, STACK.z, this.stackG);
    cups.slice(0, 12).forEach((e, i) => { const L = Math.floor(i / 3), j = i % 3, c = cup(MENU[e.k].look); c.scale.setScalar(1.45); c.position.set(STACK.x - 24 + j * 24, STACK.y + 5 + L * 52, STACK.z + (j % 2) * 12 - 6); this.stackG.add(c); if (e.gold) cyl(15, 15, 1.5, 0xF3C46A, c.position.x, c.position.y - 1, c.position.z, this.stackG, 14); if (j === 2 && i < cups.length - 1) box(78, 4, 54, 0xC8A27A, STACK.x, STACK.y + 5 + L * 52 + 46, STACK.z, this.stackG); }); }
  stackTotal() { return this.stack.reduce((a, e) => a + e.n, 0); }
  addStack(k, n, gold, from) { const e = this.stack.find(x => x.k === k && x.gold === gold); if (e) e.n += n; else this.stack.push({ k, n, gold }); if (this.owner.mode === 'bar') this.owner.tx = STACK.x + 30;
    if (from) { const c = cup(MENU[k].look), a = from.clone(), b = new V(STACK.x, STACK.y + 40, STACK.z); this.sc.add(c); this.fly(c, a, b, 0.4, 50, () => this.refreshStack()); } else this.refreshStack(); this.ui.progress(); }
  /* 날아가는 물건: 3초 안에 꼭 도착 (마루미 0.3.1 · tools/fly_check.mjs) · 지점을 바꾸면 끝냄 */
  fly(obj, a, b, d, h, done) { d = Math.min(d, 3); obj.userData.flyObj = true; this.fx.push({ t: 0, d, fly: obj, born: this.t, f: u => { obj.position.lerpVectors(a, b, u); obj.position.y += Math.sin(u * Math.PI) * h; if (u >= 1) { obj.parent && obj.parent.remove(obj); done && done(); } } }); }
  /* 따로 떠 있는 물건 (날기가 끝났는데 장면에 남은 것) — tools/fly_check.mjs */
  orphans() { return this.sc.children.filter(o => o.userData.flyObj && !this.fx.some(f => f.fly === o)); }
  deliverStack(by) { if (!this.stack.length) return 0; const st = ST(); let total = 0; for (const e of this.stack) { st.bar[e.k] = (st.bar[e.k] || 0) + e.n; if (e.gold) this.gold[e.k] = (this.gold[e.k] || 0) + e.n; total += e.n; } const looks = this.stack.map(e => e.k); this.stack = []; this.refreshStack();
    const t = tray(MENU[looks[0]].look, looks.slice(0, 3).map(k => ({ k, n: 1 }))), a = new V(STACK.x, STACK.y + 20, STACK.z), b = new V(PICK.x0 + 60, PICK.y + 6, PICK.z); t.scale.setScalar(1.2); this.sc.add(t);
    this.fly(t, a, b, 0.35, 36, () => { this.refreshBar(); this.sparkle(b); });
    sfx('drop', { vol: 0.55, rate: 1.1 }); setTimeout(() => sfx('pick', { vol: 0.45, rate: 0.8 }), 160); if (this.owner.mode === 'bar') this.owner.tx = PICK.x0 + 40; save(); this.ui.progress(); this.ui.delivered && this.ui.delivered(by); return total; }
  barTotal() { return Object.values(ST().bar).reduce((a, b) => a + b, 0); }
  // ── 머신 · 로스터 (시간은 실제 시각 기준 → 나가 있어도 계속)
  mstate(m) { return ST().mach[m.key] || null; }
  progress(m) { const s = this.mstate(m); if (!s) return null; const T = (s.d || MENU[s.menu].t) * 1000, u = (now() - s.start) / T; return { s, u: Math.min(1, u), left: Math.max(0, Math.ceil((T - (now() - s.start)) / 1000)) }; }
  brew(m, k, want, dur) { const d = MENU[k]; if (this.mstate(m)) return '이미 내리는 중이에요'; if (S.lv < d.lv) return `Lv.${d.lv}에 열려요`; if (!!d.oven !== (m.kind === 'oven')) return d.oven ? '오븐에서 구워요' : '머신에서 내려요';
    const n = Math.max(1, Math.min(d.n, want || this.need(k) || 1, d.bean ? Math.floor(S.beans / d.bean) : 99));
    if (this.owner.mode === 'bar' && !m.bak) this.owner.tx = m.x; const need = d.bean * n; if (S.beans < need) return `원두가 모자라요 (${need}잔분 필요)`; S.beans -= need; ST().mach[m.key] = { menu: k, start: now(), n, ...(dur ? { d: dur } : {}) }; ST().last = ST().last || {}; ST().last[m.key] = k; sfx('build', { vol: 0.5 }); save(); this.steam(m.x, 220, m.z); return null; }
  collect(m, by) { const p = this.progress(m); if (!p || p.u < 1) return false; const st = ST(), k = p.s.menu, n = p.s.n; delete st.mach[m.key];
    if (m.bak) { st.case[k] = (st.case[k] || 0) + n; this.refreshCase(); sfx('pick', { vol: 0.4 }); if (!by) this.ui.float(`${MENU[k].short} +${n} 진열장`, new V(m.x, 200, m.z), 'pay sm'); save(); this.ui.progress(); return true; }   /* 베이커리: 진열장으로 → 디저트 나르기 */
    this.addStack(k, n, false, new V(m.x, 140, m.z)); sfx('pick', { vol: 0.5 }); this.ui.float(`${MENU[k].short} +${n}`, new V(m.x, 260, m.z), 'pay sm'); save(); return true; }
  pullCount(k) { const d = MENU[k]; return Math.max(1, Math.min(d.n, this.need(k) || 1, d.bean ? Math.floor(S.beans / d.bean) : 99)); }
  handBrew(m, k, res = {}) { const d = MENU[k]; if (this.mstate(m)) return '이미 내리는 중이에요'; if (S.lv < d.lv) return `Lv.${d.lv}에 열려요`; const n = this.pullCount(k), need = d.bean * n; if (S.beans < need) return `원두가 모자라요 (${need}잔분 필요)`; S.beans -= need;
    const out = { n, gold: !!res.gold, tip: 0, combo: 0, heart: 0, art: res.art || null, artNew: false };
    if (res.gold) { this.combo++; S.jeong++; S.best = Math.max(S.best, this.combo); out.combo = this.combo; out.tip = Math.round(d.price * n * storeMult() * (PULL.tip + PULL.combo * Math.min(this.combo - 1, PULL.comboMax)) * (1 + this.bossK('tip'))); out.heart = 1; } else this.combo = 0;
    if (res.art) { out.artNew = !S.art[res.art]; S.art[res.art] = (S.art[res.art] || 0) + 1; }
    this.earn(out.tip); S.hearts += out.heart; if (this.owner.mode === 'bar') this.owner.tx = m.x; ST().last = ST().last || {}; ST().last[m.key] = k;
    this.addStack(k, n, !!res.gold || !!res.art, new V(m.x, 140, m.z)); this.steam(m.x, 200, m.z); if (res.gold) this.sparkle(new V(m.x, 170, m.z));
    sfx(res.gold ? 'reward' : 'pick', { vol: res.gold ? 0.45 : 0.5 }); this.gainXp(res.gold ? 1 : 0); const B = (window.__botStat ||= { pull: 0, gold: 0, art: 0 }); B.pull++; if (res.gold) B.gold++; if (res.art) B.art++; save(); return out; }
  finishNow(m) { const s = this.mstate(m); if (s) s.start = now() - (s.d || MENU[s.menu].t) * 1000; const r = ST().roast; if (m.kind === 'roaster' && r) r.start = 0; save(); }
  /* 로스터: 로스팅실이 열리면 2 · 3번 로스터가 볶는 시간을 줄여 줌 */
  roastT(R) { return R.t * (this.roaster?.room ? Math.pow(0.8, Math.max(0, this.roasterG.length - 1)) : 1) * (this.areaOpen('roast') && this.area('roast').factory ? 0.8 : 1); }
  roastState() { const r = ST().roast; if (!r) return null; const R = ROAST.find(x => x.id === r.id), T = this.roastT(R) * 1000; return { r, R, u: Math.min(1, (now() - r.start) / T), left: Math.max(0, Math.ceil((T - (now() - r.start)) / 1000)) }; }
  /* 바닥 안전망: 원두가 바닥이고(자루도 없고) 하우스 블렌드 볶을 돈도 없음 → 응원 원두 · 외상 볶기 */
  broke() { return S.beans + (ST().bags || 0) < CHEER.low && !ST().roast && S.coins < ROAST[0].cost * STORES[S.si].mult; }
  cheerLeft() { const c = S.cheer || {}; return Math.max(0, CHEER.perDay - (c.day === today() ? c.n || 0 : 0)); }
  cheerGive() { if (!this.broke() || this.cheerLeft() <= 0) return false; const d = today(), n0 = S.cheer && S.cheer.day === d ? S.cheer.n || 0 : 0; S.cheer = { day: d, n: n0 + 1 };
    const n = Math.min(BEAN_MAX - S.beans, CHEER.beans); S.beans += n; this.ui.float(`응원 원두 +${n}`, new V(BIN.x, 280, BIN.z), 'bean'); this.sparkle(new V(BIN.x, 160, BIN.z)); sfx('reward', { vol: 0.5 }); save(); this.ui.progress(); return true; }   /* 응원 원두는 바 원두통으로 바로 */
  roastWhy(id) { const R = ROAST.find(x => x.id === id); if (!R) return '없는 원두예요'; if (ST().roast) return '로스터가 쉬고 있지 않아요'; if (S.lv < R.lv) return `Lv.${R.lv}에 열려요`; if (id === ROAST[0].id && this.broke()) return null; return S.coins < R.cost * STORES[S.si].mult ? '돈이 모자라요' : null; }
  roast(id) { const e = this.roastWhy(id); if (e) return e; const R = ROAST.find(x => x.id === id), c = R.cost * STORES[S.si].mult;
    if (S.coins < c) { S.owe = (S.owe || 0) + c; this.ui.toast(`외상으로 볶아요 · 다음 매출에서 ${fmt(c)} 갚아요`); } else S.coins -= c;
    ST().roast = { id, start: now() }; sfx('build'); save(); this.ui.progress(); return null; }
  checkHelp() {
    if (S.owe > 0 && S.coins >= S.owe) { S.coins -= S.owe; this.ui.toast(`외상 원두값 ${fmt(S.owe)} 갚았어요 · 다시 든든해요`); S.owe = 0; save(); this.ui.progress(); }
    if (!this.broke() || this.deco || S.fg < 3) { this._cheerAsk = false; return; } if (this._cheerAsk) return;
    if (this.cheerLeft() > 0) { if (this.ui.cheer && this.ui.cheer()) this._cheerAsk = true; } else { this._cheerAsk = true; this.ui.toast('원두가 바닥났어요 · 로스터에서 외상으로 볶을 수 있어요'); } }
  /* 다 볶은 원두 담기: 로스팅실이 열리면 자루로 선반에 (바 원두통까지는 사장님 · 무진이 나름) · 아니면 바 원두통으로 바로 */
  collectBeans(by) { const s = this.roastState(); if (!s || s.u < 1) return false; const st = ST(), room = this.roaster.room ? BEAN_MAX * 2 - st.bags : BEAN_MAX - S.beans; if (room <= 0) { if (!by) this.ui.toast(this.roaster.room ? '원두 자루 선반이 가득 찼어요' : '원두 창고가 가득 찼어요'); return false; }
    const n = Math.min(room, Math.round(s.R.beans * (1 + (by ? STAFF.roaster.lvx(this.lvOf('roaster')).bonus : 0)))); if (this.roaster.room) { st.bags += n; this.refreshBags(); } else S.beans += n; st.roast = null; sfx('coin', { vol: by ? 0.3 : 1 });
    if (by) this.sparkle(new V(this.roaster.x, 200, this.roaster.z)); else this.ui.float(this.roaster.room ? `원두 자루 +${n}` : `원두 +${n}`, new V(this.roaster.x, 260, this.roaster.z), 'bean'); this.gainXp(2); save(); this.ui.progress(); return true; }
  refreshBags() { if (!this.bagG) return; this.bagG.clear(); const n = Math.min(8, Math.ceil((ST().bags || 0) / OWNER.bag)); for (let k = 0; k < n; k++) { const s = cyl(20, 24, 44, 0xC8B08A, -70 + (k % 4) * 46, 50 + Math.floor(k / 4) * 44, 0, this.bagG, 10); s.scale.set(1, 1, 0.8); } }
  refreshCase() { if (!this.caseG) return; this.caseG.clear(); let i = 0; for (const [k, n] of Object.entries(ST().case || {})) for (let q = 0; q < Math.min(n, 4) && i < 6; q++, i++) { const c = cup(MENU[k].look); c.scale.setScalar(1.1); c.position.set(-30 + (i % 3) * 30, 84, -12 + Math.floor(i / 3) * 24); this.caseG.add(c); } }
  caseTotal() { return Object.values(ST().case || {}).reduce((a, b) => a + b, 0); }
  // ── 손님
  seats() { const out = []; for (const o of this.furn) o.seats.forEach((s, k) => out.push({ o, s, k })); return out; }
  freeSeats() { return this.seats().filter(x => !x.s.who && !x.s.dirty && x.s.cell); }
  seatFar(seat) { const a = this.cells.get(K(...(seat.s.cell || [0, 0]))); return !!(a && a.far); }
  menuPool() { return Object.entries(MENU).filter(([, d]) => S.lv >= d.lv && (!d.oven || machineCount('oven'))).map(([k]) => k); }
  spawn(reg, group) {
    const free = this.freeSeats(), qn = this.cust.filter(c => ['in', 'queue', 'kiosk', 'story'].includes(c.state)).length, open = this.tickets.length + qn, cap = 4 + this.machines.length * 2;
    const tut = S.fg < 3 && !reg; if (tut && this.cust.length >= (S.fg < 1 ? 1 : 2)) return false;
    if (!free.length || qn >= KQ.length || (!reg && open >= cap)) return false;
    /* 1층 자리를 조금 더 자주 (멀리 갈수록 가져다 드리기 일이 생김) · 단체는 같은 구역 */
    const near = free.filter(x => !this.seatFar(x)), pickFrom = group ? group : near.length && Math.random() < 0.55 ? near : free, seat = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    const P = person(reg ? { body: reg.body, hair: reg.hair, bun: reg.bun, pants: 0x4A3A30 } : { body: [0x8FA6C2, 0xE3B9A8, 0xC9B27A, 0x9DBF9A, 0xD9D2C8, 0xB8A0C8, 0xE8C8A0, 0x7A8A9A][Math.floor(Math.random() * 8)], hair: [0x2A1E16, 0x6A4A32, 0x1E1612, 0x8A5A3A, 0x4A3A2A][Math.floor(Math.random() * 5)], pants: [0x4A4A55, 0x7A6A5A, 0x3B3B42, 0x5A4A3A][Math.floor(Math.random() * 4)], bun: Math.random() < 0.3, glasses: Math.random() < 0.25 });
    P.g.position.set(cx(DOOR[0]) + 160, 0, cz(DOOR[1]) + rnd(-40, 40)); this.sc.add(P.g);
    const items = tut && !this.cust.length ? [{ k: 'americano', n: 1 }] : this.pickItems();
    const c = { P, pos: P.g.position, seat, state: 'in', items, menu: items[0].k, w: 0, reg, story: !!reg, tag: this.ui.bubble(), cloud: this.ui.cloud ? this.ui.cloud() : null }; seat.s.who = c;
    this.cust.push(c); this.reQ(); this.onEnter && this.onEnter(c); return c;
  }
  pickItems(first) {
    const pool = this.menuPool(), pick = () => pool[Math.floor(Math.random() * pool.length)] || 'americano', r = Math.random(), lvK = Math.min(1, S.lv / 5);
    const total = r < 1 - 0.3 * lvK ? 1 : r < 1 - 0.06 * lvK ? 2 : 3, items = [];
    for (let i = 0; i < total; i++) { const k = i === 0 && first ? first : pick(), it = items.find(x => x.k === k); if (it) it.n++; else items.push({ k, n: 1 }); }
    return items;
  }
  reQ() { let i = 0; for (const c of this.cust) if (['in', 'queue', 'kiosk', 'story'].includes(c.state)) { const q = KQ[Math.min(i, KQ.length - 1)]; if (!c.qc || c.qc.join() !== q.join()) { c.qc = q; c.route = this.path(this.cellOf(c).join() === '13,8' || c.state === 'in' ? [DOOR[0], DOOR[1]] : this.cellOf(c), q); if (c.state === 'in') c.route && c.route.unshift(null); if (c.state !== 'in') c.state = 'queue'; } c.qi = i++; } }
  need(k) { let want = 0; for (const t of this.tickets) for (const it of t.items) if (it.k === k) want += it.n; for (const m of this.machines) { const p = this.progress(m); if (p && p.s.menu === k) want -= p.s.n; } for (const e of this.stack || []) if (e.k === k) want -= e.n; want -= (ST().case || {})[k] || 0; for (const h of this.owner?.carry || []) if (h.kind === 'dessert' && h.k === k) want -= h.n; return Math.max(0, want - (ST().bar[k] || 0)); }
  ready(c) { return c.items.every(it => this.avail(it.k) >= it.n); }
  avail(k) { return (ST().bar[k] || 0) - (this.resv[k] || 0); }
  freeSpot() { const used = new Set(this.cust.filter(c => c.spot).map(c => c.spot.join())); const opts = []; for (let i = 6; i <= 10; i++) if (!used.has(i + ',3') && this.walkable(i, 3)) opts.push([i, 3]); return opts.length ? opts[Math.floor(Math.random() * opts.length)] : [8, 3]; }
  /* 경로 따라 걷기: 끝나면 true · 계단 칸 짝은 순간 이동(층 사이) */
  walk(w, dt, sp) {
    if (!w.route || !w.route.length) return true; let nx = w.route[0]; if (!nx) { w.route.shift(); nx = w.route[0]; if (!nx) return true; }
    const tx = cx(nx[0]), tz = cz(nx[1]); if (Math.abs(tx - w.pos.x) > FDX / 2) { w.pos.set(tx, 0, tz); w.route.shift(); this.onFloor && this.onFloor(w); return !w.route.length; }
    const d = new V(tx - w.pos.x, 0, tz - w.pos.z), l = d.length();
    if (l < 6) { w.route.shift(); return !w.route.length; } d.normalize(); w.pos.addScaledVector(d, Math.min(l, sp * dt)); w.P.g.rotation.y = Math.atan2(d.x, d.z); w.P.anim(dt, true); return false;
  }
  stepTo(w, x, z, dt, sp = 200) { const d = new V(x - w.pos.x, 0, z - w.pos.z), l = d.length(); if (l < 4) return true; d.normalize(); w.pos.addScaledVector(d, Math.min(l, sp * dt)); w.P.g.rotation.y = Math.atan2(d.x, d.z); w.P.anim(dt, true); return false; }
  custAI(c, dt) {
    const Q = ['in', 'queue', 'kiosk', 'story'];
    if (c.state === 'in' || c.state === 'queue') { if (this.walk(c, dt, 240)) { c.P.anim(dt, false); c.P.g.rotation.y = Math.PI; if (c.qi === 0) { c.state = c.story ? 'story' : 'kiosk'; c.t = 2.2; if (c.reg) this.ui.float('💌', c.pos.clone().setY(220), 'heart'); } else c.state = 'queue'; } }
    else if (c.state === 'story') { c.P.anim(dt, false); c.P.g.rotation.y = Math.PI; c.sw = (c.sw || 0) + dt;
      if (c.sw > STORY_WAIT) { c.state = 'kiosk'; c.t = 0.6; this.ui.float('자리에서 기다릴게요 💌', c.pos.clone().setY(260), 'say'); } }
    else if (c.state === 'kiosk') { c.P.anim(dt, false); c.P.g.rotation.y = Math.PI; c.t -= dt; if (c.t <= 0) this.order(c); }
    else if (c.state === 'toSeat' || c.state === 'back') { if (!c.route && c.state === 'toSeat') { c.pos.set(cx(c.seat.s.cell[0]), 0, cz(c.seat.s.cell[1])); }   /* 길이 없으면(배치가 바뀜) 자리 칸으로 */ if (this.walk(c, dt, 220)) c.state = c.state === 'toSeat' ? 'sitting' : 'sitting2'; }
    else if (c.state === 'sitting' || c.state === 'sitting2') { if (this.stepTo(c, c.seat.s.x, c.seat.s.z, dt)) { c.P.sit = true; c.P.g.rotation.y = c.seat.s.ry; if (c.state === 'sitting') { c.state = 'seated'; } else { c.state = 'drink'; c.t = rnd(7, 11); } } }
    else if (c.state === 'seated') { c.P.anim(dt, false); c.w += dt;
      if (this.ready(c) && !c.reserved) { for (const it of c.items) this.resv[it.k] = (this.resv[it.k] || 0) + it.n; c.reserved = true; this.ui.float('🔔', c.pos.clone().setY(230), 'heart'); sfx('blip', { vol: 0.5, rate: 1.4 }); c.readyT = this.t;
        if (!this.seatFar(c.seat)) { this.goPick(c); return; } }   /* 먼 자리: 사장님(또는 은재)이 가져다 드림 · OWNER.farWait 지나도 아무도 안 오면 직접 내려감 */
      if (c.reserved && !c.taken && this.t - c.readyT > OWNER.farWait) { this.goPick(c); return; }
      if (c.w > 240 && !c.taken) { const v = this.takeaway(c); this.ui.float(v ? `있는 것만 포장해 갈게요 +${fmt(v)}` : c.story ? '다음에 또 들를게요 💌' : '다음에 올게요', c.pos.clone().setY(260), v ? 'pay' : 'say'); this.dropTicket(c); c.P.sit = false; c.seat.s.who = null; c.state = 'out'; c.route = this.path(c.seat.s.cell, DOOR); c.route && c.route.push([DOOR[0] + 2, DOOR[1]]); } }
    else if (c.state === 'toPick') { c.pt = (c.pt || 0) + dt; if (c.pt > 40 && c.route) { c.route = null; c.pos.set(cx(c.spot[0]), 0, cz(c.spot[1])); }
      if (this.walk(c, dt, 240)) { c.P.g.rotation.y = Math.PI;
        const fromX = (this.trayX && this.trayX[c.menu]) ?? c.pos.x; this.takeTray(c);
        const t = tray(MENU[c.menu].look, c.items); t.scale.setScalar(0.85); this.sc.add(t); const from = new V(fromX, 125, PICK.z); this.fly(t, from, c.pos.clone().setY(80), 0.35, 40, () => { t.position.set(0, -6, 0); c.P.hand.add(t); });
        this.served(c); c.state = 'back'; c.route = this.path(c.spot, c.seat.s.cell); c.spot = null; } }
    else if (c.state === 'drink') { c.P.anim(dt, false); c.t -= dt; if (c.t <= 0) { c.P.sit = false; this.makeDirty(c.seat.o, c.seat.k, false, ST().ret >= RET_MAX || this.seatFar(c.seat)); this.leaveCoins(c.seat.o, c.seat.k, { v: c.pay || 0, l: Math.random() < (c.sun ? 0.3 : 0.12) || c.reg ? Math.floor(Math.random() * LETTERS.length) : -1 }); c.seat.s.who = null;
        if (ST().ret >= RET_MAX || this.seatFar(c.seat)) { c.P.hand.clear(); c.state = 'out'; c.route = this.path(c.seat.s.cell, DOOR); } else { c.state = 'toReturn'; c.route = this.path(c.seat.s.cell, RET_SPOT); } c.route && c.state === 'out' && c.route.push([DOOR[0] + 2, DOOR[1]]); if (!c.route) c.gone = true; } }   /* 먼 자리는 쟁반째 두고 감 (치우기 = 사장님 · 도윤) */
    else if (c.state === 'toReturn') { if (this.walk(c, dt, 240)) { c.P.hand.clear(); ST().ret = Math.min(RET_MAX, (ST().ret || 0) + 1); this.refreshRet(); sfx('drop', { vol: 0.3 }); c.state = 'out'; c.route = this.path(RET_SPOT, DOOR); c.route && c.route.push([DOOR[0] + 2, DOOR[1]]); } }
    else if (c.state === 'out') { if (!c.route || this.walk(c, dt, 260)) c.gone = true; }
    else if (c.state === 'gwait') { c.P.anim(dt, false); }   /* 단체 손님: 문 앞에서 안내를 기다림 (owner.js) */
    if (Q.includes(c.state) === false && c.qc) { c.qc = null; this.reQ(); }
  }
  goPick(c) { c.P.sit = false; c.spot = this.freeSpot(); c.state = 'toPick'; c.route = this.path(c.seat.s.cell, c.spot); }
  /* 픽업대에서 그 손님 몫을 들어냄 (손님 본인 · 사장님 · 은재) */
  takeTray(c) { for (const it of c.items) { ST().bar[it.k] -= it.n; this.resv[it.k] -= it.n; const gd = Math.min(it.n, this.gold[it.k] || 0); if (gd) { this.gold[it.k] -= gd; c.sun = true; } } this.refreshBar(); this.dropTicket(c); c.taken = true; }
  order(c) { this.ticketNo = (this.ticketNo || 0) + 1; c.ticket = { no: this.ticketNo, menu: c.menu, items: c.items, c, at: now() }; this.tickets.push(c.ticket); c.w = 0; sfx('order', { vol: 0.4 });
    c.state = 'toSeat'; c.qc = null; c.route = this.path(this.cellOf(c), c.seat.s.cell); this.reQ(); this.ui.progress(); }
  takeaway(c) { let v = 0; for (const it of c.items) { const n = Math.min(it.n, Math.max(0, this.avail(it.k) + (c.reserved ? it.n : 0))); if (!n) continue; ST().bar[it.k] -= n; if (c.reserved) this.resv[it.k] -= it.n; const gd = Math.min(n, this.gold[it.k] || 0); if (gd) this.gold[it.k] -= gd; v += MENU[it.k].price * n; this.countSold(it.k, n); }
    c.reserved = false; if (!v) return 0; v = Math.round(v * storeMult()); this.earn(v); this.refreshBar(); sfx('coin', { vol: 0.4 }); save(); this.ui.progress(); return v; }
  countSold(k, n) { dayTick(); S.sold += n; S.soldBy[k] = (S.soldBy[k] || 0) + n; S.menuSold[k] = (S.menuSold[k] || 0) + n; salesAdd(k, n, MENU[k].cat === 'sig'); S.season.xp = (S.season.xp || 0) + n; }
  dropTicket(c) { if (!c.ticket) return; this.tickets = this.tickets.filter(t => t !== c.ticket); c.ticket = null; }
  refreshRet() { this.retG.clear(); const n = ST().ret || 0; for (let i = 0; i < n; i++) { const t = tray('latte'); t.scale.setScalar(0.9); t.position.set(RET.x - 90 + (i % 4) * 60, RET.y + Math.floor(i / 4) * 14, RET.z); this.retG.add(t); } }
  wash(by) { const n = ST().ret || 0; if (!n) return false; ST().ret = 0; this.refreshRet(); const v = Math.round(n * 2 * storeMult()); this.earn(v); this.gainXp(n); if (!by) this.ui.float(`설거지 +${v}`, new V(RET.x, 200, RET.z), 'pay'); sfx('drop', { vol: 0.5 }); this.sparkle(new V(RET.x, 140, RET.z)); save(); this.ui.progress(); return true; }
  makeDirty(o, k, silent, withTray = true) { const s = o.seats[k]; if (!s || s.dirty) return; const m = withTray ? tray('latte') : spill(); m.scale.setScalar(0.8); m.position.set(s.x + (o.f.x - s.x) * 0.45, FURN[o.f.id].cat === 'table' && o.f.id === 'floor' ? 50 : o.f.id === 'sofa' ? 40 : 80, s.z + (o.f.z - s.z) * 0.45); this.sc.add(m); s.dirty = m;
    if (!silent) { const d = (ST().dirty[o.f.uid] ||= []); if (!d.includes(k)) d.push(k); save(); } }
  clean(o, k, w) { const s = o.seats[k]; if (!s.dirty) return 0; this.sc.remove(s.dirty); s.dirty = null; const d = ST().dirty[o.f.uid] || []; ST().dirty[o.f.uid] = d.filter(x => x !== k); if (!ST().dirty[o.f.uid].length) delete ST().dirty[o.f.uid];
    const c = s.coins || { v: 0, l: -1 }; if (s.coinG) { this.sc.remove(s.coinG); s.coinG = null; } s.coins = null; delete ST().coinsAt[o.f.uid + '_' + k];
    const v = Math.round((Math.round(3 * storeMult()) + c.v) * (1 + (w ? STAFF.hall.lvx(this.lvOf('hall')).bonus : 0))); this.earn(v); this.gainXp(1); if (!w) this.ui.float('+' + fmt(v), new V(s.x, 160, s.z), 'pay sm'); sfx(c.v ? 'coin' : 'drop', { vol: 0.45 });
    if (c.l >= 0) { S.hearts += 1; this.ui.letter ? this.ui.letter(LETTERS[c.l % LETTERS.length], !!w) : null; } save(); this.ui.progress(); return v; }
  leaveCoins(o, k, c, silent) { const s = o.seats[k]; if (!s) return; s.coins = c; if (s.coinG) this.sc.remove(s.coinG); const g = new THREE.Group(), base = s.dirty ? s.dirty.position : new V(s.x, 80, s.z); g.add(coinPile(c.v)); if (c.l >= 0) { const L = letter(); L.position.set(20, 1, 16); g.add(L); }
    g.position.set(base.x + 14, base.y, base.z - 10); this.sc.add(g); s.coinG = g; if (!silent) { ST().coinsAt[o.f.uid + '_' + k] = c; save(); } }
  serveValue(c) { let v = c.items.reduce((a, it) => a + MENU[it.k].price * it.n, 0) * storeMult() * (c.group ? 1.5 : 1); const happy = c.w <= MOOD.happy || c.greet; c.mood = happy ? 2 : c.w <= MOOD.ok ? 1 : 0; let tip = happy ? Math.round(v * MOOD.tip) : 0; tip += Math.random() < this.score() / 1500 ? Math.round(v * 0.5) : 0; return { v: Math.round(v), tip }; }
  served(c) {
    const { v, tip } = this.serveValue(c); c.pay = v + tip; for (const it of c.items) this.countSold(it.k, it.n);
    c.gain = (c.sun ? 1 : 0) + (c.greet ? 1 : 0); S.hearts += c.gain; c.clearT = this.t; this.gainXp(c.items.reduce((a, it) => a + MENU[it.k].xp * it.n, 0));
    sfx('blip', { vol: 0.35, rate: c.sun ? 1.6 : 1.25 }); c.tag && (c.tag.style.display = 'none'); this.addPoem(c);
    for (const o of S.orders) if (!o.done && c.items.some(it => it.k === o.menu) && (S.soldBy[o.menu] || 0) >= o.n) this.ui.orderReady && this.ui.orderReady(o);
    save(); this.ui.progress();
  }
  /* 돈 들어옴 (S.earned 는 성장 곡선 측정용 · tools/growth_measure.mjs) */
  earn(v) { v = Math.round(v); S.coins += v; S.earned = (S.earned || 0) + v; return v; }
  // ── 동료 (모든 매장 공통 · 고용 = 1단계 · S.staff[k] = 단계 · 동료 일은 글 없이 작은 반짝만)
  lvOf(k) { return S.staff[k] || 0; }
  hire(k) { const d = STAFF[k]; if (!d) return '없는 동료예요'; const nm = d.name.split('· ')[1]; if (S.staff[k]) return `${nm}${josaWa(nm)} 함께하고 있어요`; if (S.lv < d.lv) return `Lv.${d.lv}부터 함께할 수 있어요`;
    if (d.kind && !this.hasKind(d.kind)) return `${{ far: '테라스 같은 먼 자리', bakery: '베이커리', annex: '포장 별관' }[d.kind]}가 열리면 함께할 수 있어요`; if (S.coins < d.cost) return `돈이 모자라요 (${fmt(d.cost)} 필요)`;
    S.coins -= d.cost; S.staff[k] = 1; this.hireStaff(k); save(); this.ui.progress(); return null; }
  upgradeCost(k) { const l = this.lvOf(k); return l && l < STAFF_UP.max ? STAFF_UP.cost[l] : 0; }
  upgradeStaff(k, free) { const l = this.lvOf(k); if (!l) return '아직 함께하지 않아요'; if (l >= STAFF_UP.max) return '최고 단계예요'; const c = free ? 0 : this.upgradeCost(k); if (S.coins < c) return `돈이 모자라요 (${fmt(c)} 필요)`;
    S.coins -= c; S.staff[k] = l + 1; const w = this.staffOf(k); if (w) this.sparkle(w.P.g.position.clone().setY(150)); sfx('unlock', { vol: 0.6 }); save(); this.ui.progress(); return null; }
  staffCount() { return Object.keys(STAFF).filter(k => S.staff[k]).length; }
  staffOf(k) { return k === 'barista' ? this.barista : this.workers.find(w => w.role === k) || null; }
  /* 쉬는 동안 번 돈 (data.js OFFLINE · IDLE): 동료 need 명 이상 · min 초 넘게 비움 · 최대 (기본 2시간 · VIP 3 · 베테랑 지점장 +2) · 지도 영구 단계 +10%/단계 */
  idleCapS() { return ((vipOn() ? VIP.idleH : IDLE.baseH) + (S.items.includes('manager') ? IDLE.managerH : 0)) * 3600; }
  idleRate(si = S.si) { const st = S.stores[si]; if (!st) return 0; const extra = Object.keys(STAFF).reduce((a, k) => a + Math.max(0, this.lvOf(k) - 1), 0);
    return OFFLINE.perMin / 60 * STORES[si].mult * (1 + this.progressFrac(si) * 4) * (1 + extra * OFFLINE.step) * (1 + (st.idle?.up || 0) * IDLE.upK) * vipK(); }
  offlineEarn(away, si = S.si) { if (!(away > OFFLINE.min) || this.staffCount() < OFFLINE.need) return 0; return Math.round(Math.min(away, this.idleCapS()) * this.idleRate(si)); }
  hireStaff(k, silent) { const d = STAFF[k], look = { body: d.body, apron: { barista: BRAND.redHex, hall: 0x6B4A30, roaster: 0x4A3A2E, server: 0x8A5A3A, baker: 0xE8D8C0, takeout: 0x3B3B42 }[k], hair: d.hair, pants: 0x3B2A20, bun: d.bun }, P = person(look); this.sc.add(P.g);
    if (k === 'barista') { P.g.position.set(-100, 0, LANE); this.barista = { P, pos: P.g.position, t: 0, tx: -100, role: k }; if (!silent) this.ui.toast('하린: 2번 머신은 제가 맡을게요 · 1번은 사장님의 정성 머신!'); return; }
    const home = { hall: [9, 4], roaster: this.roaster?.room ? this.accessNear([ci(this.roaster.x), cj(this.roaster.z)]) || [9, 4] : null, server: [7, 4], baker: this.caseAt ? this.accessNear([ci(this.caseAt[0]), cj(this.caseAt[1])]) || [5, 4] : [5, 4], takeout: this.windowAt ? [ci(this.spot(SPOT.hand)[0]), cj(this.spot(SPOT.hand)[1])] : [11, 4] }[k];
    if (k === 'roaster' && !home) { P.g.position.set(ROAST_BOY[0], 0, ROAST_BOY[1]); P.g.rotation.y = Math.atan2(ROASTER[0] - ROAST_BOY[0], ROASTER[1] - ROAST_BOY[1]); this.roastBoy = { P, pos: P.g.position, t: 0, role: k, fixed: true }; }
    else { P.g.position.set(cx(home[0]), 0, cz(home[1])); const w = { P, pos: P.g.position, task: null, sp: 280, auto: true, home, role: k, t: 0 }; this.workers.push(w); if (k === 'roaster') this.roastBoy = w; }
    if (!silent) this.ui.toast({ hall: '도윤: 테이블 정리랑 찻값은 저한테 맡기세요!', roaster: '무진: 하우스 · 싱글은 제가 볶을게요 · 원두 자루도 날라요', server: '은재: 먼 자리 손님께는 제가 가져다 드릴게요!', baker: '보람: 오븐이랑 진열장은 저한테 맡겨요', takeout: '태민: 포장 창구는 제가 지킬게요!' }[k]); }
  /* 바리스타 동료: 자동 머신(2번부터)에서 커피 · 디저트(바 오븐만) · 탑은 픽업대로 · 설거지 · 다 된 머신 거두기 (1번 = 사장님의 정성 머신) */
  baristaAI(dt) { const b = this.barista; if (!b) return; if (this.restTick && this.restTick(b, dt)) return; { const d = b.tx - b.pos.x; if (Math.abs(d) > 4) { b.pos.x += Math.sign(d) * Math.min(Math.abs(d), 320 * dt); b.P.g.rotation.y = d > 0 ? Math.PI / 2 : -Math.PI / 2; b.P.anim(dt, true); } else { b.P.g.rotation.y = 0; b.P.anim(dt, false); } }
    b.t -= dt; if (b.t > 0) return; const x = STAFF.barista.lvx(this.lvOf('barista')); b.t = x.tick / this.cheerK(b);
    if ((ST().ret || 0) >= x.wash) { this.wash('barista'); b.tx = RET.x; return; }
    if (this.stack.length) { this.deliverStack('barista'); b.tx = STACK.x + 40; return; }
    for (const m of this.machines) { if (m.bak) continue; const p = this.progress(m); if (p && p.u >= 1) { if (this.collect(m, 'barista')) { b.tx = m.x; return; } } else if (!p && !isJeong(m)) { const k = Object.keys(MENU).find(q => this.need(q) > 0 && MENU[q].cat !== 'sig' && !!MENU[q].oven === (m.kind === 'oven') && S.lv >= MENU[q].lv); if (k && !this.brew(m, k, 0, MENU[k].oven ? 0 : x.hand)) { b.tx = m.x; return; } } } }
  /* 로스터 견습생 무진: 다 볶이면 담고 · 원두가 low 아래면 하우스/싱글 · 로스팅실이 열리면 자루를 바 원두통까지 나름(owner.js workerAI) */
  roasterAI(dt) { const r = this.roastBoy; if (!r) return; if (!r.fixed && r.task) return; if (this.restTick && this.restTick(r, dt)) return; if (r.fixed) r.P.anim(dt, false); r.t -= dt; if (r.t > 0) return; r.t = 1.5 / this.cheerK(r); const x = STAFF.roaster.lvx(this.lvOf('roaster')), st = this.roastState(), beans = S.beans + (ST().bags || 0);
    if (!r.fixed && this.cellOf(r).join() !== (r.home || []).join()) return;   /* 로스팅실 밖이면 (자루 나르는 중) */
    if (st) { if (st.u >= 1 && (this.roaster.room ? ST().bags < BEAN_MAX * 2 : S.beans < BEAN_MAX)) this.collectBeans('roaster'); else if (st.u < 1) this.handRoast(r, 1.5); return; }
    if (beans >= x.low) return; const pick = ['single', 'house'].map(id => ROAST.find(R => R.id === id)).find(R => S.lv >= R.lv && S.coins >= R.cost * STORES[S.si].mult * (R.id === 'house' ? 1 : 2));
    if (pick && !this.roast(pick.id)) this.steam(this.roaster.x, 330, this.roaster.z); }
  handRoast(r, dt) { const c = ROAST[0].cost * STORES[S.si].mult;
    if (r.hr != null) { r.hr -= dt; this.steam(r.pos.x, 150, r.pos.z); if (r.hr > 0) return; r.hr = null; S.coins -= Math.min(S.coins, c); S.beans = Math.min(BEAN_MAX, S.beans + HAND_ROAST.beans); this.sparkle(new V(r.pos.x, 140, r.pos.z)); sfx('coin', { vol: 0.25 }); save(); this.ui.progress(); return; }
    if (S.beans < HAND_ROAST.low && S.coins >= c) r.hr = HAND_ROAST.t; }
  freeMachine(oven) { const free = this.machines.filter(x => !this.progress(x) && (x.kind === 'oven') === !!oven); return free.find(isJeong) || free[0] || null; }
  // ── 경험치 · 레벨
  gainXp(n) { const before = S.lv; S.xp += Math.round(n * (STORES[S.si].xpK || 1)); S.lv = levelOf(S.xp); if (S.lv > before) { sfx('levelup'); this.ui.levelUp(S.lv); const bak = this.areaOpen('bakery'), need = Math.min(machineCount('espresso'), bak ? 6 : 3) + Math.min(machineCount('oven'), bak ? 3 : 2); if (need !== this.machines.length) this.rebuildMachines();
    if (this.roaster?.room && machineCount('roaster') !== this.roasterG.length) { this.buildWorld(); this.rebuildGrid(); this.collectOcc(); } } }
  /* 감성 지수: 가구 + 벽 + 여백 보너스(벽 자리 1/3 이상 비우면 · 계획안 4-1) + 화분 돌본 날 */
  wallScore() { let s = 0; for (const id of Object.values(ST().wall)) s += id.startsWith('poem:') ? 20 : (FURN[id]?.score || 0); return s; }
  yeobaek() { const empty = WALL_SLOTS.filter((_, k) => !ST().wall[k]).length; return empty / WALL_SLOTS.length >= 1 / 3 ? 40 : 0; }
  plantBonus() { const d = today(); return Object.values(ST().plants || {}).filter(x => x === d).length * 6; }
  score() { let s = 0; for (const f of ST().furn) s += FURN[f.id]?.score || 0; return s + this.wallScore() + this.yeobaek() + this.plantBonus(); }
  // ── 확장: 단계 열기 · 공사 · 즉시 완성 (계획안 2-2)
  nextStage() { return this.B.stages.find(s => !this.stageOpen(s.i) && !ST().build[s.i]) || null; }
  stageWhy(s) { if (!s) return '모두 열었어요'; if (this.stageOpen(s.i)) return '이미 열렸어요'; if (ST().build[s.i]) return '공사 중이에요'; if (Object.keys(ST().build).length) return '지금 공사가 끝나면 열 수 있어요';
    if (s.need && !this.areaOpen({ bakery: 'bakery', lounge: 'lounge', office: 'hall3' }[s.need])) return '아래층부터 열어요'; if (this.nextStage() !== s) return '앞 구역부터 열어요'; if (S.coins < s.cost) return `돈이 모자라요 (${fmt(s.cost)} 필요)`; return null; }
  openStage(si, free) { const s = this.B.stages[si], e = free ? null : this.stageWhy(s); if (e) return e; if (!free) S.coins -= s.cost;
    if (s.build > 0) { ST().build[si] = now() + s.build * 1000; this.buildWorld(); this.rebuildGrid(); this.collectOcc(); sfx('build'); this.ui.toast(`${s.name} 공사 시작 · ${hms(s.build)} (장사는 그대로)`); save(true); this.ui.progress(); return null; }
    this.finishStage(si); return null; }
  buildLeft(si) { const e = ST().build[si]; return e ? Math.max(0, (e - now()) / 1000) : 0; }
  finishStage(si, how) { const st = ST(); delete st.build[si]; if (!st.open.includes(si)) st.open.push(si); st.open.sort((a, b) => a - b); const s = this.B.stages[si];
    this.ensureSeats(); for (const f of st.furn) if (!this.furn.some(o => o.f.uid === f.uid)) this.addFurn(f);
    { const fx = new Set(); for (const a of this.B.areas) if (s.ids.includes(a.id) || a.id === 'shop') for (const [i, j] of a.fixed) fx.add(K(gi(a.floor, i), j)); for (const sp of this.B.stairs) if (s.ids.includes(sp.need)) fx.add(K(gi(sp.a[0], sp.a[1]), sp.a[2]));
      for (const o of this.furn.slice()) if (!o.f.zone && this.footprint(o.f).some(([i, j]) => fx.has(K(i, j))) && !o.seats.some(q => q.who)) { this.sc.remove(o.g); this.furn = this.furn.filter(x => x !== o); st.furn = st.furn.filter(x => x.uid !== o.f.uid); delete st.dirty[o.f.uid]; S.inv[o.f.id] = (S.inv[o.f.id] || 0) + 1; this.ui.toast(`${FURN[o.f.id].name}은 공사 자리라 보관함으로 옮겼어요`); } }   /* 계단 · 설비 자리에 있던 가구 */
    this.buildWorld(); this.rebuildGrid(); this.collectOcc(); for (const k of ['roaster', 'baker', 'takeout']) { const w = this.staffOf(k); if (w && !w.fixed) { w.home = null; } }
    if (S.staff.roaster && this.roastBoy?.fixed && this.roaster.room) { this.sc.remove(this.roastBoy.P.g); this.roastBoy = null; this.hireStaff('roaster', true); }   /* 로스팅실이 열리면 무진이 그리로 이사 */
    for (const w of this.workers) if (!w.home) { const h = { hall: [9, 4], server: [7, 4], baker: this.caseAt ? this.accessNear([ci(this.caseAt[0]), cj(this.caseAt[1])]) : [5, 4], takeout: this.windowAt ? [ci(this.spot(SPOT.hand)[0]), cj(this.spot(SPOT.hand)[1])] : [11, 4], roaster: this.roaster.room ? this.accessNear([ci(this.roaster.x), cj(this.roaster.z)]) : [9, 4] }[w.role]; w.home = h || [9, 4]; }
    const [x, z] = areaCenterOf(this.B, s.ids[0]); this.confetti(x, 300, z); sfx('levelup'); if (how !== 'check' && how !== 't' && how !== 'f') this.gainXp(STAGE_XP * si);   /* 구역 완성 = 경험치 (지점 배수만큼 · tools/growth_sim.mjs) */ track('gs_room', { b: S.si, s: si, how: how || 'wait' }); save(true); this.ui.progress(); this.ui.stageDone && this.ui.stageDone(s);
    if (this.progressFrac() >= 1 && !S.done[S.si]) { S.done[S.si] = Date.now(); track('gs_branch', { b: S.si, st: 'done' });
      if (S.si === 2 && !S.inv.catphoto) { S.inv.catphoto = 1; this.ui.toast('강정점 완성 · 「돌담 고양이 사진」 액자를 받았어요 (꾸미기 벽)'); }   /* 귤이 고양이의 무료 길 */
      if (Object.keys(S.done).length >= STORES.length && !S.items.includes('manager')) { S.items.push('manager'); this.ui.toast('7지점 완성 · 베테랑 지점장이 함께해요!'); } save(true); } }
  // ── 지점: 계약 · 이동 (계획안 2-3) · 떠난 지점은 지점장이 쉬는 동안 수익을 금고에
  branchWhy(bi) { const s = STORES[bi]; if (!s) return '없는 지점이에요'; if (S.stores[bi]) return null; if (bi > S.maxSi + 1) return '앞 지점부터 열어요'; if (S.lv < s.lv) return `Lv.${s.lv}에 열려요`; if (this.progressFrac(bi - 1) < FINISHED) return `${STORES[bi - 1].name} 진행 ${Math.round(FINISHED * 100)}% 부터 계약할 수 있어요`; if (S.coins < BRANCHES[bi - 1].next) return `돈이 모자라요 (${fmt(BRANCHES[bi - 1].next)} 필요)`; return null; }
  contract(bi) { const e = this.branchWhy(bi); if (e) return e; if (!S.stores[bi]) { S.coins -= BRANCHES[bi - 1].next; S.stores[bi] = newStore(); S.maxSi = Math.max(S.maxSi, bi); track('gs_branch', { b: bi, st: 'contract' }); } this.moveBranch(bi); return null; }
  moveBranch(bi) { if (!S.stores[bi] || bi === S.si) return; const old = ST(); old.left = Date.now(); for (const f of this.fx) if (f.fly) { f.f(1); } this.fx = []; this.tickets = [];
    S.si = bi; const st = ST(); if (st.left) { const away = (Date.now() - st.left) / 1000; if (away > 1800) { st.tasks = S.items.includes('manager') ? [1] : [1, 2, 3]; if (S.items.includes('manager')) { const v = this.earn(this.minuteValue() * 2); setTimeout(() => this.ui.toast(`베테랑 지점장이 순회 일감 둘을 처리했어요 +${fmt(v)}`), 1200); } } } st.left = 0; S.moved++; save(true); this.view.f = 0; this.build(); this.ui.arrived && this.ui.arrived(bi); }
  /* 떠난 지점 금고 (지점장 · 쉬는 동안) = 떠나 있던 시간 × 쉬는 동안 수익 (최대 idleCapS) */
  safeOf(si) { const st = S.stores[si]; if (!st) return 0; if (si === S.si) return Math.round(st.safe || 0); const away = st.left ? (Date.now() - st.left) / 1000 : 0; return Math.round((st.safe || 0) + Math.min(away, this.idleCapS()) * this.idleRate(si) * (this.staffCount() >= OFFLINE.need ? 1 : 0.5)); }
  // ── 매 프레임
  update(dt) {
    this.t += dt; const boost = now() < (S.boostUntil || 0) ? 2 : 1, rush = this.rushUntil && this.t < this.rushUntil ? 2 : 1, sunset = this.B.feat.sunset && this.areaOpen('roof') && (new Date().getHours() >= 17 && new Date().getHours() < 21) ? 1.4 : 1;
    if (!this.deco) {
      this.spawnT -= dt * boost * rush * sunset; if (this.spawnT <= 0) { this.spawnT = Math.max(2.4, (8.5 - this.score() / 25) * (this.seats().length > 12 ? 12 / Math.min(40, this.seats().length) * 1.2 : 1)) * rnd(0.8, 1.2); this.spawn(); }
      this.regT -= dt; if (this.regT <= 0) { this.regT = rnd(70, 120); const R = this.nextRegular(); if (R) this.spawn(R); }
      if (this.windowAt) { this.carT -= dt * boost; if (this.carT <= 0) { this.carT = rnd(30, 50); this.spawnCar && this.spawnCar(); } }
    }
    for (const c of this.cust) this.custAI(c, dt); this.cust = this.cust.filter(c => { if (c.gone) { this.sc.remove(c.P.g); c.tag && c.tag.remove(); c.cloud && c.cloud.remove(); if (c.seat.s.who === c) c.seat.s.who = null; if (c.reserved && !c.taken) { for (const it of c.items) this.resv[it.k] -= it.n; } this.dropTicket(c); return false; } return true; });
    for (const w of this.workers) this.workerAI(w, dt); this.baristaAI(dt); this.roasterAI(dt); this.ownerAI(dt); this.carAI && this.carAI(dt); this.eventAI && this.eventAI(dt);
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.t += dt / f.d; f.f(Math.min(1, f.t)); if (f.t >= 1) this.fx.splice(i, 1); }
    for (const m of this.machines) { const p = this.progress(m); if (p && p.u < 1 && Math.random() < dt * 2) this.steam(m.x, 220, m.z); }
    const r = this.roastState(); if (r && r.u < 1 && Math.random() < dt * 1.5) this.steam(this.roaster.x, 330, this.roaster.z);
    this._ck = (this._ck || 0) - dt; if (this._ck <= 0) { this._ck = 1; this.eps = (this.eps || 0) * 0.95 + Math.max(0, S.earned - (this._e0 ?? S.earned)) * 0.05; this._e0 = S.earned; this.checkHelp(); for (const [si, e] of Object.entries(ST().build)) if (now() >= e) this.finishStage(+si); ST().time = (ST().time || 0) + 1; }
    const gd = this.ui.guide && this.ui.guide(); this.arrow.visible = !!gd; if (gd) { this.arrow.position.set(gd[0], gd[2] + Math.sin(this.t * 3) * 6, gd[1]); this.arrow.rotation.y += dt * 0.8; }
    if (this._occDirty) { this._occDirty = false; this.collectOcc(); } this.occUpdate(dt);
    this.ui.frame(this);
  }
  poemLine() { return POEMS[S.poem.i % POEMS.length]; }
  addPoem(c, n) { const line = this.poemLine(), L = poemLen(line); S.poem.p = (S.poem.p || 0) + (n || (c && c.sun ? 2 : 1)); if (S.poem.p < POEM_PER) { this.ui.poemTick && this.ui.poemTick(false); return; }
    while (S.poem.p >= POEM_PER && S.poem.n < L) { S.poem.p -= POEM_PER; S.poem.n = Math.min(L, S.poem.n + 1); } this.ui.poemTick && this.ui.poemTick(true);
    if (S.poem.n >= L) { S.poems = [line, ...S.poems.filter(x => x !== line)].slice(0, 30); S.poem = { i: S.poem.i + 1, n: 0, p: 0 }; S.hearts += 3; const bonus = this.earn(40 * storeMult()); this.refreshToday(); this.confetti(TODAY[0] + 40, 300, TODAY[1]); sfx('levelup', { vol: 0.5 }); this.gainXp(5); this.ui.poemDone && this.ui.poemDone(line, bonus); } }
  refreshToday() { if (!this.todayG) return; this.todayG.clear(); const line = S.poems[0]; if (!line) return; const cols = []; let cur = ''; for (const w of line.split(' ')) { if (cur && [...(cur + w)].length > 5) { cols.push(cur); cur = w; } else cur += w; } cols.push(cur); todayFrame(this.todayG, cols.join('/')); }
  nextRegular() { const d = today(); return REGULARS.find(R => S.lv >= R.lv && (S.reg[R.id]?.day !== d) && (S.reg[R.id]?.ep || 0) < R.eps.length && !this.cust.some(c => c.reg === R)) || null; }
  storyDone(c, choice) {
    const R = c.reg, r = (S.reg[R.id] ||= { ep: 0, f: 0, day: '' }), ep = R.eps[r.ep]; r.f += choice[2]; r.ep++; r.day = today(); c.story = false;
    const first = choice[1] && this.menuPool().includes(choice[1]) ? choice[1] : this.menuPool().includes('latte') ? 'latte' : 'americano';
    if (c.state === 'story') { c.state = 'kiosk'; c.t = 0.8; c.w = 0; c.items = [{ k: first, n: 1 }]; c.menu = first; }
    else if (c.ticket && !c.reserved && c.items.length === 1 && c.items[0].k !== first) { c.items = [{ k: first, n: 1 }]; c.menu = first; c.ticket.items = c.items; c.ticket.menu = first; this.ui.progress(); }
    if (r.ep >= R.eps.length) { S.inv['poem:' + R.id] = 1; this.ui.toast(`${R.name}의 「시 한 줄」 액자를 받았어요 · 꾸미기에서 벽에 걸어요`); sfx('reward'); if (!S.items.includes('set_cherry')) S.items.push('set_cherry'); }   /* 단골 시 액자 완성 = 계절 세트 하나 (무료 길) */
    this.gainXp(5); save(); this.ui.progress(); return ep;
  }
  sparkle(p) { for (let i = 0; i < 8; i++) { const m = box(6, 6, 6, 0xFFF4C2, p.x, p.y + 10, p.z, this.sc); const a = Math.random() * 6.28; this.fx.push({ t: 0, d: 0.6, f: u => { m.position.set(p.x + Math.cos(a) * 40 * u, p.y + 10 + 50 * u, p.z + Math.sin(a) * 40 * u); m.scale.setScalar(1 - u * 0.7); if (u >= 1) this.sc.remove(m); } }); } }
  steam(x, y, z) { const m = new THREE.Mesh(STEAM_G, new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.55 })); m.position.set(x + rnd(-15, 15), y, z + rnd(-15, 15)); this.sc.add(m); this.fx.push({ t: 0, d: 1.3, f: u => { m.position.y = y + u * 110; m.scale.setScalar(1 + u * 2); m.material.opacity = 0.55 * (1 - u); if (u >= 1) { this.sc.remove(m); m.material.dispose(); } } }); }
  confetti(x, y, z) { for (let i = 0; i < 24; i++) { const m = box(10, 10, 3, [0xA92E2B, 0xE8C48A, 0x87A86E, 0xF4EEE4, 0xC88A5A][i % 5], x, y, z, this.sc); const v = new V(rnd(-1, 1), rnd(1.2, 2.2), rnd(-1, 1)).multiplyScalar(240), r0 = rnd(0, 6);
    this.fx.push({ t: 0, d: 1.1, f: u => { m.position.set(x + v.x * u, y + v.y * u - 400 * u * u, z + v.z * u); m.rotation.set(r0 + u * 8, r0 + u * 6, 0); if (u >= 1) this.sc.remove(m); } }); } }
  // ── 가림막 흐리게 (마루미 0.3.1 원칙): 키 큰 것(world.js occ · 파라솔 · 펜던트 · 계단)이 테이블 · 설비 · 사장님 · 손님 앞을 가리면 22% 로
  collectOcc() { this.occ = []; const add = o => { const mats = []; o.traverse(m => { if (m.isMesh && !m.userData.occMat) { m.material = m.material.clone(); m.material.transparent = true; m.userData.occMat = true; } if (m.isMesh && m.userData.occMat) mats.push(m.material); }); if (mats.length) this.occ.push({ o, b: new THREE.Box3().setFromObject(o), mats, a: 1, want: 1 }); };
    const seen = new Set(); this.sc.traverse(o => { if (o.userData.occ && !seen.has(o)) { let p = o.parent, dup = false; while (p) { if (seen.has(p)) dup = true; p = p.parent; } if (!dup) { seen.add(o); add(o); } } }); this.occT = 0; }
  occUpdate(dt) { if (!this.occ || !this.occ.length) return; if ((this.occT = (this.occT || 0) - dt) <= 0) { this.occT = 0.15; const cam = this.cam, V0 = new V(), tg = [], f = this.view.f || 0;
      const pt = (x, y, z) => { if (floorOfX(x) !== f) return; V0.set(x, y, z); const vz = V0.clone().applyMatrix4(cam.matrixWorldInverse).z; V0.project(cam); if (Math.abs(V0.x) < 1.2 && Math.abs(V0.y) < 1.2) tg.push([V0.x, V0.y, vz]); };
      for (const o of this.furn) if (FURN[o.f.id].cat === 'table') pt(o.f.x, 90, o.f.z); for (const m of this.machines) pt(m.x, 150, m.z); pt(this.owner.pos.x, 110, this.owner.pos.z); for (const c of this.cust) if (c.P.sit) pt(c.pos.x, 100, c.pos.z);
      for (const O of this.occ) { const b = O.b; if (floorOfX((b.min.x + b.max.x) / 2) !== f) { O.want = 1; continue; } const cs = []; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) { V0.set(x, y, z).project(cam); cs.push([V0.x, V0.y]); }
        const x0 = Math.min(...cs.map(c => c[0])), x1 = Math.max(...cs.map(c => c[0])), y0 = Math.min(...cs.map(c => c[1])), y1 = Math.max(...cs.map(c => c[1])), cz2 = b.getCenter(new V()).applyMatrix4(cam.matrixWorldInverse).z;
        O.want = tg.some(([x, y, z]) => x > x0 && x < x1 && y > y0 && y < y1 && cz2 > z + 20) ? 0.22 : 1; } }
    for (const O of this.occ) { if (Math.abs(O.a - O.want) < 0.01) continue; O.a += (O.want - O.a) * Math.min(1, dt * 8); for (const m of O.mats) { m.opacity = O.a; m.depthWrite = O.a > 0.9; } } }
  // ── 꾸미기 모드
  decoStart() { this.deco = { ghost: null }; this.ui.progress(); }
  decoEnd() { if (this.deco?.ghost) this.ghostCancel(); this.deco = null; this.rebuildGrid(); this.ui.decoBar && this.ui.decoBar(null); this.ui.progress(); this.collectOcc(); }
  ghostNew(id, f) {
    if (this.deco.ghost) this.ghostCancel(); const center = this.view; const g = new THREE.Group(); FURN_MODEL[id](g); this.sc.add(g);
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
  ghostConfirm(pay) {
    const gh = this.deco?.ghost; if (!gh || gh.err) return gh ? gh.err : null; if (!gh.moving && pay && !pay()) return '돈이 모자라요';
    this.sc.remove(gh.g); this.sc.remove(gh.ring); const st = ST(); let f = gh.f; if (gh.moving) { const o = st.furn.find(x => x.uid === gh.moving.uid); Object.assign(o, { x: f.x, z: f.z, r: f.r }); f = o; } else { f.uid = ++st.uid; st.furn.push(f); }
    this.addFurn(f); this.rebuildGrid(); this.confetti(f.x, 120, f.z); sfx('unlock', { vol: 0.6 }); this.deco.ghost = null; save(); this.ui.decoBar && this.ui.decoBar(null); this.ui.progress(); return null;
  }
  pickFurn(o) { if (o.seats.some(s => s.who || s.dirty)) return '손님이 있거나 치울 잔이 있어요'; this.sc.remove(o.g); this.furn = this.furn.filter(x => x !== o); this.rebuildGrid(); this.ghostNew(o.f.id, o.f); return null; }
  storeFurn() { const gh = this.deco?.ghost; if (!gh) return; this.sc.remove(gh.g); this.sc.remove(gh.ring); if (gh.moving) { ST().furn = ST().furn.filter(x => x.uid !== gh.moving.uid); delete ST().dirty[gh.moving.uid]; S.inv[gh.id] = (S.inv[gh.id] || 0) + 1; } this.deco.ghost = null; this.rebuildGrid(); save(); this.ui.decoBar && this.ui.decoBar(null); this.ui.progress(); }
  cellOf(w) { return [ci(w.pos.x), Math.max(3, cj(w.pos.z))]; }
  // ── 누르기: 무엇을 눌렀는지 (원래 것 + 사장님 일감 · 구역 · 바닥)
  pick(ray) {
    if (this.deco) { const gh = this.deco.ghost; if (gh && ray.distanceToPoint(new V(gh.f.x, 40, gh.f.z)) < 110) return { kind: 'ghost' };
      for (const w of this.walls) { const p = w.position; if (ray.distanceToPoint(new V(p.x, 180, p.z)) < 80) return { kind: 'wall', slot: w.userData.slot }; }
      let best = null, bd = 1e9; for (const o of this.furn) { const d = ray.distanceToPoint(new V(o.f.x, 40, o.f.z)); if (d < 100 && d < bd) { bd = d; best = o; } } return best ? { kind: 'furn', o: best } : { kind: 'floor' }; }
    const op = this.pickOwner && this.pickOwner(ray); if (op) return op;
    for (const c of this.cust) if ((c.state === 'story' || (c.story && c.state === 'seated')) && ray.distanceToPoint(c.pos.clone().setY(c.state === 'story' ? 100 : 80)) < 80) return { kind: 'story', c };
    if (this.stack.length && ray.distanceToPoint(new V(STACK.x, STACK.y + 40, STACK.z)) < 75) return { kind: 'stack' };
    for (const m of this.machines) if (ray.distanceToPoint(new V(m.x, 160, m.z)) < 95) return { kind: 'machine', m };
    if (ray.distanceToPoint(new V(this.roaster.x, 120, this.roaster.z)) < 100) return { kind: 'roaster' };
    for (const o of this.furn) o.seats.forEach((s, k) => { if (s.dirty && ray.distanceToPoint(s.dirty.position) < 70) this._dk = { o, k }; }); if (this._dk) { const d = this._dk; this._dk = null; return { kind: 'dirty', ...d }; }
    for (const c of this.cust) if (c.state === 'seated' && ray.distanceToPoint(c.pos.clone().setY(100)) < 70) return { kind: 'cust', c };
    if (ray.distanceToPoint(new V(RET.x, 110, RET.z)) < 140) return { kind: 'return' };
    if (ray.distanceToPoint(new V(150, 110, PICK.z)) < 150) return { kind: 'bar' };
    return null;
  }
}
const C_DESK = 0x8A6A4A;
const STEAM_G = new THREE.SphereGeometry(9, 8, 6);
function areaCenterOf(B, id) { const a = B.areas.find(x => x.id === id), b = areaBox(a); return [(b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2]; }
Object.assign(Game.prototype, OwnerMixin);
export { cx, cz, ci, cj, CELL, DOOR, BAR_PICK, BAR_EXIT, STACK, PICK, LANE, LANE_X, BIN, KQ, RET, RET_SPOT, K };
