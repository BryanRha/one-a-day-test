// 수달 인양단 — 시작 · 렌더 · 장면 전환 · 시험 훅
import { forecast, setWxTest } from './data/weather.js?v=0.99.19'; /* M4-B 판 상태 5 */
import * as THREE from 'three';
import { loadAll, makeIcons, prop, charClone, A, loadPack, packReady } from './assets.js?v=0.99.19';
import { FX, shakeMul } from './fx.js?v=0.99.19';
import { Raid } from './raid.js?v=0.99.19';
import { UI } from './ui.js?v=0.99.19';
import { S, load, save, stashCap } from './save.js?v=0.99.19';
import { ITEMS, FACILITIES, DAILY_SORTIES } from './data.js?v=0.99.19';
import * as E from './econ.js?v=0.99.19';
import { installBack } from './oad.js?v=0.99.19';
import { makeHero, ensure, ready, tailWag, HERO_SCALE } from './hero.js?v=0.99.19';
import { resolve, lookOf, grantEarned } from './look.js?v=0.99.19';
import { initBM, attachRaid } from './bmflow.js?v=0.99.19';
import { Story, artUrl } from './story_ui.js?v=0.99.19';
import { HomeFac } from './home_fac.js?v=0.99.19';
import { FurnUI } from './furn_ui.js?v=0.99.19'; /* M5-D 은신처 가구 30 */
import { petSpec, petScale, makeBandi } from './pet_raid.js?v=0.99.19'; /* M5-C 몽이 5단 겉모습 · 반디 */
import { mergeGeometries } from '../lib/BufferGeometryUtils.js?v=0.99.19';
import * as TH from './threat.js?v=0.99.19'; /* M4-A 위협 곡선 · 주간 변주 */
import * as CHL from './challenge.js?v=0.99.19'; import * as AB from './abyss.js?v=0.99.19'; import * as AC from './ach.js?v=0.99.19'; import * as M5 from './ui_m5b.js?v=0.99.19'; /* M5-B 주간 도전 · 깊은 물 · 업적 50 */
import { DUCK, duckFov, duckCam, duckRaidTick, VEIL_STATS } from './look_duck.js?v=0.99.19'; /* 시안용 ?look=duck */
import { m6cRaid } from './happen.js?v=0.99.19'; /* M6-C 판 중 사건 5 · 떠돌이 두목 예고 · 색약 보조 판 장치 */

const Q = new URLSearchParams(location.search);
setWxTest({ wx: Q.get('wx'), week: Q.has('week') ? Q.get('week') : undefined }); /* ?wx= · ?week= 시험값 → 출격 준비 예보 카드와 실제 판이 같은 값 (M4 마무리) */
const app = window.__salvage = { free: Q.has('free'), bot: Q.has('bot'), stats: { frames: 0, slow: 0, fpsLog: [] } };
/* 판 카메라 거리: 390×844 화면 가로에 보이는 바닥 폭(m). 기본 12.08 (25, 15 오프셋) · 시험 ?cam=10|11|12 (v0.7.1 대표 확인 칸 · PROJECT_STATUS v0.7.1) */
const CAM_W = 12.08; app.camW = +(Q.get('cam') || (DUCK.on ? 14 : 11)); app.duck = DUCK; app.duckStats = () => +VEIL_STATS.ms.toFixed(3); /* v0.7.1 총괄 판단: 12 → 11 m (근거 docs/camera_m4*.json · shots/fix_qm4_cam_compare.png) */ app.camK = app.camW / CAM_W;
/* 출격 제한: 실서버(oneaday.kr)에서만 하루 3회 · 테스트 서버·로컬은 완성될 때까지 무제한 (대표 2026-11-05) */
app.nolimit = app.free || !Q.has('limit') && location.hostname !== 'oneaday.kr' && location.hostname !== 'www.oneaday.kr';   /* ?limit = 시험에서 실서버처럼 제한 */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, Q.has('lo') ? 1 : 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b1820); scene.fog = new THREE.Fog(0x0b1820, 26, 52);
const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 120); app.camera = camera; app.renderer = renderer; app.scene = scene;
/* 빛: 차가운 하늘 + 따뜻한 해 (그림자는 주인공 둘레만) */
const hemi = new THREE.HemisphereLight(0xbfd8e6, 0x2a3b40, 1.5); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2b8, 2.1); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 }); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.04; scene.add(sun, sun.target);
if (DUCK.on) Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24 }); /* 시안용: 넓어진 화면 */

