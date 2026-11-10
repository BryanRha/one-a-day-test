// M5-B 숫자 · 목록 (주간 도전 · 깊은 물 · 칭호 · 도전/업적 꾸미기 키) — 동작은 challenge.js · abyss.js · ach.js · 화면은 ui_m5b.js
//  숫자 조정은 여기서만. 클린룸: 규칙 이름 · 칭호 · 꾸미기 이름은 우리 세계(수달 인양단) 말로만.

/* ═════ 주간 도전 (로그라이크 변주) ═════
 *  · 매주 월요일(한국 시각) 새 도전: 지도 · seed · 날씨 · 위협 Lv · 지급 장비 · 규칙 3개가 '주 번호'로만 정해짐 → 모두 같은 판(같은 seed)
 *  · 내 장비 · 창고와 따로: 지급 장비로 들어가고, 들고 나온 건 창고에 안 들어감(점수로만) · 쓰러져도 잃는 것 없음 · 남은 가방 없음
 *  · 원어데이 하루 무료 판(오늘 출격 3)과 따로 셈: 일주일에 무료 3판 + 조개로 추가 3판까지 (실서버 · ?limit 일 때만 막음 — 테스트 서버는 app.nolimit 로 무제한, 횟수는 셈)
 *  · 골드 · 광고 이어하기 · 가방 보험은 도전 판에서 안 뜸(겨루는 판 — bm-policy '능력치 · 이기는 데 돈 X')
 */
export const CH = {
  epoch: '2026-11-02',          /* 1회 도전 주(월요일) — 이 주가 #1 */
  free: 3,                      /* 일주일 무료 판 */
  extra: { n: 3, cost: 300 },   /* 조개로 추가 판 (주마다 · 한 판 값) — 후반 '조개 쓰는 곳' */
  maps: ['ware', 'harbor', 'tunnel', 'factory', 'lab'],  /* 주 번호로 돌아가며 (열리지 않은 지도도 도전 판에선 들어감 — 이야기 물건 · 녹음기는 안 나옴) */
  open: { raids: 6 },           /* 열림: 출격 6판(튜토리얼 뒤 · 첫 주 안) */
  lv: [5, 6, 7, 8],             /* 주마다 위협 Lv (주 번호로 고름) — 내 진행과 상관없이 같음 */
  kit: { vest: 2, helmet: 2, bag: 2, fac: { clinic: 2, store: 1, rack: 2, gym: 1, lights: 1 } }, /* 지급 장비 바탕 (규칙이 바꿈) */
  issue: [['pistol', 'rifle'], ['shotgun', 'pistol'], ['rifle', 'wrench'], ['harpoon', 'pistol'], ['volt', 'rifle'], ['longshot', 'shotgun']], /* '무작위 장비' 규칙이 없을 때 지급 무기 (주 번호로) */
  mods: 1,                      /* 지급 무기 개조 단계 (모든 칸) */
  kitMed: 2,                    /* 연고 */
  /* 점수: 탈출 = 가져온 가치 + 처치 × 12 + 보스 250 + 가장 깊은 구역 × 60 + 남은 초 ÷ 2 · 실패 = (처치 × 12 + 구역 × 60) 의 절반 · 규칙 배수(score) */
  sc: { kill: 12, boss: 250, zone: 60, sec: 0.5, fail: 0.5 },
  medal: [[1, 400, '동', '🥉'], [2, 1100, '은', '🥈'], [3, 2000, '금', '🥇']], /* [단계, 점수, 이름, 표시] */
  /* 물결 표(누적 · 주마다 그 주 최고 메달 단계만큼) → 도전 전용 꾸미기 · 칭호 */
  track: [[2, 'cos', 'ch_h_crest'], [4, 'title', 't_chal'], [6, 'cos', 'ch_l_tide'], [9, 'cos', 'ch_b_wave'], [12, 'title', 't_tide'], [15, 'cos', 'ch_s_medal'], [21, 'cos', 'ch_f_wave'], [30, 'title', 't_wavelord']],
};
/* 규칙 — 주마다 3개 (good = 덕 보는 규칙은 한 주에 하나까지 · not = 같이 안 나오는 짝) · 숫자는 challenge.js applyRules 가 씀 */
export const CH_RULES = {
  rnd_gear:  { name: '무작위 장비', icon: '🎲', txt: '무기 둘 · 장비 단계를 무작위로 받아요 (이번 주 모두 같은 장비)' },
  half_bag:  { name: '가방 절반',   icon: '🎒', txt: '가방 칸이 절반 — 고르고 골라 담아요', bagH: 0.5 },
  no_heal:   { name: '회복 없음',   icon: '🚫', txt: '연고 · 붕대 · 해독제를 쓸 수 없어요 · 체력 +30', hp: 30 },
  double:    { name: '적 2배 · 보상 2배', icon: '⚔', txt: '방마다 적이 하나씩 더 · 상자에서 나오는 것 2배', extra: 1, loot: 2, good: true },
  glass:     { name: '유리 작살',   icon: '💥', txt: '체력 절반 · 내 무기 피해 ×1.6', hpMul: 0.5, dmg: 1.6, not: ['no_heal'] },
  dark:      { name: '칠흑',        icon: '🌑', txt: '이번 주 판은 밤 — 헤드램프 지급', wx: 'night' },
  elite:     { name: '정예 바다',   icon: '💀', txt: '모든 적이 정예(체력 +15%) · 처치 점수 ×1.5', elite: true, kill: 1.5 },
  early:     { name: '이른 기상',   icon: '⏰', txt: '보스가 2분 일찍 깨어나요 · 보스 점수 ×2', bossEarly: 120, boss: 2 },
  heavy:     { name: '무거운 물',   icon: '⚓', txt: '편한 무게가 절반 — 무거우면 느려져요', comfy: 0.5 },
  glow:      { name: '보물 냄새',   icon: '✨', txt: '상자 등급 빛이 보이고 상자에서 30% 더', glow: true, loot: 1.3, good: true },
  crowd:     { name: '떼 지은 바다', icon: '🐟', txt: '새 적이 많이 섞이고(+40%) 깊은 방엔 더', mix: 0.4, extra3: 0.3 },
  scrap:     { name: '고물 점수',   icon: '🔩', txt: '가져온 가치 점수 ×1.5 · 소모품 없이 출발', value: 1.5, noKit: true },
};
export const CH_RULE_KEYS = Object.keys(CH_RULES);

