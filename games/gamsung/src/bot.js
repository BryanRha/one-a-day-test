// 시험용 자동 플레이 (?bot=1&speed=4): 0.2.0 — 사장님이 바에서 손 추출(사람 손 속도 · 금빛 랜덤) · 라떼아트 · 쟁반 · 바를 떠나 홀 일(일감 레일 맨 앞) · 볶기 · 동료 · 구역 열기 · 지점 계약
//   &gold=0.7&hand=2.6 (금빛 성공률 · 한 잔 손 시간) · &expand=0 (구역을 안 열고 장사만 · 성장 곡선 측정) · &owner=0 (사장님이 바만)
import { MENU, ROAST, FURN, STAFF, ART, STORES } from './data.js?v=0.99.33';
import { S, ST, save } from './state.js?v=0.99.33';
import { storeMult, priceMult, isJeong } from './game.js?v=0.99.33';

export function startBot(app) {
  const g = app.game, ui = app.ui; let t = 0, furnT = 0, logT = 0, handT = 0, moveT = 0, jobT = 0; window.__bot = true; S.fg = 3;
  const q = new URLSearchParams(location.search), GOLD = +(q.get('gold') ?? 0.7), HAND = +(q.get('hand') ?? 2.6), EXPAND = q.get('expand') !== '0', OWN = q.get('owner') !== '0';
  const B = (window.__botStat ||= { pull: 0, gold: 0, art: 0 });
  const roastNow = id => { if (g.roaster.room) g.assign([{ cell: g.accessNear([Math.floor((g.roaster.x + 700) / 100), Math.floor((g.roaster.z + 700) / 100)]), act: () => { const r = g.roastState(); if (r && r.u >= 1) g.collectBeans(); if (!g.roastState()) g.roast(id); } }], { kind: 'roast' }); else g.roast(id); };
  const tick = () => {
    t += 0.5; handT -= 0.5; moveT -= 0.5; jobT -= 0.5; if (!document.querySelector('.modal.exp')) { document.querySelector('#modal').innerHTML = ''; ui._ub && ui._ub(); ui._ub = null; ui._oc = null; }
    const o = g.owner, bar = o.mode === 'bar' && !o.steps.length;
    if (bar) {
      for (const m of g.machines) { if (m.bak) continue; const p = g.progress(m); if (p && p.u >= 1) g.collect(m);
        if (g.progress(m)) continue; if (g.barista && !isJeong(m)) continue;
        const ks = Object.keys(MENU).filter(k => g.need(k) > 0 && !!MENU[k].oven === (m.kind === 'oven') && S.lv >= MENU[k].lv), k = ks.find(k => MENU[k].cat === 'sig') || ks[0]; if (!k) continue;
        if (m.kind === 'oven') { g.brew(m, k); continue; }
        if (handT > 0) continue; handT = HAND + (MENU[k].cat === 'sig' ? 1.5 : 0);
        const art = MENU[k].cat === 'sig' ? (Math.random() < 0.8 ? Object.keys(ART)[Math.floor(Math.random() * 3)] : 'heart') : null; g.handBrew(m, k, { gold: Math.random() < GOLD, art }); }
      if (g.stack.length && moveT <= 0) { g.deliverStack(); moveT = 1; }
      if ((ST().ret || 0) >= 3) g.wash();
    }
    /* 오븐 (베이커리) · 로스터: 보람 · 무진 없으면 사장님이 걸어가서 */
    if (!S.staff.baker) for (const m of g.machines.filter(m => m.bak)) { const p = g.progress(m); if (p && p.u >= 1) g.collect(m); else if (!p) { const k = Object.keys(MENU).find(q => MENU[q].oven && g.need(q) > 0 && S.lv >= MENU[q].lv); if (k) g.brew(m, k); } }
    B.sec = (B.sec || 0) + 0.5; if (g.roastBoy) { B.rsec = (B.rsec || 0) + 0.5; if (S.beans < 3) B.b0 = (B.b0 || 0) + 0.5; } if (ST().mach.e0 && ST().mach.e0.d) B.jv = (B.jv || 0) + 1;
    if (!g.roastBoy) { const r = g.roastState(), beans = S.beans + (ST().bags || 0); if (r && r.u >= 1 && !g.roaster.room) g.collectBeans(); if (!g.roastState() && beans < 60) { const R = ROAST.filter(x => S.lv >= x.lv && S.coins >= x.cost * priceMult() && x.t <= (beans < 20 ? 120 : 900)).pop(); if (R) roastNow(R.id); } else if (r && r.u >= 1 && g.roaster.room && bar && jobT <= 0) { roastNow('house'); jobT = 2; } }
    /* 홀 일: 바 일이 한숨 돌렸을 때(정성 머신이 도는 중이거나 주문 없음) 맨 앞 일감 · 원두가 바닥이면 원두 먼저 */
    if (OWN && jobT <= 0 && !o.steps.length) { const L = g.jobList(); const jm = g.machines.find(isJeong), jp = jm && g.progress(jm), sigNeed = g.tickets.some(t => t.items.some(it => g.need(it.k) > 0 && !MENU[it.k].oven && (MENU[it.k].cat === 'sig' || !g.barista)));
      /* 사람처럼: 바 일(손 추출할 주문 · 다 된 잔 · 쟁반)이 있으면 바에서 · 정성 머신을 자동으로 돌려 두고(8초 넘게 남음) 그 사이 홀 일 한두 개 · 원두 바닥 · 돌발 일은 먼저 */
      const barBusy = g.stackTotal() || (jp && jp.u >= 1) || (!jp && sigNeed) || (jp && jp.left < 8 && sigNeed);
      const j = L.find(j => j.kind === 'bean' && S.beans < 40) || L.find(j => j.kind === 'event') || (!barBusy ? L[0] : null);
      if (j && bar && jm && !jp) { const k = Object.keys(MENU).find(k => g.need(k) > 0 && !MENU[k].oven && S.lv >= MENU[k].lv); if (k) g.brew(jm, k); }   /* 떠나기 전에 정성 머신을 자동으로 돌려 둠 → 딱 맞춤 */
      if (j) { j.run(); jobT = 1; } else if (!bar && (barBusy || !L.length)) g.goBar(); }
    if (!OWN) for (const x of g.seats()) if (x.s.dirty && !g.workers.length) g.clean(x.o, x.k);
    for (const c of g.cust) if (c.state === 'story' && !OWN) { const ep = c.reg.eps[(S.reg[c.reg.id]?.ep) || 0]; if (ep) g.storyDone(c, ep.ch.slice().sort((a, b) => b[2] - a[2])[0]); }
    for (const [k, d] of Object.entries(STAFF)) if (!S.staff[k] && S.lv >= d.lv && S.coins >= d.cost && (!d.kind || g.hasKind(d.kind))) g.hire(k);
    { const k = Object.keys(STAFF).filter(k => g.upgradeCost(k)).sort((a, b) => g.upgradeCost(a) - g.upgradeCost(b))[0]; if (k && S.coins >= g.upgradeCost(k) * 2.5) g.upgradeStaff(k); }
    for (const o2 of S.orders) if (!o2.done && (S.soldBy[o2.menu] || 0) >= o2.n) { o2.done = true; S.coins += Math.round(MENU[o2.menu].price * o2.n * 1.5 * storeMult()); S.hearts += 3; }
    if (ST().safe > 0 && g.officeAt) { g.earn(ST().safe); ST().safe = 0; }
    /* 구역 열기 · 지점 계약 */
    if (EXPAND) { const nx = g.nextStage(); if (nx && !g.stageWhy(nx)) g.openStage(nx.i); const bi = S.si + 1; if (STORES[bi] && !S.stores[bi] && !g.branchWhy(bi)) g.contract(bi); }
    furnT += 0.5; if (furnT > 15 && EXPAND) { furnT = 0; const opts = Object.entries(FURN).filter(([, d]) => !d.wall && !d.gift && !d.heart && S.lv >= d.lv && S.coins >= d.cost * priceMult() * 3).map(([k]) => k);
      const k = g.seats().length < 14 ? opts.find(x => FURN[x].cat === 'table' && x !== 'parasol') : opts[Math.floor(Math.random() * opts.length)];
      if (k) { g.decoStart(); g.ghostNew(k); let ok = false; for (let i = 0; i < 40 && !ok; i++) { g.ghostMove(-650 + Math.random() * 1300, -300 + Math.random() * 1000); if (Math.random() < 0.3) g.ghostRotate(); ok = !g.deco.ghost.err; }
        if (ok) g.ghostConfirm(() => { S.coins -= FURN[k].cost * priceMult(); return true; }); g.decoEnd(); } }
    logT += 0.5; if (logT >= 30) { logT = 0; console.log('#bot ' + JSON.stringify({ t, lv: S.lv, coins: Math.round(S.coins), earned: Math.round(S.earned), hearts: S.hearts, beans: S.beans, bags: ST().bags, si: S.si, open: ST().open, build: Object.keys(ST().build), seats: g.seats().length, staff: S.staff, cust: g.cust.length, tk: g.tickets.length, own: window.__ownStat, ev: g.events.length, errs: window.__errs.length })); }
  };
  window.__botTick = tick; setInterval(tick, 500 / (+(new URLSearchParams(location.search).get('speed')) || 1)); save();
}
