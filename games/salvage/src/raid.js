// 출격 한 판 — 주인공 · 적 · 보스 · 사격(4종) · 투척 · 뒤지기 · 무게 · 구역 3단 · 잠긴 문 · 발전기 · 출구 조건 · 침수/정전 · 타이머 · 시야
//  v0.4: 지도 3곳(침수 창고 · 밤의 항구 · 해저 터널) — 판마다 상태(폭풍/안개/맑은 밤 · 정전/급류/잔잔) · 등불 · 신호탄 보트 · 산소 · 물살 · 새 적 4 · 보스 2
import * as THREE from 'three';
import { DUCK } from './look_duck.js?v=0.99.17'; /* 시안용 ?look=duck */
import { ITEMS, LOOT_TABLE, PLAYER, ENEMIES, RAID, ZONES, EXITS, WEIGHT, VKEY_CHANCE, MAPS, CONDS, O2, CURRENT, LAMP, BOSS, VARIANTS } from './data.js?v=0.99.17';
import { plan, build, RS, LOOT_MODEL, LOOT_SCALE, rng, rollLoot, zoneOfRow, ROWS } from './map.js?v=0.99.17';
import { mapOf } from './plan.js?v=0.99.17';
import { prop, charClone } from './assets.js?v=0.99.17';
import { enemyBody, enemyTick, bossVis, glowSprite, weakPoint } from './enemy3d.js?v=0.99.17'; /* v0.5.x 적 · 보스 전용 모델 (없으면 아래 예전 모델) */
import { makeHero, setWeapon, tailWag, HERO_SCALE } from './hero.js?v=0.99.17';
import { mkBag, mkItem, autoAdd, bagValue, bagWeight, bagKeys, remove } from './inv.js?v=0.99.17';
import { sfx, ambience } from './audio.js?v=0.99.17';
import { petInit, petTick } from './pet_raid.js?v=0.99.17'; /* M5-C 판 안 반려 */
import { swing, zap, armsTick, ammoMul, waterMul, flarePools, lob, shotSig, fireFeel, hitFeel, hitSig, statusTick, onGunHit, anchorPull, ricochet, swarmFire } from './arms.js?v=0.99.17'; /* M3-A 무기 10 · 탄약 3 · v0.6.1 손맛 · M5-C 무기 19 */
import { AI, facOf } from './ai.js?v=0.99.17'; /* M3-B 진영 · 엄폐 · 무리 · M4-A 2단계 */
import { populate, chiefRoll } from './threat.js?v=0.99.17'; /* M4-A 위협 곡선 */
import { abyssEnemy } from './abyss.js?v=0.99.17'; /* M5-B 깊은 물 */
import { FOE, PRIM, foeBody, foeAttack, foeTick, foeKill } from './foes.js?v=0.99.17'; /* M4-A 새 적 5 */
import { chiefStart, chiefTick, chiefWind, chiefAttack, chiefDown, chiefDispose } from './chief.js?v=0.99.17'; /* M4-A 검은 닻 두목 */
import { BIG_HIT, TELE_MIN, AI2 } from './data/enemies.js?v=0.99.17';
import { labStart, labExitDeco, labAttack, labWind, motherWind, labLook, LAB_KIND } from './lab.js?v=0.99.17'; /* M4-B 심해 연구소 */
import { gateStart, gateWind, gateAttack, GATE_KIND } from './gate.js?v=0.99.17'; /* M5-A 6장 대수문 꼭대기 · 최종 보스 파수 */
import { wxStart } from './weather.js?v=0.99.17'; /* M4-B 공통 판 상태 5 */
import { rimify, rimHit } from './rim.js?v=0.99.17'; /* v0.7.1 검수 M4 Top 1 · 3 진영 색 림 빛 · 큰 적 맞음 틴트 */
import { WEATHER, condFor, wxFor, mergeWx, forecast } from './data/weather.js?v=0.99.17';
import { HitNums } from './nums.js?v=0.99.17'; /* 피해 숫자 합치기 · 막힘 방패 (검수 M3 Top 6) */
import { factoryStart, factoryPlayer, factoryTick, startRide, callCrane, exitDeco, factoryLook, smelterWind, smelterAttack, clearRain } from './factory.js?v=0.99.17'; /* M3-B 가라앉은 공장 */
import { hazard } from './a11y.js?v=0.99.17'; /* M6-C 색약 보조: 위험 예고 빗금 */

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tmp = V(), tmp2 = V(), tmp3 = V();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

/* 애니 도우미: 이름으로 재생 · 부드럽게 바꾸기 */
class Anim {
  constructor(root, clips) { this.mixer = new THREE.AnimationMixer(root); this.clips = clips; this.cur = null; this.acts = {}; }
  act(n) { if (!this.acts[n]) { const c = this.clips[n]; if (!c) return null; this.acts[n] = this.mixer.clipAction(c); } return this.acts[n]; }
  play(n, { fade = 0.15, once = false, speed = 1, force = false } = {}) {
    const a = this.act(n); if (!a) return null; if (this.cur === a && !force) { a.timeScale = speed; return a; }
    a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.timeScale = speed; a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once;
    if (this.cur && this.cur !== a) a.crossFadeFrom(this.cur, fade, false); a.play(); this.cur = a; this.curName = n; return a;
  }
}
/* 높이 맞추기 */
function fitHeight(root, h) { root.updateMatrixWorld(true); const b = new THREE.Box3(); root.traverse(o => { if (o.isSkinnedMesh || o.isMesh) { o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); b.union(bb); } }); const s = h / Math.max(0.1, b.max.y - Math.max(0, b.min.y)); root.scale.setScalar(s); return s; }

/* 순찰 드론 (코드 모델): 몸통 · 눈 · 날개 고리 — 정예는 붉은 띠 */
function makeDrone(elite) {
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body); body.position.y = 1.25;
  const hull = new THREE.MeshLambertMaterial({ color: elite ? 0x6c7680 : 0x8c96a0, flatShading: true }), dark = new THREE.MeshLambertMaterial({ color: 0x3a4148, flatShading: true }), warn = new THREE.MeshLambertMaterial({ color: elite ? 0xd8432f : 0xe8a33a, flatShading: true });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), hull); core.scale.set(1, 0.78, 1); body.add(core);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.53, 0.53, 0.14, 10), warn); band.position.y = 0.02; body.add(band);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xff5a3a }); const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), eyeM); eye.position.set(0, 0.04, 0.45); body.add(eye);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.42), dark); gun.position.set(0.3, -0.22, 0.28); body.add(gun);
  const rotors = []; for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.08), dark); arm.position.set(sx * 0.62, 0.22, 0); body.add(arm);
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 6, 14), dark); r.rotation.x = Math.PI / 2; r.position.set(sx * 0.86, 0.26, 0); body.add(r);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.02, 0.07), hull); blade.position.copy(r.position); body.add(blade); rotors.push(blade); }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.14; g.add(shadow);
  g.traverse(o => { if (o.isMesh && o !== shadow) o.castShadow = true; });
  return { root: g, body, eye, eyeM, rotors, mats: [hull, dark, warn], gun };
}
const discGeo = new THREE.CircleGeometry(1, 40);
const lineGeo = (() => { const g = new THREE.PlaneGeometry(1, 1); g.translate(0, 0.5, 0); return g; })(); /* 줄 경고: 시작점에서 앞으로 길이 1 */
/* ───── v0.4 코드 모델: 집게 게 · 전기 해파리 · 터널 장어 · 보트 ───── */
function makeCrab(elite) {
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body); body.position.y = 0.32;
  const shellM = new THREE.MeshLambertMaterial({ color: elite ? 0x9a2f22 : 0xd0532f, flatShading: true }), dark = new THREE.MeshLambertMaterial({ color: 0x4a1d14, flatShading: true }), eyeM = new THREE.MeshLambertMaterial({ color: 0x1b1f24 });
  const sh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 9, 6), shellM); sh.scale.set(1.25, 0.55, 1); body.add(sh);
  for (const sx of [-0.13, 0.13]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 5), dark); st.position.set(sx, 0.24, 0.26); body.add(st); const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), eyeM); e.position.set(sx, 0.36, 0.26); body.add(e); }
  const legs = []; for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.07), dark); l.position.set(sx * 0.55, -0.1, -0.18 + i * 0.18); l.rotation.z = sx * -0.5; body.add(l); legs.push(l); }
  const claws = []; for (const sx of [-1, 1]) { const c = new THREE.Group(); c.position.set(sx * 0.42, 0.02, 0.38); const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.3), shellM); arm.position.z = 0.1; c.add(arm); const p = new THREE.Mesh(new THREE.SphereGeometry(0.17, 7, 5), shellM); p.scale.set(0.8, 0.6, 1.2); p.position.z = 0.3; c.add(p); body.add(c); claws.push(c); }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 14), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.14; g.add(shadow);
  g.traverse(o => { if (o.isMesh && o !== shadow) o.castShadow = true; });
  return { root: g, body, legs, claws, mats: [shellM, dark, eyeM] };
}
function makeJelly(elite) {
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body); body.position.y = 1.15;
  const domeM = new THREE.MeshLambertMaterial({ color: elite ? 0x8a7dff : 0x6fd8ff, emissive: elite ? 0x3a2a9a : 0x1a6a8a, transparent: true, opacity: 0.78, flatShading: true });
  const coreM = new THREE.MeshBasicMaterial({ color: 0xdffaff });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeM); body.add(dome);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), coreM); core.position.y = 0.15; body.add(core);
  const tents = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const t = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.015, 0.95, 4), domeM); t.position.set(Math.cos(a) * 0.32, -0.45, Math.sin(a) * 0.32); body.add(t); tents.push(t); }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14), new THREE.MeshBasicMaterial({ color: 0x6fd8ff, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.15; g.add(shadow);
  return { root: g, body, tents, core, coreM, mats: [domeM, coreM] };
}
function makeEel() {
  const g = new THREE.Group(); const segs = []; const N = 11;
  const skin = new THREE.MeshLambertMaterial({ color: 0x2f4a3e, flatShading: true }), belly = new THREE.MeshLambertMaterial({ color: 0x8fb08a, flatShading: true }), glowM = new THREE.MeshBasicMaterial({ color: 0x7dffd8 });
  for (let i = 0; i < N; i++) { const r = i === 0 ? 0.62 : 0.58 * (1 - i / (N + 2)); const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 7), i === 0 ? skin : (i % 2 ? skin : belly)); m.scale.set(1, 0.8, 1.25); m.castShadow = true; g.add(m); segs.push({ m, p: new THREE.Vector3(), r });
    if (i > 0 && i < N - 1) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, r * 0.9, r * 1.2), glowM); fin.position.y = r * 0.75; m.add(fin); } }
  const head = segs[0].m; for (const sx of [-0.28, 0.28]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), glowM); e.position.set(sx, 0.18, 0.42); head.add(e); }
  const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.6, 8), skin); jaw.rotation.x = Math.PI / 2; jaw.position.z = 0.68; head.add(jaw);
  return { root: g, segs, glowM, mats: [skin, belly, glowM] };
}
function makeBoat() {
  const g = new THREE.Group(); const wood = new THREE.MeshLambertMaterial({ color: 0x8a5a36, flatShading: true }), trim = new THREE.MeshLambertMaterial({ color: 0xd9d2c2, flatShading: true });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 4.2), wood); hull.position.y = 0.35; g.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 4), wood); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1.4, 1, 0.55); bow.position.set(0, 0.35, 2.8); g.add(bow);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 4.3), trim); rim.position.y = 0.72; g.add(rim);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), trim); mast.position.set(0, 1.9, 0.4); g.add(mast);
  return g;
}
const tmpV = new THREE.Vector3();

export class Raid {
  constructor(env) { Object.assign(this, env); /* scene camera fx ui renderer */ this.alive = false; }

