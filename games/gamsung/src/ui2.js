// 화면 0.2.0 개편 (EXPANSION_PLAN · 시안 mockups/expansion 01~03): 층 버튼 · 사장님 일감 레일 · 동선 카드 · 확장 지도(층 쌓아 보기) · 지역 지도 · 방문형 방(동료 쉼터 · 사장실 · 원두 창고)
//   광고 바구니(자리 10곳 · 하루 10) · 골드 상품(서버 표 SHOP.gamsung 기준 · 모두 무료 길) · 커피트럭 · 지표 gs_*
//   원칙 (마루미 0.3.1): 방 창 = 할 일 하나 큰 카드 + 더 보기 · 설명 한 줄 · 팝업은 한 번에 하나 · 날아가는 물건은 3초 안에 도착 · 광고 종이는 그 자리에 고정
//   UI.prototype 에 섞어 씀 (ui.js 끝)
import * as THREE from 'three';
import { MENU, STAFF, STAFF_UP, STORES, STORE_TMP, OWNER, OWNER_JOBS, AD_DAY, AD_PLACES, GOLD, VIP, IDLE, CHAIN, THEME_SETS, APRONS, SEASON, TRUCK, BRAND, FURN, REGULARS, MACHINES } from './data.js?v=0.99.40';
import { S, ST, save, today, now } from './state.js?v=0.99.40';
import { fmt, storeMult, priceMult, vipOn, machineCount, cx, cz } from './game.js?v=0.99.40';
import { BRANCHES, FLOORS, FDX, hms, instGold, floorOfX, FINISHED } from './layout.js?v=0.99.40';
import { areaBox } from './world.js?v=0.99.40';
import { bm } from './oad_bm.js?v=0.99.40';
import { sfx } from './audio.js?v=0.99.40';
import { pushBack, inOAD, track } from './oad.js?v=0.99.40';
import { pic } from './ui.js?v=0.99.40';

const $ = s => document.querySelector(s);
const mmss = s => s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const STAGE_ICON = { shop: '☕', front: '🌊', roast: '🔥', bakery: '🥐', lounge: '🛋', office: '📚', annex: '🚚', roof: '🌇' };
const BOSS_UP = [{ id: 'walk', name: '사장님 걸음', icon: '👟', base: 400, max: 5, eff: l => `걸음 +${l * 8}%` }, { id: 'hand', name: '사장님 손', icon: '🧺', base: 900, max: 2, eff: l => `손 ${3 + l}칸` },
  { id: 'tip', name: '정성 팁', icon: '☕', base: 600, max: 5, eff: l => `정성 · 가져다 드리기 팁 +${l * 10}%` }, { id: 'greet', name: '첫인사 범위', icon: '👋', base: 300, max: 5, eff: l => `첫인사 범위 +${l * 15}%` }];
