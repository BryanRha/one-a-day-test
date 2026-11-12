// 소리 — Web Audio 합성 + CC0 녹음 층 하나(assets/audio/foley.m4a · Kenney RPG Audio · 첫 탭 뒤 늦게 받음 · 없으면 합성만)
//  효과음 = 이 파일 · 배경음 5곡(적응형) = assets/audio/music.js · 지도 환경음 = assets/audio/env.js (둘 다 첫 탭 · 판 시작 뒤 늦게 받음 — 첫 진입 용량 X)
//  이름 목록 · 렌더 측정표 = docs/AUDIO.md · 미리듣기 = docs/audio_preview/ (v2 = *_v2.m4a)
//  v2 (11-05): 마스터 = 가상 저음 + 중역 보강 → 묶음 압축 → 리미터 → 천장(−3dBFS) / 방 울림 4종(코드로 만든 IR · 지도 따라 바뀜)
//              효과음마다 무작위 변주(높이 · 필터 · 세기 · 2ms 어긋남) · 발사음 = 몸통 + 터짐 + 중역 + 꼬리(방) + 기계음
let ctx = null, master = null, sfxBus = null, musBus = null, ambBus = null, revIn = null, rvBus = null, vocBus = null, CUR_BUS = null; /* M6-C 소리 크기 나누기: 배경음 · 효과음(+환경음) · 무전 목소리(vocBus) */
let mus = null, musLoad = null, env = null, envLoad = null, ambOn = false, drive = 0, T0 = 0;
const noiseBuf = {};
/* 설정: 음량 · 배경음 · 음소거 (기기에 기억) */
const SET = { vol: 1, music: true, muted: false, bus: { mus: 1, sfx: 1, voc: 1 } };
try { Object.assign(SET, JSON.parse(localStorage.getItem('salvage_audio') || '{}')); } catch { /* */ }
SET.bus = { mus: 1, sfx: 1, voc: 1, ...(SET.bus || {}) };
const saveSet = () => { try { localStorage.setItem('salvage_audio', JSON.stringify(SET)); } catch { /* */ } };
/* 버스 음량 (docs/AUDIO.md 5장 측정으로 맞춤: 배경음 평균 −20dBFS 안팎 · 효과음 최고 −3dBFS 이내 · 환경음은 배경음보다 10dB 아래) */
const MASTER = 1, MUS = 1.25, SFXV = 4.5, AMBV = 1;
const applySet = () => { if (!ctx) return; const t = ctx.currentTime, B = SET.bus; master.gain.setTargetAtTime(SET.muted ? 0 : SET.vol * MASTER, t, 0.03); musBus.gain.setTargetAtTime(SET.music ? MUS * B.mus : 0, t, 0.3);
  sfxBus.gain.setTargetAtTime(SFXV * B.sfx, t, 0.03); ambBus.gain.setTargetAtTime(AMBV * B.sfx, t, 0.1); vocBus.gain.setTargetAtTime(SFXV * B.voc, t, 0.03); };
const isOffline = c => typeof OfflineAudioContext !== 'undefined' && c instanceof OfflineAudioContext;
const bq = (type, f, q = 0.7, g = 0) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; x.gain.value = g; return x; };
const gn = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
const shaper = fn => { const w = ctx.createWaveShaper(), n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = fn(i / (n - 1) * 2 - 1); w.curve = c; w.oversample = '2x'; return w; };

export function unlock() {
  if (ctx) { if (ctx.state === 'suspended' && !isOffline(ctx)) ctx.resume().catch(() => {}); return; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  const sr = ctx.sampleRate;
  /* ── 마스터 ──
     폰 스피커는 200Hz 아래가 거의 안 남 → ① 45Hz 아래 버림(헤드룸) ② 150Hz 아래를 온파 정류해 2배음(160~300Hz)으로 옮긴 '가상 저음'을 조금 섞음
     ③ 중역 1.1kHz +2dB · 2.6kHz +1dB (작은 스피커에서 말소리 · 타격이 또렷) ④ 7.5kHz 위 −3.5dB (날카로움 피로 X)
     → 묶음 압축(−20dB · 2.5:1 · 느린 풀림: 소리 덩어리를 붙여 평균을 올림) → 리미터(−4dB · 20:1 · 2ms) → 천장(부드러운 자름 · 최대 0.707 = −3dBFS) */
  master = ctx.createGain();
  const hp = bq('highpass', 45, 0.7), mid = bq('peaking', 1100, 0.8, 2), pres = bq('peaking', 2600, 1, 1), tame = bq('highshelf', 7500, 0.7, -3.5);
  const vb = bq('lowpass', 150, 0.7), vbs = shaper(x => Math.sqrt(x * x + 1e-6) - 1e-3), vbb = bq('bandpass', 300, 0.9), vbg = gn(0.5); /* 온파 정류 = 기본음 없이 2배음만 (작은 소리에서도 같은 비율) */
  const glue = ctx.createDynamicsCompressor(); glue.threshold.value = -20; glue.knee.value = 12; glue.ratio.value = 2.5; glue.attack.value = 0.015; glue.release.value = 0.3;
  const trim = gn(0.62);
  const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.12;
  const pre = gn(0.42); /* 리미터 자동 보정(+) 되돌림 + 천장 곡선 입력 범위(±2 → ±1) */
  const ceil = shaper(u => { const x = u * 2, a = Math.abs(x); return Math.sign(x) * (a < 0.5 ? a : 0.5 + 0.207 * Math.tanh((a - 0.5) / 0.207)); });
  master.connect(hp); hp.connect(mid); mid.connect(pres); pres.connect(tame); tame.connect(glue);
  master.connect(vb); vb.connect(vbs); vbs.connect(vbb); vbb.connect(vbg); vbg.connect(glue);
  glue.connect(trim); trim.connect(lim); lim.connect(pre); pre.connect(ceil); ceil.connect(ctx.destination);
  sfxBus = gn(SFXV); sfxBus.connect(master); vocBus = gn(SFXV); vocBus.connect(master);
  musBus = ctx.createGain(); musBus.connect(master);
  ambBus = gn(AMBV); ambBus.connect(master);
  /* 울림: 보내기 버스 하나 → 지금 방(지도)의 컨볼버. 방이 바뀌면 1초 겹쳐 바꿈 */
  revIn = ctx.createGain(); rvBus = gn(1); rvBus.connect(master);
  for (const k of ['white', 'pink', 'brown']) { const b = ctx.createBuffer(1, sr * 2, sr); const d = b.getChannelData(0); let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1;
      if (k === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else if (k === 'pink') { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
      else d[i] = w; } noiseBuf[k] = b; }
  room('hideout', 0, true);
  applySet();
  if (isOffline(ctx)) return;
  /* 배경음: 첫 탭 1초 뒤 받아서 (첫 진입 용량에 안 들어감) · 0.25초마다 장면 · 긴장 단계 · 방 · 환경음 맞춤 */
  setTimeout(loadMusic, 1000); setTimeout(loadFoley, 1500); drive = setInterval(tick, 250);
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
/* M6-C 접근성: 소리 크기 셋 (0~1 · 기기에 기억 · 바로 반영) — mus 배경음 · sfx 효과음(+지도 환경음) · voc 무전 · 말소리 · 몽이 */
export const busVol = k => SET.bus[k] ?? 1;
export function setBusVol(k, v) { if (!(k in SET.bus)) return; SET.bus[k] = Math.max(0, Math.min(1, +v || 0)); saveSet(); applySet(); }
/* 은신처 아래 버튼 하나로 돌려 가며: 켬 → 작게 → 배경음 끔 → 끔 */
const STEPS = [{ vol: 1, music: true, muted: false, t: '소리 · 켬' }, { vol: 0.5, music: true, muted: false, t: '소리 · 작게' }, { vol: 1, music: false, muted: false, t: '배경음 끔' }, { vol: 1, music: true, muted: true, t: '소리 끔' }];
const stepNow = () => Math.max(0, STEPS.findIndex(s => s.muted === SET.muted && (s.muted || (s.music === SET.music && (!s.music || s.vol === SET.vol)))));
export const soundLabel = () => STEPS[stepNow()].t;
export function cycleSound() { const s = STEPS[(stepNow() + 1) % STEPS.length]; Object.assign(SET, { vol: s.vol, music: s.music, muted: s.muted }); saveSet(); unlock(); applySet(); if (!SET.muted) sfx.ui(); }

/* ───── 방 울림 (코드로 만든 충격 응답 IR) ─────
   rt = 60dB 줄어드는 시간 · damp = 꼬리가 어두워지는 빠르기 · er = 이른 반사(ms) · ring = 벽 쇠 울림(모드 Hz · 세기) · flutter = 관 속 떨림 메아리 간격(ms) */
const ROOMS = {
  /* 은신처: 나무 초소 — 작고 따뜻 */
  hideout: { len: 0.9, rt: 0.55, damp: 2.6, er: [11, 17, 23, 31, 43], erA: 0.5, send: 0.42 },
  /* 침수 창고: 콘크리트 · 철벽 — 이른 반사 촘촘 + 쇠 울림 */
  ware: { len: 1.9, rt: 1.35, damp: 1.8, er: [7, 12, 15, 21, 26, 33, 38, 47, 55, 64], erA: 0.6, ring: [[176, 0.5], [389, 0.35], [702, 0.25], [1187, 0.12]], send: 0.55 },
  /* 밤의 항구: 열린 곳 — 잔향 짧고 엷음 · 먼 건물 · 컨테이너에서 늦게 돌아오는 메아리 몇 개 */
  harbor: { len: 1.4, rt: 0.5, damp: 3.5, er: [64, 131, 237, 380], erA: 0.45, erW: 28, diffuse: 0.35, send: 0.45 },
  /* 해저 터널: 긴 관 — 일정 간격 떨림 메아리 + 어두운 긴 꼬리 */
  tunnel: { len: 3.0, rt: 2.4, damp: 1.3, flutter: 19, er: [9, 19, 28], erA: 0.4, ring: [[92, 0.6], [151, 0.4]], send: 0.62 },
  /* 가라앉은 공장(M3-B): 높은 쇠 지붕 큰 홀 — 늦은 반사 · 쇠 울림 · 꼬리 김 */
  factory: { len: 2.6, rt: 1.9, damp: 1.5, er: [14, 23, 37, 52, 71, 95], erA: 0.5, ring: [[118, 0.45], [263, 0.35], [541, 0.2]], send: 0.55 },
  /* 심해 연구소(M4-B): 넓은 유리 · 타일 홀 — 늦고 넓은 반사 · 차가운 높은 울림 · 꼬리 가장 김 */
  lab: { len: 3.4, rt: 2.8, damp: 1.7, er: [17, 29, 46, 68, 97, 131], erA: 0.42, ring: [[523, 0.22], [1046, 0.14], [1568, 0.08]], send: 0.62 },
};
const IRS = {}; let roomNow = null, roomG = null;
function smear(d, at, a, w) { for (let k = 0; k < w; k++) { const i = at + k; if (i >= 0 && i < d.length) d[i] += a * Math.exp(-k / (w * 0.35)) * (1 - 0.5 * Math.random()); } }
function makeIR(k) {
  if (IRS[k]) return IRS[k];
  const R = ROOMS[k], sr = ctx.sampleRate, n = Math.round(sr * R.len), b = ctx.createBuffer(2, n, sr), dec = 6.91 / R.rt;
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let lp = 0;
    for (let i = 0; i < n; i++) { const x = i / sr, kf = 0.04 + 0.85 * Math.exp(-x * R.damp * 3); lp += (Math.random() * 2 - 1 - lp) * kf; d[i] = lp * Math.exp(-x * dec) * Math.min(1, x / 0.012) * (R.diffuse ?? 1); }
    R.er.forEach((ms, j) => smear(d, Math.round((ms + (ch ? 1.3 : -0.7) * (j % 3)) * sr / 1000), R.erA * Math.pow(0.82, j) * (j % 2 ? -1 : 1), R.erW || 6));
    if (R.flutter) for (let ms = R.flutter, j = 0; ms < R.len * 1000; ms += R.flutter * (0.97 + Math.random() * 0.06), j++) smear(d, Math.round((ms + ch * 0.6) * sr / 1000), 0.35 * Math.exp(-ms / 1000 * dec * 1.1) * (j % 2 ? -1 : 1), (10 + j * 0.5) | 0);
    if (R.ring) for (const [f, a] of R.ring) { const ph = Math.random() * 6.28, w = 6.2832 * f * (1 + (ch ? 0.003 : -0.003)) / sr; for (let i = 0; i < n; i++) d[i] += 0.08 * a * Math.sin(w * i + ph) * Math.exp(-i / sr * dec * 0.9) * Math.min(1, i / sr / 0.02); } }
  return (IRS[k] = b);
}
/* 방 바꾸기 (같은 방이면 그대로) — 새 컨볼버를 1초 겹쳐 들이고 옛것은 4초 뒤 뗌 */
function room(k, at = ctx.currentTime, instant) {
  if (!ROOMS[k] || k === roomNow) return; roomNow = k;
  const cv = ctx.createConvolver(); cv.buffer = makeIR(k); const g = gn(instant ? ROOMS[k].send : 0.0001); revIn.connect(cv); cv.connect(g); g.connect(rvBus);
  if (!instant) g.gain.setTargetAtTime(ROOMS[k].send, at, 0.35);
  const old = roomG; roomG = { cv, g };
  if (old) { old.g.gain.setTargetAtTime(0.0001, at, 0.35); if (!isOffline(ctx)) setTimeout(() => { try { revIn.disconnect(old.cv); old.g.disconnect(); } catch { /* */ } }, 4000); }
}

/* ───── 합성 도구 ───── */
const now = () => ctx.currentTime + T0;
const rnd = (a, b) => a + Math.random() * (b - a);
const cl = v => Math.max(-1, Math.min(1, v));
const R = () => (typeof window !== 'undefined' && window.__salvage && window.__salvage.raid) || null;
/* 무작위 변주 — 효과음 한 번 부를 때마다 새로 굴림: p 높이 · f 필터 · a 층마다 세기 · j 층마다 어긋남(초) (음악 같은 소리는 높이 고정) */
const NOVAR = { p: 1, f: 1, a: 0, j: 0, g: 1 };
let EV = NOVAR;
let satCurve = null;
function sat() { if (!satCurve) { satCurve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; satCurve[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); } } const w = ctx.createWaveShaper(); w.curve = satCurve; return w; }
/* 목소리 하나: 소스 → (필터) → (포화) → 엔벨로프 → (팬) → 버스 (+ 울림 보내기) · o.t 는 이미 어긋남을 더한 시각 */
function voice(src, o) {
  let n = src; const t = o.t, a = o.a ?? 0.002, hold = o.hold || 0, pk = o.peak * EV.g * (1 + EV.a * (Math.random() * 2 - 1));
  if (o.ft) { const f = ctx.createBiquadFilter(); f.type = o.ft; f.frequency.setValueAtTime(o.ff, t); if (o.ff1) f.frequency.exponentialRampToValueAtTime(o.ff1, t + (o.fdur || a + hold + o.dur)); f.Q.value = o.q ?? 0.7; n.connect(f); n = f; }
  if (o.sat) { const w = sat(); n.connect(w); n = w; }
  const g = ctx.createGain(); g.gain.value = 0.0001; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(pk, t + a); if (hold) g.gain.setValueAtTime(pk, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + o.dur);
  n.connect(g); let out = g;
  if (o.pan) { const p = ctx.createStereoPanner(); p.pan.value = cl(o.pan); g.connect(p); out = p; }
  out.connect(o.bus || CUR_BUS || sfxBus);
  if (o.wet) { const s = ctx.createGain(); s.gain.value = o.wet; out.connect(s); s.connect(revIn); }
  return t + a + hold + o.dur + 0.03;
}
const jit = o => o.t + (o.j ?? EV.j) * Math.random();
/* 잡음 소리: kind white|pink|brown · ft 필터 종류 · ff→ff1 필터 이동 (EV.f 로 필터 변주) */
function nz(o) { const s = ctx.createBufferSource(); s.buffer = noiseBuf[o.kind || 'white']; s.loop = true; if (o.rate) s.playbackRate.value = o.rate; const t = jit(o), k = o.fix ? 1 : EV.f;
  const end = voice(s, { ...o, t, ff: o.ff && o.ff * k, ff1: o.ff1 && o.ff1 * k }); s.start(t, Math.random() * 1.5); s.stop(end); return s; }
/* 음 소리: f0→f1 (glide 초) · wave · lp(→lp1) 낮은 통과 (EV.p 로 높이 변주) */
function os(o) { const s = ctx.createOscillator(), t = jit(o), k = o.fix ? 1 : EV.p; s.type = o.wave || 'sine'; s.frequency.setValueAtTime(o.f0 * k, t); if (o.f1 && o.f1 !== o.f0) s.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1 * k), t + (o.glide || o.dur)); if (o.det) s.detune.value = o.det;
  const end = voice(s, o.lp ? { ...o, t, ft: 'lowpass', ff: o.lp * (o.fix ? 1 : EV.f), ff1: o.lp1 && o.lp1 * (o.fix ? 1 : EV.f), q: o.q ?? 0.5 } : { ...o, t }); s.start(t); s.stop(end); return s; }
