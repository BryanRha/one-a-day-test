// 운영자(사업자) 정보 한 곳 — 전자상거래법 표시 · PG 심사 (2026-11-04 · team/biz/pg/research.md · checklist.md)
//   도메인(호스트)마다 다른 회사가 열 수 있게: oneaday.kr · test.oneaday.kr = 알앤지웍스(개인사업자) · sd.oneaday.* = SD인터랙티브(법인, 나중에 별도 인스턴스)
//   실제 번호 · 주소 · 전화는 저장소에 넣지 않음 → 서버 환경변수(OP_*)로 주입 · 여기 기본값은 자리표시('등록 예정' · '대표 확인 필요')
//     서버 /api/admin/config 의 op 가 환경변수 값을 돌려줌 (server/api/_lib/operator.js · 이름표 OP_FIELDS 와 아래 키가 같아야 함)
//   쓰는 곳: 정책 페이지(terms · privacy · refund · paid · ai · help — mount) · 앱 설정 시트 맨 아래 푸터(footerHTML) · 결제 화면 동의 문구(PAGES 경로)
export const TBD = '등록 예정', ASK = '대표 확인 필요';
const base = {
  brand: 'One a Day (원어데이)', ceo: ASK, bizNo: TBD, mailNo: TBD, addr: ASK, email: ASK, tel: ASK,
  hours: '평일 10:00~18:00 (점심 12:30~13:30 · 주말 · 공휴일 쉼)', privName: ASK, privContact: ASK,
  hosting: 'Vercel Inc. (서버 · 서울 지역)', since: TBD,
};
export const OPERATORS = {
  rng: { ...base, id: 'rng', name: '알앤지웍스', kind: '개인사업자' },
  sd: { ...base, id: 'sd', name: 'SD인터랙티브', kind: '법인', ceo: TBD, addr: TBD, email: TBD, tel: TBD, privName: TBD, privContact: TBD },
};
/* 호스트 → 운영자 (위에서부터 먼저 맞는 것 · 없으면 rng) — 서버 _lib/operator.js opId 와 같은 규칙 · 서버가 id 를 주면 그걸 따름 */
export const HOST_OP = [[/^sd[.-]/, 'sd']];
export const pickId = (host = location.hostname) => (HOST_OP.find(([re]) => re.test(host)) || [, 'rng'])[1];
/* 정책 페이지 (정적 주소 · 심사자가 링크로 바로 엶) — 앱 · 페이지 모두 뒤에 / 를 붙여 링크 */
export const PAGES = [['terms', '이용약관'], ['privacy', '개인정보처리방침'], ['refund', '환불 · 청약철회'], ['paid', '유료 서비스 안내'], ['ai', 'AI 생성 콘텐츠 안내'], ['help', '고객센터']];

let cur = null;
export const current = () => cur || (cur = { ...OPERATORS[pickId()] });
/* 서버 값 덮어쓰기 (아는 키만 · 글자만) */
export function apply(op) {
  if (!op || typeof op !== 'object') return current();
  const id = OPERATORS[op.id] ? op.id : pickId(), o = { ...OPERATORS[id] };
  for (const k of Object.keys(o)) if (k !== 'id' && typeof op[k] === 'string' && op[k].trim()) o[k] = op[k].trim().slice(0, 200);
  return (cur = o);
}
const SERVER = () => /(^|\.)oneaday\.kr$/.test(location.hostname) || location.hostname.endsWith('.vercel.app');
export async function load() {
  if (!SERVER()) return current();
  const c = await fetch('/api/admin/config').then(r => r.ok ? r.json() : null).catch(() => null);
  return apply(c && c.op);
}
/* 아직 자리표시인지 (화면에서 흐리게 · 사업자정보 확인 링크 숨김) */
export const isSet = v => !!v && v !== TBD && v !== ASK;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* 공정위 사업자정보 확인 (통신판매사업자 정보 공개) — 사업자번호 10자리일 때만 */
export const bizLink = o => { const n = String(o.bizNo || '').replace(/\D/g, ''); return n.length === 10 ? `https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${n}` : ''; };
const val = v => isSet(v) ? esc(v) : `<span class="optodo">${esc(v)}</span>`;
/* 사업자 정보 + 정책 링크 묶음 (앱 설정 맨 아래 · 정책 페이지 아래) · root: 정책 페이지까지의 경로 ('' = 앱 · '../' = 정책 페이지 안) */
export function footerHTML(o = current(), root = '') {
  const L = bizLink(o);
  return `<nav class="oplinks">${PAGES.map(([p, t]) => `<a href="${root}${p}/"${root ? '' : ' target="_blank" rel="noopener"'}>${t}</a>`).join('')}</nav>
    <p class="opinfo">상호 ${val(o.name)} (${esc(o.kind)}) · 대표 ${val(o.ceo)}<br>사업자등록번호 ${val(o.bizNo)}${L ? ` <a href="${L}" target="_blank" rel="noopener">사업자정보 확인</a>` : ''} · 통신판매업 신고 ${val(o.mailNo)}<br>
    주소 ${val(o.addr)}<br>고객센터 ${val(o.tel)} · ${val(o.email)} · ${esc(o.hours)}<br>개인정보 보호책임자 ${val(o.privName)} · 호스팅 ${esc(o.hosting)}</p>`;
}
/* 정책 페이지: [data-op=키] 칸 채우기 + 아래 푸터 + 위 목록에서 지금 페이지 표시 */
export function fill(o = current(), root = document) {
  root.querySelectorAll('[data-op]').forEach(e => { const v = o[e.dataset.op]; if (v == null) return; e.textContent = v; e.classList.toggle('optodo', !isSet(v)); });
  root.querySelectorAll('[data-op-mail]').forEach(e => { if (isSet(o.email)) e.href = 'mailto:' + o.email; else e.removeAttribute('href'); });
  const L = bizLink(o); root.querySelectorAll('[data-op-biz]').forEach(e => { e.hidden = !L; if (L) e.href = L; });
}
export async function mount() {
  const page = document.body.dataset.page;
  document.querySelectorAll('.pnav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === `../${page}/`));
  const on = document.querySelector('.pnav a.on'); if (on) { const n = on.parentElement; n.scrollLeft += on.getBoundingClientRect().left - n.getBoundingClientRect().left - 16; }   /* 폰: 지금 페이지 칩이 보이게 */
  const draw = o => { fill(o); const f = document.getElementById('opfoot'); if (f) f.innerHTML = footerHTML(o, '../'); };
  draw(current());
  draw(await load());
}
