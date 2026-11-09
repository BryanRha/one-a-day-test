// 맵 5 '심해 연구소' 데이터 (M4-B · v0.7) — 지도 · 적(빛이끼 포자낭 · 연구소 경비 기계) · 5장 보스(청록 어미) · 지도 상태 · 장치 숫자 · 전리품 · 기억 조각
//  data.js 가 이 파일을 읽어 MAPS · ENEMIES · BOSS · VARIANTS · CONDS · ITEMS · LOOT_TABLE · DAILY_MAP 에 펼침 (숫자 조정은 여기서만)
//  NARRATIVE 5장 '파수의 목소리': 대수문 바로 밑 · 산호를 다시 키우던 연구소이자 파수의 머리(관제실) · 빛이끼가 처음 자란 곳
//   · 보스 = 청록 어미(빛이끼 덩어리 — 연구소 수조 전체). 관제 기계(파수의 손발)는 6장 최종 보스 '파수'와 겹쳐 고르지 않음 → 연구소 경비 기계는 일반 적으로
//  이야기 연결(M4-C): 해금 키 MAP_UNLOCK('map_lab' — 4장 끝 의뢰가 done 에 넣음) · 기억 조각 사연 LAB_MEMO · 벽 낙서 LAB_GRAF · 이야기 물건 4(coralnote · noeulrec · holdlist · labcard)

export const MAP_UNLOCK = 'map_lab';

export const L_MAP = {
  name: '심해 연구소', short: '연구소', icon: '🧪', unlock: MAP_UNLOCK, lock: '4장을 마치면 열려요', pack: 'lab', bossKind: 'mother', night: 0.35,
  blurb: '연구동 입구 → 수조 · 배양실 → 관제실 · 파수 코어 앞', tips: '수압 문은 잠깐씩 닫혀요(노란 불 = 곧 닫힘). 배양조 유리는 총알에 깨져요. 관제 터미널 두 곳을 승인하면 파수 반출 해치가 열려요',
  zones: {
    1: { name: '연구동 입구', short: '입구', hp: 1.55, dmg: 1.35, boxes: { locker: 35, lshelf: 30, crate: 15, labcab: 20 }, nLoot: [1, 2], nEnemy: [1, 2], foes: { sporer: 35, drone: 35, skel: 30 } },
    2: { name: '수조 · 배양실', short: '배양실', hp: 1.95, dmg: 1.68, boxes: { labcab: 35, culture: 30, toolbox: 20, lshelf: 15 }, nLoot: [2, 3], nEnemy: [1, 2], foes: { sporer: 40, warden: 30, skel: 30 } },
    3: { name: '관제실 · 파수 코어 앞', short: '관제실', hp: 2.4, dmg: 1.95, boxes: { archive: 45, labcab: 20, chest: 35 }, nLoot: [2, 3], nEnemy: [2, 2], elite: true, foes: { warden: 40, sporer: 30, drone: 30 } } },
  exits: { early: '연구동 비상 계단', power: '수압 승강기', sub: '파수 반출 해치' },
  /* 지도 상태(판마다 하나 · plan 이 고름) — 공통 판 상태 5(밤 · 폭풍 · 안개 · 한파 · 독수)는 data/weather.js 가 따로 겹침 */
  conds: { leak: 35, bloom: 35, lockdown: 30 }, loot: 1.9,
};

/* ───── 연구소 적 2 + 5장 보스 ─────
 *  포자낭(빛이끼 변종): 빛 · 따뜻함을 따라옴(빛 속에 선 주인공을 더 멀리서 봄) · 둘레 원 예고 → 포자 터짐(피해 + 이끼 자리) · 쓰러지면 이끼 자리 남김 · 불에 약함
 *  경비 기계(파수의 손발 · 수리공사 연구소 경비): 앞 탐조 빛 부채꼴 · 겨냥 줄 예고 0.7초 → 수압 탄(벽까지 곧게) · 앞 방패 50%(옆 · 뒤가 약점) · 알아채면 둘레 14m 경보
 *  청록 어미(5장 보스 · 빛이끼 덩어리): 덩굴 채찍(줄 경고 → 내려침 → 심장 산호가 2초 드러남 = 약점 ×2 · 세 보스와 같은 규칙) · 포자 비(원 4) · 빛 삼키기(60% 아래 · 둘레 큰 원 → 5초 어둠 + 포자낭 2) */
