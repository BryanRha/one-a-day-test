// 지도 꾸밈 계획 (three 없이 — node 시험 · 길 찾기 검사에서도 씀) — v0.5 레벨 아트
//  방마다: 주제 소품 1 (벽에 붙임) · 바닥 무늬 2~3종 · 벽 장식 1 (윗벽 그림 조각 · 옆벽 배관) / 구역마다: 랜드마크 1 (빈 칸 · 지도 밖 물 위)
//  ※ plan() 의 난수를 쓰지 않음(따로 seed) → 지도 · 상자 · 적 · 쓰러진 자리는 그대로. 소품은 문 · 상자 · 엄폐물 · 출구 · 발전기 · 등불 · 공기 방울과 떨어뜨림
//  판정: 주제 소품 일부만 작은 판정(solid) — 벽 쪽으로 붙여 길을 막지 않음 (tools/reach.mjs 가 같이 검사)
import { T, RT, RS, COLS, ROWS, zoneOfRow, mix32, rng, SOLID } from './plan.js?v=0.99.39';

/* 벽 [높이, 두께] — map.js STYLE 과 같은 값 (꾸밈 위치 계산용) */
const WALL = {
  ware: (z, low) => low ? [1.12, 1] : [4, 1],
  harbor: (z, low) => low ? [0.95, 0.2] : z === 2 ? [2.3, 2.0] : z === 1 ? [1.8, 0.22] : [2.4, 0.4],
  tunnel: (z, low) => low ? [0.9, 0.7] : [3.0, 0.7],
  factory: (z, low) => low ? [0.9, 0.7] : [3.0, 0.7],
  lab: (z, low) => low ? [0.9, 0.5] : [3.2, 0.5], /* M4-B 심해 연구소 */
};
/* 바닥 무늬 (그림 조각 이름 · 크기 m) — 방 종류마다 고르는 후보 */
export const FLOOR = {
  grime: [5.0, 7.0], debris: [1.8, 2.4], patch: [4.0, 4.0], bayzone: [4.4, 5.2], crack: [2.6, 3.6], rust: [2.0, 3.0], silt: [3.2, 4.4], scuff: [2.2, 3.2], tags: [2.0, 2.6], lane: [3.4, 3.8], bay: [1.5, 1.8], drain: [1.0, 1.2], flow: [2.6, 3.2],
  oil: [2.2, 3.0], weed: [2.2, 3.0], edge: [3.0, 3.6], tire: [3.2, 3.8], tactile: [3.4, 3.8], ticket: [1.8, 2.4], sleeper: [3.4, 3.8], rope: [1.6, 2.0],
  slag: [2.2, 3.2], hazard: [3.2, 3.8],
  mossd: [2.6, 3.6], frost: [2.4, 3.2], lgrid: [3.6, 4.0], toxd: [2.0, 2.8], /* M4-B 연구소 (lab 아틀라스) */
};
const FLOORS = {
  ware: { entry: ['lane', 'silt', 'tags'], dock: ['lane', 'tags', 'rust', 'drain'], storage: ['tags', 'lane', 'bay', 'crack'], office: ['tags', 'crack', 'scuff'], pump: ['drain', 'rust', 'flow'], cold: ['crack', 'silt', 'scuff'], engine: ['rust', 'drain', 'oil', 'flow'], vault: ['crack', 'scuff'] },
  harbor: { entry: ['weed', 'edge', 'rope'], pier: ['weed', 'oil', 'edge', 'rope'], shed: ['scuff', 'oil', 'tags'], yard: ['tire', 'oil', 'bay', 'crack'], crane: ['oil', 'edge', 'rust'], office: ['scuff', 'crack', 'tags'], vault: ['crack', 'scuff'] },
  tunnel: { entry: ['tactile', 'ticket', 'crack'], platform: ['tactile', 'ticket', 'crack'], hall: ['ticket', 'crack', 'scuff'], track: ['sleeper', 'flow', 'rust'], passage: ['flow', 'crack', 'silt'], control: ['scuff', 'crack', 'rust'], reservoir: ['flow', 'silt', 'rust'], vault: ['crack', 'scuff'] },
  factory: { entry: ['lane', 'oil', 'hazard'], loading: ['lane', 'bay', 'oil', 'hazard'], store: ['tags', 'scuff', 'crack', 'bay'], furnace: ['slag', 'rust', 'oil', 'crack'], conveyor: ['hazard', 'oil', 'scuff', 'drain'], foundry: ['slag', 'rust', 'drain', 'oil'], workshop: ['scuff', 'crack', 'tags'], core: ['drain', 'hazard', 'rust', 'flow'], fcontrol: ['scuff', 'crack', 'drain'], crucible: ['slag', 'rust', 'oil'], vault: ['crack', 'scuff'] },
  lab: { entry: ['lgrid', 'scuff', 'tactile'], lobby: ['lgrid', 'scuff', 'tags'], dorm: ['scuff', 'crack', 'tags'], decon: ['drain', 'lgrid', 'flow'], tankhall: ['mossd', 'drain', 'flow', 'lgrid'], culture: ['mossd', 'lgrid', 'drain'], coldroom: ['frost', 'drain', 'crack'],
    records: ['scuff', 'crack', 'lgrid'], lcontrol: ['lgrid', 'scuff', 'drain'], corehall: ['mossd', 'hazard', 'drain', 'lgrid'], basin: ['mossd', 'flow', 'silt'], vault: ['crack', 'scuff'] },
};
/* 윗벽 그림 조각 (이야기 장소 — 창고 = 맡긴 짐 · 대피 / 항구 = 마지막 배 · 축제 / 터널 = 역 · 섬 방향) [이름, 가로, 세로] */
const WALLART = {
  ware: [['p_evac', 1.5, 1.0], ['p_tags', 1.6, 1.0], ['tide', 1.0, 1.0], ['graf', 1.6, 0.9], ['p_keep', 1.5, 0.95]],
  harbor: [['p_fest', 1.2, 0.9], ['p_ferry', 1.4, 0.9], ['tide', 1.0, 0.9], ['graf', 1.6, 0.8]],
  tunnel: [['p_line', 1.8, 0.8], ['p_exit', 1.1, 0.55], ['graf_isle', 1.7, 0.8], ['tile', 2.4, 0.5]],
  factory: [['p_lampw', 1.3, 1.0], ['p_rule', 1.2, 1.0], ['anchor', 1.6, 1.0], ['p_lampw', 1.3, 1.0], ['p_evac', 1.5, 1.0]], /* 등불 공방 포스터 · 작업 수칙 · 검은 닻 낙서 */
  lab: [['p_coral', 1.1, 1.1], ['p_lrule', 1.0, 1.1], ['p_noeul', 1.1, 1.0], ['p_exit', 1.1, 0.55], ['p_coral', 1.1, 1.1]], /* 산호 복원 포스터 · 연구 수칙 · 노을의 등불 표식 */
};
/* 주제 소품 [키, 가로, 깊이, 판정(0 = 없음 · 1 = 낮은 엄폐 · 2 = 총알도 막음)] — 뒤질 상자와 다른 모양 · 색 */
const THEME = {
  ware: { entry: ['w_evac'], dock: ['w_bags', 'w_luggage', 'w_evac'], storage: ['w_luggage', 'w_bags'], office: ['w_evac', 'w_luggage'], pump: ['w_evac', 'w_bags'], cold: ['w_luggage', 'w_bags'], engine: ['w_evac', 'w_bags'] },
  harbor: { entry: ['h_buoys'], pier: ['h_net', 'h_rowboat', 'h_buoys'], shed: ['h_net', 'h_buoys'], yard: ['h_rowboat', 'h_buoys'], crane: ['h_net', 'h_buoys'], office: ['h_buoys'] },
  tunnel: { entry: ['t_seats'], platform: ['t_seats', 't_slab'], hall: ['t_seats', 't_slab'], track: ['t_slab', 't_seats'], passage: ['t_slab'], control: ['t_seats'], reservoir: ['t_slab'] },
  factory: { entry: ['f_lockers'], loading: ['f_sacks', 'f_lockers', 'f_carts'], store: ['f_sacks', 'f_shelf'], furnace: ['f_ladles', 'f_ingots'], conveyor: ['f_ingots', 'f_carts'], foundry: ['f_ladles', 'f_ingots'], workshop: ['f_lanterns', 'f_lanterns', 'f_shelf'], core: ['f_cells', 'f_ingots'], fcontrol: ['f_desk', 'f_cells'], crucible: ['f_ingots'] },
  lab: { entry: ['l_desk'], lobby: ['l_desk', 'l_jars'], dorm: ['l_bunks'], decon: ['l_coolers'], tankhall: ['l_jars', 'l_coolers'], culture: ['l_jars'], coldroom: ['l_coolers'], records: ['l_files'], lcontrol: ['l_monitors'], corehall: ['l_cables', 'l_monitors'], basin: ['l_cables'] },
};
export const DRESS_SIZE = { w_luggage: [2.3, 0.65, 2], w_bags: [1.9, 1.0, 1], w_evac: [1.1, 0.4, 1], h_net: [2.1, 1.3, 0], h_buoys: [1.6, 0.9, 1], h_rowboat: [3.0, 1.35, 1], t_seats: [2.2, 0.75, 1], t_slab: [1.5, 0.75, 0],
  f_sacks: [2.0, 0.9, 1], f_lockers: [2.2, 0.6, 2], f_carts: [2.0, 1.0, 1], f_shelf: [2.2, 0.6, 2], f_ladles: [1.6, 0.7, 1], f_ingots: [1.8, 0.8, 1], f_lanterns: [2.4, 0.7, 2], f_cells: [1.8, 0.8, 1], f_desk: [2.2, 0.8, 1],
  l_desk: [2.2, 0.8, 1], l_jars: [2.2, 0.6, 2], l_bunks: [2.2, 0.9, 1], l_coolers: [2.0, 0.8, 1], l_files: [2.2, 0.6, 2], l_monitors: [2.2, 0.7, 1], l_cables: [1.8, 0.8, 0] };
