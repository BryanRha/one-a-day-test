// 판 밖 이야기: 덱 등록 · 오늘의 패(화투점) · 칭찬 · 판 끝 독설 한 줄 · 도감 기록 · 응원 부적 조건
import { DECK as HWATU } from './deck/hwatu.js?v=0.87.1';
import { makeRules } from './core/rules.js?v=0.87.1';
import { hash, kstDay, Rng } from './core/rng.js?v=0.87.1';
import { DAILY_POOL } from './core/charms.js?v=0.87.1';
import { load, save } from './save.js?v=0.87.1';

// 덱 등록: 다른 꽃패(원어데이 고유 덱 등)를 만들면 여기에 한 줄 추가 — 엔진 코드는 그대로
export const DECKS_DEF = { hwatu: HWATU };
export const DECK = DECKS_DEF.hwatu;
export const rules = makeRules(DECK);

// 하루 시드: 원어데이 운세와 같은 날(한국 시간) · 앱이 hello().fortune.seed 를 주면 그걸 섞음 (운세 ↔ 오늘의 패)
export const today = () => kstDay();
export function dailySeed(extra = '') { return hash(`pae|${today()}|${extra}`); }
export function todayCharm(seed) { return new Rng(seed ^ 0x5bd1e995).pick(DAILY_POOL).id; }

// 오늘의 패 (화투점): 아침에 패를 떼어 하루 운을 보던 놀이 — 말투는 원어데이 독설 운세 · 돈 · 횡재 · 내기 이야기는 하지 않음
const MONTH_READ = {
  1: ['소식', '기다리던 연락이 와요. 답장은 세 번 고쳐 쓰게 될 거예요'],
  2: ['그리운 사람', '보고 싶은 사람이 떠올라요. 먼저 연락하면 지는 게임은 아니에요'],
  3: ['나들이', '바깥바람이 약이에요. 단, 우산은 챙겨요'],
  4: ['손님', '뜻밖의 사람이 문을 두드려요. 반가운 척 연습해 둬요'],
  5: ['잔치', '먹을 복이 있어요. 오늘 다이어트는 내일의 당신에게 맡겨요'],
  6: ['기쁨', '작은 일에 크게 웃는 날. 웃음 참다가 들켜도 괜찮아요'],
  7: ['행운', '운이 따르는 날이에요. 그 운, 쓸데없는 데 쓰지 마요'],
  8: ['달밤 구경', '오늘은 구경꾼이 이득이에요. 끼어들지 말고 팝콘만'],
  9: ['향기로운 자리', '좋은 자리에 초대받아요. 말은 반만, 듣기는 두 배로'],
  10: ['근심', '괜한 걱정이 커져요. 걱정의 80%는 안 일어나요, 나머지는 해결돼요'],
  11: ['풍요', '마음이 넉넉해지는 날. 넉넉한 김에 남 칭찬 한마디'],
  12: ['비 오는 날의 손님', '예상 밖의 변수가 와요. 계획은 연필로 써요'],
};
const KIND_READ = { gwang: '빛이 강한 패 — 오늘 주인공은 당신', yeol: '움직이는 패 — 먼저 움직이면 길이 열려요', tti: '이어주는 패 — 사람 사이 매듭을 풀 날', pi: '소박한 패 — 작은 것을 챙기면 크게 남아요' };
export function fortuneCard(extra = '') {
  const c = DECK.cards[hash(`pae-fortune|${today()}|${extra}`) % DECK.cards.length];
  const [title, line] = MONTH_READ[c.month] || ['', ''];
  return { card: c, title, line, kind: KIND_READ[c.kind] };
}

// 칭찬 (유능감): 이번 손이 남은 목표의 몇 % 를 채웠나
export function praise(ratio, cleared) {
  if (cleared && ratio >= 2) return ['달을 통째로 삼켰어요!', '압도적이에요!', '꽃이 만개했어요!'];
  if (cleared) return ['통과!', '깔끔해요!', '멋진 마무리!'];
  if (ratio >= 0.6) return ['좋은 패!', '훌륭해요!', '손맛 좋네요!'];
  if (ratio >= 0.3) return ['좋아요!', '차곡차곡!', '잘 쌓고 있어요'];
  return ['한 걸음!', '다음 손이 기대돼요', '차분하게'];
}
export const pickLine = (arr, seed = Math.random()) => arr[Math.floor(seed * arr.length) % arr.length];

// 판 끝 독설 운세 한 줄 (사행 · 재물 연결 없음)
const ENDLINE = {
  won: ['열두 달을 다 넘긴 사람은 오늘 무슨 일이든 넘겨요. 단, 설거지는 예외', '오늘의 당신, 달도 질투해요. 겸손은 내일부터', '이 정도면 패가 당신을 고른 거예요'],
  far: ['거의 다 왔어요. 인생도 보통 마지막 달이 제일 길어요', '아까운 건 실력이 있다는 증거예요. 내일은 안 아깝게', '계절신이 당신 이름을 외웠어요. 다음엔 인사만 하고 지나가요'],
  mid: ['중간까지 온 사람은 끝까지 갈 사람이에요. 오늘은 여기까지만', '봄은 넘겼으니 됐어요. 여름은 원래 덥잖아요', '바람을 더 써 봐요. 버린 패가 돌아와 효도해요'],
  early: ['첫 달은 원래 몸풀기예요. 진짜는 지금부터', '패가 안 붙은 날도 있죠. 사람도 안 붙는 날이 있듯이', '오늘의 교훈: 같은 달 두 장이면 일단 낸다'],
};
export function endLine(run) { const k = run.phase === 'won' ? 'won' : run.cleared >= 9 ? 'far' : run.cleared >= 3 ? 'mid' : 'early'; return pickLine(ENDLINE[k], (hash(today() + run.total) % 997) / 997); }

