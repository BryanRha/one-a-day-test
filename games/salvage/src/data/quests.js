// 의뢰 (M3-C · data.js 에서 옮김 — 경계 정리: 의뢰 · 이야기 쪽 데이터는 여기, data.js 는 다시 내보내기만)
//  three · DOM 없음 → node 시뮬 · 시험에서도 씀. data.js 를 import 하지 않음 (순환 방지)

/* ───── 의뢰 28개 (순서대로 · 1~10 튜토리얼 겸 시설 해금 · 11~18 밤의 항구 · 19~26 해저 터널 · 27~28 마무리) ─────
 * reward.cos: 꾸미기(이미 있으면 조개 150) · map: 끝내면 그 지도가 열림 (MAPS[m].unlock)
 * goal.map: 그 지도에서만 셈 · goal.t 추가: fac(시설 단계 — 은신처에서 확인) · cond(그 상태 판에서 탈출) · bosses(보스 종류 수 n + 보스 처치 합계 total, 기록)
 * goal.t: extract(탈출) · kill(처치 누적, kind 지정 가능) · zone(그 구역 들어갔다 탈출) · power(발전기 켜고 탈출)
 *         deliver(창고에서 납품) · vkey(금고 열쇠 들고 탈출 또는 금고실 열기) · boss · value(한 판 가치) · vault(금고실 열고 탈출)
 */
export const QUESTS = [
  { id: 'q1',  name: '첫 인양',       txt: '아무 출구로나 탈출하기',               goal: { t: 'extract', n: 1 },           reward: { shells: 60, bolt: 6 },             tip: '가까운 입구 사다리는 3분 안에만 열려요' },
  { id: 'q2',  name: '손에 익히기',   txt: '적 4마리 쓰러뜨리기 (누적)',          goal: { t: 'kill', n: 4 },              reward: { bolt: 6, wire: 2 }, unlock: 'rack', tip: '쓰러진 적 잔해도 뒤질 수 있어요' },
  { id: 'q3',  name: '깊은 창고로',   txt: '깊은 창고에 들어갔다 탈출하기',        goal: { t: 'zone', zone: 2, n: 1 },     reward: { cloth: 4, herb: 4 }, unlock: 'clinic', tip: '입구 구역 위쪽 수문을 지나면 깊은 창고' },
  { id: 'q4',  name: '전원 복구',     txt: '발전기를 켜고 탈출하기',               goal: { t: 'power', n: 1 },             reward: { wire: 6, glass: 2 }, unlock: 'lab', tip: '전원이 들어오면 화물 승강기 · 기관실 문이 열려요' },
  { id: 'q5',  name: '해초 모으기',   txt: '해초 다발 4개 납품',                   goal: { t: 'deliver', item: 'kelp', n: 4 }, reward: { shells: 60 }, unlock: 'kitchen', tip: '나무 상자 · 기름통에 잘 들어 있어요' },
  { id: 'q6',  name: '드론 사냥',     txt: '순찰 드론 5대 쓰러뜨리기',             goal: { t: 'kill', kind: 'drone', n: 5 }, reward: { shells: 80, lens: 1, spring: 2 }, tip: '조준경 개조로 멀리서도 잘 맞아요' },
  { id: 'q7',  name: '금고 열쇠',     txt: '금고 열쇠를 들고 탈출 (또는 금고실 열기)', goal: { t: 'vkey', n: 1 },          reward: { glass: 4, shells: 80 }, unlock: 'aquarium', tip: '수문지기가 갖고 있어요 · 깊은 사물함에서도 가끔' },
  { id: 'q8',  name: '수문지기',      txt: '기관실의 수문지기 쓰러뜨리기',         goal: { t: 'boss', n: 1 },              reward: { core: 1, shells: 120 }, unlock: 'lights', tip: '바닥 경고 원이 보이면 굴러서 빠져요' },
  { id: 'q9',  name: '대박 인양',     txt: '한 판에 가치 350 이상 들고 탈출',       goal: { t: 'value', n: 350 },           reward: { shells: 250, core: 1 }, tip: '가방이 크면 쉬워요 · 무게도 조심' },
  { id: 'q10', name: '금고실 털이',   txt: '금고실을 열고 탈출하기',               goal: { t: 'vault', n: 1 },             reward: { shells: 400 }, tip: '보상: 꾸미기 "노란 우비" (옷장에서 입어요)' },
  /* v0.4 — 밤의 항구 (q11 에서 열림) */
  { id: 'q11', name: '밤바다 채비',   txt: '조명 1단계 짓기 (헤드램프)',            goal: { t: 'fac', k: 'lights', lv: 1 }, reward: { shells: 80, wire: 4 }, map: 'harbor', tip: '밤의 항구는 헤드램프가 생명이에요' },
  { id: 'q12', name: '밤의 항구',     txt: '밤의 항구에서 탈출하기',               goal: { t: 'extract', map: 'harbor', n: 1 }, reward: { shells: 120, cloth: 6 }, tip: '등불 밑은 잘 보이지만, 적도 나를 잘 봐요' },
  { id: 'q13', name: '집게 조심',     txt: '항구의 집게 게 8마리 (누적)',           goal: { t: 'kill', kind: 'crab', n: 8 }, reward: { shells: 100, lens: 1 }, tip: '게는 둘씩 다녀요 — 산탄이 좋아요' },
  { id: 'q14', name: '컨테이너 야적장', txt: '항구 야적장에 들어갔다 탈출하기',      goal: { t: 'zone', map: 'harbor', zone: 2, n: 1 }, reward: { shells: 150, cos: 'h_sailor' }, tip: '보상: 꾸미기 "선원 모자"' },
  { id: 'q15', name: '크레인 전원',   txt: '항구 발전기를 켜고 탈출하기',           goal: { t: 'power', map: 'harbor', n: 1 }, reward: { wire: 8, glass: 4 }, tip: '전원이 들어오면 화물 크레인이 내려와요' },
  { id: 'q16', name: '궂은 날 인양',  txt: '폭풍이나 안개 낀 항구에서 탈출하기',     goal: { t: 'cond', map: 'harbor', conds: ['storm', 'fog'], n: 1 }, reward: { shells: 180, spring: 2 }, tip: '폭풍엔 소리가 묻혀요 · 안개엔 서로 잘 안 보여요' },
  { id: 'q17', name: '갈고리 선장',   txt: '등대의 갈고리 선장 쓰러뜨리기',         goal: { t: 'boss', map: 'harbor', n: 1 }, reward: { core: 1, shells: 250 }, tip: '바닥 줄이 보이면 옆으로 구르기 · 내려찍은 뒤 랜턴이 약점' },
  { id: 'q18', name: '선장실 금고',   txt: '항구 금고실을 열고 탈출하기',           goal: { t: 'vault', map: 'harbor', n: 1 }, reward: { shells: 450, cos: 's_glass' }, tip: '보상: 꾸미기 "총 스킨: 바다 유리"' },
  /* v0.4 — 해저 터널 (q19 에서 열림) */
  { id: 'q19', name: '물밑 지도',     txt: '연구대 3단계 짓기 (수압 계산)',          goal: { t: 'fac', k: 'lab', lv: 3 }, reward: { shells: 120, glass: 4 }, map: 'tunnel', tip: '연구대 3단계에서 해저 터널 지도가 풀려요' },
  { id: 'q20', name: '해저 터널',     txt: '해저 터널에서 탈출하기',               goal: { t: 'extract', map: 'tunnel', n: 1 }, reward: { shells: 150, herb: 6 }, tip: '짙은 물에선 산소가 줄어요 — 공기 방울 기둥을 기억해요' },
  { id: 'q21', name: '전기 해파리',   txt: '전기 해파리 8마리 (누적)',             goal: { t: 'kill', kind: 'jelly', n: 8 }, reward: { shells: 120, glass: 4 }, tip: '파란 원이 커지면 물 밖으로 비켜요' },
  { id: 'q22', name: '잠긴 선로',     txt: '터널 선로 구역에 들어갔다 탈출하기',     goal: { t: 'zone', map: 'tunnel', zone: 2, n: 1 }, reward: { shells: 180, cos: 'suit_teal' }, tip: '보상: 꾸미기 "청록 잠수복"' },
  { id: 'q23', name: '정비 열차',     txt: '터널 발전기를 켜고 탈출하기',           goal: { t: 'power', map: 'tunnel', n: 1 }, reward: { wire: 10, core: 1 }, tip: '정전 판이면 발전기가 불도 켜 줘요' },
  { id: 'q24', name: '급류를 건너',   txt: '급류나 정전인 터널에서 탈출하기',        goal: { t: 'cond', map: 'tunnel', conds: ['rapids', 'dark'], n: 1 }, reward: { shells: 220, spring: 2, lens: 1 }, tip: '물살을 거슬러 걸으면 느려요 — 돌아가는 길도 있어요' },
  { id: 'q25', name: '터널 장어',     txt: '제어실의 터널 장어 쓰러뜨리기',         goal: { t: 'boss', map: 'tunnel', n: 1 }, reward: { core: 2, shells: 300 }, tip: '돌진을 벽 쪽으로 유도하면 박혀서 2초 기절' },
  { id: 'q26', name: '제어실 금고',   txt: '터널 금고실을 열고 탈출하기',           goal: { t: 'vault', map: 'tunnel', n: 1 }, reward: { shells: 500, cos: 'fur_silver' }, tip: '보상: 꾸미기 "은빛 털"' },
  /* v0.4 — 마무리 */
  { id: 'q27', name: '인양왕',        txt: '한 판에 가치 900 이상 들고 탈출',       goal: { t: 'value', n: 900 }, reward: { shells: 400, core: 1 }, tip: '깊은 지도일수록 값진 게 나와요' },
  { id: 'q28', name: '인양단장',      txt: '세 지도 보스를 모두 · 보스 합계 15번 (기록)', goal: { t: 'bosses', n: 3, total: 15 }, reward: { shells: 600, cos: 'h_brass' }, tip: '수문지기 · 갈고리 선장 · 터널 장어 · 보상: 꾸미기 "황동 잠수 헬멧"' },
];
/* v0.5 의뢰인 · 종류 (docs/NARRATIVE.md 5장 대응표) — 대사 · 이야기 조각은 talk/common.js (나눠 받음)
 *  kind: story 이야기 · char 인물 · boss 보스 · chal 도전 */
