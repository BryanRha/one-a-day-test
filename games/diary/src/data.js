// 오늘의 다꾸 — 표 데이터 (스티커 · 판 그림 세트 · 테마 노트 · 진행 맵 · 상점)

/* 스티커 그림 (assets/st/s<번호>.png) · 'f<번호>' = 같은 그림의 금박판 (프리미엄 · 노트 완성 보상) */
export const NAMES = ['딸기', '라떼', '필름 카메라', '튤립 꽃다발', '향수', '와인', '여행 가방', '네잎클로버', '복주머니', '레몬', '향초', '마카롱',
  '경비행기', '열기구', '나침반', '밀짚모자', '아이스 커피', '크루아상', '딸기 케이크', '찻주전자', '도넛', '팬케이크', '노면 전차', '야자수 섬',
  '벚꽃', '단풍잎', '눈사람', '해바라기', '장미', '데이지', '호박', '벙어리장갑', '초승달', '반딧불 병', '책 더미', '우산'];
export const COUNT = NAMES.length;
export const LUCKY = 7;
export const img = id => `assets/st/s${String(id).replace('f', '')}.png`;
export const isFoil = id => String(id).startsWith('f');
export const nameOf = id => (isFoil(id) ? '금박 ' : '') + NAMES[+String(id).replace('f', '')];

/* 판 그림 세트: 한 판 안에서 색 · 모양이 서로 확실히 다르게 고른 9종 (회색 모드 시험 통과) */
export const SETS = {
  daily: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  travel: [12, 13, 14, 15, 22, 23, 2, 6, 5],
  cafe: [1, 16, 17, 18, 19, 20, 21, 11, 0],
  season: [24, 25, 26, 27, 30, 31, 35, 33, 34],
};

/* 테마 노트: 한 권 12쪽 · 한 쪽에 스티커 5장 이상이면 그 쪽 완성 · 12쪽 다 채우면 표지 + 특별 스티커(금박) 3장
   open: 'free' 처음부터 · 'map:N' 진행 맵 N단계 · 'gold:SKU' 골드로 */
export const NOTES = [
  { id: 'travel', name: '여행 노트', open: 'free', color: '#8fa9a0', paper: '#f4efe4', sig: 13, stickers: [12, 13, 14, 15, 22, 23, 6, 2] },
  { id: 'cafe', name: '카페 노트', open: 'free', color: '#b08a6a', paper: '#f7efe3', sig: 18, stickers: [1, 16, 17, 18, 19, 20, 21, 11] },
  { id: 'season', name: '계절 노트', open: 'free', color: '#c98d7b', paper: '#f6f0e6', sig: 24, stickers: [24, 25, 26, 27, 30, 31, 35, 9] },
  { id: 'flower', name: '꽃집 노트', open: 'map:10', color: '#d6a2a8', paper: '#f8eef0', sig: 28, stickers: [3, 28, 29, 24, 27, 4] },
  { id: 'night', name: '밤 산책 노트', open: 'map:20', color: '#4f5b7a', paper: '#eef0f5', sig: 32, stickers: [32, 33, 10, 5, 8, 35] },
  { id: 'library', name: '책방 노트', open: 'map:30', color: '#6f7a5a', paper: '#f3f1e6', sig: 34, stickers: [34, 19, 10, 14, 2, 1] },
  { id: 'letter', name: '빈티지 레터 노트', open: 'gold:note_letter', color: '#9c6b5a', paper: '#f5ead8', sig: 4, stickers: [4, 28, 3, 10, 14, 19] },
  { id: 'picnic', name: '피크닉 노트', open: 'gold:note_picnic', color: '#7fa36f', paper: '#f3f5e8', sig: 0, stickers: [0, 9, 21, 27, 29, 16] },
  { id: 'gold', name: '골드 에디션 노트', open: 'owner', color: '#b8924a', paper: '#f7f0e0', sig: 7, stickers: [7, 8, 32, 13, 24, 27], foil: true },
];
export const PAGES = 12, PAGE_DONE = 5;

/* ---------- 날마다 다른 '오늘의 세트' ----------
   36종을 색 · 재질 계열로 묶고, 하루에 계열마다 한 장씩만 골라 9종 (유리 · 병 계열은 한 판에 하나만 → 비슷한 그림 없음) */
