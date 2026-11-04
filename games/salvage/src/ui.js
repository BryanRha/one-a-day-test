// 화면(DOM): 은신처(시설 · 무기 · 장비 · 창고 · 의뢰 탭) · 출격 준비 · 전투 HUD · 가방(끌어 놓기 · 회전) · 뒤지기 · 결과
import { ITEMS, MATS, MAT_KEYS, FACILITIES, FAC_KEYS, WEAPONS, WEAPON_KEYS, MODS, MOD_KEYS, GEAR, CRAFTS, MEALS, QUESTS, ENEMIES, ZONES, RAID, EXITS, DAILY_SORTIES, VERSION, CATS, MARKET, MAPS, MAP_KEYS, CONDS } from './data.js?v=0.99.8';
import { S, save, rollDay } from './save.js?v=0.99.8';
import * as E from './econ.js?v=0.99.8';
import { A } from './assets.js?v=0.99.8';
import { dims, fits, remove, bagValue, bagWeight, mkBag, mkItem, autoAdd } from './inv.js?v=0.99.8';
import { sfx, unlock, soundLabel, cycleSound } from './audio.js?v=0.99.8';
import { Wardrobe } from './wardrobe.js?v=0.99.8';
import { grantEarned, COS } from './look.js?v=0.99.8';
import * as BM from './bmflow.js?v=0.99.8';

const $ = (s, r = document) => r.querySelector(s);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const dur = s => s >= 3600 ? `${Math.round(s / 360) / 10}시간` : s >= 60 ? `${Math.round(s / 60)}분` : `${Math.max(0, Math.round(s))}초`;
const icon = (k, cls = '') => `<img class="ico ${cls}" src="${A.icons[k] || ''}" alt="${ITEMS[k]?.name || ''}" draggable="false">`;
const shell = n => `<span class="shell"></span>${n}`;
const mat = (k, n) => `<span class="mat" style="--c:${MATS[k].color}"></span>${n}`;
/* 비용 표시: 가진 만큼 / 필요한 만큼 */
function costChips(cost) {
  return Object.entries(cost || {}).map(([k, n]) => { const have = E.count(S, k); const ok = have >= n;
    const lab = k === 'shells' ? shell(n) : k in MATS ? `${mat(k, '')}${MATS[k].name} ${n}` : `${ITEMS[k].name} ${n}`;
    return `<span class="c ${ok ? 'ok' : 'no'}">${lab}${k !== 'shells' ? `<i>${have}</i>` : ''}</span>`; }).join('');
}
const pct = x => Math.round(x * 100) + '%';
const WHY = { cost: '재료가 모자라요', bench: '작업대 단계가 모자라요', rack: '무기대 단계가 모자라요', busy: '공사는 한 번에 하나씩', locked: '의뢰를 먼저 끝내요', fac: '시설이 필요해요', full: '창고가 가득', have: '이미 요리가 있어요', max: '최고 단계', owned: '이미 있어요' };

/* 판 상태 띠 — 판 안엔 한 구절 + 아이콘, 배율 · 자세한 설명은 출격 준비 ⓘ (v0.5.1 · 검수 Top 8) */
export const COND_UI = { storm: ['⛈', '소리가 묻혀요'], fog: ['🌫', '가까이 와야 보여요'], clear: ['🌙', '서로 멀리 보여요'], dark: ['🔦', '발전기를 찾아요'], rapids: ['🌊', '물살이 세요'], calm: ['💧', '산소만 조심'] };
/* 판 안 위쪽 한 줄 (v0.5.1 · 검수 Top 1): 보스 경고(3) > 무전(2~2.6) > 판 상태 · 사건(1) — 한 번에 하나만.
 *  더 높은 것이 오면 지금 것은 0.35초 뒤 비키고(덜 보였으면 뒤로 다시 줄 섬), 같거나 낮은 것은 최대 2초 기다린 뒤 지금 것을 줄임(최소 1.2초는 보임).
 *  칭찬은 줄에 안 서고 주인공 머리 위 (ui.praise) */
export class TopLine {
  constructor() { this.q = []; this.cur = null; this.log = []; }
  push(it) {
    it.prio ??= 1; it.age = 0;
    if (it.key && (this.cur?.key === it.key || this.q.some(x => x.key === it.key))) return;
    this.q.push(it); this.q.sort((a, b) => b.prio - a.prio);
  }
  done(it) { if (this.cur === it) { it.hide?.(); this.cur = null; } }
  tick(dt) {
    for (const x of this.q) x.age += dt;
    const c = this.cur, nx = this.q[0];
    if (c) {
      c.left -= dt; c.shown += dt;
      const up = nx && nx.prio > c.prio && c.shown > 0.35, waited = nx && !c.hold && nx.age >= 2 && c.shown >= 1.2;
      if (c.left <= 0 || up || waited) {
        c.hide?.(); this.cur = null; if (c.left <= 0) c.timeout?.();
        else if (up && c.shown < c.dur * 0.6) { c.dur = Math.max(1.6, c.left); c.age = 0; this.q.unshift(c); this.q.sort((a, b) => b.prio - a.prio); }
        else c.timeout?.();
      }
    }
    if (!this.cur && this.q.length) { const it = this.q.shift(); it.left = it.dur; it.shown = 0; this.cur = it; it.show(); this.log.push(it.key || ''); if (this.log.length > 40) this.log.shift(); }
  }
  clear() { this.cur?.hide?.(); this.cur = null; this.q = []; }
}

export class UI {
  constructor(app) {
    this.app = app; this.root = $('#ui'); this.hud = $('#hud'); this.invOpen = false; this.tab = 'fac'; this.wsel = null;
    this.veil = $('#veil'); this.vx = this.veil.getContext('2d'); this.carry = {}; this.safePick = [];
    setInterval(() => this.tickHideout(), 1000);
    this.wardrobe = new Wardrobe(app, this); this.top = new TopLine();
  }
  clear() { this.root.innerHTML = ''; this.invOpen = false; this.loot = null; this.el = null; this.top?.clear(); }
  toastWhy(r) { if (!r.ok) { this.toast(WHY[r.why] || '지금은 안 돼요', 'soft'); sfx.empty(); } }

