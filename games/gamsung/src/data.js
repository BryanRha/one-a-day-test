// 데이터: 브랜드 · 메뉴 · 원두 · 가구 · 단골 사연 · 레벨 · 매장
//   감성커피(㈜비브라더스) 공개 자료 기준 — 2026 브랜드 정체성: 感(느끼다) + 誠(정성) · 나무와 돌과 바람과 시
export const BRAND = {
  name: '감성커피', en: 'GAMSUNG COFFEE', red: '#A92E2B', redHex: 0xA92E2B, ink: '#3B2A20', paper: '#F6EFE4',
  slogan: '마음이 쉬어가는 곳', keywords: ['진심', '정갈함', '여백', '따뜻함', '단아함'], site: 'https://xn--439as41bv4jv9f.com/',
};
export const GAME = { title: '감성커피 · 마음이 쉬어가는 곳', short: '감성커피' };

// 메뉴: t = 내리는 시간(초) · n = 한 번에 나오는 잔 수 · bean = 잔당 원두 · lv = 열리는 레벨 · photo = 공식 사진
//   price = 한 잔 값 · xp = 경험치 · look = 3D 잔 모양 (models.js)
export const MENU = {
  americano: { name: '아메리카노', short: '아메리카노', cat: 'coffee', t: 8, n: 3, bean: 1, price: 12, xp: 2, lv: 1, look: 'americano' },
  latte: { name: '카페라떼', short: '카페라떼', cat: 'coffee', t: 18, n: 3, bean: 1, price: 16, xp: 3, lv: 1, look: 'latte' },
  mygamsung: { name: '마이감성 라떼', short: '마이감성', cat: 'sig', t: 40, n: 3, bean: 1, price: 24, xp: 4, lv: 2, look: 'mygamsung', photo: 'my-gamsung-latte' },
  vanilla: { name: '바닐라 라떼', short: '바닐라', cat: 'coffee', t: 35, n: 3, bean: 1, price: 20, xp: 3, lv: 3, look: 'vanilla' },
  croffle: { name: '크로플', short: '크로플', cat: 'dessert', t: 50, n: 4, bean: 0, price: 22, xp: 4, lv: 4, look: 'croffle', oven: true },
  dawn: { name: '새벽숲 라떼', short: '새벽숲', cat: 'sig', t: 60, n: 3, bean: 1, price: 32, xp: 6, lv: 5, look: 'dawn', photo: 'dawn-forest-latte' },
  coldbrew: { name: '콜드브루', short: '콜드브루', cat: 'coffee', t: 75, n: 3, bean: 2, price: 30, xp: 5, lv: 6, look: 'coldbrew' },
  jeju: { name: '제주 블루솔트 라떼', short: '블루솔트', cat: 'sig', t: 90, n: 3, bean: 1, price: 40, xp: 8, lv: 7, look: 'jeju', photo: 'jeju-blue-salt-latte' },
  macaron: { name: '마카롱', short: '마카롱', cat: 'dessert', t: 40, n: 4, bean: 0, price: 18, xp: 3, lv: 8, look: 'macaron', oven: true },
  berry: { name: '와일드베리 라떼', short: '와일드베리', cat: 'sig', t: 120, n: 3, bean: 1, price: 48, xp: 10, lv: 9, look: 'berry', photo: 'wild-berry-latte' },
  basque: { name: '바스크 치즈케이크', short: '바스크', cat: 'dessert', t: 150, n: 4, bean: 0, price: 44, xp: 9, lv: 11, look: 'basque', oven: true },
  tea: { name: '애프터눈티 라떼', short: '애프터눈티', cat: 'sig', t: 180, n: 3, bean: 0, price: 58, xp: 12, lv: 13, look: 'tea', photo: 'afternoon-tea-latte' },
};
export const CATS = [['sig', '시그니처'], ['coffee', '커피'], ['dessert', '디저트']];

