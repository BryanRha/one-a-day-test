// 재료 · 수량 칩 공통 (v0.6.1 · 검수 M3 Top 2) — 모든 화면 '가진 / 필요' 한 가지
//  · 모자라면 가진 수만 빨강(.hv.no) · 다 모이면 칩 끝에 ✓
//  · 쓰는 곳: 시설 단계표 · 무기 제작 · 개조 · 탄약 · 장비 · 소모품 · 요리 · 부적(ui_grow.js) · 의뢰 · 인물 의뢰 · 오늘의 인양(ui.js · story_ui.js) · 상인 값(가진 조개 < 값)
import { ITEMS, MATS } from './data.js?v=0.99.43';
import { S } from './save.js?v=0.99.43';
import * as E from './econ.js?v=0.99.43';

const n0 = n => Number(n).toLocaleString('ko-KR');
/* 가진 / 필요 — lack=false 면 빨강 없이(처치 수 같은 진행) */
export const frac = (have, need, lack = true) => `<span class="hn"><b class="hv ${have >= need ? 'ok' : lack ? 'no' : ''}">${n0(Math.min(have, 99999))}</b><i>/</i>${n0(need)}</span>`;
const lab = k => k === 'shells' ? '<span class="shell"></span>' : k in MATS ? `<span class="mat" style="--c:${MATS[k].color}"></span>${MATS[k].name}` : (ITEMS[k]?.name || k);
/* 비용 칩: [그림] 이름 가진/필요 (✓) */
export function costChips(cost, st = S) {
  return Object.entries(cost || {}).map(([k, n]) => { const have = E.count(st, k); const ok = have >= n;
    return `<span class="c ${ok ? 'ok' : 'no'}">${lab(k)} ${frac(have, n)}${ok ? '<u>✓</u>' : ''}</span>`; }).join('');
}
