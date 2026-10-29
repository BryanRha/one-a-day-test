// 상점: 하루 무료 선물(원어데이 안에선 광고로 2배) + 상품
//   원어데이 안: 원화 상품 대신 원어데이 골드 상품(서버 SHOP.beauty 가격) · 원어데이 밖: 원화 상품 '곧 열려요' 그대로
import { W, H } from '../config.js?v=0.92.1';
import { T, R, C, TS, btn, toast, rbox } from '../ui.js?v=0.92.1';
import { audio } from '../audio.js?v=0.92.1';
import { load, save } from '../save.js?v=0.92.1';
import { goPrev } from '../nav.js?v=0.92.1';
import { screen } from '../hud.js?v=0.92.1';
import { PRODUCTS, won, storeOpen, purchase, oadOn, goldPrice, spendGold, goldMsg, GOLD_GEMS, canAd, adLabel, rewardAd, ownerDeco, OWNER_DECO, fillNeed, fillGold, fillPrice, buyFill } from '../store.js?v=0.92.1';
import { ENERGY } from '../data.js?v=0.92.1';
import { today } from '../state.js?v=0.92.1';
import { PIGGY } from '../album.js?v=0.92.1';

const GIFT = { gems: 5, energy: 10 };   /* 오늘의 무료 선물 (광고 보면 2배) */

