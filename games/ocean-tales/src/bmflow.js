// 웨일 테일 ↔ 원어데이 BM 연결 (게임 쪽 도우미 — 공통 파일 oad_bm.js 는 고치지 않음)
//   · 시작 때 hello 한 번 (결과는 bm.info 로 바로 읽음 · 원어데이 밖이면 ok = false → 골드 · 광고 · 전용 장식 숨김, 게임은 예전 그대로)
//   · 판 끝 전면 광고: 판이 끝나면 roundOver(), 다음 화면으로 넘어갈 때 afterRound() → 판마다 한 번만 앱에 물어봄 (실패 순간엔 X)
//   · 광고 · 확인 창 동안 소리 멈춤 + 이어하기 카운트다운 멈춤 (paused())
//   · 상품: SHOP.ocean — continue(+5수 🪙20) · continue2(+5수 한 번 더 🪙40) · boosters(부스터 3종 🪙60) · deco(바다 장식 🪙100, item)
//   · 소장자: 보상형 혜택은 광고 없이 바로 · 전용 장식 '달빛 고래' (겉모습만, 무료)
import { bm } from './oad_bm.js?v=0.92.7';
import { load, save } from './save.js?v=0.92.7';
import { today } from './missions.js?v=0.92.7';
import { AD_PER_DAY } from './core/cont.js?v=0.92.7';
import { roll, noteEnd, eligible, giftMoves, consume } from './core/help.js?v=0.92.7';
import { LANG } from './i18n.js?v=0.92.7';

let hp = null, pausedNow = false;
export function helloOnce() {
  return hp || (hp = bm.hello().then(h => {
    /* ?oadtest=1 가짜 지갑의 장식 가격(300)은 다른 게임 것 — 시험 때만 서버 가격(SHOP.ocean.deco 100)으로 맞춤 */
    if (h && h.test && h.prices) h.prices.deco = 100;
    return h;
  }).catch(() => bm.info));
}
export function initBM(game) {
  bm.onPause = on => { pausedNow = on; try { if (on) game.sound.pauseAll(); else game.sound.resumeAll(); } catch { /* */ } };
  return helloOnce();
}
export const paused = () => pausedNow;
export const oadOn = () => !!bm.info.ok;

// ── 아이템 (item 상품은 서버 기록 hello().items 로 복원) ──
export function hasItem(sku) {
  return (bm.info.items || []).some(x => { const k = typeof x === 'string' ? x : (x && (x.sku || x.id)) || ''; return k === sku || k.endsWith(':' + sku); });
}

// ── 광고 보상 하루 횟수 (게임 쪽: booster 3 · moves5 3) ──
function adState() { const d = load(); if (!d.bmAds || d.bmAds.day !== today()) d.bmAds = { day: today(), booster: 0, moves5: 0 }; return d.bmAds; }
export const adLeft = k => Math.max(0, (AD_PER_DAY[k] || 0) - (adState()[k] || 0));
export function noteAd(k) { const a = adState(); a[k] = (a[k] || 0) + 1; save(); }

// ── 판 수 (처음 3판은 이어하기 권유 없음) ──
export const plays = () => load().bmPlays || 0;
export function notePlay() { const d = load(); d.bmPlays = (d.bmPlays || 0) + 1; save(); }

// ── 판 끝 전면 광고 ──
let pending = false;
export const roundOver = () => { pending = true; };
export async function afterRound() {
  if (!pending) return;
  pending = false;
  try { await bm.interstitial('round_end'); } catch { /* 늘 넘어감 */ }
}

// ── 앱 기록 (운영실): help_eligible · help_offer · help_take · help_decline ──
const inFrame = (() => { try { return window.parent !== window; } catch { return true; } })();
export function oadTrack(name, p = {}) {
  const q = { game: 'ocean', ...p };
  try { (window.__tracks || (window.__tracks = [])).push({ name, p: q }); } catch { /* */ }
  if (inFrame) try { window.parent.postMessage({ type: 'oad:track', name, p: q }, location.origin); } catch { /* */ }
}

// ── 연속 실패 응원 선물 (규칙은 core/help.js) ──
function helpState() { const d = load(); d.help = roll(d.help, today()); return d.help; }
export function helpNoteEnd(info) { noteEnd(helpState(), info); save(); }
// 레벨 시작 때: 조건이 맞으면 두 그룹 모두 help_eligible 을 보내고, 켜짐 그룹이면 선물 크기(수)를 돌려줌 · 꺼짐이면 0 (조건은 소모)
export function helpCheck(levelId) {
  const h = helpState();
  if (!eligible(h, levelId)) return 0;
  const on = bm.helpOn(), n = giftMoves(h), streak = h.streak;
  oadTrack('help_eligible', { on: on ? 1 : 0, level: levelId, streak });
  consume(h); save();
  if (!on) return 0;
  oadTrack('help_offer', { level: levelId, streak, moves: n });
  return n;
}
export const helpStreak = () => helpState().streak;

// ── 꾸미기 (바다 복원 화면) ──
//   moon = 소장자 전용 '달빛 고래' (hello().owned 면 무료) · pearl = 골드 '진주 등불' (hello().items 에 deco)
export const DECOS = [{ id: 'moon', owner: true }, { id: 'pearl', sku: 'deco' }];
export const decoOpen = id => { if (!bm.info.ok) return false; return id === 'moon' ? !!bm.info.owned : hasItem('deco'); };
export const decoOnPref = id => { const d = load(); return !d.deco || d.deco[id] !== false; };
export const decoShown = id => decoOpen(id) && decoOnPref(id);
export function setDeco(id, on) { const d = load(); d.deco = { ...(d.deco || {}), [id]: on }; save(); }
export async function buyDeco() {
  const r = await bm.spend('deco');
  if (r && r.ok) { const it = bm.info.items || (bm.info.items = []); if (!hasItem('deco')) it.push('deco'); }
  return r || { ok: false, reason: 'error' };
}

