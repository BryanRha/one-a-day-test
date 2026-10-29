// 화면들 — 홈 · 진행 맵 · 테마 노트(책장 · 꾸미기) · 스티커 서랍 · 상점 · 다이어리(달력)
import { NOTES, PAGES, PAGE_DONE, COUNT, img, nameOf, isFoil, SHOP, PACKS, BUNDLE, OBSTACLE_AT, stageCfg, MOODS, TAPES, PAPERS, PAGE_TPL, dailySet } from './data.js?v=0.91.2';
import { S, save, day, dayKey, parseDay, missedDays, give, take, note } from './save.js?v=0.91.2';
import { renderPage, openShare, miniHTML, fillMinis } from './page.js?v=0.91.2';
import { inOAD, exitToOAD } from './oad.js?v=0.91.2';
import * as A from './audio.js?v=0.91.2';
import { $, sp, toast, modal, closeModal, DAYS, burst, praise, app, ICON, coin, moodSVG, esc, buzz } from './ui.js?v=0.91.2';
import { bm } from './oad_bm.js?v=0.91.2';

let go = null; /* main.js 가 넣어 줌: go.daily() · go.map(n) · go.free() */
export const bind = g => { go = g; };
const scr = ['home', 'map', 'notes', 'editor', 'drawer', 'shop', 'diary'];
export let cur = 'home';
export function show(name) {
  const prev = cur; cur = name; A.click();
  for (const s of [...scr, 'game']) $('#' + s).classList.toggle('on', s === name);
  $('#nav').classList.toggle('on', name !== 'game' && name !== 'editor');
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.go === name || (name === 'diary' && b.dataset.go === 'home')));
  ({ home, map, notes, drawer, shop, diary })[name]?.();
  if (name === 'home') { const h = $('#home'); h.classList.remove('enter'); void h.offsetWidth; if (prev !== 'home' || !h.dataset.once) h.classList.add('enter'); h.dataset.once = 1; }
  goldChip();
}
/* 뒤로가기용: 꾸미기의 열린 시트 · 선택을 먼저 닫음 */
export function closeSheets() {
  const sh = $('#esheet.on'); if (sh) { sh.classList.remove('on'); return true; }
  if (cur === 'editor' && ED && ED.sel != null) { select(null); return true; }
  return false;
}
export function goldChip() { const i = bm.info; document.querySelectorAll('.gold').forEach(g => { g.classList.toggle('off', !i.ok); if (i.ok) g.innerHTML = coin(i.gold ?? 0); }); }
const noteOpen = n => n.open === 'free' || (n.open.startsWith('map:') && S.map >= +n.open.slice(4)) || (n.open.startsWith('gold:') && S.owned[n.open.slice(5)]) || (n.open === 'owner' && bm.info.owned);
const stickersOf = list => list.filter(s => !s.k);
const pagesDone = nt => nt.pages.filter(p => stickersOf(p).length >= PAGE_DONE).length;
const drawerTotal = () => Object.values(S.drawer).reduce((a, b) => a + b, 0);
/* 말없이 거절하지 않기: 누를 수 없는 날은 짧은 이유 */
function dayTap(k, missedSet) {
  if (S.days[k]?.done || missedSet.has(k)) return openDay(k);
  if (k === dayKey()) return go.daily();
  A.nope(); toast(k < S.first ? '다이어리를 시작하기 전 날이에요' : '아직 오지 않은 날이에요');
}

