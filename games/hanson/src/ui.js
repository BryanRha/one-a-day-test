// 화면 도우미 — 고르기 · 토스트 · 모달 · 타이핑 · 반짝이 · 칭찬 띠 · 진동
import * as A from './audio.js?v=0.99.4';
import { pushBack } from './oad.js?v=0.99.4';
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const app = $('#app');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]fast=1/.test(location.search);
export const sp = ms => (reduce ? 1 : ms);
export const wait = ms => new Promise(r => setTimeout(r, sp(ms)));
if (reduce) document.body.classList.add('reduce');
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let haptic = true; export const setHaptic = v => { haptic = v; };
export const buzz = (ms = 12) => { if (haptic && navigator.vibrate) try { navigator.vibrate(ms); } catch { /* */ } };

let tt = 0;
export function toast(msg, ms = 2200) { const t = $('#toast'); t.innerHTML = msg; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), ms); }

/* 모달: html + 버튼 data-a 로 받음 · 뒤로가기 = 닫기(close 핸들러) */
let mClose = null, popBack = null;
export function modal(html, on, { center = false, closable = true } = {}) {
  const m = $('#modal'); m.innerHTML = `<div class="mbox">${html}</div>`; m.classList.toggle('center', center); m.classList.add('on');
  if (popBack) popBack();
  mClose = () => { if (closable) { closeModal(); on && on('close'); } return true; };
  popBack = pushBack(() => mClose());
  m.onclick = e => { const b = e.target.closest('[data-a]'); if (b) { A.tap(); on && on(b.dataset.a, b, e); } else if (e.target === m && closable) mClose(); };
  return m;
}
export function closeModal() { const m = $('#modal'); m.classList.remove('on'); m.innerHTML = ''; if (popBack) { popBack(); popBack = null; } mClose = null; }
export const modalOpen = () => $('#modal').classList.contains('on');

/* 타이핑: 한 글자씩 · 누르면 한 번에 · 끝나면 resolve */
export function typeText(el, text, { speed = 34, cursor = true } = {}) {
  return new Promise(res => {
    let i = 0, done = false; const chars = [...text];
    const fin = () => { if (done) return; done = true; clearInterval(iv); el.innerHTML = esc(text) + (cursor ? '<span class="cursor"></span>' : ''); el.onclick = null; res(); };
    el.innerHTML = cursor ? '<span class="cursor"></span>' : '';
    const iv = setInterval(() => { i++; el.innerHTML = esc(chars.slice(0, i).join('')) + (cursor ? '<span class="cursor"></span>' : ''); if (chars[i - 1] && chars[i - 1] !== ' ') A.type(); if (i >= chars.length) fin(); }, sp(speed));
    el.onclick = fin; el.__skip = fin;
    if (reduce) fin();
  });
}

/* 반짝이 터짐 (단서 찾음 · 동전) */
export function sparks(x, y, n = 12) {
  const f = $('#fly'), r = app.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i'); s.className = 'spark'; s.style.left = (x - r.left) + 'px'; s.style.top = (y - r.top) + 'px'; f.appendChild(s);
    const a = Math.random() * Math.PI * 2, d = 24 + Math.random() * 46;
    s.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d - 4}px, ${Math.sin(a) * d - 4}px) scale(.3)`, opacity: 0 }], { duration: sp(560 + Math.random() * 300), easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => s.remove();
  }
}
/* 칭찬 띠: 화면 위쪽에 잠깐 */
export function praise(text, y = 120) {
  const p = document.createElement('div'); p.className = 'praiseb'; p.textContent = text; p.style.top = y + 'px'; $('#fly').appendChild(p);
  p.animate([{ opacity: 0, transform: 'translate(-50%, 10px) scale(.9)' }, { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: .2 }, { opacity: 1, offset: .8 }, { opacity: 0, transform: 'translate(-50%, -12px)' }], { duration: sp(1500), easing: 'ease-out' }).onfinish = () => p.remove();
}
/* 동전이 날아가 HUD 동전 칩으로 */
export function coinFly(from, to, n = 6) {
  const f = $('#fly'), r = app.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i'); c.className = 'coin coinfly'; f.appendChild(c);
    const x0 = from.x - r.left + (Math.random() - 0.5) * 40, y0 = from.y - r.top + (Math.random() - 0.5) * 20, x1 = to.x - r.left - 11, y1 = to.y - r.top - 11;
    c.animate([{ transform: `translate(${x0}px, ${y0}px) scale(.6)`, opacity: 0 }, { transform: `translate(${x0}px, ${y0 - 30}px) scale(1)`, opacity: 1, offset: .25 }, { transform: `translate(${x1}px, ${y1}px) scale(.8)`, opacity: 1 }], { duration: sp(700 + i * 70), easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = () => c.remove();
  }
}
export const center = el => { const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; };
export const fmt = n => Number(n).toLocaleString('ko-KR');

/* 아이콘 (직접 그린 단순 선) */
export const I = {
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  talk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16v10H9l-5 4z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/></svg>',
  loupe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M8 7h7M8 11h7"/></svg>',
  shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l2-5h14l2 5M4 9v11h16V9M3 9h18M10 20v-6h4v6"/></svg>',
  people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c2.8 0 5 2.2 5 5"/></svg>',
  brush: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4l6 6-8 8H6v-6z"/><path d="M4 21c1-2 2-3 4-3"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 14l-5-5 5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>',
};
