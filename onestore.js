// 원스토어 H5 SDK v1.2.0 연결 — 원어데이 앱(셸) 전용 (2026-11-24 운영 · 웹 상품 One A Day · AID OH01013449 = 원어데이 전체 하나 · 실행 URL https://www.oneaday.kr/)
//   SDK 는 최상위 문서(셸)에서만 초기화 · 게임은 셸 안 iframe 이라 게임의 광고 · 결제 요청(oad_bm.js → oad:req)은 셸 gameReq → provider.js → 여기로
//   원스토어 앱 안(다른 주소가 감싼 iframe — 응답 헤더 frame-ancestors 가 원스토어 · 같은 주소만 허용하므로 다른 주소가 감쌌다 = 원스토어)일 때만 SDK 를 ESM 으로 불러 initializeAsync
//   그 밖(일반 브라우저 · 원어데이 앱 안 게임 · 개발 서버)에서는 SDK 를 부르지도 않음 → 지금 동작 그대로 · SDK 가 { err: 'Platform Not Supported' } 를 줘도 그대로
//   준비는 ready(약속) — 원스토어 밖에서는 바로 false (최상위 await 를 쓰지 않음: 오래된 브라우저에서 앱 전체가 문법 오류로 멈추지 않게)
//   수명주기: pause → 게임 화면(iframe)마다 oshook(__oadOS) 으로 루프 · 소리 정지 / resume → 재개 / exit → 0.5초 안 동기 저장 / 백키 → handle({ back }) 가 200ms 안에 동기로 답
//   광고: rewarded · interstitial (원스토어 광고만 · 지면 ID 는 PLACE) · 결제: buy(상품 ID) → 서버 검증 → 골드 → consume (api/onestore.js)
export const SDK = 'https://h5sdk.onestore.net/lib/v1.2.0/onestore-h5-sdk.min.js';
export const APP = 'oad';
/* 광고 지면 ID — 원스토어 개발자센터에서 웹 상품 OH01013449 에 리워드 · 전면 따로 발급 (11-26 발급됨) · 빈 값이면 그 광고는 '없음'(광고 단추를 그리지 않음)
   게임마다 지면을 나누고 싶으면 게임 id 로 칸을 더함 (없으면 oad 값) */
export const PLACE = { oad: { reward: 'xS9RM-JJJF-4EU3-LATV', inter: 'xSTVA-G35H-42CY-RKWD' } };   /* 원스토어 발급 상용 지면 ID (11-26 · 테스트용 ID 는 원스토어가 주지 않음) */
/* 소리: 단말이 무음이면 게임 소리도 끔 (원스토어 가이드: ringerSilent 로 BGM 초기 상태) — false 면 무음 모드여도 소리 남 */
export const RINGER_MUTE = true;
/* 시험용: 개발 · 테스트 빌드에서만 ?osplace=리워드ID,전면ID 로 지면 ID 를 넣어 볼 수 있음 (실서버는 무시) */
{ const q = new URLSearchParams(location.search).get('osplace'), e = (typeof window !== 'undefined' && window.OAD_ENV) || 'dev';
  if (q && e !== 'prod') { const [r, i] = q.split(','); for (const k of Object.keys(PLACE)) PLACE[k] = { reward: r || '', inter: i || '' }; } }

