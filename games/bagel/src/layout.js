// 매장 배치 v2 (2026-11-09 「매장이 자라는 마루미」 · bagel/EXPANSION_PLAN.md 2장)
//   모든 지점 = 같은 뼈대(방 7개 + 지점 특색 1) · 지점마다 여는 순서 · 공사 시간 · 인테리어 · 특색이 다름
//   좌표: x 오른쪽 아래 · z 왼쪽 아래 (카메라는 +x +z 쪽에서 봄) · 뒷벽 z = -1150 · 왼벽 x = -1250 · 앞(거리) z > 450
//   방(rect = [x0, z0, x1, z1]) · kind: open = 벽 없이 이어진 바닥 · encl = 벽과 문이 있는 방(방문형)
//   열기: 열리는 순서(order)의 「R_방」 칸에 돈을 부으면 열림 · build(초)가 있으면 공사 → 끝나면 열림 (공사 중에도 다른 칸은 그대로)

// ── 방 (모든 지점 공통 위치)
export const ROOMS = {
  shop: { name: '매대', en: 'COUNTER', rect: [-250, -450, 650, 450], kind: 'open', start: true },
  dough: { name: '반죽실', en: 'DOUGH ROOM', rect: [-650, -1150, 0, -450], kind: 'open', main: 'mixer', pad: [-170, -370] },
  cream: { name: '크림치즈 공방', en: 'CREAM ATELIER', rect: [0, -1150, 650, -450], kind: 'open', main: 'cc', pad: [170, -370] },
  cafe: { name: '커피 바', en: 'COFFEE BAR', rect: [650, -1150, 1250, -450], kind: 'open', main: 'espresso', pad: [0, -370] },
  hall: { name: '홀 확장', en: 'HALL', rect: [-650, -450, -250, 450], kind: 'open', main: 't2', pad: [-170, -200] },
  crew: { name: '크루룸', en: 'CREW ROOM', rect: [-1250, -1150, -650, -450], kind: 'encl', visit: true, doors: [{ side: 'E', at: -800 }], pad: [-560, -880] },
  boss: { name: '사장실', en: "OWNER'S OFFICE", rect: [-1250, -450, -650, 450], kind: 'encl', visit: true, doors: [{ side: 'N', at: -950 }, { side: 'E', at: 0 }], pad: [-1100, -540] },
  store: { name: '창고', en: 'STOCKROOM', rect: [650, -450, 1250, 450], kind: 'encl', visit: true, doors: [{ side: 'W', at: -250 }], pad: [590, -30] },
  /* 지점 특색 (8번 방) — 지점마다 하나 */
  pickup: { name: '픽업 창구', en: 'PICK-UP', rect: [650, 450, 1250, 1050], kind: 'open', main: 'drive', pad: [565, 330], feature: 1 },
  up2: { name: '2층 홀', en: '2F LAKE VIEW', rect: [-1250, 450, -250, 1050], kind: 'open', main: 'u1', pad: [-160, 370], feature: 2, raised: 150 },
  drive: { name: '드라이브스루', en: 'DRIVE-THRU', rect: [650, 450, 1250, 1050], kind: 'open', main: 'drive', pad: [565, 330], feature: 3 },
  terrace: { name: '숲 테라스', en: 'FOREST TERRACE', rect: [-1250, 450, -250, 1050], kind: 'open', main: 'p1', pad: [-160, 370], feature: 4, outdoor: true },
};
export const DOOR_W = 220, WALL_T = 30;
/* 2층: 계단 띠(오른쪽) z 450 → 850 으로 올라감 · 나머지는 2층 높이 */
export const STAIRS = { x0: -450, x1: -250, z0: 450, z1: 850 };
// 손님이 다니는 거리 (매장 앞 · 문) — 사장님은 못 나감
export const STREET = [-250, 450, 650, 1500];
export const DOOR = [430, 1420];

