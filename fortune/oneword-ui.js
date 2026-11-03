// 「AI 가 본 나, 한 단어」 v2 화면 (2026-11-03 대표 확정 · 승인 시안 lab/oneword-mock/v2 · 기획 team/dev/tasks/261103-oneword-fun/v2-plan.md)
//   운세 탭 진입 카드(오늘의 주제 · 나이대 맞춤 · 도감) → (생년 없으면 나이대 고르기) → 질문 5개(밸런스 · 이모지 · 슬라이더 · 상황극 · 둘 중 하나)
//   → 카드 뒤집기 → 결과(9:16 카드 · 그림 저장 · 친구랑 비교하기 · 도감 · 오늘의 다른 주제 하나 더 · 재하 인사) · 친구 비교 · 도감
//   하루 1번 무료 · 같은 날 같은 답 = 같은 결과 · '자연' 주제 날은 v1 꽃 · 색 · 날씨 카드 그대로
//   이 기기에 두는 것: oad_oneword(그날 기록 · 답 번호 · 결과 id · 풀이) · oad_ow_age(고른 나이대) · oad_ow_dex(도감) · oad_ow_type(내 유형, 선택)
//   서버로 보내는 것: 기기 번호 · 날짜 · 나이대 코드 · 답 번호 (생년 · 이름 · 유형 X) — 서버(/api/oneword)는 테스트 전용 · 안 되면 규칙(oneword-v2.js pickRule)
import * as OW from './oneword.js';
import * as V from './oneword-v2.js';

const KEY = 'oad_oneword', AKEY = 'oad_ow_age', DKEY = 'oad_ow_dex', TKEY = 'oad_ow_type';
const PRICE = 30;   /* 서버 gold.js SHOP.oneword.theme2 와 같은 값 (표시용 · 실제 차감은 서버 값) */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } };
const sget = k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const sset = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* */ } };
const load = () => jget(KEY, null), save = v => jset(KEY, v);
const did = () => sget('oad_did');
let C = null, S = null;   /* C = 앱이 넘겨 준 도구(XC) · S = 지금 흐름 { day, age, qa, th, qs, a, res, scr, ph, pair, st } */

/* ── 오늘 · 나이대 · 내 유형 ── */
const dayOf = c => c.R.keyOf(c.R.now());
export const eligible = c => !c.R.PROD;   /* 서버가 테스트 전용 → 지금은 테스트에서만 보임 (실서버는 대표 지시 때) */
/* 운세에 넣은 생년(기기에만) → 나이대 · 없으면 고른 나이대 · 그것도 없으면 '' (고르기 화면) */
function birthAge(c) { const me = jget('oad_fortune_me', null); return me && me.y ? V.ageOf(me.y, c.R.now()) : ''; }
export const myAge = c => birthAge(c) || (V.okAge(sget(AKEY)) ? sget(AKEY) : '');
export const myType = () => (V.okType(sget(TKEY)) ? sget(TKEY) : '');
export const setType = t => sset(TKEY, V.okType(t) ? t : '');
/* 그날 기록 (v1 꽃 기록은 자연 주제 카드로 읽음 — 2026-11-02 기록 호환) */
function todayRec(c) {
  const v = load(), day = dayOf(c);
  if (!v || v.day !== day || !v.res) return null;
  if (v.v === 2) return v;
  /* v1 꽃 카드(2026-11-02 형식): 자연 카드로 읽고, v1 답(v1a)을 남겨 다른 주제도 받을 수 있게 · v1 에서 산 단어가 있으면 오늘 1회 무료(지난 구매 혜택) */
  if (v.res.f) return { v: 2, v1: 1, day, age: 'all', qa: 'all', th: 'nature', a: [], v1a: Array.isArray(v.a) ? v.a : [], res: { th: 'nature', f: v.res.f, c: v.res.c, w: v.res.w, line: v.res.line, by: v.res.by }, credit: v.bought && Object.keys(v.bought).length ? 1 : 0 };
  return null;
}
/* 도감 { id: 처음 받은 날 } · 연속 */
const dex = () => jget(DKEY, {});
function dexAdd(res, day) { const d = dex(), ids = res.th === 'nature' ? [res.f] : [res.r]; let fresh = false; for (const id of ids) if (id && !d[id]) { d[id] = day; fresh = true; } jset(DKEY, d); return fresh; }
const dexTotal = () => V.BASE.concat(['type']).reduce((s, t) => s + V.dexList(t).length, 0);
function streak(c) { const days = new Set(Object.values(dex())), rec = todayRec(c); if (rec) days.add(rec.day); let n = 0, d = dayOf(c); if (!days.has(d)) d = V.dayAdd(d, -1); while (days.has(d)) { n++; d = V.dayAdd(d, -1); } return n; }
const rareCount = () => Object.keys(dex()).filter(id => { const x = V.resultById(id); return x && x.rare; }).length;
const tintsOpen = () => Math.min(V.TINTS.length, 1 + Math.floor(Object.keys(dex()).length / 5));   /* 도감 5칸마다 카드 색 하나 무료 */

/* ── 큰 글자 맞추기 ── */
/* v1 꽃 카드: 한 줄 폭에 맞춰 줄임 (2026-11-02 대표 제보 '메밀꽃' 잘림) */
export function fitWords(root = document) {
  root.querySelectorAll('.owcard .word').forEach(el => {
    const W = el.closest('.owcard').clientWidth; if (!W) return;
    const base = W * .38, max = W * .88; let fs = base;
    const set = () => { el.style.fontSize = fs + 'px'; el.style.letterSpacing = (-fs * .063) + 'px'; };
    set(); let n = 0;
    while (el.scrollWidth > max + .5 && n++ < 40) { fs *= .95; set(); }
    el.style.top = (W * .44 + (base - fs) * .45) + 'px';
  });
}
/* v2 카드: 이름을 두 줄 안으로 (실제 줄 높이를 재서) */
export function fitNames(root = document) {
  root.querySelectorAll('.owcard.v2 .name').forEach(el => {
    el.style.fontSize = ''; let fs = parseFloat(getComputedStyle(el).fontSize), n = 0;
    while (el.offsetHeight > fs * 1.18 * 2 + 2 && n++ < 30) { fs *= .94; el.style.fontSize = fs + 'px'; }
  });
}
const fitAll = el => { fitWords(el); fitNames(el); };

