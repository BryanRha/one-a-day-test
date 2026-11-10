// 수달 인양단 — 데이터 · 숫자 (조정은 여기서만). three 없이 읽힘 → node 시뮬 · 시험에서도 씀
export const VERSION = '0.9.0';
import { F_MAP, F_ENEMIES, F_BOSS, F_VARIANTS, F_CONDS, F_ITEMS, F_LOOT, F_DAILY } from './data/map_factory.js?v=0.99.17'; /* 맵 4 가라앉은 공장 (M3-B) */
import { M4_ENEMIES, M4_BOSS, M4_VARIANTS, M4_ITEMS, M4_LOOT } from './data/enemies.js?v=0.99.17'; /* M4-A 새 적 5 · 검은 닻 두목 */
import { L_MAP, L_ENEMIES, L_BOSS, L_VARIANTS, L_CONDS, L_ITEMS, L_LOOT, L_DAILY } from './data/map_lab.js?v=0.99.17'; /* 맵 5 심해 연구소 (M4-B) */
import { STORY_ITEMS } from './data/quests.js?v=0.99.17';
import { G_MAP, G_ENEMIES, G_BOSS, G_VARIANTS, G_CONDS, G_ITEMS, G_LOOT } from './data/map_gate.js?v=0.99.17'; /* M5-A 6장 최종 무대 대수문 꼭대기 · 최종 보스 파수 */ /* M3-C 이야기 물건 (ITEMS 끝에 붙음) */

/* ───── 재료 (창고 숫자로만 셈 · 분해해서 얻음) ───── */
export const MATS = {
  bolt:   { name: '볼트',   color: '#9aa4ad' },
  wire:   { name: '전선',   color: '#d98b4a' },
  cloth:  { name: '천',     color: '#7fa6c9' },
  glass:  { name: '유리',   color: '#6fe0d8' },
  herb:   { name: '약초',   color: '#79c08f' },
  powder: { name: '화약',   color: '#c9604a' },
};
export const MAT_KEYS = Object.keys(MATS);

/* ───── 전리품 ─────
 * cat: scrap 고철(분해 → 재료) · part 부품(제작에 그대로) · treasure 보물(팔기 · 감정) · med 소모품 · key 열쇠
 * w×h 칸 · wt 무게(kg) · val 조개 · dis 분해 결과 · model props.glb 키 또는 코드 모양(gem/orb/disc/coil/chip)
 */
