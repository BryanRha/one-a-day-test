// 시작: 렌더러 · 직각 투영 카메라(쿼터뷰) · 저장 불러오기 · 쉬는 동안 번 돈 · 루프
import * as THREE from 'three';
import { Game } from './game.js?v=0.99.19';
import { UI, IN } from './ui.js?v=0.99.19';
import { S, loadSave, save, vipOn } from './state.js?v=0.99.19';
import { BRANCHES, MENU, VIP, IDLE } from './data.js?v=0.99.19';
import { music, setAudio, preloadSfx } from './audio.js?v=0.99.19';
import { installBack, track, flushDay } from './oad.js?v=0.99.19';
import './rooms_ui.js?v=0.99.19';
import { bm } from './oad_bm.js?v=0.99.19';

const app = {}; window.__app = app; window.__IN = IN;   /* 시험 도구: 빌드 묶음(?v=)에서도 같은 입력 객체를 쓰게 */ import("./state.js?v=0.99.19").then(m => { window.__S = () => m.S; }); import("./data.js?v=0.99.19").then(m => { window.__DECO = m.DECO; });   /* 시험 도구용 */
const canvas = document.getElementById('view');
const r = new THREE.WebGLRenderer({ canvas, antialias: true }); r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.outputColorSpace = THREE.SRGBColorSpace; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
/* 화면 맞춤: HUD 크기 = 짧은 변 기준 (폰 390 → 1배 · PC 최대 1.5배) · 카메라 범위는 game.fitView (넓은 화면은 매장 전체) */
const fit = () => { const w = innerWidth, h = innerHeight, z = Math.max(1, Math.min(1.5, Math.min(w, h) / 600)); document.documentElement.style.setProperty('--z', z.toFixed(3)); r.setSize(w, h, false);
  if (app.game && app.game.B) { app.game.hudZ = z; app.game.fitView(); } else { const S2 = w / h < 0.8 ? 1150 : 680; cam.left = -S2 * w / h; cam.right = S2 * w / h; cam.top = S2; cam.bottom = -S2; cam.updateProjectionMatrix(); } };
addEventListener('resize', fit); fit();
loadSave(); setAudio(S.set); preloadSfx();
app.goBranch = i => { const prev = S.bi, v = app.game.leave(); if (S.branch[prev]) S.branch[prev].idleAt = Date.now(); S.bi = i; save(true); app.ui.roomSheet(null); app.game.build(i); app.ui.progress(); if (v > 0) app.ui.toast(`${BRANCHES[prev].name}에 남은 돈 +${v.toLocaleString('en-US')} 챙겼어요`); app.ui.pause('arrive'); };   /* 떠나는 지점: 재고 저장 · 바닥 돈 챙김 (테스터 #11) · 도착 = 쉼표 (전면 광고는 그룹 C 만 · 앱이 판단) */
app.game = new Game(sc, cam, null); app.ui = new UI(app); app.game.ui = app.ui; app.game.build(S.bi); app.ui.progress(); fit();
// 쉬는 동안 번 돈 (계산원 + 진열 직원이 있으면 · 최대 2시간 · VIP 8시간 · 점장 +2시간 · 지점 영구 단계 · VIP ×1.5) → 사장실이 열렸으면 금고로 (걸어가서 받음)
const st = S.branch[S.bi]?.staff || [], away = (Date.now() - S.last) / 1000;
if (st.includes('cashier') && st.includes('baker') && away > 120) { const v = Math.round(Math.min(away, app.ui.idleCapH() * 3600) * app.ui.idleRate(S.bi));
  if (app.game.open.has('boss')) { S.safe.v = (+S.safe.v || 0) + v; S.safe.at = Date.now(); save(); setTimeout(() => app.ui.toast(`🔐 쉬는 동안 번 돈 +${v.toLocaleString('en-US')} · 사장실 금고에 있어요`), 900); }
  else setTimeout(() => app.ui.offline(v), 600); }
installBack({ back: () => { if (document.querySelector('#modal').firstChild) { app.ui.close(); return true; } if (app.ui.sheetOn()) { app.ui.roomSheet(null, false, null, true); return true; } return false; } });   /* 창 → 방 창(크루룸 · 사장실 · 창고) → 원어데이 */
flushDay();   /* 어제 메뉴별 판매(bg_sold) 묶어 보내기 */
const sess = {}; setInterval(() => { if (document.visibilityState === 'hidden' || app.paused) return; S.time[S.bi] = (S.time[S.bi] || 0) + 1; sess[S.bi] = (sess[S.bi] || 0) + 1; }, 1000);   /* 지점별 머문 초 (간판 · 매장 노출 시간) */
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && Object.keys(sess).length) { track('bg_time', { ...Object.fromEntries(Object.entries(sess).map(([k, v]) => ['b' + k, v])) }); for (const k of Object.keys(sess)) delete sess[k]; } });
music(S.bi % 2 ? 'shop2' : 'shop');
let last = performance.now();
bm.onPause = on => { app.paused = !!on; };
const q = new URLSearchParams(location.search), SPEED = +(q.get('speed') || 1); if (q.get('fresh')) { window.__noSave = true; localStorage.removeItem('marumi_v1'); localStorage.removeItem('marumi_v2'); q.delete('fresh'); location.replace(location.pathname + '?' + q.toString()); }
if (q.get('bot')) import('./bot.js?v=0.99.19').then(m => m.startBot(app));
/* 한 프레임의 오류가 화면 전체를 멈추지 않게: 오류는 기록하고 그리기는 계속 · 위치가 깨지면 되돌림 */
const errSeen = new Set(); window.__errs = [];
const report = e => { const k = String(e && e.stack || e).split('\n').slice(0, 2).join(' '); if (errSeen.has(k)) return; errSeen.add(k); window.__errs.push(k); console.error('[game]', e); try { if (parent !== window) parent.postMessage({ type: 'oad:error', msg: String(e && e.message || e).slice(0, 200) }, '*'); } catch { /* 단독 실행 */ } if (localStorage.getItem('__test_env') !== null || location.pathname.includes('-test')) app.ui.toast('오류: ' + String(e && e.message || e).slice(0, 60)); };
addEventListener('error', e => report(e.error || e.message)); addEventListener('unhandledrejection', e => report(e.reason));
const loop = now => { requestAnimationFrame(loop); const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
  if (app.paused) { try { r.render(sc, cam); } catch (e) { report(e); } return; }   /* 원어데이 광고 · 확인 창 동안 멈춤 (oad_bm onPause) */
  try { for (let i = 0; i < SPEED; i++) app.game.update(dt, IN); } catch (e) { report(e); }
  const P = app.game.pl && app.game.pl.pos; if (P && !Number.isFinite(P.x + P.z)) { P.set(-380, 0, -330); app.game.camT.copy(P); report(new Error('player position reset')); }
  try { r.render(sc, cam); } catch (e) { report(e); } };
canvas.addEventListener('webglcontextlost', e => e.preventDefault()); canvas.addEventListener('webglcontextrestored', () => app.game.build(S.bi));   /* 폰이 그래픽을 회수했다 돌려줄 때 다시 그림 */
requestAnimationFrame(loop); setInterval(() => { app.game.snap(); save(); }, 5000); addEventListener('pagehide', () => { app.game.snap(); save(true); });   /* snap: 진열 · 재료 재고도 저장 (다시 열어도 그대로) */   /* 슬롯 불러오기·초기화 때는 __noSave 로 덮어쓰기 막음 */
setTimeout(() => document.getElementById('boot').classList.add('off'), q.get('bot') ? 0 : 1600); window.done = 1;
