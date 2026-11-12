// 저장 (localStorage 'marumi_v4' · 기준판 재정비 0.5.0 — 모양은 기준판 v1 과 같음): 돈 · 지점별 열린 것/직원/칸에 부은 돈 · 강화 · 오늘 판 개수(쿠폰) · 미션 · 출석
//   처음 열 때 한 번 옮김(옛 키는 지우지 않음 · 되돌리기용): v3(0.4.x 테스터) → v2(0.3.x) → v1(0.2 · 지인 주소 판 — 모양이 같아 그대로)
//   옮기는 원칙: 돈 손해 0(없어진 칸 · 방에 낸 값 · 부어 둔 돈 · 금고는 돈으로) · 진행률은 줄지 않게(모자라면 여는 순서대로 다음 칸을 열어 줌)
import { COUPON, BRANCHES } from './data.js?v=0.99.36';
export const KEY = 'marumi_v4', OLD = ['marumi_v3', 'marumi_v2', 'marumi_v1'];
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fresh = () => ({ v: 4, coins: 0, earned: 0, bi: 0, branch: {}, up: {}, day: '', sold: 0, totalSold: 0, coupon: null, miss: {}, missDone: {}, set: { sfx: true, bgm: true }, last: Date.now(), id: Math.random().toString(36).slice(2, 10), seen: {}, mast: {}, deco: {}, reg: {}, boostUntil: 0, fx: {}, ads: { day: '', n: 0 }, gift: '', outfit: 'basic', outfits: ['basic'], decoPos: {} });
export let S = fresh();
// ── 옛 저장 옮기기
const SLOTS = i => BRANCHES[i].slots.filter(s => !s.free);   /* 진행률을 세는 칸 (기준판 진행 막대와 같음) */
const prog = (i, unl) => { const L = SLOTS(i); return L.filter(s => unl.has(s.id)).length / L.length; };
const HIRE = { cashier: 'cashier', dougher: 'dougher', baker: 'baker', topper: 'topper', fridge: 'fridge', cleaner: 'cleaner', driver: 'driver' };   /* 기준판 뽑기 칸 id = 직원 이름 */
/* 진행률이 옛 판보다 낮으면 여는 순서대로(싼 것부터) 다음 칸을 열어 줌 · 뽑기 칸은 직원 · 들기/걷기 칸은 강화도 같이 */
function fillTo(i, b, unl, p0, up) { for (const s of SLOTS(i)) { if (prog(i, unl) >= p0 - 1e-9) break; if (s.type === 'next' || unl.has(s.id)) continue; unl.add(s.id); } finish(b, unl, up); }
function finish(b, unl, up) { b.unl = [...unl]; b.staff = [...new Set([...(b.staff || []), ...b.unl.filter(id => HIRE[id])])]; for (const id of b.unl) if (id === 'carry' || id === 'speed') up[id] = 1; }
/* v3 (0.4.x) — 칸 이름표: 0.4.5 지점 순서표(ee9933ea space.js)에서 뽑은 1호점 값 · 지점 배수 ×4 · ×14 · ×45 */
const V3_MULT = [1, 4, 14, 45];
const V3_GONE = { crew: 60, boss: 100, store: 900, bar: 900, t5: 600, t6: 1100, 'walk+2': 500, 'walk+3': 1800, 'carry+2': 1100, 'carry+3': 2200, up2: 2200, server: 1400, terrace: 2200, retard: 2600, cleaner2: 1400 };   /* 기준판에 없는 것 → 낸 값을 돈으로 */
const V3_TO = { kettle: 'kettle', top: 'cc', cream: 'coffee', coffee: 'espresso', cashier: 'cashier', runner: 'baker', baker: 'dougher', topper: 'topper', barista: 'fridge', cleaner: 'cleaner', pickup: 'drive', drive: 'drive', picker: 'driver', driver: 'driver' };
const V3_LV = { oven: 'oven', mixer: 'mixer', kettle: 'kettle', top: 'bar', cream: 'fridge', coffee: 'espresso', ads: 'ads', price: 'price' };
const V3_COUNT = new Set('ads+1 ads+2 baker bar barista boss carry+1 carry+2 carry+3 cashier cleaner cleaner2 coffee coffee+1 coffee+2 counter cream cream+1 cream+2 crew door drive driver kettle kettle+1 kettle+2 mixer mixer+1 mixer+2 oven oven+1 oven+2 oven+3 oven+4 picker pickup retard runner server store t1 t2 t3 t4 t5 t6 terrace top top+1 top+2 topper up2 walk+1 walk+2 walk+3'.split(' ')), V3_N = [48, 48, 48, 49];   /* 0.4.5 진행률을 세는 칸 (지점마다 next 뺀 수) */
export function migrate3(o) {
  const n = carry(o), up = n.up; let refund = (+o.safe?.v || 0), gone = [];   /* 0.4 금고(쉬는 동안 번 돈)도 돈으로 */
  for (const [k, b0] of Object.entries(o.branch || {})) { const i = +k; if (!BRANCHES[i] || !b0) continue; const own = new Set(Array.isArray(b0.own) ? b0.own : []), unl = new Set(), b = { unl: [], staff: [], paid: {}, lv: {}, slv: {}, idleAt: b0.idleAt, lvFrom: i || undefined };
    const lvOf = a => { let m = 0; for (const id of own) { const [x, y] = id.split('+'); if (x === a && y) m = Math.max(m, +y || 0); } return m; };
    const tables = ['t1', 't2', 't3', 't4', 't5', 't6'].filter(t => own.has(t)).length; for (let t = 1; t <= Math.min(4, tables); t++) unl.add('t' + t);
    for (const id of own) { const to = V3_TO[id]; if (to) { unl.add(to); if (to === 'driver') unl.add('drive'); } else if (V3_GONE[id] != null && !(/^t[56]$/.test(id) && tables <= 4)) { refund += V3_GONE[id] * V3_MULT[i]; gone.push(`${i + 1}:${id}`); } }
    for (let t = 5; t <= tables; t++) { refund += V3_GONE['t' + t] * V3_MULT[i]; gone.push(`${i + 1}:t${t}`); }
    for (const [a, t] of Object.entries(V3_LV)) { const v = Math.min(10, lvOf(a)); if (v) b.lv[t] = v; }
    if (lvOf('walk') >= 1) unl.add('speed'); if (lvOf('carry') >= 1) unl.add('carry');
    const sl = Math.min(10, Math.max(lvOf('swalk'), lvOf('scarry')));
    for (const v of Object.values(b0.paid || {})) refund += +v || 0;   /* 부어 두기만 한 돈은 모두 돌려줌 */
    if (i < (+o.maxBi || 0) || own.has('next')) unl.add('next');
    fillTo(i, b, unl, [...own].filter(id => V3_COUNT.has(id)).length / V3_N[i], up);
    if (sl) for (const s of b.staff) b.slv[s] = sl;
    n.branch[i] = b; }
  n.coins = Math.round(n.coins + refund); n.migrated = { from: 3, at: Date.now(), refund: Math.round(refund), gone, goldItems: [...(o.items || []), ...(+o.vipUntil > Date.now() ? ['vip'] : []), ...(+o.inst ? [`inst×${o.inst}`] : [])] };
  return n; }