const hud = document.getElementById('hud');
const fx = new FX(scene, hud);
const ui = app.ui = new UI(app);
const story = app.story = new Story(app, ui);   /* v0.5 이야기 (튜토리얼 · 은신처 대화 · 도감 · 판 안 무전) */
let raid = null, hide = null, last = performance.now(), camPos = new THREE.Vector3(), camLook = new THREE.Vector3();

function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
  /* 세로 화면에서 가로 12m 쯤 보이게 */
  camera.fov = THREE.MathUtils.clamp(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(22.5)) * Math.max(1, 0.5 / camera.aspect)) * 180 / Math.PI, 38, 62);
  if (DUCK.on) duckFov(camera, app.camW); /* 시안용: 세로 시야 42° · 가로 폭 = camW */
  camera.updateProjectionMatrix();
  const v = ui.veil; v.width = Math.round(w * 0.5); v.height = Math.round(h * 0.5); if (ui.veil2) { ui.veil2.width = v.width; ui.veil2.height = v.height; }
}
addEventListener('resize', resize);

/* ───── 은신처 장면 (3D 배경) ───── */
/* 물가: 물결 면(캔버스 물결 무늬 · 천천히 흐름) + 부두(앞 줄 바닥 끝 들보 · 앞 데크 · 말뚝 — 한 지오메트리 · 판자 무늬) */
function waterfront(g) {
  const wc = document.createElement('canvas'); wc.width = wc.height = 128; const x = wc.getContext('2d');
  x.fillStyle = '#2b6d74'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 46; i++) { const px = (i * 53) % 128, py = (i * 29) % 128, w = 10 + (i * 7) % 22; x.strokeStyle = i % 3 ? 'rgba(160,230,230,.16)' : 'rgba(10,40,48,.35)'; x.lineWidth = 2; x.beginPath(); x.ellipse(px, py, w, 2.2, 0, 0, Math.PI * 2); x.stroke(); }
  const wt = new THREE.CanvasTexture(wc); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(16, 16); wt.colorSpace = THREE.SRGBColorSpace;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(96, 96), new THREE.MeshLambertMaterial({ map: wt, emissive: 0x0c3238 })); water.rotation.x = -Math.PI / 2; water.position.y = -0.32; water.receiveShadow = true; water.name = 'hide_water'; g.userData.water = wt;
  const pc = document.createElement('canvas'); pc.width = 64; pc.height = 64; const y = pc.getContext('2d');
  for (let i = 0; i < 8; i++) { y.fillStyle = ['#7a5636', '#6e4c2f', '#835d3b', '#74512f'][i % 4]; y.fillRect(0, i * 8, 64, 8); y.fillStyle = 'rgba(30,18,8,.55)'; y.fillRect(0, i * 8 + 7, 64, 1); y.fillRect((i * 23) % 64, i * 8, 1, 8); }
  const pt = new THREE.CanvasTexture(pc); pt.colorSpace = THREE.SRGBColorSpace; pt.magFilter = THREE.NearestFilter;
  const parts = []; const box = (w, h, d, px, py, pz, ry = 0) => { const b = new THREE.BoxGeometry(w, h, d); if (ry) b.rotateY(ry); b.translate(px, py, pz); parts.push(b); };
  const post = (px, pz, h = 1.0) => { const c = new THREE.CylinderGeometry(0.16, 0.18, h, 7).toNonIndexed(); c.translate(px, 0.06 - h / 2 + 0.25, pz); parts.push(c); };
  box(20.4, 0.34, 0.36, 0, -0.14, 2.12);                 /* 앞 줄 바닥 끝 들보 (방 → 물) */
  box(6.2, 0.22, 4.3, 1.75, -0.1, 4.2);                  /* 앞 데크 (수족관 · 훈련장) */
  box(6.4, 0.3, 0.3, 1.75, -0.12, 6.38); box(0.3, 0.3, 4.3, -1.42, -0.12, 4.2); box(0.3, 0.3, 4.3, 4.92, -0.12, 4.2); /* 데크 테두리 */
  for (const [px, pz] of [[-1.42, 6.38], [1.75, 6.38], [4.92, 6.38], [-1.42, 3.3], [4.92, 3.3], [-10, 2.12], [-6.2, 2.12], [-4.6, 2.12], [6.4, 2.12], [10, 2.12]]) post(px, pz);
  const geo = mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p)); parts.forEach(p => p.dispose());
  const deck = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: pt })); deck.name = 'hide_pier'; deck.receiveShadow = true; deck.castShadow = true;
  const grp = new THREE.Group(); grp.add(water, deck); return grp;
}
function buildHideout() {
  const g = new THREE.Group(); g.name = 'hideout';
  /* 검수 M4 Top 8: 앞쪽 = 물가. 옛 바닥 원 + 물 고리(그리기 2) → 물결 면 하나 + 부두 데크 하나(그리기 2, 같은 수) — 선착장 · 수족관 · 훈련장이 물 위 부두에 놓임 */
  g.add(waterfront(g));
  const add = (k, x, z, ry = 0, s = 1) => { const o = prop(k); o.position.set(x, 0, z); o.rotation.y = ry; o.scale.setScalar(s); o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); g.add(o); return o; };
  for (let i = -2; i <= 2; i++) add('floor_wood', i * 4, 0); for (let i = -1; i <= 1; i++) add('floor_wood', i * 4, -4);
  add('wall', -4, -6, 0); add('wall', 0, -6, 0); add('wall', 4, -6, 0);
  /* M4-D: 작업대 · 창고 · 선반 · 등은 시설 단계 소품(home_fac.js)이 맡음 — 여기엔 늘 있는 것만 */
  g.userData.base = { rug: add('rug', 0, -1.6, 0, 1.2), armchair: add('armchair', 2.4, -2.6, -0.5, 0.9) }; /* M5-D 가구가 그 자리에 놓이면 숨김 (furn_ui.js) */
  add('torch', -1.6, -5.75, 0); add('torch', 2.4, -5.75, 0);
  const lamp = new THREE.PointLight(0xffb870, 10, 12, 1.4); lamp.position.set(-3, 3, -3); g.add(lamp); g.userData.lamp = lamp;
  g.userData.mats = [];
  /* 시설이 생기면 은신처에 보임 (단계마다 조금씩) */
  const fac = new THREE.Group(); g.add(fac); g.userData.fac = fac; g.userData.add = add;
  return g;
}
/* 시설 12 × 3단 소품 · 공사 끝 카메라 연출 (M4-D · home_fac.js) */
const homeFac = app.homeFac = new HomeFac(app);
app.furn = new FurnUI(app, homeFac); /* M5-D: 가구는 시설 소품 덩어리에 합침 · '초소 꾸미기' 화면 */
function syncHideoutProps() {
  if (!hide) return; homeFac.sync(hide, S);
  syncHideoutHero();
}
/* 은신처 수달 · 몽이 (반려 수달 = 같은 몸 · 털 그대로 · 장식 2칸): 겉모습 · 장비가 바뀔 때만 다시 합침 */
function syncHideoutHero() {
  if (!hide) return; const U = hide.userData;
  const spec = resolve(lookOf(S)); const key = spec.key + spec.wkey;
  if (U.heroKey !== key) {
    if (U.hero) hide.remove(U.hero.root);
    const h = U.hero = makeHero(spec); h.root.scale.setScalar(0.62 * HERO_SCALE / 0.78); h.root.position.set(-0.4, 0, -1.6); h.root.rotation.y = 0.35; hide.add(h.root);
    U.mixer = new THREE.AnimationMixer(h.root); U.mixer.clipAction(h.clips.Idle).play(); U.heroKey = key;
  }
  E.syncPets(S); const mlv = S.pets?.mong || 1; /* M5-C 몽이 단계 = 크기 · 장식 */
  const pk = (S.fac.aquarium || 0) >= 1 ? JSON.stringify([S.look?.pet, S.look?.fur, mlv]) : null;
  if (U.petKey !== pk) {
    if (U.pet) { hide.remove(U.pet.root); U.pet = null; }
    if (pk) { const p = makeHero(petSpec(resolve({ pet: true, look: S.look }), mlv)); p.root.scale.setScalar(petScale(mlv) * HERO_SCALE / 0.78); p.root.position.set(0.9, 0, -1.0); p.root.rotation.y = -0.6; hide.add(p.root); const m = new THREE.AnimationMixer(p.root); m.clipAction(p.clips.Idle).play(); m.setTime(0.7); U.pet = { root: p.root, m, h: p }; }
    U.petKey = pk;
  }
  /* M5-C 반디: 몽이 머리 위에 떠 있음 (수족관 쪽) */
  const bk = S.pets?.bandi || 0;
  if (U.bandiKey !== bk) { if (U.bandi) { hide.remove(U.bandi); U.bandi = null; } if (bk) { U.bandi = makeBandi(bk); U.bandi.position.set(1.35, 1.25, -0.7); U.bandi.scale.multiplyScalar(1.1); hide.add(U.bandi); } U.bandiKey = bk; }
}
app.syncHideoutHero = () => syncHideoutHero();
/* 겉모습 바뀜: 필요한 파일을 받은 뒤 은신처 수달 다시 합침 */
app.lookChanged = async () => { const sp = resolve(lookOf(S, { both: true })); await ensure([...sp.files, ...petSpec(resolve({ pet: true, look: S.look }), S.pets?.mong || 1).files]); syncHideoutHero(); };
app.syncHideoutProps = () => syncHideoutProps();
app.showHideout = on => {
  if (on && !hide) { hide = buildHideout(); scene.add(hide); }
  if (on) syncHideoutProps();
  if (hide) hide.visible = on;
  if (!on) homeFac.abort(); /* 검수 M4 Top 9: 판으로 가면 공사 끝 연출 · 띠를 바로 끝냄 */
  scene.fog.near = on ? 30 : 22 + (DUCK.on ? DUCK.fogAdd : 0); scene.fog.far = on ? 70 : 48 + (DUCK.on ? DUCK.fogAdd * 1.15 : 0); /* 시안용: 멀어진 카메라만큼 */
};

