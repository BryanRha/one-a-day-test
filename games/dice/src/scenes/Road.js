// 보상 길: 원정마다 명성이 쌓이고 단계마다 보상 (10단계마다 전설 확정권) — 끌어서 위아래로 보기
import { W, H } from '../config.js?v=0.99.16';
import { T, C, fmt, btn, iconBtn, popup, toast } from '../pui.js?v=0.99.16';
import { audio } from '../audio.js?v=0.99.16';
import { load } from '../save.js?v=0.99.16';
import * as M from '../meta.js?v=0.99.16';

const ROW = 150;

export class RoadScene extends Phaser.Scene {
  constructor() { super('Road'); }
  create(data = {}) {
    const d = load(), r = M.road();
    const bg = this.add.image(W / 2, H / 2, M.bgKey()); bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.add.rectangle(W / 2, H / 2, W, H, 0x05061A, 0.62);
    // 길 목록 (끌어서 스크롤)
    const top = 400, bottom = H - 40, view = bottom - top;
    this.list = this.add.container(0, 0);
    const maskG = this.make.graphics(); maskG.fillRect(0, top, W, view); this.list.setMask(maskG.createGeometryMask());
    const total = M.ROAD_MAX * ROW;
    const line = this.add.graphics(); this.list.add(line);
    line.fillStyle(0xFFFFFF, 0.08).fillRect(170, top, 8, total);
    // 지나온 길은 금빛 (아래에서 위로: 1단계가 맨 아래)
    const yOf = k => top + (M.ROAD_MAX - k) * ROW + ROW / 2;
    const reachedY = yOf(Math.max(1, r.level)) - (r.level < M.ROAD_MAX ? (r.into / r.need) * ROW : 0);
    line.fillStyle(0xF5C451, 0.9).fillRect(170, reachedY, 8, top + total - reachedY);
    for (let k = 1; k <= M.ROAD_MAX; k++) this.row(k, yOf(k), r);
    this.minY = -(total - view); this.maxY = 0;
    this.list.y = data.y ?? Phaser.Math.Clamp(-(yOf(Math.min(M.ROAD_MAX, r.level + 1)) - top - view / 2), this.minY, this.maxY);
    let drag = null;
    this.input.on('pointerdown', p => { if (p.y > top) drag = { y: p.y, start: this.list.y, moved: false }; });
    this.input.on('pointermove', p => { if (!drag || !p.isDown) return; const dy = p.y - drag.y; if (Math.abs(dy) > 8) drag.moved = true; this.list.y = Phaser.Math.Clamp(drag.start + dy, this.minY, this.maxY); });
    this.input.on('pointerup', () => { this.wasDrag = drag && drag.moved; drag = null; });
    this.input.on('wheel', (p, o, dx, dy) => { this.list.y = Phaser.Math.Clamp(this.list.y - dy, this.minY, this.maxY); });
    // 위쪽 (고정)
    this.add.rectangle(W / 2, top / 2, W, top, 0x05061A, 0.7).setInteractive();
    iconBtn(this, 80, 92, 'i_home', () => this.go('Home'), 96);
    T(this, W / 2, 92, '미션 보상', 44, C.text, { w: 900 });
    T(this, W / 2, 190, r.level >= M.ROAD_MAX ? `최고 단계 ${M.ROAD_MAX}` : `${r.level}단계`, 64, C.gold, { w: 900 });
    const g = this.add.graphics(), bw = 760, k = r.level >= M.ROAD_MAX ? 1 : r.into / r.need;
    g.fillStyle(0xFFFFFF, 0.1).fillRoundedRect(W / 2 - bw / 2, 260, bw, 22, 11).fillStyle(0xF5C451, 1).fillRoundedRect(W / 2 - bw / 2, 260, Math.max(22, bw * k), 22, 11);
    T(this, W / 2, 318, r.level >= M.ROAD_MAX ? `명성 ${fmt(r.fame)}` : `명성 ${fmt(r.into)} / ${fmt(r.need)} · 메인 원정 · 도전 · 아케이드 한 판마다`, 26, C.sub, { w: 800 });
    this.cameras.main.fadeIn(200, 5, 6, 26);
    if (data.msg) toast(this, data.msg, C.gold, 520);
    window.__road = this;
  }
  row(k, y, r) {
    const d = load(), rw = M.roadReward(k), got = r.claimed[k], reached = k <= r.level;
    const big = !!rw.legend, col = big ? 0xFFC94D : rw.keys ? 0x9AA6FF : 0x8FE3FF;
    const node = this.add.circle(174, y, big ? 34 : 26, reached ? 0xF5C451 : 0x1A2150).setStrokeStyle(4, reached ? 0xFFE6A0 : 0x3A4380); this.list.add(node);
    this.list.add(T(this, 174, y, `${k}`, big ? 28 : 24, reached ? '#2A1A00' : C.dim, { w: 900, shadow: false }));
    const pg = this.add.graphics(); this.list.add(pg);
    pg.fillStyle(big ? 0x46340F : 0x141A44, reached ? 0.92 : 0.6).fillRoundedRect(240, y - 58, 790, 116, 26).lineStyle(big ? 4 : 2, col, reached ? 0.8 : 0.25).strokeRoundedRect(240, y - 58, 790, 116, 26);
    if (rw.legend) { const ic = this.add.image(310, y, 'die_dragon').setDisplaySize(84, 84); const rn = this.add.image(310, y, 'rune_dragon').setDisplaySize(48, 48); this.list.add([ic, rn]); }
    else if (rw.keys) { const ic = this.add.image(310, y, 'die_echo').setDisplaySize(76, 76); const rn = this.add.image(310, y, 'rune_echo').setDisplaySize(44, 44); this.list.add([ic, rn]); if (rw.keys > 1) this.list.add(T(this, 340, y + 30, `×${rw.keys}`, 22, C.text, { w: 900 })); }
    else { const ic = this.add.image(310, y, 'i_star').setDisplaySize(52, 52).setTint(col); this.list.add(ic); }
    this.list.add(T(this, 370, y - 16, rw.text, 34, reached ? C.text : C.sub, { ox: 0, w: 900 }));
    this.list.add(T(this, 370, y + 26, big ? '전설 룬 하나를 확정으로 받아요' : rw.keys ? '룬 제단에서 무료 뽑기' : '뽑기·등급업에 쓰는 수정', 22, C.dim, { ox: 0, w: 700 }));
    if (got) this.list.add(T(this, 960, y, '받음', 28, C.dim, { ox: 1, w: 800 }));
    else if (reached) {
      const b = btn(this, 900, y, 200, 84, '받기', () => {
        if (this.wasDrag) return;
        const res = M.claimRoad(k); if (!res) return;
        audio.play(res.legend ? 'sfx_awaken' : 'sfx_power', { volume: 0.7 }); if (res.legend) this.cameras.main.flash(260, 255, 210, 120);
        this.scene.restart({ y: this.list.y, msg: `${res.text} 받았어요!` });
      }, { style: big ? 'gold' : 'indigo', size: 30 }); this.list.add(b);
    } else {
      // 아직 못 받은 칸: '잠김' 대신 '이동' — 명성을 모으러 바로 가기 (QA 14)
      const b = btn(this, 900, y, 200, 84, '이동', () => { if (this.wasDrag) return; this.moveTo(k, r); }, { style: 'ghost', size: 30 }); this.list.add(b);
    }
  }
  // 명성 모으러 가기: 메인 원정(명성 가장 많음) · 오늘의 도전(+30 보너스) · 아케이드
  moveTo(k, r) {
    let need = 0; for (let j = r.level; j < k; j++) need += M.roadNeed(j); need -= r.into;
    const p = popup(this, `${k}단계까지 명성 ${fmt(Math.max(1, need))}`, 860, 700), c = p.content;
    c.add(T(this, 0, -195, '한 판마다 웨이브 × 10 + 보스 × 8 명성이 쌓여요', 26, C.sub, { w: 800 }));
    const go = (k2, data) => { p.close(); this.time.delayedCall(150, () => this.go(k2, data)); };
    c.add(btn(this, 0, -85, 560, 120, '메인 원정 입장', () => go('Play', { mode: 'run' }), { style: 'gold', icon: 'i_play', size: 36 }));
    c.add(btn(this, 0, 45, 560, 104, '오늘의 도전 · 명성 +30', () => go('Play', { mode: 'daily' }), { style: 'indigo', size: 30 }));
    c.add(btn(this, 0, 165, 560, 104, '아케이드', () => go('Arcade'), { style: 'ghost', size: 30 }));
  }
  go(k, data) { if (this.leaving) return; this.leaving = true; this.cameras.main.fadeOut(200, 5, 6, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
