// 수달 인양단 — 무기 10 · 개조 5칸(Mk1~3 + 특수 부품) · 탄약 3 (M3-A · v0.6)
//  three 없이 읽힘(node 시뮬 · 시험). data.js 가 다시 내보냄. 근거 docs/BALANCE.md 5장
//  역할이 겹치지 않게: 무난(권총) · 중거리 연사(소총) · 근접 무리(산탄) · 보스/꿰뚫기(대형 작살) · 근접 조용(렌치)
//   · 근접 물량(리벳) · 저격 약점(망원) · 물속(잠수) · 연쇄 감전(전류) · 범위 · 빛(조명탄)

/* ───── 무기 ─────
 * spread: 처음 퍼짐(라디안) · add 한 발마다 늘어남 · max · rec 손 떼면 초당 회복 · crit 약점 확률(치명 ×1.8)
 * pellets 산탄 · pierce 꿰뚫는 적 수 · bench 작업대 단계 · slots 달 수 있는 개조 칸 · role 한 줄 역할(무기대 표)
 * 특수: melee(휘두르기 · arc 라디안 · 탄 없음 · 방패 반만) · water(물속이면 ×) · chain(감전 연쇄 n · r m · 배수) · blast(터짐 반경 · 불 초 · 초당) · light(빛 웅덩이 초)
 */
const ALL = ['scope', 'barrel', 'mag', 'chamber', 'grip'];
export const WEAPONS = {
  pistol:  { name: '작살 권총',   short: '권총', role: '무난 · 처음', dmg: 17, rate: 4.5, mag: 12, reload: 1.0, range: 11, spread: 0.05, add: 0.040, max: 0.26, rec: 0.6, crit: 0.10, knock: 2.2, noise: 11, tier: 1, bench: 1, color: '#c9a36a', slots: ALL,
             desc: '처음 받는 작살총. 가볍고 무난해요.' },
  rifle:   { name: '연발 작살소총', short: '소총', role: '중거리 연사', dmg: 13, rate: 8.5, mag: 26, reload: 1.5, range: 14, spread: 0.035, add: 0.022, max: 0.30, rec: 0.7, crit: 0.08, knock: 1.8, noise: 13, tier: 2, bench: 2, color: '#7fb7d9', slots: ALL,
             desc: '빠른 연사. 조준경을 달면 진가가 나와요.', cost: { shells: 220, bolt: 10, wire: 6, spring: 2 } },
  wrench:  { name: '인양 렌치',   short: '렌치', role: '근접 · 조용 · 탄 없음', dmg: 38, rate: 1.7, mag: 0, reload: 0, range: 2.3, arc: 1.7, spread: 0, add: 0, max: 0, rec: 1, crit: 0.12, knock: 5.5, noise: 3, tier: 1, bench: 2, color: '#a8784e', melee: true, slots: ['barrel', 'chamber', 'grip'],
             desc: '모루가 쓰던 렌치. 소리 없이 다가가 크게 휘둘러요 · 방패도 반은 뚫어요.', cost: { shells: 180, bolt: 12, gear: 1 } },
  shotgun: { name: '산탄 작살포', short: '산탄', role: '근접 무리', dmg: 10, pellets: 6, rate: 1.5, mag: 6, reload: 1.7, range: 8, spread: 0.20, add: 0, max: 0.20, rec: 1, crit: 0.05, knock: 4.2, noise: 15, tier: 2, bench: 3, color: '#d98b4a', slots: ALL,
             desc: '가까이에선 한 방. 해골 무리에 강해요.', cost: { shells: 450, bolt: 14, wire: 4, powder: 2, spring: 2 } },
  rivet:   { name: '리벳 연사총', short: '리벳', role: '근접 물량 · 탄 많음', dmg: 7, rate: 13, mag: 54, reload: 2.3, range: 9, spread: 0.06, add: 0.012, max: 0.24, rec: 0.9, crit: 0.05, knock: 0.8, noise: 12, tier: 2, bench: 3, color: '#9aa4ad', slots: ALL,
             desc: '공장에서 쓰던 리벳총. 짧은 거리에 쏟아붓는 물량.', cost: { shells: 520, bolt: 24, wire: 8, spring: 3 } },
  longshot:{ name: '망원 작살총', short: '망원', role: '원거리 · 약점', dmg: 58, rate: 0.9, mag: 5, reload: 2.0, range: 24, spread: 0.004, add: 0.05, max: 0.10, rec: 0.35, crit: 0.30, knock: 4, noise: 15, tier: 2, bench: 3, color: '#6b8fb5', slots: ALL,
             desc: '등대지기가 쓰던 긴 작살총. 멀리서 약점을 노려요.', cost: { shells: 600, bolt: 12, wire: 6, lens: 2 } },
  diver:   { name: '잠수 작살총', short: '잠수', role: '물속 특화 · 조용', dmg: 22, rate: 3.2, mag: 10, reload: 1.3, range: 12, spread: 0.03, add: 0.03, max: 0.15, rec: 0.7, crit: 0.10, knock: 2.5, noise: 4, tier: 2, bench: 3, color: '#4fd1c5', water: { dmg: 1.4, range: 1.3 }, slots: ALL,
             desc: '물속에선 더 세고 멀리 나가요(×1.4). 소리도 작아요.', cost: { shells: 650, bolt: 10, cloth: 6, o2: 2, spring: 2 } },
  harpoon: { name: '대형 작살총', short: '작살', role: '보스 · 꿰뚫기', dmg: 75, rate: 1.15, mag: 4, reload: 1.9, range: 18, spread: 0.012, add: 0.03, max: 0.08, rec: 0.5, crit: 0.15, knock: 6, noise: 14, pierce: 2, tier: 3, bench: 4, color: '#ffb44a', slots: ALL,
             desc: '느리지만 묵직. 줄 선 적을 꿰뚫어요. 보스용.', cost: { shells: 900, bolt: 20, wire: 10, core: 1, spring: 2 } },
  volt:    { name: '전류 작살총', short: '전류', role: '연쇄 감전 · 기계', dmg: 16, rate: 2.4, mag: 8, reload: 1.6, range: 10, spread: 0.04, add: 0.03, max: 0.16, rec: 0.7, crit: 0.05, knock: 1.5, noise: 10, tier: 3, bench: 4, color: '#7dd3ff', chain: { n: 2, r: 3.6, mul: 0.6, stun: 0.25 }, slots: ALL,
             desc: '맞은 적 옆으로 전기가 두 번 튀어요. 드론 · 기계에 세고, 해파리엔 약해요.', cost: { shells: 1100, wire: 20, battery: 3, core: 1 } },
  flare:   { name: '조명탄 발사기', short: '조명', role: '범위 · 밤을 밝힘', dmg: 46, rate: 0.75, mag: 3, reload: 2.4, range: 13, spread: 0.02, add: 0.02, max: 0.06, rec: 0.5, crit: 0.05, knock: 3, noise: 16, tier: 3, bench: 5, color: '#ff8a3c', blast: { r: 2.7, burn: 3, dps: 9 }, light: 6, slots: ALL,
             desc: '터지는 조명탄. 둘레에 불이 붙고 6초 동안 그 자리가 밝아져요(밤에 좋아요).', cost: { shells: 1500, powder: 16, pkeg: 3, spyglass: 1, core: 1 } },
};
export const WEAPON_KEYS = Object.keys(WEAPONS);

