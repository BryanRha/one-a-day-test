// 원어데이 첫 화면 「오늘」 허브 (2026-11-04 대표 "B가 좋아" · "4칸으로 하자" — 시안 lab/home-hub/b 의 4칸 안)
//   오늘의 게임 · 점방 · 너랑을 같은 크기 카드로 · 진행 링 0~3/3 · 칭찬 문구 · 점심 쪽지 띠 · '내일도 여기서' 예고 2칸
//   그 아래로 지금 게임 메인(이번 주 달력 · 진열장)을 이어 붙임 (app.js renderToday)
//   데이터: 게임 = rules.js 기록 · 점방 = fortune.js 계산(오늘 탭에서 연 날 = days()[오늘].f) · 너랑 = 이 기기 nr_v1 + /api/story {act:'home'} (neorang/nr.js 와 같은 규칙)
//   상태 셈은 여기서만 · 그리기는 html() · 늦게 오는 값(운세 엔진 · 너랑 작품 · 서버 시각)은 load() 가 받아 두고 다시 그리기를 부름
const NR_KEY = 'nr_v1', LUNCH_MAX = 3, DAY_FREE = 30;
const STAGES = ['낯섦', '호기심', '신뢰', '설렘', '약속'];
const ls = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const josa = (w, a, b) => { const c = String(w).charCodeAt(String(w).length - 1) - 0xAC00; return c >= 0 && c <= 11171 && c % 28 ? a : b; };
const hms = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return [s / 3600, (s % 3600) / 60, s % 60].map(v => String(Math.floor(v)).padStart(2, '0')).join(':'); };

/* ── 너랑 시계 (nr.js 와 같음: 서버 시각 기준 · 밤 9시에 하루가 바뀜) ── */
const NR = { works: null, soon: [], art: {}, home: null, at: 0, busy: false, lunchAsk: '' };
let SKEW = 0;
const now = () => Date.now() + SKEW;
const kst = ms => new Date(ms + 9 * 3600e3);
const period = (ms = now()) => kst(ms - 21 * 3600e3).toISOString().slice(0, 10);
const next9 = () => Date.parse(period() + 'T21:00:00+09:00') + 864e5;
const kHour = () => kst(now()).getUTCHours();
const night = () => { const h = kHour(); return h >= 21 || h < 4; };   /* 밤 9시 ~ 새벽: 오늘 밤 새 화가 막 열린 때 */
const lunchTime = () => { const h = kHour(); return h >= 12 && h < 18; };   /* 점심 쪽지 띠: 낮 12시 ~ 저녁 6시 (그 뒤엔 밤 9시 카운트다운이 주인공) */
export const toNine = () => hms(next9() - now());
const localOpen = () => Math.max(0, Math.min(12, Math.round((Date.parse(period()) - Date.parse('2026-11-02')) / 864e5) + 1));
const A = p => (p ? 'neorang/img/' + String(p).replace(/^\.?\/?(img\/)?/, '') : '');

/* ── 서비스 로고 줄 (시안 그대로) ── */
const LOGO = {
  oad: '<span class="svc oad"><img class="ic" src="icons/icon_192.png" alt="">One a Day</span>',
  jb: '<span class="svc jb"><img class="ic" src="fortune/brand/c/icon_192.png" alt="">점방</span>',
  nr: '<span class="svc nr"><img class="ic" src="neorang/icon/g/app_192.png" alt="">너랑</span>',
};

