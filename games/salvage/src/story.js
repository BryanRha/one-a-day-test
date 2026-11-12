// 이야기 규칙 (docs/NARRATIVE.md) — 진행 · 하루 한 걸음 · 인물 합류(창에 불) · 관계 · 기억 도감 · 세 등불 · 열쇠 기억
//  three · DOM 없음 → node 시험(tools/test_logic.mjs)에서도 씀. 대사 글은 talk/*.js (나눠 받음 · story_ui.js 가 불러옴)
import { ITEMS, MAPS, FACILITIES } from './data.js?v=0.99.34';
import { LAST_PIECES } from './data/map_gate.js?v=0.99.34'; /* M5-A 6장 마지막 인양 다섯 */

/* ───── 인물 6 (창 여섯 = 이 순서) · 말하는 이 ───── */
export const CAST = {
  gombang: { name: '곰방', role: '고물상', animal: '너구리', color: '#c99a5a' },
  moru:    { name: '모루', role: '기술자', animal: '비버',   color: '#a8784e' },
  neuru:   { name: '느루', role: '요리사', animal: '카피바라', color: '#d9a66a' },
  haedam:  { name: '해담', role: '의무관', animal: '바다거북', color: '#7fb48a' },
  seori:   { name: '서리', role: '기록관', animal: '물범',   color: '#8fb3d9' },
  baram:   { name: '바람', role: '떠돌이', animal: '족제비', color: '#9a8fb5' },
};
export const CAST_KEYS = Object.keys(CAST);
export const SPEAK = { ...CAST, nole: { name: '노을', role: '목소리', color: '#ffb44a' }, pasu: { name: '파수', role: '목소리', color: '#6fe0d8' }, mongi: { name: '몽이', role: '', color: '#8a6a4c' }, bandi: { name: '반디', role: '빛 해마', color: '#9ff0d8' }, /* M5-C 두 번째 반려 (5장 b_tank 뒤 · S.pets.bandi) */ anchor: { name: '검은 닻', role: '낯선 무전', color: '#8a8f99' }, me: { name: '', role: '' } };
/* 대사 원고의 짧은 이름 */
export const ALIAS = { g: 'gombang', m: 'moru', n: 'neuru', h: 'haedam', s: 'seori', b: 'baram', o: 'nole', p: 'pasu', y: 'mongi', k: 'anchor', d: 'bandi' };

/* ───── 세 등불 (엔딩 게이지 — 숫자 없이 은신처 벽 등불 밝기로만) ───── */
export const SIDES = { land: { name: '땅', txt: '되찾기', color: '#e0a060' }, lamp: { name: '등불', txt: '함께 살기', color: '#ffc861' }, sea: { name: '바다', txt: '돌려보내기', color: '#6fe0d8' } };
export const SIDE_OF = { gombang: 'land', moru: 'land', neuru: 'lamp', haedam: 'lamp', seori: 'sea', baram: 'sea', box: 'sea' };
export const LAMP_FULL = 20; /* 이 값이면 가장 밝음 (1~6장 최대: 열쇠 기억 12 × 2 + 장 끝 선택 5 + 인물 1~2 — 한 쪽에 다 모아도 20 언저리 · M5-A 16 → 20) */
/* 엔딩 분기 (docs/NARRATIVE.md 3-7) — 6장 끝에서 이 문턱을 넘은 등불의 엔딩이 모두 선택지로 (숨은 실패 엔딩 없음 · 가장 밝은 것이 맨 위)
 *  1~5장에서 쌓이는 것: 열쇠 기억 10(맡긴 사람 쪽 +2) · 장 끝 선택(1 · 2 · 4 · 5장 +1, 3장은 관계만) · 곰방 장부 고백(+1) */
export const ENDING_GATE = 4;
export const ENDINGS = { land: { name: '닫힌 수문', txt: '물을 빼고 은포를 돌려받는다', pasu: '파수는 쉰다', say: '물을 빼. 은포를 돌려받자.' }, lamp: { name: '물 위의 등불', txt: '잠긴 도시 위에 등불 마을을 띄운다', pasu: '파수는 등대를 맡는다', say: '문은 열어 둬. 파수, 등대를 맡아 줘.' }, sea: { name: '기억의 바다', txt: '맡긴 물건을 모두 주인에게 돌려보낸다', pasu: '파수와 함께 돌려준다', say: '412,880점, 전부 주인에게 돌려줘.' } };
export function endingsOpen(S) { const g = S.story.gauge; return Object.keys(ENDINGS).filter(k => (g[k] || 0) >= ENDING_GATE).sort((a, b) => (g[b] || 0) - (g[a] || 0)); }
/* M5-A 엔딩 고르기: 문턱(4)을 넘은 등불의 엔딩이 모두 선택지 (가장 밝은 것이 맨 위 · 추천) — 하나도 없으면 가장 밝은 등불 하나(그것도 없으면 등불) · 숨은 실패 엔딩 없음 */
export function endingChoices(S) { const o = endingsOpen(S); if (o.length) return o; return [brightest(S) || 'lamp']; }
/* 엔딩을 본 순간 (story_ui 엔딩 장면 끝) — S.story.ending = 지금 고른 길(은신처 꾸밈 · 후일담) · ended = 처음 본 날 · endings = 본 길들 · flags.ending (M5-B 깊은 물 훅: abyss.endingSeen 이 이것들을 봄) */
export function setEnding(S, k, today) { const st = S.story; if (!ENDINGS[k]) return false; st.ending = k; st.ended ||= today; st.endings[k] ||= today; st.flags.ending = 1; return true; }
export const ENDING_LAST = '불이 켜진 곳이 있으면, 거기가 누군가 돌아온 곳이다.';
export const brightest = S => { const g = S.story.gauge; const k = Object.keys(SIDES).sort((a, b) => (g[b] || 0) - (g[a] || 0))[0]; return (g[k] || 0) > 0 ? k : null; };

