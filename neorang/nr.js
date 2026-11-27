/* 너랑 — 원어데이 [너랑] 탭 (2026-11-26 개편 · team/dev/tasks/261126-neorang-bm/intent.md A-3 · decisions 2026-11-26)
   흐름: 처음 설정(부를 이름 · 생년 · 좋아하는 장르) → 홈(이어 하기 · 추천 · 인기 · 새 작품 · 장르 · 행사 띠) → 작품 소개 → 설정 시트(프로필 · 대화 모드 · 답 길이 · 기억 노트)
         → 대화 방(끝없이 이어짐 · 첫 장면 → 상대가 먼저 · 추천 답 3개 + 직접 쓰기 · 다른 반응 · 되돌리기 · 내 말 고치기 · 상태 창 · 이번 한 번 값) → 모자라면 충전 안내(막다른 단추 없음)
   값: 가벼운 대화(기본 · 짧게) 하루 60번 무료 → 오늘의 무료 10번 → 광고 +5번(하루 3번) → 원어데이 골드(기본 🪙2 · 깊은 🪙6 · 길이 · 기억 넓게) — 정하는 건 서버(/api/story home 의 price)
   저장: 이 기기(localStorage 'nr_v2' — 대화 원문은 기기에만) + 서버는 진행(대화 수 · 단계 · 비밀 번호 · 기억 요약)만 · 골드는 원어데이 계정
   골드 상점 · 로그인 · 광고는 원어데이 셸이 함(postMessage 'oad:nr' → app.js) — 원스토어 안이면 원스토어 결제 · 리워드(SSV)
   주소: 해시 하나 = 화면 하나 → 폰 뒤로가기 · 화면의 ← = 바로 전 화면
   시안 D 연재판(밤 9시 한 화 · 점심 쪽지)은 nr_serial.js 에 남겨 둠(지표가 나쁘면 다시 켬) · 데이터: works.js(기존 12화 원고) + works2.js(새 형식 원고) */
import { WORKS, SOON } from './works.js';
import { WORKS2 } from './works2.js';
import { NR_OFF } from '../rules.js';   /* 실서버 너랑 공개 스위치 (rules.js PROD_NR_OPEN · 2026-11-24) */

const $ = s => document.querySelector(s), app = $('#app');
const EMB = (() => { try { return window.parent !== window; } catch { return true; } })();
const PROD = window.OAD_ENV === 'prod';
const Q = new URLSearchParams(location.search);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const josa = (w, a, b) => { const c = String(w).charCodeAt(String(w).length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 ? a : b; };
const gnum = n => Number(n || 0).toLocaleString('ko-KR');
document.documentElement.dataset.nr = '1';   /* 원어데이 셸이 '불러옴'을 확인하는 표시 */
/* 원스토어 앱 안 표시(html.os): 셸이 원스토어 SDK 를 켰으면(OAD_HOST) — 셸이 늦게 켜질 수 있어 몇 번 더 봄 · CSS 가 오른쪽 위 원스토어 단추 자리를 비움 */
const osMark = () => { try { if (Q.get('os') === '1' || (EMB && window.parent.OAD_HOST === 'onestore')) document.documentElement.classList.add('os'); } catch { /* 다른 주소 */ } };
osMark(); setTimeout(osMark, 1500); setTimeout(osMark, 5000);
const SOONLIST = SOON;   /* 곧 공개 카드(시안 D)는 이번 개편에서 홈에 두지 않음 — 이용자 제작(2차)과 같이 다시 */

/* ── 작품 (기존 원고 → 같은 모양 · 새 형식이 같은 id 를 덮음) — 서버 home 의 rooms(장르 · 칸 · 상태 창)가 오면 그 값이 앞섬 ── */
const GENRES = ['로맨스', '로판', '무협', '판타지', '학원', '아이돌', '누아르', '시대극', '순한 맛', '게임'];
const LEGACY_GENRE = { c17: '로맨스', c20: '로판', c16: '순한 맛', c03: '순한 맛', c08: '무협', c11: '순한 맛', c24: '순한 맛', c25: '시대극' };
const STD_STAGES = ['낯섦', '호기심', '신뢰', '설렘', '약속'];
const stdStat = w => [{ k: 'place', label: '장소', type: 'text', init: (w.places && w.places[0] && w.places[0].name) || '', show: 'on' }, { k: 'time', label: '시각', type: 'text', init: '', show: 'on' },
  { k: 'bond', label: '관계', type: 'stage', init: STD_STAGES[0], steps: STD_STAGES, show: 'on' }, { k: 'inner', label: '속마음', type: 'text', init: '', show: 'fold' }];
const fromLegacy = w => ({ ...w, v: 1, genre: LEGACY_GENRE[w.id] || '순한 맛', genre2: '', room: 'general', kind: 'story', col: w.ch.col, since: '',
  opening: { body: (w.eps[0] || {}).body || [], img: (w.eps[0] || {}).img || '', chips: (w.eps[0] || {}).chips || w.chips1 || [] }, stat: stdStat(w), secrets: (w.secrets || []).map(s => ({ n: s.n, need: s.need, text: s.text })) });
const fromV2 = (x, old) => ({ ...x, tint: x.tint || (old && old.tint) || '#2B2A3A', places: (old && old.places) || [], moods: (old && old.moods) || [], tmp: old && old.tmp });
const HIDE = ['c08', 'c25'];   /* 새 형식으로 바뀔 기존 작품(둘째 · 셋째 주) — 서버 nr_room.js NR_HIDE 와 같음 */
let LIST = (() => { const m = new Map(WORKS.filter(w => !HIDE.includes(w.id)).map(w => [w.id, fromLegacy(w)])); for (const x of WORKS2 || []) m.set(x.id, fromV2(x, WORKS.find(w => w.id === x.id))); return [...m.values()]; })();
const W = id => LIST.find(w => w.id === id);

/* ── 상태 (이 기기) ── */
const KEY = 'nr_v2';
const fresh = () => ({ v: 2, name: '', birth: 0, adultOk: false, genres: [], onboarded: false, profiles: [{ id: 'p1', name: '', role: '' }], prof: 'p1', def: { mode: 'basic', len: 'short', memo: 'normal' },
  rooms: {}, view: { fs: 1 }, gtab: '', ad: { day: '', n: 0 }, seen: 0, lastW: '', alarm: true });
let S = (() => {
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && v.v === 2) return Object.assign(fresh(), v); } catch { /* 저장소 없음 */ }
  const s = fresh();
  try {   /* 시안 D(nr_v1) 에서 옮김: 이름 · 나이 · 진행(대화 수 · 비밀 · 기억 요약) — 회차 대화 원문은 옮기지 않음(방이 새로 시작) */
    const o = JSON.parse(localStorage.getItem('nr_v1') || 'null');
    if (o && o.v === 1) { s.name = o.name || ''; s.profiles[0].name = o.name || ''; if (o.age) s.birth = new Date().getFullYear() - o.age; s.onboarded = !!(o.onboarded && o.name && o.age);
      for (const [k, x] of Object.entries(o.works || {})) if (x && x.talks) s.rooms[k] = { ...blankRoom(), talks: x.talks | 0, secrets: x.secrets || [], mem: x.mem || [] }; }
  } catch { /* */ }
  return s;
})();
function blankRoom() { return { turns: 0, talks: 0, secrets: [], mem: [], note: '', log: [], hist: [], room: { turn: 0, last: 0, used: [], ch: 'open', lead: 0, bondMin: 0, stat: null }, set: null, at: 0 }; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 가득 참 · 막힘 */ } };
const did = () => { let d = ''; try { d = localStorage.getItem('oad_did') || ''; if (!d) { d = 'nr' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); localStorage.setItem('oad_did', d); } } catch { d = 'nr-nostore-0000'; } return d; };
const RS = id => (S.rooms[id] ||= blankRoom());
const ageNow = () => { if (S.birth) return new Date().getFullYear() - S.birth; try { const me = JSON.parse(localStorage.getItem('oad_fortune_me') || 'null'); if (me && me.y) return new Date().getFullYear() - me.y; } catch { /* */ } return 0; };   /* 연 나이 (서버 gold.js AGE_RULE 'year' 와 같음) */
const adultAge = () => ageNow() >= 19, teen = () => { const a = ageNow(); return a >= 14 && a < 19; };
const adultOn = () => adultAge() && S.adultOk;
const profOf = id => S.profiles.find(p => p.id === id) || S.profiles[0];
const nm = p => (p && p.name) || S.name || '하람';
const setOf = id => { const r = RS(id), s = r.set || {}; return { prof: s.prof || S.prof, mode: s.mode || S.def.mode, len: s.len || S.def.len, memo: s.memo || S.def.memo, tone: s.tone ?? S.def.tone ?? '' }; };
const kstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const adToday = () => (S.ad && S.ad.day === kstDay() ? S.ad.n : 0);

/* ── 이용 기록 (원어데이 track.js 와 같은 기기 번호 · /api/ev · 대화 원문 · 이름 · 나이는 보내지 않음 · 허용 이름은 server/api/_lib/events.js) ── */
const EVQ = [], EV1 = new Set(), SID = Math.random().toString(36).slice(2, 12);
const EV_ON = !NR_OFF && (() => { try { if (localStorage.getItem('oad_track_off') === '1') return false; return /(^|\.)oneaday\.kr$/.test(location.hostname) || location.hostname.endsWith('.vercel.app') || localStorage.getItem('oad_track') === '1'; } catch { return false; } })();
const evFlush = () => { if (!EVQ.length) return; const body = JSON.stringify({ d: did(), s: SID, v: 'nr2', e: EVQ.splice(0, 50) });
  try { if (!(navigator.sendBeacon && navigator.sendBeacon('/api/ev', new Blob([body], { type: 'text/plain' })))) fetch('/api/ev', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {}); } catch { /* 기록 실패는 무시 */ } };
const ev = (n, p, once) => { if (once) { if (EV1.has(once)) return; EV1.add(once); } if (!EV_ON || EVQ.length >= 200) return; EVQ.push({ n, t: Date.now(), p: p || {} }); clearTimeout(ev.h); ev.h = setTimeout(evFlush, 3000); };
addEventListener('pagehide', evFlush); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') evFlush(); });
const VIA = (() => { const v = Q.get('via'); if (/^(hub|tab|link|oneword)$/.test(v || '')) return v; let ext = false; try { ext = !!document.referrer && new URL(document.referrer).hostname !== location.hostname; } catch { /* */ } return Q.get('utm_source') || ext ? 'share' : 'direct'; })();

/* ── 서버 (/api/story) — 가격표 · 남은 무료 · 골드는 서버 값 (아래 기본값은 서버를 못 쓸 때 보여 주기만) ── */
const H = { loaded: false, on: true, login: false, gold: null, used: 0, rank: {}, teenUsed: 0,
  price: { lightDay: 60, freeDay: 10, adTurns: 5, adMax: 3, basic: { short: 2, normal: 2, long: 3, xl: 4 }, deep: { short: 6, normal: 6, long: 9, xl: 11 }, deepSale: 2, memoWide: 1, memo: { normal: 300, wide: 1200 }, teenMonth: 5000 },
  left: { light: 60, free: 10, ad: 0, ads: 0, adMax: 3 } };
