// 계절신 12: 계절마다 셋 중 하나가 그 계절 마지막 관문(3 · 6 · 9 · 12월)을 지킴 · 규칙 하나를 비틂
//   mod 키(엔진이 아는 말): zeroKind(그 종류 끗 0) · winds · hands · handSize(더하기) · maxPlay · once(같은 족보 한 번만) · noSeason(제철 없음) · gust(낼 때마다 손패 한 장이 바람에) · target(목표 곱)
export const GODS = [
  { id: 'g01', month: 1, name: '송학신', line: '고고한 학은 흔한 것을 셈하지 않는다', rule: '피 패의 끗이 0이 돼요', mod: { zeroKind: 'pi' } },
  { id: 'g02', month: 2, name: '매화신', line: '찬 바람에 피는 꽃은 바람을 아낀다', rule: '바람이 한 번뿐이에요', mod: { winds: 1 } },
  { id: 'g03', month: 3, name: '벚꽃신', line: '꽃잎은 손에 다 담기지 않는다', rule: '손패가 7장이에요', mod: { handSize: -1 } },
  { id: 'g04', month: 4, name: '등꽃신', line: '같은 노래는 두 번 듣지 않는다', rule: '같은 족보는 한 번만 점수가 나요', mod: { once: true } },
  { id: 'g05', month: 5, name: '붓꽃신', line: '좁은 다리는 넷만 건넌다', rule: '한 번에 4장까지만 낼 수 있어요', mod: { maxPlay: 4 } },
  { id: 'g06', month: 6, name: '모란신', line: '모란 앞에서 빛은 고개를 숙인다', rule: '광 패의 끗이 0이 돼요', mod: { zeroKind: 'gwang' } },
  { id: 'g07', month: 7, name: '싸리신', line: '멧돼지는 세 번만 기다린다', rule: '손이 3번뿐이에요', mod: { hands: -1 } },
  { id: 'g08', month: 8, name: '달신', line: '보름달 아래 모든 달은 같다', rule: '이달의 꽃 보너스가 없어요', mod: { noSeason: true } },
  { id: 'g09', month: 9, name: '국화신', line: '국화 향은 바람을 부른다', rule: '낼 때마다 손패 한 장이 바람에 실려 가요 (다음 달에 돌아와요)', mod: { gust: 1 } },
  { id: 'g10', month: 10, name: '단풍신', line: '사슴은 숲에 숨는다', rule: '열끗 패의 끗이 0이 돼요', mod: { zeroKind: 'yeol' } },
  { id: 'g11', month: 11, name: '오동신', line: '봉황은 띠를 두르지 않는다', rule: '띠 패의 끗이 0이 돼요', mod: { zeroKind: 'tti' } },
  { id: 'g12', month: 12, name: '버들비신', line: '마지막 비는 가장 길다', rule: '목표 점수가 1.3배예요 (넘으면 엽전 +3)', mod: { target: 1.3, bonus: 3 } },
];
export const GOD = Object.fromEntries(GODS.map(g => [g.id, g]));
