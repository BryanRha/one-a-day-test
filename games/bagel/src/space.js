// ① 공간 모델 — 지점 = 데이터 하나 (설계 기준서 DESIGN.md 2~4장 · 시안 mock_src/layout1.mjs 를 cm 로 옮김)
//   좌표: 본관 북서 모서리 = (0, 0) · x 동쪽(+) · z 남쪽/앞(+) · 뒤 벽 z = 0 · 앞 벽(문) z = 1800 · 별채는 x < 0
//   코드 안에 손 좌표를 두지 않아요: 문 · 줄 · 나감 길 · 칸 · 돈 칸 · 직원 자리 · 장애물이 모두 여기서 나와요
export const HALL = { w: 1600, d: 1800 };
export const ANNEX = { x0: -600, x1: 0, z0: 0, z1: 1300 };
export const ANNEX_WALLS = [{ z: 500, gap: [-450, -330] }, { z: 1000, gap: [-450, -330] }];   /* 별채 방 사이 벽 (문 = 틈) */
export const R = { owner: 34, staff: 32, cust: 30 };   /* 사람 몸 반지름 (장애물 표 하나 · 모든 판정이 같이 씀) */

/* 시설 노드: 몸통 rect [x0, z0, x1, z1] · face 일하는 면 · pick 집는 받침 · up 강화 칸(110) · staff 직원 자리 · out 만드는 것 · from 받침으로 받는 앞 시설 */
const NODE_BASE = {
  mixer:  { name: '반죽기', model: 'mixer', rect: [160, 20, 360, 180], face: 'S', up: [90, 100], staff: [260, 270], pick: [355, 250], out: 'dough', next: 'kettle', note: 4 },   /* 0.4.3: 받는 곳(in) 시설 서쪽 앞 · 쌓이는 곳(pick) 동쪽 앞 — 한 방향 (DESIGN 3-0) */
  kettle: { name: '데치기 솥', model: 'kettle', rect: [500, 20, 700, 180], face: 'S', up: [430, 100], staff: [600, 290], in: [525, 250], pick: [670, 250], out: 'boiled', next: 'oven', note: 7 },
  oven:   { name: '오븐', model: 'oven', rect: [840, 20, 1040, 180], face: 'S', up: [770, 100], in: [870, 250], pick: [1010, 250], out: 'bagel', next: 'top', note: 0 },
  top:    { name: '작업대', model: 'ccbar', rect: [1180, 20, 1380, 180], face: 'S', up: [1110, 100], staff: [1280, 290], in: [1215, 240], pick: [1345, 240], out: 'cream', note: 12 },   /* in = 플레인을 내려놓는 곳(오븐 받침에서 275) · pick = 크림 베이글이 쌓이는 곳 */
  cream:  { name: '크림치즈 냉장고', model: 'coffee', rect: [1450, 260, 1600, 440], face: 'W', up: [1520, 100], staff: [1340, 480], pick: [1400, 350], out: 'coffee' },
  coffee: { name: '커피 머신', model: 'espresso', rect: [1475, 580, 1600, 780], face: 'W', up: [1535, 510], staff: [1340, 480], pick: [1418, 612], out: 'drink' },   /* 집는 받침은 계산대 쪽 끝 (커피 → 진열 ≤ 150) */
};
/* 계산대 (진열 4칸: 플레인 · 특별 · 크림치즈 · 커피) · 계산 자리 = 오븐 바로 앞 줄 x 940 */
const COUNTER = { rect: [840, 640, 1360, 760], till: [940, 575], head: [940, 850], cash: [1065, 545], shelf: { bagel: [1105, 700], cream: [1175, 700], coffee: [1245, 700], drink: [1315, 700] }, drop: [1215, 585], dropR: 95, fetch: [1320, 585] };   /* fetch: 창구 직원이 진열대에서 꺼내는 자리 (진열 직원과 안 겹침) */
const BIN = { rect: [700, 470, 770, 540], at: [735, 505] };
/* 손님 고리: 문 · 줄 · 나감 길 2개 (서쪽 x 800 · 동쪽 x 1040) — 줄(x 940)과 평행, 교차 0 */
const DOOR = { x0: 680, x1: 1100, z: 1800, inX: 940, outW: 820, outT: 740, outE: 1060, street: 2350 };   /* 나감 길: 포장 x 820 · 테이블 x 740 · 동쪽 x 1060 (들어옴 x 940 과 평행) */
const QUEUE = { x: 940, z0: 850, gap: 105, max: 9 };
const PASS = { x0: 680, x1: 840, z0: 640, z1: 760 };   /* 직원 통로 (반쪽 문 · 손님은 길을 안 냄) */
const PLANTERS = [[160, 670, 680, 730]];   /* 서쪽 끝 1.6m 는 직원 통로 (청소 직원이 서쪽 테이블을 벽 쪽에서 치움 · 손님 길과 안 겹침) */
const TABLES = [[580, 1030], [220, 1030], [580, 1300], [220, 1300], [580, 1570], [220, 1570]].map(([x, z], i) => ({ id: 't' + (i + 1), x, z }));   /* 원형 테이블 · 의자 동 · 서 · 테이블 사이 통로 ≥ 0.9m (줄 사이 1.3m · 열 사이 통로 1.1m · 벽 쪽 0.95m) */
export const PASS_MIN = 90;   /* 사장 · 직원이 지나갈 최소 통로 폭 (gate_space 가 잼) */   /* 원형 테이블 · 의자 북 · 남 (통로에서 의자 높이로 곧장 들어감) */
const AISLE = { x: 400, rowZ: 870, exitZ: 1765 };   /* 테이블 사이 통로 · 결제 뒤 걷는 줄 · 나가는 줄 */
const BAR = { id: 'bar', rect: [1440, 1340, 1580, 1760], seats: [[1390, 1400], [1390, 1500], [1390, 1600], [1390, 1700]], lane: 1180 };
/* 별채 (서쪽 벽 너머 · 문 하나) — 책상 앞에 0.3초 서면 카드 창 · 방 여는 칸은 방 문 앞 */
const ROOMS = {
  crew:  { name: '크루룸', rect: [-600, 0, 0, 500], desk: [-300, 220], door: [0, 300, 0, 440], pad: [70, 370], icon: '👥' },
  boss:  { name: '사장실', rect: [-600, 500, 0, 1000], desk: [-300, 740], door: [-450, 500, -330, 500], pad: [-390, 420], icon: '💼' },
  store: { name: '창고', rect: [-600, 1000, 0, 1300], desk: [-300, 1150], door: [-450, 1000, -330, 1000], pad: [-390, 920], icon: '📦' },
};
/* 창구 (1호점 픽업 · 3호점 드라이브): 동쪽 벽 · 안쪽은 화분 띠로 손님 홀과 나뉨 · 사장은 커피 머신 서쪽 틈(x 1380~1460)으로 들어감 */
/* 직원 대기 자리 · 카메라 앵커(계산대) · 테라스 돈 칸 — 코드 안 손 좌표 0 */
const SPOTS = { spawn: [640, 320], runner: [1010, 360], cleaner: [560, 580], cleaner2: [340, 2080], camAnchor: [960, 760], terraceCash: [320, 1690], pass: [760, 700], hallIn: [760, 900], doorSign: [590, 830], pcCenter: [520, 760], cross: [690, 790], balloon: [600, 560] };   /* 베이글 풍선 고정 자리 (화분 띠 위 · 일하는 길 밖) */
const WINDOW = { gate: [1418, 790], rect: [1540, 840, 1600, 1140], shelf: [1470, 990], staff: [1430, 990], cash: [1470, 900], outside: [1690, 990], up: [1520, 1220], fence: [[1300, 770, 1335, 1180]] };   /* 창구 안쪽은 서쪽만 화분 띠 (남쪽은 열어 둠 → 직원이 줄을 안 가로지르고 창가 바로) */

