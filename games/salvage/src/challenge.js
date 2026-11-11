// 주간 도전 (M5-B · v0.8) — 로그라이크 변주 · 모두 같은 seed · 내 기록 · 물결 표 보상 (DOM 없음 → node 시험 test_m5b.mjs 가 같은 함수)
//  한 주 = 월요일 시작(한국 날짜 · threat.weekOf) · 도전 번호 #N = 그 주 - CH.epoch 주 + 1
//  weekly(N) → 그 주 판의 전부(지도 · seed · 날씨 · 위협 Lv · 규칙 3 · 지급 장비) — 주 번호만으로 정해짐(내 저장과 상관없음) = 모두 같은 판
//  순위표: 지금 서버에 랭킹 표가 없음 → 내 기록(주마다 최고 점수 · 메달)만. 나중에 붙일 자리 = BOARD.submit / BOARD.fetch (null 이면 화면에 '곧 열려요')
import { CH, CH_RULES, CH_RULE_KEYS, TITLES } from './data/m5b.js?v=0.99.21';
import { WEAPONS, FACILITIES, FAC_KEYS, freshMods, MAPS, ENEMIES, GEAR } from './data.js?v=0.99.21';
import { loadout, kstDay } from './econ.js?v=0.99.21';
import { rng } from './plan.js?v=0.99.21';
import { threatOf, weekOf, dayNum } from './threat.js?v=0.99.21';
import { forecast } from './data/weather.js?v=0.99.21';

export const BOARD = { submit: null, fetch: null }; /* 나중에: 원어데이 서버 주간 순위 (oad_bm submitScore/board 같은 모양 — { week, score, medal }) */

export const chalNo = (day = kstDay()) => weekOf(day) - weekOf(CH.epoch) + 1;
/* 이번 주 남은 날 (월요일 0시에 바뀜) */
export const daysLeft = (day = kstDay()) => 7 - ((dayNum(day) + 3) % 7 + 7) % 7;
const POOL = ['pistol', 'rifle', 'wrench', 'shotgun', 'rivet', 'longshot', 'diver', 'harpoon', 'volt', 'flare']; /* '무작위 장비' 뽑는 곳 — 고정 목록(무기가 늘어도 지난 주 판이 안 바뀌게) */
const pick = (a, R) => a[Math.floor(R() * a.length)];
const mixH = n => { let h = (n * 0x9e3779b1 + 0x7f4a7c15) >>> 0; h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; h ^= h >>> 16; return h >>> 0; };

