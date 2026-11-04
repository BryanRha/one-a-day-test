// 경제 · 성장 계산 (화면 · three 없이 — node 시뮬 · 시험에서도 그대로 씀)
//  S = 저장 상태(save.js). 모든 함수는 S 를 직접 바꾸고 { ok, why } 를 돌려줌
import { MARKET, ITEMS, MATS, FACILITIES, FAC_KEYS, WEAPONS, MODS, MOD_KEYS, MOD_COST, TIER_MUL, GEAR, CRAFTS, MEALS, QUESTS, DAILY_POOL, DAILY_MUL, PLAYER, MAPS, MAP_KEYS, DAILY_MAP, ENEMIES, O2 } from './data.js?v=0.99.8';

export const kstDay = (t = Date.now()) => new Date(t + 324e5).toISOString().slice(0, 10);
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/* ───── 비용 ───── */
export const count = (S, k) => (k === 'shells' ? S.shells : k in MATS ? (S.mats[k] || 0) : S.stash.filter(x => x === k).length);
export function lack(S, cost) { const out = {}; for (const [k, n] of Object.entries(cost || {})) { const have = count(S, k); if (have < n) out[k] = n - have; } return out; }
export const canPay = (S, cost) => !Object.keys(lack(S, cost)).length;
export function pay(S, cost) {
  if (!canPay(S, cost)) return false;
  for (const [k, n] of Object.entries(cost)) {
    if (k === 'shells') S.shells -= n; else if (k in MATS) S.mats[k] -= n;
    else for (let i = 0; i < n; i++) S.stash.splice(S.stash.indexOf(k), 1);
  }
  return true;
}
export function give(S, bundle) {
  for (const [k, n] of Object.entries(bundle || {})) {
    if (k === 'shells') S.shells += n; else if (k in MATS) S.mats[k] = (S.mats[k] || 0) + n; else for (let i = 0; i < n; i++) S.stash.push(k);
  }
}
export const costName = k => (k === 'shells' ? '조개' : MATS[k]?.name || ITEMS[k]?.name || k);
export const costValue = cost => Object.entries(cost || {}).reduce((s, [k, n]) => s + n * (k === 'shells' ? 1 : k in MATS ? MAT_VALUE[k] : ITEMS[k]?.val || 0), 0);
/* 재료 1개의 대략 가치(조개) — 분해 효율 비교 · 시뮬 집계용 */
export const MAT_VALUE = { bolt: 5, wire: 5, cloth: 4, glass: 18, herb: 2, powder: 7 };

/* 고물상: 모자란 재료만 사서 채우기 — 부품 · 코어가 모자라면 못 삼 */
/* { price: 모자란 재료 값, ok: 조개까지 다 되는가, can: 살 수 있는 것만 모자란가(부품 · 코어 X) } */
export function lackPrice(S, cost) { const L = lack(S, cost); let price = 0, can = true; for (const [k, n] of Object.entries(L)) { if (k === 'shells') continue; if (!MARKET[k]) can = false; else price += MARKET[k] * n; } return { price, can, ok: can && (cost.shells || 0) + price <= S.shells }; }
export function buyLack(S, cost) { const r = lackPrice(S, cost); if (!r.ok) return false; for (const [k, n] of Object.entries(lack(S, cost))) if (k !== 'shells') S.mats[k] = (S.mats[k] || 0) + n; S.shells -= r.price; S.stats.bought = (S.stats.bought || 0) + r.price; return true; }
export function buy(S, k, n) { const p = MARKET[k] * n; if (S.shells < p) return false; S.shells -= p; S.mats[k] += n; S.stats.bought = (S.stats.bought || 0) + p; return true; }

