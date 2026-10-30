// 숲속 힐링 캠프 (가제) — 데이터 · 곡선 (2026-10-29 · 개발 · 클린룸)
// 근거: team/dev/tasks/261028-catsoup-spec/spec.md + evidence/*.csv (분석팀 명세서 — 곡선 '모양 · 범위'만 따름, 수치는 우리 것)
// 브라우저 없이도 읽힘 (sim.js · tools/bot.mjs 가 같이 씀)

export const GAME = { id: 'camp', save: 'camp_v1', version: '0.2.0' };

/* ── 판 좌표: 배경 그림(864×1536) → 판(720×1560) ── */
export const BG_S = 1560 / 1536, BG_X = (864 * BG_S - 720) / 2;   /* 배경은 판 높이에 꽉 차게 · 좌우를 조금 잘라 냄 */
export const P = (x, y) => [Math.round(x * BG_S - BG_X), Math.round(y * BG_S)];

/* ── 구역 (실제 캠핑장 구성을 따른 해금 순서) ──
   명세서 4-4 마당 확장: 9단계 · 조건 = 누적으로 지은 시설 수(7 → ~200, 간격이 점점 커짐) · 보상 유료 재화 100 → 450(+50)
   우리: 5구역 · 조건 = 레벨 + 누적 지은/강화 단계 수(간격이 커짐) · 보상 솔방울 100 → 300(+50) · 공사 시간 있음(즉시 완성 자리) */
export const ZONES = [
  { id: 'lawn', name: '잔디 광장 · 웰컴센터', need: { lv: 1, built: 0 }, reward: 0, build: 0 },
  { id: 'forest', name: '숲속 존', need: { lv: 3, built: 3 }, reward: 100, build: 120 },
  { id: 'pine', name: '애견 동반 존 · 조용한 솔숲', need: { lv: 6, built: 6 }, reward: 150, build: 300 },
  { id: 'valley', name: '계곡 · 놀이터와 폭포', need: { lv: 10, built: 10 }, reward: 200, build: 900 },
  { id: "stay", name: "스테이 · 루프탑", need: { lv: 15, built: 12 }, reward: 300, build: 1800 },
];
/* 잠긴 구역을 가리는 안개 영역 (판 좌표 · 위쪽 y 부터) */
const FOG = (a, b, c, d) => [...P(a, b), ...P(c, d)];
export const ZONE_FOG = { forest: FOG(40, 380, 455, 705), pine: FOG(505, 450, 864, 775), valley: FOG(430, 40, 864, 440), stay: FOG(0, 40, 430, 330) };

/* ── 고정 건물 ── */
export const WELCOME = { pos: P(340, 820), door: P(300, 905), deck: P(372, 914) };   /* 데크 벤치는 고양이 자리(왼쪽 끝)와 떨어뜨림 */   /* 웰컴센터: 체크인 · 매점 · 꾸미기 */
export const KITCHEN = { pos: P(640, 860), oven: P(700, 880), stand: P(676, 934), pick: P(560, 952) };   /* 공용 키친 (빵 오븐) */
export const ENTRY = [P(445, 1180), P(445, 1640)];   /* 오솔길 입구 → 화면 아래 */
export const CAT_SPOT = P(195, 905);
/* ── 원근 · 크기 (대표 피드백: 건물과 캐릭터 비율) ──
   기준: 웰컴센터 유리문 높이 ≈ 배경 73px(바닥 y 880) → 판 74px · 어른 키 = 문 높이 × 0.8 ≈ 60px
   화면 위(먼 곳)는 작게, 아래(가까운 곳)는 크게: y 에 따라 선형 (사람 · 고양이 · 강아지 · 시설 · 장식 · 앉는 자리 모두 같은 규칙) */
export const DOOR_Y = Math.round(880 * BG_S), ADULT_H = 60;
export const PERSP = y => Math.max(0.7, Math.min(1.3, 1 + (y - DOOR_Y) * 0.00048));
export const FAC_K = 0.5, DECO_K = 0.42;
/* 시설 단계 외형 (대표 10-30: 강화하면 룩이 바뀌어야) — Lv1 · Lv5 · Lv10 · Lv20 4단계, 같은 실루엣이 자라는 그림 (art/fac/st/<종류>_0~3)
   폭(판 px · × PERSP) = 처음 폭 × 자람 배율 — 자람은 1.26배까지만 (자라도 길을 막지 않게 · 바닥 차지는 그대로, 위로 · 뒤로 자람)
   단계 사이 짝수 레벨마다 작은 소품 하나 (화분 · 등불 · 상자 …) · 높은 단계일수록 휘게포레스트 톤 (세련된 마감 · 조명) */
export const STAGE = {
  at: [1, 5, 10, 20], label: ['Lv1', 'Lv5', 'Lv10', 'Lv20'], grow: [0.92, 1, 1.12, 1.26],
  k: { pot: 70, drink: 66, table: 79, bbq: 80, tent: 92, firepit: 75, hammock: 72, footwash: 82, playpool: 88, oven: 104 },
  ovenW: [118, 122, 128, 136],   /* 오븐은 배경 속 화덕을 다 덮어야 해서 처음부터 크게 · 덜 자람 */
  w: (kind, s) => kind === 'oven' ? STAGE.ovenW[s] : STAGE.k[kind] * STAGE.grow[s],
  props: ['p_tulip', 'p_lamp', 'p_crate', 'p_mush', 'p_shrub', 'p_flower', 'p_logs', 'p_fern'],
  propM: { p_tulip: 0.42, p_lamp: 0.3, p_crate: 0.62, p_mush: 0.42, p_shrub: 0.8, p_flower: 0.7, p_logs: 0.78, p_fern: 0.55 },   /* 소품 실제 폭(m) */
};
export const stageOf = lv => lv >= 20 ? 3 : lv >= 10 ? 2 : lv >= 5 ? 1 : 0;
/* 짝수 레벨 소품: 이 단계 안에서 늘어난 짝수 레벨 수 (단계가 바뀌면 새 그림이 소품을 품으니 다시 0부터 · 최대 3개) */
export const propsOf = lv => Math.min(3, Math.floor(lv / 2) - Math.floor(STAGE.at[stageOf(lv)] / 2));

/* ── 걷는 곳 (배경 '봄' 기준 · 배경 그림 좌표 → 판) · 가을 배경을 새로 그리면 같은 꼴로 WALKMAP.autumn 을 만든다 ──
   walk: 길 · 잔디 · 마당 · 데크 다각형 + 길 띠(line · r) · zone 이 열려야 걸을 수 있음
   block: 건물 · 조리대 · 식탁 · 호수 (지은 시설은 sim 이 따로 붙임) */
