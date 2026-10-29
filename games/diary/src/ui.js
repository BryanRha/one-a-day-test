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
export function modal(html, h, { sheet = false } = {}) { const m = $('#modal'); m.innerHTML = `<div class="card">${html}</div>`; m.classList.toggle('sheet', sheet); m.classList.add('on'); handler = h || null; }
export function closeModal() { $('#modal').classList.remove('on'); handler = null; clearInterval(window.__cd); }
$('#modal').addEventListener('click', e => { const el = e.target.closest('[data-a],[data-r]'); if (!el) return; const a = el.dataset.a; if (handler) handler(a, e); else if (a === 'close') closeModal(); });

/* 종이 조각: 크림 칸 위에서도 보이게 금박 · 세이지 · 도장 빨강을 섞음 */
const PAPER = ['#f3d9d3', '#b8924a', '#9db39a', '#e9dcc0', '#c9a03f', '#d9a5a0', '#7f9a7b', '#b4473a', '#b9c9d6'];
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
  const p = document.createElement('div'); p.className = 'praise'; p.innerHTML = `<span>${txt}</span>`; app.appendChild(p);
  const W = app.clientWidth, w = p.offsetWidth, xx = Math.max(8, Math.min(W - w - 8, x - w / 2));
  p.animate([{ transform: `translate(${xx}px,${y}px) scale(.6)`, opacity: 0 }, { transform: `translate(${xx}px,${y - 14}px) scale(1.08)`, opacity: 1, offset: .25 }, { transform: `translate(${xx}px,${y - 30}px) scale(1)`, opacity: 0 }], { duration: 900, easing: 'ease-out' }).onfinish = () => p.remove();
}
export const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* 우리 아이콘 (금박 선 화풍 · 이모지 대신) */
const sv = (b, vb = '0 0 24 24') => `<svg class="ico" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${b}</svg>`;
export const ICON = {
  ad: sv('<rect x="3" y="5" width="18" height="13" rx="3"/><path d="M10 9.2v4.6l4-2.3z" fill="currentColor"/><path d="M8 21h8"/>'),
  instant: sv('<path d="M13 3 5 13h6l-1 8 8-10h-6z"/>'),
  coin: `<svg class="ico coin" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e2a6"/><stop offset=".55" stop-color="#d1a64e"/><stop offset="1" stop-color="#a87b2e"/></linearGradient></defs><circle cx="12" cy="12" r="9.5" fill="url(#cg)" stroke="#8a6526" stroke-width="1"/><circle cx="12" cy="12" r="6.6" fill="none" stroke="#fff3cf" stroke-width="1" opacity=".8"/><path d="M12 8.2l1.1 2.4 2.6.3-1.9 1.8.5 2.6L12 14l-2.3 1.3.5-2.6-1.9-1.8 2.6-.3z" fill="#fff3cf" opacity=".9"/></svg>`,
  gift: sv('<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1"/>'),
  gear: sv('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'),
  eye: sv('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
};
export const coin = n => `<span class="gp">${ICON.coin}${n}</span>`;
/* 기분 도장 그림 (얼굴 없는 기호) */
export const MOOD_ICON = {
  sun: '<circle cx="30" cy="30" r="9"/><path d="M30 12v5M30 43v5M12 30h5M43 30h5M17 17l3.5 3.5M39.5 39.5 43 43M17 43l3.5-3.5M39.5 20.5 43 17"/>',
  heart: '<path d="M30 44s-13-8-13-17a7 7 0 0 1 13-3.5A7 7 0 0 1 43 27c0 9-13 17-13 17z"/>',
  cup: '<path d="M17 24h22v9a9 9 0 0 1-9 9h-4a9 9 0 0 1-9-9z"/><path d="M39 27h3a4 4 0 0 1 0 8h-3M23 15c-1 2 1 3 0 5M30 14c-1 2 1 3 0 5"/>',
  cloud: '<path d="M20 40a7 7 0 0 1 0-14 10 10 0 0 1 19-2 8 8 0 0 1 1 16z"/>',
  star: '<path d="M30 14l4.6 9.6 10.4 1.4-7.6 7.2 1.9 10.3L30 37.6l-9.3 4.9 1.9-10.3-7.6-7.2 10.4-1.4z"/>',
};
export function moodSVG(m, { name = true } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><g fill="none" stroke="${m.color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity=".92"><circle cx="30" cy="30" r="27" stroke-width="2" stroke-dasharray="${name ? '0' : '3 3'}"/><g transform="${name ? 'translate(4.5 2) scale(.85)' : ''}">${MOOD_ICON[m.id]}</g></g>${name ? `<text x="30" y="57" text-anchor="middle" font-family="Pretendard" font-weight="800" font-size="10" fill="${m.color}">${m.name}</text>` : ''}</svg>`;
}
/* 진동 (설정에서 끌 수 있음) */
let hapticOn = true;
export const setHaptic = v => { hapticOn = v; };
export const buzz = (ms = 8) => { if (hapticOn && SPD === 1) try { navigator.vibrate?.(ms); } catch { /* 지원 안 함 */ } };
