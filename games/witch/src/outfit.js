// 의상 (겉모습만 · 능력치 없음) — 원어데이 안에서만 보임
//   moon  달빛 예복: 소장자 전용 (hello().owned 이면 무료로 열림)
//   gold  황금 별자리: 원어데이 골드 상품 'outfit' (bm.spend 성공 · 다음 실행부터 hello().items 에 'outfit')
//   지금 있는 원화를 다시 칠하고(옷 · 머리색) + 따라다니는 빛 장식(후광 · 입자)을 더함
import { load, save } from './save.js?v=0.91.1';
import { bm } from './oad_bm.js?v=0.91.1';

export const OUTFITS = {
  moon: { name: '달빛 예복', desc: '은빛 남색 예복 · 초승달 가루', hue: 224, hueDark: 236, sat: 0.5, lift: 0.1, tints: [0xE8F0FF, 0xB8C8FF, 0xFFFFFF], halo: 0xC8D8FF, how: 'owner' },
  gold: { name: '황금 별자리', desc: '금빛 드레스 · 별자리 후광', hue: 46, hueDark: 28, sat: 0.9, lift: 0.22, tints: [0xFFE14D, 0xFFF3B0, 0xFFB86A], halo: 0xFFD95A, how: 'gold', sku: 'outfit' },
};
export const OUTFIT_ORDER = ['moon', 'gold'];
let bought = false;   /* 이번 실행에서 골드로 산 것 (다음 실행부터는 hello().items 로) */

export const outfitShown = () => bm.info.ok;
export function outfitUnlocked(id) {
  const info = bm.info;
  if (!info.ok) return false;
  if (id === 'moon') return !!info.owned;
  if (id === 'gold') return bought || (info.items || []).includes('outfit');
  return false;
}
// 지금 입은 의상 (원어데이 밖이거나 잠겨 있으면 null → 기본 모습)
export function activeOutfit() { const o = load().outfit; return o && OUTFITS[o] && outfitUnlocked(o) ? o : null; }
export function wear(id) { const d = load(); d.outfit = id && outfitUnlocked(id) ? id : null; save(); }
export async function buyGold() {
  const r = await bm.spend('outfit');
  if (r.ok) { bought = true; wear('gold'); }
  return r;
}

// 원화 다시 칠하기: 피부(밝은 살구색)는 그대로, 채도 있는 옷 · 머리 · 장식만 의상 색으로
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
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, k = h / 360;
  return [hue2(p, q, k + 1 / 3) * 255, hue2(p, q, k) * 255, hue2(p, q, k - 1 / 3) * 255];
};
export function outfitKey(scene, key, id = activeOutfit()) {
  if (!id) return key;
  const out = `${key}__${id}`;
  if (scene.textures.exists(out)) return out;
  const o = OUTFITS[id], src = scene.textures.get(key).getSourceImage();
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d'); g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height), px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) continue;
    const [h, s, l] = rgb2hsl(px[i], px[i + 1], px[i + 2]);
    if (s < 0.18 || l > 0.93 || l < 0.06) continue;                 /* 흰 · 검은 테두리 · 회색은 그대로 */
    if (h >= 8 && h <= 48 && l >= 0.55 && s <= 0.85) continue;     /* 피부 */
    const k = Math.min(1, (s - 0.18) / 0.2);                         /* 경계는 부드럽게 섞음 */
    /* 어두운 곳은 깊은 색(hueDark) · 밝은 곳은 맑은 색(hue), 그림자를 lift 만큼 들어 올려 금 · 은처럼 빛나게 */
    const L = Math.min(0.92, o.lift + l * (1 - o.lift * 0.6)), hh = o.hueDark + (o.hue - o.hueDark) * Math.min(1, L / 0.7);
    const [r, gg, b] = hsl2rgb(hh, Math.min(1, Math.max(0.55, s) * o.sat), L);
    px[i] = px[i] + (r - px[i]) * k; px[i + 1] = px[i + 1] + (gg - px[i + 1]) * k; px[i + 2] = px[i + 2] + (b - px[i + 2]) * k;
  }
  g.putImageData(img, 0, 0);
  scene.textures.addCanvas(out, c);
  return out;
}

// 따라다니는 빛 장식: 천천히 도는 별자리 후광 + 반짝이 가루 (반환: { halo, dust, setPos, destroy })
export function outfitFx(scene, id, scale = 1) {
  const o = OUTFITS[id];
  const halo = scene.add.image(0, 0, 'circle').setTint(o.halo).setAlpha(0.34).setScale(2.1 * scale).setBlendMode('ADD');
  scene.tweens.add({ targets: halo, angle: 360, duration: 14000, repeat: -1 });
  scene.tweens.add({ targets: halo, alpha: 0.16, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const dust = scene.add.particles(0, 0, id === 'moon' ? 'flake' : 'spark', {
    x: { min: -150 * scale, max: 150 * scale }, y: { min: -200 * scale, max: 200 * scale }, speedY: { min: -30, max: 60 }, lifespan: 1300,
    scale: { start: 0.55 * scale, end: 0 }, alpha: { start: 0.95, end: 0 }, rotate: { min: 0, max: 360 }, frequency: 60, tint: o.tints, blendMode: 'ADD',
  });
  return { halo, dust, setPos(x, y) { halo.setPosition(x, y); dust.setPosition(x, y); }, setVisible(v) { halo.setVisible(v); dust.emitting = v; }, destroy() { halo.destroy(); dust.destroy(); } };
}
