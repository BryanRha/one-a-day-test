/* 너랑 — 원어데이 [너랑] 탭 (2026-11-04 대표 승인 시안 D → 실제 앱)
   화면: 첫 안내(ob) · 홈 · 작품 홈 · 오늘 밤 한 화(공통 장면) · 둘만의 대화(AI) · 회차 끝 · 다 쓴 밤 · 서재 · 알림 · 패스 · 점심 쪽지
   흐름: 매일 밤 9시 새 화 → 모두가 같은 장면을 읽음 → 캐릭터가 먼저 말을 걺 → 고른 말 · 직접 쓴 말로 둘만의 이야기 (서버 /api/story)
   규칙: 무료 하루 30번(밤 9시 충전 · 점심 쪽지 답장 3번 포함) · 다 쓰면 결제로 막지 않고 캐릭터가 끝맺음 · '다른 반응 보기'는 횟수 안 씀
         관계 5단계는 대화 수로(서버가 셈 · 안 와도 안 깎임) · 단계가 오르고 공개 화수가 지나면 비밀 한 조각 · 패스는 안내만(결제 꺼짐)
   저장: 이 기기(localStorage 'nr_v1' — 대화 원문은 기기에만) + 서버는 진행(대화 수 · 단계 · 비밀 번호 · 기억 요약)만 (표가 있을 때)
   주소: 해시 하나 = 화면 하나 → 폰 뒤로가기 · 화면의 ← = 바로 전 화면 (원어데이 탭 안 iframe 이면 원어데이 기록에 함께 쌓임)
   데이터: works.js = 원고(team/dev/tasks/261104-neorang/works)에서 만든 파일 · 그림: img/manifest.json(아트) → 없으면 tmp/ 임시 그림 */
import { WORKS, SOON } from './works.js';

const $ = s => document.querySelector(s), app = $('#app');
const EMB = (() => { try { return window.parent !== window; } catch { return true; } })();
const PROD = window.OAD_ENV === 'prod';
const Q = new URLSearchParams(location.search);
const SHIFT = PROD ? 0 : Number(Q.get('shift')) || 0;   /* 테스트: 날짜 옮기기(일 · 소수 = 시간) */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const W = id => WORKS.find(w => w.id === id);
const STAGES = ['낯섦', '호기심', '신뢰', '설렘', '약속'];
let STAGE_AT = [0, 3, 18, 45, 90];
const END_AT = 6, MEMO_EVERY = 6, LOG_MAX = 160, HIST_MAX = 60;
const josa = (w, a, b) => { const c = String(w).charCodeAt(String(w).length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 ? a : b; };
document.documentElement.dataset.nr = '1';   /* 원어데이 셸이 '불러옴'을 확인하는 표시 */

/* ── 상태 (이 기기) ── */
const KEY = 'nr_v1';
const fresh = () => ({ v: 1, name: '', age: 0, genres: [], vibes: [], alarm: true, lunchOn: true, soonOn: true, onboarded: false, view: { fs: 1, font: 'sans', th: 'white' },
  soonBell: [], works: {}, lunch: null, lastW: '', streak: { p: '', n: 0, gift: 0 }, cards: [], epc: {} });
let S = (() => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && v.v === 1) return Object.assign(fresh(), v); } catch { /* 저장소 없음 */ } return fresh(); })();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* 가득 참 · 막힘 */ } };
const did = () => { let d = ''; try { d = localStorage.getItem('oad_did') || ''; if (!d) { d = 'nr' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); localStorage.setItem('oad_did', d); } } catch { d = 'nr-nostore-0000'; } return d; };
const WS = id => (S.works[id] ||= { talks: 0, stage: 0, secrets: [], mem: [], eps: {} });
const EP = (id, no) => { const ws = WS(id); return (ws.eps[no] ||= { read: 0, talks: 0, done: 0, log: [], hist: [], stage0: ws.stage }); };
/* 나이: 원어데이 운세에 넣은 생년이 있으면 그것 · 없으면 첫 안내에서 고름(만 14~18 / 19 이상) — 서버엔 숫자 하나만 */
const ageNow = () => { if (S.age) return S.age; try { const me = JSON.parse(localStorage.getItem('oad_fortune_me') || 'null'); if (me && me.y) return new Date().getFullYear() - me.y; } catch { /* */ } return 0; };
const nm = () => S.name || '하람';

