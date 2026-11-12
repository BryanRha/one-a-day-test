// 소리: 효과음 sfx_*.m4a(기준판 그대로 — 대부분 K뷰티 레시피 때 우리가 만든 소리) · 배경음 bgm_b1~b4(지점별 · 0.4 때 직접 작곡) · 설정(켜기/끄기)
const SFX = { coin: 1, pick: 1, drop: 1, build: 1, levelup: 1, order: 1, tap: 1, blip: 1, error: 1, unlock: 1, reward: 1 };
/* 음량 표 (기준판 재정비 ①-3): 파일마다 크기가 −10.8 ~ −32.3dB 로 들쭉날쭉 → 파일 배율을 곱해 부르는 곳의 vol 그대로 이런 크기가 되게 맞춤
   돈 줍기(coin)는 기준 = 1 (대표가 기억하는 소리 · 크기 그대로) · 자주 나는 소리(집기 · 놓기 · 건넴 · 단추) ≈ −33dB · 계산 · 열림 ≈ −28dB · 보상 · 레벨업 ≈ −25dB
   (재는 법: 소리 난 구간 RMS + 20log10(부르는 vol) — 2026-11-12 측정, 0.5.0 완료 보고) */
const GAIN = { coin: 1, pick: 3.67, drop: 0.77, blip: 0.94, tap: 1.93, order: 0.91, unlock: 0.6, reward: 0.275, levelup: 0.6, build: 0.6, error: 0.3 };
/* 배경음: 지점별 4곡(76~86초) · 기준판 15초 곡보다 3dB 조용하게 (대표 11-11 「잔잔하고 조용한 곡」) */
const BGM_GAIN = { b1: 0.36, b2: 0.40, b3: 0.36, b4: 0.36 };
/* mp3 로 만든 것 (나머지는 m4a) */
const HAS = new Set();
let ctx = null, master = null, sfxG = null, bgmG = null; const buf = {}, loading = {}; let cur = null, curName = '', want = '';
export const AUD = { sfx: true, bgm: true };
function ac() { if (ctx) return ctx; const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); master = ctx.createGain(); master.connect(ctx.destination); sfxG = ctx.createGain(); sfxG.gain.value = AUD.sfx ? 1 : 0; sfxG.connect(master); bgmG = ctx.createGain(); bgmG.gain.value = AUD.bgm ? 0.55 : 0; bgmG.connect(master); return ctx; }
export function unlock() { const c = ac(); if (c && c.state === 'suspended') c.resume(); if (want && !cur) music(want); }
addEventListener('pointerdown', unlock, { capture: true }); addEventListener('keydown', unlock, { capture: true });
document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
function get(name) { if (buf[name]) return Promise.resolve(buf[name]); const f = ext => fetch(`assets/audio/${name}.${ext}`).then(r => r.ok ? r.arrayBuffer() : Promise.reject());
  return loading[name] ||= (HAS.has(name) ? f('mp3') : f('m4a')).then(a => new Promise((ok, no) => ac().decodeAudioData(a, ok, no))).then(b => (buf[name] = b)).catch(() => null); }
export function preloadSfx() { if (!ac()) return; for (const [k, n] of Object.entries(SFX)) for (let i = 1; i <= n; i++) get(`sfx_${k}${n > 1 ? i : ''}`); }
const lastT = {};
export function sfx(k, o = {}) {
  const c = ac(); if (!c || !AUD.sfx) return; const n = SFX[k] || 1, name = `sfx_${k}${n > 1 ? 1 + Math.floor(Math.random() * n) : ''}`;
  const now = c.currentTime; if (lastT[k] && now - lastT[k] < 0.03) return; lastT[k] = now;
  const b = buf[name]; if (!b) { get(name); return; }
  const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = o.rate || 1; const g = c.createGain(); g.gain.value = (o.vol ?? 0.7) * (GAIN[k] ?? 1); s.connect(g); g.connect(sfxG); s.start();
}
export function music(name) {
  want = name; const c = ac(); if (!c || name === curName) return; curName = name; const old = cur; cur = null;
  if (old) { old.g.gain.setTargetAtTime(0, c.currentTime, 0.4); setTimeout(() => { try { old.s.stop(); } catch { /* */ } }, 1600); }
  if (!name) return;
  get('bgm_' + name).then(b => { if (!b || curName !== name) return; const s = c.createBufferSource(); s.buffer = b; s.loop = true; const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(BGM_GAIN[name] ?? 1, c.currentTime, 0.6); s.connect(g); g.connect(bgmG); s.start(); cur = { s, g }; });
}
export function setAudio(o) { Object.assign(AUD, o); if (sfxG) sfxG.gain.value = AUD.sfx ? 1 : 0; if (bgmG) bgmG.gain.value = AUD.bgm ? 0.55 : 0; }
