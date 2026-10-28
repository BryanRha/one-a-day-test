// 클래식 '이번 주 명예의 전당' (소장자 혜택 · 원어데이 안에서만 — 밖에서는 버튼 자체를 숨김)
//   판 끝: bm.submitScore(점수, { assisted }) — 이어하기 · 응원 선물을 받은 판은 assisted (순위에 안 올라감)
//   보기: bm.board() 상위 20 (이름은 서버가 가려서 줌) · 내 순위는 금색 강조, 20위 밖이면 맨 아래 따로
import { W, H } from './config.js?v=0.82.4';
import { T, C, fmt, btn, popup } from './pui.js?v=0.82.4';
import { bm } from './oad_bm.js?v=0.82.4';

export const hallShown = () => !!bm.info.ok;

// 판 끝 기록 결과 → 한 줄 안내 (null = 표시 없음)
export function submitLine(r) {
  if (!r) return null;
  if (r.ok) return { text: r.rank ? `🏆 이번 주 명예의 전당 ${r.rank}위` : '🏆 명예의 전당에 기록했어요', color: C.gold };
  if (r.reason === 'owned') return { text: '소장하면 내 기록이 명예의 전당에 올라가요', color: C.sub };
  if (r.reason === 'login') return { text: '로그인하면 내 기록이 명예의 전당에 올라가요', color: C.sub };
  if (r.reason === 'assisted') return { text: '도움 받은 판은 명예의 전당에 올리지 않아요', color: C.dim };
  return null;
}

export function hallPopup(scene) {
  const PH = Math.min(H - 160, 1560);
  const pop = popup(scene, '이번 주 명예의 전당', 960, PH, { depth: 2500 });
  const c = pop.content, top = -PH / 2 + 150;
  const wait = T(scene, 0, 0, '불러오는 중…', 34, C.sub, { w: 700 }); c.add(wait);
  bm.board().then(b => {
    if (!pop.scene || pop.closing) return;
    wait.destroy();
    if (!b || !b.ok) {
      const why = b && b.reason === 'login' ? '로그인하면 볼 수 있어요' : '지금은 불러올 수 없어요';
      c.add(T(scene, 0, 0, why, 34, C.sub, { w: 700 })); return;
    }
    if (b.week) c.add(T(scene, 0, top - 4, `${b.week} · 매주 월요일 새로 시작`, 26, C.dim, { w: 700 }));
    const rows = (b.top || []).slice(0, 20), RH = Math.min(58, (PH - 420) / 21);
    if (!rows.length) c.add(T(scene, 0, 0, '아직 기록이 없어요 — 첫 주인공이 되어 보세요!', 32, C.sub, { w: 800 }));
    rows.forEach((e, i) => {
      const y = top + 60 + i * RH, me = !!e.me;
      if (me) { const g = scene.add.graphics(); g.fillStyle(0xF5C451, 0.16).fillRoundedRect(-430, y - RH / 2 + 3, 860, RH - 6, 14); c.add(g); }
      const col = me ? C.gold : i < 3 ? C.text : C.sub;
      c.add(T(scene, -390, y, i < 3 ? ['🥇', '🥈', '🥉'][i] : String(i + 1), i < 3 ? 40 : 30, col, { ox: 0, w: 800 }));
      c.add(T(scene, -290, y, me ? (e.name && e.name !== '나' ? `${e.name} (나)` : '나') : (e.name || '익명'), 32, col, { ox: 0, w: me ? 900 : 700 }));
      c.add(T(scene, 400, y, fmt(e.score || 0), 34, col, { ox: 1, w: 900 }));
    });
    const inTop = rows.some(e => e.me), meY = top + 60 + 20 * RH + 30;
    if (b.me && !inTop) c.add(T(scene, 0, meY, `내 순위 ${b.me.rank}위 · ${fmt(b.me.score)}`, 34, C.gold, { w: 900 }));
    else if (!b.me) c.add(T(scene, 0, meY, '소장하면 내 기록이 이곳에 올라가요', 30, C.sub, { w: 800 }));
    c.add(T(scene, 0, PH / 2 - 150, '이어하기 · 응원 선물을 받은 판은 순위에 넣지 않아요', 24, C.dim, { w: 700 }));
    c.add(btn(scene, 0, PH / 2 - 80, 420, 96, '닫기', () => pop.close(), { style: 'ghost', size: 34 }));
  });
  window.__hall = pop;
  return pop;
}
