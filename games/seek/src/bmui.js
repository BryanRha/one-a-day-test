// BM 화면 조각: 힌트 광고 창 · 하트 이어하기 창 · 다음 화 바로 보기 창 · 응원 선물 창
//   감정 원칙: 칭찬 먼저 → 희망 한 줄 → 카운트다운 8초+ → 끝나면 조용히 결과로 · 광고 버튼 옆엔 같은 크기로 가격
import { W, H } from './config.js?v=0.75.2';
import { T, C, btn, popup, toast } from './ui.js?v=0.75.2';
import { audio } from './audio.js?v=0.75.2';
import { bm, oadOn, owner, price, adLeft, adLabel, watchAd, failText, waitLeft, fmtWait, buyNext, track, HINT_COST } from './bm.js?v=0.75.2';

// 코인이 모자랄 때 힌트: [광고 보고 힌트] [● 10 코인] (원어데이 밖 · 광고 다 씀이면 예전처럼 안내만)
export function hintOffer(sc, coins, onGet, onClose) {
  if (!oadOn() || adLeft('hint') <= 0) { toast(sc, '코인이 부족해요 · 물건을 찾으면 모여요'); onClose && onClose(); return; }
  let got = false;
  const p = popup(sc, 860, 560, { onClose: () => { if (!got) onClose && onClose(); } });
  p.content.add(T(sc, 0, -190, '힌트가 필요할 때', 42, C.ink, { w: 900 }));
  p.content.add(T(sc, 0, -125, `코인이 조금 모자라요 · ● ${coins} / ${HINT_COST}`, 26, C.dim, { w: 800 }));
  p.content.add(T(sc, 0, -78, `오늘 ${adLeft('hint')}번 더 받을 수 있어요`, 22, '#C25A80', { w: 800 }));
  let busy = false;
  const ad = btn(sc, -195, 50, 360, 120, adLabel('힌트'), async () => {
    if (busy) return; busy = true; const r = await watchAd('hint'); busy = false;
    if (!r.ok) { const m = failText(r); if (m) toast(sc, m); return; }
    got = true; p.close(); onGet();
  }, { size: 28 });
  const cn = btn(sc, 195, 50, 360, 120, `● ${HINT_COST} 코인 힌트`, () => toast(sc, '물건 · 단서를 찾으면 코인이 모여요'), { style: 'cream', size: 28 }); cn.setAlpha(0.55);
  p.content.add([ad, cn]);
  p.content.add(btn(sc, 0, 190, 300, 90, '괜찮아요', () => p.close(), { style: 'cream', size: 26 }));
  return p;
}

// 증거 대조 하트 이어하기 ('아깝다' 순간만): 칭찬 → 희망 → 10초 → 끝나면 결과
//   같은 보상(하트 가득) = 광고 1회 또는 골드 · 첫째 [광고 보고 ♥ 가득] [🪙20 ♥ 가득] 같은 크기(광고를 다 쓰면 골드만) · 둘째 🪙40(hearts2)만 · 판당 최대 2번
export function continueOffer(sc, { found, total, nth = 0 }, onRevive, onGiveUp) {
  const SEC = 10, left = total - found;
  let busy = false, t = SEC, done = false;
  const p = popup(sc, 900, 900, { closable: false, onBack: () => finish() });
  const finish = () => { if (done) return; done = true; tick.remove(); p.close(); onGiveUp(); };
  const revive = n => { if (done) return; done = true; tick.remove(); p.close(); onRevive(n); };
  p.content.add(T(sc, 0, -360, `${found}곳이나 찾아냈어요!`, 50, C.ink, { w: 900 }));
  p.content.add(T(sc, 0, -290, left === 1 ? '딱 한 곳만 더 찾으면 거짓말이 드러나요' : `${left}곳만 더 찾으면 거짓말이 드러나요`, 30, '#C25A80', { w: 800 }));
  p.content.add(T(sc, 0, -190, '♥', 120, '#FF6A8E', { w: 900 }));
  const barBg = sc.add.rectangle(0, -80, 640, 16, 0xE8C8D4).setOrigin(0.5), bar = sc.add.rectangle(-320, -80, 640, 16, 0xE8628A).setOrigin(0, 0.5);
  const secT = T(sc, 0, -40, `${SEC}초`, 24, C.dim, { w: 800 }); p.content.add([barBg, bar, secT]);
  const buy = async kind => {
    if (busy) return; busy = true;
    const sku = nth ? 'hearts2' : 'hearts', r = kind === 'ad' ? await watchAd('heart') : await bm.spend(sku);
    busy = false;
    if (!r.ok) { const m = failText(r); if (m) toast(sc, m); return; }
    track('continue', { via: kind, sku: kind === 'ad' ? 'ad_heart' : sku, n: nth + 1 });
    revive(3);
  };
  const adOk = !nth && adLeft('heart') > 0, gp = price(nth ? 'hearts2' : 'hearts');
  if (adOk) p.content.add(btn(sc, -205, 90, 380, 130, adLabel('♥ 가득'), () => buy('ad'), { size: 30 }));
  p.content.add(btn(sc, adOk ? 205 : 0, 90, 380, 130, `🪙${gp} ♥ 가득`, () => buy('gold'), { style: 'gold', size: 32 }));
  p.content.add(T(sc, 0, 185, nth ? '한 번 더 · 하트 3개로 이어서 찾아요' : adOk ? `하트 3개로 이어서 찾아요 · 오늘 광고 ${adLeft('heart')}번 남음` : '하트 3개로 이어서 찾아요', 22, C.dim, { w: 800 }));
  p.content.add(btn(sc, 0, 320, 520, 110, '결과 보기', () => finish(), { style: 'cream', size: 30 }));
  // 광고 · 확인 창이 떠 있는 동안(busy)은 시간이 멈춤
  const tick = sc.time.addEvent({ delay: 100, loop: true, callback: () => { if (busy || done) return; t -= 0.1; bar.width = Math.max(0, 640 * t / SEC); secT.setText(`${Math.max(0, Math.ceil(t))}초`); if (t <= 0) finish(); } });
  return p;
}

