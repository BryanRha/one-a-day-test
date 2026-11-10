// 매장 배치 v2 (0.2.0 개편 「동네 한 칸에서 전국의 감성커피로」 · EXPANSION_PLAN.md 2장 · 4장)
//   지점 = 구역(area) 여러 개 · 단계(stage) 8개 (0 = 지금의 한 칸 가게) · 단계를 열면 그 단계의 구역들이 함께 열림 · build(초)가 있으면 공사 → 끝나면 열림 (공사 중에도 장사)
//   칸: 100 단위 · 구역 rect = [i0, j0, i1, j1) 층 안 칸 번호 (한 칸 가게 = 0~13) · 층 f 의 세계 x = 층 안 x + f × FDX (층마다 다른 곳에 있고 화면은 한 층만 그림)
//   이웃 구역 사이는 벽 — openTo(벽 없이 이어짐) · doors(문 칸 짝)만 지나감 · 계단 links 는 층 사이를 잇는 칸 짝
//   far = 먼 자리(가져다 드리기) · outdoor = 바깥 · visit = 방문형 방(동료 쉼터 · 사장실 · 원두 창고)
import { STORES } from './data.js?v=0.99.18';
export const CELL = 100, FN = 60, FDX = FN * CELL;
export const FLOORS = ['1F', '2F', '3F', '루프탑'];
export const floorOfX = x => Math.max(0, Math.round(x / FDX));

