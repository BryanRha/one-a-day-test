import { W, BASE_H, setH } from './config.js?v=0.95.0';
import { audio } from './audio.js?v=0.95.0';
import { BootScene } from './scenes/Boot.js?v=0.95.0';
import { TitleScene } from './scenes/Title.js?v=0.95.0';
import { PlayScene } from './scenes/Play.js?v=0.95.0';
import { HomeScene } from './scenes/Home.js?v=0.95.0';
import { installBack } from './oad.js?v=0.95.0';
import { initBM } from './bmflow.js?v=0.95.0';

async function start() {
  try { await Promise.all(['700', '800'].map(w => document.fonts.load(`${w} 48px Pretendard`))); } catch { /* 기본 폰트 */ }
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: W, height: BASE_H, backgroundColor: '#0E1118',
    scale: { mode: innerHeight / innerWidth > BASE_H / W ? Phaser.Scale.EXPAND : Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' },
    input: { activePointers: 2 }, fps: { target: 60 },
    scene: [BootScene, TitleScene, HomeScene, PlayScene],
  });
  audio.attach(game);
  setH(game.scale.height);
  game.scale.on('resize', gs => setH(gs.height));
  // 넓은 화면(폴드 펼침 · PC)은 세로 길이 그대로 가운데 FIT, 다시 길어지면 EXPAND (dice 와 같은 방식)
  let tallH = game.scale.height;
  const fitMode = () => { const sm = game.scale, tall = innerHeight / innerWidth > BASE_H / W;
    if (tall) { if (sm.scaleMode !== Phaser.Scale.EXPAND) { sm.scaleMode = Phaser.Scale.EXPAND; sm.displaySize.setAspectMode(0 /* Size.NONE */); sm.setGameSize(W, BASE_H); } }
    else if (sm.scaleMode !== Phaser.Scale.FIT || sm.width !== W) { sm.scaleMode = Phaser.Scale.FIT; sm.displaySize.setAspectMode(Phaser.Scale.FIT); sm.setGameSize(W, tallH); }
    sm.refresh(); if (sm.scaleMode === Phaser.Scale.EXPAND) tallH = sm.height; };
  const refresh = () => [60, 250, 600].forEach(ms => setTimeout(fitMode, ms));
  addEventListener('resize', refresh); addEventListener('orientationchange', refresh);
  window.__game = game;
  initBM(game);
  installBack(game, { home: 'Home', roots: ['Title'] });
}
start();
