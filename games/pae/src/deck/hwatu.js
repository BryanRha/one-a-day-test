// 덱 정의: 열두 달 꽃패 48장 (원어데이 새 그림 · 그림 속 글자 없음)
//   엔진(규칙 · 진행 · 장터 · 도감)은 이 파일의 '데이터'만 읽는다 — 덱을 바꾸려면 같은 모양의 파일을 하나 더 만들고 decks.js 에 등록
//   달 tab: 패 왼쪽 위 꼬리표 색 (시안 v2 — 달마다 다른 색으로 같은 달을 빨리 찾게)
//   카드 속성(엔진이 아는 말): month(1~12) · kind(gwang | yeol | tti | pi) · ribbon(띠 색 id) · tags(['bird', 'rain' ...]) · pi(피 값: 쌍피 2) · art(그림 키) · flip(같은 그림을 뒤집어 다르게)
//   족보(yaku)도 이 파일의 데이터: rule 은 엔진의 일반 규칙(kind · ribbon · tag · month 묶음 · season · run · high)만 씀

export const DECK = {
  id: 'hwatu',
  name: '열두 달 꽃패',
  back: 'back',
  // 패 종류: 패 점수(pts) · 이름 · 표시 글자 · 테두리 색
  kinds: {
    gwang: { name: '광', label: '광', pts: 20, color: '#E8B64C' },
    yeol: { name: '열끗', label: '열', pts: 12, color: '#C8362B' },
    tti: { name: '띠', label: '띠', pts: 8, color: '#3A6EA5' },
    pi: { name: '피', label: '피', pts: 4, color: '#3B3226' },
  },
  // 띠 색: 그림=판정 — 띠 리본 색이 족보를 정함
  ribbons: {
    hong: { name: '홍단', color: '#C8282E', edge: '#F2C14E' },
    cheong: { name: '청단', color: '#24519C', edge: '#9FC3F0' },
    cho: { name: '초단', color: '#2E7D4F', edge: '#BFE3A8' },
    plain: { name: '비띠', color: '#6B6470', edge: '#C9C2CF' },
  },
  tags: { bird: '새', rain: '비' },
  seasons: [
    { id: 'spring', name: '봄', months: [1, 2, 3], color: '#E79AB3', bg: 'bg_spring' },
    { id: 'summer', name: '여름', months: [4, 5, 6], color: '#7FB77E', bg: 'bg_summer' },
    { id: 'autumn', name: '가을', months: [7, 8, 9], color: '#E0873A', bg: 'bg_autumn' },
    { id: 'winter', name: '겨울', months: [10, 11, 12], color: '#9DB8D9', bg: 'bg_winter' },
  ],
  months: [
    { n: 1, name: '송학', flower: '소나무', color: '#2F6B4F', tab: '#2E7D4F' },
    { n: 2, name: '매조', flower: '매화', color: '#C8282E', tab: '#C8282E' },
    { n: 3, name: '벚꽃', flower: '벚꽃', color: '#E79AB3', tab: '#E0708E' },
    { n: 4, name: '등꽃', flower: '등나무', color: '#7B5EA7', tab: '#7B5EA7' },
    { n: 5, name: '붓꽃', flower: '붓꽃', color: '#2E3E8C', tab: '#2E4FA8' },
    { n: 6, name: '모란', flower: '모란', color: '#B3203A', tab: '#9E1238' },
    { n: 7, name: '싸리', flower: '싸리', color: '#B4366E', tab: '#C2408A' },
    { n: 8, name: '달밤', flower: '억새', color: '#C9A64A', tab: '#B8892A' },
    { n: 9, name: '국화', flower: '국화', color: '#D6A21E', tab: '#D99A00' },
    { n: 10, name: '단풍', flower: '단풍', color: '#D2502A', tab: '#D2501E' },
    { n: 11, name: '오동', flower: '오동', color: '#5C4A7A', tab: '#6E5A3A' },
    { n: 12, name: '버들비', flower: '버들', color: '#4F6F6A', tab: '#3E6F8A' },
  ],
  // 48장: [달, 종류, 그림, 추가 속성]
  cards: [],
  // 족보: 위에서부터 강한 순 (엔진은 점수 큰 것을 고름 · 같은 family 는 겹치지 않음)
  yaku: [
    { id: 'ogwang', name: '오광', fam: 'gwang', chips: 120, mult: 12, rule: { kind: 'gwang', count: 5 }, desc: '광 다섯 장' },
    { id: 'sagwang', name: '사광', fam: 'gwang', chips: 80, mult: 8, rule: { kind: 'gwang', count: 4 }, desc: '광 네 장' },
    { id: 'samgwang', name: '삼광', fam: 'gwang', chips: 60, mult: 6, rule: { kind: 'gwang', count: 3, without: 'rain' }, desc: '비광 없이 광 세 장' },
    { id: 'bisamgwang', name: '비삼광', fam: 'gwang', chips: 45, mult: 5, rule: { kind: 'gwang', count: 3 }, desc: '비광이 낀 광 세 장' },
    { id: 'chongtong', name: '총통', fam: 'month', chips: 60, mult: 7, rule: { month: [4] }, desc: '같은 달 네 장' },
    { id: 'hongdan', name: '홍단', fam: 'dan', chips: 45, mult: 5, rule: { ribbon: 'hong', count: 3 }, desc: '붉은 띠 세 장 (1 · 2 · 3월)' },
    { id: 'cheongdan', name: '청단', fam: 'dan', chips: 45, mult: 5, rule: { ribbon: 'cheong', count: 3 }, desc: '푸른 띠 세 장 (6 · 9 · 10월)' },
    { id: 'chodan', name: '초단', fam: 'dan', chips: 45, mult: 5, rule: { ribbon: 'cho', count: 3 }, desc: '풀빛 띠 세 장 (4 · 5 · 7월)' },
    { id: 'saesae', name: '세 새', fam: 'bird', chips: 45, mult: 5, rule: { tag: 'bird', count: 3 }, desc: '새가 그려진 열끗 세 장 (2 · 4 · 8월)' },
    { id: 'kkotnori', name: '꽃놀이', fam: 'month', chips: 40, mult: 4, rule: { month: [3, 2] }, desc: '같은 달 세 장 + 다른 달 두 장' },
    { id: 'yeol5', name: '열끗 다섯', fam: 'kind5', chips: 35, mult: 4, rule: { kind: 'yeol', count: 5 }, desc: '열끗 다섯 장' },
    { id: 'season5', name: '한 계절', fam: 'season', chips: 35, mult: 4, rule: { season: 5 }, desc: '같은 계절 패 다섯 장' },
    { id: 'tti5', name: '띠 다섯', fam: 'kind5', chips: 30, mult: 4, rule: { kind: 'tti', count: 5 }, desc: '띠 다섯 장' },
    { id: 'run5', name: '달 잇기', fam: 'run', chips: 30, mult: 4, rule: { run: 5 }, desc: '이어지는 다섯 달 (예: 3 · 4 · 5 · 6 · 7월)' },
    { id: 'sam', name: '세 장', fam: 'month', chips: 30, mult: 3, rule: { month: [3] }, desc: '같은 달 세 장' },
    { id: 'pi5', name: '피 다섯', fam: 'kind5', chips: 20, mult: 3, rule: { kind: 'pi', count: 5, weight: 'pi' }, desc: '피 다섯 장 (쌍피는 두 장 몫)' },
    { id: 'twopair', name: '두 쌍', fam: 'month', chips: 20, mult: 2, rule: { month: [2, 2] }, desc: '같은 달 두 장씩 두 쌍' },
    { id: 'pair', name: '한 쌍', fam: 'month', chips: 10, mult: 2, rule: { month: [2] }, desc: '같은 달 두 장' },
    { id: 'high', name: '낱장', fam: 'high', chips: 5, mult: 1, rule: { high: 1 }, desc: '족보 없이 가장 높은 한 장' },
  ],
};

