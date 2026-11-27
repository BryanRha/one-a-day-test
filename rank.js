// 공통 랭킹 셸 쪽 (2026-11-27 운영 · team/dev/tasks/261127-ranking/intent.md 6장 · 시안 mock/ · 사업 bm.md)
//   순위표 시트(이번 주 · 지난주 · 내 기록) · 순위 이름 시트 · 홈 상단 전광판(6-1) · 게임 상세 두 줄 · 점방 '오늘의 대박' · 너랑 '오늘 많이 본 작품' · 마감 보상 받기 창 · 오프라인 보관
//   서버: /api/me — GET ?rank=<판>|top3|today (CDN 캐시 · 로그인 없음) · POST act 'rank'(start · submit · mine · gifts · claim) · 'nick'
//   광고 · 결제 단추는 이 화면들에 두지 않음 (사업 bm.md 4-1 — 자랑하는 자리)
//   app.js 가 init(ctx) 로 시트 · 토스트 · 계정 · 기록 함수를 넘겨 줌 (아래 보관 줄 함수는 ctx 없이도 동작 — tools/rank_check.mjs 가 node 에서 시험)
import { ic, coin } from './ui.js?v=0.99.82';

/* ── 오프라인 보관 (판마다 마지막 제출 하나 · 다시 연결되면 한 번 · 마감 + 10분 지나면 버림) ── */
const KQ = 'oad_rank_q', GRACE = 10 * 60e3;
const ls = () => (typeof localStorage !== 'undefined' ? localStorage : null);
export function pending() { try { return JSON.parse(ls().getItem(KQ) || '[]') || []; } catch { return []; } }
const keep = list => { try { if (list.length) ls().setItem(KQ, JSON.stringify(list.slice(-12))); else ls().removeItem(KQ); } catch { /* */ } };
/* send(body) → 서버 응답 · 연결이 안 되면 throw (응답이 오면 거절이어도 보관하지 않음) */
export async function submitSafe(send, body, { now = Date.now(), end = 0 } = {}) {
  const b = { ...body, t0: body.t0 || now };
  try { return await send(b); }
  catch {
    keep([...pending().filter(x => x.body.board !== b.board), { body: b, end: end || now + 7 * 864e5, at: now }]);
    return { ok: false, reason: 'offline', kept: true };
  }
}
export async function flush(send, { now = Date.now() } = {}) {
  let sent = 0, dropped = 0; const left = [];
  for (const x of pending()) {
    if (now > x.end + GRACE) { dropped++; continue; }
    try { await send(x.body); sent++; } catch { left.push(x); }
  }
  keep(left);
  return { sent, dropped };
}

/* ── 숫자 · 글 ── */
const fmt = n => Number(n || 0).toLocaleString('ko-KR');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DIFF = { easy: '쉬움', normal: '보통', hard: '어려움' };
export function left(end, now = Date.now()) {
  const s = Math.max(0, end - now), d = Math.floor(s / 864e5), h = Math.floor((s % 864e5) / 3600e3), m = Math.floor((s % 3600e3) / 60e3);
  return d ? `${d}일 ${h}시간 남음` : h ? `${h}시간 ${m}분 남음` : `${m}분 남음`;
}
/* 결과 줄 글 (게임이 그리는 한 줄 · SDK bm.rank.line 과 같은 규칙 — bm.md 1-3 원칙: 100위 안 = 등수 · 그 밖 = 구간 · 아래 절반 = 지난주의 나) */
export function lineOf(r, prevBest = 0) {
  if (!r || !r.ok) return null;
  if (r.review) return { title: '기록을 확인하고 있어요', sub: '확인되면 순위에 보여요' };
  const nb = r.newBest ? '개인 최고 갱신' : '';
  const title = r.rank ? `이번 주 ${fmt(r.rank)}위` : r.tier ? `상위 ${r.tier}% 안` : `이번 주 내 최고 ${fmt(r.best)}`;
  const next = r.next && r.next.gap > 0 ? `${fmt(r.next.gap)}점 더면 상위 ${r.next.tier}%` : '';
  const sub = [r.rank && r.tier ? `상위 ${r.tier}% 안` : '', nb, next, !r.rank && !r.tier && prevBest && r.best > prevBest ? `지난주보다 +${fmt(r.best - prevBest)}` : ''].filter(Boolean).slice(0, 2).join(' · ');
  return { title, sub: sub || '순위표에서 이번 주 기록을 볼 수 있어요' };
}

/* ── 서버 ── */
let X = null;   /* app.js 가 넘긴 것: { openSheet, closeSheet, toast, A, T, G, R, img, needLogin, isPC, sheetOpen, tab } */
const CACHE = new Map();
async function getJ(q, ttl) {
  const k = new URLSearchParams(q).toString(), c = CACHE.get(k);
  if (c && Date.now() - c.at < ttl) return c.j;
  const j = await fetch('/api/me?' + k).then(r => (r.ok ? r.json() : null)).catch(() => null);
  if (j) CACHE.set(k, { j, at: Date.now() });
  return j || (c && c.j) || null;
}
const post = async body => { const t = X && X.A.current() ? await X.A.token().catch(() => '') : ''; if (!t) return { ok: false, reason: 'login' }; const r = await fetch('/api/me', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(body) }); return r.json().catch(() => ({ ok: false, reason: 'error' })); };
/* 제출 보내기: 연결 실패만 throw (보관 줄로) */
async function sendNow(body) {
  const t = await X.A.token().catch(() => ''); if (!t) return { ok: false, reason: 'login' };
  const r = await fetch('/api/me', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ act: 'rank', sub: 'submit', ...body }) });
  return r.json().catch(() => ({ ok: false, reason: 'error' }));
}
export const boardGet = (board, p = '') => getJ(p ? { rank: board, p } : { rank: board }, 30e3);
export const top3 = (ttl = 60e3) => getJ({ rank: 'top3' }, ttl);
export const today = (ttl = 300e3) => getJ({ rank: 'today' }, ttl);
let TOP = null, TODAY = null;
export const peekTop = () => TOP, peekToday = () => TODAY;
export function warm(redraw, ttl) {
  /* 값이 그대로여도 전광판이 아직 숨어 있으면 다시 그림 (여러 번 부른 warm 중 먼저 온 값으로 그린 때 홈이 아직 없었으면 영영 숨던 것) */
  const hid = () => { const el = typeof document !== 'undefined' && document.getElementById('rkTicker'); return !!(el && el.hidden); };
  top3(ttl).then(j => { const was = JSON.stringify(TOP); TOP = j && j.ok ? j : TOP; if (redraw && (JSON.stringify(TOP) !== was || hid())) redraw('top'); });
  today(ttl).then(j => { const was = JSON.stringify(TODAY); TODAY = j && j.ok ? j : TODAY; if (redraw && (JSON.stringify(TODAY) !== was || hid())) redraw('today'); });
}

