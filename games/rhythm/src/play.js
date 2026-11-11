// 한 판 진행: 오디오 시계 → 엔진(판정) → 그리기 · 손맛(빛 · 소리 · 한마디) — 연출 기준서 docs/FEEL.md
//   곡 위치 p = A.heard() − t0 − 싱크(초) · 입력은 이벤트가 일어난 순간의 시각으로 판정 (프레임 지연 없음)
//   순서: 판정(engine) → 타격음(오디오 시계로 바로) → 캔버스 이펙트 등록(fx.js 풀) → 판정 글자 · 콤보 DOM 은 다음 프레임에 한 번에
import { A } from './audio.js?v=0.99.30';
import { Session, parseChart, clock, WIN } from './engine.js?v=0.99.30';
import { makeRenderer, laneAt, laneU } from './render.js?v=0.99.30';
import { makeFx } from './fx.js?v=0.99.30';
import { Live } from './live.js?v=0.99.30';

const $ = s => document.querySelector(s);
const fmt = t => { t = Math.max(0, t); return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; };
const KEYS = { d: 0, f: 1, j: 2, k: 3, D: 0, F: 1, J: 2, K: 3 };
const LEAD = 3.4;   /* 첫 노트 전 여유 (곡이 이만큼 뒤에 시작) · 제목 카드 → READY(−1.6초) → GO(−0.35초) */
const GUIDE_LEAD = 7.4;   /* 첫 판만: 제목 카드 1.6초 → 조작 안내 약 4초 → READY · GO (재검수 v0.4 B-4) */
const READY_AT = -1.6, GO_AT = -0.35;
const GUIDE_AT = 1.8, GUIDE_DUR = 3.7;   /* 안내 카드: 시작 1.8초 뒤부터 3.7초 */
/* 페이더 첫 만남 (v0.5.1 · 검수 B-1): 안내 카드 → 판정 없는 느린 연습 페이더 1개(곡 앞 소리 없는 구간) → READY
   PRACTICE_LEN = 연습 페이더 길이(초, 곡의 페이더 0.6~1.8초보다 느긋하게) · 연습이 끝나고 READY 까지 0.8초 */
