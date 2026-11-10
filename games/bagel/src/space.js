// ① 공간 모델 — 지점 = 데이터 하나 (설계 기준서 DESIGN.md 2~4장 · 시안 mock_src/layout1.mjs 를 cm 로 옮김)
//   좌표: 본관 북서 모서리 = (0, 0) · x 동쪽(+) · z 남쪽/앞(+) · 뒤 벽 z = 0 · 앞 벽(문) z = 1800 · 별채는 x < 0
//   코드 안에 손 좌표를 두지 않아요: 문 · 줄 · 나감 길 · 칸 · 돈 칸 · 직원 자리 · 장애물이 모두 여기서 나와요
export const HALL = { w: 1600, d: 1800 };
export const ANNEX = { x0: -600, x1: 0, z0: 0, z1: 1300 };
export const ANNEX_WALLS = [{ z: 500, gap: [-450, -330] }, { z: 1000, gap: [-450, -330] }];   /* 별채 방 사이 벽 (문 = 틈) */
export const R = { owner: 34, staff: 32, cust: 30 };   /* 사람 몸 반지름 (장애물 표 하나 · 모든 판정이 같이 씀) */

/* 시설 노드: 몸통 rect [x0, z0, x1, z1] · face 일하는 면 · pick 집는 받침 · up 강화 칸(110) · staff 직원 자리 · out 만드는 것 · from 받침으로 받는 앞 시설 */
const NODE_BASE = {
  mixer:  { name: '반죽기', model: 'mixer', rect: [160, 20, 360, 180], face: 'S', up: [90, 100], staff: [260, 270], out: 'dough', next: 'kettle', note: 4 },
  kettle: { name: '데치기 솥', model: 'kettle', rect: [500, 20, 700, 180], face: 'S', up: [430, 100], staff: [600, 270], out: 'boiled', next: 'oven', note: 7 },
  oven:   { name: '오븐', model: 'oven', rect: [840, 20, 1040, 180], face: 'S', up: [770, 100], pick: [940, 235], out: 'bagel', next: 'top', note: 0 },
  top:    { name: '작업대', model: 'ccbar', rect: [1180, 20, 1380, 180], face: 'S', up: [1110, 100], staff: [1280, 290], pick: [1280, 235], out: 'cream', note: 12 },
  cream:  { name: '크림치즈 냉장고', model: 'coffee', rect: [1450, 260, 1600, 440], face: 'W', up: [1520, 100], staff: [1340, 480], pick: [1400, 350], out: 'coffee' },
  coffee: { name: '커피 머신', model: 'espresso', rect: [1475, 580, 1600, 780], face: 'W', up: [1535, 510], staff: [1340, 480], pick: [1418, 680], out: 'drink' },
};
/* 계산대 (진열 4칸: 플레인 · 특별 · 크림치즈 · 커피) · 계산 자리 = 오븐 바로 앞 줄 x 940 */
const COUNTER = { rect: [840, 640, 1360, 760], till: [940, 575], head: [940, 850], cash: [1065, 545], shelf: { bagel: [1105, 700], cream: [1175, 700], coffee: [1245, 700], drink: [1315, 700] }, drop: [1215, 585], dropR: 95 };
const BIN = { rect: [700, 470, 770, 540], at: [735, 505] };
/* 손님 고리: 문 · 줄 · 나감 길 2개 (서쪽 x 800 · 동쪽 x 1040) — 줄(x 940)과 평행, 교차 0 */
const DOOR = { x0: 680, x1: 1100, z: 1800, inX: 940, outW: 820, outT: 740, outE: 1060, street: 2350 };   /* 나감 길: 포장 x 820 · 테이블 x 740 · 동쪽 x 1060 (들어옴 x 940 과 평행) */
const QUEUE = { x: 940, z0: 850, gap: 105, max: 9 };
const PASS = { x0: 680, x1: 840, z0: 640, z1: 760 };   /* 직원 통로 (반쪽 문 · 손님은 길을 안 냄) */
const PLANTERS = [[30, 670, 680, 730]];
const TABLES = [[540, 1060], [220, 1060], [540, 1330], [220, 1330], [540, 1600], [220, 1600]].map(([x, z], i) => ({ id: 't' + (i + 1), x, z }));   /* 원형 테이블 · 의자 북 · 남 (통로에서 의자 높이로 곧장 들어감) */
const AISLE = { x: 380, rowZ: 870, exitZ: 1765 };   /* 테이블 사이 통로 · 결제 뒤 걷는 줄 · 나가는 줄 */
const BAR = { id: 'bar', rect: [1440, 1340, 1580, 1760], seats: [[1390, 1400], [1390, 1500], [1390, 1600], [1390, 1700]], lane: 1180 };
/* 별채 (서쪽 벽 너머 · 문 하나) — 책상 앞에 0.3초 서면 카드 창 · 방 여는 칸은 방 문 앞 */
const ROOMS = {
  crew:  { name: '크루룸', rect: [-600, 0, 0, 500], desk: [-300, 220], door: [0, 300, 0, 440], pad: [70, 370], icon: '👥' },
  boss:  { name: '사장실', rect: [-600, 500, 0, 1000], desk: [-300, 740], door: [-450, 500, -330, 500], pad: [-390, 420], icon: '💼' },
  store: { name: '창고', rect: [-600, 1000, 0, 1300], desk: [-300, 1150], door: [-450, 1000, -330, 1000], pad: [-390, 920], icon: '📦' },
};
/* 창구 (1호점 픽업 · 3호점 드라이브): 동쪽 벽 · 안쪽은 화분 띠로 손님 홀과 나뉨 · 사장은 커피 머신 서쪽 틈(x 1380~1460)으로 들어감 */
/* 직원 대기 자리 · 카메라 앵커(계산대) · 테라스 돈 칸 — 코드 안 손 좌표 0 */
const SPOTS = { runner: [1010, 360], cleaner: [560, 580], cleaner2: [340, 2080], camAnchor: [960, 760], terraceCash: [320, 1690], pass: [760, 700], hallIn: [760, 900], doorSign: [590, 830], pcCenter: [520, 760] };
const WINDOW = { gate: [1418, 790], rect: [1540, 840, 1600, 1140], shelf: [1470, 990], staff: [1430, 990], cash: [1470, 900], outside: [1690, 990], up: [1520, 1220], fence: [[1300, 770, 1335, 1180]] };   /* 창구 안쪽은 서쪽만 화분 띠 (남쪽은 열어 둠 → 직원이 줄을 안 가로지르고 창가 바로) */

