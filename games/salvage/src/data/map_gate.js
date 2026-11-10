// 6장 최종 무대 '대수문 꼭대기' 데이터 (M5-A · v0.8) — 지도 · 최종 보스 '파수'(대수문 관제 코어 방어체) · 지도 상태 · 전리품 · 기억 조각
//  data.js 가 이 파일을 읽어 MAPS · ENEMIES · BOSS · VARIANTS · CONDS · ITEMS · LOOT_TABLE 에 펼침 (숫자 조정은 여기서만)
//  NARRATIVE 3-6: 검은 닻 두목이 장어 코어를 꽂자 파수가 비상 방어로 — 관제탑 전체가 적. 수문 팔 · 수압 탄 · 기억 목록이 빛 탄으로 쏟아짐 → 쓰러뜨린 뒤 '돌려받은 기억'
//  지도 = 고정 무대 (plan_gate.js — 승강로 → 대수문 계단 → 꼭대기 32m 무대) · 판 길이 짧음(2~4분) · 6장 걸음 b_final 이 열면(해금 키 'map_gate') 출격 목록에 나옴 · 엔딩 뒤에도 다시 붙을 수 있음

export const G_UNLOCK = 'map_gate';

export const G_MAP = {
  name: '대수문 꼭대기', short: '대수문', icon: '🌊', unlock: G_UNLOCK, lock: '6장 「대수문」에서 열려요', pack: 'gate', bossKind: 'pasu', night: 0.55, final: true,
  blurb: '승강로 → 대수문 계단 → 꼭대기 관제 코어', tips: '파수의 큰 공격은 모두 바닥에 먼저 보여요 — 줄은 옆으로, 원은 밖으로, 붉은 바닥은 빛나는 원 안으로. 수문 팔이 박히면 가슴 코어가 약점',
  zones: {
    1: { name: '승강로', short: '승강로', hp: 1.9, dmg: 1.6, boxes: { gstair: 60, locker: 40 }, nLoot: [1, 1], nEnemy: [0, 0], foes: { drone: 100 } },
    2: { name: '대수문 계단', short: '계단', hp: 2.1, dmg: 1.8, boxes: { gstair: 70, chest: 30 }, nLoot: [2, 2], nEnemy: [2, 2], foes: { drone: 55, warden: 45 } },
    3: { name: '꼭대기 관제 코어', short: '꼭대기', hp: 2.3, dmg: 1.9, boxes: { chest: 100 }, nLoot: [1, 1], nEnemy: [0, 0], elite: true, foes: { drone: 100 } } },
  exits: { early: '승강로 승강기', power: '관제 승강기', sub: '꼭대기 구조 보트' },
  conds: { gale: 100 }, loot: 1.6, floodAt: 1e9,
};

/* 최종 보스 — 체력 · 단계 · 패턴 숫자 (raid.js 공통 + gate.js)
 *  1단계(100~66%): 수문 팔 내려치기(줄 1.0초 → 박혀 2.2초 = 가슴 코어 약점 ×2) · 수압 탄 부채(5발 · 겨냥 줄 0.6초)
 *  ── 단계 바뀜 ① 66%: 2.6초 멈춤(무적) · 수리 드론 2 · 렌즈 청록 → 화면 고리 빠르게
 *  2단계(66~33%): + 기억 비(떨어질 자리 원 6 · 1.0초) · 수문 닫기(무대 반쪽 붉은 칸 1.4초 → 휩쓸기)
 *  ── 단계 바뀜 ② 33%: 3.0초 멈춤 · 폭풍 · 수리 드론 2 · 장어 코어가 드러남(이후 약점 ×1.5 늘 · 박히면 ×2.5)
 *  3단계(33~0%): + 해일 경보(무대 전체 붉게 2.0초 → 빛나는 원 3 안만 안전) · 내려치기 빨라짐 · 패턴 사이 짧아짐
 *  모든 큰 공격(15 이상)은 예고가 0.6초 넘게 보임 → raid.hurt 의 '예고 없는 큰 피해' 검사 0 */
export const G_ENEMIES = {
  pasu: { name: '파수', hp: 5200, speed: 0.35, chase: 0.6, sight: 7, fov: 6.3, hear: 0.5, atk: 'pasu', dmg: 30, range: 26, cd: 2.2, radius: 1.7, loot: 'bossP', boss: true, fac: 'machine', machine: true, turn: 1.6 },
};
export const G_BOSS = {
  pasu: {
    phase: [0.66, 0.33], shift: [2.6, 3.0], adds: [2, 2], cdMul: [1, 0.85, 0.72],
    slam: { wind: 1.0, wind3: 0.8, len: 15, w: 2.6, dmg: 30, stuck: 2.2 },
    volley: { wind: 0.65, n: 5, spread: 0.9, dmg: 12, speed: 11, r: 0.55 },
    rain: { wind: 1.05, n: 6, n3: 8, r: 1.6, dmg: 18, spread: 4.2 },
    sweep: { wind: 1.4, dmg: 34, w: 16, len: 30 },
    surge: { wind: 2.0, safe: 3, r: 2.4, dmg: 40, push: 8 },
    weak: 2.2, weakMul: 2, coreMul: 1.5, coreWeakMul: 2.5,
  },
};
export const G_VARIANTS = {
  drone: { name: '대수문 수리 드론', hp: 1.25, color: 0xc9b07a },
  warden: { name: '관제 경비 기계', hp: 1.1 },
};
/* 지도 상태: 늘 폭풍(꼭대기 비바람) — 공통 판 상태 '폭풍'으로 셈 */
export const G_CONDS = {
  gale: { name: '꼭대기 비바람', txt: '대수문 꼭대기 — 비바람 속 파수의 관제 코어. 큰 공격은 모두 바닥에 먼저 보여요', hear: 0.7, fog: [26, 54], rain: 1, wx: 'storm' },
};

