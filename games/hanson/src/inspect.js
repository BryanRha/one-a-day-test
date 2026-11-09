// ② 물건 감정 — 돋보기를 끌어 반짝이는 곳을 찾고, 눌러 짚으면 단서 카드가 날아와 꽂힘 · 장부와 대조하면 함정이 '정상'으로 뒤집힘
import { D, cur, itemImg } from './state.js?v=0.99.13';
import { S, save } from './save.js?v=0.99.13';
import * as A from './audio.js?v=0.99.13';
import { $, $$, esc, I, sparks, praise, buzz, toast, modal, closeModal, sp, center } from './ui.js?v=0.99.13';
import { won, toolOn, LEVELS } from './engine.js?v=0.99.13';

const KN = { auth: ['진위', ''], cond: ['상태', 'y'], origin: ['출처', ''], fact: ['사실', 'n'], plus: ['가치', 'g'], trap: ['확인 필요', 'n'] };
const PRAISE = ['눈이 좋아요!', '찾았어요!', '예리해요!', '바로 그거예요!', '좋은 눈썰미예요!'];
let el, stage, geo, go;

export function openInspect(onDone) {
  go = onDone; const c = cur.v, g = c.g, it = D.items[g.item];
  el = $('#inspect');
  const total = g.clues.length;
  el.innerHTML = `<div class="col">
    <div class="topbar"><button class="icb" data-k="back" aria-label="뒤로">${I.back}</button><div class="ttl">${esc(g.itemName)}<small>돋보기로 훑고, 이상한 곳을 눌러 짚어요</small></div><div class="dots" id="idots"></div></div>
    <div class="stage" id="stage"><div class="pic" style="background-image:url(${itemImg(g.item)})"></div><div class="lens" id="lens"></div><div class="hint" id="ihint">${S.tut ? '천천히 끌어 보세요 · 반짝이면 눌러요' : '손가락으로 끌면 돋보기가 따라와요'}</div></div>
    <div class="cardsec">
      <h4><span>단서 카드</span><button data-k="ledger">장부와 대조 ›</button></h4>
      <div class="cardrow" id="cards"></div>
      <div class="toolrow">
        <button class="tool on" aria-label="돋보기">${I.loupe}</button>
        <button class="tool" data-k="ledger" aria-label="장부">${I.book}<i class="dot" id="ldot" style="display:none"></i></button>
        <button class="tool${toolOn(S.xp, 'uv') ? '' : ' lock'}" data-k="uv" aria-label="자외선 등"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3h6v5l3 4H6l3-4z"/><path d="M8 16l-2 4M12 16v5M16 16l2 4"/></svg>${toolOn(S.xp, 'uv') ? '' : `<i class="lv">${LEVELS.find(l => l.tool === 'uv').name.replace('감정사 ', '')}</i>`}</button>
        <button class="catbox" data-k="cat"><img src="assets/cat_2.webp" alt=""><span id="cattxt">${c.helped ? '먼지가 하나 미리 봐 뒀대요' : '막히면 <b>먼지</b>를 눌러 보세요'}</span></button>
      </div>
    </div>
    <div class="bottom"><button class="btn pri" data-k="next">${c.mode === 'alley' ? '흥정하러 가기' : '손님과 이야기하기'} <span class="arr">→</span></button></div>
  </div>`;
  stage = $('#stage');
  sizeStage(); drawPins(); drawCards(); drawDots();
  el.onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k; A.tap();
    if (k === 'back') return go('back');
    if (k === 'ledger') return openLedger();
    if (k === 'cat') return catHint();
    if (k === 'uv') return uvLamp();
    if (k === 'next') return go('next');
  };
  bindLoupe();
  if (c.helpSpot) glintAt(c.helpSpot, 'help');
  void total;
}
export function resizeInspect() { if (el && el.classList.contains('on')) { sizeStage(); drawPins(); } }

