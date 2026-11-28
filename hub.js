// 원어데이 첫 화면 「오늘」 허브 (2026-11-04 대표 "B가 좋아" · "4칸으로 하자" — 시안 lab/home-hub/b 의 4칸 안)
//   2026-11-26 대표 "3 피트니스": 그리기를 시안 lab/ui-apple/3 으로 바꿈 — 칭찬 + 링 세 겹 → 연속 기록 → 다음 할 일 → 이번 주 링 7개 → 내일도 여기서 (상태 셈은 그대로)
//   오늘의 게임 · 점방 · 너랑을 같은 크기 카드로 · 진행 링 0~3/3 · 칭찬 문구 · 점심 쪽지 띠 · '내일도 여기서' 예고 2칸
//   그 아래로 지금 게임 메인(이번 주 달력 · 진열장)을 이어 붙임 (app.js renderToday)
//   데이터: 게임 = rules.js 기록 · 점방 = fortune.js 계산(오늘 탭에서 연 날 = days()[오늘].f) · 너랑 = 이 기기 nr_v2 + /api/story {act:'home', v:2} (neorang/nr.js 와 같은 규칙)
//   너랑 카드 (2026-11-26 개편): 밤 9시 새 화 · 점심 쪽지 대신 '이어 하기 / 고르기' + 오늘 남은 무료 — 점심 띠 · 9시 카운트다운 코드는 남겨 둠(NR_SERIAL 다시 켜면)
//   상태 셈은 여기서만 · 그리기는 html() · 늦게 오는 값(운세 엔진 · 너랑 작품 · 서버 시각)은 load() 가 받아 두고 다시 그리기를 부름
const NR_KEY = 'nr_v2', LUNCH_MAX = 3, DAY_FREE = 30, NR_SERIAL = false;
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

import { ic, coin, rings } from './ui.js?v=0.99.107';
/* ── 새 화면 체계 (2026-11-26 시안 3 피트니스 · lab/ui-apple/3): 칭찬 + 링 세 겹 → 연속 기록 → 다음 할 일(안 닫힌 링부터) → 이번 주 링 7개 → 내일도 여기서 ── */
const KB = 'role="button" tabindex="0"';
const img = (X, src, cls = '', extra = '') => (src ? `<img class="${cls}" src="${X.webp ? X.webp(src) : src}" data-png="${src}" alt="" ${extra}>` : '');

/* 다 한 카드 (2026-11-26 대표 "완료처럼 아이콘이 사라지고 텍스트로만 보여 접근성이 떨어져"): 그림 · 체크 · 바로가기 단추를 남긴 작은 카드 — 점선 한 줄로 접지 않음
   k: g · f · n (색) · pic: 그림 칸 HTML · attrs: 카드 전체를 눌렀을 때(data-hub 등) · btn: [글, 단추에 붙일 data] */
const doneCard = (k, pic, attrs, eb, title, sub, btn) => `<article class="u-card u-todo u-row2 u-dn u-press" ${attrs} ${KB}><div class="u-dpic">${pic}<i class="u-ck ${k}" aria-hidden="true">${ic('check')}</i></div>
  <div class="u-lt"><span class="u-eb ${k}">${eb}</span><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div><span class="u-btn sm tint ${k}"${btn[1] ? ' ' + btn[1] : ''}>${btn[0]}</span></article>`;

/* ── 게임 ── */
function gameSt(X) {
  const { R, G } = X, id = R.todayId(), g = id && G(id), s = R.state(), today = R.keyOf(R.now()), lib = id && s.library[id];
  if (!g) return { st: 'none', done: false };
  const played = !!(lib && lib.last === today), n = lib && lib.td === today ? lib.tn || 1 : played ? 1 : 0;
  return { st: played ? 'done' : X.isNew ? 'new' : 'ret', done: played, id, g, n, streak: s.streak.count || 0 };
}
function gameCard(X, G0) {
  if (G0.st === 'none') return `<article class="u-card u-todo u-row2 u-press" data-hub="game" data-hst="none" ${KB}><i class="u-ti g">${ic('sun')}</i><div class="u-lt"><span class="u-eb g">오늘의 게임</span><b>게임은 곧 하나씩 열려요</b><span>준비가 끝난 게임부터 매일 하나씩 공개할게요</span></div></article>`;
  const { g, id } = G0;
  if (G0.done) return doneCard('g', `<div class="u-av sq u-ph">${img(X, g.icon, '', 'loading="lazy"')}</div>`, `data-hub="game" data-hst="done" data-play="${id}" data-from="hub" aria-label="${esc(g.title)} 한 판 더"`, '게임 · 다 했어요', esc(g.title), `오늘 ${G0.n}판 · 게임 링 닫힘`, [`${ic('play')}한 판 더`]);
  return `<article class="u-card u-todo u-press" data-hub="game" data-hst="${G0.st}" data-play="${id}" data-from="hub" ${KB} aria-label="오늘의 게임 ${esc(g.title)} 플레이">
    <div class="u-tp u-ph" data-vt>${img(X, g.cover, '', 'decoding="async"')}<span class="u-rb">게임 링 0/1</span></div>
    <div class="u-tb2"><div class="u-lt"><span class="u-eb g">오늘의 게임 · ${esc(g.time)}</span><b>${esc(g.title)}</b><span>한 판이면 게임 링이 채워져요</span></div><span class="u-btn sm fill g">${ic('play')}플레이</span></div></article>`;
}

