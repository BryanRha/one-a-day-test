// 데이터: 브랜드(받은 자료로 교체) · 메뉴 · 지점 배치 · 열기 순서 · 직원 · 쿠폰
//   ※ 메뉴 이름 · 지점 이름 · 색은 임시 — 트렌차이즈 자료 받으면 여기만 바꾸면 됨
import { SPACES, MULT } from './space.js?v=0.99.28';
export const BRAND = { name: '마루미베이글', sign: 'marumi', sub: 'TOKYO BAGEL', dark: '#5A3A22', brown: '#A98259', accent: '#FF6720', accentHex: 0xFF6720, cream: '#F3E7D6',
  slogan: '일상의 쉼표가 되는 곳, 마루미베이글에서 즐기는 갓 구운 행복', story: '도쿄 요요기에서 이어지는 정신 · 매일 새벽 직접 반죽하고 굽는 수제 베이글', insta: 'https://www.instagram.com/marumi.bagel_official/' };   /* 공식 홈페이지 marumibagel.com */
// 조사: 마지막 글자 받침으로 고름 · josa('크림치즈', '을/를') → '크림치즈를' · '으로/로' 는 ㄹ 받침도 '로'
export function josa(w, pair) { const [a, b] = pair.split('/'), c = String(w).trim().slice(-1).charCodeAt(0) - 0xAC00; if (c < 0 || c > 11171) return `${w}${a}(${b})`;
  const jong = c % 28; return w + (pair === '으로/로' ? (jong && jong !== 8 ? a : b) : jong ? a : b); }
