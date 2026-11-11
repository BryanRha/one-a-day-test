// 수달 인양단 ↔ 원어데이 BM 연결 (게임 쪽 도우미 — 공통 파일 oad_bm.js 는 고치지 않음 · 규칙 docs/bm-policy.md)
//   가격은 서버 표(SHOP.salvage)만 기준 — 게임 값과 서버 값이 다르면 그 버튼은 숨김(확인 창 값 = 버튼 값 = 실제 차감)
//   파는 것: 이어하기(판당 2번 20 → 40) · 가방 보험(광고 1회 또는 🪙20) · 은신처 공사 즉시 완성(남은 시간 비례 inst 등급) · 꾸미기(능력치 0)
//   광고만: 출격 충전(하루 2번) · 공사 즉시 완성(하루 5번) · 첫 이어하기 · 가방 보험 — 소장자는 광고 없이 바로(횟수 같음, 앱이 처리)
//   안 파는 것: 무기 · 장비 · 개조(능력치) · 열쇠 · 시설 단계 그 자체 · 출격 횟수를 골드로 (출격 충전은 광고로만)
//   원어데이 밖(hello().ok = false): 골드 · 광고 버튼 전부 숨김, 게임은 그대로 (1분 이하 공사 '바로 끝내기 · 무료'만 남음)
import { bm } from './oad_bm.js?v=0.99.24';
import { S, save } from './save.js?v=0.99.24';
import { COS, COS_KEYS, RT } from './look.js?v=0.99.24';
import * as E from './econ.js?v=0.99.24';
import { FACILITIES, DAILY_SORTIES, ITEMS } from './data.js?v=0.99.24';
import { suspendAudio, resumeAudio, sfx } from './audio.js?v=0.99.24';
import { INST_MIN, INST_FREE, GOLD_MAX, instGold, AD, CONT, contWorth } from './bm_rules.js?v=0.99.24';

export { bm };
let APP = null, hp = null;
const $ = (s, r = document) => r.querySelector(s);
const frameOn = () => { try { return window.parent !== window; } catch { return true; } };

/* ───── hello (한 번) · 다시 묻기 ───── */
export function helloOnce() {
  return hp || (hp = bm.hello().then(h => {
    /* ?oadtest=1 가짜 지갑 시험용: &owned=1 이면 소장자 흉내 · &oadads=0 이면 광고 한도 끝 흉내 (실제 값은 앱이 줌) */
    if (h && h.test && /[?&]owned=1/.test(location.search)) h.owned = true;
    if (h && h.test && /[?&]oadads=0/.test(location.search)) h.ads = { ...h.ads, reward: false, rewardLeft: 0 };
    syncOwned(); return h;
  }));
}
/* hello 가 앱 가격표보다 먼저 와서 prices 가 빈 채로 굳으면(룬 다이스 v0.10.1 교훈) 은신처 · 출격 준비 때 한 번 더 물음 */
const NEED = ['continue', 'insure', 'inst5'];
let rq = null;
export const pricesMissing = () => !bm.info.ok || NEED.some(k => !bm.price(k));
export async function refreshHello(ms = 3000) {
  await helloOnce();
  if (!frameOn() || bm.info.test || !pricesMissing()) return false;
  if (rq) return rq;
  rq = new Promise(res => {
    const id = 'sh' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const fin = r => {
      removeEventListener('message', on); clearTimeout(t); rq = null;
      if (r && r.ok) { const c = bm.info; Object.assign(c, r); if (!c.prices) c.prices = {}; if (!c.items) c.items = []; if (!c.ads) c.ads = {}; syncOwned(); return res(!pricesMissing()); }   /* 다시 받아도 비었으면 false (다시 그리기 반복 X) */
      res(false);
    };
    const on = e => { if (e.source === window.parent && e.data && e.data.type === 'oad:res' && e.data.id === id) fin(e.data.result); };
    const t = setTimeout(() => fin(null), ms);
    addEventListener('message', on);
    try { window.parent.postMessage({ type: 'oad:req', id, fn: 'hello', args: [] }, location.origin); } catch { fin(null); }
  });
  return rq;
}
export const oadOn = () => !!bm.info.ok;
export const owned = () => !!(bm.info.ok && bm.info.owned);
export const price = sku => (oadOn() ? bm.price(sku) : 0);
export const adReady = () => oadOn() && !!(bm.info.ads && bm.info.ads.reward);
export function hasItem(sku) {
  return (bm.info.items || []).some(x => { const k = typeof x === 'string' ? x : (x && (x.sku || x.id)) || ''; return k === sku || k.endsWith(':' + sku); });
}
/* 소장자 꾸미기 · 골드로 산 꾸미기 되살리기 (기기를 바꿔도 hello().items 로) */
function syncOwned() {
  RT.owner = owned(); let ch = false;
  if (!S || !S.owned) return;
  for (const k of COS_KEYS) if (COS[k].gold && hasItem(k) && !S.owned.includes(k)) { S.owned.push(k); ch = true; }
  if (oadOn() && !RT.owner && S.look && COS[S.look.deco]?.owner) { S.look.deco = null; ch = true; }
  if (ch) { save(); APP?.lookChanged?.(); }
}

