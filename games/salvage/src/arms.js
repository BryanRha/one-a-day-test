// 수달 인양단 — 무기 특수 동작 · 탄약 상성 (M3-A · v0.6) — raid.js 가 부름 (raid 인스턴스를 받음)
//  v0.6.1 손맛(검수 M3 Top 5): 무기마다 서명 효과(shotSig · hitSig) · 흔들림/반동/히트스톱/넉백 = 무기 표 FEEL 칸 · 조명탄은 날아가서 터짐(lob)
//   여기서는 R.R()(판 씨앗 난수)를 부르지 않음 — 효과는 Math.random 만 (봇 · 시뮬 재현 그대로)
//  근접 휘두르기(렌치) · 감전 연쇄(전류) · 조명탄(터짐 + 불 + 빛 웅덩이) · 물속 특화(잠수) · 탄약 × 적 방어/방패/기계
import * as THREE from 'three';
import { AMMO, ARMOR, MACHINE, WEAPONS, FEEL, SHAKE_MAX, AMMO_FX } from './data.js?v=0.99.27';
import { sfx } from './audio.js?v=0.99.27';

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
  if (e.wetT > 0 && (A.machine || opt.chain || R.w?.chain)) m *= e.wetMul || 1.25; /* M5-C 물대포로 젖은 적: 전기탄 · 전류 연쇄 ×1.25 */
  if (e.D.boss) m *= (R.w?.boss || 1) * (R.L.boss || 1);
  return { m, shield };
}
/* 물속 특화(잠수 작살총): 내가 물에 있거나 해저 터널 짙은 물이면 피해 · 사거리 배수 */
export const waterMul = (R, w) => (w.water && (R.pl.wet || R.pl.deep) ? w.water : null);