export const GAME = { title: '마루미 베이글 하우스', en: 'Marumi Bagel House', ver: '0.4.3' };
// 물건 → 메뉴 (가격은 지점 배수 곱함)
//   실제 메뉴 (잠실리센츠점 · 의뢰사 제공): 플레인 1,900 · 솔트버터 3,500 · 올리브치즈 2,900 · 치즈시금치 3,500 · 크랜베리호두 3,500 · 크림치즈 컵 각 2,000
//   게임 가격 = 실제 가격 비율 (플레인 1,900원 → 5)
//   물건 칸 이름은 그대로 두고(bagel·cream·coffee) 지점마다 무엇인지 바꿈: bagel=오븐 플레인 · cream=토핑 바 특별 베이글 · coffee=크림치즈 냉장고 컵
export const MENU = { drink: { name: '아메리카노', short: '아메리카노', price: 6, icon: '☕' }, bagel: { name: '플레인 베이글', short: '플레인', price: 5, icon: '🥯' }, cream: { name: '솔트버터 베이글', short: '솔트버터', price: 9, icon: '🥯', look: 'salt' }, coffee: { name: '플레인 크림치즈', short: '크림치즈', price: 5, icon: '🧀', look: 'cup_plain' } };
export const BRANCH_MENU = [
  { cream: { name: '솔트버터 베이글', short: '솔트버터', price: 9, look: 'salt', bar: '솔트버터 바', icon: '🧈' }, coffee: { name: '플레인 크림치즈', short: '플레인 크림', price: 5, look: 'cup_plain' } },
  { cream: { name: '올리브치즈 베이글', short: '올리브치즈', price: 8, look: 'olive', bar: '올리브치즈 바', icon: '🫒' }, coffee: { name: '블루베리 크림치즈', short: '블루베리 크림', price: 5, look: 'cup_blue' } },
  { cream: { name: '치즈시금치 베이글', short: '치즈시금치', price: 9, look: 'spinach', bar: '치즈시금치 바', icon: '🥬' }, coffee: { name: '대파베이컨 크림치즈', short: '대파베이컨 크림', price: 5, look: 'cup_scallion' } },
  { cream: { name: '크랜베리호두 베이글', short: '크랜베리호두', price: 9, look: 'cranberry', bar: '크랜베리호두 바', icon: '🍒' }, coffee: { name: '무화과호두 크림치즈', short: '무화과 크림', price: 5, look: 'cup_fig' } },
];
export function setBranchMenu(i) { const m = BRANCH_MENU[i] || BRANCH_MENU[0]; Object.assign(MENU.cream, m.cream); Object.assign(MENU.coffee, m.coffee); }
// 지점: 공간 · 여는 순서는 space.js (공간 모델) · 인테리어 4종은 아래 INTERIOR
const NAMES = ['1호점 · 잠실리센츠점', '2호점 · 석촌본점', '3호점 · 헬리오시티점', '4호점 · 파크포레온점'];
export const INTERIOR = [
  { id: 'oak', name: '밝은 우드 카페', floor: 'plank', fa: '#F1E8DC', fb: '#EBE0D1', line: '#DDD0BE', wall: 'plain', wallC: 0xF5EBDD, wallB: 0xF0E2CE, trim: 0xB07A44, light: 'pendant', props: 'oak', ext: 'awning', sky: '#F6EEE2', ground: 0xE7DCCB, hemi: [0xFFF4E2, 0xC9A882, 1.65], sun: 0xFFEFD6,
    note: '아파트 상가 아침 빵집 · 둥근 펜던트 등 · 몬스테라 · 라탄 의자' },
  { id: 'classic', name: '본점다운 클래식 베이커리', floor: 'check', fa: '#F2EDE6', fb: '#E3DBD0', line: '#D6CCBF', wall: 'wainscot', wallC: 0x8E8C88, wallB: 0x86847F, wain: 0x5A3A22, trim: 0x3E2A1A, light: 'brass', props: 'classic', ext: 'stripe', sky: '#E7EDF2', ground: 0xDCD6CC, hemi: [0xFFF0DC, 0xB49A7A, 1.55], sun: 0xFFE7C8, lake: true, cherry: true,
    note: '월넛 웨인스코팅 · 황동 벽등 · 샹들리에 · 빵 바구니 선반' },
  { id: 'white', name: '모던 화이트', floor: 'bigtile', fa: '#F4F5F4', fb: '#ECEEED', line: '#D6DAD9', wall: 'vtile', wallC: 0xFBFBFA, wallB: 0xF2F3F2, grout: 0xA8D8C8, trim: 0xC8CCCC, light: 'led', props: 'modern', ext: 'glass', sky: '#EEF1F3', ground: 0xD5D8DA, hemi: [0xF2F6FF, 0xB8BEC8, 1.75], sun: 0xF4F8FF,
    note: '흰 세로 타일 · 민트 줄눈 · 천장 LED 라인 · 테라조 진열대 · 네온 m' },
  { id: 'forest', name: '숲과 공원 테라스', floor: 'terracotta', fa: '#F2E9E3', fb: '#ECE0D8', line: '#DCCDC3', wall: 'louver', wallC: 0x9CB496, wallB: 0x93AC8D, wood: 0xB98A5A, trim: 0x7A5A3A, light: 'garland', props: 'forest', ext: 'wood', sky: '#E6EFDF', ground: 0xBFD9A8, hemi: [0xFFF6E2, 0x9AB08A, 1.6], sun: 0xFFF2D8, lawn: true,
    note: '원목 루버 · 세이지 그린 · 전구 줄조명 · 피크닉 테이블' },
];