/* ── 그림 조각 ── */
const hex2 = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };
const mix = (a, b, t) => { const p = hex2(a), q = hex2(b); return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const light = h => { const [r, g, b] = hex2(h); return (r * .3 + g * .59 + b * .11) / 255; };
let uid = 0;
/* 겹꽃잎 다섯 겹 (그림 파일 없이) — 꽃 색에 맞춰 칠함 */
export function flowerSvg(hex, size = 200) {
  const id = 'owf' + (++uid), b = light(hex) > .86 ? mix(hex, '#B8A48C', .45) : hex, a = mix(hex, '#FFFFFF', .55), c = '#F4CF7A';
  const petal = r => `M0,0 C${r * .5},${-r * .12} ${r * .62},${-r * .86} ${r * .1},${-r} Q0,${-r * .9} ${-r * .1},${-r} C${-r * .62},${-r * .86} ${-r * .5},${-r * .12} 0,0Z`;
  const L = [[9, 96, 0], [8, 80, 20], [7, 63, 8], [6, 46, 30], [5, 30, 12]];
  let g = '', dots = '';
  L.forEach(([n, r, off], li) => { for (let i = 0; i < n; i++) g += `<path d="${petal(r)}" transform="rotate(${off + i * 360 / n + (li % 2 ? 9 : 0)})" fill="url(#${id}p${li})" stroke="${b}" stroke-width=".7" stroke-opacity=".45"/>`; });
  for (let i = 0; i < 14; i++) { const t = i * 2.4, rr = 4 + (i % 4) * 3.2; dots += `<circle cx="${(Math.cos(t) * rr).toFixed(1)}" cy="${(Math.sin(t) * rr).toFixed(1)}" r="1.8" fill="${c}"/>`; }
  const gr = L.map((_, li) => `<radialGradient id="${id}p${li}" cx="0" cy="0" r="${110 - li * 14}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${b}"/><stop offset=".5" stop-color="${a}"/><stop offset=".85" stop-color="${li < 2 ? mix(a, '#FFFFFF', .5) : a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-110 -110 220 220" width="${size}" height="${size}" aria-hidden="true"><defs>${gr}</defs><g>${g}</g><g>${dots}</g></svg>`;
}
const IC = {
  x: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  back: '<path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>',
  arrow: '<path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" stroke="currentColor" stroke-width="1.7" fill="none"/>',
};
const ic = k => `<svg class="owi" viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg>`;
const NOTE = '재미로 보는 카드예요 · 생년월일은 이 기기에만, 서버엔 나이대만 보내요';
const dateDot = d => d.replace(/-/g, '.');
const thChip = th => `${V.THEMES[th].e} 오늘의 주제 · ${V.THEMES[th].ko}`;
const ageChip = age => age === 'all' ? '공통 질문' : `${V.AGE_KO[age]} 맞춤`;

/* ── 결과 → 카드 정보 ── */
function info(rec, res = rec.res) {
  if (res.th === 'nature') {
    const f = OW.FLOWERS.find(x => x.id === res.f), co = OW.COLORS.find(x => x.id === res.c), w = OW.WEATHERS.find(x => x.id === res.w);
    return f && co && w ? { nature: true, flower: f, color: co, weather: w, name: f.w, e: '🌸', col: co.hex, line: res.line, th: 'nature', id: f.id } : null;
  }
  const x = V.resultById(res.r); if (!x) return null;
  return { x, name: x.n, e: x.e, line: res.line || x.l, th: res.th, id: x.id, rare: !!res.rare, col: rec.tint || V.THEMES[res.th].c };
}
/* ── 9:16 카드 (DOM · cqw) ── */
function natureCard(rec, I) {
  return `<div class="owcard" style="--c:${I.col}"><div class="cin"><div class="mesh"></div><div class="grain"></div>
    <div class="ghost">${flowerSvg(I.flower.hex, 300)}</div>
    <div class="ctop"><span>HOW AI SEES ME — TODAY</span><span>${dateDot(rec.day)}</span></div>
    <div class="bub q">나는 오늘 무슨 꽃이야?</div><div class="bub a">${esc(I.flower.w)}.</div>
    <div class="word">${esc(I.flower.w)}</div>
    <div class="rows">
      <div><span>FLOWER</span><b>${esc(I.flower.w)}<small>${esc(I.flower.m)}</small></b></div>
      <div><span>COLOR</span><b>${esc(I.color.w)}<i class="sw" style="background:${I.color.hex}"></i></b></div>
      <div><span>WEATHER</span><b>${esc(I.weather.w)}</b></div>
    </div>
    <p class="line">${esc(I.line)}</p>
    <div class="cfoot"><span class="lg">One a Day</span><span>oneaday.kr — 너도 물어봐</span></div></div></div>`;
}
function card(rec, res = rec.res, opt = {}) {
  const I = info(rec, res); if (!I) return '';
  if (I.nature) return natureCard(rec, I);
  const age = rec.age || 'all', ctx = res.via ? (rec.v1 ? '오늘 꽃 카드 답으로 받은 다른 주제 카드' : '오늘 답으로 받은 다른 주제 카드') : V.context({ ...rec, r: I.id, rare: I.rare }), st = V.statLine({ ...rec, rare: I.rare, stat: res.stat }), ty = opt.type ?? myType();
  return `<div class="owcard v2${I.rare ? ' rare' : ''}${opt.mini ? ' mini' : ''}" style="--c:${I.col}"><div class="cin"><div class="mesh"></div><div class="grain"></div>
    <div class="ctop"><span>HOW AI SEES ME — TODAY</span><span>${dateDot(rec.day)}</span></div>
    <div class="theme">${res.via ? `${V.THEMES[I.th].e} 다른 주제 · ${V.THEMES[I.th].ko}` : thChip(I.th)}</div>
    ${I.rare ? '<div class="rarebadge">✦ 희귀 1%</div>' : ''}${ty ? `<div class="tychip${I.rare ? ' low' : ''}">${ty}</div>` : ''}
    <div class="emo"><span>${I.e}</span></div>
    <div class="pre">오늘의 당신은</div>
    <div class="name">${esc(I.name)}</div>
    <p class="line">${esc(I.line)}</p>
    <div class="ctx"><b>${V.AGE_KO[age] === '모두' ? '공통' : V.AGE_KO[age]}</b><span>${esc(ctx)}</span></div>
    <div class="stat">${esc(st)}</div>
    <div class="cfoot"><span class="lg">One a Day</span><span>oneaday.kr — 너도 물어봐</span></div></div></div>`;
}
const backCard = (rec, th) => `<div class="owcard v2 back" style="--c:${V.THEMES[th].c}"><div class="cin"><div class="mesh"></div><div class="grain"></div>
  <div class="ctop"><span>HOW AI SEES ME</span><span>${dateDot(rec.day)}</span></div><div class="theme">${thChip(th)}</div>
  <div class="bub q">오늘의 나는 어떤 장면이야?</div><div class="bub a typing"><i></i><i></i><i></i></div><div class="bbig">?</div></div></div>`;

/* ── 운세 탭 진입 카드 (탭 톤: 먹 · 금 테) ── */
export function entry(c, f) {
  if (!eligible(c)) return '';
  const day = dayOf(c), th = V.dayTheme(day), rec = todayRec(c), I = rec && info(rec), age = myAge(c);
  const dl = `<div class="owdexl"><span>📒 내 도감 ${Object.keys(dex()).length} / ${dexTotal()}</span><span>✦ 희귀 ${rareCount()}</span><span>🔥 ${streak(c)}일째</span></div>`;
  if (I) return `<div class="owentry done" data-ow-open tabindex="0" role="button"><div class="owel"><span>HOW AI SEES ME · 오늘의 한 단어</span><span class="ok">받음</span></div>
    <div class="owmini"><div class="owsw" style="background:${I.col}">${I.nature ? flowerSvg(I.flower.hex, 64) : `<span class="owemo">${I.e}</span>`}</div><div><b>오늘의 당신은 ${esc(I.name)}</b><small>${thChip(I.th)}${I.rare ? ' · ✦ 희귀' : ''}</small><p>${esc(I.line)}</p></div></div>
    <div class="owgo">카드 다시 보기 · 친구랑 비교 ${ic('arrow')}</div>${dl}</div>`;
  return `<div class="owentry" data-ow-open tabindex="0" role="button"><div class="owel"><span>HOW AI SEES ME</span><span class="nb">NEW · 하루 1번 무료</span></div>
    <div class="owtoday"><span class="big">${V.THEMES[th].e}</span><div><small>오늘의 주제</small><b>${V.THEMES[th].ko}</b></div>${age ? `<span class="owage">${ageChip(age)}</span>` : ''}</div>
    <h3>오늘의 나는<br>${th === 'nature' ? '무슨 꽃 · 무슨 색 · 무슨 날씨?' : '어떤 장면일까?'}</h3>
    <p>질문 다섯 개 · 30초 · 오늘은 모두 같은 질문이라 친구랑 비교돼요</p>
    <div class="owgo btn">한 단어 받기 ${ic('arrow')}</div>${dl}</div>`;
}

/* ── 겹 화면 ── */
function host() {
  let el = document.getElementById('ow');
  if (!el) { el = document.createElement('div'); el.id = 'ow'; document.body.append(el); el.addEventListener('click', onClick); el.addEventListener('input', onInput); }
  document.body.style.overflow = 'hidden';
  return el;
}
export function close() { const el = document.getElementById('ow'); if (el) el.remove(); document.body.style.overflow = ''; S = null; if (C && C.onClose) C.onClose(); }
/* how: 'tab' · 'land' · 'pair'(친구 비교 링크) · pair = { r, a, g, m, q } */
export function open(c, how = 'tab', pair = null) {
  C = c; const day = dayOf(c), rec = todayRec(c);
  if (rec) { S = { ...rec, scr: pair ? 'cmp' : 'result', pair }; if (rec.v1) dexAdd(rec.res, rec.day); draw(); return; }
  const age = myAge(c);
  S = { day, age: age || 'all', qa: pair && V.okAge(pair.q) ? pair.q : age || 'all', th: V.dayTheme(day), a: [], scr: age ? 'q1' : 'age', pair, how };
  S.qs = V.dayQuestions(day, S.qa);
  c.T.track('oneword_start', { from: how, th: S.th });
  if (age) { c.T.track('oneword_age', { src: birthAge(c) ? 'fortune' : 'pick', age }); stats(); }
  draw();
}
function stats() {   /* 밸런스 '오늘 같은 쪽 n%' (표본 50 이상일 때만 보임) */
  fetch(`/api/oneword?st=1&day=${S.day}&qa=${S.qa}`).then(r => r.ok ? r.json() : null).then(j => { if (S && j && j.n >= V.STAT_MIN) S.st = j; }).catch(() => {});
}
function draw() {
  const el = host(), s = S.scr;
  el.className = 'ow';
  el.innerHTML = s === 'age' ? agePick() : s[0] === 'q' ? question(+s.slice(1)) : s === 'reveal' ? reveal() : s === 'nr' ? neorang() : s === 'dex' ? dexScr() : s === 'cmp' ? compare() : result();
  fitAll(el); if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitAll(el));
  if (s === 'reveal') afterReveal();
}
const qtop = (n, back) => `<div class="qhdr"><button class="ib" data-ow="${back}" aria-label="${back === 'close' ? '닫기' : '뒤로'}">${ic(back === 'close' ? 'x' : 'back')}</button><div class="prog"><i style="width:${n * 20}%"></i></div><span class="qn">${n} / 5</span></div>`;
function agePick() {
  return `<div class="owq">${qtop(0, 'close')}<div class="qbody"><div class="who">ONE A DAY · AI</div><div class="bub ai">몇 살 즈음의 이야기로 물어볼까요?<small>운세를 안 봤다면 한 번만 골라요 · 고르지 않으면 공통 질문</small></div></div>
    <div class="agegrid">${V.AGES.map(k => `<button class="opt" data-age="${k}">${V.AGE_KO[k]}</button>`).join('')}</div>
    <button class="skip" data-age="all">공통 질문으로 할게요</button><div class="qfoot">${NOTE}</div></div>`;
}
function question(n) {
  const q = S.qs[n - 1], sel = S.a[n - 1], th = S.th;
  const prev = n > 1 ? S.qs[n - 2] : null, pa = S.a[n - 2];
  const hist = prev ? `<div class="hist"><div class="bub ai sm">${esc(prev.q)}</div><div class="bub me sm">${esc(prev.k === 'slider' ? `${pa * 25}% · ${pa < 2 ? prev.o[0].t : pa > 2 ? prev.o[1].t : '반반'}` : prev.o[pa].t)}</div></div>` : '';
  let body = '';
  if (q.k === 'bal') {
    const st = S.st && S.st.o[n - 1], tot = st ? st[0] + st[1] : 0, pct = i => tot ? Math.round(st[i] / tot * 100) : 0, shown = sel != null && tot >= V.STAT_MIN;
    body = `<div class="bal">${q.o.map((o, i) => `<button class="bt${sel === i ? ' on' : ''}" data-ans="${n}:${i}"><span class="be">${o.e}</span><b>${esc(o.t)}</b>${shown ? `<i style="--p:${pct(i)}%"></i><em>${pct(i)}%</em>` : ''}</button>`).join('<span class="vs">VS</span>')}</div>
      ${shown ? `<p class="ratio">지금까지 오늘 답한 ${S.qa === 'all' ? '사람' : V.AGE_KO[S.qa]} 중 <b>${pct(sel)}%</b>가 너와 같은 쪽</p>` : '<p class="ratio dim">둘 중 하나만 · 고르면 바로 다음으로</p>'}`;
  } else if (q.k === 'emoji') {
    body = `<div class="emog">${q.o.map((o, i) => `<button class="${sel === i ? 'on' : ''}" data-ans="${n}:${i}" aria-label="${esc(o.t)}"><span>${o.e}</span><small>${esc(o.t)}</small></button>`).join('')}</div>`;
  } else if (q.k === 'slider') {
    const v = sel ?? 2;
    body = `<div class="slider"><div class="sv" id="owsv">${v * 25}<small>%</small></div><div class="trk"><i style="width:${v * 25}%"></i>${[0, 25, 50, 75, 100].map(p => `<s style="left:${p}%"></s>`).join('')}<input type="range" min="0" max="4" step="1" value="${v}" data-slide="${n}" aria-label="${esc(q.q)}"></div>
      <div class="sl"><span>${q.o[0].e ? q.o[0].e + ' ' : ''}${esc(q.o[0].t)}</span><span>${esc(q.o[1].t)}${q.o[1].e ? ' ' + q.o[1].e : ''}</span></div><button class="next" data-ans="${n}:s">다음</button></div>`;
  } else {
    body = `<div class="opts">${q.o.map((o, i) => `<button class="opt${sel === i ? ' on' : ''}" data-ans="${n}:${i}">${o.e ? `<span class="oe">${o.e}</span>` : `<i class="ix">${'abcd'[i]}.</i>`}<span>${esc(o.t)}</span></button>`).join('')}</div>`;
  }
  return `<div class="owq">${qtop(n, n === 1 ? 'close' : 'q' + (n - 1))}
    <div class="qtheme"><span>${thChip(th)}</span><span class="agechip">${ageChip(S.qa)}</span></div>
    <div class="qbody">${hist}<div class="who">${V.KIND_KO[q.k]}</div><div class="bub ai">${esc(q.q)}${q.k === 'slider' ? '<small>끌리는 만큼 밀어 봐요</small>' : ''}</div></div>
    ${body}<div class="qfoot">${NOTE}</div></div>`;
}
function reveal() {
  const ph = S.ph || 0, I = S.res ? info(S) : null;
  return `<div class="owrv ph${ph}"><div class="rvbg" style="--c:${I ? I.col : V.THEMES[S.th].c}"></div>
    <div class="rvtop"><b>THINKING</b> · 답 다섯 개 + 오늘의 주제 ${V.THEMES[S.th].ko}${S.age !== 'all' ? ' · ' + V.AGE_KO[S.age] : ''}</div>
    <div class="flip" data-ow="flip"><div class="fi"><div class="face fr">${S.res ? card(S) : ''}</div><div class="face bk">${S.th === 'nature' ? backNature() : backCard(S, S.th)}</div></div></div>
    <div class="dust">${Array.from({ length: 18 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 6) * .25}s;--s:${.5 + (i % 3) * .4}"></i>`).join('')}</div>
    <div class="rvhint">${S.res ? (ph === 0 ? '카드를 눌러 뒤집어요' : '오늘의 당신이 나오는 중…') : 'AI 가 고르는 중…'}</div><div class="ownote dk">${NOTE}</div></div>`;
}
const backNature = () => `<div class="owcard back" style="--c:#A9C79A"><div class="cin"><div class="mesh"></div><div class="grain"></div>
  <div class="ctop"><span>HOW AI SEES ME</span><span>${dateDot(S.day)}</span></div><div class="bub q">나는 오늘 무슨 꽃이야?</div><div class="bub a typing"><i></i><i></i><i></i></div><div class="bbig">?</div></div></div>`;

function result() {
  const I = info(S), view = S.view === 'more' && S.more ? S.more : S.res, rest = V.moreThemes(S.day), d = dex(), dk = Object.keys(d).length;
  const thL = V.dexList(I.th), thGot = thL.filter(x => d[x.id]).length;
  const tabs = S.more ? `<div class="owtabs"><button class="${S.view !== 'more' ? 'on' : ''}" data-ow="v-main">${V.THEMES[S.res.th].e} ${V.THEMES[S.res.th].ko}</button><button class="${S.view === 'more' ? 'on' : ''}" data-ow="v-more">${V.THEMES[S.more.th].e} ${V.THEMES[S.more.th].ko}</button></div>` : '';
  const open = tintsOpen();
  return `<div class="owres"><div class="rhdr"><button class="ib" data-ow="close" aria-label="닫기">${ic('x')}</button><b>오늘의 한 단어</b><span class="aipill">${view.by === 'ai' || view.by === 'cache' ? '<b>AI</b> 선택' : '규칙으로 고름'}</span></div>
    ${tabs}<div class="preview">${card(S, view)}</div>
    <div class="share"><button class="sb main" data-ow="save">${ic('dl')}<span>그림 저장</span></button><button class="sb" data-ow="link">${ic('link')}<span>친구랑 비교하기</span></button></div>
    ${S.pair ? `<button class="morerow pairrow" data-ow="cmp"><span class="mt"><b>친구 카드와 나란히 보기</b><small>오늘의 합 · 같은 답 격자</small></span>${ic('arrow')}</button>` : ''}
    <button class="morerow" data-ow="dex"><span class="ri">📒</span><span class="mt"><b>도감에 넣었어요 · ${dk} / ${dexTotal()}</b><small>${V.THEMES[I.th].ko} 칸 ${thGot} / ${thL.length}${S.fresh && I.rare ? ' · ✦ 희귀 첫 획득' : ''}</small></span><em>보기</em></button>
    ${S.more ? `<div class="morerow done"><span class="ri">🪙</span><span class="mt"><b>다른 주제 · ${V.THEMES[S.more.th].ko}도 받았어요</b><small>위 칸을 눌러 두 카드를 바꿔 봐요</small></span></div>`
      : `<button class="morerow" data-ow="more"><span class="ri">🪙</span><span class="mt"><b>오늘의 다른 주제 하나 더</b><small>${rest.map(t => V.THEMES[t].ko).join(' · ')} 중 하나 — ${PRICE} 골드 또는 광고 1번</small></span><span class="mp"><i class="coin"></i>${PRICE}</span></button>`}
    ${I.nature ? '' : `<div class="tints"><span>카드 색</span>${V.TINTS.map((t, i) => i < open ? `<button class="${(S.tint || V.THEMES[view.th].c) === t ? 'on' : ''}" style="background:${t}" data-tint="${t}" aria-label="카드 색 ${i + 1}"></button>` : `<i title="도감 ${(i) * 5}칸이면 열려요">${ic('lock')}</i>`).join('')}</div>`}
    ${C.R.PROD ? '' : `<button class="nrrow" data-ow="nr"><img src="fortune/char/ow-jaeha.webp" alt=""><span class="mt"><b>재하에게 이 카드 보여 주기</b><small>너랑 캐릭터가 '${esc(info(S, view).name)}'로 먼저 인사해요</small></span>${ic('arrow')}</button>`}
    ${C.R.PROD ? '' : '<button class="owreset" data-ow="reset">오늘 카드 다시 받기 (테스트)</button>'}
    <p class="ownote">${NOTE} · 같은 날 같은 답이면 같은 결과 · 희귀 1%는 답 조합으로 정해져요(판매 X)</p></div>
    ${S.v1 && !S.v1seen ? `<div class="owdim" data-ow="v1keep"></div><div class="owsheet"><div class="grab"></div><div class="shd"><b>새 버전 카드가 나왔어요</b></div>
      <p class="shs">이 꽃 카드는 예전 버전이에요. 새 버전은 오늘의 주제(${V.THEMES[V.dayTheme(S.day)].ko}) 질문 다섯 개로 캐릭터 · 장면 카드를 만들어요. 꽃 카드는 지워져요.</p>
      <button class="shdone" data-ow="reset">새 버전 카드로 다시 받기</button><button class="shkeep" data-ow="v1keep">꽃 카드 그대로 둘게요</button></div>` : ''}`;
}
function moreSheet() {
  const rest = V.moreThemes(S.day), A = acct(), gold = A.current() ? ((A.current().gold || {}).total || 0) : null, arm = S.arm || '';
  const rows = rest.map(t => `<div class="mrow th"><span class="mk">${V.THEMES[t].e}</span><span class="mw"><b>${V.THEMES[t].ko}</b><small>오늘 답 그대로 · ${V.THEMES[t].ko} 덱에서 한 장</small></span>
    <span class="mbs"><button class="buy ad" data-owmore="${t}:ad">광고 보고 무료로</button><button class="buy${arm === t ? ' arm' : ''}${S.credit ? ' credit' : ''}" data-owmore="${t}:gold">${S.credit ? '오늘 1회 무료로 받기<small>지난 구매 혜택</small>' : arm === t ? `${PRICE}골드 쓰기` : `${PRICE}골드로 받기`}</button></span></div>`).join('');
  return `<div class="owdim" data-ow="sheet-close"></div><div class="owsheet"><div class="grab"></div>
    <div class="shd"><b>오늘의 다른 주제 하나 더</b>${gold != null ? `<span class="gold"><i class="coin"></i>${C.gnum(gold)}</span>` : ''}</div>
    <p class="shs">${S.v1 ? '오늘 꽃 카드의 답으로 다른 주제 덱에서 한 장 더.' : '같은 답으로 다른 주제 덱에서 한 장 더.'} 하루 한 번 · 광고 1번이면 무료예요.${S.credit ? '<br><b>오늘 계절 · 동물 · 향 단어를 산 기록이 있어 한 번은 골드 없이 받아요 (지난 구매 혜택).</b>' : ''}</p>${rows}
    <p class="shn">확률 없이 오늘 답에 맞는 카드를 그대로 보여 줘요 · 희귀 1%도 같은 규칙 · 오늘 카드에만</p></div>`;
}
function sheetDraw() { document.querySelectorAll('#ow .owdim,#ow .owsheet').forEach(x => x.remove()); host().insertAdjacentHTML('beforeend', moreSheet()); const sh = document.querySelector('#ow .owsheet'); if (sh) sh.style.animation = 'none'; }
function sheetClose() { S.arm = ''; document.querySelectorAll('#ow .owdim,#ow .owsheet').forEach(x => x.remove()); }

/* 도감 */
function dexScr() {
  const d = dex(), tabs = [...V.BASE, 'type', ...(V.PACK_R.some(x => d[x.id]) ? ['trend'] : [])], cur = S.dexTh || (info(S) || {}).th || 'culture';
  const L = V.dexList(cur), got = L.filter(x => d[x.id]).length;
  const tiles = L.map(x => {
    const has = !!d[x.id];
    if (!has) return `<div class="dt empty"><span>?</span><b>${x.rare ? '✦ 희귀' : '아직'}</b></div>`;
    return cur === 'nature' ? `<div class="dt"><span class="fl">${flowerSvg(x.hex, 40)}</span><b>${esc(x.w)}</b></div>` : `<div class="dt${x.rare ? ' rare' : ''}"><span>${x.e}</span><b>${esc(x.n)}</b>${x.rare ? '<em>✦</em>' : ''}</div>`;
  }).join('');
  return `<div class="owres dex"><div class="rhdr"><button class="ib" data-ow="result" aria-label="뒤로">${ic('back')}</button><b>내 도감</b><span class="aipill">${Object.keys(d).length} / ${dexTotal()}</span></div>
    <div class="owtabs sc">${tabs.map(t => `<button class="${t === cur ? 'on' : ''}" data-dexth="${t}">${V.THEMES[t].e} ${V.THEMES[t].ko}</button>`).join('')}</div>
    <div class="dprog"><b>${V.THEMES[cur].ko} ${got} / ${L.length}</b><div><i style="width:${Math.round(got / Math.max(1, L.length) * 100)}%"></i></div><small>5칸마다 카드 색 하나 무료 · 지금 ${tintsOpen()} / ${V.TINTS.length}</small></div>
    <div class="dgrid">${tiles}</div>
    <p class="ownote">희귀(✦)는 그날 답 조합으로 1% 정해져요 · 확률 공개 · 골드로 살 수 없어요 · 이 기기에 저장돼요</p></div>`;
}

/* 친구 비교 */
function compare() {
  const P = S.pair, mine = info(S), fr = P && P.r && (/^f\d{3}$/.test(P.r) ? null : V.resultById(P.r));
  if (!P || !mine) { S.scr = 'result'; return result(); }
  const sameSet = P.q === S.qa && Array.isArray(P.a) && P.a.length === 5 && S.a.length === 5;
  const fRec = { day: S.day, age: V.okAge(P.g) ? P.g : 'all', tint: '' }, fRes = fr ? { th: fr.theme === 'trend' ? 'trend' : fr.theme, r: fr.id, line: fr.l, rare: fr.rare } : { th: 'nature', f: P.r, c: P.c, w: P.w, line: '' };
  const fI = info(fRec, fRes);
  const H = V.hap(S.a.length ? S.a : [0, 0, 0, 0, 0], sameSet ? P.a : [9, 9, 9, 9, 9], mine.x ? mine.x.t : [], fr ? fr.t : [], S.day + (P.r || ''));
  const tp = V.typePair(myType(), V.okType(P.m) ? P.m : '');
  const grid = sameSet ? V.sameGrid(S.a, P.a) : null;
  return `<div class="owres cmp"><div class="rhdr"><button class="ib" data-ow="result" aria-label="뒤로">${ic('back')}</button><b>오늘의 우리 둘</b><span class="aipill">비교</span></div>
    <div class="pair"><div><small>나 · ${V.AGE_SHORT[S.age]}</small>${card(S, S.res, { mini: 1, type: '' })}</div><span class="x">×</span><div><small>친구 · ${V.AGE_SHORT[fRec.age]}</small>${fI ? card(fRec, fRes, { mini: 1, type: '' }) : ''}</div></div>
    <div class="hap"><small>오늘의 합</small><b>${esc(H.name)}</b><p>${esc(H.line)}</p>${tp ? `<p class="tp">${esc(tp)}</p>` : ''}</div>
    ${grid ? `<div class="grid"><small>같은 질문 5개 · ${grid.filter(Boolean).length}개 같은 답</small><div>${grid.map(x => `<i class="${x ? 'same' : ''}"></i>`).join('')}</div></div>` : '<div class="grid"><small>질문 세트가 달라 같은 답 격자는 빠져요</small></div>'}
    <div class="share"><button class="sb main" data-ow="cmpsave">${ic('dl')}<span>비교 카드 저장</span></button><button class="sb" data-ow="link">${ic('link')}<span>다른 친구 부르기</span></button></div>
    <p class="ownote">친구가 링크로 들어와 같은 질문에 답하면 바로 생겨요 · 오늘 카드 두 장으로 만든 재미용 한 줄이에요</p></div>`;
}

function neorang() {
  const I = info(S, S.view === 'more' && S.more ? S.more : S.res);
  const say2 = I.nature ? `${esc(I.weather.w)} 같은 목소리네요. 오늘 첫 곡은 그 공기로 골라 둘게요.` : `${esc(I.name)}… 오늘 ${esc(V.THEMES[I.th].ko)} 이야기라면 할 말이 많을 것 같은데요. 오늘 첫 곡은 그 장면으로 골라 둘게요.`;
  return `<div class="ownr"><div class="nrhero"><img src="fortune/char/ow-jaeha.webp" alt=""><div class="nrshade"></div>
    <div class="nrtop"><button class="ib dk" data-ow="result" aria-label="뒤로">${ic('back')}</button><span class="nm"><b>윤재하</b><small>심야 라디오 「자정의 주파수」 DJ</small></span><span class="aipill"><b>AI</b> 캐릭터</span></div></div>
    <div class="nrchat"><div class="sys">오늘의 한 단어 카드를 보냈어요</div><div class="sent"><div class="thumb">${card(S, S.view === 'more' && S.more ? S.more : S.res)}</div></div>
      <div class="say"><b>재하</b><p>…'${esc(I.name)}' 씨. 오늘은 그렇게 불러도 돼요?</p></div>
      <div class="say"><p>${say2} 사연 하나만 보내 줘요 — 오늘 생긴 일이든, 아직 못 꺼낸 일이든.</p></div></div>
    <button class="nrgo" data-ow="nrgo">너랑에서 재하와 이어 가기 ${ic('arrow')}</button></div>`;
}

/* 오늘 카드 다시 받기: 이 기기의 오늘 기록 · 지난 구매 혜택 · 오늘 도감 칸을 지우고 v2 질문부터 (테스트 단추 · v1 카드 안내) — 서버 골드 기록은 그대로라 같은 날 골드로 다시 받으면 차감 없이 열림 */
function resetToday() {
  const day = S.day, d = dex(); for (const [id, dd] of Object.entries(d)) if (dd === day) delete d[id]; jset(DKEY, d);
  try { localStorage.removeItem(KEY); } catch { /* */ }
  C.T.track('oneword_reset', { v1: S.v1 ? 1 : 0 });
  const c = C; S = null; open(c, 'reset');
}

/* ── 서버 · 규칙 ── */
async function decide() {
  const Cd = V.candidates({ day: S.day, age: S.age, qa: S.qa, theme: S.th, a: S.a, qs: S.qs });
  let res = null;
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch('/api/oneword', { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ v: 2, d: did(), day: S.day, age: S.age, qa: S.qa, a: S.a }) });
    clearTimeout(t);
    const j = r.ok ? await r.json() : null;
    if (j && j.v === 2 && j.th === S.th) {
      if (Cd.theme === 'nature' && j.pick && typeof j.pick === 'object') {
        const p = Object.fromEntries(['flower', 'color', 'weather'].map(k => [k, Cd.cand[k][j.pick[k]]]));
        if (p.flower && p.color && p.weather) res = { th: 'nature', f: p.flower.id, c: p.color.id, w: p.weather.id, line: j.line || V.natureLine(Cd.w, Cd.seed, p), by: j.by, stat: j.stat };
      } else if (Cd.list && Cd.list[j.pick]) res = { th: S.th, r: Cd.list[j.pick].id, line: j.line || Cd.list[j.pick].l, rare: Cd.rare, by: j.by, stat: j.stat };
    }
  } catch { /* 규칙으로 */ }
  return res || { ...V.pickRule(Cd), by: 'rule' };
}
function afterReveal() {
  if (S.pending) return;
  S.pending = true; const t0 = Date.now();
  decide().then(res => {
    S.res = res; S.fresh = dexAdd(res, S.day);
    save({ v: 2, day: S.day, age: S.age, qa: S.qa, th: S.th, a: S.a, res, pair: S.pair || undefined });
    C.T.track('oneword_done', { by: res.by, th: res.th, r: res.r || res.f, age: S.age, rare: res.rare ? 1 : 0, pair: S.pair ? 1 : 0 });
    if (res.rare) C.T.track('oneword_rare', { r: res.r, th: res.th });
    if (S.pair) C.T.track('oneword_pair', { what: 'done' });
    setTimeout(() => { if (!S || S.scr !== 'reveal') return; draw(); setTimeout(() => S && S.scr === 'reveal' && !S.flipped && !window.__owHold && flip(), 2200);   /* __owHold: 폰 시험이 뒤집기 전 화면을 찍을 때만 */ }, Math.max(0, 1200 - (Date.now() - t0)));
  });
}
function flip() {
  if (!S.res || S.flipped) return; S.flipped = true;
  const r = document.querySelector('.owrv'); if (!r) return;
  r.classList.remove('ph0'); r.classList.add('ph1'); r.querySelector('.rvhint').textContent = '오늘의 당신이 나오는 중…';
  setTimeout(() => r.classList.replace('ph1', 'ph2'), 650);
  setTimeout(() => { if (S && S.scr === 'reveal') { S.scr = S.pair ? 'cmp' : 'result'; draw(); } }, 2100);
}

/* ── 저장 그림 (1080×1920 · 결과 카드와 같은 배치) ── */
const SERIF = "'Nanum Myeongjo','AppleMyungjo','Noto Serif KR','Noto Serif CJK KR',serif", MONO = "ui-monospace,'SF Mono',Menlo,monospace", SANS = "-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif";
const blobs = (x, col, W = 1080, H = 1920) => {
  const blob = (cx, cy, r, c, a) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, c + Math.round(a * 255).toString(16).padStart(2, '0')); g.addColorStop(1, c + '00'); x.fillStyle = g; x.fillRect(0, 0, W, H); };
  x.fillStyle = '#F3EEE7'; x.fillRect(0, 0, W, H);
  blob(W * .78, H * .2, W * .58, mix(col, '#FFFFFF', .1), .8); blob(W * .18, H * .4, W * .48, '#F7D6CF', .85); blob(W * .7, H * .72, W * .6, '#F6DEAA', .7); blob(W * .1, H * .92, W * .48, mix(col, '#FFFFFF', .2), .45);
};
function wrap(x, txt, maxW) { const out = []; let ln = ''; for (const ch of String(txt).split(/(\s+)/)) { if (x.measureText(ln + ch).width > maxW && ln.trim()) { out.push(ln.trim()); ln = ''; } ln += ch; } if (ln.trim()) out.push(ln.trim()); return out; }
const pill = (x, txt, cx, top, u, bg, fg, font, right) => { x.font = font; const w = x.measureText(txt).width + 6.8 * u, h = 7.4 * u, l = right ? cx - w : cx; x.fillStyle = bg; x.beginPath(); x.roundRect(l, top, w, h, h / 2); x.fill(); x.fillStyle = fg; x.textAlign = 'left'; x.fillText(txt, l + 3.4 * u, top + 5.1 * u); };
function drawV2(x, rec, res, u, W, H) {
  const I = info(rec, res), age = rec.age || 'all', ty = myType();
  blobs(x, I.col, W, H);
  x.fillStyle = '#23201D'; x.textBaseline = 'alphabetic';
  x.font = `500 ${2.7 * u}px ${MONO}`; x.textAlign = 'left'; x.fillText('HOW AI SEES ME — TODAY', 8 * u, 11 * u); x.textAlign = 'right'; x.fillText(dateDot(rec.day), 92 * u, 11 * u);
  pill(x, res.via ? `${V.THEMES[I.th].e} 다른 주제 · ${V.THEMES[I.th].ko}` : thChip(I.th), 8 * u, 16 * u, u, 'rgba(255,255,255,.65)', '#23201D', `700 ${3.4 * u}px ${SANS}`);
  if (I.rare) pill(x, '✦ 희귀 1%', 92 * u, 16 * u, u, '#E4C27A', '#3A2600', `800 ${3.4 * u}px ${SANS}`, true);
  if (ty) pill(x, ty, 92 * u, (I.rare ? 25 : 16) * u, u, 'rgba(35,32,29,.08)', '#6F6760', `600 ${2.8 * u}px ${MONO}`, true);
  x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.arc(50 * u, 50 * u, 20 * u, 0, 7); x.fill();
  x.font = `${22 * u}px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(I.e, 50 * u, 51 * u); x.textBaseline = 'alphabetic';
  x.fillStyle = '#6F6760'; x.font = `${3.8 * u}px ${SERIF}`; x.fillText('오늘의 당신은', 50 * u, 81.5 * u);
  let fs = 10.5 * u, lines; x.fillStyle = '#23201D';
  for (let k = 0; k < 30; k++) { x.font = `800 ${fs}px ${SERIF}`; lines = wrap(x, I.name, 86 * u); if (lines.length <= 2) break; fs *= .94; }
  lines.forEach((l, i) => x.fillText(l, 50 * u, 85 * u + fs * .95 + i * fs * 1.18));
  x.font = `700 ${4.4 * u}px ${SERIF}`; wrap(x, I.line, 82 * u).slice(0, 3).forEach((l, i) => x.fillText(l, 50 * u, 122 * u + i * 7 * u));
  x.strokeStyle = 'rgba(35,32,29,.3)'; x.lineWidth = 2; [140, 149.5].forEach(y => { x.beginPath(); x.moveTo(8 * u, y * u); x.lineTo(92 * u, y * u); x.stroke(); });
  const ak = age === 'all' ? '공통' : V.AGE_KO[age], ctx = res.via ? (rec.v1 ? '오늘 꽃 카드 답으로 받은 다른 주제 카드' : '오늘 답으로 받은 다른 주제 카드') : V.context({ ...rec, r: I.id, rare: I.rare });
  x.font = `${3.1 * u}px ${SANS}`; const cw = x.measureText(ctx).width; x.font = `${2.8 * u}px ${SANS}`; const aw = x.measureText(ak).width + 4.8 * u, tw = aw + 2 * u + cw, l0 = 50 * u - tw / 2;
  x.fillStyle = '#23201D'; x.beginPath(); x.roundRect(l0, 142 * u, aw, 5.4 * u, 2.7 * u); x.fill(); x.fillStyle = '#F4EFE8'; x.textAlign = 'left'; x.fillText(ak, l0 + 2.4 * u, 145.8 * u);
  x.fillStyle = '#23201D'; x.font = `${3.1 * u}px ${SANS}`; x.fillText(ctx, l0 + aw + 2 * u, 146 * u);
  const st = V.statLine({ ...rec, rare: I.rare, stat: res.stat }); if (st) { x.font = `500 ${2.8 * u}px ${MONO}`; x.fillStyle = '#6F6760'; x.textAlign = 'center'; x.fillText(st, 50 * u, 155 * u); }
  if (I.rare) { x.strokeStyle = '#C9A45C'; x.lineWidth = .8 * u; x.beginPath(); x.roundRect(2.4 * u, 2.4 * u, W - 4.8 * u, H - 4.8 * u, 2.4 * u); x.stroke(); }
  x.fillStyle = '#23201D'; x.textAlign = 'left'; x.font = `${4.2 * u}px Jua, ${SANS}`; x.fillText('One a Day', 8 * u, H - 7 * u); x.font = `500 ${2.6 * u}px ${MONO}`; x.textAlign = 'right'; x.fillText('oneaday.kr — 너도 물어봐', 92 * u, H - 7 * u);
}
async function drawNature(x, rec, I, u) {
  blobs(x, I.col);
  await new Promise(res => { const im = new Image(); im.onload = () => { x.save(); x.globalAlpha = .5; try { x.filter = 'blur(8px)'; } catch { /* */ } x.drawImage(im, 34 * u, 34 * u, 62 * u, 62 * u); x.restore(); res(); }; im.onerror = res; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(flowerSvg(I.flower.hex, 600)); });
  x.fillStyle = '#23201D'; x.textBaseline = 'alphabetic';
  x.font = `500 ${2.7 * u}px ${MONO}`; x.textAlign = 'left'; x.fillText('HOW AI SEES ME — TODAY', 8 * u, 11 * u); x.textAlign = 'right'; x.fillText(dateDot(rec.day), 92 * u, 11 * u);
  const bubble = (txt, right, top, bg, bold) => { x.font = `${bold ? 700 : 400} ${3.7 * u}px ${SANS}`; const w = x.measureText(txt).width + 7.2 * u, h = 8.6 * u, l = right ? 92 * u - w : 8 * u; x.fillStyle = bg; x.beginPath(); x.roundRect(l, top, w, h, [4.6 * u, 4.6 * u, right ? 1.4 * u : 4.6 * u, right ? 4.6 * u : 1.4 * u]); x.fill(); x.fillStyle = '#23201D'; x.textAlign = 'left'; x.fillText(txt, l + 3.6 * u, top + 5.7 * u); };
  bubble('나는 오늘 무슨 꽃이야?', true, 17 * u, 'rgba(255,255,255,.6)'); bubble(I.flower.w + '.', false, 27 * u, '#FFFFFF', true);
  let fs = 38 * u; x.font = `800 ${fs}px ${SERIF}`;
  while (x.measureText(I.flower.w).width > 88 * u && fs > 6 * u) { fs *= .95; x.font = `800 ${fs}px ${SERIF}`; }
  x.fillStyle = '#23201D'; x.textAlign = 'left'; x.fillText(I.flower.w, 6 * u, 44 * u + (38 * u - fs) * .45 + fs * .86);
  let y = 103 * u;
  x.strokeStyle = 'rgba(35,32,29,.55)'; x.lineWidth = 2; x.beginPath(); x.moveTo(8 * u, y); x.lineTo(92 * u, y); x.stroke();
  for (const [k, v] of [['FLOWER', I.flower.w], ['COLOR', I.color.w], ['WEATHER', I.weather.w]]) {
    x.font = `500 ${2.7 * u}px ${MONO}`; x.fillStyle = '#6F6760'; x.textAlign = 'left'; x.fillText(k, 8 * u, y + 6.4 * u);
    x.font = `700 ${4.4 * u}px ${SERIF}`; x.fillStyle = '#23201D'; x.textAlign = 'right'; x.fillText(v, 92 * u - (k === 'COLOR' ? 4.6 * u : 0), y + 6.6 * u);
    if (k === 'COLOR') { x.fillStyle = I.col; x.beginPath(); x.arc(92 * u - 1.5 * u, y + 5.2 * u, 1.5 * u, 0, 7); x.fill(); }
    y += 9.6 * u; x.strokeStyle = 'rgba(35,32,29,.18)'; x.beginPath(); x.moveTo(8 * u, y); x.lineTo(92 * u, y); x.stroke();
  }
  x.font = `700 ${4.9 * u}px ${SERIF}`; x.fillStyle = '#23201D'; x.textAlign = 'left';
  wrap(x, I.line, 84 * u).forEach((l, i) => x.fillText(l, 8 * u, y + 9 * u + i * 7.6 * u));
  x.font = `${4.2 * u}px Jua, ${SANS}`; x.fillText('One a Day', 8 * u, 1920 - 7 * u); x.font = `500 ${2.6 * u}px ${MONO}`; x.textAlign = 'right'; x.fillText('oneaday.kr — 너도 물어봐', 92 * u, 1920 - 7 * u);
}
export async function cardBlob(rec, res = rec.res) {
  const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1920;
  const x = cv.getContext('2d'), I = info(rec, res);
  if (I.nature) await drawNature(x, rec, I, 10.8); else drawV2(x, rec, res, 10.8, 1080, 1920);
  return new Promise(r => cv.toBlob(r, 'image/png'));
}
/* 비교 카드 (1080×1350): 두 카드를 작게 나란히 + 오늘의 합 */
async function pairBlob() {
  const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350;
  const x = cv.getContext('2d'); blobs(x, info(S).col, 1080, 1350);
  const P = S.pair, fr = V.resultById(P.r), mine = info(S);
  const panel = async (rec, res, left) => { const c2 = document.createElement('canvas'); c2.width = 450; c2.height = 800; const y = c2.getContext('2d'), I = info(rec, res); if (I.nature) await drawNature(y, rec, I, 4.5); else drawV2(y, rec, res, 4.5, 450, 800); x.save(); x.shadowColor = 'rgba(80,50,30,.25)'; x.shadowBlur = 30; x.drawImage(c2, left, 150); x.restore(); };
  await panel(S, S.res, 70);
  if (fr) await panel({ day: S.day, age: V.okAge(P.g) ? P.g : 'all' }, { th: fr.theme, r: fr.id, line: fr.l, rare: fr.rare }, 560);
  const H = V.hap(S.a, P.q === S.qa ? P.a : [9, 9, 9, 9, 9], mine.x ? mine.x.t : [], fr ? fr.t : [], S.day + P.r);
  x.fillStyle = '#23201D'; x.textAlign = 'center'; x.font = `500 26px ${MONO}`; x.fillText('HOW AI SEES US — TODAY · ' + dateDot(S.day), 540, 100);
  x.font = `800 40px ${SERIF}`; x.fillText('×', 540, 560);
  x.font = `500 24px ${MONO}`; x.fillStyle = '#6F6760'; x.fillText('오늘의 합', 540, 1020);
  x.font = `800 58px ${SERIF}`; x.fillStyle = '#23201D'; x.fillText(H.name, 540, 1090);
  x.font = `30px ${SANS}`; x.fillStyle = '#6F6760'; wrap(x, H.line, 900).slice(0, 2).forEach((l, i) => x.fillText(l, 540, 1145 + i * 42));
  x.textAlign = 'left'; x.fillStyle = '#23201D'; x.font = `44px Jua, ${SANS}`; x.fillText('One a Day', 80, 1290); x.textAlign = 'right'; x.font = `500 26px ${MONO}`; x.fillText('oneaday.kr — 너도 비교해 봐', 1000, 1290);
  return new Promise(r => cv.toBlob(r, 'image/png'));
}

