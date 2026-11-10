// 룬 다이스 ↔ 원어데이 BM 연결 (게임 쪽 도우미 — 공통 파일 oad_bm.js 는 고치지 않음)
//   가격은 서버 표(SHOP.dice)만 기준: crystal100(수정 100) · abyss(심연 한 번 더) · arena(전장 배경, item)
//   뽑기는 수정으로만 (골드로 직접 뽑기 X · 확률 공개 · 천장 그대로) · 광고로는 열쇠만 하루 1개(QA 23 · 2026-11-09) — 골드로는 여전히 뽑기 X
//   광고 보상: 판 보상 2배(하루 3) · 무료 상자(하루 1, 수정 + 등급업 카드) — 소장자는 광고 없이 바로(횟수 같음)
//   원어데이 밖(hello().ok = false): 골드 · 광고 · 전용 전장 전부 숨김, 게임은 그대로
import { bm } from './oad_bm.js?v=0.99.19';
import { load, save } from './save.js?v=0.99.19';
import { HELP, roll, note, eligible, used } from './core/help.js?v=0.99.19';

export { bm };
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

let hp = null;
// hello 는 한 번만 (원어데이 밖이면 바로 ok=false)
export function helloOnce() {
  return hp || (hp = bm.hello().then(h => {
    /* ?oadtest=1 가짜 지갑 시험용: 주소에 &owned=1 이면 소장자 흉내 (실제 값은 앱이 줌) */
    if (h && h.test && /[?&]owned=1/.test(location.search)) h.owned = true;
    return h;
  }));
}
/* 멈춤 · 소리 되살리기 (2026-11-03 v0.10.2 대표 제보: '골드 아이템 쓴 직후 소리가 안 나오고 게임이 느려짐')
   원인: 앱 확인 창 버튼을 누르면 포커스가 iframe 밖(앱)으로 감 → Phaser 가 blur 로 받아 ① 소리 AudioContext 를 suspend
     ② loop.inFocus=false 로 한 프레임 시간을 1/60초로 자름(폰이 30~40fps 면 판이 절반 속도) — 창이 닫혀도 포커스는 앱에 남아
     focus 이벤트가 안 와서 그대로 (Phaser 는 탭 때 window.focus() 를 부르지만 폰 iframe 에선 안 먹는 경우가 있음)
   수정 · 같은 종류 막기:
     · 멈춤은 이유별 개수(holds)로 걸고 풂 — 모든 이유가 풀려야 loop 를 깨움 (두 번 걸고 한 번 풀어 멈춘 채 남는 일 X)
     · 다 풀릴 때 · 원어데이 안에서 화면이 보이는데 blur(포커스만 앱으로) 될 때 · 화면이 다시 보일 때 · 매 탭마다
       revive(): loop 포커스 되돌림(시간 자르기 해제) + 소리 다시 켬(AudioContext resume — 폰의 'interrupted' 포함, 탭은 사용자 동작이라 iOS 도 허용) */
