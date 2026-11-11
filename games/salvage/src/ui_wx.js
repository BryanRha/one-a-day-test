// 판 상태 5 · 맵 장비 화면 조각 (M4-B) — 출격 준비(예보 + 권장 장비 고르기) · 은신처 장비 탭(맵 장비 3 제작)
//  ui.js · ui_grow.js 는 한 줄씩만 부름 (html → 끼우기 · bind → 누르기)
import { S, save } from './save.js?v=0.99.21';
import * as E from './econ.js?v=0.99.21';
import { MAP_GEAR, MAP_GEAR_KEYS, MATS, ITEMS } from './data.js?v=0.99.21';
import { WEATHER, WX_MAP, WX_OF, forecast } from './data/weather.js?v=0.99.21';
import { sfx } from './audio.js?v=0.99.21';

const chips = cost => Object.entries(cost).map(([k, n]) => `<span class="chip">${k === 'shells' ? '🐚' : (MATS[k]?.name || ITEMS[k]?.name || k)} ${n}</span>`).join(' ');
const wantFor = wx => MAP_GEAR_KEYS.find(k => MAP_GEAR[k].wx.includes(wx)) || null;
/* 출격 준비 '오늘의 판' 한 카드 (검수 M4 Top 5): 예보 · 오늘 위협(extra = threat_ui 카드) · 맵 장비 하나 고르기(권장 표시) */
export function badgeHtml(mk) { const W = WEATHER[forecast(S, mk)]; return `<span class="wxbadge ${W ? 'wx' : ''}">${W ? `${W.icon} ${W.name}` : '☀ 맑음'}</span>`; }
export function prepHtml(mk, extra = '') {
  const fc = forecast(S, mk); const W = WEATHER[fc]; const want = wantFor(fc);
  const own = MAP_GEAR_KEYS.filter(k => S.gear?.[k]);
  if (want && S.gear?.[want] && S.mgAuto !== false && S.mgSel !== want) { S.mgSel = want; save(); } /* 예보에 맞는 걸 가졌으면 저절로 챙김 (손으로 바꾸면 그대로) */
  const row = MAP_GEAR_KEYS.map(k => { const G = MAP_GEAR[k]; const have = !!S.gear?.[k]; const on = have && S.mgSel === k; const rec = k === want;
    return `<button class="slot mg ${on ? 'on' : ''} ${have ? '' : 'dim'}" data-mg="${k}" style="position:relative"><span style="font-size:20px">${G.icon}</span><small>${G.name}</small>${rec ? '<b style="position:absolute;top:-6px;right:-4px;background:#ffd166;color:#1b1f24;border-radius:8px;padding:0 5px;font-size:11px">권장</b>' : ''}</button>`; }).join('');
  return `<div class="card wxprep today"><div class="fh"><b>오늘의 판</b><span class="lv">예보 ${W ? `${W.icon} ${W.name}` : '☀ 맑음'}</span></div>
    <small class="hint">${W ? W.txt : '특별한 판 상태 없음 — 맑고 조용한 날이에요'}</small>
    ${extra}
    <div class="fh"><b>맵 장비</b><span class="lv">하나만 · ${own.length ? (S.mgSel && S.gear?.[S.mgSel] ? MAP_GEAR[S.mgSel].name : '안 챙김') : '은신처 장비 탭에서 만들어요'}</span></div>
    <div class="safepick mgrow">${row}</div>
    ${want && !S.gear?.[want] ? `<small class="hint warm">${MAP_GEAR[want].icon} ${MAP_GEAR[want].name} 권장 — 작업대 ${MAP_GEAR[want].bench}단계에서 만들어요</small>` : want ? `<small class="hint good">${MAP_GEAR[want].txt}</small>` : ''}</div>`;
}
export function prepBind(ui, el) {
  el.querySelectorAll('[data-mg]').forEach(b => b.onclick = () => { const k = b.dataset.mg; sfx.ui();
    if (!S.gear?.[k]) { ui.toast(`${MAP_GEAR[k].name} — 은신처 장비 탭에서 만들어요`, 'soft'); return; }
    S.mgSel = S.mgSel === k ? null : k; S.mgAuto = false; save(); ui.prep(); });
}
/* 은신처 장비 탭: 맵 장비 3 */
export function gearHtml() {
  const bench = E.facLvl(S, 'bench');
  return `<div class="sec">맵 장비 <small>판 상태(한파 · 독수 · 밤 · 안개) 대응 · 출격 준비에서 하나만 챙겨요</small></div>
    ${MAP_GEAR_KEYS.map(k => { const G = MAP_GEAR[k]; const have = !!S.gear?.[k];
      return `<div class="grow gearrow"><div><b>${G.icon} ${G.name}${have ? ' ✓' : ''}</b><small>${G.txt}</small>${have ? '' : `<div class="cost">${chips(G.cost)}</div>`}</div>
        ${have ? `<small class="max">${S.mgSel === k ? '챙김' : '있음'}</small>` : `<button class="btn sm ${bench >= G.bench ? '' : 'dim'}" data-mgc="${k}">${bench >= G.bench ? '제작' : `작업대 ${G.bench}단계`}</button>`}</div>`; }).join('')}`;
}
export function gearBind(ui, body) {
  body.querySelectorAll('[data-mgc]').forEach(b => b.onclick = () => { const k = b.dataset.mgc; const c = MAP_GEAR[k].cost; let r = E.craftMapGear(S, k);
    if (!r.ok && r.why === 'cost' && E.lackPrice(S, c).ok) { E.buyLack(S, c); r = E.craftMapGear(S, k); }
    if (!r.ok) { ui.toast(r.why === 'bench' ? `작업대 ${MAP_GEAR[k].bench}단계가 필요해요` : '재료가 모자라요', 'soft'); return sfx.empty(); }
    save(); sfx.build(); ui.toast(`${MAP_GEAR[k].name}! ${MAP_GEAR[k].txt}`, 'good'); ui.hideout(); });
}
/* 결과 · 판 안 띠에 쓰는 이름 */
export const wxName = (wx, cond) => WEATHER[wx] && !WX_OF[cond] ? ` · ${WEATHER[wx].icon} ${WEATHER[wx].name}` : '';
