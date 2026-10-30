// 화면: 돈 · 마음 · 원두 · 레벨 · 머신/로스터 창 · 단골 사연 · 꾸미기 · 주문서 · 출석 · 가게(매장·동료) · 설정 · 말풍선
import * as THREE from 'three';
import { BRAND, GAME, MENU, CATS, ROAST, FURN, FURN_CATS, STAFF, STAFF_UP, OFFLINE, STORES, REGULARS, XP, COUPON, BEAN_MAX, FAVOR_MAX, MACHINES, PULL, ART, POEMS, POEM_PER, CHEER } from './data.js?v=0.93.1';
import { S, ST, save, today, couponReady, claimCoupon, levelOf, dayTick, newStore, now } from './state.js?v=0.93.1';
import { cup } from './models.js?v=0.93.1';
import { fmt, machineCount, storeMult, WALL_SLOTS, STACK, poemLen, isJeong } from './game.js?v=0.93.1';
import { bm } from './oad_bm.js?v=0.93.1';
import { sfx, setAudio } from './audio.js?v=0.93.1';
import { pushBack, inOAD, exitToOAD } from './oad.js?v=0.93.1';

const $ = s => document.querySelector(s);
const SLOT = 'gamsung_slot_';
/* 광고 보상: 원어데이 쪽 자리 이름 (bm.rewardedAd) · 게임 쪽 하루 상한(합 5 = 앱 shell/bm.js 게임당 5) · 바로 완성 최소 남은 시간 */
const PLACE = { boost: 'boost2x', finish: 'finish', offline: 'offline2x' }, AD_DAY = { finish: 2, boost: 2, offline: 1 }, AD_MIN = 60, INST_MIN = 10;
/* 조사: 마지막 글자 받침으로 고름 · josa('서윤', '이', '가') → 서윤이 · josa('지호', '을', '를') → 지호를 (한글이 아니면 뒤엣것) */
export const josa = (w, a, b) => { const c = String(w).charCodeAt(String(w).length - 1) - 0xAC00; return w + (c >= 0 && c < 11172 && c % 28 ? a : b); };
const mmss = s => s >= 3600 ? `${Math.floor(s / 3600)}시간 ${Math.floor(s % 3600 / 60)}분` : s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}초`;
const tlabel = s => s >= 3600 ? `${Math.round(s / 360) / 10}시간` : s >= 60 ? `${Math.round(s / 6) / 10}분` : `${s}초`;

// 메뉴 그림: 공식 사진이 있으면 사진 · 없으면 3D 잔을 그려서 (처음 한 번)
const THUMB = {};
/* 작은 아이콘: 메뉴마다 고유한 바탕색 동그라미 + 크게 그린 3D 잔 (작아져도 구별되게) · 큰 카드는 공식 사진 */
const ICON_BG = { americano: '#3B2A20', latte: '#C89A6A', mygamsung: '#A92E2B', vanilla: '#F2D27A', croffle: '#E8963A', dawn: '#6E8F5A', coldbrew: '#1E2A3A', jeju: '#3A6AC8', macaron: '#E89AB0', berry: '#B0283A', basque: '#7A4A22', tea: '#B98A5A' };
function thumbs() { const N = 192, R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); R.setSize(N, N); R.outputColorSpace = THREE.SRGBColorSpace;
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xFFFFFF, 0x8A6A50, 2.2)); const d = new THREE.DirectionalLight(0xFFFFFF, 1.8); d.position.set(60, 120, 100); sc.add(d);
  const cam = new THREE.OrthographicCamera(-27, 27, 27, -27, 1, 1000); cam.position.set(60, 55, 120); cam.lookAt(0, 20, 0);
  const cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d');
  for (const [k, m] of Object.entries(MENU)) { const g = cup(m.look); g.scale.setScalar(1.1); sc.add(g); R.render(sc, cam); sc.remove(g);
    x.clearRect(0, 0, N, N); x.fillStyle = ICON_BG[k] || '#8A7563'; x.beginPath(); x.arc(N / 2, N / 2, N / 2 - 2, 0, 6.29); x.fill();
    x.fillStyle = '#FFFFFF33'; x.beginPath(); x.arc(N / 2, N / 2, N / 2 - 14, 0, 6.29); x.fill(); x.save(); x.beginPath(); x.arc(N / 2, N / 2, N / 2 - 2, 0, 6.29); x.clip(); x.drawImage(R.domElement, 0, 0); x.restore(); THUMB[k] = cv.toDataURL(); }
  R.dispose(); }
export const pic = k => THUMB[k];   /* 작은 아이콘 (말풍선 · 주문표 · 머신 · 목록) */
export const photo = k => MENU[k].photo ? `assets/brand/${MENU[k].photo}.jpg` : THUMB[k];   /* 큰 카드 */
/* 라떼아트 모양: 단위 원(-1~1) 위 한 붓 경로 · 안내(점선) · 완성(우유 선) · 도감 아이콘 */
const ART_PATH = {
  heart: t => [Math.pow(Math.sin(t), 3) * 0.95, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 * 0.95 - 0.05],
  leaf: t => [0.5 * Math.sin(t) * Math.pow(Math.abs(Math.sin(t)), 0.35), -Math.cos(t) * 0.92],
  gam: t => [Math.cos(t) * 0.72, Math.sin(t) * 0.66 + 0.12],
};
const artPts = (k, n = 72) => Array.from({ length: n + 1 }, (_, i) => ART_PATH[k](i / n * Math.PI * 2));
function drawCup(x, W) { const c = W / 2; x.clearRect(0, 0, W, W); x.fillStyle = '#F4EEE4'; x.beginPath(); x.arc(c, c, c - 4, 0, 6.29); x.fill(); x.strokeStyle = '#D9C8B2'; x.lineWidth = W * 0.012; x.stroke();
  const gr = x.createRadialGradient(c, c * 0.95, W * 0.05, c, c, c * 0.84); gr.addColorStop(0, '#C9925E'); gr.addColorStop(0.7, '#9A6440'); gr.addColorStop(1, '#6E4128'); x.fillStyle = gr; x.beginPath(); x.arc(c, c, c * 0.84, 0, 6.29); x.fill(); }
function drawArt(x, W, k, mode) { const c = W / 2, R = c * 0.62, P = artPts(k); x.save(); x.lineCap = x.lineJoin = 'round';
  if (mode === 'guide') { x.setLineDash([W * 0.025, W * 0.03]); x.strokeStyle = '#FFF6E8AA'; x.lineWidth = W * 0.022; } else { x.strokeStyle = '#FFF8EE'; x.lineWidth = W * 0.07; x.shadowColor = '#00000022'; x.shadowBlur = W * 0.01; }
  x.beginPath(); P.forEach(([px, py], i) => i ? x.lineTo(c + px * R, c + py * R) : x.moveTo(c + px * R, c + py * R)); x.closePath(); x.stroke();
  if (mode !== 'guide' && k === 'leaf') { x.lineWidth = W * 0.03; x.beginPath(); x.moveTo(c, c - R * 0.85); x.lineTo(c, c + R * 0.95); x.stroke(); for (let i = 0; i < 4; i++) { const y = c - R * 0.5 + i * R * 0.34; x.beginPath(); x.moveTo(c - R * 0.32, y - R * 0.1); x.quadraticCurveTo(c, y + R * 0.14, c + R * 0.32, y - R * 0.1); x.stroke(); } }
  if (k === 'gam') { x.setLineDash([]); x.fillStyle = mode === 'guide' ? '#87A86EAA' : '#87A86E'; x.beginPath(); x.ellipse(c - R * 0.16, c - R * 0.62, R * 0.2, R * 0.08, -0.4, 0, 6.29); x.ellipse(c + R * 0.16, c - R * 0.62, R * 0.2, R * 0.08, 0.4, 0, 6.29); x.fill(); }
  x.restore(); }
const ICONS = {}; const artIcon = k => ICONS[k] ||= (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 120; const x = cv.getContext('2d'); drawCup(x, 120); drawArt(x, 120, k, 'done'); return cv.toDataURL(); })();
export class UI {
  constructor(app) {
    this.app = app; thumbs(); const h = $('#hud');
    h.innerHTML = `<div class="top"><div class="pill coin"><i></i><b id="cn">0</b></div><div class="pill heart"><i>♥</i><b id="hn">0</b></div><div class="pill bean" id="beanP"><i>🫘</i><b id="bn">0</b></div></div>
      <div class="lvl" id="lvl"><b id="lvt"></b><em id="sco"></em><div class="pb"><s id="lvp"></s></div></div>
      <div class="side"><button class="sb" id="bOrd"><span>📜</span>주문서<i class="dot" id="ordDot"></i></button><button class="sb" id="bAtt"><span>🎁</span>출석<i class="dot" id="attDot"></i></button><button class="sb ad" id="bAd"><span>▶</span><em id="adT">손님×2</em></button>${inOAD ? '<button class="sb" id="bExit"><span>↩</span>원어데이</button>' : ''}</div>
      <div class="cp" id="cp"><span id="cpt"></span><div class="pb"><s id="cpb"></s></div></div>
      <div class="hint" id="hint"></div><div class="rail" id="rail"></div>
      <div class="bottom" id="bottom">${[['☕', '메뉴', 'menu'], ['🪑', '꾸미기', 'deco'], ['💌', '단골', 'reg'], ['🗺️', '가게', 'shop'], ['⚙️', '설정', 'set']].map(([i, t, k]) => `<button class="bb" data-b="${k}"><i class="dot" id="dot_${k}"></i><span>${i}</span>${t}</button>`).join('')}</div>
      <div class="decobar" id="decobar"></div>
      <div class="poemp" id="poemP"></div><div class="praise" id="praise"></div><div class="artcard" id="artCard"></div><div class="poemcard" id="poemCard"></div><div class="letterc" id="letterC"></div><div class="finger" id="finger"><i>👆</i><span></span></div>`;
    this.tags = $('#tags'); this.floats = $('#floats');
    $('#bottom').onclick = e => { const b = e.target.closest('[data-b]'); if (!b) return; sfx('tap', { vol: 0.4 }); ({ menu: () => this.menuBook(), deco: () => this.decoEnter(), reg: () => this.regulars(), shop: () => this.shop(), set: () => this.settings() })[b.dataset.b](); };
    $('#poemP').onclick = () => this.poemCard(true); $('#letterC').onclick = () => $('#letterC').classList.remove('on');
    $('#bOrd').onclick = () => this.orders(); $('#bAtt').onclick = () => this.attendance(); $('#bAd').onclick = () => this.ad('boost'); $('#cp').onclick = () => this.coupon(); $('#beanP').onclick = () => this.roastSheet();
    if ($('#bExit')) $('#bExit').onclick = () => exitToOAD();
    this.chips = new Map();
  }
  clearTags() { this.tags.innerHTML = ''; this.chips = new Map(); }
  bubble() { const d = document.createElement('div'); d.className = 'bub'; this.tags.append(d); return d; }
  cloud() { const d = document.createElement('div'); d.className = 'cloud'; this.tags.append(d); return d; }   /* 손님 머리 옆 마음 구름 */
  float(t, pos, cls) { const d = document.createElement('div'); d.className = 'float ' + (cls || ''); d.textContent = t; d._p = pos.clone(); d._t = 0; this.floats.append(d); }
  toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(this._tt); this._tt = setTimeout(() => el.classList.remove('on'), 2000); }
  modal(html, cls = '') { const m = $('#modal'), cur = m.querySelector('.modal'); if (cur && this._ub) { cur.className = 'modal ' + cls; cur.innerHTML = html; return m; }
    m.innerHTML = `<div class="mback"><div class="modal ${cls}">${html}</div></div>`; const t0 = performance.now(); m.firstChild.onclick = e => { if (e.target === m.firstChild && performance.now() - t0 > 400) this.close(); };   /* 연 손가락의 클릭이 바로 닫지 않게 */ this._ub = pushBack(() => { this.close(); return true; }); return m; }
  close() { $('#modal').innerHTML = ''; this._ub && this._ub(); this._ub = null; }
  // ── 화면 위 표시: 말풍선 · 머신 시간 · 치울 잔
  chip(key, cls, act) { let d = this.chips.get(key); if (!d) { d = document.createElement('div'); d.className = 'chip ' + cls; this.tags.append(d); this.chips.set(key, d); if (act) { d.classList.add('tap'); d.addEventListener('click', e => { e.stopPropagation(); this.tap(act()); }); } } d._seen = true; return d; }   /* 머리 위 표시도 누르면 그 설비를 누른 것과 같음 */
  frame(g) {
    const cam = this.app.cam, W = innerWidth, H = innerHeight, q = W / H < 0.6 ? 1 : Math.max(0.9, Math.min(1.5, H / (cam.top - cam.bottom) / 0.358)), sk = Math.abs(q - 1) > 0.02 ? ` scale(${q.toFixed(3)})` : '', v = new THREE.Vector3(),   /* 화면 위 표시는 매장이 그려지는 크기에 맞춤(폰 세로 = 1) · 기준점은 그대로 */ at = (x, y, z) => { v.set(x, y, z).project(cam); return `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px)`; };
    $('#cn').textContent = fmt(S.coins); $('#hn').textContent = fmt(S.hearts); $('#bn').textContent = fmt(S.beans); $('#beanP').classList.toggle('low', S.beans < 6);
    for (const d of [...this.floats.children]) { d._t += 1 / 60; d._p.y += 1.4; v.copy(d._p).project(cam); d.style.transform = `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px) translate(-50%,-50%)` + sk; d.style.opacity = Math.max(0, 1 - d._t / 1.3); if (d._t > 1.3) d.remove(); }
    for (const c of g.cust) { if (!c.tag) continue; const sst = c.state === 'story' || (c.story && c.state === 'seated'), show = (c.state === 'story' || (c.state === 'seated' && (c.story || g.ready(c) || c.w > 90))) && !g.deco;   /* 자리에서 사연을 기다리는 단골도 💌 */   /* 앉아 기다리는 손님은 주문 레일로 보고, 머리 위엔 오래 기다릴 때만 */ c.tag.style.display = show ? '' : 'none'; if (!show) continue;
      c.tag.style.transform = at(c.pos.x, 230, c.pos.z) + ' translate(-50%,-100%)' + sk;
      const html = sst ? `<i class="lt">💌</i><b>${c.reg.name}</b><small>눌러서 이야기 듣기</small>` : c.state === 'kiosk' ? '<b>📱 주문 중…</b>' : `<i class="no">#${c.ticket ? c.ticket.no : ''}</i>${c.items.map(it => `<img src="${pic(it.k)}"><b>${MENU[it.k].short}${it.n > 1 ? `×${it.n}` : ''}</b>`).join('')}${c.w > 90 ? '<em>😌</em>' : ''}`;
      if (c.tag._h !== html) { c.tag.innerHTML = html; c.tag._h = html; } c.tag.classList.toggle('story', sst); c.tag.classList.toggle('reg', !!c.reg); c.tag.classList.toggle('has', g.ready(c)); }
    const lab = g.cust.filter(c => c.state === 'seated' && !(g.ready(c) || c.w > 90)).sort((a, b) => b.w - a.w)[0];
    for (const c of g.cust) { const el = c.cloud; if (!el) continue; const sv = c.clearT != null, age = sv ? g.t - c.clearT : 0, show = !g.deco && (sv ? age < 3.2 : ['seated', 'toPick'].includes(c.state));   /* 줄 선 손님 · 받은 뒤엔 구름을 안 띄움 (어수선함 줄이기) */ el.style.display = show ? '' : 'none'; if (!show) continue;
      const wait = !sv && c === lab;   /* 마음 구름: 흐림 → 맑음 · 정성 한 잔이면 햇살 · 글자는 가장 오래 기다린 한 명만 */
      const html = !sv ? `<i>☁️</i>${wait ? '<b>마음 흐림</b>' : ''}` : age < 3.2 ? `<i>${c.sun ? '🌞' : '☀️'}</i><b>${c.sun ? '햇살 가득' : '맑아졌어요'}${c.gain ? ` <em>♥+${c.gain}</em>` : ''}</b>` : `<i>${c.sun ? '🌞' : '🌤️'}</i>`;
      if (el._h !== html) { el.innerHTML = html; el._h = html; el.className = 'cloud ' + (!sv ? 'dim' : age < 3.2 ? 'sun pop' + (c.sun ? ' gold' : '') : 'ok'); }
      { const t = at(c.pos.x, c.P.sit ? 120 : 150, c.pos.z), px = +t.match(/translate\(([-\d.]+)px/)[1], right = px - (el.offsetWidth * q || 0) - 16 < 4;   /* 손님이 왼쪽 끝이면 구름을 오른쪽에 */
        el.style.transformOrigin = right ? '0 50%' : ''; el.style.transform = t + (right ? ' translate(16px,-50%)' : ' translate(calc(-100% - 16px),-50%)') + sk; } }
    this.rail(g);
    for (const d of this.chips.values()) d._seen = false;
    if (!g.deco) {
      for (const m of g.machines) { const p = g.progress(m), d = this.chip('m' + m.key, 'mach', () => ({ kind: 'machine', m })); d.style.transform = at(m.x, 250, m.z) + ' translate(-50%,-100%)' + sk;
        const html = !p ? `<span class="idle">${m.kind === 'oven' ? '🍰' : '☕'}</span>` : p.u >= 1 ? `<img src="${pic(p.s.menu)}"><b>${MENU[p.s.menu].short} ×${p.s.n} 완성</b>` : `<img src="${pic(p.s.menu)}"><b class="mn">${MENU[p.s.menu].short}</b><s><i style="width:${p.u * 100}%"></i></s><em>${mmss(p.left)}</em>`;
        if (d._h !== html) { d.innerHTML = html; d._h = html; } d.classList.toggle('done', !!p && p.u >= 1); d.classList.toggle('empty', !p); d.classList.toggle('jeong', !!g.barista && isJeong(m)); d.classList.toggle('auto', !!g.barista && !isJeong(m)); }   /* 하린이 오면: 정성 머신은 금빛 테 · 하린 머신은 작은 점 */
      { const r = g.roastState(), d = this.chip('roast', 'mach', () => ({ kind: 'roaster' })); d.style.transform = at(g.roaster.x, 250, g.roaster.z) + ' translate(-12%,-100%)' + sk; const html = !r ? `<span class="idle">🫘${S.beans < 30 && !g.roastBoy ? ' 원두 볶기' : ''}</span>` : r.u >= 1 ? `<b>🫘 원두 +${r.R.beans}</b>` : `<span>🫘</span><s><i style="width:${r.u * 100}%"></i></s><em>${mmss(r.left)}</em>`; if (d._h !== html) { d.innerHTML = html; d._h = html; } d.classList.toggle('done', !!r && r.u >= 1); d.classList.toggle('empty', !r); d.classList.toggle('auto', !!g.roastBoy); }
      for (const o of g.furn) o.seats.forEach((s, k) => { if (!s.dirty) return; const d = this.chip('d' + o.f.uid + '_' + k, 'dirty', () => ({ kind: 'dirty', o, k })); d.style.transform = at(s.dirty.position.x, 150, s.dirty.position.z) + ' translate(-50%,-100%)' + sk; const html = s.coins && s.coins.l >= 0 ? '💌' : s.coins && s.coins.v ? '<i class="c"></i>' : '✨'; if (d._h !== html) { d.innerHTML = html; d._h = html; } d.classList.toggle('coin', !!(s.coins && (s.coins.v || s.coins.l >= 0))); });
      { const n = g.stackTotal(); if (n) { const d = this.chip('stack', 'stackc', () => ({ kind: 'stack' })); d.style.transform = at(STACK.x, STACK.y + 30 + Math.min(4, Math.ceil(n / 3)) * 52, STACK.z) + ' translate(-50%,-100%)' + sk; const html = `<i class="n">${n}</i>`; if (d._h !== html) { d.innerHTML = html; d._h = html; }
        if (S.fg >= 3) { const q = this.chip('stackp', 'stackc', () => ({ kind: 'stack' })); q.style.transform = at(STACK.x, STACK.y + 20, STACK.z) + ' translate(calc(-100% - 34px),-50%)' + sk; if (!q._h) { q.innerHTML = '<b>눌러서 픽업대로 ➜</b>'; q._h = 1; } } } }   /* 안내 중엔 손가락이 대신 */   /* 작업대 탑(개수) · 아래에 「끌어 픽업대로」 */
    }
    for (const [k, d] of this.chips) if (!d._seen) { d.remove(); this.chips.delete(k); }
    const b = g.boostUntil - now(); $('#adT').textContent = b > 0 ? mmss(Math.ceil(b / 1000)) : '손님×2'; $('#bAd').classList.toggle('on', b > 0);
    if (!this._pt || performance.now() - this._pt > 1000) { this._pt = performance.now(); this.progress(); }
    this.finger(g, at);
  }
  /* 첫 안내: 글 대신 실제 화면을 가리키는 손가락 3단계 (① 주문표 → ② 꾹 눌러 추출 → ③ 쟁반을 픽업대로) */
  finger(g, at) { const el = $('#finger'), sp = el.querySelector('span'); const hide = () => el.classList.remove('on');
    if (S.fg >= 3 || g.deco || window.__bot) return hide(); const k = window.__k || 1, W = innerWidth;   /* 손가락은 HUD(크기 k 배) 안에 → 화면 좌표 ÷ k */
    const put = (x, y, t, cls = '') => { el.className = 'finger on ' + cls; const ic = el.querySelector('i'), e2 = cls === 'up' ? '👇' : '👆'; if (ic.textContent !== e2) ic.textContent = e2; el.style.left = Math.max(10, Math.min(W - 10, x)) / k + 'px'; el.style.top = y / k + 'px'; sp.style.translate = ''; const r = sp.getBoundingClientRect(), dx = r.left < 8 ? 8 - r.left : r.right > W - 8 ? W - 8 - r.right : 0; if (dx) sp.style.translate = `${dx / k}px 0`;   /* 글 상자가 화면 밖이면 안쪽으로 (손가락은 그 자리) */ if (sp._t !== t) { sp.innerHTML = t; sp._t = t; } };
    if ($('#pull')) return hide();   /* 추출 창은 창 안에서 손가락이 안내 */
    if ($('#modal').firstChild) return hide();
    if (g.stackTotal()) { const r = this.chips.get('stack')?.getBoundingClientRect(); if (r) return put(r.left + r.width / 2, r.bottom + 6, '<em>3/3</em> 쟁반을 눌러 픽업대로', 'up'); }
    const done = g.machines.find(m => { const p = g.progress(m); return p && p.u >= 1; }); if (done) { const r = this.chips.get('m' + done.key)?.getBoundingClientRect(); if (r) return put(r.left + r.width / 2, r.bottom + 4, '다 내렸어요 · 눌러서 작업대로'); }
    const tk = $('#rail .tk'); if (tk && g.tickets.length) { const r = tk.getBoundingClientRect(); return put(r.left + Math.min(r.width / 2, 60), r.top - 4, '<em>1/3</em> 주문표를 눌러요', 'up'); }
    const c = g.cust.find(c => ['kiosk', 'queue', 'in'].includes(c.state)); if (c) { const m = at(c.pos.x, 260, c.pos.z).match(/translate\(([-\d.]+)px,([-\d.]+)px\)/); if (m) return put(+m[1], +m[2] - 30, '첫 손님이 주문하고 있어요', 'say'); }
    put(W / 2, innerHeight * 0.42, '곧 첫 손님이 와요', 'say'); }
  /* 주문 레일: 화면 아래 주문표 (누르면 그 메뉴를 내릴 머신 창) */
  rail(g) { const el = $('#rail'); if (!el) return; const ts = g.deco ? [] : g.tickets.slice(0, 6); const html = ts.map(t => { const ready = g.ready(t.c);
      return `<button class="tk ${ready ? 'ready' : ''}" data-tk="${t.no}"><i>#${t.no}</i>${t.items.map(it => { const ok = (ST().bar[it.k] || 0) >= it.n, sk = g.stack.some(e => e.k === it.k), br = sk || g.machines.some(m => g.progress(m)?.s.menu === it.k); return `<span class="ti ${ok ? 'ok' : br ? 'br' : ''}"><img src="${pic(it.k)}"><span class="tt"><b>${MENU[it.k].short}${it.n > 1 ? ` ×${it.n}` : ''}</b><small>${ok ? '준비 완료' : sk ? '작업대에' : br ? '만드는 중' : '주문'}</small></span></span>`; }).join('')}</button>`; }).join('') + (g.tickets.length > 6 ? `<span class="more">+${g.tickets.length - 6}</span>` : '');
    if (el._h !== html) { el.innerHTML = html; el._h = html; el.querySelectorAll('[data-tk]').forEach(b => b.onclick = () => { const t = g.tickets.find(x => x.no === +b.dataset.tk); if (!t) return; const it = t.items.find(x => g.need(x.k) > 0); if (!it) return g.stackTotal() ? (g.deliverStack(), sfx('tap', { vol: 0.3 })) : this.toast(`#${t.no} 만드는 중이에요 · 곧 나와요`); const d = MENU[it.k], m = g.freeMachine(d.oven);   /* 정성 머신 먼저 */ if (!m) return this.toast(d.oven ? '오븐이 모두 굽는 중이에요' : '머신이 모두 내리는 중이에요'); sfx('tap', { vol: 0.4 }); this._cat = d.cat; this._sel = it.k; d.oven ? this.brewSheet(m, it.k) : this.pullSheet(m, it.k); }); } }   /* 주문표 → 바로 손 추출 창 */
  progress() {
    const g = this.app.game; if (!g || !g.machines) return; dayTick(); const lv = S.lv, a = XP[lv - 1] || 0, bnext = XP[lv] || a + 1;
    $('#lvt').textContent = `Lv.${lv} · ${STORES[S.si].name}`; $('#sco').textContent = `감성 지수 ${g.score()}`; $('#lvp').style.width = Math.min(100, (S.xp - a) / (bnext - a) * 100) + '%';
    $('#ordDot').style.display = S.orders.some(o => !o.done && (S.soldBy[o.menu] || 0) >= o.n) ? 'block' : 'none'; $('#attDot').style.display = S.att.last !== today() ? 'block' : 'none';
    $('#dot_reg').style.display = REGULARS.some(R => S.lv >= R.lv && !S.reg[R.id]) ? 'block' : 'none'; $('#dot_shop').style.display = Object.entries(STAFF).some(([k, d]) => !S.staff[k] && S.lv >= d.lv) || STORES.some((s, i) => S.lv >= s.lv && !S.stores[i]) ? 'block' : 'none';
    $('#dot_deco').style.display = 'none';
    const r = Math.min(1, S.sold / COUPON.goal); $('#cpb').style.width = r * 100 + '%'; $('#cpt').textContent = S.coupon ? '🎟 쿠폰 받음' : couponReady() ? '🎟 쿠폰 받기!' : `🎟 쿠폰 ${S.sold}/${COUPON.goal}`; $('#cp').classList.toggle('ready', couponReady());
    document.body.classList.toggle('decoing', !!g.deco);
    { const line = POEMS[S.poem.i % POEMS.length], html = `<span><b>🖋</b>${this.poemChars(line, S.poem.n)}</span><div class="pb"><s style="width:${(S.poem.n + (S.poem.p || 0) / POEM_PER) / poemLen(line) * 100}%"></s></div>`; const el = $('#poemP'); if (el._h !== html) { el.innerHTML = html; el._h = html; } }
  }
  poemChars(line, n) { let i = 0; return [...line].map(ch => ch === ' ' ? '<u> </u>' : `<i class="${i++ < n ? 'on' : ''}">${ch}</i>`).join(''); }
  // ── 안내: 지금 할 일 하나를 화살표로 · Lv.5 전에는 늘, Lv.5부터는 막혔을 때만 (2026-10-28)
  //   원칙: 가리키는 행동은 지금 눌렀을 때 실제로 되는 것만 (볶을 돈 · 원두 · 빈 머신을 먼저 확인) · 화면 밖이면 그쪽으로 화면을 옮겨 줌
  guide() {
    const g = this.app.game, h = $('#hint'), off = () => { h.classList.remove('on'); return null; }; if (g.deco || S.fg < 3) return off();   /* 첫 안내는 손가락이 */
    const basic = S.lv < 5, text = t => { if (h.textContent !== t) h.textContent = t; h.classList.add('on'); return null; };
    const scr = (x, z) => { const cam = this.app.cam; cam.updateMatrixWorld(); const v = new THREE.Vector3(x, 120, z).project(cam); return Math.abs(v.x) <= 0.95 && v.y <= 0.75 && v.y >= -0.6; };   /* 화면 안(위 HUD · 아래 레일 빼고)에 보이는지 */
    const say = (t, x, z, y) => { const s2 = scr(x, z) ? t : `${t} · 화면을 끌어서 찾아요`; if (h.textContent !== s2) h.textContent = s2; h.classList.add('on'); return [x, z, y]; };   /* 화면을 마음대로 옮기지 않음 (어지러움) */
    const r = g.roastState(), roastHere = (t) => !g.roastWhy('house') ? say(g.broke() ? '원두가 바닥났어요 · 로스터에서 외상으로 볶을 수 있어요' : t, g.roaster.x, g.roaster.z, 380) : r ? text('원두를 볶는 중이에요 · 곧 다 돼요') : null;
    const tk = g.tickets.slice(0, 6).find(t => t.items.some(it => g.need(it.k) > 0)), it = tk   /* 화면 주문 레일에 보이는 6장 안에서만 */ && tk.items.find(x => g.need(x.k) > 0), m = it && g.freeMachine(MENU[it.k].oven), beanShort = it && S.beans < MENU[it.k].bean;
    const front = g.cust.find(c => c.state === 'story'), seatedStory = g.cust.find(c => c.story && c.state === 'seated'), dirty = g.seats().filter(x => x.s.dirty).sort((a, b) => scr(b.s.x, b.s.z) - scr(a.s.x, a.s.z))[0], noSeat = !g.freeSeats().length;
    if (basic && g.stackTotal()) return say('쟁반을 눌러 픽업대로 옮겨요', STACK.x, STACK.z, 300);
    const done = g.machines.find(m => { const p = g.progress(m); return p && p.u >= 1; }); if (basic && done) return say('다 내렸어요! 눌러서 작업대 탑으로', done.x, done.z, 330);
    if (r && r.u >= 1 && (basic || S.beans < CHEER.low || beanShort)) return say('원두가 다 볶아졌어요! 눌러서 담아요', g.roaster.x, g.roaster.z, 380);
    if (S.beans < CHEER.low || beanShort) { const q = roastHere(beanShort ? `원두가 모자라요 · 로스터를 눌러 볶아요` : '원두가 떨어졌어요 · 로스터를 눌러 볶아요'); if (q !== null || r) return q; }
    if (basic && tk && m && !beanShort) return say(`주문 #${tk.no} ${MENU[it.k].short} · 주문표를 누르면 손으로 바로 내려요`, m.x, m.z, 300);
    if ((ST().ret || 0) >= (basic ? 5 : 8)) return say('반납대에 쟁반이 쌓였어요 · 눌러서 설거지', -190, -455, 220);
    if (dirty && (basic || noSeat)) return say(noSeat ? '빈자리가 없어요 · 테이블을 눌러 닦아요' : '테이블을 눌러 닦아요 · 다음 손님이 앉을 수 있어요', dirty.s.dirty.position.x, dirty.s.dirty.position.z, 200);
    if (front && (basic || g.cust.some(c => c.state === 'queue'))) return say(`단골 ${josa(front.reg.name, '이', '가')} 이야기를 들려주고 싶어 해요 · 눌러 보세요`, front.pos.x, front.pos.z, 260);
    if (basic && seatedStory) return say(`💌 ${josa(seatedStory.reg.name, '이', '가')} 자리에서 기다려요 · 눌러서 이야기 듣기`, seatedStory.pos.x, seatedStory.pos.z, 230);
    return off();
  }
  /* 응원 선물 (docs/bm-policy.md 6장): 원두가 바닥나고 볶을 돈도 없을 때 한 번 · 노력 인정 먼저 · 거절 가능 · 하루 CHEER.perDay 번 */
  cheer() { const g = this.app.game; if ($('#modal').firstChild || $('#pull') || g.deco) return false; const left = g.cheerLeft(); if (left <= 0) return false; sfx('reward', { vol: 0.35 });
    this.modal(`<div class="cheer"><i>🫘</i><small>응원 선물 · 오늘 ${CHEER.perDay - left + 1}/${CHEER.perDay}</small><b>오늘도 정성껏 내리셨어요</b><p>원두가 바닥났는데 볶을 돈이 조금 모자라요.<br>하우스 블렌드 한 봉지 챙겨 드릴게요.</p></div>
      <button class="btn" id="chOk">응원 받기 · 원두 +${CHEER.beans}잔분</button><button class="btn ghost" id="chNo">혼자 해 볼게요</button>`);
    $('#chOk').onclick = () => { this.close(); if (g.cheerGive()) this.toast('응원 원두를 담았어요 · 주문표를 눌러 이어서 내려요 ☕'); else this.toast('이미 원두가 있어요'); };
    $('#chNo').onclick = () => { this.close(); this.toast('로스터에서 외상으로 볶을 수도 있어요 · 다음 매출에서 갚아요'); }; return true; }
  // ── 누르기
  tap(p, fp) {
    const g = this.app.game;
    if (g.deco) { if (!p) return; if (p.kind === 'furn') { const e = g.pickFurn(p.o); if (e) this.toast(e); else sfx('pick', { vol: 0.4 }); } else if (p.kind === 'wall') this.wallMenu(p.slot); else if (p.kind === 'floor' && g.deco.ghost && fp) g.ghostMove(fp.x, fp.z); return; }
    if (!p) return;
    if (p.kind === 'stack') { if (g.deliverStack()) sfx('tap', { vol: 0.3 }); return; }
    if (p.kind === 'machine') { const pr = g.progress(p.m); if (pr && pr.u >= 1) { if (g.collect(p.m) && S.tut < 2) S.tut = 2; return; } if (pr) return this.brewing(p.m);
      if (p.m.kind === 'espresso') { const k = Object.keys(MENU).find(x => g.need(x) > 0 && !MENU[x].oven && S.lv >= MENU[x].lv); if (k && g.tickets.length) return this.pullSheet(p.m, k); }   /* 주문이 있으면 바로 손 추출 */
      return this.brewSheet(p.m); }
    if (p.kind === 'roaster') { const r = g.roastState(); if (r && r.u >= 1) return g.collectBeans(); if (r) return this.brewing(g.roaster); return this.roastSheet(); }
    if (p.kind === 'dirty') return g.requestClean(p.o, p.k);
    if (p.kind === 'story') return this.story(p.c);
    if (p.kind === 'cust') return this.toast(`#${p.c.ticket ? p.c.ticket.no : ''} ${MENU[p.c.menu].name} 기다리는 중 · 픽업대에 나오면 손님이 가지러 가요`);
    if (p.kind === 'bar') return this.menuBook();
    if (p.kind === 'return') return g.wash() || this.toast('반납대가 비어 있어요');
  }
  // ── 머신: 메뉴 고르기
  brewSheet(m, pre) {
    const g = this.app.game, oven = m.kind === 'oven', open = c => Object.values(MENU).some(d => d.cat === c[0] && S.lv >= d.lv), ord = c => Object.entries(MENU).some(([k, d]) => d.cat === c[0] && g.need(k) > 0);
    const cats = (oven ? [['dessert', '디저트']] : CATS.filter(c => c[0] !== 'dessert')).slice().sort((a, b) => (open(b) - open(a)) || (ord(b) - ord(a)));   /* 열린 메뉴 탭 먼저 (잠긴 것은 뒤로) */
    this._cat = cats.find(ord)?.[0] || cats[0][0]; this._sel = pre || null; if (pre) this._cat = MENU[pre].cat;
    const draw = () => { const list = Object.entries(MENU).filter(([, d]) => d.cat === this._cat).sort((a, b) => ((S.lv < a[1].lv) - (S.lv < b[1].lv)) || (g.need(b[0]) - g.need(a[0])));
      const cards = list.map(([k, d]) => { const lock = S.lv < d.lv, want = this.app.game.need(k), cnt = Math.max(1, Math.min(d.n, want || 1)), need = d.bean * cnt, short = S.beans < need; return `<div class="mc ${lock ? 'lock' : ''} ${this._sel === k ? 'sel' : ''}" data-k="${k}"><img src="${photo(k)}"><div class="in"><b>${d.name}</b><div class="row"><span>⏱ ${tlabel(d.t)}</span><em>₩${fmt(d.price * storeMult())}</em></div>${want ? `<span class="ord">주문 ${want}</span>` : ''}<div class="row"><span>×${cnt}${d.oven ? '개' : '잔'}</span>${need ? `<span class="${short ? 'short' : ''}">🫘${need}</span>` : '<span>원두 없이</span>'}</div></div>${lock ? `<div class="lk">🔒 Lv.${d.lv}</div>` : ''}</div>`; }).join('');
      const sel = this._sel && MENU[this._sel], selN = sel ? Math.max(1, Math.min(sel.n, this.app.game.need(this._sel) || 1)) : 0;
      const md = this.modal(`<h2>${oven ? '디저트 굽기' : '메뉴 내리기'}</h2><div class="sub">${oven ? `오븐 ${m.i + 1} · 주문된 만큼(최대 4) 구워요` : `에스프레소 머신 ${m.i + 1} · 원두 ${fmt(S.beans)}잔분 · 메뉴를 누르면 손으로 바로 내려요 ✋`}</div>
        <div class="tabs">${cats.map(([k, t]) => `<button data-c="${k}" class="${k === this._cat ? 'on' : ''}">${t}</button>`).join('')}</div><div class="menus">${cards}</div>
        <button class="go ${sel ? '' : 'off'}" id="go" ${oven ? '' : 'hidden'}>${sel ? `${sel.name} ${selN}${oven ? '개 굽기' : '잔 내리기'} · ${tlabel(sel.t)}${this.app.game.need(this._sel) ? '' : ' · 주문 없음'}` : '주문표의 메뉴를 골라요'}</button>`, 'sheet');
      md.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { this._cat = b.dataset.c; this._sel = null; draw(); });
      md.querySelectorAll('.mc.lock').forEach(b => b.onclick = () => this.toast(`Lv.${MENU[b.dataset.k].lv}에 열려요`));   /* 말없이 거절하지 않기 */
      md.querySelectorAll('.mc:not(.lock)').forEach(b => b.onclick = () => { sfx('tap', { vol: 0.4 }); if (!oven) return this.pullSheet(m, b.dataset.k); this._sel = b.dataset.k; draw(); });
      $('#go').onclick = () => { if (!this._sel) return; const e = this.app.game.brew(m, this._sel); if (e) { this.toast(e); if (e.startsWith('원두')) setTimeout(() => this.roastSheet(), 600); return; } if (S.tut < 1) S.tut = 1; this.close(); this.toast(`${MENU[this._sel].name} ${oven ? '굽는' : '내리는'} 중…`); }; };
    draw();
  }
  // 바로 완성 (docs/bm-policy.md 2-1): 시간을 팔지 않고 '이 잔 바로' · ♥ = 남은 2분마다 1(최소 1) · 광고 = 1회 1개
  //   광고는 광고 길이보다 짧게 남은 것엔 안 띄움(AD_MIN 60초 — 메뉴 8~50초는 사실상 ♥만) · ♥도 10초 미만이면 숨김 · 하루 한도 = 게임 자리 상한과 앱 남은 횟수 중 작은 값
  brewing(m) { const g = this.app.game, roast = m === g.roaster, info = roast ? g.roastState() : g.progress(m); if (!info) return; const name = roast ? info.R.name : MENU[info.s.menu].name, left = info.left;
    const hc = Math.max(1, Math.ceil(left / 120)), job = roast ? info.r : info.s, same = () => (roast ? ST().roast === job : g.mstate(m) === job);   /* 광고 · 확인 사이에 다 되어 새로 시작한 잔을 공짜로 끝내지 않게 */
    const adOk = left >= AD_MIN && this.adLeft('finish') > 0 && (!inOAD || bm.info.ok), heartOk = left >= INST_MIN;
    this.modal(`<h2>${name}</h2><div class="sub">${roast ? '볶는 중' : '내리는 중'} · 남은 시간 ${mmss(left)}</div><div class="pbig"><s style="width:${info.u * 100}%"></s></div>
      ${adOk || heartOk ? `<div class="btns">${adOk ? '<button class="btn ghost" id="fAd">📺 광고로 바로 완성</button>' : ''}${heartOk ? `<button class="btn" id="fH">♥ ${hc}로 바로 완성</button>` : ''}</div>` : '<div class="sub">거의 다 됐어요 · 조금만 기다려요</div>'}${adOk ? `<div class="sub" style="margin-top:12px">광고는 오늘 ${this.adLeft('finish')}번 남음</div>` : ''}<button class="btn ghost" id="mOk">닫기</button>`);
    $('#mOk').onclick = () => this.close();
    if (adOk) $('#fAd').onclick = () => this.ad('finish', () => { if (same()) g.finishNow(roast ? { kind: 'roaster' } : m); });
    if (heartOk) $('#fH').onclick = () => { if (!same()) return this.close(); if (S.hearts < hc) return this.toast('마음(♥)이 모자라요 · 손님을 빨리 받으면 모여요'); S.hearts -= hc; g.finishNow(roast ? { kind: 'roaster' } : m); save(); this.close(); sfx('reward'); }; }
  // ── 정성 한 잔: 꾹 누르는 동안 잔이 차오름 · 금빛에서 떼면 정성 한 잔 · 닫으면 예전처럼 자동 추출
  pullSheet(m, k) {
    const g = this.app.game, d = MENU[k]; if (m.kind === 'oven') return this.brewSheet(m, k);
    if (g.mstate(m)) return this.toast('이미 내리는 중이에요'); if (S.lv < d.lv) return this.toast(`Lv.${d.lv}에 열려요`);
    const n = g.pullCount(k); if (S.beans < d.bean * n) { this.toast(`원두가 모자라요 (${d.bean * n}잔분 필요)`); return setTimeout(() => this.roastSheet(), 600); }
    const z0 = PULL.zoneMin + Math.random() * (PULL.zoneMax - PULL.zoneMin), z1 = z0 + PULL.zone, tk = g.tickets.find(t => t.items.some(it => it.k === k)), help = S.jeong < 3 || S.fg < 3;
    this.close(); const mEl = $('#modal'), W = innerWidth, H = innerHeight;
    mEl.innerHTML = `<div class="mback clear" id="pullB"><div class="pull" id="pull"><div class="ph"><img src="${pic(k)}"><b>${d.name} ×${n}</b>${tk ? `<i>주문 #${tk.no}</i>` : ''}</div>
      <div class="ring" id="ring" style="--z0:${z0};--z1:${z1};--f:0"><div class="rz"></div><div class="rf"></div><div class="rc"><div class="cupv"><s id="liq"></s></div><b id="rcT">추출</b></div>${help ? '<i class="fing">👆</i>' : ''}</div>
      <div class="pl" id="pl">${S.fg < 3 ? '<em>2/3</em> ' : ''}꾹 누르고 · 금빛에서 떼요</div><button class="auto" id="pAuto">그냥 자동으로 · ⏱ ${tlabel(d.t)}</button></div></div>`;
    const v = new THREE.Vector3(m.x, 200, m.z).project(this.app.cam), px = (v.x + 1) / 2 * W, py = (1 - v.y) / 2 * H, el = $('#pull');
    const kz = window.__k || 1, Wk = W / kz, Hk = H / kz; el.style.left = Math.max(8, Math.min(Wk - 258, px / kz - 125)) + 'px'; el.style.top = Math.max(150, Math.min(Hk - 470, py / kz - 40)) + 'px';   /* 창(#modal)은 크기 k 배 */
    const ring = $('#ring'), liq = $('#liq'), t0 = performance.now(); let f = 0, hold = false, done = false, raf = 0, st = 0;
    const set = x => { ring.style.setProperty('--f', x); liq.style.height = Math.min(100, x * 108) + '%'; ring.classList.toggle('in', x >= z0 && x <= z1); };
    const auto = () => { if (done) return; done = true; this.close(); const e = g.brew(m, k); if (e) return this.toast(e); this.toast(`${d.name} 자동으로 내리는 중 · ⏱ ${tlabel(d.t)}`); };
    const loop = () => { if (!hold) return; f = Math.min(1, (performance.now() - st) / 1000 / PULL.fill); set(f); if (f >= 1) return release(); raf = requestAnimationFrame(loop); };
    const release = () => { if (!hold || done) return; hold = false; cancelAnimationFrame(raf); ring.classList.remove('hold');
      if (f < 0.1) { f = 0; set(0); $('#pl').textContent = '손가락을 떼지 말고 꾹 눌러 주세요'; return; }   /* 살짝 톡 누른 건 다시 */
      done = true; const gold = f >= z0 && f <= z1; if (d.cat === 'sig') return this.artStage(m, k, gold, f < z0);
      this.finishPull(m, k, { gold }, f < z0); };
    ring.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); if (done) return; try { ring.setPointerCapture(e.pointerId); } catch { /* */ } hold = true; st = performance.now() - f * PULL.fill * 1000; ring.classList.add('hold'); sfx('build', { vol: 0.28, rate: 1.3 }); loop(); };
    ring.onpointerup = ring.onpointercancel = ring.onlostpointercapture = release;
    $('#pAuto').onclick = e => { e.stopPropagation(); auto(); };
    $('#pullB').onclick = e => { if (e.target.id === 'pullB' && performance.now() - t0 > 400 && !hold) auto(); };
    this._ub = pushBack(() => { auto(); return true; });
    this._pull = { press: () => ring.onpointerdown({ preventDefault() {}, stopPropagation() {}, pointerId: 0 }), release, auto };   /* 시험 도구용 */
  }
  finishPull(m, k, res, early) { const g = this.app.game; this.close(); const r = g.handBrew(m, k, res); if (typeof r === 'string') return this.toast(r); if (S.fg < 1) S.fg = 1; this.praise(r, early); if (res.art && r.artNew) setTimeout(() => this.artCard(res.art, res.artOk, true), 900); }   /* 라떼아트 카드는 도감에 새로 들 때만 (칭찬이 사라진 뒤) */
  /* 칭찬: 정성 한 잔은 금빛 · 빗나가도 따뜻하게 (벌 없음) */
  praise(r, early) { const el = $('#praise');
    el.innerHTML = r.gold ? `<b>✨ 정성 한 잔! <em>♥+1</em></b><small>향 보너스 · 팁 +${fmt(r.tip)}${r.combo > 1 ? ` · 연속 ${r.combo}잔` : ''}</small>`
      : `<b>${['맛있게 내렸어요!', '좋은 한 잔이에요 ☕', '향이 참 좋아요!'][Math.floor(Math.random() * 3)]}</b><small>${early ? '조금만 더 채우면 금빛 · 정성 한 잔' : '금빛에서 살짝 일찍 떼면 정성 한 잔'}</small>`;
    el.className = 'praise on ' + (r.gold ? 'gold' : 'soft'); clearTimeout(this._prt); this._prt = setTimeout(() => el.classList.remove('on'), r.gold ? 1600 : 1100); }
  /* 라떼아트: 시그니처 마무리 · 모양 하나를 한 번 쓱 · 넉넉히 판정, 못 그려도 하트 */
  artStage(m, k, gold, early) {
    const shapes = Object.keys(ART), shape = shapes[Math.floor(Math.random() * shapes.length)], A = ART[shape], el = $('#pull'); if (!el) return this.finishPull(m, k, { gold }, early);
    el.classList.add('art'); el.innerHTML = `<div class="ph"><img src="${artIcon(shape)}"><b>라떼아트 한 번 <em>쓱</em></b><i>${A.name}</i></div><canvas id="artCv" width="440" height="440"></canvas><div class="pl" id="pl">점선을 따라 한 번 그어요 · 대충 그어도 돼요</div><button class="auto" id="pAuto">하트로 마무리</button>`;
    const cv = $('#artCv'), x = cv.getContext('2d'), Wc = 440, pts = []; let drawing = false, fin = false;
    const base = () => { drawCup(x, Wc); drawArt(x, Wc, shape, 'guide'); }; base();
    const end = ok => { if (fin) return; fin = true; const got = ok ? shape : 'heart'; drawCup(x, Wc); drawArt(x, Wc, got, 'done'); sfx(ok ? 'reward' : 'blip', { vol: 0.45 }); setTimeout(() => this.finishPull(m, k, { gold, art: got, artOk: ok }, early), 520); };
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * Wc, (e.clientY - r.top) / r.height * Wc]; };
    cv.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); if (fin) return; try { cv.setPointerCapture(e.pointerId); } catch { /* */ } drawing = true; pts.length = 0; base(); pts.push(pos(e)); };
    cv.onpointermove = e => { if (!drawing) return; const p = pos(e), q = pts[pts.length - 1]; pts.push(p); x.strokeStyle = '#FFF8EE'; x.lineWidth = 26; x.lineCap = 'round'; x.beginPath(); x.moveTo(q[0], q[1]); x.lineTo(p[0], p[1]); x.stroke(); };
    cv.onpointerup = cv.onpointercancel = () => { if (!drawing) return; drawing = false; let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (len < 60) { base(); return; }
      const c = Wc / 2, R = c * 0.62, G = artPts(shape, 48).map(([a, b]) => [c + a * R, c + b * R]); const hit = G.filter(([a, b]) => pts.some(([p, q]) => Math.hypot(p - a, q - b) < 52)).length / G.length; end(hit >= 0.32 || len > 900); };   /* 넉넉한 판정: 점선 1/3 정도만 지나도 성공 */
    $('#pAuto').onclick = e => { e.stopPropagation(); end(false); };
    $('#pullB').onclick = e => { if (e.target.id === 'pullB') end(false); };
    this._ub && this._ub(); this._ub = pushBack(() => { end(false); return true; });
    this._art = { draw: ok => end(ok) };   /* 시험 도구용 */
  }
  artCard(shape, ok, isNew) { const el = $('#artCard'), A = ART[shape], n = S.art[shape] || 1;
    el.innerHTML = `<img src="${artIcon(shape)}"><div><b>라떼아트 한 번 <em>쓱</em></b><span>${A.say}</span><small>${ok ? (isNew ? `📖 도감에 새로 기록! (${Object.keys(S.art).length}/${Object.keys(ART).length})` : `${A.name} ${n}번째 · 솜씨가 늘어요`) : '못 그려도 하트로 마무리 ♥'}</small></div>`;
    el.classList.add('on'); clearTimeout(this._act); this._act = setTimeout(() => el.classList.remove('on'), 2600); }
  delivered(by) { if (by === 'barista' || S.fg >= 3) return; S.fg = 3; save(); setTimeout(() => this.toast('잘했어요! 손님이 진동벨을 듣고 가지러 와요 ♥'), 300); }
  /* 손편지 · 오늘의 시 */
  bigBusy() { return ['#praise', '#poemCard', '#artCard', '#letterC'].some(q => $(q).classList.contains('on')) || !!$('#modal').firstChild; }   /* 큰 카드는 한 번에 하나만 */
  letter(line, byStaff) { if (byStaff || this.bigBusy()) return this.float(`💌 손편지 ♥+1`, this.app.game.owner.pos.clone().setY(260), 'heart'); const el = $('#letterC'); el.innerHTML = `<i>💌</i><div><small>${byStaff ? '도윤이 테이블에서 가져온 ' : ''}손님의 손편지 · ♥+1</small><p>“${line}”</p></div>`; el.classList.add('on'); clearTimeout(this._lt); this._lt = setTimeout(() => el.classList.remove('on'), 2400); sfx('reward', { vol: 0.35 }); }
  poemTick(ch) { const L = poemLen(POEMS[S.poem.i % POEMS.length]), n = S.poem.n; this.progress(); const p = $('#poemP'); p.classList.remove('tick'); void p.offsetWidth; p.classList.add('tick'); }   /* 글자가 찰 때는 아래 시 한 줄만 반짝 (큰 카드는 다 찼을 때 · 눌렀을 때만) */
  poemCard(force, doneLine, bonus) { const el = $('#poemCard'), line = doneLine || POEMS[S.poem.i % POEMS.length], n = doneLine ? poemLen(line) : S.poem.n, L = poemLen(line);
    el.innerHTML = `<small>${doneLine ? '오늘의 시 완성 · 벽에 걸었어요' : '오늘의 시 한 줄 · 손님 마음이 맑아질 때마다 한 글자'}</small><p>${this.poemChars(line, n)}</p><div class="pb"><s style="width:${(n + (doneLine ? 0 : (S.poem.p || 0) / POEM_PER)) / L * 100}%"></s></div>${doneLine ? `<em>♥+3 · +${fmt(bonus)} · 모은 시 ${S.poems.length}편</em>` : `<em>${L - n}글자 남았어요${S.poems.length ? ` · 모은 시 ${S.poems.length}편` : ''}</em>`}`;
    el.className = 'poemcard on' + (doneLine ? ' done' : ''); clearTimeout(this._pct); this._pct = setTimeout(() => el.classList.remove('on'), doneLine ? 3800 : force ? 3000 : 2200); }
  poemDone(line, bonus) { this.poemCard(false, line, bonus); sfx('reward', { vol: 0.5 }); }
  // ── 로스터
  roastSheet() {
    const g = this.app.game, r = g.roastState(); if (r) return r.u >= 1 ? g.collectBeans() : this.brewing(g.roaster);
    const broke = g.broke(), left = g.cheerLeft();   /* 바닥이면 하우스 블렌드는 외상 · 응원 선물이 남았으면 맨 위에 */
    const md = this.modal(`<h2>원두 볶기</h2><div class="sub">지금 원두 ${fmt(S.beans)} / ${BEAN_MAX}잔분 · 볶는 동안 나가 있어도 계속 볶아져요${broke ? '<br>원두가 바닥났어요 · 하우스 블렌드는 외상으로 볶고 다음 매출에서 갚아요' : ''}${S.owe ? `<br>갚을 외상 ${fmt(S.owe)}` : ''}</div>
      <div class="uplist">${broke && left ? `<div class="upr cheerr"><i>🎁</i><div><b>응원 선물 <em>+${CHEER.beans}잔분</em></b><span>오늘 ${left}번 남았어요 · 바로 담아 드려요</span></div><button class="btn sm" id="chR">받기</button></div>` : ''}${ROAST.map(R => { const lock = S.lv < R.lv, c = R.cost * storeMult(), owe = !lock && R.id === ROAST[0].id && broke; return `<div class="upr ${lock ? 'lock' : ''}"><i>🫘</i><div><b>${R.name} <em>+${R.beans}잔분</em></b><span>${R.desc} · ⏱ ${tlabel(R.t)}</span></div><button class="btn sm ${lock || (!owe && S.coins < c) ? 'off' : ''}" data-r="${R.id}">${lock ? `Lv.${R.lv}` : owe ? '외상으로' : `<i class="c"></i>${fmt(c)}`}</button></div>`; }).join('')}</div><button class="btn ghost" id="mOk">닫기</button>`);
    $('#mOk').onclick = () => this.close(); if ($('#chR')) $('#chR').onclick = () => { this.close(); if (g.cheerGive()) this.toast('응원 원두를 담았어요 · 주문표를 눌러 이어서 내려요 ☕'); };
    md.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { const e = g.roast(b.dataset.r); if (e) return this.toast(e); this.close(); if (!S.owe || b.dataset.r !== ROAST[0].id) this.toast('원두를 볶기 시작했어요'); });
  }
  // ── 메뉴 (바 진열 · 판매)
  menuBook() {
    const list = Object.entries(MENU).map(([k, d]) => { const lock = S.lv < d.lv, n = ST().bar[k] || 0; return `<div class="upr ${lock ? 'lock' : ''}"><img class="th" src="${pic(k)}"><div><b>${d.name} ${n ? `<em>바에 ${n}잔</em>` : ''}</b><span>${lock ? `Lv.${d.lv}에 열려요` : `₩${fmt(d.price * storeMult())} · ⏱ ${tlabel(d.t)} · 지금까지 ${fmt(S.menuSold[k] || 0)}잔`}</span></div></div>`; }).join('');
    const arts = Object.entries(ART).map(([k, A]) => `<div class="dk ${S.art[k] ? '' : 'lock'}"><img src="${artIcon(k)}"><b>${S.art[k] ? A.name : '?'}</b><small>${S.art[k] ? `${S.art[k]}번` : '시그니처 마무리'}</small></div>`).join('');
    const poems = S.poems.length ? S.poems.map(l => `<p class="pm">「${l}」</p>`).join('') : '<p class="sm">손님 마음이 맑아질 때마다 한 글자씩 · 다 차면 벽에 걸려요</p>';
    const m = this.modal(`<h2>☕ 메뉴 · 도감</h2><div class="sub">주문표를 누르면 손으로 바로 내려요 · 금빛에서 떼면 정성 한 잔 (지금까지 ${fmt(S.jeong)}잔 · 최고 연속 ${S.best}잔)</div><div class="uplist"><h3>라떼아트 도감 ${Object.keys(S.art).length}/${Object.keys(ART).length}</h3><div class="dex">${arts}</div><h3>오늘의 시 · 모은 시 ${S.poems.length}편</h3>${poems}<h3>메뉴</h3>${list}</div><button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close();
  }
  // ── 단골
  regulars() {
    const html = REGULARS.map(R => { const r = S.reg[R.id], met = !!r, open = S.lv >= R.lv, ep = r?.ep || 0, f = r?.f || 0;
      return `<div class="reg ${met ? '' : 'lock'}"><i class="av" style="background:#${R.body.toString(16).padStart(6, '0')}">${met ? R.name[0] : '?'}</i><div><b>${met ? R.name : '아직 모르는 손님'} <small>${met ? R.who : open ? '곧 찾아와요' : `Lv.${R.lv}부터 찾아와요`}</small></b>
        <div class="hearts">${Array.from({ length: 5 }, (_, i) => `<s class="${i < ep ? 'on' : ''}">♥</s>`).join('')}<span>${ep}/5화 · 호감 ${f}/${FAVOR_MAX}</span></div>${met ? R.eps.slice(0, ep).map((e, i) => `<p>${i + 1}화 “${e.say}”</p>`).join('') : ''}${ep >= 5 ? `<p class="poem">🖼 「${R.poem.replace('/', ' ')}」 액자를 받았어요</p>` : met ? '<p class="lk">다음 이야기는 내일 · 하루 한 번 찾아와요</p>' : ''}</div></div>`; }).join('');
    for (const R of REGULARS) if (S.lv >= R.lv && !S.reg[R.id]) { /* 열렸다는 표시만 끔 */ } const m = this.modal(`<h2>💌 단골손님</h2><div class="sub">하루 한 번 찾아와 이야기를 들려줘요 · 5화를 다 들으면 그 사람의 「시 한 줄」 액자</div><div class="uplist">${html}</div><button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close();
  }
  story(c) {
    const R = c.reg, r = S.reg[R.id] || { ep: 0 }, ep = R.eps[r.ep]; if (!ep) return; sfx('tap');
    const m = this.modal(`<div class="story"><div class="hd"><i class="av big" style="background:#${R.body.toString(16).padStart(6, '0')}">${R.name[0]}</i><span class="ep">단골 사연 · ${r.ep + 1}화</span><div class="who"><small>${R.who}</small><b>${R.name}</b></div></div>
      <div class="bd"><p>“${ep.say}”</p><div class="q">${ep.ask}</div><div class="choice">${ep.ch.map((ch, i) => `<button data-i="${i}">${ch[0]}${ch[1] ? `<img src="${pic(ch[1])}">` : ''}</button>`).join('')}</div></div></div>`, 'storym');
    m.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const ch = ep.ch[+b.dataset.i]; this.app.game.storyDone(c, ch); this.close(); sfx(ch[2] >= 3 ? 'reward' : 'blip');
      this.toast(ch[2] >= 3 ? `${R.name}의 마음에 닿았어요 ♥♥♥` : ch[2] >= 2 ? `${josa(R.name, '이', '가')} 미소 지어요 ♥♥` : ch[2] ? `${josa(R.name, '이', '가')} 고개를 끄덕여요 ♥` : `${josa(R.name, '이', '가')} 조용히 창밖을 봐요`); });
  }
  // ── 꾸미기 모드
  decoEnter() { const g = this.app.game; if (g.deco) return; g.decoStart(); this._fc = this._fc || 'table'; this.decoBar(null); this._decoUb = pushBack(() => { this.decoExit(); return true; }); this.toast('가구를 고르거나, 놓인 가구를 눌러 옮겨요'); }
  decoExit() { this.app.game.decoEnd(); $('#decobar').innerHTML = ''; this._decoUb && this._decoUb(); this._decoUb = null; }
  decoBar(gh) {
    const g = this.app.game, bar = $('#decobar'); if (!g.deco) { bar.innerHTML = ''; return; }
    if (gh) { const d = FURN[gh.id], price = gh.moving ? '옮기는 중' : S.inv[gh.id] ? '보관함에서' : d.heart ? `♥ ${d.heart}` : `<i class="c"></i>${fmt(d.cost * storeMult())}`;
      bar.innerHTML = `<div class="gh"><b>${d.name}</b><span>${gh.err ? `<em class="err">${gh.err}</em>` : `감성 +${d.score} · ${price}`}</span></div><div class="ghb"><button id="gRot">↻ 돌리기</button>${gh.moving ? '<button id="gSto">보관</button>' : ''}<button id="gCan">취소</button><button id="gOk" class="ok ${gh.err ? 'off' : ''}">놓기</button></div><p class="tip">바닥을 누르거나 가구를 끌어서 옮겨요</p>`;
      $('#gRot').onclick = () => g.ghostRotate(); $('#gCan').onclick = () => g.ghostCancel(); if ($('#gSto')) $('#gSto').onclick = () => { g.storeFurn(); this.toast('보관함에 넣었어요'); };
      $('#gOk').onclick = () => { const e = g.ghostConfirm(() => this.payFurn(gh.id)); if (e) this.toast(e); }; return; }
    const items = Object.entries(FURN).filter(([k, d]) => d.cat === this._fc && !d.gift);
    const inv = Object.entries(S.inv).filter(([k, n]) => n > 0 && (FURN[k] || k.startsWith('poem:')));
    bar.innerHTML = `<div class="dtop"><b>🪑 꾸미기</b><span>감성 지수 ${g.score()} · 높을수록 손님이 자주 와요</span><button id="dEnd">완료</button></div>
      <div class="tabs">${FURN_CATS.map(([k, t]) => `<button data-fc="${k}" class="${k === this._fc ? 'on' : ''}">${t}</button>`).join('')}${inv.length ? `<button data-fc="inv" class="${this._fc === 'inv' ? 'on' : ''}">보관함 ${inv.length}</button>` : ''}</div>
      <div class="fl">${this._fc === 'inv' ? inv.map(([k, n]) => `<div class="fi" data-inv="${k}"><i>${k.startsWith('poem:') ? '🖼' : '📦'}</i><b>${k.startsWith('poem:') ? `${REGULARS.find(r => r.id === k.slice(5))?.name}의 시` : FURN[k].name}</b><span>×${n}</span></div>`).join('') || '<p>비어 있어요</p>'
        : items.map(([k, d]) => { const lock = S.lv < d.lv, c = d.heart ? `♥${d.heart}` : `<i class="c"></i>${fmt(d.cost * storeMult())}`; return `<div class="fi ${lock ? 'lock' : ''}" data-f="${k}"><i>${{ table: '🪑', green: '🪴', stone: '🪨', light: '💡', deco: '🧺', wall: '🖼' }[d.cat]}</i><b>${d.name}</b><span>${lock ? `🔒 Lv.${d.lv}` : `${c} · 감성+${d.score}`}</span></div>`; }).join('')}</div>`;
    $('#dEnd').onclick = () => this.decoExit(); bar.querySelectorAll('[data-fc]').forEach(b => b.onclick = () => { this._fc = b.dataset.fc; this.decoBar(null); });
    bar.querySelectorAll('[data-f]:not(.lock)').forEach(b => b.onclick = () => { const k = b.dataset.f, d = FURN[k]; if (d.wall) return this.buyWall(k); g.ghostNew(k); });
    bar.querySelectorAll('[data-inv]').forEach(b => b.onclick = () => { const k = b.dataset.inv; if (k.startsWith('poem:') || FURN[k]?.wall) return this.hangWall(k, true); g.ghostNew(k); });
  }
  payFurn(id) { const d = FURN[id]; if (S.inv[id] > 0) { S.inv[id]--; return true; } if (d.heart) { if (S.hearts < d.heart) return false; S.hearts -= d.heart; return true; } const c = d.cost * storeMult(); if (S.coins < c) return false; S.coins -= c; return true; }
  buyWall(id) { const d = FURN[id], c = d.heart ? d.heart : d.cost * storeMult(); if (d.heart ? S.hearts < c : S.coins < c) return this.toast(d.heart ? '마음(♥)이 모자라요' : '돈이 모자라요'); if (d.heart) S.hearts -= c; else S.coins -= c; this.hangWall(id, false); }
  hangWall(id, fromInv) { const st = ST(), k = WALL_SLOTS.findIndex((_, i) => !st.wall[i]); if (k < 0) { if (!fromInv) S.inv[id] = (S.inv[id] || 0) + 1; save(); this.decoBar(null); return this.toast('빈 벽이 없어요 · 걸린 액자를 눌러 보관하세요'); }
    if (fromInv) S.inv[id]--; st.wall[k] = id; this.app.game.refreshWalls(); sfx('unlock', { vol: 0.6 }); save(); this.decoBar(null); this.toast('벽에 걸었어요'); this.progress(); }
  wallMenu(slot) { const st = ST(), id = st.wall[slot]; if (!id) return; delete st.wall[slot]; S.inv[id] = (S.inv[id] || 0) + 1; this.app.game.refreshWalls(); save(); this.decoBar(null); this.toast('보관함에 넣었어요 · 보관함에서 다시 걸 수 있어요'); }
  // ── 주문서 · 출석 · 쿠폰
  orders() {
    dayTick(); const html = S.orders.map((o, i) => { const n = Math.min(o.n, S.soldBy[o.menu] || 0), ok = n >= o.n, rw = Math.round(MENU[o.menu].price * o.n * 1.5 * storeMult());
      return `<div class="upr ${o.done ? 'own' : ''}"><img class="th" src="${pic(o.menu)}"><div><b>${o.who}</b><span>${MENU[o.menu].name} ${o.n}잔 · 오늘 ${n}/${o.n}</span><div class="pb"><s style="width:${n / o.n * 100}%"></s></div></div><button class="btn sm ${ok && !o.done ? '' : 'off'}" data-o="${i}">${o.done ? '완료' : `<i class="c"></i>${fmt(rw)} ♥3`}</button></div>`; }).join('');
    const m = this.modal(`<h2>📜 오늘의 주문서</h2><div class="sub">오늘 팔면 채워져요 · 내일 새 주문서</div><div class="uplist">${html}</div><button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close();
    m.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = S.orders[+b.dataset.o]; if (o.done) return this.toast('이미 받은 주문서예요'); if ((S.soldBy[o.menu] || 0) < o.n) return this.toast(`${MENU[o.menu].name} ${o.n - (S.soldBy[o.menu] || 0)}잔 더 팔면 받아요`); o.done = true; const rw = Math.round(MENU[o.menu].price * o.n * 1.5 * storeMult()); S.coins += rw; S.hearts += 3; this.app.game.gainXp(10); save(); sfx('reward'); this.toast(`${o.who} 주문 완료! +${fmt(rw)} ♥3`); this.orders(); });
  }
  orderReady(o) { if (o._told) return; o._told = 1; this.toast(`📜 ${o.who} 주문을 채웠어요! 주문서에서 받기`); }
  attendance() {
    const t = today(), got = S.att.last === t, y = new Date(Date.now() - 864e5), yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    const streak = got ? S.att.streak : (S.att.last === yk ? S.att.streak : 0), day = got ? streak : streak + 1, RW = [[60, 1], [80, 2], [100, 2], [140, 3], [180, 3], [240, 4], [400, 8]];
    const html = RW.map(([c, h], i) => `<div class="att ${i < (got ? streak : streak) % 7 || (got && i === (streak - 1) % 7) ? 'got' : ''} ${!got && i === (day - 1) % 7 ? 'now' : ''}"><small>${i + 1}일</small><b>${i === 6 ? '🎁' : '☕'}</b><span>${fmt(c * storeMult())}<br>♥${h}</span></div>`).join('');
    const m = this.modal(`<h2>🎁 출석</h2><div class="sub">매일 들르면 선물 · 7일째는 크게 · ${got ? `오늘 받았어요 (연속 ${streak}일)` : `오늘 ${day}일째`}</div><div class="atts">${html}</div><button class="btn ${got ? 'off' : ''}" id="aGo">${got ? '내일 또 만나요' : '받기'}</button><button class="btn ghost" id="mOk">닫기</button>`);
    $('#mOk').onclick = () => this.close(); $('#aGo').onclick = () => { if (got) return this.toast('오늘 선물은 받았어요 · 내일 또 만나요'); const [c, h] = RW[(day - 1) % 7]; S.coins += c * storeMult(); S.hearts += h; S.att = { last: t, streak: day }; save(); sfx('reward'); this.toast(`출석 ${day}일째! +${fmt(c * storeMult())} ♥${h}`); this.progress(); this.attendance(); };
  }
  coupon() { if (S.coupon) return this.showCoupon(S.coupon); if (!couponReady()) return this.modal(`<h2>🎟 매장 쿠폰</h2><p>오늘 <b>${COUPON.goal}잔</b>을 내어 주면<br>실제 감성커피 매장에서 쓸 수 있는 쿠폰을 드려요.</p><div class="cpbig">${S.sold} / ${COUPON.goal}</div><p class="sm">${COUPON.text}</p><button class="btn" id="mOk">계속하기</button>`), $('#mOk').onclick = () => this.close();
    const c = claimCoupon(); sfx('reward'); this.showCoupon(c); this.progress(); }
  showCoupon(c) { this.modal(`<div class="ticket"><small>${BRAND.name}</small><b>${COUPON.text}</b><div class="code">${c.code}</div><span>매장 직원에게 이 화면을 보여 주세요 · ${COUPON.valid}</span></div><button class="btn" id="mOk">확인</button>`); $('#mOk').onclick = () => this.close(); }
  // ── 가게: 매장 · 동료
  shop() {
    const g = this.app.game, tab = this._st || 'store';
    const stores = STORES.map((s, i) => { const open = !!S.stores[i], can = S.lv >= s.lv; return `<div class="store ${i === S.si ? 'cur' : ''} ${can ? '' : 'lock'}" data-s="${i}"><img src="assets/brand/${s.photo}.jpg"><div><b>${s.name}</b><small>${s.city} · 값 ×${s.mult}</small><span>${i === S.si ? '지금 여기' : open ? '가기 ›' : can ? '새로 열기 ›' : `Lv.${s.lv}에 열려요`}</span><p>${s.desc}</p></div></div>`; }).join('');
    /* 동료: 고용 = 1단계 → 5단계 · 단계마다 지금 효과와 다음 효과 한 줄 (급여 없음) */
    const staff = Object.entries(STAFF).map(([k, d]) => { const l = g.lvOf(k), lock = S.lv < d.lv, max = l >= STAFF_UP.max, c = l ? g.upgradeCost(k) : d.cost, off = lock || max || S.coins < c;
      return `<div class="upr staff ${lock ? 'lock' : ''}"><i class="av" style="background:#${d.body.toString(16).padStart(6, '0')};color:#3B2A20">${d.name.slice(-2, -1)}</i><div><b>${d.name}${l ? ` <em>${l}단계</em>` : ''}</b>${l ? '' : `<span>${d.desc}</span>`}${l ? `<div class="pips">${Array.from({ length: STAFF_UP.max }, (_, i) => `<s class="${i < l ? 'on' : ''}"></s>`).join('')}</div><span class="now">${d.up(l)}</span>${max ? '' : `<span>다음 단계 → ${d.up(l + 1)}</span>`}` : ''}</div>
        <button class="btn sm ${off ? 'off' : ''}" ${l ? `data-u="${k}"` : `data-h="${k}"`}>${lock ? `Lv.${d.lv}` : max ? '최고 단계' : `${l ? '단계 ↑ ' : ''}<i class="c"></i>${fmt(c)}`}</button></div>`; }).join('');
    const m = this.modal(`<h2>🗺️ 가게</h2><div class="tabs"><button data-t="store" class="${tab === 'store' ? 'on' : ''}">감성커피 매장</button><button data-t="staff" class="${tab === 'staff' ? 'on' : ''}">동료</button></div>
      <div class="uplist">${tab === 'store' ? stores : staff}</div><p class="sm">${tab === 'store' ? '게임 속 매장은 실제 감성커피 매장이에요 · 레벨과 원두는 함께, 가구와 진열은 매장마다' : `처음엔 혼자 시작해요 · 레벨이 오르면 함께할 동료가 생겨요 · 급여는 없어요${g.staffCount() < OFFLINE.need ? ` · 동료가 ${OFFLINE.need}명이면 쉬는 동안에도 가게를 지켜요` : ' · 쉬는 동안에도 가게를 지켜요'}`}</p><button class="btn ghost" id="mOk">닫기</button>`);
    $('#mOk').onclick = () => this.close(); m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { this._st = b.dataset.t; this.shop(); });
    m.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { const e = g.hire(b.dataset.h); if (e) return this.toast(e); sfx('reward'); this.shop(); });
    m.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const k = b.dataset.u, e = g.upgradeStaff(k); if (e) return this.toast(e); this.toast(`${STAFF[k].name.split('· ')[1]} ${g.lvOf(k)}단계 · ${STAFF[k].up(g.lvOf(k))}`); this.shop(); });   /* 말없이 거절하지 않기 */
    m.querySelectorAll('.store:not(.lock)').forEach(b => b.onclick = () => { const i = +b.dataset.s; if (i === S.si) return; if (!S.stores[i]) S.stores[i] = newStore(); S.si = i; save(true); this.close(); g.build(); this.toast(`${STORES[i].name}에 왔어요`); sfx('levelup'); });
  }
  // ── 레벨 오름
  levelUp(lv) {
    const un = [...Object.values(MENU).filter(d => d.lv === lv).map(d => `☕ ${d.name}`), ...ROAST.filter(r => r.lv === lv).map(r => `🫘 ${r.name}`), ...Object.values(FURN).filter(d => d.lv === lv && !d.gift).map(d => `🪑 ${d.name}`),
      ...Object.entries({ espresso: '에스프레소 머신', oven: '디저트 오븐' }).filter(([k]) => machineCountAt(k, lv) > machineCountAt(k, lv - 1)).map(([, n]) => `✨ ${n} +1`), ...Object.values(STAFF).filter(d => d.lv === lv).map(d => `👋 ${d.name}`), ...REGULARS.filter(r => r.lv === lv).map(r => `💌 새 단골 ${r.name}`), ...STORES.filter(s => s.lv === lv).map(s => `🗺️ ${s.name}`)];
    this.app.game.confetti(100, 300, -300);
    const show = () => { if ($('#pull')) return setTimeout(show, 900); const m = this.modal(`<div class="lvup"><small>LEVEL UP</small><b>Lv.${lv}</b><p>정성이 쌓여 가게가 한 뼘 자랐어요</p>${un.length ? `<ul>${un.map(u => `<li>${u}</li>`).join('')}</ul>` : ''}</div><button class="btn" id="mOk">좋아요</button>`); $('#mOk').onclick = () => this.close(); }; setTimeout(show, 500);   /* 추출 중이면 끝난 뒤에 */
  }
  welcome(away) {
    const g = this.app.game, earn = g.offlineEarn(away); if (earn > 0) return this.awayCard(earn, away);
    const done = g.machines.filter(m => { const p = g.progress(m); return p && p.u >= 1; }).length, r = g.roastState();
    if (away > 300 && (done || (r && r.u >= 1))) this.toast(`자리를 비운 사이 ${done ? `메뉴 ${done}개` : ''}${done && r && r.u >= 1 ? ' · ' : ''}${r && r.u >= 1 ? '원두' : ''} 준비 완료!`);
    if (S.fg < 3 && S.xp === 0) this.toast('영도대교점, 오늘 문을 열어요 ☕');   /* 글 안내 대신 손가락 안내 (finger) */
  }
  /* 쉬는 동안 번 돈 (동료 OFFLINE.need 명 이상): 받는 돈은 창이 뜰 때 바로 들어감(창을 그냥 닫아도 안 잃음) · 광고를 보면 한 번 더 (원어데이 안에서만 버튼) */
  awayCard(v, away) { const g = this.app.game; S.coins += v; save(); this.progress(); sfx('coin', { vol: 0.5 });
    const who = Object.keys(STAFF).filter(k => S.staff[k]).map(k => STAFF[k].name.split('· ')[1]), names = who.length > 2 ? `${who.slice(0, -1).join(' · ')} · ${who[who.length - 1]}` : who.join(' · ');
    this.modal(`<div class="away"><i>☕</i><small>쉬는 동안 · ${mmss(Math.round(Math.min(away, OFFLINE.cap)))}</small><b>${josa(names, '이', '가')} 가게를 지켰어요</b><p>오늘도 문을 열어 둔 덕분에 손님이 쉬어 갔어요</p><em><i class="c"></i>+${fmt(v)}</em></div>
      <button class="btn" id="awAd" hidden>📺 광고 보고 한 번 더 +${fmt(v)}</button><button class="btn ghost" id="awOk">좋아요</button>`);
    $('#awOk').onclick = () => this.close();
    bm.hello().then(h => { const b = $('#awAd'); if (b && h.ok && h.ads && h.ads.reward && this.adLeft('offline') > 0) b.hidden = false; });   /* 원어데이 밖 · 광고 다 씀 = 버튼 없음 */
    $('#awAd').onclick = async () => { if (this._adBusy) return; const b = $('#awAd'); b.disabled = true; const ok = await this.ad('offline');
      if (ok) { S.coins += v; save(); this.progress(); this.close(); this.toast(`2배로 받았어요 · 모두 +${fmt(v * 2)}`); } else if (b.isConnected) b.disabled = false; }; }
  // ── 광고 보상 (2026-10-29 · 마루미와 같은 방식)
  //    원어데이 안 = 원어데이 광고(bm.rewardedAd — 광고 창 · 그룹 · 앱 한도는 앱이) · 밖(단독 · 개발 서버) = 시험용 3초 창
  //    보상은 한 번만(_adBusy) · 남은 시간은 Date.now 기준(백그라운드 다녀와도 그대로) · 그만두기 · 바깥 · 뒤로 · 다른 창이 덮으면 취소 · 돌려주는 값: 보상을 줬으면 true
  adLeft(kind) { const a = this.adDay(), cap = Math.max(0, (AD_DAY[kind] || 0) - (a[kind] || 0)); if (!inOAD) return cap; const i = bm.info; if (!i.ok) return 0; const L = i.ads && Number.isFinite(i.ads.rewardLeft) ? i.ads.rewardLeft : cap; return Math.min(cap, L); }
  adDay() { if (!S.adUse || S.adUse.day !== today()) S.adUse = { day: today() }; return S.adUse; }
  async ad(kind, done) {
    if (this._adBusy) return false;
    if (kind === 'boost' && this.app.game.boostUntil > now()) { this.toast('손님 2배가 이미 켜져 있어요'); return false; }
    if (this.adLeft(kind) <= 0) { this.toast('오늘 볼 수 있는 광고를 다 봤어요 · 내일 또 만나요'); return false; }
    this._adBusy = true;
    try {
      const h = await bm.hello();
      const ok = h.ok ? await this.oadAd(kind) : inOAD ? false : await this.testAd(kind);
      if (!ok) return false;
      this.adDay()[kind] = (this.adDay()[kind] || 0) + 1; save(true); sfx('reward');
      if (kind === 'boost') { this.app.game.boostUntil = now() + 180000; this.toast('3분 동안 손님 2배!'); }
      try { done && done(); } catch (e) { console.error(e); }
      return true;
    } finally { this._adBusy = false; }
  }
  async oadAd(kind) {
    const r = await bm.rewardedAd(PLACE[kind]); if (r.ok) { if (kind === 'finish') this.close(); return true; }
    if (r.reason === 'limit') this.toast('오늘 볼 수 있는 광고를 다 봤어요 · 내일 또 만나요');
    else if (r.reason === 'off') this.toast('지금은 광고 보상이 없어요');
    else if (r.reason !== 'cancel') this.toast('광고를 불러오지 못했어요 · 잠시 뒤 다시 해 주세요');
    return false;
  }
  testAd(kind) {
    const what = kind === 'boost' ? '3분 동안 손님 2배' : kind === 'offline' ? '쉬는 동안 번 돈 한 번 더' : '바로 완성';
    return new Promise(res => {
      const end = Date.now() + 3000; let fin = false, tm = 0;
      const stop = ok => { if (fin) return; fin = true; clearInterval(tm); removeEventListener('visibilitychange', tick); res(ok); };
      const tick = () => { if (fin) return; if (!$('#adbox')) return stop(false);   /* 바깥 · 뒤로 · 다른 창이 덮음 = 취소 (덮은 창은 그대로) */
        const n = Math.max(0, Math.ceil((end - Date.now()) / 1000)), e = $('#adc'); if (e) e.textContent = n;
        if (n <= 0) { this.close(); stop(true); } };
      this.modal(`<h2>📺 광고 보고 받기</h2><p><b>${what}</b></p><div class="adbox" id="adbox"><span>광고 (시험용)</span><em id="adc">3</em></div><button class="btn ghost" id="adNo">그만두기</button>`);
      $('#adNo').onclick = () => this.close();
      tm = setInterval(tick, 250); addEventListener('visibilitychange', tick);
    });
  }
  settings() {
    const slot = n => { try { const v = JSON.parse(localStorage.getItem(SLOT + n) || 'null'); if (!v) return ''; const d = JSON.parse(v.d), t = new Date(v.at); return `Lv.${levelOf(d.xp || 0)} · ${fmt(d.coins || 0)} · ${t.getMonth() + 1}/${t.getDate()} ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`; } catch { return ''; } };
    const m = this.modal(`<h2>⚙️ 설정</h2><div class="tg"><button data-k="sfx" class="${S.set.sfx ? 'on' : ''}">효과음</button><button data-k="bgm" class="${S.set.bgm ? 'on' : ''}">배경음</button></div>
      <p class="sm">${GAME.title}<br>“${BRAND.slogan}” · 감 · 느끼는 마음 / 성 · 한결같은 정성<br>메뉴 · 매장 사진 ${BRAND.name} 공개 자료</p><a class="btn ghost" href="${BRAND.site}" target="_blank" rel="noopener">감성커피 알아보기</a>
      <div class="dev"><b>🧪 테스트 도구 (출시 전에만)</b>${[1, 2, 3].map(n => { const v = slot(n); return `<div class="slot"><span>슬롯 ${n}<small>${v || '비어 있음'}</small></span><button class="btn sm" data-sv="${n}">저장</button><button class="btn sm ${v ? '' : 'off'}" data-ld="${n}">불러오기</button></div>`; }).join('')}
      <div class="btns"><button class="btn sm" id="dvMoney">돈 +5,000 · ♥+50 · 원두+200</button><button class="btn sm" id="dvXp">레벨 +1</button><button class="btn sm danger" id="dvReset">처음부터</button></div></div><button class="btn ghost" id="mOk">닫기</button>`);
    m.querySelectorAll('.tg button').forEach(b => b.onclick = () => { S.set[b.dataset.k] = !S.set[b.dataset.k]; setAudio(S.set); save(); b.classList.toggle('on'); }); $('#mOk').onclick = () => this.close();
    m.querySelectorAll('[data-sv]').forEach(b => b.onclick = () => { save(true); try { localStorage.setItem(SLOT + b.dataset.sv, JSON.stringify({ at: Date.now(), d: localStorage.getItem('gamsung_v1') })); } catch { /* */ } this.toast(`슬롯 ${b.dataset.sv}에 저장했어요`); this.settings(); });
    m.querySelectorAll('[data-ld]').forEach(b => b.onclick = () => { const v = JSON.parse(localStorage.getItem(SLOT + b.dataset.ld) || 'null'); if (!v) return; localStorage.setItem('gamsung_v1', v.d); window.__noSave = true; location.reload(); });
    $('#dvMoney').onclick = () => { S.coins += 5000; S.hearts += 50; S.beans = Math.min(BEAN_MAX, S.beans + 200); save(); this.toast('돈 · 마음 · 원두를 채웠어요'); };
    $('#dvXp').onclick = () => { const need = XP[S.lv] ?? S.xp; this.app.game.gainXp(Math.max(1, need - S.xp)); this.close(); };
    $('#dvReset').onclick = () => { if (!confirm('지금 진행이 모두 지워져요. 처음부터 할까요? (슬롯은 그대로)')) return; localStorage.removeItem('gamsung_v1'); window.__noSave = true; location.reload(); };
  }
}
const machineCountAt = (k, lv) => MACHINES[k].filter(l => lv >= l).length;
