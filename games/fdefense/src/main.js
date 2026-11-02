import { PW, BASE_H, setH, setW } from './config.js?v=0.96.0';
import { audio } from './audio.js?v=0.96.0';
import { BootScene } from './scenes/Boot.js?v=0.96.0';
import { TitleScene } from './scenes/Title.js?v=0.96.0';
import { PlayScene } from './scenes/Play.js?v=0.96.0';
import { HomeScene } from './scenes/Home.js?v=0.96.0';
import { installBack } from './oad.js?v=0.96.0';
import { initBM } from './bmflow.js?v=0.96.0';

async function start() {
  try { await Promise.all(['700', '800'].map(w => document.fonts.load(`${w} 48px Pretendard`))); } catch { /* 기본 폰트 */ }
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: PW, height: BASE_H, backgroundColor: '#0E1118',
    scale: { mode: innerHeight / innerWidth > BASE_H / PW ? Phaser.Scale.EXPAND : Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, powerPreference: 'high-performance' },
    input: { activePointers: 2 }, fps: { target: 60 },
    scene: [BootScene, TitleScene, HomeScene, PlayScene],
  });
  audio.attach(game);
  setH(game.scale.height); setW(game.scale.width);
  game.scale.on('resize', gs => { setW(gs.width); setH(gs.height); });
  // 화면 맞춤
  //  · 세로 폰: 가로 1080 고정 · 세로는 기기 비율대로 (EXPAND)
  //  · 넓은 화면(폴드 펼침 · PC · 눕힌 폰의 홈): 세로 판을 가운데 FIT (dice 와 같은 방식)
  //  · 판 화면 + 눕힌 폰(v0.3.0 원작 맞춤): 원작 800×480 구성을 높이 1080(×2.25)으로 그대로 — 남는 폭은 원작 바깥 테두리 (EXPAND 1800×1080)
  const isLand = () => innerWidth > innerHeight * 1.2;
  let tallH = game.scale.height;
  // Phaser EXPAND 는 game.config 의 폭 · 높이를 기준 크기로 쓰므로 가로 판 화면이면 기준을 1800×1080 으로 바꿔 둔다
  const fitMode = () => { const sm = game.scale, tall = innerHeight / innerWidth > BASE_H / PW, land = !!game.__playLand && isLand();
    game.config.width = land ? 1800 : PW; game.config.height = land ? 1080 : BASE_H;
    if (land) { if (!sm.__land || sm.scaleMode !== Phaser.Scale.EXPAND) { sm.__land = true; sm.scaleMode = Phaser.Scale.EXPAND; sm.displaySize.setAspectMode(0); sm.setGameSize(1800, 1080); } }
    else if (tall) { if (sm.__land || sm.scaleMode !== Phaser.Scale.EXPAND) { sm.__land = false; sm.scaleMode = Phaser.Scale.EXPAND; sm.displaySize.setAspectMode(0 /* Size.NONE */); sm.setGameSize(PW, BASE_H); } }
    else if (sm.__land || sm.scaleMode !== Phaser.Scale.FIT || sm.width !== PW) { sm.__land = false; sm.scaleMode = Phaser.Scale.FIT; sm.displaySize.setAspectMode(Phaser.Scale.FIT); sm.setGameSize(PW, tallH); }
    sm.refresh(); if (sm.scaleMode === Phaser.Scale.EXPAND && !sm.__land) tallH = sm.height;
    setW(sm.width); setH(sm.height); };
  game.__fit = fitMode; game.__isLand = isLand;
  const refresh = () => [60, 250, 600].forEach(ms => setTimeout(fitMode, ms));
  addEventListener('resize', refresh); addEventListener('orientationchange', refresh);
  window.__game = game;
  initBM(game);
  installBack(game, { home: 'Home', roots: ['Title'] });
}
start();
