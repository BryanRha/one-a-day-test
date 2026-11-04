// 이야기 규칙 (docs/NARRATIVE.md) — 진행 · 하루 한 걸음 · 인물 합류(창에 불) · 관계 · 기억 도감 · 세 등불 · 열쇠 기억
//  three · DOM 없음 → node 시험(tools/test_logic.mjs)에서도 씀. 대사 글은 talk/*.js (나눠 받음 · story_ui.js 가 불러옴)
import { ITEMS } from './data.js?v=0.99.8';

/* ───── 인물 6 (창 여섯 = 이 순서) · 말하는 이 ───── */
export const CAST = {
  gombang: { name: '곰방', role: '고물상', animal: '너구리', color: '#c99a5a' },
  moru:    { name: '모루', role: '기술자', animal: '비버',   color: '#a8784e' },
  neuru:   { name: '느루', role: '요리사', animal: '카피바라', color: '#d9a66a' },
  haedam:  { name: '해담', role: '의무관', animal: '바다거북', color: '#7fb48a' },
  seori:   { name: '서리', role: '기록관', animal: '물범',   color: '#8fb3d9' },
  baram:   { name: '바람', role: '떠돌이', animal: '족제비', color: '#9a8fb5' },
};
export const CAST_KEYS = Object.keys(CAST);
export const SPEAK = { ...CAST, nole: { name: '노을', role: '목소리', color: '#ffb44a' }, pasu: { name: '파수', role: '목소리', color: '#6fe0d8' }, mongi: { name: '몽이', role: '', color: '#8a6a4c' }, me: { name: '', role: '' } };
/* 대사 원고의 짧은 이름 */
export const ALIAS = { g: 'gombang', m: 'moru', n: 'neuru', h: 'haedam', s: 'seori', b: 'baram', o: 'nole', p: 'pasu', y: 'mongi' };

/* ───── 세 등불 (엔딩 게이지 — 숫자 없이 은신처 벽 등불 밝기로만) ───── */
export const SIDES = { land: { name: '땅', txt: '되찾기', color: '#e0a060' }, lamp: { name: '등불', txt: '함께 살기', color: '#ffc861' }, sea: { name: '바다', txt: '돌려보내기', color: '#6fe0d8' } };
export const SIDE_OF = { gombang: 'land', moru: 'land', neuru: 'lamp', haedam: 'lamp', seori: 'sea', baram: 'sea', box: 'sea' };
export const LAMP_FULL = 12; /* 이 값이면 가장 밝음 (1~3장 최대: 열쇠 기억 6 × 2 + 장 끝 선택 2 + 인물 1~2) */

/* ───── 열쇠 기억 12 (장마다 2) — 1~3장 6개만 이번에 · 맡길 수 있는 사람(box = 도감 상자 → 서리 몫, 바다) ───── */
export const KEYMEM = {
  k_tags:    { name: '수문지기 이름표 묶음', ch: 1, to: ['gombang', 'neuru', 'box'] },
  k_nole:    { name: '노을의 짐표',         ch: 1, to: ['moru', 'neuru', 'box'] },
  k_glove:   { name: '등대지기의 장갑',      ch: 2, to: ['moru', 'haedam', 'box'] },
  k_ticket:  { name: '마지막 배표',          ch: 2, to: ['gombang', 'haedam', 'box'] },
  k_basket:  { name: '빈 열차 분실물 바구니', ch: 3, to: ['gombang', 'neuru', 'seori'] },
  k_badge:   { name: '노을의 수색대 배지',    ch: 3, to: ['moru', 'haedam', 'seori'] },
};
export const KEY_TOTAL = 12;

/* ───── 장 ───── */
export const CHAPTERS = { 1: { name: '맡겨 둔 짐', map: 'ware' }, 2: { name: '마지막 배', map: 'harbor' }, 3: { name: '멈춘 열차', map: 'tunnel' }, 4: { name: '불을 만든 곳', map: null } };

