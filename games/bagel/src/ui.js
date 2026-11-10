// 화면 (DESIGN 9장): 상시 버튼 4개(돈 · 진행 막대 + 지점 이름 · ≡ 메뉴 · 📺 부스트) · 빨간 점 ≤ 1 · 글자 띄우기 분당 ≤ 20 · 칸 이름표는 칸 위 · 줄 맨 앞 1명만 말풍선 · 안내 한 줄 + 화살표 하나
//   창(메뉴 · 상점 · 단골 · 꾸미기 · 미션 · 설정 · 쿠폰 · 광고 · 골드)은 ui_menu.js · 별채 책상 카드는 desk.js · 지도는 map.js
import * as THREE from 'three';
import { BRANCHES, COUPON, AD_DAY, AD_PLACES, STAFF } from './data.js?v=0.99.20';
import { S, save, couponReady, missionReady, vipOn, today } from './state.js?v=0.99.20';
import { sfx } from './audio.js?v=0.99.20';
import { pushBack, inOAD, exitToOAD } from './oad.js?v=0.99.20';
import { bm } from './oad_bm.js?v=0.99.20';
import { PAD_COLOR } from './pads.js?v=0.99.20';

const $ = s => document.querySelector(s), fmt = n => Math.round(n).toLocaleString('en-US');
export const IN = { x: 0, y: 0 };
const ICON = { bagel: '🥯', cream: '🥯', coffee: '🥣', drink: '☕' }, FLOAT_MAX = 20;
export class UI {
  constructor(app) {
    this.app = app; this._adBusy = false; const h = $('#hud');
    h.innerHTML = `<div class="top"><div class="coin" id="coin"><i class="c"></i><b id="cn">0</b></div><button class="prog" id="prog"><span><b id="bn"></b><em id="bl"></em></span><div class="pb"><s id="bp"></s></div></button><button class="mbtn" id="bMenu" aria-label="메뉴"><i></i><i></i><i></i><s class="dot" id="mDot"></s></button></div>
      <button class="adbtn" id="bAd"><b>📺</b><span id="adT">10/10</span></button><button class="bchip" id="bchip" hidden></button>
      <div class="guide" id="guide"></div><div class="garrow" id="garrow"><i></i></div>
      <div class="joy" id="joy"><i id="knob"></i></div><div class="sheet" id="sheet" hidden></div><div class="menusheet" id="menusheet" hidden></div><button id="bSet" hidden aria-hidden="true"></button>`;   /* #bSet: 원어데이 소리 점검(oneaday/tools/sound_check)이 여는 설정 단추 — 화면에는 ≡ 메뉴 안 「설정」 */
    this.tags = $('#tags'); this.floats = $('#floats'); this.floatT = [];
    $('#bMenu').onclick = () => this.menu(); $('#bSet').onclick = () => this.settings(); $('#prog').onclick = () => this.map(); $('#bAd').onclick = () => this.adPick(); $('#bchip').onclick = () => this.buildModal();
    this.joy(); this.progress();
    bm.hello().then(hh => { for (const it of hh.items || []) if (!S.items.includes(it)) S.items.push(it); if (hh.items?.includes('manager')) S.manager = true; this.adUi(); this.progress(); });
  }
  blocking() { return !!$('#modal').firstChild || !$('#mapv')?.hidden && !!$('#mapv'); }
  joy() {
    const area = $('#app'), base = $('#joy'), knob = $('#knob'); let id = null, cx = 0, cy = 0; const R = 50;
    const down = e => { if (e.target.closest('button, .modal, .sheet, .menusheet, .mapv, .regcard')) return; const t = e.changedTouches ? e.changedTouches[0] : e; id = e.changedTouches ? t.identifier : 'm'; cx = t.clientX; cy = t.clientY; base.style.left = cx + 'px'; base.style.top = cy + 'px'; base.classList.add('on'); this.menu(false); };
    const move = e => { if (id === null) return; const t = e.changedTouches ? [...e.changedTouches].find(q => q.identifier === id) : e; if (!t) return;
      let dx = t.clientX - cx, dy = t.clientY - cy; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; } IN.x = dx / R; IN.y = dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`; e.cancelable && e.preventDefault(); };
    const up = e => { if (id === null) return; if (e.changedTouches && ![...e.changedTouches].some(q => q.identifier === id)) return; id = null; IN.x = IN.y = 0; base.classList.remove('on'); knob.style.transform = ''; };
    area.addEventListener('touchstart', down, { passive: true }); area.addEventListener('touchmove', move, { passive: false }); area.addEventListener('touchend', up); area.addEventListener('touchcancel', up);
    area.addEventListener('mousedown', down); addEventListener('mousemove', move); addEventListener('mouseup', up);
    const keys = new Set(); addEventListener('keydown', e => { if (e.code === 'Escape') { const b = document.querySelector('#modal .mback'); b ? this.close() : this.menu(false); return; } keys.add(e.code); kb(); }); addEventListener('keyup', e => { keys.delete(e.code); kb(); });
    const kb = () => { if (id !== null) return; let x = 0, y = 0; if (keys.has('KeyA') || keys.has('ArrowLeft')) x--; if (keys.has('KeyD') || keys.has('ArrowRight')) x++; if (keys.has('KeyW') || keys.has('ArrowUp')) y--; if (keys.has('KeyS') || keys.has('ArrowDown')) y++; const l = Math.hypot(x, y) || 1; IN.x = x / l; IN.y = y / l; };
  }
  clearTags() { this.tags.innerHTML = ''; this.floats.innerHTML = ''; this._padTags = new Map(); }
  onBuild() { this.progress(); this.desk(null); }
  scr(x, y, z) { const v = (this._v ||= new THREE.Vector3()); v.set(x, y, z).project(this.app.game.cam); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }
  put(el, x, y, z, ax = '-50%', ay = '-100%') { const [sx, sy] = this.scr(x, y, z); el.style.transform = `translate(${sx | 0}px,${sy | 0}px) translate(${ax},${ay})`; return [sx, sy]; }
  el(cls) { const d = document.createElement('div'); d.className = cls; this.tags.append(d); return d; }
  // ── 한 프레임 화면
  frame(g) {
    const c = $('#cn'), cv = fmt(S.coins); if (c.textContent !== cv) c.textContent = cv;
    // 칸 이름표: 칸 바로 위 (값 · 진행 원 · 짧은 이름) — 다음 칸 1~3개
    this._padTags ||= new Map(); const seen = new Set(), boxes = [];
    for (const p of g.pads.list) { if (p.done) continue; seen.add(p); let t = this._padTags.get(p); if (!t) { t = this.el('ptag ' + p.kind); this._padTags.set(p, t); p.tag = t; }
      const left = Math.max(0, p.cost - p.paid), fill = p.cost ? p.paid / p.cost : 0, ok = S.coins >= left, html = `<i style="--p:${Math.round(fill * 100)}%;--c:${PAD_COLOR[p.kind]}"></i><b>${fmt(left)}</b><small>${p.name}</small>`;
      if (t._h !== html) { t.innerHTML = html; t._h = html; } t.classList.toggle('ok', ok); t.classList.toggle('poor', !ok && !fill);
      const [sx, sy] = this.scr(p.at[0], 60, p.at[1] - Math.min(60, p.size[1] / 2)); if (t._h2 !== t._h) { t._w = t.offsetWidth; t._hh = t.offsetHeight; t._h2 = t._h; } boxes.push({ t, x: sx, y: sy, w: t._w, h: t._hh }); }
    /* 이름표끼리 안 겹치게: 화면 아래쪽 칸부터 자리 잡고, 겹치면 위로 올림 (칸 바로 위 원칙은 그대로) */
    boxes.sort((a, b) => b.y - a.y); const placed = [];
    for (const q of boxes) { for (let k = 0; k < 6; k++) { const hit = placed.find(o => q.x - q.w / 2 < o.x + o.w / 2 + 2 && o.x - o.w / 2 < q.x + q.w / 2 + 2 && q.y - q.h < o.y + 2 && o.y - o.h < q.y + 2); if (!hit) break; q.y = hit.y - hit.h - 4; } placed.push(q); q.t.style.transform = `translate(${q.x | 0}px,${q.y | 0}px) translate(-50%,-100%)`; }
    for (const [p, t] of this._padTags) if (!seen.has(p)) { t.remove(); this._padTags.delete(p); }
    // 줄 맨 앞 1명만 주문 그림 + 개수 · 창구 맨 앞 1명 · 통화 손님 📞
    const front = g.cust.find(x => x.state === 'order' && (x.phone || x.order.some(o => o.got < o.n))); const fb = (this._fb ||= this.el('bub front')); fb.style.display = front ? '' : 'none';
    if (front) { const html = `${front.reg ? `<i class="rn">💌 ${front.reg.name}</i>` : ''}${front.group ? '<i class="rn">👥</i>' : ''}${front.phone ? '<b>📞</b>' : front.order.filter(o => o.got < o.n).map(o => `<b>${ICON[o.k]}</b><em>${o.n - o.got}</em>`).join('')}`; if (fb._h !== html) { fb.innerHTML = html; fb._h = html; } this.put(fb, front.pos.x, 230, front.pos.z); }
    const wf = g.cust.find(x => x.win && x.state === 'wwait'), wb = (this._wb ||= this.el('bub')); wb.style.display = wf ? '' : 'none';
    if (wf) { const html = `${wf.car ? '🚗' : '🛍'} ${wf.order.filter(o => o.got < o.n).map(o => `<b>${ICON[o.k]}</b><em>${o.n - o.got}</em>`).join('')}`; if (wb._h !== html) { wb.innerHTML = html; wb._h = html; } this.put(wb, wf.pos.x, wf.car ? 200 : 230, wf.pos.z); }
    // 조는 직원 zZ
    for (const w of g.staff) { if (w.rest) { w.zz ||= this.el('zz'); w.zz.textContent = 'zZ'; this.put(w.zz, w.pos.x, 220 + (w.y || 0), w.pos.z); } else if (w.zz) { w.zz.remove(); w.zz = null; } }
    // 안내: 한 줄 + 화살표 하나 (그 방향으로 움직이면 흐려짐)
    const gd = g.guide.cur, el = $('#guide'), ar = $('#garrow');
    if (gd) { const html = gd.text.replace(gd.hi, `<em>${gd.hi}</em>`); if (el._h !== html) { el.innerHTML = html; el._h = html; } el.classList.add('on');
      if (gd.at) { let [sx, sy] = this.scr(gd.at[0], 40, gd.at[1]); const m = 40, W = innerWidth, H = innerHeight, off = sx < m || sy < 90 || sx > W - m || sy > H - 120; const toward = this._toward(g, gd.at);
        if (off) { const cx = W / 2, cy = H / 2, ang = Math.atan2(sy - cy, sx - cx); sx = Math.max(m, Math.min(W - m, sx)); sy = Math.max(100, Math.min(H - 130, sy)); ar.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-50%) rotate(${ang + Math.PI / 2}rad)`; }
        else ar.style.transform = `translate(${sx}px,${sy - 70}px) translate(-50%,-50%) rotate(180deg)`;
        ar.classList.add('on'); ar.classList.toggle('dim', toward); el.classList.toggle('dim', toward); } else ar.classList.remove('on'); }
    else { el.classList.remove('on'); ar.classList.remove('on'); }
    // 공사 칩
    if ((this._bc = (this._bc || 0) + 1) % 15 === 0) { const bd = Object.entries(g.br.build || {}), bc = $('#bchip'); bc.hidden = !bd.length; if (bd.length) { const [id, end] = bd.sort((a, b) => a[1] - b[1])[0]; const l = Math.max(0, (end - Date.now()) / 1000), hh = `🔨 ${g.pads.label({ id, kind: id === g.sp.feat ? 'feat' : 'node' })} <b>${Math.floor(l / 3600) ? Math.floor(l / 3600) + '시간 ' : ''}${Math.floor(l / 60) % 60}분</b> <em>⚡</em>`; if (bc._h !== hh) { bc.innerHTML = hh; bc._h = hh; } } }
    // 띄운 글자 (분당 ≤ 20)
    for (const d of [...this.floats.children]) { d._t += 1 / 60; d._p.y += 1.4; this.put(d, d._p.x, d._p.y, d._p.z, '-50%', '-50%'); d.style.opacity = Math.max(0, 1 - d._t / 1.2); if (d._t > 1.2) d.remove(); }
    const b = (+S.boostUntil || 0) - Date.now(), ad = $('#bAd'); if (b > 0) $('#adT').textContent = `${Math.floor(b / 60000)}:${String(Math.floor(b / 1000) % 60).padStart(2, '0')}`; ad.classList.toggle('on', b > 0); if (b <= 0 && this._wasB) this.adUi(); this._wasB = b > 0;
  }
  _toward(g, at) { const dx = at[0] - g.pl.pos.x, dz = at[1] - g.pl.pos.z, d = Math.hypot(dx, dz); if (d < 1 || (g.pl.spd || 0) < 50) return false; const vx = g.pl.pos.x - (this._px ?? g.pl.pos.x), vz = g.pl.pos.z - (this._pz ?? g.pl.pos.z); this._px = g.pl.pos.x; this._pz = g.pl.pos.z; const v = Math.hypot(vx, vz); return v > 0.5 && (vx * dx + vz * dz) / (v * d) > 0.8; }
  /* 글자 띄우기: 분당 20 개까지 (넘으면 버림) */
  float(t, pos, cls = '') { const now = performance.now(); this.floatT = this.floatT.filter(x => now - x < 60000); if (this.floatT.length >= FLOAT_MAX) return; this.floatT.push(now); (window.__floats ||= []).push(now);
    const d = document.createElement('div'); d.className = 'float ' + cls; d.textContent = t; d._p = new THREE.Vector3(pos.x ?? pos[0], (pos.y || 0) + 200, pos.z ?? pos[1]); d._t = 0; this.floats.append(d); }
  say(t, pos) { this.float(t, pos, 'say'); }
  money(v) { const c = $('#coin'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  /* 새로 열림: 알림 한 줄 (+ 칸 다 참 「+N」 대신 이름) */
  unlocked(o, name) { const g = this.app.game, sp = g.sp; this.progress();
    if (o.kind === 'hire') this.note(`🧑‍🍳 ${STAFF[o.id]?.name || o.id} 합류!`, { force: true });
    else if (o.kind === 'up') this.note(`⬆ ${name}`, { force: true });
    else if (o.kind === 'next') this.nextBranch(g.bi + 1);
    else if (o.build) this.note(`🔨 ${name} 공사 시작 · 장사는 그대로`, { force: true });
    else this.note(`✨ ${name} 생겼어요!`, { force: true });
    if (o.kind !== 'up' && o.kind !== 'hire') { const at = sp.nodes[o.id]?.pick || null; if (at) this.float(`+ ${name}`, { x: at[0], z: at[1] }, 'new'); }
    if (this.app.game.pads.progress() >= 1 && !S.branch[g.bi].doneShown) { S.branch[g.bi].doneShown = 1; if (!S.coupons.some(c => c.b === g.bi)) S.coupons.push({ b: g.bi, at: Date.now(), test: true }); save(true); setTimeout(() => { sfx('coupon'); this.branchDone(g.bi); }, 900); } }   /* 지점 완성 쿠폰 (의뢰사 확인 전 시험용 · 지도에 개수) */
  adUi() { const b = $('#bAd'); if (!b) return; const h = bm.info; b.hidden = !!(h.ok && h.group === 'A'); b.classList.toggle('spent', !this.adOn() && !this.boost()); const n = $('#adT'); if (n && !this.boost()) n.textContent = `${this.adLeft()}/${AD_DAY}`; }
  boost() { return Date.now() < (+S.boostUntil || 0); }
  get boostUntil() { return +S.boostUntil || 0; }
  adDay() { if (S.ads.day !== today()) S.ads = { day: today(), n: 0 }; if (S.adp.day !== today()) S.adp = { day: today(), n: {} }; }
  adLeft() { this.adDay(); const h = bm.info, mine = Math.max(0, AD_DAY - S.ads.n); if (h.ok) return h.group === 'A' ? 0 : vipOn() || h.owned ? mine : Math.min(mine, Math.max(0, (h.ads && h.ads.rewardLeft) || 0)); return mine; }
  adOn() { const h = bm.info; if (h.ok && h.group === 'A') return false; return this.adLeft() > 0; }
  placeLeft(pl) { this.adDay(); const P = AD_PLACES[pl]; return P ? Math.max(0, P.cap - (S.adp.n[pl] || 0)) : 0; }
  slotOk(pl) { return this.adOn() && this.placeLeft(pl) > 0; }
  goldOf(sku) { return bm.info.ok && bm.info.group !== 'A' ? bm.price(sku) : 0; }
  progress() {
    const g = this.app.game; if (!g || !g.pads) return; const B = BRANCHES[S.bi], pct = Math.round(g.pads.progress() * 100);
    $('#bn').textContent = B.name.replace(/점$/, '').replace('호점 · ', '호점 · '); $('#bl').textContent = pct >= 100 ? '★' : pct + '%'; $('#bp').style.width = pct + '%';
    /* 빨간 점은 하나만: 받을 것(쿠폰 · 미션 · 단골 이야기 · 선물) 중 하나라도 */
    const dot = couponReady() || missionReady() || Object.values(S.reg).some(r => (r.lv || 0) > (r.seen || 0)) || (S.gift !== today() && !g.own('store')); $('#mDot').style.display = dot ? 'block' : 'none';
    this.adUi(); }
  // ── ≡ 메뉴 (지도 · 상점 · 단골 · 꾸미기 · 미션 · 메뉴 숙련 · 쿠폰 · 설정)
  menu(on = !this._menuOn) { const m = $('#menusheet'); if (!m) return; this._menuOn = on; m.hidden = !on; if (!on) { this._mbk && this._mbk(); this._mbk = null; return; }
    const it = [['map', '🗺', '지도'], ['shop', '🛍', '상점'], ['regulars', '💌', '단골'], ['decoShop', '🪴', '꾸미기'], ['missions', '📋', '미션'], ['menuBook', '📖', '메뉴 숙련'], ['coupon', '🎟', `쿠폰 ${S.sold}/${COUPON.goal}`], ['settings', '⚙', '설정'], ...(inOAD ? [['exit', '↩', '원어데이']] : [])];
    m.innerHTML = it.map(([k, i, n]) => `<button data-k="${k}"><b>${i}</b>${n}</button>`).join(''); sfx('card');
    m.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k; this.menu(false); if (k === 'exit') exitToOAD(); else this[k](); });
    this._mbk = pushBack(() => { this.menu(false); return true; }); }
}
