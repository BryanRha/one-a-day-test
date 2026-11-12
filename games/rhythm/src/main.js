// 프로듀서 온에어 — 화면 흐름: 오늘의 방송 → 방송 전(화면 밖) → 생방송(리듬 플레이) → 결과 → 개인 채널(DM · 오늘의 조각) → 방송 기록(내일 예고)
//   곡 이용(v0.5.4 · 대표 11-12): 열린 화(오늘까지)의 곡은 누구나 · 모든 난이도 · 몇 번이든 바로 시작 · 새 화는 하루 하나 · 놓친 화는 차례대로 따라잡기 (access.js)
//   방송 목록: 열린 화마다 난이도 세 칸(기록 · 누르면 바로 시작) · ?dev=1 이면 10곡 전부 · ?day=7 이면 오늘 = 7화 (따라잡기 없이 그 화로 바로)
//   뒤로가기 = 바로 전 단계 (원어데이 oad:back · CloseWatcher · PC Esc)
import { A } from './audio.js?v=0.99.39';
import { Play } from './play.js?v=0.99.39';
import { SONGS, DAYS, CASTS, PRAISE, CHEER, SEASON, GAME, ROSTER, CARDS, CHANNEL, FACE, AWK, CAST_CHEER, josa, joinStage } from './data.js?v=0.99.39';
import { S, load, save, today, dayNo, dayRaw, record, pageIn, foil, nextOpen, dayKey, castLog, guidesFor, DEV, EP } from './save.js?v=0.99.39';
import * as CH from './channel.js?v=0.99.39';
import { isOpen, nextUp, behind, epKind } from './access.js?v=0.99.39';
import { installBack, exitToOAD, inOAD, runBack } from './oad.js?v=0.99.39';
import { bm } from './oad_bm.js?v=0.99.39';
import { THEMES } from './themes.js?v=0.99.39';

