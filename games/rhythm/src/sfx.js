// 효과음 합성 (순수 함수 · AudioContext 없이 Float32Array 를 만듦 → Node 에서 대역 시험 가능)
//   v0.3.1 검수 A3: 2kHz 위 순수 사인('칭칭') 금지 → 낮고 부드러운 몸통(150~300Hz) + 400Hz~2kHz 대역 잡음 클릭(타악) · 음정감 약하게
//   기준(tools/test_logic.mjs 가 FFT 로 잼): 타격음 에너지 중 2kHz 위 ≤ 25% · 400Hz 위 ≥ 40% · 2~4kHz 에 뾰족한 음(톤) 없음
//   판정 구분은 음높이가 아니라 '밝기(필터 중심) · 크기 · 길이'로: PERFECT 밝은 톡 · GREAT 부드러운 톡 · GOOD 둔한 톡

/* 결정론 잡음 (같은 소리 = 같은 버퍼) */
function noise(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; }; }
/* 2차 대역 통과 필터 (RBJ) */
function bandpass(x, sr, f0, q) {
  const w = 2 * Math.PI * f0 / sr, al = Math.sin(w) / (2 * q), c = Math.cos(w), a0 = 1 + al;
  const b0 = al / a0, b2 = -al / a0, a1 = -2 * c / a0, a2 = (1 - al) / a0, y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
function lowpass(x, sr, f0, q = 0.7) {
  const w = 2 * Math.PI * f0 / sr, al = Math.sin(w) / (2 * q), c = Math.cos(w), a0 = 1 + al;
  const b0 = (1 - c) / 2 / a0, b1 = (1 - c) / a0, a1 = -2 * c / a0, a2 = (1 - al) / a0, y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
/* 타악 한 타: 몸통(음높이가 빠르게 내려가는 낮은 사인 = '퉁') + 대역 잡음 클릭(= '톡') */
function perc(sr, o) {
  const n = Math.floor(sr * o.len), R = noise(o.seed || 7), raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = R();
  const clk = bandpass(raw, sr, o.click, o.q || 1.1), out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr, f = o.body * (1 + o.drop * Math.exp(-t * 60));
    ph += 2 * Math.PI * f / sr;
    const att = Math.min(1, t * sr / 24);   /* 0.5ms 들어오기 (딸깍 방지) */
    out[i] = att * (Math.sin(ph) * o.bodyAmp * Math.exp(-t * o.bodyDecay) + clk[i] * o.clickAmp * Math.exp(-t * o.clickDecay));
  }
  return o.lp ? lowpass(out, sr, o.lp) : out;
}
/* 부드러운 잡음 숨 (스윽 · 반짝임 대신) */
function breath(sr, len, f0, q, amp, seed, shape) {
  const n = Math.floor(sr * len), R = noise(seed), raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = R();
  const y = bandpass(raw, sr, f0, q);
  for (let i = 0; i < n; i++) y[i] *= amp * shape(i / sr, len);
  return y;
}
const mix = (...xs) => { const n = Math.max(...xs.map(x => x.length)), y = new Float32Array(n); for (const x of xs) for (let i = 0; i < x.length; i++) y[i] += x[i]; return y; };
const delay = (x, sr, sec) => { const d = Math.floor(sr * sec), y = new Float32Array(x.length + d); y.set(x, d); return y; };

/* 이름 → 버퍼 (sr = AudioContext.sampleRate) */
export function makeSounds(sr) {
  const S = {
    /* 타격음 (판정마다) */
    hitP: perc(sr, { len: 0.075, body: 220, drop: 0.6, bodyAmp: 0.3, bodyDecay: 70, click: 1300, q: 0.9, clickAmp: 9, clickDecay: 110, seed: 11, lp: 2500 }),
    hitG: perc(sr, { len: 0.07, body: 200, drop: 0.5, bodyAmp: 0.3, bodyDecay: 75, click: 1000, q: 0.9, clickAmp: 7, clickDecay: 120, seed: 12, lp: 2400 }),
    hitD: perc(sr, { len: 0.06, body: 180, drop: 0.4, bodyAmp: 0.35, bodyDecay: 80, click: 800, q: 0.8, clickAmp: 10, clickDecay: 140, seed: 13, lp: 1800 }),
    /* 동시치기: 두 타를 4ms 어긋나게 겹쳐 '두툼한 톡' */
    chord: null,
    /* 롱노트 끝: 짧은 숨 + 낮은 퉁 */
    tail: null,
    /* 헛누름: 아주 작은 둔한 톡 */
    soft: perc(sr, { len: 0.05, body: 170, drop: 0.3, bodyAmp: 0.25, bodyDecay: 90, click: 600, q: 0.8, clickAmp: 3, clickDecay: 160, seed: 14, lp: 1500 }),
    /* READY · GO · 이정표 · 풀콤보: 음정 대신 잡음 숨 + 몸통 (곡 조성과 안 부딪힘) */
    ready: perc(sr, { len: 0.09, body: 240, drop: 0.5, bodyAmp: 0.35, bodyDecay: 50, click: 1100, q: 1.0, clickAmp: 7, clickDecay: 90, seed: 15, lp: 2400 }),
    go: null, chime: null, fc: null,
  };
  S.chord = mix(S.hitP, delay(perc(sr, { len: 0.075, body: 190, drop: 0.6, bodyAmp: 0.3, bodyDecay: 65, click: 1150, q: 0.9, clickAmp: 8, clickDecay: 105, seed: 21, lp: 2800 }), sr, 0.004));
  S.tail = mix(breath(sr, 0.22, 900, 0.8, 0.5, 31, (t, L) => Math.min(1, t / 0.03) * Math.exp(-t * 14)), perc(sr, { len: 0.12, body: 160, drop: 0.5, bodyAmp: 0.3, bodyDecay: 35, click: 800, q: 0.9, clickAmp: 4, clickDecay: 60, seed: 32, lp: 2200 }));
  S.go = mix(breath(sr, 0.5, 1100, 0.7, 0.55, 41, (t) => Math.min(1, t / 0.04) * Math.exp(-t * 6)), perc(sr, { len: 0.25, body: 120, drop: 0.8, bodyAmp: 0.8, bodyDecay: 14, click: 900, q: 0.9, clickAmp: 0.8, clickDecay: 40, seed: 42, lp: 2400 }));
  S.chime = breath(sr, 0.6, 750, 0.8, 0.45, 51, (t) => Math.min(1, t / 0.05) * Math.exp(-t * 5));
  S.fc = mix(breath(sr, 1.6, 950, 0.8, 0.5, 61, (t) => Math.min(1, t / 0.12) * Math.exp(-t * 2.2)), breath(sr, 1.6, 600, 0.7, 0.35, 62, (t) => Math.min(1, t / 0.2) * Math.exp(-t * 1.8)), perc(sr, { len: 0.5, body: 95, drop: 0.9, bodyAmp: 0.9, bodyDecay: 7, click: 800, q: 0.8, clickAmp: 0.6, clickDecay: 20, seed: 63, lp: 2000 }));
  /* 크기 맞추기: 각 소리 최고값 = 정해 둔 값 (판정이 낮을수록 작게) */
  const PEAK = { hitP: 0.9, hitG: 0.72, hitD: 0.52, chord: 0.95, tail: 0.7, soft: 0.35, ready: 0.7, go: 0.85, chime: 0.55, fc: 0.85 };
  for (const [k, x] of Object.entries(S)) { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); const g = (PEAK[k] || 0.7) / (m || 1); for (let i = 0; i < x.length; i++) x[i] *= g; }
  return S;
}
/* 시험용: 대역별 에너지 비율 (FFT) */
export function bands(x, sr) {
  let N = 1; while (N < x.length) N <<= 1; N = Math.max(N, 4096);
  const re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < x.length; i++) re[i] = x[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / x.length));
  for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; } }
  for (let len = 2; len <= N; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < N; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr; re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
  let tot = 0, hi2 = 0, hi400 = 0, peak24 = 0, mean24 = 0, c24 = 0;
  for (let k = 1; k < N / 2; k++) { const f = k * sr / N, e = re[k] * re[k] + im[k] * im[k]; tot += e; if (f > 2000) hi2 += e; if (f > 400) hi400 += e; if (f >= 2000 && f <= 4000) { peak24 = Math.max(peak24, e); mean24 += e; c24++; } }
  return { above2k: hi2 / tot, above400: hi400 / tot, tonal24: c24 ? peak24 / (mean24 / c24) : 0 };
}
