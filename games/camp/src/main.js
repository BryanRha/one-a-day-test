/* 숲속 힐링 캠프 (가제) v0.1 — 화면 (2026-10-29 · 개발 · 클린룸)
   - 규칙은 sim.js (화면 없이 돎 · 봇이 같이 씀) · 화면은 sim 이벤트를 따라 움직임 (규칙이 화면을 기다리지 않음 → 막힘 0)
   - 배경: 2D 손그림(우리 프롬프트 · 고원 숲 캠핑장 배치) · 시설: 2D 그림(DOM) · 사람: Three 툰 3D (chars.js · 몸 교체 가능) · 효과: 2D 캔버스
   - 주소 옵션: ?oadtest=1 (가짜 원어데이 지갑 · 광고) · ?speed=N (시간 N배) · ?reset=1 · ?fps=1 · ?shot=이름 (스크린샷용 상태) */
import * as THREE from 'three';
import * as D from './data.js?v=0.89.0';
import * as G from './sim.js?v=0.89.0';
import * as C from './chars.js?v=0.89.0';
import * as UI from './ui.js?v=0.89.0';
import { sfx, music, setAudio } from './audio.js?v=0.89.0';
import { bm } from './oad_bm.js?v=0.89.0';
import { installBack } from './oad.js?v=0.89.0';

const Q = new URLSearchParams(location.search);
const W = 720, H = 1560, EL = 30 * Math.PI / 180, TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)], clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const S = G.S, R = G.R, IMG = UI.IMG;
const frame = document.getElementById('frame'), world = document.getElementById('world'), taps = document.getElementById('taps');
const bootBar = document.querySelector('#boot .ld i'); const setBoot = p => { if (bootBar) bootBar.style.width = Math.round(p * 100) + '%'; };
function fit() { const s = Math.min(innerWidth / W, innerHeight / H); frame.style.transform = `translate(-50%,-50%) scale(${s})`; }
fit(); addEventListener('resize', fit);
setBoot(0.15);

/* ── three ── */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(W, H); renderer.setClearColor(0, 0);
renderer.domElement.style.cssText = 'position:absolute;left:0;top:0;width:720px;height:1560px;pointer-events:none;z-index:2';
frame.insertBefore(renderer.domElement, document.getElementById('fx'));
const scene = new THREE.Scene();
const cam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -4000, 4000);
cam.position.set(0, Math.sin(EL) * 1000, Math.cos(EL) * 1000); cam.lookAt(0, 0, 0);
const toWorld = (sx, sy) => new THREE.Vector3(sx - W / 2, 0, (sy - H / 2) / Math.sin(EL));
const toScreen = v => [v.x + W / 2, v.z * Math.sin(EL) + H / 2 - v.y * Math.cos(EL)];
scene.add(new THREE.AmbientLight(0xfff4e6, 1.55));
const sun = new THREE.DirectionalLight(0xfff0d8, 1.15); sun.position.set(0.6, 1, 0.5); scene.add(sun);
C.setup({ toWorld, spring: true }); C.sceneRef.scene = scene;
/* 단골 · 의상 (같은 원칙: 주색 1 · 보조 1 · 포인트 1) */
Object.assign(C.LOOKS, {
  hiker: C.LOOKS.g1, grandma: C.LOOKS.g2, kid: C.LOOKS.g3,
  yunseul: { ...C.LOOKS.g1, top: 0xEFE6D2, topPat: ['knit', 0xE0D2B8], bucket: 0xC9DDB0, bucketBand: 0x9CC48A, pack: 0x7A6A5A, packFlap: 0x6A5A4A, straps: 0x6A5A4A, lash: true },
  bomi: { ...C.LOOKS.g2, top: 0xF3C8D0, pants: 0xF3C8D0, shawl: 0xFFF6E6 },
  dodam: { ...C.LOOKS.g3, size: 0.95, top: 0xBFD8EE, collar: 0xFFFBF2, collarPat: null, teddy: null, pants: 0xE2D2B4, boots: null, shoe: 0x8A5A3A, speed: 70 },
  heroSkin: { ...C.LOOKS.hero, apron: 0xFFE38A, pocket: 0xF0CC6A, ties: 0xFFE38A, ribbon: 0xF3A9BA },
});
const lookOf = g => C.LOOKS[g.reg || g.look] || C.LOOKS.g1;

/* ── 시설 · 자리 · 안개 (DOM · 판 좌표) ── */
const natural = {};
function facImg(src, x, y, scale = 0.86, cls = 'fac') { const im = document.createElement('img'); im.className = cls; im.src = src; im.style.left = x + 'px'; im.style.top = y + 'px'; im.draggable = false;
  const set = () => { im.style.width = Math.round(im.naturalWidth * scale) + 'px'; }; if (im.complete && im.naturalWidth) set(); else im.onload = set; return im; }
