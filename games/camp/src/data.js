// 숲속 힐링 캠프 (가제) — 데이터 · 곡선 (2026-10-29 · 개발 · 클린룸)
// 근거: team/dev/tasks/261028-catsoup-spec/spec.md + evidence/*.csv (분석팀 명세서 — 곡선 '모양 · 범위'만 따름, 수치는 우리 것)
// 브라우저 없이도 읽힘 (sim.js · tools/bot.mjs 가 같이 씀)

export const GAME = { id: 'camp', save: 'camp_v1', version: '0.1.0' };

/* ── 판 좌표: 배경 그림(864×1536) → 판(720×1560) ── */
export const BG_S = 1560 / 1536, BG_X = (864 * BG_S - 720) / 2;   /* 배경은 판 높이에 꽉 차게 · 좌우를 조금 잘라 냄 */
export const P = (x, y) => [Math.round(x * BG_S - BG_X), Math.round(y * BG_S)];

/* ── 구역 (실제 캠핑장 구성을 따른 해금 순서) ──
   명세서 4-4 마당 확장: 9단계 · 조건 = 누적으로 지은 시설 수(7 → ~200, 간격이 점점 커짐) · 보상 유료 재화 100 → 450(+50)
   우리: 5구역 · 조건 = 레벨 + 누적 지은/강화 단계 수(간격이 커짐) · 보상 솔방울 100 → 300(+50) · 공사 시간 있음(즉시 완성 자리) */
export const ZONES = [
  { id: 'lawn', name: '잔디 광장 · 웰컴센터', need: { lv: 1, built: 0 }, reward: 0, build: 0 },
  { id: 'forest', name: '숲속 존', need: { lv: 3, built: 3 }, reward: 100, build: 120 },
  { id: 'pine', name: '애견 동반 존 · 조용한 솔숲', need: { lv: 6, built: 6 }, reward: 150, build: 300 },
  { id: 'valley', name: '계곡 · 놀이터와 폭포', need: { lv: 10, built: 10 }, reward: 200, build: 900 },
  { id: "stay", name: "스테이 · 루프탑", need: { lv: 15, built: 12 }, reward: 300, build: 1800 },
];
/* 잠긴 구역을 가리는 안개 영역 (판 좌표 · 위쪽 y 부터) */
const FOG = (a, b, c, d) => [...P(a, b), ...P(c, d)];
export const ZONE_FOG = { forest: FOG(40, 380, 455, 705), pine: FOG(505, 450, 864, 775), valley: FOG(430, 40, 864, 440), stay: FOG(0, 40, 430, 330) };

/* ── 고정 건물 ── */
export const WELCOME = { pos: P(340, 820), door: P(300, 905), deck: P(210, 900) };   /* 웰컴센터: 체크인 · 매점 · 꾸미기 */
export const KITCHEN = { pos: P(640, 860), oven: P(700, 880), stand: P(640, 930), pick: P(560, 945) };   /* 공용 키친 (빵 오븐) */
export const ENTRY = [P(445, 1180), P(445, 1600)];   /* 오솔길 입구 → 화면 아래 */
export const CAT_SPOT = P(195, 905);                 /* 캠핑장 고양이가 볕을 쬐는 웰컴센터 데크 */

/* ── 시설 ──
   명세서 2장 생산 축 3개: 조리(라인 3 · 15/17/19초) · 재료 손질(레시피 해금 · 판매가↑) · 휴식(60초마다 연구 포인트) + 특수(하루 횟수 · 충전)
   우리: 조리 = 빵 오븐(공용 키친) · 무쇠 솥 · 음료 바 / 손질 = 공용 키친 설비 4 (냉장고 · 개수대 · 토스터 · 전자레인지) / 휴식 = 텐트 · 불멍 화로 · 해먹 · 발 씻는 곳 · 샤워장 · 세탁실 / 자리 = 피크닉 식탁 · 바비큐 데크 / 특수 = 계곡 놀이터(2시간 충전 선물) */
