// '이번 주 명예의 전당' (소장자 혜택 · 원어데이 안에서만 — 밖에서는 버튼 자체를 숨김)
//   판 끝: bm.submitScore(점수, { assisted }) — 이어하기 · 응원 선물을 받은 판은 assisted (순위에 안 올라감)
//   보기: bm.board() 상위 20 (이름은 서버가 가려서 줌) · 내 순위는 금색 강조, 20위 밖이면 맨 아래 따로
import { W, H } from './config.js?v=0.75.2';
import { txt, fmt, button, popup } from './ui.js?v=0.75.2';
import { bm } from './oad_bm.js?v=0.75.2';

export const hallShown = () => !!bm.info.ok;

// 판 끝 기록 결과 → 한 줄 안내 (null = 표시 없음)
export function submitLine(r) {
  if (!r) return null;
  if (r.ok) return { text: r.rank ? `🏆 이번 주 명예의 전당 ${r.rank}위!` : '🏆 명예의 전당에 기록했어요', color: '#FFE14D' };
  if (r.reason === 'owned') return { text: '소장하면 내 기록이 명예의 전당에 올라가요', color: '#E8F0FF' };
  if (r.reason === 'login') return { text: '로그인하면 내 기록이 명예의 전당에 올라가요', color: '#E8F0FF' };
  if (r.reason === 'assisted') return { text: '이어하기 · 응원 선물을 받은 판은 순위에 넣지 않아요', color: '#C8D4F0' };
  return null;
}

export function hallPopup(scene) {
  const PH = Math.min(H - 160, 1640);
  const pop = popup(scene, '이번 주 명예의 전당', PH, { depth: 2500 });
  const c = pop.content, top = -PH / 2 + 170;
  const wait = txt(scene, 0, 0, '불러오는 중…', 40, '#FFFFFF'); c.add(wait);
  bm.board().then(b => {
    if (!pop.scene || pop.closing) return;
    wait.destroy();
    const info = bm.info;
    if (!b || !b.ok) {
      const why = (b && b.reason === 'login') || !info.login ? '로그인하면 볼 수 있어요' : '지금은 불러올 수 없어요';
      c.add(txt(scene, 0, 0, why, 40, '#FFFFFF')); return;
    }
    if (b.week) c.add(txt(scene, 0, top - 30, `${b.week} · 매주 월요일 새로 시작`, 28, '#C8D4F0'));
    const rows = (b.top || []).slice(0, 20), RH = Math.min(58, (PH - 470) / 21);
    if (!rows.length) c.add(txt(scene, 0, 0, '아직 기록이 없어요\n첫 주인공이 되어 보세요!', 38, '#FFFFFF'));
    rows.forEach((e, i) => {
      const y = top + 40 + i * RH, me = !!e.me;
      if (me) c.add(scene.add.rectangle(0, y, 860, RH - 6, 0xFFE14D, 0.22).setStrokeStyle(3, 0xFFE14D));
      const col = me ? '#FFE14D' : i < 3 ? '#FFFFFF' : '#D8E0F5';
      c.add(txt(scene, -390, y, i < 3 ? ['🥇', '🥈', '🥉'][i] : String(i + 1), i < 3 ? 36 : 32, col, { ox: 0 }));
      c.add(txt(scene, -290, y, me ? `${e.name || '나'} (나)` : (e.name || '익명'), 34, col, { ox: 0 }));
      c.add(txt(scene, 400, y, fmt(e.score || 0), 36, col, { ox: 1 }));
    });
    const inTop = rows.some(e => e.me), meY = top + 40 + 20 * RH + 20;
    if (b.me && !inTop) c.add(txt(scene, 0, meY, `내 순위 ${b.me.rank}위 · ${fmt(b.me.score)}`, 38, '#FFE14D'));
    else if (!b.me) c.add(txt(scene, 0, meY, !info.login ? '로그인하면 내 기록이 이곳에 올라가요' : !info.owned ? '소장하면 내 기록이 이곳에 올라가요' : '이번 주 첫 기록을 올려 보세요!', 32, '#E8F0FF'));
    c.add(txt(scene, 0, PH / 2 - 190, '이어하기 · 응원 선물을 받은 판은 순위에 넣지 않아요', 26, '#C8D4F0'));
    c.add(button(scene, 0, PH / 2 - 100, '닫기', () => pop.close(), { key: 'btn_purple', w: 420, h: 110, size: 40 }));
  });
  window.__hall = pop;
  return pop;
}
