// 방문형 방 창 (크루룸 · 사장실 · 창고) · 금고 · 공사 · 풍선 · 골드 상품 · 시즌 패스 · 지점 완성 — UI 에 붙임
//   방 창: 방에 들어가면 아래에서 올라옴 (게임은 멈추지 않음 · 위쪽을 끌면 계속 걸음) · 나가면 닫힘 · 뒤로 = 닫기
//   모든 광고 자리는 바구니(하루 10) 하나를 나눠 씀 · 다 쓰면 같은 효과의 🪙 로 바뀌거나(1·2·4·6·10) 조용히 숨음(3·7·9)
import { UI } from './ui.js?v=0.99.17';
import { S, save, vipOn, has, today } from './state.js?v=0.99.17';
import { BRANCHES, STAFF, STAFF_JOB, ROOM_UP, ROOM_UP_MAX, OUTFITS_PRO, GOLD, VIP, IDLE, THEME_SETS, SEASON, COUPON, BRAND, STORE_MAP, AD_PLACES, AD_DAY } from './data.js?v=0.99.17';
import { ROOMS, hms, instGold } from './layout.js?v=0.99.17';
import { sfx } from './audio.js?v=0.99.17';
import { pushBack, track } from './oad.js?v=0.99.17';
import { bm } from './oad_bm.js?v=0.99.17';

const $ = s => document.querySelector(s), fmt = n => Math.round(n).toLocaleString('en-US'), P = UI.prototype;
const day = () => Math.floor(Date.now() / 864e5);
// ── 방 창
P.sheetOn = function () { const e = $('#sheet'); return !!e && !e.hidden; };
/* 방 창 (0.3.1 대표 「크루룸이 복잡함」): 처음엔 할 일 하나만 크게 · 설명은 한 줄 · 「더 보기」를 누르거나 첫 일을 하면 나머지가 짧은 줄로 · 바닥 칸도 같은 순서로 드러남 (S.roomStep) */
P.roomStep = function (room) { return (S.roomStep || {})[room] || 0; };
P.roomNext = function (room) { S.roomStep ||= {}; if (S.roomStep[room]) return; S.roomStep[room] = 1; save(); this.app.game.refreshPads(); };
/* 그 방의 첫 할 일 */
P.primary = function (room) { const g = this.app.game, lv = id => S.branch[S.bi]?.lv?.[id] || 0;
  if (room === 'crew') { const hp = g.pads.find(p => p.s.type === 'hire'); if (hp) return { k: 'hire', p: hp }; const u = ROOM_UP.crew.filter(u => lv(u.id) < ROOM_UP_MAX).sort((a, b) => g.lvCost(a.id) - g.lvCost(b.id))[0]; return u ? { k: 'lv', u } : null; }
  if (room === 'boss') { if (S.safe.v > 0) return { k: 'safe' }; if (g.pads.some(p => p.s.type === 'next')) return { k: 'next' }; const u = ROOM_UP.boss.find(u => u.id === 'price' && lv(u.id) < ROOM_UP_MAX) || ROOM_UP.boss.find(u => lv(u.id) < ROOM_UP_MAX); return u ? { k: 'lv', u } : null; }
  if (room === 'store') { if (S.gift !== today()) return { k: 'gift' }; if (vipOn() && S.vipBox !== today()) return { k: 'vbox' }; if (this.passReady()) return { k: 'pass' }; return null; } return null; };