/* ───── 출격 ───── */
let seedN = 0;
/* 장착 파일이 아직이면 받은 뒤 시작 (보통은 은신처에서 이미 받아 둠 → 바로) */
/* v0.4 지도: 쓰러진 가방이 있으면 그 지도 · 아니면 고른 지도(열린 것만) — 지도 묶음(에셋)은 해금 때 미리 받아 둠, 아직이면 받은 뒤 시작 */
const mapFor = o => S.corpse ? (S.corpse.map || 'ware') : E.mapOpen(S, o?.map) ? o.map : 'ware';
app.startRaid = o => {
  const sp = resolve(lookOf(S, { both: true })); const m = mapFor(o);
  if (ready(sp.files) && packReady(m)) return startRaidNow(o);
  if (app.starting) return; app.starting = true; ui.toast('지도를 받는 중…', 'soft');
  Promise.all([ensure(sp.files).catch(e => console.warn('장착 파일', e)), loadPack(m).catch(e => console.warn('지도 묶음', e))]).then(() => { app.starting = false; startRaidNow(o); });
};
/* 열린 지도 묶음을 은신처에서 미리 받기 (첫 진입 용량엔 안 들어감) */
app.preloadMaps = () => { for (const m of E.openMaps(S)) if (m !== 'ware') loadPack(m).catch(e => console.warn('지도 묶음', e)); };
function startRaidNow({ safeItems = [], carry = [], map, abyss = 0 }) {
  if (raid) endRaid();
  if (!app.free) S.sorties = Math.max(0, S.sorties - 1);   /* 테스트 무제한(nolimit)이어도 횟수는 세서 '하루 끝' 이야기는 그대로 */
  const L = E.loadout(S); E.useAmmo(S); /* v0.6 탄약 상자 1개 = 이번 판 (L.ammo 는 쓰기 전에 정해짐) */
  /* 안전 칸 · 가져갈 소모품은 창고에서 꺼냄 · 창고 단계 보너스 연고는 공짜 */
  const take = k => { const i = S.stash.indexOf(k); if (i >= 0) { S.stash.splice(i, 1); return true; } return false; };
  const safe = safeItems.filter(take), bring = carry.filter(take);
  const seed = S.corpse ? S.corpse.seed : (Q.has('seed') ? +Q.get('seed') + seedN++ : (Date.now() % 1e9) + seedN++);
  const q = E.questNow(S); const want = [...E.dailyList(S.daily.day, S.daily.maps || []).filter((o, i) => !S.daily.done[i]).map(o => o.item), ...(q?.goal.item ? [q.goal.item] : []), ...(q?.goal.t === 'vkey' ? ['vkey'] : [])];
  const wx = forecast(S, mapFor({ map })); /* M4-B 이번 판 예보 (출격 준비 카드와 같은 함수 — ?wx= · 이번 주 변주 · 남은 가방 판 포함, 출격 수를 올리기 전에) */
  S.meal = null; S.stats.raids++; save();
  if (hide) hide.visible = false;
  const mk = mapFor({ map }); if (!packReady(mk)) { console.warn('지도 묶음 없음 → 창고', mk); }
  const rmap = packReady(mk) ? mk : 'ware'; TH.noteDay(S, S.day || E.kstDay()); const threat = Q.has('nothreat') ? null : TH.threatOf(S, rmap, S.day || E.kstDay(), { ...(Q.has('threat') ? { lv: +Q.get('threat') } : {}), ...(Q.has('week') ? { week: TH.weekNamed(Q.get('week')) } : {}), ...(Q.has('chief') ? { chiefAt: +Q.get('chief') || 5 } : {}) }); /* ?threat=N · ?week=night|storm|boss · ?chief=초 = 시험용 */ /* M4-A 오늘 위협 (?nothreat = M3 그대로) */
  if (abyss && AB.abyssOpen(S) && threat) AB.applyRaid(S, threat, L, abyss); /* M5-B 깊은 물: 위협 Lv 10 + 깊이 · 보상 배수 · 닳음 */
  const rseed = seed; save(); /* M4 마무리: 주간 변주는 예보 가중치로 (data/weather.js wxTable) — 예보가 지도 상태를 정하므로 seed 다시 뽑기(pickSeed)는 뺌 */
  raid = app.raid = new Raid({ scene, camera, fx, ui, renderer, lights: { hemi, sun } });
  attachRaid(raid);   /* 원어데이: 가방 보험 · 이어하기 (bmflow) */
  raid.start({ seed: rseed, threat, map: rmap, corpse: S.corpse, wx, wxForce: Q.has('wx'), L, safeItems: safe, carry: bring, kit: Array(L.kit).fill('med'), want, hero: resolve(lookOf(S, { both: true })), petHero: S.pets?.mong ? petSpec(resolve({ pet: true, look: S.look }), S.pets.mong) : null });
  story.raidStart(raid); m6cRaid(raid); /* M6-C 판 중 사건 · 접근성 장치 */
  const p = raid.pl.pos; camPos.set(p.x, 30, p.z + 18); camLook.copy(p);
}
/* M5-B 주간 도전: 지급 장비 · 그 주 seed · 규칙 — 내 창고 · 남은 가방 · 이야기 · BM(이어하기 · 보험)과 따로 */
app.startChal = () => {
  const v = CHL.canStart(S, app.nolimit); if (!v.ok) return v; if (app.starting) return { ok: false };
  const spec = CHL.begin(S, { free: app.free }); save(); const sp = resolve(lookOf(S, { both: true }));
  if (ready(sp.files) && packReady(spec.map)) { startChalNow(spec); return { ok: true, spec }; }
  app.starting = true; ui.toast('지도를 받는 중…', 'soft');
  Promise.all([ensure(sp.files).catch(e => console.warn('장착 파일', e)), loadPack(spec.map).catch(e => console.warn('지도 묶음', e))]).then(() => { app.starting = false; startChalNow(spec); });
  return { ok: true, spec };
};
function startChalNow(spec) {
  if (raid) endRaid();
  const { L, kit } = CHL.chalLoadout(spec); const threat = CHL.chalThreat(spec); const rmap = packReady(spec.map) ? spec.map : 'ware';
  if (hide) hide.visible = false;
  raid = app.raid = new Raid({ scene, camera, fx, ui, renderer, lights: { hemi, sun } }); raid.chal = spec;
  raid.start({ seed: spec.seed, threat, map: rmap, corpse: null, wx: spec.wx, L, safeItems: [], carry: [], kit, want: [], hero: resolve(lookOf(S, { both: true })) });
  m6cRaid(raid, { chal: true }); /* M6-C 접근성 장치 (도전 판은 사건 없음) */
  const p = raid.pl.pos; camPos.set(p.x, 30, p.z + 18); camLook.copy(p);
}
app.chalSpec = no => CHL.weekly(no ?? CHL.chal(S).wk); /* 시험 훅 */
function endRaid() {
  const res = raid.result(); AC.collect(raid, res, S); const chal = raid.chal; story.raidEnd(); raid.dispose(); raid = app.raid = null;
  if (chal) return M5.chalEnd(app, res, chal); /* M5-B: 도전 판은 점수로만 (창고 · 의뢰 · 이야기 X) */
  story.afterRaid(res);   /* 이야기 물건 · 기억 조각 · 녹음기 · 이야기 걸음 (창고에 넣기 전) */
  const gained = { overflow: 0, overflowVal: 0 };
  const intoStash = keys => { for (const k of keys) { if (S.stash.length < stashCap()) S.stash.push(k); else { gained.overflow++; gained.overflowVal += ITEMS[k].val; S.shells += ITEMS[k].val; } } };
  if (res.corpseTaken || (S.corpse && res.seed === S.corpse.seed)) S.corpse = null; /* 한 번만 */
  if (res.outcome === 'extract') { intoStash([...res.items, ...res.safe, ...res.pet]); S.stats.extracts++; S.stats.best = Math.max(S.stats.best, res.value); }
  else { const keep = [...res.items].sort((a, b) => ITEMS[b].val - ITEMS[a].val).slice(0, res.keep || 0); res.kept = keep.slice(); /* v0.6 돌아올 표 부적 · 구조 보트 */
    intoStash([...res.safe, ...(res.petSafe ? res.pet : []), ...keep]); S.stats.deaths++; const lost = [...res.items.filter((k, i, a) => { const j = keep.indexOf(k); if (j < 0) return true; keep.splice(j, 1); return false; }), ...(res.petSafe ? [] : res.pet)]; if (lost.length) S.corpse = { seed: res.seed, map: res.map, cond: res.cond, wx: res.wx, x: res.deathPos.x, z: res.deathPos.z, items: lost }; }
  S.stats.kills += res.killN; S.stats.drones += res.kills.drone; S.stats.bosses += res.kills.boss; if (res.vaultOpened && res.outcome === 'extract') S.stats.vaults++; S.stats.zoneMax = Math.max(S.stats.zoneMax, res.zoneMax);
  if (res.diff === 'deep' && res.outcome === 'extract') S.stats.deepExt = (S.stats.deepExt || 0) + 1;
  /* v0.4 지도별 기록 · 보스 종류 (의뢰 28 '인양단장') */
  const ms = ((S.stats.maps ||= {})[res.map] ||= { raids: 0, extracts: 0 }); ms.raids++; if (res.outcome === 'extract') ms.extracts++;
  if (res.bossKind) (S.stats.bossKinds ||= {})[res.bossKind] = (S.stats.bossKinds[res.bossKind] || 0) + 1;
  res.quests = E.questRaid(S, res);
  (S.log ||= []).push({ d: S.day, o: res.outcome, v: res.outcome === 'extract' ? res.value : 0, t: Math.round(res.time), z: res.zoneMax, m: res.map, c: res.cond }); if (S.log.length > 30) S.log.shift();
  M5.afterRaid(res); /* M5-B 업적 기록 · 깊은 물 깊이 · 닳음 · 이정표 */
  save();
  app.lastResult = res;
  ui.result(res, gained); M5.resultPop(app, res);
  return res;
}

