// M5-B 화면 — 은신처 '도전' 탭(주간 도전 · 깊은 물 · 업적) · 도전 결과 · 출격 준비 깊은 물 카드 · 업적 알림 · 칭호
//  스타일은 여기서 넣음(style.css 안 건드림) · 로직은 challenge.js · abyss.js · ach.js
import { S, save } from './save.js?v=0.99.37';
import { MAPS, ENEMIES, GEAR, WEAPONS } from './data.js?v=0.99.37';
import { ACHIEVEMENTS, ACH_CATS, ACH_CAT_KEYS } from './data/achievements.js?v=0.99.37';
import { CH, CH_RULES, ABYSS, TITLES, M5B_COS } from './data/m5b.js?v=0.99.37';
import { WEATHER } from './data/weather.js?v=0.99.37';
import * as CHL from './challenge.js?v=0.99.37';
import * as AB from './abyss.js?v=0.99.37';
import * as AC from './ach.js?v=0.99.37';
import { sfx, unlock } from './audio.js?v=0.99.37';

const $ = (s, r = document) => r.querySelector(s);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const shell = n => `<span class="shell"></span>${n}`;
const esc = s => String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const cosSub = k => (S.owned || []).includes(k) ? '옷장에 들어갔어요' : '받아 둠 — 옷장에 생기는 날 바로';
const medalTxt = m => m ? `${m[3]} ${m[2]}메달` : '메달 없음';
const MEDAL = n => CH.medal.find(m => m[0] === n) || null;
const rwTxt = r => r.kind === 'title' ? `칭호 「${TITLES[r.key]?.name || r.key}」` : `꾸미기 ${AC.cosName(r.key)}`;
const rewardTxt = rw => [rw.shells ? shell(rw.shells) : '', rw.cos ? `꾸미기 ${esc(AC.cosName(rw.cos))}` : '', rw.title ? `칭호 「${esc(TITLES[rw.title]?.name || rw.title)}」` : ''].filter(Boolean).join(' · ');