P.roomSheet = function (room, refresh, was, byBack) {
  const el = $('#sheet'); if (!el) return;
  if (!room) { if (byBack) this._sheetClosed = this.app.game.room; el.hidden = true; el.innerHTML = ''; this._sheet = null; this._sbk && this._sbk(); this._sbk = null; if (!byBack) this._sheetClosed = null; return; }
  if (refresh && this._sheet !== room) return; if (!refresh && this._sheetClosed === room) return;   /* 뒤로로 닫은 방은 나갔다 들어올 때까지 다시 안 띄움 */
  this._sheet = room; el.hidden = false; const g = this.app.game, R = ROOMS[room], step = this.roomStep(room), pr = this.primary(room), lvOf = id => S.branch[S.bi]?.lv?.[id] || 0;
  const free = (pl, data) => this.slotOk(pl) ? `<button class="sbtn ad" ${data}>${vipOn() ? '👑' : '📺'} 무료</button>` : (this.goldOf('free_lv') ? `<button class="sbtn gold" ${data.replace('data-fa', 'data-fg')}>🪙${this.goldOf('free_lv')}</button>` : '');
  /* 큰 카드: 지금 할 일 하나 */
  let big = '';
  if (pr?.k === 'hire') big = card('🧑‍🍳', `${STAFF[pr.p.s.staff].name} 뽑기`, STAFF_JOB[pr.p.s.staff] || '', `<button class="bbtn cash ${S.coins < pr.p.s.cost - pr.p.paid ? 'off' : ''}" data-hire="${pr.p.s.id}"><i class="c"></i>${fmt(pr.p.s.cost - pr.p.paid)}</button>`);
  if (pr?.k === 'lv') { const c = g.lvCost(pr.u.id); big = card(pr.u.icon, `${pr.u.name} Lv ${lvOf(pr.u.id) + 1}`, pr.u.desc, `<button class="bbtn cash ${S.coins < c ? 'off' : ''}" data-lv="${pr.u.id}"><i class="c"></i>${fmt(c)}</button>${free(room + '_free', `data-fa="${pr.u.id}"`)}`); }
  if (pr?.k === 'safe') big = card('🔐', '금고 열기', `쉬는 동안 번 돈 +${fmt(S.safe.v)}`, '<button class="bbtn cash" data-safe="1">받기</button>');
  if (pr?.k === 'next') big = card('✍', `${BRANCHES[S.bi + 1].name} 계약`, '책상 앞 바닥 칸에 서면 계약해요', '');
  if (pr?.k === 'gift') big = card('🎁', '오늘의 선물', `+${fmt(this.giftCoins())}`, `<button class="bbtn cash" data-gift="1">받기</button>${this.slotOk('gift2x') ? `<button class="sbtn ad" data-gift2="1">📺 ×2</button>` : ''}`);
  if (pr?.k === 'vbox') big = card('👑', 'VIP 상자', `+${fmt(Math.round(this.perMin() * VIP.boxMin / 10) * 10)}`, '<button class="bbtn cash" data-vbox="1">받기</button>');
  if (pr?.k === 'pass') big = card('🎟', '시즌 패스 보상', `받을 보상 ${this.passReady()}개`, '<button class="bbtn cash" data-pass="1">보기</button>');
  if (!pr) big = card({ crew: '👥', boss: '💼', store: '📦' }[room], '지금은 할 일이 없어요', '가게를 더 열면 생겨요', '');
  /* 나머지: 짧은 줄 (더 보기 뒤) */
  let rows = '';
  if (step) { const row = (ic, nm, btns) => `<div class="srow s"><div class="ic">${ic}</div><div class="tx"><b>${nm}</b></div>${btns}</div>`;
    if (room === 'crew' || room === 'boss') for (const u of ROOM_UP[room]) { if (pr?.k === 'lv' && pr.u.id === u.id) continue; const lv = lvOf(u.id), max = lv >= ROOM_UP_MAX, c = g.lvCost(u.id); rows += row(u.icon, `${u.name} <em>Lv ${lv}</em>`, max ? '<span class="mx">MAX</span>' : `<button class="sbtn cash ${S.coins < c ? 'off' : ''}" data-lv="${u.id}">${fmt(c)}</button>${free(room + '_free', `data-fa="${u.id}"`)}`); }
    if (room === 'crew') { const pro = OUTFITS_PRO.find(o => !S.outfits.includes(o.id) && !has(o.id)), n = pro && S.outfitAd.id === pro.id ? S.outfitAd.n : 0; rows += row('👕', '옷장', `${pro && this.slotOk('outfit_ad') ? `<button class="sbtn ad" data-oa="${pro.id}">📺 ${n}/3</button>` : ''}<button class="sbtn ghost" data-wd="1">열기</button>`); }
    if (room === 'boss') { if (pr?.k !== 'safe') rows += row('🔐', `금고 <em>최대 ${this.idleCapH()}시간</em>`, ''); rows += row('📍', '매장 찾기', '<button class="sbtn ghost" data-store="1">지도</button>'); }
    if (room === 'store') { if (pr?.k !== 'gift' && S.gift === today()) rows += row('🎁', '오늘의 선물 <em>내일 또</em>', ''); if (pr?.k !== 'vbox') rows += row('👑', 'VIP 상자', vipOn() ? '' : '<button class="sbtn ghost" data-gs="1">VIP</button>'); if (pr?.k !== 'pass') rows += row('🎟', `시즌 패스 <em>★${this.passTier()}</em>`, '<button class="sbtn ghost" data-pass="1">보기</button>'); rows += row('⚡', `즉시 완성권 <em>${S.inst || 0}장</em>`, ''); } }
  el.innerHTML = `<div class="sh"><h3>${{ crew: '👥', boss: '💼', store: '📦' }[room]} ${R.name}</h3><span class="adn">📺 ${this.adLeft()}/${AD_DAY}</span><button class="sx" id="shx">✕</button></div><p>${{ crew: '직원을 뽑고 키워요', boss: '사장님을 키우고 금고를 열어요', store: '날마다 상자가 와요' }[room]} · 바닥 칸에 서도 돼요</p>${big}${step ? rows : '<button class="more" id="shm">다른 것도 보기 ›</button>'}`;
  function card(ic, t, d, btn) { return `<div class="bigcard"><div class="ic">${ic}</div><div class="tx"><b>${t}</b><span>${d}</span></div><div class="bb">${btn}</div></div>`; }
  if (!this._sbk) this._sbk = pushBack(() => { this.roomSheet(null, false, null, true); return true; });
  $('#shx').onclick = () => this.roomSheet(null, false, null, true); const m = $('#shm'); if (m) m.onclick = () => { this.roomNext(room); this.roomSheet(room, true); };
  const re = () => this.roomSheet(room, true), done = () => { this.roomNext(room); re(); };
  el.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { const id = b.dataset.lv, c = g.lvCost(id); if (b.classList.contains('off') || S.coins < c) return; S.coins -= c; g.levelUp(id); done(); });
  el.querySelectorAll('[data-fa]').forEach(b => b.onclick = () => { const id = b.dataset.fa; this.ad('lv', () => { g.levelUp(id, '광고 무료 단계'); done(); }, room + '_free', `${ROOM_UP[room].find(u => u.id === id).name} 1단계 무료`); });
  el.querySelectorAll('[data-fg]').forEach(b => b.onclick = () => { const id = b.dataset.fg; this.gold('free_lv', () => { g.levelUp(id, '🪙 1단계 바로'); done(); }); });
  el.querySelectorAll('[data-hire]').forEach(b => b.onclick = () => { const p = g.pads.find(q => q.s.id === b.dataset.hire); if (!p || b.classList.contains('off')) return; const need = p.s.cost - p.paid; if (S.coins < need) return; S.coins -= need; p.paid = p.s.cost; g.unlock(p); done(); });
  el.querySelectorAll('[data-oa]').forEach(b => b.onclick = () => { const o = OUTFITS_PRO.find(x => x.id === b.dataset.oa); this.ad('outfit', () => { if (S.outfitAd.id !== o.id) S.outfitAd = { id: o.id, n: 0 }; S.outfitAd.n++; if (S.outfitAd.n >= 3) { S.outfitAd = { id: '', n: 0 }; S.outfits.push(o.id); S.outfit = o.id; g.restaff(); this.toast(`🎉 ${o.name} 열림!`); } else this.toast(`📺 ${S.outfitAd.n}/3`); save(true); re(); }, 'outfit_ad', `${o.name} (광고 3편이면 열려요)`); });
  el.querySelectorAll('[data-wd]').forEach(b => b.onclick = () => { this._dtab = 'staff'; this.decoShop(); });
  el.querySelectorAll('[data-safe]').forEach(b => b.onclick = () => this.safe());
  el.querySelectorAll('[data-store]').forEach(b => b.onclick = () => { track('bg_store', { b: S.bi, at: 'boss' }); try { window.open(STORE_MAP[S.bi], '_blank', 'noopener'); } catch { /* */ } });
  el.querySelectorAll('[data-gift]').forEach(b => b.onclick = () => { const v = this.giftCoins(); S.gift = today(); S.coins += v; S.earned += v; save(true); sfx('reward'); this.toast(`🎁 +${fmt(v)}`); this.progress(); done(); });
  el.querySelectorAll('[data-gift2]').forEach(b => b.onclick = () => { const v = this.giftCoins() * 2; this.ad('gift', () => { S.gift = today(); S.coins += v; S.earned += v; this.toast(`🎁 ×2 +${fmt(v)}`); done(); }, 'gift2x', `오늘의 선물 ×2 (+${fmt(v)})`); });
  el.querySelectorAll('[data-vbox]').forEach(b => b.onclick = () => { const v = Math.round(this.perMin() * VIP.boxMin / 10) * 10; S.vipBox = today(); S.coins += v; S.earned += v; save(true); sfx('reward'); this.toast(`👑 +${fmt(v)}`); this.progress(); done(); });
  el.querySelectorAll('[data-gs]').forEach(b => b.onclick = () => { this._stab = 'gold'; this.shop(); });
  el.querySelectorAll('[data-pass]').forEach(b => b.onclick = () => { this._stab = 'pass'; this.shop(); });
};
/* 📺 무료 칸에 서면: 어느 강화를 무료로 올릴지 고르기 */
P.freeLevel = function (room) { const g = this.app.game, L0 = ROOM_UP[room].filter(u => (S.branch[S.bi]?.lv?.[u.id] || 0) < ROOM_UP_MAX), pl = room + '_free', ad = this.slotOk(pl), gp = this.goldOf('free_lv');
  if (!L0.length) { this.toast('모두 최고 단계예요!'); return; } if (!ad && !gp) { this.toast(this.adLeft() <= 0 ? '오늘 광고를 다 봤어요 · 내일 또 무료 단계!' : '오늘 무료 단계를 다 받았어요 · 내일 또!'); return; }
  const m = this.modal(`<h3>📺 무료 1단계</h3><p class="sm">${ad ? `광고 1편이면 하나를 무료로 올려요 · 오늘 ${this.placeLeft(pl)}번` : '오늘 광고는 다 봤어요 · 같은 효과를 🪙 로'}</p><div class="adcs">${L0.map(u => `<button class="adc" data-u="${u.id}"><i>${u.icon}</i><b>${u.name}</b><span>Lv ${(S.branch[S.bi]?.lv?.[u.id] || 0) + 1}</span><em class="${ad ? '' : 'g'}">${ad ? (vipOn() ? '👑 바로' : '📺 보기') : `🪙 ${gp}`}</em></button>`).join('')}</div><button class="btn ghost" id="mOk">괜찮아요</button>`);
  $('#mOk').onclick = () => this.close();
  m.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const id = b.dataset.u; if (ad) { this.close(); this.ad('lv', () => g.levelUp(id, '광고 무료 단계'), pl, `${ROOM_UP[room].find(u => u.id === id).name} 1단계 무료`); } else this.gold('free_lv', () => { this.close(); g.levelUp(id, '🪙 1단계 바로'); }); }); };