/* ───── 확인 창 · 광고 동안 멈춤 → 닫히면 소리 · 속도 되살리기 (룬 다이스 v0.10.2 교훈) ─────
   원인 기억: 앱 확인 창 버튼을 누르면 포커스가 iframe 밖(앱)으로 나가 blur → 창이 닫혀도 focus 가 안 와 소리가 멈춘 채 남을 수 있음
   · 멈춤은 이유별 개수(holds) — 모든 이유가 풀려야 판을 다시 돌림 (두 번 걸고 한 번 풀어 멈춘 채 남는 일 X)
   · 다 풀릴 때 · 앱 안에서 화면이 보이는데 blur · focus · 화면이 다시 보일 때 · 매 탭마다 revive(): 소리 resume + 판 멈춤 표시 정리 + 자동 화질 기록 지움 */
const holds = new Map();
export const held = () => holds.size > 0;
export function revive() {
  if (held() || document.visibilityState === 'hidden') return;
  resumeAudio();
  const R = APP?.raid; if (R && R.__bmHeld) { R.paused = false; R.__bmHeld = false; }
  if (APP?.stats) { APP.stats.lowN = 0; }
}
export function hold(why, on) {
  const was = held(), n = (holds.get(why) || 0) + (on ? 1 : -1);
  if (n > 0) holds.set(why, n); else holds.delete(why);
  const R = APP?.raid;
  if (!was && held()) { if (R && !R.paused) { R.paused = true; R.__bmHeld = true; } suspendAudio(); }
  else if (was && !held()) revive();
}
const QUIET = new Set(['cancel', 'off', 'timeout', 'standalone']);
async function spend(sku) {
  const r = await bm.spend(sku);
  if (r && !r.ok && frameOn() && !bm.info.test && !QUIET.has(r.reason)) r.appSaid = true;   /* 앱이 이미 안내함 → 게임 토스트 두 겹 X */
  return r || { ok: false, reason: 'error' };
}
async function watchAd(place) { const r = await bm.rewardedAd(place); return r || { ok: false, reason: 'error' }; }
export function failMsg(r) {
  const why = r && r.reason;
  if (!r || r.appSaid || why === 'cancel') return '';
  if (why === 'short') return '원어데이 골드가 조금 모자라요';
  if (why === 'login') return '로그인하면 쓸 수 있어요';
  if (why === 'limit') return '오늘은 여기까지예요 · 내일 다시';
  return '지금은 쓸 수 없어요 · 잠시 뒤에 다시';
}
function soft(r) { const t = failMsg(r); if (t) APP?.ui?.toast(t, 'soft'); }

/* ───── 기록 (앱 운영실) ───── */
export function track(name, p = {}) {
  const q = { game: 'salvage', ...p };
  try { (window.__tracks || (window.__tracks = [])).push({ name, p: q }); } catch { /* */ }
  if (frameOn()) try { window.parent.postMessage({ type: 'oad:track', name, p: q }, location.origin); } catch { /* */ }
}