/* ───── 손맛 칸 (v0.6.1 · 검수 M3 Top 5 — 폰 쿼터뷰에서 보이는 '서명 효과' 하나씩 · arms.js 가 읽음) ─────
 * shake 쏠 때 화면 흔들림(카메라는 제곱으로 흔듦: 0.3 ≈ 3px · 0.5 ≈ 9px · 상한 SHAKE_MAX · 설정 '흔들림 약하게' ×0.35)
 * kick 반동(카메라가 쏘는 반대로 밀림 m) · stop 히트스톱 배수(기본 0.04초 · 치명/약점 0.07 — 연사 무기는 작게: 멈춤이 쌓이면 끈적임)
 * push 넉백 배수(knock × push · 산탄은 알마다) · flash 총구 불꽃 크기(0 = 없음) · light 총구 빛 세기 · fc 불꽃/빛 색
 * tc 궤적 색 · tw 궤적 두께(m · 폰에서 1m ≈ 32px) · tl 궤적 남는 초 · sig 서명 효과(arms.js shotSig)
 *   spark 금빛 작살 꼬리 + 맞은 자리 별 · stream 푸른 궤적 다발 + 탄피 줄 · swing 휘두름 잔상 부채꼴 · fan 부채꼴 화염 + 밀어내기
 *   rivet 짧은 불티 점선 + 탄피 비 · line 오래 남는 흰 선 + 관통 파편 · 치명 '핑' 고리 · bubble 물속 거품 꼬리 · pierce 굵은 관통선 + 꿰뚫은 적마다 파편 분수
 *   arc 지그재그 전기 호 + 감전 번쩍 · flare 날아가는 불덩이 → 바닥 불 링 + 빛 웅덩이 */
