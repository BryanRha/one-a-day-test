// 화면들 — 홈 · 진행 맵 · 테마 노트(책장 · 꾸미기) · 스티커 서랍 · 상점 · 다이어리(달력)
import { NOTES, PAGES, PAGE_DONE, COUNT, img, nameOf, isFoil, SHOP, PACKS, OBSTACLE_AT, stageCfg } from './data.js?v=0.90.0';
import { S, save, day, dayKey, parseDay, missedDays, give, take, note } from './save.js?v=0.90.0';
import { renderPage, openShare } from './page.js?v=0.90.0';
import * as A from './audio.js?v=0.90.0';
import { $, sp, toast, modal, closeModal, DAYS, burst, praise, app } from './ui.js?v=0.90.0';
import { bm } from './oad_bm.js?v=0.90.0';

let go = null; /* main.js 가 넣어 줌: go.daily() · go.map(n) · go.free() */
export const bind = g => { go = g; };
const scr = ['home', 'map', 'notes', 'editor', 'drawer', 'shop', 'diary'];
export let cur = 'home';
export function show(name) {
  cur = name; A.click();
  for (const s of [...scr, 'game']) $('#' + s).classList.toggle('on', s === name);
  $('#nav').classList.toggle('on', name !== 'game' && name !== 'editor');
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.go === name || (name === 'diary' && b.dataset.go === 'home')));
  ({ home, map, notes, drawer, shop, diary })[name]?.();
  goldChip();
}
export function goldChip() { const i = bm.info; document.querySelectorAll('.gold').forEach(g => { g.classList.toggle('off', !i.ok); if (i.ok) g.textContent = `🪙 ${i.gold ?? 0}`; }); }
const noteOpen = n => n.open === 'free' || (n.open.startsWith('map:') && S.map >= +n.open.slice(4)) || (n.open.startsWith('gold:') && S.owned[n.open.slice(5)]);
const pagesDone = nt => nt.pages.filter(p => p.length >= PAGE_DONE).length;
const drawerTotal = () => Object.values(S.drawer).reduce((a, b) => a + b, 0);

