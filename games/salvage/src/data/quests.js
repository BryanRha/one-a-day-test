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
];
/* 의뢰 60 = 본 사슬 28 + 판 의뢰 32 */
export const QALL = [...QUESTS, ...BOARD];
export const QBY = Object.fromEntries(QALL.map(q => [q.id, q]));
/* 가라앉은 공장 지도를 여는 의뢰 — 끝내면 MAPS.factory.unlock(M3-B 'map_factory')을 done 에 넣음 (board.js) */
export const FACTORY_UNLOCK = 'q57';

/* ───── 이야기 물건 (cat memo · M3-C) — 열린 이야기 걸음 · 판 의뢰가 그 지도 · 구역 상자 하나에 넣음 · 들고 나오면 창고 대신 기억 도감 ───── */
export const STORY_ITEMS = {
  bluebox:   { name: '파란 상자',     cat: 'memo', w: 1, h: 1, wt: 0.6, val: 1, model: 'chest',  color: '#4a7fb5', desc: '고양이 그림이 붙어 있다.' },
  festlamp:  { name: '축제 등롱',     cat: 'memo', w: 1, h: 1, wt: 0.4, val: 1, model: 'orb',    color: '#ff8a5a', desc: '크레인 조종석에 걸려 있던 등롱.' },
  signpiece: { name: '간판 조각',     cat: 'memo', w: 2, h: 1, wt: 0.8, val: 1, model: 'rug',    color: '#3d6fb0', desc: '파란 바탕에 흰 글씨 "곰방 상".' },
  drawing:   { name: '젖은 도면',     cat: 'memo', w: 1, h: 1, wt: 0.2, val: 1, model: 'book',   color: '#9fb8c9', desc: '수리공사 도장이 찍힌 도면.' },
  recipe:    { name: '레시피 반쪽',   cat: 'memo', w: 1, h: 1, wt: 0.1, val: 1, model: 'ticket', color: '#f0e2c0', desc: '찢어진 국 레시피 위쪽 반.' },
  dutylog:   { name: '역무원 근무표', cat: 'memo', w: 1, h: 1, wt: 0.2, val: 1, model: 'book',   color: '#c9b07a', desc: '마지막 열차 날의 근무표.' },
  yarn:      { name: '털실 뭉치',     cat: 'memo', w: 1, h: 1, wt: 0.2, val: 1, model: 'orbS',   color: '#e8d6b0', desc: '크림색 털실. 몽이 목도리와 같은 색.' },
};
