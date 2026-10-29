/* 숲속 힐링 캠프 (가제) v0.1 — 화면 (2026-10-29 · 개발 · 클린룸)
   - 규칙은 sim.js (화면 없이 돎 · 봇이 같이 씀) · 화면은 sim 이벤트를 따라 움직임 (규칙이 화면을 기다리지 않음 → 막힘 0)
   - 배경: 2D 손그림(우리 프롬프트 · 고원 숲 캠핑장 배치) · 시설: 2D 그림(DOM) · 사람: Three 툰 3D (chars.js · 몸 교체 가능) · 효과: 2D 캔버스
   - 주소 옵션: ?oadtest=1 (가짜 원어데이 지갑 · 광고) · ?speed=N (시간 N배) · ?reset=1 · ?fps=1 · ?shot=이름 (스크린샷용 상태) */
import * as THREE from 'three';
import * as D from './data.js?v=0.91.3';
import * as G from './sim.js?v=0.91.3';
import * as C from './chars.js?v=0.91.3';
import * as C2 from './chars2d.js?v=0.91.3';
import * as UI from './ui.js?v=0.91.3';
import { sfx, music, setAudio } from './audio.js?v=0.91.3';
import { bm } from './oad_bm.js?v=0.91.3';
import { installBack } from './oad.js?v=0.91.3';

const Q = new URLSearchParams(location.search);
const W = 720, H = 1560, EL = 30 * Math.PI / 180, TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)], clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const S = G.S, R = G.R, IMG = UI.IMG;
const frame = document.getElementById('frame'), board = document.getElementById('board'), world = document.getElementById('world'), taps = document.getElementById('taps');
const bootBar = document.querySelector('#boot .ld i'); const setBoot = p => { if (bootBar) bootBar.style.width = Math.round(p * 100) + '%'; };
/* 화면 맞추기: 더 길쭉한 화면(폴드 등)은 판을 가운데 두고 프레임만 길게 → HUD 는 화면 끝 (퀄리티 B5) */
let OFFY = 0; const F = (x, y) => [x, y + OFFY];
function fit() { const tall = innerHeight / innerWidth > H / W, s = tall ? innerWidth / W : innerHeight / H, FH = tall ? Math.round(innerHeight / s) : H;
  frame.style.height = FH + 'px'; OFFY = Math.round((FH - H) / 2); frame.classList.toggle('tall', OFFY > 8); board.style.top = OFFY + 'px'; frame.style.transform = `translate(-50%,-50%) scale(${s})`; UI.setOffY && UI.setOffY(OFFY); }
fit(); addEventListener('resize', fit);
setBoot(0.15);

/* ── three ── */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(W, H); renderer.setClearColor(0, 0);
renderer.domElement.style.cssText = 'position:absolute;left:0;top:0;width:720px;height:1560px;pointer-events:none;z-index:2';
board.insertBefore(renderer.domElement, document.getElementById('fx'));
const scene = new THREE.Scene();
const cam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -4000, 4000);
cam.position.set(0, Math.sin(EL) * 1000, Math.cos(EL) * 1000); cam.lookAt(0, 0, 0);
const toWorld = (sx, sy) => new THREE.Vector3(sx - W / 2, 0, (sy - H / 2) / Math.sin(EL));
const toScreen = v => [v.x + W / 2, v.z * Math.sin(EL) + H / 2 - v.y * Math.cos(EL)];
/* 빛: 배경 햇살과 같은 오른쪽 위에서 · 그늘은 하늘빛 보라가 섞인 따뜻한 색 (검정 X) */
scene.add(new THREE.HemisphereLight(0xFFF4E2, 0xC8B0D0, 1.25));
scene.add(new THREE.AmbientLight(0xE8D4E6, 0.55));
const sun = new THREE.DirectionalLight(0xFFEFD2, 1.2); sun.position.set(0.7, 1, 0.35); scene.add(sun);
C.setup({ toWorld, spring: true, persp: D.PERSP, el: EL }); C.sceneRef.scene = scene; C2.setup({ toWorld, scene, el: EL, persp: D.PERSP });
C.register('cut', (look, x, y, seed) => new C2.Cut(look.cut, look, x, y, seed));   /* 2D 컷아웃 몸 (퀄리티 A1) */
const USE2D = Q.get('body') === '2d';   /* 캐릭터 = 3D 마루미 계열 (대표 지시 10-29) · 2D 컷아웃은 ?body=2d 비교용 */
/* 단골 · 의상 (같은 원칙: 주색 1 · 보조 1 · 포인트 1) */
Object.assign(C.LOOKS, {
  hiker: C.LOOKS.g1, grandma: C.LOOKS.g2, kid: C.LOOKS.g3,
  yunseul: { ...C.LOOKS.g1, top: 0xEFE6D2, topPat: ['knit', 0xE0D2B8], bucket: 0xC9DDB0, bucketBand: 0x9CC48A, pack: 0x7A6A5A, packFlap: 0x6A5A4A, straps: 0x6A5A4A, lash: true },
  bomi: { ...C.LOOKS.g2, top: 0xF3C8D0, pants: 0xF3C8D0, shawl: 0xFFF6E6 },
  dodam: { ...C.LOOKS.g3, size: 0.95, top: 0xBFD8EE, collar: 0xFFFBF2, collarPat: null, teddy: null, pants: 0xE2D2B4, boots: null, shoe: 0x8A5A3A, speed: 70 },
  heroSkin: { ...C.LOOKS.hero, apron: 0xFFE38A, pocket: 0xF0CC6A, ties: 0xFFE38A, ribbon: 0xF3A9BA },
});
/* 2D 컷아웃 그림 연결 (h = 화면 키 px · 시설 높이의 약 0.8배) */
/* 키 = 어른 기준(D.ADULT_H = 문 높이 × 0.8) 의 비율 · 실제 화면 키는 × 원근(D.PERSP) */
const A = D.ADULT_H, CUT = { hero: ['chef', A], heroSkin: ['chef_skin', A], helper: ['helper', A * 0.97], cook1: ['cook1', A * 1.07], cook2: ['cook2', A * 0.97], helper2: ['helper2', A * 0.84],
  hiker: ['hiker', A], g1: ['hiker', A], grandma: ['grandma', A * 0.9], g2: ['grandma', A * 0.9], kid: ['kid', A * 0.72], g3: ['kid', A * 0.72], couple: ['couple', A * 0.97], family: ['family', A * 1.04],
  yunseul: ['yunseul', A * 0.97], bomi: ['bomi', A * 0.88], dodam: ['dodam', A] };
for (const [k, [cut, h]] of Object.entries(CUT)) if (C.LOOKS[k]) C.LOOKS[k] = { ...C.LOOKS[k], cut, h };
const lookOf = g => C.LOOKS[g.reg || g.look] || C.LOOKS.g1;

/* ── 시설 · 자리 · 안개 (DOM · 판 좌표) ── */
const natural = {};
function facImg(src, x, y, scale = 0.86, cls = 'fac') { const im = document.createElement('img'); im.className = cls; im.src = src; im.style.left = x + 'px'; im.style.top = y + 'px'; im.draggable = false;
  const set = () => { im.style.width = Math.round(im.naturalWidth * scale) + 'px'; }; if (im.complete && im.naturalWidth) set(); else im.onload = set; return im; }