/* ---------- 홈 ---------- */
function home() {
  const t = new Date(parseDay(dayKey())), dd = day(), w = dd.wins, miss = new Set(missedDays(10));
  const dots = [0, 1, 2].map(i => `<i class="${i < w ? 'on' : ''}"></i>`).join('');
  const week = []; for (let i = 6; i >= 0; i--) { const d = new Date(t); d.setDate(t.getDate() - i); const k = dayKey(d), x = S.days[k]; const before = k < S.first; week.push(`<button class="wk ${k === dayKey() ? 'today' : ''} ${x?.done ? 'done' : before ? 'pre' : i ? 'miss' : ''}" data-day="${k}"><small>${DAYS[d.getDay()]}</small><b>${d.getDate()}</b><em>${x?.done ? '' : (!before && i ? '쉼' : '')}</em></button>`); }
  const ob = S.map < 10 ? '11단계부터 얼음이 나와요' : S.map < 20 ? '21단계부터 사슬이 나와요' : S.map >= 30 ? '30단계를 모두 깼어요!' : '얼음 · 사슬 · 마지막 구간';
  const working = NOTES.filter(noteOpen).map(n => ({ n, nt: S.notes[n.id] })).sort((a, b) => (b.nt ? pagesDone(b.nt) + 1 : 0) - (a.nt ? pagesDone(a.nt) + 1 : 0)).slice(0, 3);
  const first = !Object.values(S.days).some(x => x.done);
  const recent = Object.keys(S.days).filter(k => S.days[k].done).sort().reverse().slice(0, 7);
  const { set, lucky } = dailySet(dayKey());
  let i = 0; const R = () => `class="rise" style="--i:${i++}"`;
  $('#home').innerHTML = `<div class="hero"><div class="ht"><h1>오늘의 다꾸</h1><p>${t.getMonth() + 1}월 ${t.getDate()}일 ${DAYS[t.getDay()]}요일 · 하루 한 판, 다이어리 한 장</p></div><div class="hr">${inOAD ? `<button class="pbtn oadexit" id="h_exit" aria-label="원어데이로">↩ 원어데이</button>` : ''}<button class="pbtn" id="h_set" aria-label="설정">${ICON.gear}</button><div class="gold off"></div></div></div>
  <div ${R()}><div class="today paper">
    <div class="tp"><b>오늘 페이지</b><span class="dots">${dots}</span><em>${dd.done ? '완성!' : `${w}/3판`}</em></div>
    <p>${dd.done ? '오늘 페이지에 도장을 찍었어요. 이제 자유 다꾸로 마음껏 꾸며요.' : w ? `${3 - w}판만 더 깨면 오늘 페이지가 완성돼요.` : '오늘의 스티커로 세 판을 깨면 날짜 도장이 찍힌 페이지 한 장이 남아요.'}</p>
    <div class="todayset"><small>오늘의 스티커</small>${set.slice(0, 9).map(id => `<img src="${img(id)}" class="${id === lucky ? 'lk' : ''}" alt="${nameOf(id)}">`).join('')}</div>
    ${first ? `<div class="how"><span><i class="t"><img src="${img(set[1])}"></i>세 장 모으기</span><i class="ar">›</i><span><i class="s"><img src="${img(set[1])}"></i>스티커가 돼요</span><i class="ar">›</i><span><i class="p"></i>세 판이면 도장 한 장</span></div>` : ''}
    <button class="btn main big" id="h_today">${dd.done ? '오늘 페이지 보기' : `오늘의 판 시작 <small>${w + 1}/3</small>`}</button>
    <div class="week">${week.join('')}</div>
  </div></div>
  ${recent.length ? `<div class="paper minibox" ${R()}><div class="mh" id="h_pages"><b>최근 페이지</b><span class="lnk">다이어리 ›</span></div><div class="homepages">${recent.map(k => { const d = parseDay(k); return `<button data-day="${k}">${miniHTML(k, `${d.getMonth() + 1}/${d.getDate()}`)}</button>`; }).join('')}</div></div>` : ''}
  <div class="cards" ${R()}>
    <button class="cardb" id="h_map"><i class="ic map"></i><b>진행 맵</b><span>${S.map}/30단계</span><small>${ob}</small></button>
    <button class="cardb" id="h_free"><i class="ic free"></i><b>자유 다꾸</b><span>${S.free}판 · 제한 없음</span><small>서랍 스티커 ${drawerTotal()}장</small></button>
  </div>
  <div class="paper mini" ${R()}><div class="mh" id="h_notes"><b>꾸미는 중인 노트</b><span class="lnk">책장 ›</span></div><div class="mrow">${working.map(({ n, nt }) => `<button class="mn" data-id="${n.id}" style="--c:${n.color}"><span><img src="${img(n.sig)}"></span><small>${n.name}<br>${nt ? pagesDone(nt) : 0}/${PAGES}쪽</small></button>`).join('')}</div></div>
  <button class="btn rise" style="--i:${i++}" id="h_diary">내 다이어리 보기 · ${Object.values(S.days).filter(d => d.done).length}장</button>`;
  $('#h_today').onclick = () => dd.done ? openDay(dayKey()) : go.daily();
  $('#h_set').onclick = () => window.__settings(); if ($('#h_exit')) $('#h_exit').onclick = () => exitToOAD();
  if ($('#h_pages')) $('#h_pages').onclick = () => show('diary');
  document.querySelectorAll('#home .homepages [data-day]').forEach(b => b.onclick = () => openDay(b.dataset.day)); fillMinis($('#home'));
  $('#h_notes').onclick = e => { if (!e.target.closest('.mn')) show('notes'); }; document.querySelectorAll('#home .mn').forEach(b => b.onclick = () => openEditor(b.dataset.id));
  $('#h_map').onclick = () => show('map'); $('#h_free').onclick = () => go.free(); $('#h_diary').onclick = () => show('diary');
  document.querySelectorAll('#home .wk').forEach(b => b.onclick = () => dayTap(b.dataset.day, miss));
}

