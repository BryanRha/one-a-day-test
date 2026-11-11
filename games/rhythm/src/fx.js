// 타격 연출 (캔버스) — 기준서 docs/FEEL.md
//   · 스프라이트(빛 · 링 · 기둥 · 불씨 · 줄)는 시작할 때 판정 색별로 한 번만 그려 둠 → 판정 중에는 drawImage 만
//   · 객체 풀: 터짐 32 · 링 24 · 파티클 384 · 띠 8 — 판정 중 메모리 할당 0, 넘치면 가장 오래된 것을 다시 씀
//   · 판정(engine)과 완전히 분리: 여기는 '보여 주기'만, 판정 결과를 받아 그림
//   · lite(연출 줄이기): 파티클 · 둘째 링 · 빛기둥 · 피버 알갱이 없음
//   · v0.3.1 (검수 A1 · A2): 판정 위계는 '모양'으로 — PERFECT 금 핵 + 링 2겹 + 빛기둥 + 파티클 · GREAT 장미색 링 1겹 · GOOD 작은 빛점
//     판정 색(금 · 장미 · 세이지)은 레인 · 노트 색(얼음 · 라벤더)과 겹치지 않게 · 빛 예산(밝기 상한)으로 판정선이 하얗게 타지 않게
//   · 색 · 파티클 모양 · 롱노트 불꽃은 테마(themes.js)에서 읽음 → setTheme 로 바꿔 끼움
import { GEO, P } from './render.js?v=0.99.27';
import { THEMES, DEFAULT_THEME } from './themes.js?v=0.99.27';

const { L, LW, YJ } = GEO;
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
function sprite(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }

/* 파티클 모양 (24×24 안에 그림) */
const SHAPE = {
  spark: (g, c0, c1) => { const r = g.createRadialGradient(12, 12, 0, 12, 12, 12); r.addColorStop(0, rgba(c0, 1)); r.addColorStop(0.35, rgba(c1, 0.8)); r.addColorStop(1, rgba(c1, 0)); g.fillStyle = r; g.fillRect(0, 0, 24, 24); },
  petal: (g, c0, c1) => { const r = g.createLinearGradient(4, 4, 20, 20); r.addColorStop(0, rgba(c0, 1)); r.addColorStop(1, rgba(c1, 0.85)); g.fillStyle = r; g.beginPath(); g.moveTo(12, 2); g.bezierCurveTo(22, 6, 20, 18, 12, 22); g.bezierCurveTo(4, 18, 2, 6, 12, 2); g.fill(); g.strokeStyle = rgba(c0, 0.6); g.lineWidth = 0.8; g.beginPath(); g.moveTo(12, 4); g.lineTo(12, 20); g.stroke(); },
  feather: (g, c0, c1) => { g.strokeStyle = rgba(c0, 0.9); g.lineWidth = 1; g.beginPath(); g.moveTo(12, 1); g.lineTo(12, 23); g.stroke(); g.fillStyle = rgba(c1, 0.75); g.beginPath(); g.moveTo(12, 2); g.quadraticCurveTo(22, 10, 12, 22); g.quadraticCurveTo(3, 10, 12, 2); g.fill(); },
};

