// 적 AI — 1단계(M3-B) 진영 · 서로 싸움 · 엄폐 · 무리 + 2단계(M4-A) 엄폐 사이 이동 · 내밀기 타이밍 · 협공 · 투척 · 소리/빛 · 후퇴 · 구조 요청
//  · 진영: 기계(드론 · 기뢰 · 보스 기계) · 빛이끼(해골 · 저격수) · 변종(게 · 해파리 · 장어 · 소라게 · 문어) · 검은 닻(약탈단 · 두목). 검은 닻만 나머지 모두와 싸움
//    4장부터 검은 닻 순찰대가 다른 지도에도 나옴(threat.populate) → 세 진영이 어느 지도에서나 엉킴 · 2단계부터 다른 적의 총소리 · 폭발도 들어 싸움터로 모여듦
//  · AI 단계(위협 Lv → threat.js): 1 = M3 그대로 / 2 = 엄폐 사이 이동 · 장전 때 내밀기 · 눌림 · 근접 양쪽 끼기 · 구조 요청 · 후퇴 · 벽 너머 소리 · 빛 반응 / 3 = + 숨은 곳에 수류탄
//  · 역할(ROLE · ENEMIES[k].role): pin(소총수) · flank(갈퀴꾼) · flush(화약꾼) · sniper(저격수) · signal(신호수) · shield(소라게) · stealth(문어) · kamikaze(기뢰)
//  · 판정 · 이동 · 공격 예고는 raid.js 것을 그대로 · 새 적 공격 모양은 foes.js · 두목은 chief.js
//  · 모든 큰 공격은 예고(바닥 원 · 줄 · 떨어질 자리) — 예고를 띄우면 e.teleT0 (raid.warnDisc/warnLine) → raid.hurt 가 '예고 없는 큰 피해' 자동 검사
import * as THREE from 'three';
import { ENEMIES } from './data.js?v=0.99.34';
import { LOB } from './data/map_factory.js?v=0.99.34';
import { AI2, NADE } from './data/enemies.js?v=0.99.34';
import { SOLID } from './plan.js?v=0.99.34';
import { glowSprite } from './enemy3d.js?v=0.99.34';
import { sfx } from './audio.js?v=0.99.34';
import { foeWind } from './foes.js?v=0.99.34';
import { hazard } from './a11y.js?v=0.99.34'; /* M6-C 색약 보조: 위험 예고 빗금 */

export const FACTION = { drone: 'machine', boss: 'machine', smelter: 'machine', skel: 'moss', lamp: 'moss', miner: 'moss', captain: 'moss', crab: 'beast', jelly: 'beast', eel: 'beast' };
export const facOf = kind => ENEMIES[kind]?.fac || FACTION[kind] || 'machine';
const HOSTILE = { anchor: { machine: 1, moss: 1, beast: 1 }, machine: { anchor: 1 }, moss: { anchor: 1 }, beast: { anchor: 1 } };
export const hostile = (a, b) => !!HOSTILE[a]?.[b];
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const t1 = V(), t2 = V();
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const MELEE = k => ENEMIES[k]?.atk === 'melee';
export const st = (R, k) => { const o = R.aiSt || (R.aiSt = {}); o[k] = (o[k] || 0) + 1; }; /* 시험용 행동 세기 (m4a_ai.mjs) */
const RANGED = k => ['shoot', 'throw', 'burst', 'snipe', 'lob'].includes(ENEMIES[k]?.atk);

/* 역할: 숨는가 · 쏘는 거리 · 무리 안 위치 */
export const ROLE = { pin: { cover: true }, flank: { cover: false, side: 4.5 }, flush: { cover: true, keep: [6, 10] }, sniper: { cover: true, keep: [10, 16] }, signal: { cover: true, keep: [9, 14] }, shield: {}, stealth: {}, kamikaze: {} };

