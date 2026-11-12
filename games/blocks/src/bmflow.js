// 블록 블리스 ↔ 원어데이 BM 연결 (게임 쪽 작은 도우미 — 공통 파일 oad_bm.js 는 고치지 않음)
//   · 시작 때 hello 한 번 (결과는 bm.info 로 바로 읽음 · 원어데이 밖이면 ok = false → 골드 · 광고 버튼 숨김)
//   · 판 끝 전면 광고: 판이 끝나면 roundOver(), 다음 화면으로 넘어갈 때 afterRound() 를 기다림 → 판마다 한 번만 앱에 물어봄
//   · 광고 · 확인 창 동안 소리 멈춤
import { bm } from './oad_bm.js?v=0.99.31';
import { load, save } from './save.js?v=0.99.31';
import { dayKey, SKINS } from './meta.js?v=0.99.31';

let hp = null;
// hello 는 한 번만 (Boot 가 스킨을 그리기 전에 기다림 · 원어데이 밖이면 바로 ok=false)
export function helloOnce() {
  return hp || (hp = bm.hello().then(h => {
    /* ?oadtest=1 가짜 지갑엔 스킨 가격이 없어 시험용으로만 채움 (실제 가격은 서버 SHOP.blocks.skin) */
    if (h && h.test && h.prices && !h.prices.skin) h.prices.skin = 250;
    if (h && h.test && h.prices) { if (!h.prices.bomb) h.prices.bomb = 20; if (!h.prices.line) h.prices.line = 10; }   /* 판 안 아이템 시험값 (실제는 SHOP.blocks) */
    return h;
  }));
}
export function initBM(game) {
  bm.onPause = on => { try { if (on) game.sound.pauseAll(); else game.sound.resumeAll(); } catch { /* */ } };
  return helloOnce();
}

// ── 원어데이 전용 스킨 ──
//   소장자 스킨: hello().owned 면 무료 · 골드 스킨: hello().items 에 'skin' 이 있으면 열림 (판단은 늘 서버 결과)
export const special = s => !!(s && (s.owner || s.sku));
export function hasItem(sku) {
  return (bm.info.items || []).some(x => { const k = typeof x === 'string' ? x : (x && (x.sku || x.id)) || ''; return k === sku || k.endsWith(':' + sku); });
}
export const skinShown = s => !special(s) || !!bm.info.ok;
export function skinOpen(s) {
  if (!special(s)) return true;
  if (!bm.info.ok) return false;
  return s.owner ? !!bm.info.owned : hasItem(s.sku);
}
// 실제로 그릴 스킨: 고른 스킨이 지금 열려 있지 않으면(밖에서 열었거나 소장 해제) 기본 주얼
export function effSkin() { const d = load(), s = SKINS.find(x => x.id === d.skin); return s && skinOpen(s) ? s.id : 'jewel'; }
// 골드 스킨 사기 → 성공하면 이번 실행에서도 바로 열림 (다음 실행부터는 hello().items)
export async function buySkin(s) {
  const r = await bm.spend(s.sku);
  if (r && r.ok) { const it = bm.info.items || (bm.info.items = []); if (!hasItem(s.sku)) it.push(s.sku); }
  return r || { ok: false, reason: 'error' };
}

let pending = false;
export const roundOver = () => { pending = true; };
export async function afterRound() {
  if (!pending) return;
  pending = false;
  try { await bm.interstitial('round_end'); } catch { /* 늘 넘어감 */ }
}

// 별 조각 2배: 오늘 쓴 횟수
export function doubleUsed() { const d = load(); return d.dbl && d.dbl.date === dayKey() ? d.dbl.n : 0; }
export function noteDouble(stars) { const d = load(), n = doubleUsed(); d.dbl = { date: dayKey(), n: n + 1 }; d.stars += stars; save(); }

// 기록 (앱 운영실): help_offer · help_take · help_decline ...
const inFrame = (() => { try { return window.parent !== window; } catch { return true; } })();
export function track(name, p = {}) {
  try { (window.__tracks || (window.__tracks = [])).push({ name, p }); } catch { /* */ }
  if (inFrame) try { window.parent.postMessage({ type: 'oad:track', name, p }, location.origin); } catch { /* */ }
}
// 응원 선물 실험이 켜져 있나 (꺼짐 그룹이면 선물 없음 · 원어데이 밖은 켜짐)
export const helpOn = () => bm.helpOn();

// ── 클래식 판 안 아이템 · 광고 (2026-11-09 QA 시트 #2 · #6) ──
//   가격은 서버 표만 — 값이 없으면(원어데이 밖 · 표에 없음) 0 → 화면에서 숨김 · 한 번 쓸 때마다 앱 확인 창 → 골드 차감 → 성공이면 게임이 효과
export const itemPrice = sku => (bm.info.ok ? bm.price(sku) : 0);
export async function buyUse(sku) {
  const r = await bm.spend(sku);
  if (r && r.ok) track('item_use', { game: 'blocks', sku });
  return r || { ok: false, reason: 'error' };
}
// 판 안 광고 '블록 바꾸기': 하루 횟수(게임 쪽) — 앱 한도는 앱이 따로 셈
export function swapAdLeft(max) { const d = load(); if (!d.items || d.items.date !== dayKey()) d.items = { date: dayKey(), ad: 0 }; return Math.max(0, max - d.items.ad); }
export function swapAdUsed() { const d = load(); if (!d.items || d.items.date !== dayKey()) d.items = { date: dayKey(), ad: 0 }; d.items.ad++; save(); }
export const adShown = () => !!bm.info.ok;
export const adReady = () => !!(bm.info.ok && (bm.info.owned || (bm.info.ads && bm.info.ads.reward)));
export function failMsg(r) {
  const why = r && r.reason;
  if (why === 'short') return '골드가 조금 모자라요';
  if (why === 'login') return '로그인하면 쓸 수 있어요';
  if (why === 'limit') return '오늘은 여기까지예요 · 내일 다시';
  if (why === 'cancel' || why === 'off') return '';
  return '지금은 쓸 수 없어요 · 잠시 뒤에 다시';
}