export const L_ENEMIES = {
  sporer: { name: '빛이끼 포자낭', hp: 88, speed: 1.5, chase: 3.4, sight: 7.5, fov: 6.3, hear: 1.1, atk: 'spore', dmg: 12, range: 2.6, cd: 2.2, radius: 0.55, loot: 'lspore', wind: 0.8, fac: 'moss', lightSeek: 1.6, fireWeak: 1.6 },
  warden: { name: '연구소 경비 기계', hp: 150, speed: 2.0, chase: 3.8, sight: 12, fov: 1.1, hear: 1.0, atk: 'beam', dmg: 16, range: 12, cd: 2.4, radius: 0.6, loot: 'lguard', wind: 0.7, fac: 'machine', machine: true, shield: 0.5, spot: true, alarm: 14 },
  mother: { name: '청록 어미', hp: 1400, speed: 0.75, chase: 1.5, sight: 15, fov: 6.3, hear: 1.6, atk: 'mother', dmg: 24, range: 13, cd: 2.0, radius: 1.5, loot: 'bossL', boss: true, fac: 'moss' },
};
/* 경비 기계 수압 탄 · 포자 터짐이 남기는 이끼 자리 */
export const BEAM = { speed: 26, r: 0.5, life: 0.6 };
export const SPORE = { patch: 2.0, patchT: 7 };
export const L_BOSS = {
  mother: { lash: { wind: 0.95, len: 9.5, w: 1.8, dmg: 22, near: 8 }, spore: { wind: 1.1, n: 4, r: 1.7, dmg: 14, patch: 1.6, patchT: 6 },
    dim: { wind: 1.0, r: 7, dark: 5, adds: 2, below: 0.6, cd: 13 }, weak: 2.0, weakMul: 2 },
};
export const L_VARIANTS = {
  drone: { name: '연구소 순찰 드론', hp: 1.15, color: 0xd8e4e6 },
  skel: { name: '표본 해골', hp: 1.12, tint: [0.62, 0.86, 0.82] },
};
/* 지도 상태 (판마다 하나) — raid.js · lab.js 가 읽음 · wx: 공통 판 상태 5 중 어디에 속하나 (없으면 null) */
export const L_CONDS = {
  leak:     { name: '누수', txt: '연구동 곳곳에 물이 새요 — 바닥 물이 많고 수압 문이 자주 닫혀요', fog: [22, 46], wx: null, press: 0.8 },
  bloom:    { name: '이끼 번성', txt: '빛이끼가 퍼졌어요 — 이끼 자리가 넓고 포자낭이 많아요(불로 태울 수 있어요)', fog: [22, 46], vis: 0.95, wx: null, moss: 1 },
  lockdown: { name: '봉쇄', txt: '파수가 연구소를 봉쇄했어요 — 경비 기계가 많고 수압 문이 오래 닫혀요', fog: [24, 48], wx: null, press: 1.3, guard: 1 },
};
/* 연구소 장치 숫자 */
export const PRESS = { open: 7, warn: 1.0, shut: 3, n: [2, 3] };   /* 수압 문: 열림 7초 → 노란 불 1초 → 3초 닫힘 (지도 상태가 배수) · 문 2~3 */
export const TANK = { hp: 55, spill: 4.5, mossT: 9, burst: 0.4 };   /* 배양조: 총알 55 피해에 깨짐 → 물 · 포자가 쏟아짐(이끼 자리 9초) · 40% 로 포자낭이 나옴 */
export const MOSS = { slow: 0.68, grow: 0.06, max: 1.35, burn: 1.2, lit: 1 }; /* 이끼 자리: 이동 ×0.68 · 서 있으면 빛남(적이 봄) · 천천히 넓어짐(최대 ×1.35) · 불에 탐 */
export const TERM = { hold: 1.6, need: 2, noise: 12 };             /* 관제 터미널: 1.6초 승인 · 두 곳 = 반출 해치 열림 */

/* ───── 전리품 (map: 'lab') · 이야기 물건(cat memo) ─────
 *  지도 물건 5: 빛이끼 표본 · 산호 조각 · 연구 일지 · 냉각수 통 · 해독제(독수 판의 해독)
 *  기억 조각 4(이야기 의뢰가 그 지도 · 구역 상자 하나에 넣음 — M4-C): 산호 복원 일지 · 노을의 녹음기 · 보관 목록 출력지 · 연구원 출입증 */