const layer = { fac: document.createElement('div'), front: document.createElement('div'), ui: document.createElement('div') }; layer.fac.style.cssText = 'position:absolute;inset:0;'; layer.front.style.cssText = 'position:absolute;inset:0;z-index:2;pointer-events:none'; layer.ui.style.cssText = 'position:absolute;inset:0;';
world.append(layer.fac); document.getElementById('fx').before(layer.front); taps.append(layer.ui);   /* 식탁 · 데크는 사람 앞(뒤에 앉은 손님의 다리를 가림) */
/* 3D 캔버스 위에 그려야 하는 것(시설 앞부분) 없음 → 시설은 사람 뒤(z 1), 표지 · 버튼은 사람 앞(taps z 4) */
const facEl = {};
export function render() {
  layer.fac.innerHTML = ''; layer.front.innerHTML = ''; layer.ui.innerHTML = '';
  /* 장식 (뽑기 · 스탬프 · 골드 세트 · 소장자) */
  const decoOn = new Set(Object.keys(S.deco).filter(k => S.deco[k] > 0)); if (S.shop.deco) D.DECO_SHOP.deco.items.forEach(k => decoOn.add(k));
  for (const d of D.DECO) if (decoOn.has(d.id)) layer.fac.append(facImg(IMG(d.img), d.pos[0], d.pos[1], 0.62));
  if (S.owner) { const im = facImg(IMG('fac/lantern'), ...D.P(110, 1180), 0.62); im.style.filter = 'sepia(.6) saturate(1.8) hue-rotate(-12deg) drop-shadow(0 0 8px #FFE38A)'; layer.fac.append(im); }
  /* 시설 */
  for (const p of D.PADS) {
    const b = S.pads[p.id], [x, y] = p.pos;
    if (b && b.lv > 0) { const f = D.FAC[p.fac], t = D.tierOf(b.lv), im = facImg(IMG(f.img), x, y + 18, 0.82 + 0.05 * t, 'fac t' + t); (f.kind === 'seat' ? layer.front : layer.fac).append(im); facEl[p.id] = im;
      if (t >= 2) { const gl = document.createElement('div'); gl.className = 'garland'; gl.style.left = x + 'px'; gl.style.top = (y - 70) + 'px'; for (let i = 0; i < 7; i++) { const d = document.createElement('i'); d.style.left = (i - 3) * 20 - 7 + 'px'; d.style.top = Math.abs(i - 3) ** 1.6 * 3 + 'px'; d.style.animationDelay = -i * 0.3 + 's'; gl.append(d); } layer.fac.append(gl); }
      tag(p.id, x, y + 26); hit(x, y - 30, 150, 130, () => UI.facDialog(p.id)); }
    else if (G.zoneOpen(p.zone)) { const pd = document.createElement('div'); pd.className = 'pad' + (S.coin < G.padCost() ? ' cant' : ''); pd.style.left = x + 'px'; pd.style.top = y + 'px'; pd.innerHTML = `<span>+ ${D.FAC[p.fac].name}</span>`; pd.onclick = () => { sfx('tap'); UI.buildDialog(p.id); }; layer.ui.append(pd); }
  }
  /* 공용 키친 빵 오븐 (배경 그림 속 화덕) */
  tag('oven', D.KITCHEN.oven[0] - 10, D.KITCHEN.oven[1] + 30); hit(D.KITCHEN.pos[0], D.KITCHEN.pos[1] + 10, 210, 150, () => UI.facDialog('oven'));
  hit(D.WELCOME.pos[0], D.WELCOME.pos[1], 240, 140, () => UI.openTab('shop'));
  /* 편의 설비 (키친 · 웰컴센터 앞 작은 표지) */
  const am = Object.keys(D.AMEN).filter(a => S.amen[a]); const E = { fridge: '🧊', sink: '🚰', toaster: '🍞', micro: '♨️', shower: '🚿', laundry: '🧺' };
  let ki = 0, wi = 0; for (const a of am) { const k = D.AMEN[a].at === 'kitchen'; const s = document.createElement('div'); s.className = 'lvtag'; s.style.fontSize = '20px'; s.style.padding = '3px 6px'; const [bx, by] = k ? D.P(560 + ki++ * 46, 990) : D.P(250 + wi++ * 46, 770); s.style.left = bx + 'px'; s.style.top = by + 'px'; s.textContent = E[a]; s.title = D.AMEN[a].name; layer.fac.append(s); }
  /* 잠긴 구역 안개 · 공사 */
  for (const z of D.ZONES) { const o = S.zones[z.id], r = D.ZONE_FOG[z.id]; if (!r || o.st === 'open') continue;
    const f = document.createElement('div'); f.className = 'fog'; Object.assign(f.style, { left: r[0] + 'px', top: r[1] + 'px', width: r[2] - r[0] + 'px', height: r[3] - r[1] + 'px' }); f.dataset.z = z.id;
    const ok = G.zoneNeedOk(z.id); f.innerHTML = o.st === 'building' ? `<div class="lock">🔨 ${z.name.split(' · ')[0]}<small class="zt">정리 중</small></div>` : `<div class="lock">${ok ? '✨ ' : '🔒 '}${z.name.split(' · ')[0]}<small>${ok ? '지금 열 수 있어요!' : `레벨 ${z.need.lv} · 시설 ${z.need.built}개`}</small></div>`;
    if (ok && o.st === 'locked') f.querySelector('.lock').style.animation = 'dotHop 1.4s cubic-bezier(.34,1.56,.64,1) infinite';
    if (r[2] >= 700) f.style.paddingRight = '120px'; if (r[1] < 100) f.style.paddingTop = '140px';
    f.onclick = () => { sfx('tap'); UI.zoneDialog(z.id); }; layer.ui.append(f); }
  for (const g of R.gifts) giftEl(g);
  for (const v of guests.values()) if (v.bub && v.bub.style.display !== 'none') layer.ui.append(v.bub);
  catEl && layer.ui.append(catEl);
}
function tag(t, x, y) { const d = document.createElement('div'); d.className = 'lvtag'; d.style.left = x + 'px'; d.style.top = y + 'px'; d.dataset.t = t; layer.ui.append(d); updTag(d); }
function updTag(d) { const t = d.dataset.t, o = t === 'oven' ? S.oven : S.pads[t]; if (!o) return; const w = G.working(t); const can = !w && o.lv < D.UP.max && S.coin >= G.upCostOf(t);
  const txt = w ? `🔨 ${Math.ceil((w.end - S.t) / 60)}분` : `Lv.${o.lv}${can ? ' ▲' : ''}`; if (d.textContent !== txt) d.textContent = txt; d.classList.toggle('up', can); }
