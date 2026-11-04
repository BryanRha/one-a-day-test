// 소리 — 전부 Web Audio 로 직접 합성 (소리 파일 0개 · 저작권 걱정 없음)
//  효과음 = 이 파일 · 배경음 5곡(적응형) = assets/audio/music.js (첫 탭 뒤 늦게 받음 — 첫 진입 용량 X)
//  이름 목록 · 렌더 측정표 = docs/AUDIO.md · 미리듣기 = docs/audio_preview/
let ctx = null, master = null, sfxBus = null, musBus = null, revIn = null, amb = null;
let mus = null, musLoad = null, drive = 0, T0 = 0;
const noiseBuf = {};
/* 설정: 음량 · 배경음 · 음소거 (기기에 기억) */
const SET = { vol: 1, music: true, muted: false };
try { Object.assign(SET, JSON.parse(localStorage.getItem('salvage_audio') || '{}')); } catch { /* */ }
const saveSet = () => { try { localStorage.setItem('salvage_audio', JSON.stringify(SET)); } catch { /* */ } };
const MASTER = 0.85, MUS = 0.5;
const applySet = () => { if (!ctx) return; const t = ctx.currentTime; master.gain.setTargetAtTime(SET.muted ? 0 : SET.vol * MASTER, t, 0.03); musBus.gain.setTargetAtTime(SET.music ? MUS : 0, t, 0.3); };
const isOffline = c => typeof OfflineAudioContext !== 'undefined' && c instanceof OfflineAudioContext;

export function unlock() {
  if (ctx) { if (ctx.state === 'suspended' && !isOffline(ctx)) ctx.resume().catch(() => {}); return; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  const sr = ctx.sampleRate;
  master = ctx.createGain();
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.18;
  /* 맨 끝 아주 살짝 고음 깎기 (archer 교훈: 날카로우면 피로) */
  const tame = ctx.createBiquadFilter(); tame.type = 'highshelf'; tame.frequency.value = 7000; tame.gain.value = -4;
  master.connect(comp); comp.connect(tame); tame.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.connect(master);
  musBus = ctx.createGain(); musBus.connect(master);
  /* 울림: 물에 잠긴 콘크리트 방 (만든 잔향 1.9초 · 꼬리일수록 어두움) */
  revIn = ctx.createConvolver(); const ir = ctx.createBuffer(2, Math.round(sr * 1.9), sr);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); let lp = 0;
    for (let i = 0; i < d.length; i++) { const x = i / sr, k = 0.08 + 0.9 * Math.exp(-x * 3.2); lp += (Math.random() * 2 - 1 - lp) * k; d[i] = x < 0.012 ? 0 : lp * Math.exp(-x * 3.4) * 0.7; } }
  revIn.buffer = ir; const rv = ctx.createGain(); rv.gain.value = 0.55; revIn.connect(rv); rv.connect(master);
  for (const k of ['white', 'pink', 'brown']) { const b = ctx.createBuffer(1, sr * 2, sr); const d = b.getChannelData(0); let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1;
      if (k === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else if (k === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
      else d[i] = w; } noiseBuf[k] = b; }
  applySet();
  if (isOffline(ctx)) return;
  /* 배경음: 첫 탭 1초 뒤 받아서 (첫 진입 용량에 안 들어감) · 0.25초마다 장면 · 긴장 단계 맞춤 */
  setTimeout(loadMusic, 1000); drive = setInterval(musicTick, 250);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') suspendAudio(); });
}
/* 원어데이 확인 창 · 광고 동안 소리 멈춤 → 창이 닫히면 다시 켬 (폰 iframe 에선 포커스가 앱에 남아 저절로 안 돌아옴 · iOS 'interrupted' 포함) */
export function suspendAudio() { try { if (ctx && ctx.state === 'running') ctx.suspend(); } catch { /* */ } }
export function resumeAudio() { try { if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => {}); } catch { /* */ } }
export const audioState = () => (ctx ? ctx.state : 'none');
export function setMuted(m) { SET.muted = !!m; saveSet(); applySet(); }
export const isMuted = () => SET.muted;
export function setVolume(v) { SET.vol = Math.max(0, Math.min(1, v)); saveSet(); applySet(); }
export const getVolume = () => SET.vol;
export function setMusic(on) { SET.music = !!on; saveSet(); applySet(); }
export const musicOn = () => SET.music;
/* 은신처 아래 버튼 하나로 돌려 가며: 켬 → 작게 → 배경음 끔 → 끔 */
const STEPS = [{ vol: 1, music: true, muted: false, t: '소리 · 켬' }, { vol: 0.5, music: true, muted: false, t: '소리 · 작게' }, { vol: 1, music: false, muted: false, t: '배경음 끔' }, { vol: 1, music: true, muted: true, t: '소리 끔' }];
const stepNow = () => Math.max(0, STEPS.findIndex(s => s.muted === SET.muted && (s.muted || (s.music === SET.music && (!s.music || s.vol === SET.vol)))));
export const soundLabel = () => STEPS[stepNow()].t;
export function cycleSound() { const s = STEPS[(stepNow() + 1) % STEPS.length]; Object.assign(SET, { vol: s.vol, music: s.music, muted: s.muted }); saveSet(); unlock(); applySet(); if (!SET.muted) sfx.ui(); }

