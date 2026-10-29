// 오늘의 다꾸 v0.1 — 시작 · 화면 잇기 · 판 끝 보상
//   오늘의 페이지(하루 3판 → 날짜 도장 페이지 한 장) · 자유 다꾸(무제한 · 스티커 서랍 · 테마 노트) · 진행 맵 30단계
import { DAILY_CFG, stageCfg, freeCfg, NOTES, LUCKY, img, nameOf, isFoil, SHOP } from './data.js?v=0.90.0';
import { S, load, save, day, dayKey, give } from './save.js?v=0.90.0';
import * as A from './audio.js?v=0.90.0';
import * as Game from './game.js?v=0.90.0';
import { renderPage, completeToday, openShare } from './page.js?v=0.90.0';
import { show, bind, goldChip, grant, openEditor, openDay } from './screens.js?v=0.90.0';
import { $, sp, toast, modal, closeModal, burst, praise, app } from './ui.js?v=0.90.0';
import { bm } from './oad_bm.js?v=0.90.0';

const Q = new URLSearchParams(location.search);
window.__errs = [];
addEventListener('error', e => window.__errs.push(String(e.message)));
addEventListener('unhandledrejection', e => window.__errs.push(String(e.reason)));
if (Q.get('gray') === '1') document.body.classList.add('gray');
load(); A.setMuted(!S.sound);

const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

/* ---------- 판 시작 (모드별) ---------- */
let mode = null;
function play(m, cfg, seed, label, key, lucky = false) {
  mode = m; S.plays++; save();
  show('game'); $('#result').classList.remove('on');
  Game.start({ cfg, seed, label, key, lucky, onEnd: r => onEnd(m, r), onQuit: () => show(m.kind === 'map' ? 'map' : 'home') });
}
const go = {
  daily() {
    const dd = day(); if (dd.done) return openDay(dayKey());
    const w = dd.wins; dd.tries = (dd.tries || 0) + 1;
    play({ kind: 'daily', w }, DAILY_CFG[w], hash(dayKey()) + w * 101 + dd.tries * 7, `오늘 페이지 <b>${w + 1}/3</b>`, 'daily' + w, true);
  },
  map(n) {
    const intro = { 11: ['얼음이 나와요', '얼음에 싸인 스티커는 칸에 스티커를 몇 장 더 담으면 녹아요. 숫자가 남은 장 수예요.'], 21: ['사슬이 나와요', '사슬에 묶인 스티커는 같은 줄 바로 옆 스티커를 먼저 떼면 풀려요.'] }[n];
    const run = () => { S.mapTry = (S.mapTry || 0) + 1; play({ kind: 'map', n }, stageCfg(n), n * 7919 + S.mapTry * 31, `진행 맵 <b>${n}단계</b>`, 'map' + n); };
    if (intro && S.map < n) modal(`<h3>새로운 재미 · ${intro[0]}</h3><p>${intro[1]}</p><p class="sub">막힐 것 같으면 원어데이가 하나 풀어 드려요.</p><button class="btn main" data-a="go">알겠어요</button>`, a => { if (a === 'go') { closeModal(); run(); } });
    else run();
  },
  free() { play({ kind: 'free' }, freeCfg(S.free, S.map), S.free * 104729 + 7 + (S.freeTry = (S.freeTry || 0) + 1) * 13, `자유 다꾸 <b>${S.free + 1}판</b>`, 'free'); },
};
bind(go);

/* 판 보상: 터뜨린 그림 중 3장 (도구 없이 깨면 +1) · 금박 묶음을 샀으면 가끔 금박 */
function reward(cleared, perfect) {
  const pool = [...new Set(cleared)], got = [];
  for (let i = 0; i < 3 + (perfect ? 1 : 0); i++) { let id = pool[Math.floor(Math.random() * pool.length)]; if (S.foil && id < 12 && Math.random() < 0.12) id = 'f' + id; got.push(id); give(id); }
  return got;
}

