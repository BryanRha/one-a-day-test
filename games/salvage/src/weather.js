// 공통 판 상태 5 — 판 안 (M4-B · v0.7): 숫자 · 예보 · 바닥 계획은 data/weather.js, 여기선 그림 · 몸 상태(체온 · 독) · 판 상태 띠 · 맵 장비
//  · 밤: 가리개가 어두워짐(raid.night) · 빛 속의 나는 멀리서 보임 — 고성능 헤드램프 = 시야 +25% · 가리개 옅게
//  · 폭풍: 비 · 번개 · 소리 묻힘(지도 상태 숫자에 곱함) — 어느 지도든 같은 규칙
//  · 안개: 시야 0.7 · 안개 가까이 — 헤드램프가 덜어 줌
//  · 한파: 얼음 판(미끄러짐 = 가속 · 감속이 느려짐) · 체온 게이지(물속은 더 빨리 · 불 · 조명탄 · 온열 배관 곁에서 오름) → 35 아래 느려짐 · 0 이면 더 느리고 아픔 — 방한 잠수복 = 1/3 · 덜 미끄러짐
//  · 독수: 초록 독 웅덩이 → 독 게이지(쌓이면 초마다 아픔 · 아주 천천히 빠짐) → 연고 · 붕대 · 해독제 · 소독 샤워로 씻음 — 해독 필터 = 1/3 · 빨리 빠짐
//  모든 큰 피해 예고 규칙: 판 상태 피해는 게이지가 먼저 보이고(30 · 55 경고), 작은 피해만 천천히 (hurtRaw · 한 번에 3 이하)
import * as THREE from 'three';
import { WEATHER, WX_OF, COLD, TOXIC, LAMP_GEAR, wxPlan } from './data/weather.js?v=0.99.20';
import { ITEMS } from './data.js?v=0.99.20';
import { sfx } from './audio.js?v=0.99.20';
import { glowSprite } from './enemy3d.js?v=0.99.20';
import { flarePools } from './arms.js?v=0.99.20';