export const SHAKE_MAX = 0.6;
export const FEEL = {
  pistol:  { shake: 0.30, kick: 0.16, stop: 1,    push: 1,   flash: 1.1, light: 28, fc: 0xffd890, tc: 0xffd890, tw: 0.16, tl: 0.13, sig: 'spark' },
  rifle:   { shake: 0.24, kick: 0.10, stop: 0.45, push: 1,   flash: 0.8, light: 20, fc: 0xcfe8ff, tc: 0x8fd0ff, tw: 0.09, tl: 0.16, sig: 'stream' },
  wrench:  { shake: 0.45, kick: 0.22, stop: 2,    push: 1.2, flash: 0,   light: 0,  fc: 0xffffff, tc: 0xfff4dc, tw: 0.9,  tl: 0.18, sig: 'swing' },
  shotgun: { shake: 0.52, kick: 0.30, stop: 1,    push: 1.6, flash: 1.9, light: 44, fc: 0xffb860, tc: 0xffc070, tw: 0.13, tl: 0.13, sig: 'fan' },
  rivet:   { shake: 0.21, kick: 0.06, stop: 0.3,  push: 1,   flash: 0.8, light: 16, fc: 0xffa040, tc: 0xffb050, tw: 0.17, tl: 0.1, sig: 'rivet' },
  longshot:{ shake: 0.46, kick: 0.26, stop: 1.8,  push: 1,   flash: 1.3, light: 34, fc: 0xffffff, tc: 0xeef8ff, tw: 0.14, tl: 0.55, sig: 'line' },
  diver:   { shake: 0.18, kick: 0.10, stop: 1,    push: 1,   flash: 0.6, light: 12, fc: 0x9ff4ff, tc: 0x8fefff, tw: 0.08, tl: 0.14, sig: 'bubble' },
  harpoon: { shake: 0.56, kick: 0.32, stop: 1.6,  push: 1.2, flash: 1.5, light: 36, fc: 0xffc070, tc: 0xffa63a, tw: 0.34, tl: 0.34, sig: 'pierce' },
  volt:    { shake: 0.30, kick: 0.12, stop: 1.2,  push: 1,   flash: 1.1, light: 44, fc: 0x9fe8ff, tc: 0x6fd0ff, tw: 0.2,  tl: 0.17, sig: 'arc' },
  flare:   { shake: 0.26, kick: 0.18, stop: 1.2,  push: 1,   flash: 1.2, light: 30, fc: 0xffa050, tc: 0xff9a3c, tw: 0,    tl: 0,    sig: 'flare', boom: 0.6, fly: 34 },
};
for (const k of WEAPON_KEYS) WEAPONS[k].feel = FEEL[k];
/* 탄약 명중 효과 (arms.js hitSig) — 일반 = 뼈 조각 + 따뜻한 별 · 관통 = 뒤로 빠지는 은빛 침 3 + '틱' · 전기 = 파란 번쩍 + 작은 호 2 + '지직' */
export const AMMO_FX = { normal: { c: 0xffd9a0, s: 1.1 }, ap: { c: 0xf2f6ff, s: 1.2, spikes: 3 }, sp: { c: 0x5fc8ff, s: 1.9, arcs: 3 } };

/* ───── 개조 5칸 × Mk1~3 + 특수 부품(4번 칸 · 무기대 4단계 · 보스 보물) ─────
 *  배열 칸 = 단계 0 · Mk1 · Mk2 · Mk3 · 특수. 근접(렌치)은 총열 = 휘두르는 거리 · 손잡이 = 휘두르는 빠르기 */