/* ── 게임 쪽 요청 (app.js gameReq 가 넘김): start · submit · open · mine ── */
export async function fromGame(gid, sub, a) {
  const board = boardOf(gid, a.board);
  if (!board) return { ok: false, reason: 'board' };
  if (sub === 'open') { openBoard(board, { from: 'game' }); return { ok: true }; }
  if (!X.A.current()) return { ok: false, reason: 'login' };
  if (sub === 'start') return post({ act: 'rank', sub: 'start', board });
  if (sub === 'mine') return post({ act: 'rank', sub: 'mine', board });
  if (sub === 'submit') {
    const o = a.opt || {}, body = { board, score: Math.floor(Number(a.score) || 0), tie: Math.floor(Number(o.tie) || 0), run: o.run, meta: o.meta, inputs: o.inputs, assisted: !!o.assisted };
    const r = await submitSafe(sendNow, body, { end: endOf() });
    return afterSubmit(gid, board, r);
  }
  return { ok: false, reason: 'sub' };
}
/* 옛 v2 (bm.submitScore): 판 = 게임 id · 응답 모양 { ok, best, rank, week } */
export async function fromLegacy(gid, score, assisted) {
  if (!X.A.current()) return { ok: false, reason: 'login' };
  const r = await submitSafe(sendNow, { board: gid, score: Math.floor(Number(score) || 0), assisted: !!assisted }, { end: endOf() });
  const o = afterSubmit(gid, gid, r);
  return o.ok ? { ...o, week: o.period } : o;
}
const endOf = () => (TOP && TOP.end) || 0;
/* 판 이름: 게임이 넘긴 것은 그 게임 판만 (다른 게임 판에 쓰지 못하게) */
function boardOf(gid, b) {
  const s = String(b || gid);
  if (s === gid) return s;
  if (s.startsWith(gid + ':') && /^[a-z0-9:_-]{2,40}$/.test(s)) return s;
  return null;
}
function afterSubmit(gid, board, r) {
  if (r && r.reason === 'offline') X.T.track('rank_offline', { what: 'keep', board, game: gid });
  if (r && r.ok) {
    CACHE.forEach((v, k) => { if (k.includes(encodeURIComponent(board)) || k.includes('top3')) CACHE.delete(k); });
    if (r.nickNew) setTimeout(() => nickAsk('first'), 1400);   /* 처음 순위에 오를 때 한 번: '순위에 보일 이름' (자동 이름이 이미 들어 있음) */
  }
  return r || { ok: false, reason: 'error' };
}
/* 다시 연결 · 앱 열 때: 보관한 제출을 한 번 보냄 */
export async function resend() {
  if (!X || !X.A.current() || !pending().length) return;
  const r = await flush(sendNow);
  if (r.sent) X.T.track('rank_offline', { what: 'send', n: r.sent });
  if (r.dropped) { X.T.track('rank_offline', { what: 'drop', n: r.dropped }); X.toast('마감이 지나 개인 기록에만 남겼어요'); }
}

