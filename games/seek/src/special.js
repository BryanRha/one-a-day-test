// 특별 선택지 (대표 승인 2026-10-28) — 화마다 2지선다 아래 셋째 버튼 「💗 특별 선택지 · 🪙30」
//   골라도 줄거리 · 단서 · 결말은 그대로 (무료 선택지로도 끝까지 같은 이야기) · 보너스 장면(설렘 · 숨은 진실 한 조각) + 추억 카드
//   상품: SHOP.seek.choiceN (N = 화 번호 ep.no 1~20, 🪙30, item — 계정에 남음 · 다음 실행부터 hello().items 로 복원)
//   첫 1회는 맛보기 무료 (기기 저장) · 광고로는 열지 않음 · 소장자도 같은 가격 · 원어데이 밖에선 버튼 · 앨범 숨김
//   그림은 새로 그리지 않고 기존 인물 표정 · 배경을 다시 씀
import { load, save } from './save.js?v=0.93.4';
import { bm, oadOn, track } from './bm.js?v=0.93.4';

const S = (bg, ...lines) => lines.map((l, i) => ({ ...(i === 0 && bg ? { bg } : {}), who: l[0], face: l[1], t: l[2] }));
const SY = '서윤', DH = '도현', JA = '지아', HN = '하나', MO = '어머니', SJ = '서진', FA = '아빠';
export const SPECIAL = {
  ep1: { t: '그의 음성 메시지를 다시 듣는다', card: '프리지어 핑계', d: '처음 만난 날 남긴 음성 메시지', lines: S('bg_flower',
    [SY, 'c_seoyun_smile', '처음 만난 날 도현 씨가 남긴 음성 메시지. 아직 못 지웠지.'],
    [DH, 'c_dohyun_smile', '(음성) 꽃집 사장님, 오늘 산 프리지어… 사실 핑계였어요. 내일 또 와도 돼요?'],
    [SY, 'c_seoyun_smile', '이 목소리 하나로 3년을 버텼는데.'],
    [SY, 'c_seoyun_doubt', '…어? 메시지 끝에 다른 목소리가 섞여 있어. "도현아, 그 반지는 아직…"'],
    [SY, 'c_seoyun_doubt', '여자 목소리야. 착각이겠지. …아니, 직접 가서 확인하자.']) },
  ep2: { t: '도현의 옛 사진첩을 펼친다', card: '잘려 나간 사람', d: '사진마다 오려 낸 한 사람', lines: S('bg_flower',
    [SY, 'c_seoyun_doubt', '도현 씨가 이삿짐에 두고 간 상자. 사진첩이 하나 있어.'],
    [SY, 'c_seoyun_smile', '대학 축제 사진… 도현 씨, 이때도 꽃을 들고 있네.'],
    [SY, 'c_seoyun_doubt', '그런데 사진마다 한 사람이 가위로 오려져 있어.'],
    [SY, 'c_seoyun_shock', '남은 건 어깨에 걸친 빨간 스카프 한 자락뿐.'],
    [SY, 'c_seoyun_doubt', '…이 스카프, 어디서 본 것 같은데. 하나 말대로 그 편집숍에 가 보자.']) },
  ep3: { t: '도현에게 춤을 청한다', card: '주차장의 왈츠', d: '파티 전, 둘만의 한 곡', lines: S(null,
    [SY, 'c_seoyun_smile', '파티장에 들어가기 전에… 도현 씨, 우리 여기서 한 곡만 춰요.'],
    [DH, 'c_dohyun_nervous', '여기 주차장인데?'],
    [SY, 'c_seoyun_smile', '음악은 내가 흥얼거릴게. 오늘 내 옆에 설 사람이 누군지 확인하고 싶어서.'],
    [DH, 'c_dohyun_smile', '…서윤아. 오늘 누가 뭐라 해도, 내가 고른 사람은 너야.'],
    [SY, 'c_seoyun_smile', '그 말, 파티 끝날 때까지 기억할게. 자, 가요.']) },
  ep4: { t: '도현의 요리를 돕는다', card: '크림 리조또의 약속', d: '혼자 지내던 3년', lines: S(null,
    [DH, 'c_dohyun_smile', '앞치마 매 줄래? 오늘은 네가 좋아하는 크림 리조또야.'],
    [SY, 'c_seoyun_smile', '도현 씨 요리하는 거 처음 봐. 언제 배웠어?'],
    [DH, 'c_dohyun_nervous', '…3년 전에. 혼자 지내던 때가 좀 길었거든.'],
    [SY, 'c_seoyun_doubt', '혼자 지내던 3년. 도현 씨가 한 번도 말 안 한 시간이야.'],
    [DH, 'c_dohyun_smile', '다 먹으면 얘기해 줄게. 약속.'],
    [SY, 'c_seoyun_doubt', '…그 약속, 오늘은 내가 먼저 확인해 볼게.']) },
  ep5: { t: '어머님께 작약을 드린다', card: '작약 한 다발', d: '아버님이 좋아하던 꽃', lines: S('bg5',
    [SY, 'c_seoyun_smile', '어머님, 작약이에요. 한옥 마당에 어울릴 것 같아서요.'],
    [MO, 'c_mother', '…작약이네요. 도현이 아버지가 좋아하던 꽃이에요.'],
    [SY, 'c_seoyun_smile', '아버님 이야기는 처음 들어요.'],
    [MO, 'c_mother', '그 애가 아버지 얘긴 안 했군요. …그래도 서윤 씨한텐 꽃 얘기는 했나 봐요.'],
    [SY, 'c_seoyun_doubt', '아주 잠깐, 어머님 눈이 흔들렸어. 차가운 분만은 아닌가 봐.']) },
  ep6: { t: '하나와 옛이야기를 나눈다', card: '친구의 약속', d: '도현이 하나에게 한 부탁', lines: S('bg_flower',
    [HN, 'c_hana', '서윤아, 너 도현 씨 처음 소개해 줬을 때 기억나? 나 반대했잖아.'],
    [SY, 'c_seoyun_smile', '기억나지. "꽃만 보고 사람 고르지 마"라며.'],
    [HN, 'c_hana', '근데 그날 도현 씨가 나한테 따로 그랬어. "서윤이 지켜 줄 친구가 있어서 다행이다"라고.'],
    [SY, 'c_seoyun_doubt', '지켜 줄…? 그때부터 뭔가 걱정하고 있었던 걸까.'],
    [HN, 'c_hana', '그러니까 오늘은 내가 지킨다. 가자.']) },
  ep7: { t: '도현에게 응원 문자를 보낸다', card: '한강에서, 그때 진짜로', d: '다 끝나면 하자던 말', lines: S('bg_flower',
    [SY, 'c_seoyun_smile', '"오늘 늦어도 괜찮아. 나 이번엔 안 무너져." …보냈다.'],
    [DH, 'c_dohyun_serious', '(답장) 네가 그렇게 말하면, 나 진짜 다 말해야 할 것 같잖아.'],
    [SY, 'c_seoyun_smile', '(답장) 그러니까 말해. 다 끝나면.'],
    [DH, 'c_dohyun_smile', '(답장) 다 끝나면, 한강에서. 그때 진짜로.'],
    [SY, 'c_seoyun_smile', '한강…? 무슨 뜻이지. 일단 지금은 내 일부터!']) },
  ep8: { t: '지아에게 먼저 전화를 건다', card: '처음 걸어 본 전화', d: '이니셜 J 에 담긴 이름', lines: S('bg_flower',
    [SY, 'c_seoyun_smile', '지아 씨, 만나기 전에 하나만 말할게요.'],
    [JA, 'c_jia_sad', '…네.'],
    [SY, 'c_seoyun_smile', '무슨 얘길 듣든, 오늘은 화내지 않을게요. 그러니까 다 말해 줘요.'],
    [JA, 'c_jia_sad', '그런 말 해 준 사람, 서윤 씨가 처음이에요. …내 이름 지아, 아빠가 지어 준 거예요. 그 얘긴 언젠가 꼭 할게요.'],
    [SY, 'c_seoyun_doubt', '아빠 이야기? 지아 씨 목소리가 처음으로 떨렸어.']) },
  ep9: { t: '도현에게 손편지를 쓴다', card: '결혼식 전날의 편지', d: '문 밖에서 다 들은 사람', lines: S('bg_flower',
    [SY, 'c_seoyun_smile', '결혼식 전날 밤. 도현 씨한테 편지를 쓰자.'],
    [SY, 'c_seoyun_smile', '"처음 프리지어를 사 간 날부터, 나는 당신 편이었어요."'],
    [SY, 'c_seoyun_smile', '"거짓말이 있었다면 오늘 밤 다 내려놓고 와요. 나는 진짜 당신이랑 결혼할 거니까."'],
    [DH, 'c_dohyun_smile', '(문 밖에서) …서윤아, 다 들려. 소리 내서 쓰면 어떡해.'],
    [SY, 'c_seoyun_shock', '도현 씨?! …내일 식 끝나기 전엔 절대 열지 마요!']) },
  ep10: { t: '그의 메시지에 답장한다', card: '불꽃 첫 발', d: '뒤돌아보라는 약속', lines: S(null,
    [SY, 'c_seoyun_smile', '"이번엔 진짜야"라니. 그럼 나도 진짜로 답할게.'],
    [SY, 'c_seoyun_smile', '"3년 전 일도, 반지도 상관없어. 나는 오늘의 이도현을 고를 거야."'],
    [DH, 'c_dohyun_smile', '(답장) …불꽃 첫 발 터질 때, 뒤돌아봐.'],
    [SY, 'c_seoyun_smile', '뒤돌아보라고? 이 사람, 끝까지 비밀이 많아.'],
    [SY, 'c_seoyun_smile', '좋아. 이번 비밀은 기쁘게 밝혀 줄게.']) },
  ep11: { t: '아빠의 노래를 떠올린다', card: '열 번째 파도', d: '열 살 생일, 부산 바다', lines: S('bg_flower',
    [JA, 'c_jia_sad', '열 살 생일. 아빠가 부산 바다에서 불러 준 노래가 있었어.'],
    [FA, 'c_father', '(기억) 우리 지아, 파도가 열 번 오면 아빠가 꼭 돌아올게.'],
    [JA, 'c_jia_sad', '아빠는 열 번째 파도 전에 사라졌지. 그 노래도 같이.'],
    [SY, 'c_seoyun_smile', '지아 씨, 그 노래 생각나면 나한테도 불러 줘요. 같이 기다려 줄게요.'],
    [JA, 'c_jia_firm', '…고마워요. 이번엔 기다리지 않고 내가 찾아갈 거예요.']) },
  ep12: { t: '서진의 커피 취향을 묻는다', card: '아주 진한 커피', d: '12년 동안 닫지 못한 사건', lines: S(null,
    [JA, 'c_jia_smile', '변호사님, 커피는 어떻게 드세요? 시장 가기 전에 사 갈게요.'],
    [SJ, 'c_seojin_smile', '…쓴 거요. 아주 진하게. 잠 못 드는 날이 많아서.'],
    [JA, 'c_jia_doubt', '왜요? 사건 때문에?'],
    [SJ, 'c_seojin_serious', '12년 동안 닫지 못한 사건이 하나 있어요. 언젠가 말씀드릴게요.'],
    [JA, 'c_jia_doubt', '12년… 아빠가 사라진 해랑 같아. 우연이겠지.']) },
  ep13: { t: '서진에게 바다를 보여 준다', card: '방파제 끝자리', d: '서툴러지는 사람', lines: S('bg13',
    [JA, 'c_jia_smile', '서진 씨, 저기 방파제 끝. 어릴 때 매일 앉던 자리예요.'],
    [SJ, 'c_seojin_smile', '바람이 세네요. …목도리 빌려드릴까요?'],
    [JA, 'c_jia_smile', '변호사님도 이런 걸 할 줄 아네요.'],
    [SJ, 'c_seojin_smile', '지아 씨 앞에서만 서툴러지는 것 같아요.'],
    [JA, 'c_jia_smile', '…방금 그 말, 못 들은 걸로 할게요. 얼른 찾아요.']) },
  ep14: { t: '서진의 옛 사진을 떠올린다', card: '사진 뒤의 글씨', d: '끝내 지키지 못한 것', lines: S(null,
    [JA, 'c_jia_doubt', '서진 씨 책상에 있던 사진. 어린 서진 씨 옆에 정장 입은 남자.'],
    [JA, 'c_jia_doubt', '사진 뒤에 적힌 글씨… "미안하다, 끝내 지키지 못해서."'],
    [SJ, 'c_seojin_serious', '(기억) 그 사진은 보지 마요. 제가 가장 부끄러운 날이라서.'],
    [JA, 'c_jia_shock', '부끄러운 날이라니… 서진 씨는 뭘 지키지 못했던 걸까.'],
    [JA, 'c_jia_firm', '묻기 전에, 진실부터 내 눈으로 볼 거야.']) },
  ep15: { t: '서윤에게 먼저 안긴다', card: '같은 편', d: '미워하려 애썼던 시간', lines: S(null,
    [JA, 'c_jia_sad', '…서윤 씨, 잠깐만 이렇게 있어도 돼요?'],
    [SY, 'c_seoyun_smile', '얼마든지요. 지아 씨, 떨고 있어요.'],
    [JA, 'c_jia_sad', '예전엔 서윤 씨를 미워하려고 애썼어요. 그래야 버틸 수 있었으니까.'],
    [SY, 'c_seoyun_smile', '알아요. 그래서 지금이 더 좋아요. 우리, 이제 같은 편이잖아요.'],
    [JA, 'c_jia_firm', '…같은 편. 그 말 들으니까 태준 앞에서도 안 흔들릴 것 같아요.']) },
  ep16: { t: '서진의 상처를 치료해 준다', card: '구급상자', d: '유리에 베인 손등', lines: S(null,
    [JA, 'c_jia_shock', '서진 씨, 손등에서 피 나요! 깨진 유리에 베였어요?'],
    [SJ, 'c_seojin_serious', '괜찮아요. 서윤 씨 쪽으로 쏟아지길래 조금…'],
    [JA, 'c_jia_firm', '가만히 있어요. 서윤 씨 꽃집 구급상자는 늘 계산대 밑에 있거든요.'],
    [SJ, 'c_seojin_smile', '지아 씨, 손이 따뜻하네요.'],
    [JA, 'c_jia_smile', '…쓸데없는 말 말고, 운전이나 조심해요. 부산까지 멀어요.']) },
  ep17: { t: '버건디 드레스를 입어 본다', card: '버건디 드레스', d: '가면을 써도 찾을 사람', lines: S(null,
    [SY, 'c_seoyun_smile', '자, 버건디 벨벳. 지아 씨, 거울 봐요.'],
    [JA, 'c_jia_smile', '…이게 나예요? 12년 동안 검은 옷만 입었는데.'],
    [SY, 'c_seoyun_smile', '오늘은 숨는 날 아니잖아요. 찾으러 가는 날이지.'],
    [SJ, 'c_seojin_smile', '(문 밖에서) 준비됐어요? …아.'],
    [JA, 'c_jia_smile', '"아"가 뭐예요, 변호사님. 말을 끝까지 해요.'],
    [SJ, 'c_seojin_smile', '…가면을 써도 지아 씨는 바로 찾을 것 같아요.']) },
  ep18: { t: '아빠의 우표첩을 꺼낸다', card: '우표첩의 마지막 칸', d: '처음 받는 편지의 우표', lines: S(null,
    [JA, 'c_jia_sad', '어릴 때 아빠랑 모으던 우표첩. 마지막 장이 비어 있어.'],
    [FA, 'c_father', '(기억) 마지막 칸은 지아가 처음 받는 편지 우표로 채우자.'],
    [JA, 'c_jia_sad', '…아빠, 그래서 나한테 편지를 쓴 거야? 12년 전에?'],
    [SJ, 'c_seojin_smile', '그 마지막 칸, 오늘 채우러 가요. 제가 운전할게요.'],
    [JA, 'c_jia_firm', '응. 빈칸으로 둔 건 이제 끝이야.']) },
  ep19: { t: '아빠의 넥타이를 매어 드린다', card: '아빠의 넥타이', d: '재판 날 아침', lines: S(null,
    [JA, 'c_jia_smile', '아빠, 증인석에 서려면 넥타이는 매야지. 이리 와요.'],
    [FA, 'c_father', '…지아가 아빠 넥타이를 매 주는 날이 오다니.'],
    [JA, 'c_jia_sad', '어릴 땐 아빠가 내 머리를 묶어 줬잖아. 이젠 내 차례야.'],
    [FA, 'c_father', '지아야, 오늘 무슨 일이 있어도… 아빠는 네가 자랑스럽다.'],
    [JA, 'c_jia_firm', '그 말은 재판 끝나고 다시 해 줘요. 이기고 나서.']) },
  ep20: { t: '서진에게 먼저 선물을 준다', card: '달콤한 원두', d: '잠 못 드는 밤은 끝', lines: S(null,
    [JA, 'c_jia_smile', '서진 씨 선물, 내가 먼저 준비했어. 쓴 커피 대신 달콤한 원두.'],
    [JA, 'c_jia_smile', '카드엔 이렇게 썼지. "이제 잠 못 드는 밤은 끝이에요."'],
    [SY, 'c_seoyun_smile', '지아 씨, 그거 거의 고백인데요?'],
    [JA, 'c_jia_shock', '…그런가요? 다시 쓸까?'],
    [SY, 'c_seoyun_smile', '아니요, 그대로가 좋아요. 이번엔 지아 씨가 먼저 웃을 차례예요.']) },
};