// 달마다 네 장 (원래 꽃패 구성을 따르되 그림은 전부 새로)
const L = [
  [1, ['gwang', 'm01_gwang'], ['tti', 'm01_base', { ribbon: 'hong' }], ['pi', 'm01_base'], ['pi', 'm01_base', { flip: 1 }]],
  [2, ['yeol', 'm02_yeol', { tags: ['bird'] }], ['tti', 'm02_base', { ribbon: 'hong' }], ['pi', 'm02_base'], ['pi', 'm02_base', { flip: 1 }]],
  [3, ['gwang', 'm03_gwang'], ['tti', 'm03_base', { ribbon: 'hong' }], ['pi', 'm03_base'], ['pi', 'm03_base', { flip: 1 }]],
  [4, ['yeol', 'm04_yeol', { tags: ['bird'] }], ['tti', 'm04_base', { ribbon: 'cho' }], ['pi', 'm04_base'], ['pi', 'm04_base', { flip: 1 }]],
  [5, ['yeol', 'm05_yeol'], ['tti', 'm05_base', { ribbon: 'cho' }], ['pi', 'm05_base'], ['pi', 'm05_base', { flip: 1 }]],
  [6, ['yeol', 'm06_yeol'], ['tti', 'm06_base', { ribbon: 'cheong' }], ['pi', 'm06_base'], ['pi', 'm06_base', { flip: 1 }]],
  [7, ['yeol', 'm07_yeol'], ['tti', 'm07_base', { ribbon: 'cho' }], ['pi', 'm07_base'], ['pi', 'm07_base', { flip: 1 }]],
  [8, ['gwang', 'm08_gwang'], ['yeol', 'm08_yeol', { tags: ['bird'] }], ['pi', 'm08_base'], ['pi', 'm08_base', { flip: 1 }]],
  [9, ['yeol', 'm09_yeol'], ['tti', 'm09_base', { ribbon: 'cheong' }], ['pi', 'm09_base'], ['pi', 'm09_base', { flip: 1 }]],
  [10, ['yeol', 'm10_yeol'], ['tti', 'm10_base', { ribbon: 'cheong' }], ['pi', 'm10_base'], ['pi', 'm10_base', { flip: 1 }]],
  [11, ['gwang', 'm11_gwang'], ['pi', 'm11_base', { pi: 2 }], ['pi', 'm11_base', { flip: 1 }], ['pi', 'm11_base', { flip: 2 }]],
  [12, ['gwang', 'm12_gwang', { tags: ['rain'] }], ['yeol', 'm12_yeol'], ['tti', 'm12_base', { ribbon: 'plain' }], ['pi', 'm12_base', { pi: 2, flip: 1 }]],
];
for (const [m, ...cs] of L) cs.forEach(([kind, art, x = {}], i) => {
  DECK.cards.push({ id: `m${String(m).padStart(2, '0')}${'abcd'[i]}`, month: m, kind, art, ribbon: x.ribbon || null, tags: x.tags || [], pi: kind === 'pi' ? (x.pi || 1) : 0, flip: x.flip || 0 });
});
