// M4-A 위협 다양화 — 새 적 5 · 떠돌이 보스 '검은 닻 두목' · 적 AI 2단계 숫자 · 위협 곡선 · 주간 변주
//  data.js 가 ENEMIES · BOSS · ITEMS · LOOT_TABLE 에 펼침 (숫자 조정은 여기서만) · 동작은 foes.js(새 적) · chief.js(두목) · ai.js(2단계) · threat.js(곡선)
//  역할이 겹치지 않게: 자폭(굴림 기뢰) · 방패(문짝 소라게) · 은신(먹물 문어) · 저격(등대 저격수) · 소환/지휘(닻 신호수) — 기존 9(근접 · 사격 · 던지기 · 방전 · 방패 근접 · 엄폐 사격 · 돌아 들기 · 불병)와 다름
//  이야기 세계: 기뢰 = 창고에 쌓여 있던 옛 항만 기뢰(파수가 굴림 바퀴를 달아 경비로 씀) · 소라게 = 부서진 수문 문짝을 등에 진 변종 · 문어 = 터널 짙은 물 · 저격수 = 등대 렌즈를 조준경으로 쓰는 빛이끼 해골 · 신호수 = 검은 닻의 붉은 신호탄

/* 큰 공격 = 이 피해 이상 (난이도 · 구역 배수 곱한 뒤, 방어 전) → 꼭 예고(바닥 원 · 줄 · 떨어질 자리)가 TELE_MIN 초 넘게 보였어야 함. raid.hurt 가 자동 검사(R.unwarned) */
export const BIG_HIT = 15;
export const TELE_MIN = 0.3;

/* ───── 새 적 5 ───── (fac: 진영 · role: ai.js 역할) */
export const M4_ENEMIES = {
  /* 굴림 기뢰 (기계 · 자폭): 굴러와 1.9m 안이면 멈칫 → 바닥 붉은 원 1초 → 터짐(둘레 모두 — 다른 적도). 무장 전에 쏘면 '퐁' 하고 꺼짐(주인공 피해 0) */
  mine:   { name: '굴림 기뢰', hp: 38, speed: 2.0, chase: 5.5, sight: 9, fov: 6.3, hear: 1.4, atk: 'boom', dmg: 30, range: 1.9, cd: 99, radius: 0.42, loot: 'mine', wind: 1.0, fac: 'machine', role: 'kamikaze', machine: true, boomR: 2.4 },
  /* 문짝 소라게 (변종 · 방패): 등에 진 수문 문짝이 앞을 85% 막음 · 천천히 돔(옆 · 뒤가 약점) · 근처 사격 적 앞에 서서 움직이는 엄폐물이 됨 */
  hermit: { name: '문짝 소라게', hp: 165, speed: 1.5, chase: 3.4, sight: 7, fov: 2.2, hear: 1.2, atk: 'melee', dmg: 17, range: 1.6, cd: 1.7, radius: 0.7, loot: 'crab', wind: 0.62, shield: 0.85, fac: 'beast', role: 'shield', turn: 2.2 },
  /* 먹물 문어 (변종 · 은신): 거의 안 보임 — 3m 안 · 빛 속(등불 · 조명탄 · 불) · 맞은 뒤 2.5초 · 공격 예고 때만 드러남(자동 조준도 그때만) · 반쯤 다치면 먹물(연막) 뿌리고 물러남 */
  octo:   { name: '먹물 문어', hp: 82, speed: 2.2, chase: 5.0, sight: 6, fov: 6.3, hear: 1.6, atk: 'grab', dmg: 18, range: 2.3, cd: 2.6, radius: 0.5, loot: 'octo', wind: 0.7, fac: 'beast', role: 'stealth', cloak: true },
  /* 등대 저격수 (빛이끼 · 저격): 멀리(10~16m)에서 엄폐 · 붉은 겨냥 줄 1.3초(앞 0.8초는 나를 따라오고 마지막 0.5초는 멈춤 = 그때 옆으로) → 빠른 한 발 · 쏘고 나면 자리 옮김. 어둠 속에선 줄이 자리를 알려 줌 */
  sniper: { name: '등대 저격수', hp: 74, speed: 1.8, chase: 3.4, sight: 18, fov: 1.1, hear: 0.9, atk: 'snipe', dmg: 26, range: 17, cd: 3.8, radius: 0.45, loot: 'body', wind: 1.3, lock: 0.5, fac: 'moss', role: 'sniper', keep: [10, 16], shotSp: 46 },
  /* 닻 신호수 (검은 닻 · 소환 · 지휘): 멀리 물러서서 붉은 신호탄(1.2초 팔 듦) → 2.5초 뒤 가까운 문으로 닻 소총수 2 (한 명 2번 · 판 전체 4명까지) · 살아 있으면 무리가 더 빨리 내밀고 시야를 나눔 · 구조 요청을 받아 다시 쏨 */
  signal: { name: '닻 신호수', hp: 84, speed: 2.6, chase: 4.2, sight: 12, fov: 2.0, hear: 1.5, atk: 'call', dmg: 0, range: 14, cd: 16, radius: 0.45, loot: 'anchor', wind: 1.2, fac: 'anchor', role: 'signal', keep: [9, 14], calls: 2, adds: 2, arrive: 2.5 },
  /* 떠돌이 보스 — 검은 닻 두목 (바다코끼리 · 등에 훔친 장어 코어 · 거대한 검은 닻): 지도와 상관없이 밤 판에 가끔 · 방 사이를 떠돎 · 호위 소총수 2 */
  chief:  { name: '검은 닻 두목', hp: 1350, speed: 1.7, chase: 3.4, sight: 15, fov: 2.4, hear: 1.8, atk: 'chief', dmg: 26, range: 12, cd: 2.1, radius: 1.05, loot: 'bossC', boss: true, fac: 'anchor', wander: true },
};
/* 두목 패턴 (세 보스와 같은 규칙: 큰 공격 뒤 약점 ×2)
 *  throw: 닻 내던지기 — 줄 경고 0.95초 → 닻이 줄 따라 날아감(줄 위 피해) → 사슬로 감아 들임
 *  slam:  닻 내려찍기 — 가까우면 원 경고 0.9초 → 충격 · 닻이 바닥에 박혀 2.2초 = 등의 장어 코어가 드러남(약점 ×2)
 *  volley: 수류탄 셋 — 떨어질 자리 원 셋(1.1초)
 *  whistle: 체력 60% 아래 · 호루라기 → 소총수 2 (피해 없음 · 18초마다) */
