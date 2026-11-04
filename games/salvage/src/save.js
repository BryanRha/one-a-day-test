// 저장 (localStorage 'salvage_v4', v3 · v2 · v1 에서 자동으로 옮겨 옴) — 창고 · 조개 · 재료 · 시설 · 무기 · 장비 · 의뢰 · 오늘의 목록 · 하루 출격 · 시체 자리
//   v3(0.3.0): look(고른 겉모습 — 머리 · 몸 · 얼굴 · 등 장식 · 총 스킨 · 털 · 무늬 · 몽이) · owned(가진 꾸미기)
//   v4(0.5.0): story(이야기 진행 · 인물 관계 · 기억 도감 · 세 등불 · 열쇠 기억 — story.js) · 주인공 이름은 저장에 안 넣음(기기에만: 'salvage_name')
import { DAILY_SORTIES, FACILITIES, FAC_KEYS, ITEMS, MAT_KEYS } from './data.js?v=0.99.7';
import { kstDay, stashCap as cap, facCur, syncDaily } from './econ.js?v=0.99.7';
import { freshLook, COS } from './look.js?v=0.99.7';
import { freshStory, fixStory, initStory, rollStory } from './story.js?v=0.99.7';
export const KEY = 'salvage_v4';
const OLD3 = 'salvage_v3', OLD2 = 'salvage_v2', OLD = 'salvage_v1';
export const today = () => kstDay();
export const fresh = () => ({
  v: 4, shells: 0, mats: Object.fromEntries(MAT_KEYS.map(k => [k, 0])), stash: ['med', 'med', 'can'],
  fac: Object.fromEntries(FAC_KEYS.map(k => [k, FACILITIES[k].start || 0])), build: null,
  weapons: { pistol: { scope: 0, barrel: 0, mag: 0, chamber: 0 } }, equip: { main: 'pistol', side: null }, gear: { vest: 0, helmet: 0, bag: 0 },
  meal: null, quests: { done: [], prog: 0 }, daily: null,
  day: today(), sorties: DAILY_SORTIES, corpse: null, safe: null,
  stats: { raids: 0, extracts: 0, deaths: 0, kills: 0, drones: 0, best: 0, bosses: 0, vaults: 0, zoneMax: 1, sold: 0, daily: 0 }, firstRun: true, seed: 0, log: [],
  look: freshLook(), owned: [], story: freshStory(),
});
export let S = fresh();
const mem = { store: null };
function ls() { try { return window.localStorage; } catch { return null; } }
/* v1 → v2: 조개 · 창고 그대로, v1 시설에 쓴 조개는 돌려줌 (시설 체계가 바뀌어서) */
export function migrate(o) {
  const n = fresh();
  if (!o || typeof o !== 'object') return n;
  if (o.v === 2 || o.v === 3 || o.v === 4) { const old = o.v < 4; const m = Object.assign(n, o); m.v = 4;
    m.story = old ? null : fixStory(o.story); if (old) initStory(m, kstDay(), true); /* v3 → v4: 지금 진행한 장의 처음부터 이야기 (story.js initStory) */
    m.look = Object.assign(freshLook(), o.look || {}); m.owned = (o.owned || []).filter(k => COS[k]);
    for (const s of ['head', 'body', 'face', 'deco', 'skin', 'pattern']) if (m.look[s] && !COS[m.look[s]]) m.look[s] = null;
    if (!COS[m.look.fur]) m.look.fur = 'fur_brown'; m.look.pet = (m.look.pet || []).filter(k => COS[k]); m.mats = Object.assign(fresh().mats, o.mats); m.fac = Object.assign(fresh().fac, o.fac); m.stats = Object.assign(fresh().stats, o.stats);
    m.gear = Object.assign(fresh().gear, o.gear); m.equip = Object.assign(fresh().equip, o.equip); m.quests = Object.assign(fresh().quests, o.quests); m.weapons = Object.assign(fresh().weapons, o.weapons);
    m.stash = (o.stash || []).filter(k => ITEMS[k]); return m; }
  /* v1 */
  const refund = { bench: [0, 80, 260, 620], store: [0, 60, 210, 510] };
  n.shells = (o.shells || 0) + (refund.bench[o.fac?.bench || 0] || 0) + (refund.store[o.fac?.store || 0] || 0);
  n.stash = (o.stash || []).filter(k => ITEMS[k]);
  n.stats = Object.assign(n.stats, o.stats || {});
  n.firstRun = false; n.migrated = 1; n.story = null; initStory(n, kstDay(), true);
  return n;
}
export function load() {
  try {
    const t = ls()?.getItem(KEY) ?? mem.store;
    if (t) S = migrate(JSON.parse(t));
    else { const o = ls()?.getItem(OLD3) ?? ls()?.getItem(OLD2) ?? ls()?.getItem(OLD); S = o ? migrate(JSON.parse(o)) : fresh(); }
  } catch { S = fresh(); }
  rollDay(); return S;
}
export function save() { const t = JSON.stringify(S); try { ls()?.setItem(KEY, t); } catch { mem.store = t; } mem.store = t; }
export function reset() { S = fresh(); save(); }
export function setS(o) { S = o; }
export function rollDay() { const d = today(); if (S.day !== d) { S.day = d; S.sorties = DAILY_SORTIES; } syncDaily(S, d); rollStory(S, d); save(); }
export const facLv = k => facCur(S, k);
export const stashCap = () => cap(S);