const layer = { fac: document.createElement('div'), front: document.createElement('div'), ui: document.createElement('div') }; layer.fac.style.cssText = 'position:absolute;inset:0;'; layer.front.style.cssText = 'position:absolute;inset:0;z-index:2;pointer-events:none'; layer.ui.style.cssText = 'position:absolute;inset:0;';
world.append(layer.fac); layer.front.dataset.front = 1; document.getElementById('fx').before(layer.front); taps.append(layer.ui);   /* 식탁 · 데크는 사람 앞(뒤에 앉은 손님의 다리를 가림) */
/* 3D 캔버스 위에 그려야 하는 것(시설 앞부분) 없음 → 시설은 사람 뒤(z 1), 표지 · 버튼은 사람 앞(taps z 4) */
const facEl = {};
export function render() {
  layer.fac.innerHTML = ''; layer.front.innerHTML = ''; layer.ui.innerHTML = '';
  /* 장식 (뽑기 · 스탬프 · 골드 세트 · 소장자) */
  const decoOn = new Set(Object.keys(S.deco).filter(k => S.deco[k] > 0)), setOn = S.shop.deco || performance.now() < decoUntil;
  for (const d of D.DECO) if (decoOn.has(d.id) && !(setOn && D.DECO_SHOP.deco.items.includes(d.id))) layer.fac.append(facImg(IMG(d.img), d.pos[0], d.pos[1], D.DECO_K * D.PERSP(d.pos[1])));
  if (setOn) { const im = facImg(IMG('deco/set_sakura'), D.SET_POS[0], D.SET_POS[1] + 40, 0.44 * D.PERSP(D.SET_POS[1])); if (!S.shop.deco) im.style.filter = 'drop-shadow(0 0 10px #FFE38A)'; layer.fac.append(im); }   /* 벚꽃 정원 세트 전용 그림 (퀄리티 A4) */
  if (S.owner) { const im = facImg(IMG('fac/lantern'), ...D.P(110, 1180), D.DECO_K * D.PERSP(D.P(110, 1180)[1])); im.style.filter = 'sepia(.6) saturate(1.8) hue-rotate(-12deg) drop-shadow(0 0 8px #FFE38A)'; layer.fac.append(im); }
  /* 시설 */
  for (const p of D.PADS) {
    const b = S.pads[p.id], [x, y] = p.pos; let pk = D.PERSP(y);
    if (b && b.lv > 0) { const f = D.FAC[p.fac], t = D.tierOf(b.lv), im = facImg(IMG(f.img), x, y + 12 * pk, D.FAC_K * (1 + 0.05 * t) * pk, 'fac t' + t); (f.kind === 'seat' ? layer.front : layer.fac).append(im); facEl[p.id] = im;
      if (t >= 2) { const gl = document.createElement('div'); gl.className = 'garland'; gl.style.left = x + 'px'; gl.style.top = (y - 70) + 'px'; for (let i = 0; i < 7; i++) { const d = document.createElement('i'); d.style.left = (i - 3) * 20 - 7 + 'px'; d.style.top = Math.abs(i - 3) ** 1.6 * 3 + 'px'; d.style.animationDelay = -i * 0.3 + 's'; gl.append(d); } layer.fac.append(gl); }
      tag(p.id, x, y + 18 * pk); hit(x, y - 20 * pk, 110 * pk, 90 * pk, () => stationTap(f.kind === 'cook' ? p.fac : null, () => UI.facDialog(p.id)), p.id); }
    else if (G.zoneOpen(p.zone)) { const pd = document.createElement('div'); pd.className = 'pad' + (S.coin < G.padCost() ? ' cant' : ''); pd.style.left = x + 'px'; pd.style.top = y + 'px'; pd.innerHTML = `<span>+ ${D.FAC[p.fac].name}</span>`; pd.onclick = () => { sfx('tap'); UI.buildDialog(p.id); }; layer.ui.append(pd); }
  }
  /* 공용 키친 빵 오븐 (배경 그림 속 화덕) */
  tag('oven', ...D.P(772, 932)); hit(D.KITCHEN.pos[0], D.KITCHEN.pos[1] + 10, 210, 150, () => stationTap('oven', () => UI.facDialog('oven')), 'oven');
  hit(D.WELCOME.pos[0], D.WELCOME.pos[1], 240, 140, () => UI.openTab('shop'));
  /* 편의 설비 (키친 · 웰컴센터 앞 작은 표지) */
  const am = Object.keys(D.AMEN).filter(a => S.amen[a]);
  let ki = 0, wi = 0; for (const a of am) { const k = D.AMEN[a].at === 'kitchen'; const s = document.createElement('div'); s.className = 'lvtag'; s.style.padding = '3px'; const [bx, by] = k ? D.P(560 + ki++ * 52, 990) : D.P(250 + wi++ * 52, 770); s.style.left = bx + 'px'; s.style.top = by + 'px'; s.innerHTML = `<img src="${IMG(UI.AMEN_IMG[a])}" alt="">`; s.title = D.AMEN[a].name; layer.fac.append(s); }
  /* 잠긴 구역 안개 · 공사 */
  /* 안개 = 배경 화풍으로 그린 구름 여러 겹이 천천히 흐름 · 큰 라벨은 '다음에 열릴 구역' 하나만, 나머지는 작은 자물쇠 (퀄리티 A3) */
  const nextZ = (D.ZONES.find(z => S.zones[z.id].st !== 'open') || {}).id;
  for (const z of D.ZONES) { const o = S.zones[z.id], r = D.ZONE_FOG[z.id]; if (!r || o.st === 'open') continue;
    const f = document.createElement('div'); f.className = 'fog'; Object.assign(f.style, { left: r[0] + 'px', top: r[1] + 'px', width: r[2] - r[0] + 'px', height: r[3] - r[1] + 'px' }); f.dataset.z = z.id;
    const fw = r[2] - r[0], fh = r[3] - r[1]; let seed = z.id.length * 7 + z.id.charCodeAt(0); const rr = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    /* 구름 2~3겹: 가운데 긴 띠 하나 + 작은 뭉게구름 1~2 · 그 아래 땅은 살짝 흐리고 옅게 (잠긴 곳이라는 표시) */
    const veil = document.createElement('div'); veil.className = 'veil'; f.append(veil);
    const put = (n, cw, x, y, wpx, op = 0.95) => { const im = document.createElement('img'); im.className = 'cl'; im.src = IMG('fog/cloud0' + n); im.style.width = wpx + 'px'; im.style.left = x + 'px'; im.style.top = y + 'px'; im.style.opacity = op; im.style.setProperty('--d', (11 + rr() * 8) + 's'); im.style.setProperty('--dx', (10 + rr() * 14) + 'px'); im.style.animationDelay = -rr() * 10 + 's'; f.append(im); };
    put(1, 486, fw * 0.02, fh * 0.42, fw * 0.96); put(rr() < 0.5 ? 2 : 3, 215, fw * (0.05 + rr() * 0.2), fh * 0.12, fw * 0.42, 0.9); if (fh > 260) put(4, 323, fw * (0.4 + rr() * 0.15), fh * 0.72, fw * 0.5, 0.85);
    const ok = G.zoneNeedOk(z.id), short = z.name.split(' · ')[0], lab = document.createElement('div');
    if (o.st === 'building') { lab.className = 'work2'; lab.innerHTML = `<img src="${IMG('ui/hammer')}" alt=""><span class="zt"></span>`; }
    else if (z.id === nextZ) { lab.className = 'lock'; lab.innerHTML = `<b><img src="${IMG(ok ? 'ui/sparkle' : 'ui/lock')}" alt="">${short}</b><small>${ok ? '지금 열 수 있어요!' : `레벨 ${z.need.lv} · 시설 ${z.need.built}개`}</small>`; if (ok) lab.style.animation = 'dotHop 1.4s cubic-bezier(.34,1.56,.64,1) infinite'; }
    else { lab.className = 'mini'; lab.innerHTML = `<img src="${IMG('ui/lock')}" alt="">`; }
    f.append(lab);
    if (r[2] >= 700) f.style.paddingRight = '130px'; if (r[1] < 100) f.style.paddingTop = '150px';
    f.onclick = () => { sfx('tap'); UI.zoneDialog(z.id); }; layer.ui.append(f); }
  for (const g of R.gifts) giftEl(g);
  for (const v of guests.values()) if (v.bub && v.bub.style.display !== 'none') layer.ui.append(v.bub);
  catEl && layer.ui.append(catEl);
  for (const el of dishEls.values()) layer.ui.append(el); for (const el of tipEls.values()) layer.ui.append(el); for (const el of [sheepEl, giftBub, visBub]) if (el) layer.ui.append(el);
}
function tag(t, x, y) { const d = document.createElement('div'); d.className = 'lvtag tapz'; d.onclick = ev => { ev.stopPropagation(); sfx('tap'); UI.facDialog(t); }; d.style.left = x + 'px'; d.style.top = y + 'px'; d.dataset.t = t; layer.ui.append(d); updTag(d); }
function updTag(d) { const t = d.dataset.t, o = t === 'oven' ? S.oven : S.pads[t]; if (!o) return; const w = G.working(t); const can = !w && o.lv < D.UP.max && S.coin >= G.upCostOf(t);
  const txt = w ? `<img src="${IMG('ui/hammer')}" alt="">${UI.clock(w.end - S.t)}` : `Lv.${o.lv}${can ? ' ▲' : ''}`; if (d.dataset.h !== txt) { d.innerHTML = txt; d.dataset.h = txt; } d.classList.toggle('up', can); }