export const M4_BOSS = {
  chief: { throw: { wind: 0.95, len: 12, w: 1.6, dmg: 22, speed: 24 }, slam: { wind: 0.9, r: 3.6, dmg: 28, stuck: 2.2 }, volley: { wind: 0.7, n: 3, r: 2.0, dmg: 18, flight: 1.1, spread: 3.2 }, whistle: { below: 0.6, adds: 2, cd: 18 }, weak: 2.2, weakMul: 2 },
};
/* 투척 (AI 3단계 소총수 · 두목): 팔 듦 0.45초 → 날아가는 1초 동안 떨어질 자리 원 → 땅에서 0.45초 깜빡 → 터짐 (불은 없음) */
export const NADE = { wind: 0.45, flight: 1.0, fuse: 0.45, r: 2.2, dmg: 22, cd: 12, squadCd: 6 };

/* 지도마다 새 적 변형 (이름 · 숫자 배수 · 색) — 같은 종이 다른 지도에선 다른 얼굴 */
export const M4_VARIANTS = {
  ware:    { mine: { name: '굴림 기뢰' }, hermit: { name: '문짝 소라게' } },
  harbor:  { hermit: { name: '부두 소라게', hp: 1.05, tint: [0.75, 0.82, 0.9] }, sniper: { name: '등대 저격수' }, mine: { name: '떠도는 기뢰', speed: 0.9 } },
  tunnel:  { octo: { name: '먹물 문어' }, mine: { name: '선로 기뢰', hp: 1.1, tint: [0.6, 0.85, 0.8] }, sniper: { name: '역무원 저격수', tint: [0.7, 0.85, 0.72] } },
  factory: { signal: { name: '닻 신호수' }, sniper: { name: '그을린 저격수', hp: 1.1, tint: [0.78, 0.66, 0.58] }, mine: { name: '용광로 기뢰', tint: [0.95, 0.7, 0.55] } },
};
/* 지도 · 구역마다 새 적이 섞이는 가중치 (threat.populate 가 기존 적 자리를 바꿈 — plan.js 지도 생성은 그대로) */
export const M4_POOL = {
  ware:    { 1: { mine: 3, hermit: 1 }, 2: { mine: 2, hermit: 2 }, 3: { mine: 2, hermit: 2 } },
  harbor:  { 1: { hermit: 3, mine: 1 }, 2: { sniper: 3, hermit: 2 }, 3: { sniper: 3, hermit: 1, mine: 1 } },
  tunnel:  { 1: { octo: 2, mine: 2 }, 2: { octo: 3, sniper: 1 }, 3: { octo: 3, mine: 1, sniper: 1 } },
  factory: { 1: { mine: 2, sniper: 1 }, 2: { sniper: 2, mine: 2 }, 3: { sniper: 2, mine: 1 } },
};
/* 판 상태에 따라 잘 나오는 것: 밤 · 정전 = 저격수(줄이 보임) · 문어(어둠) / 폭풍 · 안개 = 기뢰 · 소라게(소리가 묻힘) — 로드맵 '밤 · 폭풍 전용 각 1' */
export const M4_COND_BIAS = { night: { sniper: 2, octo: 1.8 }, storm: { mine: 2, hermit: 1.6 } };

