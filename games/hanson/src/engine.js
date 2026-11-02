// 판정 엔진 — 화면 없이 돌아가는 순수 함수 (봇 · 서버 검증 · 시험이 같은 것을 씀)
//   날짜 → 그날 손님 · 단서 · 흥정 값 · 결과 등급 · 동전 · 평판 · 주간 정산
export const EPOCH = '2026-11-02';   /* 1주차 월요일 (모든 이용자 같은 날 같은 손님) */
export const AX = ['dan', 'gol', 'pa'];
export const AXN = { dan: '단골', gol: '골목', pa: '파출소' };
export const CHN = { buy: '사 줌', haggle: '깎음', back: '돌려보냄', report: '주인 찾기' };
export const GRADE = { best: '명감정', good: '좋은 감정', warm: '따뜻한 감정' };
export const COIN = { best: 40, good: 30, warm: 25, contra: 5, extra: { best: 15, good: 12, warm: 10 }, week: 200, replay: 20, day: 20 };

const pad = n => String(n).padStart(2, '0');
export const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const addDays = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return keyOf(d); };
export const dayNo = k => Math.round((parse(k) - parse(EPOCH)) / 864e5);
/* 그날 자리: 몇째 주 · 요일(월 0 ~ 일 6) · 저장된 주간 이야기 중 몇 번째(4주 뒤엔 다시 처음부터 = 재방송) */
export function slot(k, nWeeks) {
  const n = dayNo(k), wk = Math.floor(n / 7), wd = ((n % 7) + 7) % 7;
  return { n, wk, wd, wi: ((wk % nWeeks) + nWeeks) % nWeeks, rerun: wk >= nWeeks };
}
export const weekStart = k => addDays(k, -slot(k, 1).wd);
export const WD = ['월', '화', '수', '목', '금', '토', '일'];

/* 그날 본 손님 (서버 주간 묶음이 있으면 그것 · 없으면 저장된 4주 뼈대) */
export function mainGuest(D, k) { const s = slot(k, D.weeks.length); const w = D.weeks[s.wi]; return { g: w.days[s.wd], w, s }; }

export const realClues = g => g.clues.filter(c => c.kind !== 'trap');
export const cutOf = (g, found) => g.clues.filter(c => found.includes(c.spot) && (c.kind === 'auth' || c.kind === 'cond')).reduce((a, c) => a + c.cut, 0);
/* 깎을 수 있는 최저가: 짚은 흠(진위 · 상태)만큼 · 제값 아래로는 못 깎음 · 짚은 게 없으면 1할 정도만 */
export function haggleFloor(g, found) {
  if (g.ask <= g.fair) return Math.max(1, Math.round(g.ask * 0.9));
  const cut = cutOf(g, found);
  if (!cut) return Math.max(g.fair, Math.round(g.ask * 0.9));
  return Math.max(g.fair, g.ask - cut);
}
export const buyPrice = g => g.pay || g.ask;
export const won = v => (v >= 10000 ? `${Math.floor(v / 10000)}억 ${v % 10000 ? (v % 10000) + '만' : ''}`.trim() : `${v}만`) + ' 원';

/* 결과 등급: 진실에 가장 맞는 선택 = 명감정 · 나머지도 칭찬 (틀림 없음) */
export function judge(g, r) {
  const { choice, found = [], asked = [], ledger = false, offer } = r;
  let grade = (g.best || []).includes(choice) ? 'best' : (g.good || []).includes(choice) ? 'good' : 'warm';
  let note = '';
  if (choice === 'haggle' && grade === 'best' && offer > g.fair * 1.15 + 0.5) { grade = 'good'; note = '흠을 하나 더 짚었으면 제값까지 깎을 수 있었어요'; }
  const real = realClues(g), gotReal = real.filter(c => found.includes(c.spot)).length;
  const contra = (g.talk || []).filter(x => x.contra), gotContra = contra.filter(x => asked.includes(g.talk.indexOf(x)) && found.includes(x.contra)).length;
  const traps = g.clues.filter(c => c.kind === 'trap'), trapOk = ledger ? traps.filter(c => found.includes(c.spot)).length : 0;
  const missed = real.filter(c => !found.includes(c.spot));
  const price = choice === 'buy' ? buyPrice(g) : choice === 'haggle' ? offer : 0;
  const fairDeal = price ? Math.abs(price - g.fair) <= Math.max(1, g.fair * 0.15) : false;
  return { grade, note, gotReal, real: real.length, gotContra, contra: contra.length, trapOk, traps: traps.length, missed, price, fairDeal };
}
export function coinsFor(res, extra = false) {
  if (extra) return COIN.extra[res.grade];
  return COIN[res.grade] + res.gotContra * COIN.contra;
}
export function applyRep(rep, d) { const o = { ...rep }; AX.forEach((k, i) => { o[k] = Math.max(-20, Math.min(999, (o[k] || 0) + (d[i] || 0))); }); return o; }
/* 가장 높은 축 (같으면 단골 → 골목 → 파출소 순) */
export function topAxis(rep) { let b = 'dan'; for (const k of AX) if ((rep[k] || 0) > (rep[b] || 0)) b = k; return b; }
/* 주간 칭호: 명감정 수 */
export function weekTitle(nBest, nPlayed) {
  if (nBest >= 6) return '골목의 눈';
  if (nBest >= 4) return '귀 밝은 감정사';
  if (nBest >= 2) return '마음 넓은 감정사';
  if (nPlayed >= 5) return '성실한 감정사';
  return '새내기 감정사';
}
/* 내일 손님 예고 한 줄 (일요일은 다음 주 월요일 손님의 tease) */
export function nextTease(D, k) { const { g, s } = mainGuest(D, k); if (s.wd < 6) return g.next; const n = mainGuest(D, addDays(k, 1)).g; return n.tease || n.next || ''; }

