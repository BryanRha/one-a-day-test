// 프로듀서 온에어 판정 엔진 (화면 · 소리 없이 시간만 다룸 → Node 에서 바로 시험)
//   시간은 모두 '곡 위치(초)' — 오디오 시계(AudioContext)에서 계산한 값을 play.js 가 넣어 줌
//   판정은 너그럽게 (유능감): 이른 헛누름은 벌하지 않고 무시, 롱노트 끝은 조금 일찍 떼도 PERFECT

export const WIN = { perfect: 0.055, great: 0.1, good: 0.15 };   /* ± 초 */
export const TAIL_EARLY = 0.16;
/* MISS 확정 여유: 판정 창(GOOD)이 지나고도 이만큼 기다린 뒤 MISS — 손가락 이벤트가 늦게 처리돼도(메인 스레드가 바쁠 때 30~60ms)
   이벤트 시각 기준으로 GOOD 창 안이었던 입력이 먼저 지워지지 않게 (v0.3 검수 A5) · 화면의 흐려짐은 GOOD 창 끝부터 */
export const MISS_GRACE = 0.08;
/* 페이더: 끝 시각 + 이만큼 전까지 목표 레인에 닿으면 꼬리 PERFECT (가는 길의 시점은 따지지 않음 · 롱노트 꼬리처럼 너그럽게) */
export const FADER_LATE = 0.15;                                 /* 롱노트 끝: 이만큼 일찍 떼도 끝까지 누른 걸로 */
/* 연습 페이더(v0.5.2 · 재검수 B-1): 머리를 보통 창(±0.15초)이 아니라 몸통이 지나가는 동안(끝 이만큼 전까지) 언제 눌러도 잡힘 — 연습은 타이밍을 묻지 않음 */
export const PRACTICE_TAIL = 0.6;
export const ACC = { perfect: 1, great: 0.8, good: 0.5, miss: 0 };
export const JUDGES = ['perfect', 'great', 'good', 'miss'];

/* 박 → 곡 위치(초) · 곡 위치 → 박: 박 지도(tmap = 박마다 실제 시각, 템포가 흐르는 곡)가 있으면 그것으로, 없으면 고정 BPM
   소수 박은 앞뒤 박 사이 직선 보간 · 지도 밖은 끝 간격으로 이어 감 (tools/beatmap.mjs atBeat 와 같은 식) */
export function clock(chart, shift = 0) {
  const tm = chart.tmap;
  if (!tm || tm.length < 2) { const spb = 60 / chart.bpm, b0 = chart.beat0 + shift; return { at: b => b0 + b * spb, beatOf: t => (t - b0) / spb }; }
  const n = tm.length;
  const at = b => { const i = Math.max(0, Math.min(n - 2, Math.floor(b))); return tm[i] + (tm[i + 1] - tm[i]) * (b - i) + shift; };
  const beatOf = t => { t -= shift; let lo = 0, hi = n - 1; if (t <= tm[0]) lo = 0, hi = 1; else if (t >= tm[n - 1]) lo = n - 2, hi = n - 1; else while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tm[m] <= t) lo = m; else hi = m; } return lo + (t - tm[lo]) / (tm[hi] - tm[lo]); };
  return { at, beatOf };
}

/* 채보(JSON) → 노트 목록. shift: 디코더마다 다른 앞 무음 길이 보정(초)
   노트 형식: [박, 레인, 길이?, 종류?, 목표 레인?] — 종류 'sc' 슈퍼챗(탭과 같은 판정) · 'cue' 큐(탭과 같은 판정) · 'fader' 페이더(롱노트 + 목표 레인까지 밀기)
   ONAIR_PLAN 10장 · 새 노트도 판정 창은 같다 (PERFECT ±55 · GREAT ±100 · GOOD ±150) */
