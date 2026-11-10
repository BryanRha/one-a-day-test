// 가게 놀이: 끌어서 이동 · 굽기/바르기/내리기 · 진열 · 손님 줄 · 계산 · 돈 줍기 · 열기 칸 · 직원 · 테이블 치우기 · 드라이브스루
import * as THREE from 'three';
import { UP_MAX, upCost } from './data.js?v=0.99.19';
import { BRANCHES, MENU, PLAYER, STAFF, CUST_COLORS, BRAND, BRANCH_MENU, setBranchMenu, DECO, REGULARS, MASTERY, MASTERY_K, MOOD, FAVOR, josa, ST_NAME, UPGRADES, tierOf, TIER_NAME, OUTFITS, OUTFITS_PRO, REST, FX, EVENTS, FINISHED_RATE, ROOM_UP, ROOM_UP_MAX, VIP, THEME_SETS } from './data.js?v=0.99.19';
import { ROOMS, hms, inRect as inR } from './layout.js?v=0.99.19';
import { geom, Nav, heightAt } from './nav.js?v=0.99.19';
import { drawWorld, drawWalls } from './world.js?v=0.99.19';
import { track, salesAdd } from './oad.js?v=0.99.19';
import { bm } from './oad_bm.js?v=0.99.19';
export const L = id => (S.branch[S.bi]?.lv?.[id]) || 0;   /* 이 지점 업그레이드 단계 */
import { M, box, cyl, sph, item, person, STATION, car, ITEM_H, LOOK, DECO_MODEL, ownerRing, tierDeco, ghostify } from './models.js?v=0.99.19';
import { S, save, addSold, mission, today, vipOn } from './state.js?v=0.99.19';
import { sfx } from './audio.js?v=0.99.19';

const V = THREE.Vector3, R = 85, rnd = (a, b) => a + Math.random() * (b - a);
const RIGHT = new V(1, 0, -1).normalize(), DOWN = new V(1, 0, 1).normalize();
const SHELF = { bagel: -125, cream: -62, coffee: 1, drink: 64 };
/* 메뉴 숙련 ★1~5 (메뉴 이름별 판매 수) · 별 하나마다 값 +6% */
export const starOf = name => { const n = S.mast[name] || 0; let st = 1; for (let i = 1; i < MASTERY.length; i++) if (n >= MASTERY[i]) st = i + 1; return st; };
export const starK = k => 1 + (starOf(MENU[k].name) - 1) * MASTERY_K;
export const favLv = f => FAVOR.filter(x => f >= x).length;   /* 단골 하트 단계 0~5 */
/* 시간 효과 (상점 물품 · 광고 보상): S.fx[이름] = 끝나는 시각 */
export const fxOn = k => (+(S.fx && S.fx[k]) || 0) > Date.now();
/* 설비 업그레이드 단계 (외형 · 이름표): 그 설비에 붙은 업그레이드 중 가장 높은 Lv */
export const stLv = sid => Math.max(0, ...UPGRADES.filter(u => u.st === sid).map(u => L(u.id)));
export const stName = (sid, bi = S.bi) => sid === 'cc' ? (BRANCH_MENU[bi]?.cream.bar || ST_NAME.cc) : sid === 'drive' && BRANCHES[bi]?.feature === 'pickup' ? '픽업 창구' : ST_NAME[sid] || '';
/* 직원 겉모습: 고른 유니폼 (basic = 역할별 색) */
export const staffLook = k => { const d = STAFF[k], o = OUTFITS.find(x => x.id === S.outfit) || OUTFITS_PRO.find(x => x.id === S.outfit) || OUTFITS[0]; return o.id === 'basic' ? { body: d.body, apron: true, cap: d.cap || 0xFFFFFF, hair: 0x2A1A10 } : { body: o.body, apron: true, apronC: o.apronC, hat: o.hat, cap: o.cap, hair: 0x2A1A10 }; };

