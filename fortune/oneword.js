// 「AI 가 본 나, 한 단어」 (2026-11-02 대표 확정 · B안) — 단어 목록 + 후보 좁히기 (화면 없음 · 서버 시험에서도 불러 씀)
//   흐름: 답 5개 + 오늘 일진(일주 천간의 오행) → 꽃 · 색 · 날씨마다 후보 4개 → 서버(Haiku)가 하나씩 고르고 한 줄 풀이
//         서버가 안 되면 pickRule(같은 식) + 준비된 풀이 문장(LINES)
//   같은 날 같은 답 = 같은 결과: 씨앗 seedOf(날짜 · 일진 · 답) 로 후보 순서 · 규칙 고르기 · 서버 캐시 키가 정해짐
//   개인정보 없음: 생년월일 · 이름을 쓰지 않음 (일진은 날짜만으로 정해짐) · 서버로는 답 번호 · 후보 단어만
//   꼬리표(분위기) 10가지 — warm 따뜻 · calm 고요 · spark 설렘 · firm 단단 · free 자유 · tender 다정 · deep 깊음 · bright 밝음 · shy 수줍음 · bold 대담
//   오행: wood 목 · fire 화 · earth 토 · metal 금 · water 수

export const TAGS = ['warm', 'calm', 'spark', 'firm', 'free', 'tender', 'deep', 'bright', 'shy', 'bold'];
export const TAG_KO = { warm: '따뜻', calm: '고요', spark: '설렘', firm: '단단', free: '자유', tender: '다정', deep: '깊음', bright: '밝음', shy: '수줍음', bold: '대담' };
export const ELS = ['wood', 'fire', 'earth', 'metal', 'water'];
export const EL_KO = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
const GEN = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };   /* 상생: 앞이 뒤를 낳음 */
const E = { 목: 'wood', 화: 'fire', 토: 'earth', 금: 'metal', 수: 'water' };
const T = s => s.split(' ').map(k => ({ 따: 'warm', 고: 'calm', 설: 'spark', 단: 'firm', 자: 'free', 다: 'tender', 깊: 'deep', 밝: 'bright', 수: 'shy', 대: 'bold' })[k]);

/* ── 꽃: [이름, 색, 오행, 꼬리표, 꽃말] ── */
const F = [
  ['작약', '#F2B8A8', '화', '다 수', '수줍음'], ['해바라기', '#F6C445', '토', '밝 따', '당신만을 바라봄'], ['장미', '#D2334A', '화', '대 설', '열렬한 사랑'],
  ['흰 장미', '#F4EFE6', '금', '고 다', '순결'], ['튤립', '#E8546B', '화', '설 밝', '사랑의 고백'], ['라벤더', '#A58FCB', '수', '고 깊', '침묵'],
  ['수국', '#8FAAD8', '수', '고 깊', '진심'], ['벚꽃', '#F6CFD6', '목', '설 수', '정신의 아름다움'], ['매화', '#F3D4D8', '목', '단 고', '고결한 마음'],
  ['목련', '#F2EBDD', '금', '고 단', '고귀함'], ['동백', '#C2263A', '화', '단 깊', '누구보다 그대를 사랑함'], ['국화', '#F1D06B', '토', '고 단', '성실'],
  ['코스모스', '#EBA3C0', '목', '자 다', '순정'], ['안개꽃', '#F5F3EE', '금', '다 수', '맑은 마음'], ['프리지아', '#F7D96A', '토', '밝 설', '새로운 시작'],
  ['카네이션', '#E07A8B', '화', '따 다', '사랑과 존경'], ['데이지', '#F6F1DE', '금', '밝 자', '희망'], ['민들레', '#F3C93A', '토', '자 밝', '감사하는 마음'],
  ['무궁화', '#D98CB3', '목', '단 깊', '일편단심'], ['연꽃', '#EFB3C2', '수', '고 깊', '순결한 마음'], ['수선화', '#F4E18A', '수', '수 깊', '자기 사랑'],
  ['은방울꽃', '#F2F2EA', '금', '수 다', '틀림없이 행복해짐'], ['아네모네', '#8C3B6E', '수', '깊 설', '기대'], ['라넌큘러스', '#F0A27F', '화', '밝 다', '매력'],
  ['거베라', '#F17E4E', '화', '밝 자', '신비'], ['리시안셔스', '#C9B6E4', '수', '다 고', '변치 않는 사랑'], ['백합', '#F7F3EA', '금', '고 단', '순수'],
  ['히아신스', '#7A6FC9', '수', '깊 설', '유희'], ['제비꽃', '#6E5AA8', '수', '수 깊', '겸손'], ['물망초', '#8DB7E6', '수', '다 깊', '나를 잊지 마세요'],
  ['금잔화', '#F29A2E', '화', '따 단', '변함없는 애정'], ['개나리', '#F4D03F', '목', '밝 자', '희망'], ['진달래', '#E58AB4', '목', '수 설', '사랑의 기쁨'],
  ['철쭉', '#E2557D', '목', '대 따', '사랑의 즐거움'], ['나팔꽃', '#6C7FD6', '수', '자 설', '기쁜 소식'], ['맨드라미', '#B8243E', '화', '대 단', '시들지 않는 사랑'],
  ['봉선화', '#E2667E', '화', '수 다', '나를 건드리지 마세요'], ['채송화', '#F28AA0', '화', '밝 자', '순진'], ['달맞이꽃', '#F1E27A', '수', '수 고', '기다림'],
  ['해당화', '#D9466A', '화', '따 설', '온화'], ['패랭이꽃', '#E4708F', '목', '다 단', '순결한 사랑'], ['도라지꽃', '#7D6BC8', '수', '단 고', '영원한 사랑'],
  ['할미꽃', '#7B3B6A', '토', '깊 고', '충성'], ['엉겅퀴', '#9A5BB0', '목', '대 단', '독립'], ['토끼풀꽃', '#F2F0E6', '목', '밝 자', '약속'],
  ['금낭화', '#E06C93', '목', '수 다', '당신을 따르겠어요'], ['모란', '#D24C7A', '화', '대 따', '부귀'], ['동자꽃', '#EE7A4E', '화', '밝 수', '기다림'],
  ['상사화', '#E7A0B6', '목', '깊 수', '이룰 수 없는 사랑'], ['꽃무릇', '#C6283A', '화', '깊 대', '참사랑'], ['수레국화', '#4C6FD1', '수', '자 밝', '행복감'],
  ['양귀비', '#E0443A', '화', '대 설', '위로'], ['금계국', '#F4C430', '토', '밝 따', '상쾌한 기분'], ['붓꽃', '#5B57B5', '수', '단 깊', '좋은 소식'],
  ['꽃창포', '#7E5DBA', '수', '고 단', '우아한 마음'], ['원추리', '#F09A3E', '토', '따 다', '기다리는 마음'], ['능소화', '#F08A4B', '화', '따 설', '명예'],
  ['배롱나무꽃', '#D96BA0', '목', '따 단', '부귀'], ['치자꽃', '#F4F1E4', '금', '다 고', '한없는 즐거움'], ['재스민', '#F6F3E8', '금', '다 설', '상냥함'],
  ['라일락', '#B9A2D6', '목', '설 수', '첫사랑'], ['등나무꽃', '#A98BD0', '목', '다 고', '환영'], ['아카시아', '#F3F1E2', '금', '다 밝', '숨은 사랑'],
  ['산수유꽃', '#EFC94C', '목', '밝 단', '영원불변의 사랑'], ['복숭아꽃', '#F4B6C2', '목', '설 따', '매력'], ['살구꽃', '#F3C6B8', '목', '수 다', '아가씨의 수줍음'],
  ['배꽃', '#F5F4EC', '금', '고 수', '온화한 애정'], ['사과꽃', '#F3D5D8', '목', '다 밝', '명성'], ['유채꽃', '#F2D43C', '토', '밝 자', '쾌활'],
  ['메밀꽃', '#F2F0EA', '금', '고 다', '연인'], ['들국화', '#E9E3C8', '토', '고 자', '순수한 사랑'], ['구절초', '#F1EDE6', '금', '고 단', '어머니의 사랑'],
  ['쑥부쟁이', '#B7A6D9', '목', '자 수', '그리움'], ['억새꽃', '#D9CDB5', '금', '자 고', '활력'], ['갈대꽃', '#CBBE9E', '토', '자 깊', '깊은 애정'],
  ['칼라', '#F4F0E4', '금', '단 고', '천년의 사랑'], ['글라디올러스', '#E8577A', '화', '대 단', '견고함'], ['달리아', '#C23A5C', '화', '대 깊', '감사'],
  ['스위트피', '#E9B4D6', '목', '설 다', '우아한 추억'], ['블루벨', '#6F86D6', '수', '수 고', '겸손'], ['에델바이스', '#EDEDE6', '금', '단 깊', '소중한 추억'],
  ['크로커스', '#9E7BD8', '수', '밝 설', '청춘의 기쁨'], ['아이리스', '#6B5BC4', '수', '단 설', '좋은 소식'], ['매발톱꽃', '#8F6BC6', '수', '대 자', '승리의 맹세'],
  ['백일홍', '#E5583F', '화', '단 따', '인연'], ['천일홍', '#C83E7A', '화', '단 깊', '변치 않는 사랑'], ['분꽃', '#E8508A', '화', '수 자', '소심'],
  ['접시꽃', '#E9839E', '토', '따 다', '풍요'], ['부용', '#F2B5C0', '수', '다 수', '섬세한 아름다움'], ['금목서', '#F2A33A', '토', '따 깊', '진실'],
  ['은목서', '#F1EEE2', '금', '고 깊', '고결'], ['로즈마리', '#8FA3C9', '목', '고 단', '나를 생각해요'], ['캐모마일', '#F5F1E0', '토', '따 고', '역경에 굴하지 않는 강인함'],
  ['민트꽃', '#B9DCC6', '목', '자 고', '미덕'], ['올리브꽃', '#E6E3C6', '목', '고 단', '평화'], ['레몬꽃', '#F7F2DC', '금', '밝 설', '성실한 사랑'],
  ['귤꽃', '#F6F3E6', '금', '따 밝', '친애'], ['산철쭉', '#E46F98', '목', '대 자', '사랑의 즐거움'], ['시계꽃', '#7A62B8', '수', '깊 대', '열정'],
  ['아마릴리스', '#D23B48', '화', '대 설', '눈부신 아름다움'], ['포인세티아', '#C7283C', '화', '따 대', '축복'], ['시클라멘', '#E06A9C', '수', '수 깊', '수줍음'],
  ['칸나', '#E6492E', '화', '대 자', '존경'], ['극락조화', '#F28C2B', '화', '대 자', '신비'], ['블루데이지', '#6E90E0', '수', '자 밝', '협력'],
  ['스타티스', '#8A6FC9', '수', '단 고', '변치 않는 마음'], ['미모사', '#F2D44A', '토', '수 밝', '섬세한 감정'], ['마거리트', '#F5F2E6', '금', '밝 다', '진실한 사랑'],
];