/* ---------- 다이어리 (달력 · 놓친 날 도장 · 최근 페이지) ---------- */
let cal = null;
function thumb(k) {
  const x = S.days[k], d = parseDay(k), m = MOODS.find(o => o.id === x.mood), tpl = PAGE_TPL[x.tpl ?? dailySet(k).tpl];
  return `<button data-day="${k}" data-paper="${tpl.paper}" style="--tp:${tpl.tape[0]}"><i class="tt"></i><span>${x.stickers.slice(0, 2).map(s => `<img src="${img(s.ty)}">`).join('')}</span>${m ? `<em>${moodSVG(m, { name: false })}</em>` : ''}<small>${d.getMonth() + 1}/${d.getDate()}${m ? ' · ' + m.name : ''}</small></button>`;
}
function diary() {
  const t = parseDay(dayKey()); if (!cal) cal = { y: t.getFullYear(), m: t.getMonth() };
  const first = new Date(cal.y, cal.m, 1), n = new Date(cal.y, cal.m + 1, 0).getDate(), miss = new Set(missedDays(400));
  let cells = ''; for (let i = 0; i < first.getDay(); i++) cells += '<i></i>';
  for (let d = 1; d <= n; d++) { const k = dayKey(new Date(cal.y, cal.m, d, 12)), x = S.days[k]; cells += `<button data-day="${k}" class="${x?.done ? 'done' : miss.has(k) ? 'miss' : ''} ${k === dayKey() ? 'today' : ''}"><b>${d}</b>${x?.done ? '<em class="mst"></em>' : miss.has(k) ? '<em class="mst g"></em>' : ''}</button>`; }
  const done = Object.keys(S.days).filter(k => S.days[k].done).sort().reverse();
  $('#diary').innerHTML = `<div class="hd"><div><h1>내 다이어리</h1><p>모은 페이지 ${done.length}장 · 놓친 날은 벌 없이 도장만 남아요</p></div><div class="gold off"></div></div>
  <div class="paper calw"><div class="calh"><button data-m="-1">‹</button><b>${cal.y}년 ${cal.m + 1}월</b><button data-m="1">›</button></div>
  <div class="cal">${DAYS.map(x => `<small>${x}</small>`).join('')}${cells}</div></div>
  <div class="legend"><span><i class="lg r"></i>완성한 날</span><span><i class="lg g"></i>쉬어 간 날 (벌 없음)</span><span><i class="lg t"></i>오늘</span></div>
  <div class="paper minibox"><div class="mh"><b>최근 페이지</b><span class="lnk">${done.length > 4 ? '달력에서 더 보기' : ''}</span></div><div class="recent4">${done.slice(0, 4).map(k => { const d = parseDay(k), m = MOODS.find(o => o.id === S.days[k].mood); return `<button data-day="${k}">${miniHTML(k, `${d.getMonth() + 1}/${d.getDate()}${m ? ' · ' + m.name : ''}`)}</button>`; }).join('') || '<p class="sub">하루 세 판을 깨면 첫 페이지가 여기에 생겨요.</p>'}</div></div>
  <p class="tip">소장하면 매일 열리고, 다이어리가 계정에 평생 보관돼요.</p>`;
  $('#diary').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { cal.m += +b.dataset.m; if (cal.m < 0) { cal.m = 11; cal.y--; } if (cal.m > 11) { cal.m = 0; cal.y++; } diary(); });
  $('#diary').querySelectorAll('[data-day]').forEach(b => b.onclick = () => dayTap(b.dataset.day, miss));
  fillMinis($('#diary'));
}
export function openDay(k) {
  const pg = $('#page'), missed = !S.days[k]?.done;
  pg.classList.add('on'); pg.style.transform = 'translateY(0)';
  pg.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: sp(220), easing: 'ease-out' });
  renderPage(pg, k, { missed });
  $('#pageUI').innerHTML = (missed ? '' : `<button class="btn main" data-p="share">공유 카드 만들기</button>`) + `<button class="btn" data-p="close">닫기</button>`;
  $('#pageUI').classList.add('on');
  $('#pageUI').onclick = e => { const p = e.target.dataset.p; if (p === 'share') openShare(k); if (p === 'close') { pg.classList.remove('on'); $('#pageUI').classList.remove('on'); } };
}

/* ---------- 진행 맵 30단계 ---------- */
function map() {
  let h = ''; for (let n = 30; n >= 1; n--) {
    const st = n <= S.map ? 'done' : n === S.map + 1 ? 'cur' : 'lock', side = ['l', 'c', 'r', 'c'][n % 4];
    const nb = n % 10 === 0 ? NOTES[2 + n / 10] : null;
    const tag = nb ? `<em class="gift" style="--c:${nb.color}"><span class="mcv"><img src="${img(nb.sig)}"></span>${nb.name}</em>` : OBSTACLE_AT[n] ? `<em class="new">${OBSTACLE_AT[n] === 'ice' ? '얼음 등장' : '사슬 등장'}</em>` : '';
    const kd = n % 10 === 0 ? 'boss' : n > 5 && n % 5 === 0 ? 'hard' : '';
    const tag2 = kd === 'hard' ? `<em class="new" style="color:var(--stamp)">어려운 판 · 보상 2배</em>` : '';
    h += `<div class="node ${side}"><button class="st ${st} ${nb ? 'big' : ''} ${st !== 'done' ? kd : ''}" data-n="${n}">${nb ? '<i class="ic note"></i>' : `<b>${n}</b>`}</button>${tag}${tag2}</div>`;
  }
  $('#map').innerHTML = `<div class="hd sticky"><div><h1>진행 맵</h1><p>${S.map}/30단계 · 10단계마다 새 노트와 새 재미</p></div><div class="gold off"></div></div><div class="path">${h}</div>`;
  $('#map').querySelectorAll('.st').forEach(b => b.onclick = () => { const n = +b.dataset.n; if (n > S.map + 1) { A.nope(); toast(`${S.map + 1}단계를 먼저 깨 주세요`); return; } go.map(n); });
  setTimeout(() => { const c = $('#map .st.cur') || $('#map .st.done'); c?.scrollIntoView({ block: 'center' }); }, 30);
}

