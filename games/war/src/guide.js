// 모드 안내 (v0.12 · 테스터 시트 #8): 일반 작전 · 전쟁실 · 특수 작전 · 자유 대전이 무엇이 다른지
//   홈 [모드 안내] 버튼 · 각 모드를 처음 열 때 한 번 (tips.mode_<키>)
import { T, C, btn, popup } from './pui.js?v=0.99.20';
import { load, save } from './save.js?v=0.99.20';
import { WAR, MAPS } from './core/maps.js?v=0.99.20';

export const MODES = {
  campaign: { name: '일반 작전', en: 'OPERATIONS', col: C.gold, what: `이야기를 따라 ${MAPS.length}개 작전을 차례로`, pts: ['이기면 다음 작전 · 새 지휘관이 열려요', '별 3개: 승리 · 기한 안 · 적은 손실', '되돌리기 · 보급품 · 막히면 자동 작전'] },
  war: { name: '전쟁실', en: 'WAR ROOM', col: '#9BE07A', what: `파이프 · 미사일 같은 특수 지형 지도 ${WAR.length}곳`, pts: ['이야기 · 별 없이 점수로 겨뤄요', '속도 · 전력 · 기술 300점 → S~D 등급', '상대는 늘 어려움 · 보급품 · 되돌리기 없음'] },
  daily: { name: '특수 작전', en: 'SPECIAL OPS', col: '#FFB0A0', what: '매일 바뀌는 한 장의 지도 · 모두 같은 판', pts: ['어려움 AI 를 가장 빨리 이기기', '몇 번이든 다시 · 최단 일수가 기록', '하루 한 번 참여하면 오늘의 미션'] },
  free: { name: '자유 대전', en: 'SKIRMISH', col: C.cyan, what: '열린 지도 · 내가 만든 지도로 연습', pts: ['AI 난이도를 골라요 · 둘이서 한 폰도', '기록 · 별 없이 마음껏', '지도 제작으로 나만의 전장'] },
};
const ORDER = ['campaign', 'war', 'daily', 'free'];

// 모드 안내 창: focus 가 있으면 그 모드를 강조 (처음 열 때)
export function modeGuide(scene, focus = null, onClose) {
  const p = popup(scene, focus ? `${MODES[focus].name} 안내` : '모드 안내', 960, 1420, { onClose });
  p.content.add(T(scene, 0, -578, '모두 같은 전투 규칙 · 목표와 기록이 달라요', 26, C.sub, { w: 800 }));
  ORDER.forEach((k, i) => {
    const m = MODES[k], y = -440 + i * 250, on = !focus || focus === k, g = scene.add.graphics();
    g.fillStyle(0x14160A, on ? 0.7 : 0.35).fillRoundedRect(-430, y - 110, 860, 220, 26).lineStyle(on && focus ? 5 : 2, on && focus ? 0xFFD45A : 0x6E7A40, 1).strokeRoundedRect(-430, y - 110, 860, 220, 26);
    p.content.add(g);
    p.content.add(T(scene, -396, y - 72, m.en, 18, m.col, { ox: 0, w: 900, ls: 3 }));
    p.content.add(T(scene, -396, y - 34, m.name, 38, on ? C.text : C.dim, { ox: 0, w: 900 }));
    p.content.add(T(scene, -170, y - 34, m.what, 23, on ? m.col : C.dim, { ox: 0, w: 800, wrap: 580 }));
    m.pts.forEach((s, j) => p.content.add(T(scene, -396, y + 18 + j * 32, `· ${s}`, 22, on ? C.text : C.dim, { ox: 0, w: 700 })));
  });
  p.content.add(btn(scene, 0, 600, 420, 104, '알겠어요', () => p.close(), { style: 'gold', size: 34 }));
  return p;
}
// 처음 여는 모드면 한 번 보여 줌 → 보여 줬으면 true
export function firstGuide(scene, mode, onClose) {
  const d = load(), key = `mode_${mode}`;
  if (!MODES[mode] || d.tips[key] || /[?&]auto(=|&|$)/.test(location.search)) return false;
  d.tips[key] = 1; save(); modeGuide(scene, mode, onClose); return true;
}
