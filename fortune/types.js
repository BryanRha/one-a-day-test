// 사주 유형 테스트 (10일간 유형) + 친구 궁합 공유 — 무료 유입 장치
//   유형 = 일간(태어난 날의 천간) 하나로 정해짐 · 계산은 이 기기에서만 · 공유 카드 · 링크에는 유형만(생년월일 · 이름 없음)
//   받은 사람: /?type=<유형> → 친구 유형 + 내 유형(생년월일만 넣으면 30초) → 두 유형 궁합 요약(무료) → '우리 궁합'(실제 두 사람 사주 · 유료)
import { myChart, HAN } from './fortune.js';

/* id: [천간, 한자, 유형 이름, 한 줄, 성격, 일 스타일, 연애 스타일, 오행] */
export const TYPES = {
  gap: ['갑', '甲', '큰 나무형', '곧게 뻗는 타고난 리더', '목표가 생기면 곧장 위로 뻗어요. 정직하고 자존심이 세서, 굽히기보다 부러지는 쪽을 택하기도 해요.', '처음 길을 내는 일 · 앞에서 끄는 역할에서 빛나요.', '한번 마음 주면 듬직하게 지켜 주는 타입. 다만 표현이 서툴러요.', 'wood'],
  eul: ['을', '乙', '덩굴꽃형', '유연하게 피어나는 사교가', '어떤 환경에서도 길을 찾아 피어나요. 눈치가 빠르고 사람 사이를 잘 엮어요.', '협업 · 조율 · 사람을 연결하는 일에 강해요.', '다정하고 섬세하게 맞춰 주는 타입. 기댈 곳이 있을 때 가장 예뻐요.', 'wood'],
  byeong: ['병', '丙', '태양형', '모두를 비추는 분위기 메이커', '밝고 시원시원해요. 숨기는 게 없어서 사람들이 쉽게 마음을 열어요.', '무대 · 발표 · 사람을 모으는 일에서 빛나요.', '열정적으로 다가가는 직진형. 식으면 금방 티가 나요.', 'fire'],
  jeong: ['정', '丁', '촛불형', '섬세하게 밝히는 다정한 사람', '조용하지만 따뜻해요. 한 사람을 깊이 챙기고, 감정을 오래 품어요.', '세밀한 손길 · 기획 · 누군가를 돌보는 일에 강해요.', '은은하게 오래 타는 사랑. 서운함도 오래 기억해요.', 'fire'],
  mu: ['무', '戊', '큰 산형', '흔들리지 않는 든든한 기둥', '듬직하고 믿음직해요. 쉽게 움직이지 않지만 한번 정하면 끝까지 가요.', '관리 · 책임자 · 큰 그림을 지키는 일에 맞아요.', '말보다 행동으로 지켜 주는 타입. 속마음은 잘 안 보여요.', 'earth'],
  gi: ['기', '己', '텃밭형', '사람을 키우는 살뜰한 살림꾼', '현실 감각이 좋고 꼼꼼해요. 주변 사람을 챙기며 차곡차곡 쌓아 가요.', '교육 · 살림 · 사람과 돈을 키우는 일에 강해요.', '챙겨 주며 사랑하는 타입. 고맙다는 말 한마디에 힘을 얻어요.', 'earth'],
  gyeong: ['경', '庚', '바위칼형', '결단이 빠른 의리파', '옳고 그름이 분명하고 추진력이 강해요. 의리를 무엇보다 중요하게 여겨요.', '결단 · 개혁 · 위기를 정리하는 일에서 빛나요.', '화끈하고 솔직한 타입. 돌려 말하는 걸 답답해해요.', 'metal'],
  sin: ['신', '辛', '보석형', '날카로운 감각의 완벽주의자', '섬세하고 감각이 예민해요. 아름다운 것 · 정확한 것을 좋아해요.', '디자인 · 분석 · 마무리 품질이 중요한 일에 강해요.', '자기만의 기준이 높은 타입. 인정받을 때 마음이 열려요.', 'metal'],
  im: ['임', '壬', '큰 바다형', '스케일 큰 자유로운 전략가', '생각의 폭이 넓고 자유로워요. 큰 흐름을 읽고 멀리 내다봐요.', '기획 · 전략 · 넓은 무대에서 움직이는 일에 맞아요.', '구속을 싫어하는 자유로운 연애. 깊어지면 바다처럼 넓게 품어요.', 'water'],
  gye: ['계', '癸', '이슬비형', '조용히 스며드는 공감 천재', '차분하고 감수성이 깊어요. 말없이 상대 마음을 알아채요.', '상담 · 연구 · 섬세한 소통이 필요한 일에 강해요.', '조용히 스며드는 사랑. 상처를 혼자 삭이지 않게 해 주세요.', 'water'],
};
const STEM_ID = { 甲: 'gap', 乙: 'eul', 丙: 'byeong', 丁: 'jeong', 戊: 'mu', 己: 'gi', 庚: 'gyeong', 辛: 'sin', 壬: 'im', 癸: 'gye' };
const COMBINE = { gap: 'gi', gi: 'gap', eul: 'gyeong', gyeong: 'eul', byeong: 'sin', sin: 'byeong', jeong: 'im', im: 'jeong', mu: 'gye', gye: 'mu' };
const FEEDS = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
const COLOR = { wood: ['#1E5A34', '#6EDC8A'], fire: ['#6A1A12', '#FF7A6A'], earth: ['#5A4210', '#F2C14E'], metal: ['#3A3A48', '#E8E8F0'], water: ['#142450', '#6A9AFF'] };
export const typeOf = me => STEM_ID[myChart(me).dayMaster.stem];

