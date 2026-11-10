// M4-A 새 적 5 — 모양(전용 3D · 없으면 코드 도형) · 예고 · 공격 · 매 프레임 움직임 · 쓰러짐
//  굴림 기뢰(자폭) · 문짝 소라게(방패) · 먹물 문어(은신) · 등대 저격수(저격) · 닻 신호수(소환) — 숫자 data/enemies.js · 움직임 판단 ai.js(역할)
//  예고 규칙: 큰 공격은 모두 바닥 원/줄이 TELE_MIN 넘게 먼저 보임 (raid.warnDisc/warnLine → e.teleT0 → raid.hurt 자동 검사)
import * as THREE from 'three';
import { ENEMIES } from './data.js?v=0.99.16';
import { TELE_MIN } from './data/enemies.js?v=0.99.16';
import { enemyBody, glowSprite } from './enemy3d.js?v=0.99.16';
import { sfx } from './audio.js?v=0.99.16';
const st = (R, k) => { const o = R.aiSt || (R.aiSt = {}); o[k] = (o[k] || 0) + 1; };

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const t1 = V();
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
/* 코드 도형으로 그리는 종류 (전용 3D 가 없으면) — 저격수 · 신호수 · 두목은 KayKit 몸(raid.makeEnemy 그대로) */
export const PRIM = { mine: 1, hermit: 1, octo: 1 };
export const FOE = { mine: 1, hermit: 1, octo: 1, sniper: 1, signal: 1 };

