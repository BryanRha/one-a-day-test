// 「AI 가 본 나, 한 단어」 화면 (2026-11-02 대표 확정 B안 · 시안 lab/oneword-mock · 비교 team/ops/tasks/261102-oneword/compare.png)
//   운세 탭 진입 카드(탭 톤) → 질문 5개(채팅) → 카드 뒤집기 → 결과(9:16 카드 · 그림 저장 · 링크) → 추가 단어(골드) → 너랑 첫 인사
//   하루 1번 무료 · 이 기기에 그날 결과만 둠(oad_oneword · 고른 답 번호 · 단어 id · 풀이 — 이름 · 생년월일 없음)
//   서버(/api/oneword, 테스트 전용)가 후보 중 고르고 한 줄 풀이 · 안 되면 규칙으로(oneword.js pickRule · ruleLine)
import * as OW from './oneword.js';

const KEY = 'oad_oneword';
const PRICE = { season: 30, animal: 30, scent: 30, all3: 70 };   /* 서버 gold.js SHOP.oneword 와 같은 값 (표시용 · 실제 차감은 서버 값) */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* */ } };
const did = () => { try { return localStorage.getItem('oad_did') || ''; } catch { return ''; } };
let C = null, S = null;   /* C = 앱이 넘겨 준 도구(XC) · S = 지금 흐름 { day, il, a, cand, res, scr, ph, pending } */

/* ── 오늘 ── */
const dayOf = c => c.R.keyOf(c.R.now());
export const eligible = c => !c.R.PROD;   /* 서버가 테스트 전용 → 지금은 테스트에서만 보임 (실서버는 대표 지시 때) */
const todayRec = c => { const v = load(); return v && v.day === dayOf(c) && v.res ? v : null; };
function words(rec) {
  const f = OW.FLOWERS.find(x => x.id === rec.res.f), co = OW.COLORS.find(x => x.id === rec.res.c), w = OW.WEATHERS.find(x => x.id === rec.res.w);
  return f && co && w ? { flower: f, color: co, weather: w } : null;
}
const EXEN = { season: 'SEASON', animal: 'ANIMAL', scent: 'SCENT' };
const extrasOf = rec => OW.EXTRA_KEYS.filter(k => rec.bought && rec.bought[k]).map(k => [OW.EXTRA[k].ko, OW.extraWord(k, rec.a, rec.il, rec.day).w, EXEN[k]]);
/* 추가 단어 짧은 풀이: 그 단어의 꼬리표 두 개 */
const exNote = (k, w) => `${w.t.slice(0, 2).map(t => OW.TAG_KO[t]).join(' · ')} — 오늘 당신과 닮은 ${OW.EXTRA[k].ko}`;

/* 큰 단어 맞추기 (2026-11-02 대표 제보: '메밀꽃'이 카드 밖으로 잘림) — 글꼴이 기기마다 달라 실제 폭을 재서 줄임
   기본 38cqw · 넘치면 5%씩 줄임 · 줄인 만큼 세로 가운데로 · 자간도 같은 비율 */
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
const AI_NOTE = 'AI 가 고른 답 5개와 오늘 일진만 보고 우리 단어 목록에서 고른 재미용 카드예요 · 답은 저장하지 않아요';
const dateDot = d => d.replace(/-/g, '.');

/* ── 9:16 카드 (DOM · cqw) ── */
function card(rec, back = false) {
  const W = back ? null : words(rec), col = W ? W.color.hex : '#EFA58A';
  if (back) return `<div class="owcard back" style="--c:${col}"><div class="cin"><div class="mesh"></div><div class="grain"></div>
    <div class="ctop"><span>HOW AI SEES ME</span><span>${dateDot(rec.day)}</span></div>
    <div class="bub q">나는 오늘 무슨 꽃이야?</div><div class="bub a typing"><i></i><i></i><i></i></div><div class="bbig">?</div></div></div>`;
  const ex = extrasOf(rec);
  return `<div class="owcard" style="--c:${col}"><div class="cin"><div class="mesh"></div><div class="grain"></div>
    <div class="ghost">${flowerSvg(W.flower.hex, 300)}</div>
    <div class="ctop"><span>HOW AI SEES ME — TODAY</span><span>${dateDot(rec.day)}</span></div>
    <div class="bub q">나는 오늘 무슨 꽃이야?</div><div class="bub a">${esc(W.flower.w)}.</div>
    <div class="word">${esc(W.flower.w)}</div>
    <div class="rows${ex.length ? ' ex' : ''}">
      <div><span>FLOWER</span><b>${esc(W.flower.w)}<small>${esc(W.flower.m)}</small></b></div>
      <div><span>COLOR</span><b>${esc(W.color.w)}<i class="sw" style="background:${W.color.hex}"></i></b></div>
      <div><span>WEATHER</span><b>${esc(W.weather.w)}</b></div>
      ${ex.length ? `<div class="exr">${ex.map(([k, w, en]) => `<em><span>${en}</span>${esc(w)}</em>`).join('')}</div>` : ''}
    </div>
    <p class="line">${esc(rec.res.line)}</p>
    <div class="cfoot"><span class="lg">One a Day</span><span>oneaday.kr — 너도 물어봐</span></div></div></div>`;
}