/* ---------- 판 끝 ---------- */
function onEnd(m, r) {
  if (!r.win) return;
  A.clear();
  const big = $('#big'); big.innerHTML = r.perfect ? '완벽해요!<small>도구 없이 깔끔하게 — 스티커 한 장 더!</small>' : ['멋져요!', '잘했어요!', '깔끔해요!'][Math.floor(Math.random() * 3)] + '<small>스티커를 모았어요</small>';
  big.animate([{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'scale(1.06)', offset: .4 }, { opacity: 1, transform: 'scale(1)' }], { duration: sp(600), easing: 'ease-out', fill: 'forwards' });
  for (let k = 0; k < 4; k++) setTimeout(() => burst(app.clientWidth * (0.2 + 0.2 * k), app.clientHeight * 0.42, 22, true), k * 120);
  const got = reward(r.cleared, r.perfect);
  let msg = '', btns = '', extra = null;
  if (m.kind === 'daily') {
    const dd = day(); dd.wins = Math.min(3, dd.wins + 1); dd.got.push(...r.cleared);
    if (dd.wins >= 3) { completeToday(); extra = 'page'; }
    else { msg = `오늘 페이지 ${dd.wins}/3 · ${3 - dd.wins}판만 더 깨면 날짜 도장이 찍혀요`; btns = `<button class="btn main" data-n="next">다음 판</button><button class="btn" data-n="home">홈</button>`; }
  }
  if (m.kind === 'map') {
    const first = m.n > S.map; S.map = Math.max(S.map, m.n);
    msg = `진행 맵 ${m.n}단계 통과`;
    if (first && m.n % 10 === 0) { const nb = NOTES[2 + m.n / 10]; msg += ` · 새 노트 「${nb.name}」가 열렸어요`; give('f' + nb.sig, 1); }
    if (first && m.n === 10) msg += ' · 다음 단계부터 얼음이 나와요';
    if (first && m.n === 20) msg += ' · 다음 단계부터 사슬이 나와요';
    btns = (m.n < 30 ? `<button class="btn main" data-n="nextmap">${m.n + 1}단계</button>` : '') + `<button class="btn" data-n="map">맵</button>`;
  }
  if (m.kind === 'free') {
    S.free++; msg = `자유 다꾸 ${S.free}판째`;
    if (S.free % 10 === 0) { const id = 'f' + [7, 1, 3, 13, 24, 32][(S.free / 10) % 6]; give(id); got.push(id); msg += ' · 10판 기념 금박 스티커!'; }
    btns = `<button class="btn main" data-n="free">한 판 더</button><button class="btn" data-n="notes">노트 꾸미기</button>`;
  }
  save(true);
  setTimeout(() => {
    $('#big').animate([{ opacity: 1 }, { opacity: 0 }], { duration: sp(300), fill: 'forwards' });
    if (extra === 'page') return showToday(got);
    result(got, msg, btns);
    bm.interstitial('round_end');
  }, sp(1300));
}
function result(got, msg, btns) {
  const el = $('#result');
  el.innerHTML = `<div class="card"><h3>스티커 ${got.length}장을 서랍에 넣었어요</h3><div class="got">${got.map((id, i) => `<span class="${isFoil(id) ? 'foil' : ''}" style="--d:${i * 90}ms"><img src="${img(id)}" alt="${nameOf(id)}"></span>`).join('')}</div><p>${msg}</p><div class="row">${btns}</div></div>`;
  el.classList.add('on'); got.forEach((_, i) => setTimeout(() => A.get(), sp(200 + i * 90)));
  el.onclick = e => { const n = e.target.closest('[data-n]')?.dataset.n; if (!n) return; el.classList.remove('on');
    if (n === 'next') go.daily(); if (n === 'home') show('home'); if (n === 'nextmap') go.map(mode.n + 1); if (n === 'map') show('map'); if (n === 'free') go.free(); if (n === 'notes') show('notes'); };
}
/* 오늘 페이지 완성 장면 */
function showToday() {
  const pg = $('#page'), k = dayKey(); pg.classList.add('on');
  $('#pageUI').classList.remove('on');
  pg.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: sp(520), easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' });
  const t = renderPage(pg, k, { animate: true });
  setTimeout(() => {
    $('#pageUI').innerHTML = `<button class="btn main" data-p="share">공유 카드 만들기</button><button class="btn" data-p="free">자유 다꾸 계속</button><button class="btn ghost" data-p="home">홈</button>`;
    $('#pageUI').classList.add('on');
    $('#pageUI').onclick = e => { const p = e.target.dataset.p; if (p === 'share') openShare(k); if (p === 'free' || p === 'home') { pg.classList.remove('on'); $('#pageUI').classList.remove('on'); p === 'free' ? go.free() : show('home'); } };
    bm.interstitial('round_end');
  }, t + sp(400));
}

/* ---------- 버튼 ---------- */
$('#t_undo').onclick = () => Game.useTool('undo'); $('#t_magnet').onclick = () => Game.useTool('magnet'); $('#t_shuffle').onclick = () => Game.useTool('shuffle');
$('#pause').onclick = () => { A.unlock(); modal(`<h3>잠깐 쉬어요</h3><p>나가면 이 판은 처음부터 다시 시작해요. 모은 스티커와 페이지는 그대로예요.</p><button class="btn main" data-a="close">계속하기</button><button class="btn" data-a="mute">${A.isMuted() ? '소리 켜기' : '소리 끄기'}</button><button class="btn ghost" data-a="leave">그만하고 나가기</button>`, a => {
  if (a === 'close') closeModal(); if (a === 'mute') { A.setMuted(!A.isMuted()); S.sound = !A.isMuted(); save(); closeModal(); }
  if (a === 'leave') { closeModal(); Game.quit(); show(mode?.kind === 'map' ? 'map' : 'home'); } }); };
document.querySelectorAll('#nav button').forEach(b => b.onclick = () => { A.unlock(); show(b.dataset.go); });
addEventListener('resize', () => Game.relayout());
document.addEventListener('pointerdown', () => A.unlock(), { once: true });

/* ---------- 시작 ---------- */
(async () => {
  const h = await bm.hello();
  /* 원어데이 소장 목록으로 산 것 복원 (기기를 바꿔도) */
  if (h.ok) for (const sku of h.items || []) if (SHOP[sku]?.kind === 'item') grant(sku);
  save(); goldChip();
  const s = Q.get('screen');
  if (s === 'page') { const dd = day(); if (!dd.got.length) dd.got = [0, 1, 2, 3, 4, 5, 6, 8]; completeToday(); showToday(); }
  else if (s === 'game') go.daily();
  else if (s === 'editor') openEditor(Q.get('note') || 'travel');
  else show(s || 'home');
  $('#boot')?.classList.add('off');
})();
window.__game = { get G() { return Game.G; }, Game, S, go, show, save };