/* ── 순위표 시트 ── */
const S = { board: '', tab: 'now', data: {}, mine: null, more: false };
const gameOf = board => board.split(':')[0];
/* 게임 안 한 모드 판의 이름 · 점수 단위 (11-27 랭킹 2차 — 판 이름은 server/api/_lib/rank.js RANK 와 같게) */
const MODE = { 'fdefense:inf': '이번 주 무한 전장', 'ocean:weekly': '이번 주 도전', 'salvage:weekly': '주간 도전', 'war:week': '주간 작전' };
const UNIT = { 'fdefense:inf': '웨이브' };
const sc = (board, n) => fmt(n) + (UNIT[board] ? ' ' + UNIT[board] : '');
const titleOf = board => { const g = X.G(gameOf(board)); const m = /^rhythm:(s\d\d):(\w+)$/.exec(board); return (g ? g.title : gameOf(board)) + (m ? ` · 이번 주의 곡 ${DIFF[m[2]] || ''}` : MODE[board] ? ` · ${MODE[board]}` : ''); };
export async function openBoard(board, { from = 'app' } = {}) {
  S.board = board; S.tab = 'now'; S.more = false; S.data = {}; S.mine = null;
  X.T.track('rank_view', { where: from, board, game: gameOf(board) });
  X.openSheet(sheetHTML(), 'u full');
  const [now, mine] = await Promise.all([boardGet(board), X.A.current() ? post({ act: 'rank', sub: 'mine', board }) : null]);
  S.data.now = now; S.mine = mine && mine.ok ? mine : null;
  redrawSheet();
  if (now && now.period) boardGet(board, prevOf(now.period)).then(j => { S.data.prev = j; if (S.tab === 'prev') redrawSheet(); });
}
const prevOf = p => { const [y, w] = p.split('-W').map(Number); if (w > 1) return `${y}-W${String(w - 1).padStart(2, '0')}`; const d = new Date(Date.UTC(y, 0, 4)); d.setUTCDate(d.getUTCDate() - 7); const t = new Date(d); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); const yy = t.getUTCFullYear(); return `${yy}-W${String(Math.ceil(((t - Date.UTC(yy, 0, 1)) / 864e5 + 1) / 7)).padStart(2, '0')}`; };
function redrawSheet() { const el = document.querySelector('#sheet .panel .rk'); if (el) el.outerHTML = body(); }
const medal = r => `<span class="rk-n${r <= 3 ? ' m' + r : ''} u-num">${r}</span>`;
const row = (x, me) => `<div class="rk-row${me ? ' me' : ''}">${medal(x.rank)}<span class="rk-nm">${esc(x.nick)}${x.tag ? ` <small>${esc(x.tag)}</small>` : ''}${me ? ' <b>(나)</b>' : ''}</span><span class="rk-sc u-num">${sc(S.board, x.score)}</span></div>`;
function sheetHTML() { return body(); }
function body() {
  const d = S.tab === 'prev' ? S.data.prev : S.data.now, m = S.mine;
  const head = S.tab === 'prev' ? '지난주 순위' : S.tab === 'me' ? '내 기록' : '이번 주 순위';
  const sub = !d ? '불러오는 중이에요' : S.tab === 'prev' ? `참가 ${fmt(d.total)}명 · 마감한 순위` : `참가 ${fmt(d.total)}명 · 일요일 밤 12시 마감 (${left(d.end)})`;
  const seg = [['now', '이번 주'], ['prev', '지난주'], ['me', '내 기록']].map(([k, t]) => `<button type="button" role="tab" aria-selected="${S.tab === k}" class="${S.tab === k ? 'on' : ''}" data-rk-tab="${k}">${t}</button>`).join('');
  let list = '';
  if (S.tab === 'me') list = meHTML();
  else if (!d) list = '<div class="u-card rk-list rk-wait" aria-busy="true"></div>';
  else if (d.off) list = `<div class="u-card rk-empty"><p>순위는 곧 열려요</p></div>`;
  else if (!d.top.length) list = `<div class="u-card rk-empty"><p>${S.tab === 'prev' ? '지난주 기록이 없어요' : '이번 주 첫 기록의 주인공이 되어 보세요'}</p></div>`;
  else {
    const mr = S.tab === 'now' && m && m.me && m.me.rank ? m.me.rank : 0, cut = S.more ? 100 : 5, rows = d.top.slice(0, cut).map(x => row(x, x.rank === mr));
    if (!S.more && mr > cut + 1) rows.push('<div class="rk-gap" aria-hidden="true">· · ·</div>', row(d.top[mr - 2], false));
    list = `<div class="u-card rk-list" role="list">${rows.join('')}${d.top.length > cut ? `<button class="rk-more" type="button" data-rk-more>${S.more ? '접기' : `100위까지 보기`}</button>` : ''}</div>${pin(d)}`;
  }
  const foot = S.tab === 'me' ? '' : `<p class="rk-foot">같은 점수면 먼저 낸 기록이 앞서요. 마감 때 상위 50 · 25 · 10 · 5 · 1% 휘장을 드려요.</p>`;
  return `<div class="rk"><div class="rk-hd"><span class="u-eb g">${esc(titleOf(S.board))}</span><button class="u-x u-press" data-close aria-label="닫기">${ic('x')}</button></div><h2>${head}</h2><p class="fsub">${sub}</p>
    <div class="u-seg rk-seg" role="tablist" aria-label="순위 보기">${seg}</div>${list}${foot}</div>`;
}
/* 아래 고정 내 줄: 100위 안 = 등수 · 그 밖 = 구간 · 아래 절반 = 내 최고와 지난주 견줌 · 로그인 전 = 로그인 안내 */
function pin(d) {
  if (S.tab !== 'now') return '';
  if (!X.A.current()) return `<button class="rk-pin login" type="button" data-login>${ic('trophy')}<span>로그인하면 내 기록이 순위에 올라요</span>${ic('chev')}</button>`;
  const m = S.mine && S.mine.me, nick = S.mine ? S.mine.nick : '';
  if (!m) return `<div class="rk-pin"><span class="rk-nm">이번 주 기록이 아직 없어요</span><span class="t-sub">한 판이면 순위에 올라요</span></div>`;
  if (m.review || m.hidden) return `<div class="rk-pin"><span class="rk-nm">${esc(nick)} <b>(나)</b></span><span class="t-sub">${esc(m.reason)}</span></div>`;
  const pv = S.mine.prev, up = pv && m.score > pv.score ? ` · 지난주보다 +${fmt(m.score - pv.score)}` : '';
  const right = `<span class="rk-sc u-num">${sc(S.board, m.score)}</span>`;
  if (m.rank && m.rank <= (S.more ? 100 : 5)) return '';   /* 이미 목록에 보이면 아래 고정 줄은 없음 */
  if (m.rank) return `<div class="rk-pin me">${medal(m.rank)}<span class="rk-nm">${esc(nick)} <b>(나)</b>${m.tier ? ` <small>상위 ${m.tier}%</small>` : ''}</span>${right}</div>`;
  if (m.tier) return `<div class="rk-pin me"><span class="rk-n u-num">·</span><span class="rk-nm">${esc(nick)} <b>(나)</b> <small>상위 ${m.tier}% 안${up}</small></span>${right}</div>`;
  return `<div class="rk-pin me"><span class="rk-n u-num">·</span><span class="rk-nm">이번 주 내 최고 <small>${m.n}판${up}</small></span>${right}</div>`;
}
function meHTML() {
  if (!X.A.current()) return `<div class="u-card rk-empty"><p>로그인하면 이번 주 기록 · 지난주의 나 · 휘장이 모여요</p><button class="u-btn fill g" type="button" data-login>로그인</button></div>`;
  const s = S.mine; if (!s) return '<div class="u-card rk-list rk-wait" aria-busy="true"></div>';
  const m = s.me, pv = s.prev, K = { c1: '금 왕관', c2: '은 왕관', c3: '동 왕관', p1: '백금 휘장', p5: '금 휘장', p10: '은 휘장', p25: '동 휘장', p50: '잎 휘장', join: '참가 휘장' };
  const rows = [
    `<div class="u-row"><span class="u-lt"><b>이번 주 최고</b><span>${m ? `${m.n}판 · ${m.rank ? `${fmt(m.rank)}위 · ` : ''}${m.tier ? `상위 ${m.tier}%` : m.review ? '확인 중' : '참가 중'}` : '아직 기록 없음'}</span></span><span class="rk-sc u-num">${m ? fmt(m.score) : '–'}</span></div>`,
    `<div class="u-row"><span class="u-lt"><b>지난주의 나</b><span>${pv ? `${pv.n}판${pv.tier ? ` · 상위 ${pv.tier}%` : ''}` : '지난주 기록 없음'}</span></span><span class="rk-sc u-num">${pv ? fmt(pv.score) : '–'}</span></div>`,
    `<div class="u-row"><span class="u-lt"><b>모은 휘장</b><span>${s.badges.length ? s.badges.slice(0, 4).map(b => K[b.kind] || '휘장').join(' · ') : '마감 때 참가만 해도 하나'}</span></span><span class="rk-sc u-num">${s.badges.length}</span></div>`,
    `<div class="u-row u-press" role="button" tabindex="0" data-rk-nick><span class="u-lt"><b>순위에 보일 이름</b><span>${esc(s.nick)}</span></span><span class="u-lnk">바꾸기</span></div>`];
  return `<div class="u-card u-group rk-me">${rows.join('')}</div>`;
}