/* 금속(모달 합성): 자유 막대 비조화 배음(1 · 2.76 · 5.4 · 8.93)을 매번 ±1.2% 흔들고 · 모드마다 감쇠 다르게 · 기본음은 맥놀이 둘 · 때림 잡음 */
function metal(t, f, dur, peak, pan = 0, wet = 0.15, bright = 1) {
  [[1, 1, 1], [2.76, 0.55, 0.7], [5.4, 0.3 * bright, 0.45], [8.93, 0.16 * bright, 0.3]].forEach(([r, a, d], i) => { const fr = f * r * rnd(0.988, 1.012);
    os({ t, f0: fr, dur: dur * d * rnd(0.85, 1.15), peak: peak * a * rnd(0.8, 1.1), pan, wet, j: 0 });
    if (i === 0 && dur > 0.15) os({ t, f0: fr * 1.0045, dur: dur * 0.85, peak: peak * 0.35, pan, wet, j: 0 }); });
  nz({ t, dur: 0.006, ft: 'bandpass', ff: Math.min(9000, f * 2.2), q: 2, peak: peak * 0.8, pan, j: 0 });
}
/* 나무(마림바형) · 딸깍 · 둔탁 · 물방울(미너트 공기 방울: 높이가 위로 휨) */
function mar(t, f, peak, dur = 0.45, pan = 0, wet = 0.12) { os({ t, f0: f, dur, peak, pan, wet, j: 0 }); os({ t, f0: f * 4, dur: dur * 0.25, peak: peak * 0.22, pan, wet, j: 0 }); os({ t, f0: f * 10.1, dur: 0.03, peak: peak * 0.08, pan, j: 0 }); }
function clk(t, f, peak, pan = 0) { nz({ t, dur: 0.012, ft: 'bandpass', ff: f, q: 1.4, peak, pan }); os({ t, f0: f * 0.45, f1: f * 0.35, dur: 0.035, peak: peak * 0.35, wave: 'triangle', lp: 3000, pan }); }
function thud(t, f, dur, peak, pan = 0) { os({ t, f0: f, f1: f * 0.45, dur, peak, pan }); nz({ t, kind: 'brown', dur: dur * 0.8, ft: 'lowpass', ff: f * 4, peak: peak * 0.6, pan }); }
function plip(t, f, peak, pan = 0, wet = 0.35) { nz({ t, kind: 'pink', dur: 0.003, ft: 'highpass', ff: 1500, peak: peak * 0.15, pan, j: 0 }); os({ t: t + 0.002, f0: f, f1: f * rnd(1.6, 2.2), glide: rnd(0.03, 0.05), dur: rnd(0.05, 0.08), peak, pan, wet }); }
const MIDI = m => 440 * Math.pow(2, (m - 69) / 12);
/* ───── CC0 녹음 층 (검수 M4 Top 10 · Kenney 'RPG Audio' CC0 — 출처 CREDITS.md) ─────
   천 스침 · 가방(가죽) · 발소리 · 쇠 걸쇠를 한 파일(assets/audio/foley.m4a 35KB · 모노 22kHz)에 이어 붙임 → 첫 탭 1.5초 뒤 받음.
   합성 소리 위에 작게 얹는 '질감 층' — 못 받았거나 아직이면 합성만 (소리는 그대로 남) */
const FOLEY = { cloth: [[0.1, 0.32], [0.54, 0.32], [0.98, 0.32], [1.42, 0.32]], bag: [[1.86, 0.2665], [2.2465, 0.186], [2.5526, 0.4]],
  step: [[3.0726, 0.22], [3.4126, 0.22], [3.7526, 0.22], [4.0926, 0.22], [4.4326, 0.22], [4.7726, 0.22]], latch: [[5.1126, 0.2492], [5.4818, 0.3]] };
let foleyBuf = null, foleyLoad = null;
function loadFoley() { if (foleyLoad || !ctx || isOffline(ctx)) return foleyLoad;
  foleyLoad = fetch(new URL('../assets/audio/foley.m4a', import.meta.url)).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then(b => new Promise((ok, no) => ctx.decodeAudioData(b, ok, no))).then(b => (foleyBuf = b)).catch(e => { console.warn('녹음 층', e?.message || e); foleyLoad = null; }); return foleyLoad; }
function fol(kind, t, peak, o = {}) {
  if (!foleyBuf) return; const L = FOLEY[kind]; const [st, len] = L[Math.floor(Math.random() * L.length)];
  const s = ctx.createBufferSource(); s.buffer = foleyBuf; s.playbackRate.value = (o.rate || 1) * rnd(0.94, 1.06) * EV.p;
  let n = s; if (o.lp) { const f = bq('lowpass', o.lp * EV.f, 0.7); n.connect(f); n = f; } if (o.hp) { const f = bq('highpass', o.hp, 0.7); n.connect(f); n = f; }
  const g = ctx.createGain(); g.gain.value = peak * EV.g * (1 + EV.a * (Math.random() * 2 - 1)); n.connect(g); let out = g;
  if (o.pan) { const p = ctx.createStereoPanner(); p.pan.value = cl(o.pan); g.connect(p); out = p; }
  out.connect(CUR_BUS || sfxBus); if (o.wet) { const w = gn(o.wet); out.connect(w); w.connect(revIn); }
  s.start(t, st, len / s.playbackRate.value * (o.cut || 1)); }

