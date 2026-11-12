// 은신처 성장 화면 (M3-A · v0.6) — 시설 카드 · 무기대(무기 10 · 탄약 3 · 개조 5칸) · 장비(5단 · 부적 2칸) · 상인 3 · 업적 · 난이도
//  ui.js 의 탭이 여기를 부름. 글자 목록 대신 그림 · 단계 점 · '다음' 한 구절 · 모자란 것은 빨간 점 (QUALITY_M2 Top 7)
import * as WXUI from './ui_wx.js?v=0.99.37'; /* M4-B 맵 장비 */
import { ITEMS, MATS, FACILITIES, FAC_KEYS, WEAPONS, WEAPON_KEYS, MODS, MOD_KEYS, MK_NAME, GEAR, ROMAN, CRAFTS, MEALS, QUESTS, ENEMIES, ZONES, AMMO, AMMO_KEYS, CHARMS, CHARM_KEYS, DIFF, DIFF_KEYS, MERCHANTS, MERCHANT_KEYS, ACHIEVEMENTS, MAPS } from './data.js?v=0.99.37';
import { S, save } from './save.js?v=0.99.37';
import * as E from './econ.js?v=0.99.37';
import { A } from './assets.js?v=0.99.37';
import { sfx, unlock } from './audio.js?v=0.99.37';
import { COS } from './look.js?v=0.99.37';
import * as BM from './bmflow.js?v=0.99.37';
import * as GL from './goal.js?v=0.99.37'; /* 가까운 목표 (v0.6.1 · 검수 M3 Top 1 · 4) */
import { costChips } from './chips.js?v=0.99.37'; /* 재료 칩 공통 '가진 / 필요' (검수 M3 Top 2) */
import * as M5C from './ui_m5c.js?v=0.99.37'; /* M5-C 무기 19 계열 줄 · 단련 ★ · 반려 2 */
import { fIco, wIco, hasIco } from './icons_m6c.js?v=0.99.37'; /* M6-C 렌더 아이콘 */

