// 은신처 시설 단계 소품 (M4-D · 검수 M3 Top 8) — 시설 12 × 3단(낡음 → 고침 → 완성)이 초소 3D 에 보이고, 공사가 끝나면 카메라가 그 자리로
//  모델 = assets/dress_home.glb (tools/props3d/build_home.py → pack_home.mjs) · 키 o_<시설>_<1|2|3> · 공사 중 = o_build(비계)
//  그리기 최소: 보이는 시설을 전부 한 지오메트리로 합침 → 재질 2개(빛 받음 · 빛남) = 그리기 2 (+ 그림자 1). 단계가 바뀔 때만 다시 합침
//  완성 연출(app.hideCam): 1.0초 다가감 → 1.6초 머묾(빛 웅덩이 번쩍 · 불티 · 반짝 소리) → 0.9초 제자리. 누르면 바로 끝. 빛은 미리 만든 점광 하나(개수 안 바뀜 = 셰이더 다시 안 만듦)
import * as THREE from 'three';
import { GLTFLoader } from '../lib/GLTFLoader.js?v=0.99.16';
import { MeshoptDecoder } from '../lib/meshopt_decoder.module.js?v=0.99.16';
import { FACILITIES } from './data.js?v=0.99.16';
import { sfx } from './audio.js?v=0.99.16';

/* 자리 [x, z, 바라보는 방향, 크기] — 은신처 좌표(main.js buildHideout · 인물 SPOT 과 안 겹치게). 뒷벽 z −6 · 바닥 원 반지름 9 */
export const SLOT = {
  rack:     [-4.05, -5.0, 0.35, 1],
  bench:    [-2.55, -5.05, 0.0, 1],
  lights:   [-0.55, -5.55, 0.0, 1],
  shelf:    [1.05, -5.35, 0.0, 1],
  lab:      [3.3, -5.0, -0.15, 1],
  store:    [3.5, -2.95, -1.2, 1],
  clinic:   [3.4, -0.45, -1.35, 1],
  aquarium: [2.9, 2.6, -0.55, 1],
  kitchen:  [-3.55, -2.75, 1.2, 1],
  ammo:     [-3.4, -0.25, 1.3, 1],
  gym:      [0.45, 4.3, 0.0, 1],
  dock:     [-2.75, 4.0, 0.3, 1],
  forge:    [-3.55, 1.75, 1.25, 0.95], /* M5-C 정밀 공방 — 탄약대 아래 왼쪽 벽 */
  den:      [2.75, 4.75, -0.35, 0.95], /* M5-C 반려 쉼터 — 앞 부두 훈련장 오른쪽 */
};
/* M5-C 끝 단계(x4 · 주방 · 조명 4단계): 3단 외형 그대로 + 금빛 표식(o_star4) — 자리 기준 옮김 [x, z] */
const STAR_AT = { kitchen: [0.55, -0.15], lights: [0.55, 0.1] };
/* 단계 수 → 그림 단: 마지막 = 완성(3) · 절반 이상 = 고침(2) · 그 밑 = 낡음(1) (3단 시설 1·2·3 / 4단 1·2·2·3 / 5단 1·1·2·2·3) */
export function stageOf(k, lv) { const F = FACILITIES[k]; const n = F?.x4 ? 3 : F?.levels.length || 3; if (!lv) return 0; if (lv >= n) return 3; return lv >= Math.ceil(n / 2) ? 2 : 1; } /* M5-C x4: 끝 단계는 3단 외형 + 표식 */

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let job = null; export const MODELS = {};
/* 소품 묶음 하나 → MODELS (이름 = 노드 이름) · M5-D 가구(dress_furn.glb)도 이 길로 같은 덩어리에 합침 */
export function loadModels(url) {
  return loader.loadAsync(url).then(g => {
    g.scene.updateMatrixWorld(true);
    for (const n of g.scene.children) { const parts = []; n.traverse(o => { if (o.isMesh) parts.push({ geo: o.geometry, glow: o.material.name === 'glow', m: o.matrixWorld.clone() }); }); MODELS[n.name] = parts; }
  });
}
function loadHome() { return job ||= loadModels('assets/dress_home.glb'); }
const v3 = new THREE.Vector3(), col = new THREE.Color();
/* 여러 모델을 하나로: 위치 · 정점 색을 실수 배열로 풀어(양자화 해제) 변환을 굽고 이어 붙임 */
function merge(list) {
  const out = { pal: { p: [], c: [], i: [] }, glow: { p: [], c: [], i: [] } };
  for (const { key, M } of list) for (const pt of MODELS[key] || []) {
    const o = out[pt.glow ? 'glow' : 'pal']; const P = pt.geo.attributes.position, C = pt.geo.attributes.color; const base = o.p.length / 3; const T = M.clone().multiply(pt.m);
    for (let i = 0; i < P.count; i++) { v3.fromBufferAttribute(P, i).applyMatrix4(T); o.p.push(v3.x, v3.y, v3.z); if (C) { col.fromBufferAttribute(C, i); o.c.push(col.r, col.g, col.b); } else o.c.push(1, 1, 1); }
    const I = pt.geo.index; if (I) for (let i = 0; i < I.count; i++) o.i.push(base + I.getX(i)); else for (let i = 0; i < P.count; i++) o.i.push(base + i);
  }
  const g = {};
  for (const k of ['pal', 'glow']) { const d = out[k]; if (!d.i.length) continue; const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.Float32BufferAttribute(d.p, 3)); G.setAttribute('color', new THREE.Float32BufferAttribute(d.c, 3)); G.setIndex(d.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(d.i, 1) : new THREE.Uint16BufferAttribute(d.i, 1)); G.computeBoundingSphere(); g[k] = G; }
  return g;
}
const slotM = k => { const [x, z, ry, s] = SLOT[k]; return new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(s, s, s)); };

