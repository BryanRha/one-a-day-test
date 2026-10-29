// 족보 표 한 줄: 이름 · 예시 패(작게) · 설명 · 점수×배수 — 놀이 중 표 · 도감이 같이 씀
import { C } from './config.js?v=0.92.7';
import { txt } from './ui.js?v=0.92.7';
import { yakuExample } from './meta.js?v=0.92.7';

export function yakuRow(scene, parent, x0, y, yk, got, w = 1000) {
  const L = x0 - w / 2, R = x0 + w / 2;
  parent.add(txt(scene, L + 20, y, yk.name, 30, got ? C.gold : C.ivory, { ox: 0, thick: 3 }));
  const ex = yakuExample(yk), sc = 0.12, step = Math.min(26, 120 / Math.max(1, ex.length - 1));
  ex.forEach((c, i) => parent.add(scene.add.image(L + 210 + i * step, y, 'card_' + c.id).setScale(sc).setAngle((i - (ex.length - 1) / 2) * 4)));
  parent.add(txt(scene, L + 380, y, yk.desc, 21, got ? C.ivory : C.dim, { ox: 0, thick: 2, weight: '700', wrap: w - 560, align: 'left' }));
  parent.add(txt(scene, R - 16, y, `${yk.chips} × ${yk.mult}`, 28, got ? C.goldHi : '#8A7F6E', { ox: 1, thick: 3 }));
}
