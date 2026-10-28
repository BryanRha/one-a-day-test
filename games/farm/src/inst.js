// 즉시 완성 값 (docs/bm-policy.md 2-1, 2026-10-29 대표) — 브라우저 없이도 읽히는 순수 계산 (store.js · tools/inst_check.mjs 가 같이 씀)
//   골드 = 생산품 기본값(오래 걸릴수록 비쌈 · 약 1골드 ≈ 5분, 30분이 넘으면 덜) × 남은 비율 → 올림 · 최소 1 · 보석 경로(남은 5분마다 💎1)보다 비싸지 않게 · 등급으로 내림
//   등급 = 서버 SKU instN (oneaday/server/api/_lib/gold.js SHOP.farm) · 남은 시간이 10초 미만이면 유료 · 광고 버튼을 숨김
export const speedCost = sec => Math.max(1, Math.ceil(sec / 300));             /* 보석: 남은 5분마다 💎1 (최소 1) · 💎1 ≈ 1골드 (gems100 = 100골드) */
export const INST_MIN = 10;
export const INST = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25];
const TIER = [[300, 1], [600, 2], [900, 3], [1200, 4], [1800, 6], [2700, 8], [3600, 10], [7200, 15], [14400, 25]];   /* 기본 시간(초) 이하 → 기본값 */
const down = g => INST.reduce((a, v) => (v <= g ? v : a), INST[0]);
export const instBase = T => down(Math.min(Math.ceil(T / 300), (TIER.find(([s]) => T <= s) || [0, 25])[1]));
// baseT = 생산품 기본 시간 · durS = 이 칸이 실제로 걸리는 시간(업그레이드 · 연구 반영) · leftS = 남은 시간 (모두 초)
export function instGold(baseT, durS, leftS) { if (!(leftS >= INST_MIN)) return 0; const p = Math.max(1, Math.ceil(instBase(baseT) * Math.min(1, leftS / Math.max(1, durS)))); return down(Math.min(p, speedCost(leftS))); }
export const instSku = g => `inst${g}`;
