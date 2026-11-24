// 결제 · 광고 공급자 자리 (2026-11-24 운영) — 원어데이 앱에서 광고를 보여 주고 돈을 받는 곳은 여기 하나로 모음
//   web(기본 · 일반 브라우저): 광고 = 원어데이 테스트 광고 창(app.js fakeAd — 진짜 광고망이 붙으면 여기만 바꿈) · 결제 = pay.js(토스 키가 있으면 토스 · 테스트 서버는 모의)
//   onestore(원스토어 앱 안): app.js 가 onestore.js 를 use() 로 꽂음 → 광고 = 원스토어 리워드 · 전면 · 결제 = 원스토어 인앱결제(관리형 · 서버 검증 → 골드 → consume)
//   다른 공급자(다른 스토어 · 광고망)도 같은 모양 { name, reward, inter, canReward, canInter, canBuy, buy } 이면 꽂을 수 있음
//   reward(game, label) → { ok, via } | { ok: false, reason: cancel · limit · off · nofill · busy · timeout } · inter(game, label) → 보였으면 true
//   buy(상품 ID) → { ok, gold, then } | { ok: false, reason, msg } (web 은 null — 기존 토스 · 모의 결제 흐름을 그대로 씀)
const web = { name: 'web', reward: async () => ({ ok: false, reason: 'off' }), inter: async () => false, canReward: () => true, canInter: () => true, canBuy: () => true, buy: null };
let cur = web;
export const setWeb = o => { Object.assign(web, o); };
export const use = p => { cur = { ...web, ...p }; };
export const name = () => cur.name;
export const store = () => cur !== web;   /* 스토어 공급자(원스토어 등)가 꽂혔나 — 꽂혔으면 토스 결제창 · 원어데이 테스트 광고를 쓰지 않음 */
export const reward = (game, label) => cur.reward(game, label);
export const inter = (game, label) => cur.inter(game, label);
export const canReward = g => { try { return !!cur.canReward(g); } catch { return false; } };
export const canInter = g => { try { return !!cur.canInter(g); } catch { return false; } };
export const canBuy = () => { try { return !!cur.canBuy(); } catch { return false; } };
export const buy = id => (cur.buy ? cur.buy(id) : Promise.resolve({ ok: false, reason: 'off', msg: '결제는 곧 열려요' }));
