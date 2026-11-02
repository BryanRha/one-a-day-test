// 소리 — 전부 직접 합성 (외부 음원 없음) · 효과음 / 배경음 따로 끔 · 화면을 숨기면 0
//   종소리(손님 입장) · 돋보기 반짝 · 단서 찾음 · 카드 꽂힘 · 도장 · 타이핑 · 동전 · 장부 넘김 · 모순 · 버튼
//   배경음: 느린 재즈 왈츠 느낌(로즈 피아노 + 콘트라베이스 퉁김 + 브러시) — 오래된 가게 오후
let ac = null, master = null, sgain = null, muted = false;
export function unlock() {
  if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; ac = new C(); master = ac.createGain(); master.gain.value = 1; master.connect(ac.destination); sgain = ac.createGain(); sgain.gain.value = muted ? 0 : 0.7; sgain.connect(master); }
  if (ac.state === 'suspended' && !document.hidden) ac.resume();
  if (music) startMusic();
}
export const setMuted = m => { muted = m; if (sgain) sgain.gain.value = m ? 0 : 0.7; };
export const isMuted = () => muted;
const ok = () => ac && !muted && !document.hidden;

function noiseBuf(sec) { const n = Math.max(1, Math.floor(ac.sampleRate * sec)), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; }
function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
function tone(freq, t, { type = 'sine', a = 0.004, dec = 0.18, peak = 0.3, bend = 0, to = sgain } = {}) {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (bend) o.frequency.exponentialRampToValueAtTime(freq * bend, t + a + dec);
  env(g, t, a, peak, dec); o.connect(g); g.connect(to); o.start(t); o.stop(t + a + dec + 0.05);
}
function noise(t, { f = 2000, q = 1, dec = 0.08, peak = 0.25, type = 'bandpass', to = sgain } = {}) {
  const s = ac.createBufferSource(); s.buffer = noiseBuf(dec + 0.05); const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const g = ac.createGain(); env(g, t, 0.003, peak, dec); s.connect(fl); fl.connect(g); g.connect(to); s.start(t); s.stop(t + dec + 0.06);
}

/* 문 종: 놋쇠 종 두 번 (비화성 배음) */
export function bell() { if (!ok()) return; const t = ac.currentTime; for (const [k, dt] of [[1, 0], [0.94, 0.22]]) { const b = 1318 * k; [1, 2.76, 5.4, 8.9].forEach((m, i) => tone(b * m, t + dt, { type: 'sine', a: 0.002, dec: 1.4 / (i + 1), peak: 0.16 / (i + 1) })); } noise(t, { f: 6000, q: 2, dec: 0.05, peak: 0.05 }); }
/* 돋보기가 단서 위를 지남: 작은 반짝 */
export function glint() { if (!ok()) return; const t = ac.currentTime; tone(2093, t, { dec: 0.18, peak: 0.06 }); tone(3136, t + 0.05, { dec: 0.22, peak: 0.04 }); }
/* 단서 짚음: 맑은 퉁 + 종이 */
export function found(i = 0) { if (!ok()) return; const t = ac.currentTime, b = [659.25, 783.99, 880, 987.77, 1174.66][i % 5]; tone(b, t, { type: 'triangle', dec: 0.35, peak: 0.22 }); tone(b * 1.5, t + 0.06, { dec: 0.4, peak: 0.1 }); noise(t + 0.02, { f: 3000, q: 0.7, dec: 0.08, peak: 0.08 }); }
/* 카드가 꽂힘: 종이 '탁' */
export function card() { if (!ok()) return; const t = ac.currentTime; noise(t, { f: 2200, q: 0.8, dec: 0.06, peak: 0.2 }); tone(240, t, { dec: 0.06, peak: 0.16, bend: 0.7 }); }
/* 함정이 정상으로 판명: 부드러운 두 음 */
export function okay() { if (!ok()) return; const t = ac.currentTime; tone(523.25, t, { type: 'triangle', dec: 0.2, peak: 0.12 }); tone(659.25, t + 0.09, { type: 'triangle', dec: 0.3, peak: 0.12 }); }
/* 빈 곳 누름: 아주 작은 '톡' (틀림 소리 아님) */
export function nope() { if (!ok()) return; const t = ac.currentTime; tone(330, t, { dec: 0.07, peak: 0.08, bend: 0.85 }); }
/* 모순 발견: 낮은 '둥' + 펜 긋기 */
export function contra() { if (!ok()) return; const t = ac.currentTime; tone(196, t, { type: 'triangle', dec: 0.4, peak: 0.25 }); tone(293.66, t + 0.1, { type: 'triangle', dec: 0.45, peak: 0.16 }); noise(t + 0.18, { f: 4200, q: 3, dec: 0.18, peak: 0.07 }); }
/* 도장 '쾅' */
export function stamp() { if (!ok()) return; const t = ac.currentTime; tone(90, t, { a: 0.002, dec: 0.3, peak: 0.6, bend: 0.55 }); noise(t, { f: 500, q: 0.8, dec: 0.15, peak: 0.35, type: 'lowpass' }); noise(t + 0.01, { f: 2400, q: 1, dec: 0.04, peak: 0.12 }); }
/* 타이핑: 글자마다 아주 작은 딸깍 (너무 잦지 않게) */
let lastType = 0;
export function type() { if (!ok()) return; const t = ac.currentTime; if (t - lastType < 0.045) return; lastType = t; noise(t, { f: 3800 + Math.random() * 1400, q: 4, dec: 0.012, peak: 0.035 }); }
/* 동전 */
export function coin(n = 3) { if (!ok()) return; const t = ac.currentTime; for (let i = 0; i < n; i++) { tone(1975 + i * 140, t + i * 0.07, { type: 'square', dec: 0.08, peak: 0.025 }); tone(2637, t + i * 0.07 + 0.02, { dec: 0.2, peak: 0.05 }); } }
/* 장부 넘김 */
export function page() { if (!ok()) return; const t = ac.currentTime; for (let i = 0; i < 4; i++) noise(t + i * 0.04, { f: 1400 + i * 500, q: 0.6, dec: 0.08, peak: 0.08 }); }
/* 버튼 · 칩 */
export function tap() { if (!ok()) return; const t = ac.currentTime; noise(t, { f: 2600, q: 1.5, dec: 0.025, peak: 0.12 }); tone(880, t, { dec: 0.04, peak: 0.05, bend: 0.8 }); }
/* 칭찬 · 명감정 */
export function fanfare(level = 2) { if (!ok()) return; const t = ac.currentTime; const n = level === 2 ? [523.25, 659.25, 783.99, 1046.5] : level === 1 ? [523.25, 659.25, 783.99] : [440, 554.37, 659.25]; n.forEach((f, i) => { tone(f, t + i * 0.1, { type: 'triangle', dec: 0.6, peak: 0.14 }); tone(f * 2, t + i * 0.1 + 0.02, { dec: 0.3, peak: 0.04 }); }); }
/* 먼지: 작은 '냐' (사람 목소리 흉내 아님 — 짧은 휘어지는 음) */
export function meow() { if (!ok()) return; const t = ac.currentTime; tone(720, t, { type: 'triangle', a: 0.03, dec: 0.22, peak: 0.08, bend: 1.35 }); tone(1440, t, { a: 0.03, dec: 0.18, peak: 0.02, bend: 1.3 }); }

