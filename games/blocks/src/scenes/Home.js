// 홈 (2026-11-09 QA 시트 #1 · #3 · #4 · #9): '블록 하늘' 로비 — 노을 하늘 · 흐르는 구름 · 떠다니는 보석 블록
//   룬 다이스와 다른 배치: 큰 클래식 카드(미니 판 그림 + 가로로 긴 플레이 버튼) · 어드벤처 그림 카드 · 아래 두 칸(미션 · 컬렉션)
//   왼쪽 위 '원어데이' 버튼: 앱 안 = 원어데이로 나가기(oad:exit) · 단독 링크 = 원어데이 사이트 (룬 다이스 #21 과 같은 방식)
import { W, H, TITLE, TITLE_EN } from '../config.js?v=0.99.34';
import { T, C, fmt, panel, btn, iconBtn, pillBtn, popup, toast } from '../pui.js?v=0.99.34';
import { audio } from '../audio.js?v=0.99.34';
import { load, save } from '../save.js?v=0.99.34';
import * as M from '../meta.js?v=0.99.34';
import { makeLevel, SEASON_LEVELS } from '../core/levels.js?v=0.99.34';
import { pictureView } from '../picture.js?v=0.99.34';
import { hallShown, hallPopup } from '../hall.js?v=0.99.34';
import { inOAD, exitToOAD } from '../oad.js?v=0.99.34';
import { sky } from '../sky.js?v=0.99.34';
import { THEMES, PALETTE } from './Boot.js?v=0.99.34';

