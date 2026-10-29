// 오늘 페이지 — 스티커가 '착' 붙고 날짜 도장 '쿵' · 운세 한 줄 자리(비워 둠 · 운영 연동 나중) · 공유 카드(9:16)
import { img, nameOf, LUCKY } from './data.js?v=0.90.0';
import { S, day, dayKey, parseDay, save } from './save.js?v=0.90.0';
import * as A from './audio.js?v=0.90.0';
import { $, sp, DAYS, toast } from './ui.js?v=0.90.0';

/* 페이지 위 스티커 자리 (비율 좌표 · 크기 · 기울기) — 손으로 붙인 듯 흩어 놓음, 도장 · 운세 줄 자리는 비움 */
const SPOTS = [[.08, .28, .33, -9], [.52, .31, .30, 7], [.30, .44, .34, 4], [.64, .49, .28, -12], [.06, .58, .30, 10], [.40, .62, .31, -5], [.68, .66, .26, 8], [.16, .74, .26, -6]];

export function pickStickers(got) {
  const uniq = [...new Set(got)]; if (!uniq.includes(LUCKY)) uniq.unshift(LUCKY);
  const out = uniq.slice(0, SPOTS.length); if (!out.includes(LUCKY)) out[out.length - 1] = LUCKY;
  return out.map((ty, i) => { const [fx, fy, fw, rot] = SPOTS[i]; return { ty, fx, fy, fw, rot }; });
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

/* 페이지 그리기 (애니 있음 = 오늘 완성 장면 · 없음 = 다이어리에서 다시 보기) */
export function renderPage(pg, k, { animate = false, missed = false } = {}) {
  const d = parseDay(k), dd = S.days[k];
  pg.querySelectorAll('.pst,.stamp,.bit').forEach(e => e.remove());
  pg.querySelector('.head').innerHTML = `<b>${d.getMonth() + 1}월 ${d.getDate()}일</b><span>${DAYS[d.getDay()]}요일 · ${missed ? '쉬어 간 날 · 괜찮아요' : '오늘의 다꾸'}</span>`;
  /* 운세 한 줄 자리: 운영 연동 전까지 비워 둠 (dd.line 이 오면 그대로 씀) */
  pg.querySelector('.line').innerHTML = dd?.line ? dd.line : `<span class="slotline"><i>오늘의 한 줄</i></span>`;
  const list = missed ? [] : (dd?.stickers || []);
  const PW = pg.clientWidth || 390, PH = pg.clientHeight || 844, H = innerHeight, W = innerWidth;
  list.forEach((sp_, i) => {
    const w = PW * sp_.fw, x = PW * sp_.fx, y = PH * sp_.fy;
    const e = document.createElement('div'); e.className = 'pst' + (String(sp_.ty).startsWith('f') ? ' foil' : ''); e.style.width = e.style.height = w + 'px';
    e.innerHTML = `<img src="${img(sp_.ty)}" alt="${nameOf(sp_.ty)}">` + (i === 1 || i === 5 ? `<i class="tape" style="background:${i === 1 ? 'rgba(157,179,154,.78)' : 'rgba(217,165,160,.75)'};transform:rotate(${-sp_.rot - 6}deg)"></i>` : '');
    pg.appendChild(e);
    const fin = `translate(${x}px,${y}px) rotate(${sp_.rot}deg)`; e.style.transform = fin;
    if (!animate) return;
    e.style.opacity = 0;
    setTimeout(() => {
      e.style.opacity = 1;
      e.animate([{ transform: `translate(${W / 2 - w / 2}px,${H + 40}px) rotate(${sp_.rot * 3}deg) scale(1.5)` },
        { transform: `translate(${x}px,${y - 18}px) rotate(${sp_.rot}deg) scale(1.22)`, offset: .72 },
        { transform: `translate(${x}px,${y}px) rotate(${sp_.rot}deg) scale(.95,.93)`, offset: .88 },
        { transform: fin }], { duration: sp(520), easing: 'cubic-bezier(.3,.7,.4,1)' });
      setTimeout(() => { A.stick(i); dust(pg, x + w / 2, y + w / 2, w); }, sp(460));
    }, sp(650 + i * 280));
  });
  const tEnd = animate ? 650 + list.length * 280 + 500 : 0;
  const stamp = () => {
    const s = document.createElement('div'); s.className = 'stamp'; s.innerHTML = stampSVG(k, missed); pg.appendChild(s);
    if (!animate) { s.style.opacity = missed ? .75 : .9; s.style.transform = 'rotate(-10deg)'; return; }
    s.animate([{ opacity: 0, transform: 'scale(1.9) rotate(-22deg)' }, { opacity: .95, transform: 'scale(.94) rotate(-9deg)', offset: .7 }, { opacity: .9, transform: 'scale(1) rotate(-10deg)' }], { duration: sp(360), easing: 'cubic-bezier(.5,0,.7,1)', fill: 'forwards' });
    setTimeout(() => { A.stamp(); pg.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(1px,2px)' }, { transform: 'translate(0,0)' }], { duration: 120 }); }, sp(250));
  };
  if (dd?.done || missed) { if (animate) setTimeout(stamp, sp(tEnd)); else stamp(); }
  return sp(tEnd + 700);
}
function dust(pg, x, y, w) { if (sp(1) < 1) return; for (let i = 0; i < 8; i++) { const b = document.createElement('div'); b.className = 'bit'; b.style.width = b.style.height = '4px'; b.style.borderRadius = '50%'; b.style.background = 'rgba(120,95,70,.35)'; pg.appendChild(b); const a = (i / 8) * Math.PI * 2, r = w * 0.5; b.animate([{ transform: `translate(${x + Math.cos(a) * r * .8}px,${y + Math.sin(a) * r * .8}px)`, opacity: .8 }, { transform: `translate(${x + Math.cos(a) * r * 1.15}px,${y + Math.sin(a) * r * 1.15}px)`, opacity: 0 }], { duration: 380, easing: 'ease-out' }).onfinish = () => b.remove(); } }

/* 오늘 페이지 완성 (3판째 이긴 뒤) */
export function completeToday() {
  const k = dayKey(), dd = day(k);
  if (!dd.done) { dd.stickers = pickStickers(dd.got); dd.done = true; dd.at = Date.now(); save(true); }
}

/* ---------- 공유 카드 (9:16 · 1080×1920 · 개인정보 없음) ---------- */
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
export async function makeCard(k) {
  const dd = S.days[k] || { stickers: [] }, d = parseDay(k);
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; const g = c.getContext('2d');
  const bg = await loadImg('assets/page.jpg'); const r = Math.max(1080 / bg.width, 1920 / bg.height); g.drawImage(bg, (1080 - bg.width * r) / 2, (1920 - bg.height * r) / 2, bg.width * r, bg.height * r);
  await document.fonts.ready;
  g.fillStyle = '#3a3129'; g.font = '700 84px "Gowun Batang", serif'; g.fillText(`${d.getMonth() + 1}월 ${d.getDate()}일`, 76, 230);
  g.fillStyle = '#6b5d4f'; g.font = '700 40px "Gowun Batang", serif'; g.fillText(`${DAYS[d.getDay()]}요일 · 오늘의 다꾸`, 80, 292);
  if (dd.line) { g.fillStyle = '#4b3f35'; g.font = '64px "Nanum Pen Script", cursive'; wrap(g, dd.line, 80, 400, 600, 66); }
  for (const [i, sp_] of dd.stickers.entries()) {
    const im = await loadImg(img(sp_.ty)); const w = 1080 * sp_.fw, x = 1080 * sp_.fx, y = 1920 * sp_.fy;
    g.save(); g.translate(x + w / 2, y + w / 2); g.rotate(sp_.rot * Math.PI / 180); g.shadowColor = 'rgba(60,40,20,.28)'; g.shadowBlur = 22; g.shadowOffsetY = 10; g.drawImage(im, -w / 2, -w / 2, w, w);
    if (i === 1 || i === 5) { g.shadowColor = 'transparent'; g.rotate((-sp_.rot * 2 - 6) * Math.PI / 180); g.fillStyle = i === 1 ? 'rgba(157,179,154,.78)' : 'rgba(217,165,160,.75)'; g.fillRect(-w * .17, -w * .56, w * .34, w * .13); }
    g.restore();
  }
  const su = URL.createObjectURL(new Blob([stampSVG(k)], { type: 'image/svg+xml' })); const st = await loadImg(su);
  g.save(); g.translate(1080 * 0.93 - 335 / 2, 1920 * 0.065 + 335 / 2); g.rotate(-10 * Math.PI / 180); g.globalAlpha = .9; g.drawImage(st, -335 / 2, -335 / 2, 335, 335); g.restore(); URL.revokeObjectURL(su);
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