export const ITEMS = {
  /* 고철 */
  can:     { name: '녹슨 통조림', cat: 'scrap', w: 1, h: 1, wt: 0.4, val: 6,  dis: { bolt: 1 },           model: 'can_a',    color: '#c9a36a', desc: '분해하면 볼트.' },
  soda:    { name: '탄산 캔',     cat: 'scrap', w: 1, h: 1, wt: 0.2, val: 5,  dis: { bolt: 1 },           model: 'can_b',    color: '#7fb7d9', desc: '김은 빠졌다.' },
  boot:    { name: '고무 장화',   cat: 'scrap', w: 1, h: 2, wt: 1.0, val: 8,  dis: { cloth: 2 },          model: 'bottle_b', color: '#5d6b4a', desc: '한 짝뿐.' },
  tarp:    { name: '방수포',      cat: 'scrap', w: 2, h: 1, wt: 0.8, val: 10, dis: { cloth: 3 },          model: 'rug',      color: '#7fa6c9', desc: '천 재료가 된다.' },
  cable:   { name: '구리 전선',   cat: 'scrap', w: 1, h: 2, wt: 0.8, val: 14, dis: { wire: 3 },           model: 'coil',     color: '#d98b4a', desc: '전선 재료.' },
  gear:    { name: '기계 부품',   cat: 'scrap', w: 2, h: 1, wt: 1.5, val: 22, dis: { bolt: 3, wire: 1 },  model: 'k_cog',    color: '#9aa4ad', desc: '볼트가 잔뜩.' },
  motor:   { name: '낡은 모터',   cat: 'scrap', w: 2, h: 2, wt: 4.0, val: 42, dis: { bolt: 4, wire: 4 },  model: 'k_machine',color: '#8c96a0', desc: '무겁지만 알차다.' },
  /* 부품 (제작 재료로 그대로 씀) */
  spring:  { name: '강철 스프링', cat: 'part', w: 1, h: 1, wt: 0.2, val: 16, dis: { bolt: 2 },  model: 'coil',  color: '#c7d0d6', desc: '총열 · 탄창 개조에.' },
  lens:    { name: '렌즈',        cat: 'part', w: 1, h: 1, wt: 0.2, val: 28, dis: { glass: 2 }, model: 'disc',  color: '#bfeaff', desc: '조준경 개조에.' },
  pkeg:    { name: '화약 통',     cat: 'part', w: 1, h: 2, wt: 1.2, val: 20, dis: { powder: 3 },model: 'k_bucket', color: '#c9604a', desc: '약실 개조 · 투척물에.' },
  chip:    { name: '드론 칩',     cat: 'part', w: 1, h: 1, wt: 0.1, val: 15, dis: { wire: 2 },  model: 'chip',  color: '#7dffb2', desc: '드론 잔해에서.' },
  core:    { name: '동력 코어',   cat: 'part', w: 1, h: 1, wt: 1.0, val: 80, dis: null,         model: 'orb',   color: '#ffb44a', desc: '최고 단계 제작에 꼭 필요.' },
  kelp:    { name: '해초 다발',   cat: 'part', w: 1, h: 1, wt: 0.1, val: 4,  dis: { herb: 2 },  model: 'bottle_g', color: '#79c08f', desc: '연고 · 요리 재료.' },
  /* 소모품 */
  med:     { name: '해초 연고',   cat: 'med', w: 1, h: 1, wt: 0.2, val: 14, heal: 40, model: 'bottle_g', color: '#79c08f', desc: '체력 40 회복.' },
  bandage: { name: '큰 붕대',     cat: 'med', w: 1, h: 1, wt: 0.3, val: 24, heal: 80, model: 'tarpS',    color: '#e8e2d0', desc: '체력 80 회복.' },
  smoke:   { name: '연막탄',      cat: 'med', w: 1, h: 1, wt: 0.4, val: 12, throw: 'smoke', model: 'can_b', color: '#b9c4c9', desc: '7초 동안 적 시야를 가림.' },
  nade:    { name: '수류탄',      cat: 'med', w: 1, h: 1, wt: 0.5, val: 18, throw: 'nade',  model: 'orbS',  color: '#6b7d4a', desc: '반경 3m 큰 피해.' },
  /* 보물 */
  key:     { name: '녹슨 열쇠',   cat: 'treasure', w: 1, h: 1, wt: 0.1, val: 12, model: 'key',   color: '#e3c25a', desc: '어느 문인지는 모른다.' },
  coins:   { name: '옛 동전',     cat: 'treasure', w: 1, h: 1, wt: 0.3, val: 24, model: 'coins', color: '#f0c94a', desc: '바닷물에도 빛난다.' },
  rum:     { name: '선원의 병',   cat: 'treasure', w: 1, h: 2, wt: 1.0, val: 18, model: 'bottle_b', color: '#b07a4a', desc: '라벨이 반쯤 녹았다.' },
  book:    { name: '항해 일지',   cat: 'treasure', w: 2, h: 1, wt: 0.6, val: 20, model: 'book',  color: '#8f6bb5', desc: '마지막 장이 젖어 있다.' },
  gem:     { name: '바다 유리',   cat: 'treasure', w: 1, h: 1, wt: 0.1, val: 45, dis: { glass: 2 }, model: 'gem', color: '#6fe0d8', desc: '파도가 깎은 보석.' },
  pearl:   { name: '흑진주',      cat: 'treasure', w: 1, h: 1, wt: 0.1, val: 75, model: 'orb',   color: '#4b4f6b', desc: '깊은 곳에서만.' },
  compass: { name: '금 나침반',   cat: 'treasure', w: 1, h: 1, wt: 0.5, val: 95, model: 'disc',  color: '#f0c94a', desc: '아직 북쪽을 가리킨다.' },
  chest:   { name: '작은 금고',   cat: 'treasure', w: 2, h: 2, wt: 6.0, val: 70, model: 'chest', color: '#d9a441', desc: '무겁다. 그래서 값지다.' },
  crown:   { name: '잠수왕의 투구', cat: 'treasure', w: 2, h: 2, wt: 5.0, val: 220, model: 'k_tank', color: '#ffd36b', desc: '금고실의 주인.' },
  /* v0.4 밤의 항구 */
  rope:    { name: '굵은 밧줄',   cat: 'scrap', w: 1, h: 2, wt: 1.2, val: 9,  dis: { cloth: 3 },          model: 'rope',  color: '#b8925a', desc: '부두 기둥에 감겨 있던 것.', map: 'harbor' },
  fish:    { name: '말린 생선',   cat: 'part',  w: 1, h: 1, wt: 0.3, val: 8,  dis: { herb: 3 },           model: 'fish',  color: '#9fb6c4', desc: '요리 재료 · 약초가 된다.', map: 'harbor' },
  spyglass:{ name: '선장의 망원경', cat: 'treasure', w: 1, h: 2, wt: 0.8, val: 88, dis: { glass: 3 },     model: 'tube',  color: '#c99a4a', desc: '렌즈가 아직 맑다.', map: 'harbor' },
  beacon:  { name: '등대 렌즈',   cat: 'treasure', w: 2, h: 2, wt: 3.0, val: 160, model: 'disc', color: '#fff0b0', desc: '빛을 모으던 커다란 유리.', map: 'harbor' },
  /* v0.4 해저 터널 */
  rail:    { name: '구리 레일 조각', cat: 'scrap', w: 2, h: 1, wt: 2.5, val: 26, dis: { bolt: 2, wire: 3 }, model: 'rail', color: '#c07a4a', desc: '무겁지만 전선이 가득.', map: 'tunnel' },
  ticket:  { name: '옛 승차권',   cat: 'treasure', w: 1, h: 1, wt: 0.05, val: 30, model: 'ticket', color: '#e8d9a0', desc: '마지막 열차 표.', map: 'tunnel' },
  battery: { name: '심해 배터리', cat: 'part', w: 1, h: 1, wt: 0.8, val: 34, dis: { wire: 3, powder: 1 }, model: 'battery', color: '#4fd1c5', desc: '아직 찌릿하다.', map: 'tunnel' },
  o2:      { name: '산소 캔',     cat: 'med', w: 1, h: 1, wt: 0.5, val: 16, o2: 60, model: 'o2can', color: '#7fd0ff', desc: '산소 60 (터널에서 모자라면 저절로 씀).', map: 'tunnel' },
  fang:    { name: '장어 이빨',   cat: 'treasure', w: 1, h: 1, wt: 0.2, val: 120, model: 'fang', color: '#f4f1e6', desc: '터널 장어의 것.', map: 'tunnel' },
  /* 열쇠 */
  vkey:    { name: '금고 열쇠',   cat: 'key', w: 1, h: 1, wt: 0.1, val: 30, model: 'key', color: '#ffd36b', desc: '금고실 문을 연다 (쓰면 사라짐).' },
  /* v0.5 이야기 물건 (cat memo) — 이야기 의뢰가 열려 있을 때만 그 지도 · 구역 상자 하나에 들어감 · 들고 나오면 창고 대신 기억 도감으로 (story.js) */
  tagbox:   { name: '이름표 붙은 상자', cat: 'memo', w: 1, h: 1, wt: 0.3, val: 1, model: 'chest',    color: '#d9b47a', desc: '손글씨 이름표가 붙어 있다.' },
  tagbundle:{ name: '이름표 묶음',   cat: 'memo', w: 1, h: 1, wt: 0.2, val: 1, model: 'ticket',   color: '#e8d9a0', desc: '찢지 않고 뗀 이름표들.' },
  ferrytix: { name: '배표 꾸러미',   cat: 'memo', w: 1, h: 1, wt: 0.2, val: 1, model: 'ticket',   color: '#bfe0f0', desc: '젖은 배표가 끈으로 묶여 있다.' },
  ledger:   { name: '낡은 장부',     cat: 'memo', w: 1, h: 1, wt: 0.5, val: 1, model: 'book',     color: '#6b8fb5', desc: '곰방 상회 장부.' },
  roster:   { name: '승객 명부',     cat: 'memo', w: 1, h: 1, wt: 0.4, val: 1, model: 'book',     color: '#a0b88f', desc: '마지막 열차 승객 명부.' },
  lboot:    { name: '고무 장화(왼쪽)', cat: 'memo', w: 1, h: 2, wt: 1.0, val: 1, model: 'bottle_b', color: '#5d6b4a', desc: '열차 좌석 밑에 있던 한 짝.' },
  tape:     { name: '녹음기',        cat: 'memo', w: 1, h: 1, wt: 0.3, val: 1, model: 'battery',  color: '#8a9aa6', desc: '은신처에서 들어 볼 수 있다.' },
  ...F_ITEMS,
  ...M4_ITEMS,
  ...L_ITEMS,
  ...STORY_ITEMS,
  ...G_ITEMS,
};
export const ITEM_KEYS = Object.keys(ITEMS);
export const CATS = { scrap: '고철', part: '부품', treasure: '보물', med: '소모품', key: '열쇠', memo: '기억' };