// 다음 화 기다리기 창: 남은 시간 · [🪙50 바로 보기] [기다릴게요]
export function nextOffer(sc, ep, epNoText, onOpen) {
  const ms = waitLeft(ep);
  const p = popup(sc, 880, 660);
  p.content.add(T(sc, 0, -250, `${epNoText}화 · ${ep.title}`, 40, C.ink, { w: 900, wrap: 800 }));
  p.content.add(T(sc, 0, -190, ep.teaser, 26, '#C25A80', { w: 800, wrap: 780 }));
  if (ms === Infinity) {
    p.content.add(T(sc, 0, -50, '앞 화를 먼저 보면 열려요', 34, C.brown, { w: 900 }));
    p.content.add(btn(sc, 0, 150, 420, 110, '알겠어요', () => p.close(), { style: 'cream', size: 30 }));
    return p;
  }
  p.content.add(T(sc, 0, -95, '⏳', 80, C.ink, { w: 900 }));
  const tt = T(sc, 0, -10, `${fmtWait(ms)} 뒤 무료로 열려요`, 34, C.brown, { w: 900 }); p.content.add(tt);
  p.content.add(T(sc, 0, 40, '기다리면 언제나 무료 · 기다리기 싫다면 바로 볼 수도 있어요', 22, C.dim, { w: 800, wrap: 760 }));
  let busy = false;
  p.content.add(btn(sc, -200, 180, 360, 120, '기다릴게요', () => p.close(), { style: 'cream', size: 30 }));
  p.content.add(btn(sc, 200, 180, 360, 120, `🪙${price('next')} 바로 보기`, async () => {
    if (busy) return; busy = true; const r = await buyNext(ep); busy = false;
    if (!r.ok) { const m = failText(r); if (m) toast(sc, m); return; }
    audio.play('sfx_clear', { volume: 0.5 }); p.close(); onOpen();
  }, { style: 'gold', size: 30 }));
  const tick = sc.time.addEvent({ delay: 1000, loop: true, callback: () => { if (!tt.scene) return tick.remove(); const m = waitLeft(ep); if (m <= 0) { tick.remove(); p.close(); toast(sc, '다음 화가 열렸어요!'); onOpen(); } else tt.setText(`${fmtWait(m)} 뒤 무료로 열려요`); } });
  return p;
}

// 응원 선물 창 (다음 증거 대조 시작 때): 노력 인정 → 선물 → [받을게요] [혼자 해 볼게요]
export function giftOffer(sc, face, name, onTake, onDecline) {
  track('help_offer', { gift: 'spot1' });
  let done = false;
  const p = popup(sc, 900, 820, { closable: false, onBack: () => decline() });
  const take = () => { if (done) return; done = true; track('help_take', { gift: 'spot1' }); p.close(); onTake(); };
  const decline = () => { if (done) return; done = true; track('help_decline', { gift: 'spot1' }); p.close(); onDecline(); };
  const f = sc.add.image(0, -230, face); f.setScale(220 / f.height); p.content.add(f);
  p.content.add(T(sc, 0, -70, '여기까지 포기하지 않고 왔네요', 38, C.ink, { w: 900 }));
  p.content.add(T(sc, 0, -10, `${name}: "이번엔 내가 먼저 짚어 볼게."`, 28, C.brown, { w: 800, wrap: 780 }));
  const g = sc.add.graphics(); g.fillStyle(0xFCE4EC, 1).fillRoundedRect(-330, 50, 660, 90, 45); p.content.add(g);
  p.content.add(T(sc, 0, 95, '응원 선물 · 한 곳을 먼저 짚어 드릴게요', 28, '#B8406A', { w: 900 }));
  p.content.add(btn(sc, -200, 250, 360, 120, '혼자 해 볼게요', decline, { style: 'cream', size: 28 }));
  p.content.add(btn(sc, 200, 250, 360, 120, '받을게요', take, { size: 32 }));
  return p;
}
export { owner };