const QMETA = {
  q1: ['gombang', 'story'], q2: ['moru', 'story'], q3: ['gombang', 'story'], q4: ['moru', 'story'], q5: ['neuru', 'char'], q6: ['moru', 'char'], q7: ['gombang', 'char'], q8: ['moru', 'boss'], q9: ['gombang', 'char'], q10: ['gombang', 'chal'],
  q11: ['moru', 'story'], q12: ['haedam', 'story'], q13: ['neuru', 'char'], q14: ['gombang', 'char'], q15: ['moru', 'char'], q16: ['haedam', 'chal'], q17: ['haedam', 'boss'], q18: ['gombang', 'char'],
  q19: ['haedam', 'story'], q20: ['seori', 'story'], q21: ['haedam', 'char'], q22: ['seori', 'char'], q23: ['moru', 'char'], q24: ['haedam', 'chal'], q25: ['moru', 'boss'], q26: ['gombang', 'char'], q27: ['gombang', 'chal'], q28: ['moru', 'chal'],
};
for (const q of QUESTS) [q.giver, q.kind] = QMETA[q.id];

/* ───── 판 의뢰 32 (M3-C · v0.6) — 본 사슬(위 28, 순서대로 하나씩)과 따로, 인물이 은신처에 와 있으면 여러 개가 함께 열림 ─────
 *  docs/NARRATIVE.md 5장 분포표(이야기 · 인물 · 보스/도전 · 반복) 의 1~3장 + 4장 시작분. 진행 · 보상 규칙은 board.js
 *  req: 열리는 조건 — 의뢰인이 와 있어야 함(늘) + q(본 사슬 의뢰 끝) · beat(이야기 걸음 끝) · prev(앞 판 의뢰 끝) · fac:[시설, 단계] · ch(이야기 장 이상)
 *       map(그 지도가 게임에 있어야 — 아직 없는 지도면 안 보임: 공장 'factory' = M3-B data/map_factory.js) · enemy(그 적 키가 있어야)
 *  goal.t: 판 결과 — extract · zone · power · kill(kind · 누적) · boss(map · 누적 · conds) · value · cond · carry(이야기 물건 · 그 지도/구역 상자 하나에 금빛 고리)
 *          은신처 — deliver(item 또는 mat) · fac · weapon(만든 무기) · mod(개조 단계 합) · gear(장비 단계) · codex(도감 칸) · tapes(녹음기) · graf(낙서) · beat(이야기 걸음)
 *  repeat: 매주(한국 날짜 월요일) 다시 열림 · auto: 카드 없이 조건이 되면 저절로 (지도 열기)
 *  reward: shells · 재료 · 물건 · cos(꾸미기 — 이미 있으면 조개 150) · 끝내면 의뢰인과 사이 +1 (board.js) */