/* ── 색: [이름, hex] — 오행 · 꼬리표는 색에서 계산 (hue · 밝기 · 채도) ── */
const C = [
  ['새벽 살구', '#EFA58A'], ['복숭아', '#F6B7A0'], ['코랄', '#F08070'], ['산호', '#EE7B6B'], ['홍시', '#E8613C'], ['단풍', '#C8452D'], ['다홍', '#E0473A'],
  ['진홍', '#B5192F'], ['버건디', '#7A1F33'], ['와인', '#6E1E3A'], ['장밋빛', '#D84A6A'], ['체리', '#C21E4A'], ['딸기우유', '#F6C1C9'], ['벚꽃 분홍', '#F5CFD8'],
  ['연분홍', '#F7D7DF'], ['핫핑크', '#F0407F'], ['자두', '#8E2C5E'], ['라즈베리', '#B5285B'], ['모브', '#B48AA6'], ['로즈쿼츠', '#F2C6C8'], ['라벤더', '#B9A7DA'],
  ['연보라', '#CDBDE8'], ['라일락', '#C3A6D8'], ['바이올렛', '#7B4FBF'], ['포도', '#5B2C83'], ['가지', '#3F2350'], ['자수정', '#8E5BB5'], ['하늘', '#9CC9EE'],
  ['새벽 하늘', '#B9D3EC'], ['파스텔 블루', '#AFCBEA'], ['물빛', '#A6D8E6'], ['청자', '#7DB8B2'], ['비취', '#3FA28C'], ['민트', '#9EDCC6'], ['박하', '#BDE7D4'],
  ['에메랄드', '#1F9E77'], ['청록', '#1E7C7A'], ['터키석', '#39B8B5'], ['바다', '#2C6FA8'], ['코발트', '#1F4FA8'], ['군청', '#233B8C'], ['남색', '#1E2A5C'],
  ['감청', '#263A6E'], ['심해', '#13294B'], ['밤하늘', '#1A2340'], ['먹색', '#1A1A1E'], ['숯', '#2C2B2E'], ['잿빛', '#8E8C8A'], ['은회색', '#B7B8BC'],
  ['안개', '#DCDDE0'], ['달빛', '#E9E4D4'], ['진주', '#EEE9E0'], ['상아', '#F2EAD6'], ['크림', '#F6EBCB'], ['우윳빛', '#F5F1E8'], ['백자', '#F1EFE7'],
  ['첫눈', '#F7F8FA'], ['레몬', '#F4E04D'], ['개나리', '#F3CD32'], ['해바라기', '#F2B92B'], ['겨자', '#D3A02A'], ['호박', '#E99A2C'], ['귤', '#F2922C'],
  ['오렌지', '#F07B22'], ['금빛', '#D4A84A'], ['꿀', '#E3AE4A'], ['버터', '#F4DE8C'], ['바닐라', '#F3E3B5'], ['모래', '#D8C29A'], ['베이지', '#DCC9A8'],
  ['밀크티', '#C9A784'], ['캐러멜', '#B9773A'], ['시나몬', '#A0582E'], ['초콜릿', '#5B3622'], ['커피', '#6B4A35'], ['흙', '#7E5A3C'], ['테라코타', '#C46A47'],
  ['벽돌', '#A84A35'], ['연두', '#B6D86B'], ['새싹', '#A6CF5A'], ['풀잎', '#6DAA4A'], ['올리브', '#8A8B3E'], ['이끼', '#6E7B3C'], ['쑥', '#8FA474'],
  ['세이지', '#A3B49A'], ['녹차', '#9DB36A'], ['숲', '#2F5D3A'], ['상록', '#275B47'], ['피스타치오', '#C2D6A0'], ['청포도', '#CFE29A'], ['라임', '#C6E04A'],
  ['노을', '#F09A6A'], ['석양', '#E2724A'], ['황혼', '#9A6A8E'], ['새벽 보라', '#8A82B8'], ['오로라', '#8AD6C4'], ['은하', '#4A4E8A'], ['별빛', '#E8E2B8'],
  ['연지', '#D9304A'], ['인디고', '#2E3A7A'], ['청보라', '#6C6FC8'], ['수박', '#E9576A'], ['자몽', '#F27866'], ['망고', '#F4A93A'], ['연어', '#F59E85'],
  ['피치', '#F9C5A6'], ['아쿠아', '#7FD6E0'], ['빙하', '#CFE8EE'],
];