/* ───── 열쇠 기억 12 (장마다 2) · 맡길 수 있는 사람(box = 도감 상자 → 서리 몫, 바다) — M5-A 6장 둘(파수의 첫 기록 · 곰방 상회 간판) ───── */
export const KEYMEM = {
  k_tags:    { name: '수문지기 이름표 묶음', ch: 1, to: ['gombang', 'neuru', 'box'] },
  k_nole:    { name: '노을의 짐표',         ch: 1, to: ['moru', 'neuru', 'box'] },
  k_glove:   { name: '등대지기의 장갑',      ch: 2, to: ['moru', 'haedam', 'box'] },
  k_ticket:  { name: '마지막 배표',          ch: 2, to: ['gombang', 'haedam', 'box'] },
  k_basket:  { name: '빈 열차 분실물 바구니', ch: 3, to: ['gombang', 'neuru', 'seori'] },
  k_badge:   { name: '노을의 수색대 배지',    ch: 3, to: ['moru', 'haedam', 'seori'] },
  /* v0.7 (M4-C) 4 · 5장 */
  k_lantern: { name: '미완성 랜턴',          ch: 4, to: ['moru', 'neuru', 'seori'] },
  k_pencil:  { name: '모루의 설계 연필',      ch: 4, to: ['moru', 'neuru', 'seori'] },
  k_coral:   { name: '산호 수조 열쇠',        ch: 5, to: ['moru', 'haedam', 'baram'] },
  k_voice:   { name: '노을의 녹음기',         ch: 5, to: ['gombang', 'neuru', 'seori'] },
  /* M5-A 6장 */
  k_first:   { name: '파수의 첫 기록',        ch: 6, to: ['moru', 'haedam', 'seori'] },
  k_sign:    { name: '곰방 상회 간판',        ch: 6, to: ['gombang', 'neuru', 'baram'] },
};
export const KEY_TOTAL = 12;

/* ───── 장 ───── */
export const CHAPTERS = { 1: { name: '맡겨 둔 짐', map: 'ware' }, 2: { name: '마지막 배', map: 'harbor' }, 3: { name: '멈춘 열차', map: 'tunnel' }, 4: { name: '불을 만든 곳', map: 'factory' }, 5: { name: '파수의 목소리', map: 'lab' }, 6: { name: '대수문', map: 'gate' } };

/* ───── 이야기 걸음 (하루 한 걸음) ─────
 *  need.q: 그 의뢰(본 사슬 q1~q28)를 끝내야 열림 · nextDay: 앞 걸음을 끝낸 다음 날부터 · join: 열릴 때 은신처에 들어옴(창에 불)
 *  goal: carry(그 지도 · 구역 상자에서 이야기 물건 들고 탈출) · power · zone · extract · quest(본 사슬 의뢰가 끝나 있으면 바로) · 없음(장면만)
 *  cut: 장 끝 컷신(assets/story/cut_<장>_<n>.webp — 아트 세션 · 없으면 색 배경) · title: 장 제목 카드 */
