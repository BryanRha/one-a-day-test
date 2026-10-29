// 로딩: 원화(manifest) · 효과음 → 패 48장 합성 · 효과 텍스처 → 첫 화면
import { W, H, C } from '../config.js?v=0.90.2';
import { SFX } from '../audio.js?v=0.90.2';
import { DECK } from '../meta.js?v=0.90.2';
import { makeCardTextures, makeCardFx, backTex } from '../cards.js?v=0.90.2';
import { makeFxTextures } from '../fx.js?v=0.90.2';
import { txt } from '../ui.js?v=0.90.2';
import { helloOnce, BACKS, track } from '../bmflow.js?v=0.90.2';
import { load, save } from '../save.js?v=0.90.2';
import { GODS } from '../core/gods.js?v=0.90.2';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    this.cameras.main.setBackgroundColor('#0A0809');
    const t = txt(this, W / 2, H / 2 - 40, '오늘의 패', 72, C.gold, { thick: 0, stroke: null });
    const barBg = this.add.rectangle(W / 2, H / 2 + 60, 520, 6, 0x2a2020), bar = this.add.rectangle(W / 2 - 260, H / 2 + 60, 1, 6, 0xe8c27a).setOrigin(0, 0.5);
    this.load.on('progress', p => { bar.width = 520 * p; });
    this.load.json('manifest', 'assets/manifest.json');
    this.load.once('filecomplete-json-manifest', (k, ty, data) => {
      for (const key of data.images) this.load.image(key, `assets/img/${key}.webp`);
      for (const key of SFX) if (data.audio.includes(key)) this.load.audio(key, [`assets/audio/${key}.m4a`]);
    });
    t.setAlpha(0.9); barBg.setAlpha(0.8);
  }
  async create() {
    makeCardTextures(this, DECK);
    makeCardFx(this);
    makeFxTextures(this);
    for (const b of BACKS) backTex(this, b.id);
    // 계절신 얼굴: 둥글게 자른 것(머리판 · 도감) + 가장자리가 어둠에 녹는 것(소개)
    for (const g of GODS) {
      const src = this.textures.get(g.id).getSourceImage(), S = src.width;
      const c1 = this.textures.createCanvas('godc_' + g.id, S, S), a = c1.getContext();
      a.beginPath(); a.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); a.clip(); a.drawImage(src, 0, 0); c1.refresh();
      const c2 = this.textures.createCanvas('godf_' + g.id, S, S), b = c2.getContext();
      b.drawImage(src, 0, 0); b.globalCompositeOperation = 'destination-in';
      const rg = b.createRadialGradient(S / 2, S * 0.46, S * 0.3, S / 2, S / 2, S * 0.5); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      b.fillStyle = rg; b.fillRect(0, 0, S, S); c2.refresh();
    }
    await Promise.race([helloOnce(), new Promise(r => setTimeout(r, 900))]);
    /* 판 도중 앱이 닫혔던 흔적 → 중도 이탈 기록 (판은 '이어서 하기'로 남음) */
    const d = load();
    if (d.run && d.runOpen) { track('run_quit', { gate: d.run.gate, phase: d.run.phase, sec: Math.round((Date.now() - (d.run.t0 || Date.now())) / 1000), first: d.run.mode === 'first' ? 1 : 0, how: 'closed' }); d.runOpen = false; save(); }
    this.scene.start('Home');
  }
}