export const BOARD = [
  /* 곰방 — 곰방 상회 (간판 · 빚) */
  { id: 'q29', giver: 'gombang', kind: 'char', ch: 1, name: '이름표 주인', txt: '녹슨 열쇠 2개 납품', req: { beat: 'b_moru' }, goal: { t: 'deliver', item: 'key', n: 2 }, reward: { shells: 70, cloth: 3 }, tip: '사물함 · 매표소 서랍에서 가끔 나와요' },
  { id: 'q30', giver: 'gombang', kind: 'char', ch: 1, name: '배달비', txt: '한 판에 가치 200 이상 들고 탈출', req: { prev: 'q29', q: 'q4' }, goal: { t: 'value', n: 200 }, reward: { shells: 90, bolt: 4 }, tip: '돌려주기 상자 배달비 — 깊은 창고 사물함이 알차요' },
  { id: 'q31', giver: 'gombang', kind: 'char', ch: 2, name: '간판 조각', txt: '야적장에서 간판 조각을 들고 탈출', req: { prev: 'q30', beat: 'b_ledger' }, goal: { t: 'carry', item: 'signpiece', map: 'harbor', zone: 2 }, reward: { shells: 110, wire: 4 }, tip: '금빛 고리 상자 — 파란 바탕에 흰 글씨' },
  { id: 'q32', giver: 'gombang', kind: 'char', ch: 3, name: '흩어진 단골', txt: '옛 승차권 2장 납품', req: { prev: 'q31', q: 'q20' }, goal: { t: 'deliver', item: 'ticket', n: 2 }, reward: { shells: 130, lens: 1 }, tip: '터널 매표소 서랍에 많아요' },
  { id: 'q33', giver: 'gombang', kind: 'repeat', ch: 1, repeat: true, name: '주간 고철 납품', txt: '기계 부품 3개 납품 (매주)', req: { q: 'q4' }, goal: { t: 'deliver', item: 'gear', n: 3 }, reward: { shells: 60, bolt: 4 }, tip: '공구함 · 드론 잔해에서 잘 나와요' },
  /* 모루 — 무기 · 시설 · 대수문 도면 */
  { id: 'q34', giver: 'moru', kind: 'char', ch: 1, name: '쓸 만한 총', txt: '연발 작살소총 만들기', req: { beat: 'b_power' }, goal: { t: 'weapon', k: 'rifle' }, reward: { spring: 2, bolt: 4 }, tip: '작업대 2단계에서 만들어요' },
  { id: 'q35', giver: 'moru', kind: 'char', ch: 1, name: '첫 개조', txt: '아무 무기에나 개조 부품 1개 달기', req: { q: 'q2' }, goal: { t: 'mod', n: 1 }, reward: { shells: 60, wire: 3 }, tip: '무기대에서 Mk1 부품을 만들어요' },
  { id: 'q36', giver: 'moru', kind: 'boss', ch: 2, name: '다시 일어선 덩치', txt: '수문지기 두 번 더 쓰러뜨리기 (누적)', req: { q: 'q11' }, goal: { t: 'boss', map: 'ware', n: 2 }, reward: { core: 1, shells: 120 }, tip: '내려찍은 뒤 가슴 보관함이 열려요 — 그때 두 배' },
  { id: 'q37', giver: 'moru', kind: 'char', ch: 2, name: '젖은 도면', txt: '등대 · 크레인에서 젖은 도면을 들고 탈출', req: { prev: 'q34', beat: 'b_light' }, goal: { t: 'carry', item: 'drawing', map: 'harbor', zone: 3 }, reward: { shells: 120, glass: 3 }, tip: '금빛 고리 상자 — 수리공사 도장' },
  { id: 'q56', giver: 'moru', kind: 'char', ch: 2, name: '두 벌째 갑옷', txt: '방어구 2단계 만들기', req: { q: 'q12' }, goal: { t: 'gear', k: 'vest', lv: 2 }, reward: { cloth: 6, bolt: 4 }, tip: '작업대 3단계에서 만들어요' },
  { id: 'q38', giver: 'moru', kind: 'char', ch: 3, name: '대형 작살', txt: '대형 작살총 만들기', req: { prev: 'q37', q: 'q23' }, goal: { t: 'weapon', k: 'harpoon' }, reward: { shells: 150, spring: 2 }, tip: '작업대 4단계 · 동력 코어 1' },
  { id: 'q39', giver: 'moru', kind: 'boss', ch: 3, name: '벽에 박힌 장어', txt: '터널 장어 두 번 더 쓰러뜨리기 (누적)', req: { q: 'q25' }, goal: { t: 'boss', map: 'tunnel', n: 2 }, reward: { core: 1, shells: 180 }, tip: '돌진을 벽 쪽으로 — 박히면 2초 기절' },
  /* 느루 — 부엌 · 축제 · 몽이 */
  { id: 'q40', giver: 'neuru', kind: 'char', ch: 1, name: '부엌 불', txt: '주방 1단계 짓기', req: { beat: 'b_neuru' }, goal: { t: 'fac', k: 'kitchen', lv: 1 }, reward: { shells: 50, herb: 4 }, tip: '의뢰 5를 끝내면 지을 수 있어요' },
  { id: 'q44', giver: 'neuru', kind: 'repeat', ch: 1, repeat: true, name: '주간 국거리', txt: '해초 다발 4개 납품 (매주)', req: { prev: 'q40' }, goal: { t: 'deliver', item: 'kelp', n: 4 }, reward: { herb: 6, shells: 30 }, tip: '나무 상자 · 기름통에 잘 들어 있어요' },
  { id: 'q42', giver: 'neuru', kind: 'char', ch: 2, name: '레시피 반쪽', txt: '부두 노점에서 레시피 반쪽을 들고 탈출', req: { beat: 'b_festival' }, goal: { t: 'carry', item: 'recipe', map: 'harbor', zone: 1 }, reward: { shells: 90, herb: 6 }, tip: '금빛 고리 상자 — 부두 쪽' },
  { id: 'q41', giver: 'neuru', kind: 'repeat', ch: 2, repeat: true, name: '주간 말린 생선', txt: '말린 생선 3개 납품 (매주)', req: { q: 'q12', prev: 'q40' }, goal: { t: 'deliver', item: 'fish', n: 3 }, reward: { herb: 6, cloth: 2 }, tip: '항구 어망 더미에 많아요' },
  { id: 'q43', giver: 'neuru', kind: 'char', ch: 3, name: '털실 뭉치', txt: '잠긴 선로에서 털실 뭉치를 들고 탈출', req: { prev: 'q42', q: 'q22' }, goal: { t: 'carry', item: 'yarn', map: 'tunnel', zone: 2 }, reward: { shells: 120, cloth: 6 }, tip: '금빛 고리 상자 — 분실물 칸' },
  /* 해담 — 의무실 · 흩어진 사람 명단 */
  { id: 'q45', giver: 'haedam', kind: 'char', ch: 2, name: '구급 상자', txt: '의무실 2단계 짓기', req: { beat: 'b_haedam' }, goal: { t: 'fac', k: 'clinic', lv: 2 }, reward: { bandage: 2, herb: 4 }, tip: '체력도 25 늘어요' },
  { id: 'q46', giver: 'haedam', kind: 'char', ch: 2, name: '선원 명단', txt: '항해 일지 2권 납품', req: { prev: 'q45' }, goal: { t: 'deliver', item: 'book', n: 2 }, reward: { shells: 110, cloth: 4 }, tip: '사물함 · 화물 컨테이너에서 나와요' },
  { id: 'q48', giver: 'haedam', kind: 'chal', ch: 2, name: '안개 속 선장', txt: '폭풍이나 안개 낀 항구에서 갈고리 선장 쓰러뜨리기', req: { q: 'q17' }, goal: { t: 'boss', map: 'harbor', conds: ['storm', 'fog'], n: 1 }, reward: { core: 1, shells: 160 }, tip: '안개엔 서로 잘 안 보여요 — 랜턴 빛을 따라가요' },
  { id: 'q49', giver: 'haedam', kind: 'repeat', ch: 2, repeat: true, name: '주간 연고 채우기', txt: '해초 연고 3개 납품 (매주)', req: { prev: 'q45' }, goal: { t: 'deliver', item: 'med', n: 3 }, reward: { bandage: 1, shells: 40 }, tip: '의무실에서 약초로 만들어요' },
  { id: 'q47', giver: 'haedam', kind: 'char', ch: 3, name: '비상함', txt: '산소 캔 3개 납품', req: { prev: 'q46', q: 'q20' }, goal: { t: 'deliver', item: 'o2', n: 3 }, reward: { bandage: 2, shells: 100 }, tip: '터널 매표소 · 정비 카트에서 나와요' },
  /* 서리 — 도감 · 녹음기 · 낙서 */
  { id: 'q50', giver: 'seori', kind: 'char', ch: 3, name: '도감 스무 칸', txt: '기억 도감 20칸 채우기', req: { beat: 'b_ch3' }, goal: { t: 'codex', n: 20 }, reward: { lens: 1, shells: 90 }, tip: '처음 들고 나온 물건이 한 칸씩' },
  { id: 'q51', giver: 'seori', kind: 'char', ch: 3, name: '녹음기 셋', txt: '녹음기 3개 듣기', req: { prev: 'q50' }, goal: { t: 'tapes', n: 3 }, reward: { glass: 4, shells: 80 }, tip: '깊은 구역 상자에 가끔 들어 있어요' },
  { id: 'q52', giver: 'seori', kind: 'char', ch: 3, name: '벽에 남긴 말', txt: '벽 낙서 10개 읽기', req: { prev: 'q50' }, goal: { t: 'graf', n: 10 }, reward: { shells: 110, wire: 4 }, tip: '반짝이는 낙서 위를 지나가면 기록돼요' },
  { id: 'q53', giver: 'seori', kind: 'repeat', ch: 3, repeat: true, name: '주간 젖은 종이', txt: '항해 일지 1권 납품 (매주)', req: { prev: 'q50' }, goal: { t: 'deliver', item: 'book', n: 1 }, reward: { glass: 2, shells: 50 }, tip: '젖은 종이도 마르면 읽혀요' },
  /* 바람 — 판 안에서 만난 떠돌이 (4장에 합류) */
  { id: 'q54', giver: 'baram', kind: 'char', ch: 3, name: '공짜 지름길', txt: '급류나 정전인 터널에서 제어실까지 갔다 탈출', req: { beat: 'b_boot' }, goal: { t: 'zone', map: 'tunnel', zone: 3, conds: ['rapids', 'dark'] }, reward: { spring: 2, shells: 120 }, tip: '바람이 알려 준 길 — 물살을 등지고 걸어요' },
  { id: 'q55', giver: 'baram', kind: 'char', ch: 4, name: '검은 깃발', txt: '공장의 검은 닻 대원 3 쓰러뜨리기 (누적)', req: { beat: 'b_baram', map: 'factory', enemy: 'raider' }, goal: { t: 'kill', fac: 'anchor', map: 'factory', n: 3 }, reward: { shells: 200, spring: 2 }, tip: '검은 닻은 둘씩 다니며 서로 엄호해요' },
  /* 4장 시작 — 가라앉은 공장 (지도 = M3-B data/map_factory.js) · q57 을 끝내면 MAPS.factory.unlock 키('map_factory')도 S.quests.done 에 넣음 → 지도 열림 */
  { id: 'q57', giver: 'moru', kind: 'story', ch: 3, auto: true, name: '불을 만든 곳으로', txt: '3장 끝 — 노을의 편지', req: { map: 'factory' }, goal: { t: 'beat', id: 'b_ch3end' }, reward: { shells: 100 }, map: 'factory', tip: '편지 속 "불을 만든 곳" = 가라앉은 공장' },
  { id: 'q58', giver: 'moru', kind: 'story', ch: 4, name: '공방 가는 길', txt: '가라앉은 공장 깊은 구역에 들어갔다 탈출', req: { beat: 'b_ch4', map: 'factory' }, goal: { t: 'zone', map: 'factory', zone: 2 }, reward: { shells: 180, bolt: 8 }, tip: '공장은 쇳물 웅덩이가 뜨거워요' },
  { id: 'q59', giver: 'seori', kind: 'char', ch: 4, name: '미완성 랜턴', txt: '용광로 구역에서 미완성 랜턴을 들고 탈출', req: { beat: 'b_ch4', map: 'factory' }, goal: { t: 'carry', item: 'lantern_u', map: 'factory', zone: 2 }, reward: { shells: 150, glass: 4 }, tip: '금빛 고리 상자 — 노을 랜턴과 같은 틀' },
  { id: 'q60', giver: 'moru', kind: 'boss', ch: 4, name: '공장의 감독', txt: '가라앉은 공장 보스 쓰러뜨리기', req: { prev: 'q58', map: 'factory' }, goal: { t: 'boss', map: 'factory', n: 1 }, reward: { core: 2, shells: 300 }, tip: '예고 원이 보이면 굴러서 빠져요' },
  /* ───── v0.7 (M4-C) 의뢰 60 → 90: 4장 공장 18 · 5장 연구소 12 ─────
   *  연결: q61(4장 끝 → 연구소 해금 'map_lab' = M4-B data/map_lab.js MAP_UNLOCK) · 검은 닻 두목(M4-A 적 키 'chief' — 없으면 안 보임)
   *        맵 장비(M4-B MAP_GEAR — mg: S.gear[k]) · 날씨(M4-B 판 상태 — goal.conds 중 게임에 있는 게 하나도 없으면 안 보임 · res.cond 또는 res.weather 로 셈) · 연구소 지도(없으면 안 보임) */
  /* 4장 — 연구소 여는 auto (q57 과 같은 방식) */
  { id: 'q61', giver: 'moru', kind: 'story', ch: 4, auto: true, name: '깊은 물길로', txt: '4장 끝 — 대수문 회로의 서명', req: { map: 'lab' }, goal: { t: 'beat', id: 'b_ch4end' }, reward: { shells: 150 }, map: 'lab', tip: '파수 채널이 시작되는 곳 = 심해 연구소' },
  /* 곰방 — 공방 사람들 · 고철 값 */
  { id: 'q62', giver: 'gombang', kind: 'char', ch: 4, name: '공방 도장', txt: '공방 도장 2개 납품', req: { beat: 'b_ch4', map: 'factory' }, goal: { t: 'deliver', item: 'stamp', n: 2 }, reward: { shells: 160, glass: 2 }, tip: '공방 작업대에서 가끔 나와요' },
  { id: 'q63', giver: 'gombang', kind: 'repeat', ch: 4, repeat: true, name: '주간 쇳물 고철', txt: '쇳물 찌꺼기 3개 납품 (매주)', req: { prev: 'q62', map: 'factory' }, goal: { t: 'deliver', item: 'slag', n: 3 }, reward: { shells: 70, bolt: 6 }, tip: '녹이면 볼트가 돼요 — 공방 작업대에 많아요' },
  { id: 'q64', giver: 'gombang', kind: 'chal', ch: 4, name: '공장 시세', txt: '공장에서 가치 500 이상 들고 탈출', req: { prev: 'q62', map: 'factory' }, goal: { t: 'value', map: 'factory', n: 500 }, reward: { shells: 220, spring: 2 }, tip: '동력 코어실 상자가 값져요' },
  /* 모루 — 공방 불 · 감독관 · 설계도 */
  { id: 'q65', giver: 'moru', kind: 'char', ch: 4, name: '공방 불씨', txt: '공장 발전기를 켜고 탈출하기', req: { beat: 'b_ch4', map: 'factory' }, goal: { t: 'power', map: 'factory' }, reward: { wire: 8, bolt: 6 }, tip: '전원이 들어오면 컨베이어가 반출구로 데려다줘요' },
  { id: 'q66', giver: 'moru', kind: 'char', ch: 4, name: '랜턴 설계도', txt: '랜턴 설계도 1장 납품', req: { prev: 'q65', map: 'factory' }, goal: { t: 'deliver', item: 'blueprint', n: 1 }, reward: { shells: 180, lens: 1 }, tip: '코어 보관대 · 은닉 상자에서 나와요' },
  { id: 'q67', giver: 'moru', kind: 'boss', ch: 4, name: '다시 달군 국자', txt: '쇳물 감독관 두 번 더 쓰러뜨리기 (누적)', req: { q: 'q60', map: 'factory' }, goal: { t: 'boss', map: 'factory', n: 2 }, reward: { core: 1, shells: 220 }, tip: '내려찍은 뒤 가슴 용광로 문이 열려요 — 그때 두 배' },
  { id: 'q68', giver: 'moru', kind: 'chal', ch: 4, name: '김 속의 감독', txt: '증기 · 정전 공장에서 감독관 쓰러뜨리기', req: { q: 'q60', map: 'factory' }, goal: { t: 'boss', map: 'factory', conds: ['steam', 'outage'], n: 1 }, reward: { core: 1, shells: 260 }, tip: '증기 속에선 감독관도 나를 잘 못 봐요' },
  /* 느루 — 공방 식당 · 축제 */
  { id: 'q69', giver: 'neuru', kind: 'char', ch: 4, name: '공방 도시락', txt: '하역장에서 찌그러진 도시락 통을 들고 탈출', req: { beat: 'b_ch4', map: 'factory' }, goal: { t: 'carry', item: 'lunchtin', map: 'factory', zone: 1 }, reward: { shells: 140, herb: 6 }, tip: '금빛 고리 상자 — 하역장 쪽' },
  { id: 'q70', giver: 'neuru', kind: 'char', ch: 4, name: '등롱 유리', txt: '바다 유리 2개 납품', req: { prev: 'q69' }, goal: { t: 'deliver', item: 'gem', n: 2 }, reward: { shells: 160, cloth: 6 }, tip: '축제 등롱의 깨진 유리 — 깊은 상자에서 나와요' },
  /* 해담 — 화상 · 공방 사람들 */
  { id: 'q71', giver: 'haedam', kind: 'chal', ch: 4, name: '데지 말고', txt: '과열된 공장에서 탈출하기', req: { beat: 'b_ch4', map: 'factory' }, goal: { t: 'cond', map: 'factory', conds: ['overheat'] }, reward: { bandage: 2, shells: 180 }, tip: '쇳물 도랑은 굴러서 건너면 안 데어요' },
  { id: 'q72', giver: 'haedam', kind: 'char', ch: 4, name: '공방 출근부', txt: '용광로 구역에서 출근부를 들고 탈출', req: { prev: 'q71', beat: 'b_workshop' }, goal: { t: 'carry', item: 'crewlist', map: 'factory', zone: 2 }, reward: { shells: 170, bandage: 1 }, tip: '금빛 고리 상자 — 공방 사람 일곱 이름' },
  /* 서리 — 도감 · 녹음기 */
  { id: 'q73', giver: 'seori', kind: 'char', ch: 4, name: '도감 마흔 칸', txt: '기억 도감 40칸 채우기', req: { prev: 'q52', beat: 'b_ch4' }, goal: { t: 'codex', n: 40 }, reward: { lens: 1, shells: 160 }, tip: '처음 들고 나온 물건이 한 칸씩' },
  { id: 'q74', giver: 'seori', kind: 'char', ch: 4, name: '녹음기 아홉', txt: '녹음기 9개 듣기', req: { prev: 'q51', beat: 'b_ch4' }, goal: { t: 'tapes', n: 9 }, reward: { glass: 4, shells: 150 }, tip: '지도마다 셋 — 깊은 구역 상자에 가끔' },
  /* 바람 — 검은 닻 · 여울 */
  { id: 'q75', giver: 'baram', kind: 'char', ch: 4, name: '화약 냄새', txt: '검은 닻 화약꾼 4 쓰러뜨리기 (누적)', req: { prev: 'q55', enemy: 'bomber' }, goal: { t: 'kill', kind: 'bomber', n: 4 }, reward: { shells: 200, powder: 6 }, tip: '불병은 떨어질 자리에 원이 먼저 떠요' },
  { id: 'q76', giver: 'baram', kind: 'boss', ch: 4, name: '검은 닻 두목', txt: '검은 닻 두목 쓰러뜨리기', req: { beat: 'b_baram', enemy: 'chief' }, goal: { t: 'kill', kind: 'chief', n: 1 }, reward: { core: 1, shells: 320 }, tip: '밤 판에 나타나요 — 부하를 먼저 떼어 내요' },
  { id: 'q77', giver: 'baram', kind: 'char', ch: 4, name: '여울의 쪽지', txt: '코어실에서 여울의 쪽지를 들고 탈출', req: { prev: 'q75', beat: 'b_pencil' }, goal: { t: 'carry', item: 'yeoulnote', map: 'factory', zone: 3 }, reward: { shells: 220, spring: 2 }, tip: '금빛 고리 상자 — 은닉처 구석' },
  { id: 'q78', giver: 'baram', kind: 'repeat', ch: 4, repeat: true, name: '주간 닻 배지', txt: '검은 닻 배지 2개 납품 (매주)', req: { prev: 'q55' }, goal: { t: 'deliver', item: 'anchorpin', n: 2 }, reward: { shells: 80, powder: 4 }, tip: '배지가 줄면 장부의 번호도 줄어요' },
  /* 5장 — 심해 연구소 (지도 = M4-B data/map_lab.js · 없으면 안 보임) */
  { id: 'q79', giver: 'seori', kind: 'char', ch: 5, name: '연구원 출입증', txt: '연구동 입구에서 연구원 출입증을 들고 탈출', req: { beat: 'b_ch5', map: 'lab' }, goal: { t: 'carry', item: 'labcard', map: 'lab', zone: 1 }, reward: { shells: 200, glass: 3 }, tip: '금빛 고리 상자 — 입구 쪽 서랍장' },
  { id: 'q80', giver: 'seori', kind: 'char', ch: 5, name: '도감 쉰 칸', txt: '기억 도감 50칸 채우기', req: { prev: 'q73', beat: 'b_tank' }, goal: { t: 'codex', n: 50 }, reward: { lens: 2, shells: 200 }, tip: '연구소 물건도 한 칸씩' },
  { id: 'q81', giver: 'seori', kind: 'char', ch: 5, name: '보관 목록', txt: '관제실에서 보관 목록 출력지를 들고 탈출', req: { prev: 'q79', beat: 'b_pasu', map: 'lab' }, goal: { t: 'carry', item: 'holdlist', map: 'lab', zone: 3 }, reward: { glass: 6, shells: 260 }, tip: '금빛 고리 상자 — 기록 보관함' },
  { id: 'q82', giver: 'pasu', kind: 'story', ch: 5, name: '전력 복구 요망', txt: '연구소 발전기를 켜고 탈출하기', req: { beat: 'b_mother', map: 'lab' }, goal: { t: 'power', map: 'lab' }, reward: { wire: 10, shells: 200 }, tip: '파수의 무전: "전력 부족. 보관품 손상 우려."' },
  { id: 'q83', giver: 'pasu', kind: 'story', ch: 5, name: '반환 요청', txt: '작은 금고 1개 납품 (주인에게 반환)', req: { beat: 'b_pasu' }, goal: { t: 'deliver', item: 'chest', n: 1 }, reward: { shells: 260, core: 1 }, tip: '깊은 구역 보물 상자에서 나와요' },
  { id: 'q84', giver: 'haedam', kind: 'char', ch: 5, name: '해독 필터', txt: '맵 장비 해독 필터 만들기', req: { beat: 'b_moss' }, goal: { t: 'gear', k: 'filter', lv: 1, mg: true }, reward: { bandage: 3, shells: 200 }, tip: '독수 판: 독이 1/3만 올라요 — 출격 준비에서 고르기' },
  { id: 'q85', giver: 'haedam', kind: 'chal', ch: 5, name: '독물 속으로', txt: '독수가 퍼진 판에서 탈출하기', req: { beat: 'b_tank' }, goal: { t: 'cond', conds: ['toxic'] }, reward: { bandage: 2, herb: 8, shells: 200 }, tip: '독물 칸은 짧게 지나요 — 연고를 손에' },
  { id: 'q86', giver: 'baram', kind: 'chal', ch: 5, name: '얼음 물길', txt: '한파 판에서 탈출하기', req: { beat: 'b_tank' }, goal: { t: 'cond', conds: ['cold'] }, reward: { cloth: 8, shells: 200 }, tip: '물에 오래 있으면 몸이 굳어요' },
  { id: 'q87', giver: 'baram', kind: 'boss', ch: 5, name: '두목 한 번 더', txt: '검은 닻 두목 두 번 더 (누적)', req: { prev: 'q76', beat: 'b_mother' }, goal: { t: 'kill', kind: 'chief', n: 2 }, reward: { core: 1, shells: 380 }, tip: '두목이 휘파람 불면 부하가 옆으로 돌아요' },
  { id: 'q88', giver: 'moru', kind: 'char', ch: 5, name: '방한 잠수복', txt: '맵 장비 방한 잠수복 만들기', req: { beat: 'b_ch5' }, goal: { t: 'gear', k: 'drysuit', lv: 1, mg: true }, reward: { spring: 3, shells: 180 }, tip: '연구소는 춥다 — 한파 판에서 체온이 1/3만 줄어요' },
  { id: 'q89', giver: 'gombang', kind: 'repeat', ch: 5, repeat: true, name: '주간 심해 고철', txt: '심해 배터리 2개 납품 (매주)', req: { beat: 'b_ch5' }, goal: { t: 'deliver', item: 'battery', n: 2 }, reward: { shells: 90, wire: 4 }, tip: '터널 · 연구소 기계 상자에 있어요' },
  { id: 'q90', giver: 'neuru', kind: 'char', ch: 5, name: '연구소 머그', txt: '연구소에서 국 주문 쪽지 붙은 머그를 들고 탈출', req: { beat: 'b_moss', map: 'lab' }, goal: { t: 'carry', item: 'mug', map: 'lab', zone: 2 }, reward: { shells: 200, herb: 6 }, tip: '금빛 고리 상자 — 수조 옆 휴게실' },
  /* ───── M5-A (v0.8) 6장 「대수문」 · 엔딩 뒤 · 조개 쓰는 곳 · 매일 의뢰 — q91~q120 ─────
   *  새 goal.t: pay(조개 내기 — 은신처 '내기' 버튼 · 조개 쓰는 곳) · rebuild(엔딩 뒤 '은포 되살리기' 수 = S.story.rebuild) · endings(본 엔딩 길 수)
   *  새 req: end(엔딩을 봄) · repeat: 'day' = 매일 다시 (한국 날짜) — 매일 할 수 있는 의뢰 3개 이상(ROADMAP M5 설계 메모 ②)
   *  reward.rebuild: 은포 되살리기 +n (엔딩 뒤 은신처 꾸밈 · q119 '은포 등불 서른') */
  /* 6장 — 바람 · 여울 (5장 끝 선택이 대사에) */
  { id: 'q91', giver: 'baram', kind: 'story', ch: 6, name: '여울', txt: '공장 코어실에서 검은 닻 수감 칸 열쇠를 들고 탈출', req: { beat: 'b_ch6', map: 'factory' }, goal: { t: 'carry', item: 'cellkey', map: 'factory', zone: 3 }, reward: { shells: 260, spring: 3 }, tip: '금빛 고리 상자 — 코어실 은닉 상자' },
  { id: 'q92', giver: 'baram', kind: 'boss', ch: 6, name: '두목의 마지막 밤', txt: '검은 닻 두목 쓰러뜨리기 (6장)', req: { prev: 'q91', enemy: 'chief' }, goal: { t: 'kill', kind: 'chief', n: 1 }, reward: { core: 1, shells: 300 }, tip: '밤 판에 나타나요 — 닻이 박히면 등 코어' },
  /* 6장 — 파수 의뢰 둘 (걸음 b_pasu6 이 기다림 · 6장 첫 걸음 뒤 바로 열림) */
  { id: 'q95', giver: 'pasu', kind: 'story', ch: 6, name: '조력 전원 연결', txt: '가라앉은 공장 발전기를 켜고 탈출 (대수문 선에 물림)', req: { beat: 'b_ch6', map: 'factory' }, goal: { t: 'power', map: 'factory' }, reward: { wire: 10, shells: 240 }, tip: '파수의 무전: "공장 조력 전원을 대수문 선에 물려 주십시오."' },
  { id: 'q96', giver: 'pasu', kind: 'story', ch: 6, name: '승강로 승인 카드', txt: '연구소 수조 구역에서 승강로 승인 카드를 들고 탈출', req: { beat: 'b_ch6', map: 'lab' }, goal: { t: 'carry', item: 'gatecard', map: 'lab', zone: 2 }, reward: { glass: 6, shells: 260 }, tip: '금빛 고리 상자 — 수조 구역 중계기 보관함' },
  /* 6장 — 인물 · 도전 */
  { id: 'q94', giver: 'moru', kind: 'char', ch: 6, name: '마지막 개조', txt: '개조 단계 합 16 (꼭대기 가기 전 손질)', req: { beat: 'b_ch6' }, goal: { t: 'mod', n: 16 }, reward: { lens: 2, shells: 200 }, tip: '무기 탭 — 주무기 · 보조무기 개조 단계를 합쳐요' },
  { id: 'q97', giver: 'haedam', kind: 'char', ch: 6, name: '숨 연습', txt: '해저 터널 깊은 구역에 들어갔다 탈출', req: { beat: 'b_ch6' }, goal: { t: 'zone', map: 'tunnel', zone: 3 }, reward: { bandage: 2, herb: 6 }, tip: '공기 방울 기둥을 이어 가요' },
  { id: 'q98', giver: 'seori', kind: 'char', ch: 6, name: '노을의 랜턴 걸이', txt: '연구소 관제실에서 빈 랜턴 걸이를 들고 탈출', req: { beat: 'b_ch6', prev: 'q81', map: 'lab' }, goal: { t: 'carry', item: 'lhook', map: 'lab', zone: 3 }, reward: { glass: 6, shells: 220 }, tip: '금빛 고리 상자 — 빈 잠수복 의자 옆' },
  { id: 'q99', giver: 'seori', kind: 'char', ch: 6, name: '녹음기 열다섯', txt: '녹음기 15개 듣기', req: { prev: 'q74', beat: 'b_ch6' }, goal: { t: 'tapes', n: 15 }, reward: { glass: 5, shells: 220 }, tip: '지도마다 셋 — 대수문 꼭대기에도 셋' },
  { id: 'q100', giver: 'neuru', kind: 'char', ch: 6, name: '축제 등롱 열 개', txt: '바다 유리 3개 납품 (축제 등롱 갓)', req: { beat: 'b_last' }, goal: { t: 'deliver', item: 'gem', n: 3 }, reward: { herb: 8, shells: 160 }, tip: '바다 유리 — 사물함 · 금고에 가끔' },
  { id: 'q101', giver: 'gombang', kind: 'char', ch: 6, name: '상회 재개업 자금', txt: '조개 1,500 내기 (곰방 상회 다시 열기)', req: { beat: 'b_last' }, goal: { t: 'pay', n: 1500 }, reward: { core: 1, rebuild: 2 }, tip: '조개 쓰는 곳 — 의뢰 탭 \'내기\'' },
  { id: 'q102', giver: 'haedam', kind: 'chal', ch: 6, name: '폭풍 속 귀환', txt: '폭풍 판에서 탈출하기 (어느 지도든)', req: { beat: 'b_ch6' }, goal: { t: 'cond', conds: ['storm'] }, reward: { bandage: 2, shells: 200 }, tip: '번개가 치면 잠깐 다 보여요' },
  { id: 'q103', giver: 'baram', kind: 'chal', ch: 6, name: '얼음 물길 끝까지', txt: '한파 판에서 깊은 구역까지 갔다 탈출', req: { beat: 'b_ch6', prev: 'q86' }, goal: { t: 'zone', zone: 3, conds: ['cold'] }, reward: { cloth: 8, shells: 220 }, tip: '방한 잠수복을 고르고 가요' },
  /* 엔딩 뒤 (req.end) — 파수 다시 붙기 · 반환 · 은포 되살리기 */
  { id: 'q93', giver: 'moru', kind: 'char', ch: 6, name: '수문 판 볼트', txt: '대수문 볼트 4개 납품', req: { end: 1 }, goal: { t: 'deliver', item: 'gbolt', n: 4 }, reward: { bolt: 12, shells: 150, rebuild: 1 }, tip: '대수문 꼭대기 계단 보관함' },
  { id: 'q104', giver: 'seori', kind: 'boss', ch: 6, name: '다시 선 파수', txt: '대수문 꼭대기에서 파수 한 번 더 (시험 운전)', req: { end: 1 }, goal: { t: 'boss', map: 'gate', n: 1 }, reward: { core: 2, shells: 400 }, tip: '파수가 시험 운전을 청했어요 — 패턴은 같아요' },
  { id: 'q105', giver: 'pasu', kind: 'story', ch: 6, name: '반환 목록 0001', txt: '작은 금고 2개 납품 (첫 반환)', req: { end: 1 }, goal: { t: 'deliver', item: 'chest', n: 2 }, reward: { glass: 4, shells: 300, rebuild: 2 }, tip: '깊은 구역 보물 상자 · 파수 잔해' },
  { id: 'q106', giver: 'gombang', kind: 'char', ch: 6, name: '언덕의 새 가게', txt: '조개 3,000 내기 (언덕 가게 짓기)', req: { end: 1, prev: 'q101' }, goal: { t: 'pay', n: 3000 }, reward: { core: 1, rebuild: 4 }, tip: '조개 쓰는 곳 — 은포 되살리기 +4' },
  { id: 'q107', giver: 'haedam', kind: 'char', ch: 6, name: '명단의 마지막 이름', txt: '기억 도감 65칸 채우기', req: { end: 1, prev: 'q80' }, goal: { t: 'codex', n: 65 }, reward: { bandage: 3, shells: 250 }, tip: '대수문 꼭대기 물건도 한 칸씩' },
  { id: 'q108', giver: 'baram', kind: 'boss', ch: 6, name: '밤바다 두목 셋', txt: '검은 닻 두목 세 번 더 (누적)', req: { end: 1, prev: 'q92', enemy: 'chief' }, goal: { t: 'kill', kind: 'chief', n: 3 }, reward: { core: 2, shells: 380 }, tip: '여울이 닻 무리의 순찰 시간을 알려 줬어요' },
  { id: 'q109', giver: 'neuru', kind: 'char', ch: 6, name: '축제 국 백 그릇', txt: '말린 생선 6개 납품', req: { end: 1 }, goal: { t: 'deliver', item: 'fish', n: 6 }, reward: { herb: 10, rebuild: 1 }, tip: '항구 어망 더미에 많아요' },
  { id: 'q110', giver: 'seori', kind: 'char', ch: 6, name: '은포 도감', txt: '기억 도감 78칸 채우기', req: { end: 1, prev: 'q107' }, goal: { t: 'codex', n: 78 }, reward: { lens: 3, shells: 400, rebuild: 3 }, tip: '세 번 건진 물건은 사연이 한 줄 더' },
  { id: 'q111', giver: 'gombang', kind: 'chal', ch: 6, name: '한 판 1,500', txt: '한 판에 가치 1,500 이상 들고 탈출', req: { end: 1 }, goal: { t: 'value', n: 1500 }, reward: { core: 1, rebuild: 2 }, tip: '대수문 꼭대기 잔해 · 금고실' },
  { id: 'q119', giver: 'gombang', kind: 'story', ch: 6, name: '은포 등불 서른', txt: '은포 되살리기 30 (의뢰 · 반환 · 기부로)', req: { end: 1 }, goal: { t: 'rebuild', n: 30 }, reward: { core: 3, shells: 800 }, tip: '오늘의 반환 상자 · 언덕의 새 가게 · 반환 의뢰가 하나씩' },
  { id: 'q120', giver: 'neuru', kind: 'story', ch: 6, name: '불이 켜진 곳', txt: '세 길의 끝을 모두 보기 (기록실에서 다시)', req: { end: 1 }, goal: { t: 'endings', n: 3 }, reward: { core: 2, rebuild: 5 }, tip: '설정 → 기록실에서 다른 길을 고를 수 있어요 (장비 · 시설 그대로)' },
  /* 반복 — 매주 둘 · 매일 다섯 (매일 할 수 있는 의뢰 3개 이상: 튜토리얼 뒤 고철 · 무사 귀환 → 모루 손풀기 → 느루 국거리 → 5장 반환 상자) */
  { id: 'q112', giver: 'pasu', kind: 'repeat', ch: 6, repeat: true, name: '주간 반환', txt: '금 나침반 1개 납품 (주인에게 반환 · 매주)', req: { end: 1 }, goal: { t: 'deliver', item: 'compass', n: 1 }, reward: { glass: 2, rebuild: 1 }, tip: '금고 · 보스 잔해에서' },
  { id: 'q113', giver: 'gombang', kind: 'repeat', ch: 6, repeat: true, name: '주간 대수문 고철', txt: '대수문 볼트 2개 납품 (매주)', req: { beat: 'b_final' }, goal: { t: 'deliver', item: 'gbolt', n: 2 }, reward: { shells: 100, wire: 4 }, tip: '대수문 꼭대기 계단 보관함' },
  { id: 'q114', giver: 'gombang', kind: 'repeat', ch: 1, repeat: 'day', name: '오늘의 고철', txt: '녹슨 통조림 3개 납품 (매일)', req: {}, goal: { t: 'deliver', item: 'can', n: 3 }, reward: { bolt: 3, shells: 12 }, tip: '나무 상자 · 기름통에 흔해요' },
  { id: 'q115', giver: 'neuru', kind: 'repeat', ch: 1, repeat: 'day', name: '오늘의 국거리', txt: '해초 다발 2개 납품 (매일)', req: { q: 'q5' }, goal: { t: 'deliver', item: 'kelp', n: 2 }, reward: { herb: 3 }, tip: '나무 상자 · 기름통' },
  { id: 'q116', giver: 'gombang', kind: 'repeat', ch: 1, repeat: 'day', name: '오늘도 무사히', txt: '아무 지도에서나 탈출하기 (매일)', req: {}, goal: { t: 'extract' }, reward: { bandage: 1 }, tip: '돌아오는 게 제일 중요해요' },
  { id: 'q118', giver: 'moru', kind: 'repeat', ch: 1, repeat: 'day', name: '오늘의 손풀기', txt: '아무 지도 구역 2까지 갔다 탈출 (매일)', req: { beat: 'b_moru' }, goal: { t: 'zone', zone: 2 }, reward: { glass: 1 }, tip: '처음 보는 낙서가 있으면 지나가며 읽어요' },
  { id: 'q117', giver: 'pasu', kind: 'repeat', ch: 5, repeat: 'day', name: '오늘의 반환 상자', txt: '조개 300 내기 (반환 상자 운송비 · 매일)', req: { beat: 'b_pasu' }, goal: { t: 'pay', n: 300 }, reward: { glass: 1, rebuild: 1 }, tip: '조개 쓰는 곳 — 엔딩 뒤 은포 되살리기 +1' },
];
/* 의뢰 120 = 본 사슬 28 + 판 의뢰 92 (v0.6 32 + v0.7 30 + v0.8 M5-A 30) */
export const QALL = [...QUESTS, ...BOARD];
export const QBY = Object.fromEntries(QALL.map(q => [q.id, q]));
/* 가라앉은 공장 지도를 여는 의뢰 — 끝내면 MAPS.factory.unlock(M3-B 'map_factory')을 done 에 넣음 (board.js) */
export const FACTORY_UNLOCK = 'q57';
/* 심해 연구소 지도를 여는 의뢰 (v0.7 · 4장 끝) — 끝내면 MAPS.lab.unlock(M4-B 'map_lab')을 done 에 */
export const LAB_UNLOCK = 'q61';