export const BEATS = [
  /* 1장 「맡겨 둔 짐」 — 침수 창고 (1~8일) */
  { id: 'b_tut',    ch: 1, tut: true, name: '첫 인양' },
  { id: 'b_moru',   ch: 1, giver: 'gombang', name: '이름표 셋', join: 'moru', goal: { t: 'carry', item: 'tagbundle', map: 'ware', zone: 2 }, txt: '깊은 창고에서 이름표 묶음을 들고 탈출', reward: { shells: 80, bolt: 4 } },
  { id: 'b_power',  ch: 1, giver: 'moru', name: '정직한 기계', goal: { t: 'power', map: 'ware' }, txt: '침수 창고 발전기를 켜고 탈출', reward: { wire: 4, glass: 1 } },
  { id: 'b_bluebox',ch: 1, giver: 'gombang', name: '파란 상자', need: { q: 'q3' }, goal: { t: 'carry', item: 'bluebox', map: 'ware', zone: 2 }, txt: '깊은 창고에서 고양이 그림 붙은 파란 상자를 들고 탈출', reward: { shells: 70, cloth: 3 } },
  { id: 'b_neuru',  ch: 1, giver: 'neuru', name: '국거리', need: { q: 'q5' }, join: 'neuru' },
  { id: 'b_door',   ch: 1, giver: 'neuru', name: '기관실 문 앞', need: { q: 'q4' }, goal: { t: 'zone', map: 'ware', zone: 3 }, txt: '기관실 구역에 들어갔다 탈출', reward: { herb: 4, shells: 60 } },
  { id: 'b_gate',   ch: 1, giver: 'moru', name: '멈추게 해', need: { q: 'q7' }, goal: { t: 'quest', q: 'q8' }, txt: '수문지기 멈추기 (의뢰 8)' },
  { id: 'b_ch1end', ch: 1, name: '1장의 끝', nextDay: true, cut: ['cut_1_1', 'cut_1_2'] },
  /* 2장 「마지막 배」 — 밤의 항구 (9~15일) */
  { id: 'b_ch2',    ch: 2, giver: 'moru', name: '마지막 배', need: { q: 'q11' }, title: 2, goal: { t: 'extract', map: 'harbor' }, txt: '밤의 항구에서 살아 나오기', reward: { shells: 60 } },
  { id: 'b_haedam', ch: 2, giver: 'haedam', name: '배표 꾸러미', join: 'haedam', goal: { t: 'carry', item: 'ferrytix', map: 'harbor', zone: 1 }, txt: '부두에서 배표 꾸러미를 들고 탈출', reward: { bandage: 2, cloth: 6 } },
  { id: 'b_festival', ch: 2, giver: 'neuru', name: '크레인의 등롱', need: { q: 'q12' }, goal: { t: 'carry', item: 'festlamp', map: 'harbor', zone: 2 }, txt: '야적장 크레인에서 축제 등롱을 들고 탈출', reward: { shells: 90, glass: 2 } },
  { id: 'b_ledger', ch: 2, giver: 'gombang', name: '곰방 상회 장부', goal: { t: 'carry', item: 'ledger', map: 'harbor', zone: 2 }, txt: '야적장에서 낡은 장부를 들고 탈출', reward: { shells: 200 } },
  { id: 'b_stairs', ch: 2, giver: 'haedam', name: '부두 계단', need: { q: 'q14' }, goal: { t: 'zone', map: 'harbor', zone: 3 }, txt: '등대 · 크레인 구역에 들어갔다 탈출', reward: { bandage: 1, shells: 80 } },
  { id: 'b_light',  ch: 2, giver: 'haedam', name: '꺼진 등대', goal: { t: 'quest', q: 'q17' }, txt: '갈고리 선장 쓰러뜨리기 (의뢰 17)' },
  { id: 'b_ch2end', ch: 2, name: '2장의 끝', nextDay: true, cut: ['cut_2_1', 'cut_2_2'] },
  /* 3장 「멈춘 열차」 — 해저 터널 (16~22일) */
  { id: 'b_ch3',    ch: 3, giver: 'seori', name: '멈춘 열차', need: { q: 'q19' }, title: 3, join: 'seori', goal: { t: 'carry', item: 'roster', map: 'tunnel', zone: 1 }, txt: '역 승강장에서 승객 명부를 들고 탈출', reward: { shells: 150, herb: 6 } },
  { id: 'b_duty',   ch: 3, giver: 'seori', name: '역무원의 근무표', need: { q: 'q20' }, goal: { t: 'carry', item: 'dutylog', map: 'tunnel', zone: 2 }, txt: '잠긴 선로에서 역무원 근무표를 들고 탈출', reward: { shells: 120, wire: 4 } },
  { id: 'b_freq',   ch: 3, giver: 'seori', name: '낯선 주파수', goal: { t: 'zone', map: 'tunnel', zone: 3 }, txt: '터널 제어실에 들어갔다 탈출', reward: { lens: 1 } },
  { id: 'b_reply',  ch: 3, giver: 'seori', name: '답신' },
  { id: 'b_boot',   ch: 3, giver: 'neuru', name: '빈 좌석의 장화', goal: { t: 'carry', item: 'lboot', map: 'tunnel', zone: 2 }, txt: '잠긴 선로에서 장화 한 짝을 들고 탈출', reward: { shells: 120, herb: 4 } },
  { id: 'b_eel',    ch: 3, giver: 'moru', name: '두 번째 코어', goal: { t: 'quest', q: 'q25' }, txt: '터널 장어 쓰러뜨리기 (의뢰 25)' },
  { id: 'b_ch3end', ch: 3, name: '3장의 끝', nextDay: true, cut: ['cut_3_1', 'cut_3_2'] },
  /* 4장 「불을 만든 곳」 도입 — 가라앉은 공장 (M3-B 지도 · 23~25일) · 공장 지도는 판 의뢰 q57(3장 끝)이 엶 */
  { id: 'b_ch4',    ch: 4, giver: 'moru', name: '불을 만든 곳', nextDay: true, need: { map: 'factory' }, title: 4, goal: { t: 'extract', map: 'factory' }, txt: '가라앉은 공장에서 살아 나오기', reward: { shells: 150, bolt: 6 } },
  { id: 'b_anchor', ch: 4, giver: 'baram', name: '검은 닻', goal: { t: 'carry', item: 'anchorlog', map: 'factory', zone: 2 }, txt: '용광로 구역 은닉 상자에서 검은 닻 장부를 들고 탈출', reward: { shells: 160, spring: 2 } },
  { id: 'b_baram',  ch: 4, giver: 'baram', name: '떠돌이의 빚', join: 'baram' },
  /* v0.7 (M4-C) 4장 나머지 — 등불 공방 · 쇳물 감독관 · 제어 회로실(반전: 규칙을 쓴 건 모루) · 4장 끝 컷 3 (cut_4_1 · 4_2 · 4_3) */
  { id: 'b_workshop', ch: 4, giver: 'seori', name: '등불 공방', goal: { t: 'quest', q: 'q59' }, txt: '용광로 구역에서 미완성 랜턴을 들고 탈출 (의뢰 59)' },
  { id: 'b_smelter',  ch: 4, giver: 'moru', name: '꺼진 용광로', goal: { t: 'quest', q: 'q60' }, txt: '쇳물 감독관 쓰러뜨리기 (의뢰 60)' },
  { id: 'b_pencil',   ch: 4, giver: 'moru', name: '설계 연필', goal: { t: 'carry', item: 'pencil', map: 'factory', zone: 3 }, txt: '동력 코어실 책상에서 빨간 연필을 들고 탈출', reward: { shells: 200, spring: 3 } },
  { id: 'b_ch4end',   ch: 4, name: '4장의 끝', nextDay: true, cut: ['cut_4_1', 'cut_4_2', 'cut_4_3'] },
  /* 5장 「파수의 목소리」 — 심해 연구소 (M4-B data/map_lab.js · 해금 키 'map_lab' = 판 의뢰 q61 이 4장 끝에 넣음)
   *  반전 둘: 서리의 1년 무전(그 목소리는 파수) · 노을은 3년 버틴 뒤 깊은 물길로 떠났고 살아 있음 — 노을은 끝까지 직접 안 나옴(녹음 · 편지 · 흔적) */
  { id: 'b_ch5',    ch: 5, giver: 'seori', name: '깊은 물길', nextDay: true, need: { map: 'lab' }, title: 5, goal: { t: 'extract', map: 'lab' }, txt: '심해 연구소에서 살아 나오기', reward: { shells: 180, glass: 3 } },
  { id: 'b_tank',   ch: 5, giver: 'seori', name: '조용한 수조', goal: { t: 'zone', map: 'lab', zone: 2 }, txt: '연구소 수조 구역에 들어갔다 탈출', reward: { shells: 160, lens: 1 } },
  { id: 'b_moss',   ch: 5, giver: 'haedam', name: '빛이끼의 시작', goal: { t: 'carry', item: 'coralnote', map: 'lab', zone: 2 }, txt: '수조 구역에서 산호 복원 일지를 들고 탈출', reward: { shells: 180, herb: 6 } },
  { id: 'b_mother', ch: 5, giver: 'baram', name: '청록 어미', goal: { t: 'boss', map: 'lab' }, txt: '심해 연구소 보스 쓰러뜨리기', reward: { core: 2, shells: 300 } },
  { id: 'b_pasu',   ch: 5, giver: 'pasu', name: '412,880', goal: { t: 'carry', item: 'noeulrec', map: 'lab', zone: 3 }, txt: '관제실에서 노을의 녹음기를 들고 탈출', reward: { shells: 250, wire: 6 } },
  { id: 'b_ch5end', ch: 5, name: '5장의 끝', nextDay: true, cut: ['cut_5_2', 'cut_5_3'] },
  /* M5-A 6장 「대수문」 — 걸음 6 (엔딩 = 다섯째 걸음 끝 · 여섯째 = 다음 날 아침 후일담) · 대사 talk/t6.js · ROADMAP 'M5 설계 메모 ①' 게이트 둘:
   *  (a) 셋째 걸음 = 잠수 훈련장 끝 단계(대수문 깊은 물 · 숨) (b) 최종 보스 = 파수 의뢰 2(q95 → q96) · 엔딩 목표 중앙 48~50일(M5-C 뒤 5장 끝 43일 기준 · 총괄 11-10) */
  { id: 'b_ch6',    ch: 6, giver: 'pasu', name: '대수문', title: 6, goal: { t: 'zone', map: 'lab', zone: 2 }, txt: '심해 연구소 수조 구역까지 들어갔다 탈출 (대수문 승강로 좌표 받기)', reward: { shells: 240, wire: 6 } },
  { id: 'b_last',   ch: 6, giver: 'gombang', name: '마지막 인양', goal: { t: 'pieces', n: 5 }, txt: '다섯 지도에서 마지막 조각을 하나씩 들고 탈출 (구역 2 금빛 고리 상자)', reward: { shells: 300, core: 1 } },
  { id: 'b_dive',   ch: 6, giver: 'haedam', name: '깊은 물 채비', goal: { t: 'fac', k: 'gym', lv: 3 }, txt: '잠수 훈련장 끝 단계 짓기 (대수문 깊은 물 · 숨)', reward: { bandage: 3, herb: 6 } },
  { id: 'b_pasu6',  ch: 6, giver: 'pasu', name: '파수의 부탁', goal: { t: 'quest', q: 'q96' }, txt: '파수 의뢰 — 승강로 승인 카드 (의뢰 96 · 조력 전원 연결 95 는 따로)' },
  { id: 'b_final',  ch: 6, giver: 'baram', name: '대수문 꼭대기', opens: 'map_gate', goal: { t: 'boss', map: 'gate' }, txt: '대수문 꼭대기에서 파수 멈추기', reward: { shells: 500 } },
  { id: 'b_after',  ch: 6, name: '그 뒤의 은포', nextDay: true, cut: ['end_last'], last: true },
];
/* 6장 마지막 인양 다섯 (지도 → 조각) · 모은 조각은 flags['pc_' + 조각] */
export { LAST_PIECES };
export const piecesGot = S => Object.values(LAST_PIECES).filter(k => S.story.flags['pc_' + k]);
export const piecesLeft = S => Object.entries(LAST_PIECES).filter(([m, k]) => !S.story.flags['pc_' + k] && MAPS[m]).map(([m]) => m);
export const BEAT_IDX = Object.fromEntries(BEATS.map((b, i) => [b.id, i]));
/* v0.5 저장(걸음 16)의 순서 — 걸음 번호(st.beat)를 새 목록 번호로 옮길 때 (fixStory · bv 2) */
export const BEATS_V1 = ['b_tut', 'b_moru', 'b_power', 'b_neuru', 'b_gate', 'b_ch1end', 'b_ch2', 'b_haedam', 'b_ledger', 'b_light', 'b_ch2end', 'b_ch3', 'b_freq', 'b_boot', 'b_eel', 'b_ch3end'];
export const BEAT_V = 2;
/* 녹음기 (지도마다 3) · 벽 낙서 (지도마다 6) — 글은 talk/memo.js */
export const TAPES = { ware: ['t_w1', 't_w2', 't_w3'], harbor: ['t_h1', 't_h2', 't_h3'], tunnel: ['t_t1', 't_t2', 't_t3'], factory: ['t_f1', 't_f2', 't_f3'], lab: ['t_l1', 't_l2', 't_l3'], gate: ['t_g1', 't_g2', 't_g3'] }; /* v0.8 대수문 꼭대기 (M5-A) */
export const TAPE_NOLE = ['t_w3', 't_h3', 't_t3', 't_f3', 't_l3', 't_g3'];
export const TAPE_N = Object.values(TAPES).flat().length; /* 지도가 게임에 없으면 그 녹음기는 안 나옴 (tapeLeft) */
export const GRAF_N = 6;
/* 기억 도감 칸: 전리품 전부 + 이야기 물건 (녹음기 제외 — 녹음기는 따로) */
export const CODEX_KEYS = Object.keys(ITEMS).filter(k => k !== 'tape');
export const REL_LV = [[0, '처음 본 사이'], [3, '아는 사이'], [6, '믿는 사이'], [10, '오랜 동료']];
export const relName = n => REL_LV.filter(([v]) => n >= v).pop()[1];

