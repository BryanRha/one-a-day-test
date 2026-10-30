// 비행 화면: core/run.js 시뮬레이션을 고정 간격으로 돌리고, 상태(s)와 사건(events)을 그림·소리로 옮긴다.
import { W, H } from '../config.js?v=0.93.2';
import { Run, LANE_W, LANES, ITEM_TIME, ZONE_EVERY } from '../core/run.js?v=0.93.2';
import { decideX } from '../core/ai.js?v=0.93.2';
import { txt, fmt, fit, iconButton, button, popup, toast } from '../ui.js?v=0.93.2';
import { audio } from '../audio.js?v=0.93.2';
import { load, save } from '../save.js?v=0.93.2';
import { wind, tipOf, bodyOf, ELEMENT } from '../fx.js?v=0.93.2';
import { ZONES, BOSS_NAME, ITEM_NAME, REVIVE_COST, REVIVE_MAX, OAD_REVIVE_MAX, REVIVE_SEC, reviveMood, BOOSTERS, pay } from '../meta.js?v=0.93.2';
import { bm } from '../oad_bm.js?v=0.93.2';
import { activeOutfit, outfitKey, outfitFx } from '../outfit.js?v=0.93.2';
import { helpCheck, giftMeters, helpShown, noteRun, track } from '../help.js?v=0.93.2';
import { inOAD, exitToOAD } from '../oad.js?v=0.93.2';

const DT = 1 / 60;
const SHOT_KEY = { star: 'bolt_star', fire: 'bolt_fire', ice: 'bolt_ice', bolt: 'bolt_bolt', furball: 'furball' };
const DROP_KEY = { coin: 'cur_coin', gem: 'cur_gem', paw: 'cur_paw', treat: 'cur_treat', crystal: 'cur_crystal' };
const EB_KEY = { skull: 'eb_skull', cannon: 'eb_cannon', moon: 'eb_moon', spark: 'eb_spark', star: 'eb_star', orb: 'eb_orb' };
// 몬스터 종류별 움직임: f 진동수 · sx 가로 늘림(날갯짓) · sy 세로 · lag 위상차 · rot 흔들림 각도 · rf 흔들림 속도
const MOTION = {
  bat: { f: 14, sx: 0.09, sy: -0.04, lag: 0, rot: 6, rf: 2.5 },
  firebat: { f: 16, sx: 0.1, sy: -0.05, lag: 0, rot: 7, rf: 3 },
  crow: { f: 11, sx: 0.08, sy: -0.03, lag: 0, rot: 5, rf: 2 },
  pumpkin: { f: 12, sx: 0.06, sy: -0.03, lag: 0, rot: 8, rf: 2.2 },
  chest: { f: 13, sx: 0.07, sy: 0.04, lag: 1.6, rot: 4, rf: 3 },
  ghost: { f: 3, sx: 0.06, sy: 0.08, lag: 1.6, rot: 9, rf: 1.4, alpha: true },
  golem: { f: 2.2, sx: 0.03, sy: 0.04, lag: 3.1, rot: 2, rf: 1 },
  skull: { f: 6, sx: 0.05, sy: 0.05, lag: 1.6, rot: 14, rf: 4 },
  eliteFire: { f: 9, sx: 0.07, sy: 0.03, lag: 1.6, rot: 4, rf: 2 },
  eliteIce: { f: 5, sx: 0.05, sy: 0.04, lag: 1.6, rot: 3, rf: 1.5 },
  eliteSteel: { f: 10, sx: 0.07, sy: -0.03, lag: 0, rot: 3, rf: 1.8 },
};
const BACKLIGHT = { crow: [0x8A7AFF, 0.45], golem: [0x7AD8FF, 0.3], eliteSteel: [0xD8D8FF, 0.35], bat: [0xB89AFF, 0.18], skull: [0xC77AFF, 0.25] };
const ELEMENT_COLOR = { star: 0xFFF2A0, fire: 0xFF9A4A, ice: 0x9AE8FF, bolt: 0xFFF04D, furball: 0xFFD6A0 };

// id → 그림 연결 (매 프레임 살아 있는 것만 남기고 나머지는 숨겨서 재사용)
class Pool {
  constructor(scene, make) { this.scene = scene; this.make = make; this.live = new Map(); this.free = []; this.frame = 0; }
  begin() { this.frame++; }
  get(id, arg) {
    let o = this.live.get(id);
    if (!o) { o = this.free.pop() || this.make(arg); o.setVisible(true).setActive(true); o._new = true; this.live.set(id, o); } else o._new = false;
    o._seen = this.frame;
    return o;
  }
  end(onRemove) {
    for (const [id, o] of this.live) if (o._seen !== this.frame) { this.live.delete(id); if (onRemove) onRemove(o, id); else this.release(o); }
  }
  release(o) { o.setVisible(false).setActive(false); this.free.push(o); }
}

export class PlayScene extends Phaser.Scene {
  constructor() { super('Play'); }
  init(data) { this.opts = data || {}; }

  create() {
    const d = load();
    const boosters = { dash: false, shield: false };
    for (const k of Object.keys(BOOSTERS)) if (d.boosters[k] && pay({ coins: BOOSTERS[k].cost })) boosters[k] = true;
    const cats = d.equip.filter(Boolean).map(id => ({ id, level: d.cats[id] }));
    this.run = new Run({ seed: (Date.now() & 0xffffff) + 1, H, witch: d.witch, witchLevel: d.witches[d.witch] || 1, cats, boosters, adoptTarget: d.adopt });
    this.s = this.run.s;
    // 장면 객체는 판마다 재사용되므로 상태를 모두 초기화
    this.finished = false; this.bossImg = null; this.bossFlash = 0; this.scoreShown = 0; this.bannerAt = 0; this.drag = null;
    this.acc = 0; this.paused = false; this.over = false; this.slow = 1; this.bossKills = 0; this.sRank = 0; this.items = 0;
    this.oadRevives = 0; this.tipAt = null; this.reviveAt = 0; this.reviveOffers = []; this.runsBefore = d.totals.runs; this.helped = false; this.quit = false;
    const q = new URLSearchParams(location.search);
    this.bot = q.has('bot') || this.opts.bot;
    // 테스트용: ?from=1400 → 그 거리에서 시작
    if (q.get('from')) { const f = +q.get('from'); this.s.dist = f; this.s.nextMeteor = f + 200; this.s.nextBoss = Math.ceil((f + 1) / 1500) * 1500; this.s.zone = Math.floor(f / 2000); }
    this.botThink = 0;
    this.bestDist = d.bestDist; this.passedBest = d.bestDist < 100;

    this.makeBackground();
    this.layer = { drops: this.add.layer().setDepth(20), enemies: this.add.layer().setDepth(30), shots: this.add.layer().setDepth(40), player: this.add.layer().setDepth(50), eb: this.add.layer().setDepth(60), fx: this.add.layer().setDepth(70) };
    this.makePools();
    this.makePlayer(cats);
    this.makeHud();
    this.makeInput();
    this.add.image(W / 2, H / 2, 'bg_vignette').setDisplaySize(W, H).setDepth(4).setAlpha(0.75);
    audio.music('bgm_run', this);
    this.cameras.main.fadeIn(300, 10, 6, 30);
    this.showBanner(ZONES[this.s.zone % 5], `${this.s.zone + 1} 구역`, 0xB89AFF);
    if (boosters.dash) this.time.delayedCall(200, () => { this.startDash(); this.popText(W / 2, H * 0.45, '출발 대시!', '#FFE14D', 80, 900); });
    if (!d.tutorial && !this.bot) this.tutorial();
    else if (!this.bot && !boosters.shield && helpCheck()) this.offerHelp(d.bestDist);
    window.__play = this;
  }

