// 숲속 힐링 캠프 — 게임 규칙 (화면 없이도 돎: 브라우저 · tools/bot.mjs 가 같이 씀)
//   손님이 옴 → 자리에 앉아 주문 → 요리(주인공 · 요리사) → 서빙(도우미) → 먹고 코인 · 하트 · 가끔 선물 → 떠남
//   시간은 전부 '게임 초'(S.t) — 화면은 이벤트(on)를 받아 움직이고, 규칙은 화면을 기다리지 않음 (막힘 0)
import * as D from './data.js?v=0.90.5';

export const S = {};            /* 저장되는 상태 */
export const R = { guests: [], seats: [], orders: [], ready: [], servers: [], cooks: {}, gifts: [], nextSpawn: 2, ev: [], rateWin: [], earned: 0 };   /* 저장 안 되는 진행 */
const on = (type, o = {}) => R.ev.push({ type, ...o });
export const drain = () => { const e = R.ev; R.ev = []; return e; };
const dayNo = t => Math.floor((t + 9 * 3600) / 86400);   /* 한국 날짜 */
let RNG = Math.random; export const setRng = f => { RNG = f; };
const rnd = (a, b) => a + RNG() * (b - a), pick = a => a[Math.floor(RNG() * a.length)];
const wpick = list => { const tot = list.reduce((a, x) => a + x[1], 0); let r = RNG() * tot; for (const x of list) { if ((r -= x[1]) < 0) return x; } return list[list.length - 1]; };

export function fresh(now) {
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, { v: 1, t: now, created: now, lastSeen: now, coin: 60, gem: 30, rp: 0, treat: 2, big: 0, stamp: 0, xp: 0, lv: 1,
    oven: { lv: 1 }, pads: { L2: { fac: 'table', lv: 1, base: 50 } }, amen: {},   /* 첫 화면 잔디에 피크닉 식탁 하나는 처음부터 (퀄리티 A3) */ builds: 0, zones: { lawn: { st: 'open' } }, menu: { bagel: 1 }, staff: { haru: { fav: 1, exp: 0 } },
    regs: {}, deco: {}, shop: {}, box: { pity: 0, n: 0 }, daily: {}, repeat: {}, stats: { served: 0, ups: 0, crits: 0, builds: 0, earned: 0 },
    attend: { last: -1, idx: 0 }, play: { day: -1, sec: 0, got: [] }, ads: { day: -1, used: {} }, buff: {}, charge: {}, stall: { day: -1, items: [], bought: [] },
    tut: 0, catPet: 0, owner: false, skin: false, rate: 0, muted: false });
  for (const z of D.ZONES) if (!S.zones[z.id]) S.zones[z.id] = { st: 'locked' };
  resetRun(); return S;
}
export function load(obj, now) {
  fresh(now); if (!obj || obj.v !== 1) return { fresh: true };
  Object.assign(S, obj); S.t = now; for (const z of D.ZONES) if (!S.zones[z.id]) S.zones[z.id] = { st: 'locked' };
  resetRun(); return { fresh: false };
}
export function resetRun() {   /* 저장 안 되는 진행 초기화 (연속으로 여러 판 해도 남지 않게) */
  R.guests = []; R.orders = []; R.ready = []; R.tips = []; R.cheer = {}; R.combo = { n: 0, t: -9 }; R.tapStats = { dish: 0, cheer: 0, tip: 0, bonus: 0 }; R.gifts = []; R.ev = []; R.rateWin = []; R.nextSpawn = 2; R.earned = 0; R.regToday = null; R.gid = 0; R.seats = []; R.servers = []; R.stations = null;
  buildSeats(); buildWorkers();
}
export const save = () => JSON.parse(JSON.stringify(S));
/* 첫 30초 (퀄리티 A2): 새 판이면 첫 손님은 이미 데크에 앉아 먹는 중 → 3초 안에 첫 코인 · 처음 두 접시는 빨리 구움 */
export function quickStart() {
  if (S.stats.served > 0 || R.guests.length) return false; const seat = R.seats.find(s => s.id === 'L21') || R.seats.find(s => s.id === 'W1') || R.seats[0]; if (!seat) return false;
  const g = { id: ++R.gid, look: 'hiker', seat, st: 'eat', left: 2.6, reg: null, dog: false, menu: 'bagel' }; seat.guest = g.id; R.guests.push(g);
  on('spawn', { g, path: [[seat.x, seat.y], [seat.x, seat.y]], dur: 0 }); on('served', { g, sv: null }); R.fastCook = 2; R.nextSpawn = 1.2; return true;
}

