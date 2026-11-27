// 오늘의 도전 판 만들기 (순수 함수 — 게임 · 봇 · 랭킹 상한 측정이 같은 것을 씀)
//   날짜 글자(YYYY-MM-DD) → 시드 · 덱 5개 (모두 같은 날 = 같은 덱 · 같은 적 · 등급 1)
import { RUNE_ORDER } from './sim.js?v=0.99.78';

export function dailyOf(day) {
  let h = 7; for (const ch of day) h = (h * 131 + ch.charCodeAt(0)) >>> 0;
  const pool = RUNE_ORDER.slice(), deck = [];
  let x = h; while (deck.length < 5) { x = (x * 1103515245 + 12345) >>> 0; const r = pool.splice(x % pool.length, 1)[0]; deck.push(r); }
  return { seed: h, deck };
}

/* ── 공통 랭킹 (2026-11-27 · team/dev/tasks/261127-rank-games/brief.md) ──
   판 'dice' = 오늘의 도전 · 주간(월~일) 최고 · 도전 점수 = 도달 웨이브 × 10000 + 처치한 적(최대 9999)
   앞자리가 곧 웨이브(170,384 = 웨이브 17 · 384마리) · 같은 웨이브면 새지 않고 더 많이 잡은 쪽이 앞 · tie = 버틴 초 */
export const RANK_BOARD = 'dice';
export const rankScore = r => Math.max(1, Math.floor(r.wave) * 10000 + Math.min(9999, Math.max(0, Math.floor(r.kills || 0))));
export const rankTie = r => Math.max(0, Math.floor(r.t || 0));
