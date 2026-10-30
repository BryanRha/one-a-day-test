// 첫 화면 리소스만 먼저 받고(타이틀), 판 그림은 타이틀에서 이어 받는다 → 4G 첫 화면 3초
import { setData, T } from '../core/data.js?v=0.95.0';
import { audio, SFX } from '../audio.js?v=0.95.0';
import { load } from '../save.js?v=0.95.0';

export const PLAY_ATLAS = ['icons', 'mon', 'tower', 'fx', 'obj', 'tile', 'sword', 'spx', 'boss'];
export const FRAME_ATLAS = {};   // 그림 이름 → 아틀라스 키
// 첫 판(1-1)에 필요한 것만 먼저 (4G 에서 타이틀이 바로 뜨고 이어서 받음)
const CORE = { atlas: ['mon', 'tower', 'fx', 'obj', 'tile', 'sword'], img: ['bg0', 'hero_cut_sword'] };
const HOME = { atlas: ['icons'], img: ['world', 'hero_0', 'hero_1', 'hero_2', 'title_logo'] };
export function queue(sc, set) {
  for (const a of set.atlas || []) if (!sc.textures.exists(a)) sc.load.multiatlas(a, `assets/atlas/${a}.json`, 'assets/atlas/');
  for (const k of set.img || []) if (!sc.textures.exists(k)) sc.load.image(k, `assets/img/${k}.webp`);
  if (set.sfx) for (const k of SFX) if (!sc.cache.audio.exists(k)) sc.load.audio(k, [`assets/audio/${k}.m4a`]);
}
export const queueCore = sc => queue(sc, { ...CORE, sfx: true });
export const queueHome = sc => { queueCore(sc); queue(sc, HOME); };
// 판마다: 장 바닥 · 큰 보스 · 데려온 영웅 필살기
export function queueStage(sc, stage, owned) {
  queueCore(sc);
  const ch = Math.floor(stage / 10) % 5, big = (T.mobs[stage] || []).some(w => w[0] >= 100 || w[3] >= 100);
  const atlas = [], img = [`bg${ch}`];
  if (big) atlas.push('boss');
  if (owned[1] || owned[2]) { atlas.push('spx'); if (owned[1]) img.push('hero_cut_arrow'); if (owned[2]) img.push('hero_cut_ice'); }
  queue(sc, { atlas, img });
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
    this.load.image('logo_ko', 'assets/img/logo_ko.webp');
    const g = this.add.graphics();
    this.load.on('progress', p => { g.clear(); g.fillStyle(0x2A3142, 1).fillRoundedRect(340, 1100, 400, 12, 6); g.fillStyle(0xFFC94A, 1).fillRoundedRect(340, 1100, 400 * p, 12, 6); });
  }
  create() {
    setData(this.cache.json.get('tables'), this.cache.json.get('anims'));
    load();
    this.scene.start('Title');
  }
}
