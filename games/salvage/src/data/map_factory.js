// 맵 4 '가라앉은 공장' 데이터 (M3-B · v0.6) — 지도 · 적(진영 3 '검은 닻') · 보스(쇳물 감독관) · 판 상태 · 전리품 · 기억 조각
//  data.js 가 이 파일을 읽어 MAPS · ENEMIES · BOSS · VARIANTS · CONDS · ITEMS · LOOT_TABLE · DAILY_MAP 에 펼침 (숫자 조정은 여기서만)
//  이야기 연결(M3-C): 해금 키 MAP_UNLOCK · 기억 조각 사연 FACTORY_MEMO · 벽 낙서 FACTORY_GRAF · 열쇠 기억 후보(lantern_u · pencil) — 의뢰가 이 키를 씀
//  NARRATIVE 4장 '불을 만든 곳': 조력 발전소 + 등불 공방 · 대수문 제어 회로를 짠 곳 · 검은 닻(약탈단) 첫 등장 · 보스 = 쇳물 감독관(공장 감독 기계)

/* 해금: 이 키가 S.quests.done 에 들어가면 열림 (3장 끝 — M3-C 가 의뢰/이야기 걸음으로 넣음) */
export const MAP_UNLOCK = 'map_factory';

export const F_MAP = {
  name: '가라앉은 공장', short: '공장', icon: '🏭', unlock: MAP_UNLOCK, lock: '3장을 마치면 열려요', pack: 'factory', bossKind: 'smelter', night: 0.15,
  blurb: '하역장 → 용광로 · 컨베이어 → 동력 코어실', tips: '검은 닻(약탈단)이 기계 · 해골과도 싸워요 — 엄폐물 뒤에서 몸을 내밀 때가 기회. 전원을 켜면 컨베이어가 돌아 반출구로 나갈 수 있어요',
  zones: {
    1: { name: '하역장', short: '하역장', hp: 1.4, dmg: 1.25, boxes: { crate: 25, bench: 25, locker: 25, stash: 25 }, nLoot: [1, 2], nEnemy: [1, 2], foes: { anchor: 40, drone: 30, skel: 30 } },
    2: { name: '용광로 · 컨베이어', short: '용광로', hp: 1.75, dmg: 1.45, boxes: { bench: 35, toolbox: 25, stash: 20, locker: 20 }, nLoot: [2, 3], nEnemy: [1, 2], foes: { anchor: 30, drone: 40, skel: 30 } },
    3: { name: '동력 코어실', short: '코어실', hp: 2.15, dmg: 1.7, boxes: { corebox: 45, toolbox: 20, chest: 35 }, nLoot: [2, 3], nEnemy: [2, 2], elite: true, foes: { anchor: 25, drone: 45, skel: 30 } } },
  exits: { early: '하역장 사다리', power: '컨베이어 반출구', sub: '크레인 바구니' },
  conds: { steam: 35, overheat: 30, outage: 35 }, loot: 1.7,
};

/* ───── 진영 3 '검은 닻' (4장부터) — 사람이 아닌 동물 약탈단: 쥐 · 오소리 · 흰족제비 (바람의 옛 무리)
 *  fac: 'anchor' = 기계(드론 · 감독관) · 빛이끼(해골) · 변종과 서로 싸움 (ai.js HOSTILE)
 *  cover: 엄폐물 뒤에 숨었다가 몸을 내밀어 쏨 · role: pin(묶어 둠) · flank(옆으로 돌아 듦) · flush(숨은 곳에 던져 몰아냄) */
