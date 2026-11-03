// 탭 화면 — 장부(주간 이야기 · 정산 · 지난 주) · 단골 도감 · 꾸미기 · 설정 · 공유 카드
import { D, H, DECO, FUR, face, tagOf } from './state.js?v=0.97.2';
import { S, save, today, week, reset } from './save.js?v=0.97.2';
import * as A from './audio.js?v=0.97.2';
import { $, $$, esc, I, toast, modal, closeModal, sp, praise, fmt, setHaptic, coinFly, center, sparks } from './ui.js?v=0.97.2';
import { mainGuest, slot, addDays, WD, GRADE, CHN, won, topAxis, AXN, weekTitle, COIN, nextTease, dayNo, EPOCH, levelOf, LEVELS, TOOLS, toolOn } from './engine.js?v=0.97.2';
import { show, openShop, hud, refreshCoins, replayDay, findGuest, track } from './main.js?v=0.97.2';
import { sceneHTML, layout } from './scene.js?v=0.97.2';
import { bm } from './oad_bm.js?v=0.97.2';
import { inOAD, exitToOAD } from './oad.js?v=0.97.2';

export function refreshTabs(id) {
  const t = $('#tabs'), on = id === 'shop' ? 'shop' : id;
  t.innerHTML = [['shop', '가게', I.shop], ['ledger', '장부', I.book], ['book', '단골 도감', I.people], ['deco', '꾸미기', I.brush]].map(([k, n, ic]) => `<button data-t="${k}" class="${on === k ? 'on' : ''}">${ic}${n}${k === 'ledger' && !S.days[today()] ? '<i class="dot"></i>' : ''}</button>`).join('');
}
const weekDates = wk => Array.from({ length: 7 }, (_, i) => addDays(EPOCH, wk * 7 + i));
const isOwnerOrPlayed = (wk, played) => H.owned || played >= 5 || (S.weeks[wk] && S.weeks[wk].unlocked);

