// 숨은 물건 맵 (Find It Out® 식): 고밀도 세로 맵 · 아래 아이콘 5칸(찾으면 다음 물건이 채워짐) · 실패·시간 제한 없음
// + 이야기 단서: 분홍 테두리 아이콘 · 찾으면 서윤 혼잣말 · 물건마다 코인 · 힌트는 코인
import { W, H } from '../config.js?v=0.99.14';
import { T, C, btn, iconBtn, popup, toast } from '../ui.js?v=0.99.14';
import { audio } from '../audio.js?v=0.99.14';
import { goPrev } from '../nav.js?v=0.99.14';
import { pushBack } from '../oad.js?v=0.99.14';
import { load, save } from '../save.js?v=0.99.14';
import { Viewer } from '../viewer.js?v=0.99.14';
import { EPISODES, epNo, hero } from '../episodes.js?v=0.99.14';
import { starOnce } from '../cafe/state.js?v=0.99.14';
import { advance, passed, stepOf, replayResult, medal, TIERS } from '../replay.js?v=0.99.14';

import { HINT_COST, roundEnd, oadOn, owner, adLeft, watchAd, failText, peekPrice, buyPeek, PEEK_SEC } from '../bm.js?v=0.99.14';
import { hintOffer } from '../bmui.js?v=0.99.14';

