// 홈: 메인 원정 · 오늘의 도전 · 아케이드 · 덱 · 미션 · 연속 출석 (카드마다 받을 보상 한 줄) · 들어가는 버튼은 모두 '입장'(QA 25)
import { W, H, TITLE, TITLE_EN } from '../config.js?v=0.99.27';
import { T, C, fmt, panel, btn, iconBtn, pillBtn, rewardBlock, popup, toast } from '../pui.js?v=0.99.27';
import { inOAD, exitToOAD } from '../oad.js?v=0.99.27';
import { audio } from '../audio.js?v=0.99.27';
import { load } from '../save.js?v=0.99.27';
import * as M from '../meta.js?v=0.99.27';
import * as BM from '../bmflow.js?v=0.99.27';
import { guidePop } from '../guide.js?v=0.99.27';
import { RUNES } from '../core/sim.js?v=0.99.27';

export class HomeScene extends Phaser.Scene {
  constructor() { super('Home'); }
  create() {
    BM.refreshHello();   /* 앱 가격표가 늦게 왔으면 다시 물어 둠 (다음 판 아이템 줄 · v0.10.1) */
    const d = load();
    const bg = this.add.image(W / 2, H / 2, M.bgKey()); bg.setScale(Math.max(W / bg.width, H / bg.height));
    this.add.rectangle(W / 2, H / 2, W, H, 0x05061A, 0.45);
    const ci = M.checkIn(); M.checkUnlocks();
    const sp = Math.max(0, (H - 1920) / 6);
    /* 원어데이로 (QA 21): 원어데이 안 = 앱에 나가기(oad:exit) · 단독 링크 = 원어데이 사이트로 */
    this.exitBtn = pillBtn(this, 160, 92, 230, 96, 'i_exit', '원어데이', () => this.toOAD());
    this.add.image(312, 92, 'i_flame').setDisplaySize(44, 44).setTint(0xFF8A3D);
    T(this, 342, 92, `${d.streak.count}일 연속`, 30, C.text, { ox: 0, w: 800 });
    this.add.image(W - 420, 92, 'i_star').setDisplaySize(44, 44).setTint(0x8FE3FF);
    iconBtn(this, W - 200, 92, 'i_land', () => this.fields(), 96);
    this.cry = T(this, W - 388, 92, fmt(d.crystals), 34, '#8FE3FF', { ox: 0, w: 900 });
    iconBtn(this, W - 80, 92, 'i_gear', () => this.settings(), 96);
    // 로고: 룬 주사위 3개 + 제목
    const ly = 290 + sp * 0.6;
    ['flame', 'frost', 'storm'].forEach((r, i) => { const x = W / 2 + (i - 1) * 120, im = this.add.image(x, ly - 60, `die_${r}`).setDisplaySize(110, 110).setAngle((i - 1) * 10); this.add.image(x, ly - 60, `rune_${r}`).setDisplaySize(60, 60).setAngle((i - 1) * 10); this.tweens.add({ targets: im, y: ly - 72, duration: 1400 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); });
    T(this, W / 2, ly + 70, TITLE, 108, C.text, { w: 900, ls: 4 });
    T(this, W / 2, ly + 150, TITLE_EN, 28, '#B59BFF', { w: 800, ls: 14 });
    // 메인 원정 (2026-11-03 '생존 원정'에서 이름만 바꿈 · 내부 id 'run' 그대로) — 다음 이정표 보상 미리보기
    const cy = 690 + sp * 1.5, nm = M.nextMilestone();
    this.add.existing(panel(this, W / 2, cy, 960, 280));
    T(this, 110, cy - 104, 'MAIN EXPEDITION', 24, '#B59BFF', { ox: 0, w: 900, ls: 6 });
    T(this, 110, cy - 56, '메인 원정', 58, C.text, { ox: 0, w: 900 });
    this.add.image(126, cy + 8, 'i_crown').setDisplaySize(38, 38).setTint(0xF5C451);
    T(this, 160, cy + 8, `최고 웨이브 ${d.best}`, 34, C.gold, { ox: 0, w: 800 });
    /* 보상 (QA 8 → 20): '보상' 꼬리표 + 한 줄에 한 항목 · 둘째 줄 = 다음 이정표 */
    this.rwRun = rewardBlock(this, 110, cy + 62, [...M.REWARD.run, M.milestoneLine(nm)], { gap: 38 });
    btn(this, W - 260, cy + 6, 300, 130, '입장', () => this.go('Play', { mode: 'run' }), { style: 'gold', icon: 'i_play', size: 44 });
    // 오늘의 도전
    const dc = M.dailyChallenge(), dy = cy + 320 + sp;
    // 오늘의 도전 (왼쪽) · 아케이드 (오른쪽) — 버튼이 카드 안에 들어오게 여유 있게
    const hw = 470, lx = W / 2 - hw / 2 - 10, rx = W / 2 + hw / 2 + 10, cy2 = dy + 45, chh = 370;   /* 보상 두 줄이 들어가게 아래로 60 늘림 */
    this.add.existing(panel(this, lx, cy2, hw, chh, { tone: 'gold' }));
    T(this, lx - hw / 2 + 36, dy - 106, 'DAILY CHALLENGE', 20, C.gold, { ox: 0, w: 900, ls: 4 });
    T(this, lx - hw / 2 + 36, dy - 60, '오늘의 도전', 42, C.text, { ox: 0, w: 900 });
    dc.deck.forEach((r, i) => { const x = lx - hw / 2 + 70 + i * 74; this.add.image(x, dy - 4, `die_${r}`).setDisplaySize(62, 62); this.add.image(x, dy - 4, `rune_${r}`).setDisplaySize(36, 36); });
    this.rwDaily = rewardBlock(this, lx - hw / 2 + 36, dy + 56, M.REWARD.daily, { size: 21, gap: 34 });
    btn(this, lx, dy + 170, hw - 80, 84, dc.tries ? `입장 · 기록 ${dc.best}` : '입장', () => this.go('Play', { mode: 'daily' }), { style: 'gold', size: 30 });
    this.add.existing(panel(this, rx, cy2, hw, chh));
    T(this, rx - hw / 2 + 36, dy - 106, 'ARCADE', 20, '#B59BFF', { ox: 0, w: 900, ls: 4 });
    T(this, rx - hw / 2 + 36, dy - 60, '아케이드', 42, C.text, { ox: 0, w: 900 });
    T(this, rx - hw / 2 + 36, dy - 6, '보스 러시 · 랜덤 아레나\n단일 룬 시련 · 심연 광산', 22, C.sub, { ox: 0, w: 800, lh: 6, align: 'left' });
    this.rwArcade = rewardBlock(this, rx - hw / 2 + 36, dy + 56, M.REWARD.arcade, { size: 21, gap: 34 });
    btn(this, rx, dy + 170, hw - 80, 84, '입장', () => this.go('Arcade'), { style: 'indigo', size: 32 });
    // 덱 미리보기 + 버튼
    const ky = dy + 360 + sp;
    T(this, 110, ky - 60, '내 덱', 34, C.text, { ox: 0, w: 900 });
    // 오늘의 상점 입구 (QA 13: 등급업용 룬 카드 · 무료 선물이 남았으면 빨간 점) — QA 24: 룬 컬렉션(유리)과 다른 장밋빛 + 가방 아이콘
    btn(this, 390, ky - 62, 260, 64, '오늘의 상점', () => this.go('Altar', { shop: true }), { style: 'shop', icon: 'i_bag', size: 24 });
    d.deck.forEach((r, i) => { const x = 130 + i * 116; this.add.image(x, ky + 20, `die_${r}`).setDisplaySize(100, 100); this.add.image(x, ky + 20, `rune_${r}`).setDisplaySize(56, 56); T(this, x, ky + 86, `★${d.tiers[r] || 1}`, 22, C.sub, { w: 800 }); });
    const dot = (x, y) => { const c = this.add.circle(x, y, 13, 0xFF5A7A).setStrokeStyle(3, 0x0B1026); this.tweens.add({ targets: c, scale: 1.25, duration: 500, yoyo: true, repeat: -1 }); };
    btn(this, W - 180, ky - 62, 260, 84, '룬 컬렉션', () => this.go('Deck'), { style: 'ghost', icon: 'i_grid', size: 28 });
    if (M.hasNew() || M.upgradeReady()) dot(W - 62, ky - 90);   /* 새 룬 · 등급업 가능한 룬 */
    if (M.shopGift()) dot(512, ky - 86);
    btn(this, W - 180, ky + 30, 260, 84, '룬 제단', () => this.go('Altar'), { style: 'indigo', icon: 'i_star', size: 30 });
    if (M.freeToday() || d.keys > 0 || d.legendTix > 0) dot(W - 62, ky + 2);
    btn(this, W - 180, ky + 122, 260, 84, `미션 보상 ${M.road().level}`, () => this.go('Road'), { style: 'gold', icon: 'i_crown', size: 28 });
    if (M.roadUnclaimed()) dot(W - 62, ky + 94);
    // 미션
    this.my = ky + 345 + sp; this.drawMissions();
    audio.music('bgm_lobby', this);
    this.cameras.main.fadeIn(260, 5, 6, 26);
    if (ci) this.time.delayedCall(400, () => toast(this, `🔥 ${ci.count}일 연속 · 수정 +${ci.bonus}`, '#8FE3FF', 200 + sp));
    window.__home = this;
  }
  drawMissions() {
    if (this.mBox) this.mBox.destroy();
    const my = this.my, c = this.add.container(0, 0); this.mBox = c;
    c.add(panel(this, W / 2, my, 960, 330));
    c.add(T(this, 110, my - 120, '오늘의 미션', 34, C.text, { ox: 0, w: 900 }));
    M.missions().forEach((m, i) => {
      const y = my - 46 + i * 84, k = Math.min(1, m.prog / m.goal), g = this.add.graphics();
      c.add(T(this, 110, y - 12, m.text, 30, m.claimed ? C.dim : C.text, { ox: 0, w: 800 }));
      g.fillStyle(0xFFFFFF, 0.08).fillRoundedRect(110, y + 18, 520, 10, 5).fillStyle(m.done ? 0x5BE39A : 0xB59BFF, 1).fillRoundedRect(110, y + 18, Math.max(10, 520 * k), 10, 5); c.add(g);
      if (m.claimed) c.add(T(this, W - 160, y, '받음', 28, C.dim, { w: 800 }));
      else if (m.done) c.add(btn(this, W - 170, y + 4, 200, 72, `◆ ${m.reward}`, () => { const r = M.claim(m.id); if (r) { audio.play('sfx_power', { volume: 0.6 }); toast(this, `수정 +${r}`, '#8FE3FF'); this.cry.setText(fmt(load().crystals)); this.drawMissions(); } }, { style: 'gold', size: 28 }));
      else c.add(T(this, W - 160, y, `◆ ${m.reward}`, 28, '#8FE3FF', { w: 800 }));
    });
  }
  // 전장 꾸미기: 배경과 길 색 (수정으로 구매 · 영구) + 원어데이 전용 두 가지(골드 상품 · 소장자 전용 — 원어데이 밖에선 숨김)
  fields() {
    const d = load(), list = M.FIELDS.filter(BM.fieldShown), rows = Math.ceil(list.length / 4), ph = 340 + rows * 470;
    const p = popup(this, '전장 꾸미기', 1020, ph), c = p.content, top = -ph / 2 + 150;
    c.add(T(this, 0, top, '배경과 길 빛깔이 바뀌어요 · 겉모습만 · 한 번 사면 영구', 26, C.sub, { w: 800 }));
    list.forEach((f, i) => {
      const col = i % 4, row = Math.floor(i / 4), n = Math.min(4, list.length - row * 4);
      const x = (col - (n - 1) / 2) * 232, y = top + 270 + row * 470, own = f.owner || f.sku ? BM.fieldOpen(f) : !!d.fields[f.id], on = M.field().id === f.id;
      const fr = this.add.graphics(); fr.fillStyle(0x0B1026, 1).fillRoundedRect(x - 98, y - 200, 196, 300, 18).lineStyle(on ? 6 : 3, on ? 0xF5C451 : f.accent, on ? 1 : 0.6).strokeRoundedRect(x - 98, y - 200, 196, 300, 18); c.add(fr);
      const im = this.add.image(x, y - 50, `bg_${f.id}`); im.setScale(Math.max(184 / im.width, 288 / im.height)); im.setCrop((im.width - 184 / im.scaleX) / 2, (im.height - 288 / im.scaleY) / 2, 184 / im.scaleX, 288 / im.scaleY); c.add(im);
      if (!own) c.add(this.add.image(x, y - 50, 'i_lock').setDisplaySize(44, 44).setAlpha(0.85));
      if (f.owner || f.sku) c.add(T(this, x, y - 172, f.owner ? '소장자 전용' : '원어데이', 18, f.owner ? '#C9B8FF' : C.gold, { w: 900, ls: 2 }));
      c.add(T(this, x, y + 140, f.name, 26, on ? C.gold : C.text, { w: 900 }));
      const label = on ? '사용 중' : own ? '사용' : f.owner ? '소장하면 열려요' : f.sku ? `🪙${BM.price(f.sku)}` : `◆${f.cost}`;
      c.add(btn(this, x, y + 210, 196, 80, label, async () => {
        if (on || this.busy) return;
        if (!own && f.owner) return toast(this, '원어데이에서 이 게임을 소장하면 무료로 열려요', C.sub);
        if (!own && f.sku) {
          this.busy = true; const run = this.runId, r = await BM.buyItem(f.sku); if (run !== this.runId) return; this.busy = false;
          if (!r.ok) { const m = BM.failMsg(r); if (m) toast(this, m, C.sub); return; }
        } else if (!own && !M.buyField(f.id)) return toast(this, '수정이 부족해요', C.sub);
        M.setField(f.id);
        audio.play(own ? 'sfx_click' : 'sfx_awaken', { volume: 0.6 }); p.close(); this.time.delayedCall(160, () => this.scene.restart());
      }, { style: on ? 'ghost' : own ? 'indigo' : f.owner ? 'ghost' : 'gold', size: f.owner && !own ? 20 : own ? 28 : 26, ls: f.sku ? 0 : 1 }));
    });
  }
  settings() {
    const d = load(), pop = popup(this, '설정', 860, 900);
    const row = (y, label, on, fn) => { pop.content.add(T(this, -260, y, label, 40, C.text, { ox: 0 })); const b = btn(this, 200, y, 220, 96, on ? '켜짐' : '꺼짐', () => { fn(); b.setLabel(b.label.text === '켜짐' ? '꺼짐' : '켜짐'); }, { style: on ? 'green' : 'ghost', size: 34 }); pop.content.add(b); };
    row(-250, '효과음', d.sfx, () => audio.toggleSfx()); row(-120, '배경음악', d.music, () => audio.toggleMusic());
    // 도움말: 모드 안내 다시 보기 (처음 들어갈 때 한 번 뜨는 그 장)
    pop.content.add(T(this, 0, 0, '도움말 · 모드 안내 다시 보기', 30, C.sub, { w: 800 }));
    Object.entries(M.GUIDE).forEach(([k, g], i) => pop.content.add(btn(this, (i % 2 ? 1 : -1) * 190, 100 + Math.floor(i / 2) * 104, 350, 88, g.name, () => { pop.close(); this.time.delayedCall(160, () => guidePop(this, k, { first: false, cta: '확인', extra: k === 'run' ? this.itemLine() : null })); }, { style: 'ghost', size: 28 })));
  }
  // 메인 원정 아이템 안내 한 줄 (원어데이 안에서 가격이 있을 때만)
  itemLine() { return BM.itemPrice('bomb') ? '위기 땐 판 아래 아이템(원어데이 골드)으로 자동 합성 · 룬 제거 · 1성 교체 · 폭탄 · 메인 원정에서만' : null; }
  /* 원어데이로: 원어데이 안이면 SDK 나가기(oad.js exitToOAD = oad:exit) · 단독 링크면 원어데이 사이트 (테스트 서버에서 열었으면 그 서버 첫 화면) */
  toOAD() {
    if (inOAD) return exitToOAD();
    const h = location.hostname, site = /(^|\.)oneaday\.kr$/.test(h) ? `${location.protocol}//${h}/` : 'https://oneaday.kr/';
    audio.stopMusic(); location.href = site;
  }
  go(k, data) { audio.stopMusic(); this.cameras.main.fadeOut(220, 5, 6, 26); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(k, data)); }
}