const PRACTICE_LEN = 2.2, PRACTICE_GAP = 0.8;
/* 슈퍼챗 띠 (미리 쓴 문구 · 점수 영향 없음) */
const SC_NICK = ['새벽세시', '701호', '하루팬1호', '페이더요정', '옥상구경꾼', '첫방부터봄', '막차탑승객', '야간근무중'];
const SC_AMT = [1000, 2000, 3000, 5000, 10000];
const SC_MSG = ['응원해요!', 'PD님 커피값', '오늘 방송 최고', '끝까지 가자', '목소리 좋다', '오늘도 출석'];   /* 「첫 슈퍼챗」 문구는 두 번째에도 나와서 뺌 (검수 C-3) */
/* 새 노트 안내 한 줄씩 (ONAIR_PLAN 10장 · 첫 등장 화) */
const GUIDE_ROW = {
  sc: '<div class="row"><i class="g-sc">₩</i><p><b>슈퍼챗</b>금빛 노트도 톡 · 후원이 들어와요</p></div>',
  fader: '<div class="row"><i class="g-fader"><u></u></i><p><b>페이더</b>누른 채 화살표 쪽으로 밀어요 · 곧 연습 한 번</p></div>',
  cue: '<div class="row"><i class="g-cue"><s>3</s><s>2</s><s>1</s></i><p><b>큐</b>판정선 위 3 · 2 · 1 다음 박에 톡</p></div>',
};
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
    /* 페이더 첫 만남이면 연습 페이더 시각을 노트 속도로 정함 (안내 카드가 사라진 뒤 떨어지기 시작) */
    const spd = 12 + opt.speed * 5, fall = 48 / spd, guided = !!(opt.guides && opt.guides.length), prac = guided && opt.guides.includes('fader');
    this.lead = prac ? GUIDE_AT + GUIDE_DUR + fall + 0.5 + PRACTICE_LEN + PRACTICE_GAP - READY_AT : guided ? GUIDE_LEAD : LEAD;
    this.guideEnd = -this.lead + GUIDE_AT + GUIDE_DUR;
    const notes = parseChart(opt.chart, opt.diff, opt.entry.shift, prac ? { fader: { at: READY_AT - PRACTICE_GAP - PRACTICE_LEN, len: PRACTICE_LEN, calm: 15 } } : null);
    this.prac = prac ? notes.find(n => n.practice) : null; this.pracState = '';
    this.sess = new Session(notes); this.notes = notes;
    this.lastT = notes.length ? Math.max(...notes.map(n => n.end)) : 1;
    this.endAt = Math.min(opt.entry.dur, this.lastT + 2.2);
    if (!this.fxs) this.fxs = makeFx(opt.theme);
    this.fxs.setTheme(opt.theme); this.fxs.reset(); this.fxs.lite = !!opt.lite;
    this.guideState = ''; this.readyFired = false;
    this.st = { slideU: [null, null, null, null], p: -this.lead, notes, spd, clk: clock(opt.chart, opt.entry.shift), missAt: WIN.good, pressed: [false, false, false, false], flash: [0, 0, 0, 0], drawFrom: 0, now: performance.now() / 1000, dt: 0.016, pulse: 0, fever: 0, held: [false, false, false, false], fx: this.fxs, theme: this.fxs.theme };
    this.down = [0, 0, 0, 0]; this.ptr = new Map(); this.shown = 0; this.lastCheer = 0;
    this.pend = []; this.prevCombo = 0; this.fcShown = false; this.readyState = ''; this.chordSeen = new Set(); this.work = 0; this.iv = []; this.refresh = 0; this.offRate = false; this.slowT = 0; this.autoLite = false; this.txt = {};
    this.dens = density(notes);
    if (!this.R) this.R = makeRenderer($('#p_cv'));
    this.fit();
    $('#play').className = 'scr on ' + this.fxs.theme.judge;
    Live.start({ live: opt.live, subs: opt.subs || [300, 300], lite: !!opt.lite }); this.fixAt = 0; this.scAt = 0; this.scGot = 0; this.scSum = 0; this.scTotal = notes.filter(n => n.sp === 'sc').length;
    if (opt.guestHello) Live.queue.push({ cast: true, who: opt.guestHello.name, text: opt.guestHello.text });   /* 게스트 인사는 생방송 채팅으로 (오늘 화면 캐스트 카드에 섞지 않음 · 검수 C-6) */
    /* 사고 수습 (ONAIR_PLAN 6장 · v0.5): 한 판 opt.guards 회 — 머리 MISS 를 콤보만 이어 줌 (점수 · 판정 개수 그대로 · engine 이 보장) */
    this.guardsLeft = opt.guards || 0;
    this.sess.hooks.miss = (n, lane, tail) => { if (!tail && this.guardsLeft > 0) { this.guardsLeft--; return 'guard'; } return null; };
    this.buildGuide(opt.guides || []);
    /* 화면 채우기 */
    $('#p_cov').style.backgroundImage = `url(${opt.cover})`; $('#p_thumb').style.backgroundImage = `url(${opt.cover})`;
    $('#p_title').textContent = opt.song.title; $('#p_sub').textContent = `${opt.song.artist} · 노래 ${opt.diva.name}`;
    $('#p_len').textContent = fmt(opt.entry.dur); $('#p_t').textContent = '0:00'; $('#p_bar').style.width = '0';
    $('#p_score').textContent = '0'; $('#p_acc').textContent = '100.00%'; $('#p_fc').className = 'fcm'; $('#p_shake').classList.remove('fcing');
    $('#p_chap').innerHTML = `<b>${opt.chapter}</b> · 끝까지 송출하면 개인 채널이 열려요`; $('#p_chap').style.opacity = 1;
    const cb = $('#p_combo'); cb.classList.remove('on', 'gold'); cb.querySelector('b').textContent = '0'; cb.style.transform = '';
    $('#p_judge').className = 'judge'; $('#p_judge b').textContent = ''; $('#p_judge small').textContent = ''; $('#p_ready').className = 'ready'; $('#p_mile').className = 'mile'; $('#p_cut').classList.remove('on'); $('#p_banner').className = 'banner';
    const it = $('#p_intro'); it.querySelector('em').textContent = `${opt.diff === 'easy' ? 'EASY' : opt.diff === 'hard' ? 'HARD' : 'NORMAL'} · LV.${opt.chart.diffs[opt.diff].lv}`;
    it.querySelector('b').textContent = opt.song.title; it.querySelector('span').textContent = `${opt.song.artist} · 노래 ${opt.diva.name}`;
    it.querySelector('i').textContent = opt.themeLine || '';   /* 게스트를 앉힌 판: 「연출 · 벨라 태엽 톱니」 (검수 B-5) */
    it.classList.remove('on'); void it.offsetWidth; it.classList.add('on');
    $('#p_cut .face').style.backgroundImage = `url(${opt.diva.face})`; $('#p_cut small').textContent = opt.diva.en;
    const t0 = A.play(opt.entry, -this.lead, 0.08);
    $('#p_guide').className = 'guide'; $('#p_sc').className = 'scb'; $('#p_prac').className = 'prac';
    A.fxPlay('whoosh', 0.5);
    /* READY · GO 소리: 곡 위치에 맞춰 오디오 시계로 예약 (화면 글자와 같은 순간) */
    this.schedCues(t0); this.pracRetry = 0;
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
    /* 페이더를 잡은 채 목표 레인을 누름(키보드 · 두 번째 손가락) = 밀기 (지나가는 레인은 채보 규칙상 비어 있음) */
    const sl = this.sess.slide(lane, t, true); if (sl) { const o = this.sess.held.findIndex(h => h === sl); if (o >= 0) this.st.slideU[o] = sl.to + 0.5; return this.onReach(sl); }
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
    const toU = e => { const r = $('#box').getBoundingClientRect(), s = r.width / 390; return laneU((e.clientX - r.left) / s); };
    tz.addEventListener('pointerdown', e => { e.preventDefault(); const l = toLane(e); this.ptr.set(e.pointerId, l); this.st.slideU[l] = null; try { tz.setPointerCapture(e.pointerId); } catch { /* */ } this.press(l, this.evMs(e)); });
    /* 손가락이 옆 레인으로 미끄러지면: 원래 레인은 떼고 새 레인 누름 (롱노트 잡는 중이면 그대로) */
    tz.addEventListener('pointermove', e => {
      if (!this.ptr.has(e.pointerId)) return; const l = toLane(e), o = this.ptr.get(e.pointerId);
      /* 페이더를 잡은 손가락: 손잡이 · 키 패드가 손가락 자리를 따라감 (레인 안 움직임도) */
      if (this.sess && this.sess.held[o] && this.sess.held[o].sp === 'fader') this.st.slideU[o] = toU(e);
      if (l === o) return;
      const h = this.sess && this.sess.held[o];
      /* 페이더 잡은 손가락이 옆으로: 원래 레인은 그대로 잡고(뗄 때 꼬리 판정) 목표 쪽 도달만 확인 */
      if (h) { if (h.sp === 'fader' && this.on && !this.paused) { this.st.flash[l] = 1; const r = this.sess.slide(l, this.pos(this.evMs(e))); if (r) this.onReach(r); } return; }
      this.ptr.set(e.pointerId, l); this.release(o, this.evMs(e)); this.press(l, this.evMs(e));
    });
    const up = e => { if (!this.ptr.has(e.pointerId)) return; const l = this.ptr.get(e.pointerId); this.ptr.delete(e.pointerId); this.st.slideU[l] = null; this.release(l, this.evMs(e)); };
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
    if (e.practice) { this.practiceFx(e, now); return; }   /* 연습 페이더: 판정 글자 · 콤보 · 채팅 없이 보여 주기만 */
    if (e.j !== 'miss') {
      if (e.tail) { if (e.j === 'perfect') { F.tail(e.lane, now); if (o.hitsnd !== false) A.hit('tail', o.sfx); } }
      else {
        F.hit(e.lane, e.j, now); e.note.hitAt = now;
        let chord = false;
        if (e.note.chord) { const m = this.notes[e.note.pair], key = Math.min(e.note.id, e.note.pair); if (m && m.head && m.head !== 'miss' && !this.chordSeen.has(key)) { this.chordSeen.add(key); F.chord(e.lane, m.l, now); chord = true; } }
        if (o.hitsnd !== false) A.hit(chord ? 'chord' : e.j, o.sfx);
        const sp = e.note.sp;
        if (sp === 'sc' && e.j !== 'good') this.superchat(now, e.lane);
        if (sp === 'cue') { F.cue(e.lane, now); if (o.hitsnd !== false) A.fxPlay('cue', o.sfx * 0.8); this.vib(18); }
      }
    } else F.miss(e.lane);
    this.pend.push(e);
  },
  /* 슈퍼챗 받음: 금화 + 위쪽 띠(시청자 · 금액) + 캐스트 감사 한마디 · 결과에 「받은 슈퍼챗 n/3」 (점수 영향 없음) */
  superchat(now, lane) {
    const o = this.opt; this.scGot++;
    this.fxs.superchat(lane, now);
    if (o.hitsnd !== false) A.fxPlay('coin', o.sfx * 0.85);
    this.vib(12);
    const nick = SC_NICK[Math.floor(Math.random() * SC_NICK.length)], amt = SC_AMT[Math.floor(Math.random() * SC_AMT.length)]; this.scSum += amt;
    const b = $('#p_sc'); b.innerHTML = `<i>₩</i><b>${amt.toLocaleString('en-US')}</b><span>${nick}</span><em>${SC_MSG[Math.floor(Math.random() * SC_MSG.length)]}</em>`;
    b.className = 'scb'; void b.offsetWidth; b.className = 'scb on';
    Live.heart(3);
    const first = o.firstSc && this.scGot === 1;
    if (now > this.scAt) { this.scAt = now + 4; this.cutin(first ? '어, 첫 슈퍼챗이에요! 고마워요!' : `${nick}님, 고마워요!`); }
  },
  /* READY · GO 소리를 오디오 시계로 예약 (연습을 다시 내리면 취소하고 새 시각으로) */
  schedCues(t0) {
    for (const c of this.cueSrc || []) { try { c.stop(); } catch { /* */ } }
    this.cueSrc = [];
    if (this.opt.hitsnd !== false) this.cueSrc = [A.fxPlay('ready', this.opt.sfx * 0.7, t0 + READY_AT), A.fxPlay('go', this.opt.sfx * 0.8, t0 + GO_AT)].filter(Boolean);
  },
  /* 연습을 못 했으면 한 번만 다시 내림 (재검수 B-1): 곡은 아직 소리 없는 구간이라 시계만 연습 앞으로 되감음 → 노트가 다시 위에서 내려옴
     두 번째도 못 하면 그대로 곡으로 (막힘 없음) */
  pracAgain() {
    const n = this.prac, s = this.sess, fall = 48 / this.st.spd;
    n.head = n.tail = null; n.holding = false; n.reached = false; n.hitAt = 0; n._at = null; n._skip = false;
    for (let l = 0; l < 4; l++) if (s.held[l] === n) s.held[l] = null;
    s.cursor = 0; this.st.drawFrom = 0; this.st.slideU.fill(null); if (this.auto) this.auto.i = 0;
    const from = Math.max(this.guideEnd + 0.1, n.t - fall - 0.5);
    const t0 = A.play(this.opt.entry, from, 0.05); this.schedCues(t0);
  },
  /* 연습 페이더 (판정 없음): 머리 = 누름 터짐 · 끝 = 닿았으면 마무리 터짐 + 「좋아요」 / 못 닿았으면 부드럽게 */
  practiceFx(e, now) {
    const F = this.fxs, o = this.opt;
    if (!e.tail) { if (e.j !== 'miss') { F.hit(e.lane, 'perfect', now); if (o.hitsnd !== false) A.hit('perfect', o.sfx); } return; }
    if (e.j === 'perfect') { F.tail(e.note.to, now); if (o.hitsnd !== false) A.hit('tail', o.sfx); this.pracSay('ok'); }
    else if (!this.pracRetry) { this.pracRetry = 1; this.pracSay('retry'); this.pracAgain(); }
    else this.pracSay('again');
  },
  /* 연습 안내 글: 떨어질 때 · 잡았을 때 · 닿았을 때 · 끝 */
  pracSay(k) {
    if (this.pracState === k || this.pracState === 'ok' || (this.pracState === 'retry' && k === 'fall' && Date.now() < this.pracRetryAt)) return; this.pracState = k; if (k === 'retry') this.pracRetryAt = Date.now() + 1300;
    const n = this.prac, dir = n && n.to > n.l ? '오른쪽' : '왼쪽';
    const T = { fall: ['연습 · 점수 없음', `떨어지면 꾹 누르고 ${dir} 레인까지 밀어요`], hold: ['좋아요, 그대로', `${dir}으로 쭉 밀어요`], ok: ['좋아요!', '곡에서도 이렇게 밀면 돼요'], wrong: ['반대쪽이에요', `${dir}으로 밀어요 ${n && n.to > n.l ? '→' : '←'}`], retry: ['괜찮아요', '한 번 더 내려와요 · 언제 잡아도 돼요'], again: ['괜찮아요', '곡에서 몇 번 더 나와요 · 천천히 밀어 봐요'] }[k];
    const el = $('#p_prac'); el.innerHTML = `<b>${T[0]}</b><span>${T[1]}</span>`; el.className = 'prac on ' + k;
    clearTimeout(this.pracT); if (k === 'ok' || k === 'again') this.pracT = setTimeout(() => { el.className = 'prac'; }, 1500);
  },
  /* 페이더가 목표 레인에 닿음 */
  onReach(n) {
    const now = performance.now() / 1000;
    if (n.practice) this.pracSay('ok');
    this.fxs.faderReach(n.l, n.to, now); this.st.flash[n.to] = 1;
    if (this.opt.hitsnd !== false) A.fxPlay('reach', this.opt.sfx * 0.7);
    this.vib(14);
  },
  /* 진동 (안드로이드 · 설정에서 끔) — 전용 노트 · 수습 · 풀콤보에만 짧게 */
  vib(ms) { if (this.opt.vib === false || !navigator.vibrate) return; try { navigator.vibrate(ms); } catch { /* */ } },
  /* 첫 판 · 새 노트 첫 등장 안내 (한 장): keys = ['lane', 'sc', 'fader', 'cue'] 중 처음 보는 것 */
  buildGuide(keys) {
    const g = $('#p_guide'); if (!keys.length) { g.innerHTML = ''; return; }
    const rows = keys.filter(k => k !== 'lane').map(k => GUIDE_ROW[k]).join('');
    g.innerHTML = keys.includes('lane')
      ? `<div class="card"><em>FIRST ON AIR</em><b>노트가 판정선에 닿는 순간,<br>그 레인을 톡</b><div class="tips"><span><i class="t-tap"></i>톡</span><span><i class="t-long"></i>끝까지 누르기</span><span><i class="t-chord"></i>둘 다 함께</span></div>${rows ? `<div class="new">${rows}</div>` : ''}<small>틀려도 괜찮아요 · 판정은 넉넉해요 · PC는 D F J K</small></div><div class="pads"><i></i><i></i><i></i><i></i></div>`
      : `<div class="card"><em>NEW · 오늘 처음 나오는 노트</em><div class="new only">${rows}</div><small>판정은 다른 노트와 똑같이 넉넉해요</small></div>`;
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
    /* 사고 수습: MISS 를 캐스트가 덮음 → 수습 대사 + 「수습!」 표시 + 콤보 유지 (점수는 MISS 그대로) */
    if (evs.some(x => x.guard)) {
      const hp = o.helper || o.diva;   /* 수습한 캐스트 = 옆자리 게스트(없으면 오늘의 캐스트) — 칩 이름 · 얼굴 · 대사가 같은 사람 (검수 B-4) */
      this.cutin(hp.fix || '괜찮아요, 계속!', hp); this.fixAt = now + 6;
      const g = $('#p_guard'); g.querySelector('span').textContent = hp.name; g.className = 'guardc'; void g.offsetWidth; g.className = 'guardc on';
      if (o.hitsnd !== false) A.fxPlay('soft', o.sfx * 0.6); this.vib(25); Live.queue.push({ text: '수습 장인' });
    }
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
  cutin(text, who) { const c = $('#p_cut'), w = who || this.opt.diva; c.querySelector('.face').style.backgroundImage = `url(${w.face})`; c.querySelector('small').textContent = w.en; c.querySelector('span').textContent = text; c.classList.add('on'); clearTimeout(this.cutT); this.cutT = setTimeout(() => c.classList.remove('on'), 1700); },
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
    for (let l = 0; l < 4; l++) { st.held[l] = !!P.sess.held[l]; const away = st.held[l] && st.slideU[l] != null && Math.floor(st.slideU[l]) !== l; if (!st.pressed[l] || away) st.flash[l] = Math.max(0, st.flash[l] - st.dt * 6.5); if (!st.held[l]) st.slideU[l] = null; }
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
    if ((p > READY_AT - 0.2 || (P.opt.guides && P.opt.guides.length && p > -P.lead + 1.7)) && P.introOff !== true) { P.introOff = true; $('#p_intro').classList.remove('on'); }
    /* 첫 판 조작 안내: 제목 카드 뒤 ~ READY 전 */
    if (P.opt.guides && P.opt.guides.length) { const gs = p > -P.lead + GUIDE_AT && p < Math.min(P.guideEnd, READY_AT - 0.3) ? 'on' : ''; if (gs !== P.guideState) { P.guideState = gs; $('#p_guide').className = 'guide' + (gs ? ' on' : ''); } }
    /* 연습 페이더 안내 글 */
    if (P.prac && !P.prac.tail) {
      const n = P.prac, su = st.slideU[n.l], wrong = su != null && (n.to > n.l ? su < n.l + 0.15 : su > n.l + 0.85);   /* 출발 레인 반대쪽 끝을 넘어 밂 */
      if (n.holding) P.pracSay(wrong ? 'wrong' : 'hold'); else if (!n.head && p > n.t - 48 / st.spd) P.pracSay('fall');
    }
    /* 안내 '봤음' 저장은 READY 를 지난 뒤 (안내 중에 나가면 다음 판에 다시 · 검수 C-1) */
    if (!P.readyFired && p >= READY_AT) { P.readyFired = true; P.opt.onReady && P.opt.onReady(); }
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
  quit() { Live.stop(); $('#p_guide').className = 'guide'; this.on = false; this.ended = true; this.paused = false; cancelAnimationFrame(this.raf); clearTimeout(this.endT); A.stop(0.3); A.resume(); },

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
  /* 페이더 밀기 (시험): dom 이면 진짜 손가락처럼 pointermove */
  autoMove(l, to, ms) {
    if (!this.auto.dom) { const r = this.sess.slide(to, this.pos(ms)); if (r) this.onReach(r); return; }
    const r = $('#box').getBoundingClientRect(), s = r.width / 390, x = r.left + (35 + 80 * to + 40) * s, y = r.top + 700 * s;
    $('#p_touch').dispatchEvent(new PointerEvent('pointermove', { pointerId: 10 + l, clientX: x, clientY: y, bubbles: true, cancelable: true, pointerType: 'touch' }));
  },
  autoplay(p, ms) {
    const a = this.auto, ns = this.notes;
    a.i ||= 0; a.hold ||= new Map(); a.slides ||= [];
    for (let k = a.slides.length - 1; k >= 0; k--) { const m = a.slides[k]; if (p >= m.at) { a.slides.splice(k, 1); this.autoMove(m.l, m.to, ms); } }
    for (const [l, end] of a.hold) if (p >= end - 0.02) { a.hold.delete(l); this.autoUp(l, ms); }
    while (a.i < ns.length) {
      const n = ns[a.i]; if (n._at == null) { n._skip = Math.random() < (a.miss || 0); n._at = n.t + ((Math.random() * 2 - 1) * (a.jitter || 0)) / 1000; }
      if (p < n._at) break;
      a.i++; if (n._skip) continue;
      this.autoDown(n.l, ms);
      if (n.kind === 'long') { a.hold.set(n.l, n.end); if (n.sp === 'fader') a.slides.push({ at: n.t + (n.end - n.t) * (0.35 + Math.random() * 0.3), l: n.l, to: n.to }); } else this.autoUp(n.l, ms);
    }
  },
};
