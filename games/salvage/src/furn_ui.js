// 은신처 '초소 꾸미기' 화면 (M5-D · 가구 30) — 은신처 3D 를 그대로 보며 자리 10 탭 · 고르면 그 자리에 바로 놓아 봄(사기 전 미리보기)
//   위: 은신처 3D (카메라가 고른 자리로 다가감) · 아래 판: 자리 탭 10 · 카드 4(기본 + 가구 3) · 설명 · 사기/놓기/치우기
//   그리기: 가구는 시설 소품과 같은 두 덩어리(home_fac.js extra) → 그리기 수 그대로 · 기본 깔개 · 안락의자는 그 자리에 가구가 있으면 숨김
//   뒤로가기: 바로 전 화면(초소 보기 · 옷장 · 은신처)으로 — oad.js pushBack
import * as THREE from 'three';
import { S, save } from './save.js?v=0.99.19';
import { sfx } from './audio.js?v=0.99.19';
import { pushBack } from './oad.js?v=0.99.19';
import { loadModels, MODELS } from './home_fac.js?v=0.99.19';
import { COS } from './look.js?v=0.99.19';
import { thumbHtml } from './wardrobe.js?v=0.99.19'; /* M6-A 칸 그림 */
import { FURN, FURN_SPOTS, FURN_SPOT_KEYS, furnOf, needOf, canBuy, buyFurn, placeFurn, clearSpot, placed, furnStats } from './furn.js?v=0.99.19';

const $ = (s, r = document) => r.querySelector(s);
/* 화면 전용 css (공용 style.css 를 안 건드림) */
export function m5dCss() { if (document.getElementById('m5dcss')) return; const l = document.createElement('link'); l.id = 'm5dcss'; l.rel = 'stylesheet'; l.href = 'src/m5d.css'; document.head.appendChild(l); }
const SPOT_ICON = { rug: '◍', seat: '🪑', table: '☕', wall: '🚩', plant: '🌿', lamp: '💡', pet: '🦦', dock: '⚓', trophy: '🏆', hang: '🎏' };