function hit(x, y, w, h, f, k) { const d = document.createElement('div'); d.className = 'hit'; if (k) d.dataset.k = k; Object.assign(d.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', marginLeft: -w / 2 + 'px' }); d.style.transform = 'translate(0,-50%)'; d.onclick = () => { sfx('tap'); f(); }; layer.ui.append(d); }
function giftEl(g) { if (g.el && g.el.isConnected) return; const d = document.createElement('div'); d.className = 'gift in'; d.style.left = g.x + 'px'; d.style.top = g.y + 'px'; d.innerHTML = `<img src="${IMG(g.kind === 'rare' || g.kind === 'gem' ? 'deco/gift' : g.kind === 'treat' ? 'deco/treats' : 'deco/gift')}">`;
  d.onclick = () => { pressFx(d); const i = R.gifts.indexOf(g); if (i < 0) return; const got = G.takeGift(i); if (!got) return; d.remove(); sfx('gift'); burst(g.x, g.y, 'sparkle', 10);
    if (got.coin) UI.fly('coin', ...F(g.x, g.y), 5); if (got.gem) UI.fly('gem', ...F(g.x, g.y), 4); if (got.rp) UI.fly('rp', ...F(g.x, g.y), 4);
    const k = Object.keys(got)[0]; UI.numPop(...F(g.x, g.y - 40), `+${D.fmt(got[k])} ${({ ...D.CUR, big: '도시락' })[k]}`); save(); };
  g.el = d; layer.ui.append(d); }

/* ── 사람들 ── */
const people = new Set();
const mk = (look, x, y, seed) => {
  if (USE2D && look.cut && !C2.has(look.cut) && C2.has('hiker')) look = { ...look, cut: 'hiker' };
  const p = C.create(USE2D && look.cut && C2.has(look.cut) ? 'cut' : 'person', look, x, y, seed); people.add(p); return p; };
const dishOf = (p, line, menuId) => p.is2d ? IMG((D.MENU.find(m => m.id === menuId) || D.MENU.find(m => m.line === line)).img) : C.dish(KIND[line]);
const drop = p => { if (!p) return; scene.remove(p.root); people.delete(p); };
let hero = null, lad = null;
let tryUntil = 0, decoUntil = 0;
function makeHero() { const at = hero ? [toScreen(hero.root.position)[0], toScreen(hero.root.position)[1]] : D.KITCHEN.stand; drop(hero); hero = mk(S.skin || performance.now() < tryUntil ? C.LOOKS.heroSkin : C.LOOKS.hero, at[0], at[1], 0); hero.face(D.KITCHEN.stand[0] + 30, D.KITCHEN.stand[1] + 90); if (!hero.is2d) { lad = C.ladle(); hero.J.elbR.add(lad); lad.position.set(0, -18, 0); } else hero.face(D.KITCHEN.oven[0], D.KITCHEN.oven[1]); }
const cooks = {};     /* st → { id, p } */
/* 직원 구별 소품 (3D): 솔 = 긴 국자 · 바다 = 거품기 · 별 = 주문 수첩 · 하루 = 귀에 꽂은 연필 */
function prop(p, id) { if (p.is2d || !p.J) return; const M = c => new THREE.MeshToonMaterial({ color: c }); const g = new THREE.Group();
  if (id === 'sol') { const l = C.ladle(); l.scale.setScalar(1.3); g.add(l); p.J.elbR.add(g); g.position.set(0, -16, 2); }
  else if (id === 'bada') { const h = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 16, 8), M(0xB57E52)); h.position.y = -12; g.add(h); const w = new THREE.Mesh(new THREE.TorusGeometry(5, 1, 6, 12), M(0xD8DEE4)); w.position.y = -24; w.scale.set(0.8, 1.4, 0.8); g.add(w); p.J.elbR.add(g); g.position.set(0, -12, 6); }
  else if (id === 'byeol') { const b = new THREE.Mesh(new THREE.BoxGeometry(10, 13, 2), M(0xFFF6E6)); g.add(b); const c = new THREE.Mesh(new THREE.BoxGeometry(10.5, 3, 2.4), M(0xF3A9BA)); c.position.y = 6; g.add(c); p.J.elbL.add(g); g.position.set(0, -24, 8); }
  else if (id === 'haru') { const pc = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 16, 6), M(0xFFD24A)); pc.rotation.z = 1.2; g.add(pc); p.J.head.add(g); g.position.set(-30, 8, 4); }
  p.refreshMeshes && p.refreshMeshes(); }
const servers = {};   /* staff id → { p } */
function syncStaff() {
  for (const st of ['pot', 'drink']) { const id = R.cooks[st], pos = G.stationPos(st); if (cooks[st] && cooks[st].id === id) continue; if (cooks[st]) { drop(cooks[st].p); delete cooks[st]; } if (!id || !pos) continue;
    const look = C.LOOKS[D.STAFF.find(s => s.id === id).look], at = G.cookAt(st); const p = mk(look, ...at, 2 + Object.keys(cooks).length); prop(p, id); p.face(...pos, 0.55); cooks[st] = { id, p, at }; p.play('wave'); }
  for (const sv of R.servers) if (!servers[sv.id]) { const look = C.LOOKS[D.STAFF.find(s => s.id === sv.id).look], home = (() => { const n = Object.keys(servers).length, h = [D.KITCHEN.pick[0] - n * 14, D.KITCHEN.pick[1] + n * 4]; G.walkMap.addAnchor(h); return h; })(); const p = mk(look, ...(sv.pos || home), 5 + Object.keys(servers).length); p.face(360, 900, 0.5); servers[sv.id] = { p, home }; prop(p, sv.id); p.play('wave'); }
}
const guests = new Map();   /* gid → { p, bub, pup, g, gone } */
function worldLen(path) { let L = 0; for (let i = 1; i < path.length; i++) { const a = toWorld(...path[i - 1]), b = toWorld(...path[i]); L += a.distanceTo(b); } return L; }
function walkPath(p, path, dur, then) { { const cur = toScreen(p.root.position); if (path.length && Math.hypot(cur[0] - path[0][0], cur[1] - path[0][1]) > 6) { const L0 = G.walkMap.pathLen(path); path = G.walkMap.route(cur, path[0]).concat(path.slice(1)); dur = dur * G.walkMap.pathLen(path) / Math.max(1, L0); } }   /* 지금 선 곳이 길의 시작이 아니면 길로 먼저 들어감 */
  p.__path = path; p.speed = worldLen(path) / Math.max(0.5, dur) * 1.18; let i = 1; const go = () => { if (i >= path.length) return then && then(); const [x, y] = path[i++]; p.walkTo(x, y, go); }; go(); }
function sitDown(v) { const s = v.g.seat; v.p.root.position.copy(toWorld(s.x, s.y + 2)); v.p.target = null; v.p.then = null; v.p.face(...s.face, 0.35); v.p.play('sit'); v.seated = true; }
const KIND = { bread: 'bagel', soup: 'soup', drink: 'cocoa' };
function bubble(v, menuId) { if (!v.bub) { v.bub = document.createElement('div'); v.bub.className = 'bubble'; layer.ui.append(v.bub); } const m = D.MENU.find(x => x.id === menuId); v.bub.innerHTML = `<img src="${IMG(m.img)}">`; v.bub.style.display = ''; if (!v.bub.isConnected) layer.ui.append(v.bub); }
function pup(v) { const d = document.createElement('img'); d.src = IMG('deco/pup_walk'); d.style.cssText = 'position:absolute;width:30px;transform:translate(-50%,-90%);pointer-events:none;z-index:3'; frame.querySelector('#fx').before(d); v.pup = d; }

/* ── 캠핑장 고양이 '노을' (볕 쬐기 · 가끔 손님에게 다가감 · 쓰다듬기) ── */
let catEl = null; const cat = { x: D.CAT_SPOT[0], y: D.CAT_SPOT[1], st: 'sleep', t: 0, next: 18, tx: 0, ty: 0, back: false };
function makeCat() { catEl = document.createElement('div'); catEl.className = 'catspot'; catEl.innerHTML = `<img src="${IMG('deco/cat_sleep')}" style="width:40px;display:block;transform-origin:50% 100%">`; catEl.style.zIndex = 5;
  catEl.onclick = () => { pressFx(catEl); const r = G.petCat(); burst(cat.x, cat.y - 30, 'heart', r ? 4 : 1); if (r) { sfx('cat'); UI.toast(`노을이가 골골송을 불러요 · ${r.treat ? '간식 1개를 물어 왔어요' : '쉼 포인트 +5'}`, true); cat.st = 'sit'; cat.t = 0; save(); } else { sfx('cat'); UI.toast('노을이가 눈을 가늘게 떠요 · 조금 뒤에 또 쓰다듬어 줘요'); } }; }
