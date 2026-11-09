// 수달 인양단 — 무기 특수 동작 · 탄약 상성 (M3-A · v0.6) — raid.js 가 부름 (raid 인스턴스를 받음)
//  v0.6.1 손맛(검수 M3 Top 5): 무기마다 서명 효과(shotSig · hitSig) · 흔들림/반동/히트스톱/넉백 = 무기 표 FEEL 칸 · 조명탄은 날아가서 터짐(lob)
//   여기서는 R.R()(판 씨앗 난수)를 부르지 않음 — 효과는 Math.random 만 (봇 · 시뮬 재현 그대로)
//  근접 휘두르기(렌치) · 감전 연쇄(전류) · 조명탄(터짐 + 불 + 빛 웅덩이) · 물속 특화(잠수) · 탄약 × 적 방어/방패/기계
import * as THREE from 'three';
import { AMMO, ARMOR, MACHINE, WEAPONS, FEEL, SHAKE_MAX, AMMO_FX } from './data.js?v=0.99.15';
import { sfx } from './audio.js?v=0.99.15';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

/* 피해 배수: 탄약 × 적 방어 (총 · 근접만 — 수류탄 · 불은 그대로) · 방패 배수는 따로 돌려줌 */
export function ammoMul(R, e, opt = {}) {
  if (!opt.gun && !opt.melee) return { m: 1, shield: 1 };
  const A = AMMO[R.L.ammo] || AMMO.normal; const arm = e.D.armor ?? ARMOR[e.kind] ?? 0;
  let m = 1 - arm * (opt.melee ? 0.5 : A.armorMul ?? 1); let shield = opt.melee ? 0.5 : A.shieldMul ?? 1;
  if (opt.gun && A.machine) {
    if (e.D.machine || MACHINE[e.kind]) m *= A.machine; else if (e.kind === 'jelly') m *= A.jelly; else m *= A.dmg;
    if (R.water?.userData?.mask?.(e.pos.x, e.pos.z) > 0.15) m *= A.wet;
    if (A.stun) e.stagger = Math.max(e.stagger || 0, A.stun);
  } else if (opt.gun && A.dmg) m *= A.dmg;
  if (e.D.boss) m *= (R.w?.boss || 1) * (R.L.boss || 1);
  return { m, shield };
}
/* 물속 특화(잠수 작살총): 내가 물에 있거나 해저 터널 짙은 물이면 피해 · 사거리 배수 */
export const waterMul = (R, w) => (w.water && (R.pl.wet || R.pl.deep) ? w.water : null);

