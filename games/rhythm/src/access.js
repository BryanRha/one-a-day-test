// 곡 이용 규칙 (v0.5.4 「열린 곡은 자유롭게」 · 대표 11-12 — team/dev/tasks/261112-rhythm-freeplay/intent.md)
//   열린 화(첫날부터 오늘까지)의 곡은 누구나 · 모든 난이도 · 몇 번이든 그냥 시작 (값 · 확인 창 없음 · 원어데이 안팎 · 소장 여부와 무관)
//   새 화는 하루 하나 그대로 · 안 열린 화는 소장자도 못 엶 · 놓친 화는 첫 화부터 차례대로 이어 봄 (밀렸다고 막거나 값을 받지 않음)
//   DOM 없음 → tools/test_logic.mjs 가 그대로 잼
/* 열렸나: 1화 ~ 오늘 화 · 시험 모드(dev)는 전부 */
export const isOpen = (no, homeNo, dev = false) => dev || (no >= 1 && no <= homeNo);
/* 다음 차례: 아직 끝까지 송출하지 않은 가장 앞 화(오늘 화 앞까지) · 없으면 오늘 화 */
export function nextUp(homeNo, book) { for (let n = 1; n < homeNo; n++) if (!book[n]) return n; return homeNo; }
/* 밀린 화 수: 오늘 화 앞에서 아직 끝까지 안 한 화 */
export function behind(homeNo, book) { let k = 0; for (let n = 1; n < homeNo; n++) if (!book[n]) k++; return k; }
/* 그 화의 자리 (화면 문구용)
   tonight = 오늘 화 · catchup = 열렸지만 아직 끝까지 안 한 지난 화(첫 방송) · replay = 끝까지 한 지난 화 · ahead = 시험 모드에서 미리 연 화 */
export function epKind(no, homeNo, book) { return no === homeNo ? 'tonight' : no > homeNo ? 'ahead' : !book[no] ? 'catchup' : 'replay'; }
