// 그날의 점쟁이 AI 상담 — 무료 실험판 (테스트 서버 · 만 19세+ · 기기 10% · 하루 3마디)
//   서버로 보내는 것: 기기 번호 · 만 나이(숫자) · 점쟁이 id · '해석 요약'(오행 강약 · 십성 경향 · 오늘 일진 관계 · 점수) · 오늘 대화
//   보내지 않는 것: 생년월일 · 태어난 시 · 이름 · 상대 정보 — 대화 기록은 이 기기에만(오늘 것만 · 7일 지나면 지움)
//   3마디를 다 쓰면 '더 묻기'는 솔직하게 '곧 열려요 · 출시 알림 받기' (가짜 결제창 X) — 유료 구조는 서버 _lib/chat.js CHAT_SHOP (꺼 둠)
import { STEM_ELEMENT, ELEMENT_KO } from './saju.min.js';

export const FREE = 3, MIN_AGE = 19, PCT = 10, SALT = 'aichat1';
const fnv = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const did = () => { try { return localStorage.getItem('oad_did') || ''; } catch { return ''; } };
/* 실험군 (서버 inGroup 과 같은 식) · 테스트용 강제: localStorage oad_ai = '1' 실험군 / '0' 대조군 */
const forced = () => { try { return localStorage.getItem('oad_ai') === '1'; } catch { return false; } };
export function group() { let o = null; try { o = localStorage.getItem('oad_ai'); } catch { /* */ } if (o === '1' || o === '0') return o === '1' ? 'ai' : 'ctrl'; const d = did(); return d && fnv(d + SALT) % 100 < PCT ? 'ai' : 'ctrl'; }
/* 만 나이 (한국 날짜) — 음력 생일은 양력 날짜로 바꾼 값 */
export function fullAge(me, chart, now = new Date()) {
  const s = chart && chart.solarDate, y = s ? s.year : +me.y, m = s ? s.month : +me.m, d = s ? s.day : +me.d;
  const k = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60e3);
  return k.getFullYear() - y - ((k.getMonth() + 1) * 100 + k.getDate() < m * 100 + d ? 1 : 0);
}
const prodHost = () => /(^|\.)oneaday\.kr$/.test(location.hostname) && !/^test\./.test(location.hostname);
let off = false;
try { off = sessionStorage.getItem('oad_ai_off') === '1'; } catch { /* */ }
/* 이 사람에게 입구를 보여 줄지 */
export const eligible = (me, chart) => !off && !prodHost() && group() === 'ai' && fullAge(me, chart) >= MIN_AGE;

/* 해석 요약: 원본 날짜 · 이름 없이 (서버 cleanSummary 가 한 번 더 거름) */
const GROUP = { 비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성' };
export function summary(f) {
  const S = f.chart, cnt = S.elementCount, els = Object.keys(cnt), max = Math.max(...els.map(e => cnt[e])), min = Math.min(...els.map(e => cnt[e]));
  const gs = {}; for (const p of [S.year, S.month, S.day, S.hour]) if (p) for (const g of [p.stemTenGod, p.branchTenGod]) if (GROUP[g]) gs[GROUP[g]] = (gs[GROUP[g]] || 0) + 1;
  const order = ['비겁', '식상', '재성', '관성', '인성'];
  return {
    dm: `${S.dayMaster.ko}${ELEMENT_KO[STEM_ELEMENT[S.dayMaster.stem]]}`,
    strong: els.filter(e => cnt[e] === max).map(e => ELEMENT_KO[e]).join('·'), weak: els.filter(e => cnt[e] === min).map(e => ELEMENT_KO[e]).join('·'),
    groups: order.map(g => `${g} ${gs[g] || 0}`).join(', '),
    today: `${f.today.ko}일 · 오늘 천간은 내 일간에게 ${f.tenGod[0]}, 지지는 ${f.tenGod[1]}${f.notes.length ? ' · ' + f.notes.join(' ') : ''}`,
    why: f.why, key: f.key, say: f.say, scores: f.scores,
  };
}
/* 추천 질문 3개: 오늘 점수가 낮은 분야부터 */
const ASK = { 총운: '오늘 하루 뭘 조심하면 좋을까요?', 금전: '오늘 돈 쓰는 건 어떻게 해야 해요?', 연애: '요즘 연애운은 어때요?', '일·공부': '일이 잘 안 풀리는데 어떻게 해요?', 건강: '컨디션이 별론데 오늘 어떻게 보내요?' };
const chips = f => Object.entries(f.scores).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([k]) => ASK[k]);
const greet = (f, C) => f.tone <= 3 ? `오늘은 제가 나왔네요, ${C.name}예요. ${f.why.replace(/ 나섰다$/, ' 나왔어요')}. 마음 쓰이는 게 있으면 편하게 물어봐요.`
  : f.tone <= 6 ? `오늘은 내 차례네. ${f.why.replace(/ 나섰다$/, ' 나왔어')}. 뭐가 제일 걸려?` : `왔냐. ${f.why}. 돌려 말 안 한다. 뭐가 걸리는지 말해 봐.`;

