// 원어데이 게임 안 BM 연결 (docs/bm-policy.md) — 게임 재화는 '은화', 원어데이 재화는 '골드(🪙)' (서로 다른 것)
//   가격은 서버 표(oneaday/server/api/_lib/gold.js SHOP.blade)만 기준: gems200 · revive · stamina · skin(item)
//   보상형 광고(사용자가 누를 때만): 쓰러짐 후 부활(판당 1 · 하루 3) · 행동력 +20(하루 2) · 스테이지 보상 2배(하루 3)
//   소장자: 보상형 혜택을 광고 없이 바로(횟수 같음) · 전용 무기 외형 1종(월광검, 겉모습만)
//   원어데이 밖(hello().ok = false): 골드 · 광고 · 전용 외형 전부 숨김, 게임은 예전 그대로
//   연속 실패 응원 선물(6장 · 단계형): 같은 스테이지 3연속 실패 → 다음 도전 시작 때 선물, 6번째 조금 더
import * as THREE from 'three';
import { bm } from './oad_bm.js?v=0.76.1';
import { inOAD } from './oad.js?v=0.76.1';
import { G, save } from './state.js?v=0.76.1';
import { STAMINA } from './data.js?v=0.76.1';
export { bm };

const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export const OAD = { ok: false, owned: false };
export async function bmInit() {
  const h = await bm.hello(); OAD.ok = !!h.ok; OAD.owned = !!(h.ok && h.owned);
  /* item 상품 복원: 서버가 아는 소장 품목 */
  if (h.ok && (h.items || []).includes('skin')) { G.skins = { ...(G.skins || {}), ember: 1 }; save(); }
  return h;
}
export const price = item => OAD.ok ? bm.price(item) : 0;
// 앱 기록 (oad:track) — 원어데이 밖이면 아무것도 안 함
export function track(name, p = {}) { if (!inOAD) return; try { window.parent.postMessage({ type: 'oad:track', name, p: { game: 'blade', ...p } }, '*'); } catch { /* */ } }

// ── 보상형 광고: 자리별 하루 횟수 (게임 쪽) + 앱 한도(게임당 5 · 앱 15)
export const AD_DAY = { revive: 3, sta: 2, x2: 3 };
const PLACE = { revive: 'revive', sta: 'stamina', x2: 'reward2x' };
function ads() { if (!G.ads || G.ads.day !== today()) G.ads = { day: today() }; return G.ads; }
export const adLeft = k => OAD.ok ? Math.max(0, AD_DAY[k] - (ads()[k] || 0)) : 0;
export const adReady = k => adLeft(k) > 0 && !!(bm.info.ads && bm.info.ads.reward !== false);
export async function watchAd(k) { const r = await bm.rewardedAd(PLACE[k]); if (r.ok) { ads()[k] = (ads()[k] || 0) + 1; save(); } return r; }
export const adLabel = () => OAD.owned ? '소장 혜택 · 바로' : '광고 보고';
// 골드 쓰기 (확인 창 · 충전 · 로그인은 앱이 함)
export async function pay(item) { return bm.spend(item); }
export const failMsg = r => ({ short: '골드가 조금 모자라요', login: '로그인하면 쓸 수 있어요', limit: '오늘은 여기까지예요. 내일 또 만나요', off: '지금은 쓸 수 없어요', standalone: '원어데이 앱에서 쓸 수 있어요', limitAd: '오늘 볼 수 있는 광고를 다 봤어요' })[r && r.reason] || '';

