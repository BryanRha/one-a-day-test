// 타격감 연출 — 파편 · 탄피 · 물보라 · 총구 불꽃 · 피격 숫자 · 탄 궤적 (전부 풀링 · 한 번에 그림)
//  v0.6.1 (검수 M3 Top 5 · 무기 서명 효과): 궤적 · 호 · 휘두름 잔상 = 띠 묶음 1번 그리기(streak) · 빛 점 · 바닥 빛 = 인스턴스 1번(glow)
//   파티클은 미리 만든 칸을 돌려 씀(쓰레기 0) · 동시 상한 600(저사양 360 · 개수 ×0.6) · 옛 궤적 메시 24개 → 띠 묶음 하나로(그리기 수 줄어듦)
import * as THREE from 'three';

const MAX = 600, MAXS = 320, MAXG = 64;
/* 설정 '화면 흔들림 약하게' (기기에 기억) — main.js 카메라가 흔들림 · 반동에 곱함 */
const FXSET = { shake: 1 };
try { Object.assign(FXSET, JSON.parse(localStorage.getItem('salvage_fx') || '{}')); } catch { /* */ }
export const shakeMul = () => FXSET.shake;
/* M6-C 접근성: 보통 · 약하게(×0.35) · 끔(0) 세 단계 (a11y.js 설정 줄) */
export const SHAKE_STEPS = [{ v: 1, t: '보통' }, { v: 0.35, t: '약하게' }, { v: 0, t: '끔' }];
export const shakeLevel = () => { const i = SHAKE_STEPS.findIndex(s => Math.abs(s.v - FXSET.shake) < 1e-3); return i < 0 ? 0 : i; };
export function setShakeLevel(i) { FXSET.shake = SHAKE_STEPS[Math.max(0, Math.min(SHAKE_STEPS.length - 1, i | 0))].v; try { localStorage.setItem('salvage_fx', JSON.stringify(FXSET)); } catch { /* */ } }
export const shakeLabel = () => '흔들림 · ' + SHAKE_STEPS[shakeLevel()].t;
export function cycleShake() { setShakeLevel((shakeLevel() + 1) % SHAKE_STEPS.length); }