/* ───── 합성 도구 ───── */
const now = () => ctx.currentTime + T0;
const rnd = (a, b) => a + Math.random() * (b - a);
const cl = v => Math.max(-1, Math.min(1, v));
const R = () => (typeof window !== 'undefined' && window.__salvage && window.__salvage.raid) || null;
let satCurve = null;
function sat() { if (!satCurve) { satCurve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; satCurve[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); } } const w = ctx.createWaveShaper(); w.curve = satCurve; return w; }
/* 목소리 하나: 소스 → (필터) → (포화) → 엔벨로프 → (팬) → 버스 (+ 울림 보내기) */
function voice(src, o) {
  let n = src; const t = o.t, a = o.a ?? 0.002, hold = o.hold || 0;
  if (o.ft) { const f = ctx.createBiquadFilter(); f.type = o.ft; f.frequency.setValueAtTime(o.ff, t); if (o.ff1) f.frequency.exponentialRampToValueAtTime(o.ff1, t + (o.fdur || a + hold + o.dur)); f.Q.value = o.q ?? 0.7; n.connect(f); n = f; }
  if (o.sat) { const w = sat(); n.connect(w); n = w; }
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.peak, t + a); if (hold) g.gain.setValueAtTime(o.peak, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + o.dur);
  n.connect(g); let out = g;
  if (o.pan) { const p = ctx.createStereoPanner(); p.pan.value = cl(o.pan); g.connect(p); out = p; }
  out.connect(o.bus || sfxBus);
  if (o.wet) { const s = ctx.createGain(); s.gain.value = o.wet; out.connect(s); s.connect(revIn); }
  return t + a + hold + o.dur + 0.03;
}
/* 잡음 소리: kind white|pink|brown · ft 필터 종류 · ff→ff1 필터 이동 */
function nz(o) { const s = ctx.createBufferSource(); s.buffer = noiseBuf[o.kind || 'white']; s.loop = true; if (o.rate) s.playbackRate.value = o.rate; const end = voice(s, o); s.start(o.t, Math.random() * 1.5); s.stop(end); return s; }
/* 음 소리: f0→f1 (glide 초) · wave · lp(→lp1) 낮은 통과 */
function os(o) { const s = ctx.createOscillator(); s.type = o.wave || 'sine'; s.frequency.setValueAtTime(o.f0, o.t); if (o.f1 && o.f1 !== o.f0) s.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), o.t + (o.glide || o.dur)); if (o.det) s.detune.value = o.det;
  const end = voice(s, o.lp ? { ...o, ft: 'lowpass', ff: o.lp, ff1: o.lp1, q: o.q ?? 0.5 } : o); s.start(o.t); s.stop(end); return s; }
/* 금속(비조화 배음) · 마림바(나무) · 딸깍 */
function metal(t, f, dur, peak, pan = 0, wet = 0.15, bright = 1) { [[1, 1, 1], [2.76, 0.55, 0.7], [5.4, 0.3 * bright, 0.45], [8.93, 0.16 * bright, 0.3]].forEach(([r, a, d]) => os({ t, f0: f * r, dur: dur * d, peak: peak * a, pan, wet })); }
function mar(t, f, peak, dur = 0.45, pan = 0, wet = 0.12) { os({ t, f0: f, dur, peak, pan, wet }); os({ t, f0: f * 4, dur: dur * 0.25, peak: peak * 0.22, pan, wet }); os({ t, f0: f * 10.1, dur: 0.03, peak: peak * 0.08, pan }); }
function clk(t, f, peak, pan = 0) { nz({ t, dur: 0.012, ft: 'bandpass', ff: f, q: 1.4, peak, pan }); os({ t, f0: f * 0.45, f1: f * 0.35, dur: 0.035, peak: peak * 0.35, wave: 'triangle', lp: 3000, pan }); }
function thud(t, f, dur, peak, pan = 0) { os({ t, f0: f, f1: f * 0.45, dur, peak, pan }); nz({ t, kind: 'brown', dur: dur * 0.8, ft: 'lowpass', ff: f * 4, peak: peak * 0.6, pan }); }
function plip(t, f, peak, pan = 0, wet = 0.35) { os({ t, f0: f, f1: f * 1.9, glide: 0.035, dur: 0.06, peak, pan, wet }); }
const MIDI = m => 440 * Math.pow(2, (m - 69) / 12);

