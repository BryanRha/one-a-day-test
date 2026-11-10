// 깊은 물 (엔딩 뒤 난이도 · M5-B · v0.8) — 위협 Lv 10 넘김 · 변형 적 3 · 보상 배수 · 끝없는 깊이 기록 · 장비 닳음/수리 (DOM 없음 · 판 쪽은 raid.js 한 줄)
//  ── 엔딩 훅 (M5-A 와 맞춤) ──
//   엔딩 장면이 끝나는 곳에서 markEnding(S, 엔딩키) 를 부르면 바로 열림. 부르지 않아도 아래 중 하나가 참이면 열린 것으로 봄:
//     S.story.ending(엔딩 키) · S.story.ended · S.story.beatsDone.b_ending · S.story.flags.ending
//   ※ 시험: ?abyss (실서버 oneaday.kr 밖에서만) 이면 열림 — main.js
import { ABYSS as K } from './data/m5b.js?v=0.99.20';
import { kstDay } from './econ.js?v=0.99.20';
import { DIFF } from './data.js?v=0.99.20';
import { rng } from './plan.js?v=0.99.20';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const endingSeen = S => !!(S?.abyss?.open || S?.story?.ending || S?.story?.ended || S?.story?.beatsDone?.b_ending || S?.story?.flags?.ending);
/* M5-A 엔딩 훅: 엔딩을 본 순간 부름 (여러 번 불러도 됨) → 다음 은신처에서 '깊은 물이 열렸어요' 안내 한 번 */
export function markEnding(S, which = null) { const A = ab(S); if (!A.open) { A.open = true; A.openDay = S.day || kstDay(); A.news = 1; } if (which) A.ending = which; return A; }
/* 저장 S.abyss = { open, on(켬), sel(고른 깊이), max(열린 가장 깊은 곳), best(탈출한 가장 깊은 곳), wear, runs, ext, kills, got[], news } */
export function ab(S) {
  const A = S.abyss && typeof S.abyss === 'object' ? S.abyss : (S.abyss = {});
  A.max = Math.max(1, A.max | 0); A.best |= 0; A.wear = clamp(+A.wear || 0, 0, 100); A.runs |= 0; A.ext |= 0; A.kills |= 0; A.got = Array.isArray(A.got) ? A.got : [];
  A.sel = clamp(A.sel | 0 || A.max, 1, A.max); return A;
}
export const abyssOpen = S => endingSeen(S);
export const abyssOn = S => abyssOpen(S) && !!S.abyss?.on;
export const depthOf = S => ab(S).sel;
export const lootMul = d => Math.min(K.loot[2], K.loot[0] + K.loot[1] * d);
export const variantP = d => Math.min(K.vp[2], K.vp[0] + K.vp[1] * d);
export const lvOf = d => K.lv0 + d;
export function setOn(S, on) { const A = ab(S); if (!abyssOpen(S)) return false; A.on = !!on; return true; }
export function setDepth(S, d) { const A = ab(S); A.sel = clamp(d | 0, 1, A.max); return A.sel; }

/* ───── 판 숫자 ───── */
/* 위협: threatOf 가 낸 Lv 10 값 위에 깊이만큼 (T 를 바꿈) */
export function applyThreat(T, d) {
  if (!T) return T; const lv = lvOf(d);
  T.lv = lv; T.ai = 3; T.hp *= 1 + K.hp * d; T.dmg *= 1 + K.dmg * d;
  for (const z of [1, 2, 3]) T.extra[z] = Math.min(K.extraCap, (T.extra[z] || 0) + K.extra * d);
  T.mix = Math.min(K.mixCap, (T.mix || 0) + K.mix * d); T.abyss = d; T.abyssP = variantP(d);
  T.lines = [`심연 ${d} — 변형 적 ${Math.round(T.abyssP * 100)}% · 보상 ×${lootMul(d).toFixed(2)}`, ...(T.lines || [])];
  return T;
}
/* 닳음 → 방어 · 체력 */
export const wearFx = w => w <= K.wear.from ? { armor: 1, hp: 0 } : { armor: Math.max(0.5, 1 - (w - K.wear.from) * K.wear.armor), hp: -Math.round((w - K.wear.from) * K.wear.hp) };
/* 출격 장비: 보상 배수 · 난이도는 깊이가 대신(편하게/깊게 배수 끔) · 닳음 */
export function applyLoadout(L, S, d) {
  const A = ab(S); const W = wearFx(A.wear);
  L.loot = (L.loot || 1) / (DIFF[S.diff]?.loot || 1) * lootMul(d); L.foeHp = 1; L.foeDmg = 1; L.diff = 'abyss'; L.armor = Math.round(L.armor * W.armor * 1000) / 1000; L.hp = Math.max(40, L.hp + W.hp); L.abyss = d;
  return L;
}
/* 판 시작 한 번에 (main.js startRaidNow) — T · L 을 바꿈 */
export function applyRaid(S, T, L, d) { applyThreat(T, d); applyLoadout(L, S, d); ab(S).runs++; }

