// 표 데이터 (tables.json — tools/build_assets.py 가 원작 표에서 만든 것)
export const T = {};
export const A = {};   // 애니메이션 프레임
export function setData(tables, anims) { Object.assign(T, tables); Object.assign(A, anims); }

// 한국어 이름 (원어데이판)
export const CHAR_NAMES = ['전사', '철퇴병', '기사', '대장군', '궁수', '성안 궁수', '연사수', '천궁수', '마법사', '얼음 마법사', '마녀', '폭염술사'];
export const CLASS_NAMES = ['전사', '궁수', '마법사'];
export const HERO_NAMES = ['챔피언', '보우 마스터', '아크메이지'];
export const SPECIAL_NAMES = ['칼춤', '화살비', '얼음 지진'];
export const nameOfChar = d => CHAR_NAMES[d] || '';
export const CHAPTERS = ['숲', '늪', '사막', '화산', '마계'];

// 강화 (원작 효과 종류 → 이름)
export const UP_NAMES = { 6: '소집 비용', 7: '공격력', 8: '공격 속도', 9: '사거리', 10: '기절 확률', 11: '기절 시간', 12: '신성 피해', 13: '신성 시간', 14: '빙결 확률', 15: '빙결 강도' };
export const HERO_UP_NAMES = ['소환 마나', '공격력', '공격 속도', '필살기 위력', '필살기 마나', '필살기 대기'];
export const ITEM_NAMES = ['강화 초기화', '전투 투구', '거인의 투구', '제우스 갑옷', '아레스 갑옷', '전투 반지', '천사의 반지', '아테나의 반지', '아레스의 반지', '전투 장화', '군마의 장화', '거인의 장화', '아레스의 장화', '달의 목걸이', '태양의 목걸이', '제퓌로스 목걸이', '아레스 목걸이', '집중의 투구', '전쟁 투구', '신념의 투구', '마신의 투구', '황금 부적', '루비 부적', '리치 부적', '마신의 부적', '데몬 베인', '신의 일격', '타이탄 해머', '아이스 테러', '강화 한계 해제'];
export const ITEM_ICONS = ['reset', ...[...Array(16).keys()].map(i => 'blue' + i), 'red0', 'red1', 'red2', 'red3', 'red12', 'red13', 'red14', 'red15', 'herospe0', 'herospe1', 'herospe2', 'herospe3', 'limit0'].map(n => 'ui_upitem_' + n);
export function itemDesc(i) {
  const it = T.item[i], v = it[2];
  if (it[0] === 1) return '강화에 쓴 명예를 모두 돌려받아요';
  if (it[0] === 5) return '병사 강화 한계 +5 단계';
  return ({ 1: `영웅 소환 · 레벨업 마나 ${v}%`, 2: `영웅 공격력 +${v}%`, 3: `영웅 공격 속도 +${v}%`, 4: `영웅 사거리 +${v}%`, 5: `필살기 위력 +${v}%`, 8: `영웅이 잡으면 보상 +${v}%`, 10: `${v}% 확률로 신성 피해`, 11: `${v}% 확률로 즉사 (보스 제외)`, 12: `${v}% 확률로 기절`, 13: `${v}% 확률로 빙결` })[it[5]] || '';
}
export const UNIT_ICONS = [...['warrior', 'archer', 'wizard'].flatMap(c => [0, 1, 2, 3, 4, 5].map(n => `ui_upunit_${c}${n}`))];
export const FACE = ['warrior', 'manatarms', 'knight', 'warlord', 'archer', 'holyeye', 'splatter', 'skybeholder', 'wizard', 'colddiviner', 'warlock', 'magmablaster'].map(n => 'ui_char_face_' + n);
export const STAGE_NAMES = [
  ['수풀 길', '이끼 언덕', '오솔길', '나무꾼 마을', '샘물 숲', '사냥꾼 길', '고목 고개', '안개 숲', '거미 숲', '숲의 심장'],
  ['젖은 들판', '갈대 늪', '썩은 다리', '독 안개', '물웅덩이', '잠긴 마을', '이끼 동굴', '검은 물', '늪 사원', '늪의 왕'],
  ['모래 길', '오아시스', '해골 언덕', '선인장 밭', '모래 폭풍', '버려진 성채', '피라미드 앞', '태양 제단', '모래 미궁', '사막의 왕'],
  ['재의 들판', '용암 강', '현무암 길', '불의 고개', '분화구', '검은 바위', '용암 동굴', '불꽃 다리', '화산 정상', '화산의 왕'],
  ['어둠의 문', '피의 들판', '뒤틀린 숲', '해골 성벽', '절망의 길', '검은 탑', '혼돈의 계곡', '악몽 회랑', '마왕의 문턱', '레이스 킹'],
];
