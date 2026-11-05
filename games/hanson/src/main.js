// 오랜상회 Olden & Co. v0.2 — 하루 영업 감정 가게 (2026-11-02 첫 화면 게이트 뒤 구조: 하루 무료 손님 4명)
//   아침 · 낮 · 오후 = 골목 손님(짧은 퍼즐 · 동전 · 도감 · 경험치) → 저녁 = 오늘의 주인공(모두 같은 손님 · 주간 이야기 · 평판 · 통계)
//   → 하루 결산(등급 도장 · 동전 · 평판 · 경험치) → 영업 연장(광고 3 · 골드 6) · 장부 · 도감 · 꾸미기
//   데이터: data/*.json (사람이 쓴 8주 뼈대 + 예비 손님 + 골목 손님 풀 — content/*.mjs 에서 tools/build_data.mjs 로 만듦)
import { D, H, cur, loadData, tagOf, prefetch, face, sil, itemImg } from './state.js?v=0.99.11';
import { S, load, save, today, setDay, week } from './save.js?v=0.99.11';
import * as A from './audio.js?v=0.99.11';
import { $, $$, esc, I, toast, modal, closeModal, typeText, wait, sp, coinFly, center, fmt, setHaptic, buzz, sparks } from './ui.js?v=0.99.11';
import { sceneHTML, layout, setFace } from './scene.js?v=0.99.11';
import { openInspect, resizeInspect } from './inspect.js?v=0.99.11';
import { openTalk } from './talk.js?v=0.99.11';
import { mainGuest, slot, judge, coinsFor, applyRep, AX, AXN, GRADE, CHN, won, buyPrice, nextTease, addDays, COIN, SLOTS, FREE_ALLEY, EXT, pickAlley, levelOf, xpFor, LEVELS, TOOLS } from './engine.js?v=0.99.11';
import { WHY } from './check.js?v=0.99.11';
import { openLedger, openBook, openDeco, openSettings, settleIfDue, shareCard, refreshTabs, pastWeeks } from './pages.js?v=0.99.11';
import { bm } from './oad_bm.js?v=0.99.11';
import { installBack, inOAD, exitToOAD } from './oad.js?v=0.99.11';

window.__errs = [];
addEventListener('error', e => window.__errs.push(String(e.message)));
addEventListener('unhandledrejection', e => window.__errs.push(String(e.reason)));
export const track = (name, p) => { try { if (inOAD) window.parent.postMessage({ type: 'oad:track', name, p }, '*'); } catch { /* */ } };

/* ---------- 화면 전환 ---------- */
let scr = 'shop';
export function show(id) {
  scr = id; $$('.scr').forEach(s => s.classList.toggle('on', s.id === id));
  const tabbed = ['ledger', 'book', 'deco'].includes(id) || (id === 'shop' && !visiting());
  $('#tabs').classList.toggle('on', tabbed); refreshTabs(id);
}
export const curScreen = () => scr;
const visiting = () => !!(cur.v && cur.v.stage && cur.v.stage !== 'done');

/* ---------- HUD ---------- */
export function hud(sub) {
  const k = today(), s = slot(k, D.weeks.length), w = D.weeks[s.wi], lv = levelOf(S.xp);
  const gold = H.ok ? `<div class="chipc" id="goldc"><i class="goldi">G</i>${fmt(H.gold || 0)}</div>` : '';
  return `<div class="hud"><div class="brand"><div class="seal${S.deco.on.sign === 'gilt' ? ' gold' : ''}">오</div><div><b>오랜상회</b><small>${esc(sub || `${s.wk + 1}주차 · ${w.title} · ${lv.name}`)}</small></div></div><div class="sp"></div>
    <div class="chipc" id="coinc"><i class="coin"></i><span>${fmt(S.coins)}</span></div>${gold}<button class="icb" data-k="set" aria-label="설정">${I.gear}</button></div>
    <div class="reps"><div class="rep" data-ax="dan" style="color:#b2452e">${I.heart}<span style="color:var(--ink)">단골 <em>${S.rep.dan}</em></span></div><div class="rep" data-ax="gol" style="color:var(--gold)">${I.talk}<span style="color:var(--ink)">골목 <em>${S.rep.gol}</em></span></div><div class="rep" data-ax="pa" style="color:var(--accent2)">${I.shield}<span style="color:var(--ink)">파출소 <em>${S.rep.pa}</em></span></div></div>`;
}
export function refreshCoins() { $$('#coinc span').forEach(x => { x.textContent = fmt(S.coins); }); $$('#goldc').forEach(x => { x.innerHTML = `<i class="goldi">G</i>${fmt(H.gold || 0)}`; }); }

/* ---------- 하루 영업 ---------- */
/* 오늘 가게: 무료 4칸(골목 3 + 주인공 1) — 문을 열 때 정해 둠(골목 손님은 2주 안 만난 사람 빼고) */
export function dayOf(k = today()) {
  if (S.shop[k]) return S.shop[k];
  const ids = pickAlley(D, k, S.alleySeen, FREE_ALLEY);
  const { g } = mainGuest(D, k);
  S.shop[k] = { slots: [...ids.map(id => ({ kind: 'alley', id })), { kind: 'main', id: g.id }], ad: 0, gold: 0, settled: false };
  save(); return S.shop[k];
}
const nextSlot = d => d.slots.findIndex(x => !x.rec);
const freeDone = d => d.slots.slice(0, FREE_ALLEY + 1).every(x => x.rec);
const tod = i => (i < 3 ? i : 3);