/* ───── 시설 ───── */
export const facLvl = (S, k) => S.fac[k] || 0;
export const facCur = (S, k) => { const L = facLvl(S, k); return L ? FACILITIES[k].levels[L - 1] : null; };
export const facUnlocked = (S, k) => { const u = FACILITIES[k].unlock; return !u || S.quests.done.includes(u); };
export function facNext(S, k) { const F = FACILITIES[k]; const L = facLvl(S, k); return L < F.levels.length ? F.levels[L] : null; }
/* 공사 (한 번에 하나) — time 초 뒤 완성. now 는 ms */
export function startBuild(S, k, now = Date.now()) {
  if (!facUnlocked(S, k)) return { ok: false, why: 'locked' };
  if (S.build) return { ok: false, why: 'busy' };
  const nx = facNext(S, k); if (!nx) return { ok: false, why: 'max' };
  if (!pay(S, nx.cost)) return { ok: false, why: 'cost' };
  if (!nx.time) { S.fac[k] = facLvl(S, k) + 1; return { ok: true, done: true }; }
  S.build = { k, until: now + nx.time * 1000 }; return { ok: true };
}
export function tickBuild(S, now = Date.now()) {
  if (S.build && now >= S.build.until) { const k = S.build.k; S.fac[k] = facLvl(S, k) + 1; S.build = null; return k; }
  return null;
}
/* 즉시 완성 자리 (시제품: BM 연결 X) — 시뮬/시험용 */
export function finishBuild(S) { if (!S.build) return null; S.build.until = 0; return tickBuild(S, 1); }

/* ───── 무기 · 개조 ───── */
export const rackMk = S => facCur(S, 'rack')?.mk || 0;
export function modCost(wk, slot, mk) {
  const base = MOD_COST[mk]; if (!base) return null; const m = TIER_MUL[WEAPONS[wk].tier];
  const c = {}; for (const [k, n] of Object.entries(base)) { if (k === 'part') c[MODS[slot].part] = (c[MODS[slot].part] || 0) + n; else if (k === 'core') c.core = n; else c[k] = Math.round(n * m); }
  if (slot === 'scope' && mk === 1) c.glass = 1;
  return c;
}
export function craftWeapon(S, wk) {
  const W = WEAPONS[wk]; if (S.weapons[wk]) return { ok: false, why: 'owned' };
  if (facLvl(S, 'bench') < W.bench) return { ok: false, why: 'bench' };
  if (!pay(S, W.cost)) return { ok: false, why: 'cost' };
  S.weapons[wk] = { scope: 0, barrel: 0, mag: 0, chamber: 0 }; return { ok: true };
}
export function upgradeMod(S, wk, slot) {
  const w = S.weapons[wk]; if (!w) return { ok: false, why: 'noweapon' };
  const mk = w[slot] + 1; if (mk > 3) return { ok: false, why: 'max' };
  if (rackMk(S) < mk) return { ok: false, why: 'rack' };
  if (!pay(S, modCost(wk, slot, mk))) return { ok: false, why: 'cost' };
  w[slot] = mk; return { ok: true };
}
/* 개조 반영한 무기 숫자 */
export function weaponStats(wk, mods = { scope: 0, barrel: 0, mag: 0, chamber: 0 }) {
  const W = WEAPONS[wk], M = MODS;
  const sm = M.scope.spread[mods.scope];
  return { key: wk, name: W.name, short: W.short, pellets: W.pellets || 1, pierce: W.pierce || 0, knock: W.knock, noise: W.noise,
    dmg: W.dmg * M.chamber.dmg[mods.chamber], rate: W.rate, mag: Math.round(W.mag * M.mag.mag[mods.mag]), reload: W.reload * M.mag.reload[mods.mag],
    range: W.range * M.barrel.range[mods.barrel], spread: W.spread * sm, add: W.add * sm, max: W.max * sm, rec: W.rec * M.barrel.rec[mods.barrel],
    crit: W.crit + M.scope.crit[mods.scope], mods: { ...mods } };
}
/* 체감용 숫자: 거리 d 에서 적을 연사로 잡는 데 걸리는 시간(초) · 명중률 — 같은 식을 화면 · 시뮬이 같이 씀
 *  명중: 적 반지름이 보이는 각(atan(r/d)) ÷ 그때의 퍼짐(연사 중 평균) · 산탄은 알 수 만큼 */
export function ttk(ws, hp, d = 7, r = 0.62) {
  const half = Math.atan(r / d);
  if (d > ws.range) return { hit: 0, t: Infinity, dps: 0 };
  let spread = ws.spread, t = 0, dealt = 0, mag = ws.mag, shots = 0, hitSum = 0;
  const per = ws.dmg * (1 + ws.crit * 0.8);
  while (dealt < hp && t < 60) {
    if (mag <= 0) { t += ws.reload; mag = ws.mag; spread = ws.spread; }
    const p = Math.min(1, half / Math.max(1e-3, spread));
    const exp = ws.pellets > 1 ? ws.pellets * Math.min(1, half / Math.max(1e-3, ws.spread)) : p;
    dealt += per * exp; hitSum += p; shots++; mag--; t += 1 / ws.rate; spread = Math.min(ws.max, spread + ws.add);
  }
  return { hit: hitSum / Math.max(1, shots), t: Math.round(t * 100) / 100, dps: Math.round(dealt / Math.max(0.01, t)) };
}