/* v2 (0.3.x) — 칸 값은 0.4.5 state.js V2_SLOTS(0.3.x layout.js 에서 뽑은 것)와 같음 · id 는 대부분 기준판과 같음 (방 = R_*) */
const V2_SLOTS = [{"t1":30,"cashier":100,"R_dough":140,"dougher":170,"R_crew":310,"R_cream":220,"R_hall":310,"baker":450,"R_boss":660,"coffee":690,"topper":880,"R_cafe":600,"t3":1030,"fridge":1450,"kettle":1770,"t4":1840,"cleaner":2320,"R_store":1520,"R_pickup":3370,"driver":3240},{"t1":310,"cashier":990,"R_dough":1400,"dougher":1730,"R_crew":3120,"R_boss":5740,"R_cream":2290,"topper":7790,"R_hall":3440,"baker":4890,"R_up2":25430,"server":22890,"coffee":7670,"R_cafe":6430,"fridge":14880,"t3":11340,"kettle":18810,"R_store":15090,"u2":31100,"t4":20590,"cleaner":25890},{"t1":1370,"cashier":4370,"R_dough":6180,"dougher":7620,"R_crew":13750,"R_boss":25290,"R_cream":10100,"topper":34320,"baker":20670,"coffee":30160,"R_cafe":25400,"fridge":58980,"R_drive":120770,"driver":116780,"rider":129470,"R_store":62450,"R_hall":20270,"t3":53210,"kettle":88130,"t4":90740,"cleaner":114090},{"t1":4410,"cashier":14100,"R_dough":19980,"dougher":24680,"R_crew":44650,"R_boss":82250,"R_terrace":308450,"retard":258510,"R_cream":36030,"topper":122200,"baker":73440,"coffee":106930,"R_cafe":89890,"fridge":208370,"R_store":198780,"p2":411260,"R_hall":66780,"t3":175470,"kettle":290820,"t4":299640,"cleaner":376990}];
const V2_TO = { t1: 't1', t2: 't2', t3: 't3', t4: 't4', kettle: 'kettle', cc: 'cc', coffee: 'coffee', espresso: 'espresso', R_cream: 'cc', R_cafe: 'espresso', R_hall: 't2', R_pickup: 'drive', R_drive: 'drive', drive: 'drive', cashier: 'cashier', dougher: 'dougher', baker: 'baker', topper: 'topper', fridge: 'fridge', cleaner: 'cleaner', driver: 'driver', rider: 'driver', carry: 'carry', speed: 'speed' };
const V2_LV = ['oven', 'ovenCap', 'mixer', 'kettle', 'bar', 'fridge', 'espresso', 'price', 'ads', 'tip'];
export function migrate2(o) {
  const n = carry(o), up = n.up; let refund = 0, gone = [];
  for (const [k, b0] of Object.entries(o.branch || {})) { const i = +k; if (!BRANCHES[i] || !b0) continue; const old = new Set(Array.isArray(b0.unl) ? b0.unl : []), unl = new Set(), b = { unl: [], staff: [], paid: {}, lv: {}, slv: {}, idleAt: b0.idleAt, lvFrom: i || undefined };
    for (const id of old) { const to = V2_TO[id]; if (to) { unl.add(to); if (to === 'driver') unl.add('drive'); } else if (V2_SLOTS[i]?.[id] != null && id !== 'R_dough') { refund += V2_SLOTS[i][id]; gone.push(`${i + 1}:${id}`); } }
    for (const s of b0.staff || []) if (HIRE[s]) unl.add(s);
    for (const a of V2_LV) { const v = Math.min(10, +b0.lv?.[a] || 0); if (v) b.lv[a] = v; } if (+b0.lv?.walk) unl.add('speed'); if (+b0.lv?.carry) unl.add('carry');
    const sl = Math.min(10, Math.max(+b0.lv?.swalk || 0, +b0.lv?.scarry || 0, ...Object.values(b0.slv || {}).map(v => +v || 0)));
    for (const v of Object.values(b0.paid || {})) refund += +v || 0;
    if (i < (+o.maxBi || 0)) unl.add('next');
    const T = V2_SLOTS[i] || {}, ids = Object.keys(T); fillTo(i, b, unl, ids.length ? ids.filter(id => old.has(id)).length / ids.length : 0, up);
    if (sl) for (const s of b.staff) b.slv[s] = sl;
    n.branch[i] = b; }
  n.coins = Math.round(n.coins + refund); n.migrated = { from: 2, at: Date.now(), refund: Math.round(refund), gone };
  return n; }