const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
function primMine(elite) {
  const root = new THREE.Group(), body = new THREE.Group(); body.position.y = 0.42; root.add(body);
  const shell = lam(elite ? 0x5a3a34 : 0x3a3f44), spike = lam(0x8a6a4a), eyeM = new THREE.MeshBasicMaterial({ color: 0xff3a2a });
  body.add(new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 9), shell));
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, b = (i % 2 ? 0.45 : -0.45); const c = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 6), spike); c.position.set(Math.cos(a) * Math.cos(b) * 0.4, Math.sin(b) * 0.4, Math.sin(a) * Math.cos(b) * 0.4); c.lookAt(c.position.clone().multiplyScalar(2)); c.rotateX(Math.PI / 2); body.add(c); }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), eyeM); eye.position.set(0, 0.36, 0.12); root.add(eye); eye.position.y = 0.8;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 6, 18), lam(0xc99a4a)); band.rotation.y = Math.PI / 2; root.add(band); band.position.y = 0.42;
  return { root, body, eyeM, mats: [shell, spike, eyeM, band.material], legs: [], claws: [] };
}
function primHermit(elite) {
  const root = new THREE.Group(), body = new THREE.Group(); body.position.y = 0.45; root.add(body);
  const shell = lam(elite ? 0x9a5040 : 0xb06a48), door = lam(0x5a6a72), rust = lam(0x8e4a2c);
  const sh = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 8), shell); sh.scale.set(1, 0.75, 1.1); sh.position.z = -0.2; body.add(sh);
  const dg = new THREE.Group(); dg.position.set(0, 0.25, 0.55); body.add(dg);
  const d = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.15, 0.12), door); dg.add(d); for (const x of [-0.5, 0, 0.5]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.15, 0.05), rust); r.position.set(x, 0, 0.07); dg.add(r); }
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 12), lam(0xc99a4a)); wheel.position.set(0, 0.1, 0.1); dg.add(wheel);
  const legs = [], claws = [];
  for (let i = 0; i < 6; i++) { const s = i < 3 ? 1 : -1, k = i % 3; const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.6, 5), shell); const g = new THREE.Group(); g.position.set(s * 0.45, 0.2, -0.3 + k * 0.3); l.position.set(s * 0.25, -0.15, 0); l.rotation.z = s * 1.0; g.add(l); root.add(g); legs.push(g); }
  for (const s of [1, -1]) { const g = new THREE.Group(); g.position.set(s * 0.6, 0.55, 0.45); const c = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.4), shell); c.position.z = 0.2; g.add(c); root.add(g); claws.push(g); }
  return { root, body, door: dg, legs, claws, mats: [shell, door, rust, wheel.material] };
}
function primOcto(elite) {
  const root = new THREE.Group(), body = new THREE.Group(); body.position.y = 0.9; root.add(body);
  const skin = lam(elite ? 0x6a3a7a : 0x4a3a6a, { transparent: true, opacity: 1, emissive: 0x000000 }), eyeM = new THREE.MeshBasicMaterial({ color: 0xffe07a, transparent: true });
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 9), skin); h.scale.set(1, 1.2, 1); body.add(h);
  for (const s of [1, -1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), eyeM); e.position.set(s * 0.18, -0.05, 0.34); body.add(e); }
  const tents = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const g = new THREE.Group(); g.position.set(Math.cos(a) * 0.25, 0.6, Math.sin(a) * 0.25); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.02, 0.75, 5), skin); t.position.y = -0.35; g.add(t); g.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); root.add(g); tents.push(g); }
  return { root, body, tents, eyeM, mats: [skin, eyeM], skin };
}
const MAKE = { mine: primMine, hermit: primHermit, octo: primOcto };
/* raid.makeEnemy 가 부름 — 전용 3D(뼈 이름이 같음) 또는 도형 */
export function foeBody(R, en, e) {
  const g = enemyBody(e.kind, R.map, e.elite) || MAKE[e.kind](e.elite);
  en.root = g.root; en.fz = g; en.mats = g.mats; if (g.custom) en.cust = g;
  if (g.clips && Object.keys(g.clips).length) { en.anim = new R.Anim(g.root, g.clips); en.anim.play('Idle_Combat'); }
  const VR = R.variant?.(e.kind); if (VR?.tint && !g.custom) for (const m of g.mats) if (m.color && m !== g.eyeM) m.color.multiply(new THREE.Color(...VR.tint));
  if (e.kind === 'octo') { for (const m of g.mats) { m.transparent = true; } en.cloakK = 0; }
  R.ownMats.push(...g.mats);
}
/* 예고 시작 (ai.startAttack 이 부름) — 처리했으면 true */
export function foeWind(R, e, ang, tp) {
  const D = e.D;
  if (D.atk === 'boom') { e.pat = 'boom'; e.armed = R.t; R.warnDisc(e, D.boomR, 0xff2a1a, true); e.cd = 99; sfx.foeWarn?.(e); return true; } /* 검수 M4 Top 10: 전용 예고음 */
  if (D.atk === 'grab') { e.pat = 'grab'; R.warnDisc(e, D.range + 0.3, 0x9a7aff, true); e.revealT = Math.max(e.revealT || 0, D.wind + 0.6); sfx.foeWarn?.(e); e.anim?.play('Unarmed_Melee_Attack_Punch_A', { once: true, force: true }); return true; }
  if (D.atk === 'snipe') { e.pat = 'snipe'; e.lockT = D.lock; R.warnLine(e, Math.min(D.range + 1, dist2(e.pos, tp) + 2.5), 0.2, 0xff2a2a); e.anim?.play('Aim', { fade: 0.06, force: true }) || e.anim?.play('Idle_Combat'); sfx.foeWarn?.(e); return true; }
  if (D.atk === 'call') { e.pat = 'call'; e.anim?.play('Taunt', { once: true, fade: 0.06, force: true }); sfx.foeWarn?.(e);
    if (!e.flareSp) { e.flareSp = glowSprite(0xff3a2a, 0.9, 0.7); e.root.add(e.flareSp); R.ownMats.push(e.flareSp.material); } e.flareSp.visible = true; e.flareSp.position.set(0.25, 2.2, 0.1); return true; }
  return false;
}
/* 예고 끝 → 실제 공격 (raid.enemyAttack 이 부름) */
export function foeAttack(R, e, dist) {
  const D = e.D, pl = R.pl; const tp = e.foe && !e.foe.dead ? e.foe.pos : pl.pos;
  if (e.pat === 'boom') { explode(R, e, D.dmg * e.dmgMul, D.boomR, true); return true; }
  if (e.pat === 'grab') { sfx.swing(); R.fx.ring(e.pos.x, e.pos.z, D.range + 0.3, 0xb09aff); R.fx.burst(e.pos.x, 0.6, e.pos.z, 12, 0x6a4a9a, 5, 0.1, 0.5);
    if (dist2(tp, e.pos) < D.range + 0.45) { if (e.foe && !e.foe.dead) R.ai.strike(e, D.dmg * e.dmgMul); else R.hurt(D.dmg * e.dmgMul, e.pos); } return true; }
  if (e.pat === 'snipe') { const a = e.lockFace; const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff0d0 })); m.scale.set(1, 1, 3.5); m.rotation.y = a; m.position.set(e.pos.x + Math.sin(a) * 0.8, 1.15, e.pos.z + Math.cos(a) * 0.8); R.root.add(m); m.add(glowSprite(0xff6a4a, 0.8, 0.9));
    R.enemyShots.push({ m, dir: V(Math.sin(a), 0, Math.cos(a)), sp: D.shotSp, t: 0, dmg: D.dmg * e.dmgMul, from: e.pos.clone(), r: 0.45, src: e, life: (D.range + 2) / D.shotSp, tele0: R.tele?.t0 });
    sfx.enemyShot((e.pos.x - pl.pos.x) / 12); sfx.hitMetal?.(0); R.fx.burst(e.pos.x + Math.sin(a) * 0.9, 1.15, e.pos.z + Math.cos(a) * 0.9, 10, 0xffd8a0, 6, 0.08, 0.3); R.noise(e.pos, 16, 'enemy');
    if (e.ai) e.ai.peeks = 9; st(R, 'snipe'); return true; } /* 쏘고 나면 자리 옮김 */
  if (e.pat === 'call') { if (e.flareSp) e.flareSp.visible = false; e.calls = (e.calls ?? D.calls) - 1;
    const n = R.ai.callIn(e, D.adds, D.arrive); R.fx.burst(e.pos.x, 2.4, e.pos.z, 24, 0xff4a3a, 9, 0.1, 1.2, -8); R.fx.ring(e.pos.x, e.pos.z, 2, 0xff4a3a); sfx.siren?.(); R.noise(e.pos, 18, 'enemy');
    if (n && !R.signalTold) { R.signalTold = true; R.ui.event('붉은 신호탄! 곧 검은 닻이 와요 — 신호수부터 노려요', 'warn'); } return true; }
  return false;
}
/* 기뢰 터짐: 둘레 모두 (다른 적도 · 진영 상관없이) — 주인공은 예고 원이 보인 뒤에만 */
function explode(R, e, dmg, r, hurtPl) {
  if (e.exploded) return; e.exploded = true; const p = e.pos; st(R, 'boom');
  sfx.boom?.((p.x - R.pl.pos.x) / 12); R.fx.burst(p.x, 0.6, p.z, 36, 0xffb347, 10, 0.14, 0.7, 14); R.fx.burst(p.x, 0.6, p.z, 16, 0x3a3634, 6, 0.24, 1.2, 6); R.fx.ring(p.x, p.z, r, 0xffd27a); R.shake = Math.max(R.shake, 0.55); R.noise(p, 16, 'enemy');
  if (e.warn) { R.root.remove(e.warn); e.warn.material.dispose(); e.warn = null; }
  if (hurtPl && !R.pl.dead && dist2(R.pl.pos, p) < r) R.hurt(dmg, p);
  for (const o of R.enemies) if (o !== e && !o.dead && !o.sleep && dist2(o.pos, p) < r + o.D.radius) R.ai.hitEnemy(o, dmg * (o.D.boss ? 1 : 1.4), null, t1.copy(o.pos).sub(p).setY(0).normalize());
  if (!e.dead) { e.hp = 0; R.kill(e, V(0, 0, 1), 'self'); }
}
/* 쓰러질 때 (raid.kill 이 부름) */
export function foeKill(R, e, by) {
  if (e.kind === 'mine' && !e.exploded) {
    if (e.wind > 0 && R.t - (e.armed || R.t) >= TELE_MIN) { R.tele = { t: R.t - e.armed, k: 'mine' }; explode(R, e, e.D.dmg * e.dmgMul, e.D.boomR, true); R.tele = null; }
    else { e.exploded = true; st(R, 'pop'); sfx.puff?.(); R.fx.burst(e.pos.x, 0.5, e.pos.z, 16, 0xffd27a, 6, 0.1, 0.5, 8); R.fx.ring(e.pos.x, e.pos.z, 1.6, 0xffd27a); /* 무장 전 = '퐁' (주인공 피해 0 · 붙어 있던 적만 조금) */
      for (const o of R.enemies) if (o !== e && !o.dead && !o.sleep && dist2(o.pos, e.pos) < 1.6 + o.D.radius) R.ai.hitEnemy(o, 20, null, t1.copy(o.pos).sub(e.pos).setY(0).normalize()); }
    if (e.warn) { R.root.remove(e.warn); e.warn.material.dispose(); e.warn = null; }
    e.root.visible = false; return true;
  }
  if (e.kind === 'octo') { e.hidden = false; ink(R, e.pos, 2.4, 2.5); }
  if (e.flareSp) e.flareSp.visible = false;
  return false;
}
function ink(R, p, r, t) {
  const mats = []; const g = new THREE.Group(); g.position.set(p.x, 0, p.z);
  for (let j = 0; j < 5; j++) { const mm = new THREE.MeshLambertMaterial({ color: 0x241a30, transparent: true, opacity: 0.6, depthWrite: false }); mats.push(mm); const s = new THREE.Mesh(new THREE.SphereGeometry(1, 9, 7), mm); const a = j / 5 * 6.28; s.position.set(Math.cos(a) * 1.2 * (j ? 1 : 0), 0.9, Math.sin(a) * 1.2 * (j ? 1 : 0)); s.scale.setScalar(1.1 + Math.random() * 0.6); g.add(s); }
  R.root.add(g); R.smokes.push({ x: p.x, z: p.z, r, t, g, mats }); sfx.foeWarn?.({ pos: p }, 'ink'); st(R, 'ink');
}
/* 매 프레임 (raid.updateEnemies 의 움직임 그리기 자리) */
export function foeTick(R, e, dt, moving) {
  const g = e.fz; const D = e.D;
  if (e.kind === 'mine' && g) { if (moving) g.body.rotation.x += dt * D.chase / 0.42 * (e.state === 'chase' ? 1 : 0.4); const armed = e.wind > 0; const k = armed ? 0.5 + 0.5 * Math.sign(Math.sin(R.t * (8 + 30 * (1 - e.wind / e.windMax)))) : 0.3 + 0.2 * Math.sin(R.t * 3);
    g.eyeM.color.setRGB(1, armed ? 0.15 : 0.3, 0.1).multiplyScalar(0.4 + 0.6 * k); g.body.position.y = 0.42 + (armed ? Math.sin(R.t * 50) * 0.02 : 0); if (armed && Math.random() < dt * 8) sfx.tick?.(); return; }
  if (e.kind === 'hermit' && g) { const w = moving ? Math.sin(e.t * 12) : 0; g.legs.forEach((l, k) => { l.rotation.y = w * 0.4 * (k % 2 ? 1 : -1); }); g.body.position.y = 0.45 + Math.abs(w) * 0.03;
    const k = e.wind > 0 ? 1 - e.wind / (e.windMax || 1) : 0; for (const c of g.claws) c.rotation.x = -0.9 * k; if (g.door) g.door.rotation.x = -0.15 * k; return; }
  if (e.kind === 'octo' && g) {
    const d = dist2(e.pos, R.pl.pos); e.revealT = Math.max(0, (e.revealT || 0) - dt);
    if (e.flash > 0) e.revealT = Math.max(e.revealT, 2.5);
    if ((e.hp < e.maxHp * 0.5) && !e.inked) { e.inked = true; ink(R, e.pos, 2.6, 3); if (e.ai) { e.ai.back = 2.6; } }
    const lit = R.flash > 0 || R.inLight(e.pos, 0.2); const show = e.dead || d < 3.2 || lit || e.revealT > 0 || e.wind > 0;
    e.cloakK += ((show ? 1 : 0) - e.cloakK) * Math.min(1, dt * 6); e.hidden = !show;
    const op = 0.07 + 0.93 * e.cloakK; for (const m of g.mats) { m.opacity = op; m.depthWrite = op > 0.9; }
    if (g.body) g.body.position.y = 0.9 + Math.sin(e.t * 2 + e.id) * 0.08; (g.tents || []).forEach((t, k) => { t.rotation.y = Math.sin(e.t * 3 + k) * 0.3; });
    if (e.anim) e.anim.mixer.update(dt); return; }
  if (e.kind === 'sniper' && e.wind > 0 && e.warn && e.lockT != null) {
    /* 앞 0.8초는 나를 따라옴 · 마지막 0.5초는 멈춤(그때 옆으로 비키면 빗나감) */
    if (e.wind > e.lockT && !e.foe) { const a = Math.atan2(R.pl.pos.x - e.pos.x, R.pl.pos.z - e.pos.z); e.lockFace += angDiff(e.lockFace, a) * Math.min(1, dt * 9); e.warn.rotation.y = e.lockFace; e.face = e.lockFace; }
    else if (e.wind <= e.lockT) e.warn.material.color.setHex(0xffffff);
  }
}
