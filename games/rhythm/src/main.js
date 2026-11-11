// 프로듀서 온에어 — 화면 흐름: 오늘의 방송 → 방송 전(화면 밖) → 생방송(리듬 플레이) → 결과 → 개인 채널(DM · 오늘의 조각) → 방송 기록(내일 예고)
//   오늘의 방송은 그날 하루 무제한 무료 · 지난 방송은 보상형 광고(하루 3회) 또는 골드 · 소장이면 무료 (ONAIR_PLAN 6장 · 7-4)
//   방송 목록: 지금까지 열린 화(오늘까지)의 곡을 다시 고를 수 있음 · ?dev=1 이면 10곡 전부 · ?day=7 이면 오늘 = 7화
//   뒤로가기 = 바로 전 단계 (원어데이 oad:back · CloseWatcher · PC Esc)
import { A } from './audio.js?v=0.99.30';
import { Play } from './play.js?v=0.99.30';
import { SONGS, DAYS, CASTS, PRAISE, CHEER, SEASON, GAME, ROSTER, josa, joinStage } from './data.js?v=0.99.30';
import { S, load, save, today, dayNo, record, pageIn, foil, nextOpen, dayKey, castLog, guidesFor, DEV, PROD } from './save.js?v=0.99.30';
import { installBack, exitToOAD, inOAD, runBack } from './oad.js?v=0.99.30';
import { bm } from './oad_bm.js?v=0.99.30';
import { THEMES } from './themes.js?v=0.99.30';

const $ = s => document.querySelector(s);
const Q = new URLSearchParams(location.search);
const DIFFS = [['easy', '쉬움'], ['normal', '보통'], ['hard', '어려움']];
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtT = t => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
let charts = {}, entry = null, day = null, song = null, last = null, home = null;
const past = () => day !== home;   /* 지금 보는 곡이 오늘의 방송이 아닌 지난 방송인가 */
const PAST_ADS = 3;   /* 지난 방송 보상형 광고: 하루 3회 */
const singer = d => d.singer || CASTS[d.cast].name;

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

/* ---------- ① 오늘의 방송 ---------- */
function renderToday() {
  const t = today(), dv = CASTS[day.cast], ch = charts[song.id];
  if (!ch) return;
  $('#today .hero').style.backgroundImage = `url(${day.hero})`;
  $('#t_no').textContent = `${past() ? 'REPLAY' : 'TONIGHT'} · NO.${String(day.no).padStart(3, '0')}`;
  $('#t_ch').textContent = `${day.no}화 · ${day.chapter}`;
  $('#t_title').innerHTML = `${esc(song.title)}<small>${esc(song.en)}</small>`;
  $('#t_title').classList.toggle('long', song.title.length > 7);
  $('#t_comp').innerHTML = `작곡 <b>${esc(song.artist)}</b><span class="badge">${esc(song.badge)}</span>`;
  $('#t_bpm').textContent = Math.round(ch.bpm); $('#t_len').textContent = fmtT(entry ? entry.dur : song.len);
  $('#t_off').textContent = (S.offset > 0 ? '+' : S.offset < 0 ? '' : '±') + S.offset;
  $('#t_av').style.backgroundImage = `url(${dv.face})`;
  $('#t_dn').textContent = day.singer || dv.name; $('#t_dr').textContent = `${dv.gen} · ${dv.role}`;
  const gid = guestId(), gr = gid && rosterOf(gid);
  $('#t_guest').innerHTML = gid ? `<i style="background-image:url(${CASTS[gid].face})"></i><span>게스트 ${esc(CASTS[gid].name)}</span>` : '<span>+ 게스트</span>';
  $('#t_guest').title = gid ? (gid === day.cast ? '오늘은 단독 방송' : gr.guest) : '옆자리 게스트 고르기';
  /* 캐스트 카드 말풍선은 오늘의 캐스트 말만 (게스트 인사는 생방송 채팅 첫 줄로 · 검수 C-6) */
  $('#t_hello').textContent = !past() && t.plays ? '또 와 주셨네요. 오늘 방송은 몇 번이든 무료예요.' : day.hello;
  $('#t_steps').innerHTML = DAYS.map((_, i) => `<i class="${S.book[i + 1] ? 'on' : i + 1 === day.no ? 'now' : ''}"></i>`).join('');
  $('#t_diff').innerHTML = DIFFS.map(([d, n]) => { const b = (S.best[song.id] || {})[d]; return `<button data-d="${d}" class="${S.diff === d ? 'on' : ''}"><span>${n}</span><b>LV.${ch.diffs[d].lv}</b>${b ? `<small>${b.rank}${b.ap ? ' · AP' : b.fc ? ' · FC' : ''}</small>` : ''}</button>`; }).join('');
  $('#t_hint span').textContent = S.book[day.no] ? `${day.no}화 방송은 방송 기록에 있어요 · 더 높은 등급이면 금박 테두리` : `끝까지 송출하면 ${dv.name}의 개인 채널과 오늘의 조각이 열려요`;
  const st = $('#t_start'); st.className = 'start onair';
  if (past()) st.innerHTML = `<b>지난 방송 다시 방송하기</b><span>${retryLabel()}</span>`;
  else if (!t.plays) st.innerHTML = '<b><i class="lamp"></i>생방송 시작</b><span>오늘 무제한 무료</span>';
  else st.innerHTML = '<b><i class="lamp"></i>한 번 더 송출</b><span>오늘 무제한 무료</span>';
  $('#t_list').classList.toggle('dot', !past() && !t.plays);
  if (entry && A.ac && A.ac.state === 'running' && !A.pv && !Play.on) A.preview(entry, ...song.preview);
}
/* 지난 방송 이용 방법 (재검수 v0.4 B-2: 값을 못 받으면 무료로 열지 않음 · 없는 값은 보여 주지 않음)
   free = 소장 · 시험 모드 · 원어데이 밖(공통 규칙: 앱 밖은 무료) / 앱 안: 광고(하루 3회 · 앱이 광고를 줄 때) · 골드(서버 값이 있을 때) / 둘 다 없으면 닫힘 */