/* 금고: 쉬는 동안 번 돈 받기 · 📺 ×2 · 🪙 ×2 · 닫으면 1배 · 닫은 뒤 = 쉼표 */
P.safe = function () { const v = Math.round(+S.safe.v || 0); if (v <= 0) return; let got = false; const take = (k = 1) => { if (got) return; got = true; S.safe.v = 0; S.coins += v * k; S.earned += v * k; save(true); sfx('coin'); this.progress(); this.roomNext('boss'); this.roomSheet(this.app.game.room, true); setTimeout(() => this.pause('safe'), 400); };
  const adOk = this.slotOk('offline2x'), g = this.goldOf('safe2x');
  this.modal(`<h3>🔐 사장실 금고</h3><p>쉬는 동안 직원들이 번 돈이에요! <b>+${fmt(v)}</b></p><div class="btns"><button class="btn ghost" id="s1">받기</button>${adOk ? `<button class="btn" id="s2">${vipOn() ? '👑' : '📺'} 2배 받기</button>` : g ? `<button class="btn gold" id="s3">🪙${g} 2배</button>` : ''}</div><p class="sm">최대 ${this.idleCapH()}시간 쌓여요${vipOn() ? ' · VIP' : ` · VIP 는 ${VIP.idleH}시간`}</p>`, () => take(1));
  $('#s1').onclick = () => this.close();
  const s2 = $('#s2'); if (s2) s2.onclick = async () => { if (this._adBusy) return; got = true; this.close(); got = false; const ok = await this.ad('offline', () => { take(2); this.toast(`금고 ×2 +${fmt(v * 2)}`); }); if (!ok && !got) this.safe(); };
  const s3 = $('#s3'); if (s3) s3.onclick = async () => { if (this._adBusy) return; got = true; this.close(); got = false; const ok = await this.gold('safe2x', () => { take(2); this.toast(`금고 ×2 +${fmt(v * 2)}`); }); if (!ok && !got) this.safe(); }; };