/* ═════ 깊은 물 (엔딩 뒤) ═════
 *  · 엔딩을 보면 열림(abyss.js endingSeen — M5-A 엔딩 훅) · 출격 준비에서 켬/끔 · 오늘 출격 3을 그대로 씀(평소 판과 같음 — 내 장비 · 창고 · 남은 가방 규칙 그대로)
 *  · 심연 깊이 d (1~끝없음): 위협 Lv = 10 + d · 지금 깊이에서 탈출하면 다음 깊이가 열림 → 끝없는 성장 목표(최고 기록)
 *  · 변형 적 3: 심연 거구 · 심연 사냥꾼 · 심연 우두머리 (보라 림 빛 · 이름 앞 '심연') — 깊을수록 많이
 *  · 보상 배수 · 변형 적 조개 · 마일스톤(5 · 10 · 15 … 칭호 · 꾸미기) · 장비 닳음(수리 = 조개 — 후반 조개 쓰는 곳)
 */
export const ABYSS = {
  lv0: 10,
  hp: 0.07, dmg: 0.05,                 /* 깊이 1당 체력 · 피해 (+, 위협 Lv 10 배수 위에 곱함) */
  extra: 0.05, extraCap: 0.95, mix: 0.02, mixCap: 0.6,  /* 깊이 1당 방마다 적 +1 확률 · 새 적 섞임 */
  vp: [0.15, 0.035, 0.6],              /* 변형 적 비율: 기본 · 깊이당 · 상한 */
  loot: [1.25, 0.05, 2.5],             /* 상자 보상 배수: 기본 · 깊이당 · 상한 */
  vShell: [6, 1],                      /* 변형 적 하나 = 조개 (기본 + 깊이당) — 판 끝에 더함 (탈출해야) */
  variants: {
    hulk:  { name: '심연 거구',   w: 4, hp: 1.7, speed: 0.9, dmg: 1.15, rim: 0x9a6bff },
    hunt:  { name: '심연 사냥꾼', w: 4, hp: 1.15, speed: 1.25, cd: 0.75, sight: 1.2, rim: 0xc46bff },
    lord:  { name: '심연 우두머리', w: 1, hp: 2.4, speed: 1.05, cd: 0.85, dmg: 1.25, rim: 0xff6bd8, from: 3 }, /* 깊이 3부터 */
  },
  /* 장비 닳음 (깊은 물 판만): 판마다 +, 40 넘으면 방어 · 체력이 조금씩 줄어듦 → 은신처 '깊은 물' 칸에서 조개로 수리 */
  wear: { ext: [8, 0.6], dead: [18, 0.8], from: 40, armor: 1 / 120, hp: 0.25, cost: [4, 0.6] }, /* 탈출/실패: 기본 + 깊이당 · 수리값 = 닳음 × (기본 + 깊이당) */
  mile: [[3, 'cos', 'ac_pet_lamp'], [5, 'title', 't_deep5'], [10, 'title', 't_deep10'], [20, 'title', 't_deep20'], [30, 'title', 't_deep30']], /* 최고 탈출 깊이 마일스톤 (업적 심연 5 · 15 는 따로) */
};