/* ---------- 홈 ---------- */
function home() {
  const t = new Date(parseDay(dayKey())), dd = day(), w = dd.wins;
  const dots = [0, 1, 2].map(i => `<i class="${i < w ? 'on' : ''}"></i>`).join('');
  const week = []; for (let i = 6; i >= 0; i--) { const d = new Date(t); d.setDate(t.getDate() - i); const k = dayKey(d), x = S.days[k]; const before = k < S.first; week.push(`<button class="wk ${k === dayKey() ? 'today' : ''} ${x?.done ? 'done' : before ? 'pre' : i ? 'miss' : ''}" data-day="${k}"><small>${DAYS[d.getDay()]}</small><b>${d.getDate()}</b><em>${x?.done ? '' : (!before && i ? '쉼' : '')}</em></button>`); }
  const next = Math.min(30, S.map + 1), ob = S.map < 10 ? '11단계부터 얼음이 나와요' : S.map < 20 ? '21단계부터 사슬이 나와요' : S.map >= 30 ? '30단계를 모두 깼어요!' : '얼음 · 사슬 · 마지막 구간';
  const working = NOTES.filter(noteOpen).map(n => ({ n, nt: S.notes[n.id] })).sort((a, b) => (b.nt ? pagesDone(b.nt) + 1 : 0) - (a.nt ? pagesDone(a.nt) + 1 : 0)).slice(0, 3);
  $('#home').innerHTML = `<div class="hero"><div class="ht"><h1>오늘의 다꾸</h1><p>${t.getMonth() + 1}월 ${t.getDate()}일 ${DAYS[t.getDay()]}요일 · 하루 한 판, 다이어리 한 장</p></div><div class="gold off"></div></div>
  <div class="today paper">
    <div class="tp"><b>오늘 페이지</b><span class="dots">${dots}</span><em>${dd.done ? '완성!' : `${w}/3판`}</em></div>
    <p>${dd.done ? '오늘 페이지에 도장을 찍었어요. 이제 자유 다꾸로 마음껏 꾸며요.' : w ? `${3 - w}판만 더 깨면 오늘 페이지가 완성돼요.` : '하루 세 판을 깨면 날짜 도장이 찍힌 페이지 한 장이 남아요.'}</p>
    <button class="btn main big" id="h_today">${dd.done ? '오늘 페이지 보기' : `오늘의 판 시작 <small>${w + 1}/3</small>`}</button>
    <div class="week">${week.join('')}</div>
  </div>
  <div class="cards">
    <button class="cardb" id="h_map"><i class="ic map"></i><b>진행 맵</b><span>${S.map}/30단계</span><small>${ob}</small></button>
    <button class="cardb" id="h_free"><i class="ic free"></i><b>자유 다꾸</b><span>${S.free}판 · 제한 없음</span><small>서랍 스티커 ${drawerTotal()}장</small></button>
  </div>
  <div class="paper mini"><div class="mh"><b>꾸미는 중인 노트</b><button class="lnk" id="h_notes">책장 ›</button></div><div class="mrow">${working.map(({ n, nt }) => `<button class="mn" data-id="${n.id}" style="--c:${n.color}"><span><img src="${img(n.sig)}"></span><small>${n.name}<br>${nt ? pagesDone(nt) : 0}/${PAGES}쪽</small></button>`).join('')}</div></div>
  <button class="btn" id="h_diary">내 다이어리 보기 · ${Object.values(S.days).filter(d => d.done).length}장</button>`;
  $('#h_today').onclick = () => dd.done ? openDay(dayKey()) : go.daily();
  $('#h_notes').onclick = () => show('notes'); document.querySelectorAll('#home .mn').forEach(b => b.onclick = () => openEditor(b.dataset.id));
  $('#h_map').onclick = () => show('map'); $('#h_free').onclick = () => go.free(); $('#h_diary').onclick = () => show('diary');
  document.querySelectorAll('#home .wk').forEach(b => b.onclick = () => { const k = b.dataset.day; if (S.days[k]?.done || b.classList.contains('miss')) openDay(k); else if (k === dayKey()) go.daily(); });
}

/* ---------- 다이어리 (달력 · 놓친 날 도장) ---------- */
let cal = null;
function diary() {
  const t = parseDay(dayKey()); if (!cal) cal = { y: t.getFullYear(), m: t.getMonth() };
  const first = new Date(cal.y, cal.m, 1), n = new Date(cal.y, cal.m + 1, 0).getDate(), miss = new Set(missedDays(400));
  let cells = ''; for (let i = 0; i < first.getDay(); i++) cells += '<i></i>';
  for (let d = 1; d <= n; d++) { const k = dayKey(new Date(cal.y, cal.m, d, 12)), x = S.days[k]; cells += `<button data-day="${k}" class="${x?.done ? 'done' : miss.has(k) ? 'miss' : ''} ${k === dayKey() ? 'today' : ''}"><b>${d}</b>${x?.done ? '<em class="mst"></em>' : miss.has(k) ? '<em class="mst g"></em>' : ''}</button>`; }
  const done = Object.values(S.days).filter(d => d.done).length;
  $('#diary').innerHTML = `<div class="hd"><div><h1>내 다이어리</h1><p>모은 페이지 ${done}장 · 놓친 날은 벌 없이 도장만 남아요</p></div><div class="gold off"></div></div>
  <div class="paper calw"><div class="calh"><button data-m="-1">‹</button><b>${cal.y}년 ${cal.m + 1}월</b><button data-m="1">›</button></div>
  <div class="cal">${DAYS.map(x => `<small>${x}</small>`).join('')}${cells}</div></div>
  <div class="legend"><span><i class="lg r"></i>완성한 날</span><span><i class="lg g"></i>쉬어 간 날 (벌 없음)</span><span><i class="lg t"></i>오늘</span></div>
  <div class="paper mini"><div class="mh"><b>최근 페이지</b></div><div class="recent">${Object.keys(S.days).filter(k => S.days[k].done).sort().reverse().slice(0, 4).map(k => { const d = parseDay(k), st = S.days[k].stickers.slice(0, 3); return `<button data-day="${k}"><span>${st.map(x => `<img src="${img(x.ty)}">`).join('')}</span><small>${d.getMonth() + 1}/${d.getDate()}</small></button>`; }).join('') || '<p class="sub">하루 세 판을 깨면 첫 페이지가 여기에 생겨요.</p>'}</div></div>
  <p class="tip">소장하면 매일 열리고, 다이어리가 계정에 평생 보관돼요.</p>`;
  $('#diary').querySelectorAll('[data-m]').forEach(b => b.onclick = () => { cal.m += +b.dataset.m; if (cal.m < 0) { cal.m = 11; cal.y--; } if (cal.m > 11) { cal.m = 0; cal.y++; } diary(); });
  $('#diary').querySelectorAll('[data-day]').forEach(b => b.onclick = () => { const k = b.dataset.day; if (S.days[k]?.done || miss.has(k)) openDay(k); else if (k === dayKey()) go.daily(); });
}
export function openDay(k) {
  const pg = $('#page'), missed = !S.days[k]?.done;
  pg.classList.add('on'); pg.style.transform = 'translateY(0)';
  renderPage(pg, k, { missed });
  $('#pageUI').innerHTML = (missed ? '' : `<button class="btn main" data-p="share">공유 카드 만들기</button>`) + `<button class="btn" data-p="close">닫기</button>`;
  $('#pageUI').classList.add('on');
  $('#pageUI').onclick = e => { const p = e.target.dataset.p; if (p === 'share') openShare(k); if (p === 'close') { pg.classList.remove('on'); $('#pageUI').classList.remove('on'); } };
}

