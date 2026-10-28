// 화면: 타이틀 · 로비 · 모험(스테이지) · 영웅(장비) · 스킬 · 상점 · 무한의 탑 · 황금 동굴 · 미션 · 출석 · 설정 · 결과 · 일시정지 · 부활
import { E, setQuality } from './engine.js?v=0.86.0';
import { icons } from './icons.js?v=0.86.0';
import { buildLobby, leaveLobby, setView, heroPose, L } from './lobby.js?v=0.86.0';
import { Battle } from './battle.js?v=0.86.0';
import { sfx, music, setAudio } from './audio.js?v=0.86.0';
import { STAGES, CHAPTERS, SKILLS, SKILL_SLOTS, SLOTS, RARITY, STAT_NAME, STAMINA, MAX_ENH, MAX_SKILL, enhCost, enhRate, skillCost, expNeed, towerFloor, DAILY, dailyStage, MOBS, HERO } from './data.js?v=0.86.0';
import { G, loadSave, save, tick, staminaNext, useStamina, heroStats, power, itemStat, itemName, itemScore, rollItem, addItem, equip, sell, salvage, enhance, skillUp, stageOpen, totalStars, addExp,
  MISSIONS, mission, missionReady, claimMission, ATTEND, attendReady, claimAttend, resetSave } from './state.js?v=0.86.0';
import { STORY } from './story.js?v=0.86.0';
import { inOAD, exitToOAD, pushBack, installBack } from './oad.js?v=0.86.0';
import { bm, OAD, bmInit, price, track, adLeft, adReady, watchAd, adLabel, pay, failMsg, SKINS, skinOwned, curSkin, noteStage, helpCheck, helpUsed, HELP } from './bmx.js?v=0.86.0';
import { lobbySkin } from './lobby.js?v=0.86.0';