/* ── 날씨: [이름, 오행, 꼬리표, 그림(sun · rain · snow · cloud · fog · wind · night)] ── */
const W = [
  ['맑음', '화', '밝 자', 'sun'], ['쾌청', '화', '밝 대', 'sun'], ['햇살 소나기', '수', '설 밝', 'rain'], ['소나기 뒤 맑음', '수', '설 단', 'rain'], ['여우비', '수', '설 수', 'rain'],
  ['보슬비', '수', '다 고', 'rain'], ['가랑비', '수', '고 수', 'rain'], ['이슬비', '수', '수 다', 'rain'], ['장대비', '수', '대 깊', 'rain'], ['봄비', '목', '다 설', 'rain'],
  ['첫눈', '금', '설 수', 'snow'], ['함박눈', '금', '밝 다', 'snow'], ['싸락눈', '금', '자 설', 'snow'], ['눈 그친 아침', '금', '고 밝', 'snow'], ['진눈깨비', '수', '깊 자', 'snow'],
  ['안개', '수', '고 깊', 'fog'], ['물안개', '수', '고 수', 'fog'], ['새벽 안개', '수', '깊 수', 'fog'], ['옅은 구름', '금', '고 다', 'cloud'], ['구름 조금', '금', '자 밝', 'cloud'],
  ['흐린 뒤 갬', '금', '단 설', 'cloud'], ['뭉게구름', '토', '밝 따', 'cloud'], ['양떼구름', '토', '다 자', 'cloud'], ['새털구름', '금', '자 고', 'cloud'], ['노을 지는 저녁', '화', '따 깊', 'sun'],
  ['무지개', '목', '설 밝', 'rain'], ['산들바람', '목', '자 다', 'wind'], ['봄바람', '목', '설 따', 'wind'], ['가을바람', '금', '고 자', 'wind'], ['바닷바람', '수', '자 대', 'wind'],
  ['서늘한 밤', '수', '고 깊', 'night'], ['열대야', '화', '대 설', 'night'], ['한여름 정오', '화', '대 밝', 'sun'], ['가을 하늘', '금', '밝 고', 'sun'], ['겨울 햇살', '토', '따 다', 'sun'],
  ['늦은 오후 볕', '토', '따 고', 'sun'], ['별 많은 밤', '수', '설 깊', 'night'], ['보름달 밤', '토', '따 깊', 'night'], ['초승달 밤', '수', '수 설', 'night'], ['이슬 맺힌 새벽', '수', '수 고', 'fog'],
  ['서리 내린 아침', '금', '단 고', 'snow'], ['고요한 눈밤', '금', '고 깊', 'snow'], ['천둥 뒤 정적', '목', '대 깊', 'rain'], ['먹구름 사이 빛', '화', '단 대', 'cloud'], ['해무', '수', '깊 자', 'fog'],
  ['꽃샘추위', '목', '단 수', 'wind'], ['따뜻한 겨울날', '토', '따 다', 'sun'], ['장마 사이 맑은 날', '화', '밝 설', 'sun'], ['소나기 직전', '수', '설 대', 'cloud'], ['첫서리', '금', '단 수', 'snow'],
  ['동트는 하늘', '목', '설 밝', 'sun'], ['비 갠 오후', '목', '밝 다', 'rain'], ['바람 부는 언덕', '목', '자 대', 'wind'],
];

/* ── 추가 단어 (골드): 계절 · 동물 · 향 — [이름, 꼬리표] · 규칙으로 정함(확률 아님 · 같은 날 같은 답이면 같은 단어) ── */
const XS = [['이른 봄', '설 수'], ['초봄', '설 밝'], ['봄 한가운데', '밝 따'], ['늦봄', '다 고'], ['초여름', '자 밝'], ['한여름', '대 밝'], ['늦여름', '따 깊'], ['초가을', '고 다'],
  ['가을 한가운데', '깊 고'], ['늦가을', '깊 단'], ['초겨울', '고 단'], ['한겨울', '단 깊'], ['늦겨울', '수 단'], ['입춘', '설 단'], ['경칩', '자 설'], ['청명', '밝 고'],
  ['곡우', '다 고'], ['입하', '밝 자'], ['하지', '대 밝'], ['처서', '고 따'], ['백로', '고 수'], ['상강', '깊 단'], ['입동', '단 고'], ['동지', '깊 따']];
const XA = [['수달', '자 다'], ['고양이', '자 수'], ['여우', '설 대'], ['사슴', '수 고'], ['고래', '깊 고'], ['돌고래', '밝 자'], ['해달', '다 따'], ['판다', '따 고'],
  ['레서판다', '수 밝'], ['토끼', '수 설'], ['다람쥐', '밝 자'], ['부엉이', '깊 단'], ['올빼미', '고 깊'], ['백조', '단 고'], ['두루미', '고 단'], ['펭귄', '다 단'],
  ['코알라', '고 따'], ['알파카', '다 자'], ['강아지', '따 밝'], ['진돗개', '단 다'], ['늑대', '대 깊'], ['곰', '따 단'], ['북극곰', '단 고'], ['호랑이', '대 단'],
  ['표범', '대 자'], ['치타', '자 대'], ['말', '자 단'], ['거북이', '고 단'], ['해파리', '자 깊'], ['나비', '설 자'], ['벌새', '설 밝'], ['참새', '밝 다'],
  ['까치', '밝 설'], ['고슴도치', '수 단'], ['너구리', '자 밝'], ['햄스터', '수 다'], ['오리', '밝 따'], ['홍학', '설 대'], ['앵무새', '밝 대'], ['비버', '단 따']];
