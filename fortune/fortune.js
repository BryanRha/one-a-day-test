// 오늘의 운세: 내 사주(만세력 엔진 saju.min.js) × 오늘의 일진 → 분야별 점수 · 풀이 · 행운 아이템
//   계산(8글자)은 엔진이 정확히 하고, 풀이는 명리학 규칙(십성 · 합충 · 도화 · 오행 균형) 기반 문장
//   엔진 원본: ~/004. SN/001. saju/src/lib/saju (테스트 25개) → oneaday/tools/fortune_entry.ts 로 묶음
export { buildCheatingReport, CHEATING_TOC, buildLoveReport, LOVE_TOC, buildLifeReport, LIFE_TOC } from './saju.min.js';
import { calculateSaju, tenGod, isClash, isCombine, isPeachBlossom, STEM_ELEMENT, BRANCH_ELEMENT, ELEMENT_KO, BRANCH_MAIN_STEM, STEM_KO, BRANCH_KO, ymKey } from './saju.min.js';

const KEY = 'oad_fortune_me';
export const loadMe = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
export const saveMe = me => localStorage.setItem(KEY, JSON.stringify(me));
export const clearMe = () => localStorage.removeItem(KEY);

// 결정적 난수 (같은 날 · 같은 사람 = 같은 운세)
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const pick = (arr, seed) => arr[(seed >>> 0) % arr.length];   /* 음수 seed(r >> 4)에서 undefined 나던 것 막음 */

