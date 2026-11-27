// 주간 도전 판 — 규칙 (화면과 분리 · node 로 시험: tools/weekly_bot.mjs)
//   한 주(KST 월 0시 ~ 일 24시, 원어데이 공통 랭킹과 같은 주) 동안 모두가 **같은 판 · 같은 씨앗**으로 시작해
//   정해진 이동 수 안에서 점수를 겨룬다. 원어데이 판 이름 'ocean:weekly' (공통 랭킹 · 주간 마감)
//   · 판 모양 8가지를 주마다 돌려 씀 + 씨앗은 주마다 새로 → 같은 모양도 8주 뒤엔 다른 첫 판
//   · 이어하기(+5수)는 판당 2번까지(광고 · 골드 · 게임 코인 · 보유 +5 모두 합쳐서) · 부스터는 종류마다 판당 상한
//   · 연승 보너스 · 응원 선물 · 튜토리얼은 이 판에 없음(모두 같은 출발선)
import { WORLD_COUNT } from '../config.js?v=0.99.79';

export const BOARD = 'ocean:weekly';
export const MOVES = 25;
export const CONT_MAX = 2;                                  /* 판당 +5수 (어느 길이든 합쳐서) */
export const BOOST_MAX = { hammer: 3, swap: 3, shuffle: 2 };  /* 판당 부스터 상한 */
export const UNLOCK = 11;                                   /* 10레벨(첫 월드 보스)을 깨면 열림 — 특수 블록 · 장애물을 다 배운 뒤 */
export const HOPE_GAP = 0.15;                               /* 다음 구간까지 15% 이내일 때만 이어하기 권유 (사업 bm.md 2-3 ①) */
export const EARLY_PLAYS = 3;                               /* 처음 3판은 권유 없음 */

