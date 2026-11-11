// 원트랙 판정 엔진 (화면 · 소리 없이 시간만 다룸 → Node 에서 바로 시험)
//   시간은 모두 '곡 위치(초)' — 오디오 시계(AudioContext)에서 계산한 값을 play.js 가 넣어 줌
//   판정은 너그럽게 (유능감): 이른 헛누름은 벌하지 않고 무시, 롱노트 끝은 조금 일찍 떼도 PERFECT

export const WIN = { perfect: 0.055, great: 0.1, good: 0.15 };   /* ± 초 */
export const TAIL_EARLY = 0.16;
/* MISS 확정 여유: 판정 창(GOOD)이 지나고도 이만큼 기다린 뒤 MISS — 손가락 이벤트가 늦게 처리돼도(메인 스레드가 바쁠 때 30~60ms)
   이벤트 시각 기준으로 GOOD 창 안이었던 입력이 먼저 지워지지 않게 (v0.3 검수 A5) · 화면의 흐려짐은 GOOD 창 끝부터 */
export const MISS_GRACE = 0.08;                                 /* 롱노트 끝: 이만큼 일찍 떼도 끝까지 누른 걸로 */
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

/* 채보(JSON) → 노트 목록. shift: 디코더마다 다른 앞 무음 길이 보정(초) */
export function parseChart(chart, diff, shift = 0) {
  const d = chart.diffs[diff]; if (!d) throw new Error('난이도 없음: ' + diff);
  const at = clock(chart, shift).at;
  const notes = d.notes.map((n, i) => {
    const t = at(n[0]), o = { id: i, beat: n[0], t, l: n[1] | 0, kind: n[2] ? 'long' : 'tap', end: n[2] ? at(n[0] + n[2]) : t, chord: false, head: null, tail: null, holding: false, delta: 0 };
    return o;
  }).sort((a, b) => a.t - b.t || a.l - b.l);
  for (let i = 0; i < notes.length; i++) for (let j = i + 1; j < notes.length && notes[j].t - notes[i].t < 0.002; j++) { notes[i].chord = notes[j].chord = true; notes[i].pair = notes[j].id; notes[j].pair = notes[i].id; }
  notes.forEach((n, i) => { n.id = i; });
  return notes;
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
    this.total = notes.reduce((s, n) => s + (n.kind === 'long' ? 2 : 1), 0);
    this.count = { perfect: 0, great: 0, good: 0, miss: 0 };
    this.fast = 0; this.slow = 0;
    this.combo = 0; this.maxCombo = 0; this.done = 0; this.accSum = 0;
    this.held = [null, null, null, null];   /* 레인마다 잡고 있는 롱노트 */
    this.cursor = 0;                         /* 이 앞은 모두 판정 끝 */
    this.events = [];
    /* 다음 단계(방어모드) 자리: MISS 가 확정되기 직전에 불림 · 지금은 비어 있고 돌려준 값도 쓰지 않음 (판정 · 점수 그대로)
       기획 승인 뒤: hooks.miss(note, lane, tail) 가 'guard' 를 돌려주면 '보호' 판정으로 바꾸는 식 */
    this.hooks = { miss: null };
  }
  get score() { return this.total ? Math.round(900000 * this.accSum / this.total + 100000 * this.maxCombo / this.total) : 0; }
  get acc() { return this.done ? this.accSum / this.done : 1; }        /* 지금까지 친 것 기준 (화면 표시용) */
  get finished() { return this.done >= this.total; }
  judge(j, n, lane, delta, tail = false) {
    if (j === 'miss' && this.hooks.miss) this.hooks.miss(n, lane, tail);
    this.count[j]++; this.done++; this.accSum += ACC[j];
    if (j === 'miss') this.combo = 0; else { this.combo++; if (this.combo > this.maxCombo) this.maxCombo = this.combo; }
    if (!tail && j !== 'perfect' && j !== 'miss') { if (delta < 0) this.fast++; else this.slow++; }
    const e = { type: 'judge', j, lane, delta, note: n, tail, combo: this.combo };
    this.events.push(e); return e;
  }
  /* 누름: 그 레인에서 판정 창 안의 가장 이른 노트 · 없으면 null (헛누름 = 벌 없음) */
  press(lane, t) {
    let best = null;
    for (let i = this.cursor; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.t - t > WIN.good) break;
      if (n.l !== lane || n.head) continue;
      if (Math.abs(t - n.t) <= WIN.good) { best = n; break; }
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
    if (t >= n.end - TAIL_EARLY) { n.tail = 'perfect'; return this.judge('perfect', n, lane, 0, true); }
    const part = (t - n.t) / Math.max(0.01, n.end - n.t);
    n.tail = part >= 0.5 ? 'good' : 'miss';
    return this.judge(n.tail, n, lane, 0, true);
  }
  advance() { while (this.cursor < this.notes.length) { const n = this.notes[this.cursor]; if (n.head && (n.kind === 'tap' || n.tail)) this.cursor++; else break; } }
  /* 누르기 직전: 그 이벤트 시각 기준으로 창이 이미 지난 앞 노트들을 먼저 MISS 로 확정 (v0.3.1 재검수 B-2)
     → 판정은 언제나 이벤트 시각 순서: 'A miss → B perfect' (유예 MISS_GRACE 는 아직 안 온 입력을 기다릴 때만) */
  settle(t) {
    const out = [];
    for (let i = this.cursor; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.t > t) break;
      if (!n.head && t - n.t > WIN.good) {
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
    for (let l = 0; l < 4; l++) { const n = this.held[l]; if (n && t >= n.end) { this.held[l] = null; n.holding = false; n.tail = 'perfect'; out.push(this.judge('perfect', n, l, 0, true)); } }
    for (let i = this.cursor; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.t > t) break;
      if (!n.head && t - n.t > WIN.good + MISS_GRACE) {
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
      fc: this.count.miss === 0, ap: this.count.miss === 0 && this.count.great === 0 && this.count.good === 0, fast: this.fast, slow: this.slow };
  }
}