export const LINES = [
  { id: 'bread', name: '빵', st: 'oven', cycle: 17 },
  { id: 'soup', name: '수프', st: 'pot', cycle: 15 },
  { id: 'drink', name: '음료', st: 'drink', cycle: 19 },
];
export const FAC = {
  oven: { name: '빵 오븐', kind: 'cook', line: 'bread', img: null, fixed: true, desc: '공용 키친의 빵 오븐 · 베이글을 구워요' },
  pot: { name: '무쇠 솥', kind: 'cook', line: 'soup', img: 'fac/pot', desc: '따끈한 수프를 끓여요' },
  drink: { name: '음료 바', kind: 'cook', line: 'drink', img: 'fac/drink', desc: '코코아와 레모네이드를 만들어요' },
  table: { name: '피크닉 식탁', kind: 'seat', seats: 4, img: 'fac/table', desc: '손님이 앉아서 먹어요 · 자리 4' },
  bbq: { name: '바비큐 데크', kind: 'seat', seats: 4, vip: 3, img: 'fac/bbq', desc: '스테이 손님 자리 · 값 3배' },
  tent: { name: '캠핑 텐트', kind: 'rest', rp: 1, img: 'fac/tent', desc: '직원이 쉬면 쉼 포인트가 모여요' },
  firepit: { name: '불멍 화로', kind: 'rest', rp: 1.3, seats: 2, img: 'fac/firepit', desc: '불멍 · 쉼 포인트 · 자리 2' },
  hammock: { name: '해먹 쉼터', kind: 'rest', rp: 1.6, img: 'fac/hammock', desc: '조용한 솔숲의 해먹 · 커플 손님이 좋아해요' },
  footwash: { name: '발 씻는 곳', kind: 'rest', rp: 2.2, img: 'fac/footwash', desc: '계곡에서 놀고 온 손님이 쉬어요' },
  playpool: { name: '계곡 놀이터', kind: 'special', charge: 7200, img: 'fac/playpool', desc: '2시간마다 물놀이 선물이 차요' },
};
/* 자리(패드)마다 지을 수 있는 시설 — 명세서 2장 '손질과 휴식을 번갈아 · 사이사이 특수' 순서를 자리 배치로 */
export const PADS = [
  { id: 'L1', zone: 'lawn', pos: P(140, 1255), fac: 'pot' },
  { id: 'L2', zone: 'lawn', pos: P(445, 1325), fac: 'table' },
  { id: 'L3', zone: 'lawn', pos: P(740, 1272), fac: 'drink' },
  { id: 'F1', zone: 'forest', pos: P(155, 543), fac: 'tent' },
  { id: 'F2', zone: 'forest', pos: P(325, 512), fac: 'table' },
  { id: 'F3', zone: 'forest', pos: P(245, 636), fac: 'firepit' },
  { id: 'D1', zone: 'pine', pos: P(720, 715), fac: 'table', dog: true },
  { id: 'N1', zone: 'pine', pos: P(740, 578), fac: 'hammock' },
  { id: 'V1', zone: 'valley', pos: P(650, 335), fac: 'playpool' },
  { id: 'V2', zone: 'valley', pos: P(530, 420), fac: 'footwash' },
  { id: 'S1', zone: 'stay', pos: P(250, 250), fac: 'bbq' },
];
/* 공용 키친 설비 = 재료 손질 (명세서: 레시피마다 대응하는 손질 시설이 있어야 열림) · 웰컴센터 설비 = 휴식 · 방치 상한 */
export const AMEN = {
  fridge: { name: '공용 냉장고', at: 'kitchen', unlock: 2, desc: '바구니 칸마다 재료 · 2단계 메뉴가 열려요' },
  sink: { name: '넓은 개수대', at: 'kitchen', unlock: 3, desc: '깨끗하게 · 3단계 메뉴가 열려요' },
  toaster: { name: '토스터', at: 'kitchen', unlock: 4, desc: '바삭하게 · 4단계 메뉴가 열려요' },
  micro: { name: '전자레인지', at: 'kitchen', unlock: 5, desc: '따끈하게 · 5 · 6단계 메뉴가 열려요' },
  shower: { name: '따뜻한 샤워장', at: 'welcome', rest: 1.5, desc: '쉼 포인트 +, 쉬는 동안 모이는 시간 +1시간' },
  laundry: { name: '세탁실', at: 'welcome', rest: 1.5, desc: '쉼 포인트 +, 쉬는 동안 모이는 시간 +1시간' },
};
/* 짓는 순서 = 비용 자릿수 증가 Δ (명세서 4-1: 처음 12개 +0~2 → Δ가 1 · 2 · 3씩 커지는 2차 가속 → 고정 폭)
   v0.1 은 시설 11 + 설비 6 = 17번째까지: 처음 6개 Δ 0~1 → 이후 Δ 1 고정 (v0.1 길이에 맞춰 2차 가속 구간은 줄임 · 계수 1~6) */
