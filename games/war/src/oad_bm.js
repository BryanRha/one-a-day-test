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
//   공통 랭킹 (v3 · 2026-11-27 — 로그인한 누구나 · 결제 · 이어하기 · 아이템 · 응원 선물을 쓴 판도 그대로 순위에 오름 · 대표 결정)
//     v2 그대로: await bm.submitScore(점수, { assisted })  → { ok, best, rank, week, tier, total, newBest } | { ok:false, reason:'login'|'fast'|'limit'|'cap'|'offline'|'standalone' }
//                await bm.board()  → { ok, week, top: [{ name(닉네임), score, me }], me: { rank, score } | null }   (판 = 게임 id 의 주간 판)
//     새 판(곡 판 · 같은 편성 판): const s = await bm.rank.start('rhythm:s05:hard')  → { ok, run, seed, period }   (판 이름은 '<게임 id>' 또는 '<게임 id>:…' 만)
//                await bm.rank.submit(판, 점수, { run, tie, meta, inputs, assisted }) → { ok, best, rank(100위 안만), tier(1·5·10·25·50 | null), total, newBest, next: { tier, gap } | null }
//                bm.rank.open(판)  → 원어데이가 순위표 시트를 띄움 (게임은 그리지 않아도 됨) · bm.rank.line(결과) → { title, sub } 결과 화면 한 줄 글
//     assisted 는 받기만 하고 순위 · 화면에는 쓰지 않음 · 연결이 끊기면 원어데이가 그 판 마지막 기록을 보관했다가 다시 보냄(reason 'offline')
//   실시간 게임은 광고 · 확인 창 동안 스스로 멈출 것: bm.onPause = on => { ... }
//   브랜드 매장 쿠폰(실물 경품): await bm.couponOn() 이 true 일 때만 발급 — 실서버(oneaday.kr)는 계약 · 게임위 자문 전까지 false
//     앱 안이면 hello().coupon, 앱 밖(단독 링크)이면 window.OAD_ENV !== 'prod'
export const V = 3;
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
  if (fn === 'score') return { ok: true, best: args[0], rank: 3, week: '2026-W48', tier: 5, total: 318, newBest: true };
  if (fn === 'board') return { ok: true, week: '2026-W48', top: [{ name: '새벽고래', score: 99999 }, { name: '초록여우', score: 50000 }, { name: '파란고래', score: 30000, me: true }], me: { rank: 3, score: 30000 } };
  if (fn === 'rank') { const [sub, a] = args; return sub === 'start' ? { ok: true, run: 'test-run', seed: 7, period: '2026-W48' } : sub === 'submit' ? { ok: true, best: a.score, rank: 12, tier: 5, total: 318, newBest: true, next: { tier: 1, gap: 1200 } } : sub === 'mine' ? { ok: true, me: { score: 30000, rank: 12, tier: 5 } } : { ok: true }; }
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
  rank: {
    start: async board => { await bm.hello(); return cache.ok ? ask('rank', ['start', { board: String(board || '') }], 8000) : { ok: false, reason: 'standalone' }; },
    submit: async (board, score, opt = {}) => { await bm.hello(); return cache.ok ? ask('rank', ['submit', { board: String(board || ''), score: Math.floor(Number(score) || 0), opt: { run: opt.run, tie: opt.tie, meta: opt.meta, inputs: opt.inputs, assisted: !!opt.assisted } }], 15000) : { ok: false, reason: 'standalone' }; },
    open: async board => { await bm.hello(); return cache.ok ? ask('rank', ['open', { board: String(board || '') }], 4000) : { ok: false, reason: 'standalone' }; },
    mine: async board => { await bm.hello(); return cache.ok ? ask('rank', ['mine', { board: String(board || '') }], 8000) : { ok: false, reason: 'standalone' }; },
    /* 결과 화면 한 줄 (원어데이 순위표 글과 같은 규칙: 100위 안 = 등수 · 그 밖 = 구간 · 아래 절반 = 내 최고) */
    line(r) {
      if (!r || !r.ok) return r && r.reason === 'login' ? { title: '로그인하면 순위에 올라요', sub: '' } : null;
      if (r.review) return { title: '기록을 확인하고 있어요', sub: '확인되면 순위에 보여요' };
      const f = n => Number(n || 0).toLocaleString('ko-KR');
      const sub = [r.rank && r.tier ? `상위 ${r.tier}% 안` : '', r.newBest ? '개인 최고 갱신' : '', r.next && r.next.gap > 0 ? `${f(r.next.gap)}점 더면 상위 ${r.next.tier}%` : ''].filter(Boolean).slice(0, 2).join(' · ');
      return { title: r.rank ? `이번 주 ${f(r.rank)}위` : r.tier ? `상위 ${r.tier}% 안` : `이번 주 내 최고 ${f(r.best)}`, sub };
    },
  },
  async interstitial(placement) { await bm.hello(); if (!cache.ok || !cache.ads.inter) return { ok: true, shown: false }; return paused(ask('interstitial', [placement], 180000, true)); },
};