export const FAMILY = {
  glass: [4, 5, 16, 33], pink: [3, 11, 18, 20, 24], red: [0, 12, 13, 25, 28], yellow: [9, 22, 27, 31, 32], bake: [15, 17, 21],
  blue: [8, 14, 19, 35], green: [7, 23], white: [1, 26, 29], orange: [10, 30], dark: [2, 34], mint: [6],
};
/* 행운 스티커: 요일마다 (일~토) */
export const LUCKY_BY_DAY = [27, 32, 7, 24, 13, 8, 33];
const seeded = k => { let h = 2166136261; for (const c of k) h = Math.imul(h ^ c.charCodeAt(0), 16777619); let s = h >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
export function dailySet(dayKey) {
  const r = seeded('set' + dayKey), [y, m, d] = dayKey.split('-').map(Number), wd = new Date(y, m - 1, d, 12).getDay();
  const lucky = LUCKY_BY_DAY[wd], lf = Object.keys(FAMILY).find(f => FAMILY[f].includes(lucky));
  const fams = Object.keys(FAMILY).filter(f => f !== lf).sort(() => r() - 0.5).slice(0, 8);
  const set = [lucky, ...fams.map(f => FAMILY[f][Math.floor(r() * FAMILY[f].length)])];
  /* 틀은 날짜 순서대로 돌아감 → 이어진 7일이 모두 다른 틀 */
  const ord = Math.round(Date.UTC(y, m - 1, d) / 86400000);
  return { set, lucky, tpl: ((ord % PAGE_TPL.length) + PAGE_TPL.length) % PAGE_TPL.length };
}
/* 오늘의 3판: 쉬움 → 보통 → 어려움 (오늘의 세트 9종 + 다른 계열로 채움) */
export function dailyCfg(dayKey, w) {
  const { set } = dailySet(dayKey), L = LEVEL[['easy', 'normal', 'hard'][w]];
  return { layout: L.layout, types: pickTypes('day' + dayKey, L.n, set), cap: L.cap, pNew: L.pNew, zw: 1.5, kind: ['easy', 'normal', 'hard'][w] };
}

/* 페이지 틀 7종: 스티커 자리(비율 x · y · 크기 · 기울기) · 속지 · 마테 테이프 색 */
export const PAGE_TPL = [
  { paper: 'dot', tape: ['#9db39a', '#d9a5a0'], spots: [[.08, .28, .33, -9], [.52, .31, .30, 7], [.30, .44, .34, 4], [.64, .49, .28, -12], [.06, .58, .30, 10], [.40, .62, .31, -5], [.68, .66, .26, 8], [.16, .74, .26, -6]] },
  { paper: 'line', tape: ['#c9a97c', '#b9c9d6'], spots: [[.06, .26, .40, -4], [.54, .27, .34, 6], [.10, .50, .26, 8], [.40, .48, .26, -6], [.70, .50, .24, 10], [.20, .68, .30, -8], [.58, .68, .32, 5], [.38, .80, .22, 0]] },
  { paper: 'grid', tape: ['#e3c98d', '#9db39a'], spots: [[.32, .25, .38, 3], [.06, .40, .28, -10], [.66, .40, .28, 9], [.30, .52, .34, -3], [.06, .66, .26, 7], [.68, .64, .26, -8], [.34, .74, .24, 12], [.60, .80, .2, -4]] },
  { paper: 'kraft', tape: ['#f3d9d3', '#c9d8c4'], spots: [[.10, .30, .30, -12], [.42, .26, .26, 8], [.68, .32, .26, -6], [.20, .50, .34, 6], [.58, .52, .32, -10], [.08, .72, .26, 4], [.40, .74, .24, -4], [.66, .74, .26, 10]] },
  { paper: 'dot', tape: ['#b4473a', '#e9dcc0'], spots: [[.06, .24, .44, -6], [.56, .30, .30, 10], [.56, .52, .30, -8], [.08, .58, .28, 5], [.34, .62, .26, -3], [.62, .72, .26, 6], [.14, .78, .24, -10], [.40, .82, .2, 4]] },
  { paper: 'line', tape: ['#9db39a', '#e3c98d'], spots: [[.10, .26, .26, 6], [.40, .24, .30, -4], [.70, .28, .24, 9], [.24, .44, .40, -2], [.06, .64, .28, -8], [.40, .66, .26, 7], [.68, .62, .26, -6], [.30, .80, .22, 3]] },
  { paper: 'grid', tape: ['#d9a5a0', '#b9c9d6'], spots: [[.08, .30, .30, 9], [.40, .40, .34, -5], [.68, .26, .26, -10], [.70, .52, .24, 7], [.06, .56, .30, -4], [.38, .70, .30, 6], [.10, .80, .24, -9], [.66, .76, .26, 3]] },
];
/* 오늘 기분 도장 5종 · 고를 수 있는 한 줄 */
export const MOODS = [
  { id: 'sun', name: '맑음', color: '#d9893a' }, { id: 'heart', name: '설렘', color: '#c4566a' }, { id: 'cup', name: '느긋', color: '#8a6a4e' },
  { id: 'cloud', name: '흐림', color: '#6f8296' }, { id: 'star', name: '뿌듯', color: '#b8924a' },
];
export const LINES = ['오늘도 수고했어', '작은 행복 하나 발견', '천천히 가도 괜찮아', '좋아하는 걸 했던 날', '내일은 조금 더 가볍게', '고마운 사람이 떠오른 날', '나를 칭찬해 주고 싶은 날', '커피가 유난히 맛있던 날', '별일 없어서 좋은 날'];
export const linesFor = dayKey => { const r = seeded('line' + dayKey); return [...LINES].sort(() => r() - 0.5).slice(0, 3); };
/* 꾸미기: 마테 테이프 6 · 속지 4 */
export const TAPES = ['#9db39a', '#d9a5a0', '#e3c98d', '#b9c9d6', '#c9a97c', '#b4473a'];
export const PAPERS = [{ id: 'dot', name: '점' }, { id: 'line', name: '줄' }, { id: 'grid', name: '격자' }, { id: 'kraft', name: '크라프트' }];

/* ---------- 난이도 (2026-10-29 대표 "너무 쉬워서 게임 같지 않아") ----------
   판 재료: 그림 12~16종 · 4~6층 · 90~138장 · 같은 그림을 깊은 층에 흩어 붙임(cap · pNew) · 칸 7 그대로
   톱니 곡선: 1~5 연습 · 일반 · 15 · 25 어려운 판(붉은 표시 · 보상 2배) · 10 · 20 · 30 보스 · 11~ 얼음 · 21~ 사슬
   측정: tools/difficulty.mjs (사람 같은 봇 · 시드 200) → PROJECT_STATUS.md 표 */
export const ALL = [...Array(COUNT).keys()];
/* n종 고르기: 계열마다 한 장씩 먼저(비슷한 그림 최소) → 그다음 둘째 장 */
export function pickTypes(key, n, must = []) {
  const r = seeded('t' + key), fams = Object.keys(FAMILY).sort(() => r() - 0.5), out = [...must];
  for (let round = 0; out.length < n && round < 6; round++) for (const f of fams) { if (out.length >= n) break; const left = FAMILY[f].filter(x => !out.includes(x)); if (left.length) out.push(left[Math.floor(r() * left.length)]); }
  return out.slice(0, n);
}
export function stageKind(n) { return n <= 5 ? 'practice' : n % 10 === 0 ? 'boss' : n % 5 === 0 ? 'hard' : 'normal'; }
/* 단계 표 (tools/difficulty.mjs 로 맞춘 값) — 연습 1~5 · 일반 · 어려움 15 · 25 · 보스 10 · 20 · 30 */
const STAGE = {
  1: ['a42', 5, 1, .2], 2: ['a42', 6, 1, .2], 3: ['a69', 6, 1, .2], 4: ['a99', 6, 1, .2], 5: ['a99', 6, 1, .3],
  6: ['a99', 11, 2, .5], 7: ['a99', 11, 2, .4], 8: ['a99', 12, 2, .5], 9: ['a99', 12, 2, .4], 10: ['k147', 12, 1, .3],
  11: ['a99', 11, 2, .3], 12: ['a99', 11, 2, .3], 13: ['a99', 11, 2, .4], 14: ['a99', 12, 2, .3], 15: ['j129', 12, 2, .5],
  16: ['a99', 12, 2, .3], 17: ['a99', 12, 2, .4], 18: ['a99', 12, 2, .4], 19: ['a99', 12, 2, .3], 20: ['k147', 10, 1, .2],
  21: ['a99', 10, 2, .3], 22: ['a99', 11, 2, .3], 23: ['a99', 11, 2, .3], 24: ['a99', 11, 2, .3], 25: ['j129', 11, 2, .4],
  26: ['a99', 12, 2, .3], 27: ['a99', 11, 2, .3], 28: ['a99', 12, 2, .3], 29: ['a99', 10, 2, .3], 30: ['k147', 10, 1, .2],
};
export function stageCfg(n) {
  const kind = stageKind(n), tier = Math.floor((n - 1) / 10), [layout, nt, cap, pNew] = STAGE[n];
  return {
    layout, types: pickTypes('stage' + n, nt), cap, pNew, zw: 1.5, kind,
    ice: tier >= 1 ? 2 + Math.floor(((n - 1) % 10) / 3) + (tier - 1) : 0, chain: tier >= 2 ? 2 + Math.floor(((n - 1) % 10) / 4) : 0,
    reward: n % 10 === 0 ? 'note' : 'sticker',
  };
}
export const OBSTACLE_AT = { 11: 'ice', 21: 'chain' };

export const LEVEL = {
  easy: { layout: 'a99', n: 7, cap: 1, pNew: 0.2 },
  normal: { layout: 'a99', n: 12, cap: 2, pNew: 0.5 },
  hard: { layout: 'j129', n: 11, cap: 2, pNew: 0.5 },
};
/* 자유 다꾸: 판마다 고르는 난이도 · 보상(스티커 장수 · 금박 확률) */
export const FREE_REWARD = { easy: { n: 2, foil: 0.03 }, normal: { n: 3, foil: 0.08 }, hard: { n: 5, foil: 0.2 } };
export function freeCfg(i, mapCleared, diff = 'normal') {
  const L = LEVEL[diff], lays = { easy: ['a99', 'a69', 'a99'], normal: ['a99', 'a99', 'a99'], hard: ['j129', 'j129', 'j129'] }[diff];
  return { layout: lays[i % 3], types: pickTypes('free' + i, L.n), cap: lays[i % 3] === 'k147' ? 1 : L.cap, pNew: L.pNew, zw: 1.5, ice: mapCleared >= 10 && i % 2 ? 3 : 0, chain: mapCleared >= 20 && i % 3 === 2 ? 2 : 0, kind: diff };
}

/* 상점 (서버 SKU 요청 목록 — 가격은 docs/bm-policy.md · biz.md) */
export const SHOP = {
  continue: { gold: 20, kind: 'use', name: '이어하기 (세 장 돌려받기)' },
  continue2: { gold: 40, kind: 'use', name: '한 번 더 이어하기' },
  tools3: { gold: 30, kind: 'use', name: '도구 묶음 (되돌리기 · 모으기 · 섞기 각 1)' },
  note_letter: { gold: 250, kind: 'item', name: '빈티지 레터 노트' },
  note_picnic: { gold: 250, kind: 'item', name: '피크닉 노트' },
  pack_foil: { gold: 150, kind: 'item', name: '금박 스티커 묶음 (12종 × 2)' },
  pack_lucky: { gold: 150, kind: 'item', name: '행운 스티커 묶음 (6종 × 3)' },
  starter: { gold: 250, kind: 'item', name: '입문 묶음 (피크닉 노트 + 금박 스티커 묶음)', once: true },
};
export const PACKS = {
  pack_foil: { ids: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => 'f' + i), n: 2 },
  pack_lucky: { ids: [7, 8, 32, 33, 24, 13], n: 3 },
};
/* 입문 묶음 = 노트 1 + 금박 묶음 (낱개 400 → 250 · 처음 한 번만 · 둘 중 하나라도 가지고 있으면 안 보임) */
export const BUNDLE = { starter: ['note_picnic', 'pack_foil'] };
export const TOOLS_DAILY = { undo: 2, magnet: 1, shuffle: 1 };
