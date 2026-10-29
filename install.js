// 홈 화면에 추가: 환경을 알아내서 가장 쉬운 방법으로 안내 (2026-10-28 설치 안내 개편 · team/dev/tasks/261028-install-guide)
// - 안드로이드 크롬 · 삼성 인터넷 · PC 크롬/엣지: 설치 창(beforeinstallprompt)을 버튼 한 번으로 띄움
// - 아이폰(사파리 · 크롬): 자동 설치 불가 → 휴대폰 그림 단계 안내(install-guide.js, 열 때만 불러옴)
// - 카카오톡 · 네이버 · 인스타 · 구글 앱 등 앱 안 브라우저: 추가 불가 → 바깥 브라우저로 열기(아이폰은 카카오 · 라인 말고는 실제로는 주소 복사)
// 판별은 detect(ua, platform, touch, standalone) 순수 함수 — tools/install_ua_test.mjs 로 UA 표 자동 시험
let deferred = (typeof window !== 'undefined' && window.__bip) || null;   /* index.html 머리의 짧은 스크립트가 먼저 받아 둔 설치 창 (ops A4) */
let bipAt = deferred ? Date.now() : 0, related = false;
const BAR_CSS = `.ig-bar { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; padding: 8px 8px 8px 10px; border-radius: 16px; background: linear-gradient(135deg, rgba(110,231,200,.16), rgba(122,155,255,.16)); border: 1px solid rgba(110,231,200,.35); }
.ig-bar .ico { width: 34px; height: 34px; border-radius: 10px; background: url('icons/icon_192.png') center/cover; flex: none; box-shadow: 0 2px 8px rgba(0,0,0,.4); }
.ig-bar .tx { flex: 1; font-size: 13px; color: #E6FFF8; line-height: 1.3; }
.ig-bar .tx b { font: 15px 'Jua'; display: block; color: #fff; }
.ig-bar button { border: 0; border-radius: 11px; padding: 8px 11px; font: 15px 'Jua'; background: var(--mint); color: #0B3A30; white-space: nowrap; }
.ig-bar .x { background: none; color: var(--sub); padding: 4px; font: 15px sans-serif; }`;
const LS = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 저장 불가 */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* */ } },
};
if (typeof window !== 'undefined') {
  /* 설치 창이 왔다 = 지금 이 브라우저에는 설치돼 있지 않음 → 예전 '설치함' 표시를 지움 (지웠다 다시 까는 사람, ops A1) */
  if (deferred) LS.del('oad_installed');
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; bipAt = Date.now(); LS.del('oad_installed'); document.dispatchEvent(new Event('oad:installable')); });
  /* 표시는 실제 설치 완료(appinstalled)에서만 켬 — '설치'를 눌렀지만 실패한 경우를 막음 (ops A2) */
  addEventListener('appinstalled', () => { deferred = null; LS.set('oad_installed', '1'); document.dispatchEvent(new Event('oad:installed')); });
  /* 안드로이드 크롬: 이미 설치했는지 (manifest related_applications 의 자기 자신) → 설치 창 대신 '이미 설치돼 있어요' (ops A5) */
  try { navigator.getInstalledRelatedApps && navigator.getInstalledRelatedApps().then(l => { related = !!(l && l.length); }).catch(() => {}); } catch { /* */ }
  /* 메인 얇은 배너 모양만 바로 (안내 화면 · 그림 모양은 install-guide.js 가 열 때 install-guide.css 로) */
  try { if (!document.querySelector('style[data-igbar]')) { const st = document.createElement('style'); st.dataset.igbar = '1'; st.textContent = BAR_CSS; document.head.appendChild(st); } } catch { /* */ }
}

