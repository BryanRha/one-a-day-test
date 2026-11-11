// 공통 판 상태 5 (M4-B · v0.7): 밤 · 폭풍 · 안개 · 한파 · 독수 — three · DOM 없음 (node 시험 · 시뮬에서도 씀)
//  · 지금까지 지도마다 따로 있던 상태(항구 폭풍/안개/맑은 밤 · 터널 정전/급류/잔잔 · 공장 증기/과열/정전 · 연구소 누수/이끼/봉쇄)는 '지도 상태'로 그대로 두고,
//    그중 날씨에 해당하는 것은 판 상태 5 갈래(wx)로 묶음: 폭풍 = storm · 안개 = fog · 증기 누출 = fog · 맑은 밤 = night · 정전 = night
//  · 판 상태는 판마다 하나 — 지도 상태가 이미 갈래를 가지면 그것, 아니면 지도마다 '나올 수 있는 조합'(WX_MAP) 가중치로 '이번 판 예보'를 뽑음
//  · 예보 = (한국 날짜 · 지도 · 지금까지 출격 수) 해시 → 출격 준비에서 미리 보이고 맵 장비(data/gear.js MAP_GEAR) 권장이 뜸. 처음 6판은 침수 창고가 늘 맑음
//  · NARRATIVE 1-4 해석: 밤 = 이끼가 가장 밝게 빛나는 시간 · 폭풍 = 대수문 틈으로 바다가 밀려듦 · 안개 = 대수문 냉각수 증기 · 한파 = 연구소 냉각 장치 고장 · 독수 = 깨진 코어 누수
import { mix32, rng } from '../plan.js?v=0.99.23';
import { MAPS } from '../data.js?v=0.99.23';
import { WEEKS, WEEK_CYCLE, WEEK_FROM } from './enemies.js?v=0.99.23';

export const WX_KEYS = ['night', 'storm', 'fog', 'cold', 'toxic'];
/* 판 상태 5 — 아이콘 · 이름 · 한 줄(판 안 띠) · 숫자 (raid.js 가 지도 상태 숫자에 곱해 씀: sight · hear · vis · fog · rain · night) */
export const WEATHER = {
  night: { icon: '🌙', name: '밤', band: '어두워요 — 빛 속의 나는 멀리서 보여요', txt: '밤 — 헤드램프 · 빛 밑이 아니면 잘 안 보여요. 빛 속에 서면 적도 멀리서 나를 봐요. 빛이끼가 가장 밝게 빛나요', night: 1, sight: 0.9, fog: [20, 44], vis: 0.88, gear: 'hlamp' },
  storm: { icon: '⛈️', name: '폭풍', band: '소리가 묻혀요', txt: '폭풍 — 비바람에 소리가 묻혀 적이 덜 들어요(0.6배) · 번개가 치면 잠깐 다 보여요', hear: 0.6, fog: [24, 44], rain: 1, gear: null },
  fog:   { icon: '🌫️', name: '안개', band: '가까이 와야 보여요', txt: '안개 — 냉각수 증기 · 서로 가까이 와야 보여요(적 시야 0.7배)', sight: 0.7, fog: [16, 36], vis: 0.8, gear: 'hlamp' },
  cold:  { icon: '❄️', name: '한파', band: '바닥이 얼고 체온이 내려가요', txt: '한파 — 냉각 장치 고장 · 얼음 바닥은 미끄럽고 체온이 내려가요(물속은 더 빨리). 불 · 온열 배관 곁에서 녹아요. 체온이 바닥나면 느려지고 아파요', fog: [20, 46], vis: 0.92, cold: 1, gear: 'drysuit' },
  toxic: { icon: '☣️', name: '독수', band: '초록 웅덩이를 피해요', txt: '독수 — 깨진 코어가 새어 초록 독 웅덩이가 생겨요. 밟으면 독이 오르고 쌓인 독은 천천히 아파요. 연고 · 해독제 · 소독 샤워로 씻어요', fog: [22, 46], vis: 0.95, toxic: 1, gear: 'filter' },
};
/* 지도 상태 → 갈래 (지금 있는 상태 정리) — 없는 것은 날씨가 아님(지도 사건) */
export const WX_OF = { storm: 'storm', fog: 'fog', clear: 'night', dark: 'night', outage: 'night', steam: 'fog', gale: 'storm' }; /* M5-A 대수문 꼭대기 비바람 = 폭풍 */
/* 지도마다 나올 수 있는 조합 (가중치 · none = 맑음) — 항구는 지도 상태 자체가 날씨(폭풍 · 안개 · 맑은 밤)라 그 표를 씀 */
export const WX_MAP = {
  ware:    { none: 70, storm: 15, fog: 15 },
  harbor:  { storm: 35, fog: 30, night: 35 },
  tunnel:  { night: 35, none: 36, toxic: 13, cold: 10, fog: 6 },   /* M4 마무리: night 35 = 정전(dark) — 예보가 지도 상태를 정하므로 옛 지도 상태 비율(정전 35%)을 예보 표에 넣음 */
  factory: { fog: 35, night: 35, none: 17, toxic: 8, storm: 5 },   /*            fog 35 = 증기 누출(steam) · night 35 = 정전(outage) · 나머지 = 과열(overheat) */
  lab:     { cold: 35, toxic: 20, fog: 15, night: 15, none: 15 },
  gate:    { storm: 100 }, /* M5-A 대수문 꼭대기 — 늘 비바람 */
};
/* 항구 예보 → 지도 상태 (plan(seed, 'harbor', { cond }) 로 넘김) */
export const WX_COND = { harbor: { storm: 'storm', fog: 'fog', night: 'clear' } };
export const FIRST_CLEAR = 6; /* 처음 6판은 맑음 (튜토리얼 · 첫 인상) */

