// 진행·재방문 장치: 연속 출석 · 오늘의 미션 · 어드벤처 시즌(주간 96레벨 그림) · 블록 스킨 · 기록
import { load, save } from './save.js?v=0.99.16';
import { seasonInfo, SEASON_LEVELS } from './core/levels.js?v=0.99.16';
import * as H from './core/help.js?v=0.99.16';

export const PICS = 10;   // 주간 그림 수 (assets season_0~9, 주마다 돌아감)
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };

// ── 블록 스킨 (별 조각으로 해금) ──
export const SKINS = [
  { id: 'jewel', name: '주얼', cost: 0, desc: '선명한 보석 블록' },
  { id: 'glass', name: '글래스', cost: 120, desc: '투명하게 빛나는 유리' },
  { id: 'neon', name: '네온', cost: 240, desc: '어둠 속에 빛나는 선' },
  { id: 'matte', name: '매트', cost: 360, desc: '차분한 무광 세라믹' },
  { id: 'gold', name: '골드', cost: 800, desc: '모든 블록이 금빛으로' },
  /* 원어데이 전용 (밖에서는 숨김): owner = 소장하면 무료 · sku = 골드 상품 (서버 SHOP.blocks.skin) */
  { id: 'aurora', name: '오로라', cost: 0, owner: true, desc: '밤하늘에 번지는 빛' },
  { id: 'prism', name: '프리즘', cost: 0, sku: 'skin', desc: '빛을 일곱 갈래로 쪼개는 크리스탈' },
];

// ── 오늘의 미션 (매일 3개) ──
const POOL = [
  { id: 'lines20', kind: 'lines', goal: 20, text: '줄 20개 지우기', reward: 20 },
  { id: 'lines50', kind: 'lines', goal: 50, text: '줄 50개 지우기', reward: 40 },
  { id: 'combo5', kind: 'combo', goal: 5, text: '콤보 5 달성하기', reward: 25 },
  { id: 'combo10', kind: 'combo', goal: 10, text: '콤보 10 달성하기', reward: 45 },
  { id: 'multi3', kind: 'multi', goal: 3, text: '한 번에 3줄 지우기', reward: 30 },
  { id: 'score3k', kind: 'score', goal: 3000, text: '클래식 한 판 3,000점', reward: 25 },
  { id: 'score8k', kind: 'score', goal: 8000, text: '클래식 한 판 8,000점', reward: 45 },
  { id: 'adv3', kind: 'adv', goal: 3, text: '어드벤처 3레벨 깨기', reward: 35 },
  { id: 'adv6', kind: 'adv', goal: 6, text: '어드벤처 6레벨 깨기', reward: 60 },
  { id: 'gems30', kind: 'gems', goal: 30, text: '보석 30개 모으기', reward: 30 },
  { id: 'clear1', kind: 'allclear', goal: 1, text: '판 전체 비우기 1번', reward: 50 },
  { id: 'games3', kind: 'games', goal: 3, text: '3판 플레이하기', reward: 15 },
];
function pickMissions(day) {
  let h = 0; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const kinds = new Set(), out = [];
  for (let i = 0; out.length < 3 && i < 50; i++) { const m = POOL[(h + i * 7) % POOL.length]; if (kinds.has(m.kind)) continue; kinds.add(m.kind); out.push({ id: m.id, prog: 0, claimed: false }); }
  return out;
}
export function missions() {
  const d = load(), day = dayKey();
  if (d.missions.date !== day) { d.missions = { date: day, list: pickMissions(day) }; save(); }
  return d.missions.list.map(m => { const def = POOL.find(p => p.id === m.id); return { ...def, ...m, done: m.prog >= def.goal }; });
}
// 진행 기록: 누적형(lines·adv·gems·games·allclear)은 더하고, 최고형(combo·multi·score)은 최댓값 — 오늘 · 이번 주 미션 함께
const BEST_KIND = ['combo', 'multi', 'score'];
export function track(kind, v = 1) {
  const d = load(); missions(); weekly();
  let newly = 0;
  const upd = (list, pool) => { for (const m of list) { const def = pool.find(p => p.id === m.id); if (!def || def.kind !== kind) continue; const before = m.prog >= def.goal; m.prog = BEST_KIND.includes(kind) ? Math.max(m.prog, v) : m.prog + v; if (!before && m.prog >= def.goal) newly++; } };
  upd(d.missions.list, POOL); upd(d.week.list, WPOOL);
  if (kind === 'adv') d.advTotal = (d.advTotal || 0) + v;
  save();
  return newly;
}

