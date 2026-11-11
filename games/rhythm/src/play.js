// 한 판 진행: 오디오 시계 → 엔진(판정) → 그리기 · 손맛(빛 · 소리 · 한마디) — 연출 기준서 docs/FEEL.md
//   곡 위치 p = A.heard() − t0 − 싱크(초) · 입력은 이벤트가 일어난 순간의 시각으로 판정 (프레임 지연 없음)
//   순서: 판정(engine) → 타격음(오디오 시계로 바로) → 캔버스 이펙트 등록(fx.js 풀) → 판정 글자 · 콤보 DOM 은 다음 프레임에 한 번에
import { A } from './audio.js?v=0.99.27';
import { Session, parseChart, clock, WIN } from './engine.js?v=0.99.27';
import { makeRenderer, laneAt } from './render.js?v=0.99.27';
import { makeFx } from './fx.js?v=0.99.27';
import { Live } from './live.js?v=0.99.27';

const $ = s => document.querySelector(s);
const fmt = t => { t = Math.max(0, t); return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; };
const KEYS = { d: 0, f: 1, j: 2, k: 3, D: 0, F: 1, J: 2, K: 3 };
const LEAD = 3.4;   /* 첫 노트 전 여유 (곡이 이만큼 뒤에 시작) · 제목 카드 → READY(−1.6초) → GO(−0.35초) */
const READY_AT = -1.6, GO_AT = -0.35;
/* 판정 글자 애니메이션 (등장 · 튐 · 머묾 · 사라짐) — Web Animations: 강제 레이아웃 없음 */
/* v0.3.1 검수 A1: 첫 프레임부터 불투명(바로 읽힘) · 크기만 1.4 → 1 로 튐 */
const JUDGE_K = [{ opacity: 1, transform: 'scale(1.4)' }, { opacity: 1, transform: 'scale(.97)', offset: 0.14 }, { opacity: 1, transform: 'scale(1)', offset: 0.26 }, { opacity: 1, transform: 'translateY(0)', offset: 0.7 }, { opacity: 0, transform: 'translateY(-6px)' }];
const MISS_K = [{ opacity: 0, transform: 'translateY(-2px)' }, { opacity: 0.75, offset: 0.2 }, { opacity: 0.75, offset: 0.6 }, { opacity: 0, transform: 'translateY(4px)' }];

/* 피버용 밀도: 0.25초 칸마다 앞뒤 1초 안 노트 수(초당) · 문턱 = 상위 25%, 최소 초당 4개 */
function density(ns) {
  const end = ns.length ? ns[ns.length - 1].end + 2 : 1, d = new Float32Array(Math.ceil(end * 4) + 1);
  let a = 0, b = 0;
  for (let i = 0; i < d.length; i++) { const t = i / 4; while (b < ns.length && ns[b].t < t + 1) b++; while (a < b && ns[a].t < t - 1) a++; d[i] = (b - a) / 2; }
  const nz = Array.from(d).filter(x => x > 0).sort((x, y) => x - y);
  return { d, th: Math.max(4, nz.length ? nz[Math.floor(nz.length * 0.75)] : 99) };
}

