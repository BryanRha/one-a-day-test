// 모드 안내 한 장 (QA 5): 무엇 · 보상 · 팁 — 처음 들어갈 때 한 번 (Play) · 설정 › 도움말에서 다시 보기 (Home)
import { T, C, btn, popup } from './pui.js?v=0.98.3';
import { GUIDE, markGuide } from './meta.js?v=0.98.3';

// o.extra: 덧붙일 한 줄(예: 메인 원정 아이템 안내) · o.cta: 버튼 글자 · o.onClose: 닫힌 뒤
export function guidePop(scene, mode, o = {}) {
  const G = GUIDE[mode]; if (!G) { o.onClose && o.onClose(); return null; }
  const rows = [['무엇을', G.what, C.text], ['보상', G.reward, C.gold], ['팁', G.tip, '#8FE3FF']];
  if (o.extra) rows.push(['아이템', o.extra, '#FFB86A']);
  const ph = 560 + rows.length * 150;
  let done = false;
  const finish = () => { if (done) return; done = true; markGuide(mode); o.onClose && o.onClose(); };
  const p = popup(scene, null, 920, ph, { depth: o.depth || 2000, closable: o.closable !== false, onClose: finish }), c = p.content;
  let y = -ph / 2 + 90;
  c.add(T(scene, 0, y, G.en, 24, '#B59BFF', { w: 900, ls: 8 })); y += 66;
  c.add(T(scene, 0, y, G.name, 60, C.text, { w: 900 })); y += 70;
  c.add(T(scene, 0, y, o.first === false ? '모드 안내' : '처음 오셨네요 · 한 장만 보고 가요', 26, C.sub, { w: 800 })); y += 70;
  for (const [label, text, col] of rows) {
    const g = scene.add.graphics(); g.fillStyle(0x0B1026, 0.75).fillRoundedRect(-400, y - 12, 800, 130, 24); c.add(g);
    c.add(T(scene, -370, y + 18, label, 24, col, { ox: 0, w: 900, ls: 2 }));
    c.add(T(scene, -370, y + 50, text, 27, C.text, { ox: 0, oy: 0, w: 800, wrap: 740, align: 'left', lh: 4 }));
    y += 150;
  }
  c.add(btn(scene, 0, ph / 2 - 110, 460, 116, o.cta || '시작하기', () => p.close(), { style: 'gold', icon: 'i_play', size: 38 }));
  return p;
}
