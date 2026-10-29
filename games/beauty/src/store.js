// 유료화 창구 하나 — 상품 목록 · 구매 · 광고 보상 · 원어데이 골드
// 원화 결제(PROVIDER): 지금은 꺼짐(enabled=false) → 원어데이 밖에선 '곧 열려요', 원어데이 안에선 골드 상품으로 대체
// 원어데이 안(oad_bm hello().ok): 광고 자리 3곳(energy · bubble · dailyBonus) = bm.rewardedAd · 골드 = bm.spend (가격은 서버 SHOP.beauty 만 기준)
//   소장자는 rewardedAd 가 via:'owner' 로 광고 없이 바로 성공 · 원어데이 밖에선 광고 · 골드 버튼을 숨기고 지금처럼
import { load, save } from './save.js?v=0.92.5';
import { bm } from './oad_bm.js?v=0.92.5';
import { today, tickEnergy } from './state.js?v=0.92.5';
import { ENERGY } from './data.js?v=0.92.5';

export const PRODUCTS = [
  { id: 'gems_s', n: '보석 한 줌', price: 1200, gems: 80, tag: '' },
  { id: 'gems_m', n: '보석 주머니', price: 5900, gems: 450, tag: '인기' },
  { id: 'gems_l', n: '보석 상자', price: 12000, gems: 1000, tag: '+20%' },
  { id: 'energy', n: '에너지 충전 팩', price: 2500, energy: 200, tag: '' },
  { id: 'starter', n: '스타터 패키지', price: 3300, gems: 150, energy: 100, gift: 2, once: true, tag: '1회 한정' },
  { id: 'pass', n: '프리미엄 시즌 패스', price: 9900, ent: 'pass', tag: '이번 시즌' },
  { id: 'storage', n: '창고 +4칸', price: 2500, ent: 'storage4', once: true, tag: '' },
  { id: 'piggy', n: '보석 저금통 깨기', price: 4900, piggy: true, tag: '모은 만큼' },
  { id: 'cards', n: '카드 팩 묶음', price: 3900, packs: { gold: 3, diamond: 1 }, tag: '앨범' },
];
export const won = p => `₩${p.toLocaleString()}`;

// 결제 · 광고 연결 (지금은 꺼 둠)
const PROVIDER = {
  enabled: false,
  async buy(/* product */) { throw new Error('disabled'); },
  adsEnabled: false,
  async showAd(/* placement */) { throw new Error('disabled'); },
};
export const storeOpen = () => PROVIDER.enabled;

// 구매: 결제 성공 → 지급 → 기록 (영수증 id 로 중복 지급 방지)
export async function purchase(id) {
  const p = PRODUCTS.find(x => x.id === id); if (!p) throw new Error('unknown');
  const d = load(); if (p.once && d.purchases.some(r => r.id === id)) throw new Error('owned');
  const receipt = await PROVIDER.buy(p);
  if (receipt && d.purchases.some(r => r.rid === receipt.rid)) return p;
  grant(p); d.purchases.push({ id, rid: receipt && receipt.rid, at: Date.now() }); save(); saveReceipts(); return p;
}
export function grant(p) {
  const d = load();
  if (p.gems) d.gems += p.gems;
  if (p.energy) d.energy += p.energy;
  if (p.gift) d.pendingGifts = (d.pendingGifts || 0) + p.gift;
  if (p.piggy) { d.gems += d.piggy || 0; d.piggy = 0; }
  if (p.packs) { d.album = d.album || { have: {}, stars: 0, jokers: 0, packs: { basic: 0, gold: 0, diamond: 0 }, done: [], all: false, orders: 0 }; for (const [k, n] of Object.entries(p.packs)) d.album.packs[k] = (d.album.packs[k] || 0) + n; }
  if (p.ent) d.ent[p.ent] = true;
  save();
}
// ── 영수증 따로 보관: 'kbeauty_receipts_v1' (원어데이가 로그인한 사람은 소장과 상관없이 계정에 저장 · SAVES_ALWAYS)
//   본 저장(kbeauty_v1)이 새 기기 · 지운 기록이라도 시작 때 영수증을 합쳐 되살림
//   중복 지급 방지: 영수증 목록만 합치고, 다시 주는 건 영구 권리(시즌 패스 · 창고 +4 = ent)뿐 — 보석 · 에너지 같은 소모품은 다시 주지 않음
export const RECEIPT_KEY = 'kbeauty_receipts_v1';
const rkey = r => r.rid || `${r.id}@${r.at}`;
function readReceipts() { try { const o = JSON.parse(localStorage.getItem(RECEIPT_KEY) || 'null'); return o && Array.isArray(o.list) ? o.list.filter(r => r && r.id && r.at) : []; } catch { return []; } }
export function saveReceipts() {
  const d = load(), seen = new Set(), list = [];
  for (const r of [...readReceipts(), ...d.purchases]) { const k = rkey(r); if (!seen.has(k)) { seen.add(k); list.push(r); } }
  list.sort((a, b) => a.at - b.at); try { localStorage.setItem(RECEIPT_KEY, JSON.stringify({ v: 1, list })); } catch { /* */ }
}
export function syncReceipts() {
  const d = load(), have = new Set(d.purchases.map(rkey)); let n = 0;
  for (const r of readReceipts()) { if (have.has(rkey(r))) continue; d.purchases.push({ ...r }); have.add(rkey(r)); n++;
    const p = PRODUCTS.find(x => x.id === r.id); if (p && p.ent) d.ent[p.ent] = true; }
  if (n) { d.purchases.sort((a, b) => a.at - b.at); save(); }
  saveReceipts(); return n;
}