export const Play = {
  on: false, paused: false, sess: null, auto: null,
  /* opt: { song, chart, diff, entry(오디오), offset(ms), speed, shake, sfx, cover, diva:{name,en,face}, chapter, cheer:{n:문장}, onEnd(result) } */
  start(opt) {
    this.opt = opt; this.on = true; this.paused = false; this.ended = false; this.introOff = false;
    const notes = parseChart(opt.chart, opt.diff, opt.entry.shift);
    this.sess = new Session(notes); this.notes = notes;
    this.lastT = notes.length ? Math.max(...notes.map(n => n.end)) : 1;
    this.endAt = Math.min(opt.entry.dur, this.lastT + 2.2);
    if (!this.fxs) this.fxs = makeFx(opt.theme);
    this.fxs.setTheme(opt.theme); this.fxs.reset(); this.fxs.lite = !!opt.lite;
    this.st = { p: -LEAD, notes, spd: 12 + opt.speed * 5, clk: clock(opt.chart, opt.entry.shift), missAt: WIN.good, pressed: [false, false, false, false], flash: [0, 0, 0, 0], drawFrom: 0, now: performance.now() / 1000, dt: 0.016, pulse: 0, fever: 0, held: [false, false, false, false], fx: this.fxs, theme: this.fxs.theme };
    this.down = [0, 0, 0, 0]; this.ptr = new Map(); this.shown = 0; this.lastCheer = 0;
    this.pend = []; this.prevCombo = 0; this.fcShown = false; this.readyState = ''; this.chordSeen = new Set(); this.work = 0; this.iv = []; this.refresh = 0; this.offRate = false; this.slowT = 0; this.autoLite = false; this.txt = {};
    this.dens = density(notes);
    if (!this.R) this.R = makeRenderer($('#p_cv'));
    this.fit();
    $('#play').className = 'scr on ' + this.fxs.theme.judge;
    Live.start({ live: opt.live, subs: opt.subs || [300, 300], lite: !!opt.lite }); this.fixAt = 0;
    /* 화면 채우기 */
    $('#p_cov').style.backgroundImage = `url(${opt.cover})`; $('#p_thumb').style.backgroundImage = `url(${opt.cover})`;
    $('#p_title').textContent = opt.song.title; $('#p_sub').textContent = `${opt.song.artist} · 노래 ${opt.diva.name}`;
    $('#p_len').textContent = fmt(opt.entry.dur); $('#p_t').textContent = '0:00'; $('#p_bar').style.width = '0';
    $('#p_score').textContent = '0'; $('#p_acc').textContent = '100.00%'; $('#p_fc').className = 'fcm'; $('#p_shake').classList.remove('fcing');
    $('#p_chap').innerHTML = `<b>${opt.chapter}</b> · 끝까지 들으면 장면이 열려요`; $('#p_chap').style.opacity = 1;
    const cb = $('#p_combo'); cb.classList.remove('on', 'gold'); cb.querySelector('b').textContent = '0'; cb.style.transform = '';
    $('#p_judge').className = 'judge'; $('#p_judge b').textContent = ''; $('#p_judge small').textContent = ''; $('#p_ready').className = 'ready'; $('#p_mile').className = 'mile'; $('#p_cut').classList.remove('on'); $('#p_banner').className = 'banner';
    const it = $('#p_intro'); it.querySelector('em').textContent = `${opt.diff === 'easy' ? 'EASY' : opt.diff === 'hard' ? 'HARD' : 'NORMAL'} · LV.${opt.chart.diffs[opt.diff].lv}`;
    it.querySelector('b').textContent = opt.song.title; it.querySelector('span').textContent = `${opt.song.artist} · 노래 ${opt.diva.name}`;
    it.classList.remove('on'); void it.offsetWidth; it.classList.add('on');
    $('#p_cut .face').style.backgroundImage = `url(${opt.diva.face})`; $('#p_cut small').textContent = opt.diva.en;
    const t0 = A.play(opt.entry, -LEAD, 0.08);
    A.fxPlay('whoosh', 0.5);
    /* READY · GO 소리: 곡 위치에 맞춰 오디오 시계로 예약 (화면 글자와 같은 순간) */
    if (opt.hitsnd !== false) { A.fxPlay('ready', opt.sfx * 0.7, t0 + READY_AT); A.fxPlay('go', opt.sfx * 0.8, t0 + GO_AT); }
    this.bind();
    cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(this.frame);
  },
  /* 캔버스 해상도: 최대 2배 (연출 줄이기 1.5배) — 폰에서 60fps */
  fit() { const dpr = Math.min(this.opt && this.opt.lite ? 1.5 : 2, (window.devicePixelRatio || 1) * (window.__scale || 1)); this.R.resize(390, 844, dpr); },
  pos(perfMs) { return A.pos(perfMs) - (this.opt.offset || 0) / 1000; },
  evMs(e) { const t = e && e.timeStamp; const n = performance.now(); return (t && Math.abs(t - n) < 1000) ? t : n; },

  /* ---------- 입력 ---------- */
  press(lane, ms) {
    if (!this.on || this.paused || this.ended) return;
    this.down[lane]++; this.st.pressed[lane] = true; this.st.flash[lane] = 1;
    const t = this.pos(ms);
    for (const m of this.sess.settle(t)) this.fx(m);   /* 앞 노트 MISS 를 먼저 (이벤트 시각 순서) */
    const e = this.sess.press(lane, t);
    if (e) { this.fx(e); this.flush(performance.now() / 1000); }   /* 판정 글자는 누른 그 자리에서 (다음 프레임 기다리지 않음 · 검수 A1) */ else if (this.opt.hitsnd !== false) A.fxPlay('soft', this.opt.sfx * 0.45);
  },
  release(lane, ms) {
    if (!this.on) return;
    this.down[lane] = Math.max(0, this.down[lane] - 1);
    if (this.down[lane]) return;
    this.st.pressed[lane] = false;
    if (this.paused || this.ended) return;
    const e = this.sess.release(lane, this.pos(ms)); if (e) this.fx(e);
  },
  bind() {
    if (this.bound) return; this.bound = true;
    const tz = $('#p_touch'), toLane = e => { const r = $('#box').getBoundingClientRect(), s = r.width / 390; return laneAt((e.clientX - r.left) / s); };
    tz.addEventListener('pointerdown', e => { e.preventDefault(); const l = toLane(e); this.ptr.set(e.pointerId, l); try { tz.setPointerCapture(e.pointerId); } catch { /* */ } this.press(l, this.evMs(e)); });
    /* 손가락이 옆 레인으로 미끄러지면: 원래 레인은 떼고 새 레인 누름 (롱노트 잡는 중이면 그대로) */
    tz.addEventListener('pointermove', e => { if (!this.ptr.has(e.pointerId)) return; const l = toLane(e), o = this.ptr.get(e.pointerId); if (l === o || this.sess?.held[o]) return; this.ptr.set(e.pointerId, l); this.release(o, this.evMs(e)); this.press(l, this.evMs(e)); });
    const up = e => { if (!this.ptr.has(e.pointerId)) return; const l = this.ptr.get(e.pointerId); this.ptr.delete(e.pointerId); this.release(l, this.evMs(e)); };
    tz.addEventListener('pointerup', up); tz.addEventListener('pointercancel', up); tz.addEventListener('lostpointercapture', up);
    addEventListener('keydown', e => { if (!this.on || e.repeat) return; if (e.key in KEYS) { e.preventDefault(); this.press(KEYS[e.key], this.evMs(e)); } });
    addEventListener('keyup', e => { if (!this.on) return; if (e.key in KEYS) this.release(KEYS[e.key], this.evMs(e)); });
    $('#p_pause').addEventListener('click', () => this.opt.onPause && this.opt.onPause());
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.on && !this.paused && !this.ended) this.opt.onPause && this.opt.onPause(); });
    addEventListener('resize', () => this.R && this.fit());
  },

  /* ---------- 손맛 ---------- */
  /* 판정 하나: 소리는 바로, 캔버스 이펙트는 풀에 등록, DOM(글자 · 콤보)은 다음 프레임에 */
  fx(e) {
    const o = this.opt, F = this.fxs, now = performance.now() / 1000;
    if (e.j !== 'miss') {
      if (e.tail) { if (e.j === 'perfect') { F.tail(e.lane, now); if (o.hitsnd !== false) A.hit('tail', o.sfx); } }
      else {
        F.hit(e.lane, e.j, now); e.note.hitAt = now;
        let chord = false;
        if (e.note.chord) { const m = this.notes[e.note.pair], key = Math.min(e.note.id, e.note.pair); if (m && m.head && m.head !== 'miss' && !this.chordSeen.has(key)) { this.chordSeen.add(key); F.chord(e.lane, m.l, now); chord = true; } }
        if (o.hitsnd !== false) A.hit(chord ? 'chord' : e.j, o.sfx);
      }
    } else F.miss(e.lane);
    this.pend.push(e);
  },
  /* 프레임마다 한 번: 판정 글자(마지막 것) · 콤보 · 이정표 */
  flush(now) {
    if (!this.pend.length) return;
    const evs = this.pend; this.pend = [];
    const e = evs[evs.length - 1], o = this.opt;
    /* 판정 글자 */
    const jd = $('#p_judge'), b = jd.querySelector('b'), sm = jd.querySelector('small');
    const miss = e.j === 'miss';
    b.textContent = miss ? 'miss' : e.j.toUpperCase();
    jd.className = 'judge j-' + e.j;
    const el = o.el !== false && !e.tail && (e.j === 'great' || e.j === 'good');
    sm.textContent = el ? (e.delta < 0 ? 'EARLY' : 'LATE') : ''; sm.className = e.delta < 0 ? 'fast' : 'slow';
    if (this.jAnim) this.jAnim.cancel(); if (this.sAnim) this.sAnim.cancel();
    this.jAnim = b.animate(miss ? MISS_K : JUDGE_K, { duration: miss ? 560 : 560, easing: 'ease-out', fill: 'forwards' });
    if (el) this.sAnim = sm.animate(MISS_K, { duration: 620, fill: 'forwards' });
    /* 콤보 */
    const cb = $('#p_combo'), nb = cb.querySelector('b'), n = this.sess.combo;
    for (const ev of evs) Live.judge(ev, ev.combo);
    /* 방송 사고 수습 대사 (MISS · 6초에 한 번) — 대사만 · 효과는 v0.5 (engine hooks.miss) */
    if (evs.some(x => x.j === 'miss') && o.diva.fix && now > this.fixAt) { this.fixAt = now + 6; this.cutin(o.diva.fix); }
    if (n === 0 && this.prevCombo >= 3) {   /* 끊김: 아래로 흐려짐 (빨강 · 흔들림 없음) */
      if (this.cAnim) this.cAnim.cancel();
      this.cAnim = cb.animate([{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 4px' }], { duration: 420, easing: 'ease-out' });
      this.cAnim.onfinish = () => { if (this.sess.combo < 3) cb.classList.remove('on', 'gold'); };
      cb.classList.add('broke');
    } else if (n >= 3) {
      cb.classList.add('on'); cb.classList.remove('broke'); nb.textContent = n;
      /* 지나간 이정표 (한 프레임에 여러 판정이 올 수 있음) */
      let mile = 0; for (let k = this.prevCombo + 1; k <= n; k++) if (k % 10 === 0) mile = k;
      if (this.bAnim) this.bAnim.cancel();
      if (mile) {
        const big = mile % 50 === 0;
        cb.classList.toggle('gold', mile >= 50);
        this.bAnim = nb.animate([{ transform: `scale(${big ? 1.4 : 1.22})`, filter: 'brightness(1.8)' }, { transform: 'scale(.97)', offset: 0.6 }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: big ? 520 : 320, easing: 'ease-out' });
        if (big) { this.fxs.milestone(mile, now); if (o.hitsnd !== false) A.fxPlay('chime', o.sfx * 0.45); }
        if (mile % 100 === 0) { const m = $('#p_mile'); m.querySelector('b').textContent = mile; m.className = 'mile'; void m.offsetWidth; m.className = 'mile on'; this.shake(1.5); }
      } else this.bAnim = nb.animate([{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 130, easing: 'ease-out' });
    }
    this.prevCombo = n;
    const line = o.cheer[n];
    if (line && n > this.lastCheer) { this.lastCheer = n; if (n % 100) this.cutin(line); }   /* 100 단위는 '100 COMBO' 띠와 겹치지 않게 말풍선 생략 (재검수 C-4) */
  },
  cutin(text) { const c = $('#p_cut'); c.querySelector('span').textContent = text; c.classList.add('on'); clearTimeout(this.cutT); this.cutT = setTimeout(() => c.classList.remove('on'), 1700); },
  shake(px) {
    if (!this.opt.shake || this.fxs.lite) return;
    const el = $('#p_shake'), t0 = performance.now();
    const go = () => { const k = (performance.now() - t0) / 160; if (k >= 1) { el.style.transform = ''; return; } const a = px * (1 - k); el.style.transform = `translate(${(Math.random() - 0.5) * 2 * a}px,${(Math.random() - 0.5) * 2 * a}px)`; requestAnimationFrame(go); };
    go();
  },

  /* ---------- 프레임 ---------- */
  frame: () => {
    const P = Play; if (!P.on) return;
    P.raf = requestAnimationFrame(P.frame);
    if (P.paused) return;
    A.sample();
    const ms = performance.now(), p = P.pos(ms), st = P.st;
    st.dt = Math.min(0.05, Math.max(0.001, ms / 1000 - st.now)); st.p = p; st.now = ms / 1000;
    /* 느린 기기 판단 (검수 A4): 프레임 '간격'이 아니라 화면 주사율 대비 ① 놓친 프레임 비율 ② frame() 안 작업 시간
       주사율 = 처음 1초 간격의 하위 20% 값 (30Hz 저전력 모드면 33ms 가 주사율이라 그대로는 안 줄임) */
    P.iv.push(st.dt * 1000); if (P.iv.length > 120) P.iv.shift();
    /* 주사율은 흔한 값(120 · 90 · 60 · 30Hz)에 맞춤 (재검수 B-1): 잰 간격이 어느 값과도 12% 넘게 멀면(예: 25 · 40ms)
       화면이 아니라 기기가 느린 것 → 처음부터 느린 기기도 줄임 */
    if (!P.refresh && P.iv.length >= 60) {
      const v = P.iv.slice().sort((a, b) => a - b), m = v[Math.floor(v.length * 0.2)], std = [8.33, 11.11, 16.67, 33.33];
      const near = std.reduce((a, b) => Math.abs(b - m) < Math.abs(a - m) ? b : a);
      P.refresh = near; P.offRate = Math.abs(m - near) / near > 0.12;
    }
    if (P.refresh && !P.fxs.lite && p > 0) {
      const late = P.iv.filter(x => x > P.refresh * 1.5).length / P.iv.length, heavy = P.work > P.refresh * 0.6 || P.offRate;
      P.slowT = late > 0.25 || heavy ? P.slowT + st.dt : 0;
      if (P.slowT > 2) { P.fxs.lite = true; P.autoLite = true; const t = $('#toast'); if (t) { t.textContent = '이 기기에 맞게 연출을 가볍게 바꿨어요'; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2200); } }
    }
    if (P.auto) P.autoplay(p, ms);
    const evs = P.sess.update(p);
    for (const e of evs) P.fx(e);
    for (let l = 0; l < 4; l++) { if (!st.pressed[l]) st.flash[l] = Math.max(0, st.flash[l] - st.dt * 6.5); st.held[l] = !!P.sess.held[l]; }
    /* 박 맥동 (박 지도 기준) · 마디 첫 박은 세게 */
    const bf = st.clk.beatOf(p), fb = Math.floor(bf), ph = bf - fb; st.pulse = p > 0 ? Math.pow(1 - ph, 3) * (((fb % 4) + 4) % 4 === 0 ? 1 : 0.62) : 0;
    /* 피버: 앞뒤 1초 밀도가 곡 상위 25% 이상 + 10콤보 이상 → 0.6초에 걸쳐 켜지고 꺼짐 */
    const fi = Math.max(0, Math.min(P.dens.d.length - 1, Math.round(p * 4))), want = P.dens.d[fi] >= P.dens.th && P.sess.combo >= 10 ? 1 : 0;
    st.fever += (want - st.fever) * Math.min(1, st.dt / 0.25); P.fxs.st.fever = P.fxs.lite ? 0 : st.fever;
    P.R.draw(st);
    P.flush(st.now);
    Live.frame(st.now, p, st.fever);
    { const sc2 = (1 + 0.045 * st.pulse).toFixed(2); if (P.txt.cs !== sc2) { P.txt.cs = sc2; $('#p_combo').style.scale = sc2; } }   /* 콤보가 박마다 살짝 튐 (바뀔 때만) */
    /* 풀콤보 · 올 퍼펙트: 마지막 판정 직후 */
    if (!P.fcShown && P.sess.finished) { P.fcShown = true; const r = P.sess.result(); if (r.fc) { P.fxs.celebrate(r.ap, st.now); P.shake(1.5); if (P.opt.hitsnd !== false) A.fxPlay('fc', P.opt.sfx * 0.8); P.fcMoment(r); } }
    /* READY · GO */
    const rs = p >= GO_AT && p < 0.45 ? 'go' : p >= READY_AT && p < GO_AT ? 'ready' : '';
    if (rs !== P.readyState) { P.readyState = rs; const r = $('#p_ready'); r.querySelector('b').textContent = rs === 'go' ? 'GO!' : rs === 'ready' ? 'READY' : ''; r.className = 'ready'; if (rs) { void r.offsetWidth; r.className = 'ready on ' + rs; } }
    /* 화면 글자 (가볍게) */
    /* 글자는 값이 바뀔 때만 씀 (프레임마다 레이아웃 안 하게 · 검수 C1) */
    const sc = P.sess.score; P.shown += (sc - P.shown) * 0.25; if (Math.abs(sc - P.shown) < 1) P.shown = sc;
    P.put('#p_score', Math.round(P.shown).toLocaleString('en-US')); P.put('#p_acc', (P.sess.acc * 100).toFixed(2) + '%'); P.put('#p_t', fmt(p));
    const bw = Math.min(100, Math.max(0, p / P.opt.entry.dur * 100)).toFixed(1); if (P.txt.bar !== bw) { P.txt.bar = bw; $('#p_bar').style.width = bw + '%'; }
    /* 배경(캐스트 아바타 그림)이 박에 맞춰 살짝 숨쉼 · 피버면 두 배 */
    if (!P.fxs.lite) { const k = st.pulse * (1 + st.fever); $('#p_cov').style.transform = `scale(${(1.02 + 0.01 * k).toFixed(4)})`; $('#p_cov').style.opacity = (0.55 + 0.06 * k).toFixed(3); }
    if (p > READY_AT - 0.2 && P.introOff !== true) { P.introOff = true; $('#p_intro').classList.remove('on'); }
    if (p > 12) $('#p_chap').style.opacity = 0;
    P.work = P.work * 0.9 + (performance.now() - ms) * 0.1;   /* frame() 안 작업 시간 (ms, 이동 평균) */
    if (!P.ended && P.sess.finished && p > P.lastT + 0.4) P.finish();
    else if (!P.ended && p > P.endAt + 1.5) { P.sess.update(1e9); P.finish(); }   /* 안전망: 무슨 일이 있어도 끝남 */
  },
  put(sel, v) { if (this.txt[sel] === v) return; this.txt[sel] = v; $(sel).textContent = v; },
  /* 풀콤보 · 올 퍼펙트 한 장면 (검수 B3): 화면이 밝아지고 캐스트 얼굴 + 큰 글자 · 약 3초 */
  fcMoment(r) {
    const m = $('#p_fc'); m.querySelector('.fc-face').style.backgroundImage = `url(${this.opt.diva.face})`;
    m.querySelector('b').textContent = r.ap ? 'ALL PERFECT' : 'FULL COMBO';
    m.querySelector('span').textContent = r.ap ? `모든 음이 완벽했어요 · ${this.opt.diva.name}` : `한 번도 끊기지 않았어요 · ${this.opt.diva.name}`;
    m.className = 'fcm ' + (r.ap ? 'ap' : 'fc'); void m.offsetWidth; m.className = 'fcm on ' + (r.ap ? 'ap' : 'fc');
    if (this.jAnim) this.jAnim.cancel(); if (this.sAnim) this.sAnim.cancel();   /* 마지막 판정 글자가 첫 프레임에 겹치지 않게 (재검수 C-3) */
    $('#p_shake').classList.add('fcing');   /* 콤보 · 판정 글자는 비켜 줌 */
  },
  finish() {
    this.ended = true; const r = this.sess.result(); Live.end();
    const bn = $('#p_banner');
    if (r.fc) {   /* 풀콤보 장면이 이미 떠 있음 → 배너 대신 장면을 조금 더 보여 주고 결과로 */
      setTimeout(() => { A.stop(1.4); }, 1400);
      clearTimeout(this.endT); this.endT = setTimeout(() => { this.on = false; cancelAnimationFrame(this.raf); this.opt.onEnd(r); }, 3000);
      return;
    }
    bn.querySelector('b').textContent = r.ap ? 'ALL PERFECT' : r.fc ? 'FULL COMBO' : 'CLEAR';
    bn.querySelector('span').textContent = r.ap ? '모든 음이 완벽했어요' : r.fc ? '한 번도 끊기지 않았어요' : '끝까지 들어 주셨어요';
    bn.className = 'banner'; void bn.offsetWidth; bn.className = 'banner on';
    A.fxPlay('chime', this.opt.sfx * 0.7);
    setTimeout(() => { A.stop(1.2); }, 900);
    clearTimeout(this.endT); this.endT = setTimeout(() => { this.on = false; cancelAnimationFrame(this.raf); this.opt.onEnd(r); }, 2300);
  },
  async pause() { if (!this.on || this.paused || this.ended) return; this.paused = true; for (let l = 0; l < 4; l++) { this.down[l] = 1; this.release(l, performance.now()); } this.ptr.clear(); await A.suspend(); },
  async resume() { if (!this.paused) return; await A.resume(); this.paused = false; },
  quit() { Live.stop(); this.on = false; this.ended = true; this.paused = false; cancelAnimationFrame(this.raf); clearTimeout(this.endT); A.stop(0.3); A.resume(); },

  /* 봇 · 자동 연주 (시험용): auto = { jitter: ms, miss: 확률 } — 실제 입력 길(press/release)을 그대로 씀 */
  /* dom: 진짜 화면 터치처럼 PointerEvent 를 보냄 (레인 계산 · 손가락 추적 길까지 시험) */
  autoDown(l, ms) {
    if (!this.auto.dom) return this.press(l, ms);
    const r = $('#box').getBoundingClientRect(), s = r.width / 390, x = r.left + (35 + 80 * l + 40) * s, y = r.top + 700 * s, id = 10 + l;
    $('#p_touch').dispatchEvent(new PointerEvent('pointerdown', { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch' }));
  },
  autoUp(l, ms) {
    if (!this.auto.dom) return this.release(l, ms);
    const r = $('#box').getBoundingClientRect(), s = r.width / 390, x = r.left + (35 + 80 * l + 40) * s, y = r.top + 700 * s;
    $('#p_touch').dispatchEvent(new PointerEvent('pointerup', { pointerId: 10 + l, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch' }));
  },
  autoplay(p, ms) {
    const a = this.auto, ns = this.notes;
    a.i ||= 0; a.hold ||= new Map();
    for (const [l, end] of a.hold) if (p >= end - 0.02) { a.hold.delete(l); this.autoUp(l, ms); }
    while (a.i < ns.length) {
      const n = ns[a.i]; if (n._at == null) { n._skip = Math.random() < (a.miss || 0); n._at = n.t + ((Math.random() * 2 - 1) * (a.jitter || 0)) / 1000; }
      if (p < n._at) break;
      a.i++; if (n._skip) continue;
      this.autoDown(n.l, ms);
      if (n.kind === 'long') a.hold.set(n.l, n.end); else this.autoUp(n.l, ms);
    }
  },
};