export class FX {
  constructor(scene, hud) {
    this.scene = scene; this.hud = hud;
    /* 작은 조각(파편 · 탄피 · 물방울 · 거품) — 인스턴스 하나로 */
    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true }), MAX);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    scene.add(this.mesh);
    this.pool = Array.from({ length: MAX }, () => ({})); this.n = 0; this.cap = MAX; this.q = 1; this.rr = 0; this.peak = 0;
    this.m4 = new THREE.Matrix4(); this.q4 = new THREE.Quaternion(); this.e = new THREE.Euler(); this.v = new THREE.Vector3(); this.s = new THREE.Vector3(); this.c = new THREE.Color();
    /* 총구 불꽃: 가산 혼합 판 + 빛 (무기마다 색 · 크기 · 세기) */
    const fm = new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, map: radialTex(), fog: false });
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), fm); this.flash.visible = false; scene.add(this.flash);
    this.flashLight = new THREE.PointLight(0xffc070, 0, 9, 1.6); scene.add(this.flashLight); this.flashCol = new THREE.Color(0xffc070);
    /* 띠 묶음: 궤적 · 지그재그 호 · 휘두름 잔상 · 부채꼴 — 사각형 MAXS 개를 한 기하로 (가산 혼합 · 색 = 밝기) */
    const sg = new THREE.BufferGeometry(); this.sp = new Float32Array(MAXS * 12); this.sc = new Float32Array(MAXS * 12);
    const idx = new Uint16Array(MAXS * 6); for (let i = 0; i < MAXS; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
    sg.setAttribute('position', new THREE.BufferAttribute(this.sp, 3).setUsage(THREE.DynamicDrawUsage)); sg.setAttribute('color', new THREE.BufferAttribute(this.sc, 3).setUsage(THREE.DynamicDrawUsage)); sg.setIndex(new THREE.BufferAttribute(idx, 1)); sg.setDrawRange(0, 0);
    this.smesh = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, forceSinglePass: true })); /* 양면 투명은 three 가 두 번 그림 → 한 번만 */
    this.smesh.frustumCulled = false; this.smesh.renderOrder = 5; this.smesh.visible = false; scene.add(this.smesh);
    this.streaks = []; this.camDir = new THREE.Vector3(0, 0.86, 0.51);
    /* 빛 점 · 바닥 빛: 부드러운 원 텍스처 인스턴스 (선 = 카메라를 봄 · flat = 바닥에 누움) */
    this.gmesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: softTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), MAXG);
    this.gmesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.gmesh.frustumCulled = false; this.gmesh.count = 0; this.gmesh.renderOrder = 6;
    this.gmesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXG * 3), 3); scene.add(this.gmesh);
    this.glows = []; this.qFlat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    /* 충격 고리 (물 위 · 처치 · 터짐) — v0.6.1 부터 띠 묶음 안에서 퍼지는 원 (옛 고리 메시 12개 = 그리기 12번 → 0) */
    this.nums = [];
    if (typeof window !== 'undefined' && window.__salvage) window.__salvage.fxStats = () => this.stats(); /* 검사 도구용 */
  }
  stats() { return { parts: this.n, peak: this.peak, streaks: this.streaks.length, glows: this.glows.length, cap: this.cap }; }
  /* 저사양(자동 화질이 낮춤): 상한 · 개수 줄임 */
  lowQ(on) { this.setQ(on ? 360 : MAX, on ? 0.6 : 1); }
  /* M6-D 자동 화질 단계: 입자 상한 · 개수 배율 · 비 줄기(배율 0.5 아래면 절반) */
  setQ(cap, q) { this.cap = Math.min(MAX, cap); this.q = q; this.qSet = true; if (this.n > this.cap) this.n = this.cap; if (this.rain) this.rain.m.count = q < 0.5 ? this.rain.N >> 1 : this.rain.N; }
  /* 칸 하나 받기 — 꽉 차면 오래된 쪽부터 돌려 씀 */
  take() { if (this.n < this.cap) return this.pool[this.n++]; this.rr = (this.rr + 1) % this.n; return this.pool[this.rr]; }
  spawn(o) { Object.assign(this.take(), o); }
  /* v0.4 날씨: 비(폭풍 판) — 빗줄기 260개를 인스턴스 하나로 · 카메라가 보는 곳 둘레에서만 */
  weather(kind) {
    if (kind === 'rain' && !this.rain) {
      const N = 260; const m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 1.1, 0.035), new THREE.MeshBasicMaterial({ color: 0xa8c4e0, transparent: true, opacity: 0.42, depthWrite: false, fog: false }), N);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.renderOrder = 4; this.scene.add(m);
      this.rain = { m, N, d: Array.from({ length: N }, () => ({ x: (Math.random() - 0.5) * 26, y: Math.random() * 14, z: (Math.random() - 0.5) * 34, s: 18 + Math.random() * 8 })) }; if (this.q < 0.5) m.count = N >> 1; /* M6-D 화질 3단계 */
    }
    if (this.rain) this.rain.m.visible = kind === 'rain'; this.rainOn = kind === 'rain';
  }
  updateRain(dt, camera) {
    const R = this.rain; const cx = camera.position.x, cz = camera.position.z - 15; this.e.set(0, 0, 0.22); this.q4.setFromEuler(this.e); this.s.set(1, 1, 1);
    for (let i = 0; i < R.N; i++) { const d = R.d[i]; d.y -= d.s * dt; d.x += 4 * dt;
      if (d.y < 0) { if (Math.random() < 0.08) this.ring(cx + d.x - 13 + 13, cz + d.z, 0.25, 0x9fb8d0); d.y = 12 + Math.random() * 4; d.x = (Math.random() - 0.5) * 26; d.z = (Math.random() - 0.5) * 34; }
      this.v.set(cx + d.x, d.y, cz + d.z); R.m.setMatrixAt(i, this.m4.compose(this.v, this.q4, this.s)); }
    R.m.instanceMatrix.needsUpdate = true;
  }
  /* 파편: 색 · 개수 · 세기 */
  burst(x, y, z, n, color, power = 5, size = 0.12, life = 0.6, grav = 22, dir = null) {
    const c = this.c.set(color); const r = c.r, gg = c.g, b = c.b; n = Math.max(1, Math.round(n * this.q));
    for (let i = 0; i < n; i++) {
      let vx = (Math.random() - 0.5) * 2, vy = Math.random() * 1.2 + 0.3, vz = (Math.random() - 0.5) * 2;
      if (dir) { vx = vx * 0.6 + dir.x * 1.4; vz = vz * 0.6 + dir.z * 1.4; }
      const sp = power * (0.5 + Math.random() * 0.7), o = this.take();
      o.x = x; o.y = y; o.z = z; o.vx = vx * sp; o.vy = vy * sp; o.vz = vz * sp; o.rx = Math.random() * 6; o.ry = Math.random() * 6; o.vr = (Math.random() - 0.5) * 20;
      o.s = size * (0.6 + Math.random() * 0.8); o.t = 0; o.life = life * (0.7 + Math.random() * 0.6); o.g = grav; o.r = r; o.gg = gg; o.b = b; o.bounce = 0.35; o.sx = 1; o.sy = 1; o.sz = 1;
    }
  }
  /* 거품: a → b 줄을 따라 올라가는 작은 방울 (잠수 작살) */
  bubbles(a, b, step = 0.6, color = 0xd8fbff) {
    const L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.min(24, Math.max(2, Math.round(L / step * this.q))), c = this.c.set(color);
    for (let i = 0; i < n; i++) { const u = (i + Math.random() * 0.6) / n, o = this.take();
      o.x = a.x + (b.x - a.x) * u + (Math.random() - 0.5) * 0.25; o.y = a.y + (b.y - a.y) * u + (Math.random() - 0.5) * 0.2; o.z = a.z + (b.z - a.z) * u + (Math.random() - 0.5) * 0.25;
      o.vx = (Math.random() - 0.5) * 0.6; o.vy = 0.6 + Math.random() * 1.2; o.vz = (Math.random() - 0.5) * 0.6; o.rx = 0; o.ry = 0; o.vr = 3; o.s = 0.07 + Math.random() * 0.08; o.t = -u * 0.12; o.life = 0.55 + Math.random() * 0.5 + u * 0.12;
      o.g = -2.5; o.r = c.r; o.gg = c.g; o.b = c.b; o.bounce = 0; o.sx = 1; o.sy = 1; o.sz = 1; }
  }
  /* 탄피: 옆으로 튀어 바닥에서 통통 (첫 닿음 ≈ 0.46~0.58초 — audio.js 탄피 소리가 이 때) */
  shell(x, y, z, side, color = null) {
    const o = this.take(); o.x = x; o.y = y; o.z = z; o.vx = side.x * (3 + Math.random() * 2) + (Math.random() - 0.5); o.vy = 4 + Math.random() * 2; o.vz = side.z * (3 + Math.random() * 2) + (Math.random() - 0.5);
    o.rx = 0; o.ry = 0; o.vr = 25; o.s = 0.07; o.sx = 1; o.sy = 1; o.sz = 2.4; o.t = 0; o.life = 1.4; o.g = 26; o.bounce = 0.45;
    if (color) { const c = this.c.set(color); o.r = c.r; o.gg = c.g; o.b = c.b; } else { o.r = 0.95; o.gg = 0.75; o.b = 0.3; }
  }
  /* 총구 불꽃: o = { size, light, color } (무기 표 FEEL) */
  muzzle(pos, dir, o = {}) {
    const sz = o.size ?? 1; if (sz <= 0) return;
    this.flash.visible = true; this.flash.position.copy(pos); this.flash.lookAt(pos.x, pos.y + 10, pos.z); this.flash.rotation.z = Math.random() * 6; this.flash.scale.setScalar((0.8 + Math.random() * 0.6) * sz); this.flashT = 0.05;
    this.flash.material.color.set(o.color ?? 0xffe2a0);
    this.lamp(pos, o.light ?? 26, o.color ?? 0xffc070);
  }
  /* 빛 하나를 옮겨 켬 (총구 · 감전 · 터짐) — 빛 수가 바뀌면 셰이더를 다시 만드니 늘 하나만 */
  lamp(pos, I, color) { this.flashLight.position.copy(pos); this.flashLight.intensity = I; this.flashLight.color.set(color); }
  /* 탄 궤적 (옛 이름 그대로 · 띠 묶음으로) */
  tracer(a, b, o = {}) { this.streak(a, b, { w: o.w ?? 0.07, life: o.life ?? 0.08, color: o.color ?? 0xfff0c0, tail: o.tail ?? 0.35 }); }
  /* 띠: a → b · o = { w 두께 · w1 끝 두께 · life · color · tail 시작 쪽 밝기(0~1) · zig 지그재그 폭 · seg 마디 수 · shrink 사라지며 가늘어짐 } */
  streak(a, b, o = {}) {
    if (this.streaks.length >= 96) this.streaks.shift();
    const s = { ax: a.x, ay: a.y, az: a.z, bx: b.x, by: b.y, bz: b.z, w0: o.w ?? 0.1, w1: o.w1 ?? o.w ?? 0.1, life: o.life ?? 0.1, t: 0, c: new THREE.Color(o.color ?? 0xffffff), tail: o.tail ?? 1, zig: o.zig || 0, seg: o.seg || (o.zig ? 7 : 1), shrink: o.shrink ?? 0.5, pts: null, jt: 0, pw: o.pw ?? 1 };
    this.streaks.push(s); return s;
  }
  /* 호(바닥과 나란한 원호): 가운데 · 반지름 · 시작/끝 각(라디안, atan2(x, z) 기준) · 휘두름 잔상 · 산탄 부채꼴 */
  arc(cx, y, cz, r, a0, a1, o = {}) {
    if (this.streaks.length >= 96) this.streaks.shift();
    const seg = o.seg || 9, pts = []; for (let i = 0; i <= seg; i++) { const a = a0 + (a1 - a0) * i / seg; pts.push([cx + Math.sin(a) * r, y, cz + Math.cos(a) * r]); }
    const s = { pts, w0: o.w ?? 0.4, w1: o.w1 ?? o.w ?? 0.4, life: o.life ?? 0.16, t: 0, c: new THREE.Color(o.color ?? 0xffffff), tail: o.tail ?? 0.1, zig: 0, seg, shrink: o.shrink ?? 0.6, flat: true, pw: o.pw ?? 1.4 };
    this.streaks.push(s); return s;
  }
  /* 빛 점: o = { s 크기 · s1 끝 크기 · life · color · flat 바닥 · flick 깜빡임 · i 세기 · vx vy vz g (날아가는 빛 — 조명탄) } */
  glow(x, y, z, o = {}) {
    if (this.glows.length >= MAXG) this.glows.shift();
    const g = { x, y, z, s0: o.s ?? 1, s1: o.s1 ?? o.s ?? 1, life: o.life ?? 0.15, t: 0, c: new THREE.Color(o.color ?? 0xffffff), i: o.i ?? 1, flat: !!o.flat, flick: o.flick || 0, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, g: o.g || 0, fade: o.fade ?? 1 };
    this.glows.push(g); return g;
  }
  ring(x, z, s = 1, color = 0xbfe8ee) {
    const seg = s > 1.5 ? 20 : s < 0.6 ? 8 : 14; let o = null, n = 0;
    for (const q of this.streaks) if (q.ring) { n++; if (!o) o = q; } /* 동시 16개까지 (옛 풀 12개처럼) — 넘으면 가장 오래된 고리를 다시 씀 */
    if (n < 16 || !o) { if (this.streaks.length >= 96) this.streaks.shift(); o = { ring: {}, c: new THREE.Color() }; this.streaks.push(o); }
    Object.assign(o.ring, { x, z, s }); o.c.set(color).multiplyScalar(0.75);
    Object.assign(o, { pts: o.seg === seg ? o.pts : null, w0: 0.3, w1: 0.3, life: 0.45, t: 0, tail: 1, zig: 0, seg, shrink: 0, pw: 1 });
  }
  /* 숫자 (DOM) — 세계 좌표 → 화면 좌표는 매 프레임 */
  num(pos, text, cls = '') {
    const el = document.createElement('div'); el.className = 'num ' + cls; el.textContent = text; this.hud.appendChild(el);
    this.nums.push({ el, p: pos.clone(), t: 0, dx: (Math.random() - 0.5) * 30 });
  }
  update(dt, camera, W, H) {
    if (this.rainOn) this.updateRain(dt, camera);
    if (!this.qSet) { const lowNow = typeof window !== 'undefined' && !!window.__salvage?.lowGfx; if (lowNow !== this.low) { this.low = lowNow; this.lowQ(lowNow); } } /* M6-D: 단계(setQ)를 쓰면 그쪽이 정함 */
    const m = this.mesh, P = this.pool; this.peak = Math.max(this.peak, this.n);
    for (let i = this.n - 1; i >= 0; i--) {
      const o = P[i]; o.t += dt; if (o.t >= o.life) { this.n--; if (i !== this.n) { P[i] = P[this.n]; P[this.n] = o; } continue; }
      if (o.t < 0) continue;
      o.vy -= o.g * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; o.rx += o.vr * dt; o.ry += o.vr * 0.7 * dt;
      if (o.y < 0.08) { o.y = 0.08; o.vy = -o.vy * o.bounce; o.vx *= 0.6; o.vz *= 0.6; o.vr *= 0.5; }
    }
    let n = 0;
    for (let i = 0; i < this.n; i++) { const o = P[i]; if (o.t < 0) continue;
      const k = 1 - Math.max(0, (o.t - o.life * 0.6) / (o.life * 0.4)); const s = o.s * k;
      this.e.set(o.rx, o.ry, 0); this.q4.setFromEuler(this.e); this.v.set(o.x, o.y, o.z); this.s.set(s * o.sx, s * o.sy, s * o.sz);
      m.setMatrixAt(n, this.m4.compose(this.v, this.q4, this.s)); this.c.setRGB(o.r, o.gg, o.b); m.setColorAt(n, this.c); n++;
    }
    m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) { this.flash.visible = false; } }
    this.flashLight.intensity *= Math.pow(0.0005, dt);
    camera.getWorldDirection(this.camDir).negate(); this.updateStreaks(dt, camera); this.updateGlows(dt, camera);
    for (let i = this.nums.length - 1; i >= 0; i--) {
      const o = this.nums[i]; o.t += dt; if (o.t > 0.75) { o.el.remove(); this.nums.splice(i, 1); continue; }
      this.v.copy(o.p); this.v.y += 1.8 + o.t * 1.2; this.v.project(camera);
      const x = (this.v.x * 0.5 + 0.5) * W + o.dx * o.t, y = (-this.v.y * 0.5 + 0.5) * H; const sc = o.t < 0.08 ? 0.6 + o.t * 8 : 1.2 - Math.min(0.3, (o.t - 0.08));
      o.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(${sc})`; o.el.style.opacity = o.t > 0.5 ? 1 - (o.t - 0.5) / 0.25 : 1;
    }
  }
  /* 띠 묶음 다시 쌓기: 마디마다 사각형 하나 · 옆 방향 = 마디 × 카메라 방향 (화면에서 늘 같은 두께) */
  updateStreaks(dt, camera) {
    const L = this.streaks; if (!L.length) { if (this.smesh.visible) { this.smesh.visible = false; this.smesh.geometry.setDrawRange(0, 0); } return; }
    const cd = this.camDir, P = this.sp, C = this.sc; let q = 0;
    for (let i = L.length - 1; i >= 0; i--) { const s = L[i]; s.t += dt; if (s.t >= s.life) L.splice(i, 1); }
    for (const s of L) {
      const u = s.t / s.life, f = Math.pow(1 - u, s.pw), wk = 1 - s.shrink * u;
      if (s.zig) { s.jt -= dt; if (!s.pts || s.jt <= 0) { s.jt = 0.035; s.pts = zigPts(s); } }
      if (s.ring) { const R = s.ring, sc = 0.3 + u * 1.6 * R.s, r = 0.85 * sc; s.w0 = s.w1 = 0.3 * sc; const pts = s.pts ||= Array.from({ length: s.seg + 1 }, () => [0, 0.16, 0]);
        for (let i = 0; i <= s.seg; i++) { const a = i / s.seg * Math.PI * 2; pts[i][0] = R.x + Math.sin(a) * r; pts[i][2] = R.z + Math.cos(a) * r; } }
      const pts = s.pts || [[s.ax, s.ay, s.az], [s.bx, s.by, s.bz]], nseg = pts.length - 1;
      for (let j = 0; j < nseg && q < MAXS; j++, q++) {
        const p0 = pts[j], p1 = pts[j + 1], u0 = j / nseg, u1 = (j + 1) / nseg;
        let dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2];
        let sx = dy * cd.z - dz * cd.y, sy = dz * cd.x - dx * cd.z, sz = dx * cd.y - dy * cd.x; const sl = Math.hypot(sx, sy, sz) || 1; sx /= sl; sy /= sl; sz /= sl;
        const w0 = (s.w0 + (s.w1 - s.w0) * u0) * 0.5 * wk, w1 = (s.w0 + (s.w1 - s.w0) * u1) * 0.5 * wk;
        const k0 = f * (s.tail + (1 - s.tail) * u0), k1 = f * (s.tail + (1 - s.tail) * u1), o = q * 12;
        P[o] = p0[0] - sx * w0; P[o + 1] = p0[1] - sy * w0; P[o + 2] = p0[2] - sz * w0; P[o + 3] = p0[0] + sx * w0; P[o + 4] = p0[1] + sy * w0; P[o + 5] = p0[2] + sz * w0;
        P[o + 6] = p1[0] - sx * w1; P[o + 7] = p1[1] - sy * w1; P[o + 8] = p1[2] - sz * w1; P[o + 9] = p1[0] + sx * w1; P[o + 10] = p1[1] + sy * w1; P[o + 11] = p1[2] + sz * w1;
        C[o] = C[o + 3] = s.c.r * k0; C[o + 1] = C[o + 4] = s.c.g * k0; C[o + 2] = C[o + 5] = s.c.b * k0;
        C[o + 6] = C[o + 9] = s.c.r * k1; C[o + 7] = C[o + 10] = s.c.g * k1; C[o + 8] = C[o + 11] = s.c.b * k1;
      }
    }
    const g = this.smesh.geometry; g.setDrawRange(0, q * 6); g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; this.smesh.visible = q > 0;
  }
  updateGlows(dt, camera) {
    const L = this.glows, m = this.gmesh; if (!L.length) { m.count = 0; return; }
    let n = 0;
    for (let i = L.length - 1; i >= 0; i--) { const g = L[i]; g.t += dt; if (g.t >= g.life) { L.splice(i, 1); continue; } if (g.vx || g.vy || g.vz || g.g) { g.vy -= g.g * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt; } }
    for (const g of L) {
      const u = g.t / g.life, k = g.i * (g.fade ? 1 - Math.pow(u, 1.6 * g.fade) : 1) * (g.flick ? 1 - g.flick * Math.random() : 1), s = g.s0 + (g.s1 - g.s0) * Math.min(1, u * 1.5);
      this.v.set(g.x, g.y, g.z); if (!g.flat) this.v.addScaledVector(this.camDir, 1.1); /* 카메라 쪽으로 당겨 맞은 몸에 안 묻힘 */ this.s.set(s, s, s); m.setMatrixAt(n, this.m4.compose(this.v, g.flat ? this.qFlat : camera.quaternion, this.s));
      this.c.setRGB(g.c.r * k, g.c.g * k, g.c.b * k); m.setColorAt(n, this.c); n++;
    }
    m.count = n; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
  }
  clear() {
    this.n = 0; this.mesh.count = 0; for (const o of this.nums) o.el.remove(); this.nums.length = 0;
    this.streaks.length = 0; this.smesh.visible = false; this.smesh.geometry.setDrawRange(0, 0); this.glows.length = 0; this.gmesh.count = 0;
    this.flash.visible = false; this.flashLight.intensity = 0;
  }
}
/* 지그재그: a → b 를 seg 마디로 · 가운데일수록 크게 옆으로 흔듦 (매 0.035초 새로) */
function zigPts(s) {
  const pts = [], dx = s.bx - s.ax, dz = s.bz - s.az, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
  for (let i = 0; i <= s.seg; i++) { const u = i / s.seg, j = i === 0 || i === s.seg ? 0 : (Math.random() - 0.5) * 2 * s.zig * Math.sin(u * Math.PI) ** 0.5;
    pts.push([s.ax + dx * u + nx * j, s.ay + (s.by - s.ay) * u + (Math.random() - 0.5) * s.zig * 0.4 * (i % s.seg ? 1 : 0), s.az + dz * u + nz * j]); }
  return pts;
}
function radialTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.25, 'rgba(255,210,120,0.9)'); g.addColorStop(1, 'rgba(255,120,30,0)');
  x.fillStyle = g; x.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = i % 2 ? 14 : 32; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/* 빛 점: 흰 가운데 → 부드럽게 0 (색은 인스턴스 색으로) */
function softTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,0.75)'); g.addColorStop(0.5, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
