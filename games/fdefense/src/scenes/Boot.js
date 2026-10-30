// 첫 화면 리소스만 먼저 받고(타이틀), 판 그림은 타이틀에서 이어 받는다 → 4G 첫 화면 3초
import { setData } from '../core/data.js?v=0.94.0';
import { audio, SFX } from '../audio.js?v=0.94.0';
import { load } from '../save.js?v=0.94.0';

export const PLAY_ATLAS = ['mon', 'tower', 'fx', 'obj', 'tile', 'sword'];
export const FRAME_ATLAS = {};   // 그림 이름 → 아틀라스 키

export function queuePlayAssets(sc) {
  for (const a of PLAY_ATLAS) if (!sc.textures.exists(a)) sc.load.multiatlas(a, `assets/atlas/${a}.json`, 'assets/atlas/');
  for (const k of ['bg0', 'hero_cut_sword']) if (!sc.textures.exists(k)) sc.load.image(k, `assets/img/${k}.webp`);
  for (const k of SFX) if (!sc.cache.audio.exists(k)) sc.load.audio(k, [`assets/audio/${k}.m4a`]);
}
export function indexFrames(sc) {
  for (const a of PLAY_ATLAS) if (sc.textures.exists(a)) for (const f of sc.textures.get(a).getFrameNames()) FRAME_ATLAS[f] = a;
}

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.load.json('tables', 'assets/data/tables.json');
    this.load.json('anims', 'assets/data/anims.json');
    this.load.image('story_1', 'assets/img/story_1.webp');
    this.load.image('title_logo', 'assets/img/title_logo.webp');
    const g = this.add.graphics();
    this.load.on('progress', p => { g.clear(); g.fillStyle(0x2A3142, 1).fillRoundedRect(340, 1100, 400, 12, 6); g.fillStyle(0xFFC94A, 1).fillRoundedRect(340, 1100, 400 * p, 12, 6); });
  }
  create() {
    setData(this.cache.json.get('tables'), this.cache.json.get('anims'));
    load();
    this.scene.start('Title');
  }
}
