// 데이터: 브랜드(받은 자료로 교체) · 메뉴 · 지점 배치 · 열기 순서 · 직원 · 쿠폰
//   ※ 메뉴 이름 · 지점 이름 · 색은 임시 — 트렌차이즈 자료 받으면 여기만 바꾸면 됨
export const BRAND = { name: '마루미베이글', sign: 'marumi', sub: 'TOKYO BAGEL', dark: '#5A3A22', brown: '#A98259', accent: '#FF6720', accentHex: 0xFF6720, cream: '#F3E7D6',
  slogan: '일상의 쉼표가 되는 곳, 마루미베이글에서 즐기는 갓 구운 행복', story: '도쿄 요요기에서 이어지는 정신 · 매일 새벽 직접 반죽하고 굽는 수제 베이글', insta: 'https://www.instagram.com/marumi.bagel_official/' };   /* 공식 홈페이지 marumibagel.com */
// 조사: 마지막 글자 받침으로 고름 · josa('크림치즈', '을/를') → '크림치즈를' · '으로/로' 는 ㄹ 받침도 '로'
export function josa(w, pair) { const [a, b] = pair.split('/'), c = String(w).trim().slice(-1).charCodeAt(0) - 0xAC00; if (c < 0 || c > 11171) return `${w}${a}(${b})`;
  const jong = c % 28; return w + (pair === '으로/로' ? (jong && jong !== 8 ? a : b) : jong ? a : b); }