function catTick(dt) {
  if (!catEl) return; cat.t += dt; const im = catEl.firstChild;
  if (cat.st === 'sleep') { im.style.transform = `scale(${1 + 0.03 * Math.sin(cat.t * 1.6)}, ${1 - 0.03 * Math.sin(cat.t * 1.6)})`; if (cat.t > cat.next) { cat.st = 'sit'; cat.t = 0; } }
  else if (cat.st === 'sit') { im.style.transform = `rotate(${Math.sin(cat.t * 2) * 3}deg)`; if (cat.t > 4) { const seated = [...guests.values()].filter(v => v.seated && !v.gone); if (!cat.back && seated.length && Math.random() < 0.7) { const v = pick(seated); cat.tx = v.g.seat.x + 22; cat.ty = v.g.seat.y + 6; catGo(); cat.goal = v; } else if (cat.back) { cat.tx = D.CAT_SPOT[0]; cat.ty = D.CAT_SPOT[1]; catGo(); cat.goal = null; } else { cat.st = 'sleep'; cat.t = 0; cat.next = rnd(25, 50); } } }
  else if (cat.st === 'walk') { const wp = cat.path && cat.path[cat.pi] || [cat.tx, cat.ty]; if (Math.hypot(wp[0] - cat.x, wp[1] - cat.y) < 4 && cat.path && cat.pi < cat.path.length - 1) cat.pi++; const nx = (cat.path && cat.path[cat.pi]) || [cat.tx, cat.ty]; const dx = nx[0] - cat.x, dy = nx[1] - cat.y, d = Math.hypot(dx, dy), v = 40 * dt; if (d < 4 && (!cat.path || cat.pi >= cat.path.length - 1)) { cat.st = cat.goal ? 'visit' : 'sleep'; cat.t = 0; cat.back = !!cat.goal; cat.next = rnd(25, 50); if (cat.goal) burst(cat.x - 30, cat.y - 120, 'heart', 2); } else { cat.x += dx / d * Math.min(v, d); cat.y += dy / d * Math.min(v, d); im.style.transform = `scaleX(${dx < 0 ? 1 : -1}) translateY(${-Math.abs(Math.sin(cat.t * 9)) * 3}px)`; } }
  else if (cat.st === 'visit') { im.style.transform = `rotate(${Math.sin(cat.t * 2.4) * 4}deg)`; if (cat.t > 7) { cat.st = 'sit'; cat.t = 4; } }
  const src = IMG(cat.st === 'sleep' ? 'deco/cat_sleep' : cat.st === 'walk' ? 'deco/cat_walk' : 'deco/cat_sit'); if (!im.src.endsWith(src)) im.src = src;
  catEl.style.left = cat.x + 'px'; catEl.style.top = (cat.y - 14 * D.PERSP(cat.y)) + 'px'; im.style.width = Math.round(40 * D.PERSP(cat.y)) + 'px';
}
function catGo() { cat.path = G.walkMap.route([cat.x, cat.y], [cat.tx, cat.ty]); cat.pi = 1; cat.st = 'walk'; }   /* 고양이도 걷는 곳으로만 */

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
    else if (q.k === 'flame') { q.vy -= 60 * dt; q.x += q.vx * dt * 0.5; q.y += q.vy * dt * 0.6; fx.fillStyle = `rgba(255,${150 + Math.round(80 * (1 - k))},70,${1 - k})`; fx.beginPath(); fx.arc(q.x, q.y, q.r * (1.2 - k), 0, TAU); fx.fill(); }
    else if (q.k === 'dust') { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.94; fx.fillStyle = `rgba(232,214,184,${0.7 * (1 - k)})`; fx.beginPath(); fx.arc(q.x, q.y, q.r * (1 + k), 0, TAU); fx.fill(); }
  }
}

/* ── 직접 누르기 화면 (대표 피드백) ── 다 된 음식이 통통 튀며 반짝 → 누르면 '퐁' 손님에게 · 조리 중 연타 = 응원 · 머리 위 하트 팁 · 콤보 */
const dishEls = new Map(), tipEls = new Map(); let lastTap = [360, 900];
const dishSpot = (st, i) => { const b = st === 'oven' ? [D.OVEN_PICK[0] + 6, D.OVEN_PICK[1] - 34] : (() => { const p = G.stationPos(st) || [360, 900]; return [p[0] + (p[0] < 200 ? 62 : -62), p[1] - 46]; })(); return [b[0] + (i % 3) * 22 - (i > 2 ? 11 : 0), b[1] - Math.floor(i / 3) * 18 - (i % 3) * 4]; };
function dishEl(o) { const d = document.createElement('div'); d.className = 'dishrdy'; d.innerHTML = `<img src="${IMG(D.MENU.find(m => m.id === o.menu).img)}" alt=""><i></i>`;
  d.onclick = ev => { ev.stopPropagation(); pressFx(d); const g = G.tapDish(o.st); if (!g) { d.classList.remove('no'); void d.offsetWidth; d.classList.add('no'); return; } lastTap = [parseFloat(d.style.left), parseFloat(d.style.top)]; };
  dishEls.set(o, d); layer.ui.append(d); restack(o.st); sfx('ding'); }
function restack(st) { let i = 0; for (const [o, el] of dishEls) if (o.st === st) { const [x, y] = dishSpot(st, i++); el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.zIndex = 10 + i; } }
function flyFood(from, to, src) { const f = document.createElement('img'); f.src = src; f.className = 'flyfood'; layer.ui.append(f); const mx = (from[0] + to[0]) / 2, my = Math.min(from[1], to[1]) - 120;
  const an = f.animate([{ left: from[0] + 'px', top: from[1] + 'px', transform: 'translate(-50%,-50%) scale(1) rotate(0)' }, { left: mx + 'px', top: my + 'px', transform: 'translate(-50%,-50%) scale(1.35) rotate(-12deg)', offset: 0.5 }, { left: to[0] + 'px', top: to[1] + 'px', transform: 'translate(-50%,-50%) scale(.8) rotate(8deg)' }], { duration: 420, easing: 'cubic-bezier(.3,.6,.4,1)' });
  an.onfinish = () => { f.remove(); burst(to[0], to[1], 'sparkle', 10); }; }
function tipEl(t) { const d = document.createElement('div'); d.className = 'tipb'; d.style.left = t.x + 'px'; d.style.top = t.y + 'px'; d.innerHTML = `<img src="${IMG('deco/heart')}" alt=""><img src="${IMG('deco/coin')}" alt="" class="c">`;
  d.onclick = ev => { ev.stopPropagation(); pressFx(d); const c = G.tapTip(t.id); if (c == null) return; d.remove(); tipEls.delete(t.id); sfx('heart'); burst(t.x, t.y, 'heart', 3); burst(t.x, t.y, 'sparkle', 8); UI.fly('coin', ...F(t.x, t.y), 3); UI.numPop(...F(t.x, t.y - 30), `+${D.fmt(c)}`); lastTap = [t.x, t.y]; };
  tipEls.set(t.id, d); layer.ui.append(d); }
const gaugeEls = {};
function gauge(st, pos, k) { let g = gaugeEls[st]; if (!g || !g.isConnected) { g = gaugeEls[st] = document.createElement('div'); g.className = 'gauge'; g.innerHTML = '<i></i>'; layer.ui.append(g); }
  g.style.left = pos[0] + 'px'; g.style.top = (pos[1] + 12) + 'px'; g.firstChild.style.width = Math.round(k * 100) + '%'; g.classList.toggle('low', k < 0.15); g.style.opacity = 1; clearTimeout(g.tm); g.tm = setTimeout(() => { g.style.opacity = 0; }, 1600); }
