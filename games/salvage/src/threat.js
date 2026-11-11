// 위협 곡선 · 주간 변주 (M4-A · 검수 M3 Top 4 '2주 뒤 판이 같아짐') — 브라우저 없이도 돎(시뮬 · 시험 저장 · test_logic 이 같은 함수)
//  · threatOf(S, map, day): 오늘 위협 Lv(1~10) — 논 날 · 시설 단계 · 난이도로 오름. Lv → AI 단계 · 적 수 · 체력/피해 · 새 적 섞임 · 검은 닻 순찰 · 두목
//  · populate(P, map, T, seed): plan() 이 만든 적 목록 위에 위협을 얹음 (지도 생성 · 막힘 검사는 그대로, 같은 seed 면 같은 결과 → 봇 · 시뮬 재현)
//  · weekVar(S, day): 월요일마다 밤 → 폭풍 → 보스 주간 (논 날 7일부터) · 그 주에 맞는 판 상태는 예보 가중치로 더 자주(data/weather.js wxTable — 예보가 지도 상태를 정함)
//  · '몰래' 올리지 않음: 출격 준비 · 판 시작에 Lv 과 늘어난 것을 글로 보여 줌(ui.js)
import { ENEMIES, MAPS, CONDS, FACILITIES, FAC_KEYS, FAC_TOTAL } from './data.js?v=0.99.30';
import { THREAT_K as K, WEEKS, WEEK_CYCLE, WEEK_FROM, M4_POOL, M4_COND_BIAS } from './data/enemies.js?v=0.99.30';
import { rng, RS } from './plan.js?v=0.99.30';
import { mapOpen } from './econ.js?v=0.99.30';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lin = ([s, base, per, cap], lv) => lv < s ? 0 : Math.min(cap, base + per * (lv - s));
/* 'YYYY-MM-DD' → 1970-01-01 부터 날 수 · 그 주 번호(월요일 시작: 1970-01-01 은 목요일) */
export const dayNum = d => Math.floor(Date.parse(d + 'T00:00:00Z') / 864e5);
export const weekOf = d => Math.floor((dayNum(d) + 3) / 7);
/* 논 날 세기 — 출격한 날만 (저장 S.th = { days, last }) · main.js startRaidNow · sim 이 부름 */
export function noteDay(S, day) { const t = S.th && typeof S.th === 'object' ? S.th : (S.th = { days: 0, last: null }); if (t.last !== day) { t.last = day; t.days = (t.days || 0) + 1; } return t.days; }
export const daysOf = S => S.th?.days || 0;
export const weekNamed = k => WEEKS[k] ? { k, ...WEEKS[k], left: 7 } : null;
export function weekVar(S, day) { if (daysOf(S) < WEEK_FROM) return null; const k = WEEK_CYCLE[((weekOf(day) % 3) + 3) % 3]; return { k, ...WEEKS[k], left: 7 - ((dayNum(day) + 3) % 7 + 7) % 7 }; }
/* 밤 판 = 늘 밤인 지도(항구) · 정전처럼 처음부터 어두운 상태 · 'night' 표시가 있는 날씨(M4-B) */
export const isNight = (map, cond) => (MAPS[map]?.night || 0) >= 1 || !!CONDS[cond]?.dark || !!CONDS[cond]?.night || cond === 'night';
export const isStorm = cond => !!CONDS[cond]?.rain || (CONDS[cond]?.hear || 1) < 1 || ['storm', 'fog', 'steam', 'rapids'].includes(cond) || !!CONDS[cond]?.storm;
const facRatio = S => FAC_KEYS.reduce((s, k) => s + (S.fac?.[k] || 0) - (FACILITIES[k].start || 0), 0) / Math.max(1, FAC_TOTAL - FAC_KEYS.reduce((s, k) => s + (FACILITIES[k].start || 0), 0));

