// 주인공 겉모습 — 꾸미기 목록 · 얻는 길 · [장착]+[겉모습] → 실제로 그릴 부품 목록 (three 없음 · node 시험 가능)
//   기능 장비(능력치)는 S.gear · S.equip · S.weapons 그대로. 꾸미기(능력치 0)는 S.look(고른 것) · S.owned(가진 것)
//   규칙(docs/CUSTOMIZE.md): 부위마다 [장착](능력치) + [겉모습](꾸미기 · 비우면 장착한 장비 모습)
//     · 총 개조 부품은 스킨을 씌워도 항상 보임 · 가방 크기는 늘 실제 단계 · 겉모습 바꾸기는 무료 · 언제든 끔
import { GEAR_FILES, CELLS, BACK_DECO } from './hero_gen.js?v=0.99.18';
import { ACHIEVEMENTS } from './data/achievements.js?v=0.99.18';

/* 털 색 6 (털 · 진한 털 · 귀 안 · 밝은 털) */
export const FUR = {
  brown:    { name: '갈색',   c: ['#8a5636', '#56331f', '#6b4029', '#ead6b4'] },
  chestnut: { name: '밤색',   c: ['#5e3523', '#38200f', '#4a2a1a', '#e3c9a4'] },
  sand:     { name: '모래색', c: ['#b9905e', '#7d5c35', '#93704a', '#f3e5c8'] },
  grey:     { name: '회갈색', c: ['#7c7266', '#4d463e', '#625a50', '#e4ddd2'] },
  choco:    { name: '진갈색', c: ['#3f2a20', '#24170f', '#33221a', '#cdb79a'] },
  silver:   { name: '은빛',   c: ['#a9a8a2', '#6d6c68', '#8a8984', '#f4f2ec'] },
  /* v0.6 (M3-A) */
  gold:     { name: '황금빛', c: ['#c08a3a', '#7a5220', '#9c6c2c', '#f6e2b0'] },
  cream:    { name: '크림',   c: ['#d8c09a', '#9c835e', '#b89d76', '#fbf3e2'] },
  ash:      { name: '잿빛',   c: ['#5d5a57', '#353331', '#4a4744', '#d2ccc4'] },
  /* M5-D (M5-B 업적 키 ac_fur_moon) */
  moon:     { name: '달빛',   c: ['#b9bec9', '#7b808c', '#989dab', '#eef1f6'] },
};
/* 무늬 4 — 무늬 칸(평소엔 바탕 털 색과 같아 안 보임)에 색을 넣음 */
export const PATTERN = {
  tail:   { name: '흰 끝 꼬리', cell: 'pat_tail',   col: f => f[3] },
  cheek:  { name: '볼 점',      cell: 'pat_cheek',  col: f => f[1] },
  stripe: { name: '등 줄',      cell: 'pat_stripe', col: f => f[1] },
  eye:    { name: '눈 둘레',    cell: 'pat_eye',    col: f => f[3] },
  /* v0.6 — 두 칸 같이 */
  spots:  { name: '볼 점 + 흰 꼬리', cell: ['pat_cheek', 'pat_tail'], col: [f => f[1], f => f[3]] },
  mask:   { name: '눈 둘레 + 등 줄', cell: ['pat_eye', 'pat_stripe'], col: [f => f[3], f => f[1]] },
  /* M5-D (M5-B 도전 키 ch_f_wave) — 등 줄 + 꼬리 끝을 물빛으로 */
  wave:   { name: '물결 무늬', cell: ['pat_stripe', 'pat_tail', 'pat_cheek'], col: [() => '#cfe9f2', () => '#cfe9f2', () => '#9fd6e6'] },
};
/* 총 스킨 (총 몸통 · 줄무늬 색만 — 개조 부품 색 띠는 그대로) */
export const SKIN = {
  brass: { name: '황동',     pal: { gun_body: '#8c6a2f', gun_accent: '#f0cf86', gun_grip: '#5a3f22' } },
  coral: { name: '산호',     pal: { gun_body: '#b9503a', gun_accent: '#ffd9b8', gun_grip: '#3d2a24' } },
  glass: { name: '바다 유리', pal: { gun_body: '#2c7570', gun_accent: '#b3f2e4', gun_grip: '#1f3b3a' } },
  /* v0.6 */
  ember: { name: '불씨',     pal: { gun_body: '#3a2a26', gun_accent: '#ff7a3a', gun_grip: '#1e1715' } },
  night: { name: '밤바다',   pal: { gun_body: '#1d2a44', gun_accent: '#9fc3ff', gun_grip: '#121a2b' } },
  moss:  { name: '빛이끼',   pal: { gun_body: '#2f4a36', gun_accent: '#7dffb2', gun_grip: '#1c2a20' } },
  bone:  { name: '뼈 흰색',  pal: { gun_body: '#d9d2c2', gun_accent: '#7a6a54', gun_grip: '#4a4036' } },
  gold:  { name: '황금',     pal: { gun_body: '#b8892e', gun_accent: '#fff0b8', gun_grip: '#5a3f22' } },
  ice:   { name: '얼음',     pal: { gun_body: '#a9d6e5', gun_accent: '#ffffff', gun_grip: '#4f7a8a' } },
  /* M5-D */
  pearl: { name: '진주',     pal: { gun_body: '#e8e0d8', gun_accent: '#f2a6b8', gun_grip: '#8a7a6e' } },
  medal: { name: '메달 금장', pal: { gun_body: '#c9a040', gun_accent: '#26355a', gun_grip: '#5a3f22' } },
  abyss: { name: '심연',     pal: { gun_body: '#2a2040', gun_accent: '#b48aff', gun_grip: '#151020' } },
};
const SUIT = (s, a, g, k, c) => ({ suit: s, suit_accent: a, glove: g, boot: g, knee: k, cape: c });
const LAMP = (f, g, l) => ({ lantern_frame: f, lamp_body: f, lantern_glass: g, lamp_lens: l, band: f });

