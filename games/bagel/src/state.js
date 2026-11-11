// 저장 (localStorage 'marumi_v3' · 0.4 재설계): 돈 · 지점별 산 것(own) · 칸에 부은 돈(paid) · 공사 · 재고 · 단골 · 숙련 · 꾸미기 · BM
//   예전 저장 v2(0.3.x) · v1(0.2) 은 처음 열 때 한 번 옮김 — 같은 시설은 그대로 열고, 없어진 방에 낸 값은 돈으로 돌려주고, 진행률은 줄지 않게 · 옛 키는 지우지 않음(되돌리기용)
import { COUPON, BRANCHES, SEASON } from './data.js?v=0.99.28';
export const KEY = 'marumi_v3', OLD2 = 'marumi_v2', OLD1 = 'marumi_v1';
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fresh = () => ({ v: 3, coins: 205, earned: 0, bi: 0, maxBi: 0, branch: {}, day: '', sold: 0, totalSold: 0, coupon: null, miss: {}, missDone: {}, set: { sfx: true, bgm: true }, last: Date.now(), id: Math.random().toString(36).slice(2, 10), mast: {}, deco: {}, reg: {}, boostUntil: 0, fx: {}, ads: { day: '', n: 0 }, gift: '', outfit: 'basic', outfits: ['basic'],
  born: Date.now(), vipUntil: 0, vipBox: '', manager: false, safe: { v: 0 }, adp: { day: '', n: {} }, outfitAd: { id: '', n: 0, day: '' }, items: [], theme: {}, inst: 0, pass: { id: '', xp: 0, free: [], paid: [] }, setsFree: 0, sales: { day: '', n: {} }, time: {}, tut: 0, coupons: [] });
/* 지점: branch[i] = { own 산 것(시설 · 테이블 · 방 · 직원 · 강화 「oven+2」) · paid 칸에 부은 돈 · build{id: 끝 시각} · stock 재고 · idleAt · done · idleUp · idleAd } */
export let S = fresh();
// ── 예전 저장 옮기기 (v2 → v3) — DESIGN 11장 표
/* 예전 저장(v2) 지점별 「진행률을 세는 칸」 값 (예전 layout.js 에서 뽑음) — 진행률 비교 · 없어진 칸 환불에 씀 */
const V2_SLOTS = [{"t1":30,"cashier":100,"R_dough":140,"dougher":170,"R_crew":310,"R_cream":220,"R_hall":310,"baker":450,"R_boss":660,"coffee":690,"topper":880,"R_cafe":600,"t3":1030,"fridge":1450,"kettle":1770,"t4":1840,"cleaner":2320,"R_store":1520,"R_pickup":3370,"driver":3240},{"t1":310,"cashier":990,"R_dough":1400,"dougher":1730,"R_crew":3120,"R_boss":5740,"R_cream":2290,"topper":7790,"R_hall":3440,"baker":4890,"R_up2":25430,"server":22890,"coffee":7670,"R_cafe":6430,"fridge":14880,"t3":11340,"kettle":18810,"R_store":15090,"u2":31100,"t4":20590,"cleaner":25890},{"t1":1370,"cashier":4370,"R_dough":6180,"dougher":7620,"R_crew":13750,"R_boss":25290,"R_cream":10100,"topper":34320,"baker":20670,"coffee":30160,"R_cafe":25400,"fridge":58980,"R_drive":120770,"driver":116780,"rider":129470,"R_store":62450,"R_hall":20270,"t3":53210,"kettle":88130,"t4":90740,"cleaner":114090},{"t1":4410,"cashier":14100,"R_dough":19980,"dougher":24680,"R_crew":44650,"R_boss":82250,"R_terrace":308450,"retard":258510,"R_cream":36030,"topper":122200,"baker":73440,"coffee":106930,"R_cafe":89890,"fridge":208370,"R_store":198780,"p2":411260,"R_hall":66780,"t3":175470,"kettle":290820,"t4":299640,"cleaner":376990}];
/* 같은 시설 → 새 노드 (방과 함께 열리던 설비 포함: 반죽실 = 반죽기 · 크림치즈 공방 = 작업대 · 커피 바 = 커피 머신 · 홀 = 테이블 2) */
const V2_TO = { oven: 'oven', counter: 'counter', t1: 't1', t2: 't2', t3: 't3', t4: 't4', mixer: 'mixer', kettle: 'kettle', cc: 'top', coffee: 'cream', espresso: 'coffee', R_dough: 'mixer', R_cream: 'top', R_cafe: 'coffee', R_hall: 't2', R_crew: 'crew', R_boss: 'boss', R_store: 'store', retard: 'retard',
  cashier: 'cashier', baker: 'runner', topper: 'topper', fridge: 'barista', cleaner: 'cleaner', server: 'server', u2: 'up2', p2: 'terrace' };