const bossCost = (u, l) => Math.round(u.base * Math.pow(2.3, l) / 10) * 10;
export const UI2 = {
  // ── HUD (시안 01): 위 = 돈 · ♥ · 원두 · 레벨/지점/층 · 왼쪽 = 동선 카드 · 쿠폰 · 작은 버튼 · 오른쪽 = 층 버튼 · 아래 = 주문 / 사장님 일감 · 메뉴 · 확장 · 꾸미기 · 단골 · 지도
  hud2() { const h = $('#hud');
    h.querySelector('.side')?.remove(); h.querySelector('.bottom')?.remove(); h.querySelector('#rail')?.remove();
    const lvl = $('#lvl'); h.querySelector('.top').append(lvl);
    h.insertAdjacentHTML('beforeend', `<div class="lside" id="lside"><div class="ocard" id="ocard"></div></div>
      <div class="minis" id="minis"><button class="sb" id="bOrd"><span>📜</span>주문서<i class="dot" id="ordDot"></i></button><button class="sb" id="bAtt"><span>🎁</span>출석<i class="dot" id="attDot"></i></button><button class="sb ad" id="bAd"><span>📺</span><em id="adT">0/10</em></button><button class="sb" id="bShop"><span>🛍</span>상점</button><button class="sb" id="bSet"><span>⚙️</span>설정</button>${inOAD ? '<button class="sb" id="bExit"><span>↩</span>원어데이</button>' : ''}</div>
      <div class="floors" id="floors"></div>
      <div class="dock" id="dock"><div class="dtabs"><button data-dt="order" id="dtO">주문</button><button data-dt="job" id="dtJ">사장님 일감</button><em id="dEv"></em></div><div class="rail" id="rail"></div><div class="jobs" id="jobs"></div></div>
      <div class="bottom" id="bottom">${[['☕', '메뉴', 'menu'], ['🔨', '확장', 'exp'], ['🪑', '꾸미기', 'deco'], ['💌', '단골', 'reg'], ['🗺️', '지도', 'map']].map(([i, t, k]) => `<button class="bb" data-b="${k}"><i class="dot" id="dot_${k}"></i><span>${i}</span>${t}</button>`).join('')}</div>
      <div class="ofly" id="ofly"></div>`);
    $('#minis').prepend($('#cp'));
    $('#bottom').onclick = e => { const b = e.target.closest('[data-b]'); if (!b) return; sfx('tap', { vol: 0.4 }); ({ menu: () => this.menuBook(), exp: () => this.expansion(), deco: () => this.decoEnter(), reg: () => this.regulars(), map: () => this.map() })[b.dataset.b](); };
    $('#bOrd').onclick = () => this.orders(); $('#bAtt').onclick = () => this.attendance(); $('#bAd').onclick = () => this.adPick(); $('#bShop').onclick = () => this.goldShop(); $('#bSet').onclick = () => this.settings(); if ($('#bExit')) $('#bExit').onclick = () => import('./oad.js?v=0.99.40').then(m => m.exitToOAD());
    $('#dock').querySelector('.dtabs').onclick = e => { const b = e.target.closest('[data-dt]'); if (!b) return; this._dt = b.dataset.dt; this._dtUser = this.app.game.t; this.dockShow(); };
    this._dt = 'order'; this.dots = [];
    bm.hello().then(h => { if (h.ok) { for (const it of h.items || []) if (!S.items.includes(it)) S.items.push(it); } this.adUi(); this.progress(); }).catch(() => {});   /* 원어데이 정보(골드 가격 · 광고 남은 수 · 소장 상품) — 버튼 표시에 씀 */
  },
  // ── 매 프레임 (ui.frame 끝에서)
  frame2(g) { const o = g.owner; if (!o) return;
    /* 주문 / 사장님 일감: 사장님이 바에 있으면 주문 · 밖이면 일감 (사람이 고른 탭은 8초 유지) */
    if (!this._dtUser || g.t - this._dtUser > 8) { const want = o.mode === 'bar' && !g.jobList().some(j => j.urgent) ? 'order' : 'job'; if (want !== this._dt) { this._dt = want; this.dockShow(); } }
    if ((this._jT = (this._jT || 0) - 1 / 60) <= 0) { this._jT = 0.25; this.jobsUi(g); this.floorsUi(g); this.ocardUi(g); }
    this.pathDots(g); this.adUi(); this.poemFlyUi(g); this.worldChips(g);
    if (!window.__bot) this.app.follow && o.mode !== 'bar' && floorOfX(o.pos.x) === g.view.f && this.app.follow(o.pos.x, o.pos.z, 1 / 60); },
  /* 세계 위 일감 말풍선 (시안 01): 지금 층의 일감 3개 · 사장님이 든 것 · 원두통 · 돌발 일 자리 — 누르면 그 일 */
  worldChips(g) { if (g.deco) return; const cam = this.app.cam, W = innerWidth, H = innerHeight, v = new THREE.Vector3(), at = (x, y, z) => { v.set(x, y, z).project(cam); return `translate(${(v.x + 1) / 2 * W}px,${(1 - v.y) / 2 * H}px)`; }, f = g.view.f || 0, o = g.owner;
    const list = g.jobList().filter(j => j.kind !== 'greet' && floorOfX(cx(j.cell[0])) === f).slice(0, 3);
    for (const j of list) { const pos = j.kind === 'event' ? [cx(j.ev.cells[0][0]), cz(j.ev.cells[0][1])] : j.kind === 'bean' ? g.bagAt : j.kind === 'dessert' ? g.caseAt : j.kind === 'serve' ? (() => { const c = g.cust.find(c => c.reserved && !c.taken && !c.delBy && g.seatFar(c.seat) && floorOfX(c.pos.x) === f); return c ? [c.pos.x, c.pos.z] : [cx(j.cell[0]), cz(j.cell[1])]; })() : [cx(j.cell[0]), cz(j.cell[1])];
      const lab = j.kind === 'serve' ? '가져다 드리기' : j.kind === 'clean' ? '치우기 · 찻값' : j.kind === 'bean' ? '원두 나르기' : j.label; const d = this.chip('j_' + j.kind + (j.ev ? j.ev.id : ''), 'jobc' + (j.urgent ? ' u' : ''), () => ({ kind: 'job', j }));
      d.style.transform = at(pos[0], 240, pos[1]) + ' translate(-50%,-100%)'; const html = `<i>${OWNER_JOBS[j.kind]?.icon || '⚡'}</i><b>${lab}</b>`; if (d._h !== html) { d.innerHTML = html; d._h = html; } }
    if (o.carry.length && floorOfX(o.pos.x) === f) { const n = o.carry.length, k = o.carry[0].kind, d = this.chip('own', 'jobc own'); d.style.transform = at(o.pos.x, 250, o.pos.z) + ' translate(-50%,-100%)'; const html = `<b>${{ bean: `원두 ${n}봉`, tray: `쟁반 ${n}`, dessert: `디저트 ${n}`, flower: '꽃' }[k] || '짐'} 나르는 중</b>`; if (d._h !== html) { d.innerHTML = html; d._h = html; } }
    if (S.beans < 30 && f === 0) { const d = this.chip('bin', 'jobc u bin', () => g.bagAt && ST().bags > 0 ? { kind: 'bags' } : { kind: 'roaster' }); d.style.transform = at(640, 230, -560) + ' translate(-50%,-100%)'; const html = `<i>🫘</i><b>원두통 ${S.beans}잔분</b>`; if (d._h !== html) { d.innerHTML = html; d._h = html; } } },
  dockShow() { const d = $('#dock'); if (!d) return; d.classList.toggle('jobm', this._dt === 'job'); $('#dtO').classList.toggle('on', this._dt === 'order'); $('#dtJ').classList.toggle('on', this._dt === 'job'); },
  jobsUi(g) { const list = g.jobList(), o = g.owner, el = $('#jobs');
    if (!S.tip.serve && list.some(j => j.kind === 'serve') && !$('#modal').firstChild && !window.__bot) { S.tip.serve = 1; save(); this._dt = 'job'; this._dtUser = g.t; this.dockShow(); const p = $('#praise'); p.innerHTML = '<b>🧺 먼 자리 손님</b><span>머신이 도는 동안 테라스 손님께 가져다 드려요 · 아래 일감을 눌러요</span>'; p.className = 'praise on soft'; clearTimeout(this._prT); this._prT = setTimeout(() => p.classList.remove('on'), 4200); }   /* 처음 안내 한 번 (계획 3-4 ⑥) */ $('#dtO').innerHTML = `주문 <i>${g.tickets.length}</i>`; $('#dtJ').innerHTML = `사장님 일감 <i class="${list.some(j => j.urgent) ? 'u' : ''}">${list.length}</i>`;
    const ev = g.events.slice().sort((a, b) => a.t - b.t)[0]; const evH = ev ? `돌발 · ${ev.def.name.split(' ').slice(0, 2).join(' ')} ${mmss(Math.ceil(ev.t))}` : ''; if ($('#dEv').textContent !== evH) $('#dEv').textContent = evH;
    const cards = []; if (o.mode !== 'bar') { const m = g.machines.find(m => { const p = g.progress(m); return p && !m.bak; }), p = m && g.progress(m), left = o.out?.deadline ? Math.max(0, Math.ceil(o.out.deadline - g.t)) : 0; cards.push({ key: 'bar', icon: '☕', name: '바로 돌아가기', sub: left ? `딱 맞춤 ${mmss(left)}` : p && p.u >= 1 ? '잔이 기다려요' : '정성 한 잔', cls: left && left < 6 ? 'gold' : '', run: () => g.goBar() }); }
    for (const j of list.slice(0, 4 - cards.length)) cards.push({ key: j.kind + j.label, icon: OWNER_JOBS[j.kind]?.icon || '⚡', name: j.label, sub: j.kind === 'event' ? `${mmss(Math.ceil(j.ev.t))} · ${OWNER_JOBS.event.sub}` : OWNER_JOBS[j.kind]?.sub || '', cls: (j.urgent ? 'u' : '') + (o.job && o.job.kind === j.kind && (j.kind !== 'event' || o.job.ev === j.ev) ? ' cur' : ''), run: j.run });
    const html = cards.length ? cards.map((c, i) => `<button class="jc ${c.cls}" data-j="${i}"><i>${c.icon}</i><b>${c.name}</b><small>${c.sub}</small></button>`).join('') : `<div class="jempty">${o.mode === 'bar' ? '바에서 정성 한 잔 · 홀 일이 생기면 여기에' : '할 일이 없어요 · 곧 바로 돌아가요'}</div>`;
    if (el._h !== html) { el.innerHTML = html; el._h = html; } this._cards = cards; el.onclick = e => { const b = e.target.closest('[data-j]'); if (!b) return; const c = this._cards[+b.dataset.j]; if (c) { sfx('tap', { vol: 0.35 }); c.run(); this._dt = 'job'; this._dtUser = g.t; } }; },
  /* 층 버튼: 열린 층만 · 지금 층 진하게 · 일감 있는 층에 빨간 수 */
  floorsUi(g) { const el = $('#floors'); const fl = [0, 1, 2, 3].filter(f => g.B.areas.some(a => a.floor === f && g.areaOpen(a.id))); if (fl.length < 2) { if (el.innerHTML) el.innerHTML = ''; return; }
    const cnt = f => g.jobList().filter(j => floorOfX(cx(j.cell[0])) === f).length + g.cust.filter(c => floorOfX(c.pos.x) === f && c.reserved && !c.taken).length * 0;
    const html = fl.slice().reverse().map(f => { const n = f === g.view.f ? 0 : cnt(f); return `<button class="fb ${f === g.view.f ? 'on' : ''}" data-f="${f}">${f === 3 ? '루프<br><small>탑</small>' : FLOORS[f]}${n ? `<i>${n}</i>` : ''}${floorOfX(g.owner.pos.x) === f ? '<u></u>' : ''}</button>`; }).join('');
    if (el._h !== html) { el.innerHTML = html; el._h = html; el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { sfx('tap', { vol: 0.35 }); this.setFloor(+b.dataset.f); }); } },
  setFloor(f, init) { const g = this.app.game; if (init && g.view.f === f) { this.app.floor && (g.view.set = false, this.app.floor(f)); return; } if (this.app.floor) this.app.floor(f); g.view.f = f; g.applySun(); this.floorsUi(g); this.progress(); },
  /* 동선 카드 (시안 01 왼쪽 위): 동선 이어가기 ×N · 딱 맞춤 안내 */
  ocardUi(g) { const o = g.owner, el = $('#ocard'), out = o.out; let html = '';
    if (out && o.mode !== 'bar') { const left = out.deadline ? Math.ceil(out.deadline - g.t) : 0; html = `<b>동선 이어가기 <em>×${Math.max(1, Math.min(out.n, OWNER.chainMax))}</em></b><span>${left > 0 ? `잔이 나오기 전에 바로 돌아오면<br>「딱 맞춤」 팁 +15% · <em>${mmss(left)}</em>` : out.n ? '바에 돌아가면 한꺼번에 받아요' : '홀 일을 이어서 해 보세요'}</span>`; }
    if (el._h !== html) { el.innerHTML = html; el._h = html; el.classList.toggle('on', !!html); } },
  /* 사장님 길 (빨간 점선 · 시안 01) */
  pathDots(g) { const o = g.owner; if (!this.dotG) { this.dotG = new THREE.Group(); g.sc.add(this.dotG); const geo = new THREE.CircleGeometry(7, 10).rotateX(-Math.PI / 2), mat = new THREE.MeshBasicMaterial({ color: BRAND.redHex, transparent: true, opacity: 0.85 }); for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(geo, mat); m.visible = false; this.dotG.add(m); } }
    if (this.dotG.parent !== g.sc) g.sc.add(this.dotG); const pts = []; if (o.route && o.route.length && !g.deco) { let px = o.pos.x, pz = o.pos.z; for (const [x, z] of o.route) { if (Math.abs(x - px) > FDX / 2) break; const L = Math.hypot(x - px, z - pz); for (let u = 30; u < L && pts.length < 26; u += 45) pts.push([px + (x - px) * u / L, pz + (z - pz) * u / L]); px = x; pz = z; if (pts.length >= 26) break; } }
    this.dotG.children.forEach((m, i) => { const p = pts[i]; m.visible = !!p; if (p) m.position.set(p[0], 2, p[1]); }); },
  tapMark(p) { const g = this.app.game, m = new THREE.Mesh(new THREE.RingGeometry(18, 26, 18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: BRAND.redHex, transparent: true })); m.position.set(p.x, 3, p.z); g.sc.add(m); g.fx.push({ t: 0, d: 0.5, f: u => { m.scale.setScalar(1 + u); m.material.opacity = 1 - u; if (u >= 1) g.sc.remove(m); } }); },
  praiseOwner(fit, mult, v) { const el = $('#praise'); if (!el || (!fit && mult < 2)) return; el.innerHTML = `<b>${fit ? '딱 맞춤!' : `동선 ×${mult}`}</b><span>${fit ? `잔이 나올 때 딱 돌아왔어요 · +${fmt(v)}` : `한 바퀴 돌고 와서 한 잔 · +${fmt(v)}`}</span>`; el.className = 'praise on' + (fit ? ' gold' : ''); clearTimeout(this._prT); this._prT = setTimeout(() => el.classList.remove('on'), 1800); },
  chain(n) { if (n >= 3 && !this.bigBusy()) { const el = $('#praise'); el.innerHTML = `<b>동선 ×${n}</b><span>${n >= OWNER.chainMax ? '최고 동선이에요!' : '이어서 하면 더 커져요'}</span>`; el.className = 'praise on'; clearTimeout(this._prT); this._prT = setTimeout(() => el.classList.remove('on'), 1300); } },
  event(e, on, done) { /* 돌발 일은 레일 머리글 · 그 자리 말풍선으로 (팝업은 한 번에 하나 · 마루미 0.3.1) · 놓쳐도 사라질 뿐 (벌 없음) */ },
  eventDone(e, v) { if (!this.slotOk('event2x') || e.x2) return; const t = $('#toast'); t.innerHTML = `${e.def.icon} 잘했어요 +${fmt(v)} <button class="x2" id="ev2">📺 ×2</button>`; t.classList.add('on'); clearTimeout(this._tt); this._tt = setTimeout(() => t.classList.remove('on'), 4500);
    $('#ev2').onclick = ev => { ev.stopPropagation(); t.classList.remove('on'); this.ad('event', () => { const g = this.app.game, w = g.earn(v); g.ui.float(`×2 +${fmt(w)}`, g.owner.pos.clone().setY(260), 'pay'); save(); this.progress(); }, 'event2x', `돌발 일 보상 한 번 더 +${fmt(v)}`); }; },
  stageDone(s) { const g = this.app.game; this.toast(`${s.name} 완성!`); if (window.__bot) return; setTimeout(() => { if ($('#modal').firstChild || $('#pull')) return; const m = this.modal(`<div class="lvup"><small>${s.en}</small><b>${STAGE_ICON[s.key] || '✨'} ${s.name}</b><p>${this.stageGain(s)}</p></div><button class="btn" id="mOk">좋아요</button><button class="btn ghost" id="mSh">공유 카드</button>`, '', () => this.pauseAd('build')); $('#mOk').onclick = () => this.close(); $('#mSh').onclick = () => this.share(`${STORES[S.si].name} ${s.name}까지 열었어요 ☕`); }, 700); },
  stageGain(s) { const g = this.app.game, seats = s.ids.reduce((n, id) => n + (g.area(id).seats || []).reduce((a, [f]) => a + (FURN[f].seats || []).length, 0), 0);
    return ({ front: '먼 자리 손님께 가져다 드리면 팁 +20%', roast: '로스터가 이사 · 원두 자루를 바 원두통으로 날라요', bakery: '오븐이 이사 · 디저트를 진열장에서 날라요 · 바에 머신 자리가 늘어요', lounge: '계단 · 2층 자리 · 단체 손님 안내', office: '동료 쉼터 · 사장실 · 금고 · 지점 계약 책상', annex: '드라이브스루 · 포장 창구 · 커피트럭 차고', roof: '노을 자리 · 저녁 손님 +40%' }[s.key] || '') + (seats ? ` · 자리 +${seats}` : ''); },
  arrived(bi) { const st = ST(); this.toast(`${STORES[bi].name}에 왔어요${st.tasks && st.tasks.length ? ' · 순회 일감 3개가 기다려요' : ''}`); track('gs_time', { b: bi, st: 'in' }); this.pauseAd('arrive'); },
  /* 쉼표 순간 전면 광고 (그룹 C · 앱이 간격 판단): 지점 도착 · 큰 공사 완성 창 닫음 · 금고 창 닫음 · 트럭 판 끝 — 손 추출 · 사연 · 돌발 일 중엔 안 띄움 */
  pauseAd(why) { const g = this.app.game; if (window.__bot || vipOn() || bm.info.owned || $('#pull') || g.owner?.job?.kind === 'event' || g.owner?.job?.kind === 'story' || this._adBusy || Date.now() - (this._lastAd || 0) < 30000) return; bm.interstitial('pause_' + why).catch(() => {}); },
  share(text) { track('gs_share', { b: S.si, t: text.slice(0, 20) }); try { if (navigator.share) navigator.share({ title: '감성커피', text }).catch(() => {}); else navigator.clipboard && navigator.clipboard.writeText(text).then(() => this.toast('공유 글을 복사했어요')); } catch { this.toast('공유 글을 복사하지 못했어요'); } },
  // ── 광고 바구니 (계획안 5-2 · 마루미와 같은 방식): 자리 10곳이 하루 10번을 나눠 씀 · 자리마다 상한 · VIP 는 광고 없이 바로(횟수는 같음)
  adDay() { if (S.ads.day !== today()) S.ads = { day: today(), n: 0 }; if (S.adp.day !== today()) S.adp = { day: today(), n: {} }; return S.adp.n; },
  adLeft(kind) { this.adDay(); const h = bm.info, mine = Math.max(0, AD_DAY - S.ads.n); let left = mine; if (h.ok) left = h.group === 'A' ? 0 : vipOn() || h.owned ? mine : Math.min(mine, Math.max(0, (h.ads && h.ads.rewardLeft) || 0)); else if (inOAD) left = 0;
    if (kind) { const pl = { boost: 'boost2x', finish: 'finish', offline: 'offline2x' }[kind] || kind; return Math.min(left, this.placeLeft(pl)); } return left; },
  placeLeft(pl) { this.adDay(); const P = AD_PLACES[pl]; return P ? Math.max(0, P.cap - (S.adp.n[pl] || 0)) : 0; },
  slotOk(pl) { const h = bm.info; if (h.ok && h.group === 'A') return false; return this.adLeft() > 0 && this.placeLeft(pl) > 0; },
  goldOf(sku) { return bm.info.ok && bm.info.group !== 'A' ? bm.price(sku) || 0 : 0; },
  adUi() { const b = $('#bAd'); if (!b) return; const h = bm.info, boost = (S.boostUntil || 0) > now(); b.hidden = !!(h.ok && h.group === 'A'); b.classList.toggle('on', boost); b.classList.toggle('spent', !this.adLeft() && !boost); const t = boost ? mmss(Math.ceil(((S.boostUntil || 0) - now()) / 1000)) : `${this.adLeft()}/${AD_DAY}`; const e = $('#adT'); if (e && e.textContent !== t) e.textContent = t; },
  async ad(kind, done, place, label) {
    if (this._adBusy) return false; place ||= { boost: 'boost2x', finish: 'finish', offline: 'offline2x' }[kind] || kind;
    if (kind === 'boost' && (S.boostUntil || 0) > now()) { this.toast('손님 2배가 이미 켜져 있어요'); return false; }
    if (!this.slotOk(place)) { this.toast(this.adLeft() <= 0 ? '오늘 볼 수 있는 광고를 다 봤어요 · 내일 또 만나요' : '이 자리 광고는 오늘 다 봤어요'); return false; }
    this._adBusy = true;
    try { const h = await bm.hello(); let ok;
      if (vipOn()) { ok = true; this.toast('👑 VIP · 광고 없이 받았어요'); }
      else ok = h.ok ? await this.oadAd(place) : inOAD ? false : await this.testAd(kind, label);
      if (!ok) return false;
      this.adDay(); S.ads.n++; S.adp.n[place] = (S.adp.n[place] || 0) + 1; track('gs_ad', { pl: place, b: S.si }); this._lastAd = Date.now(); sfx('reward');
      if (kind === 'boost') { S.boostUntil = now() + 180000; this.toast('3분 동안 손님 2배!'); }
      if (place === 'finish' && $('#fAd')) this.close();   /* 바로 완성 창은 닫음 (원어데이 광고 뒤에도) */
      save(true); try { done && done(); } catch (e) { console.error(e); } return true;
    } finally { this._adBusy = false; this.adUi(); this.progress(); } },
  async oadAd(place) { const r = await bm.rewardedAd(place); if (r.ok) return true; if (r.reason === 'limit') this.toast('오늘 볼 수 있는 광고를 다 봤어요 · 내일 또 만나요'); else if (r.reason === 'off') this.toast('지금은 광고 보상이 없어요'); else if (r.reason !== 'cancel') this.toast('광고를 불러오지 못했어요 · 잠시 뒤 다시 해 주세요'); return false; },
  testAd(kind, label) { const what = label || (kind === 'boost' ? '3분 동안 손님 2배' : kind === 'offline' ? '쉬는 동안 번 돈 한 번 더' : kind === 'finish' ? '바로 완성' : '보상');
    return new Promise(res => { const end = Date.now() + 3000; let fin = false, tm = 0;
      const stop = ok => { if (fin) return; fin = true; clearInterval(tm); removeEventListener('visibilitychange', tick); res(ok); };
      const tick = () => { if (fin) return; if (!$('#adbox')) return stop(false); const n = Math.max(0, Math.ceil((end - Date.now()) / 1000)), e = $('#adc'); if (e) e.textContent = n; if (n <= 0) { this.close(); stop(true); } };
      this.modal(`<h2>📺 광고 보고 받기</h2><p><b>${what}</b></p><div class="adbox" id="adbox"><span>광고 (시험용)</span><em id="adc">3</em></div><button class="btn ghost" id="adNo">그만두기</button>`); $('#adNo').onclick = () => this.close(); tm = setInterval(tick, 250); addEventListener('visibilitychange', tick); }); },
  /* 골드로 같은 효과 (원어데이 확인 창 → 차감 → 효과) · item = 영구 상품 · ♥(마음)은 팔지 않음 */
  async gold(sku, fn, item) { if (this._adBusy) return false; const gp = this.goldOf(sku); if (!gp) { this.toast('지금은 골드 상품을 쓸 수 없어요'); return false; } this._adBusy = true;
    try { const r = await bm.spend(sku); if (!r.ok) { if (r.reason === 'short') this.toast('골드가 모자라요'); else if (r.reason === 'limit') this.toast('오늘은 이만큼만 살 수 있어요'); else if (r.reason === 'login') this.toast('원어데이 로그인이 필요해요'); return false; }
      if (item && !S.items.includes(item)) S.items.push(item); sfx('reward'); try { fn && fn(); } catch (e) { console.error(e); } save(true); this.progress(); return true; } finally { this._adBusy = false; } },
  /* 📺 HUD: 손님 2배 3분 · 10분치 돈 바로 (자리 boost2x 하루 2) — 다 보면 🪙 같은 효과 */
  adPick() { const g = this.app.game, on = this.slotOk('boost2x'), gp = this.goldOf('boost'), v = Math.round(g.minuteValue() * 10);
    if (!on && !gp) return this.toast(this.adLeft() <= 0 ? `오늘 광고 ${AD_DAY}번을 다 봤어요 · 내일 또 만나요` : '📺 보상은 하루 2번이에요 · 내일 또 만나요');
    const m = this.modal(`<h2>📺 광고 보고 받기</h2><p class="sub" id="adpick">오늘 광고 <b>${this.adLeft()}/${AD_DAY}</b> · 이 버튼 ${this.placeLeft('boost2x')}번 남음${on ? '' : ' · 같은 효과를 🪙로'}</p>
      <div class="uplist"><button class="upr pickr" data-k="boost"><i>👥</i><div><b>손님 2배 · 3분</b><span>문이 바빠져요</span></div><em>${on ? '📺' : `🪙${gp}`}</em></button><button class="upr pickr" data-k="coins"><i>💰</i><div><b>돈 바로 +${fmt(v)}</b><span>지금 지점 10분치</span></div><em>${on ? '📺' : `🪙${gp}`}</em></button></div><button class="btn ghost" id="mOk">닫기</button>`);
    $('#mOk').onclick = () => this.close();
    const give = k => { if (k === 'boost') { S.boostUntil = now() + 180000; this.toast('3분 동안 손님 2배!'); } else { g.earn(v); this.toast(`광고 보상 +${fmt(v)}`); } save(); this.progress(); };
    m.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k; this.close(); if (on) this.ad(k === 'boost' ? 'boost' : 'coins', () => k === 'coins' && give(k), 'boost2x', k === 'boost' ? '3분 동안 손님 2배' : `돈 +${fmt(v)}`); else this.gold('boost', () => give(k)); }); },
  /* 바람에 날려 온 시 한 장 (광고 자리 poem_fly · 2~3분마다 15초): 나타난 자리에 고정 · 15초 뒤 꼭 사라짐 (마루미 0.3.1 원칙) */
  poemFlyUi(g) { const el = $('#ofly'); if (!el) return; const t = g.t; this._pfT ??= t + 70;
    if (!this._pf && t > this._pfT && !g.deco && !$('#modal').firstChild && this.slotOk('poem_fly') && S.fg >= 3 && floorOfX(g.owner.pos.x) === g.view.f) { const o = g.owner; const fo = floorOfX(o.pos.x) * FDX; this._pf = { t0: t, x: fo + Math.max(-500, Math.min(400, o.pos.x - fo + (Math.random() < 0.5 ? -200 : 200))), z: Math.max(-250, Math.min(450, o.pos.z + 260)) };   /* 사장님 앞쪽(화면 가운데) · 나타난 자리에 고정 */ el.innerHTML = '<i>📜</i><b>바람에 날려 온 시 한 장</b>'; el.classList.add('on'); el.onclick = () => this.poemFlyOpen(); }
    if (this._pf) { if (t - this._pf.t0 > 15 || $('#modal').firstChild && !$('#pfm')) { this._pf = null; this._pfT = t + 120 + Math.random() * 60; el.classList.remove('on'); return; }
      const v = new THREE.Vector3(this._pf.x, 200, this._pf.z).project(this.app.cam), k = window.__k || 1; el.style.transform = `translate(${(v.x + 1) / 2 * innerWidth / k}px,${(1 - v.y) / 2 * innerHeight / k}px) translate(-50%,-50%)`; } },
  poemFlyOpen() { const g = this.app.game, el = $('#ofly'); el.classList.remove('on'); this._pf = null; this._pfT = g.t + 150; const v = Math.round(g.minuteValue() * 10);
    const m = this.modal(`<div id="pfm"></div><h2>📜 바람에 날려 온 시 한 장</h2><p class="sub">하나를 골라요 · 광고 1편</p><div class="uplist"><button class="upr pickr" data-k="rush"><i>👥</i><div><b>손님 두 배 · 3분</b></div><em>📺</em></button><button class="upr pickr" data-k="tip"><i>☕</i><div><b>정성 팁 2배 · 3분</b></div><em>📺</em></button><button class="upr pickr" data-k="coin"><i>💰</i><div><b>10분치 돈 +${fmt(v)}</b></div><em>📺</em></button></div><button class="btn ghost" id="mOk">그냥 둘게요</button>`);
    $('#mOk').onclick = () => this.close(); m.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k; this.close(); this.ad('poem', () => { if (k === 'rush') { S.boostUntil = now() + 180000; this.toast('3분 동안 손님 두 배!'); } else if (k === 'tip') { g.tipUntil = g.t + 180; S.boss.tipX = 1; this.toast('3분 동안 정성 팁 2배!'); } else { g.earn(v); this.toast(`+${fmt(v)}`); } g.addPoem(null, 3); save(); this.progress(); }, 'poem_fly', '시 한 장 보상'); }); },
  // ── 확장 지도 (시안 02): 위 카드 · 층을 쌓아 보는 3D · 아래 카드(공사 · 즉시 완성)
  expansion() { const g = this.app.game, B = g.B, st = ST(), done = B.stages.filter(s => g.stageOpen(s.i)).length, building = B.stages.find(s => st.build[s.i]), next = g.nextStage();
    const tiles = B.stages.map(s => `<i class="${g.stageOpen(s.i) ? 'ok' : st.build[s.i] ? 'bd' : s === next ? 'nx' : ''}" title="${s.name}">${STAGE_ICON[s.key] || '✨'}</i>`).join('');
    const seats0 = 5, seatsN = g.seats().length, mach0 = 3, machN = g.machines.length + (g.roasterG?.length || 1) - 1, cells = B.stages.filter(s => g.stageOpen(s.i)).reduce((n, s) => n + s.cells, 0);
    let card = ''; const left = building ? g.buildLeft(building.i) : 0, ig = instGold(left), adOk = building && left >= 60 && this.slotOk('finish'), gp = building ? this.goldOf('inst' + ig) : 0;
    if (building) card = `<b>${STAGE_ICON[building.key]} ${building.name} 공사 중</b><span>남은 공사 ${hms(left)} · 다 되면 ${this.stageGain(building)}</span><div class="btns">${adOk ? '<button class="btn dark" id="xAd">📺 광고 보고 즉시 완성</button>' : ''}${S.inst > 0 ? `<button class="btn dark" id="xTk">🎫 완성권 (${S.inst})</button>` : ''}${gp && left >= 10 ? `<button class="btn" id="xG">⚡ 즉시 완성 · 🪙${ig}</button>` : ''}</div>${!adOk && !gp && !S.inst ? '<small>장사는 그대로 · 기다리면 열려요</small>' : ''}`;
    else if (next) { const e = g.stageWhy(next); card = `<b>${STAGE_ICON[next.key]} 다음 · ${next.name}</b><span>${this.stageGain(next)}${next.build ? ` · 공사 ${hms(next.build)}` : ''}</span><div class="btns"><button class="btn ${e ? 'off' : ''}" id="xOpen">${e && e !== `돈이 모자라요 (${fmt(next.cost)} 필요)` ? e : `열기 · <i class="c"></i>${fmt(next.cost)}`}</button></div>`; }
    else { const bi = S.si + 1, e = STORES[bi] ? g.branchWhy(bi) : '7지점을 모두 열었어요'; card = `<b>🎉 ${STORES[S.si].name} 완성</b><span>${STORES[bi] ? `다음 지점 · ${STORES[bi].name}${STORES[bi].tmp ? ' (가칭)' : ''} — ${g.officeAt ? '사장실 계약 책상' : '지도'}에서 계약` : '전국의 감성커피!'}</span><div class="btns"><button class="btn" id="xMap">🗺️ 지도 열기</button></div>`; }
    const m = this.modal(`<div class="xtop"><div class="xh"><h2>${STORES[S.si].name} · 확장 지도</h2><button class="sx" id="xX">✕</button></div><p class="sub">지점 ${S.si + 1}/7 · 확장 ${done}/8단계 · Lv.${S.lv} · 감성 지수 ${fmt(g.score())}</p><div class="xtiles">${tiles}</div>
      <div class="xtabs"><button id="xStaff">👥 동료</button><button id="xBoss">💼 사장님</button></div></div>
      <div class="xmid"><div class="xbadge"><small>처음 가게 대비</small><b>바닥 ${(cells / 196).toFixed(1)}배</b><span>자리 ${seats0} → ${seatsN} · 머신 ${mach0} → ${machN}</span></div></div>
      <div class="xbot">${card}</div>`, 'exp', () => this.app.overview && this.app.overview(false));
    { const t = $('.modal.exp .xtop').getBoundingClientRect(), bt = $('.modal.exp .xbot').getBoundingClientRect(); this.app.overview && this.app.overview(true, { top: t.bottom + 6, bot: innerHeight - bt.top + 6 }); } this.expLabels();
    $('#xX').onclick = () => this.close(); $('#xStaff').onclick = () => { this.close(); this._nextParent = () => this.expansion(); this.crewRoom(true); }; $('#xBoss').onclick = () => { this.close(); this._nextParent = () => this.expansion(); this.bossRoom(true); };
    if ($('#xOpen')) $('#xOpen').onclick = () => { const e = g.openStage(next.i); if (e) return this.toast(e); sfx('build'); this.close(); this.expansion(); };
    if ($('#xMap')) $('#xMap').onclick = () => { this.close(); this.map(); };
    if ($('#xAd')) $('#xAd').onclick = () => { const id = building.i; this.ad('finish', () => { if (ST().build[id]) g.finishStage(id, 'ad'); this.close(); }, 'finish', `${building.name} 즉시 완성`); };
    if ($('#xTk')) $('#xTk').onclick = () => { if (S.inst <= 0) return; S.inst--; g.finishStage(building.i, 'ticket'); this.close(); };
    if ($('#xG')) $('#xG').onclick = () => { const id = building.i, now2 = instGold(g.buildLeft(id)); if (now2 !== ig) return this.expansion(); this.gold('inst' + ig, () => { if (ST().build[id]) g.finishStage(id, 'gold'); this.close(); }); }; },
  /* 층 쌓아 보기의 이름표 */
  expLabels() { const g = this.app.game, el = $('.modal.exp .xmid'); if (!el) return; const cam = this.app.cam, v = new THREE.Vector3(), k = window.__k || 1, R = el.getBoundingClientRect(); let html = '';
    for (const s of g.B.stages) { const a = g.area(s.ids[0]), b = areaBox(a), on = g.stageOpen(s.i), bd = ST().build[s.i]; if (!on && !bd && g.nextStage() !== s) continue;
      v.set((b.x0 + b.x1) / 2 - a.floor * FDX, a.floor * 820 + 120, (b.z0 + b.z1) / 2).project(cam); html += `<span class="xl ${bd ? 'bd' : on ? '' : 'nx'}" style="left:${((v.x + 1) / 2 * innerWidth - R.left) / k}px;top:${((1 - v.y) / 2 * innerHeight - R.top) / k}px">${s.name.split(' · ')[0]}${bd ? ' <em>공사 중</em>' : on ? '' : ' <em>다음</em>'}</span>`; }
    el.insertAdjacentHTML('beforeend', html); },
  // ── 지역 지도 (계획안 2-3): 한반도 · 지점 핀 · 체인 단계 · 지점 카드(진행 · 금고 · 가 보기) · 커피트럭
  map() { const g = this.app.game, opened = Object.keys(S.stores).length, chain = CHAIN.filter(c => opened >= c.n).pop() || CHAIN[0];
    const pins = STORES.map((s, i) => `<i class="pin ${i === S.si ? 'cur' : S.stores[i] ? 'on' : ''}" style="left:${s.map[0] * 100}%;top:${s.map[1] * 100}%" data-s="${i}">${i + 1}</i>`).join('');
    const cards = STORES.map((s, i) => { const has = !!S.stores[i], fr = g.progressFrac(i), e = has ? null : g.branchWhy(i), safe = has && i !== S.si ? g.safeOf(i) : 0, up = S.stores[i]?.idle?.up || 0;
      return `<div class="bcard ${i === S.si ? 'cur' : ''} ${!has && e ? 'lock' : ''}"><div class="bt"><b>${i + 1}. ${s.name}${s.tmp ? ' <u>가칭</u>' : ''}</b><small>${s.city} · 값 ×${s.mult}</small></div>${has ? `<div class="pb"><s style="width:${Math.round(fr * 100)}%"></s></div><span>진행 ${Math.round(fr * 100)}%${safe ? ` · 금고 <i class="c"></i>${fmt(safe)}` : ''} · 쉬는 동안 +${up * 10}%</span>` : `<span>${e || '계약할 수 있어요'}</span>`}
        <div class="btns">${i === S.si ? '<button class="btn sm off">지금 여기</button>' : has ? `<button class="btn sm" data-go="${i}">가기</button>` : `<button class="btn sm ${e ? 'off' : ''}" data-ct="${i}">${e && S.lv < s.lv ? `Lv.${s.lv}` : `계약 · <i class="c"></i>${fmt(BRANCHES[i - 1]?.next || 0)}`}</button>`}${has ? `<button class="btn sm ghost" data-up="${i}">수익 단계 ${up}/${IDLE.upMax}</button>` : ''}<button class="btn sm ghost" data-find="${i}">가 보기</button></div></div>`; }).join('');
    const tk = this.truckInfo();
    const m = this.modal(`<h2>🗺️ 감성커피 지도</h2><p class="sub">${chain.name} · 지점 ${opened}/7 · 「게임 속 매장은 실제와 달라요」</p><div class="kmap">${KOREA}${pins}</div>${tk}<div class="blist">${cards}</div><button class="btn ghost" id="mOk">닫기</button>`, 'mapm');
    $('#mOk').onclick = () => this.close();
    m.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const i = +b.dataset.go, safe = g.safeOf(i); this.close(); g.moveBranch(i); if (safe) { ST().safe = safe; } });
    m.querySelectorAll('[data-ct]').forEach(b => b.onclick = () => { const e = g.contract(+b.dataset.ct); if (e) return this.toast(e); this.close(); sfx('levelup'); });
    m.querySelectorAll('[data-find]').forEach(b => b.onclick = () => { track('gs_store', { b: +b.dataset.find }); window.open(BRAND.site, '_blank', 'noopener'); });
    m.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { this._nextParent = () => this.map(); this.idleUp(+b.dataset.up); });
    m.querySelectorAll('.pin').forEach(p => p.onclick = () => m.querySelectorAll('.bcard')[+p.dataset.s]?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    if ($('#tkGo')) $('#tkGo').onclick = () => this.truckStart(); },
  /* 지도 영구 단계: 광고 3편 = 1단계 (자리 idle_up 하루 2) · 🪙60 */
  idleUp(i) { const st = S.stores[i]; if (!st) return; const I = st.idle; if (I.up >= IDLE.upMax) return this.toast('최고 단계예요'); const on = this.slotOk('idle_up'), gp = this.goldOf('idle_up');
    const m = this.modal(`<h2>쉬는 동안 수익 +10%</h2><p class="sub">${STORES[i].name} · 지금 ${I.up}/${IDLE.upMax}단계 · 영구</p><div class="pb big"><s style="width:${I.ad / IDLE.upAds * 100}%"></s></div><p class="sm">광고 ${I.ad}/${IDLE.upAds}편 · 3편이면 한 단계</p><div class="btns">${on ? '<button class="btn" id="iuA">📺 광고 1편</button>' : ''}${gp ? `<button class="btn" id="iuG">🪙${gp} 바로 한 단계</button>` : ''}</div><button class="btn ghost" id="mOk">닫기</button>`);
    $('#mOk').onclick = () => this.close(); const up = () => { I.ad = 0; I.up = Math.min(IDLE.upMax, I.up + 1); this.toast(`쉬는 동안 수익 ${I.up}단계!`); save(true); };
    if ($('#iuA')) $('#iuA').onclick = () => { this.close(); this.ad('idle', () => { I.ad++; if (I.ad >= IDLE.upAds) up(); save(true); this.idleUp(i); }, 'idle_up', '쉬는 동안 수익 단계 (3편 = 1단계)'); };
    if ($('#iuG')) $('#iuG').onclick = () => this.gold('idle_up', () => { up(); this.close(); }); },
  // ── 방문형 방 (계획안 3-6 · 마루미 0.3.1: 할 일 하나 큰 카드 + 더 보기 · 설명 한 줄)
  room(v) { if (window.__bot || $('#modal').firstChild) return; if (v === 'crew') this.crewRoom(); else if (v === 'boss') this.bossRoom(); else if (v === 'store') this.storeRoom(); },
  sheet(title, line, big, more, cls = '') { const m = this.modal(`<div class="rsh"><h3>${title}</h3><span class="adn">📺 ${this.adLeft()}/${AD_DAY}</span><button class="sx" id="rX">✕</button></div><p class="sub">${line}</p>${big ? `<div class="bigc">${big}</div>` : ''}${more ? `<details class="more" ${this._open ? 'open' : ''}><summary>더 보기</summary><div class="uplist">${more}</div></details>` : ''}`, 'sheet room r' + cls); $('#rX').onclick = () => this.close(); m.querySelector('details')?.addEventListener('toggle', e => { this._open = e.target.open; }); return m; },
  crewRoom(fromHud) { const g = this.app.game, keys = Object.keys(STAFF), hireK = keys.find(k => !S.staff[k] && S.lv >= STAFF[k].lv && (!STAFF[k].kind || g.hasKind(STAFF[k].kind))), upK = keys.filter(k => g.upgradeCost(k)).sort((a, b) => g.upgradeCost(a) - g.upgradeCost(b))[0], ad = this.slotOk('crew_free'), gp = this.goldOf('free_lv');
    const row = k => { const d = STAFF[k], l = g.lvOf(k), lock = S.lv < d.lv || (d.kind && !g.hasKind(d.kind)), max = l >= STAFF_UP.max, c = l ? g.upgradeCost(k) : d.cost;
      return `<div class="upr staff ${lock ? 'lock' : ''}"><i class="av" style="background:#${d.body.toString(16).padStart(6, '0')}">${d.name.slice(-2, -1)}</i><div><b>${d.name}${l ? ` <em>${l}단계</em>` : ''}</b><span>${l ? d.up(l) : d.desc}</span></div><button class="btn sm ${lock || max || S.coins < c ? 'off' : ''}" ${l ? `data-u="${k}"` : `data-h="${k}"`}>${lock ? (S.lv < d.lv ? `Lv.${d.lv}` : '구역 필요') : max ? '최고' : `${l ? '↑ ' : ''}<i class="c"></i>${fmt(c)}`}</button></div>`; };
    const big = hireK ? `<i class="ic">👋</i><b>새 동료 · ${STAFF[hireK].name.split('· ')[1]}</b><span>${STAFF[hireK].desc.split(' · ')[0]}</span><button class="btn" data-h="${hireK}">함께하기 · <i class="c"></i>${fmt(STAFF[hireK].cost)}</button>`
      : upK ? `<i class="ic">⬆️</i><b>${STAFF[upK].name.split('· ')[1]} ${g.lvOf(upK) + 1}단계</b><span>${STAFF[upK].up(g.lvOf(upK) + 1)}</span><div class="btns"><button class="btn" data-u="${upK}"><i class="c"></i>${fmt(g.upgradeCost(upK))}</button>${ad ? `<button class="btn dark" data-fa="${upK}">📺 이번 단계 무료</button>` : gp ? `<button class="btn dark" data-fg="${upK}">🪙${gp} 바로</button>` : ''}</div>` : '<i class="ic">🌿</i><b>모두 최고 단계예요</b>';
    const aprons = APRONS.map(a => { const own = S.aprons[a.id] || (a.vip && vipOn()), cur = S.apron === a.id, need = a.ad ? `📺 ${Math.min(a.ad, S.apronAd[a.id] || 0)}/${a.ad}` : a.coins ? `<i class="c"></i>${fmt(a.coins)}` : a.gold ? (this.goldOf(a.id) ? `🪙${this.goldOf(a.id)}` : '시즌 패스') : a.vip ? 'VIP' : '';
      return `<button class="ap ${cur ? 'cur' : ''} ${own ? 'own' : ''}" data-ap="${a.id}"><i style="background:#${a.apron.toString(16).padStart(6, '0')}"></i><b>${a.name}</b><small>${cur ? '입는 중' : own ? '입기' : need}</small></button>`; }).join('');
    const m = this.sheet('👥 동료 쉼터', `동료 ${g.staffCount()}/${keys.length} · 잡일은 동료가, 사람 일과 정성은 사장님이`, big, keys.map(row).join('') + `<div class="aps">${aprons}</div>`, 'crew');
    const done = () => { this.progress(); this.crewRoom(fromHud); };
    m.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { const e = g.hire(b.dataset.h); if (e) return this.toast(e); sfx('reward'); done(); });
    m.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const e = g.upgradeStaff(b.dataset.u); if (e) return this.toast(e); done(); });
    m.querySelectorAll('[data-fa]').forEach(b => b.onclick = () => { const k = b.dataset.fa; this.close(); this.ad('crew', () => { g.upgradeStaff(k, true); this.crewRoom(fromHud); }, 'crew_free', `${STAFF[k].name.split('· ')[1]} 1단계 무료`); });
    m.querySelectorAll('[data-fg]').forEach(b => b.onclick = () => { const k = b.dataset.fg; this.gold('free_lv', () => { g.upgradeStaff(k, true); done(); }); });
    m.querySelectorAll('[data-ap]').forEach(b => b.onclick = () => this.apron(b.dataset.ap)); },
  apron(id) { const g = this.app.game, a = APRONS.find(x => x.id === id), own = S.aprons[id] || (a.vip && vipOn()); const wear = () => { S.apron = id; save(true); g.sc.remove(g.owner.P.g); const pos = g.owner.pos.clone(), mode = g.owner.mode; g.ownerInit(); g.owner.pos.copy(pos); g.owner.mode = mode; this.toast(`${a.name}!`); this.crewRoom(); };
    if (own) return wear(); if (a.ad) { if (!this.slotOk('outfit_ad')) return this.toast('오늘 앞치마 광고를 다 봤어요 · 내일 또 (쌓여요)'); return this.ad('outfit', () => { S.apronAd[id] = (S.apronAd[id] || 0) + 1; if (S.apronAd[id] >= a.ad) { S.aprons[id] = 1; wear(); } else { save(true); this.crewRoom(); } }, 'outfit_ad', `${a.name} (${(S.apronAd[id] || 0) + 1}/${a.ad})`); }
    if (a.coins) { if (S.coins < a.coins) return this.toast(`돈이 모자라요 (${fmt(a.coins)} 필요)`); S.coins -= a.coins; S.aprons[id] = 1; return wear(); }
    if (a.gold) { if (!this.goldOf(id)) return this.toast('시즌 패스 보상이나 원어데이 골드로 받을 수 있어요'); return this.gold(id, () => { S.aprons[id] = 1; wear(); }, id); }
    if (a.vip) return this.toast('감성 VIP 동안 입을 수 있어요'); },
  bossRoom(fromHud) { const g = this.app.game, st = ST(), safe = Math.round(st.safe || 0), bi = S.si + 1, ce = STORES[bi] ? g.branchWhy(bi) : null, ad = this.slotOk('boss_free'), gp = this.goldOf('free_lv');
    const up = BOSS_UP.map(u => { const l = S.boss[u.id] || 0, max = l >= u.max, c = bossCost(u, l); return `<div class="upr"><i>${u.icon}</i><div><b>${u.name} <em>${l}/${u.max}</em></b><span>${u.eff(l)}${max ? '' : ` → ${u.eff(l + 1)}`}</span></div><button class="btn sm ${max || S.coins < c ? 'off' : ''}" data-b="${u.id}">${max ? '최고' : `<i class="c"></i>${fmt(c)}`}</button></div>`; }).join('');
    const cheapest = BOSS_UP.filter(u => (S.boss[u.id] || 0) < u.max).sort((a, b) => bossCost(a, S.boss[a.id] || 0) - bossCost(b, S.boss[b.id] || 0))[0];
    const big = safe > 0 ? `<i class="ic">💰</i><b>금고 <i class="c"></i>${fmt(safe)}</b><span>쉬는 동안 지점장이 지킨 돈</span><div class="btns"><button class="btn" id="sf1">받기</button>${this.slotOk('offline2x') ? '<button class="btn dark" id="sf2">📺 ×2</button>' : this.goldOf('safe2x') ? `<button class="btn dark" id="sf3">🪙${this.goldOf('safe2x')} ×2</button>` : ''}</div>`
      : STORES[bi] && g.progressFrac() >= FINISHED ? `<i class="ic">✍️</i><b>지점 계약 · ${STORES[bi].name}${STORES[bi].tmp ? ' (가칭)' : ''}</b><span>${ce || '새 지점을 열 수 있어요'}</span><button class="btn ${ce ? 'off' : ''}" id="ct">계약 · <i class="c"></i>${fmt(BRANCHES[S.si].next)}</button>`
      : cheapest ? `<i class="ic">${cheapest.icon}</i><b>${cheapest.name} ${(S.boss[cheapest.id] || 0) + 1}단계</b><span>${cheapest.eff((S.boss[cheapest.id] || 0) + 1)}</span><div class="btns"><button class="btn" data-b="${cheapest.id}"><i class="c"></i>${fmt(bossCost(cheapest, S.boss[cheapest.id] || 0))}</button>${ad ? `<button class="btn dark" data-ba="${cheapest.id}">📺 이번 단계 무료</button>` : gp ? `<button class="btn dark" data-bg="${cheapest.id}">🪙${gp} 바로</button>` : ''}</div>` : '<i class="ic">🌿</i><b>사장님 강화를 모두 마쳤어요</b>';
    const m = this.sheet('💼 사장실', `${STORES[S.si].name} · 진행 ${Math.round(g.progressFrac() * 100)}% · ${g.officeAt ? '금고 · 계약 책상 · 지도' : '3층이 열리면 걸어와서 받아요'}`, big, up + '<div class="upr"><i>🗺️</i><div><b>지역 지도</b><span>지점 · 커피트럭 · 매장 찾기</span></div><button class="btn sm" id="bmap">열기</button></div>', 'boss');
    const take = k => { const v = Math.round(st.safe || 0); if (!v) return; st.safe = 0; g.earn(v * k); this.toast(`금고 +${fmt(v * k)}`); sfx('coin'); save(true); this.progress(); };
    if ($('#sf1')) $('#sf1').onclick = () => { take(1); this.close(); this.pauseAd('safe'); };
    if ($('#sf2')) $('#sf2').onclick = () => { this.close(); this.ad('offline', () => take(2), 'offline2x', '금고 ×2'); };
    if ($('#sf3')) $('#sf3').onclick = () => this.gold('safe2x', () => { take(2); this.close(); });
    if ($('#ct')) $('#ct').onclick = () => { const e = g.contract(bi); if (e) return this.toast(e); this.close(); };
    $('#bmap').onclick = () => { this._nextParent = () => this.bossRoom(fromHud); this.map(); };
    const lv = id => { S.boss[id] = (S.boss[id] || 0) + 1; sfx('unlock'); save(true); this.progress(); this.bossRoom(fromHud); };
    m.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { const u = BOSS_UP.find(x => x.id === b.dataset.b), l = S.boss[u.id] || 0, c = bossCost(u, l); if (l >= u.max) return; if (S.coins < c) return this.toast(`돈이 모자라요 (${fmt(c)} 필요)`); S.coins -= c; lv(u.id); });
    m.querySelectorAll('[data-ba]').forEach(b => b.onclick = () => { const id = b.dataset.ba; this.close(); this.ad('boss', () => lv(id), 'boss_free', '사장님 강화 1단계 무료'); });
    m.querySelectorAll('[data-bg]').forEach(b => b.onclick = () => { const id = b.dataset.bg; this.gold('free_lv', () => lv(id)); }); },
  /* 원두 창고: 오늘의 원두 선물 → VIP 상자 → 계절 패스 → 골드 상점 */
  storeRoom() { const g = this.app.game, giftOk = S.gift.day !== today(), v = Math.round(g.minuteValue() * 2), vbox = vipOn() && S.gift.vip !== today();
    const big = giftOk ? `<i class="ic">🎁</i><b>오늘의 원두 선물</b><span>원두 +40잔분 · 돈 +${fmt(v)}</span><div class="btns"><button class="btn" id="gf1">받기</button>${this.slotOk('gift2x') ? '<button class="btn dark" id="gf2">📺 ×2</button>' : ''}</div>`
      : vbox ? `<i class="ic">👑</i><b>VIP 원두 상자</b><span>장사 ${VIP.boxMin}분치</span><button class="btn" id="vb">받기</button>` : `<i class="ic">🍂</i><b>${SEASON.name}</b><span>시즌 단계 ${this.seasonLv()}/${SEASON.xp.length - 1} · 내린 잔으로 올라요</span><button class="btn" id="ps">패스 보기</button>`;
    const m = this.sheet('📦 원두 창고', '하루 한 번 선물 · VIP · 계절 패스 · 상점', big, '<div class="upr"><i>🍂</i><div><b>계절 메뉴 패스</b><span>무료 줄이 보상의 대부분</span></div><button class="btn sm" id="ps2">보기</button></div><div class="upr"><i>🛍</i><div><b>상점</b><span>VIP · 세트 · 앞치마 · 금고 꾸러미</span></div><button class="btn sm" id="sh2">보기</button></div>', 'store');
    const gift = k => { S.gift.day = today(); S.beans = Math.min(900, S.beans + 40 * k); g.earn(v * k); this.toast(`선물 +원두 ${40 * k} · +${fmt(v * k)}`); sfx('reward'); save(true); this.progress(); };
    if ($('#gf1')) $('#gf1').onclick = () => { gift(1); this.storeRoom(); };
    if ($('#gf2')) $('#gf2').onclick = () => { this.close(); this.ad('gift', () => gift(2), 'gift2x', '오늘의 원두 선물 ×2'); };
    if ($('#vb')) $('#vb').onclick = () => { S.gift.vip = today(); const w = g.earn(g.minuteValue() * VIP.boxMin); this.toast(`VIP 상자 +${fmt(w)}`); save(true); this.storeRoom(); };
    for (const id of ['ps', 'ps2']) if ($('#' + id)) $('#' + id).onclick = () => { this._nextParent = () => this.storeRoom(); this.seasonPass(); };
    $('#sh2').onclick = () => { this._nextParent = () => this.storeRoom(); this.goldShop(); }; },
  // ── 골드 상점 (계획안 5-4 · 서버 표에 있을 때만 버튼 · 원어데이 밖은 무료 길만 보임)
  goldShop() { const g = this.app.game, h = bm.info, list = []; const born = S.born || Date.now(), starterOk = Date.now() - born < 7 * 864e5 && !S.items.includes('starter');
    const row = (sku, icon, name, desc, free, extra = '') => { const gp = this.goldOf(sku); return `<div class="upr gold"><i>${icon}</i><div><b>${name}</b><span>${desc}</span><small>무료 길 · ${free}</small></div>${gp ? `<button class="btn sm" data-g="${sku}" ${extra}>🪙${gp}</button>` : '<button class="btn sm off">원어데이</button>'}</div>`; };
    if (starterOk) list.push(row('starter', '🎀', GOLD.starter.name, GOLD.starter.desc, GOLD.starter.free));
    list.push(row('vip7', '👑', GOLD.vip7.name, `모든 지점 수익 ×${VIP.mult} · 쉬는 동안 ${VIP.idleH}시간 · 매일 VIP 상자 · 광고 없이 바로 · 금빛 앞치마${vipOn() ? ` · 남은 ${Math.ceil((S.vipUntil - Date.now()) / 864e5)}일` : ''}`, GOLD.vip7.free));
    list.push(row('vip30', '👑', GOLD.vip30.name, `최대 ${VIP.maxDays}일까지 겹침 · 자동 결제 없음`, GOLD.vip30.free));
    for (const k of ['cash10', 'cash60', 'cash240']) list.push(row(k, '💰', GOLD[k].name, `지금 지점 ${GOLD[k].min}분치 돈 +${fmt(g.minuteValue() * GOLD[k].min)}`, GOLD[k].free));
    if (!S.items.includes('manager')) list.push(row('manager', '🧑‍💼', GOLD.manager.name, `모든 지점 쉬는 동안 +${IDLE.managerH}시간 · 순회 일감 반은 지점장이`, GOLD.manager.free));
    list.push(row('pass_s1', '🍂', GOLD.pass_s1.name, '골드 줄 보상 (앞치마 · 세트 · 완성권)', GOLD.pass_s1.free));
    for (const t of THEME_SETS) if (!S.items.includes(t.id)) list.push(row(t.id, t.icon, `계절 세트 · ${t.name}`, '바닥 · 벽 · 조명 바꾸기 (능력치 0)', '단골 시 액자 완성 · 시즌 무료 줄')); else list.push(`<div class="upr gold"><i>${t.icon}</i><div><b>계절 세트 · ${t.name}</b><span>${S.theme[S.si] === t.id ? '이 지점에 입혔어요' : '가진 세트 · 이 지점에 입히기'}</span></div><button class="btn sm" data-ts="${t.id}">${S.theme[S.si] === t.id ? '벗기기' : '입히기'}</button></div>`);
    if (!S.items.includes('pet')) list.push(row('pet', '🐈', GOLD.pet.name, '사장님을 따라다님 · 손님 쓰다듬기 (겉모습)', GOLD.pet.free));
    const m = this.modal(`<h2>🛍 상점</h2><p class="sub">${h.ok ? '원어데이 골드 · ♥(마음)은 팔지 않아요' : '원어데이 안에서 골드 상품을 볼 수 있어요 · 모두 무료로 얻는 길이 있어요'}</p><div class="uplist">${list.join('')}</div><button class="btn ghost" id="mOk">닫기</button>`);
    $('#mOk').onclick = () => this.close();
    m.querySelectorAll('[data-ts]').forEach(b => b.onclick = () => { const id = b.dataset.ts; S.theme[S.si] = S.theme[S.si] === id ? null : id; save(true); g.buildWorld(); g.rebuildGrid(); g.collectOcc(); this.goldShop(); });
    m.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const k = b.dataset.g; const fx = {
      starter: () => { g.earn(g.minuteValue() * 60); S.aprons.linen = 1; S.inst += 3; this.toast('오픈 기념 세트 · 앞치마 · 완성권 3장'); },
      vip7: () => this.vipAdd(7), vip30: () => this.vipAdd(30), manager: () => { this.toast('베테랑 지점장이 함께해요'); }, pass_s1: () => { S.season.paid = SEASON.id; this.toast('계절 패스 골드 줄이 열렸어요'); }, pet: () => { this.toast('귤이가 따라다녀요 🐈'); g.petOn && g.petOn(); },
    }[k] || (k.startsWith('cash') ? () => { const w = g.earn(g.minuteValue() * GOLD[k].min); this.toast(`금고 꾸러미 +${fmt(w)}`); } : k.startsWith('set_') ? () => { S.theme[S.si] = k; g.buildWorld(); g.rebuildGrid(); g.collectOcc(); this.toast('계절 세트를 입혔어요'); } : null);
      const item = ['starter', 'manager', 'pet', 'pass_s1'].includes(k) || k.startsWith('set_') ? k : null; if (k === 'vip7' || k === 'vip30') { const left = Math.max(0, (S.vipUntil || 0) - Date.now()) / 864e5; if (left + GOLD[k].days > VIP.maxDays) return this.toast(`VIP 는 최대 ${VIP.maxDays}일까지 겹쳐요`); }
      this.gold(k, () => { fx && fx(); this.goldShop(); }, item); }); },
  vipAdd(days) { const base = Math.max(Date.now(), S.vipUntil || 0); S.vipUntil = Math.min(Date.now() + VIP.maxDays * 864e5, base + days * 864e5); this.toast(`👑 감성 VIP ${days}일 · 남은 ${Math.ceil((S.vipUntil - Date.now()) / 864e5)}일`); },
  seasonLv() { if (S.season.id !== SEASON.id) S.season = { id: SEASON.id, xp: 0, got: {}, paid: '' }; let l = 0; for (let i = 0; i < SEASON.xp.length; i++) if (S.season.xp >= SEASON.xp[i]) l = i; return l; },
  seasonPass() { const g = this.app.game, lv = this.seasonLv(), paid = S.season.paid === SEASON.id, nm = r => r.coins ? `💰 ${r.coins}분치` : r.inst ? `🎫 완성권 ${r.inst}` : r.safe ? '💰 금고 꾸러미' : r.set ? `${THEME_SETS.find(t => t.id === r.set).icon} 세트` : r.apron ? `🧺 ${APRONS.find(a => a.id === r.apron).name}` : '';
    const rows = SEASON.free.map((f, i) => { const p = SEASON.paid[i], ok = lv >= i; return `<div class="ps ${ok ? 'ok' : ''}"><em>${i + 1}</em><button class="pf ${S.season.got['f' + i] ? 'got' : ''}" data-f="${i}" ${ok && !S.season.got['f' + i] ? '' : 'disabled'}>${nm(f)}</button><button class="pp ${S.season.got['p' + i] ? 'got' : ''} ${paid ? '' : 'lock'}" data-p="${i}" ${ok && paid && !S.season.got['p' + i] ? '' : 'disabled'}>${nm(p)}</button></div>`; }).join('');
    const m = this.modal(`<h2>🍂 ${SEASON.name}</h2><p class="sub">${SEASON.from.slice(5)} ~ ${SEASON.to.slice(5)} · 이번 시즌 내린 잔 ${fmt(S.season.xp)} · ${lv}단계 · 무료 줄이 보상의 대부분</p><div class="pshead"><span></span><b>무료</b><b>골드 줄${paid ? '' : ' 🔒'}</b></div><div class="pslist">${rows}</div><button class="btn ghost" id="mOk">닫기</button>`);
    $('#mOk').onclick = () => this.close();
    const give = r => { if (r.coins) { const w = g.earn(g.minuteValue() * r.coins); this.toast(`+${fmt(w)}`); } if (r.inst) { S.inst += r.inst; this.toast(`완성권 +${r.inst}`); } if (r.safe) { g.earn(g.minuteValue() * 10); } if (r.set && !S.items.includes(r.set)) { S.items.push(r.set); this.toast('계절 세트를 얻었어요 · 상점에서 입혀요'); } if (r.apron) { S.aprons[r.apron] = 1; this.toast('앞치마를 얻었어요 · 동료 쉼터 옷장에서'); } sfx('reward'); save(true); this.progress(); };
    m.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { const i = +b.dataset.f; if (S.season.got['f' + i] || lv < i) return; S.season.got['f' + i] = 1; give(SEASON.free[i]); this.seasonPass(); });
    m.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const i = +b.dataset.p; if (!paid || S.season.got['p' + i] || lv < i) return; S.season.got['p' + i] = 1; give(SEASON.paid[i]); this.seasonPass(); }); },
  // ── 커피트럭 (계획안 2-3 · Lv.15 · 영도 별관 차고): 주마다 출동지 · 3분 판 · 줄 선 손님에게 빠르게 내주기 · 하루 무료 1 + 광고 1 + 골드
  truckSpot() { const w = Math.floor((Date.now() / 864e5 + 3) / 7); return TRUCK.spots[w % TRUCK.spots.length]; },
  truckInfo() { const g = this.app.game, ok = S.lv >= TRUCK.lv && S.stores[0]?.open.includes(BRANCHES[0].stages.find(s => s.key === 'annex').i), sp = this.truckSpot(), t = S.truck; if (t.day !== today()) { t.day = today(); t.n = 0; t.ad = 0; }
    return `<div class="truck ${ok ? '' : 'lock'}"><i>🚚</i><div><b>커피트럭 · 이번 주 ${sp.icon} ${sp.name}</b><span>${ok ? `3분 · 오늘 무료 ${Math.max(0, TRUCK.free - t.n)}판${t.best ? ` · 최고 ${t.best}잔` : ''}` : `Lv.${TRUCK.lv} · 영도대교점 별관(차고)이 열리면`}</span></div>${ok ? '<button class="btn sm" id="tkGo">출동</button>' : ''}</div>`; },
  truckStart() { const t = S.truck; if (t.n < TRUCK.free) { t.n++; save(true); return this.truckGame(); } if (this.slotOk('event2x') && !t.ad) return this.ad('truck', () => { t.ad = 1; this.truckGame(); }, 'event2x', '커피트럭 한 판 더'); if (this.goldOf('truck')) return this.gold('truck', () => this.truckGame()); this.toast('오늘 트럭 판을 다 했어요 · 내일 또 출동해요'); },
  truckGame() { const g = this.app.game, sp = this.truckSpot(), Tsec = TRUCK.sec / (+(new URLSearchParams(location.search).get('speed')) || 1); this.close(); window.__truck = { score: 0 };
    const el = document.createElement('div'); el.className = 'tkgame'; el.innerHTML = `<div class="tkg"><div class="tkgh"><b>🚚 ${sp.icon} ${sp.name}</b><em id="tgT">3:00</em><span id="tgS">0잔</span><button class="sx" id="tgX">✕</button></div><div class="tkq" id="tgQ"></div><div class="tkb">${sp.menu.map(k => `<button data-m="${k}"><img src="${this.picOf(k)}"><b>${MENU[k].short}</b></button>`).join('')}</div><p class="sm">줄 선 손님의 주문을 보고 같은 잔을 눌러요 · 틀려도 괜찮아요</p></div>`; $('#app').append(el);
    const q = []; let left = Tsec, score = 0, combo = 0, fin = false; const add = () => { if (q.length < 5) q.push({ k: sp.menu[Math.floor(Math.random() * sp.menu.length)], t: 0 }); };
    const draw = () => { $('#tgQ').innerHTML = q.map((c, i) => `<div class="tkc ${i ? '' : 'first'}"><i>🙂</i><img src="${this.picOf(c.k)}"></div>`).join(''); $('#tgS').textContent = `${score}잔${combo > 2 ? ` · 연속 ${combo}` : ''}`; };
    for (let i = 0; i < 3; i++) add(); draw(); const t0 = performance.now();
    const tick = setInterval(() => { left = Tsec - (performance.now() - t0) / 1000; $('#tgT') && ($('#tgT').textContent = mmss(Math.max(0, Math.ceil(left)))); if (Math.random() < 0.5) add(); draw(); if (left <= 0) end(); }, 400);
    const unb = pushBack(() => { end(); return true; });
    const end = () => { if (fin) return; fin = true; clearInterval(tick); unb(); el.remove(); const v = Math.round(g.minuteValue() * 0.4 * score); g.earn(v); S.beans = Math.min(900, S.beans + score * 2); S.truck.best = Math.max(S.truck.best || 0, score); track('gs_truck', { at: sp.id, n: score }); save(true); this.progress();
      const m = this.modal(`<div class="lvup"><small>커피트럭 · ${sp.name}</small><b>${score}잔</b><p>+${fmt(v)} · 원두 +${score * 2}${score >= 25 ? ' · 지역 한정 꾸미기 조각!' : ''}</p></div><button class="btn" id="mOk">좋아요</button>${this.slotOk('event2x') && v ? '<button class="btn dark" id="tx2">📺 보상 ×2</button>' : ''}`, '', () => this.pauseAd('truck'));
      if (score >= 25) S.inv.wind = (S.inv.wind || 0) + 1; $('#mOk').onclick = () => this.close(); if ($('#tx2')) $('#tx2').onclick = () => { this.close(); this.ad('truck2', () => { g.earn(v); this.toast(`×2 +${fmt(v)}`); }, 'event2x', '트럭 보상 ×2'); }; window.__truck = { score, done: true }; };
    $('#tgX').onclick = () => end();
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { if (!q.length) return; if (q[0].k === b.dataset.m) { q.shift(); score++; combo++; sfx('coin', { vol: 0.4, rate: 1 + Math.min(combo, 8) * 0.05 }); } else { combo = 0; sfx('tap', { vol: 0.3 }); } window.__truck.score = score; add(); draw(); }); },
  picOf(k) { return pic(k) || ''; },
};
/* 한반도 (단순 윤곽 · 지도 창 배경) */
const KOREA = `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M44 3 L58 2 L66 8 L72 6 L76 14 L72 22 L74 30 L78 40 L80 52 L80 62 L77 72 L74 78 L66 80 L58 80 L50 82 L42 80 L36 74 L32 66 L30 56 L34 50 L30 44 L34 38 L30 30 L36 22 L40 14 Z" fill="#E8DFD0" stroke="#C8B89E" stroke-width=".8"/><ellipse cx="30" cy="95" rx="9" ry="3.5" fill="#E8DFD0" stroke="#C8B89E" stroke-width=".8"/></svg>`;
