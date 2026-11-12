// 캐스트 채널 · 카드 강화 (v0.6 · 의도서 team/dev/tasks/261112-rhythm-v06/intent.md · 대표 11-12 「3가지 모두 추천대로」)
//   큰 성장 = 캐스트 구독자 단계 0~3 (500 · 3,000 · 1만 — 이야기 숫자 안) · 작은 성장 = ★1 카드 레벨 1~20 (돌파 · ★2 · ★3 은 v0.8 뽑기와 함께)
//   점수 영향 0: 이 모듈은 판(Play · engine)에 아무것도 넘기지 않음 — 넘어가는 건 수습 횟수(guardsFor) 하나뿐이고 수습은 점수에 영향 0 (engine rawMax)
//   하루 상한: 그날 완주한 판 수(곡 · 캐스트 무관) 첫 CAP 판만 '함께한 방송' 구독자 · 슈퍼챗 3/3 · 카드 경험치 — 첫 달성 · 화 첫 완주 · 앵콜은 한 번뿐이라 상한 밖
//   원어데이 골드 · 하트는 주지 않음 (v0.6 은 팔지 않음) · DOM 없음 → tools/test_logic.mjs · tools/growth_sim.mjs 가 그대로 씀
export const STAGES = [0, 500, 3000, 10000, 18000];   /* 단계 1 · 2 · 3 · 4 문턱 — 4단계 = 얼굴 조각 · 진짜 이름 (v0.7 · growth_sim 60일로 정함) */
export const GUARDS = [1, 1, 2, 2, 2];   /* 단계별 한 판 수습 횟수 (기획 6장 · 돌파 · 돈으로는 늘지 않음) · 각성하면 3 (awkGuards) */
/* 구독자 양 · 하루 상한 — tools/growth_sim.mjs 로 정함 (근거: docs/growth_sim.json) */
export const GAIN = { play: 110, sc3: 20, lv: 20, first: { clear: 50, s: 75, fc: 100 }, ep: 400, encore: 150 };
export const CAP = 4;
export const CARD = { maxLv: 20, total: 3000, play: 100 };   /* ★1: Lv20 까지 경험치 3,000 · 함께한 방송 한 판 100 (기획 6-2) */
const KIND = ['clear', 's', 'fc'];
export const FIRST_KINDS = KIND;

/* 저장 칸 (S.ch) — v0.8 상품이 저장 변경 없이 붙게 카드마다 등급 · 레벨 · 돌파(0) */
export function ensure(st) {
  if (!st.ch || typeof st.ch !== 'object') st.ch = {};
  const c = st.ch; c.casts ||= {}; c.cards ||= {}; c.first ||= {}; c.v ||= 1;
  return c;
}
export const stageOf = subs => STAGES.reduce((k, v, i) => (subs >= v ? i : k), 0);
export const guardsFor = stage => GUARDS[Math.max(0, Math.min(GUARDS.length - 1, stage | 0))];
/* 카드 레벨: Lv L 까지 누적 경험치 = total × (L−1) / (maxLv−1) */
export const expFor = L => Math.round(CARD.total * (L - 1) / (CARD.maxLv - 1));
export function lvOf(exp) { let L = 1; while (L < CARD.maxLv && exp >= expFor(L + 1)) L++; return L; }
export function castRec(st, id) { const c = ensure(st).casts; return (c[id] ||= { subs: 0, seen: 0 }); }
export const stageOfCast = (st, id) => stageOf(((ensure(st).casts[id]) || {}).subs || 0);

/* 첫 달성 · 앵콜 보상이 갈 캐스트: 그 곡 캐스트 · 단 '캐스트 모두'(8화)나 합류하지 않는 캐스트(10화 메디아)의 곡은 그 판 게스트 먼저 (사업 요청 3) */
export function targetOf(day, guest, joinable) { return (day.singer || !joinable(day.cast)) ? (guest || day.cast) : day.cast; }

