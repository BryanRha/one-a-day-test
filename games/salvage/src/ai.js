// 적 AI 1단계 확장 (M3-B) — 진영 · 서로 싸움 · 엄폐 · 무리(협공 기초)
//  · 진영: 기계(드론 · 보스 기계) · 빛이끼(해골) · 변종(게 · 해파리 · 장어) · 검은 닻(약탈단, 4장~). 검은 닻만 나머지 모두와 싸움 → 다른 지도는 지금 그대로
//  · 서로 싸움: 가까운 적 진영을 보면(시야 + 막힘 없음) 그쪽을 노림 — 주인공을 보고 있고 더 가까우면 주인공 먼저. 서로 쓰러뜨린 것은 처치 수에 안 셈(잔해는 남음 = 지켜보다 줍기)
//  · 엄폐(소총수): 위협 쪽에서 총알이 막히는 엄폐 자리로 → 숨음(0.7~1.4초) → 옆으로 몸을 내밀어(peek) 겨냥 줄 예고 → 3연발 → 다시 숨음. 맞으면 바로 숨음
//  · 무리: 같은 방에서 시작한 검은 닻 = 무리. 하나가 알아채면 다 같이 · 역할 pin(묶어 둠) · flank(반대쪽으로 돌아 듦) · flush(숨은 자리에 불병을 던져 몰아냄)
//  · M4(AI 2단계)에서 늘릴 자리: ROLE 표에 역할 추가 · Squad.plan() 에 협공 순서 · 소리/빛 반응 · 투척 — 판정 · 이동 · 공격 예고는 raid.js 것을 그대로 씀
import * as THREE from 'three';
import { ENEMIES } from './data.js?v=0.99.10';
import { LOB } from './data/map_factory.js?v=0.99.10';
import { SOLID } from './plan.js?v=0.99.10';
import { glowSprite } from './enemy3d.js?v=0.99.10';
import { sfx } from './audio.js?v=0.99.10';

export const FACTION = { drone: 'machine', boss: 'machine', smelter: 'machine', skel: 'moss', lamp: 'moss', miner: 'moss', captain: 'moss', crab: 'beast', jelly: 'beast', eel: 'beast' };
export const facOf = kind => ENEMIES[kind]?.fac || FACTION[kind] || 'machine';
const HOSTILE = { anchor: { machine: 1, moss: 1, beast: 1 }, machine: { anchor: 1 }, moss: { anchor: 1 }, beast: { anchor: 1 } };
export const hostile = (a, b) => !!HOSTILE[a]?.[b];
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const t1 = V(), t2 = V();
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/* 역할 (M4 에서 늘림): 숨는가 · 쏘는 거리 · 무리 안 위치 */
const ROLE = { pin: { cover: true }, flank: { cover: false, side: 4.5 }, flush: { cover: true, keep: [6, 10] } };