/* 근접: 앞 부채꼴(arc) 안 가까운 적 최대 3 · M5-C 갈고리 = 좁고 긴 찌르기 + 끌어옴(최대 2) · 노 = 몸 둘레 한 바퀴(최대 5) */
export function swing(R, target) {
  const pl = R.pl, w = R.w; const base = target ? Math.atan2(target.pos.x - pl.pos.x, target.pos.z - pl.pos.z) : pl.face; let hit = 0;
  const full = w.arc >= 6.2, maxN = w.spin?.n || w.hookPull?.n || 3;
  const near = R.enemies.filter(e => !e.dead && !e.sleep).map(e => ({ e, d: Math.hypot(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z) }))
    .filter(o => o.d < w.range + o.e.D.radius && (full || Math.abs(angDiff(base, Math.atan2(o.e.pos.x - pl.pos.x, o.e.pos.z - pl.pos.z))) < w.arc / 2 + (w.hookPull ? Math.atan2(o.e.D.radius, Math.max(0.5, o.d)) : 0))).sort((a, b) => a.d - b.d).slice(0, maxN);
  for (const { e, d } of near) { const dir = V((e.pos.x - pl.pos.x) / (d || 1), 0, (e.pos.z - pl.pos.z) / (d || 1)); R.damage(e, w.dmg * (0.9 + R.R() * 0.2), dir, e.pos.clone().setY(1.0), w.crit, false, { melee: true }); hit++;
    if (w.hookPull && !e.dead) hookPull(R, e, d, dir, w.hookPull); }
  if (hit) R.hits++;
  const F = feelOf(w);
  if (F.sig === 'hook') hookSig(R, base, w, hit);
  else if (F.sig === 'spin') spinSig(R, w, hit);
  else {
  /* 서명: 휘두름 잔상 = 몸 둘레 부채꼴 띠 두 겹(바깥 넓고 흐림 · 안 가늘고 밝음 · 시작 쪽이 어두워 휘두른 방향이 보임) + 끝 불티 */
  const a0 = base - w.arc / 2 * 1.05, a1 = base + w.arc / 2 * 1.05, sd = Math.random() < 0.5 ? 1 : -1;
  R.fx.arc(pl.pos.x, 1.0, pl.pos.z, 1.65, sd > 0 ? a0 : a1, sd > 0 ? a1 : a0, { w: F.tw, w1: 0.25, life: F.tl, color: F.tc, tail: 0.04, seg: 11 });
  R.fx.arc(pl.pos.x, 1.05, pl.pos.z, 1.15, sd > 0 ? a0 : a1, sd > 0 ? a1 : a0, { w: 0.28, w1: 0.08, life: F.tl * 0.7, color: 0xffffff, tail: 0.1, seg: 9 });
  for (const a of [-0.45, 0, 0.45]) { const t = base + a * w.arc; R.fx.burst(pl.pos.x + Math.sin(t) * 1.7, 1.0, pl.pos.z + Math.cos(t) * 1.7, 3, 0xe8e2d0, 3, 0.06, 0.22, 4); }
  }
  (sfx.swingW?.(w.key) ?? sfx.swing()); if (!hit) sfx.cover(); /* 맞은 소리는 damage 가 적마다(근접 = 굵은 층) */
  R.kickCam(V(Math.sin(base), 0, Math.cos(base)), -F.kick); R.shake = Math.max(R.shake, hit ? Math.min(SHAKE_MAX, F.shake) : 0.15);
  pl.anim.play('1H_Ranged_Shoot', { once: true, fade: 0.04, speed: 1.6, force: true });
  R.noise(pl.pos, w.noise);
}
/* M5-C 갈고리: 찍힌 적을 내 앞(1.2m)까지 끌어옴 + 멈칫 (보스 · 덩치 큰 적은 끌리지 않고 멈칫만 짧게) */
function hookPull(R, e, d, dir, H) {
  const big = e.D.boss || e.D.radius >= 0.6;
  if (!big) { const k = Math.min(H.d, Math.max(0, d - 1.2)); e.pos.x -= dir.x * k; e.pos.z -= dir.z * k; R.collide?.(e.pos, e.D.radius); }
  e.stagger = Math.max(e.stagger || 0, big ? H.stun * 0.3 : H.stun);
}
function hookSig(R, base, w, hit) {
  const pl = R.pl, F = feelOf(w), dx = Math.sin(base), dz = Math.cos(base), L = w.range + 0.3;
  const a = tv.set(pl.pos.x + dx * 0.4, 1.05, pl.pos.z + dz * 0.4), b = tv2.set(pl.pos.x + dx * L, 1.0, pl.pos.z + dz * L);
  R.fx.streak(a, b, { w: 0.24, w1: 0.16, life: F.tl, color: F.tc, tail: 0.6, shrink: 0.3 }); /* 장대 (M6-B 굵게) */
  R.fx.streak(a, b, { w: 0.1, life: F.tl * 1.8, color: 0x9a7448, tail: 1, shrink: 0 }); /* 밧줄 (굵게 · 오래) */
  if (hit) { R.fx.streak(b, tv.set(pl.pos.x + dx * 1.2, 0.5, pl.pos.z + dz * 1.2), { w: 0.3, w1: 0.06, life: 0.22, color: 0xe8d0a0, tail: 0.2, shrink: 0.5 }); /* 끌려오는 자국 */
    R.kickCam(V(dx, 0, dz), -0.08); }
  R.fx.arc(b.x, 1.0, b.z, 0.35, base + 1.2, base + 4.2, { w: 0.12, w1: 0.04, life: 0.18, color: 0xfff0c8, tail: 0.2, seg: 6 }); /* 갈고리 끝 반짝 */
  R.fx.glow(b.x, 1.0, b.z, { s: hit ? 1.4 : 0.8, s1: 0.3, life: 0.14, color: 0xfff0c8, i: 1.3 });
}
function spinSig(R, w, hit) {
  const pl = R.pl, F = feelOf(w), a0 = pl.face, sd = Math.random() < 0.5 ? 1 : -1;
  R.fx.arc(pl.pos.x, 0.9, pl.pos.z, w.range * 0.9, a0, a0 + sd * Math.PI * 2, { w: F.tw, w1: 0.2, life: F.tl, color: F.tc, tail: 0.05, seg: 20 });
  R.fx.arc(pl.pos.x, 0.95, pl.pos.z, w.range * 0.55, a0, a0 + sd * Math.PI * 2, { w: 0.25, w1: 0.06, life: F.tl * 0.7, color: 0xffffff, tail: 0.1, seg: 16 });
  for (let i = 0; i < 8; i++) { const t = a0 + i * Math.PI / 4; R.fx.burst(pl.pos.x + Math.sin(t) * w.range, 0.6, pl.pos.z + Math.cos(t) * w.range, 2, 0xcff0ff, 3, 0.07, 0.35, 10); } /* 물방울 */
  if (hit) R.fx.ring(pl.pos.x, pl.pos.z, w.range * 0.9, 0x9fdcff);
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
  if (w.net) return netOpen(R, at, w);
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
      if ((L.tr -= dt) <= 0) { L.tr = 0.025; R.fx.burst(b.x, b.y, b.z, 2, L.tc || 0xffb060, 1.2, 0.07, 0.35, -2); }
      if (L.t <= 0) { b.t = b.life; blast(R, L.to, L.w); } }
    R.lobs = R.lobs.filter(L => L.t > 0); }
  if (R.burns?.length) { for (const b of R.burns) { b.t -= dt; b.tick -= dt; if (b.tick <= 0) { b.tick = 0.5;
      for (const e of R.enemies) if (!e.dead && !e.sleep && Math.hypot(e.pos.x - b.x, e.pos.z - b.z) < b.r) R.damage(e, b.dps * 0.5, V(), e.pos.clone().setY(0.6), 0, true, {});
      R.fx.burst(b.x + (R.R() - 0.5) * b.r, 0.3, b.z + (R.R() - 0.5) * b.r, 4, 0xff7a3a, 2, 0.08, 0.5, -3); } }
    R.burns = R.burns.filter(b => b.t > 0); }
  if (R.flares?.length) { for (const f of R.flares) f.t -= dt; R.flares = R.flares.filter(f => f.t > 0); }
  if (R.missiles?.length) missileTick(R, dt);
  if (R.nets?.length) { for (const n of R.nets) n.t -= dt; R.nets = R.nets.filter(n => n.t > 0); }
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
  const net = F.sig === 'net'; /* M5-C 그물: 넓게 펼쳐지는 흰 원판 + 밧줄색 꼬리 */
  const ball = R.fx.glow(fx, fy, fz, { s: net ? 1.6 : 1.15, life: 99, color: net ? 0xf0e6c8 : 0xffc27a, i: net ? 0.9 : 1.7, fade: 0 });
  (R.lobs ||= []).push({ to: to.clone(), T, t: T, fx, fy, fz, h: Math.min(1.4, d * 0.09), ball, w: R.w, tr: 0, tc: net ? 0xd8cca0 : 0xffb060 });
  if (net) sfx.whoosh?.(); else sfx.fizz?.(T);
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
    case 'flare': case 'net': case 'swarm': break;
    /* M5-C */
    /* M6-B 약한 무기 서명 보강 (검수 M5 — 폰에서 가는 선 · 작은 불티라 숫자로만 느껴짐): 굵은 궤적 + 흰 심 · 무기마다 다른 모양 */
    case 'twin': { const sx = dir.z * (k ? 0.17 : -0.17), sz = -dir.x * (k ? 0.17 : -0.17); /* 쌍발: 나란한 두 줄(굵게 + 흰 심) · 총열 사이 번쩍 다리 · 맞으면 X 표 */
      fx.streak(tv.set(muzzle.x + sx, muzzle.y, muzzle.z + sz), tv2.set(hit.x + sx * 0.4, hit.y, hit.z + sz * 0.4), { w: 0.2, w1: 0.09, life: 0.15, color: F.tc, tail: 0.2 });
      fx.streak(tv.set(muzzle.x + sx, muzzle.y, muzzle.z + sz), tv2.set(hit.x + sx * 0.4, hit.y, hit.z + sz * 0.4), { w: 0.06, life: 0.09, color: 0xffffff, tail: 0.6 });
      if (k === 0) { fx.streak(tv.set(muzzle.x - dir.z * 0.26, muzzle.y, muzzle.z + dir.x * 0.26), tv2.set(muzzle.x + dir.z * 0.26, muzzle.y, muzzle.z - dir.x * 0.26), { w: 0.16, life: 0.07, color: 0xfff4d0, tail: 1, shrink: 0 }); fx.glow(muzzle.x, muzzle.y, muzzle.z, { s: 1.3, s1: 0.4, life: 0.07, color: 0xffe0a0, i: 1.4 }); }
      if (hitE && k === 1) for (const q of [0.785, -0.785]) fx.streak(tv.set(hit.x - Math.sin(q) * 0.45, hit.y + 0.05, hit.z - Math.cos(q) * 0.45), tv2.set(hit.x + Math.sin(q) * 0.45, hit.y + 0.05, hit.z + Math.cos(q) * 0.45), { w: 0.13, life: 0.16, color: 0xffd27a, tail: 1, shrink: 0.4 });
      break; }
    case 'bolt': fx.streak(muzzle, hit, { w: 0.17, w1: 0.1, life: 0.32, color: 0x7a5a38, tail: 0.75, shrink: 0.9 }); fx.streak(muzzle, hit, { w: 0.05, life: 0.09, color: 0xfff8e8, tail: 0.3 }); /* 석궁: 굵은 나무 살 + 흰 심(날아가는 순간) */
      fx.streak(tv.copy(hit).addScaledVector(dir, -0.95), hit, { w: 0.15, w1: 0.05, life: 1.0, color: 0xe8d4a8, tail: 1, shrink: 0 }); /* 박힌 작살 (길게 · 1초) */
      fx.streak(tv.copy(hit).addScaledVector(dir, -1.05), tv2.copy(hit).addScaledVector(dir, -0.8), { w: 0.26, w1: 0.1, life: 1.0, color: 0xc0303a, tail: 1, shrink: 0 }); break; /* 붉은 깃 */
    case 'spray': { const L = muzzle.distanceTo(hit); fx.streak(muzzle, hit, { w: F.tw * 0.5, w1: F.tw * 1.4, life: F.tl, color: F.tc, tail: 0.4, shrink: 0.2 }); fx.streak(muzzle, hit, { w: 0.08, w1: 0.18, life: F.tl * 0.8, color: 0xffffff, tail: 0.6, shrink: 0.2 });
      if (Math.random() < 0.5) fx.burst(hit.x, hit.y, hit.z, 3, 0xcff0ff, 4, 0.07, 0.35, 12, { x: -dir.x, z: -dir.z }); if (L > 2 && Math.random() < 0.3) fx.burst(muzzle.x + dir.x * L * 0.5, 0.2, muzzle.z + dir.z * L * 0.5, 2, 0x9fdcff, 2, 0.06, 0.4, 8); break; }
    case 'anchor': { const L = muzzle.distanceTo(hit), n = Math.max(3, Math.round(L / 0.55)); for (let i = 0; i < n; i += 2) { const a = tv.copy(muzzle).lerp(hit, i / n), b = tv2.copy(muzzle).lerp(hit, Math.min(1, (i + 1) / n)); fx.streak(a, b, { w: 0.26, w1: 0.18, life: F.tl, color: 0x8a98a8, tail: 1, shrink: 0.2 }); } /* 사슬 마디 (굵게) */
      fx.streak(muzzle, hit, { w: 0.05, life: F.tl * 0.8, color: 0xdfe8f0, tail: 0.6 }); /* 사슬 심 */
      fx.glow(hit.x, hit.y, hit.z, { s: 2.6, s1: 0.6, life: 0.2, color: 0xffc890, i: 1.4 }); fx.burst(hit.x, 0.4, hit.z, 10, 0x9a9080, 6, 0.12, 0.5, 10); break; } /* 박힐 때 바닥 파편 */
    case 'shard': { if (k === 0) { const pl = R.pl.pos, b = Math.atan2(dir.x, dir.z), sp = (w.spread || 0.24) * 1.15; /* 물보라: 부채꼴 물판 한 장(총구 → 앞 4m) */
        fx.arc(pl.x, 1.0, pl.z, 1.5, b - sp, b + sp, { w: 0.9, w1: 0.9, life: 0.12, color: 0xd8f4ff, tail: 1, seg: 7, shrink: 0.3 });
        fx.arc(pl.x, 1.0, pl.z, 2.8, b - sp * 1.1, b + sp * 1.1, { w: 0.55, w1: 0.55, life: 0.15, color: 0x8fd6ff, tail: 1, seg: 9, shrink: 0.5 });
        fx.arc(pl.x, 1.0, pl.z, 4.1, b - sp * 1.2, b + sp * 1.2, { w: 0.28, w1: 0.28, life: 0.18, color: 0x6fc8ff, tail: 1, seg: 11, shrink: 0.6 });
        fx.burst(pl.x + dir.x * 1.6, 1.0, pl.z + dir.z * 1.6, 8, 0xcff0ff, 6, 0.07, 0.4, 12, dir); }
      fx.streak(muzzle, hit, { w: 0.13, w1: 0.05, life: F.tl, color: 0xe0f6ff, tail: 0.2 }); if (hitE && k % 2 === 0) fx.burst(hit.x, hit.y, hit.z, 4, 0xbfe8ff, 5, 0.07, 0.3, 12); break; }
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
    fx.glow(at.x, at.y, at.z, { s: A.s * (big ? 1.7 : 1) * (F.sig === 'fan' || F.sig === 'rivet' || F.sig === 'shard' || F.sig === 'twin' ? 0.7 : F.sig === 'spray' ? 0.45 : 1), s1: A.s * 0.3, life: 0.12, color: A.c, i: 1.3 });
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
    case 'swing': case 'hook': fx.glow(at.x, at.y, at.z, { s: 1.8, s1: 0.5, life: 0.13, color: 0xfff4dc, i: 1.4 }); fx.burst(at.x, at.y, at.z, 10, 0xfff4dc, 7, 0.08, 0.3, 16, { x: dx / dl, z: dz / dl });
      if (F.sig === 'hook') { fx.burst(at.x, at.y, at.z, 8, 0xd0303a, 5, 0.08, 0.45, 14, { x: -dx / dl, z: -dz / dl }); fx.arc(e.pos.x, 0.25, e.pos.z, 0.8, 0, Math.PI * 2, { w: 0.14, life: 0.25, color: 0xe8c890, tail: 1, seg: 12, shrink: 0.3 }); } break; /* M6-B 갈고리: 찍힌 자리 붉은 방울 + 고리 */
    case 'spin': fx.glow(at.x, at.y, at.z, { s: 2.0, s1: 0.6, life: 0.14, color: 0xcff0ff, i: 1.3 }); fx.burst(at.x, at.y, at.z, 12, 0xcff0ff, 7, 0.08, 0.4, 12, { x: dx / dl, z: dz / dl }); break; /* M5-C 노: 물보라 */
    case 'bolt': fx.burst(at.x, at.y, at.z, 6, 0xd8c8a0, 6, 0.05, 0.3, 14, { x: dx / dl, z: dz / dl }); fx.burst(at.x, at.y, at.z, 9, 0xd0303a, 6, 0.08, 0.5, 14, { x: dx / dl, z: dz / dl }); /* M6-B 출혈 표시: 붉은 방울 · 짧은 고리 */
      fx.arc(e.pos.x, 0.2, e.pos.z, 0.7, 0, Math.PI * 2, { w: 0.12, life: 0.3, color: 0xd04048, tail: 1, seg: 12, shrink: 0.3 }); if (big) sfx.ping?.(); break;
    case 'spray': if (Math.random() < 0.3) fx.burst(at.x, at.y, at.z, 3, 0xcff0ff, 5, 0.06, 0.3, 10, { x: dx / dl, z: dz / dl }); break;
    case 'anchor': fx.burst(at.x, at.y, at.z, 12, 0xb0bcc8, 8, 0.1, 0.45, 14, { x: dx / dl, z: dz / dl }); fx.glow(e.pos.x, 0.12, e.pos.z, { s: 1.6, s1: 3.4, life: 0.3, color: 0xc8d0d8, i: 0.9, flat: true }); break;
    case 'shard': fx.arc(e.pos.x, 0.25, e.pos.z, 0.6, 0, Math.PI * 2, { w: 0.1, life: 0.2, color: 0x9fdcff, tail: 1, seg: 10, shrink: 0.4 }); break; /* M6-B 물보라: 맞은 적 발밑 물 튐 고리 */
    case 'twin': fx.glow(at.x, at.y, at.z, { s: 1.0, s1: 0.3, life: 0.1, color: 0xffe0a0, i: 1.3 }); break;
    case 'bubble': fx.burst(at.x, at.y, at.z, 7, 0xcff8ff, 4, 0.07, 0.5, -2); break;
    case 'arc': fx.glow(at.x, at.y, at.z, { s: 2.4, s1: 0.9, life: 0.17, color: 0x7dd3ff, i: 1.5 }); fx.burst(at.x, at.y, at.z, 5, 0xffffff, 5, 0.04, 0.2, 4); break;
    case 'rivet': fx.burst(at.x, at.y, at.z, 3, 0xffa040, 5, 0.05, 0.22, 18, { x: dx / dl, z: dz / dl }); break;
    default: break;
  }
  if (HIT_SND[F.sig]) sfx.hitW?.(R.w?.key, 0); /* M6-B 약한 무기 6: 맞는 소리 한 겹 (무기마다 다름 · audio.js hitW) */
}
const HIT_SND = { twin: 1, bolt: 1, anchor: 1, shard: 1, hook: 1 };