/* 공사 완성 (큰 연출) · 닫은 뒤 = 쉼표 */
P.built = function (s) { const R = s.type === 'room' ? ROOMS[s.room] : null, name = R ? R.name : s.label, I = BRANCHES[S.bi].interior;
  const what = { crew: '직원을 뽑고, 직원 걷기 · 들기를 올리는 방이에요. 옷장에서 유니폼도 갈아입혀요.', boss: '사장님 걷기 · 들기 · 가격 · 팁을 올려요. 쉬는 동안 번 돈은 금고에 쌓여요.', store: '날마다 선물 상자 · VIP 상자 · 시즌 패스 보상이 배송돼요.', pickup: '미리 주문한 아파트 손님이 창구에서 봉투만 받아 가요. 줄이 두 갈래!', up2: '계단으로 올라가는 호수 뷰 2층! 손님이 창가에 앉아요.', drive: '송파대로 차들이 창구에서 포장해 가요. 라이더도 곧 와요.', terrace: '숲속 테라스 자리! 피크닉 바구니 손님이 바깥에 앉아요.' }[R?.feature ? s.room : s.room] || (s.type === 'retard' ? '밤새 숙성된 반죽이 쌓여요. 오븐에 넣으면 쫄깃 플레인!' : '새 설비가 생겼어요!');
  sfx('levelup'); this.modal(`<div class="bigdone"><b>🎉</b><h3>${name} 완성!</h3><p>${what}</p>${R && !R.visit ? `<small>${I.name}</small>` : ''}</div><button class="btn" id="mOk">${R && R.visit ? '들어가 볼게요' : '좋아요!'}</button>`, () => setTimeout(() => this.pause('build'), 300)); $('#mOk').onclick = () => this.close(); };
