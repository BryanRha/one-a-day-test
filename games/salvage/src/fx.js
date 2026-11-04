// 타격감 연출 — 파편 · 탄피 · 물보라 · 총구 불꽃 · 피격 숫자 · 탄 궤적 (전부 풀링 · 한 번에 그림)
import * as THREE from 'three';

const MAX = 600;
export class FX {
  constructor(scene, hud) {
    this.scene = scene; this.hud = hud;
    /* 작은 조각(파편 · 탄피 · 물방울) — 인스턴스 하나로 */
    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true }), MAX);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    scene.add(this.mesh);
    this.p = []; this.free = [];
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.v = new THREE.Vector3(); this.s = new THREE.Vector3(); this.c = new THREE.Color();
    /* 총구 불꽃: 가산 혼합 판 2장 + 빛 */
    const fm = new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, map: radialTex(), fog: false });
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), fm); this.flash.visible = false; scene.add(this.flash);
    this.flashLight = new THREE.PointLight(0xffc070, 0, 9, 1.6); scene.add(this.flashLight);
    /* 탄 궤적: 선 조각들 */
    this.tracers = []; const tm = new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1), tm.clone()); m.visible = false; scene.add(m); this.tracers.push({ m, t: 0 }); }
    /* 충격 고리 (물 위) */
    this.rings = []; for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 24), new THREE.MeshBasicMaterial({ color: 0xbfe8ee, transparent: true, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); this.rings.push({ m, t: 0, s: 1 }); }
    this.nums = [];
  }
  spawn(o) { if (this.p.length >= MAX) this.p.shift(); this.p.push(o); }
  /* v0.4 날씨: 비(폭풍 판) — 빗줄기 260개를 인스턴스 하나로 · 카메라가 보는 곳 둘레에서만 */
  weather(kind) {
    if (kind === 'rain' && !this.rain) {
      const N = 260; const m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 1.1, 0.035), new THREE.MeshBasicMaterial({ color: 0xa8c4e0, transparent: true, opacity: 0.42, depthWrite: false, fog: false }), N);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.renderOrder = 4; this.scene.add(m);
      this.rain = { m, N, d: Array.from({ length: N }, () => ({ x: (Math.random() - 0.5) * 26, y: Math.random() * 14, z: (Math.random() - 0.5) * 34, s: 18 + Math.random() * 8 })) };
    }
    if (this.rain) this.rain.m.visible = kind === 'rain'; this.rainOn = kind === 'rain';
  }
  updateRain(dt, camera) {
    const R = this.rain; const cx = camera.position.x, cz = camera.position.z - 15; this.e.set(0, 0, 0.22); this.q.setFromEuler(this.e); this.s.set(1, 1, 1);
    for (let i = 0; i < R.N; i++) { const d = R.d[i]; d.y -= d.s * dt; d.x += 4 * dt;
      if (d.y < 0) { if (Math.random() < 0.08) this.ring(cx + d.x - 13 + 13, cz + d.z, 0.25, 0x9fb8d0); d.y = 12 + Math.random() * 4; d.x = (Math.random() - 0.5) * 26; d.z = (Math.random() - 0.5) * 34; }
      this.v.set(cx + d.x, d.y, cz + d.z); R.m.setMatrixAt(i, this.m4.compose(this.v, this.q, this.s)); }
    R.m.instanceMatrix.needsUpdate = true;
  }
  /* 파편: 색 · 개수 · 세기 */
  burst(x, y, z, n, color, power = 5, size = 0.12, life = 0.6, grav = 22, dir = null) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      let vx = (Math.random() - 0.5) * 2, vy = Math.random() * 1.2 + 0.3, vz = (Math.random() - 0.5) * 2;
      if (dir) { vx = vx * 0.6 + dir.x * 1.4; vz = vz * 0.6 + dir.z * 1.4; }
      const sp = power * (0.5 + Math.random() * 0.7);
      this.spawn({ x, y, z, vx: vx * sp, vy: vy * sp, vz: vz * sp, rx: Math.random() * 6, ry: Math.random() * 6, vr: (Math.random() - 0.5) * 20, s: size * (0.6 + Math.random() * 0.8), t: 0, life: life * (0.7 + Math.random() * 0.6), g: grav, r: c.r, gg: c.g, b: c.b, bounce: 0.35, sx: 1, sy: 1, sz: 1 });
    }
  }
  /* 탄피: 옆으로 튀어 바닥에서 통통 */
  shell(x, y, z, side) {
    this.spawn({ x, y, z, vx: side.x * (3 + Math.random() * 2) + (Math.random() - 0.5), vy: 4 + Math.random() * 2, vz: side.z * (3 + Math.random() * 2) + (Math.random() - 0.5), rx: 0, ry: 0, vr: 25, s: 0.07, sx: 1, sy: 1, sz: 2.4, t: 0, life: 1.4, g: 26, r: 0.95, gg: 0.75, b: 0.3, bounce: 0.45 });
  }
  muzzle(pos, dir) {
    this.flash.visible = true; this.flash.position.copy(pos); this.flash.lookAt(pos.x, pos.y + 10, pos.z); this.flash.rotation.z = Math.random() * 6; this.flash.scale.setScalar(0.8 + Math.random() * 0.6); this.flashT = 0.05;
    this.flashLight.position.copy(pos); this.flashLight.intensity = 26;
  }
  tracer(a, b) {
    const t = this.tracers.find(t => t.t <= 0) || this.tracers[0]; const m = t.m; const len = a.distanceTo(b);
    m.position.copy(a).lerp(b, 0.5); m.scale.set(1, 1, len); m.lookAt(b); m.visible = true; t.t = 0.07; m.material.opacity = 1;
  }
  ring(x, z, s = 1, color = 0xbfe8ee) { const r = this.rings.find(r => r.t <= 0) || this.rings[0]; r.m.position.set(x, 0.16, z); r.m.material.color.set(color); r.t = 0.45; r.s = s; r.m.visible = true; }
  /* 숫자 (DOM) — 세계 좌표 → 화면 좌표는 매 프레임 */
  num(pos, text, cls = '') {
    const el = document.createElement('div'); el.className = 'num ' + cls; el.textContent = text; this.hud.appendChild(el);
    this.nums.push({ el, p: pos.clone(), t: 0, dx: (Math.random() - 0.5) * 30 });
  }
  update(dt, camera, W, H) {
    if (this.rainOn) this.updateRain(dt, camera);
    const m = this.mesh; let n = 0;
    for (let i = this.p.length - 1; i >= 0; i--) {
      const o = this.p[i]; o.t += dt; if (o.t >= o.life) { this.p.splice(i, 1); continue; }
      o.vy -= o.g * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; o.rx += o.vr * dt; o.ry += o.vr * 0.7 * dt;
      if (o.y < 0.08) { o.y = 0.08; o.vy = -o.vy * o.bounce; o.vx *= 0.6; o.vz *= 0.6; o.vr *= 0.5; }
    }
    for (const o of this.p) {
      const k = 1 - Math.max(0, (o.t - o.life * 0.6) / (o.life * 0.4)); const s = o.s * k;
      this.e.set(o.rx, o.ry, 0); this.q.setFromEuler(this.e); this.v.set(o.x, o.y, o.z); this.s.set(s * o.sx, s * o.sy, s * o.sz);
      m.setMatrixAt(n, this.m4.compose(this.v, this.q, this.s)); this.c.setRGB(o.r, o.gg, o.b); m.setColorAt(n, this.c); n++;
    }
    m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) { this.flash.visible = false; } }
    this.flashLight.intensity *= Math.pow(0.0005, dt);
    for (const t of this.tracers) if (t.t > 0) { t.t -= dt; t.m.material.opacity = Math.max(0, t.t / 0.07); if (t.t <= 0) t.m.visible = false; }
    for (const r of this.rings) if (r.t > 0) { r.t -= dt; const k = 1 - r.t / 0.45; r.m.scale.setScalar(0.3 + k * 1.6 * r.s); r.m.material.opacity = (1 - k) * 0.6; if (r.t <= 0) r.m.visible = false; }
    for (let i = this.nums.length - 1; i >= 0; i--) {
      const o = this.nums[i]; o.t += dt; if (o.t > 0.75) { o.el.remove(); this.nums.splice(i, 1); continue; }
      this.v.copy(o.p); this.v.y += 1.8 + o.t * 1.2; this.v.project(camera);
      const x = (this.v.x * 0.5 + 0.5) * W + o.dx * o.t, y = (-this.v.y * 0.5 + 0.5) * H; const sc = o.t < 0.08 ? 0.6 + o.t * 8 : 1.2 - Math.min(0.3, (o.t - 0.08));
      o.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(${sc})`; o.el.style.opacity = o.t > 0.5 ? 1 - (o.t - 0.5) / 0.25 : 1;
    }
  }
  clear() { this.p.length = 0; this.mesh.count = 0; for (const o of this.nums) o.el.remove(); this.nums.length = 0; for (const t of this.tracers) { t.t = 0; t.m.visible = false; } for (const r of this.rings) { r.t = 0; r.m.visible = false; } this.flash.visible = false; this.flashLight.intensity = 0; }
}
function radialTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.25, 'rgba(255,210,120,0.9)'); g.addColorStop(1, 'rgba(255,120,30,0)');
  x.fillStyle = g; x.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = i % 2 ? 14 : 32; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
