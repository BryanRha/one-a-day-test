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
