// 오늘 페이지 — 날마다 다른 세트 · 틀 7종(자리 · 속지 · 테이프) · 내가 고르는 기분 도장/한 줄 · 날짜 도장 '쿵' · 공유 카드(9:16)
//   운세 한 줄은 운영 연동 전까지 숨김 (dd.fortune 이 오면 그 자리에 씀)
import { img, nameOf, PAGE_TPL, MOODS, linesFor, dailySet } from './data.js?v=0.91.6';
import { S, day, dayKey, parseDay, save } from './save.js?v=0.91.6';
import * as A from './audio.js?v=0.91.6';
import { $, sp, DAYS, toast, modal, closeModal, moodSVG, esc } from './ui.js?v=0.91.6';

export function pickStickers(got, k) {
  const { lucky, tpl } = dailySet(k); const spots = PAGE_TPL[tpl].spots;
  const uniq = [...new Set(got)]; if (lucky != null && !uniq.includes(lucky)) uniq.unshift(lucky);
  const out = uniq.slice(0, spots.length); if (lucky != null && !out.includes(lucky)) out[out.length - 1] = lucky;
  return out.map((ty, i) => { const [fx, fy, fw, rot] = spots[i]; return { ty, fx, fy, fw, rot }; });
}

export function stampSVG(k, missed = false) {
  const d = parseDay(k); const mm = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  const c = missed ? '#9a8f84' : '#b4473a';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><filter id="ink${missed ? 'm' : ''}"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.45"/><feComposite in="SourceGraphic" operator="in"/></filter>
  <path id="arc" d="M 11 64 A 49 49 0 1 1 109 64"/></defs>
  <g filter="url(#ink${missed ? 'm' : ''})" fill="none" stroke="${c}"><circle cx="60" cy="60" r="57" stroke-width="3.4" ${missed ? 'stroke-dasharray="6 4"' : ''}/><circle cx="60" cy="60" r="40" stroke-width="1.2"/>
  <text fill="${c}" stroke="none" font-family="Pretendard" font-weight="800" font-size="10" letter-spacing="1.2"><textPath href="#arc" startOffset="50%" text-anchor="middle">ONE A DAY · ${missed ? '쉬어 간 날' : '오늘의 다꾸'}</textPath></text>
  <text x="60" y="${missed ? 62 : 70}" fill="${c}" stroke="none" text-anchor="middle" font-family="Pretendard" font-weight="800" font-size="${missed ? 22 : 27}">${mm}.${dd}</text>
  <text x="60" y="${missed ? 84 : 89}" fill="${c}" stroke="none" text-anchor="middle" font-family="Pretendard" font-weight="800" font-size="${missed ? 13 : 11}">${missed ? '놓친 날' : DAYS[d.getDay()] + '요일'}</text>
  ${missed ? '' : '<path d="M38 98 l6 -4 l6 4 l6 -4 l6 4 l6 -4 l6 4 l6 -4" stroke-width="1.4"/>'}</g></svg>`;
}
const moodOf = id => MOODS.find(m => m.id === id);

/* 페이지 그리기 (animate = 오늘 완성 장면 · 아니면 다시 보기) */
export function renderPage(pg, k, { animate = false, missed = false } = {}) {
  const d = parseDay(k), dd = S.days[k];
  const tpl = PAGE_TPL[dd?.tpl ?? dailySet(k).tpl];
  pg.dataset.paper = missed ? 'dot' : tpl.paper;
  pg.querySelectorAll('.pst,.stamp,.bit,.mood,.ptape').forEach(e => e.remove());
  pg.querySelector('.head').innerHTML = `<b>${d.getMonth() + 1}월 ${d.getDate()}일</b><span>${DAYS[d.getDay()]}요일 · ${missed ? '쉬어 간 날 · 괜찮아요' : '오늘의 다꾸'}</span>`;
  const text = dd?.fortune || dd?.line || '';
  const line = pg.querySelector('.line'); line.textContent = text; line.style.display = text ? '' : 'none';
  /* 틀의 마테 테이프 두 줄 (페이지 모서리) */
  if (!missed) tpl.tape.forEach((c, i) => { const t = document.createElement('i'); t.className = 'ptape'; t.style.background = c; t.style.cssText += i ? ';left:-4%;bottom:14%;transform:rotate(-38deg)' : ';right:30%;top:1.6%;transform:rotate(3deg)'; pg.appendChild(t); });
  const list = missed ? [] : (dd?.stickers || []);
  const PW = pg.clientWidth || 390, PH = pg.clientHeight || 844, H = innerHeight, W = innerWidth;
  list.forEach((s_, i) => {
    const w = PW * s_.fw, x = PW * s_.fx, y = PH * s_.fy;
    const e = document.createElement('div'); e.className = 'pst' + (String(s_.ty).startsWith('f') ? ' foil' : ''); e.style.width = e.style.height = w + 'px';
    e.innerHTML = `<img src="${img(s_.ty)}" alt="${nameOf(s_.ty)}">` + (i === 1 || i === 5 ? `<i class="tape" style="background:${tpl.tape[i === 1 ? 0 : 1]};opacity:.8;transform:rotate(${-s_.rot - 6}deg)"></i>` : '');
    pg.appendChild(e);
    const fin = `translate(${x}px,${y}px) rotate(${s_.rot}deg)`; e.style.transform = fin;
    if (!animate) return;
    e.style.opacity = 0;
    setTimeout(() => {
      e.style.opacity = 1;
      e.animate([{ transform: `translate(${W / 2 - w / 2}px,${H + 40}px) rotate(${s_.rot * 3}deg) scale(1.5)` },
        { transform: `translate(${x}px,${y - 18}px) rotate(${s_.rot}deg) scale(1.22)`, offset: .72 },
        { transform: `translate(${x}px,${y}px) rotate(${s_.rot}deg) scale(.95,.93)`, offset: .88 },
        { transform: fin }], { duration: sp(520), easing: 'cubic-bezier(.3,.7,.4,1)' });
      setTimeout(() => { A.stick(i); dust(pg, x + w / 2, y + w / 2, w); }, sp(460));
    }, sp(650 + i * 280));
  });
  const stamps = (anim) => {
    const s = document.createElement('div'); s.className = 'stamp'; s.innerHTML = stampSVG(k, missed); pg.appendChild(s);
    const m = !missed && dd?.mood && moodOf(dd.mood);
    if (m) { const e = document.createElement('div'); e.className = 'mood'; e.innerHTML = moodSVG(m); pg.appendChild(e); if (!anim) e.style.opacity = 1; else e.animate([{ opacity: 0, transform: 'scale(1.7) rotate(14deg)' }, { opacity: 1, transform: 'scale(1) rotate(8deg)' }], { duration: sp(320), delay: sp(420), easing: 'cubic-bezier(.5,0,.7,1)', fill: 'forwards' }); }
    if (!anim) { s.style.opacity = missed ? .75 : .9; s.style.transform = 'rotate(-10deg)'; return; }
    s.animate([{ opacity: 0, transform: 'scale(1.9) rotate(-22deg)' }, { opacity: .95, transform: 'scale(.94) rotate(-9deg)', offset: .7 }, { opacity: .9, transform: 'scale(1) rotate(-10deg)' }], { duration: sp(360), easing: 'cubic-bezier(.5,0,.7,1)', fill: 'forwards' });
    setTimeout(() => { A.stamp(); pg.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(1px,2px)' }, { transform: 'translate(0,0)' }], { duration: 120 }); }, sp(250));
    if (m) setTimeout(() => A.stamp(), sp(680));
  };
  if (!animate) { if (dd?.done || missed) stamps(false); return 0; }
  /* 오늘 완성: 스티커가 다 붙으면 → 기분 · 한 줄 고르기 → 도장 '쿵' */
  const tEnd = 650 + list.length * 280 + 400;
  return new Promise(res => setTimeout(() => choose(k, () => { const t2 = (dd?.fortune || dd?.line || ''); line.textContent = t2; line.style.display = t2 ? '' : 'none'; stamps(true); setTimeout(res, sp(1100)); }), sp(tEnd)));
}
function dust(pg, x, y, w) { if (sp(1) < 1) return; for (let i = 0; i < 8; i++) { const b = document.createElement('div'); b.className = 'bit'; b.style.width = b.style.height = '4px'; b.style.borderRadius = '50%'; b.style.background = 'rgba(120,95,70,.35)'; pg.appendChild(b); const a = (i / 8) * Math.PI * 2, r = w * 0.5; b.animate([{ transform: `translate(${x + Math.cos(a) * r * .8}px,${y + Math.sin(a) * r * .8}px)`, opacity: .8 }, { transform: `translate(${x + Math.cos(a) * r * 1.15}px,${y + Math.sin(a) * r * 1.15}px)`, opacity: 0 }], { duration: 380, easing: 'ease-out' }).onfinish = () => b.remove(); } }

/* 내가 고르는 한 가지: 오늘 기분 도장(필수 · 하나) + 한 줄(고르기 · 직접 쓰기 · 건너뛰기) */
function choose(k, done) {
  const dd = day(k); let mood = dd.mood || null, line = dd.line || '';
  const lines = linesFor(k);
  const draw = () => modal(`<h3>오늘은 어떤 하루였어요?</h3><p>도장 하나를 골라 페이지에 찍어요.</p>
    <div class="moods">${MOODS.map(m => `<button data-a="mood" data-m="${m.id}" class="${mood === m.id ? 'on' : ''}">${moodSVG(m)}</button>`).join('')}</div>
    <div class="lines">${lines.map(l => `<button data-a="line" data-l="${esc(l)}" class="${line === l ? 'on' : ''}">${esc(l)}</button>`).join('')}</div><input id="myline" maxlength="20" placeholder="직접 쓰기 (20자까지 · 비워 둬도 돼요)" value="${line && !lines.includes(line) ? esc(line) : ''}">
    <button class="btn main" data-a="stampit" ${mood ? '' : 'disabled'}>${mood ? '도장 찍기' : '기분을 골라 주세요'}</button>`, (a, e) => {
      const el = e.target.closest('[data-a]');
      const typed = () => ($('#myline')?.value || '').trim().slice(0, 20);
      if (a === 'mood') { const t = typed(); if (t) line = t; mood = el.dataset.m; A.click(); draw(); }
      if (a === 'line') { line = line === el.dataset.l ? '' : el.dataset.l; A.click(); draw(); }
      if (a === 'stampit' && mood) { const t = typed(); dd.mood = mood; dd.line = t || line; save(true); closeModal(); done(); }
    });
  draw();
}

/* 오늘 페이지 완성 (3판째 이긴 뒤) */
export function completeToday() {
  const k = dayKey(), dd = day(k);
  if (!dd.done) { dd.tpl = dailySet(k).tpl; dd.stickers = pickStickers(dd.got, k); dd.done = true; dd.at = Date.now(); save(true); }
}

/* ---------- 공유 카드 (9:16 · 1080×1920 · 개인정보 없음) ---------- */
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const svgImg = async s => { const u = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' })); try { return await loadImg(u); } finally { setTimeout(() => URL.revokeObjectURL(u), 1000); } };
export async function makeCard(k) {
  const dd = S.days[k] || { stickers: [] }, d = parseDay(k), tpl = PAGE_TPL[dd.tpl ?? dailySet(k).tpl];
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; const g = c.getContext('2d');
  const bg = await loadImg('assets/page.jpg'); const r = Math.max(1080 / bg.width, 1920 / bg.height); g.drawImage(bg, (1080 - bg.width * r) / 2, (1920 - bg.height * r) / 2, bg.width * r, bg.height * r);
  if (tpl.paper === 'kraft') { g.fillStyle = 'rgba(190,150,100,.28)'; g.fillRect(0, 0, 1080, 1920); }
  if (tpl.paper === 'line') { g.strokeStyle = 'rgba(120,140,170,.22)'; g.lineWidth = 2; for (let y = 420; y < 1920; y += 74) { g.beginPath(); g.moveTo(0, y); g.lineTo(1080, y); g.stroke(); } }
  if (tpl.paper === 'grid') { g.strokeStyle = 'rgba(120,140,120,.16)'; g.lineWidth = 2; for (let y = 0; y < 1920; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(1080, y); g.stroke(); } for (let x = 0; x < 1080; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1920); g.stroke(); } }
  tpl.tape.forEach((col, i) => { g.save(); g.fillStyle = col; g.globalAlpha = .78; if (i) { g.translate(30, 1650); g.rotate(-38 * Math.PI / 180); } else { g.translate(560, 50); g.rotate(3 * Math.PI / 180); } g.fillRect(0, 0, 300, 70); g.restore(); });
  await document.fonts.ready;
  g.fillStyle = '#3a3129'; g.font = '700 84px "Gowun Batang", serif'; g.fillText(`${d.getMonth() + 1}월 ${d.getDate()}일`, 76, 230);
  g.fillStyle = '#6b5d4f'; g.font = '700 40px "Gowun Batang", serif'; g.fillText(`${DAYS[d.getDay()]}요일 · 오늘의 다꾸`, 80, 292);
  const text = dd.fortune || dd.line; if (text) { g.fillStyle = '#4b3f35'; g.font = '64px "Nanum Pen Script", cursive'; wrap(g, text, 80, 400, 600, 66); }
  for (const [i, s_] of dd.stickers.entries()) {
    const im = await loadImg(img(s_.ty)); const w = 1080 * s_.fw, x = 1080 * s_.fx, y = 1920 * s_.fy;
    g.save(); g.translate(x + w / 2, y + w / 2); g.rotate(s_.rot * Math.PI / 180); g.shadowColor = 'rgba(60,40,20,.28)'; g.shadowBlur = 22; g.shadowOffsetY = 10; g.drawImage(im, -w / 2, -w / 2, w, w);
    if (i === 1 || i === 5) { g.shadowColor = 'transparent'; g.rotate((-s_.rot * 2 - 6) * Math.PI / 180); g.fillStyle = tpl.tape[i === 1 ? 0 : 1]; g.globalAlpha = .8; g.fillRect(-w * .17, -w * .56, w * .34, w * .13); }
    g.restore();
  }
  const st = await svgImg(stampSVG(k));
  g.save(); g.translate(1080 * 0.93 - 335 / 2, 1920 * 0.065 + 335 / 2); g.rotate(-10 * Math.PI / 180); g.globalAlpha = .9; g.drawImage(st, -335 / 2, -335 / 2, 335, 335); g.restore();
  const m = dd.mood && moodOf(dd.mood); if (m) { const mi = await svgImg(moodSVG(m)); g.save(); g.translate(1080 * 0.80, 1920 * 0.245); g.rotate(8 * Math.PI / 180); g.globalAlpha = .92; g.drawImage(mi, -95, -95, 190, 190); g.restore(); }
  g.fillStyle = 'rgba(58,49,41,.55)'; g.font = '800 30px Pretendard, sans-serif'; g.textAlign = 'center'; g.fillText('One a Day · 오늘의 다꾸', 540, 1860);
  return c;
}
function wrap(g, s, x, y, mw, lh) { let line = ''; for (const wd of s.split(' ')) { const t = line ? line + ' ' + wd : wd; if (line && g.measureText(t).width > mw) { g.fillText(line, x, y); line = wd; y += lh; } else line = t; } g.fillText(line, x, y); }
export async function openShare(k) {
  const c = await makeCard(k); const url = c.toDataURL('image/png'); const sh = $('#share');
  sh.innerHTML = `<div class="wrap"><img src="${url}" alt="오늘 페이지 카드"><div class="row"><a class="btn main" download="oneaday-diary-${k}.png" href="${url}">이미지 저장</a><button class="btn" data-s="share">공유</button></div><button class="btn" data-s="close">닫기</button></div>`;
  sh.classList.add('on'); window.__card = url;
  sh.onclick = async e => { const a = e.target.dataset?.s; if (a === 'close') sh.classList.remove('on');
    if (a === 'share') { try { const blob = await (await fetch(url)).blob(); const f = new File([blob], `oneaday-diary-${k}.png`, { type: 'image/png' }); if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: '오늘의 다꾸' }); else toast('이 기기에선 이미지 저장을 눌러 주세요'); } catch { /* 공유 창을 닫음 */ } } };
}

/* 썸네일: 실제 페이지(390×844)를 그대로 그려 줄임 → 날짜 도장 · 스티커 전부 · 속지 · 테이프 · 기분 도장이 한 장에 */
export const miniHTML = (k, cap = '') => `<div class="pmini" data-k="${k}"><div class="pagebox"><div class="head"></div><div class="line"></div></div>${cap ? `<figcaption>${cap}</figcaption>` : ''}</div>`;
export function fillMinis(root) {
  root.querySelectorAll(".pmini[data-k]").forEach(w => {
    const pb = w.querySelector('.pagebox'), k = w.dataset.k;
    renderPage(pb, k, { missed: !S.days[k]?.done });
    const fit = () => { const s = w.clientWidth / 390; if (s > 0) pb.style.transform = `scale(${s})`; };
    fit(); requestAnimationFrame(fit);
  });
}
