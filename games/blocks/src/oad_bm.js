// One a Day 게임 안 BM 연결 (공통 파일 v1 — 원본: oneaday/sdk/oad_bm.js, 각 게임 src/oad_bm.js 로 그대로 복사)
//   게임은 요청만, 확인 창 · 로그인 · 충전 · 광고 · 골드 차감은 전부 원어데이 앱이 맡고 결과만 돌려줌
//   원어데이 밖(단독 링크 · 개발 서버)에서는 hello().ok = false → 골드 · 광고 버튼을 숨기고 게임은 그대로
//   개발용: 주소에 ?oadtest=1 → 가짜 지갑(999골드) · 가짜 광고(1초)
//
//   const h = await bm.hello();              // { ok, group, login, owned, noAds, gold, prices: { continue: 20, ... }, items: [...], ads: { reward, rewardLeft, inter } }
//   const r = await bm.rewardedAd('revive'); // { ok: true, via: 'ad'|'owner'|'test' } | { ok: false, reason: 'cancel'|'limit'|'off'|'standalone' }
//   const s = await bm.spend('continue');    // { ok: true, gold } | { ok: false, reason: 'cancel'|'short'|'login'|'limit'|'off'|'standalone' }
//   await bm.interstitial('round_end');      // 판이 끝날 때 불러 두면 앱이 조건(그룹 · 간격 · 소장)에 맞을 때만 보여 줌
//   실시간 게임은 광고 · 확인 창 동안 스스로 멈출 것: bm.onPause = on => { ... }
export const V = 1;
const inFrame = (() => { try { return window.parent !== window; } catch { return true; } })();
const TEST = /[?&]oadtest=1/.test(location.search);
let seq = 0, cache = null;
const wait = new Map();
if (inFrame) addEventListener('message', e => {
  if (e.source !== window.parent || !e.data || e.data.type !== 'oad:res') return;
  const f = wait.get(e.data.id); if (f) { wait.delete(e.data.id); f(e.data.result); }
});
function ask(fn, args, ms) {
  if (TEST) return Promise.resolve(fake(fn, args));
  if (!inFrame) return Promise.resolve({ ok: false, reason: 'standalone' });
  const id = 'r' + (++seq) + Date.now().toString(36);
  return new Promise(res => {
    const t = setTimeout(() => { wait.delete(id); res({ ok: false, reason: 'standalone' }); }, ms);
    wait.set(id, r => { clearTimeout(t); res(r || { ok: false, reason: 'error' }); });
    try { window.parent.postMessage({ type: 'oad:req', id, fn, args }, location.origin); } catch { clearTimeout(t); wait.delete(id); res({ ok: false, reason: 'standalone' }); }
  });
}
let wallet = 999;
function fake(fn, args) {
  if (fn === 'hello') return { ok: true, test: true, group: 'B', login: true, owned: false, noAds: false, gold: wallet, prices: { continue: 20, continue2: 40, walk: 5, gems100: 100, energy: 25, outfit: 300, skin: 250 }, items: [], ads: { reward: true, rewardLeft: 5, inter: false } };
  if (fn === 'spend') { const p = (cache && cache.prices[args[0]]) || 20; if (wallet < p) return { ok: false, reason: 'short' }; wallet -= p; return { ok: true, gold: wallet }; }
  if (fn === 'rewardedAd') return { ok: true, via: 'test' };
  return { ok: true, shown: false };
}
const paused = async (p) => { try { bm.onPause && bm.onPause(true); } catch { /* */ } try { return await p; } finally { try { bm.onPause && bm.onPause(false); } catch { /* */ } } };
const rid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

export const bm = {
  onPause: null,
  async hello() { if (!cache) { cache = await ask('hello', [], 800); if (!cache.ok) cache = { ok: false, prices: {}, items: [], ads: {} }; } return cache; },
  get info() { return cache || { ok: false, prices: {}, items: [], ads: {} }; },
  price: item => (cache && cache.ok && cache.prices[item]) || 0,
  async spend(item) { await bm.hello(); if (!bm.price(item)) return { ok: false, reason: 'off' }; const r = await paused(ask('spend', [item, rid()], 180000)); if (r.ok && cache && r.gold != null) cache.gold = r.gold; return r; },
  async rewardedAd(placement) { await bm.hello(); if (!cache.ok || !cache.ads.reward) return { ok: false, reason: cache.ok ? 'limit' : 'standalone' }; const r = await paused(ask('rewardedAd', [placement], 180000)); if (r.ok && cache.ads) { cache.ads.rewardLeft = Math.max(0, (cache.ads.rewardLeft || 1) - 1); cache.ads.reward = cache.ads.rewardLeft > 0; } return r; },
  async interstitial(placement) { await bm.hello(); if (!cache.ok || !cache.ads.inter) return { ok: true, shown: false }; return paused(ask('interstitial', [placement], 180000)); },
};
