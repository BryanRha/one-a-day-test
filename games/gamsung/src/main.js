// 시작: 렌더러 · 쿼터뷰 카메라(끌어서 둘러보기 · 두 손가락/휠 확대) · 누르기 · 저장 · 루프
import * as THREE from 'three';
import { Game, STACK } from './game.js?v=0.99.24';
import { UI } from './ui.js?v=0.99.24';
import { S, ST, loadSave, save, addSkew, KEY, OLD_KEY } from './state.js?v=0.99.24';
import { FDX } from './layout.js?v=0.99.24';
import { areaBox } from './world.js?v=0.99.24';
import { music, setAudio, preloadSfx } from './audio.js?v=0.99.24';
import { installBack, runBack, inOAD, track } from './oad.js?v=0.99.24';
import { bm } from './oad_bm.js?v=0.99.24';

const app = {}; window.__app = app; window.__S = () => S;
const canvas = document.getElementById('view');
const r = new THREE.WebGLRenderer({ canvas, antialias: true }); r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.outputColorSpace = THREE.SRGBColorSpace; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; app.renderer = r;
const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 9000);
const view = { x: 0, z: -110, zoom: 1, f: 0 };
/* 화면 맞춤 (2026-10-28 PC 대응)
   · HUD 크기 --k = min(가로, 세로) 기준 (폰 1 · PC 최대 1.7) · 넓은 화면이면 body.wide (HUD 를 가장자리로 모음)
   · 카메라: 폰 세로(가로/세로 < 0.6)는 예전 그대로(끌어서 둘러보기) · 그 밖은 매장 전체(벽 · 간판 · 돌길)가 HUD 안쪽에 늘 다 들어오게 맞춤 */
/* 0.2.0: 지금 층의 열린 구역 전체(+ 벽 높이)를 HUD 안쪽에 맞춤 (PC) — 구역이 열리면 다시 */
const boxView = () => { const c = new THREE.OrthographicCamera(); c.position.set(1500, 1650, 1500 - 110); c.lookAt(0, 0, -110); c.updateMatrixWorld(); const v = new THREE.Vector3(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; const g = app.game, f = view.f || 0;
  const ids = g && g.B ? g.openIds() : new Set(['shop']); const boxes = g && g.B ? g.B.areas.filter(a => a.floor === f && ids.has(a.id)).map(areaBox) : [{ x0: -700, x1: 700, z0: -700, z1: 700 }];
  for (const b of boxes) for (const [x, z] of [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]]) for (const y of [0, z === b.z0 || x === b.x0 ? 340 : 0]) { v.set(x - f * FDX, y, z).applyMatrix4(c.matrixWorldInverse); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
  if (f === 0) for (const p of [[-600, 490, -790], [820, 0, 380]]) { v.set(...p).applyMatrix4(c.matrixWorldInverse); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
  return { x0, x1, y0, y1, cx: boxes.length ? (Math.min(...boxes.map(b => b.x0)) + Math.max(...boxes.map(b => b.x1))) / 2 : 0, cz: boxes.length ? (Math.min(...boxes.map(b => b.z0)) + Math.max(...boxes.map(b => b.z1))) / 2 : 0 }; };
app.wide = () => innerWidth / innerHeight >= 0.6;
const fit = () => { const w = innerWidth, h = innerHeight, k = Math.max(1, Math.min(1.7, Math.min(w, h) / 620)); r.setSize(w, h, false);
  document.documentElement.style.setProperty('--k', k); window.__k = k; document.body.classList.toggle('wide', w / k > 640);
  let S, fx = 0, fy = 0; if (w / h < 0.6) S = 1180 / view.zoom;
  else { const B = boxView(), top = 64 * k, bot = 150 * k, side = 84 * k, s = Math.max((B.y1 - B.y0) / 2 * h / Math.max(120, h - top - bot), (B.x1 - B.x0) / 2 * h / Math.max(160, w - side * 2)) * 1.03;
    S = s / view.zoom; fx = (B.x0 + B.x1) / 2; fy = (B.y0 + B.y1) / 2 + (top - bot) * s / h; if (!view.free) { view.x = (view.f || 0) * FDX; view.z = -110; } }
  cam.left = fx - S * w / h; cam.right = fx + S * w / h; cam.top = fy + S; cam.bottom = fy - S; cam.updateProjectionMatrix(); };
const place = () => { cam.position.set(view.x + 1500, 1650, view.z + 1500); cam.lookAt(view.x, 0, view.z); cam.updateMatrixWorld(); app.game && app.game.applySun && app.game.applySun(); };
app.fit = () => { fit(); place(); };
addEventListener('resize', fit);
loadSave(); setAudio(S.set); preloadSfx(); const away0 = Math.max(0, (Date.now() - S.last) / 1000);   /* 비운 시간은 불러온 바로 그때 (곧 저장이 S.last 를 바꿈) */
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
  dragStack = false; if (!app.game.deco && app.game.stack.length) { const p = app.game.pick(toRay(e.clientX, e.clientY)); dragStack = p && p.kind === 'stack'; }
  down.walk = !!(S.set.drag && !app.game.deco && !dragStack && !dragGhost); });   /* 설정 「끌어서 걷기」: 끄는 동안 사장님이 손가락 쪽으로 */   /* 작업대 탑 쟁반 끌기 */
