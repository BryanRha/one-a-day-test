// 저장 — 기기(localStorage) 한 덩어리 · 원어데이 소장자는 같은 키를 계정 클라우드로 (catalog.js SAVES: rhythm: ['onetrack_v1'])
export const KEY = 'onetrack_v1';
const Q = new URLSearchParams(location.search);
const NOSAVE = Q.get('nosave') === '1';
export const pad = n => String(n).padStart(2, '0');
/* 시험용: ?day=2026-11-10 처럼 날짜를 바꿔 볼 수 있음 · 하루는 아침 7시에 바뀜 (새 곡 시각)
   ?day=7 처럼 숫자만 쓰면 '오늘'을 7화로 (저장의 첫날은 그대로) · ?dev=1 은 방송 목록 전부 열림 (테스트 서버 · localhost 는 기본으로 켜짐, ?dev=0 으로 끔) */
export const EP = /^\d{1,2}$/.test(Q.get('day') || '') ? +Q.get('day') : 0;
/* 실서버(OAD_ENV === 'prod')에서는 ?dev=1 도 무시 (재검수 v0.4 B-1: 안 열린 화 미리 열기 막기 — 새 화는 하루 하나) */
export const PROD = typeof window !== 'undefined' && window.OAD_ENV === 'prod';
export const DEV = !PROD && (Q.get('dev') === '1' || (Q.get('dev') !== '0' && (!!(typeof window !== 'undefined' && window.OAD_ENV) || /^(localhost|127\.)/.test(location.hostname))));   /* 원어데이 테스트 빌드(OAD_ENV=test · dev, 주소와 무관) · 로컬은 늘 시험 모드 · ?dev=0 으로 끔 (2026-11-11 대표: 테스트는 모든 곡 플레이) */
export function now() { const q = Q.get('day'); if (q && !EP) { const [y, m, d] = q.split('-').map(Number); return new Date(y, m - 1, d, 12); } return new Date(); }
export function dayKey(d = now()) { const x = new Date(d.getTime() - 7 * 3600e3); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; }
export function nextOpen(d = now()) { const n = new Date(d); n.setHours(7, 0, 0, 0); if (n <= d) n.setDate(n.getDate() + 1); return n; }

/* v0.7.1 (대표 11-12): 새 유저 첫 판은 쉬움 — 기존 저장은 마지막으로 고른 난이도 그대로(저장에 diff 가 있음) */
export function fresh() {
  return { v: 1, first: dayKey(), offset: 0, speed: 6, sfx: 0.55, music: 0.9, shake: true, hitsnd: true, el: true, lite: false, theme: 'base', diff: 'easy', days: {}, best: {}, book: {}, pre: {}, dm: {}, seen: {}, guest: null, vib: true, guard: true, cast: {}, plays: 0, calibrated: false, chartRev: {} };
}
export let S = fresh();
export function load() {
  try { const raw = NOSAVE ? null : localStorage.getItem(KEY); S = fresh(); if (raw) { const o = JSON.parse(raw); if (o && o.v === 1) S = Object.assign(fresh(), o); } } catch { S = fresh(); }   /* 저장이 없으면 새로 (v0.7.1: ?reset=1 이 앞서 읽은 값을 남기던 것) */
  /* v0.5.4: 열린 화는 모두 그냥 시작 → 옛 저장의 하루 기록에 남은 광고 횟수(ads) · retries 는 읽지 않고 지움 */
  if (!S.days || typeof S.days !== 'object') S.days = {};
  for (const d of Object.values(S.days)) if (d && typeof d === 'object') { delete d.ads; delete d.retries; }
  return S;
}
let tm = 0;
export function save(nowNow = false) {
  if (NOSAVE) return;
  const w = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 저장 공간 부족 — 게임은 계속 */ } };
  clearTimeout(tm); if (nowNow) w(); else tm = setTimeout(w, 150);
}
export function reset() { S = fresh(); save(true); }
/* 하루 기록: plays = 그날 오늘 화를 끝까지 한 판 수 · done = 오늘 화를 한 번이라도 끝냄 · n = 그날 시작한 모든 판 수(곡 · 난이도 무관)
   v0.6: cred = 그날 끝까지 한 모든 판 수(곡 · 캐스트 무관 — 하루 상한 channel.CAP 을 이걸로 셈) · enc = 앵콜 보너스 받음 · capSeen = 상한 안내를 한 번 보여 줌 */