const XC = [['무화과', '깊 따'], ['비누', '다 고'], ['시트러스', '밝 자'], ['베르가못', '설 밝'], ['라벤더', '고 깊'], ['장미', '설 대'], ['재스민', '다 설'], ['머스크', '깊 다'],
  ['샌달우드', '깊 단'], ['시더우드', '단 고'], ['바닐라', '따 다'], ['화이트 티', '고 수'], ['녹차', '고 단'], ['민트', '자 밝'], ['레몬', '밝 설'], ['자몽', '밝 자'],
  ['복숭아', '다 수'], ['벚꽃', '설 수'], ['프리지아', '밝 설'], ['은방울꽃', '수 다'], ['갓 구운 빵', '따 다'], ['커피', '깊 따'], ['시나몬', '따 대'], ['앰버', '깊 따'],
  ['바다 소금', '자 대'], ['비 냄새', '고 깊'], ['풀 냄새', '자 밝'], ['이끼', '고 깊'], ['장작불', '따 대'], ['가죽', '대 단'], ['코튼', '다 고'], ['파우더', '수 다'],
  ['오렌지꽃', '밝 따'], ['일랑일랑', '대 설'], ['통카빈', '따 깊'], ['히노키', '단 고'], ['유자', '밝 따'], ['배', '수 밝'], ['무스카트', '설 밝'], ['솔잎', '단 자']];

/* 색 → 오행 · 꼬리표 */
function hsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}
export function colorEl(hex) {
  const [h, s, l] = hsl(hex);
  if (l > .9 || s < .12) return l < .3 ? 'water' : 'metal';
  if (l < .2) return 'water';
  if (h < 18 || h >= 330) return 'fire';
  if (h < 65) return h < 40 && s > .7 && l < .55 ? 'fire' : 'earth';
  if (h < 165) return 'wood';
  if (h < 250) return 'water';
  return h < 290 ? 'water' : 'fire';
}
export function colorTags(hex) {
  const [h, s, l] = hsl(hex), t = [];
  if (l > .78) t.push(s > .4 ? 'tender' : 'calm'); else if (l < .32) t.push('deep'); else t.push(s > .6 ? 'bold' : 'firm');
  if (s > .65 && l > .4 && l < .75) t.push((h < 70 || h > 330) ? 'bright' : 'spark');
  else if (h >= 330 || h < 50) t.push(l > .7 ? 'shy' : 'warm');
  else if (h >= 160 && h < 260) t.push(l > .6 ? 'free' : 'calm');
  else if (h >= 260 && h < 330) t.push(l > .6 ? 'shy' : 'deep');
  else t.push(l > .6 ? 'bright' : 'firm');
  return [...new Set(t)];
}
const id3 = (p, i) => p + String(i + 1).padStart(3, '0');
export const FLOWERS = F.map(([w, hex, el, t, m], i) => ({ id: id3('f', i), w, hex, el: E[el], t: T(t), m }));
export const COLORS = C.map(([w, hex], i) => ({ id: id3('c', i), w, hex, el: colorEl(hex), t: colorTags(hex) }));
export const WEATHERS = W.map(([w, el, t, ic], i) => ({ id: id3('w', i), w, el: E[el], t: T(t), ic }));
export const EXTRA = {
  season: { ko: '계절', list: XS.map(([w, t], i) => ({ id: id3('s', i), w, t: T(t) })) },
  animal: { ko: '동물', list: XA.map(([w, t], i) => ({ id: id3('a', i), w, t: T(t) })) },
  scent: { ko: '향', list: XC.map(([w, t], i) => ({ id: id3('x', i), w, t: T(t) })) },
};
export const EXTRA_KEYS = ['season', 'animal', 'scent'];
export const LIST = { flower: FLOWERS, color: COLORS, weather: WEATHERS };
export const flowerById = id => FLOWERS.find(x => x.id === id) || null;

/* ── 질문 풀 (2026-11-03 대표: "질문이 매번 똑같은 건 아니지?") — 칸 5개 × 12개 + 계절 질문
   칸: 1 감각 · 2 하늘/색(색 칩) · 3 사람 대하는 태도 · 4 내려놓을 것 · 5 소리/분위기
   보기: [글, 꼬리표 두 개, 오행 힌트?, 색?] · m: 그 달에만 나오는 계절 질문 · id 는 바꾸지 않음(서버 캐시 키 · 지난 기록)
   하루에 칸마다 하나 → 같은 날은 모두 같은 질문(친구끼리 비교) · 최근 7일 안에 같은 질문 다시 안 나옴 (dayQuestions) */
