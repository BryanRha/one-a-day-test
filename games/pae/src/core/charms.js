// 부적: 판 안에서만 쓰는 효과 (장터에서 엽전으로만 · 골드로는 못 삼)
//   덱이 바뀌어도 돌아가게 엔진의 일반 속성(kind · ribbon · tag · month · season)만 봄
//   card(c, x): 점수에 든 패 한 장마다 · hand(x): 한 손마다 · end: 관문 끝 엽전 · grow: 쌓이는 값(판 안 저장)
//   돌려주는 값: { chips, mult, x } (x = 배수 곱하기)
//   rarity 1 흔함 · 2 드묾 · 3 귀함 — 장터 등장 확률은 도감에 공개 (RARITY_P)
export const RARITY_P = { 1: 0.7, 2: 0.25, 3: 0.05 };
export const RARITY_NAME = { 1: '흔함', 2: '드묾', 3: '귀함' };
export const COST = { 1: 4, 2: 6, 3: 8 };

const R = (ribbon, name, motif, color) => ({ id: 'rb_' + ribbon, name, rarity: 1, motif, color, daily: true, desc: `${ribbonName(ribbon)} 띠가 점수에 들 때마다 배수 +3`, card: c => c.ribbon === ribbon ? { mult: 3 } : null });
const ribbonName = r => ({ hong: '붉은', cheong: '푸른', cho: '풀빛', plain: '비' })[r] || r;
const S = (season, name, motif, color) => ({ id: 'ss_' + season, name, rarity: 1, motif, color, daily: true, desc: `${name.split(' ')[0]} 패가 점수에 들 때마다 배수 +2`, card: (c, x) => x.seasonOf(c.month) === season ? { mult: 2 } : null });

