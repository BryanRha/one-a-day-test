// 타이틀: 원작 전쟁 일러스트를 천천히 훑으며 로고 · 불씨 · 출정 버튼. 판 그림은 여기서 이어 받는다
import { W, H, C } from '../config.js?v=0.94.1';
import { text, button } from '../ui.js?v=0.94.1';
import { audio } from '../audio.js?v=0.94.1';
import { queuePlayAssets, indexFrames } from './Boot.js?v=0.94.1';
import { load } from '../save.js?v=0.94.1';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    this.ready = false;
    const bg = this.add.image(W / 2, H / 2, 'story_1');
    const s = Math.max(H / bg.height, W / bg.width) * 1.04; bg.setScale(s);
    const span = Math.max(0, (bg.displayWidth - W) / 2);
    bg.x = W / 2 + span * 0.55;
    this.tweens.add({ targets: bg, x: W / 2 - span * 0.55, duration: 26000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // 위아래 어둡게
    const g = this.add.graphics();
    for (let i = 0; i < 60; i++) { g.fillStyle(0x07080C, 0.92 * (1 - i / 60) ** 1.3); g.fillRect(0, i * 14, W, 14); }
    for (let i = 0; i < 60; i++) { g.fillStyle(0x07080C, 0.95 * (i / 60) ** 1.4); g.fillRect(0, H - 840 + i * 14, W, 14); }
    // 불씨
    this.time.addEvent({ delay: 120, loop: true, callback: () => {
      const e = this.add.circle(Phaser.Math.Between(0, W), H + 10, Phaser.Math.Between(3, 7), Phaser.Utils.Array.GetRandom([0xFFB347, 0xFF7A3D, 0xFFE08A]), 1).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: e, y: H * Phaser.Math.FloatBetween(0.25, 0.7), x: e.x + Phaser.Math.Between(-120, 120), alpha: 0, duration: Phaser.Math.Between(2600, 4600), onComplete: () => e.destroy() });
    } });
    const logo = this.add.image(W / 2, H * 0.2, 'logo_ko').setAlpha(0).setScale(1.2);
    this.tweens.add({ targets: logo, alpha: 1, scale: 0.95, duration: 700, ease: 'Back.out', delay: 200 });
    const flash = this.add.rectangle(W / 2, H / 2, W, H, 0xFFFFFF, 0).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: flash, fillAlpha: { from: 0.35, to: 0 }, duration: 500, delay: 650 });
    const sub = text(this, W / 2, H * 0.2 + 270, '병사와 영웅으로 성문을 지켜라', 40, C.ink, { weight: '700' }).setAlpha(0);
    this.tweens.add({ targets: sub, alpha: 0.92, duration: 600, delay: 900 });

    const d = load(), first = !d.plays;
    if (first) { text(this, W / 2, H - 470, '1장 · 숲', 36, C.mute, { weight: '700' }); text(this, W / 2, H - 418, '1-1  수풀 길', 54, C.ink); }
    this.go = button(this, W / 2, H - 290, 620, 150, '준비 중…', () => this.start(), { fill: 0x5A3B12, edge: C.accent, size: 64, color: C.gold, r: 40 });
    this.go.setEnabled(false); this.first = first;
    text(this, W / 2, H - 150, first ? '웨이브 15 · 약 4분' : `깬 스테이지 ${Object.keys(d.cleared).length}/50 · 명예 ${d.heroism.toLocaleString()}`, 32, C.mute, { weight: '700' });
    text(this, W / 2, H - 70, 'SN · One a Day', 26, '#6D6A60', { weight: '700', shadow: false });

    queuePlayAssets(this);
    this.load.on('progress', p => { if (!this.ready) this.go.label.setText(`준비 중 ${Math.round(p * 100)}%`); });
    this.load.once('complete', () => {
      indexFrames(this); this.ready = true;
      this.go.label.setText(this.first ? '▶  출정' : '▶  시작'); this.go.setEnabled(true);
      this.tweens.add({ targets: this.go, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
    this.load.start();
    audio.music('bgm_1', this);
    this.input.once('pointerdown', () => { if (!audio.current) audio.music('bgm_1', this); });
  }
  start() {
    if (!this.ready) return;
    this.cameras.main.fadeOut(260, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.first ? this.scene.start('Play', { stage: 0, mode: 0 }) : this.scene.start('Home'));
  }
}
