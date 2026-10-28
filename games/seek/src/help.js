// 연속 실패 응원 선물 (docs/bm-policy.md 6장 · 이야기형) — "막히면 원어데이가 도와준다"
//   조건: 증거 대조를 2판 연속 실패 (같은 화 · 다른 화 상관없이 연속) → 다음 증거 대조를 시작할 때 보여 줌
//   일부러 지기 방지: 20초 안에 하트를 다 잃은 판은 세지 않음(연속도 끊지 않음) · 중간에 나간 판도 세지 않음
//   선물: 판 시작 때 주인공이 다른 곳 하나를 먼저 짚어 줌 (6곳 중 1곳 미리 찾음) — 하트 · 부활 · 실패 순간 도움은 주지 않음
//     봇 측정(tools/help_bot.mjs): 성공률 상승이 이어하기(🪙20 하트 가득) 1회의 0.37~0.41배 (기준 ½ 이하)
//     ('하트 1개 남았을 때 쓰는 무료 힌트'는 실력 좋은 쪽에서 0.69배까지 올라 버림)
//   한도: 하루 1번 (= 광고 힌트 1회 보상 이하) · bm.helpOn() 이 false(실험 꺼짐 그룹)면 주지 않음(help_eligible 기록만)
//   소장자 · 비소장자 똑같이 · 난이도는 몰래 바꾸지 않음 — 보이는 선물만 · 선물 판엔 하트 이어하기 권유 없음
import { load, save } from './save.js?v=0.82.4';
import { bm, track, today } from './bm.js?v=0.82.4';

export const HELP = { streak: 2, minT: 20, perDay: 1 };

function st() {
  const d = load();
  if (!d.help || d.help.day !== today()) d.help = { day: today(), n: 0, streak: d.help ? d.help.streak || 0 : 0 };
  return d.help;
}
// 증거 대조가 끝날 때: 실패면 연속 +1, 성공이면 0 (선물 판은 결과와 상관없이 0부터)
export function noteEvidence({ win, t, helped }) {
  const h = st();
  if (helped || win) h.streak = 0;
  else if (t >= HELP.minT) h.streak++;
  save(); return h.streak;
}
export const helpEligible = () => { const h = st(); return h.streak >= HELP.streak && h.n < HELP.perDay; };
// 증거 대조 시작 때: 켜짐 그룹이면 true(→ 선물 창) · 꺼짐 그룹은 기록만 하고 이번 조건을 소모
export function helpCheck() {
  if (!helpEligible()) return false;
  const on = bm.helpOn();
  track('help_eligible', { on: on ? 1 : 0, gift: 'spot1' });
  if (!on) helpShown();
  return on;
}
export function helpShown() { const h = st(); h.n++; h.streak = 0; save(); }