/* ───── 무기 4종: 발사 · 재장전 · 탄피 (판에서 지금 무기를 읽음 — 직접 넘겨도 됨) ─────
   발사 = ① 터짐(아주 짧은 중고역 잡음 · 6~10ms 라 날카로움 피로 X) ② 몸통(사인 낙하 + 포화 → 2·3차 배음이 폰에서 '쿵'으로 들림 + 갈색 잡음 '퍽')
          ③ 중역 몸(분홍 잡음 대역 내려감 · 폰이 잘 내는 400~1200Hz) ④ 꼬리(대부분 방 울림으로 → 창고 쇠벽 · 항구 열린 메아리 · 터널 긴 울림) ⑤ 기계음(작동 · 장전) */
const wkNow = () => R()?.w?.key || 'pistol';
function gun(t, p, G) {
  const v = G.v || 0.05, k = rnd(1 - v, 1 + v), d = rnd(0.88, 1.12);
  nz({ t, dur: G.ck[0], ft: 'bandpass', ff: G.ck[1], q: 0.8, peak: G.ck[2], pan: p, j: 0 });
  os({ t, f0: G.b[0] * k, f1: G.b[1] * rnd(0.88, 1.12), dur: G.b[2] * d, peak: G.b[3], pan: p, sat: 1, j: 0 });
  nz({ t, kind: 'brown', dur: G.b[2] * 0.9, ft: 'lowpass', ff: G.b[0] * 5, ff1: G.b[0] * 1.5, peak: G.b[3] * 0.7, pan: p, j: 0 });
  nz({ t, kind: 'pink', dur: G.m[0], ft: 'bandpass', ff: G.m[1] * k, ff1: G.m[2], q: 0.9, peak: G.m[3], pan: p, wet: 0.1, sat: G.m[4] });
  nz({ t: t + 0.008, kind: 'pink', dur: G.tl[0] * d, a: 0.004, ft: 'lowpass', ff: G.tl[1], ff1: 240, peak: G.tl[2], pan: p * 0.6, wet: G.tl[3], j: 0.003 });
}
const GUN = {
  /* 작살 권총: 압축공기 '퓩' + 공기 빠짐 + 스프링 슬라이드 */
  pistol(t, p) { gun(t, p, { ck: [0.006, 2400, 0.22], b: [175, 55, 0.09, 0.7], m: [0.08, 1150, 480, 0.5], tl: [0.26, 1500, 0.05, 0.5] });
    nz({ t: t + 0.015, kind: 'pink', dur: 0.06, ft: 'bandpass', ff: 1800, ff1: 1100, q: 2, peak: 0.05, pan: p }); clk(t + rnd(0.04, 0.05), 1700, 0.07, p); metal(t + 0.045, rnd(2000, 2200), 0.05, 0.02, p, 0, 0.3); },
  /* 연발 작살소총: 짧고 촘촘 · 한 발씩 높이 · 필터가 달라 기관총처럼 안 들림 + 노리쇠 '착' */
  rifle(t, p) { gun(t, p, { v: 0.08, ck: [0.005, 2200, 0.16], b: [145, 60, 0.06, 0.55], m: [0.05, 1350, 650, 0.4], tl: [0.2, 1400, 0.04, 0.38] });
    clk(t + rnd(0.03, 0.04), 1500, 0.06, p); thud(t + 0.035, 320, 0.03, 0.06, p); },
  /* 산탄 작살포: 굵은 폭발 + 포화 + 긴 방 꼬리 + 0.35초 뒤 펌프 '착-칵' */
  shotgun(t, p) { gun(t, p, { ck: [0.01, 2000, 0.3], b: [92, 32, 0.26, 0.95], m: [0.16, 2000, 450, 0.7, 1], tl: [0.6, 1200, 0.09, 0.8] });
    nz({ t, kind: 'brown', dur: 0.32, ft: 'lowpass', ff: 900, ff1: 180, peak: 0.6, pan: p });
    const u = t + rnd(0.33, 0.38); nz({ t: u, dur: 0.06, ft: 'bandpass', ff: 1100, ff1: 600, q: 1.5, peak: 0.12, pan: p }); clk(u + 0.02, 1000, 0.1, p);
    nz({ t: u + 0.1, dur: 0.05, ft: 'bandpass', ff: 900, ff1: 1600, q: 1.5, peak: 0.1, pan: p }); clk(u + 0.12, 1400, 0.12, p); thud(u + 0.12, 160, 0.05, 0.1, p); },
  /* 대형 작살총: 묵직한 '퉁' + 줄이 풀리는 '쉬익' + 쇠 울림 + 톱니 되감김 */
  harpoon(t, p) { gun(t, p, { ck: [0.01, 1900, 0.28], b: [115, 38, 0.3, 0.95], m: [0.12, 700, 520, 0.6], tl: [0.5, 1100, 0.07, 0.7] });
    nz({ t: t + 0.03, dur: 0.32, ft: 'bandpass', ff: 1800, ff1: 600, q: 4, peak: 0.1, pan: p * 1.5 }); metal(t, 520 * rnd(0.96, 1.04), 0.35, 0.05, p, 0.25, 0.5);
    for (let i = 0; i < 3; i++) clk(t + 0.16 + i * 0.05, 1400 - i * 120, 0.05, p); },
};
const RELOAD = {
  pistol(t, T) { clk(t + 0.04, 1800, 0.22); nz({ t: t + 0.06, dur: 0.05, ft: 'bandpass', ff: 900, q: 2, peak: 0.08 }); clk(t + T * 0.62, 1500, 0.25); clk(t + T * 0.78, 2400, 0.3); thud(t + T * 0.79, 220, 0.05, 0.15); },
  rifle(t, T) { clk(t + 0.05, 1500, 0.15); nz({ t: t + 0.08, kind: 'pink', dur: 0.09, ft: 'bandpass', ff: 700, q: 1.5, peak: 0.12 }); clk(t + T * 0.55, 1200, 0.2); thud(t + T * 0.56, 180, 0.07, 0.3);
    clk(t + T * 0.76, 1500, 0.14); nz({ t: t + T * 0.77, kind: 'pink', dur: 0.06, ft: 'bandpass', ff: 1500, q: 2, peak: 0.08 }); clk(t + T * 0.85, 1700, 0.2); thud(t + T * 0.85, 240, 0.05, 0.22); },
  shotgun(t, T) { for (let i = 0; i < 3; i++) { const u = t + 0.12 + i * T * 0.2 + rnd(-0.02, 0.02); clk(u, 1200, 0.16); thud(u + 0.01, 260, 0.05, 0.14); }
    nz({ t: t + T * 0.78, dur: 0.07, ft: 'bandpass', ff: 1100, ff1: 600, q: 1.5, peak: 0.22 }); clk(t + T * 0.8, 1000, 0.3); nz({ t: t + T * 0.86, dur: 0.06, ft: 'bandpass', ff: 900, ff1: 1600, q: 1.5, peak: 0.2 }); clk(t + T * 0.88, 1500, 0.34); thud(t + T * 0.88, 150, 0.08, 0.25); },
  harpoon(t, T) { for (let i = 0; i < 9; i++) clk(t + 0.1 + i * T * 0.075 + rnd(-0.006, 0.006), 1700 + (i % 2) * 300, 0.1 + i * 0.012);
    nz({ t: t + 0.1, dur: T * 0.68, ft: 'bandpass', ff: 500, q: 3, peak: 0.05, a: 0.05 }); metal(t + T * 0.86, 260, 0.4, 0.09, 0, 0.2, 0.6); thud(t + T * 0.86, 120, 0.12, 0.35); },
};
/* v0.6 (M3-A) 새 무기 소리 — 같은 합성 틀에 성격만 다르게 (리벳 = 짧고 높은 연사 · 망원 = 낮고 긴 꼬리 · 잠수 = 공기 빠지는 '퓨' · 전류 = 쇳소리 + 지직 · 조명탄 = 둔한 '퐁') · 렌치는 arms.js 가 맞은 소리로 */
Object.assign(GUN, {
  rivet(t, p) { gun(t, p, { v: 0.06, ck: [0.004, 2800, 0.12], b: [210, 90, 0.035, 0.4], m: [0.035, 1700, 950, 0.3], tl: [0.1, 1900, 0.03, 0.22] }); },
  longshot(t, p) { gun(t, p, { ck: [0.012, 1700, 0.3], b: [95, 30, 0.34, 1], m: [0.18, 650, 420, 0.7], tl: [0.9, 950, 0.08, 0.8] }); },
  diver(t, p) { nz({ t, dur: 0.14, ft: 'bandpass', ff: 2600, ff1: 900, q: 1.2, peak: 0.16, pan: p }); thud(t + 0.01, 180, 0.06, 0.2); },
  volt(t, p) { gun(t, p, { v: 0.07, ck: [0.006, 3000, 0.18], b: [150, 60, 0.06, 0.5], m: [0.06, 2400, 1200, 0.4], tl: [0.22, 2600, 0.04, 0.35] }); nz({ t: t + 0.02, dur: 0.18, ft: 'highpass', ff: 3500, q: 1, peak: 0.07, pan: p }); },
  flare(t, p) { gun(t, p, { ck: [0.01, 1500, 0.24], b: [70, 28, 0.3, 0.9], m: [0.14, 900, 380, 0.6], tl: [0.5, 800, 0.07, 0.6] }); },
});
Object.assign(RELOAD, { rivet: RELOAD.rifle, longshot: RELOAD.harpoon, diver: RELOAD.pistol, volt: RELOAD.rifle, flare: RELOAD.shotgun, wrench() {} });
/* M5-C 새 무기 7 소리 — 같은 합성 틀 · 성격만: 쌍발 = 권총 두 겹(4ms 어긋남) · 그물 = 둔한 '퐁' + 줄 풀리는 쉭 · 석궁 = 시위 '팅' + 나무 딱(거의 조용)
 *  물대포 = 물줄기 쏴아(짧은 잡음 반복) · 닻 = 아주 낮은 '쿵' + 사슬 철컹 · 물보라 = 산탄보다 높고 맑은 껍데기 깨짐 · 불꽃 = 세 번 '퓨웅' */
