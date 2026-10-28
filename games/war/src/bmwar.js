// 작전명 허스키 × 원어데이 BM (docs/bm-policy.md · 서버 가격표 SHOP.war — 가격은 서버만 기준)
//   한 턴 되돌리기 'undo' 🪙10 (서버 하루 10) — 캠페인 · 자유 대전만 (오늘의 작전 · 전쟁실 = 순위 경쟁이라 없음) · 소장자 하루 3번 무료
//   부대 색 'color' 🪙250 (item) — color.js
//   보상형 광고: 작전 실패 후 '같은 배치로 다시' 보급 보너스(경전차 지원) 하루 2번 — 판 중간 광고 없음
//   응원 선물(6장 · 단계형): 같은 캠페인 작전 3연속 패배 → 다음 도전 시작 때 지원 부대 · 6번째부터 조금 더
//     3번째 패배부터는 응원 선물이 광고 보급 보너스 자리를 대신 (선물을 줄 수 없을 때만 — 꺼짐 그룹 · 하루 한도 — 광고가 다시 보임)
//   전면 광고: 작전 사이(결과 → 다음 작전)에서만 bm.interstitial('round_end')
import { bm } from './oad_bm.js?v=0.76.0';
import { inOAD } from './oad.js?v=0.76.0';
import { load, save } from './save.js?v=0.76.0';

export const BMW = { ownerUndo: 3, supplyPerDay: 2, helpPerDay: 2, streak: 3, streak2: 6, minDay: 3, firstBattles: 3 };
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const autoRun = () => /[?&]auto(=|&|$)/.test(location.search);

// 앱 기록 (oad:track) — 원어데이 밖이면 아무것도 안 함
export function track(name, p = {}) { if (!inOAD) return; try { window.parent.postMessage({ type: 'oad:track', name, p: { game: 'war', ...p } }, location.origin); } catch { /* */ } }

function day() {
  const d = load(), k = dayKey();
  if (!d.bm || d.bm.day !== k) d.bm = { day: k, undoFree: 0, supply: 0 };
  if (!d.help || d.help.day !== k) d.help = { day: k, n: 0, fails: (d.help && d.help.fails) || {} };
  return d;
}
export const shopOn = () => !!bm.info.ok;                                   /* 원어데이 안 (밖이면 골드 · 광고 · 전용 꾸미기 숨김) */
export const owned = () => !!(bm.info.ok && bm.info.owned);
export const rankMode = mode => mode === 'daily' || mode === 'war';

// ── 한 턴 되돌리기 ──
export const undoMode = mode => shopOn() && (mode === 'campaign' || mode === 'free');
export const undoFreeLeft = () => (owned() ? Math.max(0, BMW.ownerUndo - day().bm.undoFree) : 0);
export async function payUndo() {
  if (undoFreeLeft() > 0) { const d = day(); d.bm.undoFree++; save(); return { ok: true, via: 'owner' }; }
  return bm.spend('undo');
}

// ── 응원 선물 ──
// 진 판으로 셀지: 3일째까지 버틴 판만 (바로 항복 · 일부러 지기는 세지 않고 연속도 끊지 않음)
export const counted = r => !r.win && r.day >= BMW.minDay;
export function noteResult(r) {
  if (r.mode !== 'campaign') return 0;
  const d = day(), f = d.help.fails;
  if (r.win) f[r.mapId] = 0; else if (counted(r)) f[r.mapId] = (f[r.mapId] || 0) + 1;
  save(); return f[r.mapId] || 0;
}
export const fails = mapId => day().help.fails[mapId] || 0;
export const giftKind = mapId => (fails(mapId) >= BMW.streak2 ? 'gift2' : fails(mapId) >= BMW.streak ? 'gift' : null);
// 다음 도전에 선물을 줄 수 있나 (켜짐 그룹 · 하루 한도 안) — 결과 화면에서 광고 보급 보너스를 대신할지 판단
export const giftReady = mapId => !!giftKind(mapId) && day().help.n < BMW.helpPerDay && bm.helpOn();
// 작전 시작 때 부름: 조건이 맞으면 두 그룹 모두 help_eligible 한 번 · 켜짐이면 선물 종류(→ 선물 창) · 꺼짐이면 null
export function helpCheck(mapId) {
  const kind = giftKind(mapId), d = day();
  if (!kind || d.help.n >= BMW.helpPerDay) return null;
  const on = bm.helpOn();
  track('help_eligible', { on: on ? 1 : 0, m: mapId, gift: kind, fails: fails(mapId) });
  d.help.n++; save();
  return on ? kind : null;
}

// ── 광고 보급 보너스 (작전 실패 후 같은 배치로 다시) ──
export const supplyLeft = () => Math.max(0, BMW.supplyPerDay - day().bm.supply);
// 결과 화면에 보일지: 원어데이 안 · 캠페인/자유 대전 AI · 진 판(3일 이상) · 처음 3판 이후 · 응원 선물이 대신하지 않을 때
export function supplyShow(r) {
  if (!shopOn() || autoRun() || r.win || !(r.mode === 'campaign' || r.mode === 'free') || !counted(r)) return false;
  if (load().battles <= BMW.firstBattles) return false;
  if (r.mode === 'campaign' && giftReady(r.mapId)) return false;
  return true;
}
export async function takeSupply() {
  if (!supplyLeft()) return { ok: false, reason: 'limit' };
  const r = await bm.rewardedAd('supply');
  if (r.ok) { const d = day(); d.bm.supply++; save(); }
  return r;
}

// 작전 사이 전면 광고 (앱이 그룹 · 간격 · 소장 · 첫날을 판단) — 자동 시험 판은 건너뜀
export async function between() { if (autoRun()) return; try { await bm.interstitial('round_end'); } catch { /* */ } }
