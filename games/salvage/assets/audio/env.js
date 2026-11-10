// 수달 인양단 지도 환경음 — 배경음 아래 깔리는 바닥 소리 (전부 Web Audio 합성 · 소리 파일 0개)
//  audio.js 가 판 시작 때 늦게 받음(첫 진입 용량 X) · 0.25초마다 set(상태) + pump(앞으로 0.7초 사건 예약) · 오프라인 렌더(미리듣기)도 같은 코드
//  창고: 먼 물 흐름 · 물방울(음높이가 휘는 공기 방울) · 철 삐걱(붙었다 미끄러지는 마찰) · 형광등 웅(정전이면 꺼지고 불꽃 지지직) · 기관실 웅웅(구역 3) · 침수면 물 쏟아짐
//  항구(밤): 바람(돌풍 · 무작위 걷기) · 파도(밀려옴 → 부서짐 → 빠짐) · 밧줄 · 배 삐걱 · 선체 '통' · 폭풍이면 비 + 센 바람 + 휘파람 · 안개면 바람 잦고 먼 무적(霧笛) · 정전이면 부두 등 웅 끊김
//  터널: 수압 웅웅(저음 + 폰에서 들리는 배음) · 누수 쉬익 + 물줄기 · 먼 전기 지지직 · 금속 신음 · 급류(판 상태 · 몰려오는 25초)면 물살 · 정전이면 전기 웅 끊김
//  공장(M3-B): 먼 기계 박동(낮은 '쿵' · 불규칙) · 쇠 부딪는 소리(멀리 · 넓게) · 증기 쉬익(증기 판이면 많이) · 용광로 웅(과열이면 크게) · 사슬 삐걱 · 물 흐름 · 정전이면 전기 웅 끊기고 기계 박동이 잦아듦
//  반복감 줄이기: 잡음 버퍼 길이를 서로 안 맞게(5.3 · 6.7초) · 바닥은 LFO 대신 무작위 걷기 · 사건은 포아송(간격 무작위) · 높이 · 팬 · 거리(필터 · 울림) 매번 다름
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

