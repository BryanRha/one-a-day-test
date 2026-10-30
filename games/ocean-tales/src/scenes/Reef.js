// 바다 복원: 모은 별로 오염된 바다를 하나씩 되살린다.
// 처음엔 탁한 물 + 기름띠 + 버려진 그물 + 회색 실루엣. 과제를 해결할수록 물이 맑아지고 산호·해초·친구들이 돌아온다.
import { W, H, TXT, WORLD_COUNT, LEVELS_PER_WORLD, asset, themeOf } from '../config.js?v=0.95.0';
import { t } from '../i18n.js?v=0.95.0';
import { audio } from '../audio.js?v=0.95.0';
import { load, save, availableStars, spendStars, addCoins, addBooster } from '../save.js?v=0.95.0';
import { RESTORE_TASKS, TASK_COINS, WORLD_COINS, restoreTheme, taskCost } from '../restore.js?v=0.95.0';
import { track, flush } from '../missions.js?v=0.95.0';
import { button, iconButton, toast, enableGlow, popup } from '../ui/widgets.js?v=0.95.0';
import { bm } from '../oad_bm.js?v=0.95.0';
import { goldify, bt, oadOn, decoOpen, decoOnPref, decoShown, setDeco, buyDeco, failMsg } from '../bmflow.js?v=0.95.0';

export class ReefScene extends Phaser.Scene {
  constructor() { super('Reef'); }

  // 열린 월드(지금 진행 중인 월드까지)만 복원할 수 있다
  maxWorld() { return Math.min(WORLD_COUNT, Math.ceil(Math.min(load().unlocked, WORLD_COUNT * LEVELS_PER_WORLD) / LEVELS_PER_WORLD)); }

  init(data = {}) {
    const d = load();
    const max = this.maxWorld();
    // 지정이 없으면 아직 덜 복원된 가장 앞 월드
    let w = data.world;
    if (!w) { w = 1; while (w < max && (d.restore[w] || 0) >= RESTORE_TASKS) w++; }
    this.world = Phaser.Math.Clamp(w, 1, max);
    this.toastMsg = data.toast || null;
  }

  preload() {
    const key = `bg_game_${themeOf(this.world)}`;
    for (const k of this.textures.getTextureKeys()) if (k.startsWith('bg_game_') && k !== key) this.textures.remove(k);
    if (!this.textures.exists(key)) this.load.image(key, asset(`assets/img/${key}.png`));
  }

