// 데이터: 브랜드(받은 자료로 교체) · 메뉴 · 지점 배치 · 열기 순서 · 직원 · 쿠폰
//   ※ 메뉴 이름 · 지점 이름 · 색은 임시 — 트렌차이즈 자료 받으면 여기만 바꾸면 됨
import { LAYOUT } from './layout.js?v=0.99.14';
export const BRAND = { name: '마루미베이글', sign: 'marumi', sub: 'TOKYO BAGEL', dark: '#5A3A22', brown: '#A98259', accent: '#FF6720', accentHex: 0xFF6720, cream: '#F3E7D6',
  slogan: '일상의 쉼표가 되는 곳, 마루미베이글에서 즐기는 갓 구운 행복', story: '도쿄 요요기에서 이어지는 정신 · 매일 새벽 직접 반죽하고 굽는 수제 베이글', insta: 'https://www.instagram.com/marumi.bagel_official/' };   /* 공식 홈페이지 marumibagel.com */
// 조사: 마지막 글자 받침으로 고름 · josa('크림치즈', '을/를') → '크림치즈를' · '으로/로' 는 ㄹ 받침도 '로'
export function josa(w, pair) { const [a, b] = pair.split('/'), c = String(w).trim().slice(-1).charCodeAt(0) - 0xAC00; if (c < 0 || c > 11171) return `${w}${a}(${b})`;
  const jong = c % 28; return w + (pair === '으로/로' ? (jong && jong !== 8 ? a : b) : jong ? a : b); }