let css = false;
function style() {
  if (css || typeof document === 'undefined') return; css = true; const s = document.createElement('style');
  s.textContent = `
.m5seg{display:flex;gap:4px;margin:2px 0 10px;padding:3px;border-radius:12px;background:rgba(255,255,255,.05)}
.m5seg button{flex:1;padding:8px 0;border-radius:10px;font-size:13px;font-weight:700;color:var(--mute)}.m5seg button.on{background:rgba(255,255,255,.1);color:var(--tx)}
.m5seg button i{font-style:normal;font-size:11px;opacity:.75;margin-left:3px}
.m5c{display:flex;flex-direction:column;gap:10px}
.chw{position:relative;border-radius:16px;overflow:hidden;border:1px solid rgba(120,220,240,.28);background:rgba(10,28,38,.85)}
.chw .art{height:108px;background-size:cover;background-position:center;position:relative}
.chw .art::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,16,22,.05),rgba(6,16,22,.85))}
.chw .art b{position:absolute;left:12px;bottom:28px;z-index:1;font-size:19px;letter-spacing:-.4px}
.chw .art small{position:absolute;left:12px;bottom:9px;z-index:1;font-size:12px;color:#cfe3ea}
.chw .art em{position:absolute;right:10px;top:10px;z-index:1;font-style:normal;font-size:12px;font-weight:700;padding:4px 9px;border-radius:999px;background:rgba(0,0,0,.45);color:#9ff0ff}
.chw .bd{padding:10px 12px 12px;display:flex;flex-direction:column;gap:8px}
.rules{display:flex;flex-direction:column;gap:5px}
.rule{display:flex;gap:9px;align-items:flex-start;padding:7px 9px;border-radius:10px;background:rgba(255,255,255,.05)}
.rule span{font-size:19px;line-height:1.1}.rule b{display:block;font-size:13px}.rule small{font-size:12px;color:var(--mute);line-height:1.35}
.rule.good{background:rgba(125,255,178,.07)}
.kitl{display:flex;flex-wrap:wrap;gap:5px}.kitl span{font-size:12px;padding:4px 8px;border-radius:999px;background:rgba(255,255,255,.06);color:#d8e6ea}
.medals{display:flex;gap:6px}.medals div{flex:1;text-align:center;padding:6px 0;border-radius:10px;background:rgba(255,255,255,.04);font-size:12px;color:var(--mute)}
.medals div b{display:block;font-size:15px;color:var(--tx)}.medals div.on{background:rgba(255,196,80,.14);color:#ffe2a0;outline:1px solid rgba(255,196,80,.4)}
.chrow{display:flex;gap:8px;align-items:center}.chrow .btn.cta{flex:1;font-size:17px;padding:13px}
.chleft{font-size:12px;color:var(--mute);text-align:center}
.track{display:flex;flex-direction:column;gap:5px}
.trk{display:flex;align-items:center;gap:8px;font-size:12.5px;padding:5px 8px;border-radius:9px;background:rgba(255,255,255,.04)}
.trk i{font-style:normal;width:34px;text-align:center;font-weight:800;color:var(--mute)}.trk.got{background:rgba(125,255,178,.08)}.trk.got i{color:var(--mint)}
.trk small{margin-left:auto;color:var(--mute);font-size:11px}
.tbar{height:6px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}.tbar i{display:block;height:100%;background:linear-gradient(90deg,#5fd0e0,#7dffb2)}
.hist{display:flex;flex-direction:column;gap:4px}.hist div{display:flex;gap:8px;font-size:12.5px;padding:4px 2px;border-bottom:1px dashed rgba(255,255,255,.08)}.hist div b{margin-left:auto}
.lockc{text-align:center;padding:22px 12px;color:var(--mute);font-size:13px;line-height:1.5}.lockc b{display:block;font-size:17px;color:var(--tx);margin-bottom:4px}
.abx{border-radius:16px;padding:12px;background:radial-gradient(120% 90% at 50% 0%,rgba(110,70,200,.35),rgba(12,14,30,.92));border:1px solid rgba(160,120,255,.35);display:flex;flex-direction:column;gap:9px}
.abx h4{margin:0;font-size:17px;color:#e2d4ff}.abx .big{display:flex;gap:8px}.abx .big div{flex:1;text-align:center;padding:8px 0;border-radius:10px;background:rgba(255,255,255,.06);font-size:11.5px;color:#b9a9e0}
.abx .big b{display:block;font-size:20px;color:#fff}
.depth{display:flex;align-items:center;gap:10px;justify-content:center}.depth button{width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.08);font-size:20px;font-weight:800}
.depth b{font-size:22px;min-width:92px;text-align:center;color:#f0e6ff}.depth small{display:block;font-size:11px;color:#b9a9e0;font-weight:600}
.wear{display:flex;align-items:center;gap:8px;font-size:12.5px}.wear .tbar{flex:1}.wear .tbar i{background:linear-gradient(90deg,#c9a0ff,#ff7ab8)}
.tog{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 11px;border-radius:12px;background:rgba(255,255,255,.06)}
.tog b{font-size:14px}.tog small{display:block;font-size:11.5px;color:#b9a9e0}
.sw{width:50px;height:28px;border-radius:14px;background:rgba(255,255,255,.18);position:relative;flex:none}.sw::after{content:'';position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:left .15s}
.sw.on{background:#9a6bff}.sw.on::after{left:25px}
.achcats{display:flex;gap:5px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.achcats::-webkit-scrollbar{display:none}
.achcats button{flex:none;font-size:12px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.06);color:var(--mute);font-weight:700}.achcats button.on{background:rgba(255,180,74,.18);color:#ffd9a0}
.ach.hid b{letter-spacing:2px}.ach small.rw{color:#ffd98a;font-size:11.5px}.ach small.rw .shell{transform:scale(.85)}.ach .cat{font-size:10.5px;color:var(--mute);margin-left:4px;font-weight:600}
.titles{display:flex;flex-wrap:wrap;gap:5px}.titles button{font-size:12px;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.06);color:#d8e6ea}.titles button.on{background:rgba(255,196,80,.2);color:#ffe2a0;outline:1px solid rgba(255,196,80,.5)}
.ttl{display:inline-block;font-size:11px;font-weight:700;padding:2px 7px;border-radius:999px;background:rgba(255,196,80,.16);color:#ffd98a;margin-left:6px;vertical-align:1px}
.m5pop{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 12px);transform:translate(-50%,-140%);z-index:60;width:min(92vw,380px);display:flex;gap:10px;align-items:center;padding:10px 14px;border-radius:16px;
  background:linear-gradient(180deg,rgba(48,36,10,.96),rgba(26,20,8,.96));border:1px solid rgba(255,196,80,.55);box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 24px rgba(255,180,60,.25);transition:transform .35s cubic-bezier(.2,1.4,.4,1);pointer-events:auto}
.m5pop.on{transform:translate(-50%,0)}.m5pop>i{font-style:normal;font-size:28px}.m5pop div{flex:1;min-width:0}.m5pop small{display:block;font-size:11px;color:#ffcf7a;font-weight:700;letter-spacing:.5px}
.m5pop b{display:block;font-size:15px;color:#fff}.m5pop.many b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.m5pop em{display:block;font-style:normal;font-size:12px;color:#e8dcc0;margin-top:1px}
.m5pop.abyss{background:linear-gradient(180deg,rgba(40,24,70,.96),rgba(18,12,36,.96));border-color:rgba(170,130,255,.6)}.m5pop.abyss small{color:#cdb6ff}
.m5pop.chal{background:linear-gradient(180deg,rgba(10,40,52,.96),rgba(6,22,30,.96));border-color:rgba(95,208,224,.6)}.m5pop.chal small{color:#9ff0ff}
.result.chal .rh h2{color:#9ff0ff}.chsc{display:flex;flex-direction:column;gap:3px;font-size:13px}.chsc div{display:flex;justify-content:space-between;color:#cfe3ea}.chsc div.t{border-top:1px solid rgba(255,255,255,.12);padding-top:5px;margin-top:3px;font-weight:800;color:#fff;font-size:15px}
.chmed{font-size:44px;text-align:center;line-height:1.1}.chmed small{display:block;font-size:13px;color:#cfe3ea}
.abres{border-color:rgba(160,120,255,.45)!important;background:rgba(30,18,56,.8)!important}
.prepab{margin:0 16px}`;
  document.head.appendChild(s);
}