/* ───── 하루 횟수 (게임 쪽 · 앱 한도는 앱이 따로 셈 → 보여 주는 'N번'은 둘 중 작은 값) ───── */
function day() { const d = E.kstDay(); if (!S.bm || S.bm.day !== d) S.bm = { day: d, sortie: 0, inst: 0 }; return S.bm; }
export const adLeft = k => (adReady() ? Math.max(0, Math.min(AD[k] - (day()[k] || 0), bm.info.ads.rewardLeft ?? AD[k])) : 0);

/* ───── 은신처 공사 즉시 완성 (값 계산은 bm_rules.js) ───── */
export function instNow(now = Date.now()) {
  if (!S.build) return null; const nx = E.facNext(S, S.build.k); const dur = nx?.time || 0, left = Math.max(0, (S.build.until - now) / 1000);
  return { k: S.build.k, dur, left, n: instGold(dur, left) };
}
export function instHtml() {
  const w = instNow(); if (!w || w.left < INST_MIN) return '';
  let h = '';
  if (w.n === 0) return `<button class="ib free" data-inst="free">⚡ 바로 끝내기<small>무료</small></button>`;
  const a = adLeft('inst'); if (a > 0) h += `<button class="ib ad" data-inst="ad">📺 광고로<small>즉시 완성 · ${a}번</small></button>`;
  if (oadOn() && w.n <= GOLD_MAX && price('inst' + w.n) === w.n) h += `<button class="ib gold" data-inst="gold" data-n="${w.n}">⚡ 즉시 완성<small>🪙${w.n}</small></button>`;
  return h;
}
let instBusy = false;
async function instDo(kind, n) {
  const w = instNow(); if (!w || instBusy) return; instBusy = true;
  try {
    let r;
    if (kind === 'free') { if (w.left > INST_FREE) return; r = { ok: true }; }
    else if (kind === 'ad') { if (!adLeft('inst')) return APP.ui.toast('오늘 광고 즉시 완성은 다 썼어요', 'soft'); r = await watchAd('inst'); if (r.ok) { day().inst++; } }
    else { if (!(n > 0) || price('inst' + n) !== n) return; r = await spend('inst' + n); }
    if (!r.ok) return soft(r);
    if (!S.build || S.build.k !== w.k) return;   /* 그새 저절로 끝남 */
    const k = E.finishBuild(S); save(); sfx.build(); track('inst_use', { via: kind, n: kind === 'gold' ? n : 0, fac: k });
    APP.ui.toast(`${FACILITIES[k].name} Lv.${S.fac[k]} 완성!`, 'good'); APP.ui.refresh();
  } finally { instBusy = false; }
}
/* 1초마다 버튼 값 다시 계산 (남은 시간이 줄면 값도 줄어듦 — 누른 순간 보이는 값 그대로 청구) */
let lastInst = '';
function tickInst() {
  const box = $('.instbox'); if (!box) { lastInst = ''; return; }
  const html = instHtml(); if (html !== lastInst || !box.innerHTML && html) { box.innerHTML = html; lastInst = html; }
}
export function bindInst(root) {
  const box = root.querySelector('.instbox'); if (!box) return;
  box.innerHTML = lastInst = instHtml();
  box.onclick = e => { const b = e.target.closest('[data-inst]'); if (!b) return; instDo(b.dataset.inst, +b.dataset.n || 0); };
}

/* ───── 출격 충전 (광고로만 · 하루 2번 · 출격이 0일 때만 — 받을 양이 0이면 숨김) ───── */
export function sortieHtml() {
  if (S.sorties > 0 || APP?.nolimit) return '';
  const a = adLeft('sortie'); if (!a) return '';
  return `<button class="ib ad sortad" data-sortie="1">📺 광고 보고 출격 +1<small>오늘 ${a}번</small></button>`;
}
export function bindSortie(root, after) {
  root.querySelectorAll('[data-sortie]').forEach(b => b.onclick = async e => {
    e.stopPropagation(); if (b.disabled) return; b.disabled = true;
    const r = await watchAd('sortie'); b.disabled = false;
    if (!r.ok) return soft(r);
    if (S.sorties >= DAILY_SORTIES) return;
    S.sorties++; day().sortie++; save(); sfx.rare(); track('sortie_ad', {}); APP.ui.toast('출격 +1 — 다녀와요!', 'good'); after?.();
  });
}