/* ───── 이야기 걸음 (하루 한 걸음) ─────
 *  need.q: 그 의뢰(본 사슬 q1~q28)를 끝내야 열림 · nextDay: 앞 걸음을 끝낸 다음 날부터 · join: 열릴 때 은신처에 들어옴(창에 불)
 *  goal: carry(그 지도 · 구역 상자에서 이야기 물건 들고 탈출) · power · zone · extract · quest(본 사슬 의뢰가 끝나 있으면 바로) · 없음(장면만)
 *  cut: 장 끝 컷신(assets/story/cut_<장>_<n>.webp — 아트 세션 · 없으면 색 배경) · title: 장 제목 카드 */
export const BEATS = [
  { id: 'b_tut',    ch: 1, tut: true, name: '첫 인양' },
  { id: 'b_moru',   ch: 1, giver: 'gombang', name: '이름표 셋', join: 'moru', goal: { t: 'carry', item: 'tagbundle', map: 'ware', zone: 2 }, txt: '깊은 창고에서 이름표 묶음을 들고 탈출', reward: { shells: 80, bolt: 4 } },
  { id: 'b_power',  ch: 1, giver: 'moru', name: '정직한 기계', goal: { t: 'power', map: 'ware' }, txt: '침수 창고 발전기를 켜고 탈출', reward: { wire: 4, glass: 1 } },
  { id: 'b_neuru',  ch: 1, giver: 'neuru', name: '국거리', need: { q: 'q5' }, join: 'neuru' },
  { id: 'b_gate',   ch: 1, giver: 'moru', name: '멈추게 해', need: { q: 'q7' }, goal: { t: 'quest', q: 'q8' }, txt: '수문지기 멈추기 (의뢰 8)' },
  { id: 'b_ch1end', ch: 1, name: '1장의 끝', nextDay: true, cut: ['cut_1_1', 'cut_1_2'] },
  { id: 'b_ch2',    ch: 2, giver: 'moru', name: '마지막 배', need: { q: 'q11' }, title: 2, goal: { t: 'extract', map: 'harbor' }, txt: '밤의 항구에서 살아 나오기', reward: { shells: 60 } },
  { id: 'b_haedam', ch: 2, giver: 'haedam', name: '배표 꾸러미', join: 'haedam', goal: { t: 'carry', item: 'ferrytix', map: 'harbor', zone: 1 }, txt: '부두에서 배표 꾸러미를 들고 탈출', reward: { bandage: 2, cloth: 6 } },
  { id: 'b_ledger', ch: 2, giver: 'gombang', name: '곰방 상회 장부', goal: { t: 'carry', item: 'ledger', map: 'harbor', zone: 2 }, txt: '야적장에서 낡은 장부를 들고 탈출', reward: { shells: 200 } },
  { id: 'b_light',  ch: 2, giver: 'haedam', name: '꺼진 등대', goal: { t: 'quest', q: 'q17' }, txt: '갈고리 선장 쓰러뜨리기 (의뢰 17)' },
  { id: 'b_ch2end', ch: 2, name: '2장의 끝', nextDay: true, cut: ['cut_2_1', 'cut_2_2'] },
  { id: 'b_ch3',    ch: 3, giver: 'seori', name: '멈춘 열차', need: { q: 'q19' }, title: 3, join: 'seori', goal: { t: 'carry', item: 'roster', map: 'tunnel', zone: 1 }, txt: '역 승강장에서 승객 명부를 들고 탈출', reward: { shells: 150, herb: 6 } },
  { id: 'b_freq',   ch: 3, giver: 'seori', name: '낯선 주파수', goal: { t: 'zone', map: 'tunnel', zone: 3 }, txt: '터널 제어실에 들어갔다 탈출', reward: { lens: 1 } },
  { id: 'b_boot',   ch: 3, giver: 'neuru', name: '빈 좌석의 장화', goal: { t: 'carry', item: 'lboot', map: 'tunnel', zone: 2 }, txt: '잠긴 선로에서 장화 한 짝을 들고 탈출', reward: { shells: 120, herb: 4 } },
  { id: 'b_eel',    ch: 3, giver: 'moru', name: '두 번째 코어', goal: { t: 'quest', q: 'q25' }, txt: '터널 장어 쓰러뜨리기 (의뢰 25)' },
  { id: 'b_ch3end', ch: 3, name: '3장의 끝', nextDay: true, cut: ['cut_3_1', 'cut_3_2'], last: true },
];
export const BEAT_IDX = Object.fromEntries(BEATS.map((b, i) => [b.id, i]));
/* 녹음기 (지도마다 3) · 벽 낙서 (지도마다 6) — 글은 talk/memo.js */
export const TAPES = { ware: ['t_w1', 't_w2', 't_w3'], harbor: ['t_h1', 't_h2', 't_h3'], tunnel: ['t_t1', 't_t2', 't_t3'] };
export const TAPE_NOLE = ['t_w3', 't_h3', 't_t3'];
export const GRAF_N = 6;
/* 기억 도감 칸: 전리품 전부 + 이야기 물건 (녹음기 제외 — 녹음기는 따로) */
export const CODEX_KEYS = Object.keys(ITEMS).filter(k => k !== 'tape');
export const REL_LV = [[0, '처음 본 사이'], [3, '아는 사이'], [6, '믿는 사이'], [10, '오랜 동료']];
export const relName = n => REL_LV.filter(([v]) => n >= v).pop()[1];