/* ── 게임 ── */
function gameSt(X) {
  const { R, G } = X, id = R.todayId(), g = id && G(id), s = R.state(), today = R.keyOf(R.now()), lib = id && s.library[id];
  if (!g) return { st: 'none', done: false };
  const played = !!(lib && lib.last === today), n = lib && lib.td === today ? lib.tn || 1 : played ? 1 : 0;
  return { st: played ? 'done' : X.isNew ? 'new' : 'ret', done: played, id, g, n, streak: s.streak.count || 0 };
}
function gameCard(X, G0) {
  if (G0.st === 'none') return `<div class="hcard g" data-hub="game" data-hst="none" role="button" tabindex="0"><div class="in">${LOGO.oad}<div class="k">오늘의 게임</div><div class="t">게임은 곧 하나씩 열려요</div><div class="s">준비가 끝난 게임부터 매일 하나씩 공개할게요</div></div></div>`;
  const { g, id } = G0, done = G0.st === 'done';
  const c = done ? { badge: '<span class="badge ok">✓ 했어요</span>', k: `오늘의 게임 · ${g.title}`, t: `오늘 ${G0.n}판 플레이`, s: '보관함에 저장했어요 · 내일 0시 새 게임', go: '한 판 더', goCls: 'ghost', meta: '새 게임까지 <b data-cd>--:--:--</b>' }
    : { badge: '', k: `오늘의 게임 · ${g.genre} · ${g.time}`, t: g.title, s: g.tagline, go: '▶ 무료 플레이', meta: G0.st === 'new' || !G0.streak ? '👥 오늘 모두 같은 게임' : `🔥 <b>${G0.streak}일</b> 연속 출석 중` };
  return `<div class="hcard g" data-hub="game" data-hst="${G0.st}" data-play="${id}" data-from="hub" role="button" tabindex="0"><div class="art" style="background-image:url('${X.webp(g.cover)}')"></div>${c.badge}
    <div class="in">${LOGO.oad}<div class="k">${esc(c.k)}</div><div class="t">${esc(c.t)}</div><div class="s">${esc(c.s)}</div>
    <div class="row"><button class="go ${c.goCls || ''}" type="button" tabindex="-1">${c.go}</button><span class="meta2">${c.meta}</span></div></div></div>`;
}

/* ── 점방 (fortune.js 계산 그대로 · 엔진이 아직이면 이름 · 점수 없이) ── */
function fortSt(X) {
  const me = ls('oad_fortune_me'); if (!me) return { st: 'none', done: false };
  const key = X.R.keyOf(X.R.now()), seen = !!((ls('oad_days') || {})[key] || {}).f, m = X.FT();
  const f = m ? m.fortune(me, X.R.now()) : null;
  return { st: seen ? 'yes' : 'no', done: seen, me, f, m, key };
}
function fortCard(X, F) {
  const c = F.f && F.m.CHARS[F.f.ch], art = c && c.art ? `fortune/char/${F.f.ch}.webp` : 'fortune/char/heukryeon.webp';
  let o;
  if (F.st === 'none') o = { k: '오늘의 신점 · 매일 무료', t: '오늘 너를 읽어 줄 <em>점쟁이</em>가 기다린다', s: '생년월일만 넣으면 끝', go: '내 운세 무료로 보기 →', seal: '獨說' };
  else if (F.st === 'no') o = { badge: '<span class="badge newb">오늘 것</span>', k: c ? `${c.name}의 오늘의 신점` : '오늘의 신점', t: `${esc(F.me.name)}, 오늘 네 하루를 <em>읽어 뒀다</em>`, s: '점수와 한 줄은 열어야 보여요', go: '오늘 운세 열기 · 무료 →' };
  else {
    const h = F.f && F.m.hookOf(F.f, F.key, X.bought(F.m, F.me));
    o = { badge: '<span class="badge ok">✓ 봤어요</span>', k: c ? `${c.name} · 오늘은 ${F.f.key}의 날` : '오늘의 신점', score: F.f ? F.f.total : '', t: F.f ? `“${esc(F.f.say)}”` : `${esc(F.me.name)}의 오늘`,
      go: h ? `🔮 ${esc(F.m.paidOf(h.id).title)} 엿보기` : '📜 오늘 운세 다시 보기', paid: h ? h.id : '' };
  }
  const main = o.score !== undefined ? `<div class="row" style="padding-top:6px;margin-top:6px"><span class="score">${o.score}<small>점</small></span><div class="t" style="font-size:14px;line-height:1.35;max-width:58%">${o.t}</div></div>`
    : `<div class="t">${o.t}</div><div class="s">${o.s}</div>`;
  return `<div class="hcard f" data-hub="fort" data-hst="${F.st}" role="button" tabindex="0"><div class="art" style="background-image:url('${art}')"></div>${o.badge || `<span class="seal">${(c && c.seal) || o.seal || '獨說'}</span>`}
    <div class="in">${LOGO.jb}<div class="k">${esc(o.k)}</div>${main}
    <div class="row"><button class="go" type="button" tabindex="-1"${o.paid ? ` data-paid="${o.paid}"` : ''}>${o.go}</button></div></div></div>`;
}

