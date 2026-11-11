// 저장 — 기기(localStorage) 한 덩어리 · 원어데이 소장자는 같은 키를 계정 클라우드로 (catalog.js SAVES: rhythm: ['onetrack_v1'])
export const KEY = 'onetrack_v1';
const Q = new URLSearchParams(location.search);
const NOSAVE = Q.get('nosave') === '1';
export const pad = n => String(n).padStart(2, '0');
/* 시험용: ?day=2026-11-10 처럼 날짜를 바꿔 볼 수 있음 · 하루는 아침 7시에 바뀜 (새 곡 시각)
   ?day=7 처럼 숫자만 쓰면 '오늘'을 7화로 (저장의 첫날은 그대로) · ?dev=1 은 방송 목록 전부 열림 (테스트 서버 · localhost 는 기본으로 켜짐, ?dev=0 으로 끔) */
export const EP = /^\d{1,2}$/.test(Q.get('day') || '') ? +Q.get('day') : 0;
export const DEV = Q.get('dev') === '1' || (Q.get('dev') !== '0' && ((window.OAD_ENV && window.OAD_ENV !== 'prod') || /^(localhost|127\.)/.test(location.hostname)));   /* 원어데이 테스트 빌드(OAD_ENV=test, 주소와 무관)·로컬은 늘 시험 모드 · ?dev=0 으로 끔 (2026-11-11 대표: 테스트는 모든 곡 플레이) */
export function now() { const q = Q.get('day'); if (q && !EP) { const [y, m, d] = q.split('-').map(Number); return new Date(y, m - 1, d, 12); } return new Date(); }
export function dayKey(d = now()) { const x = new Date(d.getTime() - 7 * 3600e3); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; }
export function nextOpen(d = now()) { const n = new Date(d); n.setHours(7, 0, 0, 0); if (n <= d) n.setDate(n.getDate() + 1); return n; }

export function fresh() {
  return { v: 1, first: dayKey(), offset: 0, speed: 6, sfx: 0.55, music: 0.9, shake: true, hitsnd: true, el: true, lite: false, theme: 'base', diff: 'normal', days: {}, best: {}, book: {}, pre: {}, dm: {}, plays: 0, calibrated: false };
}
export let S = fresh();
export function load() {
  try { const raw = NOSAVE ? null : localStorage.getItem(KEY); if (raw) { const o = JSON.parse(raw); if (o && o.v === 1) S = Object.assign(fresh(), o); } } catch { S = fresh(); }
  return S;
}
let tm = 0;
export function save(nowNow = false) {
  if (NOSAVE) return;
  const w = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 저장 공간 부족 — 게임은 계속 */ } };
  clearTimeout(tm); if (nowNow) w(); else tm = setTimeout(w, 150);
}
export function reset() { S = fresh(); save(true); }
export function today() { const k = dayKey(); return S.days[k] || (S.days[k] = { plays: 0, done: false, retries: 0 }); }
/* 오늘이 시즌 몇 화인지: 처음 연 날 = 1화 (들어 있는 화까지만 · 마지막 화 다음 날도 마지막 화) */
export function dayNo(max) { if (EP) return Math.max(1, Math.min(max, EP)); const a = new Date(S.first + 'T12:00:00'), b = new Date(dayKey() + 'T12:00:00'); return Math.max(1, Math.min(max, Math.round((b - a) / 864e5) + 1)); }
/* 기록: 곡 · 난이도별 최고 */
export function record(song, diff, r) {
  const b = (S.best[song] ||= {}), o = b[diff];
  const isBest = !o || r.score > o.score;
  if (isBest) b[diff] = { score: r.score, acc: r.acc, rank: r.rank, fc: r.fc || (o && o.fc), ap: r.ap || (o && o.ap), maxCombo: Math.max(r.maxCombo, o ? o.maxCombo : 0) };
  else { o.fc = o.fc || r.fc; o.ap = o.ap || r.ap; o.maxCombo = Math.max(o.maxCombo, r.maxCombo); }
  return isBest && !!o;
}
/* 방송 기록: 화 → { rank(가장 좋은 것), date } · 테두리 = 기본 · 은박(A↑) · 금박(S↑) */
const RO = ['C', 'B', 'A', 'S', 'SS'];
export function pageIn(no, rank) {
  const p = S.book[no], fresh = !p;
  if (!p || RO.indexOf(rank) > RO.indexOf(p.rank)) S.book[no] = { rank, date: dayKey() };
  return fresh;
}
export const foil = r => (r === 'SS' || r === 'S' ? 'gold' : r === 'A' ? 'silver' : 'base');
