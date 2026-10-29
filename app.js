// One a Day 앱 화면: 오늘 · 라이브러리 · 컬렉션 · 설정 + 게임 실행(iframe) + 잠금 해제(테스트 광고)
import { PLANNED, TEASE, PICK } from './catalog.js?v=0.92.1';
import * as R from './rules.js?v=0.92.1';
import * as I from './install.js?v=0.92.1';
import * as T from './track.js?v=0.92.1';
import * as P from './pay.js?v=0.92.1';
import * as A from './account.js?v=0.92.1';
import * as C from './cloud.js?v=0.92.1';
import * as BM from './bm.js?v=0.92.1';
// 오늘의 운세: 엔진(330KB)은 처음 볼 때만 불러옴
let FT = null; const ft = () => FT ? Promise.resolve(FT) : import('./fortune/fortune.js?v=0.92.1').then(m => (FT = m));
/* 운세 덧붙이기(2026-10-28 과제 F): 오늘의 타로 · 사주 유형 · AI 상담 실험 — 새 파일로 나눠 두고 여기선 연결만 */
let EX = null; const ex = () => EX ? Promise.resolve(EX) : Promise.all([ft(), import('./fortune/tarot.js?v=0.92.1'), import('./fortune/types.js?v=0.92.1'), import('./fortune/chat.js?v=0.92.1')]).then(([, tarot, types, chat]) => (EX = { tarot, types, chat }));
const XC = () => ({ $, ft, R, T, P, A, won, face, openSheet, closeSheet, sdClose, toast, go, paidPage, partnerForm, fortuneForm });

const $ = s => document.querySelector(s);
const view = $('#view');
const VERSION = '0.92.1';
window.OAD_VERSION = VERSION;
let tab = 'today', timer = null;

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const fmtDate = d => `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEK[d.getDay()]}요일`;
const fmtKey = k => { const [, m, d] = k.split('-').map(Number); return `${m}월 ${d}일`; };
const hms = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return [s / 3600, (s % 3600) / 60, s % 60].map(v => String(Math.floor(v)).padStart(2, '0')).join(':'); };
const G = id => R.GAMES[id];
/* PC 판별: 마우스(정밀 포인터)이고 폰 · 앱 속 브라우저가 아님 (화면 배치 · 설치 문구 · 게임 창 높이에 씀) */
const isPC = () => !I.env.inApp && !I.env.ios && !I.env.android && (matchMedia('(pointer:fine)').matches || innerWidth >= 1200);
const KB = 'tabindex="0" role="button"';   /* div 로 만든 눌리는 것: Tab 으로 가고 Enter · Space 로 누름 */
const STATE_BADGE = { today: ['today', '오늘의 게임'], free: ['open', '자유 플레이'], owned: ['open', '소장'], unlocked: ['open', '오늘 열림'], locked: ['lock', '🔒 잠김'] };

/* 메인 시안 (bm.js homeGroup): 'b' 이번 주 달력 허브 · 'a' 예전 메인 — 테스트는 주소 ?home=a|b 로도 바꿈 */
let LAY = BM.homeGroup();
{ const u = new URL(location.href), h = u.searchParams.get('home'); if (h === 'a' || h === 'b') { if (!R.PROD) { BM.setHome(h); LAY = BM.homeGroup(); } u.searchParams.delete('home'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } }
/* 표지 · 아이콘은 webp 먼저 (빌드가 covers/*.webp · *_600.webp 를 만듦) — 빌드가 못 만든 게임(window.OAD_PNG)은 png · 그래도 못 읽으면 아래에서 png 로 */
const NOWEBP = new Set(Array.isArray(window.OAD_PNG) ? window.OAD_PNG : []);
const webp = (src, w) => { if (!src || !/\.png$/.test(src)) return src; const stem = src.replace(/^.*\//, '').replace(/(_icon)?\.png$/, ''); return NOWEBP.has(stem) ? src : src.replace(/\.png$/, w ? `_${w}.webp` : '.webp'); };
document.addEventListener('error', e => { const el = e.target; if (!el || el.tagName !== 'IMG' || !el.dataset.png || el.src.endsWith('.png')) return; const pic = el.closest('picture'); if (pic) pic.querySelectorAll('source').forEach(x => x.remove()); el.src = el.dataset.png; }, true);
const img = (src, w, extra = '') => `<img src="${webp(src, w)}" data-png="${src}" alt="" ${extra}>`;

function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 1800); }

// ── 탭 ─────────────────────────────────────────────
const RENDER = { today: () => LAY === 'b' && R.todayId() ? renderTodayB() : renderToday(), library: renderLibrary, collection: renderCollection, settings: renderSettings };
function go(t, via) {
  const re = !via && t === tab && t === 'today' && HM.live;   /* 같은 메인을 다시 그리기만(설치 가능 · 로그인 반영 등) = 노출 기록은 이어 감 */
  if (!re) homeLeave();
  if (tab !== t) T.track('tab', { tab: t });
  tab = t; document.body.dataset.tab = t; document.body.dataset.lay = LAY;   /* PC 넓은 화면은 '오늘'만 두 칸으로 넓힘 (app.css) */
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  clearInterval(timer);
  view.innerHTML = RENDER[t]();
  view.firstElementChild?.classList.add('fadein');
  window.scrollTo(0, 0);
  if (t === 'today') { tick(); timer = setInterval(tick, 1000); homeEnter(via || 're', re); if (via !== 'game') setTimeout(maybeOffer, 900); }
}
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => go(b.dataset.tab, 'tab'));

function header() {
  const s = R.state();
  const streak = s.streak.count && (s.streak.last === R.keyOf(R.now()) || isYesterday(s.streak.last)) ? s.streak.count : 0;
  return `<div class="top"><div class="brand">🌙 <b>One a Day</b></div><span class="tchips"><span class="chip hot">${streak ? `🔥 ${streak}일 연속` : '✨ 오늘 시작!'}</span>${A.current() ? `<button class="chip goldchip" data-shop>🪙 ${gnum(goldOf())}</button>` : ''}</span></div>`;
}
function isYesterday(k) { const y = R.now(); y.setDate(y.getDate() - 1); return k === R.keyOf(y); }

// ── 오늘 ───────────────────────────────────────────
function renderToday() {
  R.checkIn();   /* 🔥 들어오기만 해도 출석 */
  const id = R.todayId(), g = G(id), s = R.state(), lib = id && s.library[id];
  const playedToday = lib && lib.last === R.keyOf(R.now());
  const day = R.dayIndex() + 1;
  const yId = R.gameOn(R.dayIndex() - 1), hasY = R.dayIndex() > 0;
  /* 칸 묶음: .tfort(운세) · .tgame(오늘의 게임) · .tmore(나머지) — 폰은 이 순서대로 한 줄, PC 넓은 화면은 왼쪽 게임 · 오른쪽 운세 두 칸 (app.css) */
  return `<div class="today">
    ${header()}
    <div class="date">${fmtDate(R.now())} · ${day}일째</div>
    ${installBanner()}
    <div class="tfort" data-blk="fort"><div id="fortuneCard">${fortuneCardStatic()}</div>${R.fillable() ? `<div class="stampfill" data-stampfill data-blk="stamp" ${KB}>👣 어제 도장을 놓쳤어요 · 광고 1번 보고 🔥 연속 이어 가기</div>` : ''}</div>
    ${!id ? `<div class="tgame" data-blk="game"><div class="box" style="color:#DDD5FA"><div class="jua" style="font-size:18px;margin-bottom:6px">🎮 게임은 곧 하나씩 열려요</div>준비가 끝난 게임부터 매일 하나씩 공개할게요. 오늘은 운세부터 봐요!</div></div>` : `<div class="tgame"><div class="hero" data-blk="game">
      <div class="ribbon">오늘의 게임</div>
      <div class="cover" role="img" aria-label="${g.title}" style="background-image:url('${webp(g.cover)}')"></div>
      <div class="body">
        ${g.logo ? '' : `<h2>${g.title}</h2>\n        <div class="en">${g.en}</div>`}
        <div class="meta"><span class="chip">🎮 ${g.genre}</span><span class="chip">⏱ ${g.time}</span><span class="chip">👥 모두 같은 게임</span>${R.ratingBadge(id)}</div>
        <p>${g.tagline}</p>
        <button class="btn" data-play="${id}" data-from="home_hero">▶ 지금 플레이</button>
        ${playedToday ? `<div class="played">✓ 오늘 ${lib.plays}판 플레이 · 라이브러리에 저장됨</div>` : ''}
      </div>
    </div>
    ${tomorrowBox()}</div>`}
    <div class="tmore">${R.RULES.openAll && R.ORDER.some(g => g !== id) ? `<div class="section"><h3>모든 게임</h3><span class="more">테스트 기간 · 자유 플레이</span></div><div class="list" data-blk="all">${R.ORDER.filter(g => g !== id).map(itemCard).join('')}</div>` : (hasY && yId ? `<div class="section"><h3>어제의 게임</h3></div><div data-blk="yday">${itemCard(yId)}</div>` : '')}
    <div class="section"><h3>이용 방법</h3><span class="more" data-intro ${KB}>자세히 ›</span></div>
    <div class="box" data-blk="howto" style="color:#DDD5FA">매일 자정, 모든 플레이어에게 <b class="jua" style="color:var(--gold)">같은 게임 하나</b>가 열려요. 플레이한 게임은 라이브러리에 모이고, 다른 날 다시 하려면 광고로 열 수 있어요.</div></div>
  </div>`;
}
/* 내일의 게임 예고 (2026-10-28 대표): 흐린 표지 + 장르 · 시간 + 한 줄 떡밥 + 남은 시간 + 홈 화면 추가 · 처음 만나는 게임이면 '처음 만나는 게임' */
function tomorrowBox() {
  const tid = R.gameOn(R.dayIndex() + 1), t = tid && G(tid); if (!t) return `<div class="row" data-blk="tmrw"><div class="box"><div class="k">다음 게임 공개까지</div><div class="v" id="cd">--:--:--</div></div></div>`;
  const fresh = !R.state().library[tid], st = R.state().streak, next = (st.last === R.keyOf(R.now()) ? st.count : 0) + 1;
  return `<div class="tmrw" data-blk="tmrw"><div class="tmrwbg" style="background-image:url('${webp(t.cover, 600)}')"></div><div class="tmrwin">
      <div class="k">${fresh ? '🆕 내일 처음 만나는 게임' : '내일의 게임'}</div>
      <div class="tmrwq">${TEASE[tid] || '두근두근…'}</div>
      <div class="tmrwm"><span class="chip">🎮 ${t.genre}</span><span class="chip">⏱ ${t.time}</span></div>
      <div class="tmrwf"><span>⏰ <b id="cd">--:--:--</b> 뒤 공개 · 🔥 ${next}일 연속</span>${I.installed() ? '' : `<button data-install data-where="tmrw">${isPC() ? '설치해 두기' : '홈 화면에 추가'}</button>`}</div>
    </div></div>`;
}
// ── 오늘 · 새 메인 B '이번 주 달력 허브' (2026-10-28 대표 승인 · team/dev/tasks/261028-home-ux) ──
//   이번 주 7일 달력 → 오늘의 게임(▶ 첫 화면 안) → 운세 띠(훅 · 타로/상담 · 전부 보기) → 내일의 게임 → 만난 게임 → 12게임 진열장
//   PC 넓은 화면: 달력 한 줄 · 왼쪽 오늘의 게임 · 오른쪽 운세/내일/만난 게임 · 아래 진열장 (app.css .hb)
const WK = ['월', '화', '수', '목', '금', '토', '일'];
function renderTodayB() {
  R.checkIn();   /* 🔥 들어오기만 해도 출석 */
  const id = R.todayId(), g = G(id), s = R.state(), lib = s.library[id];
  const playedToday = lib && lib.last === R.keyOf(R.now()), n = R.now();
  const fill = R.fillable() ? `<div class="stampfill" data-stampfill data-blk="stamp" ${KB}>👣 어제 도장을 놓쳤어요 · 광고 1번 보고 🔥 연속 이어 가기</div>` : '';
  const me = (() => { try { return !!localStorage.getItem('oad_fortune_me'); } catch { return false; } })();
  return `<div class="today hb">
    ${header()}
    ${installBanner()}
    <div class="wkhead"><h1>이번 주 원어데이</h1><span>다음 게임까지 <b data-cd>--:--:--</b></span></div>
    ${weekStrip()}${fill}
    <div class="hbgrid"><div class="hbmain">
      <div class="tgame"><div class="hero hbhero" data-blk="game">
        <div class="cover">${img(g.cover, 0, `fetchpriority="high" decoding="async" class="cv"`)}<div class="ribbon">${n.getMonth() + 1}월 ${n.getDate()}일 · ${R.dayIndex() + 1}번째 게임</div>${g.logo ? '' : `<h2>${g.title}</h2>`}</div>
        <div class="body">
          <div class="fpick" id="fpick">${me ? '' : g.tagline}</div>
          <div class="meta"><span class="chip">🎮 ${g.genre}</span><span class="chip">⏱ ${g.time}</span><span class="chip">👥 모두 같은 게임</span>${R.ratingBadge(id)}</div>
          <button class="btn" data-play="${id}" data-from="home_hero">▶ 오늘의 게임 무료 플레이</button>
          ${playedToday ? `<div class="played">✓ 오늘 ${lib.plays}판 플레이 · 라이브러리에 저장됨</div>` : ''}
        </div></div></div>
    </div><div class="hbside">
      <div class="tfort" data-blk="fort"><div id="fortuneCard">${fortuneBandStatic()}</div></div>
      ${tomorrowBox()}
      ${collLine()}
    </div></div>
    ${shelf()}
    <div class="hbfoot" data-blk="howto"><span>매일 0시, 모두에게 <b>같은 게임 하나</b>가 열려요</span><span class="more" data-intro ${KB}>이용 방법 ›</span></div>
  </div>`;
}
/* 이번 주(월~일) 달력: 지난 날 = 한 게임 ✓ / 광고로(잠김) / 열림 · 오늘 = 금테 · 내일 = NEW(처음) 또는 ↺ · 그 뒤 = ? (제목 비공개) */
function weekStrip() {
  const n = R.now(), di = R.dayIndex(), dow = (n.getDay() + 6) % 7, s = R.state();
  const cells = WK.map((w, k) => {
    const off = k - dow, idx = di + off, d = new Date(n.getFullYear(), n.getMonth(), n.getDate() + off);
    const gid = idx >= 0 ? R.gameOn(idx) : null, lab = `<div class="lab"><b>${off === 0 ? '오늘' : w}</b>${d.getDate()}일</div>`;
    if (!gid) return `<div class="wd none"><div class="th"></div>${lab}</div>`;
    const g = G(gid), pic = `<picture><source media="(pointer: fine) and (min-width: 960px)" srcset="${webp(g.cover, 600)}">${img(g.icon, 0, 'loading="lazy"')}</picture>`;
    if (off < 0) {
      const done = s.history[R.keyOf(d)] === gid, a = R.access(gid);
      const mark = done ? '<span class="ok" aria-label="했어요">✓</span>' : a === 'locked' ? '<span class="adl">📺<em> 광고로</em></span>' : '<span class="adl op">열림</span>';
      return `<div class="wd past" data-open="${gid}" ${KB} aria-label="${w}요일 ${g.title}"><div class="th">${pic}${mark}</div>${lab}</div>`;
    }
    if (off === 0) return `<div class="wd tdy" data-play="${gid}" data-from="home_week" ${KB} aria-label="오늘 ${g.title}"><div class="th">${pic}</div>${lab}</div>`;
    const fresh = !s.library[gid] && !R.isReleased(gid);
    return `<div class="wd fut" data-wk="${gid}" data-off="${off}" ${KB} aria-label="${w}요일 게임 · 공개 전"><div class="th">${img(g.icon, 0, 'loading="lazy" class="blur"')}<span class="q">?</span></div>${off === 1 ? `<span class="new">${fresh ? 'NEW' : '↺'}</span>` : ''}${lab}</div>`;
  });
  return `<div class="week" data-blk="week">${cells.join('')}</div>`;
}
/* 12게임 진열장: 오늘 → 내일 → 다시 돌아오는 순서 · 잠김 = 📺 광고로 열기 + 'D-n 무료' · 아직 공개 전 = ? (목록에서 내린 게임은 DAILY 에 없어 자동 제외) */
function shelf() {
  const n = R.DAILY.length, di = R.dayIndex(), s = R.state(), ids = [];
  for (let k = 0; k < n; k++) ids.push(R.gameOn(di + k));
  const tiles = ids.map((gid, k) => {
    const g = G(gid), a = R.access(gid);
    if (k > 0 && !R.isReleased(gid)) return `<div class="gt unk" data-wk="${gid}" data-off="${k}" ${KB}><div class="im"><span class="q">?</span><span class="st">${k === 1 ? '🆕 내일 공개' : `D-${k} 공개`}</span></div><div class="t">두근두근…</div><div class="s">${g.genre}${k === 1 ? ' · 내일 0시' : ''}</div></div>`;
    const badge = { today: '<span class="st today">오늘 무료</span>', owned: '<span class="st open">소장 ✓</span>', unlocked: '<span class="st open">오늘 열림</span>', free: '<span class="st open">자유 플레이</span>' }[a] || '<span class="st ad">📺 광고로 열기</span>';
    return `<div class="gt${a === 'locked' ? ' lock' : ''}" data-open="${gid}" ${KB} aria-label="${g.title}"><div class="im">${img(g.icon, 0, 'loading="lazy"')}${badge}${a === 'locked' ? `<span class="dd">D-${k} 무료</span>` : ''}${R.isBrand(gid) ? '<span class="collab">콜라보</span>' : ''}</div><div class="t">${g.title}</div><div class="s">${s.library[gid] ? '✓ 만난 게임' : g.genre}</div></div>`;
  });
  return `<div class="section"><h3>게임 진열장</h3><span class="more">${n}개 · 돌아오는 날엔 무료</span></div><div class="shelf" data-blk="shelf">${tiles.join('')}</div>`;
}
/* 만난 게임 도장: 공개된 게임은 아이콘 · 만난 것만 색 · 오늘 것은 점선 */
function collLine() {
  const lib = R.state().library, tid = R.todayId(), n = R.DAILY.length, met = R.DAILY.filter(id => lib[id]).length, rel = R.released();
  return `<div class="coll" data-blk="coll" data-tab-go="collection" ${KB}><div class="ch"><b class="jua">만난 게임 ${met} / ${n}</b><span>${tid && !lib[tid] ? `오늘의 게임을 하면 ${met + 1} / ${n}` : '컬렉션 보기 ›'}</span></div>
    <div class="dots">${R.DAILY.map(id => `<i class="${lib[id] ? 'on' : id === tid ? 'now' : ''}">${rel.includes(id) || lib[id] ? img(G(id).icon, 0, 'loading="lazy"') : ''}</i>`).join('')}</div></div>`;
}
/* 운세 띠 (B): 지금 운세 카드를 압축 — 점수 · 한마디 · 유료 훅 1개 · 타로/상담/전부 보기 · 저녁 회고 · 출석 선물 */
function fortuneBandStatic() {
  let me = null; try { me = JSON.parse(localStorage.getItem('oad_fortune_me') || 'null'); } catch { /* */ }
  if (!me) return `<div class="fband new" data-fortune-edit ${KB}><div class="face">${FACE0}</div><div class="fin"><div class="tag">오늘의 신점 · 매일 무료</div><div class="say serif">오늘 너를 읽어 줄 <em>점쟁이</em>가 기다린다</div><span class="go">내 사주 넣고 오늘 운세 보기 →</span></div><span class="seal">獨說</span></div>`;
  ex().then(E => { const m = FT, el = $('#fortuneCard'); if (!el || !$('.today.hb')) return; const f = m.fortune(me, R.now()); m.markDay(R.keyOf(R.now()), { v: 1 }); E.chat.markGroup(XC()); el.innerHTML = fortuneBand(me, f, m); fortunePick(f, m); }).catch(er => console.error(er));
  return `<div class="fband"><div class="face"></div><div class="fin"><div class="tag">오늘의 신점</div><div class="say serif">${me.name}, 잠깐 앉아 봐</div><p class="wait">읽는 중…</p></div></div>`;
}
function fortuneBand(me, f, m) {
  const c = m.CHARS[f.ch], key = R.keyOf(R.now()), h = m.hookOf(f, key, boughtFn(m, me)), day = m.days()[key] || {};
  const eve = R.now().getHours() >= 18;
  const gift = freebieOk() ? `<div class="sdgift" data-freebie ${KB}>🔥 ${R.state().streak.count}일 연속 출석 선물 · 입문 운세(3,900원) 1회 무료로 열기 →</div>` : '';
  const recap = !eve ? '' : day.r ? `<div class="recap done">오늘의 회고 ${({ y: '⭕ 맞았다', h: '🔺 반반', n: '✖ 아니던데' })[day.r]} · <button class="lnk" data-fcal>운세 달력 보기</button></div>`
    : `<div class="recap"><b>오늘, 맞았나요?</b><span><button data-recap="y">맞았다</button><button data-recap="h">반반</button><button data-recap="n">아니던데</button></span></div>`;
  return `<div class="fband" data-fortune ${KB}><div class="face">${face(m, f.ch)}</div><div class="fin"><div class="tag">${c.name}의 오늘의 신점 · ${f.today.ko}일</div>
    <div class="fsay"><span class="score">${f.total}<small>점</small></span><div class="say serif">“${f.say}”</div></div>
    ${h ? `<div class="hook" data-paid="${h.id}" ${KB}><small>${h.text}</small><span class="hb"><b>🔮 ${m.paidOf(h.id).title}</b><i>무료 엿보기 →</i></span></div>` : ''}</div><span class="seal">${c.seal}</span></div>
    <div class="fmore">${EX ? EX.tarot.line(m, me, f, XC()) + EX.chat.line(m, me, f, XC()) : ''}<div class="mchip go" data-fortune ${KB}><b>📜 오늘 운세 전부</b><small>${me.name}의 풀이 보기 →</small></div></div>${recap}${gift}`;
}
/* 그날 점쟁이가 오늘의 게임을 한 줄로 (사업 안 A · catalog.js PICK) */
function fortunePick(f, m) {
  const el = $('#fpick'), id = R.todayId(); if (!el || !id) return;
  const c = m.CHARS[f.ch], line = PICK[id] || G(id).tagline;
  el.innerHTML = `<span class="who">${face(m, f.ch)}</span><span><b>${c.name}</b> “오늘은 ${f.key}의 날. ${line}”</span>`; el.classList.add('on');
}

