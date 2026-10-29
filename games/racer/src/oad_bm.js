// One a Day 게임 안 BM 연결 (공통 파일 v2 — 원본: oneaday/sdk/oad_bm.js, 각 게임 src/oad_bm.js 로 그대로 복사)
//   게임은 요청만, 확인 창 · 로그인 · 충전 · 광고 · 골드 차감은 전부 원어데이 앱이 맡고 결과만 돌려줌
//   원어데이 밖(단독 링크 · 개발 서버)에서는 hello().ok = false → 골드 · 광고 버튼을 숨기고 게임은 그대로
//   개발용: 주소에 ?oadtest=1 → 가짜 지갑(999골드) · 가짜 광고(1초)
//
//   const h = await bm.hello();              // { ok, group, login, owned, noAds, gold, prices: { continue: 20, ... }, items: [...], ads: { reward, rewardLeft, inter }, help }
//   help: 연속 실패 응원 선물 실험 켜짐 여부 (원어데이 밖에서는 게임 기본값 — 공통 규칙 docs/bm-policy.md)
//   const r = await bm.rewardedAd('revive'); // { ok: true, via: 'ad'|'owner'|'test' } | { ok: false, reason: 'cancel'|'limit'|'off'|'standalone'|'timeout' }
//   const s = await bm.spend('continue');    // { ok: true, gold } | { ok: false, reason: 'cancel'|'short'|'login'|'limit'|'off'|'standalone' }
//   await bm.interstitial('round_end');      // 판이 끝날 때 불러 두면 앱이 조건(그룹 · 간격 · 소장)에 맞을 때만 보여 줌
//   명예의 전당(아케이드 · 소장자 혜택): await bm.submitScore(점수, { assisted })  → { ok, best, rank } | { ok:false, reason:'owned'|'login'|'assisted'|'standalone' }
//                                      await bm.board()  → { ok, week, top: [{ name, score, me }], me: { rank, score } | null }
//   이어하기 · 응원 선물을 받은 판은 assisted: true (순위에 안 올라감)
//   실시간 게임은 광고 · 확인 창 동안 스스로 멈출 것: bm.onPause = on => { ... }
//   브랜드 매장 쿠폰(실물 경품): await bm.couponOn() 이 true 일 때만 발급 — 실서버(oneaday.kr)는 계약 · 게임위 자문 전까지 false
//     앱 안이면 hello().coupon, 앱 밖(단독 링크)이면 window.OAD_ENV !== 'prod'
export const V = 2;
const inFrame = (() => { try { return window.parent !== window; } catch { return true; } })();
const TEST = /[?&]oadtest=1/.test(location.search);
let seq = 0, cache = null;
const wait = new Map();
if (inFrame) addEventListener('message', e => {
  if (e.source !== window.parent || !e.data || e.data.type !== 'oad:res') return;
  const f = wait.get(e.data.id); if (f) { wait.delete(e.data.id); f(e.data.result); }
});
/* 기다리는 시간: hello 처럼 짧은 물음은 그냥 ms · 광고 · 확인 창처럼 사람이 보는 물음(vis)은 '화면이 보이는 동안'만 셈
   (폰에서 광고 중 홈으로 나갔다 오면 타이머가 한꺼번에 밀려 끝나 버려 보상이 사라지던 것 막음 · 2026-10-29 마루미) */