export const GAME = { title: '마루미 베이글 하우스', en: 'Marumi Bagel House' };
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
// 지점: 가게 크기 · 테마 · 배수 · 설비 자리 (order = 열리는 순서 · cost = 열기 비용)
//   type: oven·counter·ccbar·coffee·table·bin·drive·hire(staff)·up(upgrade)·plant·next
const B1 = {
  W: 1500, D: 1500, mult: 1,
  theme: { floorA: '#FBF1E3', floorB: '#F0DCC2', wallA: 0xF7E6CF, wallB: 0xEFD9BC, trim: 0x9A643A, outside: 0xE8D2B4 },
  door: [380, 920], queue: [[260, 250], 110],
  slots: [
    { id: 'mixer', type: 'mixer', x: -620, z: -600, free: true },
    { id: 'oven', type: 'oven', x: -170, z: -580, free: true },
    { id: 'counter', type: 'counter', x: 150, z: 80, free: true },
    { id: 'bin', type: 'bin', x: -600, z: -110, free: true },
    { id: 't1', type: 'table', x: -440, z: 340, cost: 30 },
    { id: 'cashier', type: 'hire', staff: 'cashier', x: 460, z: -130, cost: 90, label: '계산원 뽑기' },
    { id: 'dougher', type: 'hire', staff: 'dougher', x: -580, z: -300, cost: 140, label: '반죽 직원 뽑기' },
    { id: 'cc', type: 'ccbar', x: 130, z: -580, cost: 160, label: '토핑 바' },
    { id: 't2', type: 'table', x: -40, z: 340, cost: 200 },
    { id: 'espresso', type: 'espresso', x: 640, z: -570, cost: 340, label: '커피 머신' },
    { id: 'baker', type: 'hire', staff: 'baker', x: -200, z: -300, cost: 300, label: '진열 직원 뽑기' },
    { id: 'coffee', type: 'coffee', x: 430, z: -580, cost: 420, label: '크림치즈 냉장고' },
    { id: 'topper', type: 'hire', staff: 'topper', x: 130, z: -300, cost: 520, label: '토핑 직원 뽑기' },
    { id: 't3', type: 'table', x: -440, z: 640, cost: 560 },
    { id: 'carry', type: 'up', up: 'carry', x: 330, z: 260, cost: 640, label: '더 많이 들기' },
    { id: 'fridge', type: 'hire', staff: 'fridge', x: 430, z: -315, cost: 760, label: '음료·크림치즈 직원 뽑기' },
    { id: 'kettle', type: 'kettle', x: -420, z: -590, cost: 900, label: '데치기 솥 · 쫄깃 베이글' },
    { id: 't4', type: 'table', x: -40, z: 640, cost: 900 },
    { id: 'cleaner', type: 'hire', staff: 'cleaner', x: -400, z: 90, cost: 1100, label: '청소 직원 뽑기' },
    { id: 'drive', type: 'drive', x: 740, z: -200, px: 560, pz: 60, cost: 1600, label: '드라이브스루' },
    { id: 'driver', type: 'hire', staff: 'driver', x: 560, z: 230, cost: 1400, label: '드라이브스루 직원 뽑기' },
    { id: 'speed', type: 'up', up: 'speed', x: 330, z: 450, cost: 1300, label: '빨리 걷기' },
    { id: 'next', type: 'next', x: 330, z: 640, cost: 3500, label: '2호점 열기' },
  ],
};
/* 밸런스 (2026-10-27): 뒤로 갈수록 비싸게 — 열리는 순서 i 에 따라 ×1.2 → ×2.8 (1호점 완성 약 1시간 목표) */
{ const paid = B1.slots.filter(x => x.cost); paid.forEach((x, i) => { x.cost = Math.round(x.cost * (1.2 + 1.6 * i / (paid.length - 1)) / 10) * 10; }); }
const scale = (b, k, theme, name) => ({ ...b, name, mult: k, theme: { ...b.theme, ...theme }, slots: b.slots.map(s => ({ ...s, cost: s.cost && Math.round(s.cost * k * 1.6 / 10) * 10, label: s.id === 'next' ? s.labelNext || s.label : s.label })) });
export const BRANCHES = [
  { ...B1, name: '1호점 · 잠실리센츠점', photo: 'store1' },
  { ...scale(B1, 4, { floorA: '#F4F1EC', floorB: '#DCD3C8', wallA: 0xEDE6DC, wallB: 0xE2D8CA, trim: 0x5A4A3A, outside: 0xD9CDBC }, '2호점 · 석촌본점'), photo: 'store2' },
  { ...scale(B1, 14, { floorA: '#FFF4E8', floorB: '#F7D9C4', wallA: 0xFBE3D3, wallB: 0xF1D2BE, trim: 0xB0603A, outside: 0xEBCDB6 }, '3호점 · 헬리오시티점'), photo: 'store3' },
  { ...scale(B1, 45, { floorA: '#F0EEE8', floorB: '#D2CCC0', wallA: 0xE8E2D8, wallB: 0xDAD2C4, trim: 0x3A3A3A, outside: 0xCFC6B6 }, '4호점 · 파크포레온점'), photo: 'store4' },
];
BRANCHES.forEach((b, i) => { const n = b.slots.find(s => s.id === 'next'); if (n) n.label = `${i + 2}호점 열기`; }); BRANCHES[3].slots = BRANCHES[3].slots.filter(s => s.id !== 'next');
export const BRANCH_INFO = ['서울 송파구 올림픽로 145 리센츠상가 1층', '서울 송파구 삼학사로 42-1 1~2층', '서울 송파구 송파대로 345 헬리오시티 B1', '서울 강동구 양재대로 1360 포레온스테이션5 B1'];
// 업그레이드 (지점마다 · 1~10단계): 효과는 game.js 에서 L(이름)으로 읽음
export const UPGRADES = [
  { id: 'oven', name: '오븐 성능', desc: '베이글이 더 빨리 구워져요', icon: '🔥', base: 80, need: 'oven' },
  { id: 'ovenCap', name: '오븐 판 늘리기', desc: '오븐에 더 많이 쌓여요', icon: '🧺', base: 120, need: 'oven' },
  { id: 'mixer', name: '반죽기 속도', desc: '반죽이 더 빨리 나와요', icon: '🥣', base: 140, need: 'mixer' },
  { id: 'kettle', name: '쫄깃함 연구', desc: '쫄깃 베이글 값이 더 올라요', icon: '♨️', base: 200, need: 'kettle' },
  { id: 'bar', name: '토핑 바 손 빠르게', desc: '특별 베이글이 빨리 만들어져요', icon: '🧂', base: 150, need: 'cc' },
  { id: 'fridge', name: '크림치즈 냉장고 확장', desc: '크림치즈가 더 빨리 채워져요', icon: '🧊', base: 200, need: 'coffee' },
  { id: 'espresso', name: '커피 머신 속도', desc: '커피가 더 빨리 나와요', icon: '☕', base: 160, need: 'espresso' },
  { id: 'price', name: '메뉴 가격 올리기', desc: '모든 메뉴 +8%', icon: '💰', base: 180 },
  { id: 'ads', name: 'SNS 홍보', desc: '손님이 더 자주 와요', icon: '📣', base: 160 },
  { id: 'tip', name: '친절 서비스', desc: '손님이 팁을 줄 때가 있어요', icon: '😊', base: 220 },
];
export const UP_MAX = 10;
export const upCost = (u, lv, mult) => Math.round(u.base * 1.6 * Math.pow(1.6, lv) * mult / 5) * 5;
export const FINISHED_RATE = 0.9;   /* 다 연 지점 자동 수익 (초당, × 지점 배수 × (1 + 가격 단계/10)) */
// 사람 · 직원 · 손님 · 쿠폰
export const PLAYER = { speed: 430, carry: 6, carryUp: 10, speedUp: 1.3 };
export const STAFF = {
  cashier: { name: '계산원', body: 0x5A8AE0, serve: 0.55, hello: '계산원이 계산을 맡아요!', up: '계산 속도' },
  baker: { name: '진열 직원', body: 0x7A4A2A, speed: 300, carry: 4, hello: '진열 직원이 베이글을 계산대로 날라요!', up: '걷기 속도 · 들기' },
  topper: { name: '토핑 직원', body: 0xE2A020, speed: 290, carry: 3, hello: '토핑 직원이 특별 베이글을 만들어요!', up: '걷기 속도 · 들기', cap: 0xFF6720 },
  fridge: { name: '음료·크림치즈 직원', body: 0x8AC8E8, speed: 290, carry: 3, hello: '크림치즈와 커피를 계산대에 채워요!', up: '걷기 속도 · 들기' },
  dougher: { name: '반죽 직원', body: 0xF4F0E8, speed: 280, carry: 3, hello: '반죽 직원이 반죽을 데치고 오븐에 넣어요!', up: '걷기 속도 · 들기', cap: 0xA98259 },
  driver: { name: '드라이브스루 직원', body: 0xE86A8A, speed: 300, carry: 4, hello: '드라이브스루 주문을 맡아요!', up: '걷기 속도 · 들기', cap: 0xFF6720 },
  cleaner: { name: '청소 직원', body: 0x6AB07A, speed: 320, carry: 4, hello: '청소 직원이 테이블을 치워요!', up: '걷기 속도 · 들기' },
};
export const STAFF_UP = { base: 260, max: 10 };   /* 직원 단계 비용 = base × 1.6^단계 × 지점 배수 */
export const CUST_COLORS = [0x6A9AE8, 0xE86A8A, 0x9ACF6A, 0xF2C14E, 0xC08AE0, 0x5AC0B0, 0xE8A06A, 0x8AA0B8];
export const COUPON = { goal: 150, text: '크림치즈 1개 무료 (베이글 구매 시) · 시험용', valid: '시험 기간에는 매장에서 쓸 수 없어요' };   /* 쿠폰 내용은 트렌차이즈와 정함 */
// ── 아이러브커피에서 가져온 재미 (2026-10-27): 메뉴 숙련 · 손님 기분 · 꾸미기 · 단골
// 메뉴 숙련: 메뉴 이름별 판매 수 → ★1~5 · 별 하나마다 값 +6%
export const MASTERY = [0, 60, 250, 700, 1600];
export const MASTERY_K = 0.06;
// 손님 기분: 줄 선 시간(초) — 빨리 받으면 하트 + 팁, 오래 기다리면 시무룩 (벌 없음, 팁만 없음)
export const MOOD = { happy: 10, ok: 25, tip: 0.15 };
// 꾸미기: 지점마다 정해진 자리에 놓는 소품 · score = 「베이글 향」 (손님이 더 자주 + 팁 확률)
//   pos: 1호점 배치 기준 좌표 (모든 지점이 같은 배치) · r: 부딪힘 반지름 (0 = 바닥/벽이라 안 부딪힘)
export const DECO = [
  { id: 'monstera', name: '큰 몬스테라 화분', icon: '🪴', cost: 220, score: 10, pos: [-690, 690], r: 45, desc: '가게 구석이 싱그러워져요' },
  { id: 'rug', name: '라탄 러그', icon: '🟫', cost: 320, score: 12, pos: [-240, 490], r: 0, desc: '테이블 사이 따뜻한 바닥' },
  { id: 'bench', name: '창가 쿠션 벤치', icon: '🛋', cost: 470, score: 16, pos: [-700, 500], r: 0, desc: '벽을 따라 놓인 긴 의자' },
  { id: 'lamp', name: '스탠드 조명', icon: '💡', cost: 540, score: 15, pos: [-700, -460], r: 30, desc: '반죽기 옆을 밝혀요' },
  { id: 'shelf', name: '베이글 벽 선반', icon: '🥯', cost: 650, score: 18, pos: [300, -735], r: 0, desc: '갓 구운 베이글을 벽에 진열' },
  { id: 'board', name: '오늘의 메뉴 칠판', icon: '📋', cost: 760, score: 18, pos: [600, 640], r: 30, desc: '문 앞 손글씨 칠판' },
  { id: 'gallery', name: '도쿄 사진 액자', icon: '🖼', cost: 860, score: 20, pos: [-733, -480], r: 0, desc: '요요기 본점의 아침 풍경' },
  { id: 'vase', name: '테이블 꽃병', icon: '💐', cost: 970, score: 22, pos: null, r: 0, desc: '열린 테이블마다 꽃 한 송이' },
  { id: 'plants2', name: '화분 3단 선반', icon: '🌿', cost: 1150, score: 24, pos: [690, 690], r: 45, desc: '입구가 숲처럼' },
  { id: 'terrace', name: '테라스 파라솔', icon: '⛱', cost: 1620, score: 30, pos: [-300, 930], r: 0, desc: '가게 앞 바깥 자리' },
  { id: 'photo', name: '단골 사진 벽', icon: '📸', cost: 0, score: 25, pos: [-733, 250], r: 0, desc: '단골 여섯 명의 하트를 다 채우면 받아요', gift: true },
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