/* ═════ M5-C 새 무기 7 (그물 · 석궁 · 물대포 · 닻 · 물보라 · 불꽃 다연장 · 쌍발) ═════
 *  상태 칸(적): netT 느려짐 · wetT 젖음(전기 ×) · bleed {dps, t} 출혈 — 매 프레임 statusTick 이 속도 배수를 돌려줌(raid.js 적 이동) */
export function statusTick(R, e, dt) {
  let k = 1;
  if (e.netT > 0) { e.netT -= dt; k *= e.D.boss ? 0.75 : e.netSlow || 0.4; if (Math.random() < dt * 4) R.fx.burst(e.pos.x, 0.4, e.pos.z, 1, 0xe8dcb0, 1, 0.05, 0.3, 4); }
  if (e.wetT > 0) { e.wetT -= dt; if (Math.random() < dt * 5) R.fx.burst(e.pos.x, 1.2, e.pos.z, 1, 0x9fdcff, 1.5, 0.05, 0.35, 10); }
  if (e.bleed) { const b = e.bleed; b.t -= dt; b.tick -= dt; if (b.tick <= 0) { b.tick = 0.5; R.damage(e, b.dps * 0.5, V(), e.pos.clone().setY(0.9), 0, true, {}); R.fx.burst(e.pos.x, 0.9, e.pos.z, 2, 0xc0303a, 2, 0.06, 0.4, 14); } if (b.t <= 0) e.bleed = null; }
  return k;
}
/* 쏜 알이 맞았을 때 무기 특수 (raid.fire 가 적마다) */
export function onGunHit(R, w, e, dd, dir) {
  if (e.dead) return;
  if (w.bleed) e.bleed = { dps: w.bleed.dps, t: w.bleed.t, tick: 0.5 };
  if (w.wet) { if (!(e.wetT > 0)) R.fx.ring(e.pos.x, e.pos.z, 0.8, 0x6fc8ff); e.wetT = w.wet.t; e.wetMul = w.wet.mul; }
}
/* 그물: 날아가 닿은 자리에서 펼쳐짐 → 반경 안 적 느려짐 + 작은 피해 */
function netOpen(R, at, w) {
  const N = w.net; let n = 0;
  for (const e of R.enemies) { if (e.dead || e.sleep) continue; const d = Math.hypot(e.pos.x - at.x, e.pos.z - at.z); if (d > N.r + e.D.radius) continue;
    R.damage(e, w.dmg, e.pos.clone().sub(at).setY(0).normalize(), e.pos.clone().setY(1.0), w.crit, false, { gun: true }); e.netT = N.t; e.netSlow = N.slow; n++; }
  (R.nets ||= []).push({ x: at.x, z: at.z, r: N.r, t: N.t });
  /* 서명: 바닥에 그물 고리(바깥 고리 + 엇갈린 줄 6) — 묶인 동안 남음 */
  R.fx.arc(at.x, 0.12, at.z, N.r, 0, Math.PI * 2, { w: 0.1, w1: 0.1, life: N.t, color: 0xe8dcb0, tail: 1, seg: 18, shrink: 0.1, pw: 0.6 });
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; R.fx.streak(tv.set(at.x + Math.sin(a) * N.r, 0.13, at.z + Math.cos(a) * N.r), tv2.set(at.x + Math.sin(a + 2.2) * N.r, 0.13, at.z + Math.cos(a + 2.2) * N.r), { w: 0.05, life: N.t, color: 0xd8cca0, tail: 1, shrink: 0.1 }); }
  R.fx.burst(at.x, 0.6, at.z, 10, 0xf0e6c8, 4, 0.06, 0.4, 8); sfx.net?.(n);
}
/* 닻: 박힌 자리로 둘레 적을 끌어당겨 모음 + 멈칫 + 작은 피해 (보스는 멈칫만 짧게) */
export function anchorPull(R, at, w, first) {
  const P = w.pull; let n = 0;
  for (const e of R.enemies) { if (e.dead || e.sleep || e === first) continue; const dx = at.x - e.pos.x, dz = at.z - e.pos.z, d = Math.hypot(dx, dz); if (d > P.r) continue;
    const big = e.D.boss || e.D.radius >= 0.6; if (!big && d > 0.8) { const k = (d - 0.8) * 0.75; e.pos.x += dx / d * k; e.pos.z += dz / d * k; R.collide?.(e.pos, e.D.radius); }
    R.damage(e, w.dmg * P.mul, V(dx / (d || 1), 0, dz / (d || 1)), e.pos.clone().setY(1.0), 0, true, { gun: true }); e.stagger = Math.max(e.stagger || 0, big ? P.stun * 0.3 : P.stun); n++; /* 피해가 멈칫을 0.12 로 덮어쓰지 않게 뒤에 */
    R.fx.streak(tv.set(e.pos.x, 0.6, e.pos.z), tv2.set(at.x, 0.6, at.z), { w: 0.14, life: 0.3, color: 0x8a96a4, tail: 0.5, seg: 4, shrink: 0.3 });
    for (let u = 0.15; u < 1; u += 0.28) R.fx.burst(e.pos.x + (at.x - e.pos.x) * u * 0.6 - dx / (d || 1) * 0.6, 0.3, e.pos.z + (at.z - e.pos.z) * u * 0.6 - dz / (d || 1) * 0.6, 3, 0xcff0ff, 3, 0.08, 0.45, 10); } /* M6-B 끌려오는 적 뒤 물보라 줄 */
  if (first && !first.dead) first.stagger = Math.max(first.stagger || 0, first.D.boss ? P.stun * 0.3 : P.stun);
  R.fx.ring(at.x, at.z, P.r, 0xb0bcc8); R.fx.burst(at.x, 0.3, at.z, 16, 0x9a9080, 5, 0.14, 0.6, 6);
  R.fx.arc(at.x, 0.15, at.z, P.r * 0.55, 0, Math.PI * 2, { w: 0.34, w1: 0.1, life: 0.32, color: 0xe0e8f0, tail: 1, seg: 18, shrink: 0.5 }); /* M6-B 충격 고리 (안쪽) */ R.fx.glow(at.x, 0.15, at.z, { s: 2.4, s1: 4.5, life: 0.3, color: 0xc8d0d8, i: 0.8, flat: true });
  R.shake = Math.max(R.shake, Math.min(SHAKE_MAX, feelOf(w).boom || 0.4)); sfx.clank?.(n);
}
/* 물보라 산탄: 한 발에 한 번, 맞은 적에서 옆 적으로 튕김 */
export function ricochet(R, w, e0, dir) {
  const C = w.ricochet; let best = null, bd = C.r;
  for (const e of R.enemies) { if (e.dead || e.sleep || e === e0) continue; const d = e.pos.distanceTo(e0.pos); if (d < bd) { bd = d; best = e; } }
  if (!best) return; const a = e0.pos.clone().setY(1.0), b = best.pos.clone().setY(1.0);
  R.fx.streak(a, b, { w: 0.09, w1: 0.04, life: 0.13, color: 0xe8f8ff, tail: 0.3, seg: 2, zig: 0.15 }); R.fx.burst(a.x, 1.0, a.z, 4, 0xe8f8ff, 5, 0.05, 0.25, 8);
  R.damage(best, w.dmg * w.pellets * C.mul * 0.5, b.clone().sub(a).setY(0).normalize(), b, w.crit, true, { gun: true, chain: true, chainTo: e0 }); sfx.ping?.();
}
/* 불꽃 다연장: 세 발이 엇갈려 날아가 가까운 적을 따라감 → 작은 꽃불 터짐 */
const SWARM_C = [0xff6fa8, 0x9dff7a, 0xffd25a];
export function swarmFire(R, target) {
  const pl = R.pl, w = R.w, S = w.swarm; const F = feelOf(w);
  for (let i = 0; i < S.n; i++) {
    const side = (i - (S.n - 1) / 2) * 0.9, a = pl.face + side, c = SWARM_C[i % SWARM_C.length];
    const g = R.fx.glow(pl.pos.x + Math.sin(pl.face) * 0.7, 1.15, pl.pos.z + Math.cos(pl.face) * 0.7, { s: 0.7, life: 99, color: c, i: 1.6, fade: 0 });
    (R.missiles ||= []).push({ g, x: g.x, z: g.z, vx: Math.sin(a) * 9, vz: Math.cos(a) * 9, t: 0, life: Math.max(0.5, w.range / (F.fly || 18) + 0.5), tgt: target && !target.dead ? target : null, c, w, tr: 0, delay: i * 0.07 });
  }
  sfx.whoosh?.();
}
function missileTick(R, dt) {
  for (const m of R.missiles) {
    if (m.delay > 0) { m.delay -= dt; continue; }
    m.t += dt; if (!m.tgt || m.tgt.dead) { let bd = 9; m.tgt = null; for (const e of R.enemies) { if (e.dead || e.sleep || e.hidden) continue; const d = Math.hypot(e.pos.x - m.x, e.pos.z - m.z); if (d < bd) { bd = d; m.tgt = e; } } }
    if (m.tgt) { const dx = m.tgt.pos.x - m.x, dz = m.tgt.pos.z - m.z, d = Math.hypot(dx, dz) || 1, sp = 17; const k = Math.min(1, dt * 7); m.vx += (dx / d * sp - m.vx) * k; m.vz += (dz / d * sp - m.vz) * k; if (d < 0.6 + m.tgt.D.radius * 0.5) m.t = m.life; }
    m.x += m.vx * dt; m.z += m.vz * dt; m.g.x = m.x; m.g.z = m.z; m.g.y = 1.15 + Math.sin(m.t * 18) * 0.06;
    if ((m.tr -= dt) <= 0) { m.tr = 0.02; R.fx.burst(m.x, 1.15, m.z, 1, m.c, 0.6, 0.08, 0.35, -1); if ((m.sm = (m.sm || 0) + 1) % 3 === 0) R.fx.burst(m.x, 1.1, m.z, 1, 0x9a929a, 0.5, 0.16, 0.8, -1.5); } /* M6-B 연기 꼬리 */
    if (m.px != null) R.fx.streak(tv.set(m.px, 1.15, m.pz), tv2.set(m.x, 1.15, m.z), { w: 0.2, w1: 0.06, life: 0.22, color: m.c, tail: 1, shrink: 0.6 }); m.px = m.x; m.pz = m.z; /* 색 꼬리 */
    if (m.t > 0.08 && R.boxes) for (const b of R.boxes) if (!b.off && b.bullet && m.x > b.x0 && m.x < b.x1 && m.z > b.z0 && m.z < b.z1) { m.t = m.life; break; } /* 벽에 닿으면 터짐 */
    if (m.t >= m.life) { m.g.t = m.g.life; swarmPop(R, m); }
  }
  R.missiles = R.missiles.filter(m => m.t < m.life);
}
function swarmPop(R, m) {
  const w = m.w, r = w.swarm.r, at = { x: m.x, z: m.z };
  for (const e of R.enemies) { if (e.dead || e.sleep) continue; const d = Math.hypot(e.pos.x - at.x, e.pos.z - at.z); if (d > r + e.D.radius) continue; R.damage(e, w.dmg * (1 - 0.35 * Math.min(1, d / r)), V(e.pos.x - at.x, 0, e.pos.z - at.z).normalize(), e.pos.clone().setY(1.0), w.crit, true, { gun: true }); }
  R.fx.burst(at.x, 1.1, at.z, 14, m.c, 6, 0.08, 0.5, 4); R.fx.burst(at.x, 1.1, at.z, 6, 0xffffff, 4, 0.05, 0.3, 2); R.fx.glow(at.x, 1.1, at.z, { s: 1.4, s1: 3.2, life: 0.2, color: m.c, i: 1.4 });
  /* M6-B 터질 때 지름 2m 불꽃 원 (바닥 · 0.45초) + 꽃잎 불티 */
  R.fx.arc(at.x, 0.15, at.z, 1.0, 0, Math.PI * 2, { w: 0.32, w1: 0.32, life: 0.45, color: m.c, tail: 1, seg: 16, shrink: 0.2, pw: 0.6 }); R.fx.glow(at.x, 0.12, at.z, { s: 2.2, s1: 2.6, life: 0.45, color: 0xff9a50, i: 0.9, flat: true });
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.random() * 0.4; R.fx.streak(tv.set(at.x + Math.sin(a) * 0.3, 1.1, at.z + Math.cos(a) * 0.3), tv2.set(at.x + Math.sin(a) * 1.4, 0.9, at.z + Math.cos(a) * 1.4), { w: 0.12, w1: 0.02, life: 0.22, color: m.c, tail: 1 }); }
  R.shake = Math.max(R.shake, 0.28); sfx.pop?.(); sfx.hitW?.('rocket');
}
