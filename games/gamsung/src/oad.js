// One a Day 연동 (원어데이 공통 규칙을 이 게임 구조에 맞춤)
// · 뒤로가기: 앱이 { type: 'oad:back' } 를 보내면 → 열린 창 닫기 → 화면별 처리 → 첫 화면이면 handled: false (앱이 게임을 닫음)
// · 원어데이로 버튼: exitToOAD()
export const inOAD = (() => { try { return window.parent !== window; } catch { return true; } })();
export const exitToOAD = () => { try { window.parent.postMessage({ type: 'oad:exit' }, '*'); } catch { /* */ } };
const stack = []; let runner = null;
export const runBack = () => (runner ? runner() : false);   /* PC: Esc 키 = 뒤로 (열린 창 닫기 → 꾸미기 끝내기) */
export function pushBack(back) { const e = { back }; stack.push(e); return () => { const i = stack.indexOf(e); if (i >= 0) stack.splice(i, 1); }; }
export function installBack({ back }) {
  try { window.parent.postMessage({ type: 'oad:ready', back: true }, '*'); } catch { /* */ }
  const run = () => { while (stack.length) { const t = stack[stack.length - 1]; if (t.back() !== false) return true; stack.pop(); } return back(); };
  runner = run;
  window.addEventListener('message', e => { if (!e.data || e.data.type !== 'oad:back') return; let h = false; try { h = run(); } catch (err) { console.warn(err); } try { window.parent.postMessage({ type: 'oad:back-result', handled: h }, '*'); } catch { /* */ } });
  if (inOAD && 'CloseWatcher' in window) { let w = null; const arm = () => { if (w) return; try { w = new CloseWatcher(); w.onclose = () => { w = null; let h = false; try { h = run(); } catch { h = false; } if (h) arm(); else exitToOAD(); }; } catch { w = null; } };
    arm(); addEventListener('pointerdown', arm, true); }
}
// ── 지표 기록 (IP사 협상 · 운영실 「브랜드」 탭 — 계획안 6-2 · 마루미 bg_* 와 같은 틀): 앱이 g_ 를 붙여 events 에 남김 · 이름 20자 안 · 개인 정보 없음
//   gs_room 구역 열림 · gs_branch 지점 계약/완성 · gs_ad 보상형 끝(자리) · gs_coupon 쿠폰 · gs_store 매장 가 보기 · gs_qr 매장 QR 선물 · gs_share 공유
//   gs_sold 메뉴별 잔 수(하루 묶음 · sig 시그니처 합) · gs_time 지점별 머문 초(세션 끝) · gs_owner 사장 일감 종류별 횟수 · 딱 맞춤 비율(하루 묶음) · gs_truck 트럭 판 끝
export function track(name, p = {}) { (window.__track ||= []).push([name, p]); if (!inOAD) return; try { window.parent.postMessage({ type: 'oad:track', name: String(name).slice(0, 20), p }, '*'); } catch { /* */ } }
const SK = 'gamsung_sales', OK_ = 'gamsung_owner';
const day = () => new Date().toISOString().slice(0, 10);
/* 메뉴별 잔 수 · 사장 일감: 오늘 것을 모았다가 날이 바뀌면 어제 것을 한 번에 보냄 */
export function salesAdd(menu, n, sig) { try { const d = day(), o = JSON.parse(localStorage.getItem(SK) || 'null') || { day: d, n: {} }; if (o.day !== d) { flushDay(); return salesAdd(menu, n, sig); } o.n[menu] = (o.n[menu] || 0) + n; if (sig) o.n.sig = (o.n.sig || 0) + n; localStorage.setItem(SK, JSON.stringify(o)); } catch { /* */ } }
export function ownerAdd(job, fit) { try { const d = day(), o = JSON.parse(localStorage.getItem(OK_) || 'null') || { day: d, n: {} }; if (o.day !== d) { flushDay(); return ownerAdd(job, fit); } if (job) o.n[job] = (o.n[job] || 0) + 1; if (fit != null) { o.n.out = (o.n.out || 0) + 1; if (fit) o.n.fit = (o.n.fit || 0) + 1; } localStorage.setItem(OK_, JSON.stringify(o)); } catch { /* */ } }
export function flushDay() { const d = day(); for (const [k, ev] of [[SK, 'gs_sold'], [OK_, 'gs_owner']]) { try { const o = JSON.parse(localStorage.getItem(k) || 'null'); if (!o || o.day === d) continue; if (Object.keys(o.n).length) track(ev, { day: o.day, ...o.n }); localStorage.setItem(k, JSON.stringify({ day: d, n: {} })); } catch { /* */ } } }
