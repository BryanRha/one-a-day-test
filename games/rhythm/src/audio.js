// 소리: AudioContext 하나 · 곡 재생 · 오디오 시계 · 효과음
//   시계 원칙: 노트 위치와 판정은 모두 '스피커에서 지금 나오는 소리의 오디오 시계 시각'(heard) 기준
//   heard = getOutputTimestamp().contextTime (출력 지연 포함) 을 performance.now() 로 부드럽게 이음
//   지원 안 하는 브라우저는 currentTime − outputLatency(baseLatency)
import { makeSounds } from './sfx.js?v=0.99.26';

export const A = {
  ac: null, master: null, music: null, sfx: null, bufs: {}, src: null, t0: 0, off: null, vol: { music: 0.9, sfx: 0.55 },
  ensure() {
    if (this.ac) return this.ac;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ac = new AC({ latencyHint: 'interactive' });
    this.master = this.ac.createGain(); this.master.connect(this.ac.destination);
    this.music = this.ac.createGain(); this.music.gain.value = this.vol.music; this.music.connect(this.master);
    this.sfx = this.ac.createGain(); this.sfx.gain.value = this.vol.sfx; this.sfx.connect(this.master);
    this.makeSfx(); this.loadPerc();
    return this.ac;
  },
  async unlock() { this.ensure(); if (this.ac.state !== 'running') { try { await this.ac.resume(); } catch { /* */ } } },
  setVol(k, v) { this.vol[k] = v; if (this.ac) this[k].gain.setTargetAtTime(v, this.ac.currentTime, 0.02); },

  /* 곡 불러오기: 여러 형식 중 되는 것 (m4a → ogg) · 앞 무음 길이 재서 돌려줌 */
  async load(id, base, firstSound = 0) {
    if (this.bufs[id]) return this.bufs[id];
    this.ensure();
    let buf = null, err = null;
    for (const ext of ['m4a', 'ogg']) {
      try { const r = await fetch(`${base}.${ext}`); if (!r.ok) throw new Error(r.status); const ab = await r.arrayBuffer(); buf = await new Promise((ok, no) => { const p = this.ac.decodeAudioData(ab, ok, no); if (p && p.catch) p.catch(no); }); break; } catch (e) { err = e; }
    }
    if (!buf) throw err || new Error('음원을 불러오지 못했어요');
    /* 디코더(코덱)마다 앞에 붙는 무음이 달라서 첫 소리 위치로 맞춤 */
    const ch = buf.getChannelData(0); let mx = 0; for (let i = 0; i < ch.length; i += 4) mx = Math.max(mx, Math.abs(ch[i]));
    let first = 0; for (let i = 0; i < ch.length; i++) if (Math.abs(ch[i]) > mx * 0.05) { first = i / buf.sampleRate; break; }
    const d = first - firstSound, shift = Math.abs(d) > 0.015 && Math.abs(d) < 0.2 ? d : 0;   /* 코덱 앞 무음(1024~2112 샘플 = 21~48ms)만 보정 · 몇 ms 차이는 페이드인 잡음이라 무시 */
    return (this.bufs[id] = { buf, shift, dur: buf.duration });
  },

  /* 오디오 시계: heard(성능 시각 ms) → 그 순간 스피커로 나오던 오디오 시계 시각(초) */
  sample() {
    const ac = this.ac; if (!ac) return;
    let s = null;
    if (ac.getOutputTimestamp) { const ts = ac.getOutputTimestamp(); if (ts && ts.contextTime > 0 && ts.performanceTime > 0) s = ts.contextTime - ts.performanceTime / 1000; }
    if (s == null) s = ac.currentTime - (ac.outputLatency || ac.baseLatency || 0) - performance.now() / 1000;
    if (this.off == null || Math.abs(s - this.off) > 0.03 || ac.state !== 'running') this.off = s; else this.off += (s - this.off) * 0.06;
  },
  heard(perfMs = performance.now()) { if (this.off == null) this.sample(); return perfMs / 1000 + this.off; },

  /* 곡 재생: 곡 위치 from(초)이 지금부터 lead 초 뒤에 나오게 · 곡 위치 p = heard − t0 */
  play(entry, from = 0, lead = 0.1, gain = 1) {
    this.stop();
    const ac = this.ensure(), src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = entry.buf; g.gain.value = gain; src.connect(g); g.connect(this.music);
    const when = ac.currentTime + lead;
    if (from < 0) { src.start(when - from, 0); } else src.start(when, from);
    this.t0 = when - from; this.src = src; this.srcGain = g; this.sample();
    return this.t0;
  },
  pos(perfMs) { return this.heard(perfMs) - this.t0; },
  stop(fade = 0) {
    const s = this.src, g = this.srcGain; this.src = null;
    if (!s) return;
    try { if (fade && g) { g.gain.setTargetAtTime(0, this.ac.currentTime, fade / 4); s.stop(this.ac.currentTime + fade); } else s.stop(); } catch { /* */ }
  },
  /* 미리 듣기: 구간 반복 · 부드럽게 들어오고 나감 */
  preview(entry, from, len) {
    this.stopPreview();
    const ac = this.ensure(), src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = entry.buf; src.loop = true; src.loopStart = from; src.loopEnd = Math.min(entry.dur, from + len);
    g.gain.value = 0; g.gain.setTargetAtTime(0.55, ac.currentTime, 0.4);
    src.connect(g); g.connect(this.music); src.start(ac.currentTime + 0.05, from);
    this.pv = { src, g };
  },
  stopPreview() { const p = this.pv; this.pv = null; if (!p) return; try { p.g.gain.setTargetAtTime(0, this.ac.currentTime, 0.15); p.src.stop(this.ac.currentTime + 0.6); } catch { /* */ } },
  async suspend() { try { await this.ac?.suspend(); } catch { /* */ } },
  async resume() { try { await this.ac?.resume(); } catch { /* */ } this.off = null; },

  /* 효과음은 직접 합성 (파일 없음) */
  makeSfx() {
    const ac = this.ac, sr = ac.sampleRate, mk = (len, f) => { const b = ac.createBuffer(1, Math.floor(sr * len), sr), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = f(i / sr, i); return b; };
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1; };
    /* 탭: 짧은 유리 톡 (높은 사인 + 아주 짧은 잡음) */
    this.fx = {
      tap: mk(0.09, t => (Math.sin(2 * Math.PI * 1800 * t) * 0.5 + Math.sin(2 * Math.PI * 3600 * t) * 0.18) * Math.exp(-t * 60) + rnd() * 0.25 * Math.exp(-t * 400)),
      soft: mk(0.06, t => Math.sin(2 * Math.PI * 1200 * t) * 0.25 * Math.exp(-t * 80)),
      tick: mk(0.05, t => Math.sin(2 * Math.PI * 1500 * t) * Math.exp(-t * 90)),
      tock: mk(0.06, t => Math.sin(2 * Math.PI * 1000 * t) * Math.exp(-t * 70)),
      chime: mk(1.2, t => [1, 1.5, 2, 3].reduce((s, m, k) => s + Math.sin(2 * Math.PI * 880 * m * t) * Math.exp(-t * (3 + k * 2)) * (0.4 / (k + 1)), 0)),
      whoosh: mk(0.7, (t) => rnd() * Math.sin(Math.PI * t / 0.7) * 0.35),
      page: mk(0.35, (t) => rnd() * Math.exp(-t * 14) * 0.3 * (1 + Math.sin(t * 90))),
    };
  },
  /* 타격음: 누른 그 자리에서 오디오 시계 지금 시각으로 바로 (프레임을 기다리지 않음) */
  hit(kind, vol = 0.55) {
    const n = { perfect: 'hitP', great: 'hitG', good: 'hitD', chord: 'chord', tail: 'tail' }[kind]; if (!n) return;
    const v = 0.6;   /* 판정별 크기 차이는 버퍼 최고값(sfx.js PEAK)에 들어 있음 */
    this.fxPlay(n, vol * v, this.ac ? this.ac.currentTime : 0);
  },
  /* v0.3.1: 타격음 · 신호음은 sfx.js 의 타악 합성으로 덮어씀 (2kHz 위 순수 사인 '칭칭' 금지 — FEEL.md 6장) */
  loadPerc() { const S = makeSounds(this.ac.sampleRate); for (const [k, x] of Object.entries(S)) { const b = this.ac.createBuffer(1, x.length, this.ac.sampleRate); b.getChannelData(0).set(x); this.fx[k] = b; } },
  fxPlay(name, vol = 1, when = 0) {
    if (!this.ac || !this.fx || this.ac.state !== 'running') return;
    if (!this.fx[name]) return; const s = this.ac.createBufferSource(), g = this.ac.createGain(); s.buffer = this.fx[name]; g.gain.value = vol; s.connect(g); g.connect(this.sfx); s.start(Math.max(when || 0, this.ac.currentTime));
  },
};
