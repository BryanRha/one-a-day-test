// 업적 50 · 칭호 · 받아 둔 꾸미기 (M5-B · v0.8) — DOM 없음 (node 시험 test_m5b.mjs 가 같은 함수) · econ.js achValue/achTick 는 여기로 넘김
//  판에서만 알 수 있는 기록(체력 · 남은 시간 · 몽이 주머니 · 맨몸)은 collect(raid) 가 판 끝(main.js endRaid, dispose 전)에 결과에 붙임 → noteRaid 가 S.stats 에 셈
import { ACHIEVEMENTS, ACH_CATS } from './data/achievements.js?v=0.99.35';
import { TITLES, M5B_COS } from './data/m5b.js?v=0.99.35';
import { FAC_KEYS, WEAPONS, GEAR_MAX } from './data.js?v=0.99.35';
import { COS } from './look.js?v=0.99.35';
import { kstDay, give, bossKinds, facLvl } from './econ.js?v=0.99.35';
import { freeCells } from './inv.js?v=0.99.35';
import { endingSeen } from './abyss.js?v=0.99.35';
import { points, medalMax, weeksPlayed } from './challenge.js?v=0.99.35';

export const MAP_BOSSES = ['boss', 'captain', 'eel', 'smelter', 'mother'];
const WX5 = ['night', 'storm', 'fog', 'cold', 'toxic'];
export const ACH_N = ACHIEVEMENTS.length;
const mapBossN = S => { const k = new Set(Object.keys(S.stats?.bossKinds || {})); const d = S.quests?.done || []; if (d.includes('q8')) k.add('boss'); if (d.includes('q17')) k.add('captain'); if (d.includes('q25')) k.add('eel'); return MAP_BOSSES.filter(b => k.has(b)).length; };

export function achValue(S, t, a = null) {
  const st = S.stats || {}; const m = st.m5b || {};
  switch (t) {
    case 'bossKinds': return bossKinds(S);
    case 'mapBosses': return mapBossN(S);
    case 'fac': return FAC_KEYS.reduce((s, k) => s + facLvl(S, k), 0);
    case 'weapons': return Object.keys(S.weapons || {}).length;
    case 'fullMods': return Object.entries(S.weapons || {}).some(([wk, w]) => WEAPONS[wk]?.slots?.every(md => (w[md] || 0) >= 3)) ? 1 : 0;
    case 'gear5': return ['vest', 'helmet', 'bag'].some(g => (S.gear?.[g] || 0) >= GEAR_MAX) ? 1 : 0;
    case 'charms': return (S.charms?.have || []).length;
    case 'traders': return Object.keys(st.traded || {}).length;
    case 'deep': return st.deepExt || 0;
    case 'mapsExt': return Object.values(st.maps || {}).filter(x => (x.extracts || 0) > 0).length;
    case 'wxExt': return WX5.filter(w => m.wx?.[w]).length;
    case 'beat': return S.story?.beatsDone?.[a?.id2] ? 1 : 0;
    case 'ending': return endingSeen(S) ? 1 : 0;
    case 'codex': return Object.keys(S.story?.codex || {}).length;
    case 'tapes': return (S.story?.tapes || []).length;
    case 'chalRuns': return S.chal?.runs || 0;
    case 'chalBest': return S.chal ? medalMax(S) : 0;
    case 'chalWeeks': return S.chal ? weeksPlayed(S) : 0;
    case 'chalPts': return S.chal ? points(S) : 0;
    case 'abyssBest': return S.abyss?.best || 0;
    case 'abyssKills': return S.abyss?.kills || 0;
    case 'rich': return S.shells || 0;
    case 'chiefDown': case 'infight': case 'powerExt': case 'zone3': case 'naked': case 'closeCall': case 'lastSec': case 'petFull': return m[t] || 0;
    default: return st[t] || 0;
  }
}
export const achProg = (S, a) => Math.min(a.n, achValue(S, a.t, a));

/* ───── 칭호 ───── */
export function titles(S) { const T = S.titles && typeof S.titles === 'object' ? S.titles : (S.titles = { have: [], eq: null }); T.have = (Array.isArray(T.have) ? T.have : []).filter(k => TITLES[k]); if (T.eq && !T.have.includes(T.eq)) T.eq = null; return T; }
export function grantTitle(S, k) { if (!TITLES[k]) return false; const T = titles(S); if (T.have.includes(k)) return false; T.have.push(k); if (!T.eq) T.eq = k; return true; }
export function wearTitle(S, k) { const T = titles(S); if (k && !T.have.includes(k)) return false; T.eq = k || null; return true; }
export const titleNow = S => { const k = S.titles?.eq; return k && TITLES[k] ? TITLES[k].name : null; };

