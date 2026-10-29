// 효과: 꽃잎 · 금박 불꽃 · 단풍 · 눈 · 반딧불 텍스처(코드로 그림) + 계절 분위기 입자 + 점수 터짐
import { W, H } from './config.js?v=0.88.2';

export function makeFxTextures(scene) {
  const mk = (key, w, h, draw) => { if (scene.textures.exists(key)) return; const t = scene.textures.createCanvas(key, w, h); draw(t.getContext(), w, h); t.refresh(); };
  mk('fx_petal', 40, 28, g => { const gr = g.createRadialGradient(14, 14, 2, 20, 14, 20); gr.addColorStop(0, '#FFF0F4'); gr.addColorStop(1, '#F29BB4'); g.fillStyle = gr; g.beginPath(); g.moveTo(2, 14); g.bezierCurveTo(10, 0, 30, 0, 38, 10); g.lineTo(32, 14); g.lineTo(38, 18); g.bezierCurveTo(30, 28, 10, 28, 2, 14); g.fill(); });
  mk('fx_spark', 48, 48, g => { const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24); gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.25, 'rgba(255,214,120,0.9)'); gr.addColorStop(1, 'rgba(255,180,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 48, 48); g.fillStyle = '#FFF8E0'; g.beginPath(); g.moveTo(24, 2); g.lineTo(27, 21); g.lineTo(46, 24); g.lineTo(27, 27); g.lineTo(24, 46); g.lineTo(21, 27); g.lineTo(2, 24); g.lineTo(21, 21); g.closePath(); g.fill(); });
  mk('fx_leaf', 40, 40, g => { g.translate(20, 20); g.fillStyle = '#D9502A'; g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; g.lineTo(Math.cos(a) * 18, Math.sin(a) * 18); const b = a + Math.PI / 5; g.lineTo(Math.cos(b) * 7, Math.sin(b) * 7); } g.closePath(); g.fill(); });
  mk('fx_snow', 24, 24, g => { const gr = g.createRadialGradient(12, 12, 0, 12, 12, 12); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(220,235,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 24, 24); });
  mk('fx_fly', 32, 32, g => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,200,1)'); gr.addColorStop(0.3, 'rgba(220,255,140,0.7)'); gr.addColorStop(1, 'rgba(160,255,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
  mk('fx_gleaf', 30, 20, g => { const gr = g.createLinearGradient(0, 0, 30, 20); gr.addColorStop(0, '#FFF1C4'); gr.addColorStop(0.5, '#D4A24C'); gr.addColorStop(1, '#FFE29A'); g.fillStyle = gr; g.beginPath(); g.moveTo(1, 10); g.lineTo(9, 2); g.lineTo(26, 4); g.lineTo(29, 13); g.lineTo(14, 19); g.closePath(); g.fill(); });
  mk('fx_ring', 256, 256, g => { g.lineWidth = 10; g.strokeStyle = 'rgba(255,226,150,0.95)'; g.beginPath(); g.arc(128, 128, 118, 0, Math.PI * 2); g.stroke(); });
  mk('fx_rays', 512, 512, g => { g.translate(256, 256); for (let i = 0; i < 16; i++) { g.rotate(Math.PI / 8); const gr = g.createLinearGradient(0, 0, 250, 0); gr.addColorStop(0, 'rgba(255,230,160,0.55)'); gr.addColorStop(1, 'rgba(255,230,160,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(250, -18); g.lineTo(250, 18); g.closePath(); g.fill(); } });
  mk('px', 4, 4, g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 4, 4); });
  mk('vignette', 512, 512, g => { const gr = g.createRadialGradient(256, 230, 120, 256, 256, 360); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.85)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); });
}

// 계절 분위기 입자 (화면 전체에 천천히) — 계절 id: spring · summer · autumn · winter
export function ambient(scene, season, depth = 1) {
  const cfg = {
    spring: { tex: 'fx_petal', n: 1.1, speedY: [40, 90], scale: [0.5, 1], alpha: 0.85, tint: 0xffffff },
    summer: { tex: 'fx_fly', n: 1.6, speedY: [-20, 20], scale: [0.4, 0.9], alpha: 0.9, tint: 0xffffff, blink: true },
    autumn: { tex: 'fx_leaf', n: 0.9, speedY: [50, 100], scale: [0.5, 0.95], alpha: 0.85, tint: 0xffffff },
    winter: { tex: 'fx_snow', n: 2.2, speedY: [40, 80], scale: [0.4, 1], alpha: 0.85, tint: 0xffffff },
  }[season] || null;
  if (!cfg) return null;
  const e = scene.add.particles(0, 0, cfg.tex, {
    x: { min: -40, max: W + 40 }, y: cfg.blink ? { min: H * 0.1, max: H * 0.9 } : -40,
    lifespan: cfg.blink ? 4000 : 16000, speedY: { min: cfg.speedY[0], max: cfg.speedY[1] }, speedX: { min: -30, max: 40 },
    scale: { min: cfg.scale[0], max: cfg.scale[1] }, rotate: { start: 0, end: 360 }, alpha: cfg.blink ? { start: 0, end: 0, ease: t => Math.sin(t * Math.PI) } : { start: cfg.alpha, end: 0.2 },
    frequency: 1000 / cfg.n, quantity: 1, blendMode: cfg.blink ? 'ADD' : 'NORMAL',
  }).setDepth(depth);
  if (cfg.blink) e.particleAlpha = 1;
  return e;
}

// 점수 터짐: 금박 불꽃 + 꽃잎 (세기 0~1)
export function burst(scene, x, y, power = 0.5, depth = 3000) {
  const n = Math.round(10 + power * 50);
  const e1 = scene.add.particles(x, y, 'fx_spark', { speed: { min: 200, max: 500 + power * 600 }, angle: { min: 0, max: 360 }, scale: { start: 0.9, end: 0 }, lifespan: { min: 400, max: 900 }, blendMode: 'ADD', emitting: false }).setDepth(depth);
  const e2 = scene.add.particles(x, y, 'fx_gleaf', { speed: { min: 120, max: 400 + power * 400 }, angle: { min: 0, max: 360 }, gravityY: 500, rotate: { min: 0, max: 360 }, scale: { min: 0.6, max: 1.3 }, lifespan: { min: 900, max: 1600 }, alpha: { start: 1, end: 0 }, emitting: false }).setDepth(depth);
  e1.explode(n); e2.explode(Math.round(n * 0.6));
  if (power > 0.4) { const e3 = scene.add.particles(x, y, 'fx_petal', { speed: { min: 150, max: 500 }, angle: { min: 200, max: 340 }, gravityY: 260, rotate: { min: 0, max: 360 }, scale: { min: 0.6, max: 1.2 }, lifespan: 2000, alpha: { start: 1, end: 0 }, emitting: false }).setDepth(depth); e3.explode(Math.round(power * 40)); scene.time.delayedCall(2200, () => e3.destroy()); }
  scene.time.delayedCall(1800, () => { e1.destroy(); e2.destroy(); });
}
