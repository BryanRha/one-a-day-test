// 모델 불러오기 · 복제 · 전리품 아이콘(3D 모델을 찍어 만듦)
import * as THREE from 'three';
import { GLTFLoader } from '../lib/GLTFLoader.js?v=0.99.35';
import { MeshoptDecoder } from '../lib/meshopt_decoder.module.js?v=0.99.35';
import * as SkeletonUtils from '../lib/SkeletonUtils.js?v=0.99.35';
import { ITEMS } from './data.js?v=0.99.35';
import { initHero } from './hero.js?v=0.99.35';
import { loadEnemyPack, enemyReady } from './enemy3d.js?v=0.99.35';

export const A = { props: {}, hero: null, skel: null, icons: {}, bytes: 0, chars: {}, packs: {}, packBytes: 0 };
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

function load(url, onBytes) {
  return new Promise((res, rej) => loader.load(url, g => res(g), e => { if (e.lengthComputable && onBytes) onBytes(url, e.loaded, e.total); }, rej));
}
/* 평면 셰이딩 로우폴리 톤 통일: MeshLambert 로 바꾸고 텍스처 최근접 필터 */
/* 꾸밈 소품(dress_*.glb): 정점 색 · 재질 2개(pal · glow)를 지도 전체가 같이 씀 → 합치면 지도당 그리기 2번 */
const VC = {};
function toonify(root, opt = {}) {
  root.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material; const map = m.map || null;
    if (o.geometry.getAttribute('color') && !map) { const g = m.name === 'glow'; o.material = VC[g ? 'glow' : 'pal'] ||= g ? new THREE.MeshBasicMaterial({ vertexColors: true }) : new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }); o.castShadow = !g; o.receiveShadow = !g; return; }
    if (map) { map.magFilter = THREE.NearestFilter; map.minFilter = THREE.NearestMipmapLinearFilter; map.colorSpace = THREE.SRGBColorSpace; }
    o.material = new THREE.MeshLambertMaterial({ map, color: m.color ? m.color.clone() : 0xffffff, transparent: m.transparent, opacity: m.opacity });
    o.castShadow = !!opt.cast; o.receiveShadow = opt.receive !== false;
  });
}
export async function loadAll(progress) {
  const seen = {}; const tick = (u, l, t) => { seen[u] = [l, t]; let a = 0, b = 0; for (const k in seen) { a += seen[k][0]; b += seen[k][1]; } progress?.(a / Math.max(1, b)); };
  const [p, h, s] = await Promise.all([load('assets/props.glb', tick), load('assets/hero.glb', tick), load('assets/skel.glb', tick)]);
  for (const k in seen) A.bytes += seen[k][1];
  for (const n of p.scene.children) { toonify(n); A.props[n.name] = n; }
  toonify(s.scene, { cast: true });
  A.hero = h; A.skel = s; initHero(h); /* 수달: 팔레트 재질 · 몸 그룹을 풀어 둠 (hero.js) */
  loadPack('ware').catch(e => console.warn('지도 묶음', e)); /* 창고 꾸밈 소품(약 35KB)은 기다리지 않고 받음 — 첫 출격 때 아직이면 출격이 기다림 */
  /* 무기: 1손 석궁 = 작살총 */
  return A;
}
/* v0.4 지도 묶음: 해금된 지도만 늦게 받음 (첫 진입 용량에 안 들어감) — 소품은 A.props 에 더하고, 해골 새 몸은 A.chars
   두 번 불러도 한 번만 받음 (Promise 공유) */