const V2_FEAT = { R_pickup: 'pickup', R_up2: 'up2', R_drive: 'drive', R_terrace: 'terrace', drive: null, driver: null, u1: 'up2', p1: 'terrace' };
const V2_LV = { oven: 'oven', ovenCap: 'oven', mixer: 'mixer', kettle: 'kettle', bar: 'top', fridge: 'cream', espresso: 'coffee', walk: 'walk', carry: 'carry', price: 'price', ads: 'ads', tip: 'ads', swalk: 'swalk', scarry: 'scarry' };
export function v2progress(i, b) { const T = V2_SLOTS[i] || {}, ids = Object.keys(T), unl = new Set(b.unl || []); return ids.length ? ids.filter(id => unl.has(id)).length / ids.length : 0; }
export function migrate2(o) {
  const n = Object.assign(fresh(), o, { v: 3, branch: {}, coins: Number.isFinite(+o.coins) ? +o.coins : 0 }); delete n.decoPos; delete n.roomStep; let refund = 0; const report = [];
  for (const [k, b0] of Object.entries(o.branch || {})) { const i = +k, B = BRANCHES[i]; if (!B || !b0) continue; const sp = B.sp, order = sp.order, feat = sp.feat;
    const own = new Set(), unl = new Set(Array.isArray(b0.unl) ? b0.unl : []);
    for (const id of unl) { let to = V2_TO[id]; if (id in V2_FEAT) to = V2_FEAT[id] || (id === 'drive' ? feat : null); if (id === 'driver') to = (sp.F && sp.F.staff) || null;
      if (to && order.some(x => x.id === to)) own.add(to); else if (V2_SLOTS[i]?.[id] != null && !['oven', 'counter', 'bin'].includes(id)) { refund += V2_SLOTS[i][id]; report.push(id); } }
    for (const s0 of (b0.staff || [])) { const to = { cashier: 'cashier', baker: 'runner', topper: 'topper', fridge: 'barista', cleaner: 'cleaner', server: 'server', driver: sp.F.staff, dougher: null }[s0]; if (to && order.some(x => x.id === to)) own.add(to); }
    if (own.size || unl.size) { own.add('oven'); own.add('counter'); own.add('door'); own.add('t1'); }
    // 강화 단계: 같은 단계 (오븐은 두 강화 중 높은 쪽)
    const lv = {}; for (const [a, v] of Object.entries(b0.lv || {})) { const t = V2_LV[a]; if (t) lv[t] = Math.max(lv[t] || 0, Math.min(10, +v || 0)); }
    for (const [t, v] of Object.entries(lv)) { if (['oven', 'mixer', 'kettle', 'top', 'cream', 'coffee'].includes(t) && !own.has(t)) continue; for (let l = 1; l <= v; l++) own.add(`${t}+${l}`); }
    // 방에 들어가야 하는 것: 직원이 있으면 크루룸 · 사람 강화가 있으면 사장실
    if ([...own].some(x => ['cashier', 'runner', 'topper', 'barista', 'cleaner', 'picker', 'driver', 'server', 'cleaner2'].includes(x))) own.add('crew');
    if (['walk', 'carry', 'ads', 'price'].some(t => lv[t])) { own.add('crew'); own.add('boss'); }
    // 칸에 부어 둔 돈 → 같은 칸이 있으면 그대로 · 없으면 환불
    const paid = {}; for (const [id, v] of Object.entries(b0.paid || {})) { const to = V2_TO[id]; if (to && order.some(x => x.id === to) && !own.has(to)) paid[to] = +v || 0; else refund += +v || 0; }
    // 진행률은 줄지 않게: 모자라면 여는 순서대로 다음 칸을 열어 줌
    const oldP = v2progress(i, b0), cnt = order.filter(x => x.kind !== 'next'), prog = () => cnt.filter(x => own.has(x.id)).length / cnt.length;
    for (const x of cnt) { if (prog() >= oldP) break; if (!own.has(x.id)) own.add(x.id); }
    if (i < (o.maxBi || 0)) own.add('next');
    n.branch[i] = { own: order.map(x => x.id).filter(id => own.has(id)).concat([...own].filter(id => !order.some(x => x.id === id))), paid, build: {}, stock: null, idleAt: b0.idleAt, done: oldP >= 0.999 || i < (o.maxBi || 0), idleUp: +b0.idleUp || 0, idleAd: +b0.idleAd || 0 }; }
  n.coins = Math.round(n.coins + refund); n.maxBi = Math.max(+o.maxBi || 0, +o.bi || 0); n.migrated = { from: o.v || 2, at: Date.now(), refund: Math.round(refund), gone: report }; n.tut = 1;
  return n; }
