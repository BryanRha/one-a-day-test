// 결제 (유료 풀이): 주문 → 결제(토스 또는 테스트 서버의 모의 결제) → 영수증을 이 기기에 보관 → 서버에서 전체 풀이 받기
//   서버가 있는 주소(oneaday.kr · test.oneaday.kr · vercel.app)에서만 열림, 깃허브 주소에서는 '곧 열려요'
const HOST = location.hostname;
export const ON = /(^|\.)oneaday\.kr$/.test(HOST) || HOST.endsWith('.vercel.app') || (() => { try { return localStorage.getItem('oad_track') === '1'; } catch { return false; } })();
const RKEY = 'oad_receipts', PKEY = 'oad_pay_pending';

const post = (u, body) => fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || '연결에 실패했어요'); return j; });

let cfg = null;
export async function config() {
  if (!ON) return { mode: 'off' };
  if (!cfg) cfg = await fetch('/api/pay/config').then(r => r.json()).catch(() => ({ mode: 'off' }));
  return cfg;
}

// 두 사람 열쇠: 같은 두 사람(이름 · 생년월일시 · 성별 …)이면 같은 값
const key = (a, b) => JSON.stringify([a, b]);
const receipts = () => { try { return JSON.parse(localStorage.getItem(RKEY) || '[]'); } catch { return []; } };
export function receiptFor(product, me, pt) { const k = key(me, pt); return receipts().find(r => r.product === product && r.key === k) || null; }
function keep(r, me, pt) { const all = receipts().filter(x => !(x.product === r.product && x.key === key(me, pt))); all.push({ ...r, key: key(me, pt), at: Date.now() }); try { localStorage.setItem(RKEY, JSON.stringify(all.slice(-50))); } catch { /* 저장 불가 */ } }

// 골드 묶음 주문: 로그인 토큰을 붙여 (골드는 계정 지갑에 쌓임)
export async function orderGold(product, token) {
  const d = localStorage.getItem('oad_did') || '';
  const r = await fetch('/api/pay/order', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ product, d }) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || '연결에 실패했어요');
  return { ...j, product, d };
}
export const confirmGold = (o, paymentKey, amount) => post('/api/pay/confirm', { orderId: o.orderId, product: o.product, pair: o.pair, d: o.d, sig: o.sig, paymentKey, amount });
export const keepReceipt = keep;
/* 운세 주문: 로그인 토큰을 주면 주문이 계정에 연결돼 결제 뒤 '내 구매'에 남음 (없으면 이 기기 + 주문번호 · 복원 코드) */
export function order(product, me, pt, extra, token) {
  const d = localStorage.getItem('oad_did') || '';
  return fetch('/api/pay/order', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify({ ...(extra || {}), product, me, partner: pt, d }) })
    .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || '연결에 실패했어요'); return { ...j, product, d }; });
}
/* 이 기기에 보관한 영수증 목록 (설정 '내 구매') — 두 사람 열쇠(key)는 빼고 */
export const myReceipts = () => receipts().map(({ key: _k, ...r }) => r);
/* 주문번호 + 복원 코드로 영수증 다시 받기: 1단계(me 없이) → 상품 목록 · 2단계(me · 상품별 상대) → 영수증 */
export const restoreByCode = body => post('/api/fortune/report', { act: 'restore', ...body });
/* 신년 패키지처럼 영수증이 여러 장 오면 앱이 상품별 '두 사람'으로 나눠 보관 (setPackKeeper 로 등록) */
let packKeeper = null;
export const setPackKeeper = f => { packKeeper = f; };

// 결제 승인 → 영수증 보관
export async function confirm(o, paymentKey, amount, me, pt) {
  const r = await post('/api/pay/confirm', { orderId: o.orderId, product: o.product, pair: o.pair, d: o.d, sig: o.sig, paymentKey, amount });
  if (r.receipts && packKeeper) packKeeper(r.receipts.map(x => ({ ...x, code: r.code }))); else keep(r, me, pt);
  return r;
}

// 토스 결제창으로 이동 (돌아오면 resume() 이 이어서 처리)
export async function toss(o, me, pt, gold) {
  sessionStorage.setItem(PKEY, JSON.stringify({ o, me, pt, gold: !!gold }));
  if (!window.TossPayments) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://js.tosspayments.com/v2/standard'; s.onload = ok; s.onerror = no; document.head.append(s); });
  const tp = window.TossPayments(cfg.clientKey);
  const p = tp.payment({ customerKey: window.TossPayments.ANONYMOUS });
  await p.requestPayment({ method: 'CARD', amount: { currency: 'KRW', value: o.amount }, orderId: o.orderId, orderName: o.orderName, successUrl: location.origin + location.pathname + '?pay=ok', failUrl: location.origin + location.pathname + '?pay=fail' });
}

// 결제창에서 돌아왔을 때: ?pay=ok&paymentKey&orderId&amount 또는 ?pay=fail&message
export async function resume() {
  const q = new URLSearchParams(location.search); const st = q.get('pay'); if (!st) return null;
  history.replaceState(null, '', location.pathname);
  let pend = null; try { pend = JSON.parse(sessionStorage.getItem(PKEY) || 'null'); } catch { /* */ }
  sessionStorage.removeItem(PKEY);
  if (st !== 'ok') return { ok: false, msg: q.get('message') || '결제가 취소됐어요' };
  if (!pend || pend.o.orderId !== q.get('orderId')) return { ok: false, msg: '주문 정보를 찾지 못했어요. 고객센터로 문의해 주세요' };
  try { if (pend.gold) { const r = await confirmGold(pend.o, q.get('paymentKey'), Number(q.get('amount'))); return { ok: true, product: pend.o.product, gold: r.gold }; }
    const r = await confirm(pend.o, q.get('paymentKey'), Number(q.get('amount')), pend.me, pend.pt); return { ok: true, product: pend.o.product, orderId: r.orderId, code: r.code, saved: r.saved }; }
  catch (e) { return { ok: false, msg: e.message }; }
}

// 결제한 풀이 전체
export const report = (r, me, pt) => post('/api/fortune/report', { orderId: r.orderId, product: r.product, receipt: r.receipt, me, partner: pt });
