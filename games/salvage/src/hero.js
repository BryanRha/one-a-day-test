// 수달 주인공 만들기 — hero.glb(뼈 · 동작 · 몸 그룹) + 장착 파일(assets/gear/*.glb)을 한 SkinnedMesh 로 합침
//   · 몸 + 머리/몸/등/얼굴 장착 = 그리기 1번, 무기(주 · 보조 + 개조 부품) = 1번 (보조는 drawRange 로 바꿔 보임)
//   · 모든 부품은 '쉬는 자세 세계 좌표' 실수 배열로 풀어 두고(양자화 해제) 이어 붙임 → 뼈 역행렬은 지금 뼈에서 다시 계산
//   · 색 = 16×16 팔레트 DataTexture (알파 = 빛 가림: 0 이면 스스로 빛남) · 털 · 무늬 · 의상 · 총 스킨은 칸 색만 바꿈
//   · 판 안에서는 장착한 파일만 받음(ensure) · 옷장에서만 나머지를 늦게 받음
import * as THREE from 'three';
import { GLTFLoader } from '../lib/GLTFLoader.js?v=0.99.33';
import { MeshoptDecoder } from '../lib/meshopt_decoder.module.js?v=0.99.33';
import * as SkeletonUtils from '../lib/SkeletonUtils.js?v=0.99.33';
import { CELLS } from './hero_gen.js?v=0.99.33';

export const HERO_SCALE = 0.8; /* 쉬는 자세 키 약 2.1 → 화면 1.7m (장착물에 따라 바뀌지 않게 고정) */
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
export const H = { base: null, groups: {}, gear: {}, wait: {}, bytes: 0, files: 0, merges: 0 };
const v3 = new THREE.Vector3(), n3 = new THREE.Vector3(), nm = new THREE.Matrix3();

/* 메시 → 쉬는 자세 세계 좌표 실수 배열 */
function bake(mesh) {
  const g = mesh.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
  const n = P.count; const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  const map = mesh.material?.map; const rep = map ? map.repeat : null, ofs = map ? map.offset : null;
  nm.getNormalMatrix(mesh.matrixWorld);
  for (let i = 0; i < n; i++) {
    v3.fromBufferAttribute(P, i);
    if (mesh.isSkinnedMesh) mesh.applyBoneTransform(i, v3);
    v3.applyMatrix4(mesh.matrixWorld); pos[i * 3] = v3.x; pos[i * 3 + 1] = v3.y; pos[i * 3 + 2] = v3.z;
    n3.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nrm[i * 3] = n3.x; nrm[i * 3 + 1] = n3.y; nrm[i * 3 + 2] = n3.z;
    let u = U.getX(i), w = U.getY(i); if (rep) { u = u * rep.x + ofs.x; w = w * rep.y + ofs.y; } uv[i * 2] = u; uv[i * 2 + 1] = w;
    for (let k = 0; k < 4; k++) { si[i * 4 + k] = SI.getComponent ? SI.getComponent(i, k) : [SI.getX(i), SI.getY(i), SI.getZ(i), SI.getW(i)][k]; sw[i * 4 + k] = [SW.getX(i), SW.getY(i), SW.getZ(i), SW.getW(i)][k]; }
    let s = sw[i * 4] + sw[i * 4 + 1] + sw[i * 4 + 2] + sw[i * 4 + 3]; if (s > 0) for (let k = 0; k < 4; k++) sw[i * 4 + k] /= s;
  }
  const I = g.index; const idx = I ? Uint32Array.from(I.array) : Uint32Array.from({ length: n }, (_, i) => i);
  return { pos, nrm, uv, si, sw, idx, n, tris: idx.length / 3 };
}
/* hero.glb 를 받은 뒤 한 번 */
export function initHero(gltf) {
  H.base = gltf; gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(o => { if (o.isSkinnedMesh && o.name.startsWith('otter_')) H.groups[o.name.slice(6)] = bake(o); });
  H.clips = {}; for (const c of gltf.animations) H.clips[c.name] = c;
}
/* 장착 파일 받기 (이미 있으면 바로) */
export function ensure(files) {
  const need = files.filter(f => !H.gear[f]);
  return Promise.all(need.map(f => H.wait[f] ||= new Promise((res, rej) => loader.load('assets/gear/' + f + '.glb', g => {
    g.scene.updateMatrixWorld(true); let m = null; g.scene.traverse(o => { if (o.isMesh && !m) m = o; });
    const b = bake(m); b.extras = m.userData || {}; H.gear[f] = b; H.files++; delete H.wait[f]; res(b);
  }, e => { if (e.lengthComputable && e.loaded === e.total) H.bytes += e.total; }, e => { delete H.wait[f]; rej(e); }))));
}
export const ready = files => files.every(f => H.gear[f]);

/* 부품 이어 붙이기 → BufferGeometry (off = 쉬는 자세 세계 이동량) */
function merge(list) {
  let n = 0, t = 0; for (const { src } of list) { n += src.n; t += src.idx.length; }
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), idx = new Uint32Array(t);
  let o = 0, oi = 0; const ranges = [];
  for (const { src, off = [0, 0, 0] } of list) {
    for (let i = 0; i < src.n; i++) { pos[(o + i) * 3] = src.pos[i * 3] + off[0]; pos[(o + i) * 3 + 1] = src.pos[i * 3 + 1] + off[1]; pos[(o + i) * 3 + 2] = src.pos[i * 3 + 2] + off[2]; }
    nrm.set(src.nrm, o * 3); uv.set(src.uv, o * 2); si.set(src.si, o * 4); sw.set(src.sw, o * 4);
    for (let i = 0; i < src.idx.length; i++) idx[oi + i] = src.idx[i] + o;
    ranges.push([oi, src.idx.length]); o += src.n; oi += src.idx.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  g.setIndex(new THREE.BufferAttribute(n > 65535 ? idx : Uint16Array.from(idx), 1)); g.userData.ranges = ranges; g.userData.verts = n; H.merges++;
  return g;
}
const geoCache = new Map();
function cached(key, make) { let g = geoCache.get(key); if (g) { geoCache.delete(key); geoCache.set(key, g); return g; } g = make(); geoCache.set(key, g); if (geoCache.size > 14) { const k0 = geoCache.keys().next().value; geoCache.get(k0).dispose(); geoCache.delete(k0); } return g; }