/* ── 공유 링크: 주제별 미리보기 페이지(s/w/t-<주제>.html · 자연은 s/w/<꽃>.html) + 비교에 필요한 것만 (결과 id · 날짜 · 질문 세트 나이대 · 답 번호 · 나이대 · 유형) ── */
function shareUrl(res) {
  const id = res.th === 'nature' ? res.f : res.r, q = new URLSearchParams({ r: id, d: S.day.replace(/-/g, ''), q: S.qa, a: S.a.join(''), g: S.age });
  if (myType()) q.set('m', myType());
  if (res.th === 'nature') { q.set('c', res.c); q.set('w', res.w); }
  return `${C.shareBase()}s/w/${res.th === 'nature' ? id : 't-' + res.th}.html?${q}`;
}
/* 앱 주소(?from=oneword&r=…)에서 비교 정보 읽기 */
export function parsePair(sp) {
  const r = sp.get('r') || sp.get('f') || '', d = sp.get('d') || '', a = sp.get('a') || '';
  if (!V.KNOWN(r)) return null;
  return { r, d: /^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}` : '', q: V.okAge(sp.get('q')) ? sp.get('q') : 'all', a: /^[0-4]{5}$/.test(a) ? a.split('').map(Number) : null, g: V.okAge(sp.get('g')) ? sp.get('g') : 'all', m: V.okType(sp.get('m')) ? sp.get('m') : '',
    c: /^c\d{3}$/.test(sp.get('c') || '') ? sp.get('c') : OW.COLORS[0].id, w: /^w\d{3}$/.test(sp.get('w') || '') ? sp.get('w') : OW.WEATHERS[0].id };
}

/* ── 누르기 ── */
let armT = 0;
/* 폰 시험만: 가짜 계정(로그인 · 골드 차감 흐름) — 테스트 빌드에서만 */
const acct = () => (!C.R.PROD && window.__owTestA) || C.A;
/* 지금 기록을 v2 모양으로 저장 (v1 기록도 이때 v2 로 바뀜 — 다시 읽어도 받은 것 · 혜택 쓴 것이 그대로) */
const persist = () => save({ v: 2, day: S.day, age: S.age, qa: S.qa, th: S.th, a: S.a, res: S.res, ...(S.v1 ? { v1: 1, v1a: S.v1a } : {}), ...(S.more ? { more: S.more } : {}), credit: S.credit || 0, ...(S.tint ? { tint: S.tint } : {}), ...(S.pair ? { pair: S.pair } : {}), ...(S.v1seen ? { v1seen: 1 } : {}) });
function moreCand(th) {
  if (S.a && S.a.length === 5) return V.candidates({ day: S.day, age: S.age, qa: S.qa, theme: th, a: S.a, qs: S.qs || V.dayQuestions(S.day, S.qa) });
  /* v1 꽃 카드: v1 답의 꼬리표 무게로 (v1 답도 없으면 0) */
  const a1 = (S.v1a || []).filter(x => Number.isInteger(x) && x >= 0 && x < 4), w = a1.length === 5 ? OW.profile(a1).w : Object.fromEntries(V.TAGS.map(t => [t, 0]));
  return V.candidates({ day: S.day, age: S.age, theme: th, w, seed: `${S.day}|v1|${a1.join('')}|${th}` });
}
function gotMore(th, via) {
  const r = { ...V.pickRule(moreCand(th)), by: 'rule', via };
  S.more = r; S.view = 'more'; if (via === 'credit') S.credit = 0; dexAdd(r, S.day);
  persist(); sheetClose(); draw();
}
/* 광고: 앱 테스트 광고 시트(#sheet)는 겹 화면(#ow)보다 아래라 .over 로 올림 (2026-11-03 대표 제보: 광고가 가려져 '진행 없음') */
async function showAd() {
  const fn = (!C.R.PROD && window.__owTestAd) || C.rewardAd; if (!fn) return false;
  const p = fn('보상형 광고 (테스트) · 다른 주제 하나 더'), sh = document.getElementById('sheet'); if (sh) sh.classList.add('over');
  try { return await p; } finally { if (sh) sh.classList.remove('over'); }
}
async function buyMore(th, via) {
  try { await buyMore0(th, via); } catch (e) { console.warn('oneword more', e); C.toast('다시 시도해 주세요'); C.T.track('oneword_more_err', { via, msg: String(e && e.message || e).slice(0, 60) }); }
}
async function buyMore0(th, via) {
  if (via === 'ad') {
    let ok = false;
    try { ok = await showAd(); } catch { C.T.track('oneword_more', { via: 'ad', th, fail: 1 }); return C.toast('광고를 불러오지 못했어요 · 잠시 뒤 다시 해 주세요'); }
    if (!ok) { C.T.track('oneword_more', { via: 'ad', th, cancel: 1 }); return C.toast('광고를 끝까지 보면 받아요'); }
    C.T.track('oneword_more', { via: 'ad', th }); return gotMore(th, 'ad');
  }
  if (S.credit) { C.T.track('oneword_more', { via: 'credit', th }); return gotMore(th, 'credit'); }   /* v1 에서 오늘 산 단어가 있으면 오늘 1회 무료 (지난 구매 혜택) */
  const A = acct();
  if (!A.ON) return C.toast('골드는 곧 열려요 · 광고로 받아 보세요');
  if (!A.current()) { C.needLogin('골드로 받으려면 로그인해 주세요'); const sh = document.getElementById('sheet'); if (sh) sh.classList.add('over'); return; }
  const gold = (A.current().gold && A.current().gold.total) || 0;
  if (gold < PRICE) { C.toast(`골드가 ${C.gnum(PRICE - gold)}개 모자라요 · 광고로도 받을 수 있어요`); return; }
  if (S.arm !== th) { S.arm = th; sheetDraw(); clearTimeout(armT); armT = setTimeout(() => { if (S && S.arm === th) { S.arm = ''; if (document.querySelector('#ow .owsheet')) sheetDraw(); } }, 4000); return; }   /* 한 번 누르면 '쓰기'로, 한 번 더 누르면 차감 (실수 방지) */
  clearTimeout(armT); S.arm = '';
  try {
    await A.call({ act: 'use', game: 'oneword', item: 'theme2', ref: `ow-${S.day.replace(/-/g, '')}-theme2` });
    C.T.track('oneword_more', { via: 'gold', th, gold: PRICE }); gotMore(th, 'gold');
  } catch (e) {
    if (e && e.reason === 'limit') { C.T.track('oneword_more', { via: 'gold', th, gold: 0, again: 1 }); return gotMore(th, 'gold'); }   /* 오늘 이미 산 기록(앞 요청 답만 놓침)이면 받은 것으로 */
    sheetDraw(); C.toast((e && e.message) || '다시 시도해 주세요');
  }
}
function next(n) { setTimeout(() => { if (!S) return; S.scr = n < 5 ? 'q' + (n + 1) : 'reveal'; S.ph = 0; draw(); }, S.qs[n - 1].k === 'bal' && S.st ? 900 : 320); }
function onInput(e) {
  const s = e.target.closest('[data-slide]'); if (!s) return;
  const n = +s.dataset.slide, v = +s.value; S.a = S.a.slice(0, n - 1); S.a[n - 1] = v;
  const sv = document.getElementById('owsv'); if (sv) sv.innerHTML = `${v * 25}<small>%</small>`;
  const tr = s.parentElement.querySelector('i'); if (tr) tr.style.width = v * 25 + '%';
}
async function onClick(e) {
  const ag = e.target.closest('[data-age]');
  if (ag) { const k = ag.dataset.age; sset(AKEY, k); S.age = k; S.qa = S.pair && V.okAge(S.pair.q) ? S.pair.q : k; S.qs = V.dayQuestions(S.day, S.qa); S.scr = 'q1'; C.T.track('oneword_age', { src: k === 'all' ? 'common' : 'pick', age: k }); stats(); return draw(); }
  const a = e.target.closest('[data-ans]');
  if (a) {
    const [n, i] = a.dataset.ans.split(':'), k = +n;
    if (i === 's') { if (S.a[k - 1] == null) { S.a = S.a.slice(0, k - 1); S.a[k - 1] = 2; } } else { S.a = S.a.slice(0, k - 1); S.a[k - 1] = +i; draw(); }
    return next(k);
  }
  const mo = e.target.closest('[data-owmore]'); if (mo) { const [th, via] = mo.dataset.owmore.split(':'); return buyMore(th, via); }
  const ti = e.target.closest('[data-tint]'); if (ti) { S.tint = ti.dataset.tint; save({ ...load(), tint: S.tint }); return draw(); }
  const dt = e.target.closest('[data-dexth]'); if (dt) { S.dexTh = dt.dataset.dexth; return draw(); }
  const g = e.target.closest('[data-ow]'); if (!g) return;
  const k = g.dataset.ow;
  if (k === 'close') return close();
  if (k === 'flip') return flip();
  if (/^q\d$/.test(k) || k === 'result') { S.scr = k; return draw(); }
  if (k === 'v-main' || k === 'v-more') { S.view = k === 'v-more' ? 'more' : ''; return draw(); }
  if (k === 'dex') { S.scr = 'dex'; C.T.track('oneword_dex'); return draw(); }
  if (k === 'cmp') { S.scr = 'cmp'; C.T.track('oneword_pair', { what: 'open' }); return draw(); }
  if (k === 'more') { S.arm = ''; host().insertAdjacentHTML('beforeend', moreSheet()); C.T.track('oneword_more_open'); return; }
  if (k === 'sheet-close') return sheetClose();
  if (k === 'v1keep') { S.v1seen = 1; persist(); sheetClose(); return; }
  if (k === 'reset') return resetToday();
  if (k === 'nr') { S.scr = 'nr'; C.T.track('oneword_nr'); return draw(); }
  if (k === 'nrgo') { close(); return C.go('neorang', 'oneword'); }
  const view = S.view === 'more' && S.more ? S.more : S.res;
  if (k === 'save') { g.disabled = true; try { const how = await C.saveImage(await cardBlob(S, view), `oneaday-${S.day}-oneword.png`); C.T.track('oneword_save', { how, th: view.th }); } finally { g.disabled = false; } return; }
  if (k === 'cmpsave') { g.disabled = true; try { const how = await C.saveImage(await pairBlob(), `oneaday-${S.day}-pair.png`); C.T.track('oneword_pair', { what: 'save', how }); } finally { g.disabled = false; } return; }
  if (k === 'link') {
    const I = info(S, view);
    const how = await C.shareLink(`오늘의 나는 ${I.name} · 너는 뭐야?`, `AI 가 본 오늘의 나 — ${I.name}. 같은 질문 5개로 우리 둘 비교해 보자 (30초) →`, shareUrl(view));
    C.T.track('oneword_share', { how, th: view.th, r: I.id, pair: S.scr === 'cmp' ? 1 : 0 });
  }
}

/* 공유 링크로 온 사람: ?from=oneword&r=<결과 id>&d&q&a&g&m (옛 링크 &f=<꽃 id>) → 친구 카드 + '같은 질문으로 나랑 비교하기' */
export function landing(c, sp) {
  C = c;
  const P = typeof sp === 'string' ? parsePair(new URLSearchParams('r=' + sp)) : parsePair(sp);
  const day = dayOf(c), x = P && V.resultById(P.r), fl = P && OW.flowerById(P.r), name = x ? x.n : fl ? fl.w : '';
  const sameDay = P && P.d === day && P.a;
  /* 실서버(한 단어 꺼짐)에서는 카드를 열지 않고 무료 운세로 안내 (2026-11-02 대표 '실서버 적용 전 고칠 것') */
  if (!eligible(c)) { c.T.track('oneword_land', { r: P ? P.r : '', off: 1 }); return c.openSheet(`<div class="intro owland"><h2>친구는 오늘 <em>${name ? esc(name) : '한 단어'}</em></h2>${x ? `<div class="owlf"><span class="owemo big">${x.e}</span><p>${esc(x.l)}</p></div>` : ''}
    <p class="fsub">원어데이에서는 생년월일만 넣으면 오늘의 운세를 무료로 볼 수 있어요</p><div class="stack"><button class="btn" data-tab-go="fortune">오늘의 운세 무료로 보기</button><button class="btn ghost" data-close>나중에</button></div></div>`); }
  c.T.track('oneword_land', { r: P ? P.r : '', same: sameDay ? 1 : 0 });
  if (sameDay) c.T.track('oneword_pair', { what: 'land' });
  c.openSheet(`<div class="intro owland"><h2>친구는 오늘 <em>${name ? esc(name) : '한 단어'}</em>${x ? '래요' : fl ? '이래요' : ''}</h2>
    ${x ? `<div class="owlf"><span class="owemo big">${x.e}</span><p>${esc(x.l)}</p></div>` : fl ? `<div class="owlf">${flowerSvg(fl.hex, 96)}<p>꽃말 · ${esc(fl.m)}</p></div>` : ''}
    <p class="fsub">${sameDay ? '친구가 받은 질문 5개에 똑같이 답하면 두 카드를 나란히 놓고 오늘의 합을 보여 줘요 (30초 · 무료)' : '질문 다섯 개면 오늘의 나는 어떤 장면인지 카드로 받아요 (30초 · 무료)'}</p>
    <div class="stack"><button class="btn" data-ow-open data-ow-pair="${sameDay ? esc(JSON.stringify(P)) : ''}">${sameDay ? '같은 질문으로 나랑 비교하기' : '내 한 단어 받기'}</button><button class="btn ghost" data-close>나중에</button></div></div>`);
}
