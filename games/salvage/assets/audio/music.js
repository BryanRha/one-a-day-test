// 수달 인양단 배경음 5곡 — 직접 작곡 · 전부 Web Audio 합성 (소리 파일 0개)
//  audio.js 가 첫 탭 1초 뒤 늦게 받아서 씀 (첫 진입 용량 X) · 오프라인 렌더(미리듣기 · 측정)도 같은 코드
//  곡: hideout 등불 초소(D장조 70) · dusk 하루 끝(같은 곡 변주 60) · ware 잠긴 창고(D단조 84) · harbor 등대가 꺼진 밤(E단조 76)
//      tunnel 물 밑 선로(C단조 90) · factory 불을 만든 곳(G단조 96 · M3-B) · lab 파수의 목소리(E단조 72 · M4-B) · boss 인양단의 결전(A단조 128 · 지도 색 ware/harbor/tunnel/factory)
//      final 대수문의 결전(D단조 136 · M5-A 최종 보스 · 단계마다 층) · ending 불이 켜진 곳(D장조 66 · M5-A 엔딩 · 크레딧)
//  층: 0 평소 · 1 적 발견 · 2 탈출 카운트다운 — 같은 박자 격자 위에서 층이 더해짐 (곡은 끊기지 않음)
const MIDI = m => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);

