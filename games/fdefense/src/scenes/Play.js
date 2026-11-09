// 판 화면 — v0.3.0 원작 맞춤 (대표 2026-11-02 '원작과 최대한 100%')
//   · 폰을 눕히면(가로): 원작 800×480 구성을 높이 1080(×2.25)으로 그대로 — 위 띠 · 오른쪽 카드 열(HERO + 병사 6) · 왼쪽 아래 II ▶▶ 톱니 · 바깥 테두리
//   · 세로: 원작 판을 시계 방향 90° 돌려 10×15칸 · 위 띠는 원작 그림 그대로 · 카드 줄(HERO + 병사 6)은 아래 엄지 자리
//   · 병사 · 영웅을 누르면 원작 메뉴: 전신 일러스트 · 이름 · lv · 능력치 4줄 · 판매 · 전직(다음 직업 미리보기) · 레벨 업 · 필살기 → 확인 창(예/아니오) → 전직 컷인(일러스트 바뀜)
//   · 메뉴가 열려 있으면 판 시간이 멈춘다 (원작 update_GAME_PLAYING: 메뉴 상태에선 효과만 움직임)
import { W, H, C, SCALE } from '../config.js?v=0.99.13';
import { T, A, STAGE_NAMES, FACE_KEY, NAME_KEY, UPFACE_KEY, CARD_KEY, MON_KEY, monOrder } from '../core/data.js?v=0.99.13';
import { Sim, TICK, BUY_ROWS, BUY_ORDER, DETAIL_SPRITE, HERO_SPRITE, CHAR, DOWNGRADE_DETAIL, effectName, attackSpeed, runSummary, clearScore } from '../core/sim.js?v=0.99.13';
import * as M from '../core/meta.js?v=0.99.13';
import { BUNDLE } from '../core/balance.js?v=0.99.13';
import { checkAwards, noteMissions, AWARDS } from '../core/awards.js?v=0.99.13';
import { text, panel, button, toast, icon } from '../ui.js?v=0.99.13';
import { audio, S } from '../audio.js?v=0.99.13';
import { load, save, saveResume, dayKey } from '../save.js?v=0.99.13';
import { FRAME_ATLAS, queueStage, indexFrames } from './Boot.js?v=0.99.13';
import { T0, img, num, label, inRect } from './orig.js?v=0.99.13';
import { pushBack } from '../oad.js?v=0.99.13';
import { bm, oadOn, owned, adReady, track } from '../bmflow.js?v=0.99.13';

const US = 2.25;                 // 원작 UI 배율 (가로 화면 480 → 1080)
const HUD_H = 196, TRAY_MIN = 250, CS = 2.4;   // 세로 화면: 위 띠 높이 · 아래 카드 칸 최소 높이 · 카드 배율
// 효과 번호 → 그림 묶음 (원작 렌더러 표)
const FX_SET = { 0: 500, 33: 532, 2: 502, 3: 503, 4: 504, 5: 505, 9: 509, 10: 510, 12: 533, 13: 512, 14: 513, 15: 514, 36: 502, 37: 534, 38: 535 };
const ARROW_IMG = { 0: ['arrow_0_0'], 2: ['arrow_2_0', 'arrow_2_1'], 3: ['arrow_3_0', 'arrow_3_1'], 5: ['arrow_1_0', 'arrow_1_1'], 10: ['arrow_4_0', 'arrow_4_1', 'arrow_4_2', 'arrow_4_3', 'arrow_4_4', 'arrow_4_5'], 12: ['arrow_9_0', 'arrow_9_1'] };
const OBJ_NAMES = ['object_manacrystal1', 'object_manacrystal2', 'object_manacrystal3', 'object_goldvault1', 'object_goldvault2', 'object_goldvault3', 'object_woodbox', 'object_stone', 'object_hugestone', 'object_tree', 'object_hugetree', 'object_rottenwood', 'object_rottentree', 'object_blackstone', 'object_darkstone', 'object_roughreed', 'object_cowskull', 'object_gravestone', 'object_cactus', 'object_strangestone', 'object_hugestrangestone', 'object_sandhell', 'object_basalt', 'object_hugebasalt', 'object_lava1', 'object_lava2', 'object_blacktornado', 'object_hugeblacktornado', 'object_starts', 'object_startw', 'object_goals', 'object_goalw', 'object_starte', 'object_goale'];
// 원작 drawObjectUnit: 성문 그림 어긋남 (세로 i4 · 가로 i5)
const OBJ_OFF = { 28: [0, 3], 29: [22, 22], 30: [-25, 3], 31: [34, 18], 32: [22, -22], 33: [34, -11] };
const STAT_LABELS = ['공격', '속도', '사거리', '특수'];   // 원작 ATT · SPD · RANGE · EXTRA
const MINT = '#83F8C3', MON_GREEN = '#7AFFBD';          // 원작 글자색 (-8128317 · -8716355)