/* ── 자리 · 일꾼 ── */
const SEAT_OFF = { table: [[-54, -34], [-18, -40], [18, -40], [54, -34]], bbq: [[-54, -46], [-18, -54], [18, -54], [54, -46]], firepit: [[-46, -36], [46, -36]] };   /* 식탁 뒤에 나란히 앉아 얼굴이 화면 쪽 (옆에 서서 먹는 손님 X · 퀄리티 B3) */   /* 식탁 뒤에 앉아 얼굴이 화면 쪽 */
export function buildSeats() {
  const keep = R.seats || []; R.seats = [];
  /* 웰컴센터 데크 벤치 2자리 (처음부터) */
  [[-44, 0], [40, 4]].forEach(([dx, dy], i) => R.seats.push({ id: 'W' + i, x: D.WELCOME.deck[0] + dx, y: D.WELCOME.deck[1] + dy, pad: null, face: [D.WELCOME.deck[0] + dx, D.WELCOME.deck[1] + 80] }));
  for (const p of D.PADS) { const b = S.pads[p.id]; if (!b || b.lv < 1) continue; const off = SEAT_OFF[p.fac]; if (!off) continue;
    const vip = (D.FAC[p.fac].vip || 1) * (1 + 0.06 * (b.lv - 1)) * (1 + 0.25 * D.tierOf(b.lv));   /* 자리 강화 = 그 자리 손님이 내는 값 + */
    off.forEach(([dx, dy], i) => R.seats.push({ id: p.id + i, x: p.pos[0] + dx, y: p.pos[1] + dy, pad: p.id, vip, face: [p.pos[0], p.pos[1] + 12] })); }
  R.seats = R.seats.map(s => { const k = keep.find(o => o.id === s.id); if (k) { Object.assign(k, { x: s.x, y: s.y, vip: s.vip, face: s.face }); return k; } s.guest = null; return s; });   /* 같은 자리는 같은 객체 (손님이 들고 있는 참조 유지) */
}
export function buildWorkers() {
  R.cooks = { oven: 'hero' }; const cooks = D.STAFF.filter(s => s.role === 'cook' && S.staff[s.id]).map(s => s.id);
  if (built('pot') && cooks[0]) R.cooks.pot = cooks[0];
  if (built('drink') && cooks[1]) R.cooks.drink = cooks[1]; else if (built('drink') && !R.cooks.pot && cooks[0]) R.cooks.drink = cooks[0];
  const prev = R.servers || []; R.servers = D.STAFF.filter(s => s.role === 'serve' && S.staff[s.id]).map(s => prev.find(o => o.id === s.id) || { id: s.id, busy: 0 });
  for (const st of ['oven', 'pot', 'drink']) if (!R.stations || !R.stations[st]) { R.stations = R.stations || {}; R.stations[st] = { busy: 0, cur: null }; }
}
export const padOf = fac => D.PADS.find(p => p.fac === fac && S.pads[p.id] && S.pads[p.id].lv > 0);
export const built = fac => fac === 'oven' || !!padOf(fac);
export const stationPos = st => st === 'oven' ? D.KITCHEN.stand : (padOf(st) || {}).pos;
export const stLv = st => st === 'oven' ? S.oven.lv : (S.pads[(padOf(st) || {}).id] || { lv: 0 }).lv;

/* ── 값 계산 ── */
export const menuOpen = m => {
  const need = { 1: null, 2: 'fridge', 3: 'sink', 4: 'toaster', 5: 'micro', 6: 'micro' }[m.step];
  return (!need || (S.amen[need] || 0) > 0) && (m.step < 6 || S.lv >= 12);
};
export const menuLv = m => S.menu[m.id] || 0;
export function staffBonus(line) {
  let k = 0, crit = 0;
  for (const st of D.STAFF) { const o = S.staff[st.id]; if (!o) continue; if (st.skill.line === line || st.skill.line === 'all') k += st.skill.k * (1 + o.fav * 0.1); k += D.FAV_BONUS[o.fav - 1] * 0.25; crit += D.FAV_CRIT[o.fav - 1] * 0.25; }
  return { k, crit };
}
export const appeal = () => Object.entries(S.deco).reduce((a, [id, n]) => a + (n ? (D.DECO.find(d => d.id === id) || { appeal: 0 }).appeal : 0), 0) + (S.shop.deco ? D.DECO_SHOP.deco.appeal : 0) + (S.skin ? D.DECO_SHOP.skin.appeal : 0) + (S.owner ? D.OWNER_DECO.appeal : 0);
export function dishPrice(m, vip = 1) {
  const line = D.LINES.find(l => l.id === m.line), lv = stLv(line.st), sb = staffBonus(m.line);
  return D.price0(m) * D.menuMult(menuLv(m)) * D.UP.effK ** (lv - 1) * (1 + 0.5 * D.tierOf(lv)) * (1 + sb.k) * vip * (1 + appeal() * 0.004);
}
export const critP = line => Math.min(0.6, D.CRIT.base + staffBonus(line).crit + (buffOn('crit') ? D.CRIT.adP : 0));
export const buffOn = k => (S.buff[k] || 0) > S.t;
export const cycleOf = st => { const l = D.LINES.find(x => x.st === st); return l.cycle / (buffOn('speed') ? 2 : 1) / (1 + 0.15 * D.tierOf(stLv(st))); };
export function menuFor(st) { const line = D.LINES.find(l => l.st === st).id; return D.MENU.filter(m => m.line === line && menuLv(m) > 0); }
/* 지금 수입/초 추정 (보상 = 수입 × N초 · 쉬는 동안 정산) */
export function incomeRate() {
  let r = 0; const seatCap = R.seats.length, flow = Math.min(seatCap / 9, 1 / spawnGap());
  const sts = Object.keys(R.cooks).filter(st => built(st)); let sum = 0, n = 0;
  for (const st of sts) { const ms = menuFor(st); if (!ms.length) continue; const avg = ms.reduce((a, m) => a + dishPrice(m), 0) / ms.length; sum += avg / cycleOf(st); n++; r += avg; }
  if (!n) return 0; const perGuest = r / n; return Math.min(sum, flow * perGuest) * (1 + critP('bread') * 2);
}
export const minsOf = m => Math.max(10, incomeRate() * 60 * m);
export const spawnGap = () => Math.max(D.SPAWN.min, D.SPAWN.base / (1 + R.seats.length * 0.08 + appeal() * 0.01));

