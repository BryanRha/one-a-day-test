// 공통 랭킹 (원어데이 SDK v3 · 2026-11-27 · team/dev/tasks/261127-rank-games/brief.md) — 겨루는 판은 '주간 도전' 하나
//  왜 주간 도전만: 이번 주 모두 같은 판(지도 · seed · 날씨 · 위협 · 지급 장비 · 규칙 3) · 내 장비 · 창고와 따로 · 이어하기 · 보험 · 골드 아이템이 안 뜸
//    → 점수가 실력만으로 갈림. 보통 출격(내 장비 · 시설 성장 · 남은 가방)은 성장 차이가 커서 순위에 올리지 않음
//  판 이름 'salvage:weekly' · 점수 = challenge.score (탈출 가치 + 처치 + 보스 + 구역 + 남은 초) · tie = 남은 초(같은 점수면 빨리 나온 쪽)
//  원어데이 밖(단독 링크 · 개발 서버 · 봇)이면 아무것도 안 함 (내 기록만 — 지금까지와 같음) · ?oadtest=1 은 SDK 가짜 순위
import { bm } from './oad_bm.js?v=0.99.100';
import { chalNo } from './challenge.js?v=0.99.100';
import { kstDay } from './econ.js?v=0.99.100';

export const BOARD_ID = 'salvage:weekly';
/* 원어데이 앱 안인가 (hello 는 SDK 가 한 번만 물음) */
export const inApp = async () => !!(await bm.hello()).ok;
/* 도전 판 끝 → 제출. 안 보내는 것: 멈춤 창 '은신처로 돌아가기'(포기) · 판 도중 주가 바뀐 판(그 주 판이 이미 마감 — 내 기록에만) */
export async function submit(rec, res, spec) {
  if (!(await inApp())) return null;
  if (res.quit) return null;
  if (spec.no !== chalNo(kstDay())) return { ok: false, reason: 'week' };
  if (!(rec.sc > 0)) return null;
  return bm.rank.submit(BOARD_ID, rec.sc, {
    tie: Math.max(0, Math.round(res.timeLeft || 0)),
    meta: { no: spec.no, map: spec.map, out: res.outcome, medal: rec.medal ? rec.medal[0] : 0, kills: res.killN || 0, zone: res.zoneMax || 1, val: res.value || 0, t: Math.round(res.time || 0) },
    assisted: false,
  });
}
/* 결과 화면 한 줄 { title, sub } | null (null = 줄을 그리지 않음) */
export function line(r) {
  if (!r) return null;
  if (r.reason === 'week') return { title: '주가 바뀌어 이번 판은 내 기록에만', sub: '새 주간 도전이 열렸어요' };
  if (r.reason === 'offline') return { title: '연결되면 순위에 올려요', sub: '이 판 기록은 앱이 맡아 뒀어요' };
  return bm.rank.line(r);
}
export const open = () => bm.rank.open(BOARD_ID);