/* ── 판별 (순수 함수) ── */
const APPS = /KAKAOTALK|KAKAOSTORY|NAVER|Instagram|FBAN|FBAV|FB_IAB|FBIOS|\bLine\/|DaumApps|everytimeApp|BAND\/|Snapchat|\bGSA\/|Barcelona|musical_ly|BytedanceWebview|TikTok|Twitter|Telegram|DaangnApp|Discord|Slack|; wv\)/i;
export function detect(ua = '', platform = '', touch = 0, standalone = false) {
  const ipadDesk = /Macintosh/.test(ua) && touch > 1;   /* 아이패드는 데스크톱 사파리 UA 를 씀 */
  const ios = /iPhone|iPad|iPod/i.test(ua) || ipadDesk || (platform === 'MacIntel' && touch > 1);
  const ipad = ios && (/iPad/.test(ua) || ipadDesk || (platform === 'MacIntel' && touch > 1));
  const android = !ios && /Android/i.test(ua);
  const kakao = /KAKAOTALK/i.test(ua), line = /\bLine\//i.test(ua);
  let inApp = APPS.test(ua);
  /* 아이폰 앱 속 WKWebView 는 대개 'Safari/' 가 없음 (사파리 · 크롬 · 파이어폭스 · 엣지는 있음). 설치 앱(standalone)도 없으니 제외 (ops C1) */
  if (ios && !inApp && !standalone && !/Safari\//.test(ua)) inApp = true;
  const samsung = /SamsungBrowser/i.test(ua), whale = /Whale\//i.test(ua), iosChrome = /CriOS/i.test(ua);
  const firefox = /FxiOS|Firefox\//i.test(ua), edge = /EdgiOS|EdgA\/|Edg\//i.test(ua);
  const safari = ios && !inApp && !iosChrome && !firefox && !edge && !whale && /Safari\//.test(ua);
  /* 사파리 26부터 OS 버전은 18로 고정 → 사파리 버전(Version/26)으로 판단 */
  const sv = (ua.match(/Version\/(\d+)/) || [])[1], ov = ua.match(/OS (\d+)_(\d+)/);
  const iosMajor = ov ? Number(ov[1]) : sv ? Number(sv) : 0, iosMinor = ov ? Number(ov[2]) : 0;
  const safari26 = safari && Number(sv) >= 26;
  const br = kakao ? 'kakao' : /NAVER/.test(ua) ? 'naver' : /Instagram/.test(ua) ? 'insta' : /BAND\//.test(ua) ? 'band' : line ? 'line' : /FBAN|FBAV|FB_IAB|FBIOS/.test(ua) ? 'fb'
    : /\bGSA\//.test(ua) ? 'gsa' : /Barcelona/.test(ua) ? 'threads' : /musical_ly|BytedanceWebview|TikTok/.test(ua) ? 'tiktok' : inApp ? (/; wv\)/.test(ua) ? 'wv' : 'other')
    : samsung ? 'samsung' : whale ? 'whale' : firefox ? 'firefox' : edge ? 'edge' : iosChrome || /Chrome\//.test(ua) ? 'chrome' : /Safari\//.test(ua) ? 'safari' : 'other';
  const osv = ios ? (sv && safari ? Number(sv) : iosMajor) : android ? Number((ua.match(/Android (\d+)/) || [])[1]) || 0 : 0;
  const pc = !ios && !android;
  let how;
  if (standalone) how = 'installed';
  else if (inApp) how = kakao ? 'inapp_kakao' : line ? 'inapp_line' : 'inapp_other';
  else if (ios) {
    const old = iosMajor > 0 && (iosMajor < 16 || (iosMajor === 16 && iosMinor < 4));   /* 16.3 이하는 사파리에서만 추가 (ops B1) */
    how = !safari && old ? 'ios_old_nonsafari' : iosChrome ? 'ios_chrome' : !safari ? 'ios_other' : ipad ? 'ios_ipad' : safari26 ? 'ios_safari26' : 'ios_safari';
  } else if (android) how = samsung ? 'and_samsung' : whale ? 'and_whale' : firefox ? 'and_firefox' : 'and_chrome_menu';
  else how = firefox ? 'unsupported' : /Safari\//.test(ua) && !/Chrome\//.test(ua) ? 'pc_safari' : 'pc_menu';
  return { how, br, osv, ios, ipad, android, pc, kakao, line, inApp, samsung, whale, firefox, iosChrome, safari, safari26 };
}

const nav = typeof navigator !== 'undefined' ? navigator : { userAgent: '', platform: '', maxTouchPoints: 0 };
const isStandalone = () => { try { return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || nav.standalone === true; } catch { return false; } };
export const env = detect(nav.userAgent, nav.platform, nav.maxTouchPoints, typeof window !== 'undefined' && isStandalone());
export const standalone = isStandalone;
/* 배너 · 넛지를 숨길지: 설치 앱으로 열림 · 이 브라우저에서 설치 완료(appinstalled) · '이미 추가했어요'(30일, ops F1) */
export const installed = () => isStandalone() || LS.get('oad_installed') === '1' || Number(LS.get('oad_install_done') || 0) > Date.now();
export const markDone = (days = 30) => LS.set('oad_install_done', String(Date.now() + days * 864e5));
export const clearMarks = () => { LS.del('oad_installed'); LS.del('oad_install_done'); };
export const canPrompt = () => !!deferred;
export const relatedInstalled = () => related;
export const bipTime = () => bipAt;
/* 지금 보여 줄 안내 종류 (기록의 how 값과 같음) */
export function how() {
  if (isStandalone()) return 'installed';
  if (deferred && !env.inApp) return env.pc ? 'pc_prompt' : 'prompt';
  if (related && env.android) return 'and_installed';
  return env.how;
}
/* 크롬 계열 안드로이드인데 설치 창이 아직 안 옴(페이지를 연 지 1분 안) → 첫 게임 뒤 권유를 미룸 (한 번뿐인 기회를 메뉴 안내로 쓰지 않게, ops A4) */
export const shouldWaitPrompt = () => env.android && !env.inApp && !env.firefox && !deferred && !related && !isStandalone() && (typeof performance === 'undefined' || performance.now() < 6e4);

/* 설치 앱 시작 주소에 실을 값: 원래 기기 번호(ref) · 안내 종류(ih) → 쿠키로 두면 서버(middleware)가 manifest start_url 에 붙임 (ops 3-3) */
export function rememberForStart(h) {
  try {
    const sec = location.protocol === 'https:' ? '; Secure' : '', did = LS.get('oad_did');
    if (did && /^[A-Za-z0-9-]{8,40}$/.test(did)) document.cookie = `oad_did=${did}; Path=/; Max-Age=${30 * 86400}; SameSite=Lax${sec}`;
    if (h && /^[a-z0-9_]{2,24}$/.test(h)) document.cookie = `oad_ih=${h}; Path=/; Max-Age=${7 * 86400}; SameSite=Lax${sec}`;
  } catch { /* */ }
}
/* 설치 앱으로 처음 열렸는지 (이 저장 공간에서 한 번만 참) → { ref, ih } · 앱이 install_open 기록 + 설치 완료 화면 */
export function firstOpen() {
  if (!isStandalone() || LS.get('oad_open_seen')) return null;
  LS.set('oad_open_seen', new Date().toISOString().slice(0, 10));
  const q = new URLSearchParams(location.search), ref = q.get('ref'), ih = q.get('ih');
  return { ref: ref && /^[A-Za-z0-9-]{8,40}$/.test(ref) ? ref : '', ih: ih && /^[a-z0-9_]{2,24}$/.test(ih) ? ih : '' };
}

// 바깥 브라우저로 열기 → 'opened' | 'copied' | 'failed'
//  카카오톡: 전용 주소(아이폰 · 안드로이드 모두 실제로 엶) · 라인: openExternalBrowser=1 · 안드로이드: 기본 브라우저 인텐트(크롬 고정 X, 안 되면 같은 주소 · ops C3) · 그 밖(아이폰 인스타 · 구글 앱 등): 주소 복사 (ops C2)
export async function openExt() {
  const url = location.href.split('#')[0];
  if (env.kakao) { location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`; return 'opened'; }
  if (env.line) { const u = new URL(url); u.searchParams.set('openExternalBrowser', '1'); location.href = u.toString(); return 'opened'; }
  if (env.android) { location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;S.browser_fallback_url=${encodeURIComponent(url)};end`; return 'opened'; }
  return (await copyLink()) ? 'copied' : 'failed';
}
/* 예전 방식(0.85.x app.js 호환): 열면 undefined, 복사면 Promise<성공 여부> */
export function openExternal() { if (env.kakao || env.line || env.android) { openExt(); return; } return copyLink(); }
export const extLabel = () => env.kakao || env.line ? (env.ios ? '사파리로 열기' : '브라우저로 열기') : env.android ? '브라우저로 열기' : '주소 복사';
export async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch { /* 옛 방식 */ }
  try { const a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok; } catch { return false; }
}
const cleanUrl = () => { const u = new URL(location.href.split('#')[0]); for (const k of ['utm_source', 'ref', 'ih', 'gk', 'openExternalBrowser']) u.searchParams.delete(k); return u.toString(); };
export const copyLink = () => copyText(cleanUrl());

