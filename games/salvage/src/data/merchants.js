// 수달 인양단 — 상인 3 (M3-A · v0.6) — 사는 것 · 파는 것이 겹치지 않게 (docs/BALANCE.md 5-4)
//  곰방 고물상: 기본 재료를 팖 · 무엇이든 삼(제값) · 오늘의 인양 목록(곰방이 찾는 물건)
//  모루 공방:   탄약 상자 · 개조 부품을 팖(하루 몇 개) · 부품을 1.3배로 삼
//  바람 행상:   선착장에 요일마다 들름 — 동력 코어 · 보스 보물 · 행상 꾸미기(조개) · '오늘 찾는 것' 분류를 1.35배로 삼
//  price: 조개(선착장 2단계부터 −10%) · per: 하루에 살 수 있는 수 · kind: mat 재료 / item 물건(창고로) / ammo 탄약 상자 / cos 꾸미기
export const MERCHANTS = {
  gombang: { name: '곰방 고물상', who: 'gombang', icon: '🦝', role: '재료 · 매입', tint: '#c99a5a', hello: '들고 나온 건 다 값이 있어. 값을 모르는 거지.',
    sells: 'mats', buy: { mul: 1 }, desc: '기본 재료를 팔고, 무엇이든 제값에 사요' },
  moru: { name: '모루 공방', who: 'moru', icon: '🦫', role: '탄약 · 부품', tint: '#a8784e', hello: '볼트 여섯. 더도 말고.', req: { fac: ['rack', 1] },
    desc: '탄약 상자 · 개조 부품 · 부품은 1.3배로 사요',
    stock: [
      { k: 'ap', kind: 'ammo', price: 70, per: 3 },
      { k: 'sp', kind: 'ammo', price: 95, per: 2, need: { fac: ['ammo', 2] } },
      { k: 'spring', kind: 'item', price: 48, per: 3 },
      { k: 'lens', kind: 'item', price: 80, per: 2 },
      { k: 'pkeg', kind: 'item', price: 60, per: 2 },
      { k: 'gear', kind: 'item', price: 60, per: 2 },
      { k: 'chip', kind: 'item', price: 42, per: 3 } ],
    buy: { cats: ['part'], mul: 1.3, not: ['core'] } },
  baram: { name: '바람 행상', who: 'baram', icon: '🦡', role: '요일 행상', tint: '#9a8fb5', hello: '안녕, 등불. 또 살아 있네? 다행이다, 단골 잃는 줄.', req: { fac: ['dock', 1] },
    desc: '요일마다 물건이 바뀌어요 · 코어 · 보스 보물 · 행상 꾸미기 · 오늘 찾는 것은 1.35배',
    n: 4, pool: [
      { k: 'core', kind: 'item', price: 700, per: 1 },
      { k: 'core', kind: 'item', price: 700, per: 1 },
      { k: 'beacon', kind: 'item', price: 460, per: 1 },
      { k: 'fang', kind: 'item', price: 420, per: 1 },
      { k: 'spyglass', kind: 'item', price: 280, per: 1 },
      { k: 'compass', kind: 'item', price: 300, per: 1 },
      { k: 'crown', kind: 'item', price: 650, per: 1 },
      { k: 'motor', kind: 'item', price: 120, per: 2 },
      { k: 'rail', kind: 'item', price: 90, per: 2 },
      { k: 'ticket', kind: 'item', price: 95, per: 2 },
      { k: 'pearl', kind: 'item', price: 230, per: 1 },
      { k: 'battery', kind: 'item', price: 110, per: 2 },
      { k: 'ap', kind: 'ammo', price: 55, per: 4 },
      { k: 'sp', kind: 'ammo', price: 75, per: 3 },
      { k: 'cos', kind: 'cos', per: 1 },
      { k: 'cos', kind: 'cos', per: 1 },
      { k: 'cos', kind: 'cos', per: 1 } ],
    /* 오늘 찾는 것 (날마다 하나) — 그 분류 · 지도 물건을 1.35배로 삼 */
    wants: [
      { name: '항구 물건', items: ['rope', 'fish', 'spyglass', 'beacon'] },
      { name: '터널 물건', items: ['rail', 'ticket', 'battery', 'fang'] },
      { name: '반짝이는 것', items: ['gem', 'pearl', 'coins', 'compass'] },
      { name: '기계 고철', items: ['gear', 'motor', 'cable', 'chip'] },
      { name: '선원 물건', items: ['rum', 'book', 'rope', 'spyglass'] },
      { name: '금고 물건', items: ['chest', 'crown', 'coins', 'pearl'] },
      { name: '공장 물건', items: [], map: 'factory' } ],
    buy: { mul: 1, wantMul: 1.35 } },
};
export const MERCHANT_KEYS = Object.keys(MERCHANTS);