canvas.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
  if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; view.zoom = Math.max(0.6, Math.min(2.2, pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)); view.pinched = true; fit(); return; }
  if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; if (Math.hypot(dx, dy) > 8) down.moved = true; if (!down.moved) return;
  if (dragGhost) { const p = floorAt(e.clientX, e.clientY); if (p) app.game.ghostMove(p.x, p.z); return; }
  if (dragStack) { toRay(e.clientX, e.clientY); if (ray.ray.intersectPlane(stackPlane, hitP)) app.game.stackG.position.set(Math.max(-60, Math.min(340, hitP.x - STACK.x)), 0, Math.max(-60, Math.min(80, hitP.z - STACK.z))); return; }
  if (down.walk) { const now2 = performance.now(); if (!down.wt || now2 - down.wt > 220) { down.wt = now2; const p = floorAt(e.clientX, e.clientY); if (p) app.game.walkTo(p.x, p.z); } return; }
  /* 화면을 끈 만큼 바닥이 따라오도록: 오른쪽 = (1,0,-1)/√2 · 화면 위쪽 바닥 방향 = (-1,0,-1)/√2 · 세로는 카메라 각도(sin≈0.614)만큼 늘어남 */
  const wpp = (cam.right - cam.left) / innerWidth, h = dx * wpp / 1.414, v = dy * wpp / 0.614 / 1.414;
  const ox = (view.f || 0) * FDX; view.x = Math.max(ox - 1400, Math.min(ox + 2000, down.vx - h - v)); view.z = Math.max(-700, Math.min(2400, down.vz + h - v)); view.free = true; place(); });