/* ---------- 진행 맵 30단계 ---------- */
function map() {
  let h = ''; for (let n = 30; n >= 1; n--) {
    const st = n <= S.map ? 'done' : n === S.map + 1 ? 'cur' : 'lock', side = ['l', 'c', 'r', 'c'][n % 4];
    const tag = n % 10 === 0 ? `<em class="gift">${NOTES[2 + n / 10].name}</em>` : OBSTACLE_AT[n] ? `<em class="new">${OBSTACLE_AT[n] === 'ice' ? '얼음 등장' : '사슬 등장'}</em>` : '';
    h += `<div class="node ${side}"><button class="st ${st} ${n % 10 === 0 ? 'big' : ''}" data-n="${n}">${n % 10 === 0 ? '<i class="ic note"></i>' : `<b>${n}</b>`}</button>${tag}</div>`;
  }
  $('#map').innerHTML = `<div class="hd"><div><h1>진행 맵</h1><p>${S.map}/30단계 · 10단계마다 새 노트와 새 재미</p></div><div class="gold off"></div></div><div class="path">${h}</div>`;
  $('#map').querySelectorAll('.st').forEach(b => b.onclick = () => { const n = +b.dataset.n; if (n > S.map + 1) { A.nope(); toast(`${S.map + 1}단계를 먼저 깨 주세요`); return; } go.map(n); });
  setTimeout(() => { const c = $('#map .st.cur') || $('#map .st.done'); c?.scrollIntoView({ block: 'center' }); }, 30);
}

