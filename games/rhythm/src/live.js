// 생방송 오버레이 (연출만 · 점수 · 판정과 무관) — ONAIR_PLAN 8-3
//   왼쪽 위 「● LIVE · 시청 N」 · 오른쪽 채팅 5줄(레인 바깥 여백, 위로 흘러 사라짐) · 오른쪽 가장자리에서 솟는 하트
//   채팅은 미리 쓴 문장만(data.js CHAT + 그날 방송 live.chat) · DOM 요소는 시작할 때 만들어 두고 다시 씀(풀)
//   한 판에 DOM 쓰기는 채팅 1.2~2초에 한 번 · 시청자 수 1초에 한 번 · 하트는 CSS 애니메이션만
import { CHAT } from './data.js?v=0.99.27';

const $ = s => document.querySelector(s);
const pick = a => a[Math.floor(Math.random() * a.length)];
const NICK_COL = ['#9FF0FF', '#C3ADFF', '#FFC46B', '#FF9AD5', '#9FF0D8', '#F2D49A'];

export const Live = {
  cfg: null, lines: [], hearts: [], hi: 0, nextAt: 0, viewers: 0, shownV: -1, vAt: 0, dayIdx: 0, combo: 0, streak: 0, lite: false,
  /* cfg: { live: 그날 live, subs, lite } */
  start(cfg) {
    this.cfg = cfg; this.lite = !!cfg.lite; this.dayIdx = 0; this.combo = 0; this.streak = 0; this.queue = [];
    const box = $('#p_chat'), hb = $('#p_hearts');
    if (!this.lines.length) { for (let i = 0; i < 5; i++) { const d = document.createElement('div'); d.className = 'cl'; box.appendChild(d); this.lines.push(d); } }
    if (!this.hearts.length) { for (let i = 0; i < 10; i++) { const h = document.createElement('i'); hb.appendChild(h); this.hearts.push(h); } }
    for (const d of this.lines) { d.className = 'cl'; d.innerHTML = ''; }
    this.viewers = Math.round(cfg.subs[0] * 0.35 + 30); this.shownV = -1; this.vAt = 0; this.nextAt = 0;
    $('#p_live').className = 'live on'; this.setV();
    if (cfg.live && cfg.live.open) this.queue.push({ cast: true, text: cfg.live.open });
  },
  stop() { $('#p_live').className = 'live'; },
  setV() { const v = Math.round(this.viewers); if (v === this.shownV) return; this.shownV = v; $('#p_live b').textContent = v.toLocaleString('en-US'); },
  /* 채팅 한 줄 밀어 넣기 (맨 아래에 새 줄, 위로 밀려 사라짐) */
  push(m) {
    const d = this.lines.shift(); this.lines.push(d);
    d.className = 'cl'; void d.offsetWidth;
    d.innerHTML = m.cast ? `<em class="me">${m.who || 'LIVE'}</em>${m.text}` : `<em style="color:${pick(NICK_COL)}">${pick(CHAT.nick)}</em>${m.text}`;
    d.className = 'cl on' + (m.cast ? ' cast' : '');
    const box = $('#p_chat'); box.appendChild(d);
  },
  heart(n = 1) { if (this.lite) n = Math.min(n, 1); for (let k = 0; k < n; k++) { const h = this.hearts[this.hi++ % this.hearts.length]; h.className = ''; h.style.setProperty('--x', `${(Math.random() * 26 - 13).toFixed(0)}px`); h.style.setProperty('--d', `${(1.4 + Math.random() * 0.8).toFixed(2)}s`); void h.offsetWidth; h.className = 'on'; } },
  /* 판정마다 (play.js flush 에서) — 바로 쓰지 않고 다음 채팅 차례에 반영 */
  judge(e, combo) {
    if (e.j === 'miss') { this.streak = 0; if (Math.random() < 0.6) this.queue.push({ text: pick(CHAT.miss) }); return; }
    this.streak++; this.combo = combo;
    this.viewers += e.j === 'perfect' ? 0.9 : 0.5;
    if (this.streak % 6 === 0) this.heart(1);
    if (combo === 50) { this.queue.push({ text: pick(CHAT.combo50) }); this.heart(3); }
    if (combo > 0 && combo % 100 === 0) { this.queue.push({ text: pick(CHAT.combo100) }); this.heart(5); }
  },
  /* 매 프레임 (가벼움): 시각이 되면 채팅 한 줄 */
  frame(now, p, fever) {
    if (now >= this.vAt) { this.vAt = now + 1; this.viewers += Math.random() * 3 + fever * 4; this.setV(); }
    if (p < -0.5 || now < this.nextAt) return;
    this.nextAt = now + 1.25 + Math.random() * 0.9 - fever * 0.4;
    let m = this.queue.shift();
    if (!m) {
      const L = this.cfg.live || {}, day = L.chat || [];
      if (day.length && Math.random() < 0.55) m = { text: day[this.dayIdx++ % day.length] };
      else m = { text: pick(fever > 0.5 && Math.random() < 0.5 ? CHAT.fever : CHAT.good) };
    }
    this.push(m);
  },
  /* 끝: 그날 마지막 채팅 몰아서 */
  end() { const e = (this.cfg.live && this.cfg.live.end) || []; e.forEach((t, i) => setTimeout(() => { this.push({ text: t }); this.heart(2); }, 250 + i * 380)); },
};