export const BRANCHES = SPACES.map((sp, i) => ({ sp, name: NAMES[i], short: NAMES[i].replace(/점$/, '').replace(' · ', ' · '), photo: 'store' + (i + 1), mult: MULT[i], interior: INTERIOR[i] }));
export const BRANCH_INFO = ['서울 송파구 올림픽로 145 리센츠상가 1층', '서울 송파구 삼학사로 42-1 1~2층', '서울 송파구 송파대로 345 헬리오시티 B1', '서울 강동구 양재대로 1360 포레온스테이션5 B1'];
/* 공사 시간 표시 · 즉시 완성 골드 (남은 시간 비례: 30분 10 · 1시간 25 · 2시간 60 · 4시간 150 → 서버 등급 중 가까운 아래 값) */
export const hms = s => { s = Math.max(0, Math.ceil(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60; return h ? `${h}시간 ${m}분` : m ? `${m}분 ${String(ss).padStart(2, '0')}초` : `${ss}초`; };
const INST = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 100, 120, 150];
export function instGold(sec) { const P = [[0, 1], [1800, 10], [3600, 25], [7200, 60], [14400, 150]]; let g = 150;
  for (let i = 1; i < P.length; i++) if (sec <= P[i][0]) { const [a, ga] = P[i - 1], [b, gb] = P[i]; g = ga + (gb - ga) * (sec - a) / (b - a); break; }
  const v = Math.max(1, g); let t = 1; for (const x of INST) if (x <= v) t = x; return t; }
// 생산 · 강화 (DESIGN 5-3): 시설 기본 간격(초) · 받침 한도 · 강화 1단계 효과 · 외형은 3 · 6 · 9 단계에서 바뀜
/* 생산 사슬 (DESIGN 3-0, 0.4.3): 시설 = 받는 곳(in) → 시간 → 쌓이는 곳(out) — 생산 · 규칙(feed) · 직원 일 · 봇 · 시험이 이 표 하나만 읽음
   in = 받는 물건(앞이 먼저 — 오븐은 데친 반죽부터) · out = 나오는 물건(받은 물건마다 다르면 표) · yield = 하나 받아 몇 개 */
export const CHAIN = {
  mixer:  { in: null, out: 'dough' },
  retard: { in: ['dough'], out: 'aged', yield: 2 },
  kettle: { in: ['aged', 'dough'], out: 'boiled' },
  oven:   { in: ['boiled', 'aged', 'dough'], out: { boiled: 'chewy', aged: 'bagel', dough: 'bagel' } },
  top:    { in: ['chewy', 'bagel'], out: 'cream' },
  cream:  { in: null, out: 'coffee' },
  coffee: { in: null, out: 'drink' },
};
export const IN_CAP = 6;   /* 받는 곳 칸 */
export const SLOT = { chewy: 'bagel' };   /* 진열 칸: 쫄깃은 베이글 칸에 (값은 쫄깃) */
export const slotOf = k => SLOT[k] || k;
export const INTER = ['dough', 'aged', 'boiled'];   /* 중간 물건 (진열 안 됨 · 받는 곳으로만) */
export const outsOf = id => { const o = CHAIN[id]?.out; return !o ? [] : typeof o === 'string' ? [o] : [...new Set(Object.values(o))]; };
export const PROD = { mixer: { sec: 1.6, k: 0.12, tray: 8 }, retard: { sec: 6.0, k: 0.10, tray: 8 }, kettle: { sec: 2.0, k: 0.12, tray: 8, chewy: 8, ck: 0.05 }, oven: { sec: 2.0, k: 0.12, tray: 6 }, top: { sec: 4.0, k: 0.15, tray: 6 }, cream: { sec: 5.0, k: 0.15, tray: 6 }, coffee: { sec: 4.0, k: 0.15, tray: 6 } };
export const UP_MAX = 10, UP_K = 1.45;   /* 강화 값 = 시설 값 × 1.45^단계 (ORDER 에 없는 단계) */
export const TIER_AT = [3, 6, 9], TIER_NAME = ['기본', '브랜드', '프로', '마스터'];
export const tierOf = lv => TIER_AT.filter(x => lv >= x).length;
/* 사람 강화 (별채 책상 카드) — 1호점 기준 값 × 1.45^단계 × 지점 배수 */
export const DESK_UP = {
  walk: { name: '사장님 걷기', icon: '🏃', base: 80, desc: '사장님 +8% 빠르게', room: 'boss' },
  carry: { name: '사장님 들기', icon: '🥯', base: 260, desc: '한 번에 +1개 더', room: 'boss' },
  ads: { name: 'SNS 홍보', icon: '📣', base: 900, desc: '손님이 +8% 더 자주', room: 'boss' },
  price: { name: '메뉴 가격', icon: '💰', base: 600, desc: '모든 메뉴 +6%', room: 'boss' },
  swalk: { name: '직원 걷기', icon: '👟', base: 400, desc: '모든 직원 +10% 빠르게', room: 'crew' },
  scarry: { name: '직원 들기', icon: '🧺', base: 500, desc: '직원 +1개 더 들기', room: 'crew' },
};
/* 손 · 받침 상한 (DESIGN 3-0, 0.4.3 대표 캡처: 머리 위 베이글 탑) — 사장 손 = 4 + 들기 단계(최대 3) + 큰 쟁반 1 · 최대 8 · 손 탑 높이 ≤ 1.1m · 쌓이는 곳 ≤ 10(2×2 한 층씩) · 직원 손 ≤ 6 */
export const HAND_MAX = 8, TRAY_MAX = 10, HAND_VIS = 110, STAFF_HAND_MAX = 6;
export const handCap = (lv, tray) => Math.min(HAND_MAX, PLAYER_CARRY + lv + (tray ? 1 : 0));
const PLAYER_CARRY = 4;
export const PLAYER = { speed: 400, carry: 4, look: { body: 0xFF6720, apronC: 0xFFFFFF, hat: 'toque', cap: 0xFF6720, hair: 0x2A1A10, pants: 0x3A2A22 } };   /* 사장님: 브랜드 주황 셰프복 · 흰 셰프 모자 · 발밑 주황 원 (대표 결정 11-10) */
/* 직원: 흰 옷 + 역할 색 캡 · 앞치마 한 점 (DESIGN 7장) · can = 규칙표에서 하는 일(rules.js id) · jobs = 작업 큐에서 가져가는 일 종류(staff.js to) · 2층 · 테라스 직원은 판 위 전용 규칙(staff.js deckRules) */
export const STAFF = {
  cashier: { name: '계산원', can: [], jobs: [], cap: 0x3B82C4, job: '계산대에서 손님을 받아요', hello: '계산원이 계산을 맡아요!' },
  runner: { name: '진열 직원', can: ['pick', 'place'], jobs: ['disp'], cap: 0xE0A030, job: '쌓이는 곳 → 계산대 진열', hello: '진열 직원이 계산대를 채워요!' },
  baker: { name: '반죽 직원', can: ['pick', 'feed'], jobs: ['feed'], feeds: ['kettle', 'oven', 'retard'], cap: 0xB07840, job: '반죽기 → 솥 → 오븐 나르기', hello: '반죽 직원이 반죽을 날라요!' },
  topper: { name: '토핑 직원', can: ['pick', 'feed'], jobs: ['feed'], feeds: ['top'], cap: 0xD24A6A, job: '오븐 → 작업대 나르기 · 작업대 ×1.5', hello: '토핑 직원이 특별 베이글을 만들어요!' },
  barista: { name: '음료 직원', can: ['pick', 'place'], jobs: ['disp'], kinds: ['coffee', 'drink'], cap: 0x6A4A3A, job: '크림치즈 · 커피 ×1.4 · 진열', hello: '음료 직원이 크림치즈와 커피를 맡아요!' },
  cleaner: { name: '청소 직원', can: ['trash_pick', 'trash_drop'], jobs: ['bin'], cap: 0x4AA06A, job: '테이블 치우기', hello: '청소 직원이 테이블을 치워요!' },
  picker: { name: '창구 직원', can: ['fetch', 'shelf'], jobs: ['shelf'], cap: 0x8A5AC8, job: '픽업 창구 주문', hello: '창구 직원이 픽업 주문을 맡아요!' },
  driver: { name: '드라이브 직원', can: ['fetch', 'shelf'], jobs: ['shelf'], cap: 0x8A5AC8, job: '드라이브스루 주문', hello: '드라이브스루 주문을 맡아요!' },
  server: { name: '2층 서빙 직원', can: [], jobs: ['up'], cap: 0x8A5AC8, job: '2층 테이블 치우기', hello: '2층 손님을 맡아요!' },
  cleaner2: { name: '테라스 직원', can: [], jobs: ['ter'], cap: 0x8A5AC8, job: '테라스 치우기', hello: '숲 테라스를 맡아요!' },
};
// 직원 쉬기: 화면을 안 만지고 REST 초가 지나면 직원이 하나씩 쉼 → 사장님이 다가가면(거리 near) 다시 일함 + 기운 충전(빨리 · BOOST 초)
export const REST = { after: 45, near: 150, boost: 30, boostK: 1.25, gap: 20, nap: 60 };   /* nap: 혼자 깨기까지 (0.4.3) */   /* 화면을 45초 안 만지면 고정 자리 직원 1명이 zZ (계산원 제외) · 사장 1.5m → 깨움 + 30초 ×1.25 */
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
//   원어데이 골드 상품은 아래 GOLD (브랜드 게임도 일반 게임과 같은 골드 · 광고 규칙 · 실물 쿠폰은 팔지 않음 — team/decisions.md)
export const SHOP_ITEMS = [
  { id: 'batch', name: '갓 구운 플레인 한 판', icon: '🥯', cost: 60, desc: '오븐에 플레인 10개가 바로 나와요' },
  { id: 'shoes', name: '가벼운 운동화', icon: '👟', cost: 90, fx: 'speed', sec: 180, desc: '3분 동안 빨리 걸어요' },
  { id: 'tray', name: '큰 쟁반', icon: '🧺', cost: 110, fx: 'tray', sec: 180, desc: '3분 동안 1개 더 들어요 (최대 8)' },
  { id: 'flyer', name: '전단지 돌리기', icon: '📣', cost: 120, fx: 'rush', sec: 120, desc: '2분 동안 손님이 두 배로 와요' },
  { id: 'cheer', name: '직원 응원 커피', icon: '🥤', cost: 140, fx: 'staff', sec: 180, desc: '3분 동안 직원이 30% 빨라요', staff: true },
];
export const FX = { speed: { name: '빨리 걷기', icon: '👟', k: 1.4 }, tray: { name: '큰 쟁반', icon: '🧺', n: 1 }, rush: { name: '손님 두 배', icon: '📣', k: 2 }, staff: { name: '직원 응원', icon: '🥤', k: 1.3 }, boost: { name: '수익 2배', icon: '💰' } };
// 광고 보상 (게임 화면 📺 버튼 · 상점) · 하루 한도는 원어데이 앱(게임당 5)과 같게 — 원어데이 밖에서도 5
export const AD_REWARDS = [
  { id: 'boost', name: '수익 2배', icon: '💰', desc: '3분 동안 버는 돈이 두 배' },
  { id: 'speed', name: '빨리 걷기', icon: '👟', desc: '3분 동안 이동 속도 ×1.4' },
  { id: 'coins', name: '돈 바로 받기', icon: '🪙', desc: '지금 가게 규모만큼 돈' },
];
export const AD_DAY = 10, GIFT = 80;   /* 광고 바구니 하루 10 (브랜드 게임 게임당 10 · 앱 전체 15 그대로 — team/decisions.md) · 하루 무료 선물 = GIFT × 지점 배수 × (1 + 열린 칸/10) */
// 돌발 이벤트: 시설 4개 이상 열면 every 초마다 하나 · 놓쳐도 벌 없음 (유능감 원칙) · 통화 손님 = 줄에서 전화 → 사장이 1.5m 안 2초 = 비켜 섬(+팁)
export const EVENTS = { first: 90, every: [100, 160], minOpen: 4,
  phone: { name: '통화 손님', sec: 30, near: 150, hold: 2, tip: 0.5 },
  group: { name: '단체 주문', sec: 60, n: [5, 7], k: 1.6 },
  influencer: { name: '인플루언서 방문', sec: 45 },
};
export const CUST_COLORS = [0xA9B4C8, 0xC8A9B4, 0xB4C4A2, 0xD2C2A0, 0xB8A8C8, 0xA2C0BC, 0xCFB29C, 0xA8B0B8];   /* 손님: 눌린 파스텔 단색 · 얼굴 없음 (사장만 강한 색) */
export const COUPON = { goal: 150, text: '크림치즈 1개 무료 (베이글 구매 시) · 시험용', valid: '시험 기간에는 매장에서 쓸 수 없어요' };   /* 쿠폰 내용은 트렌차이즈와 정함 */
// ── 아이러브커피에서 가져온 재미: 메뉴 숙련 · 손님 기분 · 꾸미기 · 단골
// 메뉴 숙련: 메뉴 이름별 판매 수 → ★1~5 · 별 하나마다 값 +6%
export const MASTERY = [0, 60, 250, 700, 1600];
export const MASTERY_K = 0.06;
// 손님 기분: 줄 선 시간(초) — 빨리 받으면 하트 + 팁, 오래 기다리면 시무룩 (벌 없음, 팁만 없음)
export const MOOD = { happy: 10, ok: 25, tip: 0.15 };
// 꾸미기: 지점마다 정해진 자리(새 배치 · 손님 길 · 일하는 길 밖)에 놓는 소품 · 「베이글 향」 = 손님 더 자주 + 팁
//   pos: 자리(cm) · wall: 벽에 붙는 것(back 뒤 벽 · left 서쪽 벽) · pos 없음(꽃병) = 테이블마다
export const DECO = [
  { id: 'monstera', name: '큰 몬스테라 화분', icon: '🪴', cost: 220, score: 10, pos: [70, 1740], r: 45, desc: '가게 구석이 싱그러워져요' },
  { id: 'rug', name: '라탄 러그', icon: '🟫', cost: 320, score: 12, pos: [380, 1320], r: 0, desc: '테이블 사이 따뜻한 바닥' },
  { id: 'bench', name: '창가 쿠션 벤치', icon: '🛋', cost: 470, score: 16, pos: [8, 1180], r: 0, wall: 'left', desc: '벽을 따라 놓인 긴 의자' },
  { id: 'lamp', name: '스탠드 조명', icon: '💡', cost: 540, score: 15, pos: [70, 1040], r: 30, desc: '반죽기 옆을 밝혀요' },
  { id: 'shelf', name: '베이글 벽 선반', icon: '🥯', cost: 650, score: 18, pos: [770, 8], r: 0, wall: 'back', desc: '갓 구운 베이글을 벽에 진열' },
  { id: 'board', name: '오늘의 메뉴 칠판', icon: '📋', cost: 760, score: 18, pos: [640, 1750], r: 30, desc: '문 앞 손글씨 칠판' },
  { id: 'gallery', name: '도쿄 사진 액자', icon: '🖼', cost: 860, score: 20, pos: [8, 880], r: 0, wall: 'left', desc: '요요기 본점의 아침 풍경' },
  { id: 'vase', name: '테이블 꽃병', icon: '💐', cost: 970, score: 22, pos: null, r: 0, desc: '열린 테이블마다 꽃 한 송이' },
  { id: 'plants2', name: '화분 3단 선반', icon: '🌿', cost: 1150, score: 24, pos: [1230, 1740], r: 45, desc: '입구가 숲처럼' },
  { id: 'terrace', name: '테라스 파라솔', icon: '⛱', cost: 1620, score: 30, pos: [1380, 2010], r: 0, desc: '가게 앞 바깥 자리' },
  { id: 'photo', name: '단골 사진 벽', icon: '📸', cost: 0, score: 25, pos: [8, 1520], r: 0, wall: 'left', desc: '단골 여섯 명의 하트를 다 채우면 받아요', gift: true },
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

// ── BM (EXPANSION_PLAN 4장 · team/decisions.md: 광고 게임당 10 · 수익 배수 판매 허용(과금 속도 무과금의 2배 이하) · 실물 쿠폰은 골드 · 광고로 주지 않음)
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
  free: [{ coins: 2 }, { coins: 2 }, { coins: 3 }, { coins: 3 }, { coins: 4 }, { inst: 1 }, { coins: 4 }, { set: 'set_winter' }, { coins: 5 }, { coins: 5 }],
  paid: [{ outfit: 'out_denim' }, { coins: 2 }, { coins: 3 }, { coins: 3 }, { set: 'set_camp' }, { coins: 4 }, { inst: 1 }, { coins: 5 }, { outfit: 'out_gold' }, { set: 'set_neon' }] };   /* 즉시 완성권 시즌 2장 (무료 1 · 골드 1) */
export const PASS_TIER_CAP = 1.5;   /* 한 칸 돈 보상 상한 = 그 단계를 채운 때 다음 칸 값 × 1.5 */
/* 시즌 보상 coins = 그때 진행 단계 수익 「분」치(ui perMin — 가격 곡선과 같이 커짐) · inst = 공사 즉시 완성권 (DESIGN 5-5, 0.4.3: 몰아 받기로 업그레이드를 한 번에 하지 않게 작게) */
export const PASS_DAY_MIN = 5;   /* 시즌 패스로 받는 돈은 하루 합 5분치까지 — 넘는 칸은 내일 (한꺼번에 받기 상한 · growth_sim B2) */
// 매장 찾기 (사장실 지도 · 지점 완성 창) — 지도 앱 검색 링크
export const STORE_MAP = BRANCH_INFO.map(a => 'https://map.naver.com/p/search/' + encodeURIComponent('마루미베이글 ' + a.split(' ').slice(2, 4).join(' ')));

