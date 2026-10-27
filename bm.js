// 게임 안 BM 규칙: 실험 그룹 · 광고 하루 한도 · 전면 광고 조건 (team/dev/tasks/261027-ingame-bm/summary.md)
//   A = 지금 그대로(대조) · B = 보상형 광고 + 골드 · C = B + 약한 전면 광고
//   소장자: 전면 없음 · 보상형 혜택은 광고 없이 바로 (하루 횟수는 같음)
const KEY = 'oad_bm';
export const LIMIT = { rewardGame: 5, rewardApp: 15, interGame: 4, interApp: 8, interEvery: 3, interGapMs: 3 * 60e3, interFromPlay: 3 };

export function group() {
  try { const o = localStorage.getItem('oad_bm_group'); if (o === 'A' || o === 'B' || o === 'C') return o; } catch { /* */ }
  let d = ''; try { d = localStorage.getItem('oad_did') || ''; } catch { /* */ }
  let h = 0; for (const c of d + 'bm1') h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 'ABC'[h % 3];
}
export function setGroup(g) { try { if (g) localStorage.setItem('oad_bm_group', g); else localStorage.removeItem('oad_bm_group'); } catch { /* */ } }

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
