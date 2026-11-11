// 마루미 지도 (DESIGN 10장 · 시안 mock_map.html): 송파 · 강동 동네 길 하나에 실제 4지점 · 매장 카드(실제 사진 · 주소 · 시그니처 메뉴 2 · 게임 특색 · 열리는 조건)
//   「📍 매장 가 보기」(지도 앱 · bg_store) · 「🎟 열면 받는 쿠폰」(의뢰사 확인 전 시험용) · 광고판 = 원어데이 교차 홍보 · 다음 동네 · TOKYO 자리
import { UI } from './ui.js?v=0.99.22';
import { S, save } from './state.js?v=0.99.22';
import { BRANCHES, BRANCH_INFO, BRANCH_MENU, STORE_MAP, IDLE } from './data.js?v=0.99.22';
import { SPACES, FEATURES } from './space.js?v=0.99.22';
import { sfx, music, BGM } from './audio.js?v=0.99.22';
import { pushBack, track } from './oad.js?v=0.99.22';

const $ = s => document.querySelector(s), fmt = n => Math.round(n).toLocaleString('en-US'), P = UI.prototype;
const SPOT = [[96, 270], [203, 398], [52, 500], [262, 560]];   /* 지점 자리 (390×844 기준) */
const prog = i => { const br = S.branch[i]; if (!br) return 0; const O = SPACES[i].order.filter(o => o.kind !== 'next'); return O.filter(o => br.own.includes(o.id)).length / O.length; };
function mini(i, open) { const c = open ? ['#FFF6EA', '#FF6720'] : ['#E2DED8', '#D3CEC6'];
  if (i === 0) return `<rect x="0" y="16" width="64" height="38" rx="6" fill="${c[0]}" stroke="#E8D3B8"/><path d="M-4,18 L68,18 L60,4 L4,4 Z" fill="${c[1]}"/><rect x="22" y="32" width="20" height="22" rx="3" fill="${open ? '#C08A5A' : '#B9AE9E'}"/><rect x="6" y="28" width="12" height="10" rx="2" fill="#F4F0E8"/><rect x="46" y="28" width="12" height="10" rx="2" fill="#F4F0E8"/>`;
  if (i === 1) return `<rect x="0" y="10" width="70" height="52" rx="6" fill="${open ? '#FFF6EA' : '#E9E4DC'}" stroke="#CFC6B8"/><path d="M-4,34 L74,34 L66,24 L4,24 Z" fill="${open ? '#FF6720' : '#E7B79A'}"/><rect x="26" y="40" width="18" height="22" rx="3" fill="#B9AE9E"/><rect x="8" y="14" width="12" height="9" rx="2" fill="#F4F0E8"/><rect x="50" y="14" width="12" height="9" rx="2" fill="#F4F0E8"/>`;
  if (i === 2) return `<rect x="0" y="8" width="62" height="40" rx="5" fill="${open ? '#FBFBFA' : '#E2DED8'}" stroke="#CFC9C0"/><rect x="0" y="8" width="62" height="12" rx="5" fill="${open ? '#FF6720' : '#D3CEC6'}"/><rect x="10" y="24" width="42" height="14" rx="2" fill="#EEF2F3"/>`;
  return `<rect x="0" y="8" width="60" height="40" rx="5" fill="${open ? '#E8F0E0' : '#E2DED8'}" stroke="#CFC9C0"/><path d="M-4,10 L64,10 L30,-8 Z" fill="${open ? '#B98A5A' : '#D3CEC6'}"/><circle cx="70" cy="34" r="12" fill="#C9D9B6"/>`; }
