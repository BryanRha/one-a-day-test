// 클래식 판 안 아이템 (2026-11-09 대표 QA 시트 #2 · 룬 다이스 판 안 아이템과 같은 방식) — 화면 · 앱과 분리 (봇 · node 에서도 씀)
//   클래식에서만 · 어드벤처(목표 레벨) · 봇 판엔 없음 · 가격은 서버 표(oneaday/server/api/_lib/gold.js SHOP.blocks)만 기준 — 0 이면 숨김
//   판마다 상한(cap) · 소장자 할인/무료 없음 (docs/bm-policy.md 4장) · 쓴 판은 명예의 전당에 안 올라감(도움 받은 판)
//   점수는 주지 않음 (아이템으로 지운 블록은 점수 · 콤보 · 미션에 안 셈 — 기록이 골드로 오르지 않게)
export const ITEMS = [
  { id: 'bomb', sku: 'bomb', name: '폭탄', cap: 2, desc: '누른 칸 둘레 3×3 블록을 모두 비워요' },
  { id: 'line', sku: 'line', name: '한 줄', cap: 3, desc: '가로 또는 세로 한 줄을 통째로 비워요' },
];
export const itemsOn = (mode, bot) => mode === 'classic' && !bot;
export const left = (it, used) => Math.max(0, it.cap - (used[it.id] || 0));
// 비울 칸 목록
export function area(it, r, c, orient, N = 8) {
  const out = [];
  if (it.id === 'bomb') { for (let y = r - 1; y <= r + 1; y++) for (let x = c - 1; x <= c + 1; x++) if (y >= 0 && x >= 0 && y < N && x < N) out.push([y, x]); }
  else if (orient === 'col') for (let y = 0; y < N; y++) out.push([y, c]);
  else for (let x = 0; x < N; x++) out.push([r, x]);
  return out;
}
// 판 안 광고 (QA 시트 #6): '블록 바꾸기' — 아래 조각 3개를 새로 받음 · 판마다 1번 · 하루 AD_DAY 번 (앱 광고 한도 게임당 5 안에서: 별 2배 3 + 이것 2)
export const AD_DAY = 2;
