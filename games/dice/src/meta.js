// 진행·재방문: 룬 해금(최고 웨이브) · 수정으로 영구 등급업(확정, 뽑기 없음) · 연속 출석 · 오늘의 미션 · 오늘의 도전
import { load, save } from './save.js?v=0.99.26';
import { RUNE_ORDER, RARITY } from './core/sim.js?v=0.99.26';
import { fieldOpen } from './bmflow.js?v=0.99.26';


export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };

// ── 룬 수집: 뽑기(제단) ──
// 과하지 않게: 게임에서 버는 수정으로만 · 확률 공개 · 천장(30회 안에 전설) · 10회는 영웅 이상 1개 보장 · 중복은 등급업 재료
export const DRAW_COST = 50, DRAW10_COST = 450, PITY = 30;
export const ODDS = [0.58, 0.28, 0.11, 0.03];             // 일반·희귀·영웅·전설
export const MILESTONE = [5, 10, 15, 20, 25, 30, 40, 50];   // 메인 원정 최고 웨이브 이정표 — 처음 도달하면 보상 (milestoneReward)
// 이정표 보상 (2026-11-03 QA 18: 조금 늘림) — 제단 열쇠 1개(웨이브 30부터 2개) + 수정 웨이브×2
export const milestoneReward = w => ({ keys: w >= 30 ? 2 : 1, crystals: w * 2 });
export const milestoneText = w => { const r = milestoneReward(w); return `열쇠 ${r.keys} · 수정 ${r.crystals}`; };
/* 모드별 받을 보상 (QA 20 · 화면 표기용 · 한 줄에 한 항목) — 실제 계산은 finishRun 과 같게 맞출 것 */
export const REWARD = {
  run: ['◆ 수정 · 명성 · 웨이브와 보스만큼'],
  daily: ['◆ 수정 + 보너스 20', '명성 + 보너스 30'],
  arcade: ['◆ 수정 · 명성', '모드마다 달라요 · 입장해서 확인'],
  rush: ['보스 1마리마다 ◆9', '명성 · 미션 보상'],
  arena: ['웨이브마다 ◆3 · 보스마다 ◆6', '명성 · 미션 보상'],
  mono: ['웨이브마다 ◆3 · 보스마다 ◆6', '명성 · 미션 보상'],
  abyss: ['웨이브 10 넘긴 만큼 ◆8씩', '명성 · 미션 보상'],
};
/* 다음 이정표 한 줄 (홈 · 결과 같은 문구) */
export const milestoneLine = nm => nm ? `다음 이정표 웨이브 ${nm.wave} · 열쇠 ${nm.keys} · ◆${nm.crystals}` : '이정표 모두 달성!';
// 다음 이정표 (아직 못 받은 것 중 가장 낮은 웨이브) — 없으면 null
export function nextMilestone() { const d = load(); const w = MILESTONE.find(x => !d.milestones[x] && x > d.best) ?? MILESTONE.find(x => !d.milestones[x]); return w ? { wave: w, ...milestoneReward(w), text: milestoneText(w), best: d.best } : null; }
export const MAX_TIER = 10;
export const tierCost = t => Math.round(20 * Math.pow(t, 1.5));
export const cardsNeed = (r, t) => Math.max(1, Math.round(t * [2, 1.5, 1, 0.5][RARITY[r]]));
export const freeToday = () => load().freeDraw !== dayKey();
export const ownedCount = () => Object.keys(load().unlocked).length;
export const hasNew = () => Object.keys(load().newRunes || {}).length > 0;
export function seen(r) { const d = load(); if (d.newRunes[r]) { delete d.newRunes[r]; save(); } }
function drawOne(d, floor) {
  d.pulls++; d.pity++;
  let rar;
  if (d.pity >= PITY) rar = 3;
  else { let x = Math.random(); rar = 0; for (let k = 0; k < 4; k++) { if (x < ODDS[k]) { rar = k; break; } x -= ODDS[k]; } }
  rar = Math.max(rar, floor);
  if (rar === 3) d.pity = 0;
  const pool = RUNE_ORDER.filter(r => RARITY[r] === rar);
  // 아직 없는 룬이 조금 더 잘 나오게 (수집 진행감)
  const fresh = pool.filter(r => !d.unlocked[r]);
  const r = fresh.length && Math.random() < 0.5 ? fresh[Math.floor(Math.random() * fresh.length)] : pool[Math.floor(Math.random() * pool.length)];
  const isNew = !d.unlocked[r];
  if (isNew) { d.unlocked[r] = 1; d.newRunes[r] = 1; } else d.cards[r] = (d.cards[r] || 0) + 1;
  return { r, rar, isNew };
}
// how: 'free' | 'key' | 'one' | 'ten' → 결과 배열 (실패면 null)
export function draw(how) {
  const d = load();
  if (how === 'free') { if (!freeToday()) return null; d.freeDraw = dayKey(); }
  else if (how === 'key') { if (d.keys < 1) return null; d.keys--; }
  else if (how === 'one') { if (d.crystals < DRAW_COST) return null; d.crystals -= DRAW_COST; }
  else if (how === 'ten') { if (d.crystals < DRAW10_COST) return null; d.crystals -= DRAW10_COST; }
  const n = how === 'ten' ? 10 : 1, out = [];
  for (let i = 0; i < n; i++) out.push(drawOne(d, 0));
  if (n === 10 && !out.some(o => o.rar >= 2)) { const i = Math.floor(Math.random() * 10); const o = out[i]; if (o.isNew) delete d.unlocked[o.r]; else d.cards[o.r]--; d.pulls--; d.pity--; out[i] = drawOne(d, 2); }
  d.pitySeq = (d.pitySeq || 0) + 1;   /* 천장 기록 순서 (save.js PITY_KEY · 다른 기기와 비교) */
  save(); track('draw', n);
  return out;
}
// ── 한계 돌파: 최고 등급(★10) 룬을 3단계 더 (단계마다 피해 +30% · 치명타 피해 +3%) ──
export const LIMIT_MAX = 3;
export const limitCost = k => ({ cards: 8 * (k + 1), crystals: 400 * (k + 1) });
export function limitBreak(r) {
  const d = load(), k = d.limit[r] || 0, c = limitCost(k);
  if ((d.tiers[r] || 1) < MAX_TIER || k >= LIMIT_MAX || (d.cards[r] || 0) < c.cards || d.crystals < c.crystals) return false;
  d.cards[r] -= c.cards; d.crystals -= c.crystals; d.limit[r] = k + 1; save(); return true;
}
// 게임에 넘기는 등급 (한계 돌파 1단계 = 등급 2칸)
export function effTiers() { const d = load(), o = { ...d.tiers }; for (const [r, k] of Object.entries(d.limit || {})) o[r] = (o[r] || 1) + 2 * k; return o; }