/* ── 재화 · 경험치 ── */
export function gain(r, why = '') {
  const out = {};
  if (r.min) { const c = Math.ceil(minsOf(r.min)); S.coin += c; out.coin = c; }
  for (const k of ['coin', 'gem', 'rp', 'treat', 'big', 'stamp']) if (r[k]) { S[k] += r[k]; out[k] = (out[k] || 0) + r[k]; }
  if (out.coin) S.stats.earned += out.coin;
  on('gain', { r: out, why }); return out;
}
export function addXp(n) {
  if (S.lv >= D.LV_MAX) return; S.xp += n;
  while (S.lv < D.LV_MAX && S.xp >= D.lvNeed(S.lv)) { S.xp -= D.lvNeed(S.lv); S.lv++; const rw = { gem: 20 + S.lv * 5, treat: 1 }; gain(rw, 'level'); on('levelup', { lv: S.lv, r: rw }); }
}
const spend = (k, n) => { if (!(S[k] >= n) || !(n >= 0)) return false; S[k] -= n; return true; };

/* ── 짓기 · 강화 ── */
export const zoneOpen = z => S.zones[z] && S.zones[z].st === 'open';
export const padCost = () => D.buildCost(S.builds);
export function canBuild(pid) { const p = D.PADS.find(x => x.id === pid); return p && zoneOpen(p.zone) && !(S.pads[pid] && S.pads[pid].lv > 0); }
export function build(pid) {
  if (!canBuild(pid)) return '아직 지을 수 없는 자리예요'; const c = padCost(); if (!spend('coin', c)) return '숲 코인이 조금 모자라요';
  const p = D.PADS.find(x => x.id === pid); S.pads[pid] = { fac: p.fac, lv: 1, base: c }; S.builds++; S.stats.builds++;
  buildSeats(); buildWorkers(); addXp(10); count('build'); on('build', { pid, fac: p.fac }); return null;
}
export const amenCost = () => D.buildCost(S.builds);
export function buildAmen(id) {
  if ((S.amen[id] || 0) > 0) return '이미 있어요'; const c = amenCost(); if (!spend('coin', c)) return '숲 코인이 조금 모자라요';
  S.amen[id] = 1; S.builds++; S.stats.builds++; addXp(10); on('amen', { id }); return null;
}
export function upCostOf(target) { const o = target === 'oven' ? S.oven : S.pads[target]; return D.upCost(target === 'oven' ? 60 : o.base, o.lv); }
export function upgrade(target) {
  const o = target === 'oven' ? S.oven : S.pads[target]; if (!o || o.lv < 1) return '먼저 지어 주세요'; if (o.lv >= D.UP.max) return '최고 단계예요';
  if (o.work && o.work.end > S.t) return '공사 중이에요';
  const c = upCostOf(target); if (!spend('coin', c)) return '숲 코인이 조금 모자라요';
  o.lv++; S.stats.ups++; addXp(2); count('upgrade');
  const ti = D.UP.tiers.indexOf(o.lv); if (ti >= 0) { const dur = D.UP.tierBuild[ti]; o.work = { start: S.t, end: S.t + dur, dur }; on('work', { target, dur }); }
  on('upgrade', { target, lv: o.lv, tier: ti >= 0 }); buildSeats(); return null;
}
export const working = target => { const o = target === 'oven' ? S.oven : S.pads[target]; return o && o.work && o.work.end > S.t ? o.work : null; };
/* ── 메뉴 ── */
export function menuUp(id) {
  const m = D.MENU.find(x => x.id === id); if (!m || !menuOpen(m)) return '설비가 더 필요해요'; const lv = menuLv(m); if (lv >= D.MENU_MAX) return '최고 맛이에요';
  if (lv === 0) { const c = Math.ceil(D.price0(m) * 8); if (!spend('coin', c)) return '숲 코인이 조금 모자라요'; S.menu[id] = 1; addXp(4); on('menuNew', { id }); return null; }
  const c = D.menuCost(m, lv); if (!spend('rp', c)) return '쉼 포인트가 조금 모자라요'; S.menu[id] = lv + 1; addXp(4); count('menu'); on('menuUp', { id, lv: lv + 1 }); return null;
}
export const menuNewCost = m => Math.ceil(D.price0(m) * 8);
/* ── 직원 ── */
export function hire(id) {
  const st = D.STAFF.find(s => s.id === id); if (!st || S.staff[id]) return '이미 함께해요'; if (!spend('coin', st.cost)) return '숲 코인이 조금 모자라요';
  S.staff[id] = { fav: 1, exp: 0 }; buildWorkers(); on('hire', { id }); return null;
}
export function feed(id, big = false) {
  const o = S.staff[id]; if (!o) return '아직 함께하지 않아요'; if (o.fav >= 10) return '이미 최고로 친해요';
  if (big ? !spend('big', 1) : !spend('treat', 1)) return big ? '특별 도시락이 없어요' : '간식이 없어요 · 손님 선물에서 얻어요';
  o.exp += big ? D.TREATS.big.exp : D.TREATS.small.exp; count('treat'); let up = false;
  while (o.fav < 10 && o.exp >= D.FAV_EXP[o.fav - 1]) { o.exp -= D.FAV_EXP[o.fav - 1]; o.fav++; up = true; }
  on('feed', { id, up, fav: o.fav }); return null;
}
/* ── 구역 확장 (공사 시간 → 즉시 완성 자리) ── */
export function zoneNeedOk(z) { const Z = D.ZONES.find(x => x.id === z); return S.lv >= Z.need.lv && S.builds >= Z.need.built; }
export function expand(z) {
  const Z = D.ZONES.find(x => x.id === z), o = S.zones[z]; if (!Z || o.st !== 'locked') return '이미 열렸어요';
  if (!zoneNeedOk(z)) return `레벨 ${Z.need.lv} · 시설 ${Z.need.built}개부터 열 수 있어요`;
  S.zones[z] = { st: 'building', start: S.t, end: S.t + Z.build, dur: Z.build }; on('zoneWork', { z }); return null;
}
function finishZone(z) { const Z = D.ZONES.find(x => x.id === z); S.zones[z] = { st: 'open' }; gain({ gem: Z.reward }, 'zone'); addXp(20); on('zoneOpen', { z }); }
/* 즉시 완성: 고른 공사 하나만 바로 끝냄 · 값은 남은 비율 (docs/bm-policy.md 2-1) */
export function workList() {
  const L = []; for (const z of D.ZONES) { const o = S.zones[z.id]; if (o.st === 'building' && o.end > S.t) L.push({ key: 'zone:' + z.id, name: z.name + ' 열기', end: o.end, dur: o.dur, base: z.build }); }
  for (const t of ['oven', ...Object.keys(S.pads)]) { const w = working(t); if (w) L.push({ key: 'up:' + t, name: (t === 'oven' ? '빵 오븐' : D.FAC[S.pads[t].fac].name) + ' 단계 공사', end: w.end, dur: w.dur, base: w.dur }); }
  return L;
}
export const instGem = w => Math.max(1, D.instGold(w.base, w.dur, w.end - S.t));   /* 솔방울 값 = 골드 값 (1:1 · 같은 일은 같은 값 · bm-policy 1장) */
export const instGold = w => D.instGold(w.base, w.dur, w.end - S.t);
export function finishWork(key, via) {
  const [k, id] = key.split(':');
  if (k === 'zone') { if (S.zones[id].st !== 'building') return false; finishZone(id); }
  else { const o = id === 'oven' ? S.oven : S.pads[id]; if (!o || !o.work) return false; o.work = null; on('workDone', { target: id }); }
  on('inst', { key, via }); return true;
}
export function instByGem(key) { const w = workList().find(x => x.key === key); if (!w) return '이미 끝났어요'; const g = instGem(w); if (!spend('gem', g)) return '솔방울이 모자라요'; finishWork(key, 'gem'); return null; }