export class AI {
  constructor(R) {
    this.R = R; this.squads = new Map(); this.told = false; this.lobs = []; this.covers = [];
    /* 엄폐 자리: 총알을 막는 엄폐물(바리케이드 · 기계 · 컨테이너) 네 옆 0.8m — 다른 판정 상자 안이면 뺌 */
    for (const p of R.P.props) { if (p.deco) continue; const s = SOLID[p.k]; if (!s || !s[2]) continue; let [hx, hz] = s; if (Math.abs(Math.sin(p.ry || 0)) > 0.7) [hx, hz] = [hz, hx];
      for (const [dx, dz] of [[hx + 0.8, 0], [-hx - 0.8, 0], [0, hz + 0.8], [0, -hz - 0.8]]) { const x = p.x + dx, z = p.z + dz; if (this.blockedAt(x, z)) continue; const rm = R.roomOf({ x, z }); if (rm) this.covers.push({ x, z, room: rm.id, px: p.x, pz: p.z, claim: null }); } }
    for (const e of R.enemies) this.join(e);
  }
  blockedAt(x, z, r = 0.5) { for (const b of this.R.boxes) { if (b.off) continue; const cx = Math.max(b.x0, Math.min(x, b.x1)), cz = Math.max(b.z0, Math.min(z, b.z1)); if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true; } return x < 0.8 || z < 0.8 || x > this.R.P.W - 0.8 || z > this.R.P.H - 0.8; }
  join(e) {
    e.F = facOf(e.kind); e.foeT = Math.random() * 0.4;
    if (e.F !== 'anchor') return;
    e.ai = { mode: 'idle', t: 0, cover: null, peek: null, hitT: -9, side: 0 };
    if (e.squad != null) { let s = this.squads.get(e.squad); if (!s) this.squads.set(e.squad, s = { id: e.squad, members: [], alert: false, side: Math.random() < 0.5 ? -1 : 1 }); s.members.push(e); e.sq = s; }
  }
  /* 한 프레임 한 번: 무리 경보 나눔 · 협공 쪽 정하기 · 날아가는 불병 */
  update(dt) {
    const R = this.R;
    for (const s of this.squads.values()) {
      const live = s.members.filter(m => !m.dead); if (!live.length) continue;
      const lead = live.find(m => m.state === 'chase');
      if (lead) for (const m of live) if (m.state !== 'chase' && m.state !== 'fight' && !m.sleep) { m.state = 'chase'; m.alert = 1; m.target = lead.target ? lead.target.clone() : R.pl.pos.clone(); m.mark = 1.2; m.markType = '!'; }
      if (lead && !s.alert) { s.alert = true; sfx.alert?.((lead.pos.x - R.pl.pos.x) / 12); }
    }
    this.updateLobs(dt);
  }
  /* 적 진영 고르기 (0.4초마다) — 이 적이 노리는 다른 적 · 없으면 null(주인공) */
  foe(e, dt, seesP, distP) {
    if (!e.F || e.D.boss) return null; const R = this.R;
    if (e.foe && (e.foe.dead || e.foe.sleep || dist2(e.foe.pos, e.pos) > e.D.sight * 1.6)) e.foe = null;
    /* 숨었다 내밀며 싸우므로 잠깐 안 보여도 4초는 기억 */
    if (e.foe) { if (R.los(e.pos, e.foe.pos)) e.foeSeenT = R.t; else if (R.t - (e.foeSeenT || 0) > 4) e.foe = null; }
    if ((e.foeT -= dt) > 0) return e.foe;
    e.foeT = 0.35 + Math.random() * 0.2;
    let best = null, bd = e.D.sight * (e.state === 'fight' ? 1.3 : 1.0);
    for (const o of R.enemies) { if (o === e || o.dead || o.sleep || !hostile(e.F, o.F)) continue; const d = dist2(o.pos, e.pos); if (d < bd && R.los(e.pos, o.pos)) { bd = d; best = o; } }
    if (!best && e.foe) best = e.foe;
    if (best && seesP && distP < dist2(best.pos, e.pos) * 1.3 && e.state === 'chase') best = null; /* 주인공이 더 가까우면 주인공 */
    if (best && best !== e.foe) e.foeSeenT = R.t;
    if (best && !this.told && dist2(best.pos, R.pl.pos) < 20) { this.told = true; R.ui.event(e.F === 'anchor' || best.F === 'anchor' ? '검은 닻이 다른 적과 싸워요 — 지켜보다 남은 쪽을 노려요' : '적끼리 싸워요', 'good'); }
    return (e.foe = best);
  }
  /* 다른 적에게 맞힘 (서로 싸움) — 처치 수 · 칭찬 없음, 잔해는 남음 */
  hitEnemy(t, dmg, src, dir) {
    if (!t || t.dead) return; const R = this.R;
    const sh = t.D.shield && dir && (dir.x * Math.sin(t.face) + dir.z * Math.cos(t.face)) < -0.45 ? 1 - t.D.shield : 1;
    const d = Math.round(dmg * sh * (t.D.boss ? 0.5 : 1)); t.hp -= d; t.flash = 0.08; t.stagger = t.D.boss ? 0 : 0.08;
    if (src && !src.dead && hostile(t.F, src.F) && !t.D.boss) { t.foe = src; t.foeT = 0.6; if (t.state !== 'chase') t.state = 'fight'; }
    if (t.ai) t.ai.hitT = R.t;
    R.fx.num(t.pos, String(d), '');
    if (t.hp <= 0) R.kill(t, dir || V(0, 0, 1), src);
  }
  /* 맞힐 대상: 노리는 적 · 없으면 주인공 */
  strike(e, dmg) { if (e.foe && !e.foe.dead) this.hitEnemy(e.foe, dmg, e, t1.copy(e.foe.pos).sub(e.pos).setY(0).normalize()); else this.R.hurt(dmg, e.pos); }

