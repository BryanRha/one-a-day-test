// 수달 인양단 — 업적 50 (M3-A 20 → M5-B 50 · v0.8) — 은신처 · 판 결과에서 확인(ach.js achTick) · 보상: 조개 · 꾸미기 · 칭호 (능력치 0)
//  t: 기록 종류 (ach.js achValue 가 S 에서 셈) · n: 목표 · cat: 분류(아래 ACH_CATS) · hidden: 숨은 업적(이루기 전엔 '???')
//  id 는 저장(S.ach)과 꾸미기 얻는 길(look.js get:{t:'ach'})이 씀 → 옛 20개 id 는 바꾸지 않음
//  reward.cos: 꾸미기 키 — 모델이 아직 없으면(COS 에 없음) 받아 두었다가 생기는 날 옷장에 (S.cosPend · M5-D 와 키 맞춤, data/m5b.js M5B_COS)
//  reward.title: 칭호 키 (data/m5b.js TITLES)
export const ACH_CATS = { fight: { name: '전투', icon: '⚔' }, explore: { name: '탐색', icon: '🧭' }, collect: { name: '수집', icon: '📦' }, story: { name: '이야기', icon: '📖' }, chal: { name: '도전', icon: '🏅' }, hidden: { name: '숨은', icon: '❔' } };
export const ACH_CAT_KEYS = Object.keys(ACH_CATS);
export const ACHIEVEMENTS = [
  /* ── 전투 10 ── */
  { id: 'a_kill50',  cat: 'fight', name: '손에 익음',       txt: '적 50마리',                      t: 'kills', n: 50,      reward: { shells: 150 } },
  { id: 'a_kill300', cat: 'fight', name: '인양단 사수',     txt: '적 300마리',                     t: 'kills', n: 300,     reward: { shells: 500, cos: 's_ember' } },
  { id: 'a_kill1000',cat: 'fight', name: '바다의 사냥꾼',   txt: '적 1,000마리',                   t: 'kills', n: 1000,    reward: { shells: 600, title: 't_hunter' } },
  { id: 'a_boss1',   cat: 'fight', name: '첫 보스',         txt: '보스 처음 쓰러뜨리기',           t: 'bosses', n: 1,      reward: { shells: 150 } },
  { id: 'a_boss3',   cat: 'fight', name: '세 바다의 주인',  txt: '세 지도 보스를 모두',            t: 'bossKinds', n: 3,   reward: { shells: 400, cos: 'l_teal' } },
  { id: 'a_bossAll', cat: 'fight', name: '다섯 바다의 주인', txt: '다섯 지도 보스를 모두',         t: 'mapBosses', n: 5,   reward: { shells: 400, title: 't_five' } },
  { id: 'a_boss20',  cat: 'fight', name: '보스 사냥꾼',     txt: '보스 20번 쓰러뜨리기',           t: 'bosses', n: 20,     reward: { shells: 300 } },
  { id: 'a_chief',   cat: 'fight', name: '닻을 꺾다',       txt: '검은 닻 두목 쓰러뜨리기',        t: 'chiefDown', n: 1,   reward: { shells: 300, title: 't_anchor' } },
  { id: 'a_infight', cat: 'fight', name: '어부지리',        txt: '적끼리 싸우다 쓰러진 적 20',     t: 'infight', n: 20,    reward: { shells: 150 } },
  { id: 'a_abyssK',  cat: 'fight', name: '심연을 베다',     txt: '깊은 물 변형 적 30',             t: 'abyssKills', n: 30, reward: { shells: 500, cos: 'ac_s_abyss' } },
  /* ── 탐색 9 ── */
  { id: 'a_first',   cat: 'explore', name: '첫 인양',       txt: '처음으로 살아 나오기',           t: 'extracts', n: 1,    reward: { shells: 50 } },
  { id: 'a_ext25',   cat: 'explore', name: '단골 출구',     txt: '탈출 25번',                      t: 'extracts', n: 25,   reward: { shells: 200 } },
  { id: 'a_ext100',  cat: 'explore', name: '물길 지도',     txt: '탈출 100번',                     t: 'extracts', n: 100,  reward: { shells: 600, cos: 'b_navy' } },
  { id: 'a_ext300',  cat: 'explore', name: '물길의 전설',   txt: '탈출 300번',                     t: 'extracts', n: 300,  reward: { shells: 800, title: 't_legend' } },
  { id: 'a_vault5',  cat: 'explore', name: '금고실 단골',   txt: '금고실 털고 탈출 5번',           t: 'vaults', n: 5,      reward: { shells: 300 } },
  { id: 'a_maps5',   cat: 'explore', name: '다섯 물길',     txt: '다섯 지도에서 모두 탈출',        t: 'mapsExt', n: 5,     reward: { shells: 300, title: 't_pilot' } },
  { id: 'a_wx5',     cat: 'explore', name: '어떤 날씨에도', txt: '밤 · 폭풍 · 안개 · 한파 · 독수에서 각각 탈출', t: 'wxExt', n: 5, reward: { shells: 300, title: 't_weather' } },
  { id: 'a_power30', cat: 'explore', name: '불 켜는 수달',  txt: '발전기 켜고 탈출 30번',          t: 'powerExt', n: 30,   reward: { shells: 200 } },
  { id: 'a_deep50',  cat: 'explore', name: '깊은 구역 단골', txt: '가장 깊은 구역에 50번',         t: 'zone3', n: 50,      reward: { shells: 250 } },
  /* ── 수집 11 ── */
  { id: 'a_best500', cat: 'collect', name: '대박 인양',     txt: '한 판 가치 500',                 t: 'best', n: 500,      reward: { shells: 200 } },
  { id: 'a_best1500',cat: 'collect', name: '전설의 가방',   txt: '한 판 가치 1500',                t: 'best', n: 1500,     reward: { shells: 600, cos: 'fur_gold' } },
  { id: 'a_daily10', cat: 'collect', name: '곰방의 단골',   txt: '오늘의 인양 납품 10번',          t: 'daily', n: 10,      reward: { shells: 200 } },
  { id: 'a_fac20',   cat: 'collect', name: '초소 살림',     txt: '시설 20단계',                    t: 'fac', n: 20,        reward: { shells: 300 } },
  { id: 'a_facAll',  cat: 'collect', name: '불 켜진 초소',  txt: '시설 42단계 모두',               t: 'fac', n: 42,        reward: { shells: 1500, cos: 'l_gold', title: 't_keeper' } },
  { id: 'a_gun5',    cat: 'collect', name: '무기대 가득',   txt: '무기 5정',                       t: 'weapons', n: 5,     reward: { shells: 300 } },
  { id: 'a_gun10',   cat: 'collect', name: '열 자루',       txt: '무기 10정',                      t: 'weapons', n: 10,    reward: { shells: 1000, cos: 's_night' } },
  { id: 'a_mk3',     cat: 'collect', name: '정밀 손질',     txt: '한 무기 개조 다섯 칸 모두 Mk3',  t: 'fullMods', n: 1,    reward: { shells: 400 } },
  { id: 'a_gear5',   cat: 'collect', name: '바다의 갑옷',   txt: '장비 하나를 5단까지',            t: 'gear5', n: 1,       reward: { shells: 500 } },
  { id: 'a_charm',   cat: 'collect', name: '기억을 몸에',   txt: '부적 4개 만들기',                t: 'charms', n: 4,      reward: { shells: 300, cos: 'pat_spots' } },
  { id: 'a_trade',   cat: 'collect', name: '세 상인의 손님', txt: '세 상인과 모두 거래',           t: 'traders', n: 3,     reward: { shells: 250 } },
  /* ── 이야기 8 ── (걸음 id = story.js BEATS · 엔딩 = abyss.js endingSeen) */
  { id: 'a_ch1',     cat: 'story', name: '맡겨 둔 짐',      txt: '1장 끝까지',                     t: 'beat', id2: 'b_ch1end', n: 1, reward: { shells: 100 } },
  { id: 'a_ch2',     cat: 'story', name: '마지막 배',       txt: '2장 끝까지',                     t: 'beat', id2: 'b_ch2end', n: 1, reward: { shells: 150 } },
  { id: 'a_ch3',     cat: 'story', name: '멈춘 열차',       txt: '3장 끝까지',                     t: 'beat', id2: 'b_ch3end', n: 1, reward: { shells: 150 } },
  { id: 'a_ch4',     cat: 'story', name: '불을 만든 곳',    txt: '4장 끝까지',                     t: 'beat', id2: 'b_ch4end', n: 1, reward: { shells: 200 } },
  { id: 'a_ch5',     cat: 'story', name: '파수의 목소리',   txt: '5장 끝까지',                     t: 'beat', id2: 'b_ch5end', n: 1, reward: { shells: 250, title: 't_listener' } },
  { id: 'a_ending',  cat: 'story', name: '대수문 너머',     txt: '엔딩 보기',                      t: 'ending', n: 1,      reward: { shells: 600, cos: 'ac_h_crown', title: 't_gate' } },
  { id: 'a_codex60', cat: 'story', name: '기억의 서랍',     txt: '기억 도감 60칸',                 t: 'codex', n: 60,      reward: { shells: 200 } },
  { id: 'a_tapes',   cat: 'story', name: '노을의 목소리',   txt: '녹음기 12개 듣기',               t: 'tapes', n: 12,      reward: { shells: 300, title: 't_seori' } },
  /* ── 도전 7 ── (주간 도전 · 깊은 물 · '깊게' 난이도) */
  { id: 'a_deep',    cat: 'chal', name: '깊게 잠수',        txt: '\'깊게\' 난이도로 탈출 10번',    t: 'deep', n: 10,       reward: { shells: 500, cos: 'h_kelp' } },
  { id: 'a_chal1',   cat: 'chal', name: '첫 도전',          txt: '주간 도전 한 판',                t: 'chalRuns', n: 1,    reward: { shells: 50 } },
  { id: 'a_chalS',   cat: 'chal', name: '은빛 물결',        txt: '주간 도전 은메달',               t: 'chalBest', n: 2,    reward: { shells: 150, title: 't_silver' } },
  { id: 'a_chalG',   cat: 'chal', name: '금빛 물결',        txt: '주간 도전 금메달',               t: 'chalBest', n: 3,    reward: { shells: 300, title: 't_gold' } },
  { id: 'a_chalW8',  cat: 'chal', name: '꾸준한 도전자',    txt: '주간 도전 8주 참가',             t: 'chalWeeks', n: 8,   reward: { shells: 400, cos: 'ch_pet_badge' } },
  { id: 'a_abyss5',  cat: 'chal', name: '심연 5',           txt: '깊은 물 심연 5에서 탈출',        t: 'abyssBest', n: 5,   reward: { shells: 600, cos: 'ac_l_abyss' } },
  { id: 'a_abyss15', cat: 'chal', name: '심연 15',          txt: '깊은 물 심연 15에서 탈출',       t: 'abyssBest', n: 15,  reward: { shells: 1500, cos: 'ac_b_abyss', title: 't_abyss' } },
  /* ── 숨은 5 ── (이루기 전엔 이름 · 조건이 '???' — 힌트 한 줄만) */
  { id: 'h_naked',   cat: 'hidden', hidden: true, name: '맨몸 인양',   txt: '방어구 · 헬멧 없이 권총 하나로 가치 300 탈출', hint: '가볍게, 아주 가볍게', t: 'naked', n: 1,   reward: { shells: 200, title: 't_bare' } },
  { id: 'h_close',   cat: 'hidden', hidden: true, name: '아슬아슬',    txt: '체력 10% 아래로 탈출',          hint: '숨이 턱까지',           t: 'closeCall', n: 1, reward: { shells: 150 } },
  { id: 'h_last',    cat: 'hidden', hidden: true, name: '마지막 순간', txt: '물이 차기 10초 전에 탈출',      hint: '시계를 끝까지 본 사람', t: 'lastSec', n: 1,   reward: { shells: 200, cos: 'ac_fur_moon' } },
  { id: 'h_rich',    cat: 'hidden', hidden: true, name: '조개 부자',   txt: '조개 10,000개를 한 번에',        hint: '곰방이 부러워할 만큼',   t: 'rich', n: 10000,  reward: { title: 't_rich' } },
  { id: 'h_mongi',   cat: 'hidden', hidden: true, name: '몽이랑 둘이', txt: '몽이 주머니를 가득 채워 탈출',   hint: '작은 친구도 한몫',       t: 'petFull', n: 1,   reward: { shells: 150, title: 't_mongi' } },
];
export const ACH_KEYS = ACHIEVEMENTS.map(a => a.id);