function pastPrice() { return bm.price('replay') || bm.price('retry'); }
function pastWay() {
  const h = bm.info;
  if (DEV) return { free: true, label: '시험 모드 · 무료' };
  if (h.owned) return { free: true, label: '소장 · 무료' };
  if (!h.ok) return { free: true, label: PROD ? '무료' : '앱 밖 · 무료' };
  const adsLeft = Math.max(0, PAST_ADS - (today().ads || 0)), ad = !!(h.ads && h.ads.reward) && adsLeft > 0, price = pastPrice();
  const parts = []; if (ad) parts.push(`광고 ${adsLeft}회`); if (price) parts.push(`🪙${price}`);
  return { free: false, ad, adsLeft, price, closed: !ad && !price, label: parts.length ? parts.join(' · ') : '지금은 열 수 없어요' };
}
function retryLabel() { return past() ? pastWay().label : '오늘 무제한 무료'; }
$('#t_diff').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.diff = b.dataset.d; save(); A.fxPlay('tick', S.sfx * 0.5); renderToday(); });
$('#t_back').addEventListener('click', () => { if (inOAD) exitToOAD(); else toast('원어데이 앱 안에서는 원어데이로 돌아가요'); });
$('#t_book').addEventListener('click', () => openBook());
$('#t_guest').addEventListener('click', e => { e.stopPropagation(); openCasts(); });
$('#t_cast').addEventListener('click', () => openCasts());
$('#t_sync').addEventListener('click', () => openSheet());
$('#t_start').addEventListener('click', async () => {
  await A.unlock();
  if (!entry) { toast('음악을 불러오는 중이에요'); return; }
  /* 오늘의 방송: 그날 하루 무제한 무료 (대표 확정 · ONAIR_PLAN 7-4) */
  if (!past()) return startBroadcast();
  /* 지난 방송 */
  const w = pastWay();
  if (w.free) return startBroadcast();
  if (w.closed) return toast('지금은 지난 방송을 열 수 없어요. 잠시 뒤 다시 해 주세요', 2600);
  modal(`<h3>지난 방송 다시 방송하기</h3><p>오늘의 방송은 몇 번이든 무료예요. 지난 방송은 광고나 골드로 다시 열어요. 소장하면 언제든 무료예요.</p>${w.ad ? `<button class="main" data-a="ad">📺 광고 보고 방송하기 <small>오늘 ${w.adsLeft}회 남음</small></button>` : ''}${w.price ? `<button class="gold" data-a="gold">🪙 ${w.price} 골드로 방송하기</button>` : ''}<button data-a="close">다음에 할게요</button>`, async a => {
    if (a === 'close') return closeModal();
    closeModal();
    const r = a === 'ad' ? await bm.rewardedAd('replay') : await bm.spend(bm.price('replay') ? 'replay' : 'retry');
    if (r.ok) { if (a === 'ad') { today().ads = (today().ads || 0) + 1; save(); } startBroadcast(); return; }
    if (r.reason === 'cancel') return;
    /* 실패 이유별 문구 (재검수 v0.4 B-2: 골드 한도를 '광고' 로 말하던 것 고침) */
    toast(r.reason === 'short' ? '골드가 조금 모자라요' : r.reason === 'limit' ? (a === 'ad' ? '오늘 광고는 다 봤어요' : '오늘 골드로 다시 방송하기는 다 썼어요') : r.reason === 'login' ? '로그인하면 골드로 다시 방송할 수 있어요' : '지금은 할 수 없어요', 2400);
  });
});
/* 방송 시작: 그 화의 '방송 전' 장면을 처음 한 번 보여 주고(다시 하기 · 지난 방송은 바로) 생방송으로 */
function startBroadcast() { if (Q.get('nopre') !== '1' && !S.pre[day.no] && day.pre) openPre(); else go(); }   /* ?nopre=1 : 시험 도구용(측정 · 연속 판) */

/* ---------- ①-2 방송 전 (화면 밖 · 옥상 방송실 등) ---------- */
let pre = null;
function openPre() {
  A.stopPreview();
  const P = day.pre;
  $('#pre').innerHTML = `
    <div class="bg" style="background-image:url(${P.bg})"></div><div class="shade"></div>
    <div class="top"><button class="ic" data-q="back" aria-label="뒤로"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><div class="where"><i class="lamp off"></i>${esc(P.where)}</div><button class="skip" data-q="skip">건너뛰기</button></div>
    <div class="ep"><em>${GAME.studio} · ${day.no}화</em><b>${esc(day.chapter)}</b></div>
    <div class="dmn"></div>
    <div class="talk"><div class="av"></div><div class="who"></div><p></p><span class="nx">TAP ▸</span></div>
    <div class="cue"><button data-q="cue"><i class="lamp"></i>큐 · 방송 시작</button><small>오늘의 캐스트 ${esc(singer(day))} · ${esc(day.place)}</small></div>`;
  pre = { i: -1, typing: 0 };
  $('#pre').className = 'scr'; show('pre');
  setTimeout(() => preNext(), 500);
}
function speaker(who) { if (who === 'pd') return { name: '나', en: 'PRODUCER', face: '' }; if (who === 'sys') return null; return CASTS[who]; }
function preNext() {
  if (!pre) return;
  const L = day.pre.lines; pre.i++;
  const el = $('#pre'); if (!el) return;
  if (pre.i >= L.length) { el.classList.add('end'); A.fxPlay('ready', S.sfx * 0.6); return; }
  const l = L[pre.i];
  if (l.dm) {   /* 개인 채널 알림처럼 위에 잠깐 */
    const n = el.querySelector('.dmn'), c = CASTS[l.who];
    n.innerHTML = `<div class="av" style="background-image:url(${c.face})"></div><div><small>개인 채널 · ${esc(c.name)}</small>${esc(l.text)}</div>`;
    n.classList.remove('on'); void n.offsetWidth; n.classList.add('on'); A.fxPlay('soft', S.sfx * 0.5);
    if (pre.i + 1 < L.length) { clearTimeout(pre.t); pre.t = setTimeout(() => preNext(), 900); } else el.classList.add('end');
    return;
  }
  const t = el.querySelector('.talk'), sp = speaker(l.who);
  t.className = 'talk' + (l.who === 'sys' ? ' sys' : l.who === 'pd' ? ' pd' : '');
  t.querySelector('.av').style.backgroundImage = sp && sp.face ? `url(${sp.face})` : 'none';
  t.querySelector('.who').innerHTML = sp ? `${esc(sp.name)}<small>${sp.en}</small>` : '';
  typeText(t.querySelector('p'), l.text, pre);
}
/* 한 글자씩 (탭하면 한 번에) */
function typeText(p, text, st) { let i = 0; clearInterval(st.typing); p.textContent = ''; st.full = () => { clearInterval(st.typing); st.typing = 0; p.textContent = text; }; st.typing = setInterval(() => { i++; p.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(st.typing); st.typing = 0; } }, 30); }
function closePre() { if (pre) { clearInterval(pre.typing); clearTimeout(pre.t); } pre = null; }
$('#pre').addEventListener('click', e => {
  const b = e.target.closest('[data-q]');
  if (b) {
    if (b.dataset.q === 'back') return runBack();
    if (b.dataset.q === 'skip' || b.dataset.q === 'cue') { S.pre[day.no] = true; save(); closePre(); A.fxPlay('go', S.sfx * 0.6); stack.pop(); go(); return; }
  }
  if (!pre || $('#pre').classList.contains('end')) return;
  if (pre.typing) return pre.full();
  A.fxPlay('soft', S.sfx * 0.35); preNext();
});

