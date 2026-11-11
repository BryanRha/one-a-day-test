// 플레이 화면 그리기 (캔버스 2D) — 시안 E 의 원근 레인(하이웨이)을 움직이게
//   좌표는 시안과 같은 390×844 논리 좌표 · 판정선 y=690 · 소실점 쪽 y=110
//   d = 판정선에서 떨어진 거리(노트가 판정선까지 남은 시간 × 속도)
export const GEO = { L: 4, LW: 80, HZ: 110, YJ: 690, CX: 195, K: 0.11, DMAX: 48, DK: -1.55 };
const C = {
  surface: '7,10,30', line: '207,239,255', edge: '159,240,255', judge: '#ffffff',
  note: ['#D6F6FF', '#C9B6FF', '#C9B6FF', '#D6F6FF'], noteGlow: ['159,240,255', '195,173,255', '195,173,255', '159,240,255'],
  long: '159,240,255', fader: '120,240,200', sc: '#FFD27A', cue: '#FF5F73', beam: ['159,240,255', '195,173,255', '195,173,255', '159,240,255'],
  hit: { perfect: ['255,255,255', '159,240,255'], great: ['230,220,255', '195,173,255'], good: ['200,210,230', '140,160,200'] },
};
const { L, LW, HZ, YJ, CX, K, DMAX, DK } = GEO;
export const P = (u, d) => { const z = 1 + d * K; return [CX + (u - L / 2) * LW / z, HZ + (YJ - HZ) / z]; };
/* 화면 x → 레인 (판정선 근처 레인 폭을 화면 끝까지 넓힘) */
export const laneAt = x => Math.max(0, Math.min(L - 1, Math.floor((x - (CX - L / 2 * LW)) / LW)));
/* 화면 x → 레인 좌표(소수) · 페이더 손잡이가 손가락을 따라가게 (0 ~ L 안) */
export const laneU = x => Math.max(0.02, Math.min(L - 0.02, (x - (CX - L / 2 * LW)) / LW));
/* 큐 3 · 2 · 1 (v0.5.1 · 검수 B-2 — docs/FEEL.md 10-2): 숫자를 노트가 아니라 그 레인 판정선 위 고정 자리에 크게 · 박마다 튐
   원인: 숫자를 원근 레인의 노트에 붙이면 먼 곳 「3」이 가장 작음(10px) · 「2」가 화면 가운데 콤보와 겹침
   CUE_SPOT.d = 판정선에서의 거리(레인 좌표) → 화면 y ≈ 578 (콤보 262~360 · 판정 글자 452~510 아래) · size = 글자 크기(px, 튀는 순간 ×1.35) */
export const CUE_SPOT = { d: 2.2, size: 48, pop: 0.35 };
/* 박 지도 기준 남은 박 → 숫자(1~3)와 튐(박 직후 1 → 0) · 0 이 되는 박이 치는 순간 */
export function cueCount(noteBeat, beatNow) { const left = noteBeat - beatNow, num = Math.ceil(left - 1e-9); if (num < 1 || num > 3) return null; const k = num - left; return { num, pop: Math.pow(1 - k, 3) }; }