// ── 문구 (원어데이 화면은 한국어가 기본 · 영어 대비) ──
const TX = {
  ko: {
    adBtn: '▶ 광고 보고 {0}', freeBtn: '무료로 {0}', goldBtn: '🪙{0} {1}', plus5: '+5 이동', plus5More: '+5 이동 한 번 더',
    contTitleClose: '거의 다 왔어요!', contTitle: '잘하고 있어요!', contPraise: '목표의 {0}%까지 왔어요', contHope: '5번만 더 움직이면 깰 수 있을 것 같아요',
    contHope2: '정말 조금 남았어요 · 한 번 더 가 볼까요?', seeResult: '결과 보기', inGame: '보유 +5 이동 쓰기 ({0})', inGameCoins: '코인 {0}으로 +5 이동',
    short: '골드가 조금 모자라요 · 원어데이에서 충전할 수 있어요', login: '원어데이에 로그인하면 쓸 수 있어요', limit: '오늘은 여기까지 쓸 수 있어요',
    cancel: '다음에 해도 괜찮아요', adFail: '광고를 불러오지 못했어요', comeback: '역전 성공!',
    boosterAd: '삼지창 1', boosterGold: '부스터 3종', boosterGot: '삼지창 1개를 받았어요!', boostersGot: '삼지창 · 섞기 · 교환 1개씩 받았어요!',
    giftTitle: '응원 선물', giftLead: '{0}레벨에 {1}번째 도전이에요\n포기하지 않는 모습, 정말 멋져요!', giftWhat: '이번 도전은 이동 +{0}으로 시작',
    giftTake: '챙겨 받기', giftDecline: '혼자 해 볼게요', giftNote: '응원 선물 · 챙겨 드릴게요', giftOn: '응원 선물 이동 +{0}',
    decoBtn: '꾸미기', decoTitle: '바다 꾸미기', moonName: '달빛 고래', moonDesc: '소장자 전용 · 바다를 천천히 헤엄치는 달빛 몽이',
    pearlName: '진주 등불', pearlDesc: '해초에 매단 진주 등불이 바다를 은은하게 밝혀요', ownLocked: '게임을 소장하면 열려요',
    on: '켜짐', off: '꺼짐', bought: '진주 등불을 달았어요!', ownOnly: '원어데이에서 웨일 테일을 소장하면 바로 열려요',
  },
  en: {
    adBtn: '▶ Ad: {0}', freeBtn: 'Free: {0}', goldBtn: '🪙{0} {1}', plus5: '+5 Moves', plus5More: '+5 Moves again',
    contTitleClose: 'Almost there!', contTitle: 'Great job!', contPraise: 'You reached {0}% of the goal', contHope: 'Five more moves could do it',
    contHope2: 'So close — one more go?', seeResult: 'See result', inGame: 'Use +5 Moves ({0})', inGameCoins: '+5 Moves for {0} coins',
    short: 'Not enough gold · top up in One a Day', login: 'Log in to One a Day to use this', limit: 'That is all for today',
    cancel: 'Maybe next time', adFail: 'Could not load the ad', comeback: 'Comeback!',
    boosterAd: 'Trident 1', boosterGold: '3 Boosters', boosterGot: 'Got 1 Trident!', boostersGot: 'Got Trident, Shuffle and Swap!',
    giftTitle: 'Cheer Gift', giftLead: 'Try #{1} on level {0}\nLove the persistence!', giftWhat: 'Start this try with +{0} moves',
    giftTake: 'Take it', giftDecline: 'I got this', giftNote: 'A little cheer gift for you', giftOn: 'Cheer gift +{0} moves',
    decoBtn: 'Decor', decoTitle: 'Sea Decor', moonName: 'Moonlight Whale', moonDesc: 'Owners only · Mongi glowing in moonlight',
    pearlName: 'Pearl Lanterns', pearlDesc: 'Pearl lanterns softly light up the sea', ownLocked: 'Own the game to unlock',
    on: 'On', off: 'Off', bought: 'Pearl lanterns are up!', ownOnly: 'Own Whale Tale in One a Day to unlock',
  },
};
export function bt(key, ...args) {
  const v = (TX[LANG()] || TX.en)[key] ?? TX.ko[key] ?? key;
  return v.replace(/\{(\d)\}/g, (_, i) => args[i]);
}
// 결제 · 광고 실패 사유 → 부드러운 안내
export const failMsg = r => (r && { short: bt('short'), login: bt('login'), limit: bt('limit'), cancel: bt('cancel') }[r.reason]) || bt('adFail');

// 골드 버튼: 🪙 이모지는 글자 테두리(stroke)를 씌우면 회색으로 뭉개짐 → 테두리 없는 이모지를 따로 그려 글자 왼쪽에 붙임
export function goldify(scene, btn) {
  const L = btn && btn.label;
  if (!L || !L.text.startsWith('🪙')) return btn;
  L.setText(L.text.slice(2));
  const size = parseInt(L.style.fontSize, 10) || 40;
  const coin = scene.add.text(0, L.y + 2, '🪙', { fontSize: `${Math.round(size * 0.95)}px`, padding: { top: 6, bottom: 6 } }).setOrigin(0.5);
  btn.add(coin);
  const w = coin.width * 0.9 + 6, total = w + L.width;
  coin.x = -total / 2 + w / 2 - 3; L.x = -total / 2 + w + L.width / 2;
  btn.coin = coin;
  return btn;
}
