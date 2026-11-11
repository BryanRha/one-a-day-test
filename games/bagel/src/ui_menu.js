// 메뉴 창들 (0.3 에서 옮겨 온 BM · 단골 · 꾸미기 · 미션 · 설정 · 쿠폰 · 광고 · 골드 · 시즌 패스) — ≡ 메뉴 한 곳에서 열어요
//   광고 바구니(하루 10) · 골드 · VIP 규칙은 그대로 · 전면 광고 · 배너는 없음(DESIGN 1장)
import { UI } from './ui.js?v=0.99.24';
import { BRAND, GAME, BRANCHES, COUPON, MENU, BRANCH_INFO, STAFF, DECO, REGULARS, FAVOR, MASTERY, MASTERY_K, josa, OUTFITS, OUTFITS_PRO, SHOP_ITEMS, FX, AD_REWARDS, AD_DAY, GIFT, AD_PLACES, GOLD, VIP, IDLE, THEME_SETS, SEASON, PASS_DAY_MIN, PASS_TIER_CAP, STORE_MAP, hms, instGold } from './data.js?v=0.99.24';
import { starOf, favLv, fxOn } from './game.js?v=0.99.24';
import { S, save, couponReady, claimCoupon, MISSIONS, missionReady, claimMission, mult, today, vipOn, has, KEY, resetAll } from './state.js?v=0.99.24';
import { sfx, setAudio } from './audio.js?v=0.99.24';
import { pushBack, inOAD, exitToOAD, track } from './oad.js?v=0.99.24';
import { bm } from './oad_bm.js?v=0.99.24';

