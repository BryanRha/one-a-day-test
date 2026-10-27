// 판 끝 이어하기 · 별 조각 2배 — 언제 권할지 정하는 규칙 (화면과 분리 · node 로 시험: tools/conttest.js)
//   원칙 "희망일 때 권하고, 좌절일 때 선물": 최고 기록 근처(또는 목표가 거의 다 찼을 때)에만 권유, 초반 실패엔 권유 없음
//   판당 최대 2번 — 첫 번째 = 광고 1회 또는 🪙20(같은 크기) · 소장자는 무료 · 두 번째 = 🪙40 만
//   원어데이 밖(info.ok = false): 지금처럼 한 판에 한 번 무료 이어하기 (골드 · 광고 버튼 없음)
export const MAX_CONT = 2;
export const COUNTDOWN = 10;          // 초 (8초 이상)
export const HOPE_RATIO = 0.7;        // 클래식: 최고 기록의 70% 이상
export const HOPE_ADV = 0.6;          // 어드벤처: 목표 60% 이상 채움
export const EARLY_MOVES = 15;        // 클래식: 15수 안에 끝난 판은 초반 실패
export const EARLY_PLAYS = 3;         // 처음 3판은 권유 없음
export const EARLY_LEVEL = 3;         // 어드벤처 1~3레벨은 권유 없음
export const DOUBLE_PER_DAY = 3;      // 별 조각 2배 하루 횟수

// 어드벤처 목표 진행률 (0~1, 목표 여러 개면 평균)
export function advProgress(goals) {
  if (!goals || !goals.length) return 0;
  let s = 0;
  for (const g of goals) s += g.type === 'score' ? Math.min(1, g.have / g.target) : Math.min(1, g.count ? g.have / g.count : 1);
  return s / goals.length;
}

// 지금이 '희망' 순간인가 + 칭찬 문구
//   st: { mode, score, best, plays, moves, n, progress }
export function hope(st) {
  if (st.mode === 'adv') {
    if (st.n <= EARLY_LEVEL || st.plays < EARLY_PLAYS) return null;
    if (st.progress < HOPE_ADV) return null;
    return { praise: `목표의 ${Math.round(st.progress * 100)}%까지 왔어요!`, sub: '조금만 더 하면 레벨을 깰 수 있어요' };
  }
  if (st.plays < EARLY_PLAYS || st.moves < EARLY_MOVES || st.best <= 0) return null;
  if (st.score > st.best) return { praise: '신기록 진행 중!', sub: `최고 기록보다 ${fmtN(st.score - st.best)}점 더 왔어요` };
  if (st.score >= st.best * HOPE_RATIO) return { praise: `최고 기록까지 ${fmtN(st.best - st.score)}점!`, sub: '한 번 더 가 볼까요?' };
  return null;
}
const fmtN = n => Math.floor(n).toLocaleString('en-US');

// 이어하기 창에 무엇을 보여 줄지 (null = 권유 없이 결과로)
//   used: 이번 판 이어한 횟수 · info: bm.hello() 결과
//   → { kind: 'free' }                                     원어데이 밖 (지금처럼 무료 1회)
//   → { kind: 'first', owner, ad, gold, h }                첫 번째: 소장자는 무료 버튼 하나, 아니면 광고 · 🪙20 나란히
//   → { kind: 'second', gold, h }                          두 번째: 🪙40 만
export function contOffer(st, used, info) {
  if (!info || !info.ok) return used === 0 ? { kind: 'free' } : null;
  if (used >= MAX_CONT) return null;
  const h = hope(st); if (!h) return null;
  const prices = info.prices || {}, ads = info.ads || {};
  if (used === 0) {
    if (info.owned && ads.reward) return { kind: 'first', owner: true, ad: false, gold: 0, h };   /* 소장자: 광고 없이 바로 (하루 횟수는 같음 → 다 쓰면 골드만) */
    const ad = !!ads.reward, gold = prices.continue || 0;
    if (!ad && !gold) return null;
    return { kind: 'first', owner: false, ad, gold, h };
  }
  const gold = prices.continue2 || 0;
  return gold ? { kind: 'second', gold, h } : null;
}

// 클래식 판 끝 기본 별 조각 (점수 구간 · 작게 — 근거는 tools/starsim.js)
//   2,000점 미만 1 · 6,000 미만 2 · 15,000 미만 3 · 그 이상 4  → 어떤 판이든 1개 이상이라 '별 2배'가 매 판 뜰 수 있음
export const STAR_BANDS = [[15000, 4], [6000, 3], [2000, 2], [0, 1]];
export function roundStars(score) { for (const [min, n] of STAR_BANDS) if (score >= min) return n; return 1; }

// 별 조각 2배 버튼을 보여 줄지 (판에서 받은 별이 있고 · 원어데이 안 · 광고 남음 · 하루 3번)
export function canDouble(stars, info, usedToday) {
  return stars > 0 && !!info && !!info.ok && !!(info.ads && info.ads.reward) && usedToday < DOUBLE_PER_DAY;
}
