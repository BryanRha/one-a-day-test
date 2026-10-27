// 저장 (localStorage). load() 는 항상 같은 객체를 돌려주고, save() 로 기록한다.
const KEY = 'honk_rush_v1';
let data = null;
function fresh() {
  return {
    v: 1, coins: 300, best: 0, bestDist: 0,
    driver: 'raccoon', drivers: { raccoon: true }, car: 'c', cars: { c: true }, parts: { tank: 0, engine: 0, jump: 0 },
    totals: { runs: 0, dist: 0, honks: 0, jumpshots: 0 }, tips: {}, sfx: true, music: true,
    ads: { day: '' }, help: null, skin: null,   /* 원어데이: 광고 자리별 하루 횟수 · 응원 선물 · 자동차 스킨(겉모습만) */
  };
}
export function load() {
  if (data) return data;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { data = null; }
  const f = fresh();
  if (!data || data.v !== 1) data = f;
  for (const k of Object.keys(f)) if (data[k] === undefined) data[k] = f[k];
  return data;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch { /* */ } }
// 한국 시간 날짜 (하루 횟수 기준)
export const todayKey = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