export class HomeFac {
  constructor(app) {
    this.app = app; this.g = new THREE.Group(); this.g.name = 'homefac'; this.key = ''; this.seen = null; this.cine = null; this.pending = null;
    this.mats = { pal: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), glow: new THREE.MeshBasicMaterial({ vertexColors: true }) };
    this.meshes = {}; this.lookK = 0; this.LOOK = { y: 8.3, z: 4.6, ly: -3.5, lz: 2.3 }; /* 검수 M4 Top 8: 약 10% 당김 · 보는 점을 앞으로(아래 물가 · 부두까지 화면 안) */
    /* 은신처 카메라 갈래: 완성 연출 > '초소 보기'(방 전체 — 양옆 시설까지) > 평소(main.js 숨쉬기) */
    app.hideCam = (cam, t, dt) => {
      /* 검수 M4 Top 9: 은신처를 떠나면(출격 준비 · 출격) 연출 · 띠를 바로 끝내고, 못 본 연출은 다음 은신처에서 다시 */
      if (!this.onHome()) { if (this.cine) this.abort(); }
      else if (!this.cine && this.pending && MODELS.o_build) { const k = this.pending; this.pending = null; this.celebrate(k); }
      return this.cine ? this.camTick(cam, dt) : this.lookCam(cam, t, dt);
    };
    /* 완성 연출 빛: 처음부터 있고 세기만 0 (빛 개수가 안 바뀌어 셰이더를 다시 만들지 않음) */
    this.flash = new THREE.PointLight(0xffd890, 0, 6, 1.6); this.flash.position.set(0, -50, 0); this.g.add(this.flash);
    /* 불티: 점 48개 한 덩어리(그리기 1) — 연출 때만 보임 */
    const N = 48; this.sp = { n: N, v: new Float32Array(N * 3), life: new Float32Array(N) };
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const gr = x.createRadialGradient(16, 16, 1, 16, 16, 16); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.35, 'rgba(255,190,90,.8)'); gr.addColorStop(1, 'rgba(255,150,40,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    this.sparks = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.22, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); this.sparks.visible = false; this.sparks.frustumCulled = false; this.g.add(this.sparks);
  }
  /* 은신처를 그릴 때마다(main.js syncHideoutProps) — S.fac · S.build 가 바뀐 때만 다시 합침 · 단계가 오른 시설이 있으면 연출 */
  sync(hide, S) {
    if (this.g.parent !== hide) hide.add(this.g);
    const lv = {}; for (const k in SLOT) lv[k] = S.fac?.[k] || 0;
    const up = this.seen ? Object.keys(SLOT).filter(k => lv[k] > (this.seen[k] || 0)) : [];
    this.seen = lv; this.S = S;
    if (up.length) this.pending = up[up.length - 1];
    if (!job) loadHome().then(() => this.rebuild(true)).catch(e => console.warn('은신처 소품', e)); else if (MODELS.o_build) this.rebuild();
    /* 조명 단계 = 은신처 등 밝기 */
    const L = hide.userData.lamp; if (L) L.intensity = [8, 10, 13, 17][stageOf('lights', lv.lights)];
  }
  rebuild(force) {
    const S = this.S; if (!S) return; const list = []; let key = '';
    for (const k in SLOT) { const st = stageOf(k, S.fac?.[k] || 0); const building = S.build?.k === k; key += st + (building ? 'b' : '') + ',';
      if (st) list.push({ key: `o_${k}_${st}`, M: slotM(k) });
      if (FACILITIES[k]?.x4 && (S.fac?.[k] || 0) >= 4 && STAR_AT[k]) { key += '*'; list.push({ key: 'o_star4', M: slotM(k).multiply(new THREE.Matrix4().makeTranslation(STAR_AT[k][0], 0, STAR_AT[k][1])) }); } /* M5-C 끝 단계 금빛 표식 */
      if (building) { const M = slotM(k); if (st) M.multiply(new THREE.Matrix4().makeTranslation(0, 0, 1.1)); list.push({ key: 'o_build', M }); } }
    /* M5-D 가구: 같은 두 덩어리(빛 받음 · 빛남)에 합침 → 그리기 수 그대로 (furn_ui.js 가 extra 를 닮) */
    const ex = this.extra?.(S); if (ex) { list.push(...ex.list); key += '|' + ex.key; }
    if (key !== this.key || force) {
      this.key = key; const G = merge(list);
      for (const k of ['pal', 'glow']) { const m = this.meshes[k]; if (m) { this.g.remove(m); m.geometry.dispose(); delete this.meshes[k]; }
        if (G[k]) { const mesh = new THREE.Mesh(G[k], this.mats[k]); mesh.name = 'fac_' + k; mesh.castShadow = k === 'pal'; mesh.receiveShadow = k === 'pal'; this.meshes[k] = mesh; this.g.add(mesh); } }
    }
    /* 연출 시작은 hideCam 에서 (은신처 화면이 보일 때만 — 출격 준비 · 판 안에서는 기다림) */
  }
  onHome() { const a = this.app; return !a.raid && a.ui?.root?.className === 'scr-hideout' && !!a.scene?.getObjectByName('hideout')?.visible; }
  /* 연출 즉시 끝내기 — 띠 · 번쩍 · 불티 · 누르기 듣기 · 초소 보기 되돌림. 못 본 시설은 pending 으로 남겨 다음 은신처에서 다시 */
  abort() {
    const c = this.cine; if (!c) return; this.cine = null;
    if (c.t < 2.6) this.pending = c.k;
    this.bannerEl?.remove(); this.bannerEl = null; document.querySelectorAll('.facdone').forEach(d => d.remove());
    this.flash.intensity = 0; this.sparks.visible = false; if (this.stopFn) { removeEventListener('pointerdown', this.stopFn, { capture: true }); this.stopFn = null; }
    const home = this.app.story?.home; if (!c.wasLook && home?.look) { home.look = false; home.el?.classList.remove('look'); home.el?.querySelector('.lookcap')?.remove(); } this.lookK = 0;
  }
  /* 공사 끝 연출 — 카메라가 그 자리로 다가가 번쩍 · 불티 · 반짝 소리 → 제자리 */
  celebrate(k) {
    if (!SLOT[k]) return; const [x, z] = SLOT[k]; const h = { gym: 0.2, dock: 0.4 }[k] ?? 0.8;
    const at = new THREE.Vector3(x, h, z); const dir = new THREE.Vector3(-x * 0.3, 0, 9.4 - z).normalize();
    this.cine = { k, t: 0, at, eye: at.clone().addScaledVector(dir, 3.4).add(new THREE.Vector3(0, 7.0, 0)) /* 검수 M4 Top 8: 더 내려다봄 → 앞 소품이 아래 '초소' 카드 위로 크게 뜨지 않음 */, from: null, look0: null, rang: false, dir };
    this.flash.position.set(x, h + 1.2, z + 0.4);
    /* 평소 화면은 아래 판이 3D 를 거의 덮음 → 연출 동안만 '초소 보기'로 (끝나면 원래대로) */
    const home = this.app.story?.home; const el = home?.el;
    this.cine.wasLook = !!home?.look; if (el?.isConnected && !home.look) { try { home.setLook(el, true, true); } catch { /* */ } }
    this.banner(k);
    const stop = () => { if (this.cine && this.cine.t < 2.6) this.cine.t = 2.6; };
    addEventListener('pointerdown', stop, { once: true, capture: true }); this.stopFn = stop;
  }
  /* 화면 위 금빛 띠: '작업대 · 완성' (단계 그림 이름) — 연출과 같이 사라짐 */
  banner(k) {
    this.bannerEl?.remove(); const F = FACILITIES[k]; const lv = this.S?.fac?.[k] || 0; const st = stageOf(k, lv);
    const d = document.createElement('div'); d.className = 'facdone';
    d.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 76px);transform:translate(-50%,-12px);opacity:0;transition:opacity .35s,transform .35s;z-index:60;pointer-events:none;padding:10px 18px;border-radius:14px;background:linear-gradient(180deg,rgba(60,42,14,.92),rgba(30,22,10,.92));border:1px solid rgba(255,206,120,.55);box-shadow:0 6px 24px rgba(0,0,0,.45),0 0 24px rgba(255,190,90,.25);color:#ffe6b0;text-align:center;font-weight:700;white-space:nowrap';
    d.innerHTML = `<div style="font-size:12px;opacity:.8;font-weight:600;letter-spacing:.04em">공사 끝 · ${lv}단계</div><div style="font-size:18px;margin-top:2px">${F?.icon || ''} ${F?.name || k} · ${['', '자리를 잡았어요', '손봐서 고쳤어요', '완성!'][st]}</div>`;
    document.body.appendChild(d); this.bannerEl = d; requestAnimationFrame(() => { d.style.opacity = '1'; d.style.transform = 'translate(-50%,0)'; });
  }
  camTick(cam, dt) {
    const c = this.cine; if (!c) return false;
    if (!c.from) { c.from = cam.position.clone(); const f = new THREE.Vector3(); cam.getWorldDirection(f); c.look0 = c.from.clone().addScaledVector(f, 12); }
    c.t += dt; const T1 = 1.0, T2 = 2.6, T3 = 3.5; const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    /* 보는 점 = 시설 조금 아래 (시설이 화면 위 1/3 쯤 — 아래는 '초소' 글 · 버튼) */
    const look = c.at.clone().add(new THREE.Vector3(0, -0.6, 0)).addScaledVector(c.dir, 0.3); /* 위에서 내려다봄 — 시설은 화면 가운데 (금빛 띠 아래 · 초소 카드 위) */
    let k;
    if (c.t < T1) k = ease(c.t / T1); else if (c.t < T2) k = 1; else k = 1 - ease(Math.min(1, (c.t - T2) / (T3 - T2)));
    cam.position.lerpVectors(c.from, c.eye, k); const L = c.look0.clone().lerp(look, k); cam.lookAt(L);
    /* 도착: 번쩍 + 불티 + 반짝 */
    if (c.t >= T1 * 0.85 && !c.rang) { c.rang = true; try { sfx.rare?.(); } catch { /* */ } this.burst(c.at); }
    const fl = c.t < T1 * 0.85 ? 0 : Math.max(0, 1 - (c.t - T1 * 0.85) / 1.4); this.flash.intensity = 26 * fl * fl;
    this.sparkTick(dt);
    if (c.t >= T2 && this.bannerEl) { const d = this.bannerEl; this.bannerEl = null; d.style.opacity = '0'; setTimeout(() => d.remove(), 400); }
    if (c.t >= T3) { this.cine = null; this.flash.intensity = 0; this.sparks.visible = false; if (this.stopFn) removeEventListener('pointerdown', this.stopFn, { capture: true });
      const home = this.app.story?.home; if (!c.wasLook && home?.look && home.el?.isConnected) { try { home.setLook(home.el, false); } catch { /* */ } this.lookK = 0; }
      return false; }
    return true;
  }
  /* '초소 보기': 아래 판이 내려가 3D 가 화면 거의 전부 → 뒤로 · 위로 물러나 방 전체(양옆 시설 · 앞 수조 · 선착장)를 보여 줌 */
  lookCam(cam, t, dt) {
    const want = this.app.story?.home?.look && this.app.ui?.root?.className === 'scr-hideout' ? 1 : 0; this.lookK += (want - this.lookK) * Math.min(1, dt * 3.5);
    if (this.lookK < 0.002) { this.lookK = 0; return false; }
    const k = this.lookK, sw = Math.sin(t * 0.15);
    const L = this.LOOK; cam.position.set(sw * (0.8 - 0.3 * k), 7.2 + L.y * k, 9.4 + L.z * k); cam.lookAt(0, -1.4 + L.ly * k, -1.8 + L.lz * k);
    return true;
  }
  burst(at) {
    const { n, v, life } = this.sp; const P = this.sparks.geometry.attributes.position;
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 0.6 + Math.random() * 1.6; v[i * 3] = Math.cos(a) * s; v[i * 3 + 1] = 1.5 + Math.random() * 2.2; v[i * 3 + 2] = Math.sin(a) * s; life[i] = 0.8 + Math.random() * 0.9; P.setXYZ(i, at.x + (Math.random() - 0.5) * 0.8, at.y + Math.random() * 0.4, at.z + (Math.random() - 0.5) * 0.6); }
    P.needsUpdate = true; this.sparks.visible = true;
  }
  sparkTick(dt) {
    if (!this.sparks.visible) return; const { n, v, life } = this.sp; const P = this.sparks.geometry.attributes.position; let alive = 0;
    for (let i = 0; i < n; i++) { if (life[i] <= 0) { P.setY(i, -50); continue; } life[i] -= dt; alive++; v[i * 3 + 1] -= 4.2 * dt; P.setXYZ(i, P.getX(i) + v[i * 3] * dt, Math.max(0.05, P.getY(i) + v[i * 3 + 1] * dt), P.getZ(i) + v[i * 3 + 2] * dt); }
    P.needsUpdate = true; this.sparks.material.opacity = 1; if (!alive) this.sparks.visible = false;
  }
  /* 시험 · 캡처용 */
  info() { return { key: this.key, calls: Object.keys(this.meshes).length, tris: Object.values(this.meshes).reduce((s, m) => s + m.geometry.index.count / 3, 0), cine: !!this.cine }; }
}