const holds = new Map();
let G = null;
export const held = () => holds.size > 0;
export function revive(game = G) {
  if (!game || held() || document.visibilityState === 'hidden') return;
  /* loop.focus() 는 resetDelta 로 120프레임(_coolDown, 폰 30fps 면 4초) 동안 또 시간을 자르므로 쓰지 않고 표시만 되돌림 (Phaser 3.90 · 한 프레임 큰 시간은 Play.update 가 0.1초로 자름) */
  try { const lp = game.loop; lp.inFocus = true; lp._coolDown = 0; if (!lp.running) lp.wake(); } catch { /* */ }
  try {
    const sm = game.sound; if (sm.gameLostFocus) sm.onGameFocus();
    const ctx = sm.context; if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => {});
  } catch { /* */ }
}
export function hold(why, on, game = G) {
  if (!game) return;
  const was = held(), n = (holds.get(why) || 0) + (on ? 1 : -1);
  if (n > 0) holds.set(why, n); else holds.delete(why);
  try {
    if (!was && held()) { game.sound.pauseAll(); game.loop.sleep(); }
    else if (was && !held()) { game.loop.wake(); game.sound.resumeAll(); revive(game); }
  } catch { /* */ }
}
export function initBM(game) {
  G = game;
  /* 광고 · 확인 창 동안 게임 시간과 소리를 멈춤 (실시간 전투 보호) — 앱 물음이 겹쳐도 개수로 셈 */
  bm.onPause = on => hold('bm', !!on, game);
  const inApp = (() => { try { return window.parent !== window; } catch { return true; } })();
  /* Phaser 의 blur 처리(소리 suspend · 시간 자르기) 뒤에 실행되도록 다음 틱 · 화면이 보이는 동안의 blur 는 '앱 쪽을 눌렀다'일 뿐 */
  game.events.on('blur', () => { if (inApp) setTimeout(() => revive(game), 0); });
  game.events.on('focus', () => setTimeout(() => revive(game), 0));   /* 포커스가 돌아올 때 Phaser 가 거는 4초 시간 자르기도 풂 */
  game.events.on('visible', () => setTimeout(() => revive(game), 0));
  for (const ev of ['pointerdown', 'touchend', 'pointerup', 'keydown']) addEventListener(ev, () => revive(game), { capture: true, passive: true });
  return helloOnce();
}
/* 다시 묻기 (2026-11-03 v0.10.1 · 판 안 아이템이 안 보이던 원인):
   hello 는 iframe 이 뜨자마자 한 번만 묻고 그 답을 끝까지 씀 — 그때 앱이 아직 가격표(/api/pay/config · 로그인 정보)를 못 받았으면
   prices 가 빈 채로(또는 800ms 넘어 ok=false 로) 굳어 그 세션 내내 아이템 · 골드 상품이 숨음.
   → 홈 · 결과 · 판 시작 때 '필요한 가격이 비었으면' 앱에 hello 를 다시 물어 같은 캐시 객체(bm.info)를 새 답으로 채움
     (공통 oad_bm.js 는 고치지 않음 · 원어데이 안(iframe)일 때만 · 시험용 가짜 지갑(?oadtest)은 건드리지 않음 · 동시에 한 번만 · 3초 넘으면 그대로) */
const NEED = ['automerge', 'remove', 'reroll', 'bomb', 'crystal100'];
let rq = null;
export const pricesMissing = () => !bm.info.ok || NEED.some(k => !bm.price(k));
export async function refreshHello(ms = 3000) {
  await helloOnce();
  if (!frameOn() || bm.info.test || !pricesMissing()) return bm.info;
  if (rq) return rq;
  rq = new Promise(res => {
    const id = 'dh' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const fin = r => {
      removeEventListener('message', on); clearTimeout(t); rq = null;
      if (r && r.ok) { const c = bm.info; Object.assign(c, r); if (!c.prices) c.prices = {}; if (!c.items) c.items = []; if (!c.ads) c.ads = {}; }
      res(bm.info);
    };
    const on = e => { if (e.source === window.parent && e.data && e.data.type === 'oad:res' && e.data.id === id) fin(e.data.result); };
    const t = setTimeout(() => fin(null), ms);
    addEventListener('message', on);
    try { window.parent.postMessage({ type: 'oad:req', id, fn: 'hello', args: [] }, location.origin); } catch { fin(null); }
  });
  return rq;
}
const frameOn = () => { try { return window.parent !== window; } catch { return true; } };
export const oadOn = () => !!bm.info.ok;
export const owned = () => !!(bm.info.ok && bm.info.owned);
export const price = sku => bm.price(sku);
export function hasItem(sku) {
  return (bm.info.items || []).some(x => { const k = typeof x === 'string' ? x : (x && (x.sku || x.id)) || ''; return k === sku || k.endsWith(':' + sku); });
}

