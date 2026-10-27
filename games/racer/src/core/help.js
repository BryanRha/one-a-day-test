// 연속 실패 '응원 선물' 규칙 (docs/bm-policy.md 6장 · 아케이드 점수형 · 화면과 분리 → node 로 시험: tools/bm_rules.js · 크기: tools/help_bot.js)
//   "막히면 원어데이가 도와준다" — 처음 3판 이후, '짧은 판'(자기 최고 거리의 40% 미만) 3판 연속 → 다음 판을 시작할 때 공개로 줌
//   일부러 지기 방지: 300m 또는 20초 안에 끝난 판 · 차고로 나간 판은 세지 않음(연속도 끊지 않음)
//   선물: 이번 판 연료통 +20 (출발 · 충전 모두 120 까지, 연료 칸에 '응원 +20' 표시) — 판을 살리는 것(무료 이어하기 · 바닥 순간 연료)은 주지 않음
//     봇 측정(tools/help_bot.js 150판 × 실력 0.1/0.3/0.6 × 부품 0/3): 이어하기 1회 +1,489~1,971m, 연료통 +20 → +550~602m = 0.29~0.41배 (기준 ½ 이하)
//     출발 연료만 +20(가득 위 여분)은 첫 체크포인트 충전이 가득에서 멈춰 사라짐 → +2~16m(0.01배)라 버림 · +30 은 0.55배라 넘음
//   한도: 하루 2번(조건이 맞은 횟수 · 실험 켜짐/꺼짐 두 그룹 똑같이) · 소장자 · 비소장자 똑같이
//   난이도는 몰래 바꾸지 않음 — 보이는 선물만
export const HELP = { firstRuns: 3, streak: 3, shortRatio: 0.4, minDist: 300, minT: 20, perDay: 2, fuel: 20 };

export const freshHelp = day => ({ day, n: 0, streak: 0 });
// 날이 바뀌면 하루 횟수만 새로 (연속 기록은 이어 감)
export function helpDay(h, day) { if (!h) return freshHelp(day); if (h.day !== day) { h.day = day; h.n = 0; } return h; }

// 판이 끝날 때: 짧은 판이면 연속 +1, 아니면 0 · 반환 = 지금 연속 수
//   run: { dist, t, best(이 판 전 최고 거리), runsBefore(이 판 전 끝낸 판 수), quit, helped }
export function noteRun(h, run) {
  if (run.helped) { h.streak = 0; return h.streak; }
  if (run.quit || run.runsBefore < HELP.firstRuns || !run.best) return h.streak;
  if (run.dist < HELP.minDist || run.t < HELP.minT) return h.streak;
  h.streak = run.dist < run.best * HELP.shortRatio ? h.streak + 1 : 0;
  return h.streak;
}
// 다음 판 시작 때 선물 조건이 맞았나 (실험 그룹과 무관)
export const eligible = h => h.streak >= HELP.streak && h.n < HELP.perDay;
// 조건을 처리함 (켜짐: 창을 보여 줌 · 꺼짐: 기록만) → 하루 횟수 +1 · 연속은 처음부터
export function markShown(h) { h.n++; h.streak = 0; return h; }
