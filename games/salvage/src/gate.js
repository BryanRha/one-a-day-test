// 6장 최종 무대 '대수문 꼭대기' · 최종 보스 '파수' (M5-A · v0.8) — map.js(그림) · raid.js(판) 가 부름 · 배치는 plan_gate.js · 숫자는 data/map_gate.js
//  무대: 승강로 → 대수문 계단 → 꼭대기(16 × 32m, 사방이 난간 · 아래는 10m 낭떠러지 수문 벽 · 양옆으로 이어지는 대수문 마루 · 북쪽 수문 탑 · 검은 닻 깃발 · 장어 코어 굵은 관)
//  파수 = 대수문 관제 코어 방어체 (거의 움직이지 않고 돌기만) — 무대에 들어서면(z < 29.5) 깨어남
//   패턴 6 (모두 예고): 수문 팔 내려치기(줄 → 박혀 약점) · 수압 탄 부채(겨냥 줄 5) · 기억 비(떨어질 자리 원) · 수문 닫기(무대 반쪽 붉은 칸) · 해일 경보(무대 전체 붉게 → 빛나는 원 안) · 수리 드론 부르기(단계 바뀜)
//   단계 3 · 바뀜 2 (66% · 33%): 바뀌는 동안 무적(푸른 막) · 체력 바닥(hpFloor)이 다음 문턱이라 한 방에 건너뛰지 않음 → 바뀜은 늘 2번
//  큰 공격 피해는 모두 raid.enemyAttack 안(예고 시간 = this.tele)에서 → '예고 없는 큰 피해' 검사 0
import * as THREE from 'three';
import { BOSS } from './data.js?v=0.99.17';
import { sfx } from './audio.js?v=0.99.17';
import { glowSprite } from './enemy3d.js?v=0.99.17';
import { GATE_ARENA as AR } from './plan_gate.js?v=0.99.17';
import { hazard } from './a11y.js?v=0.99.17'; /* M6-C 색약 보조: 위험 예고 빗금 */

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tv = V();
export const GATE_KIND = { pasu: 1 };
export const gateLook = { bg: 0x0a1620, hemi: [1.0, 0x9fc4d8, 0x18222c], sun: [0.95, 0xc8dcff] };
const LENS = [[1, 0.42, 0.18], [0.4, 1, 0.9], [1, 0.22, 0.18]]; /* 단계마다 렌즈 · 빛줄 · 화면 색 (호박 → 청록 → 빨강) · 쓰러지면 다시 호박 */
/* M6-B 보스전 화면: 카메라 기준점을 주인공 → 파수 쪽으로(CAM_K) · 알림 상자 · 체력 줄 자리 바꿈(m6b.css · #frame.m6boss) */
const CAM_K = 0.4, CAM_MAX = 5.2;
if (typeof document !== 'undefined' && !document.getElementById('cssM6b')) { const l = document.createElement('link'); l.id = 'cssM6b'; l.rel = 'stylesheet'; l.href = new URL('./m6b.css', import.meta.url).href; document.head.appendChild(l); }
function bossHud(R, on) { R.camBias = on ? (R.camBias || { x: 0, z: 0 }) : null; if (typeof document !== 'undefined') document.getElementById('frame')?.classList.toggle('m6boss', !!on); }
const PH_TXT = ['', '파수 2단계 — 보관 목록이 빛으로 쏟아져요 · 수문 닫기를 조심해요', '파수 3단계 — 해일 경보! 붉은 바닥이면 빛나는 원 안으로 · 가슴 코어가 더 약해졌어요'];