// ── 원어데이 연결 (게임 시작 때 initBM 한 번 → 이후 화면은 캐시만 봄)
let helloP = null;
export const initBM = () => helloP || (helloP = bm.hello().catch(() => null));
export const oadOn = () => !!bm.info.ok;
export const isOwner = () => !!(bm.info.ok && (bm.info.owned || bm.info.noAds));
export const goldPrice = item => bm.price(item);            /* 0 이면 그 골드 상품 없음 */
export const GOLD_GEMS = 100;                               /* gems100 = 보석 100개 */
// 응원 선물 실험: 원어데이 안에선 hello().help (꺼짐 그룹이면 false) · 원어데이 밖은 늘 켜짐
export const helpOn = () => bm.helpOn();
// 기록: 앱이 g_<name> 으로 남김 (원어데이 밖이면 아무 일 없음)
export function track(name, p) { try { if (window.parent !== window) window.parent.postMessage({ type: 'oad:track', name, p }, location.origin); } catch { /* */ } }
// 소장자 전용 장식 1종 (겉모습만 · 능력치 없음 · 골드 상품 아님): 원어데이 밖 'hidden' · 소장 'open' · 아니면 'locked'(소장하면 열려요)
export const OWNER_DECO = { n: '할머니의 황금 동백함', img: 'camellia10', desc: '소장자만 가게에 둘 수 있는 황금 진열대' };
export const ownerDeco = () => !oadOn() ? 'hidden' : bm.info.owned ? 'open' : 'locked';
// 광고 자리별 하루 횟수 (게임 쪽 상한 · 앱의 게임당 한도와 둘 다 지킴)
export const AD_LIMIT = { energy: 3, bubble: 3, dailyBonus: 1 };
export const AD_ENERGY = 20;
function adDay() { const d = load(); if (!d.adUse || d.adUse.day !== today()) { d.adUse = { day: today(), energy: 0, bubble: 0, dailyBonus: 0 }; } return d.adUse; }
/* '남은 N번' = 자리 상한과 앱의 게임당 남은 횟수(hello().ads.rewardLeft, 앱 shell/bm.js 게임당 5) 중 작은 값 = 실제로 볼 수 있는 횟수 */
const appLeft = () => { const a = bm.info.ads || {}; return Number.isFinite(a.rewardLeft) ? a.rewardLeft : 99; };
export const adLeft = placement => !oadOn() ? 0 : Math.max(0, Math.min((AD_LIMIT[placement] || 0) - (adDay()[placement] || 0), appLeft()));
// ── 에너지 채우기 (docs/bm-policy.md 2-1 · 2026-10-29): 가득까지 채울 양에 비례 — 5마다 1골드(◆10 = ⚡50 보석 경로와 같은 값) · 등급으로 내림 · 채울 양 0 이면 끔
//   서버 SHOP.beauty fillN(N골드) 이 같은 값일 때만 → 버튼 값 = 실제 차감 · 예전 energy(25 고정)는 사용 중단
export const FILL = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
export const fillNeed = () => { tickEnergy(); return Math.max(0, ENERGY.max - load().energy); };
export const fillGold = need => (need > 0 ? FILL.reduce((a, v) => (v <= Math.ceil(need / 5) ? v : a), FILL[0]) : 0);
export const fillPrice = g => (g && goldPrice(`fill${g}`) === g ? g : 0);
export async function buyFill() { const need = fillNeed(), g = fillGold(need); if (!fillPrice(g)) return { ok: false, reason: need ? 'off' : 'full' }; const r = await spendGold(`fill${g}`); if (r && r.ok) { const d = load(); d.energy = Math.max(d.energy, ENERGY.max); d.eAt = Date.now(); save(); } return r; }
// 이 자리 광고 버튼을 보여 줄지: 원어데이 안 + (소장자이거나 앱이 보상형 허용)
export const adsOpen = () => oadOn() && (isOwner() || !!(bm.info.ads && bm.info.ads.reward)) || PROVIDER.adsEnabled;
export const canAd = placement => adsOpen() && adLeft(placement) > 0;
// 버튼 글: 소장자는 '바로 받기', 아니면 '광고 보고'
export const adLabel = (what, short) => isOwner() ? `바로 ${what}` : `▶ 광고${short ? '' : ' 보고'} ${what}`;
// 광고 보상: 성공(true)이면 횟수 기록 → 호출한 쪽이 보상 지급 · 실패면 false (보상 없음)
export async function rewardAd(placement) {
  if (!canAd(placement)) return false;
  const r = await bm.rewardedAd(placement);
  if (!r || !r.ok) return false;
  adDay()[placement]++; save(); return true;
}
// 골드 쓰기: 확인 창 · 로그인 · 충전은 앱이 → ok 면 호출한 쪽이 지급 (중복 지급 방지는 앱/서버가 요청 id 로)
export async function spendGold(item) {
  if (!oadOn() || !goldPrice(item)) return { ok: false, reason: 'off' };
  const r = await bm.spend(item);
  if (r && r.ok) { const d = load(); d.purchases.push({ id: `gold_${item}`, rid: r.ref || undefined, gold: goldPrice(item), at: Date.now() }); save(); saveReceipts(); }
  return r || { ok: false, reason: 'error' };
}
// 골드 실패 이유 → 부드러운 한마디 (취소는 조용히)
export const goldMsg = r => !r || r.reason === 'cancel' ? '' : r.reason === 'short' ? '골드가 조금 모자라요' : r.reason === 'login' ? '원어데이에 로그인하면 쓸 수 있어요' : r.reason === 'limit' ? '오늘은 더 살 수 없어요 · 내일 다시 열려요' : '지금은 쓸 수 없어요 · 잠시 뒤 다시 해 봐요';