/* ───── 잔해 · 이야기 조각 ───── */
export const M4_ITEMS = {
  /* 두목을 쓰러뜨리면: 이야기 조각 (5장 '대수문 꼭대기 검은 닻의 불빛' 복선) */
  chiefmap: { name: '두목의 물길 지도', cat: 'memo', w: 1, h: 1, wt: 0.2, val: 1, model: 'book', color: '#1c1a1b', desc: '대수문 꼭대기에 붉은 동그라미. "코어 꽂을 자리".' },
};
export const M4_MEMO = {
  chiefmap: ['검은 닻 두목의 물길 지도. 대수문 꼭대기에 붉은 동그라미.', '귀퉁이에 낯익은 글씨 — "여울이 길 안내". 바람이 찾던 이름.'],
};
export const M4_LOOT = {
  mine:  { name: '기뢰 껍데기', n: [0, 1], w: { pkeg: 3, spring: 2, chip: 1, gear: 1 } },
  octo:  { name: '문어 먹물 자국', n: [0, 1], w: { kelp: 2, fish: 2, pearl: 1 } },
  bossC: { name: '검은 닻 두목 짐', n: [2, 3], w: { anchorpin: 3, coins: 3, compass: 2, pearl: 2, core: 1, nade: 1 }, fixed: ['chiefmap', 'core'] },
};

/* ───── 적 AI 2단계 숫자 (ai.js) ───── */
export const AI2 = {
  peekMax: 2,          /* 소총수 · 저격수: 같은 엄폐에서 이만큼 내밀면 다른 엄폐로 옮김(엄폐 사이 이동) */
  suppress: 0.7,       /* 주인공이 막 쏜(이 초 안) 쪽 엄폐면 숨는 시간 +0.6초 (눌려 있음) */
  reloadPeek: true,    /* 주인공이 장전 중이면 바로 내밂 */
  pincer: 2.6,         /* 근접 둘 이상이 같은 목표: 양쪽으로 이만큼 벌려 끼고 듦 (3m 안이면 곧장) */
  help: 0.35,          /* 체력 35% 아래 → 구조 요청(소리 16m · 같은 진영이 몰려옴) */
  helpR: 16,
  retreat: 2.4,        /* 물러나기(초) — 검은 닻 · 문어 · 게 */
  hearFight: 1,        /* 2단계부터: 다른 적의 총소리 · 폭발도 들음(싸움터로 모여듦 = 셋이 엉킴) */
  wall: 0.6,           /* 벽 너머 소리는 0.6배 거리 */
  lightPull: 12,       /* 빛이끼(해골 · 저격수): 쉬는 동안 이 거리 안 빛(등불 · 조명탄 · 불)으로 걸어감 — 2장 '빛을 따라온 것뿐' */
  litSeen: 1.5,        /* 어두운 판(밤 · 정전)에서 빛 속의 나는 1.5배 멀리서 보임 · 어둠 속이면 0.75배 */
  darkHear: 1.3,       /* 어두우면 귀를 씀 */
  fogHear: 1.15,
  step: [0.45, 1],     /* 발소리 반경 배수: 살살(스틱 조금) ~ 뛰기 */
};