const PP = pts => pts.map(([x, y]) => P(x, y)), LN = (pts, r, zone) => ({ zone, line: PP(pts), r: Math.round(r * BG_S) });
export const WALKMAP = { spring: {
  walk: [
    { zone: 'lawn', poly: PP([[0, 1050], [380, 1040], [400, 1030], [470, 1030], [520, 1045], [864, 1060], [864, 1400], [660, 1450], [240, 1450], [0, 1400]]) },   /* 잔디 광장 */
    { zone: 'lawn', poly: PP([[385, 1380], [505, 1380], [505, 1652], [385, 1652]]) },                                                    /* 아래 입구 길 */
    { zone: 'lawn', poly: PP([[60, 925], [470, 925], [560, 945], [560, 1000], [470, 965], [60, 965]]) },                                  /* 웰컴센터 앞 흙마당 */
    { zone: 'lawn', poly: PP([[350, 955], [475, 955], [475, 1050], [350, 1050]]) },                                                       /* 가운데 계단 */
    { zone: 'lawn', poly: PP([[40, 760], [155, 750], [155, 965], [140, 1060], [0, 1060], [0, 800]]) },                                    /* 왼쪽 흙길 */
    { zone: 'lawn', poly: PP([[150, 868], [462, 868], [482, 935], [150, 935]]) },                                                         /* 웰컴센터 데크 */
    { zone: 'lawn', poly: PP([[478, 935], [500, 893], [782, 893], [792, 968], [560, 1005], [478, 1005]]) },                               /* 공용 키친 바닥 */
    { zone: 'lawn', poly: PP([[560, 955], [795, 950], [805, 1000], [560, 1012]]) },                                                       /* 키친 앞 */
    LN([[120, 748], [250, 706], [330, 680], [420, 650], [470, 610], [550, 560]], 26, 'forest'),                                          /* 숲으로 가는 왼쪽 오솔길 */
    { zone: 'forest', poly: PP([[80, 480], [410, 470], [440, 600], [400, 690], [130, 738], [70, 620]]) },                                 /* 숲속 존 빈터 */
    { zone: 'pine', poly: PP([[540, 520], [864, 510], [864, 780], [560, 780], [540, 640]]) },                                            /* 솔숲 · 애견 존 */
    LN([[400, 645], [430, 590], [470, 530], [520, 470], [590, 428]], 24, 'valley'),                                                      /* 계곡으로 가는 길 */
    LN([[335, 328], [450, 380], [520, 420], [600, 432], [645, 418]], 24, 'valley'),                                                      /* 호숫가 길 */
    { zone: 'stay', poly: PP([[100, 228], [410, 232], [410, 300], [342, 300], [342, 340], [290, 340], [290, 300], [100, 292]]) },        /* 스테이 데크 · 계단 */
  ],
  block: [
    { poly: PP([[150, 762], [200, 722], [500, 718], [505, 796], [474, 802], [470, 868], [150, 868]]) },   /* 웰컴센터 건물 */
    { poly: PP([[495, 772], [800, 778], [796, 893], [495, 893]]) },                                        /* 키친 조리대 · 화덕 */
    { poly: PP([[535, 880], [652, 880], [652, 930], [535, 930]]) },                                        /* 키친 식탁 */
    { poly: PP([[0, 90], [292, 95], [292, 228], [0, 228]]) },                                              /* 스테이 건물 */
    { poly: PP([[530, 210], [864, 190], [864, 420], [700, 420], [650, 404], [560, 350]]) },                /* 호수 */
  ],
} };
/* ── 길 그래프 (대표 지시: "캐릭터가 길을 따라 다니게") · 배경에 그려진 오솔길 · 돌길 · 데크 위 점을 이음 · 잔디를 가로지르는 지름길 X
   노드: [x, y, zone] (배경 그림 좌표) · 시설 · 식탁 앞 '서는 자리'는 가장 가까운 길에서 짧은 가지로 이어짐(walk.js) · 봄 · 가을 배경마다 따로 */
const GN = (o) => Object.fromEntries(Object.entries(o).map(([k, [x, y, z]]) => [k, [...P(x, y), z]]));
export const WALKGRAPH = { spring: {
  nodes: GN({
    E0: [445, 1645, 'lawn'], E1: [445, 1455, 'lawn'], LF: [445, 1392, 'lawn'], LSW: [320, 1405, 'lawn'], LSE: [570, 1405, 'lawn'], LW: [245, 1222, 'lawn'], LE: [650, 1222, 'lawn'],
    LC: [445, 1196, 'lawn'], LT: [445, 1268, 'lawn'], TOP: [440, 1105, 'lawn'], LV: [322, 1112, 'lawn'], LWp: [195, 1248, 'lawn'], LEp: [698, 1252, 'lawn'], ST: [425, 1040, 'lawn'], PC: [420, 962, 'lawn'],
    PW: [205, 952, 'lawn'], PLW: [95, 945, 'lawn'], PLN: [92, 800, 'lawn'], D0: [352, 926, 'lawn'], DK: [292, 908, 'lawn'], PE: [505, 945, 'lawn'], KF: [604, 970, 'lawn'], KS: [676, 942, 'lawn'], KE: [745, 970, 'lawn'],
    T1: [114, 754, 'forest'], T2: [252, 694, 'forest'], T3: [330, 680, 'forest'], T4: [418, 650, 'forest'], FC: [300, 622, 'forest'], F1n: [200, 584, 'forest'], F2n: [318, 552, 'forest'], F2w: [262, 505, 'forest'], F2b: [325, 476, 'forest'],
    T5: [470, 610, 'pine'], T6: [540, 570, 'pine'], PN1: [612, 590, 'pine'], PN1b: [700, 560, 'pine'], PG: [720, 634, 'pine'], PN2: [720, 672, 'pine'], PN3w: [622, 702, 'pine'], PN3: [655, 746, 'pine'], PS: [722, 750, 'pine'],
    V1: [430, 590, 'valley'], V2: [470, 530, 'valley'], V3: [520, 470, 'valley'], LKa: [600, 432, 'valley'], LKe: [645, 418, 'valley'], LKb: [520, 420, 'valley'], LKc: [450, 380, 'valley'], LKd: [335, 330, 'valley'],
    STa: [315, 302, 'stay'], STb: [250, 292, 'stay'], STn: [300, 252, 'stay'], STw: [150, 250, 'stay'],
  }),
  edges: [['E0', 'E1'], ['E1', 'LF'], ['E1', 'LSW'], ['E1', 'LSE'], ['LSW', 'LW'], ['LSE', 'LE'], ['LW', 'LC'], ['LE', 'LC'], ['LC', 'LT'], ['LW', 'LWp'], ['LE', 'LEp'], ['LC', 'TOP'], ['TOP', 'LV'], ['TOP', 'ST'], ['ST', 'PC'],
    ['PC', 'PW'], ['PW', 'PLW'], ['PLW', 'PLN'], ['PC', 'D0'], ['D0', 'DK'], ['PC', 'PE'], ['PE', 'KF'], ['KF', 'KS'], ['KF', 'KE'],
    ['PLN', 'T1'], ['T1', 'T2'], ['T2', 'T3'], ['T3', 'T4'], ['T3', 'FC'], ['FC', 'F1n'], ['FC', 'F2n'], ['F1n', 'F2w'], ['F2w', 'F2b'],
    ['T4', 'T5'], ['T5', 'T6'], ['T6', 'PN1'], ['PN1', 'PN1b'], ['PN1', 'PG'], ['PG', 'PN2'], ['PN2', 'PN3w'], ['PN3w', 'PN3'], ['PN3', 'PS'],
    ['T4', 'V1'], ['V1', 'V2'], ['V2', 'V3'], ['V3', 'LKa'], ['LKa', 'LKe'], ['LKa', 'LKb'], ['LKb', 'LKc'], ['LKc', 'LKd'], ['LKd', 'STa'], ['STa', 'STb'], ['STa', 'STn'], ['STn', 'STw']],
} };
/* 가을: 가을 배경은 봄 배경과 같은 배치를 계절색으로 다시 칠한 그림(tools/autumnize.py · 길 · 건물 자리가 같음)
   → 걷는 곳 · 길 그래프는 봄 꼴을 복사한 뒤 가을에만 놓이는 것(수확 축제 장식 · 볏짚 · 호박)을 막힘으로 더함 · 모든 길 토막이 막힘을 비켜 가는지 봇 · 화면 걷기 검사로 확인 */
