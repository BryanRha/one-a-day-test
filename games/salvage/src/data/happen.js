// 수달 인양단 — 판 중 사건 5 (M6-C · 검수 M5 목록 10 '레벨 −1 지키기') · three 없이 읽힘(node 시뮬 · 시험)
//  판마다 많아야 하나 · 튜토리얼(첫 3판) · 대수문 · 주간 도전 판엔 없음 · seed 로 정해짐(같은 판 = 같은 사건 → 봇 · 시뮬 재현)
//  모든 사건은 먼저 알림(위쪽 한 줄 대기열 ui.event) + 자리 표시(화면 밖 화살표) → 그 뒤 일어남. 사건 자체가 주는 피해 0 (수송대 호위는 보통 적 공격 = 늘 예고)
//  보상 = 상자 하나(LOOT_TABLE 종류로 굴림) — 경제 영향은 tools/sim.mjs 가 같은 표로 셈(BALANCE 9장)
export const HAPPEN = {
  chance: 0.5,              /* 판마다 사건이 있을 확률 (첫 3판 뒤) */
  minRaids: 3,
  kinds: {
    drop:   { name: '보급 투하', icon: '📦', w: 3, zone: [1, 2], at: [55, 140], warn: 8, open: 70, loot: ['chest', 'crate'], z: 3,
              txt: '보급 투하 — {s}초 뒤 {zone}에 떨어져요 (노란 빛기둥)', land: '보급 상자가 떨어졌어요 — {n}초 안에 열어요', gone: '보급 상자가 물살에 떠내려갔어요' },
    rescue: { name: '조난 수달 구조', icon: '🆘', w: 2, zone: [1, 2, 3], at: [18, 40], hold: 2.4, loot: ['locker', 'chest'], z: 2,
              txt: '조난 신호 — {zone}에 수달이 갇혔어요 (분홍 빛)', thanks: '구조 완료! 수달이 감사 꾸러미를 두고 갔어요' },
    convoy: { name: '검은 닻 수송대', icon: '⚓', w: 2, zone: [2, 3], at: [70, 150], minLv: 4, escorts: 3, speed: 1.5, life: 75, loot: ['cargo', 'chest'], z: 3,
              txt: '검은 닻 수송대가 {zone}을 지나가요 — 호위를 쓰러뜨리면 짐수레가 멈춰요', stop: '수송대 짐수레가 멈췄어요 — 뒤져요!', gone: '수송대가 지나갔어요' },
    safe:   { name: '잠긴 금고', icon: '🔐', w: 2, zone: [2, 3], at: [10, 25], hold: 2.0, loot: ['vault'], z: 3,
              txt: '잠긴 금고 — {zone} 어딘가에 번호 쪽지가 있어요', note: '번호 쪽지를 주웠어요 — 금고를 열 수 있어요', open: '금고가 열렸어요!' },
    beacon: { name: '고장 난 신호기', icon: '📡', w: 2, zone: [1, 2], at: [20, 60], hold: 1.6, show: 45,
              txt: '고장 난 신호기 — {zone}에서 고치면 둘레 상자 등급이 보여요', on: '신호기 수리 — {n}초 동안 이 구역 상자 빛이 보여요' },
  },
};
export const HAPPEN_KEYS = Object.keys(HAPPEN.kinds);
/* 같은 seed → 같은 사건 (mulberry32) */
function mb(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/* 이번 판 사건: { k, at, zone, r } 또는 null — opt.force = 사건 키(?hap=) · opt.off */
export function rollHappen(seed, map, raids, lv = 1, opt = {}) {
  if (opt.off || map === 'gate' || opt.chal) return null;
  const R = mb((seed | 0) * 31 + 7);
  if (!opt.force && (raids < HAPPEN.minRaids || R() >= HAPPEN.chance)) return null;
  const pool = HAPPEN_KEYS.filter(k => opt.force ? k === opt.force : !(HAPPEN.kinds[k].minLv > lv));
  if (!pool.length) return null;
  const tot = pool.reduce((s, k) => s + HAPPEN.kinds[k].w, 0); let r = R() * tot, k = pool[0];
  for (const x of pool) { r -= HAPPEN.kinds[x].w; if (r <= 0) { k = x; break; } }
  const K = HAPPEN.kinds[k]; const zone = K.zone[Math.floor(R() * K.zone.length)];
  return { k, zone, at: K.at[0] + R() * (K.at[1] - K.at[0]), r: R() };
}