/* 공사 창: 남은 시간 · 📺 즉시 완성(1개) · ⚡ 즉시 완성권 · 🪙 즉시 완성(남은 시간 비례) · 기다리기 */
P.buildModal = function () { const g = this.app.game, bd = Object.entries(S.branch[S.bi]?.build || {}).sort((a, b) => a[1] - b[1]); if (!bd.length) return;
  const rows = bd.map(([id]) => { const s = BRANCHES[S.bi].slots.find(x => x.id === id), l = g.buildLeft(id), nm = s.type === 'room' ? ROOMS[s.room].name : s.label, gp = l >= 10 ? instGold(l) : 0, gok = gp && this.goldOf('inst' + gp);
    return `<div class="upr"><i>🔨</i><div><b>${nm}</b><span>${l < 10 ? '곧 끝나요!' : `남은 시간 ${hms(l)}`}</span></div><div class="bcol">${l >= 10 && this.slotOk('build_now') ? `<button class="btn sm ad" data-ba="${id}">📺 즉시</button>` : ''}${l >= 10 && S.inst > 0 ? `<button class="btn sm" data-bt="${id}">⚡ 완성권</button>` : ''}${gok ? `<button class="btn sm gold" data-bg="${id}" data-g="${gp}">⚡ 🪙${gp}</button>` : ''}</div></div>`; }).join('');
  const m = this.modal(`<h3>🔨 공사 중</h3><div class="uplist">${rows}</div><p class="sm">공사 중에도 장사 · 다른 칸 열기는 그대로예요 · 즉시 완성권 ${S.inst || 0}장 · 기다리면 무료</p><button class="btn ghost" id="mOk">기다릴게요</button>`); $('#mOk').onclick = () => this.close();
  const now = id => { this.close(); g.buildTick(id); };
  m.querySelectorAll('[data-ba]').forEach(b => b.onclick = () => this.ad('build', () => now(b.dataset.ba), 'build_now', '공사 즉시 완성'));
  m.querySelectorAll('[data-bt]').forEach(b => b.onclick = () => { if (!(S.inst > 0)) return; S.inst--; save(true); now(b.dataset.bt); });
  m.querySelectorAll('[data-bg]').forEach(b => b.onclick = () => { const id = b.dataset.bg, gp = instGold(g.buildLeft(id)); if (gp !== +b.dataset.g) { this.buildModal(); return; } this.gold('inst' + gp, () => now(id)); }); };
/* 베이글 풍선: 탭하면 광고 → 수익 2배 / 빨리 걷기 / 큰 쟁반 중 하나 */
P.balloon = function (on) { const b = $('#balloon'); if (b && !on) b.hidden = true; if (on && b) { const n = b.cloneNode(true); n.hidden = true; n.style.transform = ''; b.replaceWith(n); n.onclick = () => this.balloonTap(); } this._balOn = on; };   /* 풍선마다 새 단추 (앞 풍선 자리에서 튀어 오지 않게) · 보이는 건 frame 이 자리를 정한 뒤 */   /* 보이는 건 frame 이 자리를 정한 뒤 (첫 프레임에 구석에서 튀지 않게) */
P.balloonTap = function () { const g = this.app.game; if (!g.balloon) return; const k = ['boost', 'speed', 'tray'][Math.floor(Math.random() * 3)], nm = { boost: '3분 동안 수익 2배', speed: '3분 동안 빨리 걷기', tray: '3분 동안 큰 쟁반(+4개)' }[k];
  g.balloon.t = Math.max(g.balloon.t, 8); this.ad('balloon', () => { g.popBalloon(true); this.reward(k); }, 'balloon', `🥯 베이글 풍선: ${nm}`).then(ok => { if (!ok && g.balloon) g.balloon.t = Math.min(g.balloon.t, 3); }); };