/* ───── 그림 (map.js build 안 — 정적인 것은 합쳐짐) ───── */
export function buildGate(P, statics, group, put, addBox, out, add, own) {
  const conc = own(new THREE.MeshLambertMaterial({ color: 0x5c6462, flatShading: true })), concD = own(new THREE.MeshLambertMaterial({ color: 0x3a4142, flatShading: true }));
  const rust = own(new THREE.MeshLambertMaterial({ color: 0x7a3f24, flatShading: true })), steel = own(new THREE.MeshLambertMaterial({ color: 0x4a5257, flatShading: true }));
  const yel = own(new THREE.MeshLambertMaterial({ color: 0xd8a830, flatShading: true })), blk = own(new THREE.MeshLambertMaterial({ color: 0x1e2124, flatShading: true }));
  const teal = own(new THREE.MeshBasicMaterial({ color: 0x5fe6d8 })), ember = own(new THREE.MeshBasicMaterial({ color: 0xff8a3a })), cloth = own(new THREE.MeshLambertMaterial({ color: 0x1a1b1f, side: THREE.DoubleSide }));
  const geos = []; const box = (w, h, d) => { const g = new THREE.BoxGeometry(w, h, d); geos.push(g); return g; };
  const S = (g, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.rotation.y = ry; o.userData.zone = z < 32 ? 3 : 2; statics.add(o); return o; };
  const x0 = AR.x0, x1 = AR.x1, zEnd = 64;
  /* 수문 벽면: 무대 · 계단 · 승강로 둘레가 10m 아래 바다로 떨어짐 (양옆 · 카메라 쪽) */
  S(box(0.7, 10, zEnd), conc, x0 - 0.35, -5, zEnd / 2); S(box(0.7, 10, zEnd), conc, x1 + 0.35, -5, zEnd / 2); S(box(x1 - x0 + 1.4, 10, 0.7), conc, (x0 + x1) / 2, -5, zEnd + 0.35);
  for (let z = 4; z < zEnd; z += 8) { S(box(0.3, 9.6, 0.5), concD, x0 - 0.75, -5, z); S(box(0.3, 9.6, 0.5), concD, x1 + 0.75, -5, z); } /* 벽면 세로 이음 */
  /* 대수문 마루: 무대(위 두 칸) 양옆으로 길게 · 조금 낮게 · 난간 기둥 · 경고 띠 */
  for (const [cx, w] of [[x0 - 36, 72], [x1 + 36, 72]]) { S(box(w, 1.2, 15), conc, cx, -0.9, 8); S(box(w, 10, 0.6), concD, cx, -6, 15.4); S(box(w, 0.08, 0.5), yel, cx, -0.28, 15.0); }
  const postG = box(0.12, 1.1, 0.12);
  for (let x = x0 - 70; x <= x1 + 70; x += 2.4) { if (x > x0 - 1 && x < x1 + 1) continue; S(postG, steel, x, -0.3 + 0.55, 15.1); S(postG, steel, x, -0.3 + 0.55, 0.9); }
  S(box(70, 0.08, 0.08), steel, x0 - 36, 0.85, 15.1); S(box(70, 0.08, 0.08), steel, x1 + 36, 0.85, 15.1); S(box(70, 0.08, 0.08), steel, x0 - 36, 0.85, 0.9); S(box(70, 0.08, 0.08), steel, x1 + 36, 0.85, 0.9);
  /* 북쪽(바다 쪽): 수문 탑 넷 · 사이에 녹슨 수문 판 · 탑 창 청록 띠 · 위 붉은 경고등(움직임 — group) */
  const beacons = []; const bm = own(new THREE.MeshBasicMaterial({ color: 0xff3a2a })); const bg = new THREE.SphereGeometry(0.42, 10, 8); geos.push(bg);
  for (const tx of [x0 - 30, x0 - 6, x1 + 6, x1 + 30]) {
    S(box(6, 16, 6), conc, tx, 4, -4); S(box(6.4, 0.6, 6.4), concD, tx, 12.2, -4); S(box(4.6, 0.5, 0.2), teal, tx, 7.5, -0.95); S(box(4.6, 0.5, 0.2), teal, tx, 4.5, -0.95);
    const b = new THREE.Mesh(bg, bm); b.position.set(tx, 12.9, -4); b.userData.own = true; group.add(b); beacons.push(b);
  }
  for (const [ax, bx] of [[x0 - 27, x0 - 9], [x1 + 9, x1 + 27]]) for (let k = 0; k < 3; k++) { const w = (bx - ax) / 3; S(box(w - 0.4, 9, 0.6), rust, ax + w * (k + 0.5), 1.5, -2.6); S(box(w - 0.2, 0.3, 0.8), steel, ax + w * (k + 0.5), 6.1, -2.6); }
  S(box(x1 - x0 + 10, 3, 2), concD, (x0 + x1) / 2, -0.3, -2.2); /* 파수 뒤 관제 받침 */
  /* 장어 코어 굵은 관 (파수 → 양옆 탑) · 검은 닻 깃발 · 횃불 */
  const pipeG = new THREE.CylinderGeometry(0.32, 0.32, 1, 10).rotateZ(Math.PI / 2); geos.push(pipeG);
  for (const sx of [-1, 1]) { const len = 9; const p = S(pipeG, blk, P.boss.x + sx * (len / 2 + 1.5), 0.32, P.boss.z - 2.2); p.scale.x = len; const s = S(box(len, 0.1, 0.12), teal, P.boss.x + sx * (len / 2 + 1.5), 0.62, P.boss.z - 2.2); s.userData.zone = 3; }
  const poleG = box(0.14, 4.2, 0.14), flagG = new THREE.PlaneGeometry(1.6, 1.0); geos.push(flagG); const fireG = new THREE.SphereGeometry(0.22, 8, 6); geos.push(fireG);
  for (const [fx, fz] of [[x0 + 1.4, 1.4], [x1 - 1.4, 1.4], [x0 + 1.4, 30.4], [x1 - 1.4, 30.4]]) {
    S(poleG, blk, fx, 2.1, fz); const f = S(flagG, cloth, fx + (fx < 24 ? 0.85 : -0.85), 3.5, fz, Math.PI / 2 * 0); f.rotation.y = 0.3; S(box(1.6, 0.18, 0.02), own(new THREE.MeshLambertMaterial({ color: 0x8a1f1a })), fx + (fx < 24 ? 0.85 : -0.85), 3.3, fz + 0.01).rotation.y = 0.3;
    S(fireG, ember, fx, 4.35, fz);
  }
  /* 바닥 경고 띠 (무대 가장자리) · 무대 가운데 수문 기호 */
  for (let x = x0 + 0.5; x < x1; x += 1) { S(box(0.5, 0.04, 0.35), x % 2 < 1 ? yel : blk, x, 0.03, 0.55); S(box(0.5, 0.04, 0.35), x % 2 < 1 ? yel : blk, x, 0.03, 31.45); }
  const ringG = new THREE.RingGeometry(3.0, 3.4, 40).rotateX(-Math.PI / 2); geos.push(ringG); S(ringG, own(new THREE.MeshBasicMaterial({ color: 0x8a6a2a, transparent: true, opacity: 0.55, depthWrite: false })), P.boss.x, 0.04, P.boss.z);
  const stage = buildStage(P, S, box, geos, group, own, x0, x1);
  out.geos.push(...geos); out.gateFx = { beacons, bm, ...stage };
}

