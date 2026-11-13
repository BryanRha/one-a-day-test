// 맵 5 '심해 연구소' 장치 · 연출 · 적 · 보스 (M4-B) — map.js(그림) · raid.js(판) 가 부름. 계획(자리)은 plan_lab.js
//  · 수압 문: 열림 7초 → 노란 불 1초(삑삑) → 3초 닫힘(판정 · 총알 막음) → 다시 열림 · 지도 상태(누수 · 봉쇄)가 시간 배수
//  · 배양조: 엄폐물(유리 원통) · 총알 55 피해에 금 → 깨짐(유리 파편 · 물 · 포자 → 이끼 자리 9초 · 40% 포자낭) · 깨지면 총알은 지나감
//  · 빛이끼 번식 자리: 바닥 원 — 서 있으면 느려짐(×0.68) · 빛남(적이 멀리서 봄 · 어둠 속 빛) · 천천히 넓어짐 · 불(조명탄 · 불 웅덩이)에 탐
//  · 관제 터미널 2: 1.6초 승인(소리 큼 · 파수 신호음) → 두 곳 = '파수 반출 해치' 열림 (새 출구 방식)
//  · 적: 포자낭(빛을 따라옴 · 둘레 원 예고 → 포자 터짐 + 이끼 자리 · 불에 약함) · 경비 기계(탐조 부채꼴 · 겨냥 줄 → 수압 탄 · 앞 방패 · 알아채면 경보)
//  · 5장 보스 청록 어미: 덩굴 채찍(줄 경고 → 심장 산호 2초 약점 ×2) · 포자 비(원 4) · 빛 삼키기(60% 아래 · 둘레 큰 원 → 5초 어둠 + 포자낭 2)
import * as THREE from 'three';
import { BOSS } from './data.js?v=0.99.40';
import { PRESS, TANK, MOSS, TERM, BEAM, SPORE } from './data/map_lab.js?v=0.99.40';
import { sfx } from './audio.js?v=0.99.40';
import { glowSprite } from './enemy3d.js?v=0.99.40';
import { flarePools } from './arms.js?v=0.99.40';
import { hazard } from './a11y.js?v=0.99.40'; /* M6-C 색약 보조: 위험 예고 빗금 */

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tv = V(), tq = new THREE.Quaternion(), ts = V(), tm = new THREE.Matrix4(), up = V(0, 1, 0);
export const LAB_KIND = { sporer: 1, warden: 1, mother: 1 };
const M = {}; const mat = (k, f) => M[k] ||= f();
/* ───── 텍스처 (코드로 그림 · 한 번 · 판끼리 같이 씀) ───── */
let MOSS_T = null, SCREEN_T = null;
function mossTex() {
  if (MOSS_T) return MOSS_T; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  let s = 11; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(40,150,120,0.55)'); g.addColorStop(0.7, 'rgba(30,110,96,0.38)'); g.addColorStop(1, 'rgba(20,80,70,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 52, rr = 2 + r() * 7; x.fillStyle = `rgba(${60 + r() * 60 | 0},${200 + r() * 55 | 0},${170 + r() * 60 | 0},${0.35 + r() * 0.45})`; x.beginPath(); x.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, rr, 0, 7); x.fill(); }
  for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 48; x.fillStyle = 'rgba(210,255,240,0.85)'; x.fillRect(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 2, 2); }
  MOSS_T = new THREE.CanvasTexture(c); MOSS_T.colorSpace = THREE.SRGBColorSpace; return MOSS_T;
}
/* '보관 중' 화면 벽 — 목록이 위로 천천히 흐름 (텍스처 밀기) */
function screenTex() {
  if (SCREEN_T) return SCREEN_T; const c = document.createElement('canvas'); c.width = 256; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#04201f'; x.fillRect(0, 0, 256, 512); x.font = "700 15px 'Pretendard', -apple-system, 'Apple SD Gothic Neo', sans-serif"; x.textBaseline = 'top';
  const kinds = ['이름표 상자', '편지 묶음', '사진첩', '축제 등롱', '배표', '열쇠', '일기장', '털실 뭉치', '승차권', '장화 한 짝', '그릇', '라디오'];
  for (let i = 0; i < 26; i++) { const n = 412880 - i * 7 - (i * 13 % 5); x.fillStyle = i % 9 === 4 ? '#ffd88a' : '#7dffd8'; x.globalAlpha = 0.55 + (i % 3) * 0.15;
    x.fillText(`${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}  ${kinds[i % kinds.length]}`, 10, 6 + i * 19.5); x.globalAlpha = 0.45; x.fillStyle = '#7dffd8'; x.fillText('보관 중 · 주인 미확인', 132, 6 + i * 19.5); }
  x.globalAlpha = 1; for (let y = 0; y < 512; y += 3) { x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, y, 256, 1); }
  SCREEN_T = new THREE.CanvasTexture(c); SCREEN_T.colorSpace = THREE.SRGBColorSpace; SCREEN_T.wrapT = THREE.RepeatWrapping; return SCREEN_T;
}

