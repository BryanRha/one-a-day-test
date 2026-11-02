// 가게 장면 — 배경 · 손님(계산대 뒤) · 계산대 · 먼지 · 꾸미기 겹을 한 상자에 그림 (가게 · 결과 반응 · 꾸미기 미리보기 공용)
import { S } from './save.js?v=0.96.0';
import { face, sil, FUR } from './state.js?v=0.96.0';
const IW = 1024, IH = 1536, CY = 1040;   /* 배경 그림 크기 · 계산대 윗선(그림 좌표) */
export function sceneHTML({ cast = null, f = 0, silhouette = false, mini = false } = {}) {
  const on = S.deco.on, own = S.deco.own;
  const season = on.season && own[on.season] ? on.season : null;
  const fx = season === 'winter' ? `<div class="coldtint"></div><div class="fx snow">${flakes(mini ? 14 : 34, 'snow')}</div>` : season === 'blossom' ? `<div class="fx petal">${flakes(mini ? 10 : 22, 'petal')}</div>` : '';
  const prop = (slot, src, cls) => (on[slot] && own[on[slot]] ? `<div class="prop ${cls}"><img src="${src}" alt=""></div>` : '');
  return `<div class="shopbg"></div>${on.lamp && own.lamp ? '<div class="lampglow"></div>' : ''}${fx}
    ${prop('cabinet', 'assets/p_3.webp', 'pcab')}${prop('plant', 'assets/p_0.webp', 'pplant')}
    ${cast ? `<div class="guest${silhouette ? ' sil' : ''}">${silhouette ? `<img class="f on" src="${sil(cast)}" alt="">` : [0, 1, 2].map(i => `<img class="f fx${i}${i === f ? ' on' : ''}" src="${face(cast, i)}" alt="">`).join('')}</div>` : ''}
    <div class="counter"></div>
    ${prop('bell', 'assets/p_1.webp', 'pbell')}
    ${on.cushion && own.cushion ? '<div class="prop pcush"><img src="assets/p_2.webp" alt=""></div>' : ''}
    <div class="mungi"><img src="assets/cat_${on.cushion && own.cushion ? 1 : 0}.webp" alt="먼지" style="filter:${FUR[on.fur] || ''}"></div>`;
}
function flakes(n, k) { let s = ''; for (let i = 0; i < n; i++) { const sz = k === 'snow' ? 2 + Math.random() * 4 : 5 + Math.random() * 5; s += `<i style="left:${Math.random() * 100}%;width:${sz}px;height:${sz}px;animation-duration:${6 + Math.random() * 8}s;animation-delay:${-Math.random() * 12}s;--dx:${(Math.random() - 0.5) * 80}px"></i>`; } return s; }
/* 상자 크기에 맞춰 계산대 윗선 · 손님 · 소품 자리를 잡음 */
export function layout(box, { top = 150 } = {}) {
  const W = box.clientWidth, Hh = box.clientHeight; if (!W || !Hh) return;
  const s = Math.max(W / IW, Hh / IH), ih = IH * s, iw = IW * s, ox = (W - iw) / 2, oy = Hh - ih, cy = oy + CY * s;
  box.style.setProperty('--cyp', (cy / Hh * 100).toFixed(2) + '%');
  const g = box.querySelector('.guest');
  if (g) { const vis = Math.max(120, cy - top), gh = vis / 0.64, gw = Math.min(W * 0.98, gh * 0.54); g.style.height = gh + 'px'; g.style.width = gw + 'px'; g.style.top = (cy - vis) + 'px'; }
  const m = box.querySelector('.mungi'); if (m) { const w = Math.min(96, W * 0.22); m.style.width = w + 'px'; m.style.top = (cy - w * 0.62) + 'px'; m.style.left = (W - w - W * 0.05) + 'px'; }
  const put = (sel, x, wv, lift = 0.82) => { const el = box.querySelector(sel); if (!el) return; el.style.width = wv + 'px'; el.style.left = (x - wv / 2) + 'px'; el.style.top = (cy - wv * lift) + 'px'; };
  put('.pbell', W * 0.16, Math.min(54, W * 0.13), 0.72);
  put('.pcush', W - Math.min(96, W * 0.22) / 2 - W * 0.05, Math.min(104, W * 0.25), 0.42);
  const cab = box.querySelector('.pcab'); if (cab) { const wv = Math.min(120, W * 0.27); cab.style.width = wv + 'px'; cab.style.left = (W - wv - 4) + 'px'; cab.style.top = (cy - wv * 1.55) + 'px'; }
  const pl = box.querySelector('.pplant'); if (pl) { const wv = Math.min(96, W * 0.22); pl.style.width = wv + 'px'; pl.style.left = (4 + ox * 0) + 'px'; pl.style.top = (cy - wv * 2.3) + 'px'; }
  return { cy, W, H: Hh };
}
export function setFace(box, f) { box.querySelectorAll('.guest img.f').forEach(im => { if (im.classList.contains('fx' + f)) im.classList.add('on'); else if (/fx\d/.test(im.className)) im.classList.remove('on'); }); }