// 여는 순서 (1호점 기준 · DESIGN 5-2 표를 봇 실측으로 맞춤: 처음 10분은 일하는 길 4m 안 칸만 — 반죽기 · 데치기 강화는 10분 뒤) — [id, 종류, 값]
//   node 시설 · table · door(문 열기 간판) · room 별채 방 · hire 직원(크루룸 책상) · up 강화(시설 = 바닥 칸, walk/carry/ads = 사장실 책상) · zone 창가 바 · feat 지점 특색 · next 계약(사장실 책상)
const ORDER_BASE = [
  ['mixer', 'node', 30], ['oven', 'node', 50], ['counter', 'node', 100], ['door', 'door', 25], ['t1', 'table', 5],
  ['t2', 'table', 30], ['oven+1', 'up', 40], ['kettle', 'node', 120],   /* 0.4.3: 시작 돈 205 = 반죽기 · 오븐 · 계산대 · 문 → 첫 테이블(5)은 첫 판매 뒤 · 처음 30초는 나르기 */
  ['crew', 'room', 60], ['cashier', 'hire', 0], ['top', 'node', 200], ['boss', 'room', 100], ['walk+1', 'up', 80],
  ['t3', 'table', 140], ['oven+2', 'up', 200], ['t4', 'table', 300], ['carry+1', 'up', 260], ['top+1', 'up', 320],
  ['baker', 'hire', 420], ['runner', 'hire', 260], ['kettle+1', 'up', 160], ['cream', 'node', 700], ['topper', 'hire', 520],
  ['mixer+1', 'up', 450], ['t5', 'table', 600], ['coffee', 'node', 1100], ['barista', 'hire', 800], ['walk+2', 'up', 500],
  ['bar', 'zone', 900], ['oven+3', 'up', 700], ['store', 'room', 900], ['cream+1', 'up', 750], ['t6', 'table', 1100],
  ['cleaner', 'hire', 1000], ['coffee+1', 'up', 1000], ['ads+1', 'up', 900], ['carry+2', 'up', 1100], ['mixer+2', 'up', 1200],
  ['top+2', 'up', 1300], ['kettle+2', 'up', 1400], ['FEAT', 'feat', 2200], ['FEATSTAFF', 'hire', 1400], ['oven+4', 'up', 1600],
  ['cream+2', 'up', 1700], ['walk+3', 'up', 1800], ['ads+2', 'up', 1900], ['coffee+2', 'up', 2000], ['carry+3', 'up', 2200], ['next', 'next', 3600],
];
/* 지점 특색 (DESIGN 4-3) · build = 공사 초 (EXPANSION_PLAN 2-3) */
export const FEATURES = {
  pickup: { name: '픽업 창구', staff: 'picker', staffName: '창구 직원', build: 0, icon: '🛍' },
  up2:    { name: '2층 홀', staff: 'server', staffName: '2층 서빙 직원', build: 1800, icon: '🪜' },
  drive:  { name: '드라이브스루', staff: 'driver', staffName: '드라이브 직원', build: 3600, icon: '🚗' },
  terrace:{ name: '숲 테라스', staff: 'cleaner2', staffName: '테라스 직원', build: 7200, icon: '🌲', extra: { id: 'retard', name: '저온 숙성고', cost: 2600, build: 14400 } },
};
export const MULT = [1, 4, 14, 45];
const FEAT_OF = ['pickup', 'up2', 'drive', 'terrace'];

