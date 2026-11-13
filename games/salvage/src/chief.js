// 떠돌이 보스 '검은 닻 두목' (M4-A · NARRATIVE 3-4 — 4장부터 밤 판에 무작위 · 지도 무관)
//  바다코끼리 · 등에 훔친 장어 코어 · 거대한 검은 닻 · 호위 소총수 2. 보스방이 아니라 방 사이를 떠돎 → 마주치면 싸우거나 피하거나
//  패턴 3 (모두 예고) + 호루라기: 닻 내던지기(줄) · 닻 내려찍기(원 → 닻이 박혀 2.2초 = 등 코어 약점 ×2) · 수류탄 셋(떨어질 자리 원) · 60% 아래 호루라기(소총수 2)
//  쓰러뜨리면 이야기 조각 '두목의 물길 지도'(5장 복선) — 숫자 data/enemies.js M4_BOSS.chief
import * as THREE from 'three';
import { BOSS } from './data.js?v=0.99.43';
import { RS } from './plan.js?v=0.99.43';
import { sfx } from './audio.js?v=0.99.43';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const SQ = 'chief';

/* 판 시작: 이번 판에 나오면 언제 나올지 (threat.chiefRoll) */
export function chiefStart(R, plan) { R.chiefPlan = plan || null; R.chief = null; R.chiefAnchor = null; }
/* 나타남: 내 자리에서 먼 구역 2 · 3 방 (걸어서 닿는 곳) */
function spawn(R) {
  const pl = R.pl; const rooms = R.P.rooms.filter(r => r.zone >= 2 && r.type !== 'vault' && r.id !== R.P.bossRoom);
  const far = rooms.map(r => ({ r, d: Math.hypot(r.x0 + RS / 2 - pl.pos.x, r.z0 + RS / 2 - pl.pos.z) })).filter(o => o.d > 20 && R.waypoint(pl.pos, V(o.r.x0 + RS / 2, 0, o.r.z0 + RS / 2)) !== null).sort((a, b) => b.d - a.d);
  const rm = (far[Math.floor(R.R() * Math.min(3, far.length))] || far[0])?.r || rooms[0]; if (!rm) return;
  const cx = rm.x0 + RS / 2, cz = rm.z0 + RS / 2;
  const e = R.makeEnemy({ kind: 'chief', x: cx, z: cz, zone: Math.max(2, rm.zone) }, 4000); R.collide(e.pos, 1.1); R.enemies.push(e); R.chief = e; e.roamT = 6; e.home.set(cx, 0, cz);
  for (let k = 0; k < 2; k++) { const a = k * Math.PI + 0.6; const m = R.makeEnemy({ kind: 'raider', x: cx + Math.cos(a) * 2, z: cz + Math.sin(a) * 2, zone: rm.zone, squad: SQ }, 4001 + k); R.collide(m.pos, 0.5); m.escort = e; R.enemies.push(m); }
  sfx.roar?.(0, 'captain'); sfx.chiefHorn?.(); R.shake = Math.max(R.shake, 0.3); /* 검수 M4 Top 10: 등장 호루라기 + 뱃고동 */
  (R.aiSt ||= {}).chief = 1; R.ui.event('검은 닻 두목이 나타났어요 — 방 사이를 떠돌아요 (붉은 닻 표시)', 'boss');
}
/* 매 프레임 (raid.updateMapFx 뒤) */
export function chiefTick(R, dt) {
  const P = R.chiefPlan; if (P && !R.chief && R.elapsed >= P.at && !R.over) spawn(R);
  const e = R.chief; if (!e) return;
  /* 떠돌기: 쉬는 동안 몇 초마다 이웃 방으로 (호위도 따라옴) */
  if (!e.dead && e.state === 'idle') { e.roamT -= dt; if (e.roamT <= 0) { e.roamT = 7 + R.R() * 5; const rm = R.roomOf(e.pos);
      const nb = rm ? R.P.doors.filter(d => (d.a === rm.id || d.b === rm.id) && R.doorOpen(d)).map(d => (d.a === rm.id ? d.b : d.a)) : []; const id = nb[Math.floor(R.R() * nb.length)];
      const N = R.P.rooms.find(r => r.id === id); if (N && N.type !== 'vault') { e.home.set(N.x0 + RS / 2, 0, N.z0 + RS / 2); e.wander = e.home.clone(); e.t = 0; } } }
  for (const m of R.enemies) if (m.escort === e && !m.dead) { if (e.state === 'chase' && m.state !== 'chase') { m.state = 'chase'; m.alert = 1; m.target = R.pl.pos.clone(); } else if (m.state === 'chase' && e.state !== 'chase' && !e.dead) { e.state = 'chase'; e.alert = 1; e.target = R.pl.pos.clone(); e.mark = 1.2; e.markType = '!'; }
    if (m.state === 'idle') { m.home.copy(e.pos); } }
  /* 날아가는 닻 */
  const A = R.chiefAnchor; if (A) { const B = BOSS.chief.throw;
    if (!A.back) { const st = Math.min(A.left, B.speed * dt); A.m.position.addScaledVector(A.dir, st); A.left -= st; A.m.rotation.x += dt * 14;
      const p = A.m.position; if (!A.hit && !R.pl.dead && Math.hypot(R.pl.pos.x - p.x, R.pl.pos.z - p.z) < B.w / 2 + 0.45) { A.hit = true; R.tele = { t: R.t - A.t0, k: 'chief' }; R.hurt(B.dmg, p.clone().setY(0)); R.tele = null; }
      if (A.left <= 0 || R.rayBlock(p.clone().addScaledVector(A.dir, -0.3), p.clone().addScaledVector(A.dir, 0.3)) < 1) { A.back = true; sfx.slam?.(); R.fx.burst(p.x, 0.4, p.z, 14, 0xd9c7a0, 5, 0.12, 0.6); R.shake = Math.max(R.shake, 0.25); } }
    else { const to = V(e.pos.x, 1.2, e.pos.z); A.m.position.lerp(to, Math.min(1, dt * 5)); if (A.m.position.distanceTo(to) < 0.8 || e.dead) { R.root.remove(A.m); A.m.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); R.chiefAnchor = null; } }
    if (A.chain) { A.chain.position.set((A.m.position.x + e.pos.x) / 2, 1.1, (A.m.position.z + e.pos.z) / 2); const l = dist2(A.m.position, e.pos); A.chain.scale.set(1, 1, Math.max(0.1, l)); A.chain.rotation.y = Math.atan2(A.m.position.x - e.pos.x, A.m.position.z - e.pos.z); } }
}
/* 패턴 고르기 · 예고 (raid.bossWind 가 부름) */
export function chiefWind(R, e, dist, rage) {
  const pl = R.pl, B = BOSS.chief; const ang = Math.atan2(pl.pos.x - e.pos.x, pl.pos.z - e.pos.z);
  if (e.hp < e.maxHp * B.whistle.below && e.pcd <= 0) { e.pat = 'whistle'; e.windMax = e.wind = 0.8; e.pcd = B.whistle.cd; e.anim?.play('Taunt', { once: true, fade: 0.05, speed: 1, force: true }); }
  else if (dist < 4.2) { e.pat = 'slam'; e.windMax = e.wind = B.slam.wind / rage; e.lockFace = e.face; R.warnDisc(e, B.slam.r, 0xff4a30); e.anim?.play('1H_Melee_Attack_Chop', { once: true, fade: 0.05, speed: 0.75 * rage, force: true }); }
  else if (dist < 9.5 && R.los(e.pos, pl.pos) && !R.chiefAnchor) { e.pat = 'throw'; e.windMax = e.wind = B.throw.wind / rage; e.lockFace = ang; e.face = ang; R.warnLine(e, B.throw.len, B.throw.w, 0xffa060); e.anim?.play('Unarmed_Melee_Attack_Punch_A', { once: true, fade: 0.05, speed: 0.6, force: true }); }
  else { e.pat = 'volley'; e.windMax = e.wind = B.volley.wind; e.lockFace = ang; e.face = ang; e.anim?.play('Unarmed_Melee_Attack_Punch_A', { once: true, fade: 0.05, speed: 0.9, force: true }); }
  e.cd = e.D.cd / rage; sfx.chiefWarn?.(e.pat, e.windMax); /* 검수 M4 Top 10: 패턴마다 전용 예고음 */
}
export function chiefAttack(R, e, dist) {
  const pl = R.pl, B = BOSS.chief;
  if (e.pat === 'slam') { sfx.slam?.(); R.shake = Math.max(R.shake, 0.75); R.fx.ring(e.pos.x, e.pos.z, B.slam.r, 0xffb060); R.fx.burst(e.pos.x, 0.3, e.pos.z, 36, 0xd9c7a0, 8, 0.14, 0.8, 20); if (dist < B.slam.r) R.hurt(B.slam.dmg, e.pos);
    e.weakT = B.slam.stuck; e.stun = B.slam.stuck * 0.9; R.ui.weak('닻이 박혔어요 — 등의 장어 코어가 약점!'); return; }
  if (e.pat === 'throw') { const dir = V(Math.sin(e.lockFace), 0, Math.cos(e.lockFace));
    const g = new THREE.Group(); const iron = new THREE.MeshLambertMaterial({ color: 0x22262a }); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.3, 6), iron); g.add(sh);
    const arm = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 6, 12, Math.PI), iron); arm.rotation.z = Math.PI; arm.position.y = -0.55; g.add(arm); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 6, 10), new THREE.MeshLambertMaterial({ color: 0xeef0f2 })); ring.position.y = 0.72; g.add(ring);
    g.position.set(e.pos.x + dir.x * 1.2, 1.2, e.pos.z + dir.z * 1.2); g.rotation.y = e.lockFace; R.root.add(g);
    const chain = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1), new THREE.MeshLambertMaterial({ color: 0x5a524c })); R.root.add(chain); g.userData.chain = chain;
    R.chiefAnchor = { m: g, dir, left: B.throw.len - 1.2, hit: false, back: false, t0: R.tele?.t0 ?? R.t, chain }; e.stun = Math.max(e.stun || 0, 0.9); sfx.swing?.(); return; }
  if (e.pat === 'volley') { const V3 = B.volley; for (let i = 0; i < V3.n; i++) { const a = R.R() * Math.PI * 2, r = i === 0 ? 0 : V3.spread * (0.6 + R.R() * 0.4); const to = V(pl.pos.x + Math.cos(a) * r, 0, pl.pos.z + Math.sin(a) * r);
      R.ai.throwLob(e, to, 'nade', { r: V3.r, dmg: V3.dmg, flight: V3.flight + i * 0.12, range: 14 }); } return; }
  if (e.pat === 'whistle') { const n = R.ai.callIn(e, B.whistle.adds, 1.5, 'raider'); sfx.siren?.(); R.shake = Math.max(R.shake, 0.3); if (n) R.ui.event('두목이 호루라기를 불었어요 — 소총수가 와요', 'warn'); }
}
/* 쓰러짐 (raid.kill 이 부름) */
export function chiefDown(R, e) {
  R.chiefDown = true; if (R.chiefAnchor) { R.chiefAnchor.back = true; if (R.chiefAnchor.chain) { R.root.remove(R.chiefAnchor.chain); R.chiefAnchor.chain.geometry.dispose(); R.chiefAnchor.chain.material.dispose(); R.chiefAnchor.chain = null; } }
  R.ui.event("검은 닻 두목을 쓰러뜨렸어요! 짐에서 '두목의 물길 지도'가 — 대수문 꼭대기에 붉은 동그라미", 'good'); sfx.rare?.();
}
export function chiefDispose(R) { const A = R.chiefAnchor; if (A) { R.root?.remove(A.m); A.m.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); if (A.chain) { R.root?.remove(A.chain); A.chain.geometry.dispose(); A.chain.material.dispose(); } } R.chiefAnchor = null; }
