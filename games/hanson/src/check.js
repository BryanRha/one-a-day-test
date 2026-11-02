// 진실표 ↔ 단서 ↔ 대사 일관성 검사기 — 게임 · 도구(tools/check.mjs) · 서버 생성 검증(server/hanson.js)이 같은 함수를 씀
//   손님 한 명(guest) 형식 (값 단위 만 원)
//   { id, cast, item, itemName, diff, intro: [1~2줄], ask(부른 값), ref(장부 시세), fair(이 물건의 제값), pay?(제값 쳐 주기 값),
//     truth: { auth: genuine|repaired|fake|reissue, owner: own|family_ok|family_noperm|found|lost, lie: none|small|big, why: face|cover|scam|mistake|unknown|none, story },
//     clues: [{ spot, kind: auth|cond|origin|fact|plus|trap, title, note, cut?, add?, ok? }] (주인공 · 예비 5~6개 · 골목 손님 3~4개 — 2026-11-02 하루 영업 구조),
//     talk: [{ q, a, face: 0|1|2, contra?: spot, why?, press?: { q, a, face } }] (주인공 · 예비 3개 + 모순 질문엔 되묻기 press · 골목 손님 0~1개),
//     choices: { buy|haggle|back|report: { sub, line, face, rep: [단골, 골목, 파출소], after, label? } },
//     best: [...], good: [...], diary, next?, tease?, later?: { 선택: 한 줄 }, finale?, ending?: { dan, gol, pa } }
export const CHOICES = ['buy', 'haggle', 'back', 'report'];
export const KINDS = ['auth', 'cond', 'origin', 'fact', 'plus', 'trap'];
export const AUTH = ['genuine', 'repaired', 'fake', 'reissue'];
export const OWNER = ['own', 'family_ok', 'family_noperm', 'found', 'lost'];
export const LIE = ['none', 'small', 'big'];
/* 거짓말의 종류 (2026-11-02 대표 "이야기 다양하게"): 체면 · 남을 감싸는 거짓말 · 속이기 / 거짓말 아님: 착각 · 정말 모름 · 없음 */
export const WHY = { face: '체면 때문에 한 거짓말', cover: '누군가를 감싸는 거짓말', scam: '속이려던 거짓말', mistake: '거짓말이 아니라 착각', unknown: '정말 몰랐던 손님', none: '' };
/* 금지: 무기 · 약물 · 폭력 · 옛 가게 이름 (게임 안 문구는 '오랜상회 Olden & Co.') */
export const BANNED = /(총기|권총|칼부림|마약|필로폰|대마|살해|살인|폭행|흉기|자살|오래상회)/;
const LIM = { intro: 60, line: 60, a: 80, q: 30, after: 120, story: 160, title: 22, note: 40, sub: 22, diary: 34, next: 34, later: 90, ending: 160 };

/* 진실과 맞는 선택: 진실표에서 '맞을 수 있는' 선택을 정함 → best 는 이 안에 있어야 함 */
export function allowedBest(t) {
  if (t.owner === 'lost' || t.owner === 'found') return ['report', 'back'];
  if (t.owner === 'family_noperm') return ['back', 'report'];
  if (t.auth === 'fake' || t.auth === 'reissue') return ['back', 'haggle'];
  return ['buy', 'haggle', 'back'];
}