// ── 전장 꾸미기 (배경 · 길 색) ──
export const FIELDS = [
  { id: 'altar', name: '고대 제단', cost: 0, accent: 0xB59BFF },
  { id: 'frost', name: '얼음 성소', cost: 600, accent: 0x8FD8FF },
  { id: 'lava', name: '용암 대장간', cost: 900, accent: 0xFF8A3D },
  { id: 'sky', name: '천공 정원', cost: 1200, accent: 0xFFB8D8 },
  { id: 'abyss', name: '심해 신전', cost: 1500, accent: 0x40E0D0 },
  // 원어데이 전용 (원어데이 밖에선 숨김 · 고른 상태여도 고대 제단으로 그림) — 겉모습만, 능력치 없음
  { id: 'gold', name: '황금 성역', sku: 'arena', accent: 0xFFD27A },     /* 골드 상품 SHOP.dice.arena (item · hello().items 로 복원) */
  { id: 'star', name: '별빛 성소', owner: true, accent: 0xC9B8FF },      /* 소장자 전용 (무료) */
];
export const field = () => { const f = FIELDS.find(x => x.id === load().field); return f && fieldOpen(f) ? f : FIELDS[0]; };
export const bgKey = () => `bg_${field().id}`;
export function buyField(id) { const d = load(), f = FIELDS.find(x => x.id === id); if (!f || f.owner || f.sku || d.fields[id] || d.crystals < f.cost) return false; d.crystals -= f.cost; d.fields[id] = 1; d.field = id; save(); return true; }
export function setField(id) { const d = load(), f = FIELDS.find(x => x.id === id); if (!f || !fieldOpen(f)) return false; d.field = id; save(); return true; }