/* ── 숲 선물 상자 (확률 공개 · 30회 천장 · 중복 = 솔방울 돌려받기) ── */
export function openBox(via = 'gem') {
  if (via === 'gem' && !spend('gem', D.BOX.cost)) return { err: '솔방울이 모자라요' };
  S.box.n++; S.box.pity++; let rar = RNG() < D.RARITY.s.p ? 's' : RNG() < D.RARITY.r.p / (1 - D.RARITY.s.p) ? 'r' : 'n';
  if (S.box.pity >= D.BOX.pity) rar = 's'; if (rar === 's') S.box.pity = 0;
  const it = pick(D.DECO.filter(d => d.rar === rar)), dup = (S.deco[it.id] || 0) > 0; S.deco[it.id] = (S.deco[it.id] || 0) + 1;
  if (dup) gain({ gem: D.BOX.dupGem[rar] }, 'dup'); count('box'); on('box', { id: it.id, rar, dup }); return { id: it.id, rar, dup };
}
/* ── 선물 · 놀이터 · 고양이 ── */
export function takeGift(i) {
  const g = R.gifts[i]; if (!g) return null; R.gifts.splice(i, 1); count('gift');
  const r = { coin: { min: 10 }, rp: { rp: Math.ceil(restPerMin() * 5 + 10) }, treat: { treat: 1 }, gem: { gem: 5 }, stamp: { stamp: 1 }, rare: { gem: 15 } }[g.kind];
  const got = gain(r, 'gift'); on('giftTaken', { g, got }); return got;
}
export const chargeLeft = pid => { const p = D.PADS.find(x => x.id === pid), last = S.charge[pid] ?? S.t; return Math.max(0, D.FAC[p.fac].charge - (S.t - last)); };
export function claimCharge(pid) { if (!S.pads[pid] || chargeLeft(pid) > 0) return null; S.charge[pid] = S.t; return gain(chargeReward(pid), 'charge'); }
export const chargeReward = pid => { const lv = (S.pads[pid] || { lv: 1 }).lv; return { min: Math.round(30 * (1 + 0.1 * (lv - 1))), treat: 2 + D.tierOf(lv), gem: 10 }; };
export function petCat() { if (S.t - (S.catPet || 0) < 600) return null; S.catPet = S.t; count('cat'); return gain(RNG() < 0.3 ? { treat: 1 } : { rp: 5 }, 'cat'); }

