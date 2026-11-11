// 원트랙 — 화면 흐름: 오늘의 한 곡 → 플레이 → 결과 → 이야기 컷 → 이야기책(내일 예고)
//   무대 목록: 지금까지 열린 화(오늘까지)의 곡을 다시 고를 수 있음 · ?dev=1 이면 10곡 전부 · ?day=7 이면 오늘 = 7화
//   뒤로가기 = 바로 전 단계 (원어데이 oad:back · CloseWatcher · PC Esc)
import { A } from './audio.js?v=0.99.26';
import { Play } from './play.js?v=0.99.26';
import { SONGS, DAYS, DIVAS, PRAISE, CHEER, SEASON } from './data.js?v=0.99.26';
import { S, load, save, today, dayNo, record, pageIn, foil, nextOpen, dayKey, DEV } from './save.js?v=0.99.26';
import { installBack, exitToOAD, inOAD, runBack } from './oad.js?v=0.99.26';
import { bm } from './oad_bm.js?v=0.99.26';
import { THEMES } from './themes.js?v=0.99.26';

const $ = s => document.querySelector(s);
const Q = new URLSearchParams(location.search);
const DIFFS = [['easy', '쉬움'], ['normal', '보통'], ['hard', '어려움']];
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtT = t => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
let charts = {}, entry = null, day = null, song = null, last = null, home = null;
const past = () => day !== home;   /* 지금 보는 곡이 오늘의 곡이 아닌 지난 무대인가 */
const singer = d => d.singer || DIVAS[d.diva].name;

/* ---------- 판 맞추기: 390×844 를 화면에 맞춤 ---------- */
function fit() {
  const s = Math.min(innerWidth / 390, innerHeight / 844);
  window.__scale = s;
  $('#box').style.transform = `translate(-50%,-50%) scale(${s})`;
}
addEventListener('resize', fit); fit();

/* ---------- 화면 · 뒤로 ---------- */
let stack = ['today'];
const cur = () => stack[stack.length - 1];
function show(id, mode = 'push') {
  if (mode === 'push') stack.push(id); else if (mode === 'root') stack = [id]; else if (mode === 'replace') stack[stack.length - 1] = id;
  document.querySelectorAll('.scr').forEach(e => e.classList.toggle('on', e.id === id));
  if (id === 'today') renderToday(); else A.stopPreview();
}
function toast(t, ms = 1800) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), ms); }
function modal(html, on) { const m = $('#modal'); m.innerHTML = `<div class="box">${html}</div>`; m.classList.add('on'); m.onclick = e => { const b = e.target.closest('[data-a]'); if (b) on(b.dataset.a); }; }
const closeModal = () => { $('#modal').classList.remove('on'); $('#modal').innerHTML = ''; };