/* ───── 그림 (map.js buildExtras 안) ───── */
export function buildLab(P, statics, group, put, addBox, out, add, own, boxes, tanks) {
  const fx = out.fx = { tanks: [], glassIM: null, liqIM: null, mossIM: null, mossN: 0, terms: [], doors: [] };
  const yel = mat('yel', () => new THREE.MeshLambertMaterial({ color: 0xe0b23a, flatShading: true })), dk = mat('dk', () => new THREE.MeshLambertMaterial({ color: 0x2a3034, flatShading: true })), wh = mat('wh', () => new THREE.MeshLambertMaterial({ color: 0xd8e2e2, flatShading: true }));
  /* 배양조: 받침 · 뚜껑(정적 — 꾸밈 묶음 l_tankbase) + 유리 · 배양액(인스턴스 둘 — 깨지면 크기 0) */
  if (tanks.length) {
    for (const t of tanks) put('l_tankbase', t.x, t.z, t.ry || 0);
    const gg = new THREE.CylinderGeometry(0.78, 0.78, 2.0, 18, 1, true).translate(0, 1.32, 0), lg = new THREE.CylinderGeometry(0.68, 0.68, 1.62, 14, 1).translate(0, 1.16, 0); out.geos.push(gg, lg);
    const gm = own(new THREE.MeshLambertMaterial({ color: 0xbff4ff, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, emissive: 0x0b3036 }));
    const lm = own(new THREE.MeshBasicMaterial({ color: 0x35d8b4, transparent: true, opacity: 0.5, depthWrite: false }));
    fx.glassIM = new THREE.InstancedMesh(gg, gm, tanks.length); fx.liqIM = new THREE.InstancedMesh(lg, lm, tanks.length);
    fx.liqIM.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(tanks.length * 3).fill(1), 3);
    tanks.forEach((t, i) => { tm.makeTranslation(t.x, 0, t.z); fx.glassIM.setMatrixAt(i, tm); fx.liqIM.setMatrixAt(i, tm); fx.tanks.push({ x: t.x, z: t.z, i, box: t.box, hp: TANK.hp, broken: false, crack: 0 }); });
    for (const im of [fx.liqIM, fx.glassIM]) { im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.userData.keepGeo = true; im.renderOrder = 3; group.add(im); }
  }
  /* 빛이끼 자리: 바닥 원판 인스턴스 하나 (지도 자리 + 판 중에 생기는 자리 몫 16) */
  const mn = P.moss.length + 16; fx.mossN = mn;
  { const g = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2); out.geos.push(g); const m = own(new THREE.MeshBasicMaterial({ map: mossTex(), transparent: true, depthWrite: false, color: 0xffffff }));
    fx.mossIM = new THREE.InstancedMesh(g, m, mn); fx.mossIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); fx.mossIM.frustumCulled = false; fx.mossIM.userData.keepGeo = true; fx.mossIM.renderOrder = 1; group.add(fx.mossIM);
    tm.makeScale(0.001, 1, 0.001); for (let i = 0; i < mn; i++) fx.mossIM.setMatrixAt(i, tm); }
  /* 관제 터미널: 몸(꾸밈 묶음 l_term) + 화면(빨강 → 승인되면 초록) + 위 표시등 */
  for (const t of P.terms) { const rm = P.rooms.find(r => r.id === t.room); const ry = Math.atan2(rm.x0 + 8 - t.x, rm.z0 + 8 - t.z);
    put('l_term', t.x, t.z, ry); addBox(t.x, t.z, 0.45, 0.35, 1);
    const sm = own(new THREE.MeshBasicMaterial({ color: 0xff5a3a })); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.46), sm); scr.position.set(t.x + Math.sin(ry) * 0.31, 1.32, t.z + Math.cos(ry) * 0.31); scr.rotation.set(-0.35, ry, 0, 'YXZ'); add(scr);
    const halo = glowSprite(0xff7a5a, 0.5, 1.6); halo.position.set(t.x, 2.05, t.z); add(halo); out.mats.push(halo.material);
    fx.terms.push({ sm, halo }); }
  /* 수압 문: 노랑/검정 틀(정적) + 미닫이 두 짝(움직임) + 위 불 — 판정 상자는 열려 있을 때 꺼둠 */
  for (const d of P.doors) { if (!d.press) continue;
    const g = new THREE.Group(); g.position.set(d.x, 0, d.z); if (d.axis === 'z') g.rotation.y = Math.PI / 2; group.add(g);
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.0, 0.7), yel); post.position.set(s * 2.12, 1.5, 0); g.add(post); for (let k = 0; k < 4; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.72), dk); st.position.set(s * 2.12, 0.4 + k * 0.7, 0); g.add(st); } }
    const top = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.36, 0.76), dk); top.position.y = 3.05; g.add(top);
    const halves = []; for (const s of [-1, 1]) { const h = new THREE.Group(); const pnl = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.7, 0.22), wh); pnl.position.y = 1.4; h.add(pnl);
      const win = new THREE.Mesh(new THREE.CircleGeometry(0.32, 14), mat('win', () => new THREE.MeshBasicMaterial({ color: 0x5fb8c8 }))); win.position.set(0, 1.9, 0.12); h.add(win); const win2 = win.clone(); win2.position.z = -0.12; win2.rotation.y = Math.PI; h.add(win2);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.24), yel); strip.position.y = 0.3; h.add(strip); h.position.x = s * 3.0; g.add(h); halves.push(h); }
    const lampM = own(new THREE.MeshBasicMaterial({ color: 0x7dffb2 })); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), lampM); lamp.position.set(0, 3.35, 0); g.add(lamp);
    g.traverse(o => { if (o.isMesh) o.userData.own = true; });
    const hx = d.axis === 'x' ? 2.0 : 0.4, hz = d.axis === 'x' ? 0.4 : 2.0; const box = { x0: d.x - hx, z0: d.z - hz, x1: d.x + hx, z1: d.z + hz, bullet: 1, off: true, press: true }; boxes.push(box);
    fx.doors.push({ d, g, halves, lampM, box, st: 'open', t: PRESS.open * 0.5 + (d.phase || 0), k: 0 }); }
  return fx;
}