/* ───── 저장 (S.story) ───── */
export const freshStory = () => ({ v: 1, tut: 0, tutRaids: 0, beat: 0, open: null, openDay: null, doneQ: [], beatsDone: {}, credits: 0, creditDay: null,
  joined: [], met: [], rel: {}, gauge: { land: 0, lamp: 0, sea: 0 }, keyMem: {}, keyQ: [], codex: {}, tapes: [], tapeQ: [], graf: [], flags: {}, talkDay: {}, talkIdx: {}, dayEnd: null, choices: {} });
/* 저장에서 읽은 값 다듬기 (모르는 값 · 빠진 칸) */
export function fixStory(o) {
  const n = freshStory(); if (!o || typeof o !== 'object') return n;
  const m = Object.assign(n, o); m.gauge = Object.assign(freshStory().gauge, o.gauge);
  for (const k of ['doneQ', 'joined', 'met', 'keyQ', 'tapes', 'tapeQ', 'graf']) if (!Array.isArray(m[k])) m[k] = [];
  for (const k of ['beatsDone', 'rel', 'keyMem', 'codex', 'flags', 'talkDay', 'talkIdx', 'choices']) if (!m[k] || typeof m[k] !== 'object') m[k] = {};
  m.joined = m.joined.filter(k => CAST[k]); m.beat = Math.max(0, Math.min(BEATS.length, m.beat | 0));
  if (m.open && !BEATS.some(b => b.id === m.open)) m.open = null; m.doneQ = m.doneQ.filter(id => BEAT_IDX[id] != null); m.keyQ = m.keyQ.filter(k => KEYMEM[k]);
  for (const k of Object.keys(m.codex)) if (!ITEMS[k]) delete m.codex[k];
  return m;
}
/* 처음 만들기 · v3 이하에서 옮겨 올 때: 이미 진행한 사람은 지금 장의 처음부터 (지난 장은 기록실에서 다시 보기) */
export function initStory(S, today, fromOld) {
  const st = S.story = freshStory(); st.creditDay = today;
  const done = S.quests?.done || []; const played = (S.stats?.raids || 0) > 0 || done.length > 0;
  if (!fromOld || !played) return st;
  const start = done.includes('q19') ? 'b_ch3' : done.includes('q11') ? 'b_ch2' : 'b_moru';
  const idx = BEAT_IDX[start];
  for (let i = 0; i < idx; i++) { const b = BEATS[i]; st.beatsDone[b.id] = 'old'; if (b.join) st.joined.push(b.join); }
  st.tut = 4; st.beat = idx; st.beatsDone.b_tut = 'old'; st.joined.unshift('gombang'); st.credits = 1; st.flags.welcome = 1;
  for (const k of new Set(S.stash || [])) if (ITEMS[k] && k !== 'tape') st.codex[k] = 1; /* 창고에 있는 건 이미 본 조각으로 */
  return st;
}
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
/* 하루가 바뀌면 이야기 걸음 1 (못 온 날은 최대 3까지 쌓아 둠 — 돌아온 날 한꺼번에) */
export function rollStory(S, today) {
  const st = S.story || (S.story = freshStory());
  if (!st.creditDay) { st.creditDay = today; return; }
  if (st.creditDay === today) return;
  const n = Math.max(1, days(st.creditDay, today) || 1); st.credits = Math.min(3, (st.credits || 0) + n); st.creditDay = today;
}

