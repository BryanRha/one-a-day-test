// 은신처 '옷장 · 무기대' 화면 (docs/hero/wardrobe.html 목업과 같은 배치)
//   위: 수달 3D 미리보기(끌어서 돌리기 · 정면/측면/뒤/위(게임)) — 메인 렌더러로 무대 칸에만 그림
//   부위 탭 7: 무기 · 머리 · 몸 · 등 · 얼굴 · 털 · 몽이 / 칸마다 [장착](능력치) + [겉모습](꾸미기 · 켜고 끄기)
//   아이템 누르면 입어 보기(안 가진 것도 미리보기) + 능력치 비교(지금 → 바꾸면) + 얻는 길(플레이 · 의뢰 · 조개 · 원어데이 골드 — bmflow, 원어데이 밖이면 골드 숨김)
//   [되돌리기] 처음으로 · [이대로 출격 준비] 저장 후 출격 준비
import * as THREE from 'three';
import { WEAPONS, WEAPON_KEYS, MODS, MOD_KEYS, GEAR, ENEMIES, ZONES } from './data.js?v=0.99.22';
import { S, save } from './save.js?v=0.99.22';
import * as E from './econ.js?v=0.99.22';
import * as BM from './bmflow.js?v=0.99.22';
import { COS, COS_KEYS, FUR, owns, getText, progress, buyCos, freshLook, resolve, lookOf, srcOf, LOOK_SLOTS } from './look.js?v=0.99.22';
import { makeHero, ensure, tailWag, HERO_SCALE } from './hero.js?v=0.99.22';
import { sfx } from './audio.js?v=0.99.22';
import { THUMB } from './data/thumbs.js?v=0.99.22';
/* M6-A: 꾸미기 · 가구 칸 작은 렌더 그림 (assets/thumbs · tools/m6a_thumbs.mjs) — 없으면 색 네모 */
export const thumbHtml = (kind, k, px, sw, cls) => { const T = THUMB[kind]; const i = T ? T.keys.indexOf(k) : -1; if (i < 0) return null; const c = THUMB.cols; return `<span class="${cls} th" style="background:${sw} url(assets/thumbs/${kind}.webp) -${(i % c) * px}px -${Math.floor(i / c) * px}px / ${c * px}px ${T.rows * px}px no-repeat;width:${px}px;height:${px}px;--sw:${sw}"></span>`; };

const $ = (s, r = document) => r.querySelector(s);
const pct = x => Math.round(x * 100) + '%';
const TABS = [['weapon', '무기'], ['head', '머리'], ['body', '몸'], ['back', '등'], ['face', '얼굴'], ['fur', '털'], ['pet', '몽이']];
const VIEWS = [['front', '정면', 0], ['side', '측면', Math.PI / 2], ['back', '뒤', Math.PI], ['top', '위(게임)', Math.PI]];
const ROMAN = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'];
const clone = o => JSON.parse(JSON.stringify(o));
/* M5-D 거르개 (꾸미기 80): 가진 것 · 아직 · 새것 · 얻는 길(조개 · 행상 · 플레이 · 업적/도전 · 골드) — 장비 · 무기 단계는 '전체'에서만 */
const FILTS = [['all', '전체'], ['own', '가진 것'], ['lock', '아직'], ['new', '새것'], ['shells', '🐚 조개'], ['trader', '행상'], ['play', '플레이'], ['achal', '업적 · 도전'], ['gold', '🪙 골드']];