Object.assign(GUN, {
  twin(t, p) { GUN.pistol(t, p - 0.15); gun(t + 0.004, p + 0.15, { v: 0.06, ck: [0.005, 2600, 0.14], b: [190, 70, 0.07, 0.45], m: [0.06, 1250, 520, 0.35], tl: [0.18, 1600, 0.04, 0.4] }); },
  net(t, p) { thud(t, 130, 0.12, 0.45, p); nz({ t, kind: 'pink', dur: 0.22, ft: 'bandpass', ff: 900, ff1: 2200, q: 1.1, peak: 0.16, pan: p }); for (let i = 0; i < 4; i++) clk(t + 0.05 + i * 0.03, 900 + i * 90, 0.04, p); },
  crossbow(t, p) { os({ t, f0: 520, f1: 260, dur: 0.12, peak: 0.12, wave: 'triangle', lp: 2600, pan: p }); clk(t, 2200, 0.16, p); thud(t + 0.01, 300, 0.04, 0.12, p); nz({ t: t + 0.01, dur: 0.08, ft: 'bandpass', ff: 3200, ff1: 1500, q: 2, peak: 0.05, pan: p }); },
  hose(t, p) { nz({ t, kind: 'pink', dur: 0.11, a: 0.01, ft: 'bandpass', ff: rnd(1700, 2300), q: 0.7, peak: 0.13, pan: p }); nz({ t, kind: 'white', dur: 0.08, ft: 'highpass', ff: 4200, peak: 0.04, pan: p }); },
  anchor(t, p) { gun(t, p, { ck: [0.012, 1400, 0.3], b: [70, 26, 0.38, 1], m: [0.16, 600, 340, 0.7, 1], tl: [0.7, 900, 0.09, 0.8] }); for (let i = 0; i < 6; i++) metal(t + 0.06 + i * 0.045, rnd(700, 950), 0.08, 0.05, p, 0.15, 0.4); },
  scatter(t, p) { gun(t, p, { ck: [0.009, 2600, 0.3], b: [110, 40, 0.2, 0.85], m: [0.13, 2400, 700, 0.6, 1], tl: [0.5, 1500, 0.08, 0.7] }); for (let i = 0; i < 5; i++) clk(t + 0.02 + i * rnd(0.008, 0.02), rnd(3000, 4500), 0.05, p + rnd(-0.3, 0.3)); },
  rocket(t, p) { for (let i = 0; i < 3; i++) { const u = t + i * 0.07; nz({ t: u, kind: 'pink', dur: 0.18, a: 0.01, ft: 'bandpass', ff: 1400, ff1: 3200, fdur: 0.18, q: 1.6, peak: 0.12, pan: p + (i - 1) * 0.25 }); thud(u, 160, 0.05, 0.15, p); } },
});
Object.assign(RELOAD, { twin: RELOAD.pistol, net: RELOAD.shotgun, crossbow: RELOAD.harpoon, hose: RELOAD.rifle, anchor: RELOAD.harpoon, scatter: RELOAD.shotgun, rocket: RELOAD.shotgun, hook() {}, oar() {} });
function shell(t, wk) {
  if (wk === 'harpoon') return;
  /* 바닥 따라: 창고 콘크리트(맑게 튐) · 항구 나무 부두(둔하게) · 터널 쇠 격자(길게) · 물 위면 '퐁' */
  const m = R()?.map, wet = (() => { const r = R(); try { return r?.water?.userData?.mask?.(r.pl.pos.x, r.pl.pos.z) > 0.15; } catch { return false; } })();
  if (wet) { plip(t, rnd(500, 800), 0.03, rnd(-0.2, 0.2), 0.25); return; }
  if (wk === 'shotgun') { [0, 0.11, 0.18].forEach((d, i) => { thud(t + d, 520 - i * 40, 0.04, 0.06 - i * 0.015); os({ t: t + d, f0: 1150 + i * 30, dur: 0.05, peak: 0.025, wave: 'triangle', lp: 2400 }); }); return; }
  const f = (wk === 'rifle' ? rnd(3600, 4200) : rnd(3000, 3500)) * (m === 'harbor' ? 0.8 : 1), dk = m === 'harbor' ? 0.6 : m === 'tunnel' ? 1.4 : 1;
  [0, rnd(0.07, 0.1), rnd(0.13, 0.16), rnd(0.165, 0.19)].forEach((d, i) => metal(t + d, f * (1 + i * 0.01), (0.07 - i * 0.012) * dk, 0.035 * (1 - i * 0.22), rnd(-0.2, 0.2), 0, 0.35));
}

/* 보스 3종 예고 (판 안 보스 패턴에서 sfx.warn 이 부르면 보스 종류 · 패턴으로 바꿔 냄) */
function bossWarn(kind, pat, d) {
  const t = now(); d = Math.max(0.35, Math.min(1.6, d || 0.7));
  if (kind === 'captain') {
    if (pat === 'hook') { for (let i = 0; i < 7; i++) metal(t + i * d / 8, rnd(850, 1050), 0.06, 0.05 + i * 0.008, 0, 0.1, 0.3); nz({ t, dur: d, ft: 'bandpass', ff: 600, ff1: 1800, q: 2, peak: 0.08, a: d * 0.6 }); }
    else if (pat === 'douse') { nz({ t, kind: 'pink', dur: 1.2, ft: 'bandpass', ff: 400, ff1: 1500, q: 1.2, peak: 0.3, a: 0.5, wet: 0.4 }); metal(t + 0.2, 1900, 0.5, 0.06, -0.3, 0.4); metal(t + 0.45, 2300, 0.5, 0.05, 0.3, 0.4); }
    else { nz({ t, kind: 'pink', dur: 0.1, ft: 'bandpass', ff: 300, ff1: 1400, q: 1.5, peak: 0.3, a: d * 0.9 }); os({ t, f0: 90, f1: 160, dur: 0.1, a: d * 0.9, peak: 0.25, wave: 'sawtooth', lp: 500 }); metal(t, 700, d, 0.06, 0, 0.3, 0.4); }
    return; }
  if (kind === 'smelter') { /* 쇳물 감독관: 붓기 = 국자 기울며 끓는 소리 · 쇳물 비 = 휘파람 + 끓음 · 내려찍기 = 쇠 경적 + 바람 */
    if (pat === 'pour') { nz({ t, kind: 'brown', dur: 0.3, ft: 'lowpass', ff: 300, ff1: 1200, peak: 0.35, a: d * 0.8, wet: 0.2 }); for (let i = 0; i < 6; i++) os({ t: t + d * i / 7, f0: rnd(160, 260), f1: rnd(320, 520), glide: 0.06, dur: 0.07, peak: 0.05, wave: 'sine', j: 0 }); metal(t, 330, d, 0.05, 0, 0.3, 0.5); }
    else if (pat === 'rain') { const o = { t, f0: 900, f1: 2400, glide: d, dur: 0.1, a: d * 0.95, peak: 0.05, wave: 'triangle', lp: 3000, j: 0 }; os(o); os({ ...o, f0: 905, f1: 2380, det: 8 }); nz({ t, kind: 'brown', dur: 0.4, ft: 'lowpass', ff: 260, ff1: 900, peak: 0.4, a: d * 0.9, wet: 0.3 }); }
    else { os({ t, f0: 82, dur: 0.12, a: d * 0.5, hold: d * 0.4, peak: 0.16, wave: 'sawtooth', lp: 600, j: 0 }); os({ t, f0: 123, dur: 0.12, a: d * 0.5, hold: d * 0.4, peak: 0.1, wave: 'sawtooth', lp: 600, det: 6, j: 0 }); nz({ t, kind: 'pink', dur: 0.08, ft: 'bandpass', ff: 300, ff1: 2000, q: 1.2, peak: 0.28, a: d * 0.9 }); }
    return; }
  if (kind === 'eel') {
    if (pat === 'charge') { nz({ t, kind: 'brown', dur: 0.2, ft: 'lowpass', ff: 200, ff1: 900, peak: 0.5, a: d * 0.9 }); os({ t, f0: 60, f1: 110, dur: 0.2, a: d * 0.9, peak: 0.35 }); }
    else { const o = { t, f0: 180, f1: 760, glide: d, dur: 0.15, a: d * 0.95, peak: 0.07, wave: 'sawtooth', lp: 1300, j: 0 }; os(o); os({ ...o, f0: 182, f1: 768, det: 9 }); for (let i = 0; i < 5; i++) nz({ t: t + d * (0.3 + i * 0.13), dur: 0.015, ft: 'bandpass', ff: 2200, q: 2, peak: 0.05 + i * 0.012 }); }
    return; }
  /* 수문지기: 쇠 문이 끌리는 낮은 경적 + 내려찍기면 차오르는 바람 */
  os({ t, f0: 98, dur: 0.12, a: d * 0.5, hold: d * 0.4, peak: 0.16, wave: 'sawtooth', lp: 700, j: 0 }); os({ t, f0: 147, dur: 0.12, a: d * 0.5, hold: d * 0.4, peak: 0.1, wave: 'sawtooth', lp: 700, det: 6, j: 0 });
  if (pat === 'slam') nz({ t, kind: 'pink', dur: 0.08, ft: 'bandpass', ff: 300, ff1: 2000, q: 1.2, peak: 0.28, a: d * 0.9 });
}
/* 몽이(반려 수달): 짧은 '끼익-끽' 울음 (기분: happy · ask · sad) */
function mong(mood = 'happy', t = now()) {
  const n = mood === 'sad' ? 1 : mood === 'ask' ? 2 : 3;
  for (let i = 0; i < n; i++) { const u = t + i * rnd(0.1, 0.12), b = mood === 'sad' ? 1050 : 1300 + i * 90 + rnd(-40, 40);
    const o = { t: u, f0: b, f1: mood === 'sad' ? b * 0.7 : mood === 'ask' && i === n - 1 ? b * 1.35 : b * 1.18, glide: 0.07, dur: 0.075, a: 0.012, peak: 0.07, wave: 'triangle', lp: 3200, wet: 0.08, j: 0 };
    os(o); os({ ...o, f0: o.f0 * 2.01, f1: o.f1 * 2.01, peak: 0.018 }); nz({ t: u, dur: 0.05, ft: 'bandpass', ff: b * 1.5, q: 3, peak: 0.02, j: 0 }); }
}
/* 쇠 호루라기 (두목): 숨소리 + 가는 사각파 두 겹이 위로 꺾임 (dur 초 · k 높이 배수) */
function whistle(t, dur, k = 1) { nz({ t, kind: 'white', dur, a: 0.02, ft: 'bandpass', ff: 2800 * k, q: 4, peak: 0.05, wet: 0.3, j: 0 });
  for (const f of [2350, 2380]) os({ t, f0: f * 0.82 * k, f1: f * k, glide: 0.06, dur: 0.08, a: 0.015, hold: dur - 0.1, peak: 0.035, wave: 'square', lp: 4200, wet: 0.35, j: 0 }); }
/* 천둥(폭풍 번개 — 판이 번개를 치며 sfx.boom 을 부르면): 가까운 '쩍' + 늦게 굴러오는 낮은 우르릉 두 겹 (항구 열린 메아리) */
function thunder(t) { duck(0.5, 2.5); const d = rnd(0.12, 0.5);
  nz({ t, dur: 0.04, ft: 'highpass', ff: 1400, peak: 0.25, j: 0 }); nz({ t, kind: 'pink', dur: 0.45, ft: 'bandpass', ff: 900, ff1: 300, q: 0.7, peak: 0.3, wet: 0.4, j: 0 });
  nz({ t: t + d, kind: 'brown', dur: 2.6, a: 0.15, ft: 'lowpass', ff: 240, ff1: 90, peak: 1.0, wet: 0.45, pan: rnd(-0.3, 0.3), j: 0 });
  nz({ t: t + d + rnd(0.5, 0.9), kind: 'brown', dur: 1.8, a: 0.3, ft: 'lowpass', ff: 420, ff1: 120, peak: 0.55, wet: 0.5, pan: rnd(-0.5, 0.5), j: 0 });
  os({ t: t + d, f0: 55, f1: 32, dur: 1.6, a: 0.1, peak: 0.45, sat: 1, j: 0 }); }

