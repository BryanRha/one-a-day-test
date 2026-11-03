// 판 안 아이템 (2026-11-03 대표 결정: 원어데이 골드 판매) — 화면 · 앱과 분리 (봇 · node 에서도 씀)
//   메인 원정(run)에서만 · 오늘의 도전(모두 같은 시드로 겨룸) · 아케이드 · 봇 판에선 안 씀
//   가격은 서버 표(oneaday/server/api/_lib/gold.js SHOP.dice)만 기준 — 게임은 bm.price(sku) 로 읽고, 0 이면(표에 없음 · 원어데이 밖) 숨김
//   판마다 아이템별 사용 횟수 상한 (cap) · 소장자 할인/무료 없음 (docs/bm-policy.md 4장)
//   무료 길: 직접 합성으로 칸 비우기 · 강화 · 응원 선물 — 아이템 없이도 난이도는 그대로
export const ITEMS = [
  { id: 'auto', sku: 'automerge', name: '자동 합성', short: '자동', cap: 1, desc: '이번 판 동안 판이 가득 차면 같은 짝을 알아서 합성 (켜고 끄기)' },
  { id: 'remove', sku: 'remove', name: '룬 제거', short: '제거', cap: 3, desc: '고른 칸 하나를 비워요 (SP 환급 없음)' },
  { id: 'reroll', sku: 'reroll', name: '1성 교체', short: '교체', cap: 3, desc: '1눈 룬 하나를 덱의 다른 룬으로 다시 소환' },
  { id: 'bomb', sku: 'bomb', name: '폭탄', short: '폭탄', cap: 2, desc: '길 위 모든 적에게 큰 피해 (보스는 조금)' },
];
export const itemsOn = (mode, bot) => mode === 'run' && !bot;
// 판마다 쓴 횟수 → 남은 횟수
export const left = (it, used) => Math.max(0, it.cap - (used[it.id] || 0));