function bake(T) {
  const S = {};
  for (const [k, [c0, c1]] of Object.entries(T.col)) {
    S[k] = {
      glow: sprite(128, 128, (g, w) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, rgba(c0, 1)); r.addColorStop(0.22, rgba(c0, 0.85)); r.addColorStop(0.45, rgba(c1, 0.45)); r.addColorStop(1, rgba(c1, 0)); g.fillStyle = r; g.fillRect(0, 0, w, w); }),
      ring: sprite(256, 256, g => { g.strokeStyle = rgba(c1, 0.35); g.lineWidth = 14; g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2); g.stroke(); g.strokeStyle = rgba(c1, 0.8); g.lineWidth = 5; g.stroke(); g.strokeStyle = rgba(c0, 1); g.lineWidth = 2; g.stroke(); }),
      pillar: sprite(48, 256, (g, w, h) => { const v = g.createLinearGradient(0, h, 0, 0); v.addColorStop(0, rgba(c0, 1)); v.addColorStop(0.25, rgba(c1, 0.7)); v.addColorStop(1, rgba(c1, 0)); g.fillStyle = v; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'destination-in'; const m = g.createLinearGradient(0, 0, w, 0); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.5, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = m; g.fillRect(0, 0, w, h); }),
      dot: sprite(24, 24, g => (SHAPE[T.particle] || SHAPE.spark)(g, c0, c1)),
      bar: sprite(256, 32, (g, w, h) => { const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, rgba(c1, 0)); v.addColorStop(0.5, rgba(c0, 1)); v.addColorStop(1, rgba(c1, 0)); g.fillStyle = v; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'destination-in'; const m = g.createLinearGradient(0, 0, w, 0); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.15, 'rgba(0,0,0,1)'); m.addColorStop(0.85, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = m; g.fillRect(0, 0, w, h); }),
    };
  }
  S.pink = S.fever;   /* 피버 알갱이 */
  return S;
}

/* 판정별 세기 (FEEL.md 2장 표) — 크기 · 링 수 · 기둥 · 파티클 · 핵이 판정마다 다름 */
const SPEC = {
  perfect: { size: 118, life: 0.34, rings: 2, parts: 14, pillar: 250, flash: 0.9, col: 'perfect', core: 0.8, w: 1 },
  great: { size: 80, life: 0.26, rings: 1, parts: 5, pillar: 0, flash: 0.5, col: 'great', core: 0, w: 0.55 },
  good: { size: 42, life: 0.2, rings: 0, parts: 0, pillar: 0, flash: 0.28, col: 'good', core: 0, w: 0.3 },
};
/* 빛 예산: 한 프레임 이펙트 빛의 합이 이 값을 넘으면 전체를 같은 비율로 낮춤 (피버 화이트아웃 방지) */
export const LIGHT_CAP = 0.8;