const Q1 = [
  ['q1-01', '지금 손에 쥐고 싶은 건?', '첫 느낌으로 골라요', [['따뜻한 머그', 'warm tender'], ['차가운 캔커피', 'bold bright'], ['펜 한 자루', 'firm deep'], ['아무것도 — 빈손', 'free calm']]],
  ['q1-02', '지금 입에 넣고 싶은 맛은?', '배고픈 거 말고, 기분으로', [['달콤한 초콜릿 한 조각', 'warm shy'], ['새콤한 귤', 'bright spark'], ['쌉쌀한 커피', 'deep firm'], ['미지근한 물 한 잔', 'calm free']]],
  ['q1-03', '지금 덮고 싶은 건?', '', [['포근한 담요', 'warm tender'], ['바삭한 이불', 'bright calm'], ['남의 외투', 'shy spark'], ['아무것도, 바람', 'free bold']]],
  ['q1-04', '오늘 신고 나가고 싶은 신발은?', '', [['낡은 운동화', 'free warm'], ['굽 있는 구두', 'bold firm'], ['슬리퍼', 'calm free'], ['새로 산 신발', 'spark bright']]],
  ['q1-05', '지금 손끝에 닿았으면 하는 건?', '', [['고양이 털', 'tender shy'], ['차가운 유리잔', 'calm firm'], ['종이책 모서리', 'deep calm'], ['누군가의 손', 'warm spark']]],
  ['q1-06', '지금 맡고 싶은 냄새는?', '', [['갓 구운 빵', 'warm bright'], ['비 온 뒤 흙', 'calm deep'], ['새 책', 'firm shy'], ['바다 바람', 'free bold']]],
  ['q1-07', '오늘 마시고 싶은 한 잔은?', '', [['따뜻한 라테', 'warm tender'], ['탄산수', 'bright free'], ['진한 에스프레소', 'bold deep'], ['보리차', 'calm shy']]],
  ['q1-08', '지금 앉고 싶은 자리는?', '', [['창가 구석', 'shy calm'], ['한가운데', 'bold bright'], ['계단 끝', 'free deep'], ['푹신한 소파', 'warm tender']]],
  ['q1-09', '가방에 하나만 넣는다면?', '', [['이어폰', 'free calm'], ['작은 수첩', 'firm deep'], ['립밤', 'tender shy'], ['간식', 'warm bright']]],
  ['q1-10', '지금 걷고 싶은 길은?', '', [['낙엽 깔린 길', 'deep warm'], ['바닷가 모래', 'free bright'], ['조용한 골목', 'calm shy'], ['불 켜진 번화가', 'spark bold']]],
  ['q1-11', '오늘 머리를 어떻게 하고 싶어?', '', [['질끈 묶기', 'firm bold'], ['자연스럽게 풀기', 'free tender'], ['모자로 덮기', 'shy calm'], ['새로 잘라 버리기', 'spark bold']]],
  ['q1-12', '지금 손에 쥔 게 꽃이라면?', '', [['한 송이', 'deep firm'], ['한 아름', 'bright warm'], ['말린 꽃', 'calm shy'], ['길가에서 꺾은 들꽃', 'free spark']]],
  ['q1-s1', '첫눈이 오면 제일 먼저 할 일은?', '11월의 질문', [['사진 찍어 누구에게 보내기', 'warm spark'], ['창밖 보며 가만히', 'calm deep'], ['밖으로 뛰어나가기', 'bold free'], ['붕어빵 사러 가기', 'tender bright']], [11, 12, 1]],
  ['q1-s2', '가을 저녁 산책길, 손에 들고 싶은 건?', '이맘때의 질문', [['군고구마 봉지', 'warm tender'], ['줍다 만 낙엽', 'shy deep'], ['따뜻한 캔커피', 'calm bright'], ['아무것도, 주머니에 손', 'free firm']], [9, 10, 11]],
  ['q1-s3', '벚꽃이 피면 제일 먼저 하고 싶은 건?', '이맘때의 질문', [['혼자 걷기', 'calm free'], ['누군가 불러내기', 'spark warm'], ['사진 한 장', 'shy tender'], ['돗자리 펴기', 'bright bold']], [3, 4]],
  ['q1-s4', '한여름 밤, 손에 들고 싶은 건?', '이맘때의 질문', [['얼음 동동 음료', 'bright free'], ['부채', 'calm tender'], ['수박 한 조각', 'warm bright'], ['폭죽', 'bold spark']], [6, 7, 8]],
];
const Q2 = [
  ['q2-01', '오늘 하늘을 하나 고른다면?', '색만 보고 골라도 돼요', [['새벽 남색', 'deep calm', 'water', '#2C3A63'], ['정오 하늘', 'bright free', 'wood', '#9CC3E6'], ['노을 살구', 'warm tender', 'fire', '#EFA58A'], ['한밤 먹색', 'deep firm', 'metal', '#17151A']]],
  ['q2-02', '오늘 입고 싶은 색은?', '', [['크림', 'tender calm', 'metal', '#F2EAD6'], ['버건디', 'bold deep', 'fire', '#7A1F33'], ['올리브', 'firm calm', 'wood', '#8A8B3E'], ['하늘색', 'free bright', 'water', '#9CC9EE']]],
  ['q2-03', '방 벽을 칠한다면?', '', [['연두', 'bright spark', 'wood', '#B6D86B'], ['라벤더', 'shy tender', 'water', '#B9A7DA'], ['테라코타', 'warm firm', 'earth', '#C46A47'], ['먹색', 'deep bold', 'water', '#1A1A1E']]],
  ['q2-04', '지금 마음 색은?', '고민 말고 손이 가는 쪽', [['연분홍', 'shy tender', 'fire', '#F7D7DF'], ['겨자', 'warm bold', 'earth', '#D3A02A'], ['청록', 'calm deep', 'wood', '#1E7C7A'], ['은회색', 'calm firm', 'metal', '#B7B8BC']]],
  ['q2-05', '오늘의 노을 색은?', '', [['복숭아', 'tender warm', 'fire', '#F6B7A0'], ['다홍', 'bold spark', 'fire', '#E0473A'], ['보라', 'deep shy', 'water', '#8A82B8'], ['금빛', 'bright warm', 'earth', '#D4A84A']]],
  ['q2-06', '편지지를 고른다면?', '', [['백자', 'calm firm', 'metal', '#F1EFE7'], ['하늘', 'free bright', 'water', '#AFCBEA'], ['살구', 'warm shy', 'fire', '#F3C6B8'], ['숲', 'deep firm', 'wood', '#2F5D3A']]],
  ['q2-07', '오늘 바다 색은?', '', [['에메랄드', 'bright spark', 'wood', '#1F9E77'], ['코발트', 'bold deep', 'water', '#1F4FA8'], ['물빛', 'calm tender', 'water', '#A6D8E6'], ['잿빛', 'calm deep', 'metal', '#8E8C8A']]],
  ['q2-08', '우산을 하나 고른다면?', '', [['노랑', 'bright warm', 'earth', '#F3CD32'], ['투명', 'free calm', 'metal', '#E9ECEF'], ['검정', 'firm deep', 'water', '#1A1A1E'], ['체크무늬 빨강', 'bold spark', 'fire', '#C21E4A']]],
  ['q2-09', '책 표지를 고른다면?', '', [['초록 천', 'calm firm', 'wood', '#275B47'], ['분홍 종이', 'tender spark', 'fire', '#F2C6C8'], ['남색 가죽', 'deep firm', 'water', '#1E2A5C'], ['베이지 리넨', 'calm warm', 'earth', '#DCC9A8']]],
  ['q2-10', '오늘 손톱 색은?', '', [['투명', 'calm shy', 'metal', '#F5F1E8'], ['체리', 'bold spark', 'fire', '#C21E4A'], ['민트', 'free bright', 'wood', '#9EDCC6'], ['모브', 'deep tender', 'water', '#B48AA6']]],
  ['q2-11', '꽃다발 포장지 색은?', '', [['크라프트', 'warm calm', 'earth', '#C9A784'], ['연보라', 'shy tender', 'water', '#CDBDE8'], ['흰 종이', 'calm firm', 'metal', '#F7F8FA'], ['레몬', 'bright spark', 'earth', '#F4E04D']]],
  ['q2-12', '지금 창밖이 이런 색이면 좋겠다', '', [['새벽 보라', 'deep shy', 'water', '#8A82B8'], ['초록 잎', 'bright free', 'wood', '#6DAA4A'], ['오후 볕', 'warm tender', 'earth', '#F3E3B5'], ['비 오는 회색', 'calm deep', 'metal', '#8E8C8A']]],
  ['q2-s1', '첫눈 오는 날, 하늘은 어떤 색?', '11월의 질문', [['우윳빛', 'tender calm', 'metal', '#F5F1E8'], ['새벽 남색', 'deep shy', 'water', '#2C3A63'], ['분홍 노을', 'warm spark', 'fire', '#F5CFD8'], ['은회색', 'firm calm', 'metal', '#B7B8BC']], [11, 12, 1]],
  ['q2-s2', '단풍 길에서 고르는 잎 하나', '이맘때의 질문', [['빨강', 'bold warm', 'fire', '#C8452D'], ['노랑', 'bright tender', 'earth', '#F2B92B'], ['갈색', 'calm deep', 'earth', '#7E5A3C'], ['아직 초록', 'free firm', 'wood', '#6DAA4A']], [10, 11]],
  ['q2-s3', '봄 아침 하늘을 고른다면?', '이맘때의 질문', [['연두빛 안개', 'tender calm', 'wood', '#CFE29A'], ['벚꽃 분홍', 'shy spark', 'fire', '#F5CFD8'], ['맑은 하늘', 'bright free', 'water', '#9CC9EE'], ['흐린 회색', 'calm deep', 'metal', '#B7B8BC']], [3, 4, 5]],
];
const Q3 = [
  ['q3-01', '누가 먼저 말을 걸면?', '평소의 나 말고, 오늘의 나', [['먼저 웃는다', 'bright warm'], ['일단 듣는다', 'calm tender'], ['한 박자 늦게 답한다', 'shy deep'], ['이어폰부터 뺀다', 'free spark']]],
  ['q3-02', '친구가 늦는다고 하면?', '', [['괜찮아, 천천히 와', 'tender calm'], ['그럼 먼저 시킨다', 'bold free'], ['근처를 한 바퀴', 'free bright'], ['조금 서운한 티 내기', 'shy warm']]],
  ['q3-03', '모르는 사람이 길을 물으면?', '', [['같이 걸어가 준다', 'warm tender'], ['지도 앱을 켜 준다', 'firm bright'], ['손가락으로 가리킨다', 'calm free'], ['나도 처음이라 웃는다', 'shy spark']]],
  ['q3-04', '단톡방에 내가 할 말은?', '', [['ㅋㅋㅋ', 'bright free'], ['읽고 나서 하트', 'tender shy'], ['정리 한 줄', 'firm calm'], ['갑자기 사진 투척', 'spark bold']]],
  ['q3-05', '오늘 칭찬을 들으면?', '', [['고맙다고 크게', 'bright bold'], ['아니라고 손사래', 'shy tender'], ['속으로 오래 곱씹기', 'deep calm'], ['칭찬으로 돌려주기', 'warm spark']]],
  ['q3-06', '부탁을 받으면 오늘의 나는?', '', [['일단 해 준다', 'warm tender'], ['솔직하게 거절', 'bold firm'], ['조건을 붙인다', 'firm spark'], ['하루만 생각해 볼게', 'calm deep']]],
  ['q3-07', '처음 보는 자리에 가면?', '', [['먼저 인사', 'bright bold'], ['아는 얼굴 찾기', 'shy warm'], ['음식 쪽으로', 'free calm'], ['분위기부터 읽기', 'deep firm']]],
  ['q3-08', '누가 울고 있으면?', '', [['말없이 휴지', 'tender calm'], ['안아 준다', 'warm bold'], ['이유를 묻는다', 'deep firm'], ['자리를 비켜 준다', 'shy free']]],
  ['q3-09', '오늘 연락하고 싶은 사람은?', '', [['오래 못 본 친구', 'deep warm'], ['방금 헤어진 사람', 'spark tender'], ['가족', 'warm calm'], ['아무에게도', 'free shy']]],
  ['q3-10', '말다툼이 생기면?', '', [['바로 풀기', 'bold warm'], ['하룻밤 자고', 'calm deep'], ['편지로 쓰기', 'shy tender'], ['맛있는 걸 사 들고', 'bright free']]],
  ['q3-11', '선물을 고를 때 나는?', '', [['쓸모 있는 것', 'firm calm'], ['예쁜 것', 'spark tender'], ['손으로 만든 것', 'warm deep'], ['그날 끌린 것', 'free bold']]],
  ['q3-12', '오늘 누가 내 얘기를 들어 준다면?', '', [['길게 털어놓기', 'deep warm'], ['웃긴 얘기만', 'bright free'], ['결론만 짧게', 'firm bold'], ['그냥 옆에 있어 줘', 'calm shy']]],
  ['q3-s1', '연말 모임에 초대받으면?', '이맘때의 질문', [['제일 먼저 간다', 'bright bold'], ['선물 하나 챙긴다', 'tender warm'], ['조금 늦게 조용히', 'shy calm'], ['아는 사람만 만난다', 'firm deep']], [11, 12]],
];
const Q4 = [
  ['q4-01', '오늘 하나만 내려놓는다면?', '', [['미련', 'free bright'], ['눈치', 'bold free'], ['피곤', 'calm warm'], ['계획', 'spark free']]],
  ['q4-02', '오늘 안 해도 되는 일 하나는?', '', [['답장', 'free calm'], ['설거지', 'warm bright'], ['운동', 'tender shy'], ['비교', 'firm deep']]],
  ['q4-03', '가방에서 하나 빼고 나간다면?', '', [['보조배터리', 'free bold'], ['화장품 파우치', 'calm bright'], ['우산', 'spark free'], ['걱정', 'warm tender']]],
  ['q4-04', '오늘 꺼 두고 싶은 건?', '', [['알림', 'calm free'], ['불', 'deep shy'], ['생각', 'calm tender'], ['자존심', 'warm bold']]],
  ['q4-05', '지금 지우고 싶은 건?', '', [['보낸 메시지 하나', 'shy spark'], ['사진첩 정리', 'firm bright'], ['어제 실수', 'tender calm'], ['할 일 목록', 'free bold']]],
  ['q4-06', '오늘 미뤄도 되는 건?', '', [['결정', 'calm deep'], ['약속', 'free shy'], ['청소', 'warm free'], ['다이어트', 'bright bold']]],
  ['q4-07', '내려놓으면 가벼워질 것 같은 말은?', '', [['괜찮아', 'tender deep'], ['미안해', 'shy warm'], ['나중에', 'firm bold'], ['어쩌지', 'calm bright']]],
  ['q4-08', '오늘 버리고 싶은 습관은?', '', [['새벽 스크롤', 'calm firm'], ['한숨', 'bright warm'], ['혼잣말 자책', 'tender deep'], ['늦장', 'bold spark']]],
  ['q4-09', '오늘 놓아주고 싶은 사람(마음)은?', '이름 말고 마음만', [['서운한 마음', 'tender calm'], ['잘 보이고 싶은 마음', 'free shy'], ['이기고 싶은 마음', 'calm warm'], ['기다리는 마음', 'free spark']]],
  ['q4-10', '오늘 내려놓을 숫자는?', '', [['체중계 숫자', 'bright free'], ['통장 잔고', 'calm deep'], ['좋아요 수', 'firm tender'], ['나이', 'spark bold']]],
  ['q4-11', '마음속 서랍에서 하나 비운다면?', '', [['오래된 영수증', 'firm calm'], ['못 보낸 편지', 'shy deep'], ['남의 기대', 'free bold'], ['어릴 적 걱정', 'tender warm']]],
  ['q4-12', '오늘은 이것만 빼고 다 할래', '', [['일찍 일어나기', 'warm free'], ['참기', 'bold spark'], ['정리하기', 'free bright'], ['꾸미기', 'calm tender']]],
  ['q4-s1', '올해가 가기 전에 내려놓을 것', '이맘때의 질문', [['못다 한 계획', 'calm free'], ['묵은 서운함', 'tender warm'], ['완벽하려는 마음', 'free bright'], ['미뤄 둔 연락', 'bold spark']], [11, 12]],
];
const Q5 = [
  ['q5-01', '지금 듣고 싶은 소리는?', '마지막 질문이에요', [['빗소리', 'calm deep', 'water'], ['파도', 'free bold', 'water'], ['카페 소음', 'warm bright', 'fire'], ['완전한 고요', 'calm shy', 'metal']]],
  ['q5-02', '오늘 하루의 배경음악은?', '마지막 질문이에요', [['피아노 한 곡', 'calm deep', 'metal'], ['신나는 팝', 'bright spark', 'fire'], ['오래된 가요', 'warm tender', 'earth'], ['아무 노래나 셔플', 'free bold', 'wood']]],
  ['q5-03', '지금 있고 싶은 곳의 분위기는?', '마지막 질문이에요', [['도서관', 'calm firm', 'metal'], ['포장마차', 'warm bold', 'fire'], ['숲속', 'free calm', 'wood'], ['바닷가 벤치', 'deep free', 'water']]],
  ['q5-04', '창문을 열면 들렸으면 하는 건?', '마지막 질문이에요', [['새소리', 'bright tender', 'wood'], ['자동차 소리 없음', 'calm shy', 'metal'], ['멀리 기차 소리', 'deep free', 'earth'], ['아이들 웃음', 'warm bright', 'fire']]],
  ['q5-05', '잠들기 전 듣고 싶은 소리는?', '마지막 질문이에요', [['장작 타는 소리', 'warm calm', 'fire'], ['선풍기 소리', 'calm free', 'metal'], ['좋아하는 목소리', 'tender spark', 'fire'], ['비 오는 창', 'deep shy', 'water']]],
  ['q5-06', '오늘을 영화로 찍는다면 장르는?', '마지막 질문이에요', [['잔잔한 일상물', 'calm tender', 'earth'], ['로맨스', 'spark warm', 'fire'], ['로드 무비', 'free bold', 'wood'], ['미스터리', 'deep firm', 'water']]],
  ['q5-07', '지금 켜 두고 싶은 불빛은?', '마지막 질문이에요', [['작은 스탠드', 'warm shy', 'fire'], ['초 한 자루', 'deep calm', 'fire'], ['형광등 환하게', 'bright firm', 'metal'], ['창밖 달빛만', 'calm free', 'water']]],
  ['q5-08', '오늘 들어가 보고 싶은 가게는?', '마지막 질문이에요', [['레코드 가게', 'deep spark', 'water'], ['꽃집', 'tender bright', 'wood'], ['오래된 서점', 'calm firm', 'earth'], ['문 연 지 하루 된 곳', 'bold free', 'fire']]],
  ['q5-09', '지금 들리는 소리 중 하나만 남긴다면?', '마지막 질문이에요', [['내 숨소리', 'calm deep', 'metal'], ['시계 초침', 'firm shy', 'metal'], ['멀리 대화 소리', 'warm free', 'earth'], ['바람 소리', 'free bright', 'wood']]],
  ['q5-10', '오늘 저녁 분위기는?', '마지막 질문이에요', [['혼자 라면', 'calm free', 'water'], ['둘이 와인', 'spark tender', 'fire'], ['여럿이 시끌벅적', 'bright bold', 'fire'], ['일찍 불 끄기', 'deep shy', 'water']]],
  ['q5-11', '지금 걸린 노래 제목이 이렇다면?', '마지막 질문이에요', [['그대로 있어 줘', 'tender calm', 'earth'], ['어디든 가자', 'free spark', 'wood'], ['오늘은 내가', 'bold bright', 'fire'], ['밤의 끝에서', 'deep shy', 'water']]],
  ['q5-12', '지금 방 안 공기는?', '마지막 질문이에요', [['따뜻하고 노랗다', 'warm bright', 'earth'], ['서늘하고 맑다', 'calm firm', 'metal'], ['촉촉하고 낮다', 'deep tender', 'water'], ['환기가 필요하다', 'free bold', 'wood']]],
  ['q5-s1', '겨울밤 창밖에서 들렸으면 하는 소리는?', '이맘때의 질문', [['눈 밟는 소리', 'calm shy', 'metal'], ['멀리 캐럴', 'warm spark', 'fire'], ['바람 소리', 'deep free', 'water'], ['군밤 장수 목소리', 'bright warm', 'earth']], [11, 12, 1, 2]],
  ['q5-s2', '크리스마스 거리에서 듣고 싶은 소리는?', '이맘때의 질문', [['종소리', 'bright spark', 'metal'], ['캐럴 합창', 'warm bold', 'fire'], ['조용한 눈', 'calm deep', 'water'], ['친구 웃음', 'tender bright', 'fire']], [12]],
];
const mkQ = ([id, q, sub, o, m]) => ({ id, q, sub, o, ...(m ? { m } : {}), sw: id.startsWith('q2') });
export const QPOOL = [Q1, Q2, Q3, Q4, Q5].map(L => L.map(mkQ));
export const QUESTION_BY_ID = Object.fromEntries(QPOOL.flat().map(x => [x.id, x]));
export const QUESTIONS = QPOOL.map(L => L[0]);   /* 지금 화면에 나오는 고정 질문 5개 */
/* 매일 바뀌는 질문: 2026-11-03 대표 지시로 재미 설계를 사업 · 분석과 다시 협의 중 → 꺼 둠 (화면 · 서버 연결도 아직)
   켜면 profile 이 그날 질문(dayQuestions)으로 계산함 — 화면(oneword-ui.js question) · 서버(qa 문구 · 캐시 키) 를 같이 바꿔야 함 */
