// 시험용 자동 플레이 (?bot=1&speed=4): 손 추출(사람 손 속도 · 금빛 랜덤) · 라떼아트 · 쟁반 옮기기 · 볶기 · 찻값/치우기 · 사연 · 가구 · 동료 · 주문서
import { MENU, ROAST, FURN, STAFF, ART } from './data.js?v=0.83.0';
import { S, ST, save } from './state.js?v=0.83.0';
import { storeMult, isJeong } from './game.js?v=0.83.0';

export function startBot(app) {
  const g = app.game, ui = app.ui; let t = 0, furnT = 0, logT = 0, handT = 0, moveT = 0; window.__bot = true; S.fg = 3;
  const q = new URLSearchParams(location.search), GOLD = +(q.get('gold') ?? 0.7), HAND = +(q.get('hand') ?? 2.6);   /* 금빛 성공률 · 사람 손 한 잔 시간(초) */
  const B = (window.__botStat ||= { pull: 0, gold: 0, art: 0 });
  const tick = () => {
    t += 0.5; handT -= 0.5; moveT -= 0.5; document.querySelector('#modal').innerHTML = ''; ui._ub && ui._ub(); ui._ub = null;
    for (const m of g.machines) { const p = g.progress(m); if (p && p.u >= 1) g.collect(m);
      if (g.progress(m)) continue; if (g.barista && !isJeong(m)) continue;   /* 하린이 오면 자동 머신 · 오븐은 하린 몫 · 사장은 정성 머신(1번)만 */
      const ks = Object.keys(MENU).filter(k => g.need(k) > 0 && !!MENU[k].oven === (m.kind === 'oven') && S.lv >= MENU[k].lv), k = ks.find(k => MENU[k].cat === 'sig') || ks[0]; if (!k) continue;   /* 정성 머신은 시그니처 먼저 */
      if (m.kind === 'oven') { g.brew(m, k); continue; }
      if (handT > 0) continue; handT = HAND + (MENU[k].cat === 'sig' ? 1.5 : 0);   /* 손은 하나: 한 번에 한 잔씩 · 시그니처는 라떼아트만큼 더 */
      const art = MENU[k].cat === 'sig' ? (Math.random() < 0.8 ? Object.keys(ART)[Math.floor(Math.random() * 3)] : 'heart') : null; g.handBrew(m, k, { gold: Math.random() < GOLD, art }); }
    if (g.stack.length && moveT <= 0) { g.deliverStack(); moveT = 1; }
    B.sec = (B.sec || 0) + 0.5; if (g.roastBoy) { B.rsec = (B.rsec || 0) + 0.5; if (S.beans < 3) B.b0 = (B.b0 || 0) + 0.5; } if (ST().mach.e0 && ST().mach.e0.d) B.jv = (B.jv || 0) + 1;   /* 무진 뒤 원두 바닥 시간 · 하린이 정성 머신을 쓴 횟수(0이어야 함) */
    if (g.roastBoy) { /* 볶기는 무진에게 맡김 (원두 0 구간이 사라지는지 보려고) */ } else { const r = g.roastState(); if (r && r.u >= 1) g.collectBeans(); if (!g.roastState() && S.beans < 60) { const R = ROAST.filter(x => S.lv >= x.lv && S.coins >= x.cost * storeMult() && x.t <= (S.beans < 20 ? 120 : 900)).pop();   /* 원두가 거의 없으면 빨리 볶이는 것 (10분짜리를 기다리며 멈추지 않게) */ if (R) g.roast(R.id); } }
    for (const x of g.seats()) if (x.s.dirty) g.requestClean(x.o, x.k);
    if ((ST().ret || 0) >= 3) g.wash();
    for (const c of g.cust) if (c.state === 'story') { const ep = c.reg.eps[(S.reg[c.reg.id]?.ep) || 0]; if (ep) { const ch = ep.ch.slice().sort((a, b) => b[2] - a[2])[0]; g.storyDone(c, ch); } }
    for (const [k, d] of Object.entries(STAFF)) if (!S.staff[k] && S.lv >= d.lv && S.coins >= d.cost) g.hire(k);
    { const k = Object.keys(STAFF).filter(k => g.upgradeCost(k)).sort((a, b) => g.upgradeCost(a) - g.upgradeCost(b))[0]; if (k && S.coins >= g.upgradeCost(k) * 2.5) g.upgradeStaff(k); }   /* 남는 돈으로 단계 (가구 살 돈은 남기게 2.5배) */
    for (const o of S.orders) if (!o.done && (S.soldBy[o.menu] || 0) >= o.n) { o.done = true; S.coins += Math.round(MENU[o.menu].price * o.n * 1.5 * storeMult()); S.hearts += 3; }
    furnT += 0.5; if (furnT > 12) { furnT = 0; const opts = Object.entries(FURN).filter(([, d]) => !d.wall && !d.gift && !d.heart && S.lv >= d.lv && S.coins >= d.cost * storeMult() * 1.3).map(([k]) => k);
      const tables = g.seats().length; const k = tables < 10 ? opts.find(x => FURN[x].cat === 'table') || opts[0] : opts[Math.floor(Math.random() * opts.length)];
      if (k) { g.decoStart(); g.ghostNew(k); let ok = false; for (let i = 0; i < 60 && !ok; i++) { g.ghostMove(-650 + Math.random() * 1300, -300 + Math.random() * 1000); if (Math.random() < 0.3) g.ghostRotate(); ok = !g.deco.ghost.err; }
        if (ok) g.ghostConfirm(() => { S.coins -= FURN[k].cost * storeMult(); return true; }); g.decoEnd(); } }
    logT += 0.5; if (logT >= 30) { logT = 0; console.log('#bot ' + JSON.stringify({ t, lv: S.lv, xp: S.xp, coins: Math.round(S.coins), hearts: S.hearts, beans: S.beans, sold: S.sold, seats: g.seats().length, score: g.score(), staff: S.staff, b0: B.b0 || 0, rsec: B.rsec || 0, jv: B.jv || 0, cust: g.cust.length, tk: g.tickets.length, poem: S.poem.n, poems: S.poems.length, art: S.art, hand: window.__botStat, errs: window.__errs.length })); }
  };
  window.__botTick = tick; setInterval(tick, 500 / (+(new URLSearchParams(location.search).get('speed')) || 1)); save();
}