/* v1 (0.2) → v2 모양으로 최소한만 바꾼 뒤 v2 → v3 */
function migrate1(o) { const b = {}; for (const [k, b0] of Object.entries(o.branch || {})) b[k] = { unl: [...(b0.unl || [])].map(id => ({ cc: 'cc', drive: 'drive' }[id] || id)), staff: b0.staff || [], paid: b0.paid || {}, lv: b0.lv || {}, idleAt: b0.idleAt };
  return migrate2({ ...o, v: 2, branch: b }); }
export function loadSave() {
  try { let s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!s) { const o2 = JSON.parse(localStorage.getItem(OLD2) || 'null'), o1 = JSON.parse(localStorage.getItem(OLD1) || 'null'); if (o2 && o2.v === 2) s = migrate2(o2); else if (o1 && o1.v === 1) s = migrate1(o1); if (s) localStorage.setItem(KEY, JSON.stringify(s)); }
    if (s && s.v === 3) S = Object.assign(fresh(), s); } catch { /* */ }
  for (const b of Object.values(S.branch || {})) { b.own = Array.isArray(b.own) ? b.own.filter((k, i, a) => typeof k === 'string' && a.indexOf(k) === i) : []; if (!b.paid || typeof b.paid !== 'object') b.paid = {}; if (!b.build || typeof b.build !== 'object') b.build = {}; b.idleUp = Math.max(0, Math.min(5, +b.idleUp || 0)); b.idleAd = +b.idleAd || 0; if (b.own.includes('oven') && !b.own.includes('mixer')) b.own.unshift('mixer'); }   /* 망가진 저장 정리 · 0.4.3: 오븐은 반죽이 있어야 구움 → 오븐이 있던 판은 반죽기를 같이 줌 */
  for (const k of ['mast', 'deco', 'reg', 'fx', 'theme', 'time']) if (!S[k] || typeof S[k] !== 'object' || Array.isArray(S[k])) S[k] = {};
  for (const [k, v] of Object.entries(S.deco)) if (!Array.isArray(v)) delete S.deco[k];
  if (!S.ads || typeof S.ads !== 'object') S.ads = { day: '', n: 0 }; if (!S.adp || typeof S.adp.n !== 'object') S.adp = { day: '', n: {} }; if (!Array.isArray(S.outfits)) S.outfits = ['basic'];
  if (!Array.isArray(S.items)) S.items = []; if (!S.safe || !Number.isFinite(+S.safe.v)) S.safe = { v: 0 }; if (!S.pass || typeof S.pass !== 'object') S.pass = { id: '', xp: 0, free: [], paid: [] };
  if (!S.outfitAd || typeof S.outfitAd !== 'object') S.outfitAd = { id: '', n: 0, day: '' }; if (!Array.isArray(S.coupons)) S.coupons = [];
  for (const k of ['coins', 'earned', 'vipUntil', 'inst', 'born']) if (!Number.isFinite(+S[k])) S[k] = k === 'born' ? Date.now() : 0;
  if (S.vipUntil > Date.now() + 28 * 864e5) S.vipUntil = Date.now() + 28 * 864e5;   /* 시계를 앞으로 돌려도 최대 28일 */
  dayTick(); return S; }
/* 처음부터 (2026-11-11 대표 제보 「처음부터 했는데 예전 판으로 열림」 근본 수정)
   원인: 판매 · 5초마다 부르는 save() 가 0.4초 뒤에 쓰는 타이머를 남김 → 확인 창을 닫자마자 resetAll 이 새 판을 쓰고 location.reload() 를 걸어도,
         새 페이지가 뜨기 전에 그 타이머가 돌아 메모리의 옛 판(S)을 다시 써 버림 (__noSave 는 save() 입구만 막고 이미 걸린 타이머는 못 막았음)
   막는 법 (쓰는 길이 어디든):
     ① 이 판의 「처음부터 시각」(resetAt) 을 저장에 적음 → 모든 쓰기(write)는 저장에 적힌 resetAt 이 내 것보다 새로우면 쓰지 않고 다시 엶 (남은 타이머 · 다른 탭 · 지운 뒤 남은 화면)
     ② 걸려 있던 타이머를 지우고 __noSave 를 먼저 켬
     ③ 원어데이 앱에 알림(oad:reset) → 앱이 계정 저장을 새 판으로 덮어 올림(직전본은 서버에 남음) · 그 전까지는 계정 쪽을 내려받거나 묻지 않음
   옛 저장(v2 · v1)은 「지움 표시」로 덮음 — 키를 지우면 원어데이 클라우드가 옛 저장을 다시 내려받을 수 있어서, 지우지 않고 덮어써 새 판이 올라가게 함 */