export const DAILY_Q = false;

/* 그날의 질문 5개: 칸마다 날짜 씨앗으로 하나 · 그 달의 계절 질문은 두 배 자주 · 최근 7일(앞 6일) 안에 나온 건 빼고
   2026-10-01 부터 하루씩 차례로 정해 나가므로 누구에게나 같음 (계산은 한 번 · 캐시) */
const QEPOCH = '2026-10-01', QMEMO = new Map();
const dayAdd = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
function pickQ(day, slot, recent) {
  const mon = Number(day.slice(5, 7)), ok = QPOOL[slot].filter(x => (!x.m || x.m.includes(mon)) && !recent.includes(x.id));
  const bag = ok.flatMap(x => (x.m ? [x, x] : [x]));
  return bag[fnv(`q|${day}|${slot}`) % bag.length];
}
export function dayQuestions(day) {
  if (QMEMO.has(day)) return QMEMO.get(day);
  if (day < QEPOCH) { const v = QPOOL.map((_, s) => pickQ(day, s, [])); QMEMO.set(day, v); return v; }
  let d = QMEMO.size ? [...QMEMO.keys()].filter(k => k >= QEPOCH && k < day).sort().pop() : null;
  if (!d) { d = QEPOCH; QMEMO.set(d, QPOOL.map((_, s) => pickQ(d, s, []))); }
  while (d < day) {
    const nd = dayAdd(d, 1), past = [1, 2, 3, 4, 5, 6].map(k => QMEMO.get(dayAdd(nd, -k))).filter(Boolean);
    QMEMO.set(nd, QPOOL.map((_, s) => pickQ(nd, s, past.map(v => v[s].id)))); d = nd;
  }
  return QMEMO.get(day);
}
export const dayQids = day => dayQuestions(day).map(x => x.id);
export const validAnswers = a => Array.isArray(a) && a.length === 5 && a.every(x => Number.isInteger(x) && x >= 0 && x < 4);