/* ── 미션 · 출석 · 플레이 시간 ── */
function daily() { const d = dayNo(S.t); if (S.daily.day !== d) S.daily = { day: d, prog: {}, got: {}, all: false }; return S.daily; }
export function count(id, n = 1) { const d = daily(); d.prog[id] = (d.prog[id] || 0) + n; }
export const dailyList = () => { const d = daily(); return D.DAILY.map(m => ({ ...m, p: Math.min(m.n, d.prog[m.id] || 0), got: !!d.got[m.id] })); };
export function claimDaily(id) { const d = daily(), m = D.DAILY.find(x => x.id === id); if (!m || d.got[id] || (d.prog[id] || 0) < m.n) return null; d.got[id] = true; addXp(6); return gain(m.r, 'daily'); }
export const dailyAllReady = () => { const d = daily(); return !d.all && D.DAILY.every(m => d.got[m.id]); };
export function claimDailyAll() { const d = daily(); if (!dailyAllReady()) return null; d.all = true; return gain(D.DAILY_BONUS, 'dailyAll'); }
export const repeatList = () => D.REPEAT.map(q => { const step = S.repeat[q.id] || 0, need = q.steps[Math.min(step, q.steps.length - 1)]; return { ...q, step, need, have: S.stats[q.key] || 0, done: step >= q.steps.length }; });
export function claimRepeat(id) { const q = repeatList().find(x => x.id === id); if (!q || q.done || q.have < q.need) return null; S.repeat[id] = q.step + 1; return gain(q.r(q.step), 'repeat'); }
export function attendReady() { return S.attend.last !== dayNo(S.t); }
export function claimAttend() { if (!attendReady()) return null; const r = D.ATTEND[S.attend.idx % 28]; S.attend.last = dayNo(S.t); S.attend.idx++; return gain(r, 'attend'); }
export function playTick(dt) { const d = dayNo(S.t); if (S.play.day !== d) S.play = { day: d, sec: 0, got: [] }; S.play.sec += dt; }
export const playReady = () => D.PLAYTIME.map(([m, r], i) => ({ m, r, i, ready: S.play.sec >= m * 60 && !S.play.got.includes(i), got: S.play.got.includes(i) }));
export function claimPlay(i) { const p = playReady()[i]; if (!p || !p.ready) return null; S.play.got.push(i); return gain(p.r, 'play'); }
/* 매점 진열 (하루 한 번 새로 · 광고로 새로) */
export function stall() { const d = dayNo(S.t); if (S.stall.day !== d) restock(); return S.stall; }
export function restock() { S.stall = { day: dayNo(S.t), items: [0, 1, 2, 3].map(() => pick(D.STALL)[0]), bought: [] }; }
export function buyStall(i) {
  const st = stall(); if (st.bought.includes(i)) return '다 팔렸어요'; const it = D.STALL.find(x => x[0] === st.items[i]); const c = Math.ceil(minsOf(it[2].min));
  if (!spend('coin', c)) return '숲 코인이 조금 모자라요'; st.bought.push(i);
  if (it[0] === 'treat') gain({ treat: 3 }); else if (it[0] === 'big') gain({ big: 1 }); else if (it[0] === 'rp') gain({ rp: Math.ceil(restPerMin() * 20 + 30) }); else if (it[0] === 'speed') S.buff.speed = Math.max(S.buff.speed || 0, S.t) + 300;
  return null;
}
export const stallPrice = i => { const it = D.STALL.find(x => x[0] === stall().items[i]); return Math.ceil(minsOf(it[2].min)); };
export function buyStamp(id) { const o = D.STAMP_SHOP.find(x => x.id === id); if (!o) return '없어요'; if (!spend('stamp', o.cost)) return '스탬프가 모자라요'; S.deco[id] = (S.deco[id] || 0) + 1; on('box', { id, rar: 'stamp', dup: false }); return null; }
/* 광고 하루 횟수 (게임 쪽 · 앱 한도와 둘 다) */
export function adUsed(k) { const d = dayNo(S.t); if (S.ads.day !== d) S.ads = { day: d, used: {} }; return S.ads.used[k] || 0; }
export const adLeft = k => Math.max(0, (D.ADS[k] || { limit: 0 }).limit - adUsed(k));
export function adDone(k) { adUsed(k); S.ads.used[k] = (S.ads.used[k] || 0) + 1; S.stamp += 1; }
export function applyAd(k, arg) {
  if (k === 'speed' || k === 'crit' || k === 'rest') { S.buff[k] = Math.max(S.buff[k] || 0, S.t) + D.ADS[k].sec; return true; }
  if (k === 'box' || k === 'again') return openBox('ad');
  if (k === 'charge') { if (arg) S.charge[arg] = S.t - D.FAC.playpool.charge; return true; }
  if (k === 'gifts') { const n = R.gifts.length; for (let i = n - 1; i >= 0; i--) takeGift(i); return n; }
  if (k === 'restock') { restock(); return true; }
  return true;
}