/* ---------- ① 오늘의 한 곡 ---------- */
function renderToday() {
  const t = today(), dv = DIVAS[day.diva], ch = charts[song.id];
  if (!ch) return;
  $('#today .hero').style.backgroundImage = `url(${day.hero})`;
  $('#t_no').textContent = `${past() ? 'REPLAY' : 'TODAY'} · NO.${String(day.no).padStart(3, '0')}`;
  $('#t_ch').textContent = `${dv.name} 이야기 ${day.no}화`;
  $('#t_title').innerHTML = `${esc(song.title)}<small>${esc(song.en)}</small>`;
  $('#t_title').classList.toggle('long', song.title.length > 7);
  $('#t_comp').innerHTML = `작곡 <b>${esc(song.artist)}</b><span class="badge">${esc(song.badge)}</span>`;
  $('#t_bpm').textContent = Math.round(ch.bpm); $('#t_len').textContent = fmtT(entry ? entry.dur : song.len);
  $('#t_off').textContent = (S.offset > 0 ? '+' : S.offset < 0 ? '' : '±') + S.offset;
  $('#t_av').style.backgroundImage = `url(${dv.face})`;
  $('#t_dn').textContent = dv.name; $('#t_dr').textContent = dv.role;
  $('#t_hello').textContent = !past() && t.plays ? '오늘도 와 주셨네요. 한 번 더 들려주실래요?' : day.hello;
  $('#t_steps').innerHTML = DAYS.map((_, i) => `<i class="${S.book[i + 1] ? 'on' : i + 1 === day.no ? 'now' : ''}"></i>`).join('');
  $('#t_diff').innerHTML = DIFFS.map(([d, n]) => { const b = (S.best[song.id] || {})[d]; return `<button data-d="${d}" class="${S.diff === d ? 'on' : ''}"><span>${n}</span><b>LV.${ch.diffs[d].lv}</b>${b ? `<small>${b.rank}${b.ap ? ' · AP' : b.fc ? ' · FC' : ''}</small>` : ''}</button>`; }).join('');
  $('#t_hint span').textContent = S.book[day.no] ? `${day.no}화 장면은 이야기책에 있어요 · 더 높은 등급이면 금박 테두리` : `끝까지 연주하면 ${day.no}화 장면이 이야기책에 꽂혀요`;
  const st = $('#t_start'); st.className = 'start';
  if (past()) st.innerHTML = `<b>지난 무대 다시 듣기</b><span>${retryLabel()}</span>`;
  else if (!t.plays) st.innerHTML = '<b>오늘의 한 곡 시작</b><span>무료 1회</span>';
  else st.innerHTML = `<b>다시 연주하기</b><span>${retryLabel()}</span>`;
  $('#t_list').classList.toggle('dot', !past() && !t.plays);
  if (entry && A.ac && A.ac.state === 'running' && !A.pv && !Play.on) A.preview(entry, ...song.preview);
}
function retryLabel() { const h = bm.info; if (DEV || !h.ok || !bm.price('retry')) return '시험판 무료'; return `광고 · 🪙${bm.price('retry')}`; }
$('#t_diff').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.diff = b.dataset.d; save(); A.fxPlay('tick', S.sfx * 0.5); renderToday(); });
$('#t_back').addEventListener('click', () => { if (inOAD) exitToOAD(); else toast('원어데이 앱 안에서는 원어데이로 돌아가요'); });
$('#t_book').addEventListener('click', () => openBook());
$('#t_sync').addEventListener('click', () => openSheet());
$('#t_start').addEventListener('click', async () => {
  await A.unlock();
  if (!entry) { toast('음악을 불러오는 중이에요'); return; }
  const t = today();
  if (!past() && !t.plays) return go();
  /* 오늘 첫 판은 무료 · 다시 하기 · 지난 무대는 광고 또는 골드 (원어데이 밖 · 상품 등록 전 · ?dev=1 이면 무료) */
  if (DEV || !bm.info.ok || !bm.price('retry')) return go();
  modal(`<h3>한 번 더 연주할까요?</h3><p>${past() ? '지난 무대를 다시 열어요. 기록을 더 올려 볼까요?' : '오늘 무대는 이미 열렸어요. 기록을 더 올려 볼까요?'}</p>${bm.info.ads && bm.info.ads.reward ? '<button class="main" data-a="ad">📺 광고 보고 다시 하기</button>' : ''}<button class="gold" data-a="gold">🪙 ${bm.price('retry')} 골드로 다시 하기</button><button data-a="close">다음에 할게요</button>`, async a => {
    if (a === 'close') return closeModal();
    closeModal();
    const r = a === 'ad' ? await bm.rewardedAd('retry') : await bm.spend('retry');
    if (r.ok) go(); else if (r.reason !== 'cancel') toast(r.reason === 'short' ? '골드가 조금 모자라요' : r.reason === 'limit' ? '오늘 광고는 다 봤어요' : '지금은 할 수 없어요');
  });
});

/* ---------- ② 플레이 ---------- */
function go() {
  A.stopPreview();
  const dv = DIVAS[day.diva];
  show('play');
  Play.auto = Q.get('auto') ? { jitter: +(Q.get('jitter') || 18), miss: +(Q.get('miss') || 0), dom: Q.get('auto') === 'dom' } : null;
  Play.start({
    song, chart: charts[song.id], diff: S.diff, entry, offset: S.offset, speed: S.speed, shake: S.shake, sfx: S.sfx,
    hitsnd: S.hitsnd, el: S.el, lite: S.lite, theme: DEV && THEMES[S.theme] ? S.theme : 'base',
    cover: day.hero, diva: { ...dv, name: singer(day) }, chapter: `${dv.name} 이야기 ${day.no}화`, cheer: CHEER,
    onPause: () => pauseMenu(), onEnd: r => onResult(r),
  });
  try { window.parent.postMessage({ type: 'oad:track', name: 'play', p: { diff: S.diff, day: day.no, song: song.id, past: past() } }, '*'); } catch { /* */ }
}
function pauseMenu() {
  if (!Play.on || Play.ended) return;
  Play.pause();
  modal(`<h3>잠시 멈춤</h3><p>노래는 여기서 기다려요.</p><button class="main" data-a="go">계속하기</button><button data-a="again">처음부터</button><button data-a="quit">그만하기</button>`, a => {
    if (a === 'go') { closeModal(); countdown(); }
    if (a === 'again') { closeModal(); Play.quit(); go(); stack.pop(); }
    if (a === 'quit') { closeModal(); Play.quit(); show('today', 'root'); }
  });
}
/* 다시 이어서: 3 · 2 · 1 뒤에 소리 다시 켬 */
function countdown() {
  let n = 3; const step = () => { if (n === 0) { closeModal(); Play.resume(); return; } $('#modal').classList.add('on'); $('#modal').innerHTML = `<div class="cnt">${n}</div>`; A.ac && A.ac.state === 'running' && A.fxPlay('tick'); n--; countdown.t = setTimeout(step, 600); };
  step();
}