/* ───── 저장 (S.story) ───── */
export const freshStory = () => ({ v: 1, bv: BEAT_V, tut: 0, tutRaids: 0, beat: 0, open: null, openDay: null, doneQ: [], beatsDone: {}, credits: 0, creditDay: null,
  joined: [], met: [], rel: {}, gauge: { land: 0, lamp: 0, sea: 0 }, keyMem: {}, keyQ: [], codex: {}, tapes: [], tapeQ: [], graf: [], flags: {}, talkDay: {}, talkIdx: {}, dayEnd: null, choices: {},
  ending: null, ended: null, endings: {}, rebuild: 0 }); /* M5-A 엔딩 · 엔딩 뒤 '은포 되살리기' 수 (기부 의뢰) */
/* 저장에서 읽은 값 다듬기 (모르는 값 · 빠진 칸) */
export function fixStory(o) {
  const n = freshStory(); if (!o || typeof o !== 'object') return n;
  const m = Object.assign(n, o); m.gauge = Object.assign(freshStory().gauge, o.gauge);
  for (const k of ['doneQ', 'joined', 'met', 'keyQ', 'tapes', 'tapeQ', 'graf']) if (!Array.isArray(m[k])) m[k] = [];
  for (const k of ['beatsDone', 'rel', 'keyMem', 'codex', 'flags', 'talkDay', 'talkIdx', 'choices', 'endings']) if (!m[k] || typeof m[k] !== 'object') m[k] = {};
  if (m.ending && !ENDINGS[m.ending]) m.ending = null; for (const k of Object.keys(m.endings)) if (!ENDINGS[k]) delete m.endings[k]; m.rebuild = Math.max(0, m.rebuild | 0);
  m.joined = m.joined.filter(k => CAST[k]); m.beat = Math.max(0, Math.min(BEATS.length, m.beat | 0));
  if (m.open && !BEATS.some(b => b.id === m.open)) m.open = null; m.doneQ = m.doneQ.filter(id => BEAT_IDX[id] != null); m.keyQ = m.keyQ.filter(k => KEYMEM[k]);
  for (const k of Object.keys(m.codex)) if (!ITEMS[k]) delete m.codex[k];
  /* v0.5 걸음 16 → v0.6 걸음 25: 걸음 번호를 id 로 옮기고, 그 앞에 새로 생긴 걸음은 '지난 걸음'(기록실에서 다시 보기) */
  if ((o.bv | 0) < BEAT_V) {
    const at = (o.beat | 0) >= BEATS_V1.length ? 'b_ch4' : BEATS_V1[o.beat | 0]; const ni = BEAT_IDX[at] ?? 0;
    for (let i = 0; i < ni; i++) if (!m.beatsDone[BEATS[i].id]) m.beatsDone[BEATS[i].id] = 'old';
    m.beat = ni; m.bv = BEAT_V;
  }
  return m;
}
/* 처음 만들기 · v3 이하에서 옮겨 올 때: 이미 진행한 사람은 지금 장의 처음부터 (지난 장은 기록실에서 다시 보기) */
export function initStory(S, today, fromOld) {
  const st = S.story = freshStory(); st.creditDay = today;
  const done = S.quests?.done || []; const played = (S.stats?.raids || 0) > 0 || done.length > 0;
  if (!fromOld || !played) return st;
  const start = done.includes('q19') ? 'b_ch3' : done.includes('q11') ? 'b_ch2' : 'b_moru';
  const idx = BEAT_IDX[start];
  for (let i = 0; i < idx; i++) { const b = BEATS[i]; st.beatsDone[b.id] = 'old'; if (b.join) st.joined.push(b.join); }
  st.tut = 4; st.beat = idx; st.beatsDone.b_tut = 'old'; st.joined.unshift('gombang'); st.credits = 1; st.flags.welcome = 1;
  for (const k of new Set(S.stash || [])) if (ITEMS[k] && k !== 'tape') st.codex[k] = 1; /* 창고에 있는 건 이미 본 조각으로 */
  return st;
}
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
/* 하루가 바뀌면 이야기 걸음 1 (못 온 날은 최대 3까지 쌓아 둠 — 돌아온 날 한꺼번에) */
export function rollStory(S, today) {
  const st = S.story || (S.story = freshStory());
  if (!st.creditDay) { st.creditDay = today; return; }
  if (st.creditDay === today) return;
  const n = Math.max(1, days(st.creditDay, today) || 1); st.credits = Math.min(3, (st.credits || 0) + n); st.creditDay = today;
}