const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!down) return; const d = down; down = null;
  if (dragStack) { dragStack = false; app.game.stackG.position.set(0, 0, 0); app.ui.tap({ kind: 'stack' }); return; }   /* 끌어도 눌러도 픽업대로 */ if (d.moved || performance.now() - d.t > 450) return; app.ui.tap(app.game.pick(toRay(e.clientX, e.clientY)), floorAt(e.clientX, e.clientY)); };
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', e => { pts.delete(e.pointerId); down = null; pinch = null; });
canvas.addEventListener('wheel', e => { view.zoom = Math.max(0.6, Math.min(2.2, view.zoom * (e.deltaY < 0 ? 1.1 : 0.9))); view.pinched = true; fit(); e.preventDefault(); }, { passive: false });
/* 확장 지도 (시안 02): 층을 위로 쌓아 한눈에 · 이 동안 게임은 멈춤 · 끝나면 제자리로 */
export const OVY = 820;   /* 층 쌓아 보기 높이 간격 */
app.overview = (on, mg) => { const g = app.game; if (!!on === !!app._ov) return; app._ov = !!on; document.body.classList.toggle('ov', !!on);
  for (const o of sc.children) { const f = o.userData.floor ?? (o.position ? Math.max(0, Math.round(o.position.x / FDX)) : 0); if (!f && !o.userData.ovp) continue;
    if (on) { o.userData.ovp = o.position.clone(); o.position.x -= f * FDX; o.position.y += f * OVY; } else if (o.userData.ovp) { o.position.copy(o.userData.ovp); delete o.userData.ovp; } }
  sc.traverse(o => { if (o.userData.ground && o.parent?.userData.floor > 0) o.visible = !on; });   /* 위층 바닥 땅은 숨김 (아래층이 보이게) */
  if (on) { const c = new THREE.OrthographicCamera(); c.position.set(1500, 1650, 1500); c.lookAt(0, 0, 0); c.updateMatrixWorld(); const v = new THREE.Vector3(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; const ids = g.openIds(); for (const st of g.B.stages) if (!ST().build[st.i] && !ids.has(st.ids[0]) && g.nextStage() !== st) continue; else for (const id of st.ids) { const a = g.area(id), b = areaBox(a); for (const [x, z] of [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]]) for (const y of [0, 330]) { v.set(x - a.floor * FDX, y + a.floor * OVY, z).applyMatrix4(c.matrixWorldInverse); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); } }
    const w = innerWidth, h = innerHeight, k = window.__k || 1, top = mg ? mg.top : 230 * k, bot = mg ? mg.bot : 200 * k, s = Math.max((y1 - y0) / 2 * h / Math.max(160, h - top - bot), (x1 - x0) / 2 * h / Math.max(160, w - 30) * 0.72) * 1.04;   /* 옆은 조금 잘려도 층이 크게 (시안 02) */ cam.left = (x0 + x1) / 2 - s * w / h; cam.right = (x0 + x1) / 2 + s * w / h; cam.top = (y0 + y1) / 2 + s + (top - bot) * s / h; cam.bottom = (y0 + y1) / 2 - s + (top - bot) * s / h; cam.updateProjectionMatrix(); cam.position.set(1500, 1650, 1500); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
    g.sun.position.set(700, 2400, 900); g.sun.target.position.set(0, 0, 0); g.sun.target.updateMatrixWorld(); sc.traverse(o => { if (o.isPointLight) o.visible = false; }); }
  else { fit(); place(); } };
app.focus = (x, z) => { view.x = x; view.z = z; view.free = true; place(); };
/* 층 바꾸기 (오른쪽 층 버튼 · 사장님이 계단을 오르내림): 카메라만 그 층으로 */
app.floor = f => { if (view.f === f && view.set) return; view.f = f; view.set = true; if (!view.pinched) view.zoom = (S.stores[S.si]?.open.length || 1) >= 2 && !app.wide() ? 0.8 : 1;   /* 매장이 커지면 폰은 조금 멀리서 (손가락으로 확대 가능) */ const B = boxView(); view.x = f * FDX + (app.wide() ? 0 : B.cx - f * FDX); view.z = app.wide() ? -110 : Math.max(-400, Math.min(B.cz, 900)); view.free = !app.wide(); fit(); place(); };
/* 폰: 사장님이 화면 밖으로 나가면 살짝 따라감 */
app.follow = (x, z, dt) => { if (app.wide() || down) return; const v = new THREE.Vector3(x, 100, z).project(cam); if (Math.abs(v.x) < 0.72 && v.y < 0.55 && v.y > -0.45) return; const k = Math.min(1, dt * 2.5); view.x += (x - view.x) * k; view.z += (z - view.z) * k; place(); };