// 실행: 설치 창을 띄울 수 있으면 바로(결과 'accepted' | 'dismissed' | 'error'), 없으면 null (→ 앱이 그림 안내를 엶)
export async function prompt() {
  if (!deferred) return null;
  const d = deferred; deferred = null;
  try { d.prompt(); const r = await d.userChoice; return r && r.outcome === 'accepted' ? 'accepted' : 'dismissed'; } catch { return 'error'; }
}
// 예전 방식(0.85.x app.js 호환): 설치 창이 있으면 띄우고 null, 없으면 글 안내 html
export async function install() { if (deferred) { await prompt(); return null; } return guide(); }

/* 메인 얇은 배너 (시안 b) — 앱이 오늘 탭 위에 넣음 · 버튼은 data-install / data-ext / data-hide-install (app.js 클릭 위임) */
export function bannerHTML(o = {}) {
  const reward = o.reward !== false;
  if (env.inApp) return `<div class="ig-bar"><i class="ico"></i><div class="tx"><b>${env.kakao ? '카톡' : '앱'} 안에서는 화면이 작아요</b>${env.ios ? '사파리' : '브라우저'}로 열면 홈 화면에도 추가돼요</div><button data-ext data-where="banner">${extLabel() === '주소 복사' ? '복사' : '열기'}</button><button class="x" data-hide-install aria-label="오늘 닫기">✕</button></div>`;
  return `<div class="ig-bar"><i class="ico"></i><div class="tx"><b>${env.pc ? 'PC에 앱으로 설치해 두기' : '내일 게임, 한 번에 열기'}</b>${reward ? '🎁 설치하고 열면 50골드' : env.pc ? '바탕화면에서 매일 한 번에' : '홈 화면에서 매일 한 번에'}</div><button data-install data-where="banner">${env.pc ? '설치' : '추가'}</button><button class="x" data-hide-install aria-label="오늘 닫기">✕</button></div>`;
}