/* ═════ 알림 (업적 · 물결 표 · 깊은 물 · 새 꾸미기) — 화면이 바뀌어도 남게 body 에 · 하나씩 2.6초 ═════
 *  M6-A 알림 한 줄: 한 번에 하나만 · 판 안 · 이야기 장면 · 이어하기 창에선 기다림 · 판이 시작되면 떠 있던 카드도 거둬 줄 맨 앞으로(holdPops)
 *  같은 종류(업적 · 꾸미기)가 줄에 둘 이상이면 한 장으로 모아 보여 줌 ('업적 3개 달성 — 이름 · 이름 · 이름') */
const Q = []; let busy = false, cur = null;
export function pop(items) { style(); for (const it of items) Q.push(it); if (!busy) next(); }
export const popQueue = () => ({ n: Q.length, cur: cur?.it?.name || null }); /* 시험 훅 */
const GROUP = it => it.group || (/업적/.test(it.head || '') ? 'ach' : it.icon === '👕' ? 'cos' : null);
function merge() {
  const it = Q.shift(); const g = GROUP(it); if (!g) return it;
  const same = [it]; for (let i = 0; i < Q.length;) { if (GROUP(Q[i]) === g) same.push(Q.splice(i, 1)[0]); else i++; }
  if (same.length === 1) return it;
  return { kind: it.kind, icon: it.icon, head: g === 'ach' ? `업적 ${same.length}개 달성` : `새 꾸미기 ${same.length}개`, name: same.map(x => x.name).join(' · '), sub: g === 'ach' ? '도전 탭 · 업적에서 받은 것을 볼 수 있어요' : '옷장에서 입어 봐요', group: g, n: same.length };
}
function next() {
  if (!Q.length) { busy = false; return; } busy = true;
  const R = typeof window !== 'undefined' && window.__salvage?.raid; if (document.getElementById('story') || document.querySelector('.modal.cont') || (R && R.alive)) { setTimeout(next, 600); return; } /* 이야기 장면 · 이어하기 창 · 판 안에선 기다림 (건너뛰기 · 체력 줄을 덮지 않게) */
  const it = merge();
  const el = h('div', 'm5pop ' + (it.kind || '') + (it.n ? ' many' : ''), `<i>${it.icon || '★'}</i><div><small>${esc(it.head || '업적 달성')}</small><b>${esc(it.name)}</b>${it.sub ? `<em>${it.sub}</em>` : ''}</div>`);
  (document.getElementById('frame') || document.body).appendChild(el); try { sfx.rare(); } catch { /* */ }
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
  let gone = false; const me = cur = { it, el, close: null };
  const close = () => { if (gone) return; gone = true; if (cur === me) cur = null; el.classList.remove('on'); setTimeout(() => { el.remove(); next(); }, 380); };
  me.close = close; el.onclick = close; setTimeout(close, 2600);
}
/* 판 시작 (ui.raidStart): 은신처에서 막 뜬 카드가 판 위를 덮지 않게 — 바로 거두고 줄 맨 앞에 다시 세움 (결과 화면 · 은신처에서 이어서) */
export function holdPops() {
  if (!cur) return; const { it, el } = cur; cur = null; el.onclick = null; el.remove(); Q.unshift(it); busy = true; setTimeout(next, 600);
}
export const popAch = list => pop(list.map(a => ({ kind: a.cat === 'hidden' ? '' : '', icon: a.cat === 'hidden' ? '❔' : ACH_CATS[a.cat]?.icon || '★', head: a.cat === 'hidden' ? '숨은 업적 발견!' : `업적 달성 · ${ACH_CATS[a.cat]?.name || ''}`, name: a.name, sub: rewardTxt(a.reward) })));
export function popCos(keys) { if (keys.length) pop(keys.map(k => ({ kind: 'chal', icon: '👕', head: '받아 둔 꾸미기가 옷장에', name: AC.cosName(k), sub: '옷장에서 입어 봐요' }))); }
/* 은신처 들어올 때 (ui.hideout) */
export function hideoutTick() {
  const got = AC.achTick(S); const fl = AC.flushPend(S);
  if (got.length || fl.length) save();
  setTimeout(() => { popAch(got); popCos(fl); }, 500);
  if (S.abyss?.news) { S.abyss.news = 0; save(); setTimeout(() => pop([{ kind: 'abyss', icon: '🌀', head: '엔딩 뒤 — 새 난이도', name: '깊은 물이 열렸어요', sub: '도전 탭 · 출격 준비에서 켜요 (위협 Lv 11~)' }]), 900); }
  return got;
}
export const titleHtml = () => { const t = AC.titleNow(S); return t ? `<span class="ttl">${esc(t)}</span>` : ''; };