/* ───── 무기 4종: 발사 · 재장전 · 탄피 (판에서 지금 무기를 읽음 — 직접 넘겨도 됨) ───── */
const wkNow = () => R()?.w?.key || 'pistol';
const GUN = {
  /* 작살 권총: 압축공기 '퓩' + 스프링 · 가볍고 짧게 */
  pistol(t, p) { const k = rnd(0.95, 1.05); nz({ t, dur: 0.008, ft: 'bandpass', ff: 2600, q: 0.8, peak: 0.2, pan: p });
    nz({ t, kind: 'pink', dur: 0.075, ft: 'bandpass', ff: 1200 * k, ff1: 550, q: 0.9, peak: 0.55, pan: p, wet: 0.12 });
    os({ t, f0: 190 * k, f1: 62, dur: 0.07, peak: 0.6, pan: p }); os({ t: t + 0.01, f0: 430 * k, f1: 400 * k, dur: 0.12, peak: 0.05, wave: 'triangle', lp: 1800, pan: p }); },
  /* 연발 작살소총: 짧고 촘촘 · 한 발씩 높이가 살짝 달라 기관총처럼 안 들림 */
  rifle(t, p) { const k = rnd(0.93, 1.07); nz({ t, dur: 0.006, ft: 'bandpass', ff: 2400, q: 0.8, peak: 0.13, pan: p });
    nz({ t, kind: 'pink', dur: 0.045, ft: 'bandpass', ff: 1400 * k, ff1: 700, q: 1, peak: 0.42, pan: p, wet: 0.08 });
    os({ t, f0: 150 * k, f1: 70, dur: 0.05, peak: 0.5, pan: p }); clk(t + 0.03, 1600 * k, 0.05, p); },
  /* 산탄 작살포: 굵은 폭발 + 포화 + 방 울림 */
  shotgun(t, p) { const k = rnd(0.95, 1.04); nz({ t, dur: 0.012, ft: 'bandpass', ff: 2200, q: 0.7, peak: 0.3, pan: p });
    nz({ t, kind: 'pink', dur: 0.16, ft: 'lowpass', ff: 2200, ff1: 450, peak: 0.75, pan: p, sat: 1, wet: 0.25 });
    nz({ t, kind: 'brown', dur: 0.32, ft: 'lowpass', ff: 900, ff1: 180, peak: 0.8, pan: p });
    os({ t, f0: 95 * k, f1: 34, dur: 0.24, peak: 0.85, pan: p, sat: 1 }); },
  /* 대형 작살총: 묵직한 '퉁' + 줄이 풀리는 '쉬익' + 쇠 울림 */
  harpoon(t, p) { const k = rnd(0.96, 1.04); nz({ t, dur: 0.01, ft: 'highpass', ff: 2000, peak: 0.35, pan: p });
    os({ t, f0: 115 * k, f1: 38, dur: 0.26, peak: 0.95, pan: p, sat: 1 }); nz({ t, kind: 'pink', dur: 0.12, ft: 'bandpass', ff: 700, q: 1.6, peak: 0.6, pan: p, wet: 0.2 });
    nz({ t: t + 0.03, dur: 0.32, ft: 'bandpass', ff: 2600, ff1: 800, q: 4, peak: 0.12, pan: p * 1.5 }); metal(t, 520 * k, 0.35, 0.05, p, 0.25, 0.5); },
};
const RELOAD = {
  pistol(t, T) { clk(t + 0.04, 1800, 0.22); nz({ t: t + 0.06, dur: 0.05, ft: 'bandpass', ff: 900, q: 2, peak: 0.08 }); clk(t + T * 0.62, 1500, 0.25); clk(t + T * 0.78, 2400, 0.3); thud(t + T * 0.79, 220, 0.05, 0.15); },
  rifle(t, T) { clk(t + 0.05, 1600, 0.22); nz({ t: t + 0.08, dur: 0.09, ft: 'bandpass', ff: 700, q: 1.5, peak: 0.1 }); clk(t + T * 0.55, 1300, 0.28); thud(t + T * 0.56, 180, 0.06, 0.2);
    clk(t + T * 0.76, 2100, 0.22); nz({ t: t + T * 0.77, dur: 0.06, ft: 'bandpass', ff: 3000, q: 2, peak: 0.08 }); clk(t + T * 0.85, 2600, 0.3); },
  shotgun(t, T) { for (let i = 0; i < 3; i++) { const u = t + 0.12 + i * T * 0.2; clk(u, 1200, 0.16); thud(u + 0.01, 260, 0.05, 0.14); }
    nz({ t: t + T * 0.78, dur: 0.07, ft: 'bandpass', ff: 1100, ff1: 600, q: 1.5, peak: 0.22 }); clk(t + T * 0.8, 1000, 0.3); nz({ t: t + T * 0.86, dur: 0.06, ft: 'bandpass', ff: 900, ff1: 1600, q: 1.5, peak: 0.2 }); clk(t + T * 0.88, 1500, 0.34); thud(t + T * 0.88, 150, 0.08, 0.25); },
  harpoon(t, T) { for (let i = 0; i < 9; i++) clk(t + 0.1 + i * T * 0.075, 1700 + (i % 2) * 300, 0.1 + i * 0.012);
    nz({ t: t + 0.1, dur: T * 0.68, ft: 'bandpass', ff: 500, q: 3, peak: 0.05, a: 0.05 }); metal(t + T * 0.86, 260, 0.4, 0.09, 0, 0.2, 0.6); thud(t + T * 0.86, 120, 0.12, 0.35); },
};
function shell(t, wk) {
  if (wk === 'harpoon') return;
  if (wk === 'shotgun') { [0, 0.11, 0.18].forEach((d, i) => { thud(t + d, 520 - i * 40, 0.04, 0.06 - i * 0.015); os({ t: t + d, f0: 1150 + i * 30, dur: 0.05, peak: 0.025, wave: 'triangle', lp: 2400 }); }); return; }
  const f = wk === 'rifle' ? rnd(3600, 4200) : rnd(3000, 3500); [0, 0.085, 0.14, 0.175].forEach((d, i) => metal(t + d, f * (1 + i * 0.01), 0.07 - i * 0.012, 0.035 * (1 - i * 0.22), rnd(-0.2, 0.2), 0, 0.35));
}

/* 보스 3종 예고 (판 안 보스 패턴에서 sfx.warn 이 부르면 보스 종류 · 패턴으로 바꿔 냄) */
function bossWarn(kind, pat, d) {
  const t = now(); d = Math.max(0.35, Math.min(1.6, d || 0.7));
  if (kind === 'captain') {
    if (pat === 'hook') { for (let i = 0; i < 7; i++) metal(t + i * d / 8, rnd(850, 1050), 0.06, 0.05 + i * 0.008, 0, 0.1, 0.3); nz({ t, dur: d, ft: 'bandpass', ff: 600, ff1: 1800, q: 2, peak: 0.08, a: d * 0.6 }); }
    else if (pat === 'douse') { nz({ t, kind: 'pink', dur: 1.2, ft: 'bandpass', ff: 400, ff1: 1500, q: 1.2, peak: 0.3, a: 0.5, wet: 0.4 }); metal(t + 0.2, 1900, 0.5, 0.06, -0.3, 0.4); metal(t + 0.45, 2300, 0.5, 0.05, 0.3, 0.4); }
    else { nz({ t, kind: 'pink', dur: 0.1, ft: 'bandpass', ff: 300, ff1: 1400, q: 1.5, peak: 0.3, a: d * 0.9 }); os({ t, f0: 90, f1: 160, dur: 0.1, a: d * 0.9, peak: 0.25, wave: 'sawtooth', lp: 500 }); metal(t, 700, d, 0.06, 0, 0.3, 0.4); }
    return; }
  if (kind === 'eel') {
    if (pat === 'charge') { nz({ t, kind: 'brown', dur: 0.2, ft: 'lowpass', ff: 200, ff1: 900, peak: 0.5, a: d * 0.9 }); os({ t, f0: 60, f1: 110, dur: 0.2, a: d * 0.9, peak: 0.35 }); }
    else { const o = { t, f0: 180, f1: 760, glide: d, dur: 0.15, a: d * 0.95, peak: 0.07, wave: 'sawtooth', lp: 1300 }; os(o); os({ ...o, f0: 182, f1: 768, det: 9 }); for (let i = 0; i < 5; i++) nz({ t: t + d * (0.3 + i * 0.13), dur: 0.015, ft: 'bandpass', ff: 2200, q: 2, peak: 0.05 + i * 0.012 }); }
    return; }
  /* 수문지기: 쇠 문이 끌리는 낮은 경적 + 내려찍기면 차오르는 바람 */
  os({ t, f0: 98, dur: 0.12, a: d * 0.5, hold: d * 0.4, peak: 0.16, wave: 'sawtooth', lp: 700 }); os({ t, f0: 147, dur: 0.12, a: d * 0.5, hold: d * 0.4, peak: 0.1, wave: 'sawtooth', lp: 700, det: 6 });
  if (pat === 'slam') nz({ t, kind: 'pink', dur: 0.08, ft: 'bandpass', ff: 300, ff1: 2000, q: 1.2, peak: 0.28, a: d * 0.9 });
}
/* 몽이(반려 수달): 짧은 '끼익-끽' 울음 (기분: happy · ask · sad) */
function mong(mood = 'happy', t = now()) {
  const n = mood === 'sad' ? 1 : mood === 'ask' ? 2 : 3;
  for (let i = 0; i < n; i++) { const u = t + i * 0.11, b = mood === 'sad' ? 1050 : 1300 + i * 90 + rnd(-40, 40);
    const o = { t: u, f0: b, f1: mood === 'sad' ? b * 0.7 : mood === 'ask' && i === n - 1 ? b * 1.35 : b * 1.18, glide: 0.07, dur: 0.075, a: 0.012, peak: 0.07, wave: 'triangle', lp: 3200, wet: 0.08 };
    os(o); os({ ...o, f0: o.f0 * 2.01, f1: o.f1 * 2.01, peak: 0.018 }); nz({ t: u, dur: 0.05, ft: 'bandpass', ff: b * 1.5, q: 3, peak: 0.02 }); }
}

