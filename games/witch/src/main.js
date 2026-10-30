import { W, BASE_H, setH } from './config.js?v=0.94.0';
import { audio } from './audio.js?v=0.94.0';
import { BootScene } from './scenes/Boot.js?v=0.94.0';
import { TitleScene } from './scenes/Title.js?v=0.94.0';
import { LobbyScene } from './scenes/Lobby.js?v=0.94.0';
import { PlayScene } from './scenes/Play.js?v=0.94.0';
import { ResultScene } from './scenes/Result.js?v=0.94.0';
import { WindFX } from './fx.js?v=0.94.0';
import { installBack } from './oad.js?v=0.94.0';
import { bm } from './oad_bm.js?v=0.94.0';

async function start() {
  try { await document.fonts.load('48px Jua'); } catch { /* 기본 폰트 */ }
  document.getElementById('boot')?.remove();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: BASE_H,
    backgroundColor: '#1A1240',
    scale: { mode: innerHeight / innerWidth > BASE_H / W ? Phaser.Scale.EXPAND : Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
    input: { activePointers: 2 },
    fps: { target: 60 },
    pipeline: { WindFX },
    scene: [BootScene, TitleScene, LobbyScene, PlayScene, ResultScene],
  });
  audio.attach(game);
  setH(game.scale.height);
  game.scale.on('resize', gs => setH(gs.height));
  // 화면이 넓어지면(폴더블 펼침 · 가로 회전) EXPAND 가 가로로 늘어나 화면이 왼쪽으로 쏠림
  //   → 넓을 땐 지금까지의 세로 길이 그대로 FIT(가운데 정렬), 다시 길어지면 EXPAND
  //   EXPAND 로 돌아갈 땐 화면 상자 비율 고정을 풀어야 함 — 안 풀면 가로→좁고 긴 창(폰 세로 회전)에서 위아래 띠 + 세로 찌그러짐
  let tallH = game.scale.height;
  const fitMode = () => { const sm = game.scale, tall = innerHeight / innerWidth > BASE_H / W;
    if (tall) { if (sm.scaleMode !== Phaser.Scale.EXPAND) { sm.scaleMode = Phaser.Scale.EXPAND; sm.displaySize.setAspectMode(0 /* Size.NONE: 부팅 때 EXPAND 와 같게 비율 고정 없음 (EXPAND 값 6 은 Size 가 몰라 9:16 상자가 그대로 남음) */); sm.setGameSize(W, BASE_H); } }
    else if (sm.scaleMode !== Phaser.Scale.FIT || sm.width !== W) { sm.scaleMode = Phaser.Scale.FIT; sm.displaySize.setAspectMode(Phaser.Scale.FIT); sm.setGameSize(W, tallH); }
    sm.refresh(); if (sm.scaleMode === Phaser.Scale.EXPAND) tallH = sm.height; };
  const refresh = () => [60, 250, 600].forEach(ms => setTimeout(fitMode, ms));
  addEventListener('resize', refresh);
  addEventListener('orientationchange', refresh);
  window.__game = game;
  // 원어데이 게임 안 BM: 시작 때 한 번 인사 (원어데이 밖이면 ok:false → 골드 · 광고 버튼이 숨음)
  //   광고 · 골드 확인 창이 떠 있는 동안은 게임 전체를 멈춤 (실시간 게임 — 타이머 · 카운트다운 · 소리까지)
  bm.hello();
  bm.onPause = on => {
    try {
      if (on) { game.loop.sleep(); game.sound.pauseAll(); }
      else { game.loop.wake(); game.sound.resumeAll(); }
    } catch { /* */ }
  };
  installBack(game, { home: 'Lobby', roots: ['Title'] });   // One a Day 뒤로가기: 한 단계씩
}
// One a Day 앱 안에서 실행될 때(iframe)는 앱이 캐시를 관리하므로 게임 자체 서비스 워커는 쓰지 않음
const embedded = window.parent !== window;
if (!embedded && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
start();
