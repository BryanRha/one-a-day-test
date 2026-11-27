// 이용 규칙 + 저장. BM 이 정해지면 RULES 값만 바꾸면 되도록 분리해 둠.
import { LAUNCH, GAMES, ORDER as ORDER0, DAILY as DAILY0, BRAND as BRAND0, RETIRED, RATING, BRAND_COUPON_PROD, BRAND_COUPON_TEST, PROD_LIVE } from './catalog.js?v=0.99.82';

// 환경: 빌드가 심은 window.OAD_ENV (dev · test · prod) — 없으면(옛 캐시 등) 주소로 판단
export const ENV = (typeof window !== 'undefined' && window.OAD_ENV) || (/^(www\.)?oneaday\.kr$/.test(location.hostname) ? 'prod' : 'dev');
export const PROD = ENV === 'prod';
// 실서버에서 '모든 게임 무료'를 켤지 — 2026-10-28 대표: 끔(하루 한 게임) → 2026-11-16 켬: 대표 "실서버에서 광고 꺼" + 골드 충전 닫음(총괄)이라 다른 게임을 열 길이 없음 → 첫 공개는 실서버 게임 전부 무료 · 광고나 골드 판매가 열리면 다시 정함
//   테스트 · 개발에서는 설정의 '테스트: 하루 한 게임 규칙' 버튼으로 바꿔 볼 수 있음 (실서버에서는 버튼이 없음)
//   → 2026-11-24 대표: "실서버 빌드에서 빠져 있는 BM 을 테스트 서버와 똑같이 되살려" (원스토어 결제 모듈을 붙이는 바탕) → 하루 한 게임 · 광고 · 골드 판매 모두 테스트와 같게
/* 실서버 BM 스위치 하나: false = 테스트와 같은 BM(하루 한 게임 무료 · 나머지는 광고 · 골드 · BM 실험 그룹 A/B/C · 도장 광고 보충)
   true = 11-16 첫 공개 모습(모든 게임 무료 · 광고 끔 · 그룹 A 고정) · 서버 server/api/_lib/gold.js GOLD_SALE_PROD 와 반대 값이어야 함(build.mjs 확인)
   광고 · 결제를 실제로 처리하는 곳은 provider.js 한 곳 (일반 브라우저 = 원어데이 테스트 광고 · 토스 / 원스토어 안 = 원스토어 광고 · 인앱결제) */
export const PROD_BM_OFF = false;
export const BM_OFF = PROD && PROD_BM_OFF;
export const PROD_OPEN_ALL = PROD_BM_OFF;
/* 너랑(AI 웹소설) 실서버 공개 스위치 하나 (2026-11-24 대표 "너랑도 열어야지"): true = 실서버도 테스트와 같이 너랑 탭 · 오늘 허브 너랑 카드 · 너랑 화면을 엶
   false = '곧 공개돼요' 안내만 · 서버 server/api/story.js NR_PROD 와 같은 값이어야 함(build.mjs 확인) · 날짜 옮기기 같은 테스트 장치는 이 스위치와 상관없이 실서버에서 늘 꺼짐 */
export const PROD_NR_OPEN = true;
export const NR_OFF = PROD && !PROD_NR_OPEN;
// 실서버 노출: 테스트를 통과해 대표가 지정한 게임(catalog.js PROD_LIVE)만 · 테스트 · 개발은 전부 (2026-11-16)
export const shown = id => !PROD || PROD_LIVE.includes(id);
export const DAILY = DAILY0.filter(shown), ORDER = ORDER0.filter(shown), BRAND = BRAND0.filter(shown);
// 게임에 알려 주는 스위치 (hello() 응답) — coupon: 브랜드 매장 쿠폰 발급 (실서버는 계약 · 게임위 자문 전까지 끔)
export const FLAGS = { env: ENV, coupon: PROD ? BRAND_COUPON_PROD : BRAND_COUPON_TEST };

