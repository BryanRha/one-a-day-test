// ⑧ 소리 계층 (DESIGN 8장): 표 하나(SFX) · 버스 3(배경 · 자주 · 보상) · 덕킹 · 음 계단 4종 · 3D(거리 · 좌우) · 설비 루프 · 지점 배경음
//   파일은 tools/audio_synth.mjs 가 모두 전체 RMS −16 dBFS 로 만들어 넣어요 (자주 = vol −8 → −24 · 보상 −3 → −19) → 실제 크기 = 파일 + vol(dB) + 버스(dB) — 시험 gate_sound 가 표로 재요
export const BUS = { bg: -13, often: 0, reward: 0 };   /* 버스 기본 크기(dB) · 목표(0.4.2): 배경 −33~−35 · 자주 −22~−26 · 보상 −18~−20 */
/* 이름 · 변형 수 · vol(dB, 파일 기준) · 버스 · ladder 음 계단 · d3 거리 감쇠 */
export const SFX = {   /* 0.4.2: 22 → 14종 · 모두 낮고 부드러운 소리(말렛 · 몸통 · 종이) · 자주 −24 · 보상 −19 */
  pick:      { n: 2, vol: -8, bus: 'often', ladder: true },
  place:     { n: 2, vol: -8, bus: 'often', ladder: true },
  bill:      { n: 2, vol: -8, bus: 'often', ladder: true },
  cash_get:  { n: 3, vol: -8, bus: 'often', soft: true },   /* 돈다발 세는 소리 (예전 돈 줍기 소리 가공) · 이어지면 점점 작게 */
  build:     { n: 2, vol: -3, bus: 'reward' },
  upgrade:   { n: 3, vol: -3, bus: 'reward' },
  oven_ding: { n: 2, vol: -8, bus: 'often', d3: true, soft: true },
  till:      { n: 2, vol: -8, bus: 'often', soft: true },
  door_bell: { n: 2, vol: -8, bus: 'often', d3: true, soft: true },
  phone:     { n: 2, vol: -8, bus: 'often', d3: true },
  hello:     { n: 2, vol: -3, bus: 'reward' },
  trash:     { n: 2, vol: -8, bus: 'often' },
  card:      { n: 2, vol: -8, bus: 'often' },
  levelup:   { n: 2, vol: -3, bus: 'reward' },
};
/* 설비 루프 (3m 안에서 커지고 8m 밖 0) · 홀 웅성임(앉은 손님 수 비례) · 배경음 = 지점마다 · vol(dB, 가장 가까울 때) */
export const LOOPS = { mixer: { file: 'loop_mixer', vol: 1 }, kettle: { file: 'loop_kettle', vol: 1 }, oven: { file: 'loop_oven', vol: 1 }, coffee: { file: 'loop_grinder', vol: 1 }, hall: { file: 'loop_hall', vol: 1 } };   /* 파일 −18 + vol + 배경 버스 −13 = 가까이 −30 · 홀 −31 (0.4.2) */
export const BGM = ['bgm_b1', 'bgm_b2', 'bgm_b3', 'bgm_b4'], BGM_VOL = -5;   /* 배경 버스 −13 + 파일 −16 − 5 = −34 (0.4.2: 더 조용히) */
const db = d => Math.pow(10, d / 20);
let ctx = null, master = null, bus = {}, duckG = null; const buf = {}, loading = {}; let cur = null, curName = '', want = '';
export const AUD = { sfx: true, bgm: true };
function ac() { if (ctx) return ctx; const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); master = ctx.createGain(); master.connect(ctx.destination);
  duckG = ctx.createGain(); duckG.connect(master); for (const k of Object.keys(BUS)) { bus[k] = ctx.createGain(); bus[k].gain.value = db(BUS[k]); bus[k].connect(k === 'bg' ? duckG : master); } apply(); return ctx; }
function apply() { if (!ctx) return; bus.often.gain.value = AUD.sfx ? db(BUS.often) : 0; bus.reward.gain.value = AUD.sfx ? db(BUS.reward) : 0; bus.bg.gain.value = db(BUS.bg); if (curBg) curBg.gain.value = AUD.bgm ? 1 : 0; for (const L of Object.values(loops)) L.g.gain.value = AUD.sfx ? L.g.gain.value : 0; }
let curBg = null;
export function unlock() { const c = ac(); if (c && c.state === 'suspended') c.resume(); if (want && !cur) music(want); }
addEventListener('pointerdown', unlock, { capture: true }); addEventListener('keydown', unlock, { capture: true });
document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
function get(name) { if (buf[name]) return Promise.resolve(buf[name]);
  return loading[name] ||= fetch(`assets/audio/${name}.m4a`).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(a => new Promise((ok, no) => ac().decodeAudioData(a, ok, no))).then(b => (buf[name] = b)).catch(() => null); }