/* 출구 장식 (raid.start 의 exits 안에서) — 비상 계단 · 수압 승강기 · 파수 반출 해치 */
export function labExitDeco(R, e) {
  const g = new THREE.Group(); const own = m => { R.ownMats.push(m); return m; };
  const wh = own(new THREE.MeshLambertMaterial({ color: 0xd8e2e2, flatShading: true })), dk = own(new THREE.MeshLambertMaterial({ color: 0x2a3034, flatShading: true })), yel = own(new THREE.MeshLambertMaterial({ color: 0xe0b23a, flatShading: true }));
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.userData.own = true; g.add(o); return o; };
  if (e.kind === 'early') { for (let i = 0; i < 6; i++) box(2.0, 0.25, 0.55, i % 2 ? wh : dk, 0, 0.12 + i * 0.32, -1.6 - i * 0.5); for (const s of [-1.05, 1.05]) box(0.08, 1.1, 3.3, yel, s, 1.3, -2.8); box(1.0, 0.4, 0.06, own(new THREE.MeshBasicMaterial({ color: 0x3fd07a })), 0, 2.9, -1.5); }
  else if (e.kind === 'power') { for (const [x, z] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) box(0.14, 3.6, 0.14, yel, x, 1.8, z); box(2.8, 0.14, 2.8, dk, 0, 0.07, 0); box(2.8, 0.18, 0.18, yel, 0, 3.6, -1.3); box(2.8, 0.18, 0.18, yel, 0, 3.6, 1.3); box(0.5, 0.5, 0.2, dk, 1.25, 1.2, -1.45); }
  else { /* 반출 해치: 바닥 둥근 해치 + 둘레 표시등 8 + 파수의 눈(호박빛 · 승인되면 초록) */
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.16, 8, 28), yel); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; ring.userData.own = true; g.add(ring);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.12, 24), dk); lid.position.y = 0.16; lid.userData.own = true; g.add(lid); g.userData.lid = lid;
    const eyeM = own(new THREE.MeshBasicMaterial({ color: 0xffb347 })); const post = box(0.3, 2.4, 0.3, dk, 0, 1.2, -2.4); const eye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), eyeM); eye.position.set(0, 2.55, -2.4); eye.userData.own = true; g.add(eye); g.userData.eyeM = eyeM; void post;
    const lm = own(new THREE.MeshBasicMaterial({ color: 0xff5a3a })); g.userData.lm = lm; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const l = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), lm); l.position.set(Math.cos(a) * 1.5, 0.22, Math.sin(a) * 1.5); l.userData.own = true; g.add(l); } }
  return g;
}

