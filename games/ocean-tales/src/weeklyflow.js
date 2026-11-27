// 주간 도전 판 ↔ 원어데이 공통 랭킹 (게임 쪽 도우미 · 규칙은 core/weekly.js)
//   · 기기 기록: save.weekly = { p: 주, best: 이번 주 내 최고, plays: 이번 주 판 수, cut: { score, tier } | null }
//     cut = 지난 제출 때 원어데이가 알려 준 '다음 구간 경계 점수' (이어하기 권유 '○점만 더면 상위 ○%' 의 바탕)
//   · 원어데이 안: 판 시작 bm.rank.start · 판 끝 bm.rank.submit → 결과 한 줄 bm.rank.line · '순위 보기' bm.rank.open
//   · 원어데이 밖: 기기 기록만 (결과 창에 '원어데이에서 하면 순위에 올라요')
//   · 결제 · 이어하기 · 부스터를 쓴 판도 그대로 올림 (대표 11-27 · 딱지 없음) — assisted 는 늘 false
import { bm } from './oad_bm.js?v=0.99.82';
import { load, save } from './save.js?v=0.99.82';
import { BOARD, weekOf, weekEnd } from './core/weekly.js?v=0.99.82';
import { LANG } from './i18n.js?v=0.99.82';
import { oadOn, oadTrack } from './bmflow.js?v=0.99.82';

export function wkState(p = weekOf()) {
  const d = load();
  if (!d.weekly || d.weekly.p !== p) d.weekly = { p, best: 0, plays: 0, cut: null };
  return d.weekly;
}
export const wkBest = p => wkState(p).best;
export const wkPlayed = () => wkState().plays > 0;

// 판 시작 (원어데이 안이면 서버에 알림 · 기다리지 않음)
export function wkStart(p) {
  const w = wkState(p); w.plays++; save();
  oadTrack('rank_play', { board: BOARD, p });
  if (!oadOn()) return Promise.resolve({ ok: false, reason: 'standalone' });
  return bm.rank.start(BOARD).catch(() => ({ ok: false, reason: 'error' }));
}

// 판 끝: 기기 최고 갱신 + 원어데이 제출 → { local: { best, newBest }, r: 서버 응답 | null }
export async function wkFinish(p, score, meta) {
  const w = wkState(p), newBest = score > w.best;
  if (newBest) w.best = score;
  save();
  if (!oadOn()) return { local: { best: w.best, newBest }, r: null };
  let r;
  try { r = await bm.rank.submit(BOARD, score, { tie: 0, meta, assisted: false }); } catch { r = { ok: false, reason: 'error' }; }
  if (r && r.ok) {
    const w2 = wkState(p);
    w2.cut = r.next && r.next.gap > 0 && r.best ? { score: Number(r.best) + Number(r.next.gap), tier: r.next.tier } : null;
    save();
  }
  return { local: { best: w.best, newBest }, r };
}
export const wkOpen = () => (oadOn() ? bm.rank.open(BOARD) : Promise.resolve({ ok: false }));
// 결과 한 줄 (원어데이 공통 글 규칙 bm.rank.line) · 받지 못했으면 부드러운 안내
export function wkLine(r) {
  if (!oadOn()) return { title: wt('rankOff'), sub: '' };
  const L = bm.rank.line(r);
  if (L) return L;
  if (r && r.reason === 'offline') return { title: wt('rankKept'), sub: '' };
  return { title: wt('rankLater'), sub: '' };
}
// 마감까지 남은 시간 글
export function wkLeft(p = weekOf(), now = Date.now()) {
  const s = Math.max(0, weekEnd(p) - now), d = Math.floor(s / 864e5), h = Math.floor((s % 864e5) / 3600e3), m = Math.floor((s % 3600e3) / 60e3);
  return d ? wt('leftD', d, h) : h ? wt('leftH', h, m) : wt('leftM', Math.max(1, m));
}

// ── 문구 ──
const TX = {
  ko: {
    title: '이번 주 도전', mapBtn: '이번 주 도전', hudTag: '이번 주', hudBig: '도전', hudBest: '이번 주 내 최고',
    lead: '이동 {0}번 안에 최고 점수!', same: '이번 주는 모두 같은 판으로 겨뤄요', closes: '{0} 뒤 마감',
    myBest: '이번 주 내 최고 {0}', noBest: '아직 기록이 없어요 · 첫 기록을 세워 봐요', unlock: '10레벨을 깨면 열려요',
    boostMax: '이번 도전에서는 여기까지 쓸 수 있어요',
    done: '도전 끝!', resultTitle: '이번 주 도전', newBest: '이번 주 내 최고 기록!', best: '이번 주 내 최고 {0}',
    rankWait: '순위를 확인하고 있어요…', rankOff: '원어데이에서 하면 이번 주 순위에 올라요', rankLater: '순위는 잠시 뒤에 볼 수 있어요', rankKept: '연결되면 기록을 보내 드릴게요',
    again: '다시 도전', seeRank: '순위 보기',
    contTitle: '멋진 판이에요!', gapTier: '{0}점만 더면 상위 {1}%', gapBest: '{0}점만 더면 이번 주 내 최고', contHope: '5번만 더 움직여 볼까요?',
    leftD: '{0}일 {1}시간', leftH: '{0}시간 {1}분', leftM: '{0}분',
    boards: { plaza: '산호 광장', maze: '해초 미로', valley: '진주 골짜기', wreck: '난파선 갑판', whale: '고래 등 위', lighthouse: '등대 아래', whirl: '소용돌이 바다', cave: '얼음 동굴' },
  },
  en: {
    title: 'Weekly Challenge', mapBtn: 'Weekly Challenge', hudTag: 'Weekly', hudBig: 'Run', hudBest: 'My best this week',
    lead: 'Top score in {0} moves!', same: 'Everyone plays the same board this week', closes: 'Closes in {0}',
    myBest: 'My best this week {0}', noBest: 'No record yet · set your first one', unlock: 'Opens after level 10',
    boostMax: 'That is the limit for this run',
    done: 'Run over!', resultTitle: 'Weekly Challenge', newBest: 'New weekly best!', best: 'My best this week {0}',
    rankWait: 'Checking your rank…', rankOff: 'Play in One a Day to join the weekly ranking', rankLater: 'Your rank will show up shortly', rankKept: 'We will send it once you are online',
    again: 'Try again', seeRank: 'Ranking',
    contTitle: 'Great run!', gapTier: '{0} more points for top {1}%', gapBest: '{0} more points for your weekly best', contHope: 'Five more moves?',
    leftD: '{0}d {1}h', leftH: '{0}h {1}m', leftM: '{0}m',
    boards: { plaza: 'Coral Plaza', maze: 'Kelp Maze', valley: 'Pearl Valley', wreck: 'Shipwreck Deck', whale: 'Whale Back', lighthouse: 'Under the Lighthouse', whirl: 'Whirlpool Sea', cave: 'Ice Cave' },
  },
};
export function wt(key, ...args) {
  const pick = o => key.split('.').reduce((a, k) => (a ? a[k] : undefined), o);
  const v = pick(TX[LANG()] || TX.en) ?? pick(TX.ko) ?? key;
  return typeof v !== 'string' ? key : v.replace(/\{(\d)\}/g, (_, i) => Number.isFinite(args[i]) ? Number(args[i]).toLocaleString(LANG() === 'ko' ? 'ko-KR' : 'en-US') : args[i]);
}
