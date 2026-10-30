// 오늘의 다꾸 v0.1 — 시작 · 화면 잇기 · 판 끝 보상
//   오늘의 페이지(하루 3판 → 날짜 도장 페이지 한 장) · 자유 다꾸(무제한 · 스티커 서랍 · 테마 노트) · 진행 맵 30단계
import { dailyCfg, dailySet, stageCfg, freeCfg, stageKind, FREE_REWARD, NOTES, img, nameOf, isFoil, SHOP, PAGE_TPL } from './data.js?v=0.94.1';
import { S, load, save, day, dayKey, give } from './save.js?v=0.94.1';
import * as A from './audio.js?v=0.94.1';
import * as Game from './game.js?v=0.94.1';
import { renderPage, completeToday, openShare, pickStickers } from './page.js?v=0.94.1';
import { show, bind, goldChip, grant, openEditor, openDay } from './screens.js?v=0.94.1';
import { $, sp, toast, modal, closeModal, burst, praise, app, setHaptic, buzz } from './ui.js?v=0.94.1';
import { bm } from './oad_bm.js?v=0.94.1';
import { installBack } from './oad.js?v=0.94.1';
import { cur, closeSheets } from './screens.js?v=0.94.1';

const Q = new URLSearchParams(location.search);
window.__errs = [];
addEventListener('error', e => window.__errs.push(String(e.message)));
addEventListener('unhandledrejection', e => window.__errs.push(String(e.reason)));
if (Q.get('gray') === '1') document.body.classList.add('gray');
load(); A.setMuted(!S.sound); setHaptic(S.haptic !== false); A.setMusic(S.music !== false);

const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

/* ---------- 판 시작 (모드별) ---------- */
let mode = null;
function play(m, cfg, seed, label, key, lucky = null, tutorial = false) {
  mode = m; S.plays++; save();
  show('game'); $('#result').classList.remove('on'); $('#preview').classList.remove('on');
  Game.start({ cfg, seed, label, key, lucky, tutorial, onEnd: r => onEnd(m, r), onQuit: () => show(m.kind === 'map' ? 'map' : 'home') });
}
const go = {
  daily() {
    const dd = day(); if (dd.done) return openDay(dayKey());
    const w = dd.wins; dd.tries = (dd.tries || 0) + 1;
    const tag = ['쉬움', '보통', '<span class="hardtag">어려움</span>'][w];
    play({ kind: 'daily', w }, dailyCfg(dayKey(), w), hash(dayKey()) + w * 101 + dd.tries * 7, `오늘 페이지 <b>${w + 1}/3</b> · ${tag}`, 'daily' + w, dailySet(dayKey()).lucky, !S.tut && w === 0);
  },
  map(n) {
    const intro = { 11: ['얼음이 나와요', '얼음에 싸인 스티커는 칸에 스티커를 몇 장 더 담으면 녹아요. 숫자가 남은 장 수예요.'], 21: ['사슬이 나와요', '사슬에 묶인 스티커는 같은 줄 바로 옆 스티커를 먼저 떼면 풀려요.'] }[n];
    const k = stageKind(n), tag = k === 'hard' ? ' · <span class="hardtag">어려운 판 · 보상 2배</span>' : k === 'boss' ? ' · <span class="hardtag boss">최고 난도</span>' : '';
    const run = () => { S.mapTry = (S.mapTry || 0) + 1; play({ kind: 'map', n, diff: k }, stageCfg(n), n * 7919 + S.mapTry * 31, `진행 맵 <b>${n}단계</b>${tag}`, 'map' + n); };
    if (intro && S.map < n) modal(`<h3>새로운 재미 · ${intro[0]}</h3><p>${intro[1]}</p><p class="sub">막힐 것 같으면 원어데이가 하나 풀어 드려요.</p><button class="btn main" data-a="go">알겠어요</button>`, a => { if (a === 'go') { closeModal(); run(); } });
    else run();
  },
  /* 자유 다꾸: 판마다 난이도를 골라 들어감 · 어려울수록 스티커가 많고 금박 확률이 높음 */
  free(diff) {
    if (!diff) {
      const R = FREE_REWARD, row = (d, name, desc) => `<button class="btn diff ${d}" data-a="diff" data-d="${d}"><b>${name}</b><span>${desc}</span><em>스티커 ${R[d].n}장 · 금박 ${Math.round(R[d].foil * 100)}%</em></button>`;
      return modal(`<h3>자유 다꾸 · 난이도 고르기</h3><p>어려울수록 스티커를 더 많이 받아요.</p>${row('easy', '쉬움', '편하게 한 판')}${row('normal', '보통', '적당히 아슬아슬')}${row('hard', '어려움', '아슬아슬하게 깨는 맛')}<button class="btn ghost" data-a="close">그만두기</button>`, (a, e) => { if (a === 'close') return closeModal(); if (a === 'diff') { closeModal(); S.freeDiff = e.target.closest('[data-d]').dataset.d; go.free(S.freeDiff); } });
    }
    const name = { easy: '쉬움', normal: '보통', hard: '<span class="hardtag">어려움</span>' }[diff];
    play({ kind: 'free', diff }, freeCfg(S.free, S.map, diff), S.free * 104729 + 7 + (S.freeTry = (S.freeTry || 0) + 1) * 13, `자유 다꾸 <b>${S.free + 1}판</b> · ${name}`, 'free' + diff);
  },
};
bind(go);