/* ---------- 장부 ---------- */
export function openLedger({ write = null } = {}) {
  const el = $('#ledger'), k = today(), s = slot(k, D.weeks.length), w = D.weeks[s.wi], dates = weekDates(s.wk);
  const played = dates.filter(d => S.days[d]).length;
  const rows = dates.map((d, i) => {
    const g = w.days[i], r = S.days[d], isToday = d === k, past = d < k, tom = d === addDays(k, 1);
    let mid = '', right = '';
    if (r) {
      const how = r.choice === 'haggle' ? `${won(r.offer)}에 매입` : r.choice === 'buy' ? `${won(r.price)}에 매입` : CHN[r.choice];
      mid = `<div class="hand${write === d ? ' write' : ''}">${esc(g.diary || g.itemName)}<small>${esc(how)}${r.replay ? ' · 다시 감정' : ''}</small></div>`;
      right = `<div class="mini ${r.grade}">${r.grade === 'best' ? '명<br>감정' : r.grade === 'good' ? '좋은<br>감정' : '따뜻한<br>감정'}</div>`;
    } else if (isToday) { mid = `<div class="lock"><b>${esc(tagOf(g))}</b>오늘 손님이 기다려요</div>`; right = '<button class="minibtn" data-k="today">맞이하기</button>'; }
    else if (past) { mid = `<div class="lock"><b>${esc(tagOf(g))} · ${esc(g.itemName)}</b>그날 손님은 이런 분이었어요</div>`; right = H.ok ? `<button class="minibtn" data-k="replay" data-d="${d}">다시 감정</button>` : ''; }
    else if (tom) { mid = `<div class="lock"><b>${esc(nextTease(D, k))}</b>내일 문을 열어요</div>`; right = `<div class="silh" style="width:38px;height:38px;border-radius:10px;overflow:hidden;position:relative;background:linear-gradient(180deg,#8f8476,#5d554b)"><img src="assets/g/${g.cast}_s.webp" style="position:absolute;left:50%;top:3px;width:120%;transform:translateX(-50%)" alt=""></div>`; }
    else mid = '<div class="lock">· · ·</div>';
    if (i === 6 && !r) right = right || '<span class="gift">정산</span>';
    return `<div class="lday"><div class="d${isToday ? ' on' : ''}">${WD[i]}</div>${mid}${right}</div>`;
  }).join('');
  /* 중간에 온 사람: 이번 주 지금까지 요약 (무료) */
  const before = dates.filter(d => d < S.first && d < k);
  const recap = before.length ? `<div class="recap"><b>이번 주 지금까지</b><br>${before.map(d => { const g = w.days[dates.indexOf(d)]; return `${WD[dates.indexOf(d)]} · ${esc(tagOf(g))}이(가) ${esc(g.itemName)}을(를) 들고 왔어요`; }).join('<br>')}</div>` : '';
  const wr = week(s.wk).rep, top = topAxis(wr);
  el.innerHTML = `<div class="scrollv"><div class="phead"><div class="ttl" style="font-size:20px">장부<small>이번 주 이야기 · ${s.wk + 1}주차${s.rerun ? ' · 다시 보는 이야기' : ''}</small></div><div class="sp"></div><button class="weekbtn" data-k="past">지난 주 이야기</button></div>
    <div class="ledgerbook"><h3>「${esc(w.title)}」</h3><div class="sub">${esc(w.blurb)}<br>7일 중 5일 감정하면 완결 · 결말은 내 평판이 정해요</div>
      <div class="prog">${dates.map(d => `<i class="${S.days[d] ? (S.days[d].replay ? 'rp' : 'on') : ''}"></i>`).join('')}</div>
      ${rows}
      <div class="reward"><img src="assets/cat_1.webp" alt=""><div><b>완결 보상</b> · 동전 ${COIN.week} + 이번 주 칭호<span>7일 중 ${played}일 · 놓친 날은 '다시 감정'으로 채울 수 있어요</span></div></div>
      ${recap}
      <div class="branch">지금은 <b>${AXN[top]}</b> 평판이 앞서요 → ${esc(w.branch[top])}</div>
    </div></div>`;
  show('ledger'); A.page();
  if (write) { const h = el.querySelector('.hand.write'); if (h) { h.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => { A.stamp(); sparks(center(h).x, center(h).y, 10); }, sp(1100)); } }
  el.onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; A.tap(); const kk = b.dataset.k;
    if (kk === 'today') return openShop();
    if (kk === 'replay') return replayDay(b.dataset.d);
    if (kk === 'past') return pastWeeks();
  };
}
/* 지난 주 이야기: 5일 이상 했으면 · 소장이면 · 30골드로 열면 전부 읽기 (진행 중인 주는 팔지 않음) */
export function pastWeeks() {
  const k = today(), cw = slot(k, 1).wk, fw = Math.max(0, slot(S.first, 1).wk);
  const list = []; for (let wk = cw - 1; wk >= Math.min(fw, cw - 1) && wk >= 0; wk--) list.push(wk);
  const item = wk => { const w = D.weeks[((wk % D.weeks.length) + D.weeks.length) % D.weeks.length], dates = weekDates(wk), played = dates.filter(d => S.days[d]).length, open = isOwnerOrPlayed(wk, played);
    return `<div class="dc"><div class="pv"><b style="font:700 13px var(--hf)">${wk + 1}주</b></div><div><b>「${esc(w.title)}」</b><small>7일 중 ${played}일 감정 · ${open ? '전부 읽을 수 있어요' : '5일 이상 감정하면 저절로 열려요'}</small></div><div class="act">${open ? `<button class="minibtn" data-a="read" data-w="${wk}">읽기</button>` : H.ok ? `<button class="minibtn" data-a="buy" data-w="${wk}"><i class="goldi">G</i>${bm.price('week') || 30}</button>` : ''}</div></div>`; };
  modal(`<h3>지난 주 이야기</h3><p>그 주의 손님 일곱 명, 그날의 진실을 다시 읽어요.${H.owned ? ' 소장 중이라 전부 열려 있어요.' : ''}</p><div class="decolist" style="margin-top:12px">${list.length ? list.map(item).join('') : '<p>아직 지난 주가 없어요. 이번 주를 마치면 여기에 쌓여요.</p>'}</div><button class="btn sec" data-a="close">닫기</button>`, async (a, b) => {
    if (a === 'close') return closeModal();
    const wk = Number(b.dataset.w);
    if (a === 'buy') { const r = await bm.spend('week'); if (!r.ok) return r.reason === 'cancel' ? null : toast(r.reason === 'short' ? '골드가 모자라요' : '지금은 살 수 없어요'); H.gold = r.gold ?? H.gold; week(wk).unlocked = true; S.weekBuys = (S.weekBuys || 0) + 1; save(true); toast('지난 주 이야기를 열었어요'); if (S.weekBuys >= 3 && !H.owned) setTimeout(() => toast('지난 이야기를 자주 읽으신다면, 소장하면 골목 이야기를 전부 영구로 볼 수 있어요', 3600), 2400); return pastWeeks(); }
    if (a === 'read') readWeek(wk);
  });
}
function readWeek(wk) {
  const w = D.weeks[((wk % D.weeks.length) + D.weeks.length) % D.weeks.length], dates = weekDates(wk);
  modal(`<h3>「${esc(w.title)}」 · ${wk + 1}주</h3>${w.days.map((g, i) => { const r = S.days[dates[i]]; return `<div class="truth"><span class="k">${WD[i]} · ${esc(tagOf(g))} · ${esc(g.itemName)}${r ? ` · ${GRADE[r.grade]}` : ''}</span>${esc(g.truth.story)}${r ? `<br><small style="color:var(--ink2)">나의 선택: ${CHN[r.choice]} — ${esc(g.choices[r.choice].after)}</small>` : ''}</div>`; }).join('')}<button class="btn sec" data-a="back">목록</button>`, a => { if (a === 'back' || a === 'close') pastWeeks(); });
}