/* 상자 종류별 나오는 것 (가중치) · n 개수 범위 */
export const LOOT_TABLE = {
  crate:   { name: '나무 상자', n: [1, 2], w: { can: 5, soda: 4, tarp: 2, boot: 2, kelp: 3, gear: 2, cable: 1, med: 1 } },
  barrel:  { name: '기름통',   n: [0, 2], w: { soda: 3, can: 2, rum: 3, kelp: 2, pkeg: 1 } },
  locker:  { name: '사물함',   n: [2, 3], w: { med: 3, book: 2, coins: 3, kelp: 2, spring: 2, lens: 1, key: 1, chip: 1 } },
  toolbox: { name: '공구함',   n: [2, 3], w: { gear: 4, cable: 3, spring: 3, motor: 1, lens: 2, pkeg: 2, chip: 2 } },
  chest:   { name: '선장 금고', n: [2, 3], w: { coins: 4, gem: 3, pearl: 2, compass: 1, chest: 1, rum: 1, core: 1, lens: 1 } },
  vault:   { name: '금고실 보관함', n: [3, 4], w: { pearl: 3, compass: 3, gem: 3, crown: 1, core: 2, chest: 2 } },
  body:    { name: '잔해',     n: [1, 2], w: { chip: 3, gear: 2, spring: 2, can: 1, med: 1, cable: 1 } },
  boss:    { name: '수문지기 잔해', n: [2, 3], w: { pearl: 3, compass: 2, gem: 2, core: 2 }, fixed: ['vkey', 'core'] },
  /* v0.4 밤의 항구 */
  net:     { name: '어망 더미',   n: [1, 2], w: { rope: 4, fish: 4, kelp: 3, can: 2, soda: 2, tarp: 1 } },
  cargo:   { name: '화물 컨테이너', n: [2, 3], w: { coins: 3, motor: 2, cable: 3, gear: 3, rum: 2, book: 1, spyglass: 1, pkeg: 1 } },
  crab:    { name: '게 껍데기',   n: [0, 1], w: { kelp: 3, fish: 2, gem: 1, spring: 1 } },
  bossH:   { name: '갈고리 선장 잔해', n: [2, 3], w: { pearl: 3, spyglass: 2, compass: 2, beacon: 1, core: 2 }, fixed: ['vkey', 'core'] },
  /* v0.4 해저 터널 */
  kiosk:   { name: '매표소 서랍', n: [1, 3], w: { ticket: 4, coins: 3, book: 2, med: 2, o2: 2, key: 1 } },
  cart:    { name: '정비 카트',   n: [2, 3], w: { rail: 3, battery: 2, cable: 3, gear: 2, spring: 2, o2: 2, lens: 1 } },
  jelly:   { name: '해파리 잔해', n: [0, 1], w: { battery: 2, kelp: 2, o2: 1 } },
  bossT:   { name: '터널 장어 잔해', n: [2, 3], w: { fang: 2, pearl: 2, battery: 2, compass: 1, core: 2 }, fixed: ['vkey', 'core'] },
  ...F_LOOT,
  ...L_LOOT,
  ...M4_LOOT,
  ...G_LOOT,
};
/* 깊은 곳 사물함 · 공구함에서 금고 열쇠가 나올 확률 */
export const VKEY_CHANCE = { 2: 0.025, 3: 0.05 };