/* ── 씨앗 · 해시 (서버 api/oneword.js 의 fnv · ruleIndex 와 같은 식) ── */
export const fnv = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const seedOf = (day, il, a) => `${day}|${il}|${a.join('')}`;
export const ruleIndex = (seed, cat, n) => fnv(seed + '|' + cat) % Math.min(3, n);   /* 서버가 안 될 때: 위 3개 중 하나 */

/* 답 → 꼬리표 무게 · 오행 힌트 */
export function profile(a, day) {
  const qs = DAILY_Q && day ? dayQuestions(day) : QUESTIONS, w = Object.fromEntries(TAGS.map(t => [t, 0])), el = Object.fromEntries(ELS.map(e => [e, 0]));
  a.forEach((x, i) => { const o = qs[i].o[x]; o[1].split(' ').forEach(t => { w[t] += 1; }); if (o[2]) el[o[2]] += 1; });
  return { w, el };
}
export const topTags = (a, n = 2, day) => { const { w } = profile(a, day); return TAGS.slice().sort((x, y) => w[y] - w[x] || TAGS.indexOf(x) - TAGS.indexOf(y)).slice(0, n); };

/* 점수: 꼬리표 겹침 + 오늘 일진 오행(같으면 +1.6 · 일진이 낳는 오행 +.8) + 답의 오행 힌트 + 씨앗 흔들기(0~.9 · 같은 날 같은 답이면 같음) */
function score(item, P, il, seed) {
  let s = item.t.reduce((a, t) => a + (P.w[t] || 0), 0);
  if (item.el) { if (item.el === il) s += 1.6; else if (GEN[il] === item.el) s += .8; s += (P.el[item.el] || 0) * .7; }
  return s + (fnv(seed + '#' + item.id) % 1000) / 1000 * .9;
}
/* 후보 좁히기: 꽃 · 색 · 날씨마다 n개(3~5, 기본 4) — 순서는 점수 높은 순 */
export function candidates(a, il, day, n = 4) {
  const P = profile(a, day), seed = seedOf(day, il, a), k = Math.max(3, Math.min(5, n)), out = {};
  for (const [cat, list] of Object.entries(LIST)) out[cat] = list.map(x => [x, score(x, P, il, seed)]).sort((p, q) => q[1] - p[1]).slice(0, k).map(p => p[0]);
  return out;
}
/* v2 '자연' 주제 (2026-11-03): 꽃 · 색 · 날씨 카드를 그대로 쓰되 꼬리표 무게는 v2 질문 답에서 (oneword-v2.js) */
export function natureCand(w, il, seed, n = 4) {
  const P = { w, el: Object.fromEntries(ELS.map(e => [e, 0])) }, out = {};
  for (const [cat, list] of Object.entries(LIST)) out[cat] = list.map(x => [x, score(x, P, il, seed)]).sort((p, q) => q[1] - p[1]).slice(0, n).map(p => p[0]);
  return out;
}
/* 추가 단어: 꼬리표 점수 1등 (같은 날 같은 답 = 같은 단어 · 확률 아님) */
export function extraWord(key, a, il, day) {
  const P = profile(a, day), seed = seedOf(day, il, a);
  return EXTRA[key].list.map(x => [x, score(x, P, il, seed)]).sort((p, q) => q[1] - p[1])[0][0];
}
/* 서버로 보낼 후보 (단어 · 꼬리표 · 꽃말만) */
export const wireCand = c => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.map(x => ({ id: x.id, w: x.w, t: x.t, ...(x.m ? { m: x.m } : {}) }))]));