// ── 무기 외형 (겉모습만 · 능력치 없음)
export const SKINS = {
  base: { name: '기본 검', desc: '카일의 손에 익은 강철 검' },
  dawn: { name: '월광검', desc: '소장자 전용 · 달빛이 서린 은청색 칼날', owner: true, col: 0xc8dcff, em: 0x5a9aff, ei: 1.5, trail: [0x7ac0ff, 0xffffff] },
  ember: { name: '잿불 검', desc: '꺼지지 않는 불씨를 품은 칼날', item: 'skin', col: 0xffb090, em: 0xff5a14, ei: 1.3, trail: [0xff4a14, 0xffd2a0] },
};
export function skinOwned(id) {
  if (id === 'base') return true; if (!OAD.ok) return false;
  if (id === 'dawn') return OAD.owned;
  if (id === 'ember') return !!((G.skins && G.skins.ember) || (bm.info.items || []).includes('skin'));
  return false;
}
export const curSkin = () => (G.skin && SKINS[G.skin] && skinOwned(G.skin)) ? G.skin : 'base';
/* 칼 메시 재질만 바꿈 (맞을 때 번쩍임 목록에서 빼서 빛이 유지되게) → 궤적 색 돌려줌 */
export function applySkin(actor, id = curSkin()) {
  const w = actor && actor.weapon; if (!w) return null; const S = SKINS[id];
  if (!actor._wm0) actor._wm0 = w.material;
  const m0 = actor._wm0;
  if (!S || !S.col) { w.material = m0; if (!actor.mats.includes(m0)) actor.mats.push(m0); return null; }
  actor.mats = actor.mats.filter(m => m !== m0 && m !== w.material);
  w.material = new THREE.MeshStandardMaterial({ map: m0.map, normalMap: m0.normalMap, color: S.col, emissive: S.em, emissiveMap: m0.map, emissiveIntensity: S.ei, metalness: 0.85, roughness: 0.28, envMapIntensity: 0.9, alphaTest: 0.5, side: THREE.DoubleSide });
  return S.trail;
}

// ── 연속 실패 응원 선물 (docs/bm-policy.md 6장 · 단계형)
//   조건: 모험 스테이지(무한의 탑 · 황금 동굴 제외)를 같은 곳에서 3연속 실패 → 다음 도전 시작 때 / 6연속이면 조금 더
//   일부러 지기 방지: 20초 넘게 싸우고 3마리 넘게 쓰러뜨린 판만 셈 · '포기하고 나가기'는 웨이브 절반을 넘겼을 때만 셈
//   선물: 이번 출격 행동력 돌려줌(5) + 응원 공격력 +10% — 그 스테이지 한 판만, 무료 부활은 주지 않음 / 6번째: 행동력 10(5 더)
//     크기 근거(tools/help_bot.mjs 1-10 --weak=0.7): 클리어율 base 0~10% · 부활 1회 60~100% · 공격력 +10% 20~22% → 부활 효과의 약 0.2배
//     전투 버프를 더 키우면 ½ 넘음(+15% 63% · +12%·체력 5% 57% · +10%·체력 10% 67%) → 6번째의 '조금 더'는 전투 밖(행동력)으로만
//     하루 총량: 행동력 5 + 10 = 15 ≤ 광고 1회 보상(행동력 +20)
//   한도: 하루 2번 · 소장자 · 비소장자 똑같이 · bm.helpOn() false(실험 꺼짐)면 기록만 하고 주지 않음 · 난이도는 몰래 바꾸지 않음
export const HELP = { streak: 3, more: 6, perDay: 2, minT: 20, minKills: 3, tiers: [{ atk: 0.10, hp: 0, sta: STAMINA.cost }, { atk: 0.10, hp: 0, sta: STAMINA.cost * 2 }] };
function hs() { const o = G.help || {}; if (o.day !== today()) G.help = { day: today(), n: 0, sid: o.sid || '', streak: o.streak || 0, given: o.given || 0 }; return G.help; }
// 모험 스테이지 판이 끝날 때
export function noteStage(S, r) {
  if (S.tower || S.daily || r.sweep) return; const h = hs();
  if (r.win) { if (h.sid === S.id) { h.streak = 0; h.given = 0; } save(); return; }
  const counts = r.time >= HELP.minT && (r.kills || 0) >= HELP.minKills && (!r.quit || r.half);
  if (!counts) return;
  if (h.sid !== S.id) { h.sid = S.id; h.streak = 0; h.given = 0; }
  h.streak++; save();
}
// 지금 줄 선물 단계 (0 · 1) 또는 -1
export function helpTier(S) {
  if (S.tower || S.daily) return -1; const h = hs(); if (h.sid !== S.id || h.n >= HELP.perDay) return -1;
  if (h.given === 0 && h.streak >= HELP.streak) return 0;
  if (h.given === 1 && h.streak >= HELP.more) return 1;
  return -1;
}
/* 다음 도전 시작 때: 조건이 맞으면 두 그룹 모두 help_eligible 한 번 → 켜짐이면 true(선물 창) · 꺼짐이면 이번 조건만 소모 */
export function helpCheck(S) {
  const t = helpTier(S); if (t < 0) return -1; const on = bm.helpOn();
  track('help_eligible', { on: on ? 1 : 0, stage: S.id, tier: t + 1, streak: hs().streak });
  if (!on) { helpUsed(); return -1; }
  return t;
}
export function helpUsed() { const h = hs(); h.n++; h.given++; save(); }