  create() {
    enableGlow(this);
    const w = this.world;
    const d = load();
    const done = () => d.restore[w] || 0;
    const th = restoreTheme(w);
    const floorY = H - 540;

    const bg = this.add.image(W / 2, H / 2, `bg_game_${themeOf(w)}`);
    bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.bg = bg;
    // 탁한 물 (복원할수록 옅어짐)
    this.murk = this.add.rectangle(W / 2, H / 2, W, H, 0x4A4A30, 0.5 * (1 - done() / RESTORE_TASKS)).setDepth(5);

    // ── 장면 요소: 과제 i 에 해당하는 오염/생물
    this.parts = [];
    // 0 기름띠
    this.parts[0] = [[0.25, 0], [0.55, 30], [0.82, -10]].map(([x, dy]) => this.add.image(W * x, floorY + 40 + dy, 'obs_jelly_2').setScale(2.4).setAlpha(0.95).setDepth(6));
    // 1 버려진 그물
    this.parts[1] = [[0.3, -520, -12], [0.72, -380, 10]].map(([x, dy, a]) => this.add.image(W * x, floorY + dy, 'obs_chain').setScale(2.0).setAngle(a).setTint(0xB8B0A0).setDepth(6));
    // 2 산호 · 3 해초 · 4 보금자리 (복원 전엔 회색 실루엣으로 자리만 보임)
    this.parts[2] = [this.add.image(W * 0.2, floorY - 40, th.coral).setScale(1.25).setDepth(4)];
    this.parts[3] = [[0.82, 1.1], [0.66, 0.85]].map(([x, s]) => this.add.image(W * x, floorY - 60, 'map_deco_kelp').setScale(s).setDepth(4));
    this.parts[4] = [this.add.image(W * 0.48, floorY + 10, th.home).setScale(1.05).setDepth(4)];
    // 5 바다 친구들 (복원 후 헤엄침)
    this.parts[5] = th.friends.map((k, i) => this.add.image(W * (0.2 + i * 0.3), H * 0.32 + (i % 2) * 140, k).setScale(k.startsWith('map_') ? 0.7 : 1.0).setDepth(7));
    this.applyState(false);
    this.drawDecos(floorY);

    // ── 위쪽: 뒤로 · 월드 이름 · 별
    this.add.rectangle(W / 2, 0, W, 230, 0x0B4FA8, 0.55).setOrigin(0.5, 0).setDepth(20);
    iconButton(this, 90, 115, 'ico_back', () => this.leave(), { size: 120 }).setDepth(21);
    this.add.text(W / 2, 80, t('restoreTitle'), { ...TXT.mid, fontSize: '42px' }).setOrigin(0.5).setDepth(21);
    this.add.text(W / 2, 145, `${w}. ${t('worldName')[w - 1]}`, { ...TXT.small, fontSize: '32px' }).setOrigin(0.5).setDepth(21);
    this.add.image(W - 175, 115, 'star_small_on').setScale(1.2).setDepth(21);
    this.starText = this.add.text(W - 130, 115, `${availableStars()}`, TXT.mid).setOrigin(0, 0.5).setDepth(21);
    // 월드 넘기기
    const max = this.maxWorld();
    if (w > 1) iconButton(this, 70, H * 0.45, 'ico_back', () => this.scene.restart({ world: w - 1 }), { size: 100 }).setDepth(21);
    if (w < max) { const nb = iconButton(this, W - 70, H * 0.45, 'ico_back', () => this.scene.restart({ world: w + 1 }), { size: 100 }).setDepth(21); nb.icon.setFlipX(true); }

    // ── 아래쪽 유리 패널: 건강도 + 다음 과제
    this.add.nineslice(W / 2, H - 200, 'popup_panel', null, 1000, 360, 96, 96, 96, 96).setDepth(20);
    this.add.text(W / 2 - 420, H - 330, t('health'), { ...TXT.dark, fontSize: '32px' }).setOrigin(0, 0.5).setDepth(21);
    this.healthPct = this.add.text(W / 2 + 420, H - 330, '', { ...TXT.dark, fontSize: '32px' }).setOrigin(1, 0.5).setDepth(21);
    const BWd = 840;
    this.add.image(W / 2, H - 280, 'hud_score_bar_bg').setDisplaySize(BWd, 40).setDepth(21);
    this.bar = this.add.image(W / 2 - BWd / 2, H - 280, 'hud_score_bar_fill').setOrigin(0, 0.5).setDisplaySize(BWd, 40).setDepth(22);
    this.barW = this.bar.width;
    this.taskUI = this.add.container(0, 0).setDepth(22);
    this.refreshUI(false);
    // 원어데이: 꾸미기 (소장자 전용 '달빛 고래' · 🪙 '진주 등불') — 밖에서는 버튼 자체가 없음
    if (oadOn()) {
      const db = iconButton(this, W - 90, H - 470, 'ico_gift', () => this.decoPopup(), { size: 112 }).setDepth(21);
      this.add.text(db.x, db.y + 78, bt('decoBtn'), { ...TXT.small, fontSize: '28px' }).setOrigin(0.5).setDepth(21);
      this.decoBtn = db;
    }

    audio.music('bgm_map', this);
    this.cameras.main.fadeIn(250, 189, 235, 255);
    if (this.toastMsg) toast(this, this.toastMsg, H * 0.2);
  }