/* ───── 걸음 ───── */
export const beatNow = S => BEATS[S.story.beat] || null;
export const openBeat = S => (S.story.open ? BEATS[BEAT_IDX[S.story.open]] : null);
export const chapter = S => { const b = beatNow(S); return b ? b.ch : 3; };
export function needMet(S, b, today) {
  if (!b || b.tut) return false;
  if (b.need?.q && !(S.quests?.done || []).includes(b.need.q)) return false;
  if (b.nextDay) { const prev = BEATS[BEAT_IDX[b.id] - 1]; const d = S.story.beatsDone[prev.id]; if (!d || d === today) return false; }
  return true;
}
/* 오늘 열 수 있는 걸음 (튜토리얼이 끝나고 · 열린 걸음이 없고 · 걸음 1 남음) */
export function canOpen(S, today) {
  const st = S.story; if (st.tut < 4 || st.open || st.doneQ.length || (st.credits || 0) < 1) return null;
  const b = beatNow(S); return b && needMet(S, b, today) ? b : null;
}
/* 튜토리얼 끝 (장면 6 또는 건너뛰기) → 다음 날부터 하루 한 걸음 */
export function finishTut(S, today) { const st = S.story; st.tut = 4; st.beatsDone.b_tut ||= today; st.beat = Math.max(st.beat, 1); if (!st.joined.includes('gombang')) st.joined.unshift('gombang'); }
/* 걸음 열기 → 장면(story_ui) · 목표 없는 걸음은 바로 끝 */
export function startBeat(S, b, today) {
  const st = S.story; st.credits = Math.max(0, st.credits - 1); st.open = b.id; st.openDay = today;
  if (b.join && !st.joined.includes(b.join)) st.joined.push(b.join);
  if (!b.goal) finishBeat(S, b, today, false);
  else if (b.goal.t === 'quest' && (S.quests?.done || []).includes(b.goal.q)) { /* 이미 끝낸 의뢰면 장면 뒤 바로 끝 */ }
}
/* 걸음 끝: 보상 · 다음 걸음 · (done 장면을 은신처에서 보게 doneQ) */
export function finishBeat(S, b, today, withScene = true) {
  const st = S.story; if (st.beatsDone[b.id]) return false;
  st.beatsDone[b.id] = today; st.open = null; st.beat = Math.max(st.beat, BEAT_IDX[b.id] + 1);
  if (b.reward) give(S, b.reward);
  if (withScene) st.doneQ.push(b.id);
  return true;
}
function give(S, r) { for (const [k, n] of Object.entries(r)) { if (k === 'shells') S.shells += n; else if (S.mats && k in S.mats) S.mats[k] += n; else for (let i = 0; i < n; i++) S.stash.push(k); } }
/* 판 결과로 목표 확인 */
export function goalMet(S, b, res) {
  const g = b?.goal; if (!g) return false; if (g.t === 'quest') return (S.quests?.done || []).includes(g.q);
  if (!res || res.outcome !== 'extract' || (g.map && (res.map || 'ware') !== g.map)) return false;
  const all = [...res.items, ...res.safe, ...res.pet];
  if (g.t === 'carry') return all.includes(g.item);
  if (g.t === 'power') return !!res.power;
  if (g.t === 'zone') return res.zoneMax >= g.zone;
  if (g.t === 'extract') return true;
  return false;
}
/* 은신처에서 확인 (본 사슬 의뢰가 끝났는지) */
export function storyTick(S, today) {
  const b = openBeat(S); if (b && b.goal?.t === 'quest' && goalMet(S, b)) { finishBeat(S, b, today); return b; } return null;
}
/* 판에 넣을 이야기 물건: 열린 걸음이 carry 고 그 지도면 { item, zone } */
export function storyWant(S, map) { const b = openBeat(S); const g = b?.goal; return g && g.t === 'carry' && g.map === map ? { item: g.item, zone: g.zone, beat: b.id } : null; }
/* 이 지도에서 아직 안 들은 녹음기 */
export const tapeLeft = (S, map) => (TAPES[map] || []).filter(t => !S.story.tapes.includes(t) && !S.story.tapeQ.includes(t));