/* ───── 장비 · 소모품 · 요리 ───── */
export function craftGear(S, slot) {
  const cur = S.gear[slot]; const nx = GEAR[slot].tiers[cur + 1]; if (!nx) return { ok: false, why: 'max' };
  if (facLvl(S, 'bench') < nx.bench) return { ok: false, why: 'bench' };
  if (!pay(S, nx.cost)) return { ok: false, why: 'cost' };
  S.gear[slot] = cur + 1; return { ok: true };
}
export function craftItem(S, key, n = 1) {
  const C = CRAFTS[key]; let made = 0;
  for (let i = 0; i < n; i++) {
    if (facLvl(S, C.fac) < C.lv) return { ok: made > 0, made, why: 'fac' };
    if (S.stash.length >= stashCap(S)) return { ok: made > 0, made, why: 'full' };
    if (!pay(S, C.cost)) return { ok: made > 0, made, why: 'cost' };
    S.stash.push(key); made++;
  }
  return { ok: true, made };
}
export function cook(S, mk) {
  const M = MEALS[mk]; const lv = facCur(S, 'kitchen')?.meal || 0;
  if (lv < M.lv) return { ok: false, why: 'fac' }; if (S.meal) return { ok: false, why: 'have' };
  if (!pay(S, M.cost)) return { ok: false, why: 'cost' };
  S.meal = mk; return { ok: true };
}

/* ───── 창고: 팔기 · 분해 ───── */
export const stashCap = S => facCur(S, 'store')?.cap || 30;
export const appraise = S => facCur(S, 'lab')?.appraise || 0;
export const sellPrice = (S, k) => Math.round(ITEMS[k].val * (ITEMS[k].cat === 'treasure' ? 1 + appraise(S) : 1));
export function sell(S, k) { const i = S.stash.indexOf(k); if (i < 0) return 0; S.stash.splice(i, 1); const v = sellPrice(S, k); S.shells += v; S.stats.sold = (S.stats.sold || 0) + v; return v; }
export function dismantle(S, k) { const d = ITEMS[k].dis; if (!d) return null; const i = S.stash.indexOf(k); if (i < 0) return null; S.stash.splice(i, 1); give(S, d); return d; }
/* 한 번에: 고철 모두 분해 · 보물 모두 팔기 (열쇠 · 소모품 · 부품은 건드리지 않음) */
export function bulk(S, what) {
  const out = { shells: 0, mats: {}, n: 0 };
  for (const k of [...S.stash]) {
    const c = ITEMS[k].cat;
    if (what === 'scrap' && c === 'scrap') { const d = dismantle(S, k); for (const [m, n] of Object.entries(d)) out.mats[m] = (out.mats[m] || 0) + n; out.n++; }
    if (what === 'treasure' && c === 'treasure' && !isDailyItem(S, k)) { out.shells += sell(S, k); out.n++; }
  }
  return out;
}