// 원두 볶기: 볶는 시간(초) → 원두(잔 수) · 길게 볶을수록 많이 · 나가 있어도 계속 볶아짐
export const ROAST = [
  { id: 'house', name: '하우스 블렌드', t: 20, beans: 18, cost: 8, lv: 1, desc: '고소하고 부드럽게' },   /* 2026-10-27 손 추출로 많이 팔게 되어 넉넉히 */
  { id: 'single', name: '싱글 오리진', t: 90, beans: 70, cost: 25, lv: 3, desc: '산뜻한 꽃향' },
  { id: 'special', name: '스페셜티', t: 600, beans: 320, cost: 90, lv: 6, desc: '자고 일어나면 가득' },
  { id: 'night', name: '밤샘 로스팅', t: 4 * 3600, beans: 900, cost: 300, lv: 10, desc: '하루 장사 넉넉히' },
];
export const BEAN_MAX = 900;
// 바닥 안전망 (2026-10-28 막힘 수정): 원두가 바닥(3잔분 아래)이고 하우스 블렌드 볶을 돈도 없으면
//   · 응원 선물: 하루 perDay 번, 하우스 블렌드 한 봉지(beans 잔분)를 바로 · 「혼자 해 볼게요」로 거절 가능 (docs/bm-policy.md 6장)
//   · 외상 볶기: 응원을 거절했거나 다 썼으면 하우스 블렌드를 외상으로 볶고 다음 매출에서 저절로 갚음 → 어떤 경우에도 출구가 있음
export const CHEER = { perDay: 3, beans: 18, low: 3 };
export const STORY_WAIT = 25;   /* 단골 사연 손님이 키오스크 맨 앞에서 기다리는 최대 시간(초) → 주문하고 자리에서 이야기를 기다림 (줄을 막지 않게) */

// 가구: kind table = 자리 있음 · size = 칸 [가로, 세로] (한 칸 100) · score = 감성 지수 · seats = 앉는 자리 [x, z, 바라보는 방향]
//   wall = 벽에 거는 것 (벽 자리에만) · heart = 마음(♥)으로 사는 것
export const FURN = {
  table2: { name: '원목 2인 테이블', cat: 'table', size: [2, 1], cost: 70, score: 6, lv: 1, seats: [[-50, 0, Math.PI / 2], [50, 0, -Math.PI / 2]], desc: '둘이 마주 앉는 작은 자리' },
  table4: { name: '긴 원목 테이블', cat: 'table', size: [3, 2], cost: 290, score: 12, lv: 4, seats: [[-80, -50, 0], [80, -50, 0], [-80, 50, Math.PI], [80, 50, Math.PI]], desc: '넷이 둘러앉는 넉넉한 자리' },
  window: { name: '창가 1인석', cat: 'table', size: [1, 1], cost: 110, score: 8, lv: 2, seats: [[0, 10, Math.PI]], desc: '혼자 오래 머무는 자리' },
  sofa: { name: '리넨 소파 세트', cat: 'table', size: [2, 2], cost: 470, score: 18, lv: 7, seats: [[-40, -30, 0], [40, -30, 0]], desc: '깊이 기대는 쉼' },
  floor: { name: '좌식 마루 자리', cat: 'table', size: [2, 2], cost: 610, score: 22, lv: 10, seats: [[-45, 0, Math.PI / 2], [45, 0, -Math.PI / 2]], desc: '신발 벗고 앉는 마루' },
  plant: { name: '올리브 나무 화분', cat: 'green', size: [1, 1], cost: 90, score: 7, lv: 1, desc: '은빛 잎이 바람에 흔들려요' },
  fern: { name: '고사리 화분', cat: 'green', size: [1, 1], cost: 140, score: 9, lv: 3, desc: '그늘을 좋아하는 초록' },
  pine: { name: '분재 소나무', cat: 'green', size: [1, 1], cost: 400, score: 16, lv: 8, desc: '단아한 한 그루' },
  stone: { name: '자연석', cat: 'stone', size: [1, 1], cost: 130, score: 8, lv: 2, desc: '단단함 · 정갈함' },
  stones: { name: '돌 정원', cat: 'stone', size: [2, 2], cost: 540, score: 20, lv: 9, desc: '모래 위 세 개의 돌' },
  lamp: { name: '종이 스탠드 조명', cat: 'light', size: [1, 1], cost: 160, score: 10, lv: 3, desc: '한지처럼 퍼지는 빛' },
  rug: { name: '리넨 러그', cat: 'deco', size: [3, 2], cost: 220, score: 9, lv: 4, flat: true, desc: '발끝이 따뜻해요' },
  shelf: { name: '원두 선반', cat: 'deco', size: [2, 1], cost: 320, score: 13, lv: 5, desc: '오늘의 원두를 진열' },
  goods: { name: '굿즈 진열대', cat: 'deco', size: [1, 1], cost: 430, score: 15, lv: 6, desc: '텀블러 · 문구 세트' },
  wind: { name: '풍경(바람종)', cat: 'deco', size: [1, 1], cost: 0, heart: 80, score: 14, lv: 5, desc: '바람이 지나가면 맑은 소리' },
  poem: { name: '시 한 줄 액자', cat: 'wall', size: [1, 1], cost: 0, score: 20, lv: 1, wall: true, gift: true, desc: '단골이 남긴 한 줄' },
  calli: { name: '서예 액자', cat: 'wall', size: [1, 1], cost: 180, score: 10, lv: 2, wall: true, desc: '「바람과 함께 쉬어가세요」' },
  board: { name: '나무 메뉴판', cat: 'wall', size: [1, 1], cost: 140, score: 8, lv: 1, wall: true, desc: '손글씨 메뉴' },
  photo: { name: '흑백 사진 액자', cat: 'wall', size: [1, 1], cost: 0, heart: 60, score: 12, lv: 4, wall: true, desc: '동네의 오래된 풍경' },
};
export const FURN_CATS = [['table', '자리'], ['green', '초록'], ['stone', '돌'], ['light', '빛'], ['deco', '소품'], ['wall', '벽']];

