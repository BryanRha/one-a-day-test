// 가방 칸 계산 (화면과 분리 — 봇 · 시험에서도 씀)
import { ITEMS } from './data.js?v=0.99.38';

let uid = 1;
export const mkItem = (key, rot = false) => ({ id: uid++, key, rot });
export const dims = it => { const d = ITEMS[it.key]; return it.rot ? [d.h, d.w] : [d.w, d.h]; };

/* 가방: { w, h, items: [{ it, x, y }] } */
export const mkBag = (w, h) => ({ w, h, items: [] });
export function occupied(bag, skipId) {
  const g = Array.from({ length: bag.h }, () => Array(bag.w).fill(0));
  for (const p of bag.items) { if (p.it.id === skipId) continue; const [w, h] = dims(p.it); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (g[p.y + j]) g[p.y + j][p.x + i] = p.it.id; }
  return g;
}
export function fits(bag, it, x, y, skipId) {
  const [w, h] = dims(it); if (x < 0 || y < 0 || x + w > bag.w || y + h > bag.h) return false;
  const g = occupied(bag, skipId ?? it.id);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (g[y + j][x + i]) return false;
  return true;
}
export function place(bag, it, x, y) { if (!fits(bag, it, x, y)) return false; remove(bag, it); bag.items.push({ it, x, y }); return true; }
export function remove(bag, it) { const i = bag.items.findIndex(p => p.it.id === it.id); if (i >= 0) bag.items.splice(i, 1); return i >= 0; }
/* 빈자리 자동 찾기 (안 맞으면 돌려서도) */
export function findSpot(bag, it) {
  for (const rot of [it.rot, !it.rot]) { const t = { ...it, rot };
    for (let y = 0; y < bag.h; y++) for (let x = 0; x < bag.w; x++) if (fits(bag, t, x, y, it.id)) return { x, y, rot }; }
  return null;
}
export function autoAdd(bag, it) { const s = findSpot(bag, it); if (!s) return false; it.rot = s.rot; bag.items.push({ it, x: s.x, y: s.y }); return true; }
export const bagValue = bag => bag.items.reduce((s, p) => s + ITEMS[p.it.key].val, 0);
export const freeCells = bag => { const g = occupied(bag, -1); let n = 0; for (const r of g) for (const c of r) if (!c) n++; return n; };
/* 겹침 · 범위 검사 (봇 회귀용) */
export function validate(bag) {
  const g = Array.from({ length: bag.h }, () => Array(bag.w).fill(0));
  for (const p of bag.items) { const [w, h] = dims(p.it); if (p.x < 0 || p.y < 0 || p.x + w > bag.w || p.y + h > bag.h) return 'out ' + p.it.key;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { if (g[p.y + j][p.x + i]) return 'overlap ' + p.it.key; g[p.y + j][p.x + i] = 1; } }
  return null;
}
export const bagWeight = bag => Math.round(bag.items.reduce((s, p) => s + (ITEMS[p.it.key].wt || 0), 0) * 10) / 10;
export const bagKeys = bag => bag.items.map(p => p.it.key);
