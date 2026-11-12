// 저장 (localStorage 'gamsung_v2' · 0.2.0 개편): 돈 · 마음 · 경험치 · 원두 · 지점별 가구/머신/진열/열린 단계/공사/금고 · 동료 · 사장님 강화 · 단골 · 광고 바구니 · 골드 상품 · 오늘(판매·주문서·출석·쿠폰)
//   저장 이사: 예전 'gamsung_v1' 이 있으면 처음 열 때 v2 로 옮김 (돈 · ♥ · 레벨 · 단골 · 시 · 동료 · 꾸미기 위치 그대로 · 지금 방 = 각 지점의 0단계) · 옛 키는 남김(되돌리기용)
import { XP, ORDER_POOL, COUPON, FURN, STORES } from './data.js?v=0.99.34';
export const KEY = 'gamsung_v2', OLD_KEY = 'gamsung_v1';
/* 시계: 시험용 배속(?speed)일 때 머신·로스터 시간도 같이 빨라지게 */
let skew = 0; export const now = () => Date.now() + skew; export const addSkew = ms => { skew += ms; };
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/* 첫 가게: 2인 테이블 둘 · 창가 1인석 · 올리브 화분 · 나무 메뉴판 */
export const START_FURN = () => [
  { uid: 1, id: 'table2', x: -250, z: 150, r: 0 }, { uid: 2, id: 'table2', x: 150, z: 150, r: 0 },
  { uid: 3, id: 'window', x: -650, z: 450, r: 0 }, { uid: 4, id: 'plant', x: 550, z: 550, r: 0 },
];
export const newStore = () => ({ furn: START_FURN(), wall: { 1: 'board' }, mach: {}, roast: null, bar: {}, dirty: {}, uid: 10, coinsAt: {},   /* coinsAt: 테이블에 남은 찻값 (가구 uid_자리) */
  open: [0], build: {}, bags: 0, case: {}, idle: { up: 0, ad: 0 }, safe: 0, safeAt: 0, tasks: [], plants: {}, visit: 0, time: 0 });   /* 0.2.0: open 열린 단계 · build {단계: 끝나는 시각} · bags 로스팅실 원두 자루 · case 베이커리 진열장 · idle 지도 영구 단계 · safe 금고(떠난 동안 지점장이 쌓음) · tasks 순회 일감 · plants 화분 물 준 날 · time 머문 초 */
const fresh = () => ({ v: 2, coins: 150, hearts: 5, xp: 0, lv: 1, beans: 40, si: 0, stores: { 0: newStore() }, inv: {}, staff: {}, reg: {}, menuSold: {},
  day: '', sold: 0, soldBy: {}, orders: [], att: { last: '', streak: 0 }, coupon: null, set: { sfx: true, bgm: true }, last: Date.now(), id: Math.random().toString(36).slice(2, 10), tut: 0,
  fg: 0, art: {}, poem: { i: 0, n: 0 }, poems: [], jeong: 0, best: 0, cheer: { day: '', n: 0 }, owe: 0,
  /* 0.2.0 개편 */ boss: { walk: 0, hand: 0, tip: 0, greet: 0 }, ads: { day: '', n: 0 }, adp: { day: '', n: {} }, items: [], vipUntil: 0, inst: 0, apron: 'base', aprons: { base: 1 }, apronAd: {},
  theme: {}, gift: { day: '' }, season: { id: '', xp: 0, got: {} }, truck: { day: '', n: 0, best: 0 }, ostat: { day: '', jobs: {}, fit: 0, out: 0 }, earned: 0, maxSi: 0, done: {}, tip: {}, born: Date.now(), boostUntil: 0, moved: 0 });   /* 2026-10-28: cheer 응원 원두(하루 횟수) · owe 외상 원두값 */   /* 2026-10-27 추가: fg 손가락 안내 단계 · art 라떼아트 도감 · poem 오늘의 시 진행 · poems 완성한 시 · jeong 정성 한 잔 수 · best 최고 연속 */
export let S = fresh();
/* 저장 이사 v1 → v2: v1 의 모든 필드를 그대로 두고 새 필드 기본값만 채움 (매장 = 지점 · 지금 방 = 0단계 · 가구 좌표는 0단계 좌표 그대로) */
export function migrate(o) { const s = { ...o, v: 2, migratedFrom: 1, migratedAt: Date.now() }; s.stores = {}; for (const [i, st] of Object.entries(o.stores || {})) if (STORES[i]) s.stores[i] = { ...st, open: [0], build: {} }; if (!s.stores[0]) s.stores[0] = newStore();
  s.maxSi = Math.max(0, ...Object.keys(s.stores).map(Number)); if (s.fg == null && (s.xp || 0) > 0) s.fg = 3; return s; }