function stationTap(st, open) { if (st && R.stations && R.stations[st] && R.stations[st].cur && G.built(st)) { G.tapCook(st); return; } open(); }
function comboFx(n) { document.querySelectorAll('#fly .combo').forEach(x => x.remove()); const d = document.createElement('div'); d.className = 'combo'; d.innerHTML = `콤보 <b>×${n}</b><small>+${Math.min(n - 1, 10) * Math.round(D.TAP.comboK * 100)}%</small>`; const [x, y] = F(...lastTap); d.style.left = x + 'px'; d.style.top = (y - 60) + 'px'; document.getElementById('fly').append(d); setTimeout(() => d.remove(), 1100); sfx('combo', { up: Math.min(n, 8) }); }
/* 누름 손맛: 눌림 0.05초 → 멈춤 0.04초 → 튀어 오름 0.07초 (명세서 13-3) + 진동(설정에서 끄기) */
export function pressFx(el) { if (!el) return; el.animate([{ scale: '1' }, { scale: '0.84', offset: 0.31 }, { scale: '0.84', offset: 0.56 }, { scale: '1.1', offset: 0.85 }, { scale: '1' }], { duration: 160, easing: 'ease-out' }); if (S.vib !== false && navigator.vibrate) try { navigator.vibrate(10); } catch { /* */ } }
/* ── 구름 양 (연타 대상) ── */
let sheepEl = null;
function sheepMake(c) { const d = document.createElement('div'); d.className = 'sheep'; d.innerHTML = `<img src="${IMG('deco/sheep')}" alt=""><i class="cnt"></i>`; d.onclick = ev => { ev.stopPropagation(); pressFx(d); const got = G.tapCloud(); if (got == null) return; lastTap = [parseFloat(d.style.left), parseFloat(d.style.top)]; }; sheepEl = d; layer.ui.append(d); sheepMove(); sfx('chime'); }
function sheepMove() { if (!sheepEl || !R.cloud) return; const [x, y] = G.cloudPos(R.cloud), k = D.PERSP(y); sheepEl.style.left = x + 'px'; sheepEl.style.top = (y + Math.sin(performance.now() / 600) * 8) + 'px'; sheepEl.style.width = Math.round(96 * k) + 'px'; }
/* ── 선물 바구니 든 직원 · 떠돌이 음악가 ── */
let giftP = null, giftBub = null, visP = null, visBub = null;
const GIFT_SPOT = D.GIFT_SPOT;
function giftArrive(b) { const st = D.STAFF.find(x => x.id === b.sv) || D.STAFF[0]; const r = G.walkMap.route(D.KITCHEN.pick, GIFT_SPOT); giftP = mk(C.LOOKS[st.look], ...r[0], 7); walkPath(giftP, r, G.walkMap.pathLen(r) / 70, () => { giftP && giftP.play('wave'); });
  giftBub = document.createElement('div'); giftBub.className = 'bubble big'; giftBub.innerHTML = `<img src="${IMG('deco/gift')}" alt="">`; giftBub.onclick = ev => { ev.stopPropagation(); pressFx(giftBub); UI.giftPop(); }; layer.ui.append(giftBub); sfx('gift'); }
function giftLeave() { if (giftBub) giftBub.remove(); giftBub = null; const p = giftP; giftP = null; if (!p) return; const r = G.walkMap.route(toScreen(p.root.position), D.KITCHEN.pick); walkPath(p, r, G.walkMap.pathLen(r) / 70, () => drop(p)); }
function visArrive(v, path) { visP = mk({ ...C.LOOKS.family, h: D.ADULT_H }, ...path[0], 9); walkPath(visP, path, G.walkMap.pathLen(path) / 60, () => { visP && visP.play('wave'); });
  visBub = document.createElement('div'); visBub.className = 'bubble big star'; visBub.innerHTML = `<img src="${IMG('ui/sparkle')}" alt=""><b>♪</b>`; visBub.onclick = ev => { ev.stopPropagation(); pressFx(visBub); const got = G.tapVisitor(); if (got) { const [x, y] = toScreen(visP ? visP.root.position : toWorld(...D.VISIT_SPOT)); burst(x, y - 60, 'sparkle', 30); UI.fly('coin', ...F(x, y - 50), 10); UI.numPop(...F(x, y - 90), `+${D.fmt(got.coin)}`, true); sfx('level'); UI.toast('떠돌이 음악가가 노래 값을 두고 갔어요 · 수입 1시간치!', true); } }; layer.ui.append(visBub); sfx('chime'); UI.toast('떠돌이 음악가가 캠프에 들렀어요 · 눌러 보세요!', true); }
