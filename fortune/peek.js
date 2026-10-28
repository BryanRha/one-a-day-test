// 유료 미리보기 궁금증 설계 (2026-10-28 대표 "들어가서 궁금하면 누르게")
//   - 목차: 몇 장이 잠겼고 무엇이 들어 있는지 — 장 제목 아래 '이 사람 사주로 바꾼 부제'
//   - 절벽: 무료 구간 끝에서 본인 사주의 구체 단서 + 끊김
//   - 잠긴 장: 첫 문장 앞부분(실제 계산 사실)만 보이고 나머지는 흐림 · 핵심 값(달 · 날짜 · 판정)은 ██
//   만드는 재료는 이미 화면에 보이는 무료 계산(원국 · 십성 · 오행 · 점수 · 근거)뿐 — 유료 본문 · 가려진 값은 이 코드에 없음
//   원칙: 단정 · 공포 조장 · 외도 단정 금지 (가능성 · 흐름으로만)
import { myChart, HAN } from './fortune.js';
import { ELEMENT_KO } from './saju.min.js';

const GROUP = { 비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성' };
const GKO = { 비겁: '자존심(비겁)', 식상: '표현(식상)', 재성: '현실 감각(재성)', 관성: '책임감(관성)', 인성: '생각(인성)' };
const jo = (w, a, b) => { const c = String(w).charCodeAt(String(w).length - 1); return w + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? a : b); };
const M = '██';

function sideOf(p) {
  const S = myChart(p), g = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  for (const x of [S.year, S.month, S.day, S.hour]) if (x) for (const t of [x.stemTenGod, x.branchTenGod]) if (GROUP[t]) g[GROUP[t]]++;
  const top = Object.keys(g).reduce((a, b) => (g[b] > g[a] ? b : a)), low = Object.keys(g).reduce((a, b) => (g[b] < g[a] ? b : a));
  const el = S.dayMaster.element, cnt = S.elementCount, weak = Object.keys(cnt).reduce((a, b) => (cnt[b] < cnt[a] ? b : a));
  return { name: p.name, S, g, top, low, n: g[top], el, elKo: `${ELEMENT_KO[el]}(${HAN[el]})`, ilji: S.day.ko, weak: `${ELEMENT_KO[weak]}(${HAN[weak]})` };
}

