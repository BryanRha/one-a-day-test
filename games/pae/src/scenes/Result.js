// 판 끝: 이번 판에 얻은 것부터(꽃잎 · 도감) → 기록 → 독설 한 줄 → 꽃잎 2배(광고/골드) → 다시
import { W, H, C } from '../config.js?v=0.92.3';
import { load, save } from '../save.js?v=0.92.3';
import { audio } from '../audio.js?v=0.92.3';
import { txt, button, toast, boxTex, fmt } from '../ui.js?v=0.92.3';
import { burst } from '../fx.js?v=0.92.3';
import { endLine, tipLine, rules } from '../meta.js?v=0.92.3';
import { Run } from '../core/run.js?v=0.92.3';
import { GOD } from '../core/gods.js?v=0.92.3';
import { bm, bmOn, owned, price, adLeft, dblUsed, noteDbl, afterRound, track } from '../bmflow.js?v=0.92.3';

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }
  init(data) { this.s = data.s; this.runJ = data.run; }
  create() {
    const s = this.s, d = load();
    this.busy = false;
    const run = Run.from(rules, this.runJ);
    const bg = this.add.image(W / 2, H / 2, s.won ? 'bg_spring' : run.season.bg); bg.setScale(Math.max(W / bg.width, H / bg.height)).setAlpha(0.55);
    this.add.rectangle(W / 2, H / 2, W, H, 0x070505, 0.55);
    audio.music('bgm_main', this);
    const top = Math.max(150, H * 0.09);
    txt(this, W / 2, top, s.won ? '열두 달 완주!' : '판 끝', s.won ? 96 : 84, C.gold, { thick: 6, shadow: true, weight: '900' });
    txt(this, W / 2, top + 92, s.won ? '계절신 넷을 모두 넘었어요' : `${s.gate}월까지 · ${s.cleared}달 통과`, 38, C.ivory, { thick: 3, weight: '700' });
    if (s.won) { burst(this, W / 2, top + 40, 1, 50); audio.play('sfx_bosswin'); }

    // 1) 얻은 것 먼저 (유능감: 실패해도 '이번 판에 얻은 꽃잎' 먼저)
    const gy = top + 250;
    this.add.image(W / 2, gy + 40, boxTex(this, 'panel', 960, 250, 30, 3));
    this.add.image(W / 2 - 330, gy + 40, 'fx_petal').setScale(3);
    txt(this, W / 2 - 230, gy + 4, '이번 판에 모은 꽃잎', 30, C.dim, { ox: 0, thick: 2, weight: '700' });
    this.petT = txt(this, W / 2 - 230, gy + 70, `+${s.petals}`, 76, C.pink, { ox: 0, thick: 5, weight: '900' });
    txt(this, W / 2 + 430, gy + 4, s.newBook ? `도감 +${s.newBook}` : '', 30, C.goldHi, { ox: 1, thick: 3 });
    txt(this, W / 2 + 430, gy + 70, `총 ${fmt(d.petals)}`, 30, C.ivory, { ox: 1, thick: 3, weight: '700' });
    // 2) 기록
    const ry = gy + 260;
    const rows = [['꽃 점수 합계', fmt(s.total)], ['가장 큰 한 손', fmt(s.best)], ['넘은 계절신', s.beaten.length ? s.beaten.map(g => GOD[g].name).join(' · ') : '아직'], ['찾은 족보', `${s.found}가지`]];
    rows.forEach(([k, v], i) => { txt(this, W / 2 - 430, ry + i * 66, k, 32, C.dim, { ox: 0, thick: 2, weight: '700' }); txt(this, W / 2 + 430, ry + i * 66, v, 34, C.ivory, { ox: 1, thick: 3, wrap: 520 }); });
    // 3) 독설 한 줄 · 다음 판 힌트
    const fy = ry + rows.length * 66 + 70;
    this.add.image(W / 2, fy + 40, boxTex(this, 'ivory', 960, 200, 26, 3));
    txt(this, W / 2, fy - 20, '오늘의 한 줄', 24, '#8A6A3A', { stroke: null, weight: '800', ls: 4 });
    txt(this, W / 2, fy + 50, endLine({ phase: s.won ? 'won' : 'over', cleared: s.cleared, total: s.total }), 32, '#2A1C10', { stroke: null, weight: '800', wrap: 860 });
    txt(this, W / 2, fy + 180, `다음 판엔: ${tipLine(d.plays)}`, 26, C.jade, { thick: 3, weight: '700', wrap: 940 });
    // 4) 순위 (오늘의 판 · 소장자 · 도움 안 받은 판만)
    if (s.mode === 'daily' && bmOn()) {
      const rt = txt(this, W / 2, fy + 236, '', 26, C.dim, { thick: 2, weight: '700' });
      if (s.assisted) rt.setText('이어하기 · 응원을 받은 판은 오늘의 순위에 오르지 않아요');
      else if (owned()) bm.submitScore(s.total, { assisted: false }).then(r => { if (r && r.ok) rt.setText(`오늘의 판 명예의 전당 ${r.rank}위 · 상품 없이 이름만 올라가요`).setColor(C.goldHi); });
    }
    // 5) 꽃잎 2배 (3달 이상 간 판 · 하루 5번 · 광고 1회 또는 20골드)
    const by = H - 420;
    if (bmOn() && s.mode !== 'first' && s.cleared >= 3 && s.petals > 0 && dblUsed() < 5) {
      const ad = adLeft(), g = price('petal2');
      if (ad || g) {
        const dbl = button(this, W / 2, by, 760, 120, `꽃잎 2배 (+${s.petals})`, async () => {
          if (this.busy) return; this.busy = true;
          const r = ad ? await bm.rewardedAd('petal2') : await bm.spend('petal2');
          this.busy = false;
          if (!r.ok) { if (r.reason !== 'cancel') toast(this, r.reason === 'short' ? '골드가 모자라요' : '지금은 받을 수 없어요'); return; }
          noteDbl(s.petals); track('petal2', { via: r.via || 'gold', n: s.petals }); audio.play('sfx_petal'); burst(this, W / 2, gy + 40, 0.6);
          this.petT.setText(`+${s.petals * 2}`); dbl.setEnabled(false, '이번 판은 받았어요'); dbl.setLabel('꽃잎 2배 받았어요');
        }, { style: 'gold', sub: ad ? (owned() ? '소장 혜택 · 광고 없이' : '보상형 광고 1회') : `🪙 ${g} 골드` });
        dbl.setDepth(5);
      }
    }
    if (s.mode === 'first') {
      /* 첫 판 끝: 새로 열린 것 알림 → 오늘의 판으로 */
      const ny = H - 420;
      this.add.image(W / 2, ny, boxTex(this, 'ivory', 960, 150, 26, 3));
      txt(this, W / 2, ny - 30, '새로 열렸어요', 30, '#8A2A1A', { stroke: null, weight: '900' });
      txt(this, W / 2, ny + 22, '오늘의 판 · 자유 판 · 도감 · 꽃 덱 · 꾸미기', 28, '#2A1C10', { stroke: null, weight: '800' });
      button(this, W / 2 - 200, H - 240, 360, 130, '처음으로', () => this.leave('Home'), { style: 'dark' });
      button(this, W / 2 + 200, H - 240, 360, 130, '오늘의 판', () => this.leave('Home', 'daily'), { style: 'red', sub: '오늘 모두 같은 패로 도전' });
    } else {
      button(this, W / 2 - 200, H - 240, 360, 130, '처음으로', () => this.leave('Home'), { style: 'dark' });
      button(this, W / 2 + 200, H - 240, 360, 130, '한 판 더', () => this.leave('Home', 'free'), { style: 'red', sub: '자유 판' });
    }
    save();
  }
  onBack() { this.leave('Home'); return true; }
  async leave(to, go = null) {
    if (this.busy) return; this.busy = true;
    await afterRound();
    this.scene.start(to, go ? { go } : {});
  }
}
