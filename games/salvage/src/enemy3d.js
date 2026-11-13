// 적 · 보스 전용 모델 (v0.5.x · tools/enemy3d) — 지도 묶음과 같이 늦게 받음(enemy_<지도>.glb)
//  · 보스 3: 수문지기(gate) · 갈고리 선장(captain) · 터널 장어(eel) — 뼈 + 동작(KayKit 동작 이름 그대로 → raid.js 재생 코드 그대로)
//  · 일반: 드론 3종(지도별) · 집게 게 · 전기 해파리 — 뼈 이름 = 예전 코드 모델 부위(body · rotor · leg · claw · tent) → raid.js 의 움직임 코드 그대로
//  · 해골 계열: KayKit 몸 + 빛이끼 부착물을 한 메시로 구움(att_<변형>) — 동작은 skel.glb 것을 뼈 이름으로
//  · 재질: pal(빛 받음 · 맞으면 번쩍) · glow(빛남) · eye(게임이 색을 바꾸는 빛 = 약점 · 눈빛 · 코어). 모두 정점 색 → 적 하나 = 그리기 2~3번
//  · 받기 전이면 null → raid.js 가 예전 모델로 그림(안전망)
import * as THREE from 'three';
import { GLTFLoader } from '../lib/GLTFLoader.js?v=0.99.40';
import { MeshoptDecoder } from '../lib/meshopt_decoder.module.js?v=0.99.40';
import * as SkeletonUtils from '../lib/SkeletonUtils.js?v=0.99.40';
import { A } from './assets.js?v=0.99.40';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
export const EN = { tpl: {}, packs: {}, bytes: 0 };
const FILES = { ware: 'enemy_ware.glb', harbor: 'enemy_harbor.glb', tunnel: 'enemy_tunnel.glb', factory: 'enemy_factory.glb', lab: 'enemy_lab.glb', gate: 'enemy_gate.glb' }; /* M5-A 대수문 꼭대기 = 파수 + 연구소 묶음(경비 기계 · 드론) */
/* 해골 계열 몸 키: 종류 → 부착물 (지도마다 물먹은 · 젖은 선원 · 물때) */
const SKEL = { skel: m => 'att_' + m, lamp: () => 'att_lamp', miner: () => 'att_miner', sniper: () => 'att_sniper' /* M4-A 등대 저격수 */ };
/* 예전 KayKit 몸의 보이는 크기 그대로 (fitHeight 가 투구 · 두건까지 쟀던 값) */
const SKEL_SCALE = { att_ware: 1.8 / 2.166, att_harbor: 1.8 / 2.166, att_tunnel: 1.8 / 2.166, att_lamp: 1.8 / 2.308, att_miner: 1.95 / 2.59, att_factory: 1.8 / 2.166, att_lab: 1.8 / 2.166 };
const COMMON = 'm4'; /* M4-A 새 적 5 + 검은 닻 두목 — 어느 지도든 같이 받음 (enemy_m4.glb) */
const OLD = typeof location !== 'undefined' && /oldenemy/.test(location.search);
const DRONE = { ware: 'drone_w', harbor: 'drone_h', tunnel: 'drone_t', factory: 'drone_f', lab: 'drone_l', gate: 'drone_l' };
const ANCHOR = { raider: 1, brute: 1, bomber: 1 };
const LABK = { sporer: 1, warden: 1, mother: 1 }; /* M4-B 연구소 적 · 보스 */ /* M3-B 검은 닻 (쥐 · 오소리 · 흰족제비) — 뼈 + 동작 모델 */

/* 보스 화면 배율 (v0.5.2 · 대표 '의견대로') — 보이는 모델만 키움. 판정 반지름 · 패턴 거리 · 예고 원 · 밸런스는 그대로
 *  수문지기 1.4: 이미 어깨가 넓은 덩치 → 조금만 키워도 방을 누름 (1.5면 팔이 주인공 쪽 예고 원 밖까지 덮음)
 *  갈고리 선장 1.5: 마른 뼈 실루엣 + 밤 화면 → 키가 주인공 1.7배여도 위에서 보면 얇아 보스 같지 않음 = 가장 크게
 *  터널 장어 1.3: 몸이 이미 6m 넘게 길어 → 굵기만 살짝 (더 키우면 꼬리가 방 벽을 뚫고 나감) */