/* 근접: 앞 부채꼴(arc) 안 가까운 적 최대 3 */
export function swing(R, target) {
  const pl = R.pl, w = R.w; const base = target ? Math.atan2(target.pos.x - pl.pos.x, target.pos.z - pl.pos.z) : pl.face; let hit = 0;
  const near = R.enemies.filter(e => !e.dead && !e.sleep).map(e => ({ e, d: Math.hypot(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z) }))
    .filter(o => o.d < w.range + o.e.D.radius && Math.abs(angDiff(base, Math.atan2(o.e.pos.x - pl.pos.x, o.e.pos.z - pl.pos.z))) < w.arc / 2).sort((a, b) => a.d - b.d).slice(0, 3);
  for (const { e, d } of near) { const dir = V((e.pos.x - pl.pos.x) / (d || 1), 0, (e.pos.z - pl.pos.z) / (d || 1)); R.damage(e, w.dmg * (0.9 + R.R() * 0.2), dir, e.pos.clone().setY(1.0), w.crit, false, { melee: true }); hit++; }
  if (hit) R.hits++;
  /* 서명: 휘두름 잔상 = 몸 둘레 부채꼴 띠 두 겹(바깥 넓고 흐림 · 안 가늘고 밝음 · 시작 쪽이 어두워 휘두른 방향이 보임) + 끝 불티 */
  const F = feelOf(w), a0 = base - w.arc / 2 * 1.05, a1 = base + w.arc / 2 * 1.05, sd = Math.random() < 0.5 ? 1 : -1;
  R.fx.arc(pl.pos.x, 1.0, pl.pos.z, 1.65, sd > 0 ? a0 : a1, sd > 0 ? a1 : a0, { w: F.tw, w1: 0.25, life: F.tl, color: F.tc, tail: 0.04, seg: 11 });
  R.fx.arc(pl.pos.x, 1.05, pl.pos.z, 1.15, sd > 0 ? a0 : a1, sd > 0 ? a1 : a0, { w: 0.28, w1: 0.08, life: F.tl * 0.7, color: 0xffffff, tail: 0.1, seg: 9 });
  for (const a of [-0.45, 0, 0.45]) { const t = base + a * w.arc; R.fx.burst(pl.pos.x + Math.sin(t) * 1.7, 1.0, pl.pos.z + Math.cos(t) * 1.7, 3, 0xe8e2d0, 3, 0.06, 0.22, 4); }
  sfx.swing(); if (!hit) sfx.cover(); /* 맞은 소리는 damage 가 적마다(근접 = 굵은 층) */
  R.kickCam(V(Math.sin(base), 0, Math.cos(base)), -F.kick); R.shake = Math.max(R.shake, hit ? Math.min(SHAKE_MAX, F.shake) : 0.15);
  pl.anim.play('1H_Ranged_Shoot', { once: true, fade: 0.04, speed: 1.6, force: true });
  R.noise(pl.pos, w.noise);
}
/* 감전 연쇄: 맞은 적 둘레 r 안 다음 적으로 n 번 튐 */
export function zap(R, e0, dmg) {
  const w = R.w; const C = w.chain; if (!C) return; let cur = e0; const hit = new Set([e0]);
  for (let i = 0; i < C.n; i++) {
    let best = null, bd = C.r;
    for (const e of R.enemies) { if (e.dead || e.sleep || hit.has(e)) continue; const d = e.pos.distanceTo(cur.pos); if (d < bd) { bd = d; best = e; } }
    if (!best) break; hit.add(best);
    /* 서명: 적 사이 굵은 지그재그 호(파랑 + 흰 심) 0.17초 + 맞은 적 파랑 번쩍 */
    const a = cur.pos.clone().setY(1.1), b = best.pos.clone().setY(1.1), sg = Math.max(5, Math.round(a.distanceTo(b) / 0.6));
    R.fx.streak(a, b, { w: 0.26, life: 0.17, color: 0x6fd0ff, zig: 0.55, seg: sg, shrink: 0.3 }); R.fx.streak(a, b, { w: 0.08, life: 0.12, color: 0xffffff, zig: 0.5, seg: sg, shrink: 0.2 });
    R.fx.burst(best.pos.x, 1.1, best.pos.z, 6, 0x9fe8ff, 4, 0.06, 0.3, 4); sfx.zap?.(0, i + 1);
    best.stagger = Math.max(best.stagger || 0, C.stun);
    R.damage(best, dmg * C.mul, best.pos.clone().sub(cur.pos).setY(0).normalize(), best.pos.clone().setY(1.0), 0, true, { gun: true, chain: true, chainTo: e0 }); cur = best; /* v0.7.1 검수 M4 Top 2: 숫자는 첫 적에 합계 하나 */
  }
}
/* 조명탄: 맞은 곳(또는 사거리 끝 · 벽)에서 터짐 → 둘레 피해 · 불(적만) · 빛 웅덩이 */
export function blast(R, at, w = R.w) {
  const B = w.blast; if (!B) return;
  for (const e of R.enemies) { if (e.dead || e.sleep) continue; const d = Math.hypot(e.pos.x - at.x, e.pos.z - at.z); if (d > B.r + e.D.radius) continue;
    R.damage(e, w.dmg * (1 - 0.4 * Math.min(1, d / B.r)), e.pos.clone().sub(at).setY(0).normalize(), e.pos.clone().setY(1.0), w.crit, false, { gun: true }); }
  (R.burns ||= []).push({ x: at.x, z: at.z, r: B.r, t: B.burn, dps: B.dps, tick: 0 });
  if (w.light) (R.flares ||= []).push({ x: at.x, z: at.z, r: 5.5, t: w.light });
  R.fx.burst(at.x, 0.8, at.z, 30, 0xff9a3c, 8, 0.12, 0.7, 10); R.fx.burst(at.x, 0.8, at.z, 14, 0xfff0b0, 5, 0.08, 0.5, 2); R.fx.ring(at.x, at.z, B.r, 0xffb060);
  /* 서명: 터짐 번쩍 → 바닥 불 링(불 붙은 동안 깜빡 · 0.5초마다 고리) + 빛 웅덩이(빛 초 동안 바닥이 밝음) */
  const F = feelOf(w); R.fx.glow(at.x, 1.0, at.z, { s: 2, s1: 6.5, life: 0.24, color: 0xffd9a0, i: 1.6 }); R.fx.lamp(at, 70, 0xffa050);
  R.fx.glow(at.x, 0.12, at.z, { s: B.r * 2.4, life: B.burn, color: 0xff6a24, i: 0.9, flat: true, flick: 0.35, fade: 0.3 });
  R.fx.arc(at.x, 0.15, at.z, B.r * 0.95, 0, Math.PI * 2, { w: 0.36, w1: 0.36, life: B.burn, color: 0xe0601c, tail: 1, seg: 18, shrink: 0.1, pw: 0.6 }); /* 바닥 불 링 */
  if (w.light) R.fx.glow(at.x, 0.1, at.z, { s: 11, life: w.light, color: 0xffcf80, i: 0.32, flat: true, fade: 0.6 });
  R.shake = Math.max(R.shake, Math.min(SHAKE_MAX, F.boom || 0.35)); sfx.boom?.();
}
/* 매 프레임: 불 · 빛 */
export function armsTick(R, dt) {
  if (R.lobs?.length) { for (const L of R.lobs) { L.t -= dt; const u = Math.min(1, 1 - L.t / L.T), b = L.ball;
      b.x = L.fx + (L.to.x - L.fx) * u; b.z = L.fz + (L.to.z - L.fz) * u; b.y = L.fy + (0.8 - L.fy) * u + L.h * 4 * u * (1 - u);
      if ((L.tr -= dt) <= 0) { L.tr = 0.025; R.fx.burst(b.x, b.y, b.z, 2, 0xffb060, 1.2, 0.07, 0.35, -2); }
      if (L.t <= 0) { b.t = b.life; blast(R, L.to, L.w); } }
    R.lobs = R.lobs.filter(L => L.t > 0); }
  if (R.burns?.length) { for (const b of R.burns) { b.t -= dt; b.tick -= dt; if (b.tick <= 0) { b.tick = 0.5;
      for (const e of R.enemies) if (!e.dead && !e.sleep && Math.hypot(e.pos.x - b.x, e.pos.z - b.z) < b.r) R.damage(e, b.dps * 0.5, V(), e.pos.clone().setY(0.6), 0, true, {});
      R.fx.burst(b.x + (R.R() - 0.5) * b.r, 0.3, b.z + (R.R() - 0.5) * b.r, 4, 0xff7a3a, 2, 0.08, 0.5, -3); } }
    R.burns = R.burns.filter(b => b.t > 0); }
  if (R.flares?.length) { for (const f of R.flares) f.t -= dt; R.flares = R.flares.filter(f => f.t > 0); }
}
export const flarePools = R => (R.flares || []).map(f => ({ x: f.x, z: f.z, r: f.r * Math.min(1, f.t / 1.2 + 0.3) }));

