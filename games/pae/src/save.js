// 저장 (localStorage). load() 는 항상 같은 객체를 돌려주고, save() 로 기록한다. 원어데이 catalog SAVES 에 'oad_pae_v1' 등록 필요
const KEY = 'oad_pae_v1';
let data = null;
function fresh() {
  return {
    v: 1, sfx: true, music: true, vib: true,
    petals: 0, plays: 0, wins: 0, best: 0, bestMonth: 0,
    daily: { date: '', plays: 0, best: 0, won: false },
    book: { yaku: [], gods: [], charms: [], cards: [] },
    decks: { moon: true }, variant: 'moon', back: 'back',
    tut: { first: false, wind: false, shop: false, preview: false },
    run: null,
    help: { date: '', given: 0, fails: {} },
    dbl: { date: '', n: 0 }, today: { date: '', runs: 0 }, fortuneSeen: '',
  };
}
export function load() {
  if (data) return data;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { data = null; }
  const f = fresh();
  if (!data || data.v !== 1) data = f;
  for (const k of Object.keys(f)) if (data[k] === undefined) data[k] = f[k];
  for (const k of Object.keys(f.book)) if (!data.book[k]) data.book[k] = [];
  for (const k of Object.keys(f.tut)) if (data.tut[k] === undefined) data.tut[k] = false;
  return data;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch { /* */ } }
export function reset() { data = fresh(); save(); }