/* ---------- ② 플레이 ---------- */
/* ---------- 캐스트 · 옆자리 게스트 (ONAIR_PLAN 6장 · v0.5) ---------- */
const rosterOf = id => ROSTER.find(r => r.id === id);
/* 합류 = 그 캐스트가 주인공인 화를 끝까지 송출함 (처음 방송한 날 무료 합류) · 시험 모드는 1~10화 캐스트 모두 */
function joined(id) { const r = rosterOf(id); if (!r || !r.join) return false; if (DEV && r.join <= DAYS.length) return true; return DAYS.some(d => d.cast === id && S.book[d.no]); }
function guestId() { return S.guest && joined(S.guest) ? S.guest : null; }
/* 오늘 방송의 연출 테마: 게스트 → 오늘의 캐스트 → 기본 (시험 모드 ?theme= 이 먼저) */
function themeNow() { if (DEV && Q.get('theme') && THEMES[Q.get('theme')]) return Q.get('theme'); const g = guestId(); const t = g ? rosterOf(g).theme : (rosterOf(day.cast) || {}).theme; return t && THEMES[t] ? t : 'base'; }
/* 잠긴 캐스트가 언제 · 어떻게 합류하나 (v0.5.1 · 검수 B-3 · 사업 B-1): 지킬 수 없는 약속 금지
   오늘 = 오늘 방송 끝내면 · 내일 = 내일 · 지난 화 = 지난 방송에서 · 아직 없는 화(join > 들어 있는 화 수) = 「시즌 1 · 곧 합류」 · 메디아 = 시즌 2 */
function joinWhen(r) {
  const st = joinStage(r.join, home.no, DAYS.length), nm = CASTS[r.id].name;
  if (st === 'season2') return { tag: esc(r.note || ''), cls: '', say: `${josa(nm, '은/는')} ${esc(r.note || '다음 시즌')}에 합류해요` };
  if (st === 'soon') return { tag: '시즌 1 · 곧 합류', cls: '', say: `${josa(nm, '은/는')} 시즌 1 뒤쪽 방송에서 곧 합류해요` };
  if (st === 'today') return { tag: '오늘 합류', cls: 'today', say: `오늘 방송을 끝까지 송출하면 ${josa(nm, '이/가')} 합류해요`, face: true };
  if (st === 'next') return { tag: '내일 합류', cls: 'next', say: `${josa(nm, '은/는')} 내일 ${r.join}화 방송에서 합류해요` };
  if (st === 'past') return { tag: `지난 ${r.join}화에서 합류`, cls: 'past', say: `방송 목록에서 지난 ${r.join}화를 끝까지 하면 ${josa(nm, '이/가')} 합류해요` };
  return { tag: `${r.join}화에 합류`, cls: '', say: `${josa(nm, '은/는')} ${r.join}화 방송에서 합류해요` };
}
function openCasts() {
  const g = guestId();
  const cards = ROSTER.map(r => {
    const c = CASTS[r.id], on = joined(r.id), w = on ? null : joinWhen(r), seen = on || (w && w.face) || r.id === 'media' && S.book[10];
    const tag = on ? (g === r.id ? '<span class="tg g">게스트</span>' : '<span class="tg on">합류</span>') : `<span class="tg lock ${w.cls}">${w.tag}</span>`;
    return `<button class="cc ${on ? 'on' : 'lock'} ${g === r.id ? 'guest' : ''} ${w ? w.cls : ''}" data-c="${r.id}" ${on ? '' : 'aria-disabled="true"'}><i style="background-image:url(${c.face});--f:url(${new URL(c.face, location.href).href})" class="${on || seen ? '' : 'sil'}"></i><b>${esc(c.name)}</b><small>${esc(r.bio || c.gen)}</small>${tag}</button>`;
  }).join('');
  const gc = g ? CASTS[g] : null;
  $('#casts').innerHTML = `
    <div class="top"><button class="ic" data-x="back" aria-label="뒤로"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><div class="logo">캐스트</div><span style="width:36px"></span></div>
    <div class="ttl"><em>${GAME.studio} · 시즌 1</em><b>캐스트 ${ROSTER.filter(r => joined(r.id)).length} / ${ROSTER.length}명 합류</b><span>합류한 캐스트를 옆자리 게스트로 앉히면 방송 연출과 사고 수습이 그 캐스트 것으로 바뀌어요 · 점수에는 영향 없어요</span></div>
    <div class="gs ${gc ? 'has' : ''}">${gc ? `<i style="background-image:url(${gc.face})"></i><div><em>옆자리 게스트</em><b>${esc(gc.name)}<small>연출 · ${esc(THEMES[rosterOf(g).theme].name.replace(/^[^·]+· /, ''))}</small></b><q>${esc(gc.fix)}</q></div><button data-x="clear">비우기</button>` : '<div><em>옆자리 게스트</em><b>비어 있어요</b><q>비어 있으면 오늘의 캐스트 연출로 방송해요</q></div>'}</div>
    <div class="grid">${cards}</div>`;
  show('casts');
  /* 게스트 수습 대사가 두 줄이면 게스트 칸이 커짐 → 목록은 그 아래에서 시작 (겹침 없음) */
  { const gs = $('#casts .gs'); $('#casts .grid').style.top = `${gs.offsetTop + gs.offsetHeight + 10}px`; }
}
$('#casts').addEventListener('click', e => {
  const b = e.target.closest('[data-x],[data-c]'); if (!b) return;
  if (b.dataset.x === 'back') return runBack();
  if (b.dataset.x === 'clear') { S.guest = null; save(); A.fxPlay('tick', S.sfx * 0.5); return openCasts(); }
  const id = b.dataset.c; if (!id) return;
  if (!joined(id)) return toast(joinWhen(rosterOf(id)).say, 2400);
  S.guest = S.guest === id ? null : id; save(); A.fxPlay('tick', S.sfx * 0.6);
  if (S.guest) toast(`${josa(CASTS[id].name, '이/가')} 옆자리 게스트로 앉았어요`);
  stack.pop(); openCasts();
});