function sizeStage() {
  const W = el.clientWidth, Hh = el.clientHeight, top = $('.topbar', el).offsetHeight;
  const s = Math.max(200, Math.min(W, Hh - top - 330));
  stage.style.height = s + 'px';
  const pic = $('.pic', stage); pic.style.width = s + 'px'; pic.style.left = ((W - s) / 2) + 'px'; pic.style.right = 'auto';
  stage.style.background = `#2d2117 url(${itemImg(cur.v.g.item)}) center / cover`;
  stage.style.backgroundBlendMode = 'multiply';
  geo = { s, ox: (W - s) / 2, W };
  const lens = $('#lens'); lens.style.backgroundImage = `url(${itemImg(cur.v.g.item)})`; lens.style.backgroundSize = `${s * 2.3}px ${s * 2.3}px`;
}
const spotXY = sp0 => { const p = D.items[cur.v.g.item].spots[sp0]; return { x: geo.ox + p[0] * geo.s, y: p[1] * geo.s, label: p[2] }; };
const R = () => Math.max(26, geo.s * 0.075);
/* 봇 · 시험용: 단서 자리의 화면 좌표 */
window.__hansonSpots = () => { const r = stage.getBoundingClientRect(); return cur.v.g.clues.map(cl => { const q = spotXY(cl.spot); return { spot: cl.spot, kind: cl.kind, x: r.left + q.x, y: r.top + q.y, found: cur.v.found.includes(cl.spot) }; }); };