/* ═════ 은신처 '도전' 탭 ═════ */
export function tabChal(ui, body) {
  style(); const seg = ui.m5seg || 'week'; const C = AC.byCat(S);
  const nav = `<div class="m5seg">${[['week', '주간 도전', `#${CHL.chalNo(S.day)}`], ['abyss', '깊은 물', AB.abyssOpen(S) ? `심연 ${AB.ab(S).max}` : '🔒'], ['ach', '업적', `${AC.achDone(S)}/${AC.ACH_N}`]].map(([k, t, n]) => `<button data-seg="${k}" class="${seg === k ? 'on' : ''}">${t}<i>${n}</i></button>`).join('')}</div>`;
  body.innerHTML = nav + `<div class="m5c" id="m5c"></div>`;
  body.querySelectorAll('[data-seg]').forEach(b => b.onclick = () => { sfx.ui(); ui.m5seg = b.dataset.seg; tabChal(ui, body); });
  const c = $('#m5c', body);
  if (seg === 'abyss') abyssView(ui, c, body); else if (seg === 'ach') achView(ui, c, body, C); else weekView(ui, c, body);
}

function weekView(ui, c, body) {
  if (!CHL.chalOpen(S)) { c.innerHTML = `<div class="card lockc"><b>🏅 주간 도전</b>출격 ${CH.open.raids}판을 하면 열려요 (${S.stats?.raids || 0}/${CH.open.raids})<br>매주 바뀌는 규칙 셋 · 모두 같은 판으로 겨뤄요</div>`; return; }
  const ch = CHL.chal(S); const sp = CHL.weekly(ch.wk); const W = ch.weeks[sp.no] || { best: 0, medal: 0, runs: 0 }; const M = MAPS[sp.map];
  const wx = WEATHER[sp.wx]; const left = CHL.leftFree(S); const nol = ui.app.nolimit;
  const kitW = sp.weapons.map(([k]) => WEAPONS[k]?.name || k).join(' · ');
  const G = sp.gear; const gearTxt = `방어구 ${['없음', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'][G.vest] || G.vest} · 헬멧 ${['없음', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'][G.helmet] || G.helmet} · 가방 ${['기본', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'][G.bag] || G.bag}`;
  const pts = CHL.points(S); const nextT = CH.track.find(([n, , k]) => !ch.got.includes(k)); const prevN = [...CH.track].reverse().find(([n, , k]) => ch.got.includes(k))?.[0] || 0;
  const can = CHL.canStart(S, nol);
  const goTxt = nol ? `도전 시작 <small>(테스트 · 무제한)</small>` : left > 0 ? `도전 시작 <small>(이번 주 ${left}판 남음)</small>` : can.why === 'buy' ? `조개 ${CH.extra.cost}로 한 판 더` : '이번 주 도전 끝';
  const hist = Object.entries(ch.weeks).map(([no, w]) => [+no, w]).sort((a, b) => b[0] - a[0]).slice(0, 8);
  c.innerHTML = `
    <div class="chw"><div class="art" style="background-image:url(assets/mapart/${sp.map}.webp)"><em>${CHL.daysLeft(S.day)}일 남음</em><b>주간 도전 #${sp.no} · ${M.icon} ${M.name}</b><small>위협 Lv ${sp.lv} · ${wx ? wx.icon + ' ' + wx.name : '☀ 맑음'} · 이번 주 모두 같은 판</small></div>
      <div class="bd"><div class="rules">${sp.rules.map(k => { const r = CH_RULES[k]; return `<div class="rule ${r.good ? 'good' : ''}"><span>${r.icon}</span><div><b>${r.name}</b><small>${r.txt}</small></div></div>`; }).join('')}</div>
        <div class="kitl"><span>지급: ${esc(kitW)}</span><span>${gearTxt}</span><span>내 장비 · 창고와 따로 — 잃는 것 없음</span></div>
        <div class="medals">${CH.medal.map(m => `<div class="${W.medal >= m[0] ? 'on' : ''}">${m[3]}<b>${m[1].toLocaleString()}</b>${m[2]}</div>`).join('')}</div>
        <small class="chleft">이번 주 내 최고 <b>${W.best.toLocaleString()}</b>점 · ${medalTxt(MEDAL(W.medal))} · ${W.runs}판</small>
        <div class="chrow"><button class="btn cta" id="chalGo" ${!can.ok && can.why === 'done' ? 'disabled' : ''}>${goTxt}</button></div>
        <small class="chleft">무료 ${CH.free}판/주 · 조개로 ${CH.extra.n}판 더 (${shell(CH.extra.cost)}) · 오늘 출격 ${'3'}회와 따로 · 이어하기 · 보험 없음</small></div></div>
    <div class="card"><div class="fh"><b>물결 표 ${pts}</b><span class="lv">주마다 최고 메달만큼 (동 1 · 은 2 · 금 3)</span></div>
      ${nextT ? `<div class="tbar"><i style="width:${Math.min(100, (pts - prevN) / Math.max(1, nextT[0] - prevN) * 100)}%"></i></div><small class="hint">다음 ${nextT[0]}: ${rwTxt({ kind: nextT[1], key: nextT[2] })}</small>` : '<small class="hint">물결 표 보상을 모두 받았어요!</small>'}
      <div class="track" style="margin-top:8px">${CH.track.map(([n, kind, key]) => `<div class="trk ${ch.got.includes(key) ? 'got' : ''}"><i>${n}</i>${rwTxt({ kind, key })}<small>${ch.got.includes(key) ? '받음' : kind === 'cos' && !M5B_COS[key] ? '' : '도전 전용'}</small></div>`).join('')}</div></div>
    <div class="card"><div class="fh"><b>주간 순위</b><span class="lv">${CHL.BOARD.fetch ? '' : '순위표는 서버가 생기면 열려요 — 지금은 내 기록'}</span></div>
      <div class="hist">${hist.length ? hist.map(([no, w]) => `<div><span>#${no}</span><span>${MAPS[CHL.weekly(no).map]?.name || ''}</span><b>${w.best.toLocaleString()}점 ${MEDAL(w.medal)?.[3] || ''}</b></div>`).join('') : '<small class="hint">아직 도전 기록이 없어요</small>'}</div></div>`;
  $('#chalGo', c).onclick = () => {
    unlock(); const v = CHL.canStart(S, nol);
    if (!v.ok && v.why === 'buy') { const r = CHL.buyEntry(S); if (!r.ok) { sfx.empty(); return ui.toast(r.why === 'cost' ? `조개가 모자라요 (${CH.extra.cost})` : '이번 주 추가 판을 다 썼어요', 'soft'); } save(); ui.toast(`도전 한 판 더 — 조개 −${CH.extra.cost}`, 'good'); }
    else if (!v.ok) { sfx.empty(); return ui.toast('이번 주 도전을 다 했어요 — 월요일에 새 도전', 'soft'); }
    sfx.ui(); const r = ui.app.startChal(); if (r && !r.ok && r.why) ui.toast('지금은 시작할 수 없어요', 'soft');
  };
}