function go() {
  A.stopPreview();
  const dv = CASTS[day.cast], gid = guestId(), gc = gid ? CASTS[gid] : dv;
  /* 처음 보는 노트 · 첫 판 안내 (한 장) */
  const ch = charts[song.id], here = new Set(ch.diffs[S.diff].notes.map(n => n[3]).filter(Boolean));
  const guides = Q.get('guide') === '0' ? [] : guidesFor(here);   /* 한 판에 최대 두 가지 (검수 C-2) */
  show('play');
  Play.auto = Q.get('auto') ? { jitter: +(Q.get('jitter') || 18), miss: +(Q.get('miss') || 0), dom: Q.get('auto') === 'dom' } : null;
  Play.start({
    song, chart: charts[song.id], diff: S.diff, entry, offset: S.offset, speed: S.speed, shake: S.shake, sfx: S.sfx,
    hitsnd: S.hitsnd, el: S.el, lite: S.lite, vib: S.vib !== false, theme: DEV && Q.get('theme') ? themeNow() : DEV && THEMES[S.theme] && S.theme !== 'base' ? S.theme : themeNow(),
    guides,   /* ?guide=0 이면 끔 · 시험 도구 */
    guards: S.guard === false ? 0 : 1, firstSc: !S.seen.scHit,   /* 사고 수습 한 판 1회 · 설정에서 끔(명예의 전당 도전) · 구독자 단계는 v0.6 */
    cover: day.hero, diva: { ...dv, name: singer(day), fix: gc.fix || dv.fix, face: gid ? gc.face : dv.face, en: gid ? gc.en : dv.en }, chapter: `${day.no}화 · ${day.chapter}`, cheer: CHEER, live: day.live, subs: day.subs,
    helper: { name: gc.name, en: gc.en, face: gc.face, fix: gc.fix || dv.fix },   /* 수습하는 캐스트 = 게스트(없으면 오늘의 캐스트) */
    themeLine: gid && gid !== day.cast && THEMES[rosterOf(gid).theme] ? `연출 · ${THEMES[rosterOf(gid).theme].name}` : '',
    guestHello: gid && gid !== day.cast && rosterOf(gid).guest ? { name: gc.name, text: rosterOf(gid).guest } : null,
    /* 안내 '봤음'은 READY 를 지난 뒤 저장 (안내 중에 나가면 다음 판에 다시 · 검수 C-1) */
    onReady: () => { if (!guides.length) return; if (guides.includes('lane')) S.guide = true; for (const k of guides) S.seen[k] = true; save(); },
    onPause: () => pauseMenu(), onEnd: r => onResult(r),
  });
  try { window.parent.postMessage({ type: 'oad:track', name: 'play', p: { diff: S.diff, day: day.no, song: song.id, past: past(), guest: gid || null } }, '*'); } catch { /* */ }
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
  r.sc = [Play.scGot, Play.scTotal]; r.scSum = Play.scSum; if (Play.scGot) S.seen.scHit = true;
  const gid = guestId(); r.helper = gid ? CASTS[gid].name : CASTS[day.cast].name;
  castLog([day.cast, gid], r);   /* 캐스트별 함께한 방송 (사업 B-2 · 화면 노출 없음 · v0.6 구독자 소급) */
  /* 명예의 전당(원어데이 공용): 수습한 판은 assisted → 순위에 안 올라감 (ONAIR_PLAN 6장 순위 공정성) */
  if (bm.info.ok) bm.submitScore(r.score, { assisted: r.guard > 0 }).catch(() => { /* */ });
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
  const { r, nb } = last, dv = CASTS[day.cast], b = (S.best[song.id] || {})[last.diff];
  const praise = r.ap ? PRAISE.ap : r.fc ? PRAISE.fc : nb ? PRAISE.best : pick(PRAISE[r.rank]);
  $('#result').innerHTML = `
    <div class="bgcov" style="background-image:url(${day.hero})"></div>
    <div class="head"><em>${last.diff.toUpperCase()} · LV.${charts[song.id].diffs[last.diff].lv}</em><b>${esc(song.title)}</b><span>${esc(song.artist)} · 노래 ${esc(singer(day))}</span></div>
    <div class="rank r-${r.rank}"><span class="rk"><i class="ring"></i><b>${r.rank}</b><span class="shine"></span>${r.rank === 'S' || r.rank === 'SS' ? sparks() : ''}</span><div class="tags">${r.ap ? '<span>ALL PERFECT</span>' : r.fc ? '<span>FULL COMBO</span>' : ''}${nb ? '<span class="nb">NEW RECORD</span>' : ''}</div></div>
    <div class="score"><b class="tnum" id="r_sc">0</b><span>정확도 ${(r.acc * 100).toFixed(2)}%</span></div>
    <div class="grid"><div class="p"><em>PERFECT</em><b>${r.count.perfect}</b></div><div class="g"><em>GREAT</em><b>${r.count.great}</b></div><div class="d"><em>GOOD</em><b>${r.count.good}</b></div><div class="m"><em>MISS</em><b>${r.count.miss}</b></div></div>
    <div class="line2"><span>최고 콤보<b>${r.maxCombo}</b></span><span>FAST<b>${r.fast}</b> · SLOW<b>${r.slow}</b></span></div>
    <div class="low">
    <div class="say"><div class="av" style="background-image:url(${dv.face})"></div><div class="bub"><i>${dv.en}</i>${esc(praise)}</div></div>
    ${b ? `<div class="best">이 난이도 최고 <b>${b.score.toLocaleString('en-US')}</b> · ${b.rank}</div>` : ''}${syncHint(r)}
    <div class="extra">${r.sc && r.sc[1] ? `<span class="scg${r.sc[0] === r.sc[1] ? ' full' : ''}"><i>₩</i>받은 슈퍼챗 <b>${r.sc[0]}/${r.sc[1]}</b>${r.scSum ? ` · ₩${r.scSum.toLocaleString('en-US')}` : ''}</span>` : ''}${r.guard ? `<span class="gdl">${esc(josa(r.helper, '이/가'))} ${r.guard > 1 ? `${r.guard}번` : '한 번'} 수습해 줬어요 · 점수는 그대로</span>` : ''}</div>
    <div class="subs"><span>${GAME.studio} 구독자</span><b class="tnum" id="r_subs">${day.subs[0].toLocaleString('en-US')}</b><i>▲ ${(day.subs[1] - day.subs[0]).toLocaleString('en-US')}</i></div>
    </div>
    <div class="btns"><button class="sec" data-n="again">한 번 더<small>${retryLabel()}</small></button><button class="pri" data-n="story">${last.firstClear ? '개인 채널 열기' : '개인 채널 다시 보기'}</button></div>`;
  /* 점수 올라가는 연출 */
  const el = $('#r_sc'), t0 = performance.now();
  const up = () => { const k = Math.min(1, (performance.now() - t0) / 1100), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(r.score * e).toLocaleString('en-US'); if (k < 1) requestAnimationFrame(up); };
  setTimeout(up, 350);
  /* 구독자 숫자 올라감 (이야기상 숫자 · 실력과 무관) */
  const se = $('#r_subs'), [s0, s1] = day.subs, t1 = performance.now() + 1300;
  const su = () => { const k = Math.min(1, Math.max(0, (performance.now() - t1) / 1200)), e = 1 - Math.pow(1 - k, 3); se.textContent = Math.round(s0 + (s1 - s0) * e).toLocaleString('en-US'); if (k < 1) requestAnimationFrame(su); };
  requestAnimationFrame(su);
  A.fxPlay('chime', S.sfx * 0.6);
}
/* S 이상: 등급 주변으로 퍼지는 금빛 알갱이 (CSS 만) */
function sparks() { let h = ''; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + Math.random() * 0.3, r = 70 + Math.random() * 60; h += `<i class="sp" style="left:50%;top:50%;--dx:${(Math.cos(a) * r).toFixed(0)}px;--dy:${(Math.sin(a) * r * 0.8).toFixed(0)}px;animation-delay:${(0.75 + Math.random() * 0.4).toFixed(2)}s"></i>`; } return h; }
/* 판정이 한쪽으로 쏠리면 싱크 맞추기 권함 (부드럽게) */
function syncHint(r) { const n = r.fast + r.slow; if (n < 12) return ''; const k = (r.slow - r.fast) / n; return Math.abs(k) > 0.55 ? `<div class="synch">${k > 0 ? '조금 늦게' : '조금 빠르게'} 누르는 편이에요 · 싱크 맞추기를 해 보세요</div>` : ''; }
$('#result').addEventListener('click', e => { const b = e.target.closest('[data-n]'); if (!b) return; if (b.dataset.n === 'story') openStory(); if (b.dataset.n === 'again') { show('today', 'root'); $('#t_start').click(); } });