/* ── 너랑 (nr.js 의 상태 · 서버 home 값) ── */
const nrS = () => ls(NR_KEY) || {};
const nrW = id => (NR.works || []).find(w => w.id === id);
const nrArt = w => NR.art[w.id] || {};
const nrScene = (w, k, mood) => { const a = nrArt(w), sc = a.scenes || {}, p = (w.places[k] || w.places[0] || {}).tag; return A(sc[`${w.id}_${p}_${mood}`] || a.cover || Object.values(sc)[0]); };
const nrAvatar = w => { const a = nrArt(w).avatar || {}; return A(a.smile || a.default || Object.values(a)[0]); };
const epTitle = (w, no) => (w.eps[no - 1] || {}).title || `${no}화`;
function nrSt(X) {
  if (X.PROD) return { st: 'soon', done: false };
  const S = nrS(), w = nrW(S.lastW) || nrW('c17');
  if (!S.onboarded || !w) return { st: 'first', done: false, w: w || null };
  const H = NR.home || {}, open = typeof H.open === 'number' ? H.open : localOpen(), left = typeof H.left === 'number' ? H.left : DAY_FREE;
  const ws = (S.works || {})[w.id] || { eps: {}, talks: 0, stage: 0 }, e = (ws.eps || {})[open] || {};
  const seenToday = !!S.seen && new Date(S.seen).toDateString() === new Date(now()).toDateString();
  const read0 = !Object.values(ws.eps || {}).some(x => x.read);
  const lun = S.lunch && S.lunch.day === period() && S.lunch.text ? S.lunch : null;
  const lunch = !!(lun && !(lun.log || []).length && lunchTime());
  const st = !open ? 'wait' : !e.read ? 'open' : seenToday ? 'done' : 'wait';
  return { st, done: st === 'done', w, open, left, e, ws, read0, lunch, lun, ask: !lun && S.lunchOn !== false && H.lunchOpen && lunchTime() };
}
function nrCard(X, N) {
  if (N.st === 'soon') return `<div class="hcard n soon" data-hub="nr" data-hst="soon" role="button" tabindex="0"><div class="in">${LOGO.nr}<div class="k">너랑 쓰는 웹소설</div><div class="t">곧 공개돼요</div><div class="s">매일 밤 9시, 새 화 한 편과 그 사람과의 대화</div>
    <div class="row"><button class="go ghost" type="button" tabindex="-1">곧 공개</button></div></div></div>`;
  const w = N.w; let o;
  if (N.st === 'first') o = { art: w ? A(nrArt(w).cover) : '', k: '너랑 쓰는 웹소설 · 모든 화 무료', t: '읽고 나면, 그가 먼저 말을 건다', s: '1화는 3분 · 매일 밤 9시 새 화', go: '첫 이야기 고르기 →', meta: `대화 하루 <b>${DAY_FREE}번</b> 무료`, link: '' };
  else if (N.st === 'wait') { const nx = N.open + 1; o = { art: nrScene(w, 0, 'smile'), k: `${w.short} · ${nx}화 · 오늘 밤 9시`, t: `「${esc(epTitle(w, nx))}」`, cd: true, go: N.open ? `${N.open}화 다시 보기` : '작품 보기', goCls: 'ghost', meta: `대화 <b>${N.left}번</b> 남음${N.left < DAY_FREE ? ` · 9시에 ${DAY_FREE}번` : ''}`, link: N.open ? `read/${w.id}/${N.open}` : `work/${w.id}` }; }
  else if (N.st === 'open') { const no = N.read0 ? 1 : N.open; o = { art: nrScene(w, 1, 'serious'), badge: night() ? '<span class="badge live">오늘 밤 열림</span>' : '<span class="badge newb">새 화</span>', k: `${w.short} · ${N.open}화`, t: `「${esc(epTitle(w, N.open))}」`,
    s: `다 읽으면 ${w.ch.short}${josa(w.ch.short, '이', '가')} 먼저 말을 걸어요`, go: N.read0 && N.open > 1 ? '1화부터 읽고 대화하기' : '읽고 이어서 대화하기', meta: `대화 <b>${N.left}번</b> ${N.left >= DAY_FREE ? '새로' : '남음'}`, link: `read/${w.id}/${no}` }; }
  else o = { art: nrScene(w, 1, 'serious'), badge: '<span class="badge ok">✓ 읽었어요</span>', k: `${w.short} · ${N.open}화 읽음`, t: `${w.ch.short}${josa(w.ch.short, '이', '가')} 오늘을 기억해요`,
    s: `대화 ${N.e.talks || 0}번 · 관계 ‘${STAGES[N.ws.stage || 0]}’`, go: '대화 이어 가기', goCls: 'ghost', meta: `대화 <b>${N.left}번</b> 남음`, link: `talk/${w.id}/${N.open}` };
  return `<div class="hcard n" data-hub="nr" data-hst="${N.st}" data-nr="${o.link}" role="button" tabindex="0">${o.art ? `<div class="art" style="background-image:url('${o.art}')"></div>` : ''}${o.badge || ''}
    <div class="in">${LOGO.nr}<div class="k">${esc(o.k)}</div><div class="t">${o.t}</div>${o.cd ? `<div class="cdbig"><span data-cd9>${toNine()}</span><small>뒤 열려요</small></div>` : `<div class="s">${esc(o.s)}</div>`}
    <div class="row"><button class="go ${o.goCls || ''}" type="button" tabindex="-1">${o.go}</button><span class="meta2">${o.meta}</span></div></div></div>`;
}
function lunchStrip(N) {
  if (!N.lunch && !N.ask) return '';
  const w = N.lun ? nrW(N.lun.w) || N.w : N.w, av = nrAvatar(w), txt = N.lun ? `“${esc(N.lun.text)}”` : '낮 12시, 먼저 보낸 쪽지가 있어요';
  return `<div class="lunch" data-hub="lunch" data-hst="new" data-nr="lunch" role="button" tabindex="0">${av ? `<img src="${av}" alt="">` : ''}<div class="tx"><b>${esc(w.ch.short)}의 점심 쪽지가 왔어요</b><span>${txt}</span></div><span class="badge newb">답장 ${LUNCH_MAX}번</span></div>`;
}

