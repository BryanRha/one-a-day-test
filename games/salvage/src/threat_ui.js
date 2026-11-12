// '오늘 위협' · 주간 변주 표시 (M4-A) — 몰래 난이도를 올리지 않게: 출격 준비 카드 한 장 + 판 시작 띠 한 줄
import * as TH from './threat.js?v=0.99.35';
import { kstDay } from './econ.js?v=0.99.35';
import { WEEKS } from './data/enemies.js?v=0.99.35';

let css = false;
function style() {
  if (css || typeof document === 'undefined') return; css = true; const s = document.createElement('style');
  s.textContent = `.thr{display:flex;flex-direction:column;gap:6px;margin:8px 0;padding:10px 12px;border-radius:14px;background:rgba(20,26,34,.72);border:1px solid rgba(255,140,90,.28)}
.thr .tl{display:flex;align-items:center;gap:8px}.thr .tl b{font-size:14px;color:#ffd2b0}.thr .pips{display:flex;gap:3px;margin-left:auto}.thr .pips i{width:8px;height:12px;border-radius:2px;background:rgba(255,255,255,.14)}
.thr .pips i.on{background:linear-gradient(#ffb070,#ff6a3a)}.thr small{font-size:12px;color:#cfd8de;line-height:1.35}.thr .wk{display:flex;gap:8px;align-items:flex-start;padding-top:6px;border-top:1px dashed rgba(255,255,255,.14)}
.thr .wk b{color:#ffe7a0;font-size:13px;white-space:nowrap}.thr .wk span{font-size:18px;line-height:1}`;
  document.head.appendChild(s);
}
/* 출격 준비: 오늘 위협 Lv · 늘어난 것 · 이번 주 변주 */
export function prepHtml(S, map) {
  style(); const day = S.day || kstDay(); const days = TH.daysOf(S) + (S.th?.last === day ? 0 : 1);
  const T = TH.threatOf(S, map, day, { days }); const W = TH.weekVar({ th: { days } }, day);
  const pips = Array.from({ length: 10 }, (_, i) => `<i class="${i < T.lv ? 'on' : ''}"></i>`).join('');
  return `<div class="thr" id="threatCard"><div class="tl"><b>오늘 위협 Lv ${T.lv}</b><div class="pips">${pips}</div></div><small>${T.lines.length ? T.lines.join(' · ') : '아직은 순한 편이에요 — 날이 갈수록, 시설이 늘수록 적도 영리해져요'}</small>${W ? `<div class="wk"><span>${W.icon}</span><div><b>${W.name}</b> <small>${W.txt} · ${W.left}일 남음</small></div></div>` : ''}</div>`;
}
/* 판 시작 띠 (판 상태 띠 다음) */
export function raidBand(ui, R) {
  const T = R.T; if (!T) return; const W = T.week ? WEEKS[T.week] : null;
  setTimeout(() => { if (!R.alive) return; ui.event(`⚠ 오늘 위협 Lv ${T.lv}${T.lines[0] ? ' · ' + T.lines[0] : ''}${W ? ` · ${W.icon} ${W.name}` : ''}`, 'warn'); }, 1500);
}
