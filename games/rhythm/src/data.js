// 원트랙 콘텐츠: 곡 · 가희 · 하루 이야기 · 칭찬 문구
//   세계관 · 이름은 team/dev/tasks/261109-rhythm/PLAN.md (시즌 1 「에덴펠의 첫 노래」)
//   곡: Suno 유료 구독(회사 우동화 대표 계정)으로 2026-11-10~11 만든 10곡 — AUDIO_CREDITS.md
//   v0.3 그림: 2 · 4 · 5 · 7 ~ 10화 배경은 Figma 생성 범용 배경(곡 분위기) · 원화는 Real-ESRGAN x2 (tools/art.py · upscale.py)

export const SEASON = { no: 1, title: '에덴펠의 첫 노래', pages: 30 };

export const DIVAS = {
  miyu: { name: '미유', en: 'MIYU', role: '아르웬 극장의 무대 감독', face: 'assets/img/f_miyu.jpg', color: '#F2D49A' },
  edel: { name: '에델', en: 'EDEL', role: '목소리를 잃은 마지막 가희', face: 'assets/img/f_edel.jpg', color: '#9FF0FF' },
  tina: { name: '티나', en: 'TINA', role: '아르웬 성벽의 군악대장', face: 'assets/img/f_tina.jpg', color: '#FFB48F' },
  bella: { name: '벨라', en: 'BELLA', role: '시계탑의 시계지기', face: 'assets/img/f_bella.jpg', color: '#FFC46B' },
  liv: { name: '리브', en: 'LIV', role: '이야기책을 지키는 사서', face: 'assets/img/f_liv.jpg', color: '#E8C9A0' },
  moa: { name: '모아', en: 'MOA', role: '광장 순위판의 막내', face: 'assets/img/f_moa.jpg', color: '#FF9AD5' },
  yuha: { name: '유하', en: 'YUHA', role: '바람을 따라 떠도는 가희', face: 'assets/img/f_yuha.jpg', color: '#9FF0D8' },
  media: { name: '메디아', en: 'MEDIA', role: '질서의 가희', face: 'assets/img/f_media.jpg', color: '#C9D8FF' },
};

/* 곡: 박 지도(tmap)는 채보 파일 안 · preview = [시작 초, 길이] (후렴 8마디) · tier = 곡 성격(쉬운 곡 · 보통 · 어려운 곡 · 보스) */
const SUNO = { artist: '원트랙 사운드', badge: 'AI 작곡 · Suno', license: 'Suno 유료 구독 · 상업 이용' };
const song = (id, title, en, preview, tier) => ({ id, title, en, ko: en, ...SUNO, audio: `assets/audio/${id}`, chart: `assets/charts/${id}.json`, preview, tier });
export const SONGS = {
  s01: song('s01', '빛의 첫 소절', 'First Verse of Light', [92.07, 13.56], '보통'),
  s02: song('s02', '째깍째깍 디스코', 'Tick-Tock Disco', [23.88, 15.0], '쉬운 곡'),
  s03: song('s03', '행진하라, 조율사', 'March On, Tuner', [35.92, 14.16], '보통'),
  s04: song('s04', '책장 사이의 비트', 'Beats Between the Shelves', [76.82, 17.46], '쉬운 곡'),
  s05: song('s05', '1등 말고 너', 'Not No.1, But You', [64.06, 10.97], '어려운 곡'),
  s06: song('s06', '바람의 가야금', 'Gayageum of the Wind', [28.31, 13.32], '보통'),
  s07: song('s07', '완벽한 한 곡', 'The Perfect Song', [41.94, 10.04], '보스'),
  s08: song('s08', '목소리 없는 노래', 'Song Without a Voice', [68.85, 14.25], '쉬운 곡'),
  s09: song('s09', '하루 한 곡', 'One Track, One Day', [26.58, 12.8], '보통'),
  s10: song('s10', '잡음 너머', 'Beyond the Noise', [142.8, 10.94], '어려운 곡'),
};