export function parseChart(chart, diff, shift = 0, meet = null) {
  const d = chart.diffs[diff]; if (!d) throw new Error('난이도 없음: ' + diff);
  const at = clock(chart, shift).at;
  let notes = d.notes.map((n, i) => {
    const t = at(n[0]), o = { id: i, beat: n[0], t, l: n[1] | 0, kind: n[2] ? 'long' : 'tap', end: n[2] ? at(n[0] + n[2]) : t, chord: false, head: null, tail: null, holding: false, delta: 0, sp: n[3] || null };
    if (o.sp === 'fader') { o.to = n[4] | 0; o.reached = false; }
    return o;
  });
  if (meet && meet.fader) notes = meetFader(notes, meet.fader);
  if (meet && meet.drill) notes = [...meet.drill.map(d => ({ id: -1, beat: null, t: d.t, l: d.l, kind: d.len ? 'long' : 'tap', end: d.t + (d.len || 0), chord: false, head: null, tail: null, holding: false, delta: 0, sp: d.sp || null, drill: d.step })), ...notes];   /* 리허설 노트 (곡 앞 소리 없는 구간 · 점수에 안 셈) */
  notes.sort((a, b) => a.t - b.t || a.l - b.l);
  notes.forEach((n, i) => { n.id = i; });   /* 동시치기 짝(pair)은 정렬된 뒤의 번호로 (연습 노트가 앞에 끼어도 어긋나지 않게) */
  for (let i = 0; i < notes.length; i++) for (let j = i + 1; j < notes.length && notes[j].t - notes[i].t < 0.002; j++) { notes[i].chord = notes[j].chord = true; notes[i].pair = notes[j].id; notes[j].pair = notes[i].id; }
  notes.forEach((n, i) => { n.id = i; });
  return notes;
}

/* 페이더를 처음 만나는 판 (v0.5.1 · 검수 B-1 — docs/FEEL.md 10-1)
   원인: 페이더는 유일하게 손을 옮기는 조작인데, 첫 판이 안내 한 줄 뒤 곡 첫 10초 안에 페이더 3~4개를 연달아 줌
   → ① 곡 앞(소리 없는 여유 시간)에 판정 없는 느린 연습 페이더 1개 (practice: 점수 · 판정 개수 · 콤보 · 수습에 안 셈)
     ② 곡 시작 calm 초 안의 페이더는 이 판만 보통 롱노트로 (같은 레인 · 같은 길이 → 판정 개수 그대로) — 곡 안 페이더가 하나도 안 남으면 마지막 하나는 둠
   opt = { at: 연습 머리 시각, len: 연습 길이(초), calm: 초, l: 출발 레인, to: 목표 레인 } */
export function meetFader(notes, { at, len = 2, calm = 15, l = 1, to = 2 } = {}) {
  const fs = notes.filter(n => n.sp === 'fader'), keep = fs.some(n => n.t >= calm) ? null : fs[fs.length - 1];
  for (const n of fs) if (n.t < calm && n !== keep) { n.sp = null; delete n.to; delete n.reached; }
  const p = { id: -1, beat: null, t: at, l, kind: 'long', end: at + len, chord: false, head: null, tail: null, holding: false, delta: 0, sp: 'fader', to, reached: false, practice: true };
  return [p, ...notes];
}

/* 등급: 정확도 기준 · F 없음 (가장 낮아도 C) */
export function rankOf(acc, miss) {
  if (acc >= 0.985 && miss === 0) return 'SS';
  if (acc >= 0.9) return 'S';
  if (acc >= 0.8) return 'A';
  if (acc >= 0.7) return 'B';
  return 'C';
}

