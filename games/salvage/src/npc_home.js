// 은신처 인물 3D (M3-C · v0.6) — 합류한 인물만 초소에 섬 · 탭하면 대화(story.chat) · 할 말 있으면 머리 위 '…'(글자 — 그리기 0)
//  모델 = assets/npc/<id>.glb (tools/npc3d · 주인공과 같은 뼈 + 'Idle' 하나 · 메시 한 덩어리) → 인물당 그리기 1 (그림자 안 그림)
//  발밑 그림자 = 원 하나를 인물 수만큼 InstancedMesh 로 (전부 합쳐 그리기 1)
//  몽이: 가끔 인물 하나에게 깡충깡충 다가가 마주 보고(인물도 몽이 쪽으로 몸을 돌림) 다시 제자리 · 인물을 누르면 그 발치로 먼저 달려감
//  main.js 를 건드리지 않음: 은신처 묶음(scene 'hideout')에 붙고, 은신처가 보일 때만 자기 rAF 로 움직임
import * as THREE from 'three';
import { GLTFLoader } from '../lib/GLTFLoader.js?v=0.99.20';
import { MeshoptDecoder } from '../lib/meshopt_decoder.module.js?v=0.99.20';
import { heroMat, HERO_SCALE } from './hero.js?v=0.99.20';
import { S, today } from './save.js?v=0.99.20';
import * as ST from './story.js?v=0.99.20';
import { sfx, unlock } from './audio.js?v=0.99.20';
import { FACILITIES, FAC_TOTAL } from './data.js?v=0.99.20';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
/* 자리 [x, z, 바라보는 방향] — 은신처 카메라(main.js: 높이 7.2 · 뒤 9.4)에 세로 폰에서 다 보이게 (뒤 줄 x ±3 · 앞 줄 ±2.4)
 *  그 사람 일터 쪽: 모루 = 모루대 · 작업대 / 서리 = 선반 / 곰방 = 의자 뒤 상자 / 느루 = 부엌(왼쪽) / 해담 = 의자 앞 / 바람 = 문 앞 바닥 */
export const SPOT = {
  moru:    [-2.0, -3.9, 0.35],
  seori:   [0.9, -4.5, -0.1],
  gombang: [2.4, -4.0, -0.5],
  neuru:   [-1.95, -2.05, 0.75],
  haedam:  [1.95, -0.3, -0.7],
  baram:   [-1.55, 1.1, 0.6],
};
const SCALE = 0.62 * HERO_SCALE / 0.78;   /* 은신처 주인공과 같은 배율 */
const PET_HOME = new THREE.Vector3(0.9, 0, -1.0);
const files = {};
const loadNpc = id => (files[id] ||= loader.loadAsync(`assets/npc/${id}.glb`));

