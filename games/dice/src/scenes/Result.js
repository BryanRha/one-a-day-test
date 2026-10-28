// 결과: 도달 웨이브 · 처치 · 보스 · 최고 눈 · 받은 수정 · 새 해금
import { W, H } from '../config.js?v=0.77.1';
import { T, C, fmt, panel, btn, iconBtn, toast } from '../pui.js?v=0.77.1';
import { audio } from '../audio.js?v=0.77.1';
import { load } from '../save.js?v=0.77.1';
import * as M from '../meta.js?v=0.77.1';
import * as BM from '../bmflow.js?v=0.77.1';
import { RUNES } from '../core/sim.js?v=0.77.1';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  create(r) {
    this.busy = false; this.leaving = false; this.x2 = null;
    const bg = this.add.image(W / 2, H / 2, M.bgKey()); bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.add.rectangle(W / 2, H / 2, W, H, 0x05061A, 0.6);
    const top = 260 + Math.max(0, (H - 1920) / 3);
    const A = M.ARCADE[r.mode];
    T(this, W / 2, top, r.newBest ? 'NEW RECORD' : A ? A.en : r.mode === 'daily' ? 'DAILY CHALLENGE' : 'EXPEDITION OVER', 32, r.newBest ? C.gold : C.sub, { w: 900, ls: 8 });
    if (A) T(this, W / 2, top + 44, A.name, 30, C.text, { w: 900 });
    T(this, W / 2, top + (A ? 150 : 130), r.mode === 'rush' ? `BOSS ${r.bossKills}` : `WAVE ${r.wave}`, 150, C.text, { w: 900, ls: 2 });
    if (r.newBest) { audio.play('sfx_wave', { volume: 0.8 }); this.time.delayedCall(200, () => this.cameras.main.flash(260, 255, 230, 200)); }
    const cy = top + 470;
    this.add.existing(panel(this, W / 2, cy, 900, 380));
    [['처치한 적', fmt(r.kills)], ['보스 처치', `${r.bossKills}`], ['최고 주사위', `${r.maxPips}눈${r.maxPips >= 7 ? ' · 각성' : ''}`], ['얻은 수정', `◆ ${r.crystals}`], ['명성 (보상 길)', `+${r.fame || 0}`]].forEach(([k, v], i) => {
      const y = cy - 150 + i * 74; T(this, 150, y, k, 36, C.sub, { ox: 0, w: 800 }); const t = T(this, W - 150, y, v, 42, i === 3 ? '#8FE3FF' : i === 4 ? C.gold : C.text, { ox: 1, w: 900 }); if (i === 3) this.cryT = t;
    });
    if (r.keys) {   // 웨이브 이정표 → 제단 열쇠
      const uy = cy + 300; T(this, W / 2, uy - 30, `웨이브 이정표 달성 · 제단 열쇠 +${r.keys}`, 40, C.gold, { w: 900 });
      btn(this, W / 2, uy + 60, 420, 100, '룬 제단에서 뽑기', () => this.go('Altar'), { style: 'indigo', icon: 'i_star', size: 32 });
      audio.play('sfx_awaken', { volume: 0.7 });
    }
    const by = Math.min(H - 150, cy + 700);
    // 광고 보고 수정 2배 (원어데이 안 · 하루 3번 · 소장자는 바로) — 판을 살리는 게 아니라 받은 보상만 한 번 더
    const add = Math.min(BM.AD.x2Cap, r.crystals || 0);
    if (add > 0 && BM.oadOn() && BM.x2Left() && (BM.owned() || BM.adReady()) && !r.bot) {
      const own = BM.owned();
      this.x2 = btn(this, W / 2, by - 170, 700, 110, own ? `소장 혜택 · 수정 2배  ◆+${add}` : `광고 보고 수정 2배  ◆+${add}`, async () => {
        if (this.busy) return; this.busy = true; const res = await BM.doubleReward(r.crystals); this.busy = false;
        if (!res.ok) { const m = BM.failMsg(res); if (m) toast(this, m, C.sub, by - 320); return; }
        this.x2.destroy(); this.cryT.setText(`◆ ${r.crystals + res.add}`); this.tweens.add({ targets: this.cryT, scale: 1.3, duration: 160, yoyo: true });
        audio.play('sfx_awaken', { volume: 0.7 }); toast(this, `수정 +${res.add}`, '#8FE3FF', by - 320);
      }, { style: 'green', icon: own ? 'i_crown' : 'i_film', size: 32 });
      T(this, W / 2, by - 98, `오늘 ${BM.x2Left()}번 남음`, 22, C.dim, { w: 800 });
    }
    btn(this, W / 2 + 90, by, 560, 140, A ? '아케이드로' : '다시 출정', () => A ? this.go('Arcade') : this.go('Play', { mode: r.mode === 'daily' ? 'run' : r.mode }), { style: 'gold', icon: 'i_retry', size: 44 });
    iconBtn(this, W / 2 - 300, by - 4, 'i_home', () => this.go('Home'), 130);
    this.cameras.main.fadeIn(300, 5, 6, 26);
    window.__result = r;
  }
  // 넘어갈 때 판 끝 전면 광고를 한 번 물어봄 (앱이 그룹 · 간격 · 소장 · 첫날을 보고 정함 · 실패 순간엔 안 부름)
  async go(k, data) { if (this.leaving) return; this.leaving = true; await BM.afterRound(); this.cameras.main.fadeOut(220, 5, 6, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