export class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }
  create() {
    audio.music('bgm_shop');
    const d = load(); let y = screen(this, '상점');
    // 하루 무료 선물
    const free = d.freeGift !== today(), dbl = free && canAd('dailyBonus'), gh = dbl ? 250 : 150;
    rbox(this, 40, y, W - 80, gh, { fill: '#FFFFFF', line: free ? '#E86A8E' : '#F1D2C8', lw: free ? 5 : 3, ox: 0, oy: 0, r: 28 });
    const gi = this.add.image(120, y + 75, 'gen_gift'); gi.setScale(110 / gi.width);
    T(this, 200, y + 50, '오늘의 무료 선물', TS.body + 2, C.ink, { ox: 0, w: 900 }); R(this, 200, y + 104, `◆${GIFT.gems} · ⚡${GIFT.energy} · 매일 다시 받아요`, TS.cap, C.dim, { ox: 0, w: 800 });
    const take = k => { d.freeGift = today(); d.gems += GIFT.gems * k; d.energy += GIFT.energy * k; save(); audio.play(k > 1 ? 'sfx_levelup' : 'sfx_order', { volume: 0.6 }); this.scene.restart(); };
    if (dbl) { /* 하루 보너스 2배: 그냥 받기 · 광고 2배 같은 크기로 나란히 */
      const bw = (W - 140) / 2;
      btn(this, 60 + bw / 2, y + 190, bw - 10, 92, `받기 ◆${GIFT.gems} ⚡${GIFT.energy}`, () => take(1), { style: 'cream', size: 30 });
      btn(this, W - 60 - bw / 2, y + 190, bw - 10, 92, adLabel(`2배 ◆${GIFT.gems * 2} ⚡${GIFT.energy * 2}`, true), async () => { if (await rewardAd('dailyBonus')) take(2); else toast(this, '지금은 광고를 볼 수 없어요 · 그냥 받기도 돼요'); }, { style: 'rose', size: 30 });
    } else btn(this, W - 170, y + 75, 220, 92, free ? '받기' : '내일 또', () => { if (free) take(1); }, { style: free ? 'rose' : 'cream', size: 32 });
    y += gh + 25;
    // 보석 저금통: 주문마다 ◆2씩 쌓임 · 결제가 열리면 깰 수 있음
    { const pv = d.piggy || 0; rbox(this, 40, y, W - 80, 150, { fill: '#FFFFFF', line: '#F1D2C8', ox: 0, oy: 0, r: 28 });
      const pi = this.add.image(120, y + 75, 'piggy'); pi.setScale(110 / pi.height); R(this, 200, y + 44, `보석 저금통 ◆${pv}`, TS.body, C.ink, { ox: 0, w: 900 }); R(this, 200, y + 92, `주문마다 ◆${PIGGY.perOrder}씩 · 최대 ◆${PIGGY.max}`, TS.min + 2, C.dim, { ox: 0, w: 800 });
      const g1 = this.add.graphics(); g1.fillStyle(0xF1DCD3, 1).fillRoundedRect(200, y + 122, 500, 14, 7).fillStyle(0xE86A8E, 1).fillRoundedRect(200, y + 122, Math.max(14, 500 * pv / PIGGY.max), 14, 7);
      btn(this, W - 170, y + 75, 220, 92, storeOpen() ? '깨기' : '곧 열려요', async () => { if (!storeOpen()) return toast(this, '저금통은 결제가 열리면 깰 수 있어요'); if (!pv) return toast(this, '아직 비어 있어요'); try { await purchase('piggy'); audio.play('sfx_levelup', { volume: 0.7 }); this.scene.restart(); } catch { toast(this, '구매하지 못했어요'); } }, { style: storeOpen() ? 'gold' : 'cream', size: 30 }); }
    y += 190;
    // 소장자 전용 장식 (원어데이 안에서만 · 사는 상품 아님)
    const od = ownerDeco();
    if (od !== 'hidden') { rbox(this, 40, y, W - 80, 150, { fill: od === 'open' ? '#FFF6E2' : '#FFFFFF', line: od === 'open' ? '#E8B84A' : '#F1D2C8', lw: od === 'open' ? 5 : 3, ox: 0, oy: 0, r: 28 });
      const oi = this.add.image(120, y + 75, OWNER_DECO.img); oi.setScale(116 / Math.max(oi.width, oi.height)); if (od !== 'open') oi.setAlpha(0.55);
      T(this, 200, y + 48, `소장 전용 · ${OWNER_DECO.n}`, TS.body, C.ink, { ox: 0, w: 900 }); T(this, 200, y + 100, OWNER_DECO.desc, TS.min + 2, C.dim, { ox: 0, w: 800 });
      if (od === 'open') btn(this, W - 170, y + 75, 220, 92, '가게에 있어요', () => toast(this, '설정에서 놓기 · 끄기를 바꿀 수 있어요'), { style: 'gold', size: 28 });
      else T(this, W - 170, y + 75, '🔒 소장하면\n열려요', TS.min + 2, '#C2408A', { w: 800, align: 'center' });
      y += 190; }
    if (oadOn() && (goldPrice('gems100') || fillPrice(1))) { this.goldShop(d, y); this.cameras.main.fadeIn(200, 255, 244, 236); window.__shop = this; return; }
    T(this, 50, y, storeOpen() ? '상품' : '상품 · 곧 열려요', TS.h2, C.brown, { ox: 0, w: 900 }); y += 50;
    const list = PRODUCTS.filter(p => !p.piggy), cols = 2, cw = (W - 100) / cols, rows = Math.ceil(list.length / cols), ch = Math.max(250, Math.min(340, (H - y - 30) / rows - 20));
    list.forEach((p, k) => {
      const x = 40 + (k % cols) * (cw + 20), yy = y + Math.floor(k / cols) * (ch + 20);
      const owned = p.once && d.purchases.some(r => r.id === p.id) || p.ent && d.ent[p.ent];
      rbox(this, x, yy, Math.round(cw), Math.round(ch), { fill: '#FFFFFF', line: '#F1D2C8', ox: 0, oy: 0, r: 28 });
      const icon = p.packs ? 'pack_gold' : p.gems && !p.energy ? 'gem' : p.energy && !p.gems ? 'energy' : p.ent === 'pass' ? 'gen_camellia2' : 'gen_gift', im = this.add.image(x + 90, yy + (ch - 90) / 2 + 10, icon); im.setScale(Math.min(140, ch - 130) / Math.max(im.width, im.height));
      const nt = T(this, x + 175, yy + 56, p.n, TS.body - 2, C.ink, { ox: 0, w: 900 }); if (nt.width > cw - 190) nt.setScale((cw - 190) / nt.width);
      const desc = [p.gems && `◆${p.gems}`, p.energy && `⚡${p.energy}`, p.gift && `선물 상자 ${p.gift}`, p.ent === 'pass' && '시즌 보상 두 배', p.ent === 'storage4' && '창고 4칸 영구', p.packs && '골드 팩 3 · 다이아 팩 1'].filter(Boolean), lines = desc.length > 2 ? [desc.slice(0, 2).join(' · '), desc.slice(2).join(' · ')] : desc;
      lines.forEach((t, i) => { const dt = R(this, x + 175, yy + 104 + i * 40, t, TS.min, C.dim, { ox: 0, w: 800 }); if (dt.width > cw - 190) dt.setScale((cw - 190) / dt.width); });
      if (p.tag) { const tg = this.add.graphics(); tg.fillStyle(0xE86A8E, 1).fillRoundedRect(x + 14, yy + 14, 130, 44, 22); T(this, x + 79, yy + 36, p.tag, 24, '#FFFFFF', { w: 900 }); }
      btn(this, x + cw / 2, yy + ch - 54, cw - 50, 84, owned ? '보유 중' : storeOpen() ? won(p.price) : `${won(p.price)} · 준비 중`, async () => {
        if (owned) return; if (!storeOpen()) return toast(this, '결제는 곧 열려요 · 지금은 무료 선물과 시즌 보상을 받아요');
        try { await purchase(p.id); audio.play('sfx_levelup', { volume: 0.7 }); this.scene.restart(); } catch (e) { toast(this, '구매하지 못했어요'); }
      }, { style: storeOpen() && !owned ? 'gold' : 'cream', size: 28 });
    });
    this.cameras.main.fadeIn(200, 255, 244, 236); window.__shop = this;
  }
  // 원어데이 골드 상품 (가격은 서버 SHOP.beauty · 확인 창은 앱이 띄움)
  goldShop(d, y) {
    T(this, 50, y, '원어데이 골드로 사기', TS.h2, C.brown, { ox: 0, w: 900 }); y += 50;
    const items = [
      { id: 'gems100', n: `보석 ${GOLD_GEMS}개`, desc: `◆${GOLD_GEMS} · 비눗방울 · 충전에 써요`, icon: 'gem', give: () => { d.gems += GOLD_GEMS; }, msg: `◆${GOLD_GEMS} 받았어요!` },
    ].filter(it => goldPrice(it.id));
    /* 에너지 채우기: 채울 양에 비례 (5마다 1골드) · 가득이면 끔 */
    const need = fillNeed(), fg = fillGold(need);
    if (fillPrice(fg) || (!need && fillPrice(1))) items.push({ id: `fill${fg}`, fill: true, n: need ? `에너지 ⚡+${need} 채우기` : '에너지 가득', desc: need ? `⚡${ENERGY.max} 까지 바로 · 채울 양 5마다 1골드` : '이미 가득 찼어요 · 쓰고 나서 채워요', icon: 'energy', off: !need, msg: '에너지 가득!' });
    items.forEach(it => {
      rbox(this, 40, y, W - 80, 170, { fill: '#FFFFFF', line: '#F1D2C8', ox: 0, oy: 0, r: 28 });
      const im = this.add.image(120, y + 85, it.icon); im.setScale(110 / Math.max(im.width, im.height));
      T(this, 200, y + 58, it.n, TS.body + 2, C.ink, { ox: 0, w: 900 }); R(this, 200, y + 112, it.desc, TS.cap, C.dim, { ox: 0, w: 800 });
      if (it.off) { btn(this, W - 170, y + 85, 220, 92, '가득 참', () => toast(this, '이미 가득 찼어요 · 에너지를 쓰고 나서 채워요'), { style: 'cream', size: 30 }).setAlpha(0.6); y += 190; return; }
      btn(this, W - 170, y + 85, 220, 92, `🪙${it.fill ? fillGold(fillNeed()) : goldPrice(it.id)}`, async () => { if (it.fill) { const r = await buyFill(); if (!r.ok) { const m = r.reason === 'full' ? '이미 가득 찼어요' : goldMsg(r); if (m) toast(this, m); return; } audio.play('sfx_levelup', { volume: 0.7 }); toast(this, it.msg); this.hud.update(); this.scene.restart(); return; } const r = await spendGold(it.id); if (!r.ok) { const m = goldMsg(r); if (m) toast(this, m); return; } it.give(); save(); audio.play('sfx_levelup', { volume: 0.7 }); toast(this, it.msg); this.hud.update(); }, { style: 'gold', size: 32 });
      y += 190;
    });
    T(this, W / 2, y + 20, '무료 선물 · 시즌 보상 · 광고 보상으로도 받을 수 있어요', TS.min, C.dim, { w: 800 });
  }
  onBack() { return goPrev(this); }
}