/* 잡동사니 (이미 받은 모델 · 크기 배수) */
const CLUTTER = { ware: [['bottle_b', 0.8], ['bottle_g', 0.8], ['box_large', 0.35], ['trunk', 0.6], ['bottle_b', 0.7]], harbor: [['h_planks', 2.6], ['h_fish', 2.6], ['h_stand', 2.4], ['bottle_b', 0.8], ['box_large', 0.35]], tunnel: [['t_lever', 1.4], ['bottle_b', 0.8], ['bottle_g', 0.8], ['box_large', 0.35], ['trunk', 0.6]],
  factory: [['f_ingot1', 1], ['bottle_b', 0.8], ['f_ingot1', 0.9], ['box_large', 0.35], ['trunk', 0.6]],
  lab: [['bottle_g', 0.8], ['bottle_b', 0.7], ['box_large', 0.35], ['book', 0.9], ['bottle_g', 0.6]] }; /* 지도마다 이미 그리는 아틀라스 · 삼각형 적은 것만 (그리기 횟수 · 정점 그대로) */
/* 반쯤 잠긴 짐 [키, 크기, 높이(물에 잠김)] — 이미 받은 모델 */
const FLOTSAM = { ware: [['box_large', 1, -0.6], ['trunk', 1.3, -0.4], ['barrel', 1, -0.9], ['box_large', 1.4, -0.8]],
  harbor: [['k_cont_a', 6, -1.1], ['k_cont_b', 6, -1.1], ['h_planks', 3.5, -0.35], ['box_large', 1.2, -0.7]],
  tunnel: [['k_cont_a', 6, -1.2], ['box_large', 1.2, -0.7], ['trunk', 1.3, -0.4], ['barrel', 1, -0.9]],
  factory: [['k_cont_b', 6, -1.2], ['box_large', 1.2, -0.7], ['barrel', 1, -0.9], ['f_crate', 1.2, -0.8]],
  lab: [['k_tank', 2.4, -1.0], ['box_large', 1.2, -0.7], ['barrel', 1, -0.9], ['cabinet', 1.1, -0.7]] };