export function preload() { if (!ac()) return; for (const [k, s] of Object.entries(SFX)) for (let i = 1; i <= s.n; i++) get(`sfx_${k}${i}`); for (const L of Object.values(LOOPS)) get(L.file); }
// ── 음 계단: 0.4초 안에 이어지면 반음씩 올라 완전5도(7)에서 멈춤 (0.4.2: 낮고 부드럽게 — 한 옥타브 대신) · 0.6초 쉬면 처음 음 · 끝나면 마지막 음 위에 3화음 한 번(작게)
export const LAD_TOP = 7;
const lad = {}, rep = {};
export const LOG = [], LADMAX = {};   /* 시험용: 최근 재생 [이름, 실제 dB, 반음] */
const ALIAS = { tap: 'card', pad_done: 'build', coupon: 'levelup', cash_land: null, hop: null, oven_door: null, happy: null, grumpy: null, hammer: null };   /* tap = 원어데이 소리 점검이 부르는 이름 · 0.4.2 에 뺀 소리는 null(조용히) 또는 남은 소리로 */
export function sfx(k, o = {}) {
  if (k in ALIAS) k = ALIAS[k]; const S = SFX[k]; if (!S) return; const c = ac(); const t = c ? c.currentTime : performance.now() / 1000;
  let semi = o.semi || 0;
  if (S.ladder) { const L = (lad[k] ||= { n: -1, at: -9, tm: 0 }); L.n = t - L.at < 0.4 ? Math.min(LAD_TOP, L.n + 1) : t - L.at > 0.6 ? 0 : L.n; if (L.n < 0) L.n = 0; L.at = t; semi += L.n;
    clearTimeout(L.tm); const top = semi; L.tm = setTimeout(() => { if (L.n >= 2) chord(k, top, o); L.n = -1; }, 450); }
  let vol = S.vol + (o.vol || 0); if (S.soft) { const R0 = (rep[k] ||= { n: 0, at: -9 }); R0.n = t - R0.at < 0.6 ? Math.min(4, R0.n + 1) : 0; R0.at = t; vol -= R0.n * 2.5; }   /* 이어지면 −2.5dB 씩 (최대 −10) */ if (S.d3 && o.dist != null) { const d = o.dist / 100; if (d > 8) return; vol += d < 3 ? 0 : 20 * Math.log10(Math.max(0.05, 1 - (d - 3) / 5)); }
  LOG.push([k, vol + BUS[S.bus], semi]); if (LOG.length > 400) LOG.shift(); if (S.ladder) LADMAX[k] = Math.max(LADMAX[k] || 0, semi - (o.semi || 0));   /* 계단 높이만 (손님 소리처럼 처음부터 낮춘 음은 뺌) */
  if (!c || !AUD.sfx) return; const v = o.v || 1 + Math.floor(Math.random() * S.n), name = `sfx_${k}${Math.min(S.n, v)}`, b = buf[name]; if (!b) { get(name); return; }
  const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = Math.pow(2, semi / 12) * (o.rate || 1); const g = c.createGain(); g.gain.value = db(vol);
  let node = g; if (o.pan != null && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = Math.max(-0.8, Math.min(0.8, o.pan)); g.connect(p); node = p; }
  s.connect(g); node.connect(bus[S.bus]); s.start(); if (S.bus === 'reward') duck(); }
function chord(k, top, o) { if (!ctx || !AUD.sfx) return; for (const iv of [0, 4, 7]) { const b = buf[`sfx_${k}1`]; if (!b) return; const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = Math.pow(2, (top + iv - 12) / 12);   /* 화음은 한 옥타브 아래 */ const g = ctx.createGain(); g.gain.value = db(SFX[k].vol - 10); s.connect(g); g.connect(bus.often); s.start(ctx.currentTime + 0.02); } }
/* 덕킹: 보상음이 나면 배경 −6dB 0.8초 */
function duck() { if (!duckG) return; const t = ctx.currentTime; duckG.gain.cancelScheduledValues(t); duckG.gain.setValueAtTime(db(-6), t); duckG.gain.linearRampToValueAtTime(1, t + 0.8); }
// ── 설비 루프 · 홀 웅성임: 늘 재생하고 크기만 바꿈 (gain 0 = 조용)
const loops = {};
export function loopLevel(id, k) {   /* k: 0~1 (거리 · 손님 수로 정함) */
  const L0 = LOOPS[id]; if (!L0) return; const c = ac(); if (!c) return; let L = loops[id];
  if (!L) { const b = buf[L0.file]; if (!b) { get(L0.file); return; } const s = c.createBufferSource(); s.buffer = b; s.loop = true; const g = c.createGain(); g.gain.value = 0; s.connect(g); g.connect(bus.bg); s.start(); L = loops[id] = { s, g }; }
  const v = AUD.sfx && k > 0.01 ? db(L0.vol) * k : 0; L.g.gain.setTargetAtTime(v, c.currentTime, 0.25); }
export function stopLoops() { for (const L of Object.values(loops)) L.g.gain.value = 0; }
export function music(name) {
  want = name; const c = ac(); if (!c || name === curName) return; curName = name; const old = cur; cur = null;
  if (old) { old.g.gain.setTargetAtTime(0, c.currentTime, 0.4); setTimeout(() => { try { old.s.stop(); } catch { /* */ } }, 1600); }
  if (!name) return;
  get(name).then(b => { if (!b || curName !== name) return; const s = c.createBufferSource(); s.buffer = b; s.loop = true; const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(AUD.bgm ? db(BGM_VOL) : 0, c.currentTime, 0.6); s.connect(g); g.connect(bus.bg); s.start(); cur = { s, g }; curBg = g; });
}
export function setAudio(o) { Object.assign(AUD, o); if (curBg && ctx) curBg.gain.value = AUD.bgm ? db(BGM_VOL) : 0; if (ctx) { bus.often.gain.value = AUD.sfx ? db(BUS.often) : 0; bus.reward.gain.value = AUD.sfx ? db(BUS.reward) : 0; } }
export const audioState = () => ({ ctx: !!ctx, cur: curName, AUD });