  /* ───── 검은 닻 한 명 (교전 중) — raid.js 의 이동 · 예고 · 판정 위에서 목표 자리 · 빠르기 · 공격 시작만 정함 ───── */
  anchor(e, dt, tp, dist, sees, angToP) {
    const R = this.R, D = e.D, A = e.ai; A.t -= dt;
    const out = { goal: null, spd: D.chase, face: null };
    this.burstTick(e, dt);
    if (e.burstLeft > 0) { out.face = e.burstFace; return out; }
    const hurtNow = R.t - A.hitT < 0.4;
    const role = D.role;
    if (role === 'pin') {
      /* 엄폐 자리 다시 보기: 없거나 · 더는 안 막거나 · 2.5초마다 */
      if (!A.cover || (A.re <= 0 && A.mode === 'move') || (A.mode !== 'peek' && R.los({ x: A.cover.x, z: A.cover.z }, tp))) { /* 숨어 있는 동안엔 엄폐가 뚫릴 때만 다시 찾음 */ this.release(e); A.cover = this.findCover(e, tp); A.re = 2.5; if (A.cover) { A.mode = 'move'; } else A.mode = 'open'; }
      A.re -= dt;
      if (hurtNow && A.mode === 'peek' && A.cover) A.mode = 'move';
      if (A.mode === 'move') { out.goal = V(A.cover.x, 0, A.cover.z); if (dist2(e.pos, A.cover) < 0.45) { A.mode = 'hide'; A.t = 0.7 + Math.random() * 0.7; } }
      else if (A.mode === 'hide') { out.goal = null; out.face = angToP; if (A.t <= 0) { A.peek = this.peekOf(A.cover, tp); A.mode = 'peek'; A.t = 2.4; } }
      else if (A.mode === 'peek') { out.goal = A.peek; out.spd = D.speed * 1.3; out.face = angToP;
        if ((sees && (dist2(e.pos, A.peek) < 0.5 || sees)) && e.cd <= 0 && dist < D.range) this.startAttack(e, angToP); else if (A.t <= 0) { A.mode = 'move'; } }
      else { /* 엄폐 없음: 거리 두고 옆걸음 · 쏨 */
        if (sees && e.cd <= 0 && dist < D.range) this.startAttack(e, angToP);
        else if (dist < 5) out.goal = e.pos.clone().addScaledVector(t1.copy(e.pos).sub(tp).setY(0).normalize(), 3);
        else out.goal = e.pos.clone().add(V(-(tp.z - e.pos.z), 0, tp.x - e.pos.x).normalize().multiplyScalar(Math.sin(e.t * 0.8 + e.id) * 2)).addScaledVector(t2.copy(tp).sub(e.pos).setY(0).normalize(), dist > D.range * 0.8 ? 1.5 : 0); }
      return out;
    }
    if (role === 'flank') {
      /* 소총수가 묶어 두는 동안 반대쪽으로 돌아 듦 → 가까우면 돌진 · 내려침 */
      const pinning = e.sq && e.sq.members.some(m => !m.dead && m !== e && m.D.role === 'pin' && (m.state === 'chase' || m.state === 'fight'));
      if (dist < 2.2 + D.range * 0.3) { out.goal = null; out.face = angToP; if (e.cd <= 0 && sees) this.startAttack(e, angToP); return out; }
      if (pinning && dist > 4.2 && A.mode !== 'charge') {
        const pin = e.sq.members.find(m => !m.dead && m.D.role === 'pin'); const side = Math.sign((pin.pos.x - tp.x) * (e.pos.z - tp.z) - (pin.pos.z - tp.z) * (e.pos.x - tp.x)) || e.sq.side;
        const px = -(pin.pos.z - tp.z), pz = pin.pos.x - tp.x; const l = Math.hypot(px, pz) || 1;
        const fp = V(tp.x + px / l * ROLE.flank.side * side, 0, tp.z + pz / l * ROLE.flank.side * side);
        if (this.blockedAt(fp.x, fp.z, 0.6)) fp.copy(tp);
        out.goal = fp; out.spd = D.chase; if (dist2(e.pos, fp) < 1.4) A.mode = 'charge';
      } else { A.mode = 'charge'; out.goal = tp.clone(); out.spd = D.chase * 1.08; }
      return out;
    }
    if (role === 'flush') {
      /* 거리 6~10 유지 · 가까우면 물러남 · 던질 수 있으면 불병 (엄폐물 너머로도) */
      const [k0, k1] = D.keep || ROLE.flush.keep;
      if (e.cd <= 0 && dist < D.range && dist > 3.2 && (sees || R.t - (e.lastSeenT || -9) < 3)) { this.startAttack(e, angToP, tp); return out; }
      if (sees) e.lastSeenT = R.t;
      if (dist < k0) out.goal = e.pos.clone().addScaledVector(t1.copy(e.pos).sub(tp).setY(0).normalize(), 3);
      else if (dist > k1) out.goal = tp.clone();
      else { if (!A.cover || A.re <= 0) { this.release(e); A.cover = this.findCover(e, tp, k0, k1); A.re = 3; } A.re -= dt; out.goal = A.cover ? V(A.cover.x, 0, A.cover.z) : null; out.face = angToP; }
      return out;
    }
    return out;
  }
  /* 공격 시작 (예고): 소총수 = 겨냥 줄 · 갈퀴꾼 = 앞 원 · 화약꾼 = 팔 들기(떨어질 자리 원은 던질 때) */
  startAttack(e, ang, tp) {
    const R = this.R, D = e.D; e.wind = e.windMax = D.wind; e.cd = D.cd * (0.85 + Math.random() * 0.3); e.lockFace = ang; e.face = ang;
    if (D.atk === 'burst') { e.pat = 'burst'; R.warnLine(e, Math.min(D.range, dist2(e.pos, tp || (e.foe ? e.foe.pos : R.pl.pos)) + 1.5), 0.32, 0xff4a3a); }
    else if (D.atk === 'melee') { e.pat = 'melee'; R.warnDisc(e, 1.9, 0xff6a3a, true); e.warn.position.set(e.pos.x + Math.sin(ang) * 1.1, 0.22, e.pos.z + Math.cos(ang) * 1.1); e.warnFollow = false; }
    else if (D.atk === 'lob') { e.pat = 'lob'; e.lobTo = (tp || (e.foe ? e.foe.pos : R.pl.pos)).clone(); }
    if (e.anim) e.anim.play(D.atk === 'melee' ? '1H_Melee_Attack_Chop' : D.atk === 'lob' ? 'Unarmed_Melee_Attack_Punch_A' : 'Aim', { once: D.atk !== 'burst', fade: 0.06, speed: D.atk === 'melee' ? 0.95 : 1.1, force: true }) || e.anim.play('Idle_Combat', { force: false });
  }
  /* 예고 끝 → 실제 공격 (raid.enemyAttack 이 부름) */
  attack(e, dist) {
    const R = this.R, D = e.D, pl = R.pl;
    if (e.pat === 'burst') { e.burstLeft = D.burst || 3; e.burstT = 0; e.burstFace = e.lockFace; this.burstTick(e, 0); return true; }
    if (e.pat === 'melee') { sfx.swing(); const tp = e.foe && !e.foe.dead ? e.foe.pos : pl.pos; const a = Math.atan2(tp.x - e.pos.x, tp.z - e.pos.z);
      e.pos.addScaledVector(t1.set(Math.sin(e.face), 0, Math.cos(e.face)), 0.6); /* 앞으로 한 걸음 내려침 */
      if (dist2(tp, e.pos) < D.range + 0.45 && Math.abs(((a - e.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 1.25) this.strike(e, D.dmg * e.dmgMul);
      R.fx.burst(e.pos.x + Math.sin(e.face) * 1.2, 0.3, e.pos.z + Math.cos(e.face) * 1.2, 10, 0xd9c7a0, 4, 0.1, 0.5); R.shake = Math.max(R.shake, 0.15); return true; }
    if (e.pat === 'lob') { this.throwLob(e, e.lobTo || pl.pos); return true; }
    return false;
  }
  burstTick(e, dt) {
    if (!(e.burstLeft > 0)) return; e.burstT -= dt; if (e.burstT > 0) return;
    const R = this.R; e.burstT = e.D.burstGap || 0.14; e.burstLeft--;
    const f = e.foe && !e.foe.dead ? e.foe : null; /* 적 진영을 쏠 땐 쏠 때마다 다시 겨눔 (주인공에겐 예고한 줄 그대로 = 피할 수 있음) */
    const a = (f ? Math.atan2(f.pos.x - e.pos.x, f.pos.z - e.pos.z) : e.burstFace) + (Math.random() - 0.5) * 0.09; const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb070 })); m.position.set(e.pos.x + Math.sin(a) * 0.6, 1.1, e.pos.z + Math.cos(a) * 0.6); R.root.add(m); m.add(glowSprite(0xff9a50, 0.55, 0.6));
    R.enemyShots.push({ m, dir: V(Math.sin(a), 0, Math.cos(a)), sp: 15, t: 0, dmg: e.D.dmg * e.dmgMul, from: e.pos.clone(), r: 0.5, src: e });
    sfx.enemyShot((e.pos.x - R.pl.pos.x) / 12); R.fx.burst(e.pos.x + Math.sin(a) * 0.7, 1.1, e.pos.z + Math.cos(a) * 0.7, 3, 0xffd27a, 3, 0.06, 0.2);
    e.anim?.play('Shoot', { once: true, fade: 0.02, speed: 1.6, force: true });
    R.noise(e.pos, 9, 'enemy');
  }
  /* 불병: 포물선 · 떨어질 자리 바닥 원(날아가는 1초 동안 커짐) → 터지며 피해 + 불 */
  throwLob(e, to) {
    const R = this.R; const p = to.clone().setY(0); const d = dist2(p, e.pos); if (d > e.D.range) p.sub(e.pos).setLength(e.D.range).add(e.pos);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.34, 8), new THREE.MeshLambertMaterial({ color: 0x5a7a3a, emissive: 0x3a2a10 })); m.position.copy(e.pos).setY(1.6); R.root.add(m); m.add(glowSprite(0xffa040, 0.7, 0.9));
    const w = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: 0xff6a2a, transparent: true, opacity: 0.3, depthWrite: false })); w.rotation.x = -Math.PI / 2; w.position.set(p.x, 0.23, p.z); w.scale.setScalar(0.3); R.root.add(w);
    this.lobs.push({ m, w, from: e.pos.clone().setY(1.6), to: p, t: 0, dur: LOB.flight, src: e, dmg: e.D.dmg * e.dmgMul });
    sfx.swing?.();
  }
  updateLobs(dt) {
    const R = this.R;
    for (let i = this.lobs.length - 1; i >= 0; i--) { const L = this.lobs[i]; L.t += dt; const k = Math.min(1, L.t / L.dur);
      L.m.position.lerpVectors(L.from, L.to, k); L.m.position.y = 1.6 * (1 - k) + 4.2 * k * (1 - k) + 0.2; L.m.rotation.z += dt * 12;
      L.w.scale.setScalar(LOB.r * (0.3 + 0.7 * k)); L.w.material.opacity = 0.22 + 0.35 * Math.sin(k * 18) ** 2;
      if (k < 1) continue;
      R.root.remove(L.m); L.m.geometry.dispose(); L.m.material.dispose(); L.m.children[0]?.material.dispose(); R.root.remove(L.w); L.w.geometry.dispose(); L.w.material.dispose(); this.lobs.splice(i, 1);
      const p = L.to; sfx.puff?.(); R.fx.burst(p.x, 0.5, p.z, 26, 0xffa040, 7, 0.12, 0.6, 10); R.fx.ring(p.x, p.z, LOB.r, 0xffb060); R.shake = Math.max(R.shake, 0.2); R.noise(p, 10, 'enemy');
      if (!R.pl.dead && dist2(R.pl.pos, p) < LOB.r) R.hurt(L.dmg, p);
      for (const o of R.enemies) if (!o.dead && !o.sleep && o !== L.src && hostile(L.src.F, o.F) && dist2(o.pos, p) < LOB.r + o.D.radius) this.hitEnemy(o, L.dmg, L.src, t1.copy(o.pos).sub(p).setY(0).normalize());
      R.addFire(p.x, p.z, LOB.r * 0.85, LOB.fire, LOB.fireDps); }
  }
  /* 엄폐 자리 찾기: 같은 방 · 9m 안 · 위협에서 총알이 막힘 · 위협과 거리 [min, max] · 무리끼리 겹치지 않게 */
  findCover(e, tp, min = 3.5, max = (e.D.range || 10) + 1) {
    const R = this.R, rm = R.roomOf(e.pos); if (!rm) return null; let best = null, bs = 1e9;
    for (const c of this.covers) { if (c.room !== rm.id || (c.claim && c.claim !== e && !c.claim.dead)) continue; const de = dist2(c, e.pos); if (de > 9) continue; const dt = dist2(c, tp); if (dt < min || dt > max) continue;
      if (R.rayBlock(t1.set(c.x, 0, c.z), tp) >= 0.98) continue; const s = de + Math.abs(dt - (min + max) / 2) * 0.4; if (s < bs) { bs = s; best = c; } }
    if (best) best.claim = e; return best;
  }
  release(e) { if (e.ai?.cover && e.ai.cover.claim === e) e.ai.cover.claim = null; }
  /* 몸 내밀 자리: 엄폐 자리에서 위협 쪽 옆으로 1.4m · 막힘 없는 쪽 */
  peekOf(c, tp) {
    const R = this.R; const dx = tp.x - c.x, dz = tp.z - c.z, l = Math.hypot(dx, dz) || 1; const sx = -dz / l, sz = dx / l;
    for (const s of [1, -1, 1.6, -1.6]) { const x = c.x + sx * 1.4 * s, z = c.z + sz * 1.4 * s; if (this.blockedAt(x, z)) continue; if (R.los(t1.set(x, 0, z), tp)) return V(x, 0, z); }
    return V(c.x + dx / l * 1.2, 0, c.z + dz / l * 1.2);
  }
  dispose() { const R = this.R; for (const L of this.lobs) { R.root?.remove(L.m); R.root?.remove(L.w); L.m.geometry.dispose(); L.m.material.dispose(); L.m.children[0]?.material.dispose(); L.w.geometry.dispose(); L.w.material.dispose(); } this.lobs = []; }
}