// ── 지점 인테리어 7종 (계획안 4-2) · 모든 지점: 나무 기둥 · 지역 돌 · 큰 창 · 서예 액자 · #A92E2B 간판 · 3000K 빛 · 색 3~4개
//   바닥은 채도 · 대비를 낮춤 (마루미 0.3.1 원칙 · tools/floor_check.mjs: 물건 대비 ≥ 1.5 · 무늬 대비 ≤ 1.25)
export const INTERIOR = [
  { id: 'yeongdo', name: '바다 · 다리 · 조선소', floor: 'concrete', fa: '#C2C2BF', fb: '#BBBBB8', line: '#B0B0AC', strip: '#CDB89E', wall: 'steel', wallC: 0xEDE7DD, wallB: 0xE5DED2, steel: 0x2F4A5E, trim: 0x2F4A5E,
    light: 'ship', props: 'sea', ext: 'glass', sky: '#C9DCE4', ground: 0xBCD2DA, out: 0xC6D8DE, hemi: [0xFFF1DE, 0x7A8A96, 1.35], sun: 0xFFDDB4, callig: '바다는/늘/그자리', stone: 0xB6B1A8, note: '노출 콘크리트 + 데크 띠 · 흰 회벽 + 남색 철골 · 배 등불 펜던트 · 밧줄 · 부표 · 해송' },
  { id: 'jangnim', name: '동네 사랑방 · 골목 · 공단', floor: 'terracotta', fa: '#D9B8A6', fb: '#D3B09D', line: '#C9A693', wall: 'wainscot', wallC: 0xF1E6D4, wallB: 0xE9DCC6, wain: 0x9A7452, trim: 0x8A5A3A,
    light: 'globe', props: 'alley', ext: 'brick', sky: '#EFE3D2', ground: 0xD9CBB5, out: 0xE2D6C2, hemi: [0xFFF0DA, 0x9A7A5C, 1.35], sun: 0xFFE0B8, callig: '골목에도/볕이/든다', stone: 0xA89C8E, note: '테라코타 타일 + 원목 · 크림 회벽 + 낮은 판벽 · 둥근 유리 등 · 평상 · 동네 게시판 · 자전거' },
  { id: 'gangjeong', name: '현무암 · 귤밭 · 바람', floor: 'wood', fa: '#D2B38F', fb: '#CCAC87', line: '#C2A27E', step: '#6F6A66', wall: 'basalt', wallC: 0x4A4644, wallB: 0x433F3D, plaster: 0xEFE6D6, trim: 0x6B4A30,
    light: 'gammul', props: 'jeju', ext: 'stonewall', sky: '#D6E6CF', ground: 0xC4D8B0, out: 0xCBDDB8, hemi: [0xFFF2DC, 0x8A9A7A, 1.4], sun: 0xFFE2B6, callig: '돌담너머/귤빛/바람', stone: 0x4A4644, note: '원목 + 현무암 디딤돌 · 현무암 돌담 + 흙빛 회벽 · 감물 천 갓 · 귤나무 · 감물 방석' },
  { id: 'jeonju', name: '한지 · 서까래 · 마루', floor: 'maru', fa: '#D7BC9A', fb: '#D1B593', line: '#C6A983', wall: 'hanji', wallC: 0xF6EFE4, wallB: 0xEEE6D8, beam: 0x6B4A30, trim: 0x6B4A30,
    light: 'hanji', props: 'hanok', ext: 'giwa', sky: '#E8E2D6', ground: 0xD8CDB8, out: 0xDCD2BE, hemi: [0xFFF2DE, 0x9A8466, 1.4], sun: 0xFFE4BE, callig: '여백이/말을/한다', stone: 0x8E8678, note: '대청마루 · 한지 창살 + 서까래 · 한지 등 · 다도 상 · 장독 · 매화 분재' },
  { id: 'gangneung', name: '솔숲 · 모래 · 커피거리', floor: 'terrazzo', fa: '#E3DDD2', fb: '#DED7CB', line: '#D2CABD', wall: 'pine', wallC: 0xC9A47E, wallB: 0xC09A73, sky2: 0xCFE3E6, trim: 0x7A5634,
    light: 'factory', props: 'roastery', ext: 'deck', sky: '#D3E4E6', ground: 0xE4DCCB, out: 0xD8E2DE, hemi: [0xF4F6FF, 0x8A9A9C, 1.45], sun: 0xFFEAD0, callig: '솔바람에/볶은/한잔', stone: 0xC8C0B2, note: '모래빛 테라조 + 데크 · 소나무 판벽 + 하늘빛 창 · 공장 펜던트 · 대형 로스터 · 생두 자루 · 서핑보드' },
  { id: 'seongsu', name: '붉은 벽돌 공장', floor: 'epoxy', fa: '#B3AFA8', fb: '#ADA9A2', line: '#A5A19A', wall: 'brick', wallC: 0x9A4A36, wallB: 0x8E4432, truss: 0x3B3B42, trim: 0x3B3B42,
    light: 'spot', props: 'gallery', ext: 'factory', sky: '#DCD6D0', ground: 0xBDB6AE, out: 0xC8C2BA, hemi: [0xFFF0E0, 0x7A6A62, 1.4], sun: 0xFFE0C0, callig: '한잔에/담은/한결같은마음', stone: 0x9C9890, note: '에폭시 회색 + 철판 · 붉은 벽돌 + 철제 트러스 · 레일 스포트 · 시 낭독 무대 · 갤러리 액자 · 재봉틀' },
  { id: 'gyeongju', name: '기와 · 능 · 석탑', floor: 'stone', fa: '#D6CFC2', fb: '#D0C9BB', line: '#C4BCAD', wall: 'earth', wallC: 0xE3D3B8, wallB: 0xDACAAD, tile: 0x5A5652, trim: 0x5A5652,
    light: 'chorong', props: 'silla', ext: 'giwa', sky: '#E2DDD0', ground: 0xC9CFB4, out: 0xCDD3BC, hemi: [0xFFF0DA, 0x8A8470, 1.4], sun: 0xFFE2BA, callig: '천천히/걸어도/괜찮아요', stone: 0xA8A08E, note: '박석 · 흙벽 + 기와 담 · 청사초롱 같은 낮은 등 · 석등 · 연못 · 기와 조각' },
];