const DIG = [1, 2, 2, 3, 3, 4, 5, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const COEF = [1, 2, 6, 1, 4, 1, 1, 5, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1];
export const buildCost = k => COEF[Math.min(k, 17)] * 10 ** DIG[Math.min(k, 17)] * 5;   /* k = 지금까지 지은 시설 · 설비 수 */
/* 강화: 레벨당 비용 ×1.16 (명세서는 코드 상수라 미확정 · 질문 1 — 우리 가정) · 효과 ×1.11 · 10/20/30 마다 '단계' (공사 시간 · 그림이 바뀜) */
export const UP = { max: 40, costK: 1.16, effK: 1.11, tiers: [10, 20, 30], tierBuild: [60, 240, 900] };
export const upCost = (base, lv) => Math.ceil(base * 0.3 * UP.costK ** lv);
export const tierOf = lv => UP.tiers.filter(t => lv >= t).length;

/* ── 메뉴 (명세서 4-2: 라인 3 × 65단계 · 판매가 선형 = 시작값 + 10 × 단계 · 연구 비용 자릿수 d(n) = 1 + n(n−1)/2 삼각수)
   우리: 라인 3 × 6단계(음료 5) = 17종 · 판매가 선형 · 메뉴 강화 비용(쉼 포인트) 자릿수 = 1 + n(n−1)/2 의 1/4 (v0.1 범위) */
export const MENU = [
  ['bread', 1, '크림치즈 베이글', 'bagel'], ['bread', 2, '블루베리 베이글', 'blueberry'], ['bread', 3, '숲속 샌드위치', 'sandwich'], ['bread', 4, '시나몬 롤', 'cinnamon'], ['bread', 5, '딸기잼 스콘', 'scone'], ['bread', 6, '시골빵 한 덩이', 'loaf'],
  ['soup', 1, '채소 크림 스튜', 'stew'], ['soup', 2, '버섯 수프', 'mushroom'], ['soup', 3, '옥수수 수프', 'corn'], ['soup', 4, '단호박 수프', 'pumpkin'], ['soup', 5, '토마토 콩 스튜', 'bean'], ['soup', 6, '숲속 나물 전골', 'hotpot'],
  ['drink', 1, '마시멜로 코코아', 'cocoa'], ['drink', 2, '레모네이드', 'lemonade'], ['drink', 3, '딸기 우유', 'strawmilk'], ['drink', 4, '허브차', 'herbtea'], ['drink', 5, '아이스 커피', 'icedcoffee'],
].map(([line, step, name, img]) => ({ id: img, line, step, name, img: 'food/' + img, start: { bread: 10, soup: 14, drink: 8 }[line] }));
export const price0 = m => (m.start + 10 * m.step) * 10 ** (m.step - 1) * 0.6;   /* 판매가: 단계 안에서 선형 + 단계마다 자릿수 (v0.1 이 12시간 안에 끝나도록) */
export const MENU_MAX = 10;
export const menuMult = lv => 1.22 ** Math.max(0, lv - 1);
export const menuCost = (m, lv) => Math.ceil((2 + m.step) * 10 ** (1 + Math.floor((lv * (lv - 1) / 2) / 9)) * (1 + 0.25 * lv));   /* 쉼 포인트 · 자릿수 = 삼각수 n(n−1)/2 의 1/9 */
export const restRate = (fac, lv) => 5 * 1.25 ** (lv - 1) * fac.rp;   /* 1분마다 쉼 포인트 (명세서 휴식 60초 주기) */

/* ── 치명 요리 (명세서 4-6): 판매가 3배 · 기본 확률 + 상품/패스 +5~10%p · 광고 10분 30% ── */
export const CRIT = { base: 0.05, mult: 3, adP: 0.30, adSec: 600 };

/* ── 직원 (명세서 5장 · 4-3 호감도) ── 외형 · 메인 스킬 1 · 보조 0~1 · 호감도 1~10 (경험치 1·2·5×10^k)
   우리: 확정 고용(뽑기 X) 4명 · 스킬 = 특정 라인 판매가 +% · 호감도는 간식으로 · 최대 레벨 보너스 = 판매가 +200% · 치명 +30%p (명세서 최대치와 같은 꼴) */
export const STAFF = [
  { id: 'haru', name: '하루', role: 'serve', look: 'helper', cost: 0, skill: { line: 'bread', k: 0.1 }, line: '오늘도 반짝이는 캠프로!' },
  { id: 'sol', name: '솔', role: 'cook', look: 'cook1', cost: 300, skill: { line: 'soup', k: 0.15 }, line: '수프는 천천히 끓여야 맛있어요.' },
  { id: 'bada', name: '바다', role: 'cook', look: 'cook2', cost: 4e3, skill: { line: 'drink', k: 0.15 }, line: '오늘의 음료는 뭐로 할까요?' },
  { id: 'byeol', name: '별', role: 'serve', look: 'helper2', cost: 8e5, skill: { line: 'all', k: 0.05 }, line: '손님 자리까지 쏜살같이!' },
];
export const FAV_EXP = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];             /* 다음 레벨까지 (명세서 1·2·5×10^k · 10 → 5000) */
export const FAV_BONUS = [0, 0.1, 0.3, 0.6, 1.0, 1.6, 2.5, 4.0, 6.0, 10.0];       /* 판매가 +배 (명세서 재료 계열 10·30·60·100·160·250·400·600·1000%) */
export const FAV_CRIT = [0, 0, 0.02, 0.04, 0.06, 0.09, 0.12, 0.16, 0.2, 0.3];     /* 치명 +%p (최대 +30%p) */
export const TREATS = { small: { name: '캠핑 쿠키', exp: 5 }, big: { name: '특별 도시락', exp: 50 } };   /* 명세서: 대부분 1~10 · 희귀 20~100 */