function drawPins() {
  $$('.pin, .glint', stage).forEach(x => x.remove());
  const c = cur.v;
  for (const cl of c.g.clues) {
    const { x, y } = spotXY(cl.spot);
    const gl = document.createElement('i'); gl.className = 'glint'; gl.dataset.s = cl.spot; gl.style.left = x + 'px'; gl.style.top = y + 'px'; stage.appendChild(gl);
    if (!c.found.includes(cl.spot)) continue;
    const pin = document.createElement('div'); pin.className = 'pin' + (cl.kind === 'trap' ? (c.ledger ? ' ok' : ' trap') : ''); pin.textContent = cl.kind === 'trap' && c.ledger ? '정상' : D.items[c.g.item].spots[cl.spot][2];
    pin.style.left = Math.min(geo.W - 50, Math.max(50, x)) + 'px'; pin.style.top = y + 'px'; stage.appendChild(pin);
  }
}
function cardHTML(cl, isNew) {
  const c = cur.v, trapOk = cl.kind === 'trap' && c.ledger, [k, cls] = trapOk ? ['정상', 'g'] : KN[cl.kind];
  return `<div class="ccard${isNew ? ' new' : ''}" data-s="${cl.spot}"><div class="k ${cls}">${k}</div><b>${esc(cl.title)}</b><span>${esc(trapOk ? cl.ok : cl.note)}</span>${trapOk ? '<em class="st">대조</em>' : ''}</div>`;
}
function drawCards(newSpot) {
  const c = cur.v, row = $('#cards');
  const got = c.g.clues.filter(cl => c.found.includes(cl.spot)).sort((a, b) => c.found.indexOf(a.spot) - c.found.indexOf(b.spot));
  const left = c.g.clues.length - got.length;
  row.innerHTML = got.map(cl => cardHTML(cl, cl.spot === newSpot)).join('') + Array.from({ length: left }, () => '<div class="ccard empty">?</div>').join('');
  if (newSpot) { const n = row.querySelector(`[data-s="${newSpot}"]`); if (n) n.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' }); }
  $('#ldot').style.display = got.some(cl => cl.kind === 'trap') && !c.ledger ? '' : 'none';
}
function drawDots() { const c = cur.v, n = c.g.clues.length, f = c.found.length; $('#idots').innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < f ? 'on' : ''}"></i>`).join('') + ` ${f}/${n}`; }

function glintAt(spot, cls = 'on') { const gl = stage.querySelector(`.glint[data-s="${spot}"]`); if (gl) gl.classList.add(cls); }
function bindLoupe() {
  const lens = $('#lens'); let down = null, lastHot = null;
  const pos = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const near = (p, mul = 1) => { const c = cur.v; let best = null, bd = 1e9; for (const cl of c.g.clues) { if (c.found.includes(cl.spot)) continue; const q = spotXY(cl.spot), d = Math.hypot(q.x - p.x, q.y - p.y); if (d < R() * mul && d < bd) { bd = d; best = cl; } } return best; };
  const show = p => {
    const lx = p.x, ly = Math.max(10, p.y - 78); /* 손가락보다 위에 돋보기 */
    lens.classList.add('on'); lens.style.left = lx + 'px'; lens.style.top = ly + 'px';
    const zx = (lx - geo.ox) * 2.3, zy = ly * 2.3; lens.style.backgroundPosition = `${70 - zx}px ${70 - zy}px`;
    const h = near({ x: lx, y: ly }, 1.7);
    lens.classList.toggle('hot', !!h);
    $$('.glint.on', stage).forEach(x => { if (!h || x.dataset.s !== h.spot) x.classList.remove('on'); });
    if (h) { glintAt(h.spot); if (lastHot !== h.spot) { A.glint(); buzz(6); } }
    lastHot = h ? h.spot : null;
    return { x: lx, y: ly };
  };
  stage.onpointerdown = e => { A.unlock(); try { stage.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 */ } const p = pos(e); down = { p, t: Date.now(), moved: 0, lens: show(p) }; $('#ihint').classList.add('off'); };
  stage.onpointermove = e => { if (!down) return; const p = pos(e); down.moved = Math.max(down.moved, Math.hypot(p.x - down.p.x, p.y - down.p.y)); down.lens = show(p); };
  const up = e => {
    if (!down) return; const p = pos(e), tap = down.moved < 10 && Date.now() - down.t < 400;
    lens.classList.remove('on', 'hot'); $$('.glint.on', stage).forEach(x => x.classList.remove('on'));
    const hit = near(down.lens) || (tap ? near(p) : null) || (tap ? near(p, 1.25) : null);
    down = null; lastHot = null;
    if (hit) find(hit); else if (tap) { A.nope(); }
  };
  stage.onpointerup = up; stage.onpointercancel = () => { down = null; lens.classList.remove('on', 'hot'); };
}
export function find(cl) {
  const c = cur.v; if (c.found.includes(cl.spot)) return;
  c.found.push(cl.spot); persist();
  const q = spotXY(cl.spot), r = stage.getBoundingClientRect(), from = { x: r.left + q.x, y: r.top + q.y };
  A.found(c.found.length - 1); buzz(14); sparks(from.x, from.y, 14);
  stage.querySelector(`.glint[data-s="${cl.spot}"]`)?.classList.remove('help');
  drawPins(); drawDots();
  /* 카드가 날아가 꽂힘 */
  const fly = document.createElement('div'); fly.className = 'flyc'; fly.textContent = cl.title; $('#fly').appendChild(fly);
  drawCards(); const slot = $(`#cards [data-s="${cl.spot}"]`) || $('#cards'); const to = center(slot), ar = $('#app').getBoundingClientRect();
  slot.style.visibility = 'hidden';
  fly.animate([{ transform: `translate(${from.x - ar.left - 48}px, ${from.y - ar.top - 20}px) scale(.5) rotate(-10deg)`, opacity: 0 }, { transform: `translate(${from.x - ar.left - 48}px, ${from.y - ar.top - 50}px) scale(1) rotate(-4deg)`, opacity: 1, offset: .3 }, { transform: `translate(${to.x - ar.left - 48}px, ${to.y - ar.top - 30}px) scale(.9) rotate(0)`, opacity: 1 }], { duration: sp(620), easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = () => { fly.remove(); slot.style.visibility = ''; slot.classList.add('new'); A.card(); };
  if (cl.kind === 'trap') { setTimeout(() => praise(c.ledger ? '장부엔 정상이래요' : '수상한데… 장부와 대조해 봐요', 70), sp(300)); if (c.ledger) setTimeout(A.okay, sp(700)); }
  else praise(PRAISE[(c.found.length - 1) % PRAISE.length], 70);
  if (c.found.length === c.g.clues.length) setTimeout(() => { praise('단서를 모두 짚었어요!', 110); A.fanfare(1); }, sp(900));
  const tx = $('#cattxt'); if (tx) tx.innerHTML = c.found.length === c.g.clues.length ? '먼지가 만족한 얼굴이에요' : '먼지가 꼬리를 살랑거려요';
}
/* 자외선 등 (감정사 7급부터 · 손님마다 한 번): 아직 못 찾은 진짜 단서 자리가 잠깐 빛남 — 플레이로만 열림, 팔지 않음 */
function uvLamp() {
  const c = cur.v;
  if (!toolOn(S.xp, 'uv')) return toast(`자외선 등은 ${LEVELS.find(l => l.tool === 'uv').name}부터 쓸 수 있어요`);
  if (c.uv) return toast('자외선 등은 손님마다 한 번이에요');
  c.uv = true; persist(); A.glint(); stage.classList.add('uv');
  c.g.clues.filter(cl => cl.kind !== 'trap' && !c.found.includes(cl.spot)).forEach(cl => { const gl = stage.querySelector(`.glint[data-s="${cl.spot}"]`); if (gl) { gl.classList.add('uvon'); setTimeout(() => gl.classList.remove('uvon'), sp(1600)); } });
  setTimeout(() => stage.classList.remove('uv'), sp(1600));
}
function catHint() {
  const c = cur.v; A.meow(); $('.catbox img').animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-8deg) translateY(-3px)' }, { transform: 'rotate(0)' }], { duration: 400 });
  const left = c.g.clues.filter(cl => cl.kind !== 'trap' && !c.found.includes(cl.spot));
  const tx = $('#cattxt');
  if (!left.length) { tx.innerHTML = c.found.length === c.g.clues.length ? '먼지가 만족한 얼굴이에요' : '먼지는 이제 <b>장부</b> 쪽을 봐요'; return; }
  const t = left[0], lab = D.items[c.g.item].spots[t.spot][2];
  c.hint = (c.hint || 0) + 1; persist();
  tx.innerHTML = `먼지가 <b>${esc(lab)}</b> 쪽을 빤히 보고 있어요`;
  glintAt(t.spot, 'help');
}
/* 장부: 장부 시세 · 이 물건 참고 줄 · 함정 대조 */
function openLedger() {
  const c = cur.v, g = c.g, it = D.items[g.item]; A.page();
  const wasOff = !c.ledger; c.ledger = true; persist();
  modal(`<div class="ledgersheet"><h3>감정 장부 · ${esc(it.name)}</h3>
    <div class="price3"><div>손님이 부른 값<b>${won(g.ask)}</b></div><div>장부 시세 (보통 상태)<b>${won(g.ref)}</b></div></div>
    ${it.ledger.map(l => `<div class="lline">${esc(l)}</div>`).join('')}
    <button class="btn pri" data-a="close">대조 끝</button></div>`, a => { if (a === 'close') closeModal(); });
  if (wasOff) { const traps = g.clues.filter(cl => cl.kind === 'trap' && c.found.includes(cl.spot)); if (traps.length) setTimeout(() => { drawCards(); drawPins(); $$('#cards .ccard').forEach(x => { if (traps.some(t => t.spot === x.dataset.s)) x.classList.add('flip'); }); A.okay(); praise('함정을 가려냈어요 · 정상이에요', 70); }, sp(200)); else { drawCards(); drawPins(); } }
}
function persist() { const c = cur.v; if (S.prog && S.prog.key === c.key && S.prog.mode === c.mode) { Object.assign(S.prog, { found: c.found, ledger: c.ledger, hint: c.hint || 0, uv: !!c.uv }); save(); } }
void toast;
