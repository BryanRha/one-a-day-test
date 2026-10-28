// 저장 (localStorage 'gamsung_v1'): 돈 · 마음 · 경험치 · 원두 · 매장별 가구/머신/진열 · 동료 · 단골 · 오늘(판매·주문서·출석·쿠폰)
import { XP, ORDER_POOL, COUPON, FURN } from './data.js?v=0.83.0';
const KEY = 'gamsung_v1';
/* 시계: 시험용 배속(?speed)일 때 머신·로스터 시간도 같이 빨라지게 */
let skew = 0; export const now = () => Date.now() + skew; export const addSkew = ms => { skew += ms; };
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/* 첫 가게: 2인 테이블 둘 · 창가 1인석 · 올리브 화분 · 나무 메뉴판 */
export const START_FURN = () => [
  { uid: 1, id: 'table2', x: -250, z: 150, r: 0 }, { uid: 2, id: 'table2', x: 150, z: 150, r: 0 },
  { uid: 3, id: 'window', x: -650, z: 450, r: 0 }, { uid: 4, id: 'plant', x: 550, z: 550, r: 0 },
];
export const newStore = () => ({ furn: START_FURN(), wall: { 1: 'board' }, mach: {}, roast: null, bar: {}, dirty: {}, uid: 10, coinsAt: {} });   /* coinsAt: 테이블에 남은 찻값 (가구 uid_자리) */
const fresh = () => ({ v: 1, coins: 150, hearts: 5, xp: 0, lv: 1, beans: 40, si: 0, stores: { 0: newStore() }, inv: {}, staff: {}, reg: {}, menuSold: {},
  day: '', sold: 0, soldBy: {}, orders: [], att: { last: '', streak: 0 }, coupon: null, set: { sfx: true, bgm: true }, last: Date.now(), id: Math.random().toString(36).slice(2, 10), tut: 0,
  fg: 0, art: {}, poem: { i: 0, n: 0 }, poems: [], jeong: 0, best: 0, cheer: { day: '', n: 0 }, owe: 0 });   /* 2026-10-28: cheer 응원 원두(하루 횟수) · owe 외상 원두값 */   /* 2026-10-27 추가: fg 손가락 안내 단계 · art 라떼아트 도감 · poem 오늘의 시 진행 · poems 완성한 시 · jeong 정성 한 잔 수 · best 최고 연속 */
export let S = fresh();
export function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.v === 1) { S = Object.assign(fresh(), s); if (s.fg == null && (s.xp || 0) > 0) S.fg = 3; } } catch { /* 깨진 저장은 새로 · 예전 저장(손가락 안내 없던 때)은 안내를 건너뜀 */ }
  for (const k of ['stores', 'inv', 'staff', 'reg', 'menuSold', 'soldBy', 'att', 'art', 'poem', 'cheer']) if (!S[k] || typeof S[k] !== 'object') S[k] = fresh()[k];
  if (!Array.isArray(S.poems)) S.poems = []; for (const k of ['fg', 'jeong', 'best', 'owe']) if (!Number.isFinite(S[k])) S[k] = 0; if (!Number.isFinite(S.poem.i)) S.poem.i = 0; if (!Number.isFinite(S.poem.n)) S.poem.n = 0; if (!Number.isFinite(S.poem.p)) S.poem.p = 0;
  for (const st of Object.values(S.stores)) { const n = newStore(); for (const k of Object.keys(n)) if (st[k] == null || typeof st[k] !== typeof n[k]) st[k] = n[k]; st.furn = st.furn.filter(f => f && FURN[f.id] && Number.isFinite(f.x + f.z)); }
  for (const [k, v] of Object.entries(S.staff)) { const l = Math.round(Number(v)); if (!v) delete S.staff[k]; else S.staff[k] = Number.isFinite(l) ? Math.max(1, Math.min(5, l)) : 1; }   /* 2026-10-28: staff 값 = 단계(1~5) · 예전 저장의 1 = 1단계 */
  if (!S.stores[S.si]) S.si = 0; for (const k of ['coins', 'hearts', 'xp', 'beans']) if (!Number.isFinite(S[k])) S[k] = 0;
  S.lv = levelOf(S.xp); dayTick(); return S;
}
let tm = null;
export function save(now) { if (window.__noSave) return; S.last = Date.now(); clearTimeout(tm); const f = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 저장 공간 없음 */ } }; if (now) f(); else tm = setTimeout(f, 400); }
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