/* ───── 위협 곡선 (threat.js) ─────
 *  Lv = 1 + (논 날 ÷ 45) × days + (시설 단계 비율) × fac + 난이도(편하게 −2 · 깊게 +2), 1~10
 *  Lv 마다: AI 단계 · 방마다 적 +1 확률(구역별) · 체력 · 피해 배수 · 새 적 섞임 · 다른 지도 검은 닻 순찰(4장~) · 두목
 *  '몰래' 올리지 않음 — 출격 준비 · 판 시작에 '오늘 위협 Lv N' 과 무엇이 늘었는지 보여 줌 */
export const THREAT_K = {
  days: 5.4, fac: 3.2, dayCap: 45, diff: { easy: -2, normal: 0, deep: 2 },
  ai: [1, 1, 2, 2, 2, 3, 3, 3, 3, 3],                     /* Lv 1~10 → AI 단계 */
  extra: { 1: [3, 0.05, 0.25], 2: [2, 0.08, 0.6], 3: [2, 0.1, 0.7] },  /* 구역: [시작 Lv, Lv 당, 상한] → 방마다 적 +1 확률 */
  hp: 0.025, dmg: 0.035,                                  /* Lv 당 체력 · 피해 (+) */
  mix: [0.12, 0.03, 0.42],                                /* 새 적 섞임: 기본 · Lv 당 · 상한 */
  patrol: [4, 0.28, 0.06, 0.6],                           /* 다른 지도 검은 닻 순찰(4장~): 시작 Lv · 기본 · Lv 당 · 상한 */
  signalLv: 5,                                            /* 순찰 · 공장 무리에 신호수가 붙는 Lv */
  chief: { night: [0.16, 0.012], day: 0, minLv: 3 },      /* 두목: 밤 판 확률(기본 · Lv 당) · 낮 판(보스 주간에만) */
  chiefAt: [70, 150],                                     /* 나타나는 때(초) */
};
/* 주간 변주 — 월요일마다 바뀜 (밤 → 폭풍 → 보스 차례) · 논 날 7일부터 (첫 주는 배우는 주)
 *  wx: 판 예보(data/weather.js forecast) 가중치 배수 — 그 지도에 있는 판 상태만 (M4 마무리: 예보가 지도 상태를 정하므로 출격 준비 카드에 그대로 보임) */
export const WEEK_FROM = 7;
export const WEEK_CYCLE = ['night', 'storm', 'boss'];
export const WEEKS = {
  night: { name: '밤 주간', icon: '🌙', txt: '밤 · 정전 판이 잦아요 — 검은 닻 두목이 밤 물길을 자주 떠돌아요', cond: 'night', wx: { night: 3 }, chief: 1.1 },
  storm: { name: '폭풍 주간', icon: '⛈️', txt: '폭풍 · 안개 · 증기 판이 잦아요 — 소리가 묻히고 기뢰 · 소라게가 많아요 · 두목이 궂은 날에도 나와요', cond: 'storm', wx: { storm: 2.5, fog: 2.5 }, mix: 1.5, extra3: 0.1, chiefDay: 0.07 },
  boss:  { name: '보스 주간', icon: '👑', txt: '보스가 1분 일찍 깨어나요 · 깊은 곳 호위가 늘어요 · 두목은 낮에도 나와요 · 보스 잔해 +1', bossEarly: 60, extra3: 0.26, extra2: 0.1, chief: 1.5, chiefDay: 0.12, bossLoot: 1 },
};