// ── 칸 (설비 · 직원 · 테이블 · 지점 계약) — room: 속한 방 · base: 1호점 기준 값(열리는 순서에 따라 늘림)
const S = {
  oven: { type: 'oven', x: 450, z: -320, free: true, room: 'shop' },
  counter: { type: 'counter', x: 250, z: 80, free: true, room: 'shop' },
  bin: { type: 'bin', x: -150, z: 80, free: true, room: 'shop' },
  t1: { type: 'table', x: 70, z: 310, room: 'shop', base: 30 },
  cashier: { type: 'hire', staff: 'cashier', x: 170, z: -200, room: 'shop', base: 90, label: '계산원 뽑기' },
  mixer: { type: 'mixer', x: -200, z: -660, room: 'dough', base: 140, label: '반죽기' },
  dougher: { type: 'hire', staff: 'dougher', x: -200, z: -960, room: 'dough', base: 140, label: '반죽 직원 뽑기' },
  kettle: { type: 'kettle', x: -420, z: -660, room: 'dough', base: 900, label: '데치기 솥 · 쫄깃 플레인' },
  retard: { type: 'retard', x: -400, z: -1010, room: 'dough', base: 1200, label: '저온 숙성고' },
  cc: { type: 'ccbar', x: 180, z: -660, room: 'cream', base: 160, label: '토핑 바' },
  topper: { type: 'hire', staff: 'topper', x: 180, z: -960, room: 'cream', base: 520, label: '토핑 직원 뽑기' },
  coffee: { type: 'coffee', x: 480, z: -680, room: 'cream', base: 420, label: '크림치즈 냉장고' },
  fridge: { type: 'hire', staff: 'fridge', x: 480, z: -960, room: 'cream', base: 760, label: '음료·크림치즈 직원 뽑기' },
  espresso: { type: 'espresso', x: 920, z: -660, room: 'cafe', base: 340, label: '커피 머신' },
  baker: { type: 'hire', staff: 'baker', x: 0, z: -200, room: 'shop', base: 300, label: '진열 직원 뽑기' },
  t2: { type: 'table', x: -450, z: -260, room: 'hall', base: 200 },
  t3: { type: 'table', x: -450, z: 30, room: 'hall', base: 560 },
  t4: { type: 'table', x: -450, z: 320, room: 'hall', base: 900 },
  cleaner: { type: 'hire', staff: 'cleaner', x: -170, z: -40, room: 'shop', base: 1100, label: '청소 직원 뽑기' },
  drive: { type: 'drive', x: 1110, z: 700, px: 900, pz: 600, room: '*feature', base: 1600, label: '창구' },
  driver: { type: 'hire', staff: 'driver', x: 1000, z: 960, room: '*feature', base: 1400, label: '창구 직원 뽑기' },
  rider: { type: 'rider', x: 760, z: 960, px: 760, pz: 900, room: 'drive', base: 1500, label: '라이더 대기석' },
  u1: { type: 'table', x: -900, z: 640, room: 'up2', base: 1000, label: '2층 테이블' },
  u2: { type: 'table', x: -900, z: 920, room: 'up2', base: 1400, label: '2층 창가석' },
  server: { type: 'hire', staff: 'server', x: -650, z: 940, room: 'up2', base: 1300, label: '2층 서빙 직원 뽑기' },
  p1: { type: 'table', look: 'picnic', x: -900, z: 660, room: 'terrace', base: 1000, label: '숲 테라스 테이블' },
  p2: { type: 'table', look: 'picnic', x: -560, z: 900, room: 'terrace', base: 1400, label: '테라스 피크닉석' },
  next: { type: 'next', x: -820, z: 60, room: 'boss', base: 3500, label: '다음 지점 계약' },
};
/* 방 열기 비용(1호점 기준) · 공사 시간(초) — 지점마다 order 에서 덮어씀 */
const RB = { dough: 120, crew: 240, cream: 160, boss: 420, cafe: 340, hall: 220, store: 700, pickup: 1500, up2: 1500, drive: 1500, terrace: 1500 };