// 십성별 오늘의 기운: 분야 가감 [총운, 금전, 연애, 일·공부, 건강] · 한 줄 · 분야별 문장
const TG = {
  비견: { d: [4, -2, 0, 4, 3], key: '나다움', line: ['내 뜻대로 밀고 나가기 좋은 날이에요.', '혼자 해도 충분히 잘 해내는 날이에요.', '자신감이 차오르는 하루예요.'],
    money: '지출이 새기 쉬우니 함께 쓰는 돈은 미리 정해 두세요.', love: '친구 같은 편안한 인연이 가까이 있어요.', work: '맡은 일을 끝까지 해내는 힘이 있어요.' },
  겁재: { d: [-2, -6, 2, 2, 0], key: '경쟁', line: ['경쟁심이 올라오는 날, 서두르지만 않으면 이겨요.', '사람이 많을수록 내 몫을 잘 챙겨야 해요.', '욕심을 조금 덜면 오히려 많이 얻어요.'],
    money: '충동구매·빌려주는 돈은 오늘만은 참으세요.', love: '질투가 생길 수 있으니 말 한마디를 부드럽게.', work: '라이벌이 자극이 돼서 실력이 올라가요.' },
  식신: { d: [8, 3, 5, 3, 6], key: '여유', line: ['먹고 즐기는 복이 있는 편안한 날이에요.', '마음이 넉넉해지고 웃을 일이 생겨요.', '좋아하는 걸 하면 운이 따라오는 날이에요.'],
    money: '작은 즐거움에 쓰는 돈이 오히려 기운을 살려요.', love: '맛있는 걸 함께 먹으면 사이가 깊어져요.', work: '아이디어가 술술 나오는 날이에요.' },
  상관: { d: [2, 2, 6, -3, -1], key: '표현', line: ['말솜씨가 빛나지만 말실수도 조심해야 하는 날.', '튀는 매력이 사람들 눈에 띄어요.', '하고 싶은 말은 부드럽게 한 번 걸러서!'],
    money: '부업·재능으로 들어오는 돈 기운이 있어요.', love: '매력 지수 상승, 먼저 연락해 보세요.', work: '윗사람과 의견 충돌을 조심하세요.' },
  편재: { d: [5, 8, 4, 2, 0], key: '기회', line: ['뜻밖의 기회가 굴러오는 날이에요.', '움직일수록 돈과 사람이 따라와요.', '발이 넓어지는 하루, 약속을 잡아 보세요.'],
    money: '생각지 못한 수입이나 할인 운이 있어요.', love: '새로운 만남의 기운이 강해요.', work: '큰 그림을 그리기 좋은 날이에요.' },
  정재: { d: [5, 7, 2, 4, 2], key: '안정', line: ['차곡차곡 쌓이는 안정적인 날이에요.', '성실함이 보답받는 하루예요.', '계획한 대로 착착 흘러가요.'],
    money: '저축·정리하기 좋은 날, 가계부를 써 보세요.', love: '믿음직한 모습이 상대 마음을 움직여요.', work: '꼼꼼함이 인정받아요.' },
  편관: { d: [-3, -1, 1, 5, -4], key: '도전', line: ['부담이 크지만 이겨 내면 한 단계 올라가요.', '압박 속에서 진짜 실력이 드러나는 날.', '무리하지 말고 하나씩 처리하세요.'],
    money: '급하게 나갈 돈이 생길 수 있어요.', love: '강하게 끌리는 사람이 나타날 수 있어요.', work: '어려운 일을 맡지만 해내면 크게 인정받아요.' },
  정관: { d: [6, 2, 4, 7, 1], key: '인정', line: ['반듯한 모습이 인정받는 날이에요.', '규칙을 지키면 좋은 결과가 와요.', '주변의 신뢰를 얻는 하루예요.'],
    money: '정해진 수입이 든든하게 들어와요.', love: '진지한 인연, 소개팅 운이 좋아요.', work: '승진·합격처럼 공식적인 좋은 소식 기운.' },
  편인: { d: [1, -1, -2, 4, 2], key: '생각', line: ['혼자만의 시간이 답을 주는 날이에요.', '직감이 날카로워지는 하루예요.', '새로운 걸 배우면 머리에 쏙쏙 들어와요.'],
    money: '큰 결정은 하루 미뤄도 괜찮아요.', love: '생각이 많아질 수 있으니 솔직하게 물어보세요.', work: '연구·기획처럼 깊이 파는 일에 좋아요.' },
  정인: { d: [7, 1, 3, 5, 5], key: '도움', line: ['누군가의 도움이 들어오는 따뜻한 날이에요.', '마음이 편안해지고 컨디션이 좋아요.', '배움과 문서에 좋은 기운이 있어요.'],
    money: '부모님·윗사람에게서 도움받을 운.', love: '다정한 말 한마디에 마음이 녹아요.', work: '자격증·시험 공부에 집중이 잘 돼요.' },
};
// 독설 말투 (오늘의 한마디 · 조심할 것 · 연애 독설) — 십성별
const DOK = {
  비견: { say: ['고집 부려도 되는 날이다. 대신 결과도 네가 다 떠안아라.', '남 눈치 보지 마. 오늘은 네 판이다.'], warn: '"내가 낼게" 소리, 오늘은 입 밖에 내지 마라.', love: '친구처럼 편한 그 사람, 너만 친구라고 생각하는 거다.' },
  겁재: { say: ['오늘 지갑 여는 순간 후회한다. 밥 사 달라는 말은 못 들은 척해.', '네 걸 노리는 사람이 가까이 있다. 웃는 얼굴부터 의심해.'], warn: '돈 빌려 달라는 연락, 오늘은 읽고 씹어라.', love: '질투 나지? 티 내는 순간 지는 거다.' },
  식신: { say: ['오늘은 먹고 놀아도 된다. 네 복이다, 사양하지 마.', '웃을 일이 생긴다. 그 웃음, 아무한테나 보이지는 마라.'], warn: '야식 앞에서 오늘의 복을 다 써 버리지 마라.', love: '밥 한 끼가 고백보다 세다. 오늘 약속 잡아.' },
  상관: { say: ['말발이 서는 날. 근데 입이 화근이다, 한 번 삼키고 뱉어라.', '튀는 건 좋다. 윗사람 앞에서만 빼고.'], warn: '단톡방에 쓴 그 말, 보내기 전에 세 번 읽어라.', love: '먼저 연락해라. 오늘 네 매력, 아까우니까.' },
  편재: { say: ['뜻밖의 돈 냄새가 난다. 움직이는 놈이 먹는다.', '오늘은 발 넓은 놈이 이긴다. 안 가던 자리에 가 봐.'], warn: '쉽게 들어온 돈은 쉽게 나간다. 바로 써 버리지 마.', love: '새 사람이 들어온다. 문제는 지금 옆에 있는 사람이지.' },
  정재: { say: ['착실하게 굴면 보상받는 날. 요행은 바라지 마.', '모은 만큼 남는다. 오늘은 가계부 펴라.'], warn: '"이번만" 하는 소비가 제일 무섭다.', love: '믿음직한 척 말고 진짜 믿음을 줘라. 상대는 다 안다.' },
  편관: { say: ['숨 막히는 날이다. 버티면 한 칸 올라가고, 터지면 끝이다.', '누가 너를 시험한다. 감정은 집에 두고 나가.'], warn: '참다가 폭발하지 마라. 오늘 터지면 네 손해다.', love: '위험한 사람한테 끌린다. 끌리는 게 바로 경고다.' },
  정관: { say: ['반듯하게 굴면 인정받는다. 꼼수 쓰면 바로 들킨다.', '오늘은 규칙이 너를 지켜 준다.'], warn: '지각 한 번이 오늘 쌓은 점수를 다 날린다.', love: '진지한 인연 운. 가벼운 마음이면 상처 준다.' },
  편인: { say: ['생각이 너무 많다. 촉은 맞으니 의심은 거기까지만.', '혼자 있어야 답이 나온다. 단톡방 끄고 쉬어.'], warn: '혼자 상상한 걸 사실처럼 따지지 마라.', love: '그 사람 속을 넘겨짚지 마. 물어봐, 차라리.' },
  정인: { say: ['도와주는 손이 들어온다. 자존심 세우지 말고 잡아.', '오늘은 기대도 되는 날이다.'], warn: '받은 도움, 고맙다는 말 한마디는 꼭 해라.', love: '다정한 말 한마디에 넘어간다. 너도, 상대도.' },
};
/* 점쟁이 진열대: 10명 모두 원화(새 5명은 2026-10-28 Figma 생성 · 같은 화풍) — 이용자에게 '순한맛/매운맛' 구분은 보이지 않음
   tone 1 다정 ~ 10 매서움: 그날 일진 × 내 원국 관계로 그날의 점쟁이가 정해짐 (pickTeller) · 말투도 tone 따라 (다정 = 해요체, 매서움 = 독설) */