/* 전리품 (map: 'gate') · 이야기 물건(cat memo)
 *  지도 물건 3: 대수문 볼트(고철) · 관제 진공관(부품) · 수문 명판(보물) · 보스 잔해 '돌려받은 기억'(옛 보물 + 파수의 렌즈)
 *  이야기 물건(6장): 마지막 인양 다섯(지도마다 하나 — 곰방 간판 · 해담 장갑 · 서리 분필 판 · 모루 불씨 · 느루 레시피) · 승강로 승인 카드 · 수감 열쇠 · 랜턴 걸이 */
export const G_ITEMS = {
  gbolt:  { name: '대수문 볼트', cat: 'scrap', w: 1, h: 1, wt: 1.2, val: 24, dis: { bolt: 4 }, model: 'k_cog', color: '#8a9096', desc: '손바닥만 한 볼트. 7년을 버텼다.', map: 'gate' },
  gtube:  { name: '관제 진공관', cat: 'part', w: 1, h: 1, wt: 0.3, val: 46, dis: { glass: 2, wire: 2 }, model: 'bottle_g', color: '#ffcf7a', desc: '아직 따뜻하게 빛난다.', map: 'gate' },
  gplate: { name: '수문 명판', cat: 'treasure', w: 2, h: 1, wt: 1.4, val: 130, model: 'rug', color: '#b8893e', desc: '"은포 수리공사 · 제3수문".', map: 'gate' },
  plens:  { name: '파수의 렌즈', cat: 'treasure', w: 2, h: 2, wt: 2.0, val: 420, model: 'disc', color: '#ffd9a0', desc: '412,880점을 지켜본 눈.', map: 'gate' },
  /* 6장 이야기 물건 */
  p_sign:   { name: '간판 마지막 조각', cat: 'memo', w: 2, h: 1, wt: 0.8, val: 1, model: 'rug',    color: '#3d6fb0', desc: '파란 판자에 "회".' },
  p_glove:  { name: '등대 계단 장갑',   cat: 'memo', w: 1, h: 1, wt: 0.2, val: 1, model: 'tarpS',  color: '#8a6a40', desc: '계단 둘째 칸에 걸려 있던 한 짝.' },
  p_chalk:  { name: '분필 판',         cat: 'memo', w: 1, h: 1, wt: 0.5, val: 1, model: 'book',   color: '#2f3a36', desc: '승강장 낙서 마지막 줄을 옮겨 적은 판.' },
  p_ember:  { name: '공방 불씨 통',     cat: 'memo', w: 1, h: 1, wt: 0.9, val: 1, model: 'can_a',  color: '#ff8a3a', desc: '뚜껑 틈으로 아직 불씨가 빛난다.' },
  p_recipe: { name: '레시피 아래 반',   cat: 'memo', w: 1, h: 1, wt: 0.1, val: 1, model: 'ticket', color: '#f0e2c0', desc: '축제 국 레시피 아래쪽 반.' },
  gatecard: { name: '승강로 승인 카드', cat: 'memo', w: 1, h: 1, wt: 0.1, val: 1, model: 'chip',   color: '#7dffd8', desc: '파수가 직접 찍어 준 승인 도장.' },
  cellkey:  { name: '수감 칸 열쇠',     cat: 'memo', w: 1, h: 1, wt: 0.1, val: 1, model: 'key',    color: '#5a524c', desc: '검은 닻 배의 수감 칸 열쇠.' },
  lhook:    { name: '빈 랜턴 걸이',     cat: 'memo', w: 1, h: 1, wt: 0.3, val: 1, model: 'coil',   color: '#c99a4a', desc: '노을의 잠수복 등에서 떼어 낸 걸이.' },
};
export const G_LOOT = {
  bossP: { name: '파수 잔해 · 돌려받은 기억', n: [3, 4], w: { compass: 3, crown: 1, pearl: 3, chest: 2, gplate: 2, gtube: 2, core: 2 }, fixed: ['plens', 'core'] },
  gstair: { name: '관제 보관함', n: [2, 3], w: { gbolt: 3, gtube: 3, gplate: 1, battery: 2, core: 1, med: 2 } },
};
/* 마지막 인양 다섯 — 지도마다 그 지도 구역 2 금빛 고리 상자에 하나 (story.js b_last) */
export const LAST_PIECES = { ware: 'p_sign', harbor: 'p_glove', tunnel: 'p_chalk', factory: 'p_ember', lab: 'p_recipe' };