/* 지점 밖 공통 값은 그대로 (돈 · 번 돈 · 오늘 판매 · 미션 · 단골 · 숙련 · 꾸미기 · 유니폼(게임 돈) · 설정 · 시간 효과) */
function carry(o) { const n = fresh(); for (const k of ['coins', 'earned', 'bi', 'maxBi', 'day', 'sold', 'totalSold', 'coupon', 'miss', 'missDone', 'set', 'id', 'mast', 'deco', 'reg', 'boostUntil', 'fx', 'ads', 'gift', 'outfit']) if (o[k] != null) n[k] = o[k];
  n.outfits = Array.isArray(o.outfits) ? o.outfits.filter(x => ['basic', 'orange', 'cream', 'brown', 'navy', 'black'].includes(x)) : ['basic']; n.coins = Number.isFinite(+n.coins) ? +n.coins : 0;
  n.bi = Math.max(0, Math.min(3, +n.bi || 0)); n.maxBi = Math.max(+o.maxBi || 0, n.bi); n.up = {}; return n; }
const real = v => v && typeof v === 'object' && v.v >= 1;   /* {v:0, reset} = 0.4 「처음부터」가 덮은 표시 → 없는 것으로 */
export function loadSave() {
  try { const rd = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
    let s = rd(KEY); if (!real(s)) s = OLD.map(rd).find(real) || null;   /* v4 가 없으면 가장 새 옛 저장 (v3 → v2 → v1) */
    if (real(s) && s.v !== 4) { s = s.v === 3 ? migrate3(s) : s.v === 2 ? migrate2(s) : s.v === 1 ? { ...s, v: 4 } : null; if (s) localStorage.setItem(KEY, JSON.stringify(s)); }   /* 슬롯에서 불러온 옛 판도 같은 길 */
    if (real(s) && s.v === 4) S = Object.assign(fresh(), s); } catch { /* */ }
  for (const b of Object.values(S.branch || {})) { b.unl = Array.isArray(b.unl) ? b.unl : []; b.staff = (Array.isArray(b.staff) ? b.staff : []).filter((k, i, a) => a.indexOf(k) === i); b.paid ||= {}; }   /* 옛 버전 저장 정리 */
  for (const k of ['mast', 'deco', 'reg']) if (!S[k] || typeof S[k] !== 'object') S[k] = {};
  for (const [k, v] of Object.entries(S.deco)) if (!Array.isArray(v)) delete S.deco[k];
  for (const k of ['fx', 'decoPos', 'up']) if (!S[k] || typeof S[k] !== 'object') S[k] = {};
  if (!S.ads || typeof S.ads !== 'object') S.ads = { day: '', n: 0 }; if (!Array.isArray(S.outfits)) S.outfits = ['basic']; if (!S.outfits.includes(S.outfit)) S.outfit = 'basic';
  if (!Number.isFinite(S.coins)) S.coins = 0; dayTick(); return S; }