/* ---------- 손님 판 ---------- */
function newVisit(mode, key, g, extra = {}) {
  cur.v = { mode, key, g, stage: 'enter', found: [], asked: [], pressed: false, ledger: false, face: 0, offer: null, choice: null, hint: 0, uv: false, ...extra };
  S.prog = { mode, key, id: g.id, si: extra.si ?? null, stage: 'enter', found: [], asked: [], pressed: false, ledger: false, help: extra.helpSpot || null };
  save();
}
function resumeVisit() {
  const p = S.prog; if (!p) return false;
  const g = findGuest(p.id); if (!g || (p.mode !== 'replay' && p.key !== today())) { S.prog = null; return false; }
  cur.v = { mode: p.mode, key: p.key, g, si: p.si, stage: p.stage || 'enter', found: p.found || [], asked: p.asked || [], pressed: p.pressed ?? false, ledger: !!p.ledger, face: p.face || 0, offer: p.offer ?? null, choice: null, hint: p.hint || 0, helpSpot: p.help || null, uv: !!p.uv };
  return true;
}
export function findGuest(id) { for (const w of D.weeks) for (const g of w.days) if (g.id === id) return g; return D.reserve.find(g => g.id === id) || D.extras.find(g => g.id === id) || null; }
function setStage(st) { if (cur.v) cur.v.stage = st; if (S.prog) { S.prog.stage = st; save(); } }

