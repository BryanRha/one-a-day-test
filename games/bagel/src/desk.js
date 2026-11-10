// 별채 책상 카드 창 (DESIGN 3장 · analysis 13-1 · 13-7 원리): 책상 앞에 0.3초 서면 아래에서 카드 3장 — 걸어 나가면 닫힘 · 지나가다 실수로 살 수 없음
//   크루룸 = 직원 뽑기 · 직원 걷기 · 들기 · 옷장 / 사장실 = 사장 걷기 · 들기 · 홍보 · 가격 · 금고 · 다음 지점 계약 / 창고 = 오늘의 선물 · VIP 상자 · 시즌 패스
//   카드마다 「📺 무료」(하루 상한 · 광고 바구니) · 「돈」 두 단추
import { UI } from './ui.js?v=0.99.20';
import { S, save, vipOn, today } from './state.js?v=0.99.20';
import { STAFF, DESK_UP, VIP, BRANCHES } from './data.js?v=0.99.20';
import { FEATURES } from './space.js?v=0.99.20';
import { sfx } from './audio.js?v=0.99.20';
import { pushBack } from './oad.js?v=0.99.20';

const $ = s => document.querySelector(s), fmt = n => Math.round(n).toLocaleString('en-US'), P = UI.prototype;
P.desk = function (room) { const el = $('#sheet'); if (!el) return; this._desk = room; if (!room) { el.hidden = true; el.innerHTML = ''; this._dbk && this._dbk(); this._dbk = null; return; }
  this.deskRefresh(); if (!this._dbk) this._dbk = pushBack(() => { this.app.game.pads.deskOpen = null; this.desk(null); return true; }); };