/* ---------- ④ 개인 채널 (방송 후 DM · 오늘의 조각) — id 는 v0.3 그대로 #story ---------- */
let dm = null;
function dmHead(D) {
  if (D.with === 'group') return `<div class="gav">${['miyu', 'bella', 'tina', 'moa', 'edel'].map(k => `<i style="background-image:url(${CASTS[k].face})"></i>`).join('')}</div><div class="nm"><b>${esc(D.title || '단톡방')}</b><small>캐스트 7명 · 대표</small></div>`;
  const c = CASTS[D.with]; return `<div class="av" style="background-image:url(${c.face})"></div><div class="nm"><b>${esc(c.name)}</b><small>${D.with === 'media' ? '오르골 · 처음 온 메시지' : '진짜 이름 ○○○ · 조각 4장을 모으면 공개'}</small></div>`;
}
function bubble(l, D) {
  if (l.who === 'pd') return `<div class="mb me"><p>${esc(l.text)}</p></div>`;
  const c = CASTS[l.who], g = D.with === 'group' || l.who !== D.with;
  return `<div class="mb"><i class="av" style="background-image:url(${c.face})"></i><div>${g ? `<small>${esc(c.name)}</small>` : ''}<p>${esc(l.text)}</p></div></div>`;
}
function openStory(replay = false) {
  const D = day.dm, r = last ? last.r : null, pc = D.piece;
  $('#story').className = 'scr dm';
  $('#story').innerHTML = `
    <div class="top"><button class="ic" data-s="back" aria-label="뒤로"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><div class="head">${dmHead(D)}</div><span class="ep">${day.no}화</span></div>
    ${r ? `<div class="res"><div class="gr ${r.rank === 'S' || r.rank === 'SS' ? 'gold' : ''}">${r.rank}</div><div class="sc"><b class="tnum">${r.score.toLocaleString('en-US')}</b><span>방송 끝 · 최고 콤보 ${r.maxCombo}</span></div><div class="rk">구독자<b class="tnum">${day.subs[1].toLocaleString('en-US')}</b></div></div>` : ''}
    <div class="msgs"><div class="day">방송 후 · ${esc(day.chapter)}</div></div>
    <div class="choice"></div>
    <div class="btns"><button class="sec" data-s="share">공유</button><button class="pri" data-s="book">방송 기록</button></div>`;
  show('story');
  dm = { i: 0, phase: 'lines', t: 0, picked: S.dm[day.no] };
  if (replay) return dmAll();
  dm.t = setTimeout(dmStep, 500);
}
/* 한 줄씩: 입력 중 점 → 말풍선 (탭하면 바로 다음) */
function dmStep() {
  if (!dm) return;
  const D = day.dm, box = $('#story .msgs'); if (!box) return;
  clearTimeout(dm.t);
  const list = dm.phase === 'lines' ? D.lines : D.after;
  if (dm.i < list.length) {
    box.insertAdjacentHTML('beforeend', bubble(list[dm.i++], D)); A.fxPlay('soft', S.sfx * 0.4); box.scrollTop = box.scrollHeight;
    dm.t = setTimeout(dmStep, 1100); return;
  }
  if (dm.phase === 'lines') {   /* 고르기 (어느 쪽이든 다음 대사는 같음) */
    dm.phase = 'choice';
    $('#story .choice').innerHTML = D.choice.map((c, i) => `<button data-c="${i}">${esc(c)}</button>`).join('');
    $('#story .choice').classList.add('on'); return;
  }
  if (dm.phase === 'after') { dm.phase = 'end'; dmEnd(); }
}
function dmPick(i) {
  if (!dm || dm.phase !== 'choice') return;
  const D = day.dm; S.dm[day.no] = i; save();
  $('#story .choice').classList.remove('on');
  const box = $('#story .msgs'); box.insertAdjacentHTML('beforeend', bubble({ who: 'pd', text: D.choice[i] }, D)); box.scrollTop = box.scrollHeight;
  A.fxPlay('tick', S.sfx * 0.5);
  dm.phase = 'after'; dm.i = 0; dm.t = setTimeout(dmStep, 700);
}
function pieceHTML() {
  const pc = day.dm.piece, c = CASTS[day.cast];
  return `<div class="piece"><div class="ph" style="background-image:url(${pc.img})"></div><div class="tx"><em>오늘의 조각${pc.step ? ` ${pc.step}/4 · ${esc(c.name)}` : ' · 하루 스튜디오'}</em><p>${esc(pc.caption)}</p></div></div>
    <div class="tmr2"><div class="fc" style="background-image:url(${CASTS[day.tomorrow.who].face})"></div><div><em>내일 예고 · ${day.no + 1}화</em><b>${esc(day.tomorrow.title)}</b><q>${esc(day.tomorrow.text)}</q></div></div>`;
}
function dmEnd() {
  const box = $('#story .msgs'); box.insertAdjacentHTML('beforeend', pieceHTML());
  $('#story').classList.add('end'); A.fxPlay('page', S.sfx);
  setTimeout(() => { box.scrollTop = box.scrollHeight; }, 50);
}
/* 다시 보기: 전부 한 번에 */
function dmAll() {
  const D = day.dm, box = $('#story .msgs'), ch = S.dm[day.no] ?? 0;
  box.insertAdjacentHTML('beforeend', D.lines.map(l => bubble(l, D)).join('') + bubble({ who: 'pd', text: D.choice[ch] }, D) + D.after.map(l => bubble(l, D)).join(''));
  dm.phase = 'end'; dmEnd();
}
function closeDM() { if (dm) clearTimeout(dm.t); dm = null; }
$('#story').addEventListener('click', e => {
  const b = e.target.closest('[data-s],[data-c]');
  if (b) { if (b.dataset.c != null) return dmPick(+b.dataset.c); if (b.dataset.s === 'book') openBook(); if (b.dataset.s === 'share') share(); if (b.dataset.s === 'back') runBack(); return; }
  if (dm && dm.phase !== 'choice' && dm.phase !== 'end') dmStep();   /* 탭하면 다음 말풍선 바로 */
});
async function share() {
  const r = last && last.r, txt = `${GAME.name} ${day.no}화 · ${song.title}${r ? ` · ${r.rank} · 콤보 ${r.maxCombo}` : ''} — 오늘 밤도 한 곡, 끝까지 송출`;
  try { if (navigator.share) { await navigator.share({ text: txt }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(txt); toast('공유 문구를 복사했어요'); } catch { toast(txt, 3000); }
}

/* ---------- ⑤ 방송 기록 + 내일 예고 ---------- */
let cdT = 0;
function openBook() {
  const n = Object.keys(S.book).length, tm = home.tomorrow, dv = CASTS[tm.who];
  const pages = []; for (let k = 1; k <= SEASON.pages; k++) { const pg = S.book[k], d = DAYS[k - 1]; if (pg && d) pages.push(`<button class="pg has f-${foil(pg.rank)}" data-p="${k}" style="background-image:url(${d.cut})"><b>${k}</b><i>${pg.rank}</i></button>`); else if (k === home.no + 1) pages.push(`<div class="pg next"><span>내일</span><b>${k}</b></div>`); else pages.push(`<div class="pg"><b>${k}</b></div>`); }
  $('#book').innerHTML = `
    <div class="top"><button class="ic" data-b="back" aria-label="뒤로"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><div class="logo">방송 기록</div><span style="width:36px"></span></div>
    <div class="ttl"><em>SEASON ${SEASON.no}</em><b>${SEASON.title}</b><span>${GAME.studio} 생방송 ${n} / ${SEASON.pages}회 · S 이상은 금박, A는 은박</span><div class="bar"><i style="width:${n / SEASON.pages * 100}%"></i></div></div>
    <div class="tmr"><div class="im" style="background-image:url(${tm.img})"></div><div class="fc" style="background-image:url(${dv.face})"></div><div class="in"><em>내일 예고 · ${home.no + 1}화</em><b>${esc(tm.title)}</b><q>${esc(tm.text)}</q><div class="cd"><small>다음 방송까지</small><span id="b_cd"></span></div></div></div>
    <div class="pages">${pages.join('')}</div>
    <div class="btns"><button class="sec" data-b="share">공유</button><button class="ice" data-b="home">오늘의 방송으로</button></div>`;
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

/* ---------- 방송 목록: 열린 화의 곡 다시 고르기 (오늘 방송이 맨 위) ---------- */
function openStages() {
  const open = d => DEV || d.no <= home.no;
  const rows = DAYS.slice().sort((a, b) => (b === home) - (a === home) || a.no - b.no).map(d => {
    const sg = SONGS[d.song], dv = CASTS[d.cast], best = S.best[sg.id] || {}, ch = charts[sg.id];
    const bx = ['hard', 'normal', 'easy'].map(x => best[x]).find(Boolean), rk = bx && bx.rank;   /* 「수습」 표시는 순위표에만 (검수 B-4) */
    if (!open(d)) return `<div class="st lock"><div class="cv"><span>${d.no}</span></div><div class="tx"><em>NO.${String(d.no).padStart(3, '0')} · ${d.no - home.no}일 뒤</em><b>???</b><span>${dv.name}의 방송 · 아직 열리지 않았어요</span></div></div>`;
    return `<button class="st ${d === home ? 'today' : ''} ${d === day ? 'cur' : ''}" data-s="${d.no}"><div class="cv" style="background-image:url(${d.cut})"></div><div class="tx"><em>${d === home ? 'TODAY' : 'NO.' + String(d.no).padStart(3, '0')} · ${esc(sg.tier)}</em><b>${esc(sg.title)}</b><span>${esc(singer(d))} · ${d.chapter}</span></div><div class="rk">${rk ? `<b>${rk}</b>` : ''}<small>${ch ? `LV.${ch.diffs.easy.lv}~${ch.diffs.hard.lv}` : ''}</small></div></button>`;
  }).join('');
  $('#stages').innerHTML = `
    <div class="top"><button class="ic" data-g="back" aria-label="뒤로"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><div class="logo">방송 목록</div><span style="width:36px"></span></div>
    <div class="ttl"><em>SEASON ${SEASON.no} · ${SEASON.title}</em><b>오늘 밤 한 곡, 지난 방송도 다시</b><span>${DEV ? '시험 모드 · 10곡 모두 열림' : `${home.no}화까지 열렸어요 · 매일 아침 7시에 편성표가 바뀌어요`}</span></div>
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
    <div class="row"><span>사고 수습<small>MISS 한 번은 캐스트가 콤보를 이어 줘요 · 끄면 명예의 전당 도전</small></span><button class="tg ${S.guard !== false ? 'on' : ''}" data-k="guard"></button></div>
    <div class="row"><span>진동<small>슈퍼챗 · 큐 · 페이더 · 수습 때 짧게 (안드로이드)</small></span><button class="tg ${S.vib !== false ? 'on' : ''}" data-k="vib"></button></div>
    <div class="row"><span>화면 흔들림<small>100콤보 · 풀콤보 때 아주 살짝</small></span><button class="tg ${S.shake ? 'on' : ''}" data-k="shake"></button></div>
    <div class="row"><span>연출 줄이기<small>오래된 폰 · 배터리 아끼기 (파티클 · 빛기둥 끔)</small></span><button class="tg ${S.lite ? 'on' : ''}" data-k="lite"></button></div>
    ${DEV ? `<div class="row"><span>연출 테마 <small>시험 모드 · 캐스트 테마 미리보기</small></span><button class="pill3" data-k="theme">${esc((THEMES[S.theme] || THEMES.base).name)}</button></div>` : ''}
    <div class="cred"><b>${GAME.name}</b> · ${GAME.studio}<br><b>음악</b> Suno 로 만든 오리지널 곡 10곡 (회사 유료 구독 · 상업 이용)<br><b>캐릭터 원화</b> 그라나사 (권리자 허락) · <b>채보 · 화면</b> 원어데이<br>키보드: D F J K</div>
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
  if (k === 'guard') S.guard = S.guard === false;
  if (k === 'vib') { S.vib = S.vib === false; if (S.vib && navigator.vibrate) try { navigator.vibrate(15); } catch { /* */ } }
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
    <div class="ttl"><b>소리에 맞춰 두드려 주세요</b><span>‘톡’ 소리가 들리는 순간 화면 아무 곳이나 8번.<br>이어폰을 쓰면 이어폰을 낀 채로 맞춰 주세요.<br>한 번만 맞추면 모든 곡에 적용돼요.</span></div>
    <div class="pad" data-c="tap"></div>
    <div class="ring"><i></i><b>0</b><small>/ 8</small></div>
    <div class="cdone"><em>SYNC</em><b id="c_dv"></b><span id="c_ds"></span><button data-c="again">다시 재기</button></div>
    <div class="dots">${'<i></i>'.repeat(8)}</div>
    <div class="val">지금 싱크 <b id="c_v">${S.offset > 0 ? '+' : ''}${S.offset}</b>ms</div>
    <div class="adj"><button data-c="-">−5</button><button data-c="reset">0</button><button data-c="+">+5</button></div>
    <div class="btns"><button class="ice" data-c="done" style="flex:1">완료</button></div>`;
  show('calib');
  calStart();
}
/* 120 BPM 메트로놈 — 오디오 시계로 미리 예약 (멈출 때 예약한 소리도 취소) */
function calStart() {
  const ac = A.ac, spb = 0.5;
  if (cal) { clearInterval(cal.iv); cancelAnimationFrame(cal.raf); clearTimeout(cal.closeT); for (const x of cal.srcs) { try { x.stop(); } catch { /* */ } } }
  cal = { t0: ac.currentTime + 0.6, k: 0, taps: [], raf: 0, iv: 0, lastBeat: -1, srcs: [], done: false, closeT: 0, id: (calStart.n = (calStart.n || 0) + 1) };
  $('#calib').classList.remove('done');
  const ring = $('#calib .ring'); ring.querySelector('b').textContent = 0; $('#calib .dots').querySelectorAll('i').forEach(x => x.classList.remove('on'));
  const sched = () => { while (cal && !cal.done && cal.t0 + cal.k * spb < ac.currentTime + 1.2) { const x = A.fxPlay(cal.k % 4 ? 'tock' : 'tick', 0.9, cal.t0 + cal.k * spb); if (x) cal.srcs.push(x); cal.k++; } if (cal.srcs.length > 16) cal.srcs.splice(0, cal.srcs.length - 16); };
  sched(); cal.iv = setInterval(sched, 200);
  const frame = () => { if (!cal || cal.done) return; cal.raf = requestAnimationFrame(frame); A.sample(); const b = Math.floor((A.heard() - cal.t0) / spb); if (b >= 0 && b !== cal.lastBeat) { cal.lastBeat = b; const i = $('#calib .ring i'); if (i) { i.classList.remove('go'); void i.offsetWidth; i.classList.add('go'); } } };
  frame();
}
function calTap(e) {
  if (!cal || cal.done) return;
  const h = A.heard(Play.evMs(e)), k = Math.round((h - cal.t0) / 0.5), d = h - (cal.t0 + k * 0.5);
  if (k < 1 || Math.abs(d) > 0.25) return;
  cal.taps.push(d * 1000);
  const ring = $('#calib .ring'); ring.querySelector('b').textContent = Math.min(8, cal.taps.length); ring.classList.add('tap'); setTimeout(() => ring.classList.remove('tap'), 90);
  $('#calib .dots').querySelectorAll('i').forEach((x, i) => x.classList.toggle('on', i < cal.taps.length));
  if (cal.taps.length >= 8) {
    const t = cal.taps.slice(-8).sort((a, b) => a - b), med = (t[3] + t[4]) / 2;
    S.offset = Math.max(-300, Math.min(300, Math.round(med / 5) * 5)); S.calibrated = true; save();
    $('#c_v').textContent = (S.offset > 0 ? '+' : '') + S.offset;
    calDone();
  }
}
/* 8번 채움 (v0.5.2 · 대표 폰: 끝난 줄 모름) → 메트로놈 멈춤 · 링 자리에 「싱크를 ○ms 로 맞췄어요」 크게 · 1.2초 뒤 이전 화면으로(뒤로와 같은 길)
   그 사이 「다시 재기」면 닫지 않고 다시 잼 · 타이머는 그 측정(id)이 아직 이 화면에 있을 때만 닫음 (화면을 떠난 뒤 엉뚱한 화면을 닫지 않게) */
const CAL_CLOSE_MS = 1200;
function calDone() {
  cal.done = true; clearInterval(cal.iv); cancelAnimationFrame(cal.raf); for (const x of cal.srcs) { try { x.stop(); } catch { /* */ } }
  $('#c_dv').textContent = `${S.offset > 0 ? '+' : S.offset < 0 ? '' : '±'}${S.offset}ms`; $('#c_ds').textContent = `싱크를 ${S.offset > 0 ? '+' : ''}${S.offset}ms 로 맞췄어요 · 곧 이전 화면으로`;
  $('#calib').classList.add('done'); A.fxPlay('chime', S.sfx * 0.5);
  const id = cal.id; cal.closeT = setTimeout(() => { if (cal && cal.id === id && cal.done && cur() === 'calib') runBack(); }, CAL_CLOSE_MS);
}
function closeCalib() { if (!cal) return; clearInterval(cal.iv); cancelAnimationFrame(cal.raf); clearTimeout(cal.closeT); for (const x of cal.srcs) { try { x.stop(); } catch { /* */ } } cal = null; $('#calib').classList.remove('done'); }
$('#calib').addEventListener('pointerdown', e => { if (e.target.closest('[data-c="tap"]') || e.target.closest('.ring')) calTap(e); });
$('#calib').addEventListener('click', e => {
  const b = e.target.closest('[data-c]'); if (!b || b.dataset.c === 'tap') return;
  const c = b.dataset.c;
  if (c === '-' || c === '+') S.offset = Math.max(-300, Math.min(300, S.offset + (c === '+' ? 5 : -5)));
  if (c === 'reset') S.offset = 0;
  if (c === 'again') { calStart(); return; }
  if (c === 'back' || c === 'done') { save(); return runBack(); }
  save(); $('#c_v').textContent = (S.offset > 0 ? '+' : '') + S.offset;
});

/* ---------- 뒤로가기: 창 → 시트 → 화면 하나 전 → 첫 화면이면 원어데이로 ---------- */
function back() {
  if ($('#modal.on')) { const m = $('#modal'); if (m.querySelector('[data-a=go]')) m.querySelector('[data-a=go]').click(); else if (m.querySelector('.cnt')) { /* 3·2·1 중엔 기다림 */ } else closeModal(); return true; }
  if ($('#sheet.on')) { closeSheet(); return true; }
  const c = cur();
  if (c === 'play') { pauseMenu(); return true; }
  if (c === 'today' && stack.length === 1 && past()) { setDay(home); return true; }   /* 지난 방송을 보다가 뒤로 = 오늘의 방송으로 */
  if (c === 'calib') closeCalib();
  if (c === 'pre') closePre();
  if (c === 'story') closeDM();
  if (c === 'book') clearInterval(cdT);
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
/* 결과 화면 줄 겹침 시험용 (tools/layout_check.mjs): r · 신기록 여부를 넣어 결과를 그림 */
function testResult(r, nb = false) { last = { r, nb, firstClear: false, newPage: false, diff: S.diff }; renderResult(); show('result', 'root'); }
window.__ot = { S, Play, testResult, openCalib, CAL_CLOSE_MS, get cal() { return cal; }, A, show, back, get stack() { return stack; }, get last() { return last; }, get day() { return day; }, get home() { return home; }, get entry() { return entry; }, openCasts, joined, go, openStory, openBook, openStages, setDay, onResult, dayKey };