function visLeave(path) { if (visBub) visBub.remove(); visBub = null; const p = visP; visP = null; if (!p) return; const r = G.walkMap.route(toScreen(p.root.position), D.ENTRY[1]); walkPath(p, r, G.walkMap.pathLen(r) / 60, () => drop(p)); }
function floatersMove() { sheepMove(); for (const [p, b] of [[giftP, giftBub], [visP, visBub]]) if (p && b) { const [x, y] = toScreen(p.root.position), k = D.PERSP(y); b.style.left = x + 'px'; b.style.top = (y - (p.look.h || 60) * k - 34) + 'px'; } }
/* ── sim 이벤트 → 화면 ── */
function onEvent(e) {
  if (e.path) recentPaths.push([e.path, performance.now()]); if (e.path2) recentPaths.push([e.path2, performance.now()]); while (recentPaths.length > 30) recentPaths.shift();
  switch (e.type) {
    case 'spawn': { const g = e.g, p = mk(lookOf(g), ...e.path[0], g.id % 5); const v = { p, g }; guests.set(g.id, v); if (g.dog) pup(v); walkPath(p, e.path, e.dur, () => { if (!v.gone && guests.get(g.id) === v) sitDown(v); }); break; }
    case 'reroute': { const v = guests.get(e.g.id); if (!v) break; const end = e.g.st === 'leave'; v.p.root.position.copy(toWorld(...e.path[0])); walkPath(v.p, e.path, e.dur, () => { if (end) endGuest(e.g.id, v); else if (!v.gone && guests.get(e.g.id) === v) sitDown(v); }); break; }
    case 'order': { const v = guests.get(e.g.id); if (v) { if (!v.seated) sitDown(v); bubble(v, e.m); } break; }
    case 'cook': { const pr = e.st === 'oven' ? hero : cooks[e.st] && cooks[e.st].p; if (pr) { pr.play('stir'); pr.face(...(e.st === 'oven' ? D.KITCHEN.oven : G.stationPos(e.st)), 0.3); } break; }
    case 'cooked': { dishEl(e.o); const pr = e.st === 'oven' ? hero : cooks[e.st] && cooks[e.st].p; if (pr) { pr.play('taste'); const home = pr === hero ? [D.KITCHEN.stand[0] + 30, D.KITCHEN.stand[1] + 90] : null; if (home) pr.face(...home); setTimeout(() => { if (pr.act === 'taste') pr.play('idle'); }, 1400); } const at = e.st === 'oven' ? D.KITCHEN.oven : G.stationPos(e.st); if (at) puff(at[0], at[1] - 50, 4); break; }
    case 'deliver': { const de = dishEls.get(e.o); if (de) { de.remove(); dishEls.delete(e.o); restack(e.o.st); } const s = servers[e.sv]; if (!s) break; const p = s.p, cur = toScreen(p.root.position), line = D.MENU.find(m => m.id === e.o.menu).line;
      const p1 = G.walkMap.route(cur, e.from); walkPath(p, p1, e.dur1, () => { p.hold(dishOf(p, line, e.o.menu)); walkPath(p, e.path2, e.dur2 - 0.5, () => { const v = guests.get(e.o.gid); if (v) p.face(v.g.seat.x, v.g.seat.y); p.play('serve'); }); }); s.to = e.to; break; }
    case 'served': { const s = servers[e.sv]; if (s) { if (s.p.target) { s.p.root.position.copy(toWorld(...s.to)); s.p.target = null; s.p.then = null; } s.p.hold(null); s.p.play('serve'); setTimeout(() => s.p.act === 'serve' && s.p.play('idle'), 700); }
      const v = guests.get(e.g.id); if (v) { if (!v.seated) sitDown(v); if (v.bub) v.bub.style.display = 'none'; v.p.hold(dishOf(v.p, D.MENU.find(m => m.id === e.g.menu).line, e.g.menu)); v.p.play('eat'); sfx('serve'); } break; }
    case 'paid': { const v = guests.get(e.g.id); if (!v) break; v.p.hold(null); v.p.play('happy'); const [x, y] = toScreen(v.p.root.position);
      const hh = (v.p.look.h || 60) * D.PERSP(y); burst(x, y - hh - 10, 'heart', e.g.reg ? 3 : 1); UI.fly('coin', ...F(x, y - hh * 0.6), e.crit ? 7 : 2); UI.numPop(...F(x, y - hh - 24), `${e.crit ? '대박! ' : '+'}${D.fmt(e.c)}`, e.crit); if (e.tap) { lastTap = [x, y - hh - 24]; UI.fly('coin', ...F(x, y - hh * 0.6), 3); if ((R.tapStats.dish || 0) <= 6 || Math.random() < 0.12) setTimeout(() => UI.numPop(...F(x, y - hh - 56), '직접 팔면 2배!'), 120); } if (e.crit) { sfx('crit'); burst(x, y - hh, 'sparkle', 16); } break; }
    case 'leave': { const v = guests.get(e.g.id); if (!v) break; v.gone = true; v.seated = false; if (v.bub) v.bub.remove(); setTimeout(() => { v.p.play('idle'); walkPath(v.p, e.path, e.dur, () => endGuest(e.g.id, v)); }, 900); v.kill = performance.now() + (e.dur + 6) * 1000; break; }
    case 'gift': giftEl(e.gift); sfx('gift'); break;
    case 'tapServe': { const el = dishEls.get(e.o); const from = el ? [parseFloat(el.style.left), parseFloat(el.style.top)] : dishSpot(e.o.st, 0); if (el) { el.remove(); dishEls.delete(e.o); }
      const v = guests.get(e.g.id), to = v ? toScreen(v.p.root.position) : [e.g.seat.x, e.g.seat.y]; flyFood(from, [to[0], to[1] - 60], IMG(D.MENU.find(m => m.id === e.o.menu).img)); sfx('pop'); restack(e.o.st); break; }
    case 'cheer': { const pos = e.st === 'oven' ? D.KITCHEN.oven : G.stationPos(e.st); if (!pos) break; puff(pos[0], pos[1] - 50, 2); if (e.cut > 0.2) burst(pos[0], pos[1] - 40, 'flame', 5);
      UI.numPop(...F(pos[0] + (Math.random() - 0.5) * 50, pos[1] - 80), e.cut > 0.2 ? `-${e.cut.toFixed(1)}초` : '숨 고르는 중'); sfx('cheer', { up: Math.round((1 - e.gauge) * 6) }); gauge(e.st, pos, e.gauge);
      const pr = e.st === 'oven' ? hero : cooks[e.st] && cooks[e.st].p; if (pr && pr.is2d) pr.t = Math.max(0, pr.t - 0.2); break; }
    case 'tip': tipEl(e.tip); break;
    case 'tipGone': { const el = tipEls.get(e.tip.id); if (el) { el.classList.add('out'); setTimeout(() => el.remove(), 400); tipEls.delete(e.tip.id); } break; }
    case 'combo': comboFx(e.n); break;
    case 'cloud': sheepMake(e.c); break;
    case 'cloudTap': { if (!sheepEl) break; const im = sheepEl.firstChild; im.src = IMG('deco/sheep_shake'); clearTimeout(sheepEl.tm); sheepEl.tm = setTimeout(() => { if (sheepEl) sheepEl.firstChild.src = IMG('deco/sheep'); }, 260);
      sheepEl.animate([{ rotate: '0deg' }, { rotate: '-14deg' }, { rotate: '10deg' }, { rotate: '0deg' }], { duration: 260 }); const [x, y] = G.cloudPos(e.c); burst(x, y + 20, 'sparkle', 6); UI.fly('coin', ...F(x, y + 10), 2); UI.numPop(...F(x + (Math.random() - 0.5) * 40, y - 40), `+${D.fmt(e.got)}`); sheepEl.querySelector('.cnt').textContent = `${e.n}/${D.CLOUD.taps}`; sfx('cheer', { up: e.n }); break; }
    case 'cloudGone': { const el = sheepEl; sheepEl = null; if (!el) break; if (e.full) { el.firstChild.src = IMG('deco/sheep_bye'); el.animate([{ translate: '0 0', opacity: 1 }, { translate: '0 -260px', opacity: 0 }], { duration: 1400, easing: 'ease-in', fill: 'forwards' }); UI.toast('구름 양이 신나서 날아갔어요!', true); sfx('reward'); } else el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: 'forwards' }); setTimeout(() => el.remove(), 1500); break; }
    case 'giftBox': giftArrive(e.b); break;
    case 'giftBoxGone': giftLeave(); UI.giftClose(); break;
    case 'visitor': visArrive(e.v, e.path); break;
    case 'visitorGone': visLeave(e.path); break;
    case 'build': { render(); const p = D.PADS.find(x => x.id === e.pid); const im = facEl[e.pid]; if (im) im.classList.add('pop'); dust(p.pos[0], p.pos[1] + 20); burst(p.pos[0], p.pos[1] - 40, 'sparkle', 18); sfx('build'); syncStaff(); break; }
    case 'upgrade': { const t = e.target, pos = t === 'oven' ? D.KITCHEN.oven : D.PADS.find(x => x.id === t).pos; if (e.tier) { render(); burst(pos[0], pos[1] - 40, 'sparkle', 26); dust(pos[0], pos[1]); sfx('tier'); } else { const im = facEl[t]; if (im) { im.classList.remove('bump'); void im.offsetWidth; im.classList.add('bump'); } burst(pos[0], pos[1] - 50, 'sparkle', 6); } break; }
    case 'workDone': case 'zoneOpen': case 'amen': case 'hire': case 'menuNew': case 'box': { if (e.type === 'zoneOpen') { const f = layer.ui.querySelector(`.fog[data-z="${e.z}"]`); if (f) { f.classList.add('lifting'); setTimeout(render, 1500); } else render(); } else render(); if (e.type === 'hire') syncStaff(); if (e.type === 'amen') { const at = D.AMEN[e.id].at === 'kitchen' ? D.KITCHEN.pos : D.WELCOME.pos; burst(at[0], at[1], 'sparkle', 16); } break; }
    case 'zoneWork': render(); break;
    case 'levelup': hero && hero.play('wave'); break;
  }
  UI.onEvent(e);
}
function endGuest(id, v) { if (guests.get(id) !== v) return; drop(v.p); if (v.pup) v.pup.remove(); if (v.bub) v.bub.remove(); guests.delete(id); }

/* ── 건물이 사람을 가림 (배경을 건물 모양대로 잘라 3D 장면 속 판으로 · 바닥선보다 뒤에 선 사람만 가려짐) ── */
function makeOccluders() {
  const img = document.getElementById('bg'); if (!img.complete || !img.naturalWidth) { img.addEventListener('load', makeOccluders, { once: true }); return; }
  const kx = img.naturalWidth / 878, ky = img.naturalHeight / 1560;   /* 판 좌표 → 원본 그림 (배경은 left -79 · 878×1560 으로 깔림) */
  for (const o of D.OCCLUDE) {
    const xs = o.poly.map(p => p[0]), ys = o.poly.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), w = x1 - x0, h = y1 - y0, R = 2;
    const c = document.createElement('canvas'); c.width = w * R; c.height = h * R; const x = c.getContext('2d'); x.scale(R, R); x.beginPath(); o.poly.forEach(([px, py], i) => i ? x.lineTo(px - x0, py - y0) : x.moveTo(px - x0, py - y0)); x.closePath(); x.clip();
    x.drawImage(img, (x0 + 79) * kx, y0 * ky, w * kx, h * ky, 0, 0, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const g = new THREE.PlaneGeometry(w, h); g.translate(0, o.base - (y0 + y1) / 2, 0);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.5, depthTest: false, depthWrite: false }));   /* 불투명 목록에서 사람과 같이 순서를 정함 */
    const grp = new THREE.Group(); grp.position.copy(toWorld((x0 + x1) / 2, o.base)); grp.rotation.x = -EL; grp.add(m); m.renderOrder = Math.round((o.base + 220) * 10) + 5; scene.add(grp);
  }
}
/* ── 걷는 곳 검사 (매 프레임: 모든 사람 발이 걷는 영역 안인가) · ?debug=walk 오버레이 ── */
/* 길 위에서 마주치면 살짝 비켜 감 (옆으로 5px · 부드럽게) */
function sidestep() { const ws = [...people].filter(p => p.act === 'walk' && p.target); for (const p of ws) { let want = 0; const P = p.root.position;
    for (const q of ws) { if (q === p) continue; const Q = q.root.position, d = Math.hypot(P.x - Q.x, (P.z - Q.z) * Math.sin(EL)); if (d < 20) { const t = p.target, dx = t.x - P.x, dz = (t.z - P.z) * Math.sin(EL), L = Math.hypot(dx, dz) || 1; const side = ((Q.x - P.x) * -dz + (Q.z - P.z) * Math.sin(EL) * dx) / L; want = side > 0 ? -5 : 5; break; } }
    const cur = p.side || 0, nx = cur + (want - cur) * 0.15; if (Math.abs(nx - cur) > 0.01 && p.target) { const t = p.target, dx = t.x - P.x, dz = (t.z - P.z) * Math.sin(EL), L = Math.hypot(dx, dz) || 1, d = nx - cur; P.x += -dz / L * d; P.z += dx / L * d / Math.sin(EL); } p.side = nx; } }