export function makeFx(themeId = DEFAULT_THEME) {
  let T = THEMES[themeId] || THEMES[DEFAULT_THEME], SP = bake(T);
  const pool = n => Array.from({ length: n }, () => ({ on: false, t0: 0 }));
  const bursts = pool(32), rings = pool(24), parts = pool(384), bands = pool(8);
  const take = arr => { let old = arr[0]; for (const o of arr) { if (!o.on) return o; if (o.t0 < old.t0) old = o; } return old; };
  const lx = l => P(l + 0.5, 0)[0];
  const st = { lite: false, fever: 0, laneFlash: [0, 0, 0, 0], laneCol: ['perfect', 'perfect', 'perfect', 'perfect'], laneDim: [0, 0, 0, 0], line: 0, lineCol: 'perfect', hold: [0, 0, 0, 0], holdEmit: [0, 0, 0, 0], sideEmit: 0 };

  function particles(x, y, n, col, now, o = {}) {
    if (st.lite) return;
    n = Math.round(n * (1 + st.fever * 0.4));
    const spread = o.spread ?? 0.85, sp = o.speed ?? 1;
    for (let i = 0; i < n; i++) {
      const p = take(parts), a = -Math.PI / 2 + (Math.random() * 2 - 1) * spread * Math.PI / 2, v = (180 + Math.random() * 260) * sp;
      p.on = true; p.t0 = now; p.x = x + (Math.random() - 0.5) * 14; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; p.life = (o.life ?? 0.45) * (0.7 + Math.random() * 0.6); p.size = (o.size ?? 9) * (0.6 + Math.random() * 0.8); p.col = col; p.grav = (o.grav ?? 620) * T.gravity / 620; p.rot = Math.random() * 6.3; p.vr = (Math.random() - 0.5) * 9;
    }
  }
  function ring(x, y, col, now, r0, r1, life, squash = 0.32) { const r = take(rings); r.on = true; r.t0 = now; r.x = x; r.y = y; r.col = col; r.r0 = r0; r.r1 = r1; r.life = life; r.sq = squash; }

  return {
    st,
    get theme() { return T; },
    setTheme(id) { const t = THEMES[id]; if (!t || t === T) return; T = t; SP = bake(T); for (const a of [bursts, rings, parts, bands]) for (const o of a) o.on = false; },
    set lite(v) { st.lite = !!v; }, get lite() { return st.lite; },
    /* 판정 하나 */
    hit(lane, j, now) {
      const s = SPEC[j]; if (!s) return;
      const x = lx(lane), b = take(bursts);
      b.on = true; b.t0 = now; b.x = x; b.y = YJ; b.s = s; b.kind = 'hit';
      if (s.rings > 0) ring(x, YJ, s.col, now, 16, s.size * 0.7, s.life * 1.1);
      if (s.rings > 1 && !st.lite) ring(x, YJ, 'gold', now + 0.035, 22, s.size * 1.05, s.life * 1.6, 0.3);
      if (s.parts) particles(x, YJ - 4, s.parts, s.col, now);
      st.laneFlash[lane] = Math.max(st.laneFlash[lane], s.flash); st.laneCol[lane] = s.col;
    },
    miss(lane) { st.laneDim[lane] = 1; },
    /* 동시치기: 두 레인 사이 빛 막대 + 가로 충격파 */
    chord(l0, l1, now) {
      const b = take(bands); b.on = true; b.t0 = now; b.x0 = lx(Math.min(l0, l1)); b.x1 = lx(Math.max(l0, l1)); b.kind = 'chord'; b.life = 0.3; b.col = 'perfect';
      ring((b.x0 + b.x1) / 2, YJ, 'perfect', now, 30, 170, 0.36, 0.22);
      st.line = Math.max(st.line, 0.45); st.lineCol = 'perfect';   /* 판정선 전체 반짝은 큰 순간(동시치기 · 이정표 · 풀콤보)만 */
    },
    /* 롱노트 끝까지: 마무리 터짐 */
    tail(lane, now) {
      const x = lx(lane), b = take(bursts); b.on = true; b.t0 = now; b.x = x; b.y = YJ; b.s = { size: 170, life: 0.38, pillar: st.lite ? 0 : 300, col: 'long' }; b.kind = 'hit';
      ring(x, YJ, 'long', now, 20, 120, 0.42); if (!st.lite) ring(x, YJ, 'gold', now + 0.05, 30, 160, 0.55);
      particles(x, YJ - 4, 12, 'gold', now, { speed: 1.2 });
      st.laneFlash[lane] = 1; st.laneCol[lane] = 'long';
    },
    /* 콤보 이정표: 50 → 금빛 링 (콤보 숫자 자리) · 100 → 판정선 금빛 쓸기 + 파티클 */
    milestone(n, now) {
      if (n % 100 === 0) {
        const b = take(bands); b.on = true; b.t0 = now; b.kind = 'sweep'; b.life = 0.55; b.col = 'gold';
        for (let l = 0; l < L; l++) particles(lx(l), YJ - 4, 5, 'gold', now + l * 0.03, { speed: 1.3 });
        ring(195, 300, 'gold', now, 40, 200, 0.6, 0.55);
      } else if (n % 50 === 0) ring(195, 300, 'gold', now, 30, 150, 0.5, 0.55);
    },
    /* 풀콤보 · 올 퍼펙트 */
    celebrate(ap, now) {
      const col = ap ? 'gold' : 'perfect';
      for (let l = 0; l < L; l++) { const x = lx(l), b = take(bursts); b.on = true; b.t0 = now + l * 0.05; b.x = x; b.y = YJ; b.s = { size: 200, life: 0.5, pillar: 420, col }; b.kind = 'hit'; ring(x, YJ, col, now + l * 0.05, 20, 150, 0.6); }
      const b = take(bands); b.on = true; b.t0 = now; b.kind = 'sweep'; b.life = 0.7; b.col = 'gold';
      ring(195, YJ, col, now, 40, 330, 0.9, 0.25);
      for (let i = 0; i < 4; i++) particles(lx(i), YJ - 4, 14, i % 2 ? 'gold' : col, now + i * 0.06, { speed: 1.6, life: 0.9, grav: 380, spread: 0.5 });
    },
    /* 매 프레임: held = 레인별 잡고 있는 롱노트 여부 · pulse = 박 맥동 */
    draw(g, now, dt, held, pulse, ratio = 1) {
      g.globalCompositeOperation = 'lighter';
      /* 빛 예산: 지금 켜진 빛의 합 → 상한을 넘으면 모든 이펙트 알파에 같은 배율 */
      let light = st.line;
      for (const b of bursts) if (b.on && now >= b.t0) light += (1 - (now - b.t0) / b.s.life) * (b.s.w ?? 1);
      for (let l = 0; l < L; l++) light += st.laneFlash[l] * 0.4 + (held[l] ? 0.5 : 0);
      const K = st.k = Math.min(1, LIGHT_CAP / Math.max(0.001, light));
      /* 키빔 위 판정선 레인 반짝 · 레인 어두워짐(MISS)은 source-over 로 따로 */
      for (let l = 0; l < L; l++) {
        const f = st.laneFlash[l]; if (f > 0.02) { const x = lx(l); g.globalAlpha = Math.min(1, f) * 0.6 * K; g.drawImage(SP[st.laneCol[l]].bar, x - LW * 0.6, YJ - 7, LW * 1.2, 14); }
        st.laneFlash[l] = Math.max(0, f - dt * 5);
        /* 롱노트 잡는 동안: 판정선 불꽃 숨쉬기 + 불씨 */
        if (held[l]) {
          const x = lx(l), br = 0.65 + 0.35 * pulse + Math.sin(now * 30) * 0.08;
          const F = T.flame; g.globalAlpha = br * K; g.drawImage(SP[F.col].glow, x - 50, YJ - 30, 100, 60);
          if (!st.lite) { g.globalAlpha = 0.5 * br * K; g.drawImage(SP[F.col].pillar, x - 22, YJ - 150, 44, 150); }
          st.holdEmit[l] -= dt; if (st.holdEmit[l] <= 0) { st.holdEmit[l] = F.every; particles(x, YJ - 6, 2, Math.random() < 0.3 ? F.spark : F.col, now, { spread: 0.45, size: 7, life: 0.35, speed: 0.8 }); }
        }
      }
      /* 판정선 전체 반짝 */
      if (st.line > 0.02) { const a = P(-0.05, 0), b = P(L + 0.05, 0); g.globalAlpha = st.line * K; g.drawImage(SP[st.lineCol].bar, a[0] - 20, YJ - 16, b[0] - a[0] + 40, 32); }
      st.line = Math.max(0, st.line - dt * 3);
      /* 피버: 레인 양옆에서 빛 알갱이 */
      if (st.fever > 0.05 && !st.lite) {
        st.sideEmit -= dt * st.fever; if (st.sideEmit <= 0) { st.sideEmit = 0.05; for (const u of [0, L]) { const d = Math.random() * 14, q = P(u, d), p = take(parts); p.on = true; p.t0 = now; p.x = q[0] + (u ? 8 : -8); p.y = q[1]; p.vx = (u ? -1 : 1) * (10 + Math.random() * 20); p.vy = -(90 + Math.random() * 120); p.life = 0.9; p.size = 6 + Math.random() * 6; p.col = Math.random() < 0.5 ? 'gold' : 'pink'; p.grav = 0; } }
      }
      /* 터짐 */
      for (const b of bursts) {
        if (!b.on) continue; const t = now - b.t0; if (t < 0) continue; const s = b.s, k = t / s.life; if (k >= 1) { b.on = false; continue; }
        const e = 1 - Math.pow(1 - k, 3), fade = 1 - k, sp = SP[s.col];
        const r = s.size * (0.55 + 0.6 * e);
        const Kb = t < 0.06 ? Math.max(K, 0.9) : K;   /* 막 터진 0.06초는 예산에서 빼 줌 → 동시치기 순간에도 빈 프레임 없음 (재검수 B-3) */
        g.globalAlpha = fade * 0.62 * Kb; g.drawImage(sp.glow, b.x - r, b.y - r * 0.42, r * 2, r * 0.84);
        const core = s.core ?? 1; if (core && k < 0.3) { const r2 = s.size * 0.28 * (1 - k / 0.3); g.globalAlpha = core * Kb; g.drawImage(sp.glow, b.x - r2, b.y - r2 * 0.8, r2 * 2, r2 * 1.6); }
        if (s.pillar && !st.lite) { const h = s.pillar * (1 - e * 0.35), w = 24 + 18 * (1 - e); g.globalAlpha = fade * 0.85 * K; g.drawImage(sp.pillar, b.x - w / 2, b.y - h, w, h); }
      }
      /* 링 */
      for (const r of rings) {
        if (!r.on) continue; const t = now - r.t0; if (t < 0) continue; const k = t / r.life; if (k >= 1) { r.on = false; continue; }
        const e = 1 - Math.pow(1 - k, 3), rad = r.r0 + (r.r1 - r.r0) * e;
        g.globalAlpha = (1 - k) * (1 - k) * Math.sqrt(K); g.drawImage(SP[r.col].ring, r.x - rad, r.y - rad * r.sq, rad * 2, rad * 2 * r.sq);
      }
      /* 띠: 동시치기 막대 · 금빛 쓸기 */
      for (const b of bands) {
        if (!b.on) continue; const t = now - b.t0; if (t < 0) continue; const k = t / b.life; if (k >= 1) { b.on = false; continue; }
        if (b.kind === 'chord') { const pad = 30; g.globalAlpha = (1 - k) * K; g.drawImage(SP.perfect.bar, b.x0 - pad, YJ - 12 - 6 * (1 - k), b.x1 - b.x0 + pad * 2, 24 + 12 * (1 - k)); }
        else { const a = P(-0.05, 0), z = P(L + 0.05, 0), x = a[0] + (z[0] - a[0]) * k; g.globalAlpha = Math.sin(Math.PI * k) * K; g.drawImage(SP.gold.glow, x - 70, YJ - 40, 140, 80); g.drawImage(SP.gold.bar, a[0], YJ - 10, z[0] - a[0], 20); }
      }
      /* 파티클 */
      for (const p of parts) {
        if (!p.on) continue; const t = now - p.t0; if (t < 0) continue; const k = t / p.life; if (k >= 1) { p.on = false; continue; }
        p.vy += p.grav * dt; p.vx *= 1 - 2.2 * dt; p.vy *= 1 - 1.2 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        const sz = p.size * (1 - k * 0.6) * (T.spin ? 1.3 : 1); g.globalAlpha = (1 - k * k) * Math.sqrt(K);
        if (T.spin) { p.rot += p.vr * dt; const c = Math.cos(p.rot), si = Math.sin(p.rot); g.setTransform(c * ratio, si * ratio, -si * ratio, c * ratio, p.x * ratio, p.y * ratio); g.drawImage(SP[p.col].dot, -sz, -sz, sz * 2, sz * 2); }
        else g.drawImage(SP[p.col].dot, p.x - sz, p.y - sz, sz * 2, sz * 2);
      }
      if (T.spin) g.setTransform(ratio, 0, 0, ratio, 0, 0);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      /* MISS: 레인이 잠깐 어두워지고 판정선 아래 짧은 회색 줄 (벌이 아니라 '조용히', 하지만 알 수는 있게 — 검수 B7) */
      for (let l = 0; l < L; l++) { const d = st.laneDim[l]; if (d > 0.02) { const a = P(l, 0), b = P(l + 1, 14), q0 = P(l + 0.2, -0.35), q1 = P(l + 0.8, -0.35); g.fillStyle = `rgba(4,6,18,${0.4 * d})`; g.fillRect(a[0], b[1], b[0] - a[0], a[1] - b[1]); g.fillStyle = `rgba(190,200,220,${0.55 * d})`; g.fillRect(q0[0], q0[1] - 1, q1[0] - q0[0], 2.5); } st.laneDim[l] = Math.max(0, d - dt * 3.5); }
    },
    /* 시험용: 살아 있는 객체 수 */
    alive() { return [bursts, rings, parts, bands].map(a => a.filter(o => o.on).length); },
    reset() { for (const a of [bursts, rings, parts, bands]) for (const o of a) o.on = false; st.fever = 0; st.line = 0; st.laneFlash.fill(0); st.laneDim.fill(0); },
  };
}