P.deskRefresh = function () { const room = this._desk, el = $('#sheet'); if (!room || !el) return; const g = this.app.game, pads = g.pads, R0 = g.sp.rooms[room];
  const cards = []; const card = (icon, name, desc, btns, cls = '') => `<div class="dcard ${cls}"><i>${icon}</i><b>${name}</b><span>${desc}</span><div class="dbtn">${btns}</div></div>`;
  const freeKey = room === 'crew' ? 'crew_free' : 'boss_free';
  if (room === 'crew' || room === 'boss') for (const { o } of pads.deskCards(room).slice(0, 3)) { const k = o.id.split('+')[0], lv = o.id.split('+')[1];
    const name = o.kind === 'hire' ? `${STAFF[o.id].name} 뽑기` : o.kind === 'next' ? `${BRANCHES[g.bi + 1]?.name || '다음 지점'} 계약` : `${DESK_UP[k].name} ${lv}단계`;
    const desc = o.kind === 'hire' ? STAFF[o.id].job : o.kind === 'next' ? '이 지점은 직원들이 계속 장사해요' : DESK_UP[k].desc, icon = o.kind === 'hire' ? '🧑‍🍳' : o.kind === 'next' ? '✍' : DESK_UP[k].icon;
    const can = S.coins >= o.cost, free = o.cost > 0 && o.kind !== 'next' && this.slotOk(freeKey), gp = !free && o.cost > 0 && o.kind !== 'next' && this.goldOf('free_lv');   /* 광고를 다 보면 같은 효과를 🪙 로 (AD_PLACES gold) */
    cards.push(card(icon, name, desc, `${free ? `<button class="btn sm ad" data-free="${o.id}">${vipOn() ? '👑' : '📺'} 무료</button>` : gp ? `<button class="btn sm gold" data-gfree="${o.id}">🪙${gp}</button>` : ''}<button class="btn sm ${can ? '' : 'off'}" data-buy="${o.id}">${o.cost ? `<i class="c"></i>${fmt(o.cost)}` : '무료'}</button>`, can ? 'can' : '')); }
  if (room === 'boss' && S.safe.v > 0) cards.unshift(card('🔐', '금고', `쉬는 동안 번 돈 +${fmt(S.safe.v)}`, '<button class="btn sm" data-safe>받기</button>', 'can'));
  if (room === 'store') { if (S.gift !== today()) cards.push(card('🎁', '오늘의 선물', `+${fmt(this.giftCoins())}`, `<button class="btn sm" data-gift>받기</button>${this.slotOk('gift2x') ? '<button class="btn sm ad" data-gift2>📺 ×2</button>' : ''}`, 'can'));
    if (vipOn() && S.vipBox !== today()) cards.push(card('👑', 'VIP 상자', `+${fmt(Math.round(this.perMin() * VIP.boxMin))}`, '<button class="btn sm" data-vbox>받기</button>', 'can'));
    const pr = this.passReady(); cards.push(card('🎟', '시즌 패스', pr ? `받을 보상 ${pr}개` : '베이글을 팔면 별이 쌓여요', '<button class="btn sm" data-pass>열기</button>', pr ? 'can' : ''));
    if (!cards.length) cards.push(card('📦', '오늘 배송 끝', '내일 또 와요', '')); }
  if (room === 'crew') cards.push(card('👕', '옷장', '직원 유니폼 갈아입히기', '<button class="btn sm ghost" data-wd>열기</button>', 'mini'));
  if (!cards.length) cards.push(card(R0.icon, '지금은 할 일이 없어요', '가게를 더 키우면 카드가 생겨요', ''));
  el.innerHTML = `<div class="sh"><h3>${R0.icon} ${R0.name}</h3><small>걸어 나가면 닫혀요</small></div><div class="dcards">${cards.slice(0, 4).join('')}</div>`; el.hidden = false;
  const find = id => pads.deskCards(room).map(x => x.o).find(o => o.id === id);
  el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const o = find(b.dataset.buy); if (!o || S.coins < o.cost) { sfx('card', { v: 2 }); return; } pads.buyDesk(o, false); this.deskRefresh(); this.progress(); });
  el.querySelectorAll('[data-free]').forEach(b => b.onclick = () => { const o = find(b.dataset.free); if (!o) return; this.ad('free', () => { pads.buyDesk(o, true); this.deskRefresh(); this.progress(); }, freeKey, `${o.kind === 'hire' ? STAFF[o.id].name + ' 뽑기' : DESK_UP[o.id.split('+')[0]]?.name || ''} 무료`); });
  el.querySelectorAll('[data-gfree]').forEach(b => b.onclick = () => { const o = find(b.dataset.gfree); if (!o) return; this.gold('free_lv', () => { pads.buyDesk(o, true); this.deskRefresh(); this.progress(); }); });
  el.querySelectorAll('[data-safe]').forEach(b => b.onclick = () => this.safe());
  el.querySelectorAll('[data-gift]').forEach(b => b.onclick = () => { const v = this.giftCoins(); S.gift = today(); S.coins += v; S.earned += v; save(true); sfx('coupon'); this.note(`🎁 선물 +${fmt(v)}`, { force: true }); this.deskRefresh(); this.progress(); });
  el.querySelectorAll('[data-gift2]').forEach(b => b.onclick = () => this.ad('gift', () => { const v = this.giftCoins() * 2; S.gift = today(); S.coins += v; S.earned += v; save(true); this.note(`🎁 선물 ×2 +${fmt(v)}`, { force: true }); this.deskRefresh(); this.progress(); }, 'gift2x', '오늘의 선물 ×2'));
  el.querySelectorAll('[data-vbox]').forEach(b => b.onclick = () => { const v = Math.round(this.perMin() * VIP.boxMin); S.vipBox = today(); S.coins += v; S.earned += v; save(true); sfx('coupon'); this.note(`👑 VIP 상자 +${fmt(v)}`, { force: true }); this.deskRefresh(); });
  el.querySelectorAll('[data-pass]').forEach(b => b.onclick = () => { this._stab = 'pass'; this.shop(); });
  el.querySelectorAll('[data-wd]').forEach(b => b.onclick = () => { this._dtab = 'staff'; this.decoShop(); }); };
