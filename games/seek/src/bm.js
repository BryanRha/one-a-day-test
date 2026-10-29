// 원어데이 게임 안 BM (docs/bm-policy.md) — 가격은 서버 표(gold.js SHOP.seek)만 기준 · 요청은 oad_bm.js 로만
//   hearts  하트 채우기 🪙20 · hearts2 한 번 더 🪙40 : 증거 대조에서 하트를 다 잃은 '아깝다' 순간 (절반 이상 찾았을 때) — 첫째는 광고(같은 보상 ♥ 가득 · 하루 2)도
//   hint    광고 보고 힌트 1개 (하루 3) : 코인이 모자랄 때 (골드 상품 아님 · 옆에 코인 가격)
//   instN   다음 화 바로 보기 = 🪙50 × 남은 비율(올림 · 최소 1 · 등급으로 내림) — bm-policy 2-1 '즉시 완성' (2026-10-29, 예전 next 50 고정은 사용 중단)
//           앞 화를 끝내고 WAIT 시간 뒤면 무료 · 10초 미만 남으면 버튼 숨김 · 소장자는 기다림 없음 · 원어데이 밖도 기다림 없음
//   outfit  특별 코디 🪙200 (item) : 오늘의 코디 옷장 · hello().items 로 복원
//   choiceN 특별 선택지 🪙30 (item, 화별) : special.js — 첫 1회 맛보기 무료
//   선택지는 광고로 열지 않음 (이야기 가치 보호)
import { bm } from './oad_bm.js?v=0.92.1';
import { inOAD } from './oad.js?v=0.92.1';
import { load, save } from './save.js?v=0.92.1';
import { EPISODES } from './episodes.js?v=0.92.1';

export { bm };
export const HINT_COST = 10;                   // 힌트 = 게임 코인 10 (골드 상품 아님)
export const AD_DAY = { hint: 3, heart: 2 };   // 게임 쪽 자리별 하루 횟수 (앱 한도와 별개로 둘 다 지킴)
export const GATE = { free: 3, waitH: 3 };     // 처음 3화는 기다림 없이 · 그다음부터 앞 화를 끝내고 3시간 뒤 무료
export const today = () => { const t = new Date(); return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`; };

// 원어데이 안(hello().ok)일 때만 골드 · 광고 · 전용 코디 · 기다림
export const oadOn = () => !!bm.info.ok;
export const owner = () => !!(bm.info.ok && bm.info.owned);
export const price = sku => bm.price(sku);
export const gold = () => (bm.info.ok ? bm.info.gold ?? 0 : 0);

// 앱 기록 (oad:track) — 원어데이 밖이면 아무것도 안 함
export function track(name, p = {}) { if (!inOAD) return; try { window.parent.postMessage({ type: 'oad:track', name, p: { game: 'seek', ...p } }, '*'); } catch { /* */ } }

// ── 보상형 광고 (자리별 하루 횟수)
function adDay() { const d = load(); if (!d.ads || d.ads.day !== today()) d.ads = { day: today(), hint: 0, heart: 0 }; return d.ads; }
export const adLeft = kind => (oadOn() && bm.info.ads && bm.info.ads.reward !== false ? Math.max(0, AD_DAY[kind] - (adDay()[kind] || 0)) : 0);
// 광고 버튼 글자: 소장자는 광고 없이 바로 (횟수는 같음)
export const adLabel = what => (owner() ? `소장 혜택 · ${what} 바로` : `광고 보고 ${what}`);
export async function watchAd(kind) {
  if (adLeft(kind) <= 0) return { ok: false, reason: 'limit' };
  const r = await bm.rewardedAd(kind === 'hint' ? 'hint' : 'heart');
  if (r.ok) { const a = adDay(); a[kind] = (a[kind] || 0) + 1; save(); }
  return r;
}
export const failText = r => r.reason === 'short' ? '골드가 조금 모자라요' : r.reason === 'login' ? '원어데이에 로그인하면 쓸 수 있어요' : r.reason === 'limit' ? '오늘은 여기까지 쓸 수 있어요' : r.reason === 'cancel' ? '' : '지금은 쓸 수 없어요';

// ── 다음 화 기다리기 (기다리면 무료 · 🪙50 바로)
// 열린 화: 처음 GATE.free 화 · 이미 시작했거나 본 화 · 골드로 연 화 · 소장자 · 원어데이 밖 · 앞 화를 끝내고 기다린 화
export function waitLeft(ep, now = Date.now()) {
  const i = EPISODES.indexOf(ep); if (i < GATE.free || !oadOn() || owner()) return 0;
  const d = load(), e = d.ep[ep.id]; if (e && e.step) return 0;
  if ((d.gate || {})[ep.id]) return 0;
  const prev = d.ep[EPISODES[i - 1].id];
  if (!prev || prev.step !== 'done') return Infinity;   // 앞 화를 아직 안 봄 (차례대로)
  if (!prev.at) return 0;                                 // 예전 저장(끝낸 시각 없음)은 열어 둠
  return Math.max(0, prev.at + GATE.waitH * 3600e3 - now);
}
export const epOpen = ep => waitLeft(ep) === 0;
export const fmtWait = ms => { const m = Math.ceil(ms / 60000), h = Math.floor(m / 60); return h ? `${h}시간 ${m % 60}분` : `${m}분`; };
// 다음 화 바로 보기 값: 기다림 전체(3시간) = 🪙50 · 남은 만큼만 (서버 SHOP.seek instN 등급 · 화면 값 = 실제 차감)
export const NEXT_GOLD = 50, INST_MIN = 10e3;
export const INST = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50];
export function nextGold(ms) { if (!(ms >= INST_MIN) || ms === Infinity) return 0; const g = Math.max(1, Math.ceil(NEXT_GOLD * Math.min(1, ms / (GATE.waitH * 3600e3)))); return INST.reduce((a, v) => (v <= g ? v : a), INST[0]); }
export const nextPrice = ms => { const g = nextGold(ms); return g && price(`inst${g}`) === g ? g : 0; };
export async function buyNext(ep) {
  const g = nextPrice(waitLeft(ep)); if (!g) return { ok: false, reason: waitLeft(ep) ? 'off' : 'open' };
  const r = await bm.spend(`inst${g}`);
  if (r.ok) { const d = load(); (d.gate ||= {})[ep.id] = Date.now(); save(); track('next_buy', { ep: ep.id, gold: g }); }
  return r;
}

// ── 특별 코디 (item) · 소장자 코디
let boughtOutfit = false;   /* 이번 실행에서 산 것 (다음 실행부터는 hello().items) */
export const outfitBought = () => oadOn() && (boughtOutfit || (bm.info.items || []).includes('outfit'));
export async function buyOutfit() { const r = await bm.spend('outfit'); if (r.ok) boughtOutfit = true; return r; }

// 판이 끝날 때 (숨은 물건 · 증거 대조를 끝냈을 때만 — 실패 직후엔 부르지 않음)
export const roundEnd = () => { bm.interstitial('round_end').catch(() => {}); };
