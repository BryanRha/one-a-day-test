// 진행 · 재방문: 계급(경험치) · 캠페인 별 · 지휘관 해금 · 연속 출석 · 오늘의 미션 · 오늘의 작전
import { load, save } from './save.js?v=0.99.101';
import { MAPS, WAR } from './core/maps.js?v=0.99.101';
import { JOINS } from './story.js?v=0.99.101';

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };

// ── 계급 (워스토리처럼 이병부터 대장까지) ──
export const RANKS = ['이병', '일병', '상병', '병장', '하사', '중사', '상사', '소위', '중위', '대위', '소령', '중령', '대령', '준장', '소장', '중장', '대장'];
export const rankNeed = k => Math.round(60 * Math.pow(k, 1.45));    // k → k+1 에 필요한 경험치
export function rank() {
  const d = load(); let k = 0, rest = d.xp;
  while (k < RANKS.length - 1 && rest >= rankNeed(k + 1)) { rest -= rankNeed(k + 1); k++; }
  return { k, name: RANKS[k], into: rest, need: k < RANKS.length - 1 ? rankNeed(k + 1) : 1 };
}
export function addXp(n) { const before = rank().k; load().xp += n; save(); const after = rank().k; return after > before ? RANKS[after] : null; }

// ── 캠페인 ──
export const STAGES = MAPS.map((m, i) => ({ ...m, n: i + 1, ai: ['easy', 'easy', 'normal', 'normal', 'hard', 'normal', 'normal', 'normal', 'normal', 'normal', 'hard', 'hard', 'normal', 'normal', 'hard', 'normal', 'normal', 'normal', 'hard', 'normal', 'hard', 'normal', 'hard', 'hard', 'hard'][i] || 'hard', unlockCo: JOINS[m.id] }));
export const stageOpen = i => i === 0 || (load().stars[STAGES[i - 1].id] || 0) > 0;
export const totalStars = () => Object.values(load().stars).reduce((a, b) => a + b, 0);
// 별: 승리 1 · 기준 일수 안 1 · 잃은 유닛 (기준 일수/4)기 이하 1 — 뒤 작전일수록 손실 허용이 조금 늘어남
export const lossCap = par => Math.ceil(par / 4);
export function starsOf(r, par) { if (!r.win) return 0; return 1 + (r.day <= par ? 1 : 0) + (r.lost <= lossCap(par) ? 1 : 0); }

// ── 오늘의 작전: 모두 같은 지도 · 어려움 AI · 가장 빨리 이긴 날 기록 ──
export function dailyOp() {
  const day = dayKey(); let h = 11; for (const ch of day) h = (h * 131 + ch.charCodeAt(0)) >>> 0;
  const d = load(); if (d.daily.date !== day) { d.daily = { date: day, best: 0, tries: 0, won: false }; save(); }
  return { day, map: MAPS[h % MAPS.length], best: d.daily.best, tries: d.daily.tries, won: d.daily.won };
}

// ── 연속 출석 ──
export function checkIn() {
  const d = load(), today = dayKey();
  if (d.streak.last === today) return null;
  d.streak.count = d.streak.last === yesterday() ? d.streak.count + 1 : 1;
  d.streak.last = today;
  const bonus = d.streak.count % 7 === 0 ? 3 : 1;
  d.medals += bonus; save();
  return { count: d.streak.count, bonus };
}

// ── 오늘의 미션 ──
const POOL = [
  { id: 'win1', kind: 'win', goal: 1, text: '전투 1번 승리', reward: 2 },
  { id: 'win2', kind: 'win', goal: 2, text: '전투 2번 승리', reward: 3 },
  { id: 'cap5', kind: 'capture', goal: 5, text: '건물 5곳 점령', reward: 2 },
  { id: 'cap10', kind: 'capture', goal: 10, text: '건물 10곳 점령', reward: 3 },
  { id: 'kill8', kind: 'kill', goal: 8, text: '적 유닛 8기 격파', reward: 2 },
  { id: 'kill20', kind: 'kill', goal: 20, text: '적 유닛 20기 격파', reward: 3 },
  { id: 'build6', kind: 'build', goal: 6, text: '유닛 6기 생산', reward: 2 },
  { id: 'power1', kind: 'power', goal: 1, text: '지휘관 필살기 1번', reward: 2 },
  { id: 'star3', kind: 'stars3', goal: 1, text: '별 3개로 승리', reward: 3 },
  { id: 'daily', kind: 'daily', goal: 1, text: '특수 작전 참여', reward: 2 },
];
function pick(day) {
  let h = 0; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const kinds = new Set(), out = [];
  for (let i = 0; out.length < 3 && i < 60; i++) { const m = POOL[(h + i * 7) % POOL.length]; if (kinds.has(m.kind)) continue; kinds.add(m.kind); out.push({ id: m.id, prog: 0, claimed: false }); }
  return out;
}
export function missions() {
  const d = load(), day = dayKey();
  if (d.missions.date !== day) { d.missions = { date: day, list: pick(day) }; save(); }
  return d.missions.list.map(m => { const def = POOL.find(p => p.id === m.id); return { ...def, ...m, done: m.prog >= def.goal }; });
}
export function track(kind, v = 1) {
  const d = load(); missions();
  for (const m of d.missions.list) { const def = POOL.find(p => p.id === m.id); if (def.kind === kind) m.prog += v; }
  save();
}
export function claim(id) {
  const d = load(), m = d.missions.list.find(x => x.id === id), def = POOL.find(p => p.id === id);
  if (!m || m.claimed || m.prog < def.goal) return 0;
  m.claimed = true; d.medals += def.reward; d.xp += 20; save(); return def.reward;
}
export const unclaimed = () => missions().some(m => m.done && !m.claimed);