export function loadSave() {
  try { let s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!s) { const o = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); if (o && o.v === 1) { s = migrate(o); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* */ } } }
    if (s && s.v === 2) { S = Object.assign(fresh(), s); if (s.fg == null && (s.xp || 0) > 0) S.fg = 3; } } catch { /* 깨진 저장은 새로 · 예전 저장(손가락 안내 없던 때)은 안내를 건너뜀 */ }
  for (const k of ['stores', 'inv', 'staff', 'reg', 'menuSold', 'soldBy', 'att', 'art', 'poem', 'cheer', 'boss', 'ads', 'adp', 'aprons', 'apronAd', 'theme', 'gift', 'season', 'truck', 'ostat', 'done', 'tip']) if (!S[k] || typeof S[k] !== 'object' || Array.isArray(S[k])) S[k] = fresh()[k];
  if (!Array.isArray(S.items)) S.items = []; for (const k of ['walk', 'hand', 'tip', 'greet']) if (!Number.isFinite(S.boss[k])) S.boss[k] = 0; if (!S.adp.n || typeof S.adp.n !== 'object') S.adp.n = {};
  for (const k of ['vipUntil', 'inst', 'earned', 'maxSi', 'boostUntil', 'moved']) if (!Number.isFinite(S[k])) S[k] = 0;
  if (!Array.isArray(S.poems)) S.poems = []; for (const k of ['fg', 'jeong', 'best', 'owe']) if (!Number.isFinite(S[k])) S[k] = 0; if (!Number.isFinite(S.poem.i)) S.poem.i = 0; if (!Number.isFinite(S.poem.n)) S.poem.n = 0; if (!Number.isFinite(S.poem.p)) S.poem.p = 0;
  for (const [i, st] of Object.entries(S.stores)) { if (!STORES[i] || !st || typeof st !== 'object') { delete S.stores[i]; continue; } const n = newStore(); for (const k of Object.keys(n)) if (st[k] == null || typeof st[k] !== typeof n[k] || Array.isArray(st[k]) !== Array.isArray(n[k])) st[k] = n[k]; st.furn = st.furn.filter(f => f && FURN[f.id] && Number.isFinite(f.x + f.z));
    st.open = [...new Set([0, ...st.open.filter(x => Number.isInteger(x) && x >= 0 && x < 8)])].sort((a, b) => a - b); for (const k of Object.keys(st.build)) if (!(+k > 0 && +k < 8) || !Number.isFinite(st.build[k]) || st.open.includes(+k)) delete st.build[k]; }
  if (!S.stores[0]) S.stores[0] = newStore();
  for (const [k, v] of Object.entries(S.staff)) { const l = Math.round(Number(v)); if (!v) delete S.staff[k]; else S.staff[k] = Number.isFinite(l) ? Math.max(1, Math.min(5, l)) : 1; }   /* 2026-10-28: staff 값 = 단계(1~5) · 예전 저장의 1 = 1단계 */
  if (!S.stores[S.si]) S.si = 0; for (const k of ['coins', 'hearts', 'xp', 'beans']) if (!Number.isFinite(S[k])) S[k] = 0;
  S.lv = levelOf(S.xp); dayTick(); return S;
}
/* 처음부터 (2026-11-11 마루미 제보와 같은 구조 · 근본 수정): save() 가 0.4초 뒤 쓰는 타이머를 남겨, 처음부터 → reload 사이에 옛 판(S)을 다시 써 버렸음
   ① 이 판의 처음부터 시각(resetAt)을 저장에 적고, 모든 쓰기는 저장의 resetAt 이 내 것보다 새로우면 쓰지 않고 다시 엶 (남은 타이머 · 다른 탭)
   ② 걸린 타이머를 지우고 __noSave 먼저 ③ 원어데이 앱에 oad:reset → 계정 저장도 새 판으로 덮어 올림 (직전본은 서버에 남음)
   키를 지우지 않고 새 판 · 지움 표시로 덮음 — 지우면 원어데이 클라우드가 옛 저장을 다시 내려받을 수 있음 */
let tm = null;
const staleHere = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return !!(v && +v.resetAt > (+S.resetAt || 0)); } catch { return false; } };
function write() {
  if (window.__noSave) return;
  if (staleHere()) { window.__noSave = true; clearTimeout(tm); try { location.reload(); } catch { /* */ } return; }
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 저장 공간 없음 */ } }
export function resetAll() { window.__noSave = true; clearTimeout(tm); tm = null;
  const n = fresh(); n.resetAt = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(n)); localStorage.setItem(OLD_KEY, JSON.stringify({ v: 0, reset: n.resetAt })); } catch { /* */ }
  try { if (parent !== window) parent.postMessage({ type: 'oad:reset' }, '*'); } catch { /* 단독 실행 */ } }
export function save(now) { if (window.__noSave) return; S.last = Date.now(); clearTimeout(tm); if (now) write(); else tm = setTimeout(write, 400); }
export const ST = () => S.stores[S.si];
export const levelOf = xp => { let l = 1; for (let i = 1; i < XP.length; i++) if (xp >= XP[i]) l = i + 1; return l; };
// 하루가 바뀌면: 판매 수 · 주문서 3장 · 쿠폰
export function dayTick() {
  if (S.day === today()) return; S.day = today(); S.sold = 0; S.soldBy = {}; S.coupon = null;
  let h = 0; for (const c of S.id + S.day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pool = ORDER_POOL.slice(); S.orders = [];
  for (let i = 0; i < 3 && pool.length; i++) { const o = pool.splice((h >>> (i * 5)) % pool.length, 1)[0]; S.orders.push({ ...o, done: false }); }
}
export const couponReady = () => S.sold >= COUPON.goal && !S.coupon;
export function claimCoupon() { if (!couponReady()) return null; let h = 0; for (const c of S.id + S.day) h = (h * 31 + c.charCodeAt(0)) >>> 0; S.coupon = { code: 'GSC-' + S.day.slice(5).replace('-', '') + '-' + (h % 100000).toString().padStart(5, '0'), at: Date.now() }; save(true); return S.coupon; }