/* M6-C 떠돌이 두목 쉼: 마주친 판(S.stats.chiefRaid) 뒤 gap 판 안에는 확률 ×rest — 연달아 나오지 않게 (happen.js · sim 이 기록) */
const chiefRest = S => { const c = S.stats?.chiefRaid; return c != null && (S.stats.raids || 0) - c < (K.chief.gap || 0) ? (K.chief.rest ?? 1) : 1; };
/* 오늘 위협 */
export function threatOf(S, map, day, opt = {}) {
  const days = opt.days ?? daysOf(S); const W = opt.week === undefined ? weekVar(S, day) : opt.week;
  const raw = Math.max(1 + Math.min(days, K.dayCap) / K.dayCap * K.days + facRatio(S) * K.fac + Math.max(0, (S.pets?.mong | 0) - 2) * (K.pet || 0), K.floor && days >= K.floor[0] ? K.floor[1] : 0) + (K.diff[S.diff] || 0); /* M5-C 배우는 주(1~10일) 뒤 바닥 Lv */
  const lv = opt.lv ? clamp(opt.lv, 1, 10) : clamp(Math.round(raw), 1, 10); /* opt.lv = 시험용 고정 (?threat=N) */
  const ch4 = mapOpen(S, 'factory'); const tut = !opt.lv && (S.stats?.raids || 0) < 3; /* 첫 3판(튜토리얼)은 새 적 · 늘림 없음 */ /* 4장부터 검은 닻이 다른 지도에도 · 두목 */
  const T = { lv, raw: Math.round(raw * 10) / 10, map, ai: K.ai[lv - 1], hp: 1 + K.hp * (lv - 1), dmg: 1 + K.dmg * (lv - 1),
    extra: Object.fromEntries([1, 2, 3].map(z => [z, (([s, per, cap]) => lv < s ? 0 : Math.min(cap, per * (lv - s + 1)))(K.extra[z])])),
    mix: tut ? 0 : Math.min(K.mix[2], K.mix[0] + K.mix[1] * (lv - 1)) * (W?.mix || 1), patrol: map !== 'factory' && ch4 ? lin(K.patrol, lv) : 0, signal: lv >= K.signalLv,
    chiefN: ch4 && lv >= K.chief.minLv ? Math.min(K.chief.cap ?? 1, (K.chief.night[0] + K.chief.night[1] * lv) * (W?.chief || 1)) * chiefRest(S) : 0, chiefD: ch4 && lv >= K.chief.minLv ? (W?.chiefDay || 0) * chiefRest(S) : 0,
    week: W ? W.k : null, bossEarly: W?.bossEarly || 0, bossLoot: W?.bossLoot || 0, days, chiefAt: opt.chiefAt || 0 };
  if (W?.extra3) T.extra[3] = Math.min(0.8, T.extra[3] + W.extra3); /* 보스 주간: 깊은 곳 호위 */
  if (W?.extra2 && !ch4) T.extra[2] = Math.min(0.7, T.extra[2] + W.extra2); /* M4 마무리: 보스 주간 가운데 구역도 — 두목이 없는 4장 전만 (시뮬 탈출률 85~92% 맞춤) */
  if (opt.ch4 != null && !opt.ch4) { T.patrol = 0; T.chiefN = T.chiefD = 0; }
  T.lines = lines(T); return T;
}
/* 판 시작 · 출격 준비 글 (무엇이 늘었는지 — 숫자는 Lv 하나만) */
function lines(T) {
  const o = [];
  if (T.ai >= 2) o.push(T.ai >= 3 ? '엄폐를 옮기며 끼고 들고, 숨으면 수류탄을 던져요' : '무리가 양쪽으로 끼고 들고, 다치면 도움을 불러요');
  if (T.extra[2] > 0.15) o.push('깊은 방에 적이 더 있어요');
  if (T.mix > 0.2) o.push('새 적이 자주 섞여요');
  if (T.patrol > 0) o.push('검은 닻 순찰대가 다녀요');
  return o;
}
/* 두목이 나오는 판인가 (seed 로 정함 → 시뮬 · 봇 같음) */
export function chiefRoll(T, seed, map, cond) { if (T.chiefAt) return { at: T.chiefAt }; const p = isNight(map, cond) ? T.chiefN : T.chiefD; if (!(p > 0)) return null; const R = rng(seed * 17 + 11); if (R() >= p) return null; return { at: K.chiefAt[0] + R() * (K.chiefAt[1] - K.chiefAt[0]) }; }

