// 연속 실패 응원 선물 규칙 (docs/bm-policy.md 6장 · 단계형) — 저장 상태를 받아 고치는 순수 함수 (node 시험: tools/bm_test.js)
//   조건: 같은 레벨 3연속 실패 → 다음 도전 시작 때 '시작 +1수' · 6번째부터(6 · 9 …) '시작 +2수'
//   크기 근거 (tools/help_bot.js, 사람 봇 · 막히는 레벨 22개 × 60판):
//     이어하기 1회(+5수) 승률 +14.7p · 시작 +1수 +3.3p(0.22배) · 시작 +2수 +6.7p(0.45배) → 둘 다 ½ 이하
//     (+3수는 0.62배라 기준 넘음 · 특수 블록 선물도 0.54배 이상이라 쓰지 않음)
//   실패로 세는 것: 이동을 다 써서 진 판 · 기뢰로 진 판 · 이동을 절반 넘게 쓰고 그만둔 판 (일부러 지기 방지)
//     바로 나간 판은 세지 않고 연속도 끊지 않음 · 레벨을 깨거나 다른 레벨로 가면 0
//   한도: 하루 2번 (보여 준 횟수) · 하루 최대 +1 +2 = 3수 < 광고 1회 보상(+5수)
//   소장자 · 비소장자 똑같음 · 난이도는 몰래 바꾸지 않음 (보이는 선물만)
export const HELP = { streak: 3, more: 6, perDay: 2, quitRatio: 0.5, small: 1, big: 2 };

export function roll(h, day) {
  if (!h || typeof h !== 'object') h = { day, n: 0, level: 0, streak: 0, offered: 0 };
  if (h.day !== day) { h.day = day; h.n = 0; }
  return h;
}
// 판이 끝날 때: won(깸) · quit(그만둠) · turn(쓴 이동) · moves0(이번 판 처음 이동 수)
export function noteEnd(h, { levelId, won, quit, turn, moves0 }) {
  if (h.level !== levelId) { h.level = levelId; h.streak = 0; h.offered = 0; }
  if (won) { h.streak = 0; h.offered = 0; return h; }
  if (quit && turn < moves0 * HELP.quitRatio) return h;
  h.streak++;
  return h;
}
// 이번 시작에 선물 조건이 맞는가 (실험 그룹과 무관 — 맞은 순간 두 그룹 모두 help_eligible 기록)
export function eligible(h, levelId) {
  return h.level === levelId && h.streak >= HELP.streak && h.streak % HELP.streak === 0 && h.offered !== h.streak && h.n < HELP.perDay;
}
export const giftMoves = h => (h.streak >= HELP.more ? HELP.big : HELP.small);
// 보여 줬거나(켜짐) 기록만 했으면(꺼짐) 이번 조건은 씀
export function consume(h) { h.n++; h.offered = h.streak; return h; }