// ── 이번 주 미션 (QA 시트 #4 · 2026-11-09): 월요일마다 5개 · 오늘의 미션보다 크고 보상도 큼 · 5개 모두 받으면 주간 상자 ──
const WPOOL = [
  { id: 'w_lines150', kind: 'lines', goal: 150, text: '줄 150개 지우기', reward: 80 },
  { id: 'w_lines300', kind: 'lines', goal: 300, text: '줄 300개 지우기', reward: 120 },
  { id: 'w_games10', kind: 'games', goal: 10, text: '10판 플레이하기', reward: 60 },
  { id: 'w_adv12', kind: 'adv', goal: 12, text: '어드벤처 12레벨 깨기', reward: 120 },
  { id: 'w_clear3', kind: 'allclear', goal: 3, text: '판 전체 비우기 3번', reward: 100 },
  { id: 'w_combo12', kind: 'combo', goal: 12, text: '콤보 12 달성하기', reward: 80 },
  { id: 'w_score15k', kind: 'score', goal: 15000, text: '클래식 한 판 15,000점', reward: 100 },
  { id: 'w_gems80', kind: 'gems', goal: 80, text: '보석 80개 모으기', reward: 80 },
  { id: 'w_multi4', kind: 'multi', goal: 4, text: '한 번에 4줄 지우기', reward: 90 },
];
export const WEEK_CHEST = 150;
export const weekKey = (t = new Date()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayKey(d); };
export function weekly() {
  const d = load(), wk = weekKey();
  if (!d.week || d.week.key !== wk) {
    let h = 7; for (const ch of wk) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
    const kinds = new Set(), list = [];
    for (let i = 0; list.length < 5 && i < 60; i++) { const m = WPOOL[(h + i * 5) % WPOOL.length]; if (kinds.has(m.kind)) continue; kinds.add(m.kind); list.push({ id: m.id, prog: 0, claimed: false }); }
    d.week = { key: wk, list, chest: false }; save();
  }
  return d.week.list.map(m => { const def = WPOOL.find(p => p.id === m.id); return { ...def, ...m, done: m.prog >= def.goal }; });
}
export const weekDaysLeft = () => { const n = new Date(), k = (n.getDay() + 6) % 7; return 7 - k; };
export function claimWeek(id) {
  const d = load(); weekly(); const m = d.week.list.find(x => x.id === id), def = WPOOL.find(p => p.id === id);
  if (!m || m.claimed || m.prog < def.goal) return 0;
  m.claimed = true; d.stars += def.reward; save(); return def.reward;
}
export const chestReady = () => { const d = load(); weekly(); return !d.week.chest && d.week.list.every(m => m.claimed); };
export function claimChest() { if (!chestReady()) return 0; const d = load(); d.week.chest = true; d.stars += WEEK_CHEST; save(); return WEEK_CHEST; }