const clone = o => JSON.parse(JSON.stringify(o));
export const HARVEST_POS = P(700, 1108);   /* 가을 수확 축제 장식 세트 자리 (잔디 오른쪽 위 · 길에서 120px 넘게 떨어짐) */
export const AUTUMN_DECO = [['a_hay', P(40, 1330), 0.9], ['a_pumpkin', P(190, 1436), 0.75], ['a_leaves', P(700, 1436), 0.8], ['a_lantern', P(812, 1080), 0.35], ['a_mum', P(84, 1076), 0.45]];   /* 가을 내내 놓이는 작은 장식 [그림, 자리, 폭 m] — 길 밖 */
WALKMAP.autumn = clone(WALKMAP.spring);
WALKMAP.autumn.block.push({ ell: [HARVEST_POS[0], HARVEST_POS[1] + 4, 52, 22] }, ...AUTUMN_DECO.map(([, [x, y], m]) => ({ ell: [x, y + 2, Math.max(8, m * 22), Math.max(5, m * 9)] })));
WALKGRAPH.autumn = clone(WALKGRAPH.spring);
/* 건물이 사람을 가리는 부분 (배경을 그 모양대로 잘라 사람 위에 그림 · base = 바닥선: 그보다 위(뒤)에 선 사람만 가림) */
/* 오븐 단계 그림 위로 다시 덮는 배경 조각 (키친 지붕 · 오븐 앞 기둥) — 단계 그림이 배경 속 화덕을 가리고, 지붕 · 기둥은 그 앞에 */
export const OVEN_ROOF = PP([[600, 770], [804, 770], [800, 800], [796, 812], [734, 857], [733, 952], [719, 952], [719, 858], [712, 851], [640, 834], [600, 826]]);
export const OVEN_AT = P(712, 922);   /* 단계 그림 바닥 가운데 (배경 화덕 자리) */
/* 편의 설비 그림 자리 (배경 좌표 → 판) · w = 폭(판 px) — 키친 조리대 위 · 끝, 웰컴센터 데크 옆 · 길(걷는 선) 밖 */
/* 크기 규칙 (원근): 문 앞 어른 키 ADULT_H = 1.65m → 1m = PX_M 판 px · 그 자리의 PERSP 를 곱함 (편의 설비 · 소품은 실제 크기(m)로 정함 · 대표 10-30 "조리대 위에서 커 보임") */
export const PX_M = ADULT_H / 1.65;
export const AMEN_AT = { sink: [P(548, 886), 1.05], fridge: [P(526, 914), 0.72], micro: [P(756, 906), 0.6], toaster: [P(642, 874), 0.42], shower: [P(472, 876), 0.95], laundry: [P(176, 886), 1.2] };   /* [자리(배경 좌표), 폭 m] — 토스터만 조리대 위, 나머지는 바닥 */
export const OCCLUDE_OF = s => OCCLUDE;   /* 가림판: 배치가 같아 다각형은 같고, 잘라 쓰는 그림이 그 계절 배경(#bg)이라 색이 따라감 */
export const OCCLUDE = [
  { id: 'welcome', poly: PP([[146, 758], [186, 712], [502, 712], [508, 800], [476, 806], [472, 870], [146, 870]]), base: P(0, 868)[1] },
  { id: 'kitchen', poly: PP([[492, 762], [802, 768], [798, 802], [788, 950], [756, 950], [758, 816], [522, 812], [520, 902], [492, 902]]), base: P(0, 893)[1] },
  { id: 'stay', poly: PP([[0, 86], [294, 92], [294, 232], [0, 232]]), base: P(0, 228)[1] },
];
/* 서는 자리 (앵커): 셰프는 화덕 옆 · 도우미는 키친 식탁 앞에서 음식을 받음 */
export const OVEN_PICK = P(612, 950);
export const VISIT_SPOT = P(300, 1105), GIFT_SPOT = P(390, 985);   /* 떠돌이 음악가가 서는 곳 (잔디 광장 위쪽 · 길 옆) */                 /* 캠핑장 고양이가 볕을 쬐는 웰컴센터 데크 */