const sku = ep => 'choice' + ep.no;
function st() { const d = load(); d.sp ||= { own: {}, taste: null, cards: {} }; return d.sp; }
// 원어데이 안 + 서버 가격표에 그 화 상품이 있을 때만 셋째 버튼
export const spShown = ep => !!(SPECIAL[ep.id] && oadOn() && bm.price(sku(ep)) > 0);
export const spOwned = ep => oadOn() && (!!st().own[ep.id] || (bm.info.items || []).includes(sku(ep)));
export const tasteLeft = () => !st().taste;
export const spPrice = ep => bm.price(sku(ep));
// 열기: 이미 열림 → 바로 · 맛보기 남음 → 무료 · 아니면 🪙30 (bm.spend)
export async function spUnlock(ep) {
  if (spOwned(ep)) return { ok: true, via: 'own' };
  const s = st();
  if (!s.taste) { s.taste = ep.id; s.own[ep.id] = 'taste'; save(); track('choice_taste', { ep: ep.id }); return { ok: true, via: 'taste' }; }
  const r = await bm.spend(sku(ep));
  if (r.ok) { st().own[ep.id] = 'gold'; save(); track('choice_buy', { ep: ep.id }); return { ...r, via: 'gold' }; }
  return r;
}
export const hasCard = id => !!st().cards[id];
export function addCard(id) { const s = st(); const first = !s.cards[id]; if (first) { s.cards[id] = Date.now(); save(); } return first; }
export const cardCount = () => Object.keys(st().cards).length;