/* ───── 걸음 ───── */
export const beatNow = S => BEATS[S.story.beat] || null;
export const openBeat = S => (S.story.open ? BEATS[BEAT_IDX[S.story.open]] : null);
export const chapter = S => { const b = beatNow(S); return b ? b.ch : BEATS[BEATS.length - 1].ch; };
/* 지도가 게임에 있고 열렸는지 (econ.mapOpen 과 같은 규칙 — story.js 는 econ 을 안 읽음) */
export const mapReady = (S, m) => { const M = MAPS[m]; return !!M && (!M.unlock || (S.quests?.done || []).includes(M.unlock)); };
export function needMet(S, b, today) {
  if (!b || b.tut) return false;
  if (b.need?.q && !(S.quests?.done || []).includes(b.need.q)) return false;
  if (b.need?.map && !mapReady(S, b.need.map)) return false; /* 4장: 공장 지도(M3-B)가 게임에 있고 열려야 */
  if (b.nextDay) { const prev = BEATS[BEAT_IDX[b.id] - 1]; const d = S.story.beatsDone[prev.id]; if (!d || d === today) return false; }
  return true;
}
/* 오늘 열 수 있는 걸음 (튜토리얼이 끝나고 · 열린 걸음이 없고 · 걸음 1 남음) */
export function canOpen(S, today) {
  const st = S.story; if (st.tut < 4 || st.open || st.doneQ.length || (st.credits || 0) < 1) return null;
  const b = beatNow(S); return b && needMet(S, b, today) ? b : null;
}
/* 튜토리얼 끝 (장면 6 또는 건너뛰기) → 다음 날부터 하루 한 걸음 */
export function finishTut(S, today) { const st = S.story; st.tut = 4; st.beatsDone.b_tut ||= today; st.beat = Math.max(st.beat, 1); if (!st.joined.includes('gombang')) st.joined.unshift('gombang'); }
/* 걸음 열기 → 장면(story_ui) · 목표 없는 걸음은 바로 끝 */
export function startBeat(S, b, today) {
  const st = S.story; st.credits = Math.max(0, st.credits - 1); st.open = b.id; st.openDay = today;
  if (b.join && !st.joined.includes(b.join)) st.joined.push(b.join);
  if (b.opens && S.quests && !S.quests.done.includes(b.opens)) S.quests.done.push(b.opens); /* M5-A: 걸음이 지도를 엶 (대수문 꼭대기) */
  if (!b.goal) finishBeat(S, b, today, false);
  else if (b.goal.t === 'quest' && (S.quests?.done || []).includes(b.goal.q)) { /* 이미 끝낸 의뢰면 장면 뒤 바로 끝 */ }
}
/* 걸음 끝: 보상 · 다음 걸음 · (done 장면을 은신처에서 보게 doneQ) */
export function finishBeat(S, b, today, withScene = true) {
  const st = S.story; if (st.beatsDone[b.id]) return false;
  st.beatsDone[b.id] = today; st.open = null; st.beat = Math.max(st.beat, BEAT_IDX[b.id] + 1);
  if (b.reward) give(S, b.reward);
  if (withScene) st.doneQ.push(b.id);
  return true;
}
function give(S, r) { for (const [k, n] of Object.entries(r)) { if (k === 'shells') S.shells += n; else if (S.mats && k in S.mats) S.mats[k] += n; else for (let i = 0; i < n; i++) S.stash.push(k); } }
/* 판 결과로 목표 확인 */
export function goalMet(S, b, res) {
  const g = b?.goal; if (!g) return false; if (g.t === 'quest') return (S.quests?.done || []).includes(g.q);
  if (g.t === 'fac') return (S.fac?.[g.k] || 0) >= facNeed(g); /* M5-A 시설 끝 단계 (은신처에서 확인) */
  if (g.t === 'pieces') return piecesGot(S).length >= Math.min(g.n, Object.keys(LAST_PIECES).filter(m => MAPS[m]).length); /* M5-A 마지막 인양 (판 뒤에 모은 것) */
  if (!res || res.outcome !== 'extract' || (g.map && (res.map || 'ware') !== g.map)) return false;
  const all = [...res.items, ...res.safe, ...res.pet];
  if (g.t === 'carry') return all.includes(g.item);
  if (g.t === 'power') return !!res.power;
  if (g.t === 'zone') return res.zoneMax >= g.zone;
  if (g.t === 'extract') return true;
  if (g.t === 'boss') return (res.kills?.boss || 0) > 0; /* v0.7: 그 지도 보스 (본 사슬 의뢰가 없는 지도 — 연구소) */
  return false;
}
/* 은신처에서 확인 (본 사슬 의뢰가 끝났는지) */
export const facNeed = g => Math.min(g.lv, FACILITIES[g.k]?.levels.length || g.lv); /* 시설 단계 수가 바뀌어도(M5-C) 끝 단계를 넘지 않게 */
export const HOME_GOAL = new Set(['quest', 'fac', 'pieces']);
export function storyTick(S, today) {
  const b = openBeat(S); if (b && HOME_GOAL.has(b.goal?.t) && goalMet(S, b)) { finishBeat(S, b, today); return b; } return null;
}
/* 판에 넣을 이야기 물건: 열린 걸음이 carry 고 그 지도면 { item, zone } */
export function storyWant(S, map) { const b = openBeat(S); const g = b?.goal; if (g?.t === 'pieces') { const k = LAST_PIECES[map]; return k && !S.story.flags['pc_' + k] ? { item: k, zone: 1, beat: b.id } : null; } return g && g.t === 'carry' && g.map === map ? { item: g.item, zone: g.zone, beat: b.id } : null; }
/* 이 걸음이 게임에 아직 없는 지도를 기다리는지 (4장 = 공장) — '다음 업데이트' 안내 */
export const waitsMap = (S, b = beatNow(S)) => !!b?.need?.map && !MAPS[b.need.map];
/* 이 지도에서 아직 안 들은 녹음기 */
export const tapeLeft = (S, map) => (TAPES[map] || []).filter(t => !S.story.tapes.includes(t) && !S.story.tapeQ.includes(t));