/* ---------- ③ 결과 ---------- */
function onResult(r) {
  const t = today(); S.plays++;
  const firstClear = !S.book[day.no];
  if (!past()) { t.plays++; t.done = true; }
  const nb = record(song.id, S.diff, r);
  last = { r, nb, firstClear, newPage: pageIn(day.no, r.rank), diff: S.diff };
  save(true);
  try { window.parent.postMessage({ type: 'oad:track', name: 'clear', p: { rank: r.rank, acc: Math.round(r.acc * 1000) / 10, diff: S.diff, song: song.id } }, '*'); } catch { /* */ }
  renderResult(); show('result', 'root'); stack = ['today', 'result'];
}
function renderResult() {
  const { r, nb } = last, dv = DIVAS[day.diva], b = (S.best[song.id] || {})[last.diff];
  const praise = r.ap ? PRAISE.ap : r.fc ? PRAISE.fc : nb ? PRAISE.best : pick(PRAISE[r.rank]);
  $('#result').innerHTML = `
    <div class="bgcov" style="background-image:url(${day.hero})"></div>
    <div class="head"><em>${last.diff.toUpperCase()} · LV.${charts[song.id].diffs[last.diff].lv}</em><b>${esc(song.title)}</b><span>${esc(song.artist)} · 노래 ${esc(singer(day))}</span></div>
    <div class="rank r-${r.rank}"><span class="rk"><i class="ring"></i><b>${r.rank}</b><span class="shine"></span>${r.rank === 'S' || r.rank === 'SS' ? sparks() : ''}</span><div class="tags">${r.ap ? '<span>ALL PERFECT</span>' : r.fc ? '<span>FULL COMBO</span>' : ''}${nb ? '<span class="nb">NEW RECORD</span>' : ''}</div></div>
    <div class="score"><b class="tnum" id="r_sc">0</b><span>정확도 ${(r.acc * 100).toFixed(2)}%</span></div>
    <div class="grid"><div class="p"><em>PERFECT</em><b>${r.count.perfect}</b></div><div class="g"><em>GREAT</em><b>${r.count.great}</b></div><div class="d"><em>GOOD</em><b>${r.count.good}</b></div><div class="m"><em>MISS</em><b>${r.count.miss}</b></div></div>
    <div class="line2"><span>최고 콤보<b>${r.maxCombo}</b></span><span>FAST<b>${r.fast}</b> · SLOW<b>${r.slow}</b></span></div>
    <div class="say"><div class="av" style="background-image:url(${dv.face})"></div><div class="bub"><i>${dv.en}</i>${esc(praise)}</div></div>
    <div class="best">${b ? `이 난이도 최고 <b>${b.score.toLocaleString('en-US')}</b> · ${b.rank}` : ''}${syncHint(r)}</div>
    <div class="btns"><button class="sec" data-n="again">다시 하기<small>${retryLabel()}</small></button><button class="pri" data-n="story">${last.firstClear ? '이야기 열기' : '이야기 다시 보기'}</button></div>`;
  /* 점수 올라가는 연출 */
  const el = $('#r_sc'), t0 = performance.now();
  const up = () => { const k = Math.min(1, (performance.now() - t0) / 1100), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(r.score * e).toLocaleString('en-US'); if (k < 1) requestAnimationFrame(up); };
  setTimeout(up, 350);
  A.fxPlay('chime', S.sfx * 0.6);
}
/* S 이상: 등급 주변으로 퍼지는 금빛 알갱이 (CSS 만) */
function sparks() { let h = ''; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + Math.random() * 0.3, r = 70 + Math.random() * 60; h += `<i class="sp" style="left:50%;top:50%;--dx:${(Math.cos(a) * r).toFixed(0)}px;--dy:${(Math.sin(a) * r * 0.8).toFixed(0)}px;animation-delay:${(0.75 + Math.random() * 0.4).toFixed(2)}s"></i>`; } return h; }
/* 판정이 한쪽으로 쏠리면 싱크 맞추기 권함 (부드럽게) */
function syncHint(r) { const n = r.fast + r.slow; if (n < 12) return ''; const k = (r.slow - r.fast) / n; return Math.abs(k) > 0.55 ? `<br>${k > 0 ? '조금 늦게' : '조금 빠르게'} 누르는 편이에요 · 싱크 맞추기를 해 보세요` : ''; }
$('#result').addEventListener('click', e => { const b = e.target.closest('[data-n]'); if (!b) return; if (b.dataset.n === 'story') openStory(); if (b.dataset.n === 'again') { show('today', 'root'); $('#t_start').click(); } });