function abyssView(ui, c) {
  if (!AB.abyssOpen(S)) { c.innerHTML = `<div class="abx lockc" style="color:#b9a9e0"><b style="color:#e2d4ff">🌀 깊은 물</b>엔딩을 보면 열려요<br>위협 Lv 10 너머 · 심연 변형 적 · 보상 배수 · 끝없는 깊이 기록</div>`; return; }
  const A = AB.ab(S); const d = A.sel; const W = AB.wearFx(A.wear); const cost = AB.repairCost(S);
  c.innerHTML = `<div class="abx"><h4>🌀 깊은 물 — 심연 기록</h4>
      <div class="big"><div><b>${A.best}</b>최고 탈출 깊이</div><div><b>${A.max}</b>열린 깊이</div><div><b>${A.kills}</b>변형 적</div></div>
      <div class="tog" id="abTog"><div><b>깊은 물로 출격</b><small>오늘 출격 횟수를 그대로 써요 · 내 장비 · 남은 가방 규칙 그대로</small></div><i class="sw ${A.on ? 'on' : ''}"></i></div>
      <div class="depth"><button id="abM">−</button><b>심연 ${d}<small>위협 Lv ${AB.lvOf(d)}</small></b><button id="abP">+</button></div>
      <small class="hint" style="text-align:center;margin:0">변형 적 ${Math.round(AB.variantP(d) * 100)}% · 상자 보상 ×${AB.lootMul(d).toFixed(2)} · 변형 적 하나 ${shell(ABYSS.vShell[0] + ABYSS.vShell[1] * d)} · 지금 깊이(${A.max})에서 탈출하면 다음 깊이가 열려요</small>
      <div class="wear"><span>장비 닳음</span><span class="tbar"><i style="width:${A.wear}%"></i></span><b>${Math.round(A.wear)}</b></div>
      <small class="hint" style="margin:0">${A.wear > ABYSS.wear.from ? `방어 ×${W.armor.toFixed(2)} · 체력 ${W.hp}` : `${ABYSS.wear.from} 까지는 영향 없음`} — 깊은 물 판마다 닳아요</small>
      <button class="btn sm" id="abFix" ${A.wear ? '' : 'disabled'} style="align-self:center">수리 ${A.wear ? shell(cost) : '— 새것'}</button></div>
    <div class="card"><div class="fh"><b>깊이 이정표</b><span class="lv">최고 탈출 깊이</span></div><div class="track">${[...ABYSS.mile, [5, 'ach', 'a_abyss5'], [15, 'ach', 'a_abyss15']].sort((a, b) => a[0] - b[0]).map(([n, kind, key]) => { const got = A.best >= n; const t = kind === 'ach' ? `업적 「${ACHIEVEMENTS.find(a => a.id === key)?.name}」` : rwTxt({ kind, key }); return `<div class="trk ${got ? 'got' : ''}"><i>${n}</i>${t}<small>${got ? '이룸' : ''}</small></div>`; }).join('')}</div></div>`;
  $('#abTog', c).onclick = () => { sfx.ui(); AB.setOn(S, !A.on); save(); abyssView(ui, c); };
  $('#abM', c).onclick = () => { sfx.ui(); AB.setDepth(S, A.sel - 1); save(); abyssView(ui, c); };
  $('#abP', c).onclick = () => { if (A.sel >= A.max) { sfx.empty(); return ui.toast(`심연 ${A.max}에서 탈출하면 더 깊이 갈 수 있어요`, 'soft'); } sfx.ui(); AB.setDepth(S, A.sel + 1); save(); abyssView(ui, c); };
  $('#abFix', c).onclick = () => { const r = AB.repair(S); if (!r.ok) { sfx.empty(); return ui.toast(r.why === 'cost' ? `조개가 모자라요 (${cost})` : '이미 새것이에요', 'soft'); } save(); sfx.build(); ui.toast(`장비 수리 — 조개 −${r.cost}`, 'good'); ui.hideout(); };
}