const wpick = (w, R) => { const tot = Object.values(w).reduce((a, b) => a + b, 0); let r = R() * tot; for (const [k, v] of Object.entries(w)) { r -= v; if (r <= 0) return k; } return Object.keys(w)[0]; };
/* plan 적 목록 위에 위협 얹기 — 바꾼 적 수 · 늘린 수 · 순찰대 방을 돌려줌 (P.enemies 를 바꿈) */
export function populate(P, map, T, seed) {
  const R = rng(seed * 13 + 5); const pool = M4_POOL[map]; const out = { mixed: 0, added: 0, patrol: null, kinds: {} };
  if (!T || !pool) return out;
  const cond = P.cond || 'normal'; const bias = isNight(map, cond) ? M4_COND_BIAS.night : isStorm(cond) ? M4_COND_BIAS.storm : null;
  const poolOf = z => { const w = { ...pool[z] }; if (bias) for (const k in w) w[k] *= bias[k] || 1; return w; };
  /* 1) 섞기: 무리(검은 닻) 아닌 적을 새 적으로 */
  for (const e of P.enemies) { if (e.squad != null || ENEMIES[e.kind].boss) continue; if (R() < T.mix) { e.kind = wpick(poolOf(e.zone), R); e.m4 = 1; out.mixed++; } }
  /* 2) 방마다 +1 (구역 확률) */
  const rooms = P.rooms.filter(r => r.type !== 'vault' && r.id !== P.bossRoom && r.id !== P.start);
  const base = z => { const f = MAPS[map].zones[z].foes; return f ? Object.fromEntries(Object.entries(f).filter(([k]) => ENEMIES[k])) : { drone: 1, skel: 1 }; };
  for (const rm of rooms) { if (R() >= (T.extra[rm.zone] || 0)) continue;
    const kind = R() < T.mix ? wpick(poolOf(rm.zone), R) : wpick(base(rm.zone), R);
    P.enemies.push({ kind, x: rm.x0 + 3 + R() * (RS - 6), z: rm.z0 + 3 + R() * (RS - 6), room: rm.id, zone: rm.zone, elite: rm.zone === 3, m4: 2 }); out.added++; }
  /* 3) 다른 지도에도 검은 닻 순찰대 (4장~): 구역 2 · 3 방 하나의 적을 무리로 바꿈 */
  if (T.patrol > 0 && R() < T.patrol) {
    const cand = rooms.filter(r => r.zone >= 2); if (cand.length) { const rm = cand[Math.floor(R() * cand.length)];
      P.enemies = P.enemies.filter(e => e.room !== rm.id);
      const K2 = ['raider', R() < 0.5 ? 'brute' : 'bomber', ...(T.signal ? ['signal'] : rm.zone === 3 ? ['raider'] : [])];
      const cx = rm.x0 + RS / 2, cz = rm.z0 + RS / 2;
      K2.forEach((kind, i) => { const a = i * 2.1 + R(); P.enemies.push({ kind, x: cx + Math.cos(a) * 1.8 * (i ? 1 : 0), z: cz + Math.sin(a) * 1.8 * (i ? 1 : 0), room: rm.id, zone: rm.zone, elite: rm.zone === 3, squad: 1000 + rm.id, m4: 3 }); });
      out.patrol = rm.id; }
  }
  /* 4) 공장 무리에 신호수 (Lv 5~): 무리 하나에 한 명 */
  if (map === 'factory' && T.signal) { const sq = [...new Set(P.enemies.filter(e => e.squad != null && e.squad < 1000).map(e => e.squad))]; if (sq.length) { const id = sq[Math.floor(R() * sq.length)]; const m = P.enemies.find(e => e.squad === id);
    P.enemies.push({ kind: 'signal', x: m.x + 1.2, z: m.z + 1.2, room: m.room, zone: m.zone, elite: m.elite, squad: id, m4: 4 }); } }
  for (const e of P.enemies) out.kinds[e.kind] = (out.kinds[e.kind] || 0) + 1;
  return out;
}