export class PlayScene extends Phaser.Scene {
  constructor() { super('Play'); }
  init(d) { this.stageNo = d.stage ?? 0; this.mode = d.mode ?? 0; this.resumeSnap = d.resume || null; this.giftGold = d.giftGold || 0; }
  preload() {
    // 가로로 눕힌 폰이면 판 화면은 원작 가로 구성 (main.js fitMode)
    this.game.__playLand = true; this.game.__fit?.();
    queueStage(this, this.stageNo, load().meta.owned);
    const g = this.add.graphics(), sw = this.scale.width, sh = this.scale.height;
    this.load.on('progress', p => { g.clear(); g.fillStyle(0x2A3142, 1).fillRoundedRect(sw / 2 - 200, sh / 2, 400, 12, 6); g.fillStyle(0xFFC94A, 1).fillRoundedRect(sw / 2 - 200, sh / 2, 400 * p, 12, 6); });
    this.load.once('complete', () => g.destroy());
  }
  create() {
    indexFrames(this);
    // 씬 재사용 대비: 상태 전부 초기화 (Phaser 규칙)
    const dd = load();
    this.sim = new Sim(this.stageNo, { seed: (Date.now() & 0xffff) + 1, mode: this.mode, meta: M.simMeta(dd.meta), bundle: BUNDLE[this.stageNo] || 1, startGold: this.giftGold });
    if (this.resumeSnap) { this.sim.restore(this.resumeSnap); this.resumeSnap = null; }
    this.fxs = []; this.acc = 0; this.paused = false; this.menu = null; this.confirm = null; this.drag = null; this.armed = null;
    if (dd.speed === 2) dd.speed = 3;
    this.speed = dd.speed === 3 ? 3 : 1; this.ended = false; this.cutin = null; this.contUsed = 0; this.contAd = false; this.offer = null; this.offerClose = null;
    this.hintStep = dd.tips.place ? 9 : 0; this.coachOn = false; this.coachTick = 0; this.hint = null;
    this.pauseUI = null; this.pauseGlow = null; this.menuUI = null; this.menuUIBack = null; this.menuBack = null; this.pendingSpecial = null; this.menuWasRunning = false;
    this.heroRow = false; this.upAnim = 0; this.lvAnim = 0; this.uiTick = 0; this.uiAcc = 0; this.mview = null; this.blink = 0; this.goalBlink = 0; this.lastGoalTick = -1; this.needRelayout = false; this.result = null;
    dd.tries[this.stageNo] = (dd.tries[this.stageNo] || 0) + 1; save();
    this.build();
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.cameras.main.fadeIn(300, 0, 0, 0);
    audio.music('bgm_3', this);
    if (this.hintStep === 0 && this.stageNo === 0) this.time.delayedCall(700, () => this.showHint());
    else this.hintStep = 9;
    if (this.giftGold > 0) this.time.delayedCall(600, () => toast(this, `응원 선물 · 시작 골드 +${this.giftGold}`, this.toastY(), C.gold));
    this.stageBanner();
    // 앱이 뒤로 가면(탭 숨김 · 다른 앱) 전략 정지로 들어가고, 돌아와도 스스로 재개하지 않는다
    this.onHide = () => { if (document.hidden) this.pause({ auto: true }); };
    document.addEventListener('visibilitychange', this.onHide);
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => {
      this.input.off('pointerdown', this.onDown, this); this.input.off('pointermove', this.onMove, this); this.input.off('pointerup', this.onUp, this);
      document.removeEventListener('visibilitychange', this.onHide); this.scale.off('resize', this.onResize, this);
      // 판을 떠나면 세로 화면(홈 · 타이틀)으로 되돌림
      this.game.__playLand = false; this.game.__fit?.();
    });
  }
  toastY() { return this.land ? this.by + this.bh - 60 : this.trayTop - 80; }

  // ---------- 화면 만들기 · 가로/세로 바뀜 ----------
  build() {
    // 판 위 그림 참조는 전부 새로 (씬 재사용 · 가로/세로 바뀜 때 지난 판의 지워진 그림을 쓰지 않게)
    this.views = new Map(); this.arrowViews = new Map(); this.lifeV = null; this.fires = []; this.blinkR = null; this.rangeImg = null; this.markImg = null; this.heroRowBg = null;
    for (const f of this.fxs) f.parts = [];
    this.layout(); this.drawBoard(); this.drawHud(); this.drawCards();
    if (this.paused) { this.paused = false; this.pause({ quiet: true }); }
  }
  onResize() {
    const land = this.scale.width > this.scale.height;
    if (land === this.land && !this.needRelayout) { this.layoutOnly(); return; }
    this.relayout();
  }
  // 같은 방향에서 크기만 바뀜 (주소창 등): 다시 그림
  layoutOnly() { const was = [this.scale.width, this.scale.height].join(); if (was === this.lastSize) return; this.relayout(); }
  relayout() {
    if (this.ended || this.offer || this.menuUI || this.sim.state === 'clear' || this.sim.state === 'over') { this.needRelayout = true; return; }
    this.needRelayout = false;
    this.closeConfirm(); this.closeMenu(true); this.cancelDrag(); this.hideHint();
    if (this.cutin) { this.cutin.c.destroy(); this.cutin.fx.destroy(); this.cutin = null; }
    this.mview = null; this.pauseGlow?.stop(); this.pauseGlow = null; this.pauseUI = null;
    this.tweens.killAll(); this.time.removeAllEvents(); this.children.removeAll(true);
    this.build();
  }
  layout() {
    const SW = this.scale.width, SH = this.scale.height;
    this.lastSize = [SW, SH].join();
    this.land = SW > SH;
    if (this.land) {
      this.ox = Math.round((SW - 800 * US) / 2); this.oy = Math.round((SH - 480 * US) / 2);
      this.TL = T0(this.ox, this.oy, US);
      this.k = US; this.bx = this.TL.x(62); this.by = this.TL.y(30); this.bw = 675 * US; this.bh = 450 * US; this.trayTop = this.by + this.bh;
      this.TM = this.TL; this.TP = this.TL; this.TV = this.TL;
    } else {
      const room = SH - HUD_H - TRAY_MIN;
      this.k = Math.min(SW / 450, room / 675);
      this.bw = 450 * this.k; this.bh = 675 * this.k;
      this.bx = (SW - this.bw) / 2; this.by = HUD_H; this.trayTop = this.by + this.bh;
      this.TL = T0(0, 0, US);
      const ms = SW / 800; this.TM = T0(0, SH - 480 * ms, ms);
      const ps = Math.min(1.9, SW / 520); this.TP = T0(SW / 2 - 400 * ps, this.by + this.bh * 0.45 - 242 * ps, ps);
      // 다음 웨이브 안내는 카드 줄 아래 빈 칸(모자라면 판 아래쪽)에
      this.TV = T0(0, SH - 480 * ms, ms);
    }
    this.sp = this.k / SCALE;   // 판 그림 배율
  }
  // 원작 좌표(위치 단위 = px×50) → 화면
  rot(x, y) { return this.land ? [this.bx + x / 50 * this.k, this.by + y / 50 * this.k] : [this.bx + (450 - y / 50) * this.k, this.by + (x / 50) * this.k]; }
  // 화면 좌표 → 원작 칸
  tileAt(sx, sy) {
    const px = this.land ? (sx - this.bx) / this.k : (sy - this.by) / this.k, py = this.land ? (sy - this.by) / this.k : 450 - (sx - this.bx) / this.k;
    if (px < 0 || py < 0 || px >= 675 || py >= 450) return null;
    return [Math.floor(px / 45), Math.floor(py / 45)];
  }
  tileCenter(i, j) { return this.rot((i * 45 + 22) * 50, (j * 45 + 22) * 50); }
  frame(name) { return FRAME_ATLAS[name] ? [FRAME_ATLAS[name], name] : null; }
  onBoard(x, y) { return x >= this.bx && x <= this.bx + this.bw && y >= this.by && y <= this.by + this.bh; }

  // ---------- 판 ----------
  drawBoard() {
    const ch = Math.floor(this.stageNo / 10) % 5, s = this.sim, SW = this.scale.width, SH = this.scale.height;
    if (this.land) {
      // 원작 화면 밖(넓은 폰): 검은 바탕 + 원작 바깥 테두리 (etc_outl · etc_outr · etc_outu)
      this.add.rectangle(SW / 2, SH / 2, SW, SH, 0x000000).setDepth(-10);
      if (this.ox > 0) {
        const big = this.ox >= 13 * US;
        // 원작은 바깥 테두리를 맨 마지막에 그림 (필살기 그림이 넘쳐도 테두리가 위)
        img(this, this.TL, big ? 'etc_outl' : 'etc_out', 0, 0, 20).setDepth(9700);
        img(this, this.TL, big ? 'etc_outr' : 'etc_out', 800, 0, 18).setDepth(9700);
      }
      if (this.oy > 0) { img(this, this.TL, 'etc_outu', 0, 0, 34).setDepth(9700); img(this, this.TL, 'etc_outu', 0, 480, 18).setDepth(9700); }
      const key = this.textures.exists(`bgl${ch}`) ? `bgl${ch}` : null;
      if (key) this.add.image(this.ox, this.oy, key).setOrigin(0).setDisplaySize(800 * US, 480 * US).setDepth(-5);
      if (this.textures.exists('shadow_l')) this.add.image(this.ox, this.oy, 'shadow_l').setOrigin(0).setDisplaySize(800 * US, 480 * US).setDepth(-4);
      for (let i = 0; i < 15; i++) for (let j = 0; j < 10; j++) {
        const t = s.tiles[i][j]; if (t < 0) continue;
        const f = this.frame(`map_t${ch}_${t}`); if (!f) continue;
        // 타일 그림은 세로 판용으로 시계 방향으로 돌려 두었으므로 되돌림
        this.add.image(this.bx + (i * 45 + 22.5) * this.k, this.by + (j * 45 + 22.5) * this.k, f[0], f[1]).setAngle(-90).setScale(this.sp).setDepth(-3);
      }
    } else {
      this.add.image(this.bx, this.by, `bg${ch}`).setOrigin(0).setDisplaySize(this.bw, this.bh);
      if (this.bx > 0) { const sg = this.add.graphics().setDepth(4001); sg.fillStyle(0x0E1118, 1).fillRect(0, this.by, this.bx, this.bh).fillRect(this.bx + this.bw, this.by, this.bx + 2, this.bh); }
      for (let i = 0; i < 15; i++) for (let j = 0; j < 10; j++) {
        const t = s.tiles[i][j]; if (t < 0) continue;
        const f = this.frame(`map_t${ch}_${t}`); if (!f) continue;
        this.add.image(this.bx + (450 - (j + 1) * 45) * this.k, this.by + i * 45 * this.k, f[0], f[1]).setOrigin(0).setScale(this.sp);
      }
      const g = this.add.graphics().setDepth(4000);
      for (let i = 0; i < 10; i++) { g.fillStyle(0x000000, 0.22 * (1 - i / 10)); g.fillRect(this.bx, this.by + i * 4, this.bw, 4); g.fillRect(this.bx, this.trayTop - (i + 1) * 4, this.bw, 4); }
    }
    this.placeLayer = this.add.graphics().setDepth(5);
    this.gridG = this.add.graphics().setDepth(5);
    this.rangeG = this.add.graphics().setDepth(6);
    this.rangeImg = null;
    this.markImg = null;
    for (const o of s.objects) if (o.alive) this.objectView(o);
  }
  objectView(o) {
    let n = OBJ_NAMES[o.type], sx, bottom;
    const [x, y] = this.rot(o.x, o.y);
    if (this.land) {
      // 원작 그대로: 아래 가운데 기준 (x + i5, y + 22 + i4)
      const [i4, i5] = OBJ_OFF[o.type] || [0, 0];
      sx = x + i5 * this.k; bottom = y + (22 + i4) * this.k;
    } else {
      sx = x; bottom = y + 22 * this.k;
      if (o.role === 'start' || o.role === 'goal') {
        n = o.role === 'start' ? 'object_starts' : 'object_goals';
        if (x < this.bx + 30 * this.k) n = o.role === 'start' ? 'object_startw' : 'object_goalw';
        else if (x > this.bx + this.bw - 30 * this.k) n = o.role === 'start' ? 'object_starte' : 'object_goale';
      }
      if (o.size === 1) sx += 22.5 * this.k;
      if (o.size === 2) { sx += 22.5 * this.k; bottom = y + 45 * this.k; }
    }
    const f = this.frame(n); if (!f) return;
    const v = { o };
    // 원작: 부술 수 없는 물건 밑 그림자 (성문 제외)
    if (!o.destroyable && o.role === 'obj') { const sh = this.frame(o.size <= 1 ? 'etc_sha34' : 'etc_sha63'); if (sh) v.sh = this.add.image(x, y + 27 * this.k, sh[0], sh[1]).setOrigin(0.5, 1).setScale(this.sp).setDepth(bottom - 2); }
    v.img = this.add.image(sx, bottom, f[0], f[1]).setOrigin(0.5, 1).setScale(this.sp).setDepth(bottom);
    v.ax = sx; v.ay = bottom;
    // 소장자 전용 꾸미기: 황금 성문 (우리 성문만 · 능력치 없음)
    if (o.role === 'goal' && load().look.gate === 'gold' && owned()) {
      v.img.setTint(0xFFE08A, 0xFFE08A, 0xFFB347, 0xFFB347);
      this.time.addEvent({ delay: 260, loop: true, callback: () => { const sp = this.add.circle(sx + Phaser.Math.Between(-50, 50), bottom - Phaser.Math.Between(20, 120), Phaser.Math.Between(3, 6), 0xFFE7A0).setDepth(bottom + 1).setBlendMode(Phaser.BlendModes.ADD); this.tweens.add({ targets: sp, y: sp.y - 60, alpha: 0, duration: 900, onComplete: () => sp.destroy() }); } });
    }
    if (o.destroyable) v.bar = this.add.image(0, 0, '__WHITE').setVisible(false);
    this.views.set(o, v);
  }

  // ---------- 원작 프레임 애니메이션 그리기 ----------
  drawAnim(v, set, action, fi, sx, sy, scale, alpha = 1, depth, glow = null, sy2 = 1, dy = 0) {
    const an = A[set]; if (!an) return;
    const acts = an.actions[action] || an.actions[0];
    const fr = an.frames[acts[fi % acts.length]] || [];
    v.parts ||= [];
    for (let i = 0; i < Math.max(fr.length, v.parts.length); i++) {
      const p = fr[i];
      if (!p) { if (v.parts[i]) v.parts[i].setVisible(false); continue; }
      const f = this.frame(`unit_${set}_${p[0]}`); if (!f) continue;
      let im = v.parts[i];
      if (!im) { im = this.add.image(0, 0, f[0], f[1]).setOrigin(0); v.parts[i] = im; }
      im.setTexture(f[0], f[1]).setVisible(true).setFlipX(p[4] === 1).setScale(this.sp * scale * (2 - sy2), this.sp * scale * sy2)
        .setPosition(sx + p[1] * this.k * scale * (2 - sy2), sy + dy + (10 + p[2]) * this.k * scale * sy2 + 10 * this.k * scale * (1 - sy2)).setAlpha(alpha * p[3] / 1000 * (glow != null && i === 0 ? glow : 1)).setDepth(depth ?? sy);
    }
  }
  clearParts(v) { for (const p of v.parts || []) p.destroy(); v.parts = []; }

  // ---------- 위 띠 (원작 drawPlayingUi) ----------
  drawHud() {
    const SW = this.scale.width, T = this.TL;
    if (!this.land) { const g = this.add.graphics().setDepth(5990); g.fillStyle(0x07090D, 1).fillRect(0, 0, SW, HUD_H); g.lineStyle(3, 0x1E2A44, 1).lineBetween(0, HUD_H, SW, HUD_H); }
    const bar = img(this, T, 'ui_upper_upbar', 0, 0, 18).setDepth(6000);
    if (!this.land) bar.setDisplaySize(SW, bar.displayHeight);
    img(this, T, 'ui_upper_money', 9, 4).setDepth(6001);
    img(this, T, 'ui_upper_mana', 126, 5).setDepth(6001);
    // 원작 'WAVE' 그림 글씨 → 한국어
    label(this, T, '웨이브', 298, 4, 13, '#FF4B3A', 18, { stroke: '#FFF1E6', st: 3 }).setDepth(6001);
    this.nMoney = num(this, T, 'num_money', 96, 6, 1, 20, 1, 6001);
    this.nMana = num(this, T, 'num_mana', 213, 6, 1, 20, 1, 6001);
    this.nWave = num(this, T, 'num_wave', 366, 8, 1, 18, 2, 6001);
    this.slash = img(this, T, 'num_wave_10', 0, 6).setDepth(6001);
    this.nWaveMax = num(this, T, 'num_wave', 0, 8, 1, 18, 2, 6001);
    this.inf = img(this, T, 'num_wave_11', 0, 6).setDepth(6001);
    this.tMode = label(this, T, '', 470, 8, 12, '#FFE08A', 18).setDepth(6001);
    // 왼쪽 단추 (원작: 왼쪽 아래 세로 줄 · 세로 화면은 위 띠 둘째 줄)
    const BT = this.land ? this.TL : T0(0, 0, 2.6);
    const P = this.land ? { pause: [6, 344], speed: [1, 391], gear: [5, 437] } : { pause: [12, 34], speed: [58, 34], gear: [108, 34] };
    this.btnT = BT; this.btnP = P;
    this.pauseImg = img(this, BT, 'ui_upper_pauseoff', ...P.pause).setDepth(6002);
    this.speedImgs = [img(this, BT, 'ui_upper_speedempty', 0, 0).setDepth(6002), img(this, BT, 'ui_upper_speedempty', 0, 0).setDepth(6002), img(this, BT, 'ui_upper_speed0', 0, 0).setDepth(6003)];
    this.gearImg = img(this, BT, 'ui_upper_ingameoff', ...P.gear).setDepth(6002);
    const zone = (x, y, w, h, fn) => { const z = this.add.zone(BT.x(x), BT.y(y), w * BT.s, h * BT.s).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(6005); z.on('pointerup', () => { if (this.confirm || this.ended) return; fn(); }); return z; };
    this.pauseZone = zone(P.pause[0] - 6, P.pause[1], 43, 39, () => { audio.id(S.TAP, { volume: 0.4 }); this.togglePause(); });
    this.speedZone = zone(P.speed[0] - 1, P.speed[1] + 2, 43, 39, () => { audio.id(S.TAP, { volume: 0.4 }); this.toggleSpeed(); });
    this.gearZone = zone(P.gear[0] - 5, P.gear[1], 43, 39, () => { audio.id(S.TAP, { volume: 0.4 }); this.openMenuUI(); });
    // 다음 웨이브 당기기 (원어데이 추가 · 판 길이 맞춤 — 원작에 없는 기능이라 작게)
    if (this.land) {
      this.earlyBg = this.add.graphics().setDepth(6002);
      this.earlyT = label(this, BT, '당기기', 22, 300, 9, '#DFF5C6', 17).setDepth(6003);
      this.earlySub = label(this, BT, '', 22, 316, 7, '#BFE59A', 17, { weight: '700' }).setDepth(6003);
      this.earlyZone = zone(0, 290, 43, 44, () => this.callEarly());
    } else {
      const ex = this.scale.width - 190, ey = 128;
      this.earlyBtn = button(this, ex, ey, 300, 84, '당기기', () => this.callEarly(), { size: 32, fill: 0x22301C, edge: 0x7FB05A, color: '#DFF5C6', r: 20 });
      this.earlyBtn.setDepth(6002); this.earlyBtn.label.x = -50;
      this.earlySub = text(this, ex + 80, ey + 2, '', 26, '#BFE59A', { weight: '700' }).setDepth(6004);
    }
    // 정지 단추 그림 (테스트 · 안내용 글자)
    this.pauseBtn = { get x() { return 0; }, label: { text: 'II' } };
    this.syncButtons();
  }
  syncButtons() {
    const BT = this.btnT, P = this.btnP;
    const fr = this.frame(this.paused ? 'ui_upper_pauseon' : 'ui_upper_pauseoff'); if (fr) this.pauseImg.setTexture(fr[0], fr[1]);
    this.pauseBtn.label.text = this.paused ? '▶' : 'II';
    const g = this.frame(this.menuUI ? 'ui_upper_ingameon' : 'ui_upper_ingameoff'); if (g) this.gearImg.setTexture(g[0], g[1]);
    // 원작: 보통(×1) = 빨강 ▶ + 빈 ▷ 둘 · 빠르게(×3) = 노랑 · 주황 · 빨강 ▶ 셋
    const [sx, sy] = P.speed, set = (im, n, x, y = 0) => { const f = this.frame(n); if (f) im.setTexture(f[0], f[1]); im.setPosition(BT.x(sx + x), BT.y(sy + y)); };
    if (this.speed === 3) { set(this.speedImgs[0], 'ui_upper_speed2', 12); set(this.speedImgs[1], 'ui_upper_speed1', 6); set(this.speedImgs[2], 'ui_upper_speed0', 0); }
    else { set(this.speedImgs[0], 'ui_upper_speedempty', 21, 7); set(this.speedImgs[1], 'ui_upper_speedempty', 15, 7); set(this.speedImgs[2], 'ui_upper_speed0', 0); }
  }
  updateHud() {
    const s = this.sim, T = this.TL;
    this.nMoney.set(s.money); this.nMana.set(s.mana);
    let w = s.wave; if ((s.mode === 0 || s.mode === 2) && w >= s.waveTotal) w = s.waveTotal - 1;
    this.nWave.set(w + 1);
    const r = this.nWave.right;
    this.slash.setPosition(T.x(r + 2), T.y(6));
    if (s.mode === 1) { this.nWaveMax.c.setVisible(false); this.inf.setVisible(true).setPosition(T.x(r + 10), T.y(6)); }
    else { this.inf.setVisible(false); this.nWaveMax.c.setVisible(true); this.nWaveMax.set(s.waveTotal, r + 10, 8); }
    const mr = s.mode === 1 ? r + 10 + 20 : this.nWaveMax.right;
    if (s.mode === 2) { const gs = s.objects.filter(o => o.role === 'start'), hp = gs.reduce((a, o) => a + Math.max(0, o.hp), 0), mx = gs.reduce((a, o) => a + o.maxHp, 0); this.tMode.setText(`성문 ${Math.ceil(hp / mx * 100)}%`); }
    else this.tMode.setText(s.mode === 1 ? '무한' : '');
    this.tMode.setPosition(T.x(mr + 14), T.y(7));
    // 당기기
    const can = s.canCallEarly();
    if (this.land) {
      const BT = this.btnT, g = this.earlyBg; g.clear();
      g.fillStyle(can ? 0x22301C : 0x161A20, 0.92).fillRoundedRect(BT.x(2), BT.y(290), 39 * BT.s, 40 * BT.s, 6 * BT.s);
      g.lineStyle(2, can ? 0x7FB05A : 0x3A4256, 1).strokeRoundedRect(BT.x(2), BT.y(290), 39 * BT.s, 40 * BT.s, 6 * BT.s);
      this.earlyT.setAlpha(can ? 1 : 0.45); this.earlySub.setText(can ? `+${s.earlyBonus()}` : '').setAlpha(can ? 1 : 0.5);
    } else { this.earlyBtn.setEnabled(can); this.earlySub.setText(can ? `+${s.earlyBonus()}` : ''); }
  }

  // ---------- 카드 (원작: 오른쪽 세로 열 · HERO 단추 → 영웅 카드가 왼쪽으로 펼쳐짐) ----------
  drawCards() {
    const SW = this.scale.width, SH = this.scale.height;
    this.cards = []; this.heroCards = [];
    if (this.land) {
      this.cardT = this.TL;
      BUY_ORDER.forEach((kind, i) => this.cards.push({ i, kind, row: BUY_ROWS[kind], cx: 770, cy: 77 + 65 * i, slide: 0 }));
      this.heroBtnPos = [770, 12];
    } else {
      // 세로: 카드 칸 위쪽에 HERO + 병사 6장 한 줄 (원작 그림 · 원작 순서)
      const T = this.cardT = T0(0, 0, CS), n = 7, cw = 56 * CS, gap = (SW - n * cw) / (n + 1);
      const top = this.trayTop + Math.min(40, Math.max(16, (SH - this.trayTop - 200) / 3));
      const g = this.add.graphics().setDepth(5990); g.fillStyle(0x07090D, 1).fillRect(0, this.trayTop, SW, SH - this.trayTop); g.lineStyle(3, 0x1E2A44, 1).lineBetween(0, this.trayTop, SW, this.trayTop);
      this.heroBtnPos = [(gap + cw / 2) / CS, top / CS];
      BUY_ORDER.forEach((kind, i) => this.cards.push({ i, kind, row: BUY_ROWS[kind], cx: (gap + (i + 1) * (cw + gap) + cw / 2) / CS, cy: top / CS, slide: 0 }));
      this.cardRowTop = top; this.cardRowBottom = top + 72 * CS;
    }
    const T = this.cardT;
    for (const c of this.cards) {
      c.img = img(this, T, `ui_addunit_${CARD_KEY[c.i]}`, c.cx, c.cy, 17).setDepth(6010);
      c.price = num(this, T, 'num_unit_buy', c.cx, c.cy + 37, -2, 17, 1, 6011);
      c.x = T.x(c.cx - 28); c.y = T.y(c.cy); c.w = 56 * T.s; c.h = 56 * T.s;
    }
    const [hx, hy] = this.heroBtnPos;
    this.heroBtn = { img: img(this, T, 'ui_addunit_hero', hx, hy, 17).setDepth(6010), x: T.x(hx - 28), y: T.y(hy), w: 56 * T.s, h: 59 * T.s };
    // 'HERO' 글씨 → 한국어 (그림 아래 글씨 자리)
    this.heroBtn.lab = label(this, T, '영웅', hx, hy + 59, 12, '#B6F23A', 33, { stroke: '#1E2A00', st: 4 }).setDepth(6012);
    // 영웅 카드 (데려온 영웅만 · 원작 순서)
    const owned = [0, 1, 2].filter(g => this.sim.meta.heroes[g]);
    owned.forEach((g, k) => {
      let x, y;
      if (this.land) { x = 586 + 60 * (3 - owned.length) + 60 * k; y = 12; }
      else { x = this.cards[k].cx; y = this.heroBtnPos[1] - 84; }
      const hc = { g, cx: x, cy: y, off: this.land ? 310 : SW / CS };
      hc.c = this.add.container(0, 0).setDepth(6020);
      hc.img = img(this, T, `ui_addunit_hero${g}`, x, y, 17); hc.c.add(hc.img);
      hc.mana = img(this, T, 'ui_upper_hero', x - 17, y + 37, 17); hc.c.add(hc.mana);
      hc.price = num(this, T, 'num_hero_buy', x + 5, y + 37, -2, 17, 1, 0); hc.c.add(hc.price.c);
      hc.c.x = hc.off * T.s; hc.c.setVisible(false);
      hc.x = T.x(x - 28); hc.y = T.y(y); hc.w = 56 * T.s; hc.h = 56 * T.s;
      this.heroCards.push(hc);
    });
    if (!this.land) { this.heroRowBg = this.add.graphics().setDepth(6015).setVisible(false); }
  }
  heroAvail(g) { return this.sim.heroAvailable(g) && this.sim.mana >= this.sim.heroCost(g * 5); }
  cardAfford(c) { return this.sim.money >= this.sim.buyPrice(c.row); }
  updateCards() {
    const s = this.sim, T = this.cardT, busy = this.heroRow || (this.drag && this.drag.hero) || (this.menu && this.menu.confirm);
    for (const c of this.cards) {
      const dis = busy || !this.cardAfford(c), n = `ui_addunit_${CARD_KEY[c.i]}${dis ? '_f' : ''}`, f = this.frame(n);
      if (f && c.img.frame.name !== n) c.img.setTexture(f[0], f[1]);
      const off = this.land ? c.slide * T.s : 0;
      c.img.x = T.x(c.cx) + off; c.price.set(s.buyPrice(c.row)); c.price.c.x = off;
    }
    for (const hc of this.heroCards) {
      const ok = this.heroAvail(hc.g), n = `ui_addunit_hero${hc.g}${ok ? '' : '_f'}`, f = this.frame(n);
      if (f && hc.img.frame.name !== n) hc.img.setTexture(f[0], f[1]);
      hc.price.set(s.heroCost(hc.g * 5));
    }
    if (this.heroRowBg) {
      this.heroRowBg.clear();
      if (this.heroRow && this.heroCards.length) { const a = this.heroCards[0], b = this.heroCards.at(-1); this.heroRowBg.setVisible(true).fillStyle(0x07090D, 0.75).fillRoundedRect(a.x - 20 + a.c.x, a.y - 14, b.x + b.w - a.x + 40, a.h + 60, 24); }
      else this.heroRowBg.setVisible(false);
    }
  }
  // 다른 카드 밀어내기 (원작 oscillator: 고른 카드만 남고 나머지는 오른쪽으로 숨음 → 놓으면 돌아옴)
  slideCards(keep, out) {
    if (!this.land) return;
    for (const c of this.cards) { if (c.i === keep) continue; this.tweens.killTweensOf(c); this.tweens.add({ targets: c, slide: out ? 200 : 0, duration: 240, ease: out ? 'Back.in' : 'Back.out' }); }
  }
  showHeroRow(on) {
    if (on === this.heroRow) return;
    this.heroRow = on;
    if (on) audio.id(S.TAP, { volume: 0.4 });
    for (const hc of this.heroCards) {
      this.tweens.killTweensOf(hc.c);
      if (on) { hc.c.setVisible(true); this.tweens.add({ targets: hc.c, x: 0, duration: 300, ease: 'Back.out' }); }
      else this.tweens.add({ targets: hc.c, x: hc.off * this.cardT.s, duration: 260, ease: 'Back.in', onComplete: () => hc.c.setVisible(false) });
    }
    if (on && !this.heroCards.length) toast(this, '영웅은 영웅 탭에서 데려와요', this.toastY(), C.life);
  }
  hitRect(r, x, y) { return x >= r.x + (r.c ? r.c.x : 0) && x <= r.x + r.w + (r.c ? r.c.x : 0) && y >= r.y && y <= r.y + r.h; }

  // ---------- 입력 ----------
  onDown(p) {
    if (this.cutin && !this.menuUI) { this.sim.skipSpecial(); this.cutin.t = this.cutin.end - 1; return; }
    if (this.menuUI || this.ended || this.cutin || this.drag || this.confirm || this.offer) return;
    // 원작: 아무 곳이나 누르면 다음 웨이브 안내가 닫힘 (보스 경고는 남음)
    if (this.mview && !this.mview.warn) this.mview.t = Math.max(this.mview.t, this.mview.n - 1);
    // 메뉴가 열려 있으면: 메뉴 판 안은 단추가 처리 · 밖을 누르면 닫힘 (원작 flag 2 → 0)
    if (this.menu) {
      if (inRect(this.TM, p.x, p.y, 0, 343, 800, 137) || (this.menu.t.hero && this.sim.meta.special && !this.menu.confirm && inRect(this.TM, p.x, p.y, 625, 272, 160, 69))) return;
      this.closeMenu(); return;
    }
    // 영웅 카드 줄이 펼쳐져 있으면: 영웅 카드 → 끌기 · 다른 곳 → 접기
    if (this.heroRow) {
      const hc = this.heroCards.find(h => this.hitRect(h, p.x, p.y));
      if (hc) { if (this.heroAvail(hc.g)) this.dragStart({ hero: true, g: hc.g, sx: p.x, sy: p.y }); else { audio.id(S.BACK, { volume: 0.4 }); toast(this, this.sim.heroAvailable(hc.g) ? `마나 ${this.sim.heroCost(hc.g * 5)} 필요` : '이미 세운 영웅이에요', this.toastY(), C.life); } return; }
      this.showHeroRow(false); return;
    }
    if (this.hitRect(this.heroBtn, p.x, p.y)) { this.armed = null; this.showPlaceable(false); this.showHeroRow(true); return; }
    const c = this.cards.find(c => this.hitRect(c, p.x, p.y));
    if (c) {
      if (!this.cardAfford(c)) { audio.id(S.BACK, { volume: 0.4 }); toast(this, `골드 ${this.sim.buyPrice(c.row)} 필요`, this.toastY(), C.life); return; }
      this.dragStart({ hero: false, i: c.i, sx: p.x, sy: p.y }); return;
    }
    if (!this.onBoard(p.x, p.y)) return;
    const tl = this.tileAt(p.x, p.y);
    if (this.armed != null && tl) { this.tryPlace(this.armed, tl); return; }
    if (!tl) return;
    const s = this.sim, t = s.towerAt(tl[0], tl[1]);
    if (t) { audio.id(S.TAP, { volume: 0.4 }); this.openMenu(t); return; }
    // 몬스터 누르기 → 집중 공격 (원작 searchEnemyTouch → commonTarget)
    let best = null, bd = 70;
    for (const m of s.monsters) { if (!m.alive || m.status) continue; const [mx, my] = this.rot(m.x, m.y); const d = Math.hypot(mx - p.x, my - 20 * this.k - p.y); if (d < bd) { bd = d; best = m; } }
    if (best) { s.setFocus(best); audio.id(S.TAP, { volume: 0.4 }); return; }
    const o = s.objectAt(tl[0], tl[1]);
    if (o && o.destroyable) { s.setFocus(o); audio.id(S.TAP, { volume: 0.4 }); return; }
  }
  dragStart(d) {
    this.drag = { ...d, moved: false, ghost: null, tile: null };
    if (!d.hero) this.slideCards(d.i, true);
  }
  ghostSet(d) { return d.hero ? HERO_SPRITE[d.g] : DETAIL_SPRITE[T.char[BUY_ROWS[BUY_ORDER[d.i]]][CHAR.DETAIL]]; }
  ghostRange(d) { const s = this.sim; if (d.hero) { const r = T.hero[d.g * 5][3]; return r + Math.floor(r * s.itemRate(d.g, 4) / 100); } const row = BUY_ROWS[BUY_ORDER[d.i]], c = T.char[row]; const r = c[CHAR.RANGE]; return r + Math.floor(r * s.unitRate(c[CHAR.CLASS] + 1, 9) / 100); }
  onMove(p) {
    const d = this.drag; if (!d) return;
    if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 18) { d.moved = true; d.ghost = { parts: [] }; this.showPlaceable(true); }
    if (!d.moved) return;
    // 손가락에 가리지 않게 위로 띄움 (원작 25px · 세로 화면은 손가락이 커서 더)
    const gy = p.y - (this.land ? 25 * this.k : 150);
    const tl = this.onBoard(p.x, gy) ? this.tileAt(p.x, gy) : null;
    d.tile = tl && this.sim.canPlace(tl[0], tl[1]) ? tl : null;
    const [gx, gyy] = tl ? this.tileCenter(tl[0], tl[1]) : [p.x, gy];
    this.drawAnim(d.ghost, this.ghostSet(d), 1, 0, gx, gyy, 1, 0.9, 9000);
    this.showRange(gx, gyy, this.ghostRange(d), !!d.tile, !!tl);
  }
  onUp(p) {
    const d = this.drag; if (!d) return;
    if (!d.moved) {
      // 누르기만 함 → 놓을 칸 고르기 (세로 화면 한 손 조작: 한 번 더 누르면 해제) — 영웅은 끌어서만
      if (!d.hero) { if (this.armed === d.i) { this.armed = null; this.showPlaceable(false); } else { this.armed = d.i; this.showPlaceable(true); toast(this, '밝은 칸을 눌러 세우세요', this.toastY()); } }
      this.cancelDrag(true); return;
    }
    if (d.tile) { if (d.hero) this.placeHero(d.g, d.tile); else this.tryPlace(d.i, d.tile); }
    else audio.id(S.BACK, { volume: 0.4 });
    this.cancelDrag();
  }
  cancelDrag(keepArmed = false) {
    const d = this.drag;
    if (d) { if (d.ghost) this.clearParts(d.ghost); if (!d.hero) this.slideCards(d.i, false); }
    this.drag = null; this.hideRange(); if (this.armed == null || !keepArmed) { if (!keepArmed) this.armed = null; this.showPlaceable(this.armed != null); }
  }
  tryPlace(i, tl) {
    const r = this.sim.place(BUY_ORDER[i], tl[0], tl[1]);
    if (!r.ok) { toast(this, r.why, this.toastY(), C.life); return; }
    audio.id(S.TAP, { volume: 0.5 });
    this.armed = null; this.showPlaceable(false); this.hideRange();
    if (this.hintStep < 9) { load().tips.place = 1; save(); this.hideHint(); this.hintStep = 9; }
  }
  // 영웅: 세운 뒤 메뉴의 O.K.(확인)를 눌러야 확정 (원작 flag 6) — 다른 곳을 누르면 취소하고 마나를 돌려받음
  placeHero(g, tl) {
    const r = this.sim.place('hero' + g, tl[0], tl[1]);
    if (!r.ok) { toast(this, r.why, this.toastY(), C.life); return; }
    audio.id(S.TAP, { volume: 0.5 });
    this.showHeroRow(false);
    this.openMenu(r.t, true);
  }
  // 놓을 수 있는 칸: 원작은 판에 격자만 그림(drawAddGridBlock) · 세로 화면은 칸이 작아 밝은 칸도 함께
  showPlaceable(on) {
    const g = this.placeLayer; g.clear(); this.drawGrid(on || !!this.menu);
    if (!on || this.land) return;
    const s = this.sim;
    for (let i = 0; i < 15; i++) for (let j = 0; j < 10; j++) if (s.canPlace(i, j)) {
      const [x, y] = this.tileCenter(i, j);
      g.fillStyle(0xBFFFB0, 0.16).fillRoundedRect(x - 20 * this.k, y - 20 * this.k, 40 * this.k, 40 * this.k, 8);
    }
  }
  drawGrid(on) {
    const g = this.gridG; g.clear(); if (!on) return;
    g.fillStyle(0xFFFFFF, 0.15);
    if (this.land) { for (let i = 0; i <= 15; i++) g.fillRect(this.bx + i * 45 * this.k, this.by, Math.max(1, this.k * 0.6), this.bh); for (let j = 0; j <= 10; j++) g.fillRect(this.bx, this.by + j * 45 * this.k, this.bw, Math.max(1, this.k * 0.6)); }
    else { for (let i = 0; i <= 10; i++) g.fillRect(this.bx + i * 45 * this.k, this.by, 1.5, this.bh); for (let j = 0; j <= 15; j++) g.fillRect(this.bx, this.by + j * 45 * this.k, this.bw, 1.5); }
  }
  // 사거리 원 (원작 etc_whitecircle · 못 놓는 자리는 etc_redcircle): 지름 = 사거리 × 0.9 원작 px
  showRange(x, y, r, ok = true, tile = true) {
    const n = r <= 100 ? 1 : r <= 200 ? 2 : r <= 300 ? 3 : 4, nm = `etc_${ok ? 'white' : 'red'}circle${n}`, f = this.frame(nm);
    if (!f) return;
    if (!this.rangeImg) this.rangeImg = this.add.image(0, 0, f[0], f[1]).setDepth(6);
    this.rangeImg.setTexture(f[0], f[1]).setVisible(tile).setPosition(x, y).setScale(this.sp * (r * 0.9 / (n * 100)));
  }
  hideRange() { if (this.rangeImg) this.rangeImg.setVisible(false); }

  // ---------- 병사 · 영웅 메뉴 (원작 drawCharMenu) ----------
  openMenu(t, confirm = false) {
    this.closeMenu(true); this.armed = null; this.showHeroRow(false);
    if (this.mview) { this.mview.t = this.mview.n; this.renderMonsterView(); }   // 원작: 메뉴를 열면 다음 웨이브 안내를 닫음
    const c = this.add.container(0, 0).setDepth(8100);
    this.menu = { t, confirm, c, key: null, press: null };
    this.menuBack = pushBack(() => { if (this.confirm) { this.closeConfirm(); return true; } this.closeMenu(); return true; });
    this.showPlaceable(false);
    this.drawPanel();
  }
  // cancel: 영웅 확인 전이면 세운 것을 거둠
  closeMenu(silent = false) {
    const m = this.menu; if (!m) return;
    if (m.confirm && this.sim.towers.includes(m.t)) this.sim.unplaceHero(m.t);
    m.c.destroy(); this.menu = null; this.closeConfirm(); this.hideRange(); this.drawGrid(false);
    if (this.menuBack) { this.menuBack(); this.menuBack = null; }
    if (!silent) audio.id(S.BACK, { volume: 0.3 });
  }
  panelInfo() {
    const s = this.sim, t = this.menu.t;
    const li = s.levelInfo(t), ci = s.classInfo(t);
    return { li, ci, lvAfford: li ? (li.cur === 'mana' ? s.mana : s.money) >= li.cost : false, ciAfford: ci ? s.money >= ci.cost : false };
  }
  drawPanel() {
    const m = this.menu; if (!m) return;
    const s = this.sim, t = m.t, T = this.TM;
    if (!s.towers.includes(t)) { this.closeMenu(true); return; }
    const { li, ci, lvAfford, ciAfford } = this.panelInfo();
    const cool = t.hero ? Math.ceil(t.specialCool / 10) : 0;
    const key = [t.row, s.money, s.mana, cool, this.upAnim, this.lvAnim, m.press, m.confirm, s.meta.special].join('|');
    if (key === m.key) return; m.key = key;
    const c = m.c; c.removeAll(true);
    const F = this.land ? 1 : 1.3;   // 세로 화면: 메뉴가 화면 폭(원작 ×1.35)이라 글자만 1.3배 (폰에서 읽히게)
    const add = o => { c.add(o); return o; };
    const SW = this.scale.width;
    // 판 어둡게 (원작 0.2) · 사거리 원 · 격자
    const dimH = T.y(343);
    add(this.add.rectangle(this.land ? this.ox : 0, this.land ? this.oy : 0, this.land ? 800 * US : SW, this.land ? 343 * US : dimH, 0x000000, 0.2).setOrigin(0));
    const [rx, ry] = this.rot(t.ox, t.oy); this.showRange(rx, ry, t.range); this.drawGrid(true);
    add(img(this, T, 'ui_char_etc_background', 0, 343));
    // 전신 일러스트 + 이름 (전직하면 옛 그림이 왼쪽으로 빠지고 새 그림이 들어옴 · 원작 upgradeCount)
    const fi = t.hero ? 12 + t.group : t.detail;
    const u = this.upAnim;
    if (u > 0 && !t.hero) {
      if (u > 5) { const od = DOWNGRADE_DETAIL[t.detail]; if (od != null) { add(img(this, T, `ui_char_face_${FACE_KEY[od]}`, -(10 - u) * 80, 480, 34)); const nm = add(img(this, T, `ui_char_name_${NAME_KEY[od]}`, 287, 321, 10)); nm.scaleX *= (u - 5) * 0.2; } }
      else { add(img(this, T, `ui_char_face_${FACE_KEY[fi]}`, -u * 80, 480, 34)); const nm = add(img(this, T, `ui_char_name_${NAME_KEY[fi]}`, 287, 321, 10)); nm.scaleX *= (5 - u) * 0.2; }
    } else {
      add(img(this, T, `ui_char_face_${FACE_KEY[fi]}`, 0, 480, 34));
      add(img(this, T, `ui_char_name_${NAME_KEY[fi]}`, 287, 305, 18));
    }
    if (t.hero) add(label(this, T, '영웅', 287, 287, 13 * F, '#FFFFFF', 18, { stroke: '#000000', st: 3 }));
    // 능력치 4줄 (원작 ATT · SPD · RANGE · EXTRA)
    add(img(this, T, 'ui_char_etc_backline', 278, 356));
    STAT_LABELS.forEach((n, i) => add(label(this, T, n, 290, 360 + i * 27.5, 13 * F, '#FFFFFF', 18, { stroke: '#000000', st: 2 })));
    add(img(this, T, 'ui_char_etc_lv', 486, 314));
    add(img(this, T, `ui_char_etc_${Math.min(5, t.level)}`, 519, 314));
    const vals = [String(s.hitPower(t)), attackSpeed(t.coolMax), String(t.range), effectName(t.effect)];
    vals.forEach((v, i) => add(label(this, T, v, 420, [360, 388, 416, 442][i], 14 * F, MINT, 20, { stroke: '#000000', st: 2 })));
    const shade = (x, y, w, h) => add(this.add.rectangle(T.x(x), T.y(y), w * T.s, h * T.s, 0x000000, 0.5).setOrigin(0));
    const flash = (x, y, w, h, a) => add(this.add.rectangle(T.x(x), T.y(y), w * T.s, h * T.s, 0xFFFFFF, a).setOrigin(0));
    if (m.confirm) {
      // 영웅 세우기 확인 (원작 flag 6): 필살기 설명 + O.K. (마나 값)
      add(img(this, T, `ui_char_etc_special${['dancingblade', 'millionarrow', 'icequake'][t.group]}`, 440, 400));
      add(label(this, T, '필살기', 516, 418, 12 * F, '#F5B800', 9, { stroke: '#2A1500', st: 3 }));
      add(img(this, T, `ui_char_button_ok_${m.press === 'ok' ? 'on' : 'off'}`, 670, 350));
      add(label(this, T, '확인', 727, 388, 22 * F, '#FFFFFF', 9, { stroke: '#0A1A3A', st: 4 }));
      add(img(this, T, 'ui_upper_mana', 696, 428));
      add(label(this, T, String(t.paid || 0), 755, 430, 14 * F, '#FFFFFF', 20));
      this.zone(c, T, 'ok', 670, 350, 115, 115, () => { m.confirm = false; this.sim.stats.heroUsed = true; audio.id(S.TAP, { volume: 0.5 }); this.closeMenu(true); });
      return;
    }
    // 판매 (병사만)
    if (!t.hero) {
      add(img(this, T, `ui_char_button_sell_${m.press === 'sell' ? 'on' : 'off'}`, 15, 390));
      add(label(this, T, '판매', 15 + 34, 390 + 21, 14 * F, '#FFFFFF', 9, { stroke: '#0A1A3A', st: 3 }));
      add(label(this, T, String(s.sellValue(t)), 80, 430, 14 * F, '#FFFFFF', 20));
      this.zone(c, T, 'sell', 15, 390, 75, 75, () => { audio.id(S.TAP, { volume: 0.5 }); s.sell(t); this.closeMenu(true); });
    }
    // 전직 (다음 직업 미리보기 그림 + 이름)
    if (ci) {
      add(img(this, T, `ui_char_button_class_${m.press === 'class' ? 'on' : 'off'}`, 435, 350));
      add(label(this, T, '전직', 435 + 40, 350 + 42, 17 * F, '#FFFFFF', 9, { stroke: '#0A1A3A', st: 4 }));
      add(img(this, T, `ui_char_up_face_${UPFACE_KEY[ci.detail]}`, 514, 364));
      add(img(this, T, `ui_char_name_${NAME_KEY[ci.detail]}`, 653, 449, 36, 0.4));
      add(label(this, T, String(ci.cost), 503, 421, 14 * F, '#FFFFFF', 20));
      if (!ciAfford) shade(435, 350, 235, 115);
      if (this.upAnim > 0) flash(435, 350, 235, 115, this.upAnim * 0.1);
      this.zone(c, T, 'class', 435, 350, 235, 115, () => { if (!this.panelInfo().ciAfford) { toast(this, '골드가 모자라요', this.toastY(), C.life); return; } audio.id(S.TAP, { volume: 0.5 }); this.openConfirm('class'); });
    }
    // 레벨 업 (lv n > lv n+1)
    if (li) {
      const lo = t.level - 1;
      add(img(this, T, `ui_char_button_${t.hero ? 'lvluphero' : 'lvlup'}_${m.press === 'level' ? 'on' : 'off'}`, 670, 350));
      add(label(this, T, '레벨 업', 670 + 57, 350 + 36, 15 * F, '#FFFFFF', 9, { stroke: '#0A1A3A', st: 3 }));
      add(img(this, T, `ui_char_button_${lo + 1}_${m.press === 'level' ? 'on' : 'off'}`, 708, 401, 17));
      add(img(this, T, `ui_char_button_${lo + 2}_${m.press === 'level' ? 'on' : 'off'}`, 764, 401, 17));
      add(label(this, T, String(li.cost), 756, 423, 14 * F, '#FFFFFF', 20));
      if (!lvAfford) shade(670, 350, 115, 115);
      if (this.lvAnim > 0) flash(670, 350, 115, 115, this.lvAnim * 0.1);
      this.zone(c, T, 'level', 670, 350, 115, 115, () => { if (!this.panelInfo().lvAfford) { toast(this, li.cur === 'mana' ? '마나가 모자라요' : '골드가 모자라요', this.toastY(), C.life); return; } audio.id(S.TAP, { volume: 0.5 }); this.openConfirm('level'); });
    }
    // 영웅 필살기 단추 (원작: 영웅 메뉴 위 오른쪽 · 1-5 를 깨면 열림)
    if (t.hero && s.meta.special) {
      const nm = ['dancing_blade', 'millon_arrow', 'ice_quake'][t.group];
      add(img(this, T, `ui_char_button_spe_${nm}_${m.press === 'spe' ? 'on' : 'off'}`, 625, 272));
      add(label(this, T, '필살기', 625 + 80, 272 + 13, 12 * F, '#F5B800', 9, { stroke: '#2A1500', st: 3 }));
      if (t.specialCool > 0 || s.mana < t.specialMana) shade(631, 278, Math.max(0, t.specialCool) * 148 / Math.max(1, t.specialCoolMax), 57);
      add(label(this, T, String(t.specialMana), 730, 318, 14 * F, '#FFFFFF', 20));
      this.zone(c, T, 'spe', 625, 272, 160, 69, () => {
        if (t.specialCool > 0) { toast(this, `필살기 준비 중 ${Math.ceil(t.specialCool / TICK)}초`, this.toastY(), C.life); return; }
        if (s.mana < t.specialMana) { toast(this, `마나 ${t.specialMana} 필요`, this.toastY(), C.life); return; }
        audio.id(S.TAP, { volume: 0.5 });
        this.closeMenu(true);
        if (!s.useSpecial(t)) toast(this, '아직 쓸 수 없어요', this.toastY(), C.life);
      });
    }
  }
  // 메뉴 단추 (원작 터치 사각형): 누르면 _on 그림 · 떼면 실행
  zone(c, T, id, x, y, w, h, fn) {
    const z = this.add.zone(T.x(x), T.y(y), w * T.s, h * T.s).setOrigin(0).setInteractive({ useHandCursor: true });
    z.on('pointerdown', () => { if (this.menu && !this.confirm) { this.menu.press = id; } });
    z.on('pointerout', () => { if (this.menu && this.menu.press === id) this.menu.press = null; });
    z.on('pointerup', () => { if (!this.menu || this.confirm) return; const was = this.menu.press === id; this.menu.press = null; if (was) fn(); });
    c.add(z); return z;
  }

  // ---------- 확인 창 (원작 flag 12 전직 · 13 레벨 업): 지금 → 다음 능력치 비교 · 예 / 아니오 ----------
  openConfirm(kind) {
    const m = this.menu; if (!m) return;
    const s = this.sim, t = m.t, T = this.TP, SW = this.scale.width, SH = this.scale.height;
    const { li, ci } = this.panelInfo();
    const next = kind === 'class' ? ci && ci.next : li && li.next; if (next == null) return;
    const nx = s.preview(t, next);
    const c = this.add.container(0, 0).setDepth(9000);
    const block = this.add.rectangle(SW / 2, SH / 2, SW, SH, 0x000000, 0.5).setInteractive(); c.add(block);
    c.add(img(this, T, 'ui_popup_background', 152, 144));
    const cur = [String(s.hitPower(t)), attackSpeed(t.coolMax), String(t.range), effectName(t.effect)];
    const nxt = [String(s.hitPower(nx)), attackSpeed(nx.coolMax), String(nx.range), effectName(nx.effect)];
    const rows = [162, 189, 217, 243];
    if (kind === 'class') {
      c.add(img(this, T, 'ui_popup_stat', 392, 160));
      STAT_LABELS.forEach((n, i) => c.add(label(this, T, n, 410, rows[i], 13, '#FFFFFF', 18, { stroke: '#000000', st: 2 })));
      c.add(img(this, T, 'ui_char_button_class_off', 161, 154));
      c.add(label(this, T, '전직', 161 + 40, 154 + 42, 17, '#FFFFFF', 9, { stroke: '#0A1A3A', st: 4 }));
      c.add(img(this, T, `ui_char_up_face_${UPFACE_KEY[ci.detail]}`, 240, 168));
      c.add(img(this, T, `ui_char_name_${NAME_KEY[ci.detail]}`, 379, 253, 36, 0.4));
      c.add(label(this, T, String(ci.cost), 229, 225, 14, '#FFFFFF', 20));
      c.add(label(this, T, '이 병사를 전직할까요?', 400, 270, 16, '#FFFFFF', 17, { stroke: '#000000', st: 3 }));
      cur.forEach((v, i) => c.add(label(this, T, v, 540, rows[i], 16, '#FFFFFF', 20, { stroke: '#000000', st: 3 })));
      nxt.forEach((v, i) => c.add(label(this, T, v, 625, rows[i], 16, '#FFE27A', 20, { stroke: '#000000', st: 3 })));
    } else {
      c.add(img(this, T, 'ui_popup_levelup', 170, 160));
      STAT_LABELS.forEach((n, i) => c.add(label(this, T, n, 298, rows[i], 13, '#FFFFFF', 18, { stroke: '#000000', st: 2 })));
      c.add(label(this, T, '레벨 업 할까요?', 400, 270, 16, '#FFFFFF', 17, { stroke: '#000000', st: 3 }));
      cur.forEach((v, i) => c.add(label(this, T, v, 430, rows[i], 16, '#FFFFFF', 20, { stroke: '#000000', st: 3 })));
      nxt.forEach((v, i) => c.add(label(this, T, v, 526, rows[i], 16, '#FFE27A', 20, { stroke: '#000000', st: 3 })));
    }
    const btn = (id, x, on, off, txt, fn) => {
      const im = img(this, T, off, x, 290); c.add(im);
      c.add(label(this, T, txt, x + 118, 290 + 21, 18, '#FFFFFF', 9, { stroke: '#0A1A3A', st: 4 }));
      const z = this.add.zone(T.x(x), T.y(290), 236 * T.s, 43 * T.s).setOrigin(0).setInteractive({ useHandCursor: true }); c.add(z);
      const sw = n => { const f = this.frame(n); if (f) im.setTexture(f[0], f[1]); };
      z.on('pointerdown', () => sw(on)); z.on('pointerout', () => sw(off)); z.on('pointerup', () => { sw(off); fn(); });
    };
    btn('yes', 162, 'ui_popup_yeson', 'ui_popup_yesoff', '예', () => {
      this.closeConfirm(); audio.id(S.TAP, { volume: 0.5 });
      if (kind === 'class') { if (s.classChange(t)) this.upAnim = 10; }
      else if (s.levelUp(t)) this.lvAnim = 10;
    });
    btn('no', 402, 'ui_popup_noon', 'ui_popup_nooff', '아니오', () => { audio.id(S.BACK, { volume: 0.5 }); this.closeConfirm(); });
    this.confirm = { c, kind };
  }
  closeConfirm() { if (this.confirm) { this.confirm.c.destroy(); this.confirm = null; } }

  // ---------- 다음 웨이브 안내 (원작 drawMonsterViewMenu · 웨이브 시작마다 1.5초 · 보스 웨이브는 경고) ----------
  showMonsterView(waveIdx) {
    this.mview?.c.destroy();
    const s = this.sim, w = s.mob[waveIdx % s.waveTotal]; if (!w) return;
    const boss = w[6] === 3, T = this.TV, c = this.add.container(0, 0).setDepth(7500);
    const types = [[w[0], w[1]], [w[3], w[4]]].filter(x => x[0] >= 0);
    let y2 = types.length > 1 ? 300 : 390; const fs = types.length > 1 ? 0.7 : 1;
    c.add(img(this, T, 'ui_monster_etc_nextwave', 0, y2, 34));
    c.add(label(this, T, '다음 웨이브', 10, y2 - 14, 13, '#9FF3FF', 10, { stroke: '#062030', st: 3 }));
    types.forEach(([type, cnt], k) => {
      const bossMon = w[6] === 2 || w[6] === 3, st = s.monStat(type, bossMon && k === 0, waveIdx), o = monOrder(type);
      c.add(img(this, T, 'ui_monster_etc_background', 0, y2));
      c.add(label(this, T, '체력', 582, y2 + 21, 11, '#FFFFFF', 17, { stroke: '#000000', st: 2 }));
      c.add(label(this, T, '속도', 679, y2 + 21, 11, '#FFFFFF', 17, { stroke: '#000000', st: 2 }));
      c.add(img(this, T, `ui_monster_face_${MON_KEY[o]}`, 130, y2 + 80, 33, fs));
      const nm = img(this, T, `ui_monster_name_${MON_KEY[o]}`, 370, y2 + 17, 17); c.add(nm);
      c.add(label(this, T, `x ${cnt}`, 380 + nm.displayWidth / T.s / 2, y2 + 27, 25, '#FFFFFF', 18, { stroke: '#000000', st: 3 }));
      c.add(label(this, T, String(st.hp), 582, y2 + 55, 20, MON_GREEN, 17, { stroke: '#000000', st: 3 }));
      c.add(label(this, T, String(st.speed), 679, y2 + 55, 20, MON_GREEN, 17, { stroke: '#000000', st: 3 }));
      y2 += 90;
    });
    let warn = null, glow = null;
    if (boss) {
      // 원작 'WARNING' 그림 글씨 → 한국어 '경고' (빨간 글씨 + 흰 빛)
      glow = label(this, this.land ? this.TL : T0(0, this.by + this.bh * 0.3 - 146 * 2, 2), '경고', 400, 146 + 49, 62, '#FFFFFF', 9, { stroke: '#FF2A2A', st: 14 }); glow.setDepth(7501).setAlpha(0);
      warn = label(this, this.land ? this.TL : T0(0, this.by + this.bh * 0.3 - 146 * 2, 2), '경고', 400, 146 + 49, 56, '#FF3B30', 9, { stroke: '#FFFFFF', st: 6 }); warn.setDepth(7502);
      audio.id(20, { volume: 0.7 });
    }
    this.mview = { c, n: boss ? 100 : 60, t: 0, warn, glow, T };
    this.renderMonsterView();
  }
  renderMonsterView() {
    const v = this.mview; if (!v) return;
    const left = v.n - v.t; if (left <= 0) { v.c.destroy(); v.warn?.destroy(); v.glow?.destroy(); this.mview = null; return; }
    const slide = v.t < 10 ? (10 - v.t) * 9 : 0, a = left < 10 ? left * 0.1 : 1;
    v.c.y = slide * v.T.s; v.c.setAlpha(a);
    if (v.warn) { v.warn.setAlpha(a); const k = v.t % 16, b = k < 8 ? k * 0.125 : 1 - (k - 8) * 0.125; v.glow.setAlpha(Math.min(a, b)); }
  }

  // ---------- 버튼 ----------
  toggleSpeed() { this.speed = this.speed === 1 ? 3 : 1; load().speed = this.speed; save(); this.syncButtons(); }
  callEarly() { if (this.paused) { toast(this, '일시정지 중이에요', this.toastY(), C.life); return; } const b = this.sim.callEarly(); if (b) { const [x, y] = [this.bx + this.bw / 2, this.by + this.bh * 0.15]; this.popText(x, y, `+${b} 골드 · 웨이브 당김!`, C.gold, 44); } }
  useSpecial() { const h = this.sim.readyHero(); if (!this.sim.useSpecial(h)) { toast(this, '아직 쓸 수 없어요', this.toastY(), C.life); return false; } return true; }

  // ---------- 매 프레임 ----------
  update(time, dt) {
    dt = Math.min(dt, 100);
    this.flush();
    // 원작 UI 틱 (41/초): 전직 · 레벨 업 번쩍임 · 다음 웨이브 안내
    this.uiAcc = (this.uiAcc || 0) + dt * TICK / 1000;
    while (this.uiAcc >= 1) { this.uiAcc -= 1; this.uiTick++; if (this.upAnim > 0) this.upAnim--; if (this.lvAnim > 0) this.lvAnim--; if (this.blink > 0) this.blink--; if (this.mview && !(this.paused || this.menu || this.confirm)) this.mview.t++; }
    // 메뉴 · 확인 창이 열려 있으면 판 시간이 멈춘다 (원작) · 전략 정지도 같음
    const frozen = this.paused || this.menu || this.confirm;
    if (frozen) {
      this.acc += dt * TICK / 1000; let n = 0;
      while (this.acc >= 1 && n < 8) { this.acc -= 1; n++; for (const f of this.fxs) f.t++; }
      this.render(); return;
    }
    this.acc += dt * TICK / 1000 * (this.cutin ? 1 : this.speed);
    let n = 0;
    while (this.acc >= 1 && n < 12) { this.acc -= 1; n++; this.tick(); }
    this.render();
  }
  flush() { const s = this.sim; for (const e of s.events) this.onEvent(e); s.events.length = 0; }
  tick() {
    const s = this.sim;
    s.step();
    for (const e of s.events) this.onEvent(e);
    s.events.length = 0;
    for (const f of this.fxs) f.t++;
    if (this.cutin) this.cutin.t = this.sim.special ? this.sim.special.t : this.cutin.t + 1;
  }
  onEvent(e) {
    switch (e.type) {
      case 'sound': audio.id(e.id, { volume: e.soft ? 0.32 : 0.45, gap: 70 }); break;
      case 'fx': this.addFx(e.kind, e.x, e.y); break;
      case 'dmg': { const v = this.views.get(e.m); if (v) v.flash = 3; break; }
      case 'kill': this.addFx(13, e.m.x, e.m.y); break;
      case 'obreak': { this.addFx(13, e.o.x, e.o.y); const v = this.views.get(e.o); if (v) { v.img.destroy(); v.bar?.destroy(); v.sh?.destroy(); this.views.delete(e.o); }
        this.rewardPop(e.o, e.gold ? 0 : 1, e.gold || e.mana); audio.id(S.LEVELUP, { volume: 0.4 }); break; }
      case 'leak': this.leakFx(e); break;
      // 레벨 업 · 전직: 원작 효과 14 + 소리 13 (전직 그림 바뀜은 메뉴의 upAnim)
      case 'levelup': this.addFx(14, e.t.ox, e.t.oy); audio.id(S.LEVELUP, { volume: 0.5 }); break;
      case 'place': this.addFx(14, e.t.ox, e.t.oy); audio.id(14, { volume: 0.4 }); break;
      case 'sell': { const v = this.views.get(e.t); if (v) { this.clearParts(v); v.sh?.destroy(); v.stars?.forEach(x => x.destroy()); this.views.delete(e.t); } if (!e.cancel) audio.id(S.BACK, { volume: 0.5 }); break; }
      case 'wave': this.showMonsterView(e.n - 1); if (this.sim.snap && this.sim.mode !== 1) saveResume(this.sim.snap); break;
      case 'gatebreak': { const [x, y] = this.rot(e.o.x, e.o.y); this.addFx(36, e.o.x, e.o.y); this.cameras.main.shake(400, 0.016); this.popText(x, y - 60, '성문 파괴!', C.gold, 56); audio.id(S.BLADE, { volume: 0.8 }); const v = this.views.get(e.o); if (v) { this.tweens.add({ targets: v.img, alpha: 0, scaleY: 0.2, duration: 500 }); } break; }
      case 'special': if (this.paused) { this.pendingSpecial = e.hero; toast(this, '재개하면 필살기가 터집니다', this.toastY(), C.gold); } else this.startCutin(e.hero); break;
      case 'specialHit': audio.id([1, 4, 7][e.kind] ?? 1, { volume: 0.7 }); this.blink = 10; break;
      case 'early': audio.id(S.TAP, { volume: 0.6 }); break;
      case 'clear': this.time.delayedCall(900, () => this.showResult(true)); break;
      case 'over': this.time.delayedCall(700, () => this.maybeContinue()); break;
    }
  }
  // 물건 보상 (원작: 골드/마나 그림 + 숫자 그림이 위로 떠오르며 사라짐)
  rewardPop(o, kind, v) {
    const [x, y] = this.rot(o.x, o.y), T = T0(x - 0, y - 0, this.k), c = this.add.container(0, 0).setDepth(8000);
    c.add(img(this, T, kind ? 'ui_upper_mana' : 'ui_upper_money', -1, 0, 20));
    const n = num(this, T, kind ? 'num_mana' : 'num_money', 1, 2, 1, 18, 1); n.set(v); c.add(n.c);
    this.tweens.add({ targets: c, y: -30 * 2 * this.k, duration: 750, ease: 'Linear' });
    this.tweens.add({ targets: c, alpha: 0, delay: 370, duration: 380, onComplete: () => c.destroy() });
  }

  // ---------- 그리기 ----------
  render() {
    const s = this.sim;
    // 몬스터
    for (const m of s.monsters) {
      let v = this.views.get(m);
      if (!v) { v = { parts: [], lx: null, back: false, face: 0 }; const f = this.frame('etc_sha34'); v.sh = this.add.image(0, 0, f[0], f[1]).setAlpha(0.5); const hb = this.frame('ui_upper_hpbar'); v.bar = hb ? this.add.image(0, 0, hb[0], hb[1]).setOrigin(0).setDepth(3600) : null; this.views.set(m, v); }
      const [x, y] = this.rot(m.x, m.y);
      if (v.lx != null) { const dx = x - v.lx, dy = y - v.ly; if (Math.abs(dx) > 0.3) v.face = dx > 0 ? 1 : 0; if (Math.abs(dy) > 0.3 || Math.abs(dx) > 0.3) v.back = dy < -0.3 && Math.abs(dy) > Math.abs(dx); }
      v.lx = x; v.ly = y;
      const set = m.type < 100 ? m.type % 25 : 100 + ((m.type - 100) % 5);
      const sc = m.body / 100;
      const alpha = m.status === 1 ? (10 - m.sc) * 0.1 : m.sc < 16 ? m.sc / 16 : 1;
      this.drawAnim(v, set, (v.back ? 2 : 0) + v.face, Math.floor(m.sc / 3), x, y, sc, alpha, undefined, null, 1, 0);
      if (v.flash > 0) { v.flash--; for (const p of v.parts) p.setTintFill(0xFFFFFF).setAlpha(p.alpha * 0.85); } else for (const p of v.parts) p.clearTint();
      v.sh.setPosition(x, y + 10 * this.k).setScale(this.sp * sc * 0.9).setDepth(y - 1).setAlpha(0.45 * alpha);
      // 원작 체력 막대 (ui_upper_hpbar 30×6 을 남은 만큼 잘라 씀)
      if (v.bar) {
        const on = m.status === 0 && m.hp < m.maxHp; v.bar.setVisible(on);
        if (on) { const fw = v.bar.frame.width, w = Math.max(2, Math.floor(m.hp * 30 / m.maxHp)); v.bar.setCrop(0, 0, fw * w / 30, v.bar.frame.height).setScale(this.sp).setPosition(x - 15 * this.k, y + (10 - T.monster[m.type][9]) * this.k); }
      }
      if (m.stun > 0) { /* 원작: 기절 효과 그림(effect)으로 표시 */ }
    }
    for (const [m, v] of this.views) if (m.monster && !m.alive) { this.clearParts(v); v.sh.destroy(); v.bar?.destroy(); this.views.delete(m); }
    // 병사 · 영웅
    for (const t of s.towers) {
      let v = this.views.get(t);
      if (!v) { v = { parts: [], face: 1, stars: [] }; const f = this.frame('etc_sha34'); v.sh = this.add.image(0, 0, f[0], f[1]).setAlpha(0.45); this.views.set(t, v); }
      const [x, y] = this.rot(t.x, t.y);
      const tg = t.lock[0];
      if (tg && t.status === 1) { const [tx] = this.rot(tg.x, tg.y); if (Math.abs(tx - x) > 2) v.face = tx > x ? 1 : 0; }
      let act, spd;
      if (t.status === 1) { act = 2 + v.face; spd = 3; } else { act = v.face; spd = 5; }
      if (t.hero && t.specialCool <= 0 && s.mana >= t.specialMana && t.status === 0 && s.meta.special) act = 4 + v.face;
      this.drawAnim(v, t.sprite, act, Math.floor(t.sc / spd), x, y, 1, 1, undefined, null, 1, 0);
      v.sh.setPosition(x, y + 10 * this.k).setScale(this.sp).setDepth(y - 1);
      // 레벨 별 (원작 ui_upper_star · 발밑 오른쪽부터)
      const [ox, oy] = this.rot(t.ox, t.oy), lv = t.level;
      const [x0, step] = lv === 1 ? [15, 0] : lv === 2 ? [0, 15] : lv === 3 ? [-15, 15] : lv === 4 ? [-15, 10] : [-13, 7];
      const sf = this.frame('ui_upper_star');
      while (v.stars.length < lv && sf) v.stars.push(this.add.image(0, 0, sf[0], sf[1]));
      while (v.stars.length > lv) v.stars.pop().destroy();
      v.stars.forEach((st, i) => st.setPosition(ox + (x0 + i * step) * this.k, oy + 10 * this.k).setScale(this.sp).setDepth(oy + 2));
    }
    // 화살
    for (const a of s.arrows) {
      let im = this.arrowViews.get(a);
      const imgs = ARROW_IMG[a.kind] || ARROW_IMG[10];
      const nm = imgs[Math.floor(s.time / 2) % imgs.length], f = this.frame(nm);
      if (!im) { im = this.add.image(0, 0, f[0], f[1]).setScale(this.sp); this.arrowViews.set(a, im); }
      im.setTexture(f[0], f[1]);
      const [x, y] = this.rot(a.x, a.y); const [tx, ty] = this.rot(a.target.x, a.target.y);
      im.setPosition(x, y - 20 * this.k).setRotation(Math.atan2(ty - y, tx - x) + Math.PI / 2).setDepth(y + 400);
    }
    for (const [a, im] of this.arrowViews) if (!a.alive) { im.destroy(); this.arrowViews.delete(a); }
    // 효과
    for (const f of this.fxs) {
      const an = A[f.set]; if (!an) { f.dead = true; continue; }
      const seq = an.actions[0], n = seq.length;
      const fi = f.t < n ? f.t : n - 1, alpha = f.t < n ? 1 : 1 - (f.t - n) * 0.1;
      if (alpha <= 0) { f.dead = true; this.clearParts(f); continue; }
      const [x, y] = this.rot(f.x, f.y);
      this.drawAnim(f, f.set, 0, fi, x, y + (f.kind === 14 ? 0 : -25) * this.k, 1, alpha, y + 500);
    }
    this.fxs = this.fxs.filter(f => !f.dead);
    // 물건 체력 (노린 물건만 · 원작) · 노리기 표시 (원작 etc_target)
    for (const [o, v] of this.views) if (o.role && v.bar) {
      const on = s.focus === o && o.maxHp > 0 && o.alive; const hb = this.frame('ui_upper_hpbar');
      if (on && hb) { if (v.bar.texture.key !== hb[0]) v.bar.setTexture(hb[0], hb[1]).setOrigin(0).setDepth(3600); const [x, y] = this.rot(o.x, o.y), dy = o.size === 0 ? -22 : -67, w = Math.max(2, Math.floor(o.hp * 30 / o.maxHp)); v.bar.setVisible(true).setCrop(0, 0, v.bar.frame.width * w / 30, v.bar.frame.height).setScale(this.sp).setPosition(x - 15 * this.k, y + dy * this.k); }
      else v.bar.setVisible(false);
    }
    this.renderTarget();
    this.renderGates();
    this.renderLife();
    this.updateHud(); this.updateCards();
    if (this.menu) this.drawPanel();
    this.renderMonsterView();
    this.renderBlink();
    if (this.cutin) this.renderCutin();
    if ((this.coachTick = (this.coachTick || 0) + 1) % 30 === 0) this.coachCheck();
  }
  renderTarget() {
    const s = this.sim, f = this.frame('etc_target');
    if (!f) return;
    if (!this.markImg) this.markImg = this.add.image(0, 0, f[0], f[1]).setDepth(3500);
    if (s.focus && s.focus.alive) { const { x, y } = this.focusCenter(s.focus); this.markImg.setVisible(true).setPosition(x, y).setScale(this.sp * (1 + Math.sin((this.paused ? this.time.now / 50 : s.time) * 0.3) * 0.05)); }
    else this.markImg.setVisible(false);
  }
  // 성문 불꽃 (원작: 우리 성문은 늘 타오르고, 출발 성문은 몬스터가 나올 때 눈이 번쩍) — 가로(원작 방향)에서만
  renderGates() {
    if (!this.land) return;
    const s = this.sim;
    this.fires.forEach(f => f.setVisible(false)); let k = 0;
    const put = (n, x, y) => { const fr = this.frame(n); if (!fr) return; let im = this.fires[k]; if (!im) { im = this.add.image(0, 0, fr[0], fr[1]).setOrigin(0); this.fires[k] = im; } k++; im.setTexture(fr[0], fr[1]).setVisible(true).setScale(this.sp).setPosition(x, y).setDepth(y + 200); };
    for (const [o, v] of this.views) {
      if (!o.role || !v.img || !o.alive) continue;
      const f4 = v.ax / this.k, f5 = v.ay / this.k, K = this.k, P = (n, dx, dy) => put(n, (f4 + dx) * K, (f5 + dy) * K);
      if (o.type === 30) { const i = (s.time >> 0) % 4, dy = [-40, -42, -40, -39][i], dx = [[-51, 30], [-52, 29], [-53, 28], [-52, 29]][i]; P(`gatefire_fire${i + 1}`, dx[0], dy); P(`gatefire_fire${i + 1}`, dx[1], dy); }
      if (s.openTime > 0) {
        const j = (s.openTime >> 1) % 2;
        if (o.type === 28) P(`gatefire_eyesouth${j + 1}`, j ? -47 : -43, j ? -87 : -83);
        if (o.type === 29) P(`gatefire_eyewest${j + 1}`, j ? -40 : -35, j ? -103 : -98);
        if (o.type === 32) P(`gatefire_eyeeast${j + 1}`, j ? 2 : 7, j ? -103 : -98);
      }
    }
  }
  // 목숨 (원작 drawMyLife: 우리 성문 옆 ♥ 20/20)
  renderLife() {
    const s = this.sim, goal = s.objects.find(o => o.role === 'goal'); if (!goal) return;
    if (!this.lifeV) {
      const c = this.add.container(0, 0).setDepth(7400);
      const T = T0(0, 0, this.k);
      const heart = img(this, T, 'ui_upper_heart', -37, 0); const sl = img(this, T, 'ui_upper_slash', 0, -1, 17);
      const cur = num(this, T, 'num_life', -2, 0, -1, 20, 2), mx = num(this, T, 'num_life', 2, 0, -1, 18, 2);
      c.add([heart, sl, cur.c, mx.c]);
      this.lifeV = { c, cur, mx };
    }
    // 원작 위치: 끝 칸 방향에 따라 · 세로 화면은 성문 그림 위
    const e = s.ends[0], v = this.views.get(goal);
    let x, y;
    if (this.land) {
      const typ = goal.serial; // 원작 mapEndDirection: 203 = 동쪽 성문 · 208 = 서쪽 · 그 밖 = 남쪽
      x = this.bx + (e[0] * 45 + (typ === 203 ? 45 : 22)) * this.k;
      y = this.by + (e[1] * 45 - (typ === 203 || typ === 208 ? 22 : 0)) * this.k;
    } else { x = v ? v.ax : this.bx; y = v ? v.ay - (v.img?.displayHeight || 60) - 12 : this.by; }
    this.lifeV.c.setPosition(x, y);
    this.lifeV.cur.set(s.life); this.lifeV.mx.set(s.maxLife);
  }
  // 화면 번쩍 (원작 specialBlinkCount · monsterGoalBlinkCount: 흰빛)
  renderBlink() {
    if (!this.blinkR) this.blinkR = this.add.rectangle(0, 0, 10, 10, 0xFFFFFF, 0).setOrigin(0).setDepth(9450);
    const b = this.blink, g = this.goalBlink || 0;
    let a = 0;
    if (b > 0) a = (b >= 5 ? 10 - b : b) * 0.2 * 0.5;
    if (g > 0) a = Math.max(a, (g < 3 ? g : 6 - g) * 0.33 * 0.5);
    if (this.goalBlink > 0 && this.uiTick !== this.lastGoalTick) { this.lastGoalTick = this.uiTick; this.goalBlink--; }
    this.blinkR.setPosition(this.land ? this.ox : 0, this.land ? this.oy : this.by).setSize(this.land ? 800 * US : this.scale.width, this.land ? 480 * US : this.bh).setFillStyle(0xFFFFFF, a);
  }
  // 노리기 표시 중심 = 지금 그려진 그림(물건 이미지 · 몬스터 조각들)의 테두리 중심 (v0.2.1 대표 피드백)
  focusCenter(f) {
    const v = this.views.get(f); let b = null;
    const acc = im => { if (!im || !im.visible || im.alpha <= 0) return; const r = im.getBounds(); b = b ? Phaser.Geom.Rectangle.Union(b, r) : r; };
    if (v) { acc(v.img); for (const p of v.parts || []) acc(p); }
    if (!b || b.width < 2) { const [x, y] = this.rot(f.x, f.y); return { x, y: y - 18 * this.k, r: 34 }; }
    const r = Math.max(34, Math.min(b.width, b.height) / 2 + 6);
    return { x: Phaser.Math.Clamp(b.centerX, this.bx + r, this.bx + this.bw - r), y: Phaser.Math.Clamp(b.centerY, this.by + r, this.trayTop - r), r };
  }
  addFx(kind, x, y) { const set = FX_SET[kind] ?? 500; this.fxs.push({ kind, set, x, y, t: 0, parts: [] }); }
  popText(x, y, s, color, size = 34) {
    const t = text(this, x, y, s, size, color).setDepth(8000).setScale(0.6);
    this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.out' });
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 900, delay: 250, ease: 'Quad.in', onComplete: () => t.destroy() });
  }
  // 목숨 잃음: 원작은 화면이 하얗게 번쩍(monsterGoalBlinkCount 6) + 소리
  leakFx() { audio.id(S.LEAK, { volume: 0.7 }); audio.buzz(60); this.goalBlink = 6; }

  // ---------- 필살기 연출 (원작 paint_GAME_PLAYING flag 8 · 9 · 10 그대로) ----------
  //   0~60틱: 위아래(화살비 · 얼음은 양옆) 띠 + 속도선 + 영웅 전신이 미끄러져 들어왔다 나감
  //   그 뒤: 칼춤 = 칼날 60개가 판을 가로질러 날아감 · 화살비 = 화살 75개가 판에 꽂힘 · 얼음 지진 = 얼음 조각 60개가 모였다 터짐
  //   끝(150 · 195 · 170틱)에 한꺼번에 피해 + 화면 번쩍. 연출 중 화면을 누르면 건너뜀 (원작 specialAttackSkipFlag)
  startCutin(h) {
    audio.id(S.SPECIAL, { volume: 0.8 });
    const g = h.group, kind = ['sword', 'arrow', 'ice'][g], SW = this.scale.width;
    const T = this.land ? this.TL : T0(0, this.by + this.bh / 2 - 240 * (SW / 800), SW / 800);
    const c = this.add.container(0, 0).setDepth(9500), fx = this.add.container(0, 0).setDepth(9400);
    // 세로 화면: 칼날 · 화살 · 얼음은 판 안에서만 (돌린 판 밖 카드 줄을 가리지 않게)
    if (!this.land) { const mk = this.make.graphics({}).fillStyle(0xffffff).fillRect(this.bx, this.by, this.bw, this.bh); fx.setMask(mk.createGeometryMask()); fx.mk = mk; }
    const k = { c, fx, T, g, kind, h, t: 0, end: [150, 195, 170][g], lines: [], items: [] };
    const big = (key, sc) => { if (!this.textures.exists(key)) return null; const im = this.add.image(0, 0, key).setOrigin(0).setScale(T.s / sc); c.add(im); return im; };
    if (g === 0) { k.bands = [img(this, T, 'special_sword_background', 0, 0, 18), img(this, T, 'special_sword_background', 0, 480, 34).setFlipY(true)]; k.body = big('hero_cut_sword', 1.6); }
    if (g === 1) { k.bands = [big('band_arrow', 1), big('band_arrow', 1)]; if (k.bands[0]) { k.bands[0].setOrigin(1, 0).setPosition(T.x(800), T.y(0)); k.bands[1].setOrigin(0, 1).setPosition(T.x(0), T.y(480)).setFlipX(true); } k.body = big('hero_cut_arrow', 1.6); k.body2 = big('hero_cut_arrow2', 1.6); }
    if (g === 2) { k.bands = [big('band_ice', 1), big('band_ice', 1)]; if (k.bands[0]) { k.bands[0].setOrigin(1, 0).setPosition(T.x(800), T.y(0)); k.bands[1].setOrigin(0, 0).setPosition(T.x(0), T.y(0)).setFlipX(true); } k.body = big('hero_cut_ice', 1.6); }
    k.bands = (k.bands || []).filter(Boolean); k.bands.forEach(b => { if (!c.list.includes(b)) c.add(b); b.setAlpha(0); });
    if (k.body) k.body.setVisible(false); if (k.body2) k.body2.setVisible(false);
    for (let i = 0; i < 30; i++) { const im = img(this, T, `special_${kind}_${['lineb', 'linem', 'lines'][i % 3]}`, 0, 0, 9); im.setAlpha(0); c.add(im); k.lines.push(im); }
    // 판 위에 떨어지는 것들 (원작 addSpecialArrowUnit 수 · 출발 틱)
    const R = n => Math.floor(Math.random() * n);
    if (g === 0) for (let i = 0; i < 60; i++) { const ty = R(4); k.items.push({ type: ty, x: 675, y: R(450), at: i + 65, sp: [100, 75, 55, 35][ty] }); }
    if (g === 1) for (let i = 0; i < 75; i++) k.items.push({ type: R(3), x: R(675), y: R(450), at: i + 60 });
    if (g === 2) for (let i = 0; i < 60; i++) { const a = Math.random() * Math.PI * 2; k.items.push({ type: R(14), x: 170 + R(337), y: 110 + R(225), at: i + 65, a }); }
    k.winds = g === 0 ? [...Array(20)].map((_, i) => ({ type: i % 3, x: R(800), y: R(480), v: [100, 160, 200][i % 3] })) : [];
    this.cutin = k;
  }
  // 원작 좌표 그대로인 판 위 점 → 화면 (원작 위치 단위 = px)
  bpt(x, y) { return this.rot(x * 50, y * 50); }
  renderCutin() {
    const k = this.cutin, t = k.t, T = k.T, g = k.g, c = k.c;
    if (this.sim.special && this.sim.special.t > t) k.t = this.sim.special.t;
    const a = t < 50 ? Math.min(1, t * 0.1) : Math.max(0, 1 - (t - 50) * 0.1);
    for (const b of k.bands) b.setAlpha(t < 60 ? a : 0);
    for (const l of k.lines) { if (t < 60 && a > 0) l.setPosition(T.x(Math.random() * 800), T.y(Math.random() * 480)).setAlpha(a); else l.setAlpha(0); }
    // 영웅 전신 (10~50틱)
    const on = t >= 10 && t < 50;
    if (k.body) k.body.setVisible(on);
    if (k.body2) k.body2.setVisible(on);
    if (on && k.body) {
      if (g === 0) { const x = t < 15 ? 100 - (15 - t) * 100 : t >= 45 ? (t - 45) * 100 + 100 : 100; k.body.setOrigin(0, 1).setPosition(T.x(x), T.y(480)); }
      if (g === 1) { const x = t < 15 ? 200 - (15 - t) * 100 : t >= 45 ? 200 + (t - 45) * 100 : 200, y = t < 15 ? 10 - (15 - t) * 100 : t >= 45 ? 10 + (t - 45) * 100 : 10; k.body.setPosition(T.x(x), T.y(y)); k.body2?.setPosition(T.x(x + 403), T.y(y + 558)); }
      if (g === 2) { const y = t < 15 ? 40 - (15 - t) * 200 : t >= 45 ? (t - 45) * 200 + 40 : 40; k.body.setPosition(T.x(0), T.y(y)); }
    }
    if (t === 65 && g === 0) audio.id(16, { volume: 0.7 });
    if (t === 60 && g > 0) audio.id(g === 1 ? 17 : 18, { volume: 0.7 });
    // 판 위 연출
    const pool = k.pool || (k.pool = []); let n = 0;
    const put = (name, x, y, ox = 0.5, oy = 0.5, sc = 1, alpha = 1, rotP = false) => {
      const f = this.frame(name); if (!f) return;
      let im = pool[n]; if (!im) { im = this.add.image(0, 0, f[0], f[1]); k.fx.add(im); pool[n] = im; } n++;
      im.setTexture(f[0], f[1]).setVisible(true).setOrigin(ox, oy).setScale(this.sp * sc).setAlpha(alpha).setPosition(x, y).setAngle(rotP && !this.land ? 90 : 0);
    };
    if (g === 0 && t >= 60) {
      for (const w of k.winds) { w.x += w.v * 0.35; if (w.x >= 800) { w.x -= 800 + 480; w.y = Math.random() * 480; } const p = this.land ? [T.x(w.x), T.y(w.y)] : this.bpt(w.x - 62, w.y - 30); put(`special_sword_wind${w.type}`, p[0], p[1], 0.5, 0.5, 1, 0.8, true); }
      for (const b of k.items) { const x = b.x - (t - b.at) * b.sp; if (x < -300 || x > 1000) continue; const [sx, sy] = this.bpt(x, b.y); put(`special_sword_blade${b.type}`, sx, sy - 15 * this.k, 0.5, 0.5, 1, 1, true); }
    }
    if (g === 1 && t >= 60) {
      for (const r of k.items) {
        const mc = t - r.at, [sx, sy] = this.bpt(r.x, r.y), side = ['left', 'center', 'right'][r.type];
        if (mc < -12) continue;
        if (mc < 0) put(`special_arrow_arrow_${side}1`, sx, sy + mc * 22 * this.k, 0.5, 1);
        else {
          if (mc === 0) this.addFx(33, r.x * 50, r.y * 50);
          if (t >= 135 && t < 165) put(`special_arrow_arrow_${side}${((t - 135) / 5 | 0) % 2 ? 4 : 3}`, sx, sy, 0.5, 1);
          else { put('special_arrow_land', sx, sy, 0.5, 1); put(`special_arrow_arrow_${side}2`, sx, sy, 0.5, 1); }
        }
      }
      if (t >= 165) { const f6 = Math.min(1, (t - 165) * 0.025 + 0.5); if (!k.unit) { k.unit = img(this, T, 'special_arrow_unit', 400, 240, 9); c.add(k.unit); } k.unit.setAlpha(f6).setScale(T.s * f6 / SCALE); }
    }
    if (g === 2 && t >= 60) {
      for (const r of k.items) {
        let mc = t - r.at; if (t >= 135) mc = Math.min(mc, 135 - r.at) - (t - 135);   // 135틱부터 거꾸로 흩어짐 (setReverseSpecialIce)
        if (mc < -10) continue;
        const [sx, sy] = this.bpt(r.x, r.y), sc = mc >= 0 ? 1 : 1 - mc * 0.5, al = mc >= 0 ? 1 : mc * -0.05 + 0.5;
        put(`special_ice_${r.type + 1}`, sx, sy, 0.5, 0.5, sc, al);
      }
      if (t >= 135 && t < 150) { const f7 = Math.min(1, (t - 135) * 0.1 + 0.3); if (!k.unit) { k.unit = img(this, T, 'special_ice_unit', 400, 240, 9); c.add(k.unit); } k.unit.setVisible(true).setScale(T.s * f7 / SCALE); }
      else if (k.unit) k.unit.setVisible(false);
      if (t >= 150) { const f8 = Math.min(1, 2 - (t - 150) * 0.1); if (!k.white) { k.white = this.add.rectangle(this.land ? this.ox : 0, this.land ? this.oy : this.by, this.land ? 800 * US : this.scale.width, this.land ? 480 * US : this.bh, 0xFFFFFF, 1).setOrigin(0); c.add(k.white); } k.white.setAlpha(Math.max(0, f8)); }
    }
    for (let i = n; i < pool.length; i++) pool[i].setVisible(false);
    if (t >= k.end || !this.sim.special) { k.c.destroy(); k.fx.destroy(); k.fx.mk?.destroy(); this.cutin = null; }
  }

  // ---------- 안내 (첫 판) ----------
  showHint() {
    if (this.hintStep >= 9 || this.ended) return;
    const s = this.sim;
    let best = null, bs = -1;
    for (let i = 0; i < 15; i++) for (let j = 0; j < 10; j++) if (s.canPlace(i, j)) { let r = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (s.tiles[i + a]?.[j + b] >= 0) r++; if (r > bs) { bs = r; best = [i, j]; } }
    if (!best) return;
    const c = this.cards[0], [tx, ty] = this.tileCenter(best[0], best[1]);
    const g = this.add.container(0, 0).setDepth(9800);
    const ring = this.add.graphics(); ring.lineStyle(6, 0xFFC94A, 1).strokeRoundedRect(tx - 24 * this.k, ty - 24 * this.k, 48 * this.k, 48 * this.k, 12); g.add(ring);
    this.tweens.add({ targets: ring, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    const hand = this.add.circle(c.x + c.w / 2, c.y + c.h / 2, 30, 0xFFFFFF, 0.9).setStrokeStyle(6, 0xFFC94A); g.add(hand);
    this.tweens.add({ targets: hand, x: tx, y: ty, duration: 1100, ease: 'Sine.inOut', repeat: -1, repeatDelay: 400, hold: 300 });
    const bw = this.land ? 900 : this.scale.width - 180, bxx = this.land ? this.bx + this.bw / 2 - 450 : 90, byy = this.land ? this.by + this.bh - 150 : this.trayTop - 190;
    g.add(panel(this, bxx, byy, bw, 120, { r: 30, fill: 0x2A2010, line: 0xFFC94A }));
    g.add(text(this, bxx + bw / 2, byy + 60, 'Warrior 카드를 끌어 길 옆 칸에 세우세요', 40, C.ink));
    this.hint = g;
  }
  hideHint() { if (this.hint) { this.hint.destroy(); this.hint = null; } }
  coachCheck() {
    const s = this.sim, d = load(); if (this.hint || this.coachOn || this.ended || this.cutin || this.menu) return;
    const tip = (key, msg, rect) => { if (d.tips[key]) return false; d.tips[key] = 1; save(); this.coach(msg, rect); return true; };
    const units = s.towers.filter(t => !t.hero);
    if (units.length && s.money >= 200 && s.wave >= 1) { const t = units[0], [x, y] = this.rot(t.ox, t.oy); if (tip('upgrade', '병사를 누르면 레벨 업 · 전직할 수 있어요', [x - 60, y - 110, 120, 140])) return; }
    const hb = this.heroBtn; if (this.heroCards.some(h => this.heroAvail(h.g))) { if (tip('hero', '마나가 모였어요 · 영웅 단추를 눌러 영웅을 세우세요', [hb.x, hb.y, hb.w, hb.h])) return; }
    const h = s.heroes()[0]; if (h && s.canSpecial()) { const [x, y] = this.rot(h.ox, h.oy); if (tip('special', '필살기 준비 완료! 영웅을 눌러 쓰세요', [x - 60, y - 110, 120, 140])) return; }
    if (this.stageNo >= 1 && s.state === 'play') { const o = s.objects.find(o => o.alive && o.destroyable && o.role === 'obj'); if (o) { const [x, y] = this.rot(o.x, o.y); if (tip('object', '상자 · 금고 · 수정을 누르면 병사들이 부숴서 보상을 줘요', [x - 60, y - 90, 120, 120])) return; } }
    if (s.canCallEarly() && this.stageNo >= 1) { const r = this.land ? [this.btnT.x(0), this.btnT.y(290), 43 * this.btnT.s, 44 * this.btnT.s] : [this.earlyBtn.x - 150, this.earlyBtn.y - 42, 300, 84]; tip('early', '당기기: 다음 웨이브를 앞당기면 골드 보너스', r); }
  }
  coach(msg, [x, y, w, h]) {
    this.coachOn = true;
    const SW = this.scale.width, c = this.add.container(0, 0).setDepth(9700);
    const ring = this.add.graphics(); ring.lineStyle(7, 0xFFC94A, 1).strokeRoundedRect(x - 6, y - 6, w + 12, h + 12, 20); c.add(ring);
    this.tweens.add({ targets: ring, alpha: 0.25, duration: 450, yoyo: true, repeat: 7 });
    const pw = Math.min(SW - 120, 1000), px = SW / 2 - pw / 2;
    const by = y > this.by + this.bh / 2 ? Math.max(this.by + 20, y - 150) : Math.min(this.by + this.bh - 140, y + h + 30);
    c.add(panel(this, px, by, pw, 110, { r: 30, fill: 0x2A2010, line: 0xFFC94A }));
    c.add(text(this, SW / 2, by + 55, msg, 36, C.ink));
    c.setAlpha(0); this.tweens.add({ targets: c, alpha: 1, duration: 200 });
    this.time.delayedCall(4200, () => this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => { c.destroy(); this.coachOn = false; } }));
  }

  // ---------- 일시정지 · 결과 ----------
  // 뒤로가기: 이어하기 창 → 확인 창 → 병사 메뉴 → 메뉴 창 → (정지 중이면) 메뉴 열기 → 전략 정지
  onBack() {
    if (this.offer) { this.offerClose ? this.offerClose() : this.offer.destroy(); this.offer = null; this.showResult(false); return true; }
    if (this.ended) return false;
    if (this.menuUI) { this.closeMenuUI(); return true; }
    if (this.confirm) { this.closeConfirm(); return true; }
    if (this.menu) { this.closeMenu(); return true; }
    if (this.paused) { this.openMenuUI(); return true; }
    this.pause(); return true;
  }
  // 전략 정지 (대표 2026-10-30 · 원작 myWaveRunFlag 와 같음): 시간만 멈추고 판은 그대로 보인다.
  pause(opt = {}) {
    if (this.paused || this.ended) return;
    this.paused = true;
    if (opt.auto) this.cancelDrag();
    if (!opt.quiet) audio.id(S.TAP, { volume: 0.3 });
    const c = this.add.container(0, 0).setDepth(5500);
    const g = this.add.graphics();
    for (let i = 0; i < 6; i++) { g.lineStyle(10, 0xFFC94A, 0.045 * (6 - i)); g.strokeRect(this.bx + 5 + i * 10, this.by + 5 + i * 10, this.bw - 10 - i * 20, this.bh - 10 - i * 20); }
    g.lineStyle(6, 0xFFC94A, 0.85).strokeRect(this.bx + 3, this.by + 3, this.bw - 6, this.bh - 6);
    c.add(g);
    const cx = this.bx + this.bw / 2, band = this.add.graphics();
    band.fillStyle(0x0C0F16, 0.82).fillRoundedRect(cx - 400, this.by + 14, 800, 64, 32);
    band.lineStyle(3, 0xFFC94A, 0.9).strokeRoundedRect(cx - 400, this.by + 14, 800, 64, 32);
    band.fillStyle(0xFFC94A, 1).fillRoundedRect(cx - 362, this.by + 30, 10, 32, 3).fillRoundedRect(cx - 346, this.by + 30, 10, 32, 3);
    c.add(band);
    c.add(text(this, cx + 14, this.by + 46, '일시정지 · 판을 보며 작전을 짜세요', 34, C.gold));
    c.setAlpha(0); this.tweens.add({ targets: c, alpha: 1, duration: 180 });
    this.pauseGlow = this.tweens.add({ targets: g, alpha: { from: 1, to: 0.55 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.pauseUI = c;
    this.syncButtons();
    if (!opt.quiet) track('pause', { auto: !!opt.auto, wave: this.sim.wave });
  }
  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.pauseGlow?.stop(); this.pauseGlow = null;
    this.pauseUI?.destroy(); this.pauseUI = null;
    this.syncButtons();
    if (this.pendingSpecial) { const h = this.pendingSpecial; this.pendingSpecial = null; this.startCutin(h); }
  }
  togglePause() { if (this.menuUI) return; if (this.paused) this.resume(); else this.pause(); }
  // 화면 가운데 창 (세로 1080×1920 기준으로 만들고 화면에 맞게 줄임) — 결과 · 이어하기 · ☰ 메뉴
  vbox(depth, dimA = 0.62) {
    const SW = this.scale.width, SH = this.scale.height, sc = Math.min(1, SW / 1080, SH / 1300);
    const c = this.add.container(SW / 2 - 540 * sc, SH / 2 - 960 * sc).setScale(sc).setDepth(depth);
    c.add(this.add.rectangle(540, 960, SW / sc + 4, SH / sc + 4, 0x000000, dimA).setInteractive());
    return c;
  }
  // 원작 톱니 = 게임 메뉴 창 (paint_GAME_INGAME_MENU): 'PAUSED' 띠 + 계속하기 · 다시 시작 · 스테이지 선택 (원작 그림 · 한국어 글씨)
  //   원어데이 규칙으로 배경음 · 효과음 켜고 끄기를 아래에 더함 (원작은 따로 설정 화면)
  popT() { const SW = this.scale.width, SH = this.scale.height; if (this.land) return this.TL; const s = Math.min(1.6, SW / 700); return T0(SW / 2 - 400 * s, SH / 2 - 240 * s, s); }
  openMenuUI() {
    if (this.menuUI || this.ended) return;
    this.menuWasRunning = !this.paused;
    this.pause({ auto: true });
    this.closeConfirm(); this.closeMenu(true); this.showHeroRow(false);
    const SW = this.scale.width, SH = this.scale.height, T = this.popT();
    const c = this.add.container(0, 0).setDepth(9900);
    c.add(this.add.rectangle(SW / 2, SH / 2, SW, SH, 0x000000, 0.5).setInteractive());
    c.add(img(this, T, 'ui_ingame_paused', 400, 6, 17));
    c.add(label(this, T, '일시정지', 400, 40, 26, '#FFFFFF', 9, { stroke: '#1A1040', st: 5 }));
    const d = load();
    const obtn = (y, key, txt, fn) => {
      const im = img(this, T, `ui_ingame_${key}off`, 400, y, 17); c.add(im);
      c.add(label(this, T, txt, 400, y + 29, 22, '#FFFFFF', 9, { stroke: '#0A1A3A', st: 5 }));
      const z = this.add.zone(T.x(300), T.y(y), 201 * T.s, 61 * T.s).setOrigin(0).setInteractive({ useHandCursor: true }); c.add(z);
      const sw = on => { const f = this.frame(`ui_ingame_${key}${on ? 'on' : 'off'}`); if (f) im.setTexture(f[0], f[1]); };
      z.on('pointerdown', () => sw(true)); z.on('pointerout', () => sw(false)); z.on('pointerup', () => { sw(false); audio.id(14, { volume: 0.5 }); fn(); });
    };
    obtn(136, 'resume', '계속하기', () => this.closeMenuUI());
    obtn(236, 'restart', '다시 시작', () => { this.closeMenuUI(true); this.paused = false; this.scene.restart({ stage: this.stageNo, mode: this.mode }); });
    obtn(336, 'stage', '스테이지 선택', () => { this.closeMenuUI(true); this.paused = false; this.scene.start('Home'); });
    const tog = (x, txt, fn) => { const t = label(this, T, txt, x, 425, 15, '#E8E4D8', 9, { stroke: '#000000', st: 4 }); c.add(t); const z = this.add.zone(t.x, t.y, Math.max(t.width, 120) + 30, t.height + 24).setInteractive({ useHandCursor: true }); c.add(z); z.on('pointerup', () => fn(t)); return t; };
    this.menuBtns = [null,
      { label: tog(330, `배경음 ${d.music ? '켬' : '끔'}`, t => { const on = audio.toggleMusic(); t.setText(`배경음 ${on ? '켬' : '끔'}`); if (on) audio.music('bgm_3', this); }) },
      { label: tog(470, `효과음 ${d.sfx ? '켬' : '끔'}`, t => { const on = audio.toggleSfx(); t.setText(`효과음 ${on ? '켬' : '끔'}`); }) }];
    this.menuUI = c; this.syncButtons(); this.pauseUI?.setVisible(false);
    this.menuUIBack = pushBack(() => { this.closeMenuUI(); return true; });
  }
  closeMenuUI(keepPaused = false) {
    if (!this.menuUI) return;
    this.menuUI.destroy(); this.menuUI = null; this.pauseUI?.setVisible(true);
    if (this.menuUIBack) { this.menuUIBack(); this.menuUIBack = null; }
    this.syncButtons();
    if (this.menuWasRunning && !keepPaused) this.resume();
    if (this.needRelayout && !keepPaused) this.time.delayedCall(10, () => this.relayout());
  }
  // ---------- 이어하기 (아까운 순간에만 · docs/bm-policy.md 5장) ----------
  maybeContinue() {
    const s = this.sim, d = load();
    const best = this.mode === 1 ? (d.infBest[this.stageNo] || 0) : 0;
    const boss = s.pattern >= 2;
    const close = this.mode === 1 ? s.wave >= best - 2 && s.wave >= 10 : (s.progress() >= 0.6 || boss);
    const can = s.life <= 0 && this.contUsed < 2 && d.plays >= 3 && close && oadOn();
    if (!can) { this.showResult(false); return; }
    this.offerContinue();
  }
  offerContinue() {
    const s = this.sim, sku = this.contUsed === 0 ? 'cont1' : 'cont2', price = (bm.price && bm.price(sku)) || (this.contUsed === 0 ? 20 : 40);
    this.closeConfirm(); this.closeMenu(true);
    const c = this.vbox(9900), CX = 540, CY = 960; this.offer = c;
    c.add(panel(this, 100, CY - 430, 880, 860, { r: 44, line: 0xFFC94A }));
    c.add(text(this, CX, CY - 340, '아까워요!', 72, C.gold));
    const msg = this.mode === 1 ? `웨이브 ${s.wave + 1}까지 · 최고 기록 근처예요` : s.pattern >= 2 ? '보스만 넘기면 돼요' : `웨이브 ${s.wave + 1} / ${s.waveTotal} · 거의 다 왔어요`;
    c.add(text(this, CX, CY - 250, msg, 38, C.ink, { weight: '700' }));
    c.add(text(this, CX, CY - 190, '목숨 10을 채우고 이 웨이브부터 다시', 32, C.mute, { weight: '700' }));
    const cd = text(this, CX, CY - 90, '8', 96, C.ink); c.add(cd);
    let left = 8; const tm = this.time.addEvent({ delay: 1000, repeat: 7, callback: () => { if (!cd.active) return; left--; cd.setText(String(left)); if (left <= 0) { close(); this.showResult(false); } } });
    const close = () => { tm.remove(); c.destroy(); this.offer = null; this.offerClose = null; };
    this.offerClose = close;
    let y = CY + 40;
    if (!this.contAd && adReady()) {
      c.add(button(this, CX, y, 640, 130, '▷ 광고 보고 이어하기', async () => { tm.paused = true; const r = await bm.rewardedAd('revive'); if (r && r.ok) { this.contAd = true; close(); this.doContinue(); } else { tm.paused = false; } }, { size: 42, fill: 0x2B3A1E, edge: 0x9BD56A, color: '#DFF5C6' }));
      y += 150;
    }
    c.add(button(this, CX, y, 640, 130, `⚡ 이어하기 · 골드 ${price}`, async () => { tm.paused = true; const r = await bm.spend(sku); if (r && r.ok) { close(); this.doContinue(); } else { tm.paused = false; if (r && r.reason !== 'cancel') toast(this, r.reason === 'short' ? '골드가 조금 모자라요' : '지금은 쓸 수 없어요', this.scale.height / 2 + 330, C.life); } }, { size: 42, fill: 0x5A3B12, edge: C.accent, color: C.gold }));
    c.add(button(this, CX, CY + 340, 400, 100, '그만할게요', () => { close(); this.showResult(false); }, { size: 36 }));
    track('continue_offer', { stage: this.stageNo, mode: this.mode, n: this.contUsed + 1 });
  }
  doContinue() {
    const s = this.sim; this.contUsed++;
    for (const m of s.monsters) m.alive = false;
    s.monsters = []; s.arrows = []; s.life = 10; s.state = 'play'; s.waveDelay = 60;
    s.assisted = true; this.ended = false;
    this.cameras.main.flash(300, 255, 240, 200);
    toast(this, '다시 갑니다! 목숨 10', this.toastY(), C.gold);
    track('continue_take', { stage: this.stageNo, n: this.contUsed });
    if (this.needRelayout) this.time.delayedCall(10, () => this.relayout());
  }

  // ---------- 결과 · 보상 (원작 paint_GAME_STAGE_CLEAR · GAME_OVER) ----------
  //   판 위에 어둡게 → 'Stage Cleared!!'(한국어) → RESULT 판: 점수 · 목숨(Perfect!!) · 골드 · 마나 → 총점 → 얻은 명예 → 최고 점수가 차례로
  //   아래 단추: 스테이지 선택 · 강화 · 다음 스테이지 (실패면 다시 하기) — 원작 그림 · 한국어 글씨
  //   원어데이 BM: '광고 보고 명예 2배'(하루 3번)와 업적 · 작전 알림은 결과 판 안에 작게 더함
  showResult(win) {
    if (this.ended) return; this.ended = true; this.closeConfirm(); this.closeMenu(true); this.showHeroRow(false);
    const s = this.sim, d = load(), r = runSummary(s), day = dayKey();
    saveResume(null);
    const stars = win && this.mode !== 1 ? M.stars(s.life) : 0;
    const first = win && this.mode === 0 && !d.cleared[this.stageNo];
    const hero = M.heroismFor({ stage: this.stageNo, mode: this.mode, win, wave: s.wave, progress: s.progress(), stars, first });
    d.plays++; d.kills += s.kills; d.playSec += r.sec; d.objects += r.objects; d.heroism += hero;
    if (win && this.mode === 0) { d.cleared[this.stageNo] = 1; d.stars[this.stageNo] = Math.max(d.stars[this.stageNo] || 0, stars); }
    if (win && this.mode === 2) d.gateCleared[this.stageNo] = 1;
    let newBest = false;
    if (this.mode === 1 && s.wave > (d.infBest[this.stageNo] || 0)) { d.infBest[this.stageNo] = s.wave; newBest = true; }
    if (this.mode === 0) { if (win) d.help.fails = 0; else if (s.progress() >= 0.3) { if (d.help.stage !== this.stageNo) { d.help.stage = this.stageNo; d.help.fails = 0; } d.help.fails++; } }
    const sc = clearScore(s), hk = `${this.stageNo}_${this.mode}`;
    d.hi ||= {}; if (win || this.mode === 1) d.hi[hk] = Math.max(d.hi[hk] || 0, sc.total);
    const ms = M.claimMilestones(d);
    const aw = checkAwards(d, r);
    const missionDone = noteMissions(d, day, r);
    save();
    track('round_end', { stage: this.stageNo, mode: this.mode, win: win ? 1 : 0, wave: s.wave, sec: r.sec, cont: this.contUsed });
    audio.id(win ? S.CLEAR : S.OVER, { volume: 0.8 });
    const SW = this.scale.width, SH = this.scale.height, T = this.popT();
    const c = this.add.container(0, 0).setDepth(9900); this.result = c;
    const dim = this.add.rectangle(SW / 2, SH / 2, SW, SH, 0x000000, 0).setInteractive(); c.add(dim);
    this.tweens.add({ targets: dim, fillAlpha: 0.48, duration: 700 });
    // 1) 큰 글씨 (원작 ui_clear_clear / ui_clear_fail 그림 글씨 → 한국어)
    const big = label(this, T, win || newBest ? (this.mode === 2 ? '성문을 부쉈다!!' : this.mode === 1 ? '신기록!!' : '스테이지 클리어!!') : this.mode === 1 ? '여기까지!!' : '스테이지 실패!!', 400, 242, 62, win || newBest ? '#FFFFFF' : '#FF4A3A', 9, { stroke: win || newBest ? '#1A3AA8' : '#FFFFFF', st: 10, shadow: true });
    big.setScale(big.scaleX * 1.4).setAlpha(0); c.add(big);
    this.tweens.add({ targets: big, alpha: 1, scale: big.scaleX / 1.4, duration: 260, ease: 'Back.out' });
    const panelC = this.add.container(0, 0).setAlpha(0); c.add(panelC);
    let shown = false;
    const showPanel = () => {
      if (shown) return; shown = true;
      this.tweens.add({ targets: big, alpha: 0, duration: 200 });
      this.tweens.add({ targets: panelC, alpha: 1, duration: 300 });
      const step = (i, objs) => { objs.forEach(o => { o.setAlpha(0); panelC.add(o); }); this.tweens.add({ targets: objs, alpha: 1, duration: 350, delay: 250 + i * 330 }); };
      panelC.add(img(this, T, 'ui_clear_background', 400, 6, 17));
      panelC.add(label(this, T, '결과', 400, 30, 24, '#FFFFFF', 9, { stroke: '#10204A', st: 5 }));
      const L = (t, y) => label(this, T, t, 259, y, 18, '#FFFFFF', 18, { stroke: '#000000', st: 3 }), V = (t, y, col = '#FFFFFF') => label(this, T, t, 540, y, 18, col, 20, { stroke: '#000000', st: 3 });
      step(0, [L('점수', 108), V(String(sc.destroy), 108)]);
      const lifeRow = [L('목숨', 140), V(`${s.life}/${s.maxLife}`, 140)]; if (s.life === s.maxLife) lifeRow.push(img(this, T, 'ui_clear_perfect', 553, 131)); step(1, lifeRow);
      step(2, [L('골드', 172), V(String(s.money), 172)]);
      step(3, [L('마나', 206), V(String(s.mana), 206)]);
      const tot = num(this, T, 'num_total', 530, 257, 0, 20, 1); tot.set(sc.total);
      step(4, [label(this, T, '총점', 270, 255, 20, '#7FE7FF', 18, { stroke: '#062030', st: 4 }), tot.c]);
      const hn = num(this, T, 'num_clear', 513, 288, 0, 20, 1); hn.set(hero);
      step(5, [label(this, T, '얻은 명예', 287, 288, 16, '#FFC94A', 18, { stroke: '#2A1500', st: 4 }), hn.c]);
      step(6, [label(this, T, '최고 점수', 290, 326, 16, '#FFFFFF', 18, { stroke: '#000000', st: 3 }), label(this, T, String(d.hi[hk] || 0), 508, 326, 16, '#FFFFFF', 20, { stroke: '#000000', st: 3 })]);
      // 업적 · 작전 알림 (원어데이) — 한 줄
      const notes = [...ms.map(m => m.text), ...aw.slice(0, 2).map(i => `업적 「${AWARDS[i][0]}」 +${AWARDS[i][2] * 5}`), missionDone ? `오늘의 작전 ${missionDone}개 완료` : null, first ? '처음 클리어!' : null].filter(Boolean).slice(0, 2);
      if (notes.length) step(7, [label(this, T, notes.join('  ·  '), 400, 352, 12, '#BFE59A', 9, { stroke: '#000000', st: 3 })]);
      // 광고 보고 명예 2배 (하루 3번 · 소장자는 광고 없이)
      const ads = (d.ads.date === day ? d.ads : (d.ads = { date: day, x2: 0 }));
      if (hero > 0 && adReady() && ads.x2 < 3) {
        const at = label(this, T, `▷ 광고 보고 명예 2배 (${3 - ads.x2})`, 640, 288, 12, '#DFF5C6', 9, { stroke: '#1A2A10', st: 4 });
        const z = this.add.zone(at.x, at.y, at.width + 40, at.height + 30).setInteractive({ useHandCursor: true });
        step(5, [at]); panelC.add(z);
        z.on('pointerup', async () => { z.disableInteractive(); const rr = await bm.rewardedAd('reward2x'); if (rr && rr.ok) { ads.x2++; d.heroism += hero; save(); hn.set(hero * 2); at.setText('2배로 받았어요'); } else z.setInteractive(); });
      }
      // 아래 단추 (원작 y 382)
      const next = win && this.mode === 0 && this.stageNo < 49;
      const go = { stage: () => this.leave(() => this.scene.start('Home')), up: () => this.leave(() => this.scene.start('Home', { tab: 'up' })), next: () => this.leave(() => this.scene.start('Play', { stage: this.stageNo + 1, mode: 0 })), retry: () => this.leave(() => this.scene.restart({ stage: this.stageNo, mode: this.mode })) };
      const btns = next ? [['stageselect', '스테이지\n선택', go.stage], ['upgrade', '강화', go.up], ['nextstage', '다음\n스테이지', go.next]] : [['retry', '다시 하기', go.retry], ['upgrade', '강화', go.up], ['stageselect', '스테이지\n선택', go.stage]];
      this.resultBtns = btns.map(([key, txt, fn], i) => {
        const x = [156, 338, 520][i], im = img(this, T, `ui_clear_${key}off`, x, 382), tl = label(this, T, txt, x + 62, 382 + 29, 15, '#FFFFFF', 9, { stroke: '#0A1A3A', st: 4, align: 'center' });
        const z = this.add.zone(T.x(x), T.y(382), 125 * T.s, 58 * T.s).setOrigin(0).setInteractive({ useHandCursor: true });
        const sw = on => { const f = this.frame(`ui_clear_${key}${on ? 'on' : 'off'}`); if (f) im.setTexture(f[0], f[1]); };
        z.on('pointerdown', () => sw(true)); z.on('pointerout', () => sw(false)); z.on('pointerup', () => { sw(false); audio.id(14, { volume: 0.5 }); fn(); });
        step(8, [im, tl]); panelC.add(z); return { key, z, fn };
      });
    };
    dim.on('pointerup', showPanel);
    this.time.delayedCall(1300, showPanel);
    this.resultShow = showPanel;
  }
  async leave(go) { try { if (oadOn()) await bm.interstitial('round_end'); } catch { /* 늘 넘어감 */ } go(); }
  stageBanner() {
    const nm = `${Math.floor(this.stageNo / 10) + 1}-${this.stageNo % 10 + 1}  ${STAGE_NAMES[Math.floor(this.stageNo / 10)][this.stageNo % 10]}`;
    const cx = this.bx + this.bw / 2, cy = this.by + this.bh * 0.45;
    const t = text(this, cx, cy, nm, 64, C.ink).setDepth(8300).setAlpha(0);
    const t2 = text(this, cx, cy + 70, M.MODES[this.mode] + (this.mode === 2 ? ' · 적 성문을 부숴라' : this.mode === 1 ? ' · 끝까지 버텨라' : ''), 36, C.gold).setDepth(8300).setAlpha(0);
    this.tweens.add({ targets: [t, t2], alpha: 1, duration: 300, yoyo: true, hold: 1100, onComplete: () => { t.destroy(); t2.destroy(); } });
  }
}
