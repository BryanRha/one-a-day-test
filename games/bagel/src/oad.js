// One a Day 연동 (원어데이 공통 규칙을 이 게임 구조에 맞춤)
// · 뒤로가기: 앱이 { type: 'oad:back' } 를 보내면 → 열린 창 닫기 → 화면별 처리 → 첫 화면이면 handled: false (앱이 게임을 닫음)
// · 원어데이로 버튼: exitToOAD()
export const inOAD = (() => { try { return window.parent !== window; } catch { return true; } })();
export const exitToOAD = () => { try { window.parent.postMessage({ type: 'oad:exit' }, '*'); } catch { /* */ } };
const stack = [];
export function pushBack(back) { const e = { back }; stack.push(e); return () => { const i = stack.indexOf(e); if (i >= 0) stack.splice(i, 1); }; }
export function installBack({ back }) {
  try { window.parent.postMessage({ type: 'oad:ready', back: true }, '*'); } catch { /* */ }
  const run = () => { while (stack.length) { const t = stack[stack.length - 1]; if (t.back() !== false) return true; stack.pop(); } return back(); };
  window.addEventListener('message', e => { if (!e.data || e.data.type !== 'oad:back') return; let h = false; try { h = run(); } catch (err) { console.warn(err); } try { window.parent.postMessage({ type: 'oad:back-result', handled: h }, '*'); } catch { /* */ } });
  if (inOAD && 'CloseWatcher' in window) { let w = null; const arm = () => { if (w) return; try { w = new CloseWatcher(); w.onclose = () => { w = null; let h = false; try { h = run(); } catch { h = false; } if (h) arm(); else exitToOAD(); }; } catch { w = null; } };
    arm(); addEventListener('pointerdown', arm, true); }
}
// ── 지표 기록 (IP사 협상 · 운영실 「마루미」 탭 — 계획안 5-2): 앱이 g_ 를 붙여 events 에 남김 · 이름 20자 안 · 개인 정보 없음
//   bg_room 방 · 특색 열림 · bg_branch 지점 계약/완성 · bg_ad 보상형 끝(자리) · bg_coupon 쿠폰 · bg_store 매장 가 보기 · bg_qr 매장 QR 선물 · bg_share 공유 · bg_sold 메뉴별 판매(하루 묶음) · bg_time 지점별 머문 초
export function track(name, p = {}) { (window.__track ||= []).push([name, p]); if (!inOAD) return; try { window.parent.postMessage({ type: 'oad:track', name: String(name).slice(0, 20), p }, '*'); } catch { /* */ } }
const SK = 'marumi_sales';
/* 메뉴별 판매 수: 오늘 것을 모았다가 날이 바뀌면 어제 것을 한 번에 보냄 */
export function salesAdd(menu, n) { try { const d = new Date().toISOString().slice(0, 10), o = JSON.parse(localStorage.getItem(SK) || 'null') || { day: d, n: {} }; if (o.day !== d) { flushDay(); return salesAdd(menu, n); } o.n[menu] = (o.n[menu] || 0) + n; localStorage.setItem(SK, JSON.stringify(o)); } catch { /* */ } }
export function flushDay() { try { const d = new Date().toISOString().slice(0, 10), o = JSON.parse(localStorage.getItem(SK) || 'null'); if (!o || o.day === d) return; if (Object.keys(o.n).length) track('bg_sold', { day: o.day, ...o.n }); localStorage.setItem(SK, JSON.stringify({ day: d, n: {} })); } catch { /* */ } }
