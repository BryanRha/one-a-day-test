// 저장 (localStorage). load() 는 항상 같은 객체를 돌려주고, save() 로 기록한다.
const KEY = 'rune_dice_v1';
// 뽑기 천장 기록은 따로 한 벌 더: 원어데이 앱이 로그인한 사람은 소장과 상관없이 이 키를 계정에 저장함 (catalog SAVES_ALWAYS)
//   → 다른 기기에서 쌓은 천장도 지킴 (천장 약속 보호). { v, pity, pulls, seq } — seq 는 뽑을 때마다 +1 (어느 쪽이 나중 기록인지 가림)
export const PITY_KEY = 'rune_dice_pity_v1';
let data = null;
function fresh() {
  return {
    v: 1, sfx: true, music: true, tips: {},
    best: 0, plays: 0, kills: 0, bossKills: 0, crystals: 0,
    deck: ['flame', 'frost', 'storm', 'iron', 'gale'], unlocked: { flame: 1, frost: 1, storm: 1, iron: 1, gale: 1 }, tiers: {},
    cards: {}, newRunes: {}, limit: {}, field: 'altar', fields: { altar: 1 }, calib: [], lastPred: null, arcade: {}, abyss: { date: '', tries: 0, extra: 0 }, keys: 1, legendTix: 0, fame: 0, roadClaimed: {}, shop: { date: '', bought: [] }, pity: 0, pulls: 0, pitySeq: 0, freeDraw: '', milestones: {}, decks: null, deckIdx: 0,
    streak: { last: '', count: 0 }, missions: { date: '', list: [] }, daily: { date: '', best: 0, tries: 0 },
    ads: { date: '', x2: 0, box: 0 }, help: null,
  };
}
function readPity() { try { const p = JSON.parse(localStorage.getItem(PITY_KEY) || 'null'); return p && p.v === 1 && Number.isFinite(p.pity) ? p : null; } catch { return null; } }
// 본 저장과 천장 키 중 나중 기록(seq 큰 쪽)을 씀 · seq 가 같으면 천장이 큰 쪽 (약속은 늘 사람 편으로)
//   옛 저장(천장 키가 생기기 전)은 seq 0 · 키가 없으면 본 저장 그대로 → 다음 save() 때 키가 만들어짐
export function syncPity() {
  const d = load(), p = readPity();
  if (!p) return false;
  const seq = p.seq || 0, mine = d.pitySeq || 0;
  if (seq > mine) { d.pity = p.pity; d.pitySeq = seq; d.pulls = Math.max(d.pulls, p.pulls || 0); return true; }
  if (seq === mine && p.pity > d.pity) { d.pity = p.pity; return true; }
  return false;
}
export function load() {
  if (data) return data;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { data = null; }
  const f = fresh();
  if (!data || data.v !== 1) data = f;
  for (const k of Object.keys(f)) if (data[k] === undefined) data[k] = f[k];
  syncPity();
  return data;
}
export function save() {
  const d = load();
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* */ }
  try { localStorage.setItem(PITY_KEY, JSON.stringify({ v: 1, pity: d.pity, pulls: d.pulls, seq: d.pitySeq || 0 })); } catch { /* */ }
}