/* 고물상: 모자란 기본 재료를 조개로 (분해보다 비쌈 — 고철을 들고 나올 이유) · 코어는 안 팖 */
export const MARKET = { bolt: 9, wire: 10, cloth: 8, herb: 5, powder: 14, glass: 32 };

/* ───── 구역 3단 ───── */
export const ZONES = {
  1: { name: '입구 선착장', short: '입구', hp: 1, dmg: 1, boxes: { crate: 45, barrel: 35, locker: 20 }, nLoot: [1, 2], nEnemy: [1, 1] },
  2: { name: '깊은 창고',   short: '창고', hp: 1.3, dmg: 1.2, boxes: { crate: 30, locker: 35, toolbox: 25, barrel: 10 }, nLoot: [2, 3], nEnemy: [1, 2] },
  3: { name: '기관실 · 금고', short: '기관실', hp: 1.7, dmg: 1.45, boxes: { locker: 25, toolbox: 30, chest: 45 }, nLoot: [2, 3], nEnemy: [2, 2], elite: true },
};

/* ───── 지도 3곳 (v0.4) ─────
 *  구조는 같음(3열 × 7행 · 구역 3단 · 잠긴 문 2 · 출구 3 · 발전기 · 보스방 · 금고실) — 지도마다 바뀌는 것:
 *  zones(구역 이름 · 적 배수 · 상자 · 적 종류 가중치) · rooms(방 종류) · exits(출구 이름 · 조건) · conds(판마다 다른 날씨/상태, 가중치)
 *  unlock: 이 의뢰를 끝내면 열림 · pack: 해금 때 늦게 받는 에셋 파일 · bossKind · 사건 시간(flood · blackout)
 *  loot: 상자 가치 배수(깊은 지도일수록 값짐) — 시뮬 · docs/BALANCE.md 4장 */