// ── 누적 업적 (QA 시트 #4): 평생 기록이 단계마다 별 조각 — 언제 와도 받을 게 남아 있게 (단계가 오를수록 보상 ↑) ──
export const ACH = [
  { id: 'lines', name: '줄 지우기', unit: '줄', steps: [100, 500, 1500, 4000, 10000], reward: [20, 50, 100, 200, 400], val: d => d.lines },
  { id: 'plays', name: '플레이', unit: '판', steps: [10, 50, 150, 400, 1000], reward: [20, 50, 100, 200, 400], val: d => d.plays },
  { id: 'clears', name: '판 전체 비우기', unit: '번', steps: [1, 5, 20, 50, 120], reward: [20, 50, 100, 200, 400], val: d => d.allClears || 0 },
  { id: 'best', name: '클래식 최고 기록', unit: '점', steps: [3000, 10000, 25000, 50000, 100000], reward: [20, 50, 100, 200, 400], val: d => d.best },
  { id: 'adv', name: '어드벤처 레벨', unit: '레벨', steps: [10, 40, 96, 250, 500], reward: [20, 50, 100, 200, 400], val: d => d.advTotal || 0 },
  { id: 'combo', name: '최고 콤보', unit: '콤보', steps: [5, 10, 15, 20, 30], reward: [20, 50, 100, 200, 400], val: d => d.bestCombo },
];
export function achList() {
  const d = load(), got = d.ach || {};
  return ACH.map(a => { const k = got[a.id] || 0, v = a.val(d), done = k >= a.steps.length; return { ...a, k, v, done, goal: done ? a.steps[a.steps.length - 1] : a.steps[k], reward: done ? 0 : a.reward[k], ready: !done && v >= a.steps[k] }; });
}
export function claimAch(id) {
  const d = load(), a = achList().find(x => x.id === id); if (!a || !a.ready) return 0;
  d.ach = d.ach || {}; d.ach[id] = a.k + 1; d.stars += a.reward; save(); return a.reward;
}
// 홈 미션 버튼 빨간 점: 오늘 · 이번 주 · 상자 · 업적 중 받을 것
export const anyClaim = () => unclaimed() || weekly().some(m => m.done && !m.claimed) || chestReady() || achList().some(a => a.ready);

// ── 신기록 보너스 (QA 시트 #5): 갱신 폭에 비례 · 200점마다 별 1 (최소 2 · 최대 50) ──
export const bestBonus = (score, prev) => (score > prev && score > 0 ? Math.min(50, Math.max(2, Math.round((score - prev) / 200))) : 0);
export function claim(id) {
  const d = load(), m = d.missions.list.find(x => x.id === id), def = POOL.find(p => p.id === id);
  if (!m || m.claimed || m.prog < def.goal) return 0;
  m.claimed = true; d.stars += def.reward; save(); return def.reward;
}
export const unclaimed = () => missions().some(m => m.done && !m.claimed);

// ── 연속 출석: 오늘 처음 들어오면 +1 (어제 안 했으면 1부터), 7일마다 보너스 ──
export function checkIn() {
  const d = load(), today = dayKey();
  if (d.streak.last === today) return null;
  d.streak.count = d.streak.last === yesterday() ? d.streak.count + 1 : 1;
  d.streak.last = today;
  const bonus = d.streak.count % 7 === 0 ? 70 : 10;
  d.stars += bonus; save();
  return { count: d.streak.count, bonus };
}

// ── 어드벤처 시즌: 주마다 새 그림 96칸, 레벨을 깰 때마다 한 칸씩 드러남 ──
export function adv() {
  const d = load(), si = seasonInfo();
  if (d.adv.season !== si.season) {
    // 지난 시즌 기록 보관 (그림 갤러리 · 트로피)
    if (d.adv.season >= 0 && d.adv.cleared > 0) d.gallery.push({ season: d.adv.season, cleared: d.adv.cleared, trophy: d.adv.cleared >= SEASON_LEVELS });
    d.adv = { season: si.season, cleared: 0, winStreak: 0 };
    save();
  }
  return { ...d.adv, ...si, picture: `season_${si.season % PICS}` };
}
export function advWin() { const d = load(); adv(); d.adv.cleared = Math.min(SEASON_LEVELS, d.adv.cleared + 1); d.adv.winStreak++; if (d.adv.cleared >= SEASON_LEVELS && !d.adv.trophy) { d.adv.trophy = true; d.trophies++; } save(); return d.adv; }
export function advLose() { const d = load(); adv(); d.adv.winStreak = 0; save(); }

// ── 응원 선물 (연속 실패 · core/help.js 규칙) — 예전 '구원 모드'(몰래 좋은 조각)는 2026-10-28 공개 선물로 바꿈 ──
export function helpState() { const d = load(); if (!d.help || !d.help.adv) d.help = H.freshHelp(); return d.help; }
export function helpNoteClassic(score, moves, prevBest) { const d = load(); H.noteClassic(helpState(), score, moves, prevBest, d.plays); save(); }
export function helpNoteAdv(n, won, moves) { H.noteAdv(helpState(), n, won, moves); save(); }
export function helpGiftNow(st) { const g = H.helpGift(helpState(), st, dayKey()); save(); return g; }
export function helpShown(st) { H.markShown(helpState(), st); save(); }
