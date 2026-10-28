// 시작: 렌더러 · 쿼터뷰 카메라(끌어서 둘러보기 · 두 손가락/휠 확대) · 누르기 · 저장 · 루프
import * as THREE from 'three';
import { Game, STACK } from './game.js?v=0.81.5';
import { UI } from './ui.js?v=0.81.5';
import { S, loadSave, save, addSkew } from './state.js?v=0.81.5';
import { music, setAudio, preloadSfx } from './audio.js?v=0.81.5';
import { installBack, runBack, inOAD } from './oad.js?v=0.81.5';

const app = {}; window.__app = app; window.__S = () => S;
const canvas = document.getElementById('view');
const r = new THREE.WebGLRenderer({ canvas, antialias: true }); r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.outputColorSpace = THREE.SRGBColorSpace; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 9000);
const view = { x: 0, z: -110, zoom: 1 };
/* 화면 맞춤 (2026-10-28 PC 대응)
   · HUD 크기 --k = min(가로, 세로) 기준 (폰 1 · PC 최대 1.7) · 넓은 화면이면 body.wide (HUD 를 가장자리로 모음)
   · 카메라: 폰 세로(가로/세로 < 0.6)는 예전 그대로(끌어서 둘러보기) · 그 밖은 매장 전체(벽 · 간판 · 돌길)가 HUD 안쪽에 늘 다 들어오게 맞춤 */
const BOX = [[-700, 0, -700], [700, 0, -700], [-700, 0, 700], [700, 0, 700], [-700, 340, -700], [700, 340, -700], [-700, 340, 700], [-600, 490, -790], [-340, 490, -530], [820, 0, 380], [820, 0, -60]];
const boxView = (() => { const c = new THREE.OrthographicCamera(); c.position.set(1500, 1650, 1500 - 110); c.lookAt(0, 0, -110); c.updateMatrixWorld(); const v = new THREE.Vector3(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of BOX) { v.set(...p).applyMatrix4(c.matrixWorldInverse); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); } return { x0, x1, y0, y1 }; })();
const fit = () => { const w = innerWidth, h = innerHeight, k = Math.max(1, Math.min(1.7, Math.min(w, h) / 620)); r.setSize(w, h, false);
  document.documentElement.style.setProperty('--k', k); window.__k = k; document.body.classList.toggle('wide', w / k > 640);
  let S, fx = 0, fy = 0; if (w / h < 0.6) S = 1180 / view.zoom;
  else { const B = boxView, top = 64 * k, bot = 128 * k, side = 84 * k, s = Math.max((B.y1 - B.y0) / 2 * h / Math.max(120, h - top - bot), (B.x1 - B.x0) / 2 * h / Math.max(160, w - side * 2)) * 1.03;
    S = s / view.zoom; fx = (B.x0 + B.x1) / 2; fy = (B.y0 + B.y1) / 2 + (top - bot) * s / h; }
  cam.left = fx - S * w / h; cam.right = fx + S * w / h; cam.top = fy + S; cam.bottom = fy - S; cam.updateProjectionMatrix(); };
const place = () => { cam.position.set(view.x + 1500, 1650, view.z + 1500); cam.lookAt(view.x, 0, view.z); };
addEventListener('resize', fit);
loadSave(); setAudio(S.set); preloadSfx();
app.game = new Game(sc, cam, null); app.ui = new UI(app); app.game.ui = app.ui; app.game.view = view; app.cam = cam;
app.game.build(); fit(); place();

// ── 누르기 · 끌기 · 확대
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
const toRay = (x, y) => { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam); return ray.ray; };
const floorAt = (x, y) => { toRay(x, y); return ray.ray.intersectPlane(floor, hitP) ? hitP.clone() : null; };
const pts = new Map(); let down = null, pinch = null, dragGhost = false, dragStack = false; const stackPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -STACK.y);
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
  if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: view.zoom }; down = null; return; }
  down = { x: e.clientX, y: e.clientY, t: performance.now(), vx: view.x, vz: view.z, moved: false };
  dragGhost = false; if (app.game.deco?.ghost) { const p = app.game.pick(toRay(e.clientX, e.clientY)); dragGhost = p && p.kind === 'ghost'; }
  dragStack = false; if (!app.game.deco && app.game.stack.length) { const p = app.game.pick(toRay(e.clientX, e.clientY)); dragStack = p && p.kind === 'stack'; } });   /* 작업대 탑 쟁반 끌기 */
