// 이야기 화면 (DOM) — 대화(말풍선 · 선택지 · 상반신) · 컷신 · 이름 · 열쇠 기억 맡기기 · 기억 도감 · 설정/기록실 · 은신처 창 여섯 + 세 등불 · 결과 화면 이야기 칸
//  흐름: 은신처에 들어올 때마다 onHideout() — 튜토리얼 장면 → 녹음기 → 끝낸 걸음 장면 → 오늘의 장면(하루 한 걸음) → 하루 끝 인사
//  대사 글은 talk/*.js 를 필요할 때 받음 (첫 진입 용량에 안 들어감) · 소리는 sfx 이름만 부름(audio.js 는 오디오 세션 몫 — 없는 이름이면 조용히 넘어감)
import { S, save, today } from './save.js?v=0.99.9';
import * as ST from './story.js?v=0.99.9';
import { ITEMS, QUESTS, MAPS, FACILITIES } from './data.js?v=0.99.9';
import { A } from './assets.js?v=0.99.9';
import { sfx, unlock } from './audio.js?v=0.99.9';
import { StoryRaid } from './story_raid.js?v=0.99.9';
import { ART } from './talk/art.js?v=0.99.9';   /* 있는 그림 목록 (tools/artlist.mjs 가 만듦 — 없는 그림은 안 받음 → 404 없음) */