/* ---------- 주간 정산 (일요일 손님 뒤 · 또는 다음 주에 처음 열 때) ---------- */
export function settleIfDue() {
  const k = today(), s = slot(k, D.weeks.length);
  let wk = null;
  if (s.wd === 6 && S.days[k] && !week(s.wk).settled) wk = s.wk;
  else for (let x = s.wk - 1; x >= Math.max(0, s.wk - 3); x--) { const ds = weekDates(x); if (ds.some(d => S.days[d]) && !week(x).settled) { wk = x; break; } }
  if (wk == null) return false;
  const w = D.weeks[((wk % D.weeks.length) + D.weeks.length) % D.weeks.length], dates = weekDates(wk), recs = dates.map(d => S.days[d]).filter(Boolean);
  const nBest = recs.filter(r => r.grade === 'best').length, played = recs.length, wr = week(wk).rep, top = topAxis(wr);
  const title = weekTitle(nBest, played), done = played >= 5, coins = done ? COIN.week : 0;
  const ending = w.days[6].ending[top];
  week(wk).settled = true; week(wk).title = title; week(wk).top = top; week(wk).coins = coins; S.coins += coins; save(true);
  track('week_settle', { wk, played, best: nBest });
  const html = () => `<div style="text-align:center"><div class="stamp best" style="position:relative;display:inline-grid;right:auto;top:auto;margin:4px auto 6px">${esc(title.length > 4 ? title.slice(0, -3) : title)}<small>WEEK ${wk + 1}</small></div></div>
    <h3 style="text-align:center">「${esc(w.title)}」 완결</h3><p style="text-align:center">7일 중 ${played}일 · 명감정 ${nBest}번 · 칭호 <b>${esc(title)}</b></p>
    <div class="truth"><span class="k">${AXN[top]} 평판이 이끈 결말</span>${esc(ending)}</div>
    <div class="branch"><b>다음 주 예고</b> · ${esc(w.branch[top])}</div>
    ${done ? `<div class="reward"><img src="assets/cat_1.webp" alt=""><div><b>완결 보상 · 동전 +${coins}</b><span>${week(wk).doubled ? '두 배로 받았어요' : '5일 넘게 들러 주셔서 고마워요'}</span></div></div>` : `<div class="recap">이번 주는 ${played}일 들렀어요. 5일을 채우면 완결 보상을 받아요 — 놓친 날은 '다시 감정'으로 채울 수 있어요.</div>`}
    <div class="row2"><button class="btn sec" data-a="share">공유 카드</button>${done && !week(wk).doubled && H.ok ? `<button class="btn sec" data-a="dbl">${H.owned ? '' : '<i class="adic"></i> '}동전 두 배</button>` : '<span></span>'}</div>
    <button class="btn pri" data-a="close">다음 주도 기대할게요</button>`;
  setTimeout(() => {
    A.fanfare(2);
    modal(html(), async (a, b) => {
      if (a === 'close') { closeModal(); refreshCoins(); return; }
      if (a === 'share') return shareWeek(w, title, played, nBest);
      if (a === 'dbl') { b.disabled = true; const r = await bm.rewardedAd('hanson_week2x'); if (!r.ok) { b.disabled = false; return toast('광고를 불러오지 못했어요'); } week(wk).doubled = true; S.coins += coins; save(true); A.coin(5); coinFly(center(b), { x: center(b).x, y: 30 }, 8); praise(`동전 +${coins} 더!`, 90); refreshCoins(); b.remove(); }
    }, { center: true });
  }, sp(400));
  return true;
}