/* ───── M6-B 무대: '바다 위 거대한 수문 꼭대기' (검수 M5 — 육각 바닥이라 창고 · 공장과 같아 보임) ─────
 *  수문 철판 바닥(4m 판 · 이음 홈 · 리벳 · 두 톤) · 양옆 배수 홈 · 노란 손잡이 난간 · 북쪽을 가리키는 칠한 화살표
 *  10m 아래 바다(흐르는 물결 무늬 · 벽 밑 흰 거품 줄 · 물보라는 tick 이 뿜음) · 북쪽 끝 하늘판(폭풍 → 새벽, tick 이 섞음) · 새벽 빛줄기 */
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function buildStage(P, S, box, geos, group, own, x0, x1) {
  const plateA = own(new THREE.MeshLambertMaterial({ color: 0x8b918b, flatShading: true })), plateB = own(new THREE.MeshLambertMaterial({ color: 0x777e79, flatShading: true }));
  const seam = own(new THREE.MeshLambertMaterial({ color: 0x23282a, flatShading: true })), rivet = own(new THREE.MeshLambertMaterial({ color: 0xa9ab9f, flatShading: true }));
  const paint = own(new THREE.MeshLambertMaterial({ color: 0xd9ad3a, flatShading: true })), rail = own(new THREE.MeshLambertMaterial({ color: 0xe0b23a, flatShading: true })), drain = own(new THREE.MeshLambertMaterial({ color: 0x1a1f21, flatShading: true }));
  const zA = 0.5, zB = 31.5;
  /* 철판 4m × 4m 두 톤 (바닥 y 0 · 판 두께 0.06) */
  const pG = box(3.9, 0.06, 3.9);
  for (let x = x0; x < x1 - 0.1; x += 4) for (let z = 0; z < 32 - 0.1; z += 4) S(pG, ((x - x0) / 4 + z / 4) % 2 ? plateB : plateA, x + 2, -0.025, z + 2);
  /* 이음 홈 (판 사이) · 리벳 (판 귀퉁이 · 가운데) */
  for (let x = x0; x <= x1 + 0.01; x += 4) S(box(0.12, 0.02, 32), seam, x, 0.005, 16);
  for (let z = 0; z <= 32.01; z += 4) S(box(x1 - x0, 0.02, 0.12), seam, (x0 + x1) / 2, 0.005, z);
  const rG = box(0.13, 0.05, 0.13);
  for (let x = x0; x < x1 - 0.1; x += 4) for (let z = 0; z < 32 - 0.1; z += 4) for (const [a, b] of [[0.35, 0.35], [3.65, 0.35], [0.35, 3.65], [3.65, 3.65], [2, 0.35], [2, 3.65]]) S(rG, rivet, x + a, 0.02, z + b);
  /* 양옆 배수 홈 (난간 안쪽 0.7m · 창살 줄) */
  for (const sx of [x0 + 0.55, x1 - 0.55]) { S(box(0.7, 0.03, zB - zA), drain, sx, 0.012, 16); for (let z = zA + 0.4; z < zB; z += 0.6) S(box(0.62, 0.035, 0.07), seam, sx, 0.02, z); }
  /* 칠한 화살표 셋 (북쪽 = 파수 쪽) · 수문 번호 막대 */
  for (const z of [14, 20, 26]) { const a = S(box(2.4, 0.015, 0.36), paint, 24 - 0.75, 0.012, z); a.rotation.y = 0.6; const b = S(box(2.4, 0.015, 0.36), paint, 24 + 0.75, 0.012, z); b.rotation.y = -0.6; }
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) S(box(0.32, 0.015, 1.6), paint, 24 + sx * (5.4 + k * 0.6), 0.012, 28.6);
  /* 노란 손잡이 난간 (양옆 · 기둥 2m) — 아래가 낭떠러지라는 표시 */
  const post = box(0.1, 1.1, 0.1);
  for (const x of [x0 + 0.12, x1 - 0.12]) { S(box(0.1, 0.1, zB - zA + 1), rail, x, 1.1, 16); S(box(0.07, 0.07, zB - zA + 1), rail, x, 0.6, 16); for (let z = zA; z <= zB + 0.01; z += 2) S(post, rail, x, 0.55, z); }
  /* 10m 아래 바다: 물결 무늬 흐름 · 흰 거품 줄 (벽 밑) — fog 은 tick 이 넓힘 */
  const seaT = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#21566a'; x.fillRect(0, 0, w, h); let s = 11; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    for (let i = 0; i < 420; i++) { const px = r() * w, py = r() * h, l = 6 + r() * 26; x.strokeStyle = `rgba(${150 + r() * 80 | 0},${200 + r() * 55 | 0},255,${0.12 + r() * 0.3})`; x.lineWidth = 1 + r() * 2; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + l / 2, py - 3, px + l, py); x.stroke(); } });
  seaT.wrapS = seaT.wrapT = THREE.RepeatWrapping; seaT.repeat.set(10, 10); geos.push(seaT);
  const seaM = own(new THREE.MeshLambertMaterial({ map: seaT, color: 0xffffff, emissive: 0x0a2430 }));
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(220, 140).rotateX(-Math.PI / 2), seaM); geos.push(sea.geometry); sea.position.set(24, -9.6, 30); sea.receiveShadow = false; sea.userData.own = true; group.add(sea);
  const foamT = canvasTex(64, 256, (x, w, h) => { let s = 3; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.6})`; x.beginPath(); x.arc(r() * w, r() * h, 2 + r() * 6, 0, 7); x.fill(); } });
  foamT.wrapS = foamT.wrapT = THREE.RepeatWrapping; foamT.repeat.set(1, 12); geos.push(foamT);
  const foamM = own(new THREE.MeshBasicMaterial({ map: foamT, transparent: true, opacity: 0.85, depthWrite: false }));
  const foams = [];
  for (const [x, flip] of [[x0 - 0.75 - 2.2, true], [x1 + 0.75 + 2.2, false]]) { const g = new THREE.PlaneGeometry(4.4, 72).rotateX(-Math.PI / 2); if (flip) g.rotateY(Math.PI); geos.push(g); const f = new THREE.Mesh(g, foamM); f.position.set(x, -9.5, 34); f.renderOrder = 2; f.userData.own = true; group.add(f); foams.push(f); }
  /* 북쪽 끝 하늘판: 폭풍(짙은 남색 구름) · 새벽(호박 · 분홍 수평선) 두 장을 섞음 */
  const skyStorm = canvasTex(8, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0b1420'); g.addColorStop(0.6, '#1a2636'); g.addColorStop(1, '#2a3646'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const skyDawn = canvasTex(8, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3a4a6a'); g.addColorStop(0.45, '#b77a7a'); g.addColorStop(0.75, '#ffb46a'); g.addColorStop(1, '#ffe2a8'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  geos.push(skyStorm, skyDawn); const skyG = new THREE.PlaneGeometry(260, 46); geos.push(skyG);
  const skyA = new THREE.Mesh(skyG, own(new THREE.MeshBasicMaterial({ map: skyStorm, fog: false, depthWrite: false }))), skyB = new THREE.Mesh(skyG, own(new THREE.MeshBasicMaterial({ map: skyDawn, fog: false, transparent: true, opacity: 0, depthWrite: false })));
  for (const [m, o] of [[skyA, -1], [skyB, 0]]) { m.position.set(24, 11, -30); m.renderOrder = o; m.userData.own = true; group.add(m); }
  /* 새벽 빛줄기 셋 (북동 하늘 → 무대 위 비스듬히 · 더하기 섞기 · 단계 3부터) */
  const rayG = new THREE.PlaneGeometry(3.2, 46); geos.push(rayG); const rayM = own(new THREE.MeshBasicMaterial({ color: 0xffd39a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  const rays = []; for (const [rx, rz, a] of [[30, 6, 0.5], [21, 14, 0.42], [35, 20, 0.55]]) { const m = new THREE.Mesh(rayG, rayM); m.position.set(rx, 8, rz); m.rotation.set(-0.9, 0, a); m.renderOrder = 5; m.userData.own = true; group.add(m); rays.push(m); }
  return { seaT, foamT, foams, foamM, skyB, rayM, x0, x1 };
}

/* ───── 판 시작 (raid.start 끝에서) ───── */
export function gateStart(R) {
  const B = BOSS.pasu; B.weakMul = 2; /* 3단계에서 바뀐 값 되돌림 */
  const G = R.GT = { phase: 0, shift: 0, active: false, t: 0, last: '', told: {}, tele: [], plates: [], dome: null, bolt: 0, surgeCd: 6, sweepCd: 3, rainCd: 0 };
  /* 빛 · 안개 (raid.applyLook 은 지도표에 없으면 건너뜀 → 여기서) */
  const sc = R.scene, lt = R.lights; R.lookBase = { ...gateLook, hemi: [...gateLook.hemi], sun: [...gateLook.sun] }; /* M6-B: 하늘 단계가 세기를 바꿈 → 복사본 */ if (lt && sc) { sc.background.setHex(gateLook.bg); sc.fog.color.setHex(gateLook.bg); lt.hemi.color.setHex(gateLook.hemi[1]); lt.hemi.groundColor.setHex(gateLook.hemi[2]); lt.sun.color.setHex(gateLook.sun[1]); R.updateLook(0); }
  /* 지도 밖 바다 · 물 막 — 무대 높이(10m 아래)로 · 물 막은 무대 위만 */
  R.root.traverse(o => { if (o.material?.uniforms?.uDeep && o.name === 'static' && o.geometry?.parameters?.width === 320) o.position.y = -10; });
  if (R.water) { R.water.scale.set((AR.x1 - AR.x0) / R.P.W, 64 / R.P.H, 1); R.water.position.set((AR.x0 + AR.x1) / 2, 0.12, 32); }
  /* 판 사건 끔: 정전 · 입구 닫힘 안내 · 두목 · 지도 보스 자동 깨어남 */
  R.blackoutAt = 1e9; R.events.earlyWarn = R.events.earlyClosed = true; R.events.boss = true; R.chiefPlan = null; R.power = true; /* 발전기 없음 (화면 밖 표시 끔) */
  for (const x of R.exits) {
    if (x.gate === 'retreat') { x.name = '승강로 승강기'; x.cond = () => true; }
    else if (x.gate === 'top') { x.name = '꼭대기 구조 보트'; x.cond = () => !!R.boss?.dead; x.why = () => '파수를 멈추면 와요'; }
  }
  /* 파수: 꼭대기 가운데 · 남쪽(들어오는 길)을 봄 · 잠듦 */
  const Pb = R.P.boss; const e = R.makeEnemy({ kind: 'pasu', x: Pb.x, z: Pb.z, zone: 3 }, 999);
  /* 위협 곡선(threat.js — 하루당 5.5 · 배우는 주 뒤 최저 Lv 4)에 맞춤: 체력 × 오늘 위협 체력 배수 · 큰 공격 × 피해 배수 (보스는 보통 위협을 안 받음 — 최종 보스만) */
  const TH = R.T || { hp: 1, dmg: 1 }; e.maxHp = e.hp = e.maxHp * TH.hp; G.dm = TH.dmg || 1; e.face = 0; e.state = 'idle'; e.cd = 2.2; e.home.set(Pb.x, 0, Pb.z); e.hpFloor = e.maxHp * B.phase[0] * 0.999;
  R.enemies.push(e); R.boss = e; R.gatePhase = 0;
  R.mods.push({ tick: dt => tick(R, dt), kill: x => down(R, x), dispose: () => clear(R) });
  setTimeout(() => R.alive && !G.active && R.ui.event('대수문 꼭대기 — 위쪽 무대에 파수가 있어요. 들어서면 깨어나요 (아래 승강기로 언제든 물러날 수 있어요)', 'boss'), 1600);
}

/* ───── 매 프레임 ───── */
function tick(R, dt) {
  const G = R.GT, e = R.boss, B = BOSS.pasu; if (!G || !e) return; G.t += dt; gateSky(R, dt);
  /* 경고등 깜빡 */
  const F = R.X.gateFx; if (F) { const on = Math.sin(G.t * (G.phase === 2 ? 9 : 4)) > 0; F.bm.color.setHex(on ? 0xff3a2a : 0x3a0e0a); }
  if (e.dead) { color(e, [1, 0.72, 0.32], dt * 1.5); if (R.camBias) bossHud(R, false); return; }
  /* 깨어남 */
  if (!G.active && R.pl.pos.z < AR.enterZ && !R.pl.dead) {
    G.active = true; e.state = 'chase'; e.alert = 1; e.target = R.pl.pos.clone(); e.D = { ...e.D, sight: 40 }; e.cd = 1.4; e.mark = 1.2; e.markType = '!';
    sfx.roar?.(0, 'boss'); sfx.chiefHorn?.(); R.shake = Math.max(R.shake, 0.6); e.anim?.play('Taunt', { once: true, fade: 0.1, speed: 1, force: true });
    R.ui.event('파수: "침입자 확인. 방어 모드." — 큰 공격은 바닥에 먼저 보여요 · 팔이 박히면 가슴 코어!', 'boss'); /* M6-B: 위 띠 두 줄 안 */
  }
  if (!G.active) return;
  /* M6-B 카메라: 주인공과 파수 사이 CAM_K 지점을 봄 (최대 CAM_MAX m) — 파수가 화면 위 HUD 띠 밑에서 싸우던 것 */
  if (!R.pl.dead) { bossHud(R, true); const dx = e.pos.x - R.pl.pos.x, dz = e.pos.z - R.pl.pos.z, d = Math.hypot(dx, dz), k = Math.min(CAM_K, CAM_MAX / Math.max(1e-3, d)); R.camBias.x = dx * k * 0.5; R.camBias.z = dz * k; }
  else if (R.camBias) bossHud(R, false);
  if (e.hpFloor && e.hp < e.hpFloor) e.hp = e.hpFloor; /* 화상 · 독 같은 직접 피해도 문턱 아래로는 안 감 */
  /* 자리 지킴 (관제 코어 — 받침 레일 위에서만) · 늘 나를 봄 */
  e.pos.x = Math.max(AR.x0 + 3.5, Math.min(AR.x1 - 3.5, e.pos.x)); e.pos.z = Math.max(4.2, Math.min(8.5, e.pos.z));
  if (!R.pl.dead) { e.state = 'chase'; e.alert = 1; e.target = R.pl.pos.clone(); e.seen = 0.6; }
  /* 단계 바뀜 */
  if (G.shift > 0) { G.shift -= dt; e.guard = G.shift; if (G.dome) { G.dome.material.opacity = 0.18 + 0.1 * Math.sin(G.t * 10); G.dome.scale.setScalar(1 + 0.04 * Math.sin(G.t * 6)); }
    if (G.shift <= 0) { e.guard = 0; if (G.dome) { R.root.remove(G.dome); G.dome.geometry.dispose(); G.dome.material.dispose(); G.dome = null; } e.cd = 0.8; e.hpFloor = G.phase === 1 ? e.maxHp * B.phase[1] * 0.999 : 0; } }
  else if (G.phase < 2 && e.hp <= e.maxHp * B.phase[G.phase] + 0.5) shift(R, e);
  R.gatePhase = G.phase;
  color(e, LENS[G.phase], dt * 3);
  if (e.custom?.ring) e.custom.ring.rotation.z += dt * (0.4 + G.phase * 0.9 + (G.shift > 0 ? 4 : 0));
  /* 패턴: 예고 · 기절 · 바뀜이 아니면 (일반 코드가 시야 탓에 못 부를 때도) */
  if (G.shift <= 0 && !(e.wind > 0) && !(e.stun > 0) && e.cd <= 0 && !R.pl.dead && !R.over) R.bossWind(e, e.pos.distanceTo(R.pl.pos), 1);
  /* 예고 그림 움직임: 기억 비 원 커짐 · 반쪽 칸 · 해일 칸 깜빡 */
  if (e.wind > 0) { const k = 1 - e.wind / e.windMax;
    for (const t of G.tele) { if (t.kind === 'disc') { t.m.scale.setScalar(t.r * (0.3 + 0.7 * k)); t.m.material.opacity = 0.25 + 0.35 * Math.sin(k * 20) ** 2; } else if (t.kind === 'area') t.m.material.opacity = 0.16 + 0.22 * Math.sin(k * 16) ** 2; else if (t.kind === 'safe') { t.m.material.opacity = 0.55 + 0.4 * Math.sin(G.t * 12) ** 2; } else if (t.kind === 'ray') t.m.material.opacity = 0.22 + 0.3 * Math.sin(k * 22) ** 2; } }
  /* 휩쓰는 수문 판 (보이는 것만 — 피해는 공격 순간에 이미 셈) */
  for (let i = G.plates.length - 1; i >= 0; i--) { const p = G.plates[i]; p.t += dt; const k = Math.min(1, p.t / 0.32); p.m.position.x = p.x0 + (p.x1 - p.x0) * k; p.m.material.opacity = 1 - Math.max(0, (p.t - 0.32) / 0.4);
    if (p.t > 0.72) { R.root.remove(p.m); p.m.material.dispose(); G.plates.splice(i, 1); } }
}
/* ───── M6-B 최종전 날씨 = 고정 연출 (그날 예보와 상관없음 · 총괄 결정): 폭풍이 걷히며 새벽빛 — 단계마다 밝아짐 ─────
 *  하늘 단계 sky 0 = 폭풍(비 · 번개) → 1 = 2단계(비 줄고 구름 틈) → 2 = 3단계(비 거의 그침 · 수평선 호박빛 · 빛줄기) → 3 = 쓰러짐(새벽 · 비 그침)
 *  바뀌는 것: 배경 · 안개 색과 거리 · 하늘빛(hemi) · 해 색 · 세기 · 판 어둠(night) · 비 세기 · 번개 · 하늘판 · 빛줄기 · 바다 물결 · 거품 · 물보라 */
const SKY = [ /* bg, hemi 세기, hemi 위, hemi 아래, 해 세기, 해 색, night, 안개 [가까이, 멀리] */
  [0x0d1824, 1.0, 0x9fc4d8, 0x18222c, 0.95, 0xc8dcff, 0.55, [30, 62]],
  [0x1c2433, 1.1, 0xb8c6d8, 0x232834, 1.05, 0xe6d8d2, 0.4, [32, 68]],
  [0x3a3242, 1.22, 0xffd6c0, 0x2e2a32, 1.25, 0xffc890, 0.22, [36, 76]],
  [0x574650, 1.32, 0xffe2c8, 0x36303a, 1.4, 0xffd6a0, 0.06, [40, 84]]];
const cA = new THREE.Color(), cB = new THREE.Color();
const mixHex = (a, b, k, out) => out.setHex(a).lerp(cB.setHex(b), k);
export function gateSky(R, dt) {
  const G = R.GT, e = R.boss; if (!G) return; const F = R.X?.gateFx, sc = R.scene, lt = R.lights;
  const tgt = e?.dead ? 3 : G.active ? G.phase + (G.shift > 0 ? 0.5 : 0) : 0;
  G.sky = (G.sky || 0) + (tgt - (G.sky || 0)) * Math.min(1, dt * 0.55);
  const s = Math.max(0, Math.min(3, G.sky)), i = Math.min(2, Math.floor(s)), k = s - i, A = SKY[i], B = SKY[i + 1];
  if (sc && lt && R.lookBase) {
    mixHex(A[0], B[0], k, cA); sc.background.copy(cA); sc.fog.color.copy(cA);
    mixHex(A[2], B[2], k, lt.hemi.color); mixHex(A[3], B[3], k, lt.hemi.groundColor); mixHex(A[5], B[5], k, lt.sun.color);
    R.lookBase.hemi[0] = A[1] + (B[1] - A[1]) * k; R.lookBase.sun[0] = A[4] + (B[4] - A[4]) * k;
  }
  R.night = A[6] + (B[6] - A[6]) * k; R.C.fog = [A[7][0] + (B[7][0] - A[7][0]) * k, A[7][1] + (B[7][1] - A[7][1]) * k];
  /* 비: 점점 옅게 → 쓰러지면 그침 · 번개는 2단계까지만 (3단계부터 구름이 걷힘) */
  const rain = R.fx?.rain; if (rain) rain.m.material.opacity = 0.42 * Math.max(0, 1 - s / 2.6);
  if (s > 2.6 && R.fx?.rainOn) R.fx.weather(null);
  if (s > 1.6) R.nextBolt = Math.max(R.nextBolt || 0, 6); else if (G.phase === 1 && R.nextBolt > 12) R.nextBolt = 6 + R.R() * 6;
  if (!F) return;
  F.skyB.material.opacity = Math.min(1, s / 2.4); F.rayM.opacity = 0.16 * Math.max(0, Math.min(1, (s - 1.4) / 1.2)) * (0.8 + 0.2 * Math.sin(G.t * 0.7));
  F.seaT.offset.x += dt * 0.012; F.seaT.offset.y -= dt * (0.035 + 0.02 * (1 - s / 3)); F.foamT.offset.y -= dt * 0.12; F.foamM.opacity = 0.55 + 0.3 * Math.sin(G.t * 1.3);
  /* 물보라: 벽 밑에서 하얀 물방울이 솟음 (보이는 쪽 z 만 · 폭풍일수록 잦음) */
  G.spray = (G.spray || 0) - dt;
  if (G.spray <= 0 && R.pl) { G.spray = 0.22 + s * 0.08; const side = R.R() < 0.5 ? F.x0 - 1.0 : F.x1 + 1.0, z = R.pl.pos.z - 14 + R.R() * 20; R.fx.burst(side, -9.2, z, 10, 0xeaf6ff, 6.5, 0.18, 1.2, 6); }
}
/* 렌즈 · 빛줄 · 화면(glow) = 단계 색 · 가슴 장어 코어(eye) = 약점이면 하얗게 · 평소 청록 맥박 */
function color(e, c, k) {
  const C = e.custom; if (!C) return; const g = C.glowM; if (g) g.color.lerp(tv.set(c[0], c[1], c[2]), Math.min(1, k));
  const ey = C.eyeM; if (!ey) return; if (e.dead) { ey.color.lerp(tv.set(0.16, 0.12, 0.08), Math.min(1, k)); return; }
  if (e.weakT > 0) ey.color.setRGB(1, 1, 0.8 + 0.2 * Math.sin(e.t * 14)); else { const p = 0.65 + 0.2 * Math.sin(e.t * 3); ey.color.setRGB(0.35 * p, p, 0.85 * p); }
  if (C.chest) C.chest.scale.setScalar(e.weakT > 0 ? 1.25 + 0.06 * Math.sin(e.t * 14) : 1);
}
function shift(R, e) {
  const G = R.GT, B = BOSS.pasu; G.phase++; G.shift = B.shift[G.phase - 1]; e.guard = G.shift; e.wind = 0; e.stun = 0; e.weakT = 0; e.hpFloor = e.hp; clearTele(R); e.grain = e.safe = null;
  if (e.warn) { R.root.remove(e.warn); e.warn.material.dispose(); e.warn = null; } e.lockFace = null;
  if (G.phase === 2) B.weakMul = B.coreWeakMul;
  e.anim?.play('Taunt', { once: true, fade: 0.08, speed: 1, force: true }); sfx.roar?.(0, 'boss'); sfx.siren?.(); R.shake = Math.max(R.shake, 0.7); R.flash = Math.max(R.flash, 0.15);
  const dm = new THREE.Mesh(new THREE.SphereGeometry(3.4, 20, 14), new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending })); dm.position.set(e.pos.x, 2.2, e.pos.z); R.root.add(dm); G.dome = dm;
  R.fx.ring(e.pos.x, e.pos.z, 6, G.phase === 2 ? 0xff5a3a : 0x7dffd8); R.fx.burst(e.pos.x, 3, e.pos.z, 50, G.phase === 2 ? 0xffb090 : 0x9ffff0, 9, 0.1, 1.0, 6);
  R.ui.event(PH_TXT[G.phase], 'boss');
  /* 수리 드론: 양옆에서 */
  for (let k = 0; k < B.adds[G.phase - 1]; k++) { const sx = k % 2 ? 1 : -1; const d = R.makeEnemy({ kind: 'drone', x: e.pos.x + sx * 5.5, z: e.pos.z + 3 + k, zone: 3 }, 5000 + R.enemies.length); d.state = 'chase'; d.alert = 1; d.target = R.pl.pos.clone(); R.collide(d.pos, 0.6); R.enemies.push(d); }
}

/* ───── 패턴 고르기 · 예고 (raid.bossWind) ───── */
export function gateWind(R, e, dist) {
  const G = R.GT, B = BOSS.pasu, pl = R.pl; if (!G?.active || G.shift > 0) { e.cd = 0.4; return; }
  const ph = G.phase; const ang = Math.atan2(pl.pos.x - e.pos.x, pl.pos.z - e.pos.z); e.lockFace = null; e.teleT0 = R.t;
  G.sweepCd -= 1; G.surgeCd -= 1;
  const can = { slam: dist < B.slam.len - 1, volley: true, rain: ph >= 1, sweep: ph >= 1 && G.sweepCd <= 0 && pl.pos.z < AR.z1 - 1, surge: ph >= 2 && G.surgeCd <= 0 };
  const w = { slam: 3, volley: ph === 0 ? 3 : 1.6, rain: 2.4, sweep: 2.2, surge: 3.2 };
  let pick = null; const pool = Object.keys(can).filter(k => can[k] && !(k === G.last && k !== 'slam' && k !== 'volley'));
  if (can.surge) pick = 'surge'; else { let tot = pool.reduce((s, k) => s + w[k], 0), r = R.R() * tot; for (const k of pool) { r -= w[k]; if (r <= 0) { pick = k; break; } } pick ||= pool[0] || 'volley'; }
  G.last = pick; e.pat = pick; clearTele(R);
  if (pick === 'slam') { e.windMax = e.wind = ph === 2 ? B.slam.wind3 : B.slam.wind; e.lockFace = ang; e.face = ang; R.warnLine(e, B.slam.len, B.slam.w, 0xff4a30);
    e.anim?.play('1H_Melee_Attack_Chop', { once: true, fade: 0.05, speed: 0.62 / e.wind, force: true }); sfx.bossWarn?.('boss', 'slam', e.wind); }
  else if (pick === 'volley') { e.windMax = e.wind = B.volley.wind; e.lockFace = ang; e.face = ang;
    for (let i = 0; i < B.volley.n; i++) { const a = ang + (i / (B.volley.n - 1) - 0.5) * B.volley.spread; const m = new THREE.Mesh(LINE, new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
      m.rotation.order = 'YXZ'; m.rotation.set(-Math.PI / 2, a, 0); m.position.set(e.pos.x, 0.22, e.pos.z); m.scale.set(0.35, 18, 1); R.root.add(m); G.tele.push({ kind: 'ray', m }); }
    e.anim?.play('Unarmed_Melee_Attack_Punch_A', { once: true, fade: 0.05, speed: 0.47 / e.wind, force: true }); sfx.bossWarn?.('captain', 'hook', e.wind); }
  else if (pick === 'rain') { e.windMax = e.wind = B.rain.wind; const n = ph === 2 ? B.rain.n3 : B.rain.n; e.grain = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + R.R() * 0.7; const r = i === 0 ? 0 : 2.2 + R.R() * (B.rain.spread - 2.2);
      const x = Math.max(AR.x0 + 1, Math.min(AR.x1 - 1, pl.pos.x + Math.cos(a) * r)), z = Math.max(AR.z0 + 1, Math.min(AR.z1 + 6, pl.pos.z + Math.sin(a) * r));
      const m = disc(0xffc861, 0.3); m.position.set(x, 0.24, z); m.scale.setScalar(0.3); R.root.add(m); G.tele.push({ kind: 'disc', m, r: B.rain.r }); e.grain.push({ x, z }); }
    e.anim?.play('Unarmed_Melee_Attack_Punch_A', { once: true, fade: 0.05, speed: 0.4, force: true }); sfx.bossWarn?.('captain', 'douse', e.wind);
    if (!G.told.rain) { G.told.rain = 1; R.ui.toast('보관 목록이 빛으로 떨어져요 — 노란 원 밖으로!', 'warn'); } }
  else if (pick === 'sweep') { e.windMax = e.wind = B.sweep.wind; G.sweepCd = 3; const left = pl.pos.x < (AR.x0 + AR.x1) / 2; e.side = left ? -1 : 1;
    const m = new THREE.Mesh(new THREE.PlaneGeometry((AR.x1 - AR.x0) / 2, AR.z1 - AR.z0 + 6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.2, depthWrite: false }));
    m.position.set(left ? (AR.x0 * 3 + AR.x1) / 4 : (AR.x0 + AR.x1 * 3) / 4, 0.23, (AR.z0 + AR.z1 + 6) / 2); R.root.add(m); G.tele.push({ kind: 'area', m });
    e.anim?.play('Sweep', { once: true, fade: 0.05, speed: 0.9 / e.wind, force: true }); sfx.bossWarn?.('boss', 'slam', e.wind);
    R.ui.toast(`수문을 닫아요 — ${left ? '오른' : '왼'}쪽으로!`, 'warn'); }
  else if (pick === 'surge') { e.windMax = e.wind = B.surge.wind; G.surgeCd = 6; e.safe = [];
    const m = new THREE.Mesh(new THREE.PlaneGeometry(AR.x1 - AR.x0, AR.z1 - AR.z0 + 6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.2, depthWrite: false }));
    m.position.set((AR.x0 + AR.x1) / 2, 0.22, (AR.z0 + AR.z1 + 6) / 2); R.root.add(m); G.tele.push({ kind: 'area', m });
    const spots = []; const near = () => { for (let t = 0; t < 30; t++) { const a = R.R() * 6.28, r = 3 + R.R() * 3; const x = pl.pos.x + Math.cos(a) * r, z = pl.pos.z + Math.sin(a) * r; if (x > AR.x0 + 2 && x < AR.x1 - 2 && z > 10 && z < AR.z1 + 4) return [x, z]; } return [(AR.x0 + AR.x1) / 2, 18]; };
    spots.push(near()); for (let k = 1; k < B.surge.safe; k++) { for (let t = 0; t < 40; t++) { const x = AR.x0 + 2.5 + R.R() * (AR.x1 - AR.x0 - 5), z = 11 + R.R() * (AR.z1 - 8); if (spots.every(([a, b]) => Math.hypot(a - x, b - z) > 5)) { spots.push([x, z]); break; } } }
    for (const [x, z] of spots) { const s = new THREE.Mesh(SAFE, new THREE.MeshBasicMaterial({ color: 0x9ffff0, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide })); s.position.set(x, 0.26, z); s.scale.setScalar(B.surge.r); R.root.add(s); G.tele.push({ kind: 'safe', m: s }); e.safe.push({ x, z }); }
    e.anim?.play('Taunt', { once: true, fade: 0.05, speed: 0.8, force: true }); sfx.siren?.(); R.ui.event('해일 경보! 빛나는 원 안으로 — 2초', 'boss'); }
  e.cd = e.D.cd * B.cdMul[ph];
}
const LINE = (() => { const g = new THREE.PlaneGeometry(1, 1); g.translate(0, 0.5, 0); return g; })();
const DISC = new THREE.CircleGeometry(1, 32), SAFE = new THREE.RingGeometry(0.82, 1, 36).rotateX(-Math.PI / 2);
const disc = (c, op) => { const m = new THREE.Mesh(DISC, hazard(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false }))); m.rotation.x = -Math.PI / 2; return m; };
function clearTele(R) { const G = R.GT; if (!G) return; for (const t of G.tele) { R.root?.remove(t.m); t.m.material.dispose(); } G.tele = []; }

/* ───── 공격 (raid.enemyAttack 안 — R.tele 가 예고 시간) ───── */
export function gateAttack(R, e, dist) {
  const G = R.GT, B = BOSS.pasu, pl = R.pl; clearTele(R); if (!G) return true;
  if (e.pat === 'slam') { const S2 = B.slam; const dx = Math.sin(e.lockFace), dz = Math.cos(e.lockFace);
    const px = pl.pos.x - e.pos.x, pz = pl.pos.z - e.pos.z, along = px * dx + pz * dz, side = Math.abs(px * dz - pz * dx);
    sfx.slam?.(); sfx.gate?.(); R.shake = Math.max(R.shake, 0.8); R.hitstop = Math.max(R.hitstop, 0.05);
    for (let s = 2; s < S2.len; s += 1.6) R.fx.burst(e.pos.x + dx * s, 0.3, e.pos.z + dz * s, 6, 0xd9c7a0, 5, 0.12, 0.6, 16);
    R.fx.ring(e.pos.x + dx * S2.len * 0.6, e.pos.z + dz * S2.len * 0.6, 2.4, 0xffb060);
    if (along > -0.5 && along < S2.len + 0.5 && side < S2.w / 2 + 0.35) R.hurt(S2.dmg * G.dm, e.pos);
    e.weakT = S2.stuck; e.stun = S2.stuck * 0.9; R.ui.weak(G.phase === 2 ? '수문 팔이 박혔어요 — 코어 약점 ×2.5!' : '수문 팔이 박혔어요 — 가슴 코어가 약점!'); return true; }
  if (e.pat === 'volley') { const V3 = B.volley; for (let i = 0; i < V3.n; i++) { const a = e.lockFace + (i / (V3.n - 1) - 0.5) * V3.spread; const dir = V(Math.sin(a), 0, Math.cos(a));
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xbff4ff })); m.position.set(e.pos.x + dir.x * 1.6, 1.6, e.pos.z + dir.z * 1.6); m.add(glowSprite(0x7fd8ff, 0.7, 1.5)); R.root.add(m);
      R.enemyShots.push({ m, dir, sp: V3.speed, t: 0, dmg: V3.dmg * G.dm, from: e.pos.clone(), r: V3.r, src: e, life: 24 / V3.speed, tele0: R.tele?.t0 }); }
    sfx.enemyShot?.(0); R.fx.burst(e.pos.x, 2.6, e.pos.z, 10, 0x9fe8ff, 4, 0.08, 0.4); return true; }
  if (e.pat === 'rain') { const RN = B.rain; sfx.boom?.(); R.shake = Math.max(R.shake, 0.45);
    for (const r of e.grain || []) { R.fx.burst(r.x, 1.2, r.z, 14, 0xffd88a, 6, 0.08, 0.7, -4); R.fx.ring(r.x, r.z, RN.r, 0xffc861); if ((pl.pos.x - r.x) ** 2 + (pl.pos.z - r.z) ** 2 < RN.r * RN.r) R.hurt(RN.dmg * G.dm, tv.set(r.x, 0, r.z)); }
    e.grain = null; return true; }
  if (e.pat === 'sweep') { const SW = B.sweep; const mid = (AR.x0 + AR.x1) / 2; const inSide = e.side < 0 ? pl.pos.x < mid + 0.3 : pl.pos.x > mid - 0.3;
    sfx.gate?.(); sfx.slam?.(); R.shake = Math.max(R.shake, 0.9);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.2, AR.z1 - AR.z0 + 6), new THREE.MeshLambertMaterial({ color: 0x7a3f24, transparent: true })); m.position.set(e.side < 0 ? AR.x1 : AR.x0, 2.1, (AR.z0 + AR.z1 + 6) / 2); R.root.add(m);
    G.plates.push({ m, t: 0, x0: e.side < 0 ? mid : mid, x1: e.side < 0 ? AR.x0 - 1 : AR.x1 + 1 });
    if (inSide && pl.pos.z < AR.z1 + 6) { R.hurt(SW.dmg * G.dm, tv.set(mid, 0, pl.pos.z)); if (!pl.dead) pl.push = V(-e.side * 7, 0, 0); } return true; }
  if (e.pat === 'surge') { const SU = B.surge; sfx.splash?.(); sfx.boom?.(); R.shake = Math.max(R.shake, 1.0); R.flash = Math.max(R.flash, 0.1);
    for (let k = 0; k < 14; k++) R.fx.burst(AR.x0 + R.R() * (AR.x1 - AR.x0), 0.4, AR.z0 + R.R() * (AR.z1 + 4), 10, 0xcfeef2, 7, 0.12, 0.8, 12);
    const safe = (e.safe || []).some(s => Math.hypot(pl.pos.x - s.x, pl.pos.z - s.z) < SU.r + 0.2);
    if (!safe) { R.hurt(SU.dmg * G.dm, tv.set(e.pos.x, 0, e.pos.z)); if (!pl.dead) pl.push = tv.set(pl.pos.x - e.pos.x, 0, pl.pos.z - e.pos.z).normalize().multiplyScalar(SU.push).clone(); }
    else R.ui.praise('원 안에서 버텼어요!');
    e.safe = null; return true; }
  return true;
}
/* 쓰러짐 */
function down(R, e) {
  if (e.kind !== 'pasu') return; const G = R.GT; clearTele(R); e.guard = 0; e.hpFloor = 0; R.gatePhase = 3;
  for (const o of R.enemies) if (!o.dead && o !== e && o.kind === 'drone') { o.state = 'idle'; o.alert = 0; }
  R.fx.burst(e.pos.x, 3, e.pos.z, 80, 0xffd88a, 10, 0.1, 1.4, -3); R.fx.ring(e.pos.x, e.pos.z, 7, 0xffc861); R.flash = Math.max(R.flash, 0.2);
  R.ui.event('파수가 멈췄어요 — 렌즈가 호박색으로 돌아와요. 잔해에서 \'돌려받은 기억\'을 · 꼭대기 구조 보트가 와요', 'good'); sfx.rare?.();
  if (G) G.done = true;
}
function clear(R) { bossHud(R, false); const G = R.GT; if (!G) return; clearTele(R); for (const p of G.plates) { R.root?.remove(p.m); p.m.material.dispose(); } if (G.dome) { R.root?.remove(G.dome); G.dome.geometry.dispose(); G.dome.material.dispose(); } R.GT = null; BOSS.pasu.weakMul = 2; }