/* ───── 오늘의 인양 목록 ───── */
/* maps: 그날 목록을 만들 때 열려 있던 지도 (v0.4) — 항구가 열렸으면 2번째 칸, 터널이면 3번째 칸이 그 지도 물건 (지도 표시 map) */
export function dailyList(day, maps = []) {
  const h = hash('salvage' + day); const pool = DAILY_POOL.map((d, i) => ({ ...d, i }));
  const out = []; let x = h; while (out.length < 3) { x = Math.imul(x ^ (x >>> 15), 2246822519) >>> 0; const p = pool[x % pool.length]; if (!out.some(o => o.i === p.i)) out.push(p); }
  [['harbor', 1], ['tunnel', 2]].forEach(([m, slot]) => { if (!maps.includes(m)) return; const P = DAILY_MAP[m]; const y = hash(m + day); out[slot] = { ...P[y % P.length], map: m }; });
  return out.map(o => ({ item: o.item, n: o.n, mat: o.mat, shells: Math.round(ITEMS[o.item].val * o.n * DAILY_MUL), ...(o.map ? { map: o.map } : {}) }));
}
/* 그날 처음 볼 때 열린 지도를 적어 둠 → 하루 동안 목록이 바뀌지 않음 */
export function syncDaily(S, day = kstDay()) { if (!S.daily || S.daily.day !== day) S.daily = { day, done: [false, false, false], maps: S.quests ? openMaps(S).filter(m => m !== 'ware') : [] }; return dailyList(S.daily.day, S.daily.maps || []); }
export const isDailyItem = (S, k) => { const L = dailyList(S.daily?.day || kstDay(), S.daily?.maps || []); return L.some((o, i) => o.item === k && !S.daily?.done[i]); };
export function deliverDaily(S, i) {
  const L = syncDaily(S, S.daily?.day); const o = L[i]; if (!o || S.daily.done[i]) return { ok: false, why: 'done' };
  if (count(S, o.item) < o.n) return { ok: false, why: 'cost' };
  pay(S, { [o.item]: o.n }); give(S, { shells: o.shells, ...o.mat }); S.daily.done[i] = true; S.stats.daily = (S.stats.daily || 0) + 1; return { ok: true, o };
}

/* ───── 의뢰 ───── */
export const questNow = S => QUESTS.find(q => !S.quests.done.includes(q.id)) || null;
/* 보상: 재료 · 조개 · 물건 + 꾸미기(cos — 이미 있으면 조개 150) */
function completeQuest(S, q) { S.quests.done.push(q.id); S.quests.prog = 0; const { cos, ...rw } = q.reward; give(S, rw);
  if (cos) { S.owned ||= []; if (S.owned.includes(cos)) S.shells += 150; else S.owned.push(cos); } return q; }
/* 지도 (v0.4): 열림 = 그 지도의 해금 의뢰를 끝냄 */
export const mapOpen = (S, m) => { const u = MAPS[m]?.unlock; return !!MAPS[m] && (!u || (S.quests?.done || []).includes(u)); };
export const openMaps = S => MAP_KEYS.filter(m => mapOpen(S, m));
/* 보스 종류 기록 (세 지도 보스) — main.js endRaid 가 S.stats.bossKinds 에 적음 */
/*  v0.3 에서 수문지기를 잡은 사람은 기록이 없음 → 보스 의뢰(8 · 17 · 25)를 끝냈으면 그 보스도 잡은 걸로 */
export const bossKinds = S => { const k = new Set(Object.keys(S.stats?.bossKinds || {})); const d = S.quests?.done || []; if (d.includes('q8')) k.add('boss'); if (d.includes('q17')) k.add('captain'); if (d.includes('q25')) k.add('eel'); return k.size; };
const bossDone = (S, g) => bossKinds(S) >= g.n && (S.stats?.bosses || 0) >= (g.total || 0);
/* 판 결과로 진행 — res: { outcome, kills:{종류별}, zoneMax, power, vkeyOut, vaultOpened, value, map, cond } → 끝낸 의뢰 목록 */
export function questRaid(S, res) {
  const out = []; let q = questNow(S); let guard = 0; const rm = res.map || 'ware';
  while (q && guard++ < 30) {
    const g = q.goal; const ex = res.outcome === 'extract'; let done = false; const here = !g.map || g.map === rm;
    if (g.t === 'fac') done = facLvl(S, g.k) >= g.lv;
    else if (g.t === 'bosses') done = bossDone(S, g);
    else if (!here) break;
    else if (g.t === 'extract') done = ex;
    else if (g.t === 'kill') { S.quests.prog += g.kind ? (res.kills[g.kind] || 0) : Object.entries(res.kills).reduce((s, [k, n]) => s + (k === 'boss' || ENEMIES[k]?.boss ? 0 : n), 0); done = S.quests.prog >= g.n; }
    else if (g.t === 'zone') done = ex && res.zoneMax >= g.zone;
    else if (g.t === 'power') done = ex && res.power;
    else if (g.t === 'vkey') done = res.vaultOpened || (ex && res.vkeyOut);
    else if (g.t === 'boss') done = (res.kills.boss || 0) > 0;
    else if (g.t === 'value') done = ex && res.value >= g.n;
    else if (g.t === 'vault') done = ex && res.vaultOpened;
    else if (g.t === 'cond') done = ex && g.conds.includes(res.cond);
    else if (g.t === 'deliver') break; /* 은신처에서 납품 */
    if (!done) break;
    out.push(completeQuest(S, q)); q = questNow(S);
    /* 누적 처치 의뢰는 다음 판부터 셈 (이번 판 처치를 두 번 세지 않음) · 판 사건(탈출 · 구역 · 전원 · 보스 · 금고 · 가치)은 이어서 확인 */
    if (q && q.goal.t === 'kill') break;
  }
  return out;
}
/* 은신처에서 확인하는 의뢰 (시설 단계 · 보스 기록) — 공사가 끝나면 바로 완료 */
export function questTick(S) {
  const out = []; let q = questNow(S); let guard = 0;
  while (q && guard++ < 30 && ((q.goal.t === 'fac' && facLvl(S, q.goal.k) >= q.goal.lv) || (q.goal.t === 'bosses' && bossDone(S, q.goal)))) { out.push(completeQuest(S, q)); q = questNow(S); }
  return out;
}
export function questDeliver(S) {
  const q = questNow(S); if (!q || q.goal.t !== 'deliver') return { ok: false };
  if (count(S, q.goal.item) < q.goal.n) return { ok: false, why: 'cost' };
  pay(S, { [q.goal.item]: q.goal.n }); return { ok: true, q: completeQuest(S, q) };
}
export function questProgress(S) {
  const q = questNow(S); if (!q) return null; const g = q.goal;
  if (g.t === 'kill') return { cur: Math.min(g.n, S.quests.prog), n: g.n };
  if (g.t === 'deliver') return { cur: Math.min(g.n, count(S, g.item)), n: g.n };
  if (g.t === 'fac') return { cur: Math.min(g.lv, facLvl(S, g.k)), n: g.lv };
  if (g.t === 'bosses') return g.total ? { cur: Math.min(g.total, S.stats?.bosses || 0), n: g.total, kinds: bossKinds(S) } : { cur: Math.min(g.n, bossKinds(S)), n: g.n };
  return { cur: 0, n: 1 };
}