/* ---------- 테마 노트 책장 ---------- */
function notes() {
  const h = NOTES.map(n => { const nt = S.notes[n.id], open = noteOpen(n), dn = nt ? pagesDone(nt) : 0;
    const lock = n.open.startsWith('map:') ? `진행 맵 ${n.open.slice(4)}단계` : n.open.startsWith('gold:') ? `상점 · 🪙${SHOP[n.open.slice(5)].gold}` : '';
    return `<button class="nb ${open ? '' : 'lock'} ${nt?.done ? 'done' : ''}" data-id="${n.id}" style="--c:${n.color}"><span class="cv"><i>${n.name.replace(' 노트', '')}</i><img src="${img(nt?.done ? 'f' + n.sig : n.sig)}" class="${nt?.done ? 'foilimg' : ''}"></span><b>${n.name}</b><small>${open ? (nt?.done ? '다 채웠어요 · 금박 표지' : `${dn}/${PAGES}쪽`) : '🔒 ' + lock}</small></button>`; }).join('');
  $('#notes').innerHTML = `<div class="hd"><div><h1>테마 노트</h1><p>한 권 ${PAGES}쪽 · 한 쪽에 스티커 ${PAGE_DONE}장이면 완성 · 다 채우면 표지와 금박 스티커</p></div><div class="gold off"></div></div><div class="shelf">${h}</div>`;
  $('#notes').querySelectorAll('.nb').forEach(b => b.onclick = () => { const n = NOTES.find(x => x.id === b.dataset.id); if (!noteOpen(n)) { A.nope(); if (n.open.startsWith('gold:')) show('shop'); else toast(`진행 맵 ${n.open.slice(4)}단계를 깨면 열려요`); return; } openEditor(n.id); });
}