  start(opt) {
    this.opt = opt; const L = this.L = opt.L; const map = this.map = mapOf(opt.map); const P = this.P = plan(opt.seed, map, { cond: opt.corpse ? (opt.corpse.cond || null) : condFor(map, opt.wx ?? forecast(null, map, opt.seed), opt.seed) }); /* M4-B: 예보가 지도 상태를 정함(M4 마무리: 항구만 → 모든 지도 · 남은 가방 판은 그때 상태) */
    const MP = this.M = MAPS[map]; this.Z = MP.zones; this.cond = P.cond || 'normal'; this.wx = opt.wxForce && (WEATHER[opt.wx] || opt.wx === 'none') ? opt.wx : wxFor(map, this.cond, opt.wx ?? forecast(null, map, opt.seed)); /* ?wx= 시험은 지도 상태보다 우선 (카드와 같게) */ this.C = mergeWx(CONDS[this.cond], this.wx, this.cond); this.night = Math.max(MP.night || 0, WEATHER[this.wx]?.night || 0); /* M4-B 판 상태 5 (지도 상태 × 날씨) */ this.lootBonus = (MP.loot || 1) * (opt.L.loot || 1) - 1; /* v0.6 부적 · 난이도 */
    this.floodAt = MP.floodAt ?? RAID.floodAt; this.floodSpeed = MP.floodSpeed ?? RAID.floodSpeed;
    this.R = rng(opt.seed * 7 + 3); this.mods = []; /* M4-B 지도 · 날씨 장치 (pre · player · tick · near · act · pools · wallHit · kill · healed · dispose) */ this.hn?.clear(); this.hn = new HitNums(this.fx.hud);
    this.T = opt.threat || null; this.Anim = Anim; this.variant = k => VARIANTS[this.map]?.[k]; this.unwarned = []; this.tele = null; this.bigHits = 0; /* M4-A 위협 · 예고 검사 */
    this.root = new THREE.Group(); this.scene.add(this.root);
    const M = build(P, this.root); this.boxes = M.boxes; this.water = M.water; this.gates = M.gates; this.gen = M.generator; this.X = M.extra;
    this.time = RAID.time; this.t = 0; this.over = null; this.hitstop = 0; this.shake = 0; this.kick = V(); this.slow = 1;
    this.kills = Object.fromEntries(Object.keys(ENEMIES).map(k => [k, 0])); this.killN = 0; this.dmgDealt = 0; this.shots = 0; this.hits = 0; this.warned = false; this.lastTick = 0;
    this.noises = []; this.enemyShots = []; this.containers = []; this.ownMats = [...M.extra.mats]; this.smokes = []; this.nades = []; this.warns = []; this.hazards = []; this.lines = [];
    this.liftK = map === 'tunnel' || map === 'factory' ? 1.15 : 1; /* v0.7.1 검수 M4 Top 3 */ this.power = false; this.vaultOpened = false; this.zone = 1; this.zoneMax = 1; this.floodZ = 1e4; this.dark = 0; this.boss = null; this.used = [];
    this.blackoutAt = RAID.blackoutAt[0] + this.R() * (RAID.blackoutAt[1] - RAID.blackoutAt[0]);
    this.events = { flood: false, blackout: false, blackoutEnd: false, boss: false, earlyWarn: false, earlyClosed: false };
    /* v0.4 지도 상태: 밤 · 날씨 · 정전 · 물살 · 산소 · 번개 · 등불 꺼짐(선장) */
    this.lamps = this.X.lamps; this.airs = this.X.airs; this.currents = this.X.currents; this.douse = 0; this.flash = 0; this.surge = 0; this.minO2 = 100;
    this.nextBolt = 6 + this.R() * 6; this.surgeAt = map === 'tunnel' ? 150 + this.R() * 40 : 1e9;
    if (this.C.dark) { this.dark = 1e9; this.darkPerm = true; }
    this.o2 = map === 'tunnel' ? L.o2 || O2.max : null; this.o2Max = this.o2;
    this.applyLook(true);
    this.want = new Set(opt.want || []);
    /* 주인공 */
    const h = makeHero(opt.hero); const ws = this.ws = L.weapons; this.wi = 0; /* 수달: 몸 + 장착 = 1번 · 무기(주/보조) = 1번 */
    const pl = this.pl = { root: new THREE.Group(), model: h.root, anim: null, pos: V(P.spawn.x, 0, P.spawn.z), face: Math.PI, hp: L.hp, maxHp: L.hp, stam: PLAYER.stamMax + (L.stamMax || 0),
      roll: 0, rollDir: V(), inv: 0, mags: ws.map(w => w.melee ? Infinity : w.mag), reload: 0, fireCd: 0, spread: ws[0].spread, flash: 0, step: 0, aim: null, moving: false, searching: null, dead: false, lastStand: L.lastStand };
    /* 구르기용 축: root(위치 · 방향) > tilt(몸 가운데 높이에서 옆축으로 앞구르기) > squash(발끝 기준 웅크림) > 모델 */
    pl.tilt = new THREE.Group(); pl.squash = new THREE.Group(); pl.root.add(pl.tilt); pl.tilt.add(pl.squash); pl.squash.add(h.root);
    pl.vel = V(); pl.sq = { y: 1, xz: 1 }; pl.landed = true;
    pl.hero = h; h.root.scale.setScalar(HERO_SCALE); this.root.add(pl.root); pl.anim = new Anim(h.root, h.clips); pl.anim.play('Idle');
    /* 가려져도 보이게: 벽 · 상자 뒤에서는 윤곽만 (깊이 반대로 그림) */
    const xr = new THREE.MeshBasicMaterial({ color: 0x8a6a4c, depthFunc: THREE.GreaterDepth, depthWrite: false }); this.ownMats.push(xr);
    const sk = [h.body];
    for (const o of sk) o.renderOrder = 2;
    for (const o of sk) { const m = new THREE.SkinnedMesh(o.geometry, xr); m.bind(o.skeleton, o.bindMatrix); m.frustumCulled = false; m.renderOrder = 1; m.userData.keepGeo = true; o.parent.add(m); m.position.copy(o.position); m.quaternion.copy(o.quaternion); m.scale.copy(o.scale); }
    pl.mats = []; h.root.traverse(o => { if (o.isMesh) { pl.mats.push(o.material); o.userData.keepGeo = true; } }); this.ownMats.push(...pl.mats);
    /* 가방 · 안전 칸 · 몽이 주머니 */
    this.bag = mkBag(L.bag.w, L.bag.h); this.safe = mkBag(L.safe[0], L.safe[1]); this.pet = L.pet ? mkBag(L.pet.w, L.pet.h) : null;
    petInit(this, opt); /* M5-C 몽이 따라옴 · 반디 어깨 위 */
    for (const k of opt.safeItems || []) { const it = mkItem(k); if (!autoAdd(this.safe, it)) autoAdd(this.bag, it); }
    for (const k of [...(opt.kit || []), ...(opt.carry || [])]) { const it = mkItem(k); if (!autoAdd(this.bag, it) && !(this.pet && autoAdd(this.pet, it))) this.ui.toast(ITEMS[k].name + ' — 가방이 모자라 두고 왔어요', 'soft'); }
    /* 뒤질 곳: 내용은 미리 굴림 (연구대 '상자 등급 빛') */
    for (const Lt of P.loots) {
      const o = prop(LOOT_MODEL[Lt.kind]); o.scale.setScalar(LOOT_SCALE[LOOT_MODEL[Lt.kind]] || 1); o.position.set(Lt.x, 0, Lt.z); o.rotation.y = Lt.ry; this.root.add(o);
      this.boxes.push({ x0: Lt.x - 0.6, z0: Lt.z - 0.6, x1: Lt.x + 0.6, z1: Lt.z + 0.6, bullet: 0 });
      const items = rollLoot(Lt.kind, Lt.zone, this.R, VKEY_CHANCE[Lt.zone] || 0, this.lootBonus);
      const c = { kind: Lt.kind, zone: Lt.zone, pos: V(Lt.x, 0, Lt.z), obj: o, items, searched: false, name: LOOT_TABLE[Lt.kind].name };
      if (L.glow) { const best = Math.max(0, ...items.map(k => ITEMS[k].val)); const col = best >= 70 ? 0xffc94a : best >= 28 ? 0x6fe0d8 : 0x8fa6ae;
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.15, 28), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: best >= 28 ? 0.8 : 0.35, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.set(Lt.x, 0.2, Lt.z); this.root.add(ring); c.ring = ring; c.best = best; }
      else c.best = Math.max(0, ...items.map(k => ITEMS[k].val));
      this.containers.push(c);
    }
    /* 지난번 쓰러진 자리 (한 번 회수) */
    if (opt.corpse && opt.corpse.seed === opt.seed) {
      const c = opt.corpse; const o = new THREE.Group(); const bag = prop('box_small'); bag.scale.setScalar(0.7); o.add(bag);
      const flag = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), new THREE.MeshBasicMaterial({ color: 0xffd36b })); flag.position.y = 1.1; o.add(flag);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), new THREE.MeshBasicMaterial({ color: 0xff8a3d, side: THREE.DoubleSide })); cloth.position.set(0.35, 1.95, 0); o.add(cloth);
      o.position.set(c.x, 0, c.z); this.root.add(o);
      this.containers.push({ kind: 'corpse', zone: zoneOfRow(Math.floor(c.z / RS)), pos: V(c.x, 0, c.z), obj: o, items: c.items.slice(), searched: false, name: '지난번 내 가방', corpse: true });
    }
    /* 탈출 지점 3곳 (조건이 다름) */
    this.exits = P.exits.map(e => {
      const X = { ...EXITS[e.kind], name: MP.exits[e.kind] }; const g = new THREE.Group(); g.position.set(e.x, 0, e.z);
      const ringM = new THREE.MeshBasicMaterial({ color: 0x7dffb2, transparent: true, opacity: 0.85, depthWrite: false });
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.25, 40), ringM); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.18; g.add(ring);
      const fill = new THREE.Mesh(new THREE.CircleGeometry(1.9, 40), new THREE.MeshBasicMaterial({ color: 0x7dffb2, transparent: true, opacity: 0.12, depthWrite: false })); fill.rotation.x = -Math.PI / 2; fill.position.y = 0.17; g.add(fill);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.6, 9, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0x7dffb2, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); beam.position.y = 4.5; g.add(beam);
      const lt = new THREE.PointLight(0x7dffb2, 9, 9, 1.5); lt.position.y = 2; g.add(lt);
      let deco;
      if (map === 'factory') deco = exitDeco(this, e);
      else if (map === 'lab') deco = labExitDeco(this, e);
      else if (map === 'harbor' && e.kind !== 'power') { deco = makeBoat(); deco.position.set(0, 0, -3.2); deco.rotation.y = Math.PI / 2; deco.traverse(o => { if (o.isMesh) { o.userData.own = true; this.ownMats.push(o.material); } }); }
      else { const dk = map === 'harbor' ? 'h_crane' : map === 'tunnel' ? (e.kind === 'sub' ? 'k_tank' : e.kind === 'power' ? 'k_cont_a' : 't_sign') : (e.kind === 'sub' ? 'k_tank' : e.kind === 'power' ? 'k_screen' : 'pallet_s');
        deco = prop(dk); deco.scale.setScalar({ h_crane: 2.3, k_cont_a: 4.2, t_sign: 1.8, k_tank: 2.2, k_screen: 1.4, pallet_s: 0.6 }[dk] || 1); deco.position.set(0, dk === 't_sign' ? 2.2 : 0, dk === 'h_crane' ? -3.4 : -2.7); if (dk === 'k_cont_a') deco.rotation.y = Math.PI / 2; }
      g.add(deco);
      /* 항구 신호 보트: 신호탄을 쏴야 7초 뒤 옴 */
      const call = map === 'harbor' && e.kind === 'sub' ? 'idle' : null; if (call) deco.visible = false;
      this.root.add(g); return { ...e, name: X.name, need: X.hold * (L.hold || 1), pos: V(e.x, 0, e.z), g, ring, ringM, fill, beam, lt, hold: 0, open: true, call, deco, belt: e.belt || null, crane: !!e.crane, term: !!e.term };
    });
    /* 적 */
    this.pop = this.T ? populate(P, map, this.T, opt.seed) : null; /* M4-A: 위협 Lv 만큼 적 섞기 · 늘리기 · 검은 닻 순찰 (지도 생성은 그대로) */
    this.enemies = P.enemies.map((e, i) => this.makeEnemy(e, i));
    this.ai = new AI(this, this.T); /* M3-B 진영 · M4-A 2단계 — 모든 지도 (1단계 = 전과 같음) */
    chiefStart(this, this.T ? chiefRoll(this.T, opt.seed, map, this.cond) : null); this.bossAt = RAID.bossAt - (this.T?.bossEarly || 0);
    if (map === 'factory') factoryStart(this);
    if (map === 'lab') labStart(this); wxStart(this); /* M4-B 연구소 장치 · 판 상태(한파 · 독수 · 헤드램프) */
    if (map === 'gate') gateStart(this); /* M5-A 파수 · 무대 · 출구 조건 */
    this.alive = true; this.paused = false;
    ambience(true);
    this.fx.weather?.(this.C.rain ? 'rain' : null); /* M4-B: 폭풍은 어느 지도든 비 */
    this.ui.raidStart(this);
    if (map !== 'ware') setTimeout(() => this.alive && this.ui.condBand(MP, this.cond), 600); /* 판 상태 띠 한 구절 (v0.5.1 · 자세한 건 출격 준비 ⓘ) */
  }
  /* 지도 · 상태에 맞춘 빛 · 안개 (은신처로 돌아갈 때 되돌림) */
  applyLook(on) {
    const lt = this.lights; if (!lt) return; const sc = this.scene;
    if (on) { this._look = { bg: sc.background.getHex(), fog: [sc.fog.color.getHex(), sc.fog.near, sc.fog.far], hemi: [lt.hemi.intensity, lt.hemi.color.getHex(), lt.hemi.groundColor.getHex()], sun: [lt.sun.intensity, lt.sun.color.getHex()] }; }
    else if (this._look) { const k = this._look; sc.background.setHex(k.bg); sc.fog.color.setHex(k.fog[0]); sc.fog.near = k.fog[1]; sc.fog.far = k.fog[2]; lt.hemi.intensity = k.hemi[0]; lt.hemi.color.setHex(k.hemi[1]); lt.hemi.groundColor.setHex(k.hemi[2]); lt.sun.intensity = k.sun[0]; lt.sun.color.setHex(k.sun[1]); return; }
    this.lookBase = this.map === 'harbor' ? { bg: 0x060d1a, hemi: [1.05, 0x8fb0e0, 0x1a2434], sun: [1.0, 0xb0c8ff] } : this.map === 'tunnel' ? { bg: 0x071114, hemi: [0.95, 0x9fd0d0, 0x1a2426], sun: [1.0, 0xcfe8ff] } : this.map === 'factory' ? factoryLook : this.map === 'lab' ? labLook : null;
    if (!this.lookBase) return; const b = this.lookBase; sc.background.setHex(b.bg); sc.fog.color.setHex(b.bg);
    lt.hemi.color.setHex(b.hemi[1]); lt.hemi.groundColor.setHex(b.hemi[2]); lt.sun.color.setHex(b.sun[1]); this.updateLook(0);
  }
  /* 매 프레임 빛 세기: 번개 · 정전(터널 = 붉은 비상등) · 선장의 등불 끄기 */
  updateLook(dt) {
    const lt = this.lights, b = this.lookBase; if (!lt || !b) return; const sc = this.scene;
    const darkK = this.dark > 0 ? (DUCK.on ? 0.72 : this.map === 'tunnel' ? 0.55 : 0.6) : 1; /* 시안용: 정전도 형태는 보이게 (긴장은 색 · 밝기로) */ const bolt = this.flash > 0 ? 3.2 * (this.flash / 0.25) : 0;
    const lift = this.dark > 0 || (this.night || 0) >= 0.5 ? 1 : (this.liftK || 1); /* v0.7.1 검수 M4 Top 3 */
    lt.hemi.intensity = b.hemi[0] * darkK * lift * (this.douse > 0 ? 0.55 : 1) + bolt; lt.sun.intensity = b.sun[0] * darkK * lift + bolt * 0.6;
    if (this.map === 'tunnel' || this.map === 'factory' || this.map === 'lab') lt.hemi.color.setHex(this.dark > 0 ? 0xc87a70 : b.hemi[1]);
    const f = this.C.fog || [22, 48]; sc.fog.near = f[0] * (this.dark > 0 ? 0.92 : 1); sc.fog.far = f[1] * (this.dark > 0 ? 0.92 : 1);
    if (DUCK.on) { sc.fog.near += DUCK.fogAdd; sc.fog.far += DUCK.fogAdd * 1.15; } /* 시안용: 카메라가 멀어진 만큼 안개도 뒤로 */
  }
  makeEnemy(e, i) {
    const base = ENEMIES[e.kind]; const VR = VARIANTS[this.map]?.[e.kind]; const D = VR ? { ...base, name: VR.name, sight: base.sight * (VR.sight || 1), speed: base.speed * (VR.speed || 1) } : base;
    const Z = this.Z[e.zone || 3]; const boss = !!D.boss; const hpMul = (boss ? 1 : Z.hp * (e.elite ? 1.15 : 1) * (VR?.hp || 1) * (this.T?.hp || 1)) * (this.L.foeHp || 1); /* v0.6 난이도 · M4-A 위협 Lv */
    const en = { kind: e.kind, D, zone: e.zone, elite: !!e.elite, dmgMul: boss ? 1 : Z.dmg * (this.T?.dmg || 1), pos: V(e.x, 0, e.z), vel: V(), face: this.R() * 6.28, hp: D.hp * hpMul, maxHp: D.hp * hpMul, state: 'idle', alert: 0, t: this.R() * 3, cd: 1 + this.R(), home: V(e.x, 0, e.z), target: null, flash: 0, dead: false, wind: 0, id: i, mark: 0, stagger: 0, seen: 0, sleep: false, weakT: 0, pcd: 0 };
    if (PRIM[e.kind]) foeBody(this, en, e); /* M4-A 기뢰 · 소라게 · 문어 */
    else if (e.kind === 'drone') { const d = enemyBody('drone', this.map, e.elite) || makeDrone(e.elite); en.root = d.root; en.d = d; en.mats = d.mats; if (VR?.color && !d.custom) d.mats[0].color.setHex(VR.color);
      if (VR?.spot) { /* 탐조 드론: 앞으로 비추는 빛 부채꼴 (이 안에 들면 바로 알아챔) */ const sm = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
        const cone = new THREE.Mesh(new THREE.CircleGeometry(7, 18, Math.PI / 2 - 0.3, 0.6), sm); cone.rotation.x = -Math.PI / 2; cone.position.y = 0.18; d.root.add(cone); en.spot = cone; en.mats.push(sm); } }
    else if (e.kind === 'crab') { const c = enemyBody('crab', this.map, e.elite) || makeCrab(e.elite); en.root = c.root; en.c = c; en.mats = c.mats; }
    else if (e.kind === 'jelly') { const j = enemyBody('jelly', this.map, e.elite) || makeJelly(e.elite); en.root = j.root; en.j = j; en.mats = j.mats; }
    else if (e.kind === 'eel') { const l = enemyBody('eel', this.map) || makeEel(); en.root = new THREE.Group(); en.vis = this.visGroup(en.root, e.kind); en.vis.add(l.root); en.l = l; en.mats = l.mats; l.root.position.set(0, 0, 0); this.eelInit = false; }
    else {
      const body = { lamp: 'rogue', miner: 'warrior', captain: 'warrior', signal: 'rogue', chief: 'warrior' }[e.kind] || 'skel';
      const c = enemyBody(e.kind, this.map, e.elite) || charClone(body); en.root = new THREE.Group(); (boss ? en.vis = this.visGroup(en.root, e.kind) : en.root).add(c.root); if (c.scale) c.root.scale.setScalar(c.scale); else fitHeight(c.root, boss ? 3.1 : e.kind === 'miner' ? 1.95 : 1.8); en.cust = c; en.anim = new Anim(c.root, c.clips); en.anim.play('Idle_Combat', { speed: boss ? 0.6 : 0.8 }); en.mats = [];
      const tint = c.custom ? null : e.kind === 'boss' ? [0.55, 0.85, 0.75] : e.kind === 'captain' ? [0.85, 0.72, 0.55] : e.kind === 'miner' ? [0.9, 0.82, 0.62] : e.kind === 'smelter' ? [0.95, 0.55, 0.3] : D.fac === 'anchor' ? [0.32, 0.3, 0.3] : VR?.tint || (e.elite ? [0.75, 0.68, 0.6] : null);
      c.root.traverse(o => { if (o.isMesh) { en.mats.push(o.material); if (tint) o.material.color.setRGB(...tint); } }); this.ownMats.push(...en.mats); en.anim.mixer.setTime(this.R() * 2);
      /* 등불 해골 · 선장: 손에 랜턴 (빛나는 공 + 빛 테) */
      if (e.kind === 'lamp' || e.kind === 'captain') { const s = boss ? 1.7 : 1; const lg = new THREE.Group(); const lm = new THREE.MeshBasicMaterial({ color: 0xffc870 }); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 10, 8), lm); lg.add(bulb);
        const halo = glowSprite(0xffb860, 0.55, 1.3 * s); lg.add(halo);
        if (c.lantern) { bulb.visible = false; c.lantern.add(lg); lg.position.set(0, -0.12, 0); lg.scale.setScalar(1 / c.root.scale.x); } else { lg.position.set(0.55 * s, 1.05 * s, 0.25 * s); (en.vis || en.root).add(lg); } en.lantern = { g: lg, m: lm, halo }; en.mats.push(lm, halo.material); }
      if (e.kind === 'captain' && !c.custom) { const hook = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 6, 12, Math.PI * 1.3), new THREE.MeshLambertMaterial({ color: 0x9aa4ad })); hook.position.set(-0.9, 1.9, 0.4); (en.vis || en.root).add(hook); en.mats.push(hook.material); }
      if (e.kind === 'miner' && !c.custom) { const lampM = new THREE.MeshBasicMaterial({ color: 0xfff1b0 }); const hl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), lampM); hl.position.set(0, 1.78, 0.2); en.root.add(hl); en.mats.push(lampM); }
    }
    en.custom = [en.d, en.c, en.j, en.l, en.cust].find(x => x?.custom) || null; if (D.cloak) en.hidden = true;
    en.big = boss || D.radius >= 0.6; en.rimU = rimify(en.mats, facOf(e.kind), this.liftK > 1 || this.wx === 'night' || this.C.dark); /* v0.7.1 검수 M4 Top 1 · 3 */
    if (this.T?.abyss) abyssEnemy(this, en, e, i, THREE); /* M5-B 깊은 물 변형 적 */
    en.root.position.copy(en.pos); this.root.add(en.root);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTex(), transparent: true, depthTest: false })); sp.scale.set(0.9, 0.9, 1); sp.position.y = boss ? ({ boss: 2.9, captain: 3.25, eel: 1.6, smelter: 3.4, mother: 2.6, chief: 3.0 }[e.kind] || 3) * (en.vis?.scale.x || 1) + 1 : e.kind === 'crab' || e.kind === 'mine' ? 1.4 : e.kind === 'hermit' ? 1.9 : 2.6; /* 보스: 설계 키 × 화면 배율 + 1m (커진 머리 위) */ sp.visible = false; sp.renderOrder = 10; en.root.add(sp); en.markSp = sp;
    if (e.squad != null) en.squad = e.squad; this.ai?.join(en); /* M3-B: 판 중에 생긴 적(보스 · 부름)도 진영 */
    return en;
  }

  /* ───── 입력 (ui 가 넣어 줌) ───── */
  input = { mx: 0, mz: 0, fire: false, auto: true, roll: false };
  get w() { return this.ws[this.wi]; }
  get elapsed() { return RAID.time - this.time; }

  /* ───── 충돌 ───── */
  collide(p, r) {
    for (const b of this.boxes) {
      if (b.off) continue;
      const cx = clamp(p.x, b.x0, b.x1), cz = clamp(p.z, b.z0, b.z1); const dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
      if (d2 < r * r) { if (d2 > 1e-6) { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; } else { const l = p.x - b.x0, rr = b.x1 - p.x, t = p.z - b.z0, bt = b.z1 - p.z; const m = Math.min(l, rr, t, bt); if (m === l) p.x = b.x0 - r; else if (m === rr) p.x = b.x1 + r; else if (m === t) p.z = b.z0 - r; else p.z = b.z1 + r; } }
    }
    p.x = clamp(p.x, 0.6, this.P.W - 0.6); p.z = clamp(p.z, 0.6, this.P.H - 0.6);
  }
  /* 선분이 막히는가 (총알 막는 것만) — 맞은 거리 비율 */
  rayBlock(a, b, bulletOnly = true) { /* M4-A 성능: 같은 결과 · 배열 안 만듦 · 선분 상자 밖은 건너뜀 (적 AI 가 많이 부름) */
    let best = 1; const ax = a.x, az = a.z, dx = b.x - ax, dz = b.z - az; const mnx = Math.min(ax, b.x), mxx = Math.max(ax, b.x), mnz = Math.min(az, b.z), mxz = Math.max(az, b.z);
    for (const bx of this.boxes) {
      if (bx.off || (bulletOnly && !bx.bullet) || bx.x1 < mnx || bx.x0 > mxx || bx.z1 < mnz || bx.z0 > mxz) continue;
      let t0 = 0, t1 = best;
      if (Math.abs(dx) < 1e-9) { if (ax < bx.x0 || ax > bx.x1) continue; } else { let ta = (bx.x0 - ax) / dx, tb = (bx.x1 - ax) / dx; if (ta > tb) { const q = ta; ta = tb; tb = q; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) continue; }
      if (Math.abs(dz) < 1e-9) { if (az < bx.z0 || az > bx.z1) continue; } else { let ta = (bx.z0 - az) / dz, tb = (bx.z1 - az) / dz; if (ta > tb) { const q = ta; ta = tb; tb = q; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; }
      if (t0 <= t1 && t0 < best && t0 >= 0) best = t0;
    }
    return best;
  }
  los(a, b) { return this.rayBlock(a, b) >= 0.999; }
  inSmoke(p) { return this.smokes.some(s => s.t > 0 && (p.x - s.x) ** 2 + (p.z - s.z) ** 2 < s.r * s.r); }
  roomOf(p) { const c = Math.floor(p.x / RS), r = Math.floor(p.z / RS); return this.P.rooms.find(x => x.c === c && x.r === r); }
  doorOpen(d) { if (!d.lock) return true; const g = this.gates.find(g => g.door === d); return !g || g.open; }
  /* 방 그래프로 다음 문 찾기 (닫힌 문은 못 지남) */
  waypoint(from, to) {
    const A = this.roomOf(from), B = this.roomOf(to); if (!A || !B || A === B) return to;
    const prev = { [A.id]: null }; const q = [A.id];
    while (q.length) { const k = q.shift(); if (k === B.id) break; for (const d of this.P.doors) { if (!this.doorOpen(d)) continue; const o = d.a === k ? d.b : d.b === k ? d.a : null; if (o != null && !(o in prev)) { prev[o] = { k, d }; q.push(o); } } }
    if (!(B.id in prev)) return null; let k = B.id; while (prev[k] && prev[k].k !== A.id) k = prev[k].k; const step = prev[k]; if (!step) return to;
    const door = V(step.d.x, 0, step.d.z);
    if (door.distanceTo(from) < 1.3) { const N = this.P.rooms.find(r => r.id === k); const c = V(N.x0 + RS / 2, 0, N.z0 + RS / 2); return door.add(c.sub(door).setY(0).normalize().multiplyScalar(2.6)); }
    return door;
  }
  modHit(p, d) { for (const m of this.mods) if (m.wallHit?.(p, d)) return true; return false; } /* M4-B 막힌 탄 → 장치(배양조) */
  noise(p, r, src = 'player') { this.noises.push({ p: p.clone(), r, src, t: 0 }); }
  weight() { return bagWeight(this.bag) + bagWeight(this.safe); }
  speedMul() { const w = this.weight(), c = this.L.bag.comfy; return 1 - WEIGHT.slowMax * clamp((w - c) / c, 0, 1); }
  exitOpen(x) {
    /* 터널 '역 계단'은 시간이 아니라 차오르는 물이 닿으면 잠김 (지도마다 닫히는 때가 다름) */
    if (x.kind === 'early') return this.map === 'tunnel' ? this.floodZ > x.pos.z + 1.5 : this.elapsed < RAID.earlyClose;
    if (x.kind === 'power') return this.power && !(this.dark > 0);
    if (x.cond) return x.cond(); /* M4-B 반출 해치 = 관제 승인 */
    if (x.call) return x.call === 'ready';
    return true;
  }
  exitWhy(x) { if (x.why && !this.exitOpen(x)) return x.why(); if (x.kind === 'early' && !this.exitOpen(x)) return this.map === 'tunnel' ? '물에 잠김' : '잠김'; if (x.kind === 'power' && !this.power) return '전원 필요'; if (x.kind === 'power' && this.dark > 0) return '정전 중';
    if (x.call === 'idle') return x.crane ? '레버로 부르기' : '신호탄 필요'; if (x.call === 'wait') return `${x.crane ? '바구니' : '보트'} 오는 중 ${Math.ceil(x.arrive)}초`; return ''; }
  isBoss(e) { return !!e.D.boss; }
  /* 빛 웅덩이(켜진 등불 · 랜턴 든 적 · 불붙은 기름 · 공기 방울) — 화면 시야 · 적 보임 · '빛 속이면 더 잘 보임' */
  lightPools() {
    const out = []; if (this.douse <= 0) for (const L of this.lamps) if (L.lit && !(this.dark > 0 && this.map === 'harbor')) out.push({ x: L.x, z: L.z, r: LAMP.r });
    for (const e of this.enemies) if (!e.dead && !e.sleep && e.D.light && this.douse <= 0) out.push({ x: e.pos.x, z: e.pos.z, r: e.D.light });
    for (const h of this.hazards) out.push({ x: h.x, z: h.z, r: h.r + 1.2 });
    for (const a of this.airs) out.push({ x: a.x, z: a.z, r: 2.6 });
    out.push(...flarePools(this)); /* v0.6 조명탄 */
    for (const m of this.mods) m.pools?.(out); /* M4-B 빛이끼 · 터미널 */
    return out;
  }
  inLight(p, pad = 0) { for (const L of this.lightPools()) if ((p.x - L.x) ** 2 + (p.z - L.z) ** 2 < (L.r + pad) ** 2) return true; return false; }
  /* 화면 가리개 숫자: 어둠 · 시야 배수 (ui.drawVeil) */
  veilParams() {
    const night = this.night || 0; let dark = this.darkPerm ? (this.L.blackout < 1 ? 0.7 : 0.78) : this.dark > 0 ? (this.L.blackout < 1 ? 0.74 : 0.86) : 0.62 + night * 0.12;
    if (this.liftK > 1 && !this.darkPerm && !(this.dark > 0) && night < 0.5) dark *= 0.85; /* v0.7.1 검수 M4 Top 3: 터널 · 공장 등불 원 밖 +15% (밤 · 정전은 그대로) */
    let vis = this.L.vision * (this.dark > 0 || this.darkPerm || night ? this.L.dark || 1 : 1) * (this.dark > 0 && this.L.blackout >= 1 ? 0.75 : 1) * (this.C.vis || 1) * (night ? 0.92 : 1) * (this.wxVis || 1); if (night || this.dark > 0) dark *= this.wxDark || 1; /* M4-B 고성능 헤드램프 */
    if (this.douse > 0) { dark = Math.max(dark, 0.9); vis *= 0.55; }
    if (this.flash > 0) { dark *= 0.25; vis *= 2; }
    return { dark: Math.min(0.93, dark), vis, pools: this.lightPools() };
  }
  inDeep(p) { if (p.z > this.floodZ) return true; if (!this.P.flooded) return false; const rm = this.roomOf(p); return !!rm && this.P.flooded.includes(rm.id); }

  /* ───── 매 프레임 ───── */
  update(rdt) {
    if (!this.alive) return; this.hn.tick(rdt, this.camera);
    let dt = Math.min(rdt, 1 / 20);
    if (this.hitstop > 0) { this.hitstop -= rdt; dt = 0.0; }
    dt *= this.slow * (this.ui.invOpen ? 0.25 : 1);
    if (this.paused) dt = 0;
    this.t += dt;
    if (!this.over) { this.time -= dt; this.timeline(dt);
      if (this.time <= RAID.warnAt && !this.warned) { this.warned = true; sfx.siren(); this.ui.toast(this.map === 'harbor' ? '만조 1분 전! 열린 출구로' : '물이 다 차기 1분 전! 열린 출구로', 'warn'); }
      if (this.time <= 10 && Math.floor(this.time) !== this.lastTick) { this.lastTick = Math.floor(this.time); sfx.tick(); }
      if (this.time <= 0) { this.time = 0; this.die('tide'); } }
    this.updatePlayer(dt); this.updateEnemies(dt); this.updateShots(dt); this.updateThrows(dt); this.updateExits(dt); this.updateGates(dt); this.updateMapFx(dt); chiefTick(this, dt);
    for (let i = this.noises.length - 1; i >= 0; i--) if ((this.noises[i].t += dt) > 0.1) this.noises.splice(i, 1);
    this.water.material.uniforms.uTime.value += dt;
    this.ui.raidHud(this);
  }
  /* 판 중 사건: 침수 · 입구 사다리 닫힘 · 정전 · 수문지기 */
  timeline(dt) {
    const el = this.elapsed, E = this.events;
    const EX = this.M.exits, early = this.exits[0];
    if (this.map === 'tunnel') { /* 역 계단: 물이 8m 앞까지 오면 알림 · 닿으면 잠김 */
      if (!E.earlyWarn && E.flood && this.floodZ < early.pos.z + 10) { E.earlyWarn = true; this.ui.event(`${EX.early}${josa(EX.early, '이', '가')} 곧 물에 잠겨요`, 'warn'); sfx.warn(); }
      if (!E.earlyClosed && !this.exitOpen(early)) { E.earlyClosed = true; this.ui.event(this.power ? `${EX.early} 잠김 — ${EX.power}${josa(EX.power, '으로', '로')}` : `${EX.early} 잠김 — 발전기를 켜서 ${EX.power}${josa(EX.power, '으로', '로')}!`, 'warn'); } }
    else {
      if (!E.earlyWarn && el >= RAID.earlyClose - 20) { E.earlyWarn = true; this.ui.event(`${EX.early}${josa(EX.early, '이', '가')} 20초 뒤 잠겨요`, 'warn'); sfx.warn(); }
      if (!E.earlyClosed && el >= RAID.earlyClose) { E.earlyClosed = true; this.ui.event(this.power ? `${EX.early} 잠김 — ${EX.power}${josa(EX.power, '으로', '로')}` : `${EX.early} 잠김 — 발전기를 켜서 ${EX.power}${josa(EX.power, '으로', '로')}!`, 'warn'); } }
    if (el >= this.floodAt) {
      if (!E.flood) { E.flood = true; this.ui.event(this.map === 'harbor' ? '밀물이 들어와요 — 부두부터 잠겨요' : this.map === 'tunnel' ? '터널에 물이 차요 — 승강장부터 잠기고 산소가 줄어요' : this.map === 'factory' ? '공장에 물이 차요 — 하역장부터 잠겨요' : '물이 차오르기 시작해요 — 입구부터 잠겨요', 'warn'); sfx.warn(); }
      this.floodZ = this.P.H - (el - this.floodAt) * this.floodSpeed; this.water.userData.flood = this.floodZ; this.water.material.uniforms.uFlood.value = this.floodZ;
    }
    if (!E.blackout && el >= this.blackoutAt && !this.darkPerm) { E.blackout = true; this.dark = RAID.blackoutLen;
      this.ui.event(this.map === 'harbor' ? '항구 전기가 나갔어요 — 등불이 꺼졌어요' : this.map === 'factory' ? '공장 전기가 나갔어요 — 컨베이어 · 크레인이 멈췄어요' : this.L.blackout < 1 ? '정전! 헤드램프 덕에 반쯤 보여요' : '정전! 적도 잘 못 봐요 — 승강기 잠시 멈춤', 'warn'); sfx.warn(); }
    if (this.dark > 0 && !this.darkPerm) { this.dark -= dt; if (this.dark <= 0) { this.dark = 0; this.ui.event(this.map === 'harbor' ? '등불이 다시 켜졌어요' : '전기가 돌아왔어요', 'good'); } }
    /* 터널 급류: 한 번, 25초 동안 물살 2배 */
    if (el >= this.surgeAt && !E.surge) { E.surge = true; this.surge = 25; this.ui.event('급류가 몰려와요! 물살이 두 배 — 25초', 'warn'); sfx.warn(); }
    if (this.surge > 0) { this.surge -= dt; if (this.surge <= 0) this.ui.event('물살이 잦아들었어요', 'good'); }
    if (!E.boss && (el >= (this.bossAt ?? RAID.bossAt) || this.zone === 3)) this.spawnBoss();
  }
  spawnBoss() {
    this.events.boss = true; const B = this.P.boss; const kind = this.M.bossKind; const e = this.makeEnemy({ kind, x: B.x, z: B.z, zone: 3 }, 999);
    e.state = this.zone === 3 ? 'chase' : 'idle'; e.target = this.pl.pos.clone(); this.enemies.push(e); this.boss = e;
    sfx.roar(); this.shake = Math.max(this.shake, 0.5); this.fx.burst(B.x, 0.3, B.z, 30, 0xbfe8ee, 7, 0.14, 1, 18);
    const tip = { boss: '바닥 경고 원을 조심 · 내려찍은 뒤 가슴 보관함이 약점', captain: '바닥 줄은 옆으로 · 내려찍은 뒤 랜턴이 약점', eel: '돌진을 벽으로 유도하면 기절 · 물속 방전 조심', smelter: '쇳물 줄은 옆으로 · 내려찍은 뒤 가슴 용광로가 약점', mother: '덩굴 줄은 옆으로 · 내려친 뒤 심장 산호가 약점 · 불이 이끼를 태워요' }[kind];
    const ig = e.D.name + josa(e.D.name, '이', '가'); this.ui.event(this.zone === 3 ? `${ig} 깨어났어요! ${tip}` : `깊은 곳에서 ${ig} 깨어났어요`, 'boss');
  }
  updatePlayer(dt) {
    const pl = this.pl, inp = this.input, L = this.L; if (pl.dead) { pl.roll = 0; this.rollPose(dt); pl.anim.mixer.update(dt); return; }
    pl.inv = Math.max(0, pl.inv - dt); pl.fireCd -= dt; pl.flash = Math.max(0, pl.flash - dt);
    pl.stam = Math.min(PLAYER.stamMax + (L.stamMax || 0), pl.stam + PLAYER.stamRegen * L.stam * dt * (pl.roll > 0 ? 0 : 1));
    const wet = pl.wet = this.water.userData.mask(pl.pos.x, pl.pos.z) > 0.15; armsTick(this, dt); petTick(this, dt);
    const heavy = this.weight() > L.bag.comfy;
    pl.slowMul = 1; pl.grip = 1; pl.lit = false; for (const m of this.mods) m.pre?.(dt); /* M4-B 이끼 자리 · 얼음 · 체온 */
    /* 이동 */
    let mx = inp.mx, mz = inp.mz; const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    const rollCost = PLAYER.rollCost * (heavy ? 1 + WEIGHT.rollExtra : 1) * (L.roll || 1);
    if (inp.roll && pl.roll <= 0) { inp.roll = false; if (pl.stam >= rollCost) { pl.stam -= rollCost; pl.roll = PLAYER.rollTime; pl.inv = PLAYER.rollTime + 0.04; pl.landed = false; pl.rollDir.set(ml > 0.1 ? mx : Math.sin(pl.face), 0, ml > 0.1 ? mz : Math.cos(pl.face)).normalize(); pl.face = Math.atan2(pl.rollDir.x, pl.rollDir.z); pl.rollPh = 0; pl.anim.play('PickUp', { once: true, fade: 0.04, speed: 1.6, force: true }); sfx.roll(); this.fx.burst(pl.pos.x, 0.15, pl.pos.z, 6, 0xbfe2e8, 2.2, 0.08, 0.35); if (pl.searching) this.cancelSearch(); } else { this.ui.toast(heavy ? '짐이 무거워 숨이 차요 — 가방을 덜어 봐요' : '숨이 차요 — 잠깐 쉬면 구를 수 있어요', 'soft'); sfx.empty(); } }
    if (pl.roll > 0) {
      /* 웅크림(0.05) → 굴러감 → 착지(0.05) · 속도는 굴러가는 첫 순간이 가장 빠르고 착지로 줄어듦 */
      const T = PLAYER.rollTime, A = PLAYER.rollCrouch, C = PLAYER.rollLand, el = T - pl.roll;
      const f = el < A ? 0.3 : el < T - C ? 1 - 0.55 * (el - A) / (T - A - C) : 0.2;
      const sp = PLAYER.rollSpeed * f * (heavy ? 0.85 : 1);
      pl.pos.addScaledVector(pl.rollDir, sp * dt); pl.face = Math.atan2(pl.rollDir.x, pl.rollDir.z);
      /* 동작: 웅크림 = 줍기 자세(허리 굽힘) → 굴러감 = 앉은 자세(무릎 · 팔 · 작살총을 몸에 붙임 = 공처럼) → 착지 = 달리기/서기로 */
      if (pl.rollPh === 0 && el >= A) { pl.rollPh = 1; pl.anim.play('Sit_Chair_Idle', { fade: 0.06, force: true }); }
      if (pl.rollPh === 1 && el >= T - C) { pl.rollPh = 2; pl.anim.play(ml > 0.1 ? 'Running_A' : 'Idle', { fade: 0.08, force: true }); }
      if (!pl.landed && el >= T - C) { pl.landed = true; this.fx.burst(pl.pos.x, 0.12, pl.pos.z, 16, wet ? 0xcfeef2 : 0xd8c8a8, 3.6, 0.16, 0.5); this.shake = Math.max(this.shake, 0.12); if (wet) this.fx.ring(pl.pos.x, pl.pos.z, 0.8); sfx.step(); this.noise(pl.pos, 4); }
      pl.roll -= dt;
      if (pl.roll <= 0) { pl.roll = 0; pl.vel.copy(pl.rollDir).multiplyScalar(ml > 0.1 ? PLAYER.speed * 0.6 : 0); }
    } else {
      const speed = PLAYER.speed * L.speed * this.speedMul() * (wet ? 0.78 : 1) * (pl.searching ? 0 : 1) * (pl.reload > 0 ? 0.85 : 1) * pl.slowMul;
      /* 가속 · 감속: 출발은 바로 45% 에서 시작해 약 0.08초에 최고 속도 · 멈춤은 약 0.12m 만 밀림 · 반대 방향은 멈춤 빠르기로 */
      const tx = mx * speed, tz = mz * speed, tl = Math.hypot(tx, tz), vl = Math.hypot(pl.vel.x, pl.vel.z);
      if (tl > 0.01 && vl < 0.25 * tl && pl.grip >= 1) { pl.vel.x = tx * PLAYER.kick; pl.vel.z = tz * PLAYER.kick; }
      const dot = pl.vel.x * tx + pl.vel.z * tz;
      const k = (tl < 0.01 ? PLAYER.dec : dot < 0 ? PLAYER.turn : PLAYER.acc) * pl.grip; /* M4-B 얼음 = 미끄러짐 */
      const a = 1 - Math.exp(-k * dt); pl.vel.x += (tx - pl.vel.x) * a; pl.vel.z += (tz - pl.vel.z) * a;
      if (tl < 0.01 && Math.hypot(pl.vel.x, pl.vel.z) < 0.05) pl.vel.set(0, 0, 0);
      pl.pos.x += pl.vel.x * dt; pl.pos.z += pl.vel.z * dt; pl.moving = ml > 0.12 && !pl.searching;
      if (pl.moving) { pl.step -= dt * ml * (PLAYER.speed / 5.2); if (pl.step <= 0) { pl.step = 0.32; if (wet) { sfx.splash(); this.fx.ring(pl.pos.x, pl.pos.z, 0.5); this.fx.burst(pl.pos.x, 0.15, pl.pos.z, 3, 0xcfeef2, 2, 0.06, 0.35); } else sfx.step(); this.noise(pl.pos, (wet ? 6 : 3.2) * ((this.ai?.lv || 1) >= 2 ? AI2.step[0] + (AI2.step[1] - AI2.step[0]) * Math.min(1, ml) : 1)); } } /* M4-A: 살살 걸으면 발소리 작게 */
    }
    /* v0.4 물살(터널) · 갈고리 끌림(선장) · 물결 밀림(장어) */
    if (this.currents.length) { const k = CURRENT.speed * (this.C.current || 1) * (this.surge > 0 ? 2 : 1); pl.inCurrent = null; for (const c of this.currents) if (pl.pos.x > c.x0 && pl.pos.x < c.x1 && pl.pos.z > c.z0 && pl.pos.z < c.z1) { pl.pos.x += c.dx * k * dt; pl.pos.z += c.dz * k * dt; pl.inCurrent = c; } }
    if (pl.pull) { const st = Math.min(pl.pull.left, 18 * dt); pl.pos.addScaledVector(pl.pull.dir, st); pl.pull.left -= st; if (pl.pull.left <= 0.01) pl.pull = null; }
    if (pl.push) { pl.pos.addScaledVector(pl.push, dt); pl.push.multiplyScalar(Math.pow(0.02, dt)); if (pl.push.length() < 0.2) pl.push = null; }
    if (this.F) factoryPlayer(this, dt); /* 공장: 벨트 · 쇳물 · 증기 · 반출구 타기 */
    for (const m of this.mods) m.player?.(dt); /* M4-B 체온 · 독 */
    this.rollPose(dt);
    this.collide(pl.pos, PLAYER.radius);
    /* 구역 */
    const z = zoneOfRow(clamp(Math.floor(pl.pos.z / RS), 0, ROWS - 1));
    if (z !== this.zone) { this.zone = z; if (z > this.zoneMax) { this.zoneMax = z; const bn = ENEMIES[this.M.bossKind].name; this.ui.event(z === 2 ? `${this.Z[2].name} — 전리품이 좋아지고, 적도 강해져요` : `${this.Z[3].name} — 가장 값진 곳. ${bn}${josa(bn, '을', '를')} 조심`, z === 3 ? 'boss' : 'good'); } }
    /* 산소 (해저 터널): 짙은 물 안에서 줄고(깊은 구역은 수압으로 더) · 공기 방울 기둥에서 빨리 · 마른 곳에서 천천히 참 */
    if (this.o2 != null && !pl.dead) {
      const air = this.airs.some(a => (a.x - pl.pos.x) ** 2 + (a.z - pl.pos.z) ** 2 < 2.6); const deep = this.inDeep(pl.pos); pl.air = air; pl.deep = deep;
      if (air) this.o2 = Math.min(this.o2Max, this.o2 + O2.air * dt);
      else if (deep) this.o2 = Math.max(0, this.o2 - O2.drain * (this.zone === 3 ? O2.deep : 1) * (this.L.o2Drain || 1) * dt);
      else this.o2 = Math.min(this.o2Max, this.o2 + O2.dry * dt);
      this.minO2 = Math.min(this.minO2, this.o2 / this.o2Max * 100);
      if (this.o2 < O2.auto && this.hasItem('o2')) { this.takeOne('o2'); this.used.push('o2'); this.o2 = Math.min(this.o2Max, this.o2 + O2.can); this.ui.toast(`산소 캔! +${O2.can}`, 'good'); sfx.pick(3); }
      if (this.o2 < 30 && !this.o2warn) { this.o2warn = true; this.ui.event('산소가 30 아래 — 공기 방울 기둥으로!', 'warn'); sfx.warn(); } if (this.o2 > 55) this.o2warn = false;
      if (this.o2 <= 0) { pl.o2t = (pl.o2t || 0) + dt; if (pl.o2t >= 1) { pl.o2t = 0; this.hurtRaw(O2.hurt, '숨이 막혀요 — 공기 방울로!'); } } else pl.o2t = 0;
    }
    /* 불붙은 기름 웅덩이 */
    for (const hz of this.hazards) if ((pl.pos.x - hz.x) ** 2 + (pl.pos.z - hz.z) ** 2 < hz.r * hz.r && pl.roll <= 0) { hz.tick += dt; if (hz.tick >= 0.5) { hz.tick = 0; this.hurtRaw(hz.dps * 0.5, '불이 붙었어요 — 비켜요!'); } }
    /* 조준: 보이는 가장 가까운 적 */
    const w = this.w; let best = null, bd = w.range;
    for (const e of this.enemies) { if (e.dead || e.sleep || e.hidden) continue; const d = e.pos.distanceTo(pl.pos); if (d < bd && this.los(pl.pos, e.pos)) { bd = d; best = e; } } /* M4-A 숨은 문어는 못 노림 */
    pl.aim = best;
    let want = pl.face;
    if (best) want = Math.atan2(best.pos.x - pl.pos.x, best.pos.z - pl.pos.z); else if (pl.moving) want = Math.atan2(mx, mz);
    if (pl.roll <= 0) pl.face += angDiff(pl.face, want) * Math.min(1, dt * (best ? 22 : 14));
    /* 장전 */
    if (pl.reload > 0) { pl.reload -= dt; if (pl.reload <= 0) pl.mags[this.wi] = w.mag; }
    /* 사격 */
    const wantFire = (inp.fire || (inp.auto && best)) && pl.roll <= 0 && !pl.searching;
    if (wantFire && pl.reload <= 0 && pl.fireCd <= 0) { if (pl.mags[this.wi] <= 0) this.startReload(); else this.fire(best); }
    if (!wantFire) pl.spread = Math.max(w.spread, pl.spread - w.rec * dt);
    if (pl.mags[this.wi] <= 0 && pl.reload <= 0 && !wantFire) this.startReload();
    /* 애니 */
    if (pl.roll <= 0 && !pl.searching) {
      const n = pl.anim.curName; const shooting = n === '1H_Ranged_Shoot' && pl.anim.cur.isRunning();
      /* 달리기 동작 빠르기 = 실제 속도에 맞춤(5.2m/초에서 1.05 가 발 미끄러짐 없음) */
      if (!shooting) { if (pl.moving) pl.anim.play('Running_A', { speed: clamp(1.05 * Math.hypot(pl.vel.x, pl.vel.z) / 5.2, 0.55, 1.4) }); else if (best) pl.anim.play('1H_Ranged_Aiming'); else pl.anim.play('Idle'); }
    }
    pl.anim.mixer.update(dt); tailWag(pl.hero, dt, pl.roll > 0 ? 0 : Math.hypot(pl.vel.x, pl.vel.z));
    pl.root.position.copy(pl.pos); pl.root.rotation.y = pl.face;
    const fl = pl.flash > 0 ? 1 : 0; for (const m of pl.mats) m.emissive?.setRGB(fl * 0.9, fl * 0.25, fl * 0.2);
    /* 뒤지기 · 전원 켜기 진행 */
    if (pl.searching) { const s = pl.searching; s.prog += dt / s.need; if (s.prog >= 1) { pl.searching = null; if (s.kind === 'gen') this.powerOn(); else if (s.kind === 'lamp') this.toggleLamp(s.L); else if (s.kind === 'flare') { if (s.x.crane) callCrane(this, s.x); else this.fireFlare(s.x); } else if (s.kind === 'mod') s.done(); else this.openContainer(s.c); } }
    /* 가까운 할 일: 상자 · 발전기 · 잠긴 문 */
    let near = null, nd = 2.1;
    for (const c of this.containers) { const d = c.pos.distanceTo(pl.pos); if (d < nd && (!c.searched || (c.items && c.items.length))) { nd = d; near = { type: 'loot', c }; } }
    const G = this.gen.pos; if (!this.power && Math.hypot(G.x - pl.pos.x, G.z - pl.pos.z) < 2.6) near = { type: 'gen' };
    for (const g of this.gates) if (!g.open && g.door.lock === 'vault' && Math.hypot(g.door.x - pl.pos.x, g.door.z - pl.pos.z) < 2.8) near = { type: 'gate', g };
    if (!this.power) for (const g of this.gates) if (!g.open && g.door.lock === 'power' && Math.hypot(g.door.x - pl.pos.x, g.door.z - pl.pos.z) < 2.6 && !near) near = { type: 'gate', g };
    if (!near) for (const L of this.lamps) if (Math.hypot(L.x - pl.pos.x, L.z - pl.pos.z) < 2.0) { near = { type: 'lamp', L }; break; }
    for (const x of this.exits) if (x.call === 'idle' && x.pos.distanceTo(pl.pos) < 2.4) near = { type: 'flare', x, label: x.crane ? '바구니 부르기' : null };
    for (const m of this.mods) if (m.near) near = m.near(near); /* M4-B 관제 터미널 */
    this.near = near;
  }
  /* 앞구르기 몸 자세: 웅크림(납작) → 진행 방향 옆축으로 360도 · 몸을 공처럼(작게) → 착지(납작) → 원래대로 튕겨 돌아옴
     회전 중심 = 지금 몸 높이의 가운데 → 거꾸로 섰을 때도 머리가 바닥에 묻히지 않음 */
  rollPose(dt) {
    const pl = this.pl, T = PLAYER.rollTime, A = PLAYER.rollCrouch, C = PLAYER.rollLand; let ang = 0, ty = 1, txz = 1;
    if (pl.roll > 0) {
      const el = T - pl.roll;
      if (el < A) { const u = el / A; ty = 1 - 0.24 * u; txz = 1 + 0.1 * u; }
      else if (el < T - C) { const u = (el - A) / (T - A - C); ang = Math.PI * 2 * (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u)) * 0.97 + Math.PI * 2 * 0.03 * u; ty = 0.66; txz = 0.9; }
      else { const u = (el - (T - C)) / C; ang = 0; ty = 0.8 + 0.08 * u; txz = 1.1 - 0.04 * u; }
      pl.sq.y = ty; pl.sq.xz = txz;
    } else { const a = 1 - Math.exp(-dt * 22); pl.sq.y += (1 - pl.sq.y) * a; pl.sq.xz += (1 - pl.sq.xz) * a; }
    const H = 1.75, c = H * 0.5 * pl.sq.y;
    pl.tilt.position.y = c; pl.tilt.rotation.x = ang; pl.squash.position.y = -c; pl.squash.scale.set(pl.sq.xz, pl.sq.y, pl.sq.xz);
  }
  switchWeapon() { if (this.ws.length < 2 || this.pl.dead) return; this.wi = (this.wi + 1) % this.ws.length; setWeapon(this.pl.hero, this.wi); this.pl.reload = 0; this.pl.fireCd = 0.25; this.pl.spread = this.w.spread; sfx.reload(); this.ui.toast(this.w.name, 'soft'); }
  startReload() { const pl = this.pl; if (pl.reload > 0) return; pl.reload = this.w.reload; sfx.reload(); this.noise(pl.pos, 5); }
  fire(target) {
    const pl = this.pl, w = this.w; const wm = waterMul(this, w); pl.fireCd = 1 / (w.rate * (wm?.rate || 1)); this.shots++; pl.shotT = this.t; /* M4-A: 눌림(엄폐한 적이 덜 내밂) · M5-C 노는 물에서 빠름 */
    if (w.melee) return swing(this, target); /* v0.6 렌치: 탄 없음 */
    pl.mags[this.wi]--; const RNG = w.range * (wm?.range || 1), DM = wm?.dmg || 1; let boomAt = null, pullAt = null, firstHit = null;
    if (w.swarm) { const base0 = target ? Math.atan2(target.pos.x - pl.pos.x, target.pos.z - pl.pos.z) : pl.face; const dir0 = V(Math.sin(base0), 0, Math.cos(base0)); const mz0 = pl.pos.clone().addScaledVector(dir0, 0.75); mz0.y = 1.05;
      shotSig(this, w, 0, 1, mz0, mz0, dir0, [], 1); swarmFire(this, target); sfx.shot(); fireFeel(this, w, base0, false); pl.anim.play('1H_Ranged_Shoot', { once: true, fade: 0.04, speed: 2.2, force: true }); this.noise(pl.pos, w.noise); return; } /* M5-C 불꽃 다연장: 유도 세 발 */
    const base = target ? Math.atan2(target.pos.x - pl.pos.x, target.pos.z - pl.pos.z) : pl.face;
    const n = w.pellets; let hitAny = false;
    for (let k = 0; k < n; k++) {
      const ang = base + (n > 1 ? ((k + 0.5) / n - 0.5) * 2 * w.spread + (this.R() - 0.5) * w.spread * 0.4 : (this.R() - 0.5) * 2 * pl.spread);
      const dir = V(Math.sin(ang), 0, Math.cos(ang));
      const muzzle = pl.pos.clone().addScaledVector(dir, 0.75); muzzle.y = 1.05;
      const end = pl.pos.clone().addScaledVector(dir, RNG); end.y = 1.0;
      const tb = this.rayBlock(pl.pos, end);
      /* 맞는 적들 (거리 순) — 작살은 꿰뚫음 */
      const hits = [];
      for (const e of this.enemies) { if (e.dead || e.sleep) continue; const fx = e.pos.x - pl.pos.x, fz = e.pos.z - pl.pos.z; const t = (fx * dir.x + fz * dir.z) / RNG; if (t < 0 || t > tb) continue; const px = pl.pos.x + dir.x * t * RNG - e.pos.x, pz = pl.pos.z + dir.z * t * RNG - e.pos.z; if (px * px + pz * pz < (e.D.radius + 0.12) ** 2) hits.push({ e, t }); }
      hits.sort((a, b) => a.t - b.t); const take = hits.slice(0, 1 + (w.pierce || 0));
      const ht = take.length ? take[take.length - 1].t : tb;
      const hit = pl.pos.clone().lerp(end, ht); hit.y = 1.0;
      shotSig(this, w, k, n, muzzle, hit, dir, take, tb); /* v0.6.1 무기 서명 효과 · 총구 · 탄피 · 궤적 (arms.js) */
      if (w.blast || w.net) { boomAt = hit.clone(); if (take.length) boomAt.copy(take[0].e.pos); hitAny = take.length > 0; continue; } /* 조명탄 · M5-C 그물: 아래에서 터짐/펼쳐짐 */
      for (const h of take) { const dd = w.dmg * DM * (0.9 + this.R() * 0.2); this.damage(h.e, dd, dir, pl.pos.clone().lerp(end, h.t).setY(1.0), w.crit, n > 1, { gun: true }); if (w.chain) zap(this, h.e, dd); onGunHit(this, w, h.e, dd, dir); if (!firstHit) firstHit = h.e; hitAny = true; }
      if (w.pull && k === 0) { pullAt = take.length ? take[0].e.pos.clone() : hit.clone(); } /* M5-C 닻 */
      if (!take.length && tb < 0.999 && this.mods.length) this.modHit(hit, w.dmg * DM); /* M4-B 배양조 유리 */
      if (!take.length && tb < 0.999 && k % 2 === 0) { this.fx.burst(hit.x, hit.y, hit.z, 5, 0xd9c7a0, 4, 0.09, 0.45, 22, V(-dir.x, 0, -dir.z)); if (k === 0) sfx.cover(); }
    }
    if (boomAt) lob(this, boomAt); /* v0.6.1 조명탄은 날아가서 터짐 · M5-C 그물도 날아가서 펼쳐짐 */
    if (pullAt) anchorPull(this, pullAt, w, firstHit); if (w.ricochet && firstHit) ricochet(this, w, firstHit); /* M5-C 닻 끌어 모음 · 물보라 튕김 */
    if (hitAny) this.hits++;
    pl.spread = Math.min(w.max, pl.spread + w.add);
    sfx.shot(); fireFeel(this, w, base, this.R() < 0.5); /* 흔들림 · 반동 = 무기 표 FEEL (판 난수는 전처럼 한 번) */
    pl.anim.play('1H_Ranged_Shoot', { once: true, fade: 0.04, speed: 2.2, force: true });
    this.noise(pl.pos, w.noise);
  }
  damage(e, dmg, dir, at, critChance = 0.1, pellet = false, how = {}) {
    if (e.dead || e.guard > 0) return; const boss = !!e.D.boss; /* M5-A guard = 파수 단계 바뀜(무적) */
    const crit = this.R() < critChance;
    /* 약점(보스 기절 · 랜턴) ×2 · 광부 해골은 앞에서 맞으면 방패로 막음 */
    const weak = e.weakT > 0 ? (BOSS[e.kind]?.weakMul || 2) : 1;
    const am = ammoMul(this, e, how); /* v0.6 탄약 × 방어 · 기계 · 보스 */
    const shield = e.D.shield && dir && (dir.x * Math.sin(e.face) + dir.z * Math.cos(e.face)) < -0.45 ? 1 - e.D.shield * am.shield : 1;
    const d = Math.max(1, Math.round(dmg * (crit ? 1.8 : 1) * weak * shield * am.m));
    e.hp -= d; if (e.hpFloor && e.hp < e.hpFloor) e.hp = e.hpFloor; /* M5-A 파수: 다음 단계 문턱 아래로는 단계가 바뀐 뒤에 */ this.dmgDealt += d; if (!(e.flashCd > this.t)) { e.flash = 0.08; e.flashCd = this.t + 0.2; } /* v0.7.1 검수 M4 Top 1: 번쩍임 0.2초에 한 번 (연사에도 흰색이 끊김) */ e.stagger = boss ? 0.03 : e.kind === 'miner' ? 0.05 : 0.12; e.sleep = false;
    const hf = hitFeel(this, how); /* v0.6.1 무기마다 넉백 · 히트스톱 배수 */
    e.vel.addScaledVector(dir, this.w.knock * hf.push * (e.kind === 'drone' ? 1.4 : boss ? 0.15 : e.kind === 'jelly' ? 0.4 : e.kind === 'crab' ? 1.3 : 1) * (pellet ? 0.35 : 1));
    this.hitstop = Math.max(this.hitstop, (crit || weak > 1 ? 0.07 : pellet ? 0.02 : 0.04) * hf.stop);
    const metal = e.kind === 'drone' || (shield < 1);
    this.fx.burst(at.x, at.y, at.z, metal ? 9 : 7, metal ? 0xffd27a : 0xf2ecd8, 6, 0.08, 0.4, 20, dir);
    if (metal) this.fx.burst(at.x, at.y, at.z, 3, 0x3a4148, 4, 0.13, 0.7, 24, dir);
    hitSig(this, e, at, dir, { crit, weak: weak > 1, how }); (metal ? sfx.hitMetal : sfx.hit)(0, crit || weak > 1 || !!how.melee); /* 탄약 3 · 무기 서명 명중 · 굵은 소리 = 치명 · 약점 · 근접 */
    const at3 = weak > 1 && weakPoint(e); /* 약점 숫자는 커진 모델의 약점 위에서 (숫자가 1.8m 올림) */
    if (shield < 1) this.fx.burst(at.x, at.y, at.z, 6, 0xfff0c0, 9, 0.05, 0.22, 6, tmp2.copy(dir).multiplyScalar(-1)); /* 막힘 = 방패 불꽃(튕겨 나옴) */
    const nE = how.chainTo && !how.chainTo.dead ? how.chainTo : e; this.hn.hit(nE, at3 ? tmp3.set(at3.x, at3.y - 1.8, at3.z) : nE.pos, d, weak > 1 ? 'weak' : crit ? 'crit' : shield < 1 ? 'block' : '', weak); /* v0.7.1 검수 M4 Top 2: 연쇄는 첫 적 숫자에 합침 · 보스 약점은 체력 줄 아래 한 줄 */ /* 같은 적 0.25초 안은 하나로 (검수 M3 Top 6) */
    e.alert = 1; e.state = 'chase'; e.target = this.pl.pos.clone();
    if (e.hp <= 0) this.kill(e, dir);
    else if (e.anim && !boss && shield === 1) e.anim.play('Hit_A', { once: true, fade: 0.05, speed: 1.6, force: true });
  }
  kill(e, dir, by = null) {
    const boss = !!e.D.boss;
    e.dead = true; if (!by) { this.kills[e.kind] = (this.kills[e.kind] || 0) + 1; if (boss && e.kind !== 'boss') this.kills.boss++; this.killN++; } else this.infightKills = (this.infightKills || 0) + 1; /* 진영끼리 쓰러뜨린 건 처치 수에 안 셈 */ this.hitstop = Math.max(this.hitstop, 0.11); this.shake = Math.max(this.shake, boss ? 0.9 : 0.35); this.slow = 0.35; this.slowT = boss ? 0.6 : 0.18;
    if (boss) this.bossKind = e.kind;
    for (const m of this.mods) m.kill?.(e); /* M4-B 포자낭 이끼 · 어미 시듦 */
    if (FOE[e.kind]) foeKill(this, e, by); /* M4-A: 기뢰 터짐/퐁 · 문어 먹물 */
    if (e.warn) { this.root.remove(e.warn); e.warn.material.dispose(); e.warn = null; } e.charging = null; e.weakT = 0; e.burstLeft = 0; if (e.rain) clearRain(this, e); this.ai?.release(e);
    sfx.kill(); this.fx.ring(e.pos.x, e.pos.z, boss ? 3 : 1.4, 0xffe6a8);
    if (e.kind === 'drone') { this.fx.burst(e.pos.x, 1.2, e.pos.z, 26, 0xffb347, 8, 0.1, 0.6, 18); this.fx.burst(e.pos.x, 1.2, e.pos.z, 14, 0x3a4148, 6, 0.18, 1.2, 26); this.fx.burst(e.pos.x, 1.2, e.pos.z, 10, 0x8c96a0, 6, 0.16, 1.2, 26); e.fall = 0; }
    else if (e.kind === 'crab') { this.fx.burst(e.pos.x, 0.4, e.pos.z, 16, 0xd0532f, 6, 0.1, 0.6, 22, dir); }
    else if (e.kind === 'jelly') { this.fx.burst(e.pos.x, 1.1, e.pos.z, 22, 0x9ff0ff, 6, 0.08, 0.6, 4); this.fx.ring(e.pos.x, e.pos.z, 2, 0x9ff0ff); e.fall = 0; }
    else if (e.kind === 'eel') { this.fx.burst(e.pos.x, 0.8, e.pos.z, 50, 0x8fb08a, 10, 0.14, 0.9, 20, dir); this.fx.burst(e.pos.x, 0.8, e.pos.z, 30, 0x7dffd8, 8, 0.08, 0.7, 6); }
    else if (e.kind !== 'mine') { this.fx.burst(e.pos.x, 1.0, e.pos.z, boss ? 50 : 18, 0xf2ecd8, boss ? 10 : 7, 0.12, 0.9, 24, dir); e.anim?.play('Death_C_Skeletons', { once: true, fade: 0.05, force: true }); }
    e.markSp.visible = false; if (e.lantern) e.lantern.g.visible = false;
    if (boss && e.kind === 'chief') chiefDown(this, e); /* M4-A 떠돌이 보스: 이야기 조각 */
    else if (boss && !GATE_KIND[e.kind]) { this.ui.event(`${e.D.name}${josa(e.D.name, '을', '를')} 쓰러뜨렸어요! 잔해에 금고 열쇠가`, 'good'); sfx.rare(); }
    else if (!by) this.ui.praise(['깔끔해요!', '한 방 더 정확하게!', '좋은 조준!', '인양단 솜씨!'][this.killN % 4]); /* 칭찬은 머리 위 (v0.5.1) */
    const kind = e.D.loot || 'body';
    const items = rollLoot(kind, e.zone || 3, this.R); if (boss && this.T?.bossLoot) items.push(...rollLoot(kind, 3, this.R).filter(k => !(LOOT_TABLE[kind].fixed || []).includes(k)).slice(0, this.T.bossLoot)); /* 보스 주간: 잔해 +1 */
    this.containers.push({ kind, zone: e.zone || 3, pos: e.pos.clone(), obj: null, items, searched: false, name: boss ? e.D.name + ' 잔해' : LOOT_TABLE[kind]?.name && kind !== 'body' ? LOOT_TABLE[kind].name : e.D.name + ' 잔해', best: 0 });
  }
  kickCam(dir, s) { this.kick.addScaledVector(dir, -s); }
  hurt(dmg, from) {
    const pl = this.pl; if (pl.dead || pl.inv > 0) return false;
    /* M4-A '예고 없는 큰 피해 0': 큰 공격(BIG_HIT 이상)은 예고(원 · 줄 · 떨어질 자리)가 TELE_MIN 넘게 보였어야 — 아니면 기록 (deeptest 가 0 인지 봄) */
    { const raw = dmg * (this.L.foeDmg || 1); if (raw >= BIG_HIT) { this.bigHits++; const tl = this.tele; if (!tl || !(tl.t >= TELE_MIN)) this.unwarned.push({ t: Math.round(this.elapsed * 10) / 10, dmg: Math.round(raw), k: tl?.k || '?', tele: tl ? Math.round(tl.t * 100) / 100 : null }); } }
    dmg = Math.max(1, Math.round(dmg * (1 - this.L.armor) * (this.L.foeDmg || 1))); /* v0.6 난이도 */
    (this.dmgLog ||= []).push([Math.round(this.elapsed), dmg, from ? Math.round(from.distanceTo(pl.pos) * 10) / 10 : 0]);
    pl.hp -= dmg; pl.flash = 0.12; pl.inv = 0.25; this.shake = Math.max(this.shake, 0.45); this.hitstop = Math.max(this.hitstop, 0.05); sfx.hurt(); this.ui.hurtFlash();
    if (from) { tmp.copy(pl.pos).sub(from).setY(0).normalize(); pl.pos.addScaledVector(tmp, 0.35); }
    this.fx.burst(pl.pos.x, 1.1, pl.pos.z, 8, 0xff9a7a, 4, 0.08, 0.4);
    if (pl.searching) this.cancelSearch();
    if (pl.hp <= 0 && pl.lastStand) { pl.lastStand = false; pl.hp = 1; pl.inv = 1.2; this.ui.event('한 번 버텼어요! 지금 회복하거나 피해요', 'warn'); }
    else if (pl.hp <= 0) { pl.hp = 0; this.die('enemy'); }
    else if (pl.roll <= 0) pl.anim.play('Hit_A', { once: true, fade: 0.04, speed: 1.8, force: true });
    return true;
  }
  updateEnemies(dt) {
    const pl = this.pl;
    if (this.slowT > 0) { this.slowT -= dt / Math.max(0.2, this.slow); if (this.slowT <= 0) this.slow = 1; }
    const plSmoke = this.inSmoke(pl.pos); const darkMul = this.dark > 0 ? 0.6 : 1;
    /* 밤(항구): 어두운 곳의 나는 덜 보이고, 빛 속에 서면 더 멀리서 보임 · 날씨(안개 · 맑은 밤) · 폭풍은 소리가 묻힘 */
    const night = this.night || 0; const lv2 = (this.ai?.lv || 1) >= 2; const plLit = night || (lv2 && this.dark > 0) ? this.inLight(pl.pos) : false;
    /* M4-A 2단계: 정전 중엔 빛 속의 나는 1.5배 멀리서 · 어둠 속이면 0.75배 · 어두우면 귀를 씀(1.3배) · 안개는 1.15배 */
    const sightMul = darkMul * (this.C.sight || 1) * (night ? (plLit ? LAMP.seenMul : 1 - 0.2 * night) : lv2 && this.dark > 0 ? (plLit ? AI2.litSeen : 0.75) : 1) * (this.douse > 0 ? 0.6 : 1);
    const hearMul = (this.C.hear || 1) * (lv2 ? (this.dark > 0 || night >= 1 ? AI2.darkHear : (this.C.vis || 1) < 1 ? AI2.fogHear : 1) : 1);
    this.ai?.update(dt); /* M3-B 무리 경보 · 불병 */
    for (const e of this.enemies) {
      if (e.dead) { enemyTick(e, dt, this);
        if (e.kind === 'drone') { e.fall = (e.fall || 0) + dt; const b = e.d.body; b.position.y = Math.max(0.35, 1.25 - e.fall * e.fall * 9); b.rotation.z += dt * 6 * Math.max(0, 1 - e.fall); e.d.eyeM.color.setRGB(0.2, 0.2, 0.2); }
        else if (e.kind === 'jelly') { e.fall = (e.fall || 0) + dt; e.j.body.position.y = Math.max(0.2, 1.15 - e.fall * 2); e.j.body.scale.setScalar(Math.max(0.3, 1 - e.fall)); }
        else if (e.kind === 'crab') { e.c.body.rotation.z = Math.min(Math.PI, (e.c.body.rotation.z || 0) + dt * 9); }
        else if (e.kind === 'eel') { for (const sg of e.l.segs) sg.m.position.y = Math.max(0.2, sg.m.position.y - dt); }
        else if (e.kind === 'hermit' && e.fz) { e.fz.body.rotation.z = Math.min(Math.PI * 0.6, (e.fz.body.rotation.z || 0) + dt * 5); }
        else if (e.kind === 'octo' && e.fz) { e.fall = (e.fall || 0) + dt; e.fz.root.scale.setScalar(Math.max(0.4, 1 - e.fall)); }
        else if (e.root.visible && e.anim) e.anim.mixer.update(dt);
        continue;
      }
      const D = e.D; const boss = !!D.boss; const toP = tmp.copy(pl.pos).sub(e.pos); let dist = toP.length();
      /* 먼 적은 잠재움 (그리기 · 계산 아낌) */
      e.sleep = dist > 34 && e.state !== 'chase'; if (e.sleep) { e.root.visible = false; continue; }
      e.t += dt; e.cd -= dt; e.flash = Math.max(0, e.flash - dt); e.stagger = Math.max(0, e.stagger - dt); e.weakT = Math.max(0, e.weakT - dt); e.pcd -= dt;
      let angToP = Math.atan2(toP.x, toP.z);
      /* 보기: 시야 원뿔 + 막힘 + 연막 · 정전 · 밤 */
      const sight = D.sight * sightMul;
      const inCone = dist < sight && Math.abs(angDiff(e.face, angToP)) < D.fov / 2;
      let sees = !pl.dead && !plSmoke && !this.inSmoke(e.pos) && (inCone || dist < 2.2) && this.los(e.pos, pl.pos);
      /* 탐조 드론: 앞 빛 부채꼴(7m) 안이면 바로 들킴 */
      const spotted = e.spot && !pl.dead && !plSmoke && dist < 7 && Math.abs(angDiff(e.face, angToP)) < 0.32 && this.los(e.pos, pl.pos);
      if (spotted) sees = true;
      if (sees) { e.alert = Math.min(1, e.alert + dt * (spotted ? 4 : dist < 4 ? 3 : 1.4)); e.seen = 0.6; } else { e.seen -= dt; if (e.state !== 'chase') e.alert = Math.max(0, e.alert - dt * 0.25); }
      this.ai.hear(e, D, hearMul); /* 소리: 1단계 = 내 소리만 · 2단계 = 벽 너머 0.6배 · 다른 적 총소리 · 구조 요청 (ai.js) */
      if (e.alert >= 1 && e.state !== 'chase') { e.state = 'chase'; e.mark = 1.2; e.markType = '!'; sfx.alert((e.pos.x - pl.pos.x) / 12); if (e.anim && !boss) e.anim.play('Taunt', { once: true, fade: 0.1, speed: 1.6, force: true }), e.taunt = 0.5; if (boss) sfx.roar(); }
      if (e.state === 'chase') { if (sees) e.target = pl.pos.clone(); else if (e.seen < -5) { e.state = 'investigate'; } }
      /* M3-B 진영끼리: 가까이 보이는 적 진영을 노림 (주인공이 더 가까우면 주인공) — 이 뒤로 목표 · 거리 · 보임은 그 적 기준 */
      if (this.ai) { const fo = this.ai.foe(e, dt, sees, dist); if (fo) { if (e.state !== 'chase' || !sees) { e.state = 'fight'; e.alert = Math.max(e.alert, 0.6); } toP.copy(fo.pos).sub(e.pos); dist = toP.length(); angToP = Math.atan2(toP.x, toP.z); if (!(e.foeLosT > this.t) || e.foeLosO !== fo) { e.foeLosV = this.los(e.pos, fo.pos); e.foeLosT = this.t + 0.12; e.foeLosO = fo; } sees = e.foeLosV; e.target = fo.pos.clone(); } /* M4-A: 진영 상대 보임은 0.12초마다 (성능) */ else if (e.state === 'fight') { e.state = 'idle'; e.home.copy(e.pos); } }
      let goal = null, spd = D.speed; const rage = boss && e.hp < e.maxHp * 0.5 ? (e.kind === 'boss' ? 1.25 : 1.2) : 1;
      if (e.state === 'idle') { if (!e.wander || e.pos.distanceTo(e.wander) < 0.6 || e.t > 4) { e.t = 0; e.wander = e.home.clone().add(V((this.R() - 0.5) * 7, 0, (this.R() - 0.5) * 7)); } goal = e.wander; spd *= 0.5; }
      else if (e.state === 'investigate') { goal = e.target; if (e.pos.distanceTo(e.target) < 0.8) { e.state = 'idle'; e.home.copy(e.pos); } }
      else if (e.state === 'chase' || e.state === 'fight') { goal = e.target; spd = D.chase * rage; }
      let wantFace = e.face;
      const canAttack = (e.state === 'chase' || e.state === 'fight') && sees && dist < D.range;
      const stunned = e.stun > 0; if (stunned) { e.stun -= dt; goal = null; if (e.stun <= 0) { e.stun = 0; if (e.l) e.l.glowM.color.setHex(0x7dffd8); } }
      if (e.charging) this.eelCharge(e, dt);
      else if (stunned) { /* 기절: 아무것도 안 함 */ }
      else if (e.wind > 0) {
        e.wind -= dt; wantFace = e.lockFace != null ? e.lockFace : angToP;
        if (e.kind === 'drone') e.d.eyeM.color.setRGB(1, 0.35 + 0.6 * Math.sin(e.wind * 60) ** 2, 0.2);
        if (e.kind === 'crab') for (const c of e.c.claws) c.rotation.x = -0.9 * (1 - e.wind / (D.wind || 0.3));
        if (e.kind === 'jelly') e.j.coreM.color.setRGB(0.6 + 0.4 * Math.sin(e.wind * 50) ** 2, 1, 1);
        if (e.warn) { const k = 1 - e.wind / e.windMax; if (e.warn.userData.line) { e.warn.material.opacity = 0.25 + 0.4 * Math.sin(k * 22) ** 2; e.warn.scale.x = e.warnW * (0.4 + 0.6 * k); } else { e.warn.scale.setScalar(e.warnR * (0.3 + 0.7 * k)); e.warn.material.opacity = 0.25 + 0.35 * Math.sin(k * 20) ** 2; } if (e.warnFollow) e.warn.position.set(e.pos.x, 0.22, e.pos.z); }
        if (e.wind <= 0) { this.enemyAttack(e, dist); e.lockFace = null; }
        goal = null;
      } else if (e.ai && (e.state === 'chase' || e.state === 'fight') && !(e.taunt > 0)) { /* M3-B 검은 닻: 엄폐 · 몸 내밀기 · 돌아 들기 · 불병 (ai.js) */
        const o = this.ai.role(e, dt, e.foe && !e.foe.dead ? e.foe.pos : pl.pos, dist, sees, angToP); goal = o.goal; spd = o.spd; if (o.face != null) wantFace = o.face;
      } else if (canAttack && e.cd <= 0 && e.stagger <= 0 && !(e.taunt > 0)) {
        if (boss) this.bossWind(e, dist, rage);
        else { e.wind = e.windMax = D.wind ?? (e.kind === 'drone' ? 0.42 : 0.38); e.cd = D.cd;
          if (D.atk === 'pulse') this.warnDisc(e, D.range, 0x6fd8ff, true); else if (LAB_KIND[e.kind]) labWind(this, e, angToP); /* M4-B 포자 원 · 수압 탄 줄 */
          else if (D.dmg * e.dmgMul * (this.L.foeDmg || 1) >= BIG_HIT) this.bigTele(e, dist, angToP); /* M4-A: 큰 공격은 모두 예고 (해골 깊은 구역 내려침 · 등불 던지기) */
          if (e.anim) e.anim.play(D.atk === 'throw' ? 'Unarmed_Melee_Attack_Punch_A' : this.R() < 0.5 ? 'Unarmed_Melee_Attack_Punch_A' : '1H_Melee_Attack_Chop', { once: true, fade: 0.05, speed: e.kind === 'miner' ? 0.85 : 1.15, force: true }); }
        goal = null;
      } else if (canAttack && (e.kind === 'drone' || e.kind === 'lamp') && dist < D.range * 0.6) {
        goal = e.pos.clone().add(V(-toP.z, 0, toP.x).normalize().multiplyScalar(Math.sin(e.t * 0.7 + e.id) * 2)).addScaledVector(toP.clone().normalize(), -1.5);
      } else if (canAttack && (e.kind === 'skel' || e.kind === 'crab' || e.kind === 'miner') && dist < 1.1) goal = null;
      else if (canAttack && e.kind === 'jelly' && dist < 1.5) goal = null;
      else if (canAttack && e.kind === 'eel' && dist < 4.5) goal = e.pos.clone().addScaledVector(toP.clone().normalize(), -2);
      else if (canAttack && boss && dist < 2.4) goal = null;
      if (!e.ai && !boss && !(e.wind > 0) && !stunned && !e.charging) { const o = this.ai.steer(e, dt, goal, spd, dist, sees); if (o) { goal = o.goal; spd = o.spd; } } /* M4-A 2단계: 양쪽 끼기 · 구조 요청 · 후퇴 · 빛으로 */
      if (e.taunt > 0) { e.taunt -= dt; goal = null; wantFace = angToP; }
      if (e.netT > 0 || e.wetT > 0 || e.bleed) spd *= statusTick(this, e, dt); /* M5-C 그물 느려짐 · 젖음 · 출혈 */
      if (goal && e.stagger <= 0 && !e.charging) {
        const wp = this.los(e.pos, goal) ? goal : this.waypoint(e.pos, goal);
        if (wp) { tmp2.copy(wp).sub(e.pos).setY(0); const l = tmp2.length();
          if (l > 0.3) { tmp2.multiplyScalar(1 / l); e.pos.addScaledVector(tmp2, spd * dt); wantFace = Math.atan2(tmp2.x, tmp2.z); }
          else if (wp !== goal) e.pos.addScaledVector(V((this.R() - 0.5), 0, (this.R() - 0.5)), 0.2); }
        else if (e.state !== 'idle') { e.state = 'idle'; e.home.copy(e.pos); } /* 닫힌 문 너머 — 포기 */
      }
      if ((e.state === 'chase' || e.state === 'fight') && sees && !(e.wind > 0 && e.lockFace != null) && !e.charging && !stunned && !(e.burstLeft > 0)) wantFace = angToP;
      e.face += angDiff(e.face, wantFace) * Math.min(1, dt * (D.turn || (boss ? 3 : e.kind === 'crab' ? 10 : 7)));
      e.pos.addScaledVector(e.vel, dt); e.vel.multiplyScalar(Math.pow(0.002, dt));
      for (const o of this.enemies) if (o !== e && !o.dead && !o.sleep) { const dx = e.pos.x - o.pos.x, dz = e.pos.z - o.pos.z, d = Math.hypot(dx, dz), m = D.radius + o.D.radius; if (d < m && d > 0.01) { e.pos.x += dx / d * (m - d) * 0.5; e.pos.z += dz / d * (m - d) * 0.5; } }
      if (!e.charging) this.collide(e.pos, D.radius);
      e.root.position.copy(e.pos); if (e.kind !== 'eel') e.root.rotation.y = e.face;
      const moving = goal && e.stagger <= 0;
      if (PRIM[e.kind]) foeTick(this, e, dt, moving); /* M4-A 기뢰 · 소라게 · 문어 */
      else if (e.kind === 'drone') { const d = e.d; d.body.position.y = 1.25 + Math.sin(e.t * 3 + e.id) * 0.1; d.body.rotation.z = clamp(-e.vel.x * 0.15, -0.5, 0.5); for (const r of d.rotors) r.rotation.y += dt * 40; if (e.wind <= 0) d.eyeM.color.setRGB(1, e.state === 'chase' ? 0.25 : 0.55, e.state === 'chase' ? 0.2 : 0.25); }
      else if (e.kind === 'crab') { const c = e.c; const w = moving ? Math.sin(e.t * 22) : 0; c.legs.forEach((l, k) => { l.rotation.y = w * 0.5 * (k % 2 ? 1 : -1); }); c.body.position.y = 0.32 + Math.abs(w) * 0.04; if (e.wind <= 0) for (const cl of c.claws) cl.rotation.x *= Math.pow(0.001, dt); }
      else if (e.kind === 'jelly') { const j = e.j; j.body.position.y = 1.15 + Math.sin(e.t * 2.2 + e.id) * 0.18; const p = 1 + Math.sin(e.t * 4.4 + e.id) * 0.08; j.body.scale.set(p, 2 - p, p); j.tents.forEach((t, k) => { t.rotation.z = Math.sin(e.t * 3 + k) * 0.25; }); if (e.wind <= 0) j.coreM.color.setRGB(0.87, 0.98, 1); }
      else if (e.kind === 'eel') this.eelPose(e, dt);
      else { const n = e.anim.curName; const busy = (/Attack|Hit_A|Taunt|Shoot/.test(n) && e.anim.cur.isRunning()) || (n === 'Aim' && e.wind > 0); if (!busy) e.anim.play(stunned && e.anim.clips.Stun ? 'Stun' : moving ? (e.state === 'chase' || e.state === 'fight' ? 'Running_A' : 'Walking_D_Skeletons') : e.ai?.mode === 'hide' && e.anim.clips.Crouch ? 'Crouch' : 'Idle_Combat', { speed: (e.state === 'chase' ? 1.1 : 0.9) * (boss ? 0.65 * rage : e.kind === 'miner' ? 0.8 : 1) * (stunned ? 0.2 : 1) }); e.anim.mixer.update(dt); }
      if (FOE[e.kind] && !PRIM[e.kind]) foeTick(this, e, dt, moving); /* 저격수 겨냥 줄 따라오기 */
      enemyTick(e, dt, this); /* 전용 모델: 예고 자세 · 약점 빛 · 맞음 */
      if (e.lantern) { const k = e.weakT > 0 ? 1 : 0; e.lantern.m.color.setRGB(1, 0.78 + 0.2 * k, 0.44 + 0.5 * k); e.lantern.halo.scale.setScalar((boss ? 2.2 : 1.3) * (1 + k * 0.6 + Math.sin(e.t * 9) * 0.05)); e.lantern.g.visible = this.douse <= 0 || boss; }
      if (e.big) { const h = e.flash > 0 ? e.flash / 0.08 : 0; if (h !== e.hit0) { rimHit(e.rimU, h); e.hit0 = h; if (h > 0 && e.weakT > 0 && e.custom?.eyeM) e.custom.eyeM.color.setRGB(1, 0.78, 0.25); } } /* v0.7.1 검수 M4 Top 1: 보스 · 큰 적은 흰색으로 덮지 않고 밝기 틴트 + 림 빛 · 약점이 열려 있으면 그 부위만 금색 */
      else { const f = e.flash > 0 ? 1 : 0; if (f !== e.hit0) { e.hit0 = f; for (const m of e.mats) { if (m.emissive) m.emissive.setRGB(f, f, f); } } }
      e.mark -= dt; e.markSp.visible = e.mark > 0 || e.weakT > 0; if (e.weakT > 0) { e.markSp.material.map = markTex('★'); e.markSp.scale.setScalar(1.1 + Math.sin(e.t * 12) * 0.15); } else if (e.mark > 0) { e.markSp.material.map = markTex(e.markType); e.markSp.scale.setScalar(0.54 + Math.max(0, e.mark - 1) * 1.2); } e.markSp.center.set(e.weakT > 0 ? 0.5 : 0.05, e.weakT > 0 ? 0.5 : 0.2); e.markSp.material.opacity = e.weakT > 0 ? 1 : 0.45 + 0.55 * Math.min(1, Math.max(0, (e.mark - 0.15) / 0.25)); /* v0.7.1 검수 M4 Top 3: '!' · '?' 60% · 머리 위 옆 · 1초 뒤 흐리게 */
    }
  }
  /* 보스 보이는 모델 묶음: 화면 배율만 (판정 · 예고 원 · 이동은 en.root/en.pos 그대로) */
  visGroup(root, kind) { const g = new THREE.Group(); g.scale.setScalar(bossVis(kind)); root.add(g); return g; }
  /* 경고 표시: 바닥 원(warnDisc) · 바닥 줄(warnLine) — 예고 시간 동안 커지며 깜빡임 */
  warnDisc(e, r, color, follow = false) { e.teleT0 = this.t; const m = new THREE.Mesh(discGeo, hazard(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }))); m.rotation.x = -Math.PI / 2; m.position.set(e.pos.x, 0.22, e.pos.z); m.scale.setScalar(0.5); this.root.add(m); e.warn = m; e.warnR = r; e.warnFollow = follow; }
  warnLine(e, len, w, color) { e.teleT0 = this.t; const m = new THREE.Mesh(lineGeo, hazard(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }))); m.userData.line = true; m.rotation.order = 'YXZ'; m.rotation.set(-Math.PI / 2, e.lockFace, 0); m.position.set(e.pos.x, 0.22, e.pos.z); m.scale.set(w * 0.4, len, 1); this.root.add(m); e.warn = m; e.warnW = w; e.warnFollow = false; }
  /* M4-A: 일반 적 큰 공격 예고 — 근접 = 앞 원 · 던지기/쏘기 = 겨냥 줄 */
  bigTele(e, dist, ang) { const D = e.D;
    if (D.atk === 'melee') { this.warnDisc(e, Math.max(1.6, D.range + 0.35), 0xff6a3a, false); e.warn.position.set(e.pos.x + Math.sin(ang) * D.range * 0.6, 0.22, e.pos.z + Math.cos(ang) * D.range * 0.6); }
    else if (D.atk === 'throw' || D.atk === 'shoot') { e.lockFace = ang; this.warnLine(e, Math.min(D.range + 1, dist + 1.5), 0.28, 0xffa060); } }
  /* 보스 패턴 고르기 · 예고 시작 */
  bossWind(e, dist, rage) {
    const pl = this.pl; e.lockFace = null; e.teleT0 = this.t; /* 보스 패턴은 모두 예고 (원 · 줄 · 떨어질 자리) */
    if (e.kind === 'chief') return chiefWind(this, e, dist, rage);
    if (GATE_KIND[e.kind]) return gateWind(this, e, dist, rage); /* M5-A 파수 */
    if (e.kind === 'boss') {
      const slam = dist < 4.2; e.pat = slam ? 'slam' : 'wave'; e.windMax = e.wind = (slam ? 0.85 : 0.6) / rage; e.cd = e.D.cd / rage; if (slam) e.lockFace = e.face;
      e.anim.play(slam ? '1H_Melee_Attack_Chop' : 'Unarmed_Melee_Attack_Punch_A', { once: true, fade: 0.05, speed: 0.75 * rage, force: true });
      this.warnDisc(e, slam ? 3.4 : 1.2, slam ? 0xff4a30 : 0xffa060); sfx.warn(); return;
    }
    const angToP = Math.atan2(pl.pos.x - e.pos.x, pl.pos.z - e.pos.z);
    if (e.kind === 'captain') { const B = BOSS.captain;
      if (e.hp < e.maxHp * B.douse.below && e.pcd <= 0) { e.pat = 'douse'; e.windMax = e.wind = B.douse.wind; e.pcd = 13; this.warnDisc(e, 6, 0x9a6aff, true); e.anim.play('Taunt', { once: true, fade: 0.05, speed: 1, force: true }); sfx.roar(); }
      else if (dist < 4.2) { e.pat = 'slam'; e.windMax = e.wind = B.slam.wind / rage; e.lockFace = e.face; this.warnDisc(e, B.slam.r, 0xff4a30); e.anim.play('1H_Melee_Attack_Chop', { once: true, fade: 0.05, speed: 0.75 * rage, force: true }); }
      else { e.pat = 'hook'; e.windMax = e.wind = B.hook.wind / rage; e.lockFace = angToP; e.face = angToP; this.warnLine(e, B.hook.len, 1.1, 0xffa060); e.anim.play('Unarmed_Melee_Attack_Punch_A', { once: true, fade: 0.05, speed: 0.6, force: true }); }
      e.cd = e.D.cd / rage; sfx.warn(); return; }
    if (e.kind === 'smelter') return smelterWind(this, e, dist, rage);
    if (e.kind === 'mother') return motherWind(this, e, dist, rage); /* M4-B 청록 어미 */
    if (e.kind === 'eel') { const B = BOSS.eel;
      if (e.hp < e.maxHp * B.surge.below && e.pcd <= 0) { e.pat = 'surge'; e.windMax = e.wind = B.surge.wind; e.pcd = 9; this.warnDisc(e, 5, 0x6fd8ff, true); }
      else if (dist < 4.6) { e.pat = 'shock'; e.windMax = e.wind = B.shock.wind / rage; this.warnDisc(e, B.shock.r, 0x9ff0ff, true); }
      else { e.pat = 'charge'; e.windMax = e.wind = B.charge.wind / rage; e.lockFace = angToP; e.face = angToP; this.warnLine(e, B.charge.len, 1.8, 0xff6a4a); }
      e.cd = e.D.cd / rage; sfx.warn(); return; }
  }
  /* 장어 돌진: 줄 따라 빠르게 · 벽에 박히면 기절(약점) · 지나가며 맞으면 피해 한 번 */
  eelCharge(e, dt) {
    const c = e.charging, B = BOSS.eel.charge; const st = Math.min(c.left, B.speed * dt); const before = e.pos.clone();
    e.pos.addScaledVector(c.dir, st); this.collide(e.pos, e.D.radius); const moved = e.pos.distanceTo(before); c.left -= st;
    if (!c.hit && this.pl.pos.distanceTo(e.pos) < 1.4) { c.hit = true; this.tele = { t: this.t - (c.t0 ?? this.t), k: 'eel' }; this.hurt(B.dmg, e.pos); this.tele = null; if (!this.pl.dead) { this.pl.push = c.dir.clone().multiplyScalar(6); } }
    if (moved < st * 0.45 && c.left > 0.5) { e.charging = null; e.stun = B.stun; e.weakT = B.stun; e.l.glowM.color.setHex(0xffe07a); this.shake = Math.max(this.shake, 0.6); sfx.slam(); this.fx.burst(e.pos.x, 0.8, e.pos.z, 26, 0xd9c7a0, 7, 0.14, 0.8); this.ui.event('벽에 박혔어요! 지금 약점 — 피해 2배', 'good'); return; }
    if (c.left <= 0) e.charging = null;
    if (this.R() < 0.5) this.fx.burst(e.pos.x, 0.3, e.pos.z, 2, 0xcfeef2, 2.5, 0.08, 0.35);
  }
  /* 장어 몸: 머리 뒤로 마디가 따라옴 (세계 좌표 꼬리 → 루트 기준 위치) */
  eelPose(e, dt) {
    const l = e.l; e.root.rotation.y = 0; const head = l.segs[0];
    if (!e.trail) { e.trail = []; for (let i = 0; i < 60; i++) e.trail.push(e.pos.clone().add(V(-Math.sin(e.face) * i * 0.12, 0, -Math.cos(e.face) * i * 0.12))); }
    if (e.trail[0].distanceTo(e.pos) > 0.1) { e.trail.unshift(e.pos.clone()); e.trail.length = 60; }
    const sw = Math.sin(e.t * 6) * 0.25;
    l.segs.forEach((sg, i) => { const p = e.trail[Math.min(59, i * 5)]; const side = V(Math.cos(e.face), 0, -Math.sin(e.face)).multiplyScalar(Math.sin(e.t * 5 - i * 0.7) * 0.18 * (i ? 1 : 0)); sg.m.position.set(p.x - e.pos.x + side.x, 0.65 + Math.sin(e.t * 2 + i) * 0.06, p.z - e.pos.z + side.z); });
    head.m.rotation.y = e.face + sw * 0.3;
    for (let i = 1; i < l.segs.length; i++) { const a = l.segs[i - 1].m.position, b = l.segs[i].m.position; l.segs[i].m.rotation.y = Math.atan2(a.x - b.x, a.z - b.z); }
  }
  /* 예고 끝 → 공격: 이 공격의 예고가 보인 시간을 this.tele 로 (맞으면 raid.hurt 가 검사) */
  enemyAttack(e, dist) { const t0 = e.teleT0; e.teleT0 = null; this.tele = { t: t0 != null ? this.t - t0 : 0, t0, k: e.kind }; try { this.enemyAttack0(e, dist); } finally { this.tele = null; } }
  enemyAttack0(e, dist) {
    const pl = this.pl; const D = e.D;
    if (e.warn) { this.root.remove(e.warn); e.warn.material.dispose(); e.warn = null; }
    const tp = e.foe && !e.foe.dead ? e.foe.pos : pl.pos; /* M3-B: 다른 진영을 노리면 그쪽으로 */
    const shoot = (n, spread, size, color, glowC, sp, dmg, r, extra = {}) => { const a0 = e.lockFace != null ? e.lockFace : Math.atan2(tp.x - e.pos.x, tp.z - e.pos.z);
      for (let i = 0; i < n; i++) { const a = a0 + (n > 1 ? (spread >= 6 ? i / n * Math.PI * 2 : (i / (n - 1) - 0.5) * spread) : (this.R() - 0.5) * 0.12);
        const m = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), new THREE.MeshBasicMaterial({ color })); m.position.set(e.pos.x, 1.15, e.pos.z); this.root.add(m);
        const glow = glowSprite(glowC, 0.6, size * 4.5); m.add(glow);
        this.enemyShots.push({ m, dir: V(Math.sin(a), 0, Math.cos(a)), sp, t: 0, dmg, from: e.pos.clone(), r, src: e, tele0: this.tele?.t0, ...extra }); }
      sfx.enemyShot((e.pos.x - pl.pos.x) / 12); this.fx.burst(e.pos.x + Math.sin(a0) * 0.5, 1.15, e.pos.z + Math.cos(a0) * 0.5, 4, 0xffa070, 3, 0.07, 0.25); };
    const wet = this.water.userData.mask(pl.pos.x, pl.pos.z) > 0.15 || this.inDeep(pl.pos);
    if (e.kind === 'smelter') return smelterAttack(this, e, dist);
    if (LAB_KIND[e.kind]) { labAttack(this, e, dist); return; } /* M4-B 포자낭 · 경비 기계 · 청록 어미 */
    if (e.kind === 'chief') return chiefAttack(this, e, dist);
    if (GATE_KIND[e.kind]) return gateAttack(this, e, dist); /* M5-A 파수 */
    if (FOE[e.kind] && foeAttack(this, e, dist)) return; /* M4-A 새 적 */
    if (this.ai && e.ai && this.ai.attack(e, dist)) return;
    if (e.kind === 'drone') shoot(1, 0, 0.16, 0xff7a4a, 0xff8a50, 11, D.dmg * e.dmgMul, 0.55);
    else if (e.kind === 'lamp') shoot(1, 0, 0.2, 0xffc870, 0xffb860, 10, D.dmg * e.dmgMul, 0.6);
    else if (e.kind === 'boss' && e.pat === 'wave') shoot(5, 1.0, 0.3, 0x6fe0ff, 0x9ff0ff, 8, 14, 0.7);
    else if (e.kind === 'boss') { sfx.slam(); this.shake = Math.max(this.shake, 0.7); this.fx.ring(e.pos.x, e.pos.z, 3.4, 0xff9a7a); this.fx.burst(e.pos.x, 0.3, e.pos.z, 30, 0xbfe8ee, 8, 0.14, 0.8, 20); if (dist < 3.4) this.hurt(D.dmg, e.pos);
      const B = BOSS.boss; e.weakT = B.weak; e.stun = B.weak * 0.8; this.ui.weak('보관함이 열렸어요 — 약점!'); }
    else if (e.kind === 'jelly') { sfx.hitMetal(); this.fx.ring(e.pos.x, e.pos.z, D.range, 0x9ff0ff); this.fx.burst(e.pos.x, 1, e.pos.z, 14, 0xdffaff, 6, 0.06, 0.3, 0); if (dist < D.range + 0.2) this.hurt(D.dmg * e.dmgMul * (wet ? 1.5 : 1), e.pos); }
    else if (e.kind === 'captain') { const B = BOSS.captain;
      if (e.pat === 'hook') shoot(1, 0, 0.26, 0xc7d0d6, 0xffffff, 20, B.hook.dmg, 0.75, { hook: e, life: B.hook.len / 20 });
      else if (e.pat === 'slam') { sfx.slam(); this.shake = Math.max(this.shake, 0.7); this.fx.ring(e.pos.x, e.pos.z, B.slam.r, 0xffb060); this.fx.burst(e.pos.x, 0.3, e.pos.z, 34, 0xffb347, 8, 0.14, 0.8, 20); if (dist < B.slam.r) this.hurt(B.slam.dmg, e.pos);
        this.addFire(e.pos.x, e.pos.z, 2.2, B.slam.fire, B.slam.fireDps); e.weakT = B.weak; e.stun = B.weak * 0.8; this.ui.weak('랜턴이 드러났어요 — 약점!'); }
      else if (e.pat === 'douse') { this.douse = B.douse.dark; sfx.roar(); this.shake = Math.max(this.shake, 0.5); this.ui.event('선장이 등불을 다 껐어요! 게가 몰려와요', 'boss');
        for (let k = 0; k < B.douse.adds; k++) { const a = this.R() * 6.28; const ad = this.makeEnemy({ kind: 'crab', x: e.pos.x + Math.cos(a) * 3, z: e.pos.z + Math.sin(a) * 3, zone: 3 }, 2000 + this.enemies.length); ad.state = 'chase'; ad.alert = 1; ad.target = pl.pos.clone(); this.collide(ad.pos, 0.5); this.enemies.push(ad); } } }
    else if (e.kind === 'eel') { const B = BOSS.eel;
      if (e.pat === 'charge') { e.charging = { dir: V(Math.sin(e.lockFace), 0, Math.cos(e.lockFace)), left: B.charge.len, hit: false, t0: this.tele?.t0 }; sfx.roll(); }
      else if (e.pat === 'shock') { sfx.hitMetal(); sfx.slam(); this.fx.ring(e.pos.x, e.pos.z, B.shock.r, 0x9ff0ff); this.fx.burst(e.pos.x, 0.8, e.pos.z, 30, 0xdffaff, 9, 0.06, 0.35, 0); this.flash = Math.max(this.flash, 0.08); if (dist < B.shock.r) this.hurt(B.shock.dmg * (wet ? B.shock.wet : 1), e.pos); }
      else if (e.pat === 'surge') { shoot(B.surge.n, 6.3, 0.26, 0x9fe8ff, 0xcff6ff, 7, B.surge.dmg, 0.65); if (dist < 9) this.pl.push = tmp2.copy(pl.pos).sub(e.pos).setY(0).normalize().multiplyScalar(B.surge.push).clone(); this.fx.ring(e.pos.x, e.pos.z, 5, 0x9fe8ff); this.ui.toast('물살에 밀려요!', 'warn'); } }
    else {
      sfx.swing();
      const ang = Math.atan2(tp.x - e.pos.x, tp.z - e.pos.z);
      if (dist < D.range + 0.2 && Math.abs(angDiff(e.face, ang)) < 1.2) { if (e.foe && !e.foe.dead && this.ai) this.ai.strike(e, D.dmg * e.dmgMul); else this.hurt(D.dmg * e.dmgMul, e.pos); }
    }
  }
  /* 불붙은 기름 웅덩이 (선장 내려찍기) — 들어가 있으면 초당 피해 */
  addFire(x, z, r, t, dps) { const m = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: 0xff8a30, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.2, z); m.scale.setScalar(r); this.root.add(m); this.hazards.push({ x, z, r, t, dps, m, tick: 0 }); }
  updateShots(dt) {
    for (let i = this.enemyShots.length - 1; i >= 0; i--) {
      const s = this.enemyShots[i]; s.t += dt; const p = s.m.position; const prev = p.clone(); p.addScaledVector(s.dir, s.sp * dt);
      let gone = s.t > (s.life || 2.6) || this.rayBlock(prev, p) < 1; if (gone && this.mods.length && s.t <= (s.life || 2.6)) this.modHit(p, s.dmg); /* M4-B 적 탄도 배양조를 깸 */
      if (!gone && !this.pl.dead && p.distanceTo(tmp.set(this.pl.pos.x, 1.15, this.pl.pos.z)) < s.r) { this.tele = { t: s.tele0 != null ? this.t - s.tele0 : 0, k: s.src?.kind }; const hit = this.hurt(s.dmg, s.from); this.tele = null; if (hit) { gone = true;
          /* 갈고리: 선장 쪽으로 끌려감 */
          if (s.hook && !s.hook.dead) { const d = tmp2.copy(s.hook.pos).sub(this.pl.pos).setY(0); const l = d.length(); this.pl.pull = { dir: d.normalize().clone(), left: Math.max(0, Math.min(BOSS.captain.hook.pull, l - 1.8)) }; this.ui.toast('갈고리에 끌려가요!', 'warn'); } }
        else if (this.pl.roll > 0 && !s.dodged) { s.dodged = true; this.ui.praise('회피!'); } }
      if (!gone && this.ai && s.src?.F) for (const o of this.enemies) { if (o === s.src || o.dead || o.sleep || o.F === s.src.F || !(o.F === 'anchor' || s.src.F === 'anchor')) continue; if ((o.pos.x - p.x) ** 2 + (o.pos.z - p.z) ** 2 < (o.D.radius + s.r * 0.6) ** 2) { this.ai.hitEnemy(o, s.dmg, s.src, s.dir); gone = true; break; } } /* 진영끼리 맞음 */
      if (gone) { this.fx.burst(p.x, p.y, p.z, 6, 0xff9a60, 3, 0.07, 0.3); this.root.remove(s.m); s.m.geometry.dispose(); s.m.material.dispose(); s.m.children[0]?.material.dispose(); this.enemyShots.splice(i, 1); }
    }
  }
  /* ───── 투척: 수류탄 · 연막 ───── */
  carried() { return [this.bag, this.safe, this.pet].filter(Boolean); }
  hasItem(k) { return this.carried().some(b => b.items.some(p => p.it.key === k)); }
  takeOne(k) { for (const b of this.carried()) { const p = b.items.find(p => p.it.key === k); if (p) { remove(b, p.it); return true; } } return false; }
  throwItem(k) {
    const pl = this.pl; if (pl.dead || pl.roll > 0 || !this.takeOne(k)) return;
    const to = pl.aim ? pl.aim.pos.clone() : pl.pos.clone().add(V(Math.sin(pl.face) * 6, 0, Math.cos(pl.face) * 6));
    if (to.distanceTo(pl.pos) > 9) to.sub(pl.pos).setLength(9).add(pl.pos);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshLambertMaterial({ color: k === 'nade' ? 0x6b7d4a : 0xb9c4c9 })); m.position.copy(pl.pos).setY(1.2); this.root.add(m);
    this.nades.push({ k, m, from: pl.pos.clone(), to, t: 0, dur: 0.55 }); this.used.push(k); sfx.roll();
    pl.anim.play('Interact', { once: true, fade: 0.05, speed: 2, force: true });
  }
  updateThrows(dt) {
    for (let i = this.nades.length - 1; i >= 0; i--) {
      const n = this.nades[i]; n.t += dt; const k = Math.min(1, n.t / n.dur);
      n.m.position.lerpVectors(n.from, n.to, k); n.m.position.y = 0.3 + 1.0 * (1 - k) + 2.2 * k * (1 - k) * 2;
      if (n.k === 'nade' && k >= 1 && n.t < n.dur + 0.5) { n.m.scale.setScalar(1 + Math.sin(n.t * 30) * 0.2); continue; }
      if (k < 1) continue;
      this.root.remove(n.m); n.m.geometry.dispose(); n.m.material.dispose(); this.nades.splice(i, 1);
      const p = n.to;
      if (n.k === 'nade') {
        sfx.boom(); this.shake = Math.max(this.shake, 0.8); this.hitstop = Math.max(this.hitstop, 0.08); this.noise(p, 16);
        this.fx.burst(p.x, 0.6, p.z, 40, 0xffb347, 10, 0.16, 0.7, 14); this.fx.burst(p.x, 0.6, p.z, 20, 0x3a3a3a, 6, 0.26, 1.3, 6); this.fx.ring(p.x, p.z, 3.2, 0xffd27a);
        for (const e of this.enemies) { if (e.dead || e.sleep) continue; const d = e.pos.distanceTo(p); if (d < 3.4) this.damage(e, 95 * (1 - d / 4.2), e.pos.clone().sub(p).setY(0).normalize(), e.pos.clone().setY(1), 0); }
      } else {
        sfx.puff(); const mats = []; const g = new THREE.Group(); g.position.set(p.x, 0, p.z);
        for (let j = 0; j < 7; j++) { const mm = new THREE.MeshLambertMaterial({ color: 0xc9d4d8, transparent: true, opacity: 0.5, depthWrite: false }); mats.push(mm); const s = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mm); const a = j / 7 * 6.28; s.position.set(Math.cos(a) * 2.2 * (j ? 1 : 0), 1.2, Math.sin(a) * 2.2 * (j ? 1 : 0)); s.scale.setScalar(1.8 + this.R()); g.add(s); }
        this.root.add(g); this.smokes.push({ x: p.x, z: p.z, r: 4.5, t: 7, g, mats });
        for (const e of this.enemies) if (!e.dead && e.state === 'chase' && e.pos.distanceTo(p) < 7) { e.state = 'investigate'; e.target = p.clone(); e.alert = 0.4; }
      }
    }
    for (let i = this.smokes.length - 1; i >= 0; i--) { const s = this.smokes[i]; s.t -= dt; for (const m of s.mats) m.opacity = Math.min(0.5, s.t / 2 * 0.5); s.g.rotation.y += dt * 0.2;
      if (s.t <= 0) { this.root.remove(s.g); s.g.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); for (const m of s.mats) m.dispose(); this.smokes.splice(i, 1); } }
  }
  updateExits(dt) {
    if (this.over) return; let inAny = null;
    for (const x of this.exits) {
      const open = this.exitOpen(x); if (open !== x.open) { x.open = open; const c = open ? 0x7dffb2 : 0xff6a5a; x.ringM.color.set(c); x.fill.material.color.set(c); x.beam.visible = open; x.lt.color.set(c); x.lt.intensity = open ? 9 : 3; if (open && x.kind === 'power') this.ui.event(x.belt ? `${x.name} 작동! 초록 발판에 서면 벨트가 실어 내요` : `${x.name} 작동! 초록 빛기둥으로`, 'good'); }
      const d = x.pos.distanceTo(this.pl.pos); x.ring.rotation.z += dt * 0.6;
      if (d < 2.1 && !this.pl.dead) { inAny = x; if (open) x.hold += dt; else if (!x.toldClosed) { x.toldClosed = true; this.ui.toast(x.name + ' — ' + this.exitWhy(x), 'soft'); } } else { x.hold = Math.max(0, x.hold - dt * 2); x.toldClosed = false; }
      x.fill.material.opacity = 0.12 + (x.hold / x.need) * 0.5;
      if (x.hold >= x.need) { if (x.belt) { if (!this.F?.ride) startRide(this, x); } else { this.extract(x); return; } } /* 공장 반출구: 발판 → 벨트 타고 나감 */
    }
    this.exitHere = inAny;
  }
  updateGates(dt) { for (const g of this.gates) if (g.open && g.door.lock && g.lift < 1) { g.lift = Math.min(1, g.lift + dt * 0.8); g.g.position.y = -2.7 * g.lift; } }
  openGate(g) { g.open = true; if (g.box) g.box.off = true; sfx.gate(); this.shake = Math.max(this.shake, 0.3); this.fx.burst(g.door.x, 1, g.door.z, 20, 0xd9c7a0, 5, 0.12, 0.7); }
  powerOn() {
    this.power = true; this.gen.lampM.color.set(0x7dffb2); sfx.power(); this.noise(this.gen.pos instanceof THREE.Vector3 ? this.gen.pos : V(this.gen.pos.x, 0, this.gen.pos.z), 18);
    for (const g of this.gates) if (g.door.lock === 'power') this.openGate(g);
    const pw = this.M.exits.power; let lightMsg = '';
    if (this.darkPerm) { this.darkPerm = false; this.dark = 0; lightMsg = ' · 불이 들어왔어요'; }
    this.ui.event(`전원 복구! ${this.Z[3].name} 문이 열리고 ${pw}${josa(pw, '이', '가')} 움직여요${lightMsg} — 소리가 컸어요`, 'good');
  }
  /* 등불 켜기/끄기 (항구): 켜면 둘레가 보이지만 그 안의 나도 멀리서 보임 */
  toggleLamp(L) { L.lit = !L.lit; this.noise(V(L.x, 0, L.z), L.lit ? 7 : 3); sfx.power(); this.ui.toast(L.lit ? '등불을 켰어요 — 둘레가 보여요 (적도 나를 봐요)' : '등불을 껐어요 — 어둠에 숨어요', 'soft'); }
  /* 신호탄 (항구 보트 출구): 쏘면 크게 들리고, 7초 뒤 보트가 와서 4초 버티면 탈출 */
  fireFlare(x) {
    x.call = 'wait'; x.arrive = 7; this.noise(x.pos, 22); sfx.boom(); this.shake = Math.max(this.shake, 0.25);
    this.fx.burst(x.pos.x, 1.5, x.pos.z, 30, 0xff5a3a, 9, 0.12, 1.4, -4); this.flash = Math.max(this.flash, 0.12);
    this.ui.event(`신호탄! ${x.name}${josa(x.name, '이', '가')} 7초 뒤 와요 — 그동안 버텨요 (소리가 컸어요)`, 'warn');
  }
  hurtRaw(dmg, msg) { const pl = this.pl; if (pl.dead || this.over) return; pl.hp -= dmg; pl.flash = 0.1; this.ui.hurtFlash(); sfx.hurt(); if (msg && !(this.rawMsgT > this.t)) { this.rawMsgT = this.t + 3; this.ui.toast(msg, 'warn'); }
    if (pl.hp <= 0 && pl.lastStand) { pl.lastStand = false; pl.hp = 1; pl.inv = 1.2; this.ui.event('한 번 버텼어요! 지금 회복하거나 피해요', 'warn'); } else if (pl.hp <= 0) { pl.hp = 0; this.die('enemy'); } }
  /* 지도 연출 · 시간 흐름: 번개 · 등불 · 등대 빛 · 물살 화살 · 공기 방울 · 불 · 보트 도착 */
  updateMapFx(dt) {
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
    if (this.douse > 0) { this.douse -= dt; if (this.douse <= 0) { this.douse = 0; this.ui.toast('등불이 다시 보여요', 'good'); } }
    if (this.C.rain && !this.over) { this.nextBolt -= dt; if (this.nextBolt <= 0) { this.nextBolt = 9 + this.R() * 8; this.flash = 0.25; sfx.boom(); this.shake = Math.max(this.shake, 0.15); } }
    const lampsOn = !(this.dark > 0 && this.map === 'harbor') && this.douse <= 0;
    for (const L of this.lamps) { const on = L.lit && lampsOn; if (L.shown !== on) { L.shown = on; this.X.lampFx.set(L.i, L, on); } }
    for (const b of this.X.beams) b.rotation.y += dt * 0.6;
    if (this.currents.length) { const k = (this.C.current || 1) * (this.surge > 0 ? 2 : 1); const im = this.X.arrowIM, M4 = this._m4 ||= new THREE.Matrix4(), Q = this._q ||= new THREE.Quaternion(), E3 = this._e ||= new THREE.Euler(), S3 = this._s ||= V();
      for (const c of this.currents) { E3.set(-Math.PI / 2, 0, c.rot); Q.setFromEuler(E3); for (const a of c.arrows) { a.k = (a.k + dt * 0.18 * k) % 1;
        const along = c.dz ? (c.dz > 0 ? c.z0 + a.k * (c.z1 - c.z0) : c.z1 - a.k * (c.z1 - c.z0)) : (c.dx > 0 ? c.x0 + a.k * (c.x1 - c.x0) : c.x1 - a.k * (c.x1 - c.x0));
        if (c.dz) tmpV.set((c.x0 + c.x1) / 2 + a.off, 0.2, along); else tmpV.set(along, 0.2, (c.z0 + c.z1) / 2 + a.off); const sc = 0.4 + 0.8 * Math.sin(a.k * Math.PI); S3.set(sc, sc, sc); im.setMatrixAt(a.idx, M4.compose(tmpV, Q, S3)); } }
      im.instanceMatrix.needsUpdate = true; im.material.opacity = Math.min(0.75, 0.4 * k); }
    if (this.airs.length && this.R() < dt * 6) { const a = this.airs[Math.floor(this.R() * this.airs.length)]; if (Math.hypot(a.x - this.pl.pos.x, a.z - this.pl.pos.z) < 22) this.fx.burst(a.x + (this.R() - 0.5), 0.3, a.z + (this.R() - 0.5), 3, 0xdff6ff, 1.2, 0.09, 1.2, -5); }
    for (let i = this.hazards.length - 1; i >= 0; i--) { const h = this.hazards[i]; h.t -= dt; h.m.material.opacity = Math.min(0.55, h.t) * (0.8 + Math.sin(this.t * 20 + i) * 0.2); if (this.R() < dt * 10) this.fx.burst(h.x + (this.R() - 0.5) * h.r, 0.3, h.z + (this.R() - 0.5) * h.r, 2, 0xffb347, 2, 0.08, 0.5, -3);
      if (h.t <= 0) { this.root.remove(h.m); h.m.material.dispose(); this.hazards.splice(i, 1); } }
    if (this.F) factoryTick(this, dt);
    for (const m of this.mods) m.tick?.(dt); /* M4-B 수압 문 · 이끼 · 배양조 · 판 상태 게이지 */
    for (const x of this.exits) if (x.call === 'wait') { x.arrive -= dt; if (x.arrive <= 0) { x.call = 'ready'; x.deco.visible = true; this.ui.event(`${x.name} 도착! 초록 원에서 버텨요`, 'good'); sfx.extract(); } }
    this.updateLook(dt);
  }
  /* ───── 상호작용 ───── */
  act() {
    const n = this.near, pl = this.pl; if (!n || pl.searching || pl.dead) return;
    if (n.type === 'mod') return n.m.act(n); /* M4-B 관제 터미널 */
    const threat = this.enemies.find(e => !e.dead && e.state === 'chase' && e.pos.distanceTo(pl.pos) < 7);
    if (n.type === 'gen') { if (threat) { this.ui.toast('적이 가까워요 — 먼저 정리하고 켜요', 'soft'); return; } pl.searching = { kind: 'gen', prog: 0, need: RAID.powerTime }; sfx.search(); this.noise(pl.pos, 6); pl.anim.play('Interact', { fade: 0.1, speed: 1.2, force: true }); return; }
    if (n.type === 'lamp') { if (this.dark > 0 && this.map === 'harbor') { this.ui.toast('전기가 나가 등불이 안 켜져요', 'soft'); return; } pl.searching = { kind: 'lamp', L: n.L, prog: 0, need: LAMP.lightTime * (n.L.lit ? 0.5 : 1) }; sfx.search(); pl.anim.play('Interact', { fade: 0.1, speed: 1.4, force: true }); return; }
    if (n.type === 'flare') { if (n.x.crane && this.dark > 0) { this.ui.toast('정전 — 크레인이 멈췄어요. 발전기를 켜요', 'soft'); return; } pl.searching = { kind: 'flare', x: n.x, prog: 0, need: 1.0, txt: n.x.crane ? '레버 당기는 중…' : null }; sfx.search(); pl.anim.play('Interact', { fade: 0.1, speed: 1.4, force: true }); return; }
    if (n.type === 'gate') {
      if (n.g.door.lock === 'power') { this.ui.toast(`전원 문 — ${this.Z[2].name}의 발전기를 켜면 열려요`, 'soft'); return; }
      if (this.takeOne('vkey')) { this.openGate(n.g); this.vaultOpened = true; this.ui.event('금고실이 열렸어요!', 'good'); sfx.rare(); }
      else this.ui.toast(`금고 열쇠가 필요해요 — ${ENEMIES[this.M.bossKind].name}${josa(ENEMIES[this.M.bossKind].name, '이', '가')} 갖고 있어요`, 'soft');
      return;
    }
    const c = n.c;
    if (threat && !c.searched) { this.ui.toast('적이 가까워요 — 먼저 정리하고 뒤져요', 'soft'); return; }
    if (c.searched) { this.ui.openLoot(c); return; }
    const need = RAID.searchTime / this.L.search * (c.kind === 'chest' || c.kind === 'vault' ? 1.43 : 1);
    pl.searching = { kind: 'loot', c, prog: 0, need }; sfx.search(); this.noise(pl.pos, 4);
    pl.anim.play(c.kind === 'body' || c.kind === 'corpse' || c.kind === 'boss' ? 'PickUp' : 'Interact', { fade: 0.1, speed: 1.2, force: true });
  }
  beginSearch() { this.act(); }
  cancelSearch() { this.pl.searching = null; this.ui.toast('손이 멈췄어요', 'soft'); }
  openContainer(c) {
    if (!c.searched) { c.searched = true; if (c.ring) { c.ring.visible = false; } if (c.obj && c.kind !== 'corpse') c.obj.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.6); this.ownMats.push(o.material); } }); }
    if (c.corpse) this.corpseTaken = true;
    if (c.items.some(k => ITEMS[k].val >= 40)) sfx.rare();
    this.ui.openLoot(c);
  }
  takeItem(c, idx) {
    const key = c.items[idx]; const it = mkItem(key);
    if (autoAdd(this.bag, it) || autoAdd(this.safe, it) || (this.pet && autoAdd(this.pet, it))) { c.items.splice(idx, 1); sfx.pick(ITEMS[key].val / 10); return it; }
    this.ui.toast('가방이 꽉 찼어요 — 덜 중요한 걸 꺼내 보세요', 'soft'); return null;
  }
  dropItem(it) {
    let c = this.containers.find(c => c.kind === 'drop' && c.pos.distanceTo(this.pl.pos) < 1.5);
    if (!c) { const o = prop('box_a'); o.scale.setScalar(3); o.position.copy(this.pl.pos); this.root.add(o); c = { kind: 'drop', pos: this.pl.pos.clone(), obj: o, items: [], searched: true, name: '내려놓은 것' }; this.containers.push(c); }
    c.items.push(it.key); return c;
  }
  useMed() {
    const pl = this.pl; if (pl.hp >= pl.maxHp && !(this.WX?.poison > 0.5)) { this.ui.toast('체력이 가득해요', 'soft'); return; }
    const miss = pl.maxHp - pl.hp; const order = this.WX?.poison > 0.5 && miss < 40 ? ['antitox', 'med', 'bandage'] : miss >= 70 ? ['bandage', 'med', 'antitox'] : ['med', 'bandage', 'antitox']; /* M4-B 해독제 */
    if (this.L.noHeal) { this.ui.toast('이번 주 도전 규칙: 회복 없음', 'soft'); return; } /* M5-B 주간 도전 */
    const k = order.find(k => this.hasItem(k)); if (!k) { this.ui.toast('회복약이 없어요', 'soft'); return; }
    this.takeOne(k); this.used.push(k);
    const hv = Math.round(ITEMS[k].heal * (this.L.heal || 1)); pl.hp = Math.min(pl.maxHp, pl.hp + hv); sfx.pick(3); this.fx.burst(pl.pos.x, 1.2, pl.pos.z, 12, 0x8ef0a8, 3, 0.08, 0.6, -2); this.fx.num(pl.pos, '+' + hv, 'heal'); for (const m of this.mods) m.healed?.(k); /* M4-B 독 씻김 */
  }
  /* ───── 끝 ───── */
  extract(x) {
    this.over = 'extract'; this.exitUsed = x.kind; sfx.extract(); this.pl.anim.play('Cheer', { fade: 0.15, force: true }); this.ui.toast(x.name + ' — 탈출!', 'good');
    this.endIn = 1.6;
  }
  die(why) {
    if (this.over) return; this.over = why === 'tide' ? 'tide' : 'dead'; const pl = this.pl; pl.dead = true; sfx.die();
    pl.anim.play('Death_A', { once: true, fade: 0.08, force: true }); this.shake = 0.6; this.slow = 0.4; this.slowT = 0.6;
    this.endIn = 2.0;
  }
  result() {
    const items = bagKeys(this.bag), safe = bagKeys(this.safe), pet = this.pet ? bagKeys(this.pet) : [];
    const all = [...items, ...safe, ...pet];
    return { outcome: this.over, items, safe, pet, petSafe: !!this.L.pet?.safe, value: all.reduce((s, k) => s + ITEMS[k].val, 0), kills: { ...this.kills }, killN: this.killN, time: this.elapsed,
      seed: this.opt.seed, deathPos: { x: this.pl.pos.x, z: this.pl.pos.z }, corpseTaken: !!this.corpseTaken, dmgLog: (this.dmgLog || []).slice(-6), shots: this.shots, hits: this.hits,
      zoneMax: this.zoneMax, power: this.power, vaultOpened: this.vaultOpened, vkeyOut: all.includes('vkey'), exit: this.exitUsed || null, used: this.used.slice(),
      map: this.map, cond: this.cond, wx: this.wx, bossKind: this.bossKind || null, minO2: this.o2 != null ? Math.round(this.minO2) : null, keep: this.L.keep || 0, diff: this.L.diff || 'normal', ammo: this.L.ammo || 'normal', infight: this.infightKills || 0,
      threat: this.T ? { lv: this.T.lv, ai: this.T.ai, week: this.T.week } : null, chief: this.chief ? (this.chief.dead ? 'down' : 'met') : null, unwarned: this.unwarned.length, bigHits: this.bigHits };
  }
  dispose() {
    this.alive = false; for (const m of this.mods || []) m.dispose?.(); ambience(false); this.applyLook(false); this.fx.weather?.(null); this.ai?.dispose(); chiefDispose(this); if (this.boss?.rain) clearRain(this, this.boss);
    for (const g of this.X.geos) g.dispose();
    this.scene.remove(this.root);
    const skels = new Set(); this.root.traverse(o => { if (o.isSkinnedMesh) skels.add(o.skeleton); }); for (const k of skels) k.dispose();
    this.root.traverse(o => {
      if (o.isSprite) { if (o.material.map && o.material.map.isCanvasTexture) { /* 표시 텍스처는 공유 */ } o.material.dispose(); return; }
      if (!o.isMesh) return;
      if (o.geometry === discGeo) { o.material.dispose(); return; }
      const own = !o.userData.keepGeo && (o.name === 'static' || o.name === 'water' || !o.material.map || o.userData.own);
      if (own) o.geometry.dispose();
      if (o.name === 'water') { o.material.uniforms.uMask.value.dispose(); o.material.dispose(); }
      else if (!o.material.map || o.userData.ownMat) o.material.dispose();
    });
    for (const m of this.ownMats) m.dispose();
    for (const e of this.enemies) e.anim?.mixer.stopAllAction();
    this.pl.anim.mixer.stopAllAction();
    this.fx.clear(); this.hn?.clear(); this.root = null; this.enemies = []; this.containers = []; this.enemyShots = []; this.smokes = []; this.nades = [];
  }
}
/* 받침 있는 글자면 a (이 · 을 · 으로), 없으면 b */
function josa(s, a, b) { const c = s.charCodeAt(s.length - 1) - 0xac00; const j = c >= 0 && c <= 11171 ? c % 28 : 0; if (a === '으로') return j && j !== 8 ? a : b; return j ? a : b; }
const markCache = {};
function markTex(t = '!') {
  if (markCache[t]) return markCache[t];
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = t === '!' ? '#ff5a45' : '#ffd166'; x.beginPath(); x.arc(32, 32, 26, 0, 7); x.fill(); x.strokeStyle = '#1b1f24'; x.lineWidth = 5; x.stroke();
  x.fillStyle = '#1b1f24'; x.font = 'bold 40px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, 32, 35);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return markCache[t] = tx;
}
