// 시험용 자동 플레이 (?bot=1&speed=4): 거두기 · 내리기 · 볶기 · 치우기 · 사연 · 가구 사서 놓기 · 동료 · 주문서 · 출석
import { MENU, ROAST, FURN, STAFF } from './data.js?v=0.67.2';
import { S, ST, save } from './state.js?v=0.67.2';
import { storeMult } from './game.js?v=0.67.2';

export function startBot(app) {
  const g = app.game, ui = app.ui; let t = 0, furnT = 0, logT = 0;
  const tick = () => {
    t += 0.5; document.querySelector('#modal').innerHTML = ''; ui._ub && ui._ub(); ui._ub = null;
    for (const m of g.machines) { const p = g.progress(m); if (p && p.u >= 1) g.collect(m);
      if (!g.progress(m)) { const want = g.cust.filter(c => c.state === 'order' && !(ST().bar[c.menu] > 0)).map(c => c.menu).find(k => !!MENU[k].oven === (m.kind === 'oven') && S.lv >= MENU[k].lv);
        const best = Object.entries(MENU).filter(([k, d]) => !!d.oven === (m.kind === 'oven') && S.lv >= d.lv && S.beans >= d.bean * d.n && (ST().bar[k] || 0) < 8).sort((a, b) => b[1].price - a[1].price).map(([k]) => k);
        const k = want || best[Math.floor(Math.random() * Math.min(3, best.length))]; if (k) g.brew(m, k); } }
    const r = g.roastState(); if (r && r.u >= 1) g.collectBeans(); if (!g.roastState() && S.beans < 60) { const R = ROAST.filter(x => S.lv >= x.lv && S.coins >= x.cost * storeMult() && x.t <= 900).pop(); if (R) g.roast(R.id); }
    for (const x of g.seats()) if (x.s.dirty) g.requestClean(x.o, x.k);
    for (const c of g.cust) if (c.state === 'story') { const ep = c.reg.eps[(S.reg[c.reg.id]?.ep) || 0]; if (ep) { const ch = ep.ch.slice().sort((a, b) => b[2] - a[2])[0]; g.storyDone(c, ch); } }
    for (const [k, d] of Object.entries(STAFF)) if (!S.staff[k] && S.lv >= d.lv && S.coins >= d.cost) { S.coins -= d.cost; k === 'barista' ? g.hireBarista() : g.hireHall(); }
    for (const o of S.orders) if (!o.done && (S.soldBy[o.menu] || 0) >= o.n) { o.done = true; S.coins += Math.round(MENU[o.menu].price * o.n * 1.5 * storeMult()); S.hearts += 3; }
    furnT += 0.5; if (furnT > 12) { furnT = 0; const opts = Object.entries(FURN).filter(([, d]) => !d.wall && !d.gift && !d.heart && S.lv >= d.lv && S.coins >= d.cost * storeMult() * 1.3).map(([k]) => k);
      const tables = g.seats().length; const k = tables < 10 ? opts.find(x => FURN[x].cat === 'table') || opts[0] : opts[Math.floor(Math.random() * opts.length)];
      if (k) { g.decoStart(); g.ghostNew(k); let ok = false; for (let i = 0; i < 60 && !ok; i++) { g.ghostMove(-650 + Math.random() * 1300, -300 + Math.random() * 1000); if (Math.random() < 0.3) g.ghostRotate(); ok = !g.deco.ghost.err; }
        if (ok) g.ghostConfirm(() => { S.coins -= FURN[k].cost * storeMult(); return true; }); g.decoEnd(); } }
    logT += 0.5; if (logT >= 30) { logT = 0; console.log('#bot ' + JSON.stringify({ t, lv: S.lv, xp: S.xp, coins: S.coins, hearts: S.hearts, beans: S.beans, sold: S.sold, furn: ST().furn.length, seats: g.seats().length, score: g.score(), staff: Object.keys(S.staff), reg: Object.fromEntries(Object.entries(S.reg).map(([k, v]) => [k, v.ep])), cust: g.cust.length, errs: window.__errs.length })); }
  };
  window.__botTick = tick; setInterval(tick, 500 / (+(new URLSearchParams(location.search).get('speed')) || 1)); save();
}