// ── 전장 꾸미기 중 원어데이 전용 두 가지 ──
//   owner: 소장자 전용(무료 · hello().owned) · sku: 골드 상품(item, hello().items 로 복원)
export const special = f => !!(f && (f.owner || f.sku));
export const fieldShown = f => !special(f) || oadOn();
export function fieldOpen(f) {
  if (!special(f)) return !!load().fields[f.id];
  if (!oadOn()) return false;
  return f.owner ? owned() : hasItem(f.sku);
}
const QUIET = new Set(['cancel', 'off', 'timeout', 'standalone']);
async function spend(sku) {
  const r = await bm.spend(sku);
  if (r && !r.ok && frameOn() && !bm.info.test && !QUIET.has(r.reason)) r.appSaid = true;
  return r;
}
export async function buyItem(sku) {
  const r = await spend(sku);
  if (r && r.ok) { const it = bm.info.items || (bm.info.items = []); if (!hasItem(sku)) it.push(sku); }
  return r || { ok: false, reason: 'error' };
}
// 수정 100 (🪙100)
export async function buyCrystals() {
  const r = await spend('crystal100');
  if (r && r.ok) { const d = load(); d.crystals += 100; save(); }
  return r || { ok: false, reason: 'error' };
}
// 심연 광산 한 번 더 (🪙20) — 무료 길: 내일 다시 3번
export async function buyAbyss() {
  const r = await spend('abyss');
  if (r && r.ok) { const d = load(); d.abyss.extra = (d.abyss.extra || 0) + 1; save(); }
  return r || { ok: false, reason: 'error' };
}
// 판 안 아이템 (메인 원정 · core/items.js): 가격은 서버 표만 — 값이 없으면(원어데이 밖 · 표에 없음) 0 → 화면에서 숨김
//   한 번 쓸 때마다 앱 확인 창 → 골드 차감 → 성공이면 게임이 효과를 줌 (효과 · 판 상한은 게임 쪽)
export const itemPrice = sku => (oadOn() ? price(sku) : 0);
export async function buyUse(sku) {
  const r = await spend(sku);
  if (r && r.ok) track('item_use', { sku });
  return r || { ok: false, reason: 'error' };
}
// 골드 · 광고 실패 안내 (부드럽게)
//   골드 쓰기(spend)에서 앱이 확인 창을 띄운 뒤 돌려준 실패(서버 거절 → 앱 토스트 · 로그인 창 · 충전 창)는 앱이 이미 안내함
//   → spend() 가 appSaid 표시 → 게임 토스트 X (두 겹 X · v0.10.2). 앱이 아무것도 못 보여 준 경우(timeout · standalone · off · 가짜 지갑 · 광고 쪽)만 게임이 안내
export function failMsg(r) {
  const why = r && r.reason;
  if (r && r.appSaid) return '';
  if (why === 'short') return '골드가 조금 모자라요';
  if (why === 'login') return '로그인하면 쓸 수 있어요';
  if (why === 'limit') return '오늘은 여기까지예요 · 내일 다시';
  if (why === 'cancel') return '';
  return '지금은 쓸 수 없어요 · 잠시 뒤에 다시';
}