/* 두 유형 궁합 요약 (일간 관계만 · 무료 · '나쁨' 단정 없음) */
export function typeCompat(a, b) {
  const ea = TYPES[a][7], eb = TYPES[b][7];
  if (COMBINE[a] === b) return [95, '천생연분형', '두 일간이 천간합을 이뤄요. 처음 만나도 오래 안 사이처럼 끌리는 조합이에요.'];
  if (a === b) return [78, '거울형', '같은 유형끼리라 말하지 않아도 통해요. 다만 고집도 똑같으니 양보할 차례를 정해 두세요.'];
  if (ea === eb) return [76, '단짝형', '같은 오행이라 결이 비슷해요. 함께 있으면 편한 친구 같은 사이예요.'];
  if (FEEDS[ea] === eb || FEEDS[eb] === ea) return [86, '서로 키워 주는 형', '한쪽이 다른 쪽을 살려 주는 상생 관계예요. 같이 있으면 둘 다 성장해요.'];
  return [64, '티격태격 성장형', '서로 다른 기운이 부딪히면서 다듬어 주는 사이예요. 다름을 인정하면 가장 단단해지는 조합이에요.'];
}

const card = (id, title) => { const t = TYPES[id], [bg, fg] = COLOR[t[7]];
  return `<div class="tycard" style="--tb:${bg};--tf:${fg}"><small>${title}</small><b>${t[1]}</b><h3>${t[0]}${({ wood: '목', fire: '화', earth: '토', metal: '금', water: '수' })[t[7]]} · ${t[2]}</h3><p class="tyl">“${t[3]}”</p></div>`; };

