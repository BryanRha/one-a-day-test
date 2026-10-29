// 소리 — 전부 직접 합성 (종이 · 스티커 · 도장 계열, 외부 음원 없음)
let ac = null, master = null, muted = false;
export function unlock() {
  if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; ac = new C(); master = ac.createGain(); master.gain.value = 0.7; master.connect(ac.destination); }
  if (ac.state === 'suspended') ac.resume();
}
export const setMuted = m => { muted = m; if (master) master.gain.value = m ? 0 : 0.7; };
export const isMuted = () => muted;

function noiseBuf(sec) {
  const n = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
function tone(freq, t, { type = 'sine', a = 0.004, dec = 0.18, peak = 0.3, bend = 0 } = {}) {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (bend) o.frequency.exponentialRampToValueAtTime(freq * bend, t + a + dec);
  env(g, t, a, peak, dec); o.connect(g); g.connect(master); o.start(t); o.stop(t + a + dec + 0.05);
}
function noise(t, { f = 2000, q = 1, dec = 0.08, peak = 0.25, type = 'bandpass' } = {}) {
  const s = ac.createBufferSource(); s.buffer = noiseBuf(dec + 0.05); const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const g = ac.createGain(); env(g, t, 0.003, peak, dec); s.connect(fl); fl.connect(g); g.connect(master); s.start(t); s.stop(t + dec + 0.06);
}
const ok = () => ac && !muted;

/* 타일 누름: 나무 · 종이 '톡' */
export function tap() { if (!ok()) return; const t = ac.currentTime; tone(880, t, { type: 'triangle', dec: 0.06, peak: 0.18, bend: 0.7 }); noise(t, { f: 3200, q: 2, dec: 0.03, peak: 0.12 }); }
/* 칸에 닿음: 낮은 '탁' */
export function land() { if (!ok()) return; const t = ac.currentTime; tone(420, t, { type: 'sine', dec: 0.07, peak: 0.22, bend: 0.8 }); noise(t, { f: 1400, q: 1.5, dec: 0.04, peak: 0.1 }); }
/* 덮인 타일 · 안 되는 입력: 부드러운 '툭' */
export function nope() { if (!ok()) return; const t = ac.currentTime; tone(180, t, { type: 'sine', dec: 0.09, peak: 0.16, bend: 0.85 }); }
/* 세 개 터짐 '뽁' — 연속일수록 반음씩 올라감 (combo 0부터) */
const SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19];
export function pop(combo = 0) {
  if (!ok()) return; const t = ac.currentTime, base = 523.25 * Math.pow(2, SCALE[Math.min(combo, SCALE.length - 1)] / 12);
  tone(base * 0.5, t, { type: 'sine', a: 0.002, dec: 0.09, peak: 0.35, bend: 2.2 });
  tone(base, t + 0.03, { type: 'triangle', dec: 0.22, peak: 0.2 });
  tone(base * 1.5, t + 0.07, { type: 'sine', dec: 0.3, peak: 0.12 });
  noise(t, { f: 5000, q: 0.8, dec: 0.12, peak: 0.08, type: 'highpass' });
}
/* 섞기: 종이 넘기는 소리 */
export function shuffle() { if (!ok()) return; const t = ac.currentTime; for (let i = 0; i < 5; i++) noise(t + i * 0.05, { f: 1800 + i * 500, q: 0.7, dec: 0.07, peak: 0.12 }); }
/* 되돌리기: 위로 '슉' */
export function undo() { if (!ok()) return; const t = ac.currentTime; tone(330, t, { type: 'sine', dec: 0.14, peak: 0.16, bend: 1.8 }); }
/* 자석: 반짝 세 음 */
export function magnet() { if (!ok()) return; const t = ac.currentTime; [784, 988, 1175].forEach((f, i) => tone(f, t + i * 0.06, { type: 'triangle', dec: 0.2, peak: 0.12 })); }
/* 판 비움 축하: 아르페지오 + 반짝 */
export function clear() {
  if (!ok()) return; const t = ac.currentTime;
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => { tone(f, t + i * 0.09, { type: 'triangle', dec: 0.5, peak: 0.16 }); tone(f * 2, t + i * 0.09 + 0.02, { type: 'sine', dec: 0.3, peak: 0.05 }); });
  for (let i = 0; i < 8; i++) tone(2000 + Math.random() * 2000, t + 0.5 + i * 0.05, { type: 'sine', dec: 0.15, peak: 0.04 });
}
/* 스티커 '착': 떼는 소리 + 붙는 소리 */
export function stick(i = 0) {
  if (!ok()) return; const t = ac.currentTime;
  noise(t, { f: 2600, q: 0.6, dec: 0.09, peak: 0.1, type: 'highpass' });
  tone(260 + i * 18, t + 0.06, { type: 'sine', dec: 0.08, peak: 0.28, bend: 0.6 });
  noise(t + 0.06, { f: 900, q: 1.2, dec: 0.05, peak: 0.18 });
}
/* 도장 '쿵' */
export function stamp() { if (!ok()) return; const t = ac.currentTime; tone(95, t, { type: 'sine', a: 0.002, dec: 0.22, peak: 0.55, bend: 0.6 }); noise(t, { f: 600, q: 0.8, dec: 0.12, peak: 0.3, type: 'lowpass' }); }
/* 칸이 거의 참: 아주 작은 경고 (빨간 경고음 X) */
export function warn() { if (!ok()) return; const t = ac.currentTime; tone(392, t, { type: 'sine', dec: 0.25, peak: 0.08 }); }
/* 얼음 깨짐: 맑은 '쨍' */
export function crack() { if (!ok()) return; const t = ac.currentTime; noise(t, { f: 6000, q: 3, dec: 0.12, peak: 0.14, type: 'bandpass' }); tone(1760, t, { type: 'triangle', dec: 0.12, peak: 0.08, bend: 1.3 }); }
/* 사슬 풀림: 짤랑 */
export function unchain() { if (!ok()) return; const t = ac.currentTime; [1320, 1680, 1480].forEach((f, i) => tone(f, t + i * 0.05, { type: 'square', dec: 0.06, peak: 0.03 })); }
/* 스티커 받음: 작은 반짝 */
export function get() { if (!ok()) return; const t = ac.currentTime; tone(1046.5, t, { type: 'sine', dec: 0.15, peak: 0.1 }); tone(1568, t + 0.06, { type: 'sine', dec: 0.2, peak: 0.08 }); }
/* 버튼: 종이 톡 */
export function click() { if (!ok()) return; const t = ac.currentTime; noise(t, { f: 2400, q: 1.5, dec: 0.025, peak: 0.1 }); }