/* id → [개인화 부제, 첫 문장 앞부분] — c: { P(상대), I(나), rp, PR } */
const T = {
  /* 바람기 */
  type: c => [`${c.P.name}의 이성의 별이 가리키는 유형`, `${c.P.name}의 이성의 별은 원국에 따로 있어요. 그 별이 가리키는 사람은 —`],
  peach: c => [`${c.P.name} 원국의 도화 · 홍염 자리`, `${c.P.name}의 일주 ${c.P.ilji}, 이 자리에서 이성의 기운이 ${M}개 보이는데 —`],
  now: c => [`올해 ${c.P.name}의 이성운이 흔들리는 이유`, `올해의 지지가 ${c.P.name}의 배우자궁 ${jo(c.P.ilji, '과', '와')} 만나는 방식이 ${M}이라 —`],
  danger: c => [`앞으로 5년 중 ${M}년이 왜 위험한지`, `${c.P.name}에게 이성의 기운이 몰리는 해를 세어 보면 ${M}번, 그중 가장 센 해는 —`],
  signs: c => [`${c.P.elKo} 기운의 사람이 숨길 때 생기는 변화`, `${c.P.name}의 ${GKO[c.P.top]}이 ${c.P.n}개라, 말보다 먼저 바뀌는 건 —`],
  gap: c => [`${c.I.name}님과 ${c.P.name} 사이 틈이 생기는 자리`, `두 사람의 일지 ${c.I.ilji} · ${c.P.ilji}를 나란히 놓으면 —`],
  past: c => [`${c.P.name}의 ${c.P.top}이 만든 연애 습관`, `${c.P.name}의 원국에서 가장 강한 ${GKO[c.P.top]}은 지난 연애에서 —`],
  dont: c => [`${c.P.elKo}의 사람에게 의심을 드러내면 생기는 일`, `${c.P.name} 같은 ${c.P.elKo} 기운에게 절대 하면 안 되는 건 ${M} —`],
  strategy: c => [`${c.I.elKo} 기운인 ${c.I.name}님이 쥔 카드`, `${c.I.name}님의 일간은 ${c.I.elKo}, 이 관계에서 먼저 바꿀 수 있는 건 —`],
  /* 금지된 사랑 */
  want: c => [`${jo(c.P.name, '이', '가')} 이 관계에서 진짜 바라는 것`, `${c.P.name}의 가장 강한 기운은 ${GKO[c.P.top]}, 그래서 이 관계는 그 사람에게 —`],
  first: c => [`버티는 힘 ${M} 대 ${M} — 먼저 흔들리는 쪽`, `두 사람의 '버티는 힘'을 세어 보면 ${c.I.name}님 쪽은 ${M}개, ${c.P.name} 쪽은 —`],
  price: c => [`${c.I.name}님의 ${c.I.top}이 치를 값`, `${c.I.name}님 원국의 ${GKO[c.I.top]}이 ${c.I.n}개라, 이 관계에서 잃을 수 있는 건 —`],
  exposed: c => [`앞으로 12개월 중 ${M}월 · ${M}월`, `두 사람 배우자궁을 충하는 달이 ${M}번 있는데, 그중 첫 번째는 —`],
  end: c => [`세 갈래 길 중 두 사람 사주가 가리키는 쪽`, `두 사람을 묶는 합 · 충을 따져 보면 이 관계의 끝은 ${M}째 길에 가까운데 —`],
  exit: c => [`${c.I.name}님이 끊어 낼 힘이 생기는 해`, `${c.I.name}님에게 정리하는 기운이 들어오는 해는 ${M}년, 그 전에 —`],
  line: c => [`${c.I.elKo} 기운인 ${c.I.name}님이 지킬 선`, `${c.I.name}님 같은 ${c.I.elKo}의 사람은 이 관계에서 —`],
  /* 외도 후 선택 */
  repeat: c => [`${c.P.name}의 원국은 같은 흔들림을 부르는 구조인가`, `${c.P.name}의 이성의 별과 도화를 세어 보면 위험 신호는 ${M}개 —`],
  why: c => [`${c.P.name}의 ${c.P.top}이 흔들린 자리`, `${c.P.name}의 가장 강한 ${GKO[c.P.top]}, 그 기질이 틈을 만든 곳은 —`],
  stay: c => [`참고 가는 길의 ${M}년 · ${M}년`, `두 사람 배우자궁이 다시 가까워지는 해와 흔들리는 해가 겹치는 때는 —`],
  leave: c => [`${c.I.name}님의 버팀목 ${M}개로 버티는 석 달`, `${c.I.name}님을 받치는 기운(비겁 · 인성)을 세어 보면 —`],
  timing: c => [`결정하기 좋은 ${M}월, 피해야 할 ${M}월`, `${c.I.name}님의 판단이 맑아지는 달은 앞으로 12개월 중 ${M}번, 가장 가까운 건 —`],
  talk: c => [`${c.P.elKo}의 사람과 마주 앉는 법`, `${c.P.name}의 일간은 ${c.P.elKo}, 그래서 첫마디는 —`],
  self: c => [`${c.I.name}님 원국에 비어 있는 ${GKO[c.I.low]}`, `${c.I.name}님에게 가장 약한 기운은 ${GKO[c.I.low]}, 지금 그 자리를 채우는 건 —`],
  /* 재회 */
  mind: c => [`${c.P.name}의 ${c.P.top}에 남아 있는 ${c.I.name}님`, `${c.P.name}의 가장 강한 ${GKO[c.P.top]}은 지난 인연을 이렇게 기억해요 —`],
  when: c => [`${M}년 ${M}월, ${c.P.name}의 배우자궁이 움직이는 달`, `앞으로 12개월 중 ${c.P.name} 쪽 인연 자리가 열리는 달은 ${M}번, 가장 유력한 건 —`],
  block: c => [`두 사람 사이를 막는 ${M}가지`, `${c.P.name}의 ${GKO[c.P.top]}과 두 사람 일지의 관계를 보면 막는 건 —`],
  how: c => [`${c.P.elKo}의 사람에게 다시 닿는 첫 걸음`, `${c.P.name} 같은 ${c.P.elKo} 기운에게 통하는 건 긴 말보다 —`],
  again: c => [`같은 이유로 헤어지지 않으려면`, `두 사람의 일간 관계를 보면 지난번 균형이 무너진 지점은 —`],
  letgo: c => [`기다림의 기한 ${M}월`, `${c.I.name}님에게 새 판이 열리는 때가 ${M}년인데, 그 전에 —`],
  /* 속마음 */
  hide: c => [`${c.P.name}의 일지 ${c.P.ilji} 안에 숨은 기운`, `${c.P.name}의 일지 ${c.P.ilji} 속 지장간, 겉으로 안 보이는 그 기운은 —`],
  real: c => [`${c.P.name} 눈에 비친 ${c.I.elKo}의 ${c.I.name}님`, `두 사람 일간 관계로 보면 ${jo(c.P.name, '은', '는')} ${c.I.name}님을 ${M}한 사람으로 —`],
  signal: c => [`${c.P.elKo}의 사람이 마음 있을 때 하는 행동`, `${c.P.name} 같은 ${c.P.elKo} 기운은 마음이 생기면 말보다 먼저 —`],
  contact: c => [`연락해도 되는 ${M}월 · 피할 ${M}월`, `${c.P.name}의 표현이 풀리는 달이 ${M}번 있는데, 시간대는 —`],
  say: c => [`${c.P.name}에게 보낼 첫마디`, `${c.P.elKo}의 사람에게 통하는 첫마디는 이런 결이에요 — “${M}`],
  wait: c => [`지금 기다리는 게 이기는 이유`, `${c.P.name}의 ${GKO[c.P.top]}이 ${c.P.n}개라, 지금 몰아붙이면 —`],
  /* 신년 */
  q1: c => [`1~3월, ${c.I.name}님의 첫 고비와 첫 기회`, `2027년 1월은 ${M}점, 2월은 —`],
  q2: c => [`4~6월, 사람이 몰리는 달`, `봄 석 달 중 ${c.I.name}님 일지와 손잡는 달이 있는데 —`],
  q3: c => [`7~9월, 한 해의 반환점`, `여름 석 달의 점수를 이어 보면 가장 높은 달은 ${M}월 —`],
  q4: c => [`10~12월, 마무리하는 달`, `연말 석 달 중 재물 쪽 기운이 가장 센 달은 —`],
  money: c => [`돈이 들어오는 ${M}월 · 새는 ${M}월`, `${c.I.name}님의 재물 타입으로 보면 2027년 가장 강한 달은 ${M}월인데 —`],
  work: c => [`정관 · 정인이 뜨는 ${M}번의 달`, `${c.I.name}님의 ${GKO[c.I.top]}이 2027년에 인정받는 때는 —`],
  love: c => [`인연의 별이 들어오는 달`, `${c.I.name}님에게 인연의 별이 뜨는 달을 세어 보면 ${M}번 —`],
  health: c => [`${c.I.weak} 기운이 적은 ${c.I.name}님의 리듬`, `${c.I.name}님은 ${c.I.weak} 기운이 적은 편이라, 컨디션이 처지는 달은 —`],
  advice: c => [`힘을 줄 달 ${M}월, 쉬어 갈 달 ${M}월`, `한 줄로 정리하면 2027년의 핵심은 ${M}월에 —`],
  /* 재물 · 횡재 */
  flow: c => [`앞으로 12개월 돈 흐름 — 가장 강한 ${M}월`, `${c.I.name}님의 재물 기운이 가장 센 달은 ${M}점으로 —`],
  calendar: c => [`앞으로 90일 중 ★ 붙은 ${M}일`, `매일의 일진과 ${c.I.name}님 사주를 맞춰 보니 재물 기운이 겹치는 날이 ${M}번, 첫 번째는 —`],
  leak: c => [`돈이 새는 ${M}월`, `${c.I.name}님의 ${GKO[c.I.top]}이 지출로 이어지기 쉬운 달은 —`],
  big: c => [`큰돈 결정을 한 번 더 볼 달`, `압박과 변동의 기운이 겹치는 달이 ${M}번 있는데 —`],
  habit: c => [`${c.I.elKo} 기운에 맞는 돈 습관`, `${c.I.name}님 같은 ${c.I.elKo}의 사람은 돈이 ${M}할 때 —`],
  lucky: c => [`재물 행운의 색 · 방향 · 물건`, `${c.I.name}님에게 재물의 오행은 ${M}, 그래서 곁에 두면 좋은 건 —`],
  /* 궁합 */
  clash: c => [`${c.I.name}님과 ${jo(c.P.name, '이', '가')} 부딪히는 자리`, `싸울 때 ${c.I.elKo}의 ${c.I.name}님은 ${M}하고, ${c.P.elKo}의 ${jo(c.P.name, '은', '는')} —`],
  roles: c => [`${c.I.top} 대 ${c.P.top} — 역할 나누기`, `${c.I.name}님의 ${GKO[c.I.top]}과 ${c.P.name}의 ${GKO[c.P.top]}이 만나면 —`],
  years: c => [`함께하기 좋은 ${M}년`, `앞으로 5년 중 두 사람 인연 자리가 함께 움직이는 해는 ${M}번 —`],
  crisis: c => [`올해의 고비 달 ${M}월`, `두 사람 배우자궁을 충하는 달이 앞으로 12개월 중 ${M}번 —`],
  keep: c => [`두 사람이 오래가는 비결`, `두 사람 오행을 겹쳐 보면 서로 채워 주는 기운이 ${M} —`],
  /* 이번 달 · 합격운 */
  w1: c => [`1주차 — 평균 ${M}점`, `첫 주에 가장 좋은 날은 ${M}일, 그날 ${c.I.name}님에게 —`],
  w2: c => [`2주차 — 조심할 ${M}일`, `둘째 주에는 ${c.I.name}님 일지 ${jo(c.I.ilji, '과', '와')} 부딪히는 날이 —`],
  w3: c => [`3주차 — 흐름이 바뀌는 날`, `셋째 주 평균은 ${M}점, 가장 높은 날은 —`],
  w4: c => [`4주차 — 마무리`, `마지막 주에 가장 조심할 날은 ${M}일, 이유는 —`],
  good: c => [`이번 달 좋은 날 다섯`, `기운이 가장 좋은 첫 번째 날은 ${M}일(${M}점) —`],
  bad: c => [`이번 달 조심할 날 셋`, `가장 조심할 날은 ${M}일, ${c.I.name}님 일지와 —`],
  fields: c => [`재물 · 일 · 연애 · 건강이 가장 좋은 날`, `재물은 ${M}일, 연애는 —`],
  focus: c => [`집중이 잘 되는 ★ 날`, `두 달 동안 배움의 기운이 겹치는 날이 ${M}번, 가장 강한 날은 —`],
  doc: c => [`시험 · 서류에 힘이 실리는 날`, `정인 · 정관이 뜨는 날은 ${M}번, 가장 가까운 날은 —`],
  rest: c => [`복습만 할 날`, `${c.I.name}님 일지와 충이 드는 날이 ${M}번 —`],
  rhythm: c => [`${c.I.weak} 기운이 적은 ${c.I.name}님의 시험 전 리듬`, `${c.I.name}님은 ${c.I.weak} 기운이 적어서 시험 전 일주일은 —`],
  how: c => [`${c.I.elKo} 기운에 맞는 공부법`, `${c.I.elKo}의 사람은 ${M}할 때 머리에 오래 남아요. 그래서 —`],
  /* 마지막 장 */
  last: c => [`${jo(c.who, '이', '가')} 마지막에 남긴 한 줄`, `“${M} — `],
};

