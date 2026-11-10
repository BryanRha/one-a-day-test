// 미션 (2026-11-09 QA 시트 #4): 오늘 · 이번 주 · 누적 세 칸 — 받을 보상이 늘 남아 있게(재방문 장치)
//   오늘 = 매일 3개 · 이번 주 = 월요일마다 5개 + 다 받으면 주간 상자 · 누적 = 평생 기록 단계마다 별 조각
//   뒤로가기: 홈 (oad.js goBack 기본 · 왼쪽 위 홈 버튼)
import { W, H } from '../config.js?v=0.99.18';
import { T, C, fmt, panel, btn, iconBtn, toast } from '../pui.js?v=0.99.18';
import { audio } from '../audio.js?v=0.99.18';
import { load } from '../save.js?v=0.99.18';
import * as M from '../meta.js?v=0.99.18';
import { sky } from '../sky.js?v=0.99.18';

const TABS = [['day', '오늘'], ['week', '이번 주'], ['ach', '누적']];

export class MissionsScene extends Phaser.Scene {
  constructor() { super('Missions'); }
  create(data = {}) {
    const d = load();
    this.going = false; this.tab = data.tab || this.tab || 'day';
    sky(this, d.theme, { cubes: 6 });
    iconBtn(this, 80, 92, 'i_home', () => this.go('Home'), 96);
    T(this, W / 2, 92, '미션', 44, C.text, { w: 900 });
    this.add.image(W - 210, 92, 'i_star').setDisplaySize(44, 44).setTint(0xFFD36A);
    this.starTxt = T(this, W - 178, 92, fmt(d.stars), 36, C.gold, { ox: 0, w: 900 });
    this.top = 200 + Math.max(0, (H - 1920) / 6);
    this.drawTabs(); this.draw();
    audio.music('bgm_lobby', this);
    this.cameras.main.fadeIn(220, 20, 12, 40);
    window.__missions = this;
  }
  drawTabs() {
    if (this.tabBox) this.tabBox.destroy();
    const c = this.add.container(0, 0); this.tabBox = c;
    const y = this.top, tw = 300;
    const dots = { day: M.unclaimed(), week: M.weekly().some(m => m.done && !m.claimed) || M.chestReady(), ach: M.achList().some(a => a.ready) };
    TABS.forEach(([k, name], i) => {
      const x = W / 2 + (i - 1) * (tw + 12), on = this.tab === k;
      const b = btn(this, x, y, tw, 92, name, () => { if (this.tab === k) return; this.tab = k; this.drawTabs(); this.draw(); }, { style: on ? 'gold' : 'ghost', size: 32 });
      c.add(b);
      if (dots[k]) c.add(this.add.circle(x + tw / 2 - 18, y - 34, 12, 0xFF4F7A).setStrokeStyle(3, 0x1A0F33));
    });
  }
  draw() {
    if (this.box) this.box.destroy();
    const c = this.add.container(0, 0); this.box = c;
    const y0 = this.top + 110;
    if (this.tab === 'day') this.drawList(c, y0, '오늘의 미션', '자정에 새로 바뀌어요', M.missions(), id => M.claim(id));
    else if (this.tab === 'week') {
      const list = M.weekly(), got = list.filter(m => m.claimed).length;
      const end = this.drawList(c, y0, '이번 주 미션', `월요일에 새로 바뀌어요 · ${M.weekDaysLeft()}일 남음`, list, id => M.claimWeek(id));
      // 주간 상자: 5개 모두 받으면
      const cy = end + 110, ready = M.chestReady(), opened = load().week.chest;
      c.add(panel(this, W / 2, cy, 960, 180, { tone: 'gold' }));
      c.add(this.add.image(150, cy, 'i_sparkle').setDisplaySize(84, 84).setTint(ready ? 0xFFD36A : 0xB89CCB));
      c.add(T(this, 220, cy - 26, '주간 보물 상자', 36, C.text, { ox: 0, w: 900 }));
      c.add(T(this, 220, cy + 26, opened ? '이번 주 상자를 열었어요 · 멋져요!' : `이번 주 미션 ${got}/${list.length} 받기 → ★ ${M.WEEK_CHEST}`, 26, opened ? C.green : C.sub, { ox: 0, w: 800 }));
      if (ready) c.add(btn(this, W - 190, cy, 240, 90, `★ ${M.WEEK_CHEST}`, () => { const r = M.claimChest(); if (r) this.got(r, true); }, { style: 'gold', size: 32 }));
    } else this.drawAch(c, y0);
  }
  // 미션 목록 한 판 (오늘 · 이번 주 같은 모양) — 돌려줌: 판 아래 y
  drawList(c, y0, title, sub, list, claim) {
    const rh = 120, ph = 130 + list.length * rh, cy = y0 + ph / 2;
    c.add(panel(this, W / 2, cy, 960, ph));
    c.add(T(this, 110, y0 + 56, title, 38, C.text, { ox: 0, w: 900 }));
    c.add(T(this, W - 110, y0 + 56, sub, 24, C.dim, { ox: 1, w: 700 }));
    list.forEach((m, i) => {
      const y = y0 + 150 + i * rh, k = Math.min(1, m.prog / m.goal), g = this.add.graphics();
      c.add(T(this, 110, y - 16, m.text, 32, m.claimed ? C.dim : C.text, { ox: 0, w: 800 }));
      g.fillStyle(0xFFFFFF, 0.12).fillRoundedRect(110, y + 18, 500, 12, 6).fillStyle(m.done ? 0x6FF0B0 : 0xFF9A7A, 1).fillRoundedRect(110, y + 18, Math.max(12, 500 * k), 12, 6); c.add(g);
      c.add(T(this, 626, y + 24, `${fmt(Math.min(m.prog, m.goal))}/${fmt(m.goal)}`, 22, C.dim, { ox: 0, w: 700 }));
      if (m.claimed) c.add(T(this, W - 160, y, '받음', 30, C.dim, { w: 800 }));
      else if (m.done) c.add(btn(this, W - 170, y + 4, 200, 76, `★ ${m.reward}`, () => { const r = claim(m.id); if (r) this.got(r); }, { style: 'gold', size: 30 }));
      else c.add(T(this, W - 160, y, `★ ${m.reward}`, 30, C.gold, { w: 800 }));
    });
    return y0 + ph;
  }
  drawAch(c, y0) {
    const list = M.achList(), rh = 150, ph = 120 + list.length * rh, cy = y0 + ph / 2;
    c.add(panel(this, W / 2, cy, 960, ph));
    c.add(T(this, 110, y0 + 56, '누적 업적', 38, C.text, { ox: 0, w: 900 }));
    c.add(T(this, W - 110, y0 + 56, '평생 기록 · 단계마다 별 조각', 24, C.dim, { ox: 1, w: 700 }));
    list.forEach((a, i) => {
      const y = y0 + 150 + i * rh, g = this.add.graphics(), prev = a.k ? a.steps[a.k - 1] : 0, k = a.done ? 1 : Math.min(1, (a.v - prev) / Math.max(1, a.goal - prev));
      c.add(T(this, 110, y - 30, a.name, 32, C.text, { ox: 0, w: 900 }));
      // 단계 점 5개
      a.steps.forEach((_, j) => c.add(this.add.circle(110 + 290 + j * 30, y - 30, 9, j < a.k ? 0xFFD36A : 0xFFFFFF, j < a.k ? 1 : 0.18)));
      g.fillStyle(0xFFFFFF, 0.12).fillRoundedRect(110, y + 8, 500, 12, 6).fillStyle(a.ready ? 0x6FF0B0 : 0x7FE7FF, 1).fillRoundedRect(110, y + 8, Math.max(12, 500 * k), 12, 6); c.add(g);
      c.add(T(this, 110, y + 46, a.done ? `모두 달성 · ${fmt(a.v)}${a.unit}` : `${fmt(Math.min(a.v, a.goal))} / ${fmt(a.goal)}${a.unit}`, 24, C.dim, { ox: 0, w: 700 }));
      if (a.done) c.add(T(this, W - 160, y, '완료', 30, C.green, { w: 800 }));
      else if (a.ready) c.add(btn(this, W - 170, y, 200, 76, `★ ${a.reward}`, () => { const r = M.claimAch(a.id); if (r) this.got(r); }, { style: 'gold', size: 30 }));
      else c.add(T(this, W - 160, y, `★ ${a.reward}`, 30, C.gold, { w: 800 }));
    });
  }
  // 받기: 칭찬 넉넉히 + 별 숫자 갱신 + 그 자리 다시 그림
  got(r, big) {
    audio.play('sfx_best', { volume: big ? 0.8 : 0.6 });
    toast(this, big ? `주간 상자 열기! 별 +${r}` : `잘했어요! 별 +${r}`, C.gold);
    this.starTxt.setText(fmt(load().stars));
    this.tweens.add({ targets: this.starTxt, scale: 1.25, duration: 120, yoyo: true });
    this.drawTabs(); this.draw();
  }
  go(k, data) { if (this.going) return; this.going = true; audio.stopMusic(); this.cameras.main.fadeOut(200, 20, 12, 40); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