P.map = function (sel = S.bi) {
  let m = $('#mapv'); if (!m) { m = document.createElement('div'); m.id = 'mapv'; m.className = 'mapv'; $('#app').append(m); }
  const open = i => i <= (S.maxBi || 0), W = 390, H = 844;
  const stores = BRANCHES.map((B, i) => { const [x, y] = SPOT[i], o = open(i), here = i === S.bi, p = Math.round(prog(i) * 100);
    return `<g class="st" data-i="${i}" transform="translate(${x - 32},${y - 34})" filter="url(#sh)" opacity="${o ? 1 : 0.85}">${mini(i, o)}</g>
      ${here ? `<g transform="translate(${x},${y - 40})"><path d="M0,0 C-14,0 -18,-20 0,-30 C18,-20 14,0 0,0 Z" fill="#FF6720"/><circle cx="0" cy="-18" r="5" fill="#fff"/></g><g transform="translate(${x + 18},${y - 72})"><rect width="56" height="20" rx="10" fill="#FF6720"/><text x="28" y="14" text-anchor="middle" font-size="10" font-weight="900" fill="#fff">지금 여기</text></g>` : ''}
      <g transform="translate(${Math.max(6, Math.min(W - 128, x - 61))},${y + 26})"><rect width="122" height="22" rx="11" fill="${o ? '#3A2414' : 'rgba(255,255,255,.8)'}"/><text x="61" y="15" text-anchor="middle" font-size="11" font-weight="900" fill="${o ? '#fff' : '#9A8E80'}">${o ? '' : '🔒 '}${B.name.replace(/점$/, '').replace(' · ', ' ')}${o ? ` ${p >= 100 ? '★' : ''}${p}%` : ''}</text></g>
      ${i === sel ? `<circle cx="${x}" cy="${y - 4}" r="52" fill="none" stroke="#FF6720" stroke-width="3" stroke-dasharray="7 6"/>` : ''}`; }).join('');
  const svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" font-family="P, sans-serif"><defs><filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="0" flood-color="#C9AE8A"/></filter><pattern id="park" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#CFE2B8"/><circle cx="4" cy="4" r="2.2" fill="#B9D59E"/><circle cx="11" cy="10" r="2" fill="#B9D59E"/></pattern></defs>
    <rect width="${W}" height="${H}" fill="#F3EAD9"/><path d="M0,96 C90,120 200,70 390,110 L390,170 C250,140 120,190 0,160 Z" fill="#BFDDEB"/><text x="300" y="138" font-size="13" font-weight="900" fill="#8DB9CF" letter-spacing="3">한강</text>
    <path d="M0,160 C120,190 250,140 390,170 L390,430 L0,470 Z" fill="#F6E7D6"/><path d="M0,470 L390,430 L390,844 L0,844 Z" fill="#EFE6D2"/>
    <text x="22" y="236" font-size="30" font-weight="900" fill="#EDD6BE" letter-spacing="2">송파 · 잠실</text><text x="168" y="468" font-size="22" font-weight="900" fill="#E3D8C0" letter-spacing="2">강동 · 둔촌</text>
    <path d="M150,300 C175,282 222,286 236,302 C246,316 228,332 200,330 C180,328 176,340 160,338 C138,334 132,312 150,300 Z" fill="#BFDDEB" stroke="#A9CFE0" stroke-width="2"/><text x="190" y="314" font-size="10" font-weight="900" fill="#6E9DB3" text-anchor="middle">석촌호수</text>
    <g fill="#F6C9D6"><circle cx="142" cy="292" r="8"/><circle cx="246" cy="296" r="7"/><circle cx="238" cy="336" r="8"/><circle cx="130" cy="324" r="7"/><circle cx="168" cy="346" r="6"/></g>
    <g transform="translate(262,186)"><path d="M14,92 L20,10 L24,0 L28,10 L34,92 Z" fill="#D9CDBE"/><rect x="8" y="88" width="32" height="8" rx="2" fill="#CDBFAE"/></g>
    <path d="M250,580 C290,570 360,575 380,600 L390,612 L230,612 C220,600 230,588 250,580 Z" fill="url(#park)"/><text x="330" y="600" font-size="11" font-weight="900" fill="#6E8F57" text-anchor="middle">공원 숲</text>
    <g fill="#E6D9C6"><rect x="40" y="258" width="22" height="40" rx="2"/><rect x="14" y="248" width="22" height="50" rx="2"/></g>
    <path d="M96,282 C110,340 170,350 205,385 C240,430 130,440 85,495 C55,540 160,585 252,566" fill="none" stroke="#E2D2BC" stroke-width="30" stroke-linecap="round"/>
    <path d="M96,282 C110,340 170,350 205,385 C240,430 130,440 85,495 C55,540 160,585 252,566" fill="none" stroke="#FFF7EA" stroke-width="3" stroke-dasharray="10 9" stroke-linecap="round"/>
    <path d="M252,566 C300,556 330,520 336,486" fill="none" stroke="#E2D2BC" stroke-width="16" stroke-dasharray="6 8" stroke-linecap="round"/><path d="M120,236 C150,200 190,160 230,136" fill="none" stroke="#E2D2BC" stroke-width="12" stroke-dasharray="6 8" stroke-linecap="round"/>
    <g class="adboard" transform="translate(276,286)" filter="url(#sh)"><rect width="100" height="58" rx="10" fill="#2D3B57"/><rect x="5" y="5" width="90" height="48" rx="7" fill="#3E5A8A"/><text x="50" y="25" text-anchor="middle" font-size="10" font-weight="900" fill="#FFE27A">원어데이 추천</text><text x="50" y="42" text-anchor="middle" font-size="12" font-weight="900" fill="#fff">웨일 테일 🐋</text><rect x="44" y="58" width="12" height="22" fill="#2D3B57"/></g>
    <g transform="translate(298,452)"><rect width="78" height="30" rx="10" fill="#fff" stroke="#D9C7AE" stroke-dasharray="4 3"/><text x="39" y="13" text-anchor="middle" font-size="9" font-weight="900" fill="#A08A70">다음 동네</text><text x="39" y="24" text-anchor="middle" font-size="9" font-weight="800" fill="#B9A68E">준비 중</text></g>
    <g transform="translate(200,100)"><rect width="92" height="34" rx="10" fill="#fff" stroke="#D9C7AE" stroke-dasharray="4 3"/><text x="46" y="15" text-anchor="middle" font-size="10" font-weight="900" fill="#A08A70">✈ TOKYO 요요기</text><text x="46" y="27" text-anchor="middle" font-size="9" font-weight="800" fill="#B9A68E">해외 매장 · 예정</text></g>
    ${stores}</svg>`;
  const B = BRANCHES[sel], o = open(sel), p = Math.round(prog(sel) * 100), prevP = sel ? Math.round(prog(sel - 1) * 100) : 100, menu = BRANCH_MENU[sel], idle = this.idleOf ? this.idleOf(sel) : 0;
  const cond = o ? (sel === S.bi ? `🏪 지금 여기 · 진행 ${p}%` : `🏪 열림 · 진행 ${p}%`) : `🔒 ${BRANCHES[sel - 1].name.split(' · ')[0]} 90% + 계약 ${fmt(SPACES[sel - 1].order.find(x => x.kind === 'next').cost)}`;
  const coupons = (S.coupons || []).length;
  m.innerHTML = `${svg}<div class="mtop"><button class="mback2" id="mpBack">←</button><div class="mtitle"><b>마루미 지도 · 송파 · 강동</b><span>내 매장 ${(S.maxBi || 0) + 1}/4 · 쿠폰 ${coupons}장</span><div class="mdots">${BRANCHES.map((_, i) => `<i class="${open(i) ? 'on' : ''}"></i>`).join('')}</div></div></div>
    <div class="mcard"><div class="row"><div class="ph" style="background-image:url(assets/brand/${B.photo}.jpg)"><em>실제 매장</em></div><div class="tx"><h3>${B.name}</h3><div class="addr">${BRANCH_INFO[sel]}</div><div class="sig"><span>${menu.cream.name}</span><span>${menu.coffee.name}</span><span>게임 특색: ${FEATURES[SPACES[sel].feat].name}</span></div></div></div>
    <div class="cond">${cond}<div class="bar"><div style="width:${o ? p : prevP}%"></div></div>${o ? p : prevP}%</div>
    ${o && sel !== S.bi ? `<div class="cond">📈 쉬는 동안 수익 +${(S.branch[sel]?.idleUp || 0) * 10}%${(S.branch[sel]?.idleUp || 0) < IDLE.upMax ? `${this.slotOk('idle_up') ? ` <button class="mini ad" id="mpIu">📺 ${S.branch[sel]?.idleAd || 0}/${IDLE.upAds}</button>` : ''}${this.goldOf('idle_up') ? ` <button class="mini gold" id="mpIg">🪙${this.goldOf('idle_up')}</button>` : ''}` : ' · 최고'}${idle > 0 ? ` <button class="mini" id="mpCol">💰 +${fmt(idle)} 받기</button>` : ''}</div>` : ''}
    <div class="mbtns"><button class="b1" id="mpStore">📍 매장 가 보기</button>${o && sel !== S.bi ? `<button class="b3" id="mpGo">가기 ›${idle > 0 ? ` +${fmt(idle)}` : ''}</button>` : `<button class="b2" id="mpCoupon">🎟 열면 받는 쿠폰 (시험용)</button>`}</div></div>`;
  m.hidden = false; music('bgm_map'); if (!this._mpbk) this._mpbk = pushBack(() => { this.mapClose(); return true; });
  $('#mpBack').onclick = () => this.mapClose();
  m.querySelectorAll('.st').forEach(g => g.onclick = () => { sfx('card'); this.map(+g.dataset.i); });
  $('#mpStore').onclick = () => { track('bg_store', { b: sel, at: 'map' }); try { window.open(STORE_MAP[sel], '_blank', 'noopener'); } catch { /* */ } };
  const collect = () => { const v = this.idleOf(sel); if (v > 0) { S.coins += v; S.earned += v; S.branch[sel].idleAt = Date.now(); save(true); sfx('cash_get', { v: 3 }); this.note(`${BRANCHES[sel].name} 수익 +${fmt(v)}`, { force: true }); } return v; };
  const go = $('#mpGo'); if (go) go.onclick = () => { collect(); this.mapClose(); this.app.goBranch(sel); };
  const col = $('#mpCol'); if (col) col.onclick = () => { collect(); this.map(sel); };
  const up1 = () => { const br = (S.branch[sel] ||= { own: [], paid: {}, build: {} }); br.idleUp = Math.min(IDLE.upMax, (br.idleUp || 0) + 1); br.idleAd = 0; save(true); sfx('levelup'); this.note(`${BRANCHES[sel].name} 쉬는 동안 수익 +${br.idleUp * 10}% (영구)`, { force: true }); };
  const iu = $('#mpIu'); if (iu) iu.onclick = () => this.ad('idle', () => { const br = (S.branch[sel] ||= { own: [], paid: {}, build: {} }); br.idleAd = (br.idleAd || 0) + 1; if (br.idleAd >= IDLE.upAds) up1(); save(true); this.map(sel); }, 'idle_up', '쉬는 동안 수익 단계 (광고 3편 = +10%)');
  const ig = $('#mpIg'); if (ig) ig.onclick = async () => { if (await this.gold('idle_up', up1)) this.map(sel); };
  const cp = $('#mpCoupon'); if (cp) cp.onclick = () => this.modal(`<h3>🎟 ${B.name.split(' · ')[0]} 완성 쿠폰</h3><p>이 지점을 다 키우면 <b>실제 ${B.name.split(' · ')[1]}</b>에서 쓸 수 있는 쿠폰이 생겨요.</p><p class="sm">시험용 · 쿠폰 내용과 사용 방법은 마루미베이글과 정하는 중이에요</p><button class="btn" id="mOk">확인</button>`) && ($('#mOk').onclick = () => this.close());
  const ad = m.querySelector('.adboard'); if (ad) ad.onclick = () => { track('bg_xpromo', { to: 'ocean' }); this.toast('원어데이에서 「웨일 테일」을 찾아보세요 🐋'); };
};
P.mapClose = function () { const m = $('#mapv'); if (m) m.hidden = true; this._mpbk && this._mpbk(); this._mpbk = null; music(BGM[S.bi]); };