/* 판 보상: 터뜨린 그림 중 3장 (도구 없이 깨면 +1) · 금박 묶음을 샀으면 가끔 금박 */
/* 판 보상: 기본 3장(자유 다꾸는 난이도별 2 · 3 · 5장) · 어려운 판 · 보스 2배 · 도구 없이 깨면 +1 · 금박은 난이도가 높을수록 자주 */
function reward(cleared, perfect, m) {
  const pool = [...new Set(cleared)], got = [];
  let n = m.kind === 'free' ? FREE_REWARD[m.diff || 'normal'].n : 3; if (m.diff === 'hard' && m.kind === 'map' || m.diff === 'boss') n *= 2; if (m.kind === 'daily' && m.w === 2) n += 1;
  const foilP = m.kind === 'free' ? FREE_REWARD[m.diff || 'normal'].foil : m.diff === 'boss' ? 0.25 : m.diff === 'hard' ? 0.15 : 0.05;
  for (let i = 0; i < n + (perfect ? 1 : 0); i++) { let id = pool[Math.floor(Math.random() * pool.length)]; if (id < 12 && Math.random() < foilP * (S.foil ? 1.5 : 1)) id = 'f' + id; got.push(id); give(id); }
  return got;
}

/* ---------- 판 끝 ---------- */
function onEnd(m, r) {
  if (!r.win) return;
  A.clear();
  const big = $('#big'); big.innerHTML = r.perfect ? '완벽해요!<small>도구 없이 깔끔하게 — 스티커 한 장 더!</small>' : ['멋져요!', '잘했어요!', '깔끔해요!'][Math.floor(Math.random() * 3)] + '<small>스티커를 모았어요</small>';
  big.animate([{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'scale(1.06)', offset: .4 }, { opacity: 1, transform: 'scale(1)' }], { duration: sp(600), easing: 'ease-out', fill: 'forwards' });
  for (let k = 0; k < 4; k++) setTimeout(() => burst(app.clientWidth * (0.2 + 0.2 * k), app.clientHeight * 0.42, 22, true), k * 120);
  const got = reward(r.cleared, r.perfect, m);
  let msg = '', btns = '', extra = null;
  if (m.kind === 'daily') {
    const dd = day(); m.prevGot = [...new Set(dd.got)]; dd.wins = Math.min(3, dd.wins + 1); dd.got.push(...r.cleared);
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
    btns = `<button class="btn main" data-n="freeSame">한 판 더</button><button class="btn" data-n="notes">노트 꾸미기</button>`;
  }
  save(true);
  setTimeout(() => {
    $('#big').animate([{ opacity: 1 }, { opacity: 0 }], { duration: sp(300), fill: 'forwards' });
    /* 이번 판 스티커가 노트에 '착' 붙는 미리보기 → 결과 카드 (오늘 판은 지금까지 모인 오늘 페이지가 보이게) */
    const t = preview(m, got);
    setTimeout(() => { if (extra === 'page') { $('#preview').classList.remove('on'); return showToday(got); } result(got, msg, btns); bm.interstitial('round_end'); }, t);
  }, sp(900));
}
function preview(m, got) {
  const pv = $('#preview'), k = dayKey(), dd = day(k);
  const tpl = PAGE_TPL[dailySet(k).tpl].spots;
  pv.innerHTML = m.kind === 'daily' ? `<h4>오늘 페이지</h4><small>${dd.wins}/3판 · 스티커가 모이고 있어요</small>` : `<h4>스티커 서랍</h4><small>노트에 붙일 스티커가 생겼어요</small>`;
  const prev = m.kind === 'daily' ? (m.prevGot || []).filter(x => !got.includes(x)).slice(0, Math.max(0, tpl.length - got.length)) : [];
  const all = [...prev.map(ty => ({ ty, old: 1 })), ...got.map(ty => ({ ty }))].slice(0, 8);
  pv.classList.add('on');
  all.forEach((s, i) => {
    const [fx, fy, fw, rot] = tpl[i % tpl.length]; const e = document.createElement('div'); e.className = 'pv' + (isFoil(s.ty) ? ' foil' : '');
    e.style.left = fx * 100 + '%'; e.style.top = (fy * 100 - 8) + '%'; e.style.width = fw * 100 + '%'; e.style.transform = `rotate(${rot}deg)`; e.innerHTML = `<img src="${img(s.ty)}" alt="">`; pv.appendChild(e);
    if (s.old) return;
    const d = sp(250 + (i - prev.length) * 230);
    e.animate([{ transform: `translateY(260px) rotate(${rot * 3}deg) scale(1.5)`, opacity: 0 }, { transform: `translateY(-10px) rotate(${rot}deg) scale(1.15)`, opacity: 1, offset: .75 }, { transform: `rotate(${rot}deg) scale(.95)`, offset: .9 }, { transform: `rotate(${rot}deg)` }], { duration: sp(440), delay: d, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'backwards' });
    setTimeout(() => { A.stick(i); buzz(6); }, d + sp(380));
  });
  return sp(250 + got.length * 230 + 700);
}
function result(got, msg, btns) {
  const el = $('#result');
  el.innerHTML = `<div class="card"><h3>스티커 ${got.length}장을 서랍에 넣었어요</h3><div class="got">${got.map((id, i) => `<span class="${isFoil(id) ? 'foil' : ''}" style="--d:${i * 90}ms"><img src="${img(id)}" alt="${nameOf(id)}"></span>`).join('')}</div><p>${msg}</p><div class="row">${btns}</div></div>`;
  el.classList.add('on'); got.forEach((_, i) => setTimeout(() => A.get(), sp(200 + i * 90)));
  el.onclick = e => { const n = e.target.closest('[data-n]')?.dataset.n; if (!n) return; el.classList.remove('on'); $('#preview').classList.remove('on');
    if (n === 'next') go.daily(); if (n === 'home') show('home'); if (n === 'nextmap') go.map(mode.n + 1); if (n === 'map') show('map'); if (n === 'free') go.free(); if (n === 'freeSame') go.free(mode.diff); if (n === 'notes') show('notes'); };
}
/* 오늘 페이지 완성 장면 (전면 광고는 여기서 부르지 않음 — 홈으로 돌아갈 때) */
async function showToday() {
  const pg = $('#page'), k = dayKey(); pg.classList.add('on');
  $('#pageUI').classList.remove('on');
  pg.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: sp(520), easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' });
  await renderPage(pg, k, { animate: true });
  $('#pageUI').innerHTML = `<button class="btn main" data-p="share">공유 카드 만들기</button><button class="btn" data-p="free">자유 다꾸 계속</button><button class="btn ghost" data-p="home">홈</button>`;
  $('#pageUI').classList.add('on');
  $('#pageUI').onclick = e => { const p = e.target.dataset.p; if (p === 'share') openShare(k); if (p === 'free' || p === 'home') { pg.classList.remove('on'); $('#pageUI').classList.remove('on'); if (p === 'free') go.free(); else { show('home'); bm.interstitial('round_end'); } } };
}
function settings() {
  const row = (k, label, on) => `<button class="btn tg ${on ? 'on' : ''}" data-a="${k}"><span>${label}</span><i></i></button>`;
  modal(`<h3>설정</h3>${row('sfx', '효과음', !A.isMuted())}${row('bgm', '배경음', A.musicOn())}${row('hap', '진동', S.haptic !== false)}<button class="btn main" data-a="close">닫기</button>`, a => {
    if (a === 'sfx') { A.setMuted(!A.isMuted()); S.sound = !A.isMuted(); } if (a === 'bgm') { A.setMusic(!A.musicOn()); S.music = A.musicOn(); } if (a === 'hap') { S.haptic = S.haptic === false; setHaptic(S.haptic); buzz(10); }
    if (a === 'close') return closeModal(); save(); settings(); });
}
window.__settings = settings;

