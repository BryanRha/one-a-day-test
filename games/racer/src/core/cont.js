// 연료 바닥 → 이어하기 권유 규칙 (화면과 분리 · node 시험: tools/bm_rules.js)
//   원칙 "희망일 때 권하고, 좌절일 때 선물" (docs/bm-policy.md 5장): 신기록 중 · 최고 기록 70% 이상 · 보스 막바지에만 권함
//   처음 3판 · 30초 안 · 800m 안에 끝난 판은 권유 없이 바로 결과 · 응원 선물을 받은 판도 권하지 않음
//   판당 최대 2번: 첫 번째 = 광고 1회(판당 1 · 하루 5) 또는 🪙20 같은 크기 나란히 (소장자는 광고 없이 무료) · 두 번째 = 🪙40 만
//   원어데이 밖(info.ok = false): 예전 그대로 이어하기 없음
export const MAX_CONT = 2;
export const COUNTDOWN = 10;      // 초 (8초 이상)
export const HOPE_RATIO = 0.7;    // 최고 거리의 70% 이상
export const EARLY_RUNS = 3, EARLY_T = 30, EARLY_DIST = 800;
export const BOSS_HP = 0.35;      // 보스 체력 35% 이하
export const AD_DAY = { revive: 5, coins2x: 3 };   // 광고 자리별 하루 횟수 (게임 쪽 · 앱 한도와 별개)

const fmtN = n => Math.floor(n).toLocaleString('en-US');

// 지금이 '희망' 순간인가 → { kind, praise, sub } | null
//   st: { dist, score, t, best(최고 점수), bestDist, runs(이 판 전 끝낸 판 수), bossHp(0~1 · 싸우는 중일 때만) }
export function hope(st) {
  if (st.runs < EARLY_RUNS || st.t < EARLY_T || st.dist < EARLY_DIST) return null;
  if ((st.bestDist > 0 && st.dist > st.bestDist) || (st.best > 0 && st.score > st.best)) return { kind: 'record', praise: '신기록 질주 중이었어요!', sub: `벌써 ${fmtN(st.dist)}m · 연료만 채우면 더 멀리!` };
  if (st.bossHp != null && st.bossHp <= BOSS_HP) return { kind: 'boss', praise: '심술 트럭이 거의 쓰러졌어요!', sub: '연료 채우고 마저 혼내 줄까요?' };
  if (st.bestDist > 0 && st.dist >= st.bestDist * HOPE_RATIO) return { kind: 'near', praise: `멋진 질주! ${fmtN(st.dist)}m`, sub: `최고 기록까지 ${fmtN(Math.max(1, st.bestDist - st.dist))}m! 한 번 더 가 볼까요?` };
  return null;
}

// 이어하기 창에 무엇을 보여 줄지 (null = 권유 없이 결과로)
//   used: 이번 판 이어한 횟수 · info: bm.hello() 결과 · adLeft: 오늘 남은 '광고 이어하기' 횟수(게임 쪽) · helped: 응원 선물 받은 판
//   → { kind: 'first', owner, ad, gold, h }  첫 번째: 소장자는 무료 버튼(+🪙20), 아니면 광고 · 🪙20 나란히
//   → { kind: 'second', gold, h }            두 번째: 🪙40 만
export function contOffer(st, used, info, adLeft = AD_DAY.revive, helped = false) {
  if (!info || !info.ok || helped || used >= MAX_CONT) return null;
  const h = hope(st); if (!h) return null;
  const prices = info.prices || {}, ads = info.ads || {};
  if (used === 0) {
    const ad = !!ads.reward && adLeft > 0, gold = prices.continue || 0;   /* 소장자도 하루 횟수는 같음 → 다 쓰면 골드만 */
    if (!ad && !gold) return null;
    return { kind: 'first', owner: !!info.owned && ad, ad, gold, h };
  }
  const gold = prices.continue2 || 0;
  return gold ? { kind: 'second', gold, h } : null;
}

// 결과 코인 2배 버튼 (판 코인이 있고 · 원어데이 안 · 광고 남음 · 하루 3번) — 소장자는 광고 없이 바로(횟수는 같음)
export function canDouble(coins, info, usedToday) {
  return coins >= 10 && !!info && !!info.ok && !!(info.ads && info.ads.reward) && usedToday < AD_DAY.coins2x;
}
