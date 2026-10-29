// 게임 안 BM 규칙: 실험 그룹 · 광고 하루 한도 · 전면 광고 조건 (team/dev/tasks/261027-ingame-bm/summary.md)
//   A = 지금 그대로(대조) · B = 보상형 광고 + 골드 · C = B + 약한 전면 광고
//   소장자: 전면 없음 · 보상형 혜택은 광고 없이 바로 (하루 횟수는 같음)
import { PROD } from './rules.js?v=0.90.4';
const KEY = 'oad_bm';
/* 실서버: 그룹은 기기 번호로 정한 무작위 그대로 고정 (설정의 '테스트:' 바꾸기 버튼 없음 · 테스트에서 바꿔 둔 값도 무시) */
export const LIMIT = { rewardGame: 5, rewardApp: 15, interGame: 4, interApp: 8, interEvery: 3, interGapMs: 3 * 60e3, interFromPlay: 3 };

export function group() {
  if (!PROD) try { const o = localStorage.getItem('oad_bm_group'); if (o === 'A' || o === 'B' || o === 'C') return o; } catch { /* */ }
  let d = ''; try { d = localStorage.getItem('oad_did') || ''; } catch { /* */ }
  let h = 0; for (const c of d + 'bm1') h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 'ABC'[h % 3];
}
// 연속 실패 응원 선물 실험: 켜짐(help) / 꺼짐 50:50 — BM 그룹과 따로 (team/dev/tasks/261028-fail-help/summary.md)
export function helpOn() {
  if (!PROD) try { const o = localStorage.getItem('oad_help_group'); if (o === 'on') return true; if (o === 'off') return false; } catch { /* */ }
  let d = ''; try { d = localStorage.getItem('oad_did') || ''; } catch { /* */ }
  let h = 0; for (const c of d + 'help1') h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 2 === 0;
}
export function setHelp(v) { if (PROD) return; try { if (v) localStorage.setItem('oad_help_group', v); else localStorage.removeItem('oad_help_group'); } catch { /* */ } }
export function setGroup(g) { if (PROD) return; try { if (g) localStorage.setItem('oad_bm_group', g); else localStorage.removeItem('oad_bm_group'); } catch { /* */ } }

const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function st() {
  let s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* */ }
  if (!s || s.day !== today()) s = { day: today(), r: 0, i: 0, g: {}, first: s ? s.first || today() : today() };
  return s;
}
const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* */ } };
const gs = (s, id) => s.g[id] || (s.g[id] = { r: 0, i: 0, plays: 0, lastI: 0 });

export const rewardLeft = id => { const s = st(), g = gs(s, id); return Math.max(0, Math.min(LIMIT.rewardGame - g.r, LIMIT.rewardApp - s.r)); };
export function useReward(id) { const s = st(), g = gs(s, id); g.r++; s.r++; save(s); }
export function countPlay(id) { const s = st(); gs(s, id).plays++; save(s); }
// 전면 광고를 지금 보여도 되나: C 그룹 · 비소장 · 처음 쓴 날이 아님 · 그 게임 3번째 판부터 3판에 1번 · 3분 간격 · 하루 한도
export function interOk(id, owned) {
  if (group() !== 'C' || owned) return false;
  const s = st(), g = gs(s, id);
  if (s.first === today()) return false;
  if (g.plays < LIMIT.interFromPlay || g.plays % LIMIT.interEvery !== 0) return false;
  if (Date.now() - g.lastI < LIMIT.interGapMs) return false;
  return g.i < LIMIT.interGame && s.i < LIMIT.interApp;
}
export function useInter(id) { const s = st(), g = gs(s, id); g.i++; s.i++; g.lastI = Date.now(); save(s); }
// 메인 화면 시안 (2026-10-28 · team/dev/tasks/261028-home-ux): 'a' = 예전 메인 · 'b' = 이번 주 달력 허브
//   테스트 · 개발: 기본 'b' · 설정 '테스트: 메인' 줄이나 주소 ?home=a|b 로 바꿈 (이 기기에 기억)
//   실서버: 기본 'a' 고정 · 서버 원격 스위치(/api/admin/config 의 home {on, b})가 켜졌을 때만 기기 번호 + 'home1' 해시로 b% 를 B 로 — BM · 응원 실험과 따로(독립 배정)
//     원격 값은 받아 둔 것을 다음에 열 때부터 씀 (열자마자 화면이 바뀌어 깜빡이지 않게) · 못 받으면 'a'
const HKEY = 'oad_home', HREMOTE = 'oad_home_remote';
export function homeGroup() {
  if (!PROD) { try { const o = localStorage.getItem(HKEY); if (o === 'a' || o === 'b') return o; } catch { /* */ } return 'b'; }
  let r = null; try { r = JSON.parse(localStorage.getItem(HREMOTE) || 'null'); } catch { /* */ }
  if (!r || !r.on || !(r.b > 0)) return 'a';
  let d = ''; try { d = localStorage.getItem('oad_did') || ''; } catch { /* */ }
  let h = 0; for (const c of d + 'home1') h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 100 < Math.min(100, r.b) ? 'b' : 'a';
}
export function setHome(g) { if (PROD) return; try { if (g === 'a' || g === 'b') localStorage.setItem(HKEY, g); else localStorage.removeItem(HKEY); } catch { /* */ } }
export function keepHomeRemote(h) { try { if (h && typeof h === 'object') localStorage.setItem(HREMOTE, JSON.stringify({ on: !!h.on, b: Number(h.b) || 0 })); else localStorage.removeItem(HREMOTE); } catch { /* */ } }