let lastShot = -1, lastStep = -1;
export const sfx = {
  /* 사격 — 무기 4종 각각 (wk 없으면 판의 지금 무기) */
  shot(pan = 0, wk) { if (!ctx) return; const t = now(); if (t - lastShot < 0.03) return; lastShot = t; const k = wk || wkNow(), g0 = EV.g; EV.g = g0 * (GUNV[k] || 1); /* M6-D 무기별 크기 (tools/m6d_loudness.mjs) */
    try { (GUN[k] || GUN.pistol)(t, pan); } finally { EV.g = g0; } },
  shell(wk) { if (!ctx) return; shell(now() + rnd(0.46, 0.56), wk || wkNow()); }, /* v0.6.1 탄피가 바닥에 처음 닿는 때(fx.shell 0.46~0.58초)에 맞춤 — 전엔 0.18~0.3초로 공중에서 남 */
  /* 재장전(무기마다 길이 맞춤) · 무기 바꾸기(장전 중이 아니면) */
  reload(wk, T) { if (!ctx) return; const r = R(), t = now(); wk = wk || wkNow();
    if (!T && r && !(r.pl?.reload > 0)) { nz({ t, kind: 'pink', dur: 0.14, ft: 'bandpass', ff: 700, ff1: 1400, q: 1, peak: 0.12 }); clk(t + 0.12, 1400, 0.2); clk(t + 0.2, 2100, 0.16); return; }
    (RELOAD[wk] || RELOAD.pistol)(t, T || r?.w?.reload || 1.2); },
  empty() { if (!ctx) return; const t = now(); clk(t, 2600, 0.18); clk(t + 0.05, 1900, 0.08); },
  /* 맞음(해골 = 뼈 · 나무 같은 딱) · 쇠 맞음 · 처치 — 판이 히트스톱을 길게 건 타격(치명 · 약점)이면 저음 펀치 + 반짝을 더함 */
  hit(pan = 0, strong) { if (!ctx) return; const t = now(); strong ??= (R()?.hitstop || 0) >= 0.065; const k = rnd(0.9, 1.1);
    os({ t, f0: 170 * k, f1: 80, dur: 0.06, peak: 0.45, pan }); nz({ t, kind: 'pink', dur: 0.05, ft: 'bandpass', ff: 1300 * k, q: 1.1, peak: 0.42, pan }); clk(t, 2400 * k, 0.1, pan);
    os({ t, f0: rnd(640, 760), dur: 0.035, peak: 0.035, wave: 'triangle', lp: 1600, pan }); /* 뼈 공명 */
    if (strong) { os({ t, f0: 80, f1: 38, dur: 0.16, peak: 0.6, pan, sat: 1 }); metal(t + 0.01, 1750, 0.18, 0.05, pan, 0.25, 0.4); } },
  hitMetal(pan = 0, strong) { if (!ctx) return; const t = now(); strong ??= (R()?.hitstop || 0) >= 0.065; const f = rnd(620, 820);
    nz({ t, dur: 0.02, ft: 'bandpass', ff: 3000, q: 1, peak: 0.3, pan }); metal(t, f, 0.22, 0.13, pan, 0.18, 0.6); thud(t, 200, 0.05, 0.2, pan);
    if (strong) { os({ t, f0: 90, f1: 40, dur: 0.15, peak: 0.5, pan, sat: 1 }); metal(t + 0.015, f * 1.5, 0.3, 0.05, pan, 0.3, 0.5); } },
  kill(pan = 0, big) { if (!ctx) return; const t = now(), r = R(); big ??= !!(r?.boss?.dead && r.bossKind && !r.boss.__sndK && (r.boss.__sndK = true));
    os({ t, f0: 130, f1: 42, dur: big ? 0.6 : 0.28, peak: 0.75, pan, sat: 1 }); nz({ t, kind: 'brown', dur: big ? 0.9 : 0.4, ft: 'lowpass', ff: 1000, ff1: 220, peak: 0.75, pan, wet: 0.2 });
    nz({ t, kind: 'pink', dur: 0.07, ft: 'bandpass', ff: 1800, q: 0.8, peak: 0.35, pan });
    for (let i = 0; i < (big ? 9 : 5); i++) { const u = t + 0.06 + i * rnd(0.03, 0.07); clk(u, rnd(1400, 2600), rnd(0.04, 0.09), pan + rnd(-0.2, 0.2)); }
    if (big) { duck(0.35, 1.6); [57, 64, 69, 72].forEach((m, i) => metal(t + 0.25 + i * 0.06, MIDI(m + 12), 1.4, 0.04, 0, 0.5, 0.4)); } },
  /* v0.6.1 무기 서명 소리 (검수 M3 Top 5) — 그림과 같은 프레임에 부름 */
  /* 감전: 지직(짧은 고역 잡음 다발) + 톱니 웅 — n = 연쇄 몇 번째(0 = 전기 작살촉 명중 · 작게) */
  zap(pan = 0, n = 1) { if (!ctx) return; const t = now(), k = n ? 1 : 0.45, c = n ? 6 : 3;
    for (let i = 0; i < c; i++) nz({ t: t + i * rnd(0.012, 0.024), dur: 0.008, ft: 'bandpass', ff: rnd(3200, 6200), q: 2, peak: 0.16 * k, pan: pan + rnd(-0.2, 0.2), j: 0 });
    os({ t, f0: 118 + n * 9, dur: 0.12 * (n ? 1 : 0.6), peak: 0.09 * k, wave: 'sawtooth', lp: 1800, pan }); os({ t, f0: 236 + n * 18, dur: 0.08, peak: 0.04 * k, wave: 'square', lp: 2400, pan, det: 12 }); },
  /* 망원 치명/약점: 맑은 '핑' (두 배음 쇠) */
  ping(pan = 0) { if (!ctx) return; const t = now(); metal(t + 0.01, 2350, 0.5, 0.07, pan, 0.35, 0.8); metal(t + 0.01, 3520, 0.32, 0.035, pan, 0.3, 0.6); },
  /* 관통 작살촉 명중: 높은 '틱' + 뒤로 빠지는 쉭 */
  pierce(pan = 0) { if (!ctx) return; const t = now(); clk(t, 3800, 0.12, pan); nz({ t: t + 0.01, dur: 0.06, ft: 'bandpass', ff: 4200, ff1: 1800, q: 2, peak: 0.07, pan }); },
  /* 조명탄 날아감: 불꽃 '쉬익'(날아가는 시간 T 만큼) */
  fizz(T = 0.3) { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: Math.max(0.06, T), a: 0.02, ft: 'bandpass', ff: 2600, ff1: 1400, fdur: T + 0.05, q: 1.4, peak: 0.12, j: 0 }); },
  /* 잠수 작살: 거품 보글 (물속이면 많고 낮게) */
  bubble(wet) { if (!ctx) return; const t = now(); for (let i = 0; i < (wet ? 5 : 3); i++) plip(t + 0.03 + i * rnd(0.03, 0.06), rnd(wet ? 380 : 600, wet ? 650 : 950), 0.05, rnd(-0.3, 0.3), 0.3); },
  cover() { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.05, ft: 'bandpass', ff: 700, q: 2.5, peak: 0.28 }); os({ t, f0: 240, f1: 180, dur: 0.05, peak: 0.12, wave: 'triangle', lp: 900 }); },
  /* 내가 맞음: 몸에 둔탁하게 + 작은 '끽' */
  hurt() { if (!ctx) return; const t = now(); thud(t, 140, 0.18, 0.6); nz({ t, kind: 'pink', dur: 0.12, ft: 'lowpass', ff: 1600, ff1: 300, peak: 0.35, sat: 1 });
    os({ t: t + 0.02, f0: 1250, f1: 900, glide: 0.08, dur: 0.08, a: 0.01, peak: 0.05, wave: 'triangle', lp: 2600 }); },
  enemyShot(pan = 0) { if (!ctx) return; const t = now(); os({ t, f0: 1100, f1: 420, dur: 0.11, peak: 0.12, wave: 'square', lp: 2200, lp1: 700, pan }); nz({ t, kind: 'pink', dur: 0.06, ft: 'bandpass', ff: 1800, q: 1, peak: 0.16, pan });
    nz({ t: t + 0.01, kind: 'pink', dur: 0.2, ft: 'lowpass', ff: 1200, ff1: 300, peak: 0.03, pan, wet: 0.5 }); },
  swing(pan = 0) { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.12, a: 0.08, ft: 'bandpass', ff: 400, ff1: 1500, fdur: 0.12, q: 1.2, peak: 0.3, pan }); },
  /* M5-C 근접 셋 휘두름 · 새 무기 효과음 (렌치는 위 swing 그대로) */
  swingW(wk, pan = 0) { if (!ctx) return; const t = now();
    if (wk === 'hook') { nz({ t, kind: 'pink', dur: 0.09, a: 0.02, ft: 'bandpass', ff: 1800, ff1: 900, q: 1.6, peak: 0.24, pan }); metal(t + 0.07, 1300, 0.12, 0.05, pan, 0.1, 0.5); nz({ t: t + 0.1, dur: 0.12, ft: 'bandpass', ff: 700, ff1: 1100, q: 2, peak: 0.08, pan }); return true; }
    if (wk === 'oar') { nz({ t, kind: 'pink', dur: 0.32, a: 0.12, ft: 'bandpass', ff: 300, ff1: 900, fdur: 0.3, q: 0.9, peak: 0.34, pan }); for (let i = 0; i < 4; i++) plip(t + 0.15 + i * rnd(0.03, 0.05), rnd(500, 800), 0.04, rnd(-0.4, 0.4), 0.3); return true; }
    return undefined; },
  net(n = 0) { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.18, ft: 'bandpass', ff: 1200, ff1: 500, q: 1.3, peak: 0.16 }); for (let i = 0; i < 3 + Math.min(3, n); i++) clk(t + 0.03 + i * 0.025, rnd(700, 1100), 0.05); },
  clank(n = 0) { if (!ctx) return; const t = now(); thud(t, 90, 0.2, 0.5); for (let i = 0; i < 4 + Math.min(4, n); i++) metal(t + 0.04 + i * rnd(0.03, 0.05), rnd(650, 900), 0.1, 0.05, rnd(-0.3, 0.3), 0.2, 0.4); },
  whoosh() { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.25, a: 0.04, ft: 'bandpass', ff: 700, ff1: 2200, fdur: 0.25, q: 1.2, peak: 0.12 }); },
  pop() { if (!ctx) return; const t = now(); thud(t, 180, 0.08, 0.3); nz({ t, dur: 0.05, ft: 'bandpass', ff: 2600, q: 1, peak: 0.12 }); for (let i = 0; i < 4; i++) clk(t + 0.03 + i * rnd(0.02, 0.05), rnd(2400, 4200), 0.04, rnd(-0.4, 0.4)); },
  /* M6-B 약한 무기 6 맞는 소리 한 겹 (공통 '맞음' 위에 무기 색 — 0.06초에 한 번): 쌍발 = 두 번 '틱틱' · 석궁 = 나무 '퍽' + 낮은 진동 · 닻 = 쇠사슬 '촤르륵' + 둔탁
     물보라 = 물 '촥' (젖은 잡음) · 갈고리 = 쇠 '끽' 긁힘 · 불꽃 = 축제 폭죽 '팡' 따닥 */
  hitW(wk, pan = 0) { if (!ctx) return; const t = now(); if (t - (this.__hw || 0) < 0.06) return; this.__hw = t;
    if (wk === 'twin') { clk(t, 3100, 0.16, pan - 0.15); clk(t + 0.045, 2700, 0.14, pan + 0.15); }
    else if (wk === 'crossbow') { thud(t, 220, 0.07, 0.32, pan); nz({ t, kind: 'pink', dur: 0.06, ft: 'bandpass', ff: 900, q: 1.4, peak: 0.2, pan }); os({ t: t + 0.01, f0: 140, f1: 120, dur: 0.18, peak: 0.08, wave: 'triangle', lp: 900, pan }); }
    else if (wk === 'anchor') { thud(t, 70, 0.18, 0.45, pan); for (let i = 0; i < 5; i++) metal(t + 0.02 + i * 0.035, rnd(900, 1300), 0.06, 0.04, pan + rnd(-0.2, 0.2), 0.1, 0.3); }
    else if (wk === 'scatter') { nz({ t, kind: 'white', dur: 0.12, a: 0.005, ft: 'bandpass', ff: 2200, ff1: 900, fdur: 0.12, q: 0.8, peak: 0.18, pan }); nz({ t: t + 0.03, kind: 'pink', dur: 0.1, ft: 'lowpass', ff: 1200, q: 0.7, peak: 0.1, pan }); }
    else if (wk === 'hook') { metal(t, 1500, 0.1, 0.06, pan, 0.1, 0.5); nz({ t: t + 0.01, dur: 0.14, ft: 'bandpass', ff: 2600, ff1: 1400, fdur: 0.14, q: 3, peak: 0.12, pan }); }
    else if (wk === 'rocket') { thud(t, 120, 0.1, 0.3, pan); nz({ t, dur: 0.08, ft: 'highpass', ff: 3000, q: 0.7, peak: 0.12, pan }); for (let i = 0; i < 6; i++) clk(t + 0.05 + i * rnd(0.03, 0.06), rnd(3000, 5200), 0.05, pan + rnd(-0.5, 0.5)); } },
  /* 구르기: 옷 · 물 휙 + 0.31초 뒤 착지 / 판에서 장어가 돌진 시작이면 물 밀려오는 소리 / 던지기면 휙만 */
  roll() { if (!ctx) return; const t = now(), r = R();
    if (r?.boss?.charging && r.boss.kind === 'eel') { nz({ t, kind: 'brown', dur: 0.9, ft: 'lowpass', ff: 300, ff1: 1400, fdur: 0.4, peak: 0.7, wet: 0.2 }); nz({ t, kind: 'pink', dur: 0.7, ft: 'bandpass', ff: 900, ff1: 2500, q: 0.8, peak: 0.22, a: 0.1 }); return; }
    nz({ t, kind: 'pink', dur: 0.2, a: 0.05, ft: 'bandpass', ff: 500, ff1: 1700, q: 0.9, peak: 0.28 }); fol('cloth', t, 0.16, { rate: 1.25 }); fol('bag', t + 0.28, 0.07, { lp: 2000 });
    if (r && r.pl?.roll > 0) { const wet = r.water?.userData?.mask?.(r.pl.pos.x, r.pl.pos.z) > 0.15; const u = t + 0.31; thud(u, 110, 0.12, 0.35);
      if (wet) { nz({ t: u, dur: 0.16, ft: 'bandpass', ff: 1100, ff1: 600, q: 0.9, peak: 0.2 }); plip(u + 0.04, 700, 0.06); } else nz({ t: u, kind: 'pink', dur: 0.06, ft: 'highpass', ff: 1800, peak: 0.07 }); } },
  /* 발: 말랑한 발바닥 + 바닥 따라(창고 젖은 콘크리트 · 항구 나무 부두 · 터널 쇠 격자) · 매번 조금씩 다름 · 아주 작게 / 물 첨벙 */
  step() { if (!ctx) return; const t = now(); if (t - lastStep < 0.06) return; lastStep = t; const k = rnd(0.85, 1.15), m = R()?.map;
    thud(t, 105 * k, rnd(0.04, 0.07), 0.06); nz({ t, kind: 'pink', dur: rnd(0.02, 0.04), ft: 'highpass', ff: 2200 * k, peak: 0.012 }); fol('step', t, 0.045, { lp: m === 'harbor' ? 1800 : 3200, rate: m === 'harbor' ? 0.85 : 1 });
    if (m === 'harbor') os({ t, f0: 210 * k, f1: 170 * k, dur: 0.06, peak: 0.03, wave: 'triangle', lp: 900 });
    else if ((m === 'tunnel' || m === 'factory') && Math.random() < 0.45) metal(t, rnd(900, 1250), 0.05, 0.006, 0, 0.12, 0.3); },
  /* M4-B 심해 연구소: 수압 문(삑삑 · 쿵 · 쉬익) · 배양조 유리(톡 · 와장창) · 파수 신호음(두 음 · 차갑게 울림) · 경보 · 포자 · 수압 탄 · 덩굴 / 판 상태: 떨림(한파) · 독 */
  doorWarn(pan = 0) { if (!ctx) return; const t = now(); for (let i = 0; i < 3; i++) os({ t: t + i * 0.28, f0: 1320, dur: 0.12, peak: 0.07, wave: 'square', lp: 2600, pan, j: 0 }); },
  doorShut(pan = 0) { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.35, a: 0.02, ft: 'bandpass', ff: 2400, ff1: 900, q: 0.8, peak: 0.12, pan }); thud(t + 0.3, 70, 0.3, 0.32, pan); metal(t + 0.3, 210, 0.7, 0.05, pan, 0.4, 0.4); },
  doorOpen(pan = 0) { if (!ctx) return; const t = now(); nz({ t, kind: 'white', dur: 0.5, a: 0.03, ft: 'bandpass', ff: 3200, ff1: 1600, q: 0.9, peak: 0.1, pan, wet: 0.3 }); clk(t, 900, 0.08, pan); },
  glassTick() { if (!ctx) return; const t = now(); metal(t, rnd(2600, 3400), 0.18, 0.04, 0, 0.2, 1); },
  glass() { if (!ctx) return; const t = now(); for (let i = 0; i < 9; i++) metal(t + i * rnd(0.01, 0.05), rnd(2200, 5200), rnd(0.2, 0.5), 0.05, rnd(-0.5, 0.5), 0.3, 1); nz({ t, kind: 'white', dur: 0.35, ft: 'highpass', ff: 2500, peak: 0.22 }); nz({ t: t + 0.05, kind: 'brown', dur: 0.9, a: 0.04, ft: 'lowpass', ff: 700, ff1: 250, peak: 0.35, wet: 0.3 }); for (let i = 0; i < 6; i++) plip(t + 0.2 + i * rnd(0.06, 0.15), rnd(500, 900), 0.03, rnd(-0.4, 0.4), 0.3); },
  beacon() { if (!ctx) return; const t = now(); duck(0.5, 1.4); mar(t, MIDI(81), 0.12, 0.7, 0, 0.5); mar(t + 0.22, MIDI(88), 0.1, 1.1, 0, 0.6); os({ t, f0: MIDI(57), dur: 1.0, peak: 0.05, wave: 'triangle', wet: 0.6, j: 0 }); },
  alarm(pan = 0) { if (!ctx) return; const t = now(); for (let i = 0; i < 4; i++) os({ t: t + i * 0.32, f0: 880, f1: 660, glide: 0.28, dur: 0.3, peak: 0.08, wave: 'sawtooth', lp: 2200, pan, wet: 0.3, j: 0 }); },
  sporeWarn(pan = 0) { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.7, a: 0.5, ft: 'bandpass', ff: 500, ff1: 1400, q: 1.2, peak: 0.07, pan }); for (let i = 0; i < 4; i++) plip(t + i * 0.16, rnd(300, 500), 0.03, pan, 0.2); },
  spore(pan = 0) { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.45, a: 0.01, ft: 'lowpass', ff: 1800, ff1: 400, peak: 0.28, pan, wet: 0.25 }); thud(t, 110, 0.12, 0.12, pan); },
  beamWarn(pan = 0) { if (!ctx) return; const t = now(); os({ t, f0: 300, f1: 1800, glide: 0.6, dur: 0.65, peak: 0.05, wave: 'sawtooth', lp: 2400, pan, j: 0 }); },
  beam(pan = 0) { if (!ctx) return; const t = now(); nz({ t, kind: 'white', dur: 0.22, ft: 'bandpass', ff: 3000, ff1: 900, q: 1, peak: 0.25, pan }); thud(t, 160, 0.1, 0.18, pan); os({ t, f0: 1400, f1: 300, dur: 0.18, peak: 0.06, wave: 'square', lp: 2000, pan }); },
  lash() { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.25, a: 0.12, ft: 'bandpass', ff: 600, ff1: 1600, q: 0.8, peak: 0.2 }); nz({ t: t + 0.2, kind: 'brown', dur: 0.6, ft: 'lowpass', ff: 500, ff1: 150, peak: 0.45, wet: 0.35 }); },
  shiver() { if (!ctx) return; const t = now(); for (let i = 0; i < 8; i++) clk(t + i * 0.045, 2600 + (i % 2) * 400, 0.04); nz({ t, kind: 'white', dur: 0.5, a: 0.1, ft: 'highpass', ff: 5000, peak: 0.05 }); },
  toxic() { if (!ctx) return; const t = now(); for (let i = 0; i < 7; i++) plip(t + i * rnd(0.05, 0.11), rnd(180, 380), 0.05, rnd(-0.3, 0.3), 0.15); os({ t, f0: 140, f1: 90, dur: 0.6, peak: 0.06, wave: 'triangle' }); },
  /* M3-B 공장 증기: 예고(작게 칙칙) · 뿜음(쉬익 길게) · 쇳물 붓기(끓음) */
  steamWarn(pan = 0) { if (!ctx) return; const t = now(); for (let i = 0; i < 4; i++) nz({ t: t + i * 0.18, dur: 0.05, ft: 'bandpass', ff: 4200, q: 1.5, peak: 0.05 + i * 0.015, pan }); },
  steam(pan = 0) { if (!ctx) return; const t = now(); nz({ t, kind: 'white', dur: 1.6, a: 0.04, ft: 'bandpass', ff: 4800, ff1: 2200, q: 0.7, peak: 0.22, pan, wet: 0.3 }); nz({ t, kind: 'pink', dur: 0.6, a: 0.02, ft: 'highpass', ff: 1500, peak: 0.12, pan }); },
  pour(pan = 0) { if (!ctx) return; const t = now(); nz({ t, kind: 'brown', dur: 1.2, a: 0.05, ft: 'lowpass', ff: 900, ff1: 300, peak: 0.6, pan, wet: 0.3 }); for (let i = 0; i < 10; i++) os({ t: t + 0.05 + i * rnd(0.05, 0.12), f0: rnd(180, 320), f1: rnd(380, 600), glide: 0.05, dur: 0.06, peak: 0.06, pan }); metal(t, 260, 0.9, 0.06, pan, 0.3, 0.5); },
  splash() { if (!ctx) return; const t = now(); if (t - lastStep < 0.06) return; lastStep = t; const k = rnd(0.85, 1.2);
    nz({ t, kind: 'pink', dur: 0.12, ft: 'bandpass', ff: 1100 * k, ff1: 650, q: 0.9, peak: 0.08 }); thud(t, 95, 0.05, 0.04); if (Math.random() < 0.6) plip(t + rnd(0.03, 0.07), rnd(600, 1000), 0.02, rnd(-0.3, 0.3), 0.2); },
  /* 뒤지기: 천 · 종이 · 나무 바스락 알갱이 */
  search() { if (!ctx) return; const t = now(); for (let i = 0; i < 6; i++) { const u = t + i * rnd(0.07, 0.12); nz({ t: u, kind: Math.random() < 0.5 ? 'pink' : 'white', dur: rnd(0.03, 0.07), ft: 'bandpass', ff: rnd(900, 2600), q: rnd(1, 2.5), peak: rnd(0.05, 0.11), pan: rnd(-0.2, 0.2) }); }
    if (Math.random() < 0.5) clk(t + rnd(0.1, 0.4), rnd(900, 1400), 0.06); fol('cloth', t + 0.05, 0.1); fol('bag', t + rnd(0.25, 0.4), 0.09); },
  /* 가방 넣기: 천 '툭' + 물건 소리(값이 클수록 밝은 마림바 두 음) */
  pick(v = 0) { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.07, ft: 'lowpass', ff: 900, peak: 0.25 }); thud(t, 150, 0.05, 0.15); fol('bag', t, 0.14);
    const b = MIDI(72 + Math.min(7, Math.round(v * 1.5))); mar(t + 0.04, b, 0.12); if (v >= 2) mar(t + 0.11, b * 1.5, 0.1); },
  /* 가방 안 물건 돌리기 */
  rotate() { if (!ctx) return; const t = now(); clk(t, 1700, 0.08); nz({ t, kind: 'pink', dur: 0.06, a: 0.03, ft: 'bandpass', ff: 900, ff1: 1600, q: 1.2, peak: 0.07 }); clk(t + 0.07, 2100, 0.07); },
  rare() { if (!ctx) return; const t = now(); [79, 83, 86, 91].forEach((m, i) => mar(t + i * 0.075, MIDI(m), 0.11, 0.6, 0, 0.3)); metal(t + 0.3, MIDI(98), 0.9, 0.025, 0.2, 0.5, 0.3); },
  /* 적이 나를 봄: 낮은 쇠 찌름 + 반음 부딪힘 (삐 소리 X) */
  alert(pan = 0) { if (!ctx) return; const t = now(); thud(t, 90, 0.1, 0.25, pan);
    [MIDI(62), MIDI(63)].forEach((f, i) => os({ t: t + i * 0.02, f0: f, dur: 0.22, a: 0.01, peak: 0.08, wave: 'sawtooth', lp: 1400, lp1: 500, pan, j: 0 })); metal(t, 1180, 0.2, 0.04, pan, 0.15, 0.5); },
  /* 마지막 10초 시계: 나무 똑딱 (마지막 3초는 높게) */
  tick() { if (!ctx) return; const t = now(), last = (R()?.time ?? 10) <= 3.2; nz({ t, dur: 0.02, ft: 'bandpass', ff: last ? 2600 : 2000, q: 8, peak: 0.3 }); os({ t, f0: last ? 1500 : 1150, dur: 0.04, peak: 0.07, wave: 'triangle', lp: 2500 }); },
  /* 물 차기 1분 전: 먼 경적(뱃고동) 두 번 + 물 밀려옴 */
  siren() { if (!ctx) return; const t = now(); duck(0.4, 2.5);
    for (const d of [0, 1.1]) { [110, 110.9, 165].forEach((f, i) => os({ t: t + d, f0: f, dur: 0.5, a: 0.12, hold: 0.55, peak: i === 2 ? 0.06 : 0.12, wave: 'sawtooth', lp: 900, wet: 0.5, j: 0 })); }
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
  equip() { if (!ctx) return; const t = now(); nz({ t, kind: 'pink', dur: 0.09, ft: 'lowpass', ff: 1200, peak: 0.18 }); clk(t + 0.05, 1500, 0.16); fol('cloth', t, 0.09, { cut: 0.6 }); fol('latch', t + 0.04, 0.07); mar(t + 0.08, MIDI(76), 0.06, 0.25); },
  /* 폭발: 깊은 저음 + 갈라지는 소리 + 방 울림 / 폭풍 번개면 천둥 */
  boom(pan = 0) { if (!ctx) return; const t = now(), r = R(); if (r?.C?.rain && r.flash >= 0.2) return thunder(t);
    duck(0.45, 1.4); nz({ t, dur: 0.02, ft: 'highpass', ff: 1500, peak: 0.5, pan });
    nz({ t, kind: 'brown', dur: 1.3, ft: 'lowpass', ff: 1400, ff1: 140, peak: 1.0, pan, wet: 0.35 }); os({ t, f0: 75, f1: 28, dur: 0.8, peak: 0.9, pan, sat: 1 }); nz({ t, kind: 'pink', dur: 0.25, ft: 'bandpass', ff: 1600, ff1: 500, q: 0.6, peak: 0.4, pan });
    for (let i = 0; i < 6; i++) clk(t + 0.15 + i * rnd(0.05, 0.12), rnd(900, 2200), rnd(0.03, 0.06), pan + rnd(-0.4, 0.4)); /* 떨어지는 잔해 */ },
  thunder() { if (!ctx) return; thunder(now()); },
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
    if (kind === 'smelter') { /* 용광로 풀무: 낮은 숨 들이켬 → 쇠 신음 · 증기 */ nz({ t, kind: 'brown', dur: 1.4, a: 0.35, ft: 'lowpass', ff: 220, ff1: 700, peak: 0.8, pan, wet: 0.3 }); os({ t: t + 0.2, f0: 70, f1: 52, dur: 1.2, a: 0.2, peak: 0.35, wave: 'sawtooth', lp: 500, sat: 1, pan, wet: 0.3 }); metal(t + 0.3, 210, 1.3, 0.07, pan, 0.45, 0.6); nz({ t: t + 0.5, kind: 'white', dur: 0.9, a: 0.05, ft: 'bandpass', ff: 4500, ff1: 2500, q: 0.8, peak: 0.12, pan, wet: 0.3 }); return; }
    if (kind === 'eel') { nz({ t, kind: 'pink', dur: 1.1, a: 0.15, ft: 'bandpass', ff: 3000, ff1: 700, q: 3, peak: 0.25, pan, wet: 0.4 }); nz({ t, kind: 'brown', dur: 1.3, ft: 'lowpass', ff: 400, peak: 0.7, pan });
      for (let i = 0; i < 6; i++) nz({ t: t + 0.2 + i * rnd(0.05, 0.12), dur: 0.02, ft: 'highpass', ff: 3000, peak: 0.12, pan }); return; }
    [55, 82.5, 110.6].forEach((f, i) => os({ t, f0: f, f1: f * 0.85, dur: 1.3, a: 0.2, peak: [0.35, 0.18, 0.12][i], wave: 'sawtooth', lp: 700, sat: 1, pan, wet: 0.35 }));
    nz({ t, kind: 'brown', dur: 1.3, ft: 'lowpass', ff: 320, peak: 0.6, pan }); metal(t + 0.15, 180, 1.2, 0.08, pan, 0.4, 0.6); },
  slam(pan = 0) { if (!ctx) return; const t = now(); duck(0.4, 0.9); os({ t, f0: 62, f1: 26, dur: 0.55, peak: 1.0, pan, sat: 1 }); nz({ t, kind: 'brown', dur: 0.6, ft: 'lowpass', ff: 600, ff1: 150, peak: 0.85, pan, wet: 0.3 });
    nz({ t: t + 0.02, kind: 'pink', dur: 0.3, ft: 'bandpass', ff: 1000, ff1: 500, q: 0.8, peak: 0.25, pan }); for (let i = 0; i < 5; i++) clk(t + 0.08 + i * rnd(0.04, 0.09), rnd(900, 1800), 0.05, pan); },
  /* 검수 M4 Top 10: 새 적 5 전용 예고음 — 겨냥 줄 · 무장 원 · 앞 원이 뜨는 그 순간 (판 안 거리로 작아짐 · 좌우 팬)
     기뢰 = 짧게 올라가는 두 번 삑 + 빨라지는 딸깍 · 소라게 = 집게 쇠 딸깍 둘 + 껍데기 긁힘 · 문어 = 축축한 빨판 '쩝' + 먹물 '푸슉'
     저격수 = 렌즈 겨눔 '이잉'(올라가는 가는 사인 · 0.8초 따라옴 → 0.5초 멈춤 = 고정 '틱') · 신호수 = 신호탄 심지 치익 + 위로 솟는 휘파람 */
  foeWarn(e, kind) { if (!ctx) return; kind ||= e?.kind; const r = R(), t = now(); let pan = 0, v = 1;
    if (e?.pos && r?.pl) { const dx = e.pos.x - r.pl.pos.x, dz = e.pos.z - r.pl.pos.z; pan = cl(dx / 12); v = Math.max(0.35, Math.min(1, 14 / (Math.hypot(dx, dz) + 6))); }
    if (kind === 'mine') { for (let i = 0; i < 2; i++) os({ t: t + i * 0.13, f0: 1650 + i * 450, f1: 2100 + i * 500, glide: 0.06, dur: 0.07, peak: 0.07 * v, wave: 'square', lp: 4200, pan, j: 0 });
      for (let i = 0; i < 5; i++) clk(t + 0.3 + i * (0.16 - i * 0.022), 3200, 0.05 * v, pan); return; }
    if (kind === 'hermit') { metal(t, rnd(1300, 1500), 0.08, 0.06 * v, pan, 0.1, 0.5); metal(t + 0.09, rnd(1600, 1800), 0.07, 0.05 * v, pan, 0.1, 0.5);
      nz({ t: t + 0.12, kind: 'pink', dur: 0.35, a: 0.12, ft: 'bandpass', ff: 700, ff1: 1500, q: 2.5, peak: 0.12 * v, pan, wet: 0.15 }); fol('latch', t + 0.02, 0.05 * v, { rate: 0.7, pan }); return; }
    if (kind === 'octo') { for (let i = 0; i < 3; i++) { const u = t + i * 0.07; nz({ t: u, kind: 'pink', dur: 0.06, ft: 'lowpass', ff: 900, ff1: 300, peak: 0.16 * v, pan }); plip(u + 0.01, rnd(260, 360), 0.05 * v, pan, 0.2); }
      os({ t, f0: 180, f1: 95, dur: 0.4, a: 0.05, peak: 0.08 * v, wave: 'triangle', lp: 500, pan }); return; }
    if (kind === 'ink') { nz({ t, kind: 'pink', dur: 0.5, a: 0.01, ft: 'lowpass', ff: 1400, ff1: 250, peak: 0.3 * v, pan, wet: 0.25 }); nz({ t, kind: 'brown', dur: 0.6, ft: 'lowpass', ff: 300, peak: 0.35 * v, pan });
      for (let i = 0; i < 6; i++) plip(t + 0.05 + i * rnd(0.04, 0.08), rnd(220, 420), 0.04 * v, pan + rnd(-0.2, 0.2), 0.3); return; }
    if (kind === 'sniper') { const o = { t, f0: 1400, f1: 2600, glide: 0.8, dur: 0.06, a: 0.02, hold: 0.78, peak: 0.035 * v, wave: 'sine', pan, wet: 0.2, j: 0 }; os(o); os({ ...o, f0: 1408, f1: 2615, peak: 0.02 * v });
      clk(t + 0.8, 4200, 0.09 * v, pan); os({ t: t + 0.8, f0: 2600, dur: 0.45, a: 0.005, peak: 0.03 * v, wave: 'triangle', lp: 5000, pan, j: 0 }); return; }
    if (kind === 'signal') { nz({ t, kind: 'white', dur: 0.9, a: 0.05, ft: 'bandpass', ff: 3800, ff1: 5200, q: 1.2, peak: 0.07 * v, pan, wet: 0.15 });
      for (let i = 0; i < 8; i++) clk(t + i * rnd(0.06, 0.11), rnd(2600, 4200), 0.025 * v, pan);
      os({ t: t + 0.55, f0: 900, f1: 2800, glide: 0.55, dur: 0.12, a: 0.05, hold: 0.4, peak: 0.05 * v, wave: 'triangle', lp: 4500, pan, wet: 0.3, j: 0 }); return; }
  },
  /* 검은 닻 두목: 등장 = 쇠 호루라기 두 번(삐-익 · 삐익) + 낮은 뱃고동 / 패턴 예고 = 닻 던지기 사슬 풀림 · 내려찍기 숨 + 쇠 신음 · 수류탄 셋 핀 딸깍 셋 · 호루라기 */
  chiefHorn() { if (!ctx) return; const t = now(); duck(0.4, 2.4); whistle(t, 0.9); whistle(t + 0.42, 0.5, 1.06);
    for (const det of [-7, 7]) os({ t: t + 0.15, f0: 73.4, dur: 0.4, a: 0.25, hold: 0.9, peak: 0.14, wave: 'sawtooth', lp: 420, det, wet: 0.5, j: 0 }); metal(t + 0.2, 330, 1.2, 0.05, 0, 0.4, 0.4); },
  chiefWarn(pat, d = 0.9) { if (!ctx) return; const t = now(); d = Math.max(0.35, Math.min(1.6, d));
    if (pat === 'throw') { for (let i = 0; i < 9; i++) metal(t + i * d / 10, rnd(700, 900), 0.05, 0.04 + i * 0.006, 0, 0.1, 0.4); nz({ t, dur: d, a: d * 0.7, ft: 'bandpass', ff: 400, ff1: 1400, q: 1.5, peak: 0.07 }); return; }
    if (pat === 'slam') { nz({ t, kind: 'brown', dur: 0.2, a: d * 0.85, ft: 'lowpass', ff: 250, ff1: 900, peak: 0.45 }); os({ t, f0: 65, f1: 110, dur: 0.15, a: d * 0.85, peak: 0.22, wave: 'sawtooth', lp: 450, sat: 1, j: 0 }); metal(t + 0.05, 260, d, 0.05, 0, 0.3, 0.4); return; }
    if (pat === 'volley') { for (let i = 0; i < 3; i++) { clk(t + i * 0.14, 2800, 0.12); metal(t + i * 0.14 + 0.02, 3400, 0.05, 0.02, (i - 1) * 0.3, 0.05, 0.6); } return; }
    if (pat === 'whistle') { whistle(t, 0.7); whistle(t + 0.3, 0.7, 1.06); whistle(t + 0.6, 0.6); return; }
    os({ t, f0: MIDI(57), dur: 0.35, a: 0.01, peak: 0.1, wave: 'triangle', lp: 1400, j: 0 }); },
  /* 사건 알림(낮은 두 음 '봉-봉') — 보스가 패턴을 예고하는 중이면 보스 예고음으로 */
  warn() { if (!ctx) return; const b = R()?.boss; if (b && !b.dead && b.wind > 0 && b.wind === b.windMax) return bossWarn(b.kind, b.pat, b.windMax);
    const t = now(); [0, 0.2].forEach((d, i) => { os({ t: t + d, f0: MIDI(i ? 64 : 69), dur: 0.35, a: 0.01, peak: 0.12, wave: 'triangle', lp: 1400, j: 0 }); os({ t: t + d, f0: MIDI(i ? 52 : 57), dur: 0.35, a: 0.01, peak: 0.08, wave: 'sine', j: 0 }); }); },
  bossWarn(kind = 'boss', pat, d) { if (!ctx) return; bossWarn(kind, pat, d); },
  /* 공사 · 만들기: 망치 · 톱니 + 끝 화음 */
  build() { if (!ctx) return; const t = now(); for (let i = 0; i < 3; i++) { const u = t + i * rnd(0.12, 0.14); thud(u, 180, 0.06, 0.2); metal(u, rnd(800, 950), 0.12, 0.05, 0, 0.1, 0.5); }
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
/* 변주 씌우기: 부를 때마다 EV 를 새로 굴림. 음악 같은 소리(화음 · 마림바)는 높이 고정 · 필터만 조금 */
const VOICE = /^(talk|radio|mong|page)$/; /* M6-C 소리 크기 '무전 목소리' 줄 */
const TUNED = /^(chiefHorn|chiefWarn|pick|rare|extract|die|ui|tab|coin|equip|power|build|talk|cut|memory|memo|windowLight|window|bond|chapter|lamp|quest|warn|bossWarn|tape|radio|mong|siren|alert)$/;
/* 소리마다 음량 손질 (효과음 버스를 사격 · 타격에 맞춰 올렸으므로 큰 사건 · 화음 소리는 덜어 리미터가 덜 일하게 — 5장 측정) */
/* M6-D 라운드니스 측정(tools/m6d_loudness.mjs · docs/m6d_loudness.json)으로 맞춤: 기준 = 발사음 순간 최댓값 중앙값 R.
   큰 사건(천둥 · 포효 · 두목 뱃고동 · 폭발 · 내려찍기)이 R 보다 +9~11 LU 로 폰에서 깜짝 놀랄 만큼 컸음 → +6 안으로 · 물대포 −10 → −5 안으로 · 무거운 발사(닻 · 저격 · 불꽃) 조금 내림 */
const GUNV = { hose: 2.5, anchor: 0.28, longshot: 0.55, flare: 0.42, harpoon: 0.75 };
const GAIN = { chiefHorn: 0.2, chiefWarn: 0.6, foeWarn: 0.8, boom: 0.1, thunder: 0.09, roar: 0.13, slam: 0.15, gate: 0.5, siren: 0.36, bossWarn: 0.4, warn: 0.55, die: 0.45, extract: 0.4, power: 0.55, cut: 0.38, chapter: 0.55, memory: 0.55, memo: 0.55,
  windowLight: 0.6, window: 0.6, bond: 0.6, rare: 0.55, build: 0.55, reload: 0.55, pick: 0.6, lamp: 0.6, quest: 0.6, mong: 0.5, kill: 0.7, hurt: 0.8, puff: 0.6, pour: 0.75, beacon: 0.6, glass: 0.75, steam: 0.75, coin: 0.7, equip: 0.7, tape: 0.7, radio: 0.8, shell: 0.35, empty: 0.6, page: 0.7, swing: 0.7, swingW: 0.55, net: 0.7, clank: 0.6, whoosh: 0.7, pop: 0.55, roll: 0.7, rotate: 0.6, zap: 0.8, fizz: 0.7, bubble: 0.7 };
for (const k of Object.keys(sfx)) { const fn = sfx[k], tuned = TUNED.test(k), g = GAIN[k] || 1;
  const vb = VOICE.test(k); /* M6-C: 무전 · 말소리 · 몽이 소리는 목소리 버스로 */
  sfx[k] = function (...a) { if (!ctx) return; const prev = EV, pb = CUR_BUS; EV = tuned ? { p: 1, f: rnd(0.95, 1.05), a: 0.05, j: 0, g } : { p: rnd(0.965, 1.035), f: rnd(0.88, 1.12), a: 0.1, j: 0.002, g }; if (vb) CUR_BUS = vocBus; try { return fn.apply(this, a); } finally { EV = prev; CUR_BUS = pb; } }; }

/* 지도 환경음 (판 중에만 · 배경음을 꺼도 남음) — assets/audio/env.js 를 판 시작 때 늦게 받음 · 구역 · 날씨 · 정전 · 급류 · 침수 따라 바뀜 */
function loadEnv() { if (envLoad || !ctx) return envLoad; envLoad = import('../assets/audio/env.js?v=0.99.38').then(m => (env = m.createEnv({ ctx, out: ambBus, rev: revIn, noise: noiseBuf }))).catch(e => { console.warn('환경음', e); envLoad = null; }); return envLoad; }
const envState = r => ({ map: r?.map || 'ware', zone: r?.zone || 1, cond: r?.cond || 'normal', wx: r?.wx || 'none', /* M4-B 판 상태 → 날씨 소리 */ dark: (r?.dark || 0) > 0 || (r?.douse || 0) > 0, surge: (r?.surge || 0) > 0, flood: !!r?.events?.flood });
export function ambience(on) {
  ambOn = !!on; if (!ctx) return; /* 소리가 아직 안 풀렸으면 기억만 → 첫 탭 뒤 tick 이 받음 */
  if (on) loadEnv(); else if (env) env.stop(ctx.currentTime);
}
/* 큰 소리 동안 배경음 잠깐 낮춤 */
function duck(to, dur) { if (!musBus || !SET.music) return; const g = musBus.gain, t = ctx.currentTime + T0, m = MUS * SET.bus.mus; g.cancelScheduledValues(t); g.setTargetAtTime(m * to, t, 0.03); g.setTargetAtTime(m, t + dur * 0.4, dur * 0.3); }

/* ───── 배경음 (적응형) ─────
   장면: 은신처(처음 · 하루 끝) · 침수 창고 · 밤의 항구 · 해저 터널 · 보스전(지도 색)
   긴장 단계: 0 평소 → 1 적 발견(쫓는 적이 있음 · 4초 여운) → 2 탈출 카운트다운(물 차기 1분 전) */
let seenRaid = false, chaseT = 0;
function loadMusic() { if (musLoad || !ctx || !SET.music) return musLoad; musLoad = import('../assets/audio/music.js?v=0.99.38').then(m => { mus = m.createMusic({ ctx, out: musBus, rev: revIn, noise: noiseBuf }); return mus; }).catch(e => { console.warn('배경음', e); musLoad = null; }); return musLoad; }
/* M5-A 이야기 장면 배경음 덮어쓰기 (엔딩 · 크레딧 = 'ending') — null 이면 평소대로 */
let scoreOv = null; export function setScore(id) { scoreOv = id || null; }
function scene() {
  if (scoreOv) return { id: scoreOv, lv: 0 };
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
  if (r.map === 'gate' && b && !b.dead && b.__mus) return { id: 'final', lv: Math.min(2, r.gatePhase || 0) }; /* M5-A 최종 보스 파수 — 단계마다 층 */
  if (b && !b.dead && b.__mus) return { id: 'boss', color, lv };
  /* 검수 M4 Top 10: 떠돌이 두목과 붙으면 결전곡 '두목 색'(뱃고동 · 사슬 · 금관) — 지도 보스전이 먼저 */
  const c = r.chief; if (c && !c.dead && (c.state === 'chase' || c.hp < c.maxHp)) return { id: 'boss', color: 'chief', lv };
  return { id: color, lv };
}
function tick() {
  if (!ctx || ctx.state !== 'running') return;
  const r = R(), inRaid = !!(r && r.alive);
  room(inRaid ? (r.map || 'ware') : 'hideout');
  if (ambOn && inRaid) { if (!env) loadEnv(); else { env.set(envState(r), ctx.currentTime); env.pump(ctx.currentTime + 0.7); } }
  musicTick();
}
function musicTick() {
  if (!SET.music || SET.muted) { if (mus) mus.set(null); return; }
  if (!mus) { loadMusic(); return; }
  const s = scene(); mus.set(s.id, s.lv, s.color); mus.pump(ctx.currentTime + 0.7);
}
/* 시험 · 렌더 도구용 (docs/audio_preview/render.mjs) */
export const __audio = { get ctx() { return ctx; }, set at(s) { T0 = s; }, music: () => loadMusic() || Promise.resolve(mus), env: () => loadEnv() || Promise.resolve(env), room: (k, at, inst) => room(k, at, inst), scene, set: SET, get roomNow() { return roomNow; }, foley: () => loadFoley() || Promise.resolve(foleyBuf), get foleyOk() { return !!foleyBuf; } };