/* 그 주 도전 판 전부 */
export function weekly(no) {
  const R = rng(mixH(no) % 999983 + 1);
  const map = CH.maps[((no - 1) % CH.maps.length + CH.maps.length) % CH.maps.length];
  const seed = 700000 + ((no * 2654435761) >>> 0) % 200000;
  /* 규칙 3 — 덕 보는 규칙(good)은 하나까지 · 같은 효과 겹치지 않게 */
  const rules = []; for (let g = 0; rules.length < 3 && g < 100; g++) { const k = pick(CH_RULE_KEYS, R); if (rules.includes(k)) continue; if (CH_RULES[k].good && rules.some(r => CH_RULES[r].good)) continue; if (rules.some(r => (CH_RULES[r].not || []).includes(k) || (CH_RULES[k].not || []).includes(r))) continue; rules.push(k); }
  const lv = pick(CH.lv, R);
  let weapons, gear;
  if (rules.includes('rnd_gear')) {
    const pool = POOL.filter(k => WEAPONS[k]); const a = pick(pool, R); let b = pick(pool, R); for (let g = 0; b === a && g < 20; g++) b = pick(pool, R);
    const mods = () => Object.fromEntries(Object.keys(freshMods()).map(m => [m, Math.floor(R() * 3)]));
    weapons = [[a, mods()], [b, mods()]]; gear = { vest: 1 + Math.floor(R() * 4), helmet: 1 + Math.floor(R() * 4), bag: 1 + Math.floor(R() * 4) };
  } else {
    const iss = CH.issue[((no - 1) % CH.issue.length + CH.issue.length) % CH.issue.length].filter(k => WEAPONS[k]);
    const m = Object.fromEntries(Object.keys(freshMods()).map(k => [k, CH.mods])); weapons = iss.map(k => [k, { ...m }]); gear = { vest: CH.kit.vest, helmet: CH.kit.helmet, bag: CH.kit.bag };
  }
  const wx = rules.includes('dark') ? 'night' : forecast(null, map, seed);
  return { no, map, seed, rules, lv, wx, weapons, gear };
}
/* 지급 장비로 만든 가짜 저장 → econ.loadout 을 그대로 씀 (무기 · 장비 계산이 평소 판과 같음) */
export function chalSave(spec) {
  const fac = Object.fromEntries(FAC_KEYS.map(k => [k, FACILITIES[k].start || 0])); for (const [k, v] of Object.entries(CH.kit.fac)) if (k in fac) fac[k] = Math.min(v, FACILITIES[k].levels.length);
  const weapons = Object.fromEntries(spec.weapons.map(([k, m]) => [k, { ...freshMods(), ...m }]));
  const gear = Object.fromEntries(Object.entries(spec.gear).map(([k, v]) => [k, Math.min(v, GEAR[k].tiers.length - 1)]));
  if (spec.rules.includes('dark')) gear.hlamp = 1;
  return { fac, weapons, equip: { main: spec.weapons[0][0], side: spec.weapons[1]?.[0] || null }, gear, meal: null, charms: { have: [], eq: [] }, diff: 'normal', ammo: {}, ammoSel: 'normal',
    mgSel: spec.rules.includes('dark') ? 'hlamp' : null, story: { codex: {} }, stash: [], quests: { done: [] }, stats: { raids: 99 }, shells: 0, mats: {} };
}
const R_ = spec => spec.rules.map(k => CH_RULES[k]).filter(Boolean);
const mulOf = (spec, f) => R_(spec).reduce((m, r) => m * (r[f] || 1), 1);
/* 판이 쓰는 숫자: 출격 장비 L · 위협 T · 소모품 */
export function chalLoadout(spec) {
  const L = loadout(chalSave(spec));
  for (const r of R_(spec)) {
    if (r.bagH) L.bag = { ...L.bag, h: Math.max(2, Math.ceil(L.bag.h * r.bagH)) };
    if (r.comfy) L.bag = { ...L.bag, comfy: Math.round(L.bag.comfy * r.comfy * 10) / 10 };
    if (r.hp) L.hp += r.hp;
    if (r.hpMul) L.hp = Math.round(L.hp * r.hpMul);
    if (r.dmg) L.weapons = L.weapons.map(w => ({ ...w, dmg: w.dmg * r.dmg }));
    if (r.loot) L.loot *= r.loot;
    if (r.glow) L.glow = true;
  }
  if (spec.rules.includes('no_heal')) L.noHeal = true;
  L.kit = 0; L.keep = 0; L.pet = null; L.safe = [1, 1]; L.chal = spec.no; /* 도전: 몽이 · 돌아올 표 · 창고 보너스 없음 */
  const kit = spec.rules.includes('no_heal') || spec.rules.includes('scrap') ? [] : Array(CH.kitMed).fill('med');
  return { L, kit };
}
export function chalThreat(spec) {
  const T = threatOf(chalSave(spec), spec.map, CH.epoch, { lv: spec.lv, week: null, ch4: false, days: 0 });
  for (const r of R_(spec)) {
    if (r.extra) for (const z of [1, 2, 3]) T.extra[z] = Math.max(T.extra[z], r.extra);
    if (r.elite) T.hp *= 1.15;
    if (r.bossEarly) T.bossEarly = r.bossEarly;
    if (r.mix) T.mix = Math.min(0.9, T.mix + r.mix);
    if (r.extra3) T.extra[3] = Math.min(1, T.extra[3] + r.extra3);
  }
  T.chal = spec.no; T.lines = [...T.lines.slice(0, 1), ...R_(spec).map(r => `${r.icon} ${r.name}`)];
  return T;
}

/* ───── 점수 · 메달 ───── */
export const bossKills = res => Object.entries(res.kills || {}).reduce((s, [k, n]) => s + (ENEMIES[k]?.boss ? n : 0), 0);
export function score(res, spec) {
  const C = CH.sc; const kills = (res.killN || 0) * C.kill * mulOf(spec, 'kill'); const zone = (res.zoneMax || 1) * C.zone;
  if (res.outcome !== 'extract') return Math.round((kills + zone) * C.fail);
  return Math.round((res.value || 0) * mulOf(spec, 'value') + kills + bossKills(res) * C.boss * mulOf(spec, 'boss') + zone + Math.max(0, res.timeLeft || 0) * C.sec);
}
export const medalOf = sc => CH.medal.filter(m => sc >= m[1]).pop() || null; /* [단계, 점수, 이름, 표시] 또는 null */
export const nextMedal = sc => CH.medal.find(m => sc < m[1]) || null;