canvas.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
  if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; view.zoom = Math.max(0.7, Math.min(2.2, pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)); fit(); return; }
  if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; if (Math.hypot(dx, dy) > 8) down.moved = true; if (!down.moved) return;
  if (dragGhost) { const p = floorAt(e.clientX, e.clientY); if (p) app.game.ghostMove(p.x, p.z); return; }
  if (dragStack) { toRay(e.clientX, e.clientY); if (ray.ray.intersectPlane(stackPlane, hitP)) app.game.stackG.position.set(Math.max(-60, Math.min(340, hitP.x - STACK.x)), 0, Math.max(-60, Math.min(80, hitP.z - STACK.z))); return; }
  /* 화면을 끈 만큼 바닥이 따라오도록: 오른쪽 = (1,0,-1)/√2 · 화면 위쪽 바닥 방향 = (-1,0,-1)/√2 · 세로는 카메라 각도(sin≈0.614)만큼 늘어남 */
  const wpp = (cam.right - cam.left) / innerWidth, h = dx * wpp / 1.414, v = dy * wpp / 0.614 / 1.414;
  view.x = Math.max(-700, Math.min(700, down.vx - h - v)); view.z = Math.max(-500, Math.min(800, down.vz + h - v)); place(); });
const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!down) return; const d = down; down = null;
  if (dragStack) { dragStack = false; app.game.stackG.position.set(0, 0, 0); app.ui.tap({ kind: 'stack' }); return; }   /* 끌어도 눌러도 픽업대로 */ if (d.moved || performance.now() - d.t > 450) return; app.ui.tap(app.game.pick(toRay(e.clientX, e.clientY)), floorAt(e.clientX, e.clientY)); };
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', e => { pts.delete(e.pointerId); down = null; pinch = null; });
canvas.addEventListener('wheel', e => { view.zoom = Math.max(0.7, Math.min(2.2, view.zoom * (e.deltaY < 0 ? 1.1 : 0.9))); fit(); e.preventDefault(); }, { passive: false });
app.focus = (x, z) => { view.x = x; view.z = z; place(); };

installBack({ back: () => { if (document.querySelector('#modal').firstChild) { app.ui.close(); return true; } if (app.game.deco) { app.ui.decoExit(); return true; } return false; } });
if (!(inOAD && 'CloseWatcher' in window)) addEventListener('keydown', e => { if (e.key === 'Escape') { try { runBack(); } catch { /* */ } } });   /* PC: Esc = 뒤로 (원어데이 안에서 CloseWatcher 가 Esc 를 받으면 그쪽이 처리) */
music('cafe');
// 자리를 비운 사이: 머신·로스터는 실제 시각으로 계속 → 다 된 것 알림
setTimeout(() => app.ui.welcome((Date.now() - S.last) / 1000), 900);

/* 한 프레임의 오류가 화면 전체를 멈추지 않게 */
const errSeen = new Set(); window.__errs = [];
const report = e => { const k = String(e && e.stack || e).split('\n').slice(0, 2).join(' '); if (errSeen.has(k)) return; errSeen.add(k); window.__errs.push(k); console.error('[game]', e); try { if (parent !== window) parent.postMessage({ type: 'oad:error', msg: String(e && e.message || e).slice(0, 200) }, '*'); } catch { /* 단독 실행 */ } };
addEventListener('error', e => report(e.error || e.message)); addEventListener('unhandledrejection', e => report(e.reason));
const q = new URLSearchParams(location.search), SPEED = +(q.get('speed') || 1); if (q.get('bot')) import('./bot.js?v=0.81.5').then(m => m.startBot(app));
if (q.get('fresh')) { localStorage.removeItem('gamsung_v1'); q.delete('fresh'); location.replace(location.pathname + '?' + q.toString()); }
let last = performance.now();
const loop = now => { requestAnimationFrame(loop); const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
  try { for (let i = 0; i < SPEED; i++) app.game.update(dt); if (SPEED > 1) addSkew((SPEED - 1) * dt * 1000); } catch (e) { report(e); }
  try { r.render(sc, cam); } catch (e) { report(e); } };
canvas.addEventListener('webglcontextlost', e => e.preventDefault()); canvas.addEventListener('webglcontextrestored', () => app.game.build());
requestAnimationFrame(loop); setInterval(() => save(), 5000); addEventListener('pagehide', () => save(true));
setTimeout(() => document.getElementById('boot').classList.add('off'), 1500); window.done = 1;