// 레벨: 필요한 경험치 · 레벨이 오르면 메뉴 · 원두 · 가구 · 머신 · 동료가 열림
export const XP = [0, 30, 110, 240, 440, 850, 1500, 2500, 3980, 6130, 9080, 13230, 18820, 26350, 35900, 48720, 65340, 87140, 114060, 148510];   /* 밸런스 2026-10-27: 원래 표 × 1.6~3.2 */
export const MACHINES = { espresso: [1, 1, 5], oven: [4, 12] };   /* 몇 레벨에 몇 번째 머신이 생기는지 · 2026-10-27 처음부터 2대 */
/* 동료 (2026-10-28 대표 승인 · team/dev/tasks/261028-gamsung-staff): 잡일은 동료가, 정성은 사장이
     · 한 번 고용하면 끝(급여 없음) · 모든 매장 공통 · 고용 = 1단계 → STAFF_UP 로 5단계까지 · 저장은 S.staff[k] = 단계
     · lvx(단계) = 그 단계의 효과 (game.js 가 읽음) · up(단계) = 가게 창에 쓰는 한 줄 */
export const STAFF = {
  barista: { name: '바리스타 동료 · 하린', lv: 3, cost: 700, body: 0xE9E2D6, hair: 0x2A1E16, desc: '자동 머신에서 커피 · 디저트를 내리고 쟁반을 픽업대로 · 정성 머신과 시그니처는 사장님 손으로',
    lvx: l => ({ hand: 4 - (l - 1) * 0.5, tick: 1.2 - (l - 1) * 0.1, wash: Math.max(2, 5 - l) }), up: l => { const x = STAFF.barista.lvx(l); return `한 잔 ${x.hand}초 · 반납 ${x.wash}개면 설거지`; } },
  roaster: { name: '로스터 견습생 · 무진', lv: 5, cost: 1200, body: 0xC9B79C, hair: 0x1E1A16, desc: '원두가 줄면 하우스 · 싱글 오리진을 알아서 볶고 담아요 · 스페셜티 · 밤샘 로스팅은 사장님이 골라요',
    lvx: l => ({ low: 30 + (l - 1) * 15, bonus: (l - 1) * 0.05 }), up: l => { const x = STAFF.roaster.lvx(l); return `원두 ${x.low}잔분 아래면 볶기${x.bonus ? ` · 원두 +${Math.round(x.bonus * 100)}%` : ''}`; } },
  hall: { name: '홀 동료 · 도윤', lv: 6, cost: 2200, body: 0xD9CBB5, hair: 0x5A3A22, desc: '테이블을 닦고 찻값을 모아 와요',
    lvx: l => ({ sp: 280 * (1 + (l - 1) * 0.15), bonus: (l - 1) * 0.05 }), up: l => { const x = STAFF.hall.lvx(l); return x.bonus ? `걸음 +${Math.round((x.sp / 280 - 1) * 100)}% · 찻값 +${Math.round(x.bonus * 100)}%` : '테이블 닦고 찻값 모으기'; } },
};
/* 무진의 손 로스팅(수망): 사장님이 고른 긴 로스팅(스페셜티 · 밤샘)이 로스터를 쓰는 동안 원두가 low 아래로 떨어지면
     작은 망으로 t초에 beans잔분씩 볶아 줌 · 값은 하우스 블렌드 한 봉지(다 볶은 뒤에 냄 → 중간에 나가도 잃는 것 없음) · 원두 0 구간을 없애는 장치 (10-28 봇: 스페셜티 기다리며 8분 원두 0) */