/* ---------- ① 가게 ---------- */
let shopBox = null;
export function openShop() {
  if (visiting()) return renderVisit();
  const d = S.shop[today()];
  if (!d) return renderArrive();
  const i = nextSlot(d);
  if (i >= 0) return renderNext(d, i);
  if (!d.settled) return daySettle();
  renderIdle();
}
function sceneBox(el, opts) {
  el.innerHTML = `<div class="scene tod${opts.tod ?? 1}" style="position:absolute;inset:0">${sceneHTML(opts)}</div>`;
  shopBox = $('.scene', el); requestAnimationFrame(() => layout(shopBox, { top: Math.max(150, el.clientHeight * 0.2) })); return shopBox;
}
function dateLine(k) { const d = new Date(k + 'T12:00:00'); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${'일월화수목금토'[d.getDay()]}요일`; }
function signHTML(top) { const s = S.deco.on.sign; return `<div class="sign ${s === 'najeon' && S.deco.own.najeon ? 'najeon' : s === 'gilt' && H.owned ? 'gilt' : ''}" style="top:${top}px"><div><b>오랜상회</b><small>OLDEN &amp; CO.</small></div></div>`; }
const gradeMark = g => (g === 'best' ? '명' : g === 'good' ? '좋' : '따');
/* 오늘의 손님 줄(아침 · 낮 · 오후 · 저녁 + 연장) */
function timeline(d, curI = -1) {
  const tile = (x, i) => { const g = findGuest(x.id), st = x.rec ? `<i class="mk ${x.rec.grade}">${gradeMark(x.rec.grade)}</i>` : i === curI ? '<i class="mk now">●</i>' : '<i class="mk wait">·</i>';
    return `<div class="tl${x.kind === 'main' ? ' main' : ''}${i === curI ? ' on' : ''}">${st}<b>${SLOTS[i]}</b><small>${x.kind === 'main' ? '주인공' : esc(g ? tagOf(g) : '')}</small></div>`; };
  const base = d.slots.slice(0, 4).map(tile).join(''), ext = d.slots.slice(4);
  if (!ext.length) return `<div class="tline">${base}</div>`;
  /* 영업 연장 손님은 한 칸으로 묶어 '끝낸 수 / 받은 수' */
  const done = ext.filter(x => x.rec).length, on = curI >= 4;
  return `<div class="tline">${base}<div class="tl ext${on ? ' on' : ''}"><i class="mk ${on ? 'now' : done === ext.length ? 'best' : 'wait'}">${on ? '●' : done === ext.length ? '✓' : '·'}</i><b>연장</b><small>${done}/${ext.length}명</small></div></div>`;
}
/* 문 열기 전: 어제 이야기 한 줄 + 오늘 손님 줄 */
function renderArrive() {
  const el = $('#shop'), k = today(), y = addDays(k, -1), yr = S.days[y], yg = yr && findGuest(yr.id);
  const later = yr && !yr.replay && yg && yg.later && yg.later[yr.choice];
  const box = sceneBox(el, { cast: null, tod: 0 });
  box.insertAdjacentHTML('beforeend', hud() + signHTML(Math.max(110, el.clientHeight * 0.15)) + `<div class="talkbox" style="bottom:calc(var(--safe-b) + 80px)">${later ? `<div class="later">${esc(later)}</div>` : ''}
    <div class="done-card"><h4>${dateLine(k)} · 오늘의 가게</h4><p>${S.plays ? '오늘도 손님 네 분이 와요. 아침부터 골목 손님 셋, 저녁엔 오늘의 주인공.' : '할머니께 물려받은 골목 끝 감정소. 오늘부터 당신이 감정사예요. 아침부터 저녁까지 손님 네 분이 와요.'}</p>
    <div class="tline">${SLOTS.map((s, i) => `<div class="tl${i === 3 ? ' main' : ''}"><i class="mk wait">·</i><b>${s}</b><small>${i === 3 ? '주인공' : '골목 손님'}</small></div>`).join('')}</div>
    <button class="btn pri" data-k="open">문 열기 <span class="arr">→</span></button></div></div>`);
  show('shop'); bindShop();
}
/* 다음 손님 차례 (손님과 손님 사이) */
function renderNext(d, i) {
  const el = $('#shop'), x = d.slots[i], g = findGuest(x.id), main = x.kind === 'main';
  const box = sceneBox(el, { cast: null, tod: tod(i) });
  const lab = i < 4 ? SLOTS[i] : '영업 연장';
  box.insertAdjacentHTML('beforeend', hud() + signHTML(Math.max(110, el.clientHeight * 0.15)) + `<div class="talkbox" style="bottom:calc(var(--safe-b) + 80px)"><div class="done-card">
    <h4>${lab} · 손님이 문 앞에 왔어요</h4><p>${main ? '오늘의 주인공 손님이에요. 모두에게 같은 손님 · 이번 주 이야기가 이어져요.' : `골목 손님 · 짧은 감정 한 판 · ${esc(tagOf(g))}`}</p>
    ${timeline(d, i)}<button class="btn pri" data-k="next">${main ? '저녁 손님 맞이하기' : '손님 맞이하기'} <span class="arr">→</span></button></div></div>`);
  show('shop'); bindShop();
}
async function startSlot(i) {
  const k = today(), d = dayOf(k), x = d.slots[i], g = findGuest(x.id);
  if (x.kind === 'main') {
    /* 응원 선물 (이야기형 · 2연속 '따뜻한 감정'이면 다음 날 저녁 손님 때) — bm-policy 6장 */
    let helpSpot = null;
    const eligible = S.warm >= 2 && S.helpDay !== k;
    track('help_eligible', { on: eligible && bm.helpOn() ? 1 : 0 });
    if (eligible && bm.helpOn()) {
      track('help_offer');
      const take = await new Promise(res => modal(`<h3>먼지가 오늘은 일찍 일어났어요</h3><p class="hfp">요 며칠 마음 써서 감정하셨죠. 먼지가 저녁 손님 물건에서 수상한 곳을 하나 미리 봐 뒀대요.</p><p>응원 선물 · 챙겨 드릴게요</p><div class="row2"><button class="btn sec" data-a="no">혼자 해 볼게요</button><button class="btn pri" data-a="yes">고마워, 먼지</button></div>`, a => { closeModal(); res(a === 'yes'); }, { center: true, closable: false }));
      S.helpDay = k; S.warm = 0;
      if (take) { track('help_take'); const t = g.clues.find(c => c.kind !== 'trap'); helpSpot = t && t.spot; } else track('help_decline');
    }
    newVisit('main', k, g, { si: i, helpSpot, helped: !!helpSpot });
  } else newVisit('alley', k, g, { si: i });
  renderVisit(true);
}
/* 손님 입장 · 첫 마디 */
/* 을/를 — 끝 글자 받침으로 */
const eulReul = w => { const ch = (w || '').trim().slice(-1).charCodeAt(0); return ch >= 0xAC00 && ch <= 0xD7A3 && (ch - 0xAC00) % 28 ? '을' : '를'; };
/* 다시 온 손님 · 골목 인연 한 줄 (대표 2026-11-02 "이야기도 다양하게") */
function recallOf(g, replay) {
  if (replay) return '';
  const last = (S.last || {})[g.cast];
  if (S.met[g.cast] && last && last !== g.itemName) return `<div class="recall">지난번엔 「${esc(last)}」${eulReul(last)} 들고 왔던 분이에요</div>`;
  const rel = (D.cast[g.cast].rel || []).find(([o]) => S.met[o]);
  if (rel) return `<div class="recall">${esc(D.cast[rel[0]].name)} 씨와 아는 사이 · ${esc(rel[1])}</div>`;
  return '';
}
async function renderVisit(entering = false) {
  const c = cur.v, g = c.g, el = $('#shop');
  if (c.stage !== 'enter') { if (c.stage === 'inspect') return goInspect(); if (c.stage === 'talk') return goTalk(); }
  const alley = c.mode === 'alley', replay = c.mode === 'replay';
  const box = sceneBox(el, { cast: g.cast, f: c.face, tod: replay ? 1 : tod(c.si ?? 3) });
  const k = today(), lab = c.si != null ? (c.si < 4 ? SLOTS[c.si] : '영업 연장') : '';
  const sub = alley ? `골목 손님 · ${lab}` : replay ? `다시 감정 · ${dateLine(c.key)}` : null;
  box.insertAdjacentHTML('beforeend', hud(sub) + `<div class="bell" style="top:${Math.round(el.clientHeight * 0.28)}px">딸랑—</div>
    <div class="dayband"><small>${alley ? `${lab} · 골목에서 온` : replay ? dateLine(c.key) : `${dateLine(k)} · 저녁`}</small><div>${alley ? '골목 손님' : replay ? '그날의 손님' : '오늘의 주인공'}</div></div>
    <div class="talkbox"><div class="nameplate">${esc(tagOf(g))}</div><div class="dbox">${recallOf(g, replay)}<p id="say"></p><div class="meta"><span class="tag">${esc(g.itemName)}</span><span class="tag">${S.met[g.cast] ? `${S.met[g.cast] + 1}번째 방문` : '첫 방문'}</span><span class="tag">${alley ? '약 2분' : '약 5분'}</span>${c.helped ? '<span class="tag hi">먼지의 응원</span>' : ''}</div></div>
    <button class="btn pri" data-k="unwrap" id="unwrap" style="visibility:hidden">보따리 풀어 보기 <span class="arr">→</span></button></div>`);
  show('shop'); bindShop();
  requestAnimationFrame(() => { const tb = $('.talkbox', el), dbd = $('.dayband', el); if (tb && dbd) dbd.style.bottom = (tb.offsetHeight + 24) + 'px'; });
  const gst = $('.guest', box);
  if (entering) { gst.classList.add('out'); await wait(250); A.bell(); $('.bell', el).classList.add('ring'); await wait(500); gst.classList.remove('out'); buzz(10); await wait(500); }
  await typeText($('#say'), g.intro.join(' '), { speed: 32 });
  const u = $('#unwrap'); if (u) u.style.visibility = '';
}
function goInspect() {
  setStage('inspect'); show('inspect');
  openInspect(r => { if (r === 'back') { setStage('enter'); renderVisit(); } else goTalk(); });
}
function goTalk() {
  setStage('talk'); show('talk');
  openTalk(r => { if (r === 'back') goInspect(); else decide(); });
}
/* 오늘 영업을 마친 가게: 내일 예고 · 영업 연장 */
export function renderIdle() {
  const el = $('#shop'), k = today(), d = dayOf(k), { g } = mainGuest(D, k), rec = S.days[k];
  const box = sceneBox(el, { cast: null, tod: 3 });
  const t = nextTease(D, k), ng = mainGuest(D, addDays(k, 1)).g;
  box.insertAdjacentHTML('beforeend', hud() + signHTML(Math.max(110, el.clientHeight * 0.15)) + `<div class="talkbox" style="bottom:calc(var(--safe-b) + 80px)">
    <div class="done-card"><h4>오늘 영업을 마쳤어요</h4><p>${rec ? `저녁 손님 ${esc(tagOf(g))} — <b>${GRADE[rec.grade]}</b> · ` : ''}오늘 손님 ${d.slots.filter(x => x.rec).length}명을 맞았어요.</p>
    <div class="tmr"><div class="silh"><img src="assets/g/${ng.cast}_s.webp" alt=""></div><div><b>내일 저녁 손님</b>${esc(t)}</div></div>
    ${extendBtns(d)}</div></div>`);
  show('shop'); bindShop();
}
/* 영업 연장: 광고 골목 손님 +1(하루 3) · 골드 1명 20 / 3명 50(하루 6) — 이야기 · 평판 · 통계엔 안 닿음 */
function extendBtns(d) {
  const adLeft = EXT.ad - d.ad, goldLeft = EXT.gold - d.gold;
  if (!H.ok) return '<p style="margin-top:10px;font-size:12px">영업 연장(골목 손님 더 받기)은 원어데이 앱에서 할 수 있어요.</p>';
  const p1 = bm.price('extra1') || 20, p3 = bm.price('extra3') || 50;
  return `<p style="margin-top:10px;font-size:12.5px">영업 연장 · 골목 손님을 더 받아요 (동전 · 도감 · 경험치)</p><div class="xrow">
    <button class="btn sec" data-k="xad" ${adLeft > 0 ? '' : 'disabled'}><span>${H.owned ? '바로 한 분 더' : '<i class="adic"></i> 광고 · 한 분 더'}</span><small>오늘 ${adLeft}/${EXT.ad}</small></button>
    <button class="btn sec" data-k="x1" ${goldLeft > 0 ? '' : 'disabled'}><span class="pr"><i class="goldi">G</i>${p1} · 1명</span><small>골드 ${goldLeft}/${EXT.gold}</small></button>
    ${goldLeft >= 3 ? `<button class="btn sec" data-k="x3" style="grid-column:1/-1"><span class="pr"><i class="goldi">G</i>${p3} · 3명</span><small>한 명에 17골드꼴</small></button>` : ''}</div>`;
}
function bindShop() {
  const el = $('#shop');
  el.onclick = async e => {
    const b = e.target.closest('[data-k]'); if (!b) { const say = $('#say'); if (say && say.__skip) say.__skip(); return; }
    A.unlock(); A.tap(); const k = b.dataset.k;
    if (k === 'set') return openSettings();
    if (k === 'open') { b.disabled = true; dayOf(today()); A.bell(); return openShop(); }
    if (k === 'next') { b.disabled = true; return startSlot(nextSlot(dayOf(today()))); }
    if (k === 'unwrap') return goInspect();
    if (k === 'xad' || k === 'x1' || k === 'x3') return extend(k);
  };
}
export async function extend(k) {
  const day = today(), d = dayOf(day);
  if (k === 'xad') {
    if (d.ad >= EXT.ad) return toast(`광고 영업 연장은 하루 ${EXT.ad}번이에요`);
    const r = await bm.rewardedAd('hanson_extra'); if (!r.ok) return toast(r.reason === 'limit' ? '오늘 광고는 다 봤어요' : '광고를 불러오지 못했어요');
    d.ad++; addAlley(1);
  } else {
    const n = k === 'x3' ? 3 : 1; if (d.gold + n > EXT.gold) return toast(`골드 영업 연장은 하루 ${EXT.gold}명까지예요`);
    const r = await bm.spend(k === 'x3' ? 'extra3' : 'extra1'); if (!r.ok) return r.reason === 'cancel' ? null : toast(r.reason === 'short' ? '골드가 모자라요' : '지금은 살 수 없어요');
    H.gold = r.gold ?? H.gold; d.gold += n; addAlley(n); refreshCoins();
  }
  track('extend', { k }); save(true); closeModal(); openShop();
}
function addAlley(n) { const day = today(), d = dayOf(day); const ids = pickAlley(D, day, S.alleySeen, n, d.slots.map(x => x.id)); for (const id of ids) d.slots.push({ kind: 'alley', id }); }

/* ---------- 지난 저녁 손님 다시 감정 (광고 또는 20골드 · 동전만 · 그 주 완결 칸은 채움) ---------- */
export async function replayDay(key) {
  const { g } = mainGuest(D, key);
  if (!H.ok) return toast('다시 감정은 원어데이 앱에서 할 수 있어요');
  const pick = await new Promise(res => modal(`<h3>그날 손님 다시 감정</h3><p class="hfp">${esc(dateLine(key))} · ${esc(tagOf(g))}<br>${esc(g.itemName)}</p><p>평판 · 이야기는 그대로 두고, 동전과 이번 주 완결 칸만 채워요.</p><div class="row2"><button class="btn sec" data-a="ad">${H.owned ? '바로 열기' : '<i class="adic"></i> 광고 보고'}</button><button class="btn pri" data-a="gold"><span class="pr"><i class="goldi">G</i>${bm.price('replay') || 20}</span></button></div><button class="btn ghost" data-a="close">다음에</button>`, a => { closeModal(); res(a); }));
  if (pick === 'ad') { const r = await bm.rewardedAd('hanson_replay'); if (!r.ok) return toast('광고를 불러오지 못했어요'); }
  else if (pick === 'gold') { const r = await bm.spend('replay'); if (!r.ok) return r.reason === 'cancel' ? null : toast(r.reason === 'short' ? '골드가 모자라요' : '지금은 살 수 없어요'); H.gold = r.gold ?? H.gold; }
  else return;
  newVisit('replay', key, g); renderVisit(true);
}

/* ---------- ④ 결정 → 결과 ---------- */
async function decide() {
  const c = cur.v, g = c.g, ch = g.choices[c.choice];
  const res = judge(g, { choice: c.choice, found: c.found, asked: c.asked, ledger: c.ledger, offer: c.offer });
  const alley = c.mode === 'alley', replay = c.mode === 'replay';
  const coins = replay ? COIN.replay + res.gotContra * COIN.contra : coinsFor(res, alley);
  const xp = xpFor(res, alley), lv0 = levelOf(S.xp).i;
  const before = { ...S.rep };
  if (c.mode === 'main') {
    S.rep = applyRep(S.rep, ch.rep);
    const s = slot(c.key, D.weeks.length), wk = week(s.wk); wk.rep = applyRep(wk.rep, ch.rep);
    S.warm = res.grade === 'warm' ? S.warm + 1 : 0;
  }
  const rec = { id: g.id, choice: c.choice, grade: res.grade, offer: c.offer, price: res.price, coins, xp, at: Date.now() };
  if (!alley) S.days[c.key] = { ...rec, found: c.found, asked: c.asked, ledger: c.ledger, replay };
  else S.alleySeen[g.id] = c.key;
  if (c.si != null && S.shop[c.key] && S.shop[c.key].slots[c.si]) S.shop[c.key].slots[c.si].rec = rec;
  S.xp += xp; S.met[g.cast] = (S.met[g.cast] || 0) + 1; if (!replay) (S.last || (S.last = {}))[g.cast] = g.itemName; S.plays++; S.tut = 1; S.prog = null;
  c.stage = 'done'; c.res = res; c.coins = coins; c.xp = xp; c.before = before; c.lvUp = levelOf(S.xp).i > lv0 ? levelOf(S.xp).i : 0;
  save(true);
  track(alley ? 'alley_done' : replay ? 'replay_done' : 'guest_done', { id: g.id, ch: c.choice, gr: res.grade });
  await reaction();
  renderResult();
}
/* 손님 반응: 표정이 바뀌고 한 마디 */
async function reaction() {
  const c = cur.v, g = c.g, ch = g.choices[c.choice], el = $('#result');
  el.innerHTML = `<div class="scene tod${c.mode === 'replay' ? 1 : tod(c.si ?? 3)}" style="position:absolute;inset:0">${sceneHTML({ cast: g.cast, f: c.face })}</div>`;
  const box = $('.scene', el);
  show('result'); layout(box, { top: Math.max(150, el.clientHeight * 0.2) });
  box.insertAdjacentHTML('beforeend', `<div class="reaction"><div class="nameplate">${esc(tagOf(g))}</div><div class="dbox"><p id="rsay"></p></div><button class="btn ghost" id="rnext" style="color:#fff3dc">계속 ›</button></div>`);
  await wait(250); setFace(box, ch.face); if (ch.face === 2) A.fanfare(0);
  await typeText($('#rsay'), ch.line, { speed: 34 });
  await new Promise(res => { const t = setTimeout(res, sp(1600)); el.onclick = () => { clearTimeout(t); res(); }; });
  el.onclick = null;
}
function renderResult() {
  const c = cur.v, g = c.g, res = c.res, ch = g.choices[c.choice], el = $('#result');
  const alley = c.mode === 'alley', replay = c.mode === 'replay', main = c.mode === 'main';
  const head = { buy: `${won(buyPrice(g))}에 샀어요`, haggle: `${won(c.offer)}에 깎아서 샀어요`, back: '정중히 돌려보냈어요', report: '주인 확인을 부탁했어요' }[c.choice];
  const stamp = { best: ['명감정', 'BEST CALL'], good: ['좋은<br>감정', 'GOOD CALL'], warm: ['따뜻한<br>감정', 'KIND CALL'] }[res.grade];
  const line = { best: '진실을 꿰뚫어 봤어요. 이 골목에 좋은 감정사가 왔네요.', good: '좋은 판단이에요. 손님도 고개를 끄덕였어요.', warm: '마음이 따뜻한 감정이었어요. 이런 날도 이야기가 돼요.' }[res.grade];
  const chips = [];
  if (res.contra) chips.push(`<span class="pc${res.gotContra ? ' hi' : ''}">모순 ${res.gotContra}/${res.contra} 찾음</span>`);
  chips.push(`<span class="pc">단서 ${res.gotReal}/${res.real}</span>`);
  if (res.trapOk) chips.push('<span class="pc hi">함정 가려냄</span>');
  if (res.fairDeal) chips.push('<span class="pc hi">적정가 거래</span>');
  chips.push(`<span class="pc">경험치 +${c.xp}</span>`);
  const miss = res.missed[0];
  const missH = miss ? `<div class="miss"><img src="assets/cat_2.webp" alt=""><div>놓친 하나 — <b>${esc(miss.title)}</b>. ${esc(miss.note)}. 먼지가 보고 있었죠. 다음엔 꼭!</div></div>` : '<div class="miss"><img src="assets/cat_0.webp" alt=""><div><b>진짜 단서를 모두 짚었어요.</b> 먼지도 감탄했어요.</div></div>';
  let repH = '';
  if (main) {
    const mx = Math.max(10, ...AX.map(k => Math.abs(S.rep[k])));
    repH = `<div class="repbars">${AX.map((k, i) => { const d = ch.rep[i], b = c.before[k], w0 = Math.max(0, Math.min(b, S.rep[k])) / mx * 100, wd = Math.abs(d) / mx * 100; return `<div class="rb"><span>${AXN[k]}</span><div class="bar"><i style="width:${w0}%"></i>${d ? `<u class="${d < 0 ? 'dn' : ''}" style="left:${w0}%;width:${wd}%"></u>` : ''}</div><em class="${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${d > 0 ? '+' + d : d < 0 ? d : S.rep[k]}</em></div>`; }).join('')}</div>
      <div class="mood2">${esc(moodLine(ch.rep))}</div>`;
  }
  const others = main ? `<div class="others"><h5>다른 감정사들은?<small>오늘의 주인공</small></h5><p>${esc(othersLine(c.choice))}</p></div>` : '';
  const k = today(), ng = mainGuest(D, addDays(k, 1)).g;
  const tmr = main ? `<div class="tmr"><div class="silh"><img src="assets/g/${ng.cast}_s.webp" alt=""></div><div><b>내일 저녁 손님</b>${esc(nextTease(D, k))}</div></div>` : '';
  const d = S.shop[k], ni = d ? nextSlot(d) : -1;
  const primary = main ? `장부에 적기 · 동전 +${c.coins}` : replay ? `장부로 · 동전 +${c.coins}` : ni >= 0 ? `다음 손님 · 동전 +${c.coins}` : `오늘 결산 · 동전 +${c.coins}`;
  el.innerHTML = `<div class="resbg"></div><div class="sheet res"><div class="scroll">
      <div class="stamp ${res.grade}" id="stampx">${stamp[0]}<small>${stamp[1]}</small></div>
      <h3>${esc(head)}</h3><div class="sub">${esc(tagOf(g))} · ${esc(g.itemName)}${alley ? ' · 골목 손님' : replay ? ' · 다시 감정' : ' · 오늘의 주인공'}</div>
      <div class="praise">${chips.join('')}</div>
      <div class="yay">${esc(line)}${res.note ? `<br><small style="font:500 12px var(--sf);color:var(--ink2)">${esc(res.note)}</small>` : ''}</div>
      <div class="truth"><span class="k">그 뒤 이야기</span>${esc(ch.after)}</div>
      <div class="truth"><span class="k">그날의 진실${WHY[g.truth.why] ? ` · ${esc(WHY[g.truth.why])}` : ''}</span>${esc(g.truth.story)}</div>
      ${missH}${repH}${others}${tmr}
    </div><div class="rbtns">
      <button class="btn pri" data-k="done">${primary}</button>
      ${main ? '<button class="btn sec" data-k="share" style="grid-column:1/-1">공유 카드</button>' : ''}
    </div></div>`;
  show('result');
  setTimeout(() => { const s = $('#stampx'); if (s) { s.classList.add('slam'); A.stamp(); buzz(30); setTimeout(() => A.fanfare(res.grade === 'best' ? 2 : res.grade === 'good' ? 1 : 0), sp(250)); } }, sp(350));
  el.onclick = async ev => {
    const b = ev.target.closest('[data-k]'); if (!b) return; A.tap(); const kk = b.dataset.k;
    if (kk === 'share') return shareCard(c);
    if (kk === 'done') {
      b.disabled = true; await payout(b); const lvUp = c.lvUp; cur.v = null;
      if (lvUp) await levelUp(lvUp);
      if (main || replay) { openLedger({ write: c.key }); if (main) setTimeout(() => daySettle(), sp(1900)); else setTimeout(() => settleIfDue(), sp(1600)); return; }
      openShop();
    }
  };
}
async function payout(btn) {
  const c = cur.v; if (c.paid) return; c.paid = true;
  S.coins += c.coins; save(true); A.coin(4);
  const to = $('#coinc') ? center($('#coinc')) : { x: 330, y: 30 };
  coinFly(center(btn), to, 7); sparks(center(btn).x, center(btn).y, 10);
  await wait(650);
}
function levelUp(i) {
  const L = LEVELS[i], t = L.tool ? TOOLS[L.tool] : null; A.fanfare(2); buzz(40);
  track('level', { lv: i });
  return new Promise(res => modal(`<div style="text-align:center"><div class="stamp best" style="position:relative;display:inline-grid;right:auto;top:auto;margin:4px auto 8px">승급<small>LEVEL UP</small></div><h3>${esc(L.name)}</h3><p>감정한 손님이 쌓여 등급이 올랐어요.</p>${t ? `<div class="reward" style="text-align:left"><img src="assets/cat_0.webp" alt=""><div><b>새 도구 · ${esc(t.name)}</b><span>${esc(t.desc)}</span></div></div>` : ''}</div><button class="btn pri" data-a="close">좋아요</button>`, () => { closeModal(); res(); }, { center: true }));
}
/* ---------- 하루 결산: 오늘 손님 등급 도장 · 동전 합계 · 평판 변화 · 경험치 ---------- */
export function daySettle() {
  const k = today(), d = S.shop[k]; if (!d) return;
  const got = d.slots.filter(x => x.rec); if (!got.length) return;
  const first = !d.settled; d.settled = true;
  if (first && freeDone(d)) { d.bonus = COIN.day; S.coins += COIN.day; }
  save(true);
  const bonus = d.bonus || 0, coins = got.reduce((a, x) => a + (x.rec.coins || 0), 0) + bonus, xp = got.reduce((a, x) => a + (x.rec.xp || 0), 0), lv = levelOf(S.xp);
  const main = S.days[k], mg = main && !main.replay && findGuest(main.id), rep = mg ? mg.choices[main.choice].rep : null;
  const pct = lv.to > lv.from ? Math.round((lv.xp - lv.from) / (lv.to - lv.from) * 100) : 100;
  const ng = mainGuest(D, addDays(k, 1)).g;
  if (first) { A.fanfare(1); track('day_settle', { n: got.length, coins }); }
  const close = () => { closeModal(); openShop(); setTimeout(() => settleIfDue(), sp(500)); };
  modal(`<h3>오늘의 가게 · 결산</h3><p>${dateLine(k)} · 손님 ${got.length}명</p>
    <div class="dayrow">${d.slots.map((x, i) => { const g = findGuest(x.id); return `<div class="dr${x.kind === 'main' ? ' main' : ''}"><span>${i < 4 ? SLOTS[i] : '연장'}</span><b>${esc(g ? tagOf(g) : '')}</b>${x.rec ? `<i class="mini ${x.rec.grade}">${x.rec.grade === 'best' ? '명<br>감정' : x.rec.grade === 'good' ? '좋은<br>감정' : '따뜻한<br>감정'}</i>` : '<i class="mini warm" style="opacity:.3">·</i>'}</div>`; }).join('')}</div>
    <div class="price3"><div>오늘 동전<b>+${fmt(coins)}</b>${bonus ? `<small>하루 영업 보너스 +${bonus}</small>` : ''}</div><div>경험치<b>+${xp}</b></div></div>
    <div class="xpbar"><div><b>${esc(lv.name)}</b>${lv.next ? `<small>다음 ${esc(lv.next)}까지 ${lv.to - lv.xp}</small>` : ''}</div><i><u style="width:${pct}%"></u></i></div>
    ${rep ? `<div class="branch">평판 · ${AX.map((a, i) => `${AXN[a]} ${rep[i] > 0 ? '+' + rep[i] : rep[i]}`).join(' · ')} — ${esc(moodLine(rep))}</div>` : ''}
    <div class="tmr"><div class="silh"><img src="assets/g/${ng.cast}_s.webp" alt=""></div><div><b>내일 저녁 손님</b>${esc(nextTease(D, k))}</div></div>
    ${H.ok ? `<div class="sect" style="margin-top:14px">영업 연장<small>골목 손님을 더 받아요</small></div>${extendBtns(d)}` : ''}
    <button class="btn pri" data-a="close">가게로</button>`, a => { if (a === 'close') close(); });
  $('#modal').onclick = e => { const b = e.target.closest('[data-k],[data-a]'); if (!b) return; A.tap(); if (b.dataset.k) return extend(b.dataset.k); if (b.dataset.a === 'close') close(); };
}
function moodLine(rep) {
  const [d, g, p] = rep, ups = [];
  if (d > 0) ups.push('단골들이 고개를 끄덕여요'); if (g > 0) ups.push('골목에 좋은 소문이 돌아요'); if (p > 0) ups.push('파출소에서 믿음이 쌓였어요');
  if (!ups.length) { if (d < 0 || g < 0 || p < 0) return '골목 분위기가 조금 서늘해졌어요 · 내일 손님은 또 달라요'; return '골목은 오늘도 조용해요'; }
  return ups.join(' · ');
}
/* 선택 통계: 표본 50명 이상일 때만 숫자 (사업 9-5-4) — 서버 집계가 붙기 전에는 문장형 */
export function othersLine(choice, stats = null) {
  if (stats && stats.n >= 50) return Object.entries(stats.p).map(([k, v]) => `${CHN[k]} ${Math.round(v * 100)}%`).join(' · ');
  return { buy: '먼지가 보기엔, 오늘은 그냥 사 준 감정사가 꽤 있대요. 50명이 모이면 비율을 보여 드려요.', haggle: '먼지가 보기엔, 오늘 흥정한 감정사가 많대요. 50명이 모이면 비율을 보여 드려요.', back: '먼지가 보기엔, 오늘은 돌려보낸 감정사도 많대요. 50명이 모이면 비율을 보여 드려요.', report: '먼지가 보기엔, 주인을 찾아 준 감정사도 있대요. 50명이 모이면 비율을 보여 드려요.' }[choice];
}
export function streakDays() { let n = 0, k = today(); while (S.days[k] && !S.days[k].replay) { n++; k = addDays(k, -1); } return n; }

/* ---------- 뒤로가기 ---------- */
function onBack() {
  if (scr === 'inspect') { setStage('enter'); renderVisit(); return true; }
  if (scr === 'talk') { goInspect(); return true; }
  if (scr === 'result') { const b = $('#result [data-k="done"]'); if (b) b.click(); return true; }
  if (['ledger', 'book', 'deco'].includes(scr)) { openShop(); return true; }
  return false;
}

/* ---------- 시작 ---------- */
async function boot() {
  load(); A.setMuted(!S.set.sfx); A.setMusic(S.set.bgm); setHaptic(S.set.haptic);
  installBack({ back: onBack });
  try { await loadData(); } catch (e) { $('#boot').innerHTML = '<b>잠시 후 다시 열어 주세요</b>'; console.error(e); return; }
  const h = await bm.hello(); Object.assign(H, h.ok ? h : { ok: false });
  if (H.ok && H.owned) { S.deco.own.gilt = 1; S.deco.own.silver = 1; }
  addEventListener('pointerdown', () => A.unlock(), { passive: true });
  addEventListener('resize', () => { const sc = $('.scr.on .scene'); if (sc) layout(sc, { top: Math.max(150, sc.clientHeight * 0.2) }); resizeInspect(); });
  $('#tabs').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; A.tap(); A.unlock(); ({ shop: openShop, ledger: () => openLedger(), book: openBook, deco: openDeco })[b.dataset.t](); };
  window.__settings = openSettings;
  if (inOAD) document.body.classList.add('oad');
  resumeVisit();
  openShop();
  setTimeout(() => $('#boot').classList.add('off'), sp(350));
  setTimeout(warmToday, 600);
  if (!visiting() && !S.shop[today()]) setTimeout(() => settleIfDue(), sp(900));
  window.__hanson.ready = true;   /* 시험 도구는 고정 대기 대신 이 신호를 기다림 (2026-11-03 이어하기 검사 실패 원인) */
}
/* 4G: 첫 화면 뒤 쉬는 틈에 오늘 손님(얼굴 3표정 · 물건) → 내일 실루엣 → 먼지 · 소품 순서로 미리 받음
   전체 그림(약 26MB)을 다 받진 않음 — 오늘 쓸 것만(약 1.5MB) · 나머지는 그날 그때 받음 */
function warmToday() {
  try {
    const k = today(), d = S.shop[k], ids = d ? d.slots.map(x => x.id) : [...pickAlley(D, k, S.alleySeen, FREE_ALLEY), mainGuest(D, k).g.id];
    const gs = ids.map(findGuest).filter(Boolean), urls = [];
    if (cur.v && cur.v.g) gs.unshift(cur.v.g);
    for (const g of gs) urls.push(face(g.cast, 0), itemImg(g.item), face(g.cast, 1), face(g.cast, 2));
    urls.push(sil(mainGuest(D, addDays(k, 1)).g.cast), 'assets/cat_2.webp', 'assets/cat_1.webp');
    prefetch(urls);
  } catch (e) { console.warn(e); }
}
/* 시험 · 봇 연결 */
window.__hanson = { ready: false, S: () => S, D, cur, setDay: k => { setDay(k); cur.v = null; S.prog = null; closeModal(); openShop(); }, today, openShop, mainGuest: k => mainGuest(D, k), dayOf, pastWeeks, A, exitToOAD };
boot();
void judge;