const $ = s => document.querySelector(s);
const Q = new URLSearchParams(location.search);
const VER = 'v0.7.1';   /* 게임 안 버전 표시 (설정 시트 맨 아래) */
const DIFFS = [['easy', '쉬움'], ['normal', '보통'], ['hard', '어려움']];
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtT = t => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
let charts = {}, entry = null, day = null, song = null, last = null, home = null, encore = null;
/* 앵콜 방송 (v0.6 · 대표 11-12): 시즌 마지막 화 다음 날부터 열린 화를 1화부터 차례로 '오늘' 자리에 (home 은 마지막 화 그대로 — 열림 규칙은 home 기준) */
const tonight = () => encore || home;
const past = () => day !== tonight();   /* 지금 보는 곡이 오늘 방송이 아닌가 (뒤로 = 오늘 방송으로) */
const kind = () => (encore && day === encore ? 'encore' : epKind(day.no, home.no, S.book));   /* tonight · encore · catchup(놓친 화 첫 방송) · replay · ahead(시험 모드) */
const upNext = () => { const n = nextUp(home.no, S.book); return n === home.no ? tonight() : DAYS[n - 1]; };   /* 다음 차례: 놓친 화가 있으면 가장 앞 화 · 없으면 오늘 방송 */
const DNAME = Object.fromEntries(DIFFS);
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
  const k = kind(), late = behind(home.no, S.book);
  $('#t_no').textContent = `${{ tonight: 'TONIGHT', encore: 'ENCORE', catchup: '이어 보기', replay: 'REPLAY', ahead: 'PREVIEW' }[k]} · NO.${String(day.no).padStart(3, '0')}`;
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
  /* 말풍선은 두 줄까지 (검수 v0.5.4 B-1 — 한 줄 고정이라 6개 화에서 잘렸음 · 글자 수 잣대는 test_logic 11-2 · 실제 넘침은 layout_check) */
  $('#t_hello').textContent = k === 'catchup' ? `${day.no}화부터 차례로 같이 가요.` : k === 'tonight' && t.plays ? '또 와 주셨네요. 몇 번이든, 어느 난이도로든 다시 가요.' : day.hello;
  /* 진행 점: 끝낸 화 · 지금 보는 화 · 오늘 화(따라잡는 중이면 테두리로 — 검수 B-2) */
  $('#t_steps').innerHTML = DAYS.map((_, i) => `<i class="${S.book[i + 1] ? 'on' : i + 1 === day.no ? 'now' : ''}${i + 1 === tonight().no && i + 1 !== day.no ? ' today' : ''}"></i>`).join('');
  $('#t_diff').innerHTML = DIFFS.map(([d, n]) => { const b = (S.best[song.id] || {})[d]; return `<button data-d="${d}" class="${S.diff === d ? 'on' : ''}"><span>${n}</span><b>LV.${ch.diffs[d].lv}</b>${b ? `<small>${b.rank}${b.ap ? ' · AP' : b.fc ? ' · FC' : ''}</small>` : ''}</button>`; }).join('');
  /* 안내 한 줄: 놓친 화가 있으면 '쌓여 있는 이어 볼 거리'로 (벌이 아니라) · 이어 보기 화면엔 오늘 화로 가는 길, 오늘 화면엔 이어 보기로 가는 길 (검수 v0.5.4 B-2) */
  const tn = tonight(), hb = (late && (k === 'catchup' || day === tn)) ? (k === 'catchup' ? `<button class="go" data-go="today">오늘 ${tn.no}화 먼저</button>` : `<button class="go" data-go="next">이어 보기</button>`) : '';
  const encTo = k === 'encore' ? CASTS[CH.targetOf(day, guestId(), isJoinable)].name : '';
  $('#t_hint span').textContent = k === 'catchup' ? `쉬는 동안 ${late}편이 열렸어요 · ${day.no}화부터 차례로` : day === tn && late ? `${nextUp(home.no, S.book)}화부터 놓친 방송 ${late}편이 쌓여 있어요` : k === 'encore' ? (t.enc ? '오늘 앵콜 보너스는 받았어요 · 몇 번이든 다시' : `앵콜 방송 · 오늘 처음 끝까지 하면 ${josa(encTo, '이/가')} 기뻐해요`) : S.book[day.no] ? (['S', 'SS'].includes(S.book[day.no].rank) ? `${day.no}화 방송은 금박으로 방송 기록에 있어요` : `${day.no}화 방송은 방송 기록에 있어요 · S 이상이면 금박 테두리`) : `끝까지 송출하면 ${dv.name}의 개인 채널과 오늘의 조각이 열려요`;
  { const h = $('#t_hint'), o = h.querySelector('.go'); if (o) o.remove(); if (hb) h.insertAdjacentHTML('beforeend', hb); }
  const st = $('#t_start'); st.className = 'start onair';
  if (k === 'catchup') st.innerHTML = `<b><i class="lamp"></i>${day.no}화 첫 방송</b><span>차례로 이어 보기</span>`;
  else if (k === 'encore') st.innerHTML = `<b><i class="lamp"></i>${t.plays ? '한 번 더 앵콜' : '앵콜 방송 시작'}</b><span>${DNAME[S.diff]} · 몇 번이든</span>`;
  else if (k !== 'tonight') st.innerHTML = `<b>다시 방송하기</b><span>${DNAME[S.diff]} · 몇 번이든</span>`;
  else if (!t.plays) st.innerHTML = `<b><i class="lamp"></i>생방송 시작</b><span>${DNAME[S.diff]} · 몇 번이든</span>`;
  else st.innerHTML = `<b><i class="lamp"></i>한 번 더 송출</b><span>${DNAME[S.diff]} · 몇 번이든</span>`;
  $('#t_list').classList.toggle('dot', (k === 'tonight' || k === 'encore') && (!t.plays || late > 0));
  $('#t_cast').classList.toggle('dot', castDot());
  if (entry && A.ac && A.ac.state === 'running' && !A.pv && !Play.on) A.preview(entry, ...song.preview);
}
$('#t_diff').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.diff = b.dataset.d; save(); A.fxPlay('tick', S.sfx * 0.5); renderToday(); });
/* 이어 보기 ↔ 오늘 방송 (검수 B-2) */
$('#t_hint').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b) return; A.fxPlay('tick', S.sfx * 0.5); setDay(b.dataset.go === 'today' ? tonight() : upNext()); });
$('#t_back').addEventListener('click', () => { if (inOAD) exitToOAD(); else toast('원어데이 앱 안에서는 원어데이로 돌아가요'); });
$('#t_book').addEventListener('click', () => openBook());
$('#t_guest').addEventListener('click', e => { e.stopPropagation(); openCasts(); });
$('#t_cast').addEventListener('click', () => openCasts());
$('#t_sync').addEventListener('click', () => openSheet());
/* 시작: 열린 화는 값 · 확인 창 없이 바로 (v0.5.4 — 오늘 화 · 놓친 화 · 지난 화 모두 같음) */
$('#t_start').addEventListener('click', async () => {
  await A.unlock();
  if (!entry) { toast('음악을 불러오는 중이에요'); return; }
  startBroadcast();
});
/* 방송 시작: 그 화의 '방송 전' 장면을 처음 한 번 보여 주고(놓친 화를 따라잡을 때도 첫 방송이면 나옴 · 다시 하기는 바로) 생방송으로 */
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
/* v0.6 캐스트 채널: 합류하는 캐스트인가(메디아 = 시즌 2 · 아님) · 기록 보내기 · ☰ 캐스트 점(새 합류 · 단계 오름 때만 한 번) */
function isJoinable(id) { return !!(ROSTER.find(r => r.id === id) || {}).join; }
function trk(name, p) { try { window.parent.postMessage({ type: 'oad:track', name, p }, '*'); } catch { /* */ } }
function castDot() { const c = CH.ensure(S).casts; return ROSTER.some(r => joined(r.id) && (!(c[r.id] || {}).jn || (c[r.id].seen || 0) < shown(r.id) || (midOn(r.id) && !c[r.id].mid))); }
/* v0.7: 보이는 단계(얼굴 그림이 없으면 3단계가 끝) · 3~4단계 사이 DM(그림이 있을 때만) · 얼굴 열림 · 각성 화가 시즌에 들어와 있나(곡이 왔나) */
const shown = id => CH.shownStage(S, id, FACE[id]);
const midOn = id => !!(FACE[id] && FACE[id].ready && (CH.ensure(S).casts[id] || {}).subs >= CH.MID34);
const faceOpen = id => shown(id) >= 4;
const awkIn = id => !!(AWK[id] && DAYS.some(d => d.no === AWK[id].ep));
/* 시험 모드 ?awk=miyu : 그 캐스트를 각성한 것으로 (연출 확인용 · 저장 안 함 · 실서버 무시) */
const awkTest = DEV ? (Q.get('awk') || '') : '';
const awake = id => (awkTest && awkTest === id) || CH.isAwake(S, id);
/* 단계 진행 막대 0~100 (3단계면 100 — 각성은 v0.7) */
function stagePct(subs, id) { const top = id ? shown(id) : 3, st = Math.min(CH.stageOf(subs), top), a = CH.STAGES[st], b = st < top ? CH.STAGES[st + 1] : 0; return b ? Math.max(0, Math.min(100, Math.round((subs - a) / (b - a) * 100))) : 100; }   /* 마지막 단계 뒤엔 숫자만 오름 (다음 잠금 칸 없음) */
const STAGE_GIFT = { 1: '전용 DM · 생방송에 팬 채팅', 2: '사고 수습 한 판 2번 · 콤보 10마다 채팅 응원', 3: '전용 결과 대사 · 피버 때 팬 일동 후원 띠', 4: '얼굴 조각 · 진짜 이름' };
/* 단계 조각 (방 · 뒷모습): 그림이 들어온 것(ready)만 — 없으면 어디에도 안 보임 (얻을 길 없는 빈 칸 금지) */
const readyPieces = id => ((CHANNEL[id] || {}).pieces || []).filter(q => q.ready);
const cardDef = id => CARDS.find(c => c.id === id);
/* 소장 전용 꾸미기 「백금 무대」(v0.5.4): 소장자만 · 설정에서 켬/끔(기본 켬) · 시험 모드는 설정에서 켜 봄(기본 끔) */
const skinOK = () => !!bm.info.owned || DEV;
const skinOn = () => skinOK() && (S.skin ?? !!bm.info.owned);
/* 오늘 방송의 연출 테마: 게스트 → 백금 무대(소장) → 오늘의 캐스트 → 기본 (시험 모드 ?theme= 이 먼저) */
function themeNow() { if (DEV && Q.get('theme') && THEMES[Q.get('theme')]) return Q.get('theme'); const g = guestId(); if (!g && skinOn()) return 'owner'; const t = g ? rosterOf(g).theme : (rosterOf(day.cast) || {}).theme; if (g && t && THEMES[t] && awake(g)) return awkTheme(t); return t && THEMES[t] ? t : 'base'; }
/* 각성한 게스트: 그 캐스트 테마의 피버 테두리만 캐스트 색 + 금빛으로 (판정선 · 판정 색 그대로 · 판정선 띠 밖 — 플레이 감 표 11) */
function awkTheme(t) { const k = t + '_awk'; if (!THEMES[k]) { const b = THEMES[t]; THEMES[k] = { ...b, id: k, name: b.name + ' · 각성', edgeFever: [b.accent || b.edgeFever[0], '255,214,140'] }; } return k; }
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
    /* 합류한 캐스트: 단계 딱지 + 카드 아래 얇은 막대 (v0.6 · 12칸 그대로) · 새 합류 · 단계 오름은 테두리 점 한 번 */
    const rec = CH.ensure(S).casts[r.id] || { subs: 0 }, stg = on ? shown(r.id) : 0, nw = on && (!rec.jn || (rec.seen || 0) < stg || (midOn(r.id) && !rec.mid));
    const lbl = stg ? `${stg}단계` : '합류', tag = on ? (g === r.id ? `<span class="tg g">게스트${stg ? ` · ${stg}단계` : ''}</span>` : `<span class="tg on">${lbl}</span>`) : `<span class="tg lock ${w.cls}">${w.tag}</span>`;
    return `<button class="cc ${on ? 'on' : 'lock'} ${g === r.id ? 'guest' : ''} ${w ? w.cls : ''} ${nw ? 'newst' : ''}" data-c="${r.id}" ${on ? '' : 'aria-disabled="true"'}><i style="background-image:url(${c.face});--f:url(${new URL(c.face, location.href).href})" class="${on || seen ? '' : 'sil'}"></i><b>${esc(c.name)}</b><small>${esc(r.bio || c.gen)}</small>${tag}${on ? `<u class="pb"><s style="width:${stagePct(rec.subs || 0, r.id)}%"></s></u>` : ''}</button>`;
  }).join('');
  /* 봤음: 이번에 점을 보여 준 뒤 지움 (다음에 열면 점 없음) */
  for (const r of ROSTER) if (joined(r.id)) { const rc = CH.castRec(S, r.id); rc.jn = true; rc.seen = shown(r.id); }
  save();
  const gc = g ? CASTS[g] : null;
  $('#casts').innerHTML = `
    <div class="top"><button class="ic" data-x="back" aria-label="뒤로"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><div class="logo">캐스트</div><span style="width:36px"></span></div>
    <div class="ttl"><em>${GAME.studio} · 시즌 1</em><b>캐스트 ${ROSTER.filter(r => joined(r.id)).length} / ${ROSTER.length}명 합류</b><span>캐스트를 누르면 채널이 열려요 · 옆자리 게스트로 앉히면 연출과 사고 수습이 그 캐스트 것으로 · 점수에는 영향 없어요</span></div>
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
  A.fxPlay('tick', S.sfx * 0.5); openChannel(id);   /* v0.6: 카드를 누르면 캐스트 채널(단계 · 카드 · 메시지) → 시트 아래 단추로 앉히기 */
});
/* 옆자리 게스트 앉히기 · 내리기 (채널 시트 단추 · 개인 채널 끝 줄) */
function seat(id, on = S.guest !== id) {
  S.guest = on ? id : null; save(); A.fxPlay('tick', S.sfx * 0.6);
  if (on) { toast(`${josa(CASTS[id].name, '이/가')} 옆자리 게스트로 앉았어요`); trk('guest_pick', { cast: id }); }
}
/* ---------- 캐스트 채널 (v0.6 · 의도서 2-(마)): 단계 · 막대 · 단계 보상 · 카드 · 열린 메시지 · 앉히기 단추 ---------- */
function openChannel(id) {
  const c = CASTS[id], rec = CH.castRec(S, id), subs = rec.subs, top = shown(id) >= 4 || (FACE[id] && FACE[id].ready) ? 4 : 3, st = shown(id), nxt = st < top ? CH.STAGES[st + 1] : 0, L = CHANNEL[id] || {}, t = today(), lg = (S.cast || {})[id] || { plays: 0, guards: 0 }, F = FACE[id], fo = faceOpen(id);
  /* 단계 보상: 1~3단계 + (얼굴 그림이 있을 때만) 4단계 · 각성 줄은 그 각성 화가 시즌에 들어온 날부터만 (v0.7 · 곡이 없으면 '각성' 글자 0 — 사업 요청 2) */
  const gifts = Array.from({ length: top }, (_, i) => i + 1).map(k => { const pcs = readyPieces(id).filter(q => q.stage === k).map(q => `조각 「${q.kind}」`); return `<li class="${st >= k ? 'on' : ''}"><b>${k}단계</b><em class="tnum">${CH.STAGES[k].toLocaleString('en-US')}</em><p>${[...pcs, STAGE_GIFT[k]].join(' · ')}</p></li>`; }).join('')
    + (awkIn(id) ? `<li class="${awake(id) ? 'on' : ''}"><b>각성</b><em class="tnum">${AWK[id].ep}화</em><p>신형 엔진 데뷔 · ${AWK[id].ep}화를 끝까지 송출 · 구독자 ${CH.STAGES[3].toLocaleString('en-US')} 필요</p></li>` : '');
  const cards = CH.cardsOf(S, id).map(cd => { const df = cardDef(cd.id), d = DAYS[df.day - 1], a = CH.expFor(cd.lv), b = cd.lv < CH.CARD.maxLv ? CH.expFor(cd.lv + 1) : a, pc = b > a ? Math.round((cd.exp - a) / (b - a) * 100) : 100;
    return `<div class="cd"><i style="background-image:url(${d.dm.piece.img})"></i><div><em>★1 일상 스냅 · ${df.day}화</em><b>Lv.${cd.lv}<small> / ${CH.CARD.maxLv}</small></b><u class="pb"><s style="width:${pc}%"></s></u><p>${cd.lv >= 10 ? '짧은 DM 열림' : 'Lv10 짧은 DM'} · ${cd.lv >= 20 ? '전용 결과 대사 열림' : 'Lv20 전용 결과 대사'}</p></div></div>`; }).join('');
  /* 단계 조각: 그림이 들어온 것만 칸으로 — 열렸으면 사진 + 설명, 아직이면 「○단계에서 열려요」 */
  const pcs = readyPieces(id).map(q => st >= q.stage ? `<div class="pc on"><i style="background-image:url(${q.img})"></i><p><em>조각 「${q.kind}」 · ${q.stage}단계</em>${esc(q.caption)}</p></div>` : `<div class="pc"><i></i><p><em>조각 「${q.kind}」</em>${q.stage}단계에서 열려요</p></div>`).join('')
    /* 4단계 「얼굴」: 캐스트당 한 장 · 누르면 시트 안에서 크게 · 그림이 없으면 칸 없음 */
    + (F && F.ready ? (fo ? `<div class="pc on face" data-k="face" data-c="${id}"><i style="background-image:url(${F.img})"></i><p><em>조각 「얼굴」 · 4단계 · 누르면 크게</em>${esc(F.caption)}</p></div>` : `<div class="pc"><i></i><p><em>조각 「얼굴」</em>4단계 · 구독자 ${CH.STAGES[4].toLocaleString('en-US')}에서 진짜 이름과 함께 열려요</p></div>`) : '');
  if (midOn(id)) rec.mid = true;   /* 3~4단계 사이 DM 봤음 */
  const msgs = [...(st >= 1 && L.dm1 ? L.dm1 : []), ...(midOn(id) && F ? [F.mid] : []), ...CH.cardsOf(S, id).filter(cd => cd.lv >= 10).flatMap(cd => cardDef(cd.id).lv10)].map(x => `<p>${esc(x)}</p>`).join('');
  const sh = $('#sheet');
  sh.innerHTML = `<div class="pan chs"><div class="body">
    <div class="hd"><i style="background-image:url(${c.face})"></i><div><em>${esc(c.gen)} · 캐스트 채널</em><b>${esc(c.name)}<small>${st ? `${st}단계` : '합류'}${awake(id) ? ' · 각성' : ''}</small></b>${fo ? `<span class="real">${esc(F.name)} · ${F.age} · ${esc(F.job)}</span>` : ''}<span>구독자 <b class="tnum">${subs.toLocaleString('en-US')}</b>${nxt ? ` · 다음 ${nxt.toLocaleString('en-US')}` : st >= 3 ? ' · 완료' : ''}</span></div></div>
    <u class="pb big"><s style="width:${stagePct(subs, id)}%"></s></u>
    <div class="stat"><span>함께한 방송 <b>${lg.plays}</b> · 함께 수습 <b>${lg.guards}</b></span><span>오늘 함께한 방송 <b>${Math.min(t.cred || 0, CH.CAP)}/${CH.CAP}</b></span></div>
    <ul class="how"><li><b>함께한 방송</b><span>그 캐스트와 끝까지 · 하루 ${CH.CAP}판까지</span><em>+${CH.GAIN.play}</em></li><li><b>화 첫 방송</b><span>그 캐스트의 화를 처음 끝까지</span><em>+${CH.GAIN.ep}</em></li><li><b>첫 달성</b><span>곡 · 난이도마다 첫 완주 · 첫 S · 첫 풀콤보</span><em>+${CH.GAIN.first.clear}~${CH.GAIN.first.fc}</em></li></ul>
    <h4>단계 보상</h4><ul class="gifts">${gifts}</ul>
    ${pcs ? `<h4>조각</h4><div class="pcs">${pcs}</div>` : ''}
    <h4>카드</h4>${cards || '<div class="none">그 캐스트 화를 끝까지 송출하면 카드를 받아요</div>'}
    ${msgs ? `<h4>채널 메시지</h4><div class="msg">${msgs}</div>` : ''}
  </div><button class="seat ${S.guest === id ? 'off' : ''}" data-k="seat" data-c="${id}">${S.guest === id ? '옆자리에서 내리기' : '옆자리 게스트로 앉히기'}</button></div>`;
  sh.classList.add('on'); moreHint(sh); save();
  trk('channel_open', { cast: id });
}
/* 얼굴 크게 보기 (시트 안 · 닫기 1탭) */
function openFace(id) {
  const F = FACE[id]; if (!F || !faceOpen(id)) return;
  const pan = $('#sheet .pan'); if (!pan) return;
  pan.insertAdjacentHTML('beforeend', `<div class="fbig" data-k="faceclose"><i style="background-image:url(${F.img})"></i><b>${esc(F.name)}</b><span>${F.age} · ${esc(F.job)} · ${esc(CASTS[id].name)}의 진짜 그 사람</span><button data-k="faceclose">닫기</button></div>`);
  trk('face_view', { cast: id });
}

function go() {
  A.stopPreview();
  const dv = CASTS[day.cast], gid = guestId(), gc = gid ? CASTS[gid] : dv;
  /* 처음 보는 노트 · 첫 판 안내 (한 장) */
  const ch = charts[song.id], here = new Set(ch.diffs[S.diff].notes.map(n => n[3]).filter(Boolean));
  /* 첫 실행 리허설 (v0.7.1): 처음 하는 사람(조작 안내를 아직 안 본 저장)에게만 · ?guide=0 이면 끔 · 리허설이 조작 · 슈퍼챗을 가르치므로 그 두 안내 카드는 빼고 나머지(페이더 · 큐)는 그 화에서 그대로 */
  const gAll = Q.get('guide') === '0' ? [] : guidesFor(here), drillSc = here.has('sc') && !(S.seen || {}).sc;
  const drill = Q.get('guide') !== '0' && !S.guide && !S.drill && gAll.every(k => k === 'lane' || (k === 'sc' && drillSc));   /* 리허설은 다른 새 노트 카드가 없는 판에서만(새 유저 1화) */
  const guides = drill ? [] : gAll;   /* 한 판에 최대 두 가지 (검수 C-2) */
  show('play');
  Play.auto = Q.get('auto') && Q.get('auto') !== '0' ? { jitter: +(Q.get('jitter') || 18), miss: +(Q.get('miss') || 0), dom: Q.get('auto') === 'dom', wait: Q.get('gwait') === '1' } : null;   /* gwait=1: 자동 연주라도 안내 「확인」은 직접 (시험용) */
  Play.start({
    song, chart: charts[song.id], diff: S.diff, entry, offset: S.offset, speed: S.speed, shake: S.shake, sfx: S.sfx,
    hitsnd: S.hitsnd, el: S.el, lite: S.lite, vib: S.vib !== false, theme: DEV && Q.get('theme') ? themeNow() : DEV && THEMES[S.theme] && S.theme !== 'base' ? S.theme : themeNow(),
    guides, drill, drillSc: drill && drillSc,   /* ?guide=0 이면 끔 · 시험 도구 · 리허설은 다른 안내 카드가 없는 판에서만(1화가 보통) */
    guards: S.guard === false ? 0 : (awake(gid || day.cast) ? 3 : CH.guardsFor(CH.stageOfCast(S, gid || day.cast))), firstSc: !S.seen.scHit,   /* v0.7: 각성하면 3회 */   /* 사고 수습: 수습하는 캐스트(게스트 → 오늘 캐스트)의 구독자 단계로 1 · 1 · 2 · 2회 (v0.6) · 설정에서 끔 */
    fan: [day.cast, gid].filter((x, i, a) => x && a.indexOf(x) === i && CH.stageOfCast(S, x) >= 1 && CHANNEL[x]).flatMap(x => CHANNEL[x].fan),   /* 단계 1: 그 캐스트 팬 채팅 (글만 · 채팅 4줄 안) */
    burst: CH.stageOfCast(S, gid || day.cast) >= 2,   /* 단계 2: 콤보 10마다 채팅 응원 + 하트 (50 · 100 이정표와 겹치지 않게) */
    cover: day.hero, diva: { ...dv, name: singer(day), fix: gc.fix || dv.fix, face: gid ? gc.face : dv.face, en: gid ? gc.en : dv.en }, chapter: `${day.no}화 · ${day.chapter}`, live: day.live, subs: day.subs,
    /* 응원 컷인 얼굴(게스트 → 오늘 캐스트)의 말투로 (지난 검수 C-3) · 시점 · 횟수는 CHEER 그대로 */
    cheer: { ...CHEER, ...Object.fromEntries(Object.entries(CAST_CHEER[gid || day.cast] || {}).filter(([k]) => k !== 'sc')) }, scThanks: (CAST_CHEER[gid || day.cast] || {}).sc || '',
    /* 풀콤보 장면: 얼굴과 이름을 같은 사람으로 (지난 검수 C-1 · QA 3) · 각성했고 원화가 있으면 각성 원화 (길이 3.0초 그대로) */
    fcWho: { name: gid ? gc.name : singer(day), face: (() => { const w = gid || day.cast; return awake(w) && AWK[w] && AWK[w].ready ? AWK[w].img : gid ? gc.face : dv.face; })() },
    /* 3단계 이상 캐스트(오늘 · 게스트)가 있으면 피버 시작 때 위쪽 띠 한 번 「○○ 팬 일동」 (극 중 팬 · 누를 수 없음 · 점수 영향 0 · 사업 요청 4) */
    fanBand: (() => { const w = [gid, day.cast].find(x => x && isJoinable(x) && CH.stageOfCast(S, x) >= 3); return w ? { name: CASTS[w].name } : null; })(),
    helper: { name: gc.name, en: gc.en, face: gc.face, fix: (awake(gid || day.cast) && AWK[gid || day.cast] && AWK[gid || day.cast].fix) || gc.fix || dv.fix },   /* 수습하는 캐스트 = 게스트(없으면 오늘의 캐스트) */
    themeLine: gid && gid !== day.cast && THEMES[rosterOf(gid).theme] ? `연출 · ${THEMES[rosterOf(gid).theme].name}` : !gid && skinOn() ? `연출 · ${THEMES.owner.name}` : '',
    guestHello: gid && gid !== day.cast && rosterOf(gid).guest ? { name: gc.name, text: rosterOf(gid).guest } : null,
    /* 안내 '봤음'은 READY 를 지난 뒤 저장 (안내 중에 나가면 다음 판에 다시 · 검수 C-1) */
    onReady: () => { if (Play.drill) { S.drill = true; S.guide = true; if (drill && drillSc) S.seen.sc = true; save(); trk('tutorial', { step: Play.drill.skipped ? 'skip' : 'done' }); } if (!guides.length) return; if (guides.includes('lane')) S.guide = true; for (const k of guides) S.seen[k] = true; save(); },
    onPause: () => pauseMenu(), onEnd: r => onResult(r),
  });
  /* 판 시작 기록 (v0.5.4): 곡 · 난이도 · 그 화의 자리(kind) · 그날 몇 번째 판(n) — 다시 하기가 자유로워진 뒤 하루 판 수 = v0.6 하루 상한 자료 */
  const td = today(); td.n++; save();
  try { window.parent.postMessage({ type: 'oad:track', name: 'play', p: { diff: S.diff, day: day.no, song: song.id, past: past(), kind: kind(), n: td.n, guest: gid || null } }, '*'); } catch { /* */ }
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
  /* v0.6 캐스트 채널 정산: 하루 상한 = 그날 끝까지 한 판 수(곡 · 캐스트 무관) 첫 CAP 판 · 앵콜은 그날 첫 완주 1회 · 골드 없음 · 점수 영향 0 (판이 끝난 뒤 계산만) */
  t.cred = (t.cred || 0) + 1; const credited = t.cred <= CH.CAP, enc = kind() === 'encore' && !t.enc; if (enc) t.enc = true;
  const chg = CH.settle(S, { day, guest: gid, r, credited, epFirst: firstClear, encore: enc, joinable: isJoinable, cardDefs: CARDS, songId: song.id, diff: S.diff });
  const full = credited && t.cred === CH.CAP;   /* 그날 4번째 판 = 오늘 몫을 다 채운 순간 (v0.7.1 · 넘친 뒤가 아니라 채운 그때) */
  if (t.cred === CH.CAP) trk('daily_cap', { n: t.cred });
  for (const u of chg.stageUps) trk('cast_stage', { cast: u.cast, stage: u.stage });
  for (const f of chg.firsts) trk('first_clear', { song: song.id, diff: S.diff, kind: f.kind, cast: f.cast });
  for (const l of chg.levelUps) trk('card_level', { cast: l.cast, card: l.card, lv: l.lv });
  /* v0.7: 각성(그 화 끝까지 + 3단계 · 곡이 온 화만) · 얼굴 열림 기록 */
  chg.awk = CH.awkCheck(S, { awk: AWK, days: DAYS, dayNo: dayRaw() }); for (const id of chg.awk) trk('awaken', { cast: id });
  faceMark();
  last = { r, nb, firstClear, newPage: pageIn(day.no, r.rank), diff: S.diff, ch: chg, full };
  last.tip = pickTip(chg, full); last.dtip = pickDiffTip(r, S.diff);
  if (last.tip) trk('tip', { k: last.tip.k }); if (last.dtip) trk('tip', { k: last.dtip.k });
  save(true);
  save(true);
  try { window.parent.postMessage({ type: 'oad:track', name: 'clear', p: { rank: r.rank, acc: Math.round(r.acc * 1000) / 10, diff: S.diff, song: song.id } }, '*'); } catch { /* */ }
  renderResult(); show('result', 'root'); stack = ['today', 'result'];
}
function renderResult() {
  const { r, nb } = last, dv = CASTS[day.cast], b = (S.best[song.id] || {})[last.diff];
  /* 칭찬: 단계 3 · 카드 Lv20 이면 그 캐스트 전용 대사가 가끔 섞임 (v0.6 · 올 퍼펙트 · 풀콤보 · 신기록 칭찬이 먼저) */
  const spc = [...(awake(day.cast) && AWK[day.cast] ? [AWK[day.cast].line] : []), ...(CH.stageOfCast(S, day.cast) >= 3 && CHANNEL[day.cast] ? [CHANNEL[day.cast].res3] : []), ...CH.cardsOf(S, day.cast).filter(c => c.lv >= 20).map(c => cardDef(c.id).lv20)];
  const praise = r.ap ? PRAISE.ap : r.fc ? PRAISE.fc : nb ? PRAISE.best : spc.length && Math.random() < 0.5 ? pick(spc) : pick(PRAISE[r.rank]);
  $('#result').innerHTML = `
    <div class="bgcov" style="background-image:url(${day.hero})"></div>
    <div class="head"><em>${last.diff.toUpperCase()} · LV.${charts[song.id].diffs[last.diff].lv}</em><b>${esc(song.title)}</b><span>${esc(song.artist)} · 노래 ${esc(singer(day))}</span></div>
    <div class="rank r-${r.rank}"><span class="rk"><i class="ring"></i><b>${r.rank}</b><span class="shine"></span>${r.rank === 'S' || r.rank === 'SS' ? sparks() : ''}</span><div class="tags">${r.ap ? '<span>ALL PERFECT</span>' : r.fc ? '<span>FULL COMBO</span>' : ''}${nb ? '<span class="nb">NEW RECORD</span>' : ''}</div></div>
    <div class="score"><b class="tnum" id="r_sc">0</b><span>정확도 ${(r.acc * 100).toFixed(2)}%</span></div>
    <div class="grid"><div class="p"><em>PERFECT</em><b>${r.count.perfect}</b></div><div class="g"><em>GREAT</em><b>${r.count.great}</b></div><div class="d"><em>GOOD</em><b>${r.count.good}</b></div><div class="m"><em>MISS</em><b>${r.count.miss}</b></div></div>
    <div class="line2"><span>최고 콤보<b>${r.maxCombo}</b></span><span>FAST<b>${r.fast}</b> · SLOW<b>${r.slow}</b></span></div>
    <div class="low">
    <div class="say"><div class="av" style="background-image:url(${dv.face})"></div><div class="bub${last.tip ? ' tip' : ''}"><i>${dv.en}${last.tip ? ' · TIP' : ''}</i>${esc(last.tip ? last.tip.text : praise)}</div></div>
    ${b ? `<div class="best">이 난이도 최고 <b>${b.score.toLocaleString('en-US')}</b> · ${b.rank}</div>` : ''}${syncHint(r)}
    <div class="extra">${r.sc && r.sc[1] ? `<span class="scg${r.sc[0] === r.sc[1] ? ' full' : ''}"><i>₩</i>받은 슈퍼챗 <b>${r.sc[0]}/${r.sc[1]}</b>${r.scSum ? ` · ₩${r.scSum.toLocaleString('en-US')}` : ''}</span>` : ''}${r.guard ? `<span class="gdl">${esc(josa(r.helper, '이/가'))} ${r.guard > 1 ? `${r.guard}번` : '한 번'} 수습해 줬어요 · 점수는 그대로</span>` : ''}${chChip(last.ch, last.full, last.tip)}</div>
    <div class="subs"><span>${GAME.studio} 채널</span><b class="tnum" id="r_subs">${day.subs[0].toLocaleString('en-US')}</b><i>▲ ${(day.subs[1] - day.subs[0]).toLocaleString('en-US')}</i></div>
    </div>
    <div class="btns"><div class="again${last.dtip ? ' tip' : ''}" role="group" aria-label="한 번 더"${last.dtip ? ` data-tip="${esc(last.dtip.text)}"` : ''}>${DIFFS.map(([d, n]) => `<button class="${d === last.diff ? 'on' : ''}${last.dtip && d === 'normal' ? ' nudge' : ''}" data-n="again" data-d="${d}" aria-label="${n}으로 한 번 더"><b>${n}</b><small>${d === last.diff ? '한 번 더' : `LV.${charts[song.id].diffs[d].lv}`}</small></button>`).join('')}</div><button class="pri" data-n="story">${last.firstClear ? '개인 채널 열기' : '개인 채널 다시 보기'}</button></div>`;
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
/* 결과 칩 (v0.6 · 새 줄 없이 기존 칩 줄 안): 「♪ 미유 +110 · 벨라 +110」 · 첫 달성은 가장 높은 것 하나 「첫 풀콤보」 · 단계 오름이면 칩만 금빛 「미유 2단계」
   상한 남은 횟수는 결과에 내지 않음(사업 요청 6 — 채널 시트에만) · 상한 뒤 첫 판에만 안내 한 줄(칭찬 먼저 · 막는 말 없음) */
const FIRST_NM = { clear: '첫 완주', s: '첫 S', fc: '첫 풀콤보' };
/* 얼굴이 열린 캐스트에 연 날(faceAt) 기록 + face_open (설치 뒤 날 수) — 판 끝 · 처음 열 때(그림이 나중에 들어온 경우) */
function faceMark() { for (const id of Object.keys(FACE)) { const rec = CH.ensure(S).casts[id]; if (rec && !rec.faceAt && faceOpen(id)) { rec.faceAt = dayKey(); trk('face_open', { cast: id, day: dayRaw() }); } } }
/* ---------- v0.7.1 '일이 일어난 그때' 안내 (team/dev/tasks/261112-rhythm-v07/tutorial.md) ----------
   결과 칩 아래 한 줄 · 한 판에 하나 · 처음 한 번만(S.tips) · 설정 「안내 다시 보기」로 다시 · 창 없음 */
const TIP_MAX = '미유 4단계! 채널에 새 이야기가 열렸어요. ☰ 캐스트에서 봐요.';   /* 가장 긴 안내 (layout_check) */
function pickTip(ch, full) {
  const T = (S.tips ||= {}), gains = Object.entries((ch && ch.gain) || {}).filter(([, n]) => n > 0), chip = gains.length > 0;
  let tip = null;
  if (chip && !T.grow) tip = { k: 'grow', text: '끝까지 같이 방송하면 구독자가 올라요. 아래 칩을 눌러 봐요.' };
  if (!tip && full && !T.cap) tip = { k: 'cap', text: `오늘 ${CH.CAP}판 다 채웠어요! 방송은 계속 · 아침 7시에 다시 쌓여요` };
  if (!tip && T.grow && !T.stage) { const w = ROSTER.find(r => joined(r.id) && shown(r.id) >= 1); if (w) tip = { k: 'stage', text: `${CASTS[w.id].name} ${shown(w.id)}단계! 채널에 새 이야기가 열렸어요. ${chip ? '칩을 눌러 봐요.' : '☰ 캐스트에서 봐요.'}` }; }
  if (!tip && T.grow && !T.first && ch && ch.firsts.some(f => f.kind !== 'clear')) tip = { k: 'first', text: '난이도마다 첫 완주 · 첫 S · 첫 풀콤보엔 구독자 보너스!' };
  if (tip) T[tip.k] = dayKey();
  return tip;
}
/* 난이도 안내 (대표 11-12): 쉬움을 처음 끝낸 결과 · 쉬움에서 처음 S 이상 — 결과의 난이도 세 칸 위 한 줄을 바꾸고 보통 칸이 한 번 숨 쉼 (새 줄 · 창 없음) */
function pickDiffTip(r, diff) {
  const T = (S.tips ||= {}); if (diff !== 'easy') return null;
  let tip = null;
  if (!T.diff) tip = { k: 'diff', text: '잘했어요! 보통 · 어려움도 있어요 — 누르면 바로' };
  else if (!T.diffS && (r.rank === 'S' || r.rank === 'SS')) tip = { k: 'diffS', text: `쉬움 ${r.rank}! 보통에 도전해 볼래요?` };
  if (tip) T[tip.k] = dayKey();
  return tip;
}
function chChip(ch, full, tip) {
  if (!ch) return '';
  const g = Object.entries(ch.gain).filter(([, n]) => n > 0), up = ch.stageUps.filter(u => u.stage <= shown(u.cast)).pop();   /* 그림이 없는 4단계는 칩에도 안 냄 */
  const top = g.length ? g.slice().sort((a, b) => b[1] - a[1])[0][0] : '';   /* 칩을 누르면 가장 많이 오른 캐스트의 채널 (v0.7.1) */
  const chip = g.length ? `<button class="chg${up ? ' up' : ''}" data-n="chan" data-c="${top}" aria-label="${esc(CASTS[top].name)} 채널 열기"><i>♪</i>구독자 ${g.map(([id, n]) => `${esc(CASTS[id].name)} <b>+${n.toLocaleString('en-US')}</b>`).join(' · ')}${ch.firsts.length ? `<em>${FIRST_NM[['fc', 's', 'clear'].find(k => ch.firsts.some(f => f.kind === k))]}</em>` : ''}${up ? `<em class="st">${esc(CASTS[up.cast].name)} ${up.stage}단계${up.stage === 4 ? ' · 얼굴 조각' : ''}</em>` : ''}${ch.awk && ch.awk.length ? `<em class="st">${esc(CASTS[ch.awk[0]].name)} 각성</em>` : ''}${full ? `<em class="full">오늘 ${CH.CAP}/${CH.CAP} ✓</em>` : ''}</button>` : '';
  return chip;   /* v0.7.1: 안내는 새 줄이 아니라 캐스트 말풍선이 말함 (결과 아래 흐름이 넘치지 않게) */
}
/* S 이상: 등급 주변으로 퍼지는 금빛 알갱이 (CSS 만) */
function sparks() { let h = ''; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + Math.random() * 0.3, r = 70 + Math.random() * 60; h += `<i class="sp" style="left:50%;top:50%;--dx:${(Math.cos(a) * r).toFixed(0)}px;--dy:${(Math.sin(a) * r * 0.8).toFixed(0)}px;animation-delay:${(0.75 + Math.random() * 0.4).toFixed(2)}s"></i>`; } return h; }
/* 판정이 한쪽으로 쏠리면 싱크 맞추기 권함 (부드럽게) */
function syncHint(r) { const n = r.fast + r.slow; if (n < 12) return ''; const k = (r.slow - r.fast) / n; return Math.abs(k) > 0.55 ? `<div class="synch">${k > 0 ? '조금 늦게' : '조금 빠르게'} 누르는 편이에요 · 싱크 맞추기를 해 보세요</div>` : ''; }
/* 결과 「한 번 더」: 난이도 세 칸 — 같은 난이도도 다른 난이도도 한 번에 시작 (v0.5.4 · 의도서 4: 탭 2번 안) */
$('#result').addEventListener('click', e => { const b = e.target.closest('[data-n]'); if (!b) return; if (b.dataset.n === 'chan') { A.fxPlay('tick', S.sfx * 0.5); return openChannel(b.dataset.c); } if (b.dataset.n === 'story') openStory(); if (b.dataset.n === 'again') { if (b.dataset.d) { S.diff = b.dataset.d; save(); } show('today', 'root'); $('#t_start').click(); } });

/* ---------- ④ 개인 채널 (방송 후 DM · 오늘의 조각) — id 는 v0.3 그대로 #story ---------- */
let dm = null;
function dmHead(D) {
  if (D.with === 'group') return `<div class="gav">${['miyu', 'bella', 'tina', 'moa', 'edel'].map(k => `<i style="background-image:url(${CASTS[k].face})"></i>`).join('')}</div><div class="nm"><b>${esc(D.title || '단톡방')}</b><small>캐스트 7명 · 대표</small></div>`;
  const c = CASTS[D.with]; return `<div class="av" style="background-image:url(${c.face})"></div><div class="nm"><b>${esc(c.name)}</b><small>${D.with === 'media' ? '오르골 · 처음 온 메시지' : faceOpen(D.with) ? `${esc(FACE[D.with].name)} · 진짜 그 사람` : FACE[D.with] && FACE[D.with].ready ? '진짜 이름 ○○○ · 조각 4장을 모으면 공개' : '진짜 이름 ○○○'}</small></div>`;
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
    <div class="tmr2"><div class="fc" style="background-image:url(${CASTS[day.tomorrow.who].face})"></div><div><em>${day.no < home.no ? '다음 화 예고' : '내일 예고'} · ${day.no + 1}화</em><b>${esc(day.tomorrow.title)}</b><q>${esc(day.tomorrow.text)}</q></div></div>`;
}
function dmEnd() {
  const box = $('#story .msgs'); box.insertAdjacentHTML('beforeend', pieceHTML());
  /* 합류한 날: 「○○가 캐스트에 합류했어요 · [옆자리에 앉히기]」 1탭 (사업 v05 제안 3 · v0.6) */
  if (last && last.firstClear && isJoinable(day.cast) && guestId() !== day.cast) box.insertAdjacentHTML('beforeend', `<div class="joinl"><span>${esc(josa(CASTS[day.cast].name, '이/가'))} 캐스트에 합류했어요</span><button data-s="seat">옆자리에 앉히기</button></div>`);
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
  if (b) { if (b.dataset.c != null) return dmPick(+b.dataset.c); if (b.dataset.s === 'seat') { seat(day.cast, true); b.parentElement.innerHTML = `<span>${esc(josa(CASTS[day.cast].name, '이/가'))} 옆자리에 앉았어요</span>`; return; } if (b.dataset.s === 'book') openBook(); if (b.dataset.s === 'share') share(); if (b.dataset.s === 'back') runBack(); return; }
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
    <div class="btns"><button class="sec" data-b="share">공유</button><button class="ice" data-b="home">${upNext() !== tonight() ? `이어서 ${upNext().no}화` : '오늘의 방송으로'}</button></div>`;
  const tick = () => { const ms = nextOpen() - new Date(), h = Math.floor(ms / 3600e3), m = Math.floor(ms / 60e3) % 60, s = Math.floor(ms / 1e3) % 60; const e = $('#b_cd'); if (e) e.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };
  tick(); clearInterval(cdT); cdT = setInterval(tick, 1000);
  show('book');
}
$('#book').addEventListener('click', e => {
  const b = e.target.closest('[data-b],[data-p]'); if (!b) return;
  if (b.dataset.b === 'back') runBack();
  if (b.dataset.b === 'home') { if (day !== upNext()) setDay(upNext()); show('today', 'root'); }   /* 놓친 화가 남았으면 다음 차례로 */
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

/* ---------- 방송 목록: 열린 화의 곡 · 난이도 고르기 (오늘 방송이 맨 위) ----------
   v0.5.4: 열린 화는 값 없이 · 곡마다 난이도 세 칸(등급 · FC/AP · 레벨) — 칸을 누르면 그 난이도로 바로 시작, 곡 이름 쪽은 오늘 화면으로
   (예전엔 가장 높은 난이도 기록 하나만 보여서 어느 난이도 등급인지 몰랐음 · 곡 성격 꼬리표 「쉬운 곡 · 보통」은 플레이 난이도와 같은 낱말이라 빼고 곡 길이 · 보스 표시만) */
const openNo = d => isOpen(d.no, home.no, DEV);
function diffCells(d) {
  const best = S.best[d.song] || {}, ch = charts[d.song];
  return DIFFS.map(([x, n]) => { const r = best[x]; return `<button data-d="${x}" class="${r ? 'has' : ''} ${r && (r.rank === 'S' || r.rank === 'SS') ? 'gold' : ''}" aria-label="${n}으로 바로 시작"><span>${n}<i>${ch ? `LV.${ch.diffs[x].lv}` : ''}</i></span><b>${r ? r.rank : '—'}${r && (r.ap || r.fc) ? `<em>${r.ap ? 'AP' : 'FC'}</em>` : ''}</b></button>`; }).join('');
}
function stageRow(d) {
  const sg = SONGS[d.song], dv = CASTS[d.cast];
  if (!openNo(d)) return `<div class="st lock"><div class="cv"><span>${d.no}</span></div><div class="tx"><em>NO.${String(d.no).padStart(3, '0')} · ${d.no - home.no}일 뒤</em><b>???</b><span>${dv.name}의 방송 · 아직 열리지 않았어요</span></div></div>`;
  const k = epKind(d.no, home.no, S.book), nx = d === upNext() && d !== tonight(), tn = d === tonight();
  return `<div class="st ${tn ? 'today' : ''} ${d === day ? 'cur' : ''} ${k === 'catchup' ? 'new' : ''}" data-s="${d.no}"><button class="main"><div class="cv" style="background-image:url(${d.cut})"></div><div class="tx"><em>${tn ? (encore ? 'ENCORE' : 'TODAY') : 'NO.' + String(d.no).padStart(3, '0')} ${charts[d.song] && charts[d.song].len ? ` · ${fmtT(charts[d.song].len)}` : ''}${sg.tier === '보스' ? '<i class="boss">BOSS</i>' : ''}${k === 'catchup' ? `<i class="nw">${nx ? '다음 차례' : '첫 방송 전'}</i>` : ''}</em><b>${esc(sg.title)}</b><span>${esc(singer(d))} · ${d.chapter}</span></div></button><div class="dfs">${diffCells(d)}</div></div>`;
}
function openStages() {
  const rows = DAYS.slice().sort((a, b) => (b === tonight()) - (a === tonight()) || a.no - b.no).map(stageRow).join('');
  const late = behind(home.no, S.book);
  $('#stages').innerHTML = `
    <div class="top"><button class="ic" data-g="back" aria-label="뒤로"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg></button><div class="logo">방송 목록</div><span style="width:36px"></span></div>
    <div class="ttl"><em>SEASON ${SEASON.no} · ${SEASON.title}</em><b>열린 방송은 몇 번이든</b><span>난이도 칸을 누르면 바로 시작해요 · ${DEV ? '시험 모드 · 10곡 모두 열림' : late ? `${home.no}화까지 열렸어요 · ${nextUp(home.no, S.book)}화부터 차례로 이어 봐요` : `${home.no}화까지 열렸어요 · 매일 아침 7시에 새 방송`}</span></div>
    <div class="list">${rows}</div>`;
  show('stages');
  /* 난이도 칸 레벨 표시용 채보 미리 받기 (작음) */
  DAYS.filter(d => openNo(d) && !charts[d.song]).forEach(d => fetch(SONGS[d.song].chart).then(r => r.json()).then(j => { charts[d.song] = j; if (cur() === 'stages') { const e = $(`#stages [data-s="${d.no}"]`); if (e) e.outerHTML = stageRow(d); } }).catch(() => { /* */ }));
}
$('#t_list').addEventListener('click', () => openStages());
$('#stages').addEventListener('click', async e => {
  const b = e.target.closest('[data-g],[data-s]'); if (!b) return;
  if (b.dataset.g === 'back') return runBack();
  const d = DAYS[+b.dataset.s - 1]; if (!d || !openNo(d)) return;
  const cell = e.target.closest('[data-d]');
  A.fxPlay('tick', S.sfx * 0.5);
  if (cell) { await A.unlock(); S.diff = cell.dataset.d; save(); }
  last = null; show('today', 'root'); await setDay(d);
  if (cell && day === d && entry && cur() === 'today') startBroadcast();   /* 난이도 칸 = 바로 시작 (늦게 온 응답 · 다른 화면으로 옮긴 뒤면 시작 안 함) */
});