let tm = null;
const staleHere = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return !!(v && +v.resetAt > (+S.resetAt || 0)); } catch { return false; } };
function write() {
  if (window.__noSave) return;
  if (staleHere()) { window.__noSave = true; clearTimeout(tm); try { location.reload(); } catch { /* */ } return; }   /* 다른 곳에서 처음부터 한 뒤의 옛 판 → 쓰지 않고 새 판으로 다시 엶 */
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* */ } }
export function resetAll() { window.__noSave = true; clearTimeout(tm); tm = null;
  const n = fresh(); n.resetAt = Date.now(); const tomb = JSON.stringify({ v: 0, reset: n.resetAt }); try { localStorage.setItem(KEY, JSON.stringify(n)); localStorage.setItem(OLD2, tomb); localStorage.setItem(OLD1, tomb); } catch { /* */ }
  try { if (parent !== window) parent.postMessage({ type: 'oad:reset' }, '*'); } catch { /* 단독 실행 */ } }
export function save(now) { if (window.__noSave) return; S.last = Date.now(); clearTimeout(tm); if (now) write(); else tm = setTimeout(write, 400); }
export function dayTick() { if (S.day !== today()) { S.day = today(); S.sold = 0; S.coupon = null; S.miss = {}; S.missDone = {}; } }
export function addSold(n) { dayTick(); S.sold += n; S.totalSold += n; mission('sell', n); passXp(n); save(); }
export const couponReady = () => S.sold >= COUPON.goal && !S.coupon;
// 쿠폰 번호: 날짜 + 기기 → 매장에서 확인 (형식은 트렌차이즈와 정함)
export function claimCoupon() { if (!couponReady()) return null; let h = 0; for (const c of S.id + S.day) h = (h * 31 + c.charCodeAt(0)) >>> 0; S.coupon = { code: 'MRM-' + S.day.slice(5).replace('-', '') + '-' + (h % 100000).toString().padStart(5, '0'), at: Date.now() }; save(true); return S.coupon; }
export const MISSIONS = [
  { id: 'sell', name: '베이글 50개 팔기', goal: 50, coins: 300 }, { id: 'serve', name: '손님 20명 받기', goal: 20, coins: 250 }, { id: 'clean', name: '쓰레기 15개 치우기', goal: 15, coins: 200 },
  { id: 'unlock', name: '새로운 것 2개 열기', goal: 2, coins: 400 }, { id: 'cash', name: '돈 더미 20번 줍기', goal: 20, coins: 350 }, { id: 'coins', name: '돈 3,000 모으기', goal: 3000, coins: 500 },
];
export function mission(id, n = 1) { dayTick(); S.miss[id] = (S.miss[id] || 0) + n; }
/* 새로 받을 수 있게 된 미션 (미션 창을 열면 「본 것」 → 빨간 점 꺼짐) */
export const missionNew = () => MISSIONS.some(m => (S.miss[m.id] || 0) >= m.goal && !S.missDone[m.id] && !(S.missSeen || []).includes(S.day + m.id));
export const missionReady = () => MISSIONS.some(m => (S.miss[m.id] || 0) >= m.goal && !S.missDone[m.id]);
export function claimMission(id) { const m = MISSIONS.find(x => x.id === id); if (!m || S.missDone[id] || (S.miss[id] || 0) < m.goal) return 0; S.missDone[id] = 1; const v = m.coins * mult(); S.coins += v; save(); return v; }
export const mult = () => BRANCHES[S.bi]?.mult || 1;
// VIP · 소유 상품
export const vipOn = () => (+S.vipUntil || 0) > Date.now();
export const has = id => S.items.includes(id);
// 시즌 패스 XP = 시즌 동안 판 베이글 (시즌이 바뀌면 새로)
/* 시즌 패스 값 고정 (DESIGN 5-5, 0.4.3 퀄리티 A3): 별 단계를 채운 그때의 「분당 값 · 한 칸 상한」을 기록 — 미뤄 받아도 커지지 않음 (passLock 은 ui 가 넣음) */
export const PASS_HOOK = { lock: null };
export function passXp(n) { if (S.pass.id !== SEASON.id) S.pass = { id: SEASON.id, xp: 0, free: [], paid: [], lock: {} }; S.pass.lock ||= {}; const d = today(); if (d >= SEASON.from && d <= SEASON.to) S.pass.xp += n;
  const t = SEASON.xp.filter(x => S.pass.xp >= x).length; for (let i = 0; i < t; i++) if (!S.pass.lock[i] && PASS_HOOK.lock) S.pass.lock[i] = PASS_HOOK.lock(); }