// ── 구역 뼈대 (모든 지점 같은 자리 · 크기 · 이름 · 특색만 다름)
//   1층: 한 칸 가게(0~13) 앞 = 앞마당(테라스 류) · 왼쪽 뒤 = 로스팅실 + 원두 창고 · 왼쪽 앞 = 베이커리(2층 계단) · 오른쪽 앞 = 별관(포장 · 드라이브스루)
//   2층 = 라운지 · 3층 = 서재 + 동료 쉼터 + 사장실 · 4 = 루프탑
const T = {
  shop: () => ({ id: 'shop', kind: 'shop', floor: 0, rect: [0, 0, 14, 14] }),
  front: (j1 = 24, i1 = 14) => ({ id: 'front', kind: 'seats', floor: 0, rect: [0, 14, i1, j1], far: true, outdoor: true, openTo: ['shop'] }),
  roast: () => [{ id: 'roast', kind: 'roast', floor: 0, rect: [-7, 2, 0, 7], doors: [[-1, 4, 0, 4], [-1, 5, 0, 5]] },
    { id: 'beanstore', kind: 'store', floor: 0, rect: [-7, 0, 0, 2], visit: 'store', doors: [[-3, 1, -3, 2], [-4, 1, -4, 2]] }],
  bakery: () => ({ id: 'bakery', kind: 'bakery', floor: 0, rect: [-7, 7, 0, 14], doors: [[-1, 9, 0, 9], [-1, 10, 0, 10], [-4, 6, -4, 7], [-3, 6, -3, 7]] }),
  annex: (j1 = 24, i1 = 20) => ({ id: 'annex', kind: 'annex', floor: 0, rect: [14, 13, i1, j1], wallLow: true, doors: [[13, 13, 14, 13], [13, 16, 14, 16], [13, 17, 14, 17]] }),
  lounge: (i1 = 17, j1 = 12) => ({ id: 'lounge', kind: 'seats', floor: 1, rect: [0, 0, i1, j1], far: true }),
  office: () => [{ id: 'library', kind: 'seats', floor: 2, rect: [0, 6, 14, 14], far: true, openTo: ['hall3'] },
    { id: 'hall3', kind: 'hall', floor: 2, rect: [6, 0, 8, 6], openTo: ['library'] },
    { id: 'crew', kind: 'visit', floor: 2, rect: [0, 0, 6, 6], visit: 'crew', doors: [[5, 2, 6, 2], [5, 3, 6, 3]] },
    { id: 'boss', kind: 'visit', floor: 2, rect: [8, 0, 14, 6], visit: 'boss', doors: [[7, 2, 8, 2], [7, 3, 8, 3]] }],
  roof: (i1 = 20, j1 = 10) => ({ id: 'roof', kind: 'seats', floor: 3, rect: [0, 0, i1, j1], far: true, outdoor: true }),
};
/* 계단: 1층 베이커리 → 2층 라운지 · 2층 → 3층 복도 · 3층 복도 → 루프탑 ([층, i, j] 짝) */
const STAIRS = [{ a: [0, -6, 13], b: [1, 1, 10], need: 'lounge' }, { a: [1, 15, 1], b: [2, 6, 1], need: 'hall3' }, { a: [2, 7, 5], b: [3, 1, 1], need: 'roof' }];

// ── 구역에 함께 놓이는 자리 (가구 id · 칸 왼쪽 위 [i, j] · 돌림) — 「자리 5 → 40」
const SEATS = {
  front: [['parasol', 1, 16], ['parasol', 5, 16], ['parasol', 9, 16], ['parasol', 3, 20], ['parasol', 8, 20]],
  lounge: [['floor', 1, 1], ['floor', 5, 1], ['floor', 9, 1], ['sofa', 13, 4], ['table4', 2, 5], ['table4', 7, 5], ['window', 1, 8], ['window', 3, 8]],
  library: [['table4', 1, 8], ['table4', 6, 8], ['window', 11, 8], ['window', 12, 11], ['table2', 2, 12]],
  roof: [['parasol', 2, 2], ['parasol', 7, 2], ['parasol', 12, 2], ['table2', 16, 3], ['table2', 4, 6], ['table2', 10, 6]],
  annex: [['window', 15, 21], ['window', 16, 21]],
  bakery: [['window', -2, 12]],
};
/* 구역 안 고정 칸 (설비 · 계단 · 창구 · 화분) [층 안 i, j] */
/*   로스팅실: 로스터 3 (-6,3) (-4,3) (-2,3) · 원두 자루 선반 (-6,5)(-5,5) / 원두 창고: 선반 (-7,0) / 베이커리: 오븐 3 · 진열장 (-2,8) · 2층 계단 그림 (-7,12)(-7,13)
     별관: 드라이브스루 창구 (19,18)(19,19) / 화분 (앞마당 · 루프탑) / 2층 → 3층 계단 그림 (16,0)(16,1) / 3층 → 루프탑 계단 그림 (6,5) */