/* ── 점방 (fortune.js 계산 그대로 · 엔진이 아직이면 이름 · 점수 없이) ── */
function fortSt(X) {
  const key = X.R.keyOf(X.R.now()), seen = !!((ls('oad_days') || {})[key] || {}).f, me = ls('oad_fortune_me');
  if (!me) return seen ? { st: 'yes', done: true, me: null, f: null, m: null, key } : { st: 'none', done: false };   /* 다른 기기에서 오늘 운세를 봄(계정 하루 기록) · 이 기기엔 점방 정보 없음 */
  const m = X.FT();
  const f = m ? m.fortune(me, X.R.now()) : null;
  return { st: seen ? 'yes' : 'no', done: seen, me, f, m, key };
}
function fortCard(X, F) {
  const c = F.f && F.m.CHARS[F.f.ch], art = c && c.art ? `fortune/char/${F.f.ch}.webp` : 'fortune/char/heukryeon.webp';
  if (F.st === 'yes') {
    /* 사업 B1: 홈에는 가격 없이 오늘 운세에서 이어지는 질문 한 줄만 (가격은 점방 시트에서) */
    const h = F.f && F.m.hookOf(F.f, F.key, X.bought(F.m, F.me)), PR = h && F.m.paidOf(h.id);
    return doneCard('f', `<div class="u-av u-ph"><img src="${art}" alt="" style="object-position:50% 12%"></div>`, `data-hub="fort" data-hst="yes" aria-label="점방 · 오늘 운세 다시 보기"`, '점방 · 다 했어요',
      c ? `${esc(c.name)} · ${F.f.total}점 · ${esc(F.f.key)}의 날` : '오늘 운세 봤어요', PR ? esc(PR.hook || PR.title) : '', PR ? ['풀이 보기', `data-paid="${h.id}"`] : ['다시 보기']);
  }

  const o = F.st === 'none'
    ? { k: '점방 · 오늘의 신점 · 매일 무료', q: '오늘 너를 읽어 줄 점쟁이가 기다린다', s: '생년월일만 넣으면 끝', go: '무료로 보기' }
    : { k: c ? `점방 · ${c.name}의 오늘의 신점` : '점방 · 오늘의 신점', q: `${esc(F.me.name)}, 오늘 네 하루를 읽어 뒀다`, s: '점수와 한 줄은 열어야 보여요', go: '열기' };
  return `<article class="u-card u-todo u-row2 u-press" data-hub="fort" data-hst="${F.st}" ${KB}><div class="u-av u-ph"><img src="${art}" alt="" style="object-position:50% 12%"></div>
    <div class="u-lt"><span class="u-eb f">${esc(o.k)}</span><b class="u-q">${o.q}</b><span>${o.s}</span></div><span class="u-btn sm fill f">${o.go}</span></article>`;
}