/* ───── 꾸미기 받기 (모델이 아직이면 받아 둠 · M5-D 가 COS 에 넣는 날 옷장에) ───── */
export function grantCos(S, k) {
  S.owned ||= []; if (S.owned.includes(k)) return { k, had: true };
  if (COS[k]) { S.owned.push(k); return { k, now: true }; }
  S.cosPend = Array.isArray(S.cosPend) ? S.cosPend : []; if (!S.cosPend.includes(k)) S.cosPend.push(k); return { k, pend: true };
}
export function flushPend(S) { const out = []; if (!Array.isArray(S.cosPend) || !S.cosPend.length) return out; S.owned ||= []; S.cosPend = S.cosPend.filter(k => { if (!COS[k]) return true; if (!S.owned.includes(k)) { S.owned.push(k); out.push(k); } return false; }); return out; }
export const cosName = k => COS[k]?.name || M5B_COS[k]?.name || k;
/* 보상 한 묶음 (조개 · 재료 · cos · title) */
export function grant(S, rw = {}) {
  const { cos, title, ...rest } = rw; give(S, rest); const o = { ...rest };
  if (cos) { const r = grantCos(S, cos); if (r.had && !M5B_COS[cos]) S.shells += 150; o.cos = cos; o.pend = !!r.pend; } /* 옛 규칙: 이미 가진 옛 꾸미기면 조개 150 */
  if (title) { grantTitle(S, title); o.title = title; }
  return o;
}

/* ───── 업적 확인 ───── */
export function achTick(S) {
  const out = []; S.ach ||= {};
  for (const a of ACHIEVEMENTS) { if (S.ach[a.id] || achValue(S, a.t, a) < a.n) continue; S.ach[a.id] = kstDay(); grant(S, a.reward); out.push(a); }
  return out;
}
export const achDone = S => ACHIEVEMENTS.filter(a => S.ach?.[a.id]).length;
export function byCat(S) { const o = {}; for (const c of Object.keys(ACH_CATS)) { const L = ACHIEVEMENTS.filter(a => a.cat === c); o[c] = { n: L.length, done: L.filter(a => S.ach?.[a.id]).length }; } return o; }

/* ───── 판 끝 기록 ───── */
/* raid 를 치우기 전에: 결과에 판 안 값 붙임 */
export function collect(R, res, S) {
  try {
    res.timeLeft = Math.max(0, Math.round(R.time || 0)); res.hpFrac = R.pl.maxHp ? R.pl.hp / R.pl.maxHp : 1;
    res.petFull = !!(R.pet && R.pet.w * R.pet.h > 0 && freeCells(R.pet) === 0);
    res.naked = !R.L.chal && !(S.gear?.vest) && !(S.gear?.helmet) && R.L.weapons.length === 1 && R.L.weapons[0].key === 'pistol';
    res.abyss = R.T?.abyss || 0; res.abyssKills = (R.enemies || []).filter(e => e.abyss && e.dead).length;
  } catch (e) { console.warn('판 기록', e); }
  return res;
}
export function noteRaid(S, res) {
  const st = S.stats ||= {}; const m = st.m5b ||= {}; const ext = res.outcome === 'extract';
  if (res.chief === 'down') m.chiefDown = (m.chiefDown || 0) + 1;
  m.infight = (m.infight || 0) + (res.infight || 0);
  if (ext && WX5.includes(res.wx)) (m.wx ||= {})[res.wx] = (m.wx[res.wx] || 0) + 1;
  if (ext && res.power) m.powerExt = (m.powerExt || 0) + 1;
  if ((res.zoneMax || 0) >= 3) m.zone3 = (m.zone3 || 0) + 1;
  if (ext && res.naked && (res.value || 0) >= 300) m.naked = 1;
  if (ext && res.hpFrac != null && res.hpFrac <= 0.1) m.closeCall = 1;
  if (ext && res.timeLeft != null && res.timeLeft <= 10) m.lastSec = 1;
  if (ext && res.petFull) m.petFull = 1;
}
