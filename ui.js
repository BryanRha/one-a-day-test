// 원어데이 새 화면 체계 조각 (2026-11-26 대표 승인 시안 3 '피트니스 진행형' · lab/ui-apple/3 · mock.js 의 아이콘 · 링 · 동전을 앱으로 옮김)
//   이모지 대신 직접 그린 선 아이콘 · 골드 동전(그라데이션은 index.html 의 #oadcg 하나를 같이 씀) · 진행 링(한 겹 · 세 겹)
//   쓰는 곳: hub.js(오늘) · app.js(머리줄 · 상세 · 골드 · 보관함 · 설정)
const P = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  tv: '<rect x="3" y="5.5" width="18" height="12.5" rx="2.6"/><path d="M8.5 21h7M10.5 9.6v4.8l4-2.4z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  cloud: '<path d="M7.5 18.5h10a4 4 0 00.6-7.95A5.5 5.5 0 007.4 9.1 4.7 4.7 0 007.5 18.5z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  flame: '<path d="M12 21c-4 0-6.5-2.7-6.5-6.3 0-3.6 3-5.6 3.8-9.7 2.4 1.4 3.4 3.6 3.6 5.4.9-.6 1.6-1.6 1.9-2.9 2 1.7 3.7 4.3 3.7 7.2C18.5 18.3 16 21 12 21z"/>',
  person: '<circle cx="12" cy="8.5" r="3.7"/><path d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6"/>',
  gift: '<rect x="3.5" y="8.5" width="17" height="4" rx="1"/><path d="M5 12.5v8h14v-8M12 8.5v12M12 8.5C10 4 6.5 5 7.5 7.2 8.2 8.6 12 8.5 12 8.5zM12 8.5c2-4.5 5.5-3.5 4.5-1.3-.7 1.4-4.5 1.3-4.5 1.3z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.4"/><path d="M8 10.5V8a4 4 0 018 0v2.5"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  chat: '<path d="M4.5 6.5a3 3 0 013-3h9a3 3 0 013 3v6.5a3 3 0 01-3 3H11l-4.5 4v-4a2.5 2.5 0 01-2-2.5z"/>',
  ticket: '<path d="M4 7.5A1.5 1.5 0 015.5 6h13A1.5 1.5 0 0120 7.5V10a2 2 0 000 4v2.5a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 16.5V14a2 2 0 000-4z"/><path d="M14.5 6.5v11" stroke-dasharray="1.6 2"/>',
  card: '<rect x="3" y="6" width="18" height="12.5" rx="2.4"/><path d="M3 10h18M7 15h4"/>',
  moon: '<path d="M19.5 14.5A7.5 7.5 0 019.5 4.5a7.5 7.5 0 1010 10z"/>',
  phone: '<rect x="7" y="2.8" width="10" height="18.4" rx="2.4"/><path d="M11 18h2"/>',
  /* 공통 랭킹 (2026-11-27): 트로피 · 사람들 · 반짝임 */
  trophy: '<path d="M8 4.5h8v5a4 4 0 01-8 0zM8 6H5v1.5a3 3 0 003 3M16 6h3v1.5a3 3 0 01-3 3M12 13.5v3.5M8.5 20.5h7M9.5 17h5"/>',
  people: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.7-3.1 2.9-4.8 5.5-4.8s4.8 1.7 5.5 4.8"/><path d="M15.5 5.6a3 3 0 010 5.8M17 14.9c1.9.5 3.1 2 3.5 4.6"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 2h-15zM10 20.5a2 2 0 004 0"/>',
  spark: '<path d="M12 3.5l1.9 5.6 5.6 1.9-5.6 1.9L12 18.5l-1.9-5.6L4.5 11l5.6-1.9z"/>',
};
export const ic = (k, cls = '') => `<svg class="u-ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[k] || ''}</svg>`;
/* 골드 동전 (직접 그림 · 🪙 대신) */
export const coin = (s = 16) => `<svg class="u-coin" width="${s}" height="${s}" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="url(#oadcg)"/><circle cx="10" cy="10" r="6.2" fill="none" stroke="#FFF3C4" stroke-opacity=".75" stroke-width="1.2"/><path d="M10 5.6l1.3 3.1 3.1 1.3-3.1 1.3L10 14.4l-1.3-3.1L5.6 10l3.1-1.3z" fill="#FFF6D6" fill-opacity=".95"/></svg>`;
/* 진행 링 한 겹 (값 0~1) · 색은 CSS 변수라 style 로 (사파리는 SVG 속성 안 var() 를 못 읽음)
   key 가 있으면 그 링이 마지막으로 그려진 값을 기억함 (2026-11-26 대표 "링이 두 번 움직여"):
   처음 보일 때만 0 → 값으로 차오르고, 늦게 온 값으로 다시 그릴 때는 같으면 멈춘 채로 · 바뀌면 지금 각도에서 새 각도로 이어서 (0부터 다시 안 그림)
   ringReset(): 화면에 새로 들어올 때(다른 탭에서 '오늘' · '보관함'으로) — 시안처럼 그때 한 번 다시 차오름 */