export const F_ENEMIES = {
  raider: { name: '닻 소총수', hp: 92, speed: 2.6, chase: 4.8, sight: 11, fov: 1.7, hear: 1.3, atk: 'burst', dmg: 7, range: 10.5, cd: 2.1, radius: 0.45, loot: 'anchor', wind: 0.5, fac: 'anchor', role: 'pin', cover: true, burst: 3, burstGap: 0.14 },
  brute:  { name: '닻 갈퀴꾼', hp: 190, speed: 2.1, chase: 5.0, sight: 8, fov: 1.5, hear: 1.2, atk: 'melee', dmg: 17, range: 1.75, cd: 1.5, radius: 0.6, loot: 'anchor', wind: 0.55, fac: 'anchor', role: 'flank', shield: 0.6 },
  bomber: { name: '닻 화약꾼', hp: 78, speed: 2.4, chase: 4.3, sight: 10, fov: 1.9, hear: 1.4, atk: 'lob', dmg: 14, range: 11, cd: 3.2, radius: 0.45, loot: 'anchor', wind: 0.6, fac: 'anchor', role: 'flush', keep: [6, 10] },
  /* 4장 보스 — 쇳물 감독관: 용광로를 지키는 공장 감독 기계 (주조 국자 팔 · 집게 팔 · 가슴 용광로 = 약점) */
  smelter: { name: '쇳물 감독관', hp: 1250, speed: 1.5, chase: 2.8, sight: 14, fov: 2.4, hear: 1.6, atk: 'smelter', dmg: 26, range: 12, cd: 2.0, radius: 1.1, loot: 'bossF', boss: true },
};
/* 화약꾼 불병: 날아가는 시간 · 터지는 반경 · 남는 불 (예고 = 떨어질 자리 바닥 원) */
export const LOB = { flight: 1.0, r: 1.9, fire: 3.2, fireDps: 8 };
/* 보스 패턴 (예고 시간 · 반경 · 피해) — raid.js bossWind/enemyAttack · 세 보스와 같은 규칙: 큰 공격 뒤 약점 시간 ×2
 *  pour: 국자를 기울여 앞으로 쇳물 줄(줄 경고 → 줄 위 쇳물 웅덩이 5초)
 *  slam: 가까우면 집게 팔 내려찍기(원 경고) → 가슴 용광로 문이 2초 열림 = 약점 ×2
 *  rain: 체력 60% 아래 · 쇳물 방울 5개를 내 자리 둘레에 퍼부음(떨어질 자리마다 원 경고 1.1초) */
export const F_BOSS = {
  smelter: { pour: { wind: 0.95, len: 10, w: 2.4, dmg: 18, pool: 5, poolDps: 10 }, slam: { wind: 0.85, r: 3.4, dmg: 26 }, rain: { wind: 1.1, n: 5, r: 1.6, dmg: 16, pool: 4, below: 0.6, cd: 11 }, weak: 2.0, weakMul: 2 },
};
export const F_VARIANTS = {
  drone: { name: '공장 감시 드론', hp: 1.1, color: 0x8a6a4a },
  skel: { name: '그을린 해골', hp: 1.1, tint: [0.72, 0.62, 0.55] },
};
/* 판 상태 (판마다 하나) — raid.js 가 읽음 */
export const F_CONDS = {
  steam:    { name: '증기 누출', txt: '배관이 터져 증기가 새요 — 바닥 하얀 원이 차오르면 비켜요. 증기 속에선 서로 안 보여요', fog: [22, 46], vis: 0.85, vents: 2 },
  overheat: { name: '과열', txt: '용광로가 다시 달아올랐어요 — 쇳물 도랑이 넓고 뜨거워요(구르면 안 데어요)', fog: [24, 50], heat: 1 },
  outage:   { name: '정전', txt: '공장 전체 정전 — 컨베이어 · 크레인이 멈췄어요. 발전기를 켜면 불이 들어와요', dark: true, fog: [22, 44], vis: 0.85 },
};
/* 공장 장치 숫자 */
export const STEAM = { every: [5.5, 8.5], warn: 0.95, burst: 2.2, r: 2.2, dps: 16 };
export const MOLTEN = { dps: 14, w: 1.6 };
export const BELT = { speed: 2.3, ride: 4.6 };       /* 컨베이어: 밀어 줌(m/초) · 반출구 타고 나가는 빠르기 */
export const CRANE = { arrive: 8, hold: 3 };         /* 크레인 바구니: 부르면 8초 뒤 내려옴 · 3초 버티면 올라감 */

/* ───── 전리품 (map: 'factory' — 공장 상자에서만) · 이야기 물건(cat memo) ─────
 *  지도 물건 4: 쇳물 찌꺼기 · 공방 도장 · 랜턴 설계도 · 검은 닻 배지
 *  기억 조각 4(이야기 의뢰가 그 지도 · 구역 상자 하나에 넣음 — story.js 방식): 미완성 랜턴 · 모루의 설계 연필 · 대수문 회로판 · 검은 닻 장부 */
