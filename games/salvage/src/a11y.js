// M6-C 접근성 (검수 M5 목록 7) — 설정 '보기 · 소리 · 손'에 들어가는 것을 한 곳에
//  · 글자 크기 3단(기본 · 크게 +15% · 아주 크게 +30%): 모든 스타일 시트의 px 글자 크기를 calc(Npx × var(--fs)) 로 한 번 바꿔 두고 --fs 만 바꿈
//      (뒤에 붙는 <style> · 화면 글의 style="font-size:…" 도 지켜봐서 같이) — 판 안 조작 버튼(.b)은 손가락 자리라 그대로
//  · 색약 보조(html.cb): 진영 림 색을 파랑 · 노랑 · 흰 · 보라 표로 + 머리 위 모양 표(▲ 검은 닻 · ● 해골 · ■ 기계 · ◆ 짐승)
//      위험 예고(바닥 원 · 줄)에 빗금 · 희귀 상자 빛 = 금빛은 두 겹 고리 · 화면의 희귀 칸 ◆ · 모자란 재료 '!'
//  · 소리 크기 셋(배경음 · 효과음 · 무전 목소리 = audio.js setBusVol) · 진동 켬/끔(navigator.vibrate) · 화면 흔들림 보통/약하게/끔(fx.js)
//  · 저장: localStorage 'salvage_a11y'(글자 · 색약 · 진동) · 'salvage_audio'(소리) · 'salvage_fx'(흔들림) — 바꾸는 즉시 반영
import * as THREE from 'three';
import { busVol, setBusVol, sfx, unlock } from './audio.js?v=0.99.28';
import { shakeLevel, setShakeLevel, SHAKE_STEPS } from './fx.js?v=0.99.28';

const KEY = 'salvage_a11y';
export const FS = [1, 1.15, 1.3]; export const FS_NAME = ['기본', '크게', '더 크게'];
export const OPT = { fs: 0, cb: false, vib: true };
try { Object.assign(OPT, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* */ }
OPT.fs = Math.max(0, Math.min(FS.length - 1, OPT.fs | 0));
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(OPT)); } catch { /* */ } };
export const fsK = () => FS[OPT.fs];

/* ───── 글자 크기 ───── */
const SKIP = /(^|[\s,>+~])\.b(?![\w-])|#stick|\.stickhint|\.m6i/; /* 판 안 조작 버튼 · 막대는 손가락 크기 그대로 */
const done = new WeakSet();
function scaleRules(rules) {
  for (const r of rules) {
    if (r.cssRules && !r.style) { scaleRules(r.cssRules); continue; }
    const st = r.style; if (!st) continue; const f = st.fontSize;
    if (!f || !/^[\d.]+px$/.test(f) || SKIP.test(r.selectorText || '')) continue;
    st.setProperty('font-size', `calc(${f} * var(--fs, 1))`, st.getPropertyPriority('font-size'));
  }
}
function scaleSheets() {
  for (const sh of document.styleSheets) {
    let rules; try { rules = sh.cssRules; } catch { continue; } if (!rules) continue;
    const n = rules.length; if (done.has(sh) && sh.__n === n) continue; done.add(sh); sh.__n = n; scaleRules(rules);
  }
}
function scaleInline(root) {
  const list = root.nodeType === 1 ? [root, ...root.querySelectorAll('[style*="font-size"]')] : [];
  for (const e of list) { const f = e.style?.fontSize; if (f && /^[\d.]+px$/.test(f)) e.style.fontSize = `calc(${f} * var(--fs, 1))`; }
}
let mo = null, moT = 0;
function watch() {
  if (mo || typeof MutationObserver === 'undefined') return;
  mo = new MutationObserver(ms => { let sheet = false; for (const m of ms) for (const n of m.addedNodes) { if (n.nodeName === 'STYLE' || n.nodeName === 'LINK') sheet = true; else if (n.nodeType === 1 && OPT.fs) scaleInline(n); }
    if (sheet) { clearTimeout(moT); moT = setTimeout(scaleSheets, 0); } });
  mo.observe(document.head, { childList: true }); mo.observe(document.body, { childList: true, subtree: true });
  addEventListener('load', scaleSheets);
}