export const GAME = { title: '마루미 베이글 하우스', en: 'Marumi Bagel House', ver: '0.3.1' };   /* 0.3.0 (2026-11-09): 매장이 자라는 마루미 — 방 · 공사 · 크루룸 · 사장실 · 창고 · 지점 특색 · 인테리어 4종 · BM · 0.2.0: 테스터 QA/QC 시트 #1~14 */
// 물건 → 메뉴 (가격은 지점 배수 곱함)
//   실제 메뉴 (잠실리센츠점 · 2026-10-26 사용자 제공): 플레인 1,900 · 솔트버터 3,500 · 올리브치즈 2,900 · 치즈시금치 3,500 · 크랜베리호두 3,500 · 크림치즈 컵 각 2,000
//   게임 가격 = 실제 가격 비율 (플레인 1,900원 → 5)
//   물건 칸 이름은 그대로 두고(bagel·cream·coffee) 지점마다 무엇인지 바꿈: bagel=오븐 플레인 · cream=토핑 바 특별 베이글 · coffee=크림치즈 냉장고 컵
export const MENU = { drink: { name: '아메리카노', short: '아메리카노', price: 6, icon: '☕' }, bagel: { name: '플레인 베이글', short: '플레인', price: 5, icon: '🥯' }, cream: { name: '솔트버터 베이글', short: '솔트버터', price: 9, icon: '🥯', look: 'salt' }, coffee: { name: '플레인 크림치즈', short: '크림치즈', price: 5, icon: '🥣', look: 'cup_plain' } };
export const BRANCH_MENU = [
  { cream: { name: '솔트버터 베이글', short: '솔트버터', price: 9, look: 'salt', bar: '솔트버터 바' }, coffee: { name: '플레인 크림치즈', short: '플레인 크림', price: 5, look: 'cup_plain' } },
  { cream: { name: '올리브치즈 베이글', short: '올리브치즈', price: 8, look: 'olive', bar: '올리브치즈 바' }, coffee: { name: '블루베리 크림치즈', short: '블루베리 크림', price: 5, look: 'cup_blue' } },
  { cream: { name: '치즈시금치 베이글', short: '치즈시금치', price: 9, look: 'spinach', bar: '치즈시금치 바' }, coffee: { name: '대파베이컨 크림치즈', short: '대파베이컨 크림', price: 5, look: 'cup_scallion' } },
  { cream: { name: '크랜베리호두 베이글', short: '크랜베리호두', price: 9, look: 'cranberry', bar: '크랜베리호두 바' }, coffee: { name: '무화과호두 크림치즈', short: '무화과 크림', price: 5, look: 'cup_fig' } },
];
export function setBranchMenu(i) { const m = BRANCH_MENU[i] || BRANCH_MENU[0]; Object.assign(MENU.cream, m.cream); Object.assign(MENU.coffee, m.coffee); }
// 지점: 배치 · 방 · 여는 순서 · 인테리어는 layout.js (v2 · 2026-11-09 「매장이 자라는 마루미」)
//   type: oven·counter·ccbar·coffee·table·picnic·bin·drive·rider·retard·hire(staff)·room(방 열기)·next(다음 지점 계약)
const NAMES = ['1호점 · 잠실리센츠점', '2호점 · 석촌본점', '3호점 · 헬리오시티점', '4호점 · 파크포레온점'];
export const BRANCHES = LAYOUT.map((L, i) => ({ ...L, name: NAMES[i], photo: 'store' + (i + 1), W: 2500, D: 2300 }));
export const BRANCH_INFO = ['서울 송파구 올림픽로 145 리센츠상가 1층', '서울 송파구 삼학사로 42-1 1~2층', '서울 송파구 송파대로 345 헬리오시티 B1', '서울 강동구 양재대로 1360 포레온스테이션5 B1'];
// 업그레이드 (지점마다 · 1~10단계): 효과는 game.js 에서 L(이름)으로 읽음
export const UPGRADES = [
  { id: 'oven', name: '오븐 성능', desc: '플레인이 더 빨리 구워져요', icon: '🔥', base: 80, need: 'oven', st: 'oven' },
  { id: 'ovenCap', name: '오븐 판 늘리기', desc: '오븐에 더 많이 쌓여요', icon: '🧺', base: 120, need: 'oven', st: 'oven' },
  { id: 'mixer', name: '반죽기 속도', desc: '반죽이 더 빨리 나와요', icon: '🥣', base: 140, need: 'mixer', st: 'mixer' },
  { id: 'kettle', name: '쫄깃함 연구', desc: '쫄깃 플레인 값이 더 올라요', icon: '♨️', base: 200, need: 'kettle', st: 'kettle' },
  { id: 'bar', name: '토핑 바 손 빠르게', desc: '특별 베이글이 빨리 만들어져요', icon: '🧂', base: 150, need: 'cc', st: 'cc' },
  { id: 'fridge', name: '크림치즈 냉장고 확장', desc: '크림치즈가 더 빨리 채워져요', icon: '🧊', base: 200, need: 'coffee', st: 'coffee' },
  { id: 'espresso', name: '커피 머신 속도', desc: '커피가 더 빨리 나와요', icon: '☕', base: 160, need: 'espresso', st: 'espresso' },
  { id: 'price', name: '메뉴 가격 올리기', desc: '모든 메뉴 +8%', icon: '💰', base: 180, st: 'counter' },
  { id: 'ads', name: 'SNS 홍보', desc: '손님이 더 자주 와요', icon: '📣', base: 160 },
  { id: 'tip', name: '친절 서비스', desc: '손님이 팁을 줄 때가 있어요', icon: '😊', base: 220 },
];
export const UP_MAX = 10;
// 설비 이름 (바닥 이름표 · 업그레이드 창) · 토핑 바는 지점마다 이름이 바뀜 (BRANCH_MENU.cream.bar)
export const ST_NAME = { oven: '오븐', mixer: '반죽기', kettle: '데치기 솥', cc: '토핑 바', coffee: '크림치즈 냉장고', espresso: '커피 머신', counter: '계산대', bin: '쓰레기통', drive: '드라이브스루' };
// 설비 외형 단계: 그 설비 업그레이드 Lv 이 3 · 6 · 9 가 되면 바뀜 (오븐은 두 업그레이드 중 높은 쪽)
export const TIER_AT = [3, 6, 9], TIER_NAME = ['기본', '브랜드', '프로', '마스터'];
export const tierOf = lv => TIER_AT.filter(x => lv >= x).length;
export const upCost = (u, lv, mult) => Math.round(u.base * 1.6 * Math.pow(1.6, lv) * mult / 5) * 5;
export const FINISHED_RATE = 0.9;
/* 새 지점은 앞 지점의 설비 업그레이드 단계를 이어받음 (테스터 #11 「2호점을 열면 1호점 진행이 초기화」) */   /* 다 연 지점 자동 수익 (초당, × 지점 배수 × (1 + 가격 단계/10)) */
// 사람 · 직원 · 손님 · 쿠폰
export const PLAYER = { speed: 430, carry: 6, carryUp: 10, speedUp: 1.3, look: { body: 0x5A3A22, apronC: 0xFF6720, hat: 'toque', cap: 0xFF6720, scarf: 0xFF6720, hair: 0x2A1A10 } };   /* 사장님: 브라운 셰프복 · 주황 앞치마 · 흰 셰프 모자 (직원은 캡 · 흰 앞치마) */
export const STAFF = {
  cashier: { name: '계산원', body: 0x5A8AE0, serve: 0.55, hello: '계산원이 계산을 맡아요!', up: '계산 속도' },
  baker: { name: '진열 직원', body: 0x7A4A2A, speed: 300, carry: 4, hello: '진열 직원이 베이글을 계산대로 날라요!', up: '걷기 속도 · 들기' },
  topper: { name: '토핑 직원', body: 0xE2A020, speed: 290, carry: 3, hello: '토핑 직원이 특별 베이글을 만들어요!', up: '걷기 속도 · 들기', cap: 0xFF6720 },
  fridge: { name: '음료·크림치즈 직원', body: 0x8AC8E8, speed: 290, carry: 3, hello: '크림치즈와 커피를 계산대에 채워요!', up: '걷기 속도 · 들기' },
  dougher: { name: '반죽 직원', body: 0xF4F0E8, speed: 280, carry: 3, hello: '반죽 직원이 반죽을 데치고 오븐에 넣어요!', up: '걷기 속도 · 들기', cap: 0xA98259 },
  driver: { name: '드라이브스루 직원', body: 0xE86A8A, speed: 300, carry: 4, hello: '드라이브스루 주문을 맡아요!', up: '걷기 속도 · 들기', cap: 0xFF6720 },
  cleaner: { name: '청소 직원', body: 0x6AB07A, speed: 320, carry: 4, hello: '청소 직원이 테이블을 치워요!', up: '걷기 속도 · 들기' },
  server: { name: '2층 서빙 직원', body: 0xC08AE0, speed: 300, carry: 4, hello: '2층 손님 테이블을 맡아요!', up: '걷기 속도 · 들기', cap: 0xFF6720 },
};
/* 직원 뽑는 순서 (크루룸 「새 직원 뽑기」 칸 설명) */
export const STAFF_JOB = { cashier: '계산대에서 손님을 받아요', baker: '오븐 → 계산대 진열', topper: '토핑 바에서 특별 베이글', fridge: '크림치즈 · 커피 채우기', dougher: '반죽 → 오븐', driver: '창구 주문 채우기', cleaner: '테이블 치우기', server: '2층 테이블 치우기' };
export const STAFF_UP = { base: 260, max: 10 };
// 방문형 방의 바닥 칸 (서 있으면 돈이 빠져나감 · 1~10단계) — 크루룸 = 직원 · 사장실 = 나 · 값 = base × 1.6^단계 × 지점 배수
//   방이 열리기 전에는 HUD 「업그레이드」 창에서 같은 단계를 올림 (처음 하는 사람이 막히지 않게)
export const ROOM_UP = {
  crew: [
    { id: 'swalk', name: '직원 걷기', icon: '👟', base: 220, desc: '모든 직원 +10% 빠르게' },
    { id: 'scarry', name: '직원 들기', icon: '🧺', base: 260, desc: '모든 직원 +1개 더 들기' },
  ],
  boss: [
    { id: 'walk', name: '사장님 걷기', icon: '🏃', base: 180, desc: '사장님 +6% 빠르게' },
    { id: 'carry', name: '사장님 들기', icon: '🥯', base: 200, desc: '한 번에 +1개 더' },
    { id: 'price', name: '메뉴 가격', icon: '💰', base: 180, desc: '모든 메뉴 +8%' },
    { id: 'tip', name: '팁 · 홍보', icon: '📣', base: 220, desc: '손님이 더 자주 · 팁도 더' },
  ],
};
export const ROOM_UP_MAX = 10;
// 직원 쉬기 (테스터 #10): 화면을 안 만지고 REST 초가 지나면 직원이 하나씩 쉼 → 사장님이 다가가면(거리 near) 다시 일함 + 기운 충전(빨리 · BOOST 초)
export const REST = { after: 45, spread: 20, near: 150, boost: 30, boostK: 1.25 };
// 직원 유니폼 (꾸미기 › 직원) · basic = 역할별 색 · 모든 지점 공통 · 한 번 사면 언제든 바꿔 입힘
export const OUTFITS = [
  { id: 'basic', name: '역할별 기본 앞치마', icon: '🧑‍🍳', cost: 0, desc: '역할마다 색이 달라요' },
  { id: 'orange', name: '마루미 주황 유니폼', icon: '🧡', cost: 600, body: 0xFF6720, apronC: 0x5A3A22, hat: 'cap', cap: 0xFFFFFF, desc: '간판과 같은 주황' },
  { id: 'cream', name: '크림 린넨 앞치마', icon: '🤍', cost: 900, body: 0xF3E7D6, apronC: 0xA98259, hat: 'bandana', cap: 0xA98259, desc: '부드러운 아침 빵집' },
  { id: 'brown', name: '초콜릿 브라운 셔츠', icon: '🤎', cost: 1300, body: 0x6A4426, apronC: 0xF3E7D6, hat: 'beret', cap: 0xFF6720, desc: '베레모를 쓴 카페 직원' },
  { id: 'navy', name: '네이비 스트라이프', icon: '💙', cost: 1800, body: 0x2E3A5A, apronC: 0xFFFFFF, hat: 'beret', cap: 0x2E3A5A, desc: '도쿄 골목 베이커리' },
  { id: 'black', name: 'TOKYO 블랙 에디션', icon: '🖤', cost: 2600, body: 0x2A2A2E, apronC: 0xFF6720, hat: 'cap', cap: 0x2A2A2E, desc: '요요기 본점 감성' },
];
// 가게 물품 (상점 · 게임 돈으로 삼): 시간 효과는 S.fx[이름] = 끝나는 시각 · cost × 지점 배수
//   원어데이 골드 상품은 아래 GOLD (2026-11-09 대표: 브랜드 게임도 일반 게임과 같은 골드 · 광고 규칙 · 실물 쿠폰은 팔지 않음)
export const SHOP_ITEMS = [
  { id: 'batch', name: '갓 구운 플레인 한 판', icon: '🥯', cost: 60, desc: '오븐에 플레인 10개가 바로 나와요' },
  { id: 'shoes', name: '가벼운 운동화', icon: '👟', cost: 90, fx: 'speed', sec: 180, desc: '3분 동안 빨리 걸어요' },
  { id: 'tray', name: '큰 쟁반', icon: '🧺', cost: 110, fx: 'tray', sec: 180, desc: '3분 동안 4개 더 들어요' },
  { id: 'flyer', name: '전단지 돌리기', icon: '📣', cost: 120, fx: 'rush', sec: 120, desc: '2분 동안 손님이 두 배로 와요' },
  { id: 'cheer', name: '직원 응원 커피', icon: '🥤', cost: 140, fx: 'staff', sec: 180, desc: '3분 동안 직원이 30% 빨라요', staff: true },
];
export const FX = { speed: { name: '빨리 걷기', icon: '👟', k: 1.4 }, tray: { name: '큰 쟁반', icon: '🧺', n: 4 }, rush: { name: '손님 두 배', icon: '📣', k: 2 }, staff: { name: '직원 응원', icon: '🥤', k: 1.3 }, boost: { name: '수익 2배', icon: '💰' } };
// 광고 보상 (게임 화면 📺 버튼 · 상점) · 하루 한도는 원어데이 앱(게임당 5)과 같게 — 원어데이 밖에서도 5
export const AD_REWARDS = [
  { id: 'boost', name: '수익 2배', icon: '💰', desc: '3분 동안 버는 돈이 두 배' },
  { id: 'speed', name: '빨리 걷기', icon: '👟', desc: '3분 동안 이동 속도 ×1.4' },
  { id: 'coins', name: '돈 바로 받기', icon: '🪙', desc: '지금 가게 규모만큼 돈' },
];
export const AD_DAY = 10, GIFT = 80;   /* 광고 바구니 하루 10 (2026-11-09 대표: 브랜드 게임 게임당 10 · 앱 전체 15 그대로) · 하루 무료 선물 = GIFT × 지점 배수 × (1 + 열린 칸/10) */
// 돌발 이벤트 (테스터 #12): 1호점 4칸 이상 열면 every 초마다 하나 · 놓쳐도 벌 없음 (유능감 원칙)
export const EVENTS = { first: 70, every: [100, 160], minOpen: 4,
  complain: { name: '컴플레인 손님', sec: 25, bonus: 60 },   /* 사장님이 다가가 사과하면 단골 기분 + 보너스 */
  group: { name: '단체 주문', sec: 60, n: [6, 9], k: 1.6 },   /* 줄 맨 앞에 큰 주문 · 다 내주면 값 ×1.6 */
  influencer: { name: '인플루언서 방문', sec: 45 },   /* 손님 두 배 + 팁 잘 줌 */
};   /* 직원 단계 비용 = base × 1.6^단계 × 지점 배수 */
export const CUST_COLORS = [0x6A9AE8, 0xE86A8A, 0x9ACF6A, 0xF2C14E, 0xC08AE0, 0x5AC0B0, 0xE8A06A, 0x8AA0B8];
export const COUPON = { goal: 150, text: '크림치즈 1개 무료 (베이글 구매 시) · 시험용', valid: '시험 기간에는 매장에서 쓸 수 없어요' };   /* 쿠폰 내용은 트렌차이즈와 정함 */
// ── 아이러브커피에서 가져온 재미 (2026-10-27): 메뉴 숙련 · 손님 기분 · 꾸미기 · 단골
// 메뉴 숙련: 메뉴 이름별 판매 수 → ★1~5 · 별 하나마다 값 +6%
export const MASTERY = [0, 60, 250, 700, 1600];
export const MASTERY_K = 0.06;
// 손님 기분: 줄 선 시간(초) — 빨리 받으면 하트 + 팁, 오래 기다리면 시무룩 (벌 없음, 팁만 없음)
export const MOOD = { happy: 10, ok: 25, tip: 0.15 };
// 꾸미기: 지점마다 놓는 소품 · 사기 전에 자리를 반투명으로 미리 보고(#13) 놓은 뒤에도 옮길 수 있음(#14) — 자리는 S.decoPos[지점][id]
//   wall: 벽에 거는 것(뒷벽 back · 왼벽 left, 옮기면 가까운 벽에 붙음) · pos 없음(꽃병) = 테이블마다 놓여 옮기지 않음 · score = 「베이글 향」 (손님이 더 자주 + 팁 확률)
//   pos: 기본 자리 (모든 지점이 같은 배치 · v2 방 배치 · 그 방이 아직 안 열렸으면 가까운 빈 곳) · r: 부딪힘 반지름 (0 = 바닥/벽이라 안 부딪힘) · 벽 소품은 뒷벽(z -1150)
export const DECO = [
  { id: 'monstera', name: '큰 몬스테라 화분', icon: '🪴', cost: 220, score: 10, pos: [-200, 400], r: 45, desc: '가게 구석이 싱그러워져요' },
  { id: 'rug', name: '라탄 러그', icon: '🟫', cost: 320, score: 12, pos: [-450, 100], r: 0, desc: '테이블 사이 따뜻한 바닥' },
  { id: 'bench', name: '창가 쿠션 벤치', icon: '🛋', cost: 470, score: 16, pos: [-420, -1100], r: 0, wall: 'left', desc: '벽을 따라 놓인 긴 의자' },
  { id: 'lamp', name: '스탠드 조명', icon: '💡', cost: 540, score: 15, pos: [-590, -400], r: 30, desc: '반죽기 옆을 밝혀요' },
  { id: 'shelf', name: '베이글 벽 선반', icon: '🥯', cost: 650, score: 18, pos: [320, -1135], r: 0, wall: 'back', desc: '갓 구운 베이글을 벽에 진열' },
  { id: 'board', name: '오늘의 메뉴 칠판', icon: '📋', cost: 760, score: 18, pos: [-210, -410], r: 30, desc: '문 앞 손글씨 칠판' },
  { id: 'gallery', name: '도쿄 사진 액자', icon: '🖼', cost: 860, score: 20, pos: [-160, -1135], r: 0, wall: 'left', desc: '요요기 본점의 아침 풍경' },
  { id: 'vase', name: '테이블 꽃병', icon: '💐', cost: 970, score: 22, pos: null, r: 0, desc: '열린 테이블마다 꽃 한 송이' },
  { id: 'plants2', name: '화분 3단 선반', icon: '🌿', cost: 1150, score: 24, pos: [1150, 380], r: 45, desc: '입구가 숲처럼' },
  { id: 'terrace', name: '테라스 파라솔', icon: '⛱', cost: 1620, score: 30, pos: [-20, 630], r: 0, desc: '가게 앞 바깥 자리' },
  { id: 'photo', name: '단골 사진 벽', icon: '📸', cost: 0, score: 25, pos: [-480, -1135], r: 0, wall: 'left', desc: '단골 여섯 명의 하트를 다 채우면 받아요', gift: true },
];
// 단골: 하루 한 번 찾아오는 동네 사람 · fav = 좋아하는 메뉴 칸(bagel 플레인 · cream 특별 · coffee 크림치즈 · drink 커피)
//   하트 단계 = 호감 [1, 3, 6, 10, 15] · 단계마다 사연 한 줄 · 2·4단계는 꾸미기 선물
export const FAVOR = [1, 3, 6, 10, 15];
export const REGULARS = [
  { id: 'jiwoo', name: '지우', who: '근처 회사원', body: 0x5A6A8A, hair: 0x2A1A10, fav: 'drink', need: 0,
    hi: '오늘도 아아 하나요!', gift: ['monstera', 'lamp'],
    story: ['출근 전에 여기 들르는 게 하루의 시작이에요.', '사실 커피보다 사장님 인사가 더 깨워 줘요.', '팀장님한테 베이글 사 갔더니 칭찬받았어요!', '이직 고민 중이었는데… 이 동네 떠나기 싫어서 남기로 했어요.', '오늘은 제가 살게요. 늘 고마웠어요.'] },
  { id: 'halmae', name: '순자 할머니', who: '석촌호수 산책 단골', body: 0xB88AC8, hair: 0xD8D8D8, fav: 'bagel', need: 1,
    hi: '플레인 하나 줘요, 손주 줄 거야', gift: ['rug', 'vase'],
    story: ['손주가 여기 베이글만 먹어요.', '젊을 땐 나도 빵집을 했었지.', '반죽 소리가 우리 가게랑 똑같아서 좋아.', '손주가 대학 붙었대! 오늘은 두 개 사 갈게.', '이 가게 오래오래 해 줘요. 내가 꼭 올게.'] },
  { id: 'minho', name: '민호', who: '대학생 · 베이글 덕후', body: 0xF2C14E, hair: 0x6A3A1A, fav: 'cream', need: 3,
    hi: '오늘의 특별 베이글 뭐예요?', gift: ['shelf', 'board'],
    story: ['베이글 지도 만드는 중인데 여기가 1등이에요.', '솔트버터는 겉바속쫄의 교과서예요.', '과제 하다 밤새면 아침에 여기로 와요.', '제 블로그에 소개했는데 조회수 대박!', '졸업하면 저도 이런 가게 하고 싶어요.'] },
  { id: 'yuna', name: '유나', who: '필라테스 강사', body: 0x9ACF6A, hair: 0x3A2A1A, fav: 'coffee', need: 6,
    hi: '크림치즈 컵 하나요, 가볍게!', gift: ['plants2', 'gallery'],
    story: ['수업 끝나고 여기 크림치즈가 보상이에요.', '회원님들한테도 다 추천했어요.', '요즘 수업이 늘어서 바빠요. 그래도 여긴 와요.', '제 스튜디오 열었어요! 오픈 선물로 베이글 주문할게요.', '여기 오면 숨이 쉬어져요.'] },
  { id: 'dad', name: '정우 아빠', who: '주말마다 아이와', body: 0x6AB0C8, hair: 0x1A1A1A, fav: 'cream', need: 10,
    hi: '아이가 고른 걸로 주세요!', gift: ['terrace', 'bench'],
    story: ['정우가 베이글 구멍으로 세상 보는 걸 좋아해요.', '주말 아침은 무조건 여기예요.', '정우가 커서 사장님 되고 싶대요.', '둘째가 생겼어요! 넷이 올 날을 기다려요.', '이 가게가 우리 가족 추억이 됐어요.'] },
  { id: 'sora', name: '소라', who: '근처 작가', body: 0xE8A06A, hair: 0x5A2A1A, fav: 'drink', need: 14,
    hi: '창가 자리 비었나요?', gift: ['vase', 'gallery'],
    story: ['여기서 쓴 글이 제일 잘 써져요.', '반죽 냄새가 문장을 부드럽게 해요.', '이 가게를 배경으로 소설을 쓰고 있어요.', '책이 나왔어요! 첫 장에 이 가게가 나와요.', '사인한 책 한 권 놓고 갈게요. 선반에 둬 주세요.'] },
];