/* ── 시설 ──
   명세서 2장 생산 축 3개: 조리(라인 3 · 15/17/19초) · 재료 손질(레시피 해금 · 판매가↑) · 휴식(60초마다 연구 포인트) + 특수(하루 횟수 · 충전)
   우리: 조리 = 빵 오븐(공용 키친) · 무쇠 솥 · 음료 바 / 손질 = 공용 키친 설비 4 (냉장고 · 개수대 · 토스터 · 전자레인지) / 휴식 = 텐트 · 불멍 화로 · 해먹 · 발 씻는 곳 · 샤워장 · 세탁실 / 자리 = 피크닉 식탁 · 바비큐 데크 / 특수 = 계곡 놀이터(2시간 충전 선물) */
export const LINES = [
  { id: 'bread', name: '빵', st: 'oven', cycle: 17 },
  { id: 'soup', name: '수프', st: 'pot', cycle: 15 },
  { id: 'drink', name: '음료', st: 'drink', cycle: 19 },
];
export const FAC = {
  oven: { name: '빵 오븐', kind: 'cook', line: 'bread', img: null, fixed: true, desc: '공용 키친의 빵 오븐 · 베이글을 구워요' },
  pot: { name: '무쇠 솥', kind: 'cook', line: 'soup', img: 'fac/pot', desc: '따끈한 수프를 끓여요' },
  drink: { name: '음료 바', kind: 'cook', line: 'drink', img: 'fac/drink', desc: '코코아와 레모네이드를 만들어요' },
  table: { name: '피크닉 식탁', kind: 'seat', seats: 4, img: 'fac/table', desc: '손님이 앉아서 먹어요 · 자리 4' },
  bbq: { name: '바비큐 데크', kind: 'seat', seats: 4, vip: 3, img: 'fac/bbq', desc: '스테이 손님 자리 · 값 3배' },
  tent: { name: '캠핑 텐트', kind: 'rest', rp: 1, img: 'fac/tent', desc: '직원이 쉬면 쉼 포인트가 모여요' },
  firepit: { name: '불멍 화로', kind: 'rest', rp: 1.3, seats: 2, img: 'fac/firepit', desc: '불멍 · 쉼 포인트 · 자리 2' },
  hammock: { name: '해먹 쉼터', kind: 'rest', rp: 1.6, img: 'fac/hammock', desc: '조용한 솔숲의 해먹 · 커플 손님이 좋아해요' },
  footwash: { name: '발 씻는 곳', kind: 'rest', rp: 2.2, img: 'fac/footwash', desc: '계곡에서 놀고 온 손님이 쉬어요' },
  playpool: { name: '계곡 놀이터', kind: 'special', charge: 7200, img: 'fac/playpool', desc: '2시간마다 물놀이 선물이 차요' },
};
/* 자리(패드)마다 지을 수 있는 시설 — 명세서 2장 '손질과 휴식을 번갈아 · 사이사이 특수' 순서를 자리 배치로 */
export const PADS = [
  { id: 'L1', zone: 'lawn', pos: P(140, 1255), fac: 'pot' },
  { id: 'L2', zone: 'lawn', pos: P(445, 1325), fac: 'table' },
  { id: 'L3', zone: 'lawn', pos: P(740, 1272), fac: 'drink' },
  { id: 'F1', zone: 'forest', pos: P(155, 543), fac: 'tent' },
  { id: 'F2', zone: 'forest', pos: P(325, 512), fac: 'table' },
  { id: 'F3', zone: 'forest', pos: P(245, 636), fac: 'firepit' },
  { id: 'D1', zone: 'pine', pos: P(720, 715), fac: 'table', dog: true },
  { id: 'N1', zone: 'pine', pos: P(740, 578), fac: 'hammock' },
  { id: 'V1', zone: 'valley', pos: P(650, 335), fac: 'playpool' },
  { id: 'V2', zone: 'valley', pos: P(530, 420), fac: 'footwash' },
  { id: 'S1', zone: 'stay', pos: P(236, 272), fac: 'bbq' },
];
/* 공용 키친 설비 = 재료 손질 (명세서: 레시피마다 대응하는 손질 시설이 있어야 열림) · 웰컴센터 설비 = 휴식 · 방치 상한 */
export const AMEN = {
  fridge: { name: '공용 냉장고', at: 'kitchen', unlock: 2, desc: '바구니 칸마다 재료 · 2단계 메뉴가 열려요' },
  sink: { name: '넓은 개수대', at: 'kitchen', unlock: 3, desc: '깨끗하게 · 3단계 메뉴가 열려요' },
  toaster: { name: '토스터', at: 'kitchen', unlock: 4, desc: '바삭하게 · 4단계 메뉴가 열려요' },
  micro: { name: '전자레인지', at: 'kitchen', unlock: 5, desc: '따끈하게 · 5 · 6단계 메뉴가 열려요' },
  shower: { name: '따뜻한 샤워장', at: 'welcome', rest: 1.5, desc: '쉼 포인트 +, 쉬는 동안 모이는 시간 +1시간' },
  laundry: { name: '세탁실', at: 'welcome', rest: 1.5, desc: '쉼 포인트 +, 쉬는 동안 모이는 시간 +1시간' },
};
/* 짓는 순서 = 비용 자릿수 증가 Δ (명세서 4-1: 처음 12개 +0~2 → Δ가 1 · 2 · 3씩 커지는 2차 가속 → 고정 폭)
   v0.1 은 시설 11 + 설비 6 = 17번째까지: 처음 6개 Δ 0~1 → 이후 Δ 1 고정 (v0.1 길이에 맞춰 2차 가속 구간은 줄임 · 계수 1~6) */