export const RULES = {
  openAll: PROD ? PROD_OPEN_ALL : (() => { try { return localStorage.getItem('oad_strict') === '0'; } catch { return false; } })(),   // 2026-10-28 대표: 테스트도 서비스 상태(하루 한 게임)가 기본 · 설정의 '테스트: 하루 한 게임 규칙'을 끄면 모든 게임 자유 플레이
  todayFree: true,          // 오늘의 게임은 하루 종일 무료
  adUnlock: 'day',          // 광고로 연 게임: 'day' = 그날 하루 동안 / 'once' = 한 판
  adSeconds: 5,             // 테스트용 가짜 광고 길이
  purchase: true,           // 골드로 소장 · 하루 열기 (로그인 필요 · 서버 지갑)
};

const KEY = 'oneaday_v1';
let S = null;
function fresh() { return { v: 1, library: {}, history: {}, unlocks: {}, owned: {}, streak: { last: '', count: 0 }, dayOffset: 0, intro: false }; }
export function state() {
  if (S) return S;
  try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { S = null; }
  if (!S || S.v !== 1) S = fresh();
  for (const [k, v] of Object.entries(fresh())) if (S[k] === undefined) S[k] = v;
  if (PROD) S.dayOffset = 0;   /* 실서버: 날짜 이동 없음 (테스트에서 옮겨 둔 값이 남아 있어도 무시) */
  return S;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state())); } catch { /* */ } }
export function resetAll() { S = fresh(); save(); }

// ── 날짜 (기기 현지 날짜 기준, 테스트용 dayOffset — 실서버는 늘 0) ──
export function now() { return new Date(Date.now() + (PROD ? 0 : state().dayOffset) * 864e5); }
export const keyOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function dayIndex(d = now()) {
  const [y, m, dd] = LAUNCH.split('-').map(Number);
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(y, m - 1, dd)) / 864e5);
}
export function gameOn(idx) { const n = DAILY.length; return n ? DAILY[((idx % n) + n) % n] : null; }   /* 실서버에 등급 받은 게임이 하나도 없으면 null */
export const todayId = () => gameOn(dayIndex());
export function msToTomorrow() { const d = now(); const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); return t - d; }

// ── 접근 권한 ──
// 'today' 오늘의 게임 · 'owned' 소장 · 'unlocked' 광고로 열림 · 'locked' 잠김 · 'hidden' 실서버에서 아직 공개 안 함(등급 전)
export function access(id) {
  const s = state();
  if (!shown(id)) return 'hidden';
  if (RULES.todayFree && id === todayId()) return 'today';
  if (s.owned[id]) return 'owned';
  if (RULES.openAll) return 'free';
  if (s.unlocks[id] === keyOf(now())) return 'unlocked';
  return 'locked';
}
// 계정에서 가진 것(골드로 산 것)을 이 기기 기록에 반영: own:<게임> → 소장 · day:<게임>:<날짜> → 그날 열림
export function syncItems(skus) {
  const s = state(); let ch = false;
  for (const k of skus || []) { const [t, g, d] = k.split(':');
    if (t === 'own' && GAMES[g] && !s.owned[g]) { s.owned[g] = true; ch = true; }
    /* 같은 게임의 하루 열기가 여러 날짜로 오면 가장 늦은 날만 (11-27: 서버 목록 순서대로 덮어써 어제 날짜가 남아 오늘 산 하루 열기가 '잠김'이던 것) */
    if (t === 'day' && GAMES[g] && d && (!s.unlocks[g] || d > s.unlocks[g])) { s.unlocks[g] = d; ch = true; } }
  if (ch) save(); return ch;
}
export const canPlay = id => { const a = access(id); return a !== 'locked' && a !== 'hidden'; };
/* 지금 바로 할 수 있는 게임 (잠김 아님 · 목록에 있는 것) — 운세의 '오늘 어울리는 게임'은 여기서만 고름 */
export const openGames = () => ORDER.filter(id => GAMES[id] && canPlay(id));