function addSubs(st, id, n, out, why) {
  if (!id || !n) return;
  const c = castRec(st, id), s0 = stageOf(c.subs); c.subs += n;
  (out.gain[id] = (out.gain[id] || 0) + n); out.why.push([id, why, n]);
  const s1 = stageOf(c.subs); if (s1 > s0) out.stageUps.push({ cast: id, stage: s1 });
}
function addExp(st, card, n, out) {
  if (!card || card.lv >= CARD.maxLv) return;
  const l0 = card.lv; card.exp = Math.min(CARD.total, card.exp + n); card.lv = lvOf(card.exp);
  if (card.lv > l0) { out.levelUps.push({ card: card.id, cast: card.cast, lv: card.lv, from: l0 }); addSubs(st, card.cast, GAIN.lv * (card.lv - l0), out, 'lv'); }
}
/* 카드 받기: 그 화를 처음 끝까지 송출한 순간(오늘의 조각 = ★1 일상 스냅) */
export function grantCard(st, def) { const cs = ensure(st).cards; if (!def || cs[def.id]) return null; return (cs[def.id] = { id: def.id, cast: def.cast, star: 1, lv: 1, exp: 0, lb: 0 }); }
export const cardsOf = (st, id) => Object.values(ensure(st).cards).filter(c => c.cast === id);

/* 판 끝 정산 — ctx: { day, guest, r(결과), credited(상한 안), epFirst(그 화 첫 완주), encore(그날 첫 앵콜 완주), joinable(id), cardDefs, songId, diff }
   돌려줌: { gain: {캐스트: 합}, why: [[캐스트, 까닭, 양]], firsts: [{ kind, cast, n }], stageUps, levelUps, newCard } */
export function settle(st, ctx) {
  ensure(st);
  const out = { gain: {}, why: [], firsts: [], stageUps: [], levelUps: [], newCard: null };
  const { day, guest, r } = ctx, ids = [...new Set([day.cast, guest].filter(Boolean))];
  /* 화 첫 완주: ★1 카드 + 그 화 캐스트 구독자 */
  if (ctx.epFirst) { out.newCard = grantCard(st, ctx.cardDefs.find(c => c.day === day.no)); addSubs(st, day.cast, GAIN.ep, out, 'ep'); }
  /* 함께한 방송 (상한 안) */
  if (ctx.credited) {
    for (const id of ids) {
      addSubs(st, id, GAIN.play, out, 'play');
      if (r.sc && r.sc[1] && r.sc[0] === r.sc[1]) addSubs(st, id, GAIN.sc3, out, 'sc3');
      for (const cd of cardsOf(st, id)) addExp(st, cd, CARD.play, out);
    }
  }
  /* 곡 × 난이도 첫 달성 (한 번씩 · 상한 밖) */
  const key = `${ctx.songId}:${ctx.diff}`, got = (st.ch.first[key] ||= []), to = targetOf(day, guest, ctx.joinable);
  const has = { clear: true, s: r.rank === 'S' || r.rank === 'SS', fc: !!r.fc };
  for (const k of KIND) if (has[k] && !got.includes(k)) { got.push(k); out.firsts.push({ kind: k, cast: to, n: GAIN.first[k] }); addSubs(st, to, GAIN.first[k], out, 'first'); }
  /* 앵콜 방송 (시즌 마지막 화 다음 날부터 · 그날 첫 완주 1회) */
  if (ctx.encore) addSubs(st, to, GAIN.encore, out, 'encore');
  return out;
}

/* 소급 (v0.5.1 부터 쌓인 기록 · 처음 v0.6 을 열 때 한 번)
   S.cast[id].plays → 함께한 방송 · 카드 경험치 (단 상한 × 지난 날 수까지) · sc → ⌊sc ÷ 3⌋ 번을 3/3 로 근사 · guards → 쓰지 않음(채널 시트 표시만)
   S.best → 첫 달성 정확히 · S.book → 화 첫 완주(카드 · 구독자) */
