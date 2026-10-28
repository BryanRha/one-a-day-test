// 오늘의 타로 한 장 (무료 · 하루 한 장 · 메이저 아르카나 22장)
//   같은 날 · 같은 사람 = 같은 카드 (결정적 · 저장 없이 다시 계산) · 어제와 같은 카드는 피함
//   해석은 그날의 점쟁이 말투(tone)로 · 그날 일진 키워드와 이어서 · 관련 풀이로 한 줄 연결(가격 먼저)
//   그림: fortune/tarot/00~21.webp (Figma gpt-image-2.5 · 점쟁이 초상화 화풍 · 원본 PNG 는 OneDrive oneaday/assets/tarot)
//   '죽음' · '탑' · '악마'는 공포가 아니라 변화 · 끝과 시작 · 집착으로 풂
const jo = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return w + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? a : b); };
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/* [이름, 핵심어, 다정(해요체), 중간(반말), 매서움(독설), 오늘의 행동, 이어 볼 풀이] */
export const CARDS = [
  ['바보', '새 출발', '새로운 걸 시작하기 좋은 날이에요. 완벽하게 준비되지 않아도 괜찮아요.', '생각만 하던 거, 오늘은 그냥 가볍게 해 봐.', '재고 따지다 하루 다 간다. 오늘은 일단 저질러라.', '안 해 본 작은 일 하나 해 보기', 'monthly'],
  ['마법사', '재주', '가진 재주를 꺼내 쓰면 일이 술술 풀리는 날이에요.', '네 손에 이미 다 있어. 꺼내 쓰기만 하면 돼.', '도구 탓 그만해라. 오늘은 네 실력이 전부다.', '미뤄 둔 일 하나 직접 손대기', 'exam'],
  ['여사제', '직감', '말보다 직감을 믿어도 되는 날이에요. 조용히 지켜보세요.', '다 말하지 마. 오늘은 듣는 쪽이 이겨.', '입 다물고 촉을 믿어라. 떠벌리면 손해다.', '결정 전에 하룻밤 재워 보기', 'monthly'],
  ['여황제', '풍요', '넉넉함이 들어오는 날이에요. 나를 위한 작은 선물도 괜찮아요.', '오늘은 받는 날이야. 사양하지 말고 받아.', '복이 들어온다. 걷어차지 말고 챙겨라.', '나를 위한 맛있는 한 끼', 'wealth'],
  ['황제', '질서', '계획을 세우고 지키면 단단해지는 날이에요.', '오늘은 네가 판을 정리하는 날이야.', '흐지부지하면 끝이다. 규칙부터 세워라.', '할 일 세 개만 적고 지키기', 'newyear'],
  ['교황', '배움', '좋은 조언이 들어오는 날이에요. 어른의 말에 귀 기울여 보세요.', '혼자 끙끙대지 말고 물어봐. 답이 와.', '아는 척 그만하고 배워라. 오늘은 그게 이득이다.', '믿는 사람에게 조언 하나 구하기', 'exam'],
  ['연인', '선택', '마음이 끌리는 쪽을 골라도 되는 날이에요. 관계가 한 뼘 가까워져요.', '둘 중 하나 골라야 한다면, 마음 가는 쪽이야.', '양다리 걸치다 둘 다 놓친다. 하나만 골라라.', '고마운 사람에게 먼저 연락하기', 'compat'],
  ['전차', '전진', '밀고 나가면 이기는 날이에요. 방향만 잃지 마세요.', '오늘은 직진이야. 멈추지 마.', '머뭇거리면 밀린다. 고삐 쥐고 달려라.', '미뤄 둔 결정 하나 내리기', 'monthly'],
  ['힘', '부드러운 용기', '부드럽게 다가가면 거친 일도 풀리는 날이에요.', '세게 말고 부드럽게. 그게 진짜 힘이야.', '성질부리면 진다. 웃으면서 이겨라.', '화날 때 세 번 숨 쉬기', 'newyear'],
  ['은둔자', '성찰', '혼자만의 시간이 답을 주는 날이에요.', '오늘은 사람보다 나랑 이야기하는 날이야.', '단톡방 끄고 혼자 생각해라. 답은 네 안에 있다.', '30분 혼자 걷기', 'exam'],
  ['운명의 수레바퀴', '흐름의 전환', '흐름이 바뀌는 날이에요. 좋은 쪽으로 돌고 있어요.', '판이 돈다. 이번엔 네 차례일 수도 있어.', '운은 돈다. 잡을 준비 안 된 놈은 놓친다.', '들어온 기회에 일단 손들기', 'wealth'],
  ['정의', '균형', '공정하게 판단하면 결과도 바르게 오는 날이에요.', '감정 빼고 따져 봐. 답이 보여.', '남 탓하지 마라. 저울은 정확하다.', '미뤄 둔 정산 · 약속 정리하기', 'newyear'],
  ['매달린 사람', '관점 바꾸기', '잠시 멈추면 새로운 길이 보이는 날이에요.', '거꾸로 보면 답이 보여. 오늘은 잠깐 멈춰.', '버둥대지 마라. 멈추는 것도 실력이다.', '평소와 다른 길로 가 보기', 'monthly'],
  ['죽음', '끝과 새 시작', '하나를 마무리해야 새것이 들어오는 날이에요. 무서운 카드가 아니에요.', '끝낼 건 끝내. 그래야 다음이 와.', '질질 끄는 거 오늘 정리해라. 끝이 시작이다.', '안 쓰는 물건 하나 버리기', 'newyear'],
  ['절제', '조화', '서두르지 않고 섞어 가면 딱 좋은 날이에요.', '과하지도 모자라지도 않게. 그게 오늘의 비법.', '욕심 덜어라. 반만 해도 충분한 날이다.', '물 한 잔 천천히 마시기', 'compat'],
  ['악마', '집착과 유혹', '달콤한 유혹을 조심하는 날이에요. 잠깐 멈추면 이겨요.', '끊어야 할 거 알지? 오늘이 그날이야.', '네 발목 잡는 건 네 욕심이다. 끊어라.', '충동구매 장바구니 하루 묵히기', 'wealth'],
  ['탑', '갑작스러운 변화', '예상 밖의 일이 생겨도 괜찮아요. 무너진 자리에 더 좋은 게 세워져요.', '흔들려도 괜찮아. 새로 지을 기회야.', '버티던 게 무너질 수 있다. 미련 갖지 마라.', '계획 B 하나 적어 두기', 'monthly'],
  ['별', '희망', '희망이 반짝이는 날이에요. 바라던 일에 한 걸음 다가가요.', '아직 끝 아니야. 별 하나가 켜졌어.', '포기하기엔 이르다. 희망은 아직 살아 있다.', '하고 싶은 일 하나 적어 두기', 'newyear'],
  ['달', '흐릿함', '마음이 흐릿한 날이에요. 큰 결정은 하루 미뤄도 괜찮아요.', '헷갈리면 멈춰. 안개는 내일 걷혀.', '불안에 휘둘려 일 저지르지 마라. 오늘은 보기만 해.', '불안한 생각을 종이에 적어 보기', 'compat'],
  ['태양', '기쁨', '웃을 일이 생기는 밝은 날이에요. 마음껏 즐기세요.', '오늘은 네가 주인공이야. 마음껏 빛나.', '이런 날 숨어 있으면 바보다. 나가서 빛나라.', '좋아하는 사람과 웃기', 'wealth'],
  ['심판', '다시 일어서기', '다시 시작할 기회가 오는 날이에요. 지난 일을 털어도 돼요.', '부르는 소리가 들리지? 다시 일어날 때야.', '지난 실수 핑계 그만. 다시 일어나라.', '포기했던 일 다시 한 번 열어 보기', 'exam'],
  ['세계', '완성', '하나가 완성되는 날이에요. 스스로를 칭찬해 주세요.', '여기까지 온 거, 잘했어. 마무리해.', '끝까지 왔다. 마지막 한 끗 놓치지 마라.', '끝낸 일 하나 기록하기', 'newyear'],
];
export const cardImg = i => `fortune/tarot/${String(i).padStart(2, '0')}.webp`;

