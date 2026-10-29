// 이번 주 명예의 전당 (원어데이 소장자 혜택 · 아케이드 공통) — 원어데이 밖에서는 버튼부터 숨김
//   점수 올리기: 결과 화면에서 bm.submitScore(점수, { assisted }) — 이어하기(골드 · 광고 · 별가루) · 응원 선물을 받은 판은 assisted
//   보기: bm.board() 상위 20 · 내 순위 강조 · 이름은 서버가 가려서 줌
import { W, H } from './config.js?v=0.92.6';
import { txt, fmt, popup, scrollArea } from './ui.js?v=0.92.6';
import { bm } from './oad_bm.js?v=0.92.6';

export const hofShown = () => bm.info.ok;
export const HOF_MSG = {
  owned: '소장하면 내 기록이 올라가요',
  login: '로그인하면 내 기록이 올라가요',
  assisted: '도움 받은 판은 쉬어 가요 · 다음 판에 도전!',
};
// 판 결과 올리기 → 화면에 보여 줄 한 줄 (조용히 실패하면 null)
export async function submitRun(score, assisted) {
  if (!hofShown() || !score) return null;
  const r = await bm.submitScore(score, { assisted });
  if (r.ok) return r.rank ? `명예의 전당 ${fmt(r.rank)}위!` : '명예의 전당에 올렸어요';
  return HOF_MSG[r.reason] || null;
}
// 하단 안내: 소장 · 로그인 상태
function footNote(me) {
  const info = bm.info;
  if (me) return `내 순위 ${fmt(me.rank)}위 · ${fmt(me.score)}점`;
  if (!info.owned) return HOF_MSG.owned;
  if (!info.login) return HOF_MSG.login;
  return '이번 주 첫 기록을 올려 보세요';
}
export function hofPopup(scene, o = {}) {
  const ph = Math.min(H - 200, 1500);
  const pop = popup(scene, '이번 주 명예의 전당', ph, { depth: o.depth || 1100 });
  const b = pop.box;
  b.add(txt(scene, 0, -ph / 2 + 120, '원어데이 소장자 · 도움 없이 낸 점수로 겨뤄요', 32, '#D8CCFF'));
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