/* ───── 판 (raid.js) ───── */
export function labStart(R) {
  const X = R.X.fx, P = R.P;
  const L = R.LB = { tanks: X.tanks, moss: P.moss.map(m => ({ x: m.x, z: m.z, r0: m.r, r: m.r, t: Infinity, room: m.room })), terms: P.terms.map((t, i) => ({ ...t, done: false, v: X.terms[i] })), doors: X.doors, authed: 0, told: {}, spawnN: 0, scr: null, burnT: 0 };
  const kP = R.C.press || 1;
  for (const D of L.doors) D.kp = kP;
  for (const x of R.exits) if (x.term) { x.cond = () => L.authed >= TERM.need; x.why = () => `관제 승인 ${L.authed}/${TERM.need} — 관제 터미널을 켜요`; }
  /* '보관 중' 화면 벽(구역 3 랜드마크): 흐르는 목록 화면 — 꾸밈 계획의 자리에 붙임 */
  const mk = (R.X.dress?.marks || []).find(m => m.k === 'lm_screens');
  if (mk) { const sm = new THREE.MeshBasicMaterial({ map: screenTex(), transparent: true, opacity: 0.92 }); R.ownMats.push(sm); const scr = new THREE.Group();
    for (const [x, y, w, h] of [[-2.25, 2.6, 1.9, 1.5], [0, 2.75, 2.3, 1.8], [2.25, 2.6, 1.9, 1.5], [-1.15, 4.4, 1.8, 1.2], [1.15, 4.4, 1.8, 1.2]]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), sm); p.position.set(x, y - 0.6, 0.62); scr.add(p); }
    scr.position.set(mk.x, 0, mk.z); scr.rotation.y = mk.ry; scr.traverse(o => { if (o.isMesh) o.userData.own = true; }); R.root.add(scr); L.scr = sm; }
  /* 경비 기계: 앞 탐조 빛 부채꼴 (이 안에 들면 바로 들킴 — 탐조 드론과 같은 규칙) */
  for (const e of R.enemies) if (e.kind === 'warden') { const sm = new THREE.MeshBasicMaterial({ color: 0xbff4ff, transparent: true, opacity: 0.15, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const cone = new THREE.Mesh(new THREE.CircleGeometry(7, 18, Math.PI / 2 - 0.3, 0.6), sm); cone.rotation.x = -Math.PI / 2; cone.position.y = 0.18; cone.userData.own = true; e.root.add(cone); e.spot = cone; e.mats.push(sm); }
  const mod = { name: 'lab', pre: dt => labPre(R, dt), tick: dt => labTick(R, dt), near: n => labNear(R, n, mod), act: n => labAct(R, n), pools: o => labPools(R, o), wallHit: (p, d) => labWallHit(R, p, d), kill: e => labKill(R, e) };
  R.mods.push(mod);
}
const inC = (p, c, k = 1) => (p.x - c.x) ** 2 + (p.z - c.z) ** 2 < (c.r * k) ** 2;
/* 주인공 움직임 전: 이끼 자리 = 느려짐 · 빛남 */
function labPre(R, dt) {
  const pl = R.pl, L = R.LB; pl.inMoss = false;
  for (const m of L.moss) if (m.r > 0.5 && inC(pl.pos, m, 0.92)) { pl.inMoss = true; break; }
  if (pl.inMoss) { pl.slowMul *= MOSS.slow; pl.lit = true; if (!L.told.moss) { L.told.moss = 1; R.ui.toast('빛이끼 자리 — 발이 느려지고 내가 빛나요 (불로 태울 수 있어요)', 'soft'); }
    if (pl.moving && R.R() < dt * 6) R.fx.burst(pl.pos.x, 0.2, pl.pos.z, 2, 0x7dffd8, 1.6, 0.06, 0.6, -2); }
}
/* 판 중에 생기는 이끼 자리 (포자 · 깨진 배양조 · 덩굴) */
function addMoss(R, x, z, r, t) { const L = R.LB; const live = L.moss.filter(m => m.r > 0.4).length; if (live >= R.X.fx.mossN) return; L.moss.push({ x, z, r0: r, r: 0.3, grow: r, t, room: -1 }); }
function labTick(R, dt) {
  const L = R.LB, X = R.X.fx, pl = R.pl;
  /* 수압 문 */
  for (const D of L.doors) { D.t -= dt;
    if (D.st === 'open' && D.t <= 0) { D.st = 'warn'; D.t = PRESS.warn; if (Math.hypot(D.d.x - pl.pos.x, D.d.z - pl.pos.z) < 14) { sfx.doorWarn?.((D.d.x - pl.pos.x) / 12); if (!L.told.press) { L.told.press = 1; R.ui.toast('노란 불 — 수압 문이 곧 닫혀요', 'soft'); } } }
    else if (D.st === 'warn' && D.t <= 0) { D.st = 'shut'; D.t = PRESS.shut * D.kp; D.box.off = false; if (Math.hypot(D.d.x - pl.pos.x, D.d.z - pl.pos.z) < 18) sfx.doorShut?.((D.d.x - pl.pos.x) / 12); }
    else if (D.st === 'shut' && D.t <= 0) { D.st = 'open'; D.t = PRESS.open / Math.max(0.6, D.kp); D.box.off = true; if (Math.hypot(D.d.x - pl.pos.x, D.d.z - pl.pos.z) < 18) sfx.doorOpen?.((D.d.x - pl.pos.x) / 12); }
    const want = D.st === 'shut' ? 1 : 0; D.k += (want - D.k) * Math.min(1, dt * (want ? 9 : 4)); D.halves[0].position.x = -1.0 - 2.0 * (1 - D.k); D.halves[1].position.x = 1.0 + 2.0 * (1 - D.k);
    D.lampM.color.setHex(D.st === 'shut' ? 0xff4a30 : D.st === 'warn' ? (Math.sin(R.t * 30) > 0 ? 0xffd040 : 0x553300) : 0x7dffb2); }
  /* 배양조: 금 간 유리는 번쩍임 */
  if (X.glassIM) { let dirty = false; for (const t of L.tanks) if (t.crack > 0) { t.crack = Math.max(0, t.crack - dt * 3); X.liqIM.setColorAt(t.i, tv.setScalar(1 + t.crack * 2)); dirty = true; } if (dirty) X.liqIM.instanceColor.needsUpdate = true;
    X.liqIM.material.opacity = 0.42 + 0.1 * Math.sin(R.t * 2.2); }
  /* 이끼 자리: 천천히 넓어짐 · 생긴 자리는 시간이 지나면 사라짐 · 불에 탐 */
  const fires = [...R.hazards.map(h => ({ x: h.x, z: h.z, r: h.r })), ...flarePools(R)];
  let burned = false;
  for (const m of L.moss) { if (m.r <= 0) continue;
    if (m.grow) { m.r = Math.min(m.grow, m.r + dt * 3); if (m.r >= m.grow) m.grow = 0; }
    else if (m.t === Infinity) m.r = Math.min(m.r0 * MOSS.max, m.r + MOSS.grow * dt * 0.1);
    if (m.t !== Infinity) { m.t -= dt; if (m.t < 1.5) m.r = Math.max(0, m.r - dt * 1.2); }
    for (const f of fires) if (Math.hypot(f.x - m.x, f.z - m.z) < f.r + m.r * 0.8) { m.r = Math.max(0, m.r - MOSS.burn * dt); burned = true; if (R.R() < dt * 10) R.fx.burst(m.x + (R.R() - 0.5) * m.r, 0.3, m.z + (R.R() - 0.5) * m.r, 2, 0xffb347, 2.4, 0.08, 0.5, -3); } }
  if (burned && !L.told.burn) { L.told.burn = 1; R.ui.toast('빛이끼가 타요!', 'good'); }
  for (let i = L.moss.length - 1; i >= 0; i--) if (L.moss[i].r <= 0.05 && L.moss[i].t !== Infinity) L.moss.splice(i, 1);
  if (X.mossIM) { let n = 0; for (const m of L.moss) { if (n >= X.mossN) break; const s = Math.max(0.001, m.r); tq.setFromAxisAngle(up, (m.x * 1.7 + m.z) % 6.28); X.mossIM.setMatrixAt(n++, tm.compose(tv.set(m.x, 0.09 + (n % 5) * 0.002, m.z), tq, ts.set(s, 1, s))); }
    for (; n < X.mossN; n++) X.mossIM.setMatrixAt(n, tm.makeScale(0.001, 1, 0.001)); X.mossIM.instanceMatrix.needsUpdate = true; X.mossIM.material.opacity = 0.8 + 0.2 * Math.sin(R.t * 1.6); }
  /* 터미널 · 반출 해치 표시 */
  for (const t of L.terms) { if (!t.v) continue; t.v.sm.color.setHex(t.done ? 0x7dffb2 : (Math.sin(R.t * 4 + t.i) > 0 ? 0xff5a3a : 0xa02a1a)); t.v.halo.material.color.setHex(t.done ? 0x7dffb2 : 0xff7a5a); }
  for (const x of R.exits) if (x.term && x.deco?.userData.eyeM) { const ok = L.authed >= TERM.need; x.deco.userData.eyeM.color.setHex(ok ? 0x7dffb2 : L.authed ? 0xffd88a : 0xffb347); x.deco.userData.lm.color.setHex(ok ? 0x7dffb2 : 0xff5a3a); if (ok && x.deco.userData.lid) x.deco.userData.lid.position.y = Math.max(-0.4, x.deco.userData.lid.position.y - dt * 0.8); }
  if (L.scr) L.scr.map.offset.y = (L.scr.map.offset.y + dt * 0.035) % 1;
  /* 포자낭: 빛을 따라옴(빛 속 · 이끼 위의 나를 멀리서 알아챔) · 불 웅덩이 · 조명탄 빛에서 탐 / 경비 기계: 알아채면 둘레 경보 */
  const lit = pl.lit || R.inLight(pl.pos);
  L.burnT -= dt; const burnTick = L.burnT <= 0; if (burnTick) L.burnT = 0.5;
  for (const e of R.enemies) { if (e.dead || e.sleep) continue;
    if (e.kind === 'sporer') { const d = e.pos.distanceTo(pl.pos);
      if (lit && !pl.dead && e.state !== 'chase' && d < e.D.sight * e.D.lightSeek && R.los(e.pos, pl.pos)) { e.alert = Math.min(1, e.alert + dt * 1.6); if (e.mark <= 0) { e.mark = 1.2; e.markType = '?'; } }
      if (burnTick) for (const f of fires) if (Math.hypot(f.x - e.pos.x, f.z - e.pos.z) < f.r + 0.4) { R.damage(e, 9 * e.D.fireWeak, tv.set(0, 0, 1), e.pos.clone().setY(1), 0); break; } }
    if (e.kind === 'warden' && e.state === 'chase' && !e.alarmed) { e.alarmed = true; let n = 0; sfx.alarm?.((e.pos.x - pl.pos.x) / 12);
      for (const o of R.enemies) if (o !== e && !o.dead && o.state !== 'chase' && o.pos.distanceTo(e.pos) < e.D.alarm) { o.state = 'investigate'; o.target = pl.pos.clone(); o.alert = Math.max(o.alert, 0.7); o.mark = 1.2; o.markType = '?'; n++; }
      if (!L.told.alarm) { L.told.alarm = 1; R.ui.event(`경비 기계 경보! 둘레 ${e.D.alarm}m 가 알아챘어요${n ? ` (${n})` : ''} — 옆 · 뒤가 약해요`, 'warn'); } } }
  /* 보스 포자 비 예고 원 */
  const B = R.boss; if (B && B.kind === 'mother' && B.rain && B.wind > 0) { const k = 1 - B.wind / B.windMax; for (const r of B.rain) { r.m.scale.setScalar(BOSS.mother.spore.r * (0.3 + 0.7 * k)); r.m.material.opacity = 0.25 + 0.35 * Math.sin(k * 20) ** 2; } }
}
function labNear(R, near, mod) {
  for (const t of R.LB.terms) if (!t.done && Math.hypot(t.x - R.pl.pos.x, t.z - R.pl.pos.z) < 2.3) return { type: 'mod', m: mod, t, label: '관제 터미널 승인' };
  return near;
}
function labAct(R, n) {
  const pl = R.pl; const threat = R.enemies.find(e => !e.dead && e.state === 'chase' && e.pos.distanceTo(pl.pos) < 6);
  if (threat) { R.ui.toast('적이 가까워요 — 먼저 정리하고 승인해요', 'soft'); return; }
  pl.searching = { kind: 'mod', prog: 0, need: TERM.hold, txt: '관제 승인 중…', done: () => authorize(R, n.t) }; sfx.search(); R.noise(pl.pos, 6); pl.anim.play('Interact', { fade: 0.1, speed: 1.2, force: true });
}
function authorize(R, t) {
  const L = R.LB; if (t.done) return; t.done = true; L.authed++; sfx.beacon?.(); R.noise(V(t.x, 0, t.z), TERM.noise); R.shake = Math.max(R.shake, 0.12);
  R.fx.ring(t.x, t.z, 1.6, 0x7dffb2); R.fx.burst(t.x, 1.4, t.z, 10, 0x7dffb2, 3, 0.06, 0.5, -2);
  const ex = R.exits.find(x => x.term); const nm = ex ? ex.name : '반출 해치';
  if (L.authed >= TERM.need) R.ui.event(`파수: "반출 승인." — ${nm}가 열렸어요 (관제실 쪽 초록 빛기둥)`, 'good');
  else R.ui.event(`파수: "반출 요청 ${L.authed}/${TERM.need} 확인." — 남은 터미널 하나 (소리가 컸어요)`, 'good');
}
function labPools(R, out) {
  for (const m of R.LB.moss) if (m.r > 0.6) out.push({ x: m.x, z: m.z, r: m.r * 0.85 });
  for (const t of R.LB.terms) out.push({ x: t.x, z: t.z, r: 1.6 });
}
/* 총알 · 적 탄이 막힌 자리 → 배양조 유리 */
function labWallHit(R, p, dmg) {
  for (const t of R.LB.tanks) { if (t.broken || (p.x - t.x) ** 2 + (p.z - t.z) ** 2 > 1.15 ** 2) continue;
    t.hp -= dmg; t.crack = 1; sfx.glassTick?.(); R.fx.burst(p.x, p.y || 1.2, p.z, 4, 0xdffaff, 3, 0.05, 0.35);
    if (t.hp <= 0) breakTank(R, t); return true; }
  return false;
}
function breakTank(R, t) {
  const X = R.X.fx, L = R.LB; t.broken = true; if (t.box) t.box.bullet = 0;
  X.glassIM.setMatrixAt(t.i, tm.makeScale(0.001, 0.001, 0.001)); X.liqIM.setMatrixAt(t.i, tm.compose(tv.set(t.x, 0, t.z), tq.identity(), ts.set(1, 0.12, 1))); X.glassIM.instanceMatrix.needsUpdate = X.liqIM.instanceMatrix.needsUpdate = true;
  sfx.glass?.(); R.noise(V(t.x, 0, t.z), 14); R.shake = Math.max(R.shake, 0.25);
  R.fx.burst(t.x, 1.4, t.z, 26, 0xdffaff, 7, 0.07, 0.7, 20); R.fx.burst(t.x, 0.9, t.z, 22, 0x35d8b4, 5, 0.1, 0.9, 10); R.fx.ring(t.x, t.z, TANK.spill, 0x9ff0ff); R.fx.ring(t.x, t.z, 2, 0x7dffd8);
  addMoss(R, t.x, t.z, 2.2, TANK.mossT);
  if (!L.told.tank) { L.told.tank = 1; R.ui.toast('배양조가 깨졌어요 — 포자가 쏟아져요', 'warn'); }
  if (R.R() < TANK.burst && L.spawnN < 6) { L.spawnN++; const ad = R.makeEnemy({ kind: 'sporer', x: t.x + 1.2, z: t.z + 1.2, zone: Math.min(3, Math.max(1, R.zone)) }, 3000 + R.enemies.length); R.collide(ad.pos, 0.6);
    if (ad.pos.distanceTo(R.pl.pos) < 11) { ad.state = 'chase'; ad.alert = 1; ad.target = R.pl.pos.clone(); } R.enemies.push(ad); }
}
function labKill(R, e) {
  if (e.kind === 'sporer') { addMoss(R, e.pos.x, e.pos.z, 1.5, 8); R.fx.burst(e.pos.x, 0.9, e.pos.z, 20, 0x7dffd8, 5, 0.08, 0.8, 4); }
  if (e.kind === 'warden') { R.fx.burst(e.pos.x, 1.0, e.pos.z, 22, 0xffb347, 7, 0.1, 0.6, 18); R.fx.burst(e.pos.x, 1.0, e.pos.z, 14, 0x9fe8ff, 6, 0.06, 0.6, 8); }
  if (e.kind === 'mother') { R.fx.burst(e.pos.x, 1.4, e.pos.z, 60, 0x7dffd8, 10, 0.12, 1.1, 8); R.fx.ring(e.pos.x, e.pos.z, 5, 0x7dffd8); for (const m of R.LB.moss) if (m.t === Infinity) m.t = 4 + R.R() * 3; R.ui.toast('청록 어미가 시들어요 — 연구소의 이끼가 빛을 잃어요', 'good'); }
}

/* ───── 적 공격 (raid.enemyAttack 에서) ───── */
export function labAttack(R, e, dist) {
  const D = e.D, pl = R.pl;
  if (e.kind === 'mother') return motherAttack(R, e, dist);
  if (e.kind === 'sporer') { sfx.spore?.((e.pos.x - pl.pos.x) / 12); R.fx.ring(e.pos.x, e.pos.z, D.range, 0x7dffd8); R.fx.burst(e.pos.x, 0.9, e.pos.z, 24, 0x9ffff0, 5, 0.09, 0.7, 2);
    if (dist < D.range + 0.2) { if (e.foe && !e.foe.dead && R.ai) R.ai.strike(e, D.dmg * e.dmgMul); else R.hurt(D.dmg * e.dmgMul, e.pos); }
    addMoss(R, e.pos.x, e.pos.z, SPORE.patch, SPORE.patchT); return true; }
  if (e.kind === 'warden') { const tp = e.foe && !e.foe.dead ? e.foe.pos : pl.pos; const a = e.lockFace != null ? e.lockFace : Math.atan2(tp.x - e.pos.x, tp.z - e.pos.z); const dir = V(Math.sin(a), 0, Math.cos(a));
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.3, 8).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xdffcff })); m.position.set(e.pos.x + dir.x * 0.8, 1.15, e.pos.z + dir.z * 0.8); m.rotation.y = a; R.root.add(m);
    m.add(glowSprite(0x7fd8ff, 0.7, 1.4));
    R.enemyShots.push({ m, dir, sp: BEAM.speed, t: 0, dmg: D.dmg * e.dmgMul, from: e.pos.clone(), r: BEAM.r, src: e, life: D.range / BEAM.speed + 0.1, tele0: R.tele?.t0 }); /* M4-A 예고 검사: 겨냥 줄이 보인 때부터 */
    sfx.beam?.((e.pos.x - pl.pos.x) / 12); R.fx.burst(e.pos.x + dir.x * 0.8, 1.15, e.pos.z + dir.z * 0.8, 8, 0x9fe8ff, 4, 0.06, 0.3, 0, dir); return true; }
  return false;
}
/* 적 공격 예고 (raid 의 일반 적 예고 자리에서): 포자 = 둘레 원 · 수압 탄 = 겨냥 줄 */
export function labWind(R, e, angToP) {
  if (e.D.atk === 'spore') { R.warnDisc(e, e.D.range, 0x7dffd8, true); sfx.sporeWarn?.((e.pos.x - R.pl.pos.x) / 12); }
  else if (e.D.atk === 'beam') { e.lockFace = angToP; R.warnLine(e, e.D.range, 0.7, 0xff6a4a); sfx.beamWarn?.((e.pos.x - R.pl.pos.x) / 12); }
}