const $ = s => document.querySelector(s), fmt = n => Math.round(n).toLocaleString('en-US');
const SLOT = 'marumi_slot_', REPEAT_MS = 180000, PLACE = { boost: 'boost2x', offline: 'offline2x', speed: 'speed', coins: 'coins' }, BOOST_MS = 180000, FX_MS = 180000;
const mmss = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`, hex = c => '#' + c.toString(16).padStart(6, '0');
const slotInfo = n => { try { const v = JSON.parse(localStorage.getItem(SLOT + n) || 'null'); if (!v) return ''; const d = JSON.parse(v.d), t = new Date(v.at); return `${['1호점', '2호점', '3호점', '4호점'][d.bi || 0]} · 돈 ${fmt(d.coins || 0)} · ${t.getMonth() + 1}/${t.getDate()} ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`; } catch { return ''; } };
const IDLE_K = 0.9, ACTIVE = 3;   /* 쉬는 동안 수익 (초당, × 지점 배수 × (1 + 연 칸/10)) · 실제 장사 ≈ × ACTIVE */
const ICON = new Proxy({}, { get: (_, k) => MENU[k]?.icon || '🥯' });   /* 메뉴 그림 하나 (data MENU · 특별 베이글은 지점마다) */
const rwTxt = r => r.coins ? `💰 ${r.coins}분치` : r.inst ? `⚡ 완성권 ${r.inst}` : r.safe ? '🔐 금고 꾸러미' : r.set ? `🎨 ${THEME_SETS.find(t => t.id === r.set).name}` : r.outfit ? `👕 ${OUTFITS_PRO.find(o => o.id === r.outfit).name}` : '';
class Menu {
  toast(t, o = {}) { const key = o.key || String(t).replace(/[+\d,]+/g, '#'), now = Date.now(); this._tq ||= []; this._seen ||= new Map();
    if (!o.force && (this._cur?.key === key || this._tq.some(x => x.key === key))) return; const last = this._seen.get(key); if (!o.force && last && now - last < (o.again ?? 0)) return;
    const prio = o.prio ?? (/[!🎉🏆]|완성|열림|받았|\+/.test(t) ? 2 : 1), it = { t, key, prio, dur: o.dur || 1800, age: 0, qt: performance.now() };
    if (!o.again) { const el = $('#toast'); this._cur && this._tq.unshift(this._cur); it.at = performance.now(); this._cur = it; this._seen.set(key, now); el.textContent = t; el.classList.add('on'); this.toastTick(); return; }   /* 누른 것의 대답은 바로 (보던 알림은 줄 맨 앞으로) */
    this._tq.push(it); this._tq.sort((a, b) => b.prio - a.prio); this.toastTick(); }
  /* 게임이 스스로 띄우는 알림 (같은 것은 3분 간격) — 누른 것에 대한 대답(toast)은 바로 */
  note(t, o = {}) { this.toast(t, { again: REPEAT_MS, ...o }); }
  toastTick() { const el = $('#toast'); if (!this._tTimer) this._tTimer = setInterval(() => this.toastTick(), 120); const now = performance.now();
    if (this._cur && now - this._cur.at < this._cur.dur) { const nx = this._tq[0]; if (!(nx && nx.prio > this._cur.prio && now - this._cur.at > 600)) return; }
    if (this._cur) { el.classList.remove('on'); this._cur = null; this._gapAt = now; return; } if (this._gapAt && now - this._gapAt < 250) return;   /* 앞 알림이 사라지는 동안 다음 것을 안 띄움 */
    while (this._tq.length && now - this._tq[0].qt > 6000) this._tq.shift();   /* 6초 넘게 기다린 알림은 버림 (지난 일) */
    const it = this._tq.shift(); if (!it) return; it.at = now; this._cur = it; this._seen.set(it.key, Date.now()); el.textContent = it.t; el.classList.add('on'); (window.__toasts ||= []).push(it.t); }
  modal(html, onClose) { const m = $('#modal'), cur = m.querySelector('.modal'); if (cur && this._ub) { cur.innerHTML = html; const f = this._oc; this._oc = onClose; if (f && f !== onClose) f(); return m; }   /* 덮인 창의 닫힘 처리도 불러 줌 (광고 취소 · 쉬는 동안 1배 받기) */   /* 이미 열린 창은 내용만 바꿈 (깜빡임 없음) */
    m.innerHTML = `<div class="mback"><div class="modal">${html}</div></div>`; m.firstChild.onclick = e => { if (e.target === m.firstChild) this.close(); }; this._oc = onClose; this._ub = pushBack(() => { this.close(); return true; }); sfx('card'); return m; }
  close() { $('#modal').innerHTML = ''; this._ub && this._ub(); this._ub = null; const f = this._oc; this._oc = null; f && f(); }
  // ── 쿠폰
  coupon() {
    if (S.coupon) return this.showCoupon(S.coupon);
    if (!couponReady()) return this.modal(`<h3>🎟 매장 쿠폰</h3><p>오늘 베이글을 <b>${COUPON.goal}개</b> 팔면<br>실제 ${BRAND.name} 매장에서 쓸 수 있는 쿠폰을 드려요.</p><div class="cpbig">${S.sold} / ${COUPON.goal}</div><p class="sm">${COUPON.text}</p><button class="btn" onclick="document.querySelector('#modal').innerHTML=''">계속 굽기</button>`);
    const c = claimCoupon(); sfx('levelup'); track('bg_coupon', { st: 'issue', b: S.bi }); this.showCoupon(c); this.progress();
  }
  showCoupon(c) { track('bg_coupon', { st: 'open', b: S.bi }); this.modal(`<div class="ticket"><small>${BRAND.name}</small><b>${COUPON.text}</b><div class="code">${c.code}</div><span>매장 직원에게 이 화면을 보여 주세요 · ${COUPON.valid}</span></div><button class="btn" id="mOk">확인</button>`); $('#mOk').onclick = () => this.close(); }
  // ── 광고 보상
  //    원어데이 안 = 원어데이 광고(bm.rewardedAd — 광고 창 · 횟수 · 그룹은 앱이 맡음) · 밖(단독 실행 · 개발 서버) = 시험용 3초 창
  //    보상은 한 번만 · 남은 시간은 Date.now 기준(폰에서 홈으로 나갔다 와도 그대로) · 그만두기 · 바깥 누르기 · 뒤로 · 다른 창이 덮으면 취소
  //    돌려주는 값: 보상을 줬으면 true
  async ad(kind, done, place, label) {
    if (this._adBusy) return false; place ||= kind === 'offline' ? 'offline2x' : 'hud';
    if (kind === 'boost' && this.boost()) { this.toast('수익 2배가 이미 켜져 있어요'); return false; }
    if (kind === 'speed' && fxOn('speed')) { this.toast('빨리 걷기가 이미 켜져 있어요'); return false; }
    if (!this.slotOk(place)) { this.toast(this.adLeft() <= 0 ? '오늘 볼 수 있는 광고를 다 봤어요 · 내일 또 만나요' : '이 자리 광고는 오늘 다 봤어요'); return false; }
    this._adBusy = true;
    try {
      const h = await bm.hello(); let ok;
      if (vipOn()) { ok = true; if ($('#adpick')) this.close(); this.toast('👑 VIP · 광고 없이 받았어요'); }   /* VIP: 광고 없이 바로 (횟수는 같음 — 원어데이 소장자와 같은 방식) */
      else { if (h.ok && $('#adpick')) this.close();   /* 원어데이 광고 창이 뜨기 전에 고르기 창은 닫음 */
        ok = h.ok ? await this.oadAd(place === 'hud' ? PLACE[kind] : place) : await this.testAd(kind, label); }
      if (!ok) return false;
      this.adDay(); S.ads.n++; S.adp.n[place] = (S.adp.n[place] || 0) + 1; track('bg_ad', { pl: place, b: S.bi }); this._lastAd = Date.now();
      sfx('levelup');
      if (kind === 'boost') { S.boostUntil = Date.now() + BOOST_MS; save(true); this.toast('3분 동안 수익 2배!'); }
      if (kind === 'speed') { S.fx.speed = Date.now() + FX_MS; save(true); this.toast('3분 동안 빨리 걸어요! 👟'); }
      if (kind === 'coins') { const v = this.adCoins(); S.coins += v; S.earned += v; save(true); sfx('cash_get'); this.toast(`광고 보상 +${fmt(v)}`); this.app.game.ui.float('+' + fmt(v), this.app.game.pl.pos, 'cash'); }
      save(true); try { done && done(); } catch (e) { console.error(e); }
      return true;
    } finally { this._adBusy = false; this.adUi(); this.progress(); }
  }
  /* 골드로 같은 효과 (원어데이 확인 창 → 차감 → 효과) · item = 영구 상품(기기에도 기록) */
  async gold(sku, fn, item) {
    if (this._adBusy) return false; const g = this.goldOf(sku); if (!g) { this.toast('지금은 골드 상품을 쓸 수 없어요'); return false; }
    this._adBusy = true;
    try { const r = await bm.spend(sku); if (!r.ok) { if (r.reason === 'short') this.toast('골드가 모자라요'); else if (r.reason === 'limit') this.toast('오늘은 이만큼만 살 수 있어요'); else if (r.reason === 'login') this.toast('원어데이 로그인이 필요해요'); return false; }
      if (item && !S.items.includes(item)) S.items.push(item); sfx('levelup'); try { fn && fn(); } catch (e) { console.error(e); } save(true); this.progress(); return true; }
    finally { this._adBusy = false; } }
  async oadAd(kind) {
    const r = await bm.rewardedAd(PLACE[kind] || kind); if (r.ok) return true;
    if (r.reason === 'limit') this.toast('오늘 볼 수 있는 광고를 다 봤어요 · 내일 또 만나요');
    else if (r.reason === 'off') this.toast('지금은 광고 보상이 없어요');
    else if (r.reason !== 'cancel') this.toast('광고를 불러오지 못했어요 · 잠시 뒤 다시 해 주세요');
    return false;
  }
  testAd(kind, label) {
    const what = label || (kind === 'boost' ? '3분 동안 수익 2배' : kind === 'offline' ? '쉬는 동안 번 돈 2배' : kind === 'speed' ? '3분 동안 빨리 걷기' : kind === 'coins' ? `돈 +${fmt(this.adCoins())}` : '보상');
    return new Promise(res => {
      const end = Date.now() + 3000; let fin = false, tm = 0;
      const stop = ok => { if (fin) return; fin = true; clearInterval(tm); removeEventListener('visibilitychange', tick); res(ok); };
      const tick = () => { if (fin) return; if (!$('#adbox')) return stop(false);   /* 다른 창이 덮음 = 취소 (그 창은 그대로 둠) */
        const left = Math.max(0, Math.ceil((end - Date.now()) / 1000)), e = $('#adc'); if (e) e.textContent = left;
        if (left <= 0) { this._oc = null; this.close(); stop(true); } };
      this.modal(`<h3>📺 시험 광고</h3><p><b>${what}</b></p><div class="adbox" id="adbox"><span class="testad">시험 광고 · 실제 광고가 아니에요</span><em id="adc">3</em><span>원어데이 앱 안에서는 실제 광고가 나와요</span></div><button class="btn ghost" id="adNo">그만두기</button>`, () => stop(false));
      $('#adNo').onclick = () => this.close();
      tm = setInterval(tick, 250); addEventListener('visibilitychange', tick);
    });
  }
  /* 수익 크기: 지점 「분」치 돈 (광고 보상 · 금고 꾸러미 · VIP 상자 · 시즌 보상) — 쉬는 동안 수익 기준 × ACTIVE (실제 장사는 쉬는 동안보다 빠름 · 봇 측정 tools/growth_sim.mjs) */
  opened(i = S.bi) { const br = S.branch[i]; return br ? br.own.filter(id => !id.includes('+')).length : 0; }
  idleRate(i) { const B = BRANCHES[i], br = S.branch[i] || {}; const pr = (br.own || []).filter(x => x.startsWith('price+')).length; return IDLE_K * IDLE.off * B.mult * (1 + this.opened(i) / 10) * (1 + pr * 0.06) * (1 + (br.idleUp || 0) * IDLE.upK) * (vipOn() ? VIP.mult : 1); }
  idleCapH() { return (vipOn() ? VIP.idleH : IDLE.baseH) + (S.manager ? IDLE.managerH : 0); }
  perMin(i = S.bi) { const B = BRANCHES[i]; return IDLE_K * ACTIVE * 60 * B.mult * (1 + this.opened(i) / 10); }
  adCoins() { return Math.max(10, Math.round(this.perMin() * 2 / 10) * 10); }   /* 광고 1편 = 장사 2분치 (같은 일은 같은 값 · 🪙20 · growth_sim 으로 맞춤) */
  giftCoins() { return Math.max(10, Math.round(this.perMin() * 2 / 10) * 10); }
  // ── 📺 광고 보상 고르기 (HUD · 하루 상한 2 · 바구니 표시) — 다 쓰면 같은 효과를 🪙20 으로
  adPick() {
    if (this._adBusy) return; const left = this.placeLeft('hud'), on = this.adOn() && left > 0, g = this.goldOf('boost');
    if (!on && !g) { this.toast(this.adLeft() <= 0 ? '오늘 볼 수 있는 광고를 다 봤어요 · 내일 또 만나요' : '📺 보상은 하루 2번이에요 · 내일 또 만나요'); return; }
    const now = Date.now(), rows = AD_REWARDS.map(r => { const lf = r.id === 'boost' ? this.boostUntil - now : r.id === 'speed' ? (+S.fx.speed || 0) - now : 0, act = lf > 0;
      return `<button class="adc ${act ? 'off' : ''}" data-ad="${r.id}"><i>${r.icon}</i><b>${r.name}</b><span>${r.id === 'coins' ? `+${fmt(this.adCoins())}` : r.desc}</span><em class="${on ? '' : 'g'}">${act ? `켜짐 ${mmss(Math.min(FX_MS, lf))}` : on ? (vipOn() ? '👑 바로' : '📺 보기') : `🪙 ${g}`}</em></button>`; }).join('');
    const m = this.modal(`<h3>📺 광고 보고 받기</h3><p class="sm" id="adpick">하나를 골라요 · 오늘 광고 <b>${this.adLeft()}/${AD_DAY}</b> · 이 버튼 ${left}번 남음${on ? '' : ' · 다 봐서 같은 효과를 🪙로'}</p><div class="adcs">${rows}</div><button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close();
    m.querySelectorAll('[data-ad]').forEach(b => b.onclick = () => { const k = b.dataset.ad; if (b.classList.contains('off')) { this.toast(k === 'boost' ? '수익 2배가 이미 켜져 있어요' : '빨리 걷기가 이미 켜져 있어요'); return; }
      if (on) this.ad(k); else this.gold('boost', () => { this.close(); this.reward(k); }); }); }
  /* 보상만 (골드로 산 경우) */
  reward(k) { if (k === 'boost') { S.boostUntil = Date.now() + BOOST_MS; this.toast('3분 동안 수익 2배!'); } if (k === 'speed') { S.fx.speed = Date.now() + FX_MS; this.toast('3분 동안 빨리 걸어요! 👟'); } if (k === 'tray') { S.fx.tray = Date.now() + FX_MS; this.toast('3분 동안 4개 더 들어요! 🧺'); }
    if (k === 'coins') { const v = this.adCoins(); S.coins += v; S.earned += v; sfx('cash_get'); this.toast(`+${fmt(v)}`); } save(true); this.progress(); }
  // ── 상점: 가게 물품(게임 돈) · 돈 받기(하루 선물 · 광고) · 🪙 골드(원어데이) · 시즌 패스
  itemCost(it) { return Math.round(it.cost * BRANCHES[S.bi].mult / 10) * 10; }
  giftReady() { return S.gift !== today() && !this.app.game.own('store'); }   /* 창고가 열리면 선물은 창고로 */
  shop() {
    const g = this.app.game, gold = bm.info.ok && bm.info.group !== 'A', tabs = [['item', '가게 물품'], ['money', '돈 받기' + (this.giftReady() ? ' •' : '')], ...(gold ? [['gold', '🪙 골드']] : []), ['pass', '시즌 패스']]; let tab = this._stab || 'item'; if (!tabs.some(t => t[0] === tab)) tab = 'item';
    const now = Date.now(); let body = '', note = '';
    if (tab === 'item') { body = SHOP_ITEMS.map(it => { const c = this.itemCost(it), left = it.fx ? (+S.fx[it.fx] || 0) - now : 0, room = it.id === 'batch' ? g.ovenRoom() : 1, noStaff = it.staff && !g.staff.length;
      const why = left > 0 ? `켜짐 ${mmss(Math.min(FX_MS, left))}` : noStaff ? '직원이 없어요' : !room ? '오븐이 가득' : '';
      return `<div class="upr"><i>${it.icon}</i><div><b>${it.name}</b><span>${it.desc}</span></div><button class="btn sm ${why || S.coins < c ? 'off' : ''}" data-it="${it.id}">${why || `<i class="c"></i>${fmt(c)}`}</button></div>`; }).join(''); note = '물품은 이 지점에서 바로 써요 · 시간 효과는 화면 위에 남은 시간이 보여요'; }
    if (tab === 'money') { const ad = this.slotOk('hud'); body = `${g.own('store') ? '<div class="upr"><i>📦</i><div><b>오늘의 선물</b><span>창고에 배송 상자로 와요 · 창고에 들어가 보세요</span></div></div>' : `<div class="upr gift"><i>🎁</i><div><b>오늘의 선물</b><span>하루 한 번 · 사장님 힘내세요!</span></div><button class="btn sm ${this.giftReady() ? '' : 'off'}" id="shGift">${this.giftReady() ? `<i class="c"></i>${fmt(this.giftCoins())}` : '내일 또'}</button></div>`}
      <div class="upr"><i>📺</i><div><b>광고 보고 돈 받기</b><span>${ad ? `오늘 광고 ${this.adLeft()}/${AD_DAY}` : bm.info.ok && bm.info.group === 'A' ? '지금은 광고 보상이 없어요' : '오늘 이 자리 광고를 다 봤어요'}</span></div><button class="btn sm ${ad ? '' : 'off'}" id="shAd"><i class="c"></i>${fmt(this.adCoins())}</button></div>`; note = `선물은 날마다 새로 · 광고는 하루 ${AD_DAY}번까지 (모든 광고 자리 합쳐서)`; }
    if (tab === 'gold') { body = this.goldRows(); note = '🪙 원어데이 골드 · 실물 쿠폰은 골드로 팔지 않아요 (플레이로만) · 모든 상품에 무료 길이 있어요'; }
    if (tab === 'pass') { body = this.passRows(); note = `${SEASON.name} · ${SEASON.from.slice(5).replace('-', '/')} ~ ${SEASON.to.slice(5).replace('-', '/')} · 베이글을 팔면 별이 쌓여요`; }
    const md = this.modal(`<h3>🛍 마루미 상점</h3><div class="tabs">${tabs.map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-t="${k}">${n}</button>`).join('')}</div><div class="uplist">${body}</div><p class="sm">${note}</p><button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close();
    md.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { this._stab = b.dataset.t; this.shop(); });
    md.querySelectorAll('[data-it]').forEach(b => b.onclick = () => { const it = SHOP_ITEMS.find(x => x.id === b.dataset.it), c = this.itemCost(it); if (b.classList.contains('off') || S.coins < c) return; S.coins -= c;
      if (it.fx) S.fx[it.fx] = Date.now() + it.sec * 1000; if (it.id === 'batch') g.ovenBatch(10); save(); sfx('upgrade'); this.toast(`${it.icon} ${it.name}!`); this.progress(); this.shop(); });
    const gb = $('#shGift'); if (gb) gb.onclick = () => { if (!this.giftReady()) return; const v = this.giftCoins(); S.gift = today(); S.coins += v; S.earned += v; save(true); sfx('levelup'); this.toast(`오늘의 선물 +${fmt(v)}`); this.progress(); this.shop(); };
    const ab = $('#shAd'); if (ab) ab.onclick = async () => { if (ab.classList.contains('off')) return; const ok = await this.ad('coins'); if (ok) { this.progress(); } };
    this.bindGold(md); this.bindPass(md); }
  missions() {
    S.missSeen = [...new Set([...(S.missSeen || []).filter(x => x.startsWith(S.day)), ...MISSIONS.filter(m => (S.miss[m.id] || 0) >= m.goal).map(m => S.day + m.id)])]; save(); setTimeout(() => this.progress(), 0);   /* 본 미션 → 빨간 점 끔 */
    const html = MISSIONS.map(m => { const v = Math.min(m.goal, S.miss[m.id] || 0), d = S.missDone[m.id], ok = v >= m.goal; return `<div class="ms ${d ? 'done' : ''}"><div><b>${m.name}</b><div class="pb"><s style="width:${v / m.goal * 100}%"></s></div><em>${fmt(v)} / ${fmt(m.goal)}</em></div><button class="btn sm ${ok && !d ? '' : 'off'}" data-m="${m.id}">${d ? '완료' : `<i class="c"></i>${fmt(m.coins * mult())}`}</button></div>`; }).join('');
    const m = this.modal(`<h3>📋 오늘의 미션</h3>${html}<button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close();
    m.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const v = claimMission(b.dataset.m); if (v) { sfx('levelup'); this.toast(`+${fmt(v)}`); this.progress(); this.missions(); } });
  }
  // ── 업그레이드 (이 지점): 설비 · 직원(크루룸이 열리기 전) · 사장님(사장실이 열리기 전) — 방이 열리면 그 방에 가서 올림
  decoCost(d) { return Math.round(d.cost * BRANCHES[S.bi].mult / 10) * 10; }
  cheapDeco() { const own = S.deco[S.bi] || []; return DECO.some(d => !d.gift && !own.includes(d.id) && S.coins >= this.decoCost(d)); }
  decoShop() {
    const own = S.deco[S.bi] || [], g = this.app.game, sc = g.scent(), tab = this._dtab || 'deco';
    /* 소품: 안 산 것 = 누르면 놓일 자리를 반투명으로 미리 보고(#13) 그 자리에서 사기 · 산 것 = 옮기기(#14) · 꽃병은 테이블마다라 바로 사기 */
    const list = DECO.filter(d => !d.gift || own.includes(d.id)).map(d => { const has = own.includes(d.id), c = this.decoCost(d), mv = !!d.pos;
      const btn = has ? '<button class="btn sm off">놓음</button>' : `<button class="btn sm ${S.coins < c ? 'off' : ''}" data-d="${d.id}"><i class="c"></i>${fmt(c)}</button>`;
      return `<div class="upr ${has ? 'own' : ''}"><i>${d.icon}</i><div><b>${d.name} <em>향 +${d.score}</em></b><span>${d.desc}</span></div>${btn}</div>`; }).join('');
    /* 직원: 유니폼 · 모든 지점 공통 · 한 번 사면 언제든 바꿔 입힘 · 프리미엄 3종 = 🪙 또는 광고 3편 (날 넘겨도 쌓임) */
    const sw = o => o.id === 'basic' ? 'conic-gradient(#5A8AE0 0 25%, #7A4A2A 0 50%, #E2A020 0 75%, #6AB07A 0)' : `linear-gradient(135deg, ${hex(o.body)} 0 55%, ${hex(o.apronC)} 55%)`;
    const outfits = OUTFITS.map(o => { const hv = S.outfits.includes(o.id), on = S.outfit === o.id;
      return `<div class="upr ${on ? 'cur' : ''}"><i class="sw2" style="background:${sw(o)}"></i><div><b>${o.name}</b><span>${o.desc}</span></div><button class="btn sm ${on ? 'off' : !hv && S.coins < o.cost ? 'off' : ''}" data-of="${o.id}">${on ? '입는 중' : hv ? '입히기' : `<i class="c"></i>${fmt(o.cost)}`}</button></div>`; }).join('')
      + OUTFITS_PRO.map(o => { const hv = S.outfits.includes(o.id) || has(o.id), on = S.outfit === o.id, ad = S.outfitAd.id === o.id ? S.outfitAd.n : 0, g = this.goldOf(o.id), adOk = this.slotOk('outfit_ad');
        return `<div class="upr pro ${on ? 'cur' : ''}"><i class="sw2" style="background:${sw(o)}"></i><div><b>${o.icon} ${o.name}</b><span>${o.desc} · 프리미엄${hv ? '' : ` · 📺 ${ad}/3`}</span></div>${hv ? `<button class="btn sm ${on ? 'off' : ''}" data-of="${o.id}">${on ? '입는 중' : '입히기'}</button>` : `<div class="bcol">${adOk ? `<button class="btn sm ad" data-oa="${o.id}">📺 ${3 - ad}번 더</button>` : ''}${g ? `<button class="btn sm gold" data-og="${o.id}">🪙${g}</button>` : ''}</div>`}</div>`; }).join('');
    /* 테마 세트 (지점 바닥 · 벽 · 조명 · 능력치 0) — 단골 ♥5 마다 하나 무료 · 시즌 패스 · 🪙300 */
    const tOwn = t => has(t.id) || THEME_SETS.indexOf(t) < (S.setsFree || 0), cur = S.theme[S.bi] || '';
    const themes = `<div class="upr ${!cur ? 'cur' : ''}"><i>🏠</i><div><b>${BRANCHES[S.bi].interior.name} (기본)</b><span>${BRANCHES[S.bi].interior.note}</span></div><button class="btn sm ${!cur ? 'off' : ''}" data-th="">${!cur ? '쓰는 중' : '되돌리기'}</button></div>` + THEME_SETS.map(t => { const own = tOwn(t), on = cur === t.id, g = this.goldOf(t.id);
      return `<div class="upr ${on ? 'cur' : ''}"><i class="sw2" style="background:linear-gradient(135deg,${t.floor[0]} 0 50%,${hex(t.trim)} 50%)"></i><div><b>${t.icon} ${t.name}</b><span>${own ? '바닥 · 벽 · 장식이 바뀌어요 · 능력치 없음' : '단골 ♥5 · 시즌 패스로도 받아요'}</span></div>${own ? `<button class="btn sm ${on ? 'off' : ''}" data-th="${t.id}">${on ? '쓰는 중' : '바꾸기'}</button>` : g ? `<button class="btn sm gold" data-tg="${t.id}">🪙${g}</button>` : '<button class="btn sm off">🔒</button>'}</div>`; }).join('');
    const md = this.modal(`<h3>🪴 ${BRANCHES[S.bi].name} 꾸미기</h3><div class="tabs"><button class="${tab === 'deco' ? 'on' : ''}" data-t="deco">가게 소품</button><button class="${tab === 'staff' ? 'on' : ''}" data-t="staff">직원 꾸미기</button><button class="${tab === 'theme' ? 'on' : ''}" data-t="theme">테마</button></div>
      ${tab === 'deco' ? `<div class="scentbar">🌿 베이글 향 <b>${sc}</b><span>손님 +${Math.round(sc / 3)}% · 팁 확률 +${(sc / 20).toFixed(1)}%</span></div><div class="uplist">${list}</div><p class="sm">소품은 손님 길 · 일하는 길 밖 정해진 자리에 놓여요 · 단골이 선물로 주기도 해요</p>` : tab === 'staff' ? `<div class="uplist">${outfits}</div><p class="sm">유니폼은 모든 지점 직원이 같이 입어요 · 사장님은 늘 셰프 모자 · 능력치는 같아요</p>` : `<div class="uplist">${themes}</div><p class="sm">테마는 이 지점에만 · 겉모습만 바뀌어요</p>`}<button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close();
    md.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { this._dtab = b.dataset.t; this.decoShop(); });
    md.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const d = DECO.find(x => x.id === b.dataset.d), c = this.decoCost(d); if ((S.deco[S.bi] || []).includes(d.id) || S.coins < c) return; S.coins -= c; this.app.game.addDeco(d.id); sfx('upgrade'); this.toast(`${d.name} 놓았어요 · 향 +${d.score}`); this.progress(); this.decoShop(); });
    const wear = o => { if (!S.outfits.includes(o.id)) S.outfits.push(o.id); S.outfit = o.id; save(); this.app.game.restaff(); this.toast(`직원들이 「${o.name}」을 입었어요`); this.progress(); this.decoShop(); };
    md.querySelectorAll('[data-of]').forEach(b => b.onclick = () => { const o = OUTFITS.find(x => x.id === b.dataset.of) || OUTFITS_PRO.find(x => x.id === b.dataset.of); if (S.outfit === o.id) return; if (!S.outfits.includes(o.id) && !has(o.id)) { if (!(o.cost >= 0) || S.coins < o.cost) return; S.coins -= o.cost; sfx('upgrade'); } wear(o); });
    md.querySelectorAll('[data-oa]').forEach(b => b.onclick = () => { const o = OUTFITS_PRO.find(x => x.id === b.dataset.oa); this.ad('outfit', () => { if (S.outfitAd.id !== o.id) S.outfitAd = { id: o.id, n: 0 }; S.outfitAd.n++; if (S.outfitAd.n >= 3) { S.outfitAd = { id: '', n: 0 }; this.toast(`🎉 ${o.name} 열림!`); wear(o); } else { this.toast(`📺 ${S.outfitAd.n}/3 · 내일도 이어서 쌓여요`); this.decoShop(); } }, 'outfit_ad', `${o.name} (광고 3편이면 열려요)`); });
    md.querySelectorAll('[data-og]').forEach(b => b.onclick = () => { const o = OUTFITS_PRO.find(x => x.id === b.dataset.og); this.gold(o.id, () => wear(o), o.id); });
    md.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { const id = b.dataset.th; if ((S.theme[S.bi] || '') === id) return; S.theme[S.bi] = id || null; save(true); this.app.game.redraw(); this.toast(id ? `${THEME_SETS.find(t => t.id === id).name} 테마로 바꿨어요` : '기본 인테리어로 되돌렸어요'); this.decoShop(); });
    md.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => { const t = THEME_SETS.find(x => x.id === b.dataset.tg); this.gold(t.id, () => { S.theme[S.bi] = t.id; this.app.game.redraw(); this.toast(`${t.name} 테마!`); this.decoShop(); }, t.id); });
  }
  // ── 꾸미기 자리 고르기: 창을 닫고 바닥에 반투명 그림자 · 아래 막대에서 정하기/그만두기 · 뒤로 = 꾸미기 창으로 (바로 전 단계)
  regulars() {
    const opened = this.app.game.br.own.length;
    const html = REGULARS.map(R0 => { const r = S.reg[R0.id] || { f: 0, lv: 0 }, lv = favLv(r.f), met = r.f > 0 || r.day, next = FAVOR[lv];
      const fav = { bagel: '플레인 베이글', cream: '그날의 특별 베이글', coffee: '크림치즈 컵', drink: '아메리카노' }[R0.fav];
      return `<div class="reg ${met ? '' : 'lock'}"><i class="av" style="background:#${R0.body.toString(16).padStart(6, '0')}">${met ? R0.name[0] : '?'}</i><div><b>${met ? R0.name : '아직 모르는 손님'} <small>${met ? R0.who : R0.need > opened ? '가게를 더 키우면 찾아와요' : '곧 찾아와요'}</small></b>
        <div class="hearts">${'<s class="on">♥</s>'.repeat(lv)}${'<s>♥</s>'.repeat(5 - lv)}${next ? `<span>다음 ♥까지 ${next - r.f}</span>` : '<span>최고 단골!</span>'}</div>
        ${met ? `<span class="fav">좋아하는 것: ${fav}</span>${R0.story.slice(0, lv).map(t => `<p>“${t}”</p>`).join('')}${lv < 5 ? `<p class="lk">♥${lv + 1}에서 다음 이야기${lv + 1 === 2 || lv + 1 === 4 ? ' · 🎁 꾸미기 선물' : ''}</p>` : ''}` : ''}</div></div>`; }).join('');
    for (const r of Object.values(S.reg)) r.seen = r.lv || 0; save(); this.progress();
    const m = this.modal(`<h3>💌 단골손님</h3><div class="uplist">${html}</div><p class="sm">단골은 하루 한 번 찾아와요 · 빨리 내주면 호감 +2</p><button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close();
  }
  regLevel(R0, lv, gift, coins) {
    document.querySelectorAll('.regcard').forEach(e => e.remove());   /* 단골 칩은 한 번에 하나 */
    const d = document.createElement('div'); d.className = 'regcard'; d.title = R0.story[lv - 1]; d.innerHTML = `<i class="av" style="background:#${R0.body.toString(16).padStart(6, '0')}">${R0.name[0]}</i><div><b>${R0.name} ${'♥'.repeat(lv)}</b><p>“${R0.story[lv - 1]}”</p><span>${gift ? `🎁 선물: ${gift}` : `💰 +${fmt(coins)}`}</span></div>`;
    document.body.append(d); d.onclick = () => d.remove(); setTimeout(() => d.classList.add('on'), 30); setTimeout(() => { d.classList.remove('on'); setTimeout(() => d.remove(), 400); }, 4500); this.progress();
  }
  // ── 메뉴 숙련
  menuBook() {
    const g = this.app.game, ks = g.menuKinds();
    const html = ks.map(k => { const nm = MENU[k].name, n = S.mast[nm] || 0, st = starOf(nm), nx = MASTERY[st], base = MASTERY[st - 1];
      return `<div class="upr"><i>${MENU[k].icon || ICON[k]}</i><div><b>${nm} <em class="stars">${'★'.repeat(st)}<i>${'★'.repeat(5 - st)}</i></em></b><span>${fmt(n)}개 판매 · 값 +${Math.round((st - 1) * MASTERY_K * 100)}%</span>${nx ? `<div class="pb"><s style="width:${(n - base) / (nx - base) * 100}%"></s></div><span>★${st + 1}까지 ${fmt(nx - n)}개</span>` : '<span>대표 메뉴!</span>'}</div></div>`; }).join('');
    const m = this.modal(`<h3>📖 메뉴 숙련</h3><div class="uplist">${html}</div><p class="sm">많이 팔수록 별이 오르고 값도 올라요 · 지점이 바뀌면 그 지점 메뉴</p><button class="btn ghost" id="mOk">닫기</button>`); $('#mOk').onclick = () => this.close();
  }
  // ── 지난 지점: 직원들이 계속 장사 → 지점 지도에서 받기 (떠난 지점 · 다 연 지점) · 쉬는 동안 수익 영구 단계(광고 3편 = 1단계 · 🪙60)
  finished(i) { const br = S.branch[i]; return !!br && i !== S.bi && (i < (S.maxBi || 0) || !!br.done); }
  idleOf(i) { if (!this.finished(i)) return 0; const br = S.branch[i], t = Math.min(this.idleCapH() * 3600, (Date.now() - (br.idleAt || Date.now())) / 1000); return Math.floor(t * this.idleRate(i)); }
  idleTotal() { let t = 0; for (let i = 0; i < BRANCHES.length; i++) t += this.idleOf(i); return t; }
  nextBranch(i) { S.maxBi = Math.max(S.maxBi || 0, i); save(true); sfx('levelup'); this.modal(`<h3>✍ ${BRANCHES[i].name} 계약!</h3><p class="fund">🏦 개업 자금 <b>+${fmt(S.branch[i]?.fund || 0)}</b></p><p>${BRANCHES[i - 1].name}${josa(BRANCHES[i - 1].name, '은/는').slice(BRANCHES[i - 1].name.length)} 직원들이 계속 장사해요.<br><b>${BRANCHES[i].name}</b>${josa(BRANCHES[i].name, '이/가').slice(BRANCHES[i].name.length)} 문을 열어요.</p><p class="sm">${BRANCHES[i].interior.name} · ${BRANCHES[i].interior.note}</p><button class="btn" id="mOk">새 지점으로</button>`); $('#mOk').onclick = () => { this.close(); this.app.goBranch(i); }; }
  /* 쉬는 동안 번 돈: 창을 그냥 닫아도(바깥 · 뒤로) 1배는 받음 · 2배 광고를 그만두거나 못 보면 이 창으로 돌아옴 */
  offline(v) { let got = false; const take = () => { if (got) return; got = true; S.coins += v; save(); sfx('cash_get'); }, adOk = this.slotOk('offline2x'), g = this.goldOf('safe2x');
    this.modal(`<h3>☕ 쉬는 동안</h3><p>직원들이 돈을 벌어 놨어요! <b>+${fmt(v)}</b></p><div class="btns"><button class="btn ghost" id="o1">받기</button>${adOk ? `<button class="btn" id="o2">${vipOn() ? '👑' : '📺'} 2배 받기</button>` : g ? `<button class="btn gold" id="o3">🪙${g} 2배</button>` : ''}</div>`, take);
    $('#o1').onclick = () => this.close();
    const o2 = $('#o2'); if (o2) o2.onclick = async () => { if (this._adBusy) return; got = true; this.close();
      const ok = await this.ad('offline', () => { S.coins += v * 2; save(); this.toast(`+${fmt(v * 2)}`); }); if (!ok) this.offline(v); };
    const o3 = $('#o3'); if (o3) o3.onclick = async () => { if (this._adBusy) return; got = true; this.close(); const ok = await this.gold('safe2x', () => { S.coins += v * 2; this.toast(`+${fmt(v * 2)}`); }); if (!ok) this.offline(v); }; }
  settings() { const m = this.modal(`<h3>⚙ 설정</h3><div class="tg"><button data-k="sfx" class="${S.set.sfx ? 'on' : ''}">효과음</button><button data-k="bgm" class="${S.set.bgm ? 'on' : ''}">배경음</button></div><p class="sm">${GAME.title} v${GAME.ver} · ${BRAND.name} 공식 게임<br>“${BRAND.slogan}”<br>메뉴·매장·사진 ${BRAND.name} 제공</p><a class="btn ghost" href="${BRAND.insta}" target="_blank" rel="noopener">📷 인스타그램 보기</a>
      <div class="dev"><b>🧪 테스트 도구 (출시 전에만)</b>${[1, 2, 3].map(n => { const v = slotInfo(n); return `<div class="slot"><span>슬롯 ${n}<small>${v || '비어 있음'}</small></span><button class="btn sm" data-sv="${n}">저장</button><button class="btn sm ${v ? '' : 'off'}" data-ld="${n}">불러오기</button></div>`; }).join('')}
      <div class="btns"><button class="btn sm" id="dvMoney">돈 +10,000</button><button class="btn sm danger" id="dvReset">처음부터</button></div></div><button class="btn ghost" id="mOk">닫기</button>`);
    m.querySelectorAll('.tg button').forEach(b => b.onclick = () => { S.set[b.dataset.k] = !S.set[b.dataset.k]; setAudio(S.set); save(); b.classList.toggle('on'); }); $('#mOk').onclick = () => this.close();
    m.querySelectorAll('[data-sv]').forEach(b => b.onclick = () => { save(true); try { localStorage.setItem(SLOT + b.dataset.sv, JSON.stringify({ at: Date.now(), d: localStorage.getItem(KEY) })); } catch { /* */ } this.toast(`슬롯 ${b.dataset.sv}에 저장했어요`); this.settings(); });
    m.querySelectorAll('[data-ld]').forEach(b => b.onclick = () => { const v = JSON.parse(localStorage.getItem(SLOT + b.dataset.ld) || 'null'); if (!v) return; S.last = Date.now(); const d = JSON.parse(v.d || 'null'); const ver = d && d.v; if (ver === 3) localStorage.setItem(KEY, v.d); else { localStorage.removeItem(KEY); localStorage.setItem(ver === 1 ? 'marumi_v1' : 'marumi_v2', v.d); } window.__noSave = true; location.reload(); });   /* 슬롯의 저장 판(v1 · v2 · v3) 그대로 넣음 → 옛 판이면 열 때 옮김 */
    $('#dvMoney').onclick = () => { S.coins += 10000 * BRANCHES[S.bi].mult; save(); this.toast('돈 +' + fmt(10000 * BRANCHES[S.bi].mult)); };
    $('#dvReset').onclick = () => { if (!confirm('지금 진행이 모두 지워져요. 처음부터 할까요? (슬롯은 그대로)')) return; resetAll(); location.reload(); }; }
}
for (const k of Object.getOwnPropertyNames(Menu.prototype)) if (k !== 'constructor') Object.defineProperty(UI.prototype, k, Object.getOwnPropertyDescriptor(Menu.prototype, k));
const P = UI.prototype;
P.safe = function () { const v = Math.round(+S.safe.v || 0); if (v <= 0) return; let got = false; const take = (k = 1) => { if (got) return; got = true; S.safe.v = 0; S.coins += v * k; S.earned += v * k; save(true); sfx('cash_get'); this.progress(); this.deskRefresh(); };
  const adOk = this.slotOk('offline2x'), g = this.goldOf('safe2x');
  this.modal(`<h3>🔐 사장실 금고</h3><p>쉬는 동안 직원들이 번 돈이에요! <b>+${fmt(v)}</b></p><div class="btns"><button class="btn ghost" id="s1">받기</button>${adOk ? `<button class="btn" id="s2">${vipOn() ? '👑' : '📺'} 2배 받기</button>` : g ? `<button class="btn gold" id="s3">🪙${g} 2배</button>` : ''}</div><p class="sm">최대 ${this.idleCapH()}시간 쌓여요${vipOn() ? ' · VIP' : ` · VIP 는 ${VIP.idleH}시간`}</p>`, () => take(1));
  $('#s1').onclick = () => this.close();
  const s2 = $('#s2'); if (s2) s2.onclick = async () => { if (this._adBusy) return; got = true; this.close(); got = false; const ok = await this.ad('offline', () => { take(2); this.toast(`금고 ×2 +${fmt(v * 2)}`); }); if (!ok && !got) this.safe(); };
  const s3 = $('#s3'); if (s3) s3.onclick = async () => { if (this._adBusy) return; got = true; this.close(); got = false; const ok = await this.gold('safe2x', () => { take(2); this.toast(`금고 ×2 +${fmt(v * 2)}`); }); if (!ok && !got) this.safe(); }; };
P.buildModal = function () { const g = this.app.game, bd = Object.entries(S.branch[S.bi]?.build || {}).sort((a, b) => a[1] - b[1]); if (!bd.length) return;
  const rows = bd.map(([id]) => { const l = Math.max(0, (S.branch[S.bi].build[id] - Date.now()) / 1000), nm = g.pads.label({ id, kind: id === g.sp.feat ? 'feat' : 'node' }), gp = l >= 10 ? instGold(l) : 0, gok = gp && this.goldOf('inst' + gp);
    return `<div class="upr"><i>🔨</i><div><b>${nm}</b><span>${l < 10 ? '곧 끝나요!' : `남은 시간 ${hms(l)}`}</span></div><div class="bcol">${l >= 10 && this.slotOk('build_now') ? `<button class="btn sm ad" data-ba="${id}">📺 즉시</button>` : ''}${l >= 10 && S.inst > 0 ? `<button class="btn sm" data-bt="${id}">⚡ 완성권</button>` : ''}${gok ? `<button class="btn sm gold" data-bg="${id}" data-g="${gp}">⚡ 🪙${gp}</button>` : ''}</div></div>`; }).join('');
  const m = this.modal(`<h3>🔨 공사 중</h3><div class="uplist">${rows}</div><p class="sm">공사 중에도 장사 · 다른 칸 열기는 그대로예요 · 즉시 완성권 ${S.inst || 0}장 · 기다리면 무료</p><button class="btn ghost" id="mOk">기다릴게요</button>`); $('#mOk').onclick = () => this.close();
  const now = id => { this.close(); S.branch[S.bi].build[id] = Date.now(); };
  m.querySelectorAll('[data-ba]').forEach(b => b.onclick = () => this.ad('build', () => now(b.dataset.ba), 'build_now', '공사 즉시 완성'));
  m.querySelectorAll('[data-bt]').forEach(b => b.onclick = () => { if (!(S.inst > 0)) return; S.inst--; save(true); now(b.dataset.bt); });
  m.querySelectorAll('[data-bg]').forEach(b => b.onclick = () => { const id = b.dataset.bg, gp = instGold(Math.max(0, (S.branch[S.bi].build[id] - Date.now()) / 1000)); if (gp !== +b.dataset.g) { this.buildModal(); return; } this.gold('inst' + gp, () => now(id)); }); };
P.branchDone = function (i) { const B = BRANCHES[i], last = i === 3; if (last && !S.manager) { S.manager = true; save(true); }
  sfx('levelup'); this.modal(`<div class="bigdone"><b>🏆</b><h3>${B.name} 완성!</h3><p>모든 방과 설비를 열었어요. 정말 멋진 가게예요!${last ? '<br><b>🎖 베테랑 점장</b>이 합류했어요 · 바닥 돈 자동 수거 · 쉬는 동안 +2시간' : i < 3 ? `<br>사장실 계약 책상에서 <b>${BRANCHES[i + 1].name}</b>을 열 수 있어요` : ''}</p></div>
    <div class="btns"><button class="btn ghost" id="dStore">📍 이 매장 가 보기</button><button class="btn ghost" id="dShare">📣 자랑하기</button></div><button class="btn" id="mOk">계속 장사</button>`); $('#mOk').onclick = () => this.close();
  $('#dStore').onclick = () => { track('bg_store', { b: i, at: 'done' }); try { window.open(STORE_MAP[i], '_blank', 'noopener'); } catch { /* */ } };
  $('#dShare').onclick = async () => { const t = `마루미 베이글 하우스 · ${B.name} 다 열었어요! 🥯 ${BRAND.slogan}`; track('bg_share', { k: 'branch', b: i }); try { if (navigator.share) await navigator.share({ text: t }); else { await navigator.clipboard.writeText(t); this.toast('자랑 문구를 복사했어요'); } } catch { /* */ } }; };
P.goldRows = function () { const row = (sku, icon, title, desc, free, btn) => { const p = this.goldOf(sku); if (!p && !btn) return ''; return `<div class="upr gold"><i>${icon}</i><div><b>${title}</b><span>${desc}</span><span class="free">무료 길: ${free}</span></div>${btn || `<button class="btn sm gold" data-gb="${sku}">🪙${p}</button>`}</div>`; };
  const vipLeft = Math.max(0, Math.ceil((S.vipUntil - Date.now()) / 864e5)), canVip = vipLeft + 7 <= VIP.maxDays;
  const starter = !has('starter') && Date.now() - (S.born || Date.now()) < GOLD.starter.days * 864e5;
  let h = '';
  if (starter) h += row('starter', '🎉', GOLD.starter.name + ' <em>처음 7일</em>', GOLD.starter.desc, GOLD.starter.free);
  h += row('vip7', '👑', GOLD.vip7.name + (vipLeft ? ` <em>남은 ${vipLeft}일</em>` : ''), `모든 지점 수익 ×${VIP.mult} (쉬는 동안 포함) · 쉬는 동안 ${VIP.idleH}시간 · 매일 VIP 상자 · 광고 없이 바로 · 자동 결제 없음`, GOLD.vip7.free, canVip ? null : '<button class="btn sm off">최대 28일</button>');
  h += row('vip30', '👑', GOLD.vip30.name, '위와 같음 · 30일 (겹쳐 사면 최대 28일까지만)', GOLD.vip30.free, vipLeft + 30 <= VIP.maxDays + 2 ? null : '<button class="btn sm off">최대 28일</button>');
  for (const k of ['cash10', 'cash60', 'cash240']) h += row(k, '💰', GOLD[k].name, `${BRANCHES[S.bi].name.split(' · ')[0]} ${GOLD[k].min >= 60 ? GOLD[k].min / 60 + '시간' : GOLD[k].min + '분'}치 돈 · +${fmt(this.perMin() * GOLD[k].min)}`, GOLD[k].free);
  const br = S.branch[S.bi] || {}; h += row('idle_up', '📈', `${GOLD.idle_up.name} · 이 지점`, `영구 · 지금 +${(br.idleUp || 0) * 10}% (최대 +50%)`, GOLD.idle_up.free, (br.idleUp || 0) >= IDLE.upMax ? '<button class="btn sm off">최고</button>' : null);
  if (!S.manager) h += row('manager', '🎖', GOLD.manager.name, '바닥 돈 자동 수거 · 쉬는 동안 +2시간 (모든 지점 · 영구)', GOLD.manager.free);
  for (const t of THEME_SETS) if (!has(t.id) && THEME_SETS.indexOf(t) >= (S.setsFree || 0)) h += row(t.id, t.icon, `테마 세트 · ${t.name}`, '지점 바닥 · 벽 · 장식 (능력치 0)', '단골 ♥5 · 시즌 무료 줄');
  for (const o of OUTFITS_PRO) if (!S.outfits.includes(o.id) && !has(o.id)) h += row(o.id, o.icon, `유니폼 · ${o.name}`, `${o.desc} (능력치 0)`, '광고 3편');
  if (!has('pass_s1')) h += row('pass_s1', '🎟', GOLD.pass_s1.name, `골드 줄 보상: 테마 세트 2 · 유니폼 2 · 즉시 완성권 · 돈 꾸러미 (${SEASON.to.slice(5).replace('-', '/')}까지)`, GOLD.pass_s1.free);
  return h || '<p class="sm">지금 살 수 있는 골드 상품이 없어요</p>'; };
P.bindGold = function (md) { md.querySelectorAll('[data-gb]').forEach(b => b.onclick = () => { const k = b.dataset.gb, g = this.app.game, done = () => { this.shop(); };
  const item = ['starter', 'manager', 'pass_s1', ...THEME_SETS.map(t => t.id), ...OUTFITS_PRO.map(o => o.id)].includes(k) ? k : null;
  this.gold(k, () => {
    if (k === 'starter') { const v = Math.round(this.perMin() * 60); S.coins += v; S.inst = (S.inst || 0) + 3; if (!S.outfits.includes('orange')) S.outfits.push('orange'); this.toast(`🎉 오픈 축하! +${fmt(v)} · 주황 유니폼 · 즉시 완성권 3장`); }
    if (k === 'vip7' || k === 'vip30') { const d = k === 'vip7' ? 7 : 30; S.vipUntil = Math.min(Math.max(S.vipUntil || 0, Date.now()) + d * 864e5, Date.now() + VIP.maxDays * 864e5); this.toast(`👑 마루미 VIP! ${Math.ceil((S.vipUntil - Date.now()) / 864e5)}일 남음`); }
    if (k.startsWith('cash')) { const v = Math.round(this.perMin() * GOLD[k].min); S.coins += v; S.earned += v; this.toast(`💰 +${fmt(v)}`); }
    if (k === 'idle_up') { const br = (S.branch[S.bi] ||= { own: [], paid: {}, build: {} }); br.idleUp = Math.min(IDLE.upMax, (br.idleUp || 0) + 1); this.toast(`📈 쉬는 동안 수익 +${br.idleUp * 10}% (영구)`); }
    if (k === 'manager') { S.manager = true; this.toast('🎖 베테랑 점장이 합류했어요!'); }
    if (THEME_SETS.some(t => t.id === k)) { S.theme[S.bi] = k; g.redraw(); this.toast('테마를 바꿨어요 · 꾸미기 › 테마에서 지점마다'); }
    if (OUTFITS_PRO.some(o => o.id === k)) { S.outfits.push(k); S.outfit = k; g.restaff(); this.toast('직원들이 새 유니폼을 입었어요'); }
    if (k === 'pass_s1') this.toast('🎟 시즌 패스 골드 줄이 열렸어요!');
    done(); }, item); }); };
P.passTier = function () { const xp = S.pass.id === SEASON.id ? S.pass.xp : 0; return SEASON.xp.filter(x => xp >= x).length; };
P.passReady = function () { const t = this.passTier(), P0 = S.pass.id === SEASON.id ? S.pass : { free: [], paid: [] }; let n = 0; for (let i = 0; i < t; i++) { if (!P0.free.includes(i)) n++; if (has('pass_s1') && !P0.paid.includes(i)) n++; } return n; };
P.passRows = function () { if (S.pass.id !== SEASON.id) S.pass = { id: SEASON.id, xp: 0, free: [], paid: [] }; const t = this.passTier(), own = has('pass_s1');
  return `<div class="passhd">★${t} · ${fmt(S.pass.xp)} / ${fmt(SEASON.xp[Math.min(t, SEASON.xp.length - 1)])}${t < SEASON.xp.length ? ` · 다음 ★까지 ${fmt(SEASON.xp[t] - S.pass.xp)}개` : ' · 최고!'}<small> · 돈 보상 오늘 ${S.pass.dayD === today() ? S.pass.dayMin || 0 : 0}/${PASS_DAY_MIN}분치</small></div>` + SEASON.xp.map((x, i) => { const ok = t > i, fG = S.pass.free.includes(i), pG = S.pass.paid.includes(i);
    return `<div class="prow ${ok ? 'ok' : ''}"><em>★${i + 1}</em><button class="pc ${ok && !fG ? 'can' : ''} ${fG ? 'got' : ''}" data-pf="${i}">${rwTxt(SEASON.free[i])}${fG ? ' ✓' : ''}</button><button class="pc gold ${own && ok && !pG ? 'can' : ''} ${pG ? 'got' : ''} ${own ? '' : 'lock'}" data-pp="${i}">${own ? '' : '🔒 '}${rwTxt(SEASON.paid[i])}${pG ? ' ✓' : ''}</button></div>`; }).join('')
    + (own ? '' : this.goldOf('pass_s1') ? `<button class="btn gold" data-gb="pass_s1" style="width:100%;margin-top:6px">🪙${this.goldOf('pass_s1')} 골드 줄 열기</button>` : ''); };
P.passLockNow = function () { return { v: Math.round(this.perMin()), cap: Math.round((this.app.game?.pads?.nextCost() || 100) * PASS_TIER_CAP), b: S.bi }; };
P.bindPass = function (md) { const give = (r, i) => { const g = this.app.game; if (r.coins) { S.pass.lock ||= {}; const L = S.pass.lock[i] ||= this.passLockNow(), v = Math.min(L.cap, Math.round(L.v * r.coins));   /* 별을 채운 때 값 (미뤄도 그대로) · 한 칸 상한 */ S.coins += v; S.earned += v; this.toast(`💰 +${fmt(v)}`); } if (r.inst) { S.inst = (S.inst || 0) + r.inst; this.toast(`⚡ 즉시 완성권 +${r.inst}`); } 
    if (r.set && !S.items.includes(r.set)) { S.items.push(r.set); this.toast(`🎨 ${THEME_SETS.find(t => t.id === r.set).name} 테마!`); } if (r.outfit && !S.outfits.includes(r.outfit)) { S.outfits.push(r.outfit); this.toast(`👕 ${OUTFITS_PRO.find(o => o.id === r.outfit).name}!`); } sfx('levelup'); };
  /* 하루 상한 (DESIGN 5-5): 돈 보상 합이 하루 PASS_DAY_MIN 분치를 넘으면 그 칸은 내일 — 받은 칸으로 치지 않음 (사라지지 않음) */
  const room = r => { if (!r.coins) return true; const d = today(); if (S.pass.dayD !== d) { S.pass.dayD = d; S.pass.dayMin = 0; } if (S.pass.dayMin + r.coins > PASS_DAY_MIN) { this.toast(`오늘 시즌 돈 보상(${PASS_DAY_MIN}분치)은 다 받았어요 · 내일 이어서 받아요`); return false; } S.pass.dayMin += r.coins; return true; };
  md.querySelectorAll('[data-pf]').forEach(b => b.onclick = () => { const i = +b.dataset.pf; if (this.passTier() <= i || S.pass.free.includes(i) || !room(SEASON.free[i])) return; S.pass.free.push(i); give(SEASON.free[i], i); save(true); this.shop(); });
  md.querySelectorAll('[data-pp]').forEach(b => b.onclick = () => { const i = +b.dataset.pp; if (!has('pass_s1')) { this.toast('골드 줄은 시즌 패스로 열려요'); return; } if (this.passTier() <= i || S.pass.paid.includes(i) || !room(SEASON.paid[i])) return; S.pass.paid.push(i); give(SEASON.paid[i], i); save(true); this.shop(); }); };