export const BOSS_VIS = { boss: 1.4, captain: 1.5, eel: 1.3, smelter: 1.3, mother: 1.2 }; /* 쇳물 감독관 1.3: 국자 팔이 이미 옆으로 넓음 (더 키우면 붓기 줄 시작점이 몸 밖) */
BOSS_VIS.chief = 1.2; /* M4-A 검은 닻 두목: 이미 둥근 거구 + 닻 */
BOSS_VIS.pasu = 1.25; /* M5-A 최종 파수: 설계 키 3.6m × 1.25 = 주인공의 약 3배 (팔 끝 수문 판이 무대 폭 3할) */
export const bossVis = kind => (typeof location !== 'undefined' && /bossbase/.test(location.search)) ? 1 : BOSS_VIS[kind] || 1; /* ?bossbase = 설계 크기(전/후 비교) */
/* 빛 스프라이트 텍스처 (하양 → 투명 원). 지도 없는 SpriteMaterial 은 네모로 그려짐 → 빛 스프라이트는 꼭 이걸 씀 (v0.5.2 하얀 네모 버그) */
let glowT = null;
export function glowTex() {
  if (glowT) return glowT; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); glowT = new THREE.CanvasTexture(c); glowT.colorSpace = THREE.SRGBColorSpace; glowT.userData.shared = true; return glowT;
}
export const glowSprite = (color, opacity, scale) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.setScalar(scale); return s; };

