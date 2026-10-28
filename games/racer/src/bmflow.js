// 빵빵 질주 ↔ 원어데이 BM 연결 (게임 쪽 도우미 — 공통 파일 oad_bm.js 는 고치지 않음)
//   · 시작 때 hello 한 번 (결과는 bm.info 로 바로 읽음 · 원어데이 밖이면 ok = false → 골드 · 광고 · 스킨 · 명예의 전당 숨김)
//   · 광고 · 확인 창 동안 게임 전체를 멈춤 (실시간 레이스 — 루프 · 타이머 · 카운트다운 · 소리까지)
//   · 광고 자리별 하루 횟수 (이어하기 5 · 코인 2배 3) · 응원 선물 상태 · 앱 기록(oad:track)
import { bm } from './oad_bm.js?v=0.79.0';
import { load, save, todayKey } from './save.js?v=0.79.0';
import { AD_DAY } from './core/cont.js?v=0.79.0';
import { helpDay, noteRun, eligible, markShown } from './core/help.js?v=0.79.0';

let hp = null;
export function helloOnce() {
  return hp || (hp = bm.hello().then(h => {
    /* ?oadtest=1 가짜 지갑엔 이 게임 스킨 값이 다를 수 있어 시험용으로만 맞춤 (실제 가격은 서버 SHOP.racer.skin = 300) */
    if (h && h.test && h.prices) h.prices.skin = 300;
    return h;
  }));
}
export function initBM(game) {
  bm.onPause = on => {
    try {
      if (on) { game.loop.sleep(); game.sound.pauseAll(); }
      else { game.loop.wake(); game.sound.resumeAll(); }
    } catch { /* */ }
  };
  return helloOnce();
}

// item 상품 복원: hello().items 가 문자열 · { sku } · 'racer:skin' 어느 모양이어도 받음
export function hasItem(sku) {
  return (bm.info.items || []).some(x => { const k = typeof x === 'string' ? x : (x && (x.sku || x.id)) || ''; return k === sku || k.endsWith(':' + sku); });
}

// 광고 자리별 하루 횟수 (게임 쪽 — 앱의 게임당 하루 5 · 앱 15 한도와 별개로 자리별로 아낌)
export function adLeft(place) { const d = load(); if (!d.ads || d.ads.day !== todayKey()) return AD_DAY[place]; return Math.max(0, AD_DAY[place] - (d.ads[place] || 0)); }
export function adUse(place) { const d = load(); if (!d.ads || d.ads.day !== todayKey()) d.ads = { day: todayKey() }; d.ads[place] = (d.ads[place] || 0) + 1; save(); }

// 앱 기록 (운영실): help_eligible · help_offer · help_take · help_decline — 원어데이 밖이면 보내지 않음 (시험용으로 window.__tracks 에도 남김)
const inFrame = (() => { try { return window.parent !== window; } catch { return true; } })();
export function track(name, p = {}) {
  const q = { game: 'racer', ...p };
  try { (window.__tracks || (window.__tracks = [])).push({ name, p: q }); } catch { /* */ }
  if (inFrame) try { window.parent.postMessage({ type: 'oad:track', name, p: q }, location.origin); } catch { /* */ }
}

// ── 응원 선물 (규칙은 core/help.js) ──
function helpState() { const d = load(); d.help = helpDay(d.help, todayKey()); return d.help; }
// 판이 끝날 때 (Play.finish)
export function helpNoteRun(run) { const h = helpState(); noteRun(h, run); save(); return h.streak; }
// 다음 판 시작 때: 조건이 맞으면 두 그룹 모두 help_eligible { on: 1/0 } → 켜짐이면 true(선물 창), 꺼짐이면 기록만 하고 이번 조건을 씀
export function helpCheck() {
  const h = helpState();
  if (!eligible(h)) return false;
  const on = bm.helpOn();
  track('help_eligible', { on: on ? 1 : 0, streak: h.streak });
  markShown(h); save();
  return on;
}