export const MAPS = {
  ware: { name: '침수 창고', short: '창고', icon: '🏚️', unlock: null, pack: null, bossKind: 'boss', night: 0,
    blurb: '입구 선착장 → 깊은 창고 → 기관실 · 금고', tips: '2분부터 물이 차오르고, 중간에 정전 · 4분이면 수문지기가 깨어나요',
    zones: ZONES, exits: { early: '입구 사다리', power: '화물 승강기', sub: '비상 잠수정' },
    conds: { normal: 1 } },
  harbor: { name: '밤의 항구', short: '항구', icon: '⚓', unlock: 'q11', pack: 'harbor', bossKind: 'captain', night: 1,
    blurb: '부두 → 컨테이너 야적장 → 등대 · 크레인', tips: '밤이에요 — 헤드램프 · 등불 밑이 아니면 잘 안 보여요. 등불은 켤 수 있어요(적도 봐요). 2분부터 밀물',
    zones: {
      1: { name: '부두', short: '부두', hp: 1.15, dmg: 1.1, boxes: { crate: 30, net: 35, barrel: 20, locker: 15 }, nLoot: [1, 2], nEnemy: [1, 2], foes: { crab: 45, skel: 30, drone: 25 } },
      2: { name: '컨테이너 야적장', short: '야적장', hp: 1.45, dmg: 1.3, boxes: { cargo: 40, locker: 25, toolbox: 25, net: 10 }, nLoot: [2, 3], nEnemy: [1, 2], foes: { lamp: 35, crab: 25, drone: 20, skel: 20 } },
      3: { name: '등대 · 크레인', short: '등대', hp: 1.85, dmg: 1.65, boxes: { cargo: 25, toolbox: 25, chest: 50 }, nLoot: [2, 3], nEnemy: [2, 2], elite: true, foes: { lamp: 40, skel: 30, drone: 30 } } },
    exits: { early: '부두 사다리', power: '화물 크레인', sub: '등대 신호 보트' },
    conds: { storm: 35, fog: 30, clear: 35 }, loot: 1.25 },
  tunnel: { name: '해저 터널', short: '터널', icon: '🚇', unlock: 'q19', pack: 'tunnel', bossKind: 'eel', night: 0.5,
    blurb: '역 승강장 → 잠긴 선로 → 해저 통로 · 제어실', tips: '잠긴 곳(짙은 물)에선 산소가 줄어요 — 공기 방울 기둥에서 채워요. 물살은 몸을 밀어요. 1분 30초부터 침수 · 역 계단은 물이 닿으면 잠김',
    zones: {
      1: { name: '역 승강장', short: '승강장', hp: 1.4, dmg: 1.2, boxes: { kiosk: 40, crate: 25, locker: 35 }, nLoot: [1, 2], nEnemy: [1, 2], foes: { skel: 40, drone: 30, jelly: 30 } },
      2: { name: '잠긴 선로', short: '선로', hp: 1.75, dmg: 1.5, boxes: { cart: 45, locker: 25, kiosk: 15, toolbox: 15 }, nLoot: [2, 3], nEnemy: [1, 2], foes: { jelly: 40, miner: 30, drone: 30 } },
      3: { name: '해저 통로 · 제어실', short: '제어실', hp: 2.0, dmg: 1.75, boxes: { cart: 30, toolbox: 20, chest: 50 }, nLoot: [2, 3], nEnemy: [2, 2], elite: true, foes: { miner: 40, jelly: 35, drone: 25 } } },
    exits: { early: '역 계단', power: '정비 열차', sub: '해저 도크 잠수정' },
    conds: { dark: 35, rapids: 35, calm: 30 }, loot: 1.5,
    floodAt: 90, floodSpeed: 0.2 },
  factory: F_MAP,
  lab: L_MAP,
  gate: G_MAP, /* M5-A 6장 (b_final 이 엶) */
};
export const MAP_KEYS = Object.keys(MAPS);
/* 판마다 다른 상태 — 설명 · 숫자 (raid.js 가 읽음) */
export const CONDS = {
  normal: { name: '보통', txt: '' },
  storm:  { name: '폭풍', txt: '비바람 — 소리가 묻혀 적이 덜 들어요(0.6배) · 번개가 치면 잠깐 다 보여요', hear: 0.6, fog: [24, 44], rain: 1 },
  fog:    { name: '안개', txt: '짙은 안개 — 서로 가까이 와야 보여요(적 시야 0.7배)', sight: 0.7, fog: [16, 36], vis: 0.8 },
  clear:  { name: '맑은 밤', txt: '달이 밝아요 — 멀리 보이지만, 적도 멀리서 봐요', sight: 1.15, fog: [28, 56], vis: 1.1 },
  dark:   { name: '정전', txt: '터널 전체 정전 — 비상등뿐. 발전기를 켜면 불이 들어와요', dark: true, fog: [22, 44], vis: 0.85 },
  rapids: { name: '급류', txt: '물살이 세요(1.8배) · 물살 칸이 많아요', current: 1.8, more: 1 },
  calm:   { name: '잔잔', txt: '물살이 약해요 — 산소만 조심', current: 0.8 },
  ...F_CONDS,
  ...L_CONDS,
  ...G_CONDS,
};
/* 산소 (해저 터널) — 짙은 물(잠긴 방 · 차오른 물) 안에서 줄고, 공기 방울 기둥에서 빠르게 참 · 0 이면 체력이 줆
   기본 100 + 헬멧(체력 보너스와 같은 값) · 깊은 구역은 수압으로 더 빨리 줆 */
