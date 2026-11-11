// 은신처 가구 규칙 (M5-D · three 없음 · node 시험 가능) — 사기(조개만) · 놓기 · 치우기 · 조건 · 놓인 자리 목록
//  저장 S.furn = { own: [가구 키], at: { 자리: 가구 키 } } — 없으면 처음 쓸 때 만듦 · 모르는 키는 지움(furnOf)
//  능력치 0 (꾸미기와 같은 규칙) · 골드 판매 X (ROADMAP 'M5 설계 메모 ②' — 후반 조개 쓰는 곳)
import { FURN, FURN_KEYS, FURN_SPOTS, FURN_SPOT_KEYS, FURN_TOTAL } from './data/furniture.js?v=0.99.29';
import { mapOpen } from './econ.js?v=0.99.29';
export { FURN, FURN_KEYS, FURN_SPOTS, FURN_SPOT_KEYS, FURN_TOTAL };

export function furnOf(S) {
  const F = S.furn && typeof S.furn === 'object' ? S.furn : (S.furn = { own: [], at: {} });
  F.own = (Array.isArray(F.own) ? F.own : []).filter((k, i, a) => FURN[k] && a.indexOf(k) === i);
  const at = {}; for (const s of FURN_SPOT_KEYS) { const k = F.at?.[s]; if (k && FURN[k]?.spot === s && F.own.includes(k)) at[s] = k; } F.at = at;
  return F;
}
const MAPN = { harbor: '밤의 항구', tunnel: '해저 터널', factory: '가라앉은 공장', lab: '심해 연구소' };
const FACN = { dock: '선착장', lights: '조명', aquarium: '수족관', bench: '작업대' };
/* 조건: 없으면 null · 있으면 { ok, txt, cur, n } */
export function needOf(S, k) {
  const r = FURN[k]?.need; if (!r) return null; const st = S.stats || {};
  if (r.t === 'fac') { const cur = S.fac?.[r.k] || 0; return { ok: cur >= r.n, txt: `${FACN[r.k] || r.k} ${r.n}단계`, cur: Math.min(cur, r.n), n: r.n }; }
  if (r.t === 'map') { const ok = mapOpen(S, r.k); return { ok, txt: `'${MAPN[r.k] || r.k}' 열기`, cur: ok ? 1 : 0, n: 1 }; }
  const cur = st[r.t] || 0; const name = { bosses: '보스 처치', vaults: '금고실 털고 탈출', extracts: '탈출' }[r.t] || r.t;
  return { ok: cur >= r.n, txt: `${name} ${r.n}번`, cur: Math.min(cur, r.n), n: r.n };
}
export const owned = (S, k) => furnOf(S).own.includes(k);
export function canBuy(S, k) {
  if (!FURN[k]) return { ok: false, why: 'none' }; if (owned(S, k)) return { ok: false, why: 'owned' };
  const nd = needOf(S, k); if (nd && !nd.ok) return { ok: false, why: 'need', need: nd };
  if ((S.shells || 0) < FURN[k].n) return { ok: false, why: 'cost' };
  return { ok: true };
}
/* 사면 바로 그 자리에 놓음 (원래 놓인 건 가진 채로 남음) */
export function buyFurn(S, k) {
  const r = canBuy(S, k); if (!r.ok) return r;
  const F = furnOf(S); S.shells -= FURN[k].n; F.own.push(k); F.at[FURN[k].spot] = k;
  S.stats ||= {}; S.stats.furnSpent = (S.stats.furnSpent || 0) + FURN[k].n;
  return { ok: true };
}
export function placeFurn(S, k) { if (!owned(S, k)) return false; furnOf(S).at[FURN[k].spot] = k; return true; }
export function clearSpot(S, spot) { const F = furnOf(S); if (!F.at[spot]) return false; delete F.at[spot]; return true; }
/* 그릴 목록: [{ key, spot, x, y, z, ry }] · preview = { 자리: 키 | null } 이 저장보다 먼저 (가구 화면에서 입어 보기) */
export function placed(S, preview = null) {
  const F = furnOf(S); const out = [];
  for (const s of FURN_SPOT_KEYS) {
    const k = preview && s in preview ? preview[s] : F.at[s]; if (!k || !FURN[k]) continue;
    const P = FURN_SPOTS[s]; out.push({ key: k, spot: s, x: P.x, y: P.y || 0, z: P.z, ry: P.ry });
  }
  return out;
}
/* 진행: 가진 수 · 쓴 조개 · 남은 조개(다 사려면) */
export function furnStats(S) { const F = furnOf(S); const spent = F.own.reduce((a, k) => a + FURN[k].n, 0); return { own: F.own.length, all: FURN_KEYS.length, spent, left: FURN_TOTAL - spent, placed: Object.keys(F.at).length }; }