// ── 메인 기록 (ops.md 1-3): 노출 · 깊이 · 칸 노출/클릭 · 설치 노출 · 속도 — 이름 없는 행동만 · 렌더 한 번에 한 번 ──
const HM = { live: false, t: 0, via: '', seen: new Set(), dep: 0, io: null, tm: new Map(), nth: 0, perf: false };
const tabsH = () => { const tb = $('#tabs'); const r = tb && tb.getBoundingClientRect(); return r && r.top > innerHeight / 2 ? r.height : 0; };
function homeSt() {
  const s = R.state();
  if (Object.values(s.owned).some(Boolean)) return 'own';
  try { if (P.myReceipts().length) return 'pay'; if (localStorage.getItem('oad_fortune_me')) return 'fort'; } catch { /* */ }
  return Object.keys(s.library).length ? 'ret' : 'new';
}
function homeEnter(via, re) {
  if (re) { if (HM.io) HM.io.disconnect(); for (const t of HM.tm.values()) clearTimeout(t); HM.tm.clear(); }
  else { HM.live = true; HM.t = performance.now(); HM.via = via; HM.seen = new Set(); HM.dep = 0; }
  const els = [...view.querySelectorAll('[data-blk]')], bottom = innerHeight - tabsH();
  els.forEach((el, i) => { el.dataset.pos = i + 1; });
  if (re) { if (HM.io) els.forEach(el => HM.io.observe(el)); return; }
  const fold = [...new Set(els.filter(el => { const r = el.getBoundingClientRect(); return r.height && r.top < bottom && r.bottom > 0; }).map(el => el.dataset.blk))].join(',');
  T.track('home_view', { via, lay: LAY, st: homeSt(), h: R.now().getHours(), fold, vh: innerHeight });
  if ('IntersectionObserver' in window) {
    HM.io = new IntersectionObserver(es => { for (const e of es) { const b = e.target.dataset.blk; if (HM.seen.has(b)) continue;
      if (e.isIntersecting) { if (!HM.tm.has(e.target)) HM.tm.set(e.target, setTimeout(() => { HM.tm.delete(e.target); if (!HM.live || HM.seen.has(b)) return; HM.seen.add(b); T.track('blk_view', { blk: b, pos: +e.target.dataset.pos || 0, lay: LAY }); }, 1000)); }
      else { clearTimeout(HM.tm.get(e.target)); HM.tm.delete(e.target); } } }, { threshold: 0.5 });
    els.forEach(el => HM.io.observe(el));
  }
  homeScroll();
  /* 설치 노출: 메인에 보인 설치 버튼(배너 · 내일 칸)마다 한 번 */
  const how = I.how();
  new Set([...view.querySelectorAll('[data-install],[data-ext]')].map(b => { const k = b.closest('[data-blk]'); return k ? k.dataset.blk : 'home'; }).map(b => b === 'install' ? 'banner' : b)).forEach(where => T.track('install_view', { where, how, br: I.env.br, osv: I.env.osv }));
  if (!HM.perf) { HM.perf = true; homePerf(); }
}
function homeScroll() { if (!HM.live) return; const de = document.documentElement, p = Math.min(1, (scrollY + innerHeight) / Math.max(1, de.scrollHeight)); if (p > HM.dep) HM.dep = p; }
addEventListener('scroll', homeScroll, { passive: true });
function homeLeave() {
  if (!HM.live) return; HM.live = false;
  if (HM.io) { HM.io.disconnect(); HM.io = null; } for (const t of HM.tm.values()) clearTimeout(t); HM.tm.clear();
  T.track('home_depth', { dep: Math.round(HM.dep * 4) * 25, ms: Math.round(performance.now() - HM.t), blks: HM.seen.size, lay: LAY });
}
/* 속도: 앱 열기 → 메인 · 오늘 표지 받기까지 · 망 · 지금까지 받은 양(KB) — 세션에 한 번 */
function homePerf() {
  const t0 = Math.round(performance.now()), im = view.querySelector('.hero .cover img');
  const send = cover => { let kb = 0; try { for (const r of performance.getEntriesByType('resource')) kb += r.transferSize || 0; } catch { /* */ } const c = navigator.connection; T.track('home_perf', { ms: t0, cover, net: (c && c.effectiveType) || '', kb: Math.round(kb / 1024), lay: LAY }); };
  if (!im) return send(0);   /* 예전 메인(A)은 표지가 배경 그림이라 시간 대신 0 */
  if (im.complete && im.naturalWidth) { const e = performance.getEntriesByName(im.currentSrc || im.src)[0]; return send(Math.round(e ? e.responseEnd : performance.now())); }
  let done = false; const fin = () => { if (done) return; done = true; send(Math.round(performance.now())); };
  im.addEventListener('load', fin, { once: true }); im.addEventListener('error', fin, { once: true }); setTimeout(fin, 8000);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') homeLeave(); else if (tab === 'today' && player.hidden && !HM.live && view.querySelector('.today')) homeEnter('resume'); });
/* 어디서 눌렀나 (game_start · fortune_view · paid_click · paywall_view 의 from) */
let PFROM = '', FFROM = '';
const WHAT = [['play', 'play'], ['open', 'detail'], ['ad', 'ad'], ['paid', 'hook'], ['fortune', 'fort'], ['fortuneEdit', 'form'], ['tarot', 'tarot'], ['chat', 'chat'], ['recap', 'recap'], ['freebie', 'gift'], ['fcal', 'cal'], ['install', 'install'], ['ext', 'ext'], ['hideInstall', 'close'], ['intro', 'howto'], ['stampfill', 'stamp'], ['tabGo', 'tab'], ['wk', 'tease']];
const whatOf = el => { for (const [k, v] of WHAT) if (k in el.dataset) return v; return 'card'; };
// ── 오늘의 운세 ─────────────────────────────────────
const CITIES = [['서울', 126.98], ['인천', 126.7], ['경기', 127.0], ['강원', 128.2], ['대전·충청', 127.4], ['대구·경북', 128.6], ['부산·울산·경남', 129.1], ['광주·전라', 126.9], ['제주', 126.5], ['해외·모름', 0]];
const CH = ['heukryeon', 'geumdan', 'danjoe', 'hoegwi', 'tusim'];
const won = n => n.toLocaleString('ko-KR') + '원';
// ── 골드 상점 (1골드 = 10원 · 보너스는 무상 골드 · 가격은 서버가 다시 확인) ──
const PACKS = [['g100', 1000, 100, 0], ['g315', 3000, 300, 15], ['g550', 5000, 500, 50], ['g1100', 10000, 1000, 100], ['g2300', 20000, 2000, 300], ['g6000', 50000, 5000, 1000]];
const gnum = n => Number(n || 0).toLocaleString('ko-KR');
const goldOf = () => { const m = A.current(); return (m && m.gold && m.gold.total) || 0; };
/* 카톡 · 인스타 · 네이버 등 앱 속 브라우저: 구글이 로그인을 막음(403 disallowed_useragent) → 로그인 버튼 대신 '사파리/크롬으로 열기' */
const browserName = () => I.env.ios ? '사파리' : '크롬';
const inAppLoginNote = () => `${I.env.kakao ? '카카오톡' : '이 앱'} 안에서는 구글 로그인이 막혀 있어요 · ${browserName()}로 열어서 로그인해 주세요`;
function needLogin(why) {
  if (I.env.inApp) return openSheet(`<div class="intro"><h2>🪙 로그인이 필요해요</h2><p class="fsub">${why || '골드는 계정에 저장돼요'}</p><p class="fsub">${inAppLoginNote()}</p>
    <div class="stack"><button class="btn" data-ext>🌐 ${browserName()}로 열기</button><button class="btn ghost" data-copy>🔗 주소 복사하기</button><button class="btn ghost" data-close>나중에</button></div></div>`);
  openSheet(`<div class="intro"><h2>🪙 로그인이 필요해요</h2><p class="fsub">${why || '골드는 계정에 저장돼요'} · 폰을 바꿔도 그대로 이어져요</p>
    <div class="stack"><button class="btn" data-login>구글로 로그인</button><p class="fsub" style="margin:0;font-size:12px">만 14세 이상만 가입할 수 있어요.</p><button class="btn ghost" data-close>나중에</button></div></div>`);
}
function shop(note) {
  const m = A.current(); if (!m) return needLogin('골드를 사려면 로그인해 주세요');
  T.track('shop_view', { first: m.first ? 1 : 0 });
  const card = ([id, price, paid, free]) => `<button class="pack" data-pack="${id}"><span class="pc">🪙</span><b>${gnum(paid + free)}</b>${free ? `<em>+${Math.round(free / paid * 100)}% 보너스</em>` : '<em>&nbsp;</em>'}<span class="pp">${won(price)}</span></button>`;
  openSheet(`<div class="intro shop"><h2>골드 상점</h2>${note ? `<p class="fsub" style="color:var(--gold)">${note}</p>` : ''}
    <div class="wallet"><span>내 골드</span><b>🪙 ${gnum(goldOf())}</b><button class="lnk" data-ghist>내역</button></div>
    ${m.first ? `<button class="pack first" data-pack="first"><span class="tag">첫 구매 한 번만</span><span class="pc">🪙</span><b>200</b><em>2배 · 처음 산 사람 배지</em><span class="pp">${won(1000)}</span></button>` : ''}
    <div class="packs">${PACKS.map(card).join('')}</div>
    <p class="paynote">1골드 = 10원 · 보너스 골드는 무료 골드로 먼저 쓰여요 · 결제 후 7일 안에 쓰지 않은 골드는 환불돼요. <a href="legal.html#refund" target="_blank">결제·환불 규정</a></p>
    <div class="stack"><button class="btn ghost" data-close>닫기</button></div></div>`);
}
async function buyPack(id) {
  const c = await P.config(); if (c.mode === 'off') return toast('결제는 곧 열려요');
  const tk = await A.token(); if (!tk) return needLogin();
  T.track('pay_click', { product: id });
  let o; try { o = await P.orderGold(id, tk); } catch (e) { return toast(e.message); }
  if (c.mode === 'toss') { try { await P.toss(o, null, null, true); } catch { toast('결제창을 열지 못했어요'); } return; }
  openSheet(`<div class="intro paysheet"><h2>🪙 ${o.orderName}</h2><p class="fsub">테스트 결제예요 · 실제로 돈이 나가지 않아요</p>
    <div class="payrow"><span>${o.orderName}</span><b>${won(o.amount)}</b></div>
    <p class="paynote">결제 후 7일 안에 쓰지 않은 골드는 전액 환불돼요. <a href="legal.html#refund" target="_blank">결제·환불 규정</a></p>
    <div class="stack"><button class="btn" id="mockPay">동의하고 테스트로 결제하기</button><button class="btn ghost" id="payCancel">취소</button></div></div>`);
  $('#payCancel').onclick = () => shop();
  $('#mockPay').onclick = async e => { const b = e.target; b.disabled = true; b.textContent = '결제 중…';
    try { await P.confirmGold(o, 'mock_' + Date.now(), o.amount); await A.refresh(); goldDone(o.orderName); }
    catch (er) { toast(er.message); b.disabled = false; b.textContent = '동의하고 테스트로 결제하기'; } };
}
function goldDone(name) { T.track('gold_bought'); shop(`${name} 충전 완료! 고마워요 ✨`); }
async function goldHistory() {
  let r; try { r = await A.call({ act: 'history' }); } catch (e) { return toast(e.message); }
  const W = { buy: '충전', grant: '선물', own: '게임 소장', day: '하루 열기', set: '전체 소장', fortune: '운세', refund: '환불' };
  openSheet(`<div class="intro"><h2>골드 내역</h2><div class="ghist">${(r.ledger || []).map(l => `<div><span>${W[l.reason] || l.reason}<small>${new Date(l.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}${l.kind === 'free' ? ' · 무료 골드' : ''}</small></span><b class="${l.amount > 0 ? 'p' : 'm'}">${l.amount > 0 ? '+' : ''}${gnum(l.amount)}</b></div>`).join('') || '<p class="fsub">아직 내역이 없어요</p>'}</div>
    <div class="stack"><button class="btn ghost" data-shop>상점으로</button><button class="btn ghost" data-close>닫기</button></div></div>`);
}
// 소장 완료: 지금까지의 기록을 바로 계정으로 → 무엇을 옮겼는지 보여 줌
function progressLine(id) {
  const lib = R.state().library[id], sum = C.hasLocal(id) ? C.localSummary(id) : '';
  if (!lib) return sum;
  const days = Math.max(1, Math.round((R.now() - new Date(lib.first)) / 864e5) + 1);
  return [`${fmtKey(lib.first)}부터 ${days}일`, `${lib.plays}판`, sum].filter(Boolean).join(' · ');
}
async function ownedDone(id) {
  const line = progressLine(id);
  openSheet(`<div class="intro"><h2>🎉 ${G(id).title} 소장 완료</h2><p class="fsub" id="odmsg">${C.hasLocal(id) ? '☁ 지금까지의 기록을 계정으로 옮기는 중…' : '이제 언제든 할 수 있고, 기록은 계정에 저장돼요'}</p>
    ${line ? `<div class="cloudcard"><b>☁ 내 계정</b><span>${line}</span></div>` : ''}
    <div class="stack"><button class="btn" data-play="${id}">▶ 플레이</button><button class="btn ghost" data-close>닫기</button></div></div>`);
  if (!C.hasLocal(id)) return;
  const r = await C.push(id, { force: true }); const el = $('#odmsg');
  if (el) el.textContent = r.ok ? '내 기록, 이제 계정에 안전하게 옮겼어요 · 폰을 바꿔도 이어져요' : '기록은 다음에 게임을 닫을 때 계정에 올라가요';
}
// 두 기기 모두 바뀌었을 때: 어느 쪽으로 할지 한 번 묻기 (더 최근 쪽이 기본)
function cloudAsk(id, r) {
  const t = x => x ? new Date(x).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const serverNewer = !r.local.at || new Date(r.server.at) > new Date(r.local.at);
  openSheet(`<div class="intro"><h2>☁ 어느 기록으로 할까요?</h2><p class="fsub">${G(id).title} 기록이 이 기기와 계정(다른 기기)에서 따로 바뀌었어요. 고르지 않은 쪽도 계정에 하나 남아서, 게임 정보 화면에서 되돌릴 수 있어요.</p>
    <div class="cpick"><button class="cloudcard ${serverNewer ? 'on' : ''}" data-cpick="server" data-gid="${id}"><b>☁ 계정 (다른 기기)</b><span>${r.server.sum || '저장된 기록'}</span><small>${t(r.server.at)}</small></button>
    <button class="cloudcard ${serverNewer ? '' : 'on'}" data-cpick="local" data-gid="${id}"><b>📱 이 기기</b><span>${r.local.sum || '이 기기 기록'}</span><small>${r.local.at ? t(r.local.at) + ' 이후 바뀜' : ''}</small></button></div>
    <div class="stack"><button class="btn ghost" data-close>취소</button></div></div>`);
}
async function cloudPick(id, side, b) {
  b.disabled = true;
  try { if (side === 'server') await C.pull(id); else await C.push(id, { force: true }); }
  catch { toast('연결이 불안정해요 · 이 기기 기록으로 시작해요'); }
  play(id, true);
}
// 소장 권유 (성장형 게임 · 3판 이상 · 게임당 주 1회 · 앱 하루 1회 · 다시 보지 않기)
function nudgeOwn(id) {
  if (!A.ON || !SAVES_OK(id) || R.state().owned[id] || (R.state().library[id] || {}).plays < 3) return false;
  let n = {}; try { n = JSON.parse(localStorage.getItem('oad_ownnudge') || '{}'); } catch { /* */ }
  const today = R.keyOf(R.now());
  if (n.off || n.day === today || (n[id] && Date.now() - n[id] < 7 * 864e5)) return false;
  n[id] = Date.now(); n.day = today; try { localStorage.setItem('oad_ownnudge', JSON.stringify(n)); } catch { /* */ }
  T.track('own_nudge', { game: id });
  setTimeout(() => openSheet(`<div class="intro"><h2>☁ 내 기록, 이제 계정에 안전하게</h2><p class="fsub">${G(id).title}에 쌓은 기록은 지금 이 기기에 저장돼 있어요. 소장하면 계정에 저장돼 폰을 바꿔도 그대로 이어지고, 언제든 할 수 있어요.</p>
    <div class="cloudcard"><b>📱 이 기기</b><span>${progressLine(id)}</span></div>
    <div class="stack"><button class="btn gold" data-gbuy="own" data-gid="${id}">🪙 300골드로 소장하기</button><button class="btn ghost" data-close>나중에</button><button class="lnk" data-nudge-off style="margin:4px auto 0;border:0;background:none;color:var(--mute);font:13px 'Jua';text-decoration:underline">다시 보지 않기</button></div></div>`), 400);
  return true;
}
const SAVES_OK = id => C.hasLocal(id) || false;
// 운세를 골드로: 서버가 골드를 빼고 영수증을 줌 → 이 기기에 보관 → 전체 풀이 (상품은 버튼의 data-gfort)
async function fortuneGold(b) {
  const id = b.dataset.gfort || 'cheating';
  if (!A.current()) { sdClose(); return needLogin('골드로 열려면 로그인해 주세요'); }
  const m = await ft(), PR = m.paidOf(id), me0 = m.loadMe(), me = m.toInput(me0), pt = m.toInput(m.pairOf(id, me0)), label = b.textContent;
  const adult = m.isAdultFortune(id); if (adult) { if (m.isUnder19(me0)) return adultOnly(); if (!(await adultCheck(id, `🪙 ${gnum(PR.price / 10)}골드로 열기`))) return paidPage(id); }
  b.disabled = true; b.textContent = '여는 중…';
  try { const r = await A.call({ act: 'spend', what: id, me, partner: pt, adult }); P.keepReceipt(r.receipt, me, pt); T.track('gold_spend', { what: id }); A.refresh().catch(() => {}); sdClose(); toast('전체 풀이가 열렸어요'); paidPage(id); }
  catch (e) { if (e.short) { sdClose(); const have = e.paidOnly ? (e.gold && e.gold.paid) || 0 : (e.gold && e.gold.total) || 0; return shop(`${e.paidOnly ? '충전한 ' : ''}골드가 ${gnum(e.need - have)}개 모자라요${e.paidOnly ? ' (보너스 골드는 입문 운세에만 쓸 수 있어요)' : ''} · 2만원 충전이면 ${PR.title} 한 편 + 남는 골드로 게임 소장까지`); } toast(e.message); b.disabled = false; b.textContent = label; }
}
// 골드로 사기: 소장 · 하루 열기 · 전체 소장 (모자라면 상점으로)
async function spendGold(what, id, b) {
  const m = A.current(); if (!m) return needLogin('골드로 사려면 로그인해 주세요');
  if (b) { b.disabled = true; b.dataset.t = b.textContent; b.textContent = '처리 중…'; }
  try {
    const r = await A.call({ act: 'spend', what, game: id });
    R.syncItems(r.items); T.track('gold_spend', { what, game: id || '' }); closeSheet();
    if (what === 'set') { toast('모든 게임을 소장했어요! 🎉 기록을 계정에 옮기는 중…'); go(tab); let n = 0; for (const g of R.ORDER) if (C.hasLocal(g)) { const x = await C.push(g); if (x.ok) n++; } if (n) toast(`☁ ${n}개 게임 기록을 계정에 안전하게 옮겼어요`); return; }
    if (what === 'own') return ownedDone(id);
    toast(`${G(id).title} 오늘 하루 열림!`); play(id);
  } catch (e) {
    if (b) { b.disabled = false; b.textContent = b.dataset.t; }
    if (e.short) return shop(`골드가 ${gnum(e.need - ((e.gold && e.gold.total) || 0))}개 모자라요`);
    toast(e.message);
  }
}
/* 점쟁이 얼굴: 원화가 있으면 그림, 없으면 오행 아이콘 (새 점쟁이 5명) */
function face(m, ch, cls = '') { const c = m.CHARS[ch]; return c.art ? `<img src="fortune/char/${ch}.webp" alt="">` : `<div class="ohg ohg-${c.el} ${cls}"><b>${m.HAN[c.el]}</b><small>${c.name}</small></div>`; }
const FACE0 = '<img src="fortune/char/heukryeon.webp" alt="">';
function fortuneCardStatic() {
  let me = null; try { me = JSON.parse(localStorage.getItem('oad_fortune_me') || 'null'); } catch { /* */ }
  if (!me) return `<div class="sdcard" data-fortune-edit ${KB}>${FACE0}<div class="sdin"><div class="sdtag">오늘의 신점 · 매일 무료</div><h2>오늘 너를 읽어 줄<br><em>점쟁이</em>가 기다린다</h2><p>생년월일과 태어난 시를 넣으면, 그날의 기운에 따라 다른 점쟁이가 나와 오늘을 읽어 준다.</p><span class="sdgo">내 사주 넣고 오늘 운세 보기 →</span></div><span class="seal">獨說</span></div>`;
  ex().then(E => { const m = FT, el = $('#fortuneCard'); if (!el) return; const f = m.fortune(me, R.now()); m.markDay(R.keyOf(R.now()), { v: 1 }); E.chat.markGroup(XC()); el.innerHTML = fortuneCard(me, f, m); });
  return `<div class="sdcard"><div class="sdin"><div class="sdtag">오늘의 신점</div><h2>${me.name}, 잠깐 앉아 봐</h2><p>읽는 중…</p></div></div>`;
}
/* 이 상품을 이 두 사람(solo 는 나)으로 이미 샀는지 — 훅에서 빼려고 */
const boughtFn = (m, me) => id => { const pt = m.pairOf(id, me); return !!(P.ON && pt && P.receiptFor(id, m.toInput(me), m.toInput(pt))); };
function fortuneCard(me, f, m) {
  const c = m.CHARS[f.ch], key = R.keyOf(R.now()), h = m.hookOf(f, key, boughtFn(m, me)), day = m.days()[key] || {};
  const eve = R.now().getHours() >= 18;
  const gift = freebieOk() ? `<div class="sdgift" data-freebie ${KB}>🔥 ${R.state().streak.count}일 연속 출석 선물 · 입문 운세(3,900원) 1회 무료로 열기 →</div>` : '';
  const recap = !eve ? '' : day.r ? `<div class="recap done">오늘의 회고 ${({ y: '⭕ 맞았다', h: '🔺 반반', n: '✖ 아니던데' })[day.r]} · <button class="lnk" data-fcal>운세 달력 보기</button></div>`
    : `<div class="recap"><b>오늘, 맞았나요?</b><span><button data-recap="y">맞았다</button><button data-recap="h">반반</button><button data-recap="n">아니던데</button></span></div>`;
  return `<div class="sdcard" data-fortune ${KB}>${face(m, f.ch)}<div class="sdin"><div class="sdtag">${c.name}의 오늘의 신점 · ${f.today.ko}일</div>
    <div class="sdscore"><b>${f.total}</b><small>점</small></div><h2>“${f.say}”</h2><p class="sdwarn">⚠ ${f.warn}</p>
    ${h ? `<div class="sdhook buy" data-paid="${h.id}" ${KB}><small>오늘 이 부분이 신경 쓰여요 · ${m.paidOf(h.id).title}</small><p>${h.text}</p><span class="hbtn"><span>🔮 살짝 엿보기</span><i>무료 →</i></span></div>` : ''}${recap}${gift}
    <div class="sdmini">${EX ? EX.tarot.line(m, me, f, XC()) + EX.chat.line(m, me, f, XC()) : ''}</div><div class="sdall">📜 ${me.name}의 오늘 운세 전부 보기 <i>→</i></div></div><span class="seal">${c.seal}</span></div>`;
}
/* 저녁 회고: 1탭 (메모 없음 · 기기에만) */
async function recapAnswer(ans) {
  const m = await ft(), me = m.loadMe(); if (!me) return;
  const f = m.fortune(me, R.now()); m.markDay(R.keyOf(R.now()), { r: ans });
  T.track('fortune_recap', { answer: ans, ch: f.ch }); toast(`${m.CHARS[f.ch].name}: ${m.recapLine(f, ans)}`);
  const el = $('#fortuneCard'); if (el) el.innerHTML = fortuneCard(me, f, m);
}
/* 운세 달력: 지난 날짜는 저장 없이 다시 계산 · 칸 = 총점 색 + 도장(들어옴 · 운세 · 게임 · 회고) */
async function fortuneCalendar(ym) {
  const m = await ft(), me = m.loadMe(); if (!me) return fortuneForm();
  const t = R.now(), [y, mo] = ym ? ym.split('-').map(Number) : [t.getFullYear(), t.getMonth() + 1];
  const first = new Date(y, mo - 1, 1), n = new Date(y, mo, 0).getDate(), log = m.days(), hist = R.state().history, todayK = R.keyOf(t);
  const cells = []; for (let i = 0; i < first.getDay(); i++) cells.push('<i></i>');
  let stamps = 0, yes = 0;
  for (let d = 1; d <= n; d++) {
    const dt = new Date(y, mo - 1, d), k = R.keyOf(dt);
    if (k > todayK) { cells.push(`<i class="fut"><small>${d}</small></i>`); continue; }
    const f = m.fortune(me, dt), L = log[k] || {}, col = f.total >= 80 ? 'hi' : f.total >= 65 ? 'md' : 'lo';
    const st = (L.v ? '👣' : '') + (L.f ? '🔮' : '') + (L.tc != null ? '🃏' : '') + (L.c ? '💬' : '') + (hist[k] ? '🎮' : '') + (L.r ? ({ y: '⭕', h: '🔺', n: '✖' })[L.r] : '');
    if (L.v) stamps++; if (L.r === 'y') yes++;
    cells.push(`<i class="c-${col}${k === todayK ? ' now' : ''}" data-fday="${k}" ${KB}><small>${d}</small><b>${f.total}</b><em>${f.key}</em><s>${st}</s></i>`);
  }
  const pm = new Date(y, mo - 2, 1), nm = new Date(y, mo, 1), ymOf = x => `${x.getFullYear()}-${x.getMonth() + 1}`, canNext = nm <= t;
  sdClose(); openSheet(`<div class="intro fcalw"><h2>📅 ${y}년 ${mo}월 운세 달력</h2><p class="fsub">이번 달 도장 ${stamps}개 · 내가 '맞았다' 누른 날 ${yes}일 · 지난 날을 누르면 그날 운세를 다시 볼 수 있어요</p>
    <div class="fcalnav"><button class="btn ghost small" data-fcal="${ymOf(pm)}">◀ 지난달</button>${canNext ? `<button class="btn ghost small" data-fcal="${ymOf(nm)}">다음 달 ▶</button>` : ''}</div>
    <div class="fcal"><u>일</u><u>월</u><u>화</u><u>수</u><u>목</u><u>금</u><u>토</u>${cells.join('')}</div>
    <p class="fsub">👣 들어온 날 · 🔮 운세 본 날 · 🃏 타로 · 💬 AI 상담 · 🎮 오늘의 게임 · ⭕🔺✖ 저녁 회고 — 기록은 이 기기에만 있어요</p>
    <div class="stack"><button class="btn ghost" data-close>닫기</button></div></div>`);
  T.track('fortune_calendar', { ym: `${y}-${mo}` });
}
let sdOpen = false;
function sdClose() { const el = $('#sd'); if (el) el.remove(); sdOpen = false; document.body.style.overflow = ''; }
addEventListener('popstate', () => { if (!sheet.hidden) { closeSheet(true); return; } if (sdOpen) { spare = false; sdClose(); return; } if (spare && $('#player').hidden) spare = false; });
async function fortuneDetail(dayKey) {
  await ex(); const m = FT, me = m.loadMe(); if (!me) return fortuneForm();
  const date = dayKey ? new Date(...dayKey.split('-').map((v, i) => Number(v) - (i === 1 ? 1 : 0))) : R.now(), past = !!dayKey && dayKey !== R.keyOf(R.now());
  const f = m.fortune(me, date), S = f.chart, c = m.CHARS[f.ch];
  if (!past) m.markDay(R.keyOf(R.now()), { v: 1, f: 1 });
  const pil = (p, n) => p ? `<div class="pil"><small>${n}주</small><b class="e-${p.stemElement}">${p.stem}</b><b class="e-${p.branchElement}">${p.branch}</b><em>${p.ko}</em></div>` : `<div class="pil none"><small>${n}주</small><b>?</b><b>?</b><em>시간 모름</em></div>`;
  const EL = ['wood', 'fire', 'earth', 'metal', 'water'], EN = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
  const lg = m.luckyGame(f, R.openGames()), lucky = lg && G(lg);
  const bar = (k, v) => `<div class="sbar"><span>${k}</span><div><s style="width:${v}%"></s></div><b>${v}</b></div>`;
  const PK = m.PACK, single = [PK.base, ...PK.picks].map(id => m.paidOf(id).price), maxSum = single[0] + single.slice(1).sort((a, b) => b - a).slice(0, 2).reduce((a, b) => a + b, 0), minSum = single[0] + single.slice(1).sort((a, b) => a - b).slice(0, 2).reduce((a, b) => a + b, 0);
  const packCard = `<div class="sdp pk" data-fpack ${KB}>${face(m, 'wolryeong', 'sm')}<div class="sdpi"><small>월령선생 · 묶음</small><b>${PK.title} · ${won(PK.price)}</b><p>“신년운세 + 원하는 풀이 2개”</p><ul><li>재물·횡재 · 우리 궁합 · 이번 달 · 합격운 중 2개</li><li>낱개로 사면 ${won(minSum)}~${won(maxSum)}</li></ul><em>구성 고르기 → ${won(PK.price)} (충전 골드 ${gnum(PK.price / 10)})</em></div><span class="seal sm">月令</span></div>`;
  /* 만 19세 미만(내 생년 기준): 연애 독설 5종은 새로 사는 카드를 빼고(산 건 그대로) 맨 아래 안내 한 칸 */
  const young = m.isUnder19(me), bought = boughtFn(m, me), list = m.PAID.filter(p => !(young && m.isAdultFortune(p.id) && !bought(p.id)));
  const youngCard = young && list.length < m.PAID.length ? `<div class="sdp young"><div class="sdpi"><b>연애 운세는 만 19세부터 열려요</b><p>대신 오늘은 궁합이랑 이번 달 운세 어때요?</p><div class="sdbtns" style="margin-top:8px"><button class="sdbtn ghost" data-paid="compat">우리 궁합 보기</button><button class="sdbtn ghost" data-paid="monthly">이번 달 내 운세</button></div></div></div>` : '';
  const paid = packCard + list.map(p => `<div class="sdp" data-paid="${p.id}" ${KB}>${m.isAdultFortune(p.id) ? '<span class="a19" aria-label="만 19세 이상 이용 가능">19+</span>' : ''}${face(m, p.ch, 'sm')}<div class="sdpi"><small>${m.CHARS[p.ch].name}${p.entry ? ' · 입문' : ''}</small><b>${p.title} · ${won(p.price)}</b><p>“${p.hook}”</p><ul>${p.tease.map(t => `<li>${t}</li>`).join('')}</ul><em>무료 미리보기 → 전체 ${won(p.price)}${p.entry ? ' · 보너스 골드 OK' : ''}</em></div><span class="seal sm">${m.CHARS[p.ch].seal}</span></div>`).join('') + youngCard;
  const el = document.createElement('div'); el.id = 'sd'; el.innerHTML = `<div class="sdpage">
    <button class="sdx" data-sd-close aria-label="닫기">✕</button>
    <div class="sdhero">${face(m, f.ch, 'lg')}<div class="sdheroin"><div class="sdtag">${c.name} · ${fmtDate(date)} · ${f.today.ko}일</div><h1>${me.name},<br>${past ? '그날은' : '오늘은'} <em>${f.key}</em>의 날${past ? '이었다' : '이다'}</h1><div class="sdscore big"><b>${f.total}</b><small>/100</small></div></div><span class="seal lg">${c.seal}</span></div>
    ${!past && EX ? EX.chat.entry(m, me, f, XC()) : ''}
    <section><h3>${past ? '그날의' : '오늘의'} 한마디</h3><blockquote>“${f.say}”</blockquote><p class="sdwarn">⚠ ${past ? '그날' : '오늘'} 조심할 것 — ${f.warn}</p><p class="sdwhy">왜 ${c.name}? ${f.why}</p>${!past ? `<button class="sdbtn ghost" data-tarot style="margin-top:10px">🃏 오늘의 타로 한 장</button>` : ''}</section>
    <section><h3>분야별 운</h3>${Object.entries(f.scores).map(([k, v]) => bar(k, v)).join('')}</section>
    <section class="sdlove"><h3>${f.tone >= 7 ? '💔 연애 독설' : '💗 연애 한마디'}</h3><p class="big">${f.dokLove}</p><p>${f.love}</p></section>
    <section><h3>돈 · 일</h3><p><b>돈</b> ${f.money}</p><p><b>일</b> ${f.work}</p>${f.notes.length ? `<p class="sdnote">${f.notes.join(' ')}</p>` : ''}</section>
    <section><h3>행운</h3><div class="sluck"><div><small>색</small><b><i style="background:${f.color.hex}"></i>${f.color.name}</b></div><div><small>숫자 · 재미로</small><b>${f.numbers.join(' · ')}</b></div><div><small>방향</small><b>${f.dir}</b></div></div>
      ${!past && lucky ? `<div class="sdgame" data-play="${lg}" ${KB}><img src="${lucky.icon}" alt=""><div><small>오늘 어울리는 게임 · 지금 바로 할 수 있어요</small><b>${lucky.title}</b></div><span>플레이 →</span></div>` : ''}
      <button class="sdbtn ghost" data-fcal style="margin-top:10px">📅 운세 달력 · 지난 날 다시 보기</button></section>
    <section><h3>${me.name}의 사주 여덟 글자</h3><button class="sdbtn ghost" data-type style="margin:0 0 10px">🧩 내 사주 유형 카드 · 친구와 궁합</button><div class="pils">${pil(S.hour, '시')}${pil(S.day, '일')}${pil(S.month, '월')}${pil(S.year, '년')}</div>
      <div class="fel">${EL.map(e => `<div><b class="e-${e}">${EN[e]}</b><s style="height:${S.elementCount[e] * 14 + 4}px" class="b-${e}"></s><small>${S.elementCount[e]}</small></div>`).join('')}</div></section>
    <section><h3>점쟁이들의 <em>깊은 풀이</em></h3><p class="sdsub">무료 미리보기를 먼저 보고, 마음에 들면 열어 보세요. 가격은 처음부터 다 보여 드려요.</p>${paid}</section>
    <p class="sdfoot">명리학(사주팔자) 규칙으로 계산한 전통 풀이이며 재미로 참고해 주세요. 행운 숫자는 복권 당첨을 예측하지 않아요. 특정인을 단정하지 않아요. 생년월일 원본은 내 폰에만 · AI 상담 때는 해석 요약만 보내고 저장하지 않아요.</p>
    <div class="sdbtns"><button class="sdbtn ghost" data-fortune-edit>내 정보 고치기</button><button class="sdbtn" data-sd-close>닫기</button></div></div>`;
  document.body.append(el); document.body.style.overflow = 'hidden'; if (!sdOpen) { sdOpen = true; history.pushState({ sd: 1 }, ''); }
  T.track('fortune_view', { ch: f.ch, score: f.total, past: past ? 1 : 0, from: FFROM || (past ? 'cal' : 'other') }); FFROM = '';
}
function birthFields(v, who) {
  const opt = (a, b, x) => Array.from({ length: b - a + 1 }, (_, i) => a + i).map(n => `<option ${n === x ? 'selected' : ''}>${n}</option>`).join('');
  return `<label>${who} 이름<input name="name" maxlength="10" value="${v.name || ''}" placeholder="이름 또는 별명" required></label>
    <div class="seg"><label><input type="radio" name="cal" value="solar" ${v.cal !== 'lunar' ? 'checked' : ''}>양력</label><label><input type="radio" name="cal" value="lunar" ${v.cal === 'lunar' ? 'checked' : ''}>음력</label><label class="lp"><input type="checkbox" name="leap" ${v.leap ? 'checked' : ''}>윤달</label></div>
    <div class="row3"><label>년<select name="y">${opt(1930, R.now().getFullYear(), v.y || 1993)}</select></label><label>월<select name="m">${opt(1, 12, v.m || 1)}</select></label><label>일<select name="d">${opt(1, 31, v.d || 1)}</select></label></div>
    <div class="row3"><label>태어난 시<select name="h"><option value="">모름</option>${opt(0, 23, v.h)}</select></label><label>분<select name="mi">${opt(0, 59, v.mi || 0)}</select></label><label>태어난 곳<select name="lon">${CITIES.map(([n, l]) => `<option value="${l}" ${l === (v.lon ?? 126.98) ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
    <div class="seg"><label><input type="radio" name="sex" value="f" ${v.sex === 'f' ? 'checked' : ''}>여성</label><label><input type="radio" name="sex" value="m" ${v.sex !== 'f' ? 'checked' : ''}>남성</label></div>`;
}
const readBirth = fd => { const n = k => fd.get(k) === '' || fd.get(k) == null ? null : Number(fd.get(k)); return { name: String(fd.get('name')).trim().slice(0, 10) || '그 사람', y: n('y'), m: n('m'), d: n('d'), h: n('h'), mi: n('h') == null ? 0 : n('mi'), cal: fd.get('cal'), leap: !!fd.get('leap'), lon: n('lon') || null, sex: fd.get('sex') }; };
/* 연애 독설 5종에 만 19세 미만이 들어왔을 때(공유 링크 · 바로가기 · 카드 어디서든): 막지 않고 다른 길 — 이미 산 풀이는 그대로 보여 줌 */
function adultOnly() {
  sdClose(); openSheet(`<div class="intro"><h2>이 운세는 만 19세 이상만 볼 수 있어요</h2><p class="fsub">연애 · 외도 같은 어른 주제를 다뤄서 나이를 확인하고 있어요.<br>친구가 보낸 궁합은 같이 볼 수 있어요!</p>
    <div class="stack"><button class="sdbtn" data-paid="compat">우리 궁합 보기</button><button class="btn ghost" data-fortune>오늘의 운세로</button></div></div>`);
  $('#sheet .panel').classList.add('sdpanel'); T.track('adult_block');
}
/* 결제 직전 확인 한 줄 (카드 · 골드 공통): 미리 체크하지 않음 · 체크해야 진행 · 체크하면 기록(adult_ok, 기기번호만) → true / 닫으면 false */
function adultCheck(id, label) {
  sdClose();   /* 풀이 화면 위가 아니라 시트로 (취소하면 부른 쪽이 풀이 화면을 다시 엶) */
  return new Promise(res => {
    let done = false; const fin = v => { if (done) return; done = true; onSheetClose = null; if (v) closeSheet(); res(v); };
    openSheet(`<div class="intro paysheet"><h2>🔞 결제 전에 확인해 주세요</h2>
      <label class="adultck"><input type="checkbox" id="adultOk"><span><b>만 19세 이상이에요.</b> 연애 · 외도를 다루는 성인용 풀이라는 걸 알고 볼게요.</span></label>
      <p class="adultmsg" id="adultMsg" hidden>만 19세 이상인지 먼저 체크해 주세요</p>
      <div class="stack"><button class="sdbtn" id="adultGo">${label}</button><button class="btn ghost" data-close>취소</button></div></div>`);
    $('#sheet .panel').classList.add('sdpanel');
    onSheetClose = () => { if (!done) { done = true; res(false); } };
    const ck = $('#adultOk'), go = $('#adultGo'), sync = () => go.classList.toggle('off', !ck.checked);
    sync(); ck.onchange = sync;
    go.onclick = () => { if (!ck.checked) { const msg = $('#adultMsg'); msg.hidden = false; go.classList.remove('shake'); void go.offsetWidth; go.classList.add('shake'); return; } T.track('adult_ok', { id }); fin(true); };
  });
}
async function partnerForm(id = 'cheating') {
  const m = await ft(), PR = m.paidOf(id), me = m.loadMe(); if (!me) return fortuneForm();
  if (m.isAdultFortune(id) && m.isUnder19(me) && !boughtFn(m, me)(id) && !acctHas(id)) return adultOnly();
  if (PR.solo) { T.track('paid_open', { product: id }); return paidPage(id); }   /* 내 사주만 보는 상품은 입력 없이 바로 미리보기 */
  const p = m.loadPartner(id) || { sex: me.sex === 'm' ? 'f' : 'm' }, [ttl, sub, who] = PR.form;
  sdClose(); openSheet(`<form class="fform sdform" id="pForm"><h2>${ttl}</h2><p class="fsub">${sub}</p>${birthFields(p, who)}<div class="stack"><button class="sdbtn" type="submit">${PR.title} 무료 미리보기</button></div></form>`);
  $('#sheet .panel').classList.add('sdpanel');
  $('#pForm').onsubmit = async e => { e.preventDefault(); const v = readBirth(new FormData(e.target)); try { await m.paidPreview(id, me, v); m.savePartner(v, id); } catch { toast('날짜를 다시 확인해 주세요'); return; } T.track('partner_form', { product: id, hour: v.h == null ? 0 : 1 }); closeSheet(); paidPage(id); };
}
const acctHas = id => { const me = A.current(); return !!(me && (me.items || []).some(x => x.startsWith(`fortune:${id}:`))); };
/* 카드 결제 완료: 주문번호 + 복원 코드 (로그인했으면 '계정에 저장됨') → 전체 풀이 */
function payDone(product, r) {
  const open = product === 'pack' ? 'newyear' : product, txt = `원어데이 주문번호 ${r.orderId}${r.code ? ` · 복원 코드 ${r.code}` : ''}`;
  openSheet(`<div class="intro paysheet"><h2>🎉 결제 완료</h2><p class="fsub">${r.saved ? '내 계정에 저장됐어요 · 다른 기기에서 로그인해도 다시 볼 수 있어요' : '이 풀이는 이 기기에 저장돼요 · 다른 기기나 브라우저에서 다시 보려면 아래 두 가지를 적어 두세요'}</p>
    <div class="payrow"><span>주문번호</span><b style="font-size:13px">${r.orderId}</b></div>${r.code ? `<div class="payrow"><span>복원 코드</span><b>${r.code}</b></div>` : ''}
    <p class="paynote">다시 받기: 설정 → 내 구매 → ‘주문번호로 다시 받기’ · 문의할 때도 주문번호를 알려 주세요</p>
    <div class="stack"><button class="sdbtn" data-mypaid="${open}">전체 풀이 보기</button><button class="btn ghost" id="payCopy">주문번호 · 코드 복사</button></div></div>`);
  $('#sheet .panel').classList.add('sdpanel');
  $('#payCopy').onclick = () => navigator.clipboard.writeText(txt).then(() => toast('복사했어요'), () => toast(txt));
}
// 유료 풀이 화면 (5종 공용): 무료 미리보기(점수 · 근거 · 무료 섹션 2개 + 잠긴 섹션 흐림) → 결제하면 서버에서 전체 본문
async function paidPage(id = 'cheating') {
  const m = await ft(), PR = m.paidOf(id), C = m.CHARS[PR.ch], me = m.loadMe(), pt = me && m.pairOf(id, me);
  if (!me) return fortuneForm(); if (!pt) return partnerForm(id);
  if (m.isAdultFortune(id) && m.isUnder19(me) && !boughtFn(m, me)(id) && !acctHas(id)) return adultOnly();   /* 산 건 나이와 관계없이 다시 보기 */
  let rp = await m.paidPreview(id, me, pt), paid = false;
  // 이 두 사람을 결제했으면 서버에서 전체 풀이를 받아 옴 (유료 본문은 이 앱 코드에 없음)
  let rc = P.ON && P.receiptFor(id, m.toInput(me), m.toInput(pt));
  /* 이 기기엔 없지만 계정에 산 기록이 있으면(다른 기기 · 다른 브라우저에서 산 것) 계정에서 영수증을 다시 받아 옴 */
  if (!rc && P.ON && acctHas(id)) { try { const r = await A.call({ act: 'restore', product: id, me: m.toInput(me), partner: m.toInput(pt) }); P.keepReceipt(r.receipt, m.toInput(me), m.toInput(pt)); rc = P.receiptFor(id, m.toInput(me), m.toInput(pt)); T.track('receipt_restore', { how: 'account', product: id }); } catch { /* 다른 사람 정보로 산 것 → 미리보기 그대로 */ } }
  if (rc) { try { rp = await P.report(rc, m.toInput(me), m.toInput(pt)); paid = true; } catch (e) { toast(e.message); } }
  const pk = paid ? null : (await import('./fortune/peek.js?v=0.92.1')).peek(id, rp, me, pt, m);   /* 궁금증 설계: 개인화 부제 · 첫 문장 앞부분 · 절벽 (fortune/peek.js) */
  let lk = 0;
  const lvlCol = PR.cols[rp.grade.level], locked = rp.sections.filter(s => !s.free).length, gold = gnum(PR.price / 10), life = rp.line === 'life', paidGold = PR.price > 3900;
  /* 가려진 시기: 미리보기엔 ██ · 결제 후 서버가 계산한 같은 값 */
  const teas = rp.teasers && rp.teasers.length ? `<div class="tzs">${rp.teasers.map(t => `<div class="tz"><small>${t.label}</small><b>${t.value || '██'}</b></div>`).join('')}</div>` : '';
  const chart = rp.chart ? `<section class="rsec"><small>2027 · 열두 달</small><h3>월별 총운 그래프</h3><div class="ych">${rp.chart.map(x => `<div><s style="height:${Math.max(6, x.score - 30)}px"></s><b>${x.score}</b><small>${x.label}</small></div>`).join('')}</div></section>` : '';
  const cal = rp.calendar ? `<section class="rsec"><small>${rp.ym ? `${rp.ym.slice(0, 4)}년 ${Number(rp.ym.slice(5))}월` : '앞으로 90일'}</small><h3>${PR.cal || '달력'}</h3><div class="wcal">${rp.calendar.map(d => `<span class="lv${d.level}"><b>${Number(d.date.slice(5, 7))}/${Number(d.date.slice(8))}</b>${'★'.repeat(d.level)}</span>`).join('') || '<p>이번 90일엔 크게 겹치는 날이 없어요</p>'}</div></section>` : '';
  const sec = s => s.free || (paid && s.body) ? `<section class="rsec"><small>${s.chapter}</small><h3>${s.title}</h3>${s.body.map(x => `<p>${x}</p>`).join('')}</section>`
    : `<section class="rsec lock"><small>${s.chapter} · 🔒 잠긴 장</small><h3>${s.title}</h3>${pk && pk.sub[s.id] ? `<p class="psub">${pk.sub[s.id]}</p>` : ''}<p class="plead">${pk && pk.lead[s.id] ? pk.lead[s.id] : ''} <span class="blur">${life ? '이 흐름은 ██월 무렵 가장 또렷해지는데, 그때 ████ 쪽을 먼저 챙기면 한 해의 결이 달라져요. 자세한 날짜와 이유는 ██에서 이어져요.' : '이 부분은 두 사람 원국이 만나는 자리에서 갈라지는데, ██월 무렵의 흐름과 ████의 기운이 겹치는 지점에서 결이 달라져요. 그 이유와 대처는 ██에서 이어져요.'}</span></p></section>`
      + (++lk % 3 === 0 && lk < locked ? `<div class="pinbuy"><span>잠긴 ${locked - lk}장이 더 있어요</span><button class="sdbtn ghost" data-buy="${id}">🔓 이어서 전부 읽기 · ${won(PR.price)}</button></div>` : '');
  const q = PR.q.replace('{p}', pt.name).replace('{me}', me.name).replace('{m}', rp.ym ? Number(rp.ym.slice(5)) : '');
  const wasOpen = sdOpen; sdClose(); sdOpen = wasOpen;   /* 운세 상세 위에서 바로 열 때(solo) 화면이 두 겹 되지 않게 */
  const el = document.createElement('div'); el.id = 'sd'; el.innerHTML = `<div class="sdpage">
    <button class="sdx" data-sd-close aria-label="닫기">✕</button>
    <div class="sdhero">${face(m, PR.ch, 'lg')}<div class="sdheroin"><div class="sdtag">${C.name}의 ${PR.title} · ${paid ? '전체 풀이 · 결제 완료' : '무료 미리보기'}</div><h1>${q}</h1>
      <div class="gauge"><div class="gv" style="--p:${rp.score};--c:${lvlCol}"><b>${rp.score}</b><small>${rp.gauge || '바람기 지수'}</small></div><div class="gl" style="color:${lvlCol}">${rp.grade.label}</div></div></div><span class="seal lg">${C.seal}</span></div>
    ${paid ? '' : `<div class="pcbuy"><div><b>전체 풀이 · 잠긴 ${locked}장</b><small>아래 목차와 무료 미리보기를 먼저 읽어 보세요</small></div><button class="sdbtn" data-buy="${id}">전체 풀이 열기 · ${won(PR.price)}</button></div>`}
    <section><blockquote>“${rp.grade.summary}”</blockquote>${rp.factors.length ? `<div class="factors">${rp.factors.map(f => `<span${f.points < 0 ? ' style="opacity:.6"' : ''}>${f.points < 0 ? '−' : ''}${f.label}</span>`).join('')}</div>` : ''}</section>
    ${teas}${rp.share ? `<div class="shbtn"><button class="sdbtn ghost" data-share="${id}">💌 궁합 결과 카드 공유하기 (점수 · 한 줄만)</button></div>` : ''}
    ${paid ? '' : `<section class="ptoc"><h3>이 풀이에 들어 있는 것 <small>${rp.sections.length}장 중 ${rp.sections.length - locked}장 무료</small></h3><ol>${rp.sections.map(s => `<li class="${s.free ? 'fr' : 'lk'}"><i>${s.free ? '무료' : '🔒'}</i><div><b>${s.title}</b>${!s.free && pk.sub[s.id] ? `<small>${pk.sub[s.id]}</small>` : ''}</div></li>`).join('')}</ol></section>`}
    ${rp.sections.filter(s => s.free).map(sec).join('')}
    ${paid ? '' : `<div class="pcliff"><small>${pk.who}</small><p>${pk.cliff}</p></div>`}
    ${paid ? '' : `<div class="paywall"><b>${life ? '여기서부터 자세히 볼게요.' : '여기서부터 진짜다.'}</b><p>남은 ${locked}개 풀이 — ${PR.lock}${teas ? ' · 위에 가려진 시기도 실제 계산값 그대로 열려요' : ''}</p>
      <button class="sdbtn" data-buy="${id}">전체 풀이 열기 · ${won(PR.price)}</button>${A.ON ? `<button class="sdbtn ghost gfort" data-gfort="${id}">🪙 ${gold}골드로 열기${paidGold ? ' (충전 골드)' : ''}${A.current() ? ` · 내 골드 ${gnum(goldOf())}` : ''}</button>` : ''}<small>한 번 결제하면 ${PR.monthly ? `${rp.ym ? Number(rp.ym.slice(5)) : ''}월 풀이는` : PR.solo ? '내 풀이는' : '이 두 사람 풀이는'} 계속 볼 수 있어요${paidGold ? ' · 보너스 골드는 입문 운세에만 쓸 수 있어요' : ' · 보너스 골드도 쓸 수 있어요'}${PR.monthly ? ' · 21일부터는 다음 달 운세로 팔아요' : ''}</small></div>`}
    ${chart}${cal}
    ${rp.sections.filter(s => !s.free).map(sec).join('')}
    ${paid ? '' : `<div class="paywall"><button class="sdbtn" data-buy="${id}">🔓 ${won(PR.price)}에 전부 열기</button></div>`}
    <p class="sdfoot">${life ? `명리학 규칙으로 계산한 전통 풀이이며 재미로 참고해 주세요.${id === 'wealth' ? ' 복권 번호를 알려 주지 않고, 복권 · 투자 결과를 예측하거나 보장하지 않아요.' : ''}${id === 'newyear' ? ' 건강 · 시험 결과를 단정하지 않아요.' : ''} 생년월일 원본은 내 폰에만 저장돼요.` : `사주 원국의 경향을 풀이한 것으로 특정인의 실제 행동이나 마음을 단정하지 않아요. 재미로 참고해 주세요.${id === 'after' ? ' 법률 · 상담이 필요한 일은 전문가와 상의해 주세요.' : ''} 두 사람 정보는 이 기기에만 저장돼요.`}${m.isAdultFortune(id) ? (paid ? ' 사주는 사실 확인이 아니에요. 궁금한 건 대화로 확인하세요.' : ' 만 19세 이상 · 연애 · 외도 등 성인 주제를 다뤄요. 사주는 재미로 보는 참고용이에요.') : ''}</p>
    <div class="sdbtns">${PR.solo ? '<button class="sdbtn ghost" data-fortune-edit>내 정보 고치기</button>' : `<button class="sdbtn ghost" data-paid-edit="${id}">그 사람 정보 고치기</button>`}<button class="sdbtn" data-sd-close>닫기</button></div></div>`;
  document.body.append(el); document.body.style.overflow = 'hidden'; if (!sdOpen) { sdOpen = true; history.pushState({ sd: 1 }, ''); }
  T.track(paid ? 'report_view' : 'paywall_view', { product: id, score: rp.score, level: rp.grade.level, from: FFROM || 'other' }); FFROM = '';
}
/* ── 신년 패키지: 신년운세 + 2개 고르기 (이미 산 건 빼고 표시 · 가격 먼저) ── */
async function fortunePack() {
  const m = await ft(), me = m.loadMe(); if (!me) return fortuneForm();
  const PK = m.PACK, has = boughtFn(m, me), gold = gnum(PK.price / 10);
  if (has(PK.base)) return toast('신년운세를 이미 가지고 있어요 · 나머지는 낱개로 골라 보세요');
  const row = id => { const p = m.paidOf(id), owned = has(id), needPt = id === 'compat' && !m.loadPartner('compat');
    return `<label class="pkrow${owned ? ' off' : ''}"><input type="checkbox" name="pk" value="${id}" ${owned ? 'disabled' : ''}><b>${p.title}</b><span>${owned ? '이미 있어요' : `낱개 ${won(p.price)}${needPt ? ' · 상대 정보 필요' : ''}`}</span></label>`; };
  sdClose(); openSheet(`<form class="intro paysheet" id="pkForm"><h2>🎁 ${PK.title}</h2><p class="fsub">${won(PK.price)} · 충전 골드 ${gold} — 신년운세(${won(m.paidOf(PK.base).price)})에 아래에서 <b>2개</b>를 더해요</p>
    <div class="pkrow on"><b>2027 정미년 신년운세</b><span>기본 포함</span></div>${PK.picks.map(row).join('')}
    <p class="paynote">이번 달 운세 · 합격운은 지금 팔리는 달(${Number(m.curYm().slice(5))}월) 기준이에요. 결제 후 고른 풀이가 모두 바로 열려요.</p>
    <div class="stack"><button class="sdbtn" type="submit" data-how="won" disabled>${won(PK.price)}로 결제하기</button>${A.ON ? `<button class="sdbtn ghost" type="submit" data-how="gold" disabled>🪙 충전 골드 ${gold}로 열기</button>` : ''}<button class="btn ghost" type="button" data-close>닫기</button></div></form>`);
  $('#sheet .panel').classList.add('sdpanel');
  const f = $('#pkForm'), picks = () => [...f.querySelectorAll('input[name=pk]:checked')].map(x => x.value);
  f.onchange = e => { if (picks().length > 2) e.target.checked = false; const n = picks().length; f.querySelectorAll('input[name=pk]:not([disabled])').forEach(x => x.parentElement.classList.toggle('dim', n >= 2 && !x.checked)); f.querySelectorAll('[data-how]').forEach(b => { b.disabled = n !== 2; }); };
  f.onsubmit = e => { e.preventDefault(); const how = (e.submitter && e.submitter.dataset.how) || 'won'; packBuy(picks(), how, e.submitter); };
}
async function packBuy(picks, how, btn) {
  const m = await ft(), me0 = m.loadMe(); if (picks.length !== 2) return;
  if (picks.includes('compat') && !m.loadPartner('compat')) { closeSheet(); toast('궁합 상대 정보를 먼저 넣어 주세요'); return partnerForm('compat'); }
  const me = m.toInput(me0), pt = picks.includes('compat') ? m.toInput(m.loadPartner('compat')) : null, extra = { picks, ym: m.curYm() };
  T.track('pack_click', { picks: picks.join(','), how });
  if (how === 'gold') {
    if (!A.current()) { closeSheet(); return needLogin('골드로 열려면 로그인해 주세요'); }
    btn.disabled = true; btn.textContent = '여는 중…';
    try { const r = await A.call({ act: 'spend', what: 'pack', me, partner: pt, ...extra }); keepMany(r.receipts || []); T.track('gold_spend', { what: 'pack' }); A.refresh().catch(() => {}); closeSheet(); toast('신년 패키지가 열렸어요'); paidPage('newyear'); }
    catch (e) { if (e.short) { closeSheet(); return shop(`충전한 골드가 ${gnum(e.need - ((e.gold && e.gold.paid) || 0))}개 모자라요 (보너스 골드는 입문 운세에만)`); } toast(e.message); btn.disabled = false; btn.textContent = '다시 시도'; }
    return;
  }
  const c = await P.config(); if (c.mode === 'off') return toast('결제는 곧 열려요 · 조금만 기다려 주세요');
  const tk = A.current() ? await A.token().catch(() => '') : '';
  let o; try { o = await P.order('pack', me, pt, extra, tk); } catch (e) { return toast(e.message); }
  if (c.mode === 'toss') { try { await P.toss(o, me, pt); } catch { toast('결제창을 열지 못했어요'); } return; }
  closeSheet(); openSheet(`<div class="intro paysheet"><h2>🎁 ${m.PACK.title}</h2><p class="fsub">테스트 결제예요 · 실제로 돈이 나가지 않아요</p>
    <div class="payrow"><span>${o.orderName}</span><b>${won(o.amount)}</b></div><p class="paynote">신년운세 + ${picks.map(id => m.paidOf(id).title).join(' + ')} · 결제 후 바로 열리는 콘텐츠라 단순 변심 환불은 제한돼요. <a href="legal.html#refund" target="_blank">결제·환불 규정</a></p>
    <div class="stack"><button class="sdbtn" id="mockPay">동의하고 테스트로 결제하기</button><button class="btn ghost" data-close>취소</button></div></div>`);
  $('#sheet .panel').classList.add('sdpanel');
  $('#mockPay').onclick = async e => { const b = e.target; b.disabled = true; b.textContent = '결제 중…';
    try { const r = await P.confirm(o, 'mock_' + Date.now(), o.amount, me, pt); closeSheet(); payDone('pack', r); }
    catch (er) { toast(er.message); b.disabled = false; b.textContent = '동의하고 테스트로 결제하기'; } };
}
/* ── 🔥 7일 연속 출석 선물: 입문 운세 1회 무료 (계정당 한 번 · 서버가 막음 · 이 기기도 한 번) ── */
function freebieOk() { try { return R.state().streak.count >= 7 && localStorage.getItem('oad_freebie') !== '1'; } catch { return false; } }
async function freebieOpen() {
  const m = await ft(), me = m.loadMe(); if (!me) return fortuneForm();
  const has = boughtFn(m, me), ids = m.PAID.filter(p => p.entry);
  sdClose(); openSheet(`<div class="intro paysheet"><h2>🔥 ${R.state().streak.count}일 연속 출석 선물</h2><p class="fsub">입문 운세 하나를 무료로 열어 드려요 (계정당 한 번 · 로그인 필요)</p>
    ${ids.map(p => `<button class="sdbtn ${has(p.id) ? 'ghost' : ''}" data-fbclaim="${p.id}" ${has(p.id) ? 'disabled' : ''}>${p.title} (${won(p.price)}) ${has(p.id) ? '· 이미 있어요' : '무료로 열기'}</button>`).join('')}
    <div class="stack"><button class="btn ghost" data-close>나중에</button></div></div>`);
  $('#sheet .panel').classList.add('sdpanel');
}
async function freebieClaim(id, b) {
  if (!A.current()) { closeSheet(); return needLogin('출석 선물은 로그인하고 받을 수 있어요'); }
  const m = await ft(), me0 = m.loadMe(), me = m.toInput(me0), pt = m.toInput(m.pairOf(id, me0));
  b.disabled = true; b.textContent = '여는 중…';
  try { const r = await A.call({ act: 'freebie', what: id, me, partner: pt }); P.keepReceipt(r.receipt, me, pt); localStorage.setItem('oad_freebie', '1'); T.track('freebie', { what: id }); closeSheet(); toast('출석 선물이 열렸어요 🎁'); paidPage(id); }
  catch (e) { if (e.used) { try { localStorage.setItem('oad_freebie', '1'); } catch { /* */ } } closeSheet(); toast(e.message); go(tab); }
}
// 궁합 결과 공유 카드: 점수 · 등급 · 한 줄만 그린 그림 (이름 · 생년월일 없음) → 공유 시트 또는 저장
async function shareCompat(id) {
  const m = await ft(), me = m.loadMe(), pt = me && m.pairOf(id, me); if (!pt) return;
  const rp = await m.paidPreview(id, me, pt), sh = rp.share; if (!sh) return;
  const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350; const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 1350); g.addColorStop(0, '#2a0f1c'); g.addColorStop(1, '#0d0b0c'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  x.textAlign = 'center'; x.fillStyle = '#E8C98A'; x.font = '600 44px serif'; x.fillText('해솔선녀의 우리 궁합', 540, 220);
  x.fillStyle = '#FF6FA0'; x.font = '900 300px serif'; x.fillText(String(sh.score), 540, 640);
  x.fillStyle = '#fff'; x.font = '800 72px serif'; x.fillText(sh.label, 540, 790);
  x.fillStyle = '#ddd'; x.font = '44px sans-serif'; const words = sh.line.split(' '); let ln = '', y = 900; for (const w of words) { if (x.measureText(ln + w).width > 880) { x.fillText(ln, 540, y); ln = ''; y += 62; } ln += w + ' '; } x.fillText(ln, 540, y);
  x.fillStyle = '#E8C98A'; x.font = '600 40px sans-serif'; x.fillText('원어데이 · oneaday.kr · 재미로 보는 궁합', 540, 1240);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png')), file = new File([blob], 'oneaday-compat.png', { type: 'image/png' });
  const text = `우리 궁합 ${sh.score}점 · ${sh.label} — 원어데이에서 내 오늘의 운세도 무료로 봐요`, url = location.origin + '/?from=compat';
  T.track('share_card', { product: id, score: sh.score });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) return await navigator.share({ files: [file], text, url }); if (navigator.share) return await navigator.share({ text, url }); } catch { return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'oneaday-compat.png'; a.click(); toast('궁합 카드를 저장했어요');
}
// 결제: 토스 키가 있으면 토스 결제창, 테스트 서버는 모의 결제, 그 밖에는 '곧 열려요'
async function buy(product) {
  const c = await P.config();
  if (c.mode === 'off') return toast('결제는 곧 열려요 · 조금만 기다려 주세요');
  const m = await ft(), me0 = m.loadMe(), me = m.toInput(me0), pt = m.toInput(m.pairOf(product, me0)), PR = m.paidOf(product);
  const adult = m.isAdultFortune(product); if (adult) { if (m.isUnder19(me0)) return adultOnly(); if (!(await adultCheck(product, `${won(PR.price)} 결제하기`))) return paidPage(product); }
  const tk = A.current() ? await A.token().catch(() => '') : '';   /* 로그인 상태면 주문을 계정에 연결 */
  let o; try { o = await P.order(product, me, pt, adult ? { adult: true } : null, tk); } catch (e) { return toast(e.message); }
  if (c.mode === 'toss') { try { await P.toss(o, me, pt); } catch { toast('결제창을 열지 못했어요'); } return; }
  sdClose();
  openSheet(`<div class="intro paysheet"><h2>🔓 ${PR.title} 전체 풀이</h2><p class="fsub">테스트 결제예요 · 실제로 돈이 나가지 않아요</p>
    <div class="payrow"><span>${o.orderName}</span><b>${won(o.amount)}</b></div>
    <p class="paynote">결제 후 풀이가 바로 제공되어 단순 변심 환불은 제한돼요 (오류 · 중복 결제는 전액 환불). <a href="legal.html#refund" target="_blank">결제·환불 규정</a> · <a href="legal.html#terms" target="_blank">이용약관</a></p>
    <div class="stack"><button class="sdbtn" id="mockPay">동의하고 테스트로 결제하기</button><button class="btn ghost" id="payCancel">취소</button></div></div>`);
  $('#sheet .panel').classList.add('sdpanel');
  $('#payCancel').onclick = () => { closeSheet(); paidPage(product); };
  $('#mockPay').onclick = async e => {
    const b = e.target; b.disabled = true; b.textContent = '결제 중…';
    try { const r = await P.confirm(o, 'mock_' + Date.now(), o.amount, me, pt); closeSheet(); payDone(product, r); }
    catch (er) { toast(er.message); b.disabled = false; b.textContent = '동의하고 테스트로 결제하기'; }
  };
}
function fortuneForm() {
  let me = null; try { me = JSON.parse(localStorage.getItem('oad_fortune_me') || 'null'); } catch { /* */ } me ||= { name: '', y: 1995, m: 1, d: 1, cal: 'solar', sex: 'f', h: null, mi: 0, lon: 126.98 };
  const opt = (a, b, v) => Array.from({ length: b - a + 1 }, (_, i) => a + i).map(n => `<option ${n === v ? 'selected' : ''}>${n}</option>`).join('');
  sdClose(); openSheet(`<form class="fform sdform" id="fForm"><h2>사주를 내놔라</h2><p class="fsub">태어난 시까지 넣어야 제대로 읽는다. 생년월일 원본은 내 폰에만 · AI 상담 때는 해석 요약만 보내고 저장하지 않아요.</p>
    <label>이름<input name="name" maxlength="10" placeholder="이름 또는 별명" value="${me.name}" required></label>
    <div class="seg"><label><input type="radio" name="cal" value="solar" ${me.cal !== 'lunar' ? 'checked' : ''}>양력</label><label><input type="radio" name="cal" value="lunar" ${me.cal === 'lunar' ? 'checked' : ''}>음력</label><label class="lp"><input type="checkbox" name="leap" ${me.leap ? 'checked' : ''}>윤달</label></div>
    <div class="row3"><label>년<select name="y">${opt(1930, R.now().getFullYear(), me.y)}</select></label><label>월<select name="m">${opt(1, 12, me.m)}</select></label><label>일<select name="d">${opt(1, 31, me.d)}</select></label></div>
    <div class="row3"><label>태어난 시<select name="h"><option value="">모름</option>${opt(0, 23, me.h)}</select></label><label>분<select name="mi">${opt(0, 59, me.mi)}</select></label><label>태어난 곳<select name="lon">${CITIES.map(([n, l]) => `<option value="${l}" ${l === me.lon ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
    <div class="seg"><label><input type="radio" name="sex" value="f" ${me.sex !== 'm' ? 'checked' : ''}>여성</label><label><input type="radio" name="sex" value="m" ${me.sex === 'm' ? 'checked' : ''}>남성</label></div>
    <div class="stack"><button class="sdbtn" type="submit">오늘의 신점 보기</button>${localStorage.getItem('oad_fortune_me') ? '<button class="btn ghost small" type="button" data-fortune-del>내 정보 지우기</button>' : ''}</div></form>`);
  $('#fForm').onsubmit = async e => { e.preventDefault(); const fd = new FormData(e.target), n = k => fd.get(k) === '' || fd.get(k) == null ? null : Number(fd.get(k));
    const v = { name: String(fd.get('name')).trim().slice(0, 10) || '나', y: n('y'), m: n('m'), d: n('d'), h: n('h'), mi: n('h') == null ? 0 : n('mi'), cal: fd.get('cal'), leap: !!fd.get('leap'), lon: n('lon') || null, sex: fd.get('sex') };
    try { const m = await ft(); m.myChart(v); m.saveMe(v); } catch { toast('날짜를 다시 확인해 주세요'); return; } T.track('fortune_form', { hour: v.h == null ? 0 : 1 }); closeSheet(); go('today'); FFROM = 'form'; setTimeout(fortuneDetail, 200); };
  $('#sheet .panel').classList.add('sdpanel'); }

// ── 홈 화면에 추가 (2026-10-28 설치 안내 · team/dev/tasks/261028-install-guide) ──
//   배너(시안 b) · 권유 사다리(첫 게임 끝 → 다음 날 재방문 → 3일 연속, 평생 3번 · '나중에'면 3일 쉼) · 그림 안내(install-guide.js) · 설치 앱 첫 실행 선물
const INSTALL_REWARD = true;   /* 설치 선물 50골드 문구 · 지급 (biz 3 · 켬/끔 실험은 운영 결정 뒤 bm.js 로) */
const todayKey = () => R.keyOf(R.now());
const visitAgain = () => { const f = localStorage.getItem('oad_first'); return !!f && f < new Date().toISOString().slice(0, 10); };   /* 처음 온 날이 아님 */
const offerState = () => { try { return JSON.parse(localStorage.getItem('oad_install_offer') || '{}') || {}; } catch { return {}; } };
const offerSave = o => { try { localStorage.setItem('oad_install_offer', JSON.stringify(o)); } catch { /* */ } };
const plusDays = (k, n) => { const d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() + n); return R.keyOf(d); };
const coverOf = () => { const g = G(R.todayId()); return g ? { cover: webp(g.cover, 600), title: g.title } : {}; };
/* 배너: 설치 전 · 오늘 닫지 않음 · 처음 온 날이 아님(카톡 안은 첫날부터) · 오늘 권유 시트를 띄운 날은 숨김 · PC 는 설치 창을 띄울 수 있을 때만 */
function installBanner() {
  if (I.installed() || localStorage.getItem('oad_hide_install') === todayKey()) return '';
  if (isPC() ? !I.canPrompt() : !I.env.inApp && !visitAgain()) return '';
  if (offerState().last === todayKey()) return '';
  return `<div class="ibwrap" data-blk="install">${I.bannerHTML({ reward: INSTALL_REWARD })}</div>`;
}
let promptedAt = 0;
/* 설치: 설치 창이 있으면 바로 · 없으면 환경별 그림 안내 · 그림이 없는 환경(PC 등)은 글 안내 */
async function doInstall(where = '') {
  const h = I.how();
  if (h === 'prompt' || h === 'pc_prompt') {
    promptedAt = Date.now(); const r = await I.prompt();
    T.track('install_prompt', { where, ok: r === 'accepted' ? 1 : r === 'error' ? -1 : 0 });
    if (r === 'accepted') setTimeout(() => go(tab), 300);
    if (r !== 'error') return;
  }
  try {
    const UI = await I.ui();
    if (UI.hasGuide(I.how())) { const r = await UI.openGuide(I.how(), { where, ...coverOf() }); if (r === 'yes' || r === 'accepted') go(tab); return; }
  } catch (e) { T.trackError('install_ui', e); }
  T.track('install_guide', { where, how: I.how() }); openSheet(I.guide());
}
async function extOpen() {
  const r = await I.openExt();
  if (r === 'copied') toast(`주소를 복사했어요 · ${browserName()}에 붙여 넣어 주세요`);
  else if (r === 'failed') toast('오른쪽 위 메뉴에서 ‘다른 브라우저로 열기’를 눌러 주세요');
}
/* 권유 사다리 (biz 4-1): 각 차례 한 번씩 · 평생 3번 · 하루 1번 · '나중에'면 3일 쉼 · 시트 · 운세 상세 · 게임 · 안내가 열려 있으면 안 띄움
   첫 게임 끝인데 안드로이드 크롬 설치 창이 아직이면 미룸(차례를 쓰지 않음, ops A4) */
async function offerInstall(kind) {
  if (I.installed() || (isPC() && !I.canPrompt())) return false;
  const o = offerState(), k = todayKey();
  if ((o.n || 0) >= 3 || (o.done || []).includes(kind) || (o.next && k < o.next) || o.last === k) return false;
  if (!sheet.hidden || !player.hidden || $('#sd') || document.querySelector('.ig')) return false;
  if (kind === 'first' && I.shouldWaitPrompt()) return false;
  const UI = await I.ui().catch(() => null); if (!UI) return false;
  if (!sheet.hidden || !player.hidden || document.querySelector('.ig')) return false;
  o.n = (o.n || 0) + 1; o.last = k; o.done = [...(o.done || []), kind]; offerSave(o);
  const r = await UI.openOffer(kind, { where: 'nudge', nth: o.n, reward: INSTALL_REWARD });
  if (r === 'accept') { if (I.env.inApp) extOpen(); else doInstall('nudge'); }
  else { o.next = plusDays(k, 3); offerSave(o); }
  if (tab === 'today') go('today');   /* 배너는 시트를 띄운 날 숨김 */
  return true;
}
function maybeOffer() {
  if (tab !== 'today' || I.installed()) return;
  const st = R.state().streak, k = todayKey();
  if (st && st.last === k && st.count >= 3) offerInstall('day3');
  else if (visitAgain()) offerInstall('day2');
}
/* 설치 앱 첫 실행: 기록(install_open · ref 로 원래 기기와 이어 붙임) + 설치 완료 화면 · 선물은 로그인한 계정에 한 번 (서버 me act install) */
const GIFT = 'oad_install_gift';
{ const fo = I.firstOpen(); if (fo) { T.track('install_open', { first: 1, how: fo.ih, ref: fo.ref }); if (INSTALL_REWARD) localStorage.setItem(GIFT, 'pending'); else localStorage.setItem(GIFT, 'none'); } }
async function showInstalled() {
  const UI = await I.ui().catch(() => null); if (!UI) return;
  const m = A.current();
  const r = await UI.openInstalled({ loggedIn: !!m, reward: INSTALL_REWARD && localStorage.getItem(GIFT) !== 'done',
    claim: async () => {
      try { await A.call({ act: 'install', app: 1 }); localStorage.setItem(GIFT, 'done'); T.track('install_open', { what: 'gift', ok: 1 }); go(tab); return { ok: true }; }
      catch (e) { if (e.used) { localStorage.setItem(GIFT, 'done'); go(tab); return { used: true }; } T.track('install_open', { what: 'gift', ok: 0, reason: String(e.message || '').slice(0, 40) }); return { ok: false, error: e.message }; }
    },
    login: () => { localStorage.setItem(GIFT, 'pending'); if (I.env.inApp) needLogin(); else A.login().catch(er => toast(er.message)); } });
  if (r === 'skip' && localStorage.getItem(GIFT) === 'pending') localStorage.setItem(GIFT, 'later');
  if (r === 'skip' && !INSTALL_REWARD) localStorage.setItem(GIFT, 'none');
}
const giftOpen = () => I.standalone() && INSTALL_REWARD && ['pending', 'later'].includes(localStorage.getItem(GIFT) || '');

function tick() { const v = hms(R.msToTomorrow()); document.querySelectorAll('#cd,[data-cd]').forEach(el => { el.textContent = v; }); if (R.msToTomorrow() < 1000) setTimeout(() => go('today', 'midnight'), 1200); }

function itemCard(id) {
  const g = G(id), lib = R.state().library[id];
  const a = R.access(id), [cls, label] = STATE_BADGE[a];
  const sub = lib ? `처음 만난 날 ${fmtKey(lib.first)} · ${lib.plays}판` : a === 'owned' ? `${g.genre} · 소장 · 아직 안 해 봤어요` : `${g.genre} · 아직 안 해 봤어요`;
  return `<div class="item" data-open="${id}" ${KB}><img src="${g.icon}" alt=""><div><div class="t">${g.title}</div><div class="s">${sub}</div></div><span class="state badge ${cls}">${label}</span></div>`;
}

// ── 라이브러리 ─────────────────────────────────────
function renderLibrary() {
  const st = R.state(), lib = st.library, ids = R.myGames().filter(id => !R.isBrand(id));
  const last = id => (lib[id] && lib[id].last) || '';
  const own = ids.filter(id => st.owned[id]).sort((a, b) => (last(b) > last(a) ? 1 : -1));
  const rest = ids.filter(id => !st.owned[id]).sort((a, b) => (last(b) > last(a) ? 1 : -1));
  const general = ids.length
    ? `${own.length ? `<div class="sub">소장 ${own.length}</div><div class="list">${own.map(itemCard).join('')}</div>` : ''}${rest.length ? `<div class="sub">만난 게임 ${rest.length}</div><div class="list">${rest.map(itemCard).join('')}</div>` : ''}`
    : `<div class="empty"><div class="big">📚</div><p>아직 비어 있어요.<br>오늘의 게임을 플레이하면 여기에 모여요!</p><button class="btn small" style="max-width:220px;margin:0 auto" data-tab-go="today">오늘의 게임 보러 가기</button></div>`;
  return `<div>${header()}
    <h1 style="font-size:28px">라이브러리</h1>
    <div class="hall"><div class="hh"><b>🎮 일반관</b><span>내 게임 ${ids.length}개${own.length ? ` · 소장 ${own.length}개` : ''}</span></div>${general}</div>
    ${R.BRAND.length ? `<div class="hall bhall"><div class="hh"><b>🤝 브랜드관</b><span>브랜드와 함께 만든 게임</span></div><div class="list brandhall">${R.BRAND.map(itemCard).join('')}</div></div>` : ''}
  </div>`;
}

// ── 컬렉션 ─────────────────────────────────────────
function renderCollection() {
  const rel = R.released(), st = R.state(), lib = st.library, total = Math.max(PLANNED, R.DAILY.length);
  const met = rel.filter(id => lib[id]).length;
  const tile = (id, n) => `<div class="tile" data-open="${id}" ${KB}><img src="${G(id).icon}" alt="">${n ? `<span class="n">#${n}</span>` : ''}${st.owned[id] ? '<span class="own">소장</span>' : ''}${R.isBrand(id) ? '<span class="collab">콜라보</span>' : ''}${lib[id] ? '' : '<span class="lk">✨</span>'}</div>`;
  const tiles = R.DAILY.map((id, i) => rel.includes(id) ? tile(id, i + 1) : `<div class="tile unk">?</div>`), soon = [];
  for (let i = R.DAILY.length; i < total; i++) soon.push(`<div class="tile unk" style="font-size:16px">곧 공개</div>`);
  return `<div>${header()}
    <h1 style="font-size:28px">컬렉션</h1>
    <div class="date">만난 게임 ${met} / 공개 ${rel.length} / 전체 ${total}</div>
    <div class="progress"><i style="width:${(met / total) * 100}%"></i></div>
    <div class="grid">${tiles.join('')}</div>
    ${soon.length ? `<div class="section"><h3>다가올 게임</h3><span class="more">하루 하나씩 공개돼요</span></div><div class="grid">${soon.join('')}</div>` : ''}
  </div>`;
}

// ── 설정 ───────────────────────────────────────────
// 계정 카드: 로그인 전 = 구글 로그인 버튼 · 후 = 이름 · 골드
function accountCard() {
  const m = A.current();
  if (!m && I.env.inApp) return `<div class="acct"><div><b>원어데이 계정</b><p>${inAppLoginNote()}</p></div><button class="gbtn" data-ext>🌐 ${browserName()}로 열기</button></div>`;
  if (!m) return `<div class="acct"><div><b>원어데이 계정</b><p>로그인하면 골드와 구매 내역이 계정에 저장돼 폰을 바꿔도 이어져요 · 게임은 로그인 없이도 그대로</p></div><button class="gbtn" data-login><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>구글로 로그인</button></div>`;
  return `<div class="acct in"><div class="av">${(m.name || m.email || '?')[0]}</div><div class="who"><b>${m.name || '원어데이 친구'}</b><small>${m.email || ''}</small></div><button class="gold" data-shop><span>골드 · 충전</span><b>🪙 ${gnum((m.gold && m.gold.total) || 0)}</b></button><button class="lo" data-logout>로그아웃</button></div>`;
}
/* 내 구매: 이 기기의 운세 영수증 + (로그인) 계정에 남은 운세 · 다른 기기에서 산 건 그 풀이를 열면 계정에서 자동 복원 */
function purchasesRow() {
  if (!P.ON) return '';
  const n = new Set([...P.myReceipts().map(r => r.product), ...((A.current() && A.current().items) || []).filter(x => x.startsWith('fortune:') && !x.startsWith('fortune:pack:')).map(x => x.split(':')[1])]).size;
  return `<div><span>내 구매 (운세)<br><small style="color:var(--mute)">${n ? `${n}가지 · ` : ''}다른 기기에서 산 풀이 다시 받기</small></span><button data-mybuy>보기</button></div>`;
}
async function myBuys() {
  const m = await ft(), me = A.current(), local = P.myReceipts();
  const acct = me ? [...new Set((me.items || []).filter(x => x.startsWith('fortune:') && !x.startsWith('fortune:pack:')).map(x => x.split(':')[1]))] : [];
  const ids = [...new Set([...local.map(r => r.product), ...acct])].filter(id => m.paidOf(id));
  const row = id => { const r = local.filter(x => x.product === id).slice(-1)[0];
    return `<div class="pkrow" data-mypaid="${id}" ${KB}><b>${m.paidOf(id).title}</b><span>${r ? `${r.orderId && /^oad/.test(r.orderId) ? `주문 ${r.orderId}${r.code ? ` · 복원 코드 ${r.code}` : ''}` : '골드로 열기'}` : '☁ 계정에 있음 · 열면 복원'}</span></div>`; };
  openSheet(`<div class="intro"><h2>🧾 내 구매</h2><p class="fsub">${me ? '로그인한 상태로 산 풀이는 계정에 남아 다른 기기에서도 열려요 · 산 때와 같은 사람 정보면 바로 열려요' : '로그인하지 않고 산 풀이는 이 기기에만 있어요 · 주문번호와 복원 코드를 적어 두면 다른 기기에서 다시 받을 수 있어요'}</p>
    ${ids.length ? `<div class="stack" style="gap:6px">${ids.map(row).join('')}</div>` : '<p class="fsub">아직 산 풀이가 없어요</p>'}
    <div class="stack"><button class="btn ghost" data-restore-code>주문번호로 다시 받기</button><button class="btn ghost" data-close>닫기</button></div></div>`);
}
function restoreForm() {
  openSheet(`<form class="fform" id="rcForm"><h2>🧾 주문번호로 다시 받기</h2><p class="fsub">결제 완료 화면의 주문번호와 복원 코드를 넣어 주세요 · 이 기기의 운세 정보가 산 때와 같아야 열려요</p>
    <label>주문번호<input name="o" required placeholder="oad…" autocomplete="off"></label><label>복원 코드<input name="c" required maxlength="8" placeholder="8자리" autocomplete="off" style="text-transform:uppercase"></label>
    <div class="stack"><button class="btn" type="submit">다시 받기</button><button class="btn ghost" type="button" data-close>닫기</button></div></form>`);
  $('#rcForm').onsubmit = async e => { e.preventDefault(); const fd = new FormData(e.target), b = e.target.querySelector('[type=submit]'), orderId = String(fd.get('o')).trim(), code = String(fd.get('c')).trim();
    b.disabled = true; b.textContent = '확인 중…';
    try {
      const m = await ft(), me0 = m.loadMe(); if (!me0) { closeSheet(); toast('내 사주 정보를 먼저 넣어 주세요'); return fortuneForm(); }
      const a = await P.restoreByCode({ orderId, code }), partners = {};
      for (const id of a.products) { const pt = m.pairOf(id, me0); if (pt && !m.paidOf(id).solo) partners[id] = m.toInput(pt); }
      const r = await P.restoreByCode({ orderId, code, me: m.toInput(me0), partners });
      for (const x of r.receipts) { const pt = m.pairOf(x.product, me0); if (pt) P.keepReceipt({ ...x, code: code.toUpperCase() }, m.toInput(me0), m.toInput(pt)); }
      T.track('receipt_restore', { how: 'code', n: r.receipts.length }); closeSheet(); toast('영수증을 다시 받았어요'); paidPage(r.receipts[0].product === 'pack' ? 'newyear' : r.receipts[0].product);
    } catch (er) { toast(er.message); b.disabled = false; b.textContent = '다시 받기'; } };
}
/* 회원 탈퇴: 남은 충전 골드 안내 → 한 번 더 확인 → 서버가 계정 · 저장 · 순위 · 가진 것 삭제 (이 기기의 게임 기록은 그대로) */
function deleteAccount() {
  const m = A.current(); if (!m) return;
  const paid = (m.gold && m.gold.paid) || 0, free = (m.gold && m.gold.free) || 0;
  openSheet(`<div class="intro"><h2>탈퇴하고 내 정보 지우기</h2><p class="fsub">원어데이 계정과 계정에 저장된 것(소장 게임 · 클라우드 저장 · 명예의 전당 · 계정에 남은 운세 구매)이 모두 지워지고 되돌릴 수 없어요.</p>
    ${paid || free ? `<div class="payrow"><span>남은 골드</span><b>🪙 ${gnum(paid + free)}</b></div><p class="fsub">${paid ? `충전한 골드 ${gnum(paid)}개(${won(paid * 10)})도 함께 사라져요. 결제 후 7일 안에 쓰지 않은 골드는 환불받을 수 있으니, 지우기 전에 <a href="legal.html#refund" target="_blank">환불 규정</a>을 확인하고 고객센터에 먼저 문의해 주세요.` : '선물로 받은 무료 골드도 함께 사라져요.'}</p>` : ''}
    <p class="fsub">결제 기록은 법에 따라 5년 보관하지만, 이 계정과의 연결은 끊어요. 이 기기의 게임 기록 · 운세 정보는 그대로예요 (지우려면 '모든 기록 지우기').</p>
    <div class="stack"><button class="btn warn" data-delacct>탈퇴하고 지우기</button><button class="btn ghost" data-close>그만두기</button></div></div>`);
}
async function deleteAccountGo(b) {
  if (!b.dataset.confirm) { b.dataset.confirm = 1; b.textContent = '정말 지울게요 (한 번 더)'; return; }
  b.disabled = true; b.textContent = '지우는 중…';
  try { await A.call({ act: 'delete', sure: true }); T.track('account_delete'); await A.logout().catch(() => {}); closeSheet(); go('settings'); toast('계정을 지웠어요 · 그동안 고마웠어요'); }
  catch (e) { toast(e.message); b.disabled = false; b.textContent = '다시 시도'; }
}
function renderSettings() {
  const s = R.state();
  return `<div>${header()}
    <h1 style="font-size:28px;margin-bottom:14px">설정</h1>
    ${A.ON ? accountCard() : ''}
    <div class="group">
      <div><span>${isPC() ? 'PC에 앱으로 설치' : '홈 화면에 추가'}</span>${I.standalone() ? '<span class="badge open">설치 앱으로 열림</span>' : I.installed() ? '<span><span class="badge open">추가됨</span> <button data-install data-where="settings">다시 추가</button></span>' : `<button data-install data-where="settings">${isPC() ? '설치' : '추가하기'}</button>`}</div>
      ${giftOpen() ? '<div><span>🎁 설치 선물 50골드</span><button data-igift>받기</button></div>' : ''}
      <div><span>설치가 안 돼요<br><small style="color:var(--mute)">내 폰 · 브라우저를 살펴보고 알려 드려요</small></span><button data-idiag>진단</button></div>
      <div><span>이용 방법 다시 보기</span><button data-intro>보기</button></div>
      <div><span>버전</span><span class="badge">v${VERSION}</span></div>
    </div>
    <div class="group">
      <div><span>이용 기록 보내지 않기<br><small style="color:var(--mute)">이름 없는 통계만 모아요 · 끄면 서비스 개선에 쓰지 않아요</small></span><button data-track-off>${T.optedOut() ? '켜기' : '끄기'}</button></div>
      <div><span>이용약관 · 개인정보처리방침</span><a class="btnlink" href="legal.html">보기</a></div>
      <div><span>결제 · 환불 규정</span><a class="btnlink" href="legal.html#refund">보기</a></div>
      ${purchasesRow()}
      ${A.current() ? '<div><span>탈퇴하고 내 정보 지우기<br><small style="color:var(--mute)">계정과 계정에 저장된 것을 지워요</small></span><button data-delacct-open>탈퇴</button></div>' : ''}
    </div>
    <div class="group">
      ${R.PROD ? '' : `<div><span>테스트: 날짜 이동 <span class="badge">${s.dayOffset >= 0 ? '+' : ''}${s.dayOffset}일</span></span><span><button data-day="-1">‹ 하루 전</button> <button data-day="1">하루 뒤 ›</button></span></div>
      <div><span>테스트: 날짜 되돌리기</span><button data-day="0">오늘로</button></div>
      <div><span>테스트: 게임 안 BM 그룹 <span class="badge">${BM.group()}</span><br><small style="color:var(--mute)">A 지금 그대로 · B 보상형 광고 + 골드 · C B + 약한 전면 광고</small></span><span><button data-bmg="A">A</button> <button data-bmg="B">B</button> <button data-bmg="C">C</button></span></div>
      <div><span>테스트: 연속 실패 응원 선물 <span class="badge">${BM.helpOn() ? '켜짐' : '꺼짐'}</span></span><span><button data-helpg="on">켜기</button> <button data-helpg="off">끄기</button></span></div>
      <div><span>테스트: 메인 화면 <span class="badge">${LAY === 'b' ? '새(B)' : '예전(A)'}</span><br><small style="color:var(--mute)">B 이번 주 달력 허브 · A 예전 메인 · 주소 ?home=a|b 로도</small></span><span><button data-homeg="b">새(B)</button> <button data-homeg="a">예전(A)</button></span></div>
      <div><span>테스트: 하루 한 게임 규칙<br><small style="color:var(--mute)">켜면 실제처럼 잠기고 광고 · 골드로 열어요</small></span><button data-strict>${R.RULES.openAll ? '켜기' : '끄기'}</button></div>
      <div><span>테스트: 시안 보기 (실험실)<br><small style="color:var(--mute)">앱 목록에 아직 없는 시안 · 새 창으로 열려요</small></span><span><button data-lab="/lab/story/">하루 한 화</button></span></div>`}
      <div><span>모든 기록 지우기</span><button class="warn" data-reset>초기화</button></div>
    </div>
    <div class="box"><div class="jua" style="font-size:18px;margin-bottom:6px">이용 규칙 (현재)</div><ul class="rules" style="margin:0;padding-left:18px">
      ${R.RULES.openAll ? '<li><b>지금은 테스트 기간이라 모든 게임을 자유롭게 할 수 있어요</b></li>' : ''}
      <li>오늘의 게임은 하루 종일 무료</li>
      <li>다른 게임은 광고를 보면 ${R.RULES.adUnlock === 'day' ? '그날 하루' : '한 판'} 열려요 (지금은 테스트 광고)</li>
      <li>골드로 하루 열기 10골드 · 소장 300골드 · 전체 소장 2,500골드 (로그인 필요)</li></ul>
      ${A.current() && setCount() ? `<div class="stack" style="margin-top:10px"><button class="btn gold ghost" data-gbuy="set">🪙 ${setCount()}개 게임 전체 소장 · ${gnum(Math.min(2500, setCount() * 300))}골드</button></div>` : ''}</div>
  </div>`;
}

/* 전체 소장 대상 = 지금 목록의 일반 게임 (브랜드 제외 · 실서버는 등급 받은 게임만) */
const setCount = () => R.ORDER.filter(id => !R.isBrand(id)).length;
// ── 시트(상세 · 광고 · 소개) ─────────────────────────
const sheet = $('#sheet'), panel = $('#sheet .panel');
function openSheet(html) { panel.classList.remove('sdpanel'); sheet.classList.toggle('over', !!$('#sd'));   /* 운세 상세 위에서 열면 그 위로 — 닫으면 상세로 돌아감 */
  panel.innerHTML = `<div class="grab"></div>${html}`;
  /* 폰 '뒤로'가 앱을 나가지 않고 이 창만 닫게: 게임 밖에서 처음 열 때 기록 한 칸 (2026-10-29 대표 — 상담 창에서 뒤로 누르면 나가 버림) */
  if (sheet.hidden && !sheetPushed && $('#player').hidden) { if (spare) { spare = false; sheetPushed = true; } else { sheetPushed = true; history.pushState({ sheet: 1 }, ''); } }
  sheet.hidden = false; }
let onSheetClose = null, sheetPushed = false, spare = false;
/* 버튼으로 닫을 때는 history.back() 을 부르지 않음 — 닫자마자 게임 · 상세를 여는 흐름(광고 보고 열기 → play 등)에서
   늦게 도착한 '뒤로'가 막 연 화면을 닫아 버림(0.87.1 버그 · 2026-10-29). 남은 기록 한 칸은 다음 '뒤로' 한 번이 조용히 먹음 */
function closeSheet(fromPop) { sheet.hidden = true; if (sheetPushed) { sheetPushed = false; if (fromPop !== true) spare = true; } const f = onSheetClose; onSheetClose = null; if (f) f(); }
$('#sheet .dim').onclick = closeSheet;

function detail(id) {
  const g = G(id), a = R.access(id), lib = R.state().library[id];
  const own = A.current() && R.state().owned[id], last = C.on(id) && C.lastSaved(id);
  const when = d => d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const where = !A.ON || !lib ? '' : C.on(id)
    ? `<div class="saveat"><span>☁ 저장 위치 · <b>내 계정</b></span><small>${last ? `마지막 저장 ${when(last)}` : '게임을 닫으면 저장돼요'}${C.canUndo(id) ? ` · <button class="lnk" data-cundo="${id}">직전 저장으로 되돌리기</button>` : ''}</small></div>`
    : `<div class="saveat"><span>📱 저장 위치 · <b>이 기기</b></span><small>${progressLine(id)}</small></div>`;
  const actions = a !== 'locked'
    ? `${where}<button class="btn" data-play="${id}">▶ 플레이</button>${A.ON && !own && !R.isBrand(id) ? `<button class="btn gold ghost" data-gbuy="own" data-gid="${id}">🪙 300골드로 소장 · 기록을 계정에 안전하게</button>` : ''}`
    : `<button class="btn alt" data-ad="${id}">📺 광고 보고 ${R.RULES.adUnlock === 'day' ? '오늘 하루' : '한 판'} 플레이</button>
       ${R.isBrand(id) ? '' : `<button class="btn gold" data-gbuy="day" data-gid="${id}">🪙 10골드로 오늘 하루 열기</button>`}
       ${R.isBrand(id) ? '' : `<button class="btn gold ghost" data-gbuy="own" data-gid="${id}">🪙 300골드로 소장 · 언제든 + 기록을 계정에</button>`}
       <div class="note">오늘의 게임이 돌아오는 날엔 무료로 할 수 있어요</div>`;
  T.track('detail_open', { game: id, how: a, from: tab === 'today' ? 'home' : tab });
  openSheet(`<div class="cover" role="img" aria-label="${g.title}" style="background-image:url('${webp(g.cover)}')"></div>
    ${g.logo ? '' : `<h2>${g.title}</h2><div class="en" style="color:var(--sub);font-size:13px;letter-spacing:1.5px">${g.en.toUpperCase()}</div>`}
    <div class="meta" style="margin:10px 0"><span class="chip">🎮 ${g.genre}</span><span class="chip">⏱ ${g.time}</span>${lib ? `<span class="chip">🗓 ${fmtKey(lib.first)} 첫 플레이</span>` : ''}${R.ratingBadge(id)}</div>
    <p style="color:#DDD5FA">${g.desc}</p>
    <div class="stack">${actions}<button class="btn ghost" data-close>닫기</button></div>`);
}

function watchAd(id) {
  let left = R.RULES.adSeconds;
  T.track('ad_view', { game: id, from: 'detail_locked' });
  openSheet(`<div class="ad"><div class="screen">광고 영역 (테스트)</div><div class="count" id="adc">${left}</div><div class="note">실제 서비스에서는 여기에 광고가 나와요</div>
    <div class="stack"><button class="btn" id="adok" disabled>보상 받기</button></div></div>`);
  const iv = setInterval(() => {
    left--; const c = $('#adc'); if (c) c.textContent = left;
    if (left <= 0) { clearInterval(iv); const b = $('#adok'); if (b) { b.disabled = false; b.onclick = () => { T.track('ad_done', { game: id, from: 'detail_locked' }); R.unlockByAd(id); closeSheet(); toast(`${G(id).title} 열림!`); PFROM = 'ad'; play(id); }; } }
  }, 1000);
}

/* 놓친 날 도장 보충: 광고 1회 (골드로는 팔지 않음) */
function stampAd() {
  if (!R.fillable()) return go('today');
  let left = R.RULES.adSeconds; T.track('ad_view', { what: 'stamp', from: 'stamp' });
  openSheet(`<div class="ad"><div class="screen">광고 영역 (테스트)</div><div class="count" id="adc">${left}</div><div class="note">광고를 끝까지 보면 어제 도장이 채워져요</div>
    <div class="stack"><button class="btn" id="adok" disabled>도장 받기</button></div></div>`);
  const iv = setInterval(() => {
    left--; const c = $('#adc'); if (c) c.textContent = left;
    if (left <= 0) { clearInterval(iv); const b = $('#adok'); if (b) { b.disabled = false; b.onclick = () => { R.fillByAd(); T.track('stamp_fill'); closeSheet(); go('today'); toast(`🔥 ${R.state().streak.count}일 연속으로 이어졌어요!`); }; } }
  }, 1000);
}
function intro() {
  openSheet(`<div class="intro"><h2>🌙 One a Day</h2><p style="color:var(--sub);margin:4px 0 6px">하루에 하나, 새로운 게임을 만나요</p>
    <div class="step"><div class="num">1</div><div><b>매일 자정, 새 게임 공개</b><p>모든 플레이어에게 같은 게임이 열려요. 친구와 오늘 기록을 겨뤄 보세요.</p></div></div>
    <div class="step"><div class="num">2</div><div><b>플레이하면 라이브러리에</b><p>한 번 만난 게임은 내 라이브러리에 차곡차곡 모여요.</p></div></div>
    <div class="step"><div class="num">3</div><div><b>또 하고 싶다면</b><p>오늘의 게임이 아닌 날엔 광고를 보거나 소장해서 다시 즐길 수 있어요.</p></div></div>
    <div class="stack"><button class="btn" data-close>시작하기</button></div></div>`);
  R.state().intro = true; R.save();
}

// ── 게임 실행 ──────────────────────────────────────
// 게임 화면(iframe)은 열 때마다 새로 만들고 닫을 때 지움 → 방문 기록이 쌓이지 않고, 소리·메모리도 깨끗이 정리됨
const player = $('#player');
let frame = null, playing = null;
function play(id, synced) {
  if (R.access(id) === 'hidden') return toast('이 게임은 곧 열려요');
  if (!R.canPlay(id)) return detail(id);
  if (!synced && C.alwaysOn(id) && !C.on(id)) { openSheet(`<div class="intro"><h2>☁ 계정 기록 확인 중…</h2></div>`); C.syncAlways(id, 'before').then(() => play(id, true)); return; }
  if (!synced && C.on(id)) {
    const t0 = Date.now();
    openSheet(`<div class="intro"><h2>☁ 계정 기록 확인 중…</h2><p class="fsub">${G(id).title}</p></div>`);
    C.syncAlways(id, 'before').then(() => C.beforePlay(id)).then(r => {
      if (r.act === 'ask') return cloudAsk(id, r);
      if (r.act === 'pull') { openSheet(`<div class="intro"><h2>☁ 계정 기록을 불러왔어요</h2><p class="fsub">다른 기기에서 하던 ${G(id).title} 기록이에요${r.sum ? ` · ${r.sum}` : ''}</p><div class="stack"><button class="btn" data-play-synced="${id}">▶ 이어서 하기</button></div></div>`); return; }
      if (Date.now() - t0 > 2500) { openSheet(`<div class="intro"><h2>준비됐어요</h2><div class="stack"><button class="btn" data-play-synced="${id}">▶ 플레이</button></div></div>`); return; }
      play(id, true);
    });
    return;
  }
  closeSheet(); homeLeave();
  playing = { id, t: Date.now() };
  const now0 = performance.now();
  T.track('game_start', { game: id, how: R.access(id), today: R.gameOn(R.dayIndex()) === id ? 1 : 0, from: synced ? (PFROM ? PFROM : 'synced') : PFROM || 'other', ms: HM.t ? Math.round(now0 - HM.t) : -1, ms0: Math.round(now0), nth: ++HM.nth }); PFROM = '';
  R.recordPlay(id);
  // 게임용 기록 여러 칸을 '누른 순간', 게임 화면(iframe)을 넣기 '전에' 만들어 둠
  //   · 폰 크롬은 터치 없이 만든 기록을 뒤로가기 때 건너뛰어 앱이 꺼짐 → 터치 순간에 미리 쌓고, 하나씩 씀
  //   · iframe 을 먼저 넣으면 게임이 불러와지면서 방금 만든 기록이 사라질 수 있음
  history.pushState({ game: id, g: 1 }, '');
  frame = document.createElement('iframe'); backReady = false;
  frame.id = 'frame'; frame.title = G(id).title; frame.allow = 'autoplay; fullscreen; vibrate';
  frame.src = `${G(id).path}${G(id).path.includes('?') ? '&' : '?'}v=${VERSION}`;
  player.prepend(frame); lockFrame(true);
  // 게임 안 오류도 함께 기록 (같은 주소라 직접 들을 수 있음)
  frame.addEventListener('load', () => { try { const w = frame && frame.contentWindow; if (!w) return; w.addEventListener('error', e => T.trackError('game:' + id, e.error || e.message)); w.addEventListener('unhandledrejection', e => T.trackError('game:' + id, e.reason)); } catch { /* 다른 주소면 건너뜀 */ } });
  player.hidden = false;
  document.body.style.overflow = 'hidden';
  watch();
}
// 게임 창 고정: 앱 속 브라우저(카톡 등)는 주소창이 앱 바깥이라 화면 높이 자체가 바뀜 → 지금까지 본 '가장 작은 높이'를 px 로 고정
//   커질 때는 그대로(게임은 크기 변화를 모름) · 더 작아질 때만 한 번 줄임 · 폭이 바뀌면(화면 회전) 새로 잼
//   PC(마우스 · 앱 속 브라우저 아님)는 주소창이 출렁이지 않으므로 창 높이를 늘 그대로 따름 (줄였다 늘린 창에서 게임이 작게 멈추던 문제)
let lockW = 0, lockH = 0;
function lockFrame(on) {
  document.documentElement.classList.toggle('playing', on); document.body.classList.toggle('playing', on);
  if (!on) { document.documentElement.style.removeProperty('--ph'); lockW = lockH = 0; return; }
  const vv = window.visualViewport, h = Math.round(Math.min(innerHeight, vv ? vv.height : innerHeight));
  if (isPC()) { lockW = innerWidth; lockH = innerHeight; }
  else if (!lockH || Math.abs(innerWidth - lockW) > 40) { lockW = innerWidth; lockH = h; } else lockH = Math.min(lockH, h);
  document.documentElement.style.setProperty('--ph', lockH + 'px');
}
addEventListener('resize', () => { if (!player.hidden) lockFrame(true); });
window.visualViewport && visualViewport.addEventListener('resize', () => { if (!player.hidden) lockFrame(true); });
function closeGame() {
  const was = playing && playing.id;
  if (playing) { T.track('game_end', { game: playing.id, sec: Math.round((Date.now() - playing.t) / 1000) }); playing = null; }
  player.hidden = true; lockFrame(false);
  if (frame) { frame.remove(); frame = null; }
  document.body.style.overflow = '';
  go(tab, 'game');
  // 소장 게임: 닫은 뒤 계정에 올림 · 아니면 (조건 맞을 때) 소장 권유
  if (was && C.alwaysOn(was)) setTimeout(() => C.syncAlways(was, 'after'), 300);
  if (was && C.on(was)) setTimeout(() => C.afterPlay(was).then(r => { if (r.ok) toast('☁ 계정에 저장됐어요'); }), 300);
  else if (was && nudgeOwn(was)) return;
  // 첫 게임을 마치고 돌아오면 홈 화면 추가 권유 (사다리 1차 · 예전 한 번 권유를 이미 본 사람은 1차를 쓴 것으로)
  if (localStorage.getItem('oad_nudged')) { const o = offerState(); if (!(o.done || []).includes('first')) { o.done = [...(o.done || []), 'first']; o.n = (o.n || 0) + 1; offerSave(o); } }
  else setTimeout(() => offerInstall('first'), 500);
}
// 뒤로가기: 먼저 게임에게 물어봄 (팝업 닫기 · 이전 화면 · 일시정지) → 게임이 처리하면 다시 막아 두고, 게임 첫 화면이면 원어데이로
let backWait = null, backReady = false;   // backReady: 게임이 뒤로가기를 직접 처리한다고 알려 옴
// 뒤로가기 받기 두 가지:
//  ① CloseWatcher (안드로이드 크롬 120+ 등): 폰의 뒤로가기를 방문 기록보다 먼저 받음 → 기록을 쓰지 않으니 앱이 꺼질 일이 없음
//  ② 방문 기록 한 칸 (그 밖의 브라우저): 폰 크롬은 터치 없이 만든 기록을 건너뛰므로, 기록은 '터치가 있을 때만' 다시 채움
const DEPTH = 1, gDepth = () => (history.state && history.state.game ? history.state.g || 1 : 0);
let cw = null, needArm = false;
const active = () => !navigator.userActivation || navigator.userActivation.isActive;
function watch() { if (!('CloseWatcher' in window) || player.hidden) return; try { if (cw) cw.destroy(); cw = new CloseWatcher(); cw.onclose = () => { cw = null; askGame(); }; } catch { cw = null; } }
function rearm() { if (player.hidden) return; if (!active()) { needArm = true; return; } needArm = false; if (!cw) watch(); if (gDepth() < DEPTH) history.pushState({ game: true, g: gDepth() + 1 }, ''); }
// 게임을 만지면(터치 활성) 비어 있던 받침을 다시 채움
setInterval(() => { if (!player.hidden && (needArm || !cw && 'CloseWatcher' in window) && navigator.userActivation && navigator.userActivation.isActive) rearm(); }, 250);
// 게임 닫기: 받침 정리 · 남은 게임 기록을 되돌려 원어데이 첫 기록으로
function leaveGame() { const g = gDepth(); if (cw) { const c = cw; cw = null; c.onclose = null; try { c.destroy(); } catch { /* */ } } needArm = false; closeGame(); if (g) history.go(-g); }
function exitGame() { leaveGame(); }
// 뒤로가기 한 번: 확인 창 → 게임에게 묻기(팝업 닫기 · 이전 화면) → 게임 첫 화면이면 원어데이로
function askGame() {
  if (player.hidden) return;
  if (!$('#sheet').hidden) { closeSheet(); watch(); rearm(); return; }
  if (!frame || !frame.contentWindow) return leaveGame();
  clearTimeout(backWait);
  backWait = setTimeout(() => { backWait = null; leaveGame(); }, backReady ? 3000 : 450);   // 응답 없는 게임(옛 버전)은 바로 닫음 · 처리하는 게임은 넉넉히 기다림
  frame.contentWindow.postMessage({ type: 'oad:back' }, '*');
}
addEventListener('popstate', () => { if (!player.hidden) askGame(); });
// 게임 쪽에서 보내는 메시지: { type: 'oad:exit' } → 원어데이로 · { type: 'oad:back-result', handled } → 뒤로가기 처리 결과
addEventListener('message', e => {
  const d = e.data; if (!d || player.hidden) return;
  if (!frame || e.source !== frame.contentWindow || e.origin !== location.origin) return;   // 지금 띄운 우리 게임이 보낸 것만
  if (d.type === 'oad:req' && playing) return gameReq(playing.id, d);
  if (d.type === 'oad:exit') exitGame();
  else if (d.type === 'oad:ready') backReady = !!d.back;
  else if (d.type === 'oad:error' && playing) T.trackError('game:' + playing.id, d.msg);
  else if (d.type === 'oad:track' && playing && typeof d.name === 'string') T.track('g_' + d.name.slice(0, 20), { game: playing.id, ...(d.p && typeof d.p === 'object' ? d.p : {}) });
  else if (d.type === 'oad:back-result' && backWait) { clearTimeout(backWait); backWait = null; if (d.handled) { watch(); rearm(); } else leaveGame(); }
});

// ── 게임 안 BM: 게임(iframe)의 요청 → 확인 · 광고 · 골드 → 결과를 돌려줌 (게임 혼자서는 골드가 빠지지 않음) ──
try { const k = 'oad_exp_day', t = R.keyOf(new Date()); if (localStorage.getItem(k) !== t) { localStorage.setItem(k, t); setTimeout(() => T.track('exp', { bm: BM.group(), help: BM.helpOn() ? 1 : 0, home: LAY }), 1500); } } catch { /* */ }
let payCfg = {}; P.config().then(c => { payCfg = c || {}; if (c && c.ads) for (const k of Object.keys(BM.LIMIT)) if (Number.isFinite(c.ads[k])) BM.LIMIT[k] = c.ads[k]; });
const reply = (id, result) => { try { frame && frame.contentWindow.postMessage({ type: 'oad:res', id, result }, location.origin); } catch { /* */ } };
/* 그날 운세와 같은 씨앗 (오늘의 패 등 — 날짜 · 점쟁이 · 키워드 · 점수의 해시만 · 생년월일 X) · 운세 정보가 없으면 '' (게임은 날짜 씨앗) */
function fortuneSeed() { try { const me = FT && FT.loadMe(); if (!me) return ''; const f = FT.fortune(me, R.now()); let h = 2166136261; for (const c of `${R.keyOf(R.now())}|${f.ch}|${f.key}|${f.total}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); } catch { return ''; } }
async function gameReq(gid, d) {
  const fn = d.fn, a = d.args || [], grp = BM.group(), me = A.current(), owned = !!(me && R.state().owned[gid]);
  const shopOf = () => ((me && me.shop) || payCfg.shop || {})[gid] || {};
  const done = r => reply(d.id, r);
  if (fn === 'hello') {
    const on = grp !== 'A' && A.ON;
    return done({ ok: true, v: 1, group: grp, login: !!me, owned, noAds: owned, gold: me ? (me.gold && me.gold.total) || 0 : null,
      prices: on ? Object.fromEntries(Object.entries(shopOf()).filter(([, v]) => !v.off).map(([k, v]) => [k, v.gold])) : {}, items: me ? (me.items || []).filter(x => x.startsWith('item:' + gid + ':')).map(x => x.split(':')[2]) : [],
      ads: { reward: on && BM.rewardLeft(gid) > 0, rewardLeft: on ? BM.rewardLeft(gid) : 0, inter: grp === 'C' && !owned }, help: BM.helpOn(),
      env: R.FLAGS.env, coupon: R.FLAGS.coupon, fortune: { seed: fortuneSeed() } });   /* coupon: 브랜드 매장 쿠폰 발급 여부 (실서버 끔 — catalog.js BRAND_COUPON_PROD) */
  }
  if (fn === 'rewardedAd') {
    const place = String(a[0] || '').slice(0, 20);
    if (grp === 'A') return done({ ok: false, reason: 'off' });
    if (BM.rewardLeft(gid) <= 0) { T.track('bm_limit', { game: gid, placement: place }); return done({ ok: false, reason: 'limit' }); }
    if (owned) { BM.useReward(gid); T.track('bm_ad', { game: gid, placement: place, via: 'owner' }); toast('소장 혜택 · 광고 없이 받았어요'); return done({ ok: true, via: 'owner' }); }
    T.track('bm_offer', { game: gid, placement: place, what: 'ad' });
    return fakeAd('보상형 광고 (테스트)', true).then(ok => { if (ok) { BM.useReward(gid); T.track('bm_ad', { game: gid, placement: place, via: 'test' }); } done(ok ? { ok: true, via: 'test' } : { ok: false, reason: 'cancel' }); });
  }
  if (fn === 'interstitial') {
    BM.countPlay(gid);
    if (!BM.interOk(gid, owned)) return done({ ok: true, shown: false });
    BM.useInter(gid); T.track('bm_inter', { game: gid, placement: String(a[0] || '').slice(0, 20) });
    return fakeAd('전면 광고 (테스트)', false).then(() => done({ ok: true, shown: true }));
  }
  if (fn === 'spend') {
    const item = String(a[0] || ''), ref = /^[A-Za-z0-9-]{8,64}$/.test(a[1] || '') ? a[1] : Math.random().toString(36).slice(2) + Date.now().toString(36);
    const x = shopOf()[item];
    if (grp === 'A' || !A.ON) return done({ ok: false, reason: 'off' });
    if (!me) { onSheetClose = () => done({ ok: false, reason: 'login' }); needLogin('게임 안에서 골드를 쓰려면 로그인해 주세요 (로그인하면 게임이 처음 화면으로 돌아가요)'); return; }
    if (!x) return done({ ok: false, reason: 'error' });
    const gold = (me.gold && me.gold.total) || 0;
    T.track('bm_offer', { game: gid, item, what: 'gold' });
    onSheetClose = () => done({ ok: false, reason: 'cancel' });
    openSheet(`<div class="intro"><h2>🪙 ${x.name}</h2><div class="payrow"><span>내 골드 ${gnum(gold)}</span><b>🪙 ${gnum(x.gold)}</b></div>
      <div class="stack">${gold >= x.gold ? `<button class="btn" id="bmUse">🪙 ${gnum(x.gold)} 골드 쓰기</button>` : `<button class="btn gold" id="bmShop">골드 충전하기 (${gnum(x.gold - gold)}개 모자라요)</button>`}<button class="btn ghost" id="bmNo">괜찮아요</button></div></div>`);
    $('#bmNo').onclick = () => closeSheet();
    const sb = $('#bmShop'); if (sb) sb.onclick = () => { onSheetClose = () => done({ ok: false, reason: 'short' }); shop(); };
    const ub = $('#bmUse'); if (ub) ub.onclick = async () => {
      ub.disabled = true; ub.textContent = '쓰는 중…';
      try { const r = await A.call({ act: 'use', game: gid, item, ref }); onSheetClose = null; closeSheet(); T.track('bm_use', { game: gid, item, gold: x.gold }); done({ ok: true, ref, gold: r.gold && r.gold.total }); if (x.kind === 'item') A.refresh(); }
      catch (e) { onSheetClose = null; closeSheet(); toast(e.message); done({ ok: false, reason: e.reason || (e.short ? 'short' : 'error') }); }
    };
    return;
  }
  if (fn === 'score') {
    if (!me) return done({ ok: false, reason: 'login' });
    if (!owned) return done({ ok: false, reason: 'owned' });
    try { const r = await A.call({ act: 'score', game: gid, score: a[0], assisted: !!(a[1] && a[1].assisted) }); if (r.ok) T.track('hall_post', { game: gid, rank: r.rank }); return done(r); }
    catch (e) { return done({ ok: false, reason: 'error' }); }
  }
  if (fn === 'board') {
    try { const t = await A.token().catch(() => ''); const r = await fetch('/api/me', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify({ act: 'board', game: gid }) }).then(x => x.json()); return done(r && r.ok ? r : { ok: false, reason: 'error' }); }
    catch { return done({ ok: false, reason: 'error' }); }
  }
  done({ ok: false, reason: 'unknown' });
}
// 테스트 광고 (진짜 광고망은 승인 후): 보상형은 5초 뒤 '보상 받기', 전면은 5초 뒤 '닫기'
function fakeAd(label, reward) {
  return new Promise(res => {
    let left = R.RULES.adSeconds, fin = false; const end = ok => { if (fin) return; fin = true; clearInterval(iv); onSheetClose = null; closeSheet(); res(ok); };
    openSheet(`<div class="ad"><div class="screen">${label}</div><div class="count" id="adc">${left}</div><div class="note">실제 서비스에서는 여기에 광고가 나와요</div>
      <div class="stack"><button class="btn" id="adok" disabled>${reward ? '보상 받기' : '닫기'}</button>${reward ? '<button class="btn ghost" id="adno">그만 보기 (보상 없음)</button>' : ''}</div></div>`);
    onSheetClose = () => { if (!fin) { fin = true; clearInterval(iv); res(!reward); } };
    const iv = setInterval(() => { left--; const c = $('#adc'); if (c) c.textContent = Math.max(0, left); if (left <= 0) { clearInterval(iv); const b = $('#adok'); if (b) { b.disabled = false; b.onclick = () => end(true); } } }, 1000);
    const no = $('#adno'); if (no) no.onclick = () => end(false);
  });
}

// ── 공통 클릭 처리 ─────────────────────────────────
document.addEventListener('click', e => {
  const t = e.target.closest('[data-tarot],[data-type],[data-tyshare],[data-chat],[data-mypaid],[data-mybuy],[data-restore-code],[data-delacct-open],[data-delacct],[data-fpack],[data-freebie],[data-fbclaim],[data-recap],[data-fcal],[data-fday],[data-stampfill],[data-share],[data-paid-edit],[data-rest],[data-helpg],[data-bmg],[data-play-synced],[data-cpick],[data-nudge-off],[data-cundo],[data-shop],[data-pack],[data-ghist],[data-gbuy],[data-strict],[data-gfort],[data-login],[data-logout],[data-track-off],[data-sd-close],[data-paid],[data-buy],[data-fortune],[data-fortune-edit],[data-fortune-del],[data-play],[data-open],[data-ad],[data-close],[data-exit],[data-intro],[data-day],[data-reset],[data-tab-go],[data-install],[data-ext],[data-copy],[data-hide-install],[data-idiag],[data-igift],[data-wk],[data-homeg],[data-lab]');
  if (!t) return;
  const d = t.dataset;
  /* 메인 기록: 어느 칸에서 무엇을 눌렀나 + 게임 · 운세로 넘어갈 때 붙일 from */
  const bk = t.closest('[data-blk]'), home = !!(bk && HM.live && view.contains(bk));
  if (home) T.track('blk_click', { blk: bk.dataset.blk, what: whatOf(t), pos: +bk.dataset.pos || 0, lay: LAY });
  if (d.play) PFROM = d.from || (sdOpen ? 'fort_lucky' : !sheet.hidden ? 'detail' : home ? 'home_' + bk.dataset.blk : tab === 'today' ? 'home' : tab);
  if ('fortune' in d || d.paid) FFROM = home ? (HM.via === 'game' ? 'after_game' : d.paid ? 'home_hook' : 'home_card') : sdOpen ? 'detail' : !sheet.hidden ? 'sheet' : tab === 'today' ? 'home' : tab;
  const iwhere = d.where || (home ? (bk.dataset.blk === 'install' ? 'banner' : bk.dataset.blk) : !sheet.hidden ? 'sheet' : tab);
  if ('install' in d || 'ext' in d || 'hideInstall' in d) T.track('install_click', { where: iwhere, how: I.how(), what: 'install' in d ? 'install' : 'ext' in d ? 'ext' : 'hide' });
  if (d.mypaid) { closeSheet(); paidPage(d.mypaid); }
  else if ('mybuy' in d) myBuys();
  else if ('restoreCode' in d) restoreForm();
  else if ('delacctOpen' in d) deleteAccount();
  else if ('delacct' in d) deleteAccountGo(t);
  else if ('fpack' in d) fortunePack();
  else if ('freebie' in d) freebieOpen();
  else if (d.fbclaim) freebieClaim(d.fbclaim, t);
  else if ('tarot' in d) ex().then(E => E.tarot.open(XC())).catch(er => { console.error(er); toast('잠시 뒤 다시 해 주세요'); });
  else if ('type' in d) ex().then(E => E.types.open(XC())).catch(er => { console.error(er); toast('잠시 뒤 다시 해 주세요'); });
  else if (d.tyshare) ex().then(E => E.types.share(XC(), d.tyshare)).catch(er => { console.error(er); toast('잠시 뒤 다시 해 주세요'); });
  else if ('chat' in d) ex().then(E => E.chat.open(XC())).catch(er => { console.error(er); toast('잠시 뒤 다시 해 주세요'); });
  else if (d.recap) recapAnswer(d.recap);
  else if ('fcal' in d) fortuneCalendar(d.fcal || '');
  else if (d.fday) { FFROM = 'cal'; closeSheet(); fortuneDetail(d.fday); }
  else if ('stampfill' in d) stampAd();
  else if (d.share) shareCompat(d.share);
  else if (d.paidEdit) partnerForm(d.paidEdit);
  else if (d.helpg) { BM.setHelp(d.helpg); T.track('exp', { bm: BM.group(), help: BM.helpOn() ? 1 : 0, home: LAY }); go('settings'); toast(`응원 선물 ${d.helpg === 'on' ? '켜짐' : '꺼짐'}`); }
  else if (d.bmg) { BM.setGroup(d.bmg); T.track('exp', { bm: BM.group(), help: BM.helpOn() ? 1 : 0, home: LAY }); go('settings'); toast(`BM 그룹 ${d.bmg}`); }
  else if (d.playSynced) play(d.playSynced, true);
  else if (d.cpick) cloudPick(d.gid, d.cpick, t);
  else if ('nudgeOff' in d) { try { const n = JSON.parse(localStorage.getItem('oad_ownnudge') || '{}'); n.off = 1; localStorage.setItem('oad_ownnudge', JSON.stringify(n)); } catch { /* */ } closeSheet(); toast('다시 보지 않을게요'); }
  else if (d.cundo) { if (!t.dataset.confirm) { t.dataset.confirm = 1; t.textContent = '한 번 더 누르면 되돌려요'; } else C.undo(d.cundo).then(() => { closeSheet(); toast('☁ 직전 저장으로 되돌렸어요'); }).catch(er => toast(er.message)); }
  else if ('shop' in d) shop();
  else if (d.pack) buyPack(d.pack);
  else if ('ghist' in d) goldHistory();
  else if (d.gbuy) spendGold(d.gbuy, d.gid, t);
  else if ('gfort' in d) fortuneGold(t);
  else if ('lab' in d) { if (!R.PROD && /^\/lab\/[a-z0-9-]+\/$/.test(d.lab)) location.href = d.lab; }
  else if ('strict' in d) { try { localStorage.setItem('oad_strict', R.RULES.openAll ? '1' : '0'); } catch { /* */ } location.reload(); }
  else if ('login' in d) { T.track('login_click'); if (I.env.inApp) needLogin(); else A.login().catch(er => toast(er.message)); }
  else if ('logout' in d) { A.logout().then(() => { go('settings'); toast('로그아웃했어요'); }); }
  else if ('trackOff' in d) { T.setOptOut(!T.optedOut()); go('settings'); toast(T.optedOut() ? '이용 기록을 보내지 않아요' : '이용 기록 보내기를 다시 켰어요'); }
  else if ('sdClose' in d) { if (sdOpen) history.back(); else sdClose(); }
  else if (d.paid) { T.track('paid_click', { product: d.paid, from: FFROM || 'other' }); partnerForm(d.paid); }
  else if ('buy' in d) { T.track('buy_click', { product: d.buy }); buy(d.buy); }
  else if ('fortune' in d) fortuneDetail();
  else if ('fortuneEdit' in d) fortuneForm();
  else if ('fortuneDel' in d) { localStorage.removeItem('oad_fortune_me'); closeSheet(); go('today'); toast('사주 정보를 지웠어요'); }
  else if (d.play) { if (sdOpen) sdClose(); play(d.play); }
  else if (d.open) detail(d.open);
  else if (d.ad) watchAd(d.ad);
  else if ('close' in d) closeSheet();
  else if ('exit' in d) { closeSheet(); if (!player.hidden) exitGame(); else history.back(); }
  else if ('intro' in d) intro();
  else if ('install' in d) { closeSheet(); doInstall(iwhere); }
  else if ('idiag' in d) I.ui().then(UI => UI.openDiag()).catch(() => toast('잠시 뒤 다시 해 주세요'));
  else if ('igift' in d) showInstalled();
  else if ('ext' in d) extOpen();
  else if ('copy' in d) I.copyLink().then(ok => toast(ok ? '주소를 복사했어요. 브라우저에 붙여 넣어 주세요' : '주소: ' + location.href));
  else if ('hideInstall' in d) { localStorage.setItem('oad_hide_install', todayKey()); go(tab); }
  else if (d.tabGo) go(d.tabGo, 'tab');
  else if (d.wk) { const g = G(d.wk), off = Number(d.off) || 0; toast(off === 1 ? `내일 0시 공개 · ${TEASE[d.wk] || g.genre}` : `${off}일 뒤 공개 · ${g.genre} · 두근두근`); }
  else if (d.homeg && !R.PROD) { BM.setHome(d.homeg); LAY = BM.homeGroup(); T.track('exp', { bm: BM.group(), help: BM.helpOn() ? 1 : 0, home: LAY }); go('settings'); toast(`메인 화면 ${LAY === 'b' ? '새(B) 이번 주 달력' : '예전(A)'}`); }
  else if (d.day !== undefined && !R.PROD) { const s = R.state(); s.dayOffset = d.day === '0' ? 0 : s.dayOffset + Number(d.day); R.save(); go('settings'); toast(`${fmtDate(R.now())}로 이동`); }
  else if ('reset' in d) { if (t.dataset.confirm) { R.resetAll(); go('today'); toast('초기화했어요'); } else { t.dataset.confirm = 1; t.textContent = '한 번 더'; } }
});

// ── 키보드 (PC) ───────────────────────────────────
//   Esc: 열린 시트 → 운세 전체 화면(#sd) 순서로 닫음 · 게임 중에는 건드리지 않음(CloseWatcher · askGame 흐름 그대로)
//   Enter · Space: role="button" 인 div(게임 카드 · 타일 · 운세 카드)를 누름
document.addEventListener('keydown', e => {
  if (e.defaultPrevented || e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'Escape') {
    if (!player.hidden) return;
    if (!sheet.hidden) { e.preventDefault(); closeSheet(); return; }
    if ($('#sd')) { e.preventDefault(); if (sdOpen) history.back(); else sdClose(); }
    return;
  }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role="button"]:not(button)')) { e.preventDefault(); e.target.click(); }
});

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});

// 새 버전 확인: 앱을 열거나 다시 볼 때마다 서버의 version.json 을 확인 → 바뀌었으면 (게임 중이 아닐 때) 새로고침
async function checkUpdate() {
  try {
    const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    const { version } = await r.json();
    // 같은 버전으로는 한 번만 새로고침 (캐시 때문에 옛 파일이 오더라도 무한 새로고침 방지)
    if (version && version !== VERSION && player.hidden && sessionStorage.getItem('oad_reloaded') !== version) {
      sessionStorage.setItem('oad_reloaded', version);
      toast('새 버전으로 바꾸는 중…'); setTimeout(() => location.reload(), 600);
    }
  } catch { /* 오프라인 */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdate(); else if (playing && C.on(playing.id)) C.push(playing.id, { keepalive: true }); });
setTimeout(checkUpdate, 1500);
document.addEventListener('oad:installable', () => { if (tab === 'today' || tab === 'settings') go(tab); });
document.addEventListener('oad:installed', () => { T.track('installed', { via: Date.now() - promptedAt < 6e4 ? 'prompt' : 'menu' }); toast('홈 화면에 추가됐어요! 아이콘으로 열면 골드 50'); go(tab); });
T.start(VERSION, { br: I.env.br, osv: I.env.osv });
// 계정: 로그인돼 있으면 불러오기 · 구글에서 막 돌아왔으면 환영
A.onChange(m => { if (m) R.syncItems(m.items); go(tab); });
A.init().then(m => { if (I.standalone() && localStorage.getItem(GIFT) === 'pending') setTimeout(showInstalled, new URLSearchParams(location.search).has('login') ? 1200 : 300); if (new URLSearchParams(location.search).has('login')) { history.replaceState(null, '', location.pathname); if (m) { T.track('login', { new: m.isNew ? 1 : 0 }); toast(m.isNew ? `${m.name || ''}님, 원어데이에 오신 걸 환영해요!` : `${m.name || ''}님, 다시 오셨네요`); go('settings'); } } });
// 토스 결제창에서 돌아온 경우
/* 신년 패키지 영수증 여러 장 → 상품별 '두 사람'(solo 는 나 · 달 상품은 그 달 · 궁합은 상대)으로 보관 */
const keepMany = rcs => { const m = FT, me = m && m.loadMe(); if (!me) return; for (const r of rcs) { const pt = m.pairOf(r.product, me); if (pt) P.keepReceipt(r, m.toInput(me), m.toInput(pt)); } };
P.setPackKeeper(keepMany);
/* 테스트 서버 시험용: /?ai=1 이면 이 기기를 AI 상담 실험군으로 (?ai=0 해제) — 실서버는 상담 자체가 꺼져 있음 */
{ const a = new URLSearchParams(location.search).get('ai'); if (a === '1' || a === '0') { try { a === '1' ? localStorage.setItem('oad_ai', '1') : localStorage.removeItem('oad_ai'); } catch { /* */ } history.replaceState(null, '', location.pathname); toast(a === '1' ? 'AI 상담 시험 모드를 켰어요' : 'AI 상담 시험 모드를 껐어요'); } }
/* 사주 유형 공유 링크로 들어온 사람: /?type=<유형> */
{ const tp = new URLSearchParams(location.search).get('type'); if (tp) { history.replaceState(null, '', location.pathname); ex().then(E => setTimeout(() => E.types.landing(XC(), tp), 600)); } }
ft().then(() => P.resume()).then(r => { if (!r) return; if (r.ok && r.gold) { A.refresh().then(() => goldDone('골드')); return; } if (r.ok) payDone(r.product, r); else toast(r.msg); });
if (R.PROD) A.remote().then(c => BM.keepHomeRemote(c && c.home));   /* 실서버 메인 원격 스위치: 받아 두고 다음에 열 때부터 (ops.md 4-4) */
go('today', 'open');
if (!R.state().intro) setTimeout(intro, 400);
window.__oad = { R, go, play };