/* 그 게임이 다시 '오늘의 게임'이 되는 날까지 남은 날 (오늘 = 0 · 목록에 없으면 -1) — 메인 진열장 'D-n 무료' */
export function daysUntil(id, from = dayIndex()) { const n = DAILY.length; for (let k = 0; k < n; k++) if (gameOn(from + k) === id) return k; return -1; }
/* 지금까지 한 번이라도 오늘의 게임이었나 (아직 공개 전이면 제목을 가림) */
export function isReleased(id) { return released().includes(id); }

export function unlockByAd(id) { const s = state(); s.unlocks[id] = keyOf(now()); save(); }

// 🔥 연속 출석: 그날 원어데이에 들어오면 인정 (게임 안 해도 · 2026-10-28 대표 결정)
//   하루만 놓쳤으면 그날 안에 광고 1회로 도장 보충 가능 (streak.fill = 놓친 날 · prev = 놓치기 전 연속) — 골드로는 못 삼
const dayBefore = (d, n) => { const x = new Date(d); x.setDate(x.getDate() - n); return keyOf(x); };
//   쉬는 날 (2026-11-26 사업 A2 · 시안 3 피트니스): 한 주(월~일)에 한 번은 하루를 놓쳐도 연속이 이어짐 — 이미 쓴 주에 놓치면 예전처럼 광고 보충(fill)
//   하루 열기권(state.tickets): 출석판(서버 story act 'att' · 대표 11-26)이 주는 소비성 보상 — 잠긴 게임 하나를 그날 엶 · 이 기기에만
export const weekOf = d => { const x = new Date(d); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return keyOf(x); };
export function checkIn() {
  const s = state(), d = now(), today = keyOf(d);
  if (s.streak.last === today) return s.streak;
  const prev = s.streak.count || 0, last = s.streak.last;
  if (last === dayBefore(d, 1)) { s.streak.count = prev + 1; delete s.streak.fill; }
  else if (last === dayBefore(d, 2) && prev > 0 && s.streak.rest !== weekOf(dayBefore(d, 1))) { s.streak.count = prev + 1; s.streak.rest = weekOf(dayBefore(d, 1)); s.streak.rested = dayBefore(d, 1); delete s.streak.fill; }
  else { s.streak.count = 1; if (last === dayBefore(d, 2) && prev > 0) { s.streak.fill = dayBefore(d, 1); s.streak.prev = prev; } else delete s.streak.fill; }
  s.streak.last = today; save(); return s.streak;
}
/* 연속 숫자는 여기 하나에서만 (2026-11-26 총괄 확인: 설치 권유 시트가 '처음 온 날 아님'을 '2일 연속'으로 적어 홈 숫자와 어긋남)
   streakNow(): { count, today(오늘 들어옴), rested, days } — days = 오늘부터 거꾸로 이어진 날(최대 n칸, 오래된 것부터) · st: 'on'(온 날 · 광고 보충 포함) · 'rest'(쉬는 날) */
