// 화면 위 UI (상단 재화 · 레벨 · 옆 버튼 · 아래 탭 · 판 · 가운데 창 · 날아가는 재화 · 알림 · 처음 10분 안내)
//   원칙: 움직이지 않는 UI 0 (누름 탄성 · 열림/닫힘 · 시차 등장 · 통통 빨간 점 · 숫자 올라감) · 실수는 부드럽게 · 칭찬은 넉넉히
//   빨간 점 = '받을 것' 또는 '지금 할 수 있는 새 것'만 (늘 켜져 있는 점 X) · 창 우선순위: 쉬는 동안 정산 > 레벨업 > 단골 이야기 > 출석 > 안내
import * as D from './data.js?v=0.92.1';
import * as G from './sim.js?v=0.92.1';
import { bm } from './oad_bm.js?v=0.92.1';
import { sfx, setAudio, AUD } from './audio.js?v=0.92.1';
import { pushBack } from './oad.js?v=0.92.1';

const $ = (s, r = document) => r.querySelector(s);
const S = G.S, fmt = D.fmt;
/* 읽기 쉬운 긴 표기: 14,900 → '1만 4,900' · 억 이상은 짧게 (퀄리티 B11) */
export function fmtL(n) { n = Math.floor(n); if (n < 1e4) return n.toLocaleString('ko-KR'); if (n < 1e8) { const a = Math.floor(n / 1e4), b = n % 1e4; return `${a.toLocaleString('ko-KR')}만${b ? ' ' + b.toLocaleString('ko-KR') : ''}`; } return fmt(n); }
export const IMG = p => `assets/art/${p}.webp`;
const STAMP_OLD = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#F9D4DC" stroke="#C9788A" stroke-width="4"/><g fill="#C9788A"><ellipse cx="32" cy="38" rx="10" ry="8"/><circle cx="20" cy="27" r="4.5"/><circle cx="27" cy="20" r="4.5"/><circle cx="37" cy="20" r="4.5"/><circle cx="44" cy="27" r="4.5"/></g></svg>');
export const ICON = { coin: IMG('deco/coin'), gem: IMG('food/gem'), rp: IMG('ui/tea'), treat: IMG('ui/cookie'), big: IMG('deco/gift'), stamp: IMG('ui/stamp'), heart: IMG('deco/heart'), gold: IMG('ui/gold'),
  ad: IMG('ui/ad'), inst: IMG('ui/inst'), lock: IMG('ui/lock'), hammer: IMG('ui/hammer'), clock: IMG('ui/clock'), mission: IMG('ui/mission'), ribbon: IMG('ui/ribbon'), sound: IMG('ui/sound'), serve: IMG('ui/serve'), sparkle: IMG('ui/sparkle'), menu: IMG('ui/menu') };