const Q = new URLSearchParams(location.search);
const ENV = (typeof window !== 'undefined' && window.OAD_ENV) || 'dev';
const framed = (() => { try { return window.parent !== window; } catch { return true; } })();
const OSO = /^https:\/\/([a-z0-9-]+\.)*onestore\.(co\.kr|net)$/;
const anc = () => { try { return [...(location.ancestorOrigins || [])]; } catch { return []; } };
const ref = () => { try { return new URL(document.referrer).origin; } catch { return ''; } };
/* 우리 게임 · 너랑 화면처럼 같은 주소가 감싼 iframe 은 원스토어가 아님 (원어데이 앱 안 게임에서 SDK 를 부르지 않게) */
const ourFrame = (() => { try { return framed && window.parent.location.origin === location.origin; } catch { return false; } })();
/* 원스토어가 감쌌다고 보는 때: 다른 주소가 감싼 iframe (실서버 · 테스트 서버는 frame-ancestors 로 원스토어 · 같은 주소만 감쌀 수 있음) — 원스토어 도메인 · os=1 은 기록용 */
export const looks = framed && !ourFrame;
export const seenOneStore = anc().some(o => OSO.test(o)) || OSO.test(ref()) || Q.get('os') === '1';
/* 시험용 가짜 SDK: 개발 · 테스트 빌드에서만, 같은 주소의 파일만 (?ossdk=/…) — 실서버는 늘 원스토어 CDN */
const sdkUrl = (() => { const x = Q.get('ossdk') || ''; return ENV !== 'prod' && /^\/[^/\\]/.test(x) ? x : SDK; })();

export let on = false, sdk = null, info = null, pid = '', silent = false, paused = false, sale = false, products = {}, mode = 'off';
export const safe = { top: 0, bottom: 0, left: 0, right: 0 };
export let safeRaw = null;   /* 원스토어가 준 그대로 (기록용) */
const H = {};   /* 앱이 끼우는 처리기: back() · pause(e) · resume(e) · exit() · 모두 선택 */
export const handle = o => Object.assign(H, o);
let tok = '', tokAt = 0;
/* 기기 번호(track.js 가 만든 무작위 값) — 결제 확인 · 복구에 붙여 보내 서버 매출 기록(pay_done)이 이 기기로 잡히게 */
const did = () => { try { return localStorage.getItem('oad_did') || ''; } catch { return ''; } };

/* 셸 안 같은 주소 iframe(게임 · 너랑)에 수명주기 전달 — oshook.js 가 심어 둔 __oadOS (빌드가 게임 html 맨 앞에 넣음) */
function frames(fn, arg) {
  for (const f of document.querySelectorAll('iframe')) { try { const o = f.contentWindow && f.contentWindow.__oadOS; if (o && o[fn]) o[fn](arg); } catch { /* 다른 주소 */ } }
}
function onPause(e) { paused = true; frames('pause', e && e.reason); try { H.pause && H.pause(e || {}); } catch { /* */ } }
function onResume(e) {
  if (e && typeof e.ringerSilent === 'boolean') { silent = e.ringerSilent; frames('mute', RINGER_MUTE && silent); }
  paused = false; frames('resume'); try { H.resume && H.resume(e || {}); } catch { /* */ }
}
function onExit() { frames('save'); try { H.exit && H.exit(); } catch { /* */ } }   /* 0.5초 안 · 동기만 (네트워크 기다리지 않음) */
/* 백키: 반환값이 정확히 true 일 때만 '게임이 처리' — 아니면 원스토어의 종료 확인 창 */
function onBack() { try { return H.back ? H.back() === true : false; } catch { return false; } }

