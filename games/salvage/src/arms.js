// 수달 인양단 — 무기 특수 동작 · 탄약 상성 (M3-A · v0.6) — raid.js 가 부름 (raid 인스턴스를 받음)
//  근접 휘두르기(렌치) · 감전 연쇄(전류) · 조명탄(터짐 + 불 + 빛 웅덩이) · 물속 특화(잠수) · 탄약 × 적 방어/방패/기계
import * as THREE from 'three';
import { AMMO, ARMOR, MACHINE } from './data.js?v=0.99.10';
import { sfx } from './audio.js?v=0.99.10';

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
  /* 휘두른 자국: 부채꼴 끝 세 점 */
  for (const a of [-0.45, 0, 0.45]) { const t = base + a * w.arc; R.fx.burst(pl.pos.x + Math.sin(t) * 1.5, 1.0, pl.pos.z + Math.cos(t) * 1.5, 4, 0xe8e2d0, 3, 0.06, 0.22, 4); }
  (hit ? sfx.hit : sfx.cover)(); R.kickCam(V(Math.sin(base), 0, Math.cos(base)), -0.18); R.shake = Math.max(R.shake, hit ? 0.25 : 0.08);
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
    R.fx.tracer(cur.pos.clone().setY(1.1), best.pos.clone().setY(1.1)); R.fx.burst(best.pos.x, 1.1, best.pos.z, 6, 0x9fe8ff, 4, 0.06, 0.3, 4);
    best.stagger = Math.max(best.stagger || 0, C.stun);
    R.damage(best, dmg * C.mul, best.pos.clone().sub(cur.pos).setY(0).normalize(), best.pos.clone().setY(1.0), 0, true, { gun: true, chain: true }); cur = best;
  }
}
/* 조명탄: 맞은 곳(또는 사거리 끝 · 벽)에서 터짐 → 둘레 피해 · 불(적만) · 빛 웅덩이 */
export function blast(R, at) {
  const w = R.w, B = w.blast;
  for (const e of R.enemies) { if (e.dead || e.sleep) continue; const d = Math.hypot(e.pos.x - at.x, e.pos.z - at.z); if (d > B.r + e.D.radius) continue;
    R.damage(e, w.dmg * (1 - 0.4 * Math.min(1, d / B.r)), e.pos.clone().sub(at).setY(0).normalize(), e.pos.clone().setY(1.0), w.crit, false, { gun: true }); }
  (R.burns ||= []).push({ x: at.x, z: at.z, r: B.r, t: B.burn, dps: B.dps, tick: 0 });
  if (w.light) (R.flares ||= []).push({ x: at.x, z: at.z, r: 5.5, t: w.light });
  R.fx.burst(at.x, 0.8, at.z, 30, 0xff9a3c, 8, 0.12, 0.7, 10); R.fx.burst(at.x, 0.8, at.z, 14, 0xfff0b0, 5, 0.08, 0.5, 2); R.fx.ring(at.x, at.z, B.r, 0xffb060);
  R.shake = Math.max(R.shake, 0.35); sfx.boom?.();
}
/* 매 프레임: 불 · 빛 */
export function armsTick(R, dt) {
  if (R.burns?.length) { for (const b of R.burns) { b.t -= dt; b.tick -= dt; if (b.tick <= 0) { b.tick = 0.5;
      for (const e of R.enemies) if (!e.dead && !e.sleep && Math.hypot(e.pos.x - b.x, e.pos.z - b.z) < b.r) R.damage(e, b.dps * 0.5, V(), e.pos.clone().setY(0.6), 0, true, {});
      R.fx.burst(b.x + (R.R() - 0.5) * b.r, 0.3, b.z + (R.R() - 0.5) * b.r, 4, 0xff7a3a, 2, 0.08, 0.5, -3); } }
    R.burns = R.burns.filter(b => b.t > 0); }
  if (R.flares?.length) { for (const f of R.flares) f.t -= dt; R.flares = R.flares.filter(f => f.t > 0); }
}
export const flarePools = R => (R.flares || []).map(f => ({ x: f.x, z: f.z, r: f.r * Math.min(1, f.t / 1.2 + 0.3) }));