function hit(x, y, w, h, f) { const d = document.createElement('div'); d.className = 'hit'; Object.assign(d.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', marginLeft: -w / 2 + 'px' }); d.style.transform = 'translate(0,-50%)'; d.onclick = () => { sfx('tap'); f(); }; layer.ui.append(d); }
function giftEl(g) { if (g.el && g.el.isConnected) return; const d = document.createElement('div'); d.className = 'gift in'; d.style.left = g.x + 'px'; d.style.top = g.y + 'px'; d.innerHTML = `<img src="${IMG(g.kind === 'rare' || g.kind === 'gem' ? 'deco/gift' : g.kind === 'treat' ? 'deco/treats' : 'deco/gift')}">`;
  d.onclick = () => { const i = R.gifts.indexOf(g); if (i < 0) return; const got = G.takeGift(i); if (!got) return; d.remove(); sfx('gift'); burst(g.x, g.y, 'sparkle', 10);
    if (got.coin) UI.fly('coin', g.x, g.y, 5); if (got.gem) UI.fly('gem', g.x, g.y, 4); if (got.rp) UI.fly('rp', g.x, g.y, 4);
    const k = Object.keys(got)[0]; UI.numPop(g.x, g.y - 40, `+${D.fmt(got[k])} ${({ ...D.CUR, big: '도시락' })[k]}`); save(); };
  g.el = d; layer.ui.append(d); }

/* ── 사람들 ── */
const people = new Set();
const mk = (look, x, y, seed) => { const p = C.create('person', look, x, y, seed); people.add(p); return p; };
const drop = p => { if (!p) return; scene.remove(p.root); people.delete(p); };
let hero = null, lad = null;
function makeHero() { const at = hero ? [toScreen(hero.root.position)[0], toScreen(hero.root.position)[1]] : D.KITCHEN.stand; drop(hero); hero = mk(S.skin ? C.LOOKS.heroSkin : C.LOOKS.hero, at[0], at[1], 0); hero.face(D.KITCHEN.stand[0] + 30, D.KITCHEN.stand[1] + 90); lad = C.ladle(); hero.J.elbR.add(lad); lad.position.set(0, -18, 0); }
const cooks = {};     /* st → { id, p } */
const servers = {};   /* staff id → { p } */
function syncStaff() {
  for (const st of ['pot', 'drink']) { const id = R.cooks[st], pos = G.stationPos(st); if (cooks[st] && cooks[st].id === id) continue; if (cooks[st]) { drop(cooks[st].p); delete cooks[st]; } if (!id || !pos) continue;
    const look = C.LOOKS[D.STAFF.find(s => s.id === id).look], at = [pos[0] + (pos[0] < 200 ? 62 : -62), pos[1] + 8]; const p = mk(look, ...at, 2 + Object.keys(cooks).length); p.face(...pos, 0.55); cooks[st] = { id, p, at }; p.play('wave'); }
  for (const sv of R.servers) if (!servers[sv.id]) { const look = C.LOOKS[D.STAFF.find(s => s.id === sv.id).look], home = [D.KITCHEN.pick[0] - 50 - Object.keys(servers).length * 50, D.KITCHEN.pick[1] + 30]; const p = mk(look, ...(sv.pos || home), 5 + Object.keys(servers).length); p.face(360, 900, 0.5); servers[sv.id] = { p, home }; p.play('wave'); }
}
const guests = new Map();   /* gid → { p, bub, pup, g, gone } */
function worldLen(path) { let L = 0; for (let i = 1; i < path.length; i++) { const a = toWorld(...path[i - 1]), b = toWorld(...path[i]); L += a.distanceTo(b); } return L; }
function walkPath(p, path, dur, then) { p.speed = worldLen(path) / Math.max(0.5, dur) * 1.18; let i = 1; const go = () => { if (i >= path.length) return then && then(); const [x, y] = path[i++]; p.walkTo(x, y, go); }; go(); }
function sitDown(v) { const s = v.g.seat; v.p.root.position.copy(toWorld(s.x, s.y + 2)); v.p.target = null; v.p.then = null; v.p.face(...s.face, 0.35); v.p.play('sit'); v.seated = true; }
const KIND = { bread: 'bagel', soup: 'soup', drink: 'cocoa' };
function bubble(v, menuId) { if (!v.bub) { v.bub = document.createElement('div'); v.bub.className = 'bubble'; layer.ui.append(v.bub); } const m = D.MENU.find(x => x.id === menuId); v.bub.innerHTML = `<img src="${IMG(m.img)}">`; v.bub.style.display = ''; if (!v.bub.isConnected) layer.ui.append(v.bub); }
function pup(v) { const d = document.createElement('img'); d.src = IMG('deco/pup_walk'); d.style.cssText = 'position:absolute;width:62px;transform:translate(-50%,-90%);pointer-events:none;z-index:3'; frame.querySelector('#fx').before(d); v.pup = d; }

/* ── 캠핑장 고양이 '노을' (볕 쬐기 · 가끔 손님에게 다가감 · 쓰다듬기) ── */
let catEl = null; const cat = { x: D.CAT_SPOT[0], y: D.CAT_SPOT[1], st: 'sleep', t: 0, next: 18, tx: 0, ty: 0, back: false };
function makeCat() { catEl = document.createElement('div'); catEl.className = 'catspot'; catEl.innerHTML = `<img src="${IMG('deco/cat_sleep')}" style="width:76px;display:block;transform-origin:50% 100%">`; catEl.style.zIndex = 5;
  catEl.onclick = () => { const r = G.petCat(); burst(cat.x, cat.y - 30, 'heart', r ? 4 : 1); if (r) { sfx('cat'); UI.toast(`노을이가 골골송을 불러요 · ${r.treat ? '간식 1개를 물어 왔어요' : '쉼 포인트 +5'}`, true); cat.st = 'sit'; cat.t = 0; save(); } else { sfx('cat'); UI.toast('노을이가 눈을 가늘게 떠요 · 조금 뒤에 또 쓰다듬어 줘요'); } }; }
function catTick(dt) {
  if (!catEl) return; cat.t += dt; const im = catEl.firstChild;
  if (cat.st === 'sleep') { im.style.transform = `scale(${1 + 0.03 * Math.sin(cat.t * 1.6)}, ${1 - 0.03 * Math.sin(cat.t * 1.6)})`; if (cat.t > cat.next) { cat.st = 'sit'; cat.t = 0; } }
  else if (cat.st === 'sit') { im.style.transform = `rotate(${Math.sin(cat.t * 2) * 3}deg)`; if (cat.t > 4) { const seated = [...guests.values()].filter(v => v.seated && !v.gone); if (!cat.back && seated.length && Math.random() < 0.7) { const v = pick(seated); cat.tx = v.g.seat.x + 40; cat.ty = v.g.seat.y + 30; cat.st = 'walk'; cat.goal = v; } else if (cat.back) { cat.tx = D.CAT_SPOT[0]; cat.ty = D.CAT_SPOT[1]; cat.st = 'walk'; cat.goal = null; } else { cat.st = 'sleep'; cat.t = 0; cat.next = rnd(25, 50); } } }
  else if (cat.st === 'walk') { const dx = cat.tx - cat.x, dy = cat.ty - cat.y, d = Math.hypot(dx, dy), v = 46 * dt; if (d < 4) { cat.st = cat.goal ? 'visit' : 'sleep'; cat.t = 0; cat.back = !!cat.goal; cat.next = rnd(25, 50); if (cat.goal) burst(cat.x - 30, cat.y - 120, 'heart', 2); } else { cat.x += dx / d * Math.min(v, d); cat.y += dy / d * Math.min(v, d); im.style.transform = `scaleX(${dx < 0 ? 1 : -1}) translateY(${-Math.abs(Math.sin(cat.t * 9)) * 3}px)`; } }
  else if (cat.st === 'visit') { im.style.transform = `rotate(${Math.sin(cat.t * 2.4) * 4}deg)`; if (cat.t > 7) { cat.st = 'sit'; cat.t = 4; } }
  const src = IMG(cat.st === 'sleep' ? 'deco/cat_sleep' : cat.st === 'walk' ? 'deco/cat_walk' : 'deco/cat_sit'); if (!im.src.endsWith(src)) im.src = src;
  catEl.style.left = cat.x + 'px'; catEl.style.top = (cat.y - 30) + 'px';
}

/* ── 2D 효과 ── */
const fx = document.getElementById('fx').getContext('2d'); const parts = [];
const petals = Array.from({ length: 10 }, () => ({ x: rnd(0, W), y: rnd(-200, 1100), v: rnd(18, 34), ph: rnd(0, 6), s: rnd(7, 11), c: pick(['#FAD4DE', '#F7C0CF', '#FFE6EC', '#FFF3B8']) }));
const flies = [0, 1, 2].map(i => ({ x: rnd(100, 600), y: rnd(500, 1100), ph: rnd(0, 6), c: ['#FFE38A', '#BFE0F6', '#F9D4DC'][i] }));
function puff(x, y, n = 1) { for (let i = 0; i < n; i++) parts.push({ k: 'steam', x: x + rnd(-8, 8), y, vx: rnd(-6, 6), vy: rnd(-30, -22), life: rnd(1.4, 2.2), t: 0, r: rnd(7, 11) }); }
export function burst(x, y, k = 'sparkle', n = 12) { for (let i = 0; i < n; i++) { const a = rnd(0, TAU), s = rnd(60, 200); parts.push({ k, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (k === 'heart' ? 80 : 40), life: rnd(0.6, 1.1) * (k === 'heart' ? 1.5 : 1), t: 0, r: rnd(4, 8), c: pick(['#FFE38A', '#FFF6D0', '#F9D4DC', '#BFE6D6']) }); } }
function dust(x, y) { for (let i = 0; i < 14; i++) { const a = rnd(Math.PI * 0.9, Math.PI * 2.1); parts.push({ k: 'dust', x: x + rnd(-40, 40), y: y + rnd(-6, 6), vx: Math.cos(a) * rnd(30, 90), vy: rnd(-40, -10), life: rnd(0.6, 1), t: 0, r: rnd(8, 16) }); } }
function star(x, y, r, a) { fx.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.35 : r, an = a + i * Math.PI / 4; fx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } fx.closePath(); fx.fill(); }
function heartP(x, y, s, al) { fx.save(); fx.translate(x, y); fx.scale(s, s); fx.globalAlpha = al; fx.fillStyle = '#FF7B8A'; fx.strokeStyle = '#B04A5A'; fx.lineWidth = 2.5; fx.beginPath(); fx.moveTo(0, 8); fx.bezierCurveTo(-16, -4, -9, -16, 0, -7); fx.bezierCurveTo(9, -16, 16, -4, 0, 8); fx.fill(); fx.stroke(); fx.restore(); }
function draw2d(dt, now) {
  fx.clearRect(0, 0, W, H);
  /* 햇살 */
  fx.save(); fx.globalCompositeOperation = 'lighter'; const sa = 0.045 + 0.02 * Math.sin(now * 0.6);
  for (let i = 0; i < 3; i++) { const g = fx.createLinearGradient(560, 0, 300, 760); g.addColorStop(0, `rgba(255,250,225,${sa})`); g.addColorStop(1, 'rgba(255,250,225,0)'); fx.fillStyle = g; fx.beginPath(); fx.moveTo(560 + i * 70, 0); fx.lineTo(620 + i * 70, 0); fx.lineTo(330 + i * 90, 760); fx.lineTo(250 + i * 90, 760); fx.fill(); }
  fx.restore();
  /* 폭포 물보라 (계곡 열리면) · 화덕 불빛 · 불멍 화로 */
  if (G.zoneOpen('valley') && Math.random() < dt * 6) parts.push({ k: 'mist', x: D.P(770, 205)[0] + rnd(-20, 20), y: D.P(770, 205)[1], vx: rnd(-14, 14), vy: rnd(-22, -8), life: rnd(1, 1.8), t: 0, r: rnd(6, 10) });
  { const [ox, oy] = D.KITCHEN.oven, gl = fx.createRadialGradient(ox, oy, 2, ox, oy, 46), a = 0.28 + 0.08 * Math.sin(now * 7) + (hero && hero.act === 'stir' ? 0.12 : 0); gl.addColorStop(0, `rgba(255,170,80,${a})`); gl.addColorStop(1, 'rgba(255,170,80,0)'); fx.fillStyle = gl; fx.beginPath(); fx.arc(ox, oy, 46, 0, TAU); fx.fill(); }
  const fp = G.padOf('firepit'); if (fp) { const [x, y] = fp.pos; fx.save(); fx.translate(x, y - 6); fx.scale(0.45, 0.45); for (const [c, s, o] of [['#FF8A3D', 1, 0], ['#FFB43D', 0.72, 1.3], ['#FFF0A0', 0.42, 2.6]]) { fx.fillStyle = c; fx.beginPath(); const h = 46 * s * (1 + 0.12 * Math.sin(now * 9 + o)), w = 26 * s, sw = 5 * Math.sin(now * 5 + o); fx.moveTo(-w, 0); fx.quadraticCurveTo(-w * 0.9, -h * 0.55, sw, -h); fx.quadraticCurveTo(w * 0.9, -h * 0.55, w, 0); fx.quadraticCurveTo(0, w * 0.35, -w, 0); fx.fill(); } fx.restore(); if (Math.random() < dt * 3) parts.push({ k: 'ember', x: x + rnd(-8, 8), y: y - 24, vx: rnd(-8, 8), vy: rnd(-50, -30), life: rnd(0.7, 1.2), t: 0 }); }
  /* 요리 김 */
  if (Math.random() < dt * (hero && hero.act === 'stir' ? 3 : 0.6)) puff(D.KITCHEN.oven[0], D.KITCHEN.oven[1] - 40);
  for (const st of ['pot', 'drink']) { const c = cooks[st]; if (c && c.p.act === 'stir' && Math.random() < dt * 3) { const p = G.stationPos(st); puff(p[0], p[1] - 70); } }
  /* 단계 시설 반짝 */
  for (const p of D.PADS) { const b = S.pads[p.id]; if (b && D.tierOf(b.lv) >= 1 && Math.random() < dt * 0.5 * D.tierOf(b.lv)) parts.push({ k: 'twinkle', x: p.pos[0] + rnd(-60, 60), y: p.pos[1] - rnd(10, 100), life: 0.9, t: 0, r: rnd(5, 9) }); }
  /* 꽃잎 · 나비 */
  for (const l of petals) { l.y += l.v * dt; l.ph += dt * 1.6; const x = l.x + Math.sin(l.ph) * 26; if (l.y > 1200) { l.y = rnd(-80, -10); l.x = rnd(0, W); }
    fx.save(); fx.translate(x, l.y); fx.rotate(Math.sin(l.ph * 1.3) * 0.9); fx.fillStyle = l.c; fx.strokeStyle = '#C98A9A'; fx.lineWidth = 1.5; const r = l.s * 0.8; fx.beginPath(); fx.moveTo(0, -r); fx.quadraticCurveTo(r, -r * 0.2, 0, r); fx.quadraticCurveTo(-r, -r * 0.2, 0, -r); fx.fill(); fx.stroke(); fx.restore(); }
  for (const b of flies) { b.ph += dt; b.x += Math.cos(b.ph * 0.7) * 40 * dt; b.y += Math.sin(b.ph * 1.1) * 30 * dt; b.x = clamp(b.x, 40, W - 40); b.y = clamp(b.y, 380, 1150); const f = Math.abs(Math.sin(b.ph * 14));
    fx.save(); fx.translate(b.x, b.y + Math.sin(b.ph * 3) * 6); fx.fillStyle = b.c; fx.strokeStyle = '#7A6A7A'; fx.lineWidth = 1.5; for (const s of [-1, 1]) { fx.beginPath(); fx.ellipse(s * 7 * f, -3, 8 * f + 1, 7, s * 0.4, 0, TAU); fx.fill(); fx.stroke(); fx.beginPath(); fx.ellipse(s * 5 * f, 5, 5 * f + 1, 5, -s * 0.3, 0, TAU); fx.fill(); fx.stroke(); } fx.fillStyle = '#7A6A7A'; fx.fillRect(-1.2, -6, 2.4, 13); fx.restore(); }
  for (let i = parts.length - 1; i >= 0; i--) {
    const q = parts[i]; q.t += dt; const k = q.t / q.life; if (k >= 1) { parts.splice(i, 1); continue; }
    if (q.k === 'steam' || q.k === 'mist') { q.x += q.vx * dt; q.y += q.vy * dt; fx.fillStyle = `rgba(255,251,242,${(q.k === 'mist' ? 0.5 : 0.65) * (1 - k)})`; fx.beginPath(); fx.arc(q.x, q.y, q.r * (1 + k * 1.6), 0, TAU); fx.fill(); }
    else if (q.k === 'ember') { q.x += q.vx * dt; q.y += q.vy * dt; fx.fillStyle = `rgba(255,200,90,${1 - k})`; fx.beginPath(); fx.arc(q.x, q.y, 2.5, 0, TAU); fx.fill(); }
    else if (q.k === 'sparkle') { q.vy += 260 * dt; q.vx *= 0.97; q.x += q.vx * dt; q.y += q.vy * dt; fx.fillStyle = q.c; fx.globalAlpha = 1 - k; star(q.x, q.y, q.r * (1 - k * 0.5) * 1.6, q.t * 4); fx.globalAlpha = 1; }
    else if (q.k === 'twinkle') { fx.fillStyle = '#FFF6D0'; fx.globalAlpha = Math.sin(k * Math.PI); star(q.x, q.y, q.r * Math.sin(k * Math.PI), 0); fx.globalAlpha = 1; }
    else if (q.k === 'heart') { q.vx *= 0.92; q.vy *= 0.95; q.x += q.vx * dt * 0.4; q.y += (q.vy * 0.3 - 30) * dt; heartP(q.x, q.y, 0.8 + 0.3 * Math.sin(k * Math.PI), 1 - Math.max(0, k - 0.6) / 0.4); }
    else if (q.k === 'dust') { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.94; fx.fillStyle = `rgba(232,214,184,${0.7 * (1 - k)})`; fx.beginPath(); fx.arc(q.x, q.y, q.r * (1 + k), 0, TAU); fx.fill(); }
  }
}

/* ── sim 이벤트 → 화면 ── */
function onEvent(e) {
  switch (e.type) {
    case 'spawn': { const g = e.g, p = mk(lookOf(g), ...e.path[0], g.id % 5); const v = { p, g }; guests.set(g.id, v); if (g.dog) pup(v); walkPath(p, e.path, e.dur, () => { if (!v.gone && guests.get(g.id) === v) sitDown(v); }); break; }
    case 'order': { const v = guests.get(e.g.id); if (v) { if (!v.seated) sitDown(v); bubble(v, e.m); } break; }
    case 'cook': { const pr = e.st === 'oven' ? hero : cooks[e.st] && cooks[e.st].p; if (pr) { pr.play('stir'); pr.face(...(e.st === 'oven' ? D.KITCHEN.oven : G.stationPos(e.st)), 0.3); } break; }
    case 'cooked': { const pr = e.st === 'oven' ? hero : cooks[e.st] && cooks[e.st].p; if (pr) { pr.play('taste'); const home = pr === hero ? [D.KITCHEN.stand[0] + 30, D.KITCHEN.stand[1] + 90] : null; if (home) pr.face(...home); setTimeout(() => { if (pr.act === 'taste') pr.play('idle'); }, 1400); } const at = e.st === 'oven' ? D.KITCHEN.oven : G.stationPos(e.st); if (at) puff(at[0], at[1] - 50, 4); break; }
    case 'deliver': { const s = servers[e.sv]; if (!s) break; const p = s.p, cur = toScreen(p.root.position), line = D.MENU.find(m => m.id === e.o.menu).line;
      const from = [e.from[0] - 30, e.from[1] + 40]; walkPath(p, [cur, from], e.dur * 0.4, () => { p.hold(C.dish(KIND[line])); p.speed *= 1; walkPath(p, [from, e.to], e.dur * 0.55, () => { const v = guests.get(e.o.gid); if (v) p.face(v.g.seat.x, v.g.seat.y); p.play('serve'); }); }); s.to = e.to; break; }
    case 'served': { const s = servers[e.sv]; if (s) { if (s.p.target) { s.p.root.position.copy(toWorld(...s.to)); s.p.target = null; s.p.then = null; } s.p.hold(null); s.p.play('serve'); setTimeout(() => s.p.act === 'serve' && s.p.play('idle'), 700); }
      const v = guests.get(e.g.id); if (v) { if (!v.seated) sitDown(v); if (v.bub) v.bub.style.display = 'none'; v.p.hold(C.dish(KIND[D.MENU.find(m => m.id === e.g.menu).line])); v.p.play('eat'); sfx('serve'); } break; }
    case 'paid': { const v = guests.get(e.g.id); if (!v) break; v.p.hold(null); v.p.play('happy'); const [x, y] = toScreen(v.p.root.position);
      burst(x, y - 140, 'heart', e.g.reg ? 3 : 1); UI.fly('coin', x, y - 90, e.crit ? 7 : 2); UI.numPop(x, y - 150, `${e.crit ? '대박! ' : '+'}${D.fmt(e.c)}`, e.crit); if (e.crit) { sfx('crit'); burst(x, y - 120, 'sparkle', 16); } break; }
    case 'leave': { const v = guests.get(e.g.id); if (!v) break; v.gone = true; v.seated = false; if (v.bub) v.bub.remove(); setTimeout(() => { v.p.play('idle'); walkPath(v.p, e.path, e.dur, () => endGuest(e.g.id, v)); }, 900); v.kill = performance.now() + (e.dur + 6) * 1000; break; }
    case 'gift': giftEl(e.gift); sfx('gift'); break;
    case 'build': { render(); const p = D.PADS.find(x => x.id === e.pid); const im = facEl[e.pid]; if (im) im.classList.add('pop'); dust(p.pos[0], p.pos[1] + 20); burst(p.pos[0], p.pos[1] - 40, 'sparkle', 18); sfx('build'); syncStaff(); break; }
    case 'upgrade': { const t = e.target, pos = t === 'oven' ? D.KITCHEN.oven : D.PADS.find(x => x.id === t).pos; if (e.tier) { render(); burst(pos[0], pos[1] - 40, 'sparkle', 26); dust(pos[0], pos[1]); sfx('tier'); } else { const im = facEl[t]; if (im) { im.classList.remove('bump'); void im.offsetWidth; im.classList.add('bump'); } burst(pos[0], pos[1] - 50, 'sparkle', 6); } break; }
    case 'workDone': case 'zoneOpen': case 'amen': case 'hire': case 'menuNew': case 'box': { if (e.type === 'zoneOpen') { const f = layer.ui.querySelector(`.fog[data-z="${e.z}"]`); if (f) { f.classList.add('lifting'); setTimeout(render, 1500); } else render(); } else render(); if (e.type === 'hire') syncStaff(); if (e.type === 'amen') { const at = D.AMEN[e.id].at === 'kitchen' ? D.KITCHEN.pos : D.WELCOME.pos; burst(at[0], at[1], 'sparkle', 16); } break; }
    case 'zoneWork': render(); break;
    case 'levelup': hero && hero.play('wave'); break;
  }
  UI.onEvent(e);
}
function endGuest(id, v) { if (guests.get(id) !== v) return; drop(v.p); if (v.pup) v.pup.remove(); if (v.bub) v.bub.remove(); guests.delete(id); }

/* ── 저장 (기기 · 원어데이 SAVES 'camp_v1') ── */
let saveAt = 0;
export function save() { try { S.lastSeen = S.t; localStorage.setItem(D.GAME.save, JSON.stringify(G.save())); } catch { /* */ } saveAt = 0; }
addEventListener('pagehide', save); document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

/* ── 초상화 (3D 캐릭터를 한 번 그려 그림으로) ── */
const portraits = {};
let pr = null;
function portrait(key) {
  if (portraits[key]) return portraits[key];
  try { if (!pr) { pr = { r: new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }), s: new THREE.Scene() }; pr.r.setSize(160, 160); pr.r.setClearColor(0, 0); pr.s.add(new THREE.AmbientLight(0xfff4e6, 1.6)); const l = new THREE.DirectionalLight(0xfff0d8, 1.1); l.position.set(0.5, 1, 0.8); pr.s.add(l); pr.c = new THREE.OrthographicCamera(-60, 60, 60, -60, -500, 500); pr.c.position.set(0, 160, 300); pr.c.lookAt(0, 140, 0); }
    const look = C.LOOKS[key] || C.LOOKS.g1; const keep = C.sceneRef.scene; C.sceneRef.scene = pr.s; const p = C.create('person', look, W / 2, H / 2, 1); C.sceneRef.scene = keep; p.root.position.set(0, 0, 0); p.root.rotation.y = 0.35; p.update(0.016, 1); pr.c.position.set(0, 150 * p.root.scale.y, 300); pr.c.lookAt(0, 130 * p.root.scale.y, 0);
    pr.r.render(pr.s, pr.c); portraits[key] = pr.r.domElement.toDataURL(); pr.s.remove(p.root); } catch { portraits[key] = IMG('deco/heart'); }
  return portraits[key];
}