// KST ISO 주 '2026-W48' (서버 gold.js weekOf 와 같은 셈법)
export function weekOf(ms = Date.now()) {
  const d = new Date(ms + 9 * 3600e3); d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day);
  const y = d.getUTCFullYear(), w = Math.ceil(((d - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
// 주 → 그 주 마감(다음 월 0시 KST, ms)
export function weekEnd(p) {
  const [y, w] = p.split('-W').map(Number);
  const jan4 = Date.UTC(y, 0, 4), dow = new Date(jan4).getUTCDay() || 7;
  const mon = jan4 - (dow - 1) * 864e5 + (w - 1) * 7 * 864e5;
  return mon + 7 * 864e5 - 9 * 3600e3;
}
// 주 번호 (판 모양 순서용 · 2026-W01 = 0 기준 연속 번호)
function weekIndex(p) {
  const [y, w] = p.split('-W').map(Number);
  return (y - 2026) * 53 + (w - 1);
}
// 씨앗: 판 이름 + 주 → 32비트 (FNV-1a) · 모두 같은 값
export function seedOf(p) {
  let h = 0x811C9DC5;
  for (const ch of `${BOARD}|${p}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193); }
  return (h >>> 0) || 1;
}

const fill = (w, h, ch = '.') => Array.from({ length: h }, () => ch.repeat(w));
// 판 모양 8가지 (점수 판 — 장애물 · 기름띠 · 얼음은 깨면 점수가 더 붙는 '노릴 자리')
//   theme = 배경 · 음악 테마(1~10) · stars = 별 3개 기준 점수(tools/weekly_bot.mjs 사람 봇 분포 30 · 60 · 90% 자리)
export const BOARDS = [
  { key: 'plaza', theme: 1, stars: [40000, 54000, 72500], layout: fill(9, 9),
    jelly: ['000000000', '000000000', '000000000', '000111000', '000111000', '000111000', '000000000', '000000000', '000000000'] },
  { key: 'maze', theme: 2, stars: [18000, 23500, 34000],
    layout: ['.........', '.#.....#.', '.........', '...#.#...', '.........', '...#.#...', '.........', '.#.....#.', '.........'],
    pieces: ['.........', '.........', '..b...b..', '.........', '....B....', '.........', '..b...b..', '.........', '.........'] },
  { key: 'valley', theme: 3, stars: [33500, 45000, 59500],
    layout: ['##.....##', '#.......#', '.........', '.........', '.........', '.........', '.........', '#.......#', '##.....##'],
    pieces: ['.........', '.........', '.........', '.........', '1.1.1.1.1', '.........', '.........', '.........', '.........'] },
  { key: 'wreck', theme: 5, stars: [28500, 39000, 56000], layout: fill(9, 8),
    cover: ['.........', '.........', '.........', 'i.i.i.i.i', '.........', '.i.i.i.i.', '.........', '.........'] },
  { key: 'whale', theme: 4, stars: [29500, 40000, 52500],
    layout: ['###...###', '#.......#', '.........', '.........', '.........', '.........', '.........', '#.......#', '###...###'],
    jelly: ['000000000', '000000000', '001111100', '010000010', '010000010', '010000010', '001111100', '000000000', '000000000'] },
  { key: 'lighthouse', theme: 6, stars: [22000, 31000, 46000],
    layout: ['.........', '.........', '.........', '....#....', '...###...', '....#....', '.........', '.........', '.........'],
    cover: ['.........', '.k.....k.', '.........', '.........', '.........', '.........', '.........', '.k.....k.', '.........'] },
  { key: 'whirl', theme: 7, stars: [35500, 47000, 72000],
    layout: ['#.......#', '.........', '.........', '.........', '.........', '.........', '.........', '.........', '#.......#'],
    cover: ['.........', '..q...q..', '.........', '....q....', '...q.q...', '....q....', '.........', '..q...q..', '.........'] },
  { key: 'cave', theme: 10, stars: [35500, 48500, 63000], layout: fill(9, 9),
    pieces: ['.........', '.........', '.........', '.........', '.........', '.........', '.2.....2.', '.........', '.........'],
    cover: ['.........', '.........', '..IIIII..', '.........', '.........', '.........', '.........', '.........', '.........'] },
];
export const boardOf = p => BOARDS[((weekIndex(p) % BOARDS.length) + BOARDS.length) % BOARDS.length];

// 그 주의 판 (엔진에 바로 넣는 레벨 꼴)
export function weeklyLevel(p) {
  const b = boardOf(p);
  return { id: 0, weekly: true, attack: true, key: b.key, period: p, moves: MOVES, colors: 5, goals: [],
    layout: b.layout, pieces: b.pieces, jelly: b.jelly, cover: b.cover, stars: b.stars,
    world: Math.min(WORLD_COUNT, b.theme), dropSpawn: { chance: 0, maxOnBoard: 0 } };
}

// 판 끝 이어하기 권유: '다음 구간까지 15% 이내' 또는 '이번 주 내 최고까지 15% 이내'일 때만 (희망일 때 권함)
//   st: { score, plays, used, cut: { score, tier } | null (지난 제출 때 서버가 알려 준 다음 구간 경계), best: 이번 주 내 최고 }
//   → { why: 'tier' | 'best', gap, tier } | null
export function hopeOf(st) {
  if (st.used >= CONT_MAX || st.plays < EARLY_PLAYS || !(st.score > 0)) return null;
  const c = st.cut;
  if (c && c.score > st.score && (c.score - st.score) <= c.score * HOPE_GAP) return { why: 'tier', gap: c.score - st.score, tier: c.tier };
  if (st.best > st.score && (st.best - st.score) <= st.best * HOPE_GAP) return { why: 'best', gap: st.best - st.score + 1, tier: null };
  return null;
}
// 판 끝 코인 (레벨 클리어와 비슷한 크기: 20 + 별마다 10)
export const coinsFor = (score, stars) => 20 + stars.filter(t => score >= t).length * 10;