/* 팔레트 텍스처 (칸 색 바꾸기) */
const texCache = new Map();
const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export function paletteTex(over = {}) {
  const key = JSON.stringify(over); if (texCache.has(key)) return texCache.get(key);
  const d = new Uint8Array(16 * 16 * 4); for (let i = 0; i < 256; i++) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 128; d[i * 4 + 3] = 255; }
  for (const [name, [i, col, glow]] of Object.entries(CELLS)) { const [r, g, b] = hexRGB(over[name] || col); d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = glow ? 0 : 255; }
  const t = new THREE.DataTexture(d, 16, 16, THREE.RGBAFormat); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  texCache.set(key, t); if (texCache.size > 24) { const k0 = texCache.keys().next().value; texCache.get(k0).dispose(); texCache.delete(k0); }
  return t;
}
/* 재질: 램버트 + 팔레트 알파가 0 인 칸(헤드램프 · 랜턴 · 렌즈)은 스스로 빛남 */
export function heroMat(tex) {
  const m = new THREE.MeshLambertMaterial({ map: tex });
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <map_fragment>', '#include <map_fragment>\n\tfloat heroGlow = 1.0 - sampledDiffuseColor.a; diffuseColor.a = opacity;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * heroGlow * 0.75;');
  };
  m.customProgramCacheKey = () => 'heroGlow1';
  m.userData.hero = true;
  return m;
}

/* 주인공 하나 만들기: spec = look.resolve() 결과 */
export function makeHero(spec) {
  const root = SkeletonUtils.clone(H.base.scene); root.name = 'otter';
  let skel = null; const kill = [];
  root.traverse(o => { if (o.isSkinnedMesh) { skel ||= o.skeleton; kill.push(o); } });
  for (const o of kill) o.parent.remove(o);
  root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.scale.setScalar(1); root.updateMatrixWorld(true);
  const bones = skel.bones; const skeleton = new THREE.Skeleton(bones, bones.map(b => b.matrixWorld.clone().invert()));
  const list = [...spec.groups.map(g => ({ src: H.groups[g.name], off: g.off })), ...spec.parts.filter(p => H.gear[p.file]).map(p => ({ src: H.gear[p.file], off: p.off }))].filter(p => p.src);
  const bodyGeo = cached('b' + spec.key + '|' + list.length, () => merge(list));
  const mat = heroMat(paletteTex(spec.pal));
  const body = new THREE.SkinnedMesh(bodyGeo, mat); body.name = 'otter_body'; body.frustumCulled = false; body.castShadow = true; body.receiveShadow = true;
  root.add(body); body.bind(skeleton, new THREE.Matrix4());
  const hero = { root, body, skeleton, mats: [mat], clips: H.clips, tail: ['tail.1', 'tail.2', 'tail.3'].map(n => bones.find(b => b.name === n)), t: Math.random() * 5, wi: 0, spec };
  /* 무기: 주 → 보조 (같은 메시, 보이는 구간만 바꿈) */
  if (spec.weapons.length) {
    const wl = []; const ranges = [];
    for (const w of spec.weapons) { const parts = w.filter(p => H.gear[p.file]).map(p => ({ src: H.gear[p.file], off: p.off })); ranges.push(parts.length); wl.push(...parts); }
    if (wl.length) {
      const wg = cached('w' + spec.wkey + '|' + wl.length, () => merge(wl)); const R = wg.userData.ranges;
      let k = 0; hero.wRanges = ranges.map(c => { const s = R[k] ? R[k][0] : 0; let e = s; for (let j = 0; j < c; j++) e = R[k + j][0] + R[k + j][1]; k += c; return [s, e - s]; });
      const wm = heroMat(paletteTex(spec.wpal)); hero.mats.push(wm);
      const weapon = new THREE.SkinnedMesh(wg, wm); weapon.name = 'otter_weapon'; weapon.frustumCulled = false; weapon.castShadow = true; root.add(weapon); weapon.bind(skeleton, new THREE.Matrix4());
      hero.weapon = weapon; setWeapon(hero, 0);
    }
  }
  return hero;
}
export function setWeapon(hero, i) { if (!hero.weapon) return; hero.wi = i; const r = hero.wRanges[Math.min(i, hero.wRanges.length - 1)]; hero.weapon.geometry.setDrawRange(r[0], r[1]); }
/* 꼬리: 이동 빠르기에 따라 좌우로 흔들림 (동작 파일 없이 코드로) */
export function tailWag(hero, dt, speed = 0) {
  if (!hero.tail[0]) return; hero.t += dt; const s = Math.min(1, speed / 6);
  const f = 2.2 + 6.5 * s, a = 0.10 + 0.22 * s, t = hero.t;
  hero.tail[0].rotation.set(-0.08 * s, Math.sin(t * f) * a * 0.5, 0);
  hero.tail[1].rotation.set(0.04 + 0.06 * s, Math.sin(t * f - 0.7) * a * 0.8, 0);
  hero.tail[2].rotation.set(0.06 + 0.10 * s, Math.sin(t * f - 1.4) * a, 0);
}
export function geoStats() { return { merges: H.merges, cached: geoCache.size, files: H.files, bytes: H.bytes }; }