/* ---------- ④ 이야기 컷 ---------- */
let line = 0, typing = null;
function openStory(replay = false) {
  const dv = DIVAS[day.diva], r = last ? last.r : null, p = S.book[day.no];
  const rank = r ? r.rank : p ? p.rank : '';
  $('#story').className = 'scr';
  $('#story').innerHTML = `
    <div class="res">${r ? `<div class="gr ${rank === 'S' || rank === 'SS' ? 'gold' : ''}">${rank}</div><div class="sc"><b class="tnum">${r.score.toLocaleString('en-US')}</b><span>최고 콤보 ${r.maxCombo}</span></div><div class="rk">정확도<b class="tnum">${(r.acc * 100).toFixed(1)}%</b></div>` : `<div class="gr gold">${rank}</div><div class="sc"><b>${SEASON.title}</b><span>다시 보기</span></div>`}</div>
    <div class="cut"><div class="im" style="background-image:url(${day.cut})"></div><div class="flash"></div><div class="lb"><span>${replay ? '이야기책' : '새 장면'}</span><span class="n">${dv.name} · ${day.no}화</span></div></div>
    <div class="cap"><em>CHAPTER ${day.no}</em><h3>${esc(day.chapter)}</h3></div>
    <div class="talk"><div class="av"></div><div class="who"></div><p></p><div class="dots">${day.story.map(() => '<i></i>').join('')}</div><span class="nx">TAP ▸</span></div>
    <div class="caption">${esc(day.caption)}</div>
    <div class="shelfwrap shelf"></div>
    <div class="btns" style="opacity:0;pointer-events:none;transition:opacity .5s"><button class="sec" data-s="share">공유</button><button class="pri" data-s="book">이야기책 펼치기</button></div>`;
  show('story', replay ? 'push' : 'push');
  line = 0;
  setTimeout(() => { $('#story .cut').classList.add('open'); A.fxPlay('chime', S.sfx * 0.5); }, 250);
  setTimeout(() => say(), 900);
}
function say() {
  const L = day.story[line]; if (!L) return endStory();
  const dv = DIVAS[L.who], talk = $('#story .talk');
  talk.querySelector('.av').style.backgroundImage = `url(${dv.face})`;
  talk.querySelector('.who').innerHTML = `${dv.name}<small>${dv.en}</small>`;
  talk.querySelectorAll('.dots i').forEach((e, i) => e.classList.toggle('on', i <= line));
  const p = talk.querySelector('p'); let i = 0; clearInterval(typing);
  typing = setInterval(() => { i += 1; p.textContent = L.text.slice(0, i); if (i >= L.text.length) { clearInterval(typing); typing = null; } }, 34);
}
function endStory() {
  const st = $('#story'); st.classList.add('end');
  st.querySelector('.shelfwrap').innerHTML = shelfHTML(true);
  A.fxPlay('page', S.sfx);
  const bt = st.querySelector('.btns'); bt.style.opacity = 1; bt.style.pointerEvents = 'auto';
  line = 999;
}
$('#story').addEventListener('click', e => {
  const b = e.target.closest('[data-s]');
  if (b) { if (b.dataset.s === 'book') openBook(); if (b.dataset.s === 'share') share(); return; }
  if (line >= 999) return;
  if (typing) { clearInterval(typing); typing = null; $('#story .talk p').textContent = day.story[line].text; return; }
  line++; A.fxPlay('soft', S.sfx * 0.5); say();
});
function shelfHTML(anim) {
  const n = Object.keys(S.book).length, vols = [];
  const k0 = Math.max(1, Math.min(day.no - 1, DAYS.length - 2));
  for (let k = k0; k <= k0 + 2; k++) {
    const d = DAYS[k - 1], pg = S.book[k];
    if (d && pg) vols.push(`<div class="vol ${anim && k === day.no && last && last.newPage ? 'slotin' : ''}"><div class="cv f-${foil(pg.rank)}" style="background-image:url(${d.cut})">${anim && k === day.no && last && last.newPage ? '<span class="new">NEW</span>' : ''}<b>${DIVAS[d.diva].name}</b></div><p>${k}화<em>${pg.rank}</em></p></div>`);
    else if (k === day.no + 1 && !past()) vols.push(`<div class="vol"><div class="cv tease" style="background-image:url(${day.tomorrow.img})"><b style="color:#FFC46B">${DIVAS[day.tomorrow.who].name}</b></div><p>${k}화<em style="color:#FFC46B">내일</em></p></div>`);
    else vols.push(`<div class="vol"><div class="cv lock"><span>?</span></div><p>${k}화<em>&nbsp;</em></p></div>`);
  }
  vols.push(`<div class="vol"><div class="cv lock"><span>${SEASON.pages}</span></div><p>시즌 1<em>${n}/${SEASON.pages}</em></p></div>`);
  return `<div class="hd"><b>가희의 이야기책</b><span><em>${n}</em> / ${SEASON.pages}장</span></div><div class="vols">${vols.join('')}</div>`;
}
async function share() {
  const r = last && last.r, txt = `원트랙 NO.${String(day.no).padStart(3, '0')} · ${song.title}${r ? ` · ${r.rank} · 콤보 ${r.maxCombo}` : ''} — 노래로 넘기는 웹툰, 하루 한 곡`;
  try { if (navigator.share) { await navigator.share({ text: txt }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(txt); toast('공유 문구를 복사했어요'); } catch { toast(txt, 3000); }
}

/* ---------- ⑤ 이야기책 + 내일 예고 ---------- */
let cdT = 0;
function openBook() {
  const n = Object.keys(S.book).length, tm = home.tomorrow, dv = DIVAS[tm.who];
  const pages = []; for (let k = 1; k <= SEASON.pages; k++) { const pg = S.book[k], d = DAYS[k - 1]; if (pg && d) pages.push(`<button class="pg has f-${foil(pg.rank)}" data-p="${k}" style="background-image:url(${d.cut})"><b>${k}</b><i>${pg.rank}</i></button>`); else if (k === home.no + 1) pages.push(`<div class="pg next"><span>내일</span><b>${k}</b></div>`); else pages.push(`<div class="pg"><b>${k}</b></div>`); }
  $('#book').innerHTML = `
    <div class="top"><button class="ic" data-b="back" aria-label="뒤로"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><div class="logo">이야기책</div><span style="width:36px"></span></div>
    <div class="ttl"><em>SEASON ${SEASON.no}</em><b>${SEASON.title}</b><span>매일 한 곡, 한 장씩 · ${n} / ${SEASON.pages}장 · S 이상은 금박, A는 은박</span><div class="bar"><i style="width:${n / SEASON.pages * 100}%"></i></div></div>
    <div class="tmr"><div class="im" style="background-image:url(${tm.img})"></div><div class="fc" style="background-image:url(${dv.face})"></div><div class="in"><em>내일 예고 · ${home.no + 1}화</em><b>${esc(tm.title)}</b><q>${esc(tm.text)}</q><div class="cd"><small>다음 곡까지</small><span id="b_cd"></span></div></div></div>
    <div class="pages">${pages.join('')}</div>
    <div class="btns"><button class="sec" data-b="share">공유</button><button class="ice" data-b="home">오늘의 무대로</button></div>`;
  const tick = () => { const ms = nextOpen() - new Date(), h = Math.floor(ms / 3600e3), m = Math.floor(ms / 60e3) % 60, s = Math.floor(ms / 1e3) % 60; const e = $('#b_cd'); if (e) e.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };
  tick(); clearInterval(cdT); cdT = setInterval(tick, 1000);
  show('book');
}
$('#book').addEventListener('click', e => {
  const b = e.target.closest('[data-b],[data-p]'); if (!b) return;
  if (b.dataset.b === 'back') runBack();
  if (b.dataset.b === 'home') { if (past()) setDay(home); show('today', 'root'); }
  if (b.dataset.b === 'share') share();
  if (b.dataset.p) { const d = DAYS[+b.dataset.p - 1]; if (!d) return; last = null; if (d !== day) setDay(d); openStory(true); }
});

/* ---------- 곡 바꾸기: 채보 → 음원 (늦게 온 응답은 버림) ---------- */
let seq = 0;
async function setDay(d, audio = true) {
  const my = ++seq; day = d; song = SONGS[d.song]; entry = null; A.stopPreview();
  if (!charts[song.id]) { try { charts[song.id] = await (await fetch(song.chart)).json(); } catch (e) { console.warn(e); toast('채보를 불러오지 못했어요', 3000); return; } }
  if (my !== seq) return;
  if (cur() === 'today') renderToday();
  if (audio) await loadAudio();
}
async function loadAudio() {
  const my = seq, sg = song;
  try { A.ensure(); const e = await A.load(sg.id, sg.audio, charts[sg.id].firstSound); if (my !== seq) return; entry = e; if (cur() === 'today') renderToday(); }
  catch (e) { console.warn(e); if (my === seq) toast('음악을 불러오지 못했어요. 다시 열어 주세요', 4000); }
}

/* ---------- 무대 목록: 열린 화의 곡 다시 고르기 (오늘 곡이 맨 위) ---------- */
function openStages() {
  const open = d => DEV || d.no <= home.no;
  const rows = DAYS.slice().sort((a, b) => (b === home) - (a === home) || a.no - b.no).map(d => {
    const sg = SONGS[d.song], dv = DIVAS[d.diva], best = S.best[sg.id] || {}, ch = charts[sg.id];
    const rk = ['hard', 'normal', 'easy'].map(x => best[x] && best[x].rank).find(Boolean);
    if (!open(d)) return `<div class="st lock"><div class="cv"><span>${d.no}</span></div><div class="tx"><em>NO.${String(d.no).padStart(3, '0')} · ${d.no - home.no}일 뒤</em><b>???</b><span>${dv.name}의 무대 · 아직 열리지 않았어요</span></div></div>`;
    return `<button class="st ${d === home ? 'today' : ''} ${d === day ? 'cur' : ''}" data-s="${d.no}"><div class="cv" style="background-image:url(${d.cut})"></div><div class="tx"><em>${d === home ? 'TODAY' : 'NO.' + String(d.no).padStart(3, '0')} · ${esc(sg.tier)}</em><b>${esc(sg.title)}</b><span>${esc(singer(d))} · ${d.chapter}</span></div><div class="rk">${rk ? `<b>${rk}</b>` : ''}<small>${ch ? `LV.${ch.diffs.easy.lv}~${ch.diffs.hard.lv}` : ''}</small></div></button>`;
  }).join('');
  $('#stages').innerHTML = `
    <div class="top"><button class="ic" data-g="back" aria-label="뒤로"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><div class="logo">무대 목록</div><span style="width:36px"></span></div>
    <div class="ttl"><em>SEASON ${SEASON.no} · ${SEASON.title}</em><b>하루 한 곡, 지난 무대도 다시</b><span>${DEV ? '시험 모드 · 10곡 모두 열림' : `${home.no}화까지 열렸어요 · 매일 아침 7시에 한 곡씩`}</span></div>
    <div class="list">${rows}</div>`;
  show('stages');
  /* 목록 LV 표시용 채보 미리 받기 (작음) */
  DAYS.filter(d => open(d) && !charts[d.song]).forEach(d => fetch(SONGS[d.song].chart).then(r => r.json()).then(j => { charts[d.song] = j; if (cur() === 'stages') { const e = $(`#stages [data-s="${d.no}"] .rk small`); if (e) e.textContent = `LV.${j.diffs.easy.lv}~${j.diffs.hard.lv}`; } }).catch(() => { /* */ }));
}
$('#t_list').addEventListener('click', () => openStages());
$('#stages').addEventListener('click', async e => {
  const b = e.target.closest('[data-g],[data-s]'); if (!b) return;
  if (b.dataset.g === 'back') return runBack();
  const d = DAYS[+b.dataset.s - 1]; if (!d) return;
  A.fxPlay('tick', S.sfx * 0.5);
  last = null; show('today', 'root'); await setDay(d);
});

/* ---------- ⑥ 설정 시트 · 싱크 맞추기 ---------- */
function openSheet() {
  const sh = $('#sheet');
  const row = (k, name, sub, val) => `<div class="row"><span>${name}<small>${sub}</small></span><div class="st"><button data-k="${k}" data-v="-1">−</button><b>${val}</b><button data-k="${k}" data-v="1">+</button></div></div>`;
  sh.innerHTML = `<div class="pan"><h3>연주 설정</h3>
    <div class="row"><span>싱크 맞추기<small>박자에 맞춰 화면을 두드려 소리 지연을 재요</small></span><button class="pill3" data-k="calib">${S.offset > 0 ? '+' : ''}${S.offset}ms · 맞추기</button></div>
    ${row('offset', '싱크 직접 조절', '노트가 소리보다 빠르면 +, 느리면 −', (S.offset > 0 ? '+' : '') + S.offset + 'ms')}
    ${row('speed', '노트 속도', '높을수록 노트가 빨리 내려와요', S.speed)}
    ${row('sfx', '효과음', '누를 때 나는 소리', Math.round(S.sfx * 10))}
    ${row('music', '음악', '노래 크기', Math.round(S.music * 10))}
    <div class="row"><span>타격음<small>판정마다 짧은 소리 (크기는 효과음)</small></span><button class="tg ${S.hitsnd ? 'on' : ''}" data-k="hitsnd"></button></div>
    <div class="row"><span>EARLY / LATE 표시<small>GREAT · GOOD 때 빠름 · 늦음 글씨</small></span><button class="tg ${S.el ? 'on' : ''}" data-k="el"></button></div>
    <div class="row"><span>화면 흔들림<small>100콤보 · 풀콤보 때 아주 살짝</small></span><button class="tg ${S.shake ? 'on' : ''}" data-k="shake"></button></div>
    <div class="row"><span>연출 줄이기<small>오래된 폰 · 배터리 아끼기 (파티클 · 빛기둥 끔)</small></span><button class="tg ${S.lite ? 'on' : ''}" data-k="lite"></button></div>
    ${DEV ? `<div class="row"><span>연출 테마 <small>시험 모드 · 가희 테마 미리보기</small></span><button class="pill3" data-k="theme">${esc((THEMES[S.theme] || THEMES.base).name)}</button></div>` : ''}
    <div class="cred"><b>음악</b> 원트랙 사운드 — Suno 로 만든 오리지널 곡 10곡 (유료 구독 · 상업 이용)<br><b>캐릭터 원화</b> 그라나사 (권리자 허락) · <b>채보 · 화면</b> 원어데이<br>키보드: D F J K</div>
    <button class="close" data-k="close">닫기</button></div>`;
  sh.classList.add('on');
}
$('#sheet').addEventListener('click', e => {
  if (e.target.id === 'sheet') return closeSheet();
  const b = e.target.closest('[data-k]'); if (!b) return;
  const k = b.dataset.k, v = +b.dataset.v || 0;
  if (k === 'close') return closeSheet();
  if (k === 'calib') { closeSheet(); return openCalib(); }
  if (k === 'offset') S.offset = Math.max(-300, Math.min(300, S.offset + v * 5));
  if (k === 'speed') S.speed = Math.max(1, Math.min(10, S.speed + v));
  if (k === 'sfx') { S.sfx = Math.max(0, Math.min(1, Math.round(S.sfx * 10 + v) / 10)); A.unlock().then(() => A.hit('perfect', S.sfx)); }
  if (k === 'music') { S.music = Math.max(0, Math.min(1, Math.round(S.music * 10 + v) / 10)); A.setVol('music', S.music); }
  if (k === 'shake') S.shake = !S.shake;
  if (k === 'hitsnd') { S.hitsnd = !S.hitsnd; if (S.hitsnd) A.unlock().then(() => A.hit('perfect', S.sfx)); }
  if (k === 'el') S.el = !S.el;
  if (k === 'lite') { S.lite = !S.lite; document.body.classList.toggle('lite', S.lite); }
  if (k === 'theme') { const ids = Object.keys(THEMES); S.theme = ids[(ids.indexOf(S.theme) + 1) % ids.length]; }
  save(); openSheet(); renderToday();
});
function closeSheet() { $('#sheet').classList.remove('on'); }

let cal = null;
async function openCalib() {
  await A.unlock(); A.stopPreview();
  $('#calib').innerHTML = `
    <div class="top"><button class="ic" data-c="back" aria-label="뒤로"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><div class="logo">싱크 맞추기</div><span style="width:36px"></span></div>
    <div class="ttl"><b>소리에 맞춰 두드려 주세요</b><span>‘톡’ 소리가 들리는 순간 화면 아무 곳이나 8번.<br>이어폰을 쓰면 이어폰을 낀 채로 맞춰 주세요.</span></div>
    <div class="pad" data-c="tap"></div>
    <div class="ring"><i></i><b>0</b><small>/ 8</small></div>
    <div class="dots">${'<i></i>'.repeat(8)}</div>
    <div class="val">지금 싱크 <b id="c_v">${S.offset > 0 ? '+' : ''}${S.offset}</b>ms</div>
    <div class="adj"><button data-c="-">−5</button><button data-c="reset">0</button><button data-c="+">+5</button></div>
    <div class="btns"><button class="ice" data-c="done" style="flex:1">완료</button></div>`;
  show('calib');
  /* 120 BPM 메트로놈 — 오디오 시계로 미리 예약 */
  const ac = A.ac, spb = 0.5;
  cal = { t0: ac.currentTime + 0.6, k: 0, taps: [], raf: 0, iv: 0, lastBeat: -1 };
  const sched = () => { while (cal && cal.t0 + cal.k * spb < ac.currentTime + 1.2) { A.fxPlay(cal.k % 4 ? 'tock' : 'tick', 0.9, cal.t0 + cal.k * spb); cal.k++; } };
  sched(); cal.iv = setInterval(sched, 200);
  const frame = () => { if (!cal) return; cal.raf = requestAnimationFrame(frame); A.sample(); const b = Math.floor((A.heard() - cal.t0) / spb); if (b >= 0 && b !== cal.lastBeat) { cal.lastBeat = b; const i = $('#calib .ring i'); if (i) { i.classList.remove('go'); void i.offsetWidth; i.classList.add('go'); } } };
  frame();
}
function calTap(e) {
  if (!cal) return;
  const h = A.heard(Play.evMs(e)), k = Math.round((h - cal.t0) / 0.5), d = h - (cal.t0 + k * 0.5);
  if (k < 1 || Math.abs(d) > 0.25) return;
  cal.taps.push(d * 1000);
  const ring = $('#calib .ring'); ring.querySelector('b').textContent = Math.min(8, cal.taps.length); ring.classList.add('tap'); setTimeout(() => ring.classList.remove('tap'), 90);
  $('#calib .dots').querySelectorAll('i').forEach((x, i) => x.classList.toggle('on', i < cal.taps.length));
  if (cal.taps.length >= 8) {
    const t = cal.taps.slice(-8).sort((a, b) => a - b), med = (t[3] + t[4]) / 2;
    S.offset = Math.max(-300, Math.min(300, Math.round(med / 5) * 5)); S.calibrated = true; save();
    $('#c_v').textContent = (S.offset > 0 ? '+' : '') + S.offset;
    toast(`싱크를 ${S.offset > 0 ? '+' : ''}${S.offset}ms 로 맞췄어요`);
    cal.taps = [];
  }
}
function closeCalib() { if (!cal) return; clearInterval(cal.iv); cancelAnimationFrame(cal.raf); cal = null; }
$('#calib').addEventListener('pointerdown', e => { if (e.target.closest('[data-c="tap"]') || e.target.closest('.ring')) calTap(e); });
$('#calib').addEventListener('click', e => {
  const b = e.target.closest('[data-c]'); if (!b || b.dataset.c === 'tap') return;
  const c = b.dataset.c;
  if (c === '-' || c === '+') S.offset = Math.max(-300, Math.min(300, S.offset + (c === '+' ? 5 : -5)));
  if (c === 'reset') S.offset = 0;
  if (c === 'back' || c === 'done') { save(); return runBack(); }
  save(); $('#c_v').textContent = (S.offset > 0 ? '+' : '') + S.offset;
});

/* ---------- 뒤로가기: 창 → 시트 → 화면 하나 전 → 첫 화면이면 원어데이로 ---------- */
function back() {
  if ($('#modal.on')) { const m = $('#modal'); if (m.querySelector('[data-a=go]')) m.querySelector('[data-a=go]').click(); else if (m.querySelector('.cnt')) { /* 3·2·1 중엔 기다림 */ } else closeModal(); return true; }
  if ($('#sheet.on')) { closeSheet(); return true; }
  const c = cur();
  if (c === 'play') { pauseMenu(); return true; }
  if (c === 'today' && stack.length === 1 && past()) { setDay(home); return true; }   /* 지난 무대를 보다가 뒤로 = 오늘의 곡으로 */
  if (c === 'calib') closeCalib();
  if (c === 'book') clearInterval(cdT);
  if (c === 'story' && typing) { clearInterval(typing); typing = null; }
  if (stack.length > 1) { stack.pop(); const p = cur(); document.querySelectorAll('.scr').forEach(e => e.classList.toggle('on', e.id === p)); if (p === 'today') renderToday(); else A.stopPreview(); return true; }
  return false;
}
installBack({ back });
addEventListener('keydown', e => { if (e.key === 'Escape') { if (!back() && inOAD) exitToOAD(); } });

/* ---------- 시작 ---------- */
document.addEventListener('pointerdown', async () => { await A.unlock(); A.setVol('music', S.music); if (cur() === 'today' && entry && !A.pv && !Play.on) A.preview(entry, ...song.preview); }, { once: true });
(async () => {
  load();
  A.vol.music = S.music; document.body.classList.toggle('lite', !!S.lite);
  if (DEV && Q.get('theme') && THEMES[Q.get('theme')]) S.theme = Q.get('theme');
  if (Q.get('lite') === '1') S.lite = true;
  if (Q.get('reset') === '1') { localStorage.removeItem('onetrack_v1'); load(); }
  home = DAYS[dayNo(DAYS.length) - 1];
  const want = DAYS[(+Q.get('song') || 0) - 1];   /* 시험용: ?dev=1&song=7 → 7화 곡을 바로 고른 상태로 */
  await setDay(DEV && want ? want : home, false);
  bm.hello().then(() => { if (cur() === 'today') renderToday(); });
  show('today', 'root');
  setTimeout(() => $('#boot').classList.add('off'), 250);
  await loadAudio();
  const s = Q.get('screen');
  if (s === 'book') openBook(); else if (s === 'calib') openCalib(); else if (s === 'sheet') openSheet();
})();

/* 시험용 손잡이 */
window.__ot = { S, Play, A, show, back, get stack() { return stack; }, get last() { return last; }, get day() { return day; }, get home() { return home; }, get entry() { return entry; }, go, openStory, openBook, openStages, setDay, onResult, dayKey };