/* 이모지 대신 우리 아이콘 한 세트 (퀄리티 B1 · B2: 쉼 포인트 = 찻잔 · 미션 = 체크 노트 · 혜택 = 리본 · 원어데이 골드 = 초승달 금화) */
export let OFFY = 0; export const setOffY = v => { OFFY = v; };
export const AMEN_IMG = { fridge: 'food/strawmilk', sink: 'ui/tea', toaster: 'food/loaf', micro: 'food/hotpot', shower: 'fac/footwash', laundry: 'deco/cushion' };
const ic = (k, c = 'ico') => `<img class="${c}" src="${ICON[k]}" alt="">`;
const NAME = { ...D.CUR, big: '특별 도시락' };
export const tm = s => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}시간${m ? ' ' + m + '분' : ''}` : m ? `${m}분${x ? ' ' + x + '초' : ''}` : `${x}초`; };
export const clock = s => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
/* 보상 글자 (min = 지금 수입 × 분) */
export function rtxt(r) { const o = []; if (r.min) o.push(ic('coin') + fmt(G.minsOf(r.min))); for (const k of ['coin', 'gem', 'rp', 'treat', 'big', 'stamp']) if (r[k]) o.push(ic(k) + fmt(r[k])); return o.join(' '); }
const PRAISE = ['멋져요!', '좋아요!', '훌륭해요!', '역시 셰프님!', '캠프가 더 예뻐졌어요!', '손님들이 좋아해요!'];
const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

let ctx = null;   /* main 이 넘겨줌: { portrait(look), save(), reskin(), boardOf(el), padPos(id) } */
const frame = $('#frame'), hudEl = $('#hud'), barEl = $('#bar'), sheetEl = $('#sheet'), popEl = $('#pop'), flyEl = $('#fly'), toastEl = $('#toast');

/* ── 누름 탄성 (모든 .btn · .tab · .sbtn · .pill) ── */
addEventListener('pointerdown', e => { const b = e.target.closest('.btn,.tab,.sbtn,.pill,.st,.x,.dishrdy,.tipb'); if (!b) return; b.classList.add('press'); sfx(b.classList.contains('tab') || b.classList.contains('st') ? 'tab' : 'tap'); const up = () => { b.classList.remove('press'); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); }; addEventListener('pointerup', up); addEventListener('pointercancel', up); }, true);

/* ── 알림 ── */
export function toast(msg, good = false) {
  const t = document.createElement('div'); t.className = 'tst' + (good ? ' good' : ''); t.innerHTML = msg; toastEl.appendChild(t);
  while (toastEl.children.length > 3) toastEl.firstChild.remove(); setTimeout(() => t.remove(), 2700);
}
const soft = msg => { toast(msg); sfx('no'); };   /* 실수는 부드럽게: 낮은 두 음 + 다음에 할 일 */
function nope(btn, msg) { if (btn) { btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no'); } soft(msg); }

/* ── 날아가는 재화 → 상단 칸 (도착하면 칸이 통 튀고 숫자가 올라감) ── */
const pillOf = k => $(k === 'gem' ? '#pGem' : k === 'rp' ? '#pRp' : '#pCoin');
export function fly(k, x, y, n = 5) {
  const p = pillOf(k); if (!p) return; const tx = p.offsetLeft + 32, ty = p.offsetTop + 31;
  for (let i = 0; i < n; i++) {
    const f = document.createElement('img'); f.className = 'fl'; f.src = ICON[k] || ICON.coin; flyEl.appendChild(f);
    const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 50, mx = x + Math.cos(a) * r, my = y + Math.sin(a) * r - 30;
    const an = f.animate([{ left: x + 'px', top: y + 'px', transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }, { left: mx + 'px', top: my + 'px', transform: 'translate(-50%,-50%) scale(1.1)', opacity: 1, offset: 0.3 }, { left: tx + 'px', top: ty + 'px', transform: 'translate(-50%,-50%) scale(.7)', opacity: 1 }],
      { duration: 650 + i * 70 + Math.random() * 80, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
    an.onfinish = () => { f.remove(); p.classList.remove('hit2'); void p.offsetWidth; p.classList.add('hit2'); if (i === 0) sfx('coin', { up: Math.floor(Math.random() * 3) }); };
  }
}
export function numPop(x, y, txt, crit) { const d = document.createElement('div'); d.className = 'num' + (crit ? ' crit' : '') + (/^[+대]/.test(String(txt)) ? '' : ' txt'); d.style.left = x + 'px'; d.style.top = y + 'px'; d.innerHTML = txt; flyEl.appendChild(d); setTimeout(() => d.remove(), 1250); }
export function confetti(n = 40) { const cs = ['#F3A9BA', '#FFE38A', '#A8DCC4', '#9CC8EE', '#FFB46A']; for (let i = 0; i < n; i++) { const c = document.createElement('i'); c.className = 'confetti'; c.style.left = 360 + (Math.random() - 0.5) * 300 + 'px'; c.style.top = 260 + Math.random() * 80 + 'px'; c.style.background = cs[i % cs.length]; c.style.setProperty('--dx', (Math.random() - 0.5) * 700 + 'px'); c.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg'); c.style.animationDelay = Math.random() * 0.25 + 's'; flyEl.appendChild(c); setTimeout(() => c.remove(), 2000); } }
function banner(t, sub) { const b = document.createElement('div'); b.className = 'banner'; b.innerHTML = `<div>${t}${sub ? `<small>${sub}</small>` : ''}</div>`; flyEl.appendChild(b); setTimeout(() => b.remove(), 2500); }

/* ── 상단 · 옆 · 아래 ── */
const shown = { coin: 0, gem: 0, rp: 0 };
export function hud() {
  hudEl.innerHTML = `
  <div class="pill" id="pCoin" style="left:16px">${ic('coin', '')}<span>0</span></div>
  <div class="pill" id="pGem" style="left:252px">${ic('gem', '')}<span>0</span><i class="plus">+</i></div>
  <div class="pill" id="pRp" style="left:476px">${ic('rp', '')}<span>0</span></div>
  <div id="lvb"><div class="ring"><b>1</b></div><div class="nm">숲속 힐링 캠프<br><small id="rate" style="font-weight:600;font-size:16px;color:var(--ink2)"></small></div></div>
  <div class="btn sky" id="gAll" style="position:absolute;left:22px;top:1290px;display:none;animation:giftHop 1.6s cubic-bezier(.34,1.56,.64,1) infinite">${ic('ad')} 선물 한꺼번에</div>
  <div id="goal"><div class="gl"><img src="${IMG('ui/mission')}" alt=""><span class="gt"></span><b class="gr"></b></div><div class="gbar"><i></i></div><div class="gs"></div></div>
  <div id="unlock"><span></span><div class="ubar"><i></i></div></div>
  <div class="sbtn" id="sHelp" style="position:absolute;right:18px;top:556px;height:64px">${ic('menu', 'ic2')}<b style="font-size:14px">하는 법</b></div>
  <div id="buffs" style="position:absolute;left:22px;top:300px;display:flex;flex-direction:column;gap:8px"></div>
  <div class="side">
    <div class="sbtn" id="sAtt">${ic('big', '')}출석</div>
    <div class="sbtn" id="sPlay">${ic('clock', 'ic2')}선물<span class="tm"></span></div>
    <div class="sbtn" id="sBuff">${ic('ribbon', 'ic2')}혜택</div>
    <div class="sbtn" id="sSnd">${ic('sound', 'ic2')}<b style="font-size:15px">켜짐</b></div>
  </div>`;
  barEl.innerHTML = `<div class="tabs">${TABS.map(t => `<div class="tab" data-t="${t.id}"><img src="${IMG(t.img)}" alt="">${t.name}</div>`).join('')}</div>`;
  barEl.querySelectorAll('.tab').forEach(t => t.onclick = () => openTab(t.dataset.t));
  $('#pGem').onclick = () => openTab('shop', bm.info.ok ? 'stall' : 'box');
  $('#pCoin').onclick = () => toast(`숲 코인 · 지금 1분에 약 ${fmt(G.incomeRate() * 60)} 벌어요`);
  $('#pRp').onclick = () => toast(`쉼 포인트 · 1분에 ${fmt(G.restPerMin())} · 메뉴 맛 올리기에 써요`);
  $('#sAtt').onclick = () => attendPop();
  $('#sPlay').onclick = () => openTab('mission', 'play');
  $('#sBuff').onclick = () => openTab('shop', 'stall');
  $('#gAll').onclick = () => watch('gifts', null, n => { toast(`선물 ${n}개를 한꺼번에 받았어요!`, true); fly('coin', 160, 1300, 8); ctx.render(); });
  $('#sSnd').onclick = () => settingsPop();
  $('#goal').onclick = () => goalAct();
  $('#sHelp').onclick = () => loopPop(true);
  for (const k of ['coin', 'gem', 'rp']) shown[k] = S[k];
}
const TABS = [{ id: 'fac', name: '시설', img: 'fac/tent' }, { id: 'menu', name: '메뉴', img: 'food/bagel' }, { id: 'staff', name: '직원', img: 'deco/heart' }, { id: 'mission', name: '미션', img: 'ui/mission' }, { id: 'shop', name: '매점', img: 'deco/gift' }];
function setDot(el, n) { if (!el) return; let d = el.querySelector(':scope > .dot'); if (!n) { if (d) d.remove(); return; } if (!d) { d = document.createElement('i'); d.className = 'dot'; el.appendChild(d); } if (typeof n === 'number' && n > 1) { d.classList.add('n'); d.textContent = n > 9 ? '9+' : n; } else { d.classList.remove('n'); d.textContent = ''; } }
/* 빨간 점 규칙 (docs/ux_notes.md 4장) */
export function dots() {
  const pads = D.PADS.filter(p => G.canBuild(p.id)), zoneOk = D.ZONES.some(z => S.zones[z.id].st === 'locked' && G.zoneNeedOk(z.id));
  const amen = Object.keys(D.AMEN).some(a => !S.amen[a]) && S.coin >= G.amenCost() && D.PADS.every(p => !G.canBuild(p.id) || S.coin < G.padCost());
  const fac = zoneOk || (pads.length && S.coin >= G.padCost()) || amen;
  const menuNew = D.MENU.some(m => G.menuOpen(m) && G.menuLv(m) === 0 && S.coin >= G.menuNewCost(m) && lineReady(m.line));
  const menuUp = D.MENU.some(m => G.menuLv(m) > 0 && G.menuLv(m) < D.MENU_MAX && S.rp >= D.menuCost(m, G.menuLv(m)));
  const staff = D.STAFF.some(s => !S.staff[s.id] && S.coin >= s.cost) || D.REGULARS.some(r => (S.regs[r.id] || {}).fav > (S.regs[r.id] || {}).read);
  const mis = G.dailyList().filter(m => !m.got && m.p >= m.n).length + (G.dailyAllReady() ? 1 : 0) + G.repeatList().filter(q => !q.done && q.have >= q.need).length + (G.attendReady() ? 1 : 0) + G.playReady().filter(p => p.ready).length;
  const shop = (bm.info.ok && G.adLeft('box') > 0 && bm.info.ads.reward) || S.gem >= D.BOX.cost;
  const T = barEl.querySelectorAll('.tab');
  if (tutOn()) { const tab = tutTab(); TABS.forEach((t, i) => setDot(T[i], t.id === tab)); setDot($('#sAtt'), false); setDot($('#sPlay'), false); return; }   /* 안내 중에는 안내가 가리키는 한 곳만 (퀄리티 A2) */
  setDot(T[0], fac); setDot(T[1], menuNew || menuUp); setDot(T[2], staff); setDot(T[3], mis); setDot(T[4], shop);
  setDot($('#sAtt'), G.attendReady()); setDot($('#sPlay'), G.playReady().some(p => p.ready));
}
export const lineReady = line => { const st = D.LINES.find(l => l.id === line).st; return G.built(st) && !!G.R.cooks[st]; };
let tAcc = 0;
export function tick(dt) {
  /* 숫자 올라감 (보이는 값이 실제 값을 따라감) */
  for (const k of ['coin', 'gem', 'rp']) { const v = S[k]; let s = shown[k]; if (Math.abs(v - s) < 1) s = v; else s += (v - s) * Math.min(1, dt * 7); shown[k] = s; const el = $(k === 'coin' ? '#pCoin span' : k === 'gem' ? '#pGem span' : '#pRp span'); const t = fmt(s); if (el && el.textContent !== t) el.textContent = t; }
  const ring = $('#lvb .ring'); if (ring) { ring.style.setProperty('--p', Math.round(G.xpPct() * 100)); const b = ring.querySelector('b'); if (b.textContent !== String(S.lv)) b.textContent = S.lv; }
  if ((tAcc += dt) < 0.5) return; tAcc = 0;
  $('#rate').innerHTML = `<span class="rep">★ ${G.repAvg().toFixed(1)}</span> 평판 · 1분에 ${fmt(G.incomeRate() * 60)}`;
  { const g = G.goalNow(), st = g.step, el = $('#goal'); const t = g.main === false ? `다음 할 일 · ${g.text}` : `목표 · ${g.text}`; if (el.querySelector('.gt').textContent !== t) { el.querySelector('.gt').textContent = t; el.classList.remove('new'); void el.offsetWidth; el.classList.add('new'); }
    el.querySelector('.gr').innerHTML = `${ic('gem')}${g.reward.gem}`; el.querySelector('.gbar i').style.width = Math.round(Math.min(1, g.have / g.need) * 100) + '%';
    el.querySelector('.gs').textContent = st ? `지금 할 일 · ${st.text}${st.cost && S.coin < st.cost ? ` (${tm(st.eta)} 뒤)` : ''}` : g.wait > 0 ? `정리 중 · ${tm(g.wait)}` : g.why || (g.cost && S.coin < g.cost ? `코인이 모이면 · 약 ${tm(g.eta)}` : '지금 할 수 있어요!'); el.classList.toggle('ready', !st && (!g.cost || S.coin >= g.cost) && !g.why && !(g.wait > 0)); }
  { const u = G.nextUnlock(), el = $('#unlock'); el.style.display = u ? '' : 'none'; if (u) { el.querySelector('span').textContent = u.text; el.querySelector('.ubar i').style.width = Math.round(u.k * 100) + '%'; } }
  const pl = G.playReady().find(p => !p.got); const tmEl = $('#sPlay .tm'); if (tmEl) tmEl.textContent = pl ? (pl.ready ? '받기!' : clock(pl.m * 60 - S.play.sec)) : '내일';
  $('#sPlay').classList.toggle('glow', !!(pl && pl.ready));
  $('#gAll').style.display = G.R.gifts.length >= 3 && adOn('gifts') && adOk('gifts') && !cur && !curDlg ? '' : 'none';
  $('#sSnd b').textContent = AUD.sfx || AUD.bgm ? '소리 켜짐' : '소리 꺼짐'; $('#sSnd').style.opacity = AUD.sfx || AUD.bgm ? 1 : 0.6;
  const bf = $('#buffs'); const on = ['speed', 'crit', 'rest'].filter(k => G.buffOn(k)); const html = on.map(k => `<div class="lvtag" style="position:static;transform:none;background:#FFF0B8">${{ speed: '요리 2배 빠르게', crit: '대박 요리 +30%', rest: '쉼 포인트 +30%' }[k]} · ${clock(S.buff[k] - S.t)}</div>`).join(''); if (bf.innerHTML !== html) bf.innerHTML = html;
  $('#sBuff').classList.toggle('glow', bm.info.ok && !on.length && ['speed', 'crit', 'rest'].some(k => G.adLeft(k) > 0));
  dots(); tut();
  if (cur && !cur.body.querySelector('.press')) cur.refresh(true);
  if (curDlg && curDlg.live && !curDlg.el.querySelector('.press')) curDlg.live();
}

/* ── 가운데 창 (튀어나옴 · 줄어들며 닫힘 · 뒤로가기) ── */
const queue = []; let curDlg = null;
export function dlg(html, o = {}) {
  const shade = document.createElement('div'); shade.className = 'shade'; const d = document.createElement('div'); d.className = 'dlg'; d.innerHTML = (o.rays ? '<div class="rays"></div>' : '') + html; popEl.append(shade, d);
  popEl.style.pointerEvents = 'auto'; requestAnimationFrame(() => { shade.classList.add('open'); d.classList.add('open'); }); sfx('open');
  let done = false; const unBack = pushBack(() => { if (o.lock) return true; close(); return true; });
  const close = () => { if (done) return; done = true; unBack(); d.classList.add('closing'); shade.classList.remove('open'); sfx('close'); setTimeout(() => { d.remove(); shade.remove(); if (!popEl.querySelector('.dlg')) popEl.style.pointerEvents = 'none'; curDlg = null; o.onClose && o.onClose(); next(); }, 220); };
  if (!o.lock) shade.onclick = close;
  const me = { el: d, close, live: o.live ? () => o.live(d) : null }; curDlg = me; return me;
}
function next() { if (curDlg || !queue.length) return; queue.sort((a, b) => a.p - b.p); const q = queue.shift(); q.f(); }
export function enqueue(p, f) { queue.push({ p, f }); next(); }

/* ── 아래에서 올라오는 판 ── */
let cur = null;
export function openTab(id, sub) {
  if (cur && cur.id === id && !sub) return closeSheet();
  if (cur) closeSheet(true);
  barEl.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.t === id));
  const P = PANELS[id]; const shade = document.createElement('div'); shade.className = 'shade'; const sh = document.createElement('div'); sh.className = 'sh';
  sh.innerHTML = `<div class="head"><h2>${P.title}</h2><div class="x">✕</div></div>${P.subs ? `<div class="sub">${P.subs.map(([k, n]) => `<div class="st" data-s="${k}">${n}</div>`).join('')}</div>` : ''}<div class="body"></div>`;
  sheetEl.append(shade, sh); sheetEl.style.pointerEvents = 'auto'; requestAnimationFrame(() => { shade.classList.add('open'); sh.classList.add('open'); }); sfx('open');
  shade.onclick = () => closeSheet(); sh.querySelector('.x').onclick = () => closeSheet();
  const me = { id, sub: sub || (P.subs ? P.subs[0][0] : null), sh, shade, body: sh.querySelector('.body') };
  me.refresh = still => { const st = me.body.scrollTop; me.body.innerHTML = P.render(me.sub, me); if (still) me.body.querySelectorAll('.card').forEach(c => c.style.animation = 'none', 0); me.body.querySelectorAll('.card').forEach(c => { if (still) { c.style.opacity = 1; c.style.transform = 'none'; } }); me.body.scrollTop = st; bindBody(me); };
  me.setSub = s => { me.sub = s; sh.querySelectorAll('.st').forEach(x => x.classList.toggle('on', x.dataset.s === s)); me.body.scrollTop = 0; me.refresh(false); stagger(me.body); };
  sh.querySelectorAll('.st').forEach(x => x.onclick = () => me.setSub(x.dataset.s));
  me.unBack = pushBack(() => { closeSheet(); return true; });
  cur = me; me.setSub(me.sub); S.seen = S.seen || {}; S.seen[id] = 1; tutSaw(id);
}
function stagger(body) { body.querySelectorAll('.card').forEach((c, i) => c.style.animationDelay = Math.min(i, 10) * 0.045 + 's'); }
export function closeSheet(instant) {
  if (!cur) return; const c = cur; cur = null; c.unBack(); barEl.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  c.sh.classList.add('closing'); c.shade.classList.remove('open'); if (!instant) sfx('close');
  setTimeout(() => { c.sh.remove(); c.shade.remove(); if (!sheetEl.querySelector('.sh')) sheetEl.style.pointerEvents = 'none'; }, instant ? 0 : 300);
}
/* 판 안 버튼: data-a="동작:값" */
function bindBody(me) { me.body.querySelectorAll('[data-a]').forEach(b => { const [a, v, w] = b.dataset.a.split(':'); b.onclick = () => act(a, v, w, b, me); if (a === 'up') hold(b, () => act(a, v, w, b, me, true)); }); }
function hold(b, f) { let t = null, n = 0; const stop = () => { clearTimeout(t); t = null; }; b.addEventListener('pointerdown', () => { n = 0; const go = () => { n++; f(); t = setTimeout(go, Math.max(70, 240 - n * 25)); }; t = setTimeout(go, 420); }); b.addEventListener('pointerup', stop); b.addEventListener('pointerleave', stop); b.addEventListener('pointercancel', stop); }
function bump(me, key) { const c = me.body.querySelector(`[data-k="${key}"]`); if (!c) return; c.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)', background: '#FFF6D0' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' }); }
const cardPos = b => { const r = b.getBoundingClientRect(), f = frame.getBoundingClientRect(), s = f.width / 720; return [(r.left + r.width / 2 - f.left) / s, (r.top + r.height / 2 - f.top) / s]; };
export const boardPos = cardPos;

/* ── 동작 ── */
async function act(a, v, w, b, me, repeat) {
  let err = null; const at = cardPos(b);
  if (a === 'up') { err = G.upgrade(v); if (!err) { sfx('up', { up: Math.min(8, (v === 'oven' ? S.oven : S.pads[v]).lv % 9) }); ctx.fx('sparkle', v); if (!repeat) numPop(at[0], at[1] - 30, praise()); } }
  else if (a === 'build') { err = G.build(v); if (!err) { closeSheet(); toast(`${D.FAC[D.PADS.find(p => p.id === v).fac].name}${josa(D.FAC[D.PADS.find(p => p.id === v).fac].name)} 생겼어요! ${praise()}`, true); } }
  else if (a === 'amen') { err = G.buildAmen(v); if (!err) { sfx('build'); toast(`${D.AMEN[v].name} 완성! ${D.AMEN[v].desc}`, true); } }
  else if (a === 'zone') { err = G.expand(v); if (!err) { sfx('build'); toast(`${D.ZONES.find(z => z.id === v).name} 정리를 시작했어요`, true); } }
  else if (a === 'inst') return instDialog(v);
  else if (a === 'menu') { const m = D.MENU.find(x => x.id === v), lv = G.menuLv(m); err = G.menuUp(v); if (!err) { sfx(lv ? 'up' : 'unlock'); if (!lv) { toast(`새 메뉴 '${m.name}' 출시! 손님들이 궁금해해요`, true); confetti(20); } else numPop(at[0], at[1] - 30, '맛있어졌어요!'); } }
  else if (a === 'hire') { err = G.hire(v); if (!err) { const s = D.STAFF.find(x => x.id === v); sfx('unlock'); confetti(24); toast(`${s.name}${josa(s.name, '이/가')} 캠프에 왔어요! "${s.line}"`, true); } }
  else if (a === 'feed') { const lvB = S.staff[v].fav; err = G.feed(v, w === 'big'); if (!err) { sfx('heart'); fly('heart', at[0], at[1], 0); numPop(at[0], at[1] - 40, S.staff[v].fav > lvB ? '더 친해졌어요!' : '맛있어요!'); } }
  else if (a === 'story') return storyPop(v, +w, true);
  else if (a === 'daily') { const r = G.claimDaily(v); if (r) flyR(r, at); }
  else if (a === 'dailyAll') { const r = G.claimDailyAll(); if (r) { flyR(r, at); confetti(30); sfx('level'); } }
  else if (a === 'repeat') { const r = G.claimRepeat(v); if (r) flyR(r, at); }
  else if (a === 'attend') { closeSheet(); return attendPop(); }
  else if (a === 'play') { const r = G.claimPlay(+v); if (r) flyR(r, at); }
  else if (a === 'stall') { err = G.buyStall(+v); if (!err) { sfx('reward'); numPop(at[0], at[1] - 30, '샀어요!'); } }
  else if (a === 'stamp') { err = G.buyStamp(v); if (!err) { sfx('box', { rar: 'r' }); ctx.render(); toast(`${D.DECO.find(d => d.id === v).name}${josa(D.DECO.find(d => d.id === v).name)} 캠프에 놓았어요`, true); } }
  else if (a === 'box') { if (v === 'ad') return watch('box', null, r => boxPop(r)); const r = G.openBox('gem'); if (r.err) err = r.err; else return boxPop(r); }
  else if (a === 'ad') { return watch(v, w, () => { toast(`${D.ADS[v].name} · 시작!`, true); ctx.render(); }); }
  else if (a === 'gold') return buyGold(v);
  else if (a === 'gpick') return;
  else if (a === 'try') { if (v === 'skin') ctx.tryOn(15); else ctx.previewDeco(15); return toast(v === 'skin' ? '15초 동안 입어 볼게요 · 셰프를 봐 주세요!' : '15초 동안 잔디 왼쪽에 놓아 볼게요', true); }
  else if (a === 'charge') { const r = G.claimCharge(v); if (r) { flyR(r, at); sfx('gift'); ctx.render(); } }
  if (err) return nope(b, err);
  ctx.save(); if (me) { me.refresh(true); bump(me, b.closest('[data-k]') && b.closest('[data-k]').dataset.k); }
}
const josa = (w, p = '이/가') => D.josa(w, p).slice(w.length);
function flyR(r, at) { sfx('reward'); if (r.coin) fly('coin', at[0], at[1], 6); if (r.gem) fly('gem', at[0], at[1], 5); if (r.rp) fly('rp', at[0], at[1], 4); const t = []; for (const k of ['coin', 'gem', 'rp', 'treat', 'big', 'stamp']) if (r[k]) t.push(`+${fmt(r[k])} ${NAME[k]}`); if (t.length) numPop(at[0], at[1] - 40, t[0]); }

/* 광고 보고 받기 (원어데이 한도 + 게임 한도 · 남은 횟수 = 실제) */
export const adOk = k => bm.info.ok && G.adLeft(k) > 0;
/* 광고 자리는 2곳 + 즉시 완성(bm-policy 2-1 규칙)만: 쉬는 동안 정산 2배 · 선물 바구니 나머지 전부 (사업 의견 4 · 강제 광고 0) */
export const AD_SLOTS = new Set(['double', 'giftrest', 'inst']);
const adOn = k => bm.info.ok && bm.info.ads && bm.info.ads.reward !== false && (!k || AD_SLOTS.has(k));
export async function watch(k, arg, done) {
  if (!G.adLeft(k)) { soft('오늘 이 혜택은 다 받았어요 · 내일 또 만나요'); return false; }
  const r = await bm.rewardedAd('camp_' + k);
  if (!r.ok) { if (r.reason !== 'cancel') soft(r.reason === 'limit' ? '오늘 광고 혜택을 다 받았어요 · 내일 또 만나요' : '지금은 광고를 볼 수 없어요'); return false; }
  G.adDone(k); const out = G.applyAd(k, arg); done && done(out); sfx('reward'); ctx.save(); if (cur) cur.refresh(true); return true;
}
/* 원어데이 골드 (가격 = 서버 표 · 앱 확인 창) */
const GOLD = {
  auto7: { name: '7일 자동 일손', desc: '7일 동안 도우미가 요리를 정가로 팔고, 구름 양도 알아서 쓰다듬어요 (직접 누를 때와 같은 값 · 더 받지는 않아요)', art: () => IMG('ui/serve'), give: () => { S.auto = S.auto || {}; S.auto.until = Math.max(S.auto.until || 0, S.t) + 7 * 86400; } },
  autocloud: { name: '구름 양 목동 (영구)', desc: '구름 양이 오면 4초 뒤부터 대신 8번 쓰다듬어요 (직접 누를 때와 같은 값 · 더 받지는 않아요) · 계정에 남아요', art: () => IMG('deco/sheep'), item: true, own: () => S.auto && S.auto.cloud, give: () => { S.auto = S.auto || {}; S.auto.cloud = true; } },
  gems100: { name: '솔방울 100개', n: 100, bonus: 0, give: () => { S.gem += 100; } },
  gems300: { name: '솔방울 330개', n: 330, bonus: 10, give: () => { S.gem += 330; } },
  gems1000: { name: '솔방울 1,200개', n: 1200, bonus: 20, give: () => { S.gem += 1200; } },
  deco: { name: D.DECO_SHOP.deco.name, desc: `벚꽃나무 아래 벤치 · 튤립 화단 · 종이 등불 · 잔디 왼쪽에 놓여요 · 매력 +${D.DECO_SHOP.deco.appeal} (손님이 조금 더 자주 와요)`, art: () => IMG('deco/set_sakura'), item: true, own: () => S.shop.deco, give: () => { S.shop.deco = true; } },
  skin: { name: D.DECO_SHOP.skin.name, desc: `셰프가 연노랑 앞치마로 갈아입어요 · 매력 +${D.DECO_SHOP.skin.appeal}`, art: () => ctx.fullBody('chef_skin'), item: true, own: () => S.skin, give: () => { S.skin = true; ctx.reskin(); } },
};
async function buyGold(sku) {
  const g = GOLD[sku]; if (g.item && g.own()) return toast('이미 가지고 있어요');
  const r = await bm.spend(sku); if (!r.ok) { if (r.reason === 'short') soft('골드가 조금 모자라요'); else if (r.reason !== 'cancel') soft('지금은 살 수 없어요'); return; }
  g.give(); sfx('unlock'); confetti(24); toast(`${g.name} · 고마워요!`, true); ctx.render(); ctx.save(); if (cur) cur.refresh(true);
}

/* ── 판 내용 ── */
const card = (k, img, title, sub, right, o = {}) => `<div class="card${o.cls ? ' ' + o.cls : ''}" data-k="${k}"><div class="im"${o.bg ? ` style="background:${o.bg}"` : ''}>${img ? `<img src="${img}" alt="">` : ''}</div><div class="tx"><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}${o.bar != null ? `<div class="bar"><i style="width:${Math.round(o.bar * 100)}%"></i></div>` : ''}</div>${right || ''}</div>`;
const btn = (a, label, cls = 'go', off = false, extra = '') => `<div class="btn ${cls}${off ? ' off' : ''}" data-a="${a}" ${extra}>${label}</div>`;
const stars = t => `<span class="stars">${'★'.repeat(t)}${'☆'.repeat(3 - t)}</span>`;
function facInfo(t) {
  const o = t === 'oven' ? S.oven : S.pads[t], fac = t === 'oven' ? D.FAC.oven : D.FAC[o.fac], lv = o.lv, tier = D.tierOf(lv), nextT = D.UP.tiers.find(x => x > lv);
  let eff = '';
  if (fac.kind === 'cook') { const ms = G.menuFor(t === 'oven' ? 'oven' : o.fac); const avg = ms.length ? ms.reduce((a, m) => a + G.dishPrice(m), 0) / ms.length : 0; eff = `한 접시 평균 ${fmt(avg)} · ${G.cycleOf(t === 'oven' ? 'oven' : o.fac).toFixed(1)}초에 하나`; if (t !== 'oven' && !G.R.cooks[o.fac]) eff += ' · <b style="color:#C9642A">요리사가 필요해요</b>'; }
  else if (fac.kind === 'seat') { const s = G.R.seats.find(x => x.pad === t); eff = `자리 ${fac.seats || 2} · 손님이 내는 값 ×${(s ? s.vip : 1).toFixed(2)}`; }
  else if (fac.kind === 'rest') eff = `쉼 포인트 1분에 ${fmt(D.restRate(fac, lv))}${fac.seats ? ' · 자리 2' : ''}`;
  else if (fac.kind === 'special') { const left = G.chargeLeft(t); eff = left > 0 ? `다음 물놀이 선물까지 ${clock(left)}` : '물놀이 선물이 찼어요!'; }
  return { o, fac, lv, tier, nextT, eff };
}
function facCard(t) {
  const { o, fac, lv, tier, nextT, eff } = facInfo(t), w = G.working(t), cost = G.upCostOf(t), img = t === 'oven' ? IMG('food/loaf') : IMG(fac.img);
  let right;
  if (w) right = `<div style="display:flex;flex-direction:column;gap:6px;align-items:center"><small style="font-weight:800">공사 ${clock(w.end - S.t)}</small>${btn('inst:up:' + t, '바로 끝내기', 'yl')}</div>`;
  else if (lv >= D.UP.max) right = '<b style="color:#5E9E82">최고 단계</b>';
  else right = btn('up:' + t, `강화<small>${ic('coin')}${fmt(cost)}</small>`, nextT === lv + 1 ? 'yl' : 'go', S.coin < cost, 'style="flex-direction:column;min-width:150px"');
  const extra = fac.kind === 'special' && G.chargeLeft(t) <= 0 ? btn('charge:' + t, '선물 받기', 'pk') : fac.kind === 'special' && adOk('charge') && adOn('charge') ? btn('ad:charge:' + t, `${ic('ad')} 바로 채우기`, 'sky') : '';
  return card(t, img, `${fac.name} <small style="font-size:18px">Lv.${lv}</small> ${stars(tier)}`, `${eff}${nextT ? `<br>Lv.${nextT}에 단계가 올라 모습이 바뀌어요` : ''}`, `<div style="display:flex;flex-direction:column;gap:8px">${right}${extra}</div>`);
}
const PANELS = {
  fac: { title: '시설', subs: [['fac', '시설'], ['amen', '편의 설비'], ['zone', '구역']], render(sub) {
    if (sub === 'fac') {
      let h = `<div class="sec">강화할수록 그림이 반짝이고 값이 올라요 · 길게 누르면 계속 강화</div>` + facCard('oven');
      for (const p of D.PADS) if (S.pads[p.id]) h += facCard(p.id);
      const can = D.PADS.filter(p => G.canBuild(p.id)), c = G.padCost();
      if (can.length) { h += `<div class="sec">새로 지을 수 있어요</div>`; for (const p of can) { const f = D.FAC[p.fac]; h += card('b' + p.id, IMG(f.img), f.name, `${f.desc}${p.dog ? ' · 애견 동반' : ''}`, btn('build:' + p.id, `짓기<small>${ic('coin')}${fmt(c)}</small>`, 'go', S.coin < c, 'style="flex-direction:column;min-width:150px"')); } }
      const lock = D.PADS.filter(p => !S.pads[p.id] && !G.zoneOpen(p.zone)); if (lock.length) { h += `<div class="sec">구역을 열면 지을 수 있어요</div>`; for (const p of lock) { const f = D.FAC[p.fac], z = D.ZONES.find(x => x.id === p.zone); h += card('l' + p.id, IMG(f.img), f.name, `${z.name}`, '', { cls: 'lock' }); } }
      return h;
    }
    if (sub === 'amen') { const c = G.amenCost(); let h = `<div class="sec">공용 키친 설비는 새 메뉴를, 웰컴센터 설비는 휴식을 늘려요</div>`;
      for (const [id, a] of Object.entries(D.AMEN)) h += card(id, null, a.name, a.desc, S.amen[id] ? '<b style="color:#5E9E82">있어요 ✓</b>' : btn('amen:' + id, `짓기<small>${ic('coin')}${fmt(c)}</small>`, 'go', S.coin < c, 'style="flex-direction:column;min-width:150px"'), { bg: a.at === 'kitchen' ? '#FDE7D4' : '#DCEBF8', cls: S.amen[id] ? 'done' : '' }).replace('</div><div class="tx">', `${AMEN_E[id]}</div><div class="tx">`);
      return h; }
    let h = `<div class="sec">고원 숲 캠핑장 · 웰컴센터를 가운데 두고 길을 따라 넓어져요</div>`;
    for (const z of D.ZONES) { const o = S.zones[z.id]; let right = '';
      if (o.st === 'open') right = '<b style="color:#5E9E82">열림 ✓</b>';
      else if (o.st === 'building') right = `<div style="display:flex;flex-direction:column;gap:6px;align-items:center"><small style="font-weight:800">${clock(o.end - S.t)}</small>${btn('inst:zone:' + z.id, '바로 끝내기', 'yl')}</div>`;
      else right = G.zoneNeedOk(z.id) ? btn('zone:' + z.id, `열기<small>${tm(z.build)}</small>`, 'pk', false, 'style="flex-direction:column"') : `<small style="font-weight:700;text-align:right">레벨 ${z.need.lv}<br>시설 ${z.need.built}개</small>`;
      h += card(z.id, null, z.name, ZONE_TXT[z.id] + (z.reward ? ` · 열면 ${ic('gem')}${z.reward}` : ''), right, { bg: ZONE_BG[z.id], cls: o.st === 'open' ? 'done' : o.st === 'locked' && !G.zoneNeedOk(z.id) ? 'lock' : '' }).replace('</div><div class="tx">', `${ZONE_E[z.id]}</div><div class="tx">`);
    }
    return h;
  } },
  menu: { title: '메뉴', subs: [['bread', '빵'], ['soup', '수프'], ['drink', '음료']], render(sub) {
    const line = D.LINES.find(l => l.id === sub); let h = '';
    if (!lineReady(sub)) h += `<div class="odds">${sub === 'soup' ? '무쇠 솥을 짓고 요리사 <b>솔</b>을 고용하면 수프를 팔아요' : '음료 바를 짓고 요리사 <b>바다</b>(또는 솔)를 고용하면 음료를 팔아요'}</div>`;
    else h += `<div class="sec">맛을 올리면 한 접시 값이 올라요 · ${line.name} ${G.cycleOf(line.st).toFixed(1)}초에 하나</div>`;
    for (const m of D.MENU.filter(x => x.line === sub)) { const lv = G.menuLv(m), open = G.menuOpen(m); let right, s;
      if (!open) { const need = { 2: 'fridge', 3: 'sink', 4: 'toaster', 5: 'micro', 6: 'micro' }[m.step]; s = m.step === 6 && S.amen.micro ? '레벨 12부터' : `${D.AMEN[need].name}${josa(D.AMEN[need].name)} 있으면 열려요`; right = ''; }
      else if (lv === 0) { const c = G.menuNewCost(m); s = `새 메뉴 · 한 접시 ${fmt(D.price0(m))}부터`; right = btn('menu:' + m.id, `출시<small>${ic('coin')}${fmt(c)}</small>`, 'pk', S.coin < c, 'style="flex-direction:column;min-width:150px"'); }
      else if (lv >= D.MENU_MAX) { s = `한 접시 ${fmt(G.dishPrice(m))} · 최고 맛`; right = '<b style="color:#5E9E82">최고 ✓</b>'; }
      else { const c = D.menuCost(m, lv); s = `한 접시 ${fmt(G.dishPrice(m))} → ${fmt(G.dishPrice(m) * 1.22)}`; right = btn('menu:' + m.id, `맛 올리기<small>${ic('rp')}${fmt(c)}</small>`, 'go', S.rp < c, 'style="flex-direction:column;min-width:150px"'); }
      h += card(m.id, IMG(m.img), `${m.name}${lv ? ` <small style="font-size:18px">맛 ${lv}/${D.MENU_MAX}</small>` : ''}`, s, right, { cls: open ? '' : 'lock', bar: lv ? lv / D.MENU_MAX : null, bg: { bread: '#FDE7D4', soup: '#DDF2E8', drink: '#DCEBF8' }[sub] }); }
    return h;
  } },
  staff: { title: '직원 · 단골', subs: [['staff', '직원'], ['regs', '단골 이야기']], render(sub) {
    let h = '';
    if (sub === 'staff') { h += `<div class="sec">간식을 주면 친해지고, 친할수록 값 · 대박 확률이 올라요 · 간식 ${S.treat} · 도시락 ${S.big}</div>`;
      for (const st of D.STAFF) { const o = S.staff[st.id], role = st.role === 'cook' ? '요리사' : '서빙', sk = `${st.skill.line === 'all' ? '모든 메뉴' : D.LINES.find(l => l.id === st.skill.line).name} 값 +${Math.round(st.skill.k * 100)}%`;
        if (!o) { h += card(st.id, ctx.portrait(st.look), `${st.name} <small style="font-size:17px">${role}</small>`, `${sk} · "${st.line}"`, btn('hire:' + st.id, `고용<small>${ic('coin')}${fmt(st.cost)}</small>`, 'pk', S.coin < st.cost, 'style="flex-direction:column;min-width:140px"'), { bg: '#FCEFF2' }); continue; }
        const need = D.FAV_EXP[o.fav - 1]; h += card(st.id, ctx.portrait(st.look), `${st.name} <small style="font-size:17px">${role} · 친밀도 ${o.fav}</small>`, `${sk}${D.FAV_BONUS[o.fav - 1] ? ` · 친밀 보너스 값 +${Math.round(D.FAV_BONUS[o.fav - 1] * 25)}%` : ''}${D.FAV_CRIT[o.fav - 1] ? ` · 대박 +${Math.round(D.FAV_CRIT[o.fav - 1] * 25)}%p` : ''}${o.fav < 10 ? `<br>더 친해지면: 값 +${Math.round(D.FAV_BONUS[o.fav] * 25)}%${D.FAV_CRIT[o.fav] ? ` · 대박 +${Math.round(D.FAV_CRIT[o.fav] * 25)}%p` : ''}` : ''}`,
          o.fav >= 10 ? '<b style="color:#5E9E82">최고로 친해요</b>' : `<div style="display:flex;flex-direction:column;gap:8px">${btn('feed:' + st.id, `${ic('treat')} 쿠키`, 'go', S.treat < 1)}${btn('feed:' + st.id + ':big', `${ic('big')} 도시락`, 'yl', S.big < 1)}</div>`, { bar: o.fav >= 10 ? 1 : o.exp / need, bg: '#FCEFF2' }); }
      return h; }
    h += `<div class="sec">단골손님은 하루 한 번 와요 · 올 때마다 이야기가 하나씩 열려요</div>`;
    for (const r of D.REGULARS) { const o = S.regs[r.id] || { fav: 0 }; const open = S.lv >= r.needLv;
      h += card(r.id, ctx.portrait(r.look), `${r.name} <span class="hearts">${'♥'.repeat(o.fav)}${'♡'.repeat(D.FAVOR_MAX - o.fav)}</span>`, open ? `${r.who} · 좋아하는 메뉴: ${D.MENU.find(m => m.id === r.likes).name}` : `레벨 ${r.needLv}부터 캠프에 와요`,
        open && o.fav ? `<div style="display:flex;flex-direction:column;gap:6px">${r.story.slice(0, o.fav).map((_, i) => btn(`story:${r.id}:${i}`, `이야기 ${i + 1}`, i + 1 > (o.read || 0) ? 'pk' : '', false, 'style="padding:9px 14px;font-size:18px"')).reverse().slice(0, 2).join('')}</div>` : '', { cls: open ? '' : 'lock', bg: '#FFF0B8' }); }
    return h;
  } },
  mission: { title: '미션', subs: [['daily', '오늘'], ['repeat', '성장'], ['attend', '출석'], ['play', '머문 시간']], render(sub) {
    let h = '';
    if (sub === 'daily') { const L = G.dailyList(), done = L.filter(m => m.got).length;
      h += card('all', IMG('deco/gift'), '오늘의 할 일 모두 끝내기', `${done}/${L.length} · 보상 ${rtxt(D.DAILY_BONUS)}`, S.daily.all ? '<b style="color:#5E9E82">받았어요 ✓</b>' : btn('dailyAll', '받기', 'yl', !G.dailyAllReady()), { bar: done / L.length, bg: '#FFF0B8' });
      for (const m of [...L].sort((a, b) => (a.got - b.got) || ((b.p >= b.n) - (a.p >= a.n)))) h += card(m.id, null, m.name.replace('{n}', m.n), `${m.p}/${m.n} · ${rtxt(m.r)}`, m.got ? '<b style="color:#5E9E82">✓</b>' : btn('daily:' + m.id, '받기', 'go', m.p < m.n), { bar: m.p / m.n, cls: m.got ? 'done' : '' }).replace('<div class="im">', `<div class="im">${MIS_E[m.id]}`);
      return h; }
    if (sub === 'repeat') { for (const q of G.repeatList()) h += card(q.id, null, `${q.name} ${q.done ? '완료' : q.need + '번'}`, q.done ? '모든 단계를 끝냈어요!' : `${fmt(Math.min(q.have, q.need))}/${fmt(q.need)} · ${rtxt(q.r(q.step))} · ${q.step + 1}단계`, q.done ? '' : btn('repeat:' + q.id, '받기', 'go', q.have < q.need), { bar: q.done ? 1 : Math.min(1, q.have / q.need) }).replace('<div class="im">', `<div class="im">${MIS_E[q.id]}`); return h; }
    if (sub === 'attend') { const idx = S.attend.idx, ready = G.attendReady();
      h += `<div class="sec">28일 출석 · 7일째마다 솔방울 80개</div><div class="grid28">${D.ATTEND.map((r, i) => `<div class="${i < idx ? 'got' : i === idx && ready ? 'today' : ''}"><b>${i + 1}</b>${i < idx ? '✓' : rtxt(r).replace(/class="ico"/g, 'class="ico" style="width:20px;height:20px"').replace(/(\d[\d,.만억조]*)/, '<br>$1')}</div>`).join('')}</div><div style="text-align:center;margin-top:18px">${btn('attend', ready ? '오늘 출석하기' : '내일 또 만나요', 'yl', !ready)}</div>`; return h; }
    for (const p of G.playReady()) h += card('p' + p.i, null, `오늘 ${p.m}분 머물기`, `${rtxt(p.r)} · ${Math.min(p.m, Math.floor(S.play.sec / 60))}/${p.m}분`, p.got ? '<b style="color:#5E9E82">✓</b>' : btn('play:' + p.i, '받기', 'go', !p.ready), { bar: Math.min(1, S.play.sec / 60 / p.m), cls: p.got ? 'done' : '' }).replace('<div class="im">', `<div class="im">${MIS_E.play}`);
    return h;
  } },
  shop: { title: '매점 · 웰컴센터', subs: [['stall', '진열'], ['deco', '꾸미기'], ['box', '선물 상자']], render(sub) {
    let h = '';
    if (sub === 'stall') {
      /* 위: 솔방울 묶음 (원어데이 골드 · 클수록 보너스) */
      if (bm.info.ok) { const packs = ['gems100', 'gems300', 'gems1000'].filter(k => bm.price(k));
        if (packs.length) h += `<div class="sec">솔방울 묶음 · 골드 1 = 솔방울 1, 클수록 보너스</div><div class="packs">${packs.map((k, i) => { const g = GOLD[k]; return `<div class="pack${k === 'gems1000' ? ' best' : ''}" data-k="${k}" style="animation-delay:${i * 0.05}s">${k === 'gems1000' ? '<span class="tagb">가장 알뜰</span>' : ''}<img src="${IMG('food/gem')}" alt=""><b>${fmt(g.n)}</b><em>${g.bonus ? `+${g.bonus}% 보너스` : '&nbsp;'}</em>${btn('gold:' + k, `${ic('gold')} ${bm.price(k)}`, 'yl', false, 'style="padding:10px 12px;font-size:20px"')}</div>`; }).join('')}</div>`; }
      if (bm.info.ok) { const au = ['auto7', 'autocloud'].filter(k => bm.price(k)); if (au.length) { h += `<div class="sec">일손 덜기 · 누르는 수고를 대신해요</div>`; for (const k of au) { const g = GOLD[k], own = g.item ? g.own() : (S.auto && S.auto.until > S.t); h += card('g' + k, g.art(), g.name, g.desc + (k === 'auto7' && own ? ` · ${tm(S.auto.until - S.t)} 남음` : ''), g.item && own ? '<b style="color:#5E9E82">가지고 있어요 ✓</b>' : btn('gold:' + k, `${ic('gold')} ${bm.price(k)}`, 'yl')); } } }
      const st = G.stall(); h += `<div class="sec">웰컴센터 매점 · 매일 새 물건이 들어와요</div>`;
      st.items.forEach((k, i) => { const it = D.STALL.find(x => x[0] === k), c = G.stallPrice(i), sold = st.bought.includes(i); h += card('s' + i, IMG({ treat: 'ui/cookie', big: 'deco/gift', rp: 'ui/tea', speed: 'food/icedcoffee' }[k]), it[1], { treat: '직원에게 주면 친해져요', big: '친밀도가 크게 올라요', rp: '메뉴 맛 올리기에 써요', speed: '5분 동안 요리 2배 빠르게' }[k], sold ? '<b style="color:#5E9E82">다 팔렸어요</b>' : btn('stall:' + i, `${ic('coin')}${fmt(c)}`, 'go', S.coin < c), { cls: sold ? 'done' : '' }); });
      if (adOn('restock')) { h += `<div style="text-align:center;margin-bottom:8px">${btn('ad:restock', `${ic('ad')} 새로 진열하기 <small>(${G.adLeft('restock')}번 남음)</small>`, 'sky', !adOk('restock'))}</div>`;
        /* 아래: 광고 혜택 */
        h += `<div class="sec">광고 혜택 · 한 번 볼 때마다 스탬프 1개</div>`;
        for (const k of ['speed', 'crit', 'rest']) h += card(k, IMG({ speed: 'food/icedcoffee', crit: 'ui/sparkle', rest: 'fac/hammock' }[k]), D.ADS[k].name, G.buffOn(k) ? `켜져 있어요 · ${clock(S.buff[k] - S.t)} 남음` : `오늘 ${G.adLeft(k)}번 남음`, btn('ad:' + k, G.buffOn(k) ? `${ic('ad')} 늘리기` : `${ic('ad')} 켜기`, 'sky', !adOk(k))); }
      if (bm.info.ok) h += `<div class="odds">골드는 원어데이 공용 재화예요. 능력치나 막힌 길은 팔지 않고, 모든 상품은 플레이 · 광고로도 얻을 수 있어요.</div>`;
      return h; }
    if (sub === 'box') { const left = D.BOX.pity - S.box.pity;
      h += `<div class="fair"><div>${left}번 안에<br>특별 장식 확정<small>30번째는 꼭 특별</small></div><div>확률 모두 공개<small>보통 ${D.RARITY.n.p * 100} · 희귀 ${D.RARITY.r.p * 100} · 특별 ${D.RARITY.s.p * 100}%</small></div><div>겹치면 돌려받기<small>솔방울 ${D.BOX.dupGem.n}~${D.BOX.dupGem.s}개</small></div></div>`;
      h += `<div class="card" data-k="box" style="flex-direction:column;text-align:center"><img src="${IMG('deco/gift')}" style="width:150px;animation:giftHop 1.4s cubic-bezier(.34,1.56,.64,1) infinite"><b style="font:900 30px/1.3 var(--ff)">숲 선물 상자</b><span style="font:700 19px/1.5 var(--ff);color:#7A645A">캠프를 꾸밀 장식이 나와요 · 솔방울은 레벨업 · 미션 · 출석으로 모여요</span>
        <div style="display:flex;gap:12px;margin-top:14px">${btn('box:gem', `${ic('gem')} ${D.BOX.cost} 열기`, 'pk', S.gem < D.BOX.cost)}${adOn('box') ? btn('box:ad', `${ic('ad')} 광고로 열기 <small>(${G.adLeft('box')})</small>`, 'sky', !adOk('box')) : ''}</div></div>`;
      for (const r of ['s', 'r', 'n']) h += `<div class="sec">${D.RARITY[r].name} · ${D.RARITY[r].p * 100}%</div>` + D.DECO.filter(d => d.rar === r).map(d => card(d.id, IMG(d.img), d.name, `매력 +${d.appeal}${S.deco[d.id] ? ` · ${S.deco[d.id]}개` : ''}`, S.deco[d.id] ? '<b style="color:#5E9E82">✓</b>' : '', { cls: S.deco[d.id] ? 'done' : 'lock' })).join('');
      return h; }
    /* 꾸미기: 특별 상품(전용 그림 · 미리 보기) → 스탬프 교환 */
    if (bm.info.ok) { h += `<div class="sec">특별 꾸미기 · 원어데이 골드 · 계정에 남아요</div>`;
      for (const k of ['skin', 'deco']) { const g = GOLD[k], p = bm.price(k); if (!p) continue; const own = g.own();
        h += `<div class="card" data-k="g${k}" style="flex-direction:column;align-items:stretch"><div style="display:flex;gap:14px;align-items:center"><div class="im" style="width:150px;height:170px;background:${k === 'skin' ? '#FFF6D0' : '#FCEFF2'}"><img src="${g.art()}" style="width:146px;height:166px"></div><div class="tx"><b>${g.name}</b><span>${g.desc}</span></div></div>
          <div style="display:flex;gap:10px;margin-top:12px">${own ? '<b style="color:#5E9E82;flex:1;text-align:center">가지고 있어요 ✓</b>' : `${btn('try:' + k, k === 'skin' ? '입어 보기' : '놓아 보기', 'sky')}${btn('gold:' + k, `${ic('gold')} ${p}`, 'yl')}`}</div></div>`; }
      h += card('own', IMG('fac/lantern'), D.OWNER_DECO.name, `원어데이에서 이 게임을 소장하면 받는 전용 장식 · 매력 +${D.OWNER_DECO.appeal}`, S.owner ? '<b style="color:#5E9E82">소장 ✓</b>' : '<small>소장자 전용</small>', { cls: S.owner ? 'done' : '' }); }
    h += `<div class="sec">스탬프 교환 · 광고 혜택을 받을 때마다 1개 (지금 ${S.stamp}개)</div>`;
    for (const o of D.STAMP_SHOP) { const d = D.DECO.find(x => x.id === o.id); h += card('st' + o.id, IMG(d.img), d.name, `매력 +${d.appeal}${S.deco[d.id] ? ' · 가지고 있어요' : ''}`, btn('stamp:' + o.id, `${ic('stamp')} ${o.cost}`, 'go', S.stamp < o.cost)); }
    return h;
  } },
};
const AMEN_E = Object.fromEntries(Object.entries(AMEN_IMG).map(([k, v]) => [k, `<img src="${IMG(v)}" style="width:80px;height:80px;object-fit:contain">`]));
const ZONE_E = Object.fromEntries(Object.entries({ lawn: 'fac/table', forest: 'fac/tent', pine: 'deco/pup_sit', valley: 'fac/playpool', stay: 'fac/bbq' }).map(([k, v]) => [k, `<img src="${IMG(v)}" style="width:84px;height:84px;object-fit:contain">`]));
const ZONE_BG = { lawn: '#DDF2E8', forest: '#CFE6C2', pine: '#FDE7D4', valley: '#DCEBF8', stay: '#FCEFF2' };
const ZONE_TXT = { lawn: '아이들이 뛰노는 잔디 · 웰컴센터와 공용 키친', forest: '소나무 · 잣나무 숲 사이 가족 캠핑 자리', pine: '반려견과 함께하는 울타리 존 · 어른만의 조용한 솔숲', valley: '아이들 물놀이 계곡 · 산책길과 폭포', stay: '바비큐 데크가 있는 숲속 스테이 · 루프탑' };
const MIS_E = Object.fromEntries(Object.entries({ serve: 'ui/serve', upgrade: 'ui/hammer', gift: 'deco/gift', treat: 'ui/cookie', crit: 'ui/sparkle', cat: 'deco/cat_sit', menu: 'ui/menu', box: 'deco/gift_open', tapsell: 'food/bagel', cloud: 'deco/sheep', giftpick: 'deco/gift', rserve: 'ui/serve', rup: 'ui/hammer', rcrit: 'ui/sparkle', play: 'ui/clock' }).map(([k, v]) => [k, `<img src="${IMG(v)}" style="width:76px;height:76px;object-fit:contain">`]));

/* ── 지도에서 누른 시설 (작은 창 · 길게 눌러 계속 강화) ── */
export function facDialog(t) {
  const draw = d => { const { fac, lv, tier, nextT, eff } = facInfo(t), w = G.working(t), cost = G.upCostOf(t);
    d.querySelector('.body2').innerHTML = `<div class="art"><img src="${t === 'oven' ? IMG('food/loaf') : IMG(fac.img)}" style="animation:none"></div><h3>${fac.name} Lv.${lv} ${stars(tier)}</h3><p>${eff}${nextT ? `<br>Lv.${nextT}에 단계가 올라 모습이 바뀌어요` : ''}</p>
      <div class="row">${w ? `${instBtns('up:' + t)}` : lv >= D.UP.max ? '<b>최고 단계예요!</b>' : btn('up:' + t, `강화 · ${ic('coin')}${fmt(cost)}`, nextT === lv + 1 ? 'yl' : 'go', S.coin < cost)}${fac.kind === 'special' && G.chargeLeft(t) <= 0 ? btn('charge:' + t, '선물 받기', 'pk') : ''}</div>`;
    d.querySelectorAll('[data-a]').forEach(b => { const [a, v, x] = b.dataset.a.split(':'); if (a === 'up') { b.onclick = () => act('up', v, null, b, null); hold(b, () => act('up', v, null, b, null, true)); } else if (a === 'instad' || a === 'instgo') b.onclick = () => instAct(a, v + ':' + x, b); else b.onclick = () => act(a, v, x, b, null); }); };
  const me = dlg(`<div class="body2"></div>`, { live: d => draw(d) }); draw(me.el);
}
/* 즉시 완성 2버튼 (docs/bm-policy.md 2-1): [${ic('ad')} 광고로 즉시 완성] + [${ic('inst')} 즉시 완성 · N] (솔방울이 N 이상이면 솔방울, 모자라면 같은 버튼이 🪙N) · 10초 미만이면 숨김 */
function instBtns(key) {
  const w = G.workList().find(x => x.key === key); if (!w) return '<b>다 됐어요!</b>'; const left = w.end - S.t; if (left < D.INST_MIN) return `<b>곧 끝나요 · ${clock(left)}</b>`;
  const n = G.instGem(w), gp = bm.price('inst' + n);
  let h = `<div style="width:100%;font:800 24px/1 var(--ff);margin-bottom:6px">${ic('clock')} ${clock(left)}</div>`;
  if (adOn('inst')) h += btn('instad:' + key, `${ic('ad')} 광고로 즉시 완성 <small>(${G.adLeft('inst')}번)</small>`, 'sky', !adOk('inst'));
  if (S.gem >= n) h += btn('instgo:' + key, `${ic('inst')} 즉시 완성 · ${ic('gem')}${n}`, 'yl');
  else if (bm.info.ok && gp === n) h += btn('instgo:' + key, `${ic('inst')} 즉시 완성 · ${ic('gold')}${n}`, 'yl');
  else h += btn('instgo:' + key, `${ic('inst')} 즉시 완성 · ${ic('gem')}${n}`, 'yl', true);
  return h;
}
async function instAct(a, key, b) {
  const w = G.workList().find(x => x.key === key); if (!w) return;
  if (a === 'instad') { await watch('inst', key, () => { G.finishWork(key, 'ad'); }); return; }
  const n = G.instGem(w);
  if (S.gem >= n) { const e = G.instByGem(key); if (e) return nope(b, e); sfx('unlock'); ctx.save(); return; }
  const r = await bm.spend('inst' + n); if (!r.ok) { if (r.reason === 'short') soft('골드가 조금 모자라요'); else if (r.reason !== 'cancel') soft('솔방울이 조금 모자라요 · 레벨업 · 미션에서 모여요'); return; }
  const w2 = G.workList().find(x => x.key === key); if (w2) G.finishWork(key, 'gold'); sfx('unlock'); ctx.save();
}
export function instDialog(key) {
  const draw = d => { const w = G.workList().find(x => x.key === key); if (!w) { d.querySelector('.body2').innerHTML = `<h3>다 됐어요!</h3><p>${praise()}</p><div class="row"><div class="btn go" data-c>좋아요</div></div>`; d.querySelector('[data-c]').onclick = () => me.close(); return; }
    d.querySelector('.body2').innerHTML = `<h3>${w.name}</h3><p>기다리면 저절로 끝나요 · 지금 바로 끝낼 수도 있어요</p><div class="row">${instBtns(key)}</div>`;
    d.querySelectorAll('[data-a]').forEach(b => { const [a, ...k] = b.dataset.a.split(':'); b.onclick = () => instAct(a, k.join(':'), b); }); };
  const me = dlg('<div class="body2"></div>', { live: d => draw(d) }); draw(me.el);
}
export function buildDialog(pid) {
  const p = D.PADS.find(x => x.id === pid), f = D.FAC[p.fac], c = G.padCost();
  const me = dlg(`<div class="art"><img src="${IMG(f.img)}"></div><h3>${f.name}</h3><p>${f.desc}${p.dog ? '<br>애견 동반 손님이 앉는 자리예요' : ''}</p><div class="row">${btn('b', `짓기 · ${ic('coin')}${fmt(c)}`, 'go', S.coin < c)}</div>`);
  me.el.querySelector('[data-a]').onclick = e => { const err = G.build(pid); if (err) return nope(e.currentTarget, err); me.close(); toast(`${f.name}${josa(f.name)} 생겼어요! ${praise()}`, true); ctx.save(); };
}
export function zoneDialog(z) {
  const Z = D.ZONES.find(x => x.id === z), o = S.zones[z];
  if (o.st === 'building') return instDialog('zone:' + z);
  const ok = G.zoneNeedOk(z);
  const me = dlg(`<div class="art">${ZONE_E[z].replace(/84px/g, '170px')}</div><h3>${Z.name}</h3><p>${ZONE_TXT[z]}<br>${ok ? `정리하는 데 ${tm(Z.build)} · 열면 ${ic('gem')}${Z.reward}` : `레벨 ${Z.need.lv} · 시설 ${Z.need.built}개가 되면 열 수 있어요<br>(지금 레벨 ${S.lv} · 시설 ${S.builds}개)`}</p><div class="row">${ok ? btn('z', '구역 열기', 'pk') : btn('c', '알겠어요', 'go')}</div>`);
  me.el.querySelector('[data-a]').onclick = () => { if (ok) { G.expand(z); sfx('build'); toast(`${Z.name} 정리를 시작했어요 · ${tm(Z.build)}`, true); ctx.save(); } me.close(); };
}

/* ── 이벤트 창 ── */
export function offlinePop(o) {
  enqueue(0, () => {
    const h = Math.floor(o.away / 3600), m = Math.floor(o.away % 3600 / 60);
    const me = dlg(`<div class="art"><img src="${IMG('deco/cat_sleep')}"></div><h3>${o.capped ? '가득 모았어요!' : '다녀오셨어요!'}</h3><p>${o.capped ? `${G.offlineCapH()}시간치를 꽉 채웠어요 · 손님 ${fmtL(o.served)}명이 쉬어 갔어요${S.amen.shower && S.amen.laundry ? '' : '<br><small>샤워장 · 세탁실을 지으면 더 오래 모여요</small>'}` : `${h ? h + '시간 ' : ''}${m}분 동안 직원들이 캠프를 지켰어요 · 손님 ${fmtL(o.served)}명`}</p>
      <div class="big">${ic('coin', '')}<span id="offN">0</span></div><p style="margin-top:-8px">${ic('rp')} ${fmtL(o.rp)} 쉼 포인트</p>
      <div class="row">${btn('take', '받기', 'go')}${adOn('double') ? btn('x2', `${ic('ad')} 2배로 받기 <small>(${G.adLeft('double')})</small>`, 'yl', !adOk('double')) : ''}</div>`, { lock: true, rays: true });
    const num = me.el.querySelector('#offN'); const t0 = performance.now(); (function up() { const k = Math.min(1, (performance.now() - t0) / 900); num.textContent = fmtL(o.coin * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(up); else sfx('count'); })();
    const take = mult => { G.takeOffline(o, mult); me.close(); fly('coin', 360, 760, 10); if (o.rp) fly('rp', 360, 800, 4); toast(mult > 1 ? '2배로 받았어요! 오늘도 멋진 캠프예요' : '오늘도 멋진 캠프를 만들어 봐요', true); ctx.save(); };
    me.el.querySelector('[data-a="take"]').onclick = () => take(1);
    const x2 = me.el.querySelector('[data-a="x2"]'); if (x2) x2.onclick = async () => { const ok = await watch('double', null, () => {}); if (ok) take(2); };
  });
}
export function attendPop() {
  if (!G.attendReady()) return openTab('mission', 'attend');
  enqueue(3, () => {
    const i = S.attend.idx, r = D.ATTEND[i % 28];
    const me = dlg(`<h3>출석 ${i + 1}일째</h3><p>오늘도 와 주셔서 고마워요!</p><div class="grid28" style="margin-bottom:16px">${D.ATTEND.slice(Math.floor(i / 7) * 7, Math.floor(i / 7) * 7 + 7).map((x, j) => { const k = Math.floor(i / 7) * 7 + j; return `<div class="${k < i ? 'got' : k === i ? 'today' : ''}"><b>${k + 1}</b>${k < i ? '✓' : ''}</div>`; }).join('')}</div><div class="big" style="font-size:36px">${rtxt(r)}</div><div class="row">${btn('ok', '받기', 'yl')}</div>`, { rays: true });
    me.el.querySelector('[data-a]').onclick = () => { const got = G.claimAttend(); me.close(); if (got) { flyR(got, [360, 700]); loginBox(); } ctx.save(); };
  });
}
/* 하루 첫 출석 뒤 '숲 바구니' (명세서 7장 하루 첫 접속 무작위 보상 · 확률은 data.js LOGIN_BOX) */
function loginBox() {
  const tot = D.LOGIN_BOX.reduce((a, x) => a + x[1], 0); let r = Math.random() * tot, k = D.LOGIN_BOX[0]; for (const x of D.LOGIN_BOX) { if ((r -= x[1]) < 0) { k = x; break; } }
  const give = { treat: { treat: 2 }, coin: { min: 60 }, rp: { rp: Math.ceil(G.restPerMin() * 20 + 30) }, stamp: { stamp: 2 }, gem: { gem: 20 }, big: { big: 1 } }[k[0]];
  enqueue(3, () => { const me = dlg(`<div class="art"><img src="${IMG('deco/gift_open')}"></div><h3>오늘의 숲 바구니</h3><p>노을이가 바구니를 물어 왔어요</p><div class="big" style="font-size:36px">${rtxt(give.min ? { coin: Math.ceil(G.minsOf(60)) } : give)}</div><div class="row">${btn('ok', '고마워, 노을아!', 'go')}</div>`, { rays: true });
    me.el.querySelector('[data-a]').onclick = () => { const got = G.gain(give, 'login'); flyR(got, [360, 700]); me.close(); ctx.save(); }; });
}
export function storyPop(id, i, reread) {
  const r = D.REGULARS.find(x => x.id === id), o = S.regs[id];
  enqueue(2, () => {
    const me = dlg(`<div class="art"><img src="${ctx.portrait(r.look)}" style="width:170px;border-radius:50%;background:#FFF0B8"></div><h3>${r.name} · 이야기 ${i + 1}</h3><p style="margin:0">${r.who} <span class="hearts">${'♥'.repeat(o.fav)}${'♡'.repeat(D.FAVOR_MAX - o.fav)}</span></p><div class="story">${r.story[i]}</div><div class="row">${btn('ok', i + 1 >= D.FAVOR_MAX && !reread ? '마지막 이야기 · 고마워요' : '또 오세요!', 'pk')}</div>`, { rays: !reread });
    if (!reread) sfx('story');
    me.el.querySelector('[data-a]').onclick = () => { o.read = Math.max(o.read || 0, i + 1); me.close(); ctx.save(); if (cur) cur.refresh(true); };
  });
}
function boxPop(r) {
  if (!r || r.err) return r && soft(r.err);
  const d = D.DECO.find(x => x.id === r.id), rn = r.rar === 'stamp' ? '스탬프 교환' : D.RARITY[r.rar].name;
  /* 상자 연출 약 1.5초: 흔들림 → 열림(뚜껑 튐) → 등급 색 빛 → 장식 확대 · 특별은 금빛 + 팡파르 (퀄리티 B10) */
  const me = dlg(`<div class="rays ${r.rar === 's' ? '' : r.rar === 'r' ? 'r' : 'n'}" style="opacity:0;transition:opacity .4s"></div><div class="art" id="bx"><img src="${IMG('deco/gift')}" style="animation:shakeNo .25s 3"></div><h3 id="bxT">상자를 여는 중…</h3><p id="bxP">&nbsp;</p><div class="row" id="bxR" style="opacity:0"></div>`);
  setTimeout(() => { const b = me.el.querySelector('#bx'); b.innerHTML = `<img src="${IMG('deco/gift_open')}" style="animation:artIn .35s cubic-bezier(.34,1.56,.64,1)">`; me.el.querySelector('.rays').style.opacity = 1; }, 600);
  sfx('box', { rar: r.rar });
  setTimeout(() => { me.el.querySelector('#bx').innerHTML = `<img src="${IMG(d.img)}" class="${{ s: 'glowS', r: 'glowR' }[r.rar] || 'glowN'}" style="width:180px">`; me.el.querySelector('#bxT').innerHTML = `<span style="color:${{ s: '#C9861E', r: '#4A7AAE' }[r.rar] || 'var(--ink)'}">${rn}</span> · ${d.name}`; if (r.rar === 's') sfx('level'); if (r.dup) fly('gem', 360, 700, 5); me.el.querySelector('#bxP').innerHTML = r.dup ? `이미 있어서 솔방울 ${D.BOX.dupGem[r.rar]}개를 돌려받았어요` : `캠프에 놓았어요! 매력 +${d.appeal}`;
    const row = me.el.querySelector('#bxR'); row.style.opacity = 1; row.style.transition = 'opacity .3s'; row.innerHTML = btn('ok', '좋아요', 'go') + (adOn('again') && adOk('again') ? btn('again', `${ic('ad')} 한 번 더`, 'sky') : '');
    if (r.rar === 's') confetti(40); ctx.render(); ctx.save();
    row.querySelector('[data-a="ok"]').onclick = () => me.close();
    const ag = row.querySelector('[data-a="again"]'); if (ag) ag.onclick = async () => { me.close(); await watch('again', null, rr => setTimeout(() => boxPop(rr), 260)); };
    if (cur) cur.refresh(true);
  }, 1250);
}
/* sim 이벤트 → UI */
export function onEvent(e) {
  if (e.type === 'levelup') { celebrate(`레벨 ${e.lv}!`, `${LV_MSG[e.lv] || praise()} · ${rtxt(e.r)}`, 'ui/sparkle'); sfx('level'); fly('gem', 360, 340, 6);
    const z = D.ZONES.find(x => x.need.lv === e.lv); if (z) setTimeout(() => toast(`${z.name}${josa(z.name, '을/를')} 열 수 있게 됐어요 (시설 ${z.need.built}개)`, true), 1600); }
  else if (e.type === 'zoneOpen') { const z = D.ZONES.find(x => x.id === e.z); celebrate(`${z.name.split(' · ')[0]} 열림!`, `${ic('gem')}${z.reward} · 새 자리가 생겼어요`, 'fac/tent'); sfx('unlock'); }
  else if (e.type === 'goalDone') { banner('목표 달성!', `${e.text} · ${rtxt(e.r)}`); sfx('reward'); fly('gem', 360, 220, 4); }
  else if (e.type === 'menuNew') { const m = D.MENU.find(x => x.id === e.id); if (m) celebrate('새 메뉴!', m.name, m.img); }
  else if (e.type === 'hire') { const st = D.STAFF.find(x => x.id === e.id); if (st) celebrate(`${st.name} 합류!`, st.line, 'deco/heart'); }
  else if (e.type === 'story') storyPop(e.id, e.fav - 1);
  else if (e.type === 'workDone') { toast(`${e.target === 'oven' ? '빵 오븐' : D.FAC[S.pads[e.target].fac].name} 단계 공사 완료! 모습이 바뀌었어요`, true); sfx('tier'); }
  else if (e.type === 'hire') { /* 판 안에서 알림 */ }
}
const LV_MSG = { 2: '첫 단골이 찾아올지도 몰라요', 3: '숲속 존을 열 준비가 됐어요', 5: '캠프가 소문나기 시작했어요', 6: '애견 동반 존 · 솔숲을 열 수 있어요', 10: '계곡을 열 수 있어요!', 12: '마지막 메뉴들이 열려요', 15: '스테이 · 루프탑을 열 수 있어요', 20: '최고의 숲속 캠프!' };

/* ── 처음 10분 안내 (막지 않는 손가락 + 한 줄) · docs/ux_notes.md 1장 ── */
const TUT = [
  { say: '숲속 캠프에 오신 걸 환영해요! 손님이 오면 셰프가 베이글을 구워요', wait: 4, pad: null },
  { say: '다 된 <b>베이글</b>을 눌러 직접 팔아요 · <b>직접 팔면 2배!</b>', at: 'dish', done: () => G.R.tapStats.dish >= 2 },
  { say: '굽는 중인 <b>오븐</b>을 콕콕 누르면 응원해서 더 빨리 구워요', at: 'ovenBody', done: () => G.R.tapStats.cheer >= 5 },
  { say: '오븐 아래 <b>Lv 표지</b>를 눌러 강화해 봐요 · 베이글 값이 올라요', at: 'oven', done: () => S.oven.lv >= 3 },
  { say: '<b>직원</b>에서 요리사 솔을 고용해요', tab: 'staff', done: () => S.staff.sol, when: () => S.coin >= 300 || S.staff.sol },
  { say: '<b>무쇠 솥</b>을 지으면 솔이 수프를 끓여요', pad: 'L1', done: () => S.pads.L1 },
  { say: '<b>메뉴</b>에서 수프를 출시해요', tab: 'menu', done: () => D.MENU.filter(m => m.line === 'soup').some(m => G.menuLv(m) > 0) },
  { say: '<b>미션</b>을 끝내면 보상을 받아요 · 이제 마음껏 캠프를 키워 봐요!', tab: 'mission', done: () => S.seen && S.seen.mission },
];
let tutT = 0, ptr = null, hintEl = null;
function tutSaw() { tut(); }
export const tutOn = () => S.tut < TUT.length;
const tutTab = () => { const s = TUT[S.tut]; return s && s.tab && (!s.when || s.when()) ? s.tab : null; };
export const tutSay = () => (TUT[S.tut] || {}).say || '';
function tut() {
  if (S.tut >= TUT.length) { if (ptr) { ptr.remove(); ptr = null; } if (hintEl) { hintEl.remove(); hintEl = null; } return; }
  const s = TUT[S.tut]; if (s.done && s.done()) { S.tut++; sfx('reward'); if (S.tut < TUT.length) numPop(360, 900, praise()); ctx.save(); return tut(); }
  if (!s.done) { tutT += 0.5; if (tutT > s.wait) { S.tut++; tutT = 0; return tut(); } }   /* 시간으로 넘어가는 단계: 넘긴 뒤 새 단계 문구로 다시 그림 (이전 문구가 남던 버그 · 퀄리티 QA) */
  if (s.when && !s.when()) { if (hintEl) hintEl.style.display = 'none'; if (ptr) ptr.style.display = 'none'; return; }
  if (!hintEl) { hintEl = document.createElement('div'); hintEl.id = 'hint'; frame.appendChild(hintEl); }
  hintEl.style.display = cur || curDlg ? 'none' : ''; hintEl.style.top = (1112 + OFFY) + 'px'; const html = `<span>${s.say}</span>`; if (hintEl.dataset.i !== String(S.tut)) { hintEl.innerHTML = html; hintEl.dataset.i = S.tut; }
  let at = null; if (s.pad) at = ctx.padPos(s.pad); else if (s.at) at = ctx.padPos(s.at); else if (s.tab) { const t = barEl.querySelector(`[data-t="${s.tab}"]`); if (t && !(cur && cur.id === s.tab)) at = cardPos(t); }
  if (cur && s.tab && cur.id === s.tab) at = null; if (curDlg) at = null; if (cur && !s.tab) at = null;
  if (at) { if (!ptr) { ptr = document.createElement('div'); ptr.className = 'pointer'; frame.appendChild(ptr); } ptr.style.display = ''; ptr.style.left = at[0] + 'px'; ptr.style.top = at[1] + 'px'; } else if (ptr) ptr.style.display = 'none';
}
export function init(c) { ctx = c; hud(); }
/* 목표를 누르면: 할 수 있는 일로 바로 데려감 (한 번에) */
function goalAct() { const g = G.goalNow(), a = (g.step && g.step.act) || ({ oven3: { k: 'up', v: 'oven' }, oven10: { k: 'up', v: 'oven' }, sol: { k: 'tab', v: 'staff' }, bada: { k: 'tab', v: 'staff' }, stew: { k: 'tab', v: 'menu', w: 'soup' }, cocoa: { k: 'tab', v: 'menu', w: 'drink' }, fridge: { k: 'tab', v: 'fac', w: 'amen' }, pot: { k: 'build', v: 'L1' }, drink: { k: 'build', v: 'L3' }, tent: { k: 'build', v: 'F1' }, ftable: { k: 'build', v: 'F2' }, dtable: { k: 'build', v: 'D1' }, tapsell: { k: 'tap' } }[g.id]) || (D.ZONES.find(z => z.id === g.id) ? { k: 'zone', v: g.id } : { k: 'tab', v: 'fac' });
  sfx('tap'); if (a.k === 'up') facDialog(a.v); else if (a.k === 'build') buildDialog(a.v); else if (a.k === 'zone') zoneDialog(a.v); else if (a.k === 'tab') openTab(a.v, a.w); else toast('반짝이는 요리를 눌러 직접 팔아요 · 직접 팔면 2배!'); }
/* 캠프가 돌아가는 법 (처음 1분 · '하는 법' 버튼) — 핵심 루프를 그림으로 */
export function loopPop(force) { if (!force && S.loopShown) return; S.loopShown = 1; ctx.save();
  const st = [['guest', '손님이 와요', 'deco/heart'], ['cook', '셰프가 구워요', 'food/bagel'], ['sell', '눌러서 팔면 2배!', 'deco/coin'], ['coin', '코인이 모여요', 'deco/coin'], ['up', '시설 · 메뉴 강화', 'ui/hammer'], ['more', '손님이 더 많이, 더 비싸게', 'ui/sparkle']];
  enqueue(force ? 1 : 4, () => { const me = dlg(`<h3>캠프가 돌아가는 법</h3><div class="loop">${st.map(([, t, im], i) => `<div style="animation-delay:${i * 0.12}s"><img src="${IMG(im)}" alt=""><span>${t}</span></div>`).join('<i>→</i>')}</div><p>목표 칸을 누르면 지금 할 일로 바로 가요</p><div class="row">${btn('ok', '알겠어요!', 'go')}</div>`); me.el.querySelector('[data-a]').onclick = () => me.close(); }); }
/* 크게 축하 (레벨업 · 해금 · 목표) */
let lastCele = 0; function celebrate(title, sub, img) { const now = performance.now(); if (now - lastCele < 1500) { toast(`${title} ${sub}`, true); return; } lastCele = now; flyEl.querySelectorAll('.celebrate').forEach(x => x.remove()); const d = document.createElement('div'); d.className = 'celebrate'; d.innerHTML = `<div class="rays"></div><div class="cc"><img src="${IMG(img)}" alt=""><b>${title}</b><span>${sub}</span></div>`; flyEl.appendChild(d); confetti(60); setTimeout(() => d.classList.add('out'), 2200); setTimeout(() => d.remove(), 2700); }
/* 설정: 효과음 · 배경음 · 진동 (출퇴근길 무음 · 사업 의견 7) */
function settingsPop() {
  const draw = d => { d.querySelector('.body2').innerHTML = `<h3>설정</h3>${[['sfx', '효과음', AUD.sfx], ['bgm', '배경음', AUD.bgm], ['vib', '진동', S.vib !== false]].map(([k, n, on]) => `<div class="tog">${n}${btn('set:' + k, on ? '켜짐' : '꺼짐', on ? 'go' : '', false, 'style="min-width:110px;padding:10px 14px"')}</div>`).join('')}<div class="row" style="margin-top:16px">${btn('ok', '닫기', 'yl')}</div>`;
    d.querySelectorAll('[data-a^="set:"]').forEach(b => b.onclick = () => { const k = b.dataset.a.slice(4); if (k === 'vib') S.vib = S.vib === false; else setAudio({ [k]: !AUD[k] }); S.muted = !(AUD.sfx || AUD.bgm); S.audio = { sfx: AUD.sfx, bgm: AUD.bgm }; ctx.save(); draw(d); }); d.querySelector('[data-a="ok"]').onclick = () => me.close(); };
  const me = dlg('<div class="body2"></div>'); draw(me.el);
}
/* 선물 바구니: 셋 중 하나 고르기 → 나머지는 광고로 (광고 자리 1) */
let giftDlg = null;
export function giftPop() {
  const b = G.openGiftBox(); if (!b || giftDlg) return;
  const lbl = it => it.k === 'coin' ? `숲 코인<br>${fmt(it.r.coin)}` : it.k === 'rp' ? `쉼 포인트<br>${fmt(it.r.rp)}` : it.k === 'stamp' ? '스탬프 2' : it.k === 'gem' ? `솔방울 ${it.r.gem}` : it.k === 'treat' ? '간식 2' : '특별 도시락';
  const im = it => IMG({ coin: 'deco/coin', rp: 'ui/tea', stamp: 'ui/stamp', gem: 'food/gem', treat: 'ui/cookie', big: 'deco/gift' }[it.k]);
  const draw = d => { const B = G.R.giftBox; if (!B) return; d.querySelector('.body2').innerHTML = `<h3>${B.picked < 0 ? '선물 바구니 하나를 골라요' : '이걸 받았어요!'}</h3><p>${B.picked < 0 ? '직원이 숲에서 선물을 주워 왔어요' : '나머지 바구니도 열어 볼까요?'}</p>
    <div class="gpick">${B.items.map((it, i) => `<div data-i="${i}" class="${B.picked < 0 ? '' : i === B.picked ? 'got' : 'rest'}">${B.picked < 0 ? `<img src="${IMG('deco/gift')}">` : `<img src="${im(it)}" style="animation:artIn .5s cubic-bezier(.34,1.56,.64,1)">${lbl(it)}`}</div>`).join('')}</div>
    <div class="row">${B.picked < 0 ? '' : btn('done', '좋아요', 'go') + (adOn('giftrest') ? btn('rest', `${ic('ad')} 나머지도 받기 <small>(${G.adLeft('giftrest')})</small>`, 'sky', !adOk('giftrest')) : '')}</div>`;
    d.querySelectorAll('.gpick div').forEach(el => el.onclick = () => { if (G.R.giftBox.picked >= 0) return; ctx.pressFx && ctx.pressFx(el); const got = G.pickGift(+el.dataset.i); sfx('box', { rar: 'r' }); flyR(got, cardPos(el)); draw(d); ctx.save(); });
    const done = d.querySelector('[data-a="done"]'); if (done) done.onclick = () => { G.closeGiftBox(); me.close(); };
    const rest = d.querySelector('[data-a="rest"]'); if (rest) rest.onclick = async () => { const ok = await watch('giftrest', null, () => { const outs = G.takeRestGifts(); if (outs) outs.forEach(o => flyR(o, cardPos(rest))); }); if (ok) me.close(); }; };
  const me = dlg('<div class="body2"></div>', { onClose: () => { giftDlg = null; if (G.R.giftBox && G.R.giftBox.picked >= 0) G.closeGiftBox(); } }); giftDlg = me; draw(me.el);
}
export function giftClose() { if (giftDlg) { const d = giftDlg; giftDlg = null; d.close(); } }
export const isBusy = () => !!(cur || curDlg);
