// 「AI 가 본 나, 한 단어」 v2 (2026-11-03 대표 확정 · team/decisions.md · 기획 team/dev/tasks/261103-oneword-fun/v2-plan.md)
//   결과 = 캐릭터 · 사물 · 장면 한 단어 + 한 줄 풀이 + 이모지 (oneword-r.js) · 질문 = 문화 · 밈 · 스포츠 · 음악 … (oneword-q.js) · 이번 주 유행 팩 (oneword-pack.js)
//   흐름: 날짜 → 오늘의 주제(dayTheme · 모두 같음) · 날짜 + 나이대 → 오늘의 질문 5개(dayQuestions · 30일 안 반복 없음)
//         답 → 꼬리표 무게(profile) → 그 주제에서 후보 4개(candidates · 나이대 · 계절 · 일진 · 씨앗) → 서버(Haiku)가 하나 고르고 한 줄 · 안 되면 규칙
//         희귀 1%: 씨앗 해시로 정해짐(확률 공개 · 판매 X) · '자연' 주제는 v1 꽃 · 색 · 날씨 카드 그대로(oneword.js natureCand)
//   화면(oneword-ui.js) · 서버(api/oneword.js 가 _lib/ow/ 복사본을 씀 — tools/oneword_check.mjs 가 같은지 검사) 모두 이 파일 하나로 계산 → 같은 날 같은 답 = 같은 결과
//   개인정보: 생년은 기기에만 · 서버로는 나이대 코드(teen · 20a · 20b · 30 · 40 · 50 · all)만 · 내 유형(4글자)은 화면 칩 · 친구 비교에만 (AI 입력 X)
import * as V1 from './oneword.js';
import { R } from './oneword-r.js';
import { Q } from './oneword-q.js';
import { PACKS } from './oneword-pack.js';

export const { fnv, ilgin, TAGS, TAG_KO } = V1;
export const AGES = ['teen', '20a', '20b', '30', '40', '50'];
export const AGE_KO = { teen: '10대 후반', '20a': '20대 초반', '20b': '20대 후반', 30: '30대', 40: '40대', 50: '50대 이상', all: '모두' };
export const AGE_SHORT = { teen: '10대', '20a': '20대 초', '20b': '20대 후반', 30: '30대', 40: '40대', 50: '50대+', all: '공통' };
export const okAge = a => a === 'all' || AGES.includes(a);
/* 생년 → 나이대 (운세에 넣은 생년 · 기기에서만 계산) */
export function ageOf(year, now = new Date()) {
  const y = Number(year); if (!y || y < 1900) return '';
  const n = now.getFullYear() - y;
  return n < 20 ? 'teen' : n < 25 ? '20a' : n < 30 ? '20b' : n < 40 ? '30' : n < 50 ? '40' : '50';
}

/* 주제: 자연은 v1 꽃 카드 · 유형 밈은 격주 금요일(월 1~2회) · 유행은 팩이 살아 있는 주의 토요일 */
export const THEMES = {
  culture: { ko: '문화', e: '🎬', en: 'CULTURE', c: '#C9B4E8' }, meme: { ko: '밈', e: '🫠', en: 'MEME', c: '#9CC9EE' },
  sport: { ko: '스포츠', e: '⚾', en: 'SPORTS', c: '#7FB08A' }, music: { ko: '음악', e: '🎧', en: 'MUSIC', c: '#EFA58A' },
  food: { ko: '음식', e: '🍜', en: 'FOOD', c: '#C9A784' }, daily: { ko: '일상', e: '☕', en: 'DAILY', c: '#F5CFD8' },
  nature: { ko: '자연', e: '🌿', en: 'NATURE', c: '#A9C79A' }, type: { ko: '유형 밈', e: '🧩', en: 'TYPES', c: '#F6D58A' },
  trend: { ko: '이번 주 유행', e: '🔥', en: 'TRENDING', c: '#F2A0A8' },
};
export const BASE = ['culture', 'meme', 'sport', 'music', 'food', 'daily', 'nature'];
const CODE = { culture: 'cu', meme: 'me', sport: 'sp', music: 'mu', food: 'fo', daily: 'da', type: 'ty' };
export const TINTS = ['#EFA58A', '#9CC9EE', '#C9A784', '#7FB08A', '#F5CFD8', '#C9B4E8', '#F6D58A', '#A9C79A'];