/* ── 쉼 포인트 ── */
export function restPerMin() {
  let r = 0; for (const p of D.PADS) { const b = S.pads[p.id]; if (b && b.lv > 0 && D.FAC[p.fac].kind === 'rest') r += D.restRate(D.FAC[p.fac], b.lv); }
  r += 1 + S.oven.lv * 0.2;   /* 직원 휴게 기본 */
  for (const a of ['shower', 'laundry']) if (S.amen[a]) r *= D.AMEN[a].rest;
  return r * (buffOn('rest') ? 1.3 : 1);
}
/* ── 방치 정산 (명세서 6장) ── */
export const offlineCapH = () => D.OFFLINE.capH + (S.amen.shower ? 1 : 0) + (S.amen.laundry ? 1 : 0);
export function offline(now) {
  const away = Math.max(0, now - (S.lastSeen || now)); S.t = now; if (away < D.OFFLINE.min) return null;
  const sec = Math.min(away, offlineCapH() * 3600), rate = S.rate || incomeRate();
  const coin = Math.floor(rate * sec * D.OFFLINE.eff), rp = Math.floor(restPerMin() * sec / 60 * D.OFFLINE.eff), served = Math.floor(sec / spawnGap() * 0.12);
  return { away, sec, coin, rp, served, capped: away > offlineCapH() * 3600 };
}
export function takeOffline(o, mult = 1) { if (!o) return; S.coin += o.coin * mult; S.rp += o.rp * mult; S.stats.earned += o.coin * mult; S.stats.served += o.served; addXp(o.served);   /* 쉬는 동안 대접한 손님도 경험치 */ on('gain', { r: { coin: o.coin * mult, rp: o.rp * mult }, why: 'offline' }); }

