// 이야기 화면 (DOM) — 대화(말풍선 · 선택지 · 상반신) · 컷신 · 이름 · 열쇠 기억 맡기기 · 기억 도감 · 설정/기록실 · 은신처 창 여섯 + 세 등불 · 결과 화면 이야기 칸
//  흐름: 은신처에 들어올 때마다 onHideout() — 튜토리얼 장면 → 녹음기 → 끝낸 걸음 장면 → 오늘의 장면(하루 한 걸음) → 하루 끝 인사
//  대사 글은 talk/*.js 를 필요할 때 받음 (첫 진입 용량에 안 들어감) · 소리는 sfx 이름만 부름(audio.js 는 오디오 세션 몫 — 없는 이름이면 조용히 넘어감)
import { S, save, today } from './save.js?v=0.99.19';
import * as ST from './story.js?v=0.99.19';
import * as B from './board.js?v=0.99.19';
import { frac } from './chips.js?v=0.99.19'; /* '가진 / 필요' 공통 (검수 M3 Top 2) */
import { ITEMS, QUESTS, MAPS, FACILITIES, MATS } from './data.js?v=0.99.19';
import { COS } from './look.js?v=0.99.19';
import { A } from './assets.js?v=0.99.19';
import { sfx, unlock, setScore } from './audio.js?v=0.99.19'; /* M5-A setScore: 엔딩 · 크레딧 배경음 */
import { shakeLabel, cycleShake } from './fx.js?v=0.99.19'; /* 설정 '화면 흔들림' (v0.6.1 손맛 · 검수 M3 Top 5) */
import { StoryRaid } from './story_raid.js?v=0.99.19';
import { NpcHome } from './npc_home.js?v=0.99.19';
import { ART } from './talk/art.js?v=0.99.19';   /* 있는 그림 목록 (tools/artlist.mjs 가 만듦 — 없는 그림은 안 받음 → 404 없음) */
import * as A11Y from './a11y.js?v=0.99.19'; /* M6-C 접근성 설정 줄 */