// ── 지점마다 여는 순서 (계획안 2-3) · [칸 id | 'R_방', 공사 초]
const ORDER = [
  ['t1', 'cashier', 'R_dough', 'dougher', ['R_crew', 30], 'R_cream', 'R_hall', 'baker', ['R_boss', 60], 'coffee', 'topper', 'R_cafe', 't3', 'fridge', 'kettle', 't4', 'cleaner', ['R_store', 120], ['R_pickup', 180], 'driver', 'next'],
  ['t1', 'cashier', 'R_dough', 'dougher', ['R_crew', 300], ['R_boss', 600], 'R_cream', 'topper', 'R_hall', 'baker', ['R_up2', 1800], 'server', 'coffee', 'R_cafe', 'fridge', 't3', 'kettle', ['R_store', 300], 'u2', 't4', 'cleaner', 'next'],
  ['t1', 'cashier', 'R_dough', 'dougher', ['R_crew', 1200], ['R_boss', 1800], 'R_cream', 'topper', 'baker', 'coffee', 'R_cafe', 'fridge', ['R_drive', 3600], 'driver', 'rider', ['R_store', 600], 'R_hall', 't3', 'kettle', 't4', 'cleaner', 'next'],
  ['t1', 'cashier', 'R_dough', 'dougher', ['R_crew', 1800], ['R_boss', 3600], ['R_terrace', 7200], ['retard', 14400], 'R_cream', 'topper', 'baker', 'coffee', 'R_cafe', 'fridge', ['R_store', 900], 'p2', 'R_hall', 't3', 'kettle', 't4', 'cleaner'],
];
export const FEATURE = ['pickup', 'up2', 'drive', 'terrace'];
/* 지점 배수 · 비용 늘림 (뒤로 갈수록 비싸게 ×1.2 → ×2.8 · 2호점부터 × 배수 × 1.6) */
export const MULT = [1, 4, 14, 45];
export const COST_K = [0.85, 2.16, 2.72, 2.72];   /* 2026-11-09 성장 곡선(tools/growth_sim.mjs): 무과금 15일 · 광고 10 9일 · VIP 6일 */

// ── 지점 인테리어 (계획안 2-2 · 실제 매장 공통 요소는 모든 지점 유지: 회색 벽 흰 로고 · 흰 세로 타일 진열대 · 테라조 받침 · 검은 칠판 가격표 · 주황 m 상자 선반 · 스테인리스 오븐)
export const INTERIOR = [
  { id: 'oak', name: '밝은 우드 카페', floor: 'plank', fa: '#EBCB9C', fb: '#DDB37E', line: '#C9975E', wall: 'plain', wallC: 0xF5EBDD, wallB: 0xF0E2CE, trim: 0xB07A44, light: 'pendant', props: 'oak', ext: 'awning', sky: '#F6EEE2', ground: 0xE7DCCB, hemi: [0xFFF4E2, 0xC9A882, 1.65], sun: 0xFFEFD6,
    note: '아파트 상가 아침 빵집 · 둥근 펜던트 등 · 몬스테라 · 라탄 의자' },
  { id: 'classic', name: '본점다운 클래식 베이커리', floor: 'check', fa: '#F3E7D6', fb: '#7A4A2A', line: '#5A3A22', wall: 'wainscot', wallC: 0x8E8C88, wallB: 0x86847F, wain: 0x5A3A22, trim: 0x3E2A1A, light: 'brass', props: 'classic', ext: 'stripe', sky: '#E7EDF2', ground: 0xDCD6CC, hemi: [0xFFF0DC, 0xB49A7A, 1.55], sun: 0xFFE7C8, lake: true, cherry: true,
    note: '월넛 웨인스코팅 · 황동 벽등 · 샹들리에 · 빵 바구니 선반' },
  { id: 'white', name: '모던 화이트', floor: 'bigtile', fa: '#F7F7F5', fb: '#E9EBEA', line: '#C4C9C8', wall: 'vtile', wallC: 0xFBFBFA, wallB: 0xF2F3F2, grout: 0xA8D8C8, trim: 0xC8CCCC, light: 'led', props: 'modern', ext: 'glass', sky: '#EEF1F3', ground: 0xD5D8DA, hemi: [0xF2F6FF, 0xB8BEC8, 1.75], sun: 0xF4F8FF,
    note: '흰 세로 타일 · 민트 줄눈 · 천장 LED 라인 · 테라조 진열대 · 네온 m' },
  { id: 'forest', name: '숲과 공원 테라스', floor: 'terracotta', fa: '#D9845C', fb: '#CB7650', line: '#B5623E', wall: 'louver', wallC: 0x9CB496, wallB: 0x93AC8D, wood: 0xB98A5A, trim: 0x7A5A3A, light: 'garland', props: 'forest', ext: 'wood', sky: '#E6EFDF', ground: 0xBFD9A8, hemi: [0xFFF6E2, 0x9AB08A, 1.6], sun: 0xFFF2D8, lawn: true,
    note: '원목 루버 · 세이지 그린 · 전구 줄조명 · 피크닉 테이블' },
];