/* ── 날짜 ── */
const DAY = 864e5, WEEK0 = Date.parse('2026-10-26T00:00:00Z');   /* 월요일 */
const t0 = d => Date.parse(d + 'T00:00:00Z');
export const dayAdd = (d, n) => new Date(t0(d) + n * DAY).toISOString().slice(0, 10);
const weekIdx = d => Math.floor((t0(d) - WEEK0) / (7 * DAY));
const dow = d => (((t0(d) - WEEK0) / DAY) % 7 + 7) % 7;   /* 0 월 … 6 일 */
const month = d => Number(d.slice(5, 7));
const u01 = s => (fnv(s) + 1) / 4294967297;
function shuffle(arr, key) { return arr.map((x, i) => [x, fnv(key + '|' + i + '|' + x)]).sort((a, b) => a[1] - b[1]).map(p => p[0]); }

/* ── 이번 주 유행 팩 ── */
export const packLive = (p, day) => (p.status === 'ready' || p.status === 'live') && day >= p.live;
export const packAge = (p, day) => Math.floor((t0(day) - t0(p.live)) / DAY);   /* 공개 뒤 며칠 · 28 이상이면 은퇴 후보 */
export const activePacks = day => PACKS.filter(p => packLive(p, day));
const weekPack = day => PACKS.find(p => packLive(p, day) && packAge(p, day) >= 0 && packAge(p, day) < 7);

/* ── 오늘의 주제 (모두 같음) ── */
const weekPerm = w => {
  const p = shuffle(BASE, 'th|' + w);
  const prev = shuffle(BASE, 'th|' + (w - 1));
  if (p[0] === prev[6]) [p[0], p[1]] = [p[1], p[0]];   /* 주가 바뀌어도 같은 주제 이틀 연속 없음 (앞 주 일요일은 덮어쓰지 않으므로 그대로 비교) */
  return p;
};
export function dayTheme(day) {
  const w = weekIdx(day), k = dow(day);
  if (k === 5 && weekPack(day)) return 'trend';
  if (k === 4 && w % 2 === 0) return 'type';
  return weekPerm(w)[k];
}
/* 오늘의 다른 주제 하나 더 (골드 30 · 광고 1번): 오늘과 다른 기본 주제 둘 */
export function moreThemes(day) {
  const th = dayTheme(day), p = weekPerm(weekIdx(day)), k = dow(day), out = [];
  for (let i = 1; out.length < 2 && i < 8; i++) { const t = p[(k + i) % 7]; if (t !== th && t !== 'nature' && !out.includes(t)) out.push(t); }
  return out;
}

/* ── 결과 ── */
const mkR = (theme, code) => (x, i) => ({ id: code + String(i + 1).padStart(3, '0'), theme, e: x[0], n: x[1], l: x[2], ages: x[3].split('').map(Number), t: x[4].split(' '), rare: x[5] === 'rare', m: /^m=/.test(x[5] || '') ? x[5].slice(2).split(',').map(Number) : null, x: x[5] === 'x' });
export const RESULTS = Object.entries(R).flatMap(([th, L]) => L.map(mkR(th, CODE[th])));
export const PACK_R = PACKS.flatMap(p => p.r.map((x, i) => ({ ...mkR('trend', '')(x, i), id: `w${p.id.slice(-2)}r${String(i + 1).padStart(2, '0')}`, pack: p.id })));
const RBY = new Map([...RESULTS, ...PACK_R].map(x => [x.id, x]));
export const resultById = id => RBY.get(id) || null;
const ageW = (ages, age) => age === 'all' ? (ages.filter(v => v >= 1).length >= 5 ? 2 : ages.some(v => v >= 2) ? 1 : 0) : ages[AGES.indexOf(age)];
/* 그날 그 주제에서 나올 수 있는 결과 (나이대 1 이상 · 계절 · 은퇴 X) */
export function pool(theme, day, age, rare = false) {
  const L = theme === 'trend' ? activePacks(day).flatMap(p => PACK_R.filter(x => x.pack === p.id)) : RESULTS.filter(x => x.theme === theme);
  const mo = month(day);
  return L.filter(x => !x.x && x.rare === rare && (!x.m || x.m.includes(mo)) && ageW(x.ages, age) >= 1);
}
/* 도감 칸 (주제별 · 은퇴 · 계절 무관 전부) */
export const dexList = theme => theme === 'nature' ? V1.FLOWERS : theme === 'trend' ? PACK_R : RESULTS.filter(x => x.theme === theme);