export const enemyReady = m => (!FILES[m] || EN.packs[m] === true) && (EN.packs[COMMON] === true || EN.packs[COMMON] === null) && (m !== 'gate' || EN.packs.lab === true || EN.packs.lab === null); /* 공용 묶음을 못 받으면 코드 도형으로 */
export function loadEnemyPack(m) { return Promise.all([loadOne(m), loadOne(COMMON), ...(m === 'gate' ? [loadOne('lab')] : [])]).then(() => {}); } /* M4-A: 지도 묶음 + 공용(새 적 · 두목) · M5-A 대수문은 연구소 묶음도 */
function loadOne(m) {
  const file = m === COMMON ? 'enemy_m4.glb' : FILES[m]; if (!file) return Promise.resolve();
  if (EN.packs[m]) return EN.packs[m] === true ? Promise.resolve() : EN.packs[m];
  const job = new Promise((res, rej) => loader.load('assets/' + file, res, e => { if (e.lengthComputable && e.loaded >= e.total) EN.bytes += e.total; }, rej)).then(g => {
    for (const holder of [...g.scene.children]) prep(holder, g.animations);
    EN.packs[m] = true;
  });
  EN.packs[m] = job; job.catch(e => { console.warn('적 모델', m, e); EN.packs[m] = null; });
  return job;
}
function prep(holder, anims) {
  const key = holder.name; const x = holder.userData || {}; const meta = x.meta || {};
  const jelly = key === 'jelly';
  const pal = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: jelly, opacity: jelly ? 0.82 : 1 });
  const glow = new THREE.MeshBasicMaterial({ vertexColors: true });
  const eye = new THREE.MeshBasicMaterial({ vertexColors: true, color: meta.eye ? +meta.eye : 0xffffff });
  const M = { pal, glow, eye };
  holder.traverse(o => { if (!o.isMesh) return; const n = o.material.name; o.material = M[n] || pal; o.userData.keepGeo = true; o.userData.mat = n; o.frustumCulled = false; o.castShadow = n === 'pal' && !jelly; o.receiveShadow = false; });
  holder.position.set(0, 0, 0);
  /* 한 파일에 같은 뼈 이름(body · root · KayKit 뼈)이 여러 모델에 있으면 GLTFLoader 가 '_1' 을 붙임 → 모델 안에서는 원래 이름으로 (동작 트랙도) */
  const un = n => n.replace(/_\d+$/, '');
  holder.traverse(o => { if (o.isBone) o.name = un(o.name); });
  const clips = {}; for (const a of anims) { const [k, n] = a.name.split('|'); if (k === key) { const c = a.clone(); c.name = n; for (const t of c.tracks) { const i = t.name.lastIndexOf('.'); t.name = un(t.name.slice(0, i)) + t.name.slice(i); } clips[n] = c; } }
  EN.tpl[key] = { root: holder, clips, meta, kind: x.kind };
}
function clone(key) {
  const T = EN.tpl[key]; if (!T) return null;
  const root = SkeletonUtils.clone(T.root); const mats = {};
  root.traverse(o => { if (o.isMesh) { const n = o.userData.mat; o.material = mats[n] ||= o.material.clone(); if (o.material.emissive) o.material.emissive.setRGB(0, 0, 0); } });
  const bone = n => root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(n)); /* GLTFLoader 가 이름의 '.' 을 뺌 */
  return { root, mats, bone, T };
}
const blobGeo = new THREE.CircleGeometry(0.55, 16);
function blobShadow(g, color = 0, op = 0.35, add = false) {
  const m = new THREE.Mesh(blobGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.14; m.userData.keepGeo = true; g.add(m); return m;
}
const list = c => [c.mats.pal, c.mats.glow, c.mats.eye].filter(Boolean);

/* 종류 · 지도 → 예전 코드 모델과 같은 모양의 묶음 (없으면 null) */
export function enemyBody(kind, map, elite) {
  if (OLD) return null; /* ?oldenemy = 예전 모델 (전/후 비교 캡처) */
  if (kind === 'drone') {
    const c = clone(DRONE[map] || 'drone_w'); if (!c) return null;
    if (elite) c.mats.pal.color.setRGB(1, 0.62, 0.55);
    const g = new THREE.Group(); g.add(c.root); blobShadow(g);
    return { custom: true, root: g, body: c.bone('body'), eyeM: c.mats.eye, rotors: [c.bone('rotor.l'), c.bone('rotor.r')], mats: list(c), gun: null };
  }
  if (kind === 'crab') {
    const c = clone('crab'); if (!c) return null;
    if (elite) c.mats.pal.color.setRGB(0.72, 0.5, 0.48);
    return { custom: true, root: c.root, body: c.bone('body'), legs: [0, 1, 2, 3, 4, 5].map(i => c.bone('leg' + i)), claws: [c.bone('claw.r'), c.bone('claw.l')], mats: list(c) };
  }
  if (kind === 'jelly') {
    const c = clone('jelly'); if (!c) return null;
    if (elite) c.mats.pal.color.setRGB(1.0, 0.75, 1.25);
    const g = new THREE.Group(); g.add(c.root); blobShadow(g, elite ? 0x8a7dff : 0x6fd8ff, 0.18, true);
    return { custom: true, root: g, body: c.bone('body'), tents: [0, 1, 2, 3, 4, 5].map(i => c.bone('tent' + i)), coreM: c.mats.eye, mats: list(c) };
  }
  if (kind === 'eel') {
    const c = clone('eel'); if (!c) return null;
    const segs = []; for (let i = 0; i < 11; i++) { const t = i * 0.6 / 6.4; segs.push({ m: c.bone('seg' + i), p: new THREE.Vector3(), r: 0.56 * (1 - t ** 1.4 * 0.85) }); }
    return { custom: true, boss: true, root: c.root, segs, glowM: c.mats.eye, finM: c.mats.glow, jaw: c.bone('jaw'), mats: list(c), meta: c.T.meta };
  }
  if (LABK[kind]) { /* M4-B 포자낭 · 경비 기계 · 청록 어미: 뼈 + 동작(KayKit 이름) · eye = 포자 주머니 · 렌즈 · 심장 산호 */
    const c = clone(kind); if (!c) return null; if (elite) c.mats.pal.color.setRGB(0.85, 0.95, 1.05);
    const g = new THREE.Group(); g.add(c.root); if (kind !== 'mother') blobShadow(g, kind === 'sporer' ? 0x7dffd8 : 0, kind === 'sporer' ? 0.2 : 0.32, kind === 'sporer');
    return { custom: true, boss: kind === 'mother', key: kind, root: g, clips: c.T.clips, scale: 1, mats: list(c), eyeM: c.mats.eye, meta: c.T.meta, chest: c.bone('core') || c.bone('body'), head: c.bone('head') };
  }
  if (kind === 'pasu') { /* M5-A 최종 파수: 뼈 + 동작(KayKit 이름 + Sweep) · glow = 렌즈 · 빛줄 · 화면(단계마다 색) · eye = 가슴 장어 코어(약점) */
    const c = clone('pasu'); if (!c) return null; const g = new THREE.Group(); g.add(c.root); blobShadow(g, 0, 0.4).scale.setScalar(2.6);
    return { custom: true, boss: true, key: kind, root: g, clips: c.T.clips, scale: 1, mats: list(c), eyeM: c.mats.eye, glowM: c.mats.glow, meta: c.T.meta, chest: c.bone('core'), head: c.bone('head'), ring: c.bone('ring') };
  }
  if (kind === 'mine' || kind === 'hermit' || kind === 'octo') { /* M4-A 기뢰 · 소라게 · 문어: 뼈 이름 = foes.js 도형과 같음 (body · door · leg0~5 · claw · tent0~5) */
    const c = clone(kind); if (!c) return null; if (elite) c.mats.pal.color.setRGB(0.85, 0.7, 0.68);
    const g = new THREE.Group(); g.add(c.root); blobShadow(g, kind === 'octo' ? 0x2a1a40 : 0, kind === 'octo' ? 0.25 : 0.32);
    return { custom: true, root: g, body: c.bone('body'), door: c.bone('door'), legs: [0, 1, 2, 3, 4, 5].map(i => c.bone('leg' + i)).filter(Boolean), claws: [c.bone('claw.r'), c.bone('claw.l')].filter(Boolean), tents: [0, 1, 2, 3, 4, 5].map(i => c.bone('tent' + i)).filter(Boolean), eyeM: c.mats.eye, mats: list(c), meta: c.T.meta };
  }
  if (kind === 'signal') { const c = clone('signal'); if (!c) return null; if (elite) c.mats.pal.color.setRGB(0.8, 0.78, 0.86); const g = new THREE.Group(); g.add(c.root); blobShadow(g, 0, 0.32);
    return { custom: true, boss: false, key: kind, root: g, clips: c.T.clips, scale: 1, mats: list(c), eyeM: c.mats.eye, meta: c.T.meta, chest: c.bone('chest') }; }
  if (ANCHOR[kind]) { /* 검은 닻: 쉬는 자세 = 무기 든 자세 · 동작 이름 KayKit 식 + Aim · Shoot · Crouch */
    const c = clone(kind); if (!c) return null; if (elite) c.mats.pal.color.setRGB(0.8, 0.78, 0.86);
    const g = new THREE.Group(); g.add(c.root); blobShadow(g, 0, 0.32);
    return { custom: true, boss: false, key: kind, root: g, clips: c.T.clips, scale: 1, mats: list(c), eyeM: c.mats.eye, meta: c.T.meta, chest: c.bone('chest') };
  }
  const key = kind === 'boss' ? 'gate' : kind === 'captain' ? 'captain' : kind === 'smelter' ? 'smelter' : kind === 'chief' ? 'chief' : SKEL[kind]?.(map);
  if (!key) return null;
  const c = clone(key); if (!c) return null;
  const att = c.T.kind === 'attach';
  /* 수문지기 약점: 가슴 보관함 안쪽 빛 (뒤판 앞 · 이름표 뒤 판 + 문 앞 빛 테) — 평소엔 숨김, 약점 때 문이 열리며 켜짐 */
  let weak = null; const chest = c.bone('chest');
  if ((key === 'gate' || key === 'smelter') && chest) { const sm = key === 'smelter'; /* 쇳물 감독관: 가슴 용광로 문 안 (같은 규칙 · 같은 빛) */
    const pm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(sm ? 0.78 : 0.68, sm ? 0.66 : 0.56), pm); plate.position.set(0, sm ? 0.1 : 0.11, sm ? 0.9 : 0.718); chest.add(plate);
    const halo = glowSprite(0xffd890, 0, 1.6); halo.position.set(0, sm ? 0.1 : 0.11, sm ? 1.02 : 0.86); chest.add(halo);
    weak = { g: [plate, halo], plateM: pm, haloM: halo.material, k: 0 }; plate.visible = halo.visible = false;
  }
  if (att && elite) c.mats.pal.color.setRGB(0.82, 0.76, 0.7);
  const clips = att ? Object.fromEntries((A.skel?.animations || []).map(a => [a.name, a])) : c.T.clips;
  return { custom: true, boss: !att, key, root: c.root, clips, scale: att ? SKEL_SCALE[key] : key === 'gate' ? 0.93 : key === 'smelter' || key === 'chief' ? 1.0 : 1.05, /* 보스: 저작 크기 그대로(양자화된 피부 메시는 fitHeight 로 못 잼) */ mats: list(c), eyeM: c.mats.eye, meta: c.T.meta,
    lantern: c.bone('lantern'), hook: c.bone('hook'), core: c.bone('core'), chest, head: c.bone('head'), door: c.bone('door'), weak };
}

