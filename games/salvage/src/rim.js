/* v0.7.1 검수 M4 Top 1 · 3 — 적 진영 색 림 빛 + 맞을 때 밝기 틴트
 *  - 어두운 지도에서도 실루엣이 읽히게: 진영 색 테두리 빛(검은 닻 주황 · 해골 청록 · 기계 흰색 · 짐승 산호)
 *  - 보스 · 덩치 큰 적은 맞아도 흰색으로 덮지 않고 밝기 +35% · 림 빛만 세짐(uHit)
 *  - 셰이더는 모든 적 재질이 한 프로그램을 같이 씀(customProgramCacheKey) · 값은 재질마다 uniform
 */
import * as THREE from 'three';
import { rimCol } from './a11y.js?v=0.99.20';

export const RIM_COL = { anchor: 0xff8a3a, moss: 0x46e6cf, machine: 0xe6eef6, beast: 0xff7c9c };
const RIM_K = { base: 0.34, dark: 0.55 }; /* 밝은 지도 / 어두운 지도(터널 · 공장 · 밤) */

function patch(sh, U) {
  Object.assign(sh.uniforms, U);
  sh.fragmentShader = 'uniform vec3 uRim; uniform float uRimK; uniform float uHit;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
    '{ float rimF = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0); rimF = smoothstep(0.45, 0.95, rimF);\n' +
    '  outgoingLight = outgoingLight * (1.0 + uHit * 0.35) + uRim * rimF * (uRimK + uHit * 1.3); }\n#include <opaque_fragment>');
}

/* 적 하나의 재질에 림 빛을 붙임 (빛 받는 재질만 — 눈 · 빛남 MeshBasic 은 그대로) */
export function rimify(mats, fac, dark) {
  const col = new THREE.Color(rimCol(fac)); const k = dark ? RIM_K.dark : RIM_K.base; const out = []; /* M6-C 색약 보조면 파랑 · 노랑 · 흰 · 보라 표 (a11y.js) */
  for (const m of mats) {
    if (!m || !(m.isMeshLambertMaterial || m.isMeshStandardMaterial || m.isMeshPhongMaterial || m.isMeshToonMaterial)) continue;
    if (m.userData.rimU) { m.userData.rimU.uRim.value.copy(col); m.userData.rimU.uRimK.value = k; out.push(m.userData.rimU); continue; }
    const U = { uRim: { value: col.clone() }, uRimK: { value: k }, uHit: { value: 0 } }; m.userData.rimU = U;
    m.onBeforeCompile = sh => patch(sh, U); m.customProgramCacheKey = () => 'rim1'; m.needsUpdate = true; out.push(U);
  }
  return out;
}

/* 매 프레임: 보스 · 큰 적 맞음 틴트 (0 ~ 1) */
export function rimHit(list, v) { for (const U of list) U.uHit.value = v; }
