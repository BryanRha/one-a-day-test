// 원어데이 BM 연결 (oad_bm.js 는 공통 파일 — 고치지 않음). 게이트 시험판: hello 와 일시정지 연동만
import { bm } from './oad_bm.js?v=0.99.51';
export { bm };
let helloP = null;
export function helloOnce() { if (!helloP) helloP = bm.hello().catch(() => ({ ok: false })); return helloP; }
export function initBM(game) {
  helloOnce();
  // 광고 · 확인 창: 루프를 재우고, 판 안이면 전략 정지로 들어간다 (돌아와도 스스로 재개하지 않음 — 사용자가 ▶ 를 누른다)
  bm.onPause = on => { try { if (on) { const p = game.scene.isActive('Play') && game.scene.getScene('Play'); if (p && p.pause) p.pause({ auto: true }); game.sound.pauseAll(); game.loop.sleep(); } else { game.loop.wake(); game.sound.resumeAll(); } } catch { /* */ } };
}
export const oadOn = () => !!(bm.info && bm.info.ok);
export const owned = () => !!(bm.info && bm.info.ok && bm.info.owned);
/* 광고 · 골드 자리 여닫이 — 광고 · 골드 단추 · 가격 · 안내문은 반드시 이것만 묻고 그림
   (2026-11-16 실서버: 광고 끔 · 골드 닫음인데 '원어데이 안인가(oadOn)'만 보고 이어하기 창을 띄우고 값을 기본값 20으로 메워 막다른 단추가 남았음)
   · can.ad(): 지금 보상형 광고를 볼 수 있나 (대조군 A · 광고 끔 · 오늘 한도 끝 = false)
   · can.gold(sku): 그 상품의 골드 값 (가격표에 없으면 0 = 팔지 않음 — 기본값으로 메우지 않음)
   · can.anyGold(): 이 게임에 골드 상품이 하나라도 열려 있나
   · can.inter(): 판 끝 전면 광고를 앱에 물어봐도 되나
   · can.cont(n, adUsed): n 번째(0부터) 이어하기에서 쓸 수 있는 길 { ad, sku, price, any } — any 가 false 면 권유 창을 띄우지 않고 바로 결과로
   공통 창구(oad_bm)에 같은 뜻의 함수가 생기면 여기만 바꾸면 됨. 단추에는 setData('bm', 'ad' | 'gold') — tools/bm_closed.mjs 가 닫힌 상태에서 0개인지 셈 */
export const can = {
  ad: () => oadOn() && !!(bm.info.ads && bm.info.ads.reward),
  gold: sku => (oadOn() ? bm.price(sku) : 0),
  anyGold: () => oadOn() && Object.values(bm.info.prices || {}).some(v => v > 0),
  inter: () => oadOn() && !!(bm.info.ads && bm.info.ads.inter),
  cont: (n, adUsed) => { const sku = n === 0 ? 'cont1' : 'cont2', price = can.gold(sku), ad = !adUsed && can.ad(); return { ad, sku, price, any: ad || price > 0 }; },
};
// 기록 (원어데이 운영실)
export function track(name, p = {}) {
  const q = { game: 'fdefense', ...p };
  try { (window.__tracks || (window.__tracks = [])).push({ name, p: q }); } catch { /* */ }
  try { if (window.parent !== window) window.parent.postMessage({ type: 'oad:track', name, p: q }, '*'); } catch { /* */ }
}