/* 내 유형 결과 */
export async function open(X) {
  const m = await X.ft(), me = m.loadMe(); if (!me) return X.fortuneForm();
  const id = typeOf(me), t = TYPES[id], best = COMBINE[id];
  X.openSheet(`<div class="intro tyw">${card(id, '나의 사주 유형')}
    <section><p><b>성격</b> ${t[4]}</p><p><b>일</b> ${t[5]}</p><p><b>연애</b> ${t[6]}</p><p><b>찰떡 유형</b> ${TYPES[best][0]}${({ wood: '목', fire: '화', earth: '토', metal: '금', water: '수' })[TYPES[best][7]]} · ${TYPES[best][2]} (천간합)</p></section>
    <p class="fsub">태어난 날의 천간(일간) 하나로 정한 유형이에요. 생년월일은 이 폰에서만 계산했고, 공유 카드에는 유형만 들어가요.</p>
    <div class="stack"><button class="sdbtn" data-tyshare="${id}">💌 친구에게 보내고 궁합 보기</button><button class="btn ghost" data-close>닫기</button></div></div>`);
  X.T.track('type_view', { type: id });
}
/* 공유: 유형 카드 그림 + 링크 (?type=) */
export async function share(X, id) {
  const t = TYPES[id], [bg, fg] = COLOR[t[7]];
  const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350; const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 1350); g.addColorStop(0, bg); g.addColorStop(1, '#0d0b0c'); x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  x.textAlign = 'center'; x.fillStyle = '#E8C98A'; x.font = '600 44px serif'; x.fillText('나의 사주 유형', 540, 190);
  x.fillStyle = fg; x.font = '900 360px serif'; x.fillText(t[1], 540, 610);
  x.fillStyle = '#fff'; x.font = '800 84px serif'; x.fillText(t[2], 540, 780);
  x.fillStyle = '#ddd'; x.font = '46px sans-serif'; x.fillText(`“${t[3]}”`, 540, 880);
  x.fillStyle = '#E8C98A'; x.font = '600 40px sans-serif'; x.fillText('너는 무슨 유형? 우리 궁합은? · oneaday.kr', 540, 1230);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png')), file = new File([blob], `oneaday-type-${id}.png`, { type: 'image/png' });
  const url = `${location.origin}/?type=${id}`, text = `나는 ${t[2]}(${t[0]}${t[1]})! 너는 무슨 유형이야? 우리 궁합도 봐 줘 →`;
  X.T.track('type_share', { type: id });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) return await navigator.share({ files: [file], text, url }); if (navigator.share) return await navigator.share({ text, url }); } catch { return; }
  try { await navigator.clipboard.writeText(`${text} ${url}`); X.toast('링크를 복사했어요 · 친구에게 붙여 넣어 보내 주세요'); } catch { X.toast('주소: ' + url); }
}
/* 받은 사람 화면: 친구 유형 → 내 유형(30초) → 두 유형 궁합(무료) → 실제 궁합(유료) */
export async function landing(X, from) {
  if (!TYPES[from]) return;
  const m = await X.ft(), me = m.loadMe();
  X.T.track('type_landing', { type: from, ok: me ? 1 : 0 });
  if (!me) {
    const opt = (a, b, v) => Array.from({ length: b - a + 1 }, (_, i) => a + i).map(n => `<option ${n === v ? 'selected' : ''}>${n}</option>`).join('');
    X.openSheet(`<form class="fform sdform tyw" id="tyForm">${card(from, '친구의 사주 유형')}
      <h2 style="margin-top:14px">나는 무슨 유형일까?</h2><p class="fsub">생년월일만 넣으면 30초. 이 폰에서만 계산하고 어디에도 보내지 않아요.</p>
      <div class="row3"><label>년<select name="y">${opt(1940, X.R.now().getFullYear(), 1995)}</select></label><label>월<select name="m">${opt(1, 12, 1)}</select></label><label>일<select name="d">${opt(1, 31, 1)}</select></label></div>
      <div class="seg"><label><input type="radio" name="cal" value="solar" checked>양력</label><label><input type="radio" name="cal" value="lunar">음력</label></div>
      <div class="stack"><button class="sdbtn" type="submit">내 유형 보고 궁합 보기</button><button class="btn ghost" type="button" data-close>나중에</button></div></form>`);
    X.$('#tyForm').onsubmit = e => { e.preventDefault(); const fd = new FormData(e.target), v = { name: '나', y: +fd.get('y'), m: +fd.get('m'), d: +fd.get('d'), cal: fd.get('cal'), h: null, mi: 0 };
      try { result(X, m, from, typeOf(v), v); } catch { X.toast('날짜를 다시 확인해 주세요'); } };
    return;
  }
  result(X, m, from, typeOf(me), me);
}
function result(X, m, from, mine, v) {
  const [sc, label, line] = typeCompat(mine, from), C = m.paidOf('compat');
  X.openSheet(`<div class="intro tyw"><div class="typair">${card(mine, '나')}${card(from, '친구')}</div>
    <div class="tyc"><b>${sc}</b><span>${label}</span></div><p class="tyl">${line}</p>
    <p class="fsub">두 사람 유형(일간)만 본 재미 궁합이에요. 실제 두 사람 생년월일시로 보는 궁합은 더 정확해요.</p>
    <div class="stack">${m.loadMe() ? '' : `<button class="sdbtn ghost" data-tysave>이 정보로 내 오늘의 운세도 보기 (무료)</button>`}
      <button class="sdbtn" data-paid="compat">${m.CHARS[C.ch].name}의 우리 궁합 미리보기 · 전체 ${X.won(C.price)}</button>
      <button class="sdbtn ghost" data-tyshare="${mine}">💌 내 유형도 친구에게 보내기</button><button class="btn ghost" data-close>닫기</button></div></div>`);
  const b = X.$('[data-tysave]'); if (b) b.onclick = () => { m.saveMe({ ...v, sex: 'f', lon: 126.98 }); X.closeSheet(); X.go('today'); X.fortuneForm(); };
  X.T.track('type_compat', { type: mine, from });
}
export { HAN };