/* ── 순위 이름 시트 (시안 shot_2) ── */
let NK = null;
export async function nickAsk(why = 'settings') {
  if (!X.A.current()) return X.needLogin('로그인하면 순위에 내 이름(닉네임)이 올라요');
  if (why === 'first') { try { if (localStorage.getItem('oad_rank_nick_asked') === '1') return; localStorage.setItem('oad_rank_nick_asked', '1'); } catch { /* */ } }
  X.T.track('rank_nick_ui', { what: why });
  const r = await post({ act: 'nick' }); if (!r || !r.ok) return X.toast('잠시 뒤 다시 열어 주세요');
  NK = r; X.openSheet(nickHTML(r.nick, ''), 'u');
}
const okName = v => { const s = String(v || '').trim(), n = [...s].length; return n < 2 ? '두 글자 이상으로 지어 주세요' : n > 10 ? '열 글자까지 쓸 수 있어요' : /^[가-힣A-Za-z0-9]+$/.test(s) ? '' : '한글 · 영문 · 숫자만 쓸 수 있어요'; };
function nickHTML(v, err) {
  const msg = err || okName(v), n = [...String(v || '')].length, sg = (NK && NK.suggest) || [];
  return `<div class="intro rknick"><h2>순위에 보일 이름</h2><p class="fsub">처음엔 자동으로 정해 드려요. 언제든 바꿀 수 있어요 (하루 한 번).</p>
    <label class="rk-in${msg ? ' bad' : ''}"><input id="rkNick" value="${esc(v)}" maxlength="10" autocomplete="off" aria-describedby="rkNickMsg" aria-label="순위에 보일 이름"><span class="u-num" id="rkNickN">${n}/10</span></label>
    <p class="rk-msg${msg ? ' bad' : ''}" id="rkNickMsg" role="status">${msg || (NK && NK.canChange === false && v !== NK.nick ? '오늘은 이미 바꿨어요 · 내일 바꿀 수 있어요' : '쓸 수 있는 이름이에요')}</p>
    <div class="rk-chips"><button type="button" class="rk-chip" data-rk-sug="more">다른 이름 추천</button>${sg.map(x => `<button type="button" class="rk-chip" data-rk-sug="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    <p class="fsub">실명 · 연락처 · 욕설은 쓸 수 없어요. 같은 이름이 있으면 뒤에 번호가 붙어요.</p>
    <div class="stack"><button class="btn" type="button" data-rk-nick-save>이 이름으로 할게요</button><button class="btn ghost" type="button" data-close>나중에</button></div></div>`;
}
async function nickSave(b) {
  const v = (document.getElementById('rkNick') || {}).value || '';
  if (okName(v)) return;
  if (NK && v.trim() === NK.nick) { X.closeSheet(); X.toast(`'${NK.nick}'(으)로 순위에 올라요`); return; }
  b.disabled = true; const r = await post({ act: 'nick', nick: v.trim() }); b.disabled = false;
  if (r && r.ok) { X.T.track('rank_nick_ui', { what: 'save', ok: 1 }); CACHE.clear(); X.closeSheet(); X.toast(`이제 순위에 '${r.nick}'(으)로 보여요`); return; }
  X.T.track('rank_nick_ui', { what: 'save', ok: 0, reason: (r && r.reason) || 'error' });
  const p = document.querySelector('#sheet .rknick'); if (p) p.outerHTML = nickHTML(v, (r && r.msg) || '저장하지 못했어요 · 잠시 뒤 다시 해 주세요');
}

/* ── 마감 보상 받기 창 (앱을 열 때 · 로그인) — 칭찬 먼저 → 숫자 → 다음 주 한 줄 (bm.md 2-1 · '아쉽게' 같은 말 없음) ── */
export async function gifts() {
  if (!X || !X.A.current()) return;
  const r = await post({ act: 'rank', sub: 'gifts' }); const now = Date.now(), list = (r && r.gifts || []).filter(g => now >= g.from);
  if (!list.length || !X.sheetHidden()) return;
  const sum = list.reduce((a, g) => a + g.gold, 0);
  X.T.track('rank_view', { where: 'gift', n: list.length, gold: sum });
  X.openSheet(`<div class="intro rkgift"><div class="u-attbadge big">${ic('trophy')}</div><h2>지난주 순위 선물이 왔어요</h2>
    <p class="fsub">${list.map(g => esc(titleOf(g.board))).join(' · ')} — 멋진 한 주였어요</p>
    <div class="u-card u-group">${list.map(g => `<div class="u-row"><i class="u-ti g">${ic('trophy')}</i><span class="u-lt"><b>${esc(titleOf(g.board))}</b><span>${new Date(g.to).getMonth() + 1}월 ${new Date(g.to).getDate()}일까지 받을 수 있어요</span></span><b class="u-num">${coin(14)} ${fmt(g.gold)}</b></div>`).join('')}</div>
    <div class="stack"><button class="btn gold" type="button" data-rk-claim>${coin(18)} ${fmt(sum)} 골드 받기</button><button class="btn ghost" type="button" data-close>나중에</button></div>
    <p class="fsub">이번 주에도 기록을 이어 가 봐요</p></div>`, 'u');
}
async function claimGo(b) {
  b.disabled = true; const r = await post({ act: 'rank', sub: 'claim' });
  X.closeSheet();
  if (r && r.ok && r.got.length) { const g = r.got.reduce((a, x) => a + x.gold, 0); X.T.track('rank_claim', { gold: g, n: r.got.length }); X.A.refresh().catch(() => {}); X.toast(`${fmt(g)} 골드를 받았어요`); }
  else X.toast('잠시 뒤 다시 받아 주세요');
}

/* ── 홈 상단 전광판 (6-1 · 대표 11-27 정정 "랭킹과 함께 이런 정보들을 … 실시간으로 흐르는 전광판처럼" · "나중에 공지 이벤트 알림 용도로도") ──
   장 하나 = { kind, key, eb(작은 머리글), main(큰 글), medal?, tag?, right(오른쪽 숫자 · 글), icon({ game } | { kind }), go(누르면 갈 곳), n · k(오른쪽 점) }
     kind: rank 게임 순위 1~3위 · luck 점방 오늘의 대박(띠 · 년생 · 월생) · neorang 오늘 많이 본 작품 1~3위 · 지금 뜨는 작품 · live 오늘 함께한 사람 · notice 공지 · event 이벤트
     go: { type: board · luck · work · game · games · tab · sheet · link, to } — 새 종류는 slides() 에 큐 하나 + tickerGo 에 길 하나만 더하면 됨
   공지 · 이벤트 = 서버 설정 한 곳(server/api/_lib/ticker.js NOTICES · GET ?rank=top3 의 notices)에서 받음: { id, kind, eb, text, prio, from, to, who: all · login · guest, go }
     prio 50 이상(맨 앞 공지): 첫 장 + 다른 장 NOTICE_EVERY 장마다 다시 · 그 아래는 다른 종류와 번갈아 · 기간(from ~ to) 밖이면 안 나옴 (서버 · 앱 둘 다 거름)
   섞기 = 종류가 번갈아(rank → notice/event → luck → neorang → live → rank …) · 3.5초마다 위로 한 장 · 손으로 넘김 · 동작 줄이기면 멈춤 · 서버 값은 2분마다 다시 받아 그 자리에서 바꿈
   보여 줄 게 하나도 없으면 카드 자체를 숨김 (참가 하한 · 비로그인 · 운세 생년월일 없음 상태에서도 빈 칸 없음) */
const TK = { i: 0, slides: [], t: 0, r: 0, pause: 0, hover: false, el: null, busy: false };
export const KINDS = ['rank', 'notice', 'luck', 'neorang', 'live'];
export const NOTICE_EVERY = 4, NOTICE_TOP = 50;
/* 공지 · 이벤트 고르기: 기간 · 대상 · 모양 확인 (서버가 이미 걸렀어도 앱이 다시 — 캐시 60초 사이에 끝난 공지가 남지 않게) */
export function liveNotices(list, { now = Date.now(), login = false } = {}) {
  return (Array.isArray(list) ? list : []).filter(n => n && n.id && n.text && (!n.from || Date.parse(n.from) <= now) && (!n.to || now < Date.parse(n.to)) && (n.who === 'login' ? login : n.who === 'guest' ? !login : true))
    .sort((a, b) => (b.prio || 0) - (a.prio || 0));
}
/* 섞기 (DOM 없음 · tools/rank_check.mjs 가 시험): Q = 종류별 장 목록 · notices = 서버 공지 */
export function mix(Q, notices = [], o = {}) {
  const ns = liveNotices(notices, o).map(n => ({ kind: n.kind === 'event' ? 'event' : 'notice', key: 'x:' + n.id, eb: n.eb || (n.kind === 'event' ? '이벤트' : '공지'), main: n.text, right: n.right || '', go: n.go || null, prio: n.prio || 0, n: 1, k: 0 }));
  const top = ns.filter(n => n.prio >= NOTICE_TOP), rest = { ...Q, notice: [...(Q.notice || []), ...ns.filter(n => n.prio < NOTICE_TOP)] };
  const base = [], idx = {};
  while (KINDS.some(k => (idx[k] || 0) < (rest[k] || []).length)) for (const k of KINDS) { const i = idx[k] || 0; if (i < (rest[k] || []).length) { base.push(rest[k][i]); idx[k] = i + 1; } }
  if (!top.length) return base;
  const out = []; let t = 0;
  out.push(top[t++ % top.length]);
  base.forEach((x, i) => { out.push(x); if ((i + 1) % NOTICE_EVERY === 0 && i < base.length - 1) out.push(top[t++ % top.length]); });
  return out.map((x, i) => (out.indexOf(x) === i ? x : { ...x, key: x.key + '#' + i }));   /* 다시 나오는 공지도 장마다 다른 열쇠 */
}
export function slides() {
  const Q = { rank: [], luck: [], neorang: [], live: [] };
  const d = TOP;
  if (d && d.boards) for (const b of d.boards) { if (!X.G(b.game)) continue; const n = Math.min(3, b.top.length);
    b.top.slice(0, 3).forEach((x, k) => Q.rank.push({ kind: 'rank', key: 'r:' + b.board + ':' + k, icon: { game: b.game }, eb: `${titleOf(b.board)} · 이번 주 순위`, medal: k + 1, main: x.nick, tag: x.tag, right: sc(b.board, x.score), sayx: `${k + 1}위 ${x.nick} ${sc(b.board, x.score)}${UNIT[b.board] ? '' : '점'}`, go: { type: 'board', to: b.board }, k, n })); }
  const T0 = TODAY, L = T0 && T0.luck;
  const lk = (key, eb, main, v, k) => ({ kind: 'luck', key, icon: { kind: 'luck' }, eb: '점방 · ' + eb, main, right: `평균 ${Number(v).toFixed(1)}점`, go: { type: 'luck' }, k, n: 3 });
  if (L && L.zodiac && L.zodiac[0]) Q.luck.push(lk('l:z', '오늘의 대박 띠', `${L.zodiac[0].name}띠`, L.zodiac[0].avg, 0));
  if (L && L.year && L.year[0]) Q.luck.push(lk('l:y', '오늘의 대박 년생', `${L.year[0].y}년생`, L.year[0].avg, 1));
  if (L && L.month && L.month[0]) Q.luck.push(lk('l:m', '오늘의 대박 월생', `${L.month[0].m}월생`, L.month[0].avg, 2));
  const W = ((T0 && T0.works) || []).map(x => ({ ...x, work: X.work ? X.work(x.w) : null })).filter(x => x.work).slice(0, 3);
  const hot = T0 && T0.hot && X.work ? { ...T0.hot, work: X.work(T0.hot.w) } : null, nn = W.length + (hot && hot.work ? 1 : 0);
  W.forEach((x, k) => Q.neorang.push({ kind: 'neorang', key: 'n:' + x.w, icon: { kind: 'neorang' }, eb: '너랑 · 오늘 가장 많이 본 작품', medal: k + 1, main: x.work.title, right: fmt(x.n) + '명', go: { type: 'work', to: x.w }, k, n: nn }));
  if (hot && hot.work) Q.neorang.push({ kind: 'neorang', key: 'n:hot', icon: { kind: 'neorang' }, eb: '너랑 · 지금 뜨는 작품', main: hot.work.title, right: `1시간 ${fmt(hot.n)}명`, go: { type: 'work', to: hot.w }, k: W.length, n: nn });
  const G0 = Object.entries((T0 && T0.games) || {}).filter(([g]) => X.G(g)).sort((a, b) => b[1] - a[1]);
  if (G0.length) {
    const sum = G0.reduce((a, [, n]) => a + n, 0), two = G0.length > 1;
    Q.live.push({ kind: 'live', key: 'v:top', icon: { game: G0[0][0] }, eb: '지금 원어데이 · 오늘 가장 많이 한 게임', main: X.G(G0[0][0]).title, right: fmt(G0[0][1]) + '명', go: { type: 'game', to: G0[0][0] }, k: 0, n: two ? 2 : 1 });
    if (two) Q.live.push({ kind: 'live', key: 'v:all', icon: { kind: 'live' }, eb: '지금 원어데이 · 오늘 함께한 사람', main: '오늘 게임을 한 사람', right: fmt(sum) + '명', go: { type: 'games' }, k: 1, n: 2 });
  }
  return mix(Q, (TOP && TOP.notices) || [], { login: !!(X.A && X.A.current()) });
}
const say = s => `${s.eb} — ${s.sayx || `${s.medal ? s.medal + '위 ' : ''}${s.main}${s.right ? ' · ' + s.right : ''}`}`;
const lineHTML = (s, cls = '') => `<div class="rk-tl${cls}"><span class="rk-tk">${esc(s.eb)}</span><span class="rk-tv">${s.medal ? `<span class="rk-md m${s.medal} u-num">${s.medal}</span>` : ''}<b>${esc(s.main)}</b>${s.tag ? `<small>${esc(s.tag)}</small>` : ''}${s.right ? `<span class="rk-ts u-num">${esc(s.right)}</span>` : ''}</span></div>`;
/* 왼쪽 그림: 게임 = 게임 아이콘 · 점방 붉은 칸(반짝임) · 너랑 보라 칸(말풍선) · 전체 수 파란 칸(사람들) · 공지 회색 칸(종) · 이벤트 금색 칸(선물) */
const ICO = { luck: 'spark', neorang: 'chat', live: 'people', notice: 'bell', event: 'gift' };
const iconKey = s => (s.icon && s.icon.game ? 'g:' + s.icon.game : s.kind);
const iconHTML = s => (s.icon && s.icon.game && X.G(s.icon.game) ? X.img(X.G(s.icon.game).icon, 0, 'loading="lazy"') : `<i class="rk-it ${s.kind}">${ic(ICO[s.kind] || 'spark')}</i>`);
const pagerHTML = s => Array.from({ length: s.n || 1 }, (_, k) => `<b class="${k === (s.k || 0) ? 'on' : ''}"></b>`).join('');
export function tickerHTML() {
  const L = slides(); TK.slides = L; if (!L.length) return '<div id="rkTicker" hidden></div>';
  if (TK.i >= L.length) TK.i = 0;
  const s = L[TK.i];
  return `<div id="rkTicker" class="u-card rk-ticker u-press" role="button" tabindex="0" aria-live="off" aria-label="${esc(say(s))}" data-blk="ticker" data-kind="${s.kind}">
    <span class="rk-ic u-ph" data-g="${esc(iconKey(s))}">${iconHTML(s)}</span><span class="rk-slot">${lineHTML(s)}</span>
    <span class="rk-pg" aria-hidden="true">${pagerHTML(s)}</span><span class="rk-ch">${ic('chev')}</span></div>`;
}
/* 서버 값이 새로 오면: 카드가 이미 있으면 그 자리에서 목록만 바꿈(보던 장 그대로 · 다음 넘김부터 새 값) → true · 카드를 새로 그려야 하면(없다가 생김 · 있다가 비움) false */
export function tickerRefresh() {
  const el = document.getElementById('rkTicker'); if (!el || el.hidden) return false;
  const L = slides(); if (!L.length) return false;
  const cur = TK.slides[TK.i], j = cur ? L.findIndex(x => x.key === cur.key) : -1;
  TK.slides = L; TK.i = j >= 0 ? j : Math.min(TK.i, L.length - 1);
  return true;
}
/* 누르면 그 장의 자리로 (go.type 하나에 길 하나) */
function tickerGo(s) {
  const g = s.go || {};
  X.T.track('rank_view', { where: 'ticker', what: s.kind, ...(g.type === 'board' ? { board: g.to } : {}), ...(g.type === 'game' ? { game: g.to } : {}) });
  if (g.type === 'board') return openBoard(g.to, { from: 'ticker' });
  if (g.type === 'luck') return X.goLuck();
  if (g.type === 'work') return X.openWork(g.to);
  if (g.type === 'game') return X.openGame(g.to);
  if (g.type === 'games') return X.toGames();
  if (g.type === 'tab' && ['today', 'fortune', 'neorang', 'box'].includes(g.to)) return X.goTab(g.to);
  if (g.type === 'link' && /^https:\/\//.test(g.to || '')) return window.open(g.to, '_blank', 'noopener');
  if (g.type === 'sheet') return X.openSheet(`<div class="intro"><h2>${esc(g.title || s.main)}</h2><p class="fsub">${esc(g.body || '')}</p><div class="stack"><button class="btn ghost" type="button" data-close>닫기</button></div></div>`, 'u');
}
const still = () => (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.classList.contains('still');
export function tickerMount() {
  const el = document.getElementById('rkTicker'); TK.el = el; clearInterval(TK.t);
  clearInterval(TK.r); TK.r = setInterval(() => { if (X.tab() === 'today' && document.visibilityState === 'visible') warm(X.rankRedraw, 120e3); }, 120e3);   /* 실시간처럼: 2분마다 다시 받음 (서버는 CDN 캐시라 DB 는 1~5분에 한 번) */
  /* 숨은 자리인데 그릴 장이 생겼으면 그 자리를 새로 그려 붙임 (11-27 대표 폰: 값은 왔는데 숨은 채 — 첫 그림이 값보다 먼저 · 값이 오는 순간 홈을 다시 그려 다시 그리기를 놓침) */
  if (el && el.hidden && slides().length) { const x = document.createElement('div'); x.innerHTML = tickerHTML(); el.replaceWith(x.firstElementChild); return tickerMount(); }
  if (!el || el.hidden || !TK.slides.length) return;
  let y0 = null;
  el.addEventListener('pointerenter', () => { TK.hover = true; }); el.addEventListener('pointerleave', () => { TK.hover = false; });
  el.addEventListener('pointerdown', e => { y0 = e.clientY; TK.hover = true; });
  el.addEventListener('pointerup', e => { TK.hover = e.pointerType === 'mouse'; if (y0 != null && Math.abs(e.clientY - y0) > 18) { el.dataset.swiped = '1'; step(e.clientY < y0 ? 1 : -1, true); } y0 = null; });
  el.addEventListener('pointercancel', () => { TK.hover = false; y0 = null; });
  el.addEventListener('click', e => { if (el.dataset.swiped) { delete el.dataset.swiped; e.preventDefault(); return; } const s = TK.slides[TK.i]; if (s) tickerGo(s); });
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } if (e.key === 'ArrowDown') step(1, true); if (e.key === 'ArrowUp') step(-1, true); });
  if (still()) return;   /* 동작 줄이기: 자동 넘김 없음 (손으로만) */
  TK.t = setInterval(() => { if (!running()) return; step(1, false); }, 3500);
}
/* 멈춤: 손가락 · 마우스가 위에 · 손으로 넘긴 뒤 6초 · 홈이 아님 · 시트 열림 · 게임 중 · 앱이 뒤로 감 */
const running = () => !TK.hover && Date.now() > TK.pause && document.visibilityState === 'visible' && X.tab() === 'today' && X.sheetHidden() && X.playerHidden() && TK.el && document.body.contains(TK.el);
function step(dir, hand) {
  const L = TK.slides, el = TK.el; if (!L.length || !el || TK.busy || L.length < 2) return;
  if (hand) TK.pause = Date.now() + 6000;
  TK.i = (TK.i + dir + L.length) % L.length;
  const s = L[TK.i], slot = el.querySelector('.rk-slot'), cur = slot.firstElementChild;
  el.setAttribute('aria-label', say(s)); el.dataset.kind = s.kind;
  const ic0 = el.querySelector('.rk-ic'), ik = iconKey(s); if (ic0 && ic0.dataset.g !== ik) { ic0.innerHTML = iconHTML(s); ic0.dataset.g = ik; }
  el.querySelector('.rk-pg').innerHTML = pagerHTML(s);
  if (still()) { cur.outerHTML = lineHTML(s); return; }
  TK.busy = true;
  slot.insertAdjacentHTML('beforeend', lineHTML(s, dir > 0 ? ' in-up' : ' in-down'));
  cur.classList.add(dir > 0 ? 'out-up' : 'out-down');
  setTimeout(() => { cur.remove(); const n = slot.firstElementChild; if (n) n.className = 'rk-tl'; TK.busy = false; }, 360);
}
export const tickerIndex = () => TK.i;

/* ── 게임 상세 두 줄 · 점방 · 너랑 지표 줄 ── */
/* 게임의 열린 판 (전광판 응답의 open 목록) — 게임 전체 판 → 곡 판 '보통' → 그 밖 순 */
export const boardsFor = gid => ((TOP && TOP.open) || []).filter(b => b === gid || b.startsWith(gid + ':'));
const mainBoard = gid => { const bs = boardsFor(gid); return bs.find(x => x === gid) || bs.find(x => /:normal$/.test(x)) || bs[0] || null; };
export function detailRows(gid) {
  const b = mainBoard(gid); if (!b) return '';
  const tp = TOP && TOP.boards && TOP.boards.find(x => x.board === b), td = TODAY && TODAY.games && TODAY.games[gid];
  const mine = DM.get(b), sub = mine && mine.me ? (mine.me.rank ? `${fmt(mine.me.rank)}위${mine.me.tier ? ` · 상위 ${mine.me.tier}%` : ''}` : mine.me.tier ? `상위 ${mine.me.tier}% 안` : '참가 중') : tp ? `${fmt(tp.total)}명 참가` : '순위표 보기';
  return `<div class="u-card u-group rk-drows" data-rk-detail="${esc(gid)}"><button class="u-row u-press" type="button" data-rk-open="${esc(b)}" data-rk-from="detail"><i class="u-ti gold">${ic('trophy')}</i><span class="u-lt"><b>이번 주 순위</b></span><span class="rk-dv u-num" data-rk-mine="${esc(b)}">${sub}</span>${ic('chev')}</button>
    ${td ? `<div class="u-row"><i class="u-ti sun">${ic('people')}</i><span class="u-lt"><b>오늘 함께한 사람</b></span><span class="rk-dv u-num">${fmt(td)}명</span></div>` : ''}</div>`;
}
const DM = new Map();
export async function detailLoad(gid) {
  const board = mainBoard(gid); if (!board || !X.A.current()) return;
  const m = await post({ act: 'rank', sub: 'mine', board }); if (!m || !m.ok) return;
  DM.set(board, m);
  const el = document.querySelector(`[data-rk-mine="${board}"]`); if (el && m.me) el.textContent = m.me.rank ? `${fmt(m.me.rank)}위${m.me.tier ? ` · 상위 ${m.me.tier}%` : ''}` : m.me.tier ? `상위 ${m.me.tier}% 안` : m.me.review ? '확인 중' : '참가 중';
}
/* 점방 '오늘의 대박 띠 · 년생 · 월생' (서버가 매일 운세 공식으로 셈 · 보여 주기만 · 누르면 오늘 운세로) */
export function luckHTML() {
  const L = TODAY && TODAY.luck; if (!L || !L.zodiac || !L.zodiac.length) return '';
  const z = L.zodiac[0], y = L.year[0], m = L.month[0];
  return `<button class="rk-luck" type="button" data-rk-luck aria-label="오늘의 대박: ${z.name}띠 · ${y.y}년생 · ${m.m}월생"><span class="rk-lk">${ic('spark')}오늘의 대박</span><span class="rk-lv"><b>${z.name}띠</b><i aria-hidden="true">·</i><b>${String(y.y).slice(2)}년생</b><i aria-hidden="true">·</i><b>${m.m}월생</b></span>${ic('chev')}</button>`;
}
export function luckSheet() {
  const L = TODAY && TODAY.luck; if (!L) return;
  X.T.track('rank_view', { where: 'luck' });
  const row = (t, list, f) => `<div class="u-row"><span class="u-lt"><span class="t-sub">${t}</span><b>${f(list[0])}</b><span>${list.slice(1, 3).map((x, i) => `${i + 2}위 ${f(x)}`).join(' · ')}</span></span><span class="rk-sc u-num">${list[0].avg.toFixed(1)}<small>점</small></span></div>`;
  X.openSheet(`<div class="intro rkluck"><h2>오늘의 대박</h2><p class="fsub">오늘 운세 공식으로 1960~2009년생 모든 생일의 총점을 띠 · 해 · 달마다 평균 낸 값이에요 · 재미로 보세요</p>
    <div class="u-card u-group">${row('띠', L.zodiac, x => `${x.name}띠`)}${row('년생', L.year, x => `${x.y}년생`)}${row('월생', L.month, x => `${x.m}월생`)}</div>
    <div class="stack"><button class="btn f" type="button" data-rk-myluck>내 오늘 운세 보기</button><button class="btn ghost" type="button" data-close>닫기</button></div></div>`, 'u');
}
/* 너랑 '오늘 많이 본 작품' (오늘 대화한 사람 수 · 하한 미만은 서버가 숨김 · 누르면 그 작품으로) */
export function nrHTML(works) {
  const W = TODAY && TODAY.works; if (!W || !W.length || !works) return '';
  const w = W.map(x => ({ ...x, work: works(x.w) })).filter(x => x.work);
  if (!w.length) return '';
  const top = w[0];
  return `<button class="rk-nrbar" type="button" data-rk-nr="${esc(top.w)}" aria-label="오늘 많이 본 작품 ${esc(top.work.title)} · ${fmt(top.n)}명"><span class="rk-lk">${ic('people')}오늘 많이 본</span><b>${esc(top.work.title)}</b><span class="u-num">${fmt(top.n)}명</span>${ic('chev')}</button>`;
}

/* ── 클릭 (시트 안 단추 · 상세 줄 · 점방 · 너랑) ── */
export function onClick(e) {
  const t = e.target.closest('[data-rk-tab],[data-rk-more],[data-rk-nick],[data-rk-sug],[data-rk-nick-save],[data-rk-claim],[data-rk-open],[data-rk-luck],[data-rk-myluck],[data-rk-nr]'); if (!t) return false;
  const d = t.dataset;
  if (d.rkTab) { S.tab = d.rkTab; redrawSheet(); if (d.rkTab === 'prev' && !S.data.prev && S.data.now) boardGet(S.board, prevOf(S.data.now.period)).then(j => { S.data.prev = j; redrawSheet(); }); X.T.track('rank_view', { where: 'tab_' + d.rkTab, board: S.board }); }
  else if ('rkMore' in d) { S.more = !S.more; redrawSheet(); }
  else if ('rkNick' in d) nickAsk('mine');
  else if (d.rkSug) { const inp = document.getElementById('rkNick'); if (d.rkSug === 'more') { post({ act: 'nick' }).then(r => { if (r && r.ok) { NK = { ...NK, suggest: r.suggest }; const p = document.querySelector('#sheet .rknick'); if (p) p.outerHTML = nickHTML(inp ? inp.value : '', ''); } }); } else if (inp) { const p = document.querySelector('#sheet .rknick'); if (p) p.outerHTML = nickHTML(d.rkSug, ''); } }
  else if ('rkNickSave' in d) nickSave(t);
  else if ('rkClaim' in d) claimGo(t);
  else if (d.rkOpen) openBoard(d.rkOpen, { from: d.rkFrom || 'app' });
  else if ('rkLuck' in d) luckSheet();
  else if ('rkMyluck' in d) { X.closeSheet(); X.myLuck(); }
  else if (d.rkNr) { X.T.track('rank_view', { where: 'nr', w: d.rkNr }); X.openWork(d.rkNr); }
  return true;
}
export function onInput(e) {
  if (e.target.id !== 'rkNick') return;
  const v = e.target.value, msg = okName(v), m = document.getElementById('rkNickMsg'), n = document.getElementById('rkNickN');
  if (n) n.textContent = `${[...v].length}/10`;
  if (m) { m.textContent = msg || '쓸 수 있는 이름이에요'; m.classList.toggle('bad', !!msg); m.previousElementSibling.classList.toggle('bad', !!msg); }
}

export function init(ctx) {
  X = ctx; warm();
  document.addEventListener('click', e => { if (onClick(e)) e.stopPropagation(); }, true);
  document.addEventListener('input', onInput);
  addEventListener('online', () => resend());
}