  // ── 배경: 구역 그림 두 장을 겹쳐 놓고 바뀔 때 서서히 전환 + 빠른 구름층 ──
  makeBackground() {
    this.bgA = this.add.tileSprite(W / 2, H / 2, W, H, 'bg_0').setDepth(0);
    this.bgA.setTexture(`bg_${this.s.zone % 5}`);
    this.bgB = this.add.tileSprite(W / 2, H / 2, W, H, 'bg_1').setDepth(1).setAlpha(0);
    // 배경은 살짝 어둡게 눌러서 적·탄이 또렷하게 보이도록
    this.shade = this.add.rectangle(W / 2, H / 2, W, H, 0x0E0830, 0.25).setDepth(1.5);
    this.clouds = this.add.tileSprite(W / 2, H / 2, W, H, 'bg_cloudlayer').setDepth(2).setAlpha(0.12);
    this.speedLines = this.add.particles(0, 0, 'bolt_star', {
      x: { min: 0, max: W }, y: -100, speedY: { min: 2600, max: 3600 }, lifespan: 900, scaleX: 0.12, scaleY: { min: 0.8, max: 1.4 },
      alpha: { start: 0.55, end: 0 }, frequency: 25, quantity: 2, emitting: false, blendMode: 'ADD', tint: 0xFFE6A8,
    }).setDepth(3);
  }