/* ───── 자동 화질 단계 (M6-D) ─────
   0 기본(해상도 기기 배율 최대 2 · 그림자 · 입자 600) → 1 해상도 1.5 · 입자 ×0.8 → 2 해상도 1 · 그림자 끔 · 입자 360 ×0.6 → 3 해상도 0.8 · 입자 240 ×0.45 · 비 줄기 절반
   ?noauto = 자동 끔(측정용 맨 값) · ?gfx=N = 처음부터 N 단계(시험) · ?lo = 1 단계 해상도 1 (옛 시험값 그대로) */
const GFX = [{ pr: 2, shadow: true, cap: 600, q: 1 }, { pr: 1.5, shadow: true, cap: 600, q: 0.8 }, { pr: 1, shadow: false, cap: 360, q: 0.6 }, { pr: 0.8, shadow: false, cap: 240, q: 0.45 }];
const gfx = app.gfx = { lv: 0, auto: !Q.has('noauto'), hist: [], hold: 0, log: [] };
function setGfx(lv) {
  lv = Math.max(0, Math.min(GFX.length - 1, lv)); const g = GFX[lv]; gfx.lv = lv; app.lowGfx = lv >= 2;
  renderer.setPixelRatio(Math.min(devicePixelRatio, Q.has('lo') ? 1 : g.pr)); sun.castShadow = g.shadow; fx.setQ?.(g.cap, g.q); resize();
}
function gfxTick(fps) {
  gfx.hist.push(fps); if (gfx.hist.length > 3) gfx.hist.shift();
  if (!gfx.auto || gfx.lv >= GFX.length - 1) return;
  if (gfx.hold > 0) { gfx.hold--; return; }
  if ((raid.elapsed || 0) < 4 || gfx.hist.length < 3) return;
  const avg = gfx.hist.reduce((a, b) => a + b, 0) / gfx.hist.length;
  if (avg < 50) { setGfx(gfx.lv + 1); gfx.log.push({ lv: gfx.lv, fps: Math.round(avg), t: Math.round(raid.elapsed || 0) }); gfx.hold = 3; gfx.hist = []; }
}
if (Q.has('gfx')) setGfx(+Q.get('gfx') || 0);