/* ───── 판 뒤 (main.js endRaid 가 창고에 넣기 전에 부름) ─────
 *  이야기 물건(cat memo)은 창고로 가지 않고 도감 · 녹음기로 · 처음 들고 나온 물건은 기억 조각 · 세 번째면 사연 한 줄 더
 *  쓰러진 판의 가방(res.items)은 시체 자리에 그대로 남김 */
export function afterRaid(S, res, today) {
  const st = S.story; const ex = res.outcome === 'extract'; const out = { newMemo: [], third: [], tapes: [], beatDone: null, tut: 0 };
  const kept = ex ? [...res.items, ...res.safe, ...res.pet] : [...res.safe, ...(res.petSafe ? res.pet : [])];
  for (const k of kept) {
    if (k === 'tape') { const t = tapeLeft(S, res.map || 'ware')[0]; if (t) { st.tapeQ.push(t); out.tapes.push(t); } continue; }
    if (!ITEMS[k]) continue; const c = st.codex[k] || 0; st.codex[k] = c + 1;
    if (!c) out.newMemo.push(k); else if (c + 1 === 3) out.third.push(k);
  }
  /* 튜토리얼 판 세기 */
  if (st.tut >= 1 && st.tut <= 3) { st.tutRaids = (st.tutRaids || 0) + 1; out.tut = st.tutRaids; if (!ex) st.flags['tutDied' + st.tutRaids] = 1; if (!ex) st.flags.tutDiedAny = 1; }
  /* 이야기 걸음 목표 */
  const b = openBeat(S); if (b && goalMet(S, b, res)) { finishBeat(S, b, today); out.beatDone = b.id; }
  /* 이야기 물건은 창고로 안 감 */
  const strip = a => { for (let i = a.length - 1; i >= 0; i--) if (ITEMS[a[i]]?.cat === 'memo') a.splice(i, 1); };
  if (ex) { strip(res.items); strip(res.pet); } strip(res.safe); if (res.petSafe || ex) strip(res.pet);
  return out;
}