/* 하루 = 곡 하나 + 가희 + 이야기 한 화 · 순서는 난이도가 오르내리며 10화 보스로 (쉬운 곡 2 · 4 · 6화) */
export const DAYS = [
  {
    no: 1, song: 's01', diva: 'miyu', hero: 'assets/img/d2_hero.jpg', cut: 'assets/img/d2_cut.jpg',
    chapter: '아르웬 종탑의 첫 햇살', place: '아르웬 · 종탑',
    hello: '어서 오세요, 조율사님. 오늘 무대는 단 한 번이에요.',
    story: [
      { who: 'miyu', text: '들렸어요… 정말로 들렸어요!' },
      { who: 'miyu', text: '종탑의 종이 백 년 만에 혼자 울렸어요. 조율사님 손끝에서요.' },
      { who: 'miyu', text: '이 대륙은 하루에 한 곡씩만 버틸 수 있어요. 아무도 듣지 않은 노래는 잡음이 되거든요.' },
      { who: 'miyu', text: '그런데 오늘, 이 노래는 별이 됐어요.' },
      { who: 'miyu', text: '내일도 와 주실 거죠? 시계탑의 벨라가 벌써 시계를 감고 있어요.' },
    ],
    caption: '노래가 끝나자 종탑의 종이 혼자 울렸다.\n하늘 끝 회색이 아주 조금, 물러났다.',
    tomorrow: { who: 'bella', text: '내일 아침 7시, 시계탑. 늦으면 무대는 안 기다려 줘요.', img: 'assets/img/d4_tease.jpg', title: '멈춘 시계의 카페' },
  },
  {
    no: 2, song: 's02', diva: 'bella', hero: 'assets/img/v2_hero.jpg', cut: 'assets/img/v2_cut.jpg',
    chapter: '멈춘 시계의 카페', place: '아르웬 · 시계탑 카페',
    hello: '늦지 않았네요, 조율사님. 1분만 늦었어도 무대는 닫혔어요.',
    story: [
      { who: 'bella', text: '째깍, 째깍. 들려요? 멈춰 있던 시계가 다시 가요!' },
      { who: 'bella', text: '이 카페 시계는 하루에 한 번씩만 감겨요. 노래 한 곡 길이만큼요.' },
      { who: 'bella', text: '그래서 저는 매일 아침 7시를 지켜요. 다음 곡이 늦지 않게.' },
      { who: 'miyu', text: '벨라가 칭찬하는 건 드문 일이에요, 조율사님.' },
      { who: 'bella', text: '칭찬 아니거든요? …뭐, 박자는 정확했어요.' },
    ],
    caption: '카페의 시계 서른 개가 한꺼번에 7시를 쳤다.\n오늘 하루가 무사히 감겼다.',
    tomorrow: { who: 'tina', text: '내일은 성벽이에요. 조율사라는 사람, 직접 봐야 믿겠어요.', img: 'assets/img/v3_tease.jpg', title: '성벽 위 군악대' },
  },
  {
    no: 3, song: 's03', diva: 'tina', hero: 'assets/img/d3_hero.jpg', cut: 'assets/img/d3_cut.jpg',
    chapter: '성벽 위 군악대', place: '아르웬 · 성벽',
    hello: '당신이 조율사? 말로는 못 믿어요. 증명해 봐요.',
    story: [
      { who: 'tina', text: '…좋아요. 박자 하나 안 흐트러졌네요.' },
      { who: 'tina', text: '성벽 군악대는 잡음이 오면 제일 먼저 북을 쳐요. 무너지지 말라고.' },
      { who: 'tina', text: '당신 손이 북보다 빨랐어요. 인정할게요, 오늘만.' },
      { who: 'miyu', text: '티나가 ‘오늘만’이라고 하면, 내일도 인정한다는 뜻이에요.' },
      { who: 'tina', text: '미유! 그런 거 아니거든요!' },
    ],
    caption: '성벽 위로 행진곡이 울려 퍼졌다.\n군악대의 깃발이 처음으로 바람을 받았다.',
    tomorrow: { who: 'liv', text: '내일은 도서관으로 와 주세요. 조용히요. 책들이 자고 있어요.', img: 'assets/img/v4_tease.jpg', title: '빈 책장의 도서관' },
  },
  {
    no: 4, song: 's04', diva: 'liv', hero: 'assets/img/v4_hero.jpg', cut: 'assets/img/v4_cut.jpg',
    chapter: '빈 책장의 도서관', place: '아르웬 · 옛 도서관',
    hello: '쉿… 조율사님 맞으시죠? 기다리고 있었어요.',
    story: [
      { who: 'liv', text: '보셨어요? 노래가 끝나자 빈 책장에 책 한 권이 생겼어요.' },
      { who: 'liv', text: '이건 이야기책이에요. 누군가 끝까지 들어 준 노래만 여기 꽂혀요.' },
      { who: 'liv', text: '서른 장이 모이면 한 권이 돼요. 마지막 장에 뭐가 적힐지는… 저도 몰라요.' },
      { who: 'miyu', text: '리브는 모르는 게 생기면 밤을 새워요. 오늘도 그럴 거예요.' },
      { who: 'liv', text: '조율사님, 내일도 한 장 부탁해요. 빈 페이지는 쓸쓸하거든요.' },
    ],
    caption: '텅 빈 책장 맨 끝에 얇은 책 한 권이 꽂혔다.\n표지에는 조율사의 박자가 적혀 있었다.',
    tomorrow: { who: 'moa', text: '내일은 광장 순위판! 내 곡이 제일 빨라요. 각오해요!', img: 'assets/img/v5_tease.jpg', title: '네온 순위판의 광장' },
  },
  {
    no: 5, song: 's05', diva: 'moa', hero: 'assets/img/v5_hero.jpg', cut: 'assets/img/v5_cut.jpg',
    chapter: '네온 순위판의 광장', place: '아르웬 · 중앙 광장',
    hello: '드디어 왔네요! 오늘 곡은 제일 빨라요. 따라올 수 있어요?',
    story: [
      { who: 'moa', text: '에이, 끝까지 따라왔잖아요! …좀 하네요, 조율사님.' },
      { who: 'moa', text: '광장 순위판 봤어요? 1등 자리, 원래 제 거였거든요.' },
      { who: 'moa', text: '1등을 하면 다들 제 노래를 들어 주니까요. 그래서…' },
      { who: 'moa', text: '아, 아무것도 아니에요! 다음엔 제가 이길 거니까!' },
      { who: 'miyu', text: '모아는 지는 게 싫은 게 아니라, 혼자 남는 게 싫은 거예요.' },
    ],
    caption: '광장의 네온 순위판에 이름 두 개가 나란히 떴다.\n모아는 그걸 오래 바라보았다.',
    tomorrow: { who: 'miyu', text: '내일은 무너진 극장이에요. 에델이… 당신을 기다리고 있어요.', img: 'assets/img/v6_tease.jpg', title: '무너진 극장의 에델' },
  },
  {
    no: 6, song: 's08', diva: 'edel', hero: 'assets/img/d1_hero.jpg', cut: 'assets/img/d1_cut.jpg',
    chapter: '목소리 없는 무대', place: '아르웬 · 무너진 극장',
    hello: '…(에델이 소리 없이 웃으며 고개를 숙인다)',
    story: [
      { who: 'miyu', text: '들렸어요… 에델의 노래가, 정말로 들렸어요.' },
      { who: 'miyu', text: '에델은 목소리를 잃은 마지막 가희예요. 노래를 지어도 부를 수가 없어요.' },
      { who: 'edel', text: '(입 모양으로) 고마워요.' },
      { who: 'miyu', text: '그런데 조율사님이 치니까 노래가 들렸어요. 당신 손끝에서만요.' },
      { who: 'miyu', text: '…에델의 목소리가 어디로 갔는지는, 저도 몰라요. 정말이에요.' },
    ],
    caption: '무너진 극장에 피아노 소리가 번졌다.\n에델이 처음으로 객석을 보았다.',
    tomorrow: { who: 'yuha', text: '내일은 숲이야. 바람이 이상한 노래를 실어 와.', img: 'assets/img/v7_tease.jpg', title: '솜누스 숲의 바람' },
  },
  {
    no: 7, song: 's06', diva: 'yuha', hero: 'assets/img/v7_hero.jpg', cut: 'assets/img/v7_cut.jpg',
    chapter: '솜누스 숲의 바람', place: '솜누스 · 잠든 숲',
    hello: '네가 조율사구나. 바람이 네 얘기를 하더라.',
    story: [
      { who: 'yuha', text: '좋은 연주였어. 안개가 반쯤 걷혔네.' },
      { who: 'yuha', text: '이 숲 사람들은 잠들어 있어. 입에서 회색 음표가 새어 나오지.' },
      { who: 'yuha', text: '다들 그걸 ‘잡음’이라고 부르지만… 내가 보기엔 사연이야.' },
      { who: 'yuha', text: '아무도 안 들어 준 노래는 저렇게 회색이 돼. 그건 기억해 둬.' },
      { who: 'miyu', text: '유하는 바람처럼 왔다 가요. 하지만 틀린 말은 안 해요.' },
    ],
    caption: '가야금 소리에 안개가 갈라졌다.\n잠든 마을 하나가 기지개를 켰다.',
    tomorrow: { who: 'miyu', text: '내일은 다 같이 불러요. 이 대륙의 노래, 「하루 한 곡」이에요.', img: 'assets/img/v8_tease.jpg', title: '모두의 무대' },
  },
  {
    no: 8, song: 's09', diva: 'miyu', hero: 'assets/img/v8_hero.jpg', cut: 'assets/img/v8_cut.jpg', singer: '가희 모두',
    chapter: '모두의 무대', place: '아르웬 · 축제 광장',
    hello: '오늘은 가희들이 다 모였어요. 조율사님을 위한 노래예요.',
    story: [
      { who: 'moa', text: '같이 부르니까 순위 같은 건 생각도 안 났어요!' },
      { who: 'tina', text: '…나쁘지 않았어요. 행진곡으로 써도 되겠네요.' },
      { who: 'bella', text: '짧은 곡이었는데, 하루가 꽉 찬 느낌이에요.' },
      { who: 'liv', text: '이 곡은 이야기책 맨 앞에 꽂아 둘게요.' },
      { who: 'miyu', text: '하루 한 곡. 이 노래가 있는 한, 대륙은 내일도 버틸 거예요.' },
    ],
    caption: '아르웬 광장에 가희들의 목소리가 겹쳤다.\n그날 하늘은 유난히 맑았다.',
    tomorrow: { who: 'tina', text: '내일은 성벽으로. 하늘 끝이 이상해요. 북을 준비해요.', img: 'assets/img/v9_tease.jpg', title: '회색 하늘' },
  },
  {
    no: 9, song: 's10', diva: 'tina', hero: 'assets/img/v9_hero.jpg', cut: 'assets/img/v9_cut.jpg',
    chapter: '회색 하늘', place: '아르웬 · 성벽',
    hello: '봤어요? 하늘 끝이 지워지고 있어요. 이번엔 진짜예요.',
    story: [
      { who: 'tina', text: '…버텼어요. 회색이 성벽 앞에서 멈췄어요.' },
      { who: 'tina', text: '잡음은 적이에요. 그렇게 배웠어요. 그런데…' },
      { who: 'tina', text: '북을 칠수록 회색 속에서 끊긴 멜로디가 들렸어요. 누군가의 노래 같은.' },
      { who: 'yuha', text: '말했잖아. 잡음은 사연이라고.' },
      { who: 'miyu', text: '…내일은 바다에서 누가 와요. 아주 완벽한 사람이요.' },
    ],
    caption: '회색 하늘에 금이 갔다.\n그 틈으로 아무도 모르는 노래가 새어 나왔다.',
    tomorrow: { who: 'media', text: '완벽한 한 곡만 영원히. 그러면 잡음은 생기지 않아요.', img: 'assets/img/v10_tease.jpg', title: '톱니의 가희' },
  },
  {
    no: 10, song: 's07', diva: 'media', hero: 'assets/img/v10_hero.jpg', cut: 'assets/img/v10_cut.jpg',
    chapter: '톱니의 가희', place: '오드스톤 · 바다 위 계단',
    hello: '조율사. 매일 새 노래라니, 비효율적이네요. 제 곡을 들어 보세요.',
    story: [
      { who: 'media', text: '…끝까지 따라왔군요. 인정하죠, 완벽하진 않았지만.' },
      { who: 'media', text: '새 노래는 언젠가 잊혀요. 잊힌 노래는 잡음이 되고요.' },
      { who: 'media', text: '그러니 완벽한 한 곡만 영원히 되풀이하면 돼요. 아무것도 잃지 않게.' },
      { who: 'miyu', text: '그건… 내일이 없는 노래예요, 메디아.' },
      { who: 'media', text: '내일이 필요하다면, 증명해 보세요. 매일, 끝까지.' },
    ],
    caption: '바다 위 계단에서 톱니 후광이 멈췄다.\n처음으로, 메디아가 박수를 쳤다.',
    tomorrow: { who: 'bella', text: '11화는 준비 중이에요. 시계는 계속 감고 있을게요.', img: 'assets/img/d4_tease.jpg', title: '다음 이야기' },
  },
];

