// 블록 블리스 ↔ 원어데이 BM 연결 (게임 쪽 작은 도우미 — 공통 파일 oad_bm.js 는 고치지 않음)
//   · 시작 때 hello 한 번 (결과는 bm.info 로 바로 읽음 · 원어데이 밖이면 ok = false → 골드 · 광고 버튼 숨김)
//   · 판 끝 전면 광고: 판이 끝나면 roundOver(), 다음 화면으로 넘어갈 때 afterRound() 를 기다림 → 판마다 한 번만 앱에 물어봄
//   · 광고 · 확인 창 동안 소리 멈춤
import { bm } from './oad_bm.js?v=0.73.1';
import { load, save } from './save.js?v=0.73.1';
import { dayKey } from './meta.js?v=0.73.1';

export function initBM(game) {
  bm.onPause = on => { try { if (on) game.sound.pauseAll(); else game.sound.resumeAll(); } catch { /* */ } };
  return bm.hello();
}

let pending = false;
export const roundOver = () => { pending = true; };
export async function afterRound() {
  if (!pending) return;
  pending = false;
  try { await bm.interstitial('round_end'); } catch { /* 늘 넘어감 */ }
}

// 별 조각 2배: 오늘 쓴 횟수
export function doubleUsed() { const d = load(); return d.dbl && d.dbl.date === dayKey() ? d.dbl.n : 0; }
export function noteDouble(stars) { const d = load(), n = doubleUsed(); d.dbl = { date: dayKey(), n: n + 1 }; d.stars += stars; save(); }