/* 한파 · 독수 숫자 (raid 의 weather.js 가 씀) */
export const COLD = { max: 100, drain: 1.55, wet: 1.9, deep: 2.4, warm: 22, warmR: 3.2, low: 35, slowLow: 0.86, slowZero: 0.7, hurt: 3, hurtEvery: 1.5, grip: 0.14, suit: { drain: 0.33, grip: 0.45 }, ice: [0, 2], heaters: 1 };
export const TOXIC = { max: 100, fill: 34, decay: 0.9, dps: [0.8, 4.2], warn: 55, auto: 70, puddles: { 1: [0, 1], 2: [1, 2], 3: [1, 2] }, r: [1.4, 2.2], filter: { fill: 0.33, decay: 2.5 }, shower: 30 };
/* 고성능 헤드램프: 밤 · 안개 시야 · 가리개 */
export const LAMP_GEAR = { vision: 1.25, dark: 0.85 };

/* 가중치 표에서 하나 */
const wpick = (w, r) => { const tot = Object.values(w).reduce((a, b) => a + b, 0); let x = r * tot; for (const [k, v] of Object.entries(w)) { x -= v; if (x <= 0) return k; } return Object.keys(w)[0]; };
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/* 시험 주소 고정값 (main.js 가 ?wx= · ?week= 를 넣음) — 출격 준비 카드와 실제 판이 같은 값을 보게 forecast 안에서 씀 */
export const WX_TEST = { wx: null, week: undefined };
export function setWxTest(o = {}) { WX_TEST.wx = o.wx && (WEATHER[o.wx] || o.wx === 'none') ? o.wx : null; WX_TEST.week = o.week === undefined ? undefined : (WEEKS[o.week] ? o.week : null); }
/* 이번 주 변주 키 (threat.js weekVar 와 같은 셈 — 순환 import 를 피해 여기 따로) · 오늘 아직 안 나갔으면 오늘 나가는 날을 더해 셈(출격 준비 = 판 시작 전) */
const dayNum = d => Math.floor(Date.parse(d + 'T00:00:00Z') / 864e5);
export function weekKey(S, day = S?.day) {
  if (WX_TEST.week !== undefined) return WX_TEST.week;
  if (!S || !day) return null; const th = S.th && typeof S.th === 'object' ? S.th : {}; const days = (th.days || 0) + (th.last === day ? 0 : 1);
  if (days < WEEK_FROM) return null; const w = Math.floor((dayNum(day) + 3) / 7); return WEEK_CYCLE[((w % 3) + 3) % 3];
}
/* 주간 변주가 예보 가중치에 곱해짐 (밤 주간 = 밤 ×3 · 폭풍 주간 = 폭풍 · 안개 ×2.5 — 그 지도에 있는 것만) */
export function wxTable(map, wk = null) {
  const T = { ...(WX_MAP[map] || WX_MAP.ware) }; const B = wk && WEEKS[wk]?.wx; if (B) for (const k in B) if (T[k]) T[k] *= B[k]; return T;
}
/* 판 예보 — S 가 있으면 (날짜 · 지도 · 출격 수 · 이번 주) · 없으면(봇 · 시험) seed 로. 결과: 'none' 또는 WX_KEYS 중 하나
 *  시험 ?wx= 가 있으면 그것 · 남은 가방(시체) 판이면 그때 그 판 상태 → 출격 준비 카드 = 실제 판 */