/* ───── 색약 보조 ───── */
const RIM = { anchor: 0xff8a3a, moss: 0x46e6cf, machine: 0xe6eef6, beast: 0xff7c9c };
const RIM_CB = { anchor: 0xffd23a, moss: 0x3d8bff, machine: 0xffffff, beast: 0xc46cff }; /* 노랑 · 파랑 · 흰 · 보라 (적록 · 청황 색약에서 서로 갈림) */
export const rimCol = fac => (OPT.cb ? RIM_CB : RIM)[fac] ?? (OPT.cb ? RIM_CB : RIM).machine;
export const FAC_MARK = { anchor: '▲', moss: '●', machine: '■', beast: '◆' };
/* 위험 예고 빗금: 화면 좌표 사선 — 모든 예고 재질이 같은 프로그램 · 켬/끔은 uniform 하나(다시 컴파일 X) */
const HZ = { value: 0 }, HZPX = { value: 1 };
export function hazard(mat) {
  if (!mat || mat.userData.hz) return mat; mat.userData.hz = 1;
  mat.onBeforeCompile = sh => { sh.uniforms.uHz = HZ; sh.uniforms.uHzPx = HZPX;
    sh.fragmentShader = 'uniform float uHz; uniform float uHzPx;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
      'if (uHz > 0.5) { float hz = mod(gl_FragCoord.x + gl_FragCoord.y, 16.0 * uHzPx); diffuseColor.a *= hz < 7.0 * uHzPx ? 1.9 : 0.3; outgoingLight = mix(outgoingLight, vec3(1.0), hz < 7.0 * uHzPx ? 0.18 : 0.0); }\n#include <opaque_fragment>'); };
  mat.customProgramCacheKey = () => 'hz1'; mat.needsUpdate = true; return mat;
}

/* ───── 진동 ───── */
let lastVib = 0;
export function vib(p) { if (!OPT.vib || typeof navigator === 'undefined' || !navigator.vibrate) return false; if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return false; /* M6-D 봇 1,000판: 한 번도 안 누른 페이지에서 부르면 크롬이 콘솔 오류('Blocked call to navigator.vibrate') */ const t = performance.now(); if (t - lastVib < 120) return false; lastVib = t; try { return navigator.vibrate(p); } catch { return false; } }

/* ───── 적용 ───── */
export function apply() {
  if (typeof document === 'undefined') return; const de = document.documentElement;
  de.style.setProperty('--fs', String(FS[OPT.fs])); de.classList.toggle('cb', !!OPT.cb); de.dataset.fs = OPT.fs;
  HZ.value = OPT.cb ? 1 : 0; HZPX.value = Math.min(2, devicePixelRatio || 1);
  injectCss(); scaleSheets(); if (OPT.fs) scaleInline(document.body); watch();
}
export function set(k, v) { OPT[k] = v; save(); apply(); }

let css = false;
function injectCss() {
  if (css) return; css = true; const s = document.createElement('style'); s.id = 'a11y-css';
  s.textContent = `
html.cb .li.rare::before,html.cb .it.rare::before{content:'◆';position:absolute;right:3px;top:1px;font-size:11px;color:#9ff;text-shadow:0 0 2px #000;z-index:2}
html.cb .hv.no::before{content:'!';display:inline-block;margin-right:2px;padding:0 3px;border-radius:3px;background:#ff6f5c;color:#1a0806;font-weight:900}
html.cb .lk.no::before{content:'! ';font-weight:900}
html.cb .c.ok .hn::after{content:'✓';margin-left:2px;color:var(--mint)}
.a11y .setrow{margin:4px 0 8px}.a11y .seg{display:flex;gap:4px;flex:1}.a11y .seg button{flex:1;min-height:44px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--tx);font-weight:700}
.a11y .seg button.on{background:rgba(255,180,74,.18);border-color:var(--amber);color:#ffe2b0}.a11y .vol{display:flex;align-items:center;gap:8px;flex:1}
.a11y .vol input{flex:1;height:44px;accent-color:var(--amber)}.a11y .vol em{font-style:normal;min-width:38px;text-align:right;color:var(--mute);font-variant-numeric:tabular-nums}
.modal .sheet:has(.a11y){max-height:calc(100% - 12px);overflow-y:auto;width:100%;-webkit-overflow-scrolling:touch;touch-action:pan-y}.a11y .setrow > span{min-width:74px}.a11y .cbdemo{display:flex;gap:10px;justify-content:center;margin:2px 0 6px;color:var(--mute);font-size:12px}`;
  document.head.appendChild(s);
}

