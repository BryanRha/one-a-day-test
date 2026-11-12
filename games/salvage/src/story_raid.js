// 판 안 이야기 — 무전(짧은 자막 + 몽이 반응) · 튜토리얼 무전 · 이야기 물건(금빛 고리 상자) · 녹음기 · 벽 낙서
//  raid.js 는 건드리지 않고 판 상태를 매 프레임 지켜봄 (main.js 가 attach · tick · detach)
import * as THREE from 'three';
import { S, save } from './save.js?v=0.99.33';
import * as ST from './story.js?v=0.99.33';
import { boardWants } from './board.js?v=0.99.33';
import { ITEMS } from './data.js?v=0.99.33';
import { RS } from './plan.js?v=0.99.33';
import { sfx } from './audio.js?v=0.99.33';
import { T, talk, portrait } from './story_ui.js?v=0.99.33';

const snd = (n, ...a) => { try { sfx[n]?.(...a); } catch { /* */ } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LOOTY = new Set(['crate', 'barrel', 'locker', 'toolbox', 'chest', 'net', 'cargo', 'kiosk', 'cart', 'bench', 'stash', 'corebox']); /* 공장(M3-B) 상자 포함 */
/* 지도 상자 = 알려진 종류 + 새 지도(연구소 M4-B)의 상자도: 지도에 놓인(obj) · 금고 · 시체 · 내려놓은 것 · 적 잔해(obj 없음)는 빼고 */
const looty = c => LOOTY.has(c.kind) || (!!c.obj && !c.corpse && c.kind !== 'vault' && c.kind !== 'drop' && c.zone >= 1);
const LIMIT = 3; /* 튜토리얼 밖 무전은 판당 3줄 (판 시작 · 사건 · 탈출 직전) */

export class StoryRaid {
  constructor(app, story) { this.app = app; this.story = story; this.R = null; }
  attach(R) {
    this.detach(); this.R = R; this.t = 0; this.said = new Set(); this.n = 0; this.intro = false; this.texs = []; this.rings = []; this.grafs = [];
    const st = S.story; this.tut = this.story.on && st.tut >= 1 && st.tut <= 3 ? st.tut : 0;
    talk('common'); talk('memo'); if (this.tut) talk('t0'); const b = ST.openBeat(S); if (b) talk('t' + Math.min(5, b.ch));
    const f = document.getElementById('frame'); document.getElementById('radio')?.remove();
    const el = this.el = document.createElement('div'); el.id = 'radio'; el.className = 'radio'; f.appendChild(el);
    const rnd = mulberry(R.opt.seed * 13 + 5);
    const pick = list => list[Math.floor(rnd() * list.length)];
    const boxes = z => R.containers.filter(c => looty(c) && (z == null || c.zone === z));
    /* 이야기 물건: 열린 걸음이 이 지도 carry 면 그 구역 상자 하나에 (금빛 고리) */
    /* + 진행 중인 판 의뢰(carry)도 같은 방식 — 물건마다 다른 상자 (M3-C) */
    const day = S.day; const wants = [ST.storyWant(S, R.map), ...boardWants(S, R.map, day)].filter(Boolean); const used = new Set();
    for (const w of wants) { const L = boxes(w.zone).filter(c => !used.has(c)); const c = pick(L.length ? L : boxes().filter(c2 => !used.has(c2))); if (c) { used.add(c); c.items.unshift(w.item); c.best = Math.max(c.best || 0, 99); c.story = true; R.want.add(w.item); this.ring(c, 0xffd36b); } }
    /* 녹음기: 그 지도에 안 들은 게 있으면 40% (튜토리얼 판 X) — 깊은 구역 상자 */
    if (!this.tut && ST.tapeLeft(S, R.map).length && rnd() < 0.4) { const L = [...boxes(2), ...boxes(3)]; const c = L.length && pick(L); if (c) { c.items.push('tape'); c.tape = true; } }
    /* 벽 낙서: 안 본 것부터 2개 (튜토리얼 둘째 판은 깊은 창고 첫 방에 '짐 찾으러 꼭 옴') */
    const pool = Array.from({ length: ST.GRAF_N }, (_, i) => `${R.map}:${i}`); const unseen = pool.filter(g => !st.graf.includes(g));
    const want = this.tut === 2 && R.map === 'ware' ? [`ware:0`] : [];
    for (const g of unseen) if (want.length < 2 && !want.includes(g) && rnd() < 0.7) want.push(g);
    const rooms = R.P.rooms.filter(r => r.id !== R.P.start && r.id !== R.P.vault && r.id !== R.P.bossRoom && r.type !== 'vault');
    want.forEach((g, i) => { const z = g === 'ware:0' && this.tut === 2 ? 2 : 1 + Math.floor(rnd() * 3); const rs = rooms.filter(r => r.zone === z); const rm = (g === 'ware:0' && this.tut === 2) ? rs.sort((a, b) => (R.P.dist?.[a.id] ?? 0) - (R.P.dist?.[b.id] ?? 0))[0] : pick(rs.length ? rs : rooms); if (rm) this.decal(g, rm, i); });
  }
  /* 금빛 고리 (이야기 물건이 든 상자) */
  ring(c, col) {
    const m = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.25, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(c.pos.x, 0.22, c.pos.z); m.userData.own = true; m.userData.ownMat = true; this.R.root.add(m); this.rings.push({ m, c });
  }
  /* 벽 낙서: 바닥에 분필 글씨 판 (위에서 읽힘) + 반짝임 · 지나가면 한 줄 */
  decal(id, rm, i) {
    const R = this.R; const [mp, n] = id.split(':'); const txt = T.memo?.GRAF[mp]?.[+n] || '';
    let x = rm.x0 + RS / 2 + (i ? 3 : -3), z = rm.z0 + 3.4;
    for (const [dx, dz] of [[0, 0], [0, RS - 6.8], [i ? -6 : 6, 0], [0, 4]]) { const px = x + dx, pz = z + dz; if (!R.containers.some(c => Math.hypot(c.pos.x - px, c.pos.z - pz) < 2)) { x = px; z = pz; break; } }
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160; const g = cv.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, 512, 160); g.translate(256, 80); g.rotate(-0.04 + (i ? 0.05 : 0));
    g.font = '700 46px "Apple SD Gothic Neo", "Pretendard", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const t = txt.length > 14 ? [txt.slice(0, txt.lastIndexOf(' ', 15) > 4 ? txt.lastIndexOf(' ', 15) : 14), txt.slice(txt.lastIndexOf(' ', 15) > 4 ? txt.lastIndexOf(' ', 15) + 1 : 14)] : [txt];
    g.fillStyle = 'rgba(240,236,220,0.9)'; g.shadowColor = 'rgba(255,240,200,.6)'; g.shadowBlur = 6;
    t.forEach((l, k) => g.fillText(l, 0, (k - (t.length - 1) / 2) * 52));
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; this.texs.push(tex);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.3), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.55 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.06, z); m.userData.own = true; m.userData.ownMat = true; R.root.add(m);
    const sp = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.42, 20), new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.rotation.x = -Math.PI / 2; sp.position.set(x + 1.9, 0.12, z - 0.4); sp.userData.own = true; sp.userData.ownMat = true; R.root.add(sp);
    this.grafs.push({ id, x, z, m, sp, read: false, txt });
  }
  /* 상자 열 때 (ui.openLoot) — 튜토리얼 첫 상자엔 이름표 붙은 상자 */
  onLoot(c) {
    const st = S.story; if (this.tut === 1 && !st.flags.tagGiven && c && LOOTY.has(c.kind)) { c.items.unshift('tagbox'); st.flags.tagGiven = 1; this.R?.want.add('tagbox'); save(); this.say('tag', T.t0?.RADIO_TUT.tag, true, null, null, 2.5);
      /* 장면 1 선택지는 첫 상자를 연 뒤 (v0.5.1 · 검수 Top 3) — 규칙 한 줄 + 고르기, 안 고르면 그냥 지나감 */
      if (T.t0?.ASK1 && !this.said.has('ask1')) { this.said.add('ask1'); this.push({ key: 'ask1', line: T.t0.RULE, prio: 2.5, ask: T.t0.ASK1 }); } }
  }
  /* 무전 한 줄 — 같은 key 는 한 번 · 아직 합류 안 한 사람이면 곰방 줄(alt) 또는 말 안 함 (story.voiceLine — QA v0.5.1)
   *  보여 주는 순서 · 겹침은 ui.top(위쪽 한 줄 대기열): 무전 = 우선순위 2 (튜토리얼 그 자리 안내 2.5) */
  say(key, line, force, mongi, alt, prio = 2) {
    if (!line || this.said.has(key)) return; if (!force && this.n >= LIMIT) return;
    this.said.add(key); const l = ST.voiceLine(S, line, alt); if (!l) return; if (!force) this.n++;
    this.push({ key, line: l, mongi, prio });
  }
  push({ key, line, mongi, prio = 2, ask, cap }) {
    const ui = this.app.ui; if (!ui?.top) return; const text = cap || line[1];
    const it = { prio, key: 'r:' + key, ask, hold: !!ask, dur: ask ? 12 : (this.tut ? 3.4 : 2.6) + (mongi ? 0.8 : 0) + Math.max(0, text.length - 18) * 0.06,
      show: () => this.render(it, line, mongi, cap), hide: () => this.el?.classList.remove('on', 'asking'), timeout: ask ? () => this.answer(it, -1) : null };
    ui.top.push(it); return it;
  }
  render(it, line, mongi, cap) {
    const el = this.el; if (!el) return;
    if (cap) { el.innerHTML = `<div><span class="capt">${esc(cap)}</span></div>`; el.className = 'radio on cap'; return; }
    const [sp, text] = line; const id = ST.ALIAS[sp.replace('~', '')] || sp.replace('~', ''); const pet = mongi && this.R?.L.pet; const nm = this.storyName();
    el.innerHTML = `${portrait(id, 'sm')}<div><b><em>무전</em> ${esc(ST.SPEAK[id]?.name || '')}</b><span>${esc(ST.say(text, nm))}</span>${pet ? `<small class="mg">${portrait('mongi', 'xs')}${esc(mongi)}</small>` : ''}${it.ask ? `<div class="ask">${it.ask.c.map(([t], i) => `<button data-i="${i}">${esc(ST.say(t, nm))}</button>`).join('')}</div>` : ''}</div>`;
    el.className = 'radio on' + (id === 'nole' ? ' nole' : '') + (it.ask ? ' asking' : ''); snd('radio'); if (pet) snd('mong', 'ask');
    if (it.ask) el.querySelectorAll('.ask button').forEach(b => b.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); this.answer(it, +b.dataset.i); });
  }
  /* 판 안 선택지: 고르면 반응 무전 · 시간이 지나면 첫 줄 효과만 (모두 같은 사이 +1) */
  answer(it, i) {
    if (it.answered) return; it.answered = true; const pick = it.ask.c[Math.max(0, i)];
    ST.applyFx(S, pick[2]); if (pick[2]?.rel && i >= 0) snd('bond'); save(); this.app.ui.top.done(it);
    if (i >= 0) (pick[1] || []).forEach((l, k) => this.push({ key: it.key + ':re' + k, line: l, prio: 2.6 }));
  }
  storyName() { try { return ST.cleanName(localStorage.getItem(ST.NAME_KEY)); } catch { return ST.NAME_DEFAULT; } }
  tick(dt) {
    const R = this.R; if (!R || !R.alive) return; this.t += dt; const pl = R.pl; const st = S.story;
    if (R.over) { this.app.ui.top?.clear(); return; }
    for (const r of this.rings) { if (r.c.searched && !r.c.items.some(k => ITEMS_MEMO(k))) r.m.visible = false; else r.m.material.opacity = 0.55 + Math.sin(this.t * 4) * 0.3; }
    for (const g of this.grafs) { if (g.read) continue; g.sp.material.opacity = 0.5 + Math.sin(this.t * 5 + g.x) * 0.4; g.sp.scale.setScalar(1 + Math.sin(this.t * 3) * 0.25);
      if (Math.hypot(pl.pos.x - g.x, pl.pos.z - g.z) < 3.0) { g.read = true; g.sp.visible = false; g.m.material.opacity = 0.85; if (!st.graf.includes(g.id)) { st.graf.push(g.id); st.flags.codexNew = 1; } if (g.id === 'ware:0') st.flags.sawGraf = 1; save(); this.app.ui.event(`벽 낙서 — “${g.txt}”`, 'lore'); snd('memory'); } }
    const C = T.common; const RT = T.t0?.RADIO_TUT; const near = (p, d) => Math.hypot(p.x - pl.pos.x, p.z - pl.pos.z) < d;
    const openExit = () => R.exits.find(x => x.open && near(x.pos, 7));
    /* 튜토리얼 첫 판 */
    if (this.tut === 1 && RT) {
      /* 장면 1: 빈 화면 대신 걸어가는 동안 (장면 글 → 곰방 3줄) — 그 자리 안내(상자 · 적 · 구르기)가 오면 그쪽이 먼저 */
      const T0 = T.t0; if (!this.intro && this.t > 0.5 && T0?.INTRO) { this.intro = true; this.push({ key: 'cap', cap: T0.DOCK_CAP, prio: 2 }); T0.INTRO.forEach((l, k) => this.say('intro' + k, l, true)); }
      const P = 2.5;
      if (R.near?.type === 'loot' && !R.near.c.searched) this.say('box', RT.box, true, null, null, P);
      const sp = R.enemies.find(e => !e.dead && !e.sleep && e.state === 'chase' && near(e.pos, 16)); if (sp) this.say('spot', sp.kind === 'drone' ? RT.spot : RT.spotSkel, true, null, null, P);
      if (R.killN > 0) this.say('kill', RT.kill, true);
      if (R.enemyShots.some(s => s.m && near(s.m.position, 7))) this.say('roll', RT.roll, true, null, null, P);
      if (R.events.flood) this.say('flood', RT.flood, true, null, null, P);
      const x = openExit(); if (x) this.say('exit', x.kind === 'early' ? RT.exit : RT.exitOther, true, null, null, P);
      return;
    }
    if (!C) return;
    const b = ST.openBeat(S); const bt = b && T['t' + Math.min(6, b.ch)]?.BEAT[b.id];
    if (this.t > 1.6) {
      if (this.tut === 2 && RT) this.say('start', RT.start2, true); else if (this.tut === 3 && RT) this.say('start', RT.start3, true);
      else if (b?.goal?.map === R.map && bt?.hint) this.say('start', bt.hint, false, null, rad(C.RADIO_G, 'start', R.map)); else this.say('start', rad(C.RADIO, 'start', R.map), false, null, rad(C.RADIO_G, 'start', R.map));
    }
    const RD = k => [rad(C.RADIO, k, R.map), rad(C.RADIO_G, k, R.map)];
    if (R.events.flood) this.say('flood', ...RD('flood'));
    if (R.events.blackout && R.map !== 'harbor') this.say('blackout', ...RD('blackout'));
    if (R.events.boss) this.say('boss', ...RD('boss'), 2.4);
    if (pl.hp < pl.maxHp * 0.5 && !pl.dead) this.say('hurt', C.RADIO.hurt, false, null, C.RADIO.hurtG);
    if (openExit() && R.elapsed > 30) this.say('exit', C.RADIO.exit);
    /* 3장: 제어실 노을 목소리(파수) · 선로의 떠돌이 */
    if (b?.id === 'b_freq' && R.map === 'tunnel' && R.zone >= 3) { this.say('nole', C.RADIO.nole, true, C.RADIO.noleMongi, null, 2.8); st.flags.heardNole = 1; }
    if (b?.id === 'b_boot' && R.map === 'tunnel' && R.zone >= 2 && !st.met.includes('baram')) { st.met.push('baram'); save(); this.say('baram', C.RADIO.baram, true); }
    /* 4장: 공장에서 검은 닻 첫 무전 (낯선 주파수 — 누구든 늘 들림) → 바람이 끼어듦 */
    if (R.map === 'factory' && (b?.id === 'b_ch4' || b?.id === 'b_anchor') && this.t > 14 && C.RADIO.anchor) { this.say('anchor', C.RADIO.anchor, true, null, null, 2.7); if (!st.flags.heardAnchor) { st.flags.heardAnchor = 1; save(); } if (this.t > 18) this.say('anchorB', C.RADIO.anchorB, true, null, C.RADIO_G.anchorB, 2.6); }
    /* 5장 연구소: 수조 구역에서 '노을 목소리'(= 파수가 이어 붙인 녹음) · 관제실이 열린 뒤엔 파수가 직접 */
    if (R.map === 'lab' && (b?.id === 'b_ch5' || b?.id === 'b_tank') && R.zoneMax >= 2 && C.RADIO.noleLab) { this.say('noleLab', C.RADIO.noleLab, true, C.RADIO.noleMongi, null, 2.8); st.flags.heardNoleLab = 1; }
    if (R.map === 'lab' && (b?.id === 'b_mother' || b?.id === 'b_pasu' || st.beatsDone.b_mother) && this.t > 10 && C.RADIO.pasu) this.say('pasu', C.RADIO.pasu, false);
    /* M5-A 대수문 꼭대기: 깨어남 · 단계 바뀜 · 약점 · 멈춤 — 인물 무전 (엔딩 뒤엔 파수의 '시험 운전') */
    if (R.map === 'gate' && T.t6?.RADIO6) { const RR = T.t6.RADIO6, G = R.GT, e = R.boss; if (st.ending) this.say('g_again', RR.again, true); else if (this.t > 2.4) this.say('g_start', RR.start, true);
      if (G?.active) this.say('g_wake', RR.wake, true); if (G?.phase >= 1 && !(G.shift > 0)) this.say('g_p1', RR.p1, true); if (G?.phase >= 2 && !(G.shift > 0)) this.say('g_p2', RR.p2, true);
      if (e && !e.dead && e.weakT > 0) this.say('g_weak', RR.weak, true); if (e?.dead) this.say('g_down', RR.down, true, null, null, 3); }
    /* 몽이 코: 녹음기 · 이야기 물건 상자 가까이 */
    if (R.L.pet) for (const c of R.containers) if ((c.tape || c.story) && !c.searched && near(c.pos, 9)) { this.say('sniff' + (c.tape ? 't' : 's'), ['y', C.RADIO.sniff], true); break; }
  }
  detach() {
    for (const t of this.texs || []) t.dispose(); this.texs = []; this.rings = []; this.grafs = []; this.app.ui?.top?.clear();
    this.el?.remove(); this.el = null; this.R = null;
  }
}
/* 무전 표: 지도마다 다르면 { ware, harbor, tunnel }, 아니면 한 줄 */
const rad = (tbl, k, map) => { const v = tbl?.[k]; return Array.isArray(v) ? v : v?.[map] || null; };
const ITEMS_MEMO = k => k !== 'tape' && ITEMS[k]?.cat === 'memo';
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