/* ── 운세 탭 진입 카드 (탭 톤: 먹 · 금 테 · 말풍선) ── */
export function entry(c, f) {
  if (!eligible(c)) return '';
  const rec = todayRec(c), W = rec && words(rec);
  if (W) return `<div class="owentry done" data-ow-open ${'tabindex="0" role="button"'}><div class="owel"><span>HOW AI SEES ME · 오늘의 한 단어</span><span class="ok">받음</span></div>
    <div class="owmini"><div class="owsw" style="background:${W.color.hex}">${flowerSvg(W.flower.hex, 64)}</div><div><b>오늘의 당신은 ${esc(W.flower.w)}</b><small>${esc(W.color.w)} · ${esc(W.weather.w)}</small><p>${esc(rec.res.line)}</p></div></div>
    <div class="owgo">카드 다시 보기 · 저장 · 공유 ${ic('arrow')}</div></div>`;
  return `<div class="owentry" data-ow-open tabindex="0" role="button"><div class="owel"><span>HOW AI SEES ME</span><span class="nb">NEW · 하루 1번 무료</span></div>
    <div class="bub q">나를 한 단어로 표현해 줘</div><div class="bub a typing"><i></i><i></i><i></i></div>
    <h3>오늘의 나는<br>무슨 꽃 · 무슨 색 · 무슨 날씨?</h3>
    <p>가벼운 질문 다섯 개 · 30초 · 오늘 일진(${esc(f && f.today ? f.today.ko + '일' : OW.EL_KO[OW.ilgin(dayOf(c))])})과 함께 봐요</p>
    <div class="owgo btn">한 단어 받기 ${ic('arrow')}</div>
    <div class="ownote">${AI_NOTE}</div></div>`;
}