// ── BM (2026-11-09 계획안 4장 · 대표 결정: 광고 게임당 10 · 수익 배수 판매 허용(과금 속도 무과금의 2배 이하) · 실물 쿠폰은 골드 · 광고로 주지 않음)
// 보상형 광고 자리 10곳 · 바구니 하나 (하루 AD_DAY) · cap = 그 자리 하루 상한 · gold = 광고를 다 쓰면 같은 효과의 골드 상품(없으면 숨김)
export const AD_PLACES = {
  crew_free: { name: '크루룸 무료 단계', cap: 2, gold: 'free_lv' }, boss_free: { name: '사장실 무료 단계', cap: 2, gold: 'free_lv' },
  balloon: { name: '베이글 풍선', cap: 3 }, offline2x: { name: '금고 ×2', cap: 1, gold: 'safe2x' },
  build_now: { name: '공사 즉시 완성', cap: 2, gold: 'inst' }, idle_up: { name: '쉬는 동안 수익 단계', cap: 2, gold: 'idle_up' },
  event2x: { name: '이벤트 보상 ×2', cap: 1 }, outfit_ad: { name: '유니폼 열기', cap: 1 }, gift2x: { name: '창고 선물 ×2', cap: 1 },
  hud: { name: '📺 보상', cap: 2, gold: 'boost' },
};
/* 원어데이 골드 상품 (가격은 서버 oneaday/server/api/_lib/gold.js SHOP.bagel 이 기준 · 여기 값은 화면 미리 보기 · 서버 표에 없으면(off) 버튼을 숨김) */
export const GOLD = {
  starter: { name: '오픈 축하 세트', gold: 250, desc: '1시간치 돈 · 마루미 주황 유니폼 · 공사 즉시 완성권 3장', free: '유니폼은 광고 3편 · 공사는 기다리기', days: 7 },
  vip7: { name: '마루미 VIP 7일', gold: 200, days: 7, free: '광고 수익 2배 · 쉬는 동안 수익 단계' },
  vip30: { name: '마루미 VIP 30일', gold: 600, days: 30, free: '광고 수익 2배 · 쉬는 동안 수익 단계' },
  cash10: { name: '금고 꾸러미 (작은)', gold: 20, min: 10, free: '광고 「돈 바로」 · 플레이' },
  cash60: { name: '금고 꾸러미 (중간)', gold: 100, min: 60, free: '광고 「돈 바로」 · 플레이' },
  cash240: { name: '금고 꾸러미 (큰)', gold: 300, min: 240, free: '광고 「돈 바로」 · 플레이' },
  idle_up: { name: '쉬는 동안 수익 +10%', gold: 60, free: '광고 3편 = 1단계' },
  free_lv: { name: '강화 1단계 바로', gold: 20, free: '광고 · 게임 돈' },
  safe2x: { name: '금고 2배', gold: 20, free: '광고 1편' },
  boost: { name: '📺 보상 (광고 대신)', gold: 20, free: '광고 1편' },
  manager: { name: '베테랑 점장', gold: 400, free: '4호점 완성 보상으로 무료' },
  pass_s1: { name: '마루미 시즌 패스 · 시즌 1', gold: 500, free: '무료 줄 (보상의 대부분)' },
};
export const VIP = { mult: 1.3, idleH: 3, maxDays: 28, boxMin: 5 };   /* 수익 ×1.3 (쉬는 동안 포함) · 쉬는 동안 쌓이는 시간 2 → 3시간 · 매일 창고 VIP 상자(장사 5분치) — 계획안 ×1.5 · 8시간이면 과금 속도가 무과금의 2배를 넘어(tools/growth_sim.mjs) 대표 결정 2 에 맞춰 낮춤 */
export const IDLE = { baseH: 2, managerH: 2, upK: 0.1, upMax: 5, upAds: 3, off: 0.25 };   /* off: 쉬는 동안 수익 = 장사 기준(0.9 × 지점 배수 × (1 + 열린 칸/10))의 25% — 실제 장사(봇 측정 약 3배)가 늘 더 큼 · growth_sim 으로 맞춤 */   /* 쉬는 동안 쌓이는 시간 · 점장 +2시간 · 지점 영구 단계 +10% (최대 5 · 광고 3편 = 1단계) */
// 지점 테마 세트 (능력치 0 · 겉모습만) — 무과금 길: 단골 ♥5 마다 하나씩 · 시즌 무료 줄 1종
export const THEME_SETS = [
  { id: 'set_lake', name: '석촌호수 벚꽃', icon: '🌸', gold: 300, floor: ['#F8F0F1', '#F0E2E5'], wall: 0xF6E4E8, trim: 0xD88AA0, petals: 0xF6B8C8 },
  { id: 'set_winter', name: '겨울 마루미', icon: '❄️', gold: 300, floor: ['#F2F5F8', '#DDE5EC'], wall: 0xEEF2F6, trim: 0x8AA0B8, petals: 0xFFFFFF },
  { id: 'set_camp', name: '숲속 캠핑', icon: '🏕', gold: 300, floor: ['#EFEBE1', '#E8E2D6'], wall: 0xB8C8A0, trim: 0x6A5A3A, petals: 0x8AB86A },
  { id: 'set_neon', name: 'TOKYO 네온', icon: '🌃', gold: 300, floor: ['#2E2E38', '#2A2A33'], wall: 0x3A3A46, trim: 0xFF6720, petals: 0xFF6720 },
];
// 프리미엄 유니폼 (능력치 0) — 무과금 길: 광고 3편 (날 넘겨도 쌓임)
export const OUTFITS_PRO = [
  { id: 'out_sakura', name: '벚꽃 핑크 셰프', icon: '🌸', gold: 200, body: 0xF2B8C6, apronC: 0xFFFFFF, hat: 'beret', cap: 0xE8829A, desc: '석촌호수 봄 한정' },
  { id: 'out_denim', name: '데님 워크 에이프런', icon: '👖', gold: 250, body: 0xF3E7D6, apronC: 0x3A5A8A, hat: 'cap', cap: 0x3A5A8A, desc: '도쿄 골목 작업복' },
  { id: 'out_gold', name: '골드 마스터 셰프', icon: '🏅', gold: 300, body: 0x2A2A2E, apronC: 0xE8B23A, hat: 'bandana', cap: 0xE8B23A, desc: '4호점 사장님 감성' },
];
// 시즌 패스 (4~6주 · 실제 신메뉴 출시와 맞춤 — 지금은 시즌 1) · XP = 시즌 동안 판 베이글 · 무료 줄이 보상의 대부분
export const SEASON = { id: 's1', name: '시즌 1 · 마루미 겨울', from: '2026-11-09', to: '2026-12-21', xp: [0, 60, 160, 300, 480, 700, 960, 1260, 1600, 2000],
  free: [{ coins: 10 }, { inst: 1 }, { coins: 20 }, { safe: 1 }, { coins: 30 }, { inst: 1 }, { coins: 45 }, { set: 'set_winter' }, { coins: 60 }, { inst: 2 }],
  paid: [{ outfit: 'out_denim' }, { coins: 20 }, { inst: 2 }, { coins: 40 }, { set: 'set_camp' }, { coins: 60 }, { inst: 3 }, { coins: 90 }, { outfit: 'out_gold' }, { set: 'set_neon' }] };
/* 시즌 보상 coins = 그 지점 「분」치 돈 · inst = 공사 즉시 완성권 · safe = 금고 꾸러미(10분치) */
// 매장 찾기 (사장실 지도 · 지점 완성 창) — 지도 앱 검색 링크
export const STORE_MAP = BRANCH_INFO.map(a => 'https://map.naver.com/p/search/' + encodeURIComponent('마루미베이글 ' + a.split(' ').slice(2, 4).join(' ')));