function ask(fn, args, ms, vis) {
  if (TEST) return Promise.resolve(fake(fn, args));
  if (!inFrame) return Promise.resolve({ ok: false, reason: 'standalone' });
  const id = 'r' + (++seq) + Date.now().toString(36);
  return new Promise(res => {
    let t = null, used = 0, t0 = Date.now();
    const stop = () => { clearTimeout(t); clearInterval(t); };
    if (vis) t = setInterval(() => { const n = Date.now(); if (document.visibilityState !== 'hidden') used += Math.min(n - t0, 2000); t0 = n; if (used >= ms) { stop(); wait.delete(id); res({ ok: false, reason: 'timeout' }); } }, 1000);
    else t = setTimeout(() => { wait.delete(id); res({ ok: false, reason: 'standalone' }); }, ms);
    wait.set(id, r => { stop(); res(r || { ok: false, reason: 'error' }); });
    try { window.parent.postMessage({ type: 'oad:req', id, fn, args }, location.origin); } catch { stop(); wait.delete(id); res({ ok: false, reason: 'standalone' }); }
  });
}
let wallet = 999;
/* 시험용 가격표 (실제 가격은 서버 gold.js SHOP — 게임마다 다른 값은 게임이 시험에서 맞춤) */
const FAKEP = { continue: 20, continue2: 40, walk: 5, gems100: 100, gems200: 100, crystal100: 100, energy: 25, outfit: 300, skin: 250, abyss: 20, arena: 300, speed: 20, boost: 20, storage: 150, deco: 300, revive: 15, revive2: 30, stamina: 25, hearts: 20, hearts2: 40, next: 50, boosters: 60, undo: 10, supply: 20, color: 250 };
for (let i = 1; i <= 20; i++) FAKEP['choice' + i] = 30;
/* 게임별 실제 가격으로 시험하려면 ?oadtest=1&oadprice=outfit:200,skin:300 */
for (const kv of ((location.search.match(/[?&]oadprice=([^&]+)/) || [])[1] || '').split(',')) { const [k, v] = decodeURIComponent(kv).split(':'); if (k && Number(v) > 0) FAKEP[k] = Number(v); }
function fake(fn, args) {
  if (fn === 'hello') return { ok: true, test: true, group: 'B', login: true, owned: false, noAds: false, gold: wallet, prices: FAKEP, items: [], ads: { reward: true, rewardLeft: 5, inter: false }, help: !/[?&]help=0/.test(location.search), coupon: true };
  if (fn === 'spend') { const p = (cache && cache.prices[args[0]]) || 20; if (wallet < p) return { ok: false, reason: 'short' }; wallet -= p; return { ok: true, gold: wallet }; }
  if (fn === 'rewardedAd') return { ok: true, via: 'test' };
  if (fn === 'score') return args[1] && args[1].assisted ? { ok: false, reason: 'assisted' } : { ok: true, best: args[0], rank: 3 };
  if (fn === 'board') return { ok: true, week: '2026-W44', top: [{ name: '루○○', score: 99999 }, { name: '별○○', score: 50000 }, { name: '나', score: 30000, me: true }], me: { rank: 3, score: 30000 } };
  return { ok: true, shown: false };
}
const paused = async (p) => { try { bm.onPause && bm.onPause(true); } catch { /* */ } try { return await p; } finally { try { bm.onPause && bm.onPause(false); } catch { /* */ } } };
const rid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

export const bm = {
  onPause: null,
  async hello() { if (!cache) { cache = await ask('hello', [], 800); if (!cache.ok) cache = { ok: false, prices: {}, items: [], ads: {} }; } return cache; },
  get info() { return cache || { ok: false, prices: {}, items: [], ads: {} }; },
  price: item => (cache && cache.ok && cache.prices[item]) || 0,
  async spend(item) { await bm.hello(); if (!bm.price(item)) return { ok: false, reason: 'off' }; const r = await paused(ask('spend', [item, rid()], 180000, true)); if (r.ok && cache && r.gold != null) cache.gold = r.gold; return r; },
  async rewardedAd(placement) { await bm.hello(); if (!cache.ok || !cache.ads.reward) return { ok: false, reason: !cache.ok ? 'standalone' : cache.group === 'A' ? 'off' : 'limit' }; const r = await paused(ask('rewardedAd', [placement], 180000, true)); if (r.ok && cache.ads) { cache.ads.rewardLeft = Math.max(0, (cache.ads.rewardLeft || 1) - 1); cache.ads.reward = cache.ads.rewardLeft > 0; } return r; },
  async couponOn() { await bm.hello(); return cache.ok ? cache.coupon !== false : window.OAD_ENV !== 'prod'; },
  helpOn() { return cache && cache.ok ? cache.help !== false : true; },
  async submitScore(score, opt = {}) { await bm.hello(); if (!cache.ok) return { ok: false, reason: 'standalone' }; return ask('score', [Math.floor(Number(score) || 0), { assisted: !!opt.assisted }], 8000); },
  async board() { await bm.hello(); if (!cache.ok) return { ok: false, reason: 'standalone' }; return ask('board', [], 8000); },
  async interstitial(placement) { await bm.hello(); if (!cache.ok || !cache.ads.inter) return { ok: true, shown: false }; return paused(ask('interstitial', [placement], 180000, true)); },
};