/* ── 겹 화면 ── */
function host() {
  let el = document.getElementById('ow');
  if (!el) {
    el = document.createElement('div'); el.id = 'ow'; document.body.append(el);
    el.addEventListener('click', onClick);
  }
  document.body.style.overflow = 'hidden';
  return el;
}
export function close() { const el = document.getElementById('ow'); if (el) el.remove(); document.body.style.overflow = ''; S = null; if (C && C.onClose) C.onClose(); }
export function open(c, how = 'tab') {
  C = c; const day = dayOf(c), il = OW.ilgin(day), rec = todayRec(c);
  if (rec) { S = { ...rec, scr: 'result' }; } else { S = { day, il, a: [], scr: 'q1' }; c.T.track('oneword_start', { from: how }); }
  draw();
}
function draw() {
  const el = host(), s = S.scr;
  el.className = 'ow';
  el.innerHTML = s[0] === 'q' ? question(+s.slice(1)) : s === 'reveal' ? reveal() : s === 'nr' ? neorang() : result();
  fitWords(el); if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitWords(el));
  if (s === 'reveal') afterReveal();
}
function question(n) {
  const d = OW.QUESTIONS[n - 1], sel = S.a[n - 1];
  const hist = OW.QUESTIONS.slice(0, n - 1).map((h, k) => `<div class="bub ai sm">${h.q}</div><div class="bub me sm">${h.o[S.a[k]][0]}</div>`).join('');
  const opts = d.o.map((o, i) => `<button class="opt${sel === i ? ' on' : ''}${d.sw ? ' swopt' : ''}" data-ans="${n}:${i}">${d.sw ? `<i class="chipc" style="background:${o[3]}"></i>` : `<i class="ix">${'abcd'[i]}.</i>`}<span>${o[0]}</span></button>`).join('');
  return `<div class="owq"><div class="qhdr"><button class="ib" data-ow="${n === 1 ? 'close' : 'q' + (n - 1)}" aria-label="${n === 1 ? '닫기' : '뒤로'}">${ic(n === 1 ? 'x' : 'back')}</button><div class="prog"><i style="width:${n * 20}%"></i></div><span class="qn">${n} / 5</span></div>
    <div class="qbody"><div class="hist">${hist}</div><div class="who">ONE A DAY · AI</div><div class="bub ai">${d.q}${d.sub ? `<small>${d.sub}</small>` : ''}</div></div>
    <div class="opts${d.sw ? ' grid' : ''}">${opts}</div><div class="qfoot">${AI_NOTE}</div></div>`;
}
function reveal() {
  const ph = S.ph || 0, rec = S.res ? S : { day: S.day };
  return `<div class="owrv ph${ph}"><div class="rvbg" style="--c:${S.res ? words(S).color.hex : '#EFA58A'}"></div>
    <div class="rvtop"><b>THINKING</b> · 답 다섯 개 + 오늘 일진 ${OW.EL_KO[S.il]}</div>
    <div class="flip" data-ow="flip"><div class="fi"><div class="face fr">${S.res ? card(S) : ''}</div><div class="face bk">${card(rec, true)}</div></div></div>
    <div class="dust">${Array.from({ length: 18 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 6) * .25}s;--s:${.5 + (i % 3) * .4}"></i>`).join('')}</div>
    <div class="rvhint">${ph === 0 ? (S.res ? '카드를 눌러 뒤집어요' : 'AI 가 답하는 중…') : 'AI 가 답하는 중…'}</div><div class="ownote dk">${AI_NOTE}</div></div>`;
}
function result() {
  const W = words(S), bought = S.bought || {}, left = OW.EXTRA_KEYS.filter(k => !bought[k]);
  return `<div class="owres"><div class="rhdr"><button class="ib" data-ow="close" aria-label="닫기">${ic('x')}</button><b>오늘의 한 단어</b><span class="aipill"><b>AI</b> ${S.res.by === 'ai' ? '생성' : '선택'}</span></div>
    <div class="preview">${card(S)}</div>
    <div class="share"><button class="sb main" data-ow="save">${ic('dl')}<span>그림 저장</span></button><button class="sb" data-ow="link">${ic('link')}<span>링크 보내기</span></button></div>
    ${left.length ? `<button class="morerow" data-ow="more"><span class="mt"><b>단어 더 받기</b><small>${left.map(k => OW.EXTRA[k].ko).join(' · ')} — 카드에 함께 실려요</small></span><span class="mp"><i class="coin"></i>${PRICE.season}~</span></button>` : '<div class="morerow done"><span class="mt"><b>계절 · 동물 · 향까지 다 받았어요</b><small>카드 아래 줄에 함께 실렸어요</small></span></div>'}
    ${C.R.PROD ? '' : `<button class="nrrow" data-ow="nr"><img src="fortune/char/ow-jaeha.webp" alt=""><span class="mt"><b>재하에게 이 단어 보여 주기</b><small>너랑 캐릭터가 '${esc(W.flower.w)}'로 먼저 인사해요</small></span>${ic('arrow')}</button>`}
    <p class="ownote">${AI_NOTE} · 하루 한 번, 내일 또 새 카드</p></div>`;
}
function moreSheet() {
  const bought = S.bought || {}, left = OW.EXTRA_KEYS.filter(k => !bought[k]), acc = acct(), gold = acc.current() ? ((acc.current().gold || {}).total || 0) : null, arm = S.arm || '';
  const rows = OW.EXTRA_KEYS.map(k => {
    if (bought[k]) { const w = OW.extraWord(k, S.a, S.il, S.day); return `<div class="mrow got${S.fresh && S.fresh.includes(k) ? ' reveal' : ''}"><span class="mk">${OW.EXTRA[k].ko}</span><span class="mw"><b>${esc(w.w)}</b><small>${esc(exNote(k, w))}</small></span><span class="gotb">받음 ✓</span></div>`; }
    return `<div class="mrow"><span class="mk">${OW.EXTRA[k].ko}</span><span class="mw"><i>○○○</i>${ic('lock')}</span><button class="buy${arm === k ? ' arm' : ''}" data-owbuy="${k}">${arm === k ? `${PRICE[k]} 골드 쓰기` : `${PRICE[k]} 골드`}</button></div>`;
  }).join('');
  /* 셋 묶음: 하나도 안 샀을 때만 (서버 묶음 값이 70 고정 · 산 줄이 있으면 남은 줄만 낱개로) */
  const off = PRICE.season * 3 - PRICE.all3;
  const bundle = left.length === 3 ? `<button class="bundle${arm === 'all3' ? ' arm' : ''}" data-owbuy="all3"><span><b>${arm === 'all3' ? '한 번 더 누르면 받아요' : '셋 다 받기'}</b><small>계절 · 동물 · 향 · ${off} 골드 아낌</small></span><span class="bp">${arm === 'all3' ? `${PRICE.all3} 골드 쓰기` : `<s>${PRICE.season * 3}</s>${PRICE.all3} 골드`}</span></button>` : '';
  return `<div class="owdim" data-ow="sheet-close"></div><div class="owsheet"><div class="grab"></div>
    <div class="shd"><b>단어 더 받기</b>${gold != null ? `<span class="gold"><i class="coin"></i>${C.gnum(gold)}</span>` : ''}</div>
    <p class="shs">${left.length ? '오늘의 당신을 세 단어 더. 받은 단어는 카드 아래 줄에 함께 실려요.' : '세 단어를 다 받았어요. 닫으면 카드 아래 줄에서 볼 수 있어요.'}</p>${rows}${bundle}
    ${left.length ? '' : '<button class="shdone" data-ow="sheet-close">카드에서 보기</button>'}
    <p class="shn">확률 없이 오늘 답에 맞는 단어를 그대로 보여 줘요 · 오늘 카드에만 · 같은 날 다시 사도 한 번만 빠져요</p></div>`;
}
function sheetDraw() { document.querySelectorAll('#ow .owdim,#ow .owsheet').forEach(x => x.remove()); host().insertAdjacentHTML('beforeend', moreSheet()); const sh = document.querySelector('#ow .owsheet'); if (sh) sh.style.animation = 'none'; }
function sheetClose() {
  const had = S.fresh && S.fresh.length; S.fresh = null; S.arm = '';
  document.querySelectorAll('#ow .owdim,#ow .owsheet').forEach(x => x.remove());
  if (!had) return;
  S.scr = 'result'; draw();
  const ex = document.querySelector('#ow .owres .exr'), box = document.querySelector('#ow .owres');
  if (ex && box) { box.scrollTop = 0; const r = ex.getBoundingClientRect(); if (r.bottom > innerHeight - 20) box.scrollTop += r.bottom - innerHeight + 80; ex.classList.add('flash'); }
}
function neorang() {
  const W = words(S);
  return `<div class="ownr"><div class="nrhero"><img src="fortune/char/ow-jaeha.webp" alt=""><div class="nrshade"></div>
    <div class="nrtop"><button class="ib dk" data-ow="result" aria-label="뒤로">${ic('back')}</button><span class="nm"><b>윤재하</b><small>심야 라디오 「자정의 주파수」 DJ</small></span><span class="aipill"><b>AI</b> 캐릭터</span></div></div>
    <div class="nrchat"><div class="sys">오늘의 한 단어 카드를 보냈어요</div><div class="sent"><div class="thumb">${card(S)}</div></div>
      <div class="say"><b>재하</b><p>…${esc(W.flower.w)} 씨. 오늘은 그렇게 불러도 돼요?</p></div>
      <div class="say"><p>${esc(W.weather.w)} 같은 목소리네요. 오늘 첫 곡은 그 공기로 골라 둘게요. 사연 하나만 보내 줘요 — 오늘 피어난 일이든, 아직 오므린 일이든.</p></div></div>
    <button class="nrgo" data-ow="nrgo">너랑에서 재하와 이어 가기 ${ic('arrow')}</button></div>`;
}

/* ── 서버 · 규칙 ── */
async function decide() {
  const cand = OW.candidates(S.a, S.il, S.day), seed = OW.seedOf(S.day, S.il, S.a);
  let pick = null, line = '', by = 'rule';
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch('/api/oneword', { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ d: did(), day: S.day, a: S.a, c: OW.wireCand(cand) }) });
    clearTimeout(t);
    const j = r.ok ? await r.json() : null;
    if (j && j.pick && j.il === S.il) { pick = Object.fromEntries(['flower', 'color', 'weather'].map(k => [k, cand[k][j.pick[k]] || null])); line = j.line || ''; by = j.by === 'cache' ? 'ai' : j.by; }
  } catch { /* 규칙으로 */ }
  if (!pick || !pick.flower || !pick.color || !pick.weather) { pick = OW.pickRule(cand, seed); by = 'rule'; line = ''; }
  if (!line) line = OW.ruleLine(S.a, seed, pick);
  return { f: pick.flower.id, c: pick.color.id, w: pick.weather.id, line, by };
}
function afterReveal() {
  if (S.pending) return;
  S.pending = true; const t0 = Date.now();
  decide().then(res => {
    S.res = res; save({ day: S.day, il: S.il, a: S.a, res, bought: {} });
    C.T.track('oneword_done', { by: res.by, f: res.f });
    setTimeout(() => { if (!S || S.scr !== 'reveal') return; draw(); setTimeout(() => S && S.scr === 'reveal' && !S.flipped && !window.__owHold && flip(), 2200);   /* __owHold: 폰 시험이 뒤집기 전 화면을 찍을 때만 */ }, Math.max(0, 1200 - (Date.now() - t0)));
  });
}
function flip() {
  if (!S.res || S.flipped) return; S.flipped = true;
  const r = document.querySelector('.owrv'); if (!r) return;
  r.classList.remove('ph0'); r.classList.add('ph1'); r.querySelector('.rvhint').textContent = '오늘의 당신이 피어나는 중…';
  setTimeout(() => r.classList.replace('ph1', 'ph2'), 650);
  setTimeout(() => { if (S && S.scr === 'reveal') { S.scr = 'result'; draw(); } }, 2100);
}

/* ── 저장 그림 (1080×1920 · 결과 카드와 같은 배치) ── */
export async function cardBlob(rec) {
  const W = words(rec), ex = extrasOf(rec), cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1920;
  const x = cv.getContext('2d'), u = 10.8, col = W.color.hex;
  const SERIF = "'Nanum Myeongjo','AppleMyungjo','Noto Serif KR','Noto Serif CJK KR',serif", MONO = "ui-monospace,'SF Mono',Menlo,monospace", SANS = "-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif";
  x.fillStyle = '#F3EEE7'; x.fillRect(0, 0, 1080, 1920);
  const blob = (cx, cy, r, c, a) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, c + Math.round(a * 255).toString(16).padStart(2, '0')); g.addColorStop(1, c + '00'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1920); };
  blob(842, 345, 620, mix(col, '#FFFFFF', .1), .8); blob(194, 768, 520, '#F7D6CF', .85); blob(756, 1382, 640, '#F6DEAA', .7); blob(108, 1766, 520, mix(col, '#FFFFFF', .2), .45);
  await new Promise(res => { const im = new Image(); im.onload = () => { x.save(); x.globalAlpha = .5; try { x.filter = 'blur(8px)'; } catch { /* */ } x.drawImage(im, 34 * u, 34 * u, 62 * u, 62 * u); x.restore(); res(); }; im.onerror = res; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(flowerSvg(W.flower.hex, 600)); });
  x.fillStyle = '#23201D'; x.textBaseline = 'alphabetic';
  x.font = `500 ${2.7 * u}px ${MONO}`; x.textAlign = 'left'; x.fillText('HOW AI SEES ME — TODAY', 8 * u, 11 * u); x.textAlign = 'right'; x.fillText(dateDot(rec.day), 92 * u, 11 * u);
  const bubble = (txt, right, top, bg, bold) => { x.font = `${bold ? 700 : 400} ${3.7 * u}px ${SANS}`; const w = x.measureText(txt).width + 7.2 * u, h = 8.6 * u, l = right ? 92 * u - w : 8 * u; x.fillStyle = bg; x.beginPath(); x.roundRect(l, top, w, h, [4.6 * u, 4.6 * u, right ? 1.4 * u : 4.6 * u, right ? 4.6 * u : 1.4 * u]); x.fill(); x.fillStyle = '#23201D'; x.textAlign = 'left'; x.fillText(txt, l + 3.6 * u, top + 5.7 * u); };
  bubble('나는 오늘 무슨 꽃이야?', true, 17 * u, 'rgba(255,255,255,.6)'); bubble(W.flower.w + '.', false, 27 * u, '#FFFFFF', true);
  let fs = 38 * u; x.font = `800 ${fs}px ${SERIF}`;   /* 화면 카드와 같이: 실제 폭을 재서 88% 안에 맞춤 */
  while (x.measureText(W.flower.w).width > 88 * u && fs > 6 * u) { fs *= .95; x.font = `800 ${fs}px ${SERIF}`; }
  x.fillStyle = '#23201D'; x.textAlign = 'left'; x.fillText(W.flower.w, 6 * u, 44 * u + (38 * u - fs) * .45 + fs * .86);
  const rows = [['FLOWER', W.flower.w], ['COLOR', W.color.w], ['WEATHER', W.weather.w]]; let y = (ex.length ? 96 : 103) * u;
  x.strokeStyle = 'rgba(35,32,29,.55)'; x.lineWidth = 2; x.beginPath(); x.moveTo(8 * u, y); x.lineTo(92 * u, y); x.stroke();
  for (const [k, v] of rows) {
    x.font = `500 ${2.7 * u}px ${MONO}`; x.fillStyle = '#6F6760'; x.textAlign = 'left'; x.fillText(k, 8 * u, y + 6.4 * u);
    x.font = `700 ${4.4 * u}px ${SERIF}`; x.fillStyle = '#23201D'; x.textAlign = 'right'; const vx = 92 * u - (k === 'COLOR' ? 4.6 * u : 0); x.fillText(v, vx, y + 6.6 * u);
    if (k === 'COLOR') { x.fillStyle = col; x.beginPath(); x.arc(92 * u - 1.5 * u, y + 5.2 * u, 1.5 * u, 0, 7); x.fill(); }
    y += 9.6 * u; x.strokeStyle = 'rgba(35,32,29,.18)'; x.beginPath(); x.moveTo(8 * u, y); x.lineTo(92 * u, y); x.stroke();
  }
  if (ex.length) {   /* 카드 아래 줄: SEASON · ANIMAL · SCENT 세 칸 (산 것만) */
    x.textAlign = 'left'; const cw = 84 * u / 3;
    ex.forEach(([, v, en], i) => { const x0 = 8 * u + i * cw; x.font = `500 ${2.4 * u}px ${MONO}`; x.fillStyle = '#6F6760'; x.fillText(en, x0, y + 4.6 * u);
      let f = 4.2 * u; x.font = `800 ${f}px ${SERIF}`; while (x.measureText(v).width > cw - 2 * u && f > 2 * u) { f *= .94; x.font = `800 ${f}px ${SERIF}`; } x.fillStyle = '#23201D'; x.fillText(v, x0, y + 10 * u); });
    y += 12.6 * u; x.strokeStyle = 'rgba(35,32,29,.18)'; x.beginPath(); x.moveTo(8 * u, y); x.lineTo(92 * u, y); x.stroke();
  }
  x.font = `700 ${4.9 * u}px ${SERIF}`; x.fillStyle = '#23201D'; x.textAlign = 'left';
  let ln = '', ly = y + 9 * u; for (const wd of rec.res.line.split(' ')) { if (x.measureText(ln + wd).width > 84 * u && ln) { x.fillText(ln.trim(), 8 * u, ly); ln = ''; ly += 7.6 * u; } ln += wd + ' '; } x.fillText(ln.trim(), 8 * u, ly);
  x.font = `${4.2 * u}px Jua, ${SANS}`; x.fillText('One a Day', 8 * u, 1920 - 7 * u); x.font = `500 ${2.6 * u}px ${MONO}`; x.textAlign = 'right'; x.fillText('oneaday.kr — 너도 물어봐', 92 * u, 1920 - 7 * u);
  return new Promise(res => cv.toBlob(res, 'image/png'));
}

/* ── 누르기 ── */
let armT = 0;
/* 폰 시험만: 가짜 계정(로그인 · 골드 차감 흐름) — 테스트 빌드에서만 */
const acct = () => (!C.R.PROD && window.__owTestA) || C.A;
async function buy(k) {
  const A = acct();
  if (!A.ON) return C.toast('골드는 곧 열려요');
  if (!A.current()) { C.needLogin('골드로 단어를 더 받으려면 로그인해 주세요'); const sh = document.getElementById('sheet'); if (sh) sh.classList.add('over'); return; }
  const price = PRICE[k], gold = (A.current().gold && A.current().gold.total) || 0;
  if (gold < price) { C.toast(`골드가 ${C.gnum(price - gold)}개 모자라요`); return; }
  if (S.arm !== k) { S.arm = k; sheetDraw(); clearTimeout(armT); armT = setTimeout(() => { if (S && S.arm === k) { S.arm = ''; if (document.querySelector('#ow .owsheet')) sheetDraw(); } }, 4000); return; }   /* 한 번 누르면 '쓰기'로 바뀌고 한 번 더 누르면 차감 (실수 방지) */
  clearTimeout(armT); S.arm = '';
  const btn = document.querySelector(`#ow [data-owbuy="${k}"]`); if (btn) { btn.disabled = true; btn.textContent = '받는 중…'; }
  const got = () => {
    const keys = k === 'all3' ? OW.EXTRA_KEYS : [k], bought = { ...(S.bought || {}) }; keys.forEach(x => { bought[x] = 1; });
    S.bought = bought; S.fresh = [...new Set([...(S.fresh || []), ...keys])]; save({ day: S.day, il: S.il, a: S.a, res: S.res, bought });
    sheetDraw();
  };
  try {
    await A.call({ act: 'use', game: 'oneword', item: k, ref: `ow-${S.day.replace(/-/g, '')}-${k}` });
    C.T.track('oneword_buy', { item: k, gold: price }); got();
  } catch (e) {
    /* 오늘 이미 산 기록(하루 1번 · 앞 요청의 답만 놓친 경우)이면 받은 것으로 */
    if (e && e.reason === 'limit') { C.T.track('oneword_buy', { item: k, gold: 0, again: 1 }); got(); return; }
    sheetDraw(); C.toast((e && e.message) || '다시 시도해 주세요');
  }
}
async function onClick(e) {
  const a = e.target.closest('[data-ans]');
  if (a) { const [n, i] = a.dataset.ans.split(':').map(Number); S.a = S.a.slice(0, n - 1); S.a[n - 1] = i; draw(); setTimeout(() => { if (!S) return; S.scr = n < 5 ? 'q' + (n + 1) : 'reveal'; S.ph = 0; draw(); }, 320); return; }
  const b = e.target.closest('[data-owbuy]'); if (b) return buy(b.dataset.owbuy);
  const g = e.target.closest('[data-ow]'); if (!g) return;
  const k = g.dataset.ow;
  if (k === 'close') return close();
  if (k === 'flip') return flip();
  if (/^q\d$/.test(k) || k === 'result') { S.scr = k; return draw(); }
  if (k === 'more') { S.arm = ''; S.fresh = null; host().insertAdjacentHTML('beforeend', moreSheet()); C.T.track('oneword_more'); return; }
  if (k === 'sheet-close') return sheetClose();
  if (k === 'nr') { S.scr = 'nr'; C.T.track('oneword_nr'); return draw(); }
  if (k === 'nrgo') { close(); return C.go('neorang', 'oneword'); }
  if (k === 'save') { g.disabled = true; try { const how = await C.saveImage(await cardBlob(S), `oneaday-${S.day}-oneword.png`); C.T.track('oneword_save', { how }); } finally { g.disabled = false; } return; }
  if (k === 'link') { const W = words(S); const how = await C.shareLink(`오늘의 나는 ${W.flower.w} · 너는 무슨 꽃이야?`, `AI 가 본 오늘의 나는 ${W.flower.w} · ${W.color.w} · ${W.weather.w} — 너도 30초면 받아 →`, `${C.shareBase()}s/w/${W.flower.id}.html`); C.T.track('oneword_share', { how, f: W.flower.id }); }
}

/* 공유 링크로 온 사람: ?from=oneword&f=<꽃 id> → 친구의 꽃 한 줄 + 내 카드 받기 */
export function landing(c, fid) {
  const fl = OW.flowerById(fid);
  c.openSheet(`<div class="intro owland"><h2>친구는 오늘 <em>${fl ? esc(fl.w) : '꽃'}</em>이래요</h2>${fl ? `<div class="owlf">${flowerSvg(fl.hex, 96)}<p>꽃말 · ${esc(fl.m)}</p></div>` : ''}
    <p class="fsub">질문 다섯 개면 오늘의 나는 무슨 꽃 · 색 · 날씨인지 카드로 받아요 (30초 · 무료)</p>
    <div class="stack"><button class="btn" data-ow-open>내 한 단어 받기</button><button class="btn ghost" data-close>나중에</button></div></div>`);
}