let TOK = '';
async function post(body, signal) {
  const h = { 'Content-Type': 'application/json' }; if (TOK) h.Authorization = 'Bearer ' + TOK;
  return fetch('/api/story', { method: 'POST', headers: h, signal, body: JSON.stringify({ d: did(), age: ageNow() || 30, name: nm(profOf(S.prof)), ad: PROD ? undefined : adToday(), ...body }) });
}
let HG = 0;   /* home() 차례 번호 — 늦게 온 옛 응답(로그인 전 토큰으로 보낸 첫 요청 등)이 새 값을 덮지 않게 */
async function home() {
  const g = ++HG;
  try {
    const r = await post({ act: 'home', v: 2 }); const j = await r.json();
    if (g !== HG) return;
    if (r.ok && j.v === 2) {
      Object.assign(H, { loaded: true, on: j.on, login: j.login, gold: j.gold, used: j.used, rank: j.rank || {}, price: j.price || H.price, left: j.left || H.left, teenUsed: j.teenUsed || 0 });
      for (const x of j.rooms || []) { const w = W(x.id); if (w) Object.assign(w, { genre: x.genre, genre2: x.genre2, room: x.room, kind: x.kind, sale: x.sale, stat: x.stat && x.stat.length ? x.stat : w.stat, goal: x.goal || w.goal }); }
      const ids = new Set((j.rooms || []).map(x => x.id)); if (ids.size) LIST = LIST.filter(w => ids.has(w.id));   /* 서버가 안 보낸 작품(청소년에게 성인 칸 등)은 뺌 */
      return;
    }
  } catch { /* 아래 */ }
  if (g === HG) Object.assign(H, { on: false, loaded: true });
}
/* 진행 맞추기: 이 기기 값 ↔ 서버(계정 · 기기) 값 — 대화 원문(log · hist)은 보내지 않음 */
async function sync() {
  const works = Object.fromEntries(Object.entries(S.rooms).map(([k, v]) => [k, { talks: v.talks, stage: 0, secrets: (v.secrets || []).filter(n => n <= 3), mem: v.mem, eps: {} }]));
  try { const r = await post({ act: 'state', works }); const j = await r.json(); if (!r.ok || !j.works) return;
    for (const [k, v] of Object.entries(j.works)) { if (!W(k)) continue; const x = RS(k); x.talks = Math.max(x.talks, v.talks | 0); x.secrets = [...new Set([...x.secrets, ...(v.secrets || [])])]; if ((v.mem || []).length > x.mem.length) x.mem = v.mem; }
    save(); } catch { /* 다음에 */ }
}
/* ── 계정 (2026-11-27 대표 제보: 원스토어 앱에서 원어데이는 로그인인데 너랑은 '로그인 전' · 원어데이에서 로그아웃해도 너랑 단추가 그대로)
   원인: 너랑(iframe)이 account.js 를 따로 불러 계정 모듈이 둘 — 원스토어 세션은 셸 창에만 있고(iframe 은 '원스토어 아님'), 셸의 로그인 · 로그아웃도 몰랐음
   → 셸 안이면 셸의 계정 모듈 하나(window.parent.__oadAcct)만 보고, 바뀌면(onChange) 토큰을 다시 받아 서버 값(골드 · 남은 무료)을 새로 그림 · 셸 밖(너랑 주소 바로)만 자기 모듈 */
const shellAcct = () => { try { return EMB && window.parent.location.origin === location.origin ? window.parent.__oadAcct || null : null; } catch { return null; } };
let ACC = null;
const acct = async () => ACC || (ACC = shellAcct() || await import('../account.js'));
async function acctSync(first) {
  let A; try { A = await acct(); } catch { return; }
  if (!A || !A.ON) return;
  const was = TOK; let t = ''; try { if (first && !shellAcct()) await A.init(); t = (await A.token()) || ''; } catch { t = ''; }
  if (shellAcct() && !A.current()) t = '';   /* 셸이 '로그인 전'이면 너랑도 로그인 전 (셸 한 곳이 기준 · 셸이 계정을 다 불러오면 onChange 로 다시 옴) */
  TOK = t;
  if (!TOK) Object.assign(H, { login: false, gold: null });   /* 로그아웃: 서버를 못 불러도 옛 골드를 남기지 않음 */
  if (TOK && (first || TOK !== was)) sync();
  if (first && !TOK && !was) return;   /* 처음 · 로그인 없음: 위 home() 그대로 */
  await home(); render();
}
let acctT = 0;
(async () => {
  await acctSync(true);
  const A = shellAcct(); if (!A || !A.onChange) return;
  const off = A.onChange(() => { clearTimeout(acctT); acctT = setTimeout(() => acctSync(false), 250); });   /* 셸에서 로그인 · 로그아웃 · 골드가 바뀌면 */
  addEventListener('pagehide', () => { try { off && off(); } catch { /* */ } });
})();

/* ── 원어데이 셸에 부탁 (골드 상점 · 로그인 · 광고) — 셸 밖(너랑 주소를 바로 연 경우)이면 원어데이로 보내거나 테스트 광고 ── */
const CALLS = new Map(); let CID = 0;
addEventListener('message', e => { const d = e.data; if (!d || d.type !== 'oad:nrres' || e.origin !== location.origin) return; const f = CALLS.get(d.id); if (f) { CALLS.delete(d.id); f(d.result || {}); } });
const shell = (fn, extra = {}) => new Promise(res => {
  if (!EMB) return res({ ok: false, reason: 'noshell' });
  const id = ++CID; CALLS.set(id, res);
  try { parent.postMessage({ type: 'oad:nr', fn, id, ...extra }, location.origin); } catch { CALLS.delete(id); res({ ok: false, reason: 'noshell' }); }
  setTimeout(() => { if (CALLS.has(id) && fn !== 'shop' && fn !== 'login') { CALLS.delete(id); res({ ok: false, reason: 'timeout' }); } }, 120000);
});
async function refreshGold() { await acctSync(false); }   /* 셸 상점 · 로그인 창이 닫힌 뒤: 토큰을 새로(로그아웃이면 빈 값 — 옛 토큰을 붙들지 않음) */
async function goShop(note) { ev('nr_charge', { what: 'shop' }); if (!EMB) { location.href = '/#shop'; return; } await shell('shop', { note }); await refreshGold(); }
async function goLogin() { ev('nr_charge', { what: 'login' }); if (!EMB) { location.href = '/'; return; } await shell('login'); await refreshGold(); }
async function watchAd() {
  ev('nr_charge', { what: 'ad' });
  const r = EMB ? await shell('ad') : !PROD ? await localAd() : { ok: false, reason: 'off' };
  if (r && r.ok) { if (!S.ad || S.ad.day !== kstDay()) S.ad = { day: kstDay(), n: 0 }; S.ad.n = Math.min(H.price.adMax, S.ad.n + 1); save(); await home(); toast(`광고 보너스 +${H.price.adTurns}번 — 기본 대화로 이어 가요`); return true; }
  toast(r && r.reason === 'limit' ? '오늘 광고 보너스는 다 받았어요' : r && r.reason === 'nofill' ? '지금은 보여 줄 광고가 없어요 · 잠시 뒤 다시' : '광고를 끝까지 보면 +5번을 드려요'); return false;
}
/* 셸 밖 테스트용 광고 창 (테스트 서버에서 너랑 주소를 바로 열었을 때만) */
const localAd = () => new Promise(res => { let left = 5; const box = document.createElement('div'); box.className = 'adbox'; box.innerHTML = `<div><b>테스트 광고</b><p id="adc">5</p><button class="cta" disabled id="adok">보상 받기</button><button class="cta ghost" id="adno">그만 보기</button></div>`; document.body.append(box);
  const iv = setInterval(() => { left--; $('#adc').textContent = Math.max(0, left); if (left <= 0) { clearInterval(iv); $('#adok').disabled = false; } }, 1000);
  $('#adok').onclick = () => { box.remove(); res({ ok: true }); }; $('#adno').onclick = () => { clearInterval(iv); box.remove(); res({ ok: false, reason: 'cancel' }); }; });

/* ── 값 (서버 _lib/nr_room.js priceOf · payOf 와 같은 규칙 — 화면 표시용 · 실제로 정하는 건 서버) ── */
const MODE_NAME = { basic: '기본 대화', deep: '깊은 대화' }, LEN_NAME = { short: '짧게', normal: '보통', long: '넉넉히', xl: '아주 길게' }, MEMO_NAME = { normal: '보통', wide: '넓게' };
const priceOf = (o, w) => { const P = H.price; let p = P[o.mode === 'deep' ? 'deep' : 'basic'][o.len] || 2; if (o.mode === 'deep' && w && w.sale) p -= P.deepSale; return p + (o.memo === 'wide' ? P.memoWide : 0); };
function payOf(o, w) {
  const L = H.left, wide = o.memo === 'wide';
  if (o.mode !== 'deep' && o.len === 'short' && !wide && L.light > 0) return { pay: 'light', gold: 0 };
  if (o.mode !== 'deep' && (o.len === 'short' || o.len === 'normal') && !wide) { if (L.free > 0) return { pay: 'free', gold: 0 }; if (L.ad > 0) return { pay: 'ad', gold: 0 }; }
  return { pay: 'gold', gold: priceOf(o, w) };
}
const costLabel = (o, w) => { const b = payOf(o, w); return b.pay === 'light' ? `무료 · 가벼운 ${H.left.light}번` : b.pay === 'free' ? `무료 · 오늘 ${H.left.free}번` : b.pay === 'ad' ? `무료 · 보너스 ${H.left.ad}번` : `🪙${b.gold}`; };
const goldNow = () => (H.gold && Number.isFinite(Number(H.gold.total)) ? Number(H.gold.total) : null);