/* ── 시계 (서버 시각 기준 · 밤 9시에 하루가 바뀜) ── */
let SKEW = SHIFT * 864e5;
const now = () => Date.now() + SKEW;
const kst = ms => new Date(ms + 9 * 3600e3);
const period = (ms = now()) => kst(ms - 21 * 3600e3).toISOString().slice(0, 10);
const next9 = () => Date.parse(period() + 'T21:00:00+09:00') + 864e5;
const lunchAt = () => Date.parse(period() + 'T12:00:00+09:00') + 864e5;
const hms = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return [s / 3600, s % 3600 / 60, s % 60].map(v => String(Math.floor(v)).padStart(2, '0')).join(':'); };
const toNine = () => hms(next9() - now());
setInterval(() => { document.querySelectorAll('[data-cd]').forEach(e => { e.textContent = toNine(); }); if (H.loaded && now() >= H.next9 && !H.reloading) { H.reloading = true; home().then(() => { H.reloading = false; render(); }); } }, 1000);
const epDate = n => { const d = new Date(Date.parse(period() + 'T00:00:00Z') + (n - H.open) * 864e5); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 밤 9시`; };

/* ── 서버 (/api/story) ── */
const H = { loaded: false, open: 0, next9: 0, used: 0, max: 30, left: 30, lunchOpen: false, lunchUsed: 0, lunchMax: 3, on: true, db: false };
let TOK = '';
async function post(body, signal) {
  const h = { 'Content-Type': 'application/json' }; if (TOK) h.Authorization = 'Bearer ' + TOK;
  return fetch('/api/story', { method: 'POST', headers: h, signal, body: JSON.stringify({ d: did(), age: ageNow() || 30, name: nm(), shift: SHIFT || undefined, ...body }) });
}
/* 서버를 못 쓰면(꺼짐 · 연결 없음): 열린 화는 이 기기 시계로 셈(1화 = 11월 2일 밤 9시) · 읽기만 되고 대화는 연결되면 */
const localOpen = () => Math.max(0, Math.min(12, Math.round((Date.parse(period()) - Date.parse('2026-11-02')) / 864e5) + 1));
async function home() {
  try {
    const r = await post({ act: 'home' }); const j = await r.json();
    if (r.ok && typeof j.open === 'number') { Object.assign(H, j, { loaded: true }); SKEW = j.now - Date.now(); if (j.stageAt) STAGE_AT = j.stageAt; return; }
  } catch { /* 아래 */ }
  Object.assign(H, { on: false, loaded: true, open: localOpen(), next9: next9() });
}
/* 진행 맞추기: 이 기기 값 ↔ 서버(계정 · 기기) 값 — 원문(log · hist)은 보내지 않음 */
async function sync() {
  const works = Object.fromEntries(Object.entries(S.works).map(([k, v]) => [k, { talks: v.talks, stage: v.stage, secrets: v.secrets, mem: v.mem, eps: Object.fromEntries(Object.entries(v.eps).map(([n, e]) => [n, { read: e.read, talks: e.talks, done: e.done }])) }]));
  try {
    const r = await post({ act: 'state', works }); const j = await r.json(); if (!r.ok || !j.works) return;
    for (const [k, v] of Object.entries(j.works)) { const ws = WS(k); ws.talks = Math.max(ws.talks, v.talks); ws.stage = Math.max(ws.stage, v.stage); ws.secrets = [...new Set([...ws.secrets, ...v.secrets])]; if ((v.mem || []).length > ws.mem.length) ws.mem = v.mem;
      for (const [n, e] of Object.entries(v.eps || {})) { const x = EP(k, n); x.read = Math.max(x.read, e.read); x.talks = Math.max(x.talks, e.talks); x.done = Math.max(x.done, e.done); } }
    save();
  } catch { /* 다음에 */ }
}
/* 회차 장면: 1~3화는 이 파일(원고) · 칩 · 4화부터는 서버 (한 번 받으면 기기에 둠) */
const localEp = (w, no) => { const e = w.eps[no - 1]; return e && e.body ? e : null; };
async function episode(id, no) {
  const k = id + '/' + no, w = W(id);
  if (S.epc[k] && S.epc[k].chips) return S.epc[k];
  const loc = localEp(w, no);
  if (no === 1 && loc) return (S.epc[k] = { title: loc.title, body: loc.body, tease: loc.tease, chips: w.chips1 });
  if (no === 3 && loc && w.chips3) return (S.epc[k] = { title: loc.title, body: loc.body, tease: loc.tease, chips: w.chips3 });
  try {
    const r = await post({ act: 'scene', w: id, ep: no }); const j = await r.json();
    if (r.ok && j.body) { S.epc[k] = { title: j.title, body: j.body, tease: j.tease, chips: j.chips }; save(); return S.epc[k]; }
  } catch { /* 아래 */ }
  return loc ? { title: loc.title, body: loc.body, tease: loc.tease, chips: w.chips1, tmp: 1 } : null;
}
const epNow = (id, no) => S.epc[id + '/' + no] || (localEp(W(id), no) ? { ...localEp(W(id), no), chips: null } : null);
const epTitle = (w, no) => (w.eps[no - 1] || {}).title || `${no}화`;
const epTease = (w, no) => { const e = S.epc[w.id + '/' + no] || w.eps[no - 1] || {}; return e.tease || (w.eps[no] || {}).line || ''; };
const seedOf = (w, no) => (no <= 1 ? w.hook : no <= 4 ? (w.eps[no - 2] || {}).tease : (w.eps[no - 1] || {}).line) || w.hook;
const lastSay = body => { const s = [...(body || [])].reverse().find(x => x[0] === 's'); return s ? s[1] : ''; };

/* ── 로그인(있으면): 계정에 진행을 이어 붙임 ── */
(async () => { try { const A = await import('../account.js'); if (!A.ON) return; await A.init(); TOK = (await A.token()) || ''; if (TOK) sync(); } catch { /* 로그인 없이 */ } })();

/* ── 그림: 아트 세션의 img/manifest.json (경로는 img/ 기준 · 파일명은 같고 내용만 바뀔 수 있어 경로를 코드에 적지 않음) → 없으면 tmp/ 임시 그림
   작품마다 cover · cover_s(목록) · avatar{default,감정} · bust · portrait · scenes{작품_장소_감정} · places{장소} · (C17) cast · teaser{epN} · 곧 공개 soon{id}
   _meta.first_screen(cover_s · cover · avatar.default)은 바로, 나머지(scenes · teaser · bust …)는 그 화면을 열 때 CSS 배경으로 그때 받음 */
let ART = {};
const A = p => (p ? 'img/' + String(p).replace(/^\.?\/?(img\/)?/, '') : '');
fetch('img/manifest.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : {})).then(m => { if (m && typeof m === 'object') { ART = m; render(); } }).catch(() => {});
const tmpOf = w => (w.tmp ? 'tmp/' + w.tmp : '');
const artOf = w => ART[w.id] || {};
const coverOf = (w, small) => { const a = artOf(w); return A(small ? a.cover_s || a.cover : a.cover || a.cover_s) || tmpOf(w); };
/* 장면 그림: 태그 그대로 → 같은 장소(감정 변형 없으면 places) → 첫 장소 */
const sceneImg = (w, tag) => {
  const a = artOf(w), sc = a.scenes || {}, pl = a.places || {};
  if (tag && sc[tag]) return A(sc[tag]);
  const place = tag ? (w.places.find(x => tag.startsWith(`${w.id}_${x.tag}_`)) || {}).tag : (w.places[0] || {}).tag;
  return A(pl[place] || sc[`${w.id}_${place}_${w.moods[0]}`] || Object.values(sc)[0] || Object.values(pl)[0]) || tmpOf(w);
};
const portrait = w => { const a = artOf(w); return A(a.avatar && (a.avatar.default || Object.values(a.avatar)[0])); };
const teaserOf = (w, n) => { const t = artOf(w).teaser; return (t && A(t['ep' + n])) || sceneImg(w); };
const soonCover = id => { const s = (ART.soon || {})[id]; return s ? A(s.cover_s || s.cover) : ''; };
const placeName = (w, tag) => { const p = w.places.find(x => tag && tag.startsWith(`${w.id}_${x.tag}_`)); return p ? p.name : ''; };

/* ── 아이콘 · 조각 (시안 D 그대로) ── */
const P = {
  back: '<path d="M15 5l-7 7 7 7"/>', bell: '<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 004 0"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  book: '<path d="M4 5.5A1.5 1.5 0 015.5 4H11v16H5.5A1.5 1.5 0 014 18.5z"/><path d="M20 5.5A1.5 1.5 0 0018.5 4H13v16h5.5a1.5 1.5 0 001.5-1.5z"/>',
  game: '<rect x="3" y="7" width="18" height="11" rx="4"/><path d="M8 11v3M6.5 12.5h3M15.5 12h.01M17.5 14h.01"/>', moon: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
  chat: '<path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v8a2.5 2.5 0 01-2.5 2.5H10l-4.5 3.5V17A2.5 2.5 0 014 14.5z"/>', box: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v9"/>',
  aa: '<path d="M3 18l5-12 5 12M4.8 14h6.4"/><path d="M15 18v-1.5M15 12.5a2.5 2.5 0 015 0V18M20 15.5c-3.5-.6-5 .3-5 1.6"/>', send: '<path d="M5 12h13M13 6l6 6-6 6"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  unlock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 017.5-2"/>', redo: '<path d="M20 12a8 8 0 11-2.5-5.8"/><path d="M20 4v4h-4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
  crown: '<path d="M4 8l4 3.5L12 5l4 6.5L20 8l-1.5 10h-13z"/>', mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  key: '<circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H20M17 12v3M20 12v2"/>', more: '<path d="M6 12h.01M12 12h.01M18 12h.01"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
};
const I = (n, c = '') => `<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;
const av = (w, sz = 34) => { const p = portrait(w); return `<span class="av" style="--c:${w.ch.col};width:${sz}px;height:${sz}px;font-size:${Math.round(sz * .42)}px${p ? `;background:center/cover url(${p})` : ''}">${p ? '' : w.ch.mono}</span>`; };
const cover = (w, extra = '', title = true, sz = '') => { const c = coverOf(w, true); return `<div class="cv" style="--tint:${w.tint};${sz}${c ? `background-image:url(${c})` : 'background-image:radial-gradient(120% 80% at 70% 20%,#3a4d44 0%,#16201c 60%,#0b100e 100%)'}">${extra}${title ? `<span class="ct">${esc(w.short)}</span>` : ''}</div>`; };
const back = () => `<button class="btn" data-back aria-label="뒤로">${I('back')}</button>`;
const tabbar = () => `<nav class="tabbar"><button data-shell="">${I('game')}게임</button><button data-shell="fortune">${I('moon')}운세</button><button class="on" data-go="home">${I('chat')}너랑</button><button data-shell="box">${I('box')}보관함</button></nav>`;
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2000); };
/* 비밀 글: 원고는 '이용자'로 적혀 있음 → 화면에선 '나' */
const mine = t => String(t).replace(/이용자가/g, '내가').replace(/이용자의/g, '나의').replace(/이용자를/g, '나를').replace(/이용자에게/g, '나에게').replace(/이용자는/g, '나는').replace(/이용자/g, '나');
const short1 = t => { const s = mine(t).split(/(?<=[.:—])\s/)[0]; return s.length > 46 ? s.slice(0, 45) + '…' : s; };
const memText = m => String(m).replace(/\{name\}|\{호칭\}/g, nm());
const mainW = () => W(S.lastW) || W('c17');

