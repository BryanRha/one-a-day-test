// ③ 손님 대화 · 흥정 · 결정 — 질문 3개 중 2개 · 말이 단서와 어긋나면 '모순' · 짚은 흠만큼 깎을 수 있음 · 사 줌 / 깎음 / 돌려보냄 / 주인 찾기
import { D, cur, face, nameOf, tagOf } from './state.js?v=0.97.1';
import { S, save } from './save.js?v=0.97.1';
import * as A from './audio.js?v=0.97.1';
import { $, $$, esc, I, praise, buzz, typeText, modal, closeModal, wait } from './ui.js?v=0.97.1';
import { haggleFloor, buyPrice, won, CHN, cutOf, toolOn } from './engine.js?v=0.97.1';

const MOOD = ['평온', '당황', '안도'];
let el, go;
export function openTalk(onDone) {
  go = onDone; const c = cur.v, g = c.g; el = $('#talk');
  const short = el.clientHeight < 760 || c.mode === 'alley';
  el.style.setProperty('--bh', (short ? 210 : 256) + 'px');
  el.innerHTML = `<div class="bust"><div class="bimg">${[0, 1, 2].map(i => `<img class="${i === 0 ? 'base ' : ''}${i === c.face ? 'on' : ''}" data-f="${i}" src="${face(g.cast, i)}" alt="">`).join('')}</div>
      <div class="topbar"><button class="icb" data-k="back" aria-label="뒤로">${I.back}</button><div class="ttl">${esc(nameOf(g))}<small id="qleft"></small></div></div>
      <div class="mood">${MOOD.map((m, i) => `<span data-m="${i}" class="${i === c.face ? 'on' : ''}">${m}</span>`).join('')}</div></div>
    <div class="chatwrap"><div class="chat" id="chat"></div>
      <div class="deal" id="deal"></div></div>`;
  /* 상반신만 보이게: 머리부터 가슴까지 */
  const b = $('.bimg', el); b.style.width = Math.min(560, el.clientWidth * (short ? 0.92 : 1.02)) + 'px';
  $('.bimg img.base', el).style.opacity = c.face === 0 ? '' : '0';
  drawChat(); drawDeal();
  el.onclick = e => { const k = e.target.closest('[data-k]'); if (!k) return; const v = k.dataset.k; A.tap();
    if (v === 'back') return go('back');
    if (v === 'q') return ask(Number(k.dataset.i));
    if (v === 'press') return press(Number(k.dataset.i));
    if (v === 'ch') return choose(k.dataset.c);
  };
}
function setMood(f) {
  const c = cur.v; c.face = f;
  $$('.bimg img', el).forEach(im => { const on = Number(im.dataset.f) === f; im.classList.toggle('on', on); if (im.classList.contains('base')) im.style.opacity = on ? '' : '0'; });
  $$('.mood span', el).forEach(s => s.classList.toggle('on', Number(s.dataset.m) === f));
}
function drawChat() {
  const c = cur.v, g = c.g, chat = $('#chat');
  let h = `<div class="bub cu">${esc(g.intro[g.intro.length - 1])}</div>`;
  for (const i of c.asked) {
    const x = g.talk[i], hit = x.contra && c.found.includes(x.contra);
    h += `<div class="bub me">${esc(x.q)}</div><div class="bub cu">${hit ? `<mark>${esc(x.a)}</mark>` : esc(x.a)}</div>`;
    if (hit) h += `<div class="flag"><i>모순</i>${esc(x.why)}</div>`;
    else if (x.contra) h += '<div class="flag soft"><i>?</i>어딘가 걸려요 · 단서를 더 찾으면 보일지도</div>';
    if (hit && x.press && c.pressed === i) h += `<div class="bub me">${esc(x.press.q)}</div><div class="bub cu">${esc(x.press.a)}</div>`;
  }
  /* 되묻기: 모순을 짚은 질문에 한 번 더 (손님마다 1번) */
  const pr = c.pressed === false || c.pressed == null ? c.asked.find(i => g.talk[i].contra && g.talk[i].press && c.found.includes(g.talk[i].contra)) : undefined;
  if (pr !== undefined) h += `<div class="qchips"><button class="qchip press" data-k="press" data-i="${pr}">되묻기 · ${esc(g.talk[pr].press.q)}</button></div>`;
  const left = 2 - c.asked.length, n = g.talk.length;
  const rub = toolOn(S.xp, 'rub');
  if (n && left > 0) h += `<div class="qchips">${g.talk.map((x, i) => (c.asked.includes(i) ? '' : `<button class="qchip" data-k="q" data-i="${i}">${esc(x.q)}${rub && x.contra && c.found.includes(x.contra) ? '<i class="rub">탁본</i>' : ''}</button>`)).join('')}</div>`;
  chat.innerHTML = h; chat.scrollTop = chat.scrollHeight;
  $('#qleft').textContent = !n ? tagOf(g) : left > 0 ? `질문 ${left}번 남음` : '질문 다 씀 · 이제 결정해요';
}
async function ask(i) {
  const c = cur.v, g = c.g; if (c.asked.includes(i) || c.asked.length >= 2 || c.busy) return;
  c.busy = true; c.asked.push(i); persist();
  const x = g.talk[i], chat = $('#chat');
  $$('.qchips', chat).forEach(q => q.remove());
  chat.insertAdjacentHTML('beforeend', `<div class="bub me">${esc(x.q)}</div>`); chat.scrollTop = chat.scrollHeight;
  await wait(380);
  setMood(x.face);
  const b = document.createElement('div'); b.className = 'bub cu'; chat.appendChild(b); chat.scrollTop = chat.scrollHeight;
  await typeText(b, x.a, { speed: 28, cursor: false });
  c.busy = false;
  drawChat();
  if (x.contra && c.found.includes(x.contra)) { A.contra(); buzz(30); praise('모순을 찾았어요!', 80); c.contraSeen = (c.contraSeen || 0) + 1; }
  drawDeal();
}
async function press(i) {
  const c = cur.v, g = c.g, x = g.talk[i]; if (c.busy || (c.pressed !== false && c.pressed != null) || !x.press) return;
  c.busy = true; c.pressed = i; persist();
  const chat = $('#chat'); $$('.qchip.press', chat).forEach(q => q.closest('.qchips').remove());
  chat.insertAdjacentHTML('beforeend', `<div class="bub me">${esc(x.press.q)}</div>`); chat.scrollTop = chat.scrollHeight;
  await wait(380); setMood(x.press.face);
  const b = document.createElement('div'); b.className = 'bub cu'; chat.appendChild(b); chat.scrollTop = chat.scrollHeight;
  await typeText(b, x.press.a, { speed: 28, cursor: false });
  c.busy = false; drawChat(); A.okay(); praise('손님이 털어놓았어요', 80);
}
/* 흥정판 + 선택 4개 */
function drawDeal() {
  const c = cur.v, g = c.g, floor = haggleFloor(g, c.found);
  if (c.offer == null || c.offer < floor || c.offer > g.ask) c.offer = floor;
  const lo = Math.min(g.ref, floor, g.fair), hi = Math.max(g.ask, g.ref), span = Math.max(1, hi - lo), pct = v => ((v - lo) / span * 100);
  const nCut = g.clues.filter(cl => c.found.includes(cl.spot) && (cl.kind === 'auth' || cl.kind === 'cond')).length;
  const under = g.ask <= g.fair;
  const note = under ? `손님이 부른 값이 장부 시세보다 낮아요 · <b>제값</b>을 생각해 보세요` : nCut ? `짚은 흠 <b>${nCut}개</b>를 근거로 <b>${won(floor)}</b>까지 깎을 수 있어요` : '근거가 없으면 조금만 깎을 수 있어요 · 흠을 짚어 보세요';
  const ch = g.choices, sub = k => esc(k === 'haggle' ? `${won(c.offer)} 제안` : k === 'buy' ? (g.pay ? `제값 ${won(buyPrice(g))} 쳐 드리기` : `${won(g.ask)} 그대로`) : ch[k].sub);
  $('#deal').innerHTML = `<div class="haggle"><div class="hrow"><div>손님이 부른 값<b>${won(g.ask)}</b></div><div>내 제안<b class="me" id="offv">${won(c.offer)}</b></div><div>장부 시세<b>${won(g.ref)}</b></div></div>
    <div class="track" id="trk" style="--a:${pct(Math.min(g.ask, g.fair * 1.15))}%;--b:${pct(Math.min(g.ask, (g.fair + g.ask) / 2 + 0.01))}%"><i class="lim" style="left:${pct(floor)}%"></i><i class="knob" id="knob" style="left:${pct(c.offer)}%" data-v="${c.offer}만"></i></div>
    <div class="hnote">${note}</div>${toolOn(S.xp, 'scale') ? `<div class="scaleh">저울 · 흠을 다 짚으면 제값은 ${won(g.fair)} 안팎</div>` : ''}</div>
    <div class="choices">${['buy', 'haggle', 'back', 'report'].map(k => `<button class="ch" data-k="ch" data-c="${k}"><b>${esc(ch[k].label || CHN[k])}</b><small id="sub_${k}">${sub(k)}</small></button>`).join('')}</div>`;
  /* 손잡이 끌기: 근거로 깎을 수 있는 값 ~ 부른 값 */
  const trk = $('#trk'), knob = $('#knob');
  const setV = clientX => { const r = trk.getBoundingClientRect(); let v = Math.round(lo + (clientX - r.left) / r.width * span); v = Math.max(floor, Math.min(g.ask, v)); if (v !== c.offer) { c.offer = v; A.type(); buzz(4); } knob.style.left = pct(v) + '%'; knob.dataset.v = v + '만'; $('#offv').textContent = won(v); $('#sub_haggle').textContent = `${won(v)} 제안`; };
  trk.onpointerdown = e => { try { trk.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 */ } setV(e.clientX); trk.onpointermove = ev => setV(ev.clientX); };
  trk.onpointerup = trk.onpointercancel = () => { trk.onpointermove = null; persist(); };
}
function choose(k) {
  const c = cur.v, g = c.g;
  $$('.ch', el).forEach(b => b.classList.toggle('sel', b.dataset.c === k));
  const ev = g.clues.filter(cl => c.found.includes(cl.spot) && (cl.kind === 'auth' || cl.kind === 'cond'));
  const q = { buy: `<b>${won(buyPrice(g))}</b>에 살까요?`, haggle: `<b>${won(c.offer)}</b>을 제안할까요?${ev.length ? `<br><small>근거: ${ev.map(x => esc(x.title)).join(' · ')}</small>` : ''}`, back: '사지 않고 정중히 돌려보낼까요?', report: '파출소에 주인 확인을 부탁할까요?' }[k];
  modal(`<h3>${esc(g.choices[k].label || CHN[k])}</h3><p class="hfp">${q}</p><p>${esc(g.choices[k].sub)}</p><div class="row2"><button class="btn sec" data-a="close">다시 생각</button><button class="btn pri" data-a="ok">도장 찍기</button></div>`, a => {
    if (a === 'close') { closeModal(); $$('.ch', el).forEach(b => b.classList.remove('sel')); }
    if (a === 'ok') { closeModal(); A.stamp(); buzz(40); c.choice = k; persist(); go('decide'); }
  }, { center: true });
}
function persist() { const c = cur.v; if (S.prog && S.prog.key === c.key && S.prog.mode === c.mode) { Object.assign(S.prog, { asked: c.asked, offer: c.offer, face: c.face, found: c.found, pressed: c.pressed }); save(); } }
void D; void cutOf;
