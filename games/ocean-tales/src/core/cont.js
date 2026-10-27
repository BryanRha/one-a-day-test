// 이동 다 씀 → +5수 이어하기 · 언제 권할지 정하는 규칙 (화면과 분리 · node 로 시험: tools/bm_test.js)
//   원칙 "희망일 때 권하고, 좌절일 때 선물" (docs/bm-policy.md 5장): 목표가 꽤 찼을 때만 원어데이 권유
//   판당 최대 2번 — 첫 번째 = 광고 1회 또는 🪙20(같은 크기) · 소장자는 광고 없이 바로 · 두 번째 = 🪙40 만
//   게임 코인 · 보유 +5 부스터로 사는 기존 +5 이동은 그대로 (무과금 길)
//   원어데이 밖(info.ok = false) · 희망 순간이 아니면 null → 예전 창 그대로
export const MAX_CONT = 2;
export const COUNTDOWN = 10;          // 초 (8초 이상)
export const HOPE = 0.6;              // 목표 60% 이상 채운 판만
export const EARLY_LEVEL = 3;         // 1~3레벨(튜토리얼)은 권유 없음
export const EARLY_PLAYS = 3;         // 처음 3판은 권유 없음
export const AD_PER_DAY = { moves5: 3, booster: 3 };   // 광고 보상 하루 횟수 (게임 쪽 한도 · 앱 한도는 따로)
export const AD_PER_ROUND = 1;        // 실패 후 +5수 광고: 판당 1번

// 목표 진행률 (0~1, 목표 여러 개면 평균)
export function goalProgress(goals, score, stars = []) {
  if (!goals || !goals.length) return 0;
  let s = 0;
  for (const g of goals) s += Math.min(1, (g.type === 'score' ? score : g.progress || 0) / Math.max(1, g.target || (g.type === 'score' ? stars[0] : 0) || 1));
  return s / goals.length;
}

// 지금이 '희망' 순간인가 + 칭찬 문구 재료
//   st: { levelId, plays, progress }
export function hope(st) {
  if (st.levelId <= EARLY_LEVEL || st.plays < EARLY_PLAYS) return null;
  if (st.progress < HOPE) return null;
  return { pct: Math.round(st.progress * 100), close: st.progress >= 0.85 };
}

// 이어하기 창에 무엇을 보여 줄지 (null = 예전 창)
//   used: 이번 판 원어데이 이어하기 횟수 · adUsedRound: 이번 판 광고로 받은 횟수 · adLeft: 오늘 남은 광고 횟수(게임 쪽)
//   → { kind: 'first', owner, ad, gold, h } | { kind: 'second', gold, h }
export function contOffer(st, used, info, adLeft = AD_PER_DAY.moves5, adUsedRound = 0) {
  if (!info || !info.ok || used >= MAX_CONT) return null;
  const h = hope(st); if (!h) return null;
  const prices = info.prices || {}, ads = info.ads || {};
  const adOk = !!ads.reward && adLeft > 0 && adUsedRound < AD_PER_ROUND;
  if (used === 0) {
    if (info.owned && adOk) return { kind: 'first', owner: true, ad: false, gold: 0, h };   /* 소장자: 광고 없이 바로 (횟수는 같음 → 다 쓰면 골드만) */
    const gold = prices.continue || 0;
    if (!adOk && !gold) return null;
    return { kind: 'first', owner: false, ad: adOk, gold, h };
  }
  const gold = prices.continue2 || 0;
  return gold ? { kind: 'second', gold, h } : null;
}

// 판 시작 전 부스터: 광고(또는 소장자 무료) 버튼을 보일지 · 골드 묶음 가격
export function boosterOffer(info, adLeft) {
  if (!info || !info.ok) return null;
  const ad = !!(info.ads && info.ads.reward) && adLeft > 0;
  const gold = (info.prices && info.prices.boosters) || 0;
  if (!ad && !gold) return null;
  return { ad, owner: !!info.owned && ad, gold };
}