function achView(ui, c, body, C) {
  const cat = ui.achCat || 'all'; const T = AC.titles(S);
  const list = ACHIEVEMENTS.filter(a => cat === 'all' || a.cat === cat).map(a => ({ a, d: !!S.ach?.[a.id], v: AC.achProg(S, a) })).sort((x, y) => (x.d - y.d) || (y.v / y.a.n - x.v / x.a.n));
  c.innerHTML = `<div class="achcats">${[['all', `전체 ${AC.achDone(S)}/${AC.ACH_N}`], ...ACH_CAT_KEYS.map(k => [k, `${ACH_CATS[k].icon} ${ACH_CATS[k].name} ${C[k].done}/${C[k].n}`])].map(([k, t]) => `<button data-ac="${k}" class="${cat === k ? 'on' : ''}">${t}</button>`).join('')}</div>
    <div class="card"><div class="fh"><b>칭호</b><span class="lv">${T.have.length}/${Object.keys(TITLES).length} · 눌러서 달기</span></div><div class="titles">${T.have.length ? T.have.map(k => `<button data-tt="${k}" class="${T.eq === k ? 'on' : ''}">${esc(TITLES[k].name)}</button>`).join('') + `<button data-tt="" class="${T.eq ? '' : 'on'}">달지 않음</button>` : '<small class="hint" style="margin:0">업적 · 주간 도전 · 깊은 물에서 받아요</small>'}</div></div>
    <div class="alist">${list.map(({ a, d, v }) => { const hid = a.hidden && !d; return `<div class="ach ${d ? 'done' : ''} ${hid ? 'hid' : ''}"><i>${d ? '★' : hid ? '?' : '☆'}</i><div><b>${hid ? '???' : esc(a.name)}<span class="cat">${ACH_CATS[a.cat].name}</span></b><small>${hid ? '힌트: ' + esc(a.hint || '') : esc(a.txt) + (a.n > 1 && !d ? ` · ${v.toLocaleString()}/${a.n.toLocaleString()}` : '')}</small>${hid || a.n === 1 ? '' : `<span class="abar"><i style="width:${v / a.n * 100}%"></i></span>`}${hid ? '' : `<small class="rw">${rewardTxt(a.reward)}</small>`}</div></div>`; }).join('')}</div>`;
  c.querySelectorAll('[data-ac]').forEach(b => b.onclick = () => { sfx.ui(); ui.achCat = b.dataset.ac; tabChal(ui, body); });
  c.querySelectorAll('[data-tt]').forEach(b => b.onclick = () => { sfx.ui(); AC.wearTitle(S, b.dataset.tt || null); save(); tabChal(ui, body); });
}

