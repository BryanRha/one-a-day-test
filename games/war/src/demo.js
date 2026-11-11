// 첫 출전 시범 (v0.12 · 테스터 시트 #4): 일반 작전 첫 판의 첫 턴을 아군 AI 가 천천히 보여 줌
//   유닛 고르기 → 파란 칸으로 이동 → 점령 · 공격 → 기지에서 유닛 구매(생산) 를 한 단계씩 글로 설명하며 실행
//   [시범 건너뛰기] 언제든 · 뒤로가기 = 일시정지(시범도 멈춤) · 끝나면 기본 안내 → [턴 종료]는 직접
import { W, H } from './config.js?v=0.99.21';
import { T, C, btn, fmt } from './pui.js?v=0.99.21';
import { load, save } from './save.js?v=0.99.21';
import { AI, apply } from './core/ai.js?v=0.99.21';
import { UNITS, TERRAIN } from './core/data.js?v=0.99.21';
import { track } from './bmwar.js?v=0.99.21';

const TOP = 196, BOTTOM = 360, STEP = 1700;
export const demoWanted = sc => sc.mode === 'campaign' && !sc.auto && !sc.autoplay && !sc.data0.resume && sc.s.day === 1 && sc.s.turn === 1 && !load().tips.demo && (load().battles || 0) === 0;

export async function runDemo(sc) {
  const d = load(); d.tips.demo = 1; save(); track('demo_start', { m: sc.map.id });
  sc.demoOn = true; sc.demoSkip = false; sc.busy = true; sc.setActs(null);
  [sc.endBtn, sc.nextBtn, sc.dangerBtn, sc.undoBtn].forEach(b => b && b.setVisible(false));
  const sleep = ms => new Promise(r => sc.time.delayedCall(ms, r));
  const wait = async ms => { let t = 0; while (t < ms && !sc.demoSkip) { await sleep(100); if (!sc.paused) t += 100; } while (sc.paused) await sleep(150); };
  // 설명 상자 (지도 아래쪽) + 건너뛰기
  const box = sc.add.container(0, 0).setDepth(860), by = H - BOTTOM - 120;
  const g = sc.add.graphics(); g.fillStyle(0x14160A, 0.92).fillRoundedRect(30, by - 86, W - 60, 172, 30).lineStyle(4, 0xFFD45A, 0.9).strokeRoundedRect(30, by - 86, W - 60, 172, 30); box.add(g);
  box.add(T(sc, 64, by - 52, '시범 작전 · 지휘관 교육', 22, C.gold, { ox: 0, w: 900, ls: 2 }));
  const cap = T(sc, 64, by + 4, '', 30, C.text, { ox: 0, w: 800, wrap: W - 140, align: 'left' }); box.add(cap);
  const step = T(sc, W - 64, by - 52, '', 22, C.sub, { ox: 1, w: 800 }); box.add(step);
  const skip = btn(sc, W / 2, H - 82, 460, 104, '시범 건너뛰기 ▶▶', () => { sc.demoSkip = true; skip.setEnabled(false); track('demo_skip', { m: sc.map.id }); }, { style: 'ghost', size: 30 }).setDepth(860);
  let n = 0;
  const say = async (s, ms = STEP) => { n++; step.setText(`${n}`); cap.setText(s); cap.setAlpha(0); sc.tweens.add({ targets: cap, alpha: 1, duration: 220 }); await wait(ms); };
  const ai = new AI('normal'), s = sc.s;
  await say('첫 턴은 제가 천천히 보여 드릴게요. 파란 부대가 우리 편이에요.', 2400);
  let guard = 0;
  while (!sc.demoSkip && s.turn === 1 && !s.over && guard++ < 40) {
    const a = ai.next(s);
    if (a.kind === 'end' || a.kind === 'power' || a.kind === 'swap') break;
    if (a.kind === 'build') {
      const U = UNITS[a.type]; sc.follow(a.x, a.y); sc.clearHl(); const r = sc.mark(a.x, a.y, 0xFFE27A, 0, true); sc.tweens.add({ targets: r, alpha: 0.3, duration: 350, yoyo: true, repeat: -1 });
      await say(`기지를 누르면 유닛을 살 수 있어요. 자금 ${fmt(s.funds[1])} 중 ${fmt(s.costOf(a.type, 1))}으로 ${U.name} 구매!`);
      if (sc.demoSkip) break;
      sc.clearHl(); apply(s, a); await sc.drain(); sc.updateHud();
      await say('새 유닛은 다음 턴부터 움직여요. 도시를 많이 차지할수록 매일 자금이 늘어요.', 2200);
      continue;
    }
    if (a.kind !== 'act') break;
    const u = s.unit(a.id); if (!u) break;
    const U = UNITS[u.type], [tx, ty] = a.to, t = a.then || { kind: 'wait' }, tile = s.tile(tx, ty);
    sc.follow(u.x, u.y); sc.select(u); sc.setActs(null); [sc.endBtn, sc.nextBtn, sc.dangerBtn, sc.undoBtn].forEach(b => b && b.setVisible(false)); sc.showInfo(u.x, u.y);
    await say(`${U.name}을(를) 누르면 갈 수 있는 칸이 파랗게 보여요.`);
    if (sc.demoSkip) { sc.cancelSel(); break; }
    sc.mark(tx, ty, 0xFFE27A, 0, true);
    const foe = t.kind === 'attack' ? s.unit(t.target) : null;
    const msg = t.kind === 'capture' ? `${TERRAIN[tile.t].name}(으)로 이동해 [점령]! 보병만 건물을 차지할 수 있어요.`
      : t.kind === 'attack' && foe ? `적 ${UNITS[foe.type].name} 옆으로 가서 [공격]! 공격 전에 피해가 미리 보여요.`
        : tile.t === 'river' ? '보병은 강을 걸어서 건너요. 전차는 다리(=)로만 가요.'
          : `노란 칸으로 이동한 뒤 [대기] — 숲 · 산은 방어가 높아요.`;
    await say(msg);
    if (sc.demoSkip) { sc.cancelSel(); break; }
    sc.sel = null; sc.state = 'idle'; sc.clearHl();
    apply(s, a); await sc.drain(); sc.updateHud();
    if (s.over) break;
    await wait(500);
  }
  box.destroy(); skip.destroy(); sc.clearHl();
  sc.demoOn = false; sc.busy = false; sc.state = 'idle'; sc.sel = null;
  if (s.over) return sc.finish();
  sc.setActs(null); sc.updateHud(); sc.showInfo(null);
  if (!sc.demoSkip) track('demo_done', { m: sc.map.id });
  sc.tutorial(sc.demoSkip ? null : '시범 끝! 남은 유닛을 움직이고 [턴 종료]를 눌러요');
}