/* ---------- 하루 영업 (2026-11-02 대표 게이트 뒤 총괄 결정) ----------
   무료 손님 4명: 아침 · 낮 · 오후 = 골목 손님(미리 만든 풀) · 저녁 = 오늘의 주인공(모두 같은 손님 · 이야기 · 평판 · 통계)
   영업 연장: 광고 골목 손님 +1(하루 3) · 골드 1명 20 / 3명 50(하루 6) */
export const SLOTS = ['아침', '낮', '오후', '저녁'];
export const FREE_ALLEY = 3;
export const EXT = { ad: 3, gold: 6 };
export const NO_REPEAT_DAYS = 14;   /* 같은 골목 손님은 2주 안에 다시 안 옴 */
const hashStr = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
/* 골목 손님 고르기: 날마다 같은 순서(모두 같은 출발점) + 이 사람이 2주 안에 만난 손님은 건너뜀 */
export function pickAlley(D, k, seen, n, taken = []) {
  const pool = D.extras, N = pool.length; if (!N) return [];
  const start = (dayNo(k) * 7 + (hashStr(k) % 5)) % N, out = [];
  const recent = id => { const d = seen[id]; return d && dayNo(k) - dayNo(d) < NO_REPEAT_DAYS; };
  /* 같은 날엔 같은 얼굴 · 같은 물건이 겹치지 않게 (넘치면 조건을 하나씩 풀어 줌) */
  const byId = id => pool.find(x => x.id === id) || D.reserve.find(x => x.id === id);
  const castOf = id => (byId(id) || {}).cast, itemOf = id => (byId(id) || {}).item;
  const mainG = mainGuest(D, k).g;
  for (let pass = 0; pass < 4 && out.length < n; pass++) for (let i = 0; i < N && out.length < n; i++) {
    const g = pool[(start + i * 37) % N]; if (taken.includes(g.id) || out.includes(g.id)) continue;
    if (pass < 3 && recent(g.id)) continue;
    const day = [...taken, ...out], casts = day.map(castOf).concat(mainG.cast), items = day.map(itemOf).concat(mainG.item);
    if (pass < 2 && casts.includes(g.cast)) continue;
    if (pass < 1 && items.includes(g.item)) continue;
    out.push(g.id);
  }
  return out;
}
/* 감정사 등급 — 많이 할수록 오름 · 도구는 등급으로만 열림(팔지 않음) · 하루 무료 4명이면 약 100 → 7급 5일 · 5급 10일 · 3급 19일 · 1급 33일 · 명인 45일 */
export const LEVELS = [
  { xp: 0, name: '견습 감정사' }, { xp: 100, name: '감정사 9급' }, { xp: 250, name: '감정사 8급' }, { xp: 450, name: '감정사 7급', tool: 'uv' }, { xp: 700, name: '감정사 6급' },
  { xp: 1000, name: '감정사 5급', tool: 'scale' }, { xp: 1400, name: '감정사 4급' }, { xp: 1900, name: '감정사 3급', tool: 'rub' }, { xp: 2500, name: '감정사 2급' }, { xp: 3300, name: '감정사 1급' }, { xp: 4500, name: '오랜골목 명인' },
];
export const TOOLS = { uv: { name: '자외선 등', desc: '숨은 단서 자리가 잠깐 빛나요 (손님마다 한 번)' }, scale: { name: '저울', desc: '흥정판에 이 물건의 제값 어림이 보여요' }, rub: { name: '각인 탁본', desc: '모순이 숨은 질문에 표시가 붙어요' } };
export function levelOf(xp) { let i = 0; while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++; const cur = LEVELS[i], nx = LEVELS[i + 1]; return { i, name: cur.name, xp, from: cur.xp, to: nx ? nx.xp : cur.xp, next: nx ? nx.name : null }; }
export const toolOn = (xp, t) => LEVELS.findIndex(l => l.tool === t) <= levelOf(xp).i;
export function xpFor(res, alley) { const base = alley ? { best: 12, good: 9, warm: 7 } : { best: 30, good: 22, warm: 16 }; return base[res.grade] + res.gotReal * 2 + res.gotContra * 5 + (res.trapOk ? 3 : 0); }