const FALLBACK = { ware: 'w_bags', harbor: 'h_net', tunnel: 't_slab', factory: 'f_ingots', lab: 'l_cables' };
/* 랜드마크 (구역 1 · 2 · 3) — 빈 칸 가운데나 지도 밖(옆 · 위) 물 위 */
export const MARKS = { ware: ['lm_pile', 'lm_wheel', 'lm_boiler'], harbor: ['lm_booth', 'lm_gantry', 'lm_light'], tunnel: ['lm_clock', 'lm_train', 'lm_hatch'], factory: ['lm_anchor', 'lm_furnace', 'lm_relay'], lab: ['lm_noeul', 'lm_origin', 'lm_screens'] }; /* 공장: 검은 닻 표식 · 꺼진 용광로 · 파수 관제 연결선 / 연구소(M4-B): 노을의 흔적 · 빛이끼 기원 수조 · '보관 중' 화면 벽 */
/* 랜드마크 몸 반폭 [가로, 깊이] m */
const MARK_FOOT = { lm_pile: [3.2, 2.6], lm_wheel: [3.4, 0.8], lm_boiler: [2.6, 3.0], lm_booth: [3.6, 1.6], lm_gantry: [6.6, 2.4], lm_light: [2.2, 2.2], lm_clock: [3.0, 0.4], lm_train: [1.5, 5.6], lm_hatch: [4.2, 0.8], lm_anchor: [2.4, 1.2], lm_furnace: [3.0, 3.0], lm_relay: [2.6, 1.4], lm_noeul: [2.2, 1.0], lm_origin: [3.0, 3.0], lm_screens: [3.6, 0.8] };
const ZROWS = { 1: [5, 6], 2: [2, 4], 3: [0, 1] };