/* ═════ 칭호 — 은신처 이름 아래 · 도전 결과에 보임 (능력치 0) ═════ */
export const TITLES = {
  t_new:      { name: '새내기 인양단' },
  t_hunter:   { name: '바다의 사냥꾼' },   t_five:     { name: '다섯 바다의 주인' }, t_anchor:  { name: '닻을 꺾은 수달' },
  t_legend:   { name: '물길의 전설' },     t_pilot:    { name: '다섯 물길 안내인' }, t_weather: { name: '날씨를 타는 수달' },
  t_keeper:   { name: '불 켜진 초소지기' },
  t_listener: { name: '파수의 목소리를 들은' }, t_gate: { name: '대수문 너머' }, t_seori: { name: '서리의 기록 친구' },
  t_silver:   { name: '은빛 물결' },       t_gold:     { name: '금빛 물결' },        t_abyss:   { name: '심연을 건넌 수달' },
  t_bare:     { name: '맨몸의 전설' },     t_rich:     { name: '조개 부자' },        t_mongi:   { name: '몽이의 단짝' },
  t_chal:     { name: '주간 도전자' },     t_tide:     { name: '물때를 아는 수달' },  t_wavelord: { name: '물결의 주인' },
  t_deep5:    { name: '심연 5' },          t_deep10:   { name: '심연 10' },          t_deep20:  { name: '심연 20' }, t_deep30: { name: '바닥 없는 바다' },
};
export const TITLE_KEYS = Object.keys(TITLES);

/* ═════ M5-B 꾸미기 키 (모델 · 팔레트 = M5-D · look.js COS 에 이 키로 넣으면 바로 옷장에) ═════
 *  slot = look.js COS slot · sw = 견본 색(제안) · get = 얻는 길 (look.js progress 는 null → 받는 일은 M5-B 코드가 함: 도전 물결 표 · 업적 · 깊은 물 마일스톤)
 *  COS 에 아직 없으면 S.cosPend 에 받아 두었다가 COS 에 생기는 날 S.owned 로 (ach.js flushPend) — 골드 판매 X(얻는 길 전용)
 */
export const M5B_COS = {
  /* 주간 도전 전용 (물결 표) */
  ch_h_crest:   { slot: 'head', name: '물결 투구 장식',     sw: '#5fd0e0', get: { t: 'chal', n: 2 },  note: '헬멧 위 물결 모양 볏' },
  ch_l_tide:    { slot: 'deco', name: '조류 등불',          sw: '#4fe0c0', get: { t: 'chal', n: 6 },  note: '랜턴 팔레트(LAMP) — 청록 유리 · 은 테', lamp: true },
  ch_b_wave:    { slot: 'body', name: '물결 잠수복',        sw: '#2a7f9a', get: { t: 'chal', n: 9 },  note: '잠수복 팔레트(SUIT) — 청록 몸 · 흰 물결 줄' },
  ch_s_medal:   { slot: 'skin', name: '총 스킨: 메달 금장',  sw: '#e8c25a', get: { t: 'chal', n: 15 }, note: '총 스킨 — 금 · 남색 띠' },
  ch_f_wave:    { slot: 'pattern', name: '물결 무늬',       sw: '#cfe9f2', get: { t: 'chal', n: 21 }, note: '털 무늬 — 등에서 꼬리로 물결 세 줄' },
  ch_pet_badge: { slot: 'pet', name: '몽이 도전 메달',      sw: '#e8c25a', get: { t: 'ach', id: 'a_chalW8' }, note: '몽이 목에 작은 메달' },
  /* 업적 · 깊은 물 */
  ac_s_abyss:   { slot: 'skin', name: '총 스킨: 심연',      sw: '#3b2a6a', get: { t: 'ach', id: 'a_abyssK' }, note: '보라 · 검정 · 은은한 빛' },
  ac_l_abyss:   { slot: 'deco', name: '심연 등불',          sw: '#9a6bff', get: { t: 'ach', id: 'a_abyss5' }, note: '랜턴 팔레트(LAMP) — 보라 유리', lamp: true },
  ac_b_abyss:   { slot: 'body', name: '심연 잠수복',        sw: '#24183f', get: { t: 'ach', id: 'a_abyss15' }, note: '잠수복 팔레트(SUIT) — 먹보라 · 보라 빛 줄' },
  ac_h_crown:   { slot: 'head', name: '대수문 관',          sw: '#d8c27a', get: { t: 'ach', id: 'a_ending' }, note: '낡은 수문 톱니로 만든 작은 관' },
  ac_fur_moon:  { slot: 'fur', name: '달빛 털',             sw: '#d9dde6', get: { t: 'ach', id: 'h_last' }, note: '털 색 — 은회색에 푸른 기' },
  ac_pet_lamp:  { slot: 'pet', name: '몽이 심연 꼬마등',    sw: '#9a6bff', get: { t: 'abyss', n: 3 }, note: '몽이 머리 위 보라 꼬마 등' },
};
export const M5B_COS_KEYS = Object.keys(M5B_COS);
