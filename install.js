// 홈 화면에 추가: 환경을 알아내서 가장 쉬운 방법으로 안내
// - 안드로이드 크롬·삼성 인터넷·PC 크롬: 설치 창(beforeinstallprompt)을 버튼 한 번으로 띄움
// - 아이폰(사파리·크롬): 자동 설치가 불가 → 공유 버튼 → '홈 화면에 추가' 그림 안내
// - 카카오톡·네이버·인스타 등 앱 안 브라우저: 추가 불가 → 바깥 브라우저로 바로 열기
let deferred = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; document.dispatchEvent(new Event('oad:installable')); });
addEventListener('appinstalled', () => { deferred = null; localStorage.setItem('oad_installed', '1'); document.dispatchEvent(new Event('oad:installed')); });

const ua = navigator.userAgent;
export const env = {
  ios: /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  android: /Android/i.test(ua),
  kakao: /KAKAOTALK/i.test(ua),
  inApp: /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp|BAND|Snapchat|wv\)/i.test(ua),
  samsung: /SamsungBrowser/i.test(ua),
  iosChrome: /CriOS/i.test(ua),
  /* 아이폰 사파리 26부터 기본 화면(작은 탭)에 공유 버튼이 안 보이고 '⋯' 메뉴 안으로 들어감 — OS 버전은 18로 고정돼 사파리 버전(Version/26)으로 판단 */
  safari26: /Version\/(2[6-9]|[3-9]\d)/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua),
};
export const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true || localStorage.getItem('oad_installed') === '1';
export const canPrompt = () => !!deferred;

// 바깥 브라우저로 열기 (카카오톡은 전용 주소, 안드로이드는 크롬 인텐트) · 그 밖(아이폰 인스타 · 네이버 등)은 주소 복사 → Promise(복사 성공 여부) 돌려줌
export function openExternal() {
  const url = location.href.split('#')[0];
  if (env.kakao) { location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`; return; }
  if (env.android) { location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`; return; }
  return copyLink();
}
export async function copyLink() {
  try { await navigator.clipboard.writeText(location.href.split('#')[0]); return true; } catch { return false; }
}

// 실행: 설치 창을 띄울 수 있으면 바로, 아니면 안내 화면(html)을 돌려줌
export async function install() {
  if (deferred) {
    deferred.prompt();
    const r = await deferred.userChoice.catch(() => null);
    deferred = null;
    if (r && r.outcome === 'accepted') localStorage.setItem('oad_installed', '1');
    return null;
  }
  return guide();
}

const SHARE_IOS = '<svg viewBox="0 0 24 24" width="22" height="22" style="vertical-align:-5px"><path fill="none" stroke="#4DA3FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 3v12M7.5 7.5L12 3l4.5 4.5M6 11H5v10h14V11h-1"/></svg>';
const PLUS = '<svg viewBox="0 0 24 24" width="22" height="22" style="vertical-align:-5px"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>';
const DOTS = '<b style="font-size:20px;letter-spacing:-1px">⋮</b>';
const DOTS_H = '<b style="display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.15);font-size:16px;vertical-align:-7px">⋯</b>';

function steps(list) { return list.map((s, i) => `<div class="step"><div class="num">${i + 1}</div><div><b>${s[0]}</b>${s[1] ? `<p>${s[1]}</p>` : ''}</div></div>`).join(''); }

