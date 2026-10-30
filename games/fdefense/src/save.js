// 저장 (localStorage) · 원어데이 catalog SAVES: fdefense_v1
const KEY = 'fdefense_v1';
let data = null;
function fresh() {
  return { v: 1, sfx: true, music: true, speed: 1, cleared: {}, stars: {}, best: {}, heroism: 0, plays: 0, tips: {} };
}
export function load() {
  if (data) return data;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { data = null; }
  const f = fresh();
  if (!data || data.v !== 1) data = f;
  for (const k of Object.keys(f)) if (data[k] === undefined) data[k] = f[k];
  return data;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch { /* 저장 못 함 */ } }