export function streakNow(n = 6) {
  const s = state().streak || {}, d = now(), today = keyOf(d), count = s.last === today || s.last === dayBefore(d, 1) ? s.count || 0 : 0;
  const days = []; let left = s.last === today ? count : 0;
  for (let i = 0; left > 0 && days.length < n; i++) { const k = dayBefore(d, i); if (k === s.rested) days.push({ k, st: 'rest' }); else { days.push({ k, st: 'on' }); left--; } }
  return { count, today: s.last === today, rested: s.rested || '', days: days.reverse() };
}
/* 이번 주 쉬는 날이 남았나 · 하루 열기 이용권 */
export const restLeft = () => state().streak.rest !== weekOf(now());
/* 이용권은 장부로 (2026-11-27 계정 기준 상태 · sync.js): tk.got{받은 곳 id: 장수} · tk.used{쓴 곳 id: 1} — 두 기기 장부를 합쳐도 두 번 세지 않음 · 수 = 받음 − 씀 */
const tkOf = s => { if (!s.tk) { s.tk = { got: {}, used: {} }; if (s.tickets > 0) s.tk.got['old:' + Date.now().toString(36)] = s.tickets | 0; delete s.tickets; } return s.tk; };
export const tickets = () => { const t = tkOf(state()); return Math.max(0, Math.min(99, Object.values(t.got).reduce((a, n) => a + (n | 0), 0) - Object.keys(t.used).length)); };
export function addTickets(n, from) { const s = state(), t = tkOf(s); const k = from || 'g:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); if (!(k in t.got)) t.got[k] = Math.max(0, Math.min(20, Number(n) | 0)); save(); return tickets(); }
export function useTicket(id) { const s = state(); if (!(tickets() > 0) || !GAMES[id]) return false; tkOf(s).used[`use:${id}:${keyOf(now())}:${Math.random().toString(36).slice(2, 7)}`] = 1; s.unlocks[id] = keyOf(now()); save(); return true; }
/* 점방 내 정보를 계정에 저장할지 기본값 (대표 11-27 '켬' · 대표 결정 전까지 · 한 줄로 바꿈) — 사람마다 점방 입력 화면 · 설정에서 끌 수 있음 */
export const FORTUNE_ME_CLOUD_DEFAULT = true;
/* 오늘 보충할 수 있는 놓친 날 (없으면 null) */
export const fillable = () => { if (BM_OFF) return null; /* 실서버 BM 을 끈 때(PROD_BM_OFF)만: 광고가 없으니 놓친 날 도장 광고 보충 없음 */ const s = state(); return s.streak.fill && s.streak.last === keyOf(now()) ? s.streak.fill : null; };
export function fillByAd() {
  const s = state(); if (!fillable()) return false;
  s.streak.count = (s.streak.prev || 0) + 1 + s.streak.count; s.streak.filled = [...(s.streak.filled || []).slice(-30), s.streak.fill];
  delete s.streak.fill; delete s.streak.prev; save(); return true;
}

// 플레이 기록: 라이브러리 저장 · 오늘의 게임 기록 · 출석
export function recordPlay(id) {
  const s = state(), today = keyOf(now());
  const e = s.library[id] || (s.library[id] = { first: today, plays: 0, last: '' });
  e.plays++; e.last = today;
  e.tn = e.td === today ? (e.tn || 0) + 1 : 1; e.td = today;   /* 오늘 판 수 (오늘 허브 '오늘 N판') */
  checkIn();
  if (id === todayId()) s.history[today] = id;
  if (RULES.adUnlock === 'once' && access(id) === 'unlocked') delete s.unlocks[id];
  save();
}

// 공개된 게임 = 오늘까지 한 번이라도 '오늘의 게임'이었던 것
export function released() {
  if (RULES.openAll) return DAILY.slice();
  const idx = dayIndex(), seen = new Set();
  for (let i = 0; i <= idx && seen.size < DAILY.length; i++) seen.add(gameOn(i));
  return DAILY.filter(id => seen.has(id));
}
export const listed = id => ORDER.includes(id);
export const isBrand = id => BRAND0.includes(id);
// 라이브러리 = 내 게임: 플레이한 것 + 소장한 것 + 오늘 연 것 (목록에서 내린 게임은 소장했을 때만 '쉬는 중'으로)
export function myGames() {
  const s = state(), today = keyOf(now());
  const ids = new Set([...Object.keys(s.library), ...Object.keys(s.owned).filter(k => s.owned[k]), ...Object.keys(s.unlocks).filter(k => s.unlocks[k] === today)]);
  return [...ids].filter(id => GAMES[id] && shown(id) && (listed(id) || (RETIRED.includes(id) && s.owned[id])));
}
/* 등급 표시 (등급 받은 게임만 · 없으면 빈칸) — 게임위 표시 의무(제33조): 게임 카드 · 시작 전 화면 */
const GRADE = { all: '전체이용가', 12: '12세이용가', 15: '15세이용가', 19: '청소년이용불가' };
export const ratingBadge = id => { const r = RATING[id]; return r && GRADE[r.grade] ? `<span class="chip rate r-${r.grade}" title="${GRADE[r.grade]}${r.no ? ' · 등급분류번호 ' + r.no : ''}">${r.grade === 'all' ? '전체' : r.grade === '19' ? '청불' : r.grade + '세'}</span>` : ''; };
export { GAMES };