/* ── 지금 상태 셋 (기록 · 탭 점에도 씀) ── */
export function states(X) { return { g: gameSt(X), f: fortSt(X), n: nrSt(X) }; }
export const nrDot = X => { const N = nrSt(X); return N.st === 'open' || N.lunch; };

/* ── 허브 한 덩어리 (#hub — 늦게 온 값으로 이 덩어리만 다시 그림) ── */
export function html(X) {
  const { g: G0, f: F, n: N } = states(X), d = [G0, F, N].filter(x => x.done).length;
  const C = 2 * Math.PI * 10, ring = `<svg viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="10" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="3.5"/><circle cx="13" cy="13" r="10" fill="none" stroke="#FFC93C" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${C * d / 3} ${C}" transform="rotate(-90 13 13)"/></svg>`;
  const name = (F.me && F.me.name) || nrS().name || '';
  const hello = X.isNew && !d ? '오늘은 하나만 골라도 좋아요' : d === 3 ? `${name ? name + ', ' : ''}오늘 다 챙겼어요` : d ? `${name ? name + ', ' : ''}잘하고 있어요` : name ? `${esc(name)}의 오늘` : '오늘의 세 가지';
  const n = X.R.now(), clock = `${X.fmtDate(n)} · <span data-hclock>${n.getHours()}시 ${n.getMinutes()}분</span>`;
  const st = X.R.state().streak.count || 0, tg = X.R.gameOn(X.R.dayIndex() + 1), fresh = tg && !X.R.state().library[tg];
  const w = N.w, nx = N.open + 1;
  const tmrN = N.st === 'soon' ? ['매일 밤 9시 · 너랑', '곧 공개돼요'] : N.st === 'first' || !w ? ['매일 밤 9시 · 너랑', `새 화 + 대화 ${DAY_FREE}번`] : [`밤 9시 · ${w.short}`, `${nx}화 「${epTitle(w, nx)}」`];
  return `<div class="hub" id="hub" data-done="${d}">
    <div class="hello"><div><small>${clock}</small><h1>${esc(hello)}</h1></div><span class="ring" aria-label="오늘 ${d}개 챙김">${ring}<span><b>${d}</b> / 3</span></span></div>
    ${gameCard(X, G0)}
    ${fortCard(X, F)}
    ${nrCard(X, N)}
    ${N.st === 'soon' || N.st === 'first' ? '' : lunchStrip(N)}
    <div class="hsec"><h3>내일도 여기서</h3><span>${st >= 7 ? `🔥 ${st}일 연속` : st ? `🔥 ${st}일 연속 · 7일째 선물` : '오늘 하나 하면 🔥 1일째'}</span></div>
    <div class="tmr"><div data-hub="tmr_game" data-hst="${fresh ? 'new' : 'ret'}" data-hgo="games" role="button" tabindex="0"><small>내일 0시 · 원어데이</small><b>${fresh ? '🆕 처음 만나는 게임' : '↺ 다시 만나는 게임'}</b><span data-cd>--:--:--</span></div><div data-hub="tmr_nr" data-hst="${N.st}" data-nr="" role="button" tabindex="0"><small>${esc(tmrN[0])}</small><b>${esc(tmrN[1])}</b><span data-cd9>${toNine()}</span></div></div>
  </div>`;
}