/* ───── 관계 · 세 등불 · 열쇠 기억 ───── */
export function addRel(S, who, n = 1) { const r = S.story.rel; r[who] = (r[who] || 0) + n; }
export function addGauge(S, side, n = 1) { if (S.story.gauge[side] != null) S.story.gauge[side] += n; }
/* 효과 묶음 { rel: { gombang: 1 }, gauge: { lamp: 1 }, flag: 'x' } */
export function applyFx(S, fx) {
  if (!fx) return; for (const [k, n] of Object.entries(fx.rel || {})) addRel(S, ALIAS[k] || k, n);
  for (const [k, n] of Object.entries(fx.gauge || {})) addGauge(S, k, n); if (fx.flag) S.story.flags[fx.flag] = 1;
}
/* 열쇠 기억 맡기기: 그 사람 쪽 등불 +2 · 그 사람과 사이 +1 */
export function giveKey(S, id, who) {
  const st = S.story; if (!KEYMEM[id] || st.keyMem[id]) return false; if (!KEYMEM[id].to.includes(who)) return false;
  st.keyMem[id] = who; addGauge(S, SIDE_OF[who], 2); if (CAST[who]) addRel(S, who, 1); st.keyQ = st.keyQ.filter(k => k !== id); return true;
}
/* 세 등불 밝기 0~1 */
export const lampLevel = (S, side) => Math.min(1, (S.story.gauge[side] || 0) / LAMP_FULL);
/* 창에 불 (합류한 인물) · 바람은 4장 합류 전엔 '만남'만 */
export const lit = S => CAST_KEYS.filter(k => S.story.joined.includes(k));
export const visitor = S => S.story.met.includes('baram') && !S.story.joined.includes('baram');
/* 은신처 말 걸기: 하루에 한 번 '…' (합류한 인물 · 만난 떠돌이) */
/* 합류 전 인물은 말하지 않음 (v0.5.1 · QA: 터널 판에서 아직 안 온 서리 무전) — 무전 · 의뢰 카드 · 결과 한 마디가 모두 여기를 지남
 *  곰방 = 첫 무전부터 · 노을/파수(목소리) · 몽이 = 늘 · 바람 = 판 안에서 만난 뒤 · 나머지 인물은 합류(창에 불)한 뒤 */
export function present(S, id) { const st = S.story; if (!CAST[id] || id === 'gombang') return true; return st.joined.includes(id) || (id === 'baram' && st.met.includes('baram')); }
/* 무전 한 줄 고르기: [말하는 이, 글] 이 아직 없는 사람이면 곰방 줄(alt) · 그것도 안 되면 null(말 안 함) */
export function voiceLine(S, line, alt) { for (const l of [line, alt]) if (l && present(S, ALIAS[String(l[0]).replace('~', '')] || String(l[0]).replace('~', ''))) return l; return null; }
/* 의뢰인: 와 있으면 그 사람 · 아니면 곰방이 대신 전함 (relay = 그 사람의 일 이름) */
export function giverVoice(S, who) { return present(S, who) ? { id: who, relay: null } : { id: 'gombang', relay: CAST[who]?.role || '' }; }
export const canTalk = (S, who) => S.story.joined.includes(who) || (who === 'baram' && visitor(S));
export const talkDue = (S, who, today) => canTalk(S, who) && S.story.talkDay[who] !== today;
export function talked(S, who, today, n) { const st = S.story; if (st.talkDay[who] !== today) { st.talkDay[who] = today; addRel(S, who, 1); } st.talkIdx[who] = n; }
/* 하루 끝 인사 (출격을 다 쓰고 은신처에 왔을 때 한 번) */
export const dayEndDue = (S, today) => S.story.tut >= 4 && S.sorties <= 0 && S.story.dayEnd !== today && !S.story.doneQ.length;

/* ───── 글 ───── */
const batchim = w => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
/* '{name}' → 이름 · '{name:이/가}' → 받침에 맞춘 조사 */
export const say = (t, name = '단비') => String(t).replace(/\{name(?::([^/}]*)\/([^}]*))?\}/g, (m, a, b) => (a != null ? name + (batchim(name) ? a : b) : name));
export const NAME_KEY = 'salvage_name', NAME_DEFAULT = '단비', NAME_MAX = 6;
export const cleanName = s => String(s || '').replace(/[<>&"'`{}]/g, '').trim().slice(0, NAME_MAX) || NAME_DEFAULT;
