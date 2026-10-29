// 자동차 스킨 (겉모습만 · 능력치 없음 · 모든 차 공용) — 원어데이 안에서만 보임
//   aurora 오로라 펄: 소장자 전용 (hello().owned 이면 무료로 열림)
//   neon   네온 나이트: 원어데이 골드 상품 'skin' (bm.spend 성공 → 바로 · 다음 실행부터 hello().items 에 'skin')
//   지금 차 원화를 다시 칠하고(차체 색) + 바닥 빛 · 배기 불꽃 색을 바꿈
import { load, save } from './save.js?v=0.91.0';
import { bm } from './oad_bm.js?v=0.91.0';
import { hasItem } from './bmflow.js?v=0.91.0';

export const SKINS = {
  aurora: { name: '오로라 펄', desc: '청록에서 보라로 흐르는 진주빛', how: 'owner', glow: 0x5FF2E0, flame: [0x9AF7FF, 0x7A8BFF, 0xC77DFF] },
  neon: { name: '네온 나이트', desc: '깊은 자홍 · 네온 바닥 빛', how: 'gold', sku: 'skin', glow: 0xFF4FD8, flame: [0xFF9AE8, 0xFF4FD8, 0x9A5BFF] },
};
export const SKIN_ORDER = ['aurora', 'neon'];
let bought = false;   /* 이번 실행에서 골드로 산 것 (다음 실행부터는 hello().items 로) */

export const skinShown = () => !!bm.info.ok;
export function skinOpen(id) {
  const info = bm.info;
  if (!info.ok || !SKINS[id]) return false;
  if (SKINS[id].how === 'owner') return !!info.owned;
  return bought || hasItem(SKINS[id].sku);
}
// 지금 쓰는 스킨 (원어데이 밖이거나 잠겨 있으면 null → 기본 모습 · 저장된 선택은 그대로 둠)
export function activeSkin() { const s = load().skin; return s && skinOpen(s) ? s : null; }
export function wear(id) { const d = load(); d.skin = id && skinOpen(id) ? id : null; save(); }
export async function buySkin() {
  const r = await bm.spend('skin');
  if (r && r.ok) { bought = true; const it = bm.info.items || (bm.info.items = []); if (!hasItem('skin')) it.push('skin'); wear('neon'); }
  return r || { ok: false, reason: 'error' };
}

// 원화 다시 칠하기: 채도 있는 차체만 (유리 · 타이어 · 흰 테두리 · 검은 선은 그대로)
const rgb2hsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};
const hue2 = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
const hsl2rgb = (h, s, l) => {
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, k = (((h % 360) + 360) % 360) / 360;
  return [hue2(p, q, k + 1 / 3) * 255, hue2(p, q, k) * 255, hue2(p, q, k - 1 / 3) * 255];
};
export function skinKey(scene, key, id = activeSkin()) {
  if (!id || !SKINS[id]) return key;
  const out = `${key}__${id}`;
  if (scene.textures.exists(out)) return out;
  const src = scene.textures.get(key).getSourceImage();
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d'); g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height), px = img.data, Wd = c.width, Hd = c.height;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) continue;
    const [h, s, l] = rgb2hsl(px[i], px[i + 1], px[i + 2]);
    if (s < 0.22 || l > 0.9 || l < 0.08) continue;
    if (h > 185 && h < 225 && l > 0.55) continue;                        /* 밝은 하늘색 유리창은 그대로 */
    const k = Math.min(1, (s - 0.22) / 0.18);
    const pi = i / 4, x = (pi % Wd) / Wd, y = Math.floor(pi / Wd) / Hd;
    let hh, ss, ll;
    if (id === 'aurora') { hh = 172 + 108 * (y * 0.75 + x * 0.25); ss = 0.62; ll = Math.min(0.86, 0.28 + l * 0.75); }   /* 위 청록 → 아래 보라, 진주처럼 밝게 */
    else { hh = 318 - 24 * y; ss = 0.95; ll = Math.max(0.22, Math.min(0.62, l * 0.85)); }                                  /* 깊은 자홍 */
    const [r, gg, b] = hsl2rgb(hh, ss, ll);
    px[i] += (r - px[i]) * k; px[i + 1] += (gg - px[i + 1]) * k; px[i + 2] += (b - px[i + 2]) * k;
  }
  g.putImageData(img, 0, 0);
  scene.textures.addCanvas(out, c);
  return out;
}