export const MODS = {
  scope:   { name: '조준경', stat: '정확도', fx: ['퍼짐 ×1', '퍼짐 −20% · 약점 +4%', '퍼짐 −38% · 약점 +8%', '퍼짐 −55% · 약점 +12%', '퍼짐 −60% · 약점 +20%'], spread: [1, 0.8, 0.62, 0.45, 0.4], crit: [0, 0.04, 0.08, 0.12, 0.2], part: 'lens',
             sp: { name: '등대 렌즈 조준경', item: 'beacon' } },
  barrel:  { name: '총열',   stat: '사거리', fx: ['기본', '사거리 +15% · 반동 회복 빠르게', '사거리 +30% · 반동 회복 +40%', '사거리 +45% · 반동 회복 +60%', '사거리 +25% · 반동 +60% · 소리 −55%'], range: [1, 1.15, 1.3, 1.45, 1.25], rec: [1, 1.2, 1.4, 1.6, 1.6], noise: [1, 1, 1, 1, 0.45], part: 'spring',
             sp: { name: '소음 총열', item: 'rail' } },
  mag:     { name: '탄창',   stat: '장탄',   fx: ['기본', '장탄 +25% · 장전 −10%', '장탄 +50% · 장전 −20%', '장탄 +80% · 장전 −30%', '장탄 +140% · 장전 −5%'], mag: [1, 1.25, 1.5, 1.8, 2.4], reload: [1, 0.9, 0.8, 0.7, 0.95], part: 'spring',
             sp: { name: '드럼 탄창', item: 'motor' } },
  chamber: { name: '약실',   stat: '파워',   fx: ['기본', '피해 +12%', '피해 +25%', '피해 +40%', '피해 +45% · 보스 +12%'], dmg: [1, 1.12, 1.25, 1.4, 1.45], boss: [1, 1, 1, 1, 1.12], part: 'pkeg',
             sp: { name: '장어 이빨 약실', item: 'fang' } },
  grip:    { name: '손잡이', stat: '안정',   fx: ['기본', '반동 퍼짐 −15%', '반동 퍼짐 −30% · 최대 −12%', '반동 퍼짐 −45% · 최대 −18%', '반동 퍼짐 −55% · 최대 −28% · 약점 +4%'], add: [1, 0.85, 0.7, 0.55, 0.45], max: [1, 0.94, 0.88, 0.82, 0.72], crit: [0, 0, 0, 0, 0.04], swing: [1, 1.07, 1.14, 1.22, 1.3], part: 'gear',
             sp: { name: '나침반 손잡이', item: 'compass' } },
};
export const MOD_KEYS = Object.keys(MODS);
export const MOD_MAX = 4; /* 4 = 특수 부품 */
export const MK_NAME = ['', 'Mk1', 'Mk2', 'Mk3', '특수'];
/* 개조 비용 (무기 tier 배수 곱함) · 4 = 특수 부품: 그 칸의 보스 보물 1 + 코어 */
export const MOD_COST = [null,
  { shells: 70,  bolt: 4 },
  { shells: 190, bolt: 8,  wire: 4, part: 1 },
  { shells: 420, bolt: 12, wire: 8, part: 1, core: 1 },
  { shells: 900, wire: 12, sp: 1, core: 1 },
];
export const TIER_MUL = { 1: 1, 2: 1.3, 3: 1.6 };
export const freshMods = () => ({ scope: 0, barrel: 0, mag: 0, chamber: 0, grip: 0 });

/* ───── 탄약 3 — 출격 준비에서 고름 · 관통 · 특수는 '탄약 상자' 1개 = 한 판 모든 총(근접 제외) ─────
 *  적 방어(ARMOR · ENEMIES[k].armor 가 있으면 그것) — 일반: 피해 × (1 − 방어) · 관통: 방어를 20%만 받고 방패도 반만
 *  특수(전기 작살촉): 기계(MACHINE · ENEMIES[k].machine) ×1.35 · 물속 적 ×1.15 · 잠깐 멈칫 · 전기 해파리 ×0.6
 *  상자 만들기 = 탄약대(시설) · 사기 = 모루 공방 */
export const AMMO = {
  normal: { name: '일반 작살촉', short: '일반', txt: '늘 있음 · 방어 있는 적엔 덜 들어가요', color: '#c9a36a' },
  ap:     { name: '관통 작살촉', short: '관통', txt: '방어 · 방패를 뚫어요 (방어 20%만 · 방패 반)', color: '#e3e8ee', armorMul: 0.2, shieldMul: 0.5, dmg: 0.97, fac: 1, cost: { shells: 40, bolt: 3, powder: 1 } },
  sp:     { name: '전기 작살촉', short: '전기', txt: '기계 ×1.35 · 물속 적 ×1.15 · 잠깐 멈칫 (해파리엔 약해요)', color: '#7dd3ff', machine: 1.35, wet: 1.15, jelly: 0.6, stun: 0.2, dmg: 0.95, fac: 2, cost: { shells: 55, wire: 3, powder: 1, chip: 1 } },
};
export const AMMO_KEYS = Object.keys(AMMO);
/* 적 방어 (0~1) — 새 적은 ENEMIES[k].armor 로 직접 넣으면 그 값이 먼저 */
export const ARMOR = { drone: 0.15, crab: 0.2, boss: 0, captain: 0.1, eel: 0.05, miner: 0.15 };
export const MACHINE = { drone: 1, boss: 1 };