/* ---------- 테마 노트 책장 ---------- */
const lockText = n => n.open.startsWith('map:') ? `진행 맵 ${n.open.slice(4)}단계` : n.open.startsWith('gold:') ? `상점 · ${coin(SHOP[n.open.slice(5)].gold)}` : n.open === 'owner' ? '소장하면 열려요' : '';
function notes() {
  const h = NOTES.map(n => { const nt = S.notes[n.id], open = noteOpen(n), dn = nt ? pagesDone(nt) : 0;
    return `<button class="nb ${open ? '' : 'lock'} ${nt?.done || n.foil ? 'done' : ''}" data-id="${n.id}" style="--c:${n.color}"><span class="cv"><i>${n.name.replace(' 노트', '')}</i><img src="${img(nt?.done || n.foil ? 'f' + n.sig : n.sig)}" class="${nt?.done || n.foil ? 'foilimg' : ''}"></span><b>${n.name}</b><small>${open ? (nt?.done ? '다 채웠어요 · 금박 표지' : `${dn}/${PAGES}쪽`) : '잠김 · ' + lockText(n)}</small></button>`; }).join('');
  $('#notes').innerHTML = `<div class="hd"><div><h1>테마 노트</h1><p>한 권 ${PAGES}쪽 · 한 쪽에 스티커 ${PAGE_DONE}장이면 완성 · 다 채우면 표지와 금박 스티커</p></div><div class="gold off"></div></div><div class="shelf">${h}</div>`;
  $('#notes').querySelectorAll('.nb').forEach(b => b.onclick = () => { const n = NOTES.find(x => x.id === b.dataset.id); if (!noteOpen(n)) { A.nope(); if (n.open.startsWith('gold:')) show('shop'); else toast(n.open === 'owner' ? '원어데이에서 소장하면 열리는 노트예요' : `진행 맵 ${n.open.slice(4)}단계를 깨면 열려요`); return; } openEditor(n.id); });
}

/* ---------- 노트 꾸미기 ----------
   스티커 · 마테 테이프 6색(끝을 끌어 길이 조절) · 손글씨 한 줄 · 속지 4종 · 끌어서 옮기기 · 두 손가락으로 돌리기/키우기 · 새 스티커는 빈자리에 */