// ── AI 예측 실력 보정: 내 실제 기록 - AI 예상 (최근 6판 평균) ──
export function notePred(deck, median) { const d = load(); d.lastPred = { key: deck.slice().sort().join(), median }; save(); }
export function skillAdj() { const c = load().calib || []; if (!c.length) return 0; const a = c.reduce((x, y) => x + y, 0) / c.length; return Math.max(-6, Math.min(6, Math.round(a * 2) / 2)); }

// 전설 확정권 (보상 길 10단계마다)
export function drawLegend() { const d = load(); if (d.legendTix < 1) return null; d.legendTix--; const o = drawOne(d, 3); d.pity = Math.max(0, d.pity - 1); d.pitySeq = (d.pitySeq || 0) + 1; save(); return [o]; }

// ── 수집 보너스: 등급을 올릴수록 모든 주사위의 치명타 피해가 영구히 오름 (원작의 핵심 성장) ──
export function critBonus() { const d = load(); let b = 0; for (const r of Object.keys(d.unlocked)) b += 0.01 + 0.05 * ((d.tiers[r] || 1) - 1) + 0.03 * ((d.limit || {})[r] || 0); return b; }
export const critPct = () => Math.round((2.5 + critBonus()) * 100);

// ── 보상 길: 원정마다 명성이 쌓이고, 단계마다 보상 (10단계마다 전설 확정권) ──
export const ROAD_MAX = 40;
export const roadNeed = k => 120 + 30 * k;                         // k단계 → k+1 단계에 필요한 명성
export function roadReward(k) {   // k: 1부터
  if (k % 10 === 0) return { legend: 1, text: '전설 확정권' };
  if (k % 5 === 0) return { keys: 2, text: '열쇠 2개' };
  if (k % 3 === 0) return { keys: 1, text: '열쇠 1개' };
  const c = 40 + 5 * k; return { crystals: c, text: `수정 ${c}` };
}
export function road() {
  const d = load(); let lv = 0, rest = d.fame;
  while (lv < ROAD_MAX && rest >= roadNeed(lv)) { rest -= roadNeed(lv); lv++; }
  return { fame: d.fame, level: lv, into: rest, need: lv < ROAD_MAX ? roadNeed(lv) : 1, claimed: d.roadClaimed };
}
export function claimRoad(k) {
  const d = load(), r = road();
  if (k > r.level || d.roadClaimed[k]) return null;
  const rw = roadReward(k); d.roadClaimed[k] = 1;
  if (rw.crystals) d.crystals += rw.crystals; if (rw.keys) d.keys += rw.keys; if (rw.legend) d.legendTix += rw.legend;
  save(); return rw;
}
export const roadUnclaimed = () => { const r = road(); let n = 0; for (let k = 1; k <= r.level; k++) if (!r.claimed[k]) n++; return n; };

// ── 오늘의 상점: 매일 바뀌는 룬 카드 3묶음 + 무료 수정 ──
export function shop() {
  const d = load(), day = dayKey();
  if (d.shop.date !== day) { d.shop = { date: day, bought: [] }; save(); }
  let h = 17; for (const ch of day) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  const own = RUNE_ORDER.filter(r => d.unlocked[r]), out = [{ free: true, crystals: 20, text: '수정 20', price: 0 }];
  const used = new Set();
  for (let i = 0; out.length < 4 && i < 40; i++) {
    h = (h * 1103515245 + 12345) >>> 0; const r = own[h % own.length]; if (used.has(r)) continue; used.add(r);
    const rar = RARITY[r]; out.push({ r, qty: [5, 3, 2, 1][rar], price: [40, 60, 90, 120][rar] });
  }
  return out.map((o, i) => ({ ...o, i, sold: d.shop.bought.includes(i) }));
}
export function buy(i) {
  const d = load(), o = shop()[i];
  if (!o || o.sold || d.crystals < o.price) return null;
  d.crystals -= o.price; d.shop.bought.push(i);
  if (o.free) d.crystals += o.crystals; else d.cards[o.r] = (d.cards[o.r] || 0) + o.qty;
  save(); return o;
}

