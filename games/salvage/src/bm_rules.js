// 수달 인양단 BM 숫자 규칙 (화면 · 원어데이 없이 — node 시험에서도 그대로) · 쓰는 곳: bmflow.js · tools/bm_e2e.mjs
// 은신처 공사 즉시 완성 (docs/bm-policy.md 2-1 · 캠프 · 더팜과 같은 계산 · 서버 SHOP.salvage inst1~150)
//   값 = min(공사 전체 값 × 남은 비율, 남은 시간 곡선) → 가장 가까운 위 등급 · 10초 미만 숨김 · 1분 이하 무료(대표 11-03 '작은 일은 가끔 무료')
//   공사 시간 5분 · 30분 · 2시간 · 6시간 → 처음 값 1 · 10 · 70 · 150 (30분 10 · 1시간 25 · 2시간 60 · 4시간 150 기준과 같은 곡선)
export const INST = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 100, 120, 150];
export const INST_MIN = 10, INST_FREE = 60, GOLD_MAX = 150;
const up = g => INST.find(v => v >= g) || INST[INST.length - 1];
export const speedCost = sec => (sec <= INST_FREE ? 0 : up(Math.max(1, Math.round((sec / 300) ** 1.3))));
export function instGold(durS, leftS) {
  if (!(leftS >= INST_MIN) || leftS <= INST_FREE) return 0;
  const p = Math.max(1, Math.ceil(speedCost(durS) * Math.min(1, leftS / Math.max(1, durS))));
  return up(Math.min(p, speedCost(leftS)));
}
// 광고 하루 횟수 (게임 쪽 · 앱 한도 shell/bm.js 와 별개 — 보여 주는 'N번'은 둘 중 작은 값)
export const AD = { sortie: 2, inst: 5 };
// 이어하기: 판당 2번 — 첫 번째만 광고 길, 두 번째는 골드만 (20 → 40)
export const CONT = [{ sku: 'continue', ad: true }, { sku: 'continue2', ad: false }];
// 권유 조건 ('아깝다' 순간만 · bm-policy 5장): 처음 3판 X · 60초 미만이면서 가방 가치 40 미만인 판 X
export const contWorth = (raids, elapsed, bagValue) => raids > 3 && (elapsed >= 60 || bagValue >= 40);