const tv = new THREE.Vector3(), tm = new THREE.Matrix4(), tq = new THREE.Quaternion(), ts = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
let ICE_T = null, TOX_T = null;
function iceTex() {
  if (ICE_T) return ICE_T; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  let s = 5; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  x.fillStyle = 'rgba(205,240,255,0.72)'; x.fillRect(0, 0, 128, 128); const g = x.createLinearGradient(0, 0, 128, 128); g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.25)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 1.2; for (let i = 0; i < 14; i++) { let px = r() * 128, py = r() * 128; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (r() - 0.5) * 40; py += (r() - 0.5) * 40; x.lineTo(px, py); } x.stroke(); }
  x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(0,0,0,1)'; x.fillRect(i === 0 ? 0 : i === 1 ? 124 : 0, i === 2 ? 0 : i === 3 ? 124 : 0, i < 2 ? 4 : 128, i < 2 ? 128 : 4); }
  ICE_T = new THREE.CanvasTexture(c); ICE_T.colorSpace = THREE.SRGBColorSpace; return ICE_T;
}
function toxTex() {
  if (TOX_T) return TOX_T; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  let s = 9; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const g = x.createRadialGradient(64, 64, 6, 64, 64, 62); g.addColorStop(0, 'rgba(150,255,80,0.85)'); g.addColorStop(0.6, 'rgba(90,200,40,0.7)'); g.addColorStop(0.85, 'rgba(60,120,30,0.45)'); g.addColorStop(1, 'rgba(40,80,20,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 44, rr = 2 + r() * 5; x.strokeStyle = 'rgba(230,255,200,0.75)'; x.lineWidth = 1.5; x.beginPath(); x.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, rr, 0, 7); x.stroke(); }
  TOX_T = new THREE.CanvasTexture(c); TOX_T.colorSpace = THREE.SRGBColorSpace; return TOX_T;
}

/* 판 시작 (raid.start 끝 쪽) — 판 상태가 없으면 아무것도 안 함 */
export function wxStart(R) {
  const wx = R.wx, W = WEATHER[wx]; const L = R.L; const mg = L.mgear || null;
  R.wxVis = (mg === 'hlamp' && (wx === 'night' || wx === 'fog' || R.night > 0.5)) ? LAMP_GEAR.vision : 1; R.wxDark = mg === 'hlamp' ? LAMP_GEAR.dark : 1;
  if (R.T?.abyss) abyssFx(R); /* M6-A 깊은 물 판 화면 층 */
  if (!W) return;
  /* 판 상태 띠 (지도 상태 띠 다음 · 지도 상태가 곧 날씨면 그것으로 끝) */
  /* (M6-A: 3초 뒤 같은 말 띠는 뺌 — 날씨 띠 하나가 위쪽 한 줄 대기열에서 나옴 · 지도 상태가 곧 날씨면 판 상태 띠가 그 말) */
  wxFx(R, wx, W, mg); /* v0.7.1 검수 M4 Top 4: 판 시작 날씨 카드 + 판 내내 보이는 화면 층 */
  const P = R.P, plan = wxPlan(P, wx, R.opt.seed); const S = R.WX = { wx, plan, temp: COLD.max, poison: 0, hurtT: 0, breathT: 1, told: {}, hud: null, suit: mg === 'drysuit', filter: mg === 'filter' };
  const own = m => { R.ownMats.push(m); return m; };
  if (wx === 'cold') {
    if (plan.ice.length) { const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); const m = own(new THREE.MeshLambertMaterial({ map: iceTex(), transparent: true, opacity: 0.95, depthWrite: false, emissive: 0x3a6a80, polygonOffset: true, polygonOffsetFactor: -3 }));
      const im = new THREE.InstancedMesh(g, m, plan.ice.length); plan.ice.forEach((c, i) => im.setMatrixAt(i, tm.compose(tv.set((c.x0 + c.x1) / 2, 0.075, (c.z0 + c.z1) / 2), tq.setFromAxisAngle(up, 0), ts.set(c.x1 - c.x0, 1, c.z1 - c.z0)))); im.renderOrder = 1; im.receiveShadow = true; im.userData.own = true; /* M6-D 누수: 그림 재질(map)이라 raid.dispose 가 공유 기하로 보고 안 버렸음 → 한파 판마다 기하 1 늘던 것 */ R.root.add(im); }
    /* 온열 배관: 바닥 주황 창살 + 김 + 빛 */
    for (const h of plan.heat) { const g = new THREE.Group(); g.position.set(h.x, 0, h.z);
      const grate = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.12, 14), own(new THREE.MeshLambertMaterial({ color: 0x3a2a24, flatShading: true }))); grate.position.y = 0.1; g.add(grate);
      const hot = new THREE.Mesh(new THREE.CircleGeometry(0.62, 16).rotateX(-Math.PI / 2), own(new THREE.MeshBasicMaterial({ color: 0xff8a3a }))); hot.position.y = 0.17; g.add(hot);
      for (let k = -1; k <= 1; k++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.08), own(new THREE.MeshLambertMaterial({ color: 0x5a4a40 }))); bar.position.set(0, 0.19, k * 0.3); g.add(bar); }
      const hg = glowSprite(0xffa050, 0.55, 3.2); hg.position.y = 0.6; g.add(hg); R.ownMats.push(hg.material);
      g.traverse(o => { if (o.isMesh) o.userData.own = true; }); R.root.add(g); }
  }
  if (wx === 'toxic') {
    if (plan.pools.length) { const g = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2); const m = own(new THREE.MeshBasicMaterial({ map: toxTex(), transparent: true, depthWrite: false }));
      const im = new THREE.InstancedMesh(g, m, plan.pools.length); plan.pools.forEach((p, i) => im.setMatrixAt(i, tm.compose(tv.set(p.x, 0.1, p.z), tq.setFromAxisAngle(up, i * 1.3), ts.set(p.r, 1, p.r)))); im.renderOrder = 2; im.userData.own = true; /* M6-D 누수 (위와 같음 · 독수) */ R.root.add(im); S.poolIM = im; }
    for (const sh of plan.showers) { const g = new THREE.Group(); g.position.set(sh.x, 0, sh.z);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 6), own(new THREE.MeshLambertMaterial({ color: 0xb8c4c4 }))); pole.position.y = 1.4; g.add(pole);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.2, 0.18, 12), own(new THREE.MeshLambertMaterial({ color: 0xe0b23a }))); head.position.y = 2.8; g.add(head);
      const pad = new THREE.Mesh(new THREE.CircleGeometry(1.1, 18).rotateX(-Math.PI / 2), own(new THREE.MeshBasicMaterial({ color: 0x9ff0ff, transparent: true, opacity: 0.35, depthWrite: false }))); pad.position.y = 0.12; g.add(pad);
      g.traverse(o => { if (o.isMesh) o.userData.own = true; }); R.root.add(g); }
  }
  if (wx === 'cold' || wx === 'toxic') R.mods.push({ name: 'wx', pre: dt => wxPre(R, dt), player: dt => wxPlayer(R, dt), tick: dt => wxTick(R, dt), healed: k => wxHealed(R, k), dispose: () => { S.hud?.remove(); S.hud = null; } });
}
/* v0.7.1 검수 M4 Top 4 — 날씨가 첫눈에 갈리게
 *  · 판 시작 2초 '날씨 카드'(큰 아이콘 + 판 상태 띠와 같은 말투 한 줄)
 *  · 판 내내 보이는 화면 층(DOM · CSS 만 — WebGL 그리기 0): 한파 = 서리 비네트 · 반짝임 / 독수 = 옅은 녹색 안개 틴트 · 떠다니는 거품 / 안개 = 흐르는 안개 띠 2층 · 가장자리 흐림 / 밤 · 폭풍은 원래 화면이 이미 다름(카드만)
 *  · 체온 · 독 게이지는 원래대로 판 시작부터 늘 보임(wxTick) */