/* 오늘 대화 (기기에만) */
const KEY = 'oad_chat';
const load = day => { try { const j = JSON.parse(localStorage.getItem(KEY) || 'null'); return j && j.day === day ? j : null; } catch { return null; } };
const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* */ } };

/* 입구 (운세 상세 안 한 칸) */
export function entry(m, me, f, X) {
  if (!eligible(me, f.chart)) return '';
  const C = m.CHARS[f.ch], s = load(X.R.keyOf(X.R.now())), left = s ? s.left : FREE;
  X.T.track('chat_entry_view', { ch: f.ch });
  return `<section class="aient" data-chat><div><small>AI 점쟁이 · 실험 중</small><b>💬 ${C.name}에게 물어보기</b><p>오늘 무료 ${left}마디 남음 · 실제 명리 계산 결과로 AI가 대화해요</p></div><span>→</span></section>`;
}

export async function open(X) {
  const m = await X.ft(), me = m.loadMe(); if (!me) return X.fortuneForm();
  const now = X.R.now(), day = X.R.keyOf(now), f = m.fortune(me, now), C = m.CHARS[f.ch];
  if (!eligible(me, f.chart)) return X.toast('AI 상담은 지금 일부 이용자(만 19세 이상)에게만 열려 있어요');
  let s = load(day); if (!s || s.ch !== f.ch) s = { day, ch: f.ch, left: s ? s.left : FREE, msgs: [{ r: 'a', t: greet(f, C) }], stop: false };
  save(s); X.T.track('chat_open', { ch: f.ch, n: FREE - s.left });
  X.sdClose();
  const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const render = () => {
    const done = s.left <= 0 || s.stop;
    X.openSheet(`<div class="aichat"><div class="aihead">${X.face(m, f.ch, 'sm')}<div><b>${C.name}</b><small>🤖 AI와 대화 중 · 실험판 · 오늘 무료 ${Math.max(0, s.left)}마디</small></div></div>
      <p class="ainote">AI가 만든 답이에요. 실제 명리 계산 결과(해석 요약)를 바탕으로 말투와 대화를 만들어요. 생년월일 원본은 보내지 않고, 대화는 서버에 저장하지 않아요. 의료 · 투자 · 법률 판단은 전문가와 상의해 주세요.</p>
      <div class="aimsgs" id="aiMsgs">${s.msgs.map((x, i) => `<div class="aim ${x.r}${x.s ? ' ' + x.s : ''}">${esc(x.t)}${x.r === 'a' && i > 0 && !x.s ? `<span class="airate"><button data-airate="up" data-i="${i}">👍</button><button data-airate="down" data-i="${i}">👎</button></span>` : ''}</div>`).join('')}</div>
      ${done ? `<div class="aidone">${s.stop ? '오늘 상담은 여기까지예요.' : '오늘 무료 상담은 여기까지예요 · 내일은 또 다른 점쟁이가 기다려요'}${s.stop ? '' : `<button class="sdbtn ghost" data-aimore>더 묻기</button>`}</div>`
        : `<div class="aichips">${chips(f).map(q => `<button data-aiq="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      <form class="aiform" id="aiForm"><input name="q" maxlength="300" placeholder="${C.name}에게 물어보기 (300자)" autocomplete="off"><button class="sdbtn" type="submit">보내기</button></form>`}
      <div class="stack"><button class="btn ghost" data-close>닫기</button></div></div>`);
    const box = X.$('#aiMsgs'); if (box) box.scrollTop = box.scrollHeight;
    const fm = X.$('#aiForm'); if (fm) fm.onsubmit = e => { e.preventDefault(); send(String(new FormData(fm).get('q') || '').trim()); };
    X.$('#sheet').querySelectorAll('[data-aiq]').forEach(b => { b.onclick = () => send(b.dataset.aiq); });
    X.$('#sheet').querySelectorAll('[data-airate]').forEach(b => { b.onclick = () => { X.T.track('chat_rate', { rate: b.dataset.airate === 'up' ? 1 : 0, ch: f.ch }); b.parentElement.innerHTML = '고마워요'; }; });
    const mo = X.$('[data-aimore]'); if (mo) mo.onclick = more;
  };
  let busy = false;
  async function send(q) {
    if (!q || busy || s.left <= 0 || s.stop) return;
    busy = true; s.msgs.push({ r: 'u', t: q.slice(0, 300) }); s.msgs.push({ r: 'a', t: '…', s: 'wait' }); render();
    X.T.track('chat_send', { ch: f.ch, n: FREE - s.left + 1 });
    const hist = s.msgs.slice(0, -2).filter(x => !x.s).map(x => ({ r: x.r, t: x.t }));
    let j = {}, code = 0;
    try { const r = await fetch('/api/fortune/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ act: 'chat', d: did(), qa: forced() ? 1 : 0, age: fullAge(me, f.chart), ch: f.ch, sum: summary(f), hist, q }) }); code = r.status; j = await r.json().catch(() => ({})); }
    catch { j = { error: '연결에 실패했어요' }; }
    s.msgs.pop(); busy = false;
    if (j.off) { off = true; try { sessionStorage.setItem('oad_ai_off', '1'); } catch { /* */ } s.msgs.pop(); save(s); X.closeSheet(); return X.toast('AI 상담은 아직 준비 중이에요'); }
    if (j.limit) { s.left = 0; X.T.track('chat_limit_hit', { ch: f.ch }); }
    else if (j.minor) { s.stop = true; s.msgs.push({ r: 'a', t: j.error, s: 'safe' }); }
    else if (j.text) {
      s.msgs.push({ r: 'a', t: j.text, s: j.safety === 'crisis' ? 'crisis' : j.safety ? 'safe' : '' });
      if (typeof j.left === 'number') s.left = j.left;
      if (j.stop) s.stop = true;
      if (j.safety) X.T.track('chat_safety', { safety: j.safety }); else X.T.track('chat_reply', { ch: f.ch, n: FREE - s.left });
      m.markDay(day, { c: 1 });
    } else { s.msgs.pop(); X.toast(j.error || (code === 403 ? '지금은 이용할 수 없어요' : '다시 시도해 주세요')); }
    save(s); render();
  }
  function more() {
    X.T.track('chat_more_click', { ch: f.ch });
    let on = false; try { on = localStorage.getItem('oad_chat_notify') === '1'; } catch { /* */ }
    X.openSheet(`<div class="intro"><h2>💬 더 묻기는 곧 열려요</h2><p class="fsub">지금은 무료 실험 중이라 하루 ${FREE}마디까지만 돼요. 유료 상담권은 아직 팔지 않아요.</p>
      <div class="stack">${on ? '<button class="btn ghost" disabled>출시 알림 신청됨 ✓</button>' : '<button class="sdbtn" id="aiNotify">출시되면 알려 주세요</button>'}<button class="btn ghost" data-close>닫기</button></div></div>`);
    const b = X.$('#aiNotify'); if (b) b.onclick = () => { try { localStorage.setItem('oad_chat_notify', '1'); } catch { /* */ } X.T.track('chat_notify_optin', { ch: f.ch }); X.toast('출시되면 앱에서 먼저 알려 드릴게요'); X.closeSheet(); };
  }
  render();
}
/* 실험 그룹 기록 (하루 한 번 · 대조군 포함 — D7 비교용) */
export function markGroup(X) {
  const k = 'oad_ai_g', day = X.R.keyOf(X.R.now()); let last = ''; try { last = localStorage.getItem(k) || ''; } catch { /* */ }
  if (last === day) return; try { localStorage.setItem(k, day); } catch { /* */ }
  X.T.track('chat_group', { group: group() });
}