export const HAND_ROAST = { t: 15, beans: 12, low: 6 };
export const STAFF_UP = { max: 5, cost: [0, 600, 1000, 1700, 2900] };   /* cost[l] = l단계 → l+1단계 · 매장 배수 없음(동료는 모든 매장 공통) */
/* 쉬는 동안 번 돈: 동료가 need 명 이상이면 · min 초 넘게 비웠을 때 · 최대 cap 초 · 1분에 perMin × 매장 배수 × (1 + 1단계를 넘는 단계 합 × step)
     · 손으로 하는 장사가 늘 훨씬 낫게 (실제 장사의 몇 분의 1) · 경험치는 없음 · 광고 보면 2배 (원어데이 안에서만 · oad_bm.js) */
export const OFFLINE = { need: 2, min: 120, cap: 7200, perMin: 20, step: 0.1 };

// 매장: 실제 감성커피 매장 (부산에서 시작) · mult = 값 배수
export const STORES = [
  { id: 'yeongdo', name: '영도대교점', city: '부산 영도구', lv: 1, mult: 1, photo: 'hero-storefront-original-restored', desc: '바다 바람이 머무는 첫 가게' },
  { id: 'jangnim', name: '장림장평로점', city: '부산 사하구', lv: 12, mult: 3, photo: 'territory-storefront', desc: '동네 사람들의 사랑방' },
  { id: 'gangjeong', name: '서귀포강정점', city: '제주 서귀포시', lv: 18, mult: 8, photo: 'interior-bar', desc: '돌담 너머 귤밭 바람' },
];

// 손님 기분: 주문하고 받기까지(초) · 빨리 받으면 마음(♥) + 팁 · 오래 걸려도 벌 없음
export const MOOD = { happy: 20, ok: 50, tip: 0.2 };
export const COUPON = { goal: 60, text: '아메리카노 사이즈업 · 시험용', valid: '시험 기간에는 매장에서 쓸 수 없어요' };