/* goldNext: v0.6 새 꾸미기의 골드 가격 제안 (서버 가격표 SHOP.salvage 에 들어가면 gold 로 바꿈 — 그 전엔 골드 판매 없음 · 조개 · 플레이 길만)
   꾸미기 목록 — get: 얻는 길(플레이 · 의뢰 · 조개) · gold: 원어데이 골드 가격(표시만 · 판매는 다음 단계) */
export const COS = {
  /* 머리 */
  h_brass:    { slot: 'head', name: '황동 잠수 헬멧', from: 'A', get: { t: 'boss', n: 5 }, gold: 60, sw: '#c99a4a' },
  h_beanie:   { slot: 'head', name: '주황 비니 + 물안경', from: 'C', get: { t: 'daily', n: 7 }, gold: 30, sw: '#e2672c' },
  h_rainhat:  { slot: 'head', name: '우비 모자', from: 'B', get: { t: 'shells', n: 120 }, gold: 30, sw: '#d9a632' },
  h_sailor:   { slot: 'head', name: '선원 모자', get: { t: 'shells', n: 120 }, gold: 30, sw: '#eef0f2' },
  h_bandana:  { slot: 'head', name: '반다나', get: { t: 'raids', n: 10 }, gold: 30, sw: '#c1453b' },
  h_fisher:   { slot: 'head', name: '어부 모자', get: { t: 'shells', n: 140 }, gold: 30, sw: '#8a9a6a' },
  h_mechanic: { slot: 'head', name: '정비 모자', get: { t: 'trader', n: 180 }, gold: 30, sw: '#3f5a6a' },
  h_kelp:     { slot: 'head', name: '해초 화관', get: { t: 'ach', id: 'a_deep' }, gold: 40, sw: '#4f8a4a' },
  /* 몸 */
  b_raincoat: { slot: 'body', name: '노란 우비', from: 'B', get: { t: 'quest', id: 'q10' }, gold: 50, sw: '#d9a632' },
  b_navy:     { slot: 'body', name: '남색 잠수복', get: { t: 'ach', id: 'a_ext100' }, gold: 50, sw: '#26355a', pal: SUIT('#26355a', '#ffd36b', '#161f36', '#2e4170', '#2b3550') },
  b_coral:    { slot: 'body', name: '산호 잠수복', get: { t: 'shells', n: 220 }, gold: 50, sw: '#c9573e', pal: SUIT('#b9503a', '#ffe0b8', '#3d2a24', '#c66450', '#5a3a34') },
  b_sand:     { slot: 'body', name: '모래 작업복', get: { t: 'trader', n: 260 }, gold: 50, sw: '#b9905e', pal: SUIT('#a88758', '#3f5a6a', '#5a4630', '#b8986a', '#6b5a44') },
  b_ink:      { slot: 'body', name: '먹빛 잠수복', get: { t: 'extracts', n: 40 }, gold: 50, sw: '#1c1d22', pal: SUIT('#1c1d22', '#7dffb2', '#101114', '#26282e', '#24262c') },
  b_white:    { slot: 'body', name: '흰 구조복',   get: { t: 'trader', n: 320 }, gold: 50, sw: '#e8e4da', pal: SUIT('#e4dfd3', '#e0503a', '#8c8a84', '#d2cdc0', '#b8b4aa') },
  b_moss:     { slot: 'body', name: '이끼색 잠수복', get: { t: 'boss', n: 10 }, gold: 50, sw: '#3f6a4a', pal: SUIT('#3a5e44', '#9ff0c8', '#22382a', '#46705a', '#34503e') },
  suit_teal:  { slot: 'body', name: '청록 잠수복', from: 'A', get: { t: 'shells', n: 200 }, gold: 50, sw: '#2d6a73', pal: { suit: '#2a5f68', suit_accent: '#e0b65a', glove: '#1f3e44', boot: '#1f3e44', knee: '#2f6b74', cape: '#35505a' } },
  /* 얼굴 (기본 = 크림 목도리) */
  f_scarf_coral: { slot: 'face', name: '산호 스카프', get: { t: 'shells', n: 80 }, gold: 20, sw: '#ff7a59' },
  f_mask:     { slot: 'face', name: '잠수 마스크', get: { t: 'boss', n: 1 }, gold: 30, sw: '#3f8f9a' },
  f_none:     { slot: 'face', name: '목 비우기', get: { t: 'free' }, sw: '#3a434d' },
  /* 등 장식 (기본 = 랜턴 통) */
  k_tank:     { slot: 'deco', name: '황동 산소통', from: 'A', get: { t: 'vault', n: 1 }, gold: 40, sw: '#c99a4a' },
  l_teal:     { slot: 'deco', name: '청록 등불', lamp: true, get: { t: 'ach', id: 'a_boss3' }, gold: 30, sw: '#6fe0d8', pal: LAMP('#3a6a68', '#9ff8f0', '#d8fffb') },
  l_gold:     { slot: 'deco', name: '금 등불',   lamp: true, get: { t: 'ach', id: 'a_facAll' }, gold: 30, sw: '#ffd36b', pal: LAMP('#a8782a', '#ffe9a0', '#fff6d0') },
  l_violet:   { slot: 'deco', name: '보라 등불', lamp: true, get: { t: 'trader', n: 200 }, gold: 30, sw: '#b59cff', pal: LAMP('#4a3a6a', '#d6c8ff', '#f0eaff') },
  /* 원어데이 소장자 전용 (bm-policy 4장 · 판매 X) — 기본 랜턴 통 · 헤드램프를 금장으로 (메시 그대로 · 팔레트 칸만) */
  o_gold:     { slot: 'deco', name: '등불 수색대 금장', owner: true, get: { t: 'owner' }, sw: '#e0b24a', pal: { lantern_frame: '#c9962e', lamp_body: '#c9962e', lantern_glass: '#ffe08a', lamp_lens: '#fff1b8', band: '#e0b24a' } },
  /* 총 스킨 */
  s_brass:    { slot: 'skin', name: '총 스킨: 황동', skin: 'brass', get: { t: 'shells', n: 150 }, gold: 40, sw: '#c99a4a' },
  s_coral:    { slot: 'skin', name: '총 스킨: 산호', skin: 'coral', get: { t: 'extracts', n: 15 }, gold: 40, sw: '#b9503a' },
  s_glass:    { slot: 'skin', name: '총 스킨: 바다 유리', skin: 'glass', get: { t: 'shells', n: 150 }, gold: 40, sw: '#2c7570' },
  s_ember:    { slot: 'skin', name: '총 스킨: 불씨', skin: 'ember', get: { t: 'ach', id: 'a_kill300' }, gold: 40, sw: '#ff7a3a' },
  s_night:    { slot: 'skin', name: '총 스킨: 밤바다', skin: 'night', get: { t: 'ach', id: 'a_gun10' }, gold: 40, sw: '#1d2a44' },
  s_moss:     { slot: 'skin', name: '총 스킨: 빛이끼', skin: 'moss', get: { t: 'trader', n: 180 }, gold: 40, sw: '#2f4a36' },
  s_bone:     { slot: 'skin', name: '총 스킨: 뼈 흰색', skin: 'bone', get: { t: 'kills', n: 150 }, gold: 40, sw: '#d9d2c2' },
  s_gold:     { slot: 'skin', name: '총 스킨: 황금', skin: 'gold', get: { t: 'vault', n: 10 }, gold: 40, sw: '#b8892e' },
  s_ice:      { slot: 'skin', name: '총 스킨: 얼음', skin: 'ice', get: { t: 'shells', n: 200 }, gold: 40, sw: '#a9d6e5' },
  /* 털 색 */
  fur_brown:    { slot: 'fur', fur: 'brown', name: '갈색', get: { t: 'free' } },
  fur_chestnut: { slot: 'fur', fur: 'chestnut', name: '밤색', get: { t: 'free' } },
  fur_sand:     { slot: 'fur', fur: 'sand', name: '모래색', get: { t: 'shells', n: 60 }, gold: 10 },
  fur_grey:     { slot: 'fur', fur: 'grey', name: '회갈색', get: { t: 'shells', n: 60 }, gold: 10 },
  fur_choco:    { slot: 'fur', fur: 'choco', name: '진갈색', get: { t: 'extracts', n: 10 }, gold: 10 },
  fur_silver:   { slot: 'fur', fur: 'silver', name: '은빛', get: { t: 'shells', n: 150 }, gold: 20 },
  fur_gold:     { slot: 'fur', fur: 'gold', name: '황금빛', get: { t: 'ach', id: 'a_best1500' }, gold: 20 },
  fur_cream:    { slot: 'fur', fur: 'cream', name: '크림', get: { t: 'shells', n: 90 }, gold: 10 },
  fur_ash:      { slot: 'fur', fur: 'ash', name: '잿빛', get: { t: 'trader', n: 120 }, gold: 10 },
  /* 무늬 */
  pat_tail:   { slot: 'pattern', pattern: 'tail', name: '흰 끝 꼬리', get: { t: 'free' } },
  pat_cheek:  { slot: 'pattern', pattern: 'cheek', name: '볼 점', get: { t: 'shells', n: 40 }, gold: 10 },
  pat_stripe: { slot: 'pattern', pattern: 'stripe', name: '등 줄', get: { t: 'shells', n: 40 }, gold: 10 },
  pat_eye:    { slot: 'pattern', pattern: 'eye', name: '눈 둘레', get: { t: 'kills', n: 50 }, gold: 10 },
  pat_spots:  { slot: 'pattern', pattern: 'spots', name: '볼 점 + 흰 꼬리', get: { t: 'ach', id: 'a_charm' }, gold: 10 },
  pat_mask:   { slot: 'pattern', pattern: 'mask', name: '눈 둘레 + 등 줄', get: { t: 'shells', n: 80 }, gold: 10 },
  /* 몽이 */
  pet_scarf:  { slot: 'pet', name: '몽이 목도리', mesh: 'f_scarf_coral', part: 'face', get: { t: 'fac', k: 'aquarium', lv: 2 }, gold: 20, sw: '#ff7a59' },
  pet_cap:    { slot: 'pet', name: '몽이 선원 모자', mesh: 'h_sailor', part: 'head', get: { t: 'shells', n: 60 }, gold: 20, sw: '#26355a' },

  /* ═════ M5-D 꾸미기 50 → 80 (2026-11-09 · 메시 tools/hero3d/cos_m5.py · 칸 palette.json 144~) ═════
   *  내 것 18: 머리 5 · 겉옷 4(메시) · 가방 색 2(새 칸 'bag') · 등불 3 · 총 스킨 1 · 몽이 3 — 조개 · 행상 · 플레이 길 + 골드(SHOP.salvage)
   *  M5-B 키 12 (data/m5b.js M5B_COS 이름 · 얻는 길 그대로 · 받는 일은 M5-B 코드: 도전 물결 표 · 업적 · 깊은 물) — 골드 판매 X */
  h_straw:    { slot: 'head', name: '밀짚 모자', get: { t: 'shells', n: 160 }, gold: 30, sw: '#d8b46a' },
  h_keeper:   { slot: 'head', name: '등대지기 모자', get: { t: 'trader', n: 260 }, gold: 40, sw: '#1f2b44' },
  h_radio:    { slot: 'head', name: '무전 헤드셋', get: { t: 'raids', n: 60 }, gold: 30, sw: '#3a4048' },
  h_octo:     { slot: 'head', name: '문어 모자', get: { t: 'shells', n: 300 }, gold: 40, sw: '#c75a7a' },
  h_earflap:  { slot: 'head', name: '귀달이 털모자', get: { t: 'shells', n: 180 }, gold: 30, sw: '#6a4a3a' },
  b_poncho:   { slot: 'body', name: '방수 판초', get: { t: 'shells', n: 260 }, gold: 50, sw: '#3f7a6a' },
  b_parka:    { slot: 'body', name: '털 파카', get: { t: 'trader', n: 380 }, gold: 50, sw: '#c8553a' },
  b_apron:    { slot: 'body', name: '작업 앞치마', get: { t: 'fac', k: 'bench', lv: 4 }, gold: 50, sw: '#8a6a4a' },
  b_kelpcloak:{ slot: 'body', name: '해초 망토', get: { t: 'kills', n: 800 }, gold: 50, sw: '#2f6a4a' },
  g_leather:  { slot: 'bag', name: '가죽 가방', get: { t: 'shells', n: 120 }, gold: 30, sw: '#8a5a34', pal: { bag_a: '#8a5a34', bag_b: '#5e3a20', bag_strap: '#2a1d14', bag_patch: '#c99a4a', bedroll: '#7a3a2e' } },
  g_navy:     { slot: 'bag', name: '남색 가방', get: { t: 'trader', n: 160 }, gold: 30, sw: '#2c3a5a', pal: { bag_a: '#2c3a5a', bag_b: '#1f2940', bag_strap: '#e8d8b0', bag_patch: '#ffd36b', bedroll: '#c9573e' } },
  d_jar:      { slot: 'deco', name: '반딧불 병', get: { t: 'shells', n: 220 }, gold: 40, sw: '#d8ff7a' },
  d_buoy:     { slot: 'deco', name: '부표 등불', get: { t: 'trader', n: 280 }, gold: 40, sw: '#d0403a' },
  d_shellamp: { slot: 'deco', name: '조개 등불', get: { t: 'vault', n: 25 }, gold: 40, sw: '#f2b8a8' },
  s_pearl:    { slot: 'skin', name: '총 스킨: 진주', skin: 'pearl', get: { t: 'shells', n: 240 }, gold: 40, sw: '#e8e0d8' },
  pet_beanie: { slot: 'pet', name: '몽이 비니', mesh: 'h_beanie', part: 'head', get: { t: 'shells', n: 80 }, gold: 20, sw: '#e2672c' },
  pet_tank:   { slot: 'pet', name: '몽이 산소통', mesh: 'k_tank', part: 'back', get: { t: 'trader', n: 120 }, gold: 20, sw: '#c99a4a' },
  pet_straw:  { slot: 'pet', name: '몽이 밀짚 모자', mesh: 'h_straw', part: 'head', get: { t: 'fac', k: 'aquarium', lv: 3 }, gold: 20, sw: '#d8b46a' },
  /* M5-B 키 — 주간 도전 물결 표 */
  ch_h_crest:   { slot: 'head', name: '물결 투구 장식', get: { t: 'chal', n: 2 }, sw: '#5fd0e0' },
  ch_l_tide:    { slot: 'deco', name: '조류 등불', lamp: true, get: { t: 'chal', n: 6 }, sw: '#4fe0c0', pal: LAMP('#9aa6ad', '#7ff0d0', '#d8fff4') },
  ch_b_wave:    { slot: 'body', name: '물결 잠수복', get: { t: 'chal', n: 9 }, sw: '#2a7f9a', pal: SUIT('#2a7f9a', '#f2fbff', '#1d5566', '#2f8aa6', '#25657a') },
  ch_s_medal:   { slot: 'skin', name: '총 스킨: 메달 금장', skin: 'medal', get: { t: 'chal', n: 15 }, sw: '#e8c25a' },
  ch_f_wave:    { slot: 'pattern', pattern: 'wave', name: '물결 무늬', get: { t: 'chal', n: 21 } },
  ch_pet_badge: { slot: 'pet', name: '몽이 도전 메달', mesh: 'ch_pet_badge', part: 'face', get: { t: 'ach', id: 'a_chalW8' }, sw: '#e8c25a' },
  /* M5-B 키 — 업적 · 깊은 물 */
  ac_s_abyss:   { slot: 'skin', name: '총 스킨: 심연', skin: 'abyss', get: { t: 'ach', id: 'a_abyssK' }, sw: '#3b2a6a' },
  ac_l_abyss:   { slot: 'deco', name: '심연 등불', lamp: true, get: { t: 'ach', id: 'a_abyss5' }, sw: '#9a6bff', pal: LAMP('#2a2040', '#b48aff', '#e6d8ff') },
  ac_b_abyss:   { slot: 'body', name: '심연 잠수복', get: { t: 'ach', id: 'a_abyss15' }, sw: '#24183f', pal: SUIT('#24183f', '#b48aff', '#150e26', '#2e2050', '#1e1534') },
  ac_h_crown:   { slot: 'head', name: '대수문 관', get: { t: 'ach', id: 'a_ending' }, sw: '#d8c27a' },
  ac_fur_moon:  { slot: 'fur', fur: 'moon', name: '달빛 털', get: { t: 'ach', id: 'h_last' } },
  /* M5 통합 — 엔딩 꾸미기 3 (S.story.endings 에 그 길이 있으면 은신처에 들어올 때 받음 · 옛 저장도 · 골드 X) */
  b_mudboots:   { slot: 'body', name: '진흙 장화', keep: ['cape', 'harness'], get: { t: 'ending', k: 'land' }, sw: '#3f5a3a' },
  d_festlamp:   { slot: 'deco', name: '축제 등롱', get: { t: 'ending', k: 'lamp' }, sw: '#ff6a4a' },
  f_farsea:     { slot: 'face', name: '먼 바다 목도리', get: { t: 'ending', k: 'sea' }, sw: '#1f3f78' },
  ac_pet_lamp:  { slot: 'pet', name: '몽이 심연 꼬마등', mesh: 'ac_pet_lamp', part: 'head', get: { t: 'abyss', n: 3 }, sw: '#9a6bff' },
};
for (const k in COS) { const c = COS[k]; if (c.fur) c.sw = FUR[c.fur].c[0]; if (c.pattern) { const P = PATTERN[c.pattern]; c.sw = (Array.isArray(P.col) ? P.col[0] : P.col)(FUR.brown.c); } }
/* 얻는 길 묶음 (옷장 거르개) — play: 플레이 기록 · shells: 고물상 조개 · trader: 바람 행상 · ach: 업적 · chal: 주간 도전 · 깊은 물 · free · owner */
export const SRC = { free: 'free', shells: 'shells', trader: 'trader', ach: 'ach', chal: 'chal', abyss: 'chal', ending: 'ach', owner: 'owner' };
export const srcOf = k => SRC[COS[k]?.get?.t] || 'play';
export const COS_KEYS = Object.keys(COS);
export const FREE = COS_KEYS.filter(k => COS[k].get.t === 'free');
/* 실행 중에만 아는 값 (bmflow 가 원어데이 hello 뒤 채움) — owner: 원어데이 소장자 */
export const RT = { owner: false };
export const freshLook = () => ({ head: null, body: null, face: null, deco: null, skin: null, bag: null, fur: 'fur_brown', pattern: null, pet: [] });
/* 겉모습 칸 (fur · pet 빼고) — 저장 정리 · 옷장 저장에 씀 */
export const LOOK_SLOTS = ['head', 'body', 'face', 'deco', 'skin', 'bag', 'pattern'];