export class Game {
  constructor(sc, cam, ui) { this.sc = sc; this.cam = cam; this.ui = ui; this.t = 0; this.fly = []; this.fx = []; }
  build(bi) {
    const sc = this.sc; sc.clear(); this.B = BRANCHES[bi]; const B = this.B; this.bi = bi; setBranchMenu(bi); LOOK.cream = MENU.cream.look; LOOK.coffee = MENU.coffee.look;
    /* 새 지점은 앞 지점의 설비 · 방 강화 단계를 이어받음 (테스터 #11) · 이미 올린 건 높은 쪽 */
    if (bi > 0) { const br = (S.branch[bi] ||= { unl: [], staff: [], paid: {}, build: {} }); if (!br.lvFrom) { const pv = S.branch[bi - 1]?.lv || {}, lv = (br.lv ||= {}); for (const [k, v] of Object.entries(pv)) lv[k] = Math.max(lv[k] || 0, v); br.lvFrom = bi; } }
    const I = B.interior; sc.background = new THREE.Color(I.sky);
    sc.add(new THREE.HemisphereLight(I.hemi[0], I.hemi[1], I.hemi[2])); const sun = new THREE.DirectionalLight(I.sun, 2.1); sun.position.set(-500, 1200, 700); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -1300, right: 1300, top: 1300, bottom: -1300, near: 10, far: 3600 }); sun.shadow.radius = 4; sun.shadow.bias = -0.0005; sc.add(sun, sun.target); this.sun = sun;
    for (const p of this.pads || []) p.tag.remove(); for (const p of this.lvPads || []) p.tag.remove(); for (const c of [...(this.cust || []), ...(this.cars || []), ...(this.riders || [])]) c.tag && c.tag.remove(); this.ui && this.ui.floats && (this.ui.floats.innerHTML = '');   /* 지점 바꿀 때 화면 글자 정리 */
    this.ui && this.ui.tags && this.ui.tags.querySelectorAll('.nt, .zz, .evp, .rtag, .btag, .piletag').forEach(e => e.remove()); this.endEvent(true); this.placing = null; this.spin = [];   /* 설비 이름표 · 쉬는 직원 · 이벤트 · 방 이름 · 공사 */
    for (const f of this.fly) f.done && f.done(); this.fly = [];   /* 지점을 바꾸면 날던 것은 끝냄 */
    this.nexting = false; this.st = {}; this.zones = []; this.pads = []; this.lvPads = []; this.cust = []; this.cars = []; this.riders = []; this.staff = []; this.piles = []; this.room = null; this.balloonT = 90; this.balloon = null;
    const br = (S.branch[bi] ||= { unl: [], staff: [], paid: {}, build: {} }); br.build ||= {};
    this.unl = new Set(br.unl || []); B.slots.forEach(s => { if (s.free || (s.withRoom && this.unl.has(s.withRoom))) this.unl.add(s.id); });
    this.open = new Set(['shop', ...[...this.unl].filter(id => id.startsWith('R_')).map(id => id.slice(2))]);
    this.redraw();
    for (const s of B.slots) if (this.unl.has(s.id)) this.place(s, false);
    this.navObs(); this.refreshPads();
    const P = person({ ...PLAYER.look, apron: true }); P.g.position.set(290, 0, -170); sc.add(P.g);   /* 오븐 앞에서 시작 · 사장님은 셰프 모자 + 주황 앞치마 (테스터 #3) */
    this.ring = ownerRing(); sc.add(this.ring);   /* 발밑 주황 고리: 직원 사이에서도 내 위치가 보임 */
    this.pl = { P, pos: P.g.position, stack: [], kind: null, cap: this.pcap(), tick: 0, isPlayer: true, prev: P.g.position.clone() };
    this.loadStock(br.stock);   /* 지점을 오가도 진열 · 오븐 · 재료가 그대로 (테스터 #11) */
    for (const k of br.staff || []) this.hire(k, true);
    this.decoObjs = []; for (const id of S.deco[bi] || []) this.placeDeco(id, false);
    this.collectOcc();
    this.regT = 20;   /* 첫 단골은 금방 찾아옴 */
    this.calmT = 0; this.evT = EVENTS.first; this.ev = null;   /* 조작 없는 시간 (직원 쉬기) · 돌발 이벤트 */
    this.spawnT = 1; this.carT = 4; this.riderT = 12; this.bT = 0; this.camT = this.pl.pos.clone();
    this.fitView();
    /* 안내 화살표 (처음 몇 단계) */ this.arrow = new THREE.Group(); const cone = new THREE.Mesh(new THREE.ConeGeometry(26, 50, 4), M(0xFF6A3A)); cone.rotation.x = Math.PI; this.arrow.add(cone); sc.add(this.arrow); this.arrow.pos = this.pl.pos;
  }
  /* 방이 열리거나 공사가 시작/끝나면: 바닥 · 벽 · 조명 · 소품 · 걷는 곳 · 길 찾기를 다시 */
  redraw() { const B = this.B, br = S.branch[this.bi] || {}; if (this.wg) { this.sc.remove(this.wg); this.wg.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    const bRooms = new Set(Object.keys(br.build || {}).filter(id => id.startsWith('R_')).map(id => id.slice(2)));
    this.G = geom(this.open, B.feature); this.nav = new Nav(this.G); if (this.st && Object.keys(this.st).length) this.navObs(); this.wg = drawWorld(this.sc, B, this.open, bRooms, S.theme[this.bi]); drawWalls(this.wg, B, this.G, this.open, { owned: !!bm.info.owned });
    for (const [id] of Object.entries(br.build || {})) { const s = B.slots.find(x => x.id === id); if (s && s.type !== 'room') { const g = new THREE.Group(); g.position.set(s.x, 0, s.z); this.wg.add(g); for (const [x, z] of [[-80, -70], [80, -70], [-80, 70], [80, 70]]) box(10, 200, 10, 0xC8A050, x, 0, z, g); box(170, 8, 150, 0xC8A050, 0, 200, 0, g); box(60, 40, 50, 0xFF6720, 0, 0, 0, g); } }   /* 설비 공사 (저온 숙성고) */
    this.roomTags(); if (this.pl) this.fitView(); if (this.decoObjs) this.collectOcc(); }
  endCine() { if (!this.cine) return; this.cine = null; this.cam.zoom = 1; this.cam.updateProjectionMatrix(); this.ui.tierBanner(null); }
  /* 손님이 나가는 문 (0.3.5 근본 원인: 예전 new V(...door) 는 [x, z] 를 (x, y, 0) 으로 만들어 나가는 곳이 매장 가운데 계산대 옆이 됨
     → 0.3.3 부터 계산대가 길 찾기 장애물이라 거기 도착을 못 해 손님이 계산대 뒤에 쌓임) */
  doorV() { const d = this.B.door; return new V(d[0], 0, d[1]); }
  hAt(x, z) { return heightAt(this.G, x, z); }
  /* 길 찾기에 설비 몸통도 넣음 (설비가 생길 때마다) */
  navObs() { const obs = []; for (const o of Object.values(this.st)) { const sz = SIZE[o.type]; if (!sz || o.type === 'drive' || o.y) continue; const [hw, hd = hw] = o.type === 'table' ? [128, 72] : sz; obs.push([o.x, o.z, hw, hd]); } this.nav = new Nav(this.G, obs); }
  /* 가림막 흐리게 (0.3.1 대표 「야외 어닝이 테이블을 가려 쓰레기가 안 보임」): 키 큰 것(world.js occ · 파라솔 소품)이 테이블 · 설비 · 사장님 · 돈 더미 앞을 가리면 22% 로
     카메라가 바뀌어도(폰 따라가기 · PC 고정 · 창 크기) 화면에 투영해서 판단하므로 늘 맞음 */
  collectOcc() { this.occ = []; const add = o => { const mats = []; o.traverse(m => { if ((m.isMesh || m.isLine) && !m.userData.occMat) { m.material = m.material.clone(); m.material.transparent = true; m.userData.occMat = true; } if (m.material && m.userData.occMat) mats.push(m.material); }); this.occ.push({ o, b: new THREE.Box3().setFromObject(o), mats, a: 1, want: 1 }); };
    this.wg && this.wg.traverse(o => { if (o.userData.occ) add(o); }); for (const d of this.decoObjs || []) if (d.g && OCC_DECO.includes(d.id)) add(d.g); this.occT = 0; }
  occUpdate(dt) { if (!this.occ || !this.occ.length) return; if ((this.occT = (this.occT || 0) - dt) <= 0) { this.occT = 0.15; const cam = this.cam, V0 = new V(), tg = [];
      const pt = (x, y, z) => { V0.set(x, y, z); const vz = V0.clone().applyMatrix4(cam.matrixWorldInverse).z; V0.project(cam); tg.push([V0.x, V0.y, vz]); };
      for (const o of Object.values(this.st)) pt(o.x, (o.y || 0) + (o.type === 'table' ? 95 : 110), o.z); for (const p of this.piles) if (p.v > 0) pt(p.x, 10, p.z); pt(this.pl.pos.x, this.pl.pos.y + 110, this.pl.pos.z);
      for (const c of this.cust) if (c.state === 'eat') pt(c.pos.x, c.pos.y + 100, c.pos.z);
      for (const O of this.occ) { const b = O.b, cs = []; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) { V0.set(x, y, z).project(cam); cs.push([V0.x, V0.y]); }
        const x0 = Math.min(...cs.map(c => c[0])), x1 = Math.max(...cs.map(c => c[0])), y0 = Math.min(...cs.map(c => c[1])), y1 = Math.max(...cs.map(c => c[1])), cz = b.getCenter(new V()).applyMatrix4(cam.matrixWorldInverse).z;
        O.want = tg.some(([x, y, z]) => x > x0 && x < x1 && y > y0 && y < y1 && cz > z + 20) ? 0.22 : 1; } }
    for (const O of this.occ) { if (Math.abs(O.a - O.want) < 0.01) continue; O.a += (O.want - O.a) * Math.min(1, dt * 8); for (const m of O.mats) { m.opacity = O.a; m.depthWrite = O.a > 0.9; } } }
  /* 사장님 들기 · 걷기 (사장실 단계 · 예전 「더 많이 들기」 「빨리 걷기」 칸) */
  pcap() { return PLAYER.carry + L('carry') + (fxOn('tray') ? FX.tray.n : 0); }
  pspeed() { return PLAYER.speed * (1 + L('walk') * 0.06) * (fxOn('speed') ? FX.speed.k : 1); }
  /* 방 이름표 (바닥 · 열린 방은 작은 칩) */
  roomTags() { if (!this.ui || !this.ui.tags) return; this.ui.tags.querySelectorAll('.rtag').forEach(e => e.remove()); this.rtags = [];
    for (const id of this.B.rooms) { const R = ROOMS[id], on = this.open.has(id), bd = (S.branch[this.bi]?.build || {})['R_' + id]; if (id === 'shop') continue; if (!on && !bd) continue;
      const d = document.createElement('div'); d.className = 'rtag ' + (on ? (R.visit ? 'visit' : 'on') : 'bd') + ' r_' + id; d.innerHTML = on ? (R.visit ? R.en : R.name) : `🔨 ${R.name}`; this.ui.tags.prepend(d); const r = R.rect;
      this.rtags.push({ d, id, x: R.visit ? (r[0] + r[2]) / 2 : r[0] + 120, z: R.visit ? r[1] + 40 : r[1] + 70, y: R.raised ? R.raised : R.visit && on ? 250 : 0, bd }); } }
  /* 진행 = 열린 칸 / 전체 칸 (방 포함 · 같이 열리는 설비 · 계약 칸 제외) */
  countable() { return this.B.slots.filter(s => !s.free && !s.withRoom && s.type !== 'next'); }
  rate() { const all = this.countable(); return all.filter(s => this.unl.has(s.id)).length / Math.max(1, all.length); }
  // ── 설비 놓기
  place(s, anim) {
    if (s.type === 'hire' || s.type === 'up' || s.type === 'next' || s.type === 'room') return;
    const h = this.hAt(s.x, s.z), g = new THREE.Group(); g.position.set(s.x, h, s.z); if (s.look === 'picnic') g.rotation.y = Math.PI / 2; this.sc.add(g); STATION[s.look || s.type](g);   /* 피크닉 의자는 좌우(손님 자리 ±x) */
    const o = { s, g, type: s.type, x: s.x, z: s.z, y: h, stack: [], in: 0, inStack: [], t: 0, feed: [], ft: 0 };   /* 상태는 놓을 때 전부 만들어 둠 (늦게 만들면 순서에 따라 오류) · y: 2층 높이 */
    if (s.type === 'table') { o.seats = [-95, 95].map(dx => ({ x: s.x + dx, z: s.z, who: null })); o.trash = []; o.up = h > 0; if ((S.deco[this.bi] || []).includes('vase')) this.tableVase(o); }
    if (s.type === 'counter') { o.shelf = { bagel: [], cream: [], coffee: [], drink: [] }; o.cash = this.pile(s.x + 240, s.z - 30); }   /* 0.3.5: 돈 더미는 계산하는 자리(초록 칸) 바로 옆 → 직접 계산하면 저절로 주움 */
    if (s.type === 'drive') { o.glass = []; g.children.slice(0, 2).forEach(m => { m.material = m.material.clone(); m.material.transparent = true; o.glass.push(m); });   /* 벽·창: 가까이 가면 유리처럼 */
      o.cash = this.pile(s.x - 140, s.z + 210); o.lane = { bagel: [], cream: [], coffee: [], drink: [] }; }
    this.st[s.id] = o; o.Z = {}; for (const [k, dx, dz, w, d, col, ring] of ZONES[s.type] || []) o.Z[k] = this.zone(s.x + dx, s.z + dz, w, d, col, ring, h); 
    if (TIER_SZ[s.id]) { o.tier = -1; this.restyle(s.id, false); }
    if (ST_NAME[s.id] && this.ui && this.ui.nameTag) o.nt = this.ui.nameTag(stName(s.id, this.bi), o);   /* 설비 이름표 (테스터 #9) */
    if (anim) { g.scale.setScalar(0.01); this.fx.push({ t: 0, d: 0.5, f: u => g.scale.setScalar(u < 0.7 ? u / 0.7 * 1.15 : 1.15 - (u - 0.7) / 0.3 * 0.15) }); this.confetti(s.x, 120, s.z); }
  }
  // ── 꾸미기: 정해진 자리에 소품 (모든 지점 같은 배치)
  placeDeco(id, anim) {
    const d = DECO.find(x => x.id === id); if (!d || this.decoObjs.some(o => o.id === id)) return;
    if (id === 'vase') { for (const o of Object.values(this.st)) if (o.type === 'table') this.tableVase(o); this.decoObjs.push({ id }); return; }
    const [x, z] = this.decoAt(id), g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = this.decoRot(d, x, z); this.sc.add(g); DECO_MODEL[id](g); this.decoObjs.push({ id, g, x, z, r: d.r });
    if (anim) { g.scale.setScalar(0.01); this.fx.push({ t: 0, d: 0.5, f: u => g.scale.setScalar(u < 0.7 ? u / 0.7 * 1.15 : 1.15 - (u - 0.7) / 0.3 * 0.15) }); this.confetti(x, 120, z); }
    if (OCC_DECO.includes(id) && this.occ) setTimeout(() => this.collectOcc(), anim ? 600 : 0);
  }
  decoAt(id) { const d = DECO.find(x => x.id === id), p = S.decoPos[this.bi]?.[id]; return p && Number.isFinite(p[0] + p[1]) ? p : d.pos; }
  /* 벽 소품 방향: 모델은 원래 벽(back = +z 를 봄 · left = +x 를 봄) 기준 → 다른 벽에 붙이면 돌림 */
  decoRot(d, x, z) { if (!d.wall) return 0; const on = this.wallOf(x, z); return on === d.wall ? 0 : d.wall === 'back' ? Math.PI / 2 : -Math.PI / 2; }
  wallOf() { return 'back'; }   /* v2: 벽 소품은 뒷벽(반죽실 · 공방 · 커피 바)에 */
  // ── 꾸미기 자리 고르기 (테스터 #13 사기 전 미리 보기 · #14 놓은 뒤 옮기기): 반투명 그림자를 끌어서 옮김 · 초록 = 놓을 수 있음 · 빨강 = 겹침
  //   mode 'buy' | 'move' · 정하면 confirmPlace · 그만두면 cancelPlace
  startPlace(id, mode) { this.cancelPlace(); const d = DECO.find(x => x.id === id); if (!d || !d.pos) return null;
    const g = new THREE.Group(); DECO_MODEL[id](g); this.sc.add(g); const own = this.decoObjs.find(o => o.id === id); if (own && own.g) own.g.visible = false;
    const P = this.placing = { id, d, g, mode, own, x: 0, z: 0, ok: true, shadow: null };
    const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2A1A10, transparent: true, opacity: 0.22, depthWrite: false })); sh.position.y = 6; this.sc.add(sh); P.shadow = sh;   /* 놓일 자리 음영 */
    const om = new THREE.MeshBasicMaterial({ color: 0x5FCB6A }), ol = new THREE.Group(); for (let i = 0; i < 4; i++) ol.add(new THREE.Mesh(new THREE.BoxGeometry(1, 4, 1), om)); this.sc.add(ol); P.outline = ol; P.om = om;   /* 놓일 자리 테두리 (0.3.3 테스터 #22 · 초록 OK · 빨강 안 됨) */
    let [x, z] = this.decoAt(id); if (!this.decoOk(id, x, z)) { const f = this.freeSpot(id, x, z); if (f) [x, z] = f; }
    this.movePlace(x, z); return P; }
  movePlace(x, z) { const P = this.placing; if (!P) return; const d = P.d, [hw, hd] = decoHalf(d);
    if (d.wall) { const al = d.wall === 'back' ? hw : hd; z = BACK_Z + (d.id === 'bench' ? 50 : 15); x = Math.max(-650 + 20 + al, Math.min(1250 - 40 - al, x)); }   /* 뒷벽을 따라 */
    else if (d.id === 'terrace') { z = 450 + 180; x = Math.max(-250 + hw, Math.min(220 - hw + 280, x)); }   /* 파라솔은 가게 앞 바깥 · 손님 줄은 비움 */
    else { x = Math.max(-1250 + hw, Math.min(1250 - hw, x)); z = Math.max(-1150 + hd, Math.min(1050 - hd, z)); }
    P.x = x; P.z = z; P.g.position.set(x, 0, z); P.g.rotation.y = this.decoRot(d, x, z); const ok = this.decoOk(d.id, x, z); if (ok !== P.ok || !P.painted) { ghostify(P.g, ok); P.painted = true; } P.ok = ok;
    const rot = P.g.rotation.y !== 0, sw = rot ? hd : hw, sd = rot ? hw : hd; P.shadow.position.set(x, 6, z); P.shadow.scale.set(sw * 1.1, 1, sd * 1.1); P.shadow.material.color.set(ok ? 0x2A6A2A : 0xC0302A); P.shadow.material.opacity = 0.3;
    const W2 = sw * 2 + 16, D2 = sd * 2 + 16, [e1, e2, e3, e4] = P.outline.children; P.outline.position.set(x, 8, z); e1.scale.set(W2, 1, 6); e1.position.set(0, 0, -D2 / 2); e2.scale.set(W2, 1, 6); e2.position.set(0, 0, D2 / 2); e3.scale.set(6, 1, D2); e3.position.set(-W2 / 2, 0, 0); e4.scale.set(6, 1, D2); e4.position.set(W2 / 2, 0, 0); P.om.color.set(ok ? 0x3ED05A : 0xE8403A); }
  confirmPlace() { const P = this.placing; if (!P || !P.ok) return false; ((S.decoPos[this.bi] ||= {}))[P.id] = [Math.round(P.x), Math.round(P.z)];
    this.sc.remove(P.g); this.sc.remove(P.shadow); this.sc.remove(P.outline); this.placing = null;
    if (P.mode === 'move' && P.own) { P.own.g.visible = true; P.own.x = P.x; P.own.z = P.z; P.own.g.position.set(P.x, 0, P.z); P.own.g.rotation.y = this.decoRot(P.d, P.x, P.z); this.confetti(P.x, 100, P.z); save(); }
    return true; }
  cancelPlace() { const P = this.placing; if (!P) return; this.sc.remove(P.g); this.sc.remove(P.shadow); this.sc.remove(P.outline); if (P.own && P.own.g) P.own.g.visible = true; this.placing = null; }
  /* 놓을 수 있나: 설비(아직 안 연 것 포함) · 동작 칸 · 열기 칸 · 손님 줄 · 다른 소품과 안 겹침 · 러그는 바닥이라 테이블 · 열기 칸 위도 됨(동작 칸은 가리면 안 됨) */
  decoOk(id, x, z) { const d = DECO.find(q => q.id === id); if (!d) return false; const [hw0, hd0] = decoHalf(d), rot = this.decoRot(d, x, z) !== 0, hw = rot ? hd0 : hw0, hd = rot ? hw0 : hd0, flat = id === 'rug';
    const hit = (bx, bz, bw, bd) => Math.abs(x - bx) < hw + bw / 2 - 8 && Math.abs(z - bz) < hd + bd / 2 - 8;   /* 8: 살짝 닿는 건 봐줌 */
    const openAt = (px, pz) => [...this.open].some(id2 => !ROOMS[id2].visit && inR(ROOMS[id2].rect, px, pz));   /* 열린 방(방문형 방 제외) */
    if (d.wall) { if (!openAt(x - hw + 10, BACK_Z + 60) || !openAt(x + hw - 10, BACK_Z + 60)) return false; }
    else if (d.id !== 'terrace' && !(openAt(x - hw, z - hd) && openAt(x + hw, z + hd) && openAt(x - hw, z + hd) && openAt(x + hw, z - hd))) return false;
    if (HANG.includes(id)) { for (const o of this.decoObjs) if (o.id !== id && o.g && HANG.includes(o.id) && hit(o.x, o.z, ...decoHalf(DECO.find(q => q.id === o.id)).map(v => v * 2))) return false; }   /* 벽에 거는 것끼리만 */
    for (const sl of this.B.slots) { const sz = SIZE[sl.type];
      if (sz && sl.type !== 'drive' && !(flat && sl.type === 'table')) { const [w, dd] = sl.type === 'table' ? [256, 144] : [sz[0] * 2 + 30, (sz[1] || sz[0]) * 2 + 30]; if (hit(sl.x, sl.z, w, dd)) return false; }
      if (!flat && !sl.free && !sl.withRoom && !this.unl.has(sl.id) && hit(sl.px ?? sl.x, sl.pz ?? sl.z, PAD, PAD)) return false;
      for (const [, dx, dz, w, dd, , ring] of ZONES[sl.type] || []) if (!ring && hit(sl.x + dx, sl.z + dz, w, dd)) return false; }
    if (!flat && hit(360, 900, 170, 900)) return false;   /* 손님 줄 · 문 */
    for (const w of this.G.walls) if (!d.wall && hit(w.x, w.z, w.hw * 2, w.hd * 2)) return false;
    for (const o of this.decoObjs) { if (o.id === id || !o.g || HANG.includes(o.id)) continue; const od = DECO.find(q => q.id === o.id); if (flat !== (o.id === 'rug')) continue; const [w2, d2] = decoHalf(od); if (hit(o.x, o.z, w2 * 2, d2 * 2)) return false; }
    return true; }
  freeSpot(id, x0, z0) { const d = DECO.find(q => q.id === id); for (let r = 40; r < 2400; r += 40) for (let a = 0; a < 16; a++) { let x = x0 + Math.cos(a / 16 * 6.283) * r, z = z0 + Math.sin(a / 16 * 6.283) * r; if (d?.wall) z = BACK_Z + (id === 'bench' ? 50 : 15); if (x > -1250 && x < 1250 && z > -1150 && z < 1050 && this.decoOk(id, x, z)) return [x, z]; } return null; }
  tableVase(o) { if (o.vase) return; const g = new THREE.Group(); g.position.set(o.x, 88 + (o.y || 0), o.z - 30); this.sc.add(g); DECO_MODEL.vase(g); o.vase = g; }
  scent() { return (S.deco[this.bi] || []).reduce((a, id) => a + (DECO.find(d => d.id === id)?.score || 0), 0); }   /* 베이글 향 */
  addDeco(id, at) { const l = (S.deco[this.bi] ||= []); if (l.includes(id)) return false; l.push(id); if (at) ((S.decoPos[this.bi] ||= {}))[id] = at;
    else if (DECO.find(x => x.id === id)?.pos && !this.decoOk(id, ...this.decoAt(id))) { const f = this.freeSpot(id, ...this.decoAt(id)); if (f) ((S.decoPos[this.bi] ||= {}))[id] = f.map(Math.round); }   /* 선물로 받은 소품: 기본 자리가 막혔으면 가까운 빈 곳 */
    this.placeDeco(id, true); save(); return true; }
  // ── 설비 외형 단계 (테스터 #6): 업그레이드 Lv 3 · 6 · 9 에서 바뀜
  restyle(sid, anim = true) { const o = this.st[sid]; if (!o || !TIER_SZ[sid]) return; const t = tierOf(stLv(sid)); if (t === o.tier) return; const up = o.tier >= 0 && t > o.tier; o.tier = t;
    if (o.tierG) { o.g.remove(o.tierG); this.spin = this.spin.filter(m => !o.tierG.children.includes(m)); } o.tierG = tierDeco(sid === 'cc' ? 'ccbar' : sid, t, TIER_SZ[sid]); o.g.add(o.tierG); for (const m of o.tierG.children) if (m.userData.spin) this.spin.push(m);
    if (up && anim) { this.confetti(o.x, 200, o.z); setTimeout(() => this.confetti(o.x, 240, o.z), 400); for (let i = 0; i < 4; i++) setTimeout(() => this.sparkle(new V(o.x + rnd(-80, 80), 120 + rnd(0, 80), o.z + rnd(-50, 50))), i * 200); sfx('levelup', { vol: 0.7 }); this.fx.push({ t: 0, d: 0.9, f: u => o.g.scale.setScalar(1 + Math.sin(u * Math.PI) * 0.15) });
      this.cine = { x: o.x, z: o.z, t: 0, d: 1.8 }; this.ui.tierBanner(stName(sid), TIER_NAME[t - 1], TIER_NAME[t], () => this.endCine()); }   /* 외형 단계(Lv 3 · 6 · 9) 연출 1.8초 · 누르면 건너뜀 (0.3.3 테스터 #24) — 일반 단계는 짧은 알림만 */
    if (o.nt) o.nt._h = null; }
  // ── 지점 재고 (테스터 #11): 지점을 떠나도 진열대 · 오븐 · 재료 · 드라이브스루 줄이 그대로 남음 · 손에 든 것은 제자리로 돌아간 것으로 셈
  stockOf() { const st = this.st, c = st.counter, ov = st.oven, cnt = a => [a.length, a.filter(x => x.m.userData.prem).length]; if (!c || !ov) return null;
    const o = { shelf: {}, oven: cnt(ov.stack), feed: (ov.feed || []).slice(0, 12), cc: st.cc ? [st.cc.stack.length, st.cc.inStack.length] : null, cf: st.coffee ? st.coffee.stack.length : 0, es: st.espresso ? st.espresso.stack.length : 0, mx: st.mixer ? st.mixer.stack.length : 0, lane: null };
    for (const [k, a] of Object.entries(c.shelf)) o.shelf[k] = cnt(a); if (st.drive) { o.lane = {}; for (const [k, a] of Object.entries(st.drive.lane)) o.lane[k] = cnt(a); }
    for (const w of [this.pl, ...this.staff]) { const n = w.stack.length, k = w.kind; if (!n) continue; if (k === 'bagel') { o.oven[0] += n; o.oven[1] += w.stack.filter(x => x.m.userData.prem).length; } else if (k === 'cream' && o.cc) o.cc[0] += n; else if (k === 'coffee') o.cf += n; else if (k === 'drink') o.es += n; else if (k === 'dough') o.mx += n; }
    return o; }
  snap() { if (!this.B || this.nexting) return; const br = (S.branch[this.bi] ||= { unl: [], staff: [], paid: {} }); br.stock = this.stockOf(); }
  /* 지점을 떠날 때: 재고 저장 + 바닥에 쌓인 돈은 챙겨 감 (예전: 떠나면 사라짐) */
  leave() { this.snap(); let v = 0; for (const p of this.piles) { v += Math.round(p.v); p.v = 0; } if (v > 0) { S.coins += v; S.earned += v; } this.cancelPlace(); return v; }
  loadStock(o) { if (!o || typeof o !== 'object') return; const st = this.st, c = st.counter, ov = st.oven, n = (v, m) => Math.max(0, Math.min(m, Math.floor(+v || 0)));
    const many = (arr, kind, [N, pr], max, pos, look) => { const k = n(N, max), p = n(pr, k); for (let i = 0; i < k; i++) { const prem = kind === 'bagel' && i < p, m = item(prem ? 'prem' : look || kind); if (prem) m.userData.prem = true; this.put(arr, m, ...pos(arr.length), kind); } };
    const arr2 = v => Array.isArray(v) ? v : [v, 0];
    if (c && o.shelf) for (const k of Object.keys(c.shelf)) if (o.shelf[k]) many(c.shelf[k], k, arr2(o.shelf[k]), 12, i => [c.x + SHELF[k] + (i % 2) * 26 - 13, 114 + Math.floor(i / 2) * ITEM_H[k], c.z + 18]);
    if (ov && o.oven) many(ov.stack, 'bagel', arr2(o.oven), 10 + L('ovenCap') * 2, i => this.home('bagel').pos(i)); if (ov && Array.isArray(o.feed)) ov.feed = o.feed.slice(0, 12).map(Boolean);
    if (st.cc && o.cc) { many(st.cc.stack, 'cream', [o.cc[0], 0], 8, i => this.home('cream').pos(i)); many(st.cc.inStack, 'bagel', [o.cc[1], 0], 8, i => [st.cc.x - 70 + (i % 2) * 34, 107 + Math.floor(i / 2) * 16, st.cc.z + 30]); }
    if (st.coffee && o.cf) many(st.coffee.stack, 'coffee', [o.cf, 0], 8, i => this.home('coffee').pos(i));
    if (st.espresso && o.es) many(st.espresso.stack, 'drink', [o.es, 0], 8, i => this.home('drink').pos(i));
    if (st.mixer && o.mx) many(st.mixer.stack, 'dough', [o.mx, 0], 8, i => this.home('dough').pos(i));
    if (st.drive && o.lane) { const dv = st.drive; for (const k of Object.keys(dv.lane)) if (o.lane[k]) many(dv.lane[k], k, arr2(o.lane[k]), 9, i => [dv.x + 40 + (i % 3) * 26, 104 + Math.floor(i / 3) * ITEM_H[k], dv.z + LANE[k]]); } }
  // 동작 칸: 바닥에 그린 칸 = 실제로 동작하는 범위 (들어서면 밝아짐)
  zone(x, z, w, d, col, ring, y = 0) { if (ring === 2) return { x, z, w, d, hidden: true, g: { visible: true } };   /* 직원 목표 지점만 */
    const g = new THREE.Group(); g.position.set(x, y, z); this.sc.add(g);
    if (ring) { /* 테이블 둘레 테두리: 어느 쪽에서 다가가도 됨 */ const mt = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.75 }); for (const [sx, sz, sw, sd] of [[0, -d / 2, w, 16], [0, d / 2, w, 16], [-w / 2, 0, 16, d], [w / 2, 0, 16, d]]) { const e = new THREE.Mesh(new THREE.BoxGeometry(sw, 3, sd), mt); e.position.set(sx, 1.5, sz); g.add(e); }
      const Z = { x, z, w, d, g, inner: { material: mt }, col: new THREE.Color(col), ring: true }; this.zones.push(Z); return Z; }
    const edge = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 })); edge.position.y = 1.5; g.add(edge);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(w - 14, 4, d - 14), new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.6 })); inner.position.y = 2; g.add(inner);
    const Z = { x, z, w, d, g, inner, col: new THREE.Color(col) }; (this.zones ||= []).push(Z); return Z; }
  in(w, Z) { return !!Z && Z.g.visible && Math.abs(w.pos.x - Z.x) < Z.w / 2 && Math.abs(w.pos.z - Z.z) < Z.d / 2; }
  pile(x, z) { const p = { x, z, v: 0, meshes: [] }; this.piles.push(p); return p; }
  addCash(p, v) { p.v += v; const n = Math.min(36, Math.ceil(p.v / Math.max(1, 6 * this.B.mult))); while (p.meshes.length < n) { const i = p.meshes.length, m = box(40, 10, 24, 0x6FCB7A, p.x + (i % 3) * 44 - 44, Math.floor(i / 6) * 11, p.z + (Math.floor(i / 3) % 2) * 28, this.sc); p.meshes.push(m); } }
  // ── 열기 칸: 열리지 않은 것 중 앞의 2개 (방이 아직 안 열린 칸 · 공사 중 · 계약 칸(90% 전)은 건너뜀) + 크루룸 · 사장실 강화 칸
  padPos(s, i) { if (s.type === 'hire' && this.open.has('crew')) return CREW_HIRE[i % 2]; return [s.px ?? s.x, s.pz ?? s.z]; }
  refreshPads() {
    for (const p of this.pads) { this.sc.remove(p.g); p.tag.remove(); } this.pads = []; for (const p of this.lvPads) { this.sc.remove(p.g); p.tag.remove(); } this.lvPads = [];
    const br = S.branch[this.bi] || {}, bd = br.build || {}, rate = this.rate();
    const reach = (x, z) => [...this.open].some(id => inR(ROOMS[id].rect, x, z)), seenAt = new Set(), next = this.B.slots.filter(s => !s.free && !s.withRoom && !this.unl.has(s.id) && !bd[s.id] && (s.type === 'room' ? reach(s.x, s.z) : this.open.has(s.room)) && (s.type !== 'next' || rate >= FINISHED_RATE)).filter(s => { const k = (s.px ?? s.x) + ',' + (s.pz ?? s.z); if (s.type !== 'hire' || !this.open.has('crew')) { if (seenAt.has(k)) return false; seenAt.add(k); } return true; }).slice(0, 2);   /* 같은 자리 칸은 하나씩 */   /* 방 칸은 그 칸이 열린 방 안에 있을 때만 */
    let hi = 0; for (const s of next) { const [x, z] = this.padPos(s, s.type === 'hire' ? hi++ : 0), h = this.hAt(x, z), g = new THREE.Group(); g.position.set(x, h, z); this.sc.add(g);
      const room = s.type === 'room', col = room ? (s.build ? 0xFFE9C8 : 0xFFFFFF) : s.type === 'hire' ? 0xFFE2CC : 0xFFFFFF;
      const { fill, look } = padLook(g, PAD, room ? 0xFF8A3C : s.type === 'hire' ? 0xFFB24A : 0xFFD24A, 0xFFD24A);
      const paid = br.paid?.[s.id] || 0; const tag = this.ui.tag(); this.pads.push({ s, g, fill, look, paid, tag, x, z, y: h }); this.updPad(this.pads[this.pads.length - 1]); }
    /* 방문형 방: 강화 칸 (서 있으면 돈이 빠져나감) · 📺 무료 칸 */
    for (const [room, list] of Object.entries(ROOM_UP)) { if (!this.open.has(room)) continue; const P0 = LV_PADS[room];
      const step = (S.roomStep || {})[room] || 0, pr = step ? null : this.ui.primary && this.ui.primary(room);   /* 처음엔 첫 할 일 칸만 (0.3.1) */
      list.forEach((u, i) => { if (step || (pr && pr.k === 'lv' && pr.u.id === u.id)) this.lvPad(room, u, P0[i]); }); if (step) this.lvPad(room, { id: 'free', name: '무료 1단계', icon: '📺' }, P0[list.length]); }
    /* 설비 강화 칸 (0.3.1 · 원작처럼 몸이 직접 감): 설비 앞 옆 바닥 · 그 설비 업그레이드 중 낮은 것 1단계 · HUD 「설비」 창은 보조로 남김 */
    for (const sid of Object.keys(EQ_PAD)) { const o = this.st[sid]; if (!o) continue; const us = UPGRADES.filter(u => u.st === sid && u.id !== 'price'); if (!us.length) continue; const at = this.eqSpot(sid) || this.eqFallback(sid); if (at) this.lvPad(null, { id: 'eq_' + sid, eq: sid, us, icon: '⬆', name: stName(sid) }, at); }
  }
  lvPad(room, u, [x, z]) { const g = new THREE.Group(); g.position.set(x, 0, z); this.sc.add(g); const free = u.id === 'free', S2 = u.eq ? 120 : 140;   /* g · S2 는 ring() 이 씀 */
    const { fill, look } = padLook(g, S2, free ? 0x5AB0E8 : u.eq ? 0xFFD24A : room === 'crew' ? 0x6FD0A0 : 0xFFB24A, free ? 0x8ACCF2 : 0xFFD24A);
    const tag = this.ui.tag(); tag.classList.add('lv'); if (free) tag.classList.add('free'); const p = { room, u, g, fill, look, tag, x, z, S2, free }; this.lvPads.push(p); this.updLv(p); }
  /* 설비 강화 칸 자리 (0.3.4 긴급 「팔아도 돈이 안 늚」): 예전엔 동작 칸 바로 옆 → 오븐 앞에서 기다리다 멈추면 돈이 강화 칸으로 새어 나감
     → 그 설비 방 안에서, 모든 동작 칸과 60 · 설비 몸통 · 다른 칸과 20 이상 떨어진 가장 가까운 자리 (지점 전체 배치 기준이라 칸이 열려도 안 움직임) */
  eqSpot(sid) { const B = this.B, key = this.bi + ':' + sid; (this._eqc ||= {}); if (key in this._eqc) return this._eqc[key]; const me = B.slots.find(x => x.id === sid); if (!me) return null; const RS = [ROOMS[me.room]?.rect || ROOMS.shop.rect], H = 60;   /* 그 설비가 있는 방 안에서만 */
    const box = [], zon = []; for (const sl of B.slots) { const sz = SIZE[sl.look === 'picnic' ? 'table' : sl.type]; if (sz && sl.type !== 'drive') { const [hw, hd = hw] = sl.type === 'table' ? [128, 72] : sz; box.push([sl.x, sl.z, hw + 10, hd + 10]); } for (const [, dx, dz, w, d, , ring] of ZONES[sl.type] || []) if (!ring) zon.push([sl.x + dx, sl.z + dz, w / 2, d / 2]);
      if (!sl.free && !sl.withRoom) box.push([sl.px ?? sl.x, sl.pz ?? sl.z, PAD / 2 + 10, PAD / 2 + 10]); }
    const ct = B.slots.find(x => x.id === 'counter'); zon.push([ct.x + 230, ct.z + 30, 130, 70]);   /* 돈 더미 줍는 자리 */
    for (const q of [...CREW_HIRE, ...Object.values(LV_PADS).flat()]) box.push([q[0], q[1], PAD / 2 + 10, PAD / 2 + 10]); for (const k of Object.keys(this._eqc)) if (k.startsWith(this.bi + ':') && this._eqc[k]) box.push([this._eqc[k][0], this._eqc[k][1], 140, 140]);
    for (const ZM of [60, 50]) for (const R of RS) for (let r = 160; r < 900; r += 30) for (let a = 0; a < 24; a++) { const x = me.x + Math.cos(a / 24 * 6.283) * r, z = me.z + Math.sin(a / 24 * 6.283) * r; if (x - H < R[0] + 20 || x + H > R[2] - 20 || z - H < R[1] + 20 || z + H > R[3] - 20) continue;
      if (box.some(([bx, bz, w, d]) => Math.abs(x - bx) < w + H && Math.abs(z - bz) < d + H) || zon.some(([bx, bz, w, d]) => Math.abs(x - bx) < w + H + ZM && Math.abs(z - bz) < d + H + ZM)) continue; return (this._eqc[key] = [Math.round(x), Math.round(z)]); }
    return (this._eqc[key] = null); }
  /* 빈자리가 없으면: 이미 열린 칸(직원 뽑기 · 방 열기)이 쓰던 자리를 물려받음 (그 칸은 다시 안 나옴) */
  eqFallback(sid) { const me = this.B.slots.find(x => x.id === sid), room = me.room === 'shop' || !me.room ? 'shop' : me.room, used = this.lvPads.filter(p => p.u.eq).map(p => [p.x, p.z]);
    const zs = []; for (const o of Object.values(this.st)) for (const Z of Object.values(o.Z)) if (!Z.hidden && !Z.ring) zs.push(Z);
    const c = this.B.slots.filter(x => !x.free && !x.withRoom && x.type !== 'next' && this.unl.has(x.id) && (x.type === 'room' ? inR(ROOMS[room].rect, x.x, x.z) : x.room === room) && x.type !== 'table').map(x => x.type === 'hire' && this.open.has('crew') ? null : [x.px ?? x.x, x.pz ?? x.z]).filter(Boolean)
      .filter(([x, z]) => !used.some(u => Math.hypot(u[0] - x, u[1] - z) < 130) && zs.every(Z => Math.max(Math.abs(x - Z.x) - Z.w / 2, Math.abs(z - Z.z) - Z.d / 2) >= 60 + 50)).sort((a, b) => Math.hypot(a[0] - me.x, a[1] - me.z) - Math.hypot(b[0] - me.x, b[1] - me.z));
    return c[0] || null; }
  lvCost(id) { return Math.round([...ROOM_UP.crew, ...ROOM_UP.boss].find(u => u.id === id).base * 1.6 * Math.pow(1.6, L(id)) * this.B.mult / 5) * 5; }
  eqU(p) { return p.u.us.filter(u => L(u.id) < UP_MAX).sort((a, b) => L(a.id) - L(b.id))[0] || null; }   /* 그 설비에서 다음에 올릴 것 (낮은 단계 먼저) */
  eqCost(p) { const u = this.eqU(p); return u ? upCost(u, L(u.id), this.B.mult) : Infinity; }
  eqUp(p) { const u = this.eqU(p); if (!u) return; const br = S.branch[this.bi]; (br.lv ||= {})[u.id] = L(u.id) + 1; (br.lvPaid ||= {})[p.u.id] = 0; sfx('levelup', { vol: 0.5 }); this.ui.note(`${stName(p.u.eq)} · ${u.name} Lv.${L(u.id)}!`); this.restyle(p.u.eq); this.confetti(p.x, 60, p.z); this.updLv(p); save(); this.ui.progress(); }
  updLv(p) { if (p.u.eq) { const u = this.eqU(p), paid = (S.branch[this.bi].lvPaid ||= {})[p.u.id] || 0, c = this.eqCost(p), f = u ? Math.min(1, paid / c) : 1; p.fill.scale.z = Math.max(0.001, f); p.fill.position.z = -(p.S2 - 36) / 2 * (1 - f); p.tag.innerHTML = u ? `<i class="c"></i>${fmt(c - paid)}<small>⬆ ${u.name.replace(/ ?(성능|속도|늘리기|연구|손 빠르게|확장)$/, m => m)} Lv.${L(u.id) + 1}</small>` : `⬆ ${p.u.name}<small>MAX</small>`; return; }
    if (p.free) { p.tag.innerHTML = `📺 무료<small>${p.room === 'crew' ? '직원' : '사장님'} 1단계</small>`; return; } const lv = L(p.u.id), max = lv >= ROOM_UP_MAX, br = S.branch[this.bi], paid = (br.lvPaid ||= {})[p.u.id] || 0, c = this.lvCost(p.u.id), u = max ? 1 : Math.min(1, paid / c);
    p.fill.scale.z = Math.max(0.001, u); p.fill.position.z = -(p.S2 - 36) / 2 * (1 - u); p.tag.innerHTML = max ? `${p.u.icon} ${p.u.name}<small>MAX</small>` : `<i class="c"></i>${fmt(c - paid)}<small>${p.u.icon} ${p.u.name} Lv.${lv + 1}</small>`; }
  /* 강화 한 단계 (바닥 칸 · 창 버튼 · 광고/골드 무료) */
  levelUp(id, why) { const br = (S.branch[this.bi] ||= { unl: [], staff: [], paid: {}, build: {} }), lv = (br.lv ||= {}); if ((lv[id] || 0) >= ROOM_UP_MAX) return false; lv[id] = (lv[id] || 0) + 1; if (id === 'tip') lv.ads = lv.tip; (br.lvPaid ||= {})[id] = 0;
    const u = [...ROOM_UP.crew, ...ROOM_UP.boss].find(x => x.id === id); sfx('levelup', { vol: 0.5 }); this.ui.note(`${u.icon} ${u.name} Lv.${lv[id]}!${why ? ' · ' + why : ''}`); this.pl.cap = this.pcap(); const P0 = this.lvPads.find(p => p.u.id === id); if (P0) { this.confetti(P0.x, 60, P0.z); this.updLv(P0); }
    save(); this.ui.progress(); const rm = ROOM_UP.crew.some(x => x.id === id) ? 'crew' : 'boss'; if (!((S.roomStep || {})[rm])) this.ui.roomNext(rm); this.ui.roomSheet && this.ui.roomSheet(this.room, true); return true; }
  /* 되돌리기 (바닥 칸으로 잘못 올렸을 때 · 몇 초 안): 단계 하나 내리고 낸 돈 돌려줌 */
  undoLevel(id, cost) { const br = S.branch[this.bi], lv = br?.lv; if (!lv || !(lv[id] > 0)) return false; lv[id]--; if (id === 'tip') lv.ads = lv.tip; S.coins += cost; this.pl.cap = this.pcap(); const st = UPGRADES.find(u => u.id === id)?.st; if (st) this.restyle(st, false); for (const P0 of this.lvPads) this.updLv(P0); save(); this.ui.progress(); this.ui.roomSheet && this.ui.roomSheet(this.room, true); return true; }
  updPad(p) { const u = Math.min(1, p.paid / p.s.cost); p.fill.scale.z = Math.max(0.001, u); p.fill.position.z = -(PAD - 36) / 2 * (1 - u); const s = p.s, R = s.type === 'room' && ROOMS[s.room];
    p.tag.classList.toggle('room', !!R); p.tag.innerHTML = `<i class="c"></i>${fmt(s.cost - p.paid)}<small>${R ? `${s.build ? '🔨 ' : ''}${R.name}${s.build ? ` · ${hms(s.build)}` : ''}` : s.type === 'hire' && this.open.has('crew') ? `👤 ${STAFF[s.staff].name}` : (s.label || NAMES[s.type] || '') + (s.build ? ` · 🔨 ${hms(s.build)}` : '')}</small>`; }
  unlock(p) {
    const s = p.s; if (this.unl.has(s.id)) return; const br = (S.branch[this.bi] ||= { unl: [], staff: [], paid: {}, build: {} }); delete br.paid[s.id];
    if (s.build > 0 && !(br.build ||= {})[s.id]) { br.build[s.id] = Date.now() + s.build * 1000; save(true); sfx('unlock', { vol: 0.8 }); mission('unlock'); track('bg_room', { b: this.bi, r: s.room || s.id, st: 'build' });
      this.ui.note(`🔨 ${s.type === 'room' ? ROOMS[s.room].name : s.label} 공사 시작! ${hms(s.build)} 뒤 완성 · 그동안 다른 칸도 열 수 있어요`); this.confetti(p.x, 80, p.z); this.redraw(); this.refreshPads(); this.ui.progress(); return; }
    this.finish(s, true); }
  /* 칸 · 방이 실제로 열림 (공사 끝 · 즉시 완성 · 바로 여는 칸) */
  finish(s, direct) {
    if (this.unl.has(s.id)) return; (window.unlockLog ||= []).push([s.id, Math.round(this.t), this.bi]); console.log('#unlock', s.id, Math.round(this.t)); this.unl.add(s.id); const br = (S.branch[this.bi] ||= { unl: [], staff: [], paid: {}, build: {} }); delete (br.build || {})[s.id];
    if (direct) { sfx('unlock', { vol: 0.8 }); mission('unlock'); }
    if (s.type === 'room') { const R = ROOMS[s.room]; this.open.add(s.room); for (const m of this.B.slots) if (m.withRoom === s.id) { this.unl.add(m.id); this.place(m, true); }
      this.navObs();
      br.unl = [...this.unl]; this.redraw(); track('bg_room', { b: this.bi, r: s.room, st: 'open' }); const c = R.rect; this.confetti((c[0] + c[2]) / 2, 160, (c[1] + c[3]) / 2); sfx('levelup', { vol: 0.6 });
      if (!direct || s.build) this.ui.built(s); else this.ui.note(`🎉 ${R.name} 열림!${R.visit ? ' · 들어가 보세요' : ''}`);
    }
    else { br.unl = [...this.unl];
      if (s.type === 'hire') this.hire(s.staff);
      else if (s.type === 'next') { /* 한 번만: 칸을 지우고 다음 지점 창 */ for (const q of this.pads) { this.sc.remove(q.g); q.tag.remove(); } this.pads = []; this.nexting = true; save(true); track('bg_branch', { b: this.bi + 1, st: 'contract' }); this.ui.nextBranch(this.bi + 1); return; }
      else { this.place(s, true); this.navObs(); if (s.type === 'mixer') this.ui.note('반죽을 오븐에 넣으면 플레인 2개가 바로 구워져요!'); if (s.type === 'kettle') this.ui.note('반죽을 들고 솥 칸을 지나가면 데쳐져요 → 오븐에서 쫄깃 플레인(값 1.5배)!'); if (s.type === 'retard') this.ui.note('🌙 저온 숙성고: 밤새 숙성된 반죽이 쌓여요 → 오븐에서 쫄깃 플레인!'); if (s.type === 'drive') setTimeout(() => this.fitView(), 0); if (!direct) this.ui.built(s); } }
    save(); this.refreshPads(); this.ui.progress();
    if (this.rate() >= 1 && !br.done) { br.done = Date.now(); track('bg_branch', { b: this.bi, st: 'done' }); this.ui.branchDone(this.bi); }
  }
  /* 공사 끝났나 (0.5초마다) · now: 즉시 완성 */
  buildTick(now) { const br = S.branch[this.bi]; if (!br || !br.build) return; for (const [id, end] of Object.entries(br.build)) if (now === id || Date.now() >= end) { const s = this.B.slots.find(x => x.id === id); if (!s) { delete br.build[id]; continue; } this.finish(s, false); } }
  buildLeft(id) { const e = S.branch[this.bi]?.build?.[id]; return e ? Math.max(0, (e - Date.now()) / 1000) : 0; }
  hire(k, silent) {
    const P = person(staffLook(k)); const c = this.st.counter;
    const pos = k === 'cashier' ? [c.Z.cash.x, c.Z.cash.z] : this.open.has('crew') && !silent ? [CREW_HIRE[0][0], CREW_HIRE[0][1]] : [c.x - 200 + Math.random() * 80, c.z - 200]; P.g.position.set(pos[0], 0, pos[1]); this.sc.add(P.g);
    const w = { k, P, pos: P.g.position, stack: [], kind: null, cap: STAFF[k].carry || 4, state: 'idle', tick: 0, restAt: REST.after + rnd(0, REST.spread), rest: false }; this.staff.push(w);
    if (!silent) { const br = (S.branch[this.bi] ||= { unl: [], staff: [], paid: {} }); if (!br.staff.includes(k)) br.staff.push(k); this.confetti(pos[0], 160, pos[1]); this.ui.note(STAFF[k].hello); }
  }
  /* 유니폼을 바꾸면 직원 겉모습만 새로 (위치 · 든 물건 그대로) */
  restaff() { for (const w of this.staff) { const P = person(staffLook(w.k)); P.g.position.copy(w.pos); P.g.rotation.y = w.P.g.rotation.y; while (w.P.hand.children.length) P.hand.add(w.P.hand.children[0]); this.sc.remove(w.P.g); this.sc.add(P.g); w.P = P; w.pos = P.g.position; if (w.rest) this.restPose(w, true); } }
  // ── 직원 쉬기 (테스터 #10): 화면을 안 만진 지 restAt 초 → 손이 비면 쉼(💤) · 사장님이 다가가면 다시 일하고 잠깐 힘이 남 (벌이 아니라 반가운 일)
  restAI(w) {
    if (w.rest) { if (this.near(w, this.pl.pos.x, this.pl.pos.z, REST.near)) { w.rest = false; this.restPose(w, false); w.boostT = this.t + REST.boost; w.restAt = REST.after + rnd(0, REST.spread);
        this.ui.float(['다시 힘낼게요!', '네, 사장님!', '바로 할게요!'][Math.floor(Math.random() * 3)], w.pos.clone().setY(260), 'say'); sfx('blip', { vol: 0.3, rate: 1.3 }); this.sparkle(w.pos.clone().setY(150)); mission('wake'); }
      return; }
    if (w.k !== 'cashier' && this.calmT > w.restAt && !w.stack.length && !this.nexting && !this.staff.some(x => x.rest) && this.t > (this.restNext || 0)) { w.rest = true; this.restPose(w, true); this.restNext = this.t + REST.gap; for (const x of this.staff) if (x !== w) x.restAt = Math.max(x.restAt, this.calmT + REST.gap * (1 + Math.random())); } }   /* 한 번에 한 명만 · 다음 사람은 REST.gap 초 뒤 (0.3.3 테스터 #20) */
  restPose(w, on) { w.P.body.rotation.x = on ? 0.32 : 0; w.P.carry = false; for (const a of w.P.arms) a.rotation.x = on ? 0.2 : 0; }
  staffK(w) { return (fxOn('staff') ? FX.staff.k : 1) * ((w.boostT || 0) > this.t ? REST.boostK : 1); }   /* 직원 응원 커피 · 깨운 뒤 기운 */
  // ── 매 프레임
  update(dt, input) {
    this.t += dt; const pl = this.pl; const mult = this.B.mult * this.incK();
    // 이동 (벽 · 잠긴 방에 막힘 → 미끄러짐)
    const mv = new V().addScaledVector(RIGHT, input.x).addScaledVector(DOWN, input.y); const ml = Math.min(1, mv.length()); pl.prev.copy(pl.pos);
    if (ml > 0.08) { mv.normalize(); const sp = this.pspeed() * ml; pl.pos.addScaledVector(mv, sp * dt); pl.P.g.rotation.y = Math.atan2(mv.x, mv.z); this.calmT = 0; } else this.calmT += dt;   /* calmT: 조작 없는 시간 (직원 쉬기) */
    pl.cap = this.pcap();   /* 사장실 들기 단계 + 큰 쟁반 */
    this.collide(pl.pos, 34, pl.prev); pl.pos.y = this.hAt(pl.pos.x, pl.pos.z);
    this.still = Math.hypot(pl.pos.x - pl.prev.x, pl.pos.z - pl.prev.z) < 35 * dt;   /* 실제로 안 움직일 때만 바닥 칸 시간을 셈 (0.3.3: 예전엔 입력 기준 → 벽 · 잠긴 방 쪽으로 밀고 있으면 영원히 「움직이는 중」이라 창고 · 크루룸 칸이 안 채워짐, 테스터 #3 · #4) */ pl.P.carry = pl.stack.length > 0; pl.P.anim(dt, ml > 0.08);
    this.ring.position.set(pl.pos.x, pl.pos.y, pl.pos.z); this.ring.userData.ring.scale.setScalar(1 + Math.sin(this.t * 4) * 0.06);
    { const zk = this.zoneKey(pl); if (zk && zk === this.dwK) this.dwT += dt; else { this.dwK = zk; this.dwT = 0; } }   /* 같은 칸에 머문 시간 (지나가며 바꾸기 막기 · 0.3.1) */
    this.interact(pl, dt); this.roomUpdate(dt);
    // 직원
    for (const w of this.staff) { this.restAI(w); if (w.rest) { w.P.anim(dt, false); continue; } this.staffAI(w, dt); w.pos.y = this.hAt(w.pos.x, w.pos.z); }
    for (const m of this.spin) m.rotation.y += dt * 1.6; this.occUpdate(dt);
    this.eventUpdate(dt);
    // 오븐 · 크림치즈 · 커피 생산
    const ov = this.st.oven; ov.t += dt; ov.feed ||= []; const ovCap = 10 + L('ovenCap') * 2; ov.ft = (ov.ft || 0) + dt; const ovPos = () => [ov.x - 60 + (ov.stack.length % 5) * 30, 12 + Math.floor(ov.stack.length / 5) * 16, ov.z + 100];
    if (!this.st.mixer && !ov.feed.length) { ov.sb = (ov.sb || 0) + dt; if (ov.sb > 2.4 / (1 + L('oven') * 0.15) && ov.stack.length < ovCap) { ov.sb = 0; this.put(ov.stack, item('bagel'), ...ovPos(), 'bagel'); } }   /* 반죽실이 열리기 전(작은 가게): 오븐이 천천히 스스로 구움 */
    const rt = this.st.retard; if (rt) { rt.t += dt; if (rt.t > 6 / (1 + L('mixer') * 0.1) && rt.stack.length < 10) { rt.t = 0; const m = item('boiled'); m.userData.b = true; this.put(rt.stack, m, rt.x - 50 + (rt.stack.length % 4) * 32, 6 + Math.floor(rt.stack.length / 4) * 16, rt.z + 80, 'dough'); } }   /* 저온 숙성고: 숙성 반죽(쫄깃) */
    if ((this.bT -= dt) <= 0) { this.bT = 0.5; this.buildTick(); }
    if (ov.feed.length && ov.ft > 0.35 / (1 + L('oven') * 0.15) && ov.stack.length < ovCap) { ov.ft = 0; const prem = ov.feed.shift(); const m = item(prem ? 'prem' : 'bagel'); m.userData.prem = prem; this.put(ov.stack, m, ...ovPos(), 'bagel'); if (prem) this.sparkle(m.position); }   /* 넣은 반죽 빠르게 굽기 */
    /* 오븐은 넣은 반죽만 구움 (스스로 굽지 않음) */
    const es = this.st.espresso; if (es) { es.t += dt; if (es.t > 1.5 / (1 + L('espresso') * 0.15) && es.stack.length < 8) { es.t = 0; this.put(es.stack, item('drink'), es.x - 40 + (es.stack.length % 3) * 30, 107 + Math.floor(es.stack.length / 3) * 30, es.z + 25, 'drink'); } }
    const mx = this.st.mixer; if (mx) { mx.t += dt; if (mx.t > 1.2 / (1 + L('mixer') * 0.15) && mx.stack.length < 8) { mx.t = 0; this.put(mx.stack, item('dough'), mx.x - 40 + (mx.stack.length % 3) * 30, 6 + Math.floor(mx.stack.length / 3) * 14, mx.z + 80, 'dough'); } }
    if (this.st.kettle) { this.st.kettle.t += dt; if (this.st.kettle.t > 0.4) { this.st.kettle.t = 0; this.steam(this.st.kettle.x, 135, this.st.kettle.z); } }
    const cc = this.st.cc; if (cc) { cc.t += dt; if (cc.inStack.length && cc.t > 0.9 / (1 + L('bar') * 0.15) && cc.stack.length < 8) { cc.t = 0; const m = cc.inStack.pop(); this.sc.remove(m.m); this.put(cc.stack, item('cream'), cc.x + 40 + (cc.stack.length % 2) * 36, 107 + Math.floor(cc.stack.length / 2) * 18, cc.z + 30, 'cream'); } }
    const cf = this.st.coffee; if (cf) { cf.t += dt; if (cf.t > 1.6 / (1 + L('fridge') * 0.15) && cf.stack.length < 8) { cf.t = 0; this.put(cf.stack, item('coffee'), cf.x - 30 + (cf.stack.length % 3) * 30, 164 + Math.floor(cf.stack.length / 3) * 30, cf.z + 10, 'coffee'); } }
    // 손님
    this.spawnT -= dt; const qMax = 6; const inQ = this.cust.filter(c => c.state === 'queue' || c.state === 'walkQ').length;
    if (this.spawnT <= 0 && inQ < qMax) { this.spawnT = Math.max(1.2, 5 - this.unl.size * 0.22) / (1 + L('ads') * 0.1) / (1 + this.scent() / 300) / (fxOn('rush') || this.ev?.type === 'influencer' ? FX.rush.k : 1) * rnd(0.8, 1.2); this.spawnCustomer(); }   /* 전단지 · 인플루언서: 손님 두 배 */
    this.regT -= dt; if (this.regT <= 0 && inQ < qMax) { this.regT = rnd(60, 110); const R0 = this.nextRegular(); if (R0) this.spawnCustomer(R0); }
    this.serve(dt, mult); for (const c of this.cust) { this.custAI(c, dt); c.pos.y = this.hAt(c.pos.x, c.pos.z) + (c.state === 'eat' ? 12 : 0); }
    this.balloonUpdate(dt);
    this.cust = this.cust.filter(c => { if (c.gone) { this.sc.remove(c.P.g); c.tag && c.tag.remove(); return false; } return true; });
    // 드라이브스루
    if (this.st.drive) { this.driveUpdate(dt, mult); const dv = this.st.drive, near = pl.pos.x > dv.x - 320 && Math.abs(pl.pos.z - dv.z) < 300; for (const m of dv.glass) { const t = near ? 0.25 : 1; m.material.opacity += (t - m.material.opacity) * Math.min(1, dt * 8); m.material.depthWrite = m.material.opacity > 0.9; } }
    if (this.st.rider) this.riderUpdate(dt, mult);
    // 날아가는 물건 · 연출
    for (let i = this.fly.length - 1; i >= 0; i--) { const f = this.fly[i]; f.born ??= this.t; f.t += dt / Math.max(0.05, f.d || 0.2); if (this.t - f.born > 3 || !Number.isFinite(f.t)) f.t = 1;   /* 날아가는 물건은 3초 안에 꼭 도착 (0.3.1) */
      const u = Math.min(1, f.t); let to = typeof f.to === 'function' ? f.to() : f.to; if (!to || !Number.isFinite(to.x + to.y + to.z)) to = f.from;
      f.m.position.lerpVectors(f.from, to, u); f.m.position.y += Math.sin(u * Math.PI) * 70; if (u >= 1) { this.fly.splice(i, 1); f.done && f.done(); } }
    for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.t += dt / f.d; f.f(Math.min(1, f.t)); if (f.t >= 1) this.fx.splice(i, 1); }
    for (const Z of this.zones) { const on = this.in(pl, Z); if (Z.ring) { Z.inner.material.opacity = on ? 1 : 0.6; continue; } Z.inner.material.color.copy(on ? Z.col : WHITE); Z.inner.material.opacity = on ? 0.85 : 0.55; }
    // 안내: 다음에 할 일 (설비 3개 열 때까지)
    let gd = this.guide(dt); if (gd) { const w = this.nav.next(this.arrow, gd[0], gd[1]); if (w) gd = [w[0], w[1], gd[2]]; }   /* 다른 방이면 문 쪽을 가리킴 */
    /* 화살표는 휙휙 튀지 않게 (0.3.2 대표): 새 목표가 0.5초 이어질 때만 바꾸고 · 자리는 미끄러지듯 따라감(초당 최대 1600) · 움직임은 위아래 살랑만 */
    const A = this.arw ||= { tgt: null, cand: null, ct: 0, x: 0, z: 0, on: false };
    if (!gd) { A.cand = null; A.ct = 0; if (A.tgt && (A.off = (A.off || 0) + dt) > 0.4) { A.tgt = null; } } else { A.off = 0; const same = A.tgt && Math.hypot(gd[0] - A.tgt[0], gd[1] - A.tgt[1]) < 40;
      if (!A.tgt) { A.tgt = gd; A.x = gd[0]; A.z = gd[1]; } else if (same) A.tgt = gd; else { if (!A.cand || Math.hypot(gd[0] - A.cand[0], gd[1] - A.cand[1]) > 40) { A.cand = gd; A.ct = 0; } A.ct += dt; if (A.ct > 0.5) { A.tgt = gd; A.cand = null; } } }
    this.arrow.visible = !!A.tgt; if (A.tgt) { const dx = A.tgt[0] - A.x, dz = A.tgt[1] - A.z, l = Math.hypot(dx, dz), st = Math.min(l, Math.max(l * dt * 6, 0) , 1600 * dt); if (l > 0.1) { A.x += dx / l * st; A.z += dz / l * st; }
      this.arrow.position.set(A.x, this.hAt(A.x, A.z) + 150 + Math.sin(this.t * 4) * 10, A.z); this.arrow.rotation.y += dt * 2; } this.ui.hint(A.tgt && A.tgt[2]);
    // 카메라 · 그림자 따라감
    if (this.cine) { const C = this.cine; C.t += dt; if (C.t >= C.d) this.endCine(); }
    if (this.cine) { this.camT.lerp((this._ct ||= new V()).set(this.cine.x, 0, this.cine.z), Math.min(1, dt * 6)); const z = 1 + 0.45 * Math.sin(Math.min(1, this.cine.t / this.cine.d) * Math.PI); if (this.cam.zoom !== z) { this.cam.zoom = z; this.cam.updateProjectionMatrix(); } }   /* 외형 단계 연출: 카메라가 다가감 */
    else if (this.fitT && !this.placing) this.camT.copy(this.fitT); else { const tg = (this._ct ||= new V()).copy(this.placing ? this.placing.g.position : pl.pos); if (this.ui.sheetOn && this.ui.sheetOn()) tg.addScaledVector(DOWN, 200); tg.y = 0; this.camT.lerp(tg, Math.min(1, dt * 5)); }   /* 방 창이 아래를 덮으면 방이 위쪽에 보이게 */   /* 꾸미기 자리 고를 땐 그림자를 따라감 */   /* 넓은 화면: 매장 전체 고정 · 폰: 주인공 따라감 */ this.cam.position.set(this.camT.x + 900, 1150, this.camT.z + 900); this.cam.lookAt(this.camT.x, 0, this.camT.z);
    this.sun.position.set(this.camT.x - 500, 1200, this.camT.z + 700); this.sun.target.position.copy(this.camT);
    this.ui.frame(this);
  }
  // ── 화면 맞춤: 넓은 화면(PC · 태블릿 가로)은 매장 전체(간판 ~ 계산대 · 줄 · 드라이브스루)를 HUD 를 피한 영역에 담아 고정
  //   폰(세로)이나 너무 작아지는 화면은 지금처럼 주인공을 따라감 · 창 크기가 바뀌면 다시 (main.js fit)
  fitView() { const cam = this.cam, w = innerWidth, h = innerHeight, z = this.hudZ || 1; if (!this.B) return;
    const follow = () => { const S2 = w / h < 0.8 ? 1150 : 680; cam.left = -S2 * w / h; cam.right = S2 * w / h; cam.top = S2; cam.bottom = -S2; cam.updateProjectionMatrix(); this.fitT = null; };
    if (w / h < 0.8 && Math.min(w, h) < 700) return follow();   /* 폰 세로: 그대로 */
    const P = [], X0 = -1250, X1 = 1250, Z0 = -1150, Z1 = 1050;   /* 건물 전체 (잠긴 방도 점선으로 보임) */
    for (const [x, zz] of [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]]) P.push([x, 0, zz]); for (const [x, zz] of [[X0, Z0], [X1, Z0], [X0, 450]]) P.push([x, 280, zz]);
    P.push([360, 230, 1000], [430, 230, 1100]);   /* 문 앞 · 줄 끝 손님과 말풍선 */
    if (this.st.drive) P.push([1440, 130, -200], [1440, 130, 1200]);   /* 창구 줄 */
    const c0 = new THREE.OrthographicCamera(); c0.position.set(900, 1150, 900); c0.lookAt(0, 0, 0); c0.updateMatrixWorld(); const v = new V(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of P) { v.set(...p).applyMatrix4(c0.matrixWorldInverse); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
    const L = 86 * z, R0 = 86 * z, T = 64 * z, Bt = 86 * z, k = Math.max((x1 - x0) / (w - L - R0), (y1 - y0) / (h - T - Bt));   /* 화면 1px 당 세계 크기 */
    if (!(k > 0) || k > 4.2) return follow();   /* 너무 작게 보이면 따라가기 (폰 가로 등) */
    cam.left = -w / 2 * k; cam.right = w / 2 * k; cam.top = h / 2 * k; cam.bottom = -h / 2 * k; cam.updateProjectionMatrix();
    const ox = (x0 + x1) / 2 - (L - R0) / 2 * k, oy = (y0 + y1) / 2 - (Bt - T) / 2 * k, rt = new V().setFromMatrixColumn(c0.matrixWorld, 0), up = new V().setFromMatrixColumn(c0.matrixWorld, 1);
    this.fitT = new V().addScaledVector(rt, ox).addScaledVector(up, oy); this.camT && this.camT.copy(this.fitT); }
  /* 부딪힘: 소품 · 설비 · 방 벽 → 밀어냄 · prev(사장님): 열린 방 밖이면 미끄러지거나 제자리 */
  collide(p, r, prev) {
    for (const o of this.decoObjs || []) if (o.r) { const d = Math.hypot(p.x - o.x, p.z - o.z), m = o.r + r; if (d < m && d > 0.1) { p.x = o.x + (p.x - o.x) / d * m; p.z = o.z + (p.z - o.z) / d * m; } }
    for (const o of Object.values(this.st)) { const [hw, hd] = SIZE[o.type] || [0, 0]; if (!hw) continue; if (Math.abs((o.y || 0) - (p.y || 0)) > 60) continue;
      if (o.type === 'bin' || o.type === 'plant') { const d = Math.hypot(p.x - o.x, p.z - o.z), m = hw + r; if (d < m && d > 0.1) { p.x = o.x + (p.x - o.x) / d * m; p.z = o.z + (p.z - o.z) / d * m; } continue; }
      const dx = p.x - o.x, dz = p.z - o.z, ox = hw + r - Math.abs(dx), oz = hd + r - Math.abs(dz); if (ox > 0 && oz > 0) { if (ox < oz) p.x += Math.sign(dx) * ox; else p.z += Math.sign(dz) * oz; } }
    for (const w of this.G.walls) { const dx = p.x - w.x, dz = p.z - w.z, ox = w.hw + r - Math.abs(dx), oz = w.hd + r - Math.abs(dz); if (ox > 0 && oz > 0) { if (ox < oz) p.x += Math.sign(dx || 1) * ox; else p.z += Math.sign(dz || 1) * oz; } }
    if (prev && !this.nav.ok(p.x, p.z, r)) { if (this.nav.ok(p.x, prev.z, r)) p.z = prev.z; else if (this.nav.ok(prev.x, p.z, r)) p.x = prev.x; else if (this.nav.ok(prev.x, prev.z, r)) { p.x = prev.x; p.z = prev.z; }
      else { const R0 = ROOMS.shop.rect; p.x = Math.max(R0[0] + 60, Math.min(R0[2] - 60, p.x)); p.z = Math.max(R0[1] + 60, Math.min(R0[3] - 60, p.z)); } }   /* 어디에도 못 서면 매대 안으로 (저장 위치가 잠긴 곳 등) */
  }
  /* 수익 배수: 광고 수익 2배 · VIP ×1.5 (계획안 4-5: 과금 속도 무과금의 2배 이하) */
  incK() { return (this.ui.boost() ? 2 : 1) * (vipOn() ? VIP.mult : 1); }
  /* 지금 서 있는 방 · 방 바닥 칸 · 금고 */
  /* 바닥 칸 진행 링 (멈춰 선 시간) */
  padRing(P0, u) { if (!P0.ringG) { const g = new THREE.Group(), n = 20, r = (P0.S2 || PAD) / 2 - 6; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, m = new THREE.Mesh(RING_G, RING_M); m.position.set(Math.sin(a) * r, 12, -Math.cos(a) * r); m.rotation.y = -a; g.add(m); } P0.g.add(g); P0.ringG = g; }
    const k = Math.round(Math.max(0, Math.min(1, u)) * P0.ringG.children.length); P0.ringG.children.forEach((m, i) => { m.visible = i < k; }); }
  roomUpdate(dt) { const p = this.pl.pos;
    const glow = 0.75 + Math.sin(this.t * 4) * 0.25; for (const q of [...this.pads, ...this.lvPads]) if (q.look) { const can = q.free ? true : q.u ? S.coins >= (q.u.eq ? this.eqCost(q) : this.lvCost(q.u.id)) : S.coins >= q.s.cost - q.paid; q.look.em.opacity = can ? glow : 0.4; q.look.plate.material.opacity = can ? 0.85 : 0.5; }   /* 살 수 있으면 은은히 빛남 · 모자라면 흐림 */
    for (const q of this.pads) { const on = Math.abs(p.x - q.x) < PAD / 2 && Math.abs(p.z - q.z) < PAD / 2; if (on && this.still) q.st = (q.st || 0) + dt; else q.st = 0; this.padRing(q, q.st ? q.st / PAD_STAY : 0); }   /* 돈 붓는 칸도 같은 기준 */ let rid = null; for (const id of ['crew', 'boss', 'store']) if (this.open.has(id) && inR(ROOMS[id].rect, p.x, p.z)) rid = id;
    if (rid !== this.room) { const was = this.room; this.room = rid; if (rid) { this.ui.roomSheet(rid); if (rid === 'crew') { const w = this.staff.find(x => !x.rest && inR(ROOMS.crew.rect, x.pos.x, x.pos.z)) || this.staff.find(x => !x.rest); if (w) this.ui.float('사장님 오셨어요! 👋', w.pos.clone().setY(250), 'say'); }   /* 인사는 한 명만 */ } else this.ui.roomSheet(null, false, was); }
    for (const P0 of this.lvPads) { const on = Math.abs(p.x - P0.x) < P0.S2 / 2 && Math.abs(p.z - P0.z) < P0.S2 / 2; if (P0.free) { if (on && !P0.on) { P0.on = true; this.ui.freeLevel(P0.room); } if (!on) P0.on = false; continue; }
      if (!on || !this.still) { P0.st = 0; if (!on) P0.lock = false; this.padRing(P0, 0); continue; } if (P0.lock) continue; P0.st = (P0.st || 0) + dt; this.padRing(P0, P0.st / PAD_STAY); if (P0.st < PAD_STAY) continue;   /* 멈춰 서서 0.8초 · 한 단계 끝나면 나갔다 들어와야 다음 (0.3.2 대표 「지나가기만 해도 업그레이드」) */
      const eq = !!P0.u.eq; if (!on || S.coins <= 0 || (eq ? !this.eqU(P0) : L(P0.u.id) >= ROOM_UP_MAX)) continue; P0.tk = (P0.tk || 0) - dt; if (P0.tk > 0) continue; P0.tk = 0.03; const br = S.branch[this.bi], lp = (br.lvPaid ||= {}), c = eq ? this.eqCost(P0) : this.lvCost(P0.u.id), paid = lp[P0.u.id] || 0, pay = Math.min(c - paid, S.coins, Math.max(1, Math.ceil(c / 30)));
      S.coins -= pay; lp[P0.u.id] = paid + pay; sfx('coin', { vol: 0.15, rate: 1.4 }); if (lp[P0.u.id] >= c) { const id = eq ? this.eqU(P0)?.id : P0.u.id; eq ? this.eqUp(P0) : this.levelUp(P0.u.id); P0.lock = true; P0.st = 0; this.padRing(P0, 0); this.ui.undo(id, c); } else this.updLv(P0); }
    if (S.manager && (this.mgT = (this.mgT || 0) + dt) > 3) { this.mgT = 0; let v = 0; for (const q of this.piles) if (q.v > 0) { v += Math.round(q.v); q.v = 0; for (const m of q.meshes) this.sc.remove(m); q.meshes = []; } if (v) { S.coins += v; S.earned += v; this.ui.float('🎖 +' + fmt(v), this.pl.pos.clone().setY(260), 'cash'); } }   /* 베테랑 점장: 바닥 돈 자동 수거 */
    if (this.open.has('boss') && S.safe.v > 0 && Math.hypot(p.x - SAFE_AT[0], p.z - SAFE_AT[1]) < 120) { if (!this.safeOn) { this.safeOn = true; this.ui.safe(); } } else this.safeOn = false; }
  /* 베이글 풍선 (광고 자리 balloon · 2~3분마다 15초): 0.3.1 — 예전엔 커진 베이글이 사장님 옆을 따라다녀(PC 고정 화면에서 대각선으로 둥둥) 버그처럼 보임
     → 나타난 자리(매장 안 · 사장님 근처)에 「고정」 · 위아래로만 살랑 · 주황 풍선 + 끈 + 작은 베이글 · 15초 뒤 꼭 사라짐 */
  balloonUpdate(dt) { const b = this.balloon; if (b) { b.t -= dt; b.g.position.set(b.x, 300 + Math.sin(this.t * 2) * 14, b.z); b.g.rotation.y = Math.sin(this.t) * 0.3; if (b.t <= 0) this.popBalloon(false); return; }
    if ((this.balloonT -= dt) > 0 || this.nexting || !this.ui.slotOk('balloon')) return; this.balloonT = rnd(120, 180);
    const p = this.pl.pos; let x = p.x + 120, z = p.z - 120; if (!this.nav.ok(x, z, 10)) { x = p.x; z = p.z; }
    const g = new THREE.Group(); const bl = sph(46, 0xFF8A3C, 0, 40, 0, g, 16, 12); bl.scale.set(1, 1.18, 1); sph(10, 0xFFC8A0, -14, 64, 24, g, 8, 6);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 110, 4), M(0x8A6A4A)); str.position.y = -60; g.add(str); const m = item('bagel'); m.position.y = -118; g.add(m);
    g.position.set(x, 300, z); this.sc.add(g); this.balloon = { g, t: 15, x, z }; this.ui.balloon(true); }   /* 자리를 먼저 (예전: 첫 프레임은 원점에 그려져 단추가 휙 튐) */
  popBalloon(got) { const b = this.balloon; if (!b) return; this.sc.remove(b.g); this.balloon = null; this.ui.balloon(false); if (got) this.sparkle(b.g.position); }
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
  srcAt(w) { const L0 = [['mixer', 'out', 'dough'], ['retard', 'out', 'dough'], ['oven', 'out', 'bagel'], ['cc', 'io', 'cream'], ['coffee', 'out', 'coffee'], ['espresso', 'out', 'drink']];
    for (const [id, z, kind] of L0) { const o = this.st[id]; if (o && this.in(w, o.Z[z])) return { o, kind }; } return null; }
  /* 지금 선 동작 칸 (주고받기가 일어나는 칸만) */
  zoneKey(w) { for (const [id, k] of [['mixer', 'out'], ['retard', 'out'], ['oven', 'out'], ['cc', 'io'], ['coffee', 'out'], ['espresso', 'out'], ['bin', 'drop'], ['kettle', 'io']]) { const o = this.st[id]; if (o && this.in(w, o.Z[k])) return id + '.' + k; } return null; }
  /* 멈춤 기준 (0.3.4 정리): 집기 · 진열 · 투입 · 계산 · 돈 줍기 = 바로 · 손에 든 것을 「바꾸기 · 반납」만 DWELL 초 머물러야 (0.3.1 대표) · 돈을 쓰는 칸(강화 · 구역 열기)은 멈춰 서서 PAD_STAY 초 */
  stay(w) { return !w.isPlayer || this.dwT >= DWELL; }
  interact(w, dt) {
    w.tick -= dt; if (w.tick > 0) return; const step = () => { w.tick = 0.07; };
    const full = w.stack.length >= w.cap;
    // 집기: 오븐 · 크림치즈 · 커피 · 쓰레기
    const ov = this.st.oven; ov.feed ||= [];
    if ((w.kind === 'dough' || w.kind === 'boiled') && this.in(w, ov.Z.out)) { const it = w.stack.pop(); const prem = !!it.m.userData.b; w.P.hand.remove(it.m); if (!w.stack.length) w.kind = null; ov.feed.push(prem, prem); sfx('drop', { vol: 0.25, rate: 0.8 }); mission('dough'); return step(); }
    const es = this.st.espresso; if (es && !full && (!w.kind || w.kind === 'drink') && this.in(w, es.Z.out) && es.stack.length) { this.take(es.stack, w); sfx('pick', { vol: 0.25 }); return step(); }
    const mx = this.st.mixer; if (mx && !full && (!w.kind || w.kind === 'dough') && this.in(w, mx.Z.out) && mx.stack.length) { this.take(mx.stack, w); sfx('pick', { vol: 0.2, rate: 0.8 }); return step(); }
    const rt = this.st.retard; if (rt && !full && (!w.kind || w.kind === 'dough') && this.in(w, rt.Z.out) && rt.stack.length) { this.take(rt.stack, w); sfx('pick', { vol: 0.2, rate: 0.7 }); return step(); }   /* 숙성 반죽 */
    const kt = this.st.kettle; if (kt && w.kind === 'dough' && this.in(w, kt.Z.io)) {   /* 솥 칸을 지나가면 손에 든 반죽이 하나씩 데쳐짐 */
      const it = w.stack.find(x => !x.m.userData.b); if (it) { const i = w.stack.indexOf(it), pos = it.m.position.clone(); w.P.hand.remove(it.m); const m = item('boiled'); m.userData.b = true; m.position.copy(pos); w.P.hand.add(m); it.m = m;
        this.steam(kt.x, 130, kt.z); sfx('blip', { vol: 0.2, rate: 0.7 + i * 0.05 }); w.tick = 0.15 / (1 + L('kettle') * 0.12); return; } }
    if (w.isPlayer && w.kind) { const sa = this.srcAt(w);   /* 다른 재료 칸에 서면 손에 든 것은 제자리로 → 다음 순간 새 것을 집음 */
      if (sa && sa.o.stack.length && sa.kind !== w.kind && !(w.kind === 'dough' && sa.kind === 'bagel') && !(w.kind === 'bagel' && sa.kind === 'cream' && sa.o.inStack.length < 8) && this.stay(w)) {
        const nm = NAMES2[w.kind] ? NAMES2[w.kind]() : '', to = this.sendHome(w); if (to) this.say(`${nm ? josa(nm, '은/는') + ' ' : ''}${josa(to, '으로/로')} 돌려놨어요`, 'swap'); sfx('drop', { vol: 0.25, rate: 1.2 }); return step(); }
      if (sa && sa.kind === w.kind && full && sa.o.stack.length) this.say('손이 가득 찼어요', 'full-hand'); }
    if (!full && (!w.kind || w.kind === 'bagel') && this.in(w, ov.Z.out) && ov.stack.length) { this.take(ov.stack, w); sfx('pick', { vol: 0.25, rate: 1 + w.stack.length * 0.05 }); return step(); }
    const cc = this.st.cc; if (cc && this.in(w, cc.Z.io)) {
      if (w.kind === 'bagel' && cc.inStack.length < 8) {   /* 토핑 바 투입은 자연스러운 일 → 바로 (0.3.4) */ const i = cc.inStack.length; this.give(w, cc.inStack, [cc.x - 70 + (i % 2) * 34, 107 + Math.floor(i / 2) * 16, cc.z + 30]); sfx('drop', { vol: 0.2 }); return step(); }
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
    const bin = this.st.bin; if (w.kind && w.kind !== 'trash' && w.isPlayer && this.in(w, bin.Z.drop) && this.stay(w)) { const nm = NAMES2[w.kind]?.() || '', to = this.sendHome(w); if (to) this.say(`${nm ? josa(nm, '은/는') + ' ' : ''}${josa(to, '으로/로')} 돌려놨어요`, 'swap'); return step(); }   /* 쓰레기통: 물건은 버리지 않고 제자리로 (잃는 것 없음) */
    if (w.kind === 'trash' && this.in(w, bin.Z.drop)) {   /* 쓰레기 버리기 */ const it = w.stack.pop(); w.P.hand.remove(it.m); if (!w.stack.length) w.kind = null; sfx('drop', { vol: 0.2 }); if (it.kind === 'trash') mission('clean'); return step(); }
    if (!w.isPlayer) return;
    // 돈 줍기
    for (const p of this.piles) if (p.v > 0 && this.near(w, p.x, p.z + 20, 140)) { const v = Math.round(p.v); S.coins += v; S.earned += v; mission('coins', v); p.v = 0; const ms = p.meshes; p.meshes = [];
      ms.forEach((m, i) => { const from = m.position.clone(); setTimeout(() => this.fly.push({ m, from, to: () => w.pos.clone().setY(120), t: 0, d: 0.25, done: () => this.sc.remove(m) }), i * 18); });
      sfx('coin', { vol: 0.5 }); this.ui.float('+' + fmt(v), w.pos, 'cash'); save(); return step(); }
    // 열기 칸에 돈 붓기
    if (this.nexting) return;
    for (const p of this.pads) if (Math.abs(w.pos.x - p.x) < PAD / 2 && Math.abs(w.pos.z - p.z) < PAD / 2 && S.coins > 0 && (p.st || 0) >= PAD_STAY) {   /* 멈춰 서서 PAD_STAY 초 뒤부터 (지나가면 안 붓기 · 0.3.2) · 칸 자리는 p.x/p.z (크루룸으로 옮긴 뽑기 칸도) */ const need = p.s.cost - p.paid, pay = Math.min(need, S.coins, Math.max(1, Math.ceil(p.s.cost / 30))); S.coins -= pay; p.paid += pay;
      const br = (S.branch[this.bi] ||= { unl: [], staff: [], paid: {} }); br.paid[p.s.id] = p.paid; this.updPad(p); sfx('coin', { vol: 0.15, rate: 1.4 });
      const m = cyl(10, 10, 4, 0xF2B533, 0, 0, 0, this.sc, 10); m.position.copy(w.pos).setY(120); this.fly.push({ m, from: m.position.clone(), to: new V(p.s.x, 10, p.s.z), t: 0, d: 0.2, done: () => this.sc.remove(m) });
      if (p.paid >= p.s.cost) { this.unlock(p); } w.tick = 0.03; return; }
  }
  // ── 계산: 계산원(또는 주인공)이 계산대 뒤에 있으면 맨 앞 손님 주문을 진열대에서 채워 줌
  serve(dt, mult) {
    const c = this.st.counter; c.t -= dt; if (c.t > 0) return; const behind = this.in(this.pl, c.Z.cash);
    const cashier = this.staff.find(w => w.k === 'cashier' && !w.rest) || (behind ? this.pl : null);   /* 쉬는 계산원 대신 사장님이 받을 수 있음 */
    const f = this.cust.find(x => x.state === 'queue' && x.qi === 0); if (!f || !cashier) return;
    const need = f.order.find(o => o.got < o.n); if (!need) return;
    const sh = c.shelf[need.k]; if (!sh.length) return;
    c.t = cashier.isPlayer ? 0.32 : STAFF.cashier.serve / (1 + this.sl('cashier') * 0.12) / this.staffK(cashier); const it = sh.pop(); const wp = it.m.position.clone(); if (it.m.userData.prem) f.prem = (f.prem || 0) + 1;
    this.fly.push({ m: it.m, from: wp, to: () => f.pos.clone().setY(100), t: 0, d: 0.2, done: () => { this.sc.remove(it.m); } }); need.got++; sfx('blip', { vol: 0.3, rate: 1.2 });
    if (f.order.every(o => o.got >= o.n)) { let v = Math.round((f.order.reduce((a, o) => a + MENU[o.k].price * o.n * starK(o.k), 0) + (f.prem || 0) * MENU.bagel.price * this.premK()) * mult * this.priceK() * (f.group ? EVENTS.group.k : 1)); if (f.prem) this.ui.float('쫄깃 플레인!', new V(c.x + 60, 200, c.z), 'tip');
      if (f.group) { this.ui.float(`단체 주문 완료! ×${EVENTS.group.k}`, new V(c.x, 260, c.z), 'tip'); this.confetti(c.x + 110, 160, c.z + 200); if (this.ev?.cust === f) this.endEvent(); const gv = v; setTimeout(() => this.ui.event2x(gv, '👥 단체 주문 완료'), 600); }
      /* 손님 기분: 빨리 받으면 하트 + 팁 · 오래 기다리면 시무룩 (팁만 없음) */ const wt = f.w || 0, happy = wt <= MOOD.happy; f.mood = happy ? 2 : wt <= MOOD.ok ? 1 : 0;
      let tip = 0; if (happy) tip += Math.round(v * MOOD.tip); if (Math.random() < L('tip') * 0.05 + this.scent() / 2000 + (this.ev?.type === 'influencer' ? 0.35 : 0)) tip += Math.max(1, Math.round(v * 0.5));
      if (tip) { v += tip; setTimeout(() => this.ui.float('팁 +' + fmt(tip), new V(c.x + 110, 170, c.z), 'tip'), 250); }
      this.ui.float(happy ? '♥' : f.mood ? '🙂' : '😐', f.pos.clone().setY(250), happy ? 'heart' : 'pay'); for (const o of f.order) this.addMast(o.k, o.n); this.addCash(c.cash, v); this.ui.float('+' + fmt(v), new V(c.x + 110, 120, c.z), 'pay'); sfx('order', { vol: 0.4 });
      addSold(f.order.reduce((a, o) => a + o.n, 0)); mission('serve'); this.ui.progress(); this.checkout(f); }
  }
  checkout(f) {
    if (f.reg) this.regServed(f);
    f.tag && (f.tag.remove(), f.tag = null); for (const o of f.order) for (let i = 0; i < o.n && i < 3; i++) { const m = item(o.k); m.scale.setScalar(0.8); f.P.hand.add(m); m.position.y = i * 14; } f.P.carry = true;
    const seat = Math.random() < 0.6 && this.freeSeat(); this.cust.forEach(x => { if (x.state === 'queue' && x.qi > 0) x.qi--; });
    if (seat) { seat.s.who = f; f.seat = seat; f.state = 'toSeat'; f.target = new V(seat.s.x, 0, seat.s.z); } else { f.state = 'leave'; f.target = this.doorV(); } this.reQ();
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
  reQ() { const [q, gap] = this.B.queue, c = this.st.counter; let i = 0; for (const x of this.cust) if (x.state === 'queue' || x.state === 'walkQ') { x.qi = i++; x.target = new V(c.x + 110, 0, c.z + QZ + x.qi * gap); } }   /* QZ: 말풍선이 계산대를 가리지 않게 (테스터 #8) */
  custAI(c, dt) {
    /* 안전장치: 앉으러 가거나 나가는 손님이 6초 넘게 제자리면 문으로 옮기고(서서히 사라짐) 기록 */
    if (c.state === 'toSeat' || c.state === 'leave') { const k = c._k ||= { x: c.pos.x, z: c.pos.z, t: 0 }; if (Math.hypot(c.pos.x - k.x, c.pos.z - k.z) > 10) { k.x = c.pos.x; k.z = c.pos.z; k.t = 0; } else if ((k.t += dt) > 6) {
        (window.__stuckLog ||= []).push([c.state, Math.round(c.pos.x), Math.round(c.pos.z), Math.round(c.target.x), Math.round(c.target.z)]); track('bg_stuck', { b: this.bi, st: c.state, x: Math.round(c.pos.x), z: Math.round(c.pos.z) });
        if (c.seat) { c.seat.s.who = null; c.seat = null; } const d = this.doorV(); c.pos.set(d.x, 0, d.z - 200); c.state = 'leave'; c.target = d; k.t = 0; k.x = c.pos.x; k.z = c.pos.z; } } else c._k = null;
    const moveTo = (sp = 230) => { const wp = c.state !== 'queue' && c.state !== 'walkQ' ? this.nav.next(c, c.target.x, c.target.z, true) : null;
      if (wp) { const d = new V(wp[0] - c.pos.x, 0, wp[1] - c.pos.z), l = d.length(); if (l > 1) { d.normalize(); c.pos.addScaledVector(d, Math.min(l, sp * dt)); c.P.g.rotation.y = Math.atan2(d.x, d.z); } c.P.anim(dt, true); return false; }   /* 2층 · 테라스 자리: 계단 · 통로로 */
      const d = new V().subVectors(c.target, c.pos); d.y = 0; const l = d.length(); if (l < 6) return true; d.normalize();
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
    else if (c.state === 'eat') { c.P.anim(dt, false); c.t -= dt; if (c.t <= 0) { const t = c.seat.t; for (let i = 0; i < c.order.reduce((a, o) => a + o.n, 0) && t.trash.length < 6; i++) this.put(t.trash, item('trash'), t.x + rnd(-30, 30), 88 + (t.y || 0) + t.trash.length * 6, t.z + rnd(-25, 25), 'trash');
      c.seat.s.who = null; c.leftT = c.seat.t; c.seat = null; c.pos.y = 0; c.state = 'leave'; c.target = this.doorV(); } }
    else if (c.state === 'leave') { if (moveTo(260)) c.gone = true; }
  }
  // ── 직원 AI
  staffAI(w, dt) {
    const mv = (x, z, sp) => { const wp = this.nav.next(w, x, z, true); if (wp) { const d = new V(wp[0] - w.pos.x, 0, wp[1] - w.pos.z), l = d.length(); if (l > 1) { d.normalize(); w.pos.addScaledVector(d, Math.min(l, sp * dt)); w.P.g.rotation.y = Math.atan2(d.x, d.z); } w.P.anim(dt, true); return false; }   /* 다른 방: 문 쪽으로 */
      const d = new V(x - w.pos.x, 0, z - w.pos.z), l = d.length(); if (l < 12) { w.P.anim(dt, false); return true; } d.normalize(); if (l > 140) this.steer(w.pos, d, x, z); w.pos.addScaledVector(d, Math.min(l, sp * dt)); w.P.g.rotation.y = Math.atan2(d.x, d.z); w.P.anim(dt, true); return false; };
    w.P.carry = w.stack.length > 0;
    if (w.k === 'cashier') { const c = this.st.counter; mv(c.Z.cash.x, c.Z.cash.z, 200); w.P.g.rotation.y = 0; return; }
    /* 나르는 직원: 역할마다 (가져올 곳 → 놓을 곳) · 직원 단계: 속도 +10% · 들기 +1 */
    const RL = this.roleRoute(w); if (RL) { const sp = (STAFF[w.k].speed || 300) * (1 + this.sl(w.k) * 0.1) * this.staffK(w);
      if (!w.stack.length) { const src = RL.src(); if (!src) { const h = RL.home; mv(h[0], h[1], sp * 0.6); this.collide(w.pos, 30); return; } if (mv(src.x, src.z, sp)) { this.interact(w, dt); if (w.stack.length >= w.cap || (w.stack.length && src.empty())) w.go = 1; } }
      else { const d = RL.dst(w.kind); if (mv(d.x, d.z, sp)) { const n = w.stack.length; this.interact(w, dt); if (w.stack.length === n && w.tick <= 0) { w.idle = (w.idle || 0) + dt; if (w.idle > 3) { this.sendHome(w); w.idle = 0; }   /* 못 내려놓으면 제자리로 (전엔 없앴음) */ } else w.idle = 0; } }
      this.collide(w.pos, 30); return; }
    if (w.k === 'cleaner' || w.k === 'server') { const mine = t => t.type === 'table' && t.trash.length && (w.k === 'server' ? t.up : !(t.up && this.staff.some(x => x.k === 'server'))), sp = STAFF[w.k].speed * (1 + this.sl() * 0.1) * this.staffK(w); w.cap = 4 + this.sc2();   /* 2층 서빙 직원은 2층 테이블만 */
      if (w.kind === 'trash' && (w.stack.length >= w.cap || !Object.values(this.st).some(mine))) { const b = this.st.bin; if (mv(b.Z.drop.x, b.Z.drop.z, sp)) this.interact(w, dt); }
      else { const t = Object.values(this.st).find(mine); if (t) { const sd = w.pos.z < t.z ? -125 : 125; if (mv(t.x, t.z + sd, sp)) this.interact(w, dt); } else w.k === 'server' ? mv(-700, 900, sp * 0.5) : mv(-60, 150, sp * 0.5); } this.collide(w.pos, 30); }
  }
  /* 안내: 손에 든 것과 실제 상태를 보고 「지금 가면 되는 곳」만 가리킴
     · 다른 재료 칸에 가면 손에 든 것은 제자리로 돌아가므로 손에 무엇을 들었든 재료 칸 안내는 성공함 */
  guide(dt = 1 / 60) {
    const pl = this.pl, c = this.st.counter, ov = this.st.oven, mx = this.st.mixer, pile = this.piles.find(p => p.v > 0), pad = this.pads[0];
    const at = (Z, t) => [Z.x, Z.z, t], hk = pl.kind, swapTo = k => hk && hk !== k && hk !== 'trash' ? ` · ${josa(NAMES2[hk](), '은/는')} 제자리로` : '';
    const bagelRoute = (pre = '') => ov.stack.length ? at(ov.Z.out, `${pre}오븐에서 플레인을 집어요${hk === 'dough' ? '' : swapTo('bagel')}`)
      : hk === 'dough' ? (this.st.kettle && pl.stack.some(x => !x.m.userData.b) ? at(this.st.kettle.Z.io, '솥 칸을 지나 오븐에 넣어요 (쫄깃!)') : at(ov.Z.out, `${pre}반죽을 오븐에 넣어요`))
      : ov.feed.length || !mx ? at(ov.Z.out, `${pre}굽는 중… 오븐 앞에서 잠깐 기다려요`) : at(mx.Z.out, `${pre}반죽기에서 반죽을 집어요${swapTo('dough')}`);
    { const zz = this.staff.find(w => w.rest); if (zz) return [zz.pos.x, zz.pos.z, `💤 쉬는 ${STAFF[zz.k].name}에게 다가가면 다시 일해요`]; }   /* 쉬는 직원 깨우기가 먼저 (다들 쉬면 아무것도 안 돌아감) */
    { const big = this.piles.find(q => q.v >= 40 * this.B.mult); if (big && !hk && S.coins < 40 * this.B.mult) return [big.x, big.z, `💰 돈 더미를 주워요 (+${fmt(big.v)})`]; }   /* 0.3.5: 바닥 돈이 쌓였는데 손에 돈이 없으면 먼저 줍기 */
    if (hk === 'trash') return at(this.st.bin.Z.drop, '쓰레기는 쓰레기통에 버려요');   /* 쓰레기를 들고는 아무것도 못 집음 → 먼저 버리기 (0.3.1 막힘 검출) */
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
    if (this.ev?.type === 'complain' && this.ev.state === 'wait') return [this.ev.pos.x, this.ev.pos.z, '😤 컴플레인 손님에게 다가가 사과해요'];
    const room = hk && SHELF[hk] != null && c.shelf[hk].length < 12;
    if (this.open.has('boss') && S.safe.v > 0 && !hk) return [SAFE_AT[0], SAFE_AT[1], '🔐 쉬는 동안 번 돈이 사장실 금고에 있어요'];
    if (this.countable().filter(s => this.unl.has(s.id)).length > 9) return null;
    if (pad && S.coins >= pad.s.cost - pad.paid) return [pad.x, pad.z, pad.s.type === 'room' ? `돈을 들고 바닥 칸에 서 있으면 「${ROOMS[pad.s.room].name}」${pad.s.build ? ' 공사가 시작돼요' : '이 열려요'}` : pad.s.type === 'hire' && this.open.has('crew') ? `크루룸에서 ${STAFF[pad.s.staff].name}을 뽑아요` : '돈을 들고 바닥 칸에 서 있으면 열려요'];
    if (pile && pile.v >= 10 && !pl.stack.length) return [pile.x, pile.z, '돈을 주워요'];
    if (room) return at(c.Z[hk], '계산대 뒤 주황 칸에 서면 진열돼요');
    if (hk && SHELF[hk] != null) return f && !this.staff.some(w => w.k === 'cashier') ? at(c.Z.cash, `${NAMES2[hk]()} 진열대가 가득 찼어요 · 초록 칸에서 손님을 받아요`) : null;   /* 진열대가 가득: 손님이 사 가야 자리가 남 */
    if (c.shelf.bagel.length >= 2 && this.cust.some(x => x.state === 'queue') && !this.staff.some(w => w.k === 'cashier')) return at(c.Z.cash, '초록 칸에 서 있으면 손님을 받아요');
    if (hk === 'dough') return bagelRoute();
    if (ov.stack.length) return at(ov.Z.out, '구워진 플레인을 집어요');
    if (ov.feed && ov.feed.length) return at(ov.Z.out, '굽는 중… 잠깐 기다려요');
    return mx ? at(mx.Z.out, '반죽기 앞 칸에서 반죽을 집어요') : at(ov.Z.out, '오븐에서 플레인이 구워지는 중… 잠깐 기다려요');
  }
  // 장애물 피하기 (테이블·계산대·설비): 가는 방향 d 를 옆으로 꺾음
  steer(pos, d, gx, gz) { for (const o of Object.values(this.st)) { const sz = SIZE[o.type]; if (!sz) continue; const R0 = Math.max(sz[0], sz[1] || sz[0]) + 50; if (Math.hypot(o.x - gx, o.z - gz) < R0 + 90) continue;   /* 목적지 설비는 피하지 않음 */
      const tx = o.x - pos.x, tz = o.z - pos.z; if (Math.hypot(tx, tz) > R0 + 200) continue; const ahead = tx * d.x + tz * d.z; if (ahead <= 0) continue; const side = tx * d.z - tz * d.x;
      if (Math.abs(side) < R0) { const k = (R0 - Math.abs(side)) / R0 * 1.4, sg = side > 0 ? -1 : 1, px = d.z, pz = -d.x; d.x += px * sg * k; d.z += pz * sg * k; d.normalize(); } } return d; }
  /* 상점 「갓 구운 플레인 한 판」: 오븐에 바로 n개 (오븐 자리만큼) */
  ovenRoom() { const ov = this.st.oven; return ov ? Math.max(0, 10 + L('ovenCap') * 2 - ov.stack.length) : 0; }
  ovenBatch(n) { const ov = this.st.oven, k = Math.min(n, this.ovenRoom()); for (let i = 0; i < k; i++) setTimeout(() => { if (this.st.oven !== ov || !this.ovenRoom()) return; const m = item('bagel'); this.put(ov.stack, m, ...this.home('bagel').pos(ov.stack.length), 'bagel'); this.sparkle(m.position); }, i * 60); this.steam(ov.x, 190, ov.z); return k; }
  // ── 돌발 이벤트 (테스터 #12): 컴플레인 손님 · 단체 주문 · 인플루언서 방문 — 반복 플레이에 변화 · 놓쳐도 벌 없음
  eventUpdate(dt) {
    for (let i = (this.leavers || []).length - 1; i >= 0; i--) { const l = this.leavers[i]; if (this.walk(l, this.doorV(), 260, dt)) { this.sc.remove(l.P.g); l.tag && l.tag.remove(); this.leavers.splice(i, 1); } }
    const E = this.ev;
    if (E) { E.t -= dt; if (E.type === 'complain') { if (E.state === 'in' && this.walk(E, E.spot, 230, dt)) { E.state = 'wait'; E.P.g.rotation.y = Math.PI * 0.75; }
        if (E.state === 'wait') { E.P.anim(dt, false); E.P.body.rotation.z = Math.sin(this.t * 10) * 0.06; if (this.near(this.pl, E.pos.x, E.pos.z, 130)) return this.endEvent(false, true); } }
      if (E.t <= 0 && E.type !== 'group') this.endEvent(); return; }
    if (this.nexting || this.placing) return;
    const opened = [...this.unl].filter(id => !this.B.slots.find(s => s.id === id)?.free).length; if (opened < EVENTS.minOpen) return;
    this.evT -= dt; if (this.evT > 0) return; this.evT = rnd(...EVENTS.every);
    const inQ = this.cust.filter(c => c.state === 'queue' || c.state === 'walkQ').length, T = ['complain', 'complain', 'influencer']; if (inQ < 5) T.push('group', 'group');
    this.startEvent(T[Math.floor(Math.random() * T.length)]); }
  startEvent(type) { const c = this.st.counter, cfg = EVENTS[type], E = this.ev = { type, t: cfg.sec || 999, T: cfg.sec || 0 };
    if (type === 'complain') { const P = person({ body: 0xC8604A, hair: 0x2A1A10, pants: 0x3A3A4A }); P.g.position.set(DOOR_X, 0, 700); this.sc.add(P.g);
      Object.assign(E, { P, pos: P.g.position, state: 'in', spot: new V(c.x - 40, 0, c.z + 150), tag: this.ui.evTag(['😤 빵이 좀 식었어요!', '😤 주문이 늦었잖아요!', '😤 크림치즈가 모자라요!'][Math.floor(Math.random() * 3)]) });
      this.ui.note('😤 컴플레인 손님이 왔어요 · 다가가서 사과하면 풀려요'); }
    if (type === 'group') { this.spawnCustomer(); const f = this.cust[this.cust.length - 1], ks = ['bagel']; if (this.st.cc) ks.push('cream');
      f.order = [{ k: ks[Math.floor(Math.random() * ks.length)], n: Math.round(rnd(...cfg.n)), got: 0 }]; f.group = true; E.cust = f; this.ui.note(`👥 단체 주문! ${MENU[f.order[0].k].short} ${f.order[0].n}개 · 다 내주면 값 ×${cfg.k}`); }
    if (type === 'influencer') { this.ui.note('📸 인플루언서 방문! 잠깐 손님이 두 배 · 팁도 잘 줘요'); this.confetti(this.B.door[0], 160, this.B.door[1] - 100); }
    sfx('order', { vol: 0.5, rate: 1.2 }); this.ui.evBar(E); }
  /* silent: 지점 바꿀 때 정리만 · ok: 컴플레인을 풀었음 */
  endEvent(silent, ok) { const E = this.ev; this.ev = null; if (silent) { this.leavers = []; this.ui && this.ui.evBar && this.ui.evBar(null); return; } if (!E) return; this.ui.evBar(null);
    if (E.type === 'complain') { E.P.body.rotation.z = 0; if (ok) { const v = Math.round(EVENTS.complain.bonus * this.B.mult * (1 + this.unl.size / 10)); this.addCash(this.st.counter.cash, v); mission('complain');
        this.ui.float('죄송해요! 🙇', this.pl.pos.clone().setY(300), 'say'); setTimeout(() => this.ui.float('괜찮아요, 또 올게요 ♥', E.pos.clone().setY(280), 'heart'), 500); this.ui.float('+' + fmt(v), new V(this.st.counter.x + 110, 120, this.st.counter.z), 'pay'); this.sparkle(E.pos.clone().setY(150)); sfx('reward', { vol: 0.5 }); this.ui.note(`잘 달랬어요! 사과 보너스 +${fmt(v)}`); }
      else this.ui.float('다음엔 꼭 챙겨 주세요 🙂', E.pos.clone().setY(280), 'say');
      E.tag && E.tag.remove(); E.tag = null; (this.leavers ||= []).push(E); }
    if (E.type === 'influencer') { this.ui.note('📸 인플루언서가 사진을 잔뜩 찍고 갔어요!'); setTimeout(() => this.ui.event2x(this.ui.adCoins(), '📸 인플루언서'), 800); } }
  walk(o, to, sp, dt) { const d = new V(to.x - o.pos.x, 0, to.z - o.pos.z), l = d.length(); if (l < 8) { o.P.anim(dt, false); return true; } d.normalize(); o.pos.addScaledVector(d, Math.min(l, sp * dt)); o.P.g.rotation.y = Math.atan2(d.x, d.z); o.P.anim(dt, true); return false; }
  // ── 메뉴 숙련: 별이 오르면 알림
  addMast(k, n) { const name = MENU[k]?.name; if (!name) return; salesAdd(name, n); const b = starOf(name); S.mast[name] = (S.mast[name] || 0) + n; const a = starOf(name);
    if (a > b) { this.ui.note(`${name} ★${a}! 값 +${Math.round((a - 1) * MASTERY_K * 100)}%`); sfx('levelup', { vol: 0.5 }); const c = this.st.counter; this.confetti(c.x, 160, c.z); } }
  // ── 단골: 오늘 아직 안 온 사람 중 가게 크기가 맞는 사람
  nextRegular() { const opened = [...this.unl].filter(id => !this.B.slots.find(s => s.id === id)?.free).length, d = today();
    return REGULARS.find(R0 => R0.need <= opened && (S.reg[R0.id]?.day !== d) && !this.cust.some(c => c.reg === R0)) || null; }
  regServed(f) { const R0 = f.reg, r = (S.reg[R0.id] ||= { f: 0, day: today(), lv: 0 }); r.f += 1 + (f.mood === 2 ? 1 : 0); const lv = favLv(r.f), mult = this.B.mult;
    this.ui.float(f.mood === 2 ? '♥♥ 호감 +2' : '♥ 호감 +1', f.pos.clone().setY(290), 'heart');
    while ((r.lv || 0) < lv) { r.lv = (r.lv || 0) + 1; let gift = null; if (r.lv === 2 || r.lv === 4) { const id = R0.gift[r.lv === 2 ? 0 : 1]; if (this.addDeco(id)) gift = DECO.find(x => x.id === id).name; }
      let coins = 0; if (!gift) { coins = 150 * r.lv * mult; S.coins += coins; } this.ui.regLevel(R0, r.lv, gift, coins); sfx('reward'); }
    if (r.lv >= 5 && !r.set5) { r.set5 = 1; if ((S.setsFree || 0) < THEME_SETS.length) { S.setsFree = (S.setsFree || 0) + 1; this.ui.note(`💌 ${R0.name} ♥5 선물 · 테마 세트 「${THEME_SETS[S.setsFree - 1].name}」 (꾸미기 › 테마)`); } }   /* 테마 세트 무과금 길 */
    if (REGULARS.every(x => (S.reg[x.id]?.lv || 0) >= 5)) this.addDeco('photo');
    save(); }
  priceK() { return 1 + L('price') * 0.08; }
  premK() { return 0.5 + L('kettle') * 0.06; }   /* 쫄깃 베이글 추가 값 (기본 +50%) */
  sparkle(p) { for (let i = 0; i < 6; i++) { const m = box(5, 5, 5, 0xFFE27A, p.x, p.y + 10, p.z, this.sc); const a = Math.random() * 6.28; this.fx.push({ t: 0, d: 0.5, f: u => { m.position.set(p.x + Math.cos(a) * 30 * u, p.y + 10 + 40 * u, p.z + Math.sin(a) * 30 * u); if (u >= 1) this.sc.remove(m); } }); } }
  steam(x, y, z) { const m = new THREE.Mesh(STEAM_G, new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.6 })); m.position.set(x + rnd(-30, 30), y, z + rnd(-30, 30)); this.sc.add(m); this.fx.push({ t: 0, d: 1.2, f: u => { m.position.y = y + u * 120; m.scale.setScalar(1 + u * 2); m.material.opacity = 0.6 * (1 - u); if (u >= 1) this.sc.remove(m); } }); }
  sl(k) { return L('swalk'); }   /* 직원 걷기 (크루룸 · 모든 직원) */
  sc2() { return L('scarry'); }   /* 직원 들기 (크루룸) */
  roleRoute(w) {
    const NEED = { topper: 'cc', fridge: 'coffee', dougher: 'mixer', driver: 'drive', baker: 'oven' }; if (NEED[w.k] && !this.st[NEED[w.k]]) { const c0 = this.st.counter; return { home: [c0.x - 150, c0.z - 220], src: () => null, dst: () => ({ x: c0.x - 150, z: c0.z - 220 }) }; }   /* 담당 설비가 없으면 대기 */
    const c = this.st.counter, ov = this.st.oven, cc = this.st.cc, cf = this.st.coffee, mx = this.st.mixer, kt = this.st.kettle, dv = this.st.drive, Zp = Z => ({ x: Z.x, z: Z.z });
    const S2 = (st, Z, ok = () => true) => st && st.stack.length && ok() ? { ...Zp(Z), empty: () => !st.stack.length } : null; w.cap = (STAFF[w.k]?.carry || 4) + this.sc2();
    const toDv = k => dv && dv.lane[k] && ({ bagel: 1, cream: this.st.cc, coffee: this.st.coffee, drink: this.st.espresso })[k] && dv.lane[k].length < 6 && c.shelf[k].length >= 5 ? Zp(dv.Z[k]) : null;   /* 계산대가 넉넉하면 드라이브스루 줄도 채움 */
    if (w.k === 'baker') return { home: [ov.Z.out.x + 120, ov.Z.out.z + 60], src: () => c.shelf.bagel.length < 10 || (dv && dv.lane.bagel.length < 6) ? S2(ov, ov.Z.out) : null,
      dst: () => toDv('bagel') || Zp(c.Z.bagel) };
    if (w.k === 'topper') {   /* 테스터 #1: 예전엔 「플레인 진열대가 비었고 특별이 3개 넘으면 양보」하고 가만히 섬 → 진열 직원이 없으면 오븐에 플레인이 가득해도 아무도 안 옮김
         이제: 특별 베이글이 모자라면 오븐 → 토핑 바 · 플레인 진열대가 모자라면(진열 직원이 없거나 특별이 넉넉할 때) 오븐 → 계산대 플레인 칸 */
      const baker = this.staff.some(x => x.k === 'baker' && !x.rest), needBar = cc.inStack.length < 6 && c.shelf.cream.length + cc.stack.length + cc.inStack.length < 8, needPlain = c.shelf.bagel.length < (baker ? 2 : 4) && (!baker || c.shelf.cream.length >= 3);
      return { home: [cc.Z.io.x + 80, cc.Z.io.z + 40], src: () => { if (cc.stack.length && (c.shelf.cream.length < 8 || (dv && dv.lane.cream.length < 6))) return S2(cc, cc.Z.io);
          if (needPlain && c.shelf.bagel.length < 12) { w.job = 'shelf'; return S2(ov, ov.Z.out); } if (needBar) { w.job = 'bar'; return S2(ov, ov.Z.out); }
          if (!baker && c.shelf.bagel.length < 8) { w.job = 'shelf'; return S2(ov, ov.Z.out); } return null; },   /* 할 일이 없으면 진열 직원 대신 플레인 진열 */
        dst: k => k === 'bagel' ? (w.job === 'shelf' && c.shelf.bagel.length < 12 ? Zp(c.Z.bagel) : Zp(cc.Z.io)) : toDv('cream') || Zp(c.Z.cream) }; }
    if (w.k === 'fridge') { const es = this.st.espresso; return { home: [cf.Z.out.x + 60, cf.Z.out.z + 40], src: () => (es && c.shelf.drink.length < Math.min(8, c.shelf.coffee.length + 1) ? S2(es, es.Z.out) : null) || (c.shelf.coffee.length < 8 ? S2(cf, cf.Z.out) : null) || (es && c.shelf.drink.length < 8 ? S2(es, es.Z.out) : null), dst: k => toDv(k) || Zp(c.Z[k]) }; }
    if (w.k === 'driver' && dv) { const SRC = { bagel: [ov, ov.Z.out], cream: cc && [cc, cc.Z.io], coffee: cf && [cf, cf.Z.out], drink: this.st.espresso && [this.st.espresso, this.st.espresso.Z.out] };
      const need = () => { const cr = this.cars.find(x => x.state === 'wait') || this.cars[0]; const want = cr ? Object.keys(cr.order).filter(k => (cr.order[k] - (cr.got[k] || 0)) > dv.lane[k].length) : []; return [...want, 'bagel', 'drink', 'cream', 'coffee'].find(k => SRC[k] && dv.lane[k].length < 6 && SRC[k][0].stack.length); };
      return { home: [dv.Z.bagel.x - 80, dv.Z.bagel.z], src: () => { const k = need(); return k ? S2(SRC[k][0], SRC[k][1]) : null; }, dst: k => Zp(dv.Z[k]) }; }
    if (w.k === 'dougher') { if (!mx) return { home: [ov.Z.out.x - 120, ov.Z.out.z], src: () => null, dst: () => Zp(ov.Z.out) }; const rt = this.st.retard; return { home: [mx.Z.out.x + 40, mx.Z.out.z + 90], src: () => ov.feed.length < 6 && ov.stack.length < 12 ? (rt && rt.stack.length >= 2 ? S2(rt, rt.Z.out) : S2(mx, mx.Z.out)) : null,
      dst: () => kt && w.stack.some(x => !x.m.userData.b) ? Zp(kt.Z.io) : Zp(ov.Z.out) }; }
    return null;
  }
  // 겹침 검사 (시험용): 모든 열기 칸 · 동작 칸 · 설비 바닥이 서로 겹치는지
  overlaps() { const R = []; for (const [room, L0] of Object.entries(LV_PADS)) L0.forEach((q, i) => R.push({ n: 'lv:' + room + i, x: q[0], z: q[1], w: 140, d: 140 })); CREW_HIRE.forEach((q, i) => R.push({ n: 'hire:' + i, x: q[0], z: q[1], w: PAD, d: PAD })); for (const s of this.B.slots) if (EQ_PAD[s.id]) { const at = this.eqSpot(s.id); if (at) R.push({ n: 'eq:' + s.id, x: at[0], z: at[1], w: 120, d: 120 }); }
    for (const s of this.B.slots) { if (!s.free && !s.withRoom) R.push({ n: 'pad:' + s.id, x: s.px ?? s.x, z: s.pz ?? s.z, w: PAD, d: PAD });
      const sz = SIZE[s.type]; if (sz && s.type !== 'table') R.push({ n: 'st:' + s.id, x: s.x, z: s.z, w: sz[0] * 2, d: (sz[1] || sz[0]) * 2 }); if (s.type === 'table') R.push({ n: 'st:' + s.id, x: s.x, z: s.z, w: 256, d: 144 });
      for (const [k, dx, dz, w, d, , ring] of ZONES[s.type] || []) if (!ring) R.push({ n: 'zone:' + s.id + '.' + k, x: s.x + dx, z: s.z + dz, w, d }); }
    const out = []; for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i], b = R[j]; if (a.n.startsWith('pad:') && b.n.startsWith('pad:') && a.x === b.x && a.z === b.z) continue;   /* 같은 자리를 차례로 쓰는 칸 (함께 안 나옴) */ if (a.n.split(/[:.]/)[1] === b.n.split(/[:.]/)[1]) continue; if (a.n.startsWith('st:') && b.n.startsWith('st:')) continue;
      if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 1 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 1) out.push(a.n + ' × ' + b.n); } return out; }
  /* 시험용: 장면에 따로 떠 있는 물건(어느 진열 · 재료 칸 · 손 · 날아가기에도 없는 것) */
  orphans() { const known = new Set(); const add = a => { for (const it of a || []) known.add(it.m); };
    for (const o of Object.values(this.st)) { add(o.stack); add(o.inStack); add(o.trash); for (const a of Object.values(o.shelf || {})) add(a); for (const a of Object.values(o.lane || {})) add(a); }
    for (const f of this.fly) known.add(f.m); return this.sc.children.filter(o => o.userData.item && !known.has(o)).map(o => [o.userData.item, Math.round(o.position.x), Math.round(o.position.y), Math.round(o.position.z)]); }
  srcEmpty(s) { if (s === 'mx') return !this.st.mixer.stack.length; if (s === 'kt') return !this.st.kettle.stack.length; return s === 'cc' ? !this.st.cc.stack.length : s === 'cf' ? !this.st.coffee.stack.length : !this.st.oven.stack.length; }
  // ── 드라이브스루: 차가 와서 베이글 여러 개를 사 감 (창구 진열대에서 자동)
  driveUpdate(dt, mult) {
    const dv = this.st.drive, walk = this.B.feature === 'pickup'; this.carT -= dt; if (this.carT <= 0 && this.cars.length < 3) { this.carT = walk ? rnd(9, 13) : rnd(8, 12);   /* 픽업 창구 = 미리 주문한 아파트 손님(걸어서) · 드라이브스루 = 차 */
      let g, P = null; if (walk) { P = person({ body: CUST_COLORS[Math.floor(Math.random() * CUST_COLORS.length)], hair: 0x3A2A1A, pants: 0x4A5A7A }); g = P.g; g.rotation.y = Math.PI; } else { g = car([0xE86A6A, 0x6A9AE8, 0xF2C14E, 0x9ACF6A][Math.floor(Math.random() * 4)]); g.rotation.y = Math.PI / 2; }
      g.position.set(dv.x + (walk ? 250 : 330), 0, dv.z + 1200); this.sc.add(g); const ks = ['bagel', 'bagel']; if (this.st.cc) ks.push('cream'); if (this.st.coffee) ks.push('coffee'); if (this.st.espresso) ks.push('drink'); const order = {}; for (let n = (walk ? 1 : 2) + Math.floor(Math.random() * (walk ? 3 : 4)); n > 0; n--) { const k = ks[Math.floor(Math.random() * ks.length)]; order[k] = (order[k] || 0) + 1; }
      this.cars.push({ g, P, order, got: {}, prem: 0, state: 'in', tag: this.ui.bubble() }); }
    this.cars.forEach((cr, i) => { const tz = dv.z + i * (walk ? 120 : 260); if (cr.P) cr.P.anim(dt, cr.state !== 'wait'); if (cr.state === 'in') { cr.g.position.z = Math.max(tz, cr.g.position.z - (walk ? 220 : 300) * dt); if (i === 0 && Math.abs(cr.g.position.z - tz) < 2) cr.state = 'wait'; }
      else if (cr.state === 'wait') { dv.t -= dt; const k = Object.keys(cr.order).find(k => (cr.got[k] || 0) < cr.order[k] && dv.lane[k].length);
        if (dv.t <= 0 && k) { dv.t = 0.4; const it = dv.lane[k].pop(); if (it.m.userData.prem) cr.prem++; this.fly.push({ m: it.m, from: it.m.position.clone(), to: cr.g.position.clone().setY(90), t: 0, d: 0.25, done: () => this.sc.remove(it.m) }); cr.got[k] = (cr.got[k] || 0) + 1; sfx('blip', { vol: 0.25 }); }
        cr.wt = (cr.wt || 0) + dt; const done = Object.keys(cr.order).every(k => (cr.got[k] || 0) >= cr.order[k]), late = cr.wt > 16;   /* 오래 기다리면 받은 것만 계산하고 떠남 */
        if (late && !done) { for (const k in cr.order) cr.order[k] = cr.got[k] || 0; for (const k in cr.order) if (!cr.order[k]) delete cr.order[k]; if (!Object.keys(cr.order).length) { cr.state = 'out'; cr.tag.remove(); cr.tag = null; this.ui.float('😢', new V(dv.x, 160, dv.z), 'pay'); } }
        if (cr.state === 'wait' && Object.keys(cr.order).every(k => (cr.got[k] || 0) >= cr.order[k])) { const n = Object.values(cr.order).reduce((a, b) => a + b, 0); const v = Math.round((Object.entries(cr.order).reduce((a, [k, n]) => a + MENU[k].price * n * starK(k), 0) * (walk ? 1.2 : 1.3) + cr.prem * MENU.bagel.price * this.premK()) * mult * this.priceK());
          this.addCash(dv.cash, v); this.ui.float('+' + fmt(v), new V(dv.x, 140, dv.z), 'pay'); addSold(n); for (const [k, m] of Object.entries(cr.order)) this.addMast(k, m); sfx('order', { vol: 0.4 }); cr.state = 'out'; cr.tag.remove(); cr.tag = null; } }
      else { cr.g.position.z -= (walk ? 230 : 320) * dt; } });
    this.cars = this.cars.filter(cr => { if (cr.g.position.z < dv.z - 1600) { this.sc.remove(cr.g); cr.tag && cr.tag.remove(); return false; } return true; });
  }
  // ── 라이더 대기석 (3호점): 배달 라이더가 와서 앉아 기다리다 창구 줄에서 포장을 받아 감 (차가 없을 때) · 값 ×1.4
  riderUpdate(dt, mult) { const rb = this.st.rider, dv = this.st.drive; this.riderT -= dt;
    if (this.riderT <= 0 && this.riders.length < 2) { this.riderT = rnd(18, 26); const P = person({ body: 0x2E9A6A, hair: 0x1A1A1A, pants: 0x3A3A4A, hat: 'cap', cap: 0x2E9A6A }); P.g.position.set(DOOR_X, 0, 1400); this.sc.add(P.g); const ks = ['bagel', 'bagel']; if (this.st.cc) ks.push('cream'); const order = {}; for (let n = 3 + Math.floor(Math.random() * 3); n > 0; n--) { const k = ks[Math.floor(Math.random() * ks.length)]; order[k] = (order[k] || 0) + 1; }
      this.riders.push({ P, pos: P.g.position, order, got: {}, state: 'in', spot: new V(rb.x - 60 + this.riders.length * 120, 0, rb.z - 60), tag: this.ui.bubble() }); }
    for (const r of this.riders) { if (r.state === 'in') { if (this.walk(r, r.spot, 220, dt)) { r.state = 'wait'; r.P.g.rotation.y = Math.PI; } continue; }
      if (r.state === 'out') { if (this.walk(r, new V(DOOR_X, 0, 1500), 260, dt)) r.gone = true; continue; } r.P.anim(dt, false);
      if (dv && !this.cars.some(c => c.state === 'wait') && (r.t = (r.t || 0) - dt) <= 0) { const k = Object.keys(r.order).find(k => (r.got[k] || 0) < r.order[k] && dv.lane[k].length); if (k) { r.t = 0.4; const it = dv.lane[k].pop(); this.fly.push({ m: it.m, from: it.m.position.clone(), to: r.pos.clone().setY(90), t: 0, d: 0.3, done: () => this.sc.remove(it.m) }); r.got[k] = (r.got[k] || 0) + 1; sfx('blip', { vol: 0.2 }); } }
      if (Object.keys(r.order).every(k => (r.got[k] || 0) >= r.order[k])) { const n = Object.values(r.order).reduce((a, b) => a + b, 0), v = Math.round(Object.entries(r.order).reduce((a, [k, m]) => a + MENU[k].price * m * starK(k), 0) * 1.4 * mult * this.priceK());
        this.addCash(dv.cash, v); this.ui.float('🛵 +' + fmt(v), r.pos.clone().setY(200), 'pay'); addSold(n); r.state = 'out'; r.tag && (r.tag.remove(), r.tag = null); } }
    this.riders = this.riders.filter(r => { if (r.gone) { this.sc.remove(r.P.g); r.tag && r.tag.remove(); return false; } return true; }); }
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
  espresso: [['out', 0, 120, 130, 90, 0x6A3A1A]], retard: [['out', 0, 135, 140, 100, 0x5A8AC8]],
  bin: [['drop', 0, 95, 120, 80, 0x5A8A5A]], table: [['trash', 0, 0, 420, 310, 0xB8B0A8, 1]], drive: [['all', -105, 0, 90, 276, 0xF2A23A], ['bagel', -105, -105, 90, 64, 0, 2], ['cream', -105, -35, 90, 64, 0, 2], ['coffee', -105, 35, 90, 64, 0, 2], ['drink', -105, 105, 90, 64, 0, 2]],
};
const WHITE = new THREE.Color(0xFFFFFF), STEAM_G = new THREE.SphereGeometry(10, 8, 6);
const EQ_PAD = { oven: [150, 135], mixer: [140, 115], kettle: [-140, 120], cc: [-200, -150], coffee: [140, 80], espresso: [150, 40], retard: [0, 270] };   /* 설비 강화 칸 자리 (설비 기준) */
/* 바닥 칸 모양 (0.3.3 대표 「바닥과 잘 구별이 안 됨」): 밝은 색 테두리 띠 + 짙은 안쪽 판(바닥과 대비) + 진행 채움 · 살 수 있으면 테두리가 은은히 빛나고 아니면 흐림 (padGlow) — 대비는 tools/floor_check.mjs */
function padLook(g, S2, edge, fillC) { const plate = new THREE.Mesh(new THREE.BoxGeometry(S2 - 8, 3, S2 - 8), new THREE.MeshBasicMaterial({ color: 0x3E2614, transparent: true, opacity: 0.82 })); plate.position.y = 6; g.add(plate);
  const em = new THREE.MeshBasicMaterial({ color: edge, transparent: true, opacity: 1 }), t = 14; for (const [x, z, w, d] of [[0, -S2 / 2 + t / 2, S2, t], [0, S2 / 2 - t / 2, S2, t], [-S2 / 2 + t / 2, 0, t, S2], [S2 / 2 - t / 2, 0, t, S2]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 5, d), em); b.position.set(x, 8, z); g.add(b); }
  const fill = new THREE.Mesh(new THREE.BoxGeometry(S2 - 2 * t - 8, 6, S2 - 2 * t - 8), new THREE.MeshBasicMaterial({ color: fillC, transparent: true, opacity: 0.9 })); fill.position.y = 8; fill.scale.z = 0.001; g.add(fill); return { fill, look: { em, plate } }; }