let lastShot = -1, lastStep = -1;
export const sfx = {
  /* 사격 — 무기 4종 각각 (wk 없으면 판의 지금 무기) */
  shot(pan = 0, wk) { if (!ctx) return; const t = now(); if (t - lastShot < 0.03) return; lastShot = t; (GUN[wk || wkNow()] || GUN.pistol)(t, pan); },
  shell(wk) { if (!ctx) return; shell(now() + rnd(0.18, 0.3), wk || wkNow()); },
  /* 재장전(무기마다 길이 맞춤) · 무기 바꾸기(장전 중이 아니면) */
  reload(wk, T) { if (!ctx) return; const r = R(), t = now(); wk = wk || wkNow();
    if (!T && r && !(r.pl?.reload > 0)) { nz({ t, kind: 'pink', dur: 0.14, ft: 'bandpass', ff: 700, ff1: 1400, q: 1, peak: 0.12 }); clk(t + 0.12, 1400, 0.2); clk(t + 0.2, 2100, 0.16); return; }
    (RELOAD[wk] || RELOAD.pistol)(t, T || r?.w?.reload || 1.2); },
  empty() { if (!ctx) return; const t = now(); clk(t, 2600, 0.18); clk(t + 0.05, 1900, 0.08); },
  /* 맞음 · 쇠 맞음 · 처치 — 판이 히트스톱을 길게 건 타격(치명 · 약점)이면 저음 펀치 + 반짝을 더함 */
  hit(pan = 0, strong) { if (!ctx) return; const t = now(); strong ??= (R()?.hitstop || 0) >= 0.065; const k = rnd(0.9, 1.1);
    os({ t, f0: 170 * k, f1: 80, dur: 0.06, peak: 0.45, pan }); nz({ t, kind: 'pink', dur: 0.05, ft: 'bandpass', ff: 1300 * k, q: 1.1, peak: 0.42, pan }); clk(t, 2400 * k, 0.1, pan);
    if (strong) { os({ t, f0: 80, f1: 38, dur: 0.16, peak: 0.6, pan, sat: 1 }); metal(t + 0.01, 1750, 0.18, 0.05, pan, 0.25, 0.4); } },
  hitMetal(pan = 0, strong) { if (!ctx) return; const t = now(); strong ??= (R()?.hitstop || 0) >= 0.065; const f = rnd(620, 820);
    nz({ t, dur: 0.02, ft: 'bandpass', ff: 3000, q: 1, peak: 0.3, pan }); metal(t, f, 0.22, 0.13, pan, 0.18, 0.6); thud(t, 200, 0.05, 0.2, pan);
    if (strong) { os({ t, f0: 90, f1: 40, dur: 0.15, peak: 0.5, pan, sat: 1 }); metal(t + 0.015, f * 1.5, 0.3, 0.05, pan, 0.3, 0.5); } },
  kill(pan = 0, big) { if (!ctx) return; const t = now(), r = R(); big ??= !!(r?.boss?.dead && r.bossKind && !r.boss.__sndK && (r.boss.__sndK = true));
    os({ t, f0: 130, f1: 42, dur: big ? 0.6 : 0.28, peak: 0.75, pan, sat: 1 }); nz({ t, kind: 'brown', dur: big ? 0.9 : 0.4, ft: 'lowpass', ff: 1000, ff1: 220, peak: 0.75, pan, wet: 0.2 });
    nz({ t, kind: 'pink', dur: 0.07, ft: 'bandpass', ff: 1800, q: 0.8, peak: 0.35, pan });
    for (let i = 0; i < (big ? 9 : 5); i++) { const u = t + 0.06 + i * rnd(0.03, 0.07); clk(u, rnd(1400, 2600), rnd(0.04, 0.09), pan + rnd(-0.2, 0.2)); }
    if (big) { duck(0.35, 1.6); [57, 64, 69, 72].forEach((m, i) => metal(t + 0.25 + i * 0.06, MIDI(m + 12), 1.4, 0.04, 0, 0.5, 0.4)); } },
  cover() { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.05, ft: 'bandpass', ff: 700, q: 2.5, peak: 0.28 }); os({ t, f0: 240, f1: 180, dur: 0.05, peak: 0.12, wave: 'triangle', lp: 900 }); },
  /* 내가 맞음: 몸에 둔탁하게 + 작은 '끽' */
  hurt() { if (!ctx) return; const t = now(); thud(t, 140, 0.18, 0.6); nz({ t, kind: 'pink', dur: 0.12, ft: 'lowpass', ff: 1600, ff1: 300, peak: 0.35, sat: 1 });
    os({ t: t + 0.02, f0: 1250, f1: 900, glide: 0.08, dur: 0.08, a: 0.01, peak: 0.05, wave: 'triangle', lp: 2600 }); },
  enemyShot(pan = 0) { if (!ctx) return; const t = now(); os({ t, f0: 1100, f1: 420, dur: 0.11, peak: 0.12, wave: 'square', lp: 2200, lp1: 700, pan }); nz({ t, kind: 'pink', dur: 0.06, ft: 'bandpass', ff: 1800, q: 1, peak: 0.16, pan }); },
  swing(pan = 0) { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.12, a: 0.08, ft: 'bandpass', ff: 400, ff1: 1500, fdur: 0.12, q: 1.2, peak: 0.3, pan }); },
  /* 구르기: 옷 · 물 휙 + 0.31초 뒤 착지 / 판에서 장어가 돌진 시작이면 물 밀려오는 소리 / 던지기면 휙만 */
  roll() { if (!ctx) return; const t = now(), r = R();
    if (r?.boss?.charging && r.boss.kind === 'eel') { nz({ t, kind: 'brown', dur: 0.9, ft: 'lowpass', ff: 300, ff1: 1400, fdur: 0.4, peak: 0.7, wet: 0.2 }); nz({ t, kind: 'pink', dur: 0.7, ft: 'bandpass', ff: 900, ff1: 2500, q: 0.8, peak: 0.22, a: 0.1 }); return; }
    nz({ t, kind: 'pink', dur: 0.2, a: 0.05, ft: 'bandpass', ff: 500, ff1: 1700, q: 0.9, peak: 0.28 });
    if (r && r.pl?.roll > 0) { const wet = r.water?.userData?.mask?.(r.pl.pos.x, r.pl.pos.z) > 0.15; const u = t + 0.31; thud(u, 110, 0.12, 0.35);
      if (wet) { nz({ t: u, dur: 0.16, ft: 'bandpass', ff: 1100, ff1: 600, q: 0.9, peak: 0.2 }); plip(u + 0.04, 700, 0.06); } else nz({ t: u, kind: 'pink', dur: 0.06, ft: 'highpass', ff: 1800, peak: 0.07 }); } },
  /* 발: 말랑한 발바닥 (매번 조금씩 다름 · 아주 작게) / 물 첨벙 */
  step() { if (!ctx) return; const t = now(); if (t - lastStep < 0.06) return; lastStep = t; const k = rnd(0.85, 1.15); thud(t, 105 * k, 0.05, 0.06); nz({ t, kind: 'pink', dur: 0.03, ft: 'highpass', ff: 2200 * k, peak: 0.012 }); },
  splash() { if (!ctx) return; const t = now(); if (t - lastStep < 0.06) return; lastStep = t; const k = rnd(0.85, 1.2);
    nz({ t, kind: 'pink', dur: 0.12, ft: 'bandpass', ff: 1100 * k, ff1: 650, q: 0.9, peak: 0.08 }); thud(t, 95, 0.05, 0.04); if (Math.random() < 0.6) plip(t + rnd(0.03, 0.07), rnd(600, 1000), 0.02, rnd(-0.3, 0.3), 0.2); },
  /* 뒤지기: 천 · 종이 · 나무 바스락 알갱이 */
  search() { if (!ctx) return; const t = now(); for (let i = 0; i < 6; i++) { const u = t + i * rnd(0.07, 0.12); nz({ t: u, kind: Math.random() < 0.5 ? 'pink' : 'white', dur: rnd(0.03, 0.07), ft: 'bandpass', ff: rnd(900, 2600), q: rnd(1, 2.5), peak: rnd(0.05, 0.11), pan: rnd(-0.2, 0.2) }); }
    if (Math.random() < 0.5) clk(t + rnd(0.1, 0.4), rnd(900, 1400), 0.06); },
  /* 가방 넣기: 천 '툭' + 물건 소리(값이 클수록 밝은 마림바 두 음) */
  pick(v = 0) { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.07, ft: 'lowpass', ff: 900, peak: 0.25 }); thud(t, 150, 0.05, 0.15);
    const b = MIDI(72 + Math.min(7, Math.round(v * 1.5))); mar(t + 0.04, b, 0.12); if (v >= 2) mar(t + 0.11, b * 1.5, 0.1); },
  /* 가방 안 물건 돌리기 */
  rotate() { if (!ctx) return; const t = now(); clk(t, 1700, 0.08); nz({ t, kind: 'pink', dur: 0.06, a: 0.03, ft: 'bandpass', ff: 900, ff1: 1600, q: 1.2, peak: 0.07 }); clk(t + 0.07, 2100, 0.07); },
  rare() { if (!ctx) return; const t = now(); [79, 83, 86, 91].forEach((m, i) => mar(t + i * 0.075, MIDI(m), 0.11, 0.6, 0, 0.3)); metal(t + 0.3, MIDI(98), 0.9, 0.025, 0.2, 0.5, 0.3); },
  /* 적이 나를 봄: 낮은 쇠 찌름 + 반음 부딪힘 (삐 소리 X) */
  alert(pan = 0) { if (!ctx) return; const t = now(); thud(t, 90, 0.1, 0.25, pan);
    [MIDI(62), MIDI(63)].forEach((f, i) => os({ t: t + i * 0.02, f0: f, dur: 0.22, a: 0.01, peak: 0.08, wave: 'sawtooth', lp: 1400, lp1: 500, pan })); metal(t, 1180, 0.2, 0.04, pan, 0.15, 0.5); },
  /* 마지막 10초 시계: 나무 똑딱 (마지막 3초는 높게) */
  tick() { if (!ctx) return; const t = now(), last = (R()?.time ?? 10) <= 3.2; nz({ t, dur: 0.02, ft: 'bandpass', ff: last ? 2600 : 2000, q: 8, peak: 0.3 }); os({ t, f0: last ? 1500 : 1150, dur: 0.04, peak: 0.07, wave: 'triangle', lp: 2500 }); },
  /* 물 차기 1분 전: 먼 경적(뱃고동) 두 번 + 물 밀려옴 */
  siren() { if (!ctx) return; const t = now(); duck(0.4, 2.5);
    for (const d of [0, 1.1]) { [110, 110.9, 165].forEach((f, i) => os({ t: t + d, f0: f, dur: 0.5, a: 0.12, hold: 0.55, peak: i === 2 ? 0.06 : 0.12, wave: 'sawtooth', lp: 900, wet: 0.5 })); }
    nz({ t, kind: 'brown', dur: 1.6, a: 0.8, ft: 'lowpass', ff: 600, peak: 0.25 }); },
  /* 탈출: 따뜻한 마림바 오름 + 화음 + 몽이 기뻐함 */
  extract() { if (!ctx) return; const t = now(); duck(0.3, 2.4); [62, 66, 69, 74, 78].forEach((m, i) => mar(t + i * 0.085, MIDI(m), 0.13, 0.9, 0, 0.3));
    [50, 57, 62, 66].forEach(m => os({ t: t + 0.3, f0: MIDI(m), dur: 1.4, a: 0.25, peak: 0.035, wave: 'triangle', lp: 1500, wet: 0.4 })); mong('happy', t + 0.75); },
  /* 쓰러짐: 물속으로 먹먹하게 + 공기 방울 + 내려가는 단조 */
  die() { if (!ctx) return; const t = now(); duck(0.25, 3);
    thud(t, 120, 0.5, 0.5); nz({ t, kind: 'pink', dur: 1.4, ft: 'lowpass', ff: 2400, ff1: 180, peak: 0.35, wet: 0.3 });
    for (let i = 0; i < 7; i++) plip(t + 0.3 + i * rnd(0.08, 0.16), rnd(500, 1100) * (1 - i * 0.05), 0.04, rnd(-0.4, 0.4), 0.4);
    [69, 65, 62, 57].forEach((m, i) => os({ t: t + 0.4 + i * 0.32, f0: MIDI(m), dur: 0.9, a: 0.01, peak: 0.07, wave: 'triangle', lp: 1200, wet: 0.45 })); },
  /* 은신처 버튼: 부드러운 나무 '톡' */
  ui() { if (!ctx) return; const t = now(); mar(t, MIDI(84) * rnd(0.99, 1.01), 0.07, 0.18, 0, 0.05); nz({ t, kind: 'pink', dur: 0.015, ft: 'bandpass', ff: 2500, q: 2, peak: 0.04 }); },
  tab() { if (!ctx) return; const t = now(); mar(t, MIDI(79), 0.06, 0.15, 0, 0.05); mar(t + 0.04, MIDI(86), 0.04, 0.12, 0, 0.05); },
  coin() { if (!ctx) return; const t = now(); metal(t, 1800, 0.25, 0.05, 0, 0.15, 0.3); metal(t + 0.07, 2300, 0.3, 0.045, 0, 0.15, 0.3); },
  equip() { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.09, ft: 'lowpass', ff: 1200, peak: 0.18 }); clk(t + 0.05, 1500, 0.16); mar(t + 0.08, MIDI(76), 0.06, 0.25); },
  /* 폭발 · 번개: 깊은 저음 + 갈라지는 소리 + 방 울림 */
  boom(pan = 0) { if (!ctx) return; const t = now(); duck(0.45, 1.4); nz({ t, dur: 0.02, ft: 'highpass', ff: 1500, peak: 0.5, pan });
    nz({ t, kind: 'brown', dur: 1.3, ft: 'lowpass', ff: 1400, ff1: 140, peak: 1.0, pan, wet: 0.35 }); os({ t, f0: 75, f1: 28, dur: 0.8, peak: 0.9, pan, sat: 1 }); nz({ t, kind: 'pink', dur: 0.25, ft: 'bandpass', ff: 1600, ff1: 500, q: 0.6, peak: 0.4, pan }); },
  puff() { if (!ctx) return; const t = now(); clk(t, 1200, 0.12); nz({ t, kind: 'pink', dur: 1.0, a: 0.06, ft: 'lowpass', ff: 3000, ff1: 400, peak: 0.28 }); },
  /* 발전기 · 등불: 크랭크 → 웅 → 딸깍 → 불빛 화음 */
  power() { if (!ctx) return; const t = now(); for (let i = 0; i < 4; i++) clk(t + i * 0.07, 900, 0.1);
    os({ t: t + 0.2, f0: 40, f1: 100, glide: 0.9, dur: 0.6, a: 0.3, hold: 0.3, peak: 0.12, wave: 'sawtooth', lp: 260, lp1: 600 }); clk(t + 0.95, 2200, 0.2);
    [69, 76].forEach((m, i) => mar(t + 1.0 + i * 0.1, MIDI(m), 0.08, 0.7, 0, 0.3)); },
  /* 쇠문 열림: 끌리는 쇠 + 덜컹 */
  gate() { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.5, a: 0.1, hold: 0.3, ft: 'bandpass', ff: 320, ff1: 520, q: 5, peak: 0.3, wet: 0.2 }); os({ t, f0: 62, f1: 70, dur: 0.6, a: 0.1, peak: 0.12, wave: 'sawtooth', lp: 300 });
    metal(t + 0.9, 240, 0.6, 0.08, 0, 0.35, 0.5); thud(t + 0.9, 90, 0.3, 0.45); },
  /* 보스 깨어남 — 종류마다: 수문지기(쇠 경적) · 선장(낮은 으르렁) · 장어(물속 쉭 + 전기) */
  roar(pan = 0, kind) { if (!ctx) return; const t = now(); kind ||= R()?.boss?.kind || 'boss'; duck(0.5, 2);
    if (kind === 'captain') { os({ t, f0: 95, f1: 62, dur: 1.2, a: 0.08, peak: 0.4, wave: 'sawtooth', lp: 900, sat: 1, pan }); os({ t, f0: 96.5, f1: 63, dur: 1.2, a: 0.08, peak: 0.3, wave: 'sawtooth', lp: 900, pan });
      nz({ t, kind: 'pink', dur: 1.1, a: 0.1, ft: 'bandpass', ff: 650, q: 3, peak: 0.25, pan, wet: 0.3 }); metal(t + 0.1, 520, 1.0, 0.05, pan, 0.4, 0.5); return; }
    if (kind === 'eel') { nz({ t, kind: 'pink', dur: 1.1, a: 0.15, ft: 'bandpass', ff: 3000, ff1: 700, q: 3, peak: 0.25, pan, wet: 0.4 }); nz({ t, kind: 'brown', dur: 1.3, ft: 'lowpass', ff: 400, peak: 0.7, pan });
      for (let i = 0; i < 6; i++) nz({ t: t + 0.2 + i * rnd(0.05, 0.12), dur: 0.02, ft: 'highpass', ff: 3000, peak: 0.12, pan }); return; }
    [55, 82.5, 110.6].forEach((f, i) => os({ t, f0: f, f1: f * 0.85, dur: 1.3, a: 0.2, peak: [0.35, 0.18, 0.12][i], wave: 'sawtooth', lp: 700, sat: 1, pan, wet: 0.35 }));
    nz({ t, kind: 'brown', dur: 1.3, ft: 'lowpass', ff: 320, peak: 0.6, pan }); metal(t + 0.15, 180, 1.2, 0.08, pan, 0.4, 0.6); },
  slam(pan = 0) { if (!ctx) return; const t = now(); duck(0.4, 0.9); os({ t, f0: 62, f1: 26, dur: 0.55, peak: 1.0, pan, sat: 1 }); nz({ t, kind: 'brown', dur: 0.6, ft: 'lowpass', ff: 600, ff1: 150, peak: 0.85, pan, wet: 0.3 });
    nz({ t: t + 0.02, kind: 'pink', dur: 0.3, ft: 'bandpass', ff: 1000, ff1: 500, q: 0.8, peak: 0.25, pan }); for (let i = 0; i < 5; i++) clk(t + 0.08 + i * rnd(0.04, 0.09), rnd(900, 1800), 0.05, pan); },
  /* 사건 알림(낮은 두 음 '봉-봉') — 보스가 패턴을 예고하는 중이면 보스 예고음으로 */
  warn() { if (!ctx) return; const b = R()?.boss; if (b && !b.dead && b.wind > 0 && b.wind === b.windMax) return bossWarn(b.kind, b.pat, b.windMax);
    const t = now(); [0, 0.2].forEach((d, i) => { os({ t: t + d, f0: MIDI(i ? 64 : 69), dur: 0.35, a: 0.01, peak: 0.12, wave: 'triangle', lp: 1400 }); os({ t: t + d, f0: MIDI(i ? 52 : 57), dur: 0.35, a: 0.01, peak: 0.08, wave: 'sine' }); }); },
  bossWarn(kind = 'boss', pat, d) { if (!ctx) return; bossWarn(kind, pat, d); },
  /* 공사 · 만들기: 망치 · 톱니 + 끝 화음 */
  build() { if (!ctx) return; const t = now(); for (let i = 0; i < 3; i++) { const u = t + i * 0.13; thud(u, 180, 0.06, 0.2); metal(u, rnd(800, 950), 0.12, 0.05, 0, 0.1, 0.5); }
    [72, 76, 79].forEach((m, i) => mar(t + 0.45 + i * 0.07, MIDI(m), 0.09, 0.6, 0, 0.25)); },

  /* ── 이야기 세션용 (docs/AUDIO.md 목록) ── */
  talk() { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.05, a: 0.02, ft: 'bandpass', ff: 1800, ff1: 3000, q: 1, peak: 0.05 }); mar(t + 0.02, MIDI(81) * rnd(0.995, 1.005), 0.035, 0.12, 0, 0.05); },
  cut() { if (!ctx) return; const t = now(); duck(0.5, 1.2); nz({ t, kind: 'pink', dur: 0.6, a: 0.25, ft: 'bandpass', ff: 300, ff1: 1400, q: 0.7, peak: 0.12, wet: 0.4 }); os({ t, f0: MIDI(38), dur: 1.2, a: 0.4, peak: 0.1, wet: 0.3 }); },
  memory() { if (!ctx) return; const t = now(); duck(0.5, 2.2); [74, 78, 81, 86].forEach((m, i) => { mar(t + i * 0.16, MIDI(m), 0.07, 1.0, (i - 1.5) * 0.2, 0.5); metal(t + i * 0.16, MIDI(m + 24), 0.6, 0.012, 0, 0.5, 0.3); });
    [62, 69].forEach(m => os({ t: t + 0.3, f0: MIDI(m), dur: 1.8, a: 0.4, peak: 0.03, wave: 'triangle', lp: 1200, wet: 0.5 })); },
  windowLight() { if (!ctx) return; const t = now(); nz({ t, dur: 0.05, ft: 'bandpass', ff: 3500, q: 1.5, peak: 0.12 }); nz({ t: t + 0.04, kind: 'pink', dur: 0.4, a: 0.1, ft: 'lowpass', ff: 1400, ff1: 700, peak: 0.1 });
    [66, 69, 74].forEach((m, i) => mar(t + 0.3 + i * 0.09, MIDI(m), 0.07, 1.2, 0, 0.45)); os({ t: t + 0.3, f0: MIDI(50), dur: 1.6, a: 0.3, peak: 0.05, wet: 0.3 }); },
  bond() { if (!ctx) return; const t = now(); [[69, 74], [74, 78]].forEach(([a, b], i) => { mar(t + i * 0.18, MIDI(a), 0.07, 0.8, 0, 0.3); mar(t + i * 0.18 + 0.02, MIDI(b), 0.06, 0.8, 0, 0.3); }); metal(t + 0.4, MIDI(93), 0.8, 0.02, 0, 0.5, 0.3); },
  radio(dur = 0.6) { if (!ctx) return; const t = now(); os({ t, f0: 1250, dur: 0.06, peak: 0.04, wave: 'square', lp: 2500 });
    nz({ t: t + 0.05, dur, a: 0.02, ft: 'bandpass', ff: 1900, q: 0.8, peak: 0.07 }); for (let i = 0; i < 5; i++) nz({ t: t + 0.05 + Math.random() * dur, dur: 0.025, ft: 'bandpass', ff: rnd(1200, 3000), q: 3, peak: 0.08 });
    os({ t: t + dur + 0.05, f0: 950, dur: 0.05, peak: 0.035, wave: 'square', lp: 2000 }); },
  mong(mood) { if (!ctx) return; mong(mood); },
  /* 이야기 세션이 쓰는 이름 (story_ui · story_raid 의 snd('…')) */
  page() { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.16, a: 0.06, ft: 'bandpass', ff: 1400, ff1: 2600, q: 0.9, peak: 0.07 }); nz({ t: t + 0.12, kind: 'pink', dur: 0.05, ft: 'lowpass', ff: 1200, peak: 0.05 }); },
  chapter() { if (!ctx) return; const t = now(); duck(0.35, 3); nz({ t, kind: 'pink', dur: 1.0, a: 0.5, ft: 'bandpass', ff: 250, ff1: 900, q: 0.7, peak: 0.08, wet: 0.5 });
    [[50, 0], [57, 0.05], [62, 0.1], [66, 0.15], [69, 0.6]].forEach(([m, d]) => os({ t: t + 0.5 + d, f0: MIDI(m), dur: 2.2, a: 0.01, peak: m > 65 ? 0.06 : 0.05, wave: 'triangle', lp: 1500, lp1: 600, wet: 0.5 })); },
  lamp() { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.35, a: 0.08, ft: 'lowpass', ff: 600, ff1: 1500, peak: 0.12 }); mar(t + 0.12, MIDI(74), 0.07, 0.7, 0, 0.35); mar(t + 0.2, MIDI(81), 0.05, 0.8, 0, 0.35); },
  quest() { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.08, ft: 'bandpass', ff: 1600, q: 1, peak: 0.06 }); mar(t + 0.05, MIDI(76), 0.08, 0.4); mar(t + 0.14, MIDI(83), 0.07, 0.6, 0, 0.25); },
  tape() { if (!ctx) return; const t = now(); clk(t, 1300, 0.18); clk(t + 0.05, 900, 0.12); nz({ t: t + 0.12, dur: 1.2, a: 0.15, ft: 'bandpass', ff: 3000, q: 0.6, peak: 0.025 });
    os({ t: t + 0.12, f0: 52, dur: 1.0, a: 0.15, peak: 0.04, wave: 'sawtooth', lp: 200 }); },
};
sfx.window = sfx.windowLight; sfx.memo = sfx.memory;
/* 바닥에 깔리는 물소리 (판 중에만 · 배경음을 꺼도 남음) */
export function ambience(on) {
  if (!ctx) return;
  if (on && !amb) { const s = ctx.createBufferSource(); s.buffer = noiseBuf.brown; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 480; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 1.5);
    s.connect(f); f.connect(g); g.connect(sfxBus); s.start(); amb = { s, g }; }
  if (!on && amb) { const a = amb; amb = null; a.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2); setTimeout(() => { try { a.s.stop(); } catch { /* */ } }, 1200); }
}
/* 큰 소리 동안 배경음 잠깐 낮춤 */
function duck(to, dur) { if (!musBus || !SET.music) return; const g = musBus.gain, t = ctx.currentTime + T0; g.cancelScheduledValues(t); g.setTargetAtTime(MUS * to, t, 0.03); g.setTargetAtTime(MUS, t + dur * 0.4, dur * 0.3); }

