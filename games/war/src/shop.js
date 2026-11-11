// 보급 상점 (v0.12 · 원어데이 테스터 시트 #1 · #2) — 규칙 한곳
//   보급품(한 판 소모 · 기지 생산을 돕는 것): 작전 자금 +5,000 · 경전차 지원 1기 — 일반 작전 · 자유 대전(AI)만 · 특수 작전 · 전쟁실(순위) · 2인 대전엔 못 씀
//     크기: 광고 보급 보너스(경전차 + 소총병) 이하 — tools/help_bot.mjs 로 측정 (아래 SUPPORT 주석)
//   지휘관 영입: 일반 작전으로도 합류하는 지휘관을 먼저 데려옴 (막힌 길을 여는 게 아님 · 능력치는 원래 그대로)
//   사는 길 세 가지: 훈장(플레이로 모이는 게임 재화) · 원어데이 골드(서버 가격표에 있을 때만) · 광고(보급품만, 하루 SHOPW.adPerDay 번)
//   원어데이 밖이면 훈장 길만 (골드 · 광고 버튼 숨김)
import { bm } from './oad_bm.js?v=0.99.22';
import { load, save } from './save.js?v=0.99.22';
import { COS } from './core/data.js?v=0.99.22';
import { shopOn, owned, track } from './bmwar.js?v=0.99.22';
import { STAGES } from './meta.js?v=0.99.22';

export const SHOPW = { adPerDay: 3, coMedal: 30 };
export const KITS = {
  fund: { sku: 'kit_fund', medal: 3, name: '작전 자금', desc: '시작 자금 +5,000 · 기지에서 바로 생산', icon: 'b_base_b' },
  tank: { sku: 'kit_tank', medal: 5, name: '경전차 지원', desc: '본부 옆에 경전차 1기 합류', icon: 'u_ltank_b' },
};
export const KIT_ORDER = ['fund', 'tank'];
export const kitMode = mode => mode === 'campaign' || mode === 'free';
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function st() {
  const d = load();
  if (!d.kits) d.kits = { fund: 0, tank: 0 };
  if (!d.shop || d.shop.day !== dayKey()) d.shop = { day: dayKey(), ad: 0 };
  return d;
}
export const kitCount = k => st().kits[k] || 0;
export const kitTotal = () => KIT_ORDER.reduce((a, k) => a + kitCount(k), 0);
export const adLeft = () => Math.max(0, SHOPW.adPerDay - st().shop.ad);
export const adOn = () => shopOn() && adLeft() > 0 && bm.info.ads && bm.info.ads.reward !== false;
const give = (k, n = 1) => { const d = st(); d.kits[k] = (d.kits[k] || 0) + n; save(); };

// 보급품 사기: via 'medal' | 'gold' | 'ad' → { ok, reason }
export async function buyKit(k, via) {
  const K = KITS[k], d = st();
  if (via === 'medal') { if (d.medals < K.medal) return { ok: false, reason: 'medal' }; d.medals -= K.medal; give(k); track('shop_buy', { item: k, via }); return { ok: true }; }
  if (via === 'gold') { const r = await bm.spend(K.sku); if (r.ok) { give(k); track('shop_buy', { item: k, via }); } return r; }
  if (via === 'ad') {
    if (!adLeft()) return { ok: false, reason: 'limit' };
    const r = await bm.rewardedAd('shop_' + k);
    if (r.ok) { const d2 = st(); d2.shop.ad++; give(k); track('shop_ad', { item: k }); }
    return r;
  }
  return { ok: false, reason: 'off' };
}
// 출격 때 고른 보급품을 꺼냄 (모자라면 빼고) → 실제로 쓴 목록
export function takeKits(list) {
  const d = st(), out = [];
  for (const k of (list || []).slice(0, 1)) if (KITS[k] && (d.kits[k] || 0) > 0) { d.kits[k]--; out.push(k); }
  if (out.length) { save(); track('kit_use', { items: out.join(',') }); }
  return out;
}

// ── 지휘관 영입 ──
export const coSku = k => `co_${k}`;
export const coStage = k => STAGES.find(s => s.unlockCo === k) || null;
export const coGold = k => bm.price(coSku(k));
// 골드로 산 지휘관은 계정에 남음 (다음 실행 hello().items 로 복원)
export function restoreCos() {
  if (!shopOn()) return;
  const d = load(), items = bm.info.items || []; let n = 0;
  for (const k of Object.keys(COS)) if (!d.cos[k] && items.includes(coSku(k))) { d.cos[k] = 1; n++; }
  if (n) save();
}
export async function recruit(k, via) {
  const d = load(); if (d.cos[k]) return { ok: true };
  if (via === 'medal') { if (d.medals < SHOPW.coMedal) return { ok: false, reason: 'medal' }; d.medals -= SHOPW.coMedal; d.cos[k] = 1; save(); track('co_buy', { co: k, via }); return { ok: true }; }
  if (via === 'gold') { const r = await bm.spend(coSku(k)); if (r.ok) { d.cos[k] = 1; save(); track('co_buy', { co: k, via }); } return r; }
  return { ok: false, reason: 'off' };
}
export const failMsg = r => ({ medal: '훈장이 조금 모자라요 · 오늘의 미션으로 모아요', short: '골드가 조금 모자라요', login: '로그인하면 살 수 있어요', limit: '오늘은 더 받을 수 없어요', off: '지금은 살 수 없어요', timeout: '응답이 없어요 · 잠시 뒤 다시' }[r && r.reason] || null);
export { owned };