/* 그림 안내 모듈 (열 때만 불러옴) */
let G = null;
export const ui = () => G || (G = import('./install-guide.js?v=0.92.5'));

/* ── 글 안내 (PC · 그림 모듈을 못 불러올 때의 폴백) ── */
const SHARE_IOS = '<svg viewBox="0 0 24 24" width="22" height="22" style="vertical-align:-5px"><path fill="none" stroke="#4DA3FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 3v12M7.5 7.5L12 3l4.5 4.5M6 11H5v10h14V11h-1"/></svg>';
const PLUS = '<svg viewBox="0 0 24 24" width="22" height="22" style="vertical-align:-5px"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>';
const DOTS = '<b style="font-size:20px;letter-spacing:-1px">⋮</b>';
const DOTS_H = '<b style="display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.15);font-size:16px;vertical-align:-7px">⋯</b>';
function steps(list) { return list.map((s, i) => `<div class="step"><div class="num">${i + 1}</div><div><b>${s[0]}</b>${s[1] ? `<p>${s[1]}</p>` : ''}</div></div>`).join(''); }

export function guide() {
  const h = how();
  if (env.inApp) {
    const app = env.kakao ? '카카오톡' : '이 앱';
    const copyOnly = !(env.kakao || env.line || env.android);
    return `<div class="intro"><h2>📲 홈 화면에 추가하기</h2>
      <p style="color:var(--sub);margin:6px 0 4px">${app} 안의 브라우저에서는 홈 화면에 추가할 수 없어요.<br>${copyOnly ? '주소를 복사해 사파리에 붙여넣어 주세요.' : `아래 버튼으로 ${env.ios ? '사파리' : '브라우저'}에서 열어 주세요.`}</p>
      <div class="stack">${copyOnly ? '' : `<button class="btn" data-ext>🌐 ${extLabel()}</button>`}
      <button class="btn${copyOnly ? '' : ' ghost'}" data-copy>🔗 주소 복사하기</button></div>
      <p class="note">열린 브라우저에서 다시 ‘홈 화면에 추가’를 누르면 끝!</p></div>`;
  }
  if (env.ios) {
    if (h === 'ios_old_nonsafari' || h === 'ios_other') return `<div class="intro"><h2>📲 홈 화면에 추가하기</h2><p style="color:var(--sub);margin:6px 0 4px">이 브라우저에서는 추가가 안 될 수 있어요. 주소를 복사해 <b>사파리</b>에서 열어 주세요.</p><div class="stack"><button class="btn" data-copy>🔗 주소 복사하기</button><button class="btn ghost" data-close>알겠어요</button></div></div>`;
    const first = env.iosChrome ? [`주소창 오른쪽의 공유 버튼 ${SHARE_IOS} 누르기`, '']
      : env.ipad ? [`오른쪽 위 공유 버튼 ${SHARE_IOS} 누르기`, '']
      : env.safari26 ? [`주소창 오른쪽(또는 아래)의 ${DOTS_H} 버튼 누르기`, `공유 버튼 ${SHARE_IOS}이 바로 보이면 그걸 눌러도 돼요`]
      : [`화면 아래 가운데 공유 버튼 ${SHARE_IOS} 누르기`, `아래 줄이 안 보이면 화면을 살짝 아래로 내려 보세요`];
    const mid = env.safari26 ? [[`‘공유’ ${SHARE_IOS} 누르기`, '']] : [];
    return `<div class="intro"><h2>📲 홈 화면에 추가하기</h2>
      <p style="color:var(--sub);margin:6px 0 4px">몇 번만 누르면 앱처럼 쓸 수 있어요</p>
      ${steps([first, ...mid, [`목록을 아래로 내려 ‘홈 화면에 추가’ ${PLUS} 누르기`, '안 보이면 맨 아래 ‘더 보기’ 또는 ‘작업 편집’을 눌러 찾아요'], ['‘웹 앱으로 열기’는 켠 채로 · 오른쪽 위 ‘추가’ 누르기', '홈 화면에 🌙 One a Day 아이콘이 생겨요']])}
      <p class="note">기록을 옮기려면 설치한 앱에서 로그인해 주세요. 아이폰은 사파리와 저장 공간이 따로예요.</p>
      <div class="stack"><button class="btn ghost" data-copy>🔗 주소 복사하기 (사파리에 붙여넣기)</button><button class="btn" data-close>알겠어요</button></div></div>`;
  }
  if (env.pc) {
    if (h === 'unsupported') return `<div class="intro"><h2>💻 PC에 앱으로 설치하기</h2><p style="color:var(--sub);margin:6px 0 4px">이 브라우저는 설치를 지원하지 않아요. 크롬이나 엣지에서 열어 주세요.</p><div class="stack"><button class="btn ghost" data-copy>🔗 주소 복사하기</button><button class="btn" data-close>알겠어요</button></div></div>`;
    return `<div class="intro"><h2>💻 PC에 앱으로 설치하기</h2>
      <p style="color:var(--sub);margin:6px 0 4px">설치하면 바탕화면 · 작업 표시줄에서 매일 한 번에 열 수 있어요</p>
      ${steps([['크롬 · 엣지', `주소창 오른쪽의 설치 아이콘을 누르거나, 메뉴 ${DOTS} → ‘One a Day 설치’(앱 설치)`], ['맥 사파리', '메뉴 막대의 ‘파일’ → ‘Dock에 추가’'], ['그 밖의 브라우저', '설치를 지원하지 않으면 즐겨찾기(북마크)에 추가해 두세요']])}
      <div class="stack"><button class="btn" data-close>알겠어요</button></div></div>`;
  }
  if (h === 'and_installed') return `<div class="intro"><h2>📲 이미 설치돼 있어요</h2><p style="color:var(--sub);margin:6px 0 4px">홈 화면의 🌙 One a Day 아이콘으로 열어 주세요.</p><div class="stack"><button class="btn" data-close>알겠어요</button></div></div>`;
  const menu = env.samsung ? '아래 오른쪽 메뉴(≡)' : `메뉴 ${DOTS}(위 또는 아래 오른쪽)`;
  const item = env.samsung ? '‘현재 페이지 추가’ → ‘홈 화면’' : '‘앱 설치’ 또는 ‘홈 화면에 추가’';
  return `<div class="intro"><h2>📲 홈 화면에 추가하기</h2>
    <p style="color:var(--sub);margin:6px 0 4px">브라우저 메뉴에서 한 번만 누르면 돼요</p>
    ${steps([[`${menu} 누르기`, ''], [`${item} 누르기`, ''], [env.samsung ? '‘추가’ 누르기' : '‘설치’ 누르기', env.samsung ? '' : '‘바로가기 만들기’가 아니에요']])}
    <div class="stack"><button class="btn" data-close>알겠어요</button></div></div>`;
}