// 여는 순서 (1호점 기준 · DESIGN 5-2 표를 봇 실측으로 맞춤: 처음 10분은 일하는 길 4m 안 칸만 — 반죽기 · 데치기 강화는 10분 뒤) — [id, 종류, 값]
//   node 시설 · table · door(문 열기 간판) · room 별채 방 · hire 직원(크루룸 책상) · up 강화(시설 = 바닥 칸, walk/carry/ads = 사장실 책상) · zone 창가 바 · feat 지점 특색 · next 계약(사장실 책상)
const ORDER_BASE = [
  ['oven', 'node', 50], ['counter', 'node', 100], ['door', 'door', 25], ['t1', 'table', 5],
  ['t2', 'table', 30], ['oven+1', 'up', 40], ['kettle', 'node', 150],
  ['crew', 'room', 60], ['cashier', 'hire', 0], ['top', 'node', 280], ['boss', 'room', 100], ['walk+1', 'up', 80],
  ['t3', 'table', 140], ['oven+2', 'up', 200], ['t4', 'table', 300], ['carry+1', 'up', 260], ['top+1', 'up', 320],
  ['mixer', 'node', 420], ['runner', 'hire', 260], ['kettle+1', 'up', 160], ['cream', 'node', 700], ['topper', 'hire', 520],
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
  const sp = { i, feat, F, mult: m, spots: SPOTS, hall: HALL, annex: ANNEX, nodes, counter: COUNTER, bin: BIN, door: DOOR, queue: QUEUE, pass: PASS, planters: PLANTERS.map(r => [...r]), tables: TABLES.map(t => ({ ...t })), aisle: AISLE, bar: BAR, rooms, window: null, upper: null, terrace: null, walls: [] };
  if (feat === 'pickup' || feat === 'drive') { sp.window = { ...WINDOW, kind: feat === 'pickup' ? 'walk' : 'car' }; sp.planters.push(...WINDOW.fence); }
  if (feat === 'up2') { sp.upper = { stairs: [10, 1140, 140, 1760], y: 300, deck: [-600, 1320, 0, 1800], tables: [[-500, 1560], [-310, 1560], [-120, 1560]].map(([x, z], k) => ({ id: 'u' + (k + 1), x, z, y: 300 })), cash: [300, 1180], staff: [-585, 1335], walkN: 1395, walkS: 1740, up: 40, down: 110 };
    for (const t of sp.tables) t.x = t.x < 300 ? 260 : 580; sp.aisle = { ...AISLE, x: 420 }; }   /* 2호점: 서쪽 벽 계단 자리만큼 테이블 열을 동쪽으로 · 통로 x 420 */
  if (feat === 'terrace') { sp.terrace = { deck: [40, 1840, 640, 2160], door: [200, 440], tables: [[150, 1990], [480, 1990]].map(([x, z], k) => ({ id: 'p' + (k + 1), x, z, picnic: true })), up: [700, 1990] };
    nodes.retard = { name: '저온 숙성고', model: 'retard', rect: [20, 220, 180, 460], face: 'E', up: [250, 530], out: 'dough', next: 'mixer', note: 2 };
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
  for (const t of sp.tables) o.push({ id: t.id, circle: [t.x, t.z, 70], need: t.id }, { id: t.id + 'c', rect: [t.x - 30, t.z - 125, t.x + 30, t.z + 125], need: t.id });
  o.push({ id: 'bar', rect: sp.bar.rect, need: 'bar' });
  if (sp.window) o.push({ id: 'win', rect: sp.window.rect, need: sp.feat });
  if (sp.upper) o.push({ id: 'stairs', rect: sp.upper.stairs, need: 'up2' });
  /* 줄 띠: 길 찾기에서만 막음 (사장 · 직원 · 봇이 줄을 가로질러 다니지 않게 둘러 감) · 몸은 지나갈 수 있음 */
  o.push({ id: 'queueLane', rect: [sp.queue.x - 45, sp.queue.z0 - 50, sp.queue.x + 45, sp.hall.d], pathOnly: true });
  return o;
}
export const SPACES = [0, 1, 2, 3].map(branch);

/* 손님 길 (정해진 고리 위 · 길 찾기 없음): 줄 칸 · 자리까지 · 나가기 */
export function queueSlot(sp, k) { return [sp.queue.x, sp.queue.z0 + k * sp.queue.gap]; }
export function entryPath(sp, k) { return [[sp.door.inX, sp.door.street], [sp.door.inX, sp.hall.d + 60], queueSlot(sp, k)]; }
/* 자리: 테이블 의자 · 창가 바 · 2층 · 테라스 — 결제 자리(head)에서 출발 */
export function seatsOf(sp, open) {
  const s = [];
  for (const t of sp.tables) if (open(t.id)) for (const d of [-1, 1]) s.push({ id: `${t.id}${d < 0 ? 'n' : 's'}`, table: t.id, at: [t.x, t.z + d * 95], face: [t.x, t.z], tx: t.x, tz: t.z, side: d });
  if (open('bar')) sp.bar.seats.forEach((p, k) => s.push({ id: 'bar' + k, table: 'bar', at: p, face: [p[0] + 100, p[1]], tx: p[0] + 70, tz: p[1], side: 1, bar: true }));
  if (sp.upper && open('up2')) for (const t of sp.upper.tables) for (const d of [-1, 1]) s.push({ id: `${t.id}${d < 0 ? 'n' : 's'}`, table: t.id, at: [t.x, t.z + d * 95], face: [t.x, t.z], tx: t.x, tz: t.z, side: d, up: true });
  if (sp.terrace && open('terrace')) for (const t of sp.terrace.tables) for (const d of [-1, 1]) s.push({ id: `${t.id}${d < 0 ? 'n' : 's'}`, table: t.id, at: [t.x, t.z + d * 85], face: [t.x, t.z], tx: t.x, tz: t.z, side: d, out: true });
  return s;
}
export function seatPath(sp, seat) {
  const [hx, hz] = sp.counter.head, z = sp.aisle.rowZ;
  if (seat.bar) return [[hx + 120, z], [sp.bar.lane, z], [sp.bar.lane, seat.at[1]], seat.at];
  if (seat.up) { const U = sp.upper, st = U.stairs, Y = U.y, top = st[3] - 40, wz = seat.side < 0 ? U.walkN : U.walkS; return [[hx - 140, z], [U.up, z], [U.up, st[1] + 40, 0], [U.up, top, Y], [-20, top, Y], [-20, wz, Y], [seat.at[0], wz, Y], [seat.at[0], seat.at[1], Y]]; }   /* 계단 오르는 줄 · 2층은 의자 쪽 걷는 줄(북 · 남)로 */
  if (seat.out) { const d = sp.terrace.door, dx = (d[0] + d[1]) / 2, T = sp.terrace.deck, n = sp.hall.d + 35, ex = T[2] + 60; const start = [[hx - 140, z], [sp.aisle.x, z], [sp.aisle.x, sp.aisle.exitZ], [dx, sp.aisle.exitZ], [dx, n]];
    return seat.side < 0 ? [...start, [seat.at[0], n], seat.at] : [...start, [ex, n], [ex, T[3] + 10], [seat.at[0], T[3] + 10], seat.at]; }   /* 테라스: 북쪽 의자는 위에서 · 남쪽 의자는 데크를 돌아 아래에서 (앉은 사람 앞을 안 지남) */
  /* 테이블: 통로 → 의자 높이에서 옆으로 곧장 (앉은 사람 앞을 안 지남) */
  return [[hx - 140, z], [sp.aisle.x, z], [sp.aisle.x, seat.at[1]], seat.at];
}
export function exitPath(sp, from) {   /* 자리 또는 결제 자리에서 → 나감 길 → 문 → 거리 */
  const D = sp.door, ez = sp.aisle.exitZ;
  if (!from) return [[D.outW, sp.aisle.rowZ], [D.outW, D.z + 60], [D.outW, D.street]];   /* 포장 */
  if (from.bar) return [[sp.bar.lane, from.at[1]], [sp.bar.lane, ez], [D.outE, ez], [D.outE, D.z + 60], [D.outE, D.street]];
  if (from.up) { const U = sp.upper, st = U.stairs, Y = U.y, top = st[3] - 40, wz = from.side < 0 ? U.walkN : U.walkS; return [[from.at[0], wz, Y], [-20, wz, Y], [-20, top + 20, Y], [U.down, top + 20, Y], [U.down, st[1] + 40, 0], [U.down, 1100], [sp.aisle.x, 1100], [sp.aisle.x, ez], [D.outT, ez], [D.outT, D.z + 60], [D.outT, D.street]]; }
  if (from.out) { const T = sp.terrace.deck, ex = T[2] + 60; return from.side < 0 ? [[from.at[0], D.z + 35], [ex, D.z + 35], [ex, D.street]] : [[from.at[0], T[3] + 10], [ex, T[3] + 10], [ex, D.street]]; }
  return [[sp.aisle.x, from.at[1]], [sp.aisle.x, ez], [D.outT, ez], [D.outT, D.z + 60], [D.outT, D.street]];
}
/* 사장 일하는 길 (집는 받침 → 진열 → 돈 칸) — Q3(바닥 칸이 이 길 위에 없음) 시험이 씀 */
export function workRoute(sp, open) {
  const P = [];
  for (const k of ['oven', 'top', 'cream', 'coffee']) if (open(k) && sp.nodes[k].pick) P.push(sp.nodes[k].pick);
  const legs = []; for (const p of P) legs.push([p, sp.counter.drop], [sp.counter.drop, sp.counter.cash], [sp.counter.cash, P[0]]);
  if (open('counter')) legs.push([sp.counter.till, sp.counter.cash]);
  if (sp.window && open(sp.feat)) legs.push([sp.counter.drop, sp.window.gate], [sp.window.gate, sp.window.shelf]);
  /* 빈손 일: 쓰레기통 ↔ 직원 통로 ↔ 열린 테이블 (청소 직원이 오기 전엔 사장이 치움) */
  if (open('counter')) { legs.push([sp.bin.at, SPOTS.pass], [SPOTS.pass, SPOTS.hallIn]); for (const t of sp.tables) if (open(t.id)) legs.push([SPOTS.hallIn, [t.x, t.z]]); }
  return legs;
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