/* ── 주소 ── */
const depthNow = () => (history.state && history.state.d) || 0;
const PARENT = r => ({ ob: r[1] > 1 ? 'ob/' + (r[1] - 1) : '', work: 'home', read: r[3] === 'view' ? `read/${r[1]}/${r[2]}` : `work/${r[1]}`, talk: `read/${r[1]}/${r[2]}`, end: `talk/${r[1]}/${r[2]}`, out: 'home', lib: 'home', alarm: 'home', pass: 'home', lunch: 'home' }[r[0]] || 'home');
const go = h => { const d = depthNow() + 1; location.hash = h; history.replaceState({ d }, ''); };
const goBack = () => { if (depthNow() > 0) { history.back(); return; } const p = PARENT(route()); if (p) location.replace('#' + p); };
const route = () => (location.hash.replace(/^#/, '') || (S.onboarded ? 'home' : 'ob/1')).split('/');
let lastKey = '';
function render() {
  const r = route(), key = r.slice(0, 3).join('/');
  document.body.className = 'th-' + S.view.th + (EMB ? ' emb' : '');
  if (PROD) { app.innerHTML = `<div class="page"><header class="top"><div class="brand"><img src="icon/g/logo_light.svg" alt="너랑" style="height:30px;width:auto"></div></header><p class="loading">너랑은 곧 공개돼요</p></div>`; return; }
  const v = VIEWS[r[0]] || VIEWS.home;
  if (key === lastKey && (r[0] === 'talk' || r[0] === 'lunch') && $('#log')) { refreshTalk(); return; }   /* 대화 화면은 다시 그리지 않음(스크롤 · 입력 유지) */
  app.innerHTML = v(...r.slice(1));
  if (key !== lastKey) { if (r[0] === 'talk' || r[0] === 'lunch' || r[0] === 'out') requestAnimationFrame(() => scrollTo(0, document.body.scrollHeight)); else if (!(r[0] === 'read' && r[3] === 'view')) scrollTo(0, 0); }
  lastKey = key;
  if (r[0] === 'read') readProg();
  if (r[0] === 'talk' || r[0] === 'lunch') { CU.anchor = null; pill(false); }
}
addEventListener('hashchange', render);

/* ── 화면들 ── */
const VIEWS = {};

/* 첫 안내 */
VIEWS.ob = (n = '1') => {
  if (n === '1') return `<div class="ob ob1">
    <div class="clock">21:00<small>매일 밤</small></div>
    <h2>한 화를 읽고,<br>그 사람과 단둘이 이어 가요</h2>
    <p class="sub">너랑 — 당신이 이야기 속 현장에 있는 웹소설</p>
    <div class="flow3">
      <div><b>1</b><p style="margin:0">모두가 같은 장면을 읽어요<span>매일 밤 9시, 새 화 한 편 · 3분</span></p></div>
      <div><b>2</b><p style="margin:0">그 뒤는 당신만의 이야기<span>캐릭터가 당신에게만 말을 걸어요</span></p></div>
      <div><b>3</b><p style="margin:0">당신이 고른 말이 남아요<span>관계가 깊어지면 비밀을 털어놔요</span></p></div>
    </div>
    <div class="grow"></div>
    <button class="cta light" data-go="ob/2">시작하기</button>
  </div>`;
  const step = k => `<div class="step">${[2, 3, 4].map(i => `<i class="${i <= k ? 'on' : ''}"></i>`).join('')}</div>`;
  const obBack = `<div class="ob-back top clear" style="color:var(--ink);position:absolute">${back()}</div>`;
  if (n === '2') {
    const G = ['현대 로맨스', '로맨스 판타지', '회귀·환생', '무협', '생활·힐링', '현대 판타지', '미스터리', '전문직', '대체역사', '스포츠·무대'];
    const V = ['티격태격', '비밀 공유', '느린 설렘', '웃긴 반전', '서로 구해 주기', '상사와 나', '나만 아는 정체'];
    return `<div class="ob">${obBack}${step(2)}
      <h2>어떤 밤을<br>좋아하세요?</h2><p class="sub">고른 걸로 첫 이야기를 골라 드릴게요. 나중에 바꿀 수 있어요.</p>
      <div class="lab">장르 · 여러 개</div><div class="picks">${G.map(g => `<button class="chip ${S.genres.includes(g) ? 'on' : ''}" data-pick="genres" data-v="${g}">${g}</button>`).join('')}</div>
      <div class="lab">끌리는 사이</div><div class="picks">${V.map(g => `<button class="chip ${S.vibes.includes(g) ? 'on' : ''}" data-pick="vibes" data-v="${g}">${g}</button>`).join('')}</div>
      <div class="grow" style="min-height:28px"></div>
      <button class="cta" data-go="ob/3" ${S.genres.length ? '' : 'disabled'}>다음</button></div>`;
  }
  if (n === '3') {
    const w = W('c17'), a = ageNow(), ab = a && a < 14 ? 'k' : a && a < 19 ? 't' : a ? 'a' : '';
    return `<div class="ob">${obBack}${step(3)}
      <h2>이야기 속에서<br>뭐라고 부를까요?</h2><p class="sub">캐릭터가 이 이름으로 당신을 불러요.</p>
      <label class="namebox"><input id="nm" maxlength="8" value="${esc(S.name)}" placeholder="하람" aria-label="부를 이름"><span>${esc(S.name).length}/8</span></label>
      <div class="preview">${av(w, 36)}<div><small>${w.ch.name} · 재무팀장</small><div class="bb" id="pv">“…${esc(nm())}. 지금은 연기 아니었습니다.”</div></div></div>
      <div class="lab">나이 <span style="font-weight:600">· 이야기 수위를 맞춰요 · 이 기기에만</span></div>
      <div class="agepick">${[['t', '만 14~18세'], ['a', '만 19세 이상'], ['k', '만 14세 미만']].map(([k, l]) => `<button class="chip ${ab === k ? 'on' : ''}" data-age="${k}">${l}</button>`).join('')}</div>
      ${ab === 'k' ? '<p class="sub" style="margin:10px 0 0;color:var(--co)">너랑은 만 14세 이상만 이용할 수 있어요.</p>' : ''}
      <button class="optin" data-toggle="alarm"><div class="t"><b>밤 9시, 새 화가 열리면 알려 드릴까요?</b><span>알림 받기를 켜 두면 새 화 소식이 알림에 쌓여요</span></div><span class="sw ${S.alarm ? 'on' : ''}"></span></button>
      <div class="grow" style="min-height:28px"></div>
      <button class="cta" data-go="ob/4" ${!ab || ab === 'k' ? 'disabled' : ''}>다음</button></div>`;
  }
  const score = w => (S.genres.includes(w.genre) ? 2 : 0) + (w.tags.some(t => S.vibes.some(v => v.replace(/\s/g, '').includes(t) || t.includes(v.replace(/\s/g, '')))) ? 1 : 0);
  const order = [...WORKS].sort((a, b) => score(b) - score(a)).slice(0, 3);
  return `<div class="ob">${obBack}${step(4)}
    <h2>${esc(nm())} 님께<br>맞을 것 같은 첫 이야기</h2><p class="sub">모든 화는 무료예요. 1화는 3분이면 읽어요.</p>
    <div class="rec">${order.map(w => `<button data-start="${w.id}">${cover(w, '', false, 'width:76px;height:100px;')}<div style="flex:1;min-width:0"><span class="why">${esc(w.genre)} · #${esc(w.tags[0])}</span><b>${esc(w.title)}</b><p>${esc(w.hook)}</p></div></button>`).join('')}</div>
    <div class="grow" style="min-height:20px"></div>
    <button class="cta ghost" data-start="home" style="margin-top:12px">둘러보고 고를게요</button></div>`;
};

/* 너랑 홈 */
const nextUnread = id => { for (let n = 1; n <= H.open; n++) if (!EP(id, n).read) return n; return Math.max(1, H.open); };
VIEWS.home = () => {
  const w = mainW(), open = H.open, read0 = !Object.values(WS(w.id).eps).some(e => e.read);
  const st = S.streak.n || 1;
  const lun = S.lunch && S.lunch.day === period() && S.lunch.text ? S.lunch : null, lw = lun && W(lun.w);
  const tonight = open ? `<section class="tonight">
      <div class="art" style="background-image:url(${sceneImg(w)})"><div class="lbl"><span class="live">오늘 밤 열림</span><span class="glass">${esc(w.genre)}</span></div></div>
      <div class="body">
        <div class="ep">${esc(w.short)} · ${open}화</div>
        <h3>${esc(epTitle(w, open))}</h3>
        <p class="seed">${esc(seedOf(w, open))}</p>
        ${open > 1 && lastSay((epNow(w.id, open - 1) || {}).body) ? `<div class="who">${av(w, 34)}<p><small>${w.ch.name} · 지난 화 마지막 말</small>${esc(lastSay(epNow(w.id, open - 1).body))}</p></div>` : `<div class="who">${av(w, 34)}<p><small>${w.ch.name} · ${esc(w.ch.who)}</small>${esc(w.intro[0])}</p></div>`}
        <div class="row"><button class="cta" data-go="read/${w.id}/${read0 ? 1 : open}">${read0 && open > 1 ? '1화부터 읽고 대화하기' : '읽고 이어서 대화하기'}</button><div class="fuel"><b id="fuel">${H.left}</b>대화 남음</div></div>
      </div>
    </section>` : `<section class="tonight"><div class="body" style="margin-top:0;padding-top:22px"><div class="ep">곧 시작</div><h3>첫 화는 밤 9시에 열려요</h3><p class="seed"><span data-cd>${toNine()}</span> 남음</p></div></section>`;
  return `<div class="page">
    <header class="top"><div class="brand"><img src="icon/g/logo_light.svg" alt="너랑" style="height:30px;width:auto"><i>매일 밤 9시</i></div>
      <button class="passpill" data-go="pass">${I('crown', 's')}패스</button>
      <button class="btn" data-go="alarm" aria-label="알림">${I('bell')}${lun && !lun.log.length ? '<span class="dot"></span>' : ''}</button></header>
    ${tonight}
    ${lun ? `<button class="lunchcard" data-go="lunch">${av(lw, 38)}<div class="t"><b>${esc(lw.ch.short)}의 점심 쪽지</b><span>“${esc(lun.text)}”</span></div>${lun.log.length ? `<span class="badge vi">${Math.min(H.lunchUsed, H.lunchMax)}/${H.lunchMax}</span>` : '<span class="badge">NEW</span>'}</button>` : ''}
    <button class="streak" data-go="alarm" style="width:calc(100% - 36px);text-align:left"><div class="t"><b>연속으로 찾은 밤 ${st}일째</b><span style="color:var(--ink3);font-size:12.5px">7일째 밤엔 장면 카드를 드려요</span></div>
      <div class="nights">${[1, 2, 3, 4, 5, 6, 7].map(i => `<i class="${i <= ((st - 1) % 7) + 1 ? 'on' : i === 7 ? 'gift' : ''}"></i>`).join('')}</div></button>
    <div class="sec"><div class="sh"><h2>오늘 밤 열린 화</h2><span class="more">${WORKS.length}편 모두 ${open}화</span></div>
      <div class="hs opened">${WORKS.map(x => { const e = EP(x.id, open), s = WS(x.id).stage; return `<button class="it" data-go="work/${x.id}">${cover(x, `<span class="cg">${open}화</span>${open && !e.read ? '<span class="newdot">NEW</span>' : ''}`)}<b>${esc(x.title)}</b><small>${av(x, 16)}${x.ch.name}${s ? ` · ${STAGES[s]}` : ''}</small></button>`; }).join('')}</div></div>
    <div class="sec"><div class="sh"><h2>첫 공개 다섯 편</h2><span class="more">모든 화 무료</span></div>
      <div class="rank">${WORKS.map((x, i) => { const t = WS(x.id).talks; return `<button data-go="work/${x.id}"><span class="n ${i < 3 ? 't' : ''}">${i + 1}</span>${cover(x, '', false)}<div class="m"><b>${esc(x.title)}</b><small>${esc(x.genre)} · ${t ? `<b>나눈 대화 ${t}번</b>` : esc(x.ch.name)}</small></div></button>`; }).join('')}</div></div>
    <div class="sec"><div class="sh"><h2>곧 공개</h2><span class="more">${SOON.length}편 · 알림 받기</span></div>
      <div class="hs soon">${SOON.map((x, i) => { const hue = (i * 53 + 200) % 360; const sc = soonCover(x.id); return `<div class="it"><div class="cv" style="background:${sc ? `center/cover url(${sc})` : `linear-gradient(160deg,hsl(${hue} 32% 34%),hsl(${(hue + 40) % 360} 38% 14%))`};width:112px;height:150px"><span class="cg">${esc(x.genre)}</span><button class="bell ${S.soonBell.includes(x.id) ? 'on' : ''}" data-bell="${x.id}" aria-label="${esc(x.title)} 공개 알림">${I('bell', 's')}</button></div><small>${S.soonBell.includes(x.id) ? '알림 받는 중' : '곧 공개'}</small><b>${esc(x.title)}</b></div>`; }).join('')}</div></div>
    <p class="foot">모든 작품은 원어데이 창작이에요 · 대화는 AI 가 캐릭터로 함께 써요 · 대화 원문은 이 기기에만 남아요</p>
  </div>${tabbar()}`;
};

/* 작품 홈 */
VIEWS.work = (id = 'c17') => {
  const w = W(id) || W('c17'), ws = WS(w.id), stage = ws.stage, open = H.open;
  const rows = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1, e = ws.eps[n] || {}, done = !!e.read, now_ = n === open && !done, lock = n > open;
    const sub = done ? `다 읽음 · 대화 ${e.talks || 0}번` : now_ ? '오늘 밤 열림 · 대화 30번 새로' : lock ? (n === open + 1 ? '내일 밤 9시 열림' : epDate(n)) : '읽을 수 있어요';
    return `<button class="e ${done ? 'done' : ''} ${now_ ? 'now' : ''} ${lock ? 'lock' : ''}" ${lock ? 'data-locked' : `data-go="read/${w.id}/${n}"`}><span class="no">${n}화</span><div class="tt"><b>${esc(lock && n > 3 ? '열리기 전' : epTitle(w, n))}</b><small>${sub}</small></div>${done ? I('check', 's') : now_ ? '<span class="badge">NEW</span>' : lock ? I('lock', 's') : ''}</button>`;
  }).join('');
  const target = nextUnread(w.id), nextN = STAGE_AT[stage + 1];
  return `<div class="page" style="padding-bottom:110px">
    <div class="whero" style="background-image:url(${coverOf(w)});background-color:${w.tint}">
      <header class="top clear">${back()}<h1></h1><button class="btn" data-go="lib/reading" aria-label="서재">${I('book')}</button></header>
      <div class="in"><div class="g">${esc(w.genre)} · 시즌 1 · 12화</div><h2>${esc(w.title)}</h2>
        <div class="meta"><span>매일 밤 9시</span><span>·</span><span>모든 화 무료</span>${ws.talks ? `<span>·</span><span>나눈 대화 <b>${ws.talks}</b></span>` : ''}</div></div>
    </div>
    <div class="promise"><div><b>모든 화 무료</b>기다림 없이</div><div><b>대화 하루 30번</b>밤 9시 충전</div><div><b>${open}화</b>오늘 밤 열림</div></div>
    <div class="intro">${w.intro.map(x => `<p>${esc(x)}</p>`).join('')}</div>
    <div class="tags">${w.tags.map(t => `<span>#${esc(t)}</span>`).join('')}</div>
    <div class="role">${I('key', 's')}<span>내 역할 · <b>${esc(w.role.split(/[.]/)[0])}</b></span></div>
    <div class="sec"><div class="sh"><h2>${esc(w.ch.name)}${josa(w.ch.name, '과', '와')} 나</h2><span class="more">관계 단계</span></div>
      <div class="ccard"><div class="hd">${av(w, 46)}<div style="flex:1"><b>${esc(w.ch.name)}</b><small>${esc(w.ch.who)}</small></div><span class="badge vi">${STAGES[stage]}</span></div>
        <div class="track">${STAGES.map((s, i) => `${i ? `<em class="${i <= stage ? 'on' : ''}"></em>` : ''}<i class="${i < stage ? 'on' : i === stage ? 'cur' : ''}"></i>`).join('')}</div>
        <div class="tracklab">${STAGES.map((s, i) => `<span class="${i === stage ? 'on' : ''}">${s}</span>`).join('')}</div>
        <div class="nextstage">${stage < 4 ? `‘${STAGES[stage + 1]}’까지 대화 <b>${Math.max(1, nextN - ws.talks)}번</b> 더 — 단계가 오르면 비밀 하나를 들을 수 있어요 · 안 와도 깎이지 않아요` : '가장 깊은 단계예요 · 이야기는 계속돼요'}</div></div></div>
    <div class="sec"><div class="sh"><h2>나만 알게 될 비밀</h2><span class="more">${ws.secrets.length} / 3</span></div>
      <div class="secrets">${w.secrets.map(s => ws.secrets.includes(s.n) ? `<div class="open">${I('unlock', 's')}<b>비밀 ${s.n}</b>${esc(short1(s.text))}</div>` : `<div>${I('lock', 's')}<b>비밀 ${s.n}</b>‘${s.need}’ 이상<br>${s.ep}화 이후</div>`).join('')}</div></div>
    <div class="sec" id="eps"><div class="sh"><h2>회차</h2><span class="more">1~12화</span></div><div class="eps">${rows}</div></div>
    <div class="sticky"><button class="cta" data-go="read/${w.id}/${target}">${target}화 읽고 대화하기<small>${esc(epTitle(w, target))} · 3분</small></button></div>
  </div>`;
};

/* 오늘 밤 한 화 — 공통 장면 (+ 보기 설정 시트) */
VIEWS.read = (id, no, sub) => {
  const w = W(id); no = +no; if (!w || !no) return VIEWS.home();
  if (no > H.open && H.loaded) return `<div class="rd"><header class="top">${back()}<h1>${no}화</h1></header><p class="loading">이 화는 ${epDate(no)}에 열려요</p></div>`;
  const ep = epNow(id, no);
  if (!ep || !ep.body) { episode(id, no).then(() => { if (route()[0] === 'read') render(); }); return `<div class="rd"><header class="top">${back()}<h1>${no}화 · ${esc(epTitle(w, no))}</h1></header><p class="loading">오늘 밤 장면을 펼치는 중…</p></div>`; }
  if (!ep.chips) episode(id, no);
  const e = EP(id, no); if (!e.read) { e.read = 1; S.lastW = id; save(); }
  const body = ep.body.map(([k, x, who]) => k === 's' ? `<p class="s" style="--cc:${who && who !== w.ch.short ? 'var(--rtx2)' : w.ch.col}"><small class="${who && who !== w.ch.short ? 'o' : ''}">${esc(who || w.ch.short)}</small>${esc(x)}</p>` : k === 'd' ? `<p class="d">${esc(x)}</p>` : `<p>${esc(x)}</p>`).join('');
  const v = S.view, prev = no > 1 ? epNow(id, no - 1) : null;
  const prevTxt = prev && prev.body ? prev.body.filter(x => x[0] !== 'd').slice(-2).map(x => x[1]).join(' ') : no > 1 ? (w.eps[no - 2] || {}).line || '' : '';
  const sheet = sub === 'view' ? `<div class="dim" data-back></div><div class="sheet" role="dialog" aria-label="보기 설정"><div class="grab"></div><h4>보기 설정</h4>
    <div class="row"><span>글자 크기</span><div class="seg">${[['작게', 0], ['보통', 1], ['크게', 2], ['아주', 3]].map(([l, i]) => `<button class="${v.fs === i ? 'on' : ''}" data-fs="${i}">${l}</button>`).join('')}</div></div>
    <div class="row"><span>글꼴</span><div class="seg"><button class="${v.font === 'sans' ? 'on' : ''}" data-font="sans">고딕</button><button class="${v.font === 'serif' ? 'on' : ''}" data-font="serif" style="font-family:var(--serif)">명조</button></div></div>
    <div class="row"><span>바탕</span><div class="sw3">${[['white', '#fff'], ['cream', '#F6F0E4'], ['night', '#131219']].map(([k, c]) => `<button class="${v.th === k ? 'on' : ''}" data-th="${k}" style="background:${c}" aria-label="${k}"></button>`).join('')}</div></div>
    <button class="cta" data-back style="margin-top:14px">닫기</button></div>` : '';
  const line = lastSay(ep.body);
  return `<div class="rd" style="--rfs:${[16, 18, 20, 22][v.fs]}px;--rff:${v.font === 'serif' ? 'var(--serif)' : 'var(--sans)'}">
    <header class="top">${back()}<h1>${no}화 · ${esc(ep.title)}</h1><button class="btn" data-go="read/${id}/${no}/view" aria-label="보기 설정">${I('aa')}</button></header>
    <div class="prog"><i id="prog"></i></div>
    <div class="rhead"><div class="k">${esc(w.title)}</div><h2>${no}화 · ${esc(ep.title)}</h2><div class="pl">모두가 함께 읽는 장면 · 3분</div></div>
    ${prevTxt ? `<div class="prevbox"><b>지난 화</b>${esc(prevTxt)}</div>` : ''}
    <div class="sceneimg" style="background-image:url(${sceneImg(w)})"><span>${esc((w.places[0] || {}).name || w.short)}</span></div>
    <div class="text">${body}</div>
    <section class="handoff" id="handoff">
      <div class="line">여기까지 모두가 본 장면</div>
      <h3>여기부터는<br>${esc(nm())} 님과 ${esc(w.ch.short)}, 둘만의 이야기</h3>
      <p>당신이 고른 말로 오늘 밤 ${no}화가 이어져요.</p>
      <button class="ping" data-go="talk/${id}/${no}">${av(w, 42)}<div class="m"><b>${esc(w.ch.name)}</b><small>방금</small><p>${esc(line)}</p></div></button>
      <button class="cta" data-go="talk/${id}/${no}">${I('chat', 's')}${e.log.length ? '이어서 대화하기' : '답장하기'}</button>
      <div class="note">오늘 밤 대화 ${H.left}번 남음 · 다 써도 이야기는 끊기지 않고 쉬어 가요</div>
    </section></div>${sheet}`;
};

/* ── 둘만의 대화 (회차 · 점심 쪽지 같은 엔진) ── */
let busy = false;
function ctxOf(r = route()) {
  if (r[0] === 'lunch') { const L = S.lunch; if (!L) return null; const w = W(L.w); return { kind: 'lunch', w, store: L, line: L.text, chips: L.chips, no: 0 }; }
  const w = W(r[1]), no = +r[2]; if (!w || !no) return null;
  const ep = epNow(w.id, no) || {};
  return { kind: 'ep', w, no, store: EP(w.id, no), line: lastSay(ep.body), chips: ep.chips, ep };
}
const bond = w => { const ws = WS(w.id), s = ws.stage, a = STAGE_AT[s], b = STAGE_AT[s + 1];
  return s >= 4 ? `<span><b>${STAGES[s]}</b></span><span class="bar"><i style="width:100%"></i></span><span>가장 깊은 단계</span>`
    : `<span><b>${STAGES[s]}</b></span><span class="bar"><i style="width:${Math.max(6, Math.round((ws.talks - a) / (b - a) * 100))}%"></i></span><span>${STAGES[s + 1]}까지 대화 ${Math.max(1, b - ws.talks)}번</span>`; };
const chBubble = (w, lines, noav) => `<div class="lg-c">${noav ? '<span class="sp"></span>' : av(w, 34)}<div class="stack">${noav ? '' : `<span class="who">${esc(w.ch.short)}</span>`}${lines.map(x => `<div class="bb${x.k === 'safe' ? ' safe' : ''}">${esc(x.t)}</div>`).join('')}</div></div>`;
function group(w, items) {   /* 서술 · 대사 섞인 묶음을 순서대로: 연속된 대사는 한 말풍선 묶음 */
  let h = '', run = [], first = true;
  const flush = () => { if (run.length) { h += chBubble(w, run, !first); first = false; run = []; } };
  for (const it of items) { if (it.k === 'say' || it.k === 'safe') run.push(it); else { flush(); first = true; h += `<div class="lg-n">${esc(it.t)}</div>`; } }
  flush(); return h;
}
function headHtml(c) {
  const w = c.w;
  if (c.kind === 'lunch') return `<div class="lg-sc"><span>낮 12시 · 메신저 · 점심 쪽지</span></div>${chBubble(w, [{ k: 'say', t: c.line }])}`;
  const rc = (c.ep.body || []).filter(x => x[0] === 'n').slice(-3);
  return `<div class="lg-rc"><small><span>${c.no}화 공통 장면에서 이어짐</span><b data-go="read/${w.id}/${c.no}">다시 읽기</b></small>${rc.map(x => `<p>${esc(x[1])}</p>`).join('')}</div><div class="lg-sc"><span>${esc(c.ep.title || '')} · 둘만의 이야기</span></div>${c.line ? chBubble(w, [{ k: 'say', t: c.line }]) : ''}`;
}
function entryHtml(c, x, i, lastAi) {
  const w = c.w;
  if (x.k === 'me') return `<div class="lg-m" data-i="${i}"><div class="bb">${esc(x.t)}</div></div>`;
  if (x.k === 'ai') return `<div class="lg-ai" data-i="${i}">${group(w, x.items)}${x.image && x.image !== 'none' ? `<div class="lg-img" style="background-image:url(${sceneImg(w, x.image)})"><span>${esc(placeName(w, x.image) || '장면')}</span></div>` : ''}${i === lastAi && !x.alt && !x.safe && !busy && c.kind === 'ep' ? `<button class="alt" data-alt="${i}">${I('redo', 'xs')}다른 반응 보기 · 대화 안 씀</button>` : ''}</div>`;
  if (x.k === 'stage') return `<div class="lg-st" data-i="${i}"><small>관계가 한 칸 깊어졌어요</small><b>${STAGES[x.from]} → ${STAGES[x.to]}</b><p>${esc(w.ch.short)}${josa(w.ch.short, '이', '가')} 당신을 조금 다르게 보기 시작했어요</p></div>`;
  if (x.k === 'sec') return `<div class="lg-sec" data-i="${i}"><small>${I('unlock', 'xs')}나만 아는 것 +1 · 비밀 ${x.n}</small><p>${esc(mine(x.t))}</p></div>`;
  if (x.k === 'card') return `<div class="lg-card" data-i="${i}"><span class="ph" style="background-image:url(${sceneImg(w, x.tag)})"></span><div><small>장면 카드를 얻었어요</small><b>${esc(placeName(w, x.tag) || '오늘 밤의 한 장면')}</b><span>내 서재 · 모은 것에 담겼어요</span></div></div>`;
  if (x.k === 'pr') return `<div class="lg-pr" data-i="${i}"><span>${I('spark', 'xs')}${esc(x.t)}</span></div>`;
  if (x.k === 'endc') return `<div class="lg-end" data-i="${i}"><b>오늘 밤 ${c.no}화, 한 장면 마무리</b><p>대화는 계속 이어 갈 수 있어요. 오늘의 기록과 다음 화 예고를 볼까요?</p><button class="cta" data-go="end/${w.id}/${c.no}">오늘의 기록 보기</button></div>`;
  if (x.k === 'restc') return `<div class="lg-end" data-i="${i}"><b>오늘 밤 대화를 모두 나눴어요</b><p>${esc(w.ch.short)}${josa(w.ch.short, '은', '는')} 오늘 나눈 말을 기억하고 있어요. 밤 9시에 다시 30번이 채워져요.</p><button class="cta" data-go="out/${w.id}/${c.no || 0}">오늘 밤 마무리 보기</button></div>`;
  if (x.k === 'err') return `<div class="lg-err" data-i="${i}">${esc(x.t)}</div>`;
  return '';
}
const lastAiIdx = st => { for (let i = st.log.length - 1; i >= 0; i--) { if (st.log[i].k === 'ai') return i; if (st.log[i].k === 'me') return -1; } return -1; };
const logHtml = c => headHtml(c) + c.store.log.map((x, i) => entryHtml(c, x, i, lastAiIdx(c.store))).join('');
function dockHtml(c) {
  const st = c.store, last = st.log.filter(x => x.k === 'ai' || x.k === 'me').slice(-1)[0];
  const lunchDone = c.kind === 'lunch' && (H.lunchUsed >= H.lunchMax || st.done);
  if (H.left <= 0 || lunchDone) return `<div class="hint" style="margin:4px 0 6px">${lunchDone && H.left > 0 ? `점심 쪽지 답장은 하루 ${H.lunchMax}번 · 오늘 밤 9시에 새 화와 함께 만나요` : `오늘 밤 대화를 모두 나눴어요 · 다음 충전까지 <span data-cd>${toNine()}</span>`}</div>${H.left <= 0 ? `<button class="cta light" data-go="out/${c.w.id}/${c.no || 0}" style="height:48px">오늘 밤 마무리 보기</button>` : ''}`;
  const chips = busy ? null : !last ? c.chips : last.k === 'ai' && !last.safe ? last.chips : null;
  return `${chips && chips.length ? `<div class="sugs">${chips.map(([k, x], i) => `<button data-chip="${i}"><em>${esc(k)}</em>${esc(x)}</button>`).join('')}</div>` : ''}
    <form class="inrow" id="inform"><input id="say" placeholder="${busy ? `${esc(c.w.ch.short)}${josa(c.w.ch.short, '이', '가')} 쓰는 중…` : '직접 쓰기 — 무엇이든'}" autocomplete="off" maxlength="300" aria-label="직접 쓰기" ${busy ? 'disabled' : ''}><button class="send" aria-label="보내기" ${busy ? 'disabled' : ''}>${I('send')}</button></form>
    <div class="hint">${c.kind === 'lunch' ? `점심 답장 ${Math.max(0, H.lunchMax - H.lunchUsed)}번 남음 · 오늘 밤 대화 30번 안에서 써요` : `대화 1번 = 내 말 한 번 · 오늘 밤 ${H.left}번 남음`}</div>`;
}
function talkView(c) {
  const w = c.w;
  return `<div class="talk">
    <div class="thead"><div class="r1">${back()}${av(w, 36)}<div class="nm"><b>${esc(w.ch.name)}</b><small>${c.kind === 'lunch' ? '점심 쪽지 · 메신저' : `${c.no}화 · ${esc(c.ep.title || '')} · 둘만의 이야기`}</small></div>
      <button class="turns" data-go="alarm" aria-label="남은 대화">${I('bolt', 's')}<span id="tl">${H.left}</span></button><button class="btn" data-go="work/${w.id}" aria-label="작품 홈">${I('more')}</button></div>
      <div class="bond" id="bond">${bond(w)}</div></div>
    <div class="log" id="log">${logHtml(c)}</div>
    <div class="dock" id="dock">${dockHtml(c)}</div></div>`;
}
VIEWS.talk = (id, no) => {
  const w = W(id); no = +no; if (!w || !no) return VIEWS.home();
  if (no > H.open && H.loaded) return VIEWS.read(id, no);
  const ep = epNow(id, no);
  if (!ep || !ep.body || !ep.chips) { episode(id, no).then(() => { lastKey = ''; if (route()[0] === 'talk') render(); }); return `<div class="talk"><div class="thead"><div class="r1">${back()}${av(w, 36)}<div class="nm"><b>${esc(w.ch.name)}</b><small>${no}화</small></div></div></div><p class="loading">${esc(w.ch.short)}${josa(w.ch.short, '이', '가')} 말을 고르는 중…</p></div>`; }
  S.lastW = id; EP(id, no).read = 1; save();
  return talkView(ctxOf(['talk', id, no]));
};
VIEWS.lunch = () => {
  const L = S.lunch; if (!L || !L.text) return VIEWS.home();
  return talkView(ctxOf(['lunch']));
};
/* 대화 화면 부분 갱신 (다시 그리지 않음) */
function refreshTalk() {
  const c = ctxOf(); if (!c || !$('#log')) return;
  const tl = $('#tl'); if (tl) tl.textContent = H.left;
  const b = $('#bond'); if (b) b.innerHTML = bond(c.w);
  const d = $('#dock'); if (d) { const had = d.querySelector('#say'), v = had ? had.value : ''; d.innerHTML = dockHtml(c); const n = d.querySelector('#say'); if (n && v) n.value = v; }
}
function redrawLog() { const c = ctxOf(); const lg = $('#log'); if (!c || !lg) return; lg.innerHTML = logHtml(c); }
function appendEntries(c, from) { const lg = $('#log'); if (!lg) return null; const li = lastAiIdx(c.store); lg.querySelectorAll('.alt').forEach(x => x.remove()); let first = null;
  for (let i = from; i < c.store.log.length; i++) { lg.insertAdjacentHTML('beforeend', entryHtml(c, c.store.log[i], i, li)); first = first || lg.lastElementChild; } return first; }

/* 새 내용 따라가기 (대표 피드백 2026-11-04: 답을 고른 뒤 화면이 너무 위로 올라가 이어 읽으려면 다시 내려야 했음)
   → 새로 나온 내용의 시작(내가 고른 말)이 화면 안 · 아래쪽에서 바로 읽히게: 새 글이 늘어나는 만큼만 내리고, 시작이 머리줄 바로 아래에 닿으면 멈춤
   · 답이 오는 동안 위로 올려 읽으면 끌어내리지 않고 '새 내용 ↓' */
const CU = { anchor: null, follow: false, ours: 0, ty: 0 };
function pill(on) {
  let p = $('#newpill');
  if (!on) { if (p) p.remove(); return; }
  if (!p) { document.body.insertAdjacentHTML('beforeend', `<button class="newpill" id="newpill">${I('down', 's')}새 내용</button>`); p = $('#newpill'); }
  const d = $('#dock'); p.style.bottom = (d ? innerHeight - d.getBoundingClientRect().top + 10 : 90) + 'px';
}
function nearBottom() { const lg = $('#log'), d = $('#dock'); if (!lg || !d) return true; return lg.getBoundingClientRect().bottom - 12 <= d.getBoundingClientRect().top + 80; }
function startFollow(el) { CU.anchor = el; CU.follow = true; followStep(); }   /* 내가 말을 보냄 = 이어 읽겠다는 뜻 → 따라감 (답을 기다리는 동안 위로 올리면 멈춤) */
function followStep() {
  const a = CU.anchor, lg = $('#log'), d = $('#dock'), th = $('.thead'); if (!a || !a.isConnected || !lg || !d || !th) return;
  const head = th.getBoundingClientRect().bottom + 8, dockTop = d.getBoundingClientRect().top - 10;
  if (CU.follow) {
    const top = a.getBoundingClientRect().top, bottom = lg.getBoundingClientRect().bottom - 12;
    const dy = Math.min(bottom - dockTop, top - head);
    if (dy > 1) { CU.ours = Date.now(); scrollBy(0, dy); }
  }
  pill(lg.getBoundingClientRect().bottom - 12 > d.getBoundingClientRect().top + 24);
}
/* 사람이 위로 올림 → 따라가기 멈춤 (스크롤 위치가 아니라 손가락 · 휠 · 키로 판단 — 칩이 접히며 페이지가 짧아져 생기는 스크롤은 사람이 아님) */
const userUp = () => { if ($('#log')) CU.follow = false; };
addEventListener('wheel', e => { if (e.deltaY < 0) userUp(); }, { passive: true });
addEventListener('touchstart', e => { CU.ty = e.touches[0].clientY; }, { passive: true });
addEventListener('touchmove', e => { if (e.touches[0].clientY - (CU.ty || 0) > 8) userUp(); }, { passive: true });
addEventListener('keydown', e => { if (['PageUp', 'ArrowUp', 'Home'].includes(e.key) && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) userUp(); });
addEventListener('scroll', () => { if ($('#newpill') && nearBottom()) pill(false); }, { passive: true });
document.addEventListener('click', e => { if (e.target.closest('#newpill')) { const a = CU.anchor, th = $('.thead'); if (a && a.isConnected && th && a.getBoundingClientRect().top > th.getBoundingClientRect().bottom + 8) { CU.ours = Date.now(); scrollBy(0, a.getBoundingClientRect().top - th.getBoundingClientRect().bottom - 8); } else { CU.ours = Date.now(); scrollBy(0, innerHeight * 0.6); } CU.follow = true; setTimeout(followStep, 60); } });

/* 이력 창 (서버와 같은 방식: 30개를 넘으면 12개 단위로 앞을 자름 → 캐시 유지) */
const winHist = h => { if (h.length <= 30) return h; const drop = Math.ceil((h.length - 30) / 12) * 12; let o = h.slice(drop); while (o.length && o[0].r !== 'u') o = o.slice(1); return o; };
async function ask(body, onPart) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 45000);
  try {
    const r = await post({ stream: true, ...body }, ctl.signal), ct = r.headers.get('content-type') || '';
    if (r.status === 200 && /ndjson/.test(ct) && r.body && r.body.getReader) {
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '', done = null;
      for (;;) {
        const { value, done: end } = await rd.read(); if (end) break;
        buf += dec.decode(value, { stream: true }); let k;
        while ((k = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, k); buf = buf.slice(k + 1); if (!line.trim()) continue;
          let o; try { o = JSON.parse(line); } catch { continue; }
          if (o.t === 's' && Array.isArray(o.items)) onPart && onPart(o.items);
          else if (o.t === 'done') done = o;
          else if (o.t === 'error') return { error: o.error };
        }
      }
      return done || { error: '이야기가 잠깐 끊겼어요' };
    }
    const j = await r.json().catch(() => ({}));
    if (r.status === 200) return j;
    return { status: r.status, ...j, error: j.error || '이야기가 잠깐 끊겼어요' };
  } catch { return { error: '연결이 잠깐 끊겼어요' }; } finally { clearTimeout(t); }
}
async function send(q, o = {}) {
  const c = ctxOf(); if (!c || busy || !q.trim()) return;
  const st = c.store, w = c.w, ws = WS(w.id);
  if (!o.alt && H.left <= 0) { go(`out/${w.id}/${c.no}`); return; }
  if (c.kind === 'lunch' && !o.alt && H.lunchUsed >= H.lunchMax) { toast(`점심 쪽지 답장은 하루 ${H.lunchMax}번까지예요`); return; }
  busy = true;
  const altAt = o.alt ? lastAiIdx(st) : -1;
  let anchor = null;
  if (!o.alt) { st.log.push({ k: 'me', t: q }); anchor = appendEntries(c, st.log.length - 1); }
  const lg = $('#log');
  lg.insertAdjacentHTML('beforeend', `<div class="lg-ai pending">${chBubble(w, [{ k: 'say', t: '' }]).replace('<div class="bb"></div>', '<div class="bb typing"><i></i><i></i><i></i></div>')}</div>`);
  const node = lg.lastElementChild;
  if (o.alt) { const old = lg.querySelector(`.lg-ai[data-i="${altAt}"]`); if (old) { old.replaceWith(node); } anchor = node; }
  refreshTalk(); startFollow(anchor || node);
  const hist = o.alt ? st.hist.slice(0, -2) : st.hist;
  const j = await ask({ w: w.id, ch: w.ch.id, ep: c.kind === 'lunch' ? Math.max(1, H.open) : c.no, mode: c.kind === 'lunch' ? 'lunch' : 'talk', q, ck: o.ck || '', alt: !!o.alt,
    hist: winHist(hist), mem: ws.mem.slice(-12), nr: { talks: ws.talks, secrets: ws.secrets } }, items => { if (items.length) { node.classList.remove('pending'); node.innerHTML = group(w, items); followStep(); } });
  busy = false;
  if (!j || j.error || (!j.items && !j.safety)) {
    node.remove();
    if (j && j.status === 429 && j.limit) { H.left = 0; H.used = H.max; if (!o.alt) { st.log.pop(); anchor && anchor.remove(); } save(); refreshTalk(); go(`out/${w.id}/${c.no || 0}`); return; }
    if (j && j.status === 429 && j.lunch) { H.lunchUsed = H.lunchMax; if (!o.alt) { st.log.pop(); anchor && anchor.remove(); } save(); refreshTalk(); toast(j.error); return; }
    if (!o.alt) { st.log.pop(); anchor && anchor.remove(); const s = $('#say'); refreshTalk(); const s2 = $('#say'); if (s2) s2.value = q; }
    else redrawLog();
    toast((j && j.error ? j.error : '이야기가 잠깐 끊겼어요') + ' · 대화는 차감되지 않았어요'); refreshTalk(); return;
  }
  const from = st.log.length;
  if (j.safety) { st.log.push({ k: 'ai', items: [{ k: 'safe', t: j.items[0].t }], safe: true }); }
  else {
    const entry = { k: 'ai', items: j.items, chips: (j.replies || []).slice(0, 3).map((x, i) => [['다가가기', '묻기', '장난'][i], x]), image: j.image, alt: !!o.alt || undefined };
    if (o.alt) { st.log[altAt] = entry; st.hist[st.hist.length - 1] = { r: 'a', t: j.raw || '' }; }
    else {
      st.log.push(entry); st.hist.push({ r: 'u', t: q }, { r: 'a', t: j.raw || '' }); if (st.hist.length > HIST_MAX) st.hist.splice(0, st.hist.length - HIST_MAX);
      const n = j.nr || {}, s0 = ws.stage;
      ws.talks = Math.max(ws.talks + 1, n.talks || 0); ws.stage = Math.max(ws.stage, n.stage || 0); if (n.secrets) ws.secrets = [...new Set([...ws.secrets, ...n.secrets])];
      if (c.kind === 'ep') st.talks = (st.talks || 0) + 1;
      if (c.kind === 'lunch') H.lunchUsed = Math.min(H.lunchMax, H.lunchMax - (n.lunchLeft ?? (H.lunchMax - H.lunchUsed - 1)));
      if (j.left != null) { H.left = Math.max(0, j.left); H.used = j.used; }
      if (ws.stage > s0) st.log.push({ k: 'stage', from: s0, to: ws.stage });
      if (n.secret) st.log.push({ k: 'sec', n: n.secret.n, t: n.secret.text });
      if (j.image && j.image !== 'none' && !S.cards.some(x => x.tag === j.image)) { st.log.push({ k: 'card', tag: j.image }); S.cards.push({ w: w.id, ep: c.no || 0, tag: j.image, at: Date.now() }); }
      if (c.kind === 'ep' && st.talks === END_AT && !st.done) { st.done = 1; st.log.push({ k: 'endc' }); }
      if (c.kind === 'ep' && st.talks === 1) st.log.push({ k: 'pr', t: `첫마디가 남았어요 — ${w.ch.short}${josa(w.ch.short, '이', '가')} 이 말을 기억해요` });
      if (c.kind === 'lunch' && H.lunchUsed >= H.lunchMax) st.done = 1;
      if (n.last || H.left <= 0) st.log.push({ k: 'restc' });
      if (ws.talks % MEMO_EVERY === 0) memo(w, st.hist);
    }
  }
  if (st.log.length > LOG_MAX) st.log.splice(0, st.log.length - LOG_MAX);
  save();
  if (o.alt) { redrawLog(); CU.anchor = $(`#log .lg-ai[data-i="${altAt}"]`); toast('같은 말에 다른 반응 — 대화는 쓰지 않았어요'); }
  else { node.remove(); appendEntries(c, from); }
  refreshTalk();
  requestAnimationFrame(followStep); setTimeout(followStep, 120);
}
/* 기억 요약: 6번마다 (요약 줄만 · 이름은 {name}) */
async function memo(w, hist) {
  try {
    const r = await post({ act: 'memo', w: w.id, ch: w.ch.id, mem: WS(w.id).mem.slice(-12), hist: winHist(hist).slice(-12) }); const j = await r.json();
    if (r.ok && Array.isArray(j.lines) && j.lines.length) { WS(w.id).mem = j.lines.slice(0, 30); save(); }
  } catch { /* 다음에 */ }
}

/* 다 쓴 밤 — 이야기가 쉬어 가는 모습 */
VIEWS.out = (id, no) => {
  const w = W(id) || mainW(), st = +no ? EP(w.id, +no) : S.lunch, lastAi = st && st.log ? [...st.log].reverse().find(x => x.k === 'ai' && !x.safe) : null;
  return `<div class="talk" style="padding-bottom:30px">
    <div class="thead"><div class="r1">${back()}${av(w, 36)}<div class="nm"><b>${esc(w.ch.name)}</b><small>오늘 밤은 여기까지 · 내일 밤 9시에 다시</small></div><span class="turns" style="opacity:.6">${I('bolt', 's')}${H.left}</span></div></div>
    <div class="log">${lastAi ? `<div class="lg-sc"><span>오늘 밤 마지막 장면</span></div>${group(w, lastAi.items)}` : ''}
      <div class="rest"><h3>오늘 밤 30번을 모두 나눴어요</h3><p>이야기는 여기서 쉼표. ${esc(w.ch.short)}${josa(w.ch.short, '은', '는')} 오늘 나눈 말을 기억하고 있어요.</p>
        <div class="o"><span class="ico">${I('moon', 's')}</span><div class="t"><b>밤 9시 · ${Math.min(12, H.open + 1)}화와 대화 30번</b><span data-cd>${toNine()}</span> 남음</div></div>
        <div class="o"><span class="ico">${I('mail', 's')}</span><div class="t"><b>낮 12시 · 점심 쪽지</b>${esc(w.ch.short)}${josa(w.ch.short, '이', '가')} 먼저 보내요 · 답장 3번은 대화 30번 안에서</div></div>
        <button class="o pass2" data-go="pass"><span class="ico">${I('crown', 's')}</span><div class="t"><b>지금 더 이어 가려면 · 너랑 패스</b>월 9,900원 · 곧 열려요</div>${I('back', 's').replace('class="ic s"', 'class="ic s" style="transform:rotate(180deg)"')}</button>
      </div></div></div>`;
};

/* 회차 끝 — 오늘의 기록 + 다음 화 예고 */
VIEWS.end = (id, no) => {
  const w = W(id); no = +no; if (!w || !no) return VIEWS.home();
  const st = EP(id, no), ws = WS(id), mems = ws.mem, lastMe = [...st.log].reverse().find(x => x.k === 'me');
  const card = [...st.log].reverse().find(x => x.k === 'card'), sec = st.log.filter(x => x.k === 'sec');
  const nx = no + 1, nxOpen = nx <= H.open, nxTitle = nx <= 12 ? epTitle(w, nx) : '시즌 2', tease = epTease(w, no);
  const others = WORKS.filter(x => x.id !== id).slice(0, 2);
  return `<div class="end">
    <header class="top dark">${back()}<h1></h1><button class="btn" data-go="home" aria-label="닫기">${I('x')}</button></header>
    <div class="hero"><small>${esc(w.short)} · ${no}화 「${esc(epTitle(w, no))}」</small><h2>오늘 밤, 당신의 말로 이어졌어요</h2><p>오늘 고른 말은 ${esc(w.ch.short)}의 기억에 남았어요.</p></div>
    <div class="rec4"><div><small>이 화에서 나눈 대화</small><b>${st.talks || 0}번</b></div><div><small>관계</small><b>${st.stage0 !== ws.stage ? `${STAGES[st.stage0 || 0]} → ${STAGES[ws.stage]}` : STAGES[ws.stage]}</b></div>
      <div><small>장면 카드</small><b class="s">${card ? esc(placeName(w, card.tag) || '한 장면') : '아직'}</b></div><div><small>나만 아는 것</small><b class="s">${sec.length ? `비밀 ${sec.map(x => x.n).join(' · ')} 열림` : `${ws.secrets.length} / 3`}</b></div>
      <div class="wide"><small>${esc(w.ch.short)}${josa(w.ch.short, '이', '가')} 기억하는 것</small><b class="s">${esc(mems.length ? memText(mems[mems.length - 1]) : lastMe ? `“${lastMe.t}”라고 말해 준 밤` : '아직 나눈 말이 없어요')}</b></div></div>
    <div class="frame"><div class="img" style="background-image:url(${teaserOf(w, nx)})"><span>다음 화 예고</span></div><div class="in">
      <h4>${nx <= 12 ? `${nx}화 · ${esc(nxTitle)}` : '시즌 1 끝 · 시즌 2 준비 중'}</h4><p>${esc(tease)}</p>
      ${nxOpen ? `<button class="cta" data-go="read/${id}/${nx}">${nx}화 지금 읽기</button>` : `<div class="cd"><div class="t">밤 9시까지<b data-cd>${toNine()}</b></div><span class="on">${S.alarm ? `${I('check', 's')}알림 켜짐` : ''}</span></div>`}</div></div>
    <div class="endmore"><h5>오늘 밤 열린 다른 화</h5>${others.map(x => `<button class="x" data-go="work/${x.id}">${cover(x, '', false)}<div style="flex:1"><b>${esc(x.short)} · ${H.open}화</b><small>${esc(seedOf(x, H.open))}</small></div>${EP(x.id, H.open).read ? '' : '<span class="badge">NEW</span>'}</button>`).join('')}
      <button class="cta ghost" data-back style="margin-top:8px;background:transparent;color:#fff;border-color:rgba(255,255,255,.18)">${esc(w.ch.short)}${josa(w.ch.short, '과', '와')} 더 이야기하기 · ${H.left}번 남음</button></div>
  </div>`;
};

/* 내 서재 */
VIEWS.lib = (tab = 'reading') => {
  const tabs = [['reading', '읽는 중'], ['cards', '모은 것'], ['mine', '나만 아는 것']];
  const reading = WORKS.filter(w => Object.values(WS(w.id).eps).some(e => e.read));
  let body = '';
  if (tab === 'reading') body = reading.length ? reading.map(w => { const ws = WS(w.id), rd = Object.values(ws.eps).filter(e => e.read).length, un = Math.max(0, H.open - rd), lastAi = (() => { for (let n = 12; n >= 1; n--) { const e = ws.eps[n]; const a = e && [...e.log].reverse().find(x => x.k === 'ai' && !x.safe); if (a) { const s = a.items.find(x => x.k === 'say'); if (s) return s.t; } } return ''; })();
    return `<button class="lrow" data-go="work/${w.id}">${cover(w, '', false)}<div class="m"><b>${esc(w.title)}</b><div class="q">${lastAi ? `${esc(w.ch.short)} · ${esc(lastAi)}` : esc(w.hook)}</div><div class="bar"><i style="width:${rd / 12 * 100}%"></i></div><div class="ft"><span>${rd}/12화 · ${STAGES[ws.stage]}</span><span>${un ? `${H.open}화 열림` : '다 읽음'}</span></div></div>${un ? `<span class="un">${un}</span>` : ''}</button>`; }).join('')
    : `<p class="loading">아직 읽은 작품이 없어요<br><button class="cta" data-go="home" style="margin-top:16px">오늘 밤 화 보러 가기</button></p>`;
  if (tab === 'cards') body = S.cards.length ? `<div class="cards">${[...S.cards].reverse().map(c => { const w = W(c.w); return `<div class="k ${Date.now() - c.at < 864e5 ? 'new' : ''}"><div class="ph" style="background-image:url(${sceneImg(w, c.tag)})">${Date.now() - c.at < 864e5 ? '<i class="badge">NEW</i>' : ''}</div><div><b>${esc(c.t || placeName(w, c.tag) || '한 장면')}</b><small>${esc(w.short)}${c.ep ? ` · ${c.ep}화` : ''}</small></div></div>`; }).join('')}</div>`
    : `<p class="loading">대화 중 장면이 바뀌면 장면 카드가 모여요</p>`;
  if (tab === 'mine') { const ws0 = WORKS.filter(w => WS(w.id).talks > 0);
    body = ws0.length ? `<div class="mine">${ws0.map(w => { const ws = WS(w.id), mem = ws.mem; return `<div class="grp"><div class="gh">${av(w, 32)}<b>${esc(w.ch.name)}</b><span class="badge vi">${STAGES[ws.stage]}</span></div>
      <h6><span>비밀</span><span>${ws.secrets.length}/3</span></h6>${w.secrets.map(s => ws.secrets.includes(s.n) ? `<div class="sx">${I('unlock', 's')}<span>${esc(mine(s.text))}</span></div>` : `<div class="sx lk">${I('lock', 's')}<span>‘${s.need}’ 이상 · ${s.ep}화 이후에 열려요</span></div>`).join('')}
      <h6><span>${esc(w.ch.short)}${josa(w.ch.short, '이', '가')} 기억하는 ${esc(nm())}</span><span>${Math.min(mem.length, 5)}/5</span></h6>${mem.length ? `<ul>${mem.slice(-5).map(m => `<li>${esc(memText(m))}</li>`).join('')}</ul>` : `<p class="cap">대화가 ${MEMO_EVERY}번 쌓이면 기억이 정리돼요</p>`}</div>`; }).join('')}<p class="cap">기억 노트는 무료 5줄 · 패스는 전부 기억해요 · 기억은 요약만 남겨요(이름 · 생년월일은 저장하지 않아요)</p></div>`
    : `<p class="loading">대화를 나누면 비밀과 기억이 여기 모여요</p>`; }
  return `<div class="page"><header class="top">${back()}<h1>내 서재</h1><button class="btn" data-go="alarm" aria-label="알림">${I('bell')}</button></header>
    <div class="ltabs">${tabs.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>${body}</div>${tabbar()}`;
};

/* 알림 · 대화 충전 */
VIEWS.alarm = () => {
  const lun = S.lunch && S.lunch.day === period() ? S.lunch : null;
  const noti = [
    ...(H.open ? WORKS.slice(0, 3).map(w => ({ t: '21:00', k: 'new', w, x: `${H.open}화 「${epTitle(w, H.open)}」이 열렸어요. 대화 30번도 새로 채웠어요.` })) : []),
    ...(lun ? [{ t: '12:00', k: 'note', w: W(lun.w), x: `${W(lun.w).ch.short}의 점심 쪽지 · “${lun.text}”`, go: 'lunch' }] : []),
    ...(S.streak.n > 1 ? [{ t: '어제', k: 'streak', x: `연속으로 찾은 밤 ${S.streak.n}일째 — 7일째 밤엔 장면 카드를 드려요.` }] : []),
  ];
  return `<div class="page"><header class="top">${back()}<h1>알림 · 대화 충전</h1></header>
  <section class="day"><h3>너랑의 하루</h3><div class="tl">
    <div class="mid"><b><i>12:00</i>점심 쪽지</b><span>캐릭터 한 명이 먼저 말을 걸어요 · 답장 3번 · 하루 한 통 · 대화 30번 안에서</span></div>
    <div class="big"><b><i>21:00</i>새 화 + 대화 30번</b><span>${WORKS.length}편 모두 새 화가 열리고, 대화가 30번으로 다시 채워져요</span></div>
    <div><b><i>지금</i>남은 대화 ${H.left}번 · 다음 충전까지 <span data-cd style="color:#fff">${toNine()}</span></b><span>다 써도 이야기는 끊기지 않고 쉬어 가요</span></div></div></section>
  <div class="sec"><div class="sh"><h2>새 소식</h2></div><div class="nlist">${noti.length ? noti.map(n => { const ic = n.k === 'new' ? ['', 'book'] : n.k === 'note' ? ['co', 'mail'] : ['gd', 'moon']; return `<button class="n" ${n.go ? `data-go="${n.go}"` : n.w ? `data-go="work/${n.w.id}"` : ''}><span class="ico ${ic[0]}">${I(ic[1], 's')}</span><p>${n.w ? `<b>${esc(n.w.short)}</b> · ` : ''}${esc(n.x)}<small>${n.t}</small></p></button>`; }).join('') : '<p class="loading" style="padding:30px">아직 소식이 없어요</p>'}</div></div>
  <div class="sec"><div class="sh"><h2>알림 설정</h2></div><div class="setlist">
    <button data-toggle="alarm"><div class="t">밤 9시 새 화<small>열리는 순간 한 번</small></div><span class="sw ${S.alarm ? 'on' : ''}"></span></button>
    <button data-toggle="lunchOn"><div class="t">점심 쪽지<small>낮 12시 · 캐릭터가 먼저 말 걸기</small></div><span class="sw ${S.lunchOn ? 'on' : ''}"></span></button>
    <button data-toggle="soonOn"><div class="t">곧 공개 작품<small>알림 받기 한 작품 ${S.soonBell.length}편</small></div><span class="sw ${S.soonOn ? 'on' : ''}"></span></button></div></div>
  </div>${tabbar()}`;
};

/* 패스 안내 (결제 없음 — PG 붙으면 열림) */
VIEWS.pass = () => `<div class="pass"><header class="top dark" style="background:transparent">${back()}<h1></h1></header>
  <div class="ph"><small>너랑 패스</small><h2>오늘 밤 이야기를<br>끝까지, 마음껏</h2><div class="price"><b>9,900원</b><span>/ 월</span></div></div>
  <div class="cmp"><div class="r h"><span></span><span>무료</span><span>패스</span></div>
    <div class="r"><span>매일 밤 새 화</span><span>모두</span><span>모두</span></div>
    <div class="r"><span>대화</span><span>하루 30번</span><span>제한 없이</span></div>
    <div class="r"><span>캐릭터의 기억</span><span>5줄</span><span>전부</span></div>
    <div class="r"><span>지난 화 다시 대화</span><span>—</span><span>✓</span></div>
    <div class="r"><span>장면 카드 원본 저장</span><span>—</span><span>✓</span></div>
    <div class="r"><span>곧 공개 작품</span><span>공개일</span><span>하루 먼저</span></div></div>
  <p class="fine">작품 · 회차는 무료와 똑같아요. 패스는 '더 오래, 더 깊이'만 더해요.<br>재화는 원어데이 골드 하나 · 언제든 해지 · 남은 기간까지 그대로</p>
  <div class="act"><button class="cta light" disabled>결제는 곧 열려요 · 지금은 안내만</button></div></div>`;

/* ── 이벤트 ── */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-go],[data-back],[data-pick],[data-toggle],[data-start],[data-chip],[data-alt],[data-tab],[data-bell],[data-shell],[data-locked],[data-fs],[data-font],[data-th],[data-age]');
  if (!el) return; const d = el.dataset;
  if ('back' in d) { e.preventDefault(); goBack(); return; }
  if (d.go) { if (busy && /^(talk|lunch)/.test(route()[0])) { toast('답을 기다리는 중이에요'); return; } go(d.go); return; }
  if (d.pick) { const a = S[d.pick], i = a.indexOf(d.v); i < 0 ? a.push(d.v) : a.splice(i, 1); save(); render(); return; }
  if (d.age) { S.age = d.age === 't' ? 16 : d.age === 'a' ? 25 : 10; save(); render(); return; }
  if (d.toggle) { S[d.toggle] = !S[d.toggle]; save(); render(); post({ act: 'alarm', id: { alarm: 'night', lunchOn: 'lunch', soonOn: 'soon' }[d.toggle], on: S[d.toggle] }).catch(() => {}); if (d.toggle === 'alarm' && S.alarm) toast('밤 9시에 새 화 소식을 알려 드릴게요'); return; }
  if (d.start) { S.onboarded = true; if (d.start !== 'home') S.lastW = d.start; save(); if (S.alarm) post({ act: 'alarm', id: 'night', on: true }).catch(() => {}); location.replace('#' + (d.start === 'home' ? 'home' : 'work/' + d.start)); history.replaceState({ d: 0 }, ''); return; }
  if (d.chip) { const c = ctxOf(), st = c && c.store, last = st && st.log.filter(x => x.k === 'ai' || x.k === 'me').slice(-1)[0], chips = !last ? c.chips : last.chips; if (chips && chips[+d.chip]) send(chips[+d.chip][1]); return; }
  if (d.alt) { const c = ctxOf(), st = c && c.store, i = +d.alt, me = st && [...st.log.slice(0, i)].reverse().find(x => x.k === 'me'); if (me) send(me.t, { alt: true }); return; }
  if (d.tab) { location.replace('#lib/' + d.tab); return; }
  if (d.bell) { const id = d.bell, a = S.soonBell, k = a.indexOf(id); const on = k < 0; on ? a.push(id) : a.splice(k, 1); save(); render(); post({ act: 'bell', id, on }).catch(() => {}); toast(on ? '공개되는 밤 9시에 알려 드릴게요' : '알림을 껐어요'); return; }
  if ('shell' in d) { const h = d.shell ? '#' + d.shell : '#game'; if (EMB) { try { const b = parent.document.querySelector(`#tabs button[data-tab="${d.shell || 'today'}"]`); if (b) { b.click(); return; } } catch { /* */ } } location.href = '/' + h; return; }
  if ('locked' in d) { toast('이 화는 열리는 날 밤 9시에 알려 드릴게요'); return; }
  if (d.fs) { S.view.fs = +d.fs; save(); render(); return; }
  if (d.font) { S.view.font = d.font; save(); render(); return; }
  if (d.th) { S.view.th = d.th; save(); render(); return; }
});
document.addEventListener('submit', e => { if (e.target.id === 'inform') { e.preventDefault(); const i = $('#say'); const v = (i.value || '').trim(); if (!v) return; i.value = ''; send(v.slice(0, 300)); } });
document.addEventListener('input', e => {
  if (e.target.id === 'nm') { S.name = e.target.value.replace(/\s+/g, '').slice(0, 8); save(); const pv = $('#pv'); if (pv) pv.textContent = `“…${nm()}. 지금은 연기 아니었습니다.”`; const c = e.target.nextElementSibling; if (c) c.textContent = `${e.target.value.length}/8`; }
});
function readProg() {
  const f = () => { const p = $('#prog'); if (!p) return; const h = document.body.scrollHeight - innerHeight; p.style.width = (h > 0 ? Math.min(100, scrollY / h * 100) : 0) + '%'; };
  f(); if (!readProg.on) { readProg.on = 1; addEventListener('scroll', f, { passive: true }); }
}