const $ = (s, r = document) => r.querySelector(s);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
export const fmt = t => t >= 3600 ? `${Math.floor(t / 3600)}:${String(Math.floor(t % 3600 / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}` : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const dur = s => s >= 3600 ? `${Math.round(s / 360) / 10}시간` : s >= 60 ? `${Math.round(s / 60)}분` : `${Math.max(0, Math.round(s))}초`;
const icon = (k, cls = '') => `<img class="ico ${cls}" src="${A.icons[k] || ''}" alt="${ITEMS[k]?.name || ''}" draggable="false">`;
const shell = n => `<span class="shell"></span>${n}`;
const mat = (k, n) => `<span class="mat" style="--c:${MATS[k].color}"></span>${n}`;
const pct = x => Math.round(x * 100) + '%';
const dots = (n, max, cls = '') => `<span class="ldots ${cls}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
export const WHY2 = { forge: '정밀 공방 단계가 모자라요', petcap: '시설을 더 지어야 커요', noweapon: '무기가 없어요', cost: '재료가 모자라요', bench: '작업대 단계가 모자라요', rack: '무기대 단계가 모자라요', busy: '공사는 한 번에 하나씩', locked: '아직 잠겨 있어요', fac: '시설이 필요해요', full: '창고가 가득', have: '이미 요리가 있어요', max: '최고 단계', owned: '이미 있어요', soldout: '오늘은 다 팔렸어요', slot: '이 무기엔 그 칸이 없어요' };
/* 모자란 것: 빨간 점 + 개수 (조개로 채울 수 있으면 주황) */
/* v0.6.1 (검수 M3 Top 1): 빨간 점 대신 진행 막대 + % (조개로 채울 수 있으면 주황) */
function lackDots(cost) {
  const L = E.lack(S, cost); const n = Object.keys(L).length; if (!n) return '<span class="lk ok">✓ 지을 수 있어요</span>';
  const lp = E.lackPrice(S, cost); const k = GL.progressOf(S, cost);
  return `<span class="lk ${lp.ok ? 'buy' : 'no'}"><span class="lkbar"><i style="width:${Math.round(k * 100)}%"></i></span>${lp.ok ? `조개로 +${lp.price}` : `${Math.round(k * 100)}% · ${n}가지`}</span>`;
}
/* 시설 탭 맨 위 '가장 가까운 공사' 한 줄: 진행 막대 · 판에서 찾아올 것과 나오는 상자 · 고물상 '모자란 것 사기' */
function nearHtml() {
  const nb = GL.nearestBuild(S); if (!nb) return '';
  const F = FACILITIES[nb.f]; const lp = nb.lp; const parts = Object.keys(nb.lack).filter(m => m !== 'shells' && !(m in MATS));
  const act = nb.st === 'ready' ? `<button class="btn sm ${S.build ? '' : 'cta'}" id="nbGo">${S.build ? '보기' : '짓기'}</button>`
    : lp.ok ? `<button class="btn sm" id="nbBuy">모자란 것 사기 ${shell(lp.price)}</button>`
    : lp.can ? `<button class="btn sm dim" id="nbBuy" disabled>조개 ${((nb.nx.cost.shells || 0) + lp.price - S.shells).toLocaleString('ko-KR')} 더</button>` : '';
  const where = nb.st === 'ready' ? `<small class="nbw"><b>재료가 다 모였어요 ✓</b>${S.build ? ` · ${FACILITIES[S.build.k].name} 공사가 끝나면 바로` : ''}</small>` : nb.key ? `<small class="nbw">${parts.length ? '판에서' : '찾아오기'} · <b>${E.costName(nb.key.item)} ${nb.key.n}</b>${nb.key.src ? ` — ${nb.key.src}` : ''}${nb.key.buy ? ' · 고물상에도 있어요' : ''}</small>` : nb.shellsLack ? `<small class="nbw">조개 ${nb.shellsLack.toLocaleString('ko-KR')} 모자람 — 보물을 팔거나 한 판 더</small>` : '';
  return `<div class="nearb" data-k="${nb.f}"><div class="nbh">${facArt(nb.f)}<span><small>가장 가까운 공사</small><b>${F.name} ${nb.lv}단계</b><em>${nb.nx.short || ''}</em></span><b class="nbp">${Math.round(nb.k * 100)}%</b></div>
    <span class="nbar"><i style="width:${Math.round(nb.k * 100)}%"></i></span><div class="cost nbc">${costChips(nb.nx.cost)}</div><div class="nbf">${where}${act}</div></div>`;
}

/* ───── 시설 그림 (단순한 평면 그림 · 카드 색 = tint) ───── */
const ART = {
  bench: '<rect x="8" y="34" width="48" height="8" rx="2"/><rect x="12" y="42" width="5" height="14" rx="1"/><rect x="47" y="42" width="5" height="14" rx="1"/><path d="M22 30l14-14 4 4-14 14z" fill="#fff8" /><circle cx="42" cy="15" r="6" fill="none" stroke="#fff8" stroke-width="4"/>',
  store: '<rect x="10" y="30" width="20" height="20" rx="2"/><rect x="32" y="30" width="20" height="20" rx="2" opacity=".8"/><rect x="21" y="10" width="20" height="20" rx="2" opacity=".9"/><path d="M10 40h20M32 40h20M21 20h20" stroke="#0004" stroke-width="2"/>',
  rack: '<rect x="8" y="10" width="48" height="44" rx="4" opacity=".35"/><path d="M14 24h30l6-3v6l-6-3M14 40h24l8-2v4l-8-2" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="18" cy="24" r="3" fill="#fff"/>',
  clinic: '<rect x="12" y="18" width="40" height="32" rx="6"/><rect x="24" y="12" width="16" height="8" rx="3" opacity=".7"/><path d="M32 24v20M22 34h20" stroke="#fff" stroke-width="6" stroke-linecap="round"/>',
  lab: '<path d="M24 10h12v14l12 22a4 4 0 0 1-4 6H20a4 4 0 0 1-4-6l12-22V10z"/><path d="M20 40h24" stroke="#fff8" stroke-width="3"/><circle cx="28" cy="46" r="2.5" fill="#fff"/><circle cx="36" cy="44" r="2" fill="#fff"/>',
  kitchen: '<path d="M12 30h40v14a8 8 0 0 1-8 8H20a8 8 0 0 1-8-8z"/><rect x="8" y="28" width="48" height="5" rx="2" opacity=".8"/><path d="M24 22q-4-6 0-12M32 22q-4-6 0-12M40 22q-4-6 0-12" stroke="#fff8" stroke-width="3" fill="none" stroke-linecap="round"/>',
  aquarium: '<rect x="8" y="14" width="48" height="38" rx="5" opacity=".45"/><path d="M8 26q8-4 16 0t16 0t16 0v20a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6z"/><ellipse cx="30" cy="38" rx="9" ry="6" fill="#fff"/><circle cx="37" cy="35" r="3" fill="#fff"/><circle cx="38" cy="34" r="1" fill="#000"/>',
  lights: '<circle cx="32" cy="28" r="12"/><rect x="26" y="40" width="12" height="10" rx="2" opacity=".8"/><path d="M32 6v6M12 28h6M46 28h6M17 13l4 4M47 13l-4 4" stroke="#fff8" stroke-width="3" stroke-linecap="round"/>',
  ammo: '<rect x="10" y="30" width="44" height="22" rx="3"/><path d="M18 30V14l4-6 4 6v16M30 30V14l4-6 4 6v16M42 30V14l4-6 4 6v16" fill="#fff8"/><rect x="10" y="36" width="44" height="4" opacity=".4" fill="#000"/>',
  gym: '<path d="M4 42q7-6 14 0t14 0t14 0t14 0v14H4z"/><circle cx="34" cy="24" r="6" fill="#fff"/><path d="M22 36q8-10 22-6" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>',
  shelf: '<rect x="8" y="10" width="48" height="44" rx="3" opacity=".35"/><path d="M8 30h48M8 50h48" stroke="#fff6" stroke-width="3"/><rect x="14" y="16" width="8" height="13" rx="3"/><circle cx="32" cy="23" r="6"/><path d="M42 29l5-12 5 12z"/><rect x="16" y="38" width="10" height="11" rx="2"/><circle cx="40" cy="44" r="5"/>',
  dock: '<path d="M4 46q7-5 14 0t14 0t14 0t14 0v10H4z" opacity=".6"/><path d="M14 38h36l-6 8H20z"/><path d="M30 38V10l14 22H30" fill="#fff8"/>',
  /* M5-C 정밀 공방(모루 · 모루대 + 망치 + 불티) · 반려 쉼터(바구니 + 발자국) */
  forge: '<path d="M12 36h40l-6 8H18z"/><rect x="22" y="44" width="20" height="10" rx="2" opacity=".8"/><path d="M38 12l10 10-4 4-10-10z" fill="#fff"/><path d="M41 21l-14 14" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="20" cy="28" r="2" fill="#ffd27a"/><circle cx="26" cy="22" r="1.6" fill="#ffd27a"/><circle cx="16" cy="20" r="1.4" fill="#ffd27a"/>',
  den: '<path d="M8 36h48l-5 16a4 4 0 0 1-4 3H17a4 4 0 0 1-4-3z"/><path d="M8 36q24-8 48 0" stroke="#fff8" stroke-width="3" fill="none"/><ellipse cx="32" cy="20" rx="6" ry="5" fill="#fff"/><circle cx="23" cy="13" r="3" fill="#fff"/><circle cx="29" cy="9" r="3" fill="#fff"/><circle cx="35" cy="9" r="3" fill="#fff"/><circle cx="41" cy="13" r="3" fill="#fff"/>',
};
export const facArt = (k, cls = '') => hasIco('f_' + k) ? `<span class="fart m6f ${cls}" style="--c:${FACILITIES[k].tint || '#8fa6ae'}">${fIco(k)}</span>` /* M6-C Blender 렌더 아이콘 (없으면 아래 SVG) */
  : `<span class="fart ${cls}" style="--c:${FACILITIES[k].tint || '#8fa6ae'}"><svg viewBox="0 0 64 64" fill="var(--c)">${ART[k] || ART.store}</svg></span>`;

/* ───── 시설 탭: 그림 카드 2열 · 누르면 자세히 ───── */
export function tabFac(ui, body) {
  const order = GL.facOrder(S); /* 공사 중 → 바로 지음 → 조개로 → '거의 됨' 순 → 잠김 → 최고 (v0.6.1) */
  const built = FAC_KEYS.reduce((s, k) => s + E.facLvl(S, k), 0), max = FAC_KEYS.reduce((s, k) => s + FACILITIES[k].levels.length, 0);
  body.innerHTML = `${nearHtml()}<div class="facsum"><b>초소 살림</b>${dots(Math.round(built / max * 10), 10, 'wide')}<small>${built}/${max}단계</small></div>
    <div class="fgrid">${order.map(k => {
      const F = FACILITIES[k], lv = E.facLvl(S, k), nx = E.facNext(S, k), un = E.facUnlocked(S, k), building = S.build?.k === k;
      const left = building ? Math.max(0, (S.build.until - Date.now()) / 1000) : 0;
      const foot = !un ? `<span class="lk lock">🔒 ${lockTxt(k)}</span>` : building ? `<span class="lk busy"><b class="buildt">${fmt(left)}</b> 공사 중</span>` : nx ? lackDots(nx.cost) : '<span class="lk max">최고 단계</span>';
      return `<button class="fcard ${un ? '' : 'locked'} ${building ? 'building' : ''} ${nx && un && !building && E.canPay(S, nx.cost) && !S.build ? 'ready' : ''}" data-k="${k}">
        ${facArt(k)}<span class="fct"><b>${F.name}</b>${dots(lv, F.levels.length)}<small>${nx && un ? '다음 · ' + (nx.short || nx.txt) : lv ? (E.facCur(S, k).short || '') : F.desc}</small></span>${foot}
        ${building ? `<i class="bprog" style="--p:${1 - left / (nx?.time || 1)}"></i>` : ''}</button>`; }).join('')}</div>
    ${S.build ? `<div class="instrow"><small>${FACILITIES[S.build.k].name} 공사 중</small><div class="instbox"></div></div>` : '<small class="hint">공사는 한 번에 하나 · 시간이 지나면 저절로 끝나요 (게임을 꺼 둬도)</small>'}`;
  body.querySelectorAll('.fcard').forEach(b => b.onclick = () => { sfx.ui(); facSheet(ui, b.dataset.k); });
  const nb = $('.nearb', body); if (nb) { nb.onclick = e => { if (e.target.closest('button')) return; sfx.ui(); facSheet(ui, nb.dataset.k); };
    $('#nbGo', nb) && ($('#nbGo', nb).onclick = () => { sfx.ui(); facSheet(ui, nb.dataset.k); });
    $('#nbBuy', nb) && ($('#nbBuy', nb).onclick = () => { unlock(); const nx = E.facNext(S, nb.dataset.k); const p = E.lackPrice(S, nx.cost).price;
      if (!E.buyLack(S, nx.cost)) { sfx.empty(); return ui.toast('조개가 모자라요', 'soft'); } save(); sfx.ui(); ui.toast(`곰방 고물상에서 샀어요 — 조개 −${p}`, 'good'); ui.hideout(); }); }
  BM.bindInst(body);
}
function lockTxt(k) {
  const F = FACILITIES[k]; if (F.unlock && !S.quests.done.includes(F.unlock)) { const q = QUESTS.find(q => q.id === F.unlock); return `의뢰 '${q?.name || F.unlock}'`; }
  const r = F.req || {}; if (r.fac && E.facLvl(S, r.fac[0]) < r.fac[1]) return `${FACILITIES[r.fac[0]].name} ${r.fac[1]}단계`; if (r.map && !E.mapOpen(S, r.map)) return `${MAPS[r.map].name} 열기`; return '';
}
export function facSheet(ui, k) {
  const F = FACILITIES[k], lv = E.facLvl(S, k), nx = E.facNext(S, k), un = E.facUnlocked(S, k), cur = E.facCur(S, k), building = S.build?.k === k;
  const lp = nx ? E.lackPrice(S, nx.cost) : null; const can = nx && E.canPay(S, nx.cost);
  const m = h('div', 'modal', `<div class="sheet fsheet">${facArt(k, 'big')}<h3>${F.name} ${dots(lv, F.levels.length)}</h3><small class="hint">${F.desc}</small>
    <ol class="flv">${F.levels.map((L, i) => `<li class="${i < lv ? 'done' : i === lv ? 'next' : ''}"><b>${i + 1}</b><span>${L.txt}</span>${L.time && i >= lv ? `<small>${dur(L.time)}</small>` : ''}</li>`).join('')}</ol>
    ${!un ? `<div class="note warm">🔒 ${lockTxt(k)} — 하면 열려요</div>` : building ? `<div class="note good">공사 중 · <b class="buildt">${fmt(Math.max(0, (S.build.until - Date.now()) / 1000))}</b> 남음</div><div class="instbox"></div>`
      : nx ? `<div class="cost">${costChips(nx.cost)}</div><button class="btn cta ${S.build ? 'dim' : can || lp.ok ? '' : 'dim'}" id="fBuild">${lv ? '올리기' : '짓기'} · ${dur(nx.time || 0)}${!can && lp.ok ? `<small>(모자란 재료 조개 +${lp.price})</small>` : ''}</button>${S.build ? '<small class="hint">다른 공사가 끝나면 지을 수 있어요</small>' : ''}` : '<div class="note good">최고 단계예요</div>'}
    <button class="btn" id="fClose">닫기</button></div>`);
  ui.root.appendChild(m); BM.bindInst(m);
  const close = () => { m.remove(); ui.hideout(); };
  $('#fClose', m).onclick = close; m.onclick = e => { if (e.target === m) close(); };
  $('#fBuild', m) && ($('#fBuild', m).onclick = () => { unlock(); if (!E.canPay(S, nx.cost) && lp.ok) E.buyLack(S, nx.cost);
    const r = E.startBuild(S, k); if (!r.ok) { ui.toast(WHY2[r.why] || '지금은 안 돼요', 'soft'); return sfx.empty(); }
    save(); sfx.build(); ui.toast(r.done ? `${F.name} 완성!` : `${F.name} 공사 시작 — ${dur(nx.time)} 뒤 완성`, 'good'); close(); });
}

/* ───── 무기대: 무기 10 (2줄) · 탄약 · 개조 5칸 ───── */
export function tabGun(ui, body) {
  const wk = ui.wsel && WEAPONS[ui.wsel] ? ui.wsel : (ui.wsel = S.equip.main); const W = WEAPONS[wk]; const own = S.weapons[wk]; const ws = E.weaponStats(wk, own || undefined, E.starOf(S, wk));
  const rack = E.facCur(S, 'rack'); const mk = E.rackMk(S);
  const killT = st => [['drone', 2, 10], ['skel', 2, 4.5], ['boss', 3, 8]].map(([k, z, d]) => { const hp = k === 'boss' ? ENEMIES.boss.hp : ENEMIES[k].hp * ZONES[z].hp; const r = E.ttk(st, hp / (k === 'boss' ? st.boss || 1 : 1), d); return { k, t: r.t, hit: r.hit }; });
  const kt = killT(ws); const acc = W.melee ? 1 : E.ttk(ws, 400, 10).hit;
  const cone = (sp, mx) => { if (W.melee) { const L = 60, a = (W.arc || 1.6) / 2; const p = a2 => `${(L * Math.sin(a2)).toFixed(1)},${(-L * Math.cos(a2)).toFixed(1)}`; return `<svg viewBox="-60 -100 120 104" class="cone"><path d="M0,0 L${p(-a)} A${L},${L} 0 0 1 ${p(a)} Z" class="c1"/><circle cx="0" cy="0" r="4" class="me"/></svg>`; }
    const L = 92; const p = a => `${(L * Math.sin(a)).toFixed(1)},${(-L * Math.cos(a)).toFixed(1)}`;
    return `<svg viewBox="-60 -100 120 104" class="cone"><path d="M0,0 L${p(-mx)} A${L},${L} 0 0 1 ${p(mx)} Z" class="c2"/><path d="M0,0 L${p(-sp)} A${L},${L} 0 0 1 ${p(sp)} Z" class="c1"/><circle cx="0" cy="${-L * 0.86}" r="${(0.62 / 7 * L).toFixed(1)}" class="tg"/><circle cx="0" cy="0" r="4" class="me"/></svg>`; };
  const sides = rack?.side; const isMain = S.equip.main === wk, isSide = S.equip.side === wk;
  const modN = own ? W.slots.reduce((s, m) => s + Math.min(3, own[m] || 0), 0) : 0;
  const bench = E.facLvl(S, 'bench');
  body.innerHTML = `
    ${M5C.wselHtml(ui, wk)}
    <div class="wcard">
      <div class="fh"><b style="display:flex;align-items:center">${wIco(wk, 'wico')}${W.name}</b><span class="lv">${own ? `개조 ${modN}/${W.slots.length * 3}` : '아직 없음'}</span></div>
      <div class="role" style="--c:${W.color}">${W.role}</div><small class="hint">${W.desc}</small>
      <div class="wgrid">${cone(ws.spread, ws.max)}
        <div class="wstats">
          <div><span>파워</span><b>${Math.round(ws.dmg)}${ws.pellets > 1 ? '×' + ws.pellets : ''}${W.chain ? ' ⚡' : ''}${W.blast ? ' 💥' : ''}</b></div>
          <div><span>${W.melee ? '휘두름' : '정확도(10m)'}</span><b>${W.melee ? `${ws.rate.toFixed(1)}/초 · ${Math.round(W.arc * 57)}°` : pct(acc)}</b></div>
          <div><span>약점</span><b>${pct(ws.crit)}</b></div>
          <div><span>${W.melee ? '닿는 거리' : '사거리'}</span><b>${ws.range.toFixed(1)}m</b></div>
          <div><span>장탄</span><b>${W.melee ? '탄 없음' : `${ws.mag}발 · ${ws.reload.toFixed(1)}초`}</b></div>
          <div><span>소리</span><b>${ws.noise < 6 ? '조용' : ws.noise < 13 ? '보통' : '큼'}</b></div>
        </div></div>
      <div class="ttk">${kt.map(x => `<span><small>${ENEMIES[x.k].name} ${x.k === 'drone' ? '10m' : x.k === 'skel' ? '근접' : ''}</small><b>${isFinite(x.t) ? x.t.toFixed(1) + '초' : '닿지 않음'}</b></span>`).join('')}</div>
      ${own ? `<div class="wbtns"><button class="btn sm ${isMain ? 'on' : ''}" id="eqMain">${isMain ? '주무기 ✓' : '주무기로'}</button>${sides ? `<button class="btn sm ${isSide ? 'on' : ''}" id="eqSide">${isSide ? '보조 ✓ (빼기)' : '보조 무기로'}</button>` : '<small class="hint">무기대 2단계에서 보조 무기 칸</small>'}</div>`
      : `<div class="craft"><div class="cost">${costChips(W.cost)}</div><button class="btn ${bench >= W.bench ? '' : 'dim'}" id="mkW">${bench >= W.bench ? '제작' : `작업대 ${W.bench}단계 필요`}</button></div>`}
    </div>
    ${ammoHtml()}
    ${own ? `<div class="sec">개조 <small>무기대 ${mk ? mk + '단계' : '없음'} · 특수 부품은 4단계 · 보스 보물로</small></div><div class="mods">${W.slots.map(m => modRow(wk, m, own, ws, kt, acc, killT)).join('')}</div>` : ''}
    ${M5C.starHtml(wk)}`;
  body.querySelectorAll('.wsel button').forEach(b => b.onclick = () => { sfx.ui(); ui.wsel = b.dataset.w; ui.hideout(); });
  M5C.bindWsel(ui, body); M5C.bindStar(ui, body, wk, why);
  $('#mkW', body) && ($('#mkW', body).onclick = () => { let r = E.craftWeapon(S, wk); if (!r.ok && r.why === 'cost' && E.lackPrice(S, W.cost).ok) { E.buyLack(S, W.cost); r = E.craftWeapon(S, wk); } if (!r.ok) return why(ui, r); save(); sfx.build(); ui.toast(`${W.name} 완성!`, 'good'); ui.hideout(); });
  $('#eqMain', body) && ($('#eqMain', body).onclick = () => { if (S.equip.side === wk) S.equip.side = null; S.equip.main = wk; save(); sfx.ui(); ui.hideout(); });
  $('#eqSide', body) && ($('#eqSide', body).onclick = () => { if (isSide) S.equip.side = null; else { if (S.equip.main === wk) return ui.toast('주무기는 보조로 못 해요', 'soft'); S.equip.side = wk; } save(); sfx.ui(); ui.hideout(); });
  body.querySelectorAll('.mods [data-m]').forEach(b => b.onclick = () => { const m = b.dataset.m; const c = E.modCost(wk, m, (own[m] || 0) + 1); let r = E.upgradeMod(S, wk, m);
    if (!r.ok && r.why === 'cost' && E.lackPrice(S, c).ok) { E.buyLack(S, c); r = E.upgradeMod(S, wk, m); }
    if (!r.ok) return why(ui, r); save(); sfx.build(); ui.toast(`${own[m] === 4 ? MODS[m].sp.name : MODS[m].name + ' ' + MK_NAME[own[m]]}! ${MODS[m].fx[own[m]]}`, 'good'); ui.hideout(); });
  bindAmmo(ui, body);
}
function modRow(wk, m, own, ws, kt, acc, killT) {
  const M = MODS[m]; const cur = own[m] || 0; const nx = cur + 1; const c = nx <= 4 ? E.modCost(wk, m, nx) : null; const mk = E.rackMk(S); const W = WEAPONS[wk];
  let prev = '';
  if (c) { const after = E.weaponStats(wk, { ...own, [m]: nx }); const ka = killT(after); const aa = W.melee ? 1 : E.ttk(after, 400, 10).hit;
    prev = m === 'scope' ? `정확도 ${pct(acc)} → <b>${pct(aa)}</b> · 약점 ${pct(ws.crit)} → <b>${pct(after.crit)}</b>`
      : m === 'chamber' ? `파워 ${Math.round(ws.dmg)} → <b>${Math.round(after.dmg)}</b> · 해골 ${kt[1].t.toFixed(1)} → <b>${ka[1].t.toFixed(1)}초</b>`
      : m === 'mag' ? `장탄 ${ws.mag} → <b>${after.mag}</b> · 수문지기 ${kt[2].t.toFixed(1)} → <b>${ka[2].t.toFixed(1)}초</b>`
      : m === 'grip' ? (W.melee ? `휘두름 ${ws.rate.toFixed(2)} → <b>${after.rate.toFixed(2)}/초</b>` : `연사 퍼짐 ${(ws.max * 57).toFixed(1)}° → <b>${(after.max * 57).toFixed(1)}°</b> · 드론 ${kt[0].t.toFixed(1)} → <b>${ka[0].t.toFixed(1)}초</b>`)
      : `${W.melee ? '닿는 거리' : '사거리'} ${ws.range.toFixed(1)} → <b>${after.range.toFixed(1)}m</b>${nx === 4 ? ' · 소리 −55%' : ''}`; }
  const btn = !c ? '' : nx === 4 ? `<button class="btn sm sp ${mk >= 4 ? '' : 'dim'}" data-m="${m}">${mk >= 4 ? '특수 부품' : '무기대 4단계'}</button>` : `<button class="btn sm ${mk >= nx ? '' : 'dim'}" data-m="${m}">${mk >= nx ? `Mk${nx} 개조` : mk ? `무기대 ${nx}단계` : '무기대 필요'}</button>`;
  return `<div class="mrow ${cur === 4 ? 'sp' : ''}"><div class="mh"><b>${cur === 4 ? M.sp.name : M.name}</b><small>${M.stat}</small><span class="pips2">${[1, 2, 3, 4].map(i => `<i class="${i <= cur ? 'on' : ''} ${i === 4 ? 's' : ''}"></i>`).join('')}</span></div>
    <small>${M.fx[cur]}</small>${c ? `<small class="prev">${nx === 4 ? `<em>${M.sp.name}</em> · ` : ''}${prev}</small><div class="mfoot"><div class="cost">${costChips(c)}</div>${btn}</div>` : '<small class="max">최고 단계</small>'}</div>`;
}
function why(ui, r) { ui.toast(WHY2[r.why] || '지금은 안 돼요', 'soft'); sfx.empty(); }
/* 탄약 줄 (무기 탭 · 출격 준비 같이 씀) */
export function ammoHtml(compact = false) {
  const F = E.facCur(S, 'ammo'); const sel = E.ammoReady(S);
  return `<div class="ammobox ${compact ? 'compact' : ''}"><div class="sec">작살촉 <small>${compact ? '이번 판 · 상자 1개' : '출격마다 상자 1개 · 근접 무기는 상관없음'}</small></div><div class="ammorow">${AMMO_KEYS.map(k => { const A2 = AMMO[k]; const n = k === 'normal' ? '∞' : E.ammoCount(S, k);
    return `<button class="am ${sel === k ? 'on' : ''} ${k !== 'normal' && !E.ammoCount(S, k) ? 'none' : ''}" data-am="${k}" style="--c:${A2.color}"><b>${A2.short}</b><small>${n}</small></button>`; }).join('')}</div>
    ${compact ? '' : `<small class="hint">${AMMO[sel].txt}</small><div class="ammocraft">${['ap', 'sp'].map(k => { const ok = F && F.ammo >= AMMO[k].fac; return `<div class="grow"><div><b>${AMMO[k].name} 상자 <small>보유 ${E.ammoCount(S, k)}</small></b><div class="cost">${costChips(AMMO[k].cost)}</div></div><button class="btn sm ${ok ? '' : 'dim'}" data-amk="${k}">${ok ? `만들기${F.twice ? ' ×2' : ''}` : `탄약대 ${AMMO[k].fac}단계`}</button></div>`; }).join('')}</div>`}</div>`;
}
export function bindAmmo(ui, root, after) {
  root.querySelectorAll('[data-am]').forEach(b => b.onclick = () => { const k = b.dataset.am; if (k !== 'normal' && !E.ammoCount(S, k)) { ui.toast('상자가 없어요 — 탄약대에서 만들거나 모루 공방에서 사요', 'soft'); return sfx.empty(); } S.ammoSel = k; save(); sfx.ui(); (after || (() => ui.hideout()))(); });
  root.querySelectorAll('[data-amk]').forEach(b => b.onclick = () => { const k = b.dataset.amk; let r = E.craftAmmo(S, k); if (!r.ok && r.why === 'cost' && E.lackPrice(S, AMMO[k].cost).ok) { E.buyLack(S, AMMO[k].cost); r = E.craftAmmo(S, k); } if (!r.ok) return why(ui, r); save(); sfx.pick(3); ui.toast(`${AMMO[k].name} 상자 +${r.n}`, 'good'); ui.hideout(); });
}

/* ───── 장비: 5단 · 부적 2칸 · 소모품 · 요리 ───── */
export function tabGear(ui, body) {
  const kl = E.facCur(S, 'kitchen')?.meal || 0; const bench = E.facLvl(S, 'bench'); const slots = E.charmSlots(S); const eq = (S.charms?.eq || []).slice(0, slots);
  body.innerHTML = `
    ${M5C.petHtml()}
    <div class="sec">장비 <small>한 번 만들면 계속 · 쓰러져도 안 잃어요</small></div>
    ${Object.entries(GEAR).map(([g, G]) => { const cur = S.gear[g]; const nx = G.tiers[cur + 1];
      return `<div class="grow gearrow"><div><b>${G.name} ${ROMAN[cur] || ''} ${dots(cur, G.tiers.length - 1)}</b><small>${G.tiers[cur].txt}</small>${nx ? `<small class="next">다음: ${nx.txt}</small><div class="cost">${costChips(nx.cost)}</div>` : ''}</div>
        ${nx ? `<button class="btn sm ${bench >= nx.bench ? '' : 'dim'}" data-g="${g}">${bench >= nx.bench ? '제작' : `작업대 ${nx.bench}단계`}</button>` : '<small class="max">최고</small>'}</div>`; }).join('')}
    ${WXUI.gearHtml()}
    <div class="sec">부적 <small>${slots ? `${slots}칸 · 건져 온 이야기 물건으로 만들어요` : '기억 진열장을 지으면 열려요'}</small></div>
    <div class="cslots">${[0, 1].map(i => { const k = eq[i]; return `<div class="cslot ${i < slots ? '' : 'lock'}">${k ? `<b>${CHARMS[k].name}</b><small>${CHARMS[k].txt}</small>` : `<small>${i < slots ? '빈 칸' : i === 0 ? '진열장 1단계' : '진열장 2단계'}</small>`}</div>`; }).join('')}</div>
    <div class="cgrid">${CHARM_KEYS.map(k => { const C = CHARMS[k]; const have = E.charmHave(S, k), can = E.charmCan(S, k), on = eq.includes(k);
      return `<button class="ch ${have ? 'have' : can ? 'can' : 'lock'} ${on ? 'on' : ''}" data-ch="${k}"><i>${have ? (on ? '◆' : '◇') : can ? '+' : '?'}</i><b>${have || can ? C.name : '???'}</b><small>${have || can ? C.txt : C.from}</small></button>`; }).join('')}</div>
    <div class="sec">소모품 <small>출격 준비에서 가방에 넣어 가요</small></div>
    ${Object.entries(CRAFTS).map(([k, C]) => { const ok = E.facLvl(S, C.fac) >= C.lv; return `<div class="grow"><div class="gi">${icon(k)}</div><div><b>${ITEMS[k].name} <small>보유 ${E.count(S, k)}</small></b><small>${ITEMS[k].desc}</small><div class="cost">${costChips(C.cost)}</div></div>
        <button class="btn sm ${ok ? '' : 'dim'}" data-c="${k}">${ok ? '만들기' : `${FACILITIES[C.fac].name} ${C.lv}`}</button></div>`; }).join('')}
    ${kl ? `<div class="sec">주방 <small>다음 출격 한 번 · 하나만</small></div>
      ${S.meal ? `<div class="note good">${MEALS[S.meal].name} 준비됨 — ${MEALS[S.meal].txt}</div>` : Object.entries(MEALS).map(([k, M]) => `<div class="grow"><div><b>${M.name}</b><small>${M.txt}</small><div class="cost">${costChips(M.cost)}</div></div><button class="btn sm ${kl >= M.lv ? '' : 'dim'}" data-meal="${k}">${kl >= M.lv ? '요리' : `주방 ${M.lv}`}</button></div>`).join('')}` : ''}`;
  body.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const g = b.dataset.g; const c = GEAR[g].tiers[S.gear[g] + 1].cost; let r = E.craftGear(S, g); if (!r.ok && r.why === 'cost' && E.lackPrice(S, c).ok) { E.buyLack(S, c); r = E.craftGear(S, g); } if (!r.ok) return why(ui, r); save(); sfx.build(); ui.toast(`${GEAR[g].name} ${ROMAN[S.gear[g]]}! ${GEAR[g].tiers[S.gear[g]].txt}`, 'good'); ui.hideout(); });
  WXUI.gearBind(ui, body); /* M4-B 맵 장비 */
  body.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const r = E.craftItem(S, b.dataset.c, 1); if (!r.ok) return why(ui, r); save(); sfx.pick(3); ui.toast(`${ITEMS[b.dataset.c].name} +1`, 'good'); ui.hideout(); });
  body.querySelectorAll('[data-meal]').forEach(b => b.onclick = () => { const r = E.cook(S, b.dataset.meal); if (!r.ok) return why(ui, r); save(); sfx.build(); ui.toast(`${MEALS[b.dataset.meal].name} 완성! 다음 출격에 효과`, 'good'); ui.hideout(); });
  body.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { sfx.ui(); charmSheet(ui, b.dataset.ch); });
  M5C.bindPets(ui, body, why); /* M5-C 반려 키우기 */
}
function charmSheet(ui, k) {
  const C = CHARMS[k]; const have = E.charmHave(S, k), can = E.charmCan(S, k), on = (S.charms?.eq || []).includes(k); const slots = E.charmSlots(S);
  const m = h('div', 'modal', `<div class="sheet item"><h3>${have || can ? C.name : '아직 모르는 부적'}</h3>
    ${have || can ? `<p class="story">"${C.story}"</p><div class="note good">${C.txt}${(E.facCur(S, 'shelf')?.charmMul || 1) > 1 ? ' · 진열장 3단계 ×1.5' : ''}</div>` : `<p>${C.from}${josa2(C.from)} 건져 오면 진열장에서 만들 수 있어요</p>`}
    ${!have && can ? `<div class="cost">${costChips(C.cost)}</div>` : ''}
    <div class="sbtns">${have ? `<button class="btn cta" id="cOn">${on ? '빼기' : slots ? '달기' : '진열장이 필요해요'}</button>` : can ? `<button class="btn cta ${slots ? '' : 'dim'}" id="cMk">${slots ? '만들기' : '기억 진열장이 필요해요'}</button>` : ''}<button class="btn" id="cClose">닫기</button></div></div>`);
  ui.root.appendChild(m); const close = () => { m.remove(); ui.hideout(); };
  $('#cClose', m).onclick = close; m.onclick = e => { if (e.target === m) close(); };
  $('#cOn', m) && ($('#cOn', m).onclick = () => { const r = E.equipCharm(S, k); if (!r.ok) return why(ui, r); save(); sfx.ui(); close(); });
  $('#cMk', m) && ($('#cMk', m).onclick = () => { let r = E.craftCharm(S, k); if (!r.ok && r.why === 'cost' && E.lackPrice(S, C.cost).ok) { E.buyLack(S, C.cost); r = E.craftCharm(S, k); } if (!r.ok) return why(ui, r); save(); sfx.rare(); ui.toast(`부적 '${C.name}' — ${C.txt}`, 'good'); close(); });
}
const josa2 = w => { const c = (w || '').charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c % 28 ? '을' : '를'; };

/* ───── 상인 3 ───── */
const face = id => `<span class="mface" style="--c:${MERCHANTS[id].tint}"><img src="assets/story/${MERCHANTS[id].who}_base.webp" alt="" draggable="false" onerror="this.remove()"></span>`;
export function tabShop(ui, body) {
  const mk = ui.msel && MERCHANTS[ui.msel] && E.merchOpen(S, ui.msel) ? ui.msel : (ui.msel = 'gombang'); const M = MERCHANTS[mk];
  const reqTxt = r => r?.fac ? `${FACILITIES[r.fac[0]].name} ${r.fac[1]}단계` : '';
  const stock = E.stockToday(S, mk); const want = mk === 'baram' ? E.wantToday(S) : null;
  const sellable = [...new Set(S.stash)].filter(k => E.sellPriceAt(S, mk, k) != null && ITEMS[k].cat !== 'memo').sort((a, b) => E.sellPriceAt(S, mk, b) - E.sellPriceAt(S, mk, a));
  const name = o => o.kind === 'mat' ? `${MATS[o.k].name} ×${o.n}` : o.kind === 'ammo' ? `${AMMO[o.k].name} 상자` : o.kind === 'cos' ? `꾸미기 · ${COS[o.k]?.name}` : ITEMS[o.k].name;
  const pic = o => o.kind === 'mat' ? `<span class="matbig" style="--c:${MATS[o.k].color}"></span>` : o.kind === 'item' ? icon(o.k) : o.kind === 'ammo' ? `<span class="ambig" style="--c:${AMMO[o.k].color}">${AMMO[o.k].short}</span>` : `<span class="cosbig" style="--c:${COS[o.k]?.sw || '#aaa'}"></span>`;
  body.innerHTML = `<div class="msel">${MERCHANT_KEYS.map(k => { const on = E.merchOpen(S, k); return `<button data-mk="${k}" class="${k === mk ? 'on' : ''} ${on ? '' : 'locked'}">${face(k)}<b>${MERCHANTS[k].name}</b><small>${on ? MERCHANTS[k].role : '🔒 ' + reqTxt(MERCHANTS[k].req)}</small></button>`; }).join('')}</div>
    <div class="mhello">${face(mk)}<p>“${M.hello}”<small>${M.desc}</small></p></div>
    ${want ? `<div class="note good want">오늘 찾는 것 · <b>${want.name}</b> — ${want.items.map(k => ITEMS[k]?.name).filter(Boolean).join(' · ')} (1.35배)</div>` : ''}
    <div class="sec">사기 <small>${mk === 'baram' ? '요일마다 바뀌어요' : mk === 'moru' ? '하루 몇 개씩' : '모자란 재료'}${E.merchDiscount(S) && mk !== 'gombang' ? ` · 선착장 −${pct(E.merchDiscount(S))}` : ''}</small></div>
    <div class="stock">${stock.map(o => `<button class="so ${o.left ? '' : 'out'} ${S.shells >= o.price ? '' : 'poor'}" data-id="${o.id}">${pic(o)}<b>${name(o)}</b><em>${shell(o.price)}</em><small>${o.per < 90 ? (o.left ? `오늘 ${o.left}개` : '다 팔림') : ''}</small></button>`).join('') || '<small class="hint">오늘은 들어온 게 없어요</small>'}</div>
    <div class="sec">팔기 <small>${mk === 'gombang' ? '무엇이든 제값 · 창고 탭에서 한꺼번에도' : mk === 'moru' ? '부품을 1.3배로' : '오늘 찾는 것만 1.35배'}</small></div>
    <div class="sellgrid">${sellable.map(k => `<button class="si" data-sell="${k}">${icon(k)}<b>${E.count(S, k)}</b><em>${E.sellPriceAt(S, mk, k)}</em></button>`).join('') || '<small class="hint">팔 만한 게 없어요</small>'}</div>`;
  body.querySelectorAll('.msel button').forEach(b => b.onclick = () => { const k = b.dataset.mk; if (!E.merchOpen(S, k)) { sfx.empty(); return ui.toast(`${reqTxt(MERCHANTS[k].req)}에서 만나요`, 'soft'); } sfx.ui(); ui.msel = k; ui.hideout(); });
  body.querySelectorAll('.so').forEach(b => b.onclick = () => { const r = E.buyStock(S, mk, b.dataset.id); if (!r.ok) return why(ui, r); save(); sfx.pick(3); ui.toast(`${name(r.o)} 샀어요`, 'good'); ui.hideout(); });
  body.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { const v = E.sellAt(S, mk, b.dataset.sell); if (!v) return; save(); sfx.pick(v / 10); ui.toast(`${ITEMS[b.dataset.sell].name} 팔아 +${v}`, 'good'); ui.hideout(); });
}

/* ───── 업적 · 난이도 (은신처 아래 버튼) ───── */
export function achSheet(ui) {
  const done = A => !!S.ach?.[A.id]; const n = ACHIEVEMENTS.filter(done).length;
  const m = h('div', 'modal', `<div class="sheet achs"><h3>업적 ${n}/${ACHIEVEMENTS.length}</h3><div class="alist">${ACHIEVEMENTS.map(a => { const v = Math.min(a.n, E.achValue(S, a.t)); const d = done(a);
    return `<div class="ach ${d ? 'done' : ''}"><i>${d ? '★' : '☆'}</i><div><b>${a.name}</b><small>${a.txt}</small><span class="abar"><i style="width:${v / a.n * 100}%"></i></span></div><em>${a.reward.cos ? '꾸미기' : ''}${shell(a.reward.shells)}</em></div>`; }).join('')}</div><button class="btn" id="aClose">닫기</button></div>`);
  ui.root.appendChild(m); const close = () => m.remove(); $('#aClose', m).onclick = close; m.onclick = e => { if (e.target === m) close(); };
}
export function diffSheet(ui, after) {
  const m = h('div', 'modal', `<div class="sheet diffs"><h3>난이도</h3><small class="hint">언제든 바꿀 수 있어요 · 보상 차이는 작아요</small>${DIFF_KEYS.map(k => `<button class="dopt ${S.diff === k ? 'on' : ''}" data-d="${k}"><i>${DIFF[k].icon}</i><b>${DIFF[k].name}</b><small>${DIFF[k].txt}</small></button>`).join('')}<button class="btn" id="dClose">닫기</button></div>`);
  ui.root.appendChild(m); const close = () => { m.remove(); (after || (() => ui.hideout()))(); };
  m.querySelectorAll('.dopt').forEach(b => b.onclick = () => { E.setDiff(S, b.dataset.d); save(); sfx.ui(); close(); });
  $('#dClose', m).onclick = close; m.onclick = e => { if (e.target === m) close(); };
}
/* 출격 준비 (v0.6.1 · 검수 M3 Top 1 · 4): '이번 판 목표' 한 줄 + 최근 5판 다 탈출이면 '깊게' 권유 한 줄 (곰방 말투 · 보상 +10%) */
export function prepGoal() {
  const g = GL.raidGoal(S), d = GL.deepHint(S);
  const goal = g ? `<div class="pgoal ${g.done ? 'done' : ''}"><small>이번 판 목표${g.why ? ` · ${g.why}` : ''}</small><b>${g.txt}</b></div>` : '';
  const deep = d ? `<div class="pdeep"><span>곰방 “요즘 너무 쉽지? 최근 ${d.n}판 다 살아 왔잖아. <b>깊게</b> 가 봐 — 적은 세도 건지는 게 10% 더 많아.”</span><button class="btn sm" id="deepGo">${DIFF.deep.icon} 깊게</button></div>` : '';
  return goal + deep;
}
export function bindPrepGoal(ui, el, after) { $('#deepGo', el) && ($('#deepGo', el).onclick = () => { unlock(); E.setDiff(S, 'deep'); save(); sfx.ui(); ui.toast(`${DIFF.deep.icon} 깊게 — 보상 +10%`, 'good'); after(); }); }
export const diffChip = () => `<button class="lnk diffchip" id="diffBtn">${DIFF[S.diff || 'normal'].icon} ${DIFF[S.diff || 'normal'].name}</button>`;
