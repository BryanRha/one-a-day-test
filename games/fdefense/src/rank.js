// 공통 랭킹 '이번 주 무한 전장' (2026-11-27 · team/dev/tasks/261127-rank-games/brief.md)
//   겨루는 기록 = 이번 주 전장(모두 같은 스테이지)의 무한 모드에서 버틴 웨이브 · 같으면 처치 수가 많은 쪽
//   무한 판은 늘 목숨 0 으로 끝나서 '남은 목숨'으로는 가를 수 없다 → 마지막 웨이브를 얼마나 막았나 = 처치 수
//   전장은 주마다 바뀜(KST ISO 주 · 서버 gold.js weekOf 와 같은 셈) · 1~2장 20곳을 정한 순서로 돌림
//   화면 없는 순수 모듈 (봇 · tools/rank_cap.mjs 도 씀)
export const BOARD = 'fdefense:inf';
/* 1장 · 2장 20곳 — 같은 장이 이어지지 않게 섞은 순서 (바꾸면 그 주부터 바뀜) */
export const ARENA_POOL = [2, 13, 6, 17, 0, 11, 8, 15, 4, 19, 1, 12, 7, 16, 3, 18, 9, 14, 5, 10];
const BASE = '2026-W48';
export const weekOf = (ms = Date.now()) => { const d = new Date(ms + 9 * 3600e3); d.setUTCHours(0, 0, 0, 0); const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day); const y = d.getUTCFullYear(); const w = Math.ceil(((d - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7); return `${y}-W${String(w).padStart(2, '0')}`; };
/* 주 시작(월 0시 KST)의 UTC ms */
export function weekStart(p) {
  const m = /^(\d{4})-W(\d{2})$/.exec(String(p || '')); if (!m) return NaN;
  const y = +m[1], w = +m[2], j4 = Date.UTC(y, 0, 4), dow = new Date(j4).getUTCDay() || 7;
  return j4 - (dow - 1) * 864e5 + (w - 1) * 7 * 864e5 - 9 * 3600e3;
}
export function arenaStage(p = weekOf()) {
  const k = Math.round((weekStart(p) - weekStart(BASE)) / (7 * 864e5)), L = ARENA_POOL.length;
  return ARENA_POOL[((k % L) + L) % L];
}
/* 이번 판이 순위 판인가: 무한 모드 · 이번 주 전장 */
export const isArena = (stage, mode, p = weekOf()) => mode === 1 && stage === arenaStage(p);
/* 마감(월 0시) 남은 시간 글 */
export function leftText(ms = Date.now()) {
  const end = weekStart(weekOf(ms)) + 7 * 864e5, h = Math.max(0, Math.floor((end - ms) / 3600e3));
  return h >= 48 ? `${Math.floor(h / 24)}일 남음` : h >= 1 ? `${h}시간 남음` : '곧 마감';
}
/* 결과 화면 한 줄 (oad_bm v3 rank.line 을 웨이브 말로) */
export function lineOf(bm, r) {
  const l = bm.rank && bm.rank.line ? bm.rank.line(r) : null; if (!l) return null;
  const fix = t => String(t || '').replace(/이번 주 내 최고 ([\d,]+)$/, '이번 주 내 최고 웨이브 $1').replace(/([\d,]+)점 더면/, '웨이브 $1 더면');
  return { title: fix(l.title), sub: fix(l.sub) };
}