export const CHARS = {
  haesol: { name: '해솔선녀', seal: '溫情', el: 'wood', tone: 1, art: 1 },
  wolryeong: { name: '월령선생', seal: '月令', el: 'water', tone: 2, art: 1 },
  bokdeong: { name: '복덩도사', seal: '福德', el: 'earth', tone: 3, art: 1 },
  hoegwi: { name: '회귀낭자', seal: '回歸', el: 'water', tone: 4, art: 1 },
  hwaryeon: { name: '화련아씨', seal: '花蓮', el: 'fire', tone: 5, art: 1 },
  cheongun: { name: '청운거사', seal: '靑雲', el: 'metal', tone: 6, art: 1 },
  tusim: { name: '투심도령', seal: '透心', el: 'wood', tone: 7, art: 1 },
  geumdan: { name: '금단도령', seal: '禁斷', el: 'fire', tone: 8, art: 1 },
  danjoe: { name: '단죄보살', seal: '斷罪', el: 'metal', tone: 9, art: 1 },
  heukryeon: { name: '흑련낭자', seal: '黑蓮', el: 'water', tone: 10, art: 1 },
};
export const HAN = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
const GROUP = { 비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성' };
const jo = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return w + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? a : b); };
const EL = st => `${ELEMENT_KO[STEM_ELEMENT[st]]}(${HAN[STEM_ELEMENT[st]]})`;
/* 그날의 점쟁이: 오늘 천간이 내 일간에게 어떤 십성인가(생 · 극 · 같음) + 오늘 지지와 내 일지의 합 · 충
   인성(나를 생함) 다정 · 식상(내가 생함) 흥 · 비겁(같음) 맞섬 · 재성(내가 극함) 셈 · 관성(나를 극함) 매서움 · 일지 충이면 흑련낭자 · 합이면 두 칸 부드럽게 */
const SLOT = { 인성: ['haesol', 'wolryeong'], 식상: ['bokdeong', 'hoegwi'], 비겁: ['hwaryeon', 'cheongun'], 재성: ['cheongun', 'tusim'], 관성: ['geumdan', 'danjoe'] };
const TELL = Object.keys(CHARS).sort((a, b) => CHARS[a].tone - CHARS[b].tone);
export function pickTeller(S, T, seed) {
  const dm = S.dayMaster.stem, g = GROUP[tenGod(dm, T.stem)];
  let ch = SLOT[g][seed & 1], why;
  const day = `오늘 일진 ${T.ko}`, ELo = st => EL(st) + (['wood', 'metal'].includes(STEM_ELEMENT[st]) ? '을' : '를');
  if (isClash(T.branch, S.day.branch)) {
    ch = 'heukryeon'; why = `${day}의 ${BRANCH_KO[T.branch]}(${T.branch})가 내 일지 ${BRANCH_KO[S.day.branch]}(${S.day.branch})와 정면으로 충(沖)해서 흑련낭자가 직접 나섰다`;
  } else {
    const comb = isCombine(T.branch, S.day.branch);
    if (comb) ch = TELL[Math.max(0, TELL.indexOf(ch) - 2)];
    const n = jo(CHARS[ch].name, '이', '가');
    why = g === '인성' ? `${day}의 ${EL(T.stem)} 기운이 내 일간 ${ELo(dm)} 생(生)해 주는 날이라 ${n} 나섰다`
      : g === '식상' ? `내 일간 ${EL(dm)} 기운이 오늘 일진 쪽으로 흘러 나가는 날(식상)이라 ${n} 나섰다`
      : g === '비겁' ? `${jo(day, '이', '가')} 나와 같은 ${EL(dm)} 기운(비겁)이라 ${n} 나섰다`
      : g === '재성' ? `내 일간이 ${day}의 ${EL(T.stem)} 기운을 다스리는(극하는) 날(재성)이라 ${n} 나섰다`
      : `${day}의 ${EL(T.stem)} 기운이 내 일간 ${ELo(dm)} 누르는(극하는) 날(관성)이라 ${n} 나섰다`;
    if (comb) why += ' · 오늘 지지가 내 일지와 합(合)을 이뤄 한결 부드럽게';
  }
  return { ch, why };
}
/* 다정한 점쟁이의 '오늘 조심할 것' (해요체) */
const SOFT_WARN = {
  비견: '고집이 세지기 쉬운 날이에요. 한 번은 남의 말도 들어 보세요.', 겁재: '돈 빌려주기 · 충동구매는 오늘만 참아 주세요.',
  식신: '즐거운 날이지만 과식 · 과음만 조심해요.', 상관: '하고 싶은 말은 한 번 걸러서 부드럽게 해요.',
  편재: '들뜬 기분에 큰 지출만 하지 않으면 좋아요.', 정재: '너무 아끼다 사람을 놓치지 않게 마음도 써 주세요.',
  편관: '무리하면 몸이 먼저 알아요. 쉬는 시간을 꼭 넣어요.', 정관: '규칙을 지키되 너무 완벽하려고 애쓰지 않아도 돼요.',
  편인: '생각이 많아지는 날이에요. 결정은 하루 미뤄도 괜찮아요.', 정인: '도움받은 일엔 고맙다는 말 한마디 잊지 말아요.',
};
/* 유료 풀이 5종 — 가격 표시용(실제 가격은 서버 gold.js FORTUNE) · 골드 = 원화 ÷ 10
   q: 결과 화면 제목({p} 그 사람 · {me} 나) · form: 상대 입력 화면 [제목, 설명, 이름 칸, 버튼] · lock: 결제 유도 문구 · cols: 등급 0~3 색 */