async function boot() {
  let mod; try { mod = await import(sdkUrl); } catch { return false; }
  const s = mod.createSDK();
  s.on('pause', onPause); s.on('resume', onResume); s.on('exit', onExit);   /* 리스너는 initializeAsync 전에 (가이드) */
  try { s.onBackPressed(onBack); } catch { /* */ }
  let r; try { r = await s.initializeAsync(); } catch { return false; }
  if (!r || r.err || !r.playerId) return false;
  sdk = s; info = r; pid = String(r.playerId); silent = !!r.ringerSilent; on = true;
  for (const k of ['top', 'bottom', 'left', 'right']) safe[k] = Math.max(0, Number(r.safeArea && r.safeArea[k]) || 0);
  /* 원스토어 safeArea 는 문서에 'px' 로만 적혀 있고 실제로는 기기 픽셀로 옴 (11-27 대표 폰: 상단이 상태 표시줄 높이 × 기기 배율만큼 밀림) → CSS px 로 나눔.
     이미 CSS px 로 오는 기기를 대비해, 나눈 값이 아니라 원래 값이 시스템바 최대 높이(64px)를 넘을 때만 나눔 · 원래 값은 safeRaw 로 남겨 기록 */
  safeRaw = { ...safe }; const dpr = window.devicePixelRatio || 1;
  if (dpr > 1 && Math.max(safe.top, safe.bottom) > 64) for (const k in safe) safe[k] = Math.round(safe[k] / dpr);
  window.OAD_HOST = 'onestore'; window.OAD_OS_SAFE = { ...safe };
  progress(20);
  await session().catch(() => null);   /* 판매 여부 · 상품표 · 세션 표 — 못 받아도 게임은 됨(결제 · 광고만 닫힘) */
  return true;
}
export const ready = looks ? Promise.race([boot(), new Promise(r => setTimeout(() => r(false), 12000))]).catch(() => false) : Promise.resolve(false);

/* ── 로딩 · 시작 ── */
export function progress(n) { if (on) try { sdk.setLoadingProgress(Math.max(0, Math.min(100, n))); } catch { /* */ } }
let started = null;
export function start() { if (!on) return Promise.resolve(false); return started || (started = (progress(100), sdk.startGameAsync().then(() => true, () => false))); }
export function quit() { if (!on) return; frames('save'); try { H.exit && H.exit(); } catch { /* */ } try { sdk.quit(); } catch { /* */ } }