export function retro(st, { days, cardDefs, songs, joinable, daysSince }) {
  const c = ensure(st); if (c.retro) return null;
  const out = { gain: {}, why: [], firsts: [], stageUps: [], levelUps: [], newCard: null };
  for (const d of days) if (st.book && st.book[d.no]) { grantCard(st, cardDefs.find(x => x.day === d.no)); addSubs(st, d.cast, GAIN.ep, out, 'ep'); }
  const bound = CAP * Math.max(1, daysSince);
  for (const [id, rec] of Object.entries(st.cast || {})) {
    const n = Math.min(rec.plays | 0, bound), sc3 = Math.min(Math.floor((rec.sc | 0) / 3), n);
    addSubs(st, id, GAIN.play * n, out, 'play'); addSubs(st, id, GAIN.sc3 * sc3, out, 'sc3');
    for (const cd of cardsOf(st, id)) addExp(st, cd, CARD.play * n, out);
  }
  for (const d of days) {
    const b = (st.best || {})[d.song]; if (!b) continue;
    for (const diff of Object.keys(b)) { const r = b[diff]; if (!r) continue; const key = `${d.song}:${diff}`, got = (c.first[key] ||= []), to = targetOf(d, null, joinable);
      const has = { clear: true, s: r.rank === 'S' || r.rank === 'SS', fc: !!r.fc };
      for (const k of KIND) if (has[k] && !got.includes(k)) { got.push(k); addSubs(st, to, GAIN.first[k], out, 'first'); } }
  }
  void songs; c.retro = true; return out;
}

/* 앵콜 방송: 시즌 마지막 화 다음 날부터 열린 화를 1화부터 차례로 돌려 오늘 자리에 (raw = 달력상 몇 번째 날) */
export const encoreNo = (raw, len) => (raw > len ? ((raw - len - 1) % len) + 1 : 0);

/* ---------- v0.7 「진짜 그 사람」 ----------
   4단계(얼굴 · 진짜 이름)는 그 캐스트 얼굴 그림이 들어왔을 때만 있음(face.ready) — 없으면 3단계가 끝(「완료」) · 사업 요청 2
   표시 단계 = 실제 단계를 그림 여부로 자름 (저장된 구독자는 그대로 쌓임 → 그림이 오는 날 바로 4단계) */
export const shownStage = (st, id, face) => Math.min(stageOfCast(st, id), face && face.ready ? 4 : 3);
/* 3 → 4단계 사이 DM 한 줄을 띄우는 지점 (절반) */
export const MID34 = (STAGES[3] + STAGES[4]) / 2;
/* 각성: 그 캐스트 각성 화가 시즌에 들어와 있고(곡이 옴) · 그 화를 끝까지 송출했고 · 구독자 3단계 이상 (대표 11-12 가)
   awk = { 캐스트: { ep } } · days = 들어 있는 화 · 돌려줌: 새로 각성한 캐스트 목록 (저장 casts[id].awk = { at: 달력 날, ep }) */
export function awkCheck(st, { awk, days, dayNo = 0 }) {
  ensure(st); const out = [];
  for (const [id, a] of Object.entries(awk || {})) {
    const rec = st.ch.casts[id]; if (!rec || rec.awk) continue;
    if (!days.some(d => d.no === a.ep) || !(st.book || {})[a.ep] || stageOf(rec.subs) < 3) continue;
    rec.awk = { at: dayNo, ep: a.ep }; out.push(id);
  }
  return out;
}
export const isAwake = (st, id) => !!(((ensure(st).casts[id]) || {}).awk);
/* 수습 횟수: 각성하면 3 (기획 6장 · 점수 영향 0) */
export const guardsOf = (st, id) => (isAwake(st, id) ? 3 : guardsFor(stageOfCast(st, id)));