/* ───── 판 뒤 (main.js endRaid 가 창고에 넣기 전에 부름) ─────
 *  이야기 물건(cat memo)은 창고로 가지 않고 도감 · 녹음기로 · 처음 들고 나온 물건은 기억 조각 · 세 번째면 사연 한 줄 더
 *  쓰러진 판의 가방(res.items)은 시체 자리에 그대로 남김 */
export function afterRaid(S, res, today) {
  const st = S.story; const ex = res.outcome === 'extract'; const out = { newMemo: [], third: [], tapes: [], beatDone: null, tut: 0 };
  const kept = ex ? [...res.items, ...res.safe, ...res.pet] : [...res.safe, ...(res.petSafe ? res.pet : [])];
  for (const k of kept) {
    if (k === 'tape') { const t = tapeLeft(S, res.map || 'ware')[0]; if (t) { st.tapeQ.push(t); out.tapes.push(t); } continue; }
    if (!ITEMS[k]) continue; const c = st.codex[k] || 0; st.codex[k] = c + 1;
    if (!c) out.newMemo.push(k); else if (c + 1 === 3) out.third.push(k);
  }
  /* 튜토리얼 판 세기 */
  if (st.tut >= 1 && st.tut <= 3) { st.tutRaids = (st.tutRaids || 0) + 1; out.tut = st.tutRaids; if (!ex) st.flags['tutDied' + st.tutRaids] = 1; if (!ex) st.flags.tutDiedAny = 1; }
  /* M5-A 마지막 인양: 들고 나온 조각 기록 (걸음이 열려 있을 때) */
  { const ob = openBeat(S); if (ob?.goal?.t === 'pieces') for (const k of kept) if (Object.values(LAST_PIECES).includes(k) && !st.flags['pc_' + k]) { st.flags['pc_' + k] = 1; (out.pieces ||= []).push(k); } }
  /* 이야기 걸음 목표 */
  const b = openBeat(S); if (b && goalMet(S, b, res)) { finishBeat(S, b, today); out.beatDone = b.id; }
  /* 이야기 물건은 창고로 안 감 */
  const strip = a => { for (let i = a.length - 1; i >= 0; i--) if (ITEMS[a[i]]?.cat === 'memo') a.splice(i, 1); };
  if (ex) { strip(res.items); strip(res.pet); } strip(res.safe); if (res.petSafe || ex) strip(res.pet);
  return out;
}