/* v0.5 레벨 아트: 지도마다 꾸밈 소품 · 랜드마크 묶음(dress_<지도>.glb · tools/props3d) — 창고도 묶음이 생김(첫 화면 뒤 바로 받기 시작) */
const PACK_FILES = { ware: { props: ['dress_ware.glb'], chars: {} }, harbor: { props: ['map_harbor.glb', 'dress_harbor.glb'], chars: {} }, tunnel: { props: ['map_tunnel.glb', 'dress_tunnel.glb'], chars: {} }, factory: { props: ['map_factory.glb', 'dress_factory.glb'], chars: {} }, lab: { props: ['dress_lab.glb'], chars: {} }, gate: { props: ['map_harbor.glb'], chars: {} } }; /* M5-A 대수문 꼭대기: 난간 · 벽은 항구 키트 */ /* M4-B 연구소: 벽 · 바닥 · 소품 모두 dress_lab 하나 */ /* v0.5.x: 등불 · 광부 해골 몸은 enemy_<지도>.glb 에 빛이끼와 같이 구워 넣음 → skel_rogue · skel_warrior 안 받음 */
const charLoads = {};
export const packReady = m => (!PACK_FILES[m] || A.packs[m] === true) && enemyReady(m);
/* v0.5.x 적 · 보스 전용 모델(enemy_<지도>.glb · tools/enemy3d)도 같은 때 받음 — 출격은 둘 다 받은 뒤 */
export function loadPack(m) { return Promise.all([loadEnemyPack(m), loadMapPack(m)]).then(() => {}); }
function loadMapPack(m) {
  if (!PACK_FILES[m]) return Promise.resolve();
  if (A.packs[m]) return A.packs[m] === true ? Promise.resolve() : A.packs[m];
  const F = PACK_FILES[m]; const bytes = (u, l, t) => { if (l >= t) A.packBytes += t; };
  const job = Promise.all([...F.props.map(f => load('assets/' + f, bytes).then(g => { for (const n of g.scene.children) { toonify(n); A.props[n.name] = n; } })),
    ...Object.entries(F.chars).map(([k, f]) => (charLoads[k] ||= load('assets/' + f, bytes).then(g => { toonify(g.scene, { cast: true }); A.chars[k] = g; })))]).then(() => { A.packs[m] = true; });
  A.packs[m] = job; job.catch(() => { A.packs[m] = null; });
  return job;
}
/* 소품 복제 (재질 · 지오메트리 공유) */
export function prop(key) {
  const src = A.props[key]; if (!src) { console.warn('prop 없음', key); return new THREE.Group(); }
  const c = src.clone(true); c.name = key; return c;
}
export function charClone(which) {
  const g = which === 'hero' ? A.hero : which === 'skel' ? A.skel : A.chars[which] || A.skel;
  const root = SkeletonUtils.clone(g.scene);
  /* 재질은 개체마다 따로 (피격 번쩍) */
  root.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0, 0, 0); o.frustumCulled = false; } });
  /* 새 해골 몸(동작 없음)은 skel.glb 동작을 뼈 이름으로 그대로 씀 */
  const clips = {}; for (const c of (g.animations?.length ? g.animations : A.skel.animations)) clips[c.name] = c;
  return { root, clips };
}
/* 보석 (코드 모델) */
export function gemMesh() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), new THREE.MeshLambertMaterial({ color: 0x5fe3d6, emissive: 0x0e5a55, flatShading: true }));
  m.scale.set(1, 1.35, 1); m.position.y = 0.42; g.add(m); return g;
}
/* 코드로 만든 작은 물건 (원본 팩에 없는 것) */
function shape(kind, color) {
  const g = new THREE.Group(); const c = new THREE.Color(color);
  const m = new THREE.MeshLambertMaterial({ color: c, flatShading: true, emissive: c.clone().multiplyScalar(0.15) });
  let mesh;
  if (kind === 'orb' || kind === 'orbS') { mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(kind === 'orb' ? 0.3 : 0.26, 1), m); mesh.position.y = 0.32; if (kind === 'orbS') { const pin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), new THREE.MeshLambertMaterial({ color: 0x3a4148 })); pin.position.y = 0.62; g.add(pin); } }
  else if (kind === 'disc') { mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.1, 18), m); mesh.rotation.x = 1.1; mesh.position.y = 0.35; const rim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.04, 6, 18), new THREE.MeshLambertMaterial({ color: 0x8a6a3a })); rim.position.copy(mesh.position); rim.rotation.x = 1.1 - Math.PI / 2; g.add(rim); }
  else if (kind === 'coil') { mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(0.2, 0.06, 40, 6, 1, 4), m); mesh.position.y = 0.3; mesh.scale.set(1, 1.6, 1); }
  else if (kind === 'chip') { mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.4), new THREE.MeshLambertMaterial({ color: 0x1f5a3a, flatShading: true })); mesh.position.y = 0.2; const led = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.12), m); led.position.set(0.1, 0.27, 0); g.add(led); }
  else if (kind === 'tarpS') { mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.42, 14), m); mesh.rotation.z = Math.PI / 2; mesh.position.y = 0.22; }
  /* v0.4 */
  else if (kind === 'rope') { mesh = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.09, 8, 20), m); mesh.rotation.x = Math.PI / 2; mesh.position.y = 0.12; const r2 = mesh.clone(); r2.position.y = 0.3; r2.scale.setScalar(0.85); g.add(r2); }
  else if (kind === 'fish') { mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), m); mesh.scale.set(1.4, 0.55, 0.5); mesh.position.y = 0.2; const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.26, 4), m); tail.rotation.z = Math.PI / 2; tail.position.set(-0.5, 0.2, 0); g.add(tail); }
  else if (kind === 'tube') { mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.9, 12), m); mesh.rotation.z = 1.2; mesh.position.y = 0.3; const lens = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12), new THREE.MeshBasicMaterial({ color: 0xbfeaff })); lens.position.set(0.42, 0.47, 0); lens.rotation.y = Math.PI / 2; g.add(lens); }
  else if (kind === 'rail') { mesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.22), m); mesh.position.y = 0.12; const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.34), m); top.position.y = 0.24; g.add(top); }
  else if (kind === 'ticket') { mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.34), m); mesh.position.y = 0.1; mesh.rotation.y = 0.3; const st = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.34), new THREE.MeshLambertMaterial({ color: 0xc1453b })); st.position.set(0.18, 0.1, 0.05); st.rotation.y = 0.3; g.add(st); }
  else if (kind === 'battery') { mesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.3), new THREE.MeshLambertMaterial({ color: 0x2a3a40, flatShading: true })); mesh.position.y = 0.25; const band = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.32), m); band.position.y = 0.3; g.add(band); for (const x of [-0.1, 0.1]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 8), m); t.position.set(x, 0.54, 0); g.add(t); } }
  else if (kind === 'o2can') { mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.62, 14), m); mesh.position.y = 0.31; const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.12, 10), new THREE.MeshLambertMaterial({ color: 0x3a4148 })); cap.position.y = 0.68; g.add(cap); }
  else if (kind === 'fang') { mesh = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.6, 7), m); mesh.rotation.z = 0.5; mesh.position.y = 0.28; }
  g.add(mesh); return g;
}
const SHAPES = ['orb', 'orbS', 'disc', 'coil', 'chip', 'tarpS', 'rope', 'fish', 'tube', 'rail', 'ticket', 'battery', 'o2can', 'fang'];
export function itemModel(key) { const k = ITEMS[key].model; return k === 'gem' ? gemMesh() : SHAPES.includes(k) ? shape(k, ITEMS[key].color) : prop(k); }

