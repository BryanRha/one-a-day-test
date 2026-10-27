// 화면: 돈 · 마음 · 원두 · 레벨 · 머신/로스터 창 · 단골 사연 · 꾸미기 · 주문서 · 출석 · 가게(매장·동료) · 설정 · 말풍선
import * as THREE from 'three';
import { BRAND, GAME, MENU, CATS, ROAST, FURN, FURN_CATS, STAFF, STORES, REGULARS, XP, COUPON, BEAN_MAX, FAVOR_MAX } from './data.js?v=0.68.0';
import { S, ST, save, today, couponReady, claimCoupon, levelOf, dayTick, newStore, now } from './state.js?v=0.68.0';
import { cup } from './models.js?v=0.68.0';
import { fmt, machineCount, storeMult, WALL_SLOTS } from './game.js?v=0.68.0';
import { sfx, setAudio } from './audio.js?v=0.68.0';
import { pushBack, inOAD, exitToOAD } from './oad.js?v=0.68.0';

const $ = s => document.querySelector(s);
const SLOT = 'gamsung_slot_';
const mmss = s => s >= 3600 ? `${Math.floor(s / 3600)}시간 ${Math.floor(s % 3600 / 60)}분` : s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}초`;
const tlabel = s => s >= 3600 ? `${Math.round(s / 360) / 10}시간` : s >= 60 ? `${Math.round(s / 6) / 10}분` : `${s}초`;

// 메뉴 그림: 공식 사진이 있으면 사진 · 없으면 3D 잔을 그려서 (처음 한 번)
const THUMB = {};
function thumbs() { const R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); R.setSize(128, 128); R.outputColorSpace = THREE.SRGBColorSpace;
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xFFF4E6, 0x8A6A50, 1.6)); const d = new THREE.DirectionalLight(0xFFFFFF, 1.4); d.position.set(60, 120, 100); sc.add(d);
  const cam = new THREE.OrthographicCamera(-26, 26, 32, -20, 1, 1000); cam.position.set(70, 70, 120); cam.lookAt(0, 18, 0);
  for (const [k, m] of Object.entries(MENU)) { const g = cup(m.look); sc.add(g); R.render(sc, cam); THUMB[k] = R.domElement.toDataURL(); sc.remove(g); } R.dispose(); }
export const pic = k => MENU[k].photo ? `assets/brand/${MENU[k].photo}.jpg` : THUMB[k];

export class UI {
  constructor(app) {
    this.app = app; thumbs(); const h = $('#hud');
    h.innerHTML = `<div class="top"><div class="pill coin"><i></i><b id="cn">0</b></div><div class="pill heart"><i>♥</i><b id="hn">0</b></div><div class="pill bean" id="beanP"><i>🫘</i><b id="bn">0</b></div></div>
      <div class="lvl" id="lvl"><b id="lvt"></b><em id="sco"></em><div class="pb"><s id="lvp"></s></div></div>
      <div class="side"><button class="sb" id="bOrd"><span>📜</span>주문서<i class="dot" id="ordDot"></i></button><button class="sb" id="bAtt"><span>🎁</span>출석<i class="dot" id="attDot"></i></button><button class="sb ad" id="bAd"><span>▶</span><em id="adT">손님×2</em></button>${inOAD ? '<button class="sb" id="bExit"><span>↩</span>원어데이</button>' : ''}</div>
      <div class="cp" id="cp"><b>🎟 매장 쿠폰까지</b><div class="pb"><s id="cpb"></s></div><span id="cpt"></span></div>
      <div class="hint" id="hint"></div><div class="rail" id="rail"></div>
      <div class="bottom" id="bottom">${[['☕', '메뉴', 'menu'], ['🪑', '꾸미기', 'deco'], ['💌', '단골', 'reg'], ['🗺️', '가게', 'shop'], ['⚙️', '설정', 'set']].map(([i, t, k]) => `<button class="bb" data-b="${k}"><i class="dot" id="dot_${k}"></i><span>${i}</span>${t}</button>`).join('')}</div>
      <div class="decobar" id="decobar"></div>`;
    this.tags = $('#tags'); this.floats = $('#floats');
    $('#bottom').onclick = e => { const b = e.target.closest('[data-b]'); if (!b) return; sfx('tap', { vol: 0.4 }); ({ menu: () => this.menuBook(), deco: () => this.decoEnter(), reg: () => this.regulars(), shop: () => this.shop(), set: () => this.settings() })[b.dataset.b](); };
    $('#bOrd').onclick = () => this.orders(); $('#bAtt').onclick = () => this.attendance(); $('#bAd').onclick = () => this.ad('boost'); $('#cp').onclick = () => this.coupon(); $('#beanP').onclick = () => this.roastSheet();
    if ($('#bExit')) $('#bExit').onclick = () => exitToOAD();
    this.chips = new Map();
  }
  clearTags() { this.tags.innerHTML = ''; this.chips = new Map(); }
  bubble() { const d = document.createElement('div'); d.className = 'bub'; this.tags.append(d); return d; }
  float(t, pos, cls) { const d = document.createElement('div'); d.className = 'float ' + (cls || ''); d.textContent = t; d._p = pos.clone(); d._t = 0; this.floats.append(d); }
  toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(this._tt); this._tt = setTimeout(() => el.classList.remove('on'), 2000); }
  modal(html, cls = '') { const m = $('#modal'), cur = m.querySelector('.modal'); if (cur && this._ub) { cur.className = 'modal ' + cls; cur.innerHTML = html; return m; }
    m.innerHTML = `<div class="mback"><div class="modal ${cls}">${html}</div></div>`; const t0 = performance.now(); m.firstChild.onclick = e => { if (e.target === m.firstChild && performance.now() - t0 > 400) this.close(); };   /* 연 손가락의 클릭이 바로 닫지 않게 */ this._ub = pushBack(() => { this.close(); return true; }); return m; }
  close() { $('#modal').innerHTML = ''; this._ub && this._ub(); this._ub = null; }
  // ── 화면 위 표시: 말풍선 · 머신 시간 · 치울 잔
  chip(key, cls, act) { let d = this.chips.get(key); if (!d) { d = document.createElement('div'); d.className = 'chip ' + cls; this.tags.append(d); this.chips.set(key, d); if (act) { d.classList.add('tap'); d.addEventListener('click', e => { e.stopPropagation(); this.tap(act()); }); } } d._seen = true; return d; }   /* 머리 위 표시도 누르면 그 설비를 누른 것과 같음 */
  frame(g) {
    const cam = this.app.cam, W = innerWidth, H = innerHeight, v = new THREE.Vector3(), at = (x, y, z) => { v.set(x, y, z).project(cam); return `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px)`; };
    $('#cn').textContent = fmt(S.coins); $('#hn').textContent = fmt(S.hearts); $('#bn').textContent = fmt(S.beans); $('#beanP').classList.toggle('low', S.beans < 6);
    for (const d of [...this.floats.children]) { d._t += 1 / 60; d._p.y += 1.4; v.copy(d._p).project(cam); d.style.transform = `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px) translate(-50%,-50%)`; d.style.opacity = Math.max(0, 1 - d._t / 1.3); if (d._t > 1.3) d.remove(); }
    for (const c of g.cust) { if (!c.tag) continue; const show = ['story', 'kiosk', 'seated', 'toSeat', 'sitting'].includes(c.state) && !g.deco; c.tag.style.display = show ? '' : 'none'; if (!show) continue;
      c.tag.style.transform = at(c.pos.x, 230, c.pos.z) + ' translate(-50%,-100%)';
      const html = c.state === 'story' ? `<i class="lt">💌</i><b>${c.reg.name}</b><small>눌러서 이야기 듣기</small>` : c.state === 'kiosk' ? '<b>📱 주문 중…</b>' : `<i class="no">#${c.ticket ? c.ticket.no : ''}</i><img src="${pic(c.menu)}"><b>${MENU[c.menu].name.replace(' 라떼', '')}</b>${c.w > 60 ? '<em>😌</em>' : ''}`;
      if (c.tag._h !== html) { c.tag.innerHTML = html; c.tag._h = html; } c.tag.classList.toggle('story', c.state === 'story'); c.tag.classList.toggle('reg', !!c.reg); c.tag.classList.toggle('has', g.avail(c.menu) > 0); }
    this.rail(g);
    for (const d of this.chips.values()) d._seen = false;
    if (!g.deco) {
      for (const m of g.machines) { const p = g.progress(m), d = this.chip('m' + m.key, 'mach', () => ({ kind: 'machine', m })); d.style.transform = at(m.x, 250, m.z) + ' translate(-50%,-100%)';
        const html = !p ? `<span class="idle">${m.kind === 'oven' ? '🍰' : '☕'} 비었어요</span>` : p.u >= 1 ? `<img src="${pic(p.s.menu)}"><b>완성! ×${p.s.n}</b>` : `<img src="${pic(p.s.menu)}"><s><i style="width:${p.u * 100}%"></i></s><em>${mmss(p.left)}</em>`;
        if (d._h !== html) { d.innerHTML = html; d._h = html; } d.classList.toggle('done', !!p && p.u >= 1); d.classList.toggle('empty', !p); }
      { const r = g.roastState(), d = this.chip('roast', 'mach', () => ({ kind: 'roaster' })); d.style.transform = at(g.roaster.x, 330, g.roaster.z) + ' translate(-50%,-100%)'; const html = !r ? `<span class="idle">🫘 원두 볶기</span>` : r.u >= 1 ? `<b>🫘 원두 +${r.R.beans}</b>` : `<span>🫘</span><s><i style="width:${r.u * 100}%"></i></s><em>${mmss(r.left)}</em>`; if (d._h !== html) { d.innerHTML = html; d._h = html; } d.classList.toggle('done', !!r && r.u >= 1); d.classList.toggle('empty', !r); }
      for (const o of g.furn) o.seats.forEach((s, k) => { if (!s.dirty) return; const d = this.chip('d' + o.f.uid + '_' + k, 'dirty', () => ({ kind: 'dirty', o, k })); d.style.transform = at(s.dirty.position.x, 150, s.dirty.position.z) + ' translate(-50%,-100%)'; if (!d._h) { d.innerHTML = '✨'; d._h = 1; } });
    }
    for (const [k, d] of this.chips) if (!d._seen) { d.remove(); this.chips.delete(k); }
    const b = g.boostUntil - now(); $('#adT').textContent = b > 0 ? mmss(Math.ceil(b / 1000)) : '손님×2'; $('#bAd').classList.toggle('on', b > 0);
    if (!this._pt || performance.now() - this._pt > 1000) { this._pt = performance.now(); this.progress(); }
  }
  /* 주문 레일: 화면 아래 주문표 (누르면 그 메뉴를 내릴 머신 창) */
  rail(g) { const el = $('#rail'); if (!el) return; const ts = g.deco ? [] : g.tickets.slice(0, 6); const html = ts.map(t => { const ready = (ST().bar[t.menu] || 0) > 0, brewing = g.machines.some(m => { const p = g.progress(m); return p && p.s.menu === t.menu && p.u < 1; });
      return `<button class="tk ${ready ? 'ready' : brewing ? 'brew' : ''}" data-tk="${t.no}"><img src="${pic(t.menu)}"><span><i>#${t.no}</i><b>${MENU[t.menu].name.replace(' 라떼', '')}</b><small>${ready ? '픽업대에 있어요' : brewing ? '만드는 중' : '만들어 주세요'}</small></span></button>`; }).join('') + (g.tickets.length > 6 ? `<span class="more">+${g.tickets.length - 6}</span>` : '');
    if (el._h !== html) { el.innerHTML = html; el._h = html; el.querySelectorAll('[data-tk]').forEach(b => b.onclick = () => { const t = g.tickets.find(x => x.no === +b.dataset.tk); if (!t) return; const d = MENU[t.menu], m = g.machines.find(x => !g.progress(x) && (x.kind === 'oven') === !!d.oven); if (!m) return this.toast(d.oven ? '오븐이 모두 굽는 중이에요' : '머신이 모두 내리는 중이에요'); this._cat = d.cat; this.brewSheet(m); this._sel = t.menu; this.brewSheet(m); }); } }
  progress() {
    const g = this.app.game; if (!g || !g.machines) return; dayTick(); const lv = S.lv, a = XP[lv - 1] || 0, bnext = XP[lv] || a + 1;
    $('#lvt').textContent = `Lv.${lv} · ${STORES[S.si].name}`; $('#sco').textContent = `감성 지수 ${g.score()}`; $('#lvp').style.width = Math.min(100, (S.xp - a) / (bnext - a) * 100) + '%';
    $('#ordDot').style.display = S.orders.some(o => !o.done && (S.soldBy[o.menu] || 0) >= o.n) ? 'block' : 'none'; $('#attDot').style.display = S.att.last !== today() ? 'block' : 'none';
    $('#dot_reg').style.display = REGULARS.some(R => S.lv >= R.lv && !S.reg[R.id]) ? 'block' : 'none'; $('#dot_shop').style.display = Object.entries(STAFF).some(([k, d]) => !S.staff[k] && S.lv >= d.lv) || STORES.some((s, i) => S.lv >= s.lv && !S.stores[i]) ? 'block' : 'none';
    $('#dot_deco').style.display = 'none';
    const r = Math.min(1, S.sold / COUPON.goal); $('#cpb').style.width = r * 100 + '%'; $('#cpt').textContent = S.coupon ? '오늘 쿠폰 받았어요' : couponReady() ? '쿠폰 받기!' : `오늘 ${S.sold} / ${COUPON.goal}잔`; $('#cp').classList.toggle('ready', couponReady());
    document.body.classList.toggle('decoing', !!g.deco);
  }
  // ── 처음 안내 (Lv.4 전까지): 지금 할 일 하나를 화살표로
  guide() {
    const g = this.app.game, h = $('#hint'); if (g.deco || S.lv >= 5) { h.classList.remove('on'); return null; }
    const say = (t, x, z, y) => { if (h.textContent !== t) h.textContent = t; h.classList.add('on'); return [x, z, y]; };
    const done = g.machines.find(m => { const p = g.progress(m); return p && p.u >= 1; }); if (done) return say('다 내렸어요! 눌러서 픽업대에 놓아요', done.x, done.z, 330);
    const r = g.roastState(); if (r && r.u >= 1) return say('원두가 다 볶아졌어요! 눌러서 담아요', g.roaster.x, g.roaster.z, 380);
    if (S.beans < 3 && !r) return say('원두가 떨어졌어요 · 로스터를 눌러 볶아요', g.roaster.x, g.roaster.z, 380);
    const idle = g.machines.find(m => !g.progress(m) && m.kind === 'espresso'); if (idle && g.barTotal() < 3) return say('머신을 눌러 메뉴를 내려요', idle.x, idle.z, 300);
    const tk = g.tickets.find(t => !(ST().bar[t.menu] > 0) && !g.machines.some(m => g.progress(m)?.s.menu === t.menu)); if (tk && !done) { const m = g.machines.find(x => !g.progress(x) && (x.kind === 'oven') === !!MENU[tk.menu].oven); if (m) return say(`주문 #${tk.no} ${MENU[tk.menu].name} · 아래 주문표나 머신을 눌러요`, m.x, m.z, 300); }
    if ((ST().ret || 0) >= 5) return say('반납대에 쟁반이 쌓였어요 · 눌러서 설거지', -190, -455, 220);
    const dirty = g.seats().find(x => x.s.dirty); if (dirty) return say('테이블을 눌러 닦아요 · 다음 손님이 앉을 수 있어요', dirty.s.dirty.position.x, dirty.s.dirty.position.z, 200);
    if (S.lv >= 2 && g.score() < 40) { h.textContent = '꾸미기로 가게를 채우면 손님이 더 자주 와요'; h.classList.add('on'); return null; }
    h.classList.remove('on'); return null;
  }
  // ── 누르기
  tap(p, fp) {
    const g = this.app.game;
    if (g.deco) { if (!p) return; if (p.kind === 'furn') { const e = g.pickFurn(p.o); if (e) this.toast(e); else sfx('pick', { vol: 0.4 }); } else if (p.kind === 'wall') this.wallMenu(p.slot); else if (p.kind === 'floor' && g.deco.ghost && fp) g.ghostMove(fp.x, fp.z); return; }
    if (!p) return;
    if (p.kind === 'machine') { const pr = g.progress(p.m); if (pr && pr.u >= 1) { if (g.collect(p.m) && S.tut < 2) S.tut = 2; return; } if (pr) return this.brewing(p.m); return this.brewSheet(p.m); }
    if (p.kind === 'roaster') { const r = g.roastState(); if (r && r.u >= 1) return g.collectBeans(); if (r) return this.brewing(g.roaster); return this.roastSheet(); }
    if (p.kind === 'dirty') return g.requestClean(p.o, p.k);
    if (p.kind === 'story') return this.story(p.c);
    if (p.kind === 'cust') return this.toast(`#${p.c.ticket ? p.c.ticket.no : ''} ${MENU[p.c.menu].name} 기다리는 중 · 픽업대에 나오면 손님이 가지러 가요`);
    if (p.kind === 'bar') return this.menuBook();
    if (p.kind === 'return') return g.wash() || this.toast('반납대가 비어 있어요');
  }
  // ── 머신: 메뉴 고르기
  brewSheet(m) {
    const oven = m.kind === 'oven', cats = oven ? [['dessert', '디저트']] : CATS.filter(c => c[0] !== 'dessert'); this._cat = cats.some(c => c[0] === this._cat) ? this._cat : cats[0][0]; this._sel = null;
    const draw = () => { const list = Object.entries(MENU).filter(([, d]) => d.cat === this._cat);
      const cards = list.map(([k, d]) => { const lock = S.lv < d.lv, need = d.bean * d.n, short = S.beans < need; return `<div class="mc ${lock ? 'lock' : ''} ${this._sel === k ? 'sel' : ''}" data-k="${k}"><img src="${pic(k)}"><div class="in"><b>${d.name}</b><div class="row"><span>⏱ ${tlabel(d.t)}</span><em>₩${fmt(d.price * storeMult())}</em></div><div class="row"><span>×${d.n}잔</span>${need ? `<span class="${short ? 'short' : ''}">🫘${need}</span>` : '<span>원두 없이</span>'}</div></div>${lock ? `<div class="lk">🔒 Lv.${d.lv}</div>` : ''}</div>`; }).join('');
      const sel = this._sel && MENU[this._sel];
      const md = this.modal(`<h2>${oven ? '디저트 굽기' : '메뉴 내리기'}</h2><div class="sub">${oven ? '오븐' : '에스프레소 머신'} ${m.i + 1} · 원두 ${fmt(S.beans)}잔분 · 갓 내린 잔을 빨리 내어 주면 ♥ + 팁</div>
        <div class="tabs">${cats.map(([k, t]) => `<button data-c="${k}" class="${k === this._cat ? 'on' : ''}">${t}</button>`).join('')}</div><div class="menus">${cards}</div>
        <button class="go ${sel ? '' : 'off'}" id="go">${sel ? `${sel.name} ${sel.n}잔 ${oven ? '굽기' : '내리기'} · ${tlabel(sel.t)}` : '메뉴를 골라요'}</button>`, 'sheet');
      md.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { this._cat = b.dataset.c; this._sel = null; draw(); });
      md.querySelectorAll('.mc:not(.lock)').forEach(b => b.onclick = () => { this._sel = b.dataset.k; sfx('tap', { vol: 0.4 }); draw(); });
      $('#go').onclick = () => { if (!this._sel) return; const e = this.app.game.brew(m, this._sel); if (e) { this.toast(e); if (e.startsWith('원두')) setTimeout(() => this.roastSheet(), 600); return; } if (S.tut < 1) S.tut = 1; this.close(); this.toast(`${MENU[this._sel].name} ${oven ? '굽는' : '내리는'} 중…`); }; };
    draw();
  }
  brewing(m) { const g = this.app.game, roast = m === g.roaster, info = roast ? g.roastState() : g.progress(m); if (!info) return; const name = roast ? info.R.name : MENU[info.s.menu].name, left = info.left;
    const hc = Math.max(1, Math.ceil(left / 120));
    const md = this.modal(`<h2>${name}</h2><div class="sub">${roast ? '볶는 중' : '내리는 중'} · 남은 시간 ${mmss(left)}</div><div class="pbig"><s style="width:${info.u * 100}%"></s></div>
      <div class="btns"><button class="btn ghost" id="fAd">📺 광고 보고 바로 완성</button><button class="btn" id="fH">♥ ${hc}로 바로 완성</button></div><button class="btn ghost" id="mOk">닫기</button>`);
    $('#mOk').onclick = () => this.close(); $('#fAd').onclick = () => this.ad('finish', () => { g.finishNow(roast ? { kind: 'roaster' } : m); });
    $('#fH').onclick = () => { if (S.hearts < hc) return this.toast('마음(♥)이 모자라요 · 손님을 빨리 받으면 모여요'); S.hearts -= hc; g.finishNow(roast ? { kind: 'roaster' } : m); save(); this.close(); sfx('reward'); }; }
  // ── 로스터
  roastSheet() {
    const g = this.app.game, r = g.roastState(); if (r) return r.u >= 1 ? g.collectBeans() : this.brewing(g.roaster);
    const md = this.modal(`<h2>원두 볶기</h2><div class="sub">지금 원두 ${fmt(S.beans)} / ${BEAN_MAX}잔분 · 볶는 동안 나가 있어도 계속 볶아져요</div>
      <div class="uplist">${ROAST.map(R => { const lock = S.lv < R.lv, c = R.cost * storeMult(); return `<div class="upr ${lock ? 'lock' : ''}"><i>🫘</i><div><b>${R.name} <em>+${R.beans}잔분</em></b><span>${R.desc} · ⏱ ${tlabel(R.t)}</span></div><button class="btn sm ${lock || S.coins < c ? 'off' : ''}" data-r="${R.id}">${lock ? `Lv.${R.lv}` : `<i class="c"></i>${fmt(c)}`}</button></div>`; }).join('')}</div><button class="btn ghost" id="mOk">닫기</button>`);
    $('#mOk').onclick = () => this.close(); md.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { const e = g.roast(b.dataset.r); if (e) return this.toast(e); this.close(); this.toast('원두를 볶기 시작했어요'); });
  }
  // ── 메뉴 (바 진열 · 판매)
  menuBook() {
    const list = Object.entries(MENU).map(([k, d]) => { const lock = S.lv < d.lv, n = ST().bar[k] || 0; return `<div class="upr ${lock ? 'lock' : ''}"><img class="th" src="${pic(k)}"><div><b>${d.name} ${n ? `<em>바에 ${n}잔</em>` : ''}</b><span>${lock ? `Lv.${d.lv}에 열려요` : `₩${fmt(d.price * storeMult())} · ⏱ ${tlabel(d.t)} · 지금까지 ${fmt(S.menuSold[k] || 0)}잔`}</span></div></div>`; }).join('');
    const m = this.modal(`<h2>☕ 메뉴</h2><div class="sub">머신을 눌러 내리고, 다 되면 눌러서 픽업대에 놓아요 · 손님은 픽업대에 놓인 메뉴를 먼저 골라 쟁반째 가져가요</div><div class="uplist">${list}</div><button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close();
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
      this.toast(ch[2] >= 3 ? `${R.name}의 마음에 닿았어요 ♥♥♥` : ch[2] >= 2 ? `${R.name}이(가) 미소 지어요 ♥♥` : ch[2] ? `${R.name}이(가) 고개를 끄덕여요 ♥` : `${R.name}이(가) 조용히 창밖을 봐요`); });
  }
  // ── 꾸미기 모드
  decoEnter() { const g = this.app.game; if (g.deco) return; g.decoStart(); this._fc = this._fc || 'table'; this.decoBar(null); this._decoUb = pushBack(() => { this.decoExit(); return true; }); this.toast('가구를 고르거나, 놓인 가구를 눌러 옮겨요'); }
  decoExit() { this.app.game.decoEnd(); $('#decobar').innerHTML = ''; this._decoUb && this._decoUb(); this._decoUb = null; }
  decoBar(gh) {
    const g = this.app.game, bar = $('#decobar'); if (!g.deco) { bar.innerHTML = ''; return; }
    if (gh) { const d = FURN[gh.id], price = gh.moving ? '옮기는 중' : S.inv[gh.id] ? '보관함에서' : d.heart ? `♥ ${d.heart}` : `<i class="c"></i>${fmt(d.cost * storeMult())}`;
      bar.innerHTML = `<div class="gh"><b>${d.name}</b><span>${gh.err ? `<em class="err">${gh.err}</em>` : `감성 +${d.score} · ${price}`}</span></div><div class="ghb"><button id="gRot">↻ 돌리기</button>${gh.moving ? '<button id="gSto">보관</button>' : ''}<button id="gCan">취소</button><button id="gOk" class="ok ${gh.err ? 'off' : ''}">놓기</button></div><p class="tip">반투명 가구를 끌어서 옮겨요</p>`;
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
    m.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { const o = S.orders[+b.dataset.o]; if (o.done || (S.soldBy[o.menu] || 0) < o.n) return; o.done = true; const rw = Math.round(MENU[o.menu].price * o.n * 1.5 * storeMult()); S.coins += rw; S.hearts += 3; this.app.game.gainXp(10); save(); sfx('reward'); this.toast(`${o.who} 주문 완료! +${fmt(rw)} ♥3`); this.orders(); });
  }
  orderReady(o) { if (o._told) return; o._told = 1; this.toast(`📜 ${o.who} 주문을 채웠어요! 주문서에서 받기`); }
  attendance() {
    const t = today(), got = S.att.last === t, y = new Date(Date.now() - 864e5), yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    const streak = got ? S.att.streak : (S.att.last === yk ? S.att.streak : 0), day = got ? streak : streak + 1, RW = [[60, 1], [80, 2], [100, 2], [140, 3], [180, 3], [240, 4], [400, 8]];
    const html = RW.map(([c, h], i) => `<div class="att ${i < (got ? streak : streak) % 7 || (got && i === (streak - 1) % 7) ? 'got' : ''} ${!got && i === (day - 1) % 7 ? 'now' : ''}"><small>${i + 1}일</small><b>${i === 6 ? '🎁' : '☕'}</b><span>${fmt(c * storeMult())}<br>♥${h}</span></div>`).join('');
    const m = this.modal(`<h2>🎁 출석</h2><div class="sub">매일 들르면 선물 · 7일째는 크게 · ${got ? `오늘 받았어요 (연속 ${streak}일)` : `오늘 ${day}일째`}</div><div class="atts">${html}</div><button class="btn ${got ? 'off' : ''}" id="aGo">${got ? '내일 또 만나요' : '받기'}</button><button class="btn ghost" id="mOk">닫기</button>`);
    $('#mOk').onclick = () => this.close(); $('#aGo').onclick = () => { if (got) return; const [c, h] = RW[(day - 1) % 7]; S.coins += c * storeMult(); S.hearts += h; S.att = { last: t, streak: day }; save(); sfx('reward'); this.toast(`출석 ${day}일째! +${fmt(c * storeMult())} ♥${h}`); this.progress(); this.attendance(); };
  }
  coupon() { if (S.coupon) return this.showCoupon(S.coupon); if (!couponReady()) return this.modal(`<h2>🎟 매장 쿠폰</h2><p>오늘 <b>${COUPON.goal}잔</b>을 내어 주면<br>실제 감성커피 매장에서 쓸 수 있는 쿠폰을 드려요.</p><div class="cpbig">${S.sold} / ${COUPON.goal}</div><p class="sm">${COUPON.text}</p><button class="btn" id="mOk">계속하기</button>`), $('#mOk').onclick = () => this.close();
    const c = claimCoupon(); sfx('reward'); this.showCoupon(c); this.progress(); }
  showCoupon(c) { this.modal(`<div class="ticket"><small>${BRAND.name}</small><b>${COUPON.text}</b><div class="code">${c.code}</div><span>매장 직원에게 이 화면을 보여 주세요 · ${COUPON.valid}</span></div><button class="btn" id="mOk">확인</button>`); $('#mOk').onclick = () => this.close(); }
  // ── 가게: 매장 · 동료
  shop() {
    const g = this.app.game, tab = this._st || 'store';
    const stores = STORES.map((s, i) => { const open = !!S.stores[i], can = S.lv >= s.lv; return `<div class="store ${i === S.si ? 'cur' : ''} ${can ? '' : 'lock'}" data-s="${i}"><img src="assets/brand/${s.photo}.jpg"><div><b>${s.name}</b><small>${s.city} · 값 ×${s.mult}</small><span>${i === S.si ? '지금 여기' : open ? '가기 ›' : can ? '새로 열기 ›' : `Lv.${s.lv}에 열려요`}</span><p>${s.desc}</p></div></div>`; }).join('');
    const staff = Object.entries(STAFF).map(([k, d]) => { const has = S.staff[k], lock = S.lv < d.lv, c = d.cost; return `<div class="upr ${lock ? 'lock' : ''}"><i class="av" style="background:#${d.body.toString(16).padStart(6, '0')};color:#3B2A20">${d.name.slice(-2, -1)}</i><div><b>${d.name}</b><span>${d.desc}</span></div><button class="btn sm ${has || lock || S.coins < c ? 'off' : ''}" data-h="${k}">${has ? '함께해요' : lock ? `Lv.${d.lv}` : `<i class="c"></i>${fmt(c)}`}</button></div>`; }).join('');
    const m = this.modal(`<h2>🗺️ 가게</h2><div class="tabs"><button data-t="store" class="${tab === 'store' ? 'on' : ''}">감성커피 매장</button><button data-t="staff" class="${tab === 'staff' ? 'on' : ''}">동료</button></div>
      <div class="uplist">${tab === 'store' ? stores : staff}</div><p class="sm">${tab === 'store' ? '게임 속 매장은 실제 감성커피 매장이에요 · 레벨과 원두는 함께, 가구와 진열은 매장마다' : '처음엔 혼자 시작해요 · 레벨이 오르면 함께할 동료가 생겨요'}</p><button class="btn ghost" id="mOk">닫기</button>`);
    $('#mOk').onclick = () => this.close(); m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { this._st = b.dataset.t; this.shop(); });
    m.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { const k = b.dataset.h, d = STAFF[k]; if (S.staff[k] || S.lv < d.lv || S.coins < d.cost) return; S.coins -= d.cost; k === 'barista' ? g.hireBarista() : g.hireHall(); sfx('reward'); this.shop(); this.progress(); });
    m.querySelectorAll('.store:not(.lock)').forEach(b => b.onclick = () => { const i = +b.dataset.s; if (i === S.si) return; if (!S.stores[i]) S.stores[i] = newStore(); S.si = i; save(true); this.close(); g.build(); this.toast(`${STORES[i].name}에 왔어요`); sfx('levelup'); });
  }
  // ── 레벨 오름
  levelUp(lv) {
    const un = [...Object.values(MENU).filter(d => d.lv === lv).map(d => `☕ ${d.name}`), ...ROAST.filter(r => r.lv === lv).map(r => `🫘 ${r.name}`), ...Object.values(FURN).filter(d => d.lv === lv && !d.gift).map(d => `🪑 ${d.name}`),
      ...Object.entries({ espresso: '에스프레소 머신', oven: '디저트 오븐' }).filter(([k]) => machineCountAt(k, lv) > machineCountAt(k, lv - 1)).map(([, n]) => `✨ ${n} +1`), ...Object.values(STAFF).filter(d => d.lv === lv).map(d => `👋 ${d.name}`), ...REGULARS.filter(r => r.lv === lv).map(r => `💌 새 단골 ${r.name}`), ...STORES.filter(s => s.lv === lv).map(s => `🗺️ ${s.name}`)];
    this.app.game.confetti(100, 300, -300);
    setTimeout(() => { const m = this.modal(`<div class="lvup"><small>LEVEL UP</small><b>Lv.${lv}</b><p>정성이 쌓여 가게가 한 뼘 자랐어요</p>${un.length ? `<ul>${un.map(u => `<li>${u}</li>`).join('')}</ul>` : ''}</div><button class="btn" id="mOk">좋아요</button>`); $('#mOk').onclick = () => this.close(); }, 500);
  }
  welcome(away) {
    const g = this.app.game, done = g.machines.filter(m => { const p = g.progress(m); return p && p.u >= 1; }).length, r = g.roastState();
    if (away > 300 && (done || (r && r.u >= 1))) this.toast(`자리를 비운 사이 ${done ? `메뉴 ${done}개` : ''}${done && r && r.u >= 1 ? ' · ' : ''}${r && r.u >= 1 ? '원두' : ''} 준비 완료!`);
    if (!S.tut && S.xp === 0) this.modal(`<div class="intro"><i class="bi"></i><h2>감성커피에 오신 걸 환영해요</h2><p>바다 바람이 머무는 <b>영도대교점</b>.<br>오늘부터 이 작은 가게의 주인이에요.</p><ol><li>손님이 키오스크에서 주문하면 주문표가 붙어요</li><li>머신에서 그 메뉴를 내리고, 다 되면 눌러서 픽업대에</li><li>손님이 진동벨을 듣고 쟁반을 가져가요</li><li>반납대 설거지 · 테이블 닦기 · 원두 볶기 · 꾸미기</li></ol><p class="sm">감 · 느끼는 마음 &nbsp; 성 · 한결같은 정성</p></div><button class="btn" id="mOk">문 열기</button>`), $('#mOk').onclick = () => this.close();
  }
  ad(kind, done) { const what = kind === 'boost' ? '3분 동안 손님 2배' : '바로 완성';
    if (kind === 'boost' && this.app.game.boostUntil > now()) return this.toast('손님 2배가 이미 켜져 있어요');
    this.modal(`<h2>📺 광고 보고 받기</h2><p><b>${what}</b></p><div class="adbox"><span>광고 (시험용)</span><em id="adc">3</em></div><button class="btn ghost" id="adNo">그만두기</button>`);
    let n = 3; const tm = setInterval(() => { n--; const e = $('#adc'); if (e) e.textContent = n; if (n <= 0) { clearInterval(tm); this.close(); sfx('reward'); if (kind === 'boost') { this.app.game.boostUntil = now() + 180000; this.toast('3분 동안 손님 2배!'); } done && done(); } }, 1000);
    $('#adNo').onclick = () => { clearInterval(tm); this.close(); }; }
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
const machineCountAt = (k, lv) => ({ espresso: [1, 4, 9], oven: [4, 12] })[k].filter(l => lv >= l).length;