/* ── 질문 ── */
const mkQ = (topic, code) => (x, i) => ({ id: 'q' + code + String(i + 1).padStart(3, '0'), topic, k: x[0], ages: x[1].split('').map(Number), q: x[2], o: x[3].map(([e, t, g]) => ({ e, t, g: g.split(' ') })), x: x[4] === 'x' });
export const QUESTIONS = Object.entries(Q).flatMap(([tp, L]) => L.map(mkQ(tp, CODE[tp])));
export const PACK_Q = PACKS.flatMap(p => p.q.map((x, i) => ({ ...mkQ('trend', '')(x, i), id: `w${p.id.slice(-2)}q${String(i + 1).padStart(2, '0')}`, pack: p.id })));
const QBY = new Map([...QUESTIONS, ...PACK_Q].map(x => [x.id, x]));
export const questionById = id => QBY.get(id) || null;
export const nOpts = q => q.k === 'slider' ? 5 : q.o.length;
export const KIND_KO = { bal: '밸런스 게임 · 둘 중 하나만', two: '둘 중 하나', emoji: '이모지 고르기', scene: '상황극', slider: '숫자 슬라이더', four: '넷 중 하나' };

/* 그날의 질문 5개 (같은 날 · 같은 나이대 = 모두 같음) — 2026-11-01 부터 하루씩 차례로 정해 30일 안 반복을 막음 (계산은 한 번 · 캐시)
   규칙: 형식 3종 이상 · 슬라이더 1 이하 · 주제 2 이하 · 오늘의 주제와 맞는 질문 1~2개(주말 3) · 나이대 가중치(1 · 2 · 3)만큼 자주 */
const QEPOCH = '2026-11-01', QMEMO = new Map(), NOREP = 30;
const TOPIC_OF = { culture: 'culture', meme: 'meme', sport: 'sport', music: 'music', food: 'food', daily: 'daily', type: 'type', trend: 'trend', nature: '' };
function qPool(day, age) {
  const live = activePacks(day).map(p => p.id);
  return [...QUESTIONS, ...PACK_Q.filter(x => live.includes(x.pack))].filter(x => !x.x && ageW(x.ages, age) >= 1);
}
function pickDay(day, age, recent) {
  const th = dayTheme(day), tp = TOPIC_OF[th], wkend = dow(day) >= 5;
  const all = qPool(day, age), fresh = all.filter(x => !recent.has(x.id)), L = fresh.length >= 20 ? fresh : all;
  /* 가중 무작위 순서(가중치가 클수록 앞으로 · 날짜 · 나이대 씨앗) */
  const ord = L.map(x => [x, -Math.log(u01(`q|${day}|${age}|${x.id}`)) / ageW(x.ages, age)]).sort((a, b) => a[1] - b[1]).map(p => p[0]);
  const out = [], kinds = new Set(), tops = {};
  const ok = x => !out.includes(x) && (x.k !== 'slider' || !kinds.has('slider')) && (tops[x.topic] || 0) < (x.topic === tp ? 3 : 2);
  const add = x => { out.push(x); kinds.add(x.k); tops[x.topic] = (tops[x.topic] || 0) + 1; };
  const need = tp ? (wkend ? 3 : 1 + (fnv(`qt|${day}`) % 2)) : 0;
  for (const x of ord) { if (out.length >= need) break; if (x.topic === tp && ok(x)) add(x); }
  for (const x of ord) {
    if (out.length >= 5) break;
    if (!ok(x) || (x.topic === tp && out.length >= need && tops[tp] >= need)) continue;
    if (!kinds.has(x.k) || 5 - out.length > 3 - kinds.size) add(x);
  }
  for (const x of ord) { if (out.length >= 5) break; if (!out.includes(x)) add(x); }   /* 안전망 (풀이 아주 작을 때) */
  /* 순서: 슬라이더 · 상황극은 가운데, 밸런스로 시작 */
  const rank = { bal: 0, emoji: 1, two: 2, slider: 3, scene: 4, four: 2 };
  return out.map((x, i) => [x, rank[x.k] * 10 + (fnv(`qo|${day}|${x.id}`) % 7)]).sort((a, b) => a[1] - b[1]).map(p => p[0]);
}
export function dayQuestions(day, age = 'all') {
  if (!okAge(age)) age = 'all';
  const key = age + '|' + day;
  if (QMEMO.has(key)) return QMEMO.get(key);
  if (day <= QEPOCH) { const v = pickDay(day, age, new Set()); QMEMO.set(key, v); return v; }
  /* 앞에서부터 차례로 (가장 가까운 캐시된 날에서 이어 감) */
  let d = QEPOCH; for (let k = 1; k <= 400; k++) { const p = dayAdd(day, -k); if (p < QEPOCH) break; if (QMEMO.has(age + '|' + p)) { d = p; break; } }
  if (!QMEMO.has(age + '|' + d)) QMEMO.set(age + '|' + d, pickDay(d, age, new Set()));
  while (d < day) {
    const nd = dayAdd(d, 1), rec = new Set();
    for (let k = 1; k < NOREP; k++) { const v = QMEMO.get(age + '|' + dayAdd(nd, -k)); if (v) v.forEach(x => rec.add(x.id)); }
    QMEMO.set(age + '|' + nd, pickDay(nd, age, rec)); d = nd;
  }
  return QMEMO.get(key);
}
export const qsetId = (day, qa) => `${day.replace(/-/g, '')}${qa}`;
export const validAnswers = (qs, a) => Array.isArray(a) && a.length === qs.length && qs.length === 5 && a.every((x, i) => Number.isInteger(x) && x >= 0 && x < nOpts(qs[i]));