/* ───── 설정 화면 줄 (story_ui.settings 가 넣음) ───── */
const VOL = [['mus', '배경음'], ['sfx', '효과음'], ['voc', '무전 목소리']];
export function settingsHtml() {
  const seg = (id, list, cur) => `<div class="seg" id="${id}">${list.map((t, i) => `<button data-v="${i}" class="${i === cur ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  return `<div class="a11y">
    <div class="setrow"><span>글자 크기</span>${seg('aFs', FS_NAME, OPT.fs)}</div>
    <div class="setrow"><span>색약 보조</span>${seg('aCb', ['끔', '켬'], OPT.cb ? 1 : 0)}</div>
    <div class="cbdemo">${OPT.cb ? '진영 ▲ 검은 닻 · ● 해골 · ■ 기계 · ◆ 짐승 · 위험 예고 빗금' : '켜면 진영 · 위험 · 희귀를 모양으로도 알려 줘요'}</div>
    ${VOL.map(([k, t]) => `<div class="setrow"><span>${t}</span><label class="vol"><input type="range" min="0" max="100" step="5" value="${Math.round(busVol(k) * 100)}" data-bus="${k}" aria-label="${t} 크기"><em>${Math.round(busVol(k) * 100)}%</em></label></div>`).join('')}
    <div class="setrow"><span>진동</span>${seg('aVib', ['끔', '켬'], OPT.vib ? 1 : 0)}</div>
    <div class="setrow"><span>화면 흔들림</span>${seg('aShk', SHAKE_STEPS.map(s => s.t), shakeLevel())}</div></div>`;
}
export function bindSettings(m, rerender) {
  const segOn = (id, v) => m.querySelectorAll(`#${id} button`).forEach(b => b.classList.toggle('on', +b.dataset.v === v));
  const click = (id, fn) => m.querySelectorAll(`#${id} button`).forEach(b => b.onclick = () => { unlock(); const v = +b.dataset.v; fn(v); segOn(id, v); try { sfx.ui(); } catch { /* */ } });
  click('aFs', v => set('fs', v));
  click('aCb', v => { set('cb', !!v); const d = m.querySelector('.cbdemo'); if (d) d.textContent = v ? '진영 ▲ 검은 닻 · ● 해골 · ■ 기계 · ◆ 짐승 · 위험 예고 빗금' : '켜면 진영 · 위험 · 희귀를 모양으로도 알려 줘요'; });
  click('aVib', v => { set('vib', !!v); if (v) vib(40); });
  click('aShk', v => setShakeLevel(v));
  m.querySelectorAll('input[data-bus]').forEach(r => { const out = r.parentNode.querySelector('em');
    r.oninput = () => { unlock(); setBusVol(r.dataset.bus, r.value / 100); out.textContent = r.value + '%'; };
    r.onchange = () => { try { (r.dataset.bus === 'voc' ? sfx.radio : sfx.ui)(); } catch { /* */ } }; });
  rerender?.();
}

/* ───── 판 안 (main.js 가 판 시작 때 R.mods 에 넣음): 진영 모양 표 · 희귀 상자 두 겹 고리 ───── */
const markTex = {};
function markTexture(ch) {
  if (markTex[ch]) return markTex[ch]; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.font = '900 46px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(ch, 32, 35); g.fillStyle = '#fff'; g.fillText(ch, 32, 35);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (markTex[ch] = t);
}
const MAXM = 48;
export function raidA11y(R, facOf) {
  if (!OPT.cb) return null;
  const pts = {}; const geos = [];
  for (const [fac, ch] of Object.entries(FAC_MARK)) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXM * 3), 3)); g.setDrawRange(0, 0); geos.push(g);
    const m = new THREE.PointsMaterial({ map: markTexture(ch), color: rimCol(fac), size: 22 * Math.min(2, devicePixelRatio || 1), sizeAttenuation: false, transparent: true, depthTest: false, depthWrite: false });
    const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 20; p.userData.own = true; p.userData.ownMat = true; R.root.add(p); pts[fac] = p;
  }
  /* 금빛(값 70 이상) 상자 고리 = 두 겹 (색만으로 안 가르게) */
  for (const c of R.containers) if (c.ring && c.best >= 70) { const r2 = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.74, 24), c.ring.material); r2.userData.own = true; c.ring.add(r2); }
  let acc = 0;
  return {
    tick(dt) {
      acc += dt; if (acc < 0.05) return; acc = 0; const n = {};
      for (const k in pts) n[k] = 0;
      for (const e of R.enemies) {
        if (e.dead || e.hidden || !e.root?.visible) continue; const f = facOf(e.kind); const p = pts[f]; if (!p || n[f] >= MAXM) continue;
        const a = p.geometry.attributes.position.array, i = n[f]++ * 3; a[i] = e.pos.x; a[i + 1] = (e.big ? 3.4 : 2.3) * (e.root.scale?.y || 1); a[i + 2] = e.pos.z;
      }
      for (const k in pts) { const g = pts[k].geometry; g.setDrawRange(0, n[k]); g.attributes.position.needsUpdate = true; }
    },
    dispose() { for (const g of geos) g.dispose(); for (const k in pts) pts[k].material.dispose(); },
  };
}
apply();
