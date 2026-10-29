// 부대 색 (꾸미기 · 능력치 없음): 아군 유닛 · 건물의 파란 부분만 다른 색으로 칠함
//   푸른 여단(기본) · 자수정 근위대(골드 상품 'color' 🪙250, hello().items 로 복원) · 허스키 은빛(소장자 전용, 무료)
//   원어데이 밖(hello().ok=false)에서는 기본 색만 (저장된 선택은 그대로 둠)
import { load, save } from './save.js?v=0.91.2';
import { bm } from './oad_bm.js?v=0.91.2';

export const COLORS = {
  blue: { name: '푸른 여단', desc: '기본 부대 색', hex: 0x3E7FD8, css: '#3E7FD8' },
  amethyst: { name: '자수정 근위대', desc: '보랏빛 정예 부대', hex: 0x8A5CE0, css: '#8A5CE0', sku: 'color', hue: 272 },
  husky: { name: '허스키 은빛', desc: '소장자 전용 · 설원의 은빛 늑대 부대', hex: 0xAEBCCC, css: '#AEBCCC', owner: true, silver: true },
};
export const COLOR_ORDER = ['blue', 'amethyst', 'husky'];

const hasItem = (items, sku) => (items || []).some(it => it === sku || (typeof it === 'string' && it.endsWith(':' + sku)) || (it && it.sku === sku));
// 열려 있나: 기본은 늘 · 골드 상품은 산 기록(hello().items 또는 방금 산 것) · 소장자 전용은 hello().owned
export function colorOpen(k) {
  const c = COLORS[k], h = bm.info; if (!c) return false;
  if (k === 'blue') return true;
  if (!h.ok) return false;
  if (c.owner) return !!h.owned;
  if (c.sku) return hasItem(h.items, c.sku) || !!load().colorOwned;
  return false;
}
// 지금 쓰는 색 (원어데이 밖이거나 잠겼으면 기본)
export function teamColor() { const k = load().color || 'blue'; return colorOpen(k) ? k : 'blue'; }
export function setColor(k) { if (!colorOpen(k)) return false; load().color = k; save(); return true; }
export async function buyColor() {
  const r = await bm.spend('color');
  if (r.ok) { const d = load(); d.colorOwned = true; d.color = 'amethyst'; save(); }
  return r;
}

// 그림의 파란 부분만 바꾼 텍스처 (한 번 만들면 계속 씀)
function rgb2hsv(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx / 255]; }
function hsv2rgb(h, s, v) { const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c; let r = 0, g = 0, b = 0; if (h < 60) [r, g] = [c, x]; else if (h < 120) [r, g] = [x, c]; else if (h < 180) [g, b] = [c, x]; else if (h < 240) [g, b] = [x, c]; else if (h < 300) [r, b] = [x, c]; else [r, b] = [c, x]; return [(r + m) * 255, (g + m) * 255, (b + m) * 255]; }
export function paintKey(scene, key, k = teamColor()) {
  if (k === 'blue' || !/_b$/.test(key) || !scene.textures.exists(key)) return key;
  const out = `${key}~${k}`; if (scene.textures.exists(out)) return out;
  const c = COLORS[k], src = scene.textures.get(key).getSourceImage(), w = src.width, h = src.height;
  const tex = scene.textures.createCanvas(out, w, h), ctx = tex.getContext(); ctx.drawImage(src, 0, 0);
  const im = ctx.getImageData(0, 0, w, h), p = im.data;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 8) continue;
    const [hh, s, v] = rgb2hsv(p[i], p[i + 1], p[i + 2]);
    if (hh < 185 || hh > 255 || s < 0.22) continue;                         /* 파란 부분만 */
    const k2 = Math.min(1, (s - 0.22) / 0.2) * Math.min(1, Math.min(hh - 185, 255 - hh) / 12);   /* 경계는 부드럽게 섞음 */
    const [r, g, b] = c.silver ? hsv2rgb(212, s * 0.16, Math.min(1, v * 1.12 + 0.06)) : hsv2rgb(c.hue + (hh - 218) * 0.4, Math.min(1, s * 0.95), v * 0.98);
    p[i] = p[i] + (r - p[i]) * k2; p[i + 1] = p[i + 1] + (g - p[i + 1]) * k2; p[i + 2] = p[i + 2] + (b - p[i + 2]) * k2;
  }
  ctx.putImageData(im, 0, 0); tex.refresh();
  return out;
}