// ── 지점 만들기
function branch(bi) {
  const ord = ORDER[bi], k = MULT[bi], ck = COST_K[bi], feat = FEATURE[bi];
  const ids = ord.map(e => Array.isArray(e) ? e[0] : e), build = Object.fromEntries(ord.filter(Array.isArray));
  const slots = [];
  for (const id of ['oven', 'counter', 'bin']) slots.push({ id, ...S[id] });
  const paid = ids.length; ids.forEach((id, i) => {
    const ramp = 1.2 + 1.6 * i / Math.max(1, paid - 1), cost = c => Math.round(c * ramp * k * ck / 10) * 10;
    if (id.startsWith('R_')) { const r = id.slice(2), R = ROOMS[r]; slots.push({ id, type: 'room', room: r, x: R.pad[0], z: R.pad[1], cost: cost(RB[r]), label: R.name, build: build[id] || 0 }); return; }
    const s = { id, ...S[id] }; if (s.room === '*feature') s.room = feat; s.cost = cost(s.base); if (build[id]) s.build = build[id];
    if (id === 'next') s.label = `${bi + 2}호점 계약`;
    if (id === 'driver') s.label = feat === 'pickup' ? '픽업 직원 뽑기' : '드라이브스루 직원 뽑기';
    if (id === 'drive') s.label = feat === 'pickup' ? '픽업 창구' : '드라이브스루 창구';
    slots.push(s); });
  /* 방을 열면 함께 놓이는 설비 (main) — order 에 없으면 방과 같이 열림 */
  for (const s of slots) if (s.type === 'room') { const m = ROOMS[s.room].main; if (m && !ids.includes(m)) slots.push({ id: m, ...S[m], room: S[m].room === '*feature' ? feat : S[m].room, withRoom: s.id, cost: 0, label: S[m].label }); }
  const rooms = ['shop', 'dough', 'cream', 'cafe', 'hall', 'crew', 'boss', 'store', feat];
  return { mult: k, slots, rooms, feature: feat, interior: INTERIOR[bi], door: DOOR, queue: [[0, 0], 110] };
}
export const LAYOUT = [0, 1, 2, 3].map(branch);
/* 방 rect 안인가 (여유 m) */
export const inRect = (r, x, z, m = 0) => x >= r[0] + m && x <= r[2] - m && z >= r[1] + m && z <= r[3] - m;
/* 공사 시간 표시 */
export const hms = s => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60; return h ? `${h}시간 ${m}분` : m ? `${m}분 ${String(ss).padStart(2, '0')}초` : `${ss}초`; };
/* 즉시 완성 골드 (남은 시간 비례 · 캠프 표와 같음: 30분 10 · 1시간 25 · 2시간 60 · 4시간 150 · 최소 1) → 서버 등급(SKU inst<N>) 중 가까운 아래 값 */
export const INST = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 100, 120, 150];
export function instGold(sec) { const P = [[0, 1], [1800, 10], [3600, 25], [7200, 60], [14400, 150]]; let g = 150;
  for (let i = 1; i < P.length; i++) if (sec <= P[i][0]) { const [a, ga] = P[i - 1], [b, gb] = P[i]; g = ga + (gb - ga) * (sec - a) / (b - a); break; }
  const v = Math.max(1, g); let t = 1; for (const x of INST) if (x <= v) t = x; return t; }
