// 판 플레이 — 7칸 · 도구 3 · 얼음 · 사슬 · 실패 → 무료 돌려받기 → 이어하기(광고 · 골드) · 응원 선물
//   한 판마다 start() 가 상태를 처음부터 다시 만듦 (지난 판의 상태가 남지 않게 — 씬 재사용 주의)
import { makeLevel, covers, assign, verify, rng, neighbors, isCoveredIn } from './level.js?v=0.91.1';
import { img } from './data.js?v=0.91.1';
import * as A from './audio.js?v=0.91.1';
import { S, save } from './save.js?v=0.91.1';
import { bm } from './oad_bm.js?v=0.91.1';
import { $, sp, toast, modal, closeModal, burst, praise, app, ICON, coin, buzz } from './ui.js?v=0.91.1';

const SLOTS = 7;
const stage = $('#stage');
let W = 0, H = 0, T = 52, SL = 50, OX = 0, OY = 0, BB = { x0: 0, y0: 0, w: 7, h: 8 }, TRAY = { x: 0, y: 0, w: 0, h: 0 };
export let G = null;

/* ---------- 화면 배치 ---------- */
function measure() {
  W = app.clientWidth; H = app.clientHeight;
  const toolsH = 60, gap = 16;
  SL = Math.min(58, Math.floor((W - 28 - 12) / SLOTS));
  TRAY.w = SL * SLOTS + 12; TRAY.h = SL + 12; TRAY.x = (W - TRAY.w) / 2;
  const toolsY = H - 22 - toolsH;
  TRAY.y = toolsY - gap - TRAY.h;
  const top = 64, bottom = TRAY.y - 22;
  if (G) { const xs = G.tiles.map(t => t.x), ys = G.tiles.map(t => t.y); BB = { x0: Math.min(...xs), y0: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs) + 1, h: Math.max(...ys) - Math.min(...ys) + 1 }; }
  const zmax = G ? Math.max(...G.tiles.map(t => t.z)) : 2;
  T = Math.floor(Math.min((W - 14) / (BB.w + 0.1 + zmax * 0.09), (bottom - top) / (BB.h + 0.35 + zmax * 0.14), 64));
  OX = (W - T * (BB.w + zmax * 0.09)) / 2 + T * 0.09 * zmax - BB.x0 * T; OY = top + Math.max(0, (bottom - top - T * (BB.h + 0.2 + zmax * 0.14)) / 2) + T * 0.14 * zmax - BB.y0 * T;
  const tray = $('#tray'); Object.assign(tray.style, { left: TRAY.x + 'px', top: TRAY.y + 'px', width: TRAY.w + 'px', height: TRAY.h + 'px' });
  tray.innerHTML = ''; for (let i = 0; i < SLOTS; i++) { const s = document.createElement('div'); s.className = 'slot'; Object.assign(s.style, { left: 6 + i * SL + 2 + 'px', top: 6 + 2 + 'px', width: SL - 4 + 'px', height: SL - 4 + 'px' }); tray.appendChild(s); }
  $('#tools').style.top = toolsY + 'px';
}
/* 층마다 왼쪽 위로 조금씩 어긋나 쌓여 보이게 (마작 패처럼 옆면이 드러남) */
const ZX = 0.09, ZY = 0.14;
const boardPos = t => ({ x: OX + t.x * T - t.z * T * ZX, y: OY + t.y * T - t.z * T * ZY });
const slotPos = i => ({ x: TRAY.x + 6 + i * SL + SL * 0.02, y: TRAY.y + 6 + SL * 0.02 });
const zBoard = t => 10 + t.z * 100 + Math.round(t.y * 2) * 6 + Math.round(t.x * 2);
function place(t, p, s = 1) { t.px = p.x; t.py = p.y; t.ps = s; t.el.style.transform = `translate(${p.x}px,${p.y}px) scale(${s})`; }
const tileOf = id => G.tiles[id];
const onBoard = () => G.tiles.filter(t => t.where === 'board');
const live = () => G.tray.filter(id => !G.pend.has(id));
const isIced = t => t.iceAt > 0 && G.taps < t.iceAt;
const isChained = (t, list = onBoard()) => t.chain && neighbors(t, list).length > 0;
export const canTap = (t, list = onBoard()) => t.where === 'board' && !isCoveredIn(t, list) && !isIced(t) && !isChained(t, list);

