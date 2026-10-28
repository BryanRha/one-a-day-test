// 결과: 거리 · 점수(최고 기록) · 코인 · 칼치기 기록 → 다시 달리기 / 차고
import { W, H } from '../config.js?v=0.87.1';
import { txt, fmt, fit, button, iconButton } from '../ui.js?v=0.87.1';
import { audio } from '../audio.js?v=0.87.1';
import { load, save } from '../save.js?v=0.87.1';
import { wind } from '../fx.js?v=0.87.1';
import { applyRun } from '../meta.js?v=0.87.1';
import { bm } from '../oad_bm.js?v=0.87.1';
import { canDouble, AD_DAY } from '../core/cont.js?v=0.87.1';
import { adLeft, adUse } from '../bmflow.js?v=0.87.1';
import { hallShown, submitLine, hallPopup } from '../hall.js?v=0.87.1';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  init(r) { this.r = r; }
  create() {
    const r = this.r, out = applyRun(r), d = load();
    this.cameras.main.fadeIn(300, 20, 26, 50);
    const g = this.add.graphics();
    g.fillGradientStyle(0x2B4C9B, 0x2B4C9B, 0x7CC8FF, 0x7CC8FF, 1).fillRect(0, 0, W, H);
    audio.play(out.newBest ? 'sfx_checkpoint' : 'sfx_end', { volume: 0.7 });
    this.time.delayedCall(2200, () => audio.music('bgm_lobby', this));

    const top = Math.max(120, H / 2 - 820);
    /* 칭찬 먼저 · 이어 달린 판은 '역전' */
    const title = out.newBest ? (r.revived ? '🏆 역전! 최고 기록!' : '🏆 최고 기록!') : r.dist >= 1500 ? '멋진 질주!' : '레이스 결과';
    txt(this, W / 2, top, title, 88, '#FFE14D', { stroke: '#1E2A52', thick: 16 });
    if (r.revived && r.afterRevive > 0) txt(this, W / 2, top + 84, `이어 달려 ${fmt(r.afterRevive)}m 더!`, 40, '#FFFFFF', { stroke: '#1E2A52', thick: 8 });
    const dr = fit(this.add.image(W / 2, top + 290, `driver_${d.driver}`), 420);
    wind(dr, 1, 0.01);
    this.tweens.add({ targets: dr, y: dr.y - 14, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // 점수 카드
    const cy = top + 760;
    const card = this.add.graphics();
    card.fillStyle(0xFFFFFF, 0.96).fillRoundedRect(60, cy - 250, W - 120, 640, 36).lineStyle(6, 0x1E2A52).strokeRoundedRect(60, cy - 250, W - 120, 640, 36);
    txt(this, W / 2, cy - 190, '점수', 40, '#5A6488', { stroke: '#FFFFFF', thick: 4 });
    const sc = txt(this, W / 2, cy - 110, '0', 110, '#FF8A1F', { stroke: '#1E2A52', thick: 14 });
    this.tweens.addCounter({ from: 0, to: r.score, duration: 900, ease: 'Cubic.easeOut', onUpdate: tw => sc.setText(fmt(tw.getValue())) });
    const rows = [['달린 거리', `${fmt(r.dist)}m`], ['체크포인트', `${r.cp}개`], ['칼치기 · PERFECT', `${fmt(r.honks)} · ${r.perfects || 0}`], ['최고 콤보 · 피버', `×${r.combo} · ${r.fevers || 0}번`], ['점프샷 · 밀어내기', `${r.jumpshots} · ${r.rams}`]];
    rows.forEach(([k, v], i) => {
      const y = cy + 10 + i * 66;
      txt(this, 120, y, k, 38, '#1E2A52', { ox: 0, stroke: '#FFFFFF', thick: 4 });
      txt(this, W - 120, y, v, 40, '#3B5BDB', { ox: 1, stroke: '#FFFFFF', thick: 4 });
    });
    const two = canDouble(r.coins, bm.info, AD_DAY.coins2x - adLeft('coins2x')), cx0 = two ? W / 2 - 330 : W / 2 - 90;
    this.add.image(cx0, cy + 340, 'item_coin').setDisplaySize(64, 64);
    const coinT = txt(this, cx0 + 50, cy + 340, `+${fmt(r.coins)}`, 52, '#FFFFFF', { ox: 0, stroke: '#1E2A52', thick: 10 });
    if (two) this.coins2x(r, coinT, W / 2 + 200, cy + 340);
    /* 명예의 전당 (원어데이 안 · 소장자 혜택): 이어하기 · 응원 선물을 받은 판은 assisted */
    if (hallShown()) {
      const line = txt(this, W / 2, cy + 455, '', 30, '#FFFFFF', { stroke: '#1E2A52', thick: 6 });
      bm.submitScore(r.score, { assisted: !!(r.revived || r.helped) }).then(res => { this.submit = res; const l = submitLine(res); if (l && line.active) line.setText(l.text).setColor(l.color); }).catch(() => {});
    }

    const hall = hallShown(), by = hall ? Math.min(H - 280, cy + 600) : Math.min(H - 150, cy + 520);
    button(this, W / 2 + 150, by, '다시 달리기', () => this.go('Play'), { key: 'btn_gold', w: 540, h: 160, icon: 'ico_retry' });
    iconButton(this, W / 2 - 300, by, 'ico_home', () => this.go('Lobby'), 160);
    if (hall) button(this, W / 2, by + 150, '🏆 이번 주 명예의 전당', () => hallPopup(this), { key: 'btn_purple', w: 620, h: 100, size: 36 });
    window.__result = r;
  }
  // 결과 코인 2배: 광고 1회 (소장자는 광고 없이 바로 · 횟수는 같음) · 하루 3번 — 골드 상품이 아니라 광고 자리만
  coins2x(r, coinT, x, y) {
    const owner = !!bm.info.owned;
    const btn = button(this, x, y, owner ? '소장 혜택 · 2배' : '광고 보고 2배', async () => {
      if (btn.disabled) return; btn.setEnabled(false);
      const a = await bm.rewardedAd('coins2x');
      if (!a.ok) { if (a.reason !== 'limit') btn.setEnabled(true); else btn.setLabel('오늘은 여기까지'); return; }
      adUse('coins2x');
      const d = load(); d.coins += r.coins; save();
      coinT.setText(`+${fmt(r.coins * 2)}`).setColor('#FFE14D');
      this.tweens.add({ targets: coinT, scale: 1.3, duration: 160, yoyo: true });
      audio.play('sfx_gold', { volume: 0.7 });
      btn.setLabel('2배 받았어요!');
    }, { key: 'btn_pink', w: 400, h: 100, size: 34 });
    window.__coins2x = btn;
  }
  go(scene) { this.cameras.main.fadeOut(250, 20, 26, 50); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene)); }
}