/* ───── 가방 보험 (출격 준비에서 · 다음 한 판 · 쓰러져도 가방 · 몽이 주머니 그대로 → 시체 자리 없음) ───── */
let insured = false;
export const insuredNext = () => insured;
export function insureHtml() {
  if (!oadOn()) return '';
  if (insured) return `<div class="insured">🛡 가방 보험 들었어요 <small>이번 출격은 쓰러져도 가방을 그대로 가져와요</small></div>`;
  const p = price('insure'); let h = '';
  if (adReady()) h += `<button class="ib ad" data-ins="ad">📺 광고로<small>가방 보험</small></button>`;
  if (p) h += `<button class="ib gold" data-ins="gold">🛡 가방 보험<small>🪙${p}</small></button>`;
  return h ? `<div class="insrow"><span>쓰러져도 가방을 지켜요</span>${h}</div>` : '';
}
export function bindInsure(root, after) {
  root.querySelectorAll('[data-ins]').forEach(b => b.onclick = async () => {
    if (insured || b.disabled) return; b.disabled = true;
    const r = b.dataset.ins === 'ad' ? await watchAd('insure') : await spend('insure'); b.disabled = false;
    if (!r.ok) return soft(r);
    insured = true; sfx.pick(4); track('insure', { via: b.dataset.ins }); APP.ui.toast('가방 보험 — 이번 출격은 마음 놓고 깊이!', 'good'); after?.();
  });
}

/* ───── 판에 붙이기: 보험 · 이어하기 ───── */
export function attachRaid(R) {
  R.__insured = insured; insured = false; R.__cont = 0; R.assisted = false;
  const die = R.die.bind(R);
  R.die = why => { if (R.over) return; die(why); if (why !== 'tide' && canContinue(R)) offerContinue(R); };
  const result = R.result.bind(R);
  R.result = () => {
    const res = result(); res.assisted = R.assisted; res.cont = R.__cont;
    if (R.__insured && res.outcome !== 'extract') { res.safe = [...res.safe, ...res.items]; res.items = []; if (!res.petSafe) res.petSafe = true; res.insured = true; }
    return res;
  };
}
/* 이어하기 권유: '아깝다' 순간만 (bm-policy 5장 · 조건은 bm_rules.contWorth) · 판당 2번 */
const bagVal = R => (R.bag?.items || []).reduce((s, p) => s + (ITEMS[p.it?.key]?.val || 0), 0);
export function canContinue(R) {
  if (!oadOn() || R.__cont >= 2 || !contWorth(S.stats.raids || 0, R.elapsed, bagVal(R))) return false;
  const c = CONT[R.__cont]; return (c.ad && adReady()) || !!price(c.sku);
}
function offerContinue(R) {
  R.endIn = Infinity; const c = CONT[R.__cont], p = price(c.sku), v = bagVal(R), ui = APP.ui;
  setTimeout(() => {
    if (APP.raid !== R) return;
    hold('offer', true);
    const praise = v >= 150 ? `대박 인양 중이었어요! 가방에 ${v} 어치` : v >= 40 ? `가방에 ${v} 어치나 담았는데` : `${Math.floor(R.elapsed / 60)}분 넘게 버텼어요`;
    const m = document.createElement('div'); m.className = 'modal cont';
    m.innerHTML = `<div class="sheet"><h3>${praise}</h3><p>지금 일어나면 들고 나갈 수 있어요</p>
      <div class="cring"><b id="cN">10</b></div>
      <div class="sbtns">${c.ad && adReady() ? '<button class="btn cta" data-c="ad">📺 광고 보고 이어하기</button>' : ''}${p ? `<button class="btn ${c.ad && adReady() ? '' : 'cta'}" data-c="gold">이어하기 · 🪙${p}</button>` : ''}<button class="lnk" data-c="no">그만할게요</button></div></div>`;
    ui.root.appendChild(m); track('continue_offer', { n: R.__cont + 1 });
    let left = 10, busy = false, done = false;
    const end = ok => { if (done) return; done = true; clearInterval(t); m.remove(); hold('offer', false); if (ok) reviveRaid(R); else { R.endIn = 0.4; track('continue_decline', { n: R.__cont + 1 }); } };
    const t = setInterval(() => { if (busy || held() && holds.size > 1) return; left--; const n = m.querySelector('#cN'); if (n) n.textContent = left; if (left <= 0) end(false); }, 1000);
    m.querySelectorAll('[data-c]').forEach(b => b.onclick = async () => {
      if (busy || done) return; const k = b.dataset.c; if (k === 'no') return end(false);
      busy = true; const r = k === 'ad' ? await watchAd('revive') : await spend(c.sku); busy = false;
      if (r.ok) { track('continue_take', { n: R.__cont + 1, via: k }); end(true); } else { soft(r); left = Math.max(left, 5); }
    });
  }, 900);
}
function reviveRaid(R) {
  const pl = R.pl; R.__cont++; R.assisted = true;
  R.over = null; R.endIn = 0; pl.dead = false; pl.hp = pl.maxHp; pl.inv = 2.5; R.slow = 1; R.slowT = 0; R.shake = 0.3;
  try { pl.anim.play('Idle', { fade: 0.2, force: true }); } catch { /* */ }
  for (const e of R.enemies) if (!e.dead && e.pos.distanceTo(pl.pos) < 8) { e.stagger = e.kind === 'boss' ? 1.2 : 2.2; e.cd = Math.max(e.cd, 2); }
  try { R.fx.burst(pl.pos.x, 1.2, pl.pos.z, 26, 0x8ef0a8, 5, 0.12, 0.8, -2); } catch { /* */ }
  sfx.rare(); APP.ui.toast('다시 일어났어요! 2.5초 무적', 'good');
}