/* ── 손님 · 단골 이야기 ── */
export const GUESTS = ['hiker', 'grandma', 'kid', 'couple', 'family'];
export const SPAWN = { base: 11, min: 3.5 };   /* 초 · 자리 · 매력이 늘수록 빨리 옴 */
export const REGULARS = [
  { id: 'yunseul', name: '윤슬', who: '혼자 캠핑 오는 숲 사진가', look: 'hiker', needLv: 2, likes: 'herbtea',
    story: ['아침 안개가 걷히는 순간을 찍으러 왔어요. 여기 커피 향이 좋네요.', '어제 찍은 폭포 사진, 보여 드릴까요? 물소리까지 담긴 것 같죠.', '사실 회사를 그만두고 사진을 시작했어요. 무서웠는데… 여기 오면 괜찮아져요.', '다음 달에 작은 사진전을 해요. 첫 장은 이 캠프 아침으로 정했어요.', '사진전 첫날, 이 캠프 사진 앞에서 제일 오래 머문 사람이 있었대요. 고마워요, 셰프님.'] },
  { id: 'bomi', name: '봄이 할머니', who: '손녀와 오는 단골 할머니', look: 'grandma', needLv: 4, likes: 'stew',
    story: ['손녀가 여기 수프를 또 먹고 싶다고 졸라서 왔지 뭐유.', '우리 영감이랑 처음 캠핑 간 게 이런 숲이었어. 별이 참 많았지.', '요즘 무릎이 시원찮아서… 그래도 여기는 길이 편해서 좋아.', '손녀가 셰프님처럼 요리사가 되고 싶대. 앞치마를 사 달라네.', '이 수프 맛, 우리 영감이 끓여 주던 맛이랑 똑같아. 고마워요.'] },
  { id: 'dodam', name: '도담', who: '비숑 몽실이와 오는 청년', look: 'kid', needLv: 7, likes: 'bagel', dog: true,
    story: ['몽실이가 애견 존을 제일 좋아해요. 냄새부터 다르대요.', '몽실이가 고양이 노을이를 쫓아가다가 혼났어요. 노을이가 더 셌어요.', '몽실이가 나이가 꽤 들었어요. 그래서 좋은 데를 많이 데려가려고요.', '몽실이 생일이라 케이크 대신 베이글에 초를 꽂았어요. 좋아하더라고요.', '몽실이가 여기만 오면 꼬리를 제일 세게 흔들어요. 우리 둘 다 여기가 좋아요.'] },
];
export const FAVOR_MAX = 5;