  // ═══ 원어데이 꾸미기 (겉모습만) ═══
  pearlTexture() {
    if (this.textures.exists('deco_pearl')) return;
    const g = this.make.graphics({ add: false }), R = 40;
    for (let i = R; i > 0; i--) { const k = i / R; g.fillStyle(Phaser.Display.Color.GetColor(255, Math.round(236 + 19 * (1 - k)), Math.round(242 + 13 * (1 - k))), 1); g.fillCircle(R, R, i); }
    g.fillStyle(0xF6C8DA, 0.55); g.fillCircle(R + 10, R + 12, R * 0.62);
    g.fillStyle(0xFFFFFF, 0.95); g.fillCircle(R - 13, R - 14, 9);
    g.fillStyle(0xFFFFFF, 0.6); g.fillCircle(R + 12, R - 18, 4);
    g.generateTexture('deco_pearl', R * 2, R * 2); g.destroy();
  }
  drawDecos(floorY) {
    // 진주 등불: 해초 줄에 매단 진주 다섯 개가 따뜻하게 빛나며 흔들림
    if (decoShown('pearl')) {
      this.pearlTexture();
      const g = this.add.graphics().setDepth(8);
      [[0.1, 330], [0.3, 430], [0.5, 360], [0.7, 450], [0.9, 340]].forEach(([fx, len], i) => {
        const x = W * fx, y = 230 + len;
        g.lineStyle(4, 0x2F8F6A, 0.85).lineBetween(x, 230, x, y - 38);
        for (let k = 0; k < 3; k++) g.fillStyle(0x3FB37F, 0.9).fillEllipse(x + (k % 2 ? 14 : -14), 290 + k * ((len - 80) / 3), 26, 12);
        const glow = this.add.image(x, y, 'ptc_glow').setDisplaySize(230, 230).setTint(0xFFD6A0).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD).setDepth(8);
        const pearl = this.add.image(x, y, 'deco_pearl').setScale(1.05).setDepth(9);
        this.tweens.add({ targets: [pearl, glow], x: x + 10, yoyo: true, repeat: -1, duration: 1800 + i * 230, ease: 'Sine.InOut' });
        this.tweens.add({ targets: glow, alpha: 0.3, yoyo: true, repeat: -1, duration: 1300 + i * 170, ease: 'Sine.InOut' });
      });
    }
    // 달빛 고래 (소장자 전용): 위쪽에서 은은한 달빛 줄기 + 빛나는 몽이가 천천히 헤엄침
    if (decoShown('moon')) {
      const rays = this.add.image(W * 0.75, 120, 'ptc_rays').setScale(2.6).setTint(0xCFE6FF).setAlpha(0.22).setDepth(6);
      this.tweens.add({ targets: rays, angle: 360, duration: 60000, repeat: -1 });
      const y = H * 0.24;
      const glow = this.add.image(W * 0.25, y, 'ptc_glow').setDisplaySize(520, 420).setTint(0xBFE0FF).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD).setDepth(7);
      const whale = this.add.image(W * 0.25, y, 'mascot_happy').setScale(0.3).setTint(0xDDEEFF).setDepth(7);
      this.tweens.add({ targets: [whale, glow], x: W * 0.72, yoyo: true, repeat: -1, duration: 9000, ease: 'Sine.InOut', onYoyo: () => whale.setFlipX(!whale.flipX), onRepeat: () => whale.setFlipX(!whale.flipX) });
      this.tweens.add({ targets: [whale, glow], y: y - 30, yoyo: true, repeat: -1, duration: 1700, ease: 'Sine.InOut' });
      this.time.addEvent({ delay: 380, loop: true, callback: () => {
        const sp = this.add.image(whale.x + Phaser.Math.Between(-90, 90), whale.y + Phaser.Math.Between(-60, 60), 'ptc_spark').setScale(0.3).setTint(0xE6F2FF).setDepth(7);
        this.tweens.add({ targets: sp, y: sp.y - 90, alpha: 0, duration: 1200, onComplete: () => sp.destroy() });
      } });
    }
  }
  decoPopup() {
    const p = popup(this, { title: bt('decoTitle'), width: 940, height: 880 });
    window.__decoPop = p;
    let busy = false;
    const card = (y, id, icon, name, desc) => {
      p.box.add(this.add.nineslice(0, y, 'hud_goal_box', null, 840, 300, 40, 40, 40, 40));
      const ic = icon(); ic.setPosition(-310, y); p.box.add(ic);
      p.box.add(this.add.text(-190, y - 80, name, { ...TXT.dark, fontSize: '42px', color: '#FFFFFF', stroke: '#0B3E8A', strokeThickness: 8 }).setOrigin(0, 0.5));
      p.box.add(this.add.text(-190, y - 10, desc, { ...TXT.body, fontSize: '26px', align: 'left', wordWrap: { width: 580, useAdvancedWrap: true } }).setOrigin(0, 0.5));
      const by = y + 85;
      if (decoOpen(id)) {
        const on = decoOnPref(id);
        p.box.add(button(this, 170, by, `${bt(on ? 'on' : 'off')}`, () => { setDeco(id, !on); p.close(true); this.scene.restart({ world: this.world }); }, { kind: on ? 'primary' : 'secondary', width: 260, height: 100, size: 36 }));
      } else if (id === 'moon') {
        p.box.add(this.add.image(-150, by, 'ico_lock').setScale(0.5));
        p.box.add(this.add.text(-110, by, bt('ownLocked'), { ...TXT.small, fontSize: '30px' }).setOrigin(0, 0.5));
      } else {
        const price = bm.price('deco');
        if (price) p.box.add(goldify(this, button(this, 170, by, `🪙${price}`, async () => {
          if (busy) return; busy = true;
          const r = await buyDeco(); busy = false;
          if (r.ok) { setDeco('pearl', true); audio.play('sfx_coin'); p.close(true); this.scene.restart({ world: this.world, toast: bt('bought') }); }
          else if (r.reason !== 'cancel') toast(this, failMsg(r));
        }, { width: 300, height: 100, size: 38 })));
      }
    };
    this.pearlTexture();
    card(-150, 'moon', () => { const c = this.add.container(0, 0); c.add(this.add.image(0, 0, 'ptc_glow').setDisplaySize(220, 220).setTint(0xBFE0FF).setAlpha(0.6)); c.add(this.add.image(0, 0, 'mascot_happy').setScale(0.13).setTint(0xDDEEFF)); return c; }, bt('moonName'), bt('moonDesc'));
    card(190, 'pearl', () => { const c = this.add.container(0, 0); c.add(this.add.image(0, 0, 'ptc_glow').setDisplaySize(200, 200).setTint(0xFFD6A0).setAlpha(0.6)); c.add(this.add.image(0, 0, 'deco_pearl').setScale(1.3)); return c; }, bt('pearlName'), bt('pearlDesc'));
  }

  // 완료한 과제 수에 맞춰 장면 상태를 맞춤 (animate: 방금 해결한 과제만 연출)
  applyState(animate, justDone = -1) {
    const n = load().restore[this.world] || 0;
    this.parts.forEach((objs, i) => {
      const fixed = i < n;
      objs.forEach((o, k) => {
        if (i <= 1) {   // 오염: 해결되면 사라짐
          if (fixed && animate && i === justDone) {
            this.time.delayedCall(k * 120, () => {
              audio.play(i === 0 ? 'sfx_jelly' : 'sfx_chain');
              this.bubbleBurst(o.x, o.y, 14);
              this.tweens.add({ targets: o, alpha: 0, scale: o.scale * 1.3, duration: 450, onComplete: () => o.setVisible(false) });
            });
          } else o.setVisible(!fixed);
        } else if (i <= 4) {   // 생물: 해결 전엔 회색 실루엣
          if (fixed) {
            o.clearTint().setAlpha(1);
            if (animate && i === justDone) {
              const s = o.scale; o.setScale(0);
              this.tweens.add({ targets: o, scale: s, delay: k * 150, duration: 500, ease: 'Back.Out', onStart: () => { audio.play('sfx_special_create'); this.sparkleRing(o.x, o.y - 60); } });
            }
            if (!o.swaying) { o.swaying = true; this.tweens.add({ targets: o, angle: { from: -3, to: 3 }, yoyo: true, repeat: -1, duration: 1600 + k * 300, ease: 'Sine.InOut' }); }
          } else o.setTint(0x6A6A6A).setAlpha(0.45);
        } else {   // 친구들: 해결되면 등장해서 헤엄침
          o.setVisible(fixed);
          if (fixed && !o.swimming) {
            o.swimming = true;
            const x0 = o.x;
            if (animate) { o.x = -150; this.tweens.add({ targets: o, x: x0, duration: 1200, delay: k * 200, ease: 'Cubic.Out' }); }
            this.tweens.add({ targets: o, y: o.y - 40, yoyo: true, repeat: -1, duration: 900 + k * 150, ease: 'Sine.InOut' });
            this.time.delayedCall(1400, () => this.tweens.add({ targets: o, x: x0 + 120, yoyo: true, repeat: -1, duration: 2600 + k * 400, ease: 'Sine.InOut', onYoyo: () => o.setFlipX(!o.flipX), onRepeat: () => o.setFlipX(!o.flipX) }));
          }
        }
      });
    });
    const a = 0.5 * (1 - n / RESTORE_TASKS);
    if (animate) this.tweens.add({ targets: this.murk, fillAlpha: a, duration: 800 }); else this.murk.setFillStyle(0x4A4A30, a);
    // 배경도 회갈색 → 본래 색으로 (오염된 바다가 살아나는 느낌)
    const tintAt = k => { const c = Phaser.Display.Color.Interpolate.ColorWithColor({ r: 0x86, g: 0x84, b: 0x70 }, { r: 255, g: 255, b: 255 }, 100, k * 100); return Phaser.Display.Color.GetColor(c.r, c.g, c.b); };
    const from = this.bgK ?? n / RESTORE_TASKS, to = n / RESTORE_TASKS;
    if (animate) this.tweens.addCounter({ from, to, duration: 900, onUpdate: tw => this.bg.setTint(tintAt(tw.getValue())) }); else this.bg.setTint(tintAt(to));
    this.bgK = to;
  }

  refreshUI(animate) {
    const w = this.world;
    const n = load().restore[w] || 0;
    const pct = Math.round((n / RESTORE_TASKS) * 100);
    this.healthPct.setText(`${pct}%`);
    if (animate) this.tweens.addCounter({ from: this.lastPct || 0, to: pct, duration: 600, onUpdate: tw => this.bar.setCrop(0, 0, this.barW * tw.getValue() / 100, this.bar.height) });
    else this.bar.setCrop(0, 0, this.barW * pct / 100, this.bar.height);
    this.lastPct = pct;
    this.starText.setText(`${availableStars()}`);
    this.taskUI.removeAll(true);
    const y = H - 150;
    if (n >= RESTORE_TASKS) {
      this.taskUI.add(this.add.text(W / 2, y, t('restoreAll'), { ...TXT.body, fontSize: '36px' }).setOrigin(0.5));
      return;
    }
    const cost = taskCost(w, n);
    const have = availableStars();
    this.taskUI.add(this.add.text(W / 2 - 420, y - 40, `${n + 1}/${RESTORE_TASKS}`, { ...TXT.dark, fontSize: '30px' }).setOrigin(0, 0.5));
    this.taskUI.add(this.add.text(W / 2 - 420, y + 15, t('restoreTasks')[n], { ...TXT.dark, fontSize: '44px' }).setOrigin(0, 0.5));
    if (have >= cost) {
      const b = button(this, W / 2 + 250, y, `★${cost}  ${t('restoreBtn')}`, () => this.restore(), { width: 360, height: 130, size: 40 });
      this.taskUI.add(b);
      this.tweens.add({ targets: b, scale: 1.05, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.InOut' });
    } else {
      this.taskUI.add(this.add.text(W / 2 + 250, y, t('needStars', cost - have), { ...TXT.body, fontSize: '28px', align: 'center' }).setOrigin(0.5));
    }
  }

  restore() {
    const w = this.world;
    const d = load();
    const n = d.restore[w] || 0;
    if (n >= RESTORE_TASKS || this.busy) return;
    const cost = taskCost(w, n);
    if (!spendStars(cost)) return;
    this.busy = true;
    d.restore[w] = n + 1; save();
    track('restore'); flush();
    addCoins(TASK_COINS);
    audio.play('sfx_booster');
    // 별이 위에서 날아가 장면에 내려앉음
    const target = this.parts[n][0];
    for (let i = 0; i < cost; i++) {
      const s = this.add.image(W - 175, 115, 'star_small_on').setScale(1.2).setDepth(30);
      this.tweens.add({ targets: s, x: target.x + (i - cost / 2) * 40, y: target.y - 40, scale: 0.6, delay: i * 90, duration: 520, ease: 'Cubic.In',
        onComplete: () => { audio.play('sfx_coin', { volume: 0.4 }); this.sparkleRing(s.x, s.y); s.destroy(); } });
    }
    this.time.delayedCall(520 + cost * 90, () => {
      this.applyState(true, n);
      this.refreshUI(true);
      toast(this, `+${TASK_COINS}`, H * 0.2);
      if (n + 1 >= RESTORE_TASKS) this.time.delayedCall(1200, () => this.complete());
      this.busy = false;
    });
  }

  // 월드 하나를 다 복원: 큰 보상 + 축하
  complete() {
    addCoins(WORLD_COINS); addBooster('hammer', 1); addBooster('shuffle', 1);
    audio.play('sfx_world_clear'); audio.buzz([60, 40, 120]);
    this.cameras.main.flash(300, 255, 255, 255);
    const rays = this.add.image(W / 2, H * 0.3, 'ptc_rays').setScale(2.4).setAlpha(0.5).setTint(0xFFF1A8).setDepth(25);
    this.tweens.add({ targets: rays, angle: 360, duration: 8000, repeat: -1 });
    const txt = this.add.text(W / 2, H * 0.3, t('restoreDone'), { ...TXT.title, fontSize: '88px' }).setOrigin(0.5).setDepth(26).setScale(0);
    this.tweens.add({ targets: txt, scale: 1, duration: 450, ease: 'Back.Out' });
    const rw = this.add.text(W / 2, H * 0.3 + 110, `${t('restoreReward')}  +${WORLD_COINS}`, { ...TXT.mid, stroke: '#7A3F00' }).setOrigin(0.5).setDepth(26);
    rw.setAlpha(0); this.tweens.add({ targets: rw, alpha: 1, delay: 400, duration: 300 });
    const colors = [0xFF4D6D, 0xFF9F1C, 0xFFD23F, 0x8CC63F, 0x3EC1F3, 0xA55CF0];
    for (let i = 0; i < 70; i++) {
      const c = this.add.image(Phaser.Math.Between(0, W), -40 - Math.random() * 300, 'ptc_confetti').setTint(colors[i % 6]).setScale(0.8 + Math.random()).setDepth(27);
      this.tweens.add({ targets: c, y: H + 60, angle: 540, x: c.x + Phaser.Math.Between(-120, 120), duration: 2200 + Math.random() * 1400, delay: Math.random() * 500, onComplete: () => c.destroy() });
    }
    this.refreshUI(false);
  }

  bubbleBurst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const b = this.add.image(x + Phaser.Math.Between(-80, 80), y + Phaser.Math.Between(-30, 30), 'ptc_bubble').setScale(0.25 + Math.random() * 0.4).setDepth(8);
      this.tweens.add({ targets: b, y: b.y - 200 - Math.random() * 200, x: b.x + Phaser.Math.Between(-40, 40), alpha: 0, duration: 900 + Math.random() * 600, onComplete: () => b.destroy() });
    }
  }

  sparkleRing(x, y) {
    const r = this.add.image(x, y, 'ptc_ring').setScale(0.2).setTint(0xFFE14D).setDepth(9);
    this.tweens.add({ targets: r, scale: 1.1, alpha: 0, duration: 450, onComplete: () => r.destroy() });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const p = this.add.image(x, y, 'ptc_spark').setScale(0.35).setTint(0xFFF1A8).setDepth(9);
      this.tweens.add({ targets: p, x: x + Math.cos(a) * 130, y: y + Math.sin(a) * 130, alpha: 0, duration: 550, onComplete: () => p.destroy() });
    }
  }

  leave() {
    this.cameras.main.fadeOut(220, 189, 235, 255);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Map'));
  }
}