const Q = new URLSearchParams(location.search);
const snd = (n, ...a) => { try { sfx[n]?.(...a); } catch { /* */ } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const wait = ms => new Promise(r => setTimeout(r, ms));
const $ = (s, r = document) => r.querySelector(s);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

/* ───── 대사 파일 나눠 받기 ───── */
const FILES = { t0: () => import('./talk/t0.js?v=0.99.9'), t1: () => import('./talk/t1.js?v=0.99.9'), t2: () => import('./talk/t2.js?v=0.99.9'), t3: () => import('./talk/t3.js?v=0.99.9'), common: () => import('./talk/common.js?v=0.99.9'), memo: () => import('./talk/memo.js?v=0.99.9') };
const cache = {}, got = {};
export function talk(k) { return (cache[k] ||= FILES[k]().then(m => (got[k] = m))); }
export const T = got;
const beatTalk = async b => (await talk('t' + Math.min(3, b.ch))).BEAT[b.id] || {};

/* ───── 이름 (기기에만) ───── */
let memName = null;
export function getName() { try { const v = localStorage.getItem(ST.NAME_KEY); if (v) return ST.cleanName(v); } catch { /* */ } return memName || ST.NAME_DEFAULT; }
export function setName(n) { memName = ST.cleanName(n); try { localStorage.setItem(ST.NAME_KEY, memName); } catch { /* */ } }
const say = t => ST.say(t, getName());

/* ───── 인물 그림 (assets/story/<id>_<표정>.webp — 아트 세션 · 없으면 실루엣) ───── */
const ART_ID = { nole: 'noeul' };
export const artUrl = n => (ART[n] ? `assets/story/${n}.${ART[n]}` : null);
const face = (id, ex) => artUrl(`${ART_ID[id] || id}_${ex || 'base'}`) || artUrl(`${ART_ID[id] || id}_base`);
const SIL = {
  gombang: '<circle cx="50" cy="56" r="27"/><circle cx="29" cy="31" r="9"/><circle cx="71" cy="31" r="9"/><rect x="26" y="50" width="48" height="11" rx="5" fill="rgba(0,0,0,.35)"/>',
  moru: '<circle cx="50" cy="56" r="27"/><circle cx="31" cy="34" r="6"/><circle cx="69" cy="34" r="6"/><rect x="44" y="70" width="12" height="9" rx="2" fill="rgba(255,255,255,.55)"/>',
  neuru: '<ellipse cx="50" cy="58" rx="31" ry="24"/><circle cx="33" cy="38" r="5"/><circle cx="67" cy="38" r="5"/><circle cx="50" cy="28" r="8" fill="#ffa84a"/>',
  haedam: '<path d="M14 92a36 30 0 0 1 72 0z" opacity=".55"/><circle cx="50" cy="52" r="24"/><circle cx="41" cy="50" r="5" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2"/><circle cx="59" cy="50" r="5" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2"/>',
  seori: '<circle cx="50" cy="55" r="27"/><circle cx="41" cy="52" r="3" fill="rgba(0,0,0,.4)"/><circle cx="59" cy="52" r="3" fill="rgba(0,0,0,.4)"/><path d="M30 62h-12M30 66h-11M70 62h12M70 66h11" stroke="rgba(255,255,255,.5)" stroke-width="1.5"/>',
  baram: '<path d="M22 70q0-46 28-50q28 4 28 50z" opacity=".7"/><ellipse cx="50" cy="58" rx="19" ry="23"/><circle cx="50" cy="94" r="5" fill="#222"/>',
  nole: '<circle cx="50" cy="56" r="26"/><circle cx="50" cy="38" r="7" fill="#fff3c0"/><path d="M50 38l-34-20v40z" fill="rgba(255,240,180,.25)"/>',
  pasu: '<rect x="24" y="30" width="52" height="46" rx="8"/><circle cx="50" cy="53" r="9" fill="#6fe0d8"/>',
  mongi: '<ellipse cx="50" cy="60" rx="24" ry="21"/><circle cx="34" cy="42" r="5"/><circle cx="66" cy="42" r="5"/><circle cx="50" cy="64" r="4" fill="rgba(0,0,0,.4)"/>',
  box: '<rect x="20" y="36" width="60" height="42" rx="5"/><rect x="20" y="36" width="60" height="12" rx="4" fill="rgba(0,0,0,.25)"/><rect x="44" y="44" width="12" height="10" rx="2" fill="#ffd36b"/>',
};
export function portrait(id, cls = '', ex) {
  const c = (ST.SPEAK[id] || {}).color || '#8fa6ae'; const u = face(id, ex);
  return `<span class="pt pt-${id} ${cls} ${u ? 'art' : ''}" style="--c:${c}">${u ? `<img src="${u}" alt="" draggable="false">` : `<svg viewBox="0 0 100 100" fill="${c}">${SIL[id] || SIL.box}</svg>`}</span>`;
}
const whoName = id => (id === 'box' ? '도감 상자' : ST.SPEAK[id]?.name || '');

/* 말풍선 40자 넘으면 문장 끝에서 나눔 */
export function bubbles(t) {
  if (t.length <= 40) return [t];
  const parts = t.match(/[^.?!…]+[.?!…]+["”]?\s*|[^.?!…]+$/g) || [t]; const out = []; let cur = '';
  for (const p of parts) { if ((cur + p).trim().length > 40 && cur) { out.push(cur.trim()); cur = p; } else cur += p; }
  if (cur.trim()) out.push(cur.trim()); return out;
}

/* 그림 없는 초소 장면 → 초소 3D 흐리게 + 얹을 것 (원화 자리: cut_night · cut_tape — 생기면 그 그림을 씀) */
const TAPE_SLOT = '<div class="tapeslot"><svg viewBox="0 0 160 100" aria-hidden="true"><rect x="8" y="14" width="144" height="74" rx="9" fill="#2b2a26" stroke="#c9a36a" stroke-width="2"/><rect x="26" y="28" width="108" height="34" rx="5" fill="#e9dcc0"/><circle cx="56" cy="45" r="11" fill="#2b2a26"/><circle cx="104" cy="45" r="11" fill="#2b2a26"/><circle cx="56" cy="45" r="4" fill="#e9dcc0"/><circle cx="104" cy="45" r="4" fill="#e9dcc0"/><path d="M40 88l10-14h60l10 14" fill="#3a3832"/></svg><div class="wave">' + '<i></i>'.repeat(18) + '</div></div>';
const SCENE3D = { night: '<div class="glow"></div>', tape: TAPE_SLOT, cut_tape: TAPE_SLOT, cut_night: '<div class="glow"></div>' };

/* ───── 대화 재생기 ───── */
class Player {
  constructor(story) { this.story = story; }
  get app() { return this.story.app; }
  mount() {
    const f = $('#frame'); let el = $('#story', f); if (el) el.remove();
    el = this.el = h('div', 'story', `<div class="st-cut"></div><div class="st-shade"></div>
      <button class="st-skip">건너뛰기 ›</button>
      <div class="st-card"></div>
      <div class="st-bust"><img alt="" draggable="false"></div>
      <div class="st-box"><div class="st-who"></div><div class="st-txt"></div><i class="st-next"></i><div class="st-ch"></div></div>`);
    el.id = 'story'; f.appendChild(el); f.classList.add('storying'); /* 이야기 중엔 위쪽 자원 줄 숨김 (건너뛰기가 골드를 덮지 않게) */
    this.bust = $('.st-bust', el); this.box = $('.st-box', el); this.txt = $('.st-txt', el); this.who = $('.st-who', el); this.ch = $('.st-ch', el); this.cut = $('.st-cut', el); this.card = $('.st-card', el);
    $('.st-skip', el).onclick = e => { e.stopPropagation(); this.skipping = true; snd('ui'); this.tap?.(); };
    el.addEventListener('pointerdown', e => { if (e.target.closest('.st-ch, .st-skip, .st-keep')) return; unlock(); this.tap?.(); });
  }
  unmount() { this.el?.classList.add('out'); const e = this.el; setTimeout(() => { e?.remove(); if (!$('#story')) $('#frame').classList.remove('storying', 'st3d'); }, 260); this.el = null; }
  /* 스크립트 재생 · opt: { ctx(flag), replay(효과 없이), noSkip } */
  async play(script, opt = {}) {
    this.opt = opt; this.skipping = false; if (!this.el) this.mount();
    for (const st of script || []) if (st?.cut && artUrl(st.cut)) { const im = new Image(); im.src = artUrl(st.cut); } /* 컷 그림 미리 받기 */
    $('.st-skip', this.el).style.display = opt.noSkip ? 'none' : '';
    await this.run(script); return true;
  }
  async run(steps) {
    for (const s of steps || []) {
      if (Array.isArray(s)) { await this.line(s[0], s[1], s[2]); continue; }
      if (s.cut !== undefined) { if (!this.skipping) this.setCut(s.cut && !artUrl(s.cut) && s.fb ? s.fb : s.cut, s.tone); continue; }
      if (s.c) { await this.choice(s); continue; }
      if (s.if) { const v = this.opt.ctx?.(s.if); await this.run(v ? s.then : s.else); continue; }
      if (s.fx) await this.fx(s);
    }
  }
  setCut(name, tone) {
    const c = this.cut; const f = $('#frame'); f.classList.remove('st3d');
    if (!name) { c.className = 'st-cut'; c.innerHTML = ''; this.el.classList.remove('cutting'); return; }
    this.el.classList.add('cutting'); c.className = `st-cut on tone-${tone || 'night'}`; c.innerHTML = '<div class="glow"></div>';
    if (name === 'black') { c.className = 'st-cut on tone-black'; return; }
    const u = artUrl(name);
    /* 그림 없는 초소 장면(밤 · 녹음기)은 초소 3D 를 흐리게 깔고 색만 입힘 (v0.5.1 · 검수 Top 3) — 원화가 생기면 그 그림이 먼저 */
    if (!u && SCENE3D[name] && !this.app?.raid) { c.className = `st-cut on s3d tone-${tone || 'night'}`; f.classList.add('st3d'); c.innerHTML = SCENE3D[name]; return; }
    if (!u) return; /* 그 밖의 그림 없는 장면은 색 배경만 */
    const im = new Image(); im.className = 'kb'; im.alt = ''; im.onload = () => c.classList.add('art'); im.src = u; c.appendChild(im);
    snd('cut');
  }
  /* 한 줄: 받침 · 이름 바꾸고 40자씩 · 글자 하나씩(누르면 다 보임 → 다음) */
  async line(sp, text, ex) {
    if (this.skipping) return;
    const radio = sp.endsWith('~'); const id = ST.ALIAS[sp.replace('~', '')] || sp.replace('~', ''); const cap = id === '@';
    this.box.className = 'st-box' + (cap ? ' cap' : '') + (radio ? ' radio' : '') + (id === 'nole' ? ' nole' : '');
    /* 상반신: 그림이 있는 인물이 그 자리에서 말할 때 (무전 · 장면 글은 작은 얼굴만) */
    const u = !cap && !radio && !this.el.classList.contains('cutting') ? face(id, ex) : null; const bi = this.bust.firstChild;
    if (u) { if (this.bustId !== id) { this.bust.classList.remove('on'); void this.bust.offsetWidth; } bi.src = u; this.bust.classList.add('on'); this.bust.dataset.who = id; this.bustId = id; }
    else { this.bust.classList.remove('on'); this.bustId = null; }
    this.who.innerHTML = cap ? '' : `${u ? '' : portrait(id, '', ex)}<b>${radio ? '<em>무전</em> · ' : ''}${esc(whoName(id))}</b><small>${esc(ST.SPEAK[id]?.role || '')}</small>`;
    this.who.classList.toggle('plate', !!u);
    this.ch.innerHTML = '';
    if (radio) snd('radio'); else if (!cap) snd('talk');
    for (const b of bubbles(say(text))) {
      if (this.skipping) return;
      let i = 0, done = false; const full = esc(b); this.txt.innerHTML = ''; this.box.classList.remove('ready');
      await new Promise(res => {
        const tick = () => { if (done) return; i += 2; this.txt.innerHTML = esc(b.slice(0, i)); if (i >= b.length) { done = true; this.box.classList.add('ready'); } else this.tm = setTimeout(tick, 26); };
        this.tap = () => { if (this.skipping) { clearTimeout(this.tm); done = true; res(); return; } if (!done) { clearTimeout(this.tm); done = true; this.txt.innerHTML = full; this.box.classList.add('ready'); } else res(); };
        tick();
      });
      this.tap = null;
    }
  }
  /* 선택지 — 등불(세 등불에 들어가는 선택)은 작은 불 표시 · 건너뛰기 중에도 선택지는 멈춰서 물음 */
  async choice(s) {
    this.skipping = false; this.box.className = 'st-box choosing'; this.txt.innerHTML = ''; this.who.innerHTML = ''; this.bust.classList.remove('on'); this.bustId = null;
    const pick = await new Promise(res => {
      this.ch.innerHTML = s.c.map(([t, , fx], i) => `<button data-i="${i}">${fx?.gauge ? `<i class="lampdot" style="--c:${ST.SIDES[Object.keys(fx.gauge)[0]].color}"></i>` : ''}${esc(say(t))}</button>`).join('');
      this.ch.querySelectorAll('button').forEach(b => b.onclick = e => { e.stopPropagation(); unlock(); snd('ui'); res(+b.dataset.i); });
    });
    this.ch.innerHTML = ''; const [, react, fx] = s.c[pick];
    if (!this.opt.replay) { ST.applyFx(S, fx); if (fx?.rel) snd('bond'); if (fx?.gauge) { this.story.lampFlash = Object.keys(fx.gauge)[0]; snd('lamp'); } save(); }
    await this.run(react);
  }
  async fx(s) {
    const R = this.opt.replay; const st = S.story;
    if (s.fx === 'join') { if (this.skipping) return; snd('windowLight'); await this.showCard(`<div class="cardwin">${portrait(s.who)}<i class="winlight"></i></div><b>초소 창에 불이 하나 더</b><small>${esc(whoName(s.who))} · ${esc(ST.CAST[s.who]?.role || '')} 합류</small>`, 1600); return; }
    if (s.fx === 'memo') { snd('memory'); const m = got.memo?.MEMO[s.item]; await this.showCard(`<div class="memoic">${A.icons[s.item] ? `<img src="${A.icons[s.item]}" alt="">` : ''}</div><small class="kick">기억 조각 · 첫 기록</small><b>${esc(ITEMS[s.item]?.name || '')}</b><p>${esc(say(s.txt || m?.[0] || ''))}</p>`, 0, true); if (!R) { st.codex[s.item] = Math.max(1, st.codex[s.item] || 0); st.flags.codexNew = 1; save(); } return; }
    if (s.fx === 'keymem') { if (R) return; if (!st.keyMem[s.id]) { if (!st.keyQ.includes(s.id)) st.keyQ.push(s.id); save(); this.skipping = false; await this.story.keyChooser(s.id, this); } return; }
    if (s.fx === 'title') { if (this.skipping) return; snd('chapter'); await this.title(s.ch, s.soon); return; }
    if (s.fx === 'tomorrow') { if (this.skipping) return; await this.showCard(`<small class="kick">내일</small><b>${esc(s.txt.replace(/^내일:\s*/, ''))}</b>`, 0, true); if (!R) { st.tomorrow = s.txt; save(); } return; }
    if (s.fx === 'pulse') { if (!R) this.story.pulse = s.sel; return; }
    if (s.fx === 'codex') { if (!R) { st.flags.codexNew = 1; save(); } return; }
    if (s.fx === 'quest') { if (!R) this.story.wantTab = 'quest'; return; }
    if (s.fx === 'windows') { if (this.skipping) return; document.querySelector('.post')?.classList.add('hl'); return; }
  }
  /* 가운데 카드 (ms 뒤 저절로 · keep 이면 눌러야 닫힘) */
  async showCard(html, ms, keep) {
    const c = this.card; c.innerHTML = `<div class="stc">${html}${keep ? '<small class="tapnext">눌러서 계속</small>' : ''}</div>`; c.classList.add('on'); this.box.classList.add('hide');
    await new Promise(res => { let t = null; this.tap = () => { clearTimeout(t); res(); }; if (ms && !keep) t = setTimeout(res, ms); });
    this.tap = null; c.classList.remove('on'); this.box.classList.remove('hide');
  }
  async title(ch, soon) {
    const C = ST.CHAPTERS[ch]; const c = this.card;
    c.innerHTML = `<div class="sttitle"><small>${ch}장</small><b>「${esc(C?.name || '')}」</b>${soon ? '<em>다음 업데이트에서 이어집니다</em>' : ''}</div>`; c.classList.add('on', 'big'); this.box.classList.add('hide');
    await new Promise(res => { const t = setTimeout(res, soon ? 3200 : 2400); this.tap = () => { clearTimeout(t); res(); }; });
    this.tap = null; c.classList.remove('on', 'big'); this.box.classList.remove('hide');
  }
}

/* ───── 이야기 전체 ───── */
export class Story {
  constructor(app, ui) {
    this.app = app; this.ui = ui; this.player = new Player(this); this.busy = false;
    this.on = !(Q.has('bot') || ((Q.has('free') || Q.has('nostory')) && !Q.has('story')));
    this.raid = new StoryRaid(app, this);
    /* 첫 진입 뒤 조용히 받아 둠 (은신처 대사 · 도감) */
    setTimeout(() => { talk('common'); talk('memo'); const ch = ST.chapter(S); talk('t' + Math.min(3, ch)); if (S.story.tut < 4) talk('t0'); }, 1200);
  }
  ctx(f) { const st = S.story; if (f === 'metBaram') return st.met.includes('baram'); return !!st.flags[f]; }
  async play(script, opt = {}) { if (!script) return; await this.player.play(script, { ctx: f => this.ctx(f), ...opt }); }
  close() { this.player.unmount(); this.player.el = null; }

  /* 은신처에 들어올 때마다 (ui.hideout 끝에서) */
  async onHideout() {
    if (!this.on || this.busy || this.app.raid || this.app.starting) return;
    const st = S.story; const d = today(); this.busy = true; let played = false;
    const ui = this.ui; const stillHome = () => ui.root.className === 'scr-hideout' && !this.app.raid;
    try {
      if (st.tut === 0) { await this.tutorialStart(); return; }
      if (st.tut >= 1 && st.tut <= 3) {
        const t0 = await talk('t0');
        if (st.tut === 1 && st.tutRaids >= 1) { played = true; await this.play(t0.SCENE3); await this.play(t0.SCENE4); st.tut = 2; save(); }
        if (st.tut === 2 && st.tutRaids >= 2) { played = true; await this.play(t0.SCENE5); st.tut = 3; save(); }
        if (st.tut === 3 && st.tutRaids >= 3) { played = true; await this.play(t0.SCENE6); ST.finishTut(S, d); st.dayEnd = d; save(); }
      }
      if (!stillHome()) return;
      const C = await talk('common'); await talk('memo');
      if (st.flags.welcome) { played = true; await this.play(C.WELCOME); delete st.flags.welcome; save(); }
      /* 녹음기 */
      while (st.tapeQ.length && stillHome()) { played = true; const id = st.tapeQ[0]; await this.playTape(id); st.tapeQ.shift(); if (!st.tapes.includes(id)) st.tapes.push(id); st.flags.codexNew = 1; save(); }
      /* 맡길 열쇠 기억이 남아 있으면 */
      for (const k of [...st.keyQ]) { if (!stillHome()) break; played = true; await this.keyChooser(k); }
      /* 본 사슬 의뢰로 끝난 걸음 · 끝낸 걸음 장면 · 오늘의 장면 */
      for (let guard = 0; guard < 8 && stillHome(); guard++) {
        ST.storyTick(S, d);
        if (st.doneQ.length) { played = true; const b = ST.BEATS[ST.BEAT_IDX[st.doneQ[0]]]; const bt = await beatTalk(b); await this.play(bt.done); snd('page'); if (bt.lore) await this.player.showCard(`<small class="kick">이야기 조각</small><p>${esc(say(bt.lore))}</p>`, 2600); st.doneQ.shift(); save(); continue; }
        const b = ST.canOpen(S, d); if (!b) break;
        played = true; ST.startBeat(S, b, d); save(); const bt = await beatTalk(b);
        await this.play(bt.open);
        if (b.goal) { this.wantTab = 'quest'; snd('quest'); }
        if (b.last && !st.beatsDone[b.id]) ST.finishBeat(S, b, d, false);
        save();
      }
      /* 하루 끝 인사 */
      if (stillHome() && ST.dayEndDue(S, d)) { played = true; await this.dayEnd(C, d); }
    } catch (e) { console.warn('이야기', e); }
    finally {
      this.busy = false; if (this.player.el) this.close();
      if (played && stillHome()) { if (this.wantTab) { ui.tab = this.wantTab; this.wantTab = null; } ui.hideout(); }
    }
  }
  /* ───── 튜토리얼 시작: 프롤로그 → 이름 → 장면 1 → 첫 판 ───── */
  async tutorialStart() {
    const t0 = await talk('t0'); S.firstRun = false; save();
    /* 프롤로그 첫 그림을 받은 뒤 로딩 막을 걷음 (막 뒤로 은신처가 비치지 않게) */
    const u = artUrl('cut_0_1'); if (u) { const im = new Image(); im.src = u; await Promise.race([im.decode().catch(() => {}), wait(2500)]); }
    setTimeout(() => this.app.hideLoading?.(), 150);
    await this.play(t0.PROLOGUE);
    const skip = await this.nameModal(true);
    const st = S.story; if (!st.joined.includes('gombang')) st.joined.push('gombang');
    if (skip) { ST.finishTut(S, today()); st.codex.tagbox = Math.max(1, st.codex.tagbox || 0); st.flags.tutSkipped = 1; save(); await this.play(t0.SKIPPED, { noSkip: true }); this.close(); this.busy = false; this.ui.hideout(); setTimeout(() => this.ui.howto(), 200); return; }
    /* 장면 1 은 첫 판 안에서 (걸어가는 동안 무전 · 선택지는 첫 상자 뒤 — story_raid.js) */
    st.tut = 1; save(); this.close(); this.busy = false;
    this.app.startRaid({ safeItems: [], carry: [], map: 'ware' });
  }
  /* 이름 (기기에만 저장) — first: 처음이면 '튜토리얼 건너뛰기' 도 */
  nameModal(first) {
    return new Promise(res => {
      const m = h('div', 'modal st-keep namem', `<div class="sheet"><small class="kick">${first ? '등불 수색대 신입' : '이름 바꾸기'}</small><h3>이름을 알려 주세요</h3>
        <input id="nmIn" maxlength="${ST.NAME_MAX}" value="${esc(getName())}" autocomplete="off" enterkeyhint="done"><small class="hint">${ST.NAME_MAX}자까지 · 이 기기에만 저장돼요</small>
        <button class="btn cta" id="nmOk">${first ? '이 이름으로' : '바꾸기'}</button>${first ? '<button class="lnk" id="nmSkip">튜토리얼 건너뛰기 (조작을 알아요)</button>' : '<button class="lnk" id="nmNo">그대로 두기</button>'}</div>`);
      $('#frame').appendChild(m); const inp = $('#nmIn', m);
      const done = skip => { setName(inp.value); snd('ui'); m.remove(); res(skip); };
      $('#nmOk', m).onclick = () => done(false); inp.onkeydown = e => { if (e.key === 'Enter') done(false); };
      $('#nmSkip', m) && ($('#nmSkip', m).onclick = () => done(true)); $('#nmNo', m) && ($('#nmNo', m).onclick = () => { m.remove(); res(false); });
    });
  }
  /* 열쇠 기억: 누구에게 맡길까 (그 사람 쪽 등불 +2) */
  async keyChooser(id, player) {
    const K = ST.KEYMEM[id]; const C = await talk('common'); const tx = C.KEYTXT[id]; const st = S.story;
    if (st.keyMem[id]) { st.keyQ = st.keyQ.filter(k => k !== id); return; }
    const own = !player; const P = player || this.player; if (!P.el) P.mount(); P.box.classList.add('hide');
    const pick = await new Promise(res => {
      P.card.innerHTML = `<div class="stc keym st-keep"><small class="kick">열쇠 기억 · ${K.ch}장</small><div class="memoic lantern"></div><b>${esc(K.name)}</b><p>${esc(say(tx.desc))}</p><small class="ask">누구에게 맡길까?</small>
        <div class="keyto">${K.to.map(w => `<button data-w="${w}">${portrait(w)}<b>${esc(whoName(w))}</b><i class="lampdot" style="--c:${ST.SIDES[ST.SIDE_OF[w]].color}"></i></button>`).join('')}</div></div>`;
      P.card.classList.add('on'); snd('memory');
      P.card.querySelectorAll('.keyto button').forEach(b => b.onclick = e => { e.stopPropagation(); unlock(); res(b.dataset.w); });
    });
    ST.giveKey(S, id, pick); this.lampFlash = ST.SIDE_OF[pick]; snd('lamp'); save();
    P.card.classList.remove('on'); P.card.innerHTML = ''; P.box.classList.remove('hide');
    await P.run([[pick === 'box' ? '@' : pick, tx.to[pick]]]);
    if (own) this.close();
  }
  async playTape(id) {
    const M = await talk('memo'); const t = M.TAPE[id]; if (!t) return; snd('tape');
    await this.play([{ cut: 'cut_tape', tone: 'tape' }, ['@', `녹음기 · ${t.who}`], ...t.lines.map(l => [t.nole ? 'o' : '@', `“${l}”`]), ...(t.nole && S.story.joined.includes('neuru') ? [['@', '몽이가 녹음기 옆에 가서 웅크린다.']] : [])]);
  }
  async dayEnd(C, d) {
    const st = S.story; st.dayEnd = d; const who = ST.lit(S).filter(k => C.DAYEND[k]); const w = who[(Date.parse(d) / 864e5 | 0) % Math.max(1, who.length)] || 'gombang';
    const next = ST.beatNow(S); let tease = C.TEASE_IDLE;
    if (next && !next.tut) { const ok = !next.need?.q || S.quests.done.includes(next.need.q); tease = ok && !st.open ? ((await beatTalk(next)).tease || C.TEASE_IDLE) : st.open ? C.TEASE_QUEST : C.TEASE_QUEST; }
    st.tomorrow = tease; save();
    await this.play([{ cut: 'cut_night', tone: 'night' }, [w, C.DAYEND[w]], { fx: 'tomorrow', txt: tease }]);
  }

  /* ───── 은신처 꾸미기: 창 여섯(인물) + 세 등불 + 기록 도감 · 설정 ───── */
  decorate(el) {
    const st = S.story; const d = today(); const sp = $('.spacer', el); if (!sp) return;
    const wins = ST.CAST_KEYS.map(k => { const on = st.joined.includes(k); const vis = k === 'baram' && ST.visitor(S); const due = ST.talkDue(S, k, d);
      return `<button class="win ${on ? 'lit' : vis ? 'vis' : ''}" data-who="${k}" ${on || vis ? '' : 'disabled'} aria-label="${ST.CAST[k].name}">${on || vis ? portrait(k) : '<span class="pt dark"></span>'}${due ? '<i class="talkdot">…</i>' : ''}<small>${on || vis ? ST.CAST[k].name : ''}</small></button>`; }).join('');
    const lamps = Object.keys(ST.SIDES).map(s => `<i class="lamp ${this.lampFlash === s ? 'flash' : ''}" title="${ST.SIDES[s].name}" style="--c:${ST.SIDES[s].color};--b:${(0.12 + ST.lampLevel(S, s) * 0.88).toFixed(2)}"></i>`).join('');
    const post = h('div', 'post', `<div class="wins">${wins}</div><div class="lamps" title="세 등불">${lamps}</div>`);
    sp.prepend(post); this.lampFlash = null;
    post.querySelectorAll('.win:not([disabled])').forEach(b => b.onclick = () => { unlock(); snd('ui'); this.chat(b.dataset.who); });
    post.querySelector('.lamps').onclick = () => this.codex('key');
    const cx = h('button', 'wardpill codexpill', `${st.joined.includes('seori') ? '서리의 기록 도감' : '기억 조각'}${st.flags.codexNew ? '<i class="dot"></i>' : ''}`); cx.id = 'codexBtn';
    cx.onclick = () => { unlock(); snd('ui'); this.codex(); }; sp.appendChild(cx);
    if (this.pulse) { $(this.pulse, el)?.classList.add('pulse'); if (st.tut >= 4) this.pulse = null; }
    const how = $('#how', el); if (how) { how.textContent = '설정'; how.onclick = () => this.settings(); }
  }
  /* 의뢰 탭 위: 이야기 의뢰 카드 */
  questHtml() {
    const st = S.story; const b = ST.openBeat(S); const bt = b && got['t' + Math.min(3, b.ch)]?.BEAT[b.id];
    if (b?.goal) return `<div class="qcard story"><small>이야기 의뢰 · ${b.ch}장 「${esc(ST.CHAPTERS[b.ch].name)}」${b.goal.map ? ` · ${MAPS[b.goal.map].icon} ${MAPS[b.goal.map].name}` : ''}</small><h3>${esc(b.name)}</h3>
      ${bt?.ask && ST.present(S, b.giver) ? `<div class="giver">${portrait(b.giver)}<p><b>${esc(whoName(b.giver))}</b> ${esc(say(bt.ask))}</p></div>` : ''}<p>${esc(b.txt || '')}</p>${b.reward ? '<small class="hint">보상: 은신처에서 이야기와 함께</small>' : ''}</div>`;
    if (st.tut < 4) return '';
    const nx = ST.beatNow(S); if (!nx) return '<div class="note good st-note">이야기 1~3장을 모두 봤어요. 4장은 다음 업데이트에서.</div>';
    const qn = nx.need?.q && QUESTS.find(q => q.id === nx.need.q).name; const wait = qn && !S.quests.done.includes(nx.need.q) ? `의뢰 '${qn}'${ST.say('{name:을/를}', qn).slice(qn.length)} 끝내면` : '내일';
    return `<div class="note st-note">다음 이야기: <b>${wait}</b> 열려요 · 은포는 하루에 조금씩 열려요</div>`;
  }
  /* 지금 의뢰 카드: 의뢰인 한 마디 (아직 안 온 사람은 무전) */
  giverHtml(q) {
    const C = got.common; if (!q || !C) return ''; const t = C.QTALK[q.id]; if (!t) return ''; const v = ST.giverVoice(S, q.giver);
    const kind = { story: '이야기', char: '인물', boss: '보스', chal: '도전' }[q.kind] || '';
    /* 아직 초소에 없는 의뢰인은 말하지 않음 — 곰방이 '그 사람 몫'이라고 대신 전함 (v0.5.1) */
    const line = v.relay ? (C.QRELAY?.give || '').replace('{role}', v.relay) : t.give;
    return `<div class="giver">${portrait(v.id)}<p><b>${esc(whoName(v.id))}</b> ${esc(say(line))}</p></div><small class="kind k-${q.kind}">${kind}</small>`;
  }
  /* 출격 준비: 이 지도에 이야기 의뢰가 있으면 */
  prepNote(map) { const w = ST.storyWant(S, map); const b = ST.openBeat(S); if (!b?.goal || b.goal.map !== map) return ''; return `<div class="note story">이야기 의뢰 <b>${esc(b.name)}</b> — ${esc(b.txt)}${w ? ' · 금빛 고리 상자' : ''}</div>`; }
  /* 결과 화면 이야기 칸 (v0.5.1 · 검수 Top 10) — 의뢰 · 이야기 의뢰 = 의뢰인 작은 얼굴 + 금빛 카드 · 새 기억 조각 = 카드 뒤집기(차례로) */
  resultHtml(res) {
    const so = res.story || {}; const C = got.common, M = got.memo; const out = []; const t0 = got.t0;
    if (so.tut === 1 && t0) out.push(`<div class="card st-say">${portrait('gombang')}<p><b>곰방</b> ${esc(res.outcome === 'extract' ? t0.RESULT_TUT.ok : t0.RESULT_TUT.ko)}</p></div>`);
    for (const q of res.quests || []) {
      const t = C?.QTALK[q.id]; const v = ST.giverVoice(S, q.giver); const line = t && !(so.tut === 1 && q.id === 'q1') ? (v.relay ? (C.QRELAY?.done || '').replace('{role}', v.relay) : t.done) : '';
      const extra = `${q.unlock ? FACILITIES[q.unlock].name + ' 해금! ' : ''}${q.map ? `새 지도 ${MAPS[q.map].name}! ` : ''}`;
      out.push(`<div class="card st-gold ${q.kind === 'story' ? 'sg-story' : ''}">${portrait(v.id, 'sm')}<div><small class="kick">의뢰 완료${extra ? ' · ' + esc(extra.trim()) : ''}</small><b class="gt">${esc(q.name)}</b>${line ? `<p><b>${esc(whoName(v.id))}</b> ${esc(say(line))}</p>` : '<p>보상을 받았어요</p>'}${t?.lore ? `<small class="lore">이야기 조각 · ${esc(say(t.lore))}</small>` : ''}</div></div>`);
    }
    if (so.beatDone) { const b = ST.BEATS[ST.BEAT_IDX[so.beatDone]]; out.push(`<div class="card st-gold sg-story sg-beat">${portrait(ST.present(S, b.giver) ? b.giver : 'gombang', 'sm')}<div><small class="kick">이야기 의뢰 완료 · ${b.ch}장 「${esc(ST.CHAPTERS[b.ch].name)}」</small><b class="gt">${esc(b.name)}</b><p>은신처에서 이야기가 이어져요</p></div></div>`); }
    const flip = (k, txt, i) => `<div class="mflip" style="--d:${(0.35 + i * 0.28).toFixed(2)}s"><div class="mf-in"><div class="mf-back"><i></i></div><div class="mf-front mrow2"><img src="${A.icons[k] || ''}" alt=""><p><b>${esc(ITEMS[k].name)}</b>${esc(say(txt || ''))}</p></div></div></div>`;
    if (so.newMemo?.length) out.push(`<div class="card st-memo"><div class="fh"><b>새 기억 조각 ${so.newMemo.length}</b><span class="lv">${S.story.joined.includes('seori') ? '서리의 기록 도감' : '기억 조각'}에 쌓였어요</span></div>${so.newMemo.slice(0, 3).map((k, i) => flip(k, M?.MEMO[k]?.[0], i)).join('')}${so.newMemo.length > 3 ? `<small class="hint">그 밖에 ${so.newMemo.length - 3}개</small>` : ''}</div>`);
    if (so.third?.length) out.push(`<div class="card st-memo"><div class="fh"><b>사연 한 줄 더</b><span class="lv">세 번째로 건짐</span></div>${so.third.slice(0, 2).map((k, i) => flip(k, M?.MEMO[k]?.[1], i + (so.newMemo?.length ? Math.min(3, so.newMemo.length) : 0))).join('')}</div>`);
    if (so.tapes?.length) out.push(`<div class="note story">녹음기 ${so.tapes.length}개 — 은신처에서 들어 봐요</div>`);
    if (so.newMemo?.length || so.third?.length) { const n = Math.min(3, so.newMemo?.length || 0) + Math.min(2, so.third?.length || 0); for (let i = 0; i < n; i++) setTimeout(() => snd('memory'), 350 + i * 280); }
    else if (out.length) snd('memory');
    return out.join('');
  }

  /* ───── 은신처 말 걸기 ───── */
  async chat(who) {
    if (this.busy) return; this.busy = true; const C = await talk('common'); const st = S.story; const d = today(); const pool = C.SMALL[who] || [];
    const ok = (t) => (!t.rel || (st.rel[who] || 0) >= t.rel) && (!t.ch || ST.chapter(S) >= t.ch);
    let i = st.talkIdx[who] || 0; const fresh = st.talkDay[who] !== d;
    let pickI = -1; if (fresh) for (let j = i; j < pool.length; j++) if (ok(pool[j])) { pickI = j; break; }
    if (pickI < 0) { const can = pool.map((t, j) => ok(t) ? j : -1).filter(j => j >= 0); pickI = can[(Date.now() / 1000 | 0) % Math.max(1, can.length)] ?? 0; }
    const t = pool[pickI];
    try {
      const rl = ST.relName(st.rel[who] || 0); const head = [['@', `${ST.CAST[who].name} · ${ST.CAST[who].role} — ${rl}`]];
      await this.play([...head, ...(t?.lines || []), ...(t?.c ? [{ c: t.c.map(([a, r]) => [a, r, { rel: { [who]: 1 } }]) }] : [])]);
      ST.talked(S, who, d, fresh && pickI >= i ? pickI + 1 : i); save();
    } finally { this.busy = false; this.close(); if (this.ui.root.className === 'scr-hideout') this.ui.hideout(); }
  }

  /* ───── 기억 도감 ───── */
  async codex(tab = 'memo') {
    const M = await talk('memo'); const C = await talk('common'); const st = S.story; st.flags.codexNew = 0; save();
    const found = ST.CODEX_KEYS.filter(k => st.codex[k]).length; const seori = st.joined.includes('seori');
    const m = h('div', 'modal codex st-keep'); $('#frame').appendChild(m);
    const draw = () => {
      const lamps = Object.entries(ST.SIDES).map(([s, S2]) => `<div class="lampc"><i class="lamp" style="--c:${S2.color};--b:${(0.12 + ST.lampLevel(S, s) * 0.88).toFixed(2)}"></i><small>${S2.name}</small></div>`).join('');
      let body = '';
      if (tab === 'memo') body = `<div class="cgrid">${ST.CODEX_KEYS.map(k => { const n = st.codex[k] || 0; return `<button class="cc ${n ? '' : 'no'} ${ITEMS[k].cat === 'memo' ? 'story' : ''}" data-k="${k}">${n ? `<img src="${A.icons[k] || ''}" alt="">` : '<span>?</span>'}${n >= 3 && M.MEMO[k]?.[1] ? '<i class="three">✦</i>' : ''}</button>`; }).join('')}</div><div class="cdetail" id="cdet"><small class="hint">칸을 누르면 사연이 보여요 · 같은 물건을 세 번 건지면 한 줄 더</small></div>`;
      if (tab === 'key') body = `<div class="lampbox">${lamps}</div><small class="hint center">세 등불은 열쇠 기억을 누구에게 맡겼는지, 장 끝에 무엇을 골랐는지에 따라 밝아져요</small><div class="klist">${Object.entries(ST.KEYMEM).map(([id, K]) => { const w = st.keyMem[id]; return `<div class="kl ${w ? '' : 'no'}"><i class="lampdot" style="--c:${w ? ST.SIDES[ST.SIDE_OF[w]].color : '#3a4a52'}"></i><div><b>${w ? esc(K.name) : '???'}</b><small>${w ? `${K.ch}장 · ${esc(whoName(w))}에게 맡김` : `${K.ch}장에서`}</small></div></div>`; }).join('')}${Array.from({ length: ST.KEY_TOTAL - Object.keys(ST.KEYMEM).length }, (_, i) => `<div class="kl no"><i class="lampdot"></i><div><b>???</b><small>${4 + Math.floor(i / 2)}장에서 (다음 업데이트)</small></div></div>`).join('')}</div>`;
      if (tab === 'tape') body = `<div class="sec">녹음기 <small>${st.tapes.length}/9</small></div><div class="tlist">${Object.keys(M.TAPE).map(id => { const has = st.tapes.includes(id); return `<button class="tl ${has ? '' : 'no'}" data-t="${id}" ${has ? '' : 'disabled'}><b>${has ? esc(M.TAPE[id].who) : '???'}</b><small>${MAPS[Object.keys(ST.TAPES).find(m2 => ST.TAPES[m2].includes(id))].name}</small></button>`; }).join('')}</div>
        <div class="sec">벽 낙서 <small>${st.graf.length}/${Object.keys(M.GRAF).length * ST.GRAF_N}</small></div><div class="glist">${st.graf.length ? st.graf.map(g => { const [mp, i] = g.split(':'); return `<p>“${esc(M.GRAF[mp]?.[+i] || '')}”<small>${esc(MAPS[mp]?.name || '')}</small></p>`; }).join('') : '<small class="hint">판 안에서 반짝이는 낙서 위를 지나가면 기록돼요</small>'}</div>`;
      m.innerHTML = `<div class="sheet big"><div class="ch"><div><small class="kick">${seori ? '기록관 서리' : '곰방의 메모 — 사연은 기록관이 오면 더'}</small><h3>${seori ? '서리의 기록 도감' : '기억 조각'}</h3></div><button class="x" id="cxX">✕</button></div>
        <p class="cprog"><b>${found}</b> / ${ST.CODEX_KEYS.length}칸 · 은포가 ${found}칸만큼 덜 잊혔어요</p>
        <nav class="tabs ctabs">${[['memo', '기억 조각'], ['key', '열쇠 기억 · 세 등불'], ['tape', '녹음기 · 낙서']].map(([k, t]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${t}</button>`).join('')}</nav><div class="cbody">${body}</div></div>`;
      $('#cxX', m).onclick = () => { snd('ui'); m.remove(); if (this.ui.root.className === 'scr-hideout') this.ui.hideout(); };
      m.onclick = e => { if (e.target === m) $('#cxX', m).onclick(); };
      m.querySelectorAll('.ctabs button').forEach(b => b.onclick = () => { snd('ui'); tab = b.dataset.t; draw(); });
      m.querySelectorAll('.cc').forEach(b => b.onclick = () => { const k = b.dataset.k; const n = st.codex[k] || 0; const tx = M.MEMO[k] || [];
        m.querySelectorAll('.cc.sel').forEach(x => x.classList.remove('sel')); b.classList.add('sel');
        $('#cdet', m).innerHTML = n ? `<b>${esc(ITEMS[k].name)}</b><p>${esc(say(tx[0] || ''))}</p>${tx[1] ? (n >= 3 ? `<p class="m3">${esc(say(tx[1]))}</p>` : `<small class="hint">세 번 건지면 한 줄 더 · 지금 ${n}번</small>`) : ''}` : `<b>???</b><small class="hint">아직 건지지 못한 조각${ITEMS[k].map ? ` · ${MAPS[ITEMS[k].map].name}` : ''}</small>`; });
      m.querySelectorAll('.tl:not([disabled])').forEach(b => b.onclick = async () => { m.remove(); await this.playTape(b.dataset.t); this.close(); this.codex('tape'); });
    };
    draw();
  }

  /* ───── 설정 · 기록실 ───── */
  settings() {
    const st = S.story; const done = ST.BEATS.filter(b => st.beatsDone[b.id] && !b.tut);
    const m = h('div', 'modal st-keep', `<div class="sheet"><h3>설정</h3>
      <div class="setrow"><span>주인공 이름</span><b>${esc(getName())}</b><button class="btn sm" id="sName">바꾸기</button></div>
      <div class="sec">기록실 <small>본 이야기 다시 보기</small></div>
      <div class="rec"><button class="btn sm" id="sPro">처음 이야기 (프롤로그 · 첫날)</button>${done.map(b => `<button class="btn sm" data-b="${b.id}">${b.ch}장 · ${esc(b.name)}</button>`).join('')}</div>
      <div class="sbtns"><button class="btn" id="sHow">조작법</button><button class="btn" id="sX">닫기</button></div></div>`);
    $('#frame').appendChild(m); const close = () => { m.remove(); };
    $('#sX', m).onclick = () => { snd('ui'); close(); }; m.onclick = e => { if (e.target === m) close(); };
    $('#sHow', m).onclick = () => { close(); this.ui.howto(); };
    $('#sName', m).onclick = async () => { close(); await this.nameModal(false); if (this.ui.root.className === 'scr-hideout') this.ui.hideout(); this.settings(); };
    $('#sPro', m).onclick = () => { close(); this.replayIntro(); };
    m.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { close(); this.replayBeat(b.dataset.b); });
  }
  async replayIntro() {
    if (this.busy) return; this.busy = true; const t0 = await talk('t0');
    try { for (const sc of [t0.PROLOGUE, t0.SCENE1, t0.SCENE3, t0.SCENE4, t0.SCENE6]) await this.play(sc, { replay: true }); } finally { this.busy = false; this.close(); }
  }
  async replayBeat(id) {
    if (this.busy) return; this.busy = true; const b = ST.BEATS[ST.BEAT_IDX[id]]; const bt = await beatTalk(b);
    try { await this.play(bt.open, { replay: true }); if (bt.done) await this.play(bt.done, { replay: true }); } finally { this.busy = false; this.close(); }
  }

  /* 시험용: 하루가 지난 것처럼 (걸음 · 하루 끝 · 말 걸기 날짜를 어제로) */
  devNextDay() { const st = S.story; const y = '2000-01-01'; st.creditDay = y; for (const k of Object.keys(st.beatsDone)) if (st.beatsDone[k] !== 'old') st.beatsDone[k] = y; st.dayEnd = st.dayEnd ? y : null; st.talkDay = {}; S.day = y; save(); }
  /* ───── 판 연결 (main.js) ───── */
  raidStart(R) { this.raid.attach(R); }
  raidTick(dt) { this.raid.tick(dt); }
  raidEnd() { this.raid.detach(); }
  onLoot(c) { this.raid.onLoot(c); }
  afterRaid(res) { const so = ST.afterRaid(S, res, today()); res.story = so; return so; }
}