/* ── 재화 (명세서 3장) · 보상 = 현재 수입 × N초 ── */
export const CUR = { coin: '숲 코인', gem: '솔방울', rp: '쉼 포인트', treat: '간식', stamp: '스탬프' };
/* 방치 (명세서 6장: 떠나 있던 시간만큼 · 상한 시간 · 광고 2배 · 기본값 미확정 — 질문 2) 우리: 기본 2시간 + 샤워장/세탁실 1시간씩 · 효율 70% */
export const OFFLINE = { capH: 2, eff: 0.7, min: 60 };

/* ── 레벨 1~20 ── 경험치: 손님 1명 +1 · 짓기 +10 · 강화 +2 · 메뉴 강화 +4 · 미션 +6 · 단골 이야기 +10 */
export const LV_MAX = 20;
export const lvNeed = lv => Math.round(40 * 1.25 ** (lv - 1));

/* ── 미션 · 출석 · 플레이 시간 (명세서 7장 · retention_numbers.csv) ──
   오늘의 할 일 약 10개(1~50회 · 보상 = 티켓 또는 수입 20~40분치) + 전부 하면 보너스 / 반복 퀘스트 단계형 / 플레이 시간 5·10·20·40·60분 (우리는 하루 5~15분 → 5·10·15) / 28일 출석 */
export const DAILY = [
  { id: 'serve', name: '손님 {n}명 대접하기', n: 25, r: { min: 20 } },
  { id: 'upgrade', name: '시설 {n}번 강화하기', n: 5, r: { min: 20 } },
  { id: 'gift', name: '손님 선물 {n}개 받기', n: 3, r: { gem: 20 } },
  { id: 'treat', name: '직원에게 간식 {n}번 주기', n: 2, r: { min: 30 } },
  { id: 'crit', name: '대박 요리 {n}번 만들기', n: 3, r: { gem: 15 } },
  { id: 'cat', name: '고양이 노을이 쓰다듬기', n: 1, r: { treat: 2 } },
  { id: 'menu', name: '메뉴 {n}번 맛 올리기', n: 1, r: { min: 40 } },
  { id: 'box', name: '숲 선물 상자 열기', n: 1, r: { gem: 10 } },
];
export const DAILY_BONUS = { gem: 50, treat: 3 };
export const REPEAT = [
  { id: 'rserve', name: '손님 대접', key: 'served', steps: [10, 30, 60, 100, 200, 400, 800, 1500, 3000, 6000], r: s => ({ gem: 10 + 5 * s }) },
  { id: 'rup', name: '시설 강화', key: 'ups', steps: [5, 15, 30, 60, 100, 160, 250, 400, 600, 900], r: s => ({ gem: 10 + 5 * s }) },
  { id: 'rcrit', name: '대박 요리', key: 'crits', steps: [3, 10, 25, 50, 100, 200, 400, 800], r: s => ({ treat: 1 + s }) },
];
export const PLAYTIME = [[5, { gem: 10 }], [10, { gem: 15 }], [15, { gem: 25, treat: 1 }]];
export const ATTEND = Array.from({ length: 28 }, (_, i) => (i % 7 === 6 ? { gem: 80 } : i % 7 === 3 ? { treat: 3 } : i % 2 ? { gem: 20 } : { min: 60 }));