/* ---------- 노트 꾸미기 (끌어서 옮기기 · 눌러서 돌리기/떼기) ---------- */
let ED = null;
export function openEditor(id, page) { const n = NOTES.find(x => x.id === id), nt = note(id); if (page != null) nt.cur = page; ED = { n, nt, sel: null }; show('editor'); drawEditor(); }
function drawEditor() {
  const { n, nt } = ED, p = nt.cur, list = nt.pages[p];
  $('#editor').style.setProperty('--paper', n.paper); $('#editor').style.setProperty('--c', n.color);
  $('#editor').innerHTML = `<div class="etop"><button class="pbtn" id="e_back">‹</button><div><b>${n.name}</b><small>${p + 1}/${PAGES}쪽 · ${list.length >= PAGE_DONE ? '이 쪽 완성 ✓' : `스티커 ${list.length}/${PAGE_DONE}`}</small></div><span class="gold off"></span></div>
  <div class="epage" id="epage"><div class="edeco"></div></div>
  <div class="ebar"><button class="pbtn" id="e_prev" ${p ? '' : 'disabled'}>‹</button><button class="btn main" id="e_add">스티커 붙이기 <small>서랍 ${drawerTotal()}장</small></button><button class="pbtn" id="e_next" ${p < PAGES - 1 ? '' : 'disabled'}>›</button></div>
  <div class="esheet" id="esheet"></div>`;
  const pg = $('#epage'); list.forEach((s, i) => addPlaced(pg, s, i));
  $('#e_back').onclick = () => { ED = null; show('notes'); };
  $('#e_prev').onclick = () => { nt.cur = Math.max(0, p - 1); save(); drawEditor(); };
  $('#e_next').onclick = () => { nt.cur = Math.min(PAGES - 1, p + 1); save(); drawEditor(); };
  $('#e_add').onclick = () => sheet();
  pg.onpointerdown = e => { if (e.target === pg || e.target.classList.contains('edeco')) select(null); };
  goldChip();
}
function addPlaced(pg, s, i) {
  const e = document.createElement('div'); e.className = 'placed' + (isFoil(s.ty) ? ' foil' : ''); e.dataset.i = i;
  e.style.left = s.x * 100 + '%'; e.style.top = s.y * 100 + '%'; e.style.width = s.w * 100 + '%'; e.style.transform = `translate(-50%,-50%) rotate(${s.r}deg)`;
  e.innerHTML = `<img src="${img(s.ty)}" alt="${nameOf(s.ty)}">`; pg.appendChild(e);
  let st = null;
  e.onpointerdown = ev => { ev.preventDefault(); ev.stopPropagation(); e.setPointerCapture(ev.pointerId); const r = pg.getBoundingClientRect(); st = { x: ev.clientX, y: ev.clientY, sx: s.x, sy: s.y, r, moved: false }; e.classList.add('drag'); };
  e.onpointermove = ev => { if (!st) return; const dx = (ev.clientX - st.x) / st.r.width, dy = (ev.clientY - st.y) / st.r.height; if (Math.abs(dx) + Math.abs(dy) > 0.01) st.moved = true; s.x = Math.max(0.05, Math.min(0.95, st.sx + dx)); s.y = Math.max(0.05, Math.min(0.95, st.sy + dy)); e.style.left = s.x * 100 + '%'; e.style.top = s.y * 100 + '%'; };
  e.onpointerup = () => { if (!st) return; e.classList.remove('drag'); const moved = st.moved; st = null; if (moved) { A.stick(1); save(); } else select(i); };
  return e;
}
function select(i) {
  ED.sel = i; document.querySelectorAll('#epage .placed').forEach(p => p.classList.toggle('sel', +p.dataset.i === i));
  $('#epage .etool')?.remove(); if (i == null) return;
  const s = ED.nt.pages[ED.nt.cur][i]; const t = document.createElement('div'); t.className = 'etool'; t.style.left = s.x * 100 + '%'; t.style.top = `calc(${s.y * 100}% + ${s.w * 55}vw)`;
  t.innerHTML = `<button data-t="rot">↻ 돌리기</button><button data-t="big">크게</button><button data-t="small">작게</button><button data-t="off">떼기</button>`;
  $('#epage').appendChild(t);
  t.onpointerdown = e => e.stopPropagation();
  t.onclick = e => { const k = e.target.dataset.t; if (!k) return; const list = ED.nt.pages[ED.nt.cur];
    if (k === 'rot') s.r = ((s.r + 15 + 180) % 360) - 180; if (k === 'big') s.w = Math.min(0.5, s.w + 0.04); if (k === 'small') s.w = Math.max(0.14, s.w - 0.04);
    if (k === 'off') { list.splice(i, 1); give(s.ty); toast(`${nameOf(s.ty)} 스티커를 서랍에 돌려 놓았어요`); }
    A.click(); save(); drawEditor(); if (k !== 'off') select(i); };
}
function sheet() {
  const sh = $('#esheet'); if (sh.classList.contains('on')) { sh.classList.remove('on'); return; }
  const theme = new Set(ED.n.stickers);
  const ids = Object.keys(S.drawer).filter(id => S.drawer[id] > 0).sort((a, b) => (theme.has(+b) - theme.has(+a)) || (isFoil(b) - isFoil(a)) || S.drawer[b] - S.drawer[a]);
  sh.innerHTML = ids.length ? `<div class="srow">${ids.map(id => `<button data-id="${id}" class="${isFoil(id) ? 'foil' : ''} ${theme.has(+id) ? 'th' : ''}"><img src="${img(id)}"><b>${S.drawer[id]}</b></button>`).join('')}</div><small>${ED.n.name} 어울리는 스티커가 앞에 있어요 · 눌러서 붙이기</small>` : `<p>서랍이 비었어요. 한 판 깨면 스티커가 생겨요!</p><button class="btn main" id="s_play">자유 다꾸 한 판</button>`;
  sh.classList.add('on');
  $('#s_play') && ($('#s_play').onclick = () => go.free());
  sh.querySelectorAll('[data-id]').forEach(b => b.onclick = () => {
    const id = b.dataset.id; if (!take(id)) return; const list = ED.nt.pages[ED.nt.cur];
    const s = { ty: isFoil(id) ? id : +id, x: 0.3 + Math.random() * 0.4, y: 0.3 + Math.random() * 0.4, w: 0.26, r: Math.round((Math.random() - 0.5) * 24) };
    const was = list.length; list.push(s); save();
    drawEditor(); $('#esheet').classList.add('on'); sheet(); sheet();
    const el = document.querySelector(`#epage .placed[data-i="${list.length - 1}"]`); el?.animate([{ transform: `translate(-50%,-50%) rotate(${s.r * 3}deg) scale(1.5)`, opacity: .3 }, { transform: `translate(-50%,-50%) rotate(${s.r}deg) scale(.95)`, opacity: 1, offset: .8 }, { transform: `translate(-50%,-50%) rotate(${s.r}deg) scale(1)` }], { duration: sp(380), easing: 'ease-out' });
    setTimeout(() => A.stick(list.length), sp(300));
    if (was < PAGE_DONE && list.length >= PAGE_DONE) { setTimeout(() => { A.clear(); const r = $('#epage').getBoundingClientRect(); praise(r.left + r.width / 2, r.top + 40, '이 쪽 완성! 예뻐요'); }, sp(420)); checkNoteDone(); }
  });
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

/* ---------- 상점 ---------- */
function shop() {
  const i = bm.info, ok = i.ok;
  const row = (sku, desc, owned) => { const it = SHOP[sku], price = bm.price(sku) || it.gold;
    return `<div class="si ${owned ? 'own' : ''}"><div><b>${it.name}</b><small>${desc}</small></div>${owned ? '<em>가지고 있어요</em>' : ok ? `<button class="btn main" data-buy="${sku}">🪙${price}</button>` : ''}</div>`; };
  const adLeft = i.ads?.reward ? i.ads.rewardLeft : 0;
  $('#shop').innerHTML = `<div class="hd"><div><h1>상점</h1><p>${ok ? '원어데이 골드로 사요 · 모든 상품에 무료 길이 있어요' : '원어데이 앱 안에서 살 수 있어요 · 게임은 그대로 무료'}</p></div><div class="gold off"></div></div>
  <div class="paper sec"><h3>도구</h3><p class="sub">매일 무료로 되돌리기 2 · 모으기 1 · 섞기 1이 채워져요. 지금 ${S.tools.undo} · ${S.tools.magnet} · ${S.tools.shuffle}</p>
   ${ok ? `<div class="two">${adLeft > 0 ? `<button class="btn" data-ad="tool">📺 광고 보고 하나씩 +1 <small>${adLeft}번 남음</small></button>` : ''}<button class="btn main" data-buy="tools3">⚡ 도구 묶음 · 🪙${bm.price('tools3') || 30}</button></div>` : ''}</div>
  <div class="paper sec"><h3>테마 노트</h3>${row('note_letter', '편지지 · 우표 · 향초 감성 12쪽', S.owned.note_letter)}${row('note_picnic', '돗자리 · 레몬 · 팬케이크 12쪽', S.owned.note_picnic)}<p class="sub">진행 맵 10 · 20 · 30단계에서도 새 노트가 무료로 열려요.</p></div>
  <div class="paper sec"><h3>프리미엄 스티커</h3>${row('pack_foil', '금박 스티커 12종 × 2장 · 이후 판에서도 금박이 가끔 나와요', S.owned.pack_foil)}${row('pack_lucky', '클로버 · 복주머니 · 달 · 반딧불 · 벚꽃 · 열기구 × 3장', S.owned.pack_lucky)}<p class="sub">노트 한 권을 다 채워도 금박 스티커를 받아요.</p></div>`;
  $('#shop').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buy(b.dataset.buy));
  $('#shop').querySelectorAll('[data-ad]').forEach(b => b.onclick = async () => { const r = await bm.rewardedAd('tool'); if (r.ok) { for (const t of ['undo', 'magnet', 'shuffle']) S.tools[t]++; save(); toast('도구를 하나씩 채웠어요'); shop(); goldChip(); } });
}
export async function buy(sku) {
  const r = await bm.spend(sku);
  if (!r.ok) { if (r.reason === 'short') toast('골드가 모자라요'); else if (r.reason !== 'cancel') toast('지금은 살 수 없어요'); return; }
  grant(sku); A.get(); save(true); toast(`${SHOP[sku].name} · 고마워요!`); if (cur === 'shop') shop(); goldChip();
}
/* 산 것 반영 (원어데이가 돌려준 소장 목록으로 복원할 때도) */
export function grant(sku) {
  if (sku === 'tools3') { for (const t of ['undo', 'magnet', 'shuffle']) S.tools[t]++; return; }
  if (S.owned[sku]) return; S.owned[sku] = 1;
  if (PACKS[sku]) { for (const id of PACKS[sku].ids) give(id, PACKS[sku].n); if (sku === 'pack_foil') S.foil = true; }
}
export { stageCfg };
