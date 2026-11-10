// 수달 인양단 — 판 안 반려 (M5-C · v0.8): 몽이(따라오는 작은 수달 · 단계마다 크기와 장식) · 반디(어깨 위 빛 해마) + 판 안 보조 능력
//  능력은 data/pets.js fx 를 econ.petFx 가 합쳐 L.pets 로 넘김: warn 뒤에서 오는 적 '끽!' · search(뒤지기 — econ 이 L.search 에 이미 곱함)
//   · medic 체력 35% 아래 한 번 연고 · bite 바짝 붙은 적 한 번 물기(2초 멈춤) · vision(econ 이 L.vision 에 곱함) · ping 몇 초마다 가까운 적 빛 표시 · flash 체력 30% 아래 한 번 빛 터뜨림
//  그리기: 몽이 = 수달 몸 한 덩어리(SkinnedMesh 1) · 반디 = 정점 색 한 덩어리(Mesh 1) + fx 빛 점 하나. 판 난수(R.R)는 안 씀 (봇 · 시뮬 재현 그대로)
import * as THREE from 'three';
import { makeHero, tailWag, HERO_SCALE } from './hero.js?v=0.99.17';
import { PETS } from './data.js?v=0.99.17';
import { sfx } from './audio.js?v=0.99.17';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

