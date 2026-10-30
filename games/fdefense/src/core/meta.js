// 판 밖 성장 (명예 · 강화 · 장비 · 해금 · 보상 공식) — 게임과 봇이 같이 쓴다
// 원어데이판 경제 (plan.md 7장 #3 #4): 이기면 늘 더 받고, 스테이지가 뒤일수록 더 받는다 · 다 키우는 데 무과금 150~200판
import { T } from './data.js?v=0.95.1';

export const COST_SCALE = 0.25;          // 원작 강화 · 장비 값 × 0.25
export const HERO_PRICE = [0, 750, 1250]; // 원작 3000 · 5000 × 0.25
export const MODES = ['일반', '무한', '성문 부수기'];
// 스테이지 첫 클리어 보상 (원작 순서 · 1부터 센 번호)
export const MILESTONES = {
  5: { kind: 'special', text: '영웅 필살기가 열렸어요' },
  10: { kind: 'hero', hero: 1, text: '영웅 보우 마스터를 만날 수 있어요' },
  15: { kind: 'heroism', value: 400, text: '명예 +400' },
  20: { kind: 'limit', text: '강화 한계가 10단계로 늘었어요' },
  25: { kind: 'hero', hero: 2, text: '영웅 아크메이지를 만날 수 있어요' },
  30: { kind: 'skill', text: '영웅 공격이 강해졌어요 (광역 · 연사)' },
  35: { kind: 'heroism', value: 600, text: '명예 +600' },
  40: { kind: 'item', item: 15, text: '장비 제퓌로스 목걸이' },
  45: { kind: 'heroism', value: 900, text: '명예 +900' },
};

export function freshMeta() {
  return { unit: Array(18).fill(0), hero: [Array(6).fill(0), Array(6).fill(0), Array(6).fill(0)], owned: [true, false, false], open: [true, false, false],
    items: [], equip: [[-1, -1], [-1, -1], [-1, -1]], limit: 0, special: false, skill: false, upLimit: false, claimed: {} };
}
// 시뮬레이터에 넘길 꼴
export function simMeta(m) {
  return { unit: m.unit, hero: m.hero, items: m.equip, heroes: m.owned, special: m.special, skill: m.skill };
}
export const unitMax = m => (m.upLimit ? 10 : 5) + m.limit * 5;
export const heroMax = m => (m.upLimit ? 10 : 5);
export function unitCost(m, i) { const u = T.upUnit[i]; if (m.unit[i] >= unitMax(m)) return -1; return Math.max(5, Math.round(u[1] * (u[2] * m.unit[i] + 100) / 100 * COST_SCALE)); }
export function heroUpCost(m, g, i) { const u = T.upHero[i]; if (!m.owned[g] || m.hero[g][i] >= heroMax(m)) return -1; return Math.max(5, Math.round(u[1] * (u[2] * m.hero[g][i] + 100) / 100 * COST_SCALE)); }
export function itemCost(i) { return Math.round(T.item[i][4] * COST_SCALE * 2) ; }   // 장비는 0.5배 (한 번 사면 끝이라 조금 더 비싸게)

// 판 결과 → 명예 (원어데이 공식)
export function heroismFor(r) {
  const s = r.stage + 1, base = 40 + 8 * s;
  if (r.mode === 1) return Math.round(r.wave * (2 + s / 12));
  if (!r.win) return Math.round(base * 0.3 * Math.min(1, r.progress));
  let v = base * (r.mode === 2 ? 1.2 : 1);
  v *= 1 + 0.1 * r.stars;
  if (r.first) v += 60 + 6 * s;
  return Math.round(v);
}
export function stars(life) { return life >= 20 ? 3 : life >= 10 ? 2 : 1; }

// 첫 클리어 처리 (마일스톤) → 받은 것 목록
export function claimMilestones(d) {
  const m = d.meta, got = [];
  for (const [k, ms] of Object.entries(MILESTONES)) {
    const s = +k - 1;
    if (!d.cleared[s] || m.claimed[k]) continue;
    m.claimed[k] = 1; got.push(ms);
    if (ms.kind === 'special') m.special = true;
    if (ms.kind === 'hero') m.open[ms.hero] = true;
    if (ms.kind === 'heroism') d.heroism += ms.value;
    if (ms.kind === 'limit') m.upLimit = true;
    if (ms.kind === 'skill') m.skill = true;
    if (ms.kind === 'item' && !m.items.includes(ms.item)) m.items.push(ms.item);
  }
  return got;
}
// 사기 (성공하면 true)
export function buyUnit(d, i) { const c = unitCost(d.meta, i); if (c < 0 || d.heroism < c) return false; d.heroism -= c; d.meta.unit[i]++; return true; }
export function buyHeroUp(d, g, i) { const c = heroUpCost(d.meta, g, i); if (c < 0 || d.heroism < c) return false; d.heroism -= c; d.meta.hero[g][i]++; return true; }
export function buyHero(d, g) { const m = d.meta; if (m.owned[g] || !m.open[g] || d.heroism < HERO_PRICE[g]) return false; d.heroism -= HERO_PRICE[g]; m.owned[g] = true; return true; }
export function buyItem(d, i) {
  const m = d.meta, it = T.item[i], c = itemCost(i);
  if (d.heroism < c) return false;
  if (it[0] === 1) { // 강화 초기화: 쓴 명예를 돌려받음
    let back = 0;
    m.unit.forEach((lv, k) => { for (let l = 0; l < lv; l++) back += Math.round(T.upUnit[k][1] * (T.upUnit[k][2] * l + 100) / 100 * COST_SCALE); });
    m.hero.forEach(h => h.forEach((lv, k) => { for (let l = 0; l < lv; l++) back += Math.round(T.upHero[k][1] * (T.upHero[k][2] * l + 100) / 100 * COST_SCALE); }));
    d.heroism += back - c; m.unit.fill(0); m.hero.forEach(h => h.fill(0)); return true;
  }
  if (it[0] === 5) { if (m.limit >= 2) return false; d.heroism -= c; m.limit++; return true; }
  if (m.items.includes(i)) return false;
  d.heroism -= c; m.items.push(i); return true;
}
export function equip(d, g, slot, i) {
  const m = d.meta;
  for (let h = 0; h < 3; h++) for (let s = 0; s < 2; s++) if (m.equip[h][s] === i) m.equip[h][s] = -1;
  m.equip[g][slot] = i;
}
export function totalUpgrades(m) { return m.unit.reduce((a, b) => a + b, 0) + m.hero.flat().reduce((a, b) => a + b, 0); }
