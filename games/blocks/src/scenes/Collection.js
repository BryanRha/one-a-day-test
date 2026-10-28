// 컬렉션: 블록 스킨(별 조각으로 해금 · 원어데이 안에서는 소장자 전용 1 · 골드 1 추가) · 지난 주 그림 갤러리 · 기록
import { W, H } from '../config.js?v=0.77.1';
import { T, C, fmt, panel, btn, iconBtn, toast } from '../pui.js?v=0.77.1';
import { audio } from '../audio.js?v=0.77.1';
import { load, save } from '../save.js?v=0.77.1';
import { SKINS } from '../meta.js?v=0.77.1';
import { makeSkinPreview, makeBlockTextures } from './Boot.js?v=0.77.1';
import { special, skinShown, skinOpen, effSkin, buySkin } from '../bmflow.js?v=0.77.1';
import { bm } from '../oad_bm.js?v=0.77.1';

export class CollectionScene extends Phaser.Scene {
  constructor() { super('Collection'); }
  create(data = {}) {
    const d = load(); this.busy = false;
    const bg = this.add.image(W / 2, H / 2, `bg_t${d.theme % 5}`); bg.setDisplaySize(W, Math.max(H, W * 1300 / 540));
    iconBtn(this, 80, 92, 'i_home', () => this.go('Home'), 96);
    T(this, W / 2, 92, '컬렉션', 44, C.text, { w: 900 });
    this.add.image(W - 220, 92, 'i_star').setDisplaySize(44, 44).setTint(0xF5C451);
    this.starTxt = T(this, W - 188, 92, fmt(d.stars), 36, C.gold, { ox: 0, w: 900 });
    this.tab = data.tab || 'skin';
    ['skin', 'record'].forEach((k, i) => btn(this, W / 2 - 170 + i * 340, 210, 300, 88, k === 'skin' ? '블록 스킨' : '기록 · 갤러리', () => this.scene.restart({ tab: k }), { style: this.tab === k ? 'indigo' : 'ghost', size: 32 }));
    if (this.tab === 'skin') this.skins(); else this.records();
    this.cameras.main.fadeIn(200, 8, 10, 24);
  }
  skins() {
    const d = load(), list = SKINS.filter(skinShown), cur = effSkin();
    const rows = Math.ceil(list.length / 2), gap = rows > 3 ? 370 : 420, ph = rows > 3 ? 350 : 390, y0 = rows > 3 ? 450 : 470;
    list.forEach((s, i) => {
      const x = i % 2 ? W / 2 + 235 : W / 2 - 235, y = y0 + Math.floor(i / 2) * gap, k = ph / 390;
      const sp = special(s), open = sp ? skinOpen(s) : d.skins[s.id], using = cur === s.id;
      this.add.existing(panel(this, x, y, 450, ph, { tone: using ? 'gold' : undefined }));
      if (sp) T(this, x - 190, y - ph / 2 + 34, s.owner ? '소장 전용' : '원어데이', 22, s.owner ? C.gold : C.cyan, { ox: 0, w: 800 });
      this.add.image(x, y - 82 * k, makeSkinPreview(this, s.id)).setDisplaySize(170 * k, 170 * k);
      T(this, x, y + 34 * k, s.name, 40, C.text, { w: 900 });
      T(this, x, y + 76 * k, s.desc, 24, C.sub, { w: 700 });
      const use = () => { d.skin = s.id; save(); makeBlockTextures(this, s.id); this.scene.restart({ tab: 'skin' }); };
      let label, style;
      if (using) { label = '사용 중'; style = 'ghost'; }
      else if (open) { label = '사용하기'; style = 'indigo'; }
      else if (s.owner) { label = '소장하면 열려요'; style = 'ghost'; }
      else if (s.sku) { label = `🪙 ${bm.price(s.sku) || ''}`; style = 'gold'; }
      else { label = `★ ${s.cost}`; style = 'gold'; }
      const b = btn(this, x, y + 148 * k, 300, 80, label, async () => {
        if (using || this.busy) return;
        if (open) return use();
        if (s.owner) return toast(this, '이 게임을 소장하면 바로 열려요', C.sub);
        if (s.sku) {
          this.busy = true; b.setEnabled(false);
          const r = await buySkin(s);
          this.busy = false;
          if (!this.scene.isActive()) return;
          if (r.ok) { audio.play('sfx_best', { volume: 0.6 }); return use(); }
          b.setEnabled(true);
          if (r.reason === 'short') toast(this, '골드가 조금 모자라요', C.gold);
          else if (r.reason === 'login') toast(this, '로그인하면 골드를 쓸 수 있어요', C.sub);
          else if (r.reason !== 'cancel') toast(this, '지금은 살 수 없어요', C.sub);
          return;
        }
        if (d.stars < s.cost) return toast(this, '별 조각이 부족해요 — 오늘의 미션으로 모아요', C.sub);
        d.stars -= s.cost; d.skins[s.id] = true; audio.play('sfx_best', { volume: 0.6 }); use();
      }, { style, size: s.owner && !open ? 26 : 30, ls: s.sku ? 0 : undefined });
      if (using) b.setEnabled(false).setAlpha(0.8);
      else if (s.owner && !open) b.setAlpha(0.7);
      b.skinId = s.id;
    });
    this.skinCards = list.map(s => s.id);
  }
  records() {
    const d = load(), rows = [['클래식 최고 점수', fmt(d.best)], ['최고 콤보', `×${d.bestCombo}`], ['지운 줄 (누적)', fmt(d.lines)], ['플레이한 판', fmt(d.plays)], ['연속 출석', `${d.streak.count}일`], ['어드벤처 트로피', `${d.trophies}개`]];
    this.add.existing(panel(this, W / 2, 620, 960, 560));
    rows.forEach(([k, v], i) => { T(this, 110, 400 + i * 84, k, 36, C.sub, { ox: 0, w: 800 }); T(this, W - 110, 400 + i * 84, v, 40, C.text, { ox: 1, w: 900 }); });
    T(this, W / 2, 990, '지난 주 그림', 38, C.text, { w: 900 });
    if (!d.gallery.length) T(this, W / 2, 1080, '이번 주 그림을 완성하면 여기에 걸려요', 30, C.dim, { w: 700 });
    d.gallery.slice(-6).forEach((gi, i) => {
      const x = W / 2 - 320 + (i % 3) * 320, y = 1160 + Math.floor(i / 3) * 260;
      const im = this.add.image(x, y, `season_${gi.season % 10}`).setDisplaySize(288, 192);
      if (!gi.trophy) im.setAlpha(0.45);
      T(this, x, y + 120, gi.trophy ? `🏆 ${gi.cleared}/96` : `${gi.cleared}/96`, 26, gi.trophy ? C.gold : C.sub, { w: 800 });
    });
  }
  go(k) { this.cameras.main.fadeOut(200, 8, 10, 24); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k)); }
}