/* 매 프레임 덧붙임 (raid.js 의 움직임 코드 다음) — 예고 자세 · 약점 빛 · 맞음 · 기절 · 쓰러짐. 판정 · 시간에는 손대지 않음 */
const tc = new THREE.Color();
export function enemyTick(e, dt, R) {
  const c = e.custom; if (!c) return;
  const hit = e.flash > 0 ? 1 : 0;
  if ((e.kind === 'sniper' || e.kind === 'signal') && c.eyeM) { /* M4-A 저격수 렌즈 · 신호탄 총구: 예고 때 깜빡 */ const k = e.wind > 0 ? 1 : 0; if (e.dead) c.eyeM.color.setHex(0x221a18); else if (k) c.eyeM.color.setRGB(1, 0.25 + 0.6 * Math.sin(e.t * 40) ** 2, 0.2); else c.eyeM.color.setRGB(0.9, 0.55, 0.35); return; }
  if (e.kind === 'chief' && c.eyeM) { /* M4-A 두목 등의 장어 코어: 평소 청록 맥박 · 약점(닻이 박힘) = 하얗게 크게 · 쓰러지면 꺼짐 */
    if (e.dead) { c.eyeM.color.lerp(tc.setHex(0x1a2a26), Math.min(1, dt * 2)); return; }
    if (e.weakT > 0) c.eyeM.color.setRGB(1, 1, 0.85 + 0.15 * Math.sin(e.t * 14)); else c.eyeM.color.setRGB(0.4, 0.9 + 0.1 * Math.sin(e.t * 3), 0.75);
    if (c.core) c.core.scale.setScalar(e.weakT > 0 ? 1.2 + 0.06 * Math.sin(e.t * 14) : 1); if (hit && c.chest) c.chest.rotation.x += 0.1; return; }
  if (e.kind === 'raider' && c.eyeM) { /* 총구 등: 겨냥 예고 때 빨갛게 깜빡 */ const k = e.wind > 0 ? 1 - e.wind / (e.windMax || 1) : 0; if (e.dead) c.eyeM.color.setHex(0x221a18); else if (k > 0) c.eyeM.color.setRGB(1, 0.2 + 0.6 * Math.sin(e.t * 50) ** 2, 0.15); else c.eyeM.color.setRGB(0.6, 0.25, 0.2); return; }
  if (LABK[e.kind]) { /* M4-B: 예고 = eye 가 밝게 깜빡 · 약점(어미 심장 산호) = 하얗게 맥박 · 쓰러짐 = 꺼짐 */
    const base = e.kind === 'warden' ? [1, 0.3, 0.2] : [0.5, 1, 0.85];
    if (e.dead) { c.eyeM.color.lerp(tc.setHex(0x1a2a28), Math.min(1, dt * 2)); return; }
    const k = e.wind > 0 ? 1 - e.wind / (e.windMax || 1) : 0;
    if (e.weakT > 0) c.eyeM.color.setRGB(1, 1, 0.8 + 0.2 * Math.sin(e.t * 14));
    else if (k > 0) { const f = 0.6 + 0.4 * Math.sin(e.t * 40) ** 2; c.eyeM.color.setRGB(Math.min(1, base[0] * (0.6 + f)), Math.min(1, base[1] * (0.6 + f)), Math.min(1, base[2] * (0.6 + f))); }
    else { const p = 0.7 + 0.15 * Math.sin(e.t * 2.4); c.eyeM.color.setRGB(base[0] * p, base[1] * p, base[2] * p); }
    if (e.kind === 'mother' && c.chest) c.chest.scale.setScalar(e.weakT > 0 ? 1.25 + 0.06 * Math.sin(e.t * 14) : 1);
    if (hit && c.chest && e.kind !== 'mother') c.chest.rotation.x += 0.1; return;
  }
  if (e.kind === 'boss' || e.kind === 'smelter') {
    if (e.dead) { c.eyeM.color.lerp(tc.setHex(+c.meta.eyeDead), Math.min(1, dt * 1.5)); if (c.weak) c.weak.g[0].visible = c.weak.g[1].visible = false; return; }
    const k = e.wind > 0 ? 1 - e.wind / (e.windMax || 1) : 0; /* 예고: 둥근 창이 점점 밝게 깜빡임 */
    if (k > 0) c.eyeM.color.setRGB(1, 0.3 + 0.6 * k * (0.5 + 0.5 * Math.sin(e.t * 40)), 0.15 + 0.4 * k); else c.eyeM.color.setRGB(1, 0.24 + 0.08 * Math.sin(e.t * 3), 0.16);
    /* 약점(내려찍은 직후): 보관함 문이 열리고 안이 하얗게 맥박 — 선장 등불 렌즈와 같은 색 · 같은 맥박 */
    const W = c.weak; if (W) { const on = e.weakT > 0; W.k = on ? Math.min(1, W.k + dt * 7) : Math.max(0, W.k - dt * 3);
      const vis = W.k > 0.01; W.g[0].visible = W.g[1].visible = vis;
      if (vis || W.wasOpen) { if (c.door) c.door.rotation.y = vis ? -1.75 * W.k : 0; W.wasOpen = vis; }
      if (vis) { const pz = 0.75 + 0.25 * Math.sin(e.t * 14); W.plateM.color.setRGB(1, 1, pz); W.plateM.opacity = 0.95 * W.k; W.haloM.opacity = 0.75 * W.k; W.g[1].scale.setScalar(1.6 * (1 + 0.12 * Math.sin(e.t * 14))); } }
    if (hit && c.chest) c.chest.rotation.x += 0.12;
    return;
  }
  if (e.kind === 'captain') {
    if (e.dead) { c.eyeM.color.lerp(tc.setHex(+c.meta.eyeDead), Math.min(1, dt * 2)); return; }
    /* 약점(내려찍은 뒤): 등불 렌즈가 하얗게 · 크게 맥박 / 등불 끄기 예고: 깜빡임 */
    if (e.weakT > 0) c.eyeM.color.setRGB(1, 1, 0.75 + 0.25 * Math.sin(e.t * 14));
    else if (e.wind > 0 && e.pat === 'douse') c.eyeM.color.setRGB(1, 0.5 + 0.4 * Math.sin(e.t * 30) ** 2, 0.3);
    else c.eyeM.color.setRGB(1, 0.72, 0.38);
    if (c.lantern) c.lantern.scale.setScalar(e.weakT > 0 ? 1.25 + 0.08 * Math.sin(e.t * 14) : 1);
    /* 갈고리가 날아가는 동안 팔 끝 갈고리를 숨김 */
    if (c.hook) c.hook.scale.setScalar(R.enemyShots.some(s => s.hook === e) ? 0.001 : 1);
    if (hit && c.chest) c.chest.rotation.x += 0.12;
    return;
  }
  if (e.kind === 'eel') {
    const h = e.l.segs[0].m, jaw = c.jaw;
    if (e.dead) { e.roll = Math.min(Math.PI * 0.9, (e.roll || 0) + dt * 2.2); for (const sg of e.l.segs) sg.m.rotation.z = e.roll; c.glowM.color.lerp(tc.setHex(+c.meta.eyeDead), Math.min(1, dt * 2)); c.finM.color.lerp(tc.setHex(0x30443c), Math.min(1, dt * 2)); return; }
    const k = e.wind > 0 ? 1 - e.wind / (e.windMax || 1) : 0; let rear = 0, open = 0.05, tilt = 0, fin = 1;
    if (e.charging) { open = 0.55; rear = 0.05; fin = 1.6; }
    else if (e.stun > 0) { rear = -0.3; open = 0.35; tilt = 0.45; fin = 0.35; }
    else if (k > 0 && e.pat === 'charge') { rear = 0.5 * k; open = 0.7 * k; }
    else if (k > 0) { fin = 1 + 1.5 * Math.sin(e.t * 45) ** 2 * k; rear = 0.15 * k; for (let i = 1; i < e.l.segs.length; i++) e.l.segs[i].m.position.x += Math.sin(e.t * 60 + i) * 0.04 * k; }
    h.position.y += rear * 0.8; h.rotation.x = -rear * 0.7 - hit * 0.2; h.rotation.z = tilt; if (jaw) jaw.rotation.x = open;
    c.finM.color.setRGB(Math.min(1, 0.6 * fin), Math.min(1, fin), Math.min(1, fin));
    return;
  }
}

/* 약점 자리 (세계 좌표) — '약점!' 숫자 · ★ 표시를 커진 모델의 약점 위에 띄움. 없으면 null */
const wp = new THREE.Vector3();
export function weakPoint(e) {
  const c = e.custom; if (!c) return null;
  if (e.kind === 'chief') return c.core ? c.core.getWorldPosition(wp) : null; /* M4-A */
  if (e.kind === 'pasu') return c.chest ? c.chest.getWorldPosition(wp) : null; /* M5-A 가슴 장어 코어 */
  const o = e.kind === 'boss' || e.kind === 'smelter' || e.kind === 'mother' ? c.chest : e.kind === 'captain' ? c.lantern : e.kind === 'eel' ? c.segs?.[5]?.m : null;
  return o ? o.getWorldPosition(wp) : null;
}