/* 처음부터 (0.4.5 state.js 의 쓰기 한 곳 · 초기화 시각을 고쳐서 가져옴 — 11-11 대표 제보 「처음부터 했는데 예전 판으로 열림」)
   원인(기준판에도 같음): save() 가 0.4초 뒤에 쓰는 타이머를 남김 → 처음부터가 저장을 지우고 reload 를 걸어도, 새 페이지 전에 그 타이머가 메모리의 옛 판을 다시 씀
   막는 법: ① 새 판에 「처음부터 시각」(resetAt)을 적고, 모든 쓰기는 저장에 적힌 resetAt 이 내 것보다 새로우면 쓰지 않고 다시 엶(남은 타이머 · 다른 탭)
            ② 걸린 타이머를 지우고 __noSave 를 먼저 켬 ③ 원어데이 앱에 oad:reset → 계정 저장도 새 판으로
            ④ 옛 키(v3 · v2 · v1)는 지우지 않고 「지움 표시」로 덮음 — 지우면 클라우드가 옛 저장을 다시 내려받아 이사로 되살아날 수 있음 */
let tm = null;
const staleHere = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return !!(v && +v.resetAt > (+S.resetAt || 0)); } catch { return false; } };
function write() { if (window.__noSave) return;
  if (staleHere()) { window.__noSave = true; clearTimeout(tm); try { location.reload(); } catch { /* */ } return; }
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* */ } }
export function resetAll() { window.__noSave = true; clearTimeout(tm); tm = null;
  const n = fresh(); n.resetAt = Date.now(); const tomb = JSON.stringify({ v: 0, reset: n.resetAt }); try { localStorage.setItem(KEY, JSON.stringify(n)); for (const k of OLD) localStorage.setItem(k, tomb); } catch { /* */ }
  try { if (parent !== window) parent.postMessage({ type: 'oad:reset' }, '*'); } catch { /* 단독 실행 */ } }
export function save(now) { if (window.__noSave) return; S.last = Date.now(); clearTimeout(tm); if (now) write(); else tm = setTimeout(write, 400); }
export function dayTick() { if (S.day !== today()) { S.day = today(); S.sold = 0; S.coupon = null; S.miss = {}; S.missDone = {}; } }
export function addSold(n) { dayTick(); S.sold += n; S.totalSold += n; mission('sell', n); save(); }
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
export const mult = () => BRANCHES[S.bi]?.mult || 1;   /* 미션 보상 배수 = 지점 배수 (0.6.0: 기준판은 [1, 4, 14] 라 4호점이 1배였음) */