export class Wardrobe {
  constructor(app, ui) {
    this.app = app; this.ui = ui; this.on = false; this.tk = 0; this.tab = 'body'; this.yaw = 0; this.view = 0; this.filt = 'all';
    const sc = this.scene = new THREE.Scene(); sc.background = new THREE.Color(0x232a32);
    sc.add(new THREE.HemisphereLight(0xdfe8f0, 0x2a323a, 1.6)); const d = new THREE.DirectionalLight(0xffe6c4, 2.2); d.position.set(3, 6, 5); sc.add(d);
    const r = new THREE.DirectionalLight(0x9fd4ff, 0.8); r.position.set(-4, 3, -4); sc.add(r);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48), new THREE.MeshLambertMaterial({ color: 0x3a4450 })); floor.rotation.x = -Math.PI / 2; sc.add(floor);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.36, 48), new THREE.MeshBasicMaterial({ color: 0xff8a5c })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005; sc.add(ring);
    this.pivot = new THREE.Group(); sc.add(this.pivot);
    this.cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  }
  /* 지금 저장된 것 = 초안 시작점 */
  reset() { this.draft = { look: clone(S.look || freshLook()), main: S.equip.main, gear: { ...S.gear }, prev: null }; }
  open(tab) {
    this.reset(); if (tab) this.tab = tab; this.on = true; this.filt = 'all'; this.newSeen = null; this.yaw = 0; this.view = 0; this.sel = null;
    this.ui.clear(); this.ui.root.className = 'scr-wardrobe'; this.render(); this.rebuild();
    this.app.showHideout(false);
  }
  close() { this.on = false; this.app.showHideout(true); }
  /* 초안으로 그릴 겉모습 (sel = 입어 보는 중인 것) */
  spec() {
    const d = this.draft; const look = clone(d.look); const gear = { ...d.gear }; let main = d.main;
    const p = d.prev; if (p) { if (p.cos) { const c = COS[p.cos]; if (c.slot === 'fur') look.fur = p.cos; else if (c.slot === 'pet') { look.pet = (look.pet || []).filter(x => COS[x].part !== c.part); look.pet.push(p.cos); } else look[c.slot] = p.cos; } if (p.gear) { gear[p.gear[0]] = p.gear[1]; if (p.gear[0] === 'vest') look.body = null; if (p.gear[0] === 'helmet') look.head = null; } if (p.weapon) main = p.weapon; }
    const w = k => ({ key: k, mods: S.weapons[k] || {} });
    return { hero: resolve({ gear, look, weapons: [w(main)] }), pet: resolve({ pet: true, look }), look, gear, main };
  }
  async rebuild() {
    const sp = this.spec(); const tk = ++this.tk;
    await ensure([...sp.hero.files, ...sp.pet.files]).catch(e => console.warn(e)); if (tk !== this.tk || !this.on) return;
    const key = this.tab + sp.hero.key + sp.hero.wkey + (this.tab === 'pet' ? sp.pet.key : '');
    if (key === this.key) return; this.key = key;
    while (this.pivot.children.length) this.pivot.remove(this.pivot.children[0]);
    const h = this.hero = makeHero(sp.hero); h.root.scale.setScalar(HERO_SCALE); this.pivot.add(h.root);
    this.mix = new THREE.AnimationMixer(h.root); this.mix.clipAction(h.clips[this.tab === 'weapon' ? '1H_Ranged_Aiming' : 'Idle']).play();
    this.pet = null;
    if (this.tab === 'pet') { const p = this.pet = makeHero(sp.pet); p.root.scale.setScalar(0.36 * HERO_SCALE / 0.78 * 1.4); p.root.position.set(0.75, 0, 0.35); p.root.rotation.y = -0.5; this.pivot.add(p.root); h.root.position.x = -0.35; this.pmix = new THREE.AnimationMixer(p.root); this.pmix.clipAction(p.clips.Idle).play(); }
  }
  /* 매 프레임: 무대 칸에만 그림 */
  draw(renderer, dt) {
    const st = $('#wstage'); if (!st) return; const cv = renderer.domElement.getBoundingClientRect(); const r = st.getBoundingClientRect();
    if (r.height < 10) return;
    this.mix?.update(dt); this.pmix?.update(dt); if (this.hero) tailWag(this.hero, dt, 0); if (this.pet) tailWag(this.pet, dt, 0);
    const V = VIEWS[this.view]; this.pivot.rotation.y += (V[2] + this.yaw - this.pivot.rotation.y) * Math.min(1, dt * 10);
    const cam = this.cam; cam.aspect = r.width / r.height; cam.updateProjectionMatrix();
    if (V[0] === 'top') { cam.position.set(0, 5.4, 3.2); cam.lookAt(0, 0.55, 0); } else { cam.position.set(0, 1.2, 5.3); cam.lookAt(0, 0.84, 0); }
    const x = r.left - cv.left, y = cv.bottom - r.bottom;
    renderer.setScissorTest(true); renderer.setScissor(x, y, r.width, r.height); renderer.setViewport(x, y, r.width, r.height);
    renderer.render(this.scene, cam);
    renderer.setScissorTest(false); renderer.setViewport(0, 0, cv.width, cv.height);
  }
  /* ───── 화면 ───── */
  render() {
    const ui = this.ui; ui.clear(); ui.root.className = 'scr-wardrobe';
    const el = document.createElement('div'); el.className = 'wardrobe';
    el.innerHTML = `
      <header class="whead"><button class="back" id="wBack">‹</button><b>옷장 · 무기대<small class="wcount">꾸미기 ${COS_KEYS.filter(k => owns(S, k)).length}/${COS_KEYS.length}</small></b><button class="wfurn" id="wFurn">가구 ›</button><span class="cur"><span class="shell"></span>${S.shells.toLocaleString()}</span></header>
      <div class="stage" id="wstage"><div class="whint">끌어서 돌려 보기</div><div class="wviews" id="wViews">${VIEWS.map((v, i) => `<button data-v="${i}" class="${i === this.view ? 'on' : ''}">${v[1]}</button>`).join('')}</div></div>
      <div class="wtabs" id="wTabs">${TABS.map(([k, t]) => `<button data-t="${k}" class="${k === this.tab ? 'on' : ''}">${t}${this.newIn(k) ? '<i class="dot"></i>' : ''}</button>`).join('')}</div>
      <div class="wfilt" id="wFilt"></div>
      <div class="wscroll"><div class="wslot" id="wSlot"></div><div class="wcmp" id="wCmp"></div></div>
      <div class="wfoot"><button class="s" id="wReset">되돌리기</button><button class="p" id="wGo">이대로 출격 준비</button></div>`;
    ui.root.appendChild(el);
    $('#wBack', el).onclick = () => { sfx.ui(); this.commit(); this.close(); ui.hideout(); };
    $('#wFurn', el).onclick = () => { sfx.ui(); this.commit(); this.close(); this.app.furn?.open('ward'); }; /* M5-D 초소 꾸미기 — 뒤로가기는 다시 옷장 */
    el.querySelectorAll('#wViews button').forEach(b => b.onclick = () => { sfx.ui(); this.view = +b.dataset.v; this.yaw = 0; el.querySelectorAll('#wViews button').forEach(x => x.classList.toggle('on', x === b)); });
    el.querySelectorAll('#wTabs button').forEach(b => b.onclick = () => { sfx.ui(); this.tab = b.dataset.t; this.draft.prev = null; this.sel = null; this.newSeen = new Set(this.newKeys(this.tab)); this.seen(this.tab); this.render(); this.rebuild(); });
    $('#wReset', el).onclick = () => { sfx.ui(); this.reset(); this.sel = null; this.render(); this.rebuild(); this.ui.toast('처음 모습으로 돌렸어요', 'soft'); };
    $('#wGo', el).onclick = () => { sfx.ui(); this.commit(); this.close(); ui.prep(); };
    /* 끌어서 돌리기 */
    const st = $('#wstage', el); let sx = null;
    st.onpointerdown = e => { sx = e.clientX; st.setPointerCapture(e.pointerId); };
    st.onpointermove = e => { if (sx === null) return; this.yaw += (e.clientX - sx) * 0.012; sx = e.clientX; };
    st.onpointerup = st.onpointercancel = () => { sx = null; };
    this.newSeen ||= new Set(this.newKeys(this.tab)); this.seen(this.tab); this.slot();
  }
  /* 거르개 줄: 이 탭 꾸미기 중 맞는 개수 · 0 이면 흐리게 (골드는 원어데이 안에서만) */
  newKeys(tab) { const seen = S.lookSeen || []; return (S.owned || []).filter(k => COS[k] && !seen.includes(k) && this.tabOf(k) === tab); }
  match(k, f = this.filt) {
    if (f === 'all') return true; if (f === 'own') return owns(S, k); if (f === 'lock') return !owns(S, k); if (f === 'new') return !!this.newSeen?.has(k);
    if (f === 'gold') return !owns(S, k) && !!BM.cosGold(k); const s = srcOf(k); return f === 'achal' ? s === 'ach' || s === 'chal' : f === 'play' ? s === 'play' || s === 'free' : s === f;
  }
  filtRow() {
    const el = $('#wFilt'); if (!el) return; const keys = COS_KEYS.filter(k => BM.cosShown(k) && this.tabOf(k) === this.tab);
    const list = FILTS.filter(([f]) => f !== 'gold' || keys.some(k => BM.cosGold(k)));
    el.innerHTML = list.map(([f, t]) => { const n = keys.filter(k => this.match(k, f)).length; return `<button data-f="${f}" class="${f === this.filt ? 'on' : ''} ${n ? '' : 'none'}">${t}<i>${n}</i></button>`; }).join('');
    el.querySelectorAll('button').forEach(b => b.onclick = () => { sfx.ui(); this.filt = b.dataset.f; this.sel = null; this.draft.prev = null; this.filtRow(); this.slot(); this.rebuild(); });
    const on = el.querySelector('.on'); if (on && on.offsetLeft + on.offsetWidth > el.scrollLeft + el.clientWidth) el.scrollLeft = on.offsetLeft - 12;
  }
  /* 새로 얻은 꾸미기 점 표시 */
  newIn(tab) { const seen = S.lookSeen || []; return (S.owned || []).some(k => !seen.includes(k) && this.tabOf(k) === tab); }
  seen(tab) { S.lookSeen ||= []; for (const k of S.owned || []) if (this.tabOf(k) === tab && !S.lookSeen.includes(k)) S.lookSeen.push(k); }
  tabOf(k) { const s = COS[k].slot; return { head: 'head', body: 'body', face: 'face', deco: 'back', bag: 'back', skin: 'weapon', fur: 'fur', pattern: 'fur', pet: 'pet' }[s]; }
  /* 탭별 [장착] · [겉모습] · 아이템 목록 */
  items() {
    const d = this.draft, L = d.look, t = this.tab, out = [];
    const all = this.filt === 'all';
    const cos = slot => COS_KEYS.filter(k => COS[k].slot === slot && BM.cosShown(k) && this.match(k)).map(k => ({ id: k, cos: k, name: COS[k].name, sw: COS[k].sw, own: owns(S, k), on: slot === 'fur' ? L.fur === k : slot === 'pet' ? (L.pet || []).includes(k) : L[slot] === k }));
    const tiers = (g, label, sw) => !all ? [] : GEAR[g].tiers.map((T, i) => i === 0 && g !== 'bag' ? null : ({ id: g + i, gear: [g, i], name: `${label} ${g === 'bag' ? i + 1 + '단' : ROMAN[i]}`, sw, own: S.gear[g] === i, past: S.gear[g] > i, on: d.gear[g] === i, txt: T.txt, bench: T.bench })).filter(Boolean);
    if (t === 'weapon') {
      if (all) for (const k of WEAPON_KEYS) out.push({ id: k, weapon: k, name: WEAPONS[k].name, sw: WEAPONS[k].color, own: !!S.weapons[k], on: d.main === k });
      out.push(...cos('skin'));
      return { equip: `${WEAPONS[d.main].name} · 개조 ${MOD_KEYS.map(m => (S.weapons[d.main]?.[m] || 0) ? `${MODS[m].name} ${['', 'Mk1', 'Mk2', 'Mk3', '특수'][S.weapons[d.main][m]]}` : '').filter(Boolean).join(' · ') || '없음'}`, skin: L.skin ? COS[L.skin].name : '기본 색', slot: 'skin', items: out, note: '개조 부품은 스킨을 씌워도 늘 총 위에 보여요 · 개조는 무기 탭에서' };
    }
    if (t === 'head') return { equip: S.gear.helmet ? `헬멧 ${ROMAN[S.gear.helmet]} (${GEAR.helmet.tiers[S.gear.helmet].txt})` : '헬멧 없음 · 기본 헤드램프', skin: L.head ? COS[L.head].name : '장착한 모습 그대로', slot: 'head', items: [...tiers('helmet', '헬멧', '#8e979f'), ...cos('head')], note: '겉모습만 바뀌어요 · 능력치 그대로' };
    if (t === 'body') return { equip: S.gear.vest ? `방어구 ${ROMAN[S.gear.vest]} (${GEAR.vest.tiers[S.gear.vest].txt})` : '방어구 없음 · 기본 잠수복', skin: L.body ? COS[L.body].name : '장착한 모습 그대로', slot: 'body', items: [...tiers('vest', '방어구', '#6e7650'), ...cos('body')], note: '3단 방어구를 입고 화면엔 우비 — 능력치는 3단 그대로' };
    if (t === 'back') return { equip: `가방 ${S.gear.bag + 1}단 (${GEAR.bag.tiers[S.gear.bag].txt})`, skin: `${L.deco ? COS[L.deco].name : '랜턴 통 (기본)'}${L.bag ? ' · ' + COS[L.bag].name : ''}`, slot: 'deco', slot2: 'bag', items: [...tiers('bag', '가방', '#7a6248'), ...(all ? [{ id: 'lantern', base: 'deco', name: '랜턴 통', sw: '#ffc45e', own: true, on: !L.deco }] : []), ...cos('deco'), ...(all ? [{ id: 'bagbase', base: 'bag', name: '기본 가방 색', sw: '#7a6248', own: true, on: !L.bag }] : []), ...cos('bag')], note: '가방 크기는 늘 실제 단계대로 · 가방 색은 색만 · 등 장식은 가방 옆에 달려요' };
    if (t === 'face') return { equip: '— (능력치 없는 부위)', skin: L.face ? COS[L.face].name : '크림 목도리 (기본)', slot: 'face', items: [...(all ? [{ id: 'scarf', base: 'face', name: '크림 목도리', sw: '#ebdec4', own: true, on: !L.face }] : []), ...cos('face')], note: '꾸미기 전용 부위' };
    if (t === 'fur') return { equip: '— (능력치 없는 부위)', skin: `${COS[L.fur]?.name || '갈색'} · ${L.pattern ? COS[L.pattern].name : '무늬 없음'}`, slot: 'pattern', items: [...cos('fur'), ...(all ? [{ id: 'nopat', base: 'pattern', name: '무늬 없음', sw: FUR[COS[L.fur]?.fur || 'brown'].c[0], own: true, on: !L.pattern }] : []), ...cos('pattern')], note: '재질 색만 바뀌어요 (받을 파일 0)' };
    const aq = S.fac.aquarium || 0;
    return { equip: aq ? `수족관 ${aq}단계 (주머니 ${E.facCur(S, 'aquarium').pet.join('×')})` : '수족관을 지으면 몽이가 와요', skin: (L.pet || []).length ? L.pet.map(k => COS[k].name).join(' · ') : '장식 없음', slot: 'pet', items: cos('pet'), note: '몽이 꾸미기는 능력치 0' };
  }
  slot() {
    this.filtRow();
    const I = this.items(); const L = this.draft.look; const lookOn = I.slot === 'pet' ? (L.pet || []).length > 0 : I.slot === 'pattern' ? !!L.pattern : !!L[I.slot] || !!(I.slot2 && L[I.slot2]);
    const el = $('#wSlot'); const selId = this.sel?.id;
    el.innerHTML = `<div class="wrow"><span class="wk">장착</span><div class="wchip">${I.equip}<small>능력치 · 제작/의뢰로만</small></div></div>
      <div class="wrow"><span class="wk">겉모습</span><div class="wchip">${I.skin}<small>꾸미기 · 능력치 0</small></div><button class="wtog ${lookOn ? 'on' : ''}" id="wTog" aria-label="겉모습 켜기"></button></div>
      <div class="wnote">${I.note}</div>
      ${I.items.length ? '' : `<div class="wempty">이 탭엔 '${FILTS.find(f => f[0] === this.filt)?.[1]}' 꾸미기가 없어요 · <button class="lnk" id="wAll">전체 보기</button></div>`}
      <div class="wgrid">${I.items.map((it, i) => { const lock = !it.own && !it.base; const tag = it.on ? (it.cos || it.base ? '겉모습' : '장착 중') : it.own || it.base ? '' : it.past ? '지난 단계' : it.gear ? `작업대 Lv.${it.bench}` : it.weapon ? '제작' : getText(it.cos);
        return `<div class="wit ${it.on ? 'sel' : ''} ${selId === it.id ? 'try' : ''} ${lock ? 'lock' : ''}" data-i="${i}"><span class="wtag">${lock ? '🔒' : it.cos && this.isNew(it.cos) ? '<i class="dot"></i>' : ''}</span>${(it.cos && thumbHtml('cos', it.cos, 40, it.sw, 'wsw')) || `<span class="wsw" style="background:${it.sw}"></span>`}<b>${it.name}</b><small>${tag}</small></div>`; }).join('')}</div>`;
    $('#wTog', el).onclick = () => { sfx.ui(); if (I.slot === 'pet') this.draft.look.pet = []; else if (I.slot === 'pattern') this.draft.look.pattern = null; else { this.draft.look[I.slot] = null; if (I.slot2) this.draft.look[I.slot2] = null; } this.draft.prev = null; this.sel = null; this.slot(); this.rebuild(); };
    $('#wAll', el) && ($('#wAll', el).onclick = () => { sfx.ui(); this.filt = 'all'; this.slot(); });
    el.querySelectorAll('.wit').forEach(d => d.onclick = () => this.pick(I.items[+d.dataset.i]));
    this.cmp(this.sel || I.items.find(x => x.on) || I.items[0]);
  }
  isNew(k) { return (S.owned || []).includes(k) && !(S.lookSeen || []).includes(k); }
  /* 누르기: 가진 것 → 바로 고름(초안) · 없는 것 → 입어 보기만 */
  pick(it) {
    sfx.ui(); const d = this.draft; this.sel = it; d.prev = null;
    if (it.base) { if (it.base === 'pattern') d.look.pattern = null; else d.look[it.base] = null; }
    else if (it.weapon) { if (it.own) d.main = it.weapon; else d.prev = { weapon: it.weapon }; }
    else if (it.gear) { if (it.own) d.gear[it.gear[0]] = it.gear[1]; else d.prev = { gear: it.gear }; if (it.own) { if (it.gear[0] === 'helmet') d.look.head = null; if (it.gear[0] === 'vest') d.look.body = null; } }
    else if (it.cos) {
      const c = COS[it.cos];
      if (it.own) { if (c.slot === 'fur') d.look.fur = it.cos; else if (c.slot === 'pet') { const had = (d.look.pet || []).includes(it.cos); d.look.pet = (d.look.pet || []).filter(x => COS[x].part !== c.part); if (!had) d.look.pet.push(it.cos); } else d.look[c.slot] = d.look[c.slot] === it.cos ? null : it.cos; }
      else d.prev = { cos: it.cos };
    }
    this.slot(); this.rebuild();
  }
  /* 지금 → 바꾸면 */
  cmp(it) {
    const el = $('#wCmp'); if (!it) { el.innerHTML = ''; return; }
    const row = (k, a, b, better) => `<div class="wst"><span>${k}</span><span>${a} → <b class="${better > 0 ? 'up' : better < 0 ? 'dn' : 'same'}">${b} ${better > 0 ? '▲' : better < 0 ? '▼' : ''}</b></span></div>`;
    let rows = '';
    if (it.weapon) {
      const st = k => { const s = E.weaponStats(k, S.weapons[k] || undefined); return { s, acc: E.ttk(s, 400, 10).hit, drone: E.ttk(s, ENEMIES.drone.hp * ZONES[2].hp, 10).t }; };
      const a = st(S.equip.main), b = st(it.weapon);
      rows = row('정확도(10m 연사)', pct(a.acc), pct(b.acc), Math.sign(Math.round(b.acc * 100) - Math.round(a.acc * 100))) + row('드론 처치 시간', a.drone.toFixed(1) + '초', b.drone.toFixed(1) + '초', Math.sign(+a.drone.toFixed(1) - +b.drone.toFixed(1))) + row('장탄', a.s.mag, b.s.mag, Math.sign(b.s.mag - a.s.mag)) + row('사거리', a.s.range.toFixed(1) + 'm', b.s.range.toFixed(1) + 'm', Math.sign(+b.s.range.toFixed(1) - +a.s.range.toFixed(1)));
    } else if (it.gear) {
      const [g, i] = it.gear, cur = S.gear[g], A = GEAR[g].tiers[cur], B = GEAR[g].tiers[i];
      if (g === 'helmet') { const hp0 = E.loadout(S).hp; const hp1 = hp0 - (A.hp || 0) + (B.hp || 0); rows = row('체력', hp0, hp1, Math.sign(hp1 - hp0)); }
      if (g === 'vest') rows = row('받는 피해', A.armor ? '−' + pct(A.armor) : '그대로', B.armor ? '−' + pct(B.armor) : '그대로', Math.sign(B.armor - A.armor)) + row('이동 속도', '그대로', '그대로', 0);
      if (g === 'bag') rows = row('가방 칸', `${A.w}×${A.h}`, `${B.w}×${B.h}`, Math.sign(B.w * B.h - A.w * A.h)) + row('편한 무게', A.comfy + 'kg', B.comfy + 'kg', Math.sign(B.comfy - A.comfy));
    } else rows = row('능력치', '그대로', '그대로', 0);
    let get = '';
    if (it.cos && !it.own) {
      const c = COS[it.cos], g = c.get, p = progress(S, it.cos);
      get = `<div class="wget">얻는 길: <b>${getText(it.cos)}</b>${p && p[1] > 1 ? ` <i>${p[0]}/${p[1]}</i>` : ''}</div>
        ${g.t === 'shells' ? `<button class="wbuy ${S.shells >= g.n ? '' : 'dim'}" id="wBuy"><span class="shell"></span>${g.n} 로 얻기</button>` : ''}${BM.cosGold(it.cos) ? `<button class="wbuy gold" id="wGold">🪙 ${BM.cosGold(it.cos)} 원어데이 골드로 얻기</button>` : ''}`;
    } else if (it.gear && !it.own) get = `<div class="wget">${it.past ? '이미 더 좋은 단계를 갖고 있어요 (입어 보기만)' : `얻는 길: <b>장비 탭 · 작업대 Lv.${it.bench}에서 제작</b>`}</div>`;
    else if (it.weapon && !it.own) get = `<div class="wget">얻는 길: <b>무기 탭에서 제작</b> (입어 보기만)</div>`;
    else get = `<div class="wget">${it.cos ? '가진 꾸미기 · 겉모습 바꾸기는 무료 · 언제든 끌 수 있어요' : '장착 중인 장비'}</div>`;
    el.innerHTML = `<h4>지금 → 바꾸면 · ${it.name}</h4>${rows}${get}`;
    const gb = $('#wGold', el); if (gb) gb.onclick = async () => { if (gb.disabled) return; gb.disabled = true; const r = await BM.buyCosGold(it.cos); gb.disabled = false; if (!r.ok) return; sfx.rare(); this.ui.toast(`${COS[it.cos].name} 얻음! 바로 입어 봐요`, 'good'); this.pick({ ...it, own: true }); };
    const b = $('#wBuy', el); if (b) b.onclick = () => { const r = buyCos(S, it.cos); if (!r.ok) { sfx.empty(); return this.ui.toast(r.why === 'cost' ? '조개가 모자라요' : '지금은 못 얻어요', 'soft'); } save(); sfx.rare(); this.ui.toast(`${COS[it.cos].name} 얻음! 바로 입어 봐요`, 'good'); this.pick({ ...it, own: true }); $('.whead .cur').innerHTML = `<span class="shell"></span>${S.shells.toLocaleString()}`; };
  }
  /* 초안 저장: 가진 것만 반영 (입어 보기 중인 건 버림) */
  commit() {
    const d = this.draft; if (!d) return;
    const L = clone(d.look); for (const s of LOOK_SLOTS) if (L[s] && (!COS[L[s]] || !owns(S, L[s]))) L[s] = null;
    if (!owns(S, L.fur)) L.fur = 'fur_brown'; L.pet = (L.pet || []).filter(k => owns(S, k));
    S.look = L; if (S.weapons[d.main]) { if (S.equip.side === d.main) S.equip.side = null; S.equip.main = d.main; }
    save(); this.app.lookChanged?.();
  }
}