/* ───── 루프 ───── */
const shakeV = new THREE.Vector3();
function frame(now) {
  const rdt = Math.min(0.1, (now - last) / 1000); last = now; app.stats.frames++;
  const st = app.stats; st.acc = (st.acc || 0) + rdt; st.n = (st.n || 0) + 1; if (rdt > 1 / 25) st.slow++;
  if (st.acc >= 1) { st.fps = Math.round(st.n / st.acc); st.fpsLog.push(st.fps); if (st.fpsLog.length > 600) st.fpsLog.shift(); st.acc = 0; st.n = 0; }
  /* 자동 화질 (M6-D · 기기 3종): 판 안에서 최근 3초 평균이 50fps 아래면 한 단계씩 내림 — 판 시작 4초 · 내린 뒤 3초는 봄 · 올리지는 않음(깜빡임 X) */
  if (raid && st.acc === 0 && st.fps) gfxTick(st.fps);
  /* 봇 빠르게(?fast=N): 한 프레임에 N번 진행 */
  const steps = raid && app.timeScale > 1 ? app.timeScale : 1;
  for (let i = 0; i < steps; i++) {
    if (app.botTick) app.botTick(rdt);
    if (raid) { raid.update(rdt); if (raid.over) { raid.endIn -= rdt; if (raid.endIn <= 0) { endRaid(); break; } } }
  }
  if (raid) {
    const p = raid.pl.pos;
    /* 카메라: 높이 30 · 뒤 17 (쿼터뷰) · 움직이는 쪽으로 살짝 앞 · 반동 · 흔들림 */
    const lead = new THREE.Vector3(raid.input.mx * 1.6, 0, raid.input.mz * 1.2);
    const cb = raid.camBias; const tx = p.x + lead.x + (cb ? cb.x : 0), tz = p.z + lead.z - 1.2 + (cb ? cb.z : 0); /* M6-B: 최종 보스전은 파수 쪽으로 (gate.js) */
    camLook.lerp(new THREE.Vector3(tx, 0, tz), 1 - Math.pow(0.002, rdt));
    raid.kick.multiplyScalar(Math.pow(0.0001, rdt)); raid.shake = Math.max(0, raid.shake - rdt * 1.6);
    const sm = shakeMul(), s = raid.shake * raid.shake * 0.9 * sm; shakeV.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s); /* 설정 '흔들림 약하게' = ×0.35 (반동도 줄임) */
    const ck = app.camK; camera.position.set(camLook.x, 25 * ck, camLook.z + 15 * ck).addScaledVector(raid.kick, 0.4 + 0.6 * sm).add(shakeV); camera.lookAt(camLook.x + shakeV.x * 0.5, 0, camLook.z);
    if (DUCK.on) duckCam(camera, camLook, raid.kick, 0.4 + 0.6 * sm, shakeV); /* 시안용 약 68° */
    if (app.camOverride) { const o = app.camOverride; camera.position.set(o.x, o.y, o.z + o.back); camera.lookAt(o.x, 0, o.z); } /* 시험용 전체 보기 */
    sun.position.set(p.x + 8, 22, p.z + 6); sun.target.position.set(p.x, 0, p.z);
    fx.update(rdt, camera, innerWidth, innerHeight);
    duckRaidTick(raid, rdt); ui.drawVeil(raid, camera); story.raidTick(rdt); ui.topTick(rdt);   /* 위쪽 한 줄 대기열 · 머리 위 칭찬 (v0.5.1) */
  } else {
    /* 은신처 카메라: 천천히 숨쉬기 */
    const t = now / 1000; if (!app.hideCam?.(camera, t, rdt)) { camera.position.set(Math.sin(t * 0.15) * 0.8, 7.2, 9.4); camera.lookAt(0, -1.4, -1.8); }
    sun.position.set(6, 14, 8); sun.target.position.set(0, 0, -2);
    if (hide) { const U = hide.userData; if (U.water) { U.water.offset.x = (t * 0.012) % 1; U.water.offset.y = (t * 0.02) % 1; } U.mixer?.update(rdt); U.pet?.m.update(rdt); if (U.hero) tailWag(U.hero, rdt, 0); if (U.pet) tailWag(U.pet.h, rdt, 0); if (U.bandi) { U.bandi.position.y = 1.25 + Math.sin(t * 2.2) * 0.08; U.bandi.rotation.y = Math.sin(t * 0.7) * 0.6; } }
    ui.drawVeil(null, camera);
  }
  if (ui.wardrobe.on) { renderer.setClearColor(0x14181d, 1); renderer.clear(); ui.wardrobe.draw(renderer, rdt); renderer.setClearColor(0x000000, 1); }
  else renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* ───── 시작 ───── */
