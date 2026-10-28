// 시드 난수 (상태가 숫자 하나라 판 저장 · 이어하기에 그대로 담김)
export function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export class Rng {
  constructor(seed) { this.s = (seed >>> 0) || 1; }
  next() { let t = (this.s = (this.s + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  int(n) { return Math.floor(this.next() * n); }
  pick(a) { return a[this.int(a.length)]; }
  shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = this.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  weighted(items, w) { const tot = items.reduce((s, x) => s + w(x), 0); let r = this.next() * tot; for (const x of items) { r -= w(x); if (r <= 0) return x; } return items[items.length - 1]; }
}
// 한국 시간 날짜 키 (운세와 같은 날 기준)
export const kstDay = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
export const kstMonth = (t = Date.now()) => Number(kstDay(t).slice(5, 7));