/* ---------- 버튼 ---------- */
$('#t_undo').onclick = () => Game.useTool('undo'); $('#t_magnet').onclick = () => Game.useTool('magnet'); $('#t_shuffle').onclick = () => Game.useTool('shuffle');
$('#pause').onclick = () => { A.unlock(); modal(`<h3>잠깐 쉬어요</h3><p>나가면 이 판은 처음부터 다시 시작해요. 모은 스티커와 페이지는 그대로예요.</p><button class="btn main" data-a="close">계속하기</button><button class="btn" data-a="set">소리 · 진동 설정</button><button class="btn ghost" data-a="leave">그만하고 나가기</button>`, a => {
  if (a === 'close') closeModal(); if (a === 'set') settings();
  if (a === 'leave') { closeModal(); Game.quit(); show(mode?.kind === 'map' ? 'map' : 'home'); } }); };
document.querySelectorAll('#nav button').forEach(b => b.onclick = () => { A.unlock(); show(b.dataset.go); });
addEventListener('resize', () => Game.relayout());
document.addEventListener('pointerdown', () => { A.unlock(); A.startMusic(); }, { once: true });

/* ---------- 시작 ---------- */
(async () => {
  const h = await bm.hello();
  /* 원어데이 소장 목록으로 산 것 복원 (기기를 바꿔도) */
  if (h.ok) for (const sku of h.items || []) if (SHOP[sku]?.kind === 'item') grant(sku);
  save(); goldChip();
  const s = Q.get('screen');
  if (s === 'page') { const dd = day(); if (!dd.got.length) dd.got = dailySet(dayKey()).set.slice(); if (Q.get('mood')) { dd.mood = Q.get('mood'); dd.line = Q.get('line') || ''; } completeToday(); showToday(); }
  else if (s === 'day') { const dd = day(); if (!dd.got.length) dd.got = dailySet(dayKey()).set.slice(); dd.mood = Q.get('mood') || 'sun'; dd.line = Q.get('line') || ''; completeToday(); show('home'); openDay(dayKey()); }
  else if (s === 'game') go.daily();
  else if (s === 'editor') openEditor(Q.get('note') || 'travel');
  else show(s || 'home');
  $('#boot')?.classList.add('off');
})();
/* ---------- 뒤로가기 (원어데이 oad:back · CloseWatcher) ----------
   순서: 열린 창 · 시트 닫기 → 꾸미기 · 판이면 이전 화면(판 중이면 '그만할까요?') → 다른 탭이면 홈 → 홈이면 false (원어데이로) */