/* ── 시작 ── */
const now0 = () => Date.now() / 1000;
let offlineRes = null;
{
  let obj = null; try { if (Q.get('reset') === '1') localStorage.removeItem(D.GAME.save); obj = JSON.parse(localStorage.getItem(D.GAME.save) || 'null'); } catch { obj = null; }
  if (obj) { const lastSeen = obj.lastSeen || now0(); G.load(obj, lastSeen); offlineRes = G.offline(Math.max(lastSeen, now0())); } else G.fresh(now0());
}
if (S.muted) setAudio({ sfx: false, bgm: false });
setBoot(0.4);
const ctx = { portrait, save, render, reskin: () => makeHero(), padPos: id => id === 'oven' ? [D.KITCHEN.oven[0] - 10, D.KITCHEN.oven[1] + 10] : (D.PADS.find(p => p.id === id) || {}).pos,
  fx: (k, t) => { const pos = t === 'oven' ? D.KITCHEN.oven : (D.PADS.find(p => p.id === t) || {}).pos; if (pos) burst(pos[0], pos[1] - 40, 'sparkle', 8); } };
UI.init(ctx);
makeHero(); syncStaff(); makeCat(); render();
/* 첫 화면부터 '돌아가는 캠프': 처음엔 손님 하나가 이미 걸어오는 중 */
R.nextSpawn = 0.3;
setBoot(0.7);
bm.hello().then(h => {
  if (h.ok) { const items = h.items || []; if (items.includes('deco')) S.shop.deco = true; if (items.includes('skin') && !S.skin) { S.skin = true; makeHero(); } S.owner = !!h.owned; render(); }
});
installBack({ back: () => false });
bm.hello().then(() => { if (offlineRes) UI.offlinePop(offlineRes); });   /* 광고 2배 버튼은 원어데이 응답 뒤에 */
if (G.attendReady() && S.t - S.created > 600) setTimeout(() => UI.attendPop(), 600);   /* 처음 온 날은 캠프부터 보여 줌 (출석은 옆 버튼 빨간 점) */
music(true);
window.__camp = { G, D, S, R, UI, render, save, people, guests, burst };