export class Session {
  constructor(notes) {
    this.notes = notes;
    this.total = notes.reduce((s, n) => s + (n.practice || n.drill ? 0 : n.kind === 'long' ? 2 : 1), 0);   /* 연습 · 리허설 노트는 안 셈 */
    this.count = { perfect: 0, great: 0, good: 0, miss: 0 };
    this.fast = 0; this.slow = 0;
    this.combo = 0; this.maxCombo = 0; this.done = 0; this.accSum = 0;
    this.held = [null, null, null, null];   /* 레인마다 잡고 있는 롱노트 */
    this.cursor = 0;                         /* 이 앞은 모두 판정 끝 */
    this.events = [];
    /* hooks.miss(note, lane, tail): MISS 가 확정되기 직전에 불림 */
    this.hooks = { miss: null };
    /* 사고 수습(v0.5): hooks.miss 가 'guard' 를 돌려주면 그 MISS 는 콤보만 이어 줌. 점수 · 정확도 · 등급 · 판정 개수는 MISS 그대로
       점수의 콤보 몫은 수습 없이 센 콤보(rawMax)로 → 수습은 점수에 영향 0 (ONAIR_PLAN 6장 순위 공정성) */
    this.guard = 0; this.rawCombo = 0; this.rawMax = 0;
  }
  get score() { return this.total ? Math.round(900000 * this.accSum / this.total + 100000 * this.rawMax / this.total) : 0; }
  get acc() { return this.done ? this.accSum / this.done : 1; }        /* 지금까지 친 것 기준 (화면 표시용) */
  get finished() { return this.done >= this.total; }
  judge(j, n, lane, delta, tail = false) {
    if (n.practice || n.drill) { const e = { type: 'judge', j, lane, delta, note: n, tail, combo: this.combo, guard: false, practice: true }; this.events.push(e); return e; }   /* 연습 · 리허설(v0.7.1 첫 실행): 보여 주기만 (점수 · 콤보 · 수습 · 판정 개수 그대로) — 판정 창은 보통 노트와 같음 */
    const guarded = j === 'miss' && this.hooks.miss ? this.hooks.miss(n, lane, tail) === 'guard' : false;
    this.count[j]++; this.done++; this.accSum += ACC[j];
    if (j === 'miss') { this.rawCombo = 0; if (guarded) this.guard++; else this.combo = 0; }
    else { this.combo++; this.rawCombo++; if (this.combo > this.maxCombo) this.maxCombo = this.combo; if (this.rawCombo > this.rawMax) this.rawMax = this.rawCombo; }
    if (!tail && j !== 'perfect' && j !== 'miss') { if (delta < 0) this.fast++; else this.slow++; }
    const e = { type: 'judge', j, lane, delta, note: n, tail, combo: this.combo, guard: guarded };
    this.events.push(e); return e;
  }
  /* 누름: 그 레인에서 판정 창 안의 가장 이른 노트 · 없으면 null (헛누름 = 벌 없음) */
  press(lane, t) {
    let best = null;
    for (let i = this.cursor; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.t - t > WIN.good) break;
      if (n.l !== lane || n.head) continue;
      if (Math.abs(t - n.t) <= WIN.good || (n.practice && t > n.t && t <= n.end - PRACTICE_TAIL)) { best = n; break; }
    }
    if (!best) return null;
    const d = t - best.t, a = Math.abs(d);
    const j = a <= WIN.perfect ? 'perfect' : a <= WIN.great ? 'great' : 'good';
    best.head = j; best.delta = d;
    if (best.kind === 'long') { best.holding = true; this.held[lane] = best; }
    this.advance();
    return this.judge(j, best, lane, d);
  }
  /* 뗌: 롱노트 끝 판정 */
  release(lane, t) {
    const n = this.held[lane]; if (!n) return null;
    this.held[lane] = null; n.holding = false;
    if (n.sp === 'fader' && !n.reached) { n.tail = 'miss'; return this.judge('miss', n, lane, 0, true); }   /* 목표 레인에 못 닿고 뗌 */
    if (n.practice) { n.tail = 'perfect'; return this.judge('perfect', n, lane, 0, true); }   /* 연습: 목표에 닿았으면 언제 떼도 성공 */
    if (t >= n.end - TAIL_EARLY) { n.tail = 'perfect'; return this.judge('perfect', n, lane, 0, true); }
    const part = (t - n.t) / Math.max(0.01, n.end - n.t);
    n.tail = part >= 0.5 ? 'good' : 'miss';
    return this.judge(n.tail, n, lane, 0, true);
  }
  /* 페이더를 잡은 손가락이 레인 'lane' 에 닿음 (옆으로 밀기 · 키보드는 목표 레인 키) → 목표 쪽으로 다 왔으면 reached
     돌려줌: 닿게 만든 페이더 노트 | null */
  slide(lane, t, exact = false) {
    for (const n of this.held) {
      if (!n || n.sp !== 'fader' || n.reached) continue;
      const dir = Math.sign(n.to - n.l);
      /* exact: 따로 누른 손가락 · 키는 목표 레인 그 자체만 (목표 너머 레인의 다른 노트를 삼키지 않게) · 미는 손가락은 지나쳐도 됨 */
      if (exact ? lane === n.to : (dir > 0 && lane >= n.to) || (dir < 0 && lane <= n.to)) { if (t <= n.end + FADER_LATE) { n.reached = true; n.reachT = t; return n; } }
    }
    return null;
  }
  advance() { while (this.cursor < this.notes.length) { const n = this.notes[this.cursor]; if (n.head && (n.kind === 'tap' || n.tail)) this.cursor++; else break; } }
  /* 누르기 직전: 그 이벤트 시각 기준으로 창이 이미 지난 앞 노트들을 먼저 MISS 로 확정 (v0.3.1 재검수 B-2)
     → 판정은 언제나 이벤트 시각 순서: 'A miss → B perfect' (유예 MISS_GRACE 는 아직 안 온 입력을 기다릴 때만) */
  settle(t) {
    const out = [];
    for (let i = this.cursor; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.t > t) break;
      if (!n.head && (n.practice ? t > n.end - PRACTICE_TAIL : t - n.t > WIN.good)) {
        n.head = 'miss'; out.push(this.judge('miss', n, n.l, 0));
        if (n.kind === 'long') { n.tail = 'miss'; out.push(this.judge('miss', n, n.l, 0, true)); }
      }
    }
    this.advance();
    return out;
  }
  /* 매 프레임: 지나간 노트 MISS · 끝까지 누른 롱노트 자동 완료 */
  update(t) {
    const out = [];
    for (let l = 0; l < 4; l++) {
      const n = this.held[l]; if (!n) continue;
      if (n.sp === 'fader') {   /* 끝 + 여유 안에 목표에 닿았으면 PERFECT, 끝까지 못 닿으면 MISS */
        if (t >= n.end && n.reached) { this.held[l] = null; n.holding = false; n.tail = 'perfect'; out.push(this.judge('perfect', n, l, 0, true)); }
        else if (t >= n.end + FADER_LATE) { this.held[l] = null; n.holding = false; n.tail = 'miss'; out.push(this.judge('miss', n, l, 0, true)); }
        continue;
      }
      if (t >= n.end) { this.held[l] = null; n.holding = false; n.tail = 'perfect'; out.push(this.judge('perfect', n, l, 0, true)); }
    }
    for (let i = this.cursor; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.t > t) break;
      if (!n.head && (n.practice ? t > n.end - PRACTICE_TAIL + MISS_GRACE : t - n.t > WIN.good + MISS_GRACE)) {
        n.head = 'miss'; out.push(this.judge('miss', n, n.l, 0));
        if (n.kind === 'long') { n.tail = 'miss'; out.push(this.judge('miss', n, n.l, 0, true)); }
      }
    }
    this.advance();
    return out;
  }
  result() {
    const acc = this.total ? this.accSum / this.total : 0;
    return { score: this.score, acc, rank: rankOf(acc, this.count.miss), count: { ...this.count }, maxCombo: this.maxCombo, total: this.total,
      guard: this.guard, fc: this.count.miss === 0, ap: this.count.miss === 0 && this.count.great === 0 && this.count.good === 0, fast: this.fast, slow: this.slow };
  }
}