async function boot() {
  resize(); load(); if (Q.has('abyss') && !/^(www\.)?oneaday\.kr$/.test(location.hostname)) AB.markEnding(S); /* M5-B 시험: 깊은 물 열기 */
  /* 첫 실행 로딩 (v0.5.1 · 검수 Top 9): 불투명 · 프롤로그 첫 그림을 흐리게 미리 깔고 '7년 전 밤으로…' — 막은 프롤로그 그림이 뜬 뒤에 걷음 */
  const ld = document.getElementById('loading'); const first = story.on && S.story?.tut === 0;
  app.hideLoading = () => { if (!ld.isConnected || ld.classList.contains('done')) return; ld.classList.add('done'); setTimeout(() => ld.remove(), 500); };
  if (first) { ld.classList.add('first'); ld.querySelector('small').textContent = '7년 전 밤으로…'; const u = artUrl('cut_0_1'); if (u) { const pre = document.createElement('i'); pre.className = 'pre'; ld.prepend(pre); const im = new Image(); im.onload = () => { pre.style.backgroundImage = `url(${u})`; pre.classList.add('on'); }; im.src = u; } }
  const bar = document.querySelector('#loading i'); const t0 = performance.now();
  try { await loadAll(p => { if (bar) bar.style.width = Math.round(p * 100) + '%'; }); }
  catch (e) { document.querySelector('#loading span').textContent = '불러오기 실패 — 새로고침해 주세요'; throw e; }
  makeIcons(renderer);
  /* 장착한 겉모습 파일만 먼저 받음 (판 안 · 은신처) — 옷장의 나머지는 열 때 */
  grantEarned(S); E.syncPets(S); try { await ensure([...resolve(lookOf(S, { both: true })).files, ...petSpec(resolve({ pet: true, look: S.look }), S.pets?.mong || 1).files]); } catch (e) { console.warn('장착 파일', e); }
  app.loadMs = Math.round(performance.now() - t0); app.assetBytes = A.bytes;
  if (first) setTimeout(app.hideLoading, 6000); else app.hideLoading();   /* 첫 실행은 프롤로그가 걷음 (6초 안전) */
  installBack({ back: () => { if (raid) { ui.toggleBag(false); return true; } if (ui.root.className !== 'scr-hideout') { ui.hideout(); return true; } return false; } });
  initBM(app); ui.hideout();
  app.ready = true; setTimeout(() => app.preloadMaps(), 1500);
  if (app.bot) { const m = await import('./bot.js?v=0.99.19'); m.installBot(app); }
  requestAnimationFrame(frame);
}
/* 시험 훅 */
Object.assign(app, { S: () => S, save, E, CHL, AB, AC, endRaid: () => raid && endRaid(), FACILITIES, A, loadPack,
  mem: () => ({ geo: renderer.info.memory.geometries, tex: renderer.info.memory.textures, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, nodes: (() => { let n = 0; scene.traverse(() => n++); return n; })() }) });
boot();
