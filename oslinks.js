// 원스토어 앱 안 링크 지킴이 (2026-11-28 대표 실서버 제보 「환불 정책 보고 돌아오니 로그인이 풀리고 '크롬으로 열기'가 나옴」)
//   원인: 원스토어 앱은 우리 화면을 자기 화면 안 iframe 으로 띄움 → target="_blank" 링크 · window.open 을 웹뷰가 '창 전체 이동'으로 처리 → 원스토어 틀이 사라지고
//   뒤로 가면 틀 밖 원어데이(최상위 · 저장 칸도 다름)로 돌아옴 → 원스토어 계정 · 연결 계정이 안 보이고 '앱 안 브라우저' 안내 · 웹 결제 길로 떨어짐
//   막는 법(한 곳): 원스토어 안(OS.looks)이면 셸 문서와 같은 주소 iframe(게임 · 너랑 · 안내 창) 안에서 틀을 벗기는 링크(새 창 · 최상위 창) 누름을 여기서 받음
//     우리 주소 페이지(약관 · 환불 · 고객센터 …) → 앱 안에 덮는 창(iframe)으로 엶 · 바깥 주소 → 이동하지 않고 주소를 복사해 알려 줌 · 같은 페이지 #해시는 그대로
//   window.open 은 바꾸지 않음(원스토어 SDK 가 쓸 수 있음) — 우리 코드가 바깥 주소를 열 때는 openOut() 을 씀 (전광판 링크 등)
import * as OS from './onestore.js?v=0.99.100';

const S = { on: false, toast: null };
const sameSite = u => u.origin === location.origin;
const say = m => { if (S.toast) S.toast(m); };

/* 덮는 창: 우리 안내 페이지를 원스토어 틀 안에서 보여 줌 · 닫기 · 뒤로 가기 없음(틀을 안 벗어남) */
export function openGuide(href) {
  const u = new URL(href, location.href); if (!sameSite(u)) return copyOut(u.href);
  let el = document.getElementById('osGuide');
  if (!el) {
    el = document.createElement('div'); el.id = 'osGuide';
    el.innerHTML = '<div class="bar"><button type="button" aria-label="닫기">✕</button></div><iframe title="안내"></iframe>';
    el.querySelector('button').onclick = () => { el.hidden = true; el.querySelector('iframe').src = 'about:blank'; };
    document.body.appendChild(el);
  }
  el.hidden = false; el.querySelector('iframe').src = u.pathname + u.search + u.hash;
}
async function copyOut(href) {
  try { await navigator.clipboard.writeText(href); say('원스토어 앱 안에서는 바깥 주소를 열 수 없어 주소를 복사했어요'); } catch { say('원스토어 앱 안에서는 바깥 주소를 열 수 없어요'); }
}
/* 링크 하나를 어떻게 할지: null = 그대로(같은 문서 안 이동) */
function route(a, doc) {
  const tg = (a.getAttribute('target') || '').toLowerCase(); if (!['_blank', '_top', '_parent', '_new'].includes(tg)) return null;   /* 틀을 벗기는 링크만 · 같은 창 이동(너랑 · 게임 안)은 그대로 */
  const raw = a.getAttribute('href'); if (!raw || raw.startsWith('#') || /^(javascript|mailto|tel|sms):/i.test(raw)) return null;
  const u = new URL(raw, doc.location.href);
  if (!/^https?:$/.test(u.protocol)) return null;
  if (!sameSite(u)) return () => copyOut(u.href);
  const inGuide = doc !== document && doc.defaultView && doc.defaultView.frameElement && doc.defaultView.frameElement.closest('#osGuide');
  if (inGuide) return () => { doc.location.href = u.pathname + u.search + u.hash; };   /* 안내 창 안에서는 그 창 안에서 넘어감 */
  return () => openGuide(u.href);
}
function guard(doc) {
  if (!doc || doc.__oadLinks) return; doc.__oadLinks = 1;
  doc.addEventListener('click', e => {
    const a = e.target && e.target.closest && e.target.closest('a[href]'); if (!a) return;
    const go = route(a, doc); if (!go) return;
    e.preventDefault(); e.stopPropagation(); go();
  }, true);
}
/* 같은 주소 iframe 이 열릴 때마다 그 안에도 붙임 (load 는 거품이 안 올라와 잡는 단계로 받음) */
function watchFrames() {
  document.addEventListener('load', e => { const f = e.target; if (f && f.tagName === 'IFRAME') { try { guard(f.contentDocument); } catch { /* 다른 주소 */ } } }, true);
}
export function start(toast) {
  S.toast = toast;
  if (S.on || !OS.looks) return; S.on = true;
  guard(document); watchFrames();
  document.documentElement.classList.add('in-os');   /* 원스토어 앱 안: 저장 · 공유 단추 숨김(ui.css · 대표 11-28 「그런 버튼이 안 보이게」) */
}
export const active = () => S.on;
/* 우리 코드가 새 창으로 열던 곳: 원스토어 안이면 위 규칙 · 밖이면 지금처럼 새 창 */
export function openOut(url) {
  if (!S.on) return window.open(url, '_blank', 'noopener');
  const u = new URL(url, location.href); return sameSite(u) ? openGuide(u.href) : copyOut(u.href);
}

/* 원스토어 앱 안 그림 저장 · 공유 (대표 11-28 실서버 제보 「다꾸 이미지 저장 · 공유가 안 돼요」): 웹뷰가 파일 내려받기 · 공유 창을 막아 눌러도 아무 일이 없음
   → 카드를 화면 가득 보여 주고 '화면을 캡처해 주세요' 안내 (폰 캡처는 늘 됨) · 같은 주소 게임 iframe 도 parent.OAD_SHOT 으로 부름 */
export function showShot(src) {
  let el = document.getElementById('osShot');
  if (!el) {
    el = document.createElement('div'); el.id = 'osShot';
    el.innerHTML = '<img alt="카드"><p>원스토어 앱에서는 사진첩 저장 · 공유가 막혀 있어요<br><b>지금 화면을 캡처해서 저장해 주세요</b><small>보통 전원 + 볼륨 아래 버튼을 함께 눌러요</small></p><button type="button">닫기</button>';
    el.querySelector('button').onclick = () => { el.hidden = true; };
    document.body.appendChild(el);
  }
  const img = el.querySelector('img'); if (src instanceof Blob) { const u = URL.createObjectURL(src); img.onload = () => URL.revokeObjectURL(u); img.src = u; } else img.src = src;
  el.hidden = false;
}
if (OS.looks) window.OAD_SHOT = showShot;