export const SPOT = { roasters: [[-6, 3], [-4, 3], [-2, 3]], bags: [-5.5, 5], ovens: [[-6, 8], [-5, 8], [-4, 8]], showcase: [-2, 8], window: [19, 18.5], hand: [18, 18], pots: { front: [[13, 22], [0, 22]], roof: [[0, 0], [19, 9], [19, 0]] }, safe: [12, 1], desk: [10, 1], wardrobe: [1, 1], gift: [-6, 0] };
const FIXED = {
  roast: [[-6, 3], [-4, 3], [-2, 3], [-6, 5], [-5, 5]], beanstore: [[-7, 0]], bakery: [[-6, 8], [-5, 8], [-4, 8], [-2, 8], [-7, 12], [-7, 13]],
  annex: [[19, 18], [19, 19]], front: [[13, 22], [0, 22]], roof: [[0, 0], [19, 9], [19, 0]], lounge: [[16, 1], [16, 0]], hall3: [[6, 5]], boss: [[12, 1], [10, 1]], crew: [[1, 1]],
};

// ── 지점 7곳 · 단계 순서 (계획안 2-2 · 2-4): [구역들, 공사 초, 이름, 영문, 특색]
//   cost 는 아래 branch() 에서 (단계 · 지점 배수 · COST_K)
const B = [
  { stages: [['shop'], ['front', 30, '바다 테라스', 'SEA TERRACE'], ['roast', 120, '로스팅실', 'ROASTING ROOM'], ['bakery', 300, '베이커리 공방', 'BAKERY'], ['lounge', 1800, '2층 라운지', '2F LOUNGE'],
      ['office', 3600, '3층 서재 · 동료 쉼터 · 사장실', '3F STUDY'], ['annex', 7200, '포장 별관 · 드라이브스루', 'TAKEOUT ANNEX'], ['roof', 14400, '루프탑 · 노을 자리', 'ROOFTOP SUNSET']],
    feat: { sunset: true, drive: true }, front: [24], annex: [24], lounge: [17, 12], roof: [20, 10] },
  { stages: [['shop'], ['annex', 300, '드라이브스루 · 배달 창구', 'DRIVE-THRU'], ['front', 600, '골목 평상 마당', 'ALLEY YARD'], ['roast', 1200, '로스팅실', 'ROASTING ROOM'], ['bakery', 1800, '동네 빵 공방', 'BAKERY'],
      ['lounge', 3600, '2층 동네 사랑방', '2F LOUNGE'], ['office', 7200, '3층 서재 · 동료 쉼터 · 사장실', '3F STUDY'], ['roof', 14400, '옥상 평상', 'ROOF DECK']],
    feat: { drive: true, delivery: true }, front: [24], annex: [26, 22], lounge: [18, 12], roof: [20, 11] },
  { stages: [['shop'], ['front', 600, '귤밭 마당 · 돌담 정원', 'TANGERINE YARD'], ['roast', 1200, '로스팅실', 'ROASTING ROOM'], ['bakery', 1800, '귤 디저트 공방', 'BAKERY'], ['annex', 3600, '포장 별관', 'TAKEOUT'],
      ['lounge', 5400, '2층 바람 라운지', '2F LOUNGE'], ['office', 7200, '3층 서재 · 동료 쉼터 · 사장실', '3F STUDY'], ['roof', 14400, '한라산이 보이는 루프탑', 'ROOFTOP']],
    feat: { yard: true }, front: [27, 14], annex: [26], lounge: [18, 13], roof: [20, 11] },
  { stages: [['shop'], ['bakery', 900, '한옥 별채 다도실', 'TEA HOUSE'], ['front', 1200, '한옥 마당', 'COURTYARD'], ['roast', 1800, '로스팅실', 'ROASTING ROOM'], ['lounge', 3600, '2층 누마루', '2F NUMARU'],
      ['annex', 5400, '포장 별관', 'TAKEOUT'], ['office', 7200, '3층 서재 · 동료 쉼터 · 사장실', '3F STUDY'], ['roof', 14400, '기와 위 루프탑', 'ROOFTOP']],
    feat: { tea: true }, front: [26], annex: [25], lounge: [18, 13], roof: [20, 12] },
  { stages: [['shop'], ['roast', 900, '로스터리 공장', 'ROASTERY'], ['front', 1200, '해변 데크', 'BEACH DECK'], ['bakery', 1800, '베이커리', 'BAKERY'], ['annex', 3600, '원두 납품 창구', 'BEAN DESK'],
      ['lounge', 5400, '2층 솔숲 라운지', '2F LOUNGE'], ['office', 7200, '3층 서재 · 동료 쉼터 · 사장실', '3F STUDY'], ['roof', 14400, '바다 루프탑', 'ROOFTOP']],
    feat: { factory: true }, front: [27], annex: [26], lounge: [19, 13], roof: [21, 12] },
  { stages: [['shop'], ['lounge', 1200, '2층 갤러리 · 시 낭독 무대', '2F GALLERY'], ['roast', 1800, '로스팅실', 'ROASTING ROOM'], ['bakery', 2400, '베이커리', 'BAKERY'], ['front', 3600, '공장 마당', 'FACTORY YARD'],
      ['annex', 5400, '포장 별관', 'TAKEOUT'], ['office', 7200, '3층 서재 · 동료 쉼터 · 사장실', '3F STUDY'], ['roof', 14400, '성수 루프탑', 'ROOFTOP']],
    feat: { stage: true }, up: 'shop', front: [26], annex: [26], lounge: [20, 13], roof: [21, 12] },   /* 2층 갤러리가 먼저 → 계단은 가게 앞 왼쪽 구석 */
  { stages: [['shop'], ['front', 1200, '연못 마당', 'POND YARD'], ['roast', 1800, '로스팅실', 'ROASTING ROOM'], ['annex', 2400, '기와 별관', 'GIWA ANNEX'], ['bakery', 3600, '황남빵 공방', 'BAKERY'],
      ['lounge', 5400, '2층 툇마루', '2F LOUNGE'], ['office', 7200, '3층 서재 · 동료 쉼터 · 사장실', '3F STUDY'], ['roof', 14400, '능이 보이는 루프탑', 'TOMB VIEW ROOF']],
    feat: { tomb: true }, front: [27], annex: [26], lounge: [20, 13], roof: [22, 12] },
];
/* 앞에서 연 단계가 있어야 열리는 것 (층은 아래부터) */
const NEED = { lounge: 'bakery', office: 'lounge', roof: 'office' };
/* 단계 기본 값(1호점) — 단계 순서대로 늘림 · 2호점부터 지점 배수 × COST_K */
const STAGE_BASE = [0, 300, 900, 1800, 4200, 9000, 16000, 28000];
export const COST_K = [5, 5, 5, 5, 5, 5, 5];   /* tools/growth_sim.mjs 로 맞춤 (2026-11-10): 무과금 하루 20분 44일 · 광고 10 28.5일 · VIP+광고 10 24.5일 · 과금 속도 1.42배 / 1.16배 */
export const NEXT_K = 1.2;   /* 다음 지점 계약 = 마지막 단계 값 × NEXT_K */
export const FINISHED = 0.9;   /* 진행 90% 면 사장실 계약 책상(사장실 전엔 지도)에서 다음 지점 */