let ED = null;
export function openEditor(id, page) { const n = NOTES.find(x => x.id === id), nt = note(id); if (page != null) nt.cur = page; ED = { n, nt, sel: null }; show('editor'); drawEditor(); }
const pageList = () => ED.nt.pages[ED.nt.cur];
function drawEditor() {
  const { n, nt } = ED, p = nt.cur, list = nt.pages[p], st = stickersOf(list).length;
  nt.papers = nt.papers || [];
  $('#editor').style.setProperty('--paper', n.paper); $('#editor').style.setProperty('--c', n.color);
  $('#editor').innerHTML = `<div class="etop"><button class="pbtn" id="e_back">‹</button><div><b>${n.name}</b><small>${p + 1}/${PAGES}쪽 · ${st >= PAGE_DONE ? '이 쪽 완성 ✓' : `스티커 ${st}/${PAGE_DONE}`}</small></div><span class="gold off"></span></div>
  <div class="epage" id="epage" data-paper="${nt.papers[p] || 'dot'}"><div class="edeco"></div></div>
  <div class="ebar" id="ebar"></div>
  <div class="esheet" id="esheet"></div>`;
  const pg = $('#epage'); list.forEach((s, i) => addPlaced(pg, s, i));
  $('#e_back').onclick = () => { ED = null; show('notes'); };
  pg.onpointerdown = e => { if (e.target === pg || e.target.classList.contains('edeco')) select(null); };
  twoFinger(pg); bar(); goldChip();
}
/* 아래 띠: 아무것도 안 고르면 [‹ 스티커 테이프 글씨 속지 ›] · 고르면 [돌리기 크게 작게 떼기 완료] (화면 아래 고정 → 스티커를 가리지 않음) */
function bar() {
  const b = $('#ebar'), { nt } = ED, p = nt.cur;
  if (ED.sel == null) {
    b.innerHTML = `<button class="pbtn" id="e_prev" ${p ? '' : 'disabled'}>‹</button><div class="etools"><button data-e="st"><i class="ic drawer"></i>스티커<small>${drawerTotal()}</small></button><button data-e="tape"><i class="tp"></i>테이프</button><button data-e="text"><i class="tx">가</i>글씨</button><button data-e="paper"><i class="pp"></i>속지</button></div><button class="pbtn" id="e_next" ${p < PAGES - 1 ? '' : 'disabled'}>›</button>`;
    $('#e_prev').onclick = () => { nt.cur = Math.max(0, p - 1); save(); turn(-1); };
    $('#e_next').onclick = () => { nt.cur = Math.min(PAGES - 1, p + 1); save(); turn(1); };
    b.querySelectorAll('[data-e]').forEach(x => x.onclick = () => ({ st: sheet, tape: tapeSheet, text: addText, paper: paperSheet })[x.dataset.e]());
  } else {
    b.innerHTML = `<div class="etools sel"><button data-t="rot">↻ 돌리기</button><button data-t="big">크게</button><button data-t="small">작게</button><button data-t="off">떼기</button><button data-t="ok" class="ok">완료</button></div>`;
    b.querySelectorAll('[data-t]').forEach(x => x.onclick = () => selTool(x.dataset.t));
  }
}
function turn(dir) { drawEditor(); $('#epage').animate([{ transform: `perspective(900px) rotateY(${dir * -25}deg)`, opacity: .4 }, { transform: 'none', opacity: 1 }], { duration: sp(260), easing: 'ease-out' }); A.shuffle(); }
function addPlaced(pg, s, i) {
  const e = document.createElement('div'); e.dataset.i = i;
  if (s.k === 'tape') { e.className = 'placed tape'; e.style.background = s.c; e.innerHTML = '<i class="hdl"></i>'; }
  else if (s.k === 'text') { e.className = 'placed text'; e.textContent = s.t; e.style.fontSize = `calc(${s.w} * var(--pw, 360px) * .16)`; }
  else { e.className = 'placed' + (isFoil(s.ty) ? ' foil' : ''); e.innerHTML = `<img src="${img(s.ty)}" alt="${nameOf(s.ty)}">`; }
  const pos = () => { e.style.left = s.x * 100 + '%'; e.style.top = s.y * 100 + '%'; if (s.k !== 'text') e.style.width = s.w * 100 + '%'; else e.style.fontSize = `calc(${s.w} * var(--pw, 360px) * .16)`; e.style.transform = `translate(-50%,-50%) rotate(${s.r}deg)`; };
  pos(); e.__pos = pos; pg.appendChild(e);
  let st = null;
  e.onpointerdown = ev => { ev.preventDefault(); ev.stopPropagation(); if (pointers.size >= 2) return; try { e.setPointerCapture(ev.pointerId); } catch { /* 합성 이벤트 */ } const r = pg.getBoundingClientRect(); st = { x: ev.clientX, y: ev.clientY, sx: s.x, sy: s.y, sw: s.w, r, moved: false, hdl: ev.target.classList.contains('hdl') }; e.classList.add('drag'); pointers.set(ev.pointerId, ev); if (ED.sel !== i) select(i, true); };
  e.onpointermove = ev => { if (!st || pointers.size >= 2) return; const dx = (ev.clientX - st.x) / st.r.width, dy = (ev.clientY - st.y) / st.r.height; if (Math.abs(dx) + Math.abs(dy) > 0.01) st.moved = true;
    if (st.hdl) s.w = Math.max(0.12, Math.min(0.9, st.sw + dx * 2)); else { s.x = Math.max(0.05, Math.min(0.95, st.sx + dx)); s.y = Math.max(0.05, Math.min(0.95, st.sy + dy)); } pos(); };
  e.onpointerup = ev => { pointers.delete(ev.pointerId); if (!st) return; e.classList.remove('drag'); const moved = st.moved; st = null; if (moved) { A.stick(1); buzz(5); save(); } };
  return e;
}
/* 두 손가락: 고른 것을 돌리고 키움 */
const pointers = new Map();
function twoFinger(pg) {
  pg.style.setProperty('--pw', pg.clientWidth + 'px');
  let g0 = null;
  const ang = (a, b) => Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * 180 / Math.PI, dist = (a, b) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
  pg.addEventListener('pointerdown', e => { pointers.set(e.pointerId, e); if (pointers.size === 2 && ED.sel != null) { const [a, b] = [...pointers.values()]; const s = pageList()[ED.sel]; g0 = { a: ang(a, b), d: dist(a, b), r: s.r, w: s.w }; } }, true);
  pg.addEventListener('pointermove', e => { if (!pointers.has(e.pointerId)) return; pointers.set(e.pointerId, e); if (pointers.size === 2 && g0 && ED.sel != null) { const [a, b] = [...pointers.values()]; const s = pageList()[ED.sel]; s.r = Math.round(g0.r + ang(a, b) - g0.a); s.w = Math.max(0.12, Math.min(s.k === 'tape' ? 0.9 : 0.6, g0.w * dist(a, b) / g0.d)); document.querySelector(`#epage .placed[data-i="${ED.sel}"]`)?.__pos(); } }, true);
  const up = e => { pointers.delete(e.pointerId); if (pointers.size < 2 && g0) { g0 = null; save(); } };
  pg.addEventListener('pointerup', up, true); pg.addEventListener('pointercancel', up, true);
}
function select(i, keep) {
  ED.sel = i; document.querySelectorAll('#epage .placed').forEach(p => p.classList.toggle('sel', +p.dataset.i === i));
  if (!keep || true) bar();
}
function selTool(k) {
  const list = pageList(), i = ED.sel, s = list[i]; if (!s) return;
  if (k === 'ok') { select(null); return; }
  if (k === 'rot') s.r = ((s.r + 15 + 180) % 360) - 180; if (k === 'big') s.w = Math.min(s.k === 'tape' ? 0.9 : 0.6, s.w + 0.04); if (k === 'small') s.w = Math.max(0.12, s.w - 0.04);
  if (k === 'off') { list.splice(i, 1); if (!s.k) { give(s.ty); toast(`${nameOf(s.ty)} 스티커를 서랍에 돌려 놓았어요`); } ED.sel = null; save(); drawEditor(); return; }
  A.click(); save(); document.querySelector(`#epage .placed[data-i="${i}"]`)?.__pos();
}
/* 빈자리 찾기: 기존 것과 가장 덜 겹치는 칸 */
function freeSpot(w) {
  const list = pageList(); let best = null;
  for (let y = 0.2; y <= 0.82; y += 0.1) for (let x = 0.18; x <= 0.82; x += 0.11) {
    let o = 0; for (const s of list) { if (s.k === 'tape') continue; const d = Math.hypot((s.x - x), (s.y - y) * 1.3), need = (s.w + w) * 0.5; if (d < need) o += need - d; }
    o += Math.random() * 0.01; if (!best || o < best.o) best = { x, y, o };
  }
  return best;
}
function placeNew(s) {
  const list = pageList(); const was = stickersOf(list).length; list.push(s); save(); ED.sel = null; drawEditor();
  const el = document.querySelector(`#epage .placed[data-i="${list.length - 1}"]`); el?.animate([{ transform: `translate(-50%,-50%) rotate(${s.r * 3}deg) scale(1.5)`, opacity: .3 }, { transform: `translate(-50%,-50%) rotate(${s.r}deg) scale(.95)`, opacity: 1, offset: .8 }, { transform: `translate(-50%,-50%) rotate(${s.r}deg) scale(1)` }], { duration: sp(380), easing: 'ease-out' });
  setTimeout(() => { A.stick(list.length); buzz(6); }, sp(300));
  if (!s.k && was < PAGE_DONE && stickersOf(list).length >= PAGE_DONE) { setTimeout(() => { A.clear(); const r = $('#epage').getBoundingClientRect(); praise(r.left + r.width / 2, r.top + 40, '이 쪽 완성! 예뻐요'); }, sp(420)); checkNoteDone(); }
}
function sheet() {
  const sh = $('#esheet'); if (sh.classList.contains('on') && sh.dataset.k === 'st') { sh.classList.remove('on'); return; }
  const theme = new Set(ED.n.stickers);
  const ids = Object.keys(S.drawer).filter(id => S.drawer[id] > 0).sort((a, b) => (theme.has(+b) - theme.has(+a)) || (isFoil(b) - isFoil(a)) || S.drawer[b] - S.drawer[a]);
  sh.dataset.k = 'st';
  sh.innerHTML = ids.length ? `<div class="srow">${ids.map(id => `<button data-id="${id}" class="${isFoil(id) ? 'foil' : ''} ${theme.has(+id) ? 'th' : ''}"><img src="${img(id)}"><b>${S.drawer[id]}</b></button>`).join('')}</div><small>${ED.n.name}에 어울리는 스티커가 앞에 있어요 · 눌러서 붙이기</small>` : `<p>서랍이 비었어요. 한 판 깨면 스티커가 생겨요!</p><button class="btn main" id="s_play">자유 다꾸 한 판</button>`;
  sh.classList.add('on');
  $('#s_play') && ($('#s_play').onclick = () => go.free());
  sh.querySelectorAll('[data-id]').forEach(b => b.onclick = () => {
    const id = b.dataset.id; if (!take(id)) return; const w = 0.26, sp_ = freeSpot(w);
    placeNew({ ty: isFoil(id) ? id : +id, x: sp_.x, y: sp_.y, w, r: Math.round((Math.random() - 0.5) * 24) });
    sheet(); sheet();
  });
}
function tapeSheet() {
  const sh = $('#esheet'); sh.dataset.k = 'tape';
  sh.innerHTML = `<div class="srow tapes">${TAPES.map(c => `<button data-c="${c}"><i style="background:${c}"></i></button>`).join('')}</div><small>붙인 뒤 끝을 끌거나 두 손가락으로 길이 · 각도를 바꿔요</small>`; sh.classList.add('on');
  sh.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { const p = freeSpot(0.4); placeNew({ k: 'tape', c: b.dataset.c, x: p.x, y: p.y, w: 0.42, r: Math.round((Math.random() - 0.5) * 30) }); sh.classList.remove('on'); });
}
function addText() {
  $('#esheet').classList.remove('on');
  modal(`<h3>손글씨 한 줄</h3><input id="etext" maxlength="24" placeholder="오늘의 한 마디 (24자까지)"><button class="btn main" data-a="ok">붙이기</button><button class="btn ghost" data-a="close">그만두기</button>`, a => {
    if (a === 'close') return closeModal(); if (a !== 'ok') return; const t = ($('#etext').value || '').trim(); if (!t) { toast('한 글자라도 써 주세요'); return; } closeModal();
    const p = freeSpot(0.5); placeNew({ k: 'text', t, x: p.x, y: p.y, w: 0.5, r: Math.round((Math.random() - 0.5) * 8) });
  });
  setTimeout(() => $('#etext')?.focus(), 50);
}
function paperSheet() {
  const sh = $('#esheet'); sh.dataset.k = 'paper'; const curP = ED.nt.papers[ED.nt.cur] || 'dot';
  sh.innerHTML = `<div class="srow papers">${PAPERS.map(p => `<button data-p="${p.id}" class="${p.id === curP ? 'on' : ''}"><i data-paper="${p.id}"></i>${p.name}</button>`).join('')}</div><small>이 쪽의 속지를 바꿔요</small>`; sh.classList.add('on');
  sh.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { ED.nt.papers[ED.nt.cur] = b.dataset.p; save(); A.shuffle(); drawEditor(); paperSheet(); });
}
function checkNoteDone() {
  const { n, nt } = ED; if (nt.done || pagesDone(nt) < PAGES) return;
  nt.done = true; give('f' + n.sig, 3); save(true);
  setTimeout(() => { A.clear(); modal(`<h3>${n.name}를 다 채웠어요!</h3><div class="rw"><img src="${img(n.sig)}" class="foilimg"></div><p>12쪽을 모두 꾸몄어요. 금박 표지로 바뀌고, 금박 ${nameOf(n.sig)} 스티커 3장을 서랍에 넣어 드렸어요.</p><button class="btn main" data-a="close">고마워요</button>`); burst(app.clientWidth / 2, app.clientHeight * .4, 30, true); }, sp(900));
}

