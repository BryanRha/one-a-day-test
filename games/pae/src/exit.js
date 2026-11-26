// 원어데이로 나가기 (QA 2 · 룬다이스 홈 '원어데이' 버튼과 같은 동작)
//   원어데이 앱 안 = 앱에 나가기 알림(oad.js exitToOAD = oad:exit) · 단독 링크 = 원어데이 사이트로
//   테스트 서버(test.oneaday.kr)에서 열었으면 그 서버 첫 화면, 그 밖(로컬 · 다른 주소)은 oneaday.kr
import { inOAD, exitToOAD } from './oad.js?v=0.99.62';
import { audio } from './audio.js?v=0.99.62';

export const oadSite = () => {
  const h = location.hostname;
  return /(^|\.)oneaday\.kr$/.test(h) ? `${location.protocol}//${h}/` : 'https://oneaday.kr/';
};
export function toOAD() {
  if (inOAD) return exitToOAD();
  audio.stopMusic();
  location.href = oadSite();
}