const RM = new Map(), NOW = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
export const ringReset = () => RM.clear();
/* 그 링의 애니메이션 상태: 처음이면 0 → 값(1.1초 · 0.15초 뒤) · 같은 값이면 하던 애니메이션을 그 자리에서 이어서(음수 지연) · 끝났으면 멈춤 · 값이 바뀌면 지금 값 → 새 값(0.8초) */
function ringAnim(key, len) {
  if (!key) return { cls: 'u-rf', from: 0, delay: null };
  const p = RM.get(key), t = NOW();
  let e;
  if (!p) e = { len, from: 0, t0: t + 150, dur: 1100, cls: 'u-rf' };
  else if (Math.abs(p.len - len) <= .5) e = p;
  else e = { len, from: p.len, t0: t, dur: 800, cls: 'u-rf u-rf2' };
  RM.set(key, e);
  if (t >= e.t0 + e.dur) return { cls: 'u-rf u-still', from: e.from, delay: null };
  return { cls: e.cls, from: e.from, delay: p ? Math.round(e.t0 - t) : null };
}
export const ring = (v, size, w, color, track, key) => {
  const r = (size - w) / 2, c = 2 * Math.PI * r, h = size / 2, len = c * Math.min(1, Math.max(0, v || 0));
  const an = v > 0 ? ringAnim(key, len) : (key && RM.set(key, { len: 0, from: 0, t0: 0, dur: 0, cls: 'u-rf' }), null);
  return `<svg class="u-rg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${h}" cy="${h}" r="${r}" fill="none" style="stroke:${track || 'var(--u-fill)'}" stroke-width="${w}"/>${an ? `<circle class="${an.cls}"${key ? ` data-rk="${key}"` : ''} cx="${h}" cy="${h}" r="${r}" fill="none" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${len.toFixed(2)} ${c.toFixed(2)}" style="stroke:${color};--c:${c.toFixed(2)};--from:${an.from.toFixed(2)}${an.delay != null ? `;animation-delay:${an.delay}ms` : ''}" transform="rotate(-90 ${h} ${h})"/>` : ''}</svg>`;
};
/* 링 세 겹: 바깥 게임 · 가운데 점방 · 안 너랑 (값이 null 이면 그 링은 바탕만 · 쉬는 서비스) */
export const rings = (sz, w, gap, vals, key) => {
  const cs = ['var(--u-game)', 'var(--u-fort)', 'var(--u-nr)'], bg = ['var(--u-tg)', 'var(--u-tf)', 'var(--u-tn)'];
  return `<div class="u-rings" style="width:${sz}px;height:${sz}px">${vals.map((v, i) => { const s = sz - i * 2 * (w + gap); return `<div style="inset:${i * (w + gap)}px;color:${cs[i]}">${ring(v || 0, s, w, cs[i], bg[i], key ? key + ':' + i : undefined)}</div>`; }).join('')}</div>`;
};