/* ═════ 도전 판 끝 (main.js endRaid) ═════ */
export function chalEnd(app, res, spec) {
  const ui = app.ui; AC.noteRaid(S, res); const rec = CHL.record(S, res, spec);
  for (const r of rec.rewards) { if (r.kind === 'cos') AC.grantCos(S, r.key); else AC.grantTitle(S, r.key); }
  const ach = AC.achTick(S); save(); app.lastResult = res; res.chalRec = rec;
  ui.clear(); ui.root.className = 'scr-result'; style(); const ok = res.outcome === 'extract'; const M = MAPS[spec.map];
  const C = CH.sc; const R = spec.rules.map(k => CH_RULES[k]); const mul = f => R.reduce((m, r) => m * (r[f] || 1), 1);
  const rows = ok ? [['가져온 가치' + (mul('value') > 1 ? ` ×${mul('value')}` : ''), Math.round((res.value || 0) * mul('value'))], [`처치 ${res.killN}` + (mul('kill') > 1 ? ` ×${mul('kill')}` : ''), Math.round(res.killN * C.kill * mul('kill'))], ...(CHL.bossKills(res) ? [['보스', Math.round(CHL.bossKills(res) * C.boss * mul('boss'))]] : []), [`가장 깊은 구역 ${res.zoneMax}`, res.zoneMax * C.zone], [`남은 시간 ${fmt(res.timeLeft || 0)}`, Math.round((res.timeLeft || 0) * C.sec)]]
    : [[`처치 ${res.killN} · 구역 ${res.zoneMax}`, Math.round(res.killN * C.kill * mul('kill') + res.zoneMax * C.zone)], ['실패 — 절반만', `×${C.fail}`]];
  const el = h('div', 'result chal ' + (ok ? 'ok' : 'ko'), `<div class="rscroll">
    <div class="rh"><small>주간 도전 #${spec.no} · ${M.icon} ${M.name} · ${ok ? '탈출 성공' : '실패'}</small><h2>${rec.newBest ? '이번 주 최고 기록!' : ok ? '좋은 도전이었어요' : '규칙이 만만치 않죠?'}</h2><small class="sub">${spec.rules.map(k => CH_RULES[k].icon + ' ' + CH_RULES[k].name).join(' · ')}</small></div>
    <div class="card"><div class="chmed">${rec.medal ? rec.medal[3] : '🌊'}<small>${rec.sc.toLocaleString()}점 · ${rec.medal ? rec.medal[2] + '메달' : '메달까지 조금 더'}</small></div>
      <div class="chsc">${rows.map(([t, v]) => `<div><span>${t}</span><span>${typeof v === 'number' ? '+' + v.toLocaleString() : v}</span></div>`).join('')}<div class="t"><span>점수</span><span>${rec.sc.toLocaleString()}</span></div></div></div>
    <div class="card"><div class="fh"><b>이번 주 내 최고 ${rec.best.toLocaleString()}점</b><span class="lv">물결 표 ${rec.pts}${rec.ptsGain ? ` (+${rec.ptsGain})` : ''}</span></div>
      <small class="hint" style="margin:0">${rec.next ? `${rec.next[3]} ${rec.next[2]}메달까지 ${(rec.next[1] - rec.best).toLocaleString()}점` : '이번 주 금메달!'} · 들고 나온 건 점수로만 셈 (창고 X)</small>
      ${rec.rewards.length ? `<div class="track" style="margin-top:8px">${rec.rewards.map(r => `<div class="trk got"><i>${r.n}</i>${rwTxt(r)}<small>새로 받음</small></div>`).join('')}</div>` : ''}</div>
    </div><div class="rbtns" style="display:flex;flex-direction:column;gap:8px;padding:10px 16px 18px"><button class="btn cta" id="home">은신처로</button>${CHL.leftFree(S) > 0 || app.nolimit ? '<button class="btn" id="again">한 번 더 도전</button>' : ''}</div>`);
  ui.root.appendChild(el); app.showHideout?.(true);
  $('#home', el).onclick = () => { sfx.ui(); ui.tab = 'chal'; ui.m5seg = 'week'; ui.hideout(); };
  $('#again', el) && ($('#again', el).onclick = () => { unlock(); sfx.ui(); const r = app.startChal(); if (r && !r.ok) { ui.tab = 'chal'; ui.hideout(); } });
  setTimeout(() => { popAch(ach); if (rec.rewards.length) pop(rec.rewards.map(r => ({ kind: 'chal', icon: r.kind === 'title' ? '🎖' : '👕', head: `물결 표 ${r.n} — 도전 전용`, name: r.kind === 'title' ? TITLES[r.key]?.name : AC.cosName(r.key), sub: r.kind === 'cos' ? cosSub(r.key) : '칭호를 달 수 있어요' }))); }, 700);
  return res;
}