/* 이벤트 끝 ×2 (단체 주문 · 인플루언서) — 6초 동안 작은 카드 */
P.event2x = function (v, what) { if (!this.slotOk('event2x') || v <= 0) return; const d = document.createElement('button'); d.className = 'ev2x'; d.innerHTML = `${what} · <b>${vipOn() ? '👑' : '📺'} 보너스 ×2</b> <small>+${fmt(v)}</small>`; $('#hud').append(d); const rm = () => d.remove(); setTimeout(rm, 6500);
  d.onclick = () => { rm(); this.ad('event', () => { S.coins += v; S.earned += v; this.toast(`보너스 +${fmt(v)}`); }, 'event2x', `${what} 보너스 ×2`); }; };
/* 지점 완성: 쿠폰 · 매장 찾기 · 공유 · 4호점 = 베테랑 점장 */
P.branchDone = function (i) { const B = BRANCHES[i], last = i === 3; if (last && !S.manager) { S.manager = true; save(true); }
  sfx('levelup'); this.modal(`<div class="bigdone"><b>🏆</b><h3>${B.name} 완성!</h3><p>모든 방과 설비를 열었어요. 정말 멋진 가게예요!${last ? '<br><b>🎖 베테랑 점장</b>이 합류했어요 · 바닥 돈 자동 수거 · 쉬는 동안 +2시간' : i < 3 ? `<br>사장실 계약 책상에서 <b>${BRANCHES[i + 1].name}</b>을 열 수 있어요` : ''}</p></div>
    <div class="btns"><button class="btn ghost" id="dStore">📍 이 매장 가 보기</button><button class="btn ghost" id="dShare">📣 자랑하기</button></div><button class="btn" id="mOk">계속 장사</button>`); $('#mOk').onclick = () => this.close();
  $('#dStore').onclick = () => { track('bg_store', { b: i, at: 'done' }); try { window.open(STORE_MAP[i], '_blank', 'noopener'); } catch { /* */ } };
  $('#dShare').onclick = async () => { const t = `마루미 베이글 하우스 · ${B.name} 다 열었어요! 🥯 ${BRAND.slogan}`; track('bg_share', { k: 'branch', b: i }); try { if (navigator.share) await navigator.share({ text: t }); else { await navigator.clipboard.writeText(t); this.toast('자랑 문구를 복사했어요'); } } catch { /* */ } }; };