export function createMusic({ ctx, out, rev, noise }) {
  const c = ctx, OFF = typeof OfflineAudioContext !== 'undefined' && c instanceof OfflineAudioContext;
  /* ───── 악기 ───── */
  const env = (g, t, a, pk, d, hold = 0) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(pk, t + a); if (hold) g.gain.setValueAtTime(pk, t + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + d); return t + a + hold + d + 0.05; };
  const wetTo = (n, w) => { if (w && rev) { const s = c.createGain(); s.gain.value = w; n.connect(s); s.connect(rev); } };
  const lp = (f, q = 0.5) => { const x = c.createBiquadFilter(); x.type = 'lowpass'; x.frequency.value = f; x.Q.value = q; return x; };
  function osc(d, t, f, type, a, pk, dur, o = {}) {
    const s = c.createOscillator(); if (type === 'piano') s.setPeriodicWave(PW); else s.type = type; s.frequency.setValueAtTime(f, t); if (o.f1) s.frequency.exponentialRampToValueAtTime(o.f1, t + (o.glide || dur)); if (o.det) s.detune.value = o.det;
    let n = s; if (o.cut) { const f2 = lp(o.cut, o.q); if (o.cut1) f2.frequency.exponentialRampToValueAtTime(o.cut1, t + (o.cdur || a + dur)); n.connect(f2); n = f2; }
    const g = c.createGain(); const end = env(g, t, a, pk, dur, o.hold); n.connect(g); g.connect(d); wetTo(g, o.wet); s.start(t); s.stop(end); return s;
  }
  function nz(d, t, kind, ft, f, q, a, pk, dur, o = {}) {
    const s = c.createBufferSource(); s.buffer = noise[kind]; s.loop = true; const fl = c.createBiquadFilter(); fl.type = ft; fl.frequency.setValueAtTime(f, t); if (o.f1) fl.frequency.exponentialRampToValueAtTime(o.f1, t + a + dur); fl.Q.value = q;
    const g = c.createGain(); const end = env(g, t, a, pk, dur, o.hold); s.connect(fl); fl.connect(g); g.connect(d); wetTo(g, o.wet); s.start(t, Math.random() * 1.5); s.stop(end);
  }
  /* 피아노: 배음 파형 + 닫히는 필터 + 해머 잡음 (낮은 음일수록 길게 울림) */
  const PW = c.createPeriodicWave(new Float32Array(10), new Float32Array([0, 1, 0.45, 0.25, 0.16, 0.09, 0.05, 0.035, 0.02, 0.012]));
  function piano(d, t, m, v, len) {
    const f = MIDI(m); len = len || 1.4 + Math.max(0, 86 - m) * 0.05;
    const s = c.createOscillator(); s.setPeriodicWave(PW); s.frequency.value = f; const s2 = c.createOscillator(); s2.frequency.value = f * 2.003;
    const fl = lp(Math.min(9000, 700 + v * 4200), 0.3); fl.frequency.setTargetAtTime(Math.max(300, f * 1.6), t + 0.02, len * 0.25);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.22, t + 0.004); g.gain.setTargetAtTime(v * 0.1, t + 0.004, 0.09); g.gain.setTargetAtTime(0.0001, t + 0.2, len * 0.3);
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.0001, t); g2.gain.linearRampToValueAtTime(v * 0.025, t + 0.004); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    s.connect(fl); s2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(d); wetTo(g, 0.35); s.start(t); s2.start(t); s.stop(t + len * 1.6 + 0.3); s2.stop(t + 0.8);
    nz(d, t, 'pink', 'lowpass', 2200, 0.5, 0.001, v * 0.02, 0.02);
  }
  /* 기타 뜯기: 카플러스-스트롱 (음마다 한 번 만들어 둠 → 그다음은 버퍼 재생) */
  const KS = new Map();
  function ksBuf(m) {
    if (KS.has(m)) return KS.get(m); const sr = c.sampleRate, f = MIDI(m), N = Math.max(2, Math.round(sr / f - 0.5)), len = Math.round(sr * 2.4);
    const b = c.createBuffer(1, len, sr), y = b.getChannelData(0); let l = 0;
    for (let i = 0; i < N; i++) { l += (Math.random() * 2 - 1 - l) * 0.35; y[i] = l * 1.3; }
    const damp = 0.4985 - Math.max(0, m - 60) * 0.00009;
    for (let i = N; i < len; i++) y[i] = damp * (y[i - N] + y[i - N - 1 < 0 ? 0 : i - N - 1]);
    const r = { b, rate: f / (sr / (N + 0.5)) }; KS.set(m, r); return r;
  }
  function pluck(d, t, m, v, o = {}) {
    const k = ksBuf(m), s = c.createBufferSource(); s.buffer = k.b; s.playbackRate.value = k.rate;
    const body = c.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 210; body.Q.value = 1.2; body.gain.value = 5; const fl = lp(o.cut || 2400, 0.4);
    const g = c.createGain(); g.gain.setValueAtTime(v * 0.5, t); g.gain.setTargetAtTime(0.0001, t + (o.ring || 1.6), 0.25);
    s.connect(body); body.connect(fl); fl.connect(g); g.connect(d); wetTo(g, o.wet ?? 0.2); s.start(t); s.stop(t + 2.4);
  }
  /* 패드(현 · 오르간 섞음): 톱니 둘 살짝 어긋나게 → 낮은 통과 · 느린 어택 */
  function pad(d, t, ms, dur, v, cut = 900, o = {}) {
    const fl = lp(cut, 0.6); const g = c.createGain(); const a = Math.min(1.4, dur * 0.35); env(g, t, a, v, dur * 0.75, dur * 0.1); fl.connect(g); g.connect(d); wetTo(g, o.wet ?? 0.3);
    for (const m of ms) for (const det of [-7, 7]) { const s = c.createOscillator(); s.type = o.wave || 'sawtooth'; s.frequency.value = MIDI(m); s.detune.value = det; s.connect(fl); s.start(t); s.stop(t + a + dur + 0.2); }
  }
  function bass(d, t, m, dur, v, cut = 420) { osc(d, t, MIDI(m), 'triangle', 0.006, v, dur, { cut: cut * 2.2, cut1: cut, cdur: 0.12 }); osc(d, t, MIDI(m), 'sine', 0.006, v * 0.7, dur); }
  /* 종(비조화 배음) — 부표 종 · 수중 종 */
  function bell(d, t, m, v, dur = 3, w = 0.45) { const f = MIDI(m); [[1, 1, 1], [2.0, 0.5, 0.75], [2.4, 0.35, 0.6], [3.0, 0.22, 0.45], [4.07, 0.16, 0.3], [5.4, 0.08, 0.2]].forEach(([r, a, dd], i) => osc(d, t, f * r, 'sine', 0.002, v * a, dur * dd, { wet: w, det: i === 1 ? 3 : 0 })); }
  /* 나무 피리(휘파람): 사인 + 숨결 + 늦게 들어오는 떨림 */
  function flute(d, t, m, dur, v) {
    const f = MIDI(m), s = c.createOscillator(); s.frequency.value = f; const lfo = c.createOscillator(); lfo.frequency.value = 5.2; const lg = c.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.5, dur)); lfo.connect(lg); lg.connect(s.frequency);
    const s2 = c.createOscillator(); s2.type = 'triangle'; s2.frequency.value = f; const g2 = c.createGain(); g2.gain.value = 0.25; s2.connect(g2);
    const g = c.createGain(); const end = env(g, t, 0.09, v, Math.max(0.2, dur * 0.5), dur * 0.5); s.connect(g); g2.connect(g); g.connect(d); wetTo(g, 0.45); for (const o of [s, s2, lfo]) { o.start(t); o.stop(end); }
    nz(d, t, 'pink', 'bandpass', f * 2, 2, 0.06, v * 0.08, dur * 0.8);
  }
  /* 앞소리(보스): 톱니 둘 + 한 옥타브 아래 사각 → 열렸다 닫히는 필터 */
  function lead(d, t, m, dur, v) { const f = MIDI(m), fl = lp(700, 2); fl.frequency.setValueAtTime(700, t); fl.frequency.linearRampToValueAtTime(2600, t + 0.05); fl.frequency.setTargetAtTime(1300, t + 0.06, 0.15);
    const g = c.createGain(); const end = env(g, t, 0.01, v, Math.max(0.12, dur * 0.4), dur * 0.6); fl.connect(g); g.connect(d); wetTo(g, 0.22);
    [['sawtooth', 1, -8], ['sawtooth', 1, 8], ['square', 0.5, 0]].forEach(([w, r, det]) => { const s = c.createOscillator(); s.type = w; s.frequency.value = f * r; s.detune.value = det; const gg = c.createGain(); gg.gain.value = w === 'square' ? 0.35 : 0.5; s.connect(gg); gg.connect(fl); s.start(t); s.stop(end); }); }
  function stab(d, t, ms, v) { const fl = lp(400, 1.5); fl.frequency.setValueAtTime(400, t); fl.frequency.linearRampToValueAtTime(2400, t + 0.03); fl.frequency.setTargetAtTime(600, t + 0.04, 0.08);
    const g = c.createGain(); const end = env(g, t, 0.006, v, 0.28); fl.connect(g); g.connect(d); wetTo(g, 0.25); for (const m of ms) for (const det of [-9, 9]) { const s = c.createOscillator(); s.type = 'sawtooth'; s.frequency.value = MIDI(m); s.detune.value = det; s.connect(fl); s.start(t); s.stop(end); } }
  function arp(d, t, m, v, cut) { osc(d, t, MIDI(m), 'square', 0.003, v, 0.16, { cut: cut, cut1: cut * 0.25, cdur: 0.12, q: 4 }); }
  /* 타악 */
  function kick(d, t, v) { osc(d, t, 125, 'sine', 0.002, v, 0.24, { f1: 40, glide: 0.12 }); nz(d, t, 'white', 'bandpass', 1800, 1, 0.001, v * 0.08, 0.012); }
  function snare(d, t, v) { nz(d, t, 'white', 'bandpass', 1900, 0.7, 0.001, v * 0.7, 0.13, { wet: 0.2 }); osc(d, t, 200, 'triangle', 0.001, v * 0.5, 0.08, { f1: 160 }); }
  function hat(d, t, v, open) { nz(d, t, 'white', 'bandpass', 7800, 1.2, 0.001, v, open ? 0.14 : 0.035); }
  function tom(d, t, f, v, dur = 0.35) { osc(d, t, f, 'sine', 0.002, v, dur, { f1: f * 0.62, glide: dur }); nz(d, t, 'pink', 'lowpass', f * 6, 0.5, 0.001, v * 0.35, dur * 0.4, { wet: 0.25 }); }
  function clank(d, t, f, v, dur = 0.25, w = 0.3) { [[1, 1, 1], [2.76, 0.5, 0.6], [5.4, 0.22, 0.35]].forEach(([r, a, dd]) => osc(d, t, f * r, 'sine', 0.001, v * a, dur * dd, { wet: w })); nz(d, t, 'pink', 'bandpass', f * 3, 2, 0.001, v * 0.4, 0.02); }
  function drip(d, t, m, v) { const f = MIDI(m); osc(d, t, f, 'sine', 0.001, v, 0.07, { f1: f * 1.8, glide: 0.04, wet: 0.6 }); }
  function heart(d, t, v) { osc(d, t, 62, 'sine', 0.004, v, 0.16, { f1: 42 }); osc(d, t + 0.27, 58, 'sine', 0.004, v * 0.65, 0.16, { f1: 40 }); }
  function zap(d, t, v) { for (let i = 0; i < 4; i++) nz(d, t + i * rnd(0.01, 0.04), 'white', 'bandpass', rnd(2500, 5000), 3, 0.001, v * rnd(0.4, 1), 0.012); osc(d, t, 100, 'sawtooth', 0.002, v * 0.5, 0.12, { cut: 900 }); }
  function creak(d, t, v) { nz(d, t, 'pink', 'bandpass', rnd(260, 340), 14, 0.15, v, 0.7, { f1: rnd(380, 460), wet: 0.4 }); }
  /* M3-B 공장: 먼 기계 박동(낮은 쇠 '쿵') · 증기 쉬익 · 낮은 금관 찌르기 */
  function forge(d, t, v) { osc(d, t, 72, 'sine', 0.003, v, 0.42, { f1: 36, glide: 0.3 }); [[110, 0.5, 1.2], [247, 0.22, 0.9], [413, 0.1, 0.6]].forEach(([f, a, dd]) => osc(d, t + 0.01, f, 'sine', 0.002, v * a * 0.35, dd, { wet: 0.55 })); nz(d, t, 'brown', 'lowpass', 500, 0.6, 0.002, v * 0.5, 0.18, { wet: 0.3 }); }
  function hiss(d, t, v) { nz(d, t, 'white', 'bandpass', rnd(3200, 5200), 0.8, rnd(0.04, 0.12), v, rnd(0.5, 1.1), { f1: rnd(1800, 2600), wet: 0.4 }); }
  function brass(d, t, m, v, dur) { const fl = lp(300, 1.2); fl.frequency.setValueAtTime(300, t); fl.frequency.linearRampToValueAtTime(1500, t + 0.08); fl.frequency.setTargetAtTime(500, t + 0.1, dur * 0.4);
    const g = c.createGain(); const end = env(g, t, 0.04, v, dur * 0.6, dur * 0.3); fl.connect(g); g.connect(d); wetTo(g, 0.35); for (const det of [-6, 0, 7]) { const s = c.createOscillator(); s.type = 'sawtooth'; s.frequency.value = MIDI(m); s.detune.value = det; s.connect(fl); s.start(t); s.stop(end); } }
  function horn(d, t, v) { for (const det of [-6, 6]) osc(d, t, 65.4, 'sawtooth', 0.5, v, 1.6, { det, hold: 1.4, cut: 380, wet: 0.6 }); }
  /* 바닥 소리(이어지는 것): 바람 · 물결 · 전기 웅웅 · 깊은 저음 — 곡이 바뀌면 같이 사라짐 */
  function loopSrc(kind, d, t, ft, f, q, v, lfoHz, lfoAmt, gainLfo) {
    const s = c.createBufferSource(); s.buffer = noise[kind]; s.loop = true; const fl = c.createBiquadFilter(); fl.type = ft; fl.frequency.value = f; fl.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.setTargetAtTime(v, t, 1.2); s.connect(fl); fl.connect(g); g.connect(d);
    const l = c.createOscillator(); l.frequency.value = lfoHz; const lg = c.createGain(); lg.gain.value = lfoAmt; l.connect(lg); lg.connect(gainLfo ? g.gain : fl.frequency); s.start(t); l.start(t);
    return { stop(u) { g.gain.setTargetAtTime(0.0001, u, 0.5); s.stop(u + 3); l.stop(u + 3); } };
  }
  function droneSrc(d, t, fs, v, type = 'sine', cut = 0) {
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.setTargetAtTime(v, t, 1.5); let n = g; if (cut) { const f = lp(cut); f.connect(g); n = f; } g.connect(d);
    const os = fs.map((f, i) => { const s = c.createOscillator(); s.type = type; s.frequency.value = f; s.detune.value = i * 4 - 2; s.connect(n); s.start(t); return s; });
    const l = c.createOscillator(); l.frequency.value = 0.09; const lg = c.createGain(); lg.gain.value = v * 0.35; l.connect(lg); lg.connect(g.gain); l.start(t);
    return { stop(u) { g.gain.setTargetAtTime(0.0001, u, 0.5); for (const s of [...os, l]) s.stop(u + 3); } };
  }
  const AMB = {
    sea: (d, t) => loopSrc('brown', d, t, 'lowpass', 520, 0.5, 0.05, 0.13, 0.03, true),
    wind: (d, t) => loopSrc('pink', d, t, 'bandpass', 600, 1.4, 0.02, 0.07, 320),
    hum: (d, t) => droneSrc(d, t, [50, 100.4], 0.018, 'sawtooth', 170),
    deep: (d, t, m = 36) => droneSrc(d, t, [MIDI(m), MIDI(m + 7) * 1.002], 0.05),
  };

  /* ───── 곡 ─────
     beat(x): x = { t 박 시각, b 마디 안 박, bar 마디 번호(되풀이 안), loop 몇 번째 되풀이, ch 화음, spb 한 박 초, L 층 출력[0..2], on 층 켜짐, color } */
  const mel = a => a.map(([p, m, d]) => ({ p, m, d }));
  const hz = t => t + rnd(-0.005, 0.005);
  const SONGS = {
    /* 등불 초소: 어쿠스틱 기타 아르페지오 + 피아노 노래 + 엷은 현 · 물결 / 14마디에 빌린 단조(Gm6)로 쓸쓸하게 → 다시 D */
    hideout: { bpm: 70, bar: 4, gain: 1.0, amb: ['sea'],
      CH: [[50, 57, 61, 66], [47, 57, 62, 66], [43, 59, 62, 66], [45, 57, 62, 64], [42, 57, 61, 66], [43, 55, 59, 66], [40, 55, 59, 62], [45, 55, 59, 64],
        [47, 57, 62, 66], [42, 57, 61, 64], [43, 59, 62, 66], [45, 57, 61, 66], [40, 55, 62, 67], [43, 58, 62, 64], [50, 57, 61, 66], [45, 57, 62, 64]],
      mel: mel([[0, 78, 2], [2, 76, 1], [3, 74, 1], [4, 69, 3], [8, 71, 1], [9, 74, 1], [10, 76, 1], [11, 78, 1], [12, 76, 4],
        [16, 78, 2], [18, 81, 1], [19, 78, 1], [20, 76, 2], [22, 74, 2], [24, 71, 1], [25, 74, 1], [26, 76, 1], [27, 74, 1], [28, 73, 3],
        [32, 74, 1.5], [33.5, 73, 0.5], [34, 71, 2], [36, 73, 2], [38, 69, 2], [40, 71, 1], [41, 74, 1], [42, 79, 2], [44, 78, 4],
        [48, 79, 1.5], [49.5, 78, 0.5], [50, 76, 2], [52, 74, 1], [53, 76, 1], [54, 70, 2], [56, 69, 1], [57, 74, 1], [58, 78, 2], [60, 76, 3]]), melLen: 64,
      lead(x, n, t, dur) { if (x.loop % 2 === 1 && x.bar < 8) return; piano(x.L[0], hz(t), n.m, 0.62 + rnd(-0.06, 0.06), Math.max(1.6, dur * 1.4)); },
      beat(x) { const { t, b, ch, spb, L } = x, P = [0, 1, 2, 3, 2, 1, 2, 3], last = x.bar === 15;
        if (!last || b === 0) for (let k = 0; k < 2; k++) pluck(L[0], hz(t + k * spb * 0.53), ch[P[b * 2 + k]] + (k || b ? 0 : 0), (k ? 0.3 : 0.42) * (b === 0 && !k ? 1.2 : 1), { ring: spb * 3 });
        if (b === 0) { pad(L[0], t, ch.slice(1).map(m => m), spb * 4, 0.012, 1100, { wave: 'triangle' }); bass(L[0], t, ch[0] - 12, spb * 3, 0.1, 260); }
        if (Math.random() < 0.015) creak(L[0], t, 0.012); } },
    /* 하루 끝: 같은 화음을 Bm 에서 시작 · 느리게 · 피아노만 (굴린 화음 + 멜로디 낮게) */
    dusk: { bpm: 60, bar: 4, gain: 2.0, amb: ['sea'],
      CH: [[47, 57, 62, 66], [43, 59, 62, 66], [42, 57, 61, 66], [45, 57, 62, 64], [47, 57, 62, 66], [43, 59, 62, 66], [40, 55, 59, 62], [43, 58, 62, 64]],
      mel: mel([[0, 78, 2], [2, 76, 1], [3, 74, 1], [4, 71, 3], [8, 69, 1], [9, 74, 1], [10, 78, 2], [12, 76, 4],
        [16, 78, 2], [18, 81, 1], [19, 78, 1], [20, 76, 2], [22, 74, 2], [24, 71, 1], [25, 74, 1], [26, 76, 2], [28, 74, 3]]), melLen: 32,
      lead(x, n, t, dur) { if (x.loop % 3 === 2) return; piano(x.L[0], hz(t), n.m - 12, 0.5 + rnd(-0.05, 0.05), Math.max(2, dur * 1.5)); },
      beat(x) { const { t, b, ch, spb, L } = x;
        if (b === 0) { piano(L[0], t, ch[0] - 12, 0.35, 4); ch.slice(1).forEach((m, i) => piano(L[0], t + 0.07 * (i + 1), m - 12, 0.22, 3.5)); }
        if (b === 2) ch.slice(2).forEach((m, i) => piano(L[0], hz(t + i * 0.05), m, 0.12, 2));
        if (x.bar % 4 === 0 && b === 1) bell(L[0], t, 86, 0.006, 3.5, 0.7); } },
    /* 잠긴 창고: 낮은 현 + 음계에 맞춘 물방울 + 피아노 내려가는 세 음 / 1층 맥박 베이스 · 파이프 / 2층 하이햇 · 현 오스티나토 · 북 */
    ware: { bpm: 84, bar: 4, gain: 1.0, amb: ['deep'], deep: 38,
      CH: [[38, 50, 53, 57], [38, 50, 53, 57], [34, 50, 53, 58], [34, 50, 53, 58], [31, 50, 55, 58], [31, 50, 55, 58], [33, 49, 52, 57], [33, 49, 52, 57]],
      beat(x) { const { t, b, ch, spb, L, on } = x;
        if (b === 0 && x.bar % 2 === 0) pad(L[0], t, ch.slice(1), spb * 8, 0.016, 650);
        if (Math.random() < 0.38) drip(L[0], t + rnd(0, spb), [74, 77, 79, 81, 84, 86][Math.floor(Math.random() * 6)], 0.035);
        if (x.bar % 2 === 0) { if (b === 0) piano(L[0], hz(t), ch[3] + 12, 0.42); if (b === 1) piano(L[0], hz(t + spb * 0.5), ch[2] + 12, 0.32); if (b === 3) piano(L[0], hz(t), ch[1] + 12, 0.3); }
        if (Math.random() < 0.03) creak(L[0], t, 0.02);
        if (on[1]) { const r = ch[0] + (ch[0] < 36 ? 12 : 0); for (let k = 0; k < 2; k++) bass(L[1], t + k * spb / 2, r + ((b * 2 + k) % 4 === 2 ? 12 : 0), spb * 0.42, 0.13);
          if (b === 1 || b === 3) clank(L[1], hz(t), 410, 0.03, 0.22); if (b === 0) kick(L[1], t, 0.32); if (b === 2) kick(L[1], t + spb * 0.5, 0.22); }
        if (on[2]) { for (let k = 0; k < 4; k++) hat(L[2], t + k * spb / 4, k % 2 ? 0.012 : 0.022); kick(L[2], t, 0.18);
          const top = ch.slice(1).map(m => m + 12), O = [2, 1, 2, 0]; for (let k = 0; k < 2; k++) osc(L[2], t + k * spb / 2, MIDI(top[O[(b * 2 + k) % 4]]), 'sawtooth', 0.01, 0.022, spb * 0.4, { cut: 2000, det: k ? 6 : -6 });
          if (x.bar % 2 === 1 && b === 3) for (let k = 0; k < 4; k++) tom(L[2], t + k * spb / 4, 150 - k * 18, 0.12, 0.2); } } },
    /* 등대가 꺼진 밤: 바람 + 흔들리는 부표 종 + 낮은 맥박 + 먼 뱃고동 + 나무 피리(되풀이 둘째마다) / 1층 베이스 · 프레임 북 / 2층 큰북 · 떨리는 현 · 빨라지는 맥박 */
    harbor: { bpm: 76, bar: 4, gain: 1.75, amb: [], /* 바람 · 물결은 판 환경음(env.js)이 냄 */
      CH: [[40, 52, 55, 59], [40, 52, 55, 59], [36, 52, 55, 60], [36, 52, 55, 60], [33, 52, 57, 60], [33, 52, 57, 60], [35, 51, 54, 59], [35, 51, 54, 59]],
      mel: mel([[0, 71, 2], [2, 67, 2], [4, 64, 3], [8, 76, 3], [11, 74, 1], [12, 72, 4], [16, 72, 2], [18, 71, 2], [20, 69, 3], [24, 66, 2], [26, 71, 2], [28, 71, 3]]), melLen: 32,
      lead(x, n, t, dur) { if (x.loop % 2 === 0) return; flute(x.L[0], hz(t), n.m, dur * 0.95, 0.05); },
      beat(x) { const { t, b, ch, spb, L, on } = x;
        if (b === 0 && x.bar % 2 === 0) { bell(L[0], t + rnd(0, 0.06), ch[3] + 12, 0.04, 4); pad(L[0], t, [ch[0] + 12, ch[2]], spb * 8, 0.012, 500); }
        if (b === 2 && x.bar % 2 === 0) bell(L[0], t + rnd(0.05, 0.15), ch[2] + 12, 0.024, 3);
        if (b === 0 || b === 2) heart(L[0], t, 0.3);
        if (x.bar === 0 && b === 1 && x.loop % 2 === 0) horn(L[0], t, 0.03);
        if (on[1]) { [0, 0.75, 1.5].forEach(o => { if (b === 0 || b === 2) bass(L[1], t + o * spb, ch[0] + (ch[0] < 38 ? 12 : 0), spb * 0.6, 0.12); }); if (b === 0 || b === 2) tom(L[1], t, 105, 0.16, 0.4); if (b === 1 || b === 3) tom(L[1], t + spb * 0.5, 140, 0.06, 0.2); }
        if (on[2]) { for (let k = 0; k < 2; k++) tom(L[2], t + k * spb / 2, 70, k ? 0.1 : 0.2, 0.45); if (b === 1 || b === 3) heart(L[2], t, 0.18);
          for (let k = 0; k < 4; k++) osc(L[2], t + k * spb / 4, MIDI(ch[2 + (k % 2)] + 12), 'sawtooth', 0.01, 0.014, spb * 0.2, { cut: 1800 }); } } },
    /* 물 밑 선로: 깊은 저음 + 전기 웅웅 · 지지직 + 소나 핑 + 수압 삐걱 / 1층 아르페지오 · 쇠 / 2층 킥 · 박수 · 반음 경보 · 필터 열림 */
    tunnel: { bpm: 90, bar: 4, gain: 1.0, amb: ['deep'], deep: 36, /* 전기 웅웅은 환경음 */
      CH: [[36, 48, 51, 55], [36, 48, 51, 55], [32, 48, 51, 56], [32, 48, 51, 56], [29, 48, 53, 56], [29, 48, 53, 56], [31, 47, 50, 55], [31, 47, 50, 55]],
      beat(x) { const { t, b, ch, spb, L, on } = x;
        if (b === 0 && x.bar % 2 === 0) { pad(L[0], t, ch.slice(1), spb * 8, 0.014, 480); osc(L[0], t, MIDI(88), 'sine', 0.003, 0.03, 1.6, { wet: 0.9 }); }
        if (Math.random() < 0.06) zap(L[0], t + rnd(0, spb), 0.03); if (Math.random() < 0.05) creak(L[0], t, 0.025);
        if (on[1]) { const A = [ch[0] + 12, ch[1], ch[2], ch[3], ch[2], ch[1], ch[0] + 24, ch[2]]; for (let k = 0; k < 4; k++) arp(L[1], t + k * spb / 4, A[(b * 4 + k) % 8], 0.045, on[2] ? 2600 : 1300);
          clank(L[1], t + spb * 0.5, 560, 0.022, 0.18); }
        if (on[2]) { kick(L[2], t, 0.3); if (b === 1 || b === 3) snare(L[2], t, 0.12); if (b === 0) for (const m of [79, 80]) osc(L[2], t, MIDI(m), 'sawtooth', 0.02, 0.012, 0.45, { cut: 1600 }); } } },
    /* 불을 만든 곳(가라앉은 공장): 먼 기계 박동 '쿵 — 쿵' + 모루 망치 쇳소리 + 증기 쉬익 + 낮은 피아노(되풀이 둘째마다) / 1층 검은 닻 긴장: 낮은 베이스 · 반음 위 긴장음 · 프레임 북 · 금관 찌르기 / 2층 킥 · 스네어 · 톱니 */
    factory: { bpm: 96, bar: 4, gain: 0.92, amb: ['deep'], deep: 31,
      CH: [[43, 55, 58, 62], [43, 55, 58, 62], [39, 55, 58, 63], [39, 55, 58, 63], [36, 55, 60, 63], [36, 55, 60, 63], [38, 54, 57, 62], [38, 54, 57, 62]],
      mel: mel([[0, 70, 1.5], [1.5, 69, 0.5], [2, 67, 2], [4, 62, 3], [8, 70, 1], [9, 72, 1], [10, 74, 2], [12, 72, 1], [13, 70, 1], [14, 69, 2], [16, 67, 2], [18, 63, 2], [20, 62, 3], [24, 65, 1], [25, 67, 1], [26, 69, 2], [28, 66, 1], [29, 67, 3]]), melLen: 32,
      lead(x, n, t, dur) { if (x.loop % 2 === 0) return; piano(x.L[0], hz(t), n.m - 12, 0.4 + rnd(-0.05, 0.05), Math.max(1.4, dur * 1.3)); },
      beat(x) { const { t, b, ch, spb, L, on } = x;
        if (b === 0) forge(L[0], t, 0.3); if (b === 2) forge(L[0], t + spb * 0.5, 0.17);
        if (b === 1 || b === 3) clank(L[0], hz(t), [523, 587][x.bar % 2], 0.014, 0.3, 0.45);
        if (b === 3 && x.bar % 4 === 3) for (let k = 0; k < 3; k++) clank(L[0], t + k * spb / 3, 698, 0.01, 0.2, 0.45);
        if (b === 0 && x.bar % 2 === 0) pad(L[0], t, ch.slice(1), spb * 8, 0.012, 560);
        if (Math.random() < 0.05) hiss(L[0], t + rnd(0, spb), 0.025); if (Math.random() < 0.025) creak(L[0], t, 0.015);
        if (on[1]) { if (b === 0 || b === 2) bass(L[1], t, ch[0] + 12, spb * 0.7, 0.12, 380); if (b === 3) bass(L[1], t + spb * 0.5, ch[0] + 13, spb * 0.3, 0.08, 380);
          tom(L[1], t, b % 2 ? 140 : 92, b % 2 ? 0.05 : 0.13, 0.32); if (x.bar % 4 === 0 && b === 0) brass(L[1], t, ch[0] + 12, 0.03, spb * 1.6); if (x.bar % 4 === 2 && b === 2) brass(L[1], t, ch[0] + 13, 0.022, spb * 0.8); }
        if (on[2]) { kick(L[2], t, 0.3); if (b === 1 || b === 3) snare(L[2], t, 0.11); for (let k = 0; k < 4; k++) hat(L[2], t + k * spb / 4, k % 2 ? 0.01 : 0.02);
          for (let k = 0; k < 2; k++) osc(L[2], t + k * spb / 2, MIDI(ch[2 + k] + 12), 'sawtooth', 0.01, 0.016, spb * 0.35, { cut: 1700 }); } } },
    /* 파수의 목소리(심해 연구소 · M4-B): E단조 72 · 차갑고 넓은 울림 — 유리 종(높게 · 젖음 많이) · 길게 끄는 현 · 소나 핑 · 파수 신호음 모티프(A→E 두 음 · 4마디마다, 셋째 되풀이엔 노을 녹음처럼 피아노가 답함)
       1층(적 발견): 맥박 베이스 · 째깍 · 낮은 경보 반음 / 2층(카운트다운): 킥 · 박수 · 위로 오르는 사각파 */
    lab: { bpm: 72, bar: 4, gain: 1.0, amb: ['deep'], deep: 28,
      CH: [[40, 55, 59, 64], [40, 55, 59, 64], [36, 55, 60, 64], [36, 55, 60, 64], [43, 55, 59, 62], [43, 55, 59, 62], [38, 54, 57, 62], [35, 54, 59, 63]],
      mel: mel([[0, 76, 2], [2, 79, 1], [3, 78, 1], [4, 71, 4], [8, 74, 1], [9, 76, 1], [10, 79, 2], [12, 83, 3], [16, 81, 2], [18, 79, 1], [19, 76, 1], [20, 74, 2], [22, 71, 2], [24, 76, 1.5], [25.5, 74, 0.5], [26, 71, 2], [28, 75, 3]]), melLen: 32,
      lead(x, n, t, dur) { if (x.loop % 2 === 0) bell(x.L[0], hz(t), n.m, 0.01, Math.max(2.4, dur * 1.6), 0.8); else piano(x.L[0], hz(t), n.m - 12, 0.32, Math.max(1.8, dur * 1.4)); },
      beat(x) { const { t, b, ch, spb, L, on } = x;
        if (b === 0 && x.bar % 2 === 0) pad(L[0], t, ch.slice(1), spb * 8, 0.013, 700, { wave: 'triangle' });
        if (b === 0) bass(L[0], t, ch[0], spb * 3.5, 0.06, 220);
        if (b === 2 && x.bar % 2 === 1) osc(L[0], t, MIDI(93), 'sine', 0.002, 0.016, 2.2, { wet: 0.95 });           /* 소나 핑 */
        if (x.bar % 4 === 0 && b === 3) { bell(L[0], t, 81, 0.014, 2.2, 0.9); bell(L[0], t + spb * 0.5, 88, 0.012, 3, 0.9); if (x.loop % 3 === 2) piano(L[0], t + spb * 1.5, 69, 0.22, 3); } /* 파수 신호음 A→E */
        if (Math.random() < 0.05) drip(L[0], t + rnd(0, spb), [83, 86, 88, 91][Math.floor(Math.random() * 4)], 0.012);
        if (Math.random() < 0.02) creak(L[0], t, 0.01);
        if (on[1]) { if (b === 0 || b === 2) bass(L[1], t, ch[0] + 12, spb * 0.6, 0.11, 360); if (b === 1 || b === 3) bass(L[1], t + spb * 0.5, ch[0] + 12, spb * 0.3, 0.07, 360);
          for (let k = 0; k < 2; k++) clank(L[1], t + k * spb / 2, 1760, 0.006, 0.08, 0.5); if (x.bar % 2 === 0 && b === 0) for (const m of [76, 77]) osc(L[1], t, MIDI(m), 'sine', 0.3, 0.012, spb * 3, { wet: 0.6 }); }
        if (on[2]) { kick(L[2], t, 0.28); if (b === 1 || b === 3) snare(L[2], t, 0.1); for (let k = 0; k < 4; k++) arp(L[2], t + k * spb / 4, ch[1 + (k % 3)] + 12, 0.02, 2200); } } },
    /* 인양단의 결전: 공통 주제(A단조) + 북 · 베이스 · 금관 찌르기 / 지도 색: 창고 파이프 · 물방울 · 항구 종 · 바람 · 뱃고동 · 터널 지지직 · 아르페지오 */
    boss: { bpm: 128, bar: 4, gain: 1.1, layers: lv => [true, true, lv >= 2],
      CH: [[33, 57, 60, 64], [29, 57, 60, 65], [31, 55, 59, 62], [28, 56, 59, 64], [33, 57, 60, 64], [29, 57, 60, 65], [26, 57, 62, 65], [28, 56, 59, 64]],
      mel: mel([[0, 69, 1], [1, 72, 0.5], [1.5, 76, 0.5], [2, 81, 1.5], [3.5, 79, 0.5], [4, 77, 2], [6, 76, 1], [7, 72, 1], [8, 74, 1], [9, 79, 1], [10, 77, 1], [11, 76, 1], [12, 76, 3], [15, 68, 1],
        [16, 69, 1], [17, 72, 0.5], [17.5, 76, 0.5], [18, 81, 1.5], [19.5, 83, 0.5], [20, 84, 2], [22, 81, 1], [23, 77, 1], [24, 74, 1], [25, 77, 1], [26, 81, 1], [27, 79, 1], [28, 80, 2], [30, 83, 1], [31, 76, 1]]), melLen: 32,
      lead(x, n, t, dur) { lead(x.L[1], t, n.m, dur * 0.92, 0.035); },
      ambOf: col => col === 'tunnel' || col === 'factory' || col === 'lab' ? ['deep'] : [], deep: 33,
      beat(x) { const { t, b, ch, spb, L, on, color } = x, r = ch[0] + 12;
        if (b === 0 || (b === 1 && Math.random() < 0.3)) kick(L[0], t, 0.42); if (b === 2) { kick(L[0], t, 0.4); kick(L[0], t + spb * 0.5, 0.25); } if (b === 1 || b === 3) snare(L[0], t, 0.22);
        for (let k = 0; k < 2; k++) bass(L[0], t + k * spb / 2, r + (k ? 12 : 0), spb * 0.4, 0.13, 520);
        if (b === 0) stab(L[0], t, ch.slice(1), 0.03); if (b === 2) stab(L[0], t + spb * 0.5, ch.slice(1), 0.022);
        if (x.bar === 7 && b === 3) for (let k = 0; k < 4; k++) tom(L[0], t + k * spb / 4, 190 - k * 25, 0.16, 0.18);
        if (color === 'harbor') { if (b === 0) bell(L[1], t, ch[3] + 12, 0.02, 2.5); if (x.bar === 0 && b === 0) horn(L[1], t, 0.025); }
        else if (color === 'factory') { if (b === 0) forge(L[1], t, 0.14); if (b === 2) forge(L[1], t + spb * 0.5, 0.08); clank(L[1], t + spb * 0.5, 466, 0.018, 0.22, 0.3); if (Math.random() < 0.18) hiss(L[1], t + rnd(0, spb), 0.022); if (x.bar % 4 === 0 && b === 0) brass(L[1], t, r, 0.025, spb * 1.5); }
        else if (color === 'lab') { if (b === 0) bell(L[1], t, ch[3] + 12, 0.016, 2.2, 0.85); if (x.bar % 4 === 0 && b === 2) { bell(L[1], t, 81, 0.016, 1.6, 0.9); bell(L[1], t + spb * 0.5, 88, 0.014, 2, 0.9); } for (let k = 0; k < 2; k++) osc(L[1], t + k * spb / 2, MIDI(ch[1 + k] + 24), 'sine', 0.002, 0.012, 0.3, { wet: 0.7 }); } /* M4-B 청록 어미: 유리 종 · 파수 신호음 */
        else if (color === 'chief') { if (x.bar % 4 === 0 && b === 0) horn(L[1], t, 0.03); if (b === 2) clank(L[1], t + spb * 0.5, 300, 0.02, 0.25, 0.3); if (b === 3) clank(L[1], t + spb * 0.75, 340, 0.014, 0.2, 0.3); if (x.bar % 2 === 1 && b === 0) brass(L[1], t, r, 0.026, spb * 1.2); } /* 검수 M4 Top 10 검은 닻 두목: 뱃고동 · 사슬 · 금관 */
        else if (color === 'tunnel') { for (let k = 0; k < 4; k++) arp(L[1], t + k * spb / 4, [r, r + 7, r + 12, r + 7][k], 0.03, 1500); if (Math.random() < 0.12) zap(L[1], t + rnd(0, spb), 0.03); }
        else { clank(L[1], t + spb * 0.5, 380, 0.025, 0.18, 0.2); if (Math.random() < 0.3) drip(L[1], t + rnd(0, spb), [81, 84, 88][Math.floor(Math.random() * 3)], 0.025); }
        if (on[2]) { for (let k = 0; k < 4; k++) hat(L[2], t + k * spb / 4, k % 2 ? 0.012 : 0.024, k === 2 && b === 3); if (x.bar % 2 === 1 && b === 3) for (let k = 0; k < 4; k++) snare(L[2], t + k * spb / 4, 0.06 + k * 0.03); } } },
    /* M5-A 대수문의 결전(최종 보스 파수): D단조 136 · 단계마다 층(0 = 1단계 · 1 = 2단계 · 2 = 3단계) — 파수 신호음(A→E 두 음 종) · 뱃고동 · 수문 쇳소리 · 비바람
       1단계: 북 · 8분 베이스 · 화음 찌르기 · 주제(납 리드) / 2단계 +: 16분 아르페지오 · 금관 · 심장 / 3단계 +: 16분 하이햇 · 탐 채움 · 높은 현 */
    final: { bpm: 136, bar: 4, gain: 1.1, amb: ['wind', 'sea'], layers: lv => [true, lv >= 1, lv >= 2],
      CH: [[38, 62, 65, 69], [34, 62, 65, 70], [41, 60, 65, 69], [36, 60, 64, 67], [38, 62, 65, 69], [43, 62, 67, 70], [33, 61, 64, 69], [33, 61, 64, 69]],
      mel: mel([[0, 74, 1], [1, 77, 1], [2, 81, 2], [4, 79, 1], [5, 77, 1], [6, 74, 2], [8, 77, 1], [9, 81, 1], [10, 84, 2], [12, 81, 2], [14, 77, 2],
        [16, 74, 1], [17, 77, 1], [18, 81, 1.5], [19.5, 79, 0.5], [20, 77, 2], [22, 74, 2], [24, 76, 1], [25, 77, 1], [26, 79, 2], [28, 81, 3], [31, 73, 1]]), melLen: 32,
      lead(x, n, t, dur) { lead(x.L[0], t, n.m, dur * 0.9, 0.032); if (x.on[1]) lead(x.L[1], t, n.m - 12, dur * 0.9, 0.018); },
      beat(x) { const { t, b, ch, spb, L, on } = x, r = ch[0] + 12;
        if (b === 0 || b === 2) kick(L[0], t, 0.42); if (b === 2) kick(L[0], t + spb * 0.5, 0.24); if (b === 1 || b === 3) snare(L[0], t, 0.22);
        for (let k = 0; k < 2; k++) bass(L[0], t + k * spb / 2, r + (k ? 12 : 0), spb * 0.42, 0.13, 520);
        if (b === 0) stab(L[0], t, ch.slice(1), 0.03); if (b === 3) stab(L[0], t + spb * 0.5, ch.slice(1), 0.02);
        if (x.bar % 4 === 0 && b === 2) { bell(L[0], t, 81, 0.02, 1.6, 0.9); bell(L[0], t + spb * 0.5, 88, 0.017, 2.2, 0.9); } /* 파수 신호음 */
        if (x.bar === 0 && b === 0 && x.loop % 2 === 0) horn(L[0], t, 0.026);
        if (b === 1 && x.bar % 2 === 1) clank(L[0], t + spb * 0.5, 330, 0.02, 0.3, 0.3); /* 수문 쇳소리 */
        if (on[1]) { for (let k = 0; k < 4; k++) arp(L[1], t + k * spb / 4, [ch[1], ch[2], ch[3], ch[2] + 12][k], 0.03, 2000); if (b === 0 && x.bar % 2 === 0) brass(L[1], t, r, 0.028, spb * 1.4); if (b === 0 || b === 2) heart(L[1], t, 0.16); }
        if (on[2]) { for (let k = 0; k < 4; k++) hat(L[2], t + k * spb / 4, k % 2 ? 0.012 : 0.024, k === 2 && b === 3); if (x.bar === 7 && b === 3) for (let k = 0; k < 4; k++) tom(L[2], t + k * spb / 4, 200 - k * 28, 0.16, 0.18);
          if (b === 0 && x.bar % 2 === 0) pad(L[2], t, [ch[1] + 12, ch[3] + 12], spb * 8, 0.012, 1600); } } },
    /* M5-A 불이 켜진 곳(엔딩 · 크레딧): D장조 66 · 피아노 주제 + 종 + 따뜻한 화음 — 등불 축제 국처럼 느리게, 되풀이 둘째부터 높은 종이 주제를 따라 부름 */
    ending: { bpm: 66, bar: 4, gain: 1.0, amb: ['sea'], layers: () => [true, false, false],
      CH: [[38, 62, 66, 69], [37, 61, 64, 69], [35, 62, 66, 71], [43, 62, 67, 71], [38, 62, 66, 69], [43, 62, 67, 71], [40, 64, 67, 71], [33, 61, 64, 69]],
      mel: mel([[0, 78, 2], [2, 76, 1], [3, 74, 1], [4, 73, 3], [8, 74, 1.5], [9.5, 76, 0.5], [10, 78, 2], [12, 81, 3], [16, 79, 2], [18, 78, 1], [19, 76, 1], [20, 74, 3], [24, 76, 1], [25, 78, 1], [26, 76, 2], [28, 74, 4]]), melLen: 32,
      lead(x, n, t, dur) { piano(x.L[0], hz(t), n.m - 12, 0.36 + rnd(-0.04, 0.04), Math.max(1.6, dur * 1.5)); if (x.loop % 2 === 1) bell(x.L[0], hz(t + 0.02), n.m + 12, 0.009, Math.max(2, dur * 1.6), 0.8); },
      beat(x) { const { t, b, ch, spb, L } = x;
        if (b === 0) { bass(L[0], t, ch[0], spb * 3.6, 0.07, 260); if (x.bar % 2 === 0) pad(L[0], t, ch.slice(1), spb * 8, 0.012, 760, { wave: 'triangle' }); }
        if (b === 2) piano(L[0], hz(t), ch[1] - 12, 0.16, 2.4);
        if (b === 3 && x.bar % 4 === 3) bell(L[0], t + spb * 0.5, ch[3] + 12, 0.012, 3, 0.85);
        if (x.bar === 0 && b === 0) bell(L[0], t, 86, 0.014, 4, 0.9); } },
  };

  /* ───── 엔진: 미리 0.7초씩 박을 잡아 둠 · 장면이 바뀌면 1.5초 겹쳐 바꿈 · 층은 2초에 걸쳐 들고 남 ───── */
  let cur = null;
  function start(id, color, lv, at) {
    const S = SONGS[id]; const bus = c.createGain(); bus.gain.setValueAtTime(0.0001, at); bus.gain.setTargetAtTime(S.gain, at, 0.45); bus.connect(out);
    const L = [0, 1, 2].map(() => { const g = c.createGain(); g.gain.value = 0; g.connect(bus); return g; });
    const tr = { id, color, S, bus, L, on: [false, false, false], offAt: [0, 0, 0], beat: 0, nextT: at + 0.05, ambs: [] };
    for (const k of S.ambOf ? S.ambOf(color) : S.amb || []) tr.ambs.push(AMB[k](bus, at, S.deep));
    level(tr, lv, at, true); return tr;
  }
  function level(tr, lv, at, first) {
    const want = tr.S.layers ? tr.S.layers(lv) : [true, lv >= 1, lv >= 2];
    want.forEach((w, i) => { if (w === tr.on[i] && !first) return; tr.on[i] = w; const g = tr.L[i].gain; g.cancelScheduledValues(at); g.setTargetAtTime(w ? 1 : 0, at, w ? (first ? 0.05 : 0.6) : 0.7); if (!w) tr.offAt[i] = at + 2.5; });
    tr.lv = lv;
  }
  function stop(tr, at) { if (!tr) return; tr.bus.gain.cancelScheduledValues(at); tr.bus.gain.setTargetAtTime(0.0001, at, 0.5); for (const a of tr.ambs) a.stop(at); const b = tr.bus; if (!OFF) setTimeout(() => { try { b.disconnect(); } catch { /* */ } }, 5000); }
  function beat(tr, t) {
    const S = tr.S, spb = 60 / S.bpm, n = tr.beat, barN = Math.floor(n / S.bar), bar = barN % S.CH.length;
    const on = tr.on.map((o, i) => o || t < tr.offAt[i]);
    const x = { t, b: n % S.bar, bar, loop: Math.floor(barN / S.CH.length), ch: S.CH[bar], spb, L: tr.L, on, color: tr.color };
    S.beat(x);
    if (S.mel) { const mb = n % S.melLen; for (const m of S.mel) if (m.p >= mb && m.p < mb + 1) S.lead(x, m, t + (m.p - mb) * spb, m.d * spb); }
  }
  return {
    songs: Object.keys(SONGS),
    /* 장면 바꾸기: id null = 조용히 */
    set(id, lv = 0, color = null, at = c.currentTime) {
      const key = id && id + (id === 'boss' ? ':' + color : '');
      if ((cur?.key || null) !== (key || null)) { stop(cur, at); cur = null; if (id && SONGS[id]) { cur = start(id, color, lv, at); cur.key = key; } }
      else if (cur && cur.lv !== lv) level(cur, lv, at);
    },
    pump(until) { if (!cur) return; const spb = 60 / cur.S.bpm; if (cur.nextT < c.currentTime - 0.1) cur.nextT = c.currentTime + 0.05; while (cur.nextT < until) { beat(cur, cur.nextT); cur.nextT += spb; cur.beat++; } },
    now: () => cur && { id: cur.id, lv: cur.lv, color: cur.color },
  };
}