const ui = document.getElementById('ui'), md = document.getElementById('modal'), bootEl = document.getElementById('boot'), bar = document.getElementById('bootbar');
const fmt = n => Math.round(n).toLocaleString('en-US'), K = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : fmt(n);
let cur = 'home', battle = null, lastStage = null, pendingStory = null;
/* 결과 화면 다음에 볼 이야기가 있으면 먼저 보여 주고 이어서 */
const after = f => () => { sfx('tap'); if (pendingStory) { const k = pendingStory; pendingStory = null; story(k, f); } else f(); };
const I = {
  /* 은화 (게임 재화 — 원어데이 골드와 다름, 저장 필드 이름은 gold 그대로) */
  gold: '<svg viewBox="0 0 24 24"><title>은화</title><circle cx="12" cy="12" r="9" fill="#DCE3EC"/><circle cx="12" cy="12" r="6.2" fill="#A9B4C2"/><path d="M12 7.5l1.3 2.7 3 .4-2.2 2 .6 3-2.7-1.5-2.7 1.5.6-3-2.2-2 3-.4z" fill="#F4F8FC"/></svg>',
  gift: '<svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="5" rx="1.5" fill="#E8C26A"/><rect x="4.5" y="13" width="15" height="8" rx="1.5" fill="#C9973E"/><path d="M11 9h2v12h-2z" fill="#7a1f1f"/><path d="M12 9C9 9 6.5 7.8 7.2 5.8 8 3.6 11 5.6 12 9zm0 0c3 0 5.5-1.2 4.8-3.2C16 3.6 13 5.6 12 9z" fill="#E5483A"/></svg>',
  gem: '<svg viewBox="0 0 24 24"><path d="M6 3h12l4 6-10 12L2 9z" fill="#5AD1FF"/><path d="M6 3l6 6 6-6M2 9h20M12 9v12" stroke="#E8FBFF" stroke-width="1" fill="none" opacity=".7"/></svg>',
  sta: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="#8BE36A"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z" fill="#C79CFF"/><path d="M20 4h-5a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h6z" fill="#9F6BEF"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 4l-8 8 8 8" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2.2" fill="none"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 1 0 12 8.5zM19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L15 3h-4l-.4 2.6a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1L11 21h4l.4-2.6a7 7 0 0 0 1.7-1l2.4 1 2-3.4z"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4" stroke="#1a1410" stroke-width="2"/></svg>',
  list: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 8h10M7 12h10M7 16h6" stroke="#1a1410" stroke-width="2"/></svg>',
  sword: '<svg viewBox="0 0 24 24"><path d="M19 2l3 3-11 11-3-3zM6.5 13.5l4 4-2 2-1-1-2.5 2.5-1.5-1.5L6 17l-1-1z"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z"/></svg>', chest: '<svg viewBox="0 0 24 24"><path d="M3 9a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2H3zM3 12h18v8H3z"/><rect x="10" y="10" width="4" height="5" rx="1" fill="#1a1410"/></svg>',
  tower: '<svg viewBox="0 0 24 24"><path d="M6 21V9l-2-2V3h3v2h2V3h2v2h2V3h2v2h2V3h3v4l-2 2v12z"/></svg>', cave: '<svg viewBox="0 0 24 24"><path d="M2 21l5-11 3 4 4-9 8 16z"/></svg>', exit: '<svg viewBox="0 0 24 24"><path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
const stars = (n, max = 3) => `<span class="stars">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}">${I.star}</i>`).join('')}</span>`;

// ── 시작
export async function startUI(prog) {
  loadSave(); await bmInit(); setAudio(G.set); await buildLobby(); prog && prog(1);
  installBack({ back: () => goBack() });
  setInterval(() => { tick(); if (cur === 'home' || cur === 'adv') refreshTop(); }, 1000);
  title();
}
function goBack() {
  if (md.firstElementChild) { closeModal(); return true; }
  if (battle) { battle.cb.pause(battle); return true; }
  if (cur !== 'home' && cur !== 'title') { home(); return true; }
  return false;
}
function title() {
  cur = 'title'; setView('title', true); music('lobby');
  ui.innerHTML = `<div class="title"><div class="t-logo"><b>ASH BLADE</b><span>애쉬 블레이드</span><em>잿빛 숲의 검</em></div><div class="t-tap">화면을 눌러 시작</div><div class="t-ver">v${VERSION}</div></div>`;
  ui.querySelector('.title').onclick = () => { sfx('tap'); if (!G.seen.prologue) story('prologue', () => { G.seen.prologue = 1; save(); go(STAGES[0]); }); else home(); };
}
export const VERSION = '0.3.0';
// ── 공통 위쪽 띠 (재화)
function top(back) {
  const st = staminaNext();
  return `<div class="topbar">${back ? `<button class="tb-back" data-act="home">${I.back}</button>` : `<div class="tb-prof" data-act="hero"><i style="background-image:url(${icons.face})"></i><div><b>Lv.${G.lv} 카일</b><span class="xp"><s style="width:${G.lv >= 60 ? 100 : G.exp / expNeed(G.lv) * 100}%"></s></span><em>⚔ ${fmt(heroStats().cp)}</em></div></div>`}
    <div class="tb-cur"><span class="c-sta" data-act="buySta">${I.sta}<b id="tbSta">${G.stamina}/${STAMINA.max}</b>${st ? `<em id="tbStT">${Math.ceil(st / 60000)}분</em>` : ''}</span><span title="은화">${I.gold}<b>${K(G.gold)}</b></span><span data-act="shop">${I.gem}<b>${fmt(G.gems)}</b></span></div></div>`;
}
function refreshTop() { const s = document.getElementById('tbSta'); if (s) s.textContent = `${G.stamina}/${STAMINA.max}`; const t = document.getElementById('tbStT'); if (t) { const n = staminaNext(); t.textContent = n ? Math.ceil(n / 60000) + '분' : ''; } }
function nav(on) { const it = [['hero', '영웅', I.sword], ['skill', '스킬', I.book], ['adv', '모험', I.home], ['shop', '상점', I.chest], ['tower', '탑', I.tower]];
  return `<nav class="nav">${it.map(([k, n, ic]) => `<button data-act="${k}" class="${on === k ? 'on' : ''} ${k === 'adv' ? 'big' : ''}">${ic}<span>${n}</span>${k === 'hero' && G.inv.some(x => itemScore(x) > itemScore(G.gear[x.slot])) ? '<i class="dot"></i>' : ''}</button>`).join('')}</nav>`; }
function bind(root = ui) { root.querySelectorAll('[data-act]').forEach(b => { b.onclick = e => { e.stopPropagation(); sfx('tap', { vol: 0.4 }); act(b.dataset.act, b.dataset); }; }); }
function act(a, d) {
  const F = { home, hero, skill, adv, shop, tower, cave, missions, attend: attendModal, settings, buySta, back: home }; if (F[a]) return F[a](d);
  if (a === 'stage') return stageSheet(STAGES.find(s => s.id === d.id));
  if (a === 'close') return closeModal();
}
// ── 로비
function home() {
  cur = 'home'; setView('home'); music('lobby'); closeModal();
  const next = STAGES.find(s => !G.clear[s.id]) || STAGES[STAGES.length - 1], ch = CHAPTERS[0], cs = totalStars();
  ui.innerHTML = `<div class="scr home">${top()}
    <div class="side">${btnSide('attend', I.cal, '출석', attendReady())}${btnSide('missions', I.list, '미션', missionReady())}${btnSide('settings', I.gear, '설정')}${inOAD ? `<button class="sb" id="bExit">${I.exit}<span>원어데이</span></button>` : ''}</div>
    <div class="h-bottom">
      <div class="card adv" data-act="adv"><div class="c-bg"></div><small>${ch.id}장 · ${ch.name}</small><b>${next.id} ${next.name}</b><span>${stars(Math.min(3, Math.floor(cs / 10)), 0)}별 ${cs} / ${STAGES.length * 3}</span><em>모험 떠나기 ›</em></div>
      <div class="row2"><div class="card sm tw" data-act="tower">${I.tower}<b>무한의 탑</b><span>최고 ${G.tower.best}층</span></div><div class="card sm cv" data-act="cave">${I.cave}<b>황금 동굴</b><span>오늘 ${3 - (G.daily.cave || 0)}번 남음</span></div></div>
    </div>${nav('')}</div>`;
  bind(); const ex = document.getElementById('bExit'); if (ex) ex.onclick = () => exitToOAD();
  if (attendReady() && !home.shown) { home.shown = 1; setTimeout(attendModal, 400); }
}
const btnSide = (a, ic, n, dot) => `<button class="sb" data-act="${a}">${ic}<span>${n}</span>${dot ? '<i class="dot"></i>' : ''}</button>`;
// ── 모험: 스테이지 지도
function adv() {
  cur = 'adv'; setView('home'); const ch = CHAPTERS[0];
  ui.innerHTML = `<div class="scr adv">${top(true)}<div class="hd"><small>CHAPTER ${ch.id}</small><b>${ch.name}</b><span>${ch.desc}</span></div>
    <div class="map">${STAGES.map((s, i) => { const open = stageOpen(s.id), st = G.clear[s.id] || 0; return `<div class="node ${open ? '' : 'lock'} ${s.boss ? 'boss' : ''} ${i % 2 ? 'r' : 'l'}" ${open ? `data-act="stage" data-id="${s.id}"` : ''}>
      <i>${open ? (s.boss ? '<b>BOSS</b>' : s.id) : I.lock}</i><div><b>${s.id} ${s.name}</b>${open ? stars(st) : '<span class="lk">이전 스테이지를 깨면 열려요</span>'}</div></div>`; }).join('')}
      <div class="node soon"><i>2</i><div><b>2장 · 얼어붙은 성채</b><span class="lk">곧 열려요</span></div></div></div>${nav('adv')}</div>`;
  bind(); const n = ui.querySelector('.node:not(.lock):not(.soon):last-of-type'); const all = ui.querySelectorAll('.node:not(.lock)'); const last = all[all.length - 2] || all[0]; if (last) last.scrollIntoView({ block: 'center' });
}
const recCP = lv => Math.round(power({ atk: HERO.atk * Math.pow(HERO.grow, lv - 1) * 1.55, hp: HERO.hp * Math.pow(HERO.grow, lv - 1) * 1.6, def: HERO.def * Math.pow(1.04, lv - 1) + lv * 3, crit: 0.13, cdmg: 1.7 }) * 0.82);
function stageSheet(S) {
  const st = G.clear[S.id] || 0, cp = heroStats().cp, rc = recCP(S.lv), mobs = [...new Set(S.waves.flat().map(w => w[0]))];
  modal(`<div class="sheet stg"><div class="sh-hd"><small>${S.id}${S.boss ? ' · 보스' : ''}</small><b>${S.name}</b>${stars(st)}</div>
    <div class="cp ${cp >= rc ? 'ok' : 'low'}"><span>추천 전투력</span><b>${fmt(rc)}</b><em>내 전투력 ${fmt(cp)}</em></div>
    <div class="mobs">${mobs.map(m => `<span class="${MOBS[m].boss ? 'b' : ''}">${MOBS[m].name}</span>`).join('')}</div>
    <div class="goal"><div>${stars(1, 1)}<span>스테이지 깨기</span></div><div>${stars(1, 1)}<span>${S.time}초 안에 깨기</span></div><div>${stars(1, 1)}<span>체력 절반 넘게 남기기</span></div></div>
    <div class="rw"><span>${I.gold}<b>${fmt(S.lv * 60)}+</b></span><span class="xp">EXP <b>${fmt(stageExp(S))}</b></span>${st ? '' : `<span>${I.gem}<b>첫 보상 ${S.boss ? 100 : 30}</b></span>`}<span>${I.chest}<b>장비</b></span></div>
    <div class="btns">${st >= 3 ? `<button class="btn" data-act="sweep">소탕 <small>${I.sta}${STAMINA.cost}</small></button>` : ''}<button class="btn gold" data-act="go">출격 <small>${I.sta}${STAMINA.cost}</small></button></div></div>`, { cls: 'bottom' });
  md.querySelector('[data-act=go]').onclick = () => { sfx('tap'); if (!useStamina(STAMINA.cost)) return noSta(); closeModal(); go(S); };
  const sw = md.querySelector('[data-act=sweep]'); if (sw) sw.onclick = () => { if (!useStamina(STAMINA.cost)) return noSta(); closeModal(); const r = rewards(S, { win: true, stars: 3, gold: S.lv * 40, kills: 12, sweep: true }); showRewards('소탕 완료', r); };
}
const stageExp = S => Math.round(S.lv * 22 + 20);
function noSta() { toast('행동력이 부족해요'); buySta(); }
// ── 전투 시작/끝
async function go(S, mode = 'stage') {
  closeModal(); let gift = null;
  if (!S.tower && !S.daily) { const t = helpCheck(S); if (t >= 0) gift = await giftDialog(S, t); }
  lastStage = { S, mode }; S.chapterName = S.tower ? '무한의 탑' : S.daily ? '황금 동굴' : `${CHAPTERS[0].id}장 · ${CHAPTERS[0].name}`;
  ui.innerHTML = ''; bootEl.classList.remove('off'); bar.style.width = '0%'; document.getElementById('boottip').textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
  leaveLobby(); const ps = heroStats();
  if (gift) { ps.atk = Math.round(ps.atk * (1 + gift.atk)); ps.hp = Math.round(ps.hp * (1 + gift.hp)); }
  battle = new Battle(S, ps, { auto: G.auto, setAuto: v => { G.auto = v; save(); }, end: (b, r) => endBattle(b, r), died: b => revive(b), pause: b => pause(b) });
  battle.gift = gift; window.__battle = battle; await battle.start(v => { bar.style.width = Math.round(v * 100) + '%'; }); bootEl.classList.add('off'); cur = 'battle';
  if (gift) setTimeout(() => toast(`응원 선물 · 공격력 +${Math.round(gift.atk * 100)}%${gift.hp ? ` · 체력 +${Math.round(gift.hp * 100)}%` : ''}`), 2300);
  if (S.tut && !G.seen.tut) { G.seen.tut = 1; save(); setTimeout(tutorial, 2200); }
}
/* 연속 실패 응원 선물 창 (다음 도전 시작 때) — 노력 인정 먼저 · 받기/거절 */
function giftDialog(S, t) {
  const T = HELP.tiers[t], n = (G.help && G.help.streak) || HELP.streak; track('help_offer', { stage: S.id, tier: t + 1 });
  return new Promise(res => {
    modal(`<div class="dlg gift"><i class="gf-ic">${I.gift}</i><b class="dt">${n}번이나 포기하지 않고 도전했네요!</b>
      <p>${S.id} ${S.name} — 실력이 붙고 있어요.<br><b class="gf">응원 선물 · 챙겨 드릴게요</b></p>
      <div class="gf-list"><span>${I.sta}${T.sta > STAMINA.cost ? `행동력 ${T.sta} (이번 출격 몫 ${STAMINA.cost} + ${T.sta - STAMINA.cost} 더)` : `이번 출격 행동력 ${T.sta} 돌려 드려요`}</span><span>${I.sword}응원 공격력 +${Math.round(T.atk * 100)}%${T.hp ? ` · 체력 +${Math.round(T.hp * 100)}%` : ''}</span></div>
      <p><small>이번 한 판에만 · 추천 장착 · 강화도 함께 해 보면 더 든든해요</small></p>
      <div class="btns"><button class="btn" id="gNo">혼자 해 볼게요</button><button class="btn gold" id="gYes">받을게요</button></div></div>`, { noClose: true });
    sfx('reward', { vol: 0.5 });
    document.getElementById('gYes').onclick = () => { helpUsed(); track('help_take', { stage: S.id, tier: t + 1 }); G.stamina += T.sta; save(); sfx('levelup', { vol: 0.6 }); closeModal(true); res(T); };
    document.getElementById('gNo').onclick = () => { helpUsed(); track('help_decline', { stage: S.id, tier: t + 1 }); sfx('tap'); closeModal(true); res(null); };
  });
}
const TIPS = ['공격 버튼을 누르고 있으면 4연타가 이어져요.', '빨간 바닥 표시가 차오르면 회피 버튼으로 피하세요.', '공격 직전에 피하면 「완벽한 회피」로 시간이 느려져요.', '분노 게이지가 가득 차면 분노 해방을 쓸 수 있어요.', '보스의 노란 게이지를 채우면 그로기 상태가 돼요.', '별 3개로 깬 스테이지는 소탕할 수 있어요.', '장비를 강화하면 전투력이 크게 올라요.'];
function tutorial() { if (!battle) return; const steps = ['왼쪽 아래를 끌어 <b>이동</b>해요.', '<b>공격</b> 버튼을 계속 누르면 4연타!', '빨간 바닥이 차오르면 <b>회피</b>!', '스킬 버튼으로 <b>강한 기술</b>을 써 보세요.'];
  let i = 0; const el = document.createElement('div'); el.className = 'tut'; document.getElementById('hud').append(el); const nx = () => { if (i >= steps.length || !battle) { el.remove(); return; } el.innerHTML = steps[i++]; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); setTimeout(nx, 3600); }; nx(); }
function pause(b) {
  if (b.paused || b.ended) return; b.paused = true; E.paused = true;
  modal(`<div class="dlg"><b class="dt">일시정지</b><div class="tg"><button data-k="sfx" class="${G.set.sfx ? 'on' : ''}">효과음</button><button data-k="bgm" class="${G.set.bgm ? 'on' : ''}">배경음</button></div>
    <div class="btns col"><button class="btn gold" data-a="go">계속하기</button><button class="btn" data-a="quit">포기하고 나가기</button></div></div>`, { onClose: () => { b.paused = false; E.paused = false; } });
  md.querySelectorAll('.tg button').forEach(t => t.onclick = () => { G.set[t.dataset.k] = !G.set[t.dataset.k]; setAudio(G.set); save(); t.classList.toggle('on'); });
  md.querySelector('[data-a=go]').onclick = () => closeModal();
  md.querySelector('[data-a=quit]').onclick = () => { closeModal(); b.quit = true; b.half = !!b.boss || (b.wave + 1) / b.stage.waves.length > 0.5; b.ended = true; b.finish(false); };
}
/* '아깝다' 순간인가 (docs/bm-policy.md 5장): 처음 3판 · 20초 안 = 아님 · 보스 체력 40% 이하 · 마지막 웨이브 */
function hopeOf(b) {
  if ((G.total.runs || 0) < 3 || b.t < 20) return null;
  if (b.boss) { if (!b.boss.alive) return null; const k = b.boss.hp / b.boss.maxHp; return k <= 0.4 ? `${b.boss.def.name}의 체력이 ${Math.max(1, Math.round(k * 100))}%만 남았어요!` : null; }
  const W = b.stage.waves.length; if (W > 1 && b.wave >= W - 1) { const n = b.enemies.filter(e => e.alive).length; return `마지막 웨이브! 적 ${n}마리만 남았어요.`; }
  return null;
}
/* 쓰러짐: 칭찬 먼저 → 희망 한 줄 → 10초 · 원어데이 부활(광고 판당 1 · 하루 3 / 🪙 판당 2번까지)은 희망일 때만 · 보석 부활은 예전 그대로 */
const REVIVE_BM_MAX = 2;
function revive(b) {
  E.paused = true; let left = 10, busy = false; const hope = OAD.ok ? hopeOf(b) : null, used = b.bmRev || 0;
  const adOk = hope && used === 0 && adReady('revive'), rk = used === 0 ? 'revive' : 'revive2', gp = hope && used < REVIVE_BM_MAX ? price(rk) : 0;
  const st = b.stats;
  modal(`<div class="dlg rev"><b class="dt">${hope ? '잘 싸웠어요!' : '쓰러졌어요'}</b>
    ${hope ? `<p class="praise">처치 <b>${st.kills}</b> · 최대 콤보 <b>${st.maxCombo}</b>${st.perfect ? ` · 완벽한 회피 <b>${st.perfect}</b>` : ''}</p><p class="hope">${hope}</p>` : '<p>부활하면 체력이 가득 차고 분노 게이지도 채워져요.</p>'}
    <div class="cnt" id="rvc">10</div>
    ${adOk || gp ? `<div class="oad2">${adOk ? `<button class="btn gold" data-a="ad">${adLabel()} 부활<small>오늘 ${adLeft('revive')}번 남음</small></button>` : ''}${gp ? `<button class="btn gold" data-a="gd">🪙${gp} 부활<small>원어데이 골드</small></button>` : ''}</div>` : ''}
    <div class="btns col"><button class="btn ${adOk || gp ? '' : 'gold'}" data-a="rv">${I.gem} 30 부활하기</button><button class="btn" data-a="no">결과 보기</button></div></div>`, { noClose: true });
  const tmr = setInterval(() => { if (busy) return; left--; const c = document.getElementById('rvc'); if (c) c.textContent = left; if (left <= 0) { clearInterval(tmr); no(); } }, 1000);
  const no = () => { clearInterval(tmr); closeModal(true); E.paused = false; b.finish(false); };
  const up = how => { clearInterval(tmr); closeModal(true); E.paused = false; if (how) { b.bmRev = (b.bmRev || 0) + 1; b.assisted = true; } b.player.revive(); sfx('levelup'); };
  const viaOAD = async (f, how) => { if (busy) return; busy = true; const r = await f(); busy = false; if (r.ok) return up(how); const m = r.reason === 'limit' && how === 'ad' ? failMsg({ reason: 'limitAd' }) : failMsg(r); if (m) toast(m);
    if (how === 'ad' && r.reason === 'limit') { const a = md.querySelector('[data-a=ad]'); if (a) a.remove(); } };
  const ad = md.querySelector('[data-a=ad]'); if (ad) ad.onclick = () => viaOAD(() => watchAd('revive'), 'ad');
  const gd = md.querySelector('[data-a=gd]'); if (gd) gd.onclick = () => viaOAD(() => pay(rk), 'gold');
  md.querySelector('[data-a=rv]').onclick = () => { if (busy) return; if (G.gems < 30) { toast('보석이 부족해요'); return; } G.gems -= 30; save(); up(); };
  md.querySelector('[data-a=no]').onclick = () => { if (!busy) no(); };
}
function rewards(S, r) {
  const out = { gold: 0, exp: 0, gems: 0, books: 0, items: [], up: 0, first: false };
  if (!r.win) { out.gold = Math.round((r.gold || 0) * 0.5); G.gold += out.gold; out.exp = Math.round(stageExp(S) * 0.3); out.up = addExp(out.exp); save(); return out; }
  out.gold = (r.gold || 0) + S.lv * 60; out.exp = stageExp(S) + (r.kills || 0) * 2;
  if (S.tower) { out.gold = S.lv * 90 + (r.gold || 0); if (S.tower > G.tower.best) { G.tower.best = S.tower; out.gems = S.tower % 10 === 0 ? 100 : S.tower % 5 === 0 ? 40 : 10; if (S.tower % 5 === 0) out.items.push(rollItem(S.lv, S.tower % 10 === 0 ? 3 : 2)); } mission('tower'); }
  else if (S.daily) { out.gold = Math.round(S.daily.gold * (0.6 + r.stars * 0.2)) + (r.gold || 0); out.exp = Math.round(out.exp * 0.5); G.daily.cave = (G.daily.cave || 0) + 1; mission('daily'); }
  else { const prev = G.clear[S.id] || 0; if (!prev) { out.first = true; out.gems = S.boss ? 100 : 30; } G.clear[S.id] = Math.max(prev, r.stars || 1); mission('clear');
    const n = S.boss ? 2 : Math.random() < 0.55 ? 1 : 0; for (let i = 0; i < n; i++) out.items.push(rollItem(S.lv, S.boss ? 1 : 0)); if (S.boss || Math.random() < 0.35) out.books = S.boss ? 3 : 1; }
  mission('kill', r.kills || 0); if (r.skills) mission('skill', r.skills);
  G.gold += out.gold; G.gems += out.gems; G.books += out.books; out.items.forEach(addItem); out.up = addExp(out.exp); G.total.kills += r.kills || 0; G.total.clears++; save(); return out;
}
async function endBattle(b, r) {
  const S = b.stage; const out = rewards(S, r); G.total.runs = (G.total.runs || 0) + 1; noteStage(S, { ...r, quit: b.quit, half: b.half }); save(); b.dispose(); battle = null; E.paused = false;
  await buildLobby(); setView('home', true);
  if (r.win && !S.tower && !S.daily) { const sk = 'after_' + S.id; if (STORY[sk] && !G.seen[sk]) { G.seen[sk] = 1; save(); pendingStory = sk; } }
  result(S, r, out);
  /* 판 끝 전면 광고: 앱이 조건(실험 그룹 · 간격 · 소장)에 맞을 때만 · 실패 직후는 부르지 않음 */
  if (r.win && OAD.ok) bm.interstitial('round_end');
}
function result(S, r, out) {
  cur = 'result'; music(r.win ? 'lobby' : 'lobby'); const idx = STAGES.findIndex(s => s.id === S.id), next = idx >= 0 ? STAGES[idx + 1] : null;
  ui.innerHTML = `<div class="scr result ${r.win ? 'win' : 'lose'}"><div class="r-hd"><small>${S.chapterName || ''}</small><b>${r.win ? 'VICTORY' : 'DEFEAT'}</b><span>${S.name}</span></div>
    ${r.win ? `<div class="r-stars">${[0, 1, 2].map(i => `<i class="${i < r.stars ? 'on' : ''}" style="animation-delay:${0.3 + i * 0.25}s">${I.star}</i>`).join('')}</div>` : '<div class="r-tip">장비를 강화하거나 스킬 레벨을 올려 보세요.<br>빨간 바닥이 차오를 때 회피하면 훨씬 쉬워져요!</div>'}
    <div class="r-stat"><div><span>시간</span><b>${Math.floor(r.time / 60)}:${String(Math.floor(r.time % 60)).padStart(2, '0')}</b></div><div><span>처치</span><b>${r.kills || 0}</b></div><div><span>최대 콤보</span><b>${r.maxCombo || 0}</b></div>${r.perfect ? `<div><span>완벽한 회피</span><b>${r.perfect}</b></div>` : ''}</div>
    <div class="r-rw" id="rRw">${rwItems(out)}</div>${out.up ? `<div class="r-up">레벨 업! <b>Lv.${G.lv}</b></div>` : ''}
    ${r.win && !S.tower && !S.daily && adReady('x2') ? `<div class="oad2 x2"><button class="btn gold" data-a="x2">${adLabel()} · 보상 2배<small>${I.gold} 은화 · 경험치 · 오늘 ${adLeft('x2')}번 남음</small></button></div>` : ''}
    <div class="btns">${S.tower ? `<button class="btn" data-a="lobby">로비</button><button class="btn gold" data-a="tnext">${r.win ? `${S.tower + 1}층 도전` : '다시 도전'}</button>` : S.daily ? `<button class="btn" data-a="lobby">로비</button>` :
      `<button class="btn" data-a="lobby">로비</button><button class="btn" data-a="retry">다시 하기</button>${r.win && next ? `<button class="btn gold" data-a="next">다음 스테이지</button>` : ''}`}</div></div>`;
  sfx(r.win ? 'reward' : 'fail', { vol: 0.6 }); if (out.up) setTimeout(() => sfx('levelup', { vol: 0.7 }), 900);
  const q = s => ui.querySelector(`[data-a=${s}]`);
  q('lobby').onclick = after(home);
  if (q('retry')) q('retry').onclick = after(() => { if (!useStamina(STAMINA.cost)) { home(); return noSta(); } go(S); });
  if (q('next')) q('next').onclick = after(() => { adv(); stageSheet(next); });
  if (q('tnext')) q('tnext').onclick = () => go(towerFloor(G.tower.best + 1));
  if (q('x2')) q('x2').onclick = async () => { const bt = q('x2'); if (bt.disabled) return; bt.disabled = true; const res = await watchAd('x2');
    if (!res.ok) { bt.disabled = false; const m = res.reason === 'limit' ? failMsg({ reason: 'limitAd' }) : failMsg(res); if (m) toast(m); if (res.reason === 'limit') bt.parentNode.remove(); return; }
    G.gold += out.gold; const up = addExp(out.exp); out.gold *= 2; out.exp *= 2; out.up += up; save(); sfx('reward'); const rw = document.getElementById('rRw'); if (rw) rw.innerHTML = rwItems(out); bt.parentNode.remove(); toast(`보상 2배! 은화 +${fmt(out.gold / 2)}`); };
  if (r.win) heroPose('s4', { from: 0.85, to: 1.95 });
}
function rwItems(o) { return [o.gold && `<div class="ri">${I.gold}<b>${fmt(o.gold)}</b></div>`, o.exp && `<div class="ri"><i class="xpi">EXP</i><b>${fmt(o.exp)}</b></div>`, o.gems && `<div class="ri">${I.gem}<b>${o.gems}</b></div>`, o.books && `<div class="ri">${I.book}<b>${o.books}</b></div>`,
  ...o.items.map(it => `<div class="ri it">${itemIcon(it)}</div>`)].filter(Boolean).join('') || '<span class="none">보상 없음</span>'; }
function showRewards(t, o) { modal(`<div class="dlg"><b class="dt">${t}</b><div class="r-rw">${rwItems(o)}</div>${o.up ? `<div class="r-up">레벨 업! <b>Lv.${G.lv}</b></div>` : ''}<div class="btns"><button class="btn gold" data-act="close">확인</button></div></div>`); sfx('reward'); if (cur === 'adv') adv(); }
const itemIcon = (it, sm) => `<span class="ico r${it.r} ${sm ? 'sm' : ''}" style="--rc:${RARITY[it.r].col}"><img src="${icons['g_' + it.slot]}">${it.lv ? `<em>+${it.lv}</em>` : ''}</span>`;
// ── 영웅 (장비)
function hero() {
  cur = 'hero'; setView('hero'); const s = heroStats();
  const inv = [...G.inv].sort((a, b) => b.r - a.r || b.lv - a.lv || itemScore(b) - itemScore(a));
  ui.innerHTML = `<div class="scr hero">${top(true)}<div class="slots l">${SLOTS.slice(0, 3).map(slotBtn).join('')}</div><div class="slots r">${SLOTS.slice(3).map(slotBtn).join('')}</div>
    <div class="h-panel"><div class="stat"><div class="cp"><span>전투력</span><b>${fmt(s.cp)}</b></div><div class="grid"><span>공격력 <b>${fmt(s.atk)}</b></span><span>체력 <b>${fmt(s.hp)}</b></span><span>방어력 <b>${fmt(s.def)}</b></span><span>치명타 <b>${Math.round(s.crit * 100)}%</b></span></div></div>
      <div class="tools"><button class="btn sm" id="hAuto">추천 장착</button>${OAD.ok ? '<button class="btn sm" id="hSkin">외형</button>' : ''}<button class="btn sm" id="hSalv">일반·고급 분해</button><span>가방 ${G.inv.length}/60</span></div>
      <div class="inv">${inv.map(it => `<button class="cell ${itemScore(it) > itemScore(G.gear[it.slot]) ? 'up' : ''}" data-u="${it.u}">${itemIcon(it, 1)}</button>`).join('') || '<div class="empty">스테이지에서 장비를 얻을 수 있어요</div>'}</div></div>${nav('hero')}</div>`;
  bind(); ui.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => itemModal(G.gear[b.dataset.slot], true)); ui.querySelectorAll('.cell').forEach(b => b.onclick = () => itemModal(G.inv.find(x => x.u === b.dataset.u), false));
  const hs = document.getElementById('hSkin'); if (hs) hs.onclick = () => { sfx('tap'); skinSheet(); };
  document.getElementById('hAuto').onclick = () => { let n = 0; for (const sl of SLOTS) { const best = G.inv.filter(x => x.slot === sl.id).sort((a, b) => itemScore(b) - itemScore(a))[0]; if (best && itemScore(best) > itemScore(G.gear[sl.id])) { equip(best); n++; } } sfx(n ? 'equip' : 'tap'); toast(n ? `${n}개 장착했어요` : '이미 가장 좋은 장비예요'); if (n) heroPose('s4', { from: 0.85, to: 1.95 }); hero(); };
  document.getElementById('hSalv').onclick = () => { const L = G.inv.filter(x => x.r <= 1 && itemScore(x) <= itemScore(G.gear[x.slot])); if (!L.length) return toast('분해할 장비가 없어요'); let g = 0; L.forEach(x => { g += sell(x); }); sfx('coin'); toast(`${L.length}개 분해 · 은화 ${fmt(g)}`); hero(); };
}
const slotBtn = sl => { const it = G.gear[sl.id]; return `<button class="slot" data-slot="${sl.id}">${itemIcon(it)}<span>${sl.name}</span></button>`; };
function statLines(it, cmp) { const a = itemStat(it), b = cmp ? itemStat(cmp) : null; return Object.entries(a).map(([k, v]) => { const pct = k === 'crit' || k === 'cdmg', f = x => pct ? (x * 100).toFixed(1) + '%' : fmt(x); const d = b ? v - (b[k] || 0) : 0;
  return `<div class="sl"><span>${STAT_NAME[k]}</span><b>${f(v)}</b>${b && Math.abs(d) > 1e-6 ? `<em class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'} ${f(Math.abs(d))}</em>` : ''}</div>`; }).join(''); }
function itemModal(it, equipped) {
  if (!it) return; const cmp = equipped ? null : G.gear[it.slot], R = RARITY[it.r];
  const draw = () => { const c = enhCost(it), rate = enhRate(it);
    modal(`<div class="dlg item" style="--rc:${R.col}"><div class="it-hd">${itemIcon(it)}<div><small style="color:${R.col}">${R.name} · ${SLOTS.find(s => s.id === it.slot).name}</small><b>${itemName(it)}</b><span>${equipped ? '장착 중' : `비교: ${itemName(cmp)}`}</span></div></div>
      <div class="it-st">${statLines(it, cmp)}</div>
      <div class="enh"><div><span>강화 +${it.lv} / ${MAX_ENH}</span><em>성공 확률 ${Math.round(rate * 100)}%</em></div><button class="btn gold" id="iEnh" ${it.lv >= MAX_ENH ? 'disabled' : ''}>강화 <small>${I.gold}${K(c)}</small></button></div>
      <div class="btns">${equipped ? '' : `<button class="btn" id="iSell">분해 <small>${I.gold}${K(salvage(it))}</small></button><button class="btn gold" id="iEq">장착</button>`}<button class="btn" data-act="close">닫기</button></div></div>`, { onClose: () => { if (cur === 'hero') hero(); } });
    bind(md); const e = document.getElementById('iEnh'); e.onclick = () => { const r = enhance(it); if (r.err) return toast(r.err); if (r.ok) { sfx('enhance'); toast(`강화 성공! +${it.lv}`); md.querySelector('.it-hd .ico').classList.add('flash'); if (equipped) heroPose('s4', { from: 0.85, to: 1.95 }); } else { sfx('fail'); toast('강화 실패… 은화만 사라졌어요'); } setTimeout(draw, 380); };
    const q = document.getElementById('iEq'); if (q) q.onclick = () => { equip(it); sfx('equip'); heroPose('s4', { from: 0.85, to: 1.95 }); closeModal(); };
    const sl = document.getElementById('iSell'); if (sl) sl.onclick = () => { const g = sell(it); sfx('coin'); toast(`은화 ${fmt(g)} 얻었어요`); closeModal(); }; };
  draw();
}
// ── 스킬
function skill() {
  cur = 'skill'; setView('hero');
  const L = [...SKILL_SLOTS, 'ult'];
  ui.innerHTML = `<div class="scr skill">${top(true)}<div class="hd"><b>스킬</b><span>${I.book} 스킬서 ${G.books}</span></div><div class="sk-list">${L.map(k => { const S = SKILLS[k], lv = G.skillLv[k] || 1, c = skillCost(lv);
    const dmg = S.hits.reduce((a, h) => a + h.m, 0) * (1 + S.lv[1] * (lv - 1));
    return `<div class="sk ${k === 'ult' ? 'u' : ''}"><img src="${icons[k]}"><div class="sk-i"><b>${S.name} <em>Lv.${lv}</em></b><span>${S.desc}</span><small>피해 ${Math.round(dmg * 100)}% · ${k === 'ult' ? '분노 100' : `재사용 ${S.cd}초`}</small></div>
      <button class="btn gold sm" data-k="${k}" ${lv >= MAX_SKILL ? 'disabled' : ''}>${lv >= MAX_SKILL ? 'MAX' : `강화<small>${I.gold}${K(c.gold)} ${I.book}${c.book}</small>`}</button></div>`; }).join('')}</div>${nav('skill')}</div>`;
  bind(); ui.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const r = skillUp(b.dataset.k); if (r.err) return toast(r.err); sfx('enhance'); const S = SKILLS[b.dataset.k]; heroPose(S.clip, { from: S.from, to: S.to }); toast(`${S.name} Lv.${G.skillLv[b.dataset.k]}`); skill(); });
}
// ── 상점: 장비 상자 · 행동력
const BOX = { one: 100, ten: 900, pity: 30 };
function shop() {
  cur = 'shop'; setView('home'); G.pity = G.pity || 0;
  ui.innerHTML = `<div class="scr shop">${top(true)}<div class="sc-body"><div class="hd"><b>상점</b></div>
    <div class="box-card"><div class="bx-art">${I.chest}</div><b>여명의 장비 상자</b><span>영웅 이상 확정까지 <em>${BOX.pity - G.pity}</em>번</span>
      <div class="rates">${RARITY.map((r, i) => `<span style="color:${r.col}">${r.name} ${[62, 27, 8.5, 2.2, 0.3][i]}%</span>`).join('')}</div>
      <div class="btns"><button class="btn" id="b1">1번 열기<small>${I.gem}${BOX.one}</small></button><button class="btn gold" id="b10">10+1번 열기<small>${I.gem}${BOX.ten}</small></button></div></div>
    <div class="buy-list"><div class="buy"><span>${I.sta}<b>행동력 60 채우기</b></span><button class="btn sm" id="bSta">${I.gem} 50</button></div><div class="buy"><span>${I.book}<b>스킬서 5권</b></span><button class="btn sm" id="bBook">${I.gem} 80</button></div></div>${oadShop()}</div>${nav('shop')}</div>`;
  bind(); bindOadShop();
  const open = n => { const cost = n === 1 ? BOX.one : BOX.ten; if (G.gems < cost) return toast('보석이 부족해요'); G.gems -= cost; const got = []; for (let i = 0; i < (n === 1 ? 1 : 11); i++) { G.pity++; let it = rollBox(); if (G.pity >= BOX.pity && it.r < 3) it = rollItem(10, 3); if (it.r >= 3) G.pity = 0; got.push(it); addItem(it); }
    save(); sfx('open'); modal(`<div class="dlg"><b class="dt">상자에서 나온 장비</b><div class="r-rw box">${got.map(it => `<div class="ri it pop">${itemIcon(it)}</div>`).join('')}</div><div class="btns"><button class="btn" data-act="close">확인</button><button class="btn gold" data-act="hero">장비 보기</button></div></div>`, { onClose: () => cur === 'shop' && shop() }); bind(md); };
  document.getElementById('b1').onclick = () => open(1); document.getElementById('b10').onclick = () => open(10);
  document.getElementById('bSta').onclick = () => buySta(); document.getElementById('bBook').onclick = () => { if (G.gems < 80) return toast('보석이 부족해요'); G.gems -= 80; G.books += 5; save(); sfx('reward'); toast('스킬서 5권을 얻었어요'); shop(); };
}
/* 원어데이 골드 칸 + 무기 외형 (원어데이 밖이면 통째로 숨김) — 가격은 서버 표(bm.price)만 */
const SW = { base: 'linear-gradient(135deg,#9aa3ad,#e9edf2 55%,#6b7480)', dawn: 'linear-gradient(135deg,#3a6cff,#dfe9ff 55%,#7ac0ff)', ember: 'linear-gradient(135deg,#7a1a06,#ff6a20 50%,#ffd2a0)' };
function skinRows() {
  const sp = price('skin'), cs = curSkin();
  const row = id => { const S = SKINS[id], own = skinOwned(id), on = cs === id, head = `<span><i class="sw" style="background:${SW[id]}"></i><b>${S.name}<small>${S.desc}</small></b></span>`;
    if (S.owner && !own) return `<div class="buy sk">${head}<button class="btn sm" disabled>소장하면 열려요</button></div>`;
    if (S.item && !own) return sp ? `<div class="buy sk">${head}<button class="btn sm gold" data-skbuy="${id}">🪙${sp}</button></div>` : '';
    return `<div class="buy sk ${on ? 'on' : ''}">${head}<button class="btn sm ${on ? '' : 'gold'}" data-sk="${id}" ${on ? 'disabled' : ''}>${on ? '장착 중' : '장착'}</button></div>`; };
  return ['base', 'dawn', 'ember'].map(row).join('');
}
function oadShop() {
  if (!OAD.ok) return ''; const gp = price('gems200');
  return `<div class="buy-list oad"><div class="oad-hd">원어데이 골드 <small>원어데이 앱의 골드로 사요 · 은화와 달라요</small></div>
    ${gp ? `<div class="buy"><span>${I.gem}<b>보석 200개</b></span><button class="btn sm gold" id="oGem">🪙${gp}</button></div>` : ''}
    <div class="oad-hd">무기 외형 <small>겉모습만 바뀌어요 · 능력치는 같아요 · 영웅 화면에서 미리 볼 수 있어요</small></div>${skinRows()}</div>`;
}
let skBusy = false;
function bindSkins(root, redraw) {
  const via = async (f, ok) => { if (skBusy) return; skBusy = true; const r = await f(); skBusy = false; if (r.ok) return ok(); const m = failMsg(r); if (m) toast(m); };
  const show = id => { lobbySkin(id); heroPose('s4', { from: 0.85, to: 1.95 }); redraw(); };
  root.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => { G.skin = b.dataset.sk; save(); sfx('equip'); toast(`${SKINS[G.skin].name} 장착`); show(G.skin); });
  root.querySelectorAll('[data-skbuy]').forEach(b => b.onclick = () => via(() => pay(SKINS[b.dataset.skbuy].item), () => { const id = b.dataset.skbuy; G.skins = { ...(G.skins || {}), [id]: 1 }; G.skin = id; save(); sfx('enhance'); toast(`${SKINS[id].name}을(를) 얻었어요!`); show(id); }));
}
function bindOadShop() {
  const g = document.getElementById('oGem'); if (g) g.onclick = async () => { if (skBusy) return; skBusy = true; const r = await pay('gems200'); skBusy = false; if (r.ok) { G.gems += 200; save(); sfx('reward'); toast('보석 200개를 받았어요'); shop(); } else { const m = failMsg(r); if (m) toast(m); } };
  bindSkins(ui, shop);
}
/* 영웅 화면: 무기 외형 (아래 창 · 위에 주인공이 보임) */
function skinSheet() { modal(`<div class="sheet skin"><div class="sh-hd"><b>무기 외형</b><small>겉모습만 바뀌어요 · 능력치는 같아요</small></div><div class="buy-list">${skinRows()}</div><div class="btns"><button class="btn" data-act="close">닫기</button></div></div>`, { cls: 'bottom clear' }); bind(md); bindSkins(md, skinSheet); }
function rollBox() { const w = [62, 27, 8.5, 2.2, 0.3]; let s = Math.random() * 100, r = 0; for (; r < 4; r++) { s -= w[r]; if (s <= 0) break; } const it = rollItem(1); it.r = r; return it; }
/* 행동력: 보석 50(예전 그대로) · 원어데이에서는 광고 +20(하루 2) 또는 🪙 가득 채우기 — 같은 크기로 나란히 */
function buySta() {
  const gp = price('stamina'), al = adReady('sta') ? adLeft('sta') : 0;
  modal(`<div class="dlg"><b class="dt">행동력 채우기</b><p>${I.sta} 지금 <b>${G.stamina} / ${STAMINA.max}</b><br><small>행동력은 ${STAMINA.regenMin}분마다 1씩 저절로 차요.</small></p>
    ${al || gp ? `<div class="oad2">${al ? `<button class="btn" id="sAd">${adLabel()}<small>${I.sta} +20 · 오늘 ${al}번 남음</small></button>` : ''}${gp ? `<button class="btn" id="sGd">🪙${gp} 채우기<small>${I.sta} ${STAMINA.max} · 원어데이 골드</small></button>` : ''}</div>` : ''}
    <div class="btns"><button class="btn" data-act="close">취소</button><button class="btn gold" id="sOk">${I.gem} 50 채우기<small>${I.sta} ${STAMINA.max}</small></button></div></div>`);
  const done = (n, msg) => { G.stamina += n; save(); sfx('reward'); closeModal(); toast(msg); if (cur === 'home') home(); else if (cur === 'shop') shop(); else refreshTop(); };
  bind(md); document.getElementById('sOk').onclick = () => { if (G.gems < 50) return toast('보석이 부족해요'); G.gems -= 50; done(STAMINA.max, '행동력을 채웠어요'); };
  let busy = false; const via = async (f, n) => { if (busy) return; busy = true; const r = await f(); busy = false; if (r.ok) return done(n, `행동력 +${n}`); const m = failMsg(r); if (m) toast(m); };
  const a = document.getElementById('sAd'); if (a) a.onclick = () => via(() => watchAd('sta'), 20);
  const g = document.getElementById('sGd'); if (g) g.onclick = () => via(() => pay('stamina'), STAMINA.max);
}
// ── 무한의 탑
function tower() {
  cur = 'tower'; setView('home'); const f = G.tower.best + 1; const fl = [f + 4, f + 3, f + 2, f + 1, f];
  ui.innerHTML = `<div class="scr tower">${top(true)}<div class="hd"><small>INFINITE TOWER</small><b>무한의 탑</b><span>한 층씩 올라갈수록 강한 적이 기다려요. 행동력이 들지 않아요.</span></div>
    <div class="floors">${fl.map(n => `<div class="fl ${n === f ? 'cur' : ''} ${n % 10 === 0 ? 'boss' : n % 5 === 0 ? 'elite' : ''}"><b>${n}층</b><span>${n % 10 === 0 ? '보스' : n % 5 === 0 ? '정예' : '일반'}</span><em>${n % 10 === 0 ? `${I.gem}100 + 영웅 장비` : n % 5 === 0 ? `${I.gem}40 + 희귀 장비` : `${I.gem}10`}</em></div>`).join('')}</div>
    <div class="tw-foot"><span>최고 기록 <b>${G.tower.best}층</b></span><button class="btn gold" id="tGo">${f}층 도전</button></div>${nav('tower')}</div>`;
  bind(); document.getElementById('tGo').onclick = () => { sfx('tap'); go(towerFloor(f)); };
}
// ── 황금 동굴
function cave() {
  cur = 'cave'; setView('home'); const left = 3 - (G.daily.cave || 0), unlock = [1, 6, 12, 18, 25];
  ui.innerHTML = `<div class="scr cave">${top(true)}<div class="hd"><small>DAILY DUNGEON</small><b>황금 동굴</b><span>코볼트들이 모아 둔 은화를 되찾아요. 하루 3번 · 오늘 <b>${left}</b>번 남음</span></div>
    <div class="cv-list">${DAILY.map((d, i) => { const ok = G.lv >= unlock[i]; return `<div class="cv ${ok ? '' : 'lock'}"><div><b>${d.name}</b><span>${ok ? `${I.gold} 은화 최대 ${fmt(d.gold)}` : `영웅 Lv.${unlock[i]} 필요`}</span></div><button class="btn sm gold" data-i="${i}" ${ok && left > 0 ? '' : 'disabled'}>입장</button></div>`; }).join('')}</div>${nav('')}</div>`;
  bind(); ui.querySelectorAll('[data-i]').forEach(b => b.onclick = () => go(dailyStage(DAILY[+b.dataset.i])));
}
// ── 미션 · 출석 · 설정
function missions() {
  tick(); const all = MISSIONS.every(m => G.missDone[m.id]);
  modal(`<div class="dlg ms"><b class="dt">오늘의 미션</b><div class="ms-list">${MISSIONS.map(m => { const v = Math.min(m.goal, G.miss[m.id] || 0), done = G.missDone[m.id], ok = v >= m.goal;
    return `<div class="m ${done ? 'done' : ''}"><div><b>${m.name}</b><span class="pb"><s style="width:${v / m.goal * 100}%"></s></span><em>${v} / ${m.goal}</em></div><button class="btn sm ${ok && !done ? 'gold' : ''}" data-m="${m.id}" ${ok && !done ? '' : 'disabled'}>${done ? '완료' : m.gems ? `${I.gem}${m.gems}` : m.books ? `${I.book}${m.books}` : `${I.gold}${K(m.gold)}`}</button></div>`; }).join('')}
    <div class="m all ${G.missDone.all ? 'done' : ''}"><div><b>모든 미션 완료</b></div><button class="btn sm ${all && !G.missDone.all ? 'gold' : ''}" data-m="all" ${all && !G.missDone.all ? '' : 'disabled'}>${G.missDone.all ? '완료' : `${I.gem}50`}</button></div></div>
    <div class="btns"><button class="btn" data-act="close">닫기</button></div></div>`, { onClose: () => cur === 'home' && home() });
  bind(md); md.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const r = claimMission(b.dataset.m); if (r) { sfx('reward'); toast('보상을 받았어요'); missions(); } });
}
function attendModal() {
  const n = G.attend.n % 7, ready = attendReady();
  modal(`<div class="dlg at"><b class="dt">출석 보상</b><p>매일 들어오면 보상이 쌓여요. 7일째엔 큰 선물!</p><div class="days">${ATTEND.map((r, i) => `<div class="d ${i < n || (!ready && i === n - 1) ? 'got' : ''} ${ready && i === n ? 'today' : ''} ${i === 6 ? 'big' : ''}"><small>${i + 1}일</small>${r.gems ? `${I.gem}<b>${r.gems}</b>` : r.gold ? `${I.gold}<b>${K(r.gold)}</b>` : r.books ? `${I.book}<b>${r.books}</b>` : `${I.chest}<b>장비</b>`}</div>`).join('')}</div>
    <div class="btns"><button class="btn ${ready ? 'gold' : ''}" id="aOk" ${ready ? '' : 'disabled'}>${ready ? '받기' : '내일 또 만나요'}</button></div></div>`, { onClose: () => cur === 'home' && home() });
  const b = document.getElementById('aOk'); b.onclick = () => { const r = claimAttend(); if (!r) return; sfx('reward'); closeModal(); showRewards(`${r.day}일째 출석`, { gold: r.gold || 0, gems: r.gems || 0, books: r.books || 0, items: r.item ? [r.item] : [] }); };
}
function settings() {
  modal(`<div class="dlg"><b class="dt">설정</b><div class="tg"><button data-k="sfx" class="${G.set.sfx ? 'on' : ''}">효과음</button><button data-k="bgm" class="${G.set.bgm ? 'on' : ''}">배경음</button></div>
    <div class="set-i"><span>그래픽</span><small>낮음: 빛 번짐·실시간 그림자를 꺼서 폰이 덜 뜨거워져요. 느린 폰은 처음에 자동으로 낮춰요.</small></div><div class="tg gfx"><button data-q="1" class="${E.quality ? 'on' : ''}">높음</button><button data-q="0" class="${E.quality ? '' : 'on'}">낮음</button></div>
    <div class="set-i"><span>조작</span><small>왼쪽 아래 끌기: 이동 · 공격 버튼 누르고 있기: 연타 · 키보드: WASD 이동, J 공격, K 회피, U·I·O·L 스킬, 스페이스 분노</small></div>
    <div class="btns col"><button class="btn" id="stReset">처음부터 다시 하기</button><button class="btn" data-act="close">닫기</button></div><div class="ver">애쉬 블레이드 v${VERSION} · 3D 그림 AIIA</div></div>`);
  bind(md); md.querySelectorAll('.tg button').forEach(t => t.onclick = () => { G.set[t.dataset.k] = !G.set[t.dataset.k]; setAudio(G.set); save(); t.classList.toggle('on'); });
  md.querySelectorAll('.gfx button').forEach(b => b.onclick = () => { setQuality(+b.dataset.q, true); md.querySelectorAll('.gfx button').forEach(x => x.classList.toggle('on', x === b)); });
  document.getElementById('stReset').onclick = () => confirmBox('모든 진행 상황이 지워져요. 정말 처음부터 할까요?', () => { resetSave(); location.reload(); });
}
// ── 이야기 (로비 장면 위 대사)
function story(key, done) {
  const S = STORY[key]; if (!S) { done && done(); return; } let i = 0; ui.innerHTML = ''; setView('title');
  const el = document.createElement('div'); el.className = 'story'; el.innerHTML = `<div class="st-box"><b id="stW"></b><p id="stT"></p><i>▼</i></div><button class="st-skip">건너뛰기</button>`; md.innerHTML = ''; md.append(el);
  let typing = null; const show = () => { const L = S[i]; if (!L) { clearInterval(typing); el.remove(); done ? done() : home(); return; } document.getElementById('stW').textContent = L.who || ''; const p = document.getElementById('stT'); p.textContent = ''; let n = 0; clearInterval(typing);
    typing = setInterval(() => { n++; p.textContent = L.t.slice(0, n); if (n >= L.t.length) { clearInterval(typing); typing = null; } }, 28); if (L.pose) heroPose(L.pose[0], { from: L.pose[1], to: L.pose[2] }); };
  el.onclick = () => { sfx('tap', { vol: 0.3 }); if (typing) { clearInterval(typing); typing = null; document.getElementById('stT').textContent = S[i].t; return; } i++; show(); };
  el.querySelector('.st-skip').onclick = e => { e.stopPropagation(); i = S.length; show(); }; show();
}
// ── 창 · 알림
let modalOpt = null, unback = null;
function modal(html, o = {}) { md.innerHTML = `<div class="mback ${o.cls || ''}"><div class="mbody">${html}</div></div>`; modalOpt = o; const bk = md.firstElementChild; if (!o.noClose) bk.onclick = e => { if (e.target === bk) closeModal(); };
  unback && unback(); unback = pushBack(() => { if (!o.noClose) closeModal(); return true; }); }
function closeModal(silent) { const o = modalOpt; md.innerHTML = ''; modalOpt = null; unback && unback(); unback = null; if (o && o.onClose && !silent) o.onClose(); }
function confirmBox(t, yes) { modal(`<div class="dlg"><p>${t}</p><div class="btns"><button class="btn" data-act="close">취소</button><button class="btn gold" id="cfY">확인</button></div></div>`); bind(md); document.getElementById('cfY').onclick = () => { closeModal(); yes(); }; }
let toastT = null;
export function toast(t) { let el = document.getElementById('toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; document.getElementById('app').append(el); } el.innerHTML = t; el.className = 'on'; clearTimeout(toastT); toastT = setTimeout(() => { el.className = ''; }, 1700); }