/* 적 하나 → 변형 (raid.js makeEnemy 끝에서 부름) · seed + 순번으로 정해짐(같은 판 = 같은 변형) */
const VK = Object.keys(K.variants);
const mixH = (a, b) => { let h = (Math.imul(a >>> 0, 0x9e3779b1) ^ Math.imul(b + 0x7f4a7c15, 0x85ebca6b)) >>> 0; h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; h ^= h >>> 16; return h >>> 0 || 1; };
export function pickVariant(T, seed, i) {
  if (!T?.abyss) return null; const R = rng(mixH(seed, i * 97 + 5)); if (R() >= T.abyssP) return null;
  const ks = VK.filter(k => (K.variants[k].from || 0) <= T.abyss); const tot = ks.reduce((s, k) => s + K.variants[k].w, 0); let r = R() * tot;
  for (const k of ks) { r -= K.variants[k].w; if (r <= 0) return k; } return ks[0];
}
export function abyssEnemy(R, en, e, i, THREE) {
  const T = R.T; if (!T?.abyss) return;
  if (en.D.boss) { const m = 1 + 0.08 * T.abyss; en.hp *= m; en.maxHp *= m; return; } /* 보스는 위협 배수를 안 받음 → 깊이만큼 따로 */
  const k = pickVariant(T, R.opt.seed, i); if (!k) return; const V = K.variants[k];
  en.D = { ...en.D, name: V.name.split(' ')[0] + ' ' + en.D.name, speed: en.D.speed * (V.speed || 1), chase: en.D.chase * (V.speed || 1), cd: en.D.cd * (V.cd || 1), sight: en.D.sight * (V.sight || 1) };
  en.hp *= V.hp; en.maxHp *= V.hp; en.dmgMul *= V.dmg || 1; en.abyss = k;
  /* 보라 테 (발밑 고리 하나 · 빛 받지 않는 재질 → 판 끝 dispose 가 지움) */
  if (THREE && en.root) { const r = (en.D.radius || 0.5) * (k === 'lord' ? 2.1 : 1.6);
    const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.78, r, 28), new THREE.MeshBasicMaterial({ color: V.rim, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; ring.name = 'abyss_ring'; ring.renderOrder = 3; en.root.add(ring); en.abyssRing = ring; }
}

/* ───── 판 끝 (main.js endRaid → m5b.afterRaid) ───── 돌려줌: { d, ext, newMax, shells, wear, miles[] } */
export function afterRaid(S, res) {
  const d = res.abyss | 0; if (!d) return null; const A = ab(S); const ext = res.outcome === 'extract';
  const kills = res.abyssKills | 0; A.kills += kills; const out = { d, ext, kills, newMax: 0, shells: 0, wear: 0, miles: [] };
  if (ext) { A.ext++; if (d > A.best) A.best = d; if (d >= A.max) { A.max = d + 1; out.newMax = A.max; if (A.sel === d) A.sel = A.max; } /* 다음 판은 새 깊이로 (−로 내릴 수 있음) */
    out.shells = kills * (K.vShell[0] + K.vShell[1] * d); S.shells += out.shells; S.stats.abyssShells = (S.stats.abyssShells || 0) + out.shells; }
  const w = ext ? K.wear.ext : K.wear.dead; out.wear = Math.round(w[0] + w[1] * d); A.wear = clamp(A.wear + out.wear, 0, 100);
  for (const [n, kind, key] of K.mile) if (A.best >= n && !A.got.includes(key)) { A.got.push(key); out.miles.push({ n, kind, key }); }
  return out;
}
/* 수리 (은신처 · 조개) */
export const repairCost = S => { const A = ab(S); return Math.ceil(A.wear * (K.wear.cost[0] + K.wear.cost[1] * A.best)); };
export function repair(S) { const A = ab(S); const c = repairCost(S); if (!A.wear) return { ok: false, why: 'max' }; if (S.shells < c) return { ok: false, why: 'cost' }; S.shells -= c; A.wear = 0; S.stats.spentRepair = (S.stats.spentRepair || 0) + c; return { ok: true, cost: c }; }
