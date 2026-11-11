// 은신처 화면 M5-C (v0.8) — 무기 19 고르기를 계열 줄로 접기 · 무기 단련 ★ · 반려 2(몽이 5단 · 반디 3단)
//  ui_grow.js(무기 탭 · 장비 탭)가 부름. 글자 목록 대신 짧은 줄 + 단계 점 + 재료 칩 '가진 / 필요'(chips.js)
import { WEAPONS, WEAPON_KEYS, FAMILY, FAMILY_KEYS, STAR, PETS, PET_MAX, FACILITIES } from './data.js?v=0.99.29';
import { S, save } from './save.js?v=0.99.29';
import * as E from './econ.js?v=0.99.29';
import { sfx, unlock } from './audio.js?v=0.99.29';
import { costChips } from './chips.js?v=0.99.29';
import { wIco, pIco, hasIco } from './icons_m6c.js?v=0.99.29'; /* M6-C 렌더 아이콘 */

const $ = (s, r = document) => r.querySelector(s);
const stars = n => `<span class="stars">${[1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}">★</i>`).join('')}</span>`;

/* ───── 무기 고르기: 위 = 계열 칩 7(가진 수/전체) · 아래 = 그 계열 무기만 (19개가 4줄로 늘어나지 않게 — 늘 2줄) ───── */
export function wselHtml(ui, wk) {
  const fam = ui.wfam && FAMILY[ui.wfam] ? ui.wfam : (ui.wfam = WEAPONS[wk].fam);
  const bench = E.facLvl(S, 'bench');
  const chips = FAMILY_KEYS.map(f => { const ks = WEAPON_KEYS.filter(k => WEAPONS[k].fam === f); const own = ks.filter(k => S.weapons[k]).length; const can = ks.some(k => !S.weapons[k] && bench >= WEAPONS[k].bench && E.canPay(S, WEAPONS[k].cost));
    const eq = ks.includes(S.equip.main) ? '주' : ks.includes(S.equip.side) ? '보' : '';
    return `<button data-f="${f}" class="${f === fam ? 'on' : ''} ${can ? 'can' : ''}"><b>${FAMILY[f]}</b><small>${eq ? `<em>${eq}</em>` : ''}${own}/${ks.length}</small></button>`; }).join('');
  const list = WEAPON_KEYS.filter(k => WEAPONS[k].fam === fam).map(k => { const o = S.weapons[k]; const W2 = WEAPONS[k]; const can = !o && bench >= W2.bench && E.canPay(S, W2.cost); const st = E.starOf(S, k);
    return `<button data-w="${k}" class="${k === wk ? 'on' : ''} ${o ? '' : 'no'} ${can ? 'can' : ''}" style="--c:${W2.color}">${wIco(k)}<b>${W2.short}${st ? `<sup>★${st}</sup>` : ''}</b><small>${S.equip.main === k ? '주무기' : S.equip.side === k ? '보조' : o ? '보유' : bench >= W2.bench ? '제작' : '🔒' + W2.bench}</small></button>`; }).join('');
  return `<div class="wfam">${chips}</div><div class="wsel wfl">${list}</div>`;
}
export function bindWsel(ui, body) {
  body.querySelectorAll('.wfam button').forEach(b => b.onclick = () => { sfx.ui(); ui.wfam = b.dataset.f; const ks = WEAPON_KEYS.filter(k => WEAPONS[k].fam === ui.wfam); ui.wsel = ks.find(k => k === S.equip.main) || ks.find(k => S.weapons[k]) || ks[0]; ui.hideout(); });
}

/* ───── 무기 단련 ★ (정밀 공방) — 개조 칸 아래 한 줄 ───── */
export function starHtml(wk) {
  if (!S.weapons[wk]) return '';
  const cur = E.starOf(S, wk), fs = E.forgeStar(S), nx = cur + 1, c = nx <= STAR.max ? E.starCost(wk, nx) : null;
  const ws = E.weaponStats(wk, S.weapons[wk], cur), after = c ? E.weaponStats(wk, S.weapons[wk], nx) : null;
  const btn = !c ? '<small class="max">최고 단련</small>' : fs >= nx ? `<button class="btn sm star" id="mkStar">★${nx} 단련</button>` : `<button class="btn sm dim" id="mkStar">${fs ? `정밀 공방 ${nx}단계` : E.facUnlocked(S, 'forge') ? '정밀 공방 필요' : '작업대 4단계 → 정밀 공방'}</button>`;
  return `<div class="sec">단련 <small>개조 Mk3 위 · 정밀 공방에서 · 무기마다</small></div>
    <div class="mrow starrow ${cur ? 'on' : ''}"><div class="mh"><b>단련</b>${stars(cur)}<small>${cur ? STAR.fx[cur] : '아직 없음'}</small></div>
    ${c ? `<small class="prev">파워 ${Math.round(ws.dmg)} → <b>${Math.round(after.dmg)}</b>${WEAPONS[wk].melee ? '' : ` · 장전 ${ws.reload.toFixed(2)} → <b>${after.reload.toFixed(2)}초</b>`} · ${STAR.fx[nx]}</small><div class="mfoot"><div class="cost">${costChips(c)}</div>${btn}</div>` : btn}</div>`;
}
export function bindStar(ui, body, wk, why) {
  const b = $('#mkStar', body); if (!b) return;
  b.onclick = () => { unlock(); const c = E.starCost(wk, E.starOf(S, wk) + 1); let r = E.temperWeapon(S, wk);
    if (!r.ok && r.why === 'cost' && c && E.lackPrice(S, c).ok) { E.buyLack(S, c); r = E.temperWeapon(S, wk); }
    if (!r.ok) return why(ui, r); save(); sfx.build(); ui.toast(`${WEAPONS[wk].name} 단련 ★${r.n}! ${STAR.fx[r.n]}`, 'good'); ui.hideout(); };
}

/* ───── 반려 2 (장비 탭 위) — 그림 · 이름 · 단계 점 · 지금 능력 · 다음 능력 · 먹이 칩 · [키우기] ───── */
const PET_ICO = { mong: '🦦', bandi: '🌟' };
const petPic = (k, lv) => hasIco('p_' + k + '1') ? `<i class="pico m6p">${pIco(k, lv)}</i>` : `<i class="pico">${PET_ICO[k]}</i>`; /* M6-C 렌더 아이콘(단계마다) */
function capTxt(k) {
  const n = E.petLv(S, k) + 1, st = PETS[k].stages[n]; if (!st?.cap) return '';
  const [f, lv] = st.cap; return `${FACILITIES[f].name} ${lv}단계`;
}
export function petHtml() {
  E.syncPets(S);
  const row = k => { const P = PETS[k], lv = E.petLv(S, k), cur = P.stages[lv], nx = E.petNext(S, k), cap = E.petCap(S, k);
    if (!lv) return `<div class="grow petrow plock">${petPic(k, 1)}<div><b>${P.name} <small>${P.kind}</small></b><small>${k === 'mong' ? '수족관 1단계를 지으면 합류해요' : '5장 「조용한 수조」에서 만나요'}</small></div></div>`;
    const ready = nx && cap >= lv + 1;
    return `<div class="grow petrow" style="--c:${P.color}">${petPic(k, lv)}<div><b>${cur.name} <small>${P.kind}</small> <span class="ldots">${Array.from({ length: PET_MAX[k] }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span></b>
      <small>${Array.from({ length: lv }, (_, i) => P.stages[i + 1].txt).slice(-2).join(' · ')}</small>
      ${nx ? `<small class="next">다음 ${nx.name}: ${nx.txt}</small>${ready ? `<div class="cost">${costChips(nx.cost)}</div>` : `<small class="hint">${capTxt(k)}이 있어야 더 커요</small>`}` : ''}</div>
      ${nx ? `<button class="btn sm ${ready ? '' : 'dim'}" data-pet="${k}">${ready ? '키우기' : '🔒'}</button>` : '<small class="max">다 컸어요</small>'}</div>`; };
  return `<div class="sec">반려 <small>판 안에서 돕는 친구 · 먹이와 조개로 커요</small></div>${row('mong')}${row('bandi')}`;
}
export function bindPets(ui, body, why) {
  body.querySelectorAll('[data-pet]').forEach(b => b.onclick = async () => { unlock(); const k = b.dataset.pet; const nx = E.petNext(S, k); let r = E.growPet(S, k);
    if (!r.ok && r.why === 'cost' && nx && E.lackPrice(S, nx.cost).ok) { E.buyLack(S, nx.cost); r = E.growPet(S, k); }
    if (!r.ok) return why(ui, r); save(); sfx.mong?.('happy'); ui.toast(`${PETS[k].stages[r.n].name}! ${PETS[k].stages[r.n].txt}`, 'good');
    try { await ui.app?.lookChanged?.(); } catch {} ui.hideout(); });
}
/* 은신처에 들어올 때 새로 합류한 반려 한 줄 (반디 = 이야기 5장) */
export function petJoinToast(ui) {
  const j = E.syncPets(S); if (!j.length) return; save();
  for (const k of j) ui.toast(k === 'bandi' ? '조용한 수조에서 데려온 아기 해마 「반디」가 합류했어요 — 어두운 곳을 밝혀 줘요' : '몽이가 합류했어요 — 주머니에 물건을 넣어 줘요', 'good');
  ui.app?.syncHideoutHero?.();
}
/* 출격 준비 장비 줄에 붙는 반려 한 칸 */
export function petLoadout() {
  const m = E.petLv(S, 'mong'), b = E.petLv(S, 'bandi'); if (!m && !b) return '';
  return `<span><small>반려</small><b>${m ? `몽이 ${m}단` : ''}${m && b ? ' · ' : ''}${b ? `반디 ${b}단` : ''}</b></span>`;
}