export const PAD_COLORS = { plate: 0x3E2614, edge: [0xFF8A3C, 0xFFB24A, 0xFFD24A, 0x5AB0E8, 0x6FD0A0] };
const PAD_STAY = 0.8, RING_G = new THREE.BoxGeometry(14, 3, 6), RING_M = new THREE.MeshBasicMaterial({ color: 0xFF6720 });
const OCC_DECO = ['terrace', 'lamp', 'plants2', 'monstera'], DWELL = 0.4, BACK_Z = -1150, DOOR_X = 430, QZ = 440, PAD = 160, LANE = { bagel: -105, cream: -35, coffee: 35, drink: 105 };   /* 열기 칸 크기 */
/* 크루룸 「새 직원 뽑기」 자리 2 · 방문형 방 강화 칸 자리 (마지막 = 📺 무료) · 금고 앞 */
const CREW_HIRE = [[-910, -690], [-760, -1010]], LV_PADS = { crew: [[-1090, -880], [-910, -880], [-1090, -690]], boss: [[-1160, -200], [-1160, -20], [-990, -200], [-990, -20], [-1160, 160]] }, SAFE_AT = [-1040, 330];
export const SIZE = { retard: [72, 58], rider: [110, 30], espresso: [72, 58], mixer: [60, 50], kettle: [68, 58], oven: [105, 80], counter: [168, 62], ccbar: [118, 62], coffee: [72, 58], table: [128, 72], bin: [40], plant: [40], drive: [20, 160] };   /* 테이블: 의자 포함 직사각형 */
const NAMES2 = { bagel: () => MENU.bagel.short, cream: () => MENU.cream.short, coffee: () => MENU.coffee.short, drink: () => '아메리카노', dough: () => '반죽', trash: () => '쓰레기' };   /* 손에 든 것 이름 (지점마다 바뀜) */
/* 꾸미기 크기 (원래 방향 기준 반 가로 · 반 세로) · 벽에 거는 것 */
const DECO_HALF = { monstera: [45, 45], rug: [195, 135], bench: [40, 130], lamp: [20, 20], shelf: [110, 25], board: [50, 22], gallery: [10, 130], plants2: [60, 40], terrace: [280, 100], photo: [10, 150], vase: [0, 0] };
const decoHalf = d => DECO_HALF[d.id] || [d.r || 40, d.r || 40], HANG = ['shelf', 'gallery', 'photo'];
/* 설비 몸통 크기 (단계 외형 장식용): [가로, 높이, 깊이] */
const TIER_SZ = { oven: [200, 170, 140], mixer: [110, 60, 90], kettle: [130, 80, 110], cc: [220, 95, 110], coffee: [130, 150, 100], espresso: [130, 95, 100], counter: [320, 100, 110] };
const NAMES = { retard: '저온 숙성고', rider: '라이더 대기석', espresso: '커피 머신', mixer: '반죽기', kettle: '데치기 솥', table: '테이블', ccbar: '토핑 바', coffee: '크림치즈 냉장고', drive: '드라이브스루' };
export const fmt = n => Math.round(n).toLocaleString('en-US');
