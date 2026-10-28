// 연속 실패 응원 선물 (docs/bm-policy.md 6장 · 아케이드 점수형) — "막히면 원어데이가 도와준다"
//   조건: 처음 3판 이후, '짧은 판'(자기 최고 거리의 40% 미만)이 3판 연속 → 다음 판 시작 때 보여 줌
//   일부러 지기 방지: 300m · 20초 안에 끝난 판, 로비로 나간 판은 세지 않음(연속도 끊지 않음)
//   선물: 보호막 1회 — 첫 min(최고의 40%, 1,200m)(최소 500m) 동안만, 한 번 막으면 끝 (판을 살리는 부활 X)
//     봇 측정(tools/help_bot.js): 평균 거리 상승이 이어하기 1회의 0.15배 이하 (기준 ½ 이하)
//   한도: 하루 2번(조건이 맞은 횟수) · bm.helpOn() 이 false(실험 꺼짐 그룹)면 주지 않음(help_eligible 기록만) · 소장자 · 비소장자 똑같이
//   난이도는 몰래 바꾸지 않음 — 보이는 선물만
import { load, save, todayKey } from './save.js?v=0.82.0';
import { bm } from './oad_bm.js?v=0.82.0';
import { inOAD } from './oad.js?v=0.82.0';

export const HELP = { firstRuns: 3, streak: 3, shortRatio: 0.4, minDist: 300, minT: 20, perDay: 2, floorM: 500, capM: 1200 };

// 앱 기록 (oad:track) — 원어데이 밖이면 아무것도 안 함
export function track(name, p = {}) { if (!inOAD) return; try { window.parent.postMessage({ type: 'oad:track', name, p: { game: 'witch', ...p } }, '*'); } catch { /* */ } }

function st() {
  const d = load();
  if (!d.help || d.help.day !== todayKey()) d.help = { day: todayKey(), n: 0, streak: d.help ? d.help.streak || 0 : 0 };
  return d.help;
}
// 판이 끝날 때 (Play.finish): 짧은 판이면 연속 +1, 아니면 0
export function noteRun({ dist, t, best, runsBefore, quit, helped }) {
  const h = st();
  if (helped) { h.streak = 0; save(); return h.streak; }
  if (runsBefore < HELP.firstRuns || quit || dist < HELP.minDist || t < HELP.minT || !best) return h.streak;
  h.streak = dist < best * HELP.shortRatio ? h.streak + 1 : 0;
  save(); return h.streak;
}
// 조건이 맞았는지 (실험 그룹과 무관) — A/B 비교: 맞은 순간 두 그룹 모두 help_eligible { on: 1/0 } 을 한 번 보냄
export const helpEligible = () => { const h = st(); return h.streak >= HELP.streak && h.n < HELP.perDay; };
// 다음 판 시작 때 부름: 켜짐 그룹이면 true(→ 선물 창) · 꺼짐 그룹은 기록만 하고 이번 조건을 소모
export function helpCheck() {
  if (!helpEligible()) return false;
  const on = bm.helpOn();
  track('help_eligible', { on: on ? 1 : 0 });
  if (!on) helpShown();
  return on;
}
export const giftMeters = best => Math.round(Math.min(HELP.capM, Math.max(HELP.floorM, best * HELP.shortRatio)) / 50) * 50;
export function helpShown() { const h = st(); h.n++; h.streak = 0; save(); }