/* 쉼표 순간 (지점 도착 · 큰 공사 완성 창 닫음 · 금고 수령 창 닫음) — 전면 광고는 앱이 그룹 C · 간격 · 소장 · 첫날을 보고 정함 · 물건을 들었거나 이벤트 · 보상형 직후면 안 부름 */
P.pause = function (why) { const g = this.app.game; if (vipOn() || g.pl.stack.length || g.ev || this._adBusy || Date.now() - (this._lastAd || 0) < 30000) return; bm.interstitial('pause_' + why).catch(() => {}); };
// ── 🪙 골드 상품 (상점 탭)
P.goldRows = function () { const row = (sku, icon, title, desc, free, btn) => { const p = this.goldOf(sku); if (!p && !btn) return ''; return `<div class="upr gold"><i>${icon}</i><div><b>${title}</b><span>${desc}</span><span class="free">무료 길: ${free}</span></div>${btn || `<button class="btn sm gold" data-gb="${sku}">🪙${p}</button>`}</div>`; };
  const vipLeft = Math.max(0, Math.ceil((S.vipUntil - Date.now()) / 864e5)), canVip = vipLeft + 7 <= VIP.maxDays;
  const starter = !has('starter') && Date.now() - (S.born || Date.now()) < GOLD.starter.days * 864e5;
  let h = '';
  if (starter) h += row('starter', '🎉', GOLD.starter.name + ' <em>처음 7일</em>', GOLD.starter.desc, GOLD.starter.free);
  h += row('vip7', '👑', GOLD.vip7.name + (vipLeft ? ` <em>남은 ${vipLeft}일</em>` : ''), `모든 지점 수익 ×${VIP.mult} (쉬는 동안 포함) · 쉬는 동안 ${VIP.idleH}시간 · 매일 VIP 상자 · 광고 없이 바로 · 자동 결제 없음`, GOLD.vip7.free, canVip ? null : '<button class="btn sm off">최대 28일</button>');
  h += row('vip30', '👑', GOLD.vip30.name, '위와 같음 · 30일 (겹쳐 사면 최대 28일까지만)', GOLD.vip30.free, vipLeft + 30 <= VIP.maxDays + 2 ? null : '<button class="btn sm off">최대 28일</button>');
  for (const k of ['cash10', 'cash60', 'cash240']) h += row(k, '💰', GOLD[k].name, `${BRANCHES[S.bi].name.split(' · ')[0]} ${GOLD[k].min >= 60 ? GOLD[k].min / 60 + '시간' : GOLD[k].min + '분'}치 돈 · +${fmt(this.perMin() * GOLD[k].min)}`, GOLD[k].free);
  const br = S.branch[S.bi] || {}; h += row('idle_up', '📈', `${GOLD.idle_up.name} · 이 지점`, `영구 · 지금 +${(br.idleUp || 0) * 10}% (최대 +50%)`, GOLD.idle_up.free, (br.idleUp || 0) >= IDLE.upMax ? '<button class="btn sm off">최고</button>' : null);
  if (!S.manager) h += row('manager', '🎖', GOLD.manager.name, '바닥 돈 자동 수거 · 쉬는 동안 +2시간 (모든 지점 · 영구)', GOLD.manager.free);
  for (const t of THEME_SETS) if (!has(t.id) && THEME_SETS.indexOf(t) >= (S.setsFree || 0)) h += row(t.id, t.icon, `테마 세트 · ${t.name}`, '지점 바닥 · 벽 · 장식 (능력치 0)', '단골 ♥5 · 시즌 무료 줄');
  for (const o of OUTFITS_PRO) if (!S.outfits.includes(o.id) && !has(o.id)) h += row(o.id, o.icon, `유니폼 · ${o.name}`, `${o.desc} (능력치 0)`, '광고 3편');
  if (!has('pass_s1')) h += row('pass_s1', '🎟', GOLD.pass_s1.name, `골드 줄 보상: 테마 세트 2 · 유니폼 2 · 즉시 완성권 · 돈 꾸러미 (${SEASON.to.slice(5).replace('-', '/')}까지)`, GOLD.pass_s1.free);
  return h || '<p class="sm">지금 살 수 있는 골드 상품이 없어요</p>'; };
P.bindGold = function (md) { md.querySelectorAll('[data-gb]').forEach(b => b.onclick = () => { const k = b.dataset.gb, g = this.app.game, done = () => { this.shop(); };
  const item = ['starter', 'manager', 'pass_s1', ...THEME_SETS.map(t => t.id), ...OUTFITS_PRO.map(o => o.id)].includes(k) ? k : null;
  this.gold(k, () => {
    if (k === 'starter') { const v = Math.round(this.perMin() * 60); S.coins += v; S.inst = (S.inst || 0) + 3; if (!S.outfits.includes('orange')) S.outfits.push('orange'); this.toast(`🎉 오픈 축하! +${fmt(v)} · 주황 유니폼 · 즉시 완성권 3장`); }
    if (k === 'vip7' || k === 'vip30') { const d = k === 'vip7' ? 7 : 30; S.vipUntil = Math.min(Math.max(S.vipUntil || 0, Date.now()) + d * 864e5, Date.now() + VIP.maxDays * 864e5); this.toast(`👑 마루미 VIP! ${Math.ceil((S.vipUntil - Date.now()) / 864e5)}일 남음`); }
    if (k.startsWith('cash')) { const v = Math.round(this.perMin() * GOLD[k].min); S.coins += v; S.earned += v; this.toast(`💰 +${fmt(v)}`); }
    if (k === 'idle_up') { const br = (S.branch[S.bi] ||= { unl: [], staff: [], paid: {}, build: {} }); br.idleUp = Math.min(IDLE.upMax, (br.idleUp || 0) + 1); this.toast(`📈 쉬는 동안 수익 +${br.idleUp * 10}% (영구)`); }
    if (k === 'manager') { S.manager = true; this.toast('🎖 베테랑 점장이 합류했어요!'); }
    if (THEME_SETS.some(t => t.id === k)) { S.theme[S.bi] = k; g.redraw(); this.toast('테마를 바꿨어요 · 꾸미기 › 테마에서 지점마다'); }
    if (OUTFITS_PRO.some(o => o.id === k)) { S.outfits.push(k); S.outfit = k; g.restaff(); this.toast('직원들이 새 유니폼을 입었어요'); }
    if (k === 'pass_s1') this.toast('🎟 시즌 패스 골드 줄이 열렸어요!');
    done(); }, item); }); };