// 오늘의 주문서: 하루 3장 (메뉴 · 잔 수 · 보상)
export const ORDER_POOL = [
  { who: '동네 꽃집', menu: 'americano', n: 6 }, { who: '영도 조선소 사무실', menu: 'latte', n: 8 }, { who: '독서 모임', menu: 'mygamsung', n: 6 },
  { who: '요가 수업', menu: 'dawn', n: 5 }, { who: '사진 동호회', menu: 'jeju', n: 4 }, { who: '생일 파티', menu: 'croffle', n: 8 },
  { who: '부산대 스터디', menu: 'coldbrew', n: 6 }, { who: '오후의 다도회', menu: 'tea', n: 3 }, { who: '디저트 동호회', menu: 'basque', n: 4 },
  { who: '소개팅 두 사람', menu: 'berry', n: 2 }, { who: '마카롱 선물 주문', menu: 'macaron', n: 8 }, { who: '어린이집 선생님들', menu: 'vanilla', n: 6 },
];

// 단골 사연: 매일 한 번 찾아와 이야기를 들려줌 · 고르는 것에 따라 호감 (best = 그 사람이 가장 반가워하는 것)
//   5화를 다 들으면 그 사람만을 위한 「시 한 줄」 액자 (poem)
export const REGULARS = [
  { id: 'seoyun', name: '서윤', who: '매일 오후 3시, 창가 자리', body: 0xD9D2C8, hair: 0x2A1E16, bun: true, lv: 2, poem: '수고했어요/오늘도',
    eps: [
      { say: '오늘 면접 보고 왔어요. 붙을지는 모르겠지만… 여기 오면 이상하게 마음이 놓여요.', ask: '서윤은 지친 얼굴로 창밖을 본다. 무엇을 내어 줄까?', ch: [['따뜻한 카페라떼 한 잔', 'latte', 2], ['말없이 쿠키 하나 곁들이기', null, 3], ['힘내라고 크게 응원하기', null, 1]] },
      { say: '면접… 떨어졌어요. 괜찮은 척하는 것도 지치네요.', ask: '오늘의 서윤에게 필요한 건?', ch: [['그냥 옆자리 창문을 조금 열어 주기', null, 3], ['다음엔 붙을 거라고 말하기', null, 1], ['달콤한 바닐라 라떼', 'vanilla', 2]] },
      { say: '작은 출판사에서 연락이 왔어요. 제가 쓴 글을 보고 싶대요.', ask: '서윤의 눈이 반짝인다.', ch: [['마이감성 라떼로 축하하기', 'mygamsung', 3], ['어떤 글인지 물어보기', null, 2], ['조용히 미소 짓기', null, 1]] },
      { say: '첫 출근 했어요! 근데 여기 오던 시간이 그리울 것 같아요.', ask: '서윤에게 건넬 한마디', ch: [['「주말엔 여기 있을게요」', null, 3], ['「바쁘면 못 오겠네요」', null, 1], ['새벽숲 라떼 테이크아웃', 'dawn', 2]] },
      { say: '오늘은 손님으로 온 게 아니라… 고마워서 왔어요. 이 자리가 저를 버티게 해 줬어요.', ask: '서윤이 작은 쪽지를 내민다.', ch: [['쪽지를 벽에 걸어 두기', null, 3], ['고맙다고 꼭 안아 주기', null, 2], ['오늘 커피는 서비스!', 'americano', 2]] },
    ] },
  { id: 'harabeoji', name: '정 할아버지', who: '영도 토박이 · 오전 단골', body: 0x8A9AAA, hair: 0xD8D8D8, lv: 3, poem: '바다는/늘 그 자리',
    eps: [
      { say: '젊은 사람들 커피는 쓰기만 하더구먼. 여긴 어떤가 보러 왔지.', ask: '할아버지는 메뉴판을 한참 본다.', ch: [['부드러운 카페라떼 추천', 'latte', 3], ['제일 진한 콜드브루', 'coldbrew', 1], ['메뉴 하나하나 설명해 드리기', null, 2]] },
      { say: '이 다리(영도대교) 들어 올리던 거 기억하는 사람, 이제 몇 없어.', ask: '할아버지가 옛 이야기를 꺼낸다.', ch: [['끝까지 이야기 들어 드리기', null, 3], ['사진 찾아 보여 드리기', null, 2], ['바쁘다며 자리 뜨기', null, 0]] },
      { say: '할멈이 살아 있을 땐 둘이 여기 앉았을 텐데.', ask: '할아버지 앞자리가 비어 있다.', ch: [['맞은편에 따뜻한 차 한 잔 놓아 드리기', 'tea', 3], ['위로의 말 건네기', null, 2], ['못 들은 척하기', null, 0]] },
      { say: '손녀가 결혼한대. 근데 무슨 선물을 해야 할지 모르겠어.', ask: '할아버지가 고민한다.', ch: [['우리 가게 원두 선물 세트 추천', null, 3], ['돈 봉투가 최고라고 말하기', null, 1], ['손편지를 권하기', null, 2]] },
      { say: '결혼식에서 그 원두로 커피를 내렸더니 다들 맛있다더라. 고맙네, 사장.', ask: '할아버지가 처음으로 활짝 웃는다.', ch: [['「언제든 오세요」', null, 3], ['그날 사진 보여 달라고 하기', null, 2], ['아메리카노 서비스', 'americano', 2]] },
    ] },
  { id: 'jiho', name: '지호', who: '해양대 학생 · 밤샘 과제', body: 0x5A6A8A, hair: 0x1A1A1A, lv: 5, poem: '파도처럼/다시',
    eps: [
      { say: '과제 마감이 내일인데 아직 반도 못 했어요… 제일 센 거 주세요.', ask: '지호의 눈 밑이 까맣다.', ch: [['콜드브루 더블', 'coldbrew', 2], ['물 한 잔 먼저 건네기', null, 3], ['그냥 자라고 말하기', null, 1]] },
      { say: '교수님이 제 아이디어 괜찮대요! 근데 팀원들이 안 도와줘요.', ask: '지호가 한숨을 쉰다.', ch: [['팀원들도 사정이 있을 거라 말하기', null, 2], ['크로플 하나 서비스', 'croffle', 3], ['같이 화내 주기', null, 1]] },
      { say: '배 타는 실습 나가요. 한 달 동안 커피 못 마시겠죠?', ask: '떠나는 지호에게', ch: [['드립백 몇 개 챙겨 주기', null, 3], ['돌아오면 첫 잔은 공짜', null, 2], ['바다 조심하라고 하기', null, 1]] },
      { say: '바다 위에서 드립백 내려 마셨어요. 다들 어디 커피냐고 물어봤어요!', ask: '까맣게 탄 지호가 웃는다.', ch: [['제주 블루솔트 라떼로 환영', 'jeju', 3], ['실습 이야기 들려 달라기', null, 2], ['「살 많이 탔네」', null, 1]] },
      { say: '졸업하면 큰 배 타요. 바다 한가운데서도 여기 생각날 거예요.', ask: '지호의 마지막 학기', ch: [['가게 스티커를 짐가방에 붙여 주기', null, 3], ['편지하라고 하기', null, 2], ['아메리카노 서비스', 'americano', 2]] },
    ] },
  { id: 'mina', name: '미나', who: '꽃집 사장 · 앞집 이웃', body: 0xE8B8A8, hair: 0x6A3A1A, lv: 7, poem: '피고 지고/또 피고',
    eps: [
      { say: '앞집 꽃집이에요. 아침마다 커피 냄새가 넘어와서 결국 왔어요.', ask: '미나가 작은 꽃 한 송이를 내민다.', ch: [['꽃을 테이블에 꽂기', null, 3], ['바닐라 라떼로 답례', 'vanilla', 2], ['그냥 받아 두기', null, 1]] },
      { say: '요즘 손님이 너무 없어요. 꽃이 다 시들어 가요.', ask: '미나의 가게가 걱정된다.', ch: [['우리 가게에 꽃을 들이기', null, 3], ['힘내라고 말하기', null, 1], ['와일드베리 라떼 한 잔', 'berry', 2]] },
      { say: '사장님 덕분에 손님들이 꽃 사러 와요! 같이 이벤트 해 볼래요?', ask: '꽃과 커피 이벤트', ch: [['「커피 한 잔에 꽃 한 송이」 하자고 하기', null, 3], ['생각해 보겠다고 하기', null, 1], ['마카롱도 곁들이자고 하기', 'macaron', 2]] },
      { say: '엄마가 아프세요. 가게를 잠깐 닫아야 할 것 같아요.', ask: '미나가 고개를 숙인다.', ch: [['꽃집 화분에 물 대신 주겠다고 하기', null, 3], ['빨리 나으시길 바란다고 하기', null, 2], ['따뜻한 차 포장해 주기', 'tea', 2]] },
      { say: '엄마 퇴원하셨어요. 화분들 다 살아 있더라고요. 이웃이라 다행이에요.', ask: '미나가 화분 하나를 선물한다.', ch: [['가게 창가에 두기', null, 3], ['답례로 원두 선물', null, 2], ['마이감성 라떼로 축하', 'mygamsung', 2]] },
    ] },
  { id: 'taeo', name: '태오 아빠', who: '주말마다 딸과 함께', body: 0x9DBF9A, hair: 0x3A2A1A, lv: 9, poem: '너의 키만큼/자란 오후',
    eps: [
      { say: '딸이 여기 크로플 먹으러 가자고 졸라서요.', ask: '아이가 쇼케이스에 코를 박고 있다.', ch: [['크로플 하나 더 얹어 주기', 'croffle', 3], ['아이에게 메뉴 고르게 하기', null, 2], ['조용히 하라고 하기', null, 0]] },
      { say: '아내랑 사이가 좀… 주말에 애랑 둘이 나오는 게 편해서요.', ask: '태오 아빠가 쓸쓸하게 웃는다.', ch: [['다음엔 셋이 오시라고 하기', null, 3], ['괜찮냐고 묻기', null, 2], ['바닐라 라떼 두 잔', 'vanilla', 2]] },
      { say: '오늘은 셋이 왔어요. 아내가 여기 분위기 좋대요.', ask: '가족이 창가 자리에 앉는다.', ch: [['바스크 치즈케이크로 환영', 'basque', 3], ['가족사진 찍어 드리기', null, 3], ['평소처럼 주문받기', null, 1]] },
      { say: '딸이 그림을 그렸어요. 사장님 가게래요.', ask: '삐뚤빼뚤한 그림 속 가게', ch: [['그림을 벽에 붙이기', null, 3], ['칭찬해 주기', null, 2], ['마카롱 선물', 'macaron', 2]] },
      { say: '딸이 초등학교 들어가요. 첫 등교 전 아침을 여기서 먹고 싶대요.', ask: '특별한 아침', ch: [['가게를 일찍 열어 주기', null, 3], ['크로플에 초 꽂아 주기', 'croffle', 3], ['축하한다고 하기', null, 1]] },
    ] },
  { id: 'soyeon', name: '소연', who: '은퇴한 국어 선생님', body: 0xB8A0C8, hair: 0x9A9A9A, lv: 11, poem: '여백이/말을 한다',
    eps: [
      { say: '이 가게 벽의 글씨, 누가 썼나요? 획이 참 단정하네요.', ask: '소연이 서예 액자를 바라본다.', ch: [['직접 써 보시라고 권하기', null, 3], ['본사 디자인이라고 하기', null, 1], ['애프터눈티 라떼 권하기', 'tea', 2]] },
      { say: '40년을 가르쳤는데, 이제 들어 줄 학생이 없네요.', ask: '소연의 목소리가 작아진다.', ch: [['가게에서 글쓰기 모임을 열자고 하기', null, 3], ['좋은 선생님이셨을 거라 하기', null, 2], ['아메리카노 서비스', 'americano', 1]] },
      { say: '모임에 여섯 명이 왔어요! 다들 자기 이야기를 써 왔더군요.', ask: '소연이 원고 뭉치를 안고 있다.', ch: [['모임에 마카롱 서비스', 'macaron', 3], ['한 편 읽어 달라고 하기', null, 3], ['다음 모임 날짜 정하기', null, 2]] },
      { say: '모임 사람들이 문집을 내자고 해요. 제목을 못 정하겠어요.', ask: '문집 제목', ch: [['「마음이 쉬어가는 곳」', null, 3], ['「동네 이야기」', null, 2], ['「커피 한 잔」', null, 1]] },
      { say: '문집이 나왔어요. 첫 장에 이 가게 이야기를 썼어요.', ask: '소연이 책 한 권을 건넨다.', ch: [['계산대 옆에 두고 손님에게 보여 주기', null, 3], ['사인을 받아 두기', null, 2], ['제주 블루솔트 라떼로 축하', 'jeju', 2]] },
    ] },
];
export const FAVOR_MAX = 15;   /* 5화 × 최고 3 */