/* ---------- 단골 도감 ---------- */
/* 숨은 인연: 두 사람을 다 만나야 보임 · 못 만난 인연은 개수만 */
function relsOf(id) {
  const mine = (D.cast[id].rel || []).filter(([o]) => D.cast[o]);
  const back = Object.entries(D.cast).filter(([o, c]) => o !== id && !mine.some(([x]) => x === o) && (c.rel || []).some(([x]) => x === id));
  const all = [...mine.map(([o, l]) => [o, `${esc(D.cast[o].name)} · ${esc(l)}`]), ...back.map(([o, c]) => [o, `${esc(c.name)} 씨에겐 「${esc(c.rel.find(([x]) => x === id)[1])}」`])];
  if (!all.length) return '';
  const seen = all.filter(([o]) => S.met[o]), hid = all.length - seen.length;
  return `<div class="truth"><span class="k">골목 인연</span>${seen.map(([, t]) => t).join('<br>')}${hid ? `${seen.length ? '<br>' : ''}<span style="opacity:.7">아직 모르는 인연 ${hid}개</span>` : ''}</div>`;
}
export function openBook() {
  const el = $('#book'), ids = Object.keys(D.cast).filter(id => id[0] !== 'v' || S.met[id]), met = ids.filter(id => S.met[id]).length;
  const card = id => { const c = D.cast[id], n = S.met[id] || 0; return `<button class="bk${n ? '' : ' no'}" data-k="c" data-id="${id}"><div class="ph"><img src="${n ? face(id, 2) : `assets/g/${id}_s.webp`}" alt=""></div><b>${n ? esc(c.name) : '???'}</b><small>${n ? `${esc(c.tag)} · ${n}번` : '아직 못 만났어요'}</small></button>`; };
  const lv = levelOf(S.xp), pct = lv.to > lv.from ? Math.round((lv.xp - lv.from) / (lv.to - lv.from) * 100) : 100;
  const lvH = `<div class="lvcard"><div class="xpbar" style="margin:0;padding:0;background:none"><div><b>${esc(lv.name)}</b><small>${lv.next ? `다음 ${esc(lv.next)}까지 ${lv.to - lv.xp}` : '가장 높은 등급'}</small></div><i><u style="width:${pct}%"></u></i></div>
    <div class="tools"><div><b>돋보기 · 장부</b>처음부터</div>${Object.entries(TOOLS).map(([k, t]) => `<div><b>${esc(t.name)}</b>${toolOn(S.xp, k) ? esc(t.desc) : `${esc(LEVELS.find(l => l.tool === k).name)}에 열려요`}</div>`).join('')}</div></div>`;
  el.innerHTML = `<div class="scrollv"><div class="phead"><div class="ttl" style="font-size:20px">단골 도감<small>만난 손님 ${met} / ${ids.length} · 감정사 수첩</small></div></div>${lvH}
    <div class="sect">주간 이야기 손님<small>본 손님 · 예비 손님</small></div><div class="bookgrid">${ids.filter(i => i[0] === 'g' || i[0] === 'v').map(card).join('')}</div>
    <div class="sect">이웃들<small>주간 이야기에도 골목에도 와요 · 숨은 인연</small></div><div class="bookgrid">${ids.filter(i => i[0] === 'c').map(card).join('')}</div>
    <div class="sect">골목 사람들<small>골목 손님으로 자주 와요</small></div><div class="bookgrid">${ids.filter(i => i[0] === 'n').map(card).join('')}</div></div>`;
  show('book');
  el.onclick = e => { const b = e.target.closest('[data-k="c"]'); if (!b) return; A.tap(); const id = b.dataset.id, c = D.cast[id]; if (!S.met[id]) return toast('아직 못 만난 손님이에요');
    const visits = Object.entries(S.days).filter(([, r]) => { const g = findGuest(r.id); return g && g.cast === id; }).map(([d, r]) => { const g = findGuest(r.id); return `<div class="truth"><span class="k">${d} · ${esc(g.itemName)} · ${GRADE[r.grade]}</span>${esc(g.choices[r.choice].after)}</div>`; });
    modal(`<div style="display:flex;gap:12px;align-items:center"><div style="width:84px;height:84px;border-radius:16px;overflow:hidden;position:relative;background:var(--paper2);flex:none"><img src="${face(id, 2)}" style="position:absolute;left:50%;top:4%;width:150%;transform:translateX(-50%)" alt=""></div><div><h3>${esc(c.name)}</h3><p>${esc(c.tag)} · ${S.met[id]}번 만남</p></div></div>${visits.join('') || '<p>골목 손님으로 만났어요.</p>'}${relsOf(id)}<button class="btn sec" data-a="close">닫기</button>`, a => { if (a === 'close') closeModal(); });
  };
}