/* ── 서버 (api/onestore.js) ── */
/* 기기 열쇠: 이 기기에서 처음 한 번 만든 무작위 값 — 서버가 '이 계정을 늘 쓰던 기기인지' 알아보는 데만 씀(이름표만 저장 · 2026-11-27 보안 점검 #1-c) */
function devKey() {
  try {
    let k = localStorage.getItem('oad_os_dk');
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(k || '')) { const a = new Uint8Array(18); crypto.getRandomValues(a); k = btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); localStorage.setItem('oad_os_dk', k); }
    return k;
  } catch { return ''; }
}
async function session(force) {
  if (!on) return null;
  if (tok && !force && Date.now() - tokAt < 20 * 864e5) return tok;
  const r = await fetch('/api/onestore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ act: 'session', app: APP, pid, dk: devKey() }) });
  const j = await r.json().catch(() => ({})); if (!r.ok || !j.token) { mode = 'off'; sale = false; return null; }
  tok = j.token; tokAt = Date.now(); sale = !!j.sale; products = j.products || {}; mode = j.mode || 'off';
  return tok;
}
export const token = () => session();
export async function api(body, retry = true) {
  const t = await session(); if (!t) throw Object.assign(new Error('원스토어 연결을 준비하고 있어요'), { reason: 'off' });
  const r = await fetch('/api/onestore', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && retry) { await session(true); return api(body, false); }
  if (!r.ok) throw Object.assign(new Error(j.error || '연결에 실패했어요'), j, { status: r.status });
  return j;
}

/* ── 광고 (원스토어 광고만) ── */
const placeOf = (kind, game) => ((game && PLACE[game]) || PLACE.oad)[kind] || '';
export const canReward = game => on && !!placeOf('reward', game) && sdkOk(() => sdk.ads.isSupported('rewarded'));
export const canInter = game => on && !!placeOf('inter', game) && sdkOk(() => sdk.ads.isSupported('interstitial'));
const sdkOk = f => { try { return f() === true; } catch { return false; } };
const wait = ms => new Promise(r => setTimeout(r, ms));
/* 리워드: requestId 는 우리 서버가 발급 → 시청 완료(rewarded)는 '신호'일 뿐 → 서버가 포스트백(SSV)을 받았는지 확인한 뒤에만 ok
   반환은 원어데이 공통 창구(oad_bm.js)와 같은 모양: { ok, via } | { ok: false, reason: cancel · limit · off · nofill · busy · timeout } */
export async function rewarded(game) {
  if (!canReward(game)) return { ok: false, reason: 'off' };
  let r1; try { r1 = await api({ act: 'rid', game: game || 'app' }); } catch (e) { return { ok: false, reason: e.limit ? 'limit' : 'off' }; }
  let r; try { r = await sdk.ads.showRewardedAsync({ placementId: placeOf('reward', game), requestId: r1.rid }); } catch { r = { status: 'failed', reason: 'internal_error' }; }
  if (r.status === 'dismissed') return { ok: false, reason: 'cancel' };
  if (r.status !== 'rewarded') return { ok: false, reason: r.reason === 'no_fill' || r.reason === 'ad_opt_out' ? 'nofill' : r.reason === 'already_showing' ? 'busy' : 'off' };
  for (let i = 0; i < 8; i++) {   /* 포스트백은 보통 몇 초 안 · 최대 약 12초 기다림 */
    try { const x = await api({ act: 'reward', rid: r1.rid, mock: mode === 'mock' }); if (x.granted) return { ok: true, via: 'onestore', rid: r1.rid }; } catch { /* 잠깐 끊김 */ }
    await wait(i < 3 ? 800 : 1800);
  }
  return { ok: false, reason: 'timeout' };
}
export async function interstitial(game) {
  if (!canInter(game)) return { ok: true, shown: false };
  try { const r = await sdk.ads.showInterstitialAsync({ placementId: placeOf('inter', game) }); return { ok: true, shown: r.status === 'completed' }; } catch { return { ok: true, shown: false }; }
}

/* ── 결제 (관리형 상품 · 전부 소비형) ── */
export const canBuy = () => on && sale && sdkOk(() => sdk.iap.isSupported('purchase'));
const WHY = {
  need_login: '원스토어에 로그인한 뒤 다시 눌러 주세요', need_update: '원스토어 앱을 최신으로 업데이트해 주세요',
  already_processing: '다른 결제나 광고가 끝난 뒤 다시 눌러 주세요', payment_failed: '결제하지 못했어요 · 결제 수단을 확인해 주세요',
  service_unavailable: '원스토어 연결이 불안정해요 · 잠시 뒤 다시 해 주세요', security_error: '결제를 진행할 수 없는 상태예요',
};
/* 결제 → 서버 확인 → 골드. 반환 { ok, gold, then } | { ok: false, reason, msg } — reason 'cancel' 이면 아무 안내 없이 원래 화면으로
   purchaseId 는 이어서 그 골드로 열 때(/api/me spend 의 os) 그 결제 골드만큼 정확히 빼는 데 씀
   결제는 됐는데 서버 확인이 늦으면 'pending' (PNS · 매일 대조가 넣어 줌 → 다음에 열 때 들어가 있음) */
export async function buy(productId) {
  if (!canBuy()) return { ok: false, reason: 'off', msg: '결제는 곧 열려요' };
  if (!products[productId]) return { ok: false, reason: 'off', msg: '지금은 살 수 없는 상품이에요' };
  let o; try { o = await api({ act: 'order', productId }); } catch (e) { return { ok: false, reason: e.once ? 'once' : 'error', msg: e.message }; }
  let r;
  try { r = await sdk.iap.purchase({ productId, productName: o.productName, developerPayload: o.developerPayload }); }
  catch (e) {
    const why = e && e.reason;
    if (why === 'user_cancelled') return { ok: false, reason: 'cancel' };
    if (why === 'already_owned') { const x = await api({ act: 'recover', d: did() }).catch(() => null); return { ok: false, reason: 'owned', gold: x && x.gold, msg: x && x.recovered ? '지난 결제를 먼저 넣어 드렸어요 · 골드를 확인해 주세요' : '지난 결제를 정리하는 중이에요 · 잠시 뒤 다시 눌러 주세요' }; }
    return { ok: false, reason: why || 'error', msg: WHY[why] || '결제하지 못했어요 · 잠시 뒤 다시 해 주세요' };
  }
  const body = { act: 'verify', productId, purchaseToken: r.purchaseToken, purchaseId: r.purchaseId, orderId: r.orderId, developerPayload: r.developerPayload || o.developerPayload, d: did() };
  for (let i = 0; i < 3; i++) {
    try { const v = await api(body); return { ok: true, gold: v.gold, then: v.then, purchaseId: v.purchaseId }; }
    catch (e) { if (e.status && e.status < 500) return { ok: false, reason: 'verify', msg: e.message }; await wait(1200 * (i + 1)); }
  }
  return { ok: false, reason: 'pending', msg: '결제는 됐어요 · 골드는 잠시 뒤 자동으로 들어가요' };
}
/* 손님 결제가 (원 · 부가세 포함) — 원스토어 기본가격은 부가세 별도라 손님은 기본가격 × 1.1 을 냄 (11-26 대표 B안 · team/dev/tasks/261124-onestore/store/iap_products.md)
   값은 서버 상품표(session products 의 price)가 기준 · 아직 못 받았으면 기본가격(base) × 1.1 (앱 화면에 부가세 뺀 금액이 보이면 원스토어 검증 반려 사유) */
export const VAT = 1.1;
export const paidPrice = (productId, base) => { const p = products[productId]; return p && p.price > 0 ? p.price : Math.round((Number(base) || 0) * VAT); };
export const goldOf = productId => (products[productId] && products[productId].gold) || null;
/* 원스토어 조회 가격과 서버 상품표 대조 (앱을 열 때 한 번 · 표시는 늘 서버 값) — 다르면 [{ id, store, ours, base }] (조회가 안 되면 빈 목록) */
export async function priceCheck() {
  const ids = Object.keys(products), out = [];
  if (!on || !ids.length || !sdkOk(() => sdk.iap.isSupported('getProductDetails'))) return out;
  for (let i = 0; i < ids.length; i += 20) {
    let list = []; try { list = await sdk.iap.getProductDetailsAsync(ids.slice(i, i + 20)) || []; } catch { continue; }
    for (const p of list) {
      const our = p && products[p.productId]; if (!our) continue;
      const n = p.priceAmountMicros != null ? Math.round(Number(p.priceAmountMicros) / 1e6) : Number(String(p.price || '').replace(/[^0-9.]/g, ''));
      if (Number.isFinite(n) && n > 0 && n !== our.price) out.push({ id: p.productId, store: n, ours: our.price, base: our.base });
    }
  }
  return out;
}
/* 앱을 열 때 한 번: 응답을 못 받은 지난 결제 넣기 (already_owned 예방) */
export const recover = () => (on && sale ? api({ act: 'recover', d: did() }).catch(() => null) : Promise.resolve(null));
/* 골드 묶음 ID (서버 PACKS 이름 → 원스토어 상품 ID) */
export const packId = k => 'oad_gold_' + (k === 'first' ? 'first' : String(k).replace(/^g/, ''));

/* 백키를 같은 주소 게임 iframe 에 '동기로' 물음: 게임의 oad:back 처리기(oad.js installBack)를 바로 부르고, 게임이 보내는 oad:back-result 를 그 자리에서 받음
   반환 true(게임이 처리) · false(게임 첫 화면 · 처리 안 함) · null(처리기 없음) */
export function backInto(frame) {
  const w = frame && frame.contentWindow; if (!w) return null;
  let got = null; const orig = window.postMessage;
  window.postMessage = function (m, ...rest) { if (m && m.type === 'oad:back-result') { got = !!m.handled; return; } return orig.call(window, m, ...rest); };
  try { w.dispatchEvent(new w.MessageEvent('message', { data: { type: 'oad:back' }, origin: location.origin, source: window })); } catch { /* */ }
  finally { window.postMessage = orig; }
  return got;
}