/* 얻는 길 문구 · 진행 */
const QN = { q10: '의뢰 10 금고실 털이' };
const ENDN = { land: '닫힌 수문', lamp: '물 위의 등불', sea: '기억의 바다' };
const FACN = { aquarium: '수족관', bench: '작업대', rack: '무기대', lights: '조명', dock: '선착장' };
const ACH_NAME = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a.hidden ? '숨은 업적' : a.name]));
export function getText(k) {
  const g = COS[k].get;
  return { free: '무료', shells: `조개 ${g.n}`, quest: `${QN[g.id] || g.id} 보상`, boss: g.n > 1 ? `수문지기 ${g.n}회 처치` : '수문지기 첫 처치', daily: `오늘의 인양 납품 ${g.n}번`, raids: `출격 ${g.n}번`, extracts: `탈출 ${g.n}번`, kills: `적 ${g.n}마리`, vault: g.n > 1 ? `금고실 털고 탈출 ${g.n}번` : '금고실 털고 탈출', fac: `${FACN[g.k] || g.k} ${g.lv}단계`, chal: `주간 도전 물결 ${g.n}`, ending: `엔딩 '${ENDN[g.k] || g.k}' 보기`, abyss: `깊은 물 깊이 ${g.n} 탈출`, owner: '원어데이 소장자 전용', trader: `바람 행상 · 조개 ${g.n}`, ach: `업적 '${ACH_NAME[g.id] || g.id}'` }[g.t];
}
export function progress(S, k) {
  const g = COS[k].get, st = S.stats || {};
  switch (g.t) {
    case 'free': return [1, 1];
    case 'shells': return null;
    case 'quest': return [(S.quests?.done || []).includes(g.id) ? 1 : 0, 1];
    case 'boss': return [Math.min(g.n, st.bosses || 0), g.n];
    case 'daily': return [Math.min(g.n, st.daily || 0), g.n];
    case 'raids': return [Math.min(g.n, st.raids || 0), g.n];
    case 'extracts': return [Math.min(g.n, st.extracts || 0), g.n];
    case 'kills': return [Math.min(g.n, st.kills || 0), g.n];
    case 'vault': return [Math.min(g.n, st.vaults || 0), g.n];
    case 'fac': return [Math.min(g.lv, S.fac?.[g.k] || 0), g.lv];
    case 'ending': return [S.story?.endings?.[g.k] || S.story?.ending === g.k ? 1 : 0, 1]; /* 본 엔딩 길 (옛 저장: ending 만 있어도) */
  }
  return null;
}
export const owns = (S, k) => FREE.includes(k) || (S.owned || []).includes(k) || !!(COS[k]?.owner && RT.owner);
/* 플레이 조건을 채운 꾸미기를 받음 → 새로 받은 것 목록 (은신처 들어올 때 · 결과 뒤) */
export function grantEarned(S) {
  const got = []; S.owned ||= [];
  for (const k of COS_KEYS) { if (owns(S, k)) continue; const p = progress(S, k); if (p && p[0] >= p[1]) { S.owned.push(k); got.push(k); } }
  return got;
}
/* 플레이 밖에서 주는 꾸미기 (주간 도전 물결 표 · 깊은 물 마일스톤 — M5-B 가 부름) → 새로 받았으면 true */
export function grantCos(S, k) { if (!COS[k] || owns(S, k)) return false; (S.owned ||= []).push(k); return true; }
/* 조개로 사기 (고물상) */
export function buyCos(S, k) {
  const g = COS[k].get; if (owns(S, k)) return { ok: false, why: 'owned' };
  if (g.t !== 'shells') return { ok: false, why: 'locked' };
  if ((S.shells || 0) < g.n) return { ok: false, why: 'cost' };
  S.shells -= g.n; (S.owned ||= []).push(k); return { ok: true };
}
/* 겉모습 고르기 (가진 것만 · 같은 걸 다시 누르면 끔) */
export function setLook(S, k) {
  const c = COS[k]; if (!owns(S, k)) return false; const L = S.look ||= freshLook();
  if (c.slot === 'fur') L.fur = k;
  else if (c.slot === 'pet') { const had = (L.pet || []).includes(k); L.pet = (L.pet || []).filter(x => COS[x].part !== c.part); if (!had) L.pet.push(k); }
  else L[c.slot] = L[c.slot] === k ? null : k;
  return true;
}
export function clearLook(S, slot) { const L = S.look ||= freshLook(); if (slot === 'fur') L.fur = 'fur_brown'; else if (slot === 'pet') L.pet = []; else L[slot] = null; }