const DIG = [1, 2, 2, 3, 3, 4, 5, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const COEF = [1, 2, 6, 1, 4, 1, 1, 5, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1];
export const buildCost = k => COEF[Math.min(k, 17)] * 10 ** DIG[Math.min(k, 17)] * 5;   /* k = 지금까지 지은 시설 · 설비 수 */
/* 강화: 레벨당 비용 ×1.16 (명세서는 코드 상수라 미확정 · 질문 1 — 우리 가정) · 효과 ×1.11 · 10/20/30 마다 '단계' (공사 시간 · 그림이 바뀜) */
export const UP = { max: 40, costK: 1.16, effK: 1.11, tiers: [10, 20, 30], tierBuild: [60, 240, 900] };
export const upCost = (base, lv) => Math.ceil(base * 0.3 * UP.costK ** lv);
export const tierOf = lv => UP.tiers.filter(t => lv >= t).length;

/* ── 메뉴 (명세서 4-2: 라인 3 × 65단계 · 판매가 선형 = 시작값 + 10 × 단계 · 연구 비용 자릿수 d(n) = 1 + n(n−1)/2 삼각수)
   우리: 라인 3 × 6단계(음료 5) = 17종 · 판매가 선형 · 메뉴 강화 비용(쉼 포인트) 자릿수 = 1 + n(n−1)/2 의 1/4 (v0.1 범위) */
export const MENU = [
  ['bread', 1, '크림치즈 베이글', 'bagel'], ['bread', 2, '블루베리 베이글', 'blueberry'], ['bread', 3, '숲속 샌드위치', 'sandwich'], ['bread', 4, '시나몬 롤', 'cinnamon'], ['bread', 5, '딸기잼 스콘', 'scone'], ['bread', 6, '시골빵 한 덩이', 'loaf'],
  ['soup', 1, '채소 크림 스튜', 'stew'], ['soup', 2, '버섯 수프', 'mushroom'], ['soup', 3, '옥수수 수프', 'corn'], ['soup', 4, '단호박 수프', 'pumpkin'], ['soup', 5, '토마토 콩 스튜', 'bean'], ['soup', 6, '숲속 나물 전골', 'hotpot'],
  ['drink', 1, '마시멜로 코코아', 'cocoa'], ['drink', 2, '레모네이드', 'lemonade'], ['drink', 3, '딸기 우유', 'strawmilk'], ['drink', 4, '허브차', 'herbtea'], ['drink', 5, '아이스 커피', 'icedcoffee'],
  ['soup', 3, '호박씨 포타주', 'kabocha', 'autumn'], ['bread', 3, '군밤 베이글', 'chestnut_bagel', 'autumn'], ['drink', 3, '시나몬 사과 사이다', 'cider', 'autumn'],   /* 가을 시즌 한정 (시즌이 끝나면 숨김 · 맛 레벨은 남아 내년에 이어짐) */
].map(([line, step, name, img, season]) => ({ id: img, line, step, name, img: 'food/' + img, start: { bread: 10, soup: 14, drink: 8 }[line], ...(season ? { season } : {}) }));
export const price0 = m => (m.start + 10 * m.step) * 10 ** (m.step - 1) * 0.6;   /* 판매가: 단계 안에서 선형 + 단계마다 자릿수 (v0.1 이 12시간 안에 끝나도록) */
export const MENU_MAX = 10;
export const menuMult = lv => 1.22 ** Math.max(0, lv - 1);
export const menuCost = (m, lv) => Math.ceil((2 + m.step) * 10 ** (1 + Math.floor((lv * (lv - 1) / 2) / 9)) * (1 + 0.25 * lv));   /* 쉼 포인트 · 자릿수 = 삼각수 n(n−1)/2 의 1/9 */
export const restRate = (fac, lv) => 5 * 1.25 ** (lv - 1) * fac.rp;   /* 1분마다 쉼 포인트 (명세서 휴식 60초 주기) */

/* ── 치명 요리 (명세서 4-6): 판매가 3배 · 기본 확률 + 상품/패스 +5~10%p · 광고 10분 30% ── */
export const TAP = { autoWait: 5, autoK: 0.5, priceK: 1.6, shelf: 8, cheerSec: 0.4, cheerMax: 10, cheerRegen: 0.6, tipP: 0.25, tipSec: 6, tipLife: 6, comboGap: 1.5, comboK: 0.03 };
/* 누르기 크기 사다리 (보상 = 현재 수입 N초치 · 명세서 13-1): 요리 = 한 접시 정가 · 팁 6초치 · 구름 양 1번 12초치(최대 12번 = 2분 24초치) · 선물 바구니 30/60/120초치 · 떠돌이 손님 1시간치
   틀: 직접 누르면 정가, 두면 5초 뒤 도우미가 반값으로 자동 판매 → 화면에는 "직접 팔면 2배!" (보너스 말투) · 진열은 처음 8칸 (꽉 차면 더 굽지 않음) */
export const CLOUD = { every: [100, 170], life: 15, taps: 12, sec: 8, autoDelay: 4, autoTaps: 8, autoK: 1 }   /* 2026-10-29 대표: 자동은 직접 누를 때 이하만 (능력치 판매 금지) */;
export const GIFTBOX = { every: [160, 280], life: 25, boxes: 3, table: [['coin', 39], ['rp', 33], ['stamp', 12], ['gem', 8], ['treat', 6], ['big', 2]], tiers: [30, 60, 120] };
export const VISITOR = { every: [420, 720], life: 40, perDay: 1, sec: 3600, needLv: 4 };
export const CRIT = { base: 0.05, mult: 3, adP: 0.30, adSec: 600 };

/* ── 직원 (명세서 5장 · 4-3 호감도) ── 외형 · 메인 스킬 1 · 보조 0~1 · 호감도 1~10 (경험치 1·2·5×10^k)
   우리: 확정 고용(뽑기 X) 4명 · 스킬 = 특정 라인 판매가 +% · 호감도는 간식으로 · 최대 레벨 보너스 = 판매가 +200% · 치명 +30%p (명세서 최대치와 같은 꼴) */
export const STAFF = [
  { id: 'haru', name: '하루', role: 'serve', look: 'helper', cost: 0, skill: { line: 'bread', k: 0.1 }, line: '오늘도 반짝이는 캠프로!' },
  { id: 'sol', name: '솔', role: 'cook', look: 'cook1', cost: 300, skill: { line: 'soup', k: 0.15 }, line: '수프는 천천히 끓여야 맛있어요.' },
  { id: 'bada', name: '바다', role: 'cook', look: 'cook2', cost: 4e3, skill: { line: 'drink', k: 0.15 }, line: '오늘의 음료는 뭐로 할까요?' },
  { id: 'byeol', name: '별', role: 'serve', look: 'helper2', cost: 8e5, skill: { line: 'all', k: 0.05 }, line: '손님 자리까지 쏜살같이!' },
];
export const FAV_EXP = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];             /* 다음 레벨까지 (명세서 1·2·5×10^k · 10 → 5000) */
export const FAV_BONUS = [0, 0.1, 0.3, 0.6, 1.0, 1.6, 2.5, 4.0, 6.0, 10.0];       /* 판매가 +배 (명세서 재료 계열 10·30·60·100·160·250·400·600·1000%) */
export const FAV_CRIT = [0, 0, 0.02, 0.04, 0.06, 0.09, 0.12, 0.16, 0.2, 0.3];     /* 치명 +%p (최대 +30%p) */
export const TREATS = { small: { name: '캠핑 쿠키', exp: 5 }, big: { name: '특별 도시락', exp: 50 } };   /* 명세서: 대부분 1~10 · 희귀 20~100 */

