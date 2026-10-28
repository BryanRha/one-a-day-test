// 룬 다이스 ↔ 원어데이 BM 연결 (게임 쪽 도우미 — 공통 파일 oad_bm.js 는 고치지 않음)
//   가격은 서버 표(SHOP.dice)만 기준: crystal100(수정 100) · abyss(심연 한 번 더) · arena(전장 배경, item)
//   뽑기는 수정으로만 (골드로 직접 뽑기 X · 확률 공개 · 천장 그대로) · 광고로 뽑기를 주지 않음
//   광고 보상: 판 보상 2배(하루 3) · 무료 상자(하루 1, 수정 + 등급업 카드) — 소장자는 광고 없이 바로(횟수 같음)
//   원어데이 밖(hello().ok = false): 골드 · 광고 · 전용 전장 전부 숨김, 게임은 그대로
import { bm } from './oad_bm.js?v=0.84.1';
import { load, save } from './save.js?v=0.84.1';
import { HELP, roll, note, eligible, used } from './core/help.js?v=0.84.1';

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
export function initBM(game) {
  /* 광고 · 확인 창 동안 게임 시간과 소리를 멈춤 (실시간 전투 보호) */
  bm.onPause = on => { try { if (on) { game.sound.pauseAll(); game.loop.sleep(); } else { game.loop.wake(); game.sound.resumeAll(); } } catch { /* */ } };
  return helloOnce();
}
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
export async function buyItem(sku) {
  const r = await bm.spend(sku);
  if (r && r.ok) { const it = bm.info.items || (bm.info.items = []); if (!hasItem(sku)) it.push(sku); }
  return r || { ok: false, reason: 'error' };
}
// 수정 100 (🪙100)
export async function buyCrystals() {
  const r = await bm.spend('crystal100');
  if (r && r.ok) { const d = load(); d.crystals += 100; save(); }
  return r || { ok: false, reason: 'error' };
}
// 심연 광산 한 번 더 (🪙20) — 무료 길: 내일 다시 3번
export async function buyAbyss() {
  const r = await bm.spend('abyss');
  if (r && r.ok) { const d = load(); d.abyss.extra = (d.abyss.extra || 0) + 1; save(); }
  return r || { ok: false, reason: 'error' };
}
// 골드 · 광고 실패 안내 (부드럽게)
export function failMsg(r) {
  const why = r && r.reason;
  if (why === 'short') return '골드가 조금 모자라요';
  if (why === 'login') return '로그인하면 쓸 수 있어요';
  if (why === 'limit') return '오늘은 여기까지예요 · 내일 다시';
  if (why === 'cancel') return '';
  return '지금은 쓸 수 없어요 · 잠시 뒤에 다시';
}

// ── 보상형 광고 (게임 쪽 하루 횟수 · 앱 한도는 앱이 따로 셈) ──
export const AD = { x2: 3, box: 1, x2Cap: 100 };
function ads() { const d = load(); if (!d.ads || d.ads.date !== dayKey()) { d.ads = { date: dayKey(), x2: 0, box: 0 }; save(); } return d.ads; }
export const x2Left = () => Math.max(0, AD.x2 - ads().x2);
export const boxLeft = () => Math.max(0, AD.box - ads().box);
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
// 생존 원정 시작 때: 조건이 맞으면 두 그룹 모두 help_eligible 한 번 → 켜짐이면 true (선물 창) · 꺼짐은 조건만 소모
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
