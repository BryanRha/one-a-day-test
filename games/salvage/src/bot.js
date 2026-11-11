// 시험 봇 (?bot=N&free&seed=…&fast=3) — 화면 버튼을 눌러 출격 → 뒤지기 · 싸우기 · 탈출 → 결과 → 다시. N판 연속
//  기록: window.__salvage.botLog (판마다 결과 · fps · 메모리) · 오류는 window.__salvage.errors
import { ITEMS, MAPS } from './data.js?v=0.99.30';
export function installBot(app) {
  const Q = new URLSearchParams(location.search); const N = +Q.get('bot') || 3; app.timeScale = +(Q.get('fast') || 1);
  /* ?map=harbor|tunnel — 그 지도를 열어 두고(시험용) 그 지도로만 출격 */
  const MAPQ = Q.get('map'); if (MAPQ) { const S = app.S(); const need = { harbor: 11, tunnel: 19, factory: 19 }[MAPQ] || 0; for (let i = 1; i <= need; i++) if (!S.quests.done.includes('q' + i)) S.quests.done.push('q' + i); const u = MAPS[MAPQ]?.unlock; if (u && !S.quests.done.includes(u)) S.quests.done.push(u); /* 공장 = 이야기 해금 키 */ S.mapSel = MAPQ; app.save(); app.preloadMaps?.(); }
  /* M5-B: ?botchal = 주간 도전만 · ?botabyss=N = 깊은 물 심연 N 으로 (엔딩 훅을 부르고 켬) */
  const CHALB = Q.has('botchal'); if (Q.has('botabyss') && app.AB) { const S = app.S(); app.AB.markEnding(S); const A = app.AB.ab(S); A.on = true; A.max = Math.max(A.max, +Q.get('botabyss') || 3); A.sel = A.max; S.stats.raids = Math.max(S.stats.raids || 0, 6); app.save(); }
  if (CHALB) { const S = app.S(); S.stats.raids = Math.max(S.stats.raids || 0, 6); app.save(); }
  const log = app.botLog = []; app.errors = app.errors || []; let st = 'menu', t = 0, raidT = 0, hap = null, chief = false, stuck = 0, lastPos = null, goal = null, goalKind = null, fpsAcc = [], firstMem = null, wander = null;
  addEventListener('error', e => app.errors.push(String(e.message)));
  const click = sel => { const e = document.querySelector(sel); if (e) { e.click(); return true; } return false; };
  const press = sel => { const e = document.querySelector(sel); if (!e) return false; e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); e.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); return true; };
  app.botTick = dt => {
    t += dt;
    if (st === 'menu') {
      if (t < 0.6) return; t = 0;
      click('.modal .btn');
      if (document.querySelector('.scr-result')) { click('#home'); return; }
      if (log.length >= N) { st = 'done'; app.botDone = true; return; }
      if (CHALB && app.raid) { st = 'raid'; raidT = 0; fpsAcc = []; goal = null; return; }
      if (CHALB && document.querySelector('.scr-hideout')) { if (!click('#chalGo')) { app.ui.tab = 'chal'; app.ui.m5seg = 'week'; app.ui.hideout(); } return; }
      if (document.querySelector('.scr-hideout')) { if (log.length % 3 === 2) { click('#bScrap'); click('#bTre'); } click('.fb:not(.dim)'); click('#go'); return; }
      if (document.querySelector('.scr-prep')) { click('#sortie'); if (app.raid) { st = 'raid'; raidT = 0; fpsAcc = []; goal = null; } return; }
      return;
    }
    if (st !== 'raid') return;
    const R = app.raid; if (!R) { /* 판 끝 → 결과 기록 */
      const r = app.lastResult; const fl = fpsAcc.length ? fpsAcc : [0];
      const m = app.mem(); if (!firstMem) firstMem = m;
      log.push({ n: log.length + 1, map: r.map, cond: r.cond, wx: r.wx, minO2: r.minO2, out: r.outcome, val: r.value, kills: r.killN, zone: r.zoneMax, power: r.power, exit: r.exit, time: Math.round(r.time), fpsAvg: Math.round(fl.reduce((a, b) => a + b, 0) / fl.length), fpsMin: Math.min(...fl), geo: m.geo, tex: m.tex, heap: m.heap, nodes: m.nodes, corpse: r.corpseTaken, hap: hap || '', chief, why: r.outcome === 'dead' ? JSON.stringify(r.dmgLog) : '' });
      st = 'menu'; t = 0; return; }
    raidT += dt; if (app.stats.fps) fpsAcc.push(app.stats.fps); if (raidT < 0.2) { hap = null; chief = false; } if (R.happen?.k) hap = R.happen.k; if (R.chief) chief = true; /* M6-D 봇 1,000판: 판 중 사건 · 떠돌이 두목 기록 */
    if (R.over) { R.input.mx = R.input.mz = 0; return; }
    const pl = R.pl, inp = R.input; inp.auto = true;
    /* 가방 열려 있으면 담고 닫기 */
    if (app.ui.invOpen) { if (!click('#takeAll')) click('#invClose'); else click('#invClose'); return; }
    /* 체력 */
    if (pl.hp < pl.maxHp * 0.4 && (R.hasItem('med') || R.hasItem('bandage'))) press('#bMed');
    /* 빛 탄 오면 구르기 */
    for (const s of R.enemyShots) if (s.m.position.distanceTo(pl.pos) < 2.2 && pl.stam > 40 && Math.random() < 0.25) inp.roll = true;
    /* 목표 정하기 */
    const fill = R.bag.items.length; const risky = [3, 7].includes(log.length + 1); /* 3 · 7번째 판은 끝까지 버티다 물에 잠김 → 다음 판 시체 회수 시험 */
    const open = R.exits.filter(x => R.exitOpen(x) || (x.call && x.call !== 'ready' && R.waypoint(pl.pos, x.pos) !== null));
    if (R.near?.type === 'flare' && !pl.searching) { press('#bAct'); return; }
    /* 산소(터널): 30 아래면 가장 가까운 공기 방울로 */
    if (R.o2 != null && R.o2 < 30 && R.airs.length) { let best = null, bd = 1e9; for (const a of R.airs) { const d = Math.hypot(a.x - pl.pos.x, a.z - pl.pos.z); if (d < bd && R.waypoint(pl.pos, { x: a.x, y: 0, z: a.z }) !== null) { bd = d; best = a; } } if (best && R.o2 < R.o2Max * 0.9) { const g = { x: best.x, y: 0, z: best.z, clone() { return this; }, distanceTo(p) { return Math.hypot(this.x - p.x, this.z - p.z); } }; const wp = R.los(pl.pos, g) ? g : (R.waypoint(pl.pos, g) || g); const dx = wp.x - pl.pos.x, dz = wp.z - pl.pos.z, l = Math.hypot(dx, dz); if (l > 0.5) { inp.mx = dx / l; inp.mz = dz / l; } else { inp.mx = inp.mz = 0; } return; } }
    const leave = !risky && (R.time < 110 || fill >= R.bag.w * R.bag.h - 3 || raidT > 260);
    const needPower = !R.power && (R.elapsed > 150 || leave) && !open.some(x => x.kind !== 'early' || R.elapsed < 160);
    if (needPower) { goalKind = 'gen'; goal = { x: R.gen.pos.x, y: 0, z: R.gen.pos.z + 1.6, clone() { return this; }, distanceTo(p) { return Math.hypot(this.x - p.x, this.z - p.z); } }; if (R.near?.type === 'gen' && !pl.searching) { press('#bAct'); return; } }
    else if (leave) { goalKind = 'exit'; let best = null, bd = 1e9; for (const x of open) { const d = x.pos.distanceTo(pl.pos); if (d < bd) { bd = d; best = x; } } goal = best ? best.pos : pl.pos; }
    else { let best = null, bd = 1e9; for (const c of R.containers) { if (c.searched && !(c.items && c.items.length && c.kind !== 'drop')) continue; if (R.waypoint(pl.pos, c.pos) === null) continue; const d = c.pos.distanceTo(pl.pos) + (c.corpse ? -20 : 0); if (d < bd) { bd = d; best = c; } }
      if (best) { goal = best.pos; goalKind = 'loot'; if (R.near?.c === best && !pl.searching) { press('#bAct'); return; } } else if (risky) { goalKind = 'wait'; goal = pl.pos; } else { goalKind = 'exit'; goal = (open[0] || R.exits[2]).pos; } }
    if (pl.searching) { inp.mx = inp.mz = 0; return; }
    /* 길 따라 이동 · 막히면 옆으로 */
    let wp = R.los(pl.pos, goal) ? goal : (R.waypoint(pl.pos, goal) || goal);
    if (wander && wander.t > 0) { wander.t -= dt; wp = wander.p; }
    const dx = wp.x - pl.pos.x, dz = wp.z - pl.pos.z, l = Math.hypot(dx, dz);
    if (l > 0.4) { inp.mx = dx / l; inp.mz = dz / l; } else { inp.mx = inp.mz = 0; }
    if (lastPos) { if (lastPos.distanceTo(pl.pos) < 0.02 && l > 0.6) stuck += dt; else stuck = Math.max(0, stuck - dt); }
    lastPos = pl.pos.clone();
    if (stuck > 0.8) { stuck = 0; const a = Math.random() * 6.28; wander = { t: 0.7, p: pl.pos.clone().add({ x: Math.cos(a) * 3, y: 0, z: Math.sin(a) * 3 }) }; }
  };
}