/* 반디: 머리 · 주둥이 · 배 · 말린 꼬리 · 등지느러미 · 갈기를 정점 색 한 덩어리로 (빛을 안 받는 재질 = 스스로 빛나 보임) */
let BANDI_GEO = null;
function bandiGeo() {
  if (BANDI_GEO) return BANDI_GEO;
  const parts = []; const col = new THREE.Color();
  const put = (g, c, m) => { g = g.toNonIndexed(); if (m) g.applyMatrix4(m); const n = g.attributes.position.count; const a = new Float32Array(n * 3); col.set(c); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); parts.push(g); };
  const M = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(s, s, s));
  put(new THREE.SphereGeometry(0.11, 10, 8), '#7ff0e0', M(0, 0.34, 0.02, 0, 0, 0, 1)); /* 머리 */
  put(new THREE.CylinderGeometry(0.025, 0.04, 0.14, 8), '#5fd8c8', M(0, 0.33, 0.13, Math.PI / 2, 0, 0)); /* 주둥이 */
  put(new THREE.SphereGeometry(0.1, 10, 8).scale(1, 1.5, 0.9), '#5fe0d0', M(0, 0.17, -0.01)); /* 배 */
  put(new THREE.SphereGeometry(0.06, 8, 6).scale(1, 1.3, 1), '#b8fff4', M(0, 0.16, 0.06)); /* 배 무늬(밝게) */
  put(new THREE.TorusGeometry(0.07, 0.03, 6, 12, Math.PI * 1.6), '#3fbfb0', M(0, -0.02, -0.04, 0, Math.PI / 2, 0.6)); /* 말린 꼬리 */
  put(new THREE.ConeGeometry(0.05, 0.12, 6), '#ffd27a', M(0, 0.2, -0.11, -1.2, 0, 0)); /* 등지느러미(금빛 — 등불) */
  for (let i = 0; i < 3; i++) put(new THREE.ConeGeometry(0.022, 0.07, 5), '#ffe8a8', M(0, 0.43 - i * 0.05, -0.06 - i * 0.03, -0.9, 0, 0)); /* 갈기 */
  for (const s of [-1, 1]) put(new THREE.SphereGeometry(0.018, 6, 4), '#10302c', M(s * 0.07, 0.37, 0.07)); /* 눈 */
  const n = parts.reduce((t, g) => t + g.attributes.position.count, 0); const P = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
  for (const g of parts) { P.set(g.attributes.position.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
  const G = new THREE.BufferGeometry(); G.setAttribute('position', new THREE.BufferAttribute(P, 3)); G.setAttribute('color', new THREE.BufferAttribute(C, 3)); G.computeBoundingSphere();
  return (BANDI_GEO = G);
}
export function makeBandi(stage = 1) {
  const st = PETS.bandi.stages[stage] || PETS.bandi.stages[1];
  const m = new THREE.Mesh(bandiGeo(), new THREE.MeshBasicMaterial({ vertexColors: true })); m.userData.keepGeo = true; m.scale.setScalar(st.scale); m.name = 'bandi';
  return m;
}

/* opt.petHero = 몽이 겉모습(look.resolve pet) — 없으면 몽이는 안 따라옴(주머니만) */
export function petInit(R, opt = {}) {
  const P = R.L.pets || {}; const st = { mong: P.mong | 0, bandi: P.bandi | 0, medic: P.medic ? 1 : 0, bite: P.bite ? 1 : 0, flash: P.flash ? 1 : 0, warnCd: 3, pingCd: 2, dash: 0, fx: P };
  R.petS = st;
  if (st.mong && opt.petHero) {
    try { const h = makeHero(opt.petHero); const S0 = PETS.mong.stages[st.mong]; const g = new THREE.Group(); g.add(h.root); h.root.scale.setScalar(HERO_SCALE * S0.scale / 0.78);
      const mix = new THREE.AnimationMixer(h.root); const idle = mix.clipAction(h.clips.Idle), run = mix.clipAction(h.clips.Running_A); idle.play(); run.play(); run.setEffectiveWeight(0);
      g.position.copy(R.pl.pos).add(V(0.9, 0, 0.6)); R.root.add(g); h.root.traverse(o => { if (o.isMesh) { o.userData.keepGeo = true; R.ownMats.push(o.material); } });
      st.m = { g, h, mix, idle, run, face: R.pl.face, v: V() }; } catch (e) { console.warn('몽이', e); }
  }
  if (st.bandi) { const b = makeBandi(st.bandi); R.root.add(b); R.ownMats.push(b.material); st.b = { mesh: b, t: 0, glow: R.fx.glow(R.pl.pos.x, 2.0, R.pl.pos.z, { s: 1.1 * (PETS.bandi.stages[st.bandi].glow || 0.6), life: 1e9, color: 0x6fe8d8, i: 0.7, fade: 0 }) }; }
}
const tv = V();
export function petTick(R, dt) {
  const st = R.petS; if (!st) return; const pl = R.pl;
  /* 몽이 따라오기: 주인공 뒤 옆 1.3m · 멀면 달림 · 물기 중이면 그 적에게 */
  if (st.m) { const m = st.m; let gx, gz;
    if (st.dash > 0 && st.dashE && !st.dashE.dead) { st.dash -= dt; gx = st.dashE.pos.x; gz = st.dashE.pos.z; }
    else { const back = pl.face + Math.PI + 0.7; gx = pl.pos.x + Math.sin(back) * 1.3; gz = pl.pos.z + Math.cos(back) * 1.3; }
    const dx = gx - m.g.position.x, dz = gz - m.g.position.z, d = Math.hypot(dx, dz); const sp = d > 0.25 ? Math.min(d * 5, st.dash > 0 ? 11 : 8) : 0;
    if (d > 9) { m.g.position.set(gx, 0, gz); } else if (sp > 0) { m.g.position.x += dx / d * sp * dt; m.g.position.z += dz / d * sp * dt; m.face += angDiff(m.face, Math.atan2(dx, dz)) * Math.min(1, dt * 10); }
    else m.face += angDiff(m.face, pl.face) * Math.min(1, dt * 4);
    if (R.collide) R.collide(m.g.position, 0.2); m.g.rotation.y = m.face;
    const w = Math.min(1, sp / 3); m.run.setEffectiveWeight(w); m.idle.setEffectiveWeight(1 - w); m.run.timeScale = 1.2; m.mix.update(dt); tailWag(m.h, dt, sp); }
  if (st.b) { const b = st.b; b.t += dt; const a = pl.face - 1.9; const x = pl.pos.x + Math.sin(a) * 0.55, z = pl.pos.z + Math.cos(a) * 0.55, y = 2.0 + Math.sin(b.t * 2.4) * 0.09;
    b.mesh.position.lerp(tv.set(x, y, z), Math.min(1, dt * 8)); b.mesh.rotation.y = pl.face + Math.sin(b.t * 1.3) * 0.4; b.mesh.rotation.z = Math.sin(b.t * 2.4) * 0.12;
    if (b.glow) { b.glow.x = b.mesh.position.x; b.glow.y = b.mesh.position.y + 0.15; b.glow.z = b.mesh.position.z; b.glow.t = 0; } }
  if (pl.dead || R.over) return;
  const F = st.fx;
  /* 꼬마 몽이 2단~: 뒤에서 쫓아오는 적 '끽!' (8초에 한 번) */
  if (F.warn && (st.warnCd -= dt) <= 0) { for (const e of R.enemies) { if (e.dead || e.sleep || !(e.state === 'chase' || e.state === 'fight')) continue; const dx = e.pos.x - pl.pos.x, dz = e.pos.z - pl.pos.z, d = Math.hypot(dx, dz); if (d > F.warn || d < 1) continue;
      if (Math.abs(angDiff(pl.face, Math.atan2(dx, dz))) > 1.9) { st.warnCd = 8; R.ui.praise?.('끽! 뒤에!'); R.fx.ring(e.pos.x, e.pos.z, 1.0, 0xffc861); sfx.mong?.('ask'); break; } } if (st.warnCd <= 0) st.warnCd = 0.5; }
  /* 든든한 몽이 4단~: 체력 35% 아래 → 연고 한 번 */
  if (st.medic && pl.hp > 0 && pl.hp < pl.maxHp * (F.medic || 0.35)) { st.medic = 0; const h = Math.round((F.heal || 30) * (R.L.heal || 1)); pl.hp = Math.min(pl.maxHp, pl.hp + h);
    R.ui.toast?.(`몽이가 연고를 꺼내 줬어요 +${h}`, 'good'); R.fx.burst(pl.pos.x, 1.2, pl.pos.z, 12, 0x7fe08a, 3, 0.08, 0.6, -2); sfx.mong?.('happy'); R.petUsed = (R.petUsed || 0) + 1; }
  /* 대장 몽이 5단: 바짝 붙어 쫓는 적(보스 X) 한 번 물기 → 2초 멈춤 */
  if (st.bite) { for (const e of R.enemies) { if (e.dead || e.sleep || e.D.boss || !(e.state === 'chase' || e.state === 'fight')) continue; if (Math.hypot(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z) > 1.9) continue;
      st.bite = 0; e.stagger = Math.max(e.stagger || 0, F.bite || 2); st.dash = 0.6; st.dashE = e; R.ui.toast?.('몽이가 꽉 물었어요! 2초 멈춤', 'good'); R.fx.burst(e.pos.x, 0.8, e.pos.z, 10, 0xffe0a0, 4, 0.08, 0.4, 6); sfx.mong?.('happy'); R.petUsed = (R.petUsed || 0) + 1; break; } }
  /* 반디 2단~: 몇 초마다 가까운 적(10m)에 청록 빛 고리 — 어두운 판에서 어디 있는지 */
  if (F.ping && (st.pingCd -= dt) <= 0) { st.pingCd = F.ping; let n = 0; for (const e of R.enemies) { if (e.dead || e.sleep || n >= 4) continue; if (Math.hypot(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z) > 10) continue; R.fx.ring(e.pos.x, e.pos.z, 0.9, 0x6fe8d8); n++; } }
  /* 등불 반디 3단: 체력 30% 아래 → 빛 터뜨림 한 번 (5m 적 2초 멈춤) */
  if (st.flash && pl.hp > 0 && pl.hp < pl.maxHp * 0.3) { st.flash = 0; let n = 0; for (const e of R.enemies) { if (e.dead || e.sleep) continue; if (Math.hypot(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z) > 5) continue; e.stagger = Math.max(e.stagger || 0, e.D.boss ? 0.6 : F.flash || 2); n++; }
    R.fx.glow(pl.pos.x, 1.6, pl.pos.z, { s: 3, s1: 11, life: 0.45, color: 0xbffff4, i: 1.6 }); R.fx.ring(pl.pos.x, pl.pos.z, 5, 0x6fe8d8); R.ui.toast?.(`반디가 빛을 터뜨렸어요 — 둘레 적 ${n} 멈춤`, 'good'); sfx.lamp?.(); R.petUsed = (R.petUsed || 0) + 1; }
}
/* 몽이 겉모습 = 옷장 몽이 장식(look.pet) + 단계 장식(PETS.mong.stages[n].wear · 같은 파일은 한 번) — 은신처 · 판이 같이 씀 */
export function petSpec(spec, stage) {
  const wear = (PETS.mong.stages[stage]?.wear || []).filter(f => !spec.parts.some(p => p.file === f));
  if (!wear.length) return spec;
  const parts = [...spec.parts, ...wear.map(file => ({ file, off: [0, 0, 0] }))];
  return { ...spec, parts, files: [...new Set([...spec.files, ...wear])], key: JSON.stringify([spec.groups, parts, spec.pal]) };
}
export const petScale = stage => PETS.mong.stages[stage]?.scale || 0.36;