export class NpcHome {
  constructor(app, story) {
    this.app = app; this.story = story; this.npcs = {}; this.g = new THREE.Group(); this.g.name = 'npcs';
    this.shadow = null; this.t = 0; this.next = 6; this.pet = null; this.raf = 0; this.last = 0; this.dots = null; this.v = new THREE.Vector3();
  }
  hideGroup() { return this.app.scene?.getObjectByName('hideout') || null; }
  /* 은신처 화면을 그릴 때마다 (story.decorate) — 합류한 인물 맞추기 · 탭 · 머리 위 표시 */
  sync(el) {
    this.el = el; const hide = this.hideGroup(); if (!hide) { clearTimeout(this.retry); this.retry = setTimeout(() => this.el?.isConnected && this.sync(this.el), 120); return; }
    if (this.g.parent !== hide) hide.add(this.g);
    const want = ST.lit(S).filter(k => SPOT[k]);
    for (const id of Object.keys(this.npcs)) if (!want.includes(id)) { this.g.remove(this.npcs[id].root); delete this.npcs[id]; }
    for (const id of want) if (!this.npcs[id]) this.add(id);
    this.layShadows();
    this.el = el; this.bindTap(el); this.bindLook(el); this.start();
  }
  /* '초소 보기': 아래 판(시설 · 의뢰 …)을 내려 초소 3D 를 크게 보여 줌 · 인물 이름표 · 누르면 대화 — 인물이 하나라도 있을 때 */
  bindLook(el) {
    const sp = el.querySelector('.spacer'); if (!sp || el.querySelector('.lookpill')) return;
    const n = ST.lit(S).filter(k => SPOT[k]).length; if (!n) return;
    const b = document.createElement('button'); b.className = 'lookpill'; b.id = 'lookBtn'; b.innerHTML = '<i></i><span>초소 보기</span>'; sp.appendChild(b);
    b.onclick = e => { e.stopPropagation(); try { unlock(); sfx.ui?.(); } catch { /* */ } this.setLook(el, true); };
    if (this.look) this.setLook(el, true, true);
  }
  setLook(el, on, quiet) {
    this.look = on; el.classList.toggle('look', on); el.querySelector('.lookcap')?.remove();
    if (!on) return;
    const cap = document.createElement('div'); cap.className = 'lookcap'; cap.innerHTML = `<div class="lookhead"><b>등불 수색대 초소</b><small>인물을 누르면 이야기를 나눠요</small>${this.facLine()}</div><div class="lookbtns"><button class="btn lookfurn" id="lookFurn">가구 놓기</button><button class="btn lookback" id="lookBack">돌아가기</button></div>`; el.appendChild(cap);
    cap.addEventListener('click', e => { if (e.target.closest('#lookFurn')) { e.stopPropagation(); try { sfx.ui?.(); } catch { /* */ } this.app.furn?.open('look'); return; } if (e.target.closest('#lookBack')) { e.stopPropagation(); try { sfx.ui?.(); } catch { /* */ } this.setLook(el, false); return; } const id = this.pick(e.clientX, e.clientY); if (id) this.tapNpc(id); });
    if (!quiet) this.next = Math.min(this.next, 1.2); /* 들어오면 몽이가 곧 누군가에게 다가감 */
  }
  /* 초소 보기 아래 빈자리: 초소 살림 진행 · 지금 공사 (M4-D — 시설 단계 소품이 위 3D 에 보임) */
  facLine() {
    const ks = Object.keys(FACILITIES); const lv = ks.reduce((a, k) => a + Math.min(S.fac?.[k] || 0, FACILITIES[k].levels.length), 0); const full = ks.filter(k => (S.fac?.[k] || 0) >= FACILITIES[k].levels.length).length;
    const b = S.build && FACILITIES[S.build.k]; const left = b ? Math.max(0, S.build.until - Date.now()) / 1000 : 0;
    const t = left >= 3600 ? `${Math.floor(left / 3600)}시간 ${Math.floor(left % 3600 / 60)}분` : `${Math.ceil(left / 60)}분`;
    return `<span class="lookfac"><i style="width:${(lv / FAC_TOTAL * 100).toFixed(1)}%"></i></span><small class="lookfacn">초소 살림 ${lv} / ${FAC_TOTAL}단계 · 완성한 시설 ${full} / ${ks.length}${b ? ` · ${b.icon} ${b.name} 공사 중 (${t} 남음)` : ''}</small>`;
  }
  async add(id) {
    this.npcs[id] = { id, root: null, pending: true };
    let gl; try { gl = await loadNpc(id); } catch (e) { console.warn('인물 3D', id, e); delete this.npcs[id]; return; }
    const N = this.npcs[id]; if (!N || N.root) return;
    const root = gl.scene; root.scale.setScalar(SCALE); const [x, z, ry] = SPOT[id]; root.position.set(x, 0, z); root.rotation.y = ry;
    const meshes = [];
    root.traverse(o => { if (!o.isMesh) return; const t = o.material.map; if (t) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; }
      o.material = heroMat(t); o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; o.userData.npc = id; meshes.push(o); });
    const mixer = new THREE.AnimationMixer(root); if (gl.animations[0]) { const a = mixer.clipAction(gl.animations[0]); a.play(); a.time = (Object.keys(this.npcs).indexOf(id) * 0.37) % (gl.animations[0].duration || 1); }
    Object.assign(N, { root, mixer, meshes, base: ry, turn: ry, bob: 0, pending: false, h: 1.75 * SCALE / 0.8 });
    this.g.add(root); root.updateMatrixWorld(true); mixer.update(0); const bb = new THREE.Box3().setFromObject(root, true); if (isFinite(bb.max.y) && bb.max.y > 0.4) N.h = bb.max.y; /* 인물마다 키 (이름표 · 누르기 높이) */
    this.layShadows();
  }
  /* 발밑 그림자 원 (InstancedMesh 하나 = 그리기 1) */
  layShadows() {
    const ids = Object.keys(this.npcs).filter(k => this.npcs[k].root || this.npcs[k].pending);
    if (!this.shadow || this.shadow.count < ids.length) {
      if (this.shadow) { this.g.remove(this.shadow); this.shadow.geometry.dispose(); }
      const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      const m = this.shadowMat ||= new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
      this.shadow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.5, 1.5).rotateX(-Math.PI / 2), m, 6); this.shadow.renderOrder = -1; this.shadow.frustumCulled = false; this.g.add(this.shadow);
    }
    const M = new THREE.Matrix4(); let i = 0;
    for (const id of Object.keys(this.npcs)) { const N = this.npcs[id]; if (!N.root) continue; M.makeTranslation(N.root.position.x, 0.03, N.root.position.z); this.shadow.setMatrixAt(i++, M); }
    this.shadow.count = i; this.shadow.instanceMatrix.needsUpdate = true;
  }
  /* 탭: 3D 가 보이는 띠(.spacer) 빈자리를 누르면 그 자리 인물 → 대화 */
  bindTap(el) {
    const sp = el.querySelector('.spacer'); if (!sp || sp.dataset.npc) return; sp.dataset.npc = '1';
    sp.addEventListener('click', e => { if (e.target.closest('button, .post')) return; const id = this.pick(e.clientX, e.clientY); if (id) { e.stopPropagation(); this.tapNpc(id); } });
  }
  pick(cx, cy) {
    const cam = this.app.camera; const cv = this.app.renderer?.domElement; if (!cam || !cv) return null; const r = cv.getBoundingClientRect();
    let best = null, bd = 1e9;
    for (const N of Object.values(this.npcs)) { if (!N.root) continue;
      /* 몸통 가운데 · 머리를 화면에 찍어 그 사이 막대와의 거리 (뼈 메시 광선 검사보다 싸고 손가락에 너그러움) */
      const a = this.v.set(N.root.position.x, N.h * 0.3, N.root.position.z).project(cam); const ax = (a.x + 1) / 2 * r.width + r.left, ay = (1 - a.y) / 2 * r.height + r.top;
      const b2 = this.v.set(N.root.position.x, N.h * 0.95, N.root.position.z).project(cam); const bx = (b2.x + 1) / 2 * r.width + r.left, by = (1 - b2.y) / 2 * r.height + r.top;
      const t = Math.max(0, Math.min(1, ((cx - ax) * (bx - ax) + (cy - ay) * (by - ay)) / Math.max(1, (bx - ax) ** 2 + (by - ay) ** 2)));
      const d = Math.hypot(cx - (ax + (bx - ax) * t), cy - (ay + (by - ay) * t)); const w = Math.max(26, Math.abs(ay - by) * 0.45);
      if (d < w && d < bd) { bd = d; best = N.id; } }
    return best;
  }
  tapNpc(id) {
    const N = this.npcs[id]; if (!N || this.story.busy) return; N.bob = 0.5; this.petTo(id, 2.6);
    try { unlock(); sfx.ui?.(); } catch { /* */ }
    setTimeout(() => this.story.chat(id), 260);
  }
  /* 몽이: 인물에게 깡충깡충 → 마주 보기 → 제자리 */
  petTo(id, stay = 2.2) {
    const N = this.npcs[id]; if (!N?.root) return; const p = N.root.position; const dir = new THREE.Vector3(PET_HOME.x - p.x, 0, PET_HOME.z - p.z).normalize();
    this.trip = { id, to: new THREE.Vector3(p.x + dir.x * 0.85, 0, p.z + dir.z * 0.85), phase: 'go', stay, t: 0 };
  }
  start() { if (this.raf) return; this.last = performance.now(); const loop = now => { this.raf = 0; if (!this.visible()) { this.hideDots(); return; } this.update(Math.min(0.1, (now - this.last) / 1000)); this.last = now; this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
  visible() { const h = this.hideGroup(); return !!h && h.visible && !this.app.raid && this.app.ui?.root?.className === 'scr-hideout'; }
  update(dt) {
    this.t += dt; const pet = this.hideGroup()?.userData.pet;
    for (const N of Object.values(this.npcs)) { if (!N.root) continue; N.mixer.update(dt);
      /* 몸 돌리기 (몽이 쪽 / 제자리) · 눌렀을 때 살짝 튐 */
      N.root.rotation.y += (N.turn - N.root.rotation.y) * Math.min(1, dt * 4);
      if (N.bob > 0) { N.bob = Math.max(0, N.bob - dt); const k = Math.sin((0.5 - N.bob) / 0.5 * Math.PI); N.root.scale.set(SCALE * (1 + k * 0.05), SCALE * (1 - k * 0.04), SCALE * (1 + k * 0.05)); N.root.position.y = k * 0.08; } }
    if (pet?.root) this.petTick(pet.root, dt);
    this.drawDots();
  }
  petTick(root, dt) {
    const ids = Object.keys(this.npcs).filter(k => this.npcs[k].root);
    if (!this.trip) { this.next -= dt; if (this.next <= 0 && ids.length && !this.story.busy) { this.next = 8 + Math.random() * 7; this.petTo(ids[Math.floor(Math.random() * ids.length)]); } }
    const tr = this.trip; let target = PET_HOME; let face = null;
    if (tr) { tr.t += dt; const N = this.npcs[tr.id]; if (!N?.root) { this.trip = null; return; }
      if (tr.phase === 'go') { target = tr.to; if (root.position.distanceTo(tr.to) < 0.08) { tr.phase = 'stay'; tr.t = 0; N.turn = Math.atan2(root.position.x - N.root.position.x, root.position.z - N.root.position.z); } }
      if (tr.phase === 'stay') { target = tr.to; face = N.root.position; if (tr.t > tr.stay) { tr.phase = 'back'; N.turn = N.base; } }
      if (tr.phase === 'back') { target = PET_HOME; if (root.position.distanceTo(PET_HOME) < 0.06) { this.trip = null; root.rotation.y = -0.6; } } }
    const d = this.v.copy(target).sub(root.position); d.y = 0; const dist = d.length();
    if (dist > 0.04) { const step = Math.min(dist, dt * 2.6); root.position.addScaledVector(d.normalize(), step); root.rotation.y = Math.atan2(d.x, d.z); this.hop = (this.hop || 0) + step * 5.5; root.position.y = Math.abs(Math.sin(this.hop)) * 0.16; }
    else { root.position.y *= 0.8; if (face) { const want = Math.atan2(face.x - root.position.x, face.z - root.position.z); root.rotation.y += (want - root.rotation.y) * Math.min(1, dt * 6); root.position.y = Math.abs(Math.sin(this.t * 9)) * 0.06 * (tr && tr.t < 1.2 ? 1 : 0); } }
  }
  /* 할 말 있는 인물 머리 위 '…' (글자 · 그리기 0) — 창 줄의 talkdot 과 같은 규칙 */
  drawDots() {
    const el = this.el; if (!el?.isConnected) return; if (!this.look) { if (this.dots) this.hideDots(); return; } /* 평소 화면엔 창 줄의 '…' 만 (겹침 X) */ const cam = this.app.camera; const cv = this.app.renderer?.domElement; if (!cam || !cv) return;
    if (!this.dots || !this.dots.isConnected) { this.dots = document.createElement('div'); this.dots.className = 'npcdots'; el.appendChild(this.dots); }
    const r = cv.getBoundingClientRect(), er = el.getBoundingClientRect(); const d = today(); let html = '';
    for (const N of Object.values(this.npcs)) { if (!N.root) continue; const due = ST.talkDue(S, N.id, d); if (!due && !this.look) continue;
      const a = this.v.set(N.root.position.x, N.h - 0.05 + N.root.position.y, N.root.position.z).project(cam); const x = Math.max(42, Math.min(er.width - 42, (a.x + 1) / 2 * r.width + r.left - er.left)), y = (1 - a.y) / 2 * r.height + r.top - er.top;
      html += this.look ? `<i class="npctag ${due ? 'due' : ''}" data-who="${N.id}" style="transform:translate(${x.toFixed(0)}px,${y.toFixed(0)}px)">${ST.CAST[N.id].name}${due ? '<em>…</em>' : ''}</i>`
        : `<i class="npcdot" data-who="${N.id}" style="transform:translate(${x.toFixed(0)}px,${y.toFixed(0)}px)">…</i>`; }
    const cine = !!this.app.homeFac?.cine; if (this.dots._cine !== cine) { this.dots._cine = cine; this.dots.classList.toggle('cine', cine); } /* M4 마무리: 공사 끝 연출 동안 이름표를 숨김 (위쪽 금빛 띠와 겹침) */
    if (this.dots._h !== html) { this.dots.innerHTML = html; this.dots._h = html; this.dots.querySelectorAll('.npcdot, .npctag').forEach(b => b.onclick = e => { e.stopPropagation(); this.tapNpc(b.dataset.who); }); }
  }
  hideDots() { if (this.dots) { this.dots.remove(); this.dots = null; } }
  /* 시험 · 캡처용 */
  info() { return Object.values(this.npcs).filter(N => N.root).map(N => ({ id: N.id, calls: N.meshes.length, x: N.root.position.x, z: N.root.position.z })); }
}