/* ── 답 → 꼬리표 무게 (보기 하나 = 꼬리표 둘 × 1 · 슬라이더는 양 끝 비율로 나눔) ── */
export function profile(qs, a) {
  const w = Object.fromEntries(TAGS.map(t => [t, 0]));
  qs.forEach((q, i) => {
    if (q.k === 'slider') { const r = a[i] / 4; q.o[0].g.forEach(t => { w[t] += 1 - r; }); q.o[1].g.forEach(t => { w[t] += r; }); }
    else q.o[a[i]].g.forEach(t => { w[t] += 1; });
  });
  return w;
}
/* 그날 질문 세트의 평균 무게를 뺀 값 — 질문에 'calm' 보기가 많은 날 calm 결과만 몰리지 않게 (분포 시험 tools/oneword_check.mjs) */
export function centered(qs, w) {
  const m = Object.fromEntries(TAGS.map(t => [t, 0]));
  qs.forEach(q => { if (q.k === 'slider') q.o.forEach(o => o.g.forEach(t => { m[t] += .5; })); else q.o.forEach(o => o.g.forEach(t => { m[t] += 1 / q.o.length; })); });
  return Object.fromEntries(TAGS.map(t => [t, w[t] - m[t]]));
}
export const topTags = (w, n = 2) => TAGS.slice().sort((x, y) => w[y] - w[x] || TAGS.indexOf(x) - TAGS.indexOf(y)).slice(0, n);
/* 씨앗: 날짜 · 결과 나이대 · 질문 나이대 · 주제 · 답 (같으면 같은 결과 · 서버 캐시 키) */
export const seedOf = (day, age, qa, theme, a) => `${day}|${age}|${qa}|${theme}|${a.join('')}`;
export const RARE_P = 0.01;
export const isRare = seed => fnv(seed + '|rare') % 10000 < RARE_P * 10000;
/* 꼬리표 ↔ 오행 (일진은 약하게 · 운세 연결) */
const TAG_EL = { warm: 'fire', bright: 'fire', spark: 'wood', free: 'wood', firm: 'metal', bold: 'metal', calm: 'water', deep: 'water', tender: 'earth', shy: 'earth' };
/* 점수 = 꼬리표 겹침 + 나이대(2 → .35 · 3 → .7) + 일진 .3 + 씨앗 흔들기(0~2.5) — 흔들기로 같은 꼬리표 묶음 안에서 고르게 퍼짐 (tools/oneword_check.mjs 분포 시험) */
export const JITTER = 2.5;
function score(x, w, age, il, seed) {
  const aw = ageW(x.ages, age);
  return x.t.reduce((s, t) => s + (w[t] || 0), 0) + (aw >= 3 ? .7 : aw === 2 ? .35 : 0) + (x.t.some(t => TAG_EL[t] === il) ? .3 : 0) + (fnv(seed + '#' + x.id) % 1000) / 1000 * JITTER;
}
/* 후보: { theme, rare, list:[결과 4개] } · 자연이면 { theme:'nature', cand:{ flower, color, weather } } */
/* w · seed 를 주면 그걸로 (v1 꽃 카드 기록에서 다른 주제를 받을 때 — v1 답의 꼬리표 무게, 2026-11-03 대표 제보) */
export function candidates({ day, age, qa, theme, a, qs, w: w0, seed: s0 }, n = 4) {
  theme = theme || dayTheme(day);
  if (!w0) qs = qs || dayQuestions(day, qa);
  const w = w0 || centered(qs, profile(qs, a)), il = ilgin(day), seed = s0 || seedOf(day, age, qa, theme, a);
  if (theme === 'nature') return { theme, seed, w, rare: false, cand: V1.natureCand(w, il, seed, n) };
  if (isRare(seed)) { const L = pool(theme, day, age, true); if (L.length) return { theme, seed, w, rare: true, list: [L[fnv(seed + '|rk') % L.length]] }; }
  let L = pool(theme, day, age);
  if (L.length < n) L = pool(theme, day, 'all');
  return { theme, seed, w, rare: false, list: L.map(x => [x, score(x, w, age, il, seed)]).sort((p, q) => q[1] - p[1]).slice(0, n).map(p => p[0]) };
}
export const ruleIndex = (seed, n) => fnv(seed + '|pick') % Math.min(3, n);   /* 서버가 안 될 때: 위 3개 중 하나 */
/* 규칙으로 고르기 → 결과 기록 모양 { th, r | f c w, line, rare } */
export function pickRule(C) {
  if (C.theme === 'nature') { const p = V1.pickRule(C.cand, C.seed); return { th: 'nature', f: p.flower.id, c: p.color.id, w: p.weather.id, line: natureLine(C.w, C.seed, p) }; }
  const x = C.list[ruleIndex(C.seed, C.list.length)];
  return { th: C.theme, r: x.id, line: x.l, rare: C.rare };
}
export function natureLine(w, seed, p) {
  const t = topTags(w, 1)[0], arr = V1.LINES[t];
  return arr[fnv(seed + '|line') % arr.length].replace('{f}', p.flower.w).replace('{c}', p.color.w).replace('{w}', p.weather.w);
}