export function guide() {
  if (env.inApp) {
    const app = env.kakao ? '카카오톡' : '이 앱';
    return `<div class="intro"><h2>📲 홈 화면에 추가하기</h2>
      <p style="color:var(--sub);margin:6px 0 4px">${app} 안의 브라우저에서는 홈 화면에 추가할 수 없어요.<br>아래 버튼으로 ${env.ios ? '사파리' : '크롬'}에서 열어 주세요.</p>
      <div class="stack"><button class="btn" data-ext>🌐 ${env.ios ? '사파리' : '브라우저'}로 열기</button>
      <button class="btn ghost" data-copy>🔗 주소 복사하기</button></div>
      <p class="note">열린 브라우저에서 다시 ‘홈 화면에 추가’를 누르면 끝!</p></div>`;
  }
  if (env.ios) {
    /* 사파리 26: 주소창 옆 '⋯' → 공유 → (더 보기) → 홈 화면에 추가 · 그 전 사파리: 아래 가운데 공유 버튼 · 크롬: 주소창 오른쪽 공유 */
    const first = env.iosChrome ? [`주소창 오른쪽의 공유 버튼 ${SHARE_IOS} 누르기`, '']
      : env.safari26 ? [`주소창 오른쪽(또는 아래)의 ${DOTS_H} 버튼 누르기`, `공유 버튼 ${SHARE_IOS}이 바로 보이면 그걸 눌러도 돼요`]
      : [`화면 아래 가운데 공유 버튼 ${SHARE_IOS} 누르기`, `아래 줄이 안 보이면 화면을 살짝 아래로 내려 보세요`];
    const mid = env.safari26 && !env.iosChrome ? [[`‘공유’ ${SHARE_IOS} 누르기`, '']] : [];
    return `<div class="intro"><h2>📲 홈 화면에 추가하기</h2>
      <p style="color:var(--sub);margin:6px 0 4px">몇 번만 누르면 앱처럼 쓸 수 있어요</p>
      ${steps([first, ...mid, [`목록을 아래로 내려 ‘홈 화면에 추가’ ${PLUS} 누르기`, '안 보이면 맨 아래 ‘더 보기’ 또는 ‘작업 편집’을 눌러 찾아요'], ['‘웹 앱으로 열기’는 켠 채로 · 오른쪽 위 ‘추가’ 누르기', '홈 화면에 🌙 One a Day 아이콘이 생겨요']])}
      <p class="note">그래도 안 되면: 사파리가 아닌 다른 앱(카카오톡 등) 안에서 열었는지 확인하고, <b>사파리</b>에서 다시 열어 주세요.</p>
      <div class="stack"><button class="btn ghost" data-copy>🔗 주소 복사하기 (사파리에 붙여넣기)</button><button class="btn" data-close>알겠어요</button></div>
      ${env.iosChrome || env.safari26 ? '' : '<div class="ios-arrow">⬇</div>'}</div>`;
  }
  /* PC(마우스 · 폰 아님): 브라우저 주소창 · 메뉴의 '설치' 안내 */
  if (!env.android && matchMedia('(pointer:fine)').matches) {
    return `<div class="intro"><h2>💻 PC에 앱으로 설치하기</h2>
      <p style="color:var(--sub);margin:6px 0 4px">설치하면 바탕화면 · 작업 표시줄에서 매일 한 번에 열 수 있어요</p>
      ${steps([['크롬 · 엣지', `주소창 오른쪽의 설치 아이콘을 누르거나, 메뉴 ${DOTS} → ‘One a Day 설치’(앱 설치)`], ['맥 사파리', '메뉴 막대의 ‘파일’ → ‘Dock에 추가’'], ['그 밖의 브라우저', '설치를 지원하지 않으면 즐겨찾기(북마크)에 추가해 두세요']])}
      <div class="stack"><button class="btn" data-close>알겠어요</button></div></div>`;
  }
  const menu = env.samsung ? '아래쪽 메뉴(☰)' : `오른쪽 위 메뉴 ${DOTS}`;
  return `<div class="intro"><h2>📲 홈 화면에 추가하기</h2>
    <p style="color:var(--sub);margin:6px 0 4px">브라우저 메뉴에서 한 번만 누르면 돼요</p>
    ${steps([[`${menu} 누르기`, ''], ['‘홈 화면에 추가’ 또는 ‘앱 설치’ 누르기', ''], ['‘추가’ / ‘설치’ 누르기', '홈 화면에 🌙 One a Day 아이콘이 생겨요']])}
    <div class="stack"><button class="btn" data-close>알겠어요</button></div></div>`;
}