/* ---------- 배경음 ---------- */
let music = true, mgain = null, mtimer = 0, mnext = 0, mbar = 0;
const hz = n => 440 * Math.pow(2, (n - 69) / 12);
/* Fmaj7 · Dm9 · Gm7 · C9 (느린 3박) */
const CH = [[53, 57, 60, 64], [50, 53, 57, 60, 64], [55, 58, 62, 65], [48, 52, 55, 58, 62]], BASS = [41, 38, 43, 36];
export const musicOn = () => music;
export function setMusic(v) { music = v; if (mgain && ac) mgain.gain.setTargetAtTime(v && !document.hidden ? 0.07 : 0, ac.currentTime, 0.3); if (v) startMusic(); }
function rhodes(f, t, len, vol) { const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter(); o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 2.001; fl.type = 'lowpass'; fl.frequency.value = 2200;
  const g2 = ac.createGain(); g2.gain.value = 0.18; o2.connect(g2); g2.connect(fl); o.connect(fl); fl.connect(g); g.connect(mgain);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(vol * 0.4, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.start(t); o2.start(t); o.stop(t + len + 0.05); o2.stop(t + len + 0.05); }
function pluck(f, t) { const o = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter(); o.type = 'triangle'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = 500; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9); o.connect(fl); fl.connect(g); g.connect(mgain); o.start(t); o.stop(t + 1); }
function brush(t, v) { const s = ac.createBufferSource(); s.buffer = noiseBuf(0.25); const fl = ac.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 5000; fl.Q.value = 0.5; const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); s.connect(fl); fl.connect(g); g.connect(mgain); s.start(t); s.stop(t + 0.26); }
function schedule() {
  if (!ac || !mgain) return;
  while (mnext < ac.currentTime + 1.4) {
    const i = mbar % 4, ch = CH[i], beat = 0.62, t0 = mnext;
    if (!music || document.hidden) { mnext += beat * 3; mbar++; continue; }   /* 꺼져 있으면 음을 만들지 않음 */
    pluck(hz(BASS[i]), t0); if (mbar % 2) pluck(hz(BASS[i] + 7), t0 + beat * 2);
    ch.forEach((n, k) => rhodes(hz(n), t0 + beat + k * 0.012, beat * 2.6, 0.05));
    if (Math.random() < 0.8) rhodes(hz(ch[ch.length - 1] + 12 + [0, 2, -1][mbar % 3]), t0 + beat * 2 + 0.05, beat * 1.4, 0.035);
    for (let b = 0; b < 3; b++) brush(t0 + b * beat, b ? 0.03 : 0.045);
    mnext += beat * 3; mbar++;
  }
}
export function startMusic() {
  if (!ac || mtimer) return; mgain = ac.createGain(); mgain.gain.value = 0; mgain.connect(master); mgain.gain.setTargetAtTime(music && !document.hidden ? 0.07 : 0, ac.currentTime, 1.2);
  mnext = ac.currentTime + 0.3; mtimer = setInterval(schedule, 400); schedule();
}
/* 화면을 숨기면 소리 0 (배경음 · 효과음 모두) · 돌아오면 설정대로 */
document.addEventListener('visibilitychange', () => {
  if (!ac) return;
  if (document.hidden) { if (mgain) mgain.gain.setTargetAtTime(0, ac.currentTime, 0.05); master.gain.setTargetAtTime(0, ac.currentTime, 0.02); setTimeout(() => { if (document.hidden && ac.state === 'running') ac.suspend(); }, 250); }
  else { ac.resume(); master.gain.setTargetAtTime(1, ac.currentTime, 0.05); if (mgain) mgain.gain.setTargetAtTime(music ? 0.07 : 0, ac.currentTime, 0.4); }
});