export const O2 = { max: 100, drain: 2.4, deep: 1.35, air: 30, dry: 9, hurt: 7, can: 60, auto: 22 };
/* 물살 세기(m/초) · 등불(항구) */
export const CURRENT = { speed: 2.1 };
export const LAMP = { r: 6.5, lightTime: 1.2, seenMul: 1.5 };

/* ───── 한 판 ───── */
export const RAID = {
  time: 420,               /* 7:00 — 물이 다 차면 끝 */
  warnAt: 60,
  searchTime: 1.5,
  extractHold: 4,
  subHold: 6,              /* 비상 잠수정은 오래 버텨야 */
  earlyClose: 180,         /* 입구 사다리: 3분 지나면 잠김 */
  floodAt: 120,            /* 침수 시작 (아래 = 입구부터 차오름) */
  floodSpeed: 0.22,        /* m/초 — 입구 구역(32m)이 약 2분 반에 잠김 */
  blackoutAt: [150, 230],  /* 정전 시작 범위 */
  blackoutLen: 30,
  bossAt: 240,             /* 기관실에 안 들어가도 이때 깨어남 */
  powerTime: 3,            /* 발전기 켜기 */
};
export const EXITS = {
  early: { name: '입구 사다리', hold: 4, cond: '3분 안에만' },
  power: { name: '화물 승강기', hold: 4, cond: '전원 필요' },
  sub:   { name: '비상 잠수정', hold: 6, cond: '언제나 · 6초' },
};
export const DAILY_SORTIES = 3;

/* ───── 주인공 · 적 ───── */
/* v0.2.1 대표 폰 피드백 '살짝 느림' → 이동 5.2 → 6.0 (+15%, 키 1.75m 기준 초당 몸 3.0 → 3.4개 · 방 한 변 16m 3.1초 → 2.7초)
   acc/dec/turn: 목표 속도로 다가가는 빠르기(1/초) — 출발은 첫 프레임에 kick(45%)부터, 멈출 땐 dec 로 약 0.12m 만 밀림
   구르기(v0.2.1 실제 앞구르기): 웅크림 0.05초 → 굴러감 0.26초 → 착지 0.05초 = rollTime 0.36 · 거리 약 2.9m(전과 같음) */