/* ── 카드 문구: 나이대 맥락 · 통계 한 줄 (표본 50 이상이면 실제 비율) ── */
export const STAT_MIN = 50;
export function context(rec) {
  const age = rec.age || 'all', ak = AGE_KO[age];
  if (age === 'all') return rec.rare ? '오늘 같은 질문에 답한 사람 중 1%만 나온 결과' : '오늘 모두가 같은 질문으로 받은 결과';
  if (rec.rare) return `${ak}가 고른 답에서 1%만 나온 결과`;
  const x = rec.r && resultById(rec.r), aw = x ? ageW(x.ages, age) : 2;
  return aw >= 3 ? `요즘 ${ak}가 많이 받는 결과` : aw === 2 ? `${ak} 답에서 자주 나오는 결과` : `${ak} 중엔 드문 결과`;
}
export function statLine(rec) {
  const s = rec.stat, ak = AGE_SHORT[rec.age || 'all'];
  if (rec.rare) return `✦ 희귀 · 확률 1% · 오늘 ${ak === '공통' ? '모두' : ak} 중`;
  if (s && s.n >= STAT_MIN) return `오늘 ${ak === '공통' ? '답한 사람' : ak} 중 ${Math.max(1, Math.round(s.c / s.n * 100))}% · ${s.n.toLocaleString('ko-KR')}명 기준`;
  return '';
}