/* ── 손님 · 단골 이야기 ── */
export const GUESTS = ['hiker', 'grandma', 'kid', 'couple', 'family'];
export const SPAWN = { base: 11, min: 3.5 };   /* 초 · 자리 · 매력이 늘수록 빨리 옴 */
export const REGULARS = [
  { id: 'yunseul', name: '윤슬', who: '혼자 캠핑 오는 숲 사진가', look: 'hiker', needLv: 2, likes: 'herbtea',
    story: ['아침 안개가 걷히는 순간을 찍으러 왔어요. 여기 커피 향이 좋네요.', '어제 찍은 폭포 사진, 보여 드릴까요? 물소리까지 담긴 것 같죠.', '사실 회사를 그만두고 사진을 시작했어요. 무서웠는데… 여기 오면 괜찮아져요.', '다음 달에 작은 사진전을 해요. 첫 장은 이 캠프 아침으로 정했어요.', '사진전 첫날, 이 캠프 사진 앞에서 제일 오래 머문 사람이 있었대요. 고마워요, 셰프님.'] },
  { id: 'bomi', name: '봄이 할머니', who: '손녀와 오는 단골 할머니', look: 'grandma', needLv: 4, likes: 'stew',
    story: ['손녀가 여기 수프를 또 먹고 싶다고 졸라서 왔지 뭐유.', '우리 영감이랑 처음 캠핑 간 게 이런 숲이었어. 별이 참 많았지.', '요즘 무릎이 시원찮아서… 그래도 여기는 길이 편해서 좋아.', '손녀가 셰프님처럼 요리사가 되고 싶대. 앞치마를 사 달라네.', '이 수프 맛, 우리 영감이 끓여 주던 맛이랑 똑같아. 고마워요.'] },
  { id: 'dodam', name: '도담', who: '비숑 몽실이와 오는 청년', look: 'kid', needLv: 7, likes: 'bagel', dog: true,
    story: ['몽실이가 애견 존을 제일 좋아해요. 냄새부터 다르대요.', '몽실이가 고양이 노을이를 쫓아가다가 혼났어요. 노을이가 더 셌어요.', '몽실이가 나이가 꽤 들었어요. 그래서 좋은 데를 많이 데려가려고요.', '몽실이 생일이라 케이크 대신 베이글에 초를 꽂았어요. 좋아하더라고요.', '몽실이가 여기만 오면 꼬리를 제일 세게 흔들어요. 우리 둘 다 여기가 좋아요.'] },
];
export const FAVOR_MAX = 5;

/* ── 재화 (명세서 3장) · 보상 = 현재 수입 × N초 ── */
export const CUR = { coin: '숲 코인', gem: '솔방울', rp: '쉼 포인트', treat: '간식', stamp: '스탬프' };
/* 방치 (명세서 6장: 떠나 있던 시간만큼 · 상한 시간 · 광고 2배 · 기본값 미확정 — 질문 2) 우리: 기본 2시간 + 샤워장/세탁실 1시간씩 · 효율 70% */
export const OFFLINE = { capH: 2, eff: 0.7, min: 60 };

/* ── 레벨 1~20 ── 경험치: 손님 1명 +1 · 짓기 +10 · 강화 +2 · 메뉴 강화 +4 · 미션 +6 · 단골 이야기 +10 */
export const LV_MAX = 20;
export const lvNeed = lv => Math.round(40 * 1.25 ** (lv - 1));

/* ── 미션 · 출석 · 플레이 시간 (명세서 7장 · retention_numbers.csv) ──
   오늘의 할 일 약 10개(1~50회 · 보상 = 티켓 또는 수입 20~40분치) + 전부 하면 보너스 / 반복 퀘스트 단계형 / 플레이 시간 5·10·20·40·60분 (우리는 하루 5~15분 → 5·10·15) / 28일 출석 */
export const DAILY = [   /* 절반(4)은 직접 누르기 (명세서 13 · 사업 의견 5) */
  { id: 'tapsell', name: '다 된 요리 {n}번 직접 팔기', n: 20, r: { min: 20 } },
  { id: 'cloud', name: '구름 양 {n}번 쓰다듬기', n: 10, r: { gem: 15 } },
  { id: 'giftpick', name: '선물 바구니 {n}번 열기', n: 1, r: { treat: 2 } },
  { id: 'cat', name: '고양이 노을이 쓰다듬기', n: 1, r: { treat: 2 } },
  { id: 'upgrade', name: '시설 {n}번 강화하기', n: 5, r: { min: 20 } },
  { id: 'crit', name: '대박 요리 {n}번 만들기', n: 3, r: { gem: 15 } },
  { id: 'menu', name: '메뉴 {n}번 맛 올리기', n: 1, r: { min: 40 } },
  { id: 'box', name: '숲 선물 상자 열기', n: 1, r: { gem: 10 } },
];
export const DAILY_BONUS = { gem: 50, treat: 3 };
export const REPEAT = [
  { id: 'rserve', name: '손님 대접', key: 'served', steps: [10, 30, 60, 100, 200, 400, 800, 1500, 3000, 6000], r: s => ({ gem: 10 + 5 * s }) },
  { id: 'rup', name: '시설 강화', key: 'ups', steps: [5, 15, 30, 60, 100, 160, 250, 400, 600, 900], r: s => ({ gem: 10 + 5 * s }) },
  { id: 'rcrit', name: '대박 요리', key: 'crits', steps: [3, 10, 25, 50, 100, 200, 400, 800], r: s => ({ treat: 1 + s }) },
];
export const PLAYTIME = [[5, { gem: 10 }], [10, { gem: 15 }], [15, { gem: 25, treat: 1 }]];
export const ATTEND = Array.from({ length: 28 }, (_, i) => (i % 7 === 6 ? { gem: 80 } : i % 7 === 3 ? { treat: 3 } : i % 2 ? { gem: 20 } : { min: 60 }));

