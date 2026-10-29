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
];
export const PAGES = 12, PAGE_DONE = 5;

/* 진행 맵 30단계: 10단계마다 새 방해 요소 + 새 노트 테마
   1~10 기본 · 11~20 얼음 · 21~30 얼음 + 사슬 */
const LAY = ['small', 'small', 'diamond', 'small', 'diamond', 'wide', 'diamond', 'wide', 'tower', 'diamond'];
const SETR = ['travel', 'cafe', 'season'];
export function stageCfg(n) {
  const k = (n - 1) % 10, tier = Math.floor((n - 1) / 10);
  const nTypes = Math.min(9, 6 + Math.floor(k / 3) + tier);
  const set = SETS[SETR[(n - 1) % 3]];
  return {
    layout: LAY[k], types: set.slice(0, nTypes), mix: Math.min(0.7, 0.15 + k * 0.04 + tier * 0.08),
    ice: tier >= 1 ? 2 + Math.floor(k / 2) + (tier - 1) * 2 : 0, chain: tier >= 2 ? 2 + Math.floor(k / 3) : 0,
    reward: n % 10 === 0 ? 'note' : 'sticker',
  };
}
export const OBSTACLE_AT = { 11: 'ice', 21: 'chain' };

/* 오늘의 판 3판: 점점 조금 어렵게 (행운 스티커 = 네잎클로버) */
export const DAILY_CFG = [
  { layout: 'small', types: SETS.daily.slice(0, 7), mix: 0.15 },
  { layout: 'diamond', types: SETS.daily.slice(0, 8), mix: 0.3 },
  { layout: 'diamond', types: SETS.daily, mix: 0.4 },
];

/* 자유 다꾸: 끝없이 · 판 모양 · 세트 · 방해 요소가 돌아가며 (맵에서 연 방해 요소만) */
export function freeCfg(i, mapCleared) {
  const k = i % 10, set = SETS[SETR[i % 3]];
  return {
    layout: LAY[(k + 3) % 10], types: set.slice(0, 7 + (k % 3)), mix: 0.25 + (k % 5) * 0.08,
    ice: mapCleared >= 10 && k % 2 ? 3 : 0, chain: mapCleared >= 20 && k % 3 === 2 ? 2 : 0,
  };
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
};
export const PACKS = {
  pack_foil: { ids: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => 'f' + i), n: 2 },
  pack_lucky: { ids: [7, 8, 32, 33, 24, 13], n: 3 },
};
export const TOOLS_DAILY = { undo: 2, magnet: 1, shuffle: 1 };