/* ── 손님 선물 (명세서: 골드 38 · 연구 32 · 가구 코인 11 · 유료 8 · 특수 먹이 6 · 변경 티켓 2 · 한정 2 %) — 확률 공개 ── */
export const GIFT = [['coin', 40, '숲 코인 (수입 10분치)'], ['rp', 32, '쉼 포인트'], ['treat', 15, '간식'], ['gem', 9, '솔방울 5개'], ['stamp', 2, '스탬프 1'], ['rare', 2, '특별 장식 조각']];
export const GIFT_P = { every: 45, chance: 0.18, max: 6 };   /* 손님이 떠날 때 18% · 바닥에 최대 6개 */
/* 하루 첫 접속 무작위 보상 (명세서: 먹이 41 · 골드 17 · 연구 17 · 가구 8 · 유료 7 · 채집 7 · 특수 먹이 4 %) */
export const LOGIN_BOX = [['treat', 41, '간식 2'], ['coin', 17, '수입 1시간치'], ['rp', 17, '쉼 포인트'], ['stamp', 8, '스탬프 2'], ['gem', 7, '솔방울 20'], ['big', 10, '특별 도시락 1']];

/* ── 숲 선물 상자 = 뽑기 (명세서 9-3: 장비 상자 1회 = 유료 재화 300 또는 광고 1회 · 확률 공개 · 천장 없음)
   대표 방침: 게임 재화(솔방울)로만 · 확률 공개 · 천장 30회 · 중복 = 솔방울 돌려받기 */
export const BOX = { cost: 300, pity: 30, dupGem: { n: 40, r: 120, s: 300 } };
export const RARITY = { n: { name: '보통', p: 0.70 }, r: { name: '희귀', p: 0.25 }, s: { name: '특별', p: 0.05 } };
export const DECO = [
  { id: 'tulip', name: '튤립 화단', rar: 'n', img: 'deco/tulip', appeal: 2, pos: P(70, 1110) },
  { id: 'bench', name: '쿠션 벤치', rar: 'n', img: 'deco/bench', appeal: 2, pos: P(260, 1150) },
  { id: 'cushion', name: '줄무늬 방석', rar: 'n', img: 'deco/cushion', appeal: 1, pos: P(560, 1150) },
  { id: 'bookbox', name: '책 나눔 상자', rar: 'n', img: 'deco/bookbox', appeal: 2, pos: P(820, 1150) },
  { id: 'lanterns', name: '종이 등불 줄', rar: 'r', img: 'deco/lanterns', appeal: 5, pos: P(445, 1060) },
  { id: 'swing', name: '나무 그네', rar: 'r', img: 'deco/swing', appeal: 5, pos: P(800, 1420) },
  { id: 'rabbit', name: '토끼 석상', rar: 'r', img: 'deco/rabbit', appeal: 5, pos: P(90, 1420) },
  { id: 'treats', name: '강아지 간식 바구니', rar: 's', img: 'deco/treats', appeal: 12, pos: P(640, 760) },
  { id: 'lanternpost', name: '꽃바구니 가로등', rar: 's', img: 'fac/lantern', appeal: 12, pos: P(560, 1180) },
];
/* 꾸미기 상품 (골드 item) · 소장자 전용 */
export const DECO_SHOP = { deco: { name: '벚꽃 정원 세트', appeal: 20, items: ['tulip', 'lanterns', 'bench'] }, skin: { name: '셰프 봄 의상 · 연노랑 앞치마', appeal: 5 } };
export const OWNER_DECO = { name: '금빛 꽃바구니 가로등', appeal: 15 };

