// 원어데이 연결 하나 — 골드 상품 · 보상형 광고 · 소장자 혜택 · 응원 선물 (공통 규칙 docs/bm-policy.md)
//   가격은 서버 SHOP.farm 만 기준 (gems100 보석 100 · storage 창고 넓히기(영구) · deco 특별 장식(영구)) · 게임은 bm.spend 로 요청만
//   광고 자리 2곳: speed(생산 30분 단축, 하루 5) · boost(주문/기차 보상 +50%, 하루 3) = bm.rewardedAd · 소장자는 via:'owner' 로 광고 없이 바로
//   원어데이 밖(hello().ok=false): 골드 · 광고 · 소장자 장식을 숨기고 지금처럼 (이미 산 창고 · 장식은 저장에 남음)
//   골드 표시는 '100골드' 글자로 (🪙 기호는 이 게임에서 배추 코인 그림으로 바뀜)
import { bm } from './oad_bm.js?v=0.87.0';
import { load, save, dayNo, add } from './state.js?v=0.87.0';

let helloP = null;
// 시작 때 한 번 (기다리지 않음) → 응답이 오면 영구 상품 · 소장자 장식을 되살리고 화면을 다시 그림
export const initBM = onReady => helloP || (helloP = bm.hello().then(h => { restore(); try { onReady && onReady(h); } catch { /* */ } return h; }).catch(() => null));
export const oadOn = () => !!bm.info.ok;
export const isOwner = () => !!(bm.info.ok && (bm.info.owned || bm.info.noAds));
export const goldPrice = item => bm.price(item);          /* 0 이면 그 골드 상품 없음 (숨김) */
export const goldLabel = (item, what) => `${goldPrice(item)}골드${what ? ` ${what}` : ''}`;

// ── 영구 상품 · 소장자 장식
export const STORAGE_PLUS = 50;                            /* 창고 넓히기 = 헛간 +50칸 (영구) */
export const GOLD_DECO = 'goldfountain', OWNER_DECO = 'stargazebo';
const oad = () => { const d = load(); if (!d.oad) d.oad = {}; return d.oad; };
function giveDeco(k) { const d = load(); d.lim = d.lim || {}; d.lim[k] = (d.lim[k] || 0) + 1; }
// hello().items 로 복원 (기기를 바꿔도) · 소장자는 전용 장식 1개를 보관함에
export function restore() {
  const h = bm.info; if (!h.ok) return false; const o = oad(), items = (h.items || []).map(x => typeof x === 'string' ? x : x && x.sku).filter(Boolean); let ch = false;
  if (items.includes('storage') && !o.storage) { o.storage = true; ch = true; }
  if (items.includes('deco') && !o.deco) { o.deco = true; giveDeco(GOLD_DECO); ch = true; }
  if (h.owned && !o.owner) { o.owner = true; giveDeco(OWNER_DECO); ch = true; }
  if (ch) save(); return ch;
}
export const storageOn = () => !!(load().oad && load().oad.storage);
export const decoOwned = () => !!(load().oad && load().oad.deco);
// 소장자 장식: 원어데이 밖 'hidden' · 소장 'open' · 아니면 'locked'(소장하면 열려요)
export const ownerDeco = () => !oadOn() ? 'hidden' : bm.info.owned ? 'open' : 'locked';

// ── 골드 쓰기: 확인 창 · 로그인 · 충전은 앱이 → ok 면 여기서 지급
export async function buy(item) {
  if (!oadOn() || !goldPrice(item)) return { ok: false, reason: 'off' };
  const r = await bm.spend(item); if (!r || !r.ok) return r || { ok: false, reason: 'error' };
  const d = load(), o = oad();
  if (item === 'gems100') d.gems += 100;
  else if (item === 'storage') o.storage = true;
  else if (item === 'deco') { if (!o.deco) giveDeco(GOLD_DECO); o.deco = true; }
  (d.goldLog = d.goldLog || []).push({ item, gold: goldPrice(item), at: Date.now() }); if (d.goldLog.length > 30) d.goldLog.shift();
  save(); return r;
}
export const goldMsg = r => !r || r.reason === 'cancel' ? '' : r.reason === 'short' ? '골드가 조금 모자라요' : r.reason === 'login' ? '원어데이에 로그인하면 쓸 수 있어요' : r.reason === 'limit' ? '오늘은 더 살 수 없어요 · 내일 다시 열려요' : '지금은 쓸 수 없어요 · 잠시 뒤 다시 해 봐요';