/* ---------- 꾸미기 (겉모습만 · 동전 또는 골드) ---------- */
export function openDeco() {
  const el = $('#deco'), on = S.deco.on, own = S.deco.own;
  const isOn = d => on[d.slot] === d.id;
  const row = d => {
    const owned = !!own[d.id], pv = d.img ? `<img src="${d.img}" alt="">` : d.slot === 'sign' ? `<div class="sign ${d.id}" style="position:static;transform:scale(.36);transform-origin:center"><div><b>오랜상회</b></div></div>` : d.slot === 'fur' ? `<img src="assets/cat_0.webp" style="filter:${FUR[d.id]}" alt="">` : d.id === 'lamp' ? '<div style="width:100%;height:100%;background:radial-gradient(circle at 50% 40%, #ffd58a, #c98a2a 45%, transparent 70%)"></div>' : `<div style="width:100%;height:100%;background:${d.id === 'winter' ? 'linear-gradient(#c9d6e6,#fff)' : 'linear-gradient(#f7d4dc,#fff4f6)'}"></div>`;
    const price = d.owner ? '<small>소장 전용</small>' : `<button class="minibtn" data-k="coin" data-id="${d.id}"><i class="coin" style="width:14px;height:14px"></i>${fmt(d.coins)}</button>${H.ok && bm.price(d.sku) ? `<button class="minibtn" data-k="gold" data-id="${d.id}"><i class="goldi" style="width:14px;height:14px;font-size:8px">G</i>${bm.price(d.sku)}</button>` : ''}`;
    return `<div class="dc${owned ? ' own' : ''}"><div class="pv">${pv}</div><div><b>${esc(d.name)}</b><small>${esc(d.size)} · ${esc(d.desc)}</small></div><div class="act">${owned ? `<button class="minibtn${isOn(d) ? ' on' : ''}" data-k="toggle" data-id="${d.id}">${isOn(d) ? '놓는 중' : '놓기'}</button>` : price}</div></div>`;
  };
  const vis = DECO.filter(d => !d.owner || H.owned);
  el.innerHTML = `<div class="scrollv"><div class="phead"><div class="ttl" style="font-size:20px">꾸미기<small>겉모습만 바뀌어요 · 감정에는 영향 없어요</small></div><div class="sp"></div><div class="chipc" id="coinc" style="box-shadow:none;border:1px solid var(--line)"><i class="coin"></i><span>${fmt(S.coins)}</span></div></div>
    <div class="decoprev"><div class="scene" style="position:absolute;inset:0">${sceneHTML({ mini: true })}</div><div class="sign ${on.sign === 'najeon' && own.najeon ? 'najeon' : on.sign === 'gilt' && own.gilt ? 'gilt' : ''}" style="top:34px;transform:translateX(-50%) scale(.8)"><div><b>오랜상회</b><small>OLDEN &amp; CO.</small></div></div></div>
    <div class="sect">가게 꾸미기<small>골목 동전은 손님을 맞을수록 모여요</small></div><div class="decolist">${vis.map(row).join('')}</div></div>`;
  show('deco');
  requestAnimationFrame(() => layout($('.decoprev .scene', el), { top: 60 }));
  el.onclick = async e => {
    const b = e.target.closest('[data-k]'); if (!b) return; A.tap(); const d = DECO.find(x => x.id === b.dataset.id); if (!d) return;
    if (b.dataset.k === 'toggle') { if (on[d.slot] === d.id) on[d.slot] = d.slot === 'sign' ? 'wood' : d.slot === 'fur' ? 'base' : null; else on[d.slot] = d.id; save(); return openDeco(); }
    if (b.dataset.k === 'coin') { if (S.coins < d.coins) return toast(`동전이 ${fmt(d.coins - S.coins)}개 모자라요 · 손님을 맞으면 모여요`); modal(`<h3>${esc(d.name)}</h3><p>동전 ${fmt(d.coins)}개로 들일까요?</p><div class="row2"><button class="btn sec" data-a="close">다음에</button><button class="btn pri" data-a="ok">들이기</button></div>`, a => { closeModal(); if (a !== 'ok') return; S.coins -= d.coins; own[d.id] = 1; on[d.slot] = d.id; save(true); A.coin(3); praise(`${d.name} 들였어요`, 90); track('deco', { id: d.id, via: 'coin' }); openDeco(); }, { center: true }); }
    if (b.dataset.k === 'gold') { const r = await bm.spend(d.sku); if (!r.ok) return r.reason === 'cancel' ? null : toast(r.reason === 'short' ? '골드가 모자라요' : '지금은 살 수 없어요'); H.gold = r.gold ?? H.gold; own[d.id] = 1; on[d.slot] = d.id; save(true); A.coin(3); praise(`${d.name} 들였어요`, 90); track('deco', { id: d.id, via: 'gold' }); openDeco(); }
  };
}

