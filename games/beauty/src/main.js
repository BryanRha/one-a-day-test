import { W, BASE_H, setH } from './config.js?v=0.80.0';
import { audio } from './audio.js?v=0.80.0';
import { BootScene } from './scenes/Boot.js?v=0.80.0';
import { HomeScene } from './scenes/Home.js?v=0.80.0';
import { BoardScene } from './scenes/Board.js?v=0.80.0';
import { StoryScene } from './scenes/Story.js?v=0.80.0';
import { SeasonScene } from './scenes/Season.js?v=0.80.0';
import { ShopScene } from './scenes/Shop.js?v=0.80.0';
import { AlbumScene } from './scenes/Album.js?v=0.80.0';
import { MiniScene } from './scenes/Mini.js?v=0.80.0';
import { installBack } from './oad.js?v=0.80.0';
import { installNav } from './nav.js?v=0.80.0';
import { initBM, syncReceipts } from './store.js?v=0.80.0';
import { bm } from './oad_bm.js?v=0.80.0';

async function start() {
  installNav(); syncReceipts(); initBM();   /* 원어데이 연결 확인(최대 0.8초, 기다리지 않음) — 결과는 화면이 그려질 때 캐시로 봄 */
  try { await Promise.all(['700', '800', '900'].map(w => document.fonts.load(`${w} 48px Pretendard`))); } catch { /* */ }
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: W, height: BASE_H, backgroundColor: '#FBEFE8',
    scale: { mode: innerHeight / innerWidth > BASE_H / W ? Phaser.Scale.EXPAND : Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' }, input: { activePointers: 3 }, fps: { target: 60 },
    scene: [BootScene, HomeScene, BoardScene, StoryScene, SeasonScene, ShopScene, AlbumScene, MiniScene],
  });
  const step = game.step; let errN = 0;
  game.step = function (t, d) { try { step.call(this, t, d); } catch (err) { if (errN++ < 5) console.warn('프레임 오류', String(err && err.stack || err).slice(0, 400)); } };
  audio.attach(game); setH(game.scale.height); game.scale.on('resize', gs => setH(gs.height));
  // 화면이 넓어지면(폴더블 펼침 · 가로 회전) EXPAND 가 가로로 늘어나 화면이 왼쪽으로 쏠림
  //   → 넓을 땐 지금까지의 세로 길이 그대로 FIT(가운데 정렬), 다시 길어지면 EXPAND
  //   EXPAND 로 돌아갈 땐 화면 상자 비율 고정을 풀어야 함 — 안 풀면 가로→좁고 긴 창(폰 세로 회전)에서 위아래 띠 + 세로 찌그러짐
  let tallH = game.scale.height;
  const fitMode = () => { const sm = game.scale, tall = innerHeight / innerWidth > BASE_H / W;
    if (tall) { if (sm.scaleMode !== Phaser.Scale.EXPAND) { sm.scaleMode = Phaser.Scale.EXPAND; sm.displaySize.setAspectMode(0 /* Size.NONE: 부팅 때 EXPAND 와 같게 비율 고정 없음 (EXPAND 값 6 은 Size 가 몰라 9:16 상자가 그대로 남음) */); sm.setGameSize(W, BASE_H); } }
    else if (sm.scaleMode !== Phaser.Scale.FIT || sm.width !== W) { sm.scaleMode = Phaser.Scale.FIT; sm.displaySize.setAspectMode(Phaser.Scale.FIT); sm.setGameSize(W, tallH); }
    sm.refresh(); if (sm.scaleMode === Phaser.Scale.EXPAND) tallH = sm.height; };
  const refresh = () => [60, 250, 600].forEach(ms => setTimeout(fitMode, ms));
  addEventListener('resize', refresh); addEventListener('orientationchange', refresh);
  window.__game = game;
  bm.onPause = on => { try { game.sound.mute = !!on; } catch { /* */ } };   /* 광고 · 확인 창 동안 소리 끔 */
  installBack(game, { home: 'Home', roots: [] });
}
start();