// ── 보상형 광고 (자리별 하루 횟수 = 게임 쪽 상한 · 앱의 게임당 한도와 둘 다 지킴)
export const AD_LIMIT = { speed: 5, boost: 3 };
export const SPEED_MS = 30 * 60e3;                         /* 생산 30분 단축 */
function adDay() { const d = load(); if (!d.adUse || d.adUse.day !== dayNo()) d.adUse = { day: dayNo(), speed: 0, boost: 0 }; return d.adUse; }
export const adLeft = pl => !oadOn() ? 0 : Math.max(0, (AD_LIMIT[pl] || 0) - (adDay()[pl] || 0));
export const adsOpen = () => oadOn() && (isOwner() || !!(bm.info.ads && bm.info.ads.reward));
export const canAd = pl => adsOpen() && adLeft(pl) > 0;
export const adLabel = what => isOwner() ? `바로 ${what}` : `▶ 광고 보고 ${what}`;
// 성공이면 횟수 기록 후 true → 부른 쪽이 보상을 줌
export async function rewardAd(pl) {
  if (!canAd(pl)) return false;
  const r = await bm.rewardedAd(pl); if (!r || !r.ok) return false;
  adDay()[pl]++; save(); return true;
}
// 판(놀이) 끝 전면 광고 자리: 앱이 그룹 · 간격 · 소장 조건을 보고 정함 (성공한 판에서만 부름 — 실패 직후 X)
export const roundEnd = () => { try { bm.interstitial('round_end'); } catch { /* */ } };

// ── 연속 실패 응원 선물 (성장·경영형: 그날 처음 '건축 재료가 모자라 막힌' 순간)
//   크기: 모자란 재료 1개 (보석으로 치면 💎4 < 광고 1회 30분 단축 💎6) · 하루 1번 · 레벨 4부터(재료를 모으기 시작한 뒤)
//   켜짐 · 꺼짐 두 그룹 모두 help_eligible(on 1/0) 한 번 → 켜짐만 help_offer → help_take / help_decline
export const HELP_LV = 4, HELP_N = 1;
export const helpOn = () => bm.helpOn();
export function track(name, p) { try { if (window.parent !== window) window.parent.postMessage({ type: 'oad:track', name, p: { game: 'farm', ...p } }, location.origin); } catch { /* */ } }
// 조건이 맞으면 줄 재료 키를 돌려줌 (꺼짐 그룹은 기록만 하고 null) · 하루 한 번만 판정
export function helpCheck(need, missingOf) {
  const d = load(); if (d.lv < HELP_LV) return null;
  const lack = Object.entries(need).map(([k, n]) => [k, n - (d.items[k] || 0)]).filter(([, m]) => m > 0).sort((a, b) => b[1] - a[1]);
  if (!lack.length) return null;
  if (d.help && d.help.day === dayNo()) return null;
  d.help = { day: dayNo(), n: ((d.help && d.help.n) || 0) + 1 }; save();
  const on = helpOn(), it = lack[0][0]; track('help_eligible', { on: on ? 1 : 0, kind: 'mats', it, lv: d.lv });
  if (!on) return null;
  track('help_offer', { kind: 'mats', it, amount: HELP_N, lv: d.lv }); return it;
}
export function helpTake(it) { add(it, HELP_N); save(); track('help_take', { kind: 'mats', it, amount: HELP_N, lv: load().lv }); }
export const helpDecline = it => track('help_decline', { kind: 'mats', it, lv: load().lv });