/* ───── 손맛 (v0.6.1 · 검수 M3 Top 5) ───── 무기 표 FEEL 칸을 읽어 효과 · 흔들림 · 반동 · 히트스톱 · 넉백 */
const FEEL0 = FEEL.pistol;
export const feelOf = w => (w && (WEAPONS[w.key]?.feel || FEEL[w.key])) || FEEL0;
const tv = V(), tv2 = V();
/* 조명탄: 총구에서 불덩이가 날아가 (거리 / fly 초 · 낮은 포물선) 닿으면 터짐 — 소리 '퐁' → 날아가는 '쉬익' → 터짐 '쾅' 이 그림과 같은 때 */
export function lob(R, to) {
  const F = feelOf(R.w), pl = R.pl; const fx = pl.pos.x + Math.sin(pl.face) * 0.8, fz = pl.pos.z + Math.cos(pl.face) * 0.8, fy = 1.1;
  const d = Math.hypot(to.x - fx, to.z - fz), T = Math.max(0.06, d / (F.fly || 34));
  const ball = R.fx.glow(fx, fy, fz, { s: 1.15, life: 99, color: 0xffc27a, i: 1.7, fade: 0 });
  (R.lobs ||= []).push({ to: to.clone(), T, t: T, fx, fy, fz, h: Math.min(1.4, d * 0.09), ball, w: R.w, tr: 0 });
  sfx.fizz?.(T);
}
/* 쏠 때 알마다: 총구 불꽃 · 탄피 · 궤적 (k = 몇 번째 알 · n = 알 수 · take = 맞은 적 · tb = 막힌 곳 비율) */
export function shotSig(R, w, k, n, muzzle, hit, dir, take, tb) {
  const F = feelOf(w), fx = R.fx, hitE = take.length > 0;
  if (k === 0) {
    let mz = muzzle; if (F.sig === 'stream') { R.__alt = -(R.__alt || 1); mz = tv.copy(muzzle).addScaledVector(tv2.set(dir.z, 0, -dir.x), 0.12 * R.__alt); } /* 소총: 좌우 번갈아 */
    fx.muzzle(mz, dir, { size: F.flash, light: F.light, color: F.fc });
    const side = tv2.set(dir.z, 0, -dir.x);
    if (F.sig !== 'flare') fx.shell(muzzle.x, 1.0, muzzle.z, side);
    if (F.sig === 'rivet') { fx.shell(muzzle.x, 1.0, muzzle.z, side, 0xd8dde2); fx.burst(muzzle.x, 1.05, muzzle.z, 3, 0xffb050, 6, 0.045, 0.14, 8, dir); } /* 탄피 비 + 총구 불티 */
    if (F.sig === 'pierce') fx.burst(muzzle.x, 1.05, muzzle.z, 6, 0xd9c7a0, 3, 0.1, 0.4, 4, dir);
  }
  switch (F.sig) {
    case 'spark': fx.streak(muzzle, hit, { w: F.tw, w1: F.tw * 0.5, life: F.tl, color: F.tc, tail: 0.1 });
      fx.streak(tv.copy(hit).addScaledVector(dir, -Math.min(1.3, muzzle.distanceTo(hit))), hit, { w: 0.06, w1: 0.3, life: 0.14, color: 0xfff6dc, tail: 0 }); break; /* 작살 머리 */
    case 'stream': fx.streak(muzzle, hit, { w: F.tw * 0.6, w1: F.tw * 1.3, life: F.tl, color: F.tc, tail: 0.05, shrink: 0.2 }); break;
    case 'rivet': { const L = muzzle.distanceTo(hit); for (let u = 0.08 + Math.random() * 0.2; u < 1; u += 0.3) { const a = tv.copy(muzzle).lerp(hit, u); fx.streak(a, tv2.copy(a).addScaledVector(dir, Math.min(0.85, L * (1 - u))), { w: F.tw, w1: F.tw * 0.6, life: F.tl, color: F.tc, tail: 0.25 }); }
      fx.streak(muzzle, hit, { w: 0.04, life: 0.05, color: 0xffd090, tail: 0.2 }); break; } /* 짧은 불티 점선 + 아주 가는 줄 */
    case 'line': fx.streak(muzzle, hit, { w: F.tw, life: F.tl, color: F.tc, tail: 0.55, shrink: 0.85, pw: 1.6 }); fx.streak(muzzle, hit, { w: 0.42, w1: 0.2, life: 0.07, color: 0xbfe2ff, tail: 0.4 }); break;
    case 'bubble': fx.streak(muzzle, hit, { w: F.tw, life: F.tl, color: F.tc, tail: 0.2 }); fx.bubbles(muzzle, hit, R.pl.wet || R.pl.deep ? 0.32 : 0.55); break;
    case 'pierce': fx.streak(muzzle, hit, { w: F.tw, w1: F.tw * 0.55, life: F.tl, color: F.tc, tail: 0.35, shrink: 0.75 }); fx.streak(muzzle, hit, { w: 0.09, life: F.tl * 0.6, color: 0xfff4e0, tail: 0.5 });
      if (take.length && tb > 0) fx.glow(hit.x, hit.y, hit.z, { s: 1.6, s1: 0.4, life: 0.16, color: 0xffb860, i: 1.4 });
      if (!hitE && tb < 0.999) fx.burst(hit.x, hit.y, hit.z, 10, 0xd9c7a0, 6, 0.12, 0.6, 18); break;
    case 'arc': { const sg = Math.max(5, Math.round(muzzle.distanceTo(hit) / 0.7)); fx.streak(muzzle, hit, { w: F.tw, life: F.tl, color: F.tc, zig: 0.5, seg: sg, shrink: 0.3 }); fx.streak(muzzle, hit, { w: 0.07, life: F.tl * 0.7, color: 0xffffff, zig: 0.45, seg: sg, shrink: 0.2 });
      if (hitE) fx.lamp(hit, 44, 0x7dd3ff); break; }
    case 'fan': fx.streak(muzzle, hit, { w: F.tw, w1: F.tw * 0.6, life: F.tl, color: F.tc, tail: 0.25 }); break;
    case 'flare': break;
    default: fx.tracer(muzzle, hit);
  }
}
/* 쏜 뒤 한 번: 흔들림 · 반동 · 탄피 소리(shellSnd = 판 난수로 이미 정함) · 산탄 부채꼴 */
export function fireFeel(R, w, base, shellSnd) {
  const F = feelOf(w), pl = R.pl;
  R.kickCam(tv.set(Math.sin(base), 0, Math.cos(base)), F.kick); R.shake = Math.max(R.shake, Math.min(SHAKE_MAX, F.shake));
  if (shellSnd || F.sig === 'rivet') sfx.shell();
  if (F.sig === 'fan') { const sp = (w.spread || 0.2) * 1.15; /* 서명: 부채꼴 화염 두 겹 + 총구 연기 */
    R.fx.arc(pl.pos.x, 1.0, pl.pos.z, 1.4, base - sp, base + sp, { w: 1.0, w1: 1.0, life: 0.11, color: 0xffc060, tail: 1, seg: 7, shrink: 0.2 });
    R.fx.arc(pl.pos.x, 1.0, pl.pos.z, 2.6, base - sp * 1.1, base + sp * 1.1, { w: 0.6, w1: 0.6, life: 0.14, color: 0xff8a30, tail: 1, seg: 9, shrink: 0.4 });
    R.fx.arc(pl.pos.x, 1.0, pl.pos.z, 3.8, base - sp * 1.2, base + sp * 1.2, { w: 0.3, w1: 0.3, life: 0.16, color: 0xff7a20, tail: 1, seg: 11, shrink: 0.5 });
    R.fx.burst(pl.pos.x + Math.sin(base) * 1.2, 1.0, pl.pos.z + Math.cos(base) * 1.2, 8, 0x8a8478, 2.5, 0.16, 0.5, -1, tv.set(Math.sin(base), 0, Math.cos(base))); }
  if (F.sig === 'bubble') sfx.bubble?.(R.pl.wet || R.pl.deep);
}
/* 맞았을 때 히트스톱 · 넉백 배수 (불 · 연쇄는 작게: 멈춤이 쌓이지 않게) */
export function hitFeel(R, how = {}) {
  const F = feelOf(R.w);
  if (how.chain) return { stop: 0.6, push: 0.6 };
  if (!how.gun && !how.melee) return { stop: 0.3, push: 1 };
  return { stop: F.stop, push: F.push };
}
/* 맞은 자리: 탄약 3 구분 + 무기 서명 (dir 는 그냥 {x,y,z} 일 수도 — 시험 도구) */
export function hitSig(R, e, at, dir, o = {}) {
  const how = o.how || {}; if (!how.gun && !how.melee) return;
  const fx = R.fx, F = feelOf(R.w), big = o.crit || o.weak, dx = dir?.x || 0, dz = dir?.z || 0, dl = Math.hypot(dx, dz) || 1;
  if (how.chain) { fx.glow(at.x, at.y, at.z, { s: 2.2, s1: 0.8, life: 0.17, color: 0x7dd3ff, i: 1.5 }); return; }
  if (how.gun && F.sig !== 'flare') { const A = AMMO_FX[R.L?.ammo] || AMMO_FX.normal;
    fx.glow(at.x, at.y, at.z, { s: A.s * (big ? 1.7 : 1) * (F.sig === 'fan' || F.sig === 'rivet' ? 0.7 : 1), s1: A.s * 0.3, life: 0.12, color: A.c, i: 1.3 });
    if (A.spikes) { for (let i = 0; i < A.spikes; i++) { const a = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.8, L = 1.4 + Math.random() * 1.0, o = 0.45; /* 몸 뒤로 빠져나가는 은빛 침 */
        fx.streak(tv.set(at.x + Math.sin(a) * o, at.y + 0.2, at.z + Math.cos(a) * o), tv2.set(at.x + Math.sin(a) * L, at.y + (Math.random() - 0.2) * 0.5, at.z + Math.cos(a) * L), { w: 0.13, w1: 0.02, life: 0.16, color: 0xf2f6ff, tail: 1 }); }
      sfx.pierce?.(); }
    if (A.arcs) { for (let i = 0; i < A.arcs; i++) { const a = Math.random() * 6.28, L = 0.7 + Math.random() * 0.5;
        fx.streak(tv.set(at.x, at.y, at.z), tv2.set(at.x + Math.sin(a) * L, at.y + (Math.random() - 0.5) * 0.6, at.z + Math.cos(a) * L), { w: 0.08, life: 0.12, color: 0x9fe8ff, zig: 0.18, seg: 4, shrink: 0.2 }); }
      fx.burst(at.x, at.y, at.z, 4, 0x9fe8ff, 5, 0.05, 0.25, 6); fx.arc(e.pos.x, 0.25, e.pos.z, 0.75, 0, Math.PI * 2, { w: 0.14, life: 0.22, color: 0x7dd3ff, tail: 1, seg: 12, shrink: 0.3 }); sfx.zap?.(0, 0); } }
  switch (F.sig) {
    case 'line': fx.burst(at.x, at.y, at.z, 12, 0xeef8ff, 10, 0.06, 0.4, 8, { x: dx / dl, z: dz / dl }); /* 관통 파편: 뒤로 빠짐 */
      if (big) { fx.arc(e.pos.x, 0.3, e.pos.z, 1.3, 0, Math.PI * 2, { w: 0.18, life: 0.3, color: 0xffffff, tail: 1, seg: 14, shrink: 0.4 }); /* '핑' 고리 */ fx.glow(at.x, at.y, at.z, { s: 1, s1: 3.2, life: 0.2, color: 0xffffff, i: 1.2 }); sfx.ping?.(); } break;
    case 'pierce': fx.burst(at.x, at.y, at.z, 14, 0xffc070, 10, 0.09, 0.45, 14, { x: dx / dl, z: dz / dl }); break;
    case 'swing': fx.glow(at.x, at.y, at.z, { s: 1.8, s1: 0.5, life: 0.13, color: 0xfff4dc, i: 1.4 }); fx.burst(at.x, at.y, at.z, 10, 0xfff4dc, 7, 0.08, 0.3, 16, { x: dx / dl, z: dz / dl }); break;
    case 'bubble': fx.burst(at.x, at.y, at.z, 7, 0xcff8ff, 4, 0.07, 0.5, -2); break;
    case 'arc': fx.glow(at.x, at.y, at.z, { s: 2.4, s1: 0.9, life: 0.17, color: 0x7dd3ff, i: 1.5 }); fx.burst(at.x, at.y, at.z, 5, 0xffffff, 5, 0.04, 0.2, 4); break;
    case 'rivet': fx.burst(at.x, at.y, at.z, 3, 0xffa040, 5, 0.05, 0.22, 18, { x: dx / dl, z: dz / dl }); break;
    default: break;
  }
}