export function forecast(S, map, seed = null) {
  if (S && WX_TEST.wx) return WX_TEST.wx;
  if (S?.corpse?.wx && (S.corpse.map || 'ware') === map) return S.corpse.wx;
  if (S && map === 'ware' && (S.stats?.raids || 0) < FIRST_CLEAR) return 'none';
  const T = wxTable(map, S ? weekKey(S) : null);
  const h = S ? hashStr(`${S.day}|${map}|${S.stats?.raids || 0}`) : mix32((seed || 1) * 53 + 11);
  return wpick(T, rng(h || 1)());
}
/* 예보 → 지도 상태 (plan opt.cond): 그 날씨인 지도 상태가 있으면 그것(항구 폭풍 · 터널 정전 · 공장 증기/정전) · 없으면 날씨가 아닌 지도 상태 중에서
 *  → 지도 상태가 예보를 덮어쓰지 않음 (예보 카드 = 실제 판). 고를 게 없으면 null(seed 로) */
export function condFor(map, wx, seed = 1) {
  const C = MAPS[map]?.conds; if (!C || map === 'ware') return null;
  const own = Object.entries(C).filter(([c]) => WX_OF[c] === wx); const plain = Object.entries(C).filter(([c]) => !WX_OF[c]);
  const L = own.length ? own : plain; if (!L.length) return null;
  return wpick(Object.fromEntries(L), rng(mix32(seed * 131 + 17) || 1)());
}
/* 지도 상태(cond) + 예보 → 이번 판 상태 하나 (지도 상태가 날씨면 그것이 우선) */
export function wxFor(map, cond, fc) { const own = WX_OF[cond]; if (own) return own; return WEATHER[fc] ? fc : 'none'; }
/* 지도 상태 숫자 × 판 상태 숫자 (sight · hear · vis 곱 · fog 짧은 쪽 · rain · night) */
export function mergeWx(C, wx, cond) {
  const W = WEATHER[wx]; if (!W || WX_OF[cond] === wx) return { ...C, wx: W ? wx : 'none' }; /* 지도 상태가 곧 날씨(항구 폭풍 등) = 이미 그 숫자 */
  const o = { ...C };
  for (const k of ['sight', 'hear', 'vis']) if (W[k]) o[k] = (C[k] || 1) * W[k];
  if (W.fog) o.fog = C.fog ? [Math.min(C.fog[0], W.fog[0]), Math.min(C.fog[1], W.fog[1])] : W.fog;
  if (W.rain) o.rain = 1; o.wx = wx; o.name = cond === 'normal' || cond === 'calm' ? W.name : `${C.name} · ${W.name}`; return o;
}

/* 판 상태가 까는 바닥 (three 없음 · plan 난수 안 씀 → 지도 · 상자 · 적 그대로): 한파 = 얼음 판 · 온열 배관 / 독수 = 독 웅덩이 · (연구소) 소독 샤워
 *  피하는 곳: 출구 · 발전기 · 보스 자리 · 상자 · 시작점 · 문 앞 (밟고 지나가도 되지만 꼭 가야 하는 곳에 깔지 않음) */
