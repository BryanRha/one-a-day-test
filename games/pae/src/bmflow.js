// 오늘의 패 ↔ 원어데이 BM 연결 (게임 쪽 도우미 — 공통 파일 oad_bm.js 는 고치지 않음)
//   · 시작 때 hello 한 번 · 원어데이 밖(ok=false)이면 골드 · 광고 버튼을 숨기고 게임은 그대로
//   · 가격은 서버 SHOP.pae (요청 목록 — team/dev/inbox) · ?oadtest=1 에선 시험 가격
//   · 사행성 회피: 골드 → 엽전(판 안 재화) 환전 없음 · 골드로 사는 건 이어하기(+1손) · 꽃잎 2배 · 외형뿐
import { bm } from './oad_bm.js?v=0.90.0';
import { load, save } from './save.js?v=0.90.0';
import { today } from './meta.js?v=0.90.0';

export const PRICE_TEST = { continue: 20, continue2: 40, petal2: 20, back: 300 };
let hp = null;
export function helloOnce() {
  return hp || (hp = bm.hello().then(h => {
    if (h && h.test && h.prices) for (const [k, v] of Object.entries(PRICE_TEST)) if (!h.prices[k]) h.prices[k] = v;
    return h;
  }));
}
export function initBM(game) {
  bm.onPause = on => { try { if (on) game.sound.pauseAll(); else game.sound.resumeAll(); } catch { /* */ } };
  return helloOnce();
}
export const bmOn = () => !!bm.info.ok;
export const owned = () => !!(bm.info.ok && bm.info.owned);
export const price = sku => bm.price(sku);
export function hasItem(sku) { return (bm.info.items || []).some(x => { const k = typeof x === 'string' ? x : (x && (x.sku || x.id)) || ''; return k === sku || k.endsWith(':' + sku); }); }
// 앱이 hello 에 오늘의 운세 시드를 실어 주면(요청 목록) 오늘의 패가 운세와 같은 패가 됨
export const fortuneSeed = () => (bm.info.ok && bm.info.fortune && bm.info.fortune.seed) || '';

// 패 뒷면 꾸미기: back(기본) · back_red(주칠 — 골드 'back') · back_gold(소장자 금박)
export const BACKS = [
  { id: 'back', name: '옻칠 자개', desc: '기본 뒷면' },
  { id: 'back_red', name: '주칠 자개', desc: '붉은 옻칠', sku: 'back' },
  { id: 'back_gold', name: '금박 봉황', desc: '소장자 전용 금박 패', owner: true },
];
export const backShown = b => !(b.sku || b.owner) || bmOn();
export function backOpen(b) { if (!b.sku && !b.owner) return true; if (!bmOn()) return false; return b.owner ? owned() : hasItem(b.sku); }
export function effBack() { const d = load(), b = BACKS.find(x => x.id === d.back); return b && backOpen(b) ? b.id : 'back'; }
export async function buyBack(b) { const r = await bm.spend(b.sku); if (r && r.ok) { const it = bm.info.items || (bm.info.items = []); if (!hasItem(b.sku)) it.push(b.sku); } return r || { ok: false, reason: 'error' }; }

// 이어하기 '한 손 더': 첫 번째는 광고(또는 20골드) · 두 번째는 40골드
//   반환 { ok, via } — 화면이 결과에 따라 +1손
export async function buyContinue(nth, how) {
  if (how === 'ad') { const r = await bm.rewardedAd('continue'); track('cont_ad', { ok: r.ok ? 1 : 0, nth }); return r; }
  const r = await bm.spend(nth === 0 ? 'continue' : 'continue2'); track('cont_gold', { ok: r.ok ? 1 : 0, nth }); return r;
}
export const adLeft = () => !!(bm.info.ok && bm.info.ads && bm.info.ads.reward);

// 꽃잎 2배 (판 끝 · 3관문 이상): 광고 1회 또는 20골드 · 하루 5번
export function dblUsed() { const d = load(); return d.dbl.date === today() ? d.dbl.n : 0; }
export function noteDbl(petals) { const d = load(); d.dbl = { date: today(), n: dblUsed() + 1 }; d.petals += petals; save(); }

let pending = false;
export const roundOver = () => { pending = true; };
export async function afterRound() { if (!pending) return; pending = false; try { await bm.interstitial('round_end'); } catch { /* 늘 넘어감 */ } }

const inFrame = (() => { try { return window.parent !== window; } catch { return true; } })();
export function track(name, p = {}) {
  try { (window.__tracks || (window.__tracks = [])).push({ name, p }); } catch { /* */ }
  if (inFrame) try { window.parent.postMessage({ type: 'oad:track', name, p }, location.origin); } catch { /* */ }
}
export const helpOn = () => bm.helpOn();
export { bm };