export function checkGuest(g, items, cast, { kind = 'main' } = {}) {
  const E = [], e = m => E.push(`${g && g.id}: ${m}`);
  if (!g || typeof g !== 'object') return ['손님 없음'];
  const it = items[g.item];
  if (!it) e(`물건 ${g.item} 없음`);
  if (!cast[g.cast]) e(`얼굴 ${g.cast} 없음`);
  const t = g.truth || {};
  if (!AUTH.includes(t.auth)) e(`truth.auth ${t.auth}`);
  if (!OWNER.includes(t.owner)) e(`truth.owner ${t.owner}`);
  if (!LIE.includes(t.lie)) e(`truth.lie ${t.lie}`);
  if (kind === 'main' && !(t.why in WHY)) e(`truth.why ${t.why} (face|cover|scam|mistake|unknown|none)`);
  if (t.why && t.lie !== 'none' && !['face', 'cover', 'scam'].includes(t.why)) e(`거짓말(${t.lie})인데 종류가 ${t.why}`);
  if (t.why && t.lie === 'none' && ['face', 'cover', 'scam'].includes(t.why)) e(`거짓말이 없는데 종류가 ${t.why}`);
  for (const k of ['ask', 'ref', 'fair']) if (!(Number.isFinite(g[k]) && g[k] > 0 && g[k] < 10000)) e(`${k} 값 ${g[k]}`);
  const clues = g.clues || [], spots = new Set();
  const want = kind === 'extra' ? [3, 4] : [5, 6];
  if (clues.length < want[0] || clues.length > want[1]) e(`단서 수 ${clues.length} (${want.join('~')})`);
  for (const c of clues) {
    if (!KINDS.includes(c.kind)) e(`단서 종류 ${c.kind}`);
    if (it && !it.spots[c.spot]) e(`단서 자리 ${c.spot} 가 ${g.item} 그림에 없음`);
    if (spots.has(c.spot)) e(`단서 자리 ${c.spot} 겹침`); spots.add(c.spot);
    if (!c.title || !c.note) e(`단서 ${c.spot} 글 없음`);
    if ((c.kind === 'auth' || c.kind === 'cond') && !(c.cut > 0)) e(`단서 ${c.spot} 깎을 근거(cut) 없음`);
    if (c.kind === 'plus' && !(c.add > 0)) e(`단서 ${c.spot} 더할 값(add) 없음`);
    if (c.kind === 'trap' && !c.ok) e(`함정 ${c.spot} 장부 설명(ok) 없음`);
  }
  const has = k => clues.some(c => c.kind === k);
  /* 진위: 진품이면 진위 단서 X · 아니면 1개 이상 */
  if (t.auth === 'genuine' && has('auth')) e('진품인데 진위 문제 단서가 있음');
  if (t.auth !== 'genuine' && !has('auth')) e(`${t.auth} 인데 진위 단서가 없음`);
  /* 출처: 본인 · 허락받은 가족 것이면 출처 단서 X · 아니면 1개 이상 */
  const okOwner = t.owner === 'own' || t.owner === 'family_ok';
  if (okOwner && has('origin')) e('본인 물건인데 출처 문제 단서가 있음');
  if (!okOwner && !has('origin')) e(`${t.owner} 인데 출처 단서가 없음`);
  if (clues.filter(c => c.kind !== 'trap').length < 2) e('진짜 단서가 2개보다 적음');
  /* 값: 제값 = 시세 ± 단서 (어림 · 너무 동떨어지면 오류) */
  const cuts = clues.reduce((a, c) => a + (c.cut || 0), 0), adds = clues.reduce((a, c) => a + (c.add || 0), 0);
  if (g.fair > g.ref + adds + 2 && !has('plus')) e(`제값 ${g.fair} 이 시세 ${g.ref} 보다 높은데 값 올릴 단서가 없음`);
  if (g.fair < g.ref * 0.4 && cuts === 0 && t.auth === 'genuine') e(`제값 ${g.fair} 이 시세보다 많이 낮은데 깎을 단서가 없음`);
  if (g.pay != null && !(g.pay >= g.ask && g.pay <= g.fair * 1.1 + 1)) e(`pay ${g.pay} 는 부른 값 ~ 제값 사이여야 함`);
  const txt = []; const L0 = (s0, k) => { if (typeof s0 !== 'string') return; txt.push(s0); if (s0.length > LIM[k]) e(`${k} 글이 김(${s0.length}>${LIM[k]}): ${s0.slice(0, 20)}…`); };
  /* 대사: 모순은 진짜 단서를 가리켜야 하고, 거짓말이 있으면 모순이 하나 이상 · 없으면 0 */
  const talk = g.talk || [];
  const tw = kind === 'extra' ? [0, 1] : [3, 3];
  if (talk.length < tw[0] || talk.length > tw[1]) e(`질문 수 ${talk.length} (${tw.join('~')})`);
  const contras = talk.filter(x => x.contra);
  for (const x of contras) {
    const c = clues.find(c => c.spot === x.contra);
    if (!c) e(`모순 ${x.contra} 단서 없음`); else if (c.kind === 'trap') e(`모순 ${x.contra} 가 함정 단서를 가리킴`);
    if (!x.why) e(`모순 ${x.contra} 설명(why) 없음`);
    if (kind !== 'extra') { if (!x.press || !x.press.q || !x.press.a || ![0, 1, 2].includes(x.press.face)) e(`모순 ${x.contra} 되묻기(press) 없음`); else { L0(x.press.q, 'q'); L0(x.press.a, 'a'); } }
  }
  if (t.lie === 'none' && t.why !== 'mistake' && contras.length) e('거짓말이 없는데 모순 대사가 있음 (착각이면 why: mistake)');
  if (t.lie !== 'none' && kind !== 'extra' && !contras.length) e(`거짓말(${t.lie})인데 모순 대사가 없음`);
  for (const x of talk) { if (!x.q || !x.a) e('질문 · 대답 빈칸'); if (![0, 1, 2].includes(x.face)) e(`표정 ${x.face}`); }
  /* 선택 4개 · 평판 한 번에 ±2 · 정답 */
  const ch = g.choices || {};
  for (const k of CHOICES) {
    const c = ch[k]; if (!c) { e(`선택 ${k} 없음`); continue; }
    if (!c.sub || !c.line || !c.after) e(`선택 ${k} 글 빈칸`);
    if (![0, 1, 2].includes(c.face)) e(`선택 ${k} 표정 ${c.face}`);
    if (!Array.isArray(c.rep) || c.rep.length !== 3 || c.rep.some(v => !Number.isInteger(v) || Math.abs(v) > 2)) e(`선택 ${k} 평판 ${JSON.stringify(c.rep)} (±2 이하 정수 3개)`);
  }
  const best = g.best || [], good = g.good || [];
  if (!best.length) e('best 없음');
  for (const b of [...best, ...good]) if (!CHOICES.includes(b)) e(`선택 이름 ${b}`);
  if (best.some(b => good.includes(b))) e('best 와 good 이 겹침');
  const allow = allowedBest(t);
  for (const b of best) if (!allow.includes(b)) e(`best ${b} 가 진실(${t.auth}/${t.owner})과 안 맞음 — 가능: ${allow.join('·')}`);
  if (best.includes('buy') && (g.pay || g.ask) > g.fair * 1.25 + 1) e(`best 가 '사 줌'인데 값 ${g.pay || g.ask} 이 제값 ${g.fair} 보다 너무 비쌈`);
  if (best.includes('haggle') && g.ask <= g.fair) e("best 가 '깎음'인데 부른 값이 제값 이하");
  if (best.includes('haggle') && g.ask - cuts > g.fair * 1.15 + 1) e(`best 가 '깎음'인데 단서를 다 짚어도 ${g.ask - cuts} 까지만 깎임 (제값 ${g.fair})`);
  if (g.ask < g.fair * 0.8 && best.includes('buy') && g.pay == null) e('부른 값이 제값보다 많이 싼데 제값(pay) 없이 사 줌이 정답');
  /* 글 길이 · 금지어 */
  const L = (s, k) => { if (typeof s !== 'string') return; txt.push(s); if (s.length > LIM[k]) e(`${k} 글이 김(${s.length}>${LIM[k]}): ${s.slice(0, 20)}…`); };
  (g.intro || []).forEach(s => L(s, 'intro')); if (!(g.intro || []).length) e('첫 마디 없음');
  L(t.story, 'story'); if (!t.story) e('진실 이야기 없음');
  clues.forEach(c => { L(c.title, 'title'); L(c.note, 'note'); L(c.ok, 'note'); });
  talk.forEach(x => { L(x.q, 'q'); L(x.a, 'a'); L(x.why, 'note'); });
  for (const k of CHOICES) if (ch[k]) { L(ch[k].sub, 'sub'); L(ch[k].line, 'line'); L(ch[k].after, 'after'); }
  L(g.diary, 'diary'); L(g.next, 'next'); L(g.tease, 'next');
  if (g.later) for (const k of CHOICES) L(g.later[k], 'later');
  if (g.ending) for (const k of ['dan', 'gol', 'pa']) { if (!g.ending[k]) e(`결말 ${k} 없음`); L(g.ending[k], 'ending'); }
  if (kind === 'main' && !g.diary) e('장부 한 줄 없음');
  for (const s of txt) if (BANNED.test(s)) e(`금지어: ${s.match(BANNED)[0]} — ${s.slice(0, 24)}`);
  return E;
}