export const L_ITEMS = {
  sample:    { name: '빛이끼 표본', cat: 'part', w: 1, h: 1, wt: 0.3, val: 30, dis: { glass: 1, herb: 2 }, model: 'bottle_g', color: '#5fffd0', desc: '병 안에서 아직 빛난다.', map: 'lab' },
  coral:     { name: '산호 조각', cat: 'treasure', w: 1, h: 1, wt: 0.4, val: 92, model: 'gem', color: '#ff9ab0', desc: '연구소가 다시 키우던 산호.', map: 'lab' },
  labbook:   { name: '연구 일지', cat: 'treasure', w: 2, h: 1, wt: 0.6, val: 58, model: 'book', color: '#e8f2f0', desc: '물에 번진 그래프가 가득.', map: 'lab' },
  coolant:   { name: '냉각수 통', cat: 'scrap', w: 1, h: 2, wt: 1.6, val: 24, dis: { glass: 1, wire: 2 }, model: 'o2can', color: '#7fd8ff', desc: '차갑다. 유리와 전선이 된다.', map: 'lab' },
  antitox:   { name: '해독제', cat: 'med', w: 1, h: 1, wt: 0.2, val: 20, heal: 15, cure: 1, model: 'bottle_g', color: '#b8ff6a', desc: '독을 씻어 냄 + 체력 15 (독이 오르면 저절로 씀).', map: 'lab' },
  coralnote: { name: '산호 복원 일지', cat: 'memo', w: 2, h: 1, wt: 0.5, val: 1, model: 'book', color: '#9fe8d8', desc: '"지키려고 만든 이끼" — 첫 장.' },
  noeulrec:  { name: '노을의 녹음기', cat: 'memo', w: 1, h: 1, wt: 0.3, val: 1, model: 'battery', color: '#d8a840', desc: '등불 수색대 표식이 긁혀 있다.' },
  holdlist:  { name: '보관 목록 출력지', cat: 'memo', w: 1, h: 2, wt: 0.2, val: 1, model: 'ticket', color: '#f2ead8', desc: '"보관 중 · 주인 미확인" 이 끝없이.' },
  labcard:   { name: '연구원 출입증', cat: 'memo', w: 1, h: 1, wt: 0.05, val: 1, model: 'ticket', color: '#3f8fa8', desc: '사진 자리가 빛이끼로 덮였다.' },
};
export const L_LOOT = {
  lshelf:  { name: '표본 선반', n: [1, 3], w: { sample: 3, kelp: 2, lens: 2, coolant: 2, med: 1, antitox: 2, chip: 1 } },
  labcab:  { name: '연구실 서랍장', n: [2, 3], w: { labbook: 2, lens: 2, chip: 2, cable: 2, med: 2, antitox: 2, spring: 1, sample: 2, coins: 1 } },
  culture: { name: '배양 상자', n: [1, 3], w: { sample: 4, coral: 1, kelp: 2, coolant: 2, gem: 1, antitox: 1 } },
  archive: { name: '기록 보관함', n: [2, 3], w: { labbook: 3, chip: 3, core: 1, coral: 2, compass: 1, battery: 2, pearl: 1 } },
  lspore:  { name: '포자낭 잔해', n: [0, 2], w: { sample: 3, kelp: 2, antitox: 1 } },
  lguard:  { name: '경비 기계 잔해', n: [1, 2], w: { chip: 3, cable: 2, spring: 2, battery: 1, lens: 1 } },
  bossL:   { name: '청록 어미 잔해', n: [2, 3], w: { coral: 3, sample: 2, pearl: 2, compass: 1, core: 2 }, fixed: ['vkey', 'core'] },
};
export const L_DAILY = [{ item: 'sample', n: 3, mat: { glass: 2 } }, { item: 'coral', n: 1, mat: { herb: 4 } }, { item: 'labbook', n: 1, mat: { wire: 3 } }, { item: 'coolant', n: 2, mat: { bolt: 4 } }];

/* 기억 조각 사연 (60자 · 두 줄 — 세 번째에 둘째 줄) · 벽 낙서 6 — talk/memo.js 가 MEMO · GRAF 에 펼침 (M4-C 연결) */
export const LAB_MEMO = {
  sample:    ['병 속 빛이끼. 라벨: "3호 · 따뜻하면 자람".', '라벨 아래 덧쓴 글씨: "빛을 너무 좋아함".'],
  coral:     ['연구소가 다시 키우던 산호. 아직 분홍빛.', '밑동에 청록 실 같은 이끼가 감겨 있다.'],
  labbook:   ['연구 일지. 산호가 자라는 그래프가 위로만.', '마지막 장 그래프는 칸 밖으로 뻗어 나갔다.'],
  coolant:   ['냉각수 통. 대수문 냉각관 번호가 찍혀 있다.', '통 옆에 서리꽃이 핀 자국.'],
  coralnote: ['산호 복원 일지 첫 장: "지키려고 만든 이끼".', '끝 장: "우리가 문을 열면, 이끼도 나간다."'],
  noeulrec:  ['노을의 녹음기. 등불 수색대 표식이 긁혀 있다.', '"파수, 등불 든 애가 오면 이것만 전해 줘."'],
  holdlist:  ['출력지 한 장 가득: 보관 중 · 주인 미확인.', '맨 끝 숫자: 412,880. 아직 끝이 아니다.'],
  labcard:   ['연구원 출입증. 사진 자리가 이끼로 덮였다.', '뒷면: "수조 3번 물 갈기 — 내일 꼭".'],
};
export const LAB_GRAF = ['산호야 잘 자라', '수조 3번 손대지 마시오', '보관 중 · 주인 미확인', '등불 → 관제실 (노을)', '추워요 — 냉각기 고장', '이끼는 빛을 따라감'];
