// 클래식 결과: 점수 · 최고 기록 · 지운 줄 · 최고 콤보 · 오늘의 미션 진행 → 다시 하기 / 홈
import { W, H } from '../config.js?v=0.90.5';
import { T, C, fmt, panel, btn, iconBtn, toast } from '../pui.js?v=0.90.5';
import { audio } from '../audio.js?v=0.90.5';
import { load } from '../save.js?v=0.90.5';
import * as M from '../meta.js?v=0.90.5';
import { bm } from '../oad_bm.js?v=0.90.5';
import { canDouble } from '../core/cont.js?v=0.90.5';
import { afterRound, doubleUsed, noteDouble } from '../bmflow.js?v=0.90.5';
import { hallShown, hallPopup, submitLine } from '../hall.js?v=0.90.5';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  create(r) {
    this.going = false; window.__dbl = null;
    const d = load();
    const bg = this.add.image(W / 2, H / 2, `bg_t${d.theme % 5}`); bg.setDisplaySize(W, Math.max(H, W * 1300 / 540));
    const top = 240 + Math.max(0, (H - 1920) / 3);
    if (r.newBest) { this.add.image(W / 2, top - 30, 'i_crown').setDisplaySize(90, 90).setTint(0xF5C451); }
    const title = T(this, W / 2, top + 60, r.newBest ? (r.conts ? '역전! NEW BEST' : 'NEW BEST') : 'GOOD GAME', 34, r.newBest ? C.gold : C.sub, { w: 900, ls: 10 });
    const sc = T(this, W / 2, top + 190, '0', 170, C.text, { w: 900 });
    this.tweens.addCounter({ from: 0, to: r.score, duration: 1000, ease: 'Cubic.easeOut', onUpdate: tw => sc.setText(fmt(tw.getValue())) });
    const cy = top + 520;
    this.add.existing(panel(this, W / 2, cy, 900, 330));
    // AI 수 정확도 (바둑·체스 AI 복기처럼) — 잘한 판일수록 크게
    if (r.acc) { const ac = T(this, W / 2, top + 330, `AI 평균 수 가치 ${r.acc}%  ·  최선의 수 ${r.bestMoves}번`, 36, r.acc >= 80 ? C.green : C.cyan, { w: 900 }); if (r.acc >= 92) T(this, W / 2, top + 384, '프로 수준의 판단이에요!', 30, C.gold, { w: 800 }); }
    [['최고 기록', fmt(r.best), C.gold], ['지운 줄', `${fmt(r.lines)}`, C.text], ['최고 콤보', `×${r.combo}`, C.text]].forEach(([k, v, col], i) => {
      const y = cy - 100 + i * 100;
      T(this, 150, y, k, 36, C.sub, { ox: 0, w: 800 }); T(this, W - 150, y, v, 44, col, { ox: 1, w: 900 });
    });
    // 오늘의 미션 진행 (재방문 동기)
    const ms = M.missions(), done = ms.filter(m => m.done).length, ready = ms.filter(m => m.done && !m.claimed).length;
    T(this, W / 2, cy + 250, ready ? `🎁 받을 미션 보상 ${ready}개 — 홈에서 받으세요` : `오늘의 미션 ${done}/3 완료`, 32, ready ? C.gold : C.sub, { w: 800 });
    if (r.newBest) { audio.play('sfx_best', { volume: 0.7 }); this.time.delayedCall(200, () => this.cameras.main.flash(250, 255, 240, 200)); title.setScale(0); this.tweens.add({ targets: title, scale: 1, duration: 400, ease: 'Back.easeOut' }); }
    // 별 조각 2배 (이번 판에 받은 별이 있을 때 · 광고 1회 · 하루 3번 · 원어데이 안에서만)
    let dbl = null;
    if (canDouble(r.stars || 0, bm.info, doubleUsed())) {
      const own = bm.info.owned;
      const db = btn(this, W / 2, cy + 345, 620, 104, `★ ${r.stars} → ${r.stars * 2}  ${own ? '무료로 2배' : '광고 보고 2배'}`, async () => {
        if (db.disabled) return; db.setEnabled(false);
        const res = await bm.rewardedAd('stars2x');
        if (!this.scene.isActive()) return;
        if (res && res.ok) { noteDouble(r.stars); db.setLabel(`★ +${r.stars} 더 받았어요!`); db.setAlpha(1); audio.play('sfx_best', { volume: 0.5 }); }
        else { db.setEnabled(true); if (res && res.reason === 'limit') { toast(this, '오늘 광고 보상을 다 받았어요', C.sub); db.setEnabled(false); } }
      }, { style: 'indigo', icon: own ? 'i_star' : 'i_film', size: 34 });
      dbl = db; window.__dbl = db;
    } else if (r.stars) T(this, W / 2, cy + 345, `★ +${r.stars} 별 조각`, 36, C.gold, { w: 800 });
    const by = Math.min(H - 150, cy + 420 + (dbl || r.stars ? 75 : 0));
    btn(this, W / 2 + 90, by, 560, 140, '다시 하기', () => this.go('Play', { mode: 'classic' }), { style: 'gold', icon: 'i_retry', size: 46 });
    iconBtn(this, W / 2 - 300, by - 4, 'i_home', () => this.go('Home'), 130);
    this.cameras.main.fadeIn(260, 8, 10, 24);
    // 이번 주 명예의 전당 (원어데이 안에서만): 점수 올리기 → 한 줄 안내 + 보기 버튼
    if (hallShown()) {
      const hy = by + 130;
      const line = T(this, W / 2 - 60, hy, '', 28, C.sub, { w: 800 });
      iconBtn(this, W / 2 + 380, hy, 'i_trophy', () => hallPopup(this), 96);
      bm.submitScore(r.score, { assisted: !!r.assisted }).then(res => {
        window.__submit = res;
        const l = submitLine(res); if (!l || !line.scene) return;
        line.setText(l.text).setColor(l.color);
      });
    }
    window.__result = r;
  }
  go(k, data) { if (this.going) return; this.going = true; afterRound().then(() => this.fade(k, data)); }
  fade(k, data) { this.cameras.main.fadeOut(220, 8, 10, 24); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