/* ── 손님 선물 (명세서: 골드 38 · 연구 32 · 가구 코인 11 · 유료 8 · 특수 먹이 6 · 변경 티켓 2 · 한정 2 %) — 확률 공개 ── */
export const GIFT = [['coin', 40, '숲 코인 (수입 10분치)'], ['rp', 32, '쉼 포인트'], ['treat', 15, '간식'], ['gem', 9, '솔방울 5개'], ['stamp', 2, '스탬프 1'], ['rare', 2, '특별 장식 조각']];
export const GIFT_P = { every: 45, chance: 0.18, max: 6 };   /* 손님이 떠날 때 18% · 바닥에 최대 6개 */
/* 하루 첫 접속 무작위 보상 (명세서: 먹이 41 · 골드 17 · 연구 17 · 가구 8 · 유료 7 · 채집 7 · 특수 먹이 4 %) */
export const LOGIN_BOX = [['treat', 41, '간식 2'], ['coin', 17, '수입 1시간치'], ['rp', 17, '쉼 포인트'], ['stamp', 8, '스탬프 2'], ['gem', 7, '솔방울 20'], ['big', 10, '특별 도시락 1']];

/* ── 숲 선물 상자 = 뽑기 (명세서 9-3: 장비 상자 1회 = 유료 재화 300 또는 광고 1회 · 확률 공개 · 천장 없음)
   대표 방침: 게임 재화(솔방울)로만 · 확률 공개 · 천장 30회 · 중복 = 솔방울 돌려받기 */
export const BOX = { cost: 300, pity: 30, dupGem: { n: 40, r: 120, s: 300 } };
export const RARITY = { n: { name: '보통', p: 0.70 }, r: { name: '희귀', p: 0.25 }, s: { name: '특별', p: 0.05 } };
export const DECO = [
  { id: 'tulip', name: '튤립 화단', rar: 'n', img: 'deco/tulip', appeal: 2, pos: P(70, 1110) },
  { id: 'bench', name: '쿠션 벤치', rar: 'n', img: 'deco/bench', appeal: 2, pos: P(260, 1150) },
  { id: 'cushion', name: '줄무늬 방석', rar: 'n', img: 'deco/cushion', appeal: 1, pos: P(560, 1150) },
  { id: 'bookbox', name: '책 나눔 상자', rar: 'n', img: 'deco/bookbox', appeal: 2, pos: P(820, 1150) },
  { id: 'lanterns', name: '종이 등불 줄', rar: 'r', img: 'deco/lanterns', appeal: 5, pos: P(445, 1060) },
  { id: 'swing', name: '나무 그네', rar: 'r', img: 'deco/swing', appeal: 5, pos: P(800, 1420) },
  { id: 'rabbit', name: '토끼 석상', rar: 'r', img: 'deco/rabbit', appeal: 5, pos: P(90, 1420) },
  { id: 'treats', name: '강아지 간식 바구니', rar: 's', img: 'deco/treats', appeal: 12, pos: P(640, 760) },
  { id: 'lanternpost', name: '꽃바구니 가로등', rar: 's', img: 'fac/lantern', appeal: 12, pos: P(560, 1180) },
];
/* 꾸미기 상품 (골드 item) · 소장자 전용 */
/* ── 시즌 (명세서 8장 재해석 · 원작은 중앙값 27일 · 시즌 재화 · 미션 · 상점 · 패스 · 한정 시설/코스튬) ──
   v0.1: 원어데이 서버 달력이 생기기 전 → 기기 날짜(한국) + 시험 옵션 ?season=autumn|spring · index.html 머리 스크립트와 같은 날짜를 씀
   기본은 봄 파스텔(대표 방향) · 가을은 행사 기간에만 (from ~ to · 날짜는 대표 확인 전 임시) */
export const SEASONS = {
  spring: { id: 'spring', name: '봄 캠프', bg: 'bg_spring', st: 'st', petals: ['#FAD4DE', '#F7C0CF', '#FFE6EC', '#FFF3B8'] },
  autumn: { id: 'autumn', name: '가을 캠프', from: '2026-11-09', to: '2026-12-07', bg: 'bg_autumn', st: 'sta', petals: ['#E8743B', '#D9472B', '#F2A93B', '#C9682E'],
    props: ['a_pumpkin', 'a_leaves', 'a_hay', 'a_blanket', 'a_apples', 'a_mum', 'a_lantern', 'a_chestnut'], propM: { a_pumpkin: 0.6, a_leaves: 0.7, a_hay: 0.8, a_blanket: 0.5, a_apples: 0.6, a_mum: 0.45, a_lantern: 0.32, a_chestnut: 0.42 } },
};
export const kstDate = ms => new Date(ms + 9 * 3600e3).toISOString().slice(0, 10);
export const seasonOf = (ms, force) => SEASONS[force] ? force : Object.values(SEASONS).find(z => z.from && kstDate(ms) >= z.from && kstDate(ms) < z.to)?.id || 'spring';
/* 시즌 행사: 한정 메뉴 3 · 한정 손님 1 (떠돌이 손님이 그 시즌 손님으로 · 보상 1.5배) · 시즌 미션 7일 (하루에 하나씩 열림 · 놓친 날은 나중에 해도 됨 · 7개 다 하면 수확 축제 장식 세트) */
export const SEASON_PREM = 1.2;   /* 시즌 메뉴 값 = 그 라인 최고 메뉴 × 1.2 × 시즌 메뉴 맛 레벨 배율 */
export const SEASON_EV = { autumn: {
  guest: { name: '단풍 여행자 가을', look: { top: 0xD9733A, scarf: 0xF2D27A, hair: 0x6A3E26, pants: 0x8A6A4A, shoe: 0x5E3A22, bucket: 0xC9682E }, mult: 1.5, line: '단풍 따라 걷다 보니 여기까지 왔어요!' },
  missions: [
    { id: 'a1', key: 'smenu', n: 5, name: '가을 한정 메뉴 {n}그릇 팔기', r: { gem: 20 } },
    { id: 'a2', key: 'cloud', n: 15, name: '구름 양 {n}번 쓰다듬기', r: { gem: 20 } },
    { id: 'a3', key: 'visit', n: 1, name: '단풍 여행자 맞이하기', r: { treat: 3 } },
    { id: 'a4', key: 'upgrade', n: 10, name: '시설 {n}번 강화하기', r: { gem: 20 } },
    { id: 'a5', key: 'tapsell', n: 40, name: '다 된 요리 {n}번 직접 팔기', r: { gem: 25 } },
    { id: 'a6', key: 'giftpick', n: 2, name: '선물 바구니 {n}번 열기', r: { treat: 3 } },
    { id: 'a7', key: 'crit', n: 5, name: '대박 요리 {n}번 만들기', r: { gem: 30 } },
  ],
  final: { id: 'harvest', name: '수확 축제 장식', appeal: 10 },
} };
export const SET_POS = P(250, 1105);   /* 벚꽃 정원 세트를 놓는 자리 (잔디 왼쪽) */
export const DECO_SHOP = { deco: { name: '벚꽃 정원 세트', appeal: 20, items: ['tulip', 'lanterns', 'bench'] }, skin: { name: '셰프 봄 의상 · 연노랑 앞치마', appeal: 5 } };
/* ── 옷장 · 동행 펫 · 시설 외형 (v0.2 BM · 대표 지시 10-30 · bm-policy: 꾸미기 = 판다 · 능력치 = 안 판다) ──
   능력치 0 (매력도 없음 · 외형과 작은 반응만) · 모두 '입어 보기 15초' · 무료 길 = 스탬프(광고 혜택마다 1개) 교환 · 계정에 남음(item SKU)
   가격: 의상 250~400 · 펫 400~600 골드 (bm-policy) */