/* ── 늦게 오는 값 받기: 운세 엔진 · 너랑 작품 · 그림 목록 · 서버 시각/남은 횟수 · (점심 지난 뒤) 점심 쪽지 → 받을 때마다 redraw ── */
const did = () => { try { return localStorage.getItem('oad_did') || ''; } catch { return ''; } };
const ageNow = S => { if (S.age) return S.age; const me = ls('oad_fortune_me'); return me && me.y ? new Date().getFullYear() - me.y : 0; };
async function post(body) {
  const S = nrS();
  return fetch('/api/story', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ d: did(), age: ageNow(S) || 30, name: S.name || '하람', ...body }) });
}
export function load(X, redraw) {
  if (ls('oad_fortune_me') && !X.FT()) X.ft().then(redraw).catch(() => {});
  if (X.PROD) return;
  if (!NR.works) import('./neorang/works.js?v=0.99.4').then(m => { NR.works = m.WORKS; NR.soon = m.SOON; redraw(); }).catch(() => { NR.works = []; });
  if (!NR.artAsked) { NR.artAsked = 1; fetch('neorang/img/manifest.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : {})).then(m => { if (m && typeof m === 'object') { NR.art = m; redraw(); } }).catch(() => {}); }
  /* 서버 home: 1분에 한 번 · 밤 9시를 지나면 다시 */
  if (!NR.busy && (!NR.home || Date.now() - NR.at > 60e3 || now() >= NR.home.next9)) {
    NR.busy = true;
    post({ act: 'home' }).then(r => r.json().then(j => ({ r, j }))).then(({ r, j }) => {
      if (r.ok && typeof j.open === 'number') { NR.home = j; SKEW = j.now - Date.now(); }
      else NR.home = { open: localOpen(), next9: next9(), left: DAY_FREE, lunchOpen: false, off: 1 };
    }).catch(() => { NR.home = { open: localOpen(), next9: next9(), left: DAY_FREE, lunchOpen: false, off: 1 }; })
      .finally(() => { NR.busy = false; NR.at = Date.now(); redraw(); lunchFetch(X, redraw); });
  } else lunchFetch(X, redraw);
}
/* 점심 쪽지: 너랑 화면(nr.js lunch())과 같은 요청 · 같은 저장 모양 — 너랑 탭을 열기 전에도 허브 띠에 글이 보이게 (하루 한 번) */
function lunchFetch(X, redraw) {
  const N = nrSt(X); if (!N.ask || !N.w || NR.lunchAsk === period()) return;
  NR.lunchAsk = period();
  post({ act: 'lunch', w: N.w.id }).then(r => r.json().then(j => ({ r, j }))).then(({ r, j }) => {
    if (!r.ok || !j.text) return;
    const S = nrS(); if (S.lunch && S.lunch.day === period()) return;
    S.lunch = { day: period(), w: N.w.id, text: j.text, chips: j.chips || [], log: [], hist: [] };
    try { localStorage.setItem(NR_KEY, JSON.stringify(S)); } catch { /* */ }
    redraw();
  }).catch(() => {});
}
/* 1초마다: 밤 9시 카운트다운 · 시계 · 9시를 지나면 다시 받기 */
export function tick(X, redraw) {
  const t = toNine(); document.querySelectorAll('[data-cd9]').forEach(e => { e.textContent = t; });
  const n = X.R.now(), c = `${n.getHours()}시 ${n.getMinutes()}분`; document.querySelectorAll('[data-hclock]').forEach(e => { if (e.textContent !== c) e.textContent = c; });
  if (!X.PROD && NR.home && !NR.busy && now() >= NR.home.next9) load(X, redraw);
}