export function checkUnlocks() {   // 최고 웨이브 이정표 → 제단 열쇠 + 수정 → { keys, crystals, waves }
  const d = load(), out = { keys: 0, crystals: 0, waves: [] };
  for (const w of MILESTONE) if (d.best >= w && !d.milestones[w]) { const r = milestoneReward(w); d.milestones[w] = 1; d.keys += r.keys; d.crystals += r.crystals; out.keys += r.keys; out.crystals += r.crystals; out.waves.push(w); }
  if (out.waves.length) save();
  return out;
}
// 등급업 가능: 카드 · 수정 모두 충분 (한계 돌파 포함) — 컬렉션 '등급업 가능' 배지 · 홈 빨간 점
export function canUpgrade(r) {
  const d = load(); if (!d.unlocked[r]) return false;
  const t = d.tiers[r] || 1, have = d.cards[r] || 0;
  if (t < MAX_TIER) return have >= cardsNeed(r, t) && d.crystals >= tierCost(t);
  const k = (d.limit || {})[r] || 0, c = limitCost(k); return k < LIMIT_MAX && have >= c.cards && d.crystals >= c.crystals;
}
export const upgradeReady = () => RUNE_ORDER.filter(canUpgrade).length;
// 오늘의 상점에 아직 안 받은 무료 선물이 있으면 (홈 · 컬렉션 상점 입구 빨간 점)
export const shopGift = () => shop().some(o => o.free && !o.sold);
export function upgrade(r) {
  const d = load(), t = d.tiers[r] || 1, need = cardsNeed(r, t);
  if (!d.unlocked[r] || t >= MAX_TIER || d.crystals < tierCost(t) || (d.cards[r] || 0) < need) return false;
  d.crystals -= tierCost(t); d.cards[r] -= need; d.tiers[r] = t + 1; save(); return true;
}
// ── 덱 3개 (프리셋) ──
export function decks() { const d = load(); if (!d.decks) { d.decks = [d.deck.slice(), d.deck.slice(), d.deck.slice()]; d.deckIdx = 0; save(); } return d.decks; }
export function selectDeck(i) { const d = load(); decks(); d.deckIdx = i; d.deck = d.decks[i].slice(); save(); }
export function setDeck(deck) { const d = load(); decks(); d.deck = deck.slice(0, 5); d.decks[d.deckIdx] = d.deck.slice(); save(); }
export function setSlot(slot, r) {   // 덱의 slot 자리에 r 넣기 (이미 덱에 있으면 자리 맞바꿈)
  const d = load(), deck = d.deck.slice(), j = deck.indexOf(r);
  if (j >= 0) [deck[j], deck[slot]] = [deck[slot], deck[j]]; else deck[slot] = r;
  setDeck(deck);
}

// ── 오늘의 미션 ──
const POOL = [
  { id: 'wave8', kind: 'wave', goal: 8, text: '웨이브 8 도달', reward: 25 },
  { id: 'wave14', kind: 'wave', goal: 14, text: '웨이브 14 도달', reward: 50 },
  { id: 'boss3', kind: 'boss', goal: 3, text: '보스 3마리 처치', reward: 30 },
  { id: 'boss8', kind: 'boss', goal: 8, text: '보스 8마리 처치', reward: 55 },
  { id: 'kills150', kind: 'kills', goal: 150, text: '적 150마리 처치', reward: 25 },
  { id: 'kills400', kind: 'kills', goal: 400, text: '적 400마리 처치', reward: 45 },
  { id: 'pip5', kind: 'pips', goal: 5, text: '5눈 주사위 만들기', reward: 30 },
  { id: 'pip7', kind: 'pips', goal: 7, text: '7눈 각성 주사위 만들기', reward: 60 },
  { id: 'merge30', kind: 'merge', goal: 30, text: '합성 30번', reward: 25 },
  { id: 'power6', kind: 'power', goal: 6, text: '판 안 강화 6번', reward: 25 },
  { id: 'daily', kind: 'daily', goal: 1, text: '오늘의 도전 참여', reward: 30 },
  { id: 'games2', kind: 'games', goal: 2, text: '2판 플레이', reward: 15 },
  { id: 'draw3', kind: 'draw', goal: 3, text: '룬 제단에서 3번 뽑기', reward: 30 },
];
function pick(day) {
  let h = 0; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const kinds = new Set(), out = [];
  for (let i = 0; out.length < 3 && i < 60; i++) { const m = POOL[(h + i * 5) % POOL.length]; if (kinds.has(m.kind)) continue; kinds.add(m.kind); out.push({ id: m.id, prog: 0, claimed: false }); }
  return out;
}
export function missions() {
  const d = load(), day = dayKey();
  if (d.missions.date !== day) { d.missions = { date: day, list: pick(day) }; save(); }
  return d.missions.list.map(m => { const def = POOL.find(p => p.id === m.id); return { ...def, ...m, done: m.prog >= def.goal }; });
}
export function track(kind, v = 1) {
  const d = load(); missions();
  for (const m of d.missions.list) { const def = POOL.find(p => p.id === m.id); if (def.kind !== kind) continue; m.prog = ['wave', 'pips'].includes(kind) ? Math.max(m.prog, v) : m.prog + v; }
  save();
}
export function claim(id) {
  const d = load(), m = d.missions.list.find(x => x.id === id), def = POOL.find(p => p.id === id);
  if (!m || m.claimed || m.prog < def.goal) return 0;
  m.claimed = true; d.crystals += def.reward; save(); return def.reward;
}