export const F_ITEMS = {
  slag:      { name: '쇳물 찌꺼기', cat: 'scrap', w: 1, h: 1, wt: 1.2, val: 12, dis: { bolt: 2, powder: 1 }, model: 'orb', color: '#6a5a50', desc: '굳은 쇳물. 녹이면 볼트가 된다.', map: 'factory' },
  stamp:     { name: '공방 도장', cat: 'treasure', w: 1, h: 1, wt: 0.4, val: 48, model: 'disc', color: '#c99a4a', desc: '등불 공방의 황동 도장.', map: 'factory' },
  blueprint: { name: '랜턴 설계도', cat: 'treasure', w: 2, h: 1, wt: 0.3, val: 72, model: 'book', color: '#3f6fa8', desc: '파란 종이에 하얀 선.', map: 'factory' },
  anchorpin: { name: '검은 닻 배지', cat: 'treasure', w: 1, h: 1, wt: 0.1, val: 26, model: 'key', color: '#2c2e33', desc: '약탈단 표식. 뒤에 번호가 새겨져 있다.', map: 'factory' },
  lantern_u: { name: '미완성 랜턴', cat: 'memo', w: 1, h: 2, wt: 0.8, val: 1, model: 'k_bucket', color: '#d8a840', desc: '갓만 있고 불씨가 없다.' },
  pencil:    { name: '모루의 설계 연필', cat: 'memo', w: 1, h: 1, wt: 0.1, val: 1, model: 'fang', color: '#c8452f', desc: '끝이 닳은 빨간 연필.' },
  circuit:   { name: '대수문 회로판', cat: 'memo', w: 2, h: 1, wt: 0.6, val: 1, model: 'chip', color: '#2f8a5a', desc: '구석에 작은 서명이 있다.' },
  anchorlog: { name: '검은 닻 장부', cat: 'memo', w: 1, h: 1, wt: 0.4, val: 1, model: 'book', color: '#22262a', desc: '기억마다 값이 매겨져 있다.' },
};
export const F_LOOT = {
  bench:   { name: '공방 작업대', n: [1, 3], w: { slag: 3, gear: 3, spring: 2, cable: 2, stamp: 1, lens: 1, pkeg: 1 } },
  stash:   { name: '검은 닻 은닉 상자', n: [2, 3], w: { coins: 3, med: 2, pkeg: 2, anchorpin: 2, book: 1, gem: 1, blueprint: 1, nade: 1 } },
  corebox: { name: '코어 보관대', n: [2, 3], w: { core: 1, motor: 2, cable: 3, blueprint: 2, slag: 2, stamp: 1, compass: 1 } },
  anchor:  { name: '닻 대원 짐', n: [1, 2], w: { anchorpin: 3, coins: 2, med: 2, pkeg: 1, smoke: 1, slag: 1 } },
  bossF:   { name: '쇳물 감독관 잔해', n: [2, 3], w: { blueprint: 2, stamp: 2, compass: 2, pearl: 1, core: 2 }, fixed: ['vkey', 'core'] },
};
export const F_DAILY = [{ item: 'slag', n: 3, mat: { bolt: 3 } }, { item: 'stamp', n: 1, mat: { glass: 2 } }, { item: 'anchorpin', n: 2, mat: { powder: 3 } }, { item: 'blueprint', n: 1, mat: { wire: 3 } }];

/* 기억 조각 사연 (60자 · 두 줄 — 세 번째에 둘째 줄) · 벽 낙서 6 — talk/memo.js 가 MEMO · GRAF 에 펼침 */
export const FACTORY_MEMO = {
  slag:      ['쇳물이 굳은 자리. 마지막 주조는 등롱 갓이었다.', '안에 작은 단추 하나가 박혀 굳어 있다.'],
  stamp:     ['"은포 등불 공방 · 불빛 하나가 길 하나".', '도장 손잡이가 한쪽만 닳았다. 왼손잡이였다.'],
  blueprint: ['랜턴 설계도. 귀퉁이에 "노을 것 · 끈 길게".', '같은 틀이 일곱 장. 일곱 사람 몫이었다.'],
  anchorpin: ['검은 닻 배지. 뒤에 번호와 값이 새겨져 있다.', '번호 옆에 누가 긁어 쓴 이름: 여울.'],
  lantern_u: ['갓만 있고 불씨가 없는 랜턴. 노을 것과 같은 틀.', '불씨 자리에 "축제 끝나고 마저" 쪽지.'],
  pencil:    ['끝이 닳은 빨간 연필. 모루가 늘 귀에 꽂던 것.', '자루에 이빨 자국. 고민할 때마다 깨물었다.'],
  circuit:   ['대수문 회로판. 판단 규칙 칸에 작은 서명.', '서명 옆 연필 글씨: "전체를 지키려면".'],
  anchorlog: ['검은 닻 장부. 사진 한 장 30, 편지 한 통 12.', '마지막 장은 찢겨 있다. 찢은 사람이 있다.'],
};
export const FACTORY_GRAF = ['불은 우리가 만들었다', '등불 공방 — 오늘도 일곱 개', '쇳물 조심! 국자 반장 지나감', '검은 닻 출입 금지 — 공방 사람들', '대수문 회로 3층 · 관계자 외', '축제 등롱 납품 끝! 다들 수고'];