/* ---------- 설정 (소리 끔 · 진동 · 원어데이로) ---------- */
export function openSettings() {
  const r = () => `<h3>설정</h3>
    <div class="setrow"><span>효과음</span><button class="tg${S.set.sfx ? ' on' : ''}" data-a="sfx" aria-label="효과음"></button></div>
    <div class="setrow"><span>배경음</span><button class="tg${S.set.bgm ? ' on' : ''}" data-a="bgm" aria-label="배경음"></button></div>
    <div class="setrow"><span>진동</span><button class="tg${S.set.haptic ? ' on' : ''}" data-a="haptic" aria-label="진동"></button></div>
    <p style="font-size:12px">오랜상회 Olden &amp; Co. v0.1 · 하루 한 손님 감정 가게 · 손님은 매일 모두에게 같은 한 분이에요.</p>
    ${inOAD ? '<button class="btn sec" data-a="oad">↩ 원어데이로</button>' : ''}
    <button class="btn pri" data-a="close">닫기</button><button class="btn ghost" data-a="reset">처음부터 다시 하기</button>`;
  const on = (a, b) => {
    if (a === 'sfx') { S.set.sfx = !S.set.sfx; A.setMuted(!S.set.sfx); }
    if (a === 'bgm') { S.set.bgm = !S.set.bgm; A.unlock(); A.setMusic(S.set.bgm); }
    if (a === 'haptic') { S.set.haptic = !S.set.haptic; setHaptic(S.set.haptic); }
    if (a === 'sfx' || a === 'bgm' || a === 'haptic') { save(true); b.classList.toggle('on'); return; }
    if (a === 'oad') { closeModal(); return exitToOAD(); }
    if (a === 'close') return closeModal();
    if (a === 'reset') return modal('<h3>처음부터 다시 할까요?</h3><p>장부 · 평판 · 동전 · 꾸미기가 모두 지워져요. 골드로 산 꾸미기는 원어데이 계정에 남아 있어요.</p><div class="row2"><button class="btn sec" data-a="no">그만두기</button><button class="btn pri" data-a="yes">지우기</button></div>', x => { closeModal(); if (x === 'yes') { reset(); location.reload(); } }, { center: true });
  };
  modal(r(), on);
}