function branch(bi, mult) {
  const b = B[bi], areas = [], stages = [];
  const mk = (key, si) => { const L = key === 'front' ? T.front(...b.front) : key === 'annex' ? T.annex(...b.annex) : key === 'lounge' ? T.lounge(...b.lounge) : key === 'roof' ? T.roof(...b.roof) : T[key]();
    const list = (Array.isArray(L) ? L : [L]).map(a => ({ ...a, stage: si, fixed: (FIXED[a.id] || []).map(c => c.slice()), seats: (SEATS[a.id] || []).map(s => s.slice()) }));
    for (const a of list) { if (a.kind === 'seats' && a.id === 'front' && b.feat.yard) a.yard = true; if (a.id === 'lounge' && b.feat.stage) a.stageShow = true; if (a.id === 'bakery' && b.feat.tea) a.tea = true; if (a.id === 'roast' && b.feat.factory) a.factory = true; if (a.id === 'roof' && b.feat.sunset) a.sunset = true; if (a.id === 'roof' && b.feat.tomb) a.tomb = true; }
    areas.push(...list); return list.map(a => a.id); };
  b.stages.forEach(([key, build = 0, name = '한 칸 가게', en = 'THE FIRST ROOM'], si) => {
    const ids = mk(key, si), cost = Math.round(STAGE_BASE[si] * mult * COST_K[bi] / 10) * 10;
    stages.push({ i: si, key, ids, name, en, build, cost, need: key === 'lounge' && b.up === 'shop' ? null : NEED[key] || null }); });
  const stairs = STAIRS.map(s => ({ ...s, a: s.a.slice(), b: s.b.slice() })); if (b.up === 'shop') { stairs[0].a = [0, 1, 13]; areas.find(a => a.id === 'shop').fixed.push([0, 12], [0, 13]); areas.find(a => a.id === 'bakery').fixed = areas.find(a => a.id === 'bakery').fixed.filter(([i, j]) => i !== -7 || j < 12); }
  const cells = a => (a.rect[2] - a.rect[0]) * (a.rect[3] - a.rect[1]);
  for (const s of stages) s.cells = s.ids.reduce((n, id) => n + cells(areas.find(a => a.id === id)), 0);
  const total = stages.reduce((n, s) => n + s.cells, 0);
  return { bi, mult, areas, stages, total, stairs, feat: b.feat, interior: INTERIOR[bi], next: Math.round(stages[7].cost * NEXT_K / 10) * 10 };
}
export const BRANCHES = STORES.map((s, i) => branch(i, s.mult));
/* 구역 수 (지점 7 × 8단계 + 커피트럭) = 57 */
export const ZONE_COUNT = BRANCHES.reduce((n, b) => n + b.stages.length, 0) + 1;
/* 세계 좌표 ↔ 칸 (층 포함) */
export const gi = (f, i) => i + f * FN;
export const cxw = gi2 => -700 + CELL / 2 + gi2 * CELL;
export const czw = j => -700 + CELL / 2 + j * CELL;
/* 가구를 칸 왼쪽 위 [i, j] 에 놓을 때의 중심 */
export const furnAt = (f, i, j, size, r = 0) => { const [w, h] = r % 2 ? [size[1], size[0]] : size; return { x: -700 + (gi(f, i) + w / 2) * CELL, z: -700 + (j + h / 2) * CELL }; };
/* 공사 시간 표시 · 즉시 완성 골드 (캠프 · 마루미와 같은 표: 30분 10 · 1시간 25 · 2시간 60 · 4시간 150) */
export const hms = s => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60; return h ? `${h}시간 ${m}분` : m ? `${m}분 ${String(ss).padStart(2, '0')}초` : `${ss}초`; };
export const INST = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 100, 120, 150];
export function instGold(sec) { const P = [[0, 1], [1800, 10], [3600, 25], [7200, 60], [14400, 150]]; let g = 150;
  for (let i = 1; i < P.length; i++) if (sec <= P[i][0]) { const [a, ga] = P[i - 1], [b, gb] = P[i]; g = ga + (gb - ga) * (sec - a) / (b - a); break; }
  const v = Math.max(1, g); let t = 1; for (const x of INST) if (x <= v) t = x; return t; }