/* ───── 관계 · 세 등불 · 열쇠 기억 ───── */
export function addRel(S, who, n = 1) { const r = S.story.rel; r[who] = (r[who] || 0) + n; }
export function addGauge(S, side, n = 1) { if (S.story.gauge[side] != null) S.story.gauge[side] += n; }
/* 효과 묶음 { rel: { gombang: 1 }, gauge: { lamp: 1 }, flag: 'x' } */
export function applyFx(S, fx) {
  if (!fx) return; for (const [k, n] of Object.entries(fx.rel || {})) addRel(S, ALIAS[k] || k, n);
  for (const [k, n] of Object.entries(fx.gauge || {})) addGauge(S, k, n); if (fx.flag) S.story.flags[fx.flag] = 1;
}
/* 열쇠 기억 맡기기: 그 사람 쪽 등불 +2 · 그 사람과 사이 +1 */
export function giveKey(S, id, who) {
  const st = S.story; if (!KEYMEM[id] || st.keyMem[id]) return false; if (!KEYMEM[id].to.includes(who)) return false;
  st.keyMem[id] = who; addGauge(S, SIDE_OF[who], 2); if (CAST[who]) addRel(S, who, 1); st.keyQ = st.keyQ.filter(k => k !== id); return true;
}
/* 세 등불 밝기 0~1 */
export const lampLevel = (S, side) => Math.min(1, (S.story.gauge[side] || 0) / LAMP_FULL);
/* 창에 불 (합류한 인물) · 바람은 4장 합류 전엔 '만남'만 */
export const lit = S => CAST_KEYS.filter(k => S.story.joined.includes(k));
export const visitor = S => S.story.met.includes('baram') && !S.story.joined.includes('baram');
/* 은신처 말 걸기: 하루에 한 번 '…' (합류한 인물 · 만난 떠돌이) */
/* 합류 전 인물은 말하지 않음 (v0.5.1 · QA: 터널 판에서 아직 안 온 서리 무전) — 무전 · 의뢰 카드 · 결과 한 마디가 모두 여기를 지남
 *  곰방 = 첫 무전부터 · 노을/파수(목소리) · 몽이 = 늘 · 바람 = 판 안에서 만난 뒤 · 나머지 인물은 합류(창에 불)한 뒤 */