export class AI {
  constructor(R, T) {
    this.R = R; this.lv = T?.ai || 1; this.squads = new Map(); this.told = false; this.lobs = []; this.covers = []; this.reinf = []; this.calls = 0; this.helpTold = false; this.nadeT = -9; this.chasers = [];
    /* 엄폐 자리: 총알을 막는 엄폐물(바리케이드 · 기계 · 컨테이너) 네 옆 0.8m — 다른 판정 상자 안이면 뺌 */
    for (const p of R.P.props) { if (p.deco) continue; const s = SOLID[p.k]; if (!s || !s[2]) continue; let [hx, hz] = s; if (Math.abs(Math.sin(p.ry || 0)) > 0.7) [hx, hz] = [hz, hx];
      for (const [dx, dz] of [[hx + 0.8, 0], [-hx - 0.8, 0], [0, hz + 0.8], [0, -hz - 0.8]]) { const x = p.x + dx, z = p.z + dz; if (this.blockedAt(x, z)) continue; const rm = R.roomOf({ x, z }); if (rm) this.covers.push({ x, z, room: rm.id, px: p.x, pz: p.z, claim: null }); } }
    for (const e of R.enemies) this.join(e);
  }
  blockedAt(x, z, r = 0.5) { for (const b of this.R.boxes) { if (b.off) continue; const cx = Math.max(b.x0, Math.min(x, b.x1)), cz = Math.max(b.z0, Math.min(z, b.z1)); if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true; } return x < 0.8 || z < 0.8 || x > this.R.P.W - 0.8 || z > this.R.P.H - 0.8; }
  join(e) {
    e.F = facOf(e.kind); e.foeT = Math.random() * 0.4;
    if (!e.D.role || e.D.boss) return;
    e.ai = { mode: 'idle', t: 0, cover: null, peek: null, hitT: -9, side: 0, peeks: 0, sup: 0, nadeCd: 2 + Math.random() * 3, retreat: 0 };
    if (e.squad != null) { let s = this.squads.get(e.squad); if (!s) this.squads.set(e.squad, s = { id: e.squad, members: [], alert: false, side: Math.random() < 0.5 ? -1 : 1, nadeT: -9 }); s.members.push(e); e.sq = s; }
  }
  /* 한 프레임 한 번: 무리 경보 · 신호수 시야 나눔 · 근접 협공 목록 · 지원 도착 · 날아가는 불병/수류탄 */
  update(dt) {
    const R = this.R;
    for (const s of this.squads.values()) {
      const live = s.members.filter(m => !m.dead); if (!live.length) continue;
      const lead = live.find(m => m.state === 'chase');
      if (lead) for (const m of live) if (m.state !== 'chase' && m.state !== 'fight' && !m.sleep) { m.state = 'chase'; m.alert = 1; m.target = lead.target ? lead.target.clone() : R.pl.pos.clone(); m.mark = 1.2; m.markType = '!'; }
      if (lead && !s.alert) { s.alert = true; sfx.alert?.((lead.pos.x - R.pl.pos.x) / 12); }
      /* 신호수가 살아 있으면: 무리가 나를 본 자리를 나눠 앎 · 더 빨리 내밂 */
      s.signal = live.some(m => m.D.role === 'signal');
      if (s.signal && this.lv >= 2) { const seer = live.find(m => m.seen > 0 && m.state === 'chase'); if (seer) for (const m of live) if (m !== seer && m.state === 'chase') { m.target = R.pl.pos.clone(); m.seen = Math.max(m.seen, 0.1); } }
    }
    /* 근접 협공 대상 (2단계): 주인공을 쫓는 근접 적 — 같은 진영 아니어도 같은 목표면 양쪽으로 */
    this.chasers.length = 0;
    if (this.lv >= 2) for (const e of R.enemies) if (!e.dead && !e.sleep && !e.D.boss && e.state === 'chase' && !e.foe && MELEE(e.kind) && dist2(e.pos, R.pl.pos) < 14) this.chasers.push(e);
    /* 신호탄 지원 도착 */
    for (let i = this.reinf.length - 1; i >= 0; i--) { const f = this.reinf[i]; f.t -= dt; if (f.t > 0) continue; this.reinf.splice(i, 1); this.arrive(f); }
    this.updateLobs(dt);
  }
  /* 신호수 · 두목 호루라기: 가까운 문 앞으로 n 명 (보이게 등장 · 공격은 늘 예고) */
  callIn(src, n, delay, kind = 'raider') {
    const R = this.R; const cap = Math.max(0, 4 - this.calls); n = Math.min(n, cap); if (n <= 0) return 0; this.calls += n;
    const rm = R.roomOf(src.pos); let door = null, bd = 1e9; for (const d of R.P.doors) { if (!rm || (d.a !== rm.id && d.b !== rm.id) || !R.doorOpen(d)) continue; const dd = Math.hypot(d.x - src.pos.x, d.z - src.pos.z); if (dd < bd) { bd = dd; door = d; } }
    const p = door ? V(door.x, 0, door.z) : src.pos.clone().add(V(2, 0, 2));
    const mk = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.0, 24), new THREE.MeshBasicMaterial({ color: 0xff4a3a, transparent: true, opacity: 0.6, depthWrite: false })); mk.rotation.x = -Math.PI / 2; mk.position.set(p.x, 0.24, p.z); R.root.add(mk);
    st(R, 'call'); this.reinf.push({ t: delay, n, p, kind, squad: src.squad ?? src.sq?.id ?? ('c' + src.id), zone: src.zone || 2, mk });
    return n;
  }
  arrive(f) {
    const R = this.R; R.root.remove(f.mk); f.mk.geometry.dispose(); f.mk.material.dispose();
    for (let k = 0; k < f.n; k++) { const a = k * 2.4 + Math.random(); const e = R.makeEnemy({ kind: f.kind, x: f.p.x + Math.cos(a) * 1.3, z: f.p.z + Math.sin(a) * 1.3, zone: f.zone, squad: f.squad }, 3000 + R.enemies.length);
      R.collide(e.pos, 0.5); e.state = 'chase'; e.alert = 1; e.target = R.pl.pos.clone(); e.mark = 1.4; e.markType = '!'; R.enemies.push(e); R.fx.burst(e.pos.x, 0.6, e.pos.z, 12, 0xd9c7a0, 4, 0.1, 0.5); }
    sfx.alert?.((f.p.x - R.pl.pos.x) / 12); st(R, 'arrive');
  }
  /* 듣기 (raid.updateEnemies 의 소리 줄을 대신) — 1단계 = 전과 같음(주인공 소리만) · 2단계 = 벽 너머 0.6배 · 다른 적 총소리/폭발 · 구조 요청 */
  hear(e, D, hearMul) {
    const R = this.R;
    for (const n of R.noises) {
      const fromP = n.src === 'player'; if (!fromP && this.lv < 2) continue;
      const seen = n.seen || (n.seen = new Set()); if (seen.has(e)) continue; seen.add(e); /* 소리는 0.1초 남음 — 적 하나가 한 번만 (성능) */
      if (n.src === 'help') { if (n.fac !== e.F || n.who === e || e.state === 'chase') continue; }
      else if (!fromP && (e.state === 'chase' || e.state === 'fight' || n.who === e)) continue;
      const r = n.r * D.hear * hearMul; const d = n.p.distanceTo(e.pos); if (d >= r) continue;
      if (this.lv >= 2 && d >= r * AI2.wall && !R.los(n.p, e.pos)) { st(R, 'wall'); continue; } /* 벽 너머는 덜 들림 */
      if (fromP && e.state === 'chase') continue;
      if (!fromP) st(R, n.src === 'help' ? 'helped' : 'hearFight');
      if (n.src === 'help' && n.tgt) { e.state = 'chase'; e.alert = 1; e.target = n.tgt.clone(); e.mark = 1.2; e.markType = '!'; continue; }
      e.state = 'investigate'; e.target = n.p.clone(); e.alert = Math.max(e.alert, 0.5); if (e.mark <= 0) { e.mark = 1.2; e.markType = '?'; }
    }
  }
  /* 적 진영 고르기 (0.4초마다) — 이 적이 노리는 다른 적 · 없으면 null(주인공) */
  foe(e, dt, seesP, distP) {
    if (!e.F || e.D.boss) return null; const R = this.R;
    if (e.foe && (e.foe.dead || e.foe.sleep || dist2(e.foe.pos, e.pos) > e.D.sight * 1.6)) e.foe = null;
    /* 숨었다 내밀며 싸우므로 잠깐 안 보여도 4초는 기억 */
    if (e.foe && !(e.foeChkT > R.t)) { e.foeChkT = R.t + 0.15; if (R.los(e.pos, e.foe.pos)) e.foeSeenT = R.t; else if (R.t - (e.foeSeenT || 0) > 4) e.foe = null; } /* 0.15초마다 (성능) */
    if ((e.foeT -= dt) > 0) return e.foe;
    e.foeT = 0.35 + Math.random() * 0.2;
    let best = null; const bd = e.D.sight * (e.state === 'fight' ? 1.3 : 1.0); const cand = [];
    for (const o of R.enemies) { if (o === e || o.dead || o.sleep || !hostile(e.F, o.F)) continue; const d = dist2(o.pos, e.pos); if (d < bd) cand.push([d, o]); }
    if (cand.length) { cand.sort((a, b) => a[0] - b[0]); for (const [, o] of cand) if (R.los(e.pos, o.pos)) { best = o; break; } } /* 가까운 순으로 보일 때까지만 (성능) */
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
    R.hn.hit(t, t.pos, d, sh < 1 ? 'block' : ''); /* 같은 적 0.25초 안은 하나로 (검수 M3 Top 6) */
    if (t.hp <= 0) R.kill(t, dir || V(0, 0, 1), src || 'blast');
  }
  /* 맞힐 대상: 노리는 적 · 없으면 주인공 */
  strike(e, dmg) { if (e.foe && !e.foe.dead) this.hitEnemy(e.foe, dmg, e, t1.copy(e.foe.pos).sub(e.pos).setY(0).normalize()); else this.R.hurt(dmg, e.pos); }

  /* ───── 역할 없는 적 (2단계): 근접 양쪽 끼기 · 구조 요청 · 후퇴 · 빛이끼는 빛으로 ───── */
  steer(e, dt, goal, spd, dist, sees) {
    if (this.lv < 2 || e.D.boss) return null; const R = this.R, D = e.D;
    this.helpCheck(e);
    if (e.state === 'idle' && e.F === 'moss') { const L = this.lightNear(e.pos); if (L) { if (!e.lightSt) { e.lightSt = 1; st(R, 'light'); } return { goal: V(L.x + Math.sin(e.id) * 1.5, 0, L.z + Math.cos(e.id) * 1.5), spd: D.speed * 0.6 }; } return null; }
    if (e.state !== 'chase') return null;
    if ((e.retreatT || 0) > 0) { e.retreatT -= dt; return { goal: e.pos.clone().addScaledVector(t1.copy(e.pos).sub(R.pl.pos).setY(0).normalize(), 4), spd: D.chase }; }
    if (e.kind === 'crab' && e.hp < e.maxHp * AI2.help && !e.fled) { e.fled = 1; e.retreatT = AI2.retreat * 0.6; st(R, 'retreat'); }
    const i = this.chasers.indexOf(e);
    if (i > 0 && dist > 3.2 && !e.foe) { /* 첫째는 곧장 · 나머지는 양쪽으로 벌려 끼고 듦 */
      const side = i % 2 ? 1 : -1; const tp = R.pl.pos; const dx = e.pos.x - tp.x, dz = e.pos.z - tp.z, l = Math.hypot(dx, dz) || 1;
      const g = V(tp.x + (-dz / l) * AI2.pincer * side + dx / l * 1.2, 0, tp.z + (dx / l) * AI2.pincer * side + dz / l * 1.2); if (!this.blockedAt(g.x, g.z, 0.5)) { if (!e.pinSt) { e.pinSt = 1; st(R, 'pincer'); } return { goal: g, spd: spd * 1.05 }; }
    }
    return null;
  }
  /* 구조 요청: 다치면 같은 진영을 부름 (기계 = 경보음 · 검은 닻 = 외침 · 변종 = 울음) — 빛이끼는 안 부름 */
  helpCheck(e) {
    if (this.lv < 2 || e.helped || e.F === 'moss' || e.D.boss || e.hp >= e.maxHp * AI2.help || e.state !== 'chase') return;
    const R = this.R; e.helped = 1; st(R, 'help'); R.noises.push({ p: e.pos.clone(), r: AI2.helpR, src: 'help', fac: e.F, who: e, tgt: (e.foe && !e.foe.dead ? e.foe.pos : R.pl.pos).clone(), t: 0 });
    e.mark = 1.4; e.markType = '!'; sfx.alert?.((e.pos.x - R.pl.pos.x) / 12);
    if (!this.helpTold && dist2(e.pos, R.pl.pos) < 18) { this.helpTold = true; R.ui.event('다친 적이 도움을 불러요 — 근처 같은 편이 몰려와요', 'warn'); }
    if (e.sq) for (const m of e.sq.members) if (!m.dead && m.D.role === 'signal' && m.cd > 2) m.cd = 2; /* 신호수가 들으면 곧 신호탄 */
  }
  lightNear(p) { let best = null, bd = AI2.lightPull; for (const L of this.R.lightPools()) { const d = Math.hypot(L.x - p.x, L.z - p.z); if (d < bd && d > 1.5) { bd = d; best = L; } } return best; }

  /* ───── 역할 있는 적 (교전 중) — raid.js 의 이동 · 예고 · 판정 위에서 목표 자리 · 빠르기 · 공격 시작만 정함 ───── */
  role(e, dt, tp, dist, sees, angToP) {
    const R = this.R, D = e.D, A = e.ai; A.t -= dt; A.nadeCd -= dt;
    const out = { goal: null, spd: D.chase, face: null };
    this.burstTick(e, dt);
    if (e.burstLeft > 0) { out.face = e.burstFace; return out; }
    if (sees) { e.lastSeenT = R.t; A.lastP = tp.clone(); }
    const hurtNow = R.t - A.hitT < 0.4;
    const role = D.role;
    this.helpCheck(e);
    /* 후퇴 (2단계): 검은 닻이 크게 다치면 한 번 물러나 무리 쪽으로 · 문어는 먹물 뒤로 (foes.js) */
    if (this.lv >= 2 && e.F === 'anchor' && !A.fled && e.hp < e.maxHp * AI2.help && role !== 'signal') { A.fled = 1; A.retreat = AI2.retreat; this.release(e); A.cover = null; st(R, 'retreat'); }
    if (A.retreat > 0) { A.retreat -= dt; const mate = e.sq?.members.find(m => !m.dead && m !== e); const away = t1.copy(e.pos).sub(tp).setY(0).normalize();
      out.goal = mate && dist2(mate.pos, tp) > dist ? mate.pos.clone().addScaledVector(away, 1.5) : e.pos.clone().addScaledVector(away, 4); out.spd = D.chase * 1.1; return out; }
    /* 3단계: 숨어 버린 나에게 수류탄 (마지막으로 본 자리 · 무리 6초 · 한 명 12초) */
    if (this.lv >= 3 && (role === 'pin' || role === 'flush') && !sees && A.lastP && A.nadeCd <= 0 && e.cd <= 0 && R.t - (e.lastSeenT || -9) > 1.5 && R.t - (e.lastSeenT || -9) < 6 && dist2(A.lastP, e.pos) < 12 && dist2(A.lastP, e.pos) > 3.5 && R.t - (e.sq?.nadeT ?? this.nadeT) > NADE.squadCd && !e.foe) {
      A.nadeCd = NADE.cd; if (e.sq) e.sq.nadeT = R.t; else this.nadeT = R.t; this.startNade(e, A.lastP); st(R, 'nade'); return out; }
    if (role === 'pin' || role === 'sniper') return this.pin(e, dt, tp, dist, sees, angToP, out, hurtNow);
    if (role === 'flank') {
      /* 소총수가 묶어 두는 동안 반대쪽으로 돌아 듦 → 가까우면 돌진 · 내려침 · 2단계: 갈퀴꾼 둘이면 양쪽으로 끼기 */
      const pinning = e.sq && e.sq.members.some(m => !m.dead && m !== e && (m.D.role === 'pin' || m.D.role === 'sniper') && (m.state === 'chase' || m.state === 'fight'));
      if (dist < 2.2 + D.range * 0.3) { out.goal = null; out.face = angToP; if (e.cd <= 0 && sees) this.startAttack(e, angToP); return out; }
      if (pinning && dist > 4.2 && A.mode !== 'charge') {
        const pin = e.sq.members.find(m => !m.dead && (m.D.role === 'pin' || m.D.role === 'sniper')); let side = Math.sign((pin.pos.x - tp.x) * (e.pos.z - tp.z) - (pin.pos.z - tp.z) * (e.pos.x - tp.x)) || e.sq.side;
        if (this.lv >= 2) { const fl = e.sq.members.filter(m => !m.dead && m.D.role === 'flank'); const k = fl.indexOf(e); if (fl.length > 1 && k > 0) side = k % 2 ? -side : side; }
        if (!A.flSt) { A.flSt = 1; st(R, 'flank'); }
        const px = -(pin.pos.z - tp.z), pz = pin.pos.x - tp.x; const l = Math.hypot(px, pz) || 1;
        const fp = V(tp.x + px / l * ROLE.flank.side * side, 0, tp.z + pz / l * ROLE.flank.side * side);
        if (this.blockedAt(fp.x, fp.z, 0.6)) fp.copy(tp);
        out.goal = fp; out.spd = D.chase; if (dist2(e.pos, fp) < 1.4) A.mode = 'charge';
      } else { A.mode = 'charge'; out.goal = tp.clone(); out.spd = D.chase * 1.08; }
      return out;
    }
    if (role === 'flush' || role === 'signal') {
      /* 거리 유지 · 가까우면 물러남 · 던질/쏠 수 있으면 (엄폐물 너머로도) */
      const [k0, k1] = D.keep || ROLE[role].keep;
      const ready = role === 'signal' ? (e.calls ?? D.calls) > 0 && this.calls < 4 && (sees || (e.sq?.alert && R.t - (e.lastSeenT || -9) < 8)) : (sees || R.t - (e.lastSeenT || -9) < 3);
      if (e.cd <= 0 && dist < D.range && dist > 3.2 && ready) { this.startAttack(e, angToP, tp); return out; }
      if (dist < k0) out.goal = e.pos.clone().addScaledVector(t1.copy(e.pos).sub(tp).setY(0).normalize(), 3);
      else if (dist > k1) out.goal = tp.clone();
      else { if (!A.cover || A.re <= 0) { this.release(e); A.cover = this.findCover(e, tp, k0, k1); A.re = 3; } A.re -= dt; out.goal = A.cover ? V(A.cover.x, 0, A.cover.z) : null; out.face = angToP; }
      return out;
    }
    if (role === 'shield') {
      /* 소라게: 근처 사격하는 같은 편 앞(나 쪽 2.2m)에 서서 움직이는 엄폐물 · 없으면 천천히 다가와 집게 */
      if (dist < D.range + 0.35) { out.goal = null; out.face = angToP; if (e.cd <= 0 && sees) this.startAttack(e, angToP); return out; }
      let ally = null, bd = 9; if (this.lv >= 2) for (const o of R.enemies) { if (o === e || o.dead || o.sleep || hostile(e.F, o.F) || !RANGED(o.kind) || o.state !== 'chase') continue; const d = dist2(o.pos, e.pos); if (d < bd && dist2(o.pos, tp) > 4.5) { bd = d; ally = o; } }
      if (ally) { if (!A.shSt) { A.shSt = 1; st(R, 'shield'); } const g = ally.pos.clone().addScaledVector(t1.copy(tp).sub(ally.pos).setY(0).normalize(), 2.2); out.goal = this.blockedAt(g.x, g.z, 0.6) ? tp.clone() : g; out.spd = D.chase; out.face = angToP; }
      else { out.goal = tp.clone(); out.spd = D.chase; }
      return out;
    }
    if (role === 'stealth') {
      /* 문어: 숨은 채 다가감 → 닿으면 예고(물결 원) · 공격 뒤 잠깐 물러남 */
      if (A.back > 0) { A.back -= dt; out.goal = e.pos.clone().addScaledVector(t1.copy(e.pos).sub(tp).setY(0).normalize(), 3); out.spd = D.chase; return out; }
      if (dist < D.range - 0.2 && e.cd <= 0) { this.startAttack(e, angToP, tp); A.back = 1.2; return out; }
      out.goal = tp.clone(); out.spd = dist < 5 ? D.speed * 1.4 : D.chase; return out;
    }
    if (role === 'kamikaze') {
      /* 기뢰: 곧장 굴러옴 → 1.9m 안이면 무장(바닥 원 1초) */
      if (dist < D.range && e.cd <= 0) { this.startAttack(e, angToP, tp); return out; }
      out.goal = tp.clone(); out.spd = D.chase; return out;
    }
    return out;
  }
  /* 소총수 · 저격수: 엄폐 → 숨음 → 내밀기 → 쏨 (2단계: 장전 때 바로 내밂 · 눌리면 더 숨음 · 두 번 내밀면 다른 엄폐로) */
  pin(e, dt, tp, dist, sees, angToP, out, hurtNow) {
    const R = this.R, D = e.D, A = e.ai; const [k0, k1] = D.keep || [3.5, (D.range || 10) + 1];
    if (!A.cover || (A.re <= 0 && A.mode === 'move') || (A.mode !== 'peek' && R.los({ x: A.cover.x, z: A.cover.z }, tp)) || (this.lv >= 2 && A.peeks >= (D.role === 'sniper' ? 1 : AI2.peekMax) && A.mode !== 'peek')) {
      const rot = this.lv >= 2 && A.peeks >= (D.role === 'sniper' ? 1 : AI2.peekMax); const old = A.cover; this.release(e); A.cover = this.findCover(e, tp, k0, k1, old); A.re = 2.5; A.peeks = 0; if (rot && old && A.cover && old !== A.cover) st(R, 'coverMove'); if (A.cover) { A.mode = 'move'; } else A.mode = 'open'; }
    A.re -= dt;
    /* M5-D 시험 안정화(근본 원인): 엄폐로 돌아갈 때 '이동 제한 시간'(re)을 새로 — 전엔 숨기 · 내밀기 동안 re 가 다 닳아, 돌아가는 첫 프레임에 엄폐를 다시 골라 내밀기 수가 0 으로 → '두 번 내밀면 다른 엄폐로'가 거의 안 일어남 */
    if (hurtNow && A.mode === 'peek' && A.cover) { A.mode = 'move'; A.re = 2.5; }
    if (A.mode === 'move') { out.goal = V(A.cover.x, 0, A.cover.z); out.spd = D.chase * (this.lv >= 2 ? 1.15 : 1); if (dist2(e.pos, A.cover) < 0.45) { A.mode = 'hide'; A.t = (0.7 + Math.random() * 0.7) * (e.sq?.signal && this.lv >= 2 ? 0.7 : 1); A.sup = 0; } }
    else if (A.mode === 'hide') { out.goal = null; out.face = angToP;
      if (this.lv >= 2) { if (R.pl.reload > 0 && A.t > 0.12) { A.t = 0.12; st(R, 'reloadPeek'); } /* 장전 중 = 기회 */
        else if (R.pl.aim === e && R.t - (R.pl.shotT || -9) < AI2.suppress && A.sup < 0.6) { if (!A.sup) st(R, 'suppressed'); A.t += dt; A.sup += dt; } } /* 나를 겨누고 쏘는 중 = 눌려 있음 */
      if (A.t <= 0) { A.peek = this.peekOf(A.cover, tp); A.mode = 'peek'; A.t = 2.4; A.peeks++; st(R, 'peek'); } }
    else if (A.mode === 'peek') { out.goal = A.peek; out.spd = D.speed * 1.3; out.face = angToP;
      if (sees && e.cd <= 0 && dist < D.range) this.startAttack(e, angToP, tp); else if (A.t <= 0) { A.mode = 'move'; A.re = 2.5; } }
    else { /* 엄폐 없음: 거리 두고 옆걸음 · 쏨 */
      if (sees && e.cd <= 0 && dist < D.range) this.startAttack(e, angToP, tp);
      else if (dist < Math.max(5, k0 * 0.8)) out.goal = e.pos.clone().addScaledVector(t1.copy(e.pos).sub(tp).setY(0).normalize(), 3);
      else out.goal = e.pos.clone().add(V(-(tp.z - e.pos.z), 0, tp.x - e.pos.x).normalize().multiplyScalar(Math.sin(e.t * 0.8 + e.id) * 2)).addScaledVector(t2.copy(tp).sub(e.pos).setY(0).normalize(), dist > D.range * 0.8 ? 1.5 : 0); }
    return out;
  }
  /* 공격 시작 (예고): 소총수 = 겨냥 줄 · 갈퀴꾼/소라게 = 앞 원 · 화약꾼 = 팔 들기(떨어질 자리 원은 던질 때) · 새 적 = foes.js */
  startAttack(e, ang, tp) {
    const R = this.R, D = e.D; e.wind = e.windMax = D.wind; e.cd = D.cd * (0.85 + Math.random() * 0.3); e.lockFace = ang; e.face = ang;
    if (D.atk === 'burst') { e.pat = 'burst'; R.warnLine(e, Math.min(D.range, dist2(e.pos, tp || (e.foe ? e.foe.pos : R.pl.pos)) + 1.5), 0.32, 0xff4a3a); }
    else if (D.atk === 'melee') { e.pat = 'melee'; R.warnDisc(e, D.radius > 0.65 ? 2.1 : 1.9, 0xff6a3a, true); e.warn.position.set(e.pos.x + Math.sin(ang) * 1.1, 0.22, e.pos.z + Math.cos(ang) * 1.1); e.warnFollow = false; if (e.kind === 'hermit') sfx.foeWarn?.(e); }
    else if (D.atk === 'lob') { e.pat = 'lob'; e.lobTo = (tp || (e.foe ? e.foe.pos : R.pl.pos)).clone(); }
    else if (foeWind(R, e, ang, tp || (e.foe ? e.foe.pos : R.pl.pos))) return;
    if (e.anim) e.anim.play(D.atk === 'melee' ? '1H_Melee_Attack_Chop' : D.atk === 'lob' ? 'Unarmed_Melee_Attack_Punch_A' : 'Aim', { once: D.atk !== 'burst', fade: 0.06, speed: D.atk === 'melee' ? 0.95 : 1.1, force: true }) || e.anim.play('Idle_Combat', { force: false });
  }
  /* 수류탄 (3단계): 팔 듦 0.45초 → 던짐 (떨어질 자리 원은 날아가는 동안 + 땅에서 깜빡) */
  startNade(e, to) { const R = this.R; e.wind = e.windMax = NADE.wind; e.cd = Math.max(e.cd, 1.2); e.pat = 'nade'; e.lobTo = to.clone(); e.lockFace = Math.atan2(to.x - e.pos.x, to.z - e.pos.z); e.face = e.lockFace;
    e.anim?.play('Unarmed_Melee_Attack_Punch_A', { once: true, fade: 0.05, speed: 1.3, force: true }); }
  /* 예고 끝 → 실제 공격 (raid.enemyAttack 이 부름) */
  attack(e, dist) {
    const R = this.R, D = e.D, pl = R.pl;
    if (e.pat === 'burst') { e.burstLeft = D.burst || 3; e.burstT = 0; e.burstFace = e.lockFace; e.burstTele = R.tele?.t0 ?? R.t; this.burstTick(e, 0); return true; }
    if (e.pat === 'melee') { sfx.swing(); const tp = e.foe && !e.foe.dead ? e.foe.pos : pl.pos; const a = Math.atan2(tp.x - e.pos.x, tp.z - e.pos.z);
      e.pos.addScaledVector(t1.set(Math.sin(e.face), 0, Math.cos(e.face)), 0.6); /* 앞으로 한 걸음 내려침 */
      if (dist2(tp, e.pos) < D.range + 0.45 && Math.abs(((a - e.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 1.25) this.strike(e, D.dmg * e.dmgMul);
      R.fx.burst(e.pos.x + Math.sin(e.face) * 1.2, 0.3, e.pos.z + Math.cos(e.face) * 1.2, 10, 0xd9c7a0, 4, 0.1, 0.5); R.shake = Math.max(R.shake, 0.15); return true; }
    if (e.pat === 'lob') { this.throwLob(e, e.lobTo || pl.pos); return true; }
    if (e.pat === 'nade') { this.throwLob(e, e.lobTo || pl.pos, 'nade'); return true; }
    return false;
  }
  burstTick(e, dt) {
    if (!(e.burstLeft > 0)) return; e.burstT -= dt; if (e.burstT > 0) return;
    const R = this.R; e.burstT = e.D.burstGap || 0.14; e.burstLeft--;
    const f = e.foe && !e.foe.dead ? e.foe : null; /* 적 진영을 쏠 땐 쏠 때마다 다시 겨눔 (주인공에겐 예고한 줄 그대로 = 피할 수 있음) */
    const a = (f ? Math.atan2(f.pos.x - e.pos.x, f.pos.z - e.pos.z) : e.burstFace) + (Math.random() - 0.5) * 0.09; const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb070 })); m.position.set(e.pos.x + Math.sin(a) * 0.6, 1.1, e.pos.z + Math.cos(a) * 0.6); R.root.add(m); m.add(glowSprite(0xff9a50, 0.55, 0.6));
    R.enemyShots.push({ m, dir: V(Math.sin(a), 0, Math.cos(a)), sp: 15, t: 0, dmg: e.D.dmg * e.dmgMul, from: e.pos.clone(), r: 0.5, src: e, tele0: e.burstTele });
    sfx.enemyShot((e.pos.x - R.pl.pos.x) / 12); R.fx.burst(e.pos.x + Math.sin(a) * 0.7, 1.1, e.pos.z + Math.cos(a) * 0.7, 3, 0xffd27a, 3, 0.06, 0.2);
    e.anim?.play('Shoot', { once: true, fade: 0.02, speed: 1.6, force: true });
    R.noise(e.pos, 9, 'enemy');
  }
  /* 불병 · 수류탄: 포물선 · 떨어질 자리 바닥 원(날아가는 동안 커짐) → (수류탄은 땅에서 0.45초 깜빡) → 터짐 */
  throwLob(e, to, type = 'fire', o = {}) {
    const R = this.R; const p = to.clone().setY(0); const rng = o.range || e.D.range || 11; const d = dist2(p, e.pos); if (d > rng) p.sub(e.pos).setLength(rng).add(e.pos);
    const nade = type === 'nade'; const r = o.r || (nade ? NADE.r : LOB.r);
    const m = new THREE.Mesh(nade ? new THREE.SphereGeometry(0.13, 8, 6) : new THREE.CylinderGeometry(0.09, 0.13, 0.34, 8), new THREE.MeshLambertMaterial({ color: nade ? 0x3a4a3a : 0x5a7a3a, emissive: nade ? 0x101810 : 0x3a2a10 })); m.position.copy(e.pos).setY(1.6); R.root.add(m); m.add(glowSprite(nade ? 0xff5a3a : 0xffa040, 0.7, nade ? 0.6 : 0.9));
    const w = new THREE.Mesh(new THREE.CircleGeometry(1, 32), hazard(new THREE.MeshBasicMaterial({ color: nade ? 0xff3a2a : 0xff6a2a, transparent: true, opacity: 0.3, depthWrite: false }))); w.rotation.x = -Math.PI / 2; w.position.set(p.x, 0.23, p.z); w.scale.setScalar(0.3); R.root.add(w);
    this.lobs.push({ m, w, from: e.pos.clone().setY(1.6), to: p, t: 0, dur: o.flight || (nade ? NADE.flight : LOB.flight), fuse: nade ? NADE.fuse : 0, src: e, dmg: o.dmg ?? (nade ? NADE.dmg * e.dmgMul : e.D.dmg * e.dmgMul), type, r, t0: R.t });
    sfx.swing?.();
  }
  updateLobs(dt) {
    const R = this.R;
    for (let i = this.lobs.length - 1; i >= 0; i--) { const L = this.lobs[i]; L.t += dt; const k = Math.min(1, L.t / L.dur);
      if (k < 1) { L.m.position.lerpVectors(L.from, L.to, k); L.m.position.y = 1.6 * (1 - k) + 4.2 * k * (1 - k) + 0.2; L.m.rotation.z += dt * 12; }
      else L.m.position.set(L.to.x, 0.15, L.to.z);
      L.w.scale.setScalar(L.r * (0.3 + 0.7 * k)); L.w.material.opacity = k < 1 ? 0.22 + 0.35 * Math.sin(k * 18) ** 2 : 0.3 + 0.4 * Math.sin(L.t * 40) ** 2;
      if (L.t < L.dur + L.fuse) continue;
      R.root.remove(L.m); L.m.geometry.dispose(); L.m.material.dispose(); L.m.children[0]?.material.dispose(); R.root.remove(L.w); L.w.geometry.dispose(); L.w.material.dispose(); this.lobs.splice(i, 1);
      const p = L.to; const nade = L.type === 'nade';
      if (nade) { sfx.boom?.((p.x - R.pl.pos.x) / 12); R.fx.burst(p.x, 0.6, p.z, 30, 0xffc070, 9, 0.12, 0.6, 12); R.fx.burst(p.x, 0.6, p.z, 14, 0x3a3634, 6, 0.2, 1.1, 8); R.fx.ring(p.x, p.z, L.r, 0xffd090); R.shake = Math.max(R.shake, 0.35); R.noise(p, 14, 'enemy'); }
      else { sfx.puff?.(); R.fx.burst(p.x, 0.5, p.z, 26, 0xffa040, 7, 0.12, 0.6, 10); R.fx.ring(p.x, p.z, L.r, 0xffb060); R.shake = Math.max(R.shake, 0.2); R.noise(p, 10, 'enemy'); }
      if (!R.pl.dead && dist2(R.pl.pos, p) < L.r) { R.tele = { t: R.t - L.t0, k: L.type }; R.hurt(L.dmg, p); R.tele = null; }
      for (const o of R.enemies) if (!o.dead && !o.sleep && o !== L.src && (hostile(L.src.F, o.F) || nade && o.F !== L.src.F) && dist2(o.pos, p) < L.r + o.D.radius) this.hitEnemy(o, L.dmg, L.src, t1.copy(o.pos).sub(p).setY(0).normalize());
      if (!nade) R.addFire(p.x, p.z, LOB.r * 0.85, LOB.fire, LOB.fireDps); }
  }
  /* 엄폐 자리 찾기: 같은 방 · 9m 안 · 위협에서 총알이 막힘 · 위협과 거리 [min, max] · 무리끼리 겹치지 않게 · (2단계) 방금 쓴 자리는 빼고 옆으로 돌아간 자리 우선 */
  findCover(e, tp, min = 3.5, max = (e.D.range || 10) + 1, not = null) {
    const R = this.R, rm = R.roomOf(e.pos); if (!rm) return null; let best = null, bs = 1e9;
    for (const c of this.covers) { if (c === not || c.room !== rm.id || (c.claim && c.claim !== e && !c.claim.dead)) continue; const de = dist2(c, e.pos); if (de > (e.D.role === 'sniper' ? 12 : 9)) continue; const dt = dist2(c, tp); if (dt < min || dt > max) continue;
      if (R.rayBlock(t1.set(c.x, 0, c.z), tp) >= 0.98) continue; let s = de + Math.abs(dt - (min + max) / 2) * 0.4;
      if (not && this.lv >= 2) { const a0 = Math.atan2(not.x - tp.x, not.z - tp.z), a1 = Math.atan2(c.x - tp.x, c.z - tp.z); let da = Math.abs(a1 - a0); if (da > Math.PI) da = Math.PI * 2 - da; s -= Math.min(1.2, da) * 2.5; }
      if (s < bs) { bs = s; best = c; } }
    if (best) best.claim = e; return best;
  }
  release(e) { if (e.ai?.cover && e.ai.cover.claim === e) e.ai.cover.claim = null; }
  /* 몸 내밀 자리: 엄폐 자리에서 위협 쪽 옆으로 1.4m · 막힘 없는 쪽 */
  peekOf(c, tp) {
    const R = this.R; const dx = tp.x - c.x, dz = tp.z - c.z, l = Math.hypot(dx, dz) || 1; const sx = -dz / l, sz = dx / l;
    for (const s of [1, -1, 1.6, -1.6]) { const x = c.x + sx * 1.4 * s, z = c.z + sz * 1.4 * s; if (this.blockedAt(x, z)) continue; if (R.los(t1.set(x, 0, z), tp)) return V(x, 0, z); }
    return V(c.x + dx / l * 1.2, 0, c.z + dz / l * 1.2);
  }
  dispose() { const R = this.R; for (const L of this.lobs) { R.root?.remove(L.m); R.root?.remove(L.w); L.m.geometry.dispose(); L.m.material.dispose(); L.m.children[0]?.material.dispose(); L.w.geometry.dispose(); L.w.material.dispose(); } this.lobs = [];
    for (const f of this.reinf) { R.root?.remove(f.mk); f.mk.geometry.dispose(); f.mk.material.dispose(); } this.reinf = []; }
}