  /* ───────── 은신처 ───────── */
  hideout() {
    if (this.wardrobe.on) { this.wardrobe.commit(); this.wardrobe.close(); }
    rollDay(); E.tickBuild(S); E.syncDaily(S); const qt = E.questTick(S);
    const got = grantEarned(S); save(); if (qt.length) setTimeout(() => this.questDone(qt), 250);
    this.clear(); const app = this.app; this.root.className = 'scr-hideout';
    const pips = Array.from({ length: DAILY_SORTIES }, (_, i) => `<i class="${i < S.sorties ? 'on' : ''}"></i>`).join('');
    const q = E.questNow(S); const qp = E.questProgress(S);
    const el = h('div', 'hideout', `
      <header class="topbar"><div class="brand"><b>수달 인양단</b><small>은신처 · 물 위 창고</small></div>
        <div class="money">${shell(S.shells)}</div></header>
      <div class="matbar">${MAT_KEYS.map(k => `<span>${mat(k, S.mats[k] || 0)}</span>`).join('')}</div>
      <div class="sortie"><span>오늘 출격</span><span class="pips">${pips}</span><b>${S.sorties}/${DAILY_SORTIES}</b>
        ${BM.sortieHtml()}${q ? `<button class="qpill" id="qpill">의뢰 · ${q.name}${qp && qp.n > 1 ? ` ${qp.cur}/${qp.n}` : ''}</button>` : '<span class="qpill done">의뢰 모두 완료!</span>'}</div>
      <div class="spacer"><button class="wardpill" id="ward">옷장 · 무기대${(S.owned || []).some(k => !(S.lookSeen || []).includes(k)) ? '<i class="dot"></i>' : ''}</button></div>
      <section class="panel">
        <nav class="tabs">${[['fac', '시설'], ['gun', '무기'], ['gear', '장비'], ['stash', '창고'], ['quest', '의뢰']].map(([k, t]) => `<button data-t="${k}" class="${this.tab === k ? 'on' : ''}">${t}${k === 'stash' && E.syncDaily(S).some((o, i) => !S.daily.done[i] && E.count(S, o.item) >= o.n) ? '<i class="dot"></i>' : ''}${k === 'quest' && q?.goal.t === 'deliver' && qp.cur >= qp.n ? '<i class="dot"></i>' : ''}</button>`).join('')}</nav>
        <div class="tabbody" id="tabbody"></div>
      </section>
      <button class="btn cta" id="go">출격 준비</button>
      <footer class="foot"><button class="lnk" id="snd">${soundLabel()}</button><span>v${VERSION} 시제품</span><button class="lnk" id="how">조작법</button></footer>`);
    this.root.appendChild(el); this.el = null;
    el.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { sfx.ui(); this.tab = b.dataset.t; this.hideout(); });
    $('#qpill', el) && ($('#qpill', el).onclick = () => { this.tab = 'quest'; this.hideout(); });
    $('#go', el).onclick = () => { unlock(); sfx.ui(); this.prep(); };
    BM.bindSortie(el, () => this.hideout()); BM.refreshHello().then(ch => { if (ch) this.refresh(); });
    $('#snd', el).onclick = () => { cycleSound(); this.hideout(); };
    $('#how', el).onclick = () => this.howto();
    app.story?.decorate(el);
    $('#ward', el).onclick = () => { unlock(); sfx.ui(); this.wardrobe.open(this.tab === 'gun' ? 'weapon' : null); };
    for (const k of got) setTimeout(() => this.toast(`새 꾸미기: ${COS[k].name} — 옷장에서 입어 봐요`, 'good'), 300);
    app.lookChanged?.();
    const body = $('#tabbody', el); this[{ fac: 'tabFac', gun: 'tabGun', gear: 'tabGear', stash: 'tabStash', quest: 'tabQuest' }[this.tab]](body);
    if (this._scroll?.[this.tab]) body.scrollTop = this._scroll[this.tab]; body.onscroll = () => { (this._scroll ||= {})[this.tab] = body.scrollTop; };
    app.showHideout(true);
    if (S.firstRun && !app.story?.on) { S.firstRun = false; save(); setTimeout(() => { if (this.root.className === 'scr-hideout' && !this.root.querySelector('.modal')) this.howto(); }, 400); }
    app.story?.onHideout();
    if (S.migrated === 1) { S.migrated = 2; save(); this.toast('v0.2 업데이트: 시설이 새로 바뀌어 v0.1 때 쓴 조개를 돌려드렸어요', 'good'); }
  }
  refresh() { if (this.root.className === 'scr-hideout') this.hideout(); }
  tickHideout() {
    if (this.root.className !== 'scr-hideout') return;
    const done = E.tickBuild(S); if (done) { save(); sfx.build(); this.toast(`${FACILITIES[done].name} Lv.${S.fac[done]} 완성!`, 'good'); this.hideout(); return; }
    const t = $('#buildt'); if (t && S.build) t.textContent = fmt(Math.max(0, (S.build.until - Date.now()) / 1000));
  }
  /* 시설 탭 */
  tabFac(body) {
    body.innerHTML = FAC_KEYS.map(k => {
      const F = FACILITIES[k], lv = E.facLvl(S, k), cur = E.facCur(S, k), nx = E.facNext(S, k), un = E.facUnlocked(S, k);
      const building = S.build?.k === k;
      const q = F.unlock && QUESTS.find(q => q.id === F.unlock);
      let act = '';
      if (!un) act = `<div class="lock">의뢰 '${q.name}'<br>끝내면 열려요</div>`;
      else if (building) act = `<div class="busy"><b id="buildt">${fmt(Math.max(0, (S.build.until - Date.now()) / 1000))}</b><small>공사 중</small><div class="instbox"></div></div>`;
      else if (nx) { const lp = E.lackPrice(S, nx.cost); const can = E.canPay(S, nx.cost);
        act = `<button class="fb ${S.build ? 'dim' : can ? '' : lp.ok ? 'buy' : 'dim'}" data-k="${k}">${lv ? '올리기' : '짓기'}<small>${dur(nx.time || 0)}</small>${!can && lp.ok ? `<small class="bp">재료 사서 +${lp.price}</small>` : ''}</button>`; }
      else act = '<div class="max">최고 단계</div>';
      return `<div class="frow ${un ? '' : 'locked'} ${building ? 'building' : ''}">
        <div class="fi">${F.icon}</div>
        <div class="fm"><div class="fh"><b>${F.name}</b><span class="lv">${lv ? 'Lv.' + lv : '없음'} / ${F.levels.length}</span></div>
          <small>${cur ? cur.txt : F.desc}</small>
          ${nx && un ? `<small class="next">다음: ${nx.txt}</small><div class="cost">${costChips(nx.cost)}</div>` : ''}</div>
        ${act}</div>`;
    }).join('') + (S.build ? '' : '<small class="hint">공사는 한 번에 하나 · 시간이 지나면 저절로 끝나요 (게임을 꺼 둬도)</small>');
    body.querySelectorAll('.fb').forEach(b => b.onclick = () => {
      unlock(); const k = b.dataset.k; const nx = E.facNext(S, k);
      if (!E.canPay(S, nx.cost)) { const lp = E.lackPrice(S, nx.cost); if (lp.ok) E.buyLack(S, nx.cost); }
      const r = E.startBuild(S, k); if (!r.ok) return this.toastWhy(r);
      save(); sfx.build(); this.toast(r.done ? `${FACILITIES[k].name} 완성!` : `${FACILITIES[k].name} 공사 시작 — ${dur(nx.time)} 뒤 완성`, 'good'); this.hideout();
    });
    BM.bindInst(body);
  }
  /* 무기 탭: 고른 무기 숫자 · 처치 시간 · 퍼짐 그림 · 개조 전후 */
  tabGun(body) {
    const wk = this.wsel || (this.wsel = S.equip.main); const W = WEAPONS[wk]; const own = S.weapons[wk]; const ws = E.weaponStats(wk, own || undefined);
    const rack = E.facCur(S, 'rack'); const mk = E.rackMk(S);
    const killT = st => [['drone', 2, 10], ['skel', 2, 4.5], ['boss', 3, 8]].map(([k, z, d]) => { const hp = k === 'boss' ? ENEMIES.boss.hp : ENEMIES[k].hp * ZONES[z].hp; const r = E.ttk(st, hp, d); return { k, t: r.t, hit: r.hit }; });
    const kt = killT(ws); const acc = E.ttk(ws, 400, 10).hit;
    const cone = (sp, mx) => { const L = 92, a1 = sp, a2 = mx; const p = a => `${(L * Math.sin(a)).toFixed(1)},${(-L * Math.cos(a)).toFixed(1)}`;
      return `<svg viewBox="-60 -100 120 104" class="cone"><path d="M0,0 L${p(-a2)} A${L},${L} 0 0 1 ${p(a2)} Z" class="c2"/><path d="M0,0 L${p(-a1)} A${L},${L} 0 0 1 ${p(a1)} Z" class="c1"/><circle cx="0" cy="${-L * 0.86}" r="${(0.62 / 7 * L).toFixed(1)}" class="tg"/><circle cx="0" cy="0" r="4" class="me"/></svg>`; };
    const sides = rack?.side; const isMain = S.equip.main === wk, isSide = S.equip.side === wk;
    body.innerHTML = `
      <div class="wsel">${WEAPON_KEYS.map(k => `<button data-w="${k}" class="${k === wk ? 'on' : ''} ${S.weapons[k] ? '' : 'no'}" style="--c:${WEAPONS[k].color}"><b>${WEAPONS[k].short}</b><small>${S.equip.main === k ? '주무기' : S.equip.side === k ? '보조' : S.weapons[k] ? '보유' : '제작'}</small></button>`).join('')}</div>
      <div class="wcard">
        <div class="fh"><b>${W.name}</b><span class="lv">${own ? `개조 ${MOD_KEYS.reduce((s, m) => s + own[m], 0)}/12` : '아직 없음'}</span></div>
        <small class="hint">${W.desc}</small>
        <div class="wgrid">
          ${cone(ws.spread, ws.max)}
          <div class="wstats">
            <div><span>파워</span><b>${Math.round(ws.dmg)}${ws.pellets > 1 ? '×' + ws.pellets : ''}</b></div>
            <div><span>정확도(10m 연사)</span><b>${pct(acc)}</b></div>
            <div><span>약점</span><b>${pct(ws.crit)}</b></div>
            <div><span>사거리</span><b>${ws.range.toFixed(1)}m</b></div>
            <div><span>장탄</span><b>${ws.mag}발 · ${ws.reload.toFixed(1)}초</b></div>
            <div><span>연사</span><b>${ws.rate}/초</b></div>
          </div></div>
        <div class="ttk">${kt.map(x => `<span><small>${ENEMIES[x.k].name} ${x.k === 'drone' ? '10m' : x.k === 'skel' ? '근접' : ''}</small><b>${isFinite(x.t) ? x.t.toFixed(1) + '초' : '닿지 않음'}</b></span>`).join('')}</div>
        <small class="hint">처치 시간 = 이 숫자로 계속 쏠 때 (퍼짐 · 장전 포함) · 바깥 부채꼴 = 연사로 벌어진 퍼짐</small>
        ${own ? `<div class="wbtns"><button class="btn sm ${isMain ? 'on' : ''}" id="eqMain">${isMain ? '주무기 ✓' : '주무기로'}</button>${sides ? `<button class="btn sm ${isSide ? 'on' : ''}" id="eqSide">${isSide ? '보조 ✓ (빼기)' : '보조 무기로'}</button>` : '<small class="hint">무기대 Lv.2 에서 보조 무기 칸</small>'}</div>`
        : `<div class="craft"><div class="cost">${costChips(W.cost)}</div><button class="btn ${E.facLvl(S, 'bench') >= W.bench ? '' : 'dim'}" id="mkW">${E.facLvl(S, 'bench') >= W.bench ? '제작' : `작업대 Lv.${W.bench} 필요`}</button></div>`}
      </div>
      ${own ? `<div class="mods">${MOD_KEYS.map(m => { const M = MODS[m]; const cur = own[m]; const nx = cur + 1; const c = nx <= 3 ? E.modCost(wk, m, nx) : null;
        let prev = ''; if (c) { const after = E.weaponStats(wk, { ...own, [m]: nx }); const ka = killT(after); const aa = E.ttk(after, 400, 10).hit;
          prev = m === 'scope' ? `정확도 ${pct(acc)} → <b>${pct(aa)}</b> · 드론 ${kt[0].t.toFixed(1)} → <b>${ka[0].t.toFixed(1)}초</b>`
            : m === 'chamber' ? `파워 ${Math.round(ws.dmg)} → <b>${Math.round(after.dmg)}</b> · 해골 ${kt[1].t.toFixed(1)} → <b>${ka[1].t.toFixed(1)}초</b>`
            : m === 'mag' ? `장탄 ${ws.mag} → <b>${after.mag}</b> · 수문지기 ${kt[2].t.toFixed(1)} → <b>${ka[2].t.toFixed(1)}초</b>`
            : `사거리 ${ws.range.toFixed(1)} → <b>${after.range.toFixed(1)}m</b>`; }
        return `<div class="mrow"><div class="mh"><b>${M.name}</b><small>${M.stat}</small><span class="pips2">${[1, 2, 3].map(i => `<i class="${i <= cur ? 'on' : ''}"></i>`).join('')}</span></div>
          <small>${M.fx[cur]}</small>
          ${c ? `<small class="prev">${prev}</small><div class="mfoot"><div class="cost">${costChips(c)}</div><button class="btn sm ${mk >= nx ? '' : 'dim'}" data-m="${m}">${mk >= nx ? `Mk${nx} 개조` : mk ? `무기대 Lv.${nx}` : '무기대 필요'}</button></div>` : '<small class="max">최고 단계</small>'}</div>`; }).join('')}</div>` : ''}`;
    body.querySelectorAll('.wsel button').forEach(b => b.onclick = () => { sfx.ui(); this.wsel = b.dataset.w; this.hideout(); });
    $('#mkW', body) && ($('#mkW', body).onclick = () => { const r = E.craftWeapon(S, wk); if (!r.ok && r.why === 'cost' && E.lackPrice(S, W.cost).ok) { E.buyLack(S, W.cost); return $('#mkW', body).onclick(); } if (!r.ok) return this.toastWhy(r); save(); sfx.build(); this.toast(`${W.name} 완성!`, 'good'); this.hideout(); });
    $('#eqMain', body) && ($('#eqMain', body).onclick = () => { if (S.equip.side === wk) S.equip.side = null; S.equip.main = wk; save(); sfx.ui(); this.hideout(); });
    $('#eqSide', body) && ($('#eqSide', body).onclick = () => { if (isSide) S.equip.side = null; else { if (S.equip.main === wk) return this.toast('주무기는 보조로 못 해요', 'soft'); S.equip.side = wk; } save(); sfx.ui(); this.hideout(); });
    body.querySelectorAll('.mods [data-m]').forEach(b => b.onclick = () => { const m = b.dataset.m; const c = E.modCost(wk, m, own[m] + 1); let r = E.upgradeMod(S, wk, m);
      if (!r.ok && r.why === 'cost' && E.lackPrice(S, c).ok) { E.buyLack(S, c); r = E.upgradeMod(S, wk, m); }
      if (!r.ok) return this.toastWhy(r); save(); sfx.build(); this.toast(`${MODS[m].name} Mk${own[m]}! ${MODS[m].fx[own[m]]}`, 'good'); this.hideout(); });
  }
  /* 장비 탭: 방어구 · 헬멧 · 가방 · 소모품 · 요리 · 고물상 */
  tabGear(body) {
    const kl = E.facCur(S, 'kitchen')?.meal || 0;
    body.innerHTML = `
      <div class="sec">장비 <small>한 번 만들면 계속 · 쓰러져도 안 잃어요</small></div>
      ${Object.entries(GEAR).map(([g, G]) => { const cur = S.gear[g]; const nx = G.tiers[cur + 1];
        return `<div class="grow"><div><b>${G.name} ${cur ? ['', 'Ⅰ', 'Ⅱ', 'Ⅲ'][cur] : ''}</b><small>${G.tiers[cur].txt}</small>${nx ? `<small class="next">다음: ${nx.txt}</small><div class="cost">${costChips(nx.cost)}</div>` : ''}</div>
          ${nx ? `<button class="btn sm ${E.facLvl(S, 'bench') >= nx.bench ? '' : 'dim'}" data-g="${g}">${E.facLvl(S, 'bench') >= nx.bench ? '제작' : `작업대 Lv.${nx.bench}`}</button>` : '<small class="max">최고</small>'}</div>`; }).join('')}
      <div class="sec">소모품 <small>출격 준비에서 가방에 넣어 가요</small></div>
      ${Object.entries(CRAFTS).map(([k, C]) => { const ok = E.facLvl(S, C.fac) >= C.lv; return `<div class="grow"><div class="gi">${icon(k)}</div><div><b>${ITEMS[k].name} <small>보유 ${E.count(S, k)}</small></b><small>${ITEMS[k].desc}</small><div class="cost">${costChips(C.cost)}</div></div>
          <button class="btn sm ${ok ? '' : 'dim'}" data-c="${k}">${ok ? '만들기' : `${FACILITIES[C.fac].name} Lv.${C.lv}`}</button></div>`; }).join('')}
      ${kl ? `<div class="sec">주방 <small>다음 출격 한 번 · 하나만</small></div>
        ${S.meal ? `<div class="note good">${MEALS[S.meal].name} 준비됨 — ${MEALS[S.meal].txt}</div>` : Object.entries(MEALS).map(([k, M]) => `<div class="grow"><div><b>${M.name}</b><small>${M.txt}</small><div class="cost">${costChips(M.cost)}</div></div><button class="btn sm ${kl >= M.lv ? '' : 'dim'}" data-meal="${k}">${kl >= M.lv ? '요리' : `주방 Lv.${M.lv}`}</button></div>`).join('')}` : ''}
      <div class="sec">고물상 <small>모자란 재료를 조개로 (분해보다 비싸요)</small></div>
      <div class="market">${Object.entries(MARKET).map(([k, p]) => `<button class="btn sm" data-buy="${k}">${mat(k, '')}${MATS[k].name} ×5<em>${shell(p * 5)}</em></button>`).join('')}</div>`;
    body.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const g = b.dataset.g; const c = GEAR[g].tiers[S.gear[g] + 1].cost; let r = E.craftGear(S, g); if (!r.ok && r.why === 'cost' && E.lackPrice(S, c).ok) { E.buyLack(S, c); r = E.craftGear(S, g); } if (!r.ok) return this.toastWhy(r); save(); sfx.build(); this.toast(`${GEAR[g].name} ${['', 'Ⅰ', 'Ⅱ', 'Ⅲ'][S.gear[g]]}! ${GEAR[g].tiers[S.gear[g]].txt}`, 'good'); this.hideout(); });
    body.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const r = E.craftItem(S, b.dataset.c, 1); if (!r.ok) return this.toastWhy(r); save(); sfx.pick(3); this.toast(`${ITEMS[b.dataset.c].name} +1`, 'good'); this.hideout(); });
    body.querySelectorAll('[data-meal]').forEach(b => b.onclick = () => { const r = E.cook(S, b.dataset.meal); if (!r.ok) return this.toastWhy(r); save(); sfx.build(); this.toast(`${MEALS[b.dataset.meal].name} 완성! 다음 출격에 효과`, 'good'); this.hideout(); });
    body.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { if (!E.buy(S, b.dataset.buy, 5)) { this.toast('조개가 모자라요', 'soft'); return sfx.empty(); } save(); sfx.pick(2); this.hideout(); });
  }
  /* 창고 탭: 오늘의 인양 목록 · 한 번에 정리 · 물건별 팔기/분해 */
  tabStash(body) {
    const D = E.syncDaily(S); const cnt = {}; for (const k of S.stash) cnt[k] = (cnt[k] || 0) + 1;
    const scrapN = S.stash.filter(k => ITEMS[k].cat === 'scrap').length; const tre = S.stash.filter(k => ITEMS[k].cat === 'treasure' && !E.isDailyItem(S, k)); const treV = tre.reduce((s, k) => s + E.sellPrice(S, k), 0);
    const ap = E.appraise(S);
    body.innerHTML = `
      <div class="sec">오늘의 인양 목록 <small>${S.daily.day} · 납품하면 값의 1.6배 + 재료</small></div>
      <div class="daily">${D.map((o, i) => { const have = E.count(S, o.item); const done = S.daily.done[i];
        return `<div class="dl ${done ? 'done' : ''}"><div class="gi">${icon(o.item)}</div><div><b>${ITEMS[o.item].name} ×${o.n}</b><small>${o.map ? `${MAPS[o.map].icon} ${MAPS[o.map].short} · ` : ''}${done ? '납품 완료' : `가진 것 ${have}/${o.n}`}</small><small>${shell(o.shells)} ${Object.entries(o.mat).map(([k, n]) => mat(k, n)).join(' ')}</small></div>
          ${done ? '<span class="max">✓</span>' : `<button class="btn sm ${have >= o.n ? '' : 'dim'}" data-d="${i}">납품</button>`}</div>`; }).join('')}</div>
      <div class="sec">창고 <small>${S.stash.length}/${E.stashCap(S)}칸${ap ? ` · 감정 +${Math.round(ap * 100)}%` : ''}</small></div>
      <div class="bulk"><button class="btn sm ${scrapN ? '' : 'dim'}" id="bScrap">고철 ${scrapN}개 모두 분해</button><button class="btn sm ${tre.length ? '' : 'dim'}" id="bTre">보물 모두 팔기 <em>${shell(treV)}</em></button></div>
      ${Object.entries(CATS).map(([c, name]) => { const ks = Object.keys(cnt).filter(k => ITEMS[k].cat === c); if (!ks.length) return '';
        return `<div class="catrow"><small>${name}</small><div class="stashgrid">${ks.map(k => `<button class="si ${E.isDailyItem(S, k) ? 'star' : ''}" data-k="${k}">${icon(k)}<b>${cnt[k]}</b></button>`).join('')}</div></div>`; }).join('') || '<small class="hint">비었어요 — 출격해서 채워요</small>'}
      <small class="hint">물건을 누르면 팔기 · 분해. 고철은 분해해야 재료가 나와요</small>`;
    body.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const r = E.deliverDaily(S, +b.dataset.d); if (!r.ok) return this.toast('아직 모자라요', 'soft'); save(); sfx.rare(); this.toast(`납품 완료! ${r.o.shells}조개 + 재료`, 'good'); this.hideout(); });
    $('#bScrap', body).onclick = () => { const r = E.bulk(S, 'scrap'); if (!r.n) return; save(); sfx.build(); this.toast(`분해 ${r.n}개 → ${Object.entries(r.mats).map(([k, n]) => MATS[k].name + ' ' + n).join(' · ')}`, 'good'); this.hideout(); };
    $('#bTre', body).onclick = () => { const r = E.bulk(S, 'treasure'); if (!r.n) return; save(); sfx.rare(); this.toast(`보물 ${r.n}개 팔아 조개 +${r.shells}`, 'good'); this.hideout(); };
    body.querySelectorAll('.si').forEach(b => b.onclick = () => this.itemSheet(b.dataset.k));
  }
  itemSheet(k) {
    const I = ITEMS[k]; const q = E.questNow(S); const qd = q?.goal.t === 'deliver' && q.goal.item === k;
    const m = h('div', 'modal', `<div class="sheet item"><div class="ih">${icon(k)}<div><h3>${I.name}</h3><small>${CATS[I.cat]} · ${I.w}×${I.h}칸 · ${I.wt}kg · 보유 ${E.count(S, k)}</small></div></div>
      <p>${I.desc}</p>${E.isDailyItem(S, k) ? '<div class="note good">오늘의 인양 목록에 있어요 — 납품하면 더 받아요</div>' : ''}${qd ? '<div class="note good">의뢰 납품 물건이에요</div>' : ''}
      <div class="sbtns"><button class="btn" id="iSell">팔기 <em>${shell(E.sellPrice(S, k))}</em></button>
      ${I.dis ? `<button class="btn" id="iDis">분해 <em>${Object.entries(I.dis).map(([m, n]) => mat(m, n)).join(' ')}</em></button>` : ''}
      ${qd ? '<button class="btn cta" id="iQ">의뢰 납품</button>' : ''}<button class="btn" id="iClose">닫기</button></div></div>`);
    this.root.appendChild(m); const close = () => { m.remove(); this.hideout(); };
    $('#iSell', m).onclick = () => { const v = E.sell(S, k); save(); sfx.pick(v / 10); this.toast(`${I.name} 팔아 +${v}`, 'good'); if (E.count(S, k)) { m.remove(); this.hideout(); this.itemSheet(k); } else close(); };
    $('#iDis', m) && ($('#iDis', m).onclick = () => { E.dismantle(S, k); save(); sfx.build(); this.toast(`${I.name} 분해!`, 'good'); if (E.count(S, k)) { m.remove(); this.hideout(); this.itemSheet(k); } else close(); });
    $('#iQ', m) && ($('#iQ', m).onclick = () => { const r = E.questDeliver(S); if (!r.ok) return this.toast('아직 모자라요', 'soft'); save(); this.questDone([r.q]); close(); });
    $('#iClose', m).onclick = close; m.onclick = e => { if (e.target === m) close(); };
  }
  /* 의뢰 탭 */
  tabQuest(body) {
    const q = E.questNow(S); const qp = E.questProgress(S);
    const rw = r => Object.entries(r).map(([k, n]) => k === 'shells' ? shell(n) : k === 'cos' ? `꾸미기 <b>${COS[n]?.name || n}</b>` : k in MATS ? mat(k, n) : `${ITEMS[k].name} ${n}`).join(' ');
    body.innerHTML = (this.app.story?.questHtml() || '') + (q ? `<div class="qcard"><small>지금 의뢰 ${QUESTS.indexOf(q) + 1}/${QUESTS.length}${q.goal.map ? ` · ${MAPS[q.goal.map].icon} ${MAPS[q.goal.map].name}` : ''}</small><h3>${q.name}</h3>${this.app.story?.giverHtml(q) || ''}<p>${q.txt}</p>
        ${qp.n > 1 ? `<div class="qbar"><i style="width:${qp.cur / qp.n * 100}%"></i><span>${qp.cur}/${qp.n}</span></div>` : ''}
        <div class="rw">보상 ${rw(q.reward)}${q.unlock ? ` · <b>${FACILITIES[q.unlock].name} 해금</b>` : ''}${q.map ? ` · <b>${MAPS[q.map].icon} ${MAPS[q.map].name} 열림</b>` : ''}</div><small class="hint">팁: ${q.tip}</small>
        ${q.goal.t === 'deliver' ? `<button class="btn cta ${qp.cur >= qp.n ? '' : 'dim'}" id="qDel">납품하기</button>` : ''}</div>` : '<div class="note good">의뢰를 모두 끝냈어요! 인양단장 인정</div>') +
      `<div class="qlist">${QUESTS.map((x, i) => { const done = S.quests.done.includes(x.id); const now = x === q; return `<div class="ql ${done ? 'done' : now ? 'now' : ''}"><span>${done ? '✓' : i + 1}</span><b>${done || now ? x.name : '???'}</b><small>${x.unlock ? FACILITIES[x.unlock].name + ' 해금' : x.map ? MAPS[x.map].name + ' 열림' : x.reward.cos && (done || now) ? '꾸미기' : ''}</small></div>`; }).join('')}</div>`;
    $('#qDel', body) && ($('#qDel', body).onclick = () => { const r = E.questDeliver(S); if (!r.ok) return this.toast('아직 모자라요', 'soft'); save(); this.questDone([r.q]); this.hideout(); });
  }
  questDone(list) { for (const q of list) { sfx.rare(); this.toast(`의뢰 완료: ${q.name}${q.unlock ? ` — ${FACILITIES[q.unlock].name} 해금!` : ''}${q.map ? ` — 새 지도 ${MAPS[q.map].name}!` : ''}${q.reward.cos ? ` — 꾸미기 ${COS[q.reward.cos]?.name || ''}` : ''}`, 'good'); } if (list.some(q => q.map)) this.app.preloadMaps?.(); }
  howto() {
    const m = h('div', 'modal', `<div class="sheet"><h3>인양 대원 수칙</h3><ol>
      <li><b>왼쪽 아래를 끌면</b> 이동 · 가까운 적은 <b>저절로 조준</b>해 쏴요</li>
      <li><b>구르기</b>로 빛 탄 · 경고 원을 피해요 (기력 소모 · 짐이 무거우면 더 듦)</li>
      <li>창고는 3단: <b>입구 → 깊은 창고 → 기관실</b>. 깊을수록 값진 것 · 강한 적</li>
      <li>출구 3곳: <b>입구 사다리</b>(3분 안에만) · <b>화물 승강기</b>(발전기 켜야) · <b>비상 잠수정</b>(기관실, 6초)</li>
      <li><b>들고 나오면 내 것.</b> 쓰러지면 가방은 그 자리에 — 다음 출격에 한 번 찾아올 수 있어요</li>
      <li>의뢰를 이어 가면 새 지도: <b>밤의 항구</b>(등불 · 신호탄 보트) · <b>해저 터널</b>(산소 · 물살)</li>
      <li>은신처에서 팔고 · 분해하고 · 시설을 키워요. 무기는 개조할수록 정확하고 세져요</li></ol>
      <button class="btn cta">알겠어요</button></div>`);
    this.root.appendChild(m); $('.btn', m).onclick = () => { sfx.ui(); m.remove(); };
  }

  /* ───────── 출격 준비 ───────── */
  prep() {
    this.clear(); this.root.className = 'scr-prep'; const L = E.loadout(S);
    const safeBag = () => { const b = mkBag(L.safe[0], L.safe[1]); return this.safePick.every(k => autoAdd(b, mkItem(k))); };
    this.safePick = this.safePick.filter(k => S.stash.includes(k)); if (!safeBag()) this.safePick = [];
    if (!this.safePick.length && !this.safeTouched) { const m = S.stash.find(k => ITEMS[k].heal); if (m) this.safePick = [m]; }
    const cells = L.bag.w * L.bag.h; const maxCarry = Math.max(2, Math.floor(cells / 2) - L.kit);
    for (const k of Object.keys(this.carry)) this.carry[k] = Math.min(this.carry[k], E.count(S, k) - this.safePick.filter(x => x === k).length);
    const carryN = Object.values(this.carry).reduce((a, b) => a + b, 0);
    const corpse = S.corpse ? `<div class="note warm"><b>지난번 가방이 침수 창고에 남아 있어요</b><br>이번 출격 지도는 그때와 같아요. 주황 깃발에서 한 번 회수할 수 있어요 (${S.corpse.items.length}개)</div>` : '';
    const choices = [...new Set(S.stash)].filter(k => { const b = mkBag(L.safe[0], L.safe[1]); return autoAdd(b, mkItem(k)); });
    const w = L.weapons; const meal = S.meal ? MEALS[S.meal] : null;
    /* 지도 고르기 (v0.4) — 쓰러진 가방이 있으면 그 지도로 고정 */
    const open = E.openMaps(S); let mk = S.corpse ? (S.corpse.map || 'ware') : open.includes(S.mapSel) ? S.mapSel : 'ware'; this.mapKey = mk; const MP = MAPS[mk];
    const lockQ = m => QUESTS.findIndex(q => q.id === MAPS[m].unlock) + 1;
    const mapRow = MAP_KEYS.map(m => { const on = open.includes(m); return `<button class="mapbtn m-${m} ${m === mk ? 'on' : ''} ${on ? '' : 'locked'}" data-m="${m}" ${S.corpse && m !== mk ? 'disabled' : ''}><span>${MAPS[m].icon}</span><b>${MAPS[m].name}</b><small>${on ? (m === 'ware' ? '기본' : '열림') : `의뢰 ${lockQ(m)}에서 열려요`}</small></button>`; }).join('');
    const exitTxt = m => m === 'tunnel' ? `${MP.exits.early}(물 닿으면 잠김) · ${MP.exits.power}(전원) · ${MP.exits.sub}` : m === 'harbor' ? `${MP.exits.early}(3분) · ${MP.exits.power}(전원) · ${MP.exits.sub}(신호탄 → 7초)` : `${MP.exits.early}(3분) · ${MP.exits.power}(전원) · ${MP.exits.sub}`;
    const el = h('div', 'prep', `
      <header class="topbar"><button class="back" id="back">‹</button><div class="brand"><b>출격 준비</b><small>${MP.name} · ${fmt(RAID.time)} 안에 탈출</small></div><div class="money">${shell(S.shells)}</div></header>
      <div class="maprow">${mapRow}</div>
      <div class="mapcard m-${mk}"><div class="mapart"><i class="z3"></i><i class="z2"></i><i class="z1"></i></div><div><b>${MP.name} 3단</b>
        <p>${MP.blurb}<br>출구: ${exitTxt(mk)}<br>${MP.tips}${mk !== 'ware' ? `<br><em>판마다 상태가 달라요: ${Object.keys(MP.conds).map(c => `${COND_UI[c]?.[0] || ''}${CONDS[c].name}`).join(' · ')}</em> <button class="infob" id="condInfo" aria-label="판 상태 자세히">ⓘ</button>` : ''}</p>
        ${mk !== 'ware' ? `<div class="condinfo" id="condBox" hidden>${Object.keys(MP.conds).map(c => `<p><b>${COND_UI[c]?.[0] || ''} ${CONDS[c].name}</b> ${CONDS[c].txt}</p>`).join('')}</div>` : ''}</div></div>
      ${corpse}${this.app.story?.prepNote(mk) || ''}
      <div class="card"><div class="fh"><b>장비</b><span class="lv">체력 ${L.hp} · 방어 ${pct(L.armor)}</span></div>
        <div class="loadout"><span><small>주무기</small><b>${w[0].name}</b></span>${w[1] ? `<span><small>보조</small><b>${w[1].name}</b></span>` : ''}<span><small>가방</small><b>${L.bag.w}×${L.bag.h} · ${L.bag.comfy}kg</b></span>${L.pet ? `<span><small>몽이 주머니</small><b>${L.pet.w}×${L.pet.h}${L.pet.safe ? ' · 지켜 줌' : ''}</b></span>` : ''}</div>
        ${meal ? `<small class="hint good">🍲 ${meal.name}: ${meal.txt}</small>` : ''}${L.kit ? `<small class="hint">창고 보너스: 연고 ${L.kit}개 공짜로 넣고 출발</small>` : ''}</div>
      <div class="card"><div class="fh"><b>가져갈 소모품</b><span class="lv">${carryN}/${maxCarry} · 가방 칸을 차지해요</span></div>
        <div class="carry">${['med', 'bandage', 'smoke', 'nade'].filter(k => E.count(S, k)).map(k => `<div class="cr">${icon(k)}<small>${ITEMS[k].name}</small><div><button data-k="${k}" data-d="-1">−</button><b>${this.carry[k] || 0}</b><button data-k="${k}" data-d="1">+</button></div></div>`).join('') || '<small class="hint">창고에 소모품이 없어요 — 의무실 · 연구대에서 만들어요</small>'}</div></div>
      <div class="card"><div class="fh"><b>안전 칸</b><span class="lv">${L.safe[0]}×${L.safe[1]} · 쓰러져도 지켜요</span></div>
        <div class="safepick">${choices.length ? choices.map(k => `<button class="slot ${this.safePick.includes(k) ? 'on' : ''}" data-k="${k}">${icon(k)}<small>${ITEMS[k].name}</small></button>`).join('') : '<small class="hint">창고에 넣을 만한 게 없어요</small>'}
          <button class="slot ${this.safePick.length ? '' : 'on'}" data-k=""><span class="none">비움</span><small>빈 칸</small></button></div></div>
      <div class="bmrow bmprep">${BM.insureHtml()}${BM.sortieHtml()}</div>
      <button class="btn cta" id="sortie">${S.sorties > 0 || this.app.free ? `출격! <small>(오늘 ${S.sorties}회 남음)</small>` : '오늘 출격 끝 — 내일 다시'}</button>`);
    this.root.appendChild(el);
    el.querySelectorAll('.slot').forEach(b => b.onclick = () => { this.safeTouched = true; const k = b.dataset.k; sfx.ui();
      if (!k) this.safePick = []; else if (this.safePick.includes(k)) this.safePick.splice(this.safePick.indexOf(k), 1);
      else { const n = this.safePick.concat(k); const bb = mkBag(L.safe[0], L.safe[1]); if (n.every(x => autoAdd(bb, mkItem(x))) && n.filter(x => x === k).length <= E.count(S, k)) this.safePick = n; else this.safePick = [k]; }
      this.prep(); });
    el.querySelectorAll('.carry button').forEach(b => b.onclick = () => { const k = b.dataset.k, d = +b.dataset.d; const cur = this.carry[k] || 0; const avail = E.count(S, k) - this.safePick.filter(x => x === k).length;
      if (d > 0 && (carryN >= maxCarry || cur >= avail)) return this.toast(cur >= avail ? '창고에 더 없어요' : '가방 칸을 남겨 둬요', 'soft'); this.carry[k] = Math.max(0, cur + d); sfx.ui(); this.prep(); });
    $('#back', el).onclick = () => { sfx.ui(); this.hideout(); };
    $('#condInfo', el) && ($('#condInfo', el).onclick = () => { sfx.ui(); const bx = $('#condBox', el); bx.hidden = !bx.hidden; });
    el.querySelectorAll('.mapbtn').forEach(b => b.onclick = () => { const m = b.dataset.m; if (!open.includes(m)) { sfx.empty(); return this.toast(`의뢰 ${lockQ(m)} '${QUESTS[lockQ(m) - 1].name}'을 끝내면 열려요`, 'soft'); } if (S.corpse) return; S.mapSel = m; save(); sfx.ui(); this.prep(); });
    BM.bindInsure(el, () => this.prep()); BM.bindSortie(el, () => this.prep());
    $('#sortie', el).onclick = () => {
      unlock(); if (S.sorties <= 0 && !this.app.free) { this.toast('오늘 출격 3번을 다 썼어요. 내일 또 만나요!', 'soft'); return; }
      sfx.ui(); const carry = Object.entries(this.carry).flatMap(([k, n]) => Array(n).fill(k)); this.carry = {};
      this.app.startRaid({ safeItems: this.safePick.slice(), carry, map: this.mapKey });
    };
    this.app.showHideout(true);
  }

  /* ───────── 전투 HUD ───────── */
  raidStart(R) {
    this.clear(); this.R = R; this.root.className = 'scr-raid'; this.top.clear(); this._praiseT = 0;
    const el = h('div', 'raidui', `
      <div class="top"><div class="hpbox"><div class="hp"><i id="hpf"></i><span id="hpt"></span></div><div class="st"><i id="stf"></i></div><div class="wt" id="wt"><i></i><span></span></div></div>
        <div class="tcol"><div class="timer" id="timer">7:00</div><div class="zone" id="zone"></div></div><div class="val" id="val"></div></div>
      <div class="evt" id="evt"></div>
      <div class="bossbar" id="bossbar"><span>${ENEMIES[R.M.bossKind].name}</span><div><i></i></div></div>
      ${R.o2 != null ? '<div class="o2" id="o2"><i></i><span>산소</span></div>' : ''}
      <button class="ammo" id="ammo"></button>
      <div class="exitbar" id="exitbar"><i></i><span>탈출 중…</span></div>
      <div class="search" id="search"><i></i><span>뒤지는 중…</span></div>
      <div class="arrows" id="arrows"></div>
      <div id="stickzone"><div class="stick" id="stick"><i></i></div><small class="stickhint">끌어서 이동</small></div>
      <div class="btns">
        <button class="b act" id="bAct"><span id="actTxt">뒤지기</span></button>
        <button class="b fire" id="bFire"><span>쏘기</span><small id="autoTag">자동</small></button>
        <button class="b roll" id="bRoll"><span>구르기</span></button>
        <button class="b bag" id="bBag"><span>가방</span></button>
        <button class="b med" id="bMed"><span>회복</span></button>
        <button class="b nade" id="bNade"><span>수류탄</span><small id="nadeN"></small></button>
        <button class="b smoke" id="bSmoke"><span>연막</span><small id="smokeN"></small></button>
      </div>`);
    this.root.appendChild(el); this.el = el;
    this.bindStick(); const inp = R.input;
    const hold = (b, on, off) => { b.addEventListener('pointerdown', e => { e.preventDefault(); unlock(); b.classList.add('down'); on(); }); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => { b.classList.remove('down'); off?.(); }); };
    hold($('#bFire'), () => { inp.fire = true; }, () => { inp.fire = false; });
    $('#bFire').addEventListener('dblclick', () => { inp.auto = !inp.auto; $('#autoTag').textContent = inp.auto ? '자동' : '수동'; });
    hold($('#bRoll'), () => { inp.roll = true; });
    hold($('#bAct'), () => R.act());
    hold($('#bBag'), () => this.toggleBag());
    hold($('#bMed'), () => R.useMed());
    hold($('#bNade'), () => R.throwItem('nade'));
    hold($('#bSmoke'), () => R.throwItem('smoke'));
    $('#ammo').onclick = () => R.switchWeapon();
    this.app.showHideout(false);
  }
  event(t, kind = '') {
    if (!$('#evt')) return; const boss = kind.split(' ').includes('boss');
    this.top.push({ prio: boss ? 3 : 1, key: 'e:' + t, dur: boss ? 3.4 : Math.min(3.6, 2.2 + t.length * 0.03),
      show: () => { const e = $('#evt'); if (e) { e.textContent = t; e.className = 'evt show ' + kind; } }, hide: () => $('#evt')?.classList.remove('show') });
  }
  /* 판 상태 띠: 지도 · 상태 한 구절 (무전이 같은 말을 하면 무전 쪽 key 로 생략) */
  condBand(MP, ck) { const u = COND_UI[ck]; if (!u) return; this.event(`${u[0]} ${CONDS[ck].name} · ${u[1]}`, 'warn cond'); }
  /* 칭찬: 주인공 머리 위 작은 글씨 (위쪽 줄과 안 겹침) */
  praise(t) { const R = this.R; if (!R || !this.el) return; let e = $('#praise'); if (!e) { e = h('div', 'praise'); e.id = 'praise'; this.el.appendChild(e); } e.textContent = t; e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); this._praiseT = 1.1; }
  topTick(dt) {
    this.top.tick(dt);
    if (this._praiseT > 0 && this.R) { this._praiseT -= dt; const e = $('#praise'); if (e) { const v = this._pv || (this._pv = this.R.pl.pos.clone()); v.copy(this.R.pl.pos); v.y = 2.6; v.project(this.app.camera); e.style.transform = `translate(${((v.x * 0.5 + 0.5) * innerWidth) | 0}px,${((-v.y * 0.5 + 0.5) * innerHeight) | 0}px) translate(-50%,-100%)`; if (this._praiseT <= 0) e.classList.remove('on'); } }
  }
  bindStick() {
    const z = $('#stickzone'), st = $('#stick'), knob = st.firstChild; let id = null, ox = 0, oy = 0; const RAD = 52;
    z.addEventListener('pointerdown', e => { unlock(); id = e.pointerId; z.setPointerCapture(id); const r = z.getBoundingClientRect(); ox = e.clientX; oy = e.clientY; st.style.left = (ox - r.left) + 'px'; st.style.top = (oy - r.top) + 'px'; st.classList.add('on'); z.classList.add('used'); });
    z.addEventListener('pointermove', e => { if (e.pointerId !== id) return; const inp = this.R.input; let dx = e.clientX - ox, dy = e.clientY - oy; const l = Math.hypot(dx, dy); if (l > RAD) { dx *= RAD / l; dy *= RAD / l; } knob.style.transform = `translate(${dx}px,${dy}px)`; const k = Math.min(1, l / RAD); const a = Math.atan2(dy, dx); inp.mx = Math.cos(a) * k; inp.mz = Math.sin(a) * k; if (l < 6) inp.mx = inp.mz = 0; });
    const up = e => { if (e.pointerId !== id) return; id = null; const inp = this.R.input; inp.mx = inp.mz = 0; knob.style.transform = ''; st.classList.remove('on'); };
    z.addEventListener('pointerup', up); z.addEventListener('pointercancel', up);
    /* PC: WASD · 스페이스 구르기 · J 쏘기 · E 상호작용 · Tab 가방 · Q 회복 · G 수류탄 · F 연막 · R 무기 바꾸기 */
    if (!this.keyBound) { this.keyBound = true; const keys = {};
      const upd = () => { const R = this.R; if (!R?.alive) return; const x = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), y = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0); if (x || y || this.kbMove) { const l = Math.hypot(x, y) || 1; R.input.mx = x / l; R.input.mz = y / l; this.kbMove = !!(x || y); } R.input.fire = !!keys.KeyJ; };
      addEventListener('keydown', e => { const R = this.R; if (!R?.alive) return; keys[e.code] = true; if (e.code === 'Space') { R.input.roll = true; e.preventDefault(); } if (e.code === 'KeyE') R.act(); if (e.code === 'Tab') { e.preventDefault(); this.toggleBag(); } if (e.code === 'KeyQ') R.useMed(); if (e.code === 'KeyG') R.throwItem('nade'); if (e.code === 'KeyF') R.throwItem('smoke'); if (e.code === 'KeyR') R.switchWeapon(); upd(); });
      addEventListener('keyup', e => { keys[e.code] = false; upd(); }); }
  }
  raidHud(R) {
    if (!this.el) return; const pl = R.pl; const L = R.L;
    $('#hpf').style.width = (pl.hp / pl.maxHp * 100) + '%'; $('#hpf').parentNode.classList.toggle('low', pl.hp < pl.maxHp * 0.3); $('#hpt').textContent = Math.ceil(pl.hp);
    $('#stf').style.width = pl.stam + '%';
    const wv = R.weight(); const wt = $('#wt'); wt.firstChild.style.width = Math.min(100, wv / (L.bag.comfy * 2) * 100) + '%'; wt.lastChild.textContent = `${wv.toFixed(1)}/${L.bag.comfy}kg`; wt.classList.toggle('heavy', wv > L.bag.comfy);
    const tm = $('#timer'); tm.textContent = fmt(Math.ceil(R.time)); tm.classList.toggle('warn', R.time <= RAID.warnAt);
    const zt = `${R.Z[R.zone].name}${R.dark > 0 ? ' · 정전' : R.map !== 'ware' && R.cond !== 'calm' ? ' · ' + R.C.name : ''}${R.floodZ < R.P.H ? (R.map === 'harbor' ? ' · 밀물' : ' · 침수 중') : ''}${R.surge > 0 ? ' · 급류' : ''}`; if (zt !== this._zt) { $('#zone').textContent = zt; this._zt = zt; }
    if (R.o2 != null) { const o = $('#o2'); const k = R.o2 / R.o2Max; o.firstChild.style.width = (k * 100) + '%'; o.classList.toggle('low', k < 0.3); o.classList.toggle('air', !!pl.air); o.lastChild.textContent = pl.air ? '산소 채우는 중' : pl.deep ? `산소 ${Math.ceil(R.o2)} · 물속` : `산소 ${Math.ceil(R.o2)}`; }
    const val = bagValue(R.bag) + bagValue(R.safe) + (R.pet ? bagValue(R.pet) : 0); if (val !== this._val) { $('#val').innerHTML = shell(val); this._val = val; }
    const w = R.w; $('#ammo').innerHTML = (pl.reload > 0 ? '<b class="rl">장전 중</b>' : `<b>${pl.mags[R.wi]}</b><small>/${w.mag}</small>`) + `<em>${w.short}${R.ws.length > 1 ? ' ⇄' : ''}</em>`;
    /* 상황 버튼 */
    const act = $('#bAct'); const n = R.near; act.classList.toggle('show', !!n && !pl.searching && !pl.dead);
    if (n) { const c = n.c; $('#actTxt').textContent = n.type === 'gen' ? '전원 켜기' : n.type === 'lamp' ? (n.L.lit ? '등불 끄기' : '등불 켜기') : n.type === 'flare' ? '신호탄 쏘기' : n.type === 'gate' ? (n.g.door.lock === 'vault' ? (R.hasItem('vkey') ? '금고 열기' : '금고 · 열쇠 필요') : '전원 문') : c.searched ? (c.items?.length ? '다시 보기' : '빈 곳') : (c.corpse ? '내 가방 찾기' : '뒤지기'); }
    act.classList.toggle('gold', !!(n?.c?.corpse || n?.type === 'gen' || n?.type === 'flare' || (n?.type === 'gate' && R.hasItem('vkey'))));
    $('#bMed').classList.toggle('show', R.hasItem('med') || R.hasItem('bandage'));
    for (const k of ['nade', 'smoke']) { const c = R.carried().reduce((s, b) => s + b.items.filter(p => p.it.key === k).length, 0); const b = $(k === 'nade' ? '#bNade' : '#bSmoke'); b.classList.toggle('show', c > 0); $(k === 'nade' ? '#nadeN' : '#smokeN').textContent = c; }
    $('#bFire').classList.toggle('aim', !!pl.aim);
    $('#bRoll').classList.toggle('dim', pl.stam < 34 * (wv > L.bag.comfy ? 1.5 : 1));
    const sr = $('#search'); sr.classList.toggle('show', !!pl.searching); if (pl.searching) { sr.firstChild.style.width = (pl.searching.prog * 100) + '%'; sr.lastChild.textContent = { gen: '전원 켜는 중…', lamp: '등불 만지는 중…', flare: '신호탄 준비…' }[pl.searching.kind] || '뒤지는 중…'; }
    const ex = $('#exitbar'); const x = R.exitHere; const showEx = !!x && x.open && !R.over; ex.classList.toggle('show', showEx); if (showEx) ex.firstChild.style.width = (x.hold / x.need * 100) + '%';
    /* 보스 체력 */
    const B = R.boss; const bb = $('#bossbar'); const showB = B && !B.dead && B.state === 'chase'; bb.classList.toggle('show', !!showB); if (showB) bb.lastChild.firstChild.style.width = (B.hp / B.maxHp * 100) + '%';
    this.drawArrows(R);
    if (R.over && !this.el.querySelector('.banner')) {
      const t = R.over === 'extract' ? ['탈출!', '들고 나온 건 이제 내 것'] : R.over === 'tide' ? ['물이 다 찼어요', '가방은 이 자리에 남아요'] : ['쓰러졌어요', '가방은 이 자리에 — 다음 출격에 한 번 찾을 수 있어요'];
      this.el.appendChild(h('div', 'banner ' + (R.over === 'extract' ? 'ok' : 'ko'), `<b>${t[0]}</b><small>${t[1]}</small>`));
    }
  }
  /* 화면 밖 목표 방향: 출구(조건) · 내 가방 · 발전기 · 금고실 · 몽이가 찾은 상자 */
  drawArrows(R) {
    const box = $('#arrows'); const cam = this.app.camera; const W = innerWidth, H = innerHeight; const out = [];
    const targets = R.exits.filter(x => x.open || x.call === 'idle' || x.call === 'wait' || (x.kind === 'power' && !R.power && R.zone === 2 && x.pos.distanceTo(R.pl.pos) < 30)).map(x => ({ p: x.pos, t: x.open ? x.name : `${x.name} · ${R.exitWhy(x)}`, c: x.open ? 'ex' : x.call ? 'gen' : 'exoff' }));
    if (R.o2 != null && R.o2 < R.o2Max * 0.45) { let best = null, bd = 40; for (const a of R.airs) { const d = Math.hypot(a.x - R.pl.pos.x, a.z - R.pl.pos.z); if (d < bd) { bd = d; best = a; } } if (best) targets.push({ raw: best, t: '공기 방울', c: 'pet' }); }
    for (const c of R.containers) if (c.corpse && !c.searched) targets.push({ p: c.pos, t: '내 가방', c: 'co' });
    const gp = R.gen.pos; const lost = R.elapsed > RAID.earlyClose - 30 && !R.power;
    if (!R.power && (R.L.hints || lost || R.zone >= 2)) targets.push({ raw: gp, t: '발전기', c: lost ? 'gen hot' : 'gen' });
    if (R.L.hints && !R.vaultOpened) { const v = R.P.rooms.find(r => r.id === R.P.vault); targets.push({ raw: { x: v.x0 + RS2, z: v.z0 + RS2 }, t: '금고실', c: 'co' }); }
    if (R.L.pet?.sniff) { let best = null, bd = 30; for (const c of R.containers) { if (c.searched || (c.best || 0) < 70) continue; const d = c.pos.distanceTo(R.pl.pos); if (d < bd) { bd = d; best = c; } } if (best) targets.push({ p: best.pos, t: '몽이: 여기 좋은 냄새!', c: 'pet' }); }
    const v = this._v || (this._v = R.pl.pos.clone());
    for (const tg of targets) {
      const src = tg.raw || tg.p; v.set(src.x, 1, src.z); const d = Math.round(Math.hypot(src.x - R.pl.pos.x, src.z - R.pl.pos.z)); v.project(cam); let x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
      const m = 34; if (x > m && x < W - m && y > 110 && y < H - 200 && v.z < 1) continue;
      const cx = W / 2, cy = H / 2; const ang = Math.atan2(y - cy, x - cx); const k = Math.min((W / 2 - m) / Math.abs(Math.cos(ang) || 1e-6), (H / 2 - 130) / Math.abs(Math.sin(ang) || 1e-6));
      x = cx + Math.cos(ang) * k; y = cy + Math.sin(ang) * k;
      out.push(`<div class="arr ${tg.c}" style="transform:translate(${x | 0}px,${y | 0}px)"><i style="transform:rotate(${ang.toFixed(2)}rad)"></i><span>${tg.t} ${d}m</span></div>`);
    }
    const s = out.join(''); if (s !== this._arr) { box.innerHTML = s; this._arr = s; }
  }
  /* 시야: 원뿔 + 발밑 원 밖은 어둡게 (화면 좌표) · 정전 때 더 어둡게 · 조명 Lv2 는 원뿔 밖 적을 점으로 */
  drawVeil(R, cam) {
    const c = this.veil, x = this.vx; const W = c.width, H = c.height; x.clearRect(0, 0, W, H);
    if (!R || !R.alive) return;
    const sc = W / innerWidth; const pl = R.pl; const p = pl.pos.clone(); p.y = 0.5; p.project(cam);
    const px = (p.x * 0.5 + 0.5) * W, py = (-p.y * 0.5 + 0.5) * H;
    const f = pl.pos.clone().add({ x: Math.sin(pl.face) * 5, y: 0.5, z: Math.cos(pl.face) * 5 }); f.project(cam);
    const fx = (f.x * 0.5 + 0.5) * W, fy = (-f.y * 0.5 + 0.5) * H; const ang = Math.atan2(fy - py, fx - px);
    const VP = R.veilParams(); const dark = VP.dark, vis = VP.vis;
    const r0 = 95 * sc, L = Math.max(W, H) * 0.75 * vis, half = 0.62 * Math.min(1.25, vis);
    x.fillStyle = `rgba(6,14,20,${dark})`; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'destination-out';
    let g = x.createRadialGradient(px, py, r0 * 0.6, px, py, r0 * 1.25); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(px, py, r0 * 1.25, 0, 7); x.fill();
    g = x.createRadialGradient(px, py, L * 0.45, px, py, L); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; for (let i = 0; i < 3; i++) { const hw = half * (1 - i * 0.12); x.globalAlpha = i ? 0.35 : 1; x.beginPath(); x.moveTo(px, py); x.arc(px, py, L, ang - hw - i * 0.08, ang + hw + i * 0.08); x.closePath(); x.fill(); }
    /* 빛 웅덩이(등불 · 랜턴 · 불 · 공기 방울): 그 둘레는 보임 */
    x.globalAlpha = 1; const q0 = this._q || (this._q = pl.pos.clone()); const pr = (w, z) => { q0.set(w, 0.3, z).project(cam); return [(q0.x * 0.5 + 0.5) * W, (-q0.y * 0.5 + 0.5) * H]; };
    for (const P of VP.pools) { if (Math.abs(P.x - pl.pos.x) > 22 || Math.abs(P.z - pl.pos.z) > 30) continue; const [cx, cy] = pr(P.x, P.z); const [ex] = pr(P.x + P.r, P.z); const rr = Math.max(8, Math.abs(ex - cx));
      const gp = x.createRadialGradient(cx, cy, rr * 0.35, cx, cy, rr); gp.addColorStop(0, 'rgba(0,0,0,0.92)'); gp.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gp; x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.fill(); }
    x.globalCompositeOperation = 'source-over';
    for (const e of R.enemies) {
      if (e.sleep) { e.root.visible = false; continue; }
      if (e.dead) { e.root.visible = true; continue; }
      const d = e.pos.distanceTo(pl.pos); const a = Math.atan2(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z);
      let dd = a - pl.face; while (dd > Math.PI) dd -= 6.283; while (dd < -Math.PI) dd += 6.283;
      const v = d < 3.2 || (Math.abs(dd) < half + 0.15 && d < 15 * vis) || e.flash > 0 || e.D.boss && d < 10 || R.flash > 0 || ((e.D.light || VP.pools.length) && R.inLight(e.pos, 0.3)); e.root.visible = v || e.state === 'chase' && d < 6;
      if (!e.root.visible && R.L.sense && d < 10) { const q = e.pos.clone(); q.y = 0.5; q.project(cam); x.fillStyle = 'rgba(255,90,69,.7)'; x.beginPath(); x.arc((q.x * 0.5 + 0.5) * W, (-q.y * 0.5 + 0.5) * H, 5 * sc + 2, 0, 7); x.fill(); }
    }
  }
  /* ───────── 가방 · 뒤지기 ───────── */
  toggleBag(force) { this.invOpen = force ?? !this.invOpen; if (this.invOpen) this.renderInv(); else { $('#inv')?.remove(); this.loot = null; } sfx.ui(); }
  openLoot(c) { this.app.story?.onLoot(c); this.loot = c; this.invOpen = true; this.renderInv(); }
  renderInv() {
    const R = this.R; $('#inv')?.remove(); const gw = R.bag.w + Math.max(R.safe.w, R.pet?.w || 0); const CELL = Math.min(64, Math.floor((innerWidth - 64) / (gw + 0.6)));
    const el = h('div', 'inv'); el.id = 'inv'; el.style.setProperty('--cell', CELL + 'px');
    const loot = this.loot; const wv = R.weight(), cf = R.L.bag.comfy;
    el.innerHTML = `<div class="invsheet">
      ${loot ? `<div class="lootp"><div class="fh"><b>${loot.name}</b><span class="lv">${loot.items.length ? '눌러서 담기 · ★ 의뢰/오늘 목록' : '비었어요'}</span></div>
        <div class="lootlist" id="lootlist">${loot.items.map((k, i) => `<button class="li ${ITEMS[k].val >= 40 ? 'rare' : ''} ${R.want.has(k) ? 'want' : ''}" data-i="${i}">${icon(k)}<small>${ITEMS[k].name}</small><em>${ITEMS[k].val}</em><u>${ITEMS[k].w}×${ITEMS[k].h} · ${ITEMS[k].wt}kg</u></button>`).join('')}</div>
        ${loot.items.length ? '<button class="btn all" id="takeAll">모두 담기</button>' : ''}</div>` : ''}
      <div class="bagrow"><div><div class="fh"><b>가방</b><span class="lv ${wv > cf ? 'warnc' : ''}">${wv.toFixed(1)}/${cf}kg${wv > cf ? ' 느려요' : ''}</span></div><div class="grid" id="gBag" style="--gw:${R.bag.w};--gh:${R.bag.h}"></div></div>
        <div class="side"><div class="fh"><b>안전</b></div><div class="grid safe" id="gSafe" style="--gw:${R.safe.w};--gh:${R.safe.h}"></div>
        ${R.pet ? `<div class="fh"><b>몽이</b><span class="lv">무게 0${R.L.pet.safe ? ' · 지킴' : ''}</span></div><div class="grid pet" id="gPet" style="--gw:${R.pet.w};--gh:${R.pet.h}"></div>` : ''}</div></div>
      <div class="invfoot"><span>가치 <b>${shell(bagValue(R.bag) + bagValue(R.safe) + (R.pet ? bagValue(R.pet) : 0))}</b></span><small class="hint">끌어 옮기기 · 두 번 눌러 돌리기 · 위로 끌면 내려놓기</small><button class="btn close" id="invClose">닫기</button></div>
      <div class="droptip" id="droptip">여기에 놓으면 바닥에 내려놔요</div></div>`;
    this.root.appendChild(el);
    this.fillGrid($('#gBag', el), R.bag); this.fillGrid($('#gSafe', el), R.safe); if (R.pet) this.fillGrid($('#gPet', el), R.pet);
    $('#invClose', el).onclick = () => this.toggleBag(false);
    el.addEventListener('pointerdown', e => { if (e.target === el) this.toggleBag(false); });
    if (loot) {
      el.querySelectorAll('.li').forEach(b => b.onclick = () => { if (R.takeItem(loot, +b.dataset.i)) this.renderInv(); });
      const all = $('#takeAll', el); if (all) all.onclick = () => { let took = 0; const order = loot.items.map((k, i) => i).sort((a, b) => (R.want.has(loot.items[b]) - R.want.has(loot.items[a])) || ITEMS[loot.items[b]].val - ITEMS[loot.items[a]].val);
        const keys = order.map(i => loot.items[i]); for (const k of keys) { const i = loot.items.indexOf(k); if (i >= 0 && R.takeItem(loot, i)) took++; } if (took) this.toast(`${took}개 담았어요!`, 'good'); this.renderInv(); };
    }
  }
  fillGrid(g, bag) {
    const CELL = parseInt(getComputedStyle(g.closest('.inv')).getPropertyValue('--cell'));
    g.innerHTML = Array(bag.w * bag.h).fill('<i class="cell"></i>').join('');
    for (const p of bag.items) {
      const [w, hh] = dims(p.it); const d = ITEMS[p.it.key];
      const it = h('div', 'it' + (d.val >= 40 ? ' rare' : '') + (this.R.want.has(p.it.key) ? ' want' : ''), `${icon(p.it.key, p.it.rot ? 'rot' : '')}<em>${d.val}</em>`); it.style.cssText = `left:${p.x * CELL}px;top:${p.y * CELL}px;width:${w * CELL - 4}px;height:${hh * CELL - 4}px;--c:${d.color}`;
      it.title = d.name; g.appendChild(it); this.dragable(it, p, bag);
    }
  }
  dragable(el, p, bag) {
    const R = this.R; let sx, sy, ghost = null, moved = false;
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); sx = e.clientX; sy = e.clientY; moved = false; el.setPointerCapture(e.pointerId);
      const now = performance.now(); if (now - (this._lastTapAt || 0) < 320 && this._lastTapId === p.it.id) { const t = { ...p.it, rot: !p.it.rot }; if (fits(bag, t, p.x, p.y, p.it.id)) { p.it.rot = !p.it.rot; sfx.rotate(); } else this.toast('그 자리에선 못 돌려요 — 끌어서 빈 곳으로', 'soft'); this._lastTapAt = 0; sx = null; this.renderInv(); return; }
    });
    el.addEventListener('pointermove', e => {
      if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) > 8) { moved = true; ghost = el.cloneNode(true); ghost.classList.add('ghost'); document.body.appendChild(ghost); el.classList.add('lift'); $('#droptip')?.classList.add('show'); }
      if (ghost) { const r = el.getBoundingClientRect(); ghost.style.cssText += `;position:fixed;left:${r.left + dx}px;top:${r.top + dy}px;width:${r.width}px;height:${r.height}px`; }
    });
    const end = () => {
      if (sx == null) return; sx = null; $('#droptip')?.classList.remove('show');
      if (!ghost) { this._lastTapAt = performance.now(); this._lastTapId = p.it.id; return; }
      this._lastTapAt = 0; const gr = ghost.getBoundingClientRect(); ghost.remove(); ghost = null; el.classList.remove('lift');
      const cx = gr.left + 6, cy = gr.top + 6;
      for (const [id, b] of [['#gBag', R.bag], ['#gSafe', R.safe], ['#gPet', R.pet]]) {
        if (!b) continue; const g = $(id); if (!g) continue; const r = g.getBoundingClientRect(); const CELL = r.width / b.w;
        if (cx > r.left - CELL / 2 && cx < r.right && cy > r.top - CELL / 2 && cy < r.bottom) {
          const x = Math.round((gr.left - r.left) / CELL), y = Math.round((gr.top - r.top) / CELL);
          if (b === bag) { if (fits(b, p.it, x, y, p.it.id)) { p.x = x; p.y = y; sfx.ui(); } else this.toast('거기는 자리가 모자라요', 'soft'); }
          else if (fits(b, p.it, x, y, -1)) { remove(bag, p.it); b.items.push({ it: p.it, x, y }); sfx.ui(); }
          else this.toast(b === R.safe ? '안전 칸에 안 맞는 크기예요' : '거기는 자리가 모자라요', 'soft');
          this.renderInv(); return;
        }
      }
      const sheet = $('.invsheet').getBoundingClientRect();
      if (cy < sheet.top + 10 || (this.loot && cy < $('.bagrow').getBoundingClientRect().top)) { remove(bag, p.it); const c = this.loot && this.loot.kind !== 'body' && this.loot.kind !== 'boss' ? this.loot : R.dropItem(p.it); if (c === this.loot) c.items.push(p.it.key); this.loot = c; this.toast(ITEMS[p.it.key].name + ' 내려놨어요', 'soft'); }
      this.renderInv();
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }
  /* ───────── 결과 ───────── */
  result(res, gained) {
    this.clear(); this.root.className = 'scr-result'; const ok = res.outcome === 'extract';
    const list = ok ? [...res.items, ...res.safe, ...res.pet] : [...res.safe, ...(res.petSafe ? res.pet : [])];
    const praise = ok ? (res.value >= 350 ? '전설의 인양! 은신처가 들썩여요' : res.value >= 150 ? '대박 인양!' : res.value >= 60 ? '알찬 인양이었어요' : '무사 귀환이 제일이에요') : res.outcome === 'tide' ? '물이 너무 빨리 찼어요' : '아깝다! 거의 다 왔는데';
    const MP = MAPS[res.map || 'ware']; const zn = MP.zones[res.zoneMax].name; const exitName = res.exit ? MP.exits[res.exit] : '';
    /* v0.5.1 (검수 Top 10): 위 = 머리 · 숫자(가치는 0 → 값으로 0.6초) · 이야기/의뢰 금빛 카드 · 새 기억 조각(카드 뒤집기) · 들어온 것 / 아래 = 버튼 고정 */
    const story = this.app.story; const sh = story?.resultHtml(res) || '';
    const qdone = !story && res.quests?.length ? `<div class="card qdone">${res.quests.map(q => `<div><b>의뢰 완료 · ${q.name}</b><small>${q.unlock ? FACILITIES[q.unlock].name + ' 해금! ' : ''}보상을 받았어요</small></div>`).join('')}</div>` : '';
    const el = h('div', 'result ' + (ok ? 'ok' : 'ko'), `<div class="rscroll">
      <div class="rh"><small>${ok ? '탈출 성공 · ' + exitName : '인양 실패'}</small><h2>${praise}</h2><small class="sub">${MP.icon} ${MP.name}${res.map && res.map !== 'ware' ? ' · ' + CONDS[res.cond].name : ''} · 가장 깊이: ${zn}${res.power ? ' · 전원 복구' : ''}${res.vaultOpened ? ' · 금고실' : ''}${res.minO2 != null ? ` · 최저 산소 ${res.minO2}` : ''}</small></div>
      <div class="rstats"><div class="rval"><b data-n="${ok ? res.value : 0}">${ok ? res.value : 0}</b><small>가져온 가치</small></div><div><b>${res.killN}</b><small>처치${res.kills.boss ? ' (보스!)' : ''}</small></div><div><b>${fmt(res.time)}</b><small>걸린 시간</small></div><div><b>${res.shots ? Math.round(res.hits / res.shots * 100) : 0}%</b><small>명중</small></div></div>
      ${sh}${qdone}
      <div class="card"><div class="fh"><b>${ok ? '창고로 들어온 것' : '지킨 것 (안전 칸)'}</b><span class="lv">${list.length}개</span></div>
        <div class="rlist">${list.length ? list.map((k, i) => `<div class="ri" style="--d:${(0.65 + Math.min(i, 12) * 0.05).toFixed(2)}s">${icon(k)}<small>${ITEMS[k].name}</small></div>`).join('') : '<small class="hint">빈손이에요. 그래도 길을 익혔어요!</small>'}</div>
        ${gained.overflow ? `<small class="hint">창고가 가득 차 ${gained.overflow}개는 바로 조개로 바꿨어요 (+${gained.overflowVal})</small>` : ''}
        ${ok && list.length ? '<small class="hint">은신처 창고 탭에서 팔거나 분해해요</small>' : ''}</div>
      ${!ok && (res.items.length || (!res.petSafe && res.pet.length)) ? `<div class="note warm"><b>가방은 쓰러진 자리에 남았어요</b><br>다음 출격에서 주황 깃발을 찾으면 한 번 되찾을 수 있어요</div>` : ''}
      ${res.corpseTaken ? '<div class="note good">지난번 가방을 되찾았어요!</div>' : ''}</div>
      <div class="rfoot"><div class="bmrow"></div><button class="btn cta" id="home">은신처로</button></div>`);
    this.root.appendChild(el); $('#home', el).onclick = () => { sfx.ui(); this.hideout(); }; BM.resultBm(el, res);
    if (res.quests?.length) setTimeout(() => sfx.rare(), 400);
    this.countUp($('.rval b', el));
    this.app.showHideout(true);
  }
  /* 가치 숫자 올라가기 (0.6초 · 끝에 한 번 소리) */
  countUp(b) {
    const n = +(b?.dataset.n || 0); if (!b || n <= 0) return; const t0 = performance.now(); b.textContent = '0'; b.parentNode.classList.add('counting');
    const step = now => { if (!b.isConnected) return; const k = Math.min(1, (now - t0) / 600); b.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); else { b.parentNode.classList.remove('counting'); b.parentNode.classList.add('landed'); sfx.pick?.(Math.min(9, n / 40)); } };
    requestAnimationFrame(step);
  }
  /* ───────── 알림 ───────── */
  toast(t, kind = '') {
    const box = $('#toasts'); const el = h('div', 'toast ' + kind, t); box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 1900); setTimeout(() => el.remove(), 2300);
  }
  hurtFlash() { const f = $('#hurt'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
}
const RS2 = 8;