/* ── 너랑 (nr.js 의 상태 · 서버 home 값) ── */
const nrS = () => ls(NR_KEY) || ls('nr_v1') || {};
const nrW = id => (NR.works || []).find(w => w.id === id);
const nrArt = w => NR.art[w.id] || {};
const nrScene = (w, k, mood) => { const a = nrArt(w), sc = a.scenes || {}, pl = w.places || [], p = (pl[k] || pl[0] || {}).tag; return A(sc[`${w.id}_${p}_${mood}`] || a.cover || Object.values(sc)[0]); };
const nrAvatar = w => { const a = nrArt(w).avatar || {}; return A(a.smile || a.default || Object.values(a)[0]); };
const epTitle = (w, no) => (w.eps[no - 1] || {}).title || `${no}화`;
function nrSt(X) {
  if (X.NR_OFF) return { st: 'soon', done: false };   /* 실서버 너랑 공개 스위치(rules.js PROD_NR_OPEN)가 꺼져 있을 때만 */
  if (!NR_SERIAL) {   /* 끝없는 방: 마지막으로 이어 간 방 → 이어 하기 · 없으면 고르기 */
    /* 상태(링)는 이 기기 nr_v2 만으로 셈 — 작품 목록(works.js · 늦게 옴)은 카드 그림 · 글에만 씀
       (2026-11-27 대표 제보: 새로 열 때 첫 그림이 작품 목록 전이라 'first' → 링 2/3 → 다시 오면 3/3) */
    const S = nrS(), rooms = S.rooms || {}, wait = !(NR.works && NR.works.length);   /* 목록 전 · 못 받음 */
    const ids = Object.keys(rooms).filter(k => rooms[k] && rooms[k].turns > 0 && (wait || nrW(k))).sort((a, b) => (rooms[b].at || 0) - (rooms[a].at || 0));
    const w = nrW(ids[0] || S.lastW) || nrW('c17') || null;
    /* 다른 기기 · 그릇에서 오늘 이어 간 것(계정 하루 기록 oad_days.n · sync.js)도 오늘 링으로 */
    const dn = !!((ls('oad_days') || {})[X.R.keyOf(X.R.now())] || {}).n;
    if (!S.onboarded || S.v !== 2 || (!w && !wait)) return dn ? { st: 'done', done: true, w, rid: w ? w.id : '', r: null, left: (NR.home && NR.home.left) || { light: 60, free: 10 }, lunch: false, ask: false } : { st: 'first', done: false, w };
    const rid = w ? w.id : ids[0] || S.lastW || '', r = rooms[rid], left = (NR.home && NR.home.left) || { light: 60, free: 10 };
    const seenToday = !!S.seen && new Date(S.seen).toDateString() === new Date(now()).toDateString();
    const st = r && r.turns ? (seenToday || dn ? 'done' : 'cont') : dn ? 'done' : 'pick';
    return { st, done: st === 'done', w, rid, r, left, lunch: false, ask: false };
  }
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
const lastLine = r => { for (let i = ((r && r.log) || []).length - 1; i >= 0; i--) { const x = r.log[i]; if (x.k === 'ai' && !x.safe) { const y = (x.items || []).find(z => z.k === 'say'); if (y) return y.t; } } return ''; };
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
/* 너랑 한 번 값 · 광고 남은 번 (서버 home 값 · 없으면 가격표 기본 🪙2 · 하루 3번) */
const nrPrice = () => { const p = NR.home && NR.home.price; return (p && p.basic && p.basic.normal) || 2; };
const nrAdLeft = L => Math.max(0, ((L && L.adMax) || (NR.home && NR.home.price && NR.home.price.adMax) || 3) - ((L && L.ads) || 0));
function nrCard(X, N) {
  if (N.st === 'soon') return `<article class="u-card u-todo u-row2" data-hub="nr" data-hst="soon" ${KB}><i class="u-ti n">${ic('chat')}</i><div class="u-lt"><span class="u-eb n">너랑 · 너랑 쓰는 웹소설</span><b>곧 공개돼요</b><span>매일 밤 9시, 새 화 한 편과 그 사람과의 대화</span></div></article>`;
  const w = N.w, cover = w ? A(nrArt(w).cover) || nrScene(w, 0, 'smile') : '';
  const av = cover ? `<div class="u-av u-ph"><img src="${cover}" alt="" style="object-position:50% 14%"></div>` : `<i class="u-ti n">${ic('chat')}</i>`;
  const row = (st, k, q, s, go, link, extra = '') => `<article class="u-card u-todo u-row2 u-press${extra ? ' u-nrx' : ''}" data-hub="nr" data-hst="${st}" data-nr="${link}" ${KB}>${av}<div class="u-lt"><span class="u-eb n">${esc(k)}</span><b class="u-q">${q}</b><span>${s}</span>${extra}</div>${go ? `<span class="u-btn sm fill n">${go}</span>` : ''}</article>`;
  if (NR_SERIAL) {
    if (N.st === 'first' || !w) return row('first', '너랑 · 모든 화 무료', '읽고 나면, 그가 먼저 말을 건다', `1화는 3분 · 매일 밤 9시 새 화`, '고르기', '');
    if (N.st === 'open') return row('open', `너랑 · ${w.short} · ${N.open}화`, `「${esc(epTitle(w, N.open))}」`, `대화 ${N.left}번 ${N.left >= DAY_FREE ? '새로' : '남음'}`, '읽기', `read/${w.id}/${N.read0 ? 1 : N.open}`);
    return row(N.st, `너랑 · ${w.short}`, `「${esc(epTitle(w, N.open + 1))}」`, `오늘 밤 9시 · <span data-cd9>${toNine()}</span>`, '', `work/${w.id}`);
  }
  if (N.st === 'first') return row('first', '너랑 · 내가 들어가는 이야기', '고르면 바로 시작, 끝나지 않는 이야기', '가벼운 대화 하루 60번 무료', '고르기', '');
  /* 작품 목록이 아직(새로 연 직후 잠깐): 상태 · 링은 맞게, 카드는 글만 — 목록이 오면 다시 그림 */
  if (!w) {
    const link = N.rid ? (N.st === 'pick' ? `w/${N.rid}` : `room/${N.rid}`) : '';
    if (N.done) return doneCard('n', `<i class="u-ti n">${ic('chat')}</i>`, `data-hub="nr" data-hst="done" data-nr="${link}" aria-label="너랑 이어 하기"`, '너랑 · 오늘 이어 갔어요', '이어 가던 이야기', '', ['이어 하기']);
    return row(N.st, '너랑', N.st === 'pick' ? '고르던 이야기' : '이어 가던 이야기', '이야기를 불러오는 중이에요', N.st === 'pick' ? '작품 보기' : '이어 하기', link);
  }
  if (N.st === 'pick') return row('pick', `너랑 · ${w.short}`, `「${esc(w.title)}」`, esc(w.hook || '고르면 바로 시작'), '작품 보기', `w/${w.id}`);
  const l = lastLine(N.r), q = l ? `“${esc(clip(l, 44))}”` : `${esc(w.ch.short)}${josa(w.ch.short, '이', '가')} 기다려요`, L = N.left || {};
  /* 사업 A4: 오늘 무료를 다 쓴 뒤에도 장면 대사는 그대로 · 두 길 [광고 보고 +5] · [🪙2로 이어 하기] — 골드가 모자라면(첫 구매 전 포함) 이어 하기가 골드 시트를 엶 */
  if (L.free === 0 && !(L.ad > 0)) {
    const ad = X.nrAd && nrAdLeft(L) > 0, p = nrPrice(), enough = X.gold != null && X.gold >= p;
    const two = `<span class="u-two">${ad ? `<button class="u-btn sm tint n" type="button" data-hub="nr" data-hst="ad" data-nr="room/${w.id}/charge">${ic('tv')}광고 보고 +5</button>` : ''}${enough ? `<button class="u-btn sm fill n" type="button" data-hub="nr" data-hst="gold" data-nr="room/${w.id}">${coin(14)}${p}로 이어 하기</button>` : `<button class="u-btn sm fill n" type="button" data-hub="nr_gold" data-hst="${X.first ? 'first' : 'short'}" data-shop="nr">${coin(14)}${p}로 이어 하기</button>`}</span>`;
    return row('out', `너랑 · ${w.short}`, q, `오늘 무료 다 썼어요 · 밤 9시에 다시 ${(NR.home && NR.home.price && NR.home.price.freeDay) || 10}번`, '', `room/${w.id}`, two);
  }
  if (N.done) return doneCard('n', cover ? `<div class="u-av u-ph"><img src="${cover}" alt="" style="object-position:50% 14%"></div>` : `<i class="u-ti n">${ic('chat')}</i>`, `data-hub="nr" data-hst="done" data-nr="room/${w.id}" aria-label="너랑 ${esc(w.title)} 이어 하기"`, `너랑 · ${esc(w.short)} · 오늘 이어 갔어요`, q, L.free != null ? `오늘 무료 ${L.free}번 남음${L.ad > 0 ? ` · 보너스 ${L.ad}번` : ''}` : '', ['이어 하기']);
  return row('cont', `너랑 · ${w.short}`, q, L.free === 0 ? `보너스 무료 ${L.ad}번 남음` : `오늘 무료 ${L.free != null ? L.free : 10}번 남음${L.ad > 0 ? ` · 보너스 ${L.ad}번` : ''}`, '이어 하기', `room/${w.id}`);
}
function lunchStrip(N) {
  if (!N.lunch && !N.ask) return '';
  const w = N.lun ? nrW(N.lun.w) || N.w : N.w, av = nrAvatar(w), txt = N.lun ? `“${esc(N.lun.text)}”` : '낮 12시, 먼저 보낸 쪽지가 있어요';
  return `<article class="u-card u-todo u-row2 u-press" data-hub="lunch" data-hst="new" data-nr="lunch" ${KB}>${av ? `<div class="u-av u-ph"><img src="${av}" alt=""></div>` : ''}<div class="u-lt"><span class="u-eb n">${esc(w.ch.short)}의 점심 쪽지</span><b class="u-q">${txt}</b><span>답장 ${LUNCH_MAX}번</span></div></article>`;
}

/* ── 지금 상태 셋 (기록 · 탭 점에도 씀) ── */
export function states(X) { return { g: gameSt(X), f: fortSt(X), n: nrSt(X) }; }
export const nrDot = X => { const N = nrSt(X); return N.st === 'open' || N.lunch; };   /* 끝없는 방에서는 'open' 이 없음 — 새 화 점 없음 */
/* 너랑 이어 하기 목록 (보관함 '이어 하기' — 최근 순) */
export function nrRooms() {
  if (!NR.works) return [];
  const rooms = nrS().rooms || {};
  return Object.keys(rooms).filter(k => rooms[k] && rooms[k].turns > 0 && nrW(k)).sort((a, b) => (rooms[b].at || 0) - (rooms[a].at || 0)).map(k => { const w = nrW(k); return { w, r: rooms[k], cover: A(nrArt(w).cover) || nrScene(w, 0, 'smile'), line: lastLine(rooms[k]) }; });
}
/* 너랑 링을 날마다 남김 (이번 주 링 7개 · 게임 = history · 점방 = oad_days.f 와 같은 칸에 n) */
function markNr(X) { try { const k = X.R.keyOf(X.R.now()), all = ls('oad_days') || {}; if ((all[k] || {}).n) return; all[k] = { ...(all[k] || {}), n: 1 }; localStorage.setItem('oad_days', JSON.stringify(all)); } catch { /* */ } }
const WK = ['월', '화', '수', '목', '금', '토', '일'];
function week(X, today3) {
  const { R } = X, n = R.now(), dow = (n.getDay() + 6) % 7, hist = R.state().history || {}, days = ls('oad_days') || {}, di = R.dayIndex();
  return WK.map((w, k) => {
    const off = k - dow, d = new Date(n.getFullYear(), n.getMonth(), n.getDate() + off), key = R.keyOf(d), lab = `<b>${off === 0 ? '오늘' : w}</b>`;
    if (off > 0) return `<div class="u-wr"><div class="u-rings u-empty" style="width:36px;height:36px"></div>${lab}</div>`;
    const v = off === 0 ? today3 : [hist[key] ? 1 : 0, (days[key] || {}).f ? 1 : 0, (days[key] || {}).n ? 1 : 0];
    const gid = off < 0 && di + off >= 0 ? R.gameOn(di + off) : null;
    return `<div class="u-wr${off === 0 ? ' now' : ''}"${gid ? ` data-open="${gid}" ${KB} aria-label="${w}요일 · ${esc(X.G(gid).title)}"` : ''}>${rings(36, 4, 1.5, v, 'wk' + key)}${lab}</div>`;
  }).join('');
}
/* ── 출석판 (2026-11-26 대표): 7칸 · 들어온 날 기준 · 하루 한 번(서버 story act 'att' 가 판단 · 계정 · 기기 · KST) · 보상은 소비성(너랑 무료 +N · 게임 하루 열기권) ──
   '연속 기록' 숫자(rules.js streak · 주 1회 쉬는 날)와 따로 감 · 서버에 닿지 못하면 칸만 보이고 받기는 숨김 */
const ATT = { st: null, at: 0, busy: false, fail: false, who: '' };
export const attNow = () => ATT.st;
const attTxt = c => [c.nr ? `너랑 무료 +${c.nr}` : '', c.tk ? `하루 열기 ${c.tk}장` : ''].filter(Boolean).join(' · ');
function attLoad(redraw, force) {
  if (ATT.who !== who()) force = true;   /* 계정이 생기거나 바뀌면 바로 다시 (기기 기준 → 계정 기준) */
  if (ATT.busy || (!force && ATT.st && Date.now() - ATT.at < 60e3)) return;
  ATT.busy = true; ATT.who = who();
  post({ act: 'att' }).then(r => r.json()).then(j => { if (j && j.state) { ATT.st = j.state; ATT.fail = false; } else ATT.fail = true; }).catch(() => { ATT.fail = true; }).finally(() => { ATT.busy = false; ATT.at = Date.now(); redraw(); });
}
/* 오늘 칸 받기 → { ok, got:{cell, nr, tk}, state } · 이미 받았으면 { ok:false, already } */
export async function attClaim() {
  const r = await post({ act: 'att', sub: 'claim' }), j = await r.json().catch(() => ({}));
  if (j && j.state) { ATT.st = j.state; ATT.at = Date.now(); }
  if (j && j.ok && j.got && j.got.nr) NR.at = 0;   /* 너랑 남은 무료를 다시 받게 */
  return r.ok ? j : { ok: false, already: !!(j && j.already), error: (j && j.error) || '잠시 뒤 다시 눌러 주세요' };
}
/* 연속 기록 카드: 연속 N일(쉬는 날 · 놓친 날 광고 보충) + 출석판 7칸 (오늘 칸을 누르면 받음 · 7칸째 = 큰 선물) */
function streakCard(X) {
  const { R } = X, c = R.state().streak.count || 0, A0 = ATT.st, cells = (A0 && A0.cells) || [];
  const left = A0 ? 7 - A0.cell : 0;
  const gift = !A0 ? '7칸째 선물' : A0.done && A0.cell === 7 ? '선물 받음' : !A0.done && left === 0 ? '오늘 선물' : `${A0.done ? left : left + 1}번 더 오면 선물`;
  const step = i => {
    const on = A0 && i <= A0.got, now = A0 && !A0.done && i === A0.cell, cls = `${on ? 'on' : ''}${i === 7 ? ' gf' : ''}${now ? ' now' : ''}`;
    return now ? `<button class="${cls}" type="button" data-att-claim aria-label="오늘 출석 ${i}칸 받기 · ${attTxt(cells[i - 1] || {})}"><span class="u-num">받기</span></button>` : `<i class="${cls}" aria-hidden="true"><span class="u-num">${i}</span></i>`;
  };
  const nx = A0 ? (A0.done ? (A0.cell % 7) + 1 : A0.cell) : 0, rest = R.restLeft && R.restLeft() ? ' · 이번 주 쉬는 날 1번 남음' : '';
  const note = !A0 ? `${ATT.fail ? '인터넷에 연결되면 출석판이 열려요' : '출석판을 불러오는 중이에요'}${rest}` : A0.done ? `오늘 받았어요 · 다음 ${nx}칸: ${attTxt(cells[nx - 1] || {})}${rest}` : `오늘 ${nx}칸: ${attTxt(cells[nx - 1] || {})} · 칸을 눌러 받아요`;
  const tk = R.tickets ? R.tickets() : 0;
  const fill = X.fill ? `<button class="u-fillrow" type="button" data-stampfill data-blk="stamp">${ic('tv')}<span>어제를 놓쳤어요 · 광고 보고 연속 이어 가기</span>${ic('chev')}</button>` : '';
  return `<section class="u-card u-streak" data-blk="streak">
    <div class="u-sk"><span class="u-fl">${ic('flame')}</span><div><b class="u-num">${c}일</b><span>${c ? '연속으로 왔어요' : '오늘부터 시작해요'}</span></div><span class="u-gift">${ic('gift')}<small>${gift}</small></span></div>
    <div class="u-steps" aria-label="출석판 ${A0 ? A0.got : 0}칸 받음 · 7칸">${[1, 2, 3, 4, 5, 6, 7].map(step).join('')}</div>
    <p class="u-sknote">${note}</p>${tk ? `<button class="u-fillrow" type="button" data-hgo="games" data-hub="tk" data-hst="${tk}">${ic('ticket')}<span>하루 열기권 ${tk}장 · 잠긴 게임 하나를 오늘 열어요</span>${ic('chev')}</button>` : ''}${fill}</section>`;
}

/* ── 허브 한 덩어리 (#hub — 늦게 온 값으로 이 덩어리만 다시 그림) ── */
export function html(X) {
  const { g: G0, f: F, n: N } = states(X);
  if (N.done) markNr(X);
  /* 진행 링: 오늘 할 수 있는 것만 셈 — 실서버에서 게임이 아직 없거나(none) 너랑이 곧 공개(soon)면 분모에서 뺌 (테스트 · 개발은 늘 3) */
  const can = [G0.st === 'none' ? null : G0, F, N.st === 'soon' ? null : N].filter(Boolean), tot = can.length, d = can.filter(x => x.done).length;
  const name = (F.me && F.me.name) || nrS().name || '';
  const hello = X.isNew && !d ? '오늘은 하나만 골라도 좋아요' : d === tot ? `${name ? esc(name) + ', ' : ''}오늘 다 챙겼어요` : d ? `${name ? esc(name) + ', ' : ''}잘하고 있어요` : name ? `${esc(name)}의 오늘` : '오늘의 세 가지';
  const sub = d === tot ? '링을 모두 닫았어요 · 내일 0시에 새로 시작돼요' : !d ? '하나만 해도 오늘의 링이 움직여요' : (d + 1) / tot > .5 && d / tot <= .5 ? '하나만 더 하면 오늘의 절반을 넘어요' : `${tot - d}개 남았어요 · 다 닫으면 오늘 완성`;
  const c = F.f && F.m.CHARS[F.f.ch];
  const lg = [
    ['g', '게임', G0, G0.st === 'none' ? '곧 열려요' : G0.done ? `${G0.g.title} · 오늘 ${G0.n}판` : `${G0.g.title} 한 판`],
    ['f', '점방', F, F.st === 'none' ? '생년월일만 넣으면 무료' : F.done ? (F.f ? `오늘 운세 ${F.f.total}점 · 봤어요` : '오늘 운세 봤어요') : `${c ? c.name + '의 ' : ''}오늘 운세 열기`],
    ['n', '너랑', N, N.st === 'soon' ? '곧 공개돼요' : N.st === 'first' ? '첫 이야기 고르기' : !N.w ? (N.done ? '오늘 이어 갔어요' : N.st === 'pick' ? '이야기 고르기' : '한 장면 이어 가기') : N.done ? `${N.w.ch.short}${josa(N.w.ch.short, '와', '과')} 오늘 이어 갔어요` : `${N.w.ch.short}${josa(N.w.ch.short, '와', '과')} 한 장면 이어 가기`],
  ].map(([k, t, x, s]) => `<div class="u-lg ${k}${x.done ? ' d' : ''}"><i></i><div><b>${t} <span class="u-num">${x.done ? 1 : 0}/1</span></b><small>${esc(s)}</small></div></div>`).join('');
  const v3 = [G0.done ? 1 : 0, F.done ? 1 : 0, N.done ? 1 : 0];
  /* 다음 할 일 (사업 B4): 안 닫힌 링 순서(게임 · 점방 · 너랑) → 무료를 다 쓴 너랑 → 다 한 것은 점선 한 줄로 */
  const cards = [[G0, gameCard(X, G0)], [F, fortCard(X, F)], [N, nrCard(X, N)]];
  const nrOut = !NR_SERIAL && N.left && N.left.free === 0 && !(N.left.ad > 0) && N.st !== 'first' && N.st !== 'pick' && N.st !== 'soon';
  const todo = [...cards.filter(([x]) => !x.done && !(x === N && nrOut)), ...cards.filter(([x]) => x === N && nrOut), ...cards.filter(([x]) => x.done && !(x === N && nrOut))].map(([, h]) => h).join('');
  const tg = X.R.gameOn(X.R.dayIndex() + 1), fresh = tg && !X.R.state().library[tg];
  const tmrN = N.st === 'soon' ? ['너랑 · 곧 공개돼요', '매일 밤 9시'] : NR_SERIAL && N.w && N.st !== 'first' ? [`너랑 · ${N.open + 1}화`, `밤 9시 · ${N.w.short}`] : [`너랑 무료 ${(NR.home && NR.home.price && NR.home.price.freeDay) || 10}번 다시`, '밤 9시'];
  return `<div class="u-hub" id="hub" data-done="${d}">
    <div class="u-ca">
    <section class="u-card u-sum" data-blk="sum" aria-label="오늘 ${d}개 챙김 · ${tot}개 중">
      <div class="u-praise"><h2 class="t-title">${hello}</h2><p class="t-sub">${sub}</p></div>
      <div class="u-sumb">${rings(148, 16, 3, v3, 'sum')}<div class="u-lgs">${lg}</div></div>
    </section>
    ${streakCard(X)}
    </div><div class="u-cb2">
    <div class="u-sh"><h3 class="t-title">다음 할 일</h3><span class="t-sub">안 한 것부터</span></div>
    ${todo}
    ${N.st === 'soon' || N.st === 'first' ? '' : lunchStrip(N)}
    </div><div class="u-cc">
    <div class="u-sh"><h3 class="t-title">이번 주</h3><button class="u-lnk" type="button" data-tab-go="box">기록 보기</button></div>
    <section class="u-card u-weekr" data-blk="week">${week(X, v3)}</section>
    <div class="u-sh"><h3 class="t-title">내일도 여기서</h3></div>
    <section class="u-card u-tmr">
      ${tg ? `<div class="u-row u-press" data-hub="tmr_game" data-hst="${fresh ? 'new' : 'ret'}" data-hgo="games" ${KB}><i class="u-ti g">${ic('sun')}</i><div class="u-lt"><b>${fresh ? '처음 만나는 게임' : '다시 만나는 게임'}</b><span>내일 0시 · 링이 새로 시작돼요</span></div><span class="u-cd u-num" data-cd>--:--:--</span></div>`
    : `<div class="u-row u-press" data-hub="tmr_fort" data-hst="tmr" ${KB}><i class="u-ti f">${ic('moon')}</i><div class="u-lt"><b>내일의 신점</b><span>내일 0시 · 점방</span></div><span class="u-cd u-num" data-cd>--:--:--</span></div>`}
      <div class="u-row u-press" data-hub="tmr_nr" data-hst="${N.st}" data-nr="" ${KB}><i class="u-ti n">${ic('chat')}</i><div class="u-lt"><b>${esc(tmrN[0])}</b><span>${esc(tmrN[1])}</span></div><span class="u-cd u-num" data-cd9>${toNine()}</span></div>
    </section></div>
  </div>`;
}

/* ── 늦게 오는 값 받기: 운세 엔진 · 너랑 작품 · 그림 목록 · 서버 시각/남은 횟수 · (점심 지난 뒤) 점심 쪽지 → 받을 때마다 redraw ── */
const did = () => { try { return localStorage.getItem('oad_did') || ''; } catch { return ''; } };
const ageNow = S => { if (S.birth) return new Date().getFullYear() - S.birth; if (S.age) return S.age; const me = ls('oad_fortune_me'); return me && me.y ? new Date().getFullYear() - me.y : 0; };
/* 셸 계정 표(구글 · 원스토어 세션 · 연결 표)를 붙임 — 출석판 · 너랑 무료가 기기 말고 계정 기준 (11-27 QA R1 · R4) · 계정이 아직 없으면 기기 번호만 */
const acct = () => { try { const A = window.__oadAcct; return A && A.current && A.current() ? A : null; } catch { return null; } };
const who = () => { const A = acct(); return A ? String(A.current().id || '') : ''; };
async function post(body) {
  const S = nrS(), A = acct(), t = A ? await Promise.resolve(A.token()).catch(() => '') : '';
  return fetch('/api/story', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify({ d: did(), age: ageNow(S) || 30, name: S.name || '하람', ...body }) });
}
export function load(X, redraw) {
  if (ls('oad_fortune_me') && !X.FT()) X.ft().then(redraw).catch(() => {});
  attLoad(redraw);
  if (X.NR_OFF) return;
  if (!NR.works) Promise.all([import('./neorang/works.js?v=0.99.107'), import('./neorang/works2.js?v=0.99.107').catch(() => ({ WORKS2: [] }))]).then(([m, m2]) => { const ids = new Set((m2.WORKS2 || []).map(x => x.id)); NR.works = [...m.WORKS.filter(w => !ids.has(w.id)), ...(m2.WORKS2 || [])]; NR.soon = m.SOON; redraw(); }).catch(() => { NR.works = []; });
  if (!NR.artAsked) { NR.artAsked = 1; fetch('neorang/img/manifest.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : {})).then(m => { if (m && typeof m === 'object') { NR.art = m; redraw(); } }).catch(() => {}); }
  /* 서버 home: 1분에 한 번 · 밤 9시를 지나면 다시 */
  if (!NR.busy && (!NR.home || Date.now() - NR.at > 60e3 || (NR_SERIAL && now() >= NR.home.next9))) {
    NR.busy = true;
    post(NR_SERIAL ? { act: 'home' } : { act: 'home', v: 2 }).then(r => r.json().then(j => ({ r, j }))).then(({ r, j }) => {
      if (r.ok && (typeof j.open === 'number' || j.v === 2)) { NR.home = j; if (j.now) SKEW = j.now - Date.now(); }
      else NR.home = { open: localOpen(), next9: next9(), left: DAY_FREE, lunchOpen: false, off: 1 };
    }).catch(() => { NR.home = { open: localOpen(), next9: next9(), left: DAY_FREE, lunchOpen: false, off: 1 }; })
      .finally(() => { NR.busy = false; NR.at = Date.now(); redraw(); if (NR_SERIAL) lunchFetch(X, redraw); });
  } else if (NR_SERIAL) lunchFetch(X, redraw);
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
  if (!X.NR_OFF && NR.home && !NR.busy && now() >= NR.home.next9) load(X, redraw);
}