/* ---------- 스티커 서랍 ---------- */
function drawer() {
  const all = [...Array(COUNT).keys(), ...PACKS.pack_foil.ids];
  const kinds = all.filter(id => S.seen[id]).length;
  $('#drawer').innerHTML = `<div class="hd"><div><h1>스티커 서랍</h1><p>모은 종류 ${kinds}/${all.length} · 지금 ${drawerTotal()}장</p></div><div class="gold off"></div></div>
  <div class="paper grid">${all.map(id => { const n = S.drawer[id] || 0, seen = S.seen[id]; return `<div class="dc ${seen ? '' : 'unseen'} ${isFoil(id) ? 'foil' : ''}"><img src="${img(id)}" alt=""><b>${seen ? n : '?'}</b><small>${seen ? nameOf(id) : '아직 못 만남'}</small></div>`; }).join('')}</div>
  <p class="tip">판을 깰 때마다 3장 · 도구 없이 깨면 1장 더 · 노트에 붙이면 서랍에서 빠지고, 떼면 돌아와요.</p>`;
}

/* ---------- 상점: 그림 카드 · 미리 보기 · 개봉 연출 ---------- */
const noteBy = id => NOTES.find(n => n.id === id);
const coverHTML = n => `<span class="cv mini" style="--c:${n.color}"><i>${n.name.replace(' 노트', '')}</i><img src="${img(n.foil ? 'f' + n.sig : n.sig)}" class="${n.foil ? 'foilimg' : ''}"></span>`;
const pagesHTML = ids => `<span class="pgs">${[0, 1].map(j => `<span class="pgm">${ids.slice(j * 3, j * 3 + 3).map((id, k) => `<img src="${img(id)}" style="--r:${(k - 1) * 9}deg">`).join('')}</span>`).join('')}</span>`;
const fanHTML = (ids, foil) => `<span class="fan ${foil ? 'shine' : ''}">${ids.slice(0, 7).map((id, k, a) => `<img src="${img(id)}" class="${isFoil(id) ? 'foilimg' : ''}" style="--a:${(k - (a.length - 1) / 2) * 12}deg">`).join('')}</span>`;
function shop() {
  const i = bm.info, ok = i.ok, adLeft = i.ads?.reward ? i.ads.rewardLeft : 0;
  const btn = sku => { const owned = S.owned[sku]; if (owned) return '<em class="own">가지고 있어요</em>'; if (!ok) return '<em class="app">원어데이 앱에서 살 수 있어요</em>'; return `<button class="btn main" data-buy="${sku}">${coin(bm.price(sku) || SHOP[sku].gold)}</button>`; };
  const card = (sku, art, desc, pv) => `<div class="pc"><div class="art">${art}</div><div class="pi"><b>${SHOP[sku].name}</b><small>${desc}</small><div class="pb"><button class="btn ghost pvb" data-pv="${pv}">${ICON.eye}미리 보기</button>${btn(sku)}</div></div></div>`;
  const starterOk = !S.owned.starter && !BUNDLE.starter.some(s => S.owned[s]);
  const L = noteBy('letter'), P = noteBy('picnic'), Gd = noteBy('gold');
  $('#shop').innerHTML = `<div class="hd"><div><h1>상점</h1><p>${ok ? '원어데이 골드로 사요 · 모든 상품에 무료 길이 있어요' : '그림은 여기서 구경하고, 원어데이 앱에서 살 수 있어요'}</p></div><div class="gold off"></div></div>
  ${starterOk ? `<div class="paper pc hero2"><div class="art">${coverHTML(P)}${fanHTML(PACKS.pack_foil.ids, true)}</div><div class="pi"><span class="badge">처음 한 번</span><b>입문 묶음</b><small>피크닉 노트 + 금박 스티커 12종 × 2 · 낱개 ${coin(400)} 보다 싸게</small><div class="pb"><button class="btn ghost pvb" data-pv="starter">${ICON.eye}미리 보기</button>${btn('starter')}</div></div></div>` : ''}
  <div class="paper sec"><h3>도구</h3><p class="sub">매일 무료로 되돌리기 2 · 모으기 1 · 섞기 1이 채워져요. 지금 ${S.tools.undo} · ${S.tools.magnet} · ${S.tools.shuffle}</p>
   ${ok ? `<div class="two">${adLeft > 0 ? `<button class="btn" data-ad="tool">${ICON.ad} 광고 보고 도구 1개 <small>${adLeft}번 남음</small></button>` : ''}<button class="btn main" data-buy="tools3">${ICON.instant} 도구 묶음 (각 1) · ${coin(bm.price('tools3') || 30)}</button></div><p class="sub">광고 1번 = 가장 적게 남은 도구 1개 (판 안에서와 같아요)</p>` : ''}</div>
  <div class="paper sec"><h3>테마 노트</h3>
   ${card('note_letter', coverHTML(L) + pagesHTML(L.stickers), '편지지 · 향수 · 장미 감성 12쪽', 'letter')}
   ${card('note_picnic', coverHTML(P) + pagesHTML(P.stickers), '레몬 · 팬케이크 · 데이지 12쪽', 'picnic')}
   <div class="pc"><div class="art">${coverHTML(Gd)}${pagesHTML(Gd.stickers.map(x => 'f' + x))}</div><div class="pi"><span class="badge g">소장자 전용</span><b>${Gd.name}</b><small>금박 표지 · 금박 스티커와 어울리는 12쪽</small><div class="pb">${i.owned ? '<em class="own">열려 있어요</em>' : '<em class="app">원어데이에서 이 게임을 소장하면 열려요</em>'}</div></div></div>
   <p class="sub">진행 맵 10 · 20 · 30단계에서도 새 노트가 무료로 열려요.</p></div>
  <div class="paper sec"><h3>프리미엄 스티커</h3>
   ${card('pack_foil', fanHTML(PACKS.pack_foil.ids, true), '금박 스티커 12종 × 2장 · 이후 판에서도 금박이 가끔 나와요', 'pack_foil')}
   ${card('pack_lucky', fanHTML(PACKS.pack_lucky.ids, false), '클로버 · 복주머니 · 달 · 반딧불 · 벚꽃 · 열기구 × 3장', 'pack_lucky')}
   <p class="sub">노트 한 권을 다 채워도 금박 스티커를 받아요.</p></div>`;
  $('#shop').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buy(b.dataset.buy));
  $('#shop').querySelectorAll('[data-pv]').forEach(b => b.onclick = () => previewItem(b.dataset.pv));
  $('#shop').querySelectorAll('[data-ad]').forEach(b => b.onclick = async () => { const r = await bm.rewardedAd('tool'); if (r.ok) { const k = ['undo', 'magnet', 'shuffle'].sort((a, c) => (S.tools[a] || 0) - (S.tools[c] || 0))[0]; S.tools[k]++; save(); toast({ undo: '되돌리기', magnet: '모으기', shuffle: '섞기' }[k] + ' +1'); shop(); goldChip(); } });
}
/* 미리 보기: 페이지 위에 올려 본 모습 */
function previewItem(k) {
  const n = noteBy(k), ids = n ? n.stickers : k === 'starter' ? PACKS.pack_foil.ids.slice(0, 6) : PACKS[k].ids.slice(0, 6);
  const spots = PAGE_TPL[2].spots;
  modal(`<h3>${n ? n.name : SHOP[k].name} 미리 보기</h3><div class="pvpage ${n ? '' : ''}" style="--c:${n?.color || '#c9a97c'}" data-paper="${n ? 'line' : 'dot'}">${ids.slice(0, 6).map((id, j) => { const [x, y, w, r] = spots[j]; return `<img src="${img(id)}" class="${isFoil(id) ? 'foilimg' : ''}" style="left:${x * 100}%;top:${(y - .18) * 100}%;width:${w * 100}%;transform:rotate(${r}deg)">`; }).join('')}</div><p class="sub">${n ? '이런 스티커들과 어울리는 12쪽 노트예요.' : '실제로 붙이면 이렇게 보여요.'}</p><button class="btn main" data-a="close">닫기</button>`);
}
export async function buy(sku) {
  const r = await bm.spend(sku);
  if (!r.ok) { if (r.reason === 'short') toast('골드가 모자라요'); else if (r.reason !== 'cancel') toast('지금은 살 수 없어요'); return; }
  const got = grant(sku); save(true); goldChip(); openBox(sku, got);
}
/* 개봉 연출: 봉투가 열리고 스티커가 부채꼴로 나와 서랍으로 → [바로 붙이러 가기] */
function openBox(sku, got) {
  const n = sku.startsWith('note_') ? noteBy(sku.slice(5)) : sku === 'starter' ? noteBy('picnic') : null;
  const ids = (got && got.length ? got : n ? n.stickers : []).slice(0, 7);
  A.get(); buzz(12);
  modal(`<div class="box"><div class="env"><i class="flap"></i>${n ? coverHTML(n) : ''}</div><div class="out">${ids.map((id, j) => `<img src="${img(id)}" class="${isFoil(id) ? 'foilimg' : ''}" style="--a:${(j - (ids.length - 1) / 2) * 16}deg;--d:${j * 70}ms">`).join('')}</div></div>
    <h3>${SHOP[sku].name.split(' (')[0]} 도착!</h3><p>${n ? `${n.name}가 책장에 꽂혔어요.` : ''} ${ids.length ? '스티커는 서랍에 넣어 두었어요.' : ''}</p>
    ${sku === 'tools3' ? '' : `<button class="btn main" data-a="goStick">바로 붙이러 가기</button>`}<button class="btn ghost" data-a="close">닫기</button>`, a => {
      if (a === 'close') { closeModal(); if (cur === 'shop') shop(); }
      if (a === 'goStick') { closeModal(); openEditor(n ? n.id : 'travel'); setTimeout(() => sheet(), sp(400)); }
    });
  setTimeout(() => burst(app.clientWidth / 2, app.clientHeight * .36, 24, true), sp(500));
}
/* 산 것 반영 (원어데이가 돌려준 소장 목록으로 복원할 때도) · 받은 스티커 목록을 돌려줌 */
export function grant(sku) {
  if (sku === 'tools3') { for (const t of ['undo', 'magnet', 'shuffle']) S.tools[t]++; return []; }
  if (BUNDLE[sku]) { const out = []; S.owned[sku] = 1; for (const s of BUNDLE[sku]) out.push(...grant(s)); return out; }
  if (S.owned[sku]) return []; S.owned[sku] = 1;
  if (PACKS[sku]) { for (const id of PACKS[sku].ids) give(id, PACKS[sku].n); if (sku === 'pack_foil') S.foil = true; return PACKS[sku].ids.slice(); }
  return [];
}
export { stageCfg };