const walkStat = { frames: 0, checks: 0, bad: 0, samples: [] }; const recentPaths = [];
function walkCheck() { walkStat.frames++; for (const p of people) { const [x, y] = toScreen(p.root.position); if (y > 1640) continue; walkStat.checks++; const WK = G.walkMap; if (!(WK.walkable(x, y) && (WK.pathDist(x, y) <= 14 || WK.branchDist(x, y) <= 14))) { walkStat.bad++; if (walkStat.samples.length < 10) walkStat.samples.push([Math.round(x), Math.round(y), p.look.cut || p.look.name, p.act, JSON.stringify((p.__path || []).map(q => q.map(Math.round))), p.target ? toScreen(p.target).map(Math.round) : null]); } } }
let dbg = null;
function drawDebug() {
  if (!dbg) { dbg = document.createElement('canvas'); dbg.width = 720; dbg.height = 1560; dbg.style.cssText = 'position:absolute;left:0;top:0;width:720px;height:1560px;z-index:8;pointer-events:none'; board.append(dbg); }
  const x = dbg.getContext('2d'), WK = G.walkMap, C8 = WK.G.CELL, grid = WK.G.grid(); x.clearRect(0, 0, 720, 1560);
  for (let gy = 0; gy < WK.G.GH; gy++) for (let gx = 0; gx < WK.G.GW; gx++) { x.fillStyle = grid[gy * WK.G.GW + gx] ? 'rgba(80,200,120,.22)' : 'rgba(220,60,60,.10)'; x.fillRect(gx * C8, gy * C8, C8, C8); }
  x.lineWidth = 2; for (const o of D.OCCLUDE) { x.strokeStyle = '#7A4AE0'; x.beginPath(); o.poly.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.stroke(); x.setLineDash([6, 4]); x.beginPath(); x.moveTo(0, o.base); x.lineTo(720, o.base); x.stroke(); x.setLineDash([]); }
  { const g = G.walkMap.G.graph(); if (g) { x.strokeStyle = 'rgba(255,140,0,.9)'; x.lineWidth = 3; for (const [a, b] of G.walkMap.activeEdges()) { x.beginPath(); x.moveTo(...g.nodes[a]); x.lineTo(...g.nodes[b]); x.stroke(); } for (const [, n] of Object.entries(g.nodes)) { x.fillStyle = '#FF8C00'; x.beginPath(); x.arc(n[0], n[1], 4, 0, Math.PI * 2); x.fill(); } x.strokeStyle = 'rgba(255,60,160,.8)'; x.lineWidth = 2; for (const [a, b] of G.walkMap.branchList()) { x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.stroke(); } } }
  for (const [p, t] of recentPaths) { x.strokeStyle = `rgba(30,90,220,${Math.max(0.15, 1 - (performance.now() - t) / 12000)})`; x.beginPath(); p.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.stroke(); }
  const dot = (p, c, r = 5) => { if (!p) return; x.fillStyle = c; x.beginPath(); x.arc(p[0], p[1], r, 0, Math.PI * 2); x.fill(); };
  for (const s of R.seats) { dot([s.x, s.y], '#2E6AD0'); dot(G.serveAt(s), '#F08A2A', 4); }
  for (const st of ['oven', 'pot', 'drink']) if (G.built(st)) { dot(G.cookAt(st), '#B040C0', 6); dot(G.pickAt(st), '#E0C020', 5); }
  dot(D.KITCHEN.pick, '#20A0A0', 6); dot(D.CAT_SPOT, '#FF6090', 6); dot(D.ENTRY[1], '#000', 6);
  for (const p of people) { const [a, b] = toScreen(p.root.position); x.strokeStyle = G.walkMap.walkable(a, b) ? '#0A0' : '#F00'; x.lineWidth = 3; x.beginPath(); x.arc(a, b, 7, 0, Math.PI * 2); x.stroke(); }
  x.fillStyle = '#000a'; x.fillRect(10, 1500, 520, 40); x.fillStyle = '#fff'; x.font = '16px monospace'; x.fillText(`walk frames ${walkStat.frames} checks ${walkStat.checks} bad ${walkStat.bad}`, 18, 1526);
}
/* ── 저장 (기기 · 원어데이 SAVES 'camp_v1') ── */
let saveAt = 0;
export function save() { try { S.lastSeen = S.t; localStorage.setItem(D.GAME.save, JSON.stringify(G.save())); } catch { /* */ } saveAt = 0; }
addEventListener('pagehide', save); document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

/* ── 초상화 (3D 캐릭터를 한 번 그려 그림으로) ── */
const portraits = {};
let pr = null;
/* 전신 그림 (상품 카드 · 입어 보기 미리보기) */
const bodies = {}; let prB = null;
function fullBody(cut) {
  if (bodies[cut]) return bodies[cut]; if (!USE2D) return bodies[cut] = body3d(cut === 'chef_skin' ? 'heroSkin' : 'hero'); if (!C2.has(cut)) return IMG('deco/gift');
  try { if (!prB) { prB = { r: new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }), s: new THREE.Scene() }; prB.r.setSize(240, 300); prB.r.setClearColor(0, 0); prB.c = new THREE.OrthographicCamera(-80, 80, 190, -10, -500, 500); prB.c.position.set(0, 0, 300); prB.c.lookAt(0, 0, 0); }
    const c = new C2.Cut(cut, { h: 170, scene: prB.s }, W / 2, H / 2, 1); c.root.position.set(0, 0, 0); c.update(0.016, 0.5); c.root.scale.setScalar(1); c.bb.rotation.x = 0; c.play('wave'); c.t = 0.8; c.update(0.016, 0.5); c.root.scale.setScalar(1);
    prB.r.render(prB.s, prB.c); bodies[cut] = prB.r.domElement.toDataURL(); prB.s.remove(c.root); } catch { bodies[cut] = IMG('deco/gift'); }
  return bodies[cut];
}
function body3d(key) {   /* 3D 몸 전신 카드 (상품 · 입어 보기) */
  try { const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(240, 300); r.setClearColor(0, 0); const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xFFF4E2, 0xC8B0D0, 1.25)); sc.add(new THREE.AmbientLight(0xE8D4E6, 0.55)); const l = new THREE.DirectionalLight(0xFFEFD2, 1.2); l.position.set(0.7, 1, 0.8); sc.add(l);
    const keep = C.sceneRef.scene; C.sceneRef.scene = sc; const p = C.create('person', { ...C.LOOKS[key], h: 165 }, W / 2, H / 2, 1); C.sceneRef.scene = keep; p.root.position.set(0, 0, 0); p.play('wave'); p.t = 0.8; p.update(0.016, 0.5); p.root.scale.setScalar(1); p.root.rotation.y = 0.35;
    const c = new THREE.OrthographicCamera(-90, 90, 200, -25, -500, 500); c.position.set(0, 60, 300); c.lookAt(0, 60, 0); r.render(sc, c); const url = r.domElement.toDataURL(); r.dispose(); return url; } catch { return IMG('deco/gift'); } }