/* 오늘의 카드 번호: 날짜 · 사람으로 정해짐 · 어제와 같으면 7칸 옆으로 */
export function cardOf(me, date) {
  const key = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}|${me.name}|${me.y}${me.m}${me.d}|tarot`;
  const y = new Date(date); y.setDate(y.getDate() - 1);
  const a = hash(key(date)) % 22, b = hash(key(y)) % 22;
  return a === b ? (a + 7) % 22 : a;
}
/* 해석: 그날의 점쟁이 말투 + 그날 일진 키워드와 엮기 */
export function reading(i, f, CHARS) {
  const c = CARDS[i], tone = f.tone || 5, who = CHARS[f.ch].name;
  const line = tone <= 3 ? c[2] : tone <= 6 ? c[3] : c[4];
  const link = tone <= 3 ? `오늘은 '${f.key}'의 날이라, '${c[1]}' 카드가 더 또렷하게 읽혀요.` : tone <= 6 ? `오늘은 '${f.key}'의 날이잖아. 거기에 '${c[1]}' 카드가 나왔어.` : `'${f.key}'의 날에 '${c[1]}' 카드라. 우연 아니다.`;
  return { name: c[0], kw: c[1], who, line, link, act: c[5], prod: c[6] };
}

/* 화면: 뒤집기 시트 (X = app.js 가 넘겨주는 도구들) */
export async function open(X, flipped) {
  const m = await X.ft(), me = m.loadMe(); if (!me) return X.fortuneForm();
  const now = X.R.now(), key = X.R.keyOf(now), f = m.fortune(me, now), i = cardOf(me, now), r = reading(i, f, m.CHARS), done = (m.days()[key] || {}).tc != null;
  const P = m.paidOf(r.prod);
  X.openSheet(`<div class="intro tarot${done || flipped ? ' open' : ''}" id="tarotBox"><h2>🃏 오늘의 타로 한 장</h2><p class="fsub">${jo(r.who, '이', '가')} 오늘 뽑아 둔 카드예요 · 하루 한 장 · 무료</p>
    <div class="tcard" data-tflip><div class="tback"><b>${m.HAN[m.CHARS[f.ch].el]}</b><small>눌러서 뒤집기</small></div><img class="tfront" src="${cardImg(i)}" alt="${r.name}"></div>
    <div class="tread"><h3>${i}. ${r.name} <small>· ${r.kw}</small></h3><p class="tl">“${r.line}”</p><p>${r.link}</p><p class="ta">오늘의 행동 — ${r.act}</p>
      <div class="sdhook" data-paid="${P.id}"><small>이 카드가 마음에 걸린다면</small>${m.CHARS[P.ch].name}의 ${P.title} 미리보기 <em>→ 전체 ${X.won(P.price)}</em></div>
      <p class="fsub" style="margin-top:10px">저녁에 '오늘, 맞았나요?'로 기록하면 운세 달력에 남아요 · 재미로 보는 카드 풀이예요</p></div>
    <div class="stack"><button class="btn ghost" data-close>닫기</button></div></div>`);
  const flip = () => { const b = X.$('#tarotBox'); if (!b || b.classList.contains('open')) return; b.classList.add('open'); m.markDay(key, { tc: i }); X.T.track('tarot_flip', { card: i, ch: f.ch }); };
  const t = X.$('[data-tflip]'); if (t) t.onclick = flip;
  if (flipped) flip();
}
/* 오늘 카드 줄 (운세 카드 안) */
export function line(m, me, f, X) {
  const key = X.R.keyOf(X.R.now()), tc = (m.days()[key] || {}).tc;
  return `<div class="mchip tarot${tc != null ? ' done' : ''}" data-tarot><b>🃏 오늘의 타로</b><small>${tc != null ? `${CARDS[tc][0]} · 다시 보기` : '무료 한 장'}</small></div>`;
}
