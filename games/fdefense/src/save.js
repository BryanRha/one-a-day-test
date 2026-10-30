// 저장 (localStorage) · 원어데이 catalog SAVES: fdefense_v1 (진행) · fdefense_resume_v1 (판 중간 이어하기)
import { freshMeta } from './core/meta.js?v=0.95.0';
const KEY = 'fdefense_v1', RESUME = 'fdefense_resume_v1';
let data = null;
export const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function fresh() {
  return {
    v: 1, sfx: true, music: true, speed: 1, tips: {},
    heroism: 0, meta: freshMeta(),
    cleared: {}, perfect: {}, stars: {}, gateCleared: {}, infBest: {}, tries: {},
    plays: 0, kills: 0, playSec: 0, objects: 0,
    sel: { stage: 0, mode: 0 },
    awards: {}, awardStat: {},
    missions: { date: '', list: [] },
    ads: { date: '', x2: 0 },
    help: { stage: -1, fails: 0, date: '', used: 0 },
    look: { gate: 'normal' },
  };
}
export function load() {
  if (data) return data;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { data = null; }
  const f = fresh();
  if (!data || data.v !== 1) data = f;
  for (const k of Object.keys(f)) if (data[k] === undefined) data[k] = f[k];
  const fm = freshMeta(); for (const k of Object.keys(fm)) if (data.meta[k] === undefined) data.meta[k] = fm[k];
  return data;
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(load())); } catch { /* 저장 못 함 */ } }
// 판 중간 이어하기 (웨이브 시작 때마다)
export function saveResume(sn) { try { if (sn) localStorage.setItem(RESUME, JSON.stringify(sn)); else localStorage.removeItem(RESUME); } catch { /* */ } }
export function loadResume() { try { const r = JSON.parse(localStorage.getItem(RESUME) || 'null'); return r && r.v === 1 ? r : null; } catch { return null; } }