export const PAID = [
  /* 범용 3종 (solo = 내 사주만) — 다정한 점쟁이들에게 배정 */
  { id: 'newyear', ch: 'wolryeong', title: '2027 정미년 신년운세', hook: '열두 달 중 내 달은 언제일까요', price: 14900, solo: true, tease: ['2027 총운 점수', '가장 좋은 달 ██월', '열두 달 월운 · 분야별 운'],
    q: '{me}님의<br><em>2027년</em>', lock: '열두 달 월운 · 재물 · 일 · 연애 · 건강 · 좋은 달과 조심할 달', cols: ['#8FB8E8', '#6A9AFF', '#4A7AF0', '#2A5AD8'] },
  /* 입문 3,900 (보너스 골드 OK · 그 달에 묶임 — 21일부터는 다음 달) */
  { id: 'monthly', ch: 'hwaryeon', title: '이번 달 내 운세', hook: '네 주의 흐름, 좋은 날과 조심할 날', price: 3900, solo: true, monthly: true, entry: true, tease: ['이번 달 운 점수', '가장 좋은 날 ██일', '1~4주차 흐름'],
    q: '{me}님의<br><em>{m}월 운세</em>', lock: '1~4주차 흐름 · 좋은 날 다섯 · 조심할 날 셋 · 분야별 좋은 날', cols: ['#C9A08A', '#F0A070', '#FF8A50', '#FF6A30'], cal: '이번 달 좋은 날' },
  { id: 'exam', ch: 'cheongun', title: '합격운 · 집중 달력', hook: '집중이 잘 되는 날, 쉬어 갈 날', price: 3900, solo: true, monthly: true, entry: true, tease: ['나의 공부 체질', '집중 잘 되는 날 ██일', '두 달 집중 달력'],
    q: '{me}님의<br><em>합격운 · 집중 달력</em>', lock: '두 달 집중 달력 · 시험 · 문서운 좋은 날 · 쉬어 갈 날 · 공부법', cols: ['#A0A8B8', '#B8C0D0', '#D0D8E8', '#F0F0FA'], cal: '두 달 집중 달력' },
  { id: 'wealth', ch: 'bokdeong', title: '재물 · 횡재수 달력', hook: '돈이 들어오는 달, 횡재 기운 높은 날', price: 9900, solo: true, tease: ['나의 재물 타입', '재물 기운 가장 강한 달 ██월', '횡재 기운 높은 날 달력'],
    q: '{me}님의<br><em>돈 흐름 · 횡재 달력</em>', lock: '12개월 돈 흐름 · 앞으로 90일 횡재 기운 높은 날 · 돈이 새는 때 · 재물 행운 색 · 방향', cols: ['#C9B48A', '#E8C060', '#F2B030', '#FF9A1A'], cal: '횡재 기운 달력 · 앞으로 90일' },
  { id: 'compat', ch: 'haesol', title: '우리 궁합', hook: '두 사람, 얼마나 잘 맞을까요', price: 14900, tease: ['궁합 점수', '부딪히는 지점', '올해 고비 달 ██월'],
    q: '{me}님과 {p}님의<br><em>궁합</em>', form: ['그 사람의 생년월일', '연인 · 썸 · 부부 누구든 좋아요. 시간까지 알면 더 정확해요. 이 기기에만 저장돼요.', '그 사람'],
    lock: '부딪히는 지점 · 대화법 · 역할 나누기 · 함께하기 좋은 해 · 올해 고비 달', cols: ['#E8A0B8', '#F08AB0', '#FF6FA0', '#FF4D8D'] },
  { id: 'cheating', ch: 'heukryeon', title: '바람기 사주', hook: '그 사람, 바람피울 사주인가?', price: 19900, tease: ['바람기 지수 ██%', '지금 다른 사람이 있을 가능성', '가장 위험한 시기 ███월'],
    q: '{p},<br><em>바람피울 사주</em>인가?', form: ['그 사람의 사주를 내놔라', '애인·배우자·썸 상대의 생년월일. 시간까지 알면 더 정확하다. 이 기기에만 저장돼요.', '그 사람'],
    lock: '지금 다른 사람이 있을 가능성 · 가장 위험한 시기 · 거짓말할 때 드러나는 신호 · 관계를 지키는 현실 전략', cols: ['#6EDC8A', '#F2C14E', '#FF8A3C', '#E02440'] },
  { id: 'forbidden', ch: 'geumdan', title: '금지된 사랑 사주', hook: '이 관계의 끝, 누가 먼저 무너지는가', price: 19900, tease: ['끌림 지수 ██점', '먼저 무너지는 쪽', '드러나기 쉬운 달 ██월'],
    q: '이 관계의 끝,<br><em>누가 먼저 무너지는가</em>', form: ['말할 수 없는 그 사람', '괜찮아, 여기선 아무도 너를 탓하지 않아. 그 사람 생년월일만 알려 줘. 이 기기에만 저장돼요.', '그 사람'],
    lock: '그 사람이 이 관계에서 원하는 것 · 누가 먼저 무너지는가 · 드러나기 쉬운 달 · 이 인연의 끝', cols: ['#8A8FA8', '#C9A0DC', '#B05CE0', '#7A1FD0'] },
  { id: 'after', ch: 'danjoe', title: '외도 후 선택 사주', hook: '용서할까, 끝낼까', price: 24900, tease: ['회복 지수 ██점', '참고 가는 길', '끝내는 길'],
    q: '용서할까,<br><em>끝낼까</em>', form: ['그 사람의 사주를 가져오너라', '울지 말고 앉거라. 외도한 배우자·애인의 생년월일을 넣거라. 시간까지 알면 더 정확하다. 이 기기에만 저장돼요.', '배우자·애인'],
    lock: '같은 일이 되풀이될 구조인가 · 참고 가는 길과 끝내는 길 · 결정하기 좋은 달 · 마주 앉을 때 할 말', cols: ['#E02440', '#FF8A3C', '#F2C14E', '#6EDC8A'] },
  { id: 'reunion', ch: 'hoegwi', title: '재회 사주', hook: '그 사람, 돌아오는가', price: 14900, tease: ['재회 지수 ██점', '다시 닿는 시기 ██월', '누가 먼저 연락하는가'],
    q: '{p},<br><em>돌아오는가</em>', form: ['헤어진 그 사람의 사주', '끝난 인연인지, 남은 불씨인지 같이 봐요. 그 사람 생년월일을 알려 주세요. 이 기기에만 저장돼요.', '헤어진 그 사람'],
    lock: '그 사람 마음에 남은 당신 · 다시 닿는 달 · 누가 먼저 연락하는가 · 다시 다가가는 법', cols: ['#8A8FA8', '#C9A0DC', '#FF8AB0', '#FF4D8D'] },
  { id: 'inner', ch: 'tusim', title: '속마음 사주', hook: '연락 없는 그 사람, 진짜 속마음', price: 14900, tease: ['마음 온도 ██도', '숨기는 것', '연락해도 되는 달'],
    q: '{p}의<br><em>진짜 속마음</em>', form: ['연락 없는 그 사람', '그 사람 생년월일만 줘. 속은 내가 읽어 줄게. 이 기기에만 저장돼요.', '그 사람'],
    lock: '그 사람이 숨기는 것 · 너를 어떻게 보는가 · 연락해도 되는 달 · 먼저 연락할 때 첫마디', cols: ['#6FA8DC', '#C9A0DC', '#FF8A3C', '#E02440'] },
];
export const paidOf = id => PAID.find(p => p.id === id) || PAID[0];
/* 연애 독설 운세 5종 = 만 19세 이상 (team/dev/tasks/261028-service-check/age-copy.md) — 숨김 · 결제 확인 · 배지가 모두 이 함수들만 씀
   나이 셈법은 AGE_RULE 한 곳: 'year' = 연 나이(올해 − 태어난 해, 청소년보호법 셈법 · 대표 확정 전 기본값) · 'full' = 만 나이
   서버(server/api/_lib/gold.js ADULT · AGE_RULE)도 같은 값이어야 함 — build.mjs 가 대조 */