// ── 보상형 광고 (게임 쪽 하루 횟수 · 앱 한도는 앱이 따로 셈) ──
//   key: 룬 제단 '광고 보고 열쇠'(QA 23 · 2026-11-09 대표 QA 시트) — 열쇠 1 = 뽑기 1회 · 하루 1번 (게임 광고 합계 2배 3 + 상자 1 + 열쇠 1 = 5 = 앱 게임당 하루 한도 · docs/bm-policy.md 3장)
export const AD = { x2: 3, box: 1, key: 1, x2Cap: 100 };
function ads() { const d = load(); if (!d.ads || d.ads.date !== dayKey()) { d.ads = { date: dayKey(), x2: 0, box: 0, key: 0 }; save(); } return d.ads; }
export const x2Left = () => Math.max(0, AD.x2 - ads().x2);
export const boxLeft = () => Math.max(0, AD.box - ads().box);
export const keyLeft = () => Math.max(0, AD.key - (ads().key || 0));
export const adReady = () => oadOn() && !!(bm.info.ads && bm.info.ads.reward);
// 판 보상 2배: 이번 판 수정만큼 한 번 더 (최대 100)
export async function doubleReward(crystals) {
  if (!x2Left()) return { ok: false, reason: 'limit' };
  const r = await bm.rewardedAd('reward2x');
  if (r && r.ok) { const d = load(), add = Math.min(AD.x2Cap, crystals); ads().x2++; d.crystals += add; save(); return { ...r, add }; }
  return r || { ok: false, reason: 'error' };
}
// 무료 상자: 수정 20 + 가진 룬 등급업 카드 1장 (뽑기 X)
export async function freeBox() {
  if (!boxLeft()) return { ok: false, reason: 'limit' };
  const r = await bm.rewardedAd('box');
  if (!r || !r.ok) return r || { ok: false, reason: 'error' };
  const d = load(), own = Object.keys(d.unlocked), rune = own[Math.floor(Math.random() * own.length)];
  ads().box++; d.crystals += 20; d.cards[rune] = (d.cards[rune] || 0) + 1; save();
  return { ...r, crystals: 20, rune };
}

// 열쇠 1개 (룬 제단 · QA 23): 광고 1회(소장자는 바로) → 뽑기 열쇠 +1 · 확률 · 천장은 그대로
export async function keyAd() {
  if (!keyLeft()) return { ok: false, reason: 'limit' };
  const r = await bm.rewardedAd('key');
  if (!r || !r.ok) return r || { ok: false, reason: 'error' };
  const d = load(), a = ads(); a.key = (a.key || 0) + 1; d.keys += 1; save(); track('ad_key', { left: keyLeft() });
  return { ...r, keys: d.keys };
}

// ── 판 끝 전면 광고: 판이 끝나면 roundOver(), 결과에서 다음 화면으로 넘어갈 때 afterRound() (판마다 한 번만 앱에 물어봄 · 실패 순간엔 안 부름) ──
let pending = false;
export const roundOver = () => { pending = true; };
export async function afterRound() {
  if (!pending) return;
  pending = false;
  try { await bm.interstitial('round_end'); } catch { /* 늘 넘어감 */ }
}

// ── 기록 (앱 운영실) ──
const inFrame = (() => { try { return window.parent !== window; } catch { return true; } })();
export function track(name, p = {}) {
  const q = { game: 'dice', ...p };
  try { (window.__tracks || (window.__tracks = [])).push({ name, p: q }); } catch { /* */ }
  if (inFrame) try { window.parent.postMessage({ type: 'oad:track', name, p: q }, location.origin); } catch { /* */ }
}

// ── 연속 실패 응원 선물 (규칙은 core/help.js) ──
function helpSt() { const d = load(); d.help = roll(d.help, dayKey()); return d.help; }
export function helpNote(r) { const d = load(); d.help = note(helpSt(), r); save(); return d.help.streak; }
// 메인 원정 시작 때: 조건이 맞으면 두 그룹 모두 help_eligible 한 번 → 켜짐이면 true (선물 창) · 꺼짐은 조건만 소모
export function helpCheck(mode) {
  if (mode !== 'run') return false;
  const h = helpSt();
  if (!eligible(h)) return false;
  const on = bm.helpOn();
  track('help_eligible', { on: on ? 1 : 0, streak: h.streak, med: h.hist.length ? h.hist.slice().sort((a, b) => a - b)[Math.floor(h.hist.length / 2)] : 0 });
  if (!on) helpUsed();
  return on;
}
export function helpUsed() { const d = load(); d.help = used(helpSt()); save(); }
export const GIFT_SP = HELP.giftSp;
