// 저장 (localStorage 'marumi_v2' · 0.3.0 매장 확장): 돈 · 지점별 열린 칸/방/공사/직원/칸에 부은 돈 · 강화 · 오늘 판 개수(쿠폰) · 미션 · BM(VIP · 금고 · 광고 바구니 · 시즌 패스)
//   예전 저장 'marumi_v1'(0.2.0 까지)은 처음 열 때 한 번 옮김(migrate) — 돈 · 지점 진행 · 꾸미기 · 단골 · 유니폼 그대로, 열린 칸은 새 방 배치로 · 옛 키는 지우지 않음(되돌리기용)
import { COUPON, BRANCHES, SEASON } from './data.js?v=0.99.19';
export const KEY = 'marumi_v2', OLD = 'marumi_v1';
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fresh = () => ({ v: 2, coins: 0, earned: 0, bi: 0, maxBi: 0, branch: {}, day: '', sold: 0, totalSold: 0, coupon: null, miss: {}, missDone: {}, set: { sfx: true, bgm: true }, last: Date.now(), id: Math.random().toString(36).slice(2, 10), seen: {}, mast: {}, deco: {}, reg: {}, boostUntil: 0, fx: {}, ads: { day: '', n: 0 }, gift: '', outfit: 'basic', outfits: ['basic'], decoPos: {},
  born: Date.now(), vipUntil: 0, vipBox: '', manager: false, safe: { v: 0 }, adp: { day: '', n: {} }, outfitAd: { id: '', n: 0, day: '' }, items: [], theme: {}, inst: 0, pass: { id: '', xp: 0, free: [], paid: [] }, setsFree: 0, sales: { day: '', n: {} }, time: {}, hudSeen: {}, starter: false });
/* 0.3.0: born 처음 연 시각(스타터 7일) · vipUntil VIP 끝 · vipBox VIP 상자 받은 날 · manager 베테랑 점장 · safe 사장실 금고(쉬는 동안 번 돈) · adp 광고 자리별 오늘 횟수 · outfitAd 광고 3편 유니폼 진행
   items 골드로 산 영구 상품(기기 쪽 사본 · 원어데이 hello().items 와 합침) · theme[지점] 테마 세트 · inst 즉시 완성권 · pass 시즌 패스 · setsFree 단골 ♥5 로 받은 테마 수 · sales 오늘 메뉴별 판매(bg_sold) · time 지점별 머문 초(bg_time)
   지점: branch[i] = { unl 열린 칸 · staff · paid · lv(설비 + 방 강화: walk carry price tip ads swalk scarry) · build{칸: 끝 시각} · idleUp · idleAd · stock · idleAt · lvFrom } */
export let S = fresh();
// ── 예전 저장 옮기기 (v1 → v2): 옛 칸 이름 → 새 방 배치
const ROOM_OF = { mixer: 'R_dough', cc: 'R_cream', coffee: 'R_cream', espresso: 'R_cafe', t2: 'R_hall', t3: 'R_hall', t4: 'R_hall' };
export function migrate(o) {
  const n = Object.assign(fresh(), o, { v: 2 }); n.decoPos = {};   /* 꾸미기는 그대로 갖고, 자리는 새 배치의 기본 자리로 */
  n.branch = {}; let refund = 0;
  for (const [k, b0] of Object.entries(o.branch || {})) { const i = +k, B = BRANCHES[i]; if (!B || !b0) continue;
    const old = new Set(Array.isArray(b0.unl) ? b0.unl : []), unl = new Set(['oven', 'counter', 'bin']), ids = new Set(B.slots.map(s => s.id));
    for (const id of old) { if (id === 'carry' || id === 'speed' || id === 'next' || ['oven', 'counter', 'bin'].includes(id)) continue;
      let to = id; if (id === 'drive') to = B.feature === 'pickup' || B.feature === 'drive' ? 'drive' : B.feature === 'up2' ? 'u1' : 'p1';
      if (id === 'driver') to = B.feature === 'up2' ? 'server' : ids.has('driver') ? 'driver' : null;
      if (!to || !ids.has(to)) continue; unl.add(to); if (ROOM_OF[to]) unl.add(ROOM_OF[to]);
      if (to === 'drive' || to === 'u1' || to === 'p1') unl.add('R_' + B.feature); }
    for (const s of B.slots) if (s.withRoom && unl.has(s.withRoom)) unl.add(s.id);   /* 방과 함께 열리는 설비 */
    const staff = (Array.isArray(b0.staff) ? b0.staff : []).map(x => x === 'driver' && B.feature === 'up2' ? 'server' : x).filter((x, j, a) => a.indexOf(x) === j && unl.has(B.slots.find(s => s.staff === x)?.id || '_'));
    const paid = {}; for (const [id, v] of Object.entries(b0.paid || {})) { if (ids.has(id) && !unl.has(id)) paid[id] = v; else refund += +v || 0; }   /* 없어진 칸에 부어 둔 돈은 돌려줌 */
    const lv = { ...(b0.lv || {}) }; const t = Math.max(lv.tip || 0, lv.ads || 0); if (t) { lv.tip = t; lv.ads = t; }
    if (o.up && o.up.carry) lv.carry = Math.max(lv.carry || 0, 4); if (o.up && o.up.speed) lv.walk = Math.max(lv.walk || 0, 5);   /* 예전 「더 많이 들기」(6→10) · 「빨리 걷기」(×1.3) */
    const sl = Object.values(b0.slv || {}).map(Number).filter(Number.isFinite); if (sl.length) { const m = Math.max(...sl); lv.swalk = Math.max(lv.swalk || 0, m); lv.scarry = Math.max(lv.scarry || 0, m); }
    n.branch[i] = { unl: [...unl], staff, paid, lv, build: {}, stock: b0.stock || null, idleAt: b0.idleAt, lvFrom: b0.lvFrom, idleUp: 0, idleAd: 0 }; }
  n.coins = (Number.isFinite(+o.coins) ? +o.coins : 0) + Math.round(refund); n.maxBi = Math.max(+o.maxBi || 0, +o.bi || 0); n.migrated = { from: 1, at: Date.now(), refund: Math.round(refund) };
  delete n.up; return n; }
