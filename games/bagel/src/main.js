// 시작: 렌더러 · 직교 카메라 · 저장 불러오기 · 쉬는 동안 번 돈 · 루프
import * as THREE from 'three';
import { Game } from './game.js?v=0.99.28';
import { UI, IN } from './ui.js?v=0.99.28';
import './ui_menu.js?v=0.99.28';
import './desk.js?v=0.99.28';
import './map.js?v=0.99.28';
import { S, loadSave, save, resetAll } from './state.js?v=0.99.28';
import { BRANCHES } from './data.js?v=0.99.28';
import { setAudio, preload } from './audio.js?v=0.99.28';
import { installBack, track, flushDay } from './oad.js?v=0.99.28';
import { bm } from './oad_bm.js?v=0.99.28';

const app = {}; window.__app = app; window.__IN = IN; window.__S = () => S;   /* 시험 도구: 같은 입력 · 같은 저장 객체 */
const canvas = document.getElementById('view');
const r = new THREE.WebGLRenderer({ canvas, antialias: true }); r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.outputColorSpace = THREE.SRGBColorSpace; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 9000);
/* 화면 맞춤: HUD 크기 = 짧은 변 기준 (폰 390 → 1배 · PC 최대 1.5배) · 카메라 범위는 game.fitView */
const fit = () => { const w = innerWidth, h = innerHeight, z = Math.max(1, Math.min(1.5, Math.min(w, h) / 600)); document.documentElement.style.setProperty('--z', z.toFixed(3)); r.setSize(w, h, false); if (app.game?.B) app.game.fitView(); };
addEventListener('resize', fit);
const q = new URLSearchParams(location.search), SPEED = +(q.get('speed') || 1);
/* 시험용 씨앗 (?seed=N): 손님 · 주문 · 직원 쉬기 같은 우연을 판마다 바꿔 가며 되풀이 (gate_runs) */
if (q.get('seed')) { let t = +q.get('seed') >>> 0; Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
if (q.get('fresh')) { resetAll(); q.delete('fresh'); location.replace(location.pathname + '?' + q.toString()); }
loadSave(); setAudio(S.set); preload();
app.game = new Game(sc, cam); app.ui = new UI(app); app.game.ui = app.ui;
app.goBranch = i => { const prev = S.bi, v = app.game.leave(); if (S.branch[prev]) S.branch[prev].idleAt = Date.now(); S.bi = i; save(true); app.ui.desk(null); app.game.build(i); app.ui.progress(); if (v > 0) app.ui.toast(`${BRANCHES[prev].name}에 남은 돈 +${v.toLocaleString('en-US')} 챙겼어요`); };
app.game.build(S.bi); fit();
if (S.migrated && !S.migratedShown) { S.migratedShown = 1; save(true); setTimeout(() => app.ui.modal(`<h3>🥯 매장을 새로 꾸몄어요</h3><p>공정이 한 줄로 이어지는 새 마루미예요.<br>같은 시설은 그대로 열려 있어요.${S.migrated.refund ? `<br>없어진 방에 낸 돈 <b>+${S.migrated.refund.toLocaleString('en-US')}</b> 돌려드렸어요.` : ''}</p><button class="btn" id="mOk">좋아요</button>`) && (document.getElementById('mOk').onclick = () => app.ui.close()), 800); }
// 쉬는 동안 번 돈 (계산원 + 진열 직원이 있으면 · 사장실이 있으면 금고로)
const own = S.branch[S.bi]?.own || [], away = (Date.now() - S.last) / 1000;
if (own.includes('cashier') && own.includes('runner') && away > 120) { const v = Math.round(Math.min(away, app.ui.idleCapH() * 3600) * app.ui.idleRate(S.bi));
  if (own.includes('boss')) { S.safe.v = (+S.safe.v || 0) + v; S.safe.at = Date.now(); save(); setTimeout(() => app.ui.note(`🔐 쉬는 동안 번 돈 +${v.toLocaleString('en-US')} · 사장실 금고`), 900); }
  else setTimeout(() => app.ui.offline(v), 600); }
installBack({ back: () => { if (document.querySelector('#modal').firstChild) { app.ui.close(); return true; } return false; } });
flushDay();
const sess = {}; setInterval(() => { if (document.visibilityState === 'hidden' || app.paused) return; S.time[S.bi] = (S.time[S.bi] || 0) + 1; sess[S.bi] = (sess[S.bi] || 0) + 1; }, 1000);
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && Object.keys(sess).length) { track('bg_time', { ...Object.fromEntries(Object.entries(sess).map(([k, v]) => ['b' + k, v])) }); for (const k of Object.keys(sess)) delete sess[k]; } });
bm.onPause = on => { app.paused = !!on; };
if (q.get('bot')) import('./bot.js?v=0.99.28').then(m => m.startBot(app, q));
/* 한 프레임의 오류가 화면 전체를 멈추지 않게: 기록하고 그리기는 계속 */
const errSeen = new Set(); window.__errs = [];
const report = e => { const k = String(e && e.stack || e).split('\n').slice(0, 2).join(' '); if (errSeen.has(k)) return; errSeen.add(k); window.__errs.push(k); console.error('[game]', e); try { if (parent !== window) parent.postMessage({ type: 'oad:error', msg: String(e && e.message || e).slice(0, 200) }, '*'); } catch { /* 단독 */ } };
addEventListener('error', e => report(e.error || e.message)); addEventListener('unhandledrejection', e => report(e.reason));
let last = performance.now();
const loop = now => { requestAnimationFrame(loop); const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
  if (!app.paused) { try { for (let i = 0; i < SPEED; i++) app.game.update(dt, IN); app.ui.frame(app.game); } catch (e) { report(e); } }
  try { r.render(sc, cam); } catch (e) { report(e); } };
canvas.addEventListener('webglcontextlost', e => e.preventDefault()); canvas.addEventListener('webglcontextrestored', () => app.game.build(S.bi));
requestAnimationFrame(loop); setInterval(() => { app.game.snap(); save(); }, 5000); addEventListener('pagehide', () => { app.game.snap(); save(true); });
setTimeout(() => document.getElementById('boot').classList.add('off'), q.get('bot') ? 0 : 1400); window.done = 1;