/* ═════ 보통 판 끝 (main.js endRaid — 창고 정리 뒤 · save 전) ═════ */
export function afterRaid(res) {
  AC.noteRaid(S, res); res.abyssOut = AB.afterRaid(S, res);
  const o = res.abyssOut; if (o) for (const m of o.miles) { if (m.kind === 'cos') AC.grantCos(S, m.key); else AC.grantTitle(S, m.key); }
  res.achNew = AC.achTick(S);
}
/* 결과 화면을 그린 뒤 (main.js) — 깊은 물 카드 · 알림 */
export function resultPop(app, res) {
  style(); const o = res.abyssOut;
  if (o) { const sc = app.ui.root.querySelector('.rscroll'); const rh = sc?.querySelector('.rh');
    const card = h('div', 'card abres', `<div class="fh"><b>🌀 심연 ${o.d} ${o.ext ? '탈출' : '— 다시 도전'}</b><span class="lv">위협 Lv ${AB.lvOf(o.d)}</span></div><small class="hint" style="margin:0">${o.newMax ? `<b style="color:#e2d4ff">심연 ${o.newMax}이 열렸어요!</b> · ` : ''}변형 적 ${o.kills}${o.shells ? ` → ${shell(o.shells)}` : o.kills && !o.ext ? ' (탈출해야 조개)' : ''} · 장비 닳음 +${o.wear}${S.abyss.wear >= 60 ? ' — 은신처에서 수리해요' : ''}</small>`);
    if (rh) rh.after(card); else sc?.prepend(card);
    if (o.newMax) pop([{ kind: 'abyss', icon: '🌀', head: '깊은 물', name: `심연 ${o.newMax} 열림`, sub: `다음 판은 심연 ${S.abyss.sel} · 위협 Lv ${AB.lvOf(o.newMax)} · 보상 ×${AB.lootMul(o.newMax).toFixed(2)}` }]);
    for (const m of o.miles) pop([{ kind: 'abyss', icon: m.kind === 'title' ? '🎖' : '👕', head: `심연 ${m.n} 이정표`, name: m.kind === 'title' ? TITLES[m.key]?.name : AC.cosName(m.key), sub: m.kind === 'title' ? '칭호를 달 수 있어요' : cosSub(m.key) }]); }
  if (res.achNew?.length) setTimeout(() => popAch(res.achNew), 600);
}

/* ═════ 출격 준비: 깊은 물 (켬/끔 · 깊이) — 위협 카드 자리 ═════ */
export function prepThreat(mk, html) {
  if (!AB.abyssOpen(S)) return html; style(); const A = AB.ab(S); const d = A.sel;
  const card = `<div class="abx prepab" id="abPrep"><div class="tog" id="abTogP"><div><b>🌀 깊은 물 ${A.on ? `· 심연 ${d}` : ''}</b><small>${A.on ? `위협 Lv ${AB.lvOf(d)} · 변형 적 ${Math.round(AB.variantP(d) * 100)}% · 보상 ×${AB.lootMul(d).toFixed(2)} · 닳음 ${Math.round(A.wear)}` : `엔딩 뒤 난이도 · 최고 심연 ${A.best} · 열린 깊이 ${A.max}`}</small></div><i class="sw ${A.on ? 'on' : ''}"></i></div>
    ${A.on ? `<div class="depth"><button id="abMP">−</button><b>심연 ${d}<small>위협 Lv ${AB.lvOf(d)}</small></b><button id="abPP">+</button></div>` : ''}</div>`;
  return A.on ? card : html + card;
}
export function bindPrep(ui, el) {
  const t = $('#abTogP', el); if (!t) return; const A = AB.ab(S);
  t.onclick = () => { sfx.ui(); AB.setOn(S, !A.on); save(); ui.prep(); };
  $('#abMP', el) && ($('#abMP', el).onclick = () => { sfx.ui(); AB.setDepth(S, A.sel - 1); save(); ui.prep(); });
  $('#abPP', el) && ($('#abPP', el).onclick = () => { if (A.sel >= A.max) { sfx.empty(); return ui.toast(`심연 ${A.max}에서 탈출하면 더 깊이`, 'soft'); } sfx.ui(); AB.setDepth(S, A.sel + 1); save(); ui.prep(); });
}
export const abyssSortie = () => AB.abyssOn(S) ? AB.depthOf(S) : 0;