export function dress(P) {
  const map = P.map || 'ware'; const R = rng(mix32(P.seed * 131 + 17) || 1); const ri = (a, b) => a + Math.floor(R() * (b - a + 1)); const pick = a => a[Math.floor(R() * a.length)];
  const has = (c, r) => P.rooms.some(x => x.c === c && x.r === r);
  const decals = [], props = [], marks = [], pipes = [], glows = [];
  if (!FLOORS[map]) return { decals, props, marks, pipes, glows }; /* M5-A 대수문 꼭대기: 고정 무대라 꾸밈 계획 없음 (gate.js 가 그림) */
  /* 피할 곳: 원 [x, z, r] · 상자 [x0, z0, x1, z1] */
  const circ = [], rects = [];
  for (const l of P.loots) circ.push([l.x, l.z, 1.55]);
  for (const p of P.props) { if (p.deco) { circ.push([p.x, p.z, 0.7]); continue; } const s = SOLID[p.k] || [0.8, 0.8]; const sw = Math.abs(Math.sin(p.ry || 0)) > 0.7; rects.push(grow(p.x, p.z, sw ? s[1] : s[0], sw ? s[0] : s[1], 0.25)); }
  for (const e of P.exits) circ.push([e.x, e.z, 3.4]);
  circ.push([P.generator.x, P.generator.z, 2.8], [P.boss.x, P.boss.z, 2.6], [P.spawn.x, P.spawn.z, 2.2]);
  for (const L of P.lamps || []) circ.push([L.x, L.z, 1.4]); if (P.lighthouse) circ.push([P.lighthouse.x, P.lighthouse.z, 2.2]);
  for (const a of P.airs || []) circ.push([a.x, a.z, 2]);
  for (const b of P.blocks || []) rects.push(grow(b.x, b.z, 1.85, 1.85, 0.15)); for (const c of P.cars || []) rects.push(grow(c.x, c.z, 1.1, 3.7, 0.3));
  for (const b of P.belts || []) rects.push([b.x0 - 0.2, b.z0 - 0.3, b.x1 + 0.2, b.z1 + 0.3]); for (const m of P.molten || []) rects.push([m.x0 - 0.2, m.z0 - 0.2, m.x1 + 0.2, m.z1 + 0.2]); for (const v of P.vents || []) circ.push([v.x, v.z, 1.6]); /* 공장: 벨트 · 쇳물 도랑 · 증기 배관 위는 비움 */
  /* 문 자리: 문 칸(4m) 양쪽 방으로 2.6m 깊이 */
  for (const d of P.doors) rects.push(d.axis === 'x' ? [d.x - 2.7, d.z - 2.6, d.x + 2.7, d.z + 2.6] : [d.x - 2.6, d.z - 2.7, d.x + 2.6, d.z + 2.7]);
  const doorAt = (x, z) => P.doors.some(d => Math.abs(d.x - x) < 0.1 && Math.abs(d.z - z) < 0.1);
  const clearR = (r, pad = 0, cpad = pad) => !circ.some(([x, z, rr]) => { const dx = x - Math.max(r[0], Math.min(x, r[2])), dz = z - Math.max(r[1], Math.min(z, r[3])); return dx * dx + dz * dz < (rr + cpad) ** 2; }) && !rects.some(b => b[0] < r[2] + pad && b[2] > r[0] - pad && b[1] < r[3] + pad && b[3] > r[1] - pad);
  const wallOf = (z, low) => WALL[map](z, low);

  for (const rm of P.rooms) {
    const type = rm.type === 'entry' ? 'entry' : rm.type; const z = rm.zone;
    /* ── 바닥 무늬 2~3종 (각 1~2개) ── */
    const pool = (FLOORS[map][type] || FLOORS[map].vault).slice(); const kinds = []; const nk = rm.type === 'vault' ? 2 : ri(2, 3);
    while (kinds.length < nk && pool.length) kinds.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
    const mine = [];
    /* 때 얼룩 (넓고 옅게 — 같은 타일이 이어 보이지 않게) 1~2 + 잔해 0~1 */
    for (let n = 2; n > 0; n--) { const [s0, s1] = FLOOR.grime; const s = s0 + R() * (s1 - s0); decals.push({ c: 'grime', x: rm.x0 + 3 + R() * (RS - 6), z: rm.z0 + 3 + R() * (RS - 6), ry: R() * 6.28, w: s, h: s, zone: z }); }
    if (R() < 0.7) kinds.push('debris');
    /* 타일 칸에 맞춘 얼룩 타일 2~4 (같은 회색 육각이 끝없이 이어지지 않게) */
    for (let n = ri(2, 4); n > 0; n--) { const i = ri(0, 3), j = ri(0, 3); decals.push({ c: 'patch', x: rm.x0 + i * T + T / 2, z: rm.z0 + j * T + T / 2, ry: ri(0, 3) * Math.PI / 2, w: T, h: T, zone: z }); }
    /* 짐 내리는 칸 (창고 · 야적장) */
    if ((map === 'ware' && (rm.type === 'dock' || rm.type === 'storage' || rm.type === 'entry')) || (map === 'harbor' && rm.type === 'yard')) kinds.push('bayzone');
    for (const k of kinds) for (let n = (k === 'lane' || k === 'sleeper' || k === 'tactile' || k === 'edge' || k === 'bayzone' || k === 'debris' ? 1 : ri(2, 3)); n > 0; n--) {
      const [s0, s1] = FLOOR[k]; const s = s0 + R() * (s1 - s0);
      for (let t = 0; t < 30; t++) {
        let x = rm.x0 + 1.4 + R() * (RS - 2.8), zz = rm.z0 + 1.4 + R() * (RS - 2.8), ry = R() * Math.PI * 2;
        if (k === 'lane' || k === 'tactile' || k === 'edge') { /* 벽과 나란히 (위나 옆) */ if (R() < 0.6) { zz = rm.z0 + 1.6 + R() * 0.6; ry = Math.PI / 2; } else { x = R() < 0.5 ? rm.x0 + 1.6 : rm.x0 + RS - 1.6; ry = 0; } }
        if (k === 'sleeper') { x = rm.x0 + RS / 2; ry = 0; } /* 레일(map.js) 사이 */
        if (k === 'bay' || k === 'bayzone') ry = (R() - 0.5) * 0.5; /* 글자가 카메라 쪽에서 바로 읽히게 */
        if (k === 'flow') { const cu = (P.currents || []).find(c => c.room === rm.id); if (cu) ry = Math.atan2(cu.dx, cu.dz); }
        if (circ.some(([cx, cz, r]) => Math.hypot(cx - x, cz - zz) < Math.min(r, 3.4) * (k === 'drain' ? 1 : 0.85) && r >= 2)) continue; /* 출구 · 발전기 · 공기 방울 · 등대 위는 비움 */
        if (mine.some(([mx, mz, ms]) => Math.hypot(mx - x, mz - zz) < (ms + s) * (t < 15 ? 0.42 : 0.2))) continue;
        mine.push([x, zz, s]); decals.push({ c: k, x, z: zz, ry, w: s, h: s, zone: z }); break;
      }
    }
    /* ── 벽 장식 1: 윗벽(카메라 쪽에서 보이는 면)의 그림 조각 · 50% 옆벽 배관 ── */
    const topSegs = []; for (let t = 0; t < RT; t++) { const x = rm.x0 + t * T + T / 2; if (!doorAt(x, rm.z0)) topSegs.push(x); }
    const low = has(rm.c, rm.r - 1); const [wh, wt] = wallOf(z, low);
    if (topSegs.length) { const [c, w, h0] = pick(WALLART[map]); const h = Math.min(h0, wh - 0.18); const sc = h / h0; const x = pick(topSegs) + (R() - 0.5) * 1.2;
      decals.push({ c, x, z: rm.z0 + wt / 2 + 0.03, y: Math.min(wh - 0.06 - h / 2, Math.max(0.12 + h / 2, 1.5)), ry: 0, w: w * sc, h, v: 1, zone: z }); }
    if (map === 'harbor' && topSegs.length && R() < 0.45) { /* 항구: 윗벽에 구명환 (벽 판정 안) */ const x = pick(topSegs) + (R() - 0.5) * 2; props.push({ k: 'h_ring', x, z: rm.z0 + wt / 2 + 0.1, y: Math.max(0.45, wh - 0.5), rx: 0, ry: 0, rz: (R() - 0.5) * 0.3, zone: z, solid: null }); }
    if (rm.type !== 'vault' && R() < 0.55) { /* 옆벽 위쪽을 따라 배관 — 벽 판정 안이라 길과 상관 없음 */
      const side = R() < 0.5 ? 0 : 1; const wx = side ? rm.x0 + RS : rm.x0; const [sh, st] = wallOf(z, false);
      const segs = []; for (let t = 0; t < RT; t++) { const zc = rm.z0 + t * T + T / 2; if (!doorAt(wx, zc)) segs.push(zc); }
      const runs = []; let cur = null; for (let t = 0; t < RT; t++) { const zc = rm.z0 + t * T + T / 2; if (segs.includes(zc)) { if (!cur) runs.push(cur = [zc - T / 2, zc + T / 2]); else cur[1] = zc + T / 2; } else cur = null; }
      const run = runs.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
      if (run && run[1] - run[0] >= 8) pipes.push({ k: { ware: 'x_pipe_w', harbor: 'x_pipe_h', tunnel: 'x_pipe_t', factory: 'x_pipe_f', lab: 'x_pipe_l' }[map], x: wx + (side ? -1 : 1) * (Math.max(0.5, st / 2) + 0.12), z0: run[0] + 0.6, z1: run[1] - 0.6, y: Math.max(1.2, sh - 0.55), zone: z, valve: R() < 0.5 });
    }
    /* ── 잡동사니 무더기 1~2 (작은 것 3~4개 · 판정 없음 · 벽 · 구석 쪽) ── */
    for (let g = ri(1, 2); g > 0; g--) for (let t = 0; t < 10; t++) {
      const corner = R() < 0.5; const cx = corner ? (R() < 0.5 ? rm.x0 + 1.6 : rm.x0 + RS - 1.6) : rm.x0 + 2 + R() * (RS - 4), cz = corner ? (R() < 0.5 ? rm.z0 + 1.6 : rm.z0 + RS - 1.6) : (R() < 0.5 ? rm.z0 + 1.5 : rm.z0 + RS - 1.5);
      if (!clearR([cx - 0.9, cz - 0.9, cx + 0.9, cz + 0.9], 0, 0)) continue;
      const L = CLUTTER[map]; for (let n = ri(3, 4); n > 0; n--) { const [k, sc] = pick(L); props.push({ k, x: cx + (R() - 0.5) * 1.6, z: cz + (R() - 0.5) * 1.6, ry: R() * 6.28, s: sc * (0.85 + R() * 0.3), zone: z, solid: null, tilt: k === 'can_a' || k === 'bottle_b' || k === 'bottle_g' ? (R() < 0.5 ? Math.PI / 2 : 0) : 0 }); }
      rects.push([cx - 0.9, cz - 0.9, cx + 0.9, cz + 0.9]); break;
    }
    /* ── 공장(M3-B): 작업등 빛 웅덩이 1 (천장 등) · 용광로 방은 붉은 열기 — 그림만 (판정 · 시야 없음) ── */
    if (map === 'factory') { const hot = rm.type === 'furnace' || rm.type === 'foundry' || rm.type === 'crucible';
      for (let t = 0; t < 12; t++) { const x = rm.x0 + 4 + R() * (RS - 8), zz = rm.z0 + 4 + R() * (RS - 8); if (circ.some(([cx, cz, r]) => Math.hypot(cx - x, cz - zz) < Math.min(r, 3) && r >= 2.5)) continue; glows.push({ c: 'g_pool', x, z: zz, s: 7 + R() * 2.5 }); break; }
      if (hot) glows.push({ c: 'g_red', x: rm.x0 + RS / 2 + (R() - 0.5) * 6, z: rm.z0 + RS / 2 + (R() - 0.5) * 6, s: 9 }); }
    /* ── 연구소(M4-B): 천장 청록 조명 빛 웅덩이 1 (수조 · 배양실은 둘) — 그림만 ── */
    if (map === 'lab') for (let g = rm.type === 'tankhall' || rm.type === 'culture' || rm.type === 'basin' ? 2 : 1; g > 0; g--) for (let t = 0; t < 12; t++) { const x = rm.x0 + 4 + R() * (RS - 8), zz = rm.z0 + 4 + R() * (RS - 8); if (circ.some(([cx, cz, r]) => Math.hypot(cx - x, cz - zz) < Math.min(r, 3) && r >= 2.5)) continue; glows.push({ c: g > 1 ? 'g_teal' : 'g_pool', x, z: zz, s: 6.5 + R() * 2.5 }); break; }
    /* ── 주제 소품 1 (벽 쪽으로 붙임) ── */
    const th = THEME[map][type]; if (!th) continue;
    const k = pick(th); const [w, d, solid] = DRESS_SIZE[k]; let placed = false;
    for (let t = 0; t < 48; t++) {
      const wallSide = pick(['top', 'top', 'top', 'left', 'right', 'bottom']); let x, zz, ry, hx, hz;
      if (wallSide === 'top' || wallSide === 'bottom') { const inner = Math.max(0.5, wallOf(z, wallSide === 'top' ? low : true)[1] / 2) + 0.05; x = rm.x0 + w / 2 + 0.7 + R() * (RS - w - 1.4); zz = wallSide === 'top' ? rm.z0 + inner + d / 2 : rm.z0 + RS - inner - d / 2; ry = wallSide === 'top' ? 0 : Math.PI; hx = w / 2; hz = d / 2; }
      else { const sideX = wallSide === 'left' ? rm.x0 : rm.x0 + RS; const inner = Math.max(0.5, wallOf(z, false)[1] / 2) + 0.05; zz = rm.z0 + w / 2 + 0.7 + R() * (RS - w - 1.4); x = sideX + (wallSide === 'left' ? 1 : -1) * (inner + d / 2); ry = wallSide === 'left' ? Math.PI / 2 : -Math.PI / 2; hx = d / 2; hz = w / 2; }
      const r = [x - hx, zz - hz, x + hx, zz + hz];
      if (!clearR(r, solid ? 1.0 : 0.2, solid ? 0.3 : 0.1)) continue; /* 판정 있는 것은 엄폐물 · 문 쪽 1m 비움 → 옆으로 지나갈 틈 (상자는 1.55+0.3 — 다른 쪽에서 손이 닿음) */
      props.push({ k, x, z: zz, ry: ry + (R() - 0.5) * 0.12, zone: z, solid: solid ? [hx, hz, solid > 1 ? 1 : 0] : null }); rects.push(grow(x, zz, hx, hz, 0.1)); placed = true; break;
    }
    /* 벽 쪽 자리가 없으면 바닥 가운데 쪽에 낮은 것 (그물 · 표지 조각 · 가방 더미) */
    if (!placed) { const k2 = FALLBACK[map]; const [w2, d2, so2] = DRESS_SIZE[k2];
      for (let t = 0; t < 30; t++) { const ry = Math.floor(R() * 4) * Math.PI / 2; const sw = Math.abs(Math.sin(ry)) > 0.7; const hx = (sw ? d2 : w2) / 2, hz = (sw ? w2 : d2) / 2;
        const x = rm.x0 + 1.5 + hx + R() * (RS - 3 - hx * 2), zz = rm.z0 + 1.5 + hz + R() * (RS - 3 - hz * 2); const r = [x - hx, zz - hz, x + hx, zz + hz];
        if (!clearR(r, so2 ? 1.0 : 0.3, so2 ? 0.4 : 0.15)) continue;
        props.push({ k: k2, x, z: zz, ry, zone: z, solid: so2 ? [hx, hz, 0] : null }); rects.push(grow(x, zz, hx, hz, 0.1)); placed = true; break; }
      /* 그래도 없으면(보스방처럼 꽉 찬 방) 판정 없이 벽 쪽 아무 데나 — 낮은 가방 더미 · 그물 · 표지 조각 */
      for (let t = 0; t < 60 && !placed; t++) { const x = rm.x0 + 1.5 + R() * (RS - 3), zz = rm.z0 + 1.2 + R() * (t < 20 ? 1.2 : RS - 2.4); const r = [x - w2 / 2, zz - d2 / 2, x + w2 / 2, zz + d2 / 2]; if (!clearR(r, 0, t < 40 ? 0.05 : -0.4)) continue; props.push({ k: k2, x, z: zz, ry: 0, zone: z, solid: null }); placed = true; }
      /* 마지막: 정해진 9자리 중 가장 넓은 곳 (판정 없음) */
      if (!placed) { let best = null, bd = -1; for (const fx of [3, 8, 13]) for (const fz of [2, 8, 14]) { const x = rm.x0 + fx, zz = rm.z0 + fz; const dmin = Math.min(...circ.map(([cx, cz, rr]) => Math.hypot(cx - x, cz - zz) - rr), ...rects.map(b => Math.hypot(x - Math.max(b[0], Math.min(x, b[2])), zz - Math.max(b[1], Math.min(zz, b[3]))))); if (dmin > bd) { bd = dmin; best = [x, zz]; } }
        props.push({ k: k2, x: best[0], z: best[1], ry: 0, zone: z, solid: null }); } }
  }
  /* ── 랜드마크: 구역마다 하나 — 그 구역 줄의 빈 칸(이웃 방 많은 곳) → 없으면 지도 옆 · 위 바깥 ── */
  for (const zn of [1, 2, 3]) {
    const [r0, r1] = ZROWS[zn]; const cands = [];
    /* 세로 화면이라 옆 칸은 잘 안 보임 → 방 바로 위(북쪽) 칸이 가장 좋음: 아래 이웃 2 · 옆 1 · 위 0.5 */
    const W8 = [[0, 1, 2], [1, 0, 1], [-1, 0, 1], [0, -1, 0.5]];
    for (let r = r0; r <= r1; r++) for (let c = 0; c < COLS; c++) { if (has(c, r)) continue; const nb = W8.filter(([a, b]) => P.rooms.some(x => x.c === c + a && x.r === r + b && x.zone === zn)); if (nb.length) cands.push({ c, r, nb: nb.sort((p, q) => q[2] - p[2]).map(([a, b]) => [c + a, r + b]), score: nb.reduce((t, w) => t + w[2], 0) + R() * 0.5 }); }
    for (let r = r0; r <= r1; r++) { if (has(0, r)) cands.push({ c: -1, r, nb: [[0, r]], score: 0.3 + R() * 0.2 }); if (has(COLS - 1, r)) cands.push({ c: COLS, r, nb: [[COLS - 1, r]], score: 0.3 + R() * 0.2 }); }
    if (zn === 3) for (let c = 0; c < COLS; c++) if (has(c, 0)) cands.push({ c, r: -1, nb: [[c, 0]], score: 1.2 + R() * 0.2 }); /* 지도 위쪽 바깥 = 맨 윗줄 방에서 잘 보임 */
    const best = cands.sort((a, b) => b.score - a.score)[0]; if (!best) continue;
    /* 앞(+z) = 카메라 쪽(읽히게) + 이웃 방 쪽으로 살짝 돌림 · 빈 칸이면 칸 안쪽 뒤로, 지도 밖이면 벽에서 몸 반만큼 떨어뜨림 */
    const [nc, nr] = best.nb[0]; const dx = nc - best.c, dz = nr - best.r; const [hw, hd] = MARK_FOOT[MARKS[map][zn - 1]];
    const inCell = best.c >= 0 && best.c < COLS && best.r >= 0; let x = best.c * RS + RS / 2, z = best.r * RS + RS / 2;
    if (inCell) { x += dx * Math.max(0, RS / 2 - hw - 1.2); z += dz * Math.max(0, RS / 2 - hd - 1.2); } /* 보는 방 쪽 벽 바로 뒤 — 멀면 화면 위로 벗어남 */ else if (best.c < 0) x = -(hw + 1.2); else if (best.c >= COLS) x = COLS * RS + hw + 1.2; else z = -(hd + 1.2);
    marks.push({ k: MARKS[map][zn - 1], x, z, ry: dx * 0.3, zone: zn, out: !inCell });
  }
  /* ── 빈 칸 · 지도 옆 물 위: 반쯤 잠긴 짐 (손 안 닿는 곳 — 판정 없음) ── */
  const flo = FLOTSAM[map]; const markAt = (c, r) => marks.some(m => Math.floor(m.x / RS) === c && Math.floor(m.z / RS) === r);
  const sink = (x, z, zone) => { const [k, sc, y0] = pick(flo); props.push({ k, x, z, ry: R() * 6.28, s: sc * (0.8 + R() * 0.4), y: y0 - R() * 0.4, rx: (R() - 0.5) * 0.5, rz: (R() - 0.5) * 0.5, zone, solid: null }); };
  for (let r = 0; r < ROWS; r++) for (let c = -1; c <= COLS; c++) {
    if (c >= 0 && c < COLS && has(c, r)) continue; const zone = zoneOfRow(r); const edge = c < 0 || c >= COLS;
    if (edge && !has(c < 0 ? 0 : COLS - 1, r)) continue; if (!edge && markAt(c, r)) { if (R() < 0.5) sink(c * RS + 3 + R() * 10, r * RS + 3 + R() * 10, zone); continue; }
    const n = edge ? (R() < 0.6 ? 1 : 0) : ri(2, 4);
    for (let i = 0; i < n; i++) sink(edge ? (c < 0 ? -2.2 - R() * 4 : COLS * RS + 2.2 + R() * 4) : c * RS + 2.5 + R() * 11, r * RS + 2.5 + R() * 11, zone);
  }
  return { decals, props, marks, pipes, glows };
}
function grow(x, z, hx, hz, p) { return [x - hx - p, z - hz - p, x + hx + p, z + hz + p]; }