/* ── 친구 비교: 같은 답 격자 · 오늘의 합(규칙 문장 · AI 없음) · 두 유형 한 줄 ── */
export const sameGrid = (a, b) => a.map((x, i) => x === b[i]);
const HAP = {
  same: [['거울 같은 콤비', '오늘 둘은 같은 쪽을 고르는 사이. 말 안 해도 다음 수가 보인다.'], ['쌍둥이 모드', '답이 이렇게 겹치면 오늘 약속은 고민할 것도 없다.']],
  mix: [['식어도 웃긴 콤비', '한 명은 끝까지 버티고, 한 명은 판을 연다. 같은 단톡방이면 분위기 끝.'], ['반반 치킨 조합', '서로 다른 쪽을 골라 오늘 둘이면 메뉴 고민이 반으로 준다.'], ['밀고 당기는 듀오', '한쪽이 밀면 한쪽이 잡아 준다. 오늘 둘이 하면 일이 된다.']],
  diff: [['정반대 자석', '답은 다 달랐는데 이상하게 붙어 있으면 재밌는 사이.'], ['서로의 플레이리스트', '내가 안 듣던 쪽을 열어 주는 사람. 오늘은 상대 추천을 하나 받아 보기.']],
};
export function hap(sa, sb, ta, tb, seed) {
  const same = sameGrid(sa, sb).filter(Boolean).length, k = same >= 4 ? 'same' : same >= 2 ? 'mix' : 'diff';
  const both = ta.filter(t => tb.includes(t));
  const L = HAP[k], [name, line] = L[fnv(seed + '|hap') % L.length];
  return { name, line: both.length ? `${line} 둘 다 '${TAG_KO[both[0]]}' 쪽.` : line, same };
}
export const TYPES16 = ['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP', 'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'];
export const okType = t => TYPES16.includes(t);
/* 두 유형 조합 한 줄 (양념 · 표시만 작게) */
export function typePair(a, b) {
  if (!okType(a) || !okType(b)) return '';
  if (a === b) return '같은 유형 둘 — 말 안 해도 서로의 다음 행동이 보이는 조합';
  const d = [0, 1, 2, 3].filter(i => a[i] !== b[i]);
  if (d.length === 4) return '정반대 유형 — 서로의 빈칸을 정확히 채우는 조합';
  if (d.length === 1) return ['한 명은 판을 열고 한 명은 판을 지키는 조합', '하나는 지금을, 하나는 다음을 보는 조합', '머리와 마음이 번갈아 운전하는 조합', '계획표와 즉흥 여행이 같이 가는 조합'][d[0]];
  if (d.includes(3) && d.includes(0)) return '약속은 한 명이 잡고 분위기는 한 명이 띄우는 조합';
  if (d.includes(2)) return '하나는 이유를, 하나는 기분을 챙기는 조합';
  return '닮은 듯 다른 결 — 같이 있으면 대화가 길어지는 조합';
}

/* ── 금지어 검사 (쓰기 규칙 v2-trend-pack.md 4장 · 운영실 유행 팩 검수 · tools/oneword_api_test.mjs) ── */
export const BAN = /(MBTI|\b[EI][NS][TF][JP]\b|꼰대|틀딱|급식|아재|라떼는|유튜브|인스타|틱톡|카톡|카카오|넷플릭스|스타벅스|빼빼로|편의점 [A-Z]|GS25|세븐일레븐|이마트|쿠팡|배민|엑셀|아이폰|갤럭시|삼성|LG|BTS|뉴진스|아이브|손흥민|오타니|포켓몬|디즈니|마블|짱구|정치|대통령|교회|절에서|도박|술 강요|원샷)/;
export const banHit = s => { const m = String(s).match(BAN); return m ? m[1] : ''; };
export const itemText = x => [x.n, x.l, x.q, ...(x.o || []).map(o => o.t)].filter(Boolean).join(' ');
/* ── 서버로 보낼 · 받을 것 ── */
export const REQ = { maxBody: 2000 };
/* 결과가 실제 그 날 · 그 사람이 받을 수 있는 것인지 (공유 링크 확인용) */
export const KNOWN = id => !!resultById(id) || /^f\d{3}$/.test(id);