const Q = new URLSearchParams(location.search);
/* M5-A 6장 · 엔딩 화면 모양 (story_m5a.css — 공용 style.css 와 따로) */
if (typeof document !== 'undefined' && !document.getElementById('cssM5a')) { const l = document.createElement('link'); l.id = 'cssM5a'; l.rel = 'stylesheet'; l.href = new URL('./story_m5a.css', import.meta.url).href; document.head.appendChild(l); }
const snd = (n, ...a) => { try { sfx[n]?.(...a); } catch { /* */ } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const wait = ms => new Promise(r => setTimeout(r, ms));
const $ = (s, r = document) => r.querySelector(s);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

/* ───── 대사 파일 나눠 받기 ───── */
const FILES = { t0: () => import('./talk/t0.js?v=0.99.19'), t1: () => import('./talk/t1.js?v=0.99.19'), t2: () => import('./talk/t2.js?v=0.99.19'), t3: () => import('./talk/t3.js?v=0.99.19'), t4: () => import('./talk/t4.js?v=0.99.19'), t5: () => import('./talk/t5.js?v=0.99.19'), t6: () => import('./talk/t6.js?v=0.99.19'), common: () => import('./talk/common.js?v=0.99.19'), memo: () => import('./talk/memo.js?v=0.99.19') };
const cache = {}, got = {};
export function talk(k) { return (cache[k] ||= FILES[k]().then(m => (got[k] = m))); }
export const T = got;
export const CH_MAX = 6; /* 대사 파일이 있는 마지막 장 (M5-A 6장 · 엔딩) */
const tk = ch => 't' + Math.min(CH_MAX, ch);
const beatTalk = async b => (await talk(tk(b.ch))).BEAT[b.id] || {};

/* ───── 이름 (기기에만) ───── */
let memName = null;
export function getName() { try { const v = localStorage.getItem(ST.NAME_KEY); if (v) return ST.cleanName(v); } catch { /* */ } return memName || ST.NAME_DEFAULT; }
export function setName(n) { memName = ST.cleanName(n); try { localStorage.setItem(ST.NAME_KEY, memName); } catch { /* */ } }
const say = t => ST.say(t, getName());
const rwTxt = r => Object.entries(r || {}).map(([k, n]) => k === 'shells' ? `조개 ${n}` : k === 'cos' ? `꾸미기 ${COS[n]?.name || ''}` : k === 'rebuild' ? `은포 되살리기 +${n}` : `${MATS[k]?.name || ITEMS[k]?.name || k} ${n}`).join(' · ');

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
  anchor: '<circle cx="50" cy="26" r="7" fill="none" stroke="#2a2c31" stroke-width="5"/><path d="M50 33v46M34 46h32M22 62q4 18 28 18q24 0 28-18" fill="none" stroke="#2a2c31" stroke-width="7" stroke-linecap="round"/>',
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
    if (s.fx === 'title') { if (this.skipping) return; if (s.soon === 'nomap' && !ST.waitsMap(S, ST.BEATS.find(b => b.ch === s.ch))) return; /* 3장 끝: 공장 지도가 아직 없을 때만 '다음 업데이트' */ snd('chapter'); await this.title(s.ch, !!s.soon); return; }
    if (s.fx === 'soon') { if (this.skipping) return; snd('chapter'); await this.showCard(`<small class="kick">이어지는 이야기</small><b>${esc(s.txt)}</b>`, 0, true); return; }
    if (s.fx === 'tomorrow') { if (this.skipping) return; await this.showCard(`<small class="kick">내일</small><b>${esc(s.txt.replace(/^내일:\s*/, ''))}</b>`, 0, true); if (!R) { st.tomorrow = s.txt; save(); } return; }
    if (s.fx === 'pulse') { if (!R) this.story.pulse = s.sel; return; }
    if (s.fx === 'codex') { if (!R) { st.flags.codexNew = 1; save(); } return; }
    if (s.fx === 'quest') { if (!R) this.story.wantTab = 'quest'; return; }
    if (s.fx === 'windows') { if (this.skipping) return; document.querySelector('.post')?.classList.add('hl'); return; }
    if (s.fx === 'ending') { this.skipping = false; if (R) { await this.story.playEnding(st.ending || ST.endingChoices(S)[0], this); return; } await this.story.endingPick(this); return; } /* M5-A 엔딩 고르기 → 엔딩 → 크레딧 */
    if (s.fx === 'deep') { if (this.skipping || R) return; const ok = await import('./abyss.js?v=0.99.19').then(m => { m.markEnding?.(S, st.ending); save(); return true; }).catch(() => false); /* M5-B 깊은 물 훅 */
      if (ok) await this.showCard(`<small class="kick">엔딩 뒤 도전</small><b>깊은 물이 열렸어요</b><p>대수문 안쪽 · 출격 준비에서 켜고 끌 수 있어요</p>`, 0, true); return; }
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

/* M5-A 엔딩 뒤 초소 꾸밈 — 닫힌 수문: 곰방 상회 간판 · 진흙 장화 / 물 위의 등불: 축제 등롱 줄 / 기억의 바다: 반환 상자 더미 · 작은 배
 *  되살리기 수(S.story.rebuild — 기부 · 반환 의뢰)만큼 등불 · 창 · 상자가 늘어남 (최대 30) */
function endDeco(k, rb) {
  const n = Math.min(30, rb), lit = 3 + Math.floor(n / 3); const E = ST.ENDINGS[k];
  let art = '';
  if (k === 'land') art = `<svg viewBox="0 0 220 64" aria-hidden="true"><path d="M20 6h180" stroke="#6a4a2a" stroke-width="3"/><path d="M60 6v10M160 6v10" stroke="#6a4a2a" stroke-width="2"/><rect x="48" y="16" width="124" height="30" rx="4" fill="#3d6fb0" stroke="#22406a" stroke-width="2"/><text x="110" y="37" text-anchor="middle" font-size="15" font-weight="800" fill="#f2f0e6">곰방 상회</text>${Array.from({ length: Math.min(10, lit) }, (_, i) => `<circle cx="${14 + i * 21}" cy="58" r="3" fill="#ffc861" opacity=".9"/>`).join('')}</svg>`;
  else if (k === 'lamp') art = `<svg viewBox="0 0 220 64" aria-hidden="true"><path d="M4 8 Q110 40 216 8" fill="none" stroke="#3a2a1a" stroke-width="1.5"/>${Array.from({ length: Math.min(13, lit) }, (_, i) => { const t = (i + 0.5) / 13, x = 4 + 212 * t, y = 8 + 64 * t * (1 - t); return `<g><path d="M${x} ${y}v4" stroke="#3a2a1a"/><ellipse cx="${x}" cy="${y + 10}" rx="6" ry="7.5" fill="${i % 3 ? '#ff9a4a' : '#ffc861'}"/><ellipse cx="${x}" cy="${y + 10}" rx="9" ry="10" fill="#ffc861" opacity=".18"/></g>`; }).join('')}</svg>`;
  else art = `<svg viewBox="0 0 220 64" aria-hidden="true"><path d="M150 52h56l-8 9h-40z" fill="#6a4a2a"/><path d="M178 52V28l16 20z" fill="#e8dcc4"/>${Array.from({ length: Math.min(12, lit) }, (_, i) => { const x = 10 + (i % 6) * 22, y = 44 - Math.floor(i / 6) * 17; return `<g><rect x="${x}" y="${y}" width="19" height="15" rx="2" fill="#b98a52" stroke="#6a4a2a"/><path d="M${x + 9.5} ${y}v15" stroke="#c8452f" stroke-width="2"/></g>`; }).join('')}</svg>`;
  return h('div', `enddeco end-${k}`, `${art}<small>${esc(E.name)} · 은포 되살리기 ${n}/30</small>`);
}
/* ───── 이야기 전체 ───── */
export class Story {
  constructor(app, ui) {
    this.app = app; this.ui = ui; this.player = new Player(this); this.busy = false;
    this.on = !(Q.has('bot') || ((Q.has('free') || Q.has('nostory')) && !Q.has('story')));
    this.raid = new StoryRaid(app, this);
    this.home = new NpcHome(app, this);   /* v0.6 은신처 인물 3D (M3-C) */
    this.ST = ST; this.B = B;   /* 시험 훅 (storytest) */
    /* 첫 진입 뒤 조용히 받아 둠 (은신처 대사 · 도감) */
    setTimeout(() => { talk('common'); talk('memo'); const ch = ST.chapter(S); talk(tk(ch)); if (S.story.tut < 4) talk('t0'); }, 1200);
  }
  ctx(f) { const st = S.story; if (f === 'metBaram') return st.met.includes('baram'); if (f === 'hasBandi') return !!S.pets?.bandi; /* M5-C 두 번째 반려 */ return !!st.flags[f]; }
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
      this.boardTick(d);
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
        played = true; ST.startBeat(S, b, d); save(); if (b.opens) this.app.preloadMaps?.(); /* M5-A 대수문 꼭대기 묶음 미리 받기 */ const bt = await beatTalk(b);
        await this.play(bt.open);
        if (b.goal) { this.wantTab = 'quest'; snd('quest'); }
        if (b.last && !st.beatsDone[b.id]) ST.finishBeat(S, b, d, false);
        save();
      }
      this.boardTick(d);
      /* 하루 끝 인사 */
      if (stillHome() && ST.dayEndDue(S, d)) { played = true; await this.dayEnd(C, d); }
    } catch (e) { console.warn('이야기', e); }
    finally {
      this.busy = false; if (this.player.el) this.close();
      if (played && stillHome()) { if (this.wantTab) { ui.tab = this.wantTab; this.wantTab = null; } ui.hideout(); }
    }
  }
  /* 판 의뢰: 은신처에서 끝나는 것 (시설 · 무기 · 도감 · 이야기 걸음 · 지도 열기) */
  boardTick(d) { const bq = B.boardTick(S, d); if (!bq.length) return; save(); this.ui.questDone(bq); if (bq.some(q => q.map)) this.app.preloadMaps?.(); }
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
    await this.play([{ cut: 'cut_night', tone: 'night' }, [w, (st.ending && C.DAYEND_END?.[st.ending]?.[w]) || C.DAYEND[w]], { fx: 'tomorrow', txt: tease }]); /* M5-A 엔딩 뒤 인사 */
  }

  /* ───── M5-A 엔딩: 파수의 질문 → 열린 길 고르기(가장 밝은 등불 맨 위) → 엔딩 컷 · 글 → 크레딧 ───── */
  async endingPick(P) {
    const opts = ST.endingChoices(S); const top = ST.brightest(S); P.box.classList.add('hide'); P.skipping = false;
    /* M6-A: 은신처 위 모달 → 전체 화면 장면 — 대수문 꼭대기(cut_6_3 흐림 + 렌즈 빛 · 떠오르는 이름표 빛) · 위 '지시를 바랍니다' · 바닥에 세 등불이 하나씩 올라옴
     *  열린 길만 누를 수 있음(.endto button[data-k]) · 아직 어두운 등불은 꺼진 채 놓여 '세 등불이 더 밝으면' */
    const bg = artUrl('cut_6_3');
    const lamp = k => { const E = ST.ENDINGS[k], C = ST.SIDES[k]; const on = opts.includes(k);
      const art = `<svg class="eslamp" viewBox="0 0 60 84" aria-hidden="true"><path d="M30 2v8" stroke="#3a2a1a" stroke-width="2.5"/><path d="M22 10h16l-2 6H24z" fill="#4a3522"/><path d="M18 18h24l4 44H14z" fill="${on ? C.color : '#3b4650'}" opacity="${on ? 0.32 : 0.5}"/><path d="M18 18h24l4 44H14z" fill="none" stroke="#4a3522" stroke-width="2.5"/><path d="M30 18v44M16 40h28" stroke="#4a3522" stroke-width="1.6" opacity=".7"/><ellipse class="flame" cx="30" cy="44" rx="6" ry="9" fill="${on ? C.color : '#55606a'}"/><ellipse cx="30" cy="46" rx="2.6" ry="4" fill="${on ? '#fff6e0' : '#6a747c'}"/><path d="M12 62h36l-3 8H15z" fill="#4a3522"/></svg>`;
      return on ? `<button data-k="${k}" class="esl${k === top && opts.length > 1 ? ' top' : ''}" style="--c:${C.color}">${art}<b>「${esc(E.name)}」</b><span>${esc(say(E.say))}</span><small>${esc(E.pasu)}${k === top && opts.length > 1 ? '<br>가장 밝은 등불' : ''}</small></button>`
        : `<div class="esl off" style="--c:${C.color}">${art}<b>「${esc(E.name)}」</b><span>아직 어두운 등불</span><small>${esc(C.name)}의 등불이 더 밝으면</small></div>`; };
    const el = h('div', 'endscene st-keep', `<div class="es-bg"${bg ? ` style="background-image:url(${bg})"` : ''}></div><i class="es-lens"></i><div class="es-motes">${Array.from({ length: 14 }, (_, i) => `<i style="left:${4 + (i * 37) % 92}%;animation-delay:${-(i * 1.9) % 9}s;animation-duration:${8 + (i * 5) % 6}s"></i>`).join('')}</div>
      <header class="es-top"><small>파수 · 보관 중 412,880점 · 주인 미확인</small><b>지시를 바랍니다</b></header>
      <div class="es-floor"><div class="endto">${Object.keys(ST.ENDINGS).map(lamp).join('')}</div>
        <small class="es-hint">${opts.length < 3 ? '어두운 등불은 이야기 선택으로 밝아져요 · ' : ''}엔딩 뒤 기록실에서 다른 길도 볼 수 있어요</small></div>`);
    P.el.appendChild(el); P.el.classList.add('ending'); snd('lamp');
    const k = await new Promise(res => { let picked = false;
      el.querySelectorAll('.endto button').forEach(b => b.onclick = e => { e.stopPropagation(); if (picked) return; picked = true; unlock(); snd('ui'); snd('lamp'); b.classList.add('pick'); el.classList.add('picked'); setTimeout(() => res(b.dataset.k), 650); }); });
    el.classList.add('out'); setTimeout(() => el.remove(), 420); P.el?.classList.remove('ending'); P.box.classList.remove('hide');
    this.chooseEnding(k); await this.playEnding(k, P);
  }
  /* 고른 길 기록 (처음이면 ended · 본 길 모음 · 깊은 물 훅) — 기록실 '마지막 선택 다시' 도 여기 */
  chooseEnding(k) {
    const st = S.story; ST.setEnding(S, k, today()); for (const x of Object.keys(ST.ENDINGS)) delete st.flags['end_' + x]; st.flags['end_' + k] = 1; this.lampFlash = k; save();
    import('./abyss.js?v=0.99.19').then(m => { m.markEnding?.(S, k); save(); }).catch(() => {}); /* M5-B 깊은 물 (없으면 조용히 — abyss.endingSeen 이 S.story.ending 을 봄) */
  }
  async playEnding(k, P) {
    const T6 = await talk('t6'); try { setScore?.('ending'); } catch { /* */ }
    for (const c of ['end_a_1', 'end_a_2', 'end_a_3', 'end_b_1', 'end_b_2', 'end_b_3', 'end_c_1', 'end_c_2', 'end_c_3', 'end_last']) if (c.includes('_' + k[0] + '_') || c === 'end_last') { const u = artUrl(c); if (u) { const im = new Image(); im.src = u; } }
    P.skipping = false; await P.run(T6.ENDINGS[k] || []); P.skipping = false;
    await this.credits(P, k, T6); try { setScore?.(null); } catch { /* */ }
  }
  /* 크레딧: 마지막 컷 위로 천천히 올라감 · 누르면 빨리 · 끝 = 세 엔딩 공통 한 줄 */
  credits(P, k, T6) {
    const E = ST.ENDINGS[k]; P.box.classList.add('hide');
    /* M6-A: 글이 올라오는 창(.crview — 위 · 아래가 흐려짐)과 넘김 안내 자리를 나눔 · 안내는 1.5초 뒤 나타나 3초 뒤 사라짐 · 크레딧 동안 '건너뛰기' 숨김(두 번 누르면 넘김) */
    const el = h('div', 'credits st-keep', `<div class="crview" data-lc="roll"><div class="crroll">${[[`엔딩 · ${E.name}`, [E.txt]], ...T6.CREDITS].map(([t, L]) => `<section><small>${esc(say(t))}</small>${L.map(x => `<p>${esc(say(x))}</p>`).join('')}</section>`).join('')}<section class="crlast"><b>${esc(T6.END_LINE)}</b></section></div></div><small class="crtap">누르면 빨리 · 두 번 누르면 넘김</small>`);
    P.el.appendChild(el); P.el.classList.add('crediting'); snd('chapter'); const tip = el.querySelector('.crtap'); const t1 = setTimeout(() => tip.classList.add('on'), 1500), t2 = setTimeout(() => tip.classList.remove('on'), 4500);
    return new Promise(res => { const roll = el.querySelector('.crroll'); let y = 0, sp = 62, taps = 0, last = performance.now(), done = false; const H = () => roll.scrollHeight + roll.parentNode.clientHeight * 0.45;
      const end = () => { if (done) return; done = true; clearTimeout(t1); clearTimeout(t2); el.classList.add('out'); setTimeout(() => { el.remove(); P.el?.classList.remove('crediting'); P.box.classList.remove('hide'); res(); }, 400); };
      el.onpointerdown = e => { e.stopPropagation(); taps++; sp = taps >= 2 ? 1e4 : 220; };
      const f = now => { if (done) return; const dt = Math.min(0.1, (now - last) / 1000); last = now; y += sp * dt; roll.style.transform = `translateY(${-y}px)`; if (y > H()) { setTimeout(end, taps >= 2 ? 0 : 2200); return; } requestAnimationFrame(f); };
      roll.style.transform = 'translateY(0)'; requestAnimationFrame(f); });
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
    if (st.ending) post.appendChild(endDeco(st.ending, st.rebuild || 0)); /* M5-A 엔딩 뒤 초소 꾸밈 (고른 길 · 은포 되살리기 수만큼 불) */
    const cx = h('button', 'wardpill codexpill', `${st.joined.includes('seori') ? '기록 도감' : '기억 조각'}${st.flags.codexNew ? '<i class="dot"></i>' : ''}`); cx.id = 'codexBtn';
    cx.onclick = () => { unlock(); snd('ui'); this.codex(); }; sp.appendChild(cx);
    if (this.pulse) { $(this.pulse, el)?.classList.add('pulse'); if (st.tut >= 4) this.pulse = null; }
    const how = $('#how', el); if (how) { how.textContent = '설정'; how.onclick = () => this.settings(); }
    /* 인물 의뢰 납품 (의뢰 탭 카드 — 탭 내용은 나중에 그려지므로 위임) */
    el.addEventListener('click', e => { const b = e.target.closest('[data-bq]'); if (!b) return; e.stopPropagation(); unlock();
      const r = B.boardDeliver(S, b.dataset.bq, today()); if (!r.ok) { snd('empty'); this.ui.toast('아직 모자라요', 'soft'); return; }
      save(); this.ui.questDone([r.q]); const t = got.common?.QTALK[r.q.id]; if (t?.done && ST.present(S, r.q.giver)) setTimeout(() => this.ui.toast(`${whoName(r.q.giver)}: ${say(t.done)}`, 'good'), 900); this.ui.hideout(); });
    if (B.deliverReady(S, d)) { const qt = el.querySelector('.tabs button[data-t="quest"]'); if (qt && !qt.querySelector('.dot')) qt.insertAdjacentHTML('beforeend', '<i class="dot"></i>'); }
    this.home?.sync(el);
  }
  /* M6-A: 지금 할 수 있는 이야기 · 인물 · 매일 의뢰 수 (은신처 의뢰 칩 — 본 사슬이 끝난 뒤) */
  openCount() { const b = ST.openBeat(S); return (b?.goal ? 1 : 0) + B.active(S, today()).length; }
  /* 의뢰 탭 위: 이야기 의뢰 카드 + 인물 의뢰(판 의뢰) */
  questHtml() { return this.beatHtml() + this.boardHtml(); }
  beatHtml() {
    const st = S.story; const b = ST.openBeat(S); const bt = b && got[tk(b.ch)]?.BEAT[b.id];
    if (b?.goal) return `<div class="qcard story"><small>이야기 의뢰 · ${b.ch}장 「${esc(ST.CHAPTERS[b.ch].name)}」${b.goal.map ? ` · ${MAPS[b.goal.map].icon} ${MAPS[b.goal.map].name}` : ''}</small><h3>${esc(b.name)}</h3>
      ${bt?.ask && ST.present(S, b.giver) ? `<div class="giver">${portrait(b.giver)}<p><b>${esc(whoName(b.giver))}</b> ${esc(say(bt.ask))}</p></div>` : ''}<p>${esc(b.txt || '')}</p>${this.goalExtra(b)}${b.reward ? '<small class="hint">보상: 은신처에서 이야기와 함께</small>' : ''}</div>`;
    if (st.tut < 4) return '';
    const nx = ST.beatNow(S); const last = ST.BEATS[ST.BEATS.length - 1].ch;
    if (!nx) return st.ending ? `<div class="note good st-note">엔딩 「${esc(ST.ENDINGS[st.ending].name)}」까지 봤어요 · 설정 → 기록실에서 다른 길도 볼 수 있어요</div>` : `<div class="note good st-note">${last}장까지 모두 봤어요.</div>`;
    if (ST.waitsMap(S, nx)) return `<div class="note good st-note">이야기 1~${nx.ch - 1}장을 모두 봤어요. ${nx.ch}장 「${esc(ST.CHAPTERS[nx.ch].name)}」은 다음 업데이트에서.</div>`;
    const qn = nx.need?.q && B.QBY[nx.need.q]?.name; const wait = qn && !S.quests.done.includes(nx.need.q) ? `의뢰 '${qn}'${ST.say('{name:을/를}', qn).slice(qn.length)} 끝내면` : '내일';
    return `<div class="note st-note">다음 이야기: <b>${wait}</b> 열려요 · 은포는 하루에 조금씩 열려요</div>`;
  }
  /* M5-A 걸음 카드 진행: 마지막 인양(남은 지도) · 시설 끝 단계 */
  goalExtra(b) {
    const g = b.goal; if (!g) return '';
    if (g.t === 'pieces') { const got = ST.piecesGot(S).length, left = ST.piecesLeft(S); return `<div class="qbar"><i style="width:${(got / 5 * 100).toFixed(0)}%"></i><span>${frac(got, 5, false)}</span></div>${left.length ? `<small class="hint">남은 지도: ${left.map(m => `${MAPS[m].icon} ${esc(MAPS[m].short)}`).join(' · ')}</small>` : ''}`; }
    if (g.t === 'fac') { const n = ST.facNeed(g), cur = Math.min(n, S.fac?.[g.k] || 0); return `<div class="qbar"><i style="width:${(cur / n * 100).toFixed(0)}%"></i><span>${frac(cur, n, false)}</span></div><small class="hint">${esc(FACILITIES[g.k]?.name || '')} — 시설 탭</small>`; }
    return '';
  }
  /* 인물 의뢰 — 와 있는 인물이 주는 의뢰 (앞에서 4개 + 매주 납품) · 납품 버튼은 decorate 의 위임 클릭 */
  boardHtml() {
    const d = today(); const C = got.common; const act = B.active(S, d); const wait = B.waiting(S, d); if (!act.length) return '';
    if (!C) talk('common').then(() => { if (this.ui.root.className === 'scr-hideout' && this.ui.tab === 'quest' && !this.busy) this.ui.hideout(); }); /* 대사 파일이 아직이면 받은 뒤 다시 */
    const kind = { char: '인물', boss: '보스', chal: '도전', repeat: '매주', story: '이야기' }; const kindOf = q => q.repeat === 'day' ? '매일' : kind[q.kind] || '';
    const card = q => { const p = B.progress(S, q); const t = C?.QTALK[q.id]; const g = q.goal; const ready = B.BUTTON.has(g.t) && p.cur >= p.n;
      const map = g.map && MAPS[g.map] ? ` · ${MAPS[g.map].icon} ${esc(MAPS[g.map].name)}` : '';
      return `<div class="bq k-${q.kind}" data-q="${q.id}">${portrait(q.giver, 'sm')}<div class="bqb"><small class="bk">${kindOf(q)}${map}</small><b class="bn">${esc(q.name)}</b>${t?.give ? `<p class="bl">${esc(say(t.give))}</p>` : ''}<p class="bt">${esc(q.txt)}</p>
        ${p.n > 1 ? `<div class="qbar"><i style="width:${(p.cur / p.n * 100).toFixed(0)}%"></i><span>${frac(p.cur, p.n, B.BUTTON.has(g.t))}</span></div>` : ''}<small class="brw">보상 ${esc(rwTxt(q.reward))}</small>${g.t === 'deliver' ? `<button class="btn sm bdel ${ready ? '' : 'dim'}" data-bq="${q.id}">납품하기</button>` : g.t === 'pay' ? `<button class="btn sm bdel bpay ${ready ? '' : 'dim'}" data-bq="${q.id}">조개 ${g.n.toLocaleString()} 내기</button>` : ''}</div></div>`; };
    const once = act.filter(q => !q.repeat), rep = act.filter(q => q.repeat === true), day = act.filter(q => q.repeat === 'day'); /* M5-A 매일 */
    return `<div class="bqs">${once.length ? `<div class="sec">인물 의뢰 <small>${once.length}${wait ? ` · 다음 차례 ${wait}` : ''}</small></div>${once.map(card).join('')}` : ''}${day.length ? `<div class="sec">오늘의 부탁 <small>매일 다시</small></div>${day.map(card).join('')}` : ''}${rep.length ? `<div class="sec">이번 주 납품 <small>매주 월요일 다시</small></div>${rep.map(card).join('')}` : ''}</div>`;
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
    for (const q of [...(res.quests || []), ...(so.board || []).map(id => B.QBY[id]).filter(Boolean)]) {
      const t = C?.QTALK[q.id]; const v = ST.giverVoice(S, q.giver); const line = t && !(so.tut === 1 && q.id === 'q1') ? (v.relay ? (C.QRELAY?.done || '').replace('{role}', v.relay) : t.done) : '';
      const extra = `${q.unlock ? FACILITIES[q.unlock].name + ' 해금! ' : ''}${q.map ? `새 지도 ${MAPS[q.map].name}! ` : ''}`;
      out.push(`<div class="card st-gold ${q.kind === 'story' ? 'sg-story' : ''}">${portrait(v.id, 'sm')}<div><small class="kick">의뢰 완료${extra ? ' · ' + esc(extra.trim()) : ''}</small><b class="gt">${esc(q.name)}</b>${line ? `<p><b>${esc(whoName(v.id))}</b> ${esc(say(line))}</p>` : '<p>보상을 받았어요</p>'}${t?.lore ? `<small class="lore">이야기 조각 · ${esc(say(t.lore))}</small>` : ''}</div></div>`);
    }
    if (so.beatDone) { const b = ST.BEATS[ST.BEAT_IDX[so.beatDone]]; out.push(`<div class="card st-gold sg-story sg-beat">${portrait(ST.present(S, b.giver) ? b.giver : 'gombang', 'sm')}<div><small class="kick">이야기 의뢰 완료 · ${b.ch}장 「${esc(ST.CHAPTERS[b.ch].name)}」</small><b class="gt">${esc(b.name)}</b><p>은신처에서 이야기가 이어져요</p></div></div>`); }
    if (so.pieces?.length) { const got = ST.piecesGot(S).length; out.push(`<div class="card st-gold sg-story">${portrait('gombang', 'sm')}<div><small class="kick">6장 「대수문」 · 마지막 인양</small><b class="gt">${so.pieces.map(k => esc(ITEMS[k]?.name || '')).join(' · ')}</b><p>마지막 조각 ${got}/5 — ${got >= 5 ? '다 모였어요! 은신처에서' : '남은 지도에서 하나씩'}</p></div></div>`); } /* M5-A */
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
    if (this.busy) return; this.busy = true; const C = await talk('common'); const st = S.story; const d = today(); const pool = [...(C.SMALL[who] || []), ...(C.SMALL_END?.[who] || [])]; /* M5-A 6장 · 엔딩 뒤 */
    const ok = (t) => (!t.rel || (st.rel[who] || 0) >= t.rel) && (!t.ch || ST.chapter(S) >= t.ch) && (!t.beat || st.beatsDone[t.beat]) && (!t.end || st.ending === t.end);
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
      if (tab === 'key') body = `<div class="lampbox">${lamps}</div><small class="hint center">세 등불은 열쇠 기억을 누구에게 맡겼는지, 장 끝에 무엇을 골랐는지에 따라 밝아져요</small>${this.endingHtml()}<div class="klist">${Object.entries(ST.KEYMEM).map(([id, K]) => { const w = st.keyMem[id]; return `<div class="kl ${w ? '' : 'no'}"><i class="lampdot" style="--c:${w ? ST.SIDES[ST.SIDE_OF[w]].color : '#3a4a52'}"></i><div><b>${w ? esc(K.name) : '???'}</b><small>${w ? `${K.ch}장 · ${esc(whoName(w))}에게 맡김` : `${K.ch}장에서`}</small></div></div>`; }).join('')}${Array.from({ length: ST.KEY_TOTAL - Object.keys(ST.KEYMEM).length }, (_, i) => `<div class="kl no"><i class="lampdot"></i><div><b>???</b><small>${4 + Math.floor(i / 2)}장에서 (다음 업데이트)</small></div></div>`).join('')}</div>`;
      if (tab === 'tape') body = `<div class="sec">녹음기 <small>${st.tapes.length}/${ST.TAPE_N}</small></div><div class="tlist">${Object.keys(M.TAPE).map(id => { const has = st.tapes.includes(id); return `<button class="tl ${has ? '' : 'no'}" data-t="${id}" ${has ? '' : 'disabled'}><b>${has ? esc(M.TAPE[id].who) : '???'}</b><small>${MAPS[Object.keys(ST.TAPES).find(m2 => ST.TAPES[m2].includes(id))]?.name || ''}</small></button>`; }).join('')}</div>
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

  /* 세 등불 → 엔딩 (6장 끝에서 문턱을 넘은 등불의 엔딩이 모두 선택지로 — 숫자 없이 문장으로만) */
  endingHtml() {
    const top = ST.brightest(S); const open = ST.endingsOpen(S);
    if (!top) return '<p class="endl">아직 어느 등불도 밝지 않아요. 열쇠 기억을 맡기면 그 사람 쪽 등불이 밝아져요.</p>';
    const E = ST.ENDINGS; return `<p class="endl">지금 가장 밝은 등불: <b style="color:${ST.SIDES[top].color}">${ST.SIDES[top].name}</b> — 이대로라면 끝에 「${esc(E[top].name)}」의 길이 열려 있어요.${open.length > 1 ? ` 다른 길도 ${open.length - 1}개 열려 있어요.` : ''}</p>`;
  }
  /* ───── 설정 · 기록실 ───── */
  settings() {
    const st = S.story; const done = ST.BEATS.filter(b => st.beatsDone[b.id] && !b.tut);
    const m = h('div', 'modal st-keep', `<div class="sheet"><h3>설정</h3>
      <div class="setrow"><span>주인공 이름</span><b>${esc(getName())}</b><button class="btn sm" id="sName">바꾸기</button></div>
      <div class="sec">보기 · 소리 · 손 <small>바꾸면 바로 · 이 기기에 기억</small></div>${A11Y.settingsHtml()}
      <div class="sec">기록실 <small>본 이야기 다시 보기</small></div>
      <div class="rec"><button class="btn sm" id="sPro">처음 이야기 (프롤로그 · 첫날)</button>${done.map(b => `<button class="btn sm" data-b="${b.id}">${b.ch}장 · ${esc(b.name)}</button>`).join('')}${st.ending ? `<button class="btn sm endre" id="sEnd">마지막 선택 다시 · 다른 길 (본 길 ${Object.keys(st.endings).length}/3)</button>` : ''}</div>
      <div class="sbtns"><button class="btn" id="sHow">조작법</button><button class="btn" id="sX">닫기</button></div></div>`);
    $('#frame').appendChild(m); const close = () => { m.remove(); };
    $('#sX', m).onclick = () => { snd('ui'); close(); }; m.onclick = e => { if (e.target === m) close(); };
    $('#sHow', m).onclick = () => { close(); this.ui.howto(); };
    A11Y.bindSettings(m); /* M6-C 접근성: 글자 크기 3단 · 색약 보조 · 소리 크기 셋 · 진동 · 흔들림 3단 (a11y.js) */
    $('#sName', m).onclick = async () => { close(); await this.nameModal(false); if (this.ui.root.className === 'scr-hideout') this.ui.hideout(); this.settings(); };
    $('#sPro', m).onclick = () => { close(); this.replayIntro(); };
    m.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { close(); this.replayBeat(b.dataset.b); });
    $('#sEnd', m) && ($('#sEnd', m).onclick = () => { close(); this.replayEnding(); });
  }
  async replayIntro() {
    if (this.busy) return; this.busy = true; const t0 = await talk('t0');
    try { for (const sc of [t0.PROLOGUE, t0.SCENE1, t0.SCENE3, t0.SCENE4, t0.SCENE6]) await this.play(sc, { replay: true }); } finally { this.busy = false; this.close(); }
  }
  /* M5-A 기록실: 마지막 선택 다시 — 열린 길 중 다시 고름(본 길이 늘면 q120) · 장비 · 시설 그대로 */
  async replayEnding() {
    if (this.busy) return; this.busy = true; const P = this.player;
    try { await this.play([{ cut: 'cut_6_3', fb: 'cut_night', tone: 'amber' }, ['p', '보관 중 412,880점. 지시를 바랍니다.'], { cut: null }, { fx: 'ending' }]); } finally { this.busy = false; this.close(); if (this.ui.root.className === 'scr-hideout') this.ui.hideout(); }
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
  afterRaid(res) { const d = today(); const bq = B.boardRaid(S, res, d); const so = ST.afterRaid(S, res, d); so.board = bq.map(q => q.id); res.story = so; return so; }
}
