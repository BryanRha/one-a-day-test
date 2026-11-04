// 효과음 — 전부 Web Audio 로 직접 합성 (외부 파일 없음 · 저작권 걱정 없음)
let ctx = null, master = null, amb = null, muted = false;
const noiseBuf = {};
export function unlock() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; master.connect(comp); comp.connect(ctx.destination);
  for (const k of ['white', 'brown']) { const b = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate); const d = b.getChannelData(0); let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (k === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; } noiseBuf[k] = b; }
}
/* 원어데이 확인 창 · 광고 동안 소리 멈춤 → 창이 닫히면 다시 켬 (폰 iframe 에선 포커스가 앱에 남아 저절로 안 돌아옴 · iOS 'interrupted' 포함) */
export function suspendAudio() { try { if (ctx && ctx.state === 'running') ctx.suspend(); } catch { /* */ } }
export function resumeAudio() { try { if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => {}); } catch { /* */ } }
export const audioState = () => (ctx ? ctx.state : 'none');
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.8; }
export const isMuted = () => muted;
const now = () => ctx.currentTime;
function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function noise(kind, t, dur, f, q, peak, type = 'bandpass', pan = 0) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf[kind]; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const g = ctx.createGain(); env(g, t, 0.003, peak, dur); const p = ctx.createStereoPanner(); p.pan.value = pan;
  s.connect(fl); fl.connect(g); g.connect(p); p.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05); return fl;
}
function tone(t, f0, f1, dur, peak, type = 'sine', pan = 0) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain(); env(g, t, 0.004, peak, dur); const p = ctx.createStereoPanner(); p.pan.value = pan; o.connect(g); g.connect(p); p.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
let lastShot = 0;
export const sfx = {
  /* 작살총: 압축공기 '퉁' + 금속 찰칵 + 저음 펀치 */
  shot(pan = 0) { if (!ctx) return; const t = now(); if (t - lastShot < 0.03) return; lastShot = t;
    noise('white', t, 0.07, 2600 + Math.random() * 600, 0.9, 0.55, 'bandpass', pan); tone(t, 150, 48, 0.12, 0.9, 'sine', pan); tone(t, 900, 320, 0.04, 0.18, 'square', pan); noise('brown', t, 0.18, 400, 0.7, 0.5, 'lowpass', pan); },
  shell() { if (!ctx) return; const t = now() + 0.12 + Math.random() * 0.1; tone(t, 3200 + Math.random() * 800, 2600, 0.05, 0.05, 'triangle'); tone(t + 0.07, 3600, 3000, 0.04, 0.03, 'triangle'); },
  hit(pan = 0) { if (!ctx) return; const t = now(); noise('white', t, 0.05, 1500, 1.5, 0.5, 'bandpass', pan); tone(t, 420, 180, 0.07, 0.3, 'square', pan); },
  hitMetal(pan = 0) { if (!ctx) return; const t = now(); tone(t, 1900, 1200, 0.12, 0.22, 'triangle', pan); tone(t, 2700, 2100, 0.09, 0.12, 'sine', pan); noise('white', t, 0.04, 5000, 2, 0.3, 'highpass', pan); },
  kill(pan = 0) { if (!ctx) return; const t = now(); noise('brown', t, 0.35, 700, 0.6, 0.8, 'lowpass', pan); tone(t, 220, 55, 0.3, 0.6, 'sawtooth', pan); noise('white', t + 0.02, 0.2, 2500, 0.8, 0.35, 'bandpass', pan); },
  cover() { if (!ctx) return; const t = now(); noise('white', t, 0.06, 900, 1.2, 0.3); },
  hurt() { if (!ctx) return; const t = now(); tone(t, 300, 90, 0.22, 0.55, 'sawtooth'); noise('brown', t, 0.25, 300, 0.5, 0.6, 'lowpass'); },
  enemyShot(pan = 0) { if (!ctx) return; const t = now(); tone(t, 1400, 500, 0.09, 0.22, 'square', pan); noise('white', t, 0.05, 3000, 1, 0.2, 'bandpass', pan); },
  swing(pan = 0) { if (!ctx) return; const t = now(); noise('white', t, 0.16, 800, 0.8, 0.3, 'bandpass', pan); },
  roll() { if (!ctx) return; const t = now(); const f = noise('white', t, 0.25, 600, 0.6, 0.35); f.frequency.exponentialRampToValueAtTime(2400, t + 0.2); noise('brown', t, 0.2, 300, 0.5, 0.4, 'lowpass'); },
  splash() { if (!ctx) return; const t = now(); noise('white', t, 0.12, 1200 + Math.random() * 800, 0.7, 0.12, 'bandpass'); },
  step() { if (!ctx) return; const t = now(); noise('brown', t, 0.05, 500, 0.8, 0.15, 'lowpass'); },
  reload() { if (!ctx) return; const t = now(); tone(t, 600, 500, 0.04, 0.2, 'square'); tone(t + 0.5, 900, 800, 0.05, 0.25, 'square'); noise('white', t + 0.52, 0.04, 3000, 1, 0.25); },
  empty() { if (!ctx) return; const t = now(); tone(t, 1200, 1100, 0.03, 0.15, 'square'); },
  search() { if (!ctx) return; const t = now(); for (let i = 0; i < 3; i++) noise('white', t + i * 0.18, 0.1, 700 + i * 200, 0.7, 0.18); },
  pick(v = 0) { if (!ctx) return; const t = now(); const b = 660 + v * 40; tone(t, b, b, 0.08, 0.25, 'triangle'); tone(t + 0.07, b * 1.5, b * 1.5, 0.12, 0.22, 'triangle'); },
  rare() { if (!ctx) return; const t = now(); [784, 988, 1175, 1568].forEach((f, i) => tone(t + i * 0.07, f, f, 0.22, 0.2, 'triangle')); },
  alert(pan = 0) { if (!ctx) return; const t = now(); tone(t, 880, 880, 0.07, 0.2, 'square', pan); tone(t + 0.09, 1320, 1320, 0.1, 0.2, 'square', pan); },
  tick() { if (!ctx) return; const t = now(); tone(t, 1600, 1600, 0.03, 0.1, 'sine'); },
  siren() { if (!ctx) return; const t = now(); tone(t, 500, 900, 0.5, 0.25, 'sawtooth'); tone(t + 0.5, 900, 500, 0.5, 0.2, 'sawtooth'); },
  extract() { if (!ctx) return; const t = now(); [523, 659, 784, 1047, 1319].forEach((f, i) => tone(t + i * 0.09, f, f, 0.35, 0.22, 'triangle')); },
  die() { if (!ctx) return; const t = now(); tone(t, 330, 60, 0.9, 0.5, 'sawtooth'); noise('brown', t, 0.8, 400, 0.5, 0.6, 'lowpass'); },
  ui() { if (!ctx) return; const t = now(); tone(t, 900, 1100, 0.05, 0.12, 'sine'); },
  boom(pan = 0) { if (!ctx) return; const t = now(); noise('brown', t, 0.7, 260, 0.5, 1.0, 'lowpass', pan); tone(t, 120, 30, 0.6, 0.9, 'sine', pan); noise('white', t, 0.18, 1800, 0.6, 0.4, 'bandpass', pan); },
  puff() { if (!ctx) return; const t = now(); const f = noise('white', t, 0.9, 900, 0.5, 0.3, 'lowpass'); f.frequency.exponentialRampToValueAtTime(300, t + 0.9); },
  power() { if (!ctx) return; const t = now(); tone(t, 55, 110, 1.2, 0.5, 'sawtooth'); tone(t + 0.3, 220, 440, 0.6, 0.15, 'square'); [523, 784].forEach((f, i) => tone(t + 0.9 + i * 0.12, f, f, 0.25, 0.18, 'triangle')); },
  gate() { if (!ctx) return; const t = now(); for (let i = 0; i < 5; i++) tone(t + i * 0.09, 300 - i * 30, 200 - i * 20, 0.08, 0.25, 'square'); noise('brown', t, 0.6, 500, 0.6, 0.5, 'lowpass'); },
  roar(pan = 0) { if (!ctx) return; const t = now(); tone(t, 90, 45, 1.4, 0.8, 'sawtooth', pan); noise('brown', t, 1.3, 320, 0.4, 0.9, 'lowpass', pan); tone(t + 0.1, 140, 70, 1.0, 0.35, 'square', pan); },
  slam(pan = 0) { if (!ctx) return; const t = now(); tone(t, 70, 28, 0.5, 1.0, 'sine', pan); noise('brown', t, 0.5, 300, 0.5, 0.9, 'lowpass', pan); },
  warn() { if (!ctx) return; const t = now(); tone(t, 700, 700, 0.12, 0.2, 'square'); tone(t + 0.18, 700, 700, 0.12, 0.2, 'square'); },
  build() { if (!ctx) return; const t = now(); for (let i = 0; i < 4; i++) { noise('white', t + i * 0.11, 0.06, 2000, 1.5, 0.3); tone(t + i * 0.11, 300, 200, 0.06, 0.2, 'square'); } [659, 880].forEach((f, i) => tone(t + 0.5 + i * 0.1, f, f, 0.3, 0.2, 'triangle')); },
};
/* 바닥에 깔리는 물소리 · 낮은 웅웅 (판 중에만) */
export function ambience(on) {
  if (!ctx) return;
  if (on && !amb) { const s = ctx.createBufferSource(); s.buffer = noiseBuf.brown; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520; const g = ctx.createGain(); g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.16, now() + 1.5);
    const o = ctx.createOscillator(); o.frequency.value = 55; const og = ctx.createGain(); og.gain.value = 0.025; o.connect(og); og.connect(master);
    s.connect(f); f.connect(g); g.connect(master); s.start(); o.start(); amb = { s, g, o }; }
  if (!on && amb) { const a = amb; amb = null; a.g.gain.exponentialRampToValueAtTime(0.0001, now() + 0.6); setTimeout(() => { try { a.s.stop(); a.o.stop(); } catch { /* */ } }, 700); }
}