/* ───── 그릴 부품 정하기 ─────
 * 입력: { gear:{vest,helmet,bag}, look, weapons:[{key, mods:{scope,barrel,mag,chamber}}] }
 * 출력: { groups:[hero.glb 안 그룹], parts:[{file, off:[x,y,z]}], weapons:[[{file, off}]], pal:{칸:색}, wpal:{칸:색}, files:[받을 파일] }
 */
export function resolve({ gear = { vest: 0, helmet: 0, bag: 0 }, look = freshLook(), weapons = [], pet = false, back }) {
  const L = Object.assign(freshLook(), look || {});
  const groups = ['body', 'ears']; const parts = []; const pal = {}; const wpal = {};
  const fur = FUR[COS[L.fur]?.fur || 'brown'].c;
  Object.assign(pal, { fur: fur[0], fur_dark: fur[1], ear_in: fur[2], fur_light: fur[3], pat_tail: fur[0], pat_stripe: fur[0], pat_eye: fur[0], pat_cheek: fur[3] });
  const pat = L.pattern && COS[L.pattern] ? PATTERN[COS[L.pattern].pattern] : null; if (pat) [].concat(pat.cell).forEach((c, i) => { pal[c] = [].concat(pat.col)[i](fur); });
  if (pet) {
    /* 몽이: 잠수복 대신 털 그대로 (진짜 수달처럼) · 장식 2칸 */
    Object.assign(pal, { suit: fur[0], suit_accent: fur[0], glove: fur[1], boot: fur[1], sole: fur[1], knee: fur[0], pat_tail: fur[3] });
    for (const k of L.pet || []) if (COS[k]?.mesh) parts.push({ file: COS[k].mesh, off: [0, 0, 0] });
    if ((L.pet || []).includes('pet_cap')) Object.assign(pal, { sailor_white: '#26355a', sailor_navy: '#f0683a' });
    return finish(groups, parts, [], pal, wpal);
  }
  /* 머리: 겉모습 > 헬멧 단계 > 기본 머리띠 + 헤드램프 */
  const head = L.head && COS[L.head] ? L.head : gear.helmet > 0 ? 'helm' + gear.helmet : null;
  if (head) parts.push({ file: head, off: [0, 0, 0] }); else groups.push('band');
  /* 몸: 겉모습(우비 = 메시 · 청록 잠수복 = 색) > 방어구 단계 > 기본 잠수복(멜빵) */
  if (L.body && GEAR_FILES[L.body]) { parts.push({ file: L.body, off: [0, 0, 0] }); if (COS[L.body]?.keep) groups.push(...COS[L.body].keep); } /* 메시 겉옷(우비 · 판초 · 파카 · 앞치마 · 해초 망토 · 진흙 장화 = 잠수복 · 멜빵 그대로) */
  else if (L.body && COS[L.body]?.pal) { Object.assign(pal, COS[L.body].pal); groups.push('cape', 'harness'); }
  else if (gear.vest > 0) { parts.push({ file: 'vest' + gear.vest, off: [0, 0, 0] }); groups.push('cape'); }
  else groups.push('cape', 'harness');
  /* 얼굴: 겉모습 > 기본 크림 목도리 */
  if (L.face === 'f_none' || head === 'h_brass') { /* 비움 · 황동 헬멧은 목 고리까지 덮음 */ }
  else if (L.face && COS[L.face]) parts.push({ file: L.face, off: [0, 0, 0] });
  else groups.push('scarf');
  /* 등: 가방은 늘 실제 단계 크기 · 등 장식(랜턴/산소통)은 가방 옆으로 비킴 */
  const bt = Math.max(0, Math.min(5, back ?? gear.bag ?? 0));
  parts.push({ file: 'bag' + bt, off: [0, 0, 0] });
  if (L.bag && COS[L.bag]?.pal) Object.assign(pal, COS[L.bag].pal); /* M5-D 가방 색: 크기는 그대로 · 칸 색만 */
  const d0 = BACK0, d1 = BACK[bt]; const off = [d1[0] - d0[0], d1[1] - d0[1], d1[2] - d0[2]];
  if (L.deco && COS[L.deco]?.pal) { groups.push({ name: 'lantern', off }); Object.assign(pal, COS[L.deco].pal); } /* 소장자 금장 · v0.6 등불 색 — 메시 그대로 · 칸 색만 */
  else if (L.deco && COS[L.deco]) parts.push({ file: L.deco, off }); else groups.push({ name: 'lantern', off });
  /* 무기: 몸통 + 개조 부품(항상 보임) · 스킨은 색만 */
  const ws = weapons.map(w => {
    const f = 'w_' + w.key; const A = GEAR_FILES[f]?.anchors || {}; const list = [{ file: f, off: [0, 0, 0] }];
    for (const m of ['scope', 'barrel', 'mag', 'chamber', 'grip']) { const mk = Math.min(3, w.mods?.[m] || 0); if (mk > 0 && A[m]) list.push({ file: `mod_${m}${mk}`, off: A[m] }); } /* 특수 부품(4) = Mk3 모양 · 근접은 자리가 있는 칸만 */
    return list;
  });
  if (L.skin && COS[L.skin]) Object.assign(wpal, SKIN[COS[L.skin].skin].pal);
  return finish(groups, parts, ws, pal, wpal);
}
const BACK0 = BACK_DECO[0], BACK = BACK_DECO;
function finish(groups, parts, weapons, pal, wpal) {
  groups = groups.map(g => typeof g === 'string' ? { name: g, off: [0, 0, 0] } : g);
  const files = [...new Set([...parts.map(p => p.file), ...weapons.flat().map(p => p.file)])];
  const key = JSON.stringify([groups, parts, pal]); const wkey = JSON.stringify([weapons, wpal]);
  return { groups, parts, weapons, pal, wpal, files, key, wkey };
}
/* 세이브 → resolve 입력 */
export function lookOf(S, { both = false } = {}) {
  const w = k => ({ key: k, mods: S.weapons?.[k] || {} });
  const main = S.equip?.main in (S.weapons || {}) ? S.equip.main : 'pistol';
  const ws = [w(main)]; if (both && S.equip?.side && S.weapons?.[S.equip.side] && S.equip.side !== main) ws.push(w(S.equip.side));
  return { gear: S.gear || { vest: 0, helmet: 0, bag: 0 }, look: S.look, weapons: ws };
}
export const ALL_FILES = Object.keys(GEAR_FILES);
export const cellIndex = n => CELLS[n]?.[0];