/* ───── 5장 보스: 청록 어미 ───── */
export function motherWind(R, e, dist, rage) {
  const pl = R.pl, B = BOSS.mother; const ang = Math.atan2(pl.pos.x - e.pos.x, pl.pos.z - e.pos.z);
  if (e.hp < e.maxHp * B.dim.below && e.pcd <= 0) { e.pat = 'dim'; e.windMax = e.wind = B.dim.wind; e.pcd = B.dim.cd; R.warnDisc(e, B.dim.r, 0x7dffd8, true); e.anim?.play('Taunt', { once: true, fade: 0.05, speed: 1, force: true }); sfx.roar(); }
  else if (dist < B.lash.near) { e.pat = 'lash'; e.windMax = e.wind = B.lash.wind / rage; e.lockFace = ang; e.face = ang; R.warnLine(e, B.lash.len, B.lash.w, 0x7dffd8); e.anim?.play('1H_Melee_Attack_Chop', { once: true, fade: 0.05, speed: 0.75 * rage, force: true }); }
  else { e.pat = 'spore'; e.windMax = e.wind = B.spore.wind; e.rain = [];
    for (let i = 0; i < B.spore.n; i++) { const a = i / B.spore.n * Math.PI * 2 + R.R() * 0.8; const r = i === 0 ? 0 : 2.2 + R.R() * 1.4; const x = pl.pos.x + Math.cos(a) * r, z = pl.pos.z + Math.sin(a) * r;
      const m = new THREE.Mesh(new THREE.CircleGeometry(1, 28), hazard(new THREE.MeshBasicMaterial({ color: 0x7dffd8, transparent: true, opacity: 0.3, depthWrite: false }))); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.23, z); m.scale.setScalar(0.3); R.root.add(m); e.rain.push({ x, z, m }); }
    e.anim?.play('Unarmed_Melee_Attack_Punch_A', { once: true, fade: 0.05, speed: 0.55, force: true }); }
  e.cd = e.D.cd / rage; sfx.warn();
}
function motherAttack(R, e, dist) {
  const pl = R.pl, B = BOSS.mother;
  if (e.pat === 'lash') { const dx = Math.sin(e.lockFace), dz = Math.cos(e.lockFace); sfx.slam(); sfx.lash?.(); R.shake = Math.max(R.shake, 0.6);
    const px = pl.pos.x - e.pos.x, pz = pl.pos.z - e.pos.z, along = px * dx + pz * dz, side = Math.abs(px * dz - pz * dx);
    if (along > 0 && along < B.lash.len + 0.5 && side < B.lash.w / 2 + 0.3) R.hurt(B.lash.dmg, e.pos);
    for (let s = 1.8; s < B.lash.len; s += 2.4) { const x = e.pos.x + dx * s, z = e.pos.z + dz * s; tv.set(x, 0, z); R.collide(tv, 0.2); if (Math.hypot(tv.x - x, tv.z - z) > 0.3) break; R.fx.burst(x, 0.4, z, 10, 0x7dffd8, 5, 0.1, 0.6, 12); if (s > 3) addMoss(R, x, z, 1.2, 6); labWallHit(R, tv.set(x, 1, z), 30); }
    e.weakT = B.weak; e.stun = B.weak * 0.8; R.ui.weak('심장 산호가 드러났어요 — 약점!'); return true; }
  if (e.pat === 'spore') { sfx.spore?.(0); R.shake = Math.max(R.shake, 0.4);
    for (const r of e.rain || []) { R.root.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); R.fx.burst(r.x, 0.6, r.z, 16, 0x9ffff0, 6, 0.1, 0.8, 6); R.fx.ring(r.x, r.z, B.spore.r, 0x7dffd8); addMoss(R, r.x, r.z, B.spore.patch, B.spore.patchT);
      if ((pl.pos.x - r.x) ** 2 + (pl.pos.z - r.z) ** 2 < B.spore.r ** 2) R.hurt(B.spore.dmg, tv.set(r.x, 0, r.z)); }
    e.rain = null; return true; }
  if (e.pat === 'dim') { R.douse = B.dim.dark; sfx.roar(); R.shake = Math.max(R.shake, 0.5); R.fx.ring(e.pos.x, e.pos.z, B.dim.r, 0x7dffd8);
    R.ui.event('청록 어미가 빛을 삼켰어요 — 5초 어둠 · 포자낭이 몰려와요', 'boss');
    for (let k = 0; k < B.dim.adds; k++) { const a = R.R() * 6.28; const ad = R.makeEnemy({ kind: 'sporer', x: e.pos.x + Math.cos(a) * 3.2, z: e.pos.z + Math.sin(a) * 3.2, zone: 3 }, 2000 + R.enemies.length); ad.state = 'chase'; ad.alert = 1; ad.target = pl.pos.clone(); R.collide(ad.pos, 0.6); R.enemies.push(ad); }
    return true; }
  return true;
}
export const labLook = { bg: 0x061518, hemi: [1.0, 0xa8e8e4, 0x14262a], sun: [0.95, 0xd8f6ff] };