export const PLAYER = { hp: 100, speed: 6.0, acc: 30, dec: 50, turn: 55, kick: 0.45, rollSpeed: 13.6, rollTime: 0.36, rollCrouch: 0.05, rollLand: 0.05, rollCost: 34, stamMax: 100, stamRegen: 26, radius: 0.45 };
/* 추격(chase)은 v0.2.1 에 +8% (주인공 +15% 의 절반): 순서는 그대로 — 맨몸 · 마른 땅이면 따돌림(6.0 > 5.3), 물(×0.78=4.7) · 무거움(최대 ×0.65=3.9)이면 잡힘 */
export const ENEMIES = {
  drone: { name: '순찰 드론', hp: 72, speed: 3.3, chase: 5.0, sight: 10, fov: 1.25, hear: 1.0, atk: 'shoot', dmg: 8, range: 8.5, cd: 1.35, radius: 0.55, loot: 'body' },
  skel:  { name: '물먹은 해골', hp: 105, speed: 2.1, chase: 5.3, sight: 8, fov: 1.6, hear: 1.25, atk: 'melee', dmg: 13, range: 1.5, cd: 1.1, radius: 0.5, loot: 'body' },
  boss:  { name: '수문지기', hp: 950, speed: 1.5, chase: 2.9, sight: 14, fov: 2.4, hear: 1.6, atk: 'boss', dmg: 26, range: 9, cd: 2.0, radius: 1.0, loot: 'boss', boss: true },
  /* v0.4 밤의 항구 */
  crab:  { name: '집게 게', hp: 46, speed: 2.4, chase: 5.6, sight: 7, fov: 2.4, hear: 1.4, atk: 'melee', dmg: 9, range: 1.25, cd: 0.9, radius: 0.42, loot: 'crab', wind: 0.3, pack: 2 },
  lamp:  { name: '등불 해골', hp: 95, speed: 1.9, chase: 4.4, sight: 11, fov: 1.5, hear: 1.0, atk: 'throw', dmg: 11, range: 9, cd: 1.9, radius: 0.5, loot: 'body', wind: 0.55, light: 5.5 },
  captain: { name: '갈고리 선장', hp: 1150, speed: 1.6, chase: 3.0, sight: 14, fov: 2.4, hear: 1.6, atk: 'captain', dmg: 24, range: 11, cd: 1.9, radius: 1.0, loot: 'bossH', boss: true },
  /* v0.4 해저 터널 */
  jelly: { name: '전기 해파리', hp: 64, speed: 1.2, chase: 2.6, sight: 6, fov: 6.3, hear: 0.8, atk: 'pulse', dmg: 12, range: 2.4, cd: 1.7, radius: 0.55, loot: 'jelly', wind: 0.6, float: true },
  miner: { name: '광부 해골', hp: 160, speed: 1.7, chase: 4.6, sight: 8, fov: 1.4, hear: 1.3, atk: 'melee', dmg: 18, range: 1.6, cd: 1.5, radius: 0.55, loot: 'body', wind: 0.6, shield: 0.55 },
  eel:   { name: '터널 장어', hp: 1050, speed: 2.2, chase: 3.4, sight: 14, fov: 6.3, hear: 1.8, atk: 'eel', dmg: 22, range: 11, cd: 2.0, radius: 0.9, loot: 'bossT', boss: true },
  ...F_ENEMIES,
  ...L_ENEMIES,
  ...M4_ENEMIES,
  ...G_ENEMIES,
};
/* 보스 패턴 숫자 (예고 시간 · 반경 · 피해) — raid.js bossWind/enemyAttack
 *  수문지기: slam(가까이) · wave(멀리) · 체력 절반부터 1.25배
 *    약점(v0.5.2): 내려찍은 직후 2초 가슴 보관함 문이 열림 → 피해 ×2 (선장 랜턴 · 장어 기절과 같은 규칙: 약점 시간의 0.8 동안 멈칫)
 *  갈고리 선장: hook(줄 경고 → 갈고리, 맞으면 끌려감) · slam(원 경고 → 내려찍기 + 불붙은 기름 4초) · douse(포효 → 5초 등불 끄기 + 게 2 부름)
 *    약점: 내려찍은 뒤 1.4초 랜턴이 드러남 → 피해 ×2
 *  터널 장어: charge(줄 경고 → 돌진, 벽에 박히면 2초 기절 = 약점 ×2) · shock(둘레 원 경고 → 방전, 물속이면 ×1.4) · surge(물살 + 거품탄 8발, 체력 60% 아래) */
export const BOSS = {
  boss: { weak: 2.0, weakMul: 2 },
  captain: { hook: { wind: 0.8, len: 11, dmg: 16, pull: 4.2 }, slam: { wind: 0.85, r: 3.0, dmg: 24, fire: 4, fireDps: 9 }, douse: { wind: 1.0, dark: 5, adds: 2, below: 0.6 }, weak: 1.4, weakMul: 2 },
  eel: { charge: { wind: 0.9, len: 13, speed: 17, dmg: 22, stun: 2.0 }, shock: { wind: 0.9, r: 4.2, dmg: 18, wet: 1.4 }, surge: { wind: 0.8, n: 8, dmg: 10, push: 7, below: 0.6 }, weakMul: 2 },
  ...F_BOSS,
  ...L_BOSS,
  ...M4_BOSS,
  ...G_BOSS,
};
/* 지도마다 기존 적 변형 (이름 · 숫자 배수 · 색) */
export const VARIANTS = {
  ware: M4_VARIANTS.ware,
  harbor: { drone: { name: '탐조 드론', sight: 1.3, spot: true, color: 0x5d6f80 }, skel: { name: '젖은 선원 해골', hp: 1.1, tint: [0.62, 0.72, 0.8] }, ...M4_VARIANTS.harbor },
  tunnel: { drone: { name: '수중 드론', hp: 1.15, color: 0x4f7a78 }, skel: { name: '물때 해골', hp: 1.05, speed: 0.9, tint: [0.62, 0.8, 0.66] }, ...M4_VARIANTS.tunnel },
  factory: { ...F_VARIANTS, ...M4_VARIANTS.factory },
  lab: L_VARIANTS,
  gate: G_VARIANTS,
};