  makePools() {
    const L = this.layer;
    this.pEnemy = new Pool(this, () => { const c = this.add.container(0, 0); const g = this.add.image(0, 0, 'glow').setScale(2.6).setBlendMode('ADD'); const sp = this.add.sprite(0, 0, 'en_bat_0'); c.add([g, sp]); c.sp = sp; c.g = g; L.enemies.add(c); return c; });
    // 탄 = 빛망울(뒤) + 탄 그림(앞)
    this.pShot = new Pool(this, () => {
      const c = this.add.container(0, 0);
      const g = this.add.image(0, -20, 'glow').setBlendMode('ADD').setScale(0.9, 1.4).setAlpha(0.7);
      const i = this.add.image(0, 0, 'bolt_star').setBlendMode('ADD');
      const head = this.add.image(0, -40, 'spark').setBlendMode('ADD');
      const o1 = this.add.image(0, 0, 'spark').setBlendMode('ADD').setScale(0.45), o2 = this.add.image(0, 0, 'spark').setBlendMode('ADD').setScale(0.45);
      c.add([g, o1, o2, i, head]); Object.assign(c, { g, i, head, o1, o2 }); L.shots.add(c); return c;
    });
    // 마녀 레벨에 따른 마법탄 단계 (원작처럼 성장할수록 탄이 화려해짐): 1~4 · 5~9 · 10~19 · 20~29 · 30
    this.tier = [5, 10, 20, 30].filter(v => this.s.level >= v).length;
    // 처치·획득 불꽃 입자 (한 개 이미터로 모두 처리)
    this.burst = this.add.particles(0, 0, 'spark', { lifespan: { min: 350, max: 650 }, speed: { min: 180, max: 520 }, scale: { start: 0.55, end: 0 }, alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 360 }, blendMode: 'ADD', emitting: false });
    this.burst.setDepth(72);
    this.pDrop = new Pool(this, () => { const i = this.add.image(0, 0, 'cur_coin'); L.drops.add(i); return i; });
    this.pEb = new Pool(this, () => { const i = this.add.image(0, 0, 'eb_orb'); L.eb.add(i); return i; });
    this.pMeteor = new Pool(this, () => { const c = this.add.container(0, 0); const lane = this.add.rectangle(0, 0, LANE_W - 10, H * 2, 0xFF3B5B, 0.16).setOrigin(0.5, 0); const warn = this.add.image(0, 170, 'warn').setScale(0.9); const m = this.add.image(0, 0, 'meteor'); c.add([lane, warn, m]); c.lane = lane; c.warn = warn; c.m = m; L.eb.add(c); return c; });
    this.pMark = new Pool(this, () => { const i = this.add.image(0, 0, 'mark'); L.drops.add(i); return i; });
    this.fxFree = [];
    this.textFree = [];
  }

  makePlayer(cats) {
    const s = this.s, L = this.layer, E = ELEMENT[s.element];
    this.E = E;
    this.dashFx = this.add.sprite(0, 0, 'sheet_dash').setVisible(false).setScale(1.5).setBlendMode('ADD');
    // 빗자루 끝에서 흩날리는 마법 가루 (속성 색)
    this.trail = this.add.particles(0, 0, E.tex, { speedY: { min: 260, max: 420 }, speedX: { min: -60, max: 60 }, lifespan: 700, scale: { start: 0.55, end: 0 }, alpha: { start: 0.9, end: 0 }, rotate: { min: 0, max: 360 }, frequency: 22, tint: E.tints, blendMode: 'ADD' });
    // 몸 주위를 감도는 오라 입자
    this.aura = this.add.particles(0, 0, E.tex, { x: { min: -90, max: 90 }, y: { min: -120, max: 120 }, speedY: { min: 40, max: 120 }, lifespan: 900, scale: { start: 0.35, end: 0 }, alpha: { start: 0.8, end: 0 }, frequency: 70, tint: E.tints, blendMode: 'ADD' });
    this.streak = this.add.particles(0, 0, 'glow', { x: { min: -140, max: 140 }, y: { min: -160, max: 160 }, speedY: { min: 500, max: 800 }, lifespan: 260, scaleX: 0.08, scaleY: { start: 1.6, end: 0.4 }, alpha: { start: 0.55, end: 0 }, frequency: 18, tint: 0xFFFFFF, blendMode: 'ADD', emitting: false });
    this.backGlow = this.add.image(0, 0, 'glow').setScale(4.2, 5).setTint(E.color).setAlpha(0.28).setBlendMode('ADD');
    const key = `witch_${s.witch}_0`;
    /* 의상(원어데이 · 겉모습만): 다시 칠한 원화 + 따라다니는 후광 · 가루 */
    const of = activeOutfit();
    this.ofx = of ? outfitFx(this, of, 0.8) : null;
    this.witch = this.add.image(0, 0, outfitKey(this, key, of));
    this.witch.setScale(420 / this.witch.height); this.witchScale = this.witch.scale;
    this.tip = tipOf(this, key); this.body = bodyOf(this, key);
    wind(this.witch, 0, 0.018);
    // 지팡이 끝 빛 (쏠 때마다 번쩍)
    this.tipGlow = this.add.image(0, 0, 'glow').setTint(E.color).setBlendMode('ADD');
    this.tipStar = this.add.image(0, 0, 'spark').setTint(0xFFFFFF).setBlendMode('ADD');
    this.flash = 0;
    this.shieldImg = this.add.image(0, 0, 'shield').setScale(0.9).setAlpha(0.85).setVisible(false).setBlendMode('ADD');
    this.catSprites = s.cats.map(c => { const sp = fit(this.add.image(0, 0, `cat_${c.id}`), 140); sp.base = sp.scale; sp.jump = 0; wind(sp, 2, 0.03); return sp; });
    this.catSparks = this.add.particles(0, 0, 'spark', { lifespan: 700, speed: { min: 20, max: 80 }, scale: { start: 0.3, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xFFE8F4, 0xFFF6A8, 0xD8C2FF], blendMode: 'ADD', emitting: false });
    this.catCircles = s.cats.map(() => this.add.image(0, 0, 'circle').setScale(0.5).setAlpha(0).setTint(0xFF9EC4).setBlendMode('ADD'));
    L.player.add([this.streak, this.backGlow, ...(this.ofx ? [this.ofx.halo, this.ofx.dust] : []), this.dashFx, this.trail, this.aura, ...this.catCircles, this.witch, ...this.catSprites, this.catSparks, this.tipGlow, this.tipStar, this.shieldImg]);
    this.tilt = 0; this.lastX = s.player.x;
  }


  makeHud() {
    const s = this.s, D = 100;
    this.add.image(W / 2, 0, 'hud_bar').setOrigin(0.5, 0).setDisplaySize(W, 260).setDepth(D);
    this.hDist = txt(this, 40, 70, '0m', 76, '#FFFFFF', { ox: 0 }).setDepth(D);
    this.hBest = txt(this, 44, 132, this.bestDist > 0 ? `최고 ${fmt(this.bestDist)}m` : '', 32, '#B8A6F0', { ox: 0 }).setDepth(D);
    this.hScore = txt(this, W / 2 + 40, 70, '0', 64, '#FFE14D').setDepth(D);
    this.add.image(W - 330, 150, 'cur_coin').setDisplaySize(54, 54).setDepth(D);
    this.hCoin = txt(this, W - 295, 150, '0', 42, '#FFFFFF', { ox: 0 }).setDepth(D);
    this.add.image(W - 160, 150, 'cur_gem').setDisplaySize(54, 54).setDepth(D);
    this.hGem = txt(this, W - 125, 150, '0', 42, '#FFFFFF', { ox: 0 }).setDepth(D);
    this.pauseBtn = iconButton(this, W - 80, 70, 'ico_pause', () => this.pause(), 110).setDepth(D);
    // 아이템 남은 시간 (왼쪽 아래 둥근 칸)
    this.itemHud = {};
    ['twin', 'magnet', 'star', 'dash'].forEach((k, i) => {
      const c = this.add.container(70 + i * 120, H - 90).setDepth(D).setVisible(false);
      const ring = this.add.graphics();
      c.add([this.add.circle(0, 0, 50, 0x120830, 0.75), ring, this.add.image(0, 0, `item_${k}`).setDisplaySize(78, 78)]);
      c.ring = ring; this.itemHud[k] = c;
    });
    // 보스 체력
    this.bossBar = this.add.container(W / 2, 262).setDepth(D).setVisible(false);
    this.bossFill = this.add.image(-380, 0, 'boss_bar_fill').setOrigin(0, 0.5);
    this.bossName = txt(this, 0, -52, '', 40, '#FFFFFF');
    this.bossTime = txt(this, 360, -52, '', 36, '#FFE14D', { ox: 1 });
    this.bossBar.add([this.add.image(0, 0, 'boss_bar_bg'), this.bossFill, this.bossName, this.bossTime]);
    // 고양이 입양 진행 (발바닥)
    if (s.adoptTarget) {
      this.pawHud = this.add.container(W - 120, H - 90).setDepth(D);
      const need = (load().paws[s.adoptTarget] || 0);
      this.pawBase = need;
      this.pawHud.add([this.add.circle(0, 0, 54, 0x120830, 0.75), fit(this.add.image(0, -6, `cat_${s.adoptTarget}`), 96), this.add.image(-40, 34, 'cur_paw').setDisplaySize(44, 44)]);
      this.pawTxt = txt(this, 14, 38, `${need}`, 32, '#FFE8A8');
      this.pawHud.add(this.pawTxt);
    }
    this.mult = txt(this, W / 2 + 40, 128, '', 34, '#FFB3D9').setDepth(D);
  }

  // 손가락을 움직인 만큼 마녀가 움직임 (화면 어디를 눌러도 됨)
  makeInput() {
    this.drag = null;
    this.input.on('pointerdown', p => { if (p.y < 200) return; this.drag = { px: p.x, x: this.s.player.tx }; });
    this.input.on('pointermove', p => { if (this.drag && p.isDown) this.run.setTarget(this.drag.x + (p.x - this.drag.px) * 1.15); });
    this.input.on('pointerup', () => { this.drag = null; });
    this.keys = this.input.keyboard?.createCursorKeys();
  }

  // 첫 비행: 손가락 안내 (처음 한 번만)
  tutorial() {
    const d = load(); d.tutorial = true; save();
    const y = this.s.player.y + 200;
    const c = this.add.container(W / 2, y).setDepth(98);
    const hand = txt(this, 0, 0, '👆', 110, '#FFFFFF', { shadow: false });
    c.add([this.add.rectangle(0, -170, 860, 100, 0x120830, 0.8).setStrokeStyle(4, 0xFFD95A), txt(this, 0, -170, '누른 채 좌우로 밀어서 피하고 쏘세요!', 46, '#FFE8A8'), hand]);
    this.tweens.add({ targets: hand, x: { from: -220, to: 220 }, duration: 900, yoyo: true, repeat: 2, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: c, alpha: 0, delay: 5200, duration: 400, onComplete: () => c.destroy() });
  }

  // 처음 겪는 상황마다 한 번씩 짧은 안내 (별똥별은 잠깐 느리게 해서 피할 시간을 줌)
  showTip(key, text, slow = false) {
    const d = load();
    if (this.bot || d.tips[key]) return;
    d.tips[key] = 1; save();
    const c = this.add.container(W / 2, 330).setDepth(97);
    const t = txt(this, 0, 0, text, 44, '#FFFFFF', { wrap: 900 });
    c.add([this.add.rectangle(0, 0, Math.min(1000, t.width + 80), t.height + 46, 0x120830, 0.88).setStrokeStyle(4, 0xFFD95A), t]);
    c.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, delay: 2600, duration: 300, onComplete: () => c.destroy() });
    if (slow) { this.slow = 0.35; this.time.delayedCall(900, () => { if (this.slow < 1) this.slow = 1; }); }
  }

  // ── 매 프레임 ───────────────────────────────────────────────
  update(time, deltaMs) {
    if (this.paused) return;
    const dt = Math.min(0.05, deltaMs / 1000) * this.slow;
    if (this.keys) { const k = this.keys; if (k.left.isDown) this.run.setTarget(this.s.player.tx - 1400 * dt); if (k.right.isDown) this.run.setTarget(this.s.player.tx + 1400 * dt); }
    this.acc += dt;
    let n = 0;
    while (this.acc >= DT && n < 5) {
      this.acc -= DT; n++;
      if (this.bot && this.s.status === 'play') { this.botThink -= DT; if (this.botThink <= 0) { this.botThink = 0.12; this.run.setTarget(decideX(this.run, 0.9)); } }
      this.run.step(DT);
      for (const e of this.run.events) this.onEvent(e);
      this.run.events.length = 0;
      if (this.s.status !== 'play') break;
    }
    if (this.acc > DT * 5) this.acc = 0;
    this.draw(dt);
  }

  draw(dt) {
    const s = this.s, p = s.player, t = s.t;
    // 배경 스크롤
    const dy = s.speed * dt * (this.over ? 0.2 : 1);
    this.bgA.tilePositionY -= dy * 0.5; this.bgB.tilePositionY -= dy * 0.5; this.clouds.tilePositionY -= dy * 0.9;
    this.speedLines.emitting = s.items.dash > 0;
    // 마녀 + 고양이
    const vx = (p.x - this.lastX) / Math.max(dt, 1e-3); this.lastX = p.x;
    // 좌우 이동 반응: 몸 기울기 · 옆으로 쏠림 · 망토/머리카락이 반대로 끌림 · 바람 자국
    this.vn = (this.vn || 0) + (Phaser.Math.Clamp(vx / 1400, -1, 1) - (this.vn || 0)) * Math.min(1, dt * 8);
    const vn = this.vn;
    this.tilt += (vn * 18 - this.tilt) * Math.min(1, dt * 12);
    if (this.witch.wind) this.witch.wind.vel = -vn * 0.9;
    this.streak.emitting = Math.abs(vn) > 0.25 && !this.over;
    this.streak.speedX = -vn * 900;
    const bob = Math.sin(t * 3) * 6;
    // 몸 중심(그림 무게중심)을 충돌 판정 자리(p)에 맞춰 그림 — 보이는 몸 = 부딪히는 몸
    //   (예전엔 지팡이 끝을 탄 나가는 자리에 맞춰, 몸이 판정보다 아래로 ~190px · 루나/시엘은 왼쪽으로 ~80px 비켜 그려졌음 → 몸에 겹쳐도 안 죽는 것처럼 보임)
    //   탄은 판정상 p.x 열에서 나가고, 그림만 지팡이 끝에서 나와 그 열로 모이게 그림(아래 '내 탄')
    const ws = this.witchScale, ww = this.witch.width * ws, wh = this.witch.height * ws;
    const breath = Math.sin(t * 6) * 0.012, bank = Math.abs(this.vn) * 0.08;
    if (!this.over) this.witch.setPosition(p.x - (this.body.x - 0.5) * ww + this.vn * 12, p.y - (this.body.y - 0.5) * wh + bob - Math.abs(this.vn) * 10).setAngle(this.tilt).setScale(ws * (1 + breath - bank), ws * (1 - breath + bank * 0.4));
    this.witch.setAlpha(p.inv > 0 && s.status === 'play' ? (Math.floor(t * 14) % 2 ? 0.4 : 1) : 1);
    const wx = this.witch.x, wy = this.witch.y;
    if (this.ofx) this.ofx.setPos(wx, wy);
    this.backGlow.setPosition(wx, wy).setAlpha(0.22 + Math.sin(t * 3) * 0.06).setVisible(!this.over);
    this.trail.setPosition(wx - this.vn * 40, wy + wh * 0.42); this.trail.emitting = !this.over;
    this.trail.speedX = { min: -60 - this.vn * 300, max: 60 - this.vn * 300 };
    this.streak.setPosition(wx, wy);
    this.aura.setPosition(wx, wy); this.aura.emitting = !this.over;
    this.flash = Math.max(0, this.flash - dt * 9);
    /* 지팡이 끝 (그려진 자리) — 빛 · 탄이 나오는 곳 */
    const tx = this.witch.x + (this.tip.x - 0.5) * ww, ty = this.witch.y + (this.tip.y - 0.5) * wh;
    this.tipAt = { x: tx, y: ty };
    this.tipGlow.setPosition(tx, ty).setScale(0.9 + this.flash * 0.9 + Math.sin(t * 9) * 0.08).setAlpha(this.over ? 0 : 0.75 + this.flash * 0.25);
    this.tipStar.setPosition(tx, ty).setScale(0.7 + this.flash * 0.8).setAngle(t * 120).setAlpha(this.over ? 0 : 1);
    this.shieldImg.setVisible(!!p.shield).setPosition(p.x, p.y + 20).setScale(0.9 + Math.sin(t * 5) * 0.03).setAngle(t * 30);
    this.dashFx.setPosition(p.x, p.y + 10);
    s.cats.forEach((c, i) => {
      const sp = this.catSprites[i];
      // 스프링처럼 마녀를 따라옴 → 늦게 따라오며 기울고 늘어남
      const tx = Phaser.Math.Clamp(wx + c.side * (ww * 0.42 + 70), 70, W - 70);
      sp.vx = (sp.vx || 0) + ((tx - sp.x) * 70 - (sp.vx || 0) * 11) * dt;
      sp.x += sp.vx * dt;
      const cv = Phaser.Math.Clamp(sp.vx / 1200, -1, 1);
      if (sp.wind) sp.wind.vel = -cv;
      // 가끔 혼자 장난: 깡충 · 한 바퀴 · 갸웃
      sp.idleT = (sp.idleT ?? 2 + i * 1.7) - dt;
      if (sp.idleT <= 0) { sp.idleT = 3 + Math.random() * 4; sp.trick = ['hop', 'spin', 'tilt'][Math.floor(Math.random() * 3)]; sp.trickT = 0; }
      let ty = 0, ta = 0, tsx = 1;
      if (sp.trick) {
        sp.trickT += dt; const k = sp.trickT / 0.6;
        if (k >= 1) sp.trick = null;
        else if (sp.trick === 'hop') ty = -Math.sin(k * Math.PI) * 40;
        else if (sp.trick === 'spin') tsx = Math.cos(k * Math.PI * 2);
        else ta = Math.sin(k * Math.PI) * 18 * (c.side > 0 ? -1 : 1);
      }
      sp.jump = Math.max(0, sp.jump - dt * 4);
      const j = Math.sin(sp.jump * Math.PI), br = Math.sin(t * 5 + i) * 0.035;
      sp.y = wy + wh * 0.18 + Math.sin(t * 4 + i * 2) * 12 - j * 30 + ty;
      const flip = c.side > 0 ? -1 : 1;
      sp.setScale(sp.base * (1 + j * 0.1 + br - Math.abs(cv) * 0.06) * tsx * flip, sp.base * (1 - j * 0.08 - br + Math.abs(cv) * 0.05)).setFlipX(false)
        .setAngle(cv * 20 + Math.sin(t * 2 + i) * 4 - c.side * j * 10 + ta);
      const cc = this.catCircles[i]; cc.setPosition(sp.x, sp.y + 40).setAlpha(j * 0.8).setAngle(t * 90).setScale(0.45 + j * 0.2, (0.45 + j * 0.2) * 0.4);
      sp.setVisible(!this.over || sp.alpha > 0);
    });

    // 적
    this.pEnemy.begin();
    for (const e of s.enemies) {
      const c = this.pEnemy.get(e.id);
      if (c._new) {
        c.sp.play(`en_${e.kind}`); c.base = (e.kind === 'skull' ? 0.8 : 1) * 245 / Math.max(c.sp.width, 190);
        const eg = { eliteFire: 0xFF5A2A, eliteIce: 0x7AD8FF, eliteSteel: 0xD8D8FF, chest: 0xFFD23F, firebat: 0xFF7A2A }[e.kind];
        // 어두운 몬스터는 뒤에 빛을 깔아 밤 배경에서도 또렷하게
        const bl = BACKLIGHT[e.kind] || (eg && [eg, 0.55]); c.g.setVisible(!!bl); if (bl) c.g.setTint(bl[0]).setAlpha(bl[1]); c.sp.clearTint(); c.flash = 0; c.squash = 0; c.pop = 0; c.setAlpha(1);
      }
      // 등장 시 톡 튀어나오고, 맞으면 찌그러졌다 복원, 평소엔 날갯짓하듯 숨쉬기
      c.pop = Math.min(1, c.pop + dt * 5); c.squash = Math.max(0, c.squash - dt * 8);
      const M = MOTION[e.kind] || MOTION.bat, ph = t * M.f + e.wob * 3, pop = Phaser.Math.Easing.Back.Out(c.pop);
      const fx = Math.sin(ph) * M.sx, fy = Math.sin(ph + M.lag) * M.sy;
      c.sp.setScale(c.base * pop * (1 + fx - c.squash * 0.12), c.base * pop * (1 + fy + c.squash * 0.1)).setAngle(Math.sin(t * M.rf + e.wob) * M.rot);
      if (M.alpha) c.sp.setAlpha(0.82 + Math.sin(t * 3 + e.wob) * 0.15);
      c.setPosition(e.x + Math.sin(t * 2 + e.wob) * 8, e.y + Math.sin(t * 3 + e.wob) * 6);
      if (c.flash > 0) { c.flash -= dt; if (c.flash <= 0) { c.sp.clearTint(); } }
      if (e.frozen > 0 && c.flash <= 0) c.sp.setTint(0x9AE8FF); else if (c.flash <= 0) c.sp.clearTint();
    }
    this.pEnemy.end();
    // 내 탄
    this.pShot.begin();
    for (const b of s.bullets) {
      const c = this.pShot.get(b.id), i = c.i, fur = b.kind === 'furball', T = fur ? 0 : this.tier;
      if (c._new) {
        const col = fur ? 0xFF9EC4 : (ELEMENT_COLOR[b.kind] || 0xFFFFFF);
        i.setTexture(SHOT_KEY[b.kind]); i.setScale(fur ? 0.75 : 1.1 + T * 0.14); i.setAngle(0); i.setBlendMode(fur ? 'NORMAL' : 'ADD');
        c.g.setTint(col); c.head.setVisible(T >= 1).setTint(col); c.o1.setVisible(T >= 2).setTint(col); c.o2.setVisible(T >= 2).setTint(0xFFFFFF);
      }
      /* 마법탄: 지팡이 끝에서 나와 220px 안에 판정 열(b.x)로 모임 (판정은 core 그대로) */
      if (!fur && this.tipAt) { const k = Math.max(0, 1 - (p.y - 70 - b.y) / 220); c.setPosition(b.x + (this.tipAt.x - p.x) * k, b.y + (this.tipAt.y - (p.y - 70)) * k); }
      else c.setPosition(b.x, b.y);
      const gw = 0.85 + T * 0.22;
      c.g.setScale(gw + Math.sin(t * 30 + b.id) * 0.1, 1.4 + T * 0.25).setAlpha(0.7 + T * 0.05);
      if (T >= 1) c.head.setScale(0.5 + T * 0.12 + Math.sin(t * 40 + b.id) * 0.1).setAngle(t * 400);
      if (T >= 2) { const a = t * 18 + b.id, r = 22 + T * 6; c.o1.setPosition(Math.sin(a) * r, Math.cos(a) * 18 + 10); c.o2.setPosition(-Math.sin(a) * r, -Math.cos(a) * 18 + 10); }
      if (T >= 4) c.g.setTint(Phaser.Display.Color.HSVToRGB((t * 0.8 + b.id * 0.05) % 1, 0.5, 1).color);
      if (b.kind === 'furball') i.setAngle(Math.sin(t * 20 + b.id) * 12);
    }
    this.pShot.end();
    // 떨어진 것
    this.pDrop.begin();
    for (const d of s.drops) {
      const i = this.pDrop.get(d.id);
      if (i._new) { i.setTexture(d.kind === 'item' ? `item_${d.item}` : DROP_KEY[d.kind]); fit(i, d.kind === 'item' ? 112 : d.kind === 'coin' ? 50 : 60); i.baseScale = i.scaleY; }
      i.setPosition(d.x, d.y);
      if (d.kind === 'coin') i.scaleX = i.baseScale * Math.abs(Math.cos(t * 6 + d.id));
      if (d.kind === 'item') i.setAngle(Math.sin(t * 4) * 10);
    }
    this.pDrop.end();
    // 적 탄
    this.pEb.begin();
    for (const b of s.ebullets) {
      const i = this.pEb.get(b.id);
      if (i._new) { i.setTexture(EB_KEY[b.kind] || 'eb_orb'); i.setScale(b.r / 22); }
      i.setPosition(b.x, b.y);
      i.rotation += dt * 4;
    }
    this.pEb.end();
    // 별똥별
    this.pMeteor.begin();
    for (const m of s.meteors) {
      const c = this.pMeteor.get(m.id);
      c.setPosition(m.x, 0);
      const warn = m.warn > 0;
      c.lane.setVisible(warn).setAlpha(0.1 + 0.12 * (Math.floor(t * 8) % 2));
      c.warn.setVisible(warn).setScale((130 / c.warn.width) * (0.9 + 0.1 * Math.sin(t * 20)));
      c.m.setVisible(!warn).setPosition(0, m.y).setScale(m.big ? 1.25 : 0.95).setTint(m.big ? 0xFFC0A0 : 0xFFFFFF);
    }
    this.pMeteor.end();
    // 떡방아 표시 (달토끼)
    this.pMark.begin();
    for (const m of s.marks) {
      const i = this.pMark.get(m.id);
      i.setPosition(m.x, m.y).setDisplaySize(m.r * 2, m.r * 2).setAlpha(0.5 + 0.5 * (Math.floor(m.t * 10) % 2));
    }
    this.pMark.end();
    // 보스
    if (s.boss) {
      const B = s.boss;
      if (!this.bossImg) {
        this.bossImg = fit(this.add.image(B.x, B.y, `boss_${B.type}`), 540);
        this.bossBase = this.bossImg.scale; this.bossRecoil = 0;
        this.bossAura = this.add.image(B.x, B.y, 'glow').setScale(8).setTint(0xB84AFF).setAlpha(0.3).setBlendMode('ADD');
        this.bossGlow = null;
        this.layer.enemies.add([this.bossAura, this.bossImg]);
      }
      const ph2 = B.phase === 2;
      this.bossRecoil = Math.max(0, this.bossRecoil - dt * 6);
      const br = Math.sin(t * (ph2 ? 5 : 3)) * 0.025;
      this.bossImg.setPosition(B.x + Math.sin(t * 13) * (ph2 ? 3 : 0), B.y + Math.sin(t * 2) * 10 - this.bossRecoil * 14).setVisible(B.state !== 'warn')
        .setScale(this.bossBase * (1 + br - this.bossRecoil * 0.04), this.bossBase * (1 - br + this.bossRecoil * 0.03)).setAngle(Math.sin(t * 1.5) * 3);
      this.bossAura.setPosition(this.bossImg.x, this.bossImg.y).setVisible(B.state !== 'warn').setTint(ph2 ? 0xFF3B5B : 0xB84AFF).setAlpha(0.25 + Math.sin(t * (ph2 ? 8 : 3)) * 0.1);
      if (this.bossGlow) this.bossGlow.color = ph2 ? 0xFF3B5B : 0xB84AFF;
      if (this.bossFlash > 0) { this.bossFlash -= dt; if (this.bossFlash <= 0) this.bossImg.clearTint(); }
      if (B.state === 'fight' || B.state === 'enter') {
        this.bossBar.setVisible(true);
        this.bossFill.setCrop(0, 0, 760 * Math.max(0, B.hp / B.maxHp), 64);
        this.bossTime.setText(B.state === 'fight' ? `${Math.max(0, Math.ceil(40 - B.age))}초` : '');
      }
    }
    // HUD
    this.hDist.setText(`${fmt(s.dist)}m`);
    this.scoreShown = this.scoreShown ?? 0;
    this.scoreShown += (s.score - this.scoreShown) * Math.min(1, dt * 10);
    this.hScore.setText(fmt(Math.round(this.scoreShown)));
    this.hCoin.setText(fmt(s.coins)); this.hGem.setText(fmt(s.gems));
    this.mult.setText(s.items.star > 0 ? '점수 ×2' : '');
    for (const k of Object.keys(this.itemHud)) {
      const c = this.itemHud[k], left = s.items[k];
      c.setVisible(left > 0);
      if (left > 0) { c.ring.clear().lineStyle(8, 0xFFD95A).beginPath().arc(0, 0, 50, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left / ITEM_TIME[k]).strokePath(); c.setAlpha(left < 1.5 ? (Math.floor(t * 8) % 2 ? 0.4 : 1) : 1); }
    }
    if (s.enemies.length && s.enemies[0].y > s.player.y - 1000 && s.t > 1) this.showTip('row', '약한 몬스터 칸을 노려서 뚫고 지나가요!');
    if (!this.passedBest && s.dist > this.bestDist) { this.passedBest = true; this.showBanner('최고 기록 돌파!', '', 0xFFD95A); audio.play('sfx_mission'); }
  }

  // ── 사건 → 연출 ────────────────────────────────────────────
  onEvent(e) {
    const s = this.s;
    switch (e.type) {
      case 'shot': this.flash = 1; audio.play(`sfx_shot_${s.element}`, { volume: 0.18, gap: 110 }); break;
      case 'hit': {
        const c = this.pEnemy.live.get(e.id);
        if (c) { c.sp.setTintFill(0xFFFFFF); c.flash = 0.05; c.squash = 1; }
        this.fx('sheet_hit', e.x + Phaser.Math.Between(-20, 20), e.y + 50, 0.9, ELEMENT_COLOR[e.kind]);
        audio.play('sfx_hit', { volume: 0.22, gap: 70 });
        break;
      }
      case 'kill': {
        this.fx('sheet_poof', e.x, e.y, 1.1);
        this.burst.setParticleTint(this.E.tints[Phaser.Math.Between(0, 2)]);
        this.burst.emitParticleAt(e.x, e.y, e.close ? 14 : 8);
        audio.play(`sfx_kill_${Phaser.Math.Between(0, 2)}`, { volume: 0.4, gap: 40 });
        if (e.close) this.popText(e.x, e.y - 40, `+${fmt(e.pts)}`, '#FFE14D', 40);
        break;
      }
      case 'explode': this.fx('sheet_boom', e.x, e.y, 1.6); this.fx('sheet_ring', e.x, e.y, 2.2); this.shake(0.012, 260); audio.play('sfx_boom_small'); break;
      case 'splash': this.fx('sheet_boom', e.x, e.y, 0.5); break;
      case 'chain': this.lightning(e.from, e.to); break;
      case 'catShot': { const i = this.s.cats.findIndex(c => c.side === e.side); const sp = this.catSprites[i]; if (sp) { sp.jump = 1; this.catSparks.emitParticleAt(sp.x, sp.y - 30, 6); } break; }
      case 'pick': this.onPick(e); break;
      case 'itemEnd': if (e.item === 'dash') { this.dashFx.setVisible(false).stop(); } break;
      case 'shield': audio.play('sfx_shield', { volume: 0.5 }); this.fx('sheet_ring', s.player.x, s.player.y, 1, 0x9AE8FF); break;
      case 'giftEnd': this.popText(this.s.player.x, this.s.player.y - 160, '응원 보호막 끝 · 이제 혼자서도 OK!', '#9AE8FF', 40, 1200); break;
      case 'shieldBreak': audio.play('sfx_shield_break'); this.fx('sheet_ring', s.player.x, s.player.y, 1.4, 0x9AE8FF); this.shake(0.01, 200); break;
      case 'meteorWarn': audio.play('sfx_warn', { volume: 0.6 }); this.showTip('meteor', '⚠ 별똥별! 빨갛게 깜빡이는 칸에서 비켜요', true); break;
      case 'meteorFall': audio.play('sfx_meteor', { volume: 0.6, gap: 200 }); break;
      case 'meteorBreak': this.fx('sheet_boom', e.x, e.y, 1.2); audio.play('sfx_boom_small'); this.popText(e.x, e.y, '+500', '#FFE14D', 48); break;
      case 'zone': this.zoneChange(e.zone); break;
      case 'bossWarn': this.bossWarn(e.boss); this.time.delayedCall(3000, () => this.showTip('boss', '보스는 40초 안에! 빨리 물리칠수록 높은 랭크')); break;
      case 'bossEnter': this.bossBar.setVisible(true); this.bossName.setText(`${BOSS_NAME[e.boss]}  Lv.${this.s.boss.lvl}`); break;
      case 'bossHit': if (this.bossImg) { this.bossImg.setTintFill(0xFFFFFF); this.bossFlash = 0.04; this.bossRecoil = Math.min(1, this.bossRecoil + 0.25); } this.fx('sheet_hit', e.x, e.y + 40, 1, ELEMENT_COLOR[e.kind]); audio.play('sfx_hit', { volume: 0.22, gap: 70 }); break;
      case 'bossPhase': this.shake(0.01, 400); this.popText(W / 2, 520, '분노!', '#FF6A8A', 90); break;
      case 'bossShot': case 'cannon': case 'mochi': case 'clone': break;
      case 'bossDash': this.popText(s.boss.x, s.boss.y + 200, '돌진!', '#FF6A8A', 64); break;
      case 'markBoom': this.fx('sheet_boom', e.x, e.y, e.r / 110); this.shake(0.006, 150); audio.play('sfx_boom_small', { volume: 0.5 }); break;
      case 'bossEnd': this.bossEnd(e); break;
      case 'dead': this.onDead(e); break;
      case 'revive': break;
    }
  }

  onPick(e) {
    const s = this.s;
    if (e.kind === 'coin') audio.play('sfx_coin', { volume: 0.3, gap: 55 });
    else if (e.kind === 'item') {
      this.items++;
      this.showTip('item', '마법 아이템! 몇 초 동안 강해져요');
      this.burst.setParticleTint(0xFFE8A8); this.burst.emitParticleAt(s.player.x, s.player.y, 24);
      this.tweens.add({ targets: this.backGlow, scaleX: 7, scaleY: 8, duration: 180, yoyo: true });
      audio.play('sfx_item');
      this.fx('sheet_ring', s.player.x, s.player.y, 1.2, 0xFFE8A8);
      this.popText(W / 2, H * 0.45, ITEM_NAME[e.item], '#FFE14D', 80, 900);
      if (e.item === 'dash') this.startDash();
    } else if (e.kind === 'paw') { audio.play('sfx_meow', { volume: 0.5, gap: 300 }); this.pawTxt && this.pawTxt.setText(`${this.pawBase + s.paws}`); this.popText(e.x, e.y - 30, '🐾', '#FFFFFF', 44); }
    else { audio.play('sfx_gem', { volume: 0.5, gap: 80 }); }
    this.fx('sheet_pick', e.x, e.y, 0.8);
  }

  startDash() { this.dashFx.setVisible(true).play('sheet_dash'); audio.play('sfx_dash'); }

  fx(key, x, y, scale = 1, tint = null) {
    let sp = this.fxFree.pop();
    if (!sp) { sp = this.add.sprite(0, 0, key).setBlendMode('ADD'); sp.on('animationcomplete', () => { sp.setVisible(false); this.fxFree.push(sp); }); this.layer.fx.add(sp); }
    sp.setVisible(true).setPosition(x, y).setScale(scale);
    if (tint) sp.setTint(tint); else sp.clearTint();
    sp.play(key);
  }
  popText(x, y, str, color, size = 44, hold = 250) {
    const t = txt(this, x, y, str, size, color).setDepth(90);
    t.setScale(0.5);
    this.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: y - 80, alpha: 0, delay: hold, duration: 500, onComplete: () => t.destroy() });
  }
  lightning(a, b) {
    const g = this.add.graphics().setDepth(75).setBlendMode('ADD');
    g.lineStyle(10, 0xFFF04D, 0.9).beginPath().moveTo(a[0], a[1]);
    for (let i = 1; i < 6; i++) g.lineTo(a[0] + (b[0] - a[0]) * i / 6 + Phaser.Math.Between(-18, 18), a[1] + (b[1] - a[1]) * i / 6 + Phaser.Math.Between(-30, 30));
    g.lineTo(b[0], b[1]).strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() });
  }
  shake(i, ms) { this.cameras.main.shake(ms, i); }

  // 띠 배너 (겹치지 않게 차례로)
  showBanner(title, sub, color) {
    const now = this.time.now;
    this.bannerAt = Math.max(this.bannerAt || 0, now);
    const wait = this.bannerAt - now;
    this.bannerAt += 1500;
    if (wait > 0) { this.time.delayedCall(wait, () => this.showBanner2(title, sub, color)); return; }
    this.showBanner2(title, sub, color);
  }
  showBanner2(title, sub, color) {
    const c = this.add.container(W / 2, H * 0.3).setDepth(95);
    const r = this.add.image(0, 0, 'ribbon').setDisplaySize(980, 200).setTint(color);
    c.add([r, txt(this, 0, -8, title, 70, '#FFFFFF', { stroke: '#22105A', thick: 12 })]);
    if (sub) c.add(txt(this, 0, 90, sub, 40, '#FFE8A8'));
    c.setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, y: c.y - 60, delay: 1200, duration: 300, onComplete: () => c.destroy() });
  }

  zoneChange(z) {
    const key = `bg_${z % 5}`;
    this.bgB.setTexture(key).setAlpha(0);
    this.bgB.tilePositionY = this.bgA.tilePositionY;
    this.tweens.add({ targets: this.bgB, alpha: 1, duration: 1800, onComplete: () => { this.bgA.setTexture(key); this.bgB.setAlpha(0); } });
    this.showBanner(ZONES[z % 5], `${z + 1} 구역 · ${fmt(z * ZONE_EVERY)}m`, 0xB89AFF);
  }

  bossWarn(type) {
    audio.stopMusic();
    audio.play('sfx_boss_warn', { volume: 0.8 });
    const c = this.add.container(0, 0).setDepth(96);
    const red = this.add.rectangle(W / 2, H / 2, W, H, 0xC2264A, 0.0);
    const band = this.add.rectangle(W / 2, H * 0.36, W, 260, 0x12061E, 0.85).setStrokeStyle(8, 0xFF3B5B);
    const t1 = txt(this, W / 2, H * 0.36 - 30, 'WARNING', 120, '#FF5A7A', { stroke: '#12061E', thick: 16 });
    const bl = this.s.boss ? this.s.boss.lvl : 1;
    const t2 = txt(this, W / 2, H * 0.36 + 70, `${bl > 3 ? '더 강해진 ' : ''}${BOSS_NAME[type]} 출현!`, 54, '#FFFFFF');
    c.add([red, band, t1, t2]);
    this.tweens.add({ targets: red, alpha: 0.28, duration: 300, yoyo: true, repeat: 4 });
    this.tweens.add({ targets: t1, scale: 1.08, duration: 300, yoyo: true, repeat: 4 });
    this.time.delayedCall(2800, () => { this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => c.destroy() }); if (!this.over) audio.music('bgm_boss', this); });
  }

  bossEnd(e) {
    if (this.bossImg) { this.bossImg.destroy(); this.bossImg = null; this.bossAura.destroy(); }
    this.bossBar.setVisible(false);
    if (e.killed) {
      this.bossKills++;
      if (e.rank === 'S') this.sRank++;
      for (let i = 0; i < 5; i++) this.time.delayedCall(i * 120, () => this.fx('sheet_boom', e.x + Phaser.Math.Between(-150, 150), e.y + Phaser.Math.Between(-120, 120), 1.6));
      this.fx('sheet_ring', e.x, e.y, 3);
      this.shake(0.02, 600);
      audio.play('sfx_boss_clear', { volume: 0.8 });
      this.flashScreen();
    }
    // 랭크 도장
    const col = { S: '#FFE14D', A: '#FF9EC4', B: '#9AE8FF', C: '#D8C2FF', X: '#9A8AB8' }[e.rank];
    const st = txt(this, W / 2, H * 0.36, e.rank === 'X' ? '놓쳤다…' : e.rank, e.rank === 'X' ? 100 : 260, col, { thick: 22 }).setDepth(96).setScale(3).setAlpha(0);
    const sub = txt(this, W / 2, H * 0.36 + 170, e.killed ? `${BOSS_NAME[e.boss]} 격파!` : '보스가 도망갔어요', 56, '#FFFFFF').setDepth(96).setAlpha(0);
    this.tweens.add({ targets: st, scale: 1, alpha: 1, duration: 280, ease: 'Back.easeOut', delay: 300 });
    this.tweens.add({ targets: sub, alpha: 1, duration: 300, delay: 450 });
    this.tweens.add({ targets: [st, sub], alpha: 0, delay: 2200, duration: 400, onComplete: () => { st.destroy(); sub.destroy(); } });
    this.time.delayedCall(1200, () => { if (!this.over) audio.music('bgm_run', this); });
  }

  flashScreen() { const f = this.add.rectangle(W / 2, H / 2, W, H, 0xFFFFFF, 0.8).setDepth(97); this.tweens.add({ targets: f, alpha: 0, duration: 400, onComplete: () => f.destroy() }); }

  // ── 추락 → 이어하기 / 결과 ──────────────────────────────────
  onDead() {
    const s = this.s;
    this.over = true;
    audio.play('sfx_die');
    audio.buzz(200);
    this.shake(0.02, 400);
    this.fx('sheet_boom', s.player.x, s.player.y, 1.4);
    this.tweens.add({ targets: this.witch, angle: 540, y: H + 300, duration: 1100, ease: 'Quad.easeIn' });
    this.catSprites.forEach(c => this.tweens.add({ targets: c, alpha: 0, duration: 400 }));
    if (this.ofx) this.ofx.setVisible(false);
    this.time.delayedCall(1100, () => this.askRevive());
  }

  // 응원 선물 (다음 판 시작 때 · 노력 인정 먼저 · 거절 가능): 보호막 1회, 첫 Nm 동안만
  offerHelp(best) {
    const m = giftMeters(best);
    helpShown(); track('help_offer', { gift: 'shield', m });
    this.paused = true;
    const pop = popup(this, '응원 선물', 900, { closable: false, depth: 2000, onBack: () => no() });
    const b = pop.box;
    b.add(txt(this, 0, -300, '최근 세 판, 포기하지 않고 날았네요!', 48, '#FFE14D', { wrap: 860 }));
    b.add(txt(this, 0, -225, '응원 선물 · 챙겨 드릴게요', 40, '#FFFFFF'));
    b.add(this.add.nineslice(0, -40, 'card', null, 820, 230, 50, 50, 50, 50).setTint(0xD8F4FF));
    b.add(this.add.image(-300, -40, 'shield').setDisplaySize(170, 170));
    b.add(txt(this, -190, -80, '보호막 1회', 50, '#FFFFFF', { ox: 0 }));
    b.add(txt(this, -190, -10, `첫 ${fmt(m)}m 동안 한 번 막아 줘요`, 34, '#9AE8FF', { ox: 0 }));
    const go = () => { pop.close(); this.time.delayedCall(160, () => { this.paused = false; }); };
    const yes = () => {
      this.helped = true; track('help_take', { gift: 'shield', m });
      this.s.player.shield = 1; this.s.giftUntil = m;
      audio.play('sfx_shield'); this.fx('sheet_ring', this.s.player.x, this.s.player.y, 1.4, 0x9AE8FF);
      go(); this.time.delayedCall(250, () => this.popText(W / 2, H * 0.45, '보호막 장착!', '#9AE8FF', 72, 900));
    };
    const no = () => { track('help_decline', { gift: 'shield', m }); go(); };
    b.add(button(this, 0, 160, '받을게요', yes, { key: 'btn_gold', w: 600, h: 140, size: 44 }));
    b.add(button(this, 0, 320, '혼자 해 볼게요', no, { key: 'btn_purple', w: 600, h: 140, size: 40 }));
    window.__helpPop = pop;
  }

  // 이어하기 창: 희망일 때만 권함 (meta.reviveMood) · 칭찬 먼저 · 10초 카운트다운 · 시간이 끝나면 조용히 결과로
  //   원어데이 안: 첫 번째 = 광고 보고(소장자는 광고 없이) | 🪙20 나란히 같은 크기 · 두 번째 = 🪙40 만 · 판당 2번까지
  //   별가루 이어하기(5/10/20)는 예전 그대로 함께 둠 · 원어데이 밖이면 골드 · 광고 버튼 없이 예전처럼
  askRevive() {
    const s = this.s, d = load();
    const B = s.boss && s.boss.state === 'fight' ? s.boss : null;
    const mood = reviveMood({ dist: s.dist, best: this.bestDist, runs: this.runsBefore, t: s.t, bossHp: B ? B.hp / B.maxHp : null });
    const gemCost = REVIVE_COST[s.revived];
    const info = bm.info;
    const hope = mood === 'record' || mood === 'near' || mood === 'boss';
    const oadN = this.oadRevives;
    const adOk = info.ok && oadN === 0 && (info.owned || (info.ads && info.ads.reward));
    const goldItem = oadN === 0 ? 'continue' : 'continue2';
    const goldOk = info.ok && oadN < OAD_REVIVE_MAX && bm.price(goldItem) > 0;
    const offerOad = hope && !this.helped && (adOk || goldOk);   /* 응원 선물 받은 판엔 골드 · 광고 이어하기를 권하지 않음 */
    const offerGem = gemCost !== undefined && mood !== 'early' && (hope || d.gems >= gemCost);
    this.reviveOffers.push({ mood, oad: offerOad, gem: offerGem, dist: Math.floor(s.dist) });
    if (this.bot || s.revived >= REVIVE_MAX || (!offerOad && !offerGem)) return this.finish();

    const ph = 605 + (offerOad ? 160 : 0) + (offerGem ? 150 : 0);   /* 내용 높이에 맞춤 */
    const pop = popup(this, hope ? '조금만 더!' : '이어서 날까요?', ph, { closable: false, depth: 2000 });
    const b = pop.box;
    let y = -ph / 2 + 150;
    /* 칭찬 먼저 → 희망 한 줄 */
    const praise = mood === 'record' ? '신기록 비행 중이었어요!' : mood === 'boss' ? '보스가 거의 쓰러졌어요!' : `멋진 비행! ${fmt(s.dist)}m`;
    const hopeLine = mood === 'near' ? `최고 기록까지 ${fmt(Math.max(1, this.bestDist - s.dist))}m! 한 번 더 가 볼까요?`
      : mood === 'record' ? `벌써 ${fmt(s.dist)}m · 더 멀리 가 볼까요?` : mood === 'boss' ? '한 번만 더 몰아붙여 볼까요?' : `${fmt(s.dist)}m 에서 다시 날 수 있어요`;
    b.add(txt(this, 0, y, praise, 58, '#FFE14D')); y += 80;
    b.add(txt(this, 0, y, hopeLine, 40, '#FFFFFF', { wrap: 860 })); y += 90;
    /* 남은 시간: 숫자 대신 조용히 줄어드는 막대 + 작은 숫자 */
    const barW = 640;
    b.add(this.add.rectangle(-barW / 2, y, barW, 18, 0x120830).setOrigin(0, 0.5).setStrokeStyle(3, 0x8A6AD8));
    const bar = this.add.rectangle(-barW / 2 + 3, y, barW - 6, 12, 0xB89AFF).setOrigin(0, 0.5); b.add(bar);
    const cnt = txt(this, barW / 2 + 50, y, `${REVIVE_SEC}`, 40, '#D8CCFF'); b.add(cnt);
    let left = REVIVE_SEC, busy = false;
    const close = () => { timer.remove(); pop.close(); };
    const timer = this.time.addEvent({ delay: 1000, repeat: REVIVE_SEC - 1, callback: () => {
      left--; cnt.setText(`${left}`); bar.width = (barW - 6) * left / REVIVE_SEC;
      if (left <= 0 && !busy) { pop.close(); this.finish(); }
    } });
    y += 130;
    const go = how => { close(); if (how !== 'gem') this.oadRevives++; this.doRevive(how); };
    /* 요청 중엔 버튼을 잠금 · 확인 창 · 광고 동안 게임은 bm.onPause 로 멈춤(카운트다운도 멈춤) */
    const ask = async (fn, btn) => {
      if (busy) return; busy = true;
      const r = await fn();
      busy = false;
      if (r.ok) return true;
      if (left <= 0) { pop.close(); this.finish(); return false; }
      const msg = { short: '골드가 조금 모자라요', limit: '오늘은 여기까지예요 · 내일 또 만나요', login: '로그인하면 쓸 수 있어요', cancel: '' }[r.reason];
      if (msg) toast(this, msg, '#FFE8A8', H * 0.25);
      if (r.reason === 'limit' && btn) btn.setEnabled(false);
      return false;
    };
    if (offerOad) {
      if (oadN === 0) {
        /* 광고 | 🪙20 — 같은 크기로 나란히 (둘 중 되는 것만이면 가운데 하나) */
        const two = adOk && goldOk, bw = two ? 420 : 560;
        if (adOk) {
          const ab = button(this, two ? -225 : 0, y, info.owned ? '소장 혜택 · 바로' : '광고 보고 이어하기', () => ask(() => bm.rewardedAd('revive'), ab).then(ok => ok && go('ad')),
            { key: 'btn_gold', w: bw, h: 150, size: 38 });
          b.add(ab);
        }
        if (goldOk) {
          const gb = button(this, two ? 225 : 0, y, `🪙 ${bm.price('continue')} 이어하기`, () => ask(() => bm.spend('continue'), gb).then(ok => ok && go('gold')),
            { key: 'btn_gold', w: bw, h: 150, size: 38 });
          b.add(gb);
        }
      } else {
        const gb = button(this, 0, y, `🪙 ${bm.price('continue2')} 한 번 더 이어하기`, () => ask(() => bm.spend('continue2'), gb).then(ok => ok && go('gold')),
          { key: 'btn_gold', w: 600, h: 150, size: 40 });
        b.add(gb);
      }
      y += 160;
    }
    if (offerGem) {
      const yes = button(this, 0, y, `별가루 ${gemCost}개로 이어하기`, () => {
        if (busy) return;
        if (!pay({ gems: gemCost })) { yes.setLabel('별가루가 조금 모자라요'); return; }
        go('gem');
      }, { key: offerOad ? 'btn_purple' : 'btn_gold', w: 600, h: 130, size: 38, icon: 'cur_gem' });
      b.add(yes);
      if (d.gems < gemCost) yes.setEnabled(false);
      y += 150;
    }
    b.add(button(this, 0, y, '결과 보기', () => { if (busy) return; close(); this.finish(); }, { key: 'btn_purple', w: 600, h: 130, size: 38 }));
    window.__revivePop = pop;
  }

  doRevive(how = 'gem') {
    const s = this.s;
    this.over = false;
    this.reviveAt = s.dist; this.revivedHow = how;
    this.run.revive();
    this.witch.setAngle(0).setPosition(s.player.x, s.player.y + 34);
    this.catSprites.forEach(c => c.setAlpha(1));
    if (this.ofx) this.ofx.setVisible(true);
    audio.play('sfx_revive');
    this.fx('sheet_ring', s.player.x, s.player.y, 2);
    this.flashScreen();
    this.popText(W / 2, H * 0.42, '다시 날아올라요!', '#FFE14D', 80, 1000);
  }

  finish() {
    if (this.finished) return; this.finished = true;
    const s = this.s;
    const result = {
      dist: Math.floor(s.dist), score: s.score, coins: Math.floor(s.coins), gems: s.gems, treats: s.treats, crystals: s.crystals, paws: s.paws,
      kills: s.kills, bosses: this.bossKills, sRank: this.sRank, items: this.items, witch: s.witch,
      revived: s.revived, helped: this.helped, afterRevive: s.revived ? Math.floor(s.dist - this.reviveAt) : 0, offers: this.reviveOffers,
    };
    if (!this.bot) noteRun({ dist: s.dist, t: s.t, best: this.bestDist, runsBefore: this.runsBefore, quit: this.quit, helped: this.helped });
    audio.stopMusic();
    this.cameras.main.fadeOut(350, 10, 6, 30);
    /* 판 끝: 전면 광고는 앱이 조건(그룹 · 간격 · 소장)에 맞을 때만 보여 줌 — 판마다 한 번 알림 */
    this.cameras.main.once('camerafadeoutcomplete', () => { (this.bot ? Promise.resolve() : bm.interstitial('round_end')).finally(() => this.scene.start('Result', result)); });
  }

  // 뒤로가기 (One a Day): 게임 중이면 잠시 멈춤 창
  onBack() { if (!this.over && !this.paused) this.pause(); return true; }
  pause() {
    if (this.paused || this.over) return;
    this.paused = true;
    this.frozen = this.tweens.getTweens().filter(t => t.isPlaying()); this.frozen.forEach(t => t.pause()); this.anims.pauseAll();
    audio.duck(0.12);
    const pop = popup(this, '잠시 멈춤', 820, { closable: false, depth: 2000, onBack: () => resume() });
    const b = pop.box;
    const resume = () => { pop.close(); this.time.delayedCall(160, () => { this.paused = false; (this.frozen || []).forEach(t => t.resume()); this.frozen = null; this.anims.resumeAll(); audio.duck(0.38); }); };
    b.add(button(this, 0, -130, '계속하기', resume, { key: 'btn_gold', w: 520, h: 150 }));
    b.add(button(this, 0, 40, '로비로', () => { pop.close(); this.paused = false; (this.frozen || []).forEach(t => t.resume()); this.frozen = null; this.anims.resumeAll(); this.s.status = 'dead'; this.quit = true; this.finish(); }, { key: 'btn_purple', w: 440, h: 120 }));
    const d = load();
    const sfx = button(this, -130, 200, '', () => { audio.toggleSfx(); sfxIc.setTexture(d.sfx ? 'ico_sound' : 'ico_sound_off'); }, { key: 'btn_icon', w: 150, h: 150 });
    const sfxIc = this.add.image(-130, 194, d.sfx ? 'ico_sound' : 'ico_sound_off').setDisplaySize(96, 96);
    const mus = button(this, 130, 200, '', () => { audio.toggleMusic(); musIc.setTexture(d.music ? 'ico_music' : 'ico_music_off'); if (d.music) audio.duck(0.12); }, { key: 'btn_icon', w: 150, h: 150 });
    const musIc = this.add.image(130, 194, d.music ? 'ico_music' : 'ico_music_off').setDisplaySize(96, 96);
    b.add([sfx, sfxIc, mus, musIc]);
  }
}