/* ── 한 걸음 (dt 초) ── */
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const SPEED = { guest: 70, serve: 90 };
export function step(dt) {
  S.t += dt; playTick(dt);
  /* 공사 끝 */
  for (const z of D.ZONES) { const o = S.zones[z.id]; if (o.st === 'building' && o.end <= S.t) finishZone(z.id); }
  for (const t of ['oven', ...Object.keys(S.pads)]) { const o = t === 'oven' ? S.oven : S.pads[t]; if (o.work && o.work.end <= S.t) { o.work = null; on('workDone', { target: t }); } }
  /* 쉼 포인트 (1분 주기를 연속으로) */
  S.rp += restPerMin() * dt / 60;
  /* 손님 오기 */
  R.nextSpawn -= dt;
  if (R.nextSpawn <= 0) { R.nextSpawn = spawnGap() * rnd(0.8, 1.25); spawnGuest(); }
  /* 요리: 주문 → 조리대 → 다 되면 ready */
  for (const st of Object.keys(R.cooks)) {
    if (!built(st)) continue; const s = R.stations[st];
    if (s.cur) { s.cur.left -= dt; if (s.cur.left <= 0) { const o = s.cur; s.cur = null; o.readyAt = S.t; R.ready.push(o); on('cooked', { st, o }); } }
    else if (!working(st === 'oven' ? 'oven' : (padOf(st) || {}).id)) { const i = R.orders.findIndex(o => o.st === st); if (i >= 0) { const o = R.orders.splice(i, 1)[0]; o.left = cycleOf(st) * (R.fastCook > 0 ? (R.fastCook--, 0.3) : 1); s.cur = o; on('cook', { st, o, dur: o.left }); } }
  }
  /* 응원 게이지 회복 · 팁 사라짐 */
  for (const st of Object.keys(R.cheer)) R.cheer[st] = Math.min(D.TAP.cheerMax, R.cheer[st] + D.TAP.cheerRegen * dt);
  for (let i = R.tips.length - 1; i >= 0; i--) if (R.tips[i].end <= S.t) { on('tipGone', { tip: R.tips[i] }); R.tips.splice(i, 1); }
  /* 서빙 */
  for (const sv of R.servers) {
    if (sv.job) { sv.job.left -= dt; if (sv.job.left <= 0) { const j = sv.job; sv.job = null; const g = R.guests.find(x => x.id === j.o.gid); if (g && g.st === 'wait') { g.st = 'eat'; g.left = 4.5; on('served', { g, sv: sv.id }); } } }
    else if (R.ready.length && S.t - R.ready[0].readyAt >= D.TAP.autoWait) { const o = R.ready.shift(), g = R.guests.find(x => x.id === o.gid); if (!g || g.st !== 'wait') continue;   /* 누르지 않으면 잠깐 뒤 도우미가 천천히 나름 */
      const from = stationPos(o.st), base = D.STAFF.find(x => x.id === sv.id); const home = sv.pos || D.KITCHEN.pick;
      const t = (dist(home, from) + dist(from, [g.seat.x, g.seat.y])) / SPEED.serve + 0.6; sv.job = { o, left: t }; sv.pos = [g.seat.x, g.seat.y + 22]; on('deliver', { sv: sv.id, o, from, to: sv.pos, dur: t, name: base.name }); }
  }
  /* 손님 */
  for (let i = R.guests.length - 1; i >= 0; i--) {
    const g = R.guests[i];
    if (g.st === 'walk') { g.left -= dt; if (g.left <= 0) { g.st = 'wait'; g.waitT = 0; order(g); } }
    else if (g.st === 'wait') { g.waitT += dt; if (g.waitT > 90 && !g.patient) { g.patient = true; order(g, true); } }   /* 너무 오래면 다시 주문 (막힘 방지) */
    else if (g.st === 'eat') { g.left -= dt; if (g.left <= 0) pay(g); }
    else if (g.st === 'leave') { g.left -= dt; if (g.left <= 0) { R.guests.splice(i, 1); on('gone', { g }); } }
  }
  /* 수입 추정 (최근 2분) */
  R.rateWin.push([S.t, R.earned]); R.earned = 0; while (R.rateWin.length && R.rateWin[0][0] < S.t - 120) R.rateWin.shift();
  const sum = R.rateWin.reduce((a, x) => a + x[1], 0), span = Math.max(30, S.t - (R.rateWin[0] ? R.rateWin[0][0] : S.t));
  const live = sum / span, est = incomeRate(); S.rate = Math.max(est * 0.5, Math.min(est * 1.5, live || est));
}
/* 웰컴센터 · 키친보다 위(숲 · 계곡 · 스테이) 자리는 가운데 오솔길로 돌아 감 (건물을 가로지르지 않게) */
const viaOf = seat => seat.y < D.WELCOME.pos[1] + 60 && seat.pad ? [D.TRAIL[0], D.TRAIL[1]] : [];
const pathLen = p => { let L = 0; for (let i = 1; i < p.length; i++) L += dist(p[i - 1], p[i]); return L; };
function spawnGuest() {
  const free = R.seats.filter(s => !s.guest); if (!free.length) return;
  /* 단골: 하루 한 번, 레벨이 되면 */
  let reg = null; const day = dayNo(S.t);
  for (const r of D.REGULARS) { const o = S.regs[r.id] || (S.regs[r.id] = { fav: 0, day: -1 }); if (S.lv >= r.needLv && o.day !== day && !R.guests.some(g => g.reg === r.id) && o.fav < D.FAVOR_MAX + 1) { reg = r; break; } }
  const dogSeat = free.filter(s => s.pad && D.PADS.find(p => p.id === s.pad).dog);
  const seat = reg && reg.dog && dogSeat.length ? pick(dogSeat) : pick(free);
  const look = reg ? reg.look : pick(['hiker', 'grandma', 'kid', 'couple', 'family']);
  const path = [D.ENTRY[1], D.ENTRY[0], ...viaOf(seat), [seat.x, seat.y]], len = pathLen(path);
  const g = { id: ++R.gid, look, seat, st: 'walk', left: len / SPEED.guest, reg: reg ? reg.id : null, dog: !!(reg && reg.dog) || (seat.pad && D.PADS.find(p => p.id === seat.pad).dog && RNG() < 0.5) };
  seat.guest = g.id; R.guests.push(g); on('spawn', { g, path, dur: g.left });
}
function order(g, again) {
  const sts = Object.keys(R.cooks).filter(st => built(st) && menuFor(st).length);
  if (!sts.length) return;
  if (again) { R.orders = R.orders.filter(o => o.gid !== g.id); }
  const regFav = g.reg ? D.REGULARS.find(r => r.id === g.reg).likes : null;
  let m = regFav ? D.MENU.find(x => x.id === regFav) : null; if (!m || menuLv(m) < 1 || !sts.includes(D.LINES.find(l => l.id === m.line).st)) { const st = pick(sts); m = pick(menuFor(st)); }
  const st = D.LINES.find(l => l.id === m.line).st, o = { gid: g.id, st, menu: m.id }; g.menu = m.id; R.orders.push(o); on('order', { g, m: m.id });
}
function payCoins(g, tap) {   /* 값 받기 (누른 접시는 건네는 순간 바로 · 아니면 다 먹고 나서) */
  const m = D.MENU.find(x => x.id === g.menu); const crit = RNG() < critP(m.line); let c = dishPrice(m, g.seat.vip || 1) * (crit ? D.CRIT.mult : 1) * (g.tapMult || 1);
  if (g.tapMult) R.tapStats.bonus += Math.ceil(c - c / g.tapMult);
  c = Math.ceil(c); S.coin += c; S.stats.earned += c; R.earned += c; S.stats.served++; count('serve'); if (crit) { S.stats.crits++; count('crit'); }
  addXp(1); on('paid', { g, c, crit, tap: !!tap }); g.prepaid = true; return c;
}
function pay(g) {
  const m = D.MENU.find(x => x.id === g.menu); if (!g.prepaid) payCoins(g);
  if (RNG() < D.TAP.tipP) { const tip = { id: ++R.gid, x: g.seat.x, y: g.seat.y - 150, c: Math.ceil(dishPrice(m, g.seat.vip || 1) * D.TAP.tipK), end: S.t + D.TAP.tipLife }; R.tips.push(tip); on('tip', { tip }); }   /* 손님 머리 위 하트 팁 (누르면 받음) */
  if (g.reg) { const o = S.regs[g.reg]; if (o.day !== dayNo(S.t)) { o.day = dayNo(S.t); if (o.fav < D.FAVOR_MAX) { o.fav++; addXp(10); on('story', { id: g.reg, fav: o.fav }); } } }
  if (RNG() < D.GIFT_P.chance && R.gifts.length < D.GIFT_P.max) { const k = wpick(D.GIFT)[0]; const gift = { kind: k, x: g.seat.x + rnd(-24, 24), y: g.seat.y + 40 }; R.gifts.push(gift); on('gift', { gift }); }
  g.seat.guest = null; g.st = 'leave'; const lp = [[g.seat.x, g.seat.y], ...viaOf(g.seat).reverse(), D.ENTRY[0], D.ENTRY[1]]; g.left = pathLen(lp) / SPEED.guest; on('leave', { g, path: lp, dur: g.left });
}
/* ── 직접 누르기 (대표 피드백: 원작처럼 손으로 거두는 맛) ──
   ① 다 된 음식 누르기: 바로 손님에게 '퐁' · 그 자리에서 값 +25% · 콤보 ② 조리 중 연타 = 응원: 남은 시간 -0.4초씩 · 게이지 10(부드러운 상한)
   ③ 손님 머리 위 하트 팁 · 바닥 선물 · 고양이 · 숲 바구니 ④ 1.5초 안에 연달아 거두면 콤보 ×N (값 +3%씩, 최대 +30%) */