/* ── 준비된 풀이 문장 (서버가 안 될 때) — 첫째 꼬리표마다 둘 · {f} 꽃 {c} 색 {w} 날씨 ── */
export const LINES = {
  warm: ['{w}처럼, 옆에 있으면 공기가 한 칸 데워지는 사람.', '말보다 온도로 마음을 전하는 {f} 같은 사람.'],
  calm: ['소리 없이 주변을 맑게 가라앉히는 사람.', '{w} 속에서도 자기 속도를 잃지 않는 사람.'],
  spark: ['조용하다가도 한 번 웃으면 장면이 바뀌는 사람.', '{c} 빛처럼, 오늘 누군가의 기억에 남을 사람.'],
  firm: ['흔들려도 뿌리는 그대로인 {f} 같은 사람.', '한번 정하면 끝까지 가는, 믿음이 가는 사람.'],
  free: ['정해진 길보다 바람 부는 쪽이 더 잘 어울리는 사람.', '{w}처럼, 머무를 줄도 떠날 줄도 아는 사람.'],
  tender: ['다정함을 티 내지 않고 건네는 사람.', '{c}처럼 부드럽게 스며드는 사람.'],
  deep: ['겉은 잔잔해도 속은 깊은 물 같은 사람.', '오래 볼수록 결이 보이는 {f} 같은 사람.'],
  bright: ['들어서는 순간 방이 환해지는 사람.', '{w} 아래 {f}처럼 숨김없이 피어나는 사람.'],
  shy: ['꽉 오므렸다가, 한 번 피면 방 안 공기를 바꾸는 사람.', '수줍게 웃지만 할 말은 다 하는 사람.'],
  bold: ['망설임보다 한 걸음이 먼저인 사람.', '{c}처럼 선명하게 자기 색을 내는 사람.'],
};
export function ruleLine(a, seed, pick) {
  const t = topTags(a, 1, String(seed).split('|')[0])[0], arr = LINES[t];
  return arr[fnv(seed + '|line') % arr.length].replace('{f}', pick.flower.w).replace('{c}', pick.color.w).replace('{w}', pick.weather.w);
}
/* 규칙으로 고르기 (서버 실패 · 꺼짐) */
export function pickRule(cand, seed) {
  return { flower: cand.flower[ruleIndex(seed, 'flower', cand.flower.length)], color: cand.color[ruleIndex(seed, 'color', cand.color.length)], weather: cand.weather[ruleIndex(seed, 'weather', cand.weather.length)] };
}

/* 오늘 일진의 오행: 일주 천간(60갑자 · 2026-10-30 = 정축일 기준 · fortune.js todayPillar 와 같음 — 서버 api/oneword.js ilgin 과 같은 식) */
const STEM_EL = ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'];
export function ilgin(day) { const n = Math.round((Date.parse(day + 'T00:00:00Z') - Date.parse('2026-10-30T00:00:00Z')) / 864e5); return STEM_EL[((3 + n) % 10 + 10) % 10]; }
