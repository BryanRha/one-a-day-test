// 화면 정보와 창: 돈 · 지점 진행 · 쿠폰 · 광고 ×2 · 미션 · 지점 지도 · 설정 · 열기 칸 글자 · +돈 글자 · 조이스틱
import * as THREE from 'three';
import { BRAND, GAME, BRANCHES, COUPON, MENU, UPGRADES, UP_MAX, upCost, BRANCH_INFO, FINISHED_RATE, STAFF, STAFF_UP, DECO, REGULARS, FAVOR, MASTERY, MASTERY_K, josa, BRANCH_MENU, OUTFITS, SHOP_ITEMS, FX, AD_REWARDS, AD_DAY, GIFT, TIER_AT, TIER_NAME, tierOf } from './data.js?v=0.99.39';
import { starOf, favLv, fxOn, stLv, stName, L as LV } from './game.js?v=0.99.39';
import { S, save, couponReady, claimCoupon, MISSIONS, missionReady, claimMission, mult, today, KEY, resetAll } from './state.js?v=0.99.39';
import { sfx, setAudio } from './audio.js?v=0.99.39';
import { pushBack, inOAD, exitToOAD } from './oad.js?v=0.99.39';
import { bm } from './oad_bm.js?v=0.99.39';

const $ = s => document.querySelector(s), fmt = n => Math.round(n).toLocaleString('en-US');
export const IN = { x: 0, y: 0 };
const SLOT = 'marumi_slot_';
/* 광고 보상: 원어데이 쪽 자리 이름 (bm.rewardedAd) · 수익 2배 길이 */
const PLACE = { boost: 'boost2x', offline: 'offline2x', speed: 'speed', coins: 'coins' }, BOOST_MS = 180000, FX_MS = 180000;
const mmss = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`, hex = c => '#' + c.toString(16).padStart(6, '0');
const slotInfo = n => { try { const v = JSON.parse(localStorage.getItem(SLOT + n) || 'null'); if (!v) return ''; const d = JSON.parse(v.d), t = new Date(v.at); return `${['1호점', '2호점', '3호점', '4호점'][d.bi || 0]} · 돈 ${fmt(d.coins || 0)} · ${t.getMonth() + 1}/${t.getDate()} ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`; } catch { return ''; } };
const NT_DZ = { oven: 80, counter: 66, coffee: 58, espresso: 58, mixer: 52, kettle: 62, cc: 62, bin: 46, drive: 0 };   /* 이름표: 설비 앞쪽 바닥 (동작 칸과 몸통 사이) */
const ICON = { bagel: '🥯', cream: '🥯', coffee: '🥣', drink: '☕' }, SHORT = new Proxy({}, { get: (_, k) => MENU[k]?.short || '' });
export class UI {
  constructor(app) {
    this.app = app; this._adBusy = false; const h = $('#hud');
    h.innerHTML = `<div class="top"><div class="coin"><i class="c"></i><b id="cn">0</b></div><div class="scent" id="scent" title="베이글 향">🌿<b id="scv">0</b></div><div class="lvl"><b id="bn"></b><em id="bl"></em><div class="pb"><s id="bp"></s></div></div></div>
      <div class="cp" id="cp"><b>🎟 매장 쿠폰까지</b><div class="pb"><s id="cpb"></s></div><span id="cpt"></span></div>
      <div class="evb" id="evb" hidden></div><div class="buffs" id="buffs"></div>
      <div class="side"><button class="sb ad" id="bAd"><b>📺</b><span id="adT">광고 보상</span><i class="cnt" id="adN"></i></button><button class="sb up" id="bUp"><b>⬆</b>업그레이드<i class="dot" id="upDot"></i></button><button class="sb" id="bMs"><b>📋</b>미션<i class="dot" id="msDot"></i></button><button class="sb" id="bMap"><b>🗺</b>지점<i class="dot" id="mapDot"></i></button><button class="sb" id="bSet"><b>⚙</b>설정</button>${inOAD ? '<button class="sb" id="bExit"><b>↩</b>원어데이</button>' : ''}</div>
      <div class="joy" id="joy"><i id="knob"></i></div><div class="hint" id="hint">어디든 끌어서 움직여요</div>`;
    this.tags = $('#tags'); this.floats = $('#floats');
    $('#scent').onclick = () => this.decoShop();
    $('#bAd').onclick = () => this.adPick(); $('#bUp').onclick = () => this.upgrades(); $('#bMs').onclick = () => this.missions(); $('#bMap').onclick = () => this.map(); $('#bSet').onclick = () => this.settings(); $('#cp').onclick = () => this.coupon();
    if ($('#bExit')) $('#bExit').onclick = () => exitToOAD();
    this.joy(); this.progress();
    bm.hello().then(() => this.adUi());   /* 원어데이 그룹 A(광고 꺼짐)면 광고 버튼을 숨김 */
  }
  joy() {
    const area = $('#app'), base = $('#joy'), knob = $('#knob'); let id = null, cx = 0, cy = 0; const R = 50;
    /* 꾸미기 자리 고르기: 끈 만큼 그림자가 바닥을 따라 움직임 (손가락이 가리지 않게 상대 이동) */ let pg = null;
    const down = e => { if (this.app.game.focus) this.app.game.focus = null;   /* 단계 연출 중 누르면 카메라가 바로 돌아옴 */
      if (e.target.closest('button, .modal, .cp, .scent, .regcard, .placebar')) return; const t = e.changedTouches ? e.changedTouches[0] : e; id = e.changedTouches ? t.identifier : 'm'; cx = t.clientX; cy = t.clientY;
      const g = this.app.game; if (g.placing) { const h = this.groundAt(cx, cy); pg = h && { h, x: g.placing.x, z: g.placing.z }; return; } base.style.left = cx + 'px'; base.style.top = cy + 'px'; base.classList.add('on'); };
    const move = e => { if (id === null) return; const t = e.changedTouches ? [...e.changedTouches].find(q => q.identifier === id) : e; if (!t) return;
      const g = this.app.game; if (g.placing) { if (pg) { const h = this.groundAt(t.clientX, t.clientY); if (h) { g.movePlace(pg.x + h.x - pg.h.x, pg.z + h.z - pg.h.z); this.placeUi(); } } e.cancelable && e.preventDefault(); return; }
      let dx = t.clientX - cx, dy = t.clientY - cy; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; } IN.x = dx / R; IN.y = dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`; e.cancelable && e.preventDefault(); };
    const up = e => { if (id === null) return; if (e.changedTouches && ![...e.changedTouches].some(q => q.identifier === id)) return; id = null; pg = null; IN.x = IN.y = 0; base.classList.remove('on'); knob.style.transform = ''; };
    area.addEventListener('touchstart', down, { passive: true }); area.addEventListener('touchmove', move, { passive: false }); area.addEventListener('touchend', up); area.addEventListener('touchcancel', up);
    area.addEventListener('mousedown', down); addEventListener('mousemove', move); addEventListener('mouseup', up);
    const keys = new Set(); addEventListener('keydown', e => { if (e.code === 'Escape') { if (this.app.game.placing) { this.placeBack(); return; } const b = document.querySelector('#modal .mback'); b && b.click(); return; }
      const g = this.app.game; if (g.placing) { const st = { ArrowLeft: [-1, 1], ArrowRight: [1, -1], ArrowUp: [-1, -1], ArrowDown: [1, 1], KeyA: [-1, 1], KeyD: [1, -1], KeyW: [-1, -1], KeyS: [1, 1] }[e.code]; if (st) { g.movePlace(g.placing.x + st[0] * 25, g.placing.z + st[1] * 25); this.placeUi(); } if (e.code === 'Enter') $('#plOk')?.click(); return; }   /* PC: 화살표로 옮기고 Enter 로 정함 */
      keys.add(e.code); kb(); });   /* Esc: 창 닫기 (바깥 누르기와 같음) */ addEventListener('keyup', e => { keys.delete(e.code); kb(); });
    const kb = () => { if (id !== null || this.app.game.placing) { IN.x = IN.y = 0; return; } let x = 0, y = 0; if (keys.has('KeyA') || keys.has('ArrowLeft')) x--; if (keys.has('KeyD') || keys.has('ArrowRight')) x++; if (keys.has('KeyW') || keys.has('ArrowUp')) y--; if (keys.has('KeyS') || keys.has('ArrowDown')) y++; const l = Math.hypot(x, y) || 1; IN.x = x / l; IN.y = y / l; };
  }
  bubble() { const d = document.createElement('div'); d.className = 'bub'; this.tags.append(d); return d; }
  tag() { const d = document.createElement('div'); d.className = 'tag lock'; this.tags.append(d); return d; }
  nameTag(t, o) { const d = document.createElement('div'); d.className = 'nt'; d.textContent = t; d._o = o; this.tags.prepend(d); return d; }   /* 설비 이름표 (말풍선보다 아래 층) */
  evBar(E) { const b = $('#evb'); if (!b) return; this._ev = E; b.hidden = !E; if (!E) return; const T = { complain: ['😤', '컴플레인 · 다가가서 사과해요'], group: ['👥', `단체 주문 · ${E.cust ? `${MENU[E.cust.order[0].k].short} ${E.cust.order[0].n}개 · 값 ×1.6` : ''}`], influencer: ['📸', '인플루언서 · 손님 두 배 · 팁 듬뿍'] }[E.type];
    b.innerHTML = `<b>${T[0]}</b><span>${T[1]}</span>${E.T ? '<em id="evt"></em>' : ''}`; b.className = 'evb ' + E.type; }
  /* 화면 좌표 → 바닥(y=0) 좌표 */
  groundAt(x, y) { const g = this.app.game, r = (this._ray ||= new THREE.Raycaster()); r.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1), g.cam); const o = new THREE.Vector3(); return r.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), o) ? o : null; }
  float(t, pos, cls) { const d = document.createElement('div'); d.className = 'float ' + cls; d.textContent = t; d._p = pos.clone(); d._t = 0; this.floats.append(d); }
  /* 수익 2배 끝나는 시각은 저장에 (S.boostUntil · 다시 열어도 남은 시간 그대로) · 시계를 뒤로 돌려 너무 길어지면 3분으로 */
  get boostUntil() { const n = Date.now(), u = +S.boostUntil || 0; if (u > n + BOOST_MS) S.boostUntil = n + BOOST_MS; return +S.boostUntil || 0; }
  boost() { return Date.now() < this.boostUntil; }
  /* 광고를 쓸 수 있나: 단독 실행(원어데이 밖)은 시험 창 · 원어데이 안은 그룹 A 가 아니고 남은 횟수가 있을 때 */
  /* 광고 하루 한도: 원어데이 안 = 앱이 센 남은 횟수(브랜드 게임 10) · 밖 = 이 기기에서 하루 AD_DAY 번 */
  adLeft() { const h = bm.info; if (h.ok) return h.group === 'A' ? 0 : Math.max(0, (h.ads && h.ads.rewardLeft) || 0); if (S.ads.day !== today()) S.ads = { day: today(), n: 0 }; return Math.max(0, AD_DAY - S.ads.n); }
  adOn() { const h = bm.info; return h.ok ? (h.group !== 'A' && !!(h.ads && h.ads.reward)) : this.adLeft() > 0; }
  adUi() { const b = $('#bAd'); if (!b) return; const h = bm.info; b.hidden = !!(h.ok && h.group === 'A'); b.classList.toggle('spent', !this.adOn() && !this.boost()); const n = $('#adN'); if (n) n.textContent = this.adOn() ? this.adLeft() : ''; }
  hint(t) { const h = $('#hint'); if (t) { if (h.textContent !== t) { h.textContent = t; h.classList.remove('pop'); void h.offsetWidth; h.classList.add('pop'); } h.classList.remove('off'); } else if (h.textContent !== '어디든 끌어서 움직여요') h.classList.add('off'); }   /* 0.6.3: 계속 커졌다 작아지던 박동을 빼고, 글이 바뀔 때 한 번만 */
  frame(g) {
    $('#cn').textContent = fmt(S.coins); const cam = g.cam, W = innerWidth, H = innerHeight, v = new THREE.Vector3();
    for (const p of g.padList()) { v.set(p.s.x, 30, p.s.z).project(cam); p.tag.style.transform = `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px) translate(-50%,-50%)`; p.tag.classList.toggle('can', S.coins > 0); }
    for (const d of [...this.floats.children]) { d._t += 1 / 60; d._p.y += 1.6; v.copy(d._p).project(cam); d.style.transform = `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px) translate(-50%,-50%)`; d.style.opacity = Math.max(0, 1 - d._t / 1.1); if (d._t > 1.1) d.remove(); }
    for (const c of g.cust) { if (!c.tag) continue; const o = c.order[0], left = o.n - o.got, show = (c.state === 'queue' || c.state === 'walkQ') && c.qi < 4; c.tag.style.display = show ? '' : 'none'; if (!show) continue;
      v.set(c.pos.x, 188, c.pos.z).project(cam); c.tag.style.transform = `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px) translate(-50%,-100%)`; const mood = c.w > 25 ? '😐 ' : c.w > 10 ? '' : ''; const html = `${c.reg ? `<i class="rn">💌 ${c.reg.name}</i>` : ''}${c.group ? '<i class="rn gp">👥 단체</i>' : ''}${mood}<b>${ICON[o.k]}</b><span>${SHORT[o.k]}</span><em>×${left}</em>`; if (c.tag._h !== html) { c.tag.innerHTML = html; c.tag._h = html; } c.tag.classList.toggle('front', c.qi === 0); c.tag.classList.toggle('reg', !!c.reg); }
    for (const cr of g.cars || []) { if (!cr.tag) continue; const show = cr.state === 'wait' || cr.state === 'in'; cr.tag.style.display = show ? '' : 'none'; if (!show) continue; v.set(cr.g.position.x, 190, cr.g.position.z).project(cam);
      cr.tag.style.transform = `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px) translate(-50%,-100%)`; const html = Object.entries(cr.order).map(([k, n]) => `<b>${ICON[k]}</b><em>${n - (cr.got[k] || 0)}</em>`).join(' '); if (cr.tag._h !== html) { cr.tag.innerHTML = '🚗 ' + html; cr.tag._h = html; } }
    /* 손에 든 것 표시 (머리 위): 아이콘 · 이름 · 개수 · 가득 차면 MAX */
    const pl = g.pl, hl = (this._held ||= Object.assign(document.createElement('div'), { className: 'held' })); if (!hl.isConnected) this.tags.append(hl);
    if (pl.stack.length) { const k = pl.kind, nb = pl.stack.filter(x => x.m.userData.b).length, nm = k === 'trash' ? '쓰레기' : k === 'dough' ? (nb === pl.stack.length ? '데친 반죽' : '반죽') : k === 'bagel' && pl.stack.some(x => x.m.userData.prem) ? `쫄깃 ${MENU.bagel.short}` : MENU[k]?.short || k;
      const ic = k === 'trash' ? '🗑' : k === 'dough' ? '⚪' : ICON[k] || '';   /* 이름 통일 (테스터 #2): 손님 말풍선 「플레인」 = 손에 든 「플레인」 · 데친 것은 「쫄깃 플레인」 */ const full = pl.stack.length >= pl.cap; const html = `${ic} ${nm} <em>${full ? 'MAX' : pl.stack.length}</em>`; if (hl._h !== html) { hl.innerHTML = html; hl._h = html; hl.classList.toggle('trash', k === 'trash'); hl.classList.toggle('max', full); }
      v.set(pl.pos.x, 230 + pl.stack.length * 15, pl.pos.z).project(cam); hl.style.transform = `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px) translate(-50%,-100%)`; hl.style.display = ''; } else hl.style.display = 'none';
    const b = this.boostUntil - Date.now(); $('#adT').textContent = b > 0 ? mmss(b) : '광고 보상'; $('#bAd').classList.toggle('on', b > 0); if (b <= 0 && this._wasB) this.adUi(); this._wasB = b > 0;
    /* 설비 이름표 (테스터 #9): 설비 앞 바닥 · 외형 단계가 오르면 별 */
    for (const d of this.tags.querySelectorAll('.nt')) { const o = d._o; if (!o || !g.st[o.s.id]) { d.remove(); continue; } const t = Math.max(0, o.tier || 0), h = `${stName(o.s.id)}${t ? ` <i>${'★'.repeat(t)}</i>` : ''}`; if (d._h !== h) { d.innerHTML = h; d._h = h; }
      v.set(o.x, 4, o.z + (NT_DZ[o.s.id] ?? 80)).project(cam); d.style.transform = `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px) translate(-50%,-50%)`; }
    this.heads(g, cam, W, H);
    const E = g.ev, et = $('#evt'); if (et && E) et.textContent = Math.max(0, Math.ceil(E.t));
    /* 켜진 시간 효과 (상점 물품 · 광고 보상) */
    if ((this._bf = (this._bf || 0) + 1) % 10 === 0) { const now = Date.now(), on = Object.keys(FX).filter(k => k !== 'boost' && (+S.fx[k] || 0) > now), html = on.map(k => `<span>${FX[k].icon} ${mmss(Math.min(FX_MS, S.fx[k] - now))}</span>`).join(''); const bf = $('#buffs'); if (bf._h !== html) { bf.innerHTML = html; bf._h = html; } }
  }
  progress() {
    const g = this.app.game; if (!g || !g.unl) return; const B = BRANCHES[S.bi], all = B.slots.filter(s => !s.free).length, done = B.slots.filter(s => !s.free && g.unl.has(s.id)).length;
    $('#bn').textContent = B.name; $('#bl').textContent = `${done} / ${all}`; $('#bp').style.width = done / all * 100 + '%';
    const r = Math.min(1, S.sold / COUPON.goal); $('#cpb').style.width = r * 100 + '%'; $('#cpt').textContent = S.coupon ? '오늘 쿠폰 받았어요 · 눌러서 보기' : couponReady() ? '쿠폰 받기!' : `베이글 ${S.sold} / ${COUPON.goal}개 팔기`;
    $('#cp').classList.toggle('ready', couponReady()); $('#shopDot') && ($('#shopDot').style.display = this.giftReady() ? 'block' : 'none'); this.adUi(); $('#scv') && ($('#scv').textContent = g.scent()); $('#decoDot') && ($('#decoDot').style.display = this.cheapDeco() ? 'block' : 'none'); $('#regDot') && ($('#regDot').style.display = Object.values(S.reg).some(r => (r.lv || 0) > (r.seen || 0)) ? 'block' : 'none'); $('#msDot').style.display = missionReady() || this.regNew() ? 'block' : 'none'; $('#upDot').style.display = this.cheapUp() || this.cheapDeco() || this.giftReady() ? 'block' : 'none'; $('#mapDot') && ($('#mapDot').style.display = this.idleTotal() > 0 ? 'block' : 'none');
  }
  /* 머리 위 아이콘 (0.6.2 대표 「손님 클레임 · 자는 직원 등은 전부 머리 위 아이콘으로」): 그 사람에게 가서 풀어야 하는 일 = 컴플레인 손님 😤(빨강 · 남은 시간 고리) · 쉬는 직원 💤(남색)
     예전 글 꼬리표(.evp · .zz)는 CSS 박동(transform: scale)이 자리 translate 를 덮어써 1~1.6초마다 화면 구석으로 튀었음 → 아이콘은 움직이는 애니메이션 없음 · 자리는 translate 하나
     화면 밖이면 가장자리에 붙고 화살표가 그 사람 쪽을 가리킴 · 둘이 겹치면 위로 비켜 쌓음 · 주문 말풍선(188)보다 위(230) */
  heads(g, cam, W, H) { const L = [], v = new THREE.Vector3(), E = g.ev;   /* 아이콘 목록은 매 프레임 실제 상태에서 (풀리면 바로 사라짐) */
    if (E && E.type === 'complain' && E.P && (E.state === 'in' || E.state === 'wait')) L.push({ k: 'cmp', kind: 'complain', ic: '😤', p: E.pos, f: E.T ? Math.max(0, E.t / E.T) : 1 });
    g.staff.forEach((w, i) => { if (w.rest) L.push({ k: 'zz' + w.k + i, kind: 'sleep', ic: '💤', p: w.pos, near: true }); });   /* 0.6.3: 쉬는 직원은 화면 안에 있을 때만 (가장자리 화살표 없음) — 가장자리는 시간 제한이 있는 컴플레인만 */
    const els = (this._heads ||= new Map()), live = new Set(), z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--z')) || 1, M0 = { l: 14, r: 14, t: 118 * z, b: 150 * z }, sideB = $('.side')?.getBoundingClientRect(), put = [];   /* 오른쪽 단추 줄 높이 안에서만 단추 너비만큼 비움 (0.6.3) */
    for (const h of L) { live.add(h.k); let d = els.get(h.k); if (!d || !d.isConnected) { d = document.createElement('div'); d.className = 'hi ' + h.kind; d.innerHTML = `<b>${h.ic}</b><i></i>`; this.tags.append(d); els.set(h.k, d); }
      v.set(h.p.x, 230, h.p.z).project(cam); let x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
      if (h.near && (x < 0 || x > W || y < 0 || y > H)) { live.delete(h.k); continue; }   /* 화면 밖 쉬는 직원: 표시 안 함 */
      const rr = sideB && sideB.width && y > sideB.top - 44 && y < sideB.bottom + 44 ? W - sideB.left + 6 : M0.r, cx = Math.max(M0.l + 22, Math.min(W - rr - 22, x)), cy = Math.max(M0.t + 44, Math.min(H - M0.b, y)), edge = cx !== x || cy !== y, edgeOn = edge && !h.near;
      let fy = cy; while (put.some(q => Math.abs(q[0] - cx) < 40 && Math.abs(q[1] - fy) < 42)) fy -= 44; put.push([cx, fy]);   /* 겹치면 위로 비켜 쌓음 */
      d.style.transform = `translate(${cx}px,${fy}px) translate(-50%,-100%)`; d.classList.toggle('edge', edgeOn); if (edgeOn) d.style.setProperty('--a', Math.atan2(y - cy, x - cx) + 'rad');
      if (h.f != null) d.style.setProperty('--f', (h.f * 360).toFixed(0) + 'deg'); }
    for (const [k, d] of els) if (!live.has(k)) { d.remove(); els.delete(k); } }
  /* 기준판 재정비 ①-8 (단추 6개 · 대표 캡처 화면): 왼쪽 단추 4개를 창 안 탭으로 — 업그레이드 창 = 설비 · 직원 · 꾸미기 · 상점 / 미션 창 = 미션 · 단골 · 메뉴 */
  upTabs(on) { const T = [['fac', '설비'], ['staff', `직원 ${this.app.game.staff.length}`], ['deco', '꾸미기'], ['store', `상점${this.giftReady() ? ' •' : ''}`]]; return `<div class="tabs hd">${T.map(([k, n]) => `<button class="${on === k ? 'on' : ''}" data-ut="${k}">${n}</button>`).join('')}</div>`; }
  msTabs(on) { const T = [['ms', '오늘의 미션'], ['reg', `단골${this.regNew() ? ' •' : ''}`], ['menu', '메뉴 숙련']]; return `<div class="tabs hd">${T.map(([k, n]) => `<button class="${on === k ? 'on' : ''}" data-mt="${k}">${n}</button>`).join('')}</div>`; }
  wireTabs(md) { md.querySelectorAll('[data-ut]').forEach(b => b.onclick = () => { const k = b.dataset.ut; if (k === 'fac' || k === 'staff') { this._tab = k === 'fac' ? 'shop' : 'staff'; this.upgrades(); } else if (k === 'deco') this.decoShop(); else this.shop(); });
    md.querySelectorAll('[data-mt]').forEach(b => b.onclick = () => { const k = b.dataset.mt; if (k === 'ms') this.missions(); else if (k === 'reg') this.regulars(); else this.menuBook(); }); }
  regNew() { return Object.values(S.reg).some(r => (r.lv || 0) > (r.seen || 0)); }
  /* 설비 단계가 오른 순간의 이름표 (기준판 재정비 ②) — 「★★ 프로 오븐」 1.8초 */
  tierBanner(name, t) { document.getElementById('toast')?.classList.remove('on'); clearTimeout(this._tt); const d = document.createElement('div'); d.className = 'tierban'; d.innerHTML = `<i>${'★'.repeat(t)}</i><b>${TIER_NAME[t]} ${name}</b><span>업그레이드로 모습이 바뀌었어요</span>`; document.getElementById('app').append(d);
    requestAnimationFrame(() => d.classList.add('on')); setTimeout(() => { d.classList.remove('on'); setTimeout(() => d.remove(), 400); }, 1800); }
  toast(t) { let el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(this._tt); this._tt = setTimeout(() => el.classList.remove('on'), 1800); }
  modal(html, onClose) { const m = $('#modal'), cur = m.querySelector('.modal'); if (cur && this._ub) { cur.innerHTML = html; const f = this._oc; this._oc = onClose; if (f && f !== onClose) f(); return m; }   /* 덮인 창의 닫힘 처리도 불러 줌 (광고 취소 · 쉬는 동안 1배 받기) */   /* 이미 열린 창은 내용만 바꿈 (깜빡임 없음) */
    m.innerHTML = `<div class="mback"><div class="modal">${html}</div></div>`; m.firstChild.onclick = e => { if (e.target === m.firstChild) this.close(); }; this._oc = onClose; this._ub = pushBack(() => { this.close(); return true; }); sfx('tap', { vol: 0.4 }); return m; }
  close() { $('#modal').innerHTML = ''; this._ub && this._ub(); this._ub = null; const f = this._oc; this._oc = null; f && f(); }
  // ── 쿠폰
  coupon() {
    if (S.coupon) return this.showCoupon(S.coupon);
    if (!couponReady()) return this.modal(`<h3>🎟 매장 쿠폰</h3><p>오늘 베이글을 <b>${COUPON.goal}개</b> 팔면<br>실제 ${BRAND.name} 매장에서 쓸 수 있는 쿠폰을 드려요.</p><div class="cpbig">${S.sold} / ${COUPON.goal}</div><p class="sm">${COUPON.text}</p><button class="btn" onclick="document.querySelector('#modal').innerHTML=''">계속 굽기</button>`);
    const c = claimCoupon(); sfx('reward'); this.showCoupon(c); this.progress();
  }
  showCoupon(c) { this.modal(`<div class="ticket"><small>${BRAND.name}</small><b>${COUPON.text}</b><div class="code">${c.code}</div><span>매장 직원에게 이 화면을 보여 주세요 · ${COUPON.valid}</span></div><button class="btn" id="mOk">확인</button>`); $('#mOk').onclick = () => this.close(); }
  // ── 광고 보상 (2026-10-29 · 대표 제보 뒤 정리)
  //    원어데이 안 = 원어데이 광고(bm.rewardedAd — 광고 창 · 횟수 · 그룹은 앱이 맡음) · 밖(단독 실행 · 개발 서버) = 시험용 3초 창
  //    보상은 한 번만 · 남은 시간은 Date.now 기준(폰에서 홈으로 나갔다 와도 그대로) · 그만두기 · 바깥 누르기 · 뒤로 · 다른 창이 덮으면 취소
  //    돌려주는 값: 보상을 줬으면 true
  async ad(kind, done) {
    if (this._adBusy) return false;
    if (kind === 'boost' && this.boost()) { this.toast('수익 2배가 이미 켜져 있어요'); return false; }
    if (kind === 'speed' && fxOn('speed')) { this.toast('빨리 걷기가 이미 켜져 있어요'); return false; }
    this._adBusy = true;
    try {
      const h = await bm.hello();
      if (!h.ok && this.adLeft() <= 0) { this.toast('오늘 볼 수 있는 광고를 다 봤어요 · 내일 또 만나요'); return false; }
      if (h.ok && $('#adpick')) this.close();   /* 원어데이 광고 창이 뜨기 전에 고르기 창은 닫음 */
      const ok = h.ok ? await this.oadAd(kind) : await this.testAd(kind);
      if (!ok) return false;
      if (!h.ok) { this.adLeft(); S.ads.n++; }
      sfx('reward');
      if (kind === 'boost') { S.boostUntil = Date.now() + BOOST_MS; save(true); this.toast('3분 동안 수익 2배!'); }
      if (kind === 'speed') { S.fx.speed = Date.now() + FX_MS; save(true); this.toast('3분 동안 빨리 걸어요! 👟'); }
      if (kind === 'coins') { const v = this.adCoins(); S.coins += v; S.earned += v; save(true); sfx('coin'); this.toast(`광고 보상 +${fmt(v)}`); this.app.game.ui.float('+' + fmt(v), this.app.game.pl.pos, 'cash'); }
      try { done && done(); } catch (e) { console.error(e); }
      return true;
    } finally { this._adBusy = false; this.adUi(); }
  }
  async oadAd(kind) {
    const r = await bm.rewardedAd(PLACE[kind]); if (r.ok) return true;
    if (r.reason === 'limit') this.toast('오늘 볼 수 있는 광고를 다 봤어요 · 내일 또 만나요');
    else if (r.reason === 'off') this.toast('지금은 광고 보상이 없어요');
    else if (r.reason !== 'cancel') this.toast('광고를 불러오지 못했어요 · 잠시 뒤 다시 해 주세요');
    return false;
  }
  testAd(kind) {
    const what = kind === 'boost' ? '3분 동안 수익 2배' : kind === 'offline' ? '쉬는 동안 번 돈 2배' : kind === 'speed' ? '3분 동안 빨리 걷기' : kind === 'coins' ? `돈 +${fmt(this.adCoins())}` : '보상';
    return new Promise(res => {
      const end = Date.now() + 3000; let fin = false, tm = 0;
      const stop = ok => { if (fin) return; fin = true; clearInterval(tm); removeEventListener('visibilitychange', tick); res(ok); };
      const tick = () => { if (fin) return; if (!$('#adbox')) return stop(false);   /* 다른 창이 덮음 = 취소 (그 창은 그대로 둠) */
        const left = Math.max(0, Math.ceil((end - Date.now()) / 1000)), e = $('#adc'); if (e) e.textContent = left;
        if (left <= 0) { this._oc = null; this.close(); stop(true); } };
      this.modal(`<h3>📺 광고 보고 받기</h3><p><b>${what}</b></p><div class="adbox" id="adbox"><span>광고 (시험용)</span><em id="adc">3</em></div><button class="btn ghost" id="adNo">그만두기</button>`, () => stop(false));
      $('#adNo').onclick = () => this.close();
      tm = setInterval(tick, 250); addEventListener('visibilitychange', tick);
    });
  }
  /* 광고 보상 크기: 지금 가게 규모 (지점 배수 · 열린 칸) */
  adCoins() { const g = this.app.game; return Math.round(150 * BRANCHES[S.bi].mult * (1 + g.unl.size / 10) / 10) * 10; }
  giftCoins() { const g = this.app.game; return Math.round(GIFT * BRANCHES[S.bi].mult * (1 + g.unl.size / 10) / 10) * 10; }
  // ── 광고 보상 고르기 (테스터 #4): 게임 화면 📺 버튼 · 수익 2배 / 빨리 걷기 / 돈 · 하루 한도는 원어데이와 같게
  adPick() {
    if (this._adBusy) return; if (!this.adOn()) { this.toast('오늘 볼 수 있는 광고를 다 봤어요 · 내일 또 만나요'); return; }
    const now = Date.now(), rows = AD_REWARDS.map(r => { const left = r.id === 'boost' ? this.boostUntil - now : r.id === 'speed' ? (+S.fx.speed || 0) - now : 0, on = left > 0;
      return `<button class="adc ${on ? 'off' : ''}" data-ad="${r.id}"><i>${r.icon}</i><b>${r.name}</b><span>${r.id === 'coins' ? `+${fmt(this.adCoins())}` : r.desc}</span><em>${on ? `켜짐 ${mmss(Math.min(FX_MS, left))}` : '📺 보기'}</em></button>`; }).join('');
    const m = this.modal(`<h3>📺 광고 보고 받기</h3><p class="sm" id="adpick">하나를 골라요 · 오늘 <b>${this.adLeft()}번</b> 남음</p><div class="adcs">${rows}</div><button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close();
    m.querySelectorAll('[data-ad]').forEach(b => b.onclick = () => { const k = b.dataset.ad; if (b.classList.contains('off')) { this.toast(k === 'boost' ? '수익 2배가 이미 켜져 있어요' : '빨리 걷기가 이미 켜져 있어요'); return; } this.ad(k); }); }
  // ── 상점 (테스터 #5): 가게 물품(게임 돈) · 돈 받기(하루 선물 · 광고) — 브랜드 게임이라 원어데이 골드 판매는 의뢰사 계약 뒤 (docs/bm-policy.md)
  itemCost(it) { return Math.round(it.cost * BRANCHES[S.bi].mult / 10) * 10; }
  giftReady() { return S.gift !== today(); }
  shop() {
    const g = this.app.game, tab = this._stab || 'item', now = Date.now();
    const items = SHOP_ITEMS.map(it => { const c = this.itemCost(it), left = it.fx ? (+S.fx[it.fx] || 0) - now : 0, room = it.id === 'batch' ? g.ovenRoom() : 1, noStaff = it.staff && !g.staff.length;
      const why = left > 0 ? `켜짐 ${mmss(Math.min(FX_MS, left))}` : noStaff ? '직원이 없어요' : !room ? '오븐이 가득' : '';
      return `<div class="upr"><i>${it.icon}</i><div><b>${it.name}</b><span>${it.desc}</span></div><button class="btn sm ${why || S.coins < c ? 'off' : ''}" data-it="${it.id}">${why || `<i class="c"></i>${fmt(c)}`}</button></div>`; }).join('');
    const ad = this.adOn(), money = `<div class="upr gift"><i>🎁</i><div><b>오늘의 선물</b><span>하루 한 번 · 사장님 힘내세요!</span></div><button class="btn sm ${this.giftReady() ? '' : 'off'}" id="shGift">${this.giftReady() ? `<i class="c"></i>${fmt(this.giftCoins())}` : '내일 또'}</button></div>
      <div class="upr"><i>📺</i><div><b>광고 보고 돈 받기</b><span>${ad ? `오늘 ${this.adLeft()}번 남음` : bm.info.ok && bm.info.group === 'A' ? '지금은 광고 보상이 없어요' : '오늘 광고를 다 봤어요'}</span></div><button class="btn sm ${ad ? '' : 'off'}" id="shAd"><i class="c"></i>${fmt(this.adCoins())}</button></div>`;
    const md = this.modal(`<h3>🛍 마루미 상점</h3>${this.upTabs('store')}<div class="tabs sub"><button class="${tab === 'item' ? 'on' : ''}" data-t="item">가게 물품</button><button class="${tab === 'money' ? 'on' : ''}" data-t="money">돈 받기${this.giftReady() ? ' •' : ''}</button></div><div class="uplist">${tab === 'item' ? items : money}</div><p class="sm">${tab === 'item' ? '물품은 이 지점에서 바로 써요 · 시간 효과는 화면 위에 남은 시간이 보여요' : `선물은 날마다 새로 · 광고 보상은 하루 ${AD_DAY}번까지`}</p><button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close();
    md.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { this._stab = b.dataset.t; this.shop(); }); this.wireTabs(md);
    md.querySelectorAll('[data-it]').forEach(b => b.onclick = () => { const it = SHOP_ITEMS.find(x => x.id === b.dataset.it), c = this.itemCost(it); if (b.classList.contains('off') || S.coins < c) return; S.coins -= c;
      if (it.fx) S.fx[it.fx] = Date.now() + it.sec * 1000; if (it.id === 'batch') g.ovenBatch(10); save(); sfx('unlock', { vol: 0.6 }); this.toast(`${it.icon} ${it.name}!`); this.progress(); this.shop(); });
    const gb = $('#shGift'); if (gb) gb.onclick = () => { if (!this.giftReady()) return; const v = this.giftCoins(); S.gift = today(); S.coins += v; S.earned += v; save(true); sfx('reward'); this.toast(`오늘의 선물 +${fmt(v)}`); this.progress(); this.shop(); };
    const ab = $('#shAd'); if (ab) ab.onclick = async () => { if (ab.classList.contains('off')) return; const ok = await this.ad('coins'); if (ok) { this.progress(); } }; }
  missions() {
    const html = MISSIONS.map(m => { const v = Math.min(m.goal, S.miss[m.id] || 0), d = S.missDone[m.id], ok = v >= m.goal; return `<div class="ms ${d ? 'done' : ''}"><div><b>${m.name}</b><div class="pb"><s style="width:${v / m.goal * 100}%"></s></div><em>${fmt(v)} / ${fmt(m.goal)}</em></div><button class="btn sm ${ok && !d ? '' : 'off'}" data-m="${m.id}">${d ? '완료' : `<i class="c"></i>${fmt(m.coins * mult())}`}</button></div>`; }).join('');
    const m = this.modal(`<h3>📋 오늘의 미션</h3>${this.msTabs('ms')}${html}<button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close(); this.wireTabs(m);
    m.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const v = claimMission(b.dataset.m); if (v) { sfx('reward'); this.toast(`+${fmt(v)}`); this.progress(); this.missions(); } });
  }
  // ── 업그레이드 (이 지점)
  lv(id) { return S.branch[S.bi]?.lv?.[id] || 0; }
  upList() { const g = this.app.game; return UPGRADES.filter(u => !u.need || g.unl.has(u.need) || (u.need === 'baker' && g.staff.some(w => w.k === 'baker'))); }
  sCost(k) { return Math.round(STAFF_UP.base * Math.pow(1.6, this.slv(k)) * BRANCHES[S.bi].mult / 5) * 5; }
  slv(k) { return S.branch[S.bi]?.slv?.[k] || 0; }
  cheapUp() { const m = BRANCHES[S.bi].mult; return this.upList().some(u => this.lv(u.id) < UP_MAX && S.coins >= upCost(u, this.lv(u.id), m)) || this.app.game.staff.some(w => this.slv(w.k) < STAFF_UP.max && S.coins >= this.sCost(w.k)); }
  upgrades() {
    const m = BRANCHES[S.bi].mult; const L = this.upList();
    /* 설비 이름 (테스터 #9) · 다음 외형 단계 (테스터 #6) */ const stTag = u => { if (!u.st) return ''; const sl = stLv(u.st), t = tierOf(sl), nx = TIER_AT[t]; return `<small class="stn">${stName(u.st)} · ${TIER_NAME[t]}${nx ? ` <i>Lv.${nx} 「${TIER_NAME[t + 1]}」 외형</i>` : ' <i>최고 외형</i>'}</small>`; };
    const html = L.map(u => { const lv = this.lv(u.id), max = lv >= UP_MAX, c = upCost(u, lv, m); return `<div class="upr"><i>${u.icon}</i><div>${stTag(u)}<b>${u.name} <em>Lv.${lv}</em></b><span>${u.desc}</span><div class="pips">${'<s class="on"></s>'.repeat(lv)}${'<s></s>'.repeat(UP_MAX - lv)}</div></div>
      <button class="btn sm ${max || S.coins < c ? 'off' : ''}" data-u="${u.id}">${max ? 'MAX' : `<i class="c"></i>${fmt(c)}`}</button></div>`; }).join('');
    const tab = this._tab || 'shop', staff = this.app.game.staff;
    const sh = staff.map(w => { const d = STAFF[w.k], lv = this.slv(w.k), max = lv >= STAFF_UP.max, c = this.sCost(w.k); return `<div class="upr"><i class="sw" style="background:#${d.body.toString(16).padStart(6, '0')}">👤</i><div><b>${d.name} <em>Lv.${lv}</em></b><span>${d.up} 올리기</span><div class="pips">${'<s class="on"></s>'.repeat(lv)}${'<s></s>'.repeat(STAFF_UP.max - lv)}</div></div>
      <button class="btn sm ${max || S.coins < c ? 'off' : ''}" data-s="${w.k}">${max ? 'MAX' : `<i class="c"></i>${fmt(c)}`}</button></div>`; }).join('') || '<p class="sm">바닥의 「직원 뽑기」 칸을 열면 직원이 생겨요</p>';
    const md = this.modal(`<h3>⬆ ${BRANCHES[S.bi].name} 업그레이드</h3>${this.upTabs(tab === 'shop' ? 'fac' : 'staff')}<div class="uplist">${tab === 'shop' ? html : sh}</div><p class="sm">설비를 더 열면 업그레이드도 늘어나요</p><button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close();
    md.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const u = UPGRADES.find(x => x.id === b.dataset.u), lv = this.lv(u.id), c = upCost(u, lv, m); if (lv >= UP_MAX || S.coins < c) return; S.coins -= c;
      const br = (S.branch[S.bi] ||= { unl: [], staff: [], paid: {} }); (br.lv ||= {})[u.id] = lv + 1; save(); sfx('unlock', { vol: 0.6 }); this.toast(`${u.st ? stName(u.st) + ' · ' : ''}${u.name} Lv.${lv + 1}!`); const up = u.st ? this.app.game.restyle(u.st) : false; this.progress(); if (!up) this.upgrades(); });   /* 단계가 오르면 창을 다시 열지 않음 (새 모습 연출을 보여 줌) */
    this.wireTabs(md);
    md.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const k = b.dataset.s, lv = this.slv(k), c = this.sCost(k); if (lv >= STAFF_UP.max || S.coins < c) return; S.coins -= c; const br = S.branch[S.bi]; (br.slv ||= {})[k] = lv + 1; save(); sfx('unlock', { vol: 0.6 }); this.toast(`${STAFF[k].name} Lv.${lv + 1}!`); this.progress(); this.upgrades(); }); }
  // ── 꾸미기: 지점마다 정해진 자리에 소품 · 「베이글 향」 = 손님 더 자주 + 팁
  decoCost(d) { return Math.round(d.cost * BRANCHES[S.bi].mult / 10) * 10; }
  cheapDeco() { const own = S.deco[S.bi] || []; return DECO.some(d => !d.gift && !own.includes(d.id) && S.coins >= this.decoCost(d)); }
  decoShop() {
    const own = S.deco[S.bi] || [], g = this.app.game, sc = g.scent(), tab = this._dtab || 'deco';
    /* 소품: 안 산 것 = 누르면 놓일 자리를 반투명으로 미리 보고(#13) 그 자리에서 사기 · 산 것 = 옮기기(#14) · 꽃병은 테이블마다라 바로 사기 */
    const list = DECO.filter(d => !d.gift || own.includes(d.id)).map(d => { const has = own.includes(d.id), c = this.decoCost(d), mv = !!d.pos;
      const lock = !has && !this.app.game.decoReady(d.id); const btn = lock ? '<button class="btn sm off">청소 직원 뒤</button>' : has ? (mv ? `<button class="btn sm ghost2" data-mv="${d.id}">↔ 옮기기</button>` : '<button class="btn sm off">놓음</button>') : mv ? `<button class="btn sm ${S.coins < c ? 'look' : ''}" data-pv="${d.id}">${S.coins < c ? '👁 미리 보기' : `<i class="c"></i>${fmt(c)}`}</button>` : `<button class="btn sm ${S.coins < c ? 'off' : ''}" data-d="${d.id}"><i class="c"></i>${fmt(c)}</button>`;
      return `<div class="upr ${has ? 'own' : ''}"><i>${d.icon}</i><div><b>${d.name} <em>향 +${d.score}</em></b><span>${d.desc}</span></div>${btn}</div>`; }).join('');
    /* 직원 (테스터 #7): 유니폼 · 모든 지점 공통 · 한 번 사면 언제든 바꿔 입힘 */
    const outfits = OUTFITS.map(o => { const has = S.outfits.includes(o.id), on = S.outfit === o.id, sw = o.id === 'basic' ? 'conic-gradient(#5A8AE0 0 25%, #7A4A2A 0 50%, #E2A020 0 75%, #6AB07A 0)' : `linear-gradient(135deg, ${hex(o.body)} 0 55%, ${hex(o.apronC)} 55%)`;
      return `<div class="upr ${on ? 'cur' : ''}"><i class="sw2" style="background:${sw}"></i><div><b>${o.name}</b><span>${o.desc}</span></div><button class="btn sm ${on ? 'off' : !has && S.coins < o.cost ? 'off' : ''}" data-of="${o.id}">${on ? '입는 중' : has ? '입히기' : `<i class="c"></i>${fmt(o.cost)}`}</button></div>`; }).join('');
    const md = this.modal(`<h3>🪴 ${BRANCHES[S.bi].name} 꾸미기</h3>${this.upTabs('deco')}<div class="tabs sub"><button class="${tab === 'deco' ? 'on' : ''}" data-t="deco">가게 소품</button><button class="${tab === 'staff' ? 'on' : ''}" data-t="staff">직원 꾸미기</button></div>
      ${tab === 'deco' ? `<div class="scentbar">🌿 베이글 향 <b>${sc}</b><span>손님 +${Math.round(sc / 3)}% · 팁 확률 +${(sc / 20).toFixed(1)}%</span></div><div class="uplist">${list}</div><p class="sm">사기 전에 놓일 자리를 미리 보고 끌어서 옮길 수 있어요 · 단골이 선물로 주기도 해요</p>` : `<div class="uplist">${outfits}</div><p class="sm">유니폼은 모든 지점 직원이 같이 입어요 · 사장님은 늘 셰프 모자</p>`}<button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close();
    md.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { this._dtab = b.dataset.t; this.decoShop(); }); this.wireTabs(md);
    md.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const d = DECO.find(x => x.id === b.dataset.d), c = this.decoCost(d); if ((S.deco[S.bi] || []).includes(d.id) || S.coins < c) return; S.coins -= c; this.app.game.addDeco(d.id); sfx('unlock', { vol: 0.6 }); this.toast(`${d.name} 놓았어요 · 향 +${d.score}`); this.progress(); this.decoShop(); });
    md.querySelectorAll('[data-pv]').forEach(b => b.onclick = () => this.place(b.dataset.pv, 'buy'));
    md.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => this.place(b.dataset.mv, 'move'));
    md.querySelectorAll('[data-of]').forEach(b => b.onclick = () => { const o = OUTFITS.find(x => x.id === b.dataset.of); if (S.outfit === o.id) return; if (!S.outfits.includes(o.id)) { if (S.coins < o.cost) return; S.coins -= o.cost; S.outfits.push(o.id); sfx('unlock', { vol: 0.6 }); }
      S.outfit = o.id; save(); this.app.game.restaff(); this.toast(`직원들이 「${o.name}」을 입었어요`); this.progress(); this.decoShop(); });
  }
  // ── 꾸미기 자리 고르기: 창을 닫고 바닥에 반투명 그림자 · 아래 막대에서 정하기/그만두기 · 뒤로 = 꾸미기 창으로 (바로 전 단계)
  place(id, mode) { const g = this.app.game; this.close(); if (!g.startPlace(id, mode)) return; $('#app').classList.add('placing');
    const d = DECO.find(x => x.id === id), bar = document.createElement('div'); bar.className = 'placebar'; bar.id = 'placebar';
    bar.innerHTML = `<div class="pt"><i>${d.icon}</i><div><b>${d.name}</b><span id="plMsg"></span></div></div><div class="btns"><button class="btn ghost" id="plNo">그만두기</button><button class="btn" id="plOk"></button></div>`; $('#hud').append(bar);
    this._pbk = pushBack(() => { this.placeBack(); return true; });
    $('#plNo').onclick = () => this.placeBack(); $('#plOk').onclick = () => this.placeOk(); this.placeUi(); }
  placeUi() { const g = this.app.game, P = g.placing, ok = $('#plOk'), msg = $('#plMsg'); if (!P || !ok) return; const c = this.decoCost(P.d), buy = P.mode === 'buy', poor = buy && S.coins < c;
    msg.textContent = !P.ok ? '여기엔 놓을 수 없어요 · 설비 · 통로와 겹쳐요' : poor ? `돈이 ${fmt(c - S.coins)} 모자라요 · 자리는 미리 볼 수 있어요` : P.d.wall ? '끌어서 벽을 따라 옮겨요 · 초록이면 OK' : '바닥을 끌어서 옮겨요 · 초록이면 OK';
    msg.classList.toggle('bad', !P.ok || poor); ok.innerHTML = buy ? `<i class="c"></i>${fmt(c)} 사서 놓기` : '여기에 놓기'; ok.classList.toggle('off', !P.ok || poor); }
  placeOk() { const g = this.app.game, P = g.placing; if (!P || !P.ok) return; if (P.mode === 'buy' && !g.decoReady(P.id)) return; if (P.mode === 'buy') { const c = this.decoCost(P.d); if (S.coins < c) return; const at = [Math.round(P.x), Math.round(P.z)]; g.cancelPlace(); S.coins -= c; g.addDeco(P.id, at); sfx('unlock', { vol: 0.6 }); this.toast(`${P.d.name} 놓았어요 · 향 +${P.d.score}`); }
    else { g.confirmPlace(); sfx('drop', { vol: 0.4 }); this.toast(`${P.d.name} 옮겼어요`); } this.placeEnd(); this.progress(); }
  placeBack() { this.app.game.cancelPlace(); this.placeEnd(); this.decoShop(); }
  placeEnd() { $('#placebar')?.remove(); $('#app').classList.remove('placing'); this._pbk && this._pbk(); this._pbk = null; }
  // ── 단골
  regulars() {
    const opened = [...this.app.game.unl].filter(id => !BRANCHES[S.bi].slots.find(s => s.id === id)?.free).length;
    const html = REGULARS.map(R0 => { const r = S.reg[R0.id] || { f: 0, lv: 0 }, lv = favLv(r.f), met = r.f > 0 || r.day, next = FAVOR[lv];
      const fav = { bagel: '플레인 베이글', cream: '그날의 특별 베이글', coffee: '크림치즈 컵', drink: '아메리카노' }[R0.fav];
      return `<div class="reg ${met ? '' : 'lock'}"><i class="av" style="background:#${R0.body.toString(16).padStart(6, '0')}">${met ? R0.name[0] : '?'}</i><div><b>${met ? R0.name : '아직 모르는 손님'} <small>${met ? R0.who : R0.need > opened ? '가게를 더 키우면 찾아와요' : '곧 찾아와요'}</small></b>
        <div class="hearts">${'<s class="on">♥</s>'.repeat(lv)}${'<s>♥</s>'.repeat(5 - lv)}${next ? `<span>다음 ♥까지 ${next - r.f}</span>` : '<span>최고 단골!</span>'}</div>
        ${met ? `<span class="fav">좋아하는 것: ${fav}</span>${R0.story.slice(0, lv).map(t => `<p>“${t}”</p>`).join('')}${lv < 5 ? `<p class="lk">♥${lv + 1}에서 다음 이야기${lv + 1 === 2 || lv + 1 === 4 ? ' · 🎁 꾸미기 선물' : ''}</p>` : ''}` : ''}</div></div>`; }).join('');
    for (const r of Object.values(S.reg)) r.seen = r.lv || 0; save(); this.progress();
    const m = this.modal(`<h3>💌 단골손님</h3>${this.msTabs('reg')}<div class="uplist">${html}</div><p class="sm">단골은 하루 한 번 찾아와요 · 빨리 내주면 호감 +2</p><button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close(); this.wireTabs(m);
  }
  regLevel(R0, lv, gift, coins) {
    const d = document.createElement('div'); d.className = 'regcard'; d.innerHTML = `<i class="av" style="background:#${R0.body.toString(16).padStart(6, '0')}">${R0.name[0]}</i><div><b>${R0.name} ${'♥'.repeat(lv)}</b><p>“${R0.story[lv - 1]}”</p><span>${gift ? `🎁 선물: ${gift}` : `💰 +${fmt(coins)}`}</span></div>`;
    document.body.append(d); d.onclick = () => d.remove(); setTimeout(() => d.classList.add('on'), 30); setTimeout(() => { d.classList.remove('on'); setTimeout(() => d.remove(), 400); }, 4500); this.progress();
  }
  // ── 메뉴 숙련
  menuBook() {
    const g = this.app.game, ks = ['bagel']; if (g.st.cc) ks.push('cream'); if (g.st.coffee) ks.push('coffee'); if (g.st.espresso) ks.push('drink');
    const html = ks.map(k => { const nm = MENU[k].name, n = S.mast[nm] || 0, st = starOf(nm), nx = MASTERY[st], base = MASTERY[st - 1];
      return `<div class="upr"><i>${MENU[k].icon || ICON[k]}</i><div><b>${nm} <em class="stars">${'★'.repeat(st)}<i>${'★'.repeat(5 - st)}</i></em></b><span>${fmt(n)}개 판매 · 값 +${Math.round((st - 1) * MASTERY_K * 100)}%</span>${nx ? `<div class="pb"><s style="width:${(n - base) / (nx - base) * 100}%"></s></div><span>★${st + 1}까지 ${fmt(nx - n)}개</span>` : '<span>대표 메뉴!</span>'}</div></div>`; }).join('');
    const m = this.modal(`<h3>📖 메뉴 숙련</h3>${this.msTabs('menu')}<div class="uplist">${html}</div><p class="sm">많이 팔수록 별이 오르고 값도 올라요 · 지점이 바뀌면 그 지점 메뉴</p><button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close(); this.wireTabs(m);
  }
  // ── 다 연 지점: 직원들이 계속 장사 → 지점 지도에서 받기
  finished(i) { const b = BRANCHES[i], br = S.branch[i]; return !!br && i !== S.bi && b.slots.filter(s => !s.free && s.id !== 'next').every(s => br.unl.includes(s.id)); }
  idleOf(i) { if (!this.finished(i)) return 0; const br = S.branch[i], t = Math.min(4 * 3600, (Date.now() - (br.idleAt || Date.now())) / 1000); return Math.floor(t * FINISHED_RATE * BRANCHES[i].mult * (1 + (br.lv?.price || 0) / 10)); }
  idleTotal() { let t = 0; for (let i = 0; i < BRANCHES.length; i++) t += this.idleOf(i); return t; }
  map() {
    const html = BRANCHES.map((b, i) => { const open = i <= (S.maxBi || 0), idle = this.idleOf(i); return `<div class="br ${i === S.bi ? 'cur' : ''} ${open ? '' : 'lock'}" data-i="${i}"><img src="assets/brand/${b.photo}.jpg"><div><b>${b.name}</b><small>${BRANCH_INFO[i]}</small>
      <span>${!open ? '앞 지점을 다 열면 열려요' : i === S.bi ? '지금 여기' : this.finished(i) ? '직원들이 장사 중' : '가기 ›'}</span></div>${idle > 0 ? `<button class="btn sm col" data-c="${i}"><i class="c"></i>${fmt(idle)}</button>` : ''}</div>`; }).join('');
    const m = this.modal(`<h3>🗺 ${BRAND.name} 지점</h3>${html}<p class="sm">게임 속 지점은 실제 ${BRAND.name} 매장이에요 · 다 연 지점은 직원들이 계속 장사해요 (최대 4시간)</p><button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close();
    m.querySelectorAll('[data-c]').forEach(b => b.onclick = e => { e.stopPropagation(); const i = +b.dataset.c, v = this.idleOf(i); if (!v) return; S.coins += v; S.branch[i].idleAt = Date.now(); save(); sfx('coin'); this.toast(`${BRANCHES[i].name} 수익 +${fmt(v)}`); this.progress(); this.map(); });
    m.querySelectorAll('.br:not(.lock)').forEach(b => b.onclick = () => { const i = +b.dataset.i; if (i !== S.bi) { this.close(); this.app.goBranch(i); } });
  }
  nextBranch(i) { S.maxBi = Math.max(S.maxBi || 0, i); save(true); sfx('levelup'); this.modal(`<h3>🎉 ${BRANCHES[i - 1].name} 완성!</h3><p>모든 설비를 열었어요.<br><b>${BRANCHES[i].name}</b>${josa(BRANCHES[i].name, '이/가').slice(BRANCHES[i].name.length)} 문을 열어요.</p><button class="btn" id="mOk">새 지점으로</button>`); $('#mOk').onclick = () => { this.close(); this.app.goBranch(i); }; }
  /* 쉬는 동안 번 돈: 창을 그냥 닫아도(바깥 · 뒤로) 1배는 받음 · 2배 광고를 그만두거나 못 보면 이 창으로 돌아옴 */
  offline(v) { let got = false; const take = () => { if (got) return; got = true; S.coins += v; save(); sfx('coin'); };
    this.modal(`<h3>☕ 쉬는 동안</h3><p>직원들이 돈을 벌어 놨어요! <b>+${fmt(v)}</b></p><div class="btns"><button class="btn ghost" id="o1">받기</button>${this.adOn() ? '<button class="btn" id="o2">📺 2배 받기</button>' : ''}</div>`, take);
    $('#o1').onclick = () => this.close();
    const o2 = $('#o2'); if (o2) o2.onclick = async () => { if (this._adBusy) return; got = true; this.close();
      const ok = await this.ad('offline', () => { S.coins += v * 2; save(); this.toast(`+${fmt(v * 2)}`); }); if (!ok) this.offline(v); }; }
  settings() { const m = this.modal(`<h3>⚙ 설정</h3><div class="tg"><button data-k="sfx" class="${S.set.sfx ? 'on' : ''}">효과음</button><button data-k="bgm" class="${S.set.bgm ? 'on' : ''}">배경음</button></div><p class="sm">${GAME.title} v${GAME.ver} · ${BRAND.name} 공식 게임<br>“${BRAND.slogan}”<br>메뉴·매장·사진 ${BRAND.name} 제공</p><a class="btn ghost" href="${BRAND.insta}" target="_blank" rel="noopener">📷 인스타그램 보기</a>
      <div class="dev"><b>🧪 테스트 도구 (출시 전에만)</b>${[1, 2, 3].map(n => { const v = slotInfo(n); return `<div class="slot"><span>슬롯 ${n}<small>${v || '비어 있음'}</small></span><button class="btn sm" data-sv="${n}">저장</button><button class="btn sm ${v ? '' : 'off'}" data-ld="${n}">불러오기</button></div>`; }).join('')}
      <div class="btns"><button class="btn sm" id="dvMoney">돈 +10,000</button><button class="btn sm danger" id="dvReset">처음부터</button></div></div><button class="btn ghost" id="mOk">닫기</button>`);
    m.querySelectorAll('.tg button').forEach(b => b.onclick = () => { S.set[b.dataset.k] = !S.set[b.dataset.k]; setAudio(S.set); save(); b.classList.toggle('on'); }); $('#mOk').onclick = () => this.close();
    m.querySelectorAll('[data-sv]').forEach(b => b.onclick = () => { save(true); try { localStorage.setItem(SLOT + b.dataset.sv, JSON.stringify({ at: Date.now(), d: localStorage.getItem(KEY) })); } catch { /* */ } this.toast(`슬롯 ${b.dataset.sv}에 저장했어요`); this.settings(); });
    m.querySelectorAll('[data-ld]').forEach(b => b.onclick = () => { const v = JSON.parse(localStorage.getItem(SLOT + b.dataset.ld) || 'null'); if (!v) return; S.last = Date.now(); window.__noSave = true; localStorage.setItem(KEY, v.d); location.reload(); });
    $('#dvMoney').onclick = () => { S.coins += 10000 * BRANCHES[S.bi].mult; save(); this.toast('돈 +' + fmt(10000 * BRANCHES[S.bi].mult)); };
    $('#dvReset').onclick = () => { if (!confirm('지금 진행이 모두 지워져요. 처음부터 할까요? (슬롯은 그대로)')) return; resetAll(); location.reload(); }; }
}
