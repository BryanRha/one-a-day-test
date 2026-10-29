// 2D 컷아웃 캐릭터 (2026-10-29 · 퀄리티 A1) — 배경과 같은 손그림 수채(우리 프롬프트로 생성한 부위 시트 → tools/make_rig.py)
//   머리 · 웃는 머리 · 몸통 · 팔 2 · 다리 2 를 관절에 붙여 코드로 움직임 (걷기 · 앉기 · 젓기 · 맛보기 · 먹기 · 기뻐하기 · 손 흔들기 · 나르기 · 깜빡임)
//   chars.js 와 같은 인터페이스: root(THREE.Group) · play(act) · walkTo · face · hold · update · act/t/target/then/speed
//   chars.register('cut', ...) 로 등록 → main 이 몸 종류만 바꿔 씀 (3D 여우 등도 같은 방식)
import * as THREE from 'three';
const TAU = Math.PI * 2, lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t), rnd = (a, b) => a + Math.random() * (b - a);
let toWorld = null, scene = null, EL = 30 * Math.PI / 180;
export function setup(o) { toWorld = o.toWorld; scene = o.scene; if (o.el) EL = o.el; }
const RIG = {}, TEXS = {};
const loader = new THREE.TextureLoader();
const NAMES = ['head', 'head2', 'torso', 'armL', 'armR', 'legL', 'legR'];
/* 한 캐릭터 그림 불러오기 (부위 7장 + rig.json) */
export function preload(name, base = 'assets/art/chars/') {
  if (RIG[name]) return RIG[name].ready;
  const r = RIG[name] = {}; r.ready = fetch(`${base}${name}/rig.json`).then(x => x.json()).then(j => { r.parts = j.parts; return Promise.all(NAMES.map(n => new Promise(ok => loader.load(`${base}${name}/${n}.webp`, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TEXS[name + '/' + n] = t; ok(); }, undefined, ok)))); }).then(() => r);
  return r.ready;
}
export const has = name => !!(RIG[name] && RIG[name].parts && TEXS[name + '/torso']);
export const headUrl = name => `assets/art/chars/${name}/head.webp`;
const GEO = {};
function plane(name, part, s, pivot) {   /* 관절(pivot)이 원점에 오는 판 */
  const P = RIG[name].parts[part], k = `${name}/${part}/${s}`;
  const g = GEO[k] ||= (() => { const W = P.w * s, H = P.h * s, g = new THREE.PlaneGeometry(W, H); g.translate(-(pivot[0] - 0.5) * W, (pivot[1] - 0.5) * H, 0); return g; })();
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: TEXS[name + '/' + part], transparent: true, depthTest: false, depthWrite: false }));
  return m;
}
const FOOD = {}; function foodTex(src) { return FOOD[src] ||= (() => { const t = loader.load(src); t.colorSpace = THREE.SRGBColorSpace; return t; })(); }