export function present(S, id) { const st = S.story; if (!CAST[id] || id === 'gombang') return true; return st.joined.includes(id) || (id === 'baram' && st.met.includes('baram')); }
/* 무전 한 줄 고르기: [말하는 이, 글] 이 아직 없는 사람이면 곰방 줄(alt) · 그것도 안 되면 null(말 안 함) */
export function voiceLine(S, line, alt) { for (const l of [line, alt]) if (l && present(S, ALIAS[String(l[0]).replace('~', '')] || String(l[0]).replace('~', ''))) return l; return null; }
/* 의뢰인: 와 있으면 그 사람 · 아니면 곰방이 대신 전함 (relay = 그 사람의 일 이름) */
export function giverVoice(S, who) { return present(S, who) ? { id: who, relay: null } : { id: 'gombang', relay: CAST[who]?.role || '' }; }
export const canTalk = (S, who) => S.story.joined.includes(who) || (who === 'baram' && visitor(S));
export const talkDue = (S, who, today) => canTalk(S, who) && S.story.talkDay[who] !== today;
export function talked(S, who, today, n) { const st = S.story; if (st.talkDay[who] !== today) { st.talkDay[who] = today; addRel(S, who, 1); } st.talkIdx[who] = n; }
/* 하루 끝 인사 (출격을 다 쓰고 은신처에 왔을 때 한 번) */
export const dayEndDue = (S, today) => S.story.tut >= 4 && S.sorties <= 0 && S.story.dayEnd !== today && !S.story.doneQ.length;

/* ───── 글 ───── */
const batchim = w => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
/* '{name}' → 이름 · '{name:이/가}' → 받침에 맞춘 조사 */
export const say = (t, name = '단비') => String(t).replace(/\{name(?::([^/}]*)\/([^}]*))?\}/g, (m, a, b) => (a != null ? name + (batchim(name) ? a : b) : name));
export const NAME_KEY = 'salvage_name', NAME_DEFAULT = '단비', NAME_MAX = 6;
export const cleanName = s => String(s || '').replace(/[<>&"'`{}]/g, '').trim().slice(0, NAME_MAX) || NAME_DEFAULT;