/* 절벽: 무료 구간 끝 · 이 사람 사주의 구체 단서 + 끊김 */
function cliff(id, c, rp) {
  const f0 = (rp.factors || []).find(f => f.points > 0) || (rp.factors || [])[0];
  const fact = f0 ? `‘${f0.label}’` : `${GKO[(c.P || c.I).top]} ${(c.P || c.I).n}개`, fj = jo(f0 ? f0.label : fact, '이', '가').slice(-1);
  if (rp.line === 'life') {
    const tz = (rp.teasers || [])[0];
    return `${c.I.name}님 원국의 ${GKO[c.I.top]} 기운이 ${c.I.n}개, 그리고 위에 가려 둔 ${tz ? `‘${tz.label}’` : '시기'} — 이 둘을 겹쳐 보면 한 달이 유난히 도드라지는데, 그 이유가 바로 다음 장에서 ${M}`;
  }
  return `${c.P.name}의 원국에서 ${fact}${fj} 보였어요. 그런데 이게 ${c.I.name}님의 일지 ${jo(c.I.ilji, '과', '와')} 만나는 순간 이야기가 조금 달라지는데 — ${M}`;
}

export function peek(id, rp, me, pt, m) {
  const PR = m.paidOf(id), who = m.CHARS[PR.ch].name, I = sideOf(me), P = pt && !PR.solo ? sideOf(pt) : null;
  const c = { I, P: P || I, who, rp };
  const sub = {}, lead = {};
  for (const s of rp.sections) {
    if (s.free) continue;
    const fn = T[s.id];
    if (!fn) continue;
    try { const [a, b] = fn(c); sub[s.id] = a; lead[s.id] = b; } catch { /* 부제 없이 */ }
  }
  return { sub, lead, cliff: cliff(id, c, rp), who };
}