/* ───── 저장 S.chal ─────
 *  { wk: 이번 주 번호, used: 이번 주 쓴 판, bought: 이번 주 조개로 산 판, runs: 모든 판, weeks: { [no]: { best, medal, runs } }, got: [받은 물결 표 보상 키], last }
 */
export function chal(S) {
  const c = S.chal && typeof S.chal === 'object' ? S.chal : (S.chal = {});
  c.weeks = c.weeks && typeof c.weeks === 'object' ? c.weeks : {}; c.got = Array.isArray(c.got) ? c.got : []; c.runs |= 0; c.used |= 0; c.bought |= 0;
  const no = chalNo(S.day || kstDay()); if (c.wk !== no) { c.wk = no; c.used = 0; c.bought = 0; }
  return c;
}
export const chalOpen = S => (S.stats?.raids || 0) >= CH.open.raids;
export const leftFree = S => { const c = chal(S); return Math.max(0, CH.free + c.bought - c.used); };
export const canBuy = S => chal(S).bought < CH.extra.n;
/* 판 시작할 수 있나 — nolimit(테스트 서버) 면 막지 않음 (횟수는 셈) */
export function canStart(S, nolimit) {
  if (!chalOpen(S)) return { ok: false, why: 'locked' };
  if (leftFree(S) > 0 || nolimit) return { ok: true };
  return { ok: false, why: canBuy(S) ? 'buy' : 'done' };
}
export function buyEntry(S) {
  const c = chal(S); if (c.bought >= CH.extra.n) return { ok: false, why: 'max' }; if (S.shells < CH.extra.cost) return { ok: false, why: 'cost' };
  S.shells -= CH.extra.cost; c.bought++; S.stats.spentChal = (S.stats.spentChal || 0) + CH.extra.cost; return { ok: true };
}
/* 판 시작 기록 (free = ?free 시험이면 안 셈) */
export function begin(S, { free = false } = {}) { const c = chal(S); if (!free) c.used++; return weekly(c.wk); }
export const points = S => Object.values(chal(S).weeks).reduce((s, w) => s + (w.medal || 0), 0);
export const medalMax = S => Math.max(0, ...Object.values(chal(S).weeks).map(w => w.medal || 0));
export const weeksPlayed = S => Object.values(chal(S).weeks).filter(w => (w.runs || 0) > 0).length;
/* 판 끝 → 기록 · 물결 표 보상 (꾸미기 · 칭호 키 목록 — 실제로 주는 건 ach.js grantCos/grantTitle) */
export function record(S, res, spec) {
  const c = chal(S); const sc = score(res, spec); const m = medalOf(sc);
  const w = c.weeks[spec.no] ||= { best: 0, medal: 0, runs: 0 }; const before = points(S); const prevBest = w.best;
  w.runs++; c.runs++; if (sc > w.best) w.best = sc; if (m && m[0] > (w.medal || 0)) w.medal = m[0];
  const after = points(S); const rewards = [];
  for (const [n, kind, key] of CH.track) if (after >= n && !c.got.includes(key)) { c.got.push(key); rewards.push({ n, kind, key }); }
  c.last = { no: spec.no, sc, medal: m ? m[0] : 0, out: res.outcome, at: S.day || kstDay() };
  /* 오래된 주는 26주만 남김 (저장 크기) */
  const ks = Object.keys(c.weeks).map(Number).sort((a, b) => a - b); while (ks.length > 26) delete c.weeks[ks.shift()];
  if (BOARD.submit) try { BOARD.submit({ week: spec.no, score: sc, medal: m ? m[0] : 0 }); } catch { /* 순위 서버 없음 */ }
  return { sc, medal: m, best: w.best, newBest: sc > prevBest, pts: after, ptsGain: after - before, rewards, next: nextMedal(w.best) };
}
export const titleName = k => TITLES[k]?.name || k;
export const mapName = k => MAPS[k]?.name || k;