/* 무게: 편한 무게를 넘으면 느려짐 (편한 무게 2배에서 최대 −35%) · 구르기 기력 +50% */
export const WEIGHT = { slowMax: 0.35, rollExtra: 0.5 };

/* 소모품 제작 (시설 · 단계 필요) */
export const CRAFTS = {
  med:     { fac: 'clinic', lv: 1, cost: { herb: 3 } },
  bandage: { fac: 'clinic', lv: 2, cost: { herb: 4, cloth: 2 } },
  smoke:   { fac: 'lab', lv: 1, cost: { powder: 2, cloth: 1 } },
  nade:    { fac: 'lab', lv: 2, cost: { powder: 3, bolt: 2 } },
};
/* 주방 요리: 다음 출격 한 번 · 하나만 */
export const MEALS = {
  soup:  { name: '생선 수프',   lv: 1, cost: { herb: 2, shells: 10 }, txt: '기력 회복 +35%', stam: 1.35 },
  rice:  { name: '해초 주먹밥', lv: 2, cost: { herb: 3, shells: 15 }, txt: '이동 +7% · 기력 회복 +20%', speed: 1.07, stam: 1.2 },
  grill: { name: '조개 구이',   lv: 3, cost: { herb: 4, shells: 25 }, txt: '뒤지기 1.4배 · 체력 +15', search: 1.4, hp: 15 },
  stew:  { name: '해물 전골',   lv: 4, cost: { herb: 5, fish: 1, shells: 40 }, txt: '체력 +20 · 기력 회복 +30% · 뒤지기 1.2배', hp: 20, stam: 1.3, search: 1.2 }, /* M5-C 주방 4단계 */
};

/* ───── M3-A 성장 뼈대 (새 파일 · 여기선 다시 내보내기만) — 무기 10 · 개조 5칸 · 탄약 3 · 장비 5단 · 부적 · 난이도 · 시설 12 · 상인 3 · 업적 20 ───── */
export * from './data/weapons.js?v=0.99.17';
export * from './data/gear.js?v=0.99.17';
export * from './data/facilities.js?v=0.99.17';
export * from './data/merchants.js?v=0.99.17';
export * from './data/achievements.js?v=0.99.17';
export * from './data/pets.js?v=0.99.17'; /* M5-C 몽이 5단 · 두 번째 반려 반디 */

/* ───── 의뢰 — data/quests.js 로 옮김 (M3-C · 본 사슬 28 + 판 의뢰) ───── */
export { QUESTS } from './data/quests.js?v=0.99.17';

/* ───── 오늘의 인양 목록 (한국 날짜마다 3개) — 창고에서 납품하면 값의 1.6배 + 재료 ───── */
export const DAILY_POOL = [
  { item: 'can', n: 3, mat: { bolt: 3 } }, { item: 'gear', n: 2, mat: { wire: 2 } }, { item: 'cable', n: 2, mat: { bolt: 3 } },
  { item: 'coins', n: 2, mat: { cloth: 3 } }, { item: 'gem', n: 1, mat: { glass: 2 } }, { item: 'kelp', n: 4, mat: { cloth: 2 } },
  { item: 'book', n: 1, mat: { herb: 3 } }, { item: 'chip', n: 3, mat: { wire: 3 } }, { item: 'tarp', n: 2, mat: { bolt: 2 } },
  { item: 'rum', n: 2, mat: { herb: 3 } }, { item: 'spring', n: 2, mat: { glass: 2 } }, { item: 'boot', n: 2, mat: { bolt: 2 } },
  { item: 'lens', n: 1, mat: { powder: 2 } }, { item: 'soda', n: 3, mat: { herb: 2 } }, { item: 'pkeg', n: 1, mat: { bolt: 4 } },
];
export const DAILY_MUL = 1.6;
/* 지도별 오늘의 목록 — 지도가 열려 있으면 그날 목록 2번째(항구) · 3번째(터널) 칸을 그 지도 물건으로 (날짜 해시 · 다 같은 날 같은 목록) */
export const DAILY_MAP = {
  harbor: [{ item: 'rope', n: 2, mat: { cloth: 3 } }, { item: 'fish', n: 3, mat: { herb: 3 } }, { item: 'spyglass', n: 1, mat: { glass: 2 } }, { item: 'kelp', n: 5, mat: { cloth: 3 } }],
  tunnel: [{ item: 'rail', n: 2, mat: { wire: 3 } }, { item: 'ticket', n: 2, mat: { bolt: 4 } }, { item: 'battery', n: 1, mat: { powder: 3 } }, { item: 'o2', n: 2, mat: { herb: 3 } }],
  factory: F_DAILY,
  lab: L_DAILY,
};