export class HomeScene extends Phaser.Scene {
  constructor() { super('Home'); }
  create() {
    const d = load();
    this.going = false;
    sky(this, d.theme);
    const ci = M.checkIn();
    const sp = Math.max(0, (H - 1920) / 6);     // 화면이 길면 칸 사이를 넓힘
    // ── 위: 원어데이 · 연속 출석 · 별 조각 · 설정 ──
    this.exitBtn = pillBtn(this, 160, 92, 230, 96, 'i_exit', '원어데이', () => this.toOAD());
    this.add.image(312, 92, 'i_flame').setDisplaySize(44, 44).setTint(0xFF9A5A);
    T(this, 342, 92, `${d.streak.count}일 연속`, 30, C.text, { ox: 0, w: 800 });
    const sx = W - 300;
    this.add.image(sx, 92, 'i_star').setDisplaySize(46, 46).setTint(0xFFD36A);
    this.starTxt = T(this, sx + 34, 92, fmt(d.stars), 36, C.gold, { ox: 0, w: 900 });
    iconBtn(this, W - 80, 92, 'i_gear', () => this.settings(), 96);
    // ── 로고: 보석 블록 네 개가 살짝 떠 있는 모자이크 + 제목 ──
    const ly = 300 + sp * 0.5;
    const tt = T(this, W / 2 + 62, ly, TITLE, 108, C.text, { w: 900, ls: 2 });
    tt.setShadow(0, 8, 'rgba(60,10,60,0.55)', 18, false, true);
    const mx = W / 2 + 62 - tt.width / 2 - 92;
    [[0, 0, 0], [1, 0, 2], [0, 1, 4], [1, 1, 6]].forEach(([x, y, k], n) => {
      const im = this.add.image(mx + (x - 0.5) * 54, ly - 4 + (y - 0.5) * 54, `blk_${k}`).setDisplaySize(52, 52);
      this.tweens.add({ targets: im, y: im.y - 6, duration: 1300 + n * 160, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: n * 120 });
    });
    T(this, W / 2, ly + 90, TITLE_EN, 28, '#FFD9E8', { w: 800, ls: 14 });
    T(this, W / 2, ly + 140, `오늘의 하늘 · ${THEMES[d.theme % THEMES.length].name}`, 24, C.sub, { w: 700 });
    // ── 클래식: 큰 카드 · 오른쪽 미니 판 · 아래 가로로 긴 플레이 ──
    const cy = 700 + sp * 1.4;
    this.add.existing(panel(this, W / 2, cy, 960, 430));
    T(this, 110, cy - 160, 'CLASSIC', 24, C.coral, { ox: 0, w: 900, ls: 6 });
    T(this, 110, cy - 108, '클래식', 64, C.text, { ox: 0, w: 900 });
    this.add.image(126, cy - 30, 'i_crown').setDisplaySize(40, 40).setTint(0xFFD36A);
    T(this, 160, cy - 30, `최고 ${fmt(d.best)}`, 38, C.gold, { ox: 0, w: 800 });
    const today = d.todayBest.date === M.dayKey() ? d.todayBest.score : 0;
    T(this, 110, cy + 20, `오늘 최고 ${fmt(today)}`, 28, C.sub, { ox: 0, w: 700 });
    this.miniBoard(W - 250, cy - 60);
    if (hallShown()) iconBtn(this, W - 470, cy - 30, 'i_trophy', () => hallPopup(this), 88);   /* 이번 주 명예의 전당 */
    btn(this, W / 2, cy + 142, 880, 112, '플레이', () => this.go('Play', { mode: 'classic' }), { style: 'gold', icon: 'i_play', size: 44 });
    // ── 어드벤처 카드 ──
    const a = M.adv(), ay = cy + 470 + sp;
    this.add.existing(panel(this, W / 2, ay, 960, 400));
    const pv = pictureView(this, 270, ay + 10, 330, a.picture, a.season, a.cleared);
    this.tweens.add({ targets: pv, scale: 1.02, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    T(this, 480, ay - 140, 'ADVENTURE', 24, C.cyan, { ox: 0, w: 900, ls: 6 });
    T(this, 480, ay - 88, '어드벤처', 62, C.text, { ox: 0, w: 900 });
    T(this, 480, ay - 20, `${a.cleared} / ${SEASON_LEVELS} 그림 조각`, 32, C.sub, { ox: 0, w: 700 });
    const bar = this.add.graphics(); bar.fillStyle(0xFFFFFF, 0.14).fillRoundedRect(480, ay + 22, 420, 16, 8).fillStyle(0x7FE7FF, 1).fillRoundedRect(480, ay + 22, Math.max(16, 420 * a.cleared / SEASON_LEVELS), 16, 8);
    T(this, 480, ay + 64, `이번 주 남은 기간 ${a.daysLeft}일${a.winStreak >= 2 ? `  ·  🔥 ${a.winStreak}연승` : ''}`, 26, C.dim, { ox: 0, w: 700 });
    const lvN = Math.min(SEASON_LEVELS, a.cleared + 1), lv = makeLevel(lvN, undefined, a.season);
    if (a.cleared >= SEASON_LEVELS) T(this, 690, ay + 140, '이번 주 그림 완성! 🏆', 36, C.gold, { w: 900 });
    else btn(this, 690, ay + 148, 420, 100, `레벨 ${lvN}${lv.hard ? '  ·  어려움' : ''}`, () => this.go('Adventure'), { style: lv.hard ? 'indigo' : 'green', size: 38 });
    // ── 아래 두 칸: 미션(오늘 · 이번 주 · 누적) · 컬렉션 ──
    const ty = Math.min(H - 150, ay + 360 + sp * 1.6), ms = M.missions(), wk = M.weekly();
    this.tile(W / 2 - 245, ty, 'i_target', '미션', `오늘 ${ms.filter(m => m.claimed).length}/${ms.length} · 이번 주 ${wk.filter(m => m.claimed).length}/${wk.length}`, () => this.go('Missions'), M.anyClaim());
    this.tile(W / 2 + 245, ty, 'i_grid', '컬렉션', `스킨 · 기록 · 지난 그림`, () => this.go('Collection'), false);
    audio.music('bgm_lobby', this);
    this.cameras.main.fadeIn(260, 20, 12, 40);
    if (ci) this.time.delayedCall(400, () => toast(this, ci.count > 1 ? `🔥 ${ci.count}일 연속 출석! 별 +${ci.bonus}` : `오늘도 반가워요! 별 +${ci.bonus}`, C.gold, 180 + sp));
    window.__home = this;
  }
  // 클래식 카드 속 미니 판: 5×5 칸에 보석 블록 몇 개 · 한 줄이 반짝이며 지워질 듯 (게임이 뭔지 한눈에)
  miniBoard(x, y) {
    const c = this.add.container(x, y).setAngle(-6), S = 44, n = 5, g = this.add.graphics();
    g.fillStyle(0x1A0F33, 0.85).fillRoundedRect(-n * S / 2 - 12, -n * S / 2 - 12, n * S + 24, n * S + 24, 20).lineStyle(2, 0xFFFFFF, 0.22).strokeRoundedRect(-n * S / 2 - 12, -n * S / 2 - 12, n * S + 24, n * S + 24, 20);
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) g.fillStyle(0xFFFFFF, 0.07).fillRoundedRect(-n * S / 2 + k * S + 3, -n * S / 2 + r * S + 3, S - 6, S - 6, 8);
    c.add(g);
    const fill = [[0, 0, 4], [0, 1, 4], [1, 0, 5], [2, 0, 1], [2, 1, 1], [2, 3, 2], [3, 0, 6], [3, 1, 6], [3, 2, 6], [3, 3, 0], [3, 4, 0], [4, 0, 3], [4, 1, 3], [4, 3, 2], [1, 4, 5]];
    const row = [];
    for (const [r, k, col] of fill) { const im = this.add.image(-n * S / 2 + k * S + S / 2, -n * S / 2 + r * S + S / 2, `blk_${col}`).setDisplaySize(S, S); c.add(im); if (r === 3) row.push(im); }
    const glow = this.add.rectangle(0, -n * S / 2 + 3 * S + S / 2, n * S, S - 4, 0xFFFFFF, 0).setBlendMode('ADD'); c.add(glow);
    this.tweens.add({ targets: glow, fillAlpha: 0.35, duration: 700, yoyo: true, repeat: -1, repeatDelay: 900, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: c, y: y - 8, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return c;
  }
  // 아래 칸 하나: 아이콘 · 이름 · 한 줄 · 받을 것이 있으면 빨간 점
  tile(x, y, icon, name, line, onClick, dot) {
    const w = 470, h = 200, c = this.add.container(x, y);
    c.add(panel(this, 0, 0, w, h));
    c.add(this.add.circle(-w / 2 + 80, -10, 46, 0xFFFFFF, 0.1).setStrokeStyle(2, 0xFFFFFF, 0.25));
    c.add(this.add.image(-w / 2 + 80, -10, icon).setDisplaySize(48, 48).setTint(icon === 'i_target' ? 0xFF9A7A : 0x7FE7FF));
    c.add(T(this, -w / 2 + 148, -30, name, 40, C.text, { ox: 0, w: 900 }));
    c.add(T(this, -w / 2 + 148, 22, line, 22, C.sub, { ox: 0, w: 700 }));
    if (dot) { const dt = this.add.circle(w / 2 - 30, -h / 2 + 30, 14, 0xFF4F7A).setStrokeStyle(3, 0x1A0F33); c.add(dt); this.tweens.add({ targets: dt, scale: 1.25, duration: 500, yoyo: true, repeat: -1 }); }
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => c.setScale(0.97)); c.on('pointerout', () => c.setScale(1));
    c.on('pointerup', () => { c.setScale(1); audio.play('sfx_click', { volume: 0.5 }); onClick(); });
    c.label = { text: name };
    return c;
  }
  /* 원어데이로: 원어데이 안이면 SDK 나가기(oad.js exitToOAD = oad:exit) · 단독 링크면 원어데이 사이트 (테스트 서버에서 열었으면 그 서버 첫 화면) */
  toOAD() {
    if (inOAD) return exitToOAD();
    const h = location.hostname, site = /(^|\.)oneaday\.kr$/.test(h) ? `${location.protocol}//${h}/` : 'https://oneaday.kr/';
    audio.stopMusic(); location.href = site;
  }
  settings() {
    const d = load(), pop = popup(this, '설정', 760, 560);
    const row = (y, label, on, fn) => { pop.content.add(T(this, -260, y, label, 40, C.text, { ox: 0 })); const b = btn(this, 200, y, 220, 96, on ? '켜짐' : '꺼짐', () => { fn(); b.setLabel(b.label.text === '켜짐' ? '꺼짐' : '켜짐'); }, { style: on ? 'green' : 'ghost', size: 34 }); pop.content.add(b); };
    row(-70, '효과음', d.sfx, () => audio.toggleSfx());
    row(70, '배경음악', d.music, () => audio.toggleMusic());
  }
  go(k, data) { if (this.going) return; this.going = true; audio.stopMusic(); this.cameras.main.fadeOut(220, 20, 12, 40); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