export const WARDROBE = [
  { id: 'base', name: '기본 셰프복', desc: '분홍 앞치마 · 캠프의 기본 옷' },
  { id: 'skin', name: '봄 의상 · 연노랑 앞치마', sku: 'skin', desc: '셰프의 첫 꾸미기 옷' },
  { id: 'out_walk', name: '봄 산책', sku: 'out_walk', gold: 250, stamp: 40, desc: '민트 니트 가디건 + 챙 넓은 크림 모자 · 걸을 때 모자 끈이 살랑' },
  { id: 'out_knit', name: '가을 니트', sku: 'out_knit', gold: 300, stamp: 50, desc: '벽돌색 꽈배기 니트 + 머스터드 비니 · 단풍 철에 딱' },
  { id: 'out_fire', name: '밤 캠프파이어', sku: 'out_fire', gold: 350, stamp: 60, desc: '빨강 체크 플란넬 + 숲빛 앞치마 + 크림 목도리 · 불멍 감성' },
];
export const PET = { id: 'pet_bichon', name: '비숑 동행 펫 · 몽이', sku: 'pet_bichon', gold: 500, stamp: 90, desc: '셰프 옆을 졸졸 따라다니고, 손님이 오면 꼬리를 세차게 흔들어요 · 가만히 있으면 앉아서 쉬어요' };
export const FAC_SKIN = { id: 'skin_autumn', name: '가을 시설 외형', sku: 'skin_autumn', gold: 350, desc: '시설 10종이 1년 내내 가을 모습(단풍 · 호박 · 담요 · 따뜻한 등불)으로 · 켜고 끌 수 있어요', free: '가을 캠프 미션 7개를 다 하면 무료' };
export const OWNER_DECO = { name: '금빛 꽃바구니 가로등', appeal: 15 };

/* ── 광고 자리 (명세서 9-1 의 10곳을 같은 비중으로) · 하루 한도는 원어데이(게임당 5)와 게임 쪽 둘 다 ── */
export const ADS = {
  speed: { name: '바쁜 시간 · 5분 동안 요리 2배 빠르게', sec: 300, limit: 3 },
  crit: { name: '대박 요리 · 10분 동안 30%', sec: 600, limit: 2 },
  rest: { name: '쉼 포인트 · 10분 동안 +30%', sec: 600, limit: 2 },
  double: { name: '받는 보상 2배 (쉬는 동안 · 선물 · 미션)', limit: 5 },
  box: { name: '숲 선물 상자 1회', limit: 1 },
  again: { name: '상자 한 번 더', limit: 1 },
  charge: { name: '계곡 놀이터 바로 채우기', limit: 2 },
  gifts: { name: '바닥 선물 한꺼번에 받기', limit: 2 },
  restock: { name: '매점 진열 새로', limit: 2 },
  inst: { name: '즉시 완성', limit: 5 },
  giftrest: { name: '선물 바구니 나머지 전부', limit: 3 },
};
export const STAMP_SHOP = [{ id: 'rabbit', cost: 15 }, { id: 'swing', cost: 15 }, { id: 'lanterns', cost: 12 }, { id: 'cushion', cost: 6 }];

/* ── 매점 진열 (웰컴센터 · 숲 코인으로 · 명세서 '가중치 랜덤 진열 상점') ── */
export const STALL = [['treat', '캠핑 쿠키 3', { min: 15 }], ['big', '특별 도시락 1', { min: 60 }], ['rp', '쉼 포인트 묶음', { min: 30 }], ['speed', '바쁜 시간 5분', { min: 25 }]];

/* ── 즉시 완성 (docs/bm-policy.md 2-1 · farm/inst.js 와 같은 계산) ── */
export const INST = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25];
export const INST_MIN = 10;
export const speedCost = sec => Math.max(1, Math.ceil(sec / 300));   /* 솔방울: 남은 5분마다 1 (최소 1) · 솔방울 1 = 원어데이 골드 1 */
const TIER = [[300, 1], [600, 2], [900, 3], [1200, 4], [1800, 6], [2700, 8], [3600, 10], [7200, 15], [14400, 25]];
const down = g => INST.reduce((a, v) => (v <= g ? v : a), INST[0]);
export const instBase = T => down(Math.min(Math.ceil(T / 300), (TIER.find(([s]) => T <= s) || [0, 25])[1]));
export function instGold(baseT, durS, leftS) { if (!(leftS >= INST_MIN)) return 0; const p = Math.max(1, Math.ceil(instBase(baseT) * Math.min(1, leftS / Math.max(1, durS)))); return down(Math.min(p, speedCost(leftS))); }

/* ── 큰 수 (한국식 단위) ── */
const UNITS = ['', '만', '억', '조', '경', '해', '자', '양', '구', '간', '정', '재', '극'];
export function fmt(n) {
  if (!isFinite(n)) return '∞'; n = Math.floor(n); if (n < 10000) return n.toLocaleString('ko-KR');
  const e = Math.min(UNITS.length - 1, Math.floor(Math.log10(n) / 4)), v = n / 10 ** (e * 4);
  return (v >= 100 ? Math.floor(v) : v >= 10 ? Math.floor(v * 10) / 10 : Math.floor(v * 100) / 100) + UNITS[e];
}
export const josa = (w, p) => { const c = w.charCodeAt(w.length - 1) - 0xAC00, has = c >= 0 && c % 28 > 0; const [a, b] = p.split('/'); return w + (has ? a : b); };