export const ADULT = [];   /* 2026-10-28 대표: 운세 나이 필터 적용 안 함 (예전: cheating · forbidden · after · reunion · inner) — 앱 · 서버 같은 값 */
export const ADULT_AGE = 19, AGE_RULE = 'year';
export const isAdultFortune = id => ADULT.includes(id);
export function ageOf(me, now = new Date()) {
  const y = Number(me && me.y); if (!y) return null;
  const k = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60e3), ty = k.getFullYear();   /* 한국 날짜 기준 */
  if (AGE_RULE === 'year') return ty - y;
  const md = (k.getMonth() + 1) * 100 + k.getDate(), bd = Number(me.m || 1) * 100 + Number(me.d || 1);
  return ty - y - (md < bd ? 1 : 0);
}
/* 생년월일을 아직 안 넣었으면 false (카드는 보이고 19+ 배지 · 결제 전 확인 한 줄이 막음) */
export const isUnder19 = me => { const a = ageOf(me); return a != null && a < ADULT_AGE; };
/* 신년 패키지 24,900: 신년운세 + 아래에서 2개 (가격은 서버 gold.js FORTUNE.pack) */
export const PACK = { id: 'pack', price: 24900, base: 'newyear', picks: ['wealth', 'compat', 'monthly', 'exam'], title: '2027 신년 패키지' };
const COLORS = { wood: ['초록', '#4CB86A'], fire: ['빨강', '#E8503A'], earth: ['노랑', '#E8B04A'], metal: ['흰색', '#E8E8F0'], water: ['남색', '#3A5AB8'] };
const NUMS = { wood: [3, 8], fire: [2, 7], earth: [5, 10], metal: [4, 9], water: [1, 6] };
const DIRS = { wood: '동쪽', fire: '남쪽', earth: '가운데', metal: '서쪽', water: '북쪽' };
const FEEDS = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };

export function myChart(me) {
  return calculateSaju({ year: me.y, month: me.m, day: me.d, hour: me.h ?? undefined, minute: me.mi ?? 0, calendar: me.cal || 'solar', isLeapMonth: !!me.leap, longitude: me.lon || undefined });
}
export function todayPillar(date) { return calculateSaju({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), calendar: 'solar' }).day; }

export function fortune(me, date) {
  const S = myChart(me), T = todayPillar(date), dm = S.dayMaster.stem, key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}|${me.name}|${me.y}${me.m}${me.d}`;
  const g1 = tenGod(dm, T.stem), g2 = tenGod(dm, BRANCH_MAIN_STEM[T.branch]);   /* 오늘 천간·지지를 '내 일간' 기준 십성으로 */ const a = TG[g1], b = TG[g2];
  const sc = [70, 70, 70, 70, 70]; for (let i = 0; i < 5; i++) sc[i] += a.d[i] * 2 + b.d[i];
  const notes = [];
  if (isCombine(T.branch, S.day.branch)) { sc[0] += 6; sc[2] += 9; notes.push('오늘의 기운이 내 일지와 합(合)을 이뤄 사람과 잘 어울려요.'); }
  if (isClash(T.branch, S.day.branch)) { sc[0] -= 8; sc[4] -= 5; sc[2] -= 4; notes.push('일지와 충(沖)이 들어 변화가 많은 날 — 이동·약속 시간에 여유를 두세요.'); }
  if (isClash(T.branch, S.year.branch)) { sc[3] -= 3; notes.push('바깥일이 갑자기 바뀔 수 있어요.'); }
  if (isPeachBlossom(T.branch)) { sc[2] += 5; notes.push('도화(桃花)의 날, 매력이 눈에 띄어요.'); }
  // 오행 균형: 내 사주에 부족한 오행을 오늘이 채워 주면 +
  const cnt = S.elementCount, weak = Object.keys(cnt).sort((x, y) => cnt[x] - cnt[y] || (x === FEEDS[S.dayMaster.element] ? -1 : 1))[0];
  if (STEM_ELEMENT[T.stem] === weak || BRANCH_ELEMENT[T.branch] === weak) { sc[0] += 6; sc[4] += 4; notes.push(`내 사주에 적은 ${ELEMENT_KO[weak]}(${weak === 'wood' ? '木' : weak === 'fire' ? '火' : weak === 'earth' ? '土' : weak === 'metal' ? '金' : '水'}) 기운이 들어오는 날이에요.`); }
  const r = hash(key); for (let i = 0; i < 5; i++) sc[i] = Math.max(35, Math.min(99, sc[i] + ((r >> (i * 3)) & 7) - 3));
  const total = Math.round(sc[0] * 0.4 + (sc[1] + sc[2] + sc[3] + sc[4]) * 0.15);
  const lucky = weak; const [cName, cHex] = COLORS[lucky];
  return {
    chart: S, today: T, tenGod: [g1, g2], key: a.key, total, scores: { 총운: sc[0], 금전: sc[1], 연애: sc[2], '일·공부': sc[3], 건강: sc[4] },
    line: pick(a.line, r), notes, money: a.money, love: sc[2] >= 78 ? b.love : a.love, work: a.work,
    color: { name: cName, hex: cHex }, numbers: NUMS[lucky], dir: DIRS[lucky], weak, seed: r,
    ...(() => { const t = pickTeller(S, T, r), tone = CHARS[t.ch].tone;
      /* 말투: 다정(1~3) 해요체 · 중간(4~6) 다정한 한마디 + 독설 경고 · 매서움(7~) 독설 */
      return { ch: t.ch, why: t.why, tone,
        say: tone <= 6 ? pick(a.line, r >> 4) : pick(DOK[g1].say, r >> 4), warn: tone <= 3 ? SOFT_WARN[g2] : DOK[g2].warn,
        dokLove: tone <= 3 ? (sc[2] >= 78 ? b.love : a.love) : sc[2] >= 80 ? DOK[g2].love : DOK[g1].love }; })(),
  };
}
export const ELEMENT_NAME = ELEMENT_KO;

// 상대 정보 (상품마다 따로 · 바람기는 예전 키 그대로) — 기기에만 저장
const pkey = id => !id || id === 'cheating' ? 'oad_fortune_partner' : 'oad_fortune_partner_' + id;
export const loadPartner = id => { try { return JSON.parse(localStorage.getItem(pkey(id)) || 'null'); } catch { return null; } };
export const savePartner = (p, id) => localStorage.setItem(pkey(id), JSON.stringify(p));
export const toInput = p => ({ ...(p.ym ? { ym: p.ym } : {}), name: p.name, gender: p.sex === 'm' ? 'male' : 'female', year: p.y, month: p.m, day: p.d, hour: p.h ?? undefined, minute: p.mi ?? 0, calendar: p.cal || 'solar', isLeapMonth: !!p.leap, longitude: p.lon || undefined });
/* 무료 미리보기: 점수 · 근거 · 무료 섹션 2개만 (잠긴 섹션 본문은 이 코드에 없음 — 결제 후 서버가 만듦) */
export async function paidPreview(id, me, partner) {
  const S = await import('./saju.min.js'), PR = paidOf(id);
  if (S.LIFE_PRODUCTS.includes(id)) return S.buildLifeReport(id, toInput(me), PR.solo ? null : toInput(partner), false);
  return id === 'cheating' ? S.buildCheatingReport(toInput(me), toInput(partner), false) : S.buildLoveReport(id, toInput(me), toInput(partner), false);
}
/* 결제 · 영수증의 '두 사람': solo 상품은 나 자신 (서버도 같은 규칙 — order · me · report) */
export const pairOf = (id, me) => paidOf(id).monthly ? { ...me, ym: ymKey(new Date()) } : paidOf(id).solo ? me : loadPartner(id);
export const curYm = () => ymKey(new Date());

/* 오늘 이 부분이 신경 쓰여요: 오늘 점수 · 십성으로 고른 훅 하루 1개 (실제 계산 결과) · 이미 산 상품 빼기 · 같은 훅 3일 연속 금지 */
const HKEY = 'oad_hook';
export function hookOf(f, dateKey, bought = () => false) {
  let log = {}; try { log = JSON.parse(localStorage.getItem(HKEY) || '{}'); } catch { /* */ }
  if (log[dateKey] !== undefined) return log[dateKey] && makeHook(f, log[dateKey]);
  const sc = f.scores, G = f.tenGod.map(g => GROUP[g]);
  const cand = [
    ['금전', 'wealth', Math.abs(sc.금전 - 70) + (G.includes('재성') || f.tenGod.includes('겁재') ? 8 : 0)],
    ['연애', 'compat', Math.abs(sc.연애 - 70) + (f.notes.some(n => /합|도화/.test(n)) ? 8 : 0)],
    ['일·공부', G.includes('관성') || G.includes('인성') ? 'exam' : 'newyear', Math.abs(sc['일·공부'] - 70) + (G.includes('관성') || G.includes('인성') ? 6 : 0)],
    ['총운', 'monthly', Math.abs(sc.총운 - 70) + (f.notes.some(n => /충/.test(n)) ? 6 : 0)],
    ['총운', 'newyear', 0],
  ].sort((a, b) => b[2] - a[2]);
  const idOf = v => (v || '').split('|')[1] || '', days = Object.keys(log).filter(k => k < dateKey).sort().slice(-2);
  const last2 = days.length === 2 && idOf(log[days[0]]) && idOf(log[days[0]]) === idOf(log[days[1]]) ? idOf(log[days[0]]) : null;
  const pickd = cand.find(([, id]) => !bought(id) && id !== last2);
  const val = pickd ? `${pickd[0]}|${pickd[1]}` : '';
  log[dateKey] = val; const keep = Object.keys(log).sort().slice(-10); try { localStorage.setItem(HKEY, JSON.stringify(Object.fromEntries(keep.map(k => [k, log[k]])))); } catch { /* */ }
  return val && makeHook(f, val);
}
function makeHook(f, val) {
  const [field, id] = val.split('|'), n = f.scores[field], hi = n >= 70;
  const T = {
    금전: hi ? `오늘 금전 ${n}점 — 재물 기운이 들어오는 날이에요. 앞으로 90일 중 횡재 기운 높은 날은 언제일까요?` : `오늘 금전 ${n}점 — 돈이 새기 쉬운 날이에요. 앞으로 1년 돈 흐름은 어떨까요?`,
    연애: hi ? `오늘 연애 ${n}점 — 인연 기운이 강한 날이에요. 그 사람과의 궁합은?` : `오늘 연애 ${n}점 — 마음이 엇갈리기 쉬운 날이에요. 두 사람이 부딪히는 지점은?`,
    '일·공부': id === 'exam' ? (hi ? `오늘 일·공부 ${n}점 — 배움의 기운이 들어온 날. 집중이 잘 되는 날은 또 언제일까요?` : `오늘 일·공부 ${n}점 — 집중이 흩어지는 날. 쉬어 갈 날과 몰아칠 날을 나눠 볼까요?`)
      : hi ? `오늘 일·공부 ${n}점 — 인정받는 기운이 있는 날. 2027년엔 언제 가장 빛날까요?` : `오늘 일·공부 ${n}점 — 버거운 날이에요. 2027년 열두 달 중 힘을 줄 달은?`,
    총운: id === 'monthly' ? (hi ? `오늘 총운 ${n}점 — 흐름이 좋은 날. 이번 달 가장 좋은 날은 언제일까요?` : `오늘 총운 ${n}점 — 쉬어 가는 날이에요. 이번 달 조심할 날은 또 언제일까요?`)
      : hi ? `오늘 총운 ${n}점 — 흐름이 좋은 날. 2027년 가장 좋은 달은 언제일까요?` : `오늘 총운 ${n}점 — 쉬어 가는 날이에요. 2027년엔 어떤 달이 기다릴까요?`,
  };
  return { id, field, text: T[field] };
}

/* 오늘 어울리는 게임: 지금 바로 할 수 있는(잠기지 않은) 게임 중에서만 · 운이 점수 · 난이도 · 골드에 영향 없음 */
export const luckyGame = (f, open) => open.length ? open[f.seed % open.length] : null;

/* 하루 기록(기기에만): v 들어옴 · f 운세 봄 · r 회고(y 맞았다 · h 반반 · n 아니던데) · t 태그 — 지난 운세는 저장 없이 다시 계산 */
const DKEY = 'oad_days';
export const days = () => { try { return JSON.parse(localStorage.getItem(DKEY) || '{}'); } catch { return {}; } };
export function markDay(key, patch) {
  const all = days(); all[key] = { ...(all[key] || {}), ...patch };
  const keep = Object.keys(all).sort().slice(-400); try { localStorage.setItem(DKEY, JSON.stringify(Object.fromEntries(keep.map(k => [k, all[k]])))); } catch { /* */ }
  return all[key];
}
/* 저녁 회고 반응: 점쟁이 말투(tone) 따라 */
export function recapLine(f, ans) {
  const soft = f.tone <= 3, mid = f.tone <= 6;
  const L = {
    y: soft ? '역시 그랬군요. 내일도 같이 볼까요?' : mid ? '거봐, 내가 뭐랬어. 내일도 와.' : '당연하지. 내 눈은 안 틀려. 내일 또 와라.',
    h: soft ? '반쯤은 맞았네요. 나머지 반은 내일 채워 봐요.' : mid ? '반은 맞혔네. 나머지 반은 네가 피해 간 거야.' : '반반? 나머지 반은 네가 운을 비켜 간 거다.',
    n: soft ? '그런 날도 있죠. 내일 기운은 더 좋아요.' : mid ? '오늘은 빗나갔네. 내일 다시 겨뤄 보자.' : '내가 틀렸다고? 내일 다시 와서 따져라.',
  };
  return L[ans];
}
export const cheatingPreview = (me, partner) => paidPreview('cheating', me, partner);
