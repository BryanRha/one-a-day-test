// 이번 주 명예의 전당 (원어데이 공통 랭킹 · 아케이드 공통) — 원어데이 밖에서는 버튼부터 숨김
//   2026-11-27 대표 결정: 로그인한 누구나 · 이어하기 · 응원 선물 · 골드를 쓴 판도 그대로 순위에 오름 (소장 조건 없음)
//   점수 올리기: 결과 화면에서 bm.submitScore(점수, { assisted }) — assisted 는 기록용으로만 보냄(서버가 순위에 쓰지 않음)
//   보기: bm.board() 상위 20 · 내 순위 강조 · 이름은 닉네임(최대 10자)
import { W, H } from './config.js?v=0.99.92';
import { txt, fmt, popup, scrollArea } from './ui.js?v=0.99.92';
import { bm } from './oad_bm.js?v=0.99.92';

export const hofShown = () => bm.info.ok;
export const HOF_MSG = {
  login: '로그인하면 내 기록이 올라가요',
  offline: '연결되면 기록을 다시 올려요',
};
// 판 결과 올리기 → 화면에 보여 줄 한 줄 (조용히 실패하면 null)
export async function submitRun(score, assisted) {
  if (!hofShown() || !score) return null;
  const r = await bm.submitScore(score, { assisted });
  if (r.ok) return r.rank ? `명예의 전당 ${fmt(r.rank)}위!` : r.tier ? `명예의 전당 상위 ${r.tier}%!` : '명예의 전당에 올렸어요';
  return HOF_MSG[r.reason] || null;
}
// 하단 안내: 내 순위 · 로그인 상태
function footNote(me) {
  const info = bm.info;
  if (me) return `내 순위 ${fmt(me.rank)}위 · ${fmt(me.score)}점`;
  if (!info.login) return HOF_MSG.login;
  return '이번 주 첫 기록을 올려 보세요';
}
export function hofPopup(scene, o = {}) {
  const ph = Math.min(H - 200, 1500);
  const pop = popup(scene, '이번 주 명예의 전당', ph, { depth: o.depth || 1100 });
  const b = pop.box;
  b.add(txt(scene, 0, -ph / 2 + 120, '이번 주 최고 점수로 겨뤄요 · 월요일에 새로 시작', 32, '#D8CCFF'));
  const loading = txt(scene, 0, 0, '불러오는 중…', 40, '#B8A6F0'); b.add(loading);
  bm.board().then(r => {
    if (!pop.active || pop.closing) return;
    loading.destroy();
    if (!r.ok) { b.add(txt(scene, 0, 0, HOF_MSG[r.reason] || '지금은 불러올 수 없어요', 40, '#FFE8A8', { wrap: 800 })); return; }
    const top = (r.top || []).slice(0, 20);
    const area = scrollArea(scene, b, 0, -ph / 2 + 170, 900, ph - 330);
    if (!top.length) area.add(txt(scene, 0, 120, '아직 아무도 없어요 · 첫 이름이 되어 보세요!', 38, '#FFE8A8'));
    top.forEach((e, i) => {
      const y = i * 100 + 50;
      area.add(scene.add.rectangle(0, y, 860, 90, e.me ? 0x6A3AC0 : 0x120830, e.me ? 0.9 : 0.6).setStrokeStyle(3, e.me ? 0xFFD95A : 0x4A3A80));
      area.add(i < 3 ? scene.add.image(-380, y, 'star_on').setDisplaySize(70, 70).setTint([0xFFE14D, 0xE8E8FF, 0xFFB86A][i]) : txt(scene, -380, y, `${i + 1}`, 44, '#FFFFFF'));
      if (i < 3) area.add(txt(scene, -380, y + 2, `${i + 1}`, 30, '#2A1650', { stroke: '#FFFFFF', thick: 4, shadow: false }));
      area.add(txt(scene, -300, y, e.name + (e.me && e.name !== '나' ? ' (나)' : ''), 40, e.me ? '#FFE14D' : '#FFFFFF', { ox: 0 }));
      area.add(txt(scene, 400, y, fmt(e.score), 40, '#FFE8A8', { ox: 1 }));
    });
    area.contentH = top.length * 100 + 20;
    b.add(scene.add.rectangle(0, ph / 2 - 100, 860, 90, 0x120830, 0.8).setStrokeStyle(3, 0xFFD95A));
    b.add(txt(scene, 0, ph / 2 - 100, footNote(r.me), 36, r.me ? '#FFE14D' : '#FFC0E0'));
  });
  window.__hofPop = pop;
  return pop;
}