/* ---------- 공유 카드 (정답은 넣지 않음 — 나의 선택만) ---------- */
export function shareCard(c) {
  const g = c.g, grade = c.res.grade, text = `오랜상회 · 오늘의 손님 「${tagOf(g)}」\n${g.itemName}을(를) 감정하고 '${CHN[c.choice]}'을(를) 골랐어요 — ${GRADE[grade]}\n당신이라면? #오랜상회 #하루한손님`;
  modal(`<h3>공유 카드</h3><div class="share"><h4>오늘의 손님 · ${esc(tagOf(g))}</h4><p>${esc(g.itemName)}을(를) 감정하고<br><b>'${CHN[c.choice]}'</b>을(를) 골랐어요.</p><div class="stamp ${grade}">${GRADE[grade].replace(' ', '<br>')}</div><p style="margin-top:8px;font-size:12px!important">정답은 비밀 · 당신이라면? — 오랜상회 Olden &amp; Co.</p></div><div class="row2"><button class="btn sec" data-a="close">닫기</button><button class="btn pri" data-a="go">보내기</button></div>`, async a => {
    if (a === 'close') return closeModal();
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('글을 복사했어요'); } track('share', { k: 'guest' }); } catch { /* 취소 */ }
  });
}
function shareWeek(w, title, played, nBest) {
  const text = `오랜상회 「${w.title}」 완결 — 칭호 '${title}' · 7일 중 ${played}일 · 명감정 ${nBest}번 #오랜상회`;
  try { if (navigator.share) navigator.share({ text }); else { navigator.clipboard.writeText(text); toast('글을 복사했어요'); } track('share', { k: 'week' }); } catch { /* */ }
}
void hud; void $$; void layout; void dayNo; void mainGuest; void sceneHTML;