export function wxPlan(P, wx, seed = P.seed) {
  const out = { ice: [], heat: [], pools: [], showers: [] }; if (wx !== 'cold' && wx !== 'toxic') return out;
  const R = rng(mix32(seed * 977 + 41) || 1); const RS = 16;
  const avoid = [...P.exits.map(e => [e.x, e.z, 3.2]), [P.generator.x, P.generator.z, 2.8], [P.boss.x, P.boss.z, 3], [P.spawn.x, P.spawn.z, 3.5], ...P.loots.map(l => [l.x, l.z, 1.3]),
    ...P.doors.map(d => [d.x, d.z, 2.4]), ...(P.terms || []).map(t => [t.x, t.z, 1.8]), ...(P.airs || []).map(a => [a.x, a.z, 2])];
  const free = (x, z, r) => !avoid.some(([ax, az, ar]) => Math.hypot(ax - x, az - z) < ar + r * 0.6);
  for (const rm of P.rooms) {
    if (rm.id === P.start && wx === 'toxic') continue;
    if (wx === 'cold') {
      const n = rm.id === P.start ? 0 : COLD.ice[0] + Math.floor(R() * (COLD.ice[1] - COLD.ice[0] + 1));
      for (let k = 0; k < n; k++) for (let t = 0; t < 12; t++) { const w = 2.4 + R() * 3, d = 2 + R() * 2.6; const x = rm.x0 + 2 + w / 2 + R() * (RS - 4 - w), z = rm.z0 + 2 + d / 2 + R() * (RS - 4 - d);
        const rc = [x - w / 2, z - d / 2, x + w / 2, z + d / 2]; if (avoid.some(([ax, az, ar]) => Math.hypot(ax - Math.max(rc[0], Math.min(ax, rc[2])), az - Math.max(rc[1], Math.min(az, rc[3]))) < ar * 0.8)) continue; out.ice.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2, room: rm.id, ry: R() * 0.6 - 0.3 }); break; }
    } else {
      const [a, b] = TOXIC.puddles[rm.zone]; const n = a + Math.floor(R() * (b - a + 1));
      for (let k = 0; k < n; k++) for (let t = 0; t < 14; t++) { const r = TOXIC.r[0] + R() * (TOXIC.r[1] - TOXIC.r[0]); const x = rm.x0 + 2.5 + R() * (RS - 5), z = rm.z0 + 2.5 + R() * (RS - 5);
        if (!free(x, z, r)) continue; out.pools.push({ x, z, r, room: rm.id }); avoid.push([x, z, r]); break; }
    }
  }
  /* 한파: 구역마다 온열 배관 1 (+ 시작방) — 서 있으면 체온이 오름 / 독수(연구소): 구역 1 · 2 에 소독 샤워 1 — 서 있으면 독이 빠짐 */
  const byZone = z => P.rooms.filter(r => r.zone === z && r.id !== P.vault);
  const spot = rm => { for (let t = 0; t < 20; t++) { const x = rm.x0 + 3 + R() * (RS - 6), z = rm.z0 + 3 + R() * (RS - 6); if (free(x, z, 1.2)) { avoid.push([x, z, 1.6]); return { x, z, room: rm.id }; } } return null; };
  if (wx === 'cold') { const st = P.rooms.find(r => r.id === P.start); const s0 = spot(st); if (s0) out.heat.push(s0); for (const z of [1, 2, 3]) { const L = byZone(z).filter(r => r.id !== P.start); if (!L.length) continue; const s = spot(L[Math.floor(R() * L.length)]); if (s) out.heat.push(s); } }
  if (wx === 'toxic' && P.map === 'lab') for (const z of [1, 2]) { const L = byZone(z); const s = L.length && spot(L[Math.floor(R() * L.length)]); if (s) out.showers.push(s); }
  return out;
}