function back() {
  const m = $('#modal.on');
  if ($('#share.on')) { $('#share').classList.remove('on'); return true; }
  if (m) {
    if (m.querySelector('[data-a=stampit]')) { toast('오늘 기분 도장을 하나 골라 주세요'); return true; }   /* 오늘 페이지 도장 직전은 고르고 가게 */
    if (m.querySelector('[data-a=quit]')) { m.querySelector('[data-a=quit]').click(); return true; }      /* 실패 창: 나가기 */
    if (m.querySelector('[data-a=leave]')) { closeModal(); return true; }                                 /* 멈춤 창: 계속하기 */
    if (m.querySelector('[data-a=go]')) { closeModal(); return true; }
    closeModal(); return true;
  }
  if (closeSheets()) return true;
  const pg = $('#page.on');
  if (pg) { if (!$('#pageUI.on')) return true; const h = $('#pageUI [data-p=home],#pageUI [data-p=close]'); if (h) h.click(); return true; }
  if ($('#result.on')) { const b = $('#result [data-n=home],#result [data-n=map],#result [data-n=notes]'); if (b) b.click(); else { $('#result').classList.remove('on'); show('home'); } return true; }
  if (cur === 'game') {
    if (Game.G && !Game.G.over) modal(`<h3>그만할까요?</h3><p>이 판은 처음부터 다시 시작해요. 모은 스티커와 페이지는 그대로예요.</p><button class="btn main" data-a="close">계속하기</button><button class="btn ghost" data-a="leave">그만하기</button>`, a => { if (a === 'close') closeModal(); if (a === 'leave') { closeModal(); Game.quit(); show(mode?.kind === 'map' ? 'map' : 'home'); } });
    else show(mode?.kind === 'map' ? 'map' : 'home');
    return true;
  }
  if (cur === 'editor') { show('notes'); return true; }
  if (cur !== 'home') { show('home'); return true; }
  return false;
}
installBack({ back });
window.__back = back;

/* 시험용: 지난날 페이지 만들기 */
const mkDay = (k, mood = 'sun', line = '') => { const x = S.days[k] = { wins: 3, got: dailySet(k).set.slice(), done: true, mood, line }; x.tpl = dailySet(k).tpl; x.stickers = pickStickers(x.got, k); };
window.__game = { mkDay, get G() { return Game.G; }, Game, S, go, show, save };