function branch(i) {
  const feat = FEAT_OF[i], F = FEATURES[feat], m = MULT[i];
  const nodes = JSON.parse(JSON.stringify(NODE_BASE)), rooms = JSON.parse(JSON.stringify(ROOMS));
  const sp = { i, feat, F, mult: m, spots: { ...SPOTS }, hall: HALL, annex: ANNEX, nodes, counter: COUNTER, bin: BIN, door: DOOR, queue: QUEUE, pass: PASS, planters: PLANTERS.map(r => [...r]), tables: TABLES.map(t => ({ ...t })), aisle: AISLE, bar: BAR, rooms, window: null, upper: null, terrace: null, walls: [] };
  if (feat === 'pickup' || feat === 'drive') { sp.window = { ...WINDOW, kind: feat === 'pickup' ? 'walk' : 'car' }; sp.planters.push(...WINDOW.fence); }
  if (feat === 'up2') { sp.upper = { stairs: [10, 1140, 140, 1760], y: 300, deck: [-600, 1320, 0, 1800], tables: [[-490, 1560], [-315, 1560], [-140, 1560]].map(([x, z], k) => ({ id: 'u' + (k + 1), x, z, y: 300 })), cash: [300, 1180], staff: [-300, 1780], serveZ: 1780, walkN: 1395, walkS: 1720, up: 40, down: 110, upZ: 1690, outX: -575 };   /* 2층 길: 안 계단으로 오름(x 0.4 → z 16.9 → x −0.2) · 의자 줄(북 13.95 · 남 17.2) · 나갈 때는 데크 서쪽 끝(x −5.75) 바깥 계단 */
    for (const t of sp.tables) t.x = t.x < 300 ? 280 : 640; sp.aisle = { ...AISLE, x: 460 }; sp.door = { ...DOOR, outW: DOOR.outE };   /* 2호점: 동쪽 테이블 일 자리로 가는 직원 길(x 810)이 포장 나감 줄(x 820)과 겹쳐 → 포장 손님은 동쪽 나감 길(x 1060)로 (U3) */ sp.spots.cross = [700, 860]; }   /* 2호점: 동쪽 열이 바깥으로 붙어 횡단보도를 그 열 바깥 통로까지 넓힘 */   /* 2호점: 서쪽 벽 계단 자리만큼 테이블 열을 동쪽으로 · 통로 x 4.6 */
  if (feat === 'terrace') { sp.terrace = { deck: [40, 1840, 640, 2160], door: [200, 440], tables: [[150, 1990], [480, 1990]].map(([x, z], k) => ({ id: 'p' + (k + 1), x, z, picnic: true })), up: [700, 1990] };
    nodes.mixer.up = [260, 570];   /* 4호점: 숙성고가 서쪽 벽 앞을 막아 반죽기 강화 칸은 숙성고 남동쪽 (사슬 구간 · 벽 쪽 틈 대신) */
    nodes.retard = { name: '저온 숙성고', model: 'retard', rect: [20, 220, 180, 460], face: 'E', up: [100, 560], in: [240, 420], pick: [240, 300], out: 'aged', next: 'kettle', note: 2 };   /* 반죽 1 → 숙성 반죽 2 */
    /* 4호점: 숙성고가 서쪽 벽 앞 → 별채 문을 z 540~660 으로 · 문이 닿는 가운데 방이 크루룸(사장실은 북쪽 · 창고는 남쪽, 둘 다 크루룸에서) */
    Object.assign(rooms.crew, { rect: [-600, 500, 0, 1000], desk: [-300, 740], door: [0, 540, 0, 660], pad: [80, 600] }); Object.assign(rooms.boss, { rect: [-600, 0, 0, 500], desk: [-300, 220], pad: [-390, 580] }); rooms.store.pad = [-390, 920]; sp.planters[0][0] = 160; }
  // 열 순서: 특색 자리 바꾸기 · 값 × 지점 배수
  const order = [];
  for (const [id, k, c] of ORDER_BASE) {
    if (id === 'FEAT') { order.push({ id: feat, kind: 'feat', cost: c * m, build: F.build }); if (F.extra) order.push({ id: F.extra.id, kind: 'node', cost: F.extra.cost * m, build: F.extra.build }); continue; }
    if (id === 'FEATSTAFF') { order.push({ id: F.staff, kind: 'hire', cost: c * m }); continue; }
    order.push({ id, kind: k, cost: Math.round(c * m) });
  }
  if (i === 3) order.splice(order.findIndex(o => o.kind === 'next'), 1);   /* 4호점 다음은 「다음 동네 · 준비 중」(지도) — 계약 칸 없음 */
  sp.order = order;
  sp.obstacles = obstacles(sp);
  return sp;
}
/* 장애물 표 (하나): 사장 · 직원 · 봇이 같은 표 → 같은 격자로 길을 찾아요. open(id) = 열린 시설만 몸통이 생김 */
function obstacles(sp) {
  const o = [];   /* { id, rect | circle, need } — need: 이 칸이 열려야 생기는 장애물 */
  const W = 30, H = sp.hall;
  o.push({ id: 'wN', rect: [-W, -W, H.w + W, 0] }, { id: 'wE', rect: [H.w, -W, H.w + W, H.d + W] });
  o.push({ id: 'wS1', rect: [-W, H.d, sp.door.x0, H.d + W] }, { id: 'wS2', rect: [sp.door.x1, H.d, H.w + W, H.d + W] });
  const cd = sp.rooms.crew.door;
  o.push({ id: 'wW1', rect: [-W, 0, 0, cd[1]] }, { id: 'wW2', rect: [-W, cd[3], 0, H.d] });
  if (sp.terrace) { const d = sp.terrace.door; o.splice(o.findIndex(x => x.id === 'wS1'), 1, { id: 'wS1a', rect: [-W, H.d, d[0], H.d + W] }, { id: 'wS1b', rect: [d[1], H.d, sp.door.x0, H.d + W] }); }
  // 별채 바깥벽 · 방 사이 벽 (문만 뚫림)
  const A = sp.annex; o.push({ id: 'aN', rect: [A.x0 - W, -W, 0, 0] }, { id: 'aW', rect: [A.x0 - W, 0, A.x0, A.z1] }, { id: 'aS', rect: [A.x0 - W, A.z1, 0, A.z1 + W] });
  for (const w of ANNEX_WALLS) o.push({ id: 'aw' + w.z + 'a', rect: [A.x0, w.z - 15, w.gap[0], w.z + 15] }, { id: 'aw' + w.z + 'b', rect: [w.gap[1], w.z - 15, 0, w.z + 15] });
  for (const [k, r] of Object.entries(sp.rooms)) o.push({ id: 'lock_' + k, rect: r.rect, lockedRoom: k }, { id: 'desk_' + k, rect: [r.desk[0] - 80, r.desk[1] - 120, r.desk[0] + 80, r.desk[1] - 40], need: k });
  for (const [k, n] of Object.entries(sp.nodes)) o.push({ id: k, rect: n.rect, need: k });
  o.push({ id: 'counter', rect: sp.counter.rect, need: 'counter' }, { id: 'bin', rect: sp.bin.rect });
  for (const p of sp.planters) o.push({ id: 'planter', rect: p });
  for (const t of sp.tables) o.push({ id: t.id, circle: [t.x, t.z, 70], need: t.id }, { id: t.id + 'c', rect: [t.x - 125, t.z - 30, t.x + 125, t.z + 30], need: t.id });
  o.push({ id: 'bar', rect: sp.bar.rect, need: 'bar' });
  if (sp.window) o.push({ id: 'win', rect: sp.window.rect, need: sp.feat });
  if (sp.upper) o.push({ id: 'stairs', rect: sp.upper.stairs, need: 'up2' });
  /* 줄 띠: 길 찾기에서만 막음 (사장 · 직원 · 봇이 줄을 가로질러 다니지 않게 둘러 감) · 몸은 지나갈 수 있음 */
  o.push({ id: 'queueLane', rect: [sp.queue.x - 45, sp.queue.z0 - 50, sp.queue.x + 45, sp.hall.d], pathOnly: true });
  /* 직원 통로: 손님이 결제 뒤 걷는 줄(z rowZ)은 직원 길 찾기에서 막고, 횡단보도 한 곳(직원 통로 바로 아래)으로만 건넘 — 건널 때는 손님이 비켜 갈 때까지 기다림 */
  const rz = sp.aisle.rowZ, cw = sp.spots.cross;
  o.push({ id: 'rowBand1', rect: [sp.aisle.x - 60, rz - 55, cw[0], rz + 60], pathOnly: true, staffOnly: true }, { id: 'rowBand2', rect: [cw[1], rz - 55, sp.queue.x - 45, rz + 60], pathOnly: true, staffOnly: true });
  sp.crossings = [{ id: 'row', rect: [cw[0], rz - 60, cw[1], rz + 65] }, { id: 'west', rect: [0, rz - 60, sp.planters[0][0] + 10, rz + 65] }];   /* 교차점 = 손님 걷는 줄 × 직원 횡단보도 (가운데 · 서쪽 직원 통로) */
  return o;
}
export const SPACES = [0, 1, 2, 3].map(branch);
/* 지점 전환 경제 (DESIGN 5-4): 계약하면 다음 지점 「개업 자금」= 그 지점 처음 세 칸 값 합 — 들어가자마자 2분 안에 첫 판매 */
/* 수입을 여는 칸 (2026-11-12 테스터 제보 막힘): 손님은 문 · 계산대 · 오븐이 있어야 오고(cust.js) 오븐에 넣을 반죽은 반죽기 — 이 넷을 다 사기 전엔 그 지점 수입이 0
   개업 자금 = 이 넷의 값 합 · 다 사기 전에는 이 넷의 남은 값만큼은 다른 데 못 씀(pads.js spendable) · 이미 막힌 저장은 불러올 때 채움(pads.js rescue) */