/* ───── 배경음 (적응형) ─────
   장면: 은신처(처음 · 하루 끝) · 침수 창고 · 밤의 항구 · 해저 터널 · 보스전(지도 색)
   긴장 단계: 0 평소 → 1 적 발견(쫓는 적이 있음 · 4초 여운) → 2 탈출 카운트다운(물 차기 1분 전) */
let seenRaid = false, chaseT = 0;
function loadMusic() { if (musLoad || !ctx || !SET.music) return musLoad; musLoad = import('../assets/audio/music.js?v=0.99.7').then(m => { mus = m.createMusic({ ctx, out: musBus, rev: revIn, noise: noiseBuf }); return mus; }).catch(e => { console.warn('배경음', e); musLoad = null; }); return musLoad; }
function scene() {
  const r = R();
  if (!r || !r.alive) return { id: seenRaid ? 'dusk' : 'hideout', lv: 0 };
  seenRaid = true;
  if (r.over) return { id: null, lv: 0 };
  const b = r.boss, color = r.map || 'ware';
  const t = performance.now() / 1000;
  if (r.enemies?.some(e => !e.dead && e.state === 'chase')) chaseT = t;
  const lv = (r.time ?? 999) <= 60 ? 2 : t - chaseT < 4 ? 1 : 0;
  /* 보스: 쫓기 시작했거나 · 맞았거나 · 14m 안이면 보스전 (쓰러질 때까지 유지) */
  if (b && !b.dead && !b.__mus && (b.state === 'chase' || b.hp < b.maxHp || (r.pl && b.pos.distanceTo(r.pl.pos) < 14))) b.__mus = true;
  if (b && !b.dead && b.__mus) return { id: 'boss', color, lv };
  return { id: color, lv };
}
function musicTick() {
  if (!ctx || ctx.state !== 'running') return;
  if (!SET.music || SET.muted) { if (mus) mus.set(null); return; }
  if (!mus) { loadMusic(); return; }
  const s = scene(); mus.set(s.id, s.lv, s.color); mus.pump(ctx.currentTime + 0.7);
}
/* 시험 · 렌더 도구용 (docs/audio_preview/render.mjs) */
export const __audio = { get ctx() { return ctx; }, set at(s) { T0 = s; }, music: () => loadMusic() || Promise.resolve(mus), scene, set: SET };