// 정성 한 잔 (손 추출): 꾹 누르는 동안 잔이 차오름 · 금빛 구간에서 떼면 정성 한 잔 · 빗나가도 그냥 맛있는 한 잔 (벌 없음)
//   fill = 가득 차는 시간(초) · zone = 금빛 구간 너비 · tip = 정성 한 잔 팁 (잔 값 대비) · combo = 연속마다 팁 +
export const PULL = { fill: 1.7, zone: 0.17, zoneMin: 0.58, zoneMax: 0.8, tip: 0.3, combo: 0.15, comboMax: 6, auto: 0.6 };
// 라떼아트 (시그니처 마무리): 한 번 쓱 · 대충 그어도 넉넉히 · 못 그려도 하트로 마무리
export const ART = {
  heart: { name: '하트', say: '하트 완성! 손님 마음 +1' },
  leaf: { name: '나뭇잎', say: '나뭇잎 완성! 손님 마음 +1' },
  gam: { name: '감', say: '감 완성! 가을 한 알 · 손님 마음 +1' },
};
// 오늘의 시: 손님 마음이 맑아질 때마다 한 글자 · 다 차면 벽 액자 (단골 시와는 따로)
export const POEM_PER = 3;   /* 한 글자 = 마음 3 (맑음 1 · 햇살 2) */
export const POEMS = ['바람이 잠시 머무는 곳', '오늘도 수고한 당신에게', '한 잔에 담은 한결같은 마음', '창가에 내려앉은 오후', '파도 소리 같은 쉼표 하나', '천천히 식어 가는 온기', '돌담 너머 귤빛 바람', '느리게 걸어도 괜찮아요', '따뜻한 손끝의 정성', '다리 위로 노을이 지면',
  '비 오는 날의 작은 등불', '말없이 건네는 위로', '여백에 머무는 향기', '오래된 의자의 기억', '새벽 숲을 닮은 한 모금', '그대 웃음이 피는 자리', '돌아오는 길의 쉼터', '마음에도 볕이 들어요', '한결같이 그 자리에', '바다를 건너온 이야기'];
// 손편지: 손님이 가끔 테이블에 남기는 한 줄
export const LETTERS = ['오늘 커피 덕분에 하루가 따뜻했어요', '창가 자리, 또 앉으러 올게요', '사장님 손길이 느껴지는 맛이었어요', '조용해서 좋았어요. 고마워요', '라떼 위 그림, 사진 찍어 갔어요', '지친 오후에 쉼표 하나 받아 가요', '바다 냄새랑 커피 냄새, 최고예요', '다음엔 친구랑 같이 올게요', '천천히 마셔도 된다는 게 좋았어요', '덕분에 마음이 맑아졌어요'];