export function today() { const k = dayKey(); const t = S.days[k] || (S.days[k] = { plays: 0, done: false, n: 0 }); t.n ||= 0; return t; }
/* 오늘이 시즌 몇 화인지: 처음 연 날 = 1화 (들어 있는 화까지만 · 마지막 화 다음 날도 마지막 화) */
/* 달력상 몇 번째 날인지 (상한 없음 · v0.6 앵콜 방송용: 마지막 화 다음 날부터) · ?day=N 이면 N */
export function dayRaw() { if (EP) return EP; const a = new Date(S.first + 'T12:00:00'), b = new Date(dayKey() + 'T12:00:00'); return Math.max(1, Math.round((b - a) / 864e5) + 1); }
export function dayNo(max) { if (EP) return Math.max(1, Math.min(max, EP)); const a = new Date(S.first + 'T12:00:00'), b = new Date(dayKey() + 'T12:00:00'); return Math.max(1, Math.min(max, Math.round((b - a) / 864e5) + 1)); }
/* 기록: 곡 · 난이도별 최고 */
export function record(song, diff, r) {
  const b = (S.best[song] ||= {}), o = b[diff];
  const isBest = !o || r.score > o.score;
  if (isBest) b[diff] = { score: r.score, acc: r.acc, rank: r.rank, fc: r.fc || (o && o.fc), ap: r.ap || (o && o.ap), maxCombo: Math.max(r.maxCombo, o ? o.maxCombo : 0), guard: r.guard || 0 };   /* guard = 그 기록 판의 수습 횟수 (순위 표시 「수습」) */
  else { o.fc = o.fc || r.fc; o.ap = o.ap || r.ap; o.maxCombo = Math.max(o.maxCombo, r.maxCombo); }
  return isBest && !!o;
}
/* 이번 판 안내 (검수 C-2: 한 장에 최대 두 가지) — here = 이번 채보의 전용 노트 종류 Set
   첫 판이면 조작 안내 + 새 노트 1개, 아니면 새 노트 2개 · 손을 옮기는 페이더 → 박을 세는 큐 → 그냥 톡인 슈퍼챗 순 · 나머지는 다음 판 */
export function guidesFor(here, st = S) {
  const fresh = ['fader', 'cue', 'sc'].filter(k => here.has(k) && !(st.seen || {})[k]);
  return [...(!st.guide ? ['lane'] : []), ...fresh.slice(0, st.guide ? 2 : 1)];
}
/* 캐스트별 함께한 방송 (v0.5.1 · 사업 B-2): 판이 끝날 때 그 화 캐스트 · 옆자리 게스트에 판 수 · 받은 슈퍼챗 · 수습 횟수를 쌓음
   화면에는 아직 안 보임 — v0.6 구독자 공식이 이 값을 그대로 소급 · 옛 저장(cast 없음)도 fresh() 와 합쳐져 {} 로 시작 */
export function castLog(ids, r) {
  if (!S.cast || typeof S.cast !== 'object') S.cast = {};
  for (const id of new Set(ids.filter(Boolean))) { const c = (S.cast[id] ||= { plays: 0, sc: 0, guards: 0 }); c.plays++; c.sc += (r.sc && r.sc[0]) || 0; c.guards += r.guard || 0; }
}
/* 방송 기록: 화 → { rank(가장 좋은 것), date } · 테두리 = 기본 · 은색(A↑) · 금색(S↑) */
const RO = ['C', 'B', 'A', 'S', 'SS'];
export function pageIn(no, rank) {
  const p = S.book[no], fresh = !p;
  if (!p || RO.indexOf(rank) > RO.indexOf(p.rank)) S.book[no] = { rank, date: dayKey() };
  return fresh;
}
export const foil = r => (r === 'SS' || r === 'S' ? 'gold' : r === 'A' ? 'silver' : 'base');
