// 화면 공통 도구 — 짧은 안내 · 창 · 종이 조각 · 칭찬 · 속도(?fast=1 시험용)
export const $ = s => document.querySelector(s);
export const app = document.querySelector('#app');
const Q = new URLSearchParams(location.search);
export const SPD = Q.get('fast') === '1' ? 0.15 : 1;
export const sp = ms => Math.max(1, ms * SPD);

let tt = 0;
export function toast(s) { const e = $('#toast'); e.textContent = s; e.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => e.classList.remove('on'), sp(1700)); }

/* 창: 안의 [data-a] 버튼을 누르면 handler(a, event) */
let handler = null;
export function modal(html, h) { const m = $('#modal'); m.innerHTML = `<div class="card">${html}</div>`; m.classList.add('on'); handler = h || null; }
export function closeModal() { $('#modal').classList.remove('on'); handler = null; }
$('#modal').addEventListener('click', e => { const el = e.target.closest('[data-a],[data-r]'); if (!el) return; const a = el.dataset.a; if (handler) handler(a, e); else if (a === 'close') closeModal(); });

const PAPER = ['#f3d9d3', '#e9dcc0', '#c9d8c4', '#f6efe1', '#e3c98d', '#d9a5a0', '#b9c9d6'];
export function burst(x, y, n, gold, parent = app) {
  if (SPD < 1) return;
  for (let i = 0; i < n; i++) {
    const b = document.createElement('div'); b.className = 'bit'; const w = 5 + Math.random() * 7, h = 3 + Math.random() * 6;
    b.style.width = w + 'px'; b.style.height = h + 'px'; b.style.background = gold && i % 2 ? '#e3c98d' : PAPER[i % PAPER.length];
    parent.appendChild(b);
    const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 60, dx = Math.cos(a) * d, dy = Math.sin(a) * d - 20, r = (Math.random() - .5) * 540;
    b.animate([{ transform: `translate(${x}px,${y}px) rotate(0)`, opacity: 1 }, { transform: `translate(${x + dx}px,${y + dy}px) rotate(${r / 2}deg)`, opacity: 1, offset: .5 }, { transform: `translate(${x + dx * 1.2}px,${y + dy + 50}px) rotate(${r}deg)`, opacity: 0 }], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.4,1)' }).onfinish = () => b.remove();
  }
}
export function praise(x, y, txt) {
  if (SPD < 1) return;
  const p = document.createElement('div'); p.className = 'praise'; p.textContent = txt; app.appendChild(p);
  const W = app.clientWidth, w = p.offsetWidth, xx = Math.max(8, Math.min(W - w - 8, x - w / 2));
  p.animate([{ transform: `translate(${xx}px,${y}px) scale(.6)`, opacity: 0 }, { transform: `translate(${xx}px,${y - 14}px) scale(1.08)`, opacity: 1, offset: .25 }, { transform: `translate(${xx}px,${y - 30}px) scale(1)`, opacity: 0 }], { duration: 900, easing: 'ease-out' }).onfinish = () => p.remove();
}
export const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