installBack({ back: () => { if (document.querySelector('#modal').firstChild) { app.ui.close(); return true; } if (app.game.deco) { app.ui.decoExit(); return true; } if ((view.f || 0) !== 0) { app.ui.setFloor(0); return true; } return false; } });   /* 위층을 보고 있으면 뒤로 = 1층 */
if (!(inOAD && 'CloseWatcher' in window)) addEventListener('keydown', e => { if (e.key === 'Escape') { try { runBack(); } catch { /* */ } } });   /* PC: Esc = 뒤로 (원어데이 안에서 CloseWatcher 가 Esc 를 받으면 그쪽이 처리) */
music('cafe');
bm.onPause = on => { app.paused = !!on; };
// 자리를 비운 사이: 머신·로스터는 실제 시각으로 계속 → 다 된 것 알림
setTimeout(() => { if (!window.__bot) app.ui.welcome(away0); }, 900);
/* 매장 QR 선물 (의뢰사 협조 뒤 · 계획안 6-1): ?qr=지점번호 → 그 지점 서예 액자 한 번 · 지표 gs_qr */
{ const qr = new URLSearchParams(location.search).get('qr'); if (qr != null && /^[0-6]$/.test(qr) && !(S.tip.qr || {})[qr]) { (S.tip.qr ||= {})[qr] = Date.now(); S.inv.calli = (S.inv.calli || 0) + 1; save(true); track('gs_qr', { b: +qr }); setTimeout(() => app.ui.toast('매장 방문 선물 · 서예 액자를 받았어요 (꾸미기 벽)'), 1600); } }   /* 동료 2명이면 쉬는 동안 번 돈 (ui.awayCard) */

/* 한 프레임의 오류가 화면 전체를 멈추지 않게 */
const errSeen = new Set(); window.__errs = [];
const report = e => { const k = String(e && e.stack || e).split('\n').slice(0, 2).join(' '); if (errSeen.has(k)) return; errSeen.add(k); window.__errs.push(k); console.error('[game]', e); try { if (parent !== window) parent.postMessage({ type: 'oad:error', msg: String(e && e.message || e).slice(0, 200) }, '*'); } catch { /* 단독 실행 */ } };
addEventListener('error', e => report(e.error || e.message)); addEventListener('unhandledrejection', e => report(e.reason));
const q = new URLSearchParams(location.search), SPEED = +(q.get('speed') || 1); if (q.get('bot')) import('./bot.js?v=0.99.24').then(m => m.startBot(app));
if (q.get('fresh')) { window.__noSave = true; localStorage.removeItem(KEY); localStorage.removeItem(OLD_KEY);   /* 떠날 때 저장이 지운 것을 되살리지 않게 */ q.delete('fresh'); location.replace(location.pathname + '?' + q.toString()); }
let last = performance.now();
const loop = now => { requestAnimationFrame(loop); const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
  if (app.paused) { last = now; try { r.render(sc, cam); } catch (e) { report(e); } return; }   /* 광고 · 확인 창 동안 멈춤 (oad_bm onPause) */
  if (app._ov) { try { r.render(sc, cam); } catch (e) { report(e); } return; }   /* 확장 지도 보는 동안 멈춤 */
  try { for (let i = 0; i < SPEED; i++) app.game.update(dt); if (SPEED > 1) addSkew((SPEED - 1) * dt * 1000); } catch (e) { report(e); }
  try { r.render(sc, cam); } catch (e) { report(e); } };
canvas.addEventListener('webglcontextlost', e => e.preventDefault()); canvas.addEventListener('webglcontextrestored', () => app.game.build());
requestAnimationFrame(loop); setInterval(() => save(), 5000); addEventListener('pagehide', () => { save(true); try { track('gs_time', { b: S.si, s: Math.round(ST().time || 0) }); ST().time = 0; save(true); } catch { /* */ } });
setTimeout(() => document.getElementById('boot').classList.add('off'), 1500); window.done = 1;