export class Cut {
  constructor(name, look = {}, sx = 0, sy = 0, seed = Math.random() * 5) {
    this.name = name; this.look = look; this.seed = seed; this.speed = look.speed || 70; this.is2d = true;
    const P = RIG[name].parts, height = (look.h || 112);
    const hipM = [(P.torso.hipL[0] + P.torso.hipR[0]) / 2, (P.torso.hipL[1] + P.torso.hipR[1]) / 2];
    const legLen = (1 - P.legL.pivot[1]) * P.legL.h, torsoUp = (hipM[1] - P.torso.neck[1]) * P.torso.h, headUp = P.head.neck[1] * P.head.h;
    const s = this.s = height / (legLen + torsoUp + headUp * 0.94);
    this.root = new THREE.Group(); this.root.position.copy(toWorld(sx, sy)); (look.scene || scene).add(this.root);
    const bb = this.bb = new THREE.Group(); bb.rotation.x = -EL; this.root.add(bb);            /* 화면을 보는 판 */
    const flip = this.flip = new THREE.Group(); bb.add(flip);
    /* 그림자 */
    const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: 0x5A4A20, transparent: true, opacity: 0.22, depthTest: false, depthWrite: false })); sh.scale.set(height * 0.26, height * 0.075, 1); sh.position.y = 2; flip.add(sh); this.shadow = sh;
    const hips = this.hips = new THREE.Group(); hips.position.y = legLen * s; flip.add(hips);
    const rel = (pt) => [(pt[0] - hipM[0]) * P.torso.w * s, -(pt[1] - hipM[1]) * P.torso.h * s];
    const J = this.J = {};
    J.torsoG = new THREE.Group(); hips.add(J.torsoG);
    J.torso = plane(name, 'torso', s, hipM); J.torsoG.add(J.torso);
    for (const side of ['L', 'R']) {
      const leg = new THREE.Group(); const [lx, ly] = rel(P.torso['hip' + side]); leg.position.set(lx * 0.92, ly, 0); hips.add(leg); leg.add(plane(name, 'leg' + side, s, P['leg' + side].pivot)); J['leg' + side] = leg;
      const arm = new THREE.Group(); const [ax, ay] = rel(P.torso['sh' + side]); arm.position.set(ax, ay, 0); J.torsoG.add(arm); arm.add(plane(name, 'arm' + side, s, P['arm' + side].pivot)); J['arm' + side] = arm;
    }
    const [nx, ny] = rel(P.torso.neck); J.head = new THREE.Group(); J.head.position.set(nx, ny - 2 * s * 3, 0); J.torsoG.add(J.head);
    J.headM = plane(name, 'head', s, P.head.neck); J.head.add(J.headM); J.head2 = plane(name, 'head2', s, P.head2.neck); J.head2.visible = false; J.head.add(J.head2);
    J.held = new THREE.Group(); J.held.position.set((P.torso.w * 0.36) * s, ny * 0.38, 0); J.torsoG.add(J.held); this.chestY = ny * 0.38;
    this.parts = [sh, J.legL.children[0], J.legR.children[0], J.armL.children[0], J.torso, J.head2, J.headM, J.armR.children[0]];
    this.armLen = (1 - P.armR.pivot[1]) * P.armR.h * s;
    this.act = 'idle'; this.t = 0; this.walkPh = 0; this.dir = 1; this.carry = false; this.blinkAt = rnd(1, 4); this.blinkEnd = 0;
    this.cur = null; this.from = null; this.fromT = 9; this.persp = 1;
  }
  play(a) { if (a === this.act) return; this.from = this.cur; this.fromT = 0; this.act = a; this.t = 0; }
  walkTo(sx, sy, then) { this.target = toWorld(sx, sy); this.then = then; this.play('walk'); }
  face(sx, sy) { const w = toWorld(sx, sy), dx = w.x - this.root.position.x; if (Math.abs(dx) > 4) this.dir = dx < 0 ? -1 : 1; }
  hold(obj) { this.J.held.clear(); this.carry = !!obj; if (!obj) return;
    const src = typeof obj === 'string' ? obj : obj && obj.userData && obj.userData.img; if (!src) { this.J.held.add(obj); obj.scale.setScalar(0.8); return; }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 36), new THREE.MeshBasicMaterial({ map: foodTex(src), transparent: true, depthTest: false, depthWrite: false })); this.J.held.add(m); this.parts.push(m); }
  update(dt, now) {
    this.t += dt; this.fromT += dt; const P = this.root.position;
    if (this.act === 'walk' && this.target) {
      const dx = this.target.x - P.x, dz = this.target.z - P.z, d = Math.hypot(dx, dz);
      if (d < 2) { this.target = null; this.play('idle'); const f = this.then; this.then = null; f && f(); }
      else { if (Math.abs(dx) > 3) this.dir = dx < 0 ? -1 : 1; const v = this.speed * Math.min(1, this.t / 0.25 + 0.3) * Math.min(1, d / 25 + 0.4), st = Math.min(d, v * dt); P.x += dx / d * st; P.z += dz / d * st; this.walkPh += st / (this.look.h || 112) * 5.2; }
    }
    let p = POSE[this.act](this.t, this);
    if (this.from && this.fromT < 0.25) { const w = ease(this.fromT / 0.25), q = {}; for (const k in p) q[k] = typeof p[k] === 'number' ? lerp(this.from[k] ?? 0, p[k], w) : p[k]; p = q; }
    this.cur = p; const J = this.J;
    /* 원근: 위(먼 곳)는 조금 작게 */
    const sy = P.z * Math.sin(EL) + 780; this.persp = clamp(0.8 + 0.26 * (sy - 400) / 1000, 0.78, 1.06); this.root.scale.setScalar(this.persp);
    this.flip.scale.x = this.dir; this.flip.rotation.z = -p.lean * this.dir;
    this.hips.position.y = (this.legLen ?? (this.legLen = this.hips.position.y)) * (p.legK ?? 1) + p.bob;
    J.legL.rotation.z = p.lL; J.legR.rotation.z = p.lR; J.legL.scale.y = J.legR.scale.y = p.legK ?? 1;
    J.armL.rotation.z = p.aL; J.armR.rotation.z = p.aR;
    J.torsoG.scale.set(1 - p.sq * 0.5, 1 + p.sq, 1); J.head.rotation.z = p.hz; J.head.position.x = (J.head.userData.x0 ??= J.head.position.x) + p.hx;
    if (now > this.blinkAt) { this.blinkEnd = now + rnd(0.1, 0.16); this.blinkAt = now + rnd(2.4, 5); }
    const happy = p.happy || now < this.blinkEnd; J.headM.visible = !happy; J.head2.visible = happy;
    J.held.visible = this.carry; J.held.position.y = this.chestY + (p.heldY || 0) * 0.5;
    /* 그리는 순서: 화면 아래(가까운)일수록 앞 */
    const base = Math.round((P.z * Math.sin(EL) + 1000) * 10); this.parts.forEach((m, i) => { m.renderOrder = base + i; });
  }
}
/* 자세 (라디안 · 앞 = +) */
const Z = () => ({ lL: 0, lR: 0, aL: 0.06, aR: -0.06, hz: 0, hx: 0, bob: 0, lean: 0, sq: 0, legK: 1, happy: false, heldY: 0 });
const SIT = (t, a) => { const k = ease(t / 0.4), p = Z(); p.legK = lerp(1, 0.5, k); p.lL = 0.5 * k; p.lR = 0.35 * k; p.aL = 0.25 * k; p.aR = 0.3 * k; p.sq = 0.012 * Math.sin(t * TAU / 3 + a.seed); p.hz = 0.08 * Math.sin(t * 0.7 + a.seed) * k; return p; };
const POSE = {
  idle(t, a) { const p = Z(), b = Math.sin(t * TAU / 3.2 + a.seed), g = (t + a.seed * 2) % 5.5; p.sq = 0.014 * b; p.aL = 0.06 + 0.03 * b; p.aR = -0.06 - 0.03 * b; p.hz = g < 1.6 ? 0.12 * Math.sin(g / 1.6 * Math.PI) : 0; return p; },
  walk(t, a) { const s = Math.sin(a.walkPh), p = Z(); p.lL = 0.42 * s; p.lR = -0.42 * s; p.aL = a.carry ? 1.1 : -0.42 * s; p.aR = a.carry ? 1.1 : 0.42 * s; p.bob = 3.2 * Math.abs(Math.cos(a.walkPh)) - 1.5; p.lean = 0.05; p.hz = -0.04 * s; p.sq = -0.012 * Math.cos(a.walkPh * 2); p.heldY = 6; return p; },
  stir(t) { const c = TAU * t / 1.4, p = Z(); p.aR = 1.15 + 0.35 * Math.sin(c); p.aL = 0.5; p.lean = 0.06 + 0.04 * Math.sin(c); p.hz = 0.06 * Math.cos(c - 0.8); p.bob = 0.8 * Math.cos(c * 2); p.sq = 0.01 * Math.sin(c * 2); return p; },
  taste(t) { const p = Z(), c = clamp(t / 2, 0, 1), up = Math.sin(Math.min(1, c * 1.6) * Math.PI); p.aR = 0.6 + 2.0 * up; p.hz = -0.1 * up; p.happy = c > 0.45 && c < 0.95; const hop = c > 0.7 && c < 0.86 ? Math.sin((c - 0.7) / 0.16 * Math.PI) : 0; p.bob = 7 * hop; p.aL = 0.3 + 1.6 * hop; p.sq = -0.04 * hop; return p; },
  sit: SIT,
  eat(t, a) { const p = SIT(9, a), bite = Math.max(0, Math.sin(TAU * t / 1.1)); p.aR = 1.0 + 1.3 * bite; p.hz = 0.1 - 0.12 * bite; p.happy = bite > 0.7; p.heldY = 10 * bite; return p; },
  happy(t, a) { const p = SIT(9, a), k = Math.sin(clamp(t / 1.2, 0, 1) * Math.PI); p.aL = 0.3 + 2.4 * k; p.aR = 0.3 + 2.4 * k; p.bob = 5 * k * Math.abs(Math.sin(t * 9)); p.happy = true; p.hz = 0.1 * Math.sin(t * 12) * k; return p; },
  wave(t) { const p = Z(), k = Math.sin(clamp(t / 1.6, 0, 1) * Math.PI); p.aR = 2.7 * k + 0.25 * Math.sin(t * 15) * k; p.hz = -0.1 * k; p.happy = k > 0.5; p.bob = 1.2 * Math.sin(t * 7) * k; return p; },
  serve(t) { const p = Z(), k = Math.sin(clamp(t / 0.8, 0, 1) * Math.PI); p.lean = 0.12 * k; p.aL = 1.3; p.aR = 1.3; p.hz = 0.1 * k; p.heldY = 4; return p; },
};