/* ───── 출격 장비 계산 (판이 쓰는 숫자 전부) ───── */
export function loadout(S) {
  const main = S.equip.main in S.weapons ? S.equip.main : 'pistol';
  const rack = facCur(S, 'rack'); const side = rack?.side && S.equip.side && S.equip.side !== main && S.weapons[S.equip.side] ? S.equip.side : null;
  const clinic = facCur(S, 'clinic'), store = facCur(S, 'store'), lab = facCur(S, 'lab'), aq = facCur(S, 'aquarium'), lt = facCur(S, 'lights');
  const vest = GEAR.vest.tiers[S.gear.vest], helm = GEAR.helmet.tiers[S.gear.helmet], bag = GEAR.bag.tiers[S.gear.bag];
  const meal = S.meal ? MEALS[S.meal] : null;
  return {
    weapons: [weaponStats(main, S.weapons[main]), ...(side ? [weaponStats(side, S.weapons[side])] : [])],
    hp: PLAYER.hp + (clinic?.hp || 0) + (helm.hp || 0) + (meal?.hp || 0), armor: vest.armor || 0, lastStand: !!clinic?.last,
    o2: O2.max + (helm.hp || 0), /* v0.4 해저 터널: 헬멧이 산소통 몫도 함 */
    bag: { w: bag.w, h: bag.h, comfy: bag.comfy }, safe: store?.safe || [1, 1], kit: store?.kit || 0,
    pet: aq ? { w: aq.pet[0], h: aq.pet[1], safe: !!aq.petSafe, sniff: !!aq.sniff } : null,
    glow: !!lab?.glow, hints: !!lab?.hints, vision: lt?.vision || 1, blackout: lt?.blackout || 1, sense: !!lt?.sense,
    stam: meal?.stam || 1, speed: meal?.speed || 1, search: meal?.search || 1, meal: S.meal,
  };
}
/* 장비 점수 (시뮬 · 의뢰 난이도 가늠용): 주무기 DPS(7m) × 체력 ÷ (1-방어) */
export function power(S) { const L = loadout(S); const w = L.weapons[0]; return Math.round(ttk(w, 1000, 7).dps * (L.hp / 100) / (1 - L.armor)); }