export function makeRenderer(cv) {
  const g = cv.getContext('2d');
  let W = 390, H = 844, ratio = 1;
  const quad = (u0, u1, d0, d1) => { const a = P(u0, d0), b = P(u1, d0), c = P(u1, d1), e = P(u0, d1); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(e[0], e[1]); g.closePath(); };
  const line = (x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
  const yFar = P(0, DMAX)[1];
  let surf, lineG, edgeG, edgeF, beamG = [], longG, longH, jglow, acc = C.edge;
  let beamKey = '';
  /* 키빔 그라데이션 · 테마 보조 색(레인 바깥 테두리 · 판정선 · 판정선 빛)은 테마가 바뀔 때만 한 번 만듦 (프레임마다 만들지 않음)
     v0.5.1 검수 B-5: 테마 차이가 PERFECT 파티클 모양뿐이라 폰에서 안 보임 → '늘 보이는 면'(테두리 · 판정선 · 키 패드)에 캐스트 색 */
  function beams(th) {
    const k = th.press + th.edgeFever.join('|') + (th.accent || ''); if (k === beamKey) return; beamKey = k;
    acc = th.accent || C.edge;
    edgeG = g.createLinearGradient(0, yFar, 0, YJ); edgeG.addColorStop(0, `rgba(${acc},0)`); edgeG.addColorStop(1, `rgba(${acc},.95)`);
    jglow = document.createElement('canvas'); jglow.width = 256; jglow.height = 48;
    { const jg = jglow.getContext('2d'), v = jg.createLinearGradient(0, 0, 0, 48); v.addColorStop(0, `rgba(${acc},0)`); v.addColorStop(0.5, `rgba(${acc},.9)`); v.addColorStop(1, `rgba(${acc},0)`); jg.fillStyle = v; jg.fillRect(0, 0, 256, 48); }
    /* 키빔 = 판정과 무관한 '누름' 표시: 중립 흰빛 · 약하게 · 짧게 (v0.3.1 검수 A1 — 판정 위계를 가리지 않게) */
    const y0 = YJ, y1 = P(0, 12)[1], gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, `rgba(${th.press},.26)`); gr.addColorStop(0.45, `rgba(${th.press},.07)`); gr.addColorStop(1, `rgba(${th.press},0)`);
    beamG = [gr, gr, gr, gr];
    edgeF = g.createLinearGradient(0, yFar, 0, YJ); edgeF.addColorStop(0, `rgba(${th.edgeFever[1]},0)`); edgeF.addColorStop(0.5, `rgba(${th.edgeFever[1]},.7)`); edgeF.addColorStop(1, `rgba(${th.edgeFever[0]},1)`);
  }
  function grads() {
    beamKey = '';
    surf = g.createLinearGradient(0, yFar, 0, P(0, DK)[1]);
    surf.addColorStop(0, `rgba(${C.surface},0)`); surf.addColorStop(0.55, `rgba(${C.surface},.62)`); surf.addColorStop(1, `rgba(${C.surface},.82)`);
    lineG = g.createLinearGradient(0, yFar, 0, YJ); lineG.addColorStop(0, `rgba(${C.line},0)`); lineG.addColorStop(1, `rgba(${C.line},.3)`);
    /* 롱노트 몸통: 화면 전체 높이 기준 그라데이션 하나 (먼 곳 흐림 → 가까운 곳 진함) · 잡은 상태용 하나 */
    longG = g.createLinearGradient(0, yFar, 0, YJ); longG.addColorStop(0, `rgba(${C.long},.12)`); longG.addColorStop(1, `rgba(${C.long},.55)`);
    longH = g.createLinearGradient(0, yFar, 0, YJ); longH.addColorStop(0, `rgba(${C.long},.25)`); longH.addColorStop(1, `rgba(${C.long},.9)`);
    /* 레인 테두리 · 판정선 빛(shadowBlur 대신 미리 그린 그림)은 테마 보조 색이라 beams() 에서 만듦 */
  }
  function resize(w, h, dpr) {
    W = w; H = h; ratio = dpr;
    cv.width = Math.round(390 * dpr); cv.height = Math.round(844 * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0); grads();
  }
  resize(390, 844, Math.min(3, window.devicePixelRatio || 1));

  function draw(s) {
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.clearRect(0, 0, 390, 844);
    const spd = s.spd, p = s.p, dOf = t => (t - p) * spd, th = s.theme, pulse = s.pulse || 0, fev = s.fever || 0;
    beams(th);
    /* 1 표면 */
    quad(0, L, DK, DMAX); g.fillStyle = surf; g.fill();
    /* 2 박자선 (마디선은 밝게) */
    const ck = s.clk, b0 = Math.ceil(ck.beatOf(p)), b1 = Math.floor(ck.beatOf(p + DMAX / spd));
    g.lineWidth = 1;
    for (let b = b0; b <= b1; b++) {
      const d = dOf(ck.at(b)); if (d < 0 || d > DMAX) continue;
      const a = P(0, d), e = P(L, d), bar = b % 4 === 0;
      g.strokeStyle = `rgba(${C.line},${Math.max(0, (bar ? 0.34 : 0.16) - d * 0.006)})`; line(a[0], a[1], e[0], e[1]);
    }
    /* 3 누른 레인 빛기둥 */
    for (let l = 0; l < L; l++) {
      const f = s.flash[l]; if (f <= 0.01) continue;
      g.globalAlpha = Math.min(1, f); quad(l + 0.04, l + 0.96, 0, 12); g.fillStyle = beamG[l]; g.fill(); g.globalAlpha = 1;
    }
    /* 4 레인 구분선 */
    /* 레인 테두리: 박에 맞춰 밝아짐 · 피버면 테마 색으로 물듦 */
    for (let u = 0; u <= L; u++) {
      const a = P(u, DK), e = P(u, DMAX), out = u === 0 || u === L;
      if (!out) { g.strokeStyle = lineG; g.lineWidth = 1; line(a[0], a[1], e[0], e[1]); continue; }
      g.globalAlpha = 0.7 + 0.3 * pulse; g.strokeStyle = edgeG; g.lineWidth = 1.6 + pulse * 1.2; line(a[0], a[1], e[0], e[1]);
      if (fev > 0.02) { g.globalAlpha = fev; g.strokeStyle = edgeF; g.lineWidth = 2.4 + pulse * 1.5; line(a[0], a[1], e[0], e[1]); }
      g.globalAlpha = 1;
    }
    /* 4-1 판정선 빛 (노트 아래 — 노트가 판정선에서 하얗게 타지 않게) */
    { const j0 = P(-0.05, 0), j1 = P(L + 0.05, 0); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (0.4 + pulse * 0.3) * (s.fx ? 0.3 + 0.7 * (s.fx.st.k ?? 1) : 1); g.drawImage(jglow, j0[0] - 10, YJ - 16 - pulse * 4, j1[0] - j0[0] + 20, 32 + pulse * 8); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    /* 4-2 타격 이펙트 (fx.js · 객체 풀) — 노트보다 아래: 촘촘한 구간에도 노트가 늘 보이게 (검수 A2) */
    if (s.fx) s.fx.draw(g, s.now, s.dt || 0.016, s.held, pulse, ratio);
    /* 5 노트 */
    g.globalCompositeOperation = 'source-over';
    const ns = s.notes, tFar = p + DMAX / spd;
    while (s.drawFrom < ns.length && ns[s.drawFrom].end < p - 0.6) s.drawFrom++;
    /* 4-3 큐 3 · 2 · 1: 그 레인 판정선 위 고정 자리 · 박마다 튐 (노트 아래에 그림) */
    for (let i = s.drawFrom; i < ns.length; i++) {
      const n = ns[i]; if (n.t > tFar) break;
      if (n.sp !== 'cue' || n.head) continue;
      const c = cueCount(n.beat, s.clk.beatOf(p)); if (!c) continue;
      const q = P(n.l + 0.5, CUE_SPOT.d), sz = Math.round(CUE_SPOT.size * (1 + CUE_SPOT.pop * c.pop));
      g.font = `700 ${sz}px 'Rajdhani',sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = `rgba(255,95,115,${0.22 + 0.3 * c.pop})`; g.beginPath(); g.arc(q[0], q[1], 27 + 8 * c.pop, 0, Math.PI * 2); g.fill();
      g.lineWidth = 3; g.strokeStyle = 'rgba(40,6,14,.75)'; g.strokeText(String(c.num), q[0], q[1] + 2);
      g.fillStyle = c.pop > 0.5 ? '#ffffff' : '#ffd2da'; g.fillText(String(c.num), q[0], q[1] + 2);
    }
    const chordY = [];
    for (let i = s.drawFrom; i < ns.length; i++) {
      const n = ns[i]; if (n.t > tFar) break;
      if (n.sp === 'fader') drawFader(n, dOf, s);
      else if (n.kind === 'long') drawLong(n, dOf, s);
      else if (!n.head || n.head === 'miss') drawTap(n, dOf(n.t), n.head === 'miss' || p - n.t > (s.missAt || 0.15), s);
      /* 막 친 노트: 터짐이 그려지기 전 빈 프레임이 없게 0.035초 동안 판정선에서 노트 색으로 사라짐 (검수 B1) */
      else if (n.hitAt && s.now - n.hitAt < 0.035) { g.globalAlpha = 0.8 * (1 - (s.now - n.hitAt) / 0.035); quad(n.l + 0.06, n.l + 0.94, -0.05, 0.4); g.fillStyle = C.note[n.l]; g.fill(); g.globalAlpha = 1; }
      if (n.chord && !n.head && n.pair > n.id) chordY.push(n);
    }
    /* 동시치기 잇는 줄 */
    for (const n of chordY) {
      const m = ns[n.pair], d = dOf(n.t); if (d < 0 || d > DMAX) continue;
      const lo = Math.min(n.l, m.l) + 0.94, hi = Math.max(n.l, m.l) + 0.06; if (hi <= lo) continue;
      const a = P(lo, d + 0.25), b = P(hi, d + 0.25);
      g.strokeStyle = `rgba(255,255,255,${0.75 - d * 0.01})`; g.lineWidth = Math.max(1, 3 / (1 + d * K)); line(a[0], a[1], b[0], b[1]);
    }
    /* 6 판정선 */
    const j0 = P(-0.05, 0), j1 = P(L + 0.05, 0);
    g.strokeStyle = `rgba(${acc},.9)`; g.lineWidth = 3; line(j0[0], j0[1], j1[0], j1[1]);
    g.strokeStyle = '#fff'; g.lineWidth = 1.2; line(j0[0], j0[1], j1[0], j1[1]);
    /* 7 키 패드 — 페이더를 미는 손가락은 출발 레인이 아니라 손가락이 있는 레인이 눌린 것으로 보임 (검수 B-1) */
    const pad = s.pressed.slice();
    if (s.slideU) for (let l = 0; l < L; l++) { const u = s.slideU[l]; if (u == null || !s.held[l]) continue; pad[l] = false; pad[Math.min(L - 1, Math.floor(u))] = true; }
    for (let l = 0; l < L; l++) {
      const on = pad[l], f = s.flash[l];
      quad(l + 0.05, l + 0.95, -0.22, DK + 0.05);
      g.fillStyle = on ? `rgba(${th.beam[l]},${0.18 + 0.2 * f})` : 'rgba(8,10,28,.85)'; g.fill();
      g.strokeStyle = on ? `rgba(${th.beam[l]},1)` : `rgba(${th.accent ? acc : '159,180,216'},.55)`; g.lineWidth = on ? 1.6 : 1; g.stroke();
      const a = P(l + 0.3, -0.9), b = P(l + 0.7, -0.9);
      g.strokeStyle = on ? 'rgba(255,255,255,.9)' : 'rgba(159,180,216,.5)'; g.lineWidth = 2; g.lineCap = 'round'; line(a[0], a[1], b[0], b[1]); g.lineCap = 'butt';
    }

  }

  function drawTap(n, d, missed, s) {
    if (d > DMAX || d < DK) return;
    const a = missed ? Math.max(0, 0.45 + d * 0.3) : 1; if (a <= 0) return;
    const l = n.l;
    g.globalAlpha = a;
    /* 노트 + 부드러운 빛 */
    /* 판정선 가까이: 어두운 밑받침 → 이펙트 빛 위에서도 노트 윤곽이 보임 (검수 A2 가시성 하한) */
    if (!missed && d < 9) { quad(l + 0.02, l + 0.98, d - 0.12, d + 0.62); g.fillStyle = `rgba(4,6,20,${0.55 * (1 - d / 9)})`; g.fill(); }
    /* 빛: shadowBlur 대신 조금 큰 반투명 사각형 하나 (폰에서 가벼움) */
    if (!missed) { quad(l + 0.01, l + 0.99, d - 0.22, d + 0.72); g.fillStyle = `rgba(${C.noteGlow[l]},${0.16 + 0.12 / (1 + d * K)})`; g.fill(); }
    const sp = missed ? null : n.sp;
    quad(l + 0.06, l + 0.94, d, d + 0.5); g.fillStyle = missed ? 'rgba(120,130,160,.7)' : sp === 'sc' ? C.sc : sp === 'cue' ? C.cue : C.note[l]; g.fill();
    if ((n.chord || sp) && !missed) { g.strokeStyle = sp === 'sc' ? '#FFF6D8' : '#fff'; g.lineWidth = sp ? 2 : 1.4; g.stroke(); }
    const p1 = P(l + 0.12, d + 0.1), p2 = P(l + 0.88, d + 0.1);
    g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = Math.max(1, 2.4 / (1 + d * K)); line(p1[0], p1[1], p2[0], p2[1]);
    /* 슈퍼챗: 금빛 + 가운데 작은 동전(₩) · 큐: 빨간 ON AIR 램프 */
    if (sp && d < DMAX - 2) {
      const c = P(l + 0.5, d + 0.25), z = 1 / (1 + d * K), r = 9 * z + 2;
      if (sp === 'sc') { g.fillStyle = '#7a4a00'; g.beginPath(); g.arc(c[0], c[1], r, 0, Math.PI * 2); g.fill(); g.fillStyle = '#FFE6A8'; g.font = `800 ${Math.round(r * 1.4)}px 'Rajdhani',sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('₩', c[0], c[1] + 0.5); }
      else { g.fillStyle = '#fff'; g.beginPath(); g.arc(c[0], c[1], r * 0.55, 0, Math.PI * 2); g.fill(); }   /* 큐 노트에는 빨간 램프만 (숫자는 판정선 위 고정 자리 — 4-3) */
    }
    g.globalAlpha = 1;
  }
  /* 페이더: 머리 레인에서 목표 레인으로 비스듬히 건너는 띠 (시간 따라 레인이 옮겨 감) · 손잡이 머리 · 띠 위 화살표 */
  function drawFader(n, dOf, s) {
    const held = n.holding, dead = n.head === 'miss' || n.tail === 'miss' || n.tail === 'good';
    if (n.tail && !dead) return;
    const p = s.p, span = Math.max(0.01, n.end - n.t), uAt = t => n.l + (n.to - n.l) * Math.min(1, Math.max(0, (t - n.t) / span));
    let t1 = held ? p : n.t; const t2 = n.end;
    if (dOf(t2) < DK) return;
    if (dOf(t1) > DMAX) return;
    t1 = Math.max(t1, p + DK / s.spd);
    const N = 10, LL = [], RR = [];
    for (let k = 0; k <= N; k++) { const t = t1 + (t2 - t1) * k / N, d = Math.min(DMAX, dOf(t)), u = uAt(t); LL.push(P(u + 0.14, d)); RR.push(P(u + 0.86, d)); }
    g.globalAlpha = dead ? 0.35 : 1;
    g.beginPath(); g.moveTo(LL[0][0], LL[0][1]); for (const q of LL) g.lineTo(q[0], q[1]); for (let k = RR.length - 1; k >= 0; k--) g.lineTo(RR[k][0], RR[k][1]); g.closePath();
    g.fillStyle = dead ? 'rgba(120,130,160,.35)' : `rgba(${C.fader},${held ? (n.reached ? 0.75 : 0.5) : 0.32})`; g.fill();
    g.strokeStyle = dead ? 'rgba(140,150,180,.6)' : `rgba(${C.fader},1)`; g.lineWidth = 1.6; g.stroke();
    /* 화살표 (목표 쪽으로) — 띠 위로 흐름 */
    if (!dead) {
      const dir = Math.sign(n.to - n.l), ph = (s.now * 2.2) % 1;
      g.strokeStyle = `rgba(255,255,255,${held ? 0.95 : 0.7})`; g.lineWidth = 2; g.lineCap = 'round';
      for (let k = 0; k < 4; k++) {
        const f = (k + ph) / 4, t = t1 + (t2 - t1) * f, d = dOf(t); if (d < 0 || d > DMAX) continue;
        const u = uAt(t) + 0.5, c = P(u, d), z = 1 / (1 + d * K), w = 9 * z;
        g.beginPath(); g.moveTo(c[0] - dir * w, c[1] - w * 0.7); g.lineTo(c[0] + dir * w * 0.3, c[1]); g.lineTo(c[0] - dir * w, c[1] + w * 0.7); g.stroke();
      }
      g.lineCap = 'butt';
    }
    /* 손잡이 머리 (안 잡았을 때) · 목표 표시 (꼬리 끝) */
    if (!held && dOf(n.t) >= DK) { const d1 = dOf(n.t); quad(n.l + 0.04, n.l + 0.96, d1, d1 + 0.55); g.fillStyle = dead ? 'rgba(130,140,170,.7)' : '#EFFFF8'; g.fill(); g.strokeStyle = `rgba(${C.fader},1)`; g.lineWidth = 2; g.stroke(); const a = P(n.l + 0.5, d1 + 0.05), b = P(n.l + 0.5, d1 + 0.5); g.strokeStyle = 'rgba(20,60,50,.8)'; g.lineWidth = 2; line(a[0], a[1], b[0], b[1]); }
    if (dOf(t2) <= DMAX) { const d2 = dOf(t2); quad(n.to + 0.1, n.to + 0.9, d2, d2 + 0.4); g.fillStyle = dead ? 'rgba(130,140,170,.6)' : `rgba(${C.fader},1)`; g.fill(); }
    /* 잡고 있는데 아직 못 닿음: 목표 레인 판정선 자리에 민트 화살표가 깜빡 (어디로 밀지 한눈에) */
    if (held && !n.reached && !dead) {
      const dir = Math.sign(n.to - n.l), c = P(n.to + 0.5, 0.3), w = 13, ph = 0.5 + 0.5 * Math.sin(s.now * 18);
      g.globalAlpha = 0.55 + 0.45 * ph; g.strokeStyle = `rgba(${C.fader},1)`; g.lineWidth = 3; g.lineCap = 'round';
      for (const o of [-10, 4]) { g.beginPath(); g.moveTo(c[0] + dir * (o - w * 0.6), c[1] - w * 0.8); g.lineTo(c[0] + dir * o, c[1]); g.lineTo(c[0] + dir * (o - w * 0.6), c[1] + w * 0.8); g.stroke(); }
      g.lineCap = 'butt';
    }
    /* 잡은 동안: 판정선 위 손잡이가 손가락 자리를 따라감 (출발 레인 → 손가락 사이 민트 줄) — 손은 옆 레인인데 화면은 원래 자리를 누르는 어긋남 없앰 (검수 B-1) */
    if (held && !dead) {
      const su = s.slideU && s.slideU[n.l], hu = su != null ? su : n.reached ? n.to + 0.5 : n.l + 0.5, a = P(n.l + 0.5, 0.25), b = P(hu, 0.25);
      g.strokeStyle = `rgba(${C.fader},.85)`; g.lineWidth = 4; g.lineCap = 'round'; line(a[0], a[1], b[0], b[1]); g.lineCap = 'butt';
      quad(hu - 0.4, hu + 0.4, -0.05, 0.55); g.fillStyle = n.reached ? '#ffffff' : '#EFFFF8'; g.fill(); g.strokeStyle = `rgba(${C.fader},1)`; g.lineWidth = 2.4; g.stroke();
      const m0 = P(hu, 0.05), m1 = P(hu, 0.5); g.strokeStyle = 'rgba(20,60,50,.8)'; g.lineWidth = 2; line(m0[0], m0[1], m1[0], m1[1]);
    }
    /* 연습 페이더: 위에 「연습」 표시 (판정 없음) */
    if (n.practice && !held && dOf(n.t) <= DMAX - 4 && dOf(n.t) >= 0) { const d1 = dOf(n.t), c = P(n.l + 0.5, d1 + 1.4), z = 1 / (1 + d1 * K); g.font = `700 ${Math.round(11 + 9 * z)}px 'Noto Sans KR',sans-serif`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = 'rgba(200,255,236,.95)'; g.fillText('연습', c[0], c[1]); }
    g.globalAlpha = 1;
    if (held) { const su = s.slideU && s.slideU[n.l], cu = su != null ? Math.floor(su) : Math.round(uAt(p)); if (su == null) s.flash[n.l] = Math.max(s.flash[n.l], 0.5); if (cu >= 0 && cu < L) s.flash[cu] = Math.max(s.flash[cu], 0.5); }
  }
  function drawLong(n, dOf, s) {
    const l = n.l, held = n.holding, dead = n.head === 'miss' || n.tail === 'miss' || n.tail === 'good';
    if (n.tail && !dead) return;                       /* 끝까지 친 롱노트는 사라짐 */
    let d1 = dOf(n.t), d2 = dOf(n.end);
    if (held) d1 = 0;
    if (d2 < DK) return;
    d1 = Math.max(DK, d1); d2 = Math.min(DMAX, d2); if (d1 > DMAX) return;
    const a = dead ? 0.35 : 1, i = 0.16;
    g.globalAlpha = a;
    quad(l + i, l + 1 - i, d1, d2); g.fillStyle = dead ? 'rgba(120,130,160,.35)' : held ? longH : longG; g.fill();
    g.strokeStyle = dead ? 'rgba(140,150,180,.6)' : `rgba(${C.long},1)`; g.lineWidth = 1.5;
    for (const u of [l + i, l + 1 - i]) { const p = P(u, d1), q = P(u, d2); line(p[0], p[1], q[0], q[1]); }
    if (!dead) {
      g.globalCompositeOperation = 'lighter';
      const p = P(l + 0.5, d1), q = P(l + 0.5, d2);
      g.strokeStyle = `rgba(255,255,255,${held ? 0.95 : 0.6})`; g.lineWidth = held ? 3 : 2; line(p[0], p[1], q[0], q[1]);
      g.strokeStyle = `rgba(${C.long},${held ? 0.35 : 0.18})`; g.lineWidth = held ? 14 : 8; line(p[0], p[1], q[0], q[1]);
      g.globalCompositeOperation = 'source-over';
    }
    /* 꼬리 · 머리 덮개 */
    if (dOf(n.end) <= DMAX) { quad(l + 0.06, l + 0.94, d2, d2 + 0.5); g.fillStyle = dead ? 'rgba(130,140,170,.7)' : `rgba(${C.long},1)`; g.fill(); }
    if (!held) { quad(l + 0.06, l + 0.94, d1, d1 + 0.5); g.fillStyle = dead ? 'rgba(130,140,170,.7)' : '#E8FDFF'; g.fill(); const p1 = P(l + 0.12, d1 + 0.1), p2 = P(l + 0.88, d1 + 0.1); g.strokeStyle = '#fff'; g.lineWidth = 2; line(p1[0], p1[1], p2[0], p2[1]); }
    g.globalAlpha = 1;
    if (held) s.flash[l] = Math.max(s.flash[l], 0.7);
  }
  return { resize, draw };
}