export const CHARMS = [
  R('hong', '붉은 끈', 'knot', '#C8282E'),
  R('cheong', '푸른 끈', 'knot', '#24519C'),
  R('cho', '풀빛 끈', 'knot', '#2E7D4F'),
  S('spring', '봄 바람', 'petal', '#E79AB3'),
  S('summer', '여름 비', 'leaf', '#7FB77E'),
  S('autumn', '가을 달', 'moon', '#E0873A'),
  S('winter', '겨울 눈', 'snow', '#9DB8D9'),
  { id: 'sun_moon', name: '해와 달', rarity: 1, motif: 'sun', color: '#E8B64C', daily: true, desc: '광이 점수에 들 때마다 점수 +40', card: c => c.kind === 'gwang' ? { chips: 40 } : null },
  { id: 'beast', name: '짐승 발자국', rarity: 1, motif: 'paw', color: '#8A5A3B', daily: true, desc: '열끗이 점수에 들 때마다 점수 +20', card: c => c.kind === 'yeol' ? { chips: 20 } : null },
  { id: 'basket', name: '꽃잎 바구니', rarity: 1, motif: 'petal', color: '#D9879E', daily: true, desc: '피가 점수에 들 때마다 배수 +1 (쌍피 +2)', card: c => c.kind === 'pi' ? { mult: c.pi } : null },
  { id: 'pair', name: '짝꿍', rarity: 1, motif: 'two', color: '#C8362B', daily: true, desc: '같은 달 두 장 이상이 들면 배수 +5', hand: x => x.fams.has('month') ? { mult: 5 } : null },
  { id: 'five', name: '다섯 손가락', rarity: 1, motif: 'hand', color: '#B98A4E', daily: true, desc: '다섯 장을 내면 배수 +5', hand: x => x.sel.length >= 5 ? { mult: 5 } : null },
  { id: 'small', name: '외로운 학', rarity: 1, motif: 'crane', color: '#E9E1CF', daily: true, desc: '세 장 이하로 내면 배수 +7', hand: x => x.sel.length <= 3 ? { mult: 7 } : null },
  { id: 'season_bloom', name: '제철 꽃', rarity: 1, motif: 'flower', color: '#E58BA6', daily: true, desc: '이달의 꽃이 점수에 들 때마다 배수 +4', card: (c, x) => c.month === x.month ? { mult: 4 } : null },
  { id: 'purse', name: '엽전 꾸러미', rarity: 1, motif: 'coin', color: '#B08D57', desc: '관문을 넘을 때마다 엽전 +3', end: 3 },
  { id: 'windmill', name: '바람개비', rarity: 2, motif: 'wind', color: '#7FA8C9', desc: '남은 바람 한 번마다 배수 +4', hand: x => x.windsLeft > 0 ? { mult: 4 * x.windsLeft } : null },
  { id: 'bird', name: '새 울음', rarity: 2, motif: 'bird', color: '#6E8B3D', desc: '새 그림 패가 점수에 들 때마다 배수 ×1.5', card: c => c.tags.includes('bird') ? { x: 1.5 } : null },
  { id: 'triple', name: '세 자매', rarity: 2, motif: 'three', color: '#9C4A8A', desc: '같은 달 세 장 이상이 들면 배수 ×2', hand: x => x.maxMonth >= 3 ? { x: 2 } : null },
  { id: 'chain', name: '달 잇는 실', rarity: 2, motif: 'thread', color: '#4F7FB0', desc: '달 잇기 · 한 계절이 들면 배수 ×2.5', hand: x => (x.fams.has('run') || x.fams.has('season')) ? { x: 2.5 } : null },
  { id: 'dan', name: '단 매듭', rarity: 2, motif: 'knot', color: '#B33B3B', desc: '홍단 · 청단 · 초단이 들면 배수 ×2', hand: x => x.fams.has('dan') ? { x: 2 } : null },
  { id: 'last', name: '마지막 등불', rarity: 2, motif: 'lantern', color: '#E09A3A', desc: '그 관문의 마지막 손이면 배수 ×2.5', hand: x => x.lastHand ? { x: 2.5 } : null },
  { id: 'lotus', name: '연꽃 등', rarity: 2, motif: 'lotus', color: '#E7A9C0', desc: '족보(낱장 말고)를 낼 때마다 점수 +8 씩 쌓임', grow: true, hand: (x, st) => { if (x.yaku !== 'high') st.n = (st.n || 0) + 8; return st.n ? { chips: st.n } : null; } },
  { id: 'rich', name: '복주머니', rarity: 2, motif: 'pouch', color: '#C0392B', desc: '가진 엽전 3개마다 배수 +1', hand: x => x.coins >= 3 ? { mult: Math.floor(x.coins / 3) } : null },
  { id: 'rain', name: '먹구름', rarity: 2, motif: 'cloud', color: '#5D6D7E', desc: '비 그림 패나 12월 패가 점수에 들면 점수 +80', card: c => (c.tags.includes('rain') || c.month === 12) ? { chips: 80 } : null },
  { id: 'fullmoon', name: '보름달', rarity: 3, motif: 'moon', color: '#F2D27A', desc: '8월 패가 점수에 들 때마다 배수 ×2', card: c => c.month === 8 ? { x: 2 } : null },
  { id: 'goldsmith', name: '금박 장인', rarity: 3, motif: 'leaf', color: '#E8B64C', desc: '금박 패가 점수에 들 때마다 배수 ×1.5', card: c => c.gold ? { x: 1.5 } : null },
  { id: 'phoenix', name: '봉황 깃', rarity: 3, motif: 'phoenix', color: '#D9542B', desc: '광이 두 장 이상 들면 배수 ×3', hand: x => x.nKind.gwang >= 2 ? { x: 3 } : null },
  { id: 'calendar', name: '열두 달 달력', rarity: 3, motif: 'wheel', color: '#8E7CC3', desc: '서로 다른 달 다섯 장을 내면 배수 ×3', hand: x => x.distinctMonths >= 5 ? { x: 3 } : null },
];
// 부적 가운데 붉은 글자 (그림이 아니라 코드 글자 — 부적마다 다름)
const GLYPHS = { rb_hong: '紅', rb_cheong: '靑', rb_cho: '草', ss_spring: '春', ss_summer: '夏', ss_autumn: '秋', ss_winter: '冬', sun_moon: '光', beast: '獸', basket: '籠', pair: '雙', five: '五', small: '鶴', season_bloom: '季', purse: '錢', windmill: '風', bird: '鳥', triple: '三', chain: '連', dan: '結', last: '燈', lotus: '蓮', rich: '福', rain: '雲', fullmoon: '月', goldsmith: '金', phoenix: '鳳', calendar: '曆', cheer: '心' };
for (const c of CHARMS) c.glyph = GLYPHS[c.id] || '符';
export const CHARM = Object.fromEntries(CHARMS.map(c => [c.id, c]));
export const DAILY_POOL = CHARMS.filter(c => c.daily);
// 응원 부적: 같은 계절신에게 3번 연속 막힌 다음 판에 '선물'로 받는 특별 부적 (docs/bm-policy.md 6장 · 크기는 이어하기 ½ 이하 — tools/bot.js --help 로 측정)
export const CHEER = { id: 'cheer', glyph: '心', name: '응원 부적', rarity: 0, motif: 'heart', color: '#F28CA8', desc: '막혔던 계절의 계절신 관문 목표 점수 −10% (이번 판)', cheer: 0.9 };
CHARM.cheer = CHEER;