// ── 연속 출석 ──
export function checkIn() {
  const d = load(), today = dayKey();
  if (d.streak.last === today) return null;
  d.streak.count = d.streak.last === yesterday() ? d.streak.count + 1 : 1;
  d.streak.last = today;
  const bonus = d.streak.count % 7 === 0 ? 80 : 15;
  d.crystals += bonus; save();
  return { count: d.streak.count, bonus };
}

// ── 오늘의 도전: 모두 같은 시드·같은 덱·등급 1 (공정) ──
export function dailyChallenge() {
  const day = dayKey(); let h = 7; for (const ch of day) h = (h * 131 + ch.charCodeAt(0)) >>> 0;
  const pool = RUNE_ORDER.slice(), deck = [];
  let x = h; while (deck.length < 5) { x = (x * 1103515245 + 12345) >>> 0; const r = pool.splice(x % pool.length, 1)[0]; deck.push(r); }
  const d = load(); if (d.daily.date !== day) { d.daily = { date: day, best: 0, tries: 0 }; save(); }
  return { day, seed: h, deck, best: d.daily.best, tries: d.daily.tries };
}

// ── 아케이드 ──
export const ARCADE = {
  rush: { name: '보스 러시', en: 'BOSS RUSH', desc: '보스만 연달아 몰려와요 · 보스를 몇 마리 잡을까', unit: '보스' },
  arena: { name: '랜덤 아레나', en: 'RANDOM ARENA', desc: '룬 하나로 시작 · 3웨이브마다 셋 중 하나를 골라 덱을 쌓아요', unit: '웨이브' },
  mono: { name: '단일 룬 시련', en: 'MONO TRIAL', desc: '한 가지 룬만으로 버텨요 · 아직 없는 룬도 써 볼 수 있어요', unit: '웨이브' },
  abyss: { name: '심연 광산', en: 'ABYSS MINE', desc: '웨이브 10부터 시작 · 하루 3번 · 깊이 갈수록 수정이 많아요', unit: '웨이브' },
};
export const ABYSS_TRIES = 3;
export function abyssLeft() { const d = load(), day = dayKey(); if (d.abyss.date !== day) { d.abyss = { date: day, tries: 0, extra: 0 }; save(); } return ABYSS_TRIES + (d.abyss.extra || 0) - d.abyss.tries; }   /* extra: 골드로 산 '한 번 더' (그날만) */
export function useAbyss() { if (abyssLeft() <= 0) return false; const d = load(); d.abyss.tries++; save(); return true; }
export const isArcade = m => !!ARCADE[m];
export function pickChoices(n = 3, exclude = []) {   // 아레나·시련 선택지: 모든 룬 중 무작위 (없는 룬도)
  const pool = RUNE_ORDER.filter(r => !exclude.includes(r)), out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

// 한 판 결과 반영 → 받은 수정 · 새 해금 · 기록 갱신 여부
export function finishRun(r, mode) {
  const d = load(), prev = d.best;
  const arc = isArcade(mode), score = mode === 'rush' ? r.bossKills : r.wave;
  const crystals = mode === 'rush' ? r.bossKills * 9 : mode === 'abyss' ? (r.wave - 9) * 8 + r.bossKills * 6 : r.wave * 3 + r.bossKills * 6 + (mode === 'daily' ? 20 : 0);
  const prevArc = d.arcade[mode] || 0; if (arc && score > prevArc) d.arcade[mode] = score;
  const fame = (mode === 'abyss' ? r.wave - 9 : r.wave) * 10 + r.bossKills * 8 + (mode === 'daily' ? 30 : 0); d.fame += fame;
  d.crystals += crystals; d.plays++; d.kills += r.kills; d.bossKills += r.bossKills;
  if (mode === 'daily') { d.daily.best = Math.max(d.daily.best, r.wave); d.daily.tries++; }
  else if (!arc && r.wave > d.best) d.best = r.wave;
  if (mode === 'run' && !r.items && r.deck && d.lastPred && d.lastPred.key === r.deck.slice().sort().join()) { d.calib = [...(d.calib || []), r.wave - d.lastPred.median].slice(-6); }
  save();
  track('games'); track('wave', r.wave); track('kills', r.kills); track('boss', r.bossKills); track('pips', r.maxPips); track('merge', r.merges); track('power', r.powers);
  if (mode === 'daily') track('daily');
  const ms = checkUnlocks();
  return { crystals, fame, score, newBest: arc ? score > prevArc : mode !== 'daily' && r.wave > prev, keys: ms.keys, msCrystals: ms.crystals, msWaves: ms.waves };
}

// ── 모드별 첫 실행 안내 (한 장 · 한 번 보면 다시 안 뜸 · 설정 › 도움말에서 다시 보기) — 저장 tips['g_' + 모드] ──
export const GUIDE = {
  run: { name: '메인 원정', en: 'MAIN EXPEDITION', what: '끝없이 몰려오는 웨이브를 막아 최고 기록을 세워요', reward: '수정 · 명성(미션 보상) · 웨이브 5·10·15… 이정표마다 열쇠와 수정', tip: '판이 차기 전에 같은 룬 · 같은 눈끼리 합성하고, 많이 깔린 룬부터 강화해요' },
  daily: { name: '오늘의 도전', en: 'DAILY CHALLENGE', what: '오늘 하루 모두가 같은 덱 · 같은 적으로 겨뤄요 (등급 보너스 없음)', reward: '수정 +20 보너스 · 명성 +30 보너스 · 오늘의 미션', tip: '덱이 매일 바뀌어요 · 조합(덱 조합 보너스)을 먼저 살펴보세요' },
  rush: { name: '보스 러시', en: 'BOSS RUSH', what: '일반 적 없이 보스만 연달아 와요 · 시작 SP 300', reward: '잡은 보스마다 수정 9 · 명성', tip: '강철 · 저격처럼 보스에 강한 룬을 덱에 넣어 보세요' },
  arena: { name: '랜덤 아레나', en: 'RANDOM ARENA', what: '룬 하나로 시작 · 3웨이브마다 셋 중 하나를 골라 덱을 쌓아요', reward: '웨이브만큼 수정 · 명성', tip: '아직 없는 룬도 나와요 · 조합이 맞는 룬을 고르면 훨씬 세져요' },
  mono: { name: '단일 룬 시련', en: 'MONO TRIAL', what: '한 가지 룬만으로 끝까지 버텨요', reward: '웨이브만큼 수정 · 명성', tip: '모두 같은 룬이라 합성이 쉬워요 · 그 룬 강화를 아끼지 마세요' },
  abyss: { name: '심연 광산', en: 'ABYSS MINE', what: '웨이브 10부터 시작 · 주사위 12개를 깔고 출발해요 · 하루 3번', reward: '깊이 갈수록 수정이 많아요 (웨이브 10 넘긴 만큼)', tip: '시작 SP 가 넉넉해요 · 처음에 강화부터 올리면 오래 버텨요' },
};
export const guideSeen = mode => !GUIDE[mode] || !!load().tips['g_' + mode];
export function markGuide(mode) { const d = load(); if (!d.tips['g_' + mode]) { d.tips['g_' + mode] = 1; save(); } }