/* 한 주: 7일 · 요일마다 손님 · 일요일 결말 3갈래 · 다음 날 예고 · 난이도 곡선 */
export function checkWeek(w, items, cast, nextWeek) {
  const E = [], e = m => E.push(`${w && w.id}: ${m}`);
  if (!w || !Array.isArray(w.days) || w.days.length !== 7) return [`${w && w.id}: 7일이 아님`];
  if (!w.title) e('제목 없음');
  for (const k of ['dan', 'gol', 'pa']) if (!w.branch || !w.branch[k]) e(`다음 주 갈래 ${k} 없음`);
  w.days.forEach((g, i) => {
    E.push(...checkGuest(g, items, cast, { kind: 'main' }));
    if (i < 6 && !g.next) e(`${g.id} 내일 예고 없음`);
    if (i < 6 && !g.later) e(`${g.id} 후일담 없음`);
    if (i === 6 && !g.ending) e(`${g.id} 일요일 결말 없음`);
  });
  if (!w.days[0].tease) e('월요일 손님 예고(tease) 없음 — 지난 주 일요일 결과 화면에 씀');
  const ids = new Set(); for (const g of w.days) { if (ids.has(g.id)) e(`id 겹침 ${g.id}`); ids.add(g.id); }
  return E;
}

export function checkAll(D) {
  const E = [];
  const ids = new Set(); const dup = g => { if (ids.has(g.id)) E.push(`id 겹침 ${g.id}`); ids.add(g.id); };
  D.weeks.forEach((w, i) => { E.push(...checkWeek(w, D.items, D.cast, D.weeks[(i + 1) % D.weeks.length])); w.days.forEach(dup); });
  for (const g of D.reserve) { E.push(...checkGuest(g, D.items, D.cast, { kind: 'reserve' })); dup(g); }
  for (const g of D.extras) { E.push(...checkGuest(g, D.items, D.cast, { kind: 'extra' })); dup(g); }
  return E;
}
