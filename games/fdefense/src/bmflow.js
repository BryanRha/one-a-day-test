// 원어데이 BM 연결 (oad_bm.js 는 공통 파일 — 고치지 않음). 게이트 시험판: hello 와 일시정지 연동만
import { bm } from './oad_bm.js?v=0.99.24';
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
export const adReady = () => oadOn() && !!(bm.info.ads && bm.info.ads.reward);
// 기록 (원어데이 운영실)
export function track(name, p = {}) {
  const q = { game: 'fdefense', ...p };
  try { (window.__tracks || (window.__tracks = [])).push({ name, p: q }); } catch { /* */ }
  try { if (window.parent !== window) window.parent.postMessage({ type: 'oad:track', name, p: q }, '*'); } catch { /* */ }
}