/* ── 그림: img/manifest.json(아트) → 없으면 표지 색 · 제목 카드 (없는 파일을 부르지 않음 — 콘솔 오류 0) ── */
let ART = {};
const A = p => (p ? 'img/' + String(p).replace(/^\.?\/?(img\/)?/, '') : '');
fetch('img/manifest.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : {})).then(m => { if (m && typeof m === 'object') { ART = m; render(); } }).catch(() => {});
const artOf = w => ART[w.id] || {};
/* 표지: 새 형식 원고는 FORMAT 7장 자리(img/<id>/<표지 키>.webp — 표지 세션이 넣음) · 기존 원고는 아트 manifest */
const coverOf = (w, small) => { if (w.v === 2 && w.cover) return `img/${w.id}/${w.cover}.webp`; const a = artOf(w); return A(small ? a.cover_s || a.cover : a.cover || a.cover_s) || (w.tmp ? 'tmp/' + w.tmp : ''); };
const sceneImg = (w, tag) => {
  const a = artOf(w), sc = a.scenes || {}, pl = a.places || {};
  if (tag && sc[tag]) return A(sc[tag]);
  const place = tag ? ((w.places || []).find(x => tag.startsWith(`${w.id}_${x.tag}_`)) || {}).tag : ((w.places || [])[0] || {}).tag;
  return A(pl[place] || (place && sc[`${w.id}_${place}_${(w.moods || [])[0]}`]) || Object.values(sc)[0] || Object.values(pl)[0]) || coverOf(w);
};
const portrait = w => { const a = artOf(w); return A(a.avatar && (a.avatar.default || Object.values(a.avatar)[0])); };
/* 상황 그림 카드 (대화 흐름 안에 크게): 그림 파일이 있으면 그 그림 · 없으면 표지 · 표지도 없으면 작품 색 + 상대 이름 자리 표시 */
const imgCard = (w, tag, cls = 'lg-img') => { const u = sceneImg(w, tag); const lab = placeName(w, tag) || w.ch.short;
  const zb = cls === 'lg-img' ? `<button class="zb" data-zoom="${esc(tag)}" aria-label="크게 보기">${I('spark', 'xs')}크게</button>` : '';
  return u ? `<div class="${cls}" style="background-image:url(${u})"><span>${esc(lab)}</span>${zb}</div>` : `<div class="${cls} ph" style="--tint:${w.tint};--c:${w.ch.col || w.col || '#888'}"><b>${esc(w.ch.mono)}</b><span>${esc(lab)} · 그림 준비 중</span>${zb}</div>`; };
const placeName = (w, tag) => { const p = (w.places || []).find(x => tag && tag.startsWith(`${w.id}_${x.tag}_`)); return p ? p.name : ''; };

/* ── 아이콘 · 조각 ── */
const P = {
  back: '<path d="M15 5l-7 7 7 7"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', home: '<path d="M4 11l8-6.5 8 6.5V20h-5v-5.5h-6V20H4z"/>',
  book: '<path d="M4 5.5A1.5 1.5 0 015.5 4H11v16H5.5A1.5 1.5 0 014 18.5z"/><path d="M20 5.5A1.5 1.5 0 0018.5 4H13v16h5.5a1.5 1.5 0 001.5-1.5z"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>', user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/>',
  chat: '<path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v8a2.5 2.5 0 01-2.5 2.5H10l-4.5 3.5V17A2.5 2.5 0 014 14.5z"/>', send: '<path d="M5 12h13M13 6l6 6-6 6"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  unlock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 017.5-2"/>', redo: '<path d="M20 12a8 8 0 11-2.5-5.8"/><path d="M20 4v4h-4"/>', undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>', more: '<path d="M6 12h.01M12 12h.01M18 12h.01"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  tune: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>', plus: '<path d="M12 5v14M5 12h14"/>', play: '<path d="M8 5.5v13l10-6.5z"/>',
};
const I = (n, c = '') => `<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;
const av = (w, sz = 34) => { const p = portrait(w); return `<span class="av" style="--c:${w.ch.col || w.col || '#777'};width:${sz}px;height:${sz}px;font-size:${Math.round(sz * .42)}px${p ? `;background:center/cover url(${p})` : ''}">${p ? '' : esc(w.ch.mono)}</span>`; };
const cover = (w, extra = '', title = true, sz = '') => { const c = coverOf(w, true); return `<div class="cv" style="--tint:${w.tint};${sz}${c ? `background-image:url(${c})` : `background-image:radial-gradient(120% 80% at 70% 20%,color-mix(in srgb,${w.col || '#888'} 40%,transparent) 0%,${w.tint} 60%,#0b0a12 100%)`}">${extra}${title ? `<span class="ct">${esc(w.short)}</span>` : ''}</div>`; };
const back = () => `<button class="btn" data-back aria-label="뒤로">${I('back')}</button>`;
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2200); };
const mine = t => String(t).replace(/이용자가/g, '내가').replace(/이용자의/g, '나의').replace(/이용자를/g, '나를').replace(/이용자에게/g, '나에게').replace(/이용자는/g, '나는').replace(/이용자/g, '나');
const J2 = { 은: ['은', '는'], 는: ['은', '는'], 이: ['이', '가'], 가: ['이', '가'], 을: ['을', '를'], 를: ['을', '를'], 과: ['과', '와'], 와: ['과', '와'], 이랑: ['이랑', '랑'], 랑: ['이랑', '랑'] };
const fillName = (t, name) => String(t).replace(/['"‘’“”]?\{\{?(?:name|호칭)\}?\}['"‘’“”]?(이랑|은|는|이|가|을|를|과|와|랑)?/g, (_, j) => name + (j ? J2[j][josa(name, 0, 1)] : ''));
const goldChip = () => `<button class="goldchip" data-go="me" aria-label="내 골드">${goldNow() == null ? '🪙 로그인' : '🪙 ' + gnum(goldNow())}</button>`;

/* ── 주소 ── */
const depthNow = () => (history.state && history.state.d) || 0;
const PARENT = r => ({ ob: r[1] > 1 ? 'ob/' + (r[1] - 1) : '', w: r[2] ? 'w/' + r[1] : 'home', room: r[2] ? 'room/' + r[1] : 'w/' + r[1], lib: 'home', make: 'home', me: r[1] ? 'me' : 'home', genre: 'home' }[r[0]] || 'home');
const go = h => { const d = depthNow() + 1; location.hash = h; history.replaceState({ d }, ''); };
const goBack = () => { if (depthNow() > 0) { history.back(); return; } const p = PARENT(route()); if (p) location.replace('#' + p); };
const route = () => (location.hash.replace(/^#/, '') || (S.onboarded ? 'home' : 'ob/1')).split('/');
let lastKey = '';
function render() {
  const r = route(), key = r.slice(0, 2).join('/'), full = r.join('/');
  document.body.className = EMB ? 'emb' : '';
  if (NR_OFF) { app.innerHTML = `<div class="page"><header class="top"><div class="brand"><img src="icon/g/logo_light.svg" alt="너랑" style="height:30px;width:auto"></div></header><p class="loading">너랑은 곧 공개돼요</p></div>`; return; }
  const v = VIEWS[r[0]] || VIEWS.home;
  if (key === lastKey && r[0] === 'room' && $('#log')) { refreshRoom(); sheetLayer(r); lastKey = key; return; }   /* 대화 방은 다시 그리지 않음(스크롤 · 입력 유지) · 시트만 */
  app.innerHTML = v(...r.slice(1));
  if (r[0] === 'room') sheetLayer(r);
  if (key !== lastKey) { if (r[0] === 'room') requestAnimationFrame(() => scrollTo(0, document.body.scrollHeight)); else if (!r[2]) scrollTo(0, 0);
    if (r[0] === 'w' && W(r[1])) ev('nr_work', { w: r[1] });
    if (r[0] === 'room' && W(r[1])) ev('nr_room', { w: r[1], new: RS(r[1]).turns ? 0 : 1 }); }
  lastKey = key; void full;
  if (r[0] === 'room') { CU.anchor = null; pill(false); }
}
addEventListener('hashchange', render);
const VIEWS = {};

/* ── 처음 설정 (부를 이름 · 생년 · 좋아하는 장르 2개) ── */
VIEWS.ob = (n = '1') => {
  if (n === '1') return `<div class="ob ob1">
    <div class="clock">너랑<small>내가 들어가는 이야기</small></div>
    <h2>고르면 바로 시작,<br>끝나지 않는 이야기</h2>
    <p class="sub">한 장면을 읽고, 내 한 줄로 이어 가요. 상대가 받아서 다음 장면을 써요.</p>
    <div class="flow3">
      <div><b>1</b><p style="margin:0">작품을 골라요<span>기다림 · 회차 잠금 없이 바로</span></p></div>
      <div><b>2</b><p style="margin:0">내 말로 장면이 바뀌어요<span>엉뚱한 행동도 이야기가 받아 줘요</span></p></div>
      <div><b>3</b><p style="margin:0">관계와 상태가 쌓여요<span>다음에 와도 그 자리에서 이어져요</span></p></div>
    </div>
    <div class="grow"></div>
    <button class="cta light" data-go="ob/2">시작하기</button>
  </div>`;
  const step = k => `<div class="step">${[2, 3].map(i => `<i class="${i <= k ? 'on' : ''}"></i>`).join('')}</div>`;
  const obBack = `<div class="ob-back top clear" style="color:var(--ink);position:absolute">${back()}</div>`;
  if (n === '2') {
    const y = S.birth, a = ageNow(), years = []; for (let k = new Date().getFullYear() - 14; k >= 1940; k--) years.push(k);
    return `<div class="ob">${obBack}${step(2)}
      <h2>이야기 속에서<br>뭐라고 부를까요?</h2><p class="sub">상대가 이 이름으로 불러요. 나중에 프로필을 여러 개 만들 수 있어요.</p>
      <label class="namebox"><input id="nm" maxlength="8" value="${esc(S.name)}" placeholder="하람" aria-label="부를 이름"><span>${[...S.name].length}/8</span></label>
      <div class="lab">태어난 해 <span style="font-weight:600">· 이야기 수위를 맞춰요 · 이 기기에만</span></div>
      <label class="selbox"><select id="by" aria-label="태어난 해"><option value="">고르기</option>${years.map(k => `<option value="${k}" ${k === y ? 'selected' : ''}>${k}년</option>`).join('')}<option value="young" ${y && a < 14 ? 'selected' : ''}>${new Date().getFullYear() - 13}년 이후</option></select></label>
      ${y && a < 14 ? '<p class="sub" style="margin:10px 0 0;color:var(--co)">너랑은 만 14세 이상만 이용할 수 있어요.</p>' : ''}
      ${a >= 19 ? `<button class="optin" data-toggle="adultOk"><div class="t"><b>성인 칸 보기</b><span>만 19세 이상입니다 — 더 짙은 소재(금지된 관계 · 누아르)가 열려요 · 성적 묘사는 어디에도 없어요</span></div><span class="sw ${S.adultOk ? 'on' : ''}"></span></button>` : ''}
      <div class="grow" style="min-height:28px"></div>
      <button class="cta" data-go="ob/3" ${!y || a < 14 || !S.name ? 'disabled' : ''}>다음</button></div>`;
  }
  return `<div class="ob">${obBack}${step(3)}
    <h2>${esc(nm())} 님은<br>어떤 이야기를 좋아해요?</h2><p class="sub">두 개쯤 골라 주세요. 홈 추천이 이걸로 맞춰져요.</p>
    <div class="picks big">${GENRES.map(g => `<button class="chip ${S.genres.includes(g) ? 'on' : ''}" data-pick="${g}">${g}</button>`).join('')}</div>
    <div class="grow" style="min-height:28px"></div>
    <button class="cta" data-start="1" ${S.genres.length ? '' : 'disabled'}>${S.genres.length ? '작품 보러 가기' : '하나 이상 골라 주세요'}</button></div>`;
};

/* ── 홈 ── */
const nav = on => `<nav class="nrnav">${[['home', 'home', '홈'], ['lib', 'book', '내 이야기'], ['make', 'pen', '만들기'], ['me', 'user', '내 정보']].map(([k, ic, l]) => `<button class="${on === k ? 'on' : ''}" ${on === k ? '' : `data-nav="${k}"`}>${I(ic, 's')}${l}</button>`).join('')}</nav>`;
const visible = () => LIST.filter(w => w.room !== 'adult' || adultOn());
const lastLine = id => { const r = RS(id); for (let i = r.log.length - 1; i >= 0; i--) { const x = r.log[i]; if (x.k === 'ai' && !x.safe) { const s = (x.items || []).find(y => y.k === 'say'); if (s) return s.t; } } return ''; };
const row = (w, sub) => `<button class="rw" data-go="w/${w.id}">${cover(w, '', false)}<div class="m"><b>${esc(w.title)}</b><small>${sub}</small></div></button>`;
const tile = (w, badge = '') => `<button class="it" data-go="w/${w.id}">${cover(w, badge)}<b>${esc(w.title)}</b><small>${av(w, 16)}${esc(w.ch.name)}${w.room === 'adult' ? ' · <em class="r19">성인</em>' : ''}</small></button>`;
VIEWS.home = () => {
  const L = visible(), ongoing = L.filter(w => RS(w.id).turns > 0).sort((a, b) => RS(b.id).at - RS(a.id).at);
  const rec = [...L].sort((a, b) => (S.genres.includes(b.genre) ? 2 : 0) - (S.genres.includes(a.genre) ? 2 : 0) || (H.rank[b.id] || 0) - (H.rank[a.id] || 0)).slice(0, 6);
  const top = [...L].sort((a, b) => (H.rank[b.id] || 0) - (H.rank[a.id] || 0)).slice(0, 5);
  const news = L.filter(w => w.v === 2).sort((a, b) => ((b.since || '') > (a.since || '') ? 1 : -1)).slice(0, 6);   /* 새 형식 원고 = 이번 개편의 새 작품 (첫 공개 날짜가 있으면 그 순) */
  const gs = GENRES.filter(g => L.some(w => w.genre === g || w.genre2 === g)), gt = gs.includes(S.gtab) ? S.gtab : gs.find(g => S.genres.includes(g)) || gs[0];
  const sale = L.find(w => w.sale);
  const band = sale ? `<button class="band" data-go="w/${sale.id}">${I('spark', 's')}<span><b>새 작품 주간</b> 「${esc(sale.short)}」 깊은 대화 🪙${H.price.deep.normal - H.price.deepSale}</span></button>`
    : `<div class="band">${I('bolt', 's')}<span>오늘의 무료 <b>${H.left.free}번</b> · 가벼운 대화 <b>${H.left.light}번</b> · 밤 9시에 다시 채워져요</span></div>`;
  const cont = ongoing.length ? `<div class="sec"><div class="sh"><h2>이어 하기</h2><span class="more" data-nav="lib">${ongoing.length}편</span></div>
    <div class="hs cont">${ongoing.slice(0, 8).map(w => { const r = RS(w.id), l = lastLine(w.id); return `<button class="ct2" data-go="room/${w.id}">${cover(w, '', false, 'width:64px;height:84px;')}<div class="m"><b>${esc(w.short)}</b><p>${esc(l ? `${w.ch.short} · ${l}` : w.hook)}</p><small>${r.turns}번 이어 감</small></div></button>`; }).join('')}</div></div>` : '';
  return `<div class="page">
    <header class="top"><div class="brand"><img src="icon/g/logo_light.svg" alt="너랑" style="height:30px;width:auto"></div><div style="flex:1"></div>${goldChip()}</header>
    ${nav('home')}${band}${cont}
    <div class="sec"><div class="sh"><h2>${S.genres.length ? `${esc(S.genres.slice(0, 2).join(' · '))} 좋아하는 ${esc(nm())} 님께` : '오늘의 추천'}</h2></div><div class="hs">${rec.map(w => tile(w)).join('')}</div></div>
    <div class="sec"><div class="sh"><h2>이번 주 많이 이어 간 이야기</h2><span class="more">대화 수</span></div>
      <div class="rank">${top.map((w, i) => `<button data-go="w/${w.id}"><span class="n ${i < 3 ? 't' : ''}">${i + 1}</span>${cover(w, '', false)}<div class="m"><b>${esc(w.title)}</b><small>${esc(w.genre)}${H.rank[w.id] ? ` · 이번 주 <b>${gnum(H.rank[w.id])}</b>번` : ` · ${esc(w.ch.name)}`}</small></div></button>`).join('')}</div></div>
    ${news.length ? `<div class="sec"><div class="sh"><h2>새 작품</h2></div><div class="hs">${news.map(w => tile(w, w.sale ? '<span class="cg">NEW</span>' : '')).join('')}</div></div>` : ''}
    <div class="sec"><div class="sh"><h2>장르</h2></div><div class="gtabs">${gs.map(g => `<button class="chip ${g === gt ? 'on' : ''}" data-gtab="${g}">${g}</button>`).join('')}</div>
      <div class="glist">${L.filter(w => w.genre === gt || w.genre2 === gt).map(w => row(w, `${esc(w.hook)}`)).join('') || '<p class="loading" style="padding:30px">곧 채워져요</p>'}</div></div>
    ${adultAge() && !S.adultOk ? `<button class="band adult" data-adult="1">${I('lock', 's')}<span><b>성인 칸</b> · 만 19세 이상 확인하면 더 짙은 소재가 열려요</span></button>` : ''}
    <p class="foot">모든 작품은 원어데이 창작이에요 · 대화는 AI 가 상대 역으로 함께 써요 · 대화 원문은 이 기기에만 남아요</p>
  </div>`;
};

/* ── 작품 소개 ── */
const statPreview = w => (w.stat || []).filter(d => !['place', 'time', 'inner'].includes(d.k)).map(d => `<span class="sp1"><small>${esc(d.label)}</small><b>${esc(d.type === 'stage' ? (d.init || (d.steps || [])[0]) : d.type === 'list' ? String(d.init || '').split(/\s*,\s*/).length + '개' : d.init)}${d.type === 'num' && d.max ? `<i>/${d.max}</i>` : ''}</b></span>`).join('');
VIEWS.w = (id, sub) => {
  const w = W(id); if (!w) return VIEWS.home();
  if (w.room === 'adult' && !adultOn()) return `<div class="page"><header class="top">${back()}<h1></h1></header><div class="gate">${I('lock')}<h3>성인 칸 작품이에요</h3><p>만 19세 이상 확인 뒤에 볼 수 있어요.</p>${adultAge() ? '<button class="cta" data-adult="1">만 19세 이상입니다</button>' : '<button class="cta ghost" data-go="home">다른 작품 보기</button>'}</div></div>`;
  const r = RS(id), o = setOf(id), pv = (w.opening.body || []).filter(x => x[0] !== 'd').slice(0, 3);
  return `<div class="page" style="padding-bottom:120px">
    <div class="whero" style="${coverOf(w) ? `background-image:url(${coverOf(w)});` : ''}background-color:${w.tint}">
      <header class="top clear">${back()}<h1></h1>${goldChip()}</header>
      <div class="in"><div class="g">${esc(w.genre)}${w.genre2 ? ' · ' + esc(w.genre2) : ''}${w.kind === 'game' ? ' · 상태 창 게임' : ''}${w.room === 'adult' ? ' · <em class="r19">성인 칸</em>' : ''}</div><h2>${esc(w.title)}</h2>
        <div class="meta"><span>고르면 바로</span><span>·</span><span>끝없이 이어짐</span>${H.rank[id] ? `<span>·</span><span>이번 주 대화 <b>${gnum(H.rank[id])}</b></span>` : ''}</div></div></div>
    <p class="hook">${esc(w.hook)}</p>
    <div class="intro">${w.intro.map(x => `<p>${esc(x)}</p>`).join('')}</div>
    <div class="tags">${w.tags.map(t => `<span>#${esc(t)}</span>`).join('')}</div>
    <div class="role">${I('user', 's')}<span>나의 역할 · <b>${esc((t => (t.length > 90 ? t.slice(0, 89) + '…' : t))(fillName(w.role, nm(profOf(o.prof)))))}</b></span></div>
    <div class="sec"><div class="sh"><h2>상대</h2></div><div class="ccard"><div class="hd">${av(w, 46)}<div style="flex:1"><b>${esc(w.ch.name)}</b><small>${esc(w.ch.who)}</small></div></div></div></div>
    ${w.kind === 'game' || w.goal ? `<div class="sec"><div class="sh"><h2>목표 · 상태 창</h2></div><div class="goal">${w.goal ? `<p>${esc(w.goal)}</p>` : ''}<div class="sp">${statPreview(w)}</div></div></div>` : ''}
    <div class="sec"><div class="sh"><h2>첫 장면 미리 보기</h2></div><div class="pp prev">${pv.map(x => x[0] === 's' ? `<p class="s"><small>${esc(x[2] || w.ch.short)}</small>${esc(x[1])}</p>` : `<p>${esc(x[1])}</p>`).join('')}<div class="fade"></div></div></div>
    <div class="nums4"><div><b>${gnum(H.rank[id] || 0)}</b><small>이번 주 대화</small></div><div><b>${(w.stat || []).length}</b><small>상태 창 칸</small></div><div><b>${r.turns || 0}</b><small>내가 이어 간</small></div><div><b>${esc((r.room.stat && r.room.stat.bond) || ((w.stat || []).find(d => d.k === 'bond') || {}).init || '')}</b><small>관계</small></div></div>
    <div class="sticky two"><button class="cta ghost" data-go="w/${id}/set" aria-label="시작 전 설정">${I('tune', 's')}설정</button>${r.turns ? `<button class="cta ghost" data-reset="${id}" style="flex:0 0 96px">새로 하기</button>` : ''}<button class="cta" data-go="room/${id}">${r.turns ? `이어 하기 · ${r.turns}번째부터` : '시작하기'}<small>${esc(MODE_NAME[o.mode])} · ${esc(LEN_NAME[o.len])} · ${esc(costLabel(o, w))}</small></button></div>
  </div>${sub === 'set' ? setSheet(w) : ''}`;
};

/* ── 설정 시트 (작품 소개 · 대화 방 공통) ── */
function setSheet(w) {
  const o = setOf(w.id), seg = (k, list, label) => `<div class="seg wide">${list.map(([v, l, p]) => `<button class="${o[k] === v ? 'on' : ''}" data-set="${k}" data-v="${v}">${l}${p ? `<small>${p}</small>` : ''}</button>`).join('')}</div>`;
  const P0 = H.price, m = o.mode === 'deep' ? 'deep' : 'basic', r = RS(w.id), memoMax = P0.memo[o.memo === 'wide' ? 'wide' : 'normal'];
  const lp = l => { const g = priceOf({ ...o, len: l, memo: 'normal' }, w); return m === 'basic' && l === 'short' ? '무료 60번' : `🪙${g}`; };
  return `<div class="dim" data-back></div><div class="sheet" role="dialog" aria-label="시작 전 설정"><div class="grab"></div><h4>이 이야기 설정</h4>
    <div class="lab2">내 프로필 <button class="lnk" data-go="me/prof">관리</button></div>
    <div class="profs">${S.profiles.map(p => `<button class="chip ${o.prof === p.id ? 'on' : ''}" data-set="prof" data-v="${p.id}">${esc(nm(p))}${p.role ? `<small>${esc(p.role.slice(0, 14))}</small>` : ''}</button>`).join('')}${S.profiles.length < 10 ? `<button class="chip add" data-go="me/prof/new">${I('plus', 'xs')}새 프로필</button>` : ''}</div>
    <div class="lab2">대화 모드</div>${seg('mode', [['basic', '기본 대화', `🪙${P0.basic.normal}`], ['deep', '깊은 대화', `🪙${P0.deep.normal - (w.sale ? P0.deepSale : 0)}`]])}
    <p class="hint2">${o.mode === 'deep' ? '감정과 문장이 더 섬세해요 · 중요한 장면에 써 보세요' : '빠르고 가볍게 · 짧게 고르면 하루 60번 무료'}</p>
    <div class="lab2">답 길이</div>${seg('len', [['short', '짧게', lp('short')], ['normal', '보통', lp('normal')], ['long', '넉넉히', lp('long')], ['xl', '아주 길게', lp('xl')]])}
    <div class="lab2">문체 <span>값은 같아요</span></div>${seg('tone', [['', '웹소설', '서술 + 대사'], ['talk', '대화 위주', '짧은 서술'], ['rich', '묘사 많이', '감각 · 표정']])}
    <div class="lab2">상황 그림 <span>대화 사이에 크게</span></div><div class="seg wide"><button class="${S.showImg !== false ? 'on' : ''}" data-imgtog="1">보기</button><button class="${S.showImg === false ? 'on' : ''}" data-imgtog="0">접기<small>작은 단추로</small></button></div>
    <div class="lab2">기억 노트 · 유저 노트 <span>${gnum(memoMax)}자</span></div>${seg('memo', [['normal', '보통', '그대로'], ['wide', '넓게', `+🪙${P0.memoWide}`]])}
    <textarea id="note" maxlength="${memoMax}" placeholder="상대가 꼭 기억했으면 하는 것 — 내 설정 · 지난 일 · 약속 (이 기기에만)" aria-label="기억 노트">${esc(r.note || '')}</textarea>
    <div class="paynow">이 설정의 한 번 값 <b>${esc(costLabel(o, w))}</b><small>가벼운 무료 → 오늘의 무료 → 광고 → 골드 순서로 써요 · 실패한 답은 빼지 않아요</small></div>
    <div class="row2"><button class="cta ghost" data-setdef="1">모든 작품 기본값으로</button><button class="cta" data-back>이대로 하기</button></div></div>`;
}

/* ── 대화 방 ── */
let busy = false, editing = null;
const ctxOf = (r = route()) => { const w = W(r[1]); if (!w || r[0] !== 'room') return null; return { w, st: RS(w.id) }; };
const statNow = c => c.st.room.stat || Object.fromEntries((c.w.stat || []).map(d => [d.k, d.type === 'list' ? String(d.init || '').split(/\s*,\s*/).filter(Boolean) : d.init]));
const bondNow = c => { const s = statNow(c), d = (c.w.stat || []).find(x => x.k === 'bond'); return s.bond || (d && d.init) || STD_STAGES[0]; };
function statBar(c) {
  const s = statNow(c), defs = c.w.stat || [], on = defs.filter(d => d.show !== 'fold' && d.k !== 'bond'), fold = defs.filter(d => d.show === 'fold');
  const val = d => { const v = s[d.k]; if (d.type === 'num') { const pc = d.max ? Math.max(0, Math.min(100, Math.round(((Number(v) || 0) - (d.min || 0)) / ((d.max - (d.min || 0)) || 1) * 100))) : null; return `<b>${esc(v ?? '—')}</b>${pc != null && d.max <= 1000 ? `<i class="mb"><i style="width:${pc}%"></i></i>` : ''}`; } return `<b>${esc(Array.isArray(v) ? v.join(' · ') || '—' : v || '—')}</b>`; };
  return `<div class="stat" id="stat"><span class="bondb">${esc(bondNow(c))}</span>${on.map(d => `<span class="si ${d.type}"><small>${esc(d.label)}</small>${val(d)}</span>`).join('')}${fold.length ? `<button class="sfold" data-fold="1" aria-label="상태 창 더 보기">${I('down', 'xs')}</button>` : ''}
    ${fold.length ? `<div class="sx ${S.statOpen ? '' : 'hide'}">${fold.map(d => `<span class="si"><small>${esc(d.label)}</small>${val(d)}</span>`).join('')}</div>` : ''}</div>`;
}
const chBubble = (w, lines, noav) => `<div class="lg-c">${noav ? '<span class="sp"></span>' : av(w, 34)}<div class="stack">${noav ? '' : `<span class="who">${esc(w.ch.short)}</span>`}${lines.map(x => `<div class="bb${x.k === 'safe' ? ' safe' : ''}">${esc(x.t)}</div>`).join('')}</div></div>`;
function group(w, items) { let h = '', run = [], first = true; const flush = () => { if (run.length) { h += chBubble(w, run, !first); first = false; run = []; } }; for (const it of items) { if (it.k === 'say' || it.k === 'safe') run.push(it); else { flush(); first = true; h += `<div class="lg-n">${esc(it.t)}</div>`; } } flush(); return h; }
const paper = (w, body, title, img) => `<div class="pp">${title ? `<div class="pt">${esc(title)}</div>` : ''}${img ? imgCard(w, img, 'pimg') : ''}${(body || []).map(([k, x, who]) => k === 's' ? `<p class="s" style="--cc:${who && who !== w.ch.short ? 'var(--rtx2)' : w.ch.col || w.col}"><small>${esc(who || w.ch.short)}</small>${esc(fillName(x, nm(profOf(setOf(w.id).prof))))}</p>` : k === 'd' ? `<p class="d">${esc(x)}</p>` : `<p>${esc(fillName(x, nm(profOf(setOf(w.id).prof))))}</p>`).join('')}</div>`;
const lastIdx = (st, k) => { for (let i = st.log.length - 1; i >= 0; i--) if (st.log[i].k === k) return i; return -1; };
function entryHtml(c, x, i) {
  const w = c.w, st = c.st, lastAi = lastIdx(st, 'ai'), lastMe = lastIdx(st, 'me');
  if (x.k === 'me') return `<div class="lg-m" data-i="${i}"><div class="bb">${esc(x.t)}</div>${i === lastMe && !busy && lastAi > i ? `<button class="ed" data-edit="${i}" aria-label="내 말 고치기">${I('pen', 'xs')}고치기</button>` : ''}</div>`;
  if (x.k === 'ai') {
    const acts = i === lastAi && !busy && !x.safe ? `<div class="acts"><button data-alt="${i}">${I('redo', 'xs')}다른 반응 · ${esc(costLabel(setOf(w.id), w))}</button><button data-undo="${i}">${I('undo', 'xs')}되돌리기</button></div>` : '';
    return `<div class="lg-ai" data-i="${i}">${x.card ? `<div class="band2">— ${esc(x.card)}</div>` : ''}${group(w, x.items)}${x.image && x.image !== 'none' ? (S.showImg === false ? `<button class="imgmini" data-zoom="${esc(x.image)}">${I('spark', 'xs')}상황 그림 보기</button>` : imgCard(w, x.image)) : ''}${x.chapter ? paper(w, x.chapter.body, x.chapter.title, x.chapter.img) : ''}${acts}</div>`;
  }
  if (x.k === 'stage') return `<div class="lg-st" data-i="${i}"><small>관계가 한 칸 깊어졌어요</small><b>${esc(x.from)} → ${esc(x.to)}</b></div>`;
  if (x.k === 'sec') return `<div class="lg-sec" data-i="${i}"><small>${I('unlock', 'xs')}나만 아는 것 +1 · 비밀 ${x.n}</small><p>${esc(mine(x.t))}</p></div>`;
  if (x.k === 'err') return `<div class="lg-err" data-i="${i}">${esc(x.t)}</div>`;
  return '';
}
const guide = w => `<div class="guide"><b>이렇게 이어 가요</b><ul>${w.goal ? `<li><em>목표</em> ${esc(w.goal)}</li>` : ''}<li>아래 추천 답을 누르거나, 내 말 · 행동을 그대로 써요 — 행동은 (괄호)에 넣으면 장면으로 읽혀요</li><li>엉뚱한 행동도 이야기가 받아서 바뀌어요${w.kind === 'game' ? ' · 위 상태 창 숫자가 바닥나도 끝나지 않고 다시 일어서요' : ''}</li><li>마음에 안 들면 <em>다른 반응</em> · 한 번 전으로 <em>되돌리기</em> · 보낸 말 <em>고치기</em></li></ul></div>`;
const logHtml = c => `<div class="ailine">AI 가 상대 역으로 함께 쓰는 가상의 이야기예요 · 실제 인물 · 사건과 관계없어요</div><div class="lg-sc"><span>${esc(c.w.title)}</span></div>${paper(c.w, c.w.opening.body, '', c.w.opening.img)}${c.st.log.length < 2 ? guide(c.w) : ''}` + c.st.log.map((x, i) => entryHtml(c, x, i)).join('');
function dockHtml(c) {
  const st = c.st, last = st.log.filter(x => x.k === 'ai' || x.k === 'me').slice(-1)[0], o = setOf(c.w.id);
  const chips = busy ? null : !last ? c.w.opening.chips : last.k === 'ai' && !last.safe ? last.chips : null;
  return `${editing != null ? `<div class="editing">${I('pen', 'xs')}내 말 고치는 중 · 보내면 그 자리부터 다시 써요<button data-edit-cancel="1">취소</button></div>` : ''}
    ${chips && chips.length && editing == null ? `${!last ? `<div class="myset">${I('user', 'xs')}<span>나의 설정 · <b>${esc(nm(profOf(o.prof)))}</b> — ${esc((profOf(o.prof).role || fillName(c.w.role, nm(profOf(o.prof)))).slice(0, 60))}</span><button data-go="room/${c.w.id}/set">바꾸기</button></div>` : ''}
    <div class="sugs">${chips.map(([k, x], i) => `<div class="sg"><button data-chip="${i}"><em>${esc(k)}</em>${esc(fillName(x, nm(profOf(o.prof))))}</button><button class="pen" data-chipedit="${i}" aria-label="고쳐서 보내기">${I('pen', 'xs')}</button></div>`).join('')}</div>` : ''}
    <form class="inrow" id="inform"><input id="say" placeholder="${busy ? `${esc(c.w.ch.short)}${josa(c.w.ch.short, '이', '가')} 쓰는 중…` : '내 말 · 내 행동 — 무엇이든'}" autocomplete="off" maxlength="300" aria-label="직접 쓰기" ${busy ? 'disabled' : ''}><button class="send" aria-label="보내기" ${busy ? 'disabled' : ''}>${I('send')}</button></form>
    <div class="hint"><button class="cost" data-go="room/${c.w.id}/set">${esc(MODE_NAME[o.mode])} · ${esc(LEN_NAME[o.len])}${o.memo === 'wide' ? ' · 기억 넓게' : ''}</button><span>이번 한 번 <b id="costnow">${esc(costLabel(o, c.w))}</b></span></div>`;
}
function roomView(c) {
  const w = c.w;
  return `<div class="talk room">
    <div class="thead"><div class="r1">${back()}${av(w, 36)}<div class="nm"><b>${esc(w.ch.name)}</b><small>${esc(w.short)} · ${c.st.turns ? `${c.st.turns}번째 장면` : '첫 장면'}</small></div>
      <button class="turns" data-go="room/${w.id}/charge" aria-label="내 골드 · 남은 무료">🪙<span id="tl">${goldNow() == null ? '0' : gnum(goldNow())}</span><i class="fr">무료 <span id="tf">${H.left.light + H.left.free + H.left.ad}</span></i></button><button class="btn" data-go="room/${w.id}/set" aria-label="설정">${I('tune')}</button></div>
      ${statBar(c)}</div>
    <div class="log" id="log">${logHtml(c)}</div>
    <div class="dock" id="dock">${dockHtml(c)}</div></div>`;
}
VIEWS.room = id => {
  const w = W(id); if (!w) return VIEWS.home();
  if (w.room === 'adult' && !adultOn()) return VIEWS.w(id);
  S.lastW = id; S.seen = Date.now(); save();
  return roomView(ctxOf(['room', id]));
};
/* 대화 방 위 시트: 설정 · 충전 안내 (주소 뒤 칸 · 뒤로가기 = 닫기) */
let CH = null;   /* 충전 안내가 열린 까닭 { why: login · short · teen · info, need, q } */
function sheetLayer(r) {
  const old = $('#roomsheet'); if (old) old.remove();
  const c = ctxOf(r); if (!c || !r[2]) return;
  const html = r[2] === 'set' ? setSheet(c.w) : r[2] === 'charge' ? chargeSheet(c) : '';
  if (html) document.body.insertAdjacentHTML('beforeend', `<div id="roomsheet">${html}</div>`);
}
function chargeSheet(c) {
  const w = c.w, o = setOf(w.id), b = payOf(o, w), why = (CH && CH.why) || (b.pay === 'gold' ? (goldNow() == null ? 'login' : goldNow() < b.gold ? 'short' : 'info') : 'info');
  const L = H.left, P0 = H.price, adLeft = Math.max(0, (L.adMax || P0.adMax) - (L.ads || 0)), lightOk = L.light > 0 && !(o.mode === 'basic' && o.len === 'short' && o.memo !== 'wide');
  ev('nr_charge', { what: 'view', reason: why }, 'cv/' + why + '/' + Date.now().toString().slice(0, 8));
  const head = why === 'teen' ? `<h4>이번 달 골드 한도를 다 썼어요</h4><p class="sub2">만 14~18세는 너랑 골드를 한 달에 🪙${gnum(P0.teenMonth)}까지 써요 · 무료 대화는 그대로예요</p>`
    : why === 'login' ? `<h4>이어 가려면 골드가 필요해요</h4><p class="sub2">이번 한 번 🪙${b.gold} · 골드는 원어데이 계정에 있어요</p>`
    : why === 'short' ? `<h4>골드가 조금 모자라요</h4><p class="sub2">이번 한 번 🪙${(CH && CH.need) || b.gold} · 내 골드 🪙${gnum(goldNow())}</p>`
    : `<h4>오늘 남은 무료</h4><p class="sub2">가벼운 대화 ${L.light}번 · 오늘의 무료 ${L.free}번 · 광고 보너스 ${L.ad}번${goldNow() != null ? ` · 내 골드 🪙${gnum(goldNow())}` : ''}</p>`;
  const opts = [];
  if (why !== 'teen' && adLeft > 0 && (EMB || !PROD)) opts.push(`<button class="opt" data-charge="ad"><span class="ico">${I('play', 's')}</span><div class="t"><b>광고 보고 +${P0.adTurns}번</b>기본 대화로 이어 가요 · 오늘 ${adLeft}번 더 볼 수 있어요</div></button>`);
  if (why === 'login') opts.push(`<button class="opt gold" data-charge="login"><span class="ico">🪙</span><div class="t"><b>로그인하고 골드로 이어 가기</b>처음 충전이면 골드 200(1,100원) — 기본 대화 100번</div></button>`);
  else if (why !== 'teen') opts.push(`<button class="opt gold" data-charge="shop"><span class="ico">🪙</span><div class="t"><b>골드 충전하기</b>${PV_STORE() ? '원스토어로 결제해요' : '원어데이 골드 상점'} · 한 번에 🪙2부터 · 첫 충전 2배</div></button>`);
  if (o.mode === 'deep' && why !== 'info') opts.push(`<button class="opt" data-charge="basic"><span class="ico">${I('chat', 's')}</span><div class="t"><b>기본 대화로 바꾸기</b>🪙${priceOf({ ...o, mode: 'basic' }, w)}${L.free + L.ad > 0 && o.len !== 'long' && o.len !== 'xl' && o.memo !== 'wide' ? ' · 지금은 무료' : ''}</div></button>`);
  if (lightOk) opts.push(`<button class="opt" data-charge="light"><span class="ico">${I('bolt', 's')}</span><div class="t"><b>가볍게 이어 가기</b>짧은 답 · 기본 대화 · 오늘 무료 ${L.light}번 남음</div></button>`);
  return `<div class="dim" data-back></div><div class="sheet charge" role="dialog" aria-label="충전 안내"><div class="grab"></div>${head}<div class="opts">${opts.join('')}</div>
    <p class="fine2">가벼운 대화 하루 ${P0.lightDay}번 · 오늘의 무료 ${P0.freeDay}번은 밤 9시에 다시 채워져요 · 답이 실패하거나 막히면 빼지 않아요</p><button class="cta ghost" data-back>닫기 · 지금 장면 그대로</button></div>`;
}
const PV_STORE = () => Q.get('os') === '1';   /* 셸이 원스토어 안이면 주소에 os=1 (app.js renderNeorang) */
function refreshRoom() {
  const c = ctxOf(); if (!c || !$('#log')) return;
  const tl = $('#tl'); if (tl) tl.textContent = goldNow() == null ? '0' : gnum(goldNow()); const tf = $('#tf'); if (tf) tf.textContent = H.left.light + H.left.free + H.left.ad;
  const sb = $('#stat'); if (sb) sb.outerHTML = statBar(c);
  const d = $('#dock'); if (d) { const had = d.querySelector('#say'), v = had ? had.value : ''; d.innerHTML = dockHtml(c); const n = d.querySelector('#say'); if (n && v) n.value = v; }
}
function redrawLog() { const c = ctxOf(); const lg = $('#log'); if (!c || !lg) return; lg.innerHTML = logHtml(c); }

/* 새 내용 따라가기 (시안 D 그대로): 새 글이 늘어나는 만큼만 내리고, 내가 보낸 말이 머리줄 아래 닿으면 멈춤 · 위로 올려 읽으면 '새 내용 ↓' */
const CU = { anchor: null, follow: false, ty: 0 };
function pill(on) { let p = $('#newpill'); if (!on) { if (p) p.remove(); return; } if (!p) { document.body.insertAdjacentHTML('beforeend', `<button class="newpill" id="newpill">${I('down', 's')}새 내용</button>`); p = $('#newpill'); } const d = $('#dock'); p.style.bottom = (d ? innerHeight - d.getBoundingClientRect().top + 10 : 90) + 'px'; }
function startFollow(el) { CU.anchor = el; CU.follow = true; followStep(); }
function followStep() {
  const a = CU.anchor, lg = $('#log'), d = $('#dock'), th = $('.thead'); if (!a || !a.isConnected || !lg || !d || !th) return;
  const head = th.getBoundingClientRect().bottom + 8, dockTop = d.getBoundingClientRect().top - 10;
  if (CU.follow) { const top = a.getBoundingClientRect().top, bottom = lg.getBoundingClientRect().bottom - 12; const dy = Math.min(bottom - dockTop, top - head); if (dy > 1) scrollBy(0, dy); }
  pill(lg.getBoundingClientRect().bottom - 12 > d.getBoundingClientRect().top + 24);
}
const userUp = () => { if ($('#log')) CU.follow = false; };
addEventListener('wheel', e => { if (e.deltaY < 0) userUp(); }, { passive: true });
addEventListener('touchstart', e => { CU.ty = e.touches[0].clientY; }, { passive: true });
addEventListener('touchmove', e => { if (e.touches[0].clientY - (CU.ty || 0) > 8) userUp(); }, { passive: true });
addEventListener('scroll', () => { const lg = $('#log'), d = $('#dock'); if ($('#newpill') && lg && d && lg.getBoundingClientRect().bottom - 12 <= d.getBoundingClientRect().top + 80) pill(false); }, { passive: true });
document.addEventListener('click', e => { if (e.target.closest('#newpill')) { CU.follow = true; scrollBy(0, innerHeight * 0.6); setTimeout(followStep, 60); } });

/* 이력 창 (서버와 같은 방식: 30개를 넘으면 12개 단위로 앞을 자름 → 캐시 유지) */
const winHist = h => { if (h.length <= 30) return h; const drop = Math.ceil((h.length - 30) / 12) * 12; let o = h.slice(drop); while (o.length && o[0].r !== 'u') o = o.slice(1); return o; };
async function ask(body, onPart) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 60000);
  try {
    const r = await post({ stream: true, ...body }, ctl.signal), ct = r.headers.get('content-type') || '';
    if (r.status === 200 && /ndjson/.test(ct) && r.body && r.body.getReader) {
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '', done = null;
      for (;;) {
        const { value, done: end } = await rd.read(); if (end) break;
        buf += dec.decode(value, { stream: true }); let k;
        while ((k = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, k); buf = buf.slice(k + 1); if (!line.trim()) continue; let o; try { o = JSON.parse(line); } catch { continue; }
          if (o.t === 's' && Array.isArray(o.items)) onPart && onPart(o.items); else if (o.t === 'done') done = o; else if (o.t === 'safety') done = o; else if (o.t === 'error') return { error: o.error }; }
      }
      return done || { error: '이야기가 잠깐 끊겼어요' };
    }
    const j = await r.json().catch(() => ({}));
    if (r.status === 200) return j;
    return { status: r.status, ...j, error: j.error || '이야기가 잠깐 끊겼어요' };
  } catch { return { error: '연결이 잠깐 끊겼어요' }; } finally { clearTimeout(t); }
}
const snapOf = st => JSON.parse(JSON.stringify({ room: st.room, hist: st.hist.length, talks: st.talks, secrets: st.secrets, turns: st.turns }));
function restore(st, i) {   /* i 번째 'me' 앞으로 되돌림 (그 뒤 기록 · 상태 창 · 대화 수 모두) */
  const me = st.log[i]; if (!me || me.k !== 'me' || !me.snap) return false;
  const s = me.snap; st.room = s.room; st.hist = st.hist.slice(0, s.hist); st.talks = s.talks; st.secrets = s.secrets; st.turns = s.turns; st.log = st.log.slice(0, i); return true;
}
async function send(q, o = {}) {
  const c = ctxOf(); if (!c || busy || !q.trim()) return;
  const st = c.st, w = c.w, so = setOf(w.id), p0 = profOf(so.prof);
  if (o.alt != null) { const i = o.alt; if (!restore(st, i)) return; }
  else if (editing != null) { if (!restore(st, editing)) { editing = null; return; } editing = null; o.edit = true; }
  const snap = snapOf(st);
  busy = true;
  st.log.push({ k: 'me', t: q, snap }); redrawLog();
  const lg = $('#log');
  lg.insertAdjacentHTML('beforeend', `<div class="lg-ai pending">${chBubble(w, [{ k: 'say', t: '' }]).replace('<div class="bb"></div>', '<div class="bb typing"><i></i><i></i><i></i></div>')}</div>`);
  const node = lg.lastElementChild, anchor = lg.querySelector(`.lg-m[data-i="${st.log.length - 1}"]`) || node;
  refreshRoom(); startFollow(anchor);
  const tid = 't' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  const j = await ask({ w: w.id, ch: w.ch.id, room: st.room, opt: { mode: so.mode, len: so.len, memo: so.memo, tone: so.tone || undefined }, prof: p0.role || '', name: nm(p0), q, ck: o.ck || '', alt: o.alt != null, tid,
    hist: winHist(st.hist), mem: st.mem.slice(-12), note: st.note || '', nr: { talks: st.talks, secrets: st.secrets }, adultOk: w.room === 'adult' ? adultOn() : undefined },
  items => { if (items.length) { node.classList.remove('pending'); node.innerHTML = group(w, items); followStep(); } });
  busy = false;
  if (!j || (j.error && !j.safety) || (!j.items && !j.safety)) {
    node.remove(); st.log.pop(); redrawLog(); refreshRoom();
    const s2 = $('#say'); if (s2) s2.value = q;
    if (j && (j.status === 401 || j.status === 402)) { CH = { why: j.teenCap ? 'teen' : j.need === 'login' ? 'login' : 'short', need: j.need || j.price }; if (j.left) H.left = j.left; if (j.gold) H.gold = j.gold; go(`room/${w.id}/charge`); return; }
    if (j && j.status === 403 && j.adult) { toast(j.error); return; }
    toast((j && j.error ? j.error : '이야기가 잠깐 끊겼어요') + ' · 골드 · 무료 횟수는 빠지지 않았어요'); return;
  }
  ev('nr_say', { w: w.id, how: o.alt != null ? 'alt' : o.edit ? 'edit' : o.how === 'chip' ? 'chip' : 'type', mode: so.mode, n: so.len === 'short' ? 1 : so.len === 'normal' ? 2 : so.len === 'long' ? 3 : 4 });
  if (j.safety) { st.log.push({ k: 'ai', items: [{ k: 'safe', t: j.items[0].t }], safe: true }); }
  else {
    st.log.push({ k: 'ai', items: j.items, chips: (j.replies || []).slice(0, 3).map((x, i) => [['다가가기', '묻기', '엉뚱하게'][i], x, (j.cks && j.cks[i]) || '']), image: j.image, card: j.card && !j.card.scene ? j.card.title : '', chapter: j.chapter || null, cost: j.bill });
    st.hist.push({ r: 'u', t: q }, { r: 'a', t: j.raw || '' }); if (st.hist.length > 80) st.hist.splice(0, st.hist.length - 80);
    if (j.room) st.room = j.room; if (j.stat && st.room) st.room.stat = j.stat;
    const n = j.nr || {}, s0 = st.talks, b0 = bondNow(c);
    st.talks = Math.max(st.talks + (o.alt != null ? 0 : 1), n.talks || 0); st.turns++; st.at = Date.now();
    if (n.secrets) st.secrets = [...new Set([...st.secrets, ...n.secrets])];
    if (j.left) H.left = j.left; if (j.bill && j.bill.balance) H.gold = j.bill.balance;
    const b1 = bondNow(c); if (n.stageUp && b1 !== b0) { st.log.push({ k: 'stage', from: b0, to: b1 }); ev('nr_stage', { w: w.id, n: n.stage }); }
    if (n.secret) { st.log.push({ k: 'sec', n: n.secret.n, t: n.secret.text }); ev('nr_secret', { w: w.id, n: n.secret.n }); }
    if (j.chapter) ev('nr_card', { w: w.id, how: 'scene' }); else if (j.card) ev('nr_card', { w: w.id, how: 'card' });
    if (st.turns % 6 === 0) memo(w, st);
    void s0;
  }
  if (st.log.length > 200) st.log.splice(0, st.log.length - 200);
  save(); redrawLog(); refreshRoom();
  requestAnimationFrame(followStep); setTimeout(followStep, 120);
}
async function memo(w, st) {
  try { const r = await post({ act: 'memo', w: w.id, ch: w.ch.id, mem: st.mem.slice(-12), hist: winHist(st.hist).slice(-12) }); const j = await r.json();
    if (r.ok && Array.isArray(j.lines) && j.lines.length) { st.mem = j.lines.slice(0, 30); save(); } } catch { /* 다음에 */ }
}

/* ── 내 이야기 (이어 하던 방들) ── */
VIEWS.lib = () => {
  const L = LIST.filter(w => RS(w.id).turns > 0 && (w.room !== 'adult' || adultOn())).sort((a, b) => RS(b.id).at - RS(a.id).at);
  return `<div class="page"><header class="top"><h1 style="padding-left:8px">내 이야기</h1>${goldChip()}</header>${nav('lib')}
    ${L.length ? `<div class="mylist">${L.map(w => { const r = RS(w.id), l = lastLine(w.id); return `<div class="lrow2"><button class="main" data-go="room/${w.id}">${cover(w, '', false)}<div class="m"><b>${esc(w.title)}</b><div class="q">${esc(l ? `${w.ch.short} · ${l}` : w.hook)}</div><div class="ft"><span>${r.turns}번 이어 감</span><span>${esc((r.room.stat && r.room.stat.bond) || '')}</span><span>${new Date(r.at || Date.now()).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span></div></div></button>
      <button class="reset" data-reset="${w.id}" aria-label="처음부터">처음부터</button></div>`; }).join('')}</div>`
    : `<p class="loading">아직 이어 가는 이야기가 없어요<br><button class="cta" data-nav="home" style="margin-top:16px">작품 고르러 가기</button></p>`}
    <p class="foot">대화 원문은 이 기기에만 있어요 · 기기를 바꾸면 관계 단계 · 기억 요약만 이어져요(로그인)</p></div>`;
};
/* ── 만들기 (2차 · 출시 2~4주 뒤 · 결정 1의 2안 — 이번엔 자리만) ── */
VIEWS.make = () => `<div class="page"><header class="top"><h1 style="padding-left:8px">만들기</h1>${goldChip()}</header>${nav('make')}
  <div class="make"><div class="badge2">곧 열려요</div><h3>내가 쓴 설정으로<br>누구나 이어 가는 이야기</h3>
    <ol><li><b>한 문장</b>으로 시작 — 세계와 상대의 초안이 나와요</li><li><b>다듬기</b> — 첫 장면 · 상태 창 · 전개 카드</li><li><b>공개 전 확인</b> — 자동 검사 + 사람 확인</li><li><b>공개</b> — 대화 수가 쌓이면 순위에</li></ol>
    <button class="cta ghost" data-nav="home">지금은 작품 둘러보기</button></div></div>`;

/* ── 내 정보 (프로필 · 나이 · 기본 설정 · 골드 · 가격표) ── */
VIEWS.me = (sub, id) => {
  if (sub === 'prof') return profView(id);
  const P0 = H.price, o = S.def;
  return `<div class="page"><header class="top"><h1 style="padding-left:8px">내 정보</h1>${goldChip()}</header>${nav('me')}
    <div class="sec"><div class="sh"><h2>내 골드</h2></div><div class="gbox"><div><b>${goldNow() == null ? '로그인 전' : '🪙 ' + gnum(goldNow())}</b><small>원어데이 골드 하나로 게임 · 운세 · 너랑을 같이 써요</small></div>
      ${goldNow() == null ? '<button class="cta" data-charge="login">로그인</button>' : '<button class="cta" data-charge="shop">충전</button>'}</div>
      <div class="free3"><div><small>가벼운 대화</small><b>${H.left.light}</b><i>/${P0.lightDay}</i></div><div><small>오늘의 무료</small><b>${H.left.free}</b><i>/${P0.freeDay}</i></div><div><small>광고 보너스</small><b>${H.left.ad}</b><i>번</i></div></div>
      ${teen() ? `<p class="hint2" style="margin:8px 18px 0">이번 달 너랑 골드 ${gnum(H.teenUsed)} / ${gnum(P0.teenMonth)} (만 14~18세 한도)</p>` : ''}</div>
    <div class="sec"><div class="sh"><h2>내 프로필</h2><span class="more">${S.profiles.length}/10</span></div><div class="plist">${S.profiles.map(p => `<button data-go="me/prof/${p.id}"><b>${esc(nm(p))}${p.id === S.prof ? ' <em>기본</em>' : ''}</b><small>${esc(p.role || '소개 없음 — 작품의 역할 그대로')}</small></button>`).join('')}${S.profiles.length < 10 ? `<button class="add" data-go="me/prof/new">${I('plus', 's')}새 프로필</button>` : ''}</div></div>
    <div class="sec"><div class="sh"><h2>기본 대화 설정</h2><span class="more">모든 작품</span></div><div class="defs">
      <div class="seg wide">${[['basic', '기본 대화'], ['deep', '깊은 대화']].map(([v, l]) => `<button class="${o.mode === v ? 'on' : ''}" data-def="mode" data-v="${v}">${l}</button>`).join('')}</div>
      <div class="seg wide">${['short', 'normal', 'long', 'xl'].map(v => `<button class="${o.len === v ? 'on' : ''}" data-def="len" data-v="${v}">${LEN_NAME[v]}</button>`).join('')}</div>
      <div class="seg wide">${['normal', 'wide'].map(v => `<button class="${o.memo === v ? 'on' : ''}" data-def="memo" data-v="${v}">기억 ${MEMO_NAME[v]}</button>`).join('')}</div></div></div>
    <div class="sec"><div class="sh"><h2>나이 · 성인 칸</h2></div><div class="setlist">
      <div class="r"><span>태어난 해</span><b>${S.birth ? S.birth + '년' : '—'}</b><button class="lnk" data-go="ob/2">바꾸기</button></div>
      ${adultAge() ? `<button data-toggle="adultOk"><div class="t">성인 칸 보기<small>만 19세 이상 확인 · 성적 묘사는 성인 칸에도 없어요</small></div><span class="sw ${S.adultOk ? 'on' : ''}"></span></button>` : '<div class="r"><span>성인 칸</span><b>만 19세부터</b></div>'}</div></div>
    <div class="sec"><div class="sh"><h2>한 번 값</h2><span class="more">12개월 그대로</span></div><div class="ptable">
      <div class="h"><span></span><span>짧게</span><span>보통</span><span>넉넉히</span><span>아주 길게</span></div>
      <div><span>기본 대화</span><span>무료*</span><span>🪙${P0.basic.normal}</span><span>🪙${P0.basic.long}</span><span>🪙${P0.basic.xl}</span></div>
      <div><span>깊은 대화</span><span>🪙${P0.deep.short}</span><span>🪙${P0.deep.normal}</span><span>🪙${P0.deep.long}</span><span>🪙${P0.deep.xl}</span></div>
      <p>* 가벼운 대화(기본 · 짧게) 하루 ${P0.lightDay}번 무료 · 오늘의 무료 ${P0.freeDay}번(기본 · 보통까지) · 광고 한 번 +${P0.adTurns}번(하루 ${P0.adMax}번) · 기억 넓게 +🪙${P0.memoWide} · 다른 반응도 한 번 값 · 실패한 답 · 안전 안내는 빼지 않아요 · 1골드 = 10원</p></div></div>
    <div class="sec"><div class="sh"><h2>보기</h2></div><div class="seg wide" style="margin:0 18px">${[['작게', 0], ['보통', 1], ['크게', 2], ['아주', 3]].map(([l, i]) => `<button class="${S.view.fs === i ? 'on' : ''}" data-fs="${i}">${l}</button>`).join('')}</div></div>
    <p class="foot">이름 · 생년은 이 기기에만 · 서버에는 나이 구간(성인 / 청소년)만 · 대화 원문은 기기에만 남아요</p></div>`;
};
function profView(id) {
  const isNew = id === 'new', p = isNew ? { id: '', name: '', role: '' } : S.profiles.find(x => x.id === id);
  if (!p) return VIEWS.me();
  return `<div class="page"><header class="top">${back()}<h1>${isNew ? '새 프로필' : '프로필 고치기'}</h1></header>
    <div class="pform"><label>부를 이름<input id="pn" maxlength="8" value="${esc(p.name)}" placeholder="하람"></label>
      <label>나를 한 줄로 <small>상대가 이걸 사실로 받아요 · 작품의 역할 안에서 · 120자</small><textarea id="pr" maxlength="120" placeholder="예: 말보다 행동이 먼저인 사람. 단 거 좋아함.">${esc(p.role)}</textarea></label>
      <div class="row2">${!isNew && S.profiles.length > 1 ? `<button class="cta ghost" data-pdel="${p.id}">지우기</button>` : ''}${!isNew && S.prof !== p.id ? `<button class="cta ghost" data-pdef="${p.id}">기본으로</button>` : ''}<button class="cta" data-psave="${isNew ? 'new' : p.id}">저장</button></div></div></div>`;
}

/* ── 이벤트 ── */
document.addEventListener('click', e => {
  const z = e.target.closest('[data-zoom],[data-chipedit],[data-imgtog]');
  if (z) { const zd = z.dataset, c = ctxOf();
    if (zd.zoom != null && c) { const box = document.createElement('div'); box.className = 'zoom'; box.innerHTML = imgCard(c.w, zd.zoom, 'zimg') + '<button class="cta ghost">닫기</button>'; box.onclick = () => box.remove(); document.body.append(box); return; }
    if (zd.chipedit != null && c) { const st = c.st, last = st.log.filter(x => x.k === 'ai' || x.k === 'me').slice(-1)[0], chips = !last ? c.w.opening.chips : last.chips; const sy = $('#say'); if (chips && chips[+zd.chipedit] && sy) { sy.value = fillName(chips[+zd.chipedit][1], nm(profOf(setOf(c.w.id).prof))); sy.focus(); } return; }
    if (zd.imgtog != null) { S.showImg = zd.imgtog === '1'; save(); redrawLog(); sheetLayer(route()); return; } }
  const el = e.target.closest('[data-go],[data-back],[data-pick],[data-toggle],[data-start],[data-chip],[data-alt],[data-undo],[data-edit],[data-edit-cancel],[data-nav],[data-gtab],[data-set],[data-setdef],[data-def],[data-charge],[data-adult],[data-fold],[data-reset],[data-psave],[data-pdel],[data-pdef],[data-fs]');
  if (!el) return; const d = el.dataset;
  if ('back' in d) { e.preventDefault(); goBack(); return; }
  if (d.go) { if (busy && route()[0] === 'room' && !/^room\//.test(d.go)) { toast('답을 기다리는 중이에요'); return; } if (/\/charge$/.test(d.go)) CH = null; go(d.go); return; }
  if (d.nav) { location.replace('#' + d.nav); history.replaceState({ d: 0 }, ''); return; }
  if (d.pick) { const a = S.genres, i = a.indexOf(d.pick); i < 0 ? a.push(d.pick) : a.splice(i, 1); save(); render(); return; }
  if (d.toggle) { S[d.toggle] = !S[d.toggle]; save(); if (d.toggle === 'adultOk') { ev('nr_set', { what: 'adult', ok: S.adultOk ? 1 : 0 }); home().then(render); } render(); return; }
  if (d.adult) { if (!adultAge()) { toast('성인 칸은 만 19세부터예요'); return; } S.adultOk = true; save(); ev('nr_set', { what: 'adult', ok: 1 }); toast('성인 칸이 열렸어요 · 성적 묘사는 여기에도 없어요'); render(); return; }
  if (d.start) { S.onboarded = true; S.profiles[0].name ||= S.name; save(); ev('nr_set', { what: 'ob', n: S.genres.length }); location.replace('#home'); history.replaceState({ d: 0 }, ''); home().then(render); return; }
  if (d.gtab) { S.gtab = d.gtab; save(); ev('nr_set', { what: 'genre' }); render(); return; }
  if (d.chip) { const c = ctxOf(), st = c && c.st, last = st && st.log.filter(x => x.k === 'ai' || x.k === 'me').slice(-1)[0], chips = !last ? c.w.opening.chips : last.chips; if (chips && chips[+d.chip]) send(fillName(chips[+d.chip][1], nm(profOf(setOf(c.w.id).prof))), { how: 'chip', ck: chips[+d.chip][2] || '' }); return; }   /* ck: 서버가 준 추천 서명 — 고치지 않고 보내면 서버가 판별을 건너뜀 */
  if (d.alt) { const c = ctxOf(), st = c && c.st, i = +d.alt; let k = i - 1; while (k >= 0 && st.log[k].k !== 'me') k--; if (k >= 0) send(st.log[k].t, { alt: k }); return; }
  if (d.undo) { const c = ctxOf(), st = c && c.st; let k = +d.undo - 1; while (k >= 0 && st.log[k].k !== 'me') k--; if (k >= 0 && restore(st, k)) { save(); redrawLog(); refreshRoom(); ev('nr_undo', { w: c.w.id }); toast('한 번 전으로 되돌렸어요'); } return; }
  if (d.edit) { const c = ctxOf(), st = c && c.st, i = +d.edit; if (!st || !st.log[i]) return; editing = i; refreshRoom(); const s = $('#say'); if (s) { s.value = st.log[i].t; s.focus(); } ev('nr_undo', { w: c.w.id, what: 'edit' }); return; }
  if ('editCancel' in d) { editing = null; const s = $('#say'); if (s) s.value = ''; refreshRoom(); return; }   /* 고치기 취소 = 꺼내 둔 말도 비움 */
  if (d.set) { const id = route()[1], r = RS(id); r.set = { ...setOf(id), [d.set]: d.v }; save(); ev('nr_set', { what: d.set, v: d.v }); if (route()[0] === 'room') { sheetLayer(route()); refreshRoom(); } else render(); return; }
  if (d.setdef) { const id = route()[1], s = setOf(id); S.def = { mode: s.mode, len: s.len, memo: s.memo, tone: s.tone }; S.prof = s.prof; save(); toast('모든 작품의 기본값으로 저장했어요'); return; }
  if (d.def) { S.def = { ...S.def, [d.def]: d.v }; save(); render(); return; }
  if (d.charge) { charge(d.charge); return; }
  if (d.fold) { S.statOpen = !S.statOpen; save(); refreshRoom(); return; }
  if (d.reset) { const w = W(d.reset); if (w && confirm(`「${w.short}」을 처음부터 다시 할까요? 이 기기의 대화 기록이 지워져요 (관계 단계 · 기억 요약은 남아요)`)) { const r = RS(d.reset); Object.assign(r, { ...blankRoom(), talks: r.talks, secrets: r.secrets, mem: r.mem, set: r.set }); save(); render(); } return; }
  if (d.psave) { const n = ($('#pn').value || '').replace(/\s+/g, '').slice(0, 8), role = ($('#pr').value || '').trim().slice(0, 120); if (!n) { toast('부를 이름을 적어 주세요'); return; }
    if (d.psave === 'new') { const id = 'p' + Date.now().toString(36); S.profiles.push({ id, name: n, role }); if (route()[0] === 'me') ev('nr_set', { what: 'prof' }); } else Object.assign(S.profiles.find(x => x.id === d.psave) || {}, { name: n, role });
    if (S.profiles[0].id === S.prof && !S.name) S.name = n; save(); toast('프로필을 저장했어요'); goBack(); return; }
  if (d.pdel) { S.profiles = S.profiles.filter(x => x.id !== d.pdel); if (S.prof === d.pdel) S.prof = S.profiles[0].id; for (const r of Object.values(S.rooms)) if (r.set && r.set.prof === d.pdel) r.set.prof = S.prof; save(); goBack(); return; }
  if (d.pdef) { S.prof = d.pdef; save(); toast('기본 프로필로 정했어요'); render(); return; }
  if (d.fs) { S.view.fs = +d.fs; save(); applyView(); render(); return; }
});
async function charge(what) {
  const id = route()[1], r = route()[0] === 'room' ? RS(id) : null;
  if (what === 'ad') { const ok = await watchAd(); if (ok && route()[0] === 'room') { goBack(); refreshRoom(); } else render(); return; }
  if (what === 'shop') { await goShop('너랑 한 번 🪙2부터 · 보너스 골드도 너랑에 써요'); if (route()[2] === 'charge') goBack(); return; }
  if (what === 'login') { await goLogin(); if (route()[2] === 'charge') goBack(); return; }
  if (what === 'basic' && r) { r.set = { ...setOf(id), mode: 'basic' }; save(); toast('기본 대화로 바꿨어요'); goBack(); return; }
  if (what === 'light' && r) { r.set = { ...setOf(id), mode: 'basic', len: 'short', memo: 'normal' }; save(); toast('가볍게 이어 가요 · 짧은 답 무료'); goBack(); return; }
}
document.addEventListener('submit', e => { if (e.target.id === 'inform') { e.preventDefault(); const i = $('#say'); const v = (i.value || '').trim(); if (!v) return; i.value = ''; send(v.slice(0, 300)); } });
document.addEventListener('input', e => {
  if (e.target.id === 'nm') { S.name = e.target.value.replace(/\s+/g, '').slice(0, 8); S.profiles[0].name = S.name; save(); const c = e.target.nextElementSibling; if (c) c.textContent = `${[...e.target.value].length}/8`; const b = $('.ob .cta'); if (b) b.disabled = !(S.name && S.birth && ageNow() >= 14); }
  if (e.target.id === 'note') { const id = route()[1]; if (id && W(id)) { RS(id).note = e.target.value.slice(0, H.price.memo[setOf(id).memo === 'wide' ? 'wide' : 'normal']); save(); } }
});
document.addEventListener('change', e => { if (e.target.id === 'by') { const v = e.target.value; S.birth = v === 'young' ? new Date().getFullYear() - 13 : Number(v) || 0; if (ageNow() < 19) S.adultOk = false; save(); render(); } });
const applyView = () => document.documentElement.style.setProperty('--rfs', [15, 17, 19, 21][S.view.fs ?? 1] + 'px');

window.__nr = { state: () => S, H, render, send, ctxOf, evq: () => EVQ.slice(), list: () => LIST };   /* 점검용 */
void SOONLIST;
applyView();
ev('nr_open', { via: VIA, new: S.onboarded || Object.keys(S.rooms).length ? 0 : 1 });
render();
home().then(() => { render(); sync(); });