export class FurnUI {
  constructor(app, homeFac) {
    this.app = app; this.hf = homeFac; this.on = false; this.spot = 'rug'; this.sel = null; this.preview = null; this.camT = 0; this.loaded = false; this.loading = null;
    m5dCss(); Object.assign(app, { FURN, FURN_SPOTS, COS }); /* 시험 훅 (tools/m5d_shots.mjs) */
    /* 시설 소품과 한 덩어리로: 놓인 가구(+ 미리보기) → 합칠 목록 · 기본 소품(깔개 · 안락의자) 숨김 */
    homeFac.extra = St => {
      if (!this.loaded) { this.load(); return null; }
      const list = placed(St, this.on ? this.preview : null); const base = homeFac.g.parent?.userData?.base;
      if (base) for (const s of FURN_SPOT_KEYS) { const b = FURN_SPOTS[s].base; if (b && base[b]) base[b].visible = !list.some(p => p.spot === s); }
      return { list: list.map(p => ({ key: p.key, M: new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.ry), new THREE.Vector3(1, 1, 1)) })), key: list.map(p => p.key).join(',') };
    };
    /* 카메라: 이 화면이면 고른 자리로 (평소 은신처 카메라 갈래 위에 얹음) */
    const base = app.hideCam;
    app.hideCam = (cam, t, dt) => { const r = base ? base(cam, t, dt) : false; if (this.active()) { this.camTick(cam, dt); return true; } if (this.preview && !this.on) { this.preview = null; this.hf.rebuild(true); } return r; };
    this.cam = { p: new THREE.Vector3(0, 7.2, 9.4), l: new THREE.Vector3(0, -1.4, -1.8) };
  }
  load() { return this.loading ||= loadModels('assets/dress_furn.glb').then(() => { this.loaded = true; this.hf.rebuild(true); }).catch(e => console.warn('가구', e)); }
  active() { return this.on && this.app.ui?.root?.className === 'scr-furn' && !this.app.raid; }
  /* from: 'look'(초소 보기) · 'ward'(옷장) · 그 밖 = 은신처 */
  open(from) {
    const ui = this.app.ui; if (ui.wardrobe?.on) { ui.wardrobe.commit(); ui.wardrobe.close(); }
    this.from = from; this.on = true; this.sel = null; this.preview = {}; furnOf(S); this.load();
    this.app.homeFac?.abort?.(); this.app.showHideout(true);
    const cam = this.app.camera; this.cam.p.copy(cam.position); const d = new THREE.Vector3(); cam.getWorldDirection(d); this.cam.l.copy(cam.position).addScaledVector(d, 10);
    this.popBack?.(); this.popBack = pushBack(() => { if (!this.on || !this.active()) return false; this.back(); return true; });
    this.render(); this.hf.rebuild(true);
  }
  back() {
    sfx.ui(); this.close(); const ui = this.app.ui;
    if (this.from === 'ward') ui.wardrobe.open(); else { ui.hideout(); if (this.from === 'look') { const h = this.app.story?.home, el = ui.root.querySelector('.hideout'); if (h && el) h.setLook(el, true, true); } }
  }
  close() { this.on = false; this.preview = null; this.popBack?.(); this.popBack = null; this.hf.rebuild(true); }
  camTick(cam, dt) {
    const P = FURN_SPOTS[this.spot]; const y = P.y || 0; const up = this.spot === 'hang' || this.spot === 'wall';
    const eye = up ? new THREE.Vector3(P.x * 0.6, y + 0.9, P.z + 7.6) : new THREE.Vector3(P.x * 0.7, y + 6.2, P.z + 6.2);
    const at = up ? new THREE.Vector3(P.x, y - 0.3, P.z) : new THREE.Vector3(P.x, y + 0.3, P.z);
    const k = 1 - Math.pow(0.004, dt); this.cam.p.lerp(eye, k); this.cam.l.lerp(at, k);
    cam.position.copy(this.cam.p); cam.lookAt(this.cam.l); cam.rotateX(-0.22); /* 고른 자리가 아래 판 위쪽(화면 30%)에 오게 */
  }
  /* ───── 화면 ───── */
  render() {
    const ui = this.app.ui; ui.clear(); ui.root.className = 'scr-furn';
    const st = furnStats(S);
    const el = document.createElement('div'); el.className = 'furn';
    el.innerHTML = `<header class="fhead"><button class="back" id="fBack" aria-label="뒤로">‹</button><b>초소 꾸미기<small>가구 ${st.own}/${st.all} · 놓은 자리 ${st.placed}/10</small></b><span class="cur"><span class="shell"></span>${(S.shells || 0).toLocaleString()}</span></header>
      <div class="fspace"></div>
      <section class="fpanel"><div class="ftabs" id="fTabs">${FURN_SPOT_KEYS.map(s => { const F = furnOf(S); return `<button data-s="${s}" class="${s === this.spot ? 'on' : ''}"><i>${SPOT_ICON[s]}</i>${FURN_SPOTS[s].name}${F.at[s] ? '<em class="pl"></em>' : ''}</button>`; }).join('')}</div>
        <div class="fgrid" id="fGrid"></div><div class="finfo" id="fInfo"></div><div class="fnote">가구는 꾸미기 — 능력치 0 · 조개로만 · 산 가구는 언제든 바꿔 놓기 · 치우기 무료</div></section>`;
    ui.root.appendChild(el);
    $('#fBack', el).onclick = () => this.back();
    el.querySelectorAll('#fTabs button').forEach(b => b.onclick = () => { sfx.ui(); this.spot = b.dataset.s; this.sel = null; this.preview = {}; this.hf.rebuild(true); this.render(); });
    const on = el.querySelector('#fTabs .on'); if (on) el.querySelector('#fTabs').scrollLeft = Math.max(0, on.offsetLeft - 60);
    this.grid();
  }
  items() { return Object.keys(FURN).filter(k => FURN[k].spot === this.spot); }
  grid() {
    const F = furnOf(S), cur = F.at[this.spot] || null, sel = this.sel ?? cur ?? 'base';
    const card = (id, name, sw, tag, cls) => `<button class="fit ${cls}" data-k="${id}">${thumbHtml('furn', id, 40, sw, 'fsw') || `<span class="fsw" style="background:${sw}"></span>`}<b>${name}</b><small>${tag}</small></button>`;
    const P = FURN_SPOTS[this.spot];
    const html = [card('base', P.base ? '기본' : '비우기', '#3a434d', !cur ? '놓여 있음' : '', `${sel === 'base' ? 'try' : ''} ${!cur ? 'sel' : ''}`)];
    for (const k of this.items()) {
      const f = FURN[k], own = F.own.includes(k), nd = needOf(S, k);
      const tag = cur === k ? '놓여 있음' : own ? '가진 것' : nd && !nd.ok ? `🔒 ${nd.txt}` : `🐚 ${f.n.toLocaleString()}`;
      html.push(card(k, f.name, f.sw, tag, `${sel === k ? 'try' : ''} ${cur === k ? 'sel' : ''} ${!own && nd && !nd.ok ? 'lock' : ''}`));
    }
    const g = $('#fGrid'); g.innerHTML = html.join('');
    g.querySelectorAll('.fit').forEach(b => b.onclick = () => { sfx.ui(); this.pick(b.dataset.k); });
    this.info(sel);
  }
  pick(k) { this.sel = k; this.preview = { [this.spot]: k === 'base' ? null : k }; this.hf.rebuild(true); this.grid(); }
  info(k) {
    const el = $('#fInfo'); const F = furnOf(S), cur = F.at[this.spot] || null;
    if (k === 'base') { el.innerHTML = `<div class="ft"><b>${FURN_SPOTS[this.spot].base ? '기본 그대로' : '비워 두기'}</b><small>${FURN_SPOTS[this.spot].name} 자리</small></div>${cur ? '<button class="fbtn s" id="fAct">치우기 (가구는 가진 채로)</button>' : '<div class="fstate">지금 이대로예요</div>'}`;
      const b = $('#fAct', el); if (b) b.onclick = () => { clearSpot(S, this.spot); save(); sfx.ui(); this.preview = {}; this.app.ui.toast('치웠어요 · 언제든 다시 놓을 수 있어요', 'soft'); this.hf.rebuild(true); this.render(); }; return; }
    const f = FURN[k], own = F.own.includes(k), nd = needOf(S, k), r = canBuy(S, k);
    let act = '';
    if (cur === k) act = '<div class="fstate on">이 자리에 놓여 있어요</div>';
    else if (own) act = '<button class="fbtn" id="fAct">여기 놓기</button>';
    else if (nd && !nd.ok) act = `<div class="fstate lock">🔒 ${nd.txt} 하면 살 수 있어요 <i>${nd.cur}/${nd.n}</i></div>`;
    else act = `<button class="fbtn ${r.ok ? '' : 'dim'}" id="fAct"><span class="shell"></span>${f.n.toLocaleString()} 로 사서 놓기</button>`;
    el.innerHTML = `<div class="ft"><b>${f.name}</b><small>${f.txt}</small></div>${act}`;
    const b = $('#fAct', el); if (!b) return;
    b.onclick = () => {
      if (own) { placeFurn(S, k); save(); sfx.ui(); this.preview = {}; this.app.ui.toast(`${f.name} — 놓았어요`, 'good'); this.hf.rebuild(true); this.render(); return; }
      const res = buyFurn(S, k); if (!res.ok) { sfx.empty?.(); this.app.ui.toast(res.why === 'cost' ? `조개가 ${(f.n - (S.shells || 0)).toLocaleString()} 모자라요` : '지금은 살 수 없어요', 'soft'); return; }
      save(); sfx.rare(); this.preview = {}; this.app.ui.toast(`${f.name} 들여놓았어요!`, 'good'); this.hf.rebuild(true); this.render();
    };
  }
}
/* 시험 · 캡처용: 모델 다 받았는지 */
export const furnReady = () => Object.keys(FURN).every(k => MODELS[k]);