function portrait(key) {
  if (portraits[key]) return portraits[key];
  const lk = C.LOOKS[key]; if (USE2D && lk && lk.cut && C2.has(lk.cut)) return portraits[key] = C2.headUrl(lk.cut);
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
if (S.audio) setAudio(S.audio); else if (S.muted) setAudio({ sfx: false, bgm: false });
setBoot(0.4);
const ctx = { portrait, save, render, fullBody, pressFx: el => pressFx(el), reskin: () => makeHero(), padPos: id => { if (id === 'ovenBody') return F(D.KITCHEN.oven[0] - 20, D.KITCHEN.oven[1] - 30); if (id === 'dish') { const el = [...dishEls.values()][0]; return el ? F(parseFloat(el.style.left), parseFloat(el.style.top)) : null; } const p = id === 'oven' ? D.P(772, 945) : (D.PADS.find(x => x.id === id) || {}).pos; return p && F(...p); },
  tryOn: sec => { tryUntil = performance.now() + sec * 1000; makeHero(); UI.closeSheet(); setTimeout(() => { if (performance.now() >= tryUntil - 50) { makeHero(); if (!S.skin) UI.toast('입어 보기가 끝났어요 · 마음에 들면 매점에서 만나요'); } }, sec * 1000); },
  previewDeco: sec => { decoUntil = performance.now() + sec * 1000; render(); UI.closeSheet(); burst(...D.SET_POS, 'sparkle', 24); setTimeout(() => { render(); if (!S.shop.deco) UI.toast('미리 보기가 끝났어요'); }, sec * 1000); },
  fx: (k, t) => { const pos = t === 'oven' ? D.KITCHEN.oven : (D.PADS.find(p => p.id === t) || {}).pos; if (pos) burst(pos[0], pos[1] - 40, 'sparkle', 8); } };
UI.init(ctx);
/* 첫 화면에 필요한 몸만 먼저 (4G 3초) · 나머지는 뒤에서 불러옴 — 아직 안 온 손님 몸은 온 것으로 잠깐 대신 */
const FIRST = ['chef', 'helper', 'hiker'];
await Promise.all(FIRST.map(n => C2.preload(n).catch(() => null)));
setTimeout(() => { for (const n of new Set(Object.values(C.LOOKS).map(l => l.cut).filter(Boolean))) C2.preload(n).catch(() => null); }, 1200);
setBoot(0.6);
makeHero(); syncStaff(); makeCat(); render(); makeOccluders();
/* 첫 30초 (퀄리티 A2): 새 판이면 첫 손님이 이미 데크에서 먹는 중 → 3초 안에 첫 코인 · 다음 손님은 1.2초 뒤 */
if (!G.quickStart()) R.nextSpawn = 0.3;
setBoot(0.7);
bm.hello().then(h => {
  if (h.ok) { const items = h.items || []; if (items.includes('deco')) S.shop.deco = true; if (items.includes('skin') && !S.skin) { S.skin = true; makeHero(); } S.owner = !!h.owned; render(); }
});
installBack({ back: () => false });
bm.hello().then(() => { if (offlineRes) UI.offlinePop(offlineRes); });   /* 광고 2배 버튼은 원어데이 응답 뒤에 */
if (G.attendReady() && S.t - S.created > 600) setTimeout(() => UI.attendPop(), 600);   /* 처음 온 날은 캠프부터 보여 줌 (출석은 옆 버튼 빨간 점) */
music(true);
if (Q.get('lineup') === '1') {   /* 캐릭터 한 줄 보기 (확인용) */
  await Promise.all(Object.values(C.LOOKS).map(l => l.cut && C2.preload(l.cut)));
  const ks = ['hero', 'helper', 'cook1', 'cook2', 'helper2', 'hiker', 'grandma', 'kid', 'couple', 'family', 'yunseul', 'bomi', 'dodam', 'heroSkin'], acts = ['idle', 'walk', 'stir', 'wave', 'serve', 'happy', 'eat'];
  ks.forEach((k, i) => { const x = 70 + (i % 7) * 96, y = 1180 + Math.floor(i / 7) * 190; const p = mk(C.LOOKS[k], x, y, i); p.play(acts[i % acts.length]); p.walkPh = 0; if (i % 3 === 1) p.hold(p.is2d ? IMG('food/bagel') : C.dish('bagel')); if (acts[i % acts.length] === 'walk') p.update = (u => function (dt, n) { this.walkPh += dt * 7; this.target = null; this.act = 'walk'; return u.call(this, dt, n); })(p.update); });
}
if (Q.get('demo') === 'behind') {   /* 확인용: 건물 뒤를 지나는 손님 (가려짐 확인) */
  for (const z of ['forest', 'pine']) S.zones[z] = { st: 'open' }; G.syncWalk(); render();
  const loop = (look, a, b) => { const p = mk(C.LOOKS[look], ...a, 3); const go = (x, y) => { const r = G.walkMap.route(toScreen(p.root.position), [x, y]); walkPath(p, r, G.walkMap.pathLen(r) / 55, () => go(...(x === a[0] ? b : a))); }; go(...b); };
  loop('hiker', D.P(120, 760), D.P(470, 620)); loop('couple', D.P(560, 700), D.P(830, 700)); loop('grandma', D.P(300, 690), D.P(130, 750));
}
window.__camp = { G, D, S, R, UI, render, save, people, guests, burst, walkStat, pressFx };

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
  sidestep(); walkCheck(); floatersMove();
  for (const [id, v] of guests) { const [x, y] = toScreen(v.p.root.position); if (v.bub && v.bub.style.display !== 'none') { const k = D.PERSP(y), hh = (v.p.look.h || 60) * k; v.bub.style.left = x + 'px'; v.bub.style.top = (y - hh - 26) + 'px'; v.bub.style.scale = (0.5 * k).toFixed(2); } if (v.pup) { const k = D.PERSP(y); v.pup.src = IMG(v.seated ? 'deco/pup_sit' : 'deco/pup_walk'); v.pup.style.width = Math.round(30 * k) + 'px'; v.pup.style.left = (x + 22 * k) + 'px'; v.pup.style.top = (y + 4) + 'px'; } if (v.kill && performance.now() > v.kill) endGuest(id, v); }
  for (const [, s] of Object.entries(servers)) if (!s.p.target && s.p.act === 'idle' && !R.servers.find(x => servers[x.id] === s)?.job && Math.random() < rdt * 0.08) { const h = s.home; s.p.speed = 40; const cur = toScreen(s.p.root.position), dst = [h[0] + rnd(-8, 8), h[1] + rnd(-3, 3)]; G.walkMap.addAnchor(dst); walkPath(s.p, G.walkMap.route(cur, dst), G.walkMap.pathLen(G.walkMap.route(cur, dst)) / 40 + 0.3, () => s.p.face(360, 1000, 0.5)); }
  if (hero.act === 'idle' && Math.random() < rdt * 0.05) { hero.play('wave'); setTimeout(() => hero.act === 'wave' && hero.play('idle'), 1600); }
  renderer.render(scene, cam); draw2d(Math.min(0.05, rdt), t / 1000); catTick(Math.min(0.05, rdt)); UI.tick(Math.min(0.1, rdt));
  if ((acc += rdt) > 0.5) { acc = 0; for (const [o, el] of dishEls) if (!R.ready.includes(o)) { el.remove(); dishEls.delete(o); restack(o.st); } layer.ui.querySelectorAll('.lvtag').forEach(updTag); layer.ui.querySelectorAll('.pad').forEach(p => p.classList.toggle('cant', S.coin < G.padCost())); const zt = layer.ui.querySelectorAll('.fog .zt'); zt.forEach(z => { const id = z.closest('.fog').dataset.z, o = S.zones[id]; if (o.st === 'building') z.textContent = UI.clock(o.end - S.t); });
    if (Q.get('debug') === 'walk') drawDebug();
    if (Q.get('fps') === '1') { let el = document.getElementById('fpsx'); if (!el) { el = document.createElement('div'); el.id = 'fpsx'; el.style.cssText = 'position:absolute;left:8px;bottom:4px;z-index:99;font:12px monospace;color:#5E4A42'; frame.append(el); } el.textContent = JSON.stringify(window.__stats()); } }
  if ((saveAt += rdt) > 10) save();
  requestAnimationFrame(loop);
}
window.__loadMs = Math.round(performance.now());
setBoot(1); setTimeout(() => { const b = document.getElementById('boot'); b.classList.add('gone'); setTimeout(() => b.remove(), 900);
  board.classList.add('intro'); frame.classList.add('intro'); setTimeout(() => { board.classList.remove('intro'); frame.classList.remove('intro'); }, 2000);   /* 시작 연출 1.5초 */
  setTimeout(() => { hero.play('wave'); setTimeout(() => hero.act === 'wave' && hero.play('idle'), 1700); }, 1500); }, 150);
requestAnimationFrame(loop);