// ── 시즌 패스 (무료 줄이 보상의 대부분 · 골드 줄 = 🪙500)
P.passTier = function () { const xp = S.pass.id === SEASON.id ? S.pass.xp : 0; return SEASON.xp.filter(x => xp >= x).length; };
P.passReady = function () { const t = this.passTier(), P0 = S.pass.id === SEASON.id ? S.pass : { free: [], paid: [] }; let n = 0; for (let i = 0; i < t; i++) { if (!P0.free.includes(i)) n++; if (has('pass_s1') && !P0.paid.includes(i)) n++; } return n; };
const rwTxt = r => r.coins ? `💰 ${r.coins}분치` : r.inst ? `⚡ 완성권 ${r.inst}` : r.safe ? '🔐 금고 꾸러미' : r.set ? `🎨 ${THEME_SETS.find(t => t.id === r.set).name}` : r.outfit ? `👕 ${OUTFITS_PRO.find(o => o.id === r.outfit).name}` : '';
P.passRows = function () { if (S.pass.id !== SEASON.id) S.pass = { id: SEASON.id, xp: 0, free: [], paid: [] }; const t = this.passTier(), own = has('pass_s1');
  return `<div class="passhd">★${t} · ${fmt(S.pass.xp)} / ${fmt(SEASON.xp[Math.min(t, SEASON.xp.length - 1)])}${t < SEASON.xp.length ? ` · 다음 ★까지 ${fmt(SEASON.xp[t] - S.pass.xp)}개` : ' · 최고!'}</div>` + SEASON.xp.map((x, i) => { const ok = t > i, fG = S.pass.free.includes(i), pG = S.pass.paid.includes(i);
    return `<div class="prow ${ok ? 'ok' : ''}"><em>★${i + 1}</em><button class="pc ${ok && !fG ? 'can' : ''} ${fG ? 'got' : ''}" data-pf="${i}">${rwTxt(SEASON.free[i])}${fG ? ' ✓' : ''}</button><button class="pc gold ${own && ok && !pG ? 'can' : ''} ${pG ? 'got' : ''} ${own ? '' : 'lock'}" data-pp="${i}">${own ? '' : '🔒 '}${rwTxt(SEASON.paid[i])}${pG ? ' ✓' : ''}</button></div>`; }).join('')
    + (own ? '' : this.goldOf('pass_s1') ? `<button class="btn gold" data-gb="pass_s1" style="width:100%;margin-top:6px">🪙${this.goldOf('pass_s1')} 골드 줄 열기</button>` : ''); };
P.bindPass = function (md) { const give = r => { const g = this.app.game; if (r.coins) { const v = Math.round(this.perMin() * r.coins); S.coins += v; S.earned += v; this.toast(`💰 +${fmt(v)}`); } if (r.inst) { S.inst = (S.inst || 0) + r.inst; this.toast(`⚡ 즉시 완성권 +${r.inst}`); } if (r.safe) { const v = Math.round(this.perMin() * 10); S.coins += v; this.toast(`🔐 +${fmt(v)}`); }
    if (r.set && !S.items.includes(r.set)) { S.items.push(r.set); this.toast(`🎨 ${THEME_SETS.find(t => t.id === r.set).name} 테마!`); } if (r.outfit && !S.outfits.includes(r.outfit)) { S.outfits.push(r.outfit); this.toast(`👕 ${OUTFITS_PRO.find(o => o.id === r.outfit).name}!`); } sfx('reward'); };
  md.querySelectorAll('[data-pf]').forEach(b => b.onclick = () => { const i = +b.dataset.pf; if (this.passTier() <= i || S.pass.free.includes(i)) return; S.pass.free.push(i); give(SEASON.free[i]); save(true); this.shop(); });
  md.querySelectorAll('[data-pp]').forEach(b => b.onclick = () => { const i = +b.dataset.pp; if (!has('pass_s1')) { this.toast('골드 줄은 시즌 패스로 열려요'); return; } if (this.passTier() <= i || S.pass.paid.includes(i)) return; S.pass.paid.push(i); give(SEASON.paid[i]); save(true); this.shop(); }); };
