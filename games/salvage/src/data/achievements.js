// 수달 인양단 — 업적 20 (M3-A · v0.6) — 은신처에 들어올 때 확인(econ.achTick) · 보상: 조개 + 칭호 · 몇 개는 꾸미기
//  t: 기록 종류 (econ.achValue 가 S 에서 셈) · n: 목표
export const ACHIEVEMENTS = [
  { id: 'a_first',   name: '첫 인양',        txt: '처음으로 살아 나오기',          t: 'extracts', n: 1,   reward: { shells: 50 } },
  { id: 'a_ext25',   name: '단골 출구',      txt: '탈출 25번',                    t: 'extracts', n: 25,  reward: { shells: 200 } },
  { id: 'a_ext100',  name: '물길 지도',      txt: '탈출 100번',                   t: 'extracts', n: 100, reward: { shells: 600, cos: 'b_navy' } },
  { id: 'a_kill50',  name: '손에 익음',      txt: '적 50마리',                    t: 'kills', n: 50,    reward: { shells: 150 } },
  { id: 'a_kill300', name: '인양단 사수',    txt: '적 300마리',                   t: 'kills', n: 300,   reward: { shells: 500, cos: 's_ember' } },
  { id: 'a_boss1',   name: '첫 보스',        txt: '보스 처음 쓰러뜨리기',          t: 'bosses', n: 1,    reward: { shells: 150 } },
  { id: 'a_boss3',   name: '세 바다의 주인', txt: '세 지도 보스를 모두',           t: 'bossKinds', n: 3, reward: { shells: 400, cos: 'l_teal' } },
  { id: 'a_vault5',  name: '금고실 단골',    txt: '금고실 털고 탈출 5번',          t: 'vaults', n: 5,    reward: { shells: 300 } },
  { id: 'a_best500', name: '대박 인양',      txt: '한 판 가치 500',               t: 'best', n: 500,    reward: { shells: 200 } },
  { id: 'a_best1500',name: '전설의 가방',    txt: '한 판 가치 1500',              t: 'best', n: 1500,   reward: { shells: 600, cos: 'fur_gold' } },
  { id: 'a_daily10', name: '곰방의 단골',    txt: '오늘의 인양 납품 10번',         t: 'daily', n: 10,    reward: { shells: 200 } },
  { id: 'a_fac20',   name: '초소 살림',      txt: '시설 20단계',                  t: 'fac', n: 20,      reward: { shells: 300 } },
  { id: 'a_facAll',  name: '불 켜진 초소',   txt: '시설 42단계 모두',              t: 'fac', n: 42,      reward: { shells: 1500, cos: 'l_gold' } },
  { id: 'a_gun5',    name: '무기대 가득',    txt: '무기 5정',                     t: 'weapons', n: 5,   reward: { shells: 300 } },
  { id: 'a_gun10',   name: '열 자루',        txt: '무기 10정 모두',               t: 'weapons', n: 10,  reward: { shells: 1000, cos: 's_night' } },
  { id: 'a_mk3',     name: '정밀 손질',      txt: '한 무기 개조 다섯 칸 모두 Mk3', t: 'fullMods', n: 1,  reward: { shells: 400 } },
  { id: 'a_gear5',   name: '바다의 갑옷',    txt: '장비 하나를 5단까지',           t: 'gear5', n: 1,     reward: { shells: 500 } },
  { id: 'a_charm',   name: '기억을 몸에',    txt: '부적 4개 만들기',              t: 'charms', n: 4,    reward: { shells: 300, cos: 'pat_spots' } },
  { id: 'a_trade',   name: '세 상인의 손님', txt: '세 상인과 모두 거래',           t: 'traders', n: 3,   reward: { shells: 250 } },
  { id: 'a_deep',    name: '깊은 물',        txt: '\'깊게\' 난이도로 탈출 10번',   t: 'deep', n: 10,     reward: { shells: 500, cos: 'h_kelp' } },
];
export const ACH_KEYS = ACHIEVEMENTS.map(a => a.id);