/* ── 시작: 서버 시각 · 남은 횟수 → 연속 방문 · 점심 쪽지 → 그리기 ── */
function streak() {
  const p = period(), y = new Date(Date.parse(p) - 864e5).toISOString().slice(0, 10);
  if (S.streak.p === p) return;
  S.streak.n = S.streak.p === y ? S.streak.n + 1 : 1; S.streak.p = p;
  if (S.streak.n % 7 === 0 && S.streak.gift !== S.streak.n) { S.streak.gift = S.streak.n; const w = mainW(); S.cards.push({ w: w.id, ep: 0, tag: '', t: `${S.streak.n}일째 밤의 선물`, at: Date.now() }); }
  save();
}
async function lunch() {
  if (!S.lunchOn || !H.lunchOpen || !S.onboarded) return;
  const w = mainW(); if (S.lunch && S.lunch.day === period()) return;
  try { const r = await post({ act: 'lunch', w: w.id }); const j = await r.json(); if (r.ok && j.text) { S.lunch = { day: period(), w: w.id, text: j.text, chips: j.chips || [], log: [], hist: [] }; save(); if (route()[0] === 'home') render(); } } catch { /* 다음에 */ }
}
window.__nr = { state: () => S, H, render, follow: () => CU, send, ctxOf };   /* 점검용 */
render();
home().then(() => { streak(); render(); lunch(); sync(); });