/* 전리품 아이콘: 작은 렌더러로 한 번 찍어 dataURL */
export function makeIcons(renderer) {
  const size = 128; const rt = new THREE.WebGLRenderTarget(size, size, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x445566, 2.2)); const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(2, 4, 3); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  const px = new Uint8Array(size * size * 4); const cv = document.createElement('canvas'); cv.width = cv.height = size; const cx = cv.getContext('2d');
  const prevClear = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha();
  for (const key in ITEMS) {
    const m = itemModel(key); sc.add(m);
    m.rotation.set(0.35, -0.7, 0);
    const box = new THREE.Box3().setFromObject(m); const c = box.getCenter(new THREE.Vector3()); const r = box.getSize(new THREE.Vector3()).length() * 0.5;
    cam.position.copy(c).add(new THREE.Vector3(0, 0, r / Math.tan(THREE.MathUtils.degToRad(15)) * 1.05)); cam.lookAt(c);
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, size, size, px);
    const img = cx.createImageData(size, size);
    for (let y = 0; y < size; y++) img.data.set(px.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    cx.clearRect(0, 0, size, size); cx.putImageData(img, 0, 0); A.icons[key] = cv.toDataURL();
    sc.remove(m);
  }
  renderer.setRenderTarget(null); renderer.setClearColor(prevClear, prevA); rt.dispose();
}