let FROST_URL = null;
function frostUrl() {
  if (FROST_URL) return FROST_URL; const c = document.createElement('canvas'); c.width = 256; c.height = 512; const x = c.getContext('2d');
  let s = 11; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const g = x.createRadialGradient(128, 256, 120, 128, 256, 300); g.addColorStop(0, 'rgba(220,240,255,0)'); g.addColorStop(0.55, 'rgba(210,236,255,0.18)'); g.addColorStop(1, 'rgba(235,248,255,0.62)'); x.fillStyle = g; x.fillRect(0, 0, 256, 512);
  x.lineCap = 'round';
  for (let i = 0; i < 70; i++) { /* 가장자리에서 안쪽으로 자라는 서리 가지 */
    const side = i % 4; let px = side === 0 ? 0 : side === 1 ? 256 : r() * 256, py = side === 2 ? 0 : side === 3 ? 512 : r() * 512; const len = 18 + r() * 46;
    const ang = side === 0 ? (r() - 0.5) * 1.6 : side === 1 ? Math.PI + (r() - 0.5) * 1.6 : side === 2 ? Math.PI / 2 + (r() - 0.5) * 1.6 : -Math.PI / 2 + (r() - 0.5) * 1.6;
    x.strokeStyle = `rgba(245,252,255,${0.35 + r() * 0.4})`; x.lineWidth = 0.8 + r() * 1.4; x.beginPath(); x.moveTo(px, py); const ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len; x.lineTo(ex, ey); x.stroke();
    for (let k = 1; k < 4; k++) { const t = k / 4, bx = px + (ex - px) * t, by = py + (ey - py) * t, bl = len * (0.35 - t * 0.06); for (const sg of [-1, 1]) { const a2 = ang + sg * 0.7; x.lineWidth *= 0.8; x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + Math.cos(a2) * bl, by + Math.sin(a2) * bl); x.stroke(); } }
  }
  return FROST_URL = c.toDataURL('image/png');
}
function wxFx(R, wx, W, mg) {
  let layer = null, card = null; const soft = W.gear && mg === W.gear;
  const mk = host => {
    if (wx === 'cold' || wx === 'toxic' || wx === 'fog') {
      layer = document.createElement('div'); layer.className = `wxfx wx-${wx}${soft ? ' soft' : ''}`;
      if (wx === 'cold') { layer.style.backgroundImage = `url(${frostUrl()})`; layer.innerHTML = '<i class="glint"></i><i class="glint g2"></i><i class="glint g3"></i>'; }
      else if (wx === 'toxic') layer.innerHTML = Array.from({ length: 9 }, (_, i) => `<b style="left:${6 + i * 11}%;animation-delay:${-(i * 1.37) % 6}s;animation-duration:${5 + (i * 7) % 4}s;--s:${0.6 + ((i * 5) % 7) / 8}"></b>`).join('');
      else layer.innerHTML = '<i class="band b1"></i><i class="band b2"></i>';
      host.prepend(layer);
    }
    /* M6-A 알림 한 줄: 가운데 큰 카드(첫 교전 적을 가림) → 위쪽 한 줄 대기열(ui.top · 무전 다음 · 판 상태 띠 앞)에 작은 띠로 */
    card = true; const evt = () => document.getElementById('evt');
    if (!WX_OF[R.cond]) R.ui?.top?.push({ prio: 1.5, key: 'wx:' + wx, dur: 2.8, show: () => { const e = evt(); if (!e) return; e.innerHTML = `<i class="wxi">${W.icon}</i><b>${W.name}</b> · ${W.band}${soft ? ' — 장비 덕에 덜해요' : ''}`; e.className = `evt show wxband wx-${wx}`; }, hide: () => evt()?.classList.remove('show') });
  };
  R.mods.push({ name: 'wxfx', tick: () => { if (card) { if (layer && !layer.isConnected) document.querySelector('.raidui')?.prepend(layer); return; } const host = document.querySelector('.raidui'); if (host) mk(host); },
    dispose: () => { layer?.remove(); layer = null; } });
}
/* M6-A 깊은 물 판: 가장자리 보라 비네트 + 떠오르는 어두운 입자 (날씨 층과 같은 방식 · 판 내내) */
function abyssFx(R) {
  let layer = null;
  R.mods.push({ name: 'abyssfx', tick: () => { if (layer?.isConnected) return; const host = document.querySelector('.raidui'); if (!host) return;
    layer ||= Object.assign(document.createElement('div'), { className: 'wxfx abyssfx', innerHTML: Array.from({ length: 10 }, (_, i) => `<b style="left:${3 + i * 10}%;animation-delay:${-(i * 1.13) % 9}s;animation-duration:${7 + (i * 3) % 5}s;--s:${0.6 + ((i * 7) % 6) / 7}"></b>`).join('') });
    host.prepend(layer); }, dispose: () => { layer?.remove(); layer = null; } });
}
const inRect = (p, c) => p.x > c.x0 && p.x < c.x1 && p.z > c.z0 && p.z < c.z1;
/* 움직임 전: 얼음 = 미끄러짐 · 체온 낮음 = 느려짐 */
function wxPre(R, dt) {
  const S = R.WX, pl = R.pl; if (!S) return;
  if (S.wx === 'cold') {
    pl.onIce = S.plan.ice.some(c => inRect(pl.pos, c)); if (pl.onIce) { pl.grip *= S.suit ? COLD.suit.grip : COLD.grip; if (!S.told.ice) { S.told.ice = 1; R.ui.toast(S.suit ? '얼음 바닥 — 방한 잠수복이라 덜 미끄러워요' : '얼음 바닥 — 미끄러워요! 천천히', 'soft'); } }
    if (S.temp <= 0) pl.slowMul *= COLD.slowZero; else if (S.temp < COLD.low) pl.slowMul *= COLD.slowLow;
  }
}
/* 움직임 뒤: 체온 · 독 */
function wxPlayer(R, dt) {
  const S = R.WX, pl = R.pl; if (!S || pl.dead || R.over) return;
  if (S.wx === 'cold') {
    const warm = S.plan.heat.some(h => Math.hypot(h.x - pl.pos.x, h.z - pl.pos.z) < COLD.warmR) || R.hazards.some(h => Math.hypot(h.x - pl.pos.x, h.z - pl.pos.z) < h.r + 1.6) || flarePools(R).some(f => Math.hypot(f.x - pl.pos.x, f.z - pl.pos.z) < f.r)
      || (R.power && Math.hypot(R.gen.pos.x - pl.pos.x, R.gen.pos.z - pl.pos.z) < 3.4);
    pl.warm = warm;
    if (warm) S.temp = Math.min(COLD.max, S.temp + COLD.warm * dt);
    else { const deep = R.inDeep(pl.pos); S.temp = Math.max(0, S.temp - COLD.drain * (deep ? COLD.deep : pl.wet ? COLD.wet : 1) * (S.suit ? COLD.suit.drain : 1) * dt); }
    if (S.temp < 30 && !S.told.low) { S.told.low = 1; R.ui.event('체온이 30 아래 — 온열 배관 · 불 곁으로! (느려져요)', 'warn'); sfx.shiver?.(); } if (S.temp > 55) S.told.low = 0;
    if (S.temp <= 0) { S.hurtT += dt; if (S.hurtT >= COLD.hurtEvery) { S.hurtT = 0; R.hurtRaw(COLD.hurt, '꽁꽁 얼었어요 — 온열 배관 · 불 곁으로!'); sfx.shiver?.(); } } else S.hurtT = 0;
    S.breathT -= dt; if (S.breathT <= 0) { S.breathT = S.temp < COLD.low ? 0.7 : 1.4; R.fx.burst(pl.pos.x + Math.sin(pl.face) * 0.4, 1.45, pl.pos.z + Math.cos(pl.face) * 0.4, 3, 0xeef6ff, 0.8, 0.12, 0.8, -1.5); }
  } else if (S.wx === 'toxic') {
    const inPool = S.plan.pools.some(p => (p.x - pl.pos.x) ** 2 + (p.z - pl.pos.z) ** 2 < (p.r * 0.85) ** 2) && pl.roll <= 0;
    const shower = S.plan.showers.some(s => Math.hypot(s.x - pl.pos.x, s.z - pl.pos.z) < 1.3);
    if (inPool) { S.poison = Math.min(TOXIC.max, S.poison + TOXIC.fill * (S.filter ? TOXIC.filter.fill : 1) * dt); if (!S.told.pool) { S.told.pool = 1; R.ui.toast(S.filter ? '독 웅덩이 — 해독 필터가 막아 줘요(조금 오름)' : '독 웅덩이! 독이 올라요 — 굴러서 건너면 덜 묻어요', 'warn'); } if (R.R() < dt * 8) R.fx.burst(pl.pos.x, 0.2, pl.pos.z, 2, 0xb8ff6a, 1.4, 0.07, 0.5, -2); }
    else S.poison = Math.max(0, S.poison - TOXIC.decay * (S.filter ? TOXIC.filter.decay : 1) * dt);
    if (shower && S.poison > 0) { S.poison = Math.max(0, S.poison - TOXIC.shower * dt); if (!S.told.shower) { S.told.shower = 1; R.ui.toast('소독 샤워 — 독이 씻겨요', 'good'); } }
    if (S.poison >= TOXIC.auto && R.hasItem('antitox')) { R.takeOne('antitox'); R.used.push('antitox'); S.poison = 0; pl.hp = Math.min(pl.maxHp, pl.hp + ITEMS.antitox.heal); R.ui.toast('해독제! 독이 씻겼어요', 'good'); sfx.pick(3); }
    if (S.poison > 0.5) { S.hurtT += dt; if (S.hurtT >= 1) { S.hurtT = 0; const d = TOXIC.dps[0] + (TOXIC.dps[1] - TOXIC.dps[0]) * S.poison / TOXIC.max; pl.hp -= Math.round(d * 10) / 10; if (pl.hp <= 0) { pl.hp = 0.01; R.hurtRaw(1, '독이 너무 올랐어요'); } /* 작은 지속 피해 = 빨간 번쩍 없음 (게이지 · 초록 거품으로) */ R.fx.burst(pl.pos.x, 1.3, pl.pos.z, 3, 0xb8ff6a, 1.5, 0.06, 0.5, -3); } }
    if (S.poison >= TOXIC.warn && !S.told.warn) { S.told.warn = 1; R.ui.event('독이 많이 올랐어요 — 연고 · 해독제로 씻어요', 'warn'); sfx.toxic?.(); } if (S.poison < 20) S.told.warn = 0;
  }
}
/* 회복약을 쓰면 독이 씻김 */
function wxHealed(R, k) { const S = R.WX; if (S?.wx === 'toxic' && S.poison > 0 && (k === 'med' || k === 'bandage' || ITEMS[k]?.cure)) { S.poison = 0; R.ui.toast('독이 씻겼어요', 'good'); } }
/* 화면: 게이지 (산소 막대와 같은 모양 · 같은 자리) · 독 웅덩이 맥박 */
function wxTick(R, dt) {
  const S = R.WX; if (!S) return;
  if (S.poolIM) S.poolIM.material.opacity = 0.75 + 0.2 * Math.sin(R.t * 3);
  if (!S.hud || !S.hud.isConnected) { const host = document.querySelector('.raidui'); if (!host) return; S.hud = document.createElement('div'); S.hud.className = 'o2 wxg'; S.hud.innerHTML = '<i></i><span></span>';
    S.hud.style.top = `calc(env(safe-area-inset-top) + ${R.o2 != null ? 96 : 76}px)`; S.hud.style.borderColor = S.wx === 'cold' ? 'rgba(160,220,255,.7)' : 'rgba(170,255,110,.7)'; host.appendChild(S.hud); }
  const cold = S.wx === 'cold'; const k = cold ? S.temp / COLD.max : S.poison / TOXIC.max;
  S.hud.firstChild.style.width = (k * 100) + '%'; S.hud.firstChild.style.background = cold ? (S.temp < COLD.low ? 'linear-gradient(90deg,#6aa8ff,#bfe0ff)' : 'linear-gradient(90deg,#ffb07a,#ffe2b0)') : 'linear-gradient(90deg,#6fd83a,#d8ff8a)';
  S.hud.classList.toggle('low', cold ? S.temp < COLD.low : S.poison >= TOXIC.warn);
  const txt = cold ? (R.pl.warm ? `체온 ${Math.ceil(S.temp)} · 녹는 중` : S.temp <= 0 ? '체온 0 — 얼었어요!' : `❄ 체온 ${Math.ceil(S.temp)}${S.suit ? ' · 방한복' : ''}`) : S.poison > 0.5 ? `☣ 독 ${Math.ceil(S.poison)}${S.filter ? ' · 필터' : ''}` : `☣ 독 없음${S.filter ? ' · 필터' : ''}`;
  if (S.hud.lastChild.textContent !== txt) S.hud.lastChild.textContent = txt;
}
