// 원작 UI 그리기 도구 (v0.3.0 원작 맞춤)
//   원작은 800×480 좌표에 그림을 '기준점 + 정렬 번호'로 찍는다(Texture2D.drawAtPointOption). 여기서는 같은 좌표를 받아
//   변환 T = { x0, y0, s } (원작 1px → 화면 s px) 로 옮겨 찍는다. 아틀라스 그림은 원작의 ×2.4 로 키워 두었다(SCALE).
import { SCALE, FONT } from '../config.js?v=0.95.6';
import { FRAME_ATLAS } from './Boot.js?v=0.95.6';

// 원작 정렬 번호 → 기준점 (18 왼쪽 위 · 17 가운데 위 · 20 오른쪽 위 · 9 가운데 · 10 왼쪽 가운데 · 12 오른쪽 가운데 · 33 가운데 아래 · 34 왼쪽 아래 · 36 오른쪽 아래)
export const ANCH = { 18: [0, 0], 17: [0.5, 0], 20: [1, 0], 9: [0.5, 0.5], 10: [0, 0.5], 12: [1, 0.5], 33: [0.5, 1], 34: [0, 1], 36: [1, 1] };
export const T0 = (x0, y0, s) => ({ x0, y0, s, x: x => x0 + x * s, y: y => y0 + y * s });

export function has(name) { return !!FRAME_ATLAS[name]; }
// 원작 그림 한 장 (이름 = 원작 파일 이름) · k = 추가 배율(원작 drawAtPointOptionSize)
export function img(sc, T, name, x, y, anchor = 18, k = 1) {
  const a = FRAME_ATLAS[name];
  if (!a) { const z = sc.add.rectangle(T.x(x), T.y(y), 2, 2, 0, 0); z.missing = name; return z; }
  const [ox, oy] = ANCH[anchor] || ANCH[18];
  return sc.add.image(T.x(x), T.y(y), a, name).setOrigin(ox, oy).setScale(T.s * k / SCALE);
}
// 원작 그림의 원래 크기 (원작 px)
export function size(sc, name) { const a = FRAME_ATLAS[name]; if (!a) return [0, 0]; const f = sc.textures.getFrame(a, name); return [f.width / SCALE, f.height / SCALE]; }

// 원작 숫자 그림 (drawNumberBlock): prefix_0..9 · gap = 글자 사이 · anchor 18 왼쪽 / 20 오른쪽 / 17 가운데 · min = 최소 자릿수(앞에 0)
//   글자는 가장 큰 숫자 높이에 아래를 맞춘다. 돌려주는 값: { c(컨테이너), set(v), right(끝 x, 원작 좌표) }
export function num(sc, T, prefix, x, y, gap = 1, anchor = 18, min = 1, depth = 0) {
  const c = sc.add.container(0, 0).setDepth(depth);
  let last = null, right = x;
  const maxH = Math.max(...[...Array(10).keys()].map(d => size(sc, `${prefix}_${d}`)[1]));
  const o = {
    c, get right() { return right; },
    set(v, nx = x, ny = y) {
      v = Math.max(0, Math.floor(v)); const key = `${v}|${nx}|${ny}`; if (key === last) return o; last = key;
      c.removeAll(true);
      let s = String(v); while (s.length < min) s = '0' + s;
      const ws = [...s].map(ch => size(sc, `${prefix}_${ch}`)[0]);
      const total = ws.reduce((a, b) => a + b, 0) + (s.length - 1) * gap;
      let cx = anchor === 20 || anchor === 36 ? nx - total : anchor === 17 || anchor === 9 || anchor === 33 ? nx - total / 2 : nx;
      const by = anchor === 9 || anchor === 10 || anchor === 12 ? ny + maxH / 2 : anchor === 33 || anchor === 34 || anchor === 36 ? ny : ny + maxH;
      [...s].forEach((ch, i) => { c.add(img(sc, T, `${prefix}_${ch}`, cx, by, 34)); cx += ws[i] + gap; });
      right = cx - gap;
      return o;
    },
  };
  return o;
}

// 글자 (원작 drawStringM 자리 · size 는 원작 px) — 한국어 문구는 여기로 얹는다
export function label(sc, T, s, x, y, size, color = '#FFFFFF', anchor = 18, opt = {}) {
  const px = Math.max(8, Math.round(size * T.s));
  const t = sc.add.text(T.x(x), T.y(y), s, { fontFamily: FONT, fontSize: `${px}px`, fontStyle: opt.weight || '800', color, stroke: opt.stroke ?? '#000000', strokeThickness: opt.st ?? Math.max(2, Math.round(px / 7)), align: opt.align || 'left', lineSpacing: opt.ls ?? 0 });
  const [ox, oy] = ANCH[anchor] || ANCH[18]; t.setOrigin(ox, oy);
  if (opt.shadow) t.setShadow(0, Math.round(px / 12), '#000000', Math.round(px / 6), true, true);
  return t;
}
// 원작 좌표 사각형 → 화면 사각형
export const rect = (T, x, y, w, h) => [T.x(x), T.y(y), w * T.s, h * T.s];
export const inRect = (T, px, py, x, y, w, h) => px >= T.x(x) && px <= T.x(x + w) && py >= T.y(y) && py <= T.y(y + h);