/* 칭찬: 등급 · 상황별로 돌려 씀 (유능감 — 넉넉하게, 실수는 부드럽게) */
export const PRAISE = {
  SS: ['완벽했어요. 무대가 숨을 멈추고 들었어요.', '한 음도 놓치지 않으셨어요. 정말이에요?', '이런 연주는 처음 들어 봐요, 조율사님.'],
  S: ['훌륭해요! 노래가 하늘 끝까지 닿았어요.', '손끝이 노래랑 같이 숨 쉬었어요.', '오늘 무대, 오래 기억할게요.'],
  A: ['정말 좋았어요. 노래가 또렷하게 들렸어요.', '박자가 마음에 그대로 왔어요.', '좋아요, 이 노래는 이제 잡음이 되지 않아요.'],
  B: ['끝까지 들어 주셔서 고마워요. 노래가 살아났어요.', '중간중간 반짝이는 순간이 많았어요.', '이 정도면 충분해요. 노래가 웃고 있어요.'],
  C: ['오늘 귀가 조금 피곤했나 봐요. 그래도 끝까지 와 주셨잖아요.', '노래는 끝까지 들어 준 사람을 기억해요.', '한 번 더 들으면 훨씬 가까워질 거예요.'],
  best: '새 기록이에요! 어제의 조율사님보다 한 걸음 더.',
  fc: '한 번도 끊기지 않았어요. 풀 콤보!',
  ap: '모든 음이 PERFECT. 올 퍼펙트예요!',
};
/* 연주 중 한마디 (콤보 이정표) */
export const CHEER = { 30: '좋아요, 그대로!', 60: '노래가 밝아지고 있어요!', 100: '훌륭해요, 조율사님!', 150: '무대가 울려요!', 200: '믿을 수 없어요…!', 300: '끝까지 함께해요!', 500: '전설이 되고 있어요!' };