export function createEnv({ ctx, out, rev }) {
  const c = ctx, sr = c.sampleRate;
  /* 긴 잡음 (2초 고리는 바닥 소리에선 되풀이가 들림 → 길고 서로 안 맞는 길이) */
  const mk = (len, fn) => { const b = c.createBuffer(1, Math.round(sr * len), sr), d = b.getChannelData(0); fn(d); return b; };
  const NZ = {
    pink: mk(5.3, d => { let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; } }),
    brown: mk(6.7, d => { let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } }),
  };
  /* 붙었다 미끄러지는 마찰(삐걱): 짧은 펄스열 — 빠르기가 느림 → 빠름 → 느림 · 펄스마다 세기 · 간격 흔들림 (공명 필터에 넣으면 쇠 · 나무 삐걱) */
  const slip = (len, r0, r1, jit) => mk(len, d => { let t = 0.02; while (t < len - 0.02) { const u = t / len, env = Math.sin(Math.PI * u), r = r0 + (r1 - r0) * Math.sin(Math.PI * u * 0.9);
    const i0 = Math.round(t * sr), a = env * rnd(0.5, 1); for (let k = 0; k < 90 && i0 + k < d.length; k++) d[i0 + k] += a * Math.exp(-k / 14) * (k % 2 ? -1 : 1) * rnd(0.6, 1); t += (1 / r) * rnd(1 - jit, 1 + jit); } });
  const SLIP = [slip(0.9, 18, 55, 0.25), slip(1.3, 10, 34, 0.35), slip(0.6, 30, 80, 0.2), slip(1.8, 7, 22, 0.4)];
  /* 전기 지지직: 드문드문 몰리는 펄스 (덩어리 · 무작위 세기) */
  const CRK = [0, 1, 2].map(() => mk(rnd(0.5, 1.1), d => { let t = 0; const L = d.length / sr; while (t < L) { const burst = Math.random() < 0.3; const n = burst ? Math.round(rnd(4, 14)) : 1;
    for (let j = 0; j < n; j++) { const i0 = Math.round((t + j * rnd(0.002, 0.008)) * sr); const a = rnd(0.3, 1) * (burst ? 1 : 0.6); for (let k = 0; k < 20 && i0 + k < d.length; k++) d[i0 + k] += a * (Math.random() * 2 - 1) * Math.exp(-k / 4); }
    t += rnd(0.01, 0.12); } }));

  const bq = (type, f, q = 0.7, g = 0) => { const x = c.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; x.gain.value = g; return x; };
  const gn = v => { const g = c.createGain(); g.gain.value = v; return g; };
  const pan = p => { const x = c.createStereoPanner(); x.pan.value = Math.max(-1, Math.min(1, p)); return x; };
  const send = (n, w) => { if (w > 0 && rev) { const s = gn(w); n.connect(s); s.connect(rev); } };

  /* ───── 바닥(이어지는 소리) ─────
     잡음 → 필터 줄 → 음량 (넓게면 두 줄을 좌우로) · 상태가 바뀌면 음량 · 필터를 부드럽게 옮김 · wander 로 매 1~3초 목표를 조금씩 흔듦 */
  function bed(spec, bus, t) {
    const g = gn(0.0001), outs = [], fls = [];
    const ways = spec.wide ? [-0.7, 0.7] : [0];
    for (const p of ways) { const s = c.createBufferSource(); s.buffer = NZ[spec.kind || 'pink']; s.loop = true; s.playbackRate.value = rnd(0.96, 1.04);
      let n = s; const chain = spec.f.map(([type, f, q, gg]) => bq(type, f, q, gg)); for (const f of chain) { n.connect(f); n = f; } fls.push(chain);
      const pp = pan(p); n.connect(pp); pp.connect(g); s.start(t, rnd(0, 4)); outs.push(s); }
    g.connect(bus); send(g, spec.wet || 0);
    return { spec, g, fls, srcs: outs, v: 0, nextW: t + rnd(0.5, 2),
      level(v, at, tc = 1.2) { this.v = v; g.gain.setTargetAtTime(Math.max(0.0001, v), at, tc); },
      wander(at) { const w = spec.wander; if (!w || at < this.nextW) return; this.nextW = at + rnd(w.every[0], w.every[1]);
        const k = rnd(w.f[0], w.f[1]); for (const ch of fls) ch[0].frequency.setTargetAtTime(spec.f[0][1] * k, at, w.tc || 0.8);
        if (w.g) g.gain.setTargetAtTime(Math.max(0.0001, this.v * rnd(w.g[0], w.g[1])), at, w.tc || 0.8); },
      stop(at) { g.gain.setTargetAtTime(0.0001, at, 0.6); for (const s of outs) s.stop(at + 4); } };
  }
  /* 음 바닥(웅웅): 사인 · 톱니 몇 개 → 낮은 통과 · 느리게 무작위로 부풀었다 가라앉음 (수압 '우웅 우웅') */
  function drone(spec, bus, t) {
    const g = gn(0.0001), f = bq('lowpass', spec.cut || 400, 0.7); f.connect(g); g.connect(bus); send(g, spec.wet || 0);
    const oss = spec.hz.map(([hz, a, w]) => { const s = c.createOscillator(); s.type = w || 'sine'; s.frequency.value = hz * rnd(0.995, 1.005); const sg = gn(a); s.connect(sg); sg.connect(f); s.start(t); return s; });
    return { spec, g, v: 0, nextW: t + 1,
      level(v, at, tc = 1.5) { this.v = v; g.gain.setTargetAtTime(Math.max(0.0001, v), at, tc); },
      wander(at) { const w = spec.wander; if (!w || at < this.nextW) return; this.nextW = at + rnd(w.every[0], w.every[1]); g.gain.setTargetAtTime(Math.max(0.0001, this.v * rnd(w.g[0], w.g[1])), at, w.tc || 2);
        for (const s of oss) s.detune.setTargetAtTime(rnd(-8, 8), at, 3); },
      stop(at) { g.gain.setTargetAtTime(0.0001, at, 0.6); for (const s of oss) s.stop(at + 4); } };
  }

  /* ───── 사건(한 번씩) ───── */
  /* 물방울: 수면 '톡'(아주 짧은 잡음) + 물속 공기 방울 공명 — 높이가 위로 휨(미너트) · 거리 d(0 가까이 ~ 1 멀리) = 필터 닫힘 + 울림 많이 */
  function drip(bus, t, o = {}) { const d = o.d ?? Math.random(), f = (o.f || rnd(700, 1900)) * (1 - d * 0.25), p = o.pan ?? rnd(-0.8, 0.8), v = (o.v || 0.05) * (1 - d * 0.6);
    const lp = bq('lowpass', 5000 - d * 3500, 0.5), pp = pan(p), g = gn(0.0001); lp.connect(g); g.connect(pp); pp.connect(bus); send(pp, 0.25 + d * 0.5);
    const s = c.createOscillator(); s.frequency.setValueAtTime(f, t); s.frequency.exponentialRampToValueAtTime(f * rnd(1.5, 2.3), t + rnd(0.03, 0.06)); s.connect(lp);
    const dur = rnd(0.04, 0.09); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.start(t); s.stop(t + dur + 0.05);
    const n = c.createBufferSource(); n.buffer = NZ.pink; const hp = bq('highpass', 1800), ng = gn(0.0001); n.connect(hp); hp.connect(ng); ng.connect(pp); ng.gain.setValueAtTime(v * 0.5, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.006); n.start(t, rnd(0, 4)); n.stop(t + 0.02);
    if (o.splash !== false && Math.random() < 0.3) { const s2 = c.createOscillator(); const t2 = t + rnd(0.05, 0.12), f2 = f * rnd(1.3, 1.8); s2.frequency.setValueAtTime(f2, t2); s2.frequency.exponentialRampToValueAtTime(f2 * 1.6, t2 + 0.03); const g2 = gn(0.0001); s2.connect(g2); g2.connect(lp);
      g2.gain.setValueAtTime(0.0001, t2); g2.gain.linearRampToValueAtTime(0.35, t2 + 0.002); g2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.04); s2.start(t2); s2.stop(t2 + 0.08); } }
  /* 삐걱: 마찰 펄스열 → 공명(쇠: 높은 Q 두 모드 · 나무 · 밧줄: 낮고 넓은 모드) · 필터가 천천히 휨 */
  function creak(bus, t, o) { const s = c.createBufferSource(); s.buffer = pick(SLIP); const rate = rnd(0.7, 1.3); s.playbackRate.value = rate; const L = s.buffer.duration / rate;
    const g = gn(o.v), pp = pan(o.pan ?? rnd(-0.7, 0.7)); g.connect(pp); pp.connect(bus); send(pp, o.wet ?? 0.4);
    const base = o.f * rnd(0.85, 1.15);
    for (const [r, q, a] of o.modes) { const f = bq('bandpass', base * r, q), fg = gn(a); f.frequency.setValueAtTime(base * r, t); f.frequency.linearRampToValueAtTime(base * r * rnd(0.85, 1.25), t + L); s.connect(f); f.connect(fg); fg.connect(g); }
    s.start(t); s.stop(t + L + 0.05); }
  /* 지지직: 펄스 덩어리 → 높은 통과 · 같이 50Hz 계열 '브즈' 짧게 (멀리면 필터 닫고 울림) */
  function crackle(bus, t, o = {}) { const s = c.createBufferSource(); s.buffer = pick(CRK); s.playbackRate.value = rnd(0.8, 1.2); const L = s.buffer.duration / s.playbackRate.value, far = o.far ?? 0.6;
    const hp = bq('highpass', 900), lp = bq('lowpass', 5200 - far * 3200, 0.5), g = gn(o.v || 0.05), pp = pan(o.pan ?? rnd(-0.8, 0.8)); s.connect(hp); hp.connect(lp); lp.connect(g); g.connect(pp); pp.connect(bus); send(pp, 0.3 + far * 0.5); s.start(t); s.stop(t + L);
    if (Math.random() < 0.6) { const b = c.createOscillator(); b.type = 'sawtooth'; b.frequency.value = pick([100, 120]) * rnd(0.98, 1.02); const bf = bq('bandpass', 450, 1.5), bg = gn(0.0001); b.connect(bf); bf.connect(bg); bg.connect(pp);
      const d = Math.min(L, rnd(0.15, 0.5)); bg.gain.setValueAtTime(0.0001, t); bg.gain.linearRampToValueAtTime((o.v || 0.05) * 0.35, t + 0.01); bg.gain.setValueAtTime((o.v || 0.05) * 0.35, t + d * 0.8); bg.gain.exponentialRampToValueAtTime(0.0001, t + d); b.start(t); b.stop(t + d + 0.05); } }
  /* 파도: 밀려옴(갈색 잡음 · 필터 열림) → 부서짐(분홍 '쏴' + 거품) → 빠짐(필터 닫힘 · 자갈 굴러감) — 매번 길이 · 세기 · 자리 다름 */
  function wave(bus, t, o) { const up = rnd(1.6, 3.2), down = rnd(2.2, 4), v = o.v * rnd(0.7, 1.15), p = rnd(-0.6, 0.6), pp = pan(p); pp.connect(bus); send(pp, 0.25);
    const s = c.createBufferSource(); s.buffer = NZ.brown; s.loop = true; const f = bq('lowpass', 250, 0.6), g = gn(0.0001); s.connect(f); f.connect(g); g.connect(pp);
    f.frequency.setValueAtTime(250, t); f.frequency.linearRampToValueAtTime(rnd(900, 1400), t + up); f.frequency.exponentialRampToValueAtTime(220, t + up + down);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + up); g.gain.exponentialRampToValueAtTime(0.0001, t + up + down); s.start(t, rnd(0, 5)); s.stop(t + up + down + 0.1);
    const w = c.createBufferSource(); w.buffer = NZ.pink; w.loop = true; const wf = bq('bandpass', rnd(1300, 2000), 0.6), wl = bq('lowpass', 4500, 0.5), wg = gn(0.0001); w.connect(wf); wf.connect(wl); wl.connect(wg); wg.connect(pp);
    const tc = t + up * 0.9; wg.gain.setValueAtTime(0.0001, tc); wg.gain.linearRampToValueAtTime(v * 0.35, tc + 0.25); wf.frequency.setTargetAtTime(700, tc + 0.3, 0.8); wg.gain.exponentialRampToValueAtTime(0.0001, tc + down * 0.9); w.start(tc, rnd(0, 4)); w.stop(tc + down + 0.1); }
  /* 선체 · 말뚝 '통'(나무 모드 셋) · 먼 무적 · 수압 금속 신음(낮은 삐걱을 느리게) */
  function knock(bus, t, v) { const pp = pan(rnd(-0.7, 0.7)); pp.connect(bus); send(pp, 0.45); const f0 = rnd(80, 120);
    for (const [r, a, d] of [[1, 1, 0.35], [2.3, 0.45, 0.18], [4.1, 0.2, 0.08]]) { const s = c.createOscillator(); s.frequency.value = f0 * r; const g = gn(0.0001); s.connect(g); g.connect(pp); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * a, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.start(t); s.stop(t + d + 0.05); }
    const n = c.createBufferSource(); n.buffer = NZ.brown; const nf = bq('lowpass', 600), ng = gn(0.0001); n.connect(nf); nf.connect(ng); ng.connect(pp); ng.gain.setValueAtTime(v * 0.6, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); n.start(t, rnd(0, 5)); n.stop(t + 0.2); }
  function foghorn(bus, t, v) { const pp = pan(rnd(-0.5, 0.5)); pp.connect(bus); send(pp, 0.9); const f = bq('lowpass', 380, 0.7), g = gn(0.0001); f.connect(g); g.connect(pp); const L = rnd(2.2, 3);
    for (const det of [-5, 4]) { const s = c.createOscillator(); s.type = 'sawtooth'; s.frequency.value = 73.4; s.detune.value = det; s.connect(f); s.start(t); s.stop(t + L + 1.6); }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.5); g.gain.setValueAtTime(v, t + L); g.gain.exponentialRampToValueAtTime(0.0001, t + L + 1.5); }
  /* 물 쏟아짐 · 꿀럭(물방울 여럿이 낮게 몰림) */
  /* 공장: 먼 프레스 '쿵'(저음 미끄러짐 + 쇠 모드 · 울림 많이) · 쇠 부딪힘(비조화 모드 셋 · 멀리) · 증기 쉬익(높은 잡음이 빠르게 차오르고 길게 빠짐) */
  function thump(bus, t, v) { const pp = pan(rnd(-0.6, 0.6)); pp.connect(bus); send(pp, 0.7); const g = gn(0.0001); g.connect(pp); const s = c.createOscillator(); s.frequency.setValueAtTime(rnd(62, 74), t); s.frequency.exponentialRampToValueAtTime(34, t + 0.35); s.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); s.start(t); s.stop(t + 0.55);
    const f0 = rnd(150, 210); for (const [r, a, d] of [[1, 0.35, 0.9], [2.31, 0.18, 0.6], [3.9, 0.08, 0.35]]) { const o = c.createOscillator(); o.frequency.value = f0 * r; const og = gn(0.0001); o.connect(og); og.connect(pp); og.gain.setValueAtTime(0.0001, t + 0.01); og.gain.linearRampToValueAtTime(v * a, t + 0.014); og.gain.exponentialRampToValueAtTime(0.0001, t + d); o.start(t); o.stop(t + d + 0.05); } }
  function clang(bus, t, v) { const pp = pan(rnd(-0.9, 0.9)); pp.connect(bus); send(pp, 0.75); const lp = bq('lowpass', rnd(1800, 3200), 0.5); lp.connect(pp); const f0 = rnd(280, 720);
    for (const [r, a, d] of [[1, 1, 0.8], [2.76, 0.5, 0.5], [5.4, 0.25, 0.25]]) { const o = c.createOscillator(); o.frequency.value = f0 * r * rnd(0.99, 1.01); const og = gn(0.0001); o.connect(og); og.connect(lp); og.gain.setValueAtTime(0.0001, t); og.gain.linearRampToValueAtTime(v * a, t + 0.003); og.gain.exponentialRampToValueAtTime(0.0001, t + d * rnd(0.8, 1.3)); o.start(t); o.stop(t + d * 1.4 + 0.05); } }
  function hiss(bus, t, v) { const pp = pan(rnd(-0.8, 0.8)); pp.connect(bus); send(pp, 0.35); const s = c.createBufferSource(); s.buffer = NZ.pink; const hp = bq('highpass', 1800, 0.5), bp = bq('bandpass', rnd(3500, 5200), 0.7), g = gn(0.0001); s.connect(hp); hp.connect(bp); bp.connect(g); g.connect(pp);
    const L = rnd(0.8, 1.8); bp.frequency.setTargetAtTime(bp.frequency.value * 0.6, t + 0.2, L * 0.5); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + rnd(0.03, 0.1)); g.gain.exponentialRampToValueAtTime(0.0001, t + L); s.start(t, rnd(0, 4)); s.stop(t + L + 0.05); }
  function gurgle(bus, t, v) { const n = Math.round(rnd(3, 7)), p = rnd(-0.7, 0.7); for (let i = 0; i < n; i++) drip(bus, t + i * rnd(0.03, 0.08), { f: rnd(250, 600), v, pan: p + rnd(-0.1, 0.1), d: 0.5, splash: false }); }

  /* ───── 지도마다: 바닥 목록 · 상태 → 음량 · 사건 빠르기(초당) ───── */
  const MAPS = {
    ware: {
      beds: {
        flow: { kind: 'brown', f: [['bandpass', 420, 0.6], ['lowpass', 1100, 0.5]], wide: true, wet: 0.35, wander: { every: [1.5, 3.5], f: [0.8, 1.25], g: [0.8, 1.15], tc: 1.2 } },
        trickle: { kind: 'pink', f: [['bandpass', 1500, 0.9], ['lowpass', 3500, 0.5]], wet: 0.45, wander: { every: [0.4, 1.2], f: [0.85, 1.2], g: [0.6, 1.3], tc: 0.3 } },
        hum: { drone: 1, hz: [[120, 0.6, 'sawtooth'], [240, 0.4]], cut: 700, wet: 0.2, wander: { every: [2, 5], g: [0.85, 1.1] } },
        thrum: { drone: 1, hz: [[55, 1], [110, 0.6], [165, 0.35, 'triangle']], cut: 500, wet: 0.25, wander: { every: [0.8, 1.6], g: [0.7, 1.2], tc: 0.4 } },
      },
      lv: s => ({ flow: 0.13 + s.zone * 0.02 + (s.flood ? 0.02 : 0), trickle: 0.015 + (s.flood ? 0.012 : 0), hum: s.dark ? 0 : 0.03, thrum: s.zone === 3 && !s.dark ? 0.016 : 0 }),
      ev: s => ({ drip: 0.9 + s.zone * 0.4 + (s.flood ? 0.8 : 0), creak: 0.07 + (s.dark ? 0.05 : 0), spark: s.dark ? 0.12 : 0, gurgle: s.flood ? 0.15 : 0.05 }),
      fire: { drip: (b, t) => drip(b, t, { v: 0.12 }), creak: (b, t) => creak(b, t, { v: 0.1, f: rnd(380, 820), modes: [[1, 14, 1], [2.31, 12, 0.5]], wet: 0.5 }),
        spark: (b, t) => crackle(b, t, { v: 0.08, far: rnd(0.3, 0.8) }), gurgle: (b, t) => gurgle(b, t, 0.06) },
    },
    harbor: {
      beds: {
        wind: { kind: 'pink', f: [['bandpass', 520, 1.1], ['lowpass', 2400, 0.5]], wide: true, wet: 0.1, wander: { every: [1, 3], f: [0.6, 1.7], g: [0.5, 1.4], tc: 0.9 } },
        whistle: { kind: 'pink', f: [['bandpass', 1100, 9]], wide: true, wander: { every: [0.8, 2.2], f: [0.7, 1.4], g: [0.3, 1.5], tc: 0.6 } },
        lap: { kind: 'brown', f: [['bandpass', 330, 0.7], ['lowpass', 900, 0.5]], wide: true, wet: 0.15, wander: { every: [0.6, 1.6], f: [0.75, 1.35], g: [0.6, 1.3], tc: 0.4 } },
        rain: { kind: 'pink', f: [['highpass', 800, 0.5], ['lowpass', 3500, 0.5], ['peaking', 1700, 0.8, 3]], wide: true, wet: 0.1, wander: { every: [1.5, 4], f: [0.9, 1.1], g: [0.8, 1.2] } },
        buzz: { drone: 1, hz: [[120, 0.5, 'sawtooth'], [360, 0.15]], cut: 900, wet: 0.3, wander: { every: [0.3, 1.5], g: [0.4, 1.2], tc: 0.1 } },
      },
      lv: s => { const st = s.cond === 'storm', fog = s.cond === 'fog';
        return { wind: st ? 0.15 : fog ? 0.055 : 0.14, whistle: st ? 0.018 : 0, lap: 0.13 + (s.flood ? 0.04 : 0), rain: st ? 0.06 : 0, buzz: s.dark ? 0 : 0.01 }; },
      ev: s => { const st = s.cond === 'storm'; return { wave: st ? 0.32 : 0.18, rope: st ? 0.22 : 0.1, knock: st ? 0.12 : 0.05, horn: s.cond === 'fog' ? 1 / 28 : 0, drip: 0.25 }; },
      fire: { wave: (b, t, s) => wave(b, t, { v: s.cond === 'storm' ? 0.24 : 0.16 }),
        rope: (b, t) => creak(b, t, { v: 0.09, f: rnd(170, 300), modes: [[1, 5, 1], [2.7, 4, 0.4]], wet: 0.2 }),
        knock: (b, t) => knock(b, t, 0.1), horn: (b, t) => foghorn(b, t, 0.04), drip: (b, t) => drip(b, t, { v: 0.06, f: rnd(400, 900), d: rnd(0.3, 1) }) },
    },
    tunnel: { gain: 0.78,
      beds: {
        press: { drone: 1, hz: [[41, 1], [82, 0.7], [123, 0.45, 'triangle'], [164, 0.2]], cut: 380, wet: 0.3, wander: { every: [2.5, 6], g: [0.55, 1.35], tc: 2.2 } },
        hiss: { kind: 'pink', f: [['bandpass', 2100, 0.9], ['lowpass', 4200, 0.5]], wet: 0.5, wander: { every: [0.2, 0.8], f: [0.85, 1.2], g: [0.6, 1.25], tc: 0.15 } },
        elec: { drone: 1, hz: [[100, 0.5, 'sawtooth'], [200, 0.3], [300, 0.12]], cut: 800, wet: 0.4, wander: { every: [0.5, 2], g: [0.5, 1.2], tc: 0.2 } },
        rush: { kind: 'pink', f: [['bandpass', 650, 0.5], ['lowpass', 2200, 0.5]], wide: true, wet: 0.35, wander: { every: [0.3, 1], f: [0.75, 1.3], g: [0.7, 1.3], tc: 0.25 } },
        rumble: { kind: 'brown', f: [['lowpass', 260, 0.6]], wide: true, wet: 0.3, wander: { every: [0.5, 1.5], f: [0.8, 1.3], g: [0.7, 1.3], tc: 0.4 } },
      },
      lv: s => { const rap = s.cond === 'rapids';
        return { press: 0.026 + s.zone * 0.004, hiss: 0.007 + s.zone * 0.002, elec: s.dark ? 0 : 0.006, rush: (rap ? 0.025 : 0.008) + (s.surge ? 0.045 : 0) + (s.flood ? 0.02 : 0), rumble: 0.025 + (s.surge ? 0.035 : 0) }; },
      ev: s => ({ drip: 1.1 + s.zone * 0.3, spark: s.dark ? 0.06 : 0.16, groan: 0.04 + s.zone * 0.02, gurgle: s.surge ? 0.6 : 0.1 }),
      fire: { drip: (b, t) => drip(b, t, { v: 0.055, d: rnd(0.2, 1) }), spark: (b, t, s) => crackle(b, t, { v: s.dark ? 0.06 : 0.035, far: rnd(0.5, 1) }),
        groan: (b, t) => creak(b, t, { v: 0.06, f: rnd(110, 220), modes: [[1, 22, 1], [1.5, 16, 0.4], [2.6, 12, 0.25]], wet: 0.7 }), gurgle: (b, t) => gurgle(b, t, 0.035) },
    },
    /* 가라앉은 공장 (M3-B) */
    factory: { gain: 0.62, /* M6-D 라운드니스: 배경음 대비 −5.8 → −7 LU 안팎 */
      beds: {
        flow: { kind: 'brown', f: [['bandpass', 380, 0.6], ['lowpass', 1000, 0.5]], wide: true, wet: 0.35, wander: { every: [1.5, 3.5], f: [0.8, 1.25], g: [0.8, 1.15], tc: 1.2 } },
        machine: { drone: 1, hz: [[49, 1], [98, 0.6], [147, 0.3, 'triangle'], [196, 0.12, 'sawtooth']], cut: 420, wet: 0.35, wander: { every: [1.2, 2.6], g: [0.6, 1.3], tc: 0.5 } },
        steam: { kind: 'pink', f: [['bandpass', 4200, 0.9], ['highpass', 1800, 0.5]], wide: true, wet: 0.3, wander: { every: [0.3, 1.2], f: [0.8, 1.25], g: [0.4, 1.4], tc: 0.25 } },
        roar: { kind: 'brown', f: [['lowpass', 320, 0.7], ['peaking', 120, 1, 4]], wide: true, wet: 0.25, wander: { every: [0.4, 1.4], f: [0.8, 1.3], g: [0.7, 1.3], tc: 0.4 } },
        hum: { drone: 1, hz: [[60, 0.6, 'sawtooth'], [120, 0.3]], cut: 600, wet: 0.2, wander: { every: [2, 5], g: [0.85, 1.1] } },
      },
      lv: s => ({ flow: 0.07 + (s.flood ? 0.05 : 0), machine: s.dark ? 0.012 : 0.03 + s.zone * 0.006, steam: s.cond === 'steam' ? 0.03 : 0.007, roar: s.cond === 'overheat' ? 0.06 : 0.018 + (s.zone === 2 ? 0.014 : 0), hum: s.dark ? 0 : 0.018 }),
      ev: s => ({ thump: s.dark ? 0.2 : 0.55, clang: 0.16 + s.zone * 0.04, hiss: s.cond === 'steam' ? 0.35 : 0.1, drip: 0.5, spark: s.dark ? 0.12 : 0.04, chain: 0.06, gurgle: s.flood ? 0.15 : 0.04 }),
      fire: { thump: (b, t) => thump(b, t, 0.12), clang: (b, t) => clang(b, t, 0.045), hiss: (b, t) => hiss(b, t, 0.045), drip: (b, t) => drip(b, t, { v: 0.05, d: rnd(0.3, 1) }),
        spark: (b, t) => crackle(b, t, { v: 0.05, far: rnd(0.4, 0.9) }), chain: (b, t) => creak(b, t, { v: 0.05, f: rnd(600, 1100), modes: [[1, 18, 1], [2.7, 14, 0.5]], wet: 0.6 }), gurgle: (b, t) => gurgle(b, t, 0.04) },
    },
    /* 심해 연구소 (M4-B): 넓은 타일 홀 — 낮은 냉각기 웅(두 음 맥놀이) · 유리 수조 거품 · 먼 파수 신호음(두 음 · 아주 작게) · 수압 문 삐걱 · 물방울 · 높은 형광 지잉 */
    lab: { gain: 0.72,
      beds: {
        cool: { drone: 1, hz: [[55, 1], [55.6, 0.8], [110, 0.35], [330, 0.08, 'triangle']], cut: 380, wet: 0.45, wander: { every: [1.5, 3.5], g: [0.7, 1.2], tc: 0.8 } },
        flow: { kind: 'brown', f: [['bandpass', 300, 0.6], ['lowpass', 900, 0.5]], wide: true, wet: 0.45, wander: { every: [1.5, 3.5], f: [0.8, 1.2], g: [0.8, 1.15], tc: 1.2 } },
        tube: { drone: 1, hz: [[1760, 0.4, 'sine'], [3520, 0.12]], cut: 5000, wet: 0.5, wander: { every: [2, 5], g: [0.5, 1.2] } },
      },
      lv: s => ({ cool: s.dark ? 0.01 : 0.026 + s.zone * 0.004, flow: 0.05 + (s.flood ? 0.05 : 0) + (s.cond === 'leak' ? 0.03 : 0), tube: s.dark ? 0 : 0.0035 }),
      ev: s => ({ bub: 0.6 + (s.cond === 'bloom' ? 0.4 : 0), drip: 0.9 + s.zone * 0.2, ping: 0.05, groan: 0.05 + (s.cond === 'lockdown' ? 0.06 : 0), spark: s.dark ? 0.1 : 0.02, gurgle: s.flood ? 0.15 : 0.05 }),
      fire: { bub: (b, t) => gurgle(b, t, 0.02), drip: (b, t) => drip(b, t, { v: 0.05, d: rnd(0.3, 1) }),
        ping: (b, t) => { for (const [f, d] of [[880, 0], [1318.5, 0.22]]) { const o = c.createOscillator(), g = gn(0.0001), p = pan(rnd(-0.6, 0.6)); o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + d); g.gain.linearRampToValueAtTime(0.012, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.4); o.connect(g); g.connect(p); p.connect(b); send(g, 0.9); o.start(t + d); o.stop(t + d + 1.5); } },
        groan: (b, t) => creak(b, t, { v: 0.05, f: rnd(140, 260), modes: [[1, 20, 1], [1.7, 14, 0.4]], wet: 0.7 }), spark: (b, t) => crackle(b, t, { v: 0.04, far: rnd(0.5, 1) }), gurgle: (b, t) => gurgle(b, t, 0.035) },
    },
  };
  /* M4-B 판 상태 5 겹침 (어느 지도든): 한파 = 찬 바람 휘파람 · 얼음 우지끈 / 독수 = 걸쭉한 거품 · 낮은 웅 / 폭풍(항구 밖) = 빗소리 */
  const WXL = {
    beds: {
      icew: { kind: 'pink', f: [['bandpass', 1500, 2.2], ['highpass', 700, 0.5]], wide: true, wet: 0.4, wander: { every: [0.4, 1.4], f: [0.7, 1.4], g: [0.4, 1.4], tc: 0.3 } },
      toxh: { drone: 1, hz: [[73.4, 0.8, 'sawtooth'], [74.2, 0.6]], cut: 260, wet: 0.3, wander: { every: [2, 4], g: [0.7, 1.2] } },
      rainw: { kind: 'pink', f: [['highpass', 2200, 0.5], ['lowpass', 9000, 0.5]], wide: true, wet: 0.2, wander: { every: [0.5, 1.5], f: [0.9, 1.1], g: [0.8, 1.2], tc: 0.4 } },
    },
    lv: s => ({ icew: s.wx === 'cold' ? 0.022 : 0, toxh: s.wx === 'toxic' ? 0.014 : 0, rainw: s.wx === 'storm' && s.map !== 'harbor' ? 0.03 : 0 }),
    ev: s => ({ ice: s.wx === 'cold' ? 0.35 : 0, tox: s.wx === 'toxic' ? 0.9 : 0 }),
    fire: { ice: (b, t) => { creak(b, t, { v: 0.05, f: rnd(1800, 2600), modes: [[1, 30, 1], [2.3, 22, 0.5]], wet: 0.5 }); crackle(b, t + 0.05, { v: 0.03, far: 0.3 }); },
      tox: (b, t) => { for (let i = 0; i < 3; i++) gurgle(b, t + i * rnd(0.04, 0.12), 0.025); } },
  };
  for (const M of Object.values(MAPS)) { Object.assign(M.beds, WXL.beds); const lv = M.lv, ev = M.ev; M.lv = s => ({ ...lv(s), ...WXL.lv(s) }); M.ev = s => ({ ...ev(s), ...WXL.ev(s) }); Object.assign(M.fire, WXL.fire); }

  MAPS.gate = { ...MAPS.harbor, gain: (MAPS.harbor.gain || 1) * 0.9 }; /* M6-D: 대수문 꼭대기도 바다 위 바람 · 파도 · 폭풍(항구 소리 재사용) — 전엔 환경음 없음(측정 −99) */
  /* ───── 엔진 ───── */
  let cur = null;
  function start(map, at) {
    const M = MAPS[map]; if (!M) return null;
    const bus = gn(0.0001); bus.connect(out); bus.gain.setTargetAtTime(M.gain || 1, at, 0.8);
    const beds = {}; for (const [k, sp] of Object.entries(M.beds)) beds[k] = sp.drone ? drone(sp, bus, at) : bed(sp, bus, at);
    return { map, M, bus, beds, next: {}, st: null };
  }
  function stopCur(at) { if (!cur) return; const k = cur; cur = null; k.bus.gain.setTargetAtTime(0.0001, at, 0.5); for (const b of Object.values(k.beds)) b.stop(at); }
  const key = s => [s.zone, s.cond, s.dark, s.surge, s.flood, s.wx].join();
  return {
    /* 상태: { map, zone 1~3, cond normal|storm|fog|clear|dark|rapids|calm, dark 정전 · 등불 꺼짐, surge 급류 25초, flood 침수 시작 } */
    set(s, at = c.currentTime) {
      if (!cur || cur.map !== s.map) { stopCur(at); cur = start(s.map, at); if (!cur) return; }
      if (cur.st !== key(s)) { /* 정전이 막 시작되면 불꽃 · 지지직 한 번 */
        if (cur.s && !cur.s.dark && s.dark) for (let i = 0; i < 3; i++) crackle(cur.bus, at + i * rnd(0.05, 0.2), { v: 0.08, far: 0.2 });
        cur.st = key(s); cur.s = s; const L = cur.M.lv(s); for (const [k, v] of Object.entries(L)) cur.beds[k]?.level(v, at, cur.first ? 1.5 : 1); cur.first = true; cur.rate = cur.M.ev(s); }
      for (const b of Object.values(cur.beds)) b.wander(at);
    },
    /* 사건 예약: 포아송(간격 = 지수 분포) — 0.25초마다 앞으로 0.7초까지 */
    pump(until, t0 = c.currentTime) { if (!cur || !cur.rate) return;
      for (const [k, r] of Object.entries(cur.rate)) { if (!(r > 0)) { cur.next[k] = 0; continue; }
        if (!cur.next[k] || cur.next[k] < t0 - 0.1) cur.next[k] = t0 + rnd(0.05, 1) / r * 0.5;
        while (cur.next[k] < until) { cur.M.fire[k](cur.bus, cur.next[k], cur.s); cur.next[k] += -Math.log(1 - Math.random()) / r; } } },
    stop(at = c.currentTime) { stopCur(at); },
    now: () => cur && { map: cur.map, st: cur.st },
  };
}