// ── 전쟁실: 속도 · 전력 · 기술 (각 100점) → S~D (원작 점수 방식을 단순화) ──
export { WAR };
const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
export const warRank = t => (t >= 270 ? 'S' : t >= 230 ? 'A' : t >= 180 ? 'B' : t >= 130 ? 'C' : 'D');
export function warScore(r, par) {
  const speed = clamp(200 - r.day * 100 / par);                                   // 기준 일수 안이면 100
  const d1 = r.dealt ? r.dealt[1] : 0, d2 = r.dealt ? r.dealt[2] : 0;
  const power = clamp((d1 / Math.max(1, d1 + d2)) * 150 - 25);                    // 준 피해 비율
  const tech = clamp(100 - r.lost * 100 / Math.max(6, (r.units0 || 4) + r.built)); // 잃은 유닛 비율
  const total = speed + power + tech;
  return { speed, power, tech, total, rank: warRank(total) };
}
export const warBest = id => load().war[id] || null;

// ── 주간 작전 (공통 랭킹 'war:week' · 2026-11-27): 한 주 동안 모두 같은 전쟁실 지도 · 같은 지휘관(빌려 줌) · 교대 · 보급품 · 되돌리기 없음
//    어려움 AI 는 흔들림(noise) 0 이라 같은 수를 두면 같은 결과 → 실력만 드러나는 '같은 편성' 판
//    점수 = 전쟁실 세 칸 × 10 · 속도만 위를 열어 둠(기준 일수보다 하루 빠를수록 +1000/기준일) → 적은 턴이 가장 큰 차이
export const WEEK_BOARD = 'war:week';
/* 한 주 = KST 월 0시 ~ 일 24시 (서버 gold.js weekOf 와 같은 주) */
export const weekIdx = (ms = Date.now()) => Math.floor((ms + 9 * 3600e3 - 4 * 864e5) / (7 * 864e5));
export const WEEK0 = 2968;   /* 2026-W48 (11-23 월) = 전쟁실 1 · 엘라부터 */
export const weekKey = (ms = Date.now()) => { const d = new Date(ms + 9 * 3600e3); d.setUTCHours(0, 0, 0, 0); const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day); const y = d.getUTCFullYear(); const w = Math.ceil(((d - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7); return `${y}-W${String(w).padStart(2, '0')}`; };
/* 지도마다 빌려 줄 지휘관 차례 (tools/week_bot.mjs 로 어려움 AI 가 이기는 조합만 · 적 지휘관과 겹치지 않음) */
export const WEEK_COS = {
  w1: ['ella', 'jun', 'marin', 'sora', 'doo', 'iris', 'yuki', 'hana', 'leon', 'kai', 'bas', 'sera', 'titan', 'terra', 'scarlet'],
  w2: ['ella', 'marin', 'sora', 'doo', 'iris', 'yuki', 'hana', 'leon', 'kai', 'bas', 'sera', 'titan', 'terra', 'scarlet'],
  w3: ['viktor', 'jun', 'marin', 'sora', 'doo', 'hana', 'kai', 'bas', 'sera', 'titan', 'terra', 'scarlet'],
  w4: ['ella', 'viktor', 'jun', 'sora', 'doo', 'iris', 'yuki', 'hana', 'leon', 'kai', 'bas', 'sera', 'titan', 'terra', 'scarlet'],
  w5: ['ella', 'viktor', 'jun', 'marin', 'doo', 'iris', 'yuki', 'hana', 'leon', 'kai', 'bas', 'sera', 'titan', 'terra', 'scarlet'],
  w6: ['ella', 'viktor', 'jun', 'marin', 'sora', 'doo', 'iris', 'hana', 'leon', 'kai', 'bas', 'sera', 'titan', 'terra'],
  w7: ['ella', 'viktor', 'jun', 'marin', 'sora', 'doo', 'iris', 'hana', 'leon', 'kai', 'bas', 'sera', 'titan', 'scarlet'],
  w8: ['ella', 'jun', 'marin', 'sora', 'doo', 'iris', 'yuki', 'hana', 'leon', 'kai', 'bas', 'sera', 'titan', 'terra', 'scarlet'],
  w9: ['ella', 'viktor', 'jun', 'sora', 'doo', 'iris', 'yuki', 'hana', 'leon', 'kai', 'bas', 'sera', 'titan', 'terra', 'scarlet'],
  w10: ['ella', 'viktor', 'jun', 'marin', 'sora', 'doo', 'iris', 'yuki', 'hana', 'leon', 'bas', 'sera', 'titan', 'terra', 'scarlet'],
  w11: ['ella', 'viktor', 'jun', 'marin', 'doo', 'iris', 'yuki', 'hana', 'leon', 'kai', 'bas', 'sera', 'titan', 'terra', 'scarlet'],
  w12: ['ella', 'viktor', 'jun', 'marin', 'sora', 'doo', 'iris', 'yuki', 'hana', 'leon', 'kai', 'sera', 'titan', 'terra', 'scarlet'],
  w13: ['ella', 'viktor', 'jun', 'marin', 'sora', 'doo', 'iris', 'yuki', 'hana', 'leon', 'kai', 'bas', 'sera', 'terra', 'scarlet'],
  w14: ['ella', 'viktor', 'jun', 'marin', 'sora', 'doo', 'iris', 'yuki', 'hana', 'leon', 'kai', 'bas', 'titan', 'terra', 'scarlet'],
  w15: ['ella', 'jun', 'sora', 'doo', 'iris', 'yuki', 'hana', 'leon', 'kai', 'bas', 'sera', 'titan', 'terra'],
};
export function weekOp(ms = Date.now()) {
  const k = weekIdx(ms), i = k - WEEK0, n = WAR.length, map = WAR[((i % n) + n) % n], pool = WEEK_COS[map.id], co = pool[(((i * 7 + Math.floor(i / n)) % pool.length) + pool.length) % pool.length];   /* 주마다 지휘관도 바뀜 */
  const d = load(), key = weekKey(ms); if (!d.week || d.week.key !== key) { d.week = { key, best: 0, tries: 0, day: 0 }; save(); }
  return { key, map, co, best: d.week.best, tries: d.week.tries, day: d.week.day, ends: (k + 1) * 7 * 864e5 + 4 * 864e5 - 9 * 3600e3 };
}
export function weekScore(r, par) {
  const d1 = r.dealt ? r.dealt[1] : 0, d2 = r.dealt ? r.dealt[2] : 0;
  const speed = Math.max(0, Math.round((200 - r.day * 100 / par) * 10));
  const power = Math.max(0, Math.min(1000, Math.round(((d1 / Math.max(1, d1 + d2)) * 150 - 25) * 10)));
  const tech = Math.max(0, Math.min(1000, Math.round((100 - r.lost * 100 / Math.max(6, (r.units0 || 4) + r.built)) * 10)));
  return { speed, power, tech, total: Math.max(1, speed + power + tech) };
}

// ── 전투 결과 반영 ──
// r: { mode, mapId, win, day, lost, kills, captures, built, powers, co }
export function finish(r) {
  const d = load(), st = STAGES.find(s => s.id === r.mapId);
  d.battles++; if (r.win) d.wins++; d.kills += r.kills; d.captures += r.captures;
  let stars = 0, newStars = 0, unlocked = null;
  if (r.mode === 'campaign' && st) {
    stars = starsOf(r, st.par); if (r.auto) stars = Math.min(stars, 1);   /* 자동 작전은 승리 별만 */
    const prev = d.stars[st.id] || 0;
    if (stars > prev) { newStars = stars - prev; d.stars[st.id] = stars; }
    if (r.win && st.unlockCo && !d.cos[st.unlockCo]) { d.cos[st.unlockCo] = 1; unlocked = st.unlockCo; }
    if (r.win && (!d.bestDays[st.id] || r.day < d.bestDays[st.id])) d.bestDays[st.id] = r.day;
  }
  let war = null, warPrev = null;
  if (r.mode === 'war') { const m = WAR.find(x => x.id === r.mapId); warPrev = d.war[r.mapId] || null; if (r.win && m) { war = warScore(r, m.par); if (!warPrev || war.total > warPrev.total) d.war[r.mapId] = { ...war, day: r.day, co: r.co }; } }
  let week = null;
  if (r.mode === 'war' && r.week && r.week.key === weekKey()) { const m = WAR.find(x => x.id === r.mapId); weekOp(); d.week.tries++; if (r.win && m) { week = weekScore(r, m.par); week.prev = d.week.best; if (week.total > d.week.best) { d.week.best = week.total; d.week.day = r.day; } } }
  if (r.mode === 'daily') { d.daily.tries++; if (r.win && (!d.daily.best || r.day < d.daily.best)) d.daily.best = r.day; if (r.win) d.daily.won = true; }
  d.coXp[r.co] = (d.coXp[r.co] || 0) + (r.win ? 30 : 10);
  const xp = 20 + (r.win ? 50 : 0) + newStars * 30 + r.kills * 3 + r.captures * 2 + (war ? Math.round(war.total / 6) : 0);
  save();
  const up = addXp(xp);
  track('win', r.win ? 1 : 0); track('capture', r.captures); track('kill', r.kills); track('build', r.built); track('power', r.powers);
  if (stars === 3) track('stars3'); if (r.mode === 'daily') track('daily');
  return { stars, newStars, unlocked, xp, rankUp: up, war, warPrev, weekRes: week };
}
export const coLevel = co => 1 + Math.floor(Math.sqrt((load().coXp[co] || 0) / 40));
