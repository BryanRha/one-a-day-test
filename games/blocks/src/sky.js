// 블록 하늘 꾸밈 (2026-11-09 QA 시트 #1 · #9): 하늘 그림(bg_t*) 위로 흐르는 구름 · 떠다니는 보석 블록
//   홈 · 클래식 · 어드벤처 · 결과 · 컬렉션이 모두 같은 하늘 세계 — 움직임은 아주 느리게(판에 눈이 가도록), 판 뒤(depth -1 ~ 1)
import { W, H } from './config.js?v=0.99.12';
import { THEMES, PALETTE } from './scenes/Boot.js?v=0.99.12';

// 떠다니는 보석 블록 한 장 (스킨과 무관한 고정 그림 · 판 블록과 헷갈리지 않게 작고 흐리게)
function cubeTex(scene, k) {
  const key = `skycube_${k}`; if (scene.textures.exists(key)) return key;
  const S = 96, c = scene.textures.createCanvas(key, S, S), g = c.getContext(), [base, light, dark] = PALETTE[k];
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  rr(8, 10, 80, 80, 16); g.fillStyle = dark; g.fill();
  rr(8, 6, 80, 76, 16); const gr = g.createLinearGradient(0, 6, 0, 82); gr.addColorStop(0, light); gr.addColorStop(0.55, base); gr.addColorStop(1, dark); g.fillStyle = gr; g.fill();
  rr(16, 12, 64, 26, 12); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(26, 22, 4, 0, Math.PI * 2); g.fill();
  c.refresh(); return key;
}
function cloudTex(scene) {
  const key = 'skycloud'; if (scene.textures.exists(key)) return key;
  const w = 360, h = 140, c = scene.textures.createCanvas(key, w, h), g = c.getContext();
  [[90, 86, 60], [160, 64, 72], [240, 80, 58], [300, 96, 40], [50, 104, 36]].forEach(([x, y, r]) => { const gr = g.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
  c.refresh(); return key;
}

// 하늘 깔기: 배경 그림 + 구름 + 보석 블록. o.cubes: 개수(0 이면 없음) · o.calm: 판 화면(더 적고 흐리게)
export function sky(scene, theme, o = {}) {
  const th = THEMES[theme % THEMES.length];
  const bg = scene.add.image(W / 2, H / 2, `bg_t${theme % THEMES.length}`).setDisplaySize(W, Math.max(H, W * 1300 / 540)).setDepth(-3);
  const objs = [];
  const ck = cloudTex(scene), nC = o.calm ? 2 : 3;
  for (let i = 0; i < nC; i++) {
    const y = H * (0.18 + i * 0.27) + (i % 2) * 40, sc = 1.4 + (i % 3) * 0.5;
    const cl = scene.add.image(-200 + ((i * 397) % (W + 400)), y, ck).setScale(sc).setTint(th.drift).setAlpha(o.calm ? 0.1 : 0.16).setDepth(-2);
    scene.tweens.add({ targets: cl, x: W + 260, duration: 70000 + i * 18000, repeat: -1, onRepeat: () => { cl.x = -260; } });
    objs.push(cl);
  }
  const n = o.cubes ?? (o.calm ? 5 : 9);
  for (let i = 0; i < n; i++) {
    const k = i % PALETTE.length, near = i % 3 === 0, size = near ? 64 : 34 + (i * 7) % 20;
    const x = 60 + ((i * 263) % (W - 120)), y = 230 + ((i * 541) % Math.max(400, H - 360));
    const cb = scene.add.image(x, y, cubeTex(scene, k)).setDisplaySize(size, size).setAngle((i * 37) % 40 - 20).setAlpha(o.calm ? 0.22 : near ? 0.5 : 0.32).setDepth(-1);
    scene.tweens.add({ targets: cb, y: y - 30 - (i % 4) * 10, angle: cb.angle + (i % 2 ? 12 : -12), duration: 3600 + (i % 5) * 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 180 });
    objs.push(cb);
  }
  return { bg, objs, th };
}