/* ───── 이야기 물건 (cat memo · M3-C) — 열린 이야기 걸음 · 판 의뢰가 그 지도 · 구역 상자 하나에 넣음 · 들고 나오면 창고 대신 기억 도감 ───── */
export const STORY_ITEMS = {
  bluebox:   { name: '파란 상자',     cat: 'memo', w: 1, h: 1, wt: 0.6, val: 1, model: 'chest',  color: '#4a7fb5', desc: '고양이 그림이 붙어 있다.' },
  festlamp:  { name: '축제 등롱',     cat: 'memo', w: 1, h: 1, wt: 0.4, val: 1, model: 'orb',    color: '#ff8a5a', desc: '크레인 조종석에 걸려 있던 등롱.' },
  signpiece: { name: '간판 조각',     cat: 'memo', w: 2, h: 1, wt: 0.8, val: 1, model: 'rug',    color: '#3d6fb0', desc: '파란 바탕에 흰 글씨 "곰방 상".' },
  drawing:   { name: '젖은 도면',     cat: 'memo', w: 1, h: 1, wt: 0.2, val: 1, model: 'book',   color: '#9fb8c9', desc: '수리공사 도장이 찍힌 도면.' },
  recipe:    { name: '레시피 반쪽',   cat: 'memo', w: 1, h: 1, wt: 0.1, val: 1, model: 'ticket', color: '#f0e2c0', desc: '찢어진 국 레시피 위쪽 반.' },
  dutylog:   { name: '역무원 근무표', cat: 'memo', w: 1, h: 1, wt: 0.2, val: 1, model: 'book',   color: '#c9b07a', desc: '마지막 열차 날의 근무표.' },
  yarn:      { name: '털실 뭉치',     cat: 'memo', w: 1, h: 1, wt: 0.2, val: 1, model: 'orbS',   color: '#e8d6b0', desc: '크림색 털실. 몽이 목도리와 같은 색.' },
  /* v0.7 (M4-C) 4장 공장 · 5장 연구소 (연구소 이야기 물건 4 — coralnote · noeulrec · holdlist · labcard — 는 M4-B data/map_lab.js) */
  lunchtin:  { name: '찌그러진 도시락 통', cat: 'memo', w: 1, h: 1, wt: 0.4, val: 1, model: 'can_a', color: '#b9c2c8', desc: '뚜껑에 이름 일곱이 긁혀 있다.' },
  crewlist:  { name: '공방 출근부',   cat: 'memo', w: 1, h: 1, wt: 0.2, val: 1, model: 'book',   color: '#c9a36a', desc: '축제 날 출근 칸이 다 차 있다.' },
  yeoulnote: { name: '여울의 쪽지',   cat: 'memo', w: 1, h: 1, wt: 0.1, val: 1, model: 'ticket', color: '#d8d0c0', desc: '삐뚤빼뚤한 글씨. 바람에게.' },
  mug:       { name: '연구소 머그',   cat: 'memo', w: 1, h: 1, wt: 0.3, val: 1, model: 'can_b',  color: '#f0a060', desc: '손잡이에 국 주문 쪽지가 감겨 있다.' },
};