function comboHit() { const c = R.combo; c.n = S.t - c.t <= D.TAP.comboGap ? c.n + 1 : 1; c.t = S.t; if (c.n >= 2) on('combo', { n: c.n }); return 1 + D.TAP.comboK * Math.min(c.n - 1, 10); }
export const readyAt = st => R.ready.filter(o => o.st === st);
export function tapDish(st) {
  const i = R.ready.findIndex(o => o.st === st && (R.guests.find(g => g.id === o.gid) || {}).st === 'wait'); if (i < 0) return null;
  const o = R.ready.splice(i, 1)[0], g = R.guests.find(x => x.id === o.gid); g.st = 'eat'; g.left = 3.2; g.tapMult = D.TAP.dishK * comboHit(); R.tapStats.dish++;
  on('tapServe', { o, g, from: stationPos(st) }); on('served', { g, sv: null, tap: true }); payCoins(g, true); return g;
}
export function tapCook(st) {
  const s = R.stations && R.stations[st]; if (!s || !s.cur) return null; const e = R.cheer[st] ?? D.TAP.cheerMax; const k = e >= 1 ? 1 : 0.15;   /* 게이지가 비면 아주 조금만 (막지 않고 부드럽게) */
  R.cheer[st] = Math.max(0, e - 1); const cut = Math.min(s.cur.left - 0.05, D.TAP.cheerSec * k); s.cur.left -= Math.max(0, cut); R.tapStats.cheer++; on('cheer', { st, cut, gauge: R.cheer[st] / D.TAP.cheerMax }); return cut;
}
export function tapTip(id) { const i = R.tips.findIndex(t => t.id === id); if (i < 0) return null; const t = R.tips.splice(i, 1)[0]; const c = Math.ceil(t.c * comboHit()); S.coin += c; S.stats.earned += c; R.earned += c; R.tapStats.tip++; count('tip'); on('tipTaken', { tip: t, c }); return c; }
export const xpPct = () => S.lv >= D.LV_MAX ? 1 : S.xp / D.lvNeed(S.lv);
