// 연속 실패 응원 선물 규칙 (docs/bm-policy.md 6장 · 아케이드 점수형) — 화면 · 앱 연결과 분리 (봇 · node 에서도 씀)
//   대상: 생존 원정(run)만 · 오늘의 도전(모두 같은 시드로 겨룸) · 아케이드는 도움 없음
//   짧은 판: 자기 평소 기록(짧지 않았던 최근 9판) 중앙값의 50% 미만 웨이브 · 처음 3판은 세지 않음
//     짧은 판은 평소 기록에 넣지 않음 — 막힌 동안 기준이 같이 내려가 선물이 끊기지 않게
//   일부러 지기 방지: 웨이브 4 · 60초 전에 끝난 판, '포기하고 나가기' 판은 세지 않음(연속도 끊지 않음)
//   3판 연속 짧은 판 → 다음 판 시작 때 공개 선물 '시작 SP +50' (판을 살리는 것 아님)
//     크기 근거: tools/help_bot.js — 이어하기 1회(가상: 생명 3으로 계속) 효과의 ½ 이하
//   한도: 하루 2번(조건이 맞은 횟수) · 소장자 · 비소장자 똑같이 · 몰래 난이도 조정 없음
export const HELP = { firstRuns: 3, streak: 3, ratio: 0.5, hist: 9, minWave: 4, minT: 60, perDay: 2, giftSp: 50 };

export const median = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
export const fresh = day => ({ day, n: 0, streak: 0, hist: [] });
// 날이 바뀌면 하루 횟수만 새로 (연속 · 기록은 이어감)
export function roll(h, day) { if (!h) return fresh(day); if (h.day !== day) return { ...h, day, n: 0 }; return h; }
// 판이 끝날 때: 짧은 판이면 연속 +1, 아니면 0 → 바뀐 상태를 돌려줌
export function note(h, { mode, wave, t, quit, helped }) {
  if (mode !== 'run' || quit || wave < HELP.minWave || t < HELP.minT) return h;
  const med = median(h.hist), counted = h.hist.length >= HELP.firstRuns, short = counted && wave < med * HELP.ratio;
  const hist = short ? h.hist : [...h.hist, wave].slice(-HELP.hist);
  if (helped) return { ...h, hist, streak: 0 };
  return { ...h, hist, streak: short ? h.streak + 1 : 0 };
}
export const eligible = h => h.streak >= HELP.streak && h.n < HELP.perDay;
// 선물 창을 보였거나(켜짐) 기록만 했을 때(꺼짐): 하루 횟수 +1 · 연속 0
export const used = h => ({ ...h, n: h.n + 1, streak: 0 });