// 다음 판에 써 볼 조합 한 줄 힌트 (판 끝)
const TIPS = ['붉은 띠 세 장(1 · 2 · 3월)이면 홍단 — 배수 5', '다음 달 꽃을 바람에 실으면, 다음 달 첫 손에 제철로 돌아와요', '광 세 장이면 삼광 — 비광(12월)은 빼야 더 세요', '새 그림 세 장(2 · 4 · 8월)이면 세 새', '같은 계절 다섯 장이면 한 계절 — 봄은 1~3월', '장터의 금박 붓: 자주 내는 광에 바르면 배수가 쑥', '부적 칸이 차면 약한 부적을 팔고 귀한 걸 사요'];
export const tipLine = n => TIPS[n % TIPS.length];

// 도감 기록 → 새로 채운 항목 수
export function recordBook(run) {
  const b = load().book; let n = 0;
  const add = (arr, xs) => { for (const x of xs) if (!arr.includes(x)) { arr.push(x); n++; } };
  add(b.yaku, run.found); add(b.gods, run.beaten); add(b.charms, run.charms.map(c => c.id).filter(id => id !== 'cheer')); add(b.cards, run.seen);
  save();
  return n;
}

// 응원 부적 (docs/bm-policy.md 6장): 같은 계절신에게 3번 연속 막힘(4관문 이상 간 판만) → 다음 판 시작 때 선물 · 하루 2번
export const HELP_DAILY = 2;
export function noteRunEnd(run) {
  const h = load().help;
  /* 일부러 지기 방지: 계절신 관문까지 간 판(두 관문 이상 넘김)만 셈 — 사업 밑그림의 '4관문'은 봄 계절신(3월)이 빠져 초보가 못 받아 3으로 (보고서에 적음) */
  if (run.phase === 'fail' && run.isBoss && run.gate >= 3) {
    const g = run.bosses[run.seasonI];
    if (h.fails.god === g) h.fails.n++; else h.fails = { god: g, n: 1 };
  } else if (run.phase === 'won' || run.beaten.includes(h.fails.god)) h.fails = {};
  save();
}
export function helpDue() {
  const h = load().help;
  if (h.date !== today()) { h.date = today(); h.given = 0; }
  return h.fails.n >= 3 && h.given < HELP_DAILY;
}
export function helpGiven() { const h = load().help; h.given++; h.fails = {}; save(); }

// 족보 표 순서: '장수 계단'(같은 달) 먼저 → 그림 족보(띠 · 새 · 광) → 다섯 장 족보 — 덱 데이터의 갈래(fam)와 점수로만 정함
const FAM_ORDER = ['high', 'month', 'dan', 'bird', 'gwang', 'kind5', 'season', 'run'];
export function yakuOrder(deck = DECK) { return deck.yaku.slice().sort((a, b) => (FAM_ORDER.indexOf(a.fam) - FAM_ORDER.indexOf(b.fam)) || (a.chips - b.chips) || (a.mult - b.mult)); }
// 족보 예시 패 (표에 작게 보여 줄 것) — 덱 데이터의 일반 규칙만 읽음
export function yakuExample(y, deck = DECK) {
  const r = y.rule, cs = deck.cards, ms = deck.months.map(m => m.n);
  const ofMonth = m => cs.filter(c => c.month === m);
  if (r.high) return [cs.find(c => c.kind === 'gwang')];
  if (r.month) return r.month.flatMap((n, i) => ofMonth(ms[i * 2]).slice(0, n));
  if (r.kind || r.ribbon || r.tag) {
    let f = cs.filter(c => (!r.kind || c.kind === r.kind) && (!r.ribbon || c.ribbon === r.ribbon) && (!r.tag || c.tags.includes(r.tag)));
    if (r.without) f = f.filter(c => !c.tags.includes(r.without));
    else if (r.kind === 'gwang' && y.id !== 'ogwang' && y.id !== 'sagwang') { const w = cs.find(c => c.kind === 'gwang' && c.tags.length); if (w) f = [...f.filter(c => c !== w).slice(0, r.count - 1), w]; }
    return f.slice(0, r.count);
  }
  if (r.season) { const s = deck.seasons[0].months; return s.flatMap(m => ofMonth(m)).filter((c, i, a) => a.findIndex(x => x.month === c.month && x.kind === c.kind) === i).slice(0, r.season); }
  if (r.run) return ms.slice(2, 2 + r.run).map(m => ofMonth(m)[0]);
  return [];
}