/* ── 광고 자리 (명세서 9-1 의 10곳을 같은 비중으로) · 하루 한도는 원어데이(게임당 5)와 게임 쪽 둘 다 ── */
export const ADS = {
  speed: { name: '바쁜 시간 · 5분 동안 요리 2배 빠르게', sec: 300, limit: 3 },
  crit: { name: '대박 요리 · 10분 동안 30%', sec: 600, limit: 2 },
  rest: { name: '쉼 포인트 · 10분 동안 +30%', sec: 600, limit: 2 },
  double: { name: '받는 보상 2배 (쉬는 동안 · 선물 · 미션)', limit: 5 },
  box: { name: '숲 선물 상자 1회', limit: 1 },
  again: { name: '상자 한 번 더', limit: 1 },
  charge: { name: '계곡 놀이터 바로 채우기', limit: 2 },
  gifts: { name: '바닥 선물 한꺼번에 받기', limit: 2 },
  restock: { name: '매점 진열 새로', limit: 2 },
  inst: { name: '즉시 완성', limit: 5 },
};
export const STAMP_SHOP = [{ id: 'rabbit', cost: 15 }, { id: 'swing', cost: 15 }, { id: 'lanterns', cost: 12 }, { id: 'cushion', cost: 6 }];

/* ── 매점 진열 (웰컴센터 · 숲 코인으로 · 명세서 '가중치 랜덤 진열 상점') ── */
export const STALL = [['treat', '캠핑 쿠키 3', { min: 15 }], ['big', '특별 도시락 1', { min: 60 }], ['rp', '쉼 포인트 묶음', { min: 30 }], ['speed', '바쁜 시간 5분', { min: 25 }]];

/* ── 즉시 완성 (docs/bm-policy.md 2-1 · farm/inst.js 와 같은 계산) ── */
export const INST = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25];
export const INST_MIN = 10;
export const speedCost = sec => Math.max(1, Math.ceil(sec / 300));   /* 솔방울: 남은 5분마다 1 (최소 1) · 솔방울 1 = 원어데이 골드 1 */
const TIER = [[300, 1], [600, 2], [900, 3], [1200, 4], [1800, 6], [2700, 8], [3600, 10], [7200, 15], [14400, 25]];
const down = g => INST.reduce((a, v) => (v <= g ? v : a), INST[0]);
export const instBase = T => down(Math.min(Math.ceil(T / 300), (TIER.find(([s]) => T <= s) || [0, 25])[1]));
export function instGold(baseT, durS, leftS) { if (!(leftS >= INST_MIN)) return 0; const p = Math.max(1, Math.ceil(instBase(baseT) * Math.min(1, leftS / Math.max(1, durS)))); return down(Math.min(p, speedCost(leftS))); }

/* ── 큰 수 (한국식 단위) ── */
const UNITS = ['', '만', '억', '조', '경', '해', '자', '양', '구', '간', '정', '재', '극'];
export function fmt(n) {
  if (!isFinite(n)) return '∞'; n = Math.floor(n); if (n < 10000) return n.toLocaleString('ko-KR');
  const e = Math.min(UNITS.length - 1, Math.floor(Math.log10(n) / 4)), v = n / 10 ** (e * 4);
  return (v >= 100 ? Math.floor(v) : v >= 10 ? Math.floor(v * 10) / 10 : Math.floor(v * 100) / 100) + UNITS[e];
}
export const josa = (w, p) => { const c = w.charCodeAt(w.length - 1) - 0xAC00, has = c >= 0 && c % 28 > 0; const [a, b] = p.split('/'); return w + (has ? a : b); };
