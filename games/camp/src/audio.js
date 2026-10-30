// 소리: 전부 코드로 합성 (파일 0개 · 첫 화면 무게 0) — 효과음 + 직접 작곡한 배경음 2곡 (봄 '고원의 아침' · 가을 '단풍 오후')
//   배경음: 84bpm · F장조 · 우쿨렐레 같은 뜯는 소리 화음(I–vi–IV–V7 → I–iii–IV–V) + 펜타토닉 멜로디(실로폰) + 부드러운 베이스 + 새소리
//   효과음: 누름 · 코인(올라가는 두 음) · 대박 · 짓기(나무 톡톡) · 강화(반짝 아르페지오) · 레벨업(팡파르) · 열림 · 선물 · 고양이 · 실수(부드러운 낮은 음)
let ctx = null, master = null, sfxG = null, bgmG = null, rev = null;
export const AUD = { sfx: true, bgm: true };
function ac() {
  if (ctx) return ctx; const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C();
  master = ctx.createGain(); master.gain.value = 0.9; const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; master.connect(comp); comp.connect(ctx.destination);
  sfxG = ctx.createGain(); sfxG.gain.value = AUD.sfx ? SFX_VOL : 0; sfxG.connect(master);
  bgmG = ctx.createGain(); bgmG.gain.value = AUD.bgm ? BGM_VOL : 0; bgmG.connect(master);
  /* 작은 방 울림 (짧은 잡음 꼬리) */
  rev = ctx.createConvolver(); const L = ctx.sampleRate * 1.6, b = ctx.createBuffer(2, L, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < L; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / L) ** 3; }
  rev.buffer = b; const rg = ctx.createGain(); rg.gain.value = 0.22; rev.connect(rg); rg.connect(master);
  return ctx;
}
/* 큰 순간(새 단장 · 레벨업 · 열림)엔 배경음을 잠깐 낮춤 (효과음이 묻히지 않게) */
function duck(sec = 1.4, k = 0.35) { if (!bgmG || !AUD.bgm) return; const t = ctx.currentTime, v = BGM_VOL; bgmG.gain.cancelScheduledValues(t); bgmG.gain.setValueAtTime(bgmG.gain.value, t); bgmG.gain.linearRampToValueAtTime(v * k, t + 0.08); bgmG.gain.setValueAtTime(v * k, t + sec); bgmG.gain.linearRampToValueAtTime(v, t + sec + 0.6); }
const SFX_VOL = 0.8, BGM_VOL = 0.45;   /* 믹스 기준 (tools/soundmix.mjs 로 잼): 자주 나는 소리(누름 · 코인 · 응원) 최고 −21~−15dB · 보상(콤보 · 강화 · 대박) −12~−9dB · 큰 순간(새 단장 · 레벨업) −7~−5dB · 배경음 평균 −35dB */
export function unlock() { const c = ac(); if (!c) return; if (c.state !== 'running') c.resume().then(() => { if (wantBgm && !playing) startBgm(); }).catch(() => {}); else if (wantBgm && !playing) startBgm(); }
addEventListener('pointerdown', unlock, { capture: true });
document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
const hz = n => 440 * 2 ** ((n - 69) / 12);
/* 소리 하나: 모양(osc) · 음높이 · 시작 · 길이 · 크기 · 출력 */
function tone(type, n, t, dur, vol, out, o = {}) {
  const c = ctx, os = c.createOscillator(), g = c.createGain(); os.type = type; os.frequency.setValueAtTime(typeof n === 'number' && n < 200 ? hz(n) : n, t);
  if (o.slide) os.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (o.a || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = g; if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; g.connect(f); node = f; }
  os.connect(g); node.connect(out); if (o.wet && rev) node.connect(rev); os.start(t); os.stop(t + dur + 0.05);
}
function pluck(n, t, vol, out, dur = 0.9) { tone('triangle', n, t, dur, vol, out, { lp: 2400, wet: true }); tone('sine', n + 12, t, dur * 0.5, vol * 0.3, out); }
function bell(n, t, vol, out) { tone('sine', n, t, 1.2, vol, out, { wet: true }); tone('sine', n + 24, t, 0.35, vol * 0.25, out); tone('triangle', n + 19, t, 0.2, vol * 0.08, out); }
function noise(t, dur, vol, out, f = 1800) { const c = ctx, L = Math.ceil(c.sampleRate * dur), b = c.createBuffer(1, L, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < L; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = b; const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = 1.2; const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(fl); fl.connect(g); g.connect(out); s.start(t); }
const lastT = {};
export function sfx(k, o = {}) {
  const c = ac(); if (!c || !AUD.sfx || c.state !== 'running') return; const t = c.currentTime + 0.005, out = sfxG;
  if (lastT[k] && t - lastT[k] < (k === 'coin' ? 0.07 : 0.04)) return; lastT[k] = t;
  const up = o.up || 0;
  switch (k) {
    case 'tap': tone('triangle', 81, t, 0.06, 0.12, out, { slide: 520, lp: 3200 }); tone('sine', 69, t, 0.09, 0.1, out, { slide: 260 }); noise(t, 0.025, 0.035, out, 4200); break;   /* 나무 톡 (몸통 + 딸깍) */
    case 'tab': tone('triangle', 79, t, 0.08, 0.2, out); tone('triangle', 86, t + 0.05, 0.1, 0.18, out); break;
    case 'open': tone('sine', 72, t, 0.18, 0.18, out, { slide: 880 }); noise(t, 0.12, 0.04, out, 2600); break;
    case 'close': tone('sine', 79, t, 0.14, 0.14, out, { slide: 400 }); break;
    case 'coin': bell(88 + up, t, 0.13, out); bell(95 + up, t + 0.06, 0.09, out); break;
    case 'count': tone('square', 96, t, 0.03, 0.03, out, { lp: 3000 }); break;
    case 'crit': [84, 88, 91, 96].forEach((n, i) => bell(n, t + i * 0.05, 0.16, out)); noise(t, 0.3, 0.05, out, 5000); break;
    case 'heart': tone('sine', 81, t, 0.2, 0.12, out, { slide: 1200, wet: true }); break;
    case 'build': [0, 0.09, 0.18].forEach((d, i) => { tone('triangle', 60 + i * 2, t + d, 0.09, 0.3, out, { lp: 1400 }); noise(t + d, 0.05, 0.12, out, 900); }); [72, 76, 79, 84].forEach((n, i) => bell(n, t + 0.32 + i * 0.07, 0.13, out)); break;
    case 'up': [79, 83, 86, 91].forEach((n, i) => bell(n + up, t + i * 0.045, 0.12, out)); break;
    case 'tier': [72, 76, 79, 84, 88, 91, 96].forEach((n, i) => bell(n, t + i * 0.06, 0.14, out)); break;
    case 'level': duck(1.6, 0.3); { const m = [[72, 0], [76, 0.12], [79, 0.24], [84, 0.36], [79, 0.52], [84, 0.62]]; m.forEach(([n, d]) => { pluck(n, t + d, 0.22, out, 0.6); bell(n + 12, t + d, 0.06, out); }); pluck(60, t + 0.36, 0.2, out, 1.4); pluck(64, t + 0.36, 0.16, out, 1.4); pluck(67, t + 0.36, 0.16, out, 1.4); break; }
    case 'unlock': duck(1.2, 0.4); [67, 71, 74, 79, 83, 86].forEach((n, i) => pluck(n, t + i * 0.08, 0.18, out, 1.2)); noise(t, 0.6, 0.04, out, 6000); break;
    case 'gift': bell(86, t, 0.14, out); bell(91, t + 0.08, 0.14, out); bell(98, t + 0.16, 0.1, out); break;
    case 'box': noise(t, 0.4, 0.08, out, 1200); [72, 79, 84, 88, 91].forEach((n, i) => bell(n + (o.rar === 's' ? 5 : o.rar === 'r' ? 2 : 0), t + 0.3 + i * 0.07, 0.15, out)); break;
    case 'cat': tone('sine', 77, t, 0.35, 0.12, out, { slide: 520, a: 0.06 }); tone('sine', 82, t + 0.05, 0.3, 0.06, out, { slide: 700, a: 0.06 }); break;
    case 'serve': tone('triangle', 76, t, 0.08, 0.12, out); tone('triangle', 81, t + 0.06, 0.1, 0.1, out); break;
    case 'no': tone('sine', 62, t, 0.16, 0.18, out); tone('sine', 59, t + 0.1, 0.2, 0.14, out); break;
    case 'story': [69, 72, 76, 81].forEach((n, i) => pluck(n, t + i * 0.12, 0.14, out, 1.4)); break;
    case 'chime': [84, 91, 96].forEach((n, i) => bell(n, t + i * 0.09, 0.1, out)); break;
    case 'ding': bell(91, t, 0.1, out); bell(98, t + 0.05, 0.06, out); break;
    case 'pop': tone('sine', 70, t, 0.11, 0.24, out, { slide: 1500 }); noise(t, 0.04, 0.07, out, 3200); bell(91 + up, t + 0.045, 0.13, out); bell(98 + up, t + 0.09, 0.07, out); break;   /* 직접 팔기: 뿅 + 동전 두 알 (콤보면 음이 올라감) */
    case 'cheer': tone('triangle', 72 + up, t, 0.07, 0.13, out, { lp: 2600 }); tone('sine', 60 + up, t, 0.06, 0.1, out); noise(t, 0.05, 0.045, out, 1600); break;   /* 불 지피기 (훅 + 톡) */
    case 'combo': { const v = 0.1 + Math.min(up, 8) * 0.01; [84, 88, 91, 96].slice(0, 2 + Math.min(2, up >> 2)).forEach((n, i) => bell(n + up, t + i * 0.04, v, out)); noise(t + 0.02, 0.18, 0.03 + up * 0.004, out, 6500); tone('triangle', 60 + up, t, 0.12, 0.12, out, { lp: 900 }); break; }   /* 콤보: 칸마다 음 · 개수 · 반짝 · 둥 이 함께 커짐 */
    case 'stageup': { duck(2.2, 0.25); noise(t, 0.7, 0.07, out, 1400); [0, 0.12, 0.24, 0.36].forEach(d => noise(t + d, 0.18, 0.025, out, 5000 + d * 6000));   /* 새 단장: 바람 휙 → 따뜻한 화음 → 반짝 폭포 */
      [53, 60, 65, 69, 72].forEach((n, i) => pluck(n, t + 0.42 + i * 0.03, 0.16, out, 1.8)); tone('sine', 41, t + 0.42, 1.4, 0.22, out, { lp: 300 }); [84, 88, 91, 96, 100, 103].forEach((n, i) => bell(n, t + 0.5 + i * 0.07, 0.12, out)); bell(108, t + 1.0, 0.08, out); break; }
    case 'reward': [79, 84, 88].forEach((n, i) => bell(n, t + i * 0.07, 0.14, out)); break;
  }
}

/* ── 배경음 2곡 (직접 작곡 · 파일 0개) — 봄 '고원의 아침' · 가을 '단풍 오후' (시즌에 따라 setSong) ── */
let wantBgm = false, playing = false, nextT = 0, beat = 0, timer = null;
const melOf = M => { const a = []; let b = 0; for (const [n, d] of M) { if (n) a.push([b, n, d]); b += d; } return a; };
/* 봄: 84bpm · 4/4 · F장조 · 우쿨렐레 뜯기 + 실로폰 멜로디 + 새소리 */
const SPRING = { bpm: 84, bar: 4, melLen: 64,
  CH: [[53, 57, 60, 65], [50, 57, 62, 65], [46, 58, 62, 65], [48, 58, 60, 64], [53, 57, 60, 65], [45, 57, 60, 64], [46, 58, 62, 65], [48, 55, 60, 64],
    [53, 57, 60, 65], [50, 57, 62, 65], [46, 58, 62, 65], [48, 58, 60, 64], [46, 58, 62, 65], [45, 57, 60, 64], [43, 58, 62, 65], [48, 55, 60, 64]],
  mel: melOf([
    [77, 1], [0, .5], [74, .5], [72, 1], [74, 1], [77, 1.5], [79, .5], [81, 2], [79, 1], [77, 1], [74, 2], [72, 1], [0, 1],
    [69, 1], [72, 1], [74, 1.5], [72, .5], [70, 1], [69, 1], [67, 2], [69, 1], [72, 1], [74, 1], [77, 1], [76, 3], [0, 1],
    [81, 1], [0, .5], [79, .5], [77, 1], [79, 1], [81, 1.5], [84, .5], [81, 2], [79, 1], [77, 1], [74, 2], [77, 1], [0, 1],
    [74, 1], [72, 1], [70, 1.5], [69, .5], [67, 1], [69, 1], [72, 2], [74, 1], [72, 1], [69, 1], [67, 1], [65, 3], [0, 1]]),
  play(t, b, ch, out, SPB) {
    if (b === 0) { tone('sine', ch[0] - 12, t, SPB * 1.8, 0.28, out, { lp: 500 }); ch.slice(1).forEach((n, i) => pluck(n, t + i * 0.025, 0.07, out, SPB * 1.6)); }
    if (b === 2) { tone('sine', ch[0] - 5, t, SPB * 1.4, 0.18, out, { lp: 500 }); ch.slice(1).forEach((n, i) => pluck(n, t + i * 0.02, 0.055, out, SPB)); }
    if (b === 1 || b === 3) { ch.slice(1).forEach(n => pluck(n + 12, t + SPB * 0.5, 0.025, out, SPB * 0.5)); noise(t, 0.05, 0.012, out, 7000); }
    if (Math.random() < 0.04) { const s = 2400 + Math.random() * 1200; tone('sine', s, t, 0.08, 0.02, out, { slide: s * 1.4 }); tone('sine', s * 1.1, t + 0.1, 0.06, 0.016, out, { slide: s * 0.9 }); }   /* 새소리 */
  }, lead: (n, t, out) => bell(n, t, 0.06, out) };
/* 가을: 72bpm · 3/4 왈츠 · D장조 · 낮은 기타 뜯기(쿵-짝-짝) + 따뜻한 나무 피리 멜로디 + 낙엽 바스락 · 모닥불 톡 */
const AUTUMN = { bpm: 72, bar: 3, melLen: 48,
  CH: [[50, 57, 62, 66], [47, 54, 59, 62], [43, 55, 59, 62], [45, 52, 57, 61], [50, 57, 62, 66], [42, 54, 57, 61], [43, 55, 59, 62], [45, 55, 57, 61],
    [47, 54, 59, 62], [43, 55, 59, 64], [50, 57, 62, 66], [45, 52, 57, 61], [43, 55, 59, 62], [45, 54, 57, 61], [47, 55, 59, 62], [45, 55, 57, 61]],
  mel: melOf([
    [74, 2], [76, 1], [78, 2], [74, 1], [71, 3], [0, 3], [69, 1], [71, 1], [74, 1], [76, 2], [78, 1], [76, 3], [0, 3],
    [78, 2], [81, 1], [83, 2], [81, 1], [78, 2], [76, 1], [74, 3], [71, 1], [74, 1], [76, 1], [74, 3], [73, 3], [0, 3]]),
  play(t, b, ch, out, SPB) {
    if (b === 0) { tone('sine', ch[0] - 12, t, SPB * 2.6, 0.3, out, { lp: 420 }); pluck(ch[0], t, 0.08, out, SPB * 2.4); }
    else { ch.slice(1).forEach((n, i) => tone('triangle', n, t + i * 0.018, SPB * 0.9, 0.045, out, { lp: 1600, wet: true })); }
    if (Math.random() < 0.05) noise(t + Math.random() * SPB, 0.22, 0.012, out, 3500);   /* 낙엽 바스락 */
    if (Math.random() < 0.03) { tone('triangle', 96, t, 0.03, 0.02, out, { lp: 5000 }); noise(t, 0.03, 0.02, out, 2500); }   /* 모닥불 톡 */
  }, lead: (n, t, out, d, SPB) => { tone('triangle', n, t, Math.min(1.6, d * SPB * 0.95), 0.055, out, { a: 0.06, lp: 2200, wet: true }); tone('sine', n + 12, t, 0.3, 0.012, out); } };
let SONG = SPRING;
export function setSong(id) { const next = id === 'autumn' ? AUTUMN : SPRING; if (next === SONG) return; SONG = next; if (playing) { stopBgm(); startBgm(); } }
function startBgm() {
  const c = ac(); if (!c || playing || !AUD.bgm) return; if (c.state !== 'running') return; playing = true; nextT = c.currentTime + 0.1; beat = 0;
  timer = setInterval(sched, 120); sched();
}
function sched() {
  const c = ctx; if (!c || !playing) return; if (c.state !== 'running') return; const SPB = 60 / SONG.bpm;
  while (nextT < c.currentTime + 0.5) {
    const bar = Math.floor(beat / SONG.bar) % SONG.CH.length, t = nextT, out = bgmG;
    SONG.play(t, beat % SONG.bar, SONG.CH[bar], out, SPB);
    const mb = beat % SONG.melLen; for (const [at, n, d] of SONG.mel) if (at >= mb && at < mb + 1) SONG.lead(n, t + (at - mb) * SPB, out, d, SPB);
    nextT += SPB; beat++;
  }
}
function stopBgm() { playing = false; clearInterval(timer); timer = null; }
export function music(on) { wantBgm = on; if (on) startBgm(); else stopBgm(); }
export function setAudio(o) { Object.assign(AUD, o); ac(); if (sfxG) sfxG.gain.value = AUD.sfx ? SFX_VOL : 0; if (bgmG) { bgmG.gain.cancelScheduledValues(0); bgmG.gain.value = AUD.bgm ? BGM_VOL : 0; } if (AUD.bgm && wantBgm) startBgm(); if (!AUD.bgm) stopBgm(); }