const SLOTS = 5, SPAM = { n: 3, t: 2, lock: 3 };
// 1~3화는 아래 칸 그림을 크게 (QA 시트 #6) · 1화 첫 판은 10초 동안 못 찾으면 자리를 부드럽게 안내 (QA 시트 #2, 무료 · 힌트로 안 셈)
export const BIG_EPS = 3, GUIDE = { sec: 10 };
export class HuntScene extends Phaser.Scene {
  constructor() { super('Hunt'); }
  create(data) {
    const ep = this.ep = EPISODES.find(e => e.id === data.id), hu = ep.hunt, d = load();
    // 이미 끝낸 판이면 새 판(다시 하기): 진행 저장 없이 처음부터 · 시간 · 힌트로 등급
    // 다 본 화(done): 등급 · 기록이 붙는 다시 하기 / 진행 중인 화에서 이미 지난 판: 새 판으로 다시 (컷씬 · 흐름 그대로, 보상 없음)
    const again = passed(ep.id, 'hunt'); this.replay = again && stepOf(ep.id) === 'done'; this.fresh = again; if (!again) advance(ep.id, 'hunt');
    const prog = d.ep[ep.id] ||= { step: 'hunt' }; prog.found ||= []; save();
    Object.assign(this, { misses: [], lock: 0, t: 0, ended: false, paused: false, blur: null, got: 0, hints: 0, idle: 0, guides: 0, peeks: 0 });
    const idx = EPISODES.indexOf(ep); this.big = idx < BIG_EPS; this.guideOn = idx === 0 && !this.replay;
    // 순서: 일반 물건 사이사이에 단서 · 결정적 단서(last)는 맨 끝
    const normal = hu.items.filter(i => !i.clue).sort(() => Math.random() - 0.5), clues = hu.items.filter(i => i.clue && !i.last), last = hu.items.find(i => i.last);
    const q = [...normal]; clues.forEach((c, k) => q.splice(Math.min(q.length, 3 + k * 4), 0, c)); if (last) q.push(last);
    this.queue = this.fresh ? q : q.filter(i => !prog.found.includes(i.n)); this.total = hu.items.length; this.got = this.total - this.queue.length;
    this.add.rectangle(W / 2, H / 2, W, H, 0x2E1A2A);
    const top = 150, trayH = this.big ? 370 : 336; this.trayH = trayH;
    this.v = new Viewer(this, hu.map, 0, top, W, H - top - trayH, { maxZoom: 4, onTap: (ip, p, later) => this.tap(ip, p, later) });
    this.v.zoom = 1.6; this.v.cy = hu.h * 0.35; this.v.apply();
    // 위: 뒤로 · 화 제목 · 진행 · 코인
    const bar = this.add.graphics(); bar.fillStyle(0x2E1A2A, 1).fillRect(0, 0, W, top); bar.fillStyle(0xFF9DB6, 0.6).fillRect(0, top - 3, W, 3);
    iconBtn(this, 72, 76, 'back', () => this.leave(), 88, { dark: true });
    T(this, W / 2, 56, `${epNo(ep)}화 · 단서 찾기${this.replay ? ' · 다시 하기' : ''}`, 34, '#FFFFFF', { w: 900 });
    this.progT = T(this, W / 2, 104, '', 24, C.sub, { w: 800 });
    this.coinT = T(this, W - 40, 76, '', 32, C.gold, { ox: 1, w: 900 });
    // 아래: 아이콘 5칸 + 힌트
    const ty = H - trayH, tg = this.add.graphics(); tg.fillStyle(0x2E1A2A, 1).fillRect(0, ty, W, trayH); tg.fillStyle(0xFF9DB6, 0.6).fillRect(0, ty, W, 3);
    this.slots = []; const sw = this.box = this.big ? 196 : 160, gap = this.big ? 12 : 16, x0 = (W - (SLOTS * sw + (SLOTS - 1) * gap)) / 2;
    for (let k = 0; k < SLOTS; k++) { const x = x0 + sw / 2 + k * (sw + gap), y = ty + 22 + sw / 2; const c = this.add.container(x, y); this.slots.push({ c, x, y, it: null }); }
    // 아래 줄: 물건 이름 · [미리 보기 🪙] · [광고 단서] · [돋보기 ● 10]
    const by = ty + trayH - 100, cap = (x, t, col) => T(this, x, by + 70, t, 22, col, { w: 900, lh: 2 });   /* 버튼 아래 두 줄 이름표 */
    this.nameT = T(this, 60, by, '', 24, C.sub, { ox: 0, w: 800 });
    this.hintB = iconBtn(this, W - 90, by, 'hint', () => this.hint(), 100); this.hintC = cap(W - 90, `힌트\n● ${HINT_COST}`, C.gold);
    // 광고 보고 주요 단서 자리 (원어데이 안 · 하루 3 · 앱 광고 한도 안)
    if (oadOn() && adLeft('clue') > 0) { this.clueB = iconBtn(this, W - 222, by, 'ad', () => this.clueAd(), 100); this.clueC = cap(W - 222, owner() ? '단서 위치\n바로' : '단서 위치\n광고', '#FFB6CB'); }
    // 그림 미리 보기 (골드 · 서버 가격표에 있을 때만)
    if (peekPrice()) { const x = this.clueB ? W - 354 : W - 222; this.peekB = iconBtn(this, x, by, 'eye', () => this.peek(), 100); this.peekC = cap(x, `미리 보기\n🪙${peekPrice()}`, C.gold); }
    this.fill(); this.ui(); this.cameras.main.fadeIn(300, 30, 10, 26); window.__hunt = this;
    // 다 찾은 채로 다시 들어온 경우(마지막 단서 대사 중 나갔다 옴 등) 바로 마무리
    if (this.got >= this.total) this.time.delayedCall(600, () => this.win());
    if (!prog.found.length) this.time.delayedCall(500, () => toast(this, '아래 그림과 같은 물건을 맵에서 찾아요 · 두 손가락으로 확대', top + 110));
  }
  ui() { const md = medal(this.ep.id, 'hunt'); this.progT.setText(`찾은 물건 ${this.got} / ${this.total}${this.replay ? ` · 시간 ${Math.floor(this.t / 60)}:${String(Math.floor(this.t % 60)).padStart(2, '0')}${md >= 0 ? ` · 최고 ${TIERS[md].n}` : ''}` : ''}`); this.coinT.setText(`● ${load().coins}`); }
  // 물건 확대 조각: 화별 2배 자산 시트(hmN.webp, 256칸 · tools/hm_thumbs.py — QA 시트 #4)에서 · 시트가 없으면 맵에서 2배 칸으로 부드럽게 잘라 씀
  thumb(it) {
    if (it.clue) return it.clue;
    const key = `hm_${this.ep.id}_${it.n}`; if (this.textures.exists(key)) return key;
    const sk = `hm${this.ep.no}`, k = this.ep.hunt.items.indexOf(it), Z = 256, c = this.textures.createCanvas(key, Z, Z), g = c.getContext(); g.imageSmoothingQuality = 'high';
    g.beginPath(); if (g.roundRect) g.roundRect(0, 0, Z, Z, 34); else g.rect(0, 0, Z, Z); g.clip();   /* 칸의 둥근 모서리 안에 맞게 */
    if (this.textures.exists(sk) && k >= 0) g.drawImage(this.textures.get(sk).getSourceImage(), (k % 6) * Z, Math.floor(k / 6) * Z, Z, Z, 0, 0, Z, Z);
    else { const src = this.textures.get(this.ep.hunt.map).getSourceImage(), r = it.r * 1.2; g.drawImage(src, it.x - r, it.y - r, r * 2, r * 2, 0, 0, Z, Z); }
    c.refresh(); return key;
  }
  // 빈 칸에 다음 물건 채우기
  fill() {
    for (const s of this.slots) {
      if (s.it) continue; const it = this.queue.shift(); if (!it) { s.c.removeAll(true); s.c.disableInteractive(); continue; }
      s.it = it; s.c.removeAll(true);
      const B = this.box, h = B / 2, bg = this.add.graphics(); bg.fillStyle(it.clue ? 0x5A2A48 : 0xFFFFFF, 1).fillRoundedRect(-h, -h, B, B, 28).lineStyle(it.clue ? 6 : 3, it.clue ? 0xFF9DB6 : 0xE8C8D4, 1).strokeRoundedRect(-h, -h, B, B, 28);
      /* 물건 조각은 칸을 거의 꽉 채움(둥근 모서리 안) · 단서 그림은 여백을 조금 */
      const im = this.add.image(0, 0, this.thumb(it)); im.setScale((it.clue ? B - 30 : B - 14) / Math.max(im.width, im.height));
      s.c.add([bg, im]); if (it.clue) { s.c.add(T(this, 0, -h - 14, '단서', 20, '#FFB6CB', { w: 900 })); this.tweens.add({ targets: bg, alpha: 0.7, duration: 600, yoyo: true, repeat: -1 }); }
      s.c.setScale(0); this.tweens.add({ targets: s.c, scale: 1, duration: 260, ease: 'Back.easeOut' });
      s.c.setSize(B, B).setInteractive({ useHandCursor: true }).off('pointerup').on('pointerup', () => { this.nameT.setText(it.n); this.tweens.add({ targets: s.c, scale: 1.1, duration: 100, yoyo: true }); });
    }
  }
  update(time, delta) { if (this.ended || this.paused) return; const dt = Math.min(0.05, delta / 1000); const s0 = Math.floor(this.t); this.t += dt;
    if (this.guideOn) { this.idle += dt; if (this.idle >= GUIDE.sec) { this.idle = 0; this.guide(); } } if (this.replay && Math.floor(this.t) !== s0 && this.progT) this.ui(); if (this.lock > 0) { this.lock -= dt; if (this.lock <= 0 && this.blur) { this.blur.destroy(); this.blur = null; } } }
  tap(ip, p, later) {
    if (this.ended || this.paused) return; if (this.lock > 0) { audio.play('sfx_miss', { volume: 0.3 }); return; }
    const s = this.slots.find(s => s.it && (ip.x - s.it.x) ** 2 + (ip.y - s.it.y) ** 2 <= s.it.r ** 2);
    if (s) return this.found(s);
    if (later) return later(() => this.miss(p));
    this.miss(p);
  }
  miss(p) {
    if (this.ended || this.paused) return;
    audio.play('sfx_miss', { volume: 0.45 }); audio.buzz(25);
    const x = this.add.image(p.x, p.y, 'spark').setTint(0xD9573B).setScale(0.5).setDepth(40); this.tweens.add({ targets: x, alpha: 0, scale: 0.15, duration: 380, onComplete: () => x.destroy() });
    this.misses = this.misses.filter(t => this.t - t < SPAM.t); this.misses.push(this.t);
    if (this.misses.length >= SPAM.n) { this.misses = []; this.lock = SPAM.lock; this.blur = this.add.rectangle(W / 2, H / 2, W, H, 0x1A0814, 0.4).setDepth(50); toast(this, '천천히 살펴봐요 · 잠깐 숨 고르기'); }
  }
  found(s) {
    const it = s.it, d = load(); s.it = null; this.got++; this.idle = 0; if (!this.fresh) { d.ep[this.ep.id].found.push(it.n); d.coins += it.clue ? 5 : 1; save(); }
    audio.play('sfx_find', { volume: 0.7 });
    const ring = this.add.image(it.x, it.y, 'ring').setTint(it.clue ? 0xFF7FA6 : 0xFFE08A); ring.setScale(it.r * 2.8 / 160); this.v.layer.add(ring); this.tweens.add({ targets: ring, scale: it.r * 2.2 / 160, duration: 280, ease: 'Back.easeOut' });
    const sp = this.v.toScreen(it.x, it.y);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, gg = this.add.image(sp.x, sp.y, 'spark').setTint(it.clue ? 0xFFB6CB : 0xFFE9A0).setScale(0.4).setDepth(40); this.tweens.add({ targets: gg, x: sp.x + Math.cos(a) * 90, y: sp.y + Math.sin(a) * 90, alpha: 0, scale: 0.1, duration: 500, onComplete: () => gg.destroy() }); }
    const fly = this.add.image(sp.x, sp.y, this.thumb(it)).setDepth(45); fly.setDisplaySize(it.r * 2 * this.v.s, it.r * 2 * this.v.s);
    this.tweens.add({ targets: fly, x: s.x, y: s.y, displayWidth: 130, displayHeight: 130, alpha: 0.2, duration: 450, ease: 'Cubic.easeIn', onComplete: () => { fly.destroy(); this.fill(); } });
    const cn = T(this, sp.x, sp.y - 40, this.fresh ? '찾았다!' : `● +${it.clue ? 5 : 1}`, 30, C.gold, { w: 900, shadow: true }).setDepth(46); this.tweens.add({ targets: cn, y: sp.y - 110, alpha: 0, duration: 800, onComplete: () => cn.destroy() });
    this.ui();
    if (it.clue) this.time.delayedCall(500, () => this.monologue(it));
    else if (this.got >= this.total) this.time.delayedCall(700, () => this.win());
  }
  // 단서를 찾으면 서윤의 혼잣말
  monologue(it) {
    this.paused = true; const root = this.add.container(0, 0).setDepth(900);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x1A0814, 0.55).setInteractive(); root.add(dim);
    const ic = this.add.image(W / 2, H * 0.3, it.clue); ic.setScale(0); root.add(ic); this.tweens.add({ targets: ic, scale: 300 / Math.max(ic.width, ic.height), duration: 380, ease: 'Back.easeOut' });
    const face = this.add.image(W / 2 - 250, H - 380, hero(this.ep).face).setOrigin(0.5, 1); face.setScale(560 / face.height); root.add(face);
    const g = this.add.graphics(); g.fillStyle(0xFFFFFF, 0.97).fillRoundedRect(40, H - 400, W - 80, 300, 34).lineStyle(4, 0xFF9DB6, 1).strokeRoundedRect(40, H - 400, W - 80, 300, 34); root.add(g);
    root.add(T(this, 90, H - 330, `단서 발견 · ${it.n}`, 28, '#E8628A', { ox: 0, w: 900 }));
    root.add(T(this, 90, H - 280, it.line, 36, C.ink, { ox: 0, oy: 0, w: 700, wrap: W - 180, lh: 14, align: 'left' }));
    audio.play('sfx_hint', { volume: 0.6 });
    const unback = pushBack(() => { if (!root.scene) return false; done(); return true; }); this.events.once('shutdown', unback);
    const done = () => { if (!root.scene) return; unback(); root.destroy(); this.paused = false; if (this.got >= this.total) this.time.delayedCall(300, () => this.win()); };
    dim.on('pointerup', () => done());
  }
  hint() {
    if (this.ended || this.paused) return; const d = load();
    if (!this.slots.some(s => s.it)) return;
    // 코인이 모자라면 광고 힌트 창 (원어데이 안 · 하루 3번) — 밖이면 예전처럼 안내만
    if (d.coins < HINT_COST) { this.paused = true; return hintOffer(this, d.coins, () => { this.paused = false; this.showHint(); }, () => { this.paused = false; }); }
    d.coins -= HINT_COST; save(); this.showHint();
  }
  showHint(pick) {
    const s = pick || this.slots.find(s => s.it && !s.it.clue) || this.slots.find(s => s.it); if (!s) return;
    this.hints++; this.ui(); audio.play('sfx_hint', { volume: 0.7 });
    this.v.focus(s.it.x, s.it.y, 2.6);
    const g = this.add.image(s.it.x, s.it.y, 'glow').setTint(0xFFE27A).setBlendMode('ADD'); g.setScale(s.it.r * 3.4 / 128); this.v.layer.add(g);
    this.tweens.add({ targets: g, alpha: 0.15, duration: 420, yoyo: true, repeat: 4, onComplete: () => g.destroy() });
    this.tweens.add({ targets: s.c, scale: 1.15, duration: 200, yoyo: true, repeat: 2 });
  }
  // 1화 첫 판 안내 (10초 동안 못 찾았을 때): 칸 하나를 살짝 흔들고 그 자리에 분홍 빛 · 카메라를 부드럽게 옮김 · 힌트 · 별에 안 셈
  guide() {
    const s = this.slots.find(s => s.it && s.it.clue) || this.slots.find(s => s.it); if (!s) return;
    this.guides++; const it = s.it;
    this.v.focus(it.x, it.y, Math.max(this.v.zoom, 2));
    const g = this.add.image(it.x, it.y, 'glow').setTint(0xFFB6CB).setBlendMode('ADD').setAlpha(0); g.setScale(it.r * 4 / 128); this.v.layer.add(g);
    const ring = this.add.image(it.x, it.y, 'ring').setTint(0xFF9DB6).setAlpha(0); ring.setScale(it.r * 3.6 / 160); this.v.layer.add(ring);
    this.tweens.add({ targets: [g, ring], alpha: { from: 0, to: 0.9 }, duration: 700, yoyo: true, repeat: 2, ease: 'Sine.easeInOut', onComplete: () => { g.destroy(); ring.destroy(); } });
    this.tweens.add({ targets: ring, scale: it.r * 2.4 / 160, duration: 1400, repeat: 1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: s.c, scale: 1.1, duration: 220, yoyo: true, repeat: 1 });
    this.nameT.setText(it.n); audio.play('sfx_hint', { volume: 0.4 });
    toast(this, this.guides === 1 ? `「${it.n}」, 바로 이 근처예요 · 천천히 찾아봐요` : '반짝이는 곳 근처를 살펴봐요', 260);
  }
  // 광고 보고 주요 단서 자리: 아래 칸의 단서(분홍)를 짚어 줌 · 칸에 단서가 없으면 물건 하나
  async clueAd() {
    if (this.ended || this.paused || !this.slots.some(s => s.it)) return;
    this.paused = true; const r = await watchAd('clue'); this.paused = false;
    if (!r.ok) { const m = failText(r); if (m) toast(this, m); return; }
    if (!this.scene.isActive()) return;
    const s = this.slots.find(s => s.it && s.it.clue);
    if (!s) toast(this, '지금 칸엔 단서가 없어요 · 물건 하나를 짚어 드릴게요', 260);
    this.showHint(s);
    if (adLeft('clue') <= 0 && this.clueB) { this.clueB.setAlpha(0.4).disableInteractive(); this.clueC.setText('단서 위치\n오늘 다 씀'); }
  }
  // 그림 미리 보기 (🪙): 아래 칸 물건 전부의 자리를 3초 동안 반짝 — 맵 전체가 보이게 물러섬
  async peek() {
    if (this.ended || this.paused || !this.slots.some(s => s.it)) return;
    this.paused = true; const r = await buyPeek(this.ep); this.paused = false;
    if (!r.ok) { const m = failText(r); if (m) toast(this, m); return; }
    if (!this.scene.isActive()) return;
    this.peeks++; audio.play('sfx_hint', { volume: 0.7 });
    const its = this.slots.filter(s => s.it).map(s => s.it), cx = its.reduce((a, i) => a + i.x, 0) / its.length, cy = its.reduce((a, i) => a + i.y, 0) / its.length;
    this.v.focus(cx, cy, 1, true);
    for (const it of its) {
      /* 맵 전체 배율에서도 눈에 띄게 크게 */
      const g = this.add.image(it.x, it.y, 'glow').setTint(it.clue ? 0xFF7FA6 : 0xFFE27A).setBlendMode('ADD'); g.setScale(it.r * 6.5 / 128); this.v.layer.add(g);
      const ring = this.add.image(it.x, it.y, 'ring').setTint(it.clue ? 0xFF7FA6 : 0xFFE27A); ring.setScale(it.r * 3.6 / 160); this.v.layer.add(ring);
      this.tweens.add({ targets: [g, ring], alpha: 0.25, duration: 375, yoyo: true, repeat: Math.round(PEEK_SEC * 1000 / 750) - 1, onComplete: () => { g.destroy(); ring.destroy(); } });
    }
    this.slots.forEach(s => s.it && this.tweens.add({ targets: s.c, scale: 1.08, duration: 300, yoyo: true, repeat: 2 }));
    toast(this, '반짝이는 곳에 지금 찾을 물건이 있어요!', 260);
  }
  win() {
    if (this.ended) return; this.ended = true; roundEnd();
    if (this.replay) return this.time.delayedCall(500, () => replayResult(this, { id: this.ep.id, kind: 'hunt', n: this.total, sec: this.t, slip: this.hints, next: 'mid' })); audio.play('sfx_clear', { volume: 0.7 }); this.cameras.main.flash(300, 255, 230, 240);
    const t = T(this, W / 2, H * 0.42, '단서를 모두 찾았어요!', 60, '#FFFFFF', { w: 900, shadow: true }).setDepth(60).setAlpha(0); this.tweens.add({ targets: t, alpha: 1, y: H * 0.4, duration: 400 });
    advance(this.ep.id, 'mid');
    const got = starOnce(this.ep.id, 'h', Math.max(1, 3 - this.hints));
    if (got) { const s = T(this, W / 2, H * 0.5, '★'.repeat(got) + '  냥카페 별 +' + got, 40, C.gold, { w: 900, shadow: true }).setDepth(60).setAlpha(0); this.tweens.add({ targets: s, alpha: 1, duration: 400, delay: 300 }); }
    this.time.delayedCall(1600, () => { this.cameras.main.fadeOut(250, 30, 10, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Story', { id: this.ep.id, part: 'mid' })); });
  }
  leave() { this.paused = true; const p = popup(this, 760, 460, { onClose: () => { this.paused = false; } }); p.content.add(T(this, 0, -120, '잠깐 쉬어 갈까요?', 40, C.ink, { w: 900 })); p.content.add(T(this, 0, -50, '찾은 물건은 저장돼요', 26, C.dim, { w: 700 })); p.content.add(btn(this, -170, 100, 300, 110, '계속 찾기', () => p.close(), { style: 'cream' })); p.content.add(btn(this, 170, 100, 300, 110, '나가기', () => goPrev(this))); }
  onBack() { if (this.ended) return true; return goPrev(this); }
}