export const INCOME_NEED = ['mixer', 'oven', 'counter', 'door'];
export const openingFund = i => SPACES[i] ? SPACES[i].order.filter(o => INCOME_NEED.includes(o.id)).reduce((a, o) => a + o.cost, 0) : 0;

/* 손님 길 (정해진 고리 위 · 길 찾기 없음): 줄 칸 · 자리까지 · 나가기 */
export function queueSlot(sp, k) { return [sp.queue.x, sp.queue.z0 + k * sp.queue.gap]; }
export function entryPath(sp, k) { return [[sp.door.inX, sp.door.street], [sp.door.inX, sp.hall.d + 60], queueSlot(sp, k)]; }
/* 자리: 테이블 의자 · 창가 바 · 2층 · 테라스 — 결제 자리(head)에서 출발 */
export function seatsOf(sp, open) {
  const s = [];
  for (const t of sp.tables) if (open(t.id)) for (const d of [-1, 1]) s.push({ id: `${t.id}${d < 0 ? 'w' : 'e'}`, table: t.id, at: [t.x + d * 95, t.z], face: [t.x, t.z], tx: t.x, tz: t.z, side: d });
  if (open('bar')) sp.bar.seats.forEach((p, k) => s.push({ id: 'bar' + k, table: 'bar', at: p, face: [p[0] + 100, p[1]], tx: p[0] + 70, tz: p[1], side: 1, bar: true }));
  if (sp.upper && open('up2')) for (const t of sp.upper.tables) for (const d of [-1, 1]) s.push({ id: `${t.id}${d < 0 ? 'n' : 's'}`, table: t.id, at: [t.x, t.z + d * 95], face: [t.x, t.z], tx: t.x, tz: t.z, side: d, up: true });
  if (sp.terrace && open('terrace')) for (const t of sp.terrace.tables) for (const d of [-1, 1]) s.push({ id: `${t.id}${d < 0 ? 'n' : 's'}`, table: t.id, at: [t.x, t.z + d * 85], face: [t.x, t.z], tx: t.x, tz: t.z, side: d, out: true });
  return s;
}
export function seatPath(sp, seat) {
  const [hx, hz] = sp.counter.head, z = sp.aisle.rowZ;
  if (seat.bar) return [[hx + 120, z], [sp.bar.lane, z], [sp.bar.lane, seat.at[1]], seat.at];
  if (seat.up) { const U = sp.upper, st = U.stairs, Y = U.y, wz = seat.side < 0 ? U.walkN : U.walkS; return [[hx - 140, z], [U.up, z], [U.up, st[1] + 40, 0], [U.up, U.upZ, Y], [-20, U.upZ, Y], [-20, wz, Y], [seat.at[0], wz, Y], [seat.at[0], seat.at[1], Y]]; }   /* 계단 오르는 줄 · 2층은 의자 쪽 걷는 줄(북 · 남)로 */
  if (seat.out) { const d = sp.terrace.door, dx = (d[0] + d[1]) / 2, T = sp.terrace.deck, n = sp.hall.d + 35, ex = T[2] + 60; const wx = 40, start = [[hx - 140, z], [wx, z], [wx, sp.aisle.exitZ], [dx, sp.aisle.exitZ], [dx, n]];   /* 테라스 손님은 서쪽 벽을 따라 (통로 · 나가는 줄과 안 섞임) */
    return seat.side < 0 ? [...start, [seat.at[0], n], seat.at] : [...start, [ex, n], [ex, T[3] + 10], [seat.at[0], T[3] + 10], seat.at]; }   /* 테라스: 북쪽 의자는 위에서 · 남쪽 의자는 데크를 돌아 아래에서 (앉은 사람 앞을 안 지남) */
  /* 테이블: 통로 → 의자 높이에서 옆으로 곧장 (앉은 사람 앞을 안 지남) */
  /* 통로 쪽 의자는 테이블 높이에서 곧장 · 먼 쪽 의자는 테이블 남쪽 틈(줄 사이)으로 돌아 들어감 (앉은 사람 앞을 안 지남) */
  const near = (seat.tx < sp.aisle.x) === (seat.side > 0), gz = seat.tz + 135;
  return near ? [[hx - 140, z], [sp.aisle.x, z], [sp.aisle.x, seat.tz], seat.at] : [[hx - 140, z], [sp.aisle.x, z], [sp.aisle.x, gz], [seat.at[0], gz], seat.at];
}
export function exitPath(sp, from) {   /* 자리 또는 결제 자리에서 → 나감 길 → 문 → 거리 */
  const D = sp.door, ez = sp.aisle.exitZ;
  if (!from) return [[D.outW, sp.aisle.rowZ], [D.outW, D.z + 60], [D.outW, D.street]];   /* 포장 */
  if (from.bar) return [[sp.bar.lane, from.at[1]], [sp.bar.lane, ez], [D.outE, ez], [D.outE, D.z + 60], [D.outE, D.street]];
  if (from.up) { const U = sp.upper, Y = U.y, wz = from.side < 0 ? U.walkN : U.walkS, ox = U.outX; return [[from.at[0], wz, Y], [ox, wz, Y], [ox, U.deck[3] - 10, Y], [ox, U.deck[3] + 300, 0], [ox, D.street]]; }   /* 2층 손님은 데크 서쪽 끝 바깥 계단으로 나감 (홀 · 계단을 거꾸로 안 지남) */
  if (from.out) { const T = sp.terrace.deck, ex = T[2] + 60; return from.side < 0 ? [[from.at[0], D.z + 35], [ex, D.z + 35], [ex, D.street]] : [[from.at[0], T[3] + 10], [ex, T[3] + 10], [ex, D.street]]; }
  const near = (from.tx < sp.aisle.x) === (from.side > 0), gz = from.tz + 135; return [...(near ? [[sp.aisle.x, from.tz]] : [[from.at[0], gz], [sp.aisle.x, gz]]), [sp.aisle.x, ez], [D.outT, ez], [D.outT, D.z + 60], [D.outT, D.street]];
}
/* 사슬 구간 (DESIGN 3-0): [쌓이는 곳, 받는 곳] — 반죽기 → 솥 · 오븐 · 숙성고 / 숙성고 → 솥 · 오븐 / 솥 → 오븐 / 오븐 → 작업대 (CHAIN 과 같은 짝 · Q1b 시험이 잼) */
export const CHAIN_LEGS = [['mixer', 'kettle'], ['mixer', 'oven'], ['mixer', 'retard'], ['retard', 'kettle'], ['retard', 'oven'], ['kettle', 'oven'], ['oven', 'top']];
export const SKIP_LEGS = ['mixer>oven', 'retard>oven'];   /* 사이 시설(솥)을 건너뛰는 구간 — 솥이 생기기 전 처음 2분만 (Q1b 는 따로 ≤ 500) */
export function chainLegs(sp, open) { return CHAIN_LEGS.filter(([a, b]) => open(a) && open(b) && sp.nodes[a]?.pick && sp.nodes[b]?.in).map(([a, b]) => [sp.nodes[a].pick, sp.nodes[b].in, a, b]); }
/* 사장 일하는 길 (집는 받침 → 진열 → 돈 칸) — Q3(바닥 칸이 이 길 위에 없음) 시험이 씀 */
export function workRoute(sp, open) {
  const P = [];
  for (const k of ['oven', 'top', 'cream', 'coffee']) if (open(k) && sp.nodes[k].pick) P.push(sp.nodes[k].pick);
  const legs = []; for (const p of P) legs.push([p, sp.counter.drop], [sp.counter.drop, sp.counter.cash], [sp.counter.cash, P[0]]);
  /* 사슬 구간 (0.4.3): 앞 시설 쌓이는 곳 → 다음 시설 받는 곳 (반죽은 솥을 건너 오븐으로도) */
  for (const [a, b] of chainLegs(sp, open)) legs.push([a, b]);
  if (open('counter')) legs.push([sp.counter.till, sp.counter.cash]);
  if (sp.window && open(sp.feat)) legs.push([sp.counter.drop, sp.window.gate], [sp.window.gate, sp.window.shelf]);
  /* 빈손 일: 쓰레기통 ↔ 직원 통로 ↔ 열린 테이블 (청소 직원이 오기 전엔 사장이 치움) */
  if (open('counter')) { legs.push([sp.bin.at, SPOTS.pass], [SPOTS.pass, SPOTS.hallIn]); for (const t of sp.tables) if (open(t.id)) legs.push([SPOTS.hallIn, [t.x, t.z]]); }
  return legs;
}
/* 일하는 자리 (DESIGN 12장 Q4 정의): 사장이 실제로 가서 서는 곳 — 받침 집는 자리 · 진열 · 계산 자리 · 돈 칸(계산대 · 열린 테이블 · 창구) · 쓰레기통 · 열린 테이블 치우는 자리 · 열린 별채 책상 · 방금 산 칸 자리 */
/* 테이블 바깥쪽 일 자리 (돈 칸 · 치우는 자리): 서쪽 열은 서쪽 벽 쪽 · 동쪽 열은 동쪽 — 손님 통로 반대쪽 · 2호점 서쪽 열(계단 옆)은 남쪽 틈 */
export function tableSide(sp, t) { const west = t.x < sp.aisle.x; if (west) return [t.x, t.z + 135]; return [t.x + 175, t.z]; }   /* 서쪽 열 = 테이블 남쪽 틈 (벽과 서쪽 의자 사이 0.95m 는 직원 몸 한 칸뿐이라 갇힘 — 0.4.3 K6) · 동쪽 열 = 바깥쪽 */
export function workSpots(sp, open, prev) {
  const P = []; for (const [k, n] of Object.entries(sp.nodes)) if (open(k)) { if (n.pick) P.push(n.pick); if (n.in) P.push(n.in); }   /* 쌓이는 곳 · 받는 곳 (0.4.3) */
  if (open('counter')) P.push(sp.counter.drop, sp.counter.till, sp.counter.cash, sp.bin.at);
  for (const t of sp.tables) if (open(t.id)) P.push(tableSide(sp, t));
  if (sp.window && open(sp.feat)) P.push(sp.window.shelf, sp.window.cash);
  for (const [k, r] of Object.entries(sp.rooms)) if (open(k)) P.push(r.desk);
  if (prev) P.push(prev); return P;
}
/* 바닥 칸 자리: 새 시설 = 몸통 자리 · 강화 = up · 테이블 = 테이블 자리 · 방 = 방 문 앞 · 문 = OPEN 간판 */
export function padSpot(sp, o) {
  const id = o.id.split('+')[0];
  if (o.kind === 'up') { const n = sp.nodes[id]; return n ? { at: n.up, size: [110, 110] } : null; }
  if (o.kind === 'node') { const n = id === 'counter' ? sp.counter : sp.nodes[id]; const r = n.rect; return { at: [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2], size: [r[2] - r[0], r[3] - r[1]] }; }
  if (o.kind === 'table') { const t = sp.tables.find(t => t.id === id); return t ? { at: [t.x, t.z], size: [150, 150] } : null; }
  if (o.kind === 'door') return { at: SPOTS.doorSign, size: [120, 120] };
  if (o.kind === 'room') return { at: sp.rooms[id].pad, size: [110, 110] };
  if (o.kind === 'zone') { const r = sp.bar.rect; return { at: [(r[0] + r[2]) / 2 - 40, (r[1] + r[3]) / 2], size: [200, 420] }; }
  if (o.kind === 'feat') { if (sp.window) { const r = sp.window.rect; return { at: [r[0] - 40, (r[1] + r[3]) / 2], size: [140, 300] }; }
    if (sp.upper) { const s = sp.upper.stairs; return { at: [(s[0] + s[2]) / 2, (s[1] + s[3]) / 2], size: [s[2] - s[0], s[3] - s[1]] }; }
    if (sp.terrace) return { at: [(sp.terrace.door[0] + sp.terrace.door[1]) / 2, 1745], size: [200, 80] }; }
  return null;
}
export const ROOM_INFO = ROOMS;