export function loadSave() {
  try { let s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!s) { const o = JSON.parse(localStorage.getItem(OLD) || 'null'); if (o && o.v === 1) { s = migrate(o); localStorage.setItem(KEY, JSON.stringify(s)); } }
    if (s && s.v === 2) S = Object.assign(fresh(), s); } catch { /* */ }
  for (const b of Object.values(S.branch || {})) { b.unl = Array.isArray(b.unl) ? b.unl : []; b.staff = (Array.isArray(b.staff) ? b.staff : []).filter((k, i, a) => a.indexOf(k) === i); b.paid ||= {}; if (!b.build || typeof b.build !== 'object') b.build = {}; b.idleUp = Math.max(0, Math.min(5, +b.idleUp || 0)); b.idleAd = +b.idleAd || 0; }   /* 망가진 저장 정리 */
  for (const k of ['mast', 'deco', 'reg', 'fx', 'decoPos', 'theme', 'time']) if (!S[k] || typeof S[k] !== 'object' || Array.isArray(S[k])) S[k] = {};
  for (const [k, v] of Object.entries(S.deco)) if (!Array.isArray(v)) delete S.deco[k];
  if (!S.ads || typeof S.ads !== 'object') S.ads = { day: '', n: 0 }; if (!S.adp || typeof S.adp.n !== 'object') S.adp = { day: '', n: {} }; if (!Array.isArray(S.outfits)) S.outfits = ['basic'];
  if (!Array.isArray(S.items)) S.items = []; if (!S.safe || !Number.isFinite(+S.safe.v)) S.safe = { v: 0 }; if (!S.pass || typeof S.pass !== 'object') S.pass = { id: '', xp: 0, free: [], paid: [] };
  if (!S.outfitAd || typeof S.outfitAd !== 'object') S.outfitAd = { id: '', n: 0, day: '' };
  for (const k of ['coins', 'earned', 'vipUntil', 'inst', 'born']) if (!Number.isFinite(+S[k])) S[k] = k === 'born' ? Date.now() : 0;
  if (S.vipUntil > Date.now() + 28 * 864e5) S.vipUntil = Date.now() + 28 * 864e5;   /* 시계를 앞으로 돌려도 최대 28일 */
  dayTick(); return S; }
let tm = null;
export function save(now) { if (window.__noSave) return; S.last = Date.now(); clearTimeout(tm); const f = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* */ } }; if (now) f(); else tm = setTimeout(f, 400); }
export function dayTick() { if (S.day !== today()) { S.day = today(); S.sold = 0; S.coupon = null; S.miss = {}; S.missDone = {}; } }
export function addSold(n) { dayTick(); S.sold += n; S.totalSold += n; mission('sell', n); passXp(n); save(); }
export const couponReady = () => S.sold >= COUPON.goal && !S.coupon;
// 쿠폰 번호: 날짜 + 기기 → 매장에서 확인 (형식은 트렌차이즈와 정함)
export function claimCoupon() { if (!couponReady()) return null; let h = 0; for (const c of S.id + S.day) h = (h * 31 + c.charCodeAt(0)) >>> 0; S.coupon = { code: 'MRM-' + S.day.slice(5).replace('-', '') + '-' + (h % 100000).toString().padStart(5, '0'), at: Date.now() }; save(true); return S.coupon; }
export const MISSIONS = [
  { id: 'sell', name: '베이글 50개 팔기', goal: 50, coins: 300 }, { id: 'serve', name: '손님 20명 받기', goal: 20, coins: 250 }, { id: 'clean', name: '쓰레기 15개 치우기', goal: 15, coins: 200 },
  { id: 'unlock', name: '새로운 것 2개 열기', goal: 2, coins: 400 }, { id: 'dough', name: '반죽 10개 오븐에 넣기', goal: 10, coins: 350 }, { id: 'coins', name: '돈 3,000 모으기', goal: 3000, coins: 500 },
];
export function mission(id, n = 1) { dayTick(); S.miss[id] = (S.miss[id] || 0) + n; }
export const missionReady = () => MISSIONS.some(m => (S.miss[m.id] || 0) >= m.goal && !S.missDone[m.id]);
export function claimMission(id) { const m = MISSIONS.find(x => x.id === id); if (!m || S.missDone[id] || (S.miss[id] || 0) < m.goal) return 0; S.missDone[id] = 1; const v = m.coins * mult(); S.coins += v; save(); return v; }
export const mult = () => BRANCHES[S.bi]?.mult || 1;
// VIP · 소유 상품
export const vipOn = () => (+S.vipUntil || 0) > Date.now();
export const has = id => S.items.includes(id);
// 시즌 패스 XP = 시즌 동안 판 베이글 (시즌이 바뀌면 새로)
export function passXp(n) { if (S.pass.id !== SEASON.id) S.pass = { id: SEASON.id, xp: 0, free: [], paid: [] }; const d = today(); if (d >= SEASON.from && d <= SEASON.to) S.pass.xp += n; }