/* ---------- 판 시작 ----------
   opts: { cfg, seed, label, key(응원 선물 · 실패 횟수 묶음), lucky, onEnd({ win, cleared, perfect }), onQuit() } */
export function start(opts) {
  stage.innerHTML = ''; closeModal(); $('#big').style.opacity = 0; $('#tray').classList.remove('tight'); $('#game').classList.remove('won'); $('#tutor')?.remove();
  const lv = makeLevel(opts.seed, opts.cfg);
  G = { opts, tiles: lv.tiles, solution: lv.solution, tray: [], pend: new Set(), hist: [], combo: 0, lastPop: 0, cleared: [], rescue: 1, cont: 0, over: false, taps: 0, used: 0, warned: false, gift: 0, fails: 0 };
  $('#glabel').innerHTML = opts.label;
  measure();
  for (const t of G.tiles) {
    const luck = opts.lucky != null && t.type === opts.lucky;
    const el = document.createElement('div'); el.className = 'tile' + (luck ? ' lucky' : '');
    el.style.width = el.style.height = T + 'px'; el.style.setProperty('--th', Math.max(3, Math.round(T * 0.08)) + 'px');
    el.innerHTML = (luck ? '<i class="ring"></i>' : '') + `<img src="${img(t.type)}" alt="">` + (t.iceAt ? '<i class="frost"><b></b></i>' : '') + (t.chain ? '<i class="chainov"></i>' : '');
    el.dataset.id = t.id; t.el = el; t.where = 'board'; el.style.zIndex = zBoard(t);
    stage.appendChild(el); place(t, boardPos(t));
    el.addEventListener('pointerdown', e => { e.preventDefault(); A.unlock(); tapTile(t); });
  }
  refresh(); toolBadges(); intro();
  if (opts.tutorial) setTimeout(() => tutorial(), sp(900)); else helpGift();
}
/* 시작 연출: 타일이 위에서 종이처럼 내려앉음 */
function intro() {
  const list = G.tiles.slice().sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  list.forEach((t, i) => t.el.animate([{ transform: `translate(${t.px}px,${t.py - 40}px) scale(.6) rotate(${(i % 2 ? 1 : -1) * 8}deg)`, opacity: 0 }, { transform: `translate(${t.px}px,${t.py}px) scale(1)`, opacity: 1 }], { duration: sp(360), delay: sp(120 + i * 7), easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'backwards' }));
}
/* 덮임 · 얼음 · 사슬 · 누를 수 있음(은은한 빛 테두리) 표시 */
function refresh() {
  const list = onBoard();
  for (const t of list) {
    const cov = isCoveredIn(t, list), ice = isIced(t), ch = isChained(t, list);
    t.el.classList.toggle('covered', cov); t.el.classList.toggle('free', !cov && !ice && !ch && (!G.tut || G.tut.id === t.id));
    t.el.classList.toggle('iced', ice); t.el.classList.toggle('chained', ch);
    if (t.iceAt) { const fr = t.el.querySelector('.frost'); if (fr) { if (!ice && !fr.dataset.gone) { fr.dataset.gone = 1; fr.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.3)' }], { duration: sp(300), fill: 'forwards' }); if (!cov) A.crack(); } else if (ice) fr.querySelector('b').textContent = t.iceAt - G.taps; } }
    if (t.chain && !ch) { const c = t.el.querySelector('.chainov'); if (c && !c.dataset.gone) { c.dataset.gone = 1; c.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(8px) rotate(8deg)' }], { duration: sp(320), fill: 'forwards' }); A.unchain(); } }
  }
  unstick();
}
/* 막힘 금지: 칸에 자리가 있는데 누를 수 있는 타일이 하나도 없으면 가장 빨리 풀릴 얼음 · 사슬을 바로 풀어 줌 */
function unstick() {
  if (!G || G.over) return; const list = onBoard();
  if (!list.length || live().length >= SLOTS || G.pend.size || G.tiles.some(t => t.flying)) return;
  if (list.some(t => canTap(t, list))) return;
  const open = list.filter(t => !isCoveredIn(t, list)).sort((a, b) => (a.iceAt || 0) - (b.iceAt || 0));
  const t = open[0]; if (!t) return;
  if (isIced(t)) t.iceAt = 0; if (t.chain) t.chain = false;
  toast('막히지 않게 스티커 하나를 풀어 드렸어요'); refresh();
}

/* ---------- 누르기 ---------- */
export function tapTile(t, auto = false) {
  if (!G || G.over || t.where !== 'board') return false;
  const list = onBoard();
  if (!canTap(t, list)) {
    A.nope(); t.el.classList.remove('shake'); void t.el.offsetWidth; t.el.classList.add('shake');
    if (!auto) toast(isCoveredIn(t, list) ? '위에 덮인 스티커부터 떼어 주세요' : isIced(t) ? `얼음이 녹으려면 ${t.iceAt - G.taps}장 더 담아요` : '옆 스티커를 먼저 떼면 사슬이 풀려요');
    return false;
  }
  if (live().length >= SLOTS) { A.nope(); return false; }
  if (G.tut && G.tut.id !== t.id) { A.nope(); t.el.classList.remove('shake'); void t.el.offsetWidth; t.el.classList.add('shake'); toast('손가락이 가리키는 스티커를 눌러 보세요'); return false; }
  A.tap(); buzz(6); toTray(t); if (G.tut) tutorial(); return true;
}
function toTray(t) {
  let idx = -1; for (let i = G.tray.length - 1; i >= 0; i--) if (tileOf(G.tray[i]).type === t.type) { idx = i + 1; break; }
  if (idx < 0) idx = G.tray.length;
  G.tray.splice(idx, 0, t.id); t.where = 'tray'; G.hist.push(t.id); G.taps++;
  t.el.classList.remove('covered', 'free', 'iced', 'chained');
  fly(t, idx); layoutTray(t.id); refresh();
  const same = G.tray.filter(id => !G.pend.has(id) && tileOf(id).type === t.type);
  if (same.length === 3) { same.forEach(id => G.pend.add(id)); G.hist = G.hist.filter(id => !same.includes(id)); setTimeout(() => popTriple(same), sp(200)); }
  else setTimeout(checkEnd, sp(240));
  tightCheck();
}

/* 0.18초 포물선 비행 (누름 6% 커짐 → 떠올라 날아감) */
function fly(t, idx) {
  const from = { x: t.px, y: t.py }, to = slotPos(idx), s = SL / T * 0.96, el = t.el;
  el.style.zIndex = 1500 + idx;
  const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - T * 0.9 };
  const kf = [{ transform: `translate(${from.x}px,${from.y}px) scale(1)`, offset: 0 }]; const N = 8;
  for (let i = 0; i <= N; i++) { const u = i / N, x = (1 - u) * (1 - u) * from.x + 2 * u * (1 - u) * mid.x + u * u * to.x, y = (1 - u) * (1 - u) * from.y + 2 * u * (1 - u) * mid.y + u * u * to.y; const sc = 1.06 + (s - 1.06) * u; kf.push({ transform: `translate(${x}px,${y}px) scale(${sc}) rotate(${Math.sin(u * Math.PI) * 6}deg)`, offset: 0.12 + u * 0.88 }); }
  t.px = to.x; t.py = to.y; t.ps = s;
  el.style.transform = `translate(${to.x}px,${to.y}px) scale(${s})`;
  t.flying = el.animate(kf, { duration: sp(205), easing: 'linear' });
  t.flying.onfinish = () => { t.flying = null; A.land(); el.animate([{ transform: `translate(${to.x}px,${to.y + 2}px) scale(${s * 1.04},${s * 0.94})` }, { transform: el.style.transform }], { duration: sp(110), easing: 'ease-out' }); layoutTray(); setTimeout(checkEnd, sp(40)); };
}
/* 칸 정렬: 끼워 넣으면 옆 스티커들이 밀려남 */
function layoutTray(skip) {
  G.tray.forEach((id, i) => { const t = tileOf(id); if (id === skip || t.flying || t.popping) return; const p = slotPos(i), s = SL / T * 0.96;
    if (Math.abs(t.px - p.x) > 0.5 || Math.abs(t.py - p.y) > 0.5) { const from = t.el.style.transform; place(t, p, s); t.el.animate([{ transform: from }, { transform: t.el.style.transform }], { duration: sp(130), easing: 'cubic-bezier(.3,1.4,.5,1)' }); }
    t.el.style.zIndex = 1500 + i; });
}
const PRAISE = ['좋아요!', '멋져요!', '센스 있어요!', '대단해요!', '완벽한 흐름!', '손이 기억해요!', '오늘 감 좋네요!'];
/* 세 개째 '뽁' + 종이 조각 · 연속이면 음이 올라감 */
function popTriple(ids) {
  const ts = ids.map(tileOf); const go = () => {
    if (!G || !G.tiles.includes(ts[0])) return;
    if (ts.some(t => t.flying)) return setTimeout(go, 30);
    const mid = ts[1], c = { x: mid.px + T * mid.ps / 2, y: mid.py + T * mid.ps / 2 };
    const now = performance.now(); G.combo = now - G.lastPop < 2600 ? G.combo + 1 : 0; G.lastPop = now;
    ts.forEach(t => { t.popping = true; const a = t.el.animate([{ transform: t.el.style.transform }, { transform: `translate(${mid.px}px,${mid.py}px) scale(${t.ps})`, offset: .45 }, { transform: `translate(${mid.px - T * t.ps * .14}px,${mid.py - 6 - T * t.ps * .14}px) scale(${t.ps * 1.28})`, opacity: 1, offset: .7 }, { transform: `translate(${mid.px + T * t.ps * .4}px,${mid.py - 10 + T * t.ps * .4}px) scale(${t.ps * 0.2})`, opacity: 0 }], { duration: sp(300), easing: 'ease-in', fill: 'forwards' }); a.onfinish = () => t.el.remove(); });
    setTimeout(() => {
      if (!G) return; A.pop(G.combo); burst(c.x, c.y, 18, ts[0].type === G.opts.lucky); peel(ts[1], ts[0].type); buzz(14);
      if (G.combo >= 1) praise(c.x, c.y - T * 0.8, PRAISE[Math.min(G.combo - 1, PRAISE.length - 1)]);
    }, sp(150));
    setTimeout(() => {
      if (!G || !G.tiles.includes(ts[0])) return;
      ts.forEach(t => { t.where = 'gone'; G.pend.delete(t.id); }); G.tray = G.tray.filter(id => !ids.includes(id));
      G.cleared.push(ts[0].type); layoutTray(); tightCheck(); refresh(); checkEnd();
    }, sp(300));
  }; go();
}
/* 칸 6장 = 한 칸 남음 경고 (칸이 숨쉬듯 붉게 · 짧은 흔들림 · '한 칸 남았어요' 꼬리표) */
function tightCheck() {
  const n = live().length, tr = $('#tray'); tr.classList.toggle('tight', n >= SLOTS - 1);
  if (n >= SLOTS - 1 && !G.warned) { G.warned = true; A.warn(); buzz(25); tr.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: sp(240) }); tr.dataset.warn = '한 칸 남았어요 · 같은 그림을 찾아요'; }
  if (n < SLOTS - 1) delete tr.dataset.warn;
  if (n < SLOTS - 2) G.warned = false;
}

/* ---------- 끝 판정 ---------- */
function checkEnd() {
  if (!G || G.over) return;
  if (!onBoard().length && !G.tray.length) { G.over = true; setTimeout(win, sp(250)); return; }
  if (live().length >= SLOTS && !G.pend.size && !G.tiles.some(t => t.flying)) fail();
  else unstick();
}
function win() {
  const g = G; S.fails[g.opts.key] = 0; save(); $('#game').classList.add('won');
  g.opts.onEnd({ win: true, cleared: g.cleared.slice(), perfect: g.used === 0 && g.fails === 0 && g.cont === 0 });
}
function fail() {
  G.over = true; G.fails++; buzz(20);
  const info = bm.info, inApp = info.ok, n = G.cont, left = onBoard().length;
  /* '아까운 순간'에만 이어하기 권함: 남은 스티커가 적을 때 (12장 이하 또는 30% 이하) · 처음 3판 X (docs/bm-policy.md 5장) */
  const pairs = Math.ceil(left / 3);
  const near = left <= Math.max(18, Math.round(G.tiles.length * 0.25));
  const canCont = inApp && n < 2 && S.plays > 3 && near;
  const sku = n === 0 ? 'continue' : 'continue2', price = bm.price(sku) || (n === 0 ? 20 : 40);
  const adLeft = info.ads?.reward ? info.ads.rewardLeft : 0;
  const head = near ? '아깝다, 거의 다 왔어요' : '칸이 다 찼어요';
  const base = `<h3>${head}</h3><p class="left">남은 짝 <b>${pairs}</b>개${near ? ' — 거의 다 왔어요' : ''}</p><p class="sub">${G.tiles.length - left}장을 떼어 냈어요 · 남은 스티커 ${left}장</p>`;
  const tail = `<div class="row"><button class="btn" data-a="again">처음부터</button><button class="btn ghost" data-a="quit">나가기</button></div>`;
  if (G.rescue > 0) return modal(base + `<p>괜찮아요. 마지막 세 장을 판으로 돌려 드릴게요.</p><button class="btn main" data-a="rescue">세 장 돌려받기 (무료)</button>` + tail, onModal, { sheet: true });
  if (canCont) {
    modal(base + `<p>여기까지 정말 잘 왔어요. 세 장을 돌려받고 이어서 해 볼까요?</p><div class="cd"><i></i></div>` +
      (adLeft > 0 ? `<button class="btn main" data-a="contAd">${ICON.ad} 광고 보고 이어하기 <small>${adLeft}번 남음</small></button>` : '') +
      `<button class="btn ${adLeft > 0 ? '' : 'main'}" data-a="contGold">${ICON.instant} 이어하기 · ${coin(price)}</button>` + tail, onModal, { sheet: true });
    /* 8초 카운트다운 → 끝나면 조용히 다시 하기로 */
    const t0 = Date.now(), D = sp(8000); clearInterval(window.__cd);
    window.__cd = setInterval(() => { const bar = $('#modal .cd i'); if (!bar) return clearInterval(window.__cd); const u = Math.min(1, (Date.now() - t0) / D); bar.style.transform = `scaleX(${1 - u})`;
      if (u >= 1) { clearInterval(window.__cd); modal(base + `<p>괜찮아요, 손에 익었으니 다음 판은 더 쉬울 거예요.</p>` + tail, onModal, { sheet: true }); } }, 100);
    return;
  }
  modal(base + `<p>${near ? '정말 아까웠어요. 다시 하면 금방이에요.' : '여기까지도 충분히 잘했어요. 다시 해 봐요.'}</p>` + tail, onModal, { sheet: true });
}
async function onModal(a) {
  if (a === 'rescue') { G.rescue--; resume(); }
  if (a === 'contAd') { const r = await bm.rewardedAd('continue'); if (r.ok) { G.cont++; resume(); } else toast('광고를 불러오지 못했어요'); }
  if (a === 'contGold') { const r = await bm.spend(G.cont === 0 ? 'continue' : 'continue2'); if (r.ok) { G.cont++; resume(); } else if (r.reason !== 'cancel') toast(r.reason === 'short' ? '골드가 모자라요' : '지금은 이어하기를 할 수 없어요'); }
  if (a === 'again') { failCount(); closeModal(); start(G.opts); }
  if (a === 'quit') { failCount(); closeModal(); const q = G.opts.onQuit; G.over = true; q && q(); }
  if (a === 'close') closeModal();
  if (a === 'giftYes') { S.help++; G.gift++; G.tools_bonus = 1; S.tools.undo++; save(); toolBadges(); closeModal(); toast('응원 선물 · 되돌리기 1개를 챙겨 드렸어요'); }
  if (a === 'giftNo') { G.giftDeclined = true; closeModal(); }
}
function failCount() { if (G.fails > 0) { S.fails[G.opts.key] = (S.fails[G.opts.key] || 0) + 1; save(); } }
function resume() { G.over = false; closeModal(); const back = live().slice(-3); back.forEach(id => returnToBoard(tileOf(id))); }
function returnToBoard(t) {
  G.tray = G.tray.filter(id => id !== t.id); G.hist = G.hist.filter(id => id !== t.id); t.where = 'board';
  const from = t.el.style.transform; place(t, boardPos(t)); t.el.style.zIndex = zBoard(t);
  t.el.animate([{ transform: from }, { transform: `translate(${t.px}px,${t.py - T * 0.5}px) scale(1.05)`, offset: .6 }, { transform: t.el.style.transform }], { duration: sp(260), easing: 'ease-out' });
  layoutTray(); refresh(); tightCheck();
}
/* 응원 선물: 같은 판을 3번 연속 놓치면 다음 판 시작 때 (판 끝 순간과 겹치지 않게 · 하루 3번까지) */
function helpGift() {
  const k = G.opts.key, n = S.fails[k] || 0;
  if (n >= 3 && S.help < 3 && bm.helpOn()) modal(`<h3>세 번이나 아깝게 놓쳤어요</h3><p>그만큼 손에 익었다는 뜻이에요. 응원 선물로 되돌리기 1개 챙겨 드릴게요.</p><button class="btn main" data-a="giftYes">고마워요, 받을게요</button><button class="btn" data-a="giftNo">혼자 해 볼게요</button>`, onModal);
}

/* ---------- 도구 ---------- */
export async function useTool(k) {
  A.unlock(); if (!G || G.over) return;
  if ((S.tools[k] || 0) <= 0) return refillSheet(k);
  let ok = false;
  if (k === 'undo') { const id = [...G.hist].reverse().find(id => G.tray.includes(id) && !G.pend.has(id) && !tileOf(id).flying); if (id == null) { toast('되돌릴 스티커가 없어요'); A.nope(); return; } A.undo(); returnToBoard(tileOf(id)); ok = true; }
  if (k === 'magnet') ok = magnet();
  if (k === 'shuffle') ok = shuffle();
  if (ok) { S.tools[k]--; G.used++; save(); toolBadges(); }
}
function refillSheet(k) {
  const info = bm.info;
  if (!info.ok) { A.nope(); toast('오늘 쓸 수 있는 만큼 다 썼어요 · 내일 다시 채워져요'); return; }
  const adLeft = info.ads?.reward ? info.ads.rewardLeft : 0, price = bm.price('tools3') || 30;
  const NAME = { undo: '되돌리기', magnet: '모으기', shuffle: '섞기' };
  modal(`<h3>${NAME[k]}를 다 썼어요</h3><p>내일이면 무료로 다시 채워져요. 지금 바로 채울 수도 있어요.</p>` +
    (adLeft > 0 ? `<button class="btn main" data-r="ad">${ICON.ad} 광고 보고 ${NAME[k]} +1 <small>${adLeft}번 남음</small></button>` : '') +
    `<button class="btn ${adLeft > 0 ? '' : 'main'}" data-r="gold">${ICON.instant} 도구 묶음 (각 1) · ${coin(price)}</button><button class="btn ghost" data-a="close">괜찮아요</button>`, async (a, e) => {
      const r = e.target.closest('[data-r]')?.dataset.r; if (a === 'close') return closeModal();
      if (r === 'ad') { const x = await bm.rewardedAd('tool'); if (x.ok) { S.tools[k]++; save(); toolBadges(); closeModal(); toast(`${NAME[k]} +1`); } }
      if (r === 'gold') { const x = await bm.spend('tools3'); if (x.ok) { for (const t of ['undo', 'magnet', 'shuffle']) S.tools[t]++; save(); toolBadges(); closeModal(); toast('도구를 하나씩 채웠어요'); } else if (x.reason === 'short') toast('골드가 모자라요'); }
    });
}
function magnet() {
  const inTray = live().map(tileOf); const cnt = {}; inTray.forEach(t => { cnt[t.type] = (cnt[t.type] || 0) + 1; });
  let type = null, need = 3;
  for (const [ty, c] of Object.entries(cnt).sort((a, b) => b[1] - a[1])) { const n = 3 - c; if (live().length + n <= SLOTS && onBoard().filter(t => t.type === +ty).length >= n) { type = +ty; need = n; break; } }
  if (type == null) { const free = onBoard().filter(t => canTap(t)); const c2 = {}; free.forEach(t => { c2[t.type] = (c2[t.type] || 0) + 1; }); const best = Object.entries(c2).sort((a, b) => b[1] - a[1])[0] || Object.entries(onBoard().reduce((m, t) => (m[t.type] = (m[t.type] || 0) + 1, m), {}))[0]; if (best && live().length + 3 <= SLOTS) { type = +best[0]; need = 3; } }
  if (type == null) { toast('칸이 모자라요 — 되돌리기를 먼저 써 보세요'); A.nope(); return false; }
  A.magnet();
  const pick = onBoard().filter(t => t.type === type).sort((a, b) => (canTap(b) - canTap(a)) || b.z - a.z).slice(0, need);
  /* 덮인 것 · 얼음 · 사슬도 끌어옴 (판에서 바로 빼서 칸으로) */
  pick.forEach((t, i) => setTimeout(() => { if (G && t.where === 'board') { t.iceAt = 0; t.chain = false; t.el.querySelector('.frost')?.remove(); t.el.querySelector('.chainov')?.remove(); toTray(t); } }, sp(i * 90)));
  return true;
}
/* 섞기: 남은 판을 '반드시 풀리게' 다시 배정 (칸에 있는 그림을 먼저 마저 채울 수 있게 · 얼음 · 사슬은 그대로) */
function shuffle() {
  const board = onBoard(); if (board.length < 3) { toast('섞을 스티커가 거의 없어요'); return false; }
  const inTray = live().map(tileOf); const cnt = {}; inTray.forEach(t => { cnt[t.type] = (cnt[t.type] || 0) + 1; });
  const bc = {}; board.forEach(t => { bc[t.type] = (bc[t.type] || 0) + 1; });
  const pre = Object.entries(cnt).map(([ty, c]) => ({ type: +ty, n: (3 - c) % 3 })).filter(p => p.n > 0).sort((a, b) => a.n - b.n);
  const pool = []; for (const [ty, n] of Object.entries(bc)) { const left = n - (pre.find(p => p.type === +ty)?.n || 0); for (let i = 0; i < left / 3; i++) pool.push(+ty); }
  const r = rng((Date.now() ^ G.taps * 7919) >>> 0); let done = false;
  const copy = board.map(t => ({ id: t.id, x: t.x, y: t.y, z: t.z, type: t.type, iceAt: t.iceAt, chain: t.chain }));
  for (let k = 0; k < 40 && !done; k++) {
    const order = assign(copy, pool, r, pre, 0.3, G.taps); if (!order) continue;
    if (verify(copy, order, SLOTS, inTray.map(t => t.type), G.taps).ok) { done = true; G.solution = order; }
  }
  if (!done) { toast('지금은 섞어도 길이 없어요 — 되돌리기를 써 보세요'); A.nope(); return false; }
  A.shuffle();
  copy.forEach(c => { const t = tileOf(c.id); const el = t.el;
    el.animate([{ transform: el.style.transform }, { transform: el.style.transform + ' scaleX(0)', offset: .5 }, { transform: el.style.transform }], { duration: sp(320), easing: 'ease-in-out' });
    setTimeout(() => { if (!G || !G.tiles.includes(t)) return; t.type = c.type; el.querySelector('img').src = img(c.type); const luck = G.opts.lucky != null && c.type === G.opts.lucky; el.classList.toggle('lucky', luck); const rg = el.querySelector('.ring'); if (luck && !rg) el.insertAdjacentHTML('afterbegin', '<i class="ring"></i>'); if (!luck && rg) rg.remove(); }, sp(160)); });
  return true;
}
export function toolBadges() { for (const k of ['undo', 'magnet', 'shuffle']) { const b = $(`#t_${k}`); const n = S.tools[k] || 0; b.querySelector('b').textContent = n > 0 ? n : '+'; b.classList.toggle('empty', n <= 0); } }

/* ---------- 첫 판 손가락 안내 3단계 ---------- */
const TUT = ['맨 위 스티커를 눌러 아래 칸에 담아요', '좋아요! 같은 그림을 하나 더 담아요', '세 개를 모으면 뽁! 하고 사라져요'];
function tutorial() {
  if (!G) return; const T0 = G.tut;
  if (!T0) { const list = onBoard(), free = list.filter(t => canTap(t, list)), by = {}; free.forEach(t => { (by[t.type] = by[t.type] || []).push(t); });
    const best = Object.values(by).sort((a, b) => b.length - a.length)[0]; if (!best) return; G.tutType = best[0].type; G.tutStep = 0; }
  else G.tutStep++;
  const list = onBoard(), next = list.filter(t => t.type === G.tutType && !isCoveredIn(t, list) && !isIced(t) && !isChained(t, list))[0];
  if (G.tutStep >= 3 || !next) { G.tut = null; $('#tutor')?.remove(); refresh(); G.tutPop = true; S.tut = 1; save(); return; }
  G.tut = { id: next.id }; refresh();
  let f = $('#tutor'); if (!f) { f = document.createElement('div'); f.id = 'tutor'; f.innerHTML = '<i class="hand"></i><p></p>'; app.appendChild(f); }
  f.querySelector('p').innerHTML = `<small>${G.tutStep + 1}/3</small> ${TUT[G.tutStep]}`;
  const h = f.querySelector('.hand'); h.style.left = next.px + T * 0.5 + 'px'; h.style.top = next.py + T * 0.55 + 'px';
}
/* '뽁': 가운데 한 장을 칼선 스티커로 '톡' 떼어 위쪽 칩(오늘 페이지 · 진행 맵 · 자유 다꾸)으로 날려 보냄 */
function peel(t, type) {
  const chip = $('#glabel').getBoundingClientRect(), ar = app.getBoundingClientRect(), s = T * t.ps;
  const e = document.createElement('img'); e.className = 'peel'; e.src = img(type); e.style.width = e.style.height = s * 0.86 + 'px'; app.appendChild(e);
  const x0 = t.px + s * 0.07, y0 = t.py + s * 0.07, x1 = chip.left - ar.left + chip.width / 2 - s * 0.43, y1 = chip.top - ar.top + chip.height / 2 - s * 0.43;
  e.animate([{ transform: `translate(${x0}px,${y0}px) scale(1) rotate(0)` }, { transform: `translate(${x0}px,${y0 - 14}px) scale(1.18) rotate(-10deg)`, offset: .22 },
    { transform: `translate(${(x0 + x1) / 2}px,${Math.min(y0, y1) - 60}px) scale(1) rotate(8deg)`, offset: .6 }, { transform: `translate(${x1}px,${y1}px) scale(.35) rotate(0)`, opacity: .9 }], { duration: sp(620), easing: 'cubic-bezier(.4,0,.3,1)' }).onfinish = () => {
    e.remove(); const c = $('#glabel'); c.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: sp(220) }); A.get();
    if (G?.tutPop) { G.tutPop = false; const f = document.createElement('div'); f.id = 'tutor'; f.innerHTML = '<p>이 스티커가 오늘 페이지에 붙어요!</p>'; app.appendChild(f); setTimeout(() => f.remove(), 2600); }
  };
}
export function relayout() { if (!G) return; measure(); for (const t of G.tiles) { if (t.where === 'gone') continue; t.el.style.width = t.el.style.height = T + 'px'; if (t.where === 'board') place(t, boardPos(t)); } layoutTray(); }
export function quit() { if (G) { G.over = true; failCount(); } }
export const geom = () => ({ T, SL, TRAY, W, H });