/* ───── 결과 · 판 끝 전면 광고 (탈출한 판만 — 실패 직후 X · 앱이 그룹 · 간격 · 소장을 봄) ───── */
let pending = false;
export function resultBm(el, res) {
  if (res.outcome === 'extract') pending = true;
  const row = el.querySelector('.bmrow'); if (row && res.insured) row.innerHTML = '<div class="note good">🛡 가방 보험으로 가방을 그대로 가져왔어요</div>';
  const home = el.querySelector('#home'); if (home) home.addEventListener('click', () => { afterRound(); }, { once: true });
}
export async function afterRound() {
  if (!pending) return; pending = false;
  try { await bm.interstitial('round_end'); } catch { /* 늘 넘어감 */ }
}

/* ───── 꾸미기 골드 판매 (능력치 0 · 낱개 · 모든 상품에 무료 길(플레이 · 조개) 있음) ───── */
export const cosShown = k => !COS[k]?.owner || oadOn();
export function cosGold(k) { const c = COS[k]; if (!c?.gold || !oadOn()) return 0; return price(k) === c.gold ? c.gold : 0; }
export async function buyCosGold(k) {
  const n = cosGold(k); if (!n) return { ok: false, reason: 'off' };
  const r = await spend(k);
  if (r.ok) { (S.owned ||= []).includes(k) || S.owned.push(k); save(); track('cos_buy', { sku: k, gold: n }); }
  else soft(r);
  return r;
}

/* ───── 시작 ───── */
export function initBM(app) {
  APP = app;
  bm.onPause = on => hold('bm', !!on);
  const inApp = frameOn();
  addEventListener('blur', () => { if (inApp && document.visibilityState !== 'hidden') setTimeout(revive, 0); });
  addEventListener('focus', () => setTimeout(revive, 0));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'hidden') setTimeout(revive, 0); });
  for (const ev of ['pointerdown', 'touchend', 'keydown']) addEventListener(ev, () => revive(), { capture: true, passive: true });
  setInterval(tickInst, 1000);
  app.bm = { held, holds: () => [...holds.keys()], info: () => bm.info, insured: insuredNext, instNow, instGold, adLeft, revive };
  return helloOnce().then(h => { try { app.ui?.refresh(); } catch { /* */ } return h; });   /* 첫 답이 오면 은신처를 다시 그려 버튼을 띄움 */
}
