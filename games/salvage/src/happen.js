// 판 중 사건 5 (M6-C · 검수 M5 목록 10) — 보급 투하 · 조난 수달 구조 · 검은 닻 수송대 · 잠긴 금고 · 고장 난 신호기 + 떠돌이 두목 예고
//  raid.js 는 건드리지 않고 R.mods 장치 하나로 붙음(tick · near · act · marks · dispose) — main.js 가 판 시작 때 m6cRaid(R) 로 넣음
//  알림 = 위쪽 한 줄 대기열(ui.event → ui.top · M6-A) · 자리 = 화면 밖 화살표(ui.drawArrows 가 mods.marks 를 모음)
//  규칙: ① 먼저 알리고(글 + 자리) 그 뒤 일어남 ② 사건이 주는 피해 0 (수송대 호위의 공격은 보통 적 공격 = 늘 예고) ③ seed 로 정해짐
//  시험: ?hap=drop|rescue|convoy|safe|beacon (그 사건을 판 시작 4초 뒤로 당김) · ?nohap (끔) · window.__salvage.raid.happen 에 상태
import * as THREE from 'three';
import { HAPPEN, rollHappen } from './data/happen.js?v=0.99.39';
import { RS, rollLoot, LOOT_MODEL, LOOT_SCALE } from './map.js?v=0.99.39';
import { prop } from './assets.js?v=0.99.39';
import { ITEMS } from './data.js?v=0.99.39';
import { sfx } from './audio.js?v=0.99.39';
import { S } from './save.js?v=0.99.39';
import { vib, raidA11y } from './a11y.js?v=0.99.39';
import { facOf } from './ai.js?v=0.99.39';
import { makeHero, ready, HERO_SCALE } from './hero.js?v=0.99.39';
import { resolve } from './look.js?v=0.99.39';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const snd = (n, ...a) => { try { sfx[n]?.(...a); } catch { /* */ } };
const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
function mb(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function happenRaid(R, opt = {}) {
  const Q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const force = Q.get('hap') || null;
  const ev = rollHappen(R.opt.seed, R.map, S.stats?.raids || 0, R.T?.lv || 1, { off: Q.has('nohap') || opt.off, force, chal: !!R.chal || !!opt.chal });
  const H = R.happen = { k: ev?.k || null, state: ev ? 'wait' : 'none', log: [] };
  const rnd = mb((R.opt.seed | 0) * 97 + 3);
  const K = ev ? HAPPEN.kinds[ev.k] : null; if (ev && force) ev.at = 4 + (K.warn || 0);
  const zname = z => R.Z?.[z]?.name || `구역 ${z}`;
  const own = []; const say = (t, kind = 'good') => { R.ui.event(t, kind); H.log.push(t); };
  /* 자리 고르기: 그 구역 방(시작 · 금고실 · 보스 방 빼고 · 걸어서 닿는 곳) 한가운데 둘레, 상자 · 벽에서 비킨 곳 */
  const roomsIn = z => R.P.rooms.filter(r => r.zone === z && r.id !== R.P.start && r.id !== R.P.vault && r.id !== R.P.bossRoom && r.type !== 'vault' && R.waypoint(R.pl.pos, V(r.x0 + RS / 2, 0, r.z0 + RS / 2)) !== null);
  const spotIn = rm => { for (const [dx, dz] of [[0, 0], [2.4, 0], [-2.4, 0], [0, 2.4], [0, -2.4], [2.4, 2.4], [-2.4, -2.4]]) { const p = V(rm.x0 + RS / 2 + dx, 0, rm.z0 + RS / 2 + dz);
      if (!R.containers.some(c => c.pos.distanceTo(p) < 2.2) && !R.boxes.some(b => p.x > b.x0 - 0.9 && p.x < b.x1 + 0.9 && p.z > b.z0 - 0.9 && p.z < b.z1 + 0.9)) return p; }
    const p = V(rm.x0 + RS / 2, 0, rm.z0 + RS / 2); R.collide(p, 0.9); return p; };
  const pickRoom = (z, k = 0) => { let L = roomsIn(z); if (!L.length) L = [1, 2, 3].flatMap(roomsIn); if (!L.length) return null; return L[Math.floor(((ev?.r || 0.5) + k * 0.37) % 1 * L.length)]; };
  const items = (kinds, z) => { const out = []; for (const k of kinds) out.push(...rollLoot(k, z, rnd)); return out.slice(0, 5); };
  const addBox = (pos, kind, name, it, obj) => { const c = { kind, zone: ev.zone, pos: pos.clone(), obj, items: it, searched: false, name, best: Math.max(0, ...it.map(k => ITEMS[k]?.val || 0)), happen: ev.k }; R.containers.push(c); return c; };
  const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.userData.own = true; m.userData.ownMat = true; R.root.add(m); own.push(m); return m; };
  const add = mat => { R.ownMats.push(mat); return mat; };
  const ringAt = (p, col, r = 1.3) => { const m = mesh(new THREE.RingGeometry(r * 0.8, r, 32), add(new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, depthWrite: false }))); m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.21, p.z); return m; };
  const beamAt = (p, col, h = 9) => { const m = mesh(new THREE.CylinderGeometry(0.35, 0.6, h, 12, 1, true), add(new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))); m.position.set(p.x, h / 2, p.z); return m; };
  const threatNear = (r = 6) => R.enemies.find(e => !e.dead && e.state === 'chase' && e.pos.distanceTo(R.pl.pos) < r);
  const hold = (need, txt, done) => { const pl = R.pl; pl.searching = { kind: 'mod', prog: 0, need, txt, done }; snd('search'); pl.anim?.play('Interact', { fade: 0.1, speed: 1.2, force: true }); };

  const st = { t: 0, pos: null, marks: [], chiefWarned: false };
  let mod = null;
  /* ───── 사건별 ───── */
  const E = {
    drop: {
      init() { const rm = pickRoom(ev.zone); if (!rm) return false; st.pos = spotIn(rm); },
      tick() {
        const t = R.elapsed;
        if (H.state === 'wait' && t >= ev.at - K.warn) { H.state = 'warn'; st.ring = ringAt(st.pos, 0xffd36b, 1.6); st.beam = beamAt(st.pos, 0xffd36b); say(fill(K.txt, { s: K.warn, zone: zname(ev.zone) })); snd('quest'); vib(30); st.marks = [{ p: st.pos, t: '보급 투하', c: 'co' }]; }
        if (H.state === 'warn') { const k = Math.max(0, (ev.at - t) / K.warn); st.ring.scale.setScalar(0.6 + 0.4 * (1 - k)); st.ring.material.opacity = 0.45 + 0.4 * Math.abs(Math.sin(t * 5)); }
        if (H.state === 'warn' && t >= ev.at) {
          H.state = 'on'; const o = prop(LOOT_MODEL.chest); o.scale.setScalar((LOOT_SCALE[LOOT_MODEL.chest] || 1) * 1.1); o.position.copy(st.pos); R.root.add(o);
          R.boxes.push({ x0: st.pos.x - 0.6, z0: st.pos.z - 0.6, x1: st.pos.x + 0.6, z1: st.pos.z + 0.6, bullet: 0 });
          st.c = addBox(st.pos, 'chest', '보급 상자', items(K.loot, K.z), o); st.until = t + K.open; st.obj = o;
          R.fx.burst(st.pos.x, 0.6, st.pos.z, 26, 0xffd36b, 6, 0.12, 0.7, 8); R.fx.ring(st.pos.x, st.pos.z, 2.2, 0xffd36b); snd('splash'); R.noise(st.pos, 10, 'event');
          say(fill(K.land, { n: K.open })); st.marks = [{ p: st.pos, t: '보급 상자', c: 'co' }];
        }
        if (H.state === 'on') {
          st.beam.material.opacity = 0.16 + 0.1 * Math.sin(t * 3);
          if (st.c.searched) { H.state = 'done'; st.marks = []; st.beam.visible = false; st.ring.visible = false; }
          else if (t >= st.until) { H.state = 'gone'; st.marks = []; st.beam.visible = st.ring.visible = false; st.obj.visible = false; const i = R.containers.indexOf(st.c); if (i >= 0) R.containers.splice(i, 1); R.fx.burst(st.pos.x, 0.4, st.pos.z, 14, 0x9ff0ff, 4, 0.1, 0.6); say(K.gone, 'warn'); }
          else if (st.until - t < 15 && !st.warn15) { st.warn15 = true; say('보급 상자 — 15초 뒤 떠내려가요', 'warn'); }
        }
      },
    },
    rescue: {
      init() { const rm = pickRoom(ev.zone); if (!rm) return false; st.pos = spotIn(rm);
        const spec = R.opt.petHero ? resolve({ pet: true, look: S.look }) : null;
        if (spec && ready(spec.files)) { try { const h = makeHero(spec); h.root.scale.setScalar(HERO_SCALE * 0.4 / 0.78); h.root.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.color?.multiply(new THREE.Color(0.78, 0.84, 0.98)); R.ownMats.push(o.material); o.userData.keepGeo = true; } });
            const g = new THREE.Group(); g.add(h.root); g.position.copy(st.pos); R.root.add(g); const mix = new THREE.AnimationMixer(h.root); const cl = h.clips.Hit_A || h.clips.Idle; const a = mix.clipAction(h.clips.Idle); a.play(); st.otter = { g, h, mix, clips: h.clips }; } catch (e) { console.warn('조난 수달', e); } }
        if (!st.otter) { const o = prop('box_small'); o.scale.setScalar(0.8); o.position.copy(st.pos); R.root.add(o); st.otter = { g: o }; }
        st.ring = ringAt(st.pos, 0xff8ac8, 1.1); st.ring.visible = false; },
      tick(dt) {
        const t = R.elapsed; if (st.otter?.mix) st.otter.mix.update(dt);
        if (H.state === 'wait' && t >= ev.at) { H.state = 'on'; st.ring.visible = true; say(fill(K.txt, { zone: zname(ev.zone) })); snd('radio'); vib(30); st.marks = [{ p: st.pos, t: '조난 수달', c: 'pet' }]; }
        if (H.state === 'on') { st.ring.material.opacity = 0.5 + 0.35 * Math.abs(Math.sin(t * 3)); if (st.otter?.g) st.otter.g.rotation.y = Math.atan2(R.pl.pos.x - st.pos.x, R.pl.pos.z - st.pos.z); }
        if (H.state === 'done' && st.otter?.g && (st.leave -= dt) < 0) { const g = st.otter.g; g.position.y -= dt * 0.8; g.rotation.y += dt * 4; if (g.position.y < -1) g.visible = false; }
      },
      near(n) { if (H.state !== 'on' || Math.hypot(st.pos.x - R.pl.pos.x, st.pos.z - R.pl.pos.z) > 2.3) return n; return { type: 'mod', m: mod, label: '조난 수달 구하기' }; },
      act() { if (threatNear()) { R.ui.toast('적이 가까워요 — 먼저 정리하고 구해요', 'soft'); return; }
        hold(K.hold, '밧줄 푸는 중…', () => { if (H.state !== 'on') return; H.state = 'done'; st.marks = []; st.ring.visible = false; st.leave = 1.6;
          const p = st.pos.clone().add(V(1.4, 0, 0)); R.collide(p, 0.6); const o = prop('box_small'); o.scale.setScalar(0.7); o.position.copy(p); R.root.add(o);
          addBox(p, 'locker', '감사 꾸러미', items(K.loot, K.z), o); say(K.thanks); snd('bond'); vib([30, 40, 30]); R.fx.burst(st.pos.x, 1.0, st.pos.z, 18, 0xff8ac8, 4, 0.08, 0.6, -2); R.ui.praise?.('고마워요!'); }); },
    },
    convoy: {
      init() {
        const L = roomsIn(ev.zone); if (L.length < 2) return false;
        const a = L[Math.floor(ev.r * L.length)]; const ca = V(a.x0 + RS / 2, 0, a.z0 + RS / 2);
        const b = [...L, ...roomsIn(Math.min(3, ev.zone + 1))].filter(r => r !== a).map(r => ({ r, d: Math.hypot(r.x0 - a.x0, r.z0 - a.z0) })).sort((x, y) => y.d - x.d)[0]?.r; if (!b) return false;
        st.from = spotIn(a); st.goal = V(b.x0 + RS / 2, 0, b.z0 + RS / 2); st.pos = st.from.clone(); void ca; },
      spawn() {
        const o = prop(LOOT_MODEL.cargo); o.scale.setScalar((LOOT_SCALE[LOOT_MODEL.cargo] || 1) * 0.6); o.position.copy(st.pos); R.root.add(o); st.cart = o;
        st.lamp = R.fx.glow?.(st.pos.x, 1.4, st.pos.z, { s: 1.2, life: 1e9, color: 0xff8a3a, i: 0.8, fade: 0 });
        st.esc = []; for (let k = 0; k < K.escorts; k++) { const ang = k / K.escorts * Math.PI * 2; const m = R.makeEnemy({ kind: 'raider', x: st.pos.x + Math.cos(ang) * 1.8, z: st.pos.z + Math.sin(ang) * 1.8, zone: ev.zone, squad: 'convoy' }, 5001 + k);
          R.collide(m.pos, 0.5); m.convoy = true; R.enemies.push(m); st.esc.push({ m, ang }); }
        snd('chiefHorn'); R.noise(st.pos, 14, 'event');
      },
      tick(dt) {
        const t = R.elapsed;
        if (H.state === 'wait' && t >= ev.at - 6) { H.state = 'warn'; say(fill(K.txt, { zone: zname(ev.zone) }), 'warn'); vib([40, 60, 40]); st.marks = [{ p: st.from, t: '검은 닻 수송대', c: 'gen hot' }]; }
        if (H.state === 'warn' && t >= ev.at) { H.state = 'on'; E.convoy.spawn(); st.marks = [{ p: st.pos, t: '수송대 짐수레', c: 'gen hot' }]; }
        if (H.state !== 'on') return;
        const alive = st.esc.filter(x => !x.m.dead);
        if (!alive.length) { H.state = 'done'; st.marks = []; if (st.lamp) st.lamp.life = 0; addBox(st.pos, 'cargo', '수송대 짐수레', items(K.loot, K.z), st.cart); R.boxes.push({ x0: st.pos.x - 0.7, z0: st.pos.z - 0.7, x1: st.pos.x + 0.7, z1: st.pos.z + 0.7, bullet: 0 }); say(K.stop); snd('rare'); vib([30, 40, 30]); return; }
        const fight = alive.some(x => x.m.state !== 'idle');
        if (!fight && st.pos.distanceTo(st.goal) > 1.2) { const w = R.waypoint(st.pos, st.goal) || st.goal; const d = V(w.x - st.pos.x, 0, w.z - st.pos.z); const l = d.length();
          if (l > 0.05) { st.pos.addScaledVector(d, Math.min(1, K.speed * dt / l)); R.collide(st.pos, 0.7); st.cart.rotation.y = Math.atan2(d.x, d.z); } }
        st.cart.position.copy(st.pos); if (st.lamp) { st.lamp.x = st.pos.x; st.lamp.z = st.pos.z; st.lamp.t = 0; }
        for (const x of alive) if (x.m.state === 'idle') { x.m.home.set(st.pos.x + Math.cos(x.ang + t * 0.2) * 1.9, 0, st.pos.z + Math.sin(x.ang + t * 0.2) * 1.9); x.m.wander = x.m.home.clone(); }
          else if (!st.alarm) { st.alarm = true; for (const y of alive) if (y.m.state === 'idle') { y.m.state = 'investigate'; y.m.target = R.pl.pos.clone(); y.m.alert = Math.max(y.m.alert, 0.7); } }
        st.marks[0].p = st.pos;
      },
    },
    safe: {
      init() {
        const L = roomsIn(ev.zone); if (!L.length) return false; const a = L[Math.floor(ev.r * L.length)]; const b = L.length > 1 ? L[(L.indexOf(a) + 1 + Math.floor(ev.r * 7) % (L.length - 1)) % L.length] : a;
        st.pos = spotIn(a); st.note = spotIn(b); if (st.note.distanceTo(st.pos) < 3) st.note.add(V(3, 0, 0)), R.collide(st.note, 0.6);
        const o = prop(LOOT_MODEL.vault); o.scale.setScalar((LOOT_SCALE[LOOT_MODEL.vault] || 1) * 1.15); o.position.copy(st.pos); R.root.add(o); st.obj = o;
        R.boxes.push({ x0: st.pos.x - 0.6, z0: st.pos.z - 0.6, x1: st.pos.x + 0.6, z1: st.pos.z + 0.6, bullet: 0 });
        const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96; const g = cv.getContext('2d'); g.fillStyle = '#f2ead6'; g.fillRect(6, 6, 116, 84); g.fillStyle = '#3a2a1a'; g.font = '800 34px system-ui'; g.textAlign = 'center'; g.fillText('7·3·9', 64, 60);
        const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; st.tex = tex;
        st.paper = mesh(new THREE.PlaneGeometry(0.9, 0.68), add(new THREE.MeshBasicMaterial({ map: tex, transparent: true }))); st.paper.rotation.x = -Math.PI / 2; st.paper.position.set(st.note.x, 0.08, st.note.z);
        st.nring = ringAt(st.note, 0xfff0b0, 0.8); st.sring = ringAt(st.pos, 0xc9a0ff, 1.3); st.nring.visible = st.sring.visible = false; },
      tick() {
        const t = R.elapsed;
        if (H.state === 'wait' && t >= ev.at) { H.state = 'on'; st.nring.visible = st.sring.visible = true; say(fill(K.txt, { zone: zname(ev.zone) })); snd('quest'); st.marks = [{ p: st.pos, t: '잠긴 금고', c: 'co' }]; }
        if (H.state === 'on') { st.nring.material.opacity = st.got ? 0 : 0.5 + 0.4 * Math.abs(Math.sin(t * 4)); st.sring.material.opacity = 0.4 + 0.3 * Math.abs(Math.sin(t * 2)); }
      },
      near(n) { if (H.state !== 'on') return n; const pl = R.pl.pos;
        if (!st.got && Math.hypot(st.note.x - pl.x, st.note.z - pl.z) < 1.8) return { type: 'mod', m: mod, what: 'note', label: '번호 쪽지 줍기' };
        if (Math.hypot(st.pos.x - pl.x, st.pos.z - pl.z) < 2.2) return { type: 'mod', m: mod, what: 'safe', label: st.got ? '금고 열기' : '잠긴 금고 · 번호 쪽지 필요' };
        return n; },
      act(n) {
        if (n.what === 'note') { st.got = true; st.paper.visible = false; st.nring.visible = false; say(K.note); snd('memo'); vib(25); st.marks = [{ p: st.pos, t: '금고 · 7·3·9', c: 'co' }]; return; }
        if (!st.got) { R.ui.toast(`번호 쪽지가 ${zname(ev.zone)} 어딘가에 있어요`, 'soft'); return; }
        if (threatNear()) { R.ui.toast('적이 가까워요 — 먼저 정리하고 열어요', 'soft'); return; }
        hold(K.hold, '번호 돌리는 중…', () => { if (H.state !== 'on') return; H.state = 'done'; st.marks = []; st.sring.visible = false;
          const c = addBox(st.pos, 'vault', '열린 금고', items(K.loot, K.z), st.obj); say(K.open); snd('rare'); vib([30, 40, 30]); R.openContainer?.(c); });
      },
    },
    beacon: {
      init() { const rm = pickRoom(ev.zone); if (!rm) return false; st.pos = spotIn(rm);
        const o = prop(LOOT_MODEL.barrel); o.scale.setScalar((LOOT_SCALE[LOOT_MODEL.barrel] || 1) * 0.9); o.position.copy(st.pos); R.root.add(o);
        R.boxes.push({ x0: st.pos.x - 0.5, z0: st.pos.z - 0.5, x1: st.pos.x + 0.5, z1: st.pos.z + 0.5, bullet: 0 });
        st.ant = mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.2, 6), add(new THREE.MeshBasicMaterial({ color: 0x9aa4ae }))); st.ant.position.set(st.pos.x, 1.6, st.pos.z);
        st.bulb = mesh(new THREE.SphereGeometry(0.16, 10, 8), add(new THREE.MeshBasicMaterial({ color: 0x55606a }))); st.bulb.position.set(st.pos.x, 2.75, st.pos.z); st.rings = []; },
      tick() {
        const t = R.elapsed;
        if (H.state === 'wait' && t >= ev.at) { H.state = 'on'; say(fill(K.txt, { zone: zname(ev.zone) })); snd('radio'); st.marks = [{ p: st.pos, t: '고장 난 신호기', c: 'gen' }]; }
        if (H.state === 'on') st.bulb.material.color.setHex(Math.sin(t * 9) > 0.6 ? 0xff6a3a : 0x55606a);
        if (H.state === 'lit') { st.bulb.material.color.setHex(Math.sin(t * 4) > 0 ? 0x7dffb2 : 0x2a8a5a);
          for (const r of st.rings) if (r.c.searched) r.m.visible = false;
          if (t >= st.until) { H.state = 'done'; for (const r of st.rings) r.m.visible = false; st.bulb.material.color.setHex(0x2a8a5a); } }
      },
      near(n) { if (H.state !== 'on' || Math.hypot(st.pos.x - R.pl.pos.x, st.pos.z - R.pl.pos.z) > 2.2) return n; return { type: 'mod', m: mod, label: '신호기 고치기' }; },
      act() { if (threatNear()) { R.ui.toast('적이 가까워요 — 먼저 정리하고 고쳐요', 'soft'); return; }
        hold(K.hold, '배선 잇는 중…', () => { if (H.state !== 'on') return; H.state = 'lit'; st.until = R.elapsed + K.show; st.marks = [];
          for (const c of R.containers) { if (c.searched || c.zone !== ev.zone || c.corpse || c.happen) continue; const best = c.best ?? Math.max(0, ...c.items.map(k => ITEMS[k]?.val || 0)); const col = best >= 70 ? 0xffc94a : best >= 28 ? 0x6fe0d8 : 0x8fa6ae;
            const m = ringAt(c.pos, col, 1.15); m.material.opacity = best >= 28 ? 0.85 : 0.35; if (best >= 70) { const m2 = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.74, 24), m.material); m2.userData.own = true; m.add(m2); } st.rings.push({ m, c }); }
          say(fill(K.on, { n: K.show })); snd('power'); vib(30); R.noise(st.pos, 8, 'event'); });
      },
    },
  };
  const D = ev ? E[ev.k] : null;
  if (D && D.init() === false) { H.state = 'none'; H.k = null; }
  mod = {
    tick(dt) {
      if (!R.alive || R.over) return;
      /* 떠돌이 두목: 나타나기 8초 전 예고 (뱃고동 · 위쪽 줄 보스 우선) — 예고 없는 큰 피해 0 */
      const cp = R.chiefPlan; if (cp && !R.chief && !st.chiefWarned && R.elapsed >= cp.at - 8) { st.chiefWarned = true; R.ui.event('멀리서 뱃고동 — 곧 검은 닻 두목이 물길에 나타나요 (붉은 닻 표시)', 'boss'); vib([60, 80, 60]); }
      if (R.chief && !st.chiefSeen) { st.chiefSeen = true; if (S.stats) S.stats.chiefRaid = S.stats.raids || 0; }
      if (D && H.state !== 'none') D.tick?.(dt);
    },
    near(n) { return D?.near && H.state !== 'none' ? D.near(n) : n; },
    act(n) { D?.act?.(n); },
    marks(out) { for (const m of st.marks) out.push(m.raw ? m : { p: m.p, t: m.t, c: m.c }); },
    dispose() { st.tex?.dispose(); if (st.lamp) st.lamp.life = 0; },
  };
  return mod;
}

/* main.js 가 판 시작 때 부름: 판 중 사건 + 접근성(색약 진영 모양 표 · 두 겹 고리) 장치를 R.mods 에 넣음 */
export function m6cRaid(R, opt = {}) {
  try { R.mods.push(happenRaid(R, opt)); } catch (e) { console.warn('판 중 사건', e); }
  try { const a = raidA11y(R, facOf); if (a) R.mods.push(a); } catch (e) { console.warn('접근성', e); }
}
