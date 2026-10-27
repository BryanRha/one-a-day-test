// 연속 실패 '응원 선물' 규칙 (docs/bm-policy.md 6장 · 화면과 분리 · node 시험: tools/conttest.js · 크기 측정: tools/helptest.js)
//   "막히면 원어데이가 도와준다" — 다음 판을 시작할 때 공개로 주는 작은 선물 (이어하기 20/40 의 '판 끝' 순간과 겹치지 않음)
//   선물 = 처음 N수 동안 줄 지우기 좋은 조각 ('응원 조각' — 화면에 남은 수 표시) · 판을 살리는 것(무료 부활)은 안 줌
//   크기: 이어하기 1회 효과의 ½ 이하 (helptest.js 로 측정한 값으로 정함)
export const HELP_ADV = 30;        // 어드벤처 같은 레벨 3연속 실패 → 다음 도전 첫 30수
export const HELP_ADV2 = 35;       // 6연속 → 조금 더 (35수)
export const HELP_CLASSIC = 25;    // 클래식 짧은 판 3연속 → 다음 판 첫 25수
export const PER_DAY = 2;          // 게임당 하루 2번 (보여 준 횟수 기준)
export const ADV_MIN_MOVES = 12;   // 어드벤처: 12수 넘게 둔 판만 실패로 셈 (일부러 지기 방지)
export const SHORT_RATIO = 0.4;    // 클래식 '짧은 판' = 자기 최고의 40% 미만
export const CLASSIC_MIN_MOVES = 8; // 클래식: 8수 넘게 둔 판만 셈
export const AFTER_PLAYS = 3;      // 클래식: 처음 3판 이후부터

// 상태 (save 의 help): { date, shown, adv: { n, fails }, short }
export const freshHelp = () => ({ date: '', shown: 0, adv: { n: 0, fails: 0, at: 0 }, short: 0 });
function today(h, day) { if (h.date !== day) { h.date = day; h.shown = 0; } return h; }

// 어드벤처 판 결과 기록
export function noteAdv(h, n, won, moves) {
  if (won) { h.adv = { n: 0, fails: 0, at: 0 }; return h; }
  if (moves <= ADV_MIN_MOVES) return h;
  if (h.adv.n !== n) h.adv = { n, fails: 0, at: 0 };
  h.adv.fails++;
  return h;
}
// 클래식 판 결과 기록 (plays: 이 판까지 끝낸 판 수 · best: 이 판 전 최고)
export function noteClassic(h, score, moves, best, plays) {
  if (plays <= AFTER_PLAYS || best <= 0) { h.short = 0; return h; }
  if (moves <= CLASSIC_MIN_MOVES) return h;
  h.short = score < best * SHORT_RATIO ? h.short + 1 : 0;
  return h;
}
// 판을 시작할 때 선물 조건이 맞았나 (null = 아님) → { moves, big, why }
//   실험 켜짐/꺼짐과 상관없이 조건만 판단 (A/B 비교: 두 그룹 모두 help_eligible 기록 → 켜짐 그룹만 실제로 보여 줌)
export function helpGift(h, st, day) {
  today(h, day);
  if (h.shown >= PER_DAY) return null;
  if (st.mode === 'adv') {
    if (h.adv.n !== st.n || h.adv.at === h.adv.fails) return null;
    if (h.adv.fails === 3) return { moves: HELP_ADV, big: false, why: `레벨 ${st.n}에 세 번이나 도전했어요` };
    if (h.adv.fails === 6) return { moves: HELP_ADV2, big: true, why: `레벨 ${st.n}, 여섯 번째 도전이에요` };
    return null;
  }
  if (h.short >= 3) return { moves: HELP_CLASSIC, big: false, why: '요즘 판이 잘 안 풀렸죠' };
  return null;
}
// 조건이 맞아 처리했을 때 (켜짐: 보여 줌 · 꺼짐: 기록만 — 두 그룹 똑같이 하루 횟수에 셈 · 같은 조건으로 다시 안 뜸)
export function markShown(h, st) {
  h.shown++;
  if (st.mode === 'adv') h.adv.at = h.adv.fails;   /* 같은 실패 횟수로는 다시 안 뜸 (다음은 6연속) */
  else h.short = 0;
  return h;
}