/* ── 반복 ── */
const SPEED = Math.max(0.1, +(Q.get('speed') || 1));
let last = performance.now(), wall = now0(), acc = 0; const fpsLog = [];
window.__stats = () => { const a = fpsLog.slice(-240); return { fps: +(a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(1), min: +Math.min(...a).toFixed(1), people: people.size, loadMs: window.__loadMs }; };
function loop(t) {
  const rdt = (t - last) / 1000; last = t; fpsLog.push(1 / Math.max(rdt, 1e-3)); if (fpsLog.length > 600) fpsLog.shift();
  const nowW = now0(), gap = nowW - wall; wall = nowW;
  if (gap > 60) { S.lastSeen = S.t; const o = G.offline(S.t + gap); if (o) UI.offlinePop(o); }   /* 오래 떠나 있다 돌아옴 (탭 숨김 등) */
  const dt = Math.min(0.1, rdt) * SPEED; let left = dt; while (left > 0) { const s = Math.min(0.25, left); G.step(s); left -= s; }
  for (const e of G.drain()) onEvent(e);
  for (const p of people) p.update(Math.min(0.05, rdt), t / 1000);
  for (const [id, v] of guests) { const [x, y] = toScreen(v.p.root.position); if (v.bub && v.bub.style.display !== 'none') { v.bub.style.left = x + 'px'; v.bub.style.top = (y - 150) + 'px'; } if (v.pup) { const sit = v.seated; v.pup.src = IMG(sit ? 'deco/pup_sit' : 'deco/pup_walk'); v.pup.style.left = (x + 44) + 'px'; v.pup.style.top = (y + 14) + 'px'; } if (v.kill && performance.now() > v.kill) endGuest(id, v); }
  for (const [, s] of Object.entries(servers)) if (!s.p.target && s.p.act === 'idle' && !R.servers.find(x => servers[x.id] === s)?.job && Math.random() < rdt * 0.08) { const h = s.home; s.p.speed = 60; s.p.walkTo(h[0] + rnd(-20, 20), h[1] + rnd(-6, 10), () => s.p.face(360, 900, 0.5)); }
  if (hero.act === 'idle' && Math.random() < rdt * 0.05) { hero.play('wave'); setTimeout(() => hero.act === 'wave' && hero.play('idle'), 1600); }
  renderer.render(scene, cam); draw2d(Math.min(0.05, rdt), t / 1000); catTick(Math.min(0.05, rdt)); UI.tick(Math.min(0.1, rdt));
  if ((acc += rdt) > 0.5) { acc = 0; layer.ui.querySelectorAll('.lvtag').forEach(updTag); layer.ui.querySelectorAll('.pad').forEach(p => p.classList.toggle('cant', S.coin < G.padCost())); const zt = layer.ui.querySelectorAll('.fog .zt'); zt.forEach(z => { const id = z.closest('.fog').dataset.z, o = S.zones[id]; if (o.st === 'building') z.textContent = `정리 중 · ${UI.tm(o.end - S.t)} · 눌러서 바로 끝내기`; });
    if (Q.get('fps') === '1') { let el = document.getElementById('fpsx'); if (!el) { el = document.createElement('div'); el.id = 'fpsx'; el.style.cssText = 'position:absolute;left:8px;bottom:4px;z-index:99;font:12px monospace;color:#5E4A42'; frame.append(el); } el.textContent = JSON.stringify(window.__stats()); } }
  if ((saveAt += rdt) > 10) save();
  requestAnimationFrame(loop);
}
window.__loadMs = Math.round(performance.now());
setBoot(1); setTimeout(() => { const b = document.getElementById('boot'); b.classList.add('gone'); setTimeout(() => b.remove(), 900); }, 250);
requestAnimationFrame(loop);
