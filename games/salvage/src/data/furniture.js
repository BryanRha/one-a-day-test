// 수달 인양단 — 은신처 가구 30 (M5-D · 2026-11-09) — 자리 10 × 고르기 3 · 조개로만 (골드 X · ROADMAP 'M5 설계 메모 ②' 조개 쓰는 곳)
//  · 능력치 0 (꾸미기와 같은 규칙) · 산 가구는 언제든 바꿔 놓기 · 치우기 무료
//  · 모델 = assets/dress_furn.glb (tools/props3d/build_furn.py → pack_furn.mjs) · 키 = 가구 id · 그리기는 시설 소품과 한 덩어리(home_fac.js)
//  · 자리 x · z · ry(바라보는 방향) · y(바닥 윗면 0.05 · 벽 · 천장 높이) · base(그 자리에 원래 있는 소품 — 가구를 놓으면 숨김) — 은신처 좌표(home_fac.js SLOT · npc_home.js SPOT 과 안 겹치게) · 앞(+z) = 물가 · 뒷벽 z −6
//  · need: 사기 전 조건(늦게 열리는 비싼 가구 — 45일 쪽으로 퍼지게) · 값 합계 = 아래 FURN_TOTAL (BALANCE.md 8장)
export const FURN_SPOTS = {
  rug:    { name: '깔개',       x: 0.0,   z: -1.6,  ry: 0.0,  y: 0.05, base: 'rug' },
  seat:   { name: '쉼터',       x: 2.4,   z: -2.6,  ry: -0.5, y: 0.05, base: 'armchair' },
  table:  { name: '탁자',       x: 0.55,  z: 1.05,  ry: 0.2,  y: 0.05 },
  wall:   { name: '뒷벽',       x: 0.25, z: -5.5, ry: 0.0, y: 2.75 },
  plant:  { name: '화분',       x: -2.35, z: 1.8, ry: 0.4, y: 0.05 },
  lamp:   { name: '조명',       x: 3.85, z: 1.35, ry: -0.8, y: 0.05 },
  pet:    { name: '몽이 자리',  x: 0.9,   z: -1.0,  ry: -0.6, y: 0.05 },
  dock:   { name: '부두',       x: -1.0,  z: 3.15,  ry: 0.3,  y: 0.05 },
  trophy: { name: '진열대',     x: 2.55, z: 1.2, ry: -0.4, y: 0.05 },
  hang:   { name: '천장 장식',  x: 0.0,   z: -4.3,  ry: 0.0,  y: 3.5 },
};
export const FURN_SPOT_KEYS = Object.keys(FURN_SPOTS);
/* 가구 30 — spot: 자리 · n: 조개 · need: { t: 'fac'|'bosses'|'vaults'|'extracts'|'ch', k, n } (없으면 바로) · sw: 견본 색 · txt: 한 줄 */
export const FURN = {
  /* 깔개 */
  f_rug_shell:   { spot: 'rug',    name: '조개 무늬 깔개',  n: 300,  sw: '#e8c9a8', txt: '둥근 깔개에 조개 무늬 여섯' },
  f_rug_chart:   { spot: 'rug',    name: '해도 깔개',       n: 650,  sw: '#d8c8a0', txt: '물길이 그려진 옛 바다 지도' },
  f_rug_knot:    { spot: 'rug',    name: '밧줄 매듭 깔개',  n: 1100, sw: '#c2a36b', txt: '굵은 밧줄을 감아 엮은 둥근 깔개', need: { t: 'fac', k: 'dock', n: 2 } },
  /* 쉼터 (의자 자리) */
  f_seat_hammock: { spot: 'seat',  name: '그물 해먹',       n: 450,  sw: '#3c5a4e', txt: '기둥 둘 사이 낡은 그물' },
  f_seat_rocker:  { spot: 'seat',  name: '흔들의자',        n: 800,  sw: '#8a5a36', txt: '방석 깐 나무 흔들의자' },
  f_seat_boat:    { spot: 'seat',  name: '보트 소파',       n: 1500, sw: '#c8553a', txt: '반으로 자른 구조 보트 + 쿠션', need: { t: 'bosses', n: 5 } },
  /* 탁자 */
  f_table_crate:  { spot: 'table', name: '상자 탁자',       n: 350,  sw: '#b08055', txt: '나무 상자 위 찻주전자와 잔 둘' },
  f_table_chart:  { spot: 'table', name: '해도 탁자',       n: 700,  sw: '#e8dcc4', txt: '둥근 탁자 · 펼친 해도 · 놋쇠 나침반' },
  f_table_radio:  { spot: 'table', name: '무전 탁자',       n: 1200, sw: '#4a5257', txt: '기름통 탁자 위 진공관 무전기', need: { t: 'fac', k: 'lights', n: 3 } },
  /* 뒷벽 */
  f_wall_flag:    { spot: 'wall',  name: '수색대 깃발',     n: 400,  sw: '#c8452f', txt: '등불 수색대 깃발 (등불 무늬)' },
  f_wall_map:     { spot: 'wall',  name: '큰 해도 액자',    n: 750,  sw: '#2f8a8a', txt: '다섯 물길을 표시한 큰 액자' },
  f_wall_ring:    { spot: 'wall',  name: '구명 튜브와 노',  n: 1000, sw: '#e0782f', txt: '구명 튜브 · 엇갈린 노 둘', need: { t: 'extracts', n: 60 } },
  /* 화분 */
  f_plant_kelp:   { spot: 'plant', name: '해초 항아리',     n: 250,  sw: '#3f7a4a', txt: '물 항아리에 키 큰 해초' },
  f_plant_coral:  { spot: 'plant', name: '산호 화분',       n: 600,  sw: '#e88a9a', txt: '분홍 · 주황 산호 가지' },
  f_plant_moss:   { spot: 'plant', name: '빛이끼 유리병',   n: 1300, sw: '#7dffd8', txt: '연구소에서 건진 빛이끼 (밤에 빛남)', need: { t: 'map', k: 'lab' } },
  /* 조명 */
  f_lamp_post:    { spot: 'lamp',  name: '항구 가로등',     n: 500,  sw: '#c99a4a', txt: '부두에서 떼어 온 놋쇠 가로등' },
  f_lamp_jelly:   { spot: 'lamp',  name: '해파리 조명',     n: 900,  sw: '#ff9ab0', txt: '천천히 빛나는 해파리 셋' },
  f_lamp_house:   { spot: 'lamp',  name: '등대 모형 등',    n: 1400, sw: '#f0ece4', txt: '꼭대기에 진짜 불이 켜지는 등대', need: { t: 'fac', k: 'lights', n: 4 } },
  /* 몽이 자리 */
  f_pet_basket:   { spot: 'pet',   name: '바구니 침대',     n: 200,  sw: '#c2a36b', txt: '담요 깐 둥근 바구니' },
  f_pet_shell:    { spot: 'pet',   name: '조개 침대',       n: 550,  sw: '#f2b8a8', txt: '큰 조개 껍데기 + 진주 베개', need: { t: 'fac', k: 'aquarium', n: 2 } },
  f_pet_tent:     { spot: 'pet',   name: '몽이 장난감 상자', n: 850, sw: '#3f6fa8', txt: '방석 · 털실 공 · 작은 물고기 인형', need: { t: 'fac', k: 'aquarium', n: 3 } },
  /* 부두 */
  f_dock_rods:    { spot: 'dock',  name: '낚싯대 통',       n: 300,  sw: '#8a5a36', txt: '통에 꽂은 낚싯대 셋 · 미끼 상자' },
  f_dock_anchor:  { spot: 'dock',  name: '녹슨 닻',         n: 700,  sw: '#4a5257', txt: '바닥에서 건진 커다란 닻' },
  f_dock_bell:    { spot: 'dock',  name: '배 종',           n: 1100, sw: '#c99a4a', txt: '놋쇠 종 · 줄을 당기면 울림', need: { t: 'vaults', n: 10 } },
  /* 진열대 (보스 기념품) */
  f_trophy_helm:  { spot: 'trophy', name: '수문지기 투구',  n: 600,  sw: '#8a9296', txt: '수문지기가 남긴 투구 · 받침대', need: { t: 'bosses', n: 1 } },
  f_trophy_pearl: { spot: 'trophy', name: '큰 진주 받침',   n: 1000, sw: '#f6efe8', txt: '어른 주먹만 한 진주', need: { t: 'vaults', n: 5 } },
  f_trophy_harp:  { spot: 'trophy', name: '황금 작살',      n: 1800, sw: '#e8c25a', txt: '벽걸이 받침에 금 작살', need: { t: 'bosses', n: 15 } },
  /* 천장 장식 */
  f_hang_flags:   { spot: 'hang',  name: '깃발 줄',         n: 250,  sw: '#e0b23a', txt: '알록달록 신호 깃발 한 줄' },
  f_hang_chime:   { spot: 'hang',  name: '조개 풍경',       n: 600,  sw: '#f4d6c4', txt: '조개 · 유리 조각이 달린 풍경' },
  f_hang_net:     { spot: 'hang',  name: '그물과 유리 부표', n: 950, sw: '#7fd0d8', txt: '천장 그물에 빛나는 유리 부표', need: { t: 'fac', k: 'lights', n: 2 } },
};
export const FURN_KEYS = Object.keys(FURN);
export const FURN_TOTAL = FURN_KEYS.reduce((a, k) => a + FURN[k].n, 0);