/* ---------- ⑥ 설정 시트 · 싱크 맞추기 ---------- */
/* 설정 시트 (검수 v0.5.4 B-3): 묶음 셋(판정 · 싱크 / 소리 · 진동 / 화면) · 토글은 글 길이와 상관없이 같은 크기 · 줄 전체가 누르는 영역
   닫기는 시트 아래 붙박이 · 더 있으면 아래가 흐려지는 표시 (스크롤 끝에서 사라짐) */
function openSheet() {
  const sh = $('#sheet');
  const row = (k, name, sub, val) => `<div class="row"><span>${name}<small>${sub}</small></span><div class="st"><button data-k="${k}" data-v="-1">−</button><b>${val}</b><button data-k="${k}" data-v="1">+</button></div></div>`;
  const tg = (k, name, sub, on) => `<div class="row tgr" data-row="${k}"><span>${name}<small>${sub}</small></span><button class="tg ${on ? 'on' : ''}" data-k="${k}" aria-label="${name}"></button></div>`;
  sh.innerHTML = `<div class="pan set"><h3>연주 설정</h3><div class="body">
    <h4>판정 · 싱크</h4>
    <div class="row"><span>싱크 맞추기<small>박자에 맞춰 화면을 두드려 소리 지연을 재요</small></span><button class="pill3" data-k="calib">${S.offset > 0 ? '+' : ''}${S.offset}ms · 맞추기</button></div>
    ${row('offset', '싱크 직접 조절', '노트가 소리보다 빠르면 +, 느리면 −', (S.offset > 0 ? '+' : '') + S.offset + 'ms')}
    ${row('speed', '노트 속도', '높을수록 노트가 빨리 내려와요', S.speed)}
    ${tg('el', 'EARLY / LATE 표시', 'GREAT · GOOD 때 빠름 · 늦음 글씨', S.el)}
    ${tg('guard', '사고 수습', 'MISS 를 캐스트가 덮어 줘요(2단계부터 두 번) · 수습한 판은 명예의 전당에 안 올라가요', S.guard !== false)}
    <h4>소리 · 진동</h4>
    ${row('sfx', '효과음', '누를 때 나는 소리', Math.round(S.sfx * 10))}
    ${row('music', '음악', '노래 크기', Math.round(S.music * 10))}
    ${tg('hitsnd', '타격음', '판정마다 짧은 소리 (크기는 효과음)', S.hitsnd)}
    ${tg('vib', '진동', '슈퍼챗 · 큐 · 페이더 · 수습 때 짧게 (안드로이드)', S.vib !== false)}
    <h4>화면</h4>
    ${skinOK() ? tg('skin', '백금 무대', '소장 꾸미기 · 판정선 · 키 패드 · 테두리가 백금빛 (게스트가 있으면 게스트 연출)', skinOn()) : bm.info.ok ? '<div class="row"><span>백금 무대<small>소장 꾸미기 · 원어데이에서 이 게임을 소장하면 쓸 수 있어요</small></span><b class="lk">소장</b></div>' : ''}
    ${tg('shake', '화면 흔들림', '100콤보 · 풀콤보 때 아주 살짝', S.shake)}
    ${tg('lite', '연출 줄이기', '오래된 폰 · 배터리 아끼기 (파티클 · 빛기둥 끔)', S.lite)}
    <div class="row"><span>안내 다시 보기<small>첫 리허설과 구독자 · 단계 · 난이도 안내를 다음 방송부터 한 번씩 다시</small></span><button class="pill3" data-k="tips">다시 보기</button></div>
    ${DEV ? `<div class="row"><span>연출 테마 <small>시험 모드 · 캐스트 테마 미리보기</small></span><button class="pill3" data-k="theme">${esc((THEMES[S.theme] || THEMES.base).name)}</button></div>` : ''}
    <div class="cred"><b>${GAME.name}</b> · ${GAME.studio} · ${VER}<br><b>음악</b> Suno 로 만든 오리지널 곡 10곡 (회사 유료 구독 · 상업 이용)<br><b>캐릭터 원화</b> 그라나사 (권리자 허락) · <b>채보 · 화면</b> 원어데이<br>키보드: D F J K</div>
    </div><button class="close" data-k="close">닫기</button></div>`;
  sh.classList.add('on'); moreHint(sh);
}
/* 시트 안 스크롤이 더 있으면 아래를 흐리게 (끝에 닿으면 없앰) */
function moreHint(sh) {
  const bd = sh.querySelector('.body'); if (!bd) return;
  const upd = () => bd.classList.toggle('more', bd.scrollTop + bd.clientHeight < bd.scrollHeight - 4);
  bd.onscroll = upd; requestAnimationFrame(upd);
}
$('#sheet').addEventListener('click', e => {
  if (e.target.id === 'sheet') return closeSheet();
  /* 토글 줄은 줄 어디를 눌러도 (검수 C-6) */
  const b = e.target.closest('[data-k]') || (e.target.closest('.tgr') && e.target.closest('.tgr').querySelector('.tg')); if (!b) return;
  const k = b.dataset.k, v = +b.dataset.v || 0;
  if (k === 'close') return closeSheet();
  if (k === 'face') return openFace(b.dataset.c);   /* 얼굴 조각 크게 */
  if (k === 'faceclose') { const f = $('#sheet .fbig'); if (f) f.remove(); return; }
  if (k === 'seat') { const id = b.dataset.c; seat(id); closeSheet(); if (cur() === 'casts') { stack.pop(); openCasts(); } return; }   /* 캐스트 채널 시트 */
  if (k === 'calib') { closeSheet(); return openCalib(); }
  if (k === 'tips') { S.tips = {}; S.drill = false; S.guide = false; save(true); closeSheet(); return toast('다음 방송부터 리허설과 안내를 다시 보여 줘요', 2400); }
  if (k === 'offset') S.offset = Math.max(-300, Math.min(300, S.offset + v * 5));
  if (k === 'speed') S.speed = Math.max(1, Math.min(10, S.speed + v));
  if (k === 'sfx') { S.sfx = Math.max(0, Math.min(1, Math.round(S.sfx * 10 + v) / 10)); A.unlock().then(() => A.hit('perfect', S.sfx)); }
  if (k === 'music') { S.music = Math.max(0, Math.min(1, Math.round(S.music * 10 + v) / 10)); A.setVol('music', S.music); }
  if (k === 'shake') S.shake = !S.shake;
  if (k === 'hitsnd') { S.hitsnd = !S.hitsnd; if (S.hitsnd) A.unlock().then(() => A.hit('perfect', S.sfx)); }
  if (k === 'el') S.el = !S.el;
  if (k === 'guard') S.guard = S.guard === false;
  if (k === 'vib') { S.vib = S.vib === false; if (S.vib && navigator.vibrate) try { navigator.vibrate(15); } catch { /* */ } }
  if (k === 'skin') S.skin = !skinOn();
  if (k === 'lite') { S.lite = !S.lite; document.body.classList.toggle('lite', S.lite); }
  if (k === 'theme') { const ids = Object.keys(THEMES); S.theme = ids[(ids.indexOf(S.theme) + 1) % ids.length]; }
  const top = ($('#sheet .body') || {}).scrollTop || 0; save(); openSheet(); const bd = $('#sheet .body'); if (bd) bd.scrollTop = top; renderToday();
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
  if (c === 'today' && stack.length === 1 && past()) { setDay(tonight()); return true; }   /* 지난 방송을 보다가 뒤로 = 오늘의 방송으로 */
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
  { const en = CH.encoreNo(dayRaw(), DAYS.length); encore = en && home.no === DAYS.length ? DAYS[en - 1] : null; }   /* 앵콜: 마지막 화 다음 날부터 */
  /* v0.6 소급: v0.5.1 부터 쌓인 기록(함께한 방송 · 슈퍼챗 · 곡별 최고 · 방송 기록)을 처음 열 때 한 번 (상한 × 지난 날 수까지) */
  if (CH.retro(S, { days: DAYS, cardDefs: CARDS, joinable: isJoinable, daysSince: dayRaw() })) save(true);
  if (CH.awkCheck(S, { awk: AWK, days: DAYS, dayNo: dayRaw() }).length) save(true);   /* 곡이 들어와 각성 화가 생긴 뒤 처음 열 때 */
  faceMark(); save();
  const want = DAYS[(+Q.get('song') || 0) - 1];   /* 시험용: ?dev=1&song=7 → 7화 곡을 바로 고른 상태로 */
  /* 열 때: 놓친 화가 있으면 그 가장 앞 화부터 (v0.5.4 따라잡기) · ?day=N 시험 스위치는 그 화로 바로 */
  await setDay(DEV && want ? want : EP ? tonight() : upNext(), false);
  bm.hello().then(() => { if (cur() === 'today') renderToday(); });
  show('today', 'root');
  setTimeout(() => $('#boot').classList.add('off'), 250);
  await loadAudio();
  const s = Q.get('screen');
  if (s === 'book') openBook(); else if (s === 'calib') openCalib(); else if (s === 'sheet') openSheet();
})();

/* 시험용 손잡이 */
/* 결과 화면 줄 겹침 시험용 (tools/layout_check.mjs): r · 신기록 여부를 넣어 결과를 그림 */
function testResult(r, nb = false, ch = null, tip = false, dtip = false) { last = { r, nb, firstClear: false, newPage: false, diff: S.diff, ch, full: !!tip, tip: tip ? { k: 'cap', text: TIP_MAX } : null, dtip: dtip ? { k: 'diff', text: '잘했어요! 보통 · 어려움도 있어요 — 누르면 바로' } : null }; renderResult(); show('result', 'root'); }
window.__ot = { S, Play, testResult, openCalib, CAL_CLOSE_MS, get cal() { return cal; }, A, show, back, get stack() { return stack; }, get last() { return last; }, get day() { return day; }, get home() { return home; }, days: DAYS, get entry() { return entry; }, openCasts, openChannel, openSheet, CH, get encore() { return encore; }, get tonight() { return tonight(); }, joined, go, openStory, openBook, openStages, setDay, onResult, dayKey };
