// 설치 안내 화면 (2026-10-28 · 시안 team/dev/tasks/261028-install-guide/mock/mock.html 을 그대로 옮김)
//   휴대폰 그림(실제 브라우저를 단순하게 그린 HTML/SVG) 위에 고리 · 손가락 · 물결로 '여기 누르세요' · 한 장에 한 단계
//   openGuide(how)  환경별 단계 안내      openOffer(kind)  권유 시트(첫 게임 끝 · 2일째 · 3일 연속)
//   openInstalled()  설치 앱 첫 실행 화면  openHelp() · openDiag()  '설치가 안 돼요' · 설정 진단
//   열 때만 불러옴(install.js ui()) · 모양은 install-guide.css · 기록은 track.js
import * as I from './install.js?v=0.92.3';
import { track } from './track.js?v=0.92.3';

/* ── 모양 불러오기 ── */
let cssP = null;
const css = () => cssP || (cssP = new Promise(res => {
  if (document.querySelector('link[data-igcss]')) return res();
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'install-guide.css'; l.dataset.igcss = '1';
  l.onload = l.onerror = () => res(); document.head.appendChild(l);
}));
const T = (n, p) => { try { track(n, { br: I.env.br, osv: I.env.osv, ...p }); } catch { /* */ } };

// ── 아이콘 ──
const P = d => `<span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg></span>`;
const IC = {
  share: P('<path d="M12 3v12M7.5 7.5L12 3l4.5 4.5M6 11H5v10h14V11h-1"/>'),
  dotsH: P('<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>'),
  dotsV: P('<circle cx="12" cy="5" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.7" fill="currentColor" stroke="none"/>'),
  menu: P('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  back: P('<path d="M15 5l-7 7 7 7"/>'), fwd: P('<path d="M9 5l7 7-7 7"/>'),
  plusSq: P('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/>'),
  plus: P('<path d="M12 5v14M5 12h14"/>'),
  book: P('<path d="M4 5c3-1.5 5.5-1.5 8 0v14c-2.5-1.5-5-1.5-8 0zM12 5c2.5-1.5 5-1.5 8 0v14c-3-1.5-5.5-1.5-8 0z"/>'),
  tabs: P('<rect x="3" y="7" width="13" height="13" rx="3"/><path d="M8 3.5h9.5a3 3 0 013 3V16"/>'),
  home: P('<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>'),
  star: P('<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>'),
  reload: P('<path d="M20 11a8 8 0 10-2.3 5.7M20 4v7h-7"/>'),
  x: P('<path d="M6 6l12 12M18 6L6 18"/>'),
  lock: P('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
  copy: P('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>'),
  find: P('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>'),
  glasses: P('<circle cx="7" cy="14" r="3.5"/><circle cx="17" cy="14" r="3.5"/><path d="M10.5 14h3"/>'),
  print: P('<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>'),
  dl: P('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  hist: P('<path d="M3 12a9 9 0 103-6.7L3 8M3 3v5h5M12 7v5l3 2"/>'),
  globe: P('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>'),
  install: P('<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M12 7v7M9 11l3 3 3-3"/>'),
  moon: P('<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>'),
  gear: P('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'),
  shield: P('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'),
  safari: P('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
  aA: '<span style="font-size:12px;font-weight:600">가<small style="font-size:9px">가</small></span>',
};
const FINGER = `<svg class="finger" viewBox="0 0 24 24"><path fill="#fff" stroke="#14102E" stroke-width=".9" stroke-linejoin="round" d="M10 7.5c0-.83.67-1.5 1.5-1.5S13 6.67 13 7.5v6h1.3c.19 0 .37.04.54.11l4.54 2.26c.53.22.91.76.91 1.38 0 .06-.01.13-.02.2l-.75 5.27c-.11.73-.69 1.28-1.44 1.28H11.3c-.41 0-.79-.17-1.06-.44L5.3 18.6l.79-.8c.2-.2.48-.33.79-.33.09 0 .16.02.24.03l2.88.6z"/></svg>`;

// ── 미니 화면 조각 (300×640 기준) ──
const SB = dark => `<div class="island"></div><div class="sb${dark ? ' dark' : ''}"><span>9:41</span><span class="r"><i class="sig"></i><span style="font-size:11px">5G</span><i class="bat"></i></span></div>`;
const SBA = dark => `<div class="sb${dark ? ' dark' : ''}"><span>9:41</span><span class="r">▾ ▴ <i class="bat"></i></span></div>`;
const page = (o = {}) => `<div class="mp" style="${o.pt ? `padding-top:${o.pt}px` : ''}"><div class="mbr">🌙 <b>One a Day</b></div>
  ${o.banner ? `<div class="mban"><i class="ico"></i><span>홈 화면에 추가하면 골드 50</span><b ${o.banner === 'hl' ? 'data-hl' : ''}>${o.bannerBtn || '추가하기'}</b></div>` : ''}
  ${o.copy ? `<div class="mpanel"><div class="h">${o.copy === 1 ? '이 앱 안에서는 추가가 안 돼요' : o.copy}</div><p>주소를 복사해 사파리에 붙여넣어 주세요</p><div class="mbtn" data-hl>🔗 주소 복사</div><div class="gh">그다음 사파리를 열어요</div></div>` : ''}
  ${o.panel ? `<div class="mpanel"><div class="h">${o.app || '카카오톡'} 안에서는 추가가 안 돼요</div><p>${o.panel}에서 열면 홈 화면에 추가할 수 있어요</p><div class="mbtn" data-hl>🌐 ${o.panel}로 열기</div><div class="gh">🔗 주소 복사하기</div></div>` : ''}
  <div class="mhero"><div class="c"></div><div class="t">${o.title || '오늘의 게임'}<div class="mbtn">▶ 오늘의 게임 시작</div></div></div></div>`;
const s26bar = (hlDots, top) => `<div class="s26bar${top ? ' top' : ''}"><div class="circ glass">${IC.back}</div><div class="url glass">${IC.aA}<span>oneaday.kr</span></div><div class="circ glass" ${hlDots ? 'data-hl' : ''}>${IC.dotsH}</div></div><div class="homebar"></div>`;
const s26pop = () => `<div class="pop glass"><div class="it" data-hl><span>공유</span>${IC.share}</div><div class="it"><span>북마크 추가</span>${IC.book}</div><div class="it"><span>즐겨찾기에 추가</span>${IC.star}</div><div class="it"><span>읽기 목록에 추가</span>${IC.glasses}</div><div class="it"><span>페이지에서 찾기</span>${IC.find}</div><div class="it"><span>새로운 탭</span>${IC.plus}</div></div>`;
const shareSheet = () => `<div class="share"><div class="hd"><i class="ico"></i><div>One a Day · 하루 한 게임<small>oneaday.kr · 옵션 ›</small></div><span class="cx">✕</span></div>
  <div class="apps"><div><i style="background:#34C759"></i>메시지</div><div><i style="background:#FEE500"></i>카카오톡</div><div><i style="background:#3D8BFF"></i>메일</div><div><i style="background:#FFD54A"></i>메모</div></div>
  <div class="grp"><div class="row faded"><span>복사</span>${IC.copy}</div><div class="row faded"><span>읽기 목록에 추가</span>${IC.glasses}</div><div class="row faded"><span>북마크 추가</span>${IC.book}</div><div class="row faded"><span>즐겨찾기에 추가</span>${IC.star}</div><div class="row faded"><span>페이지에서 찾기</span>${IC.find}</div><div class="row" data-hl><span>홈 화면에 추가</span>${IC.plusSq}</div><div class="row faded"><span>마크업</span>${IC.print}</div></div></div>
  <div class="scrollhint"><svg viewBox="0 0 18 40"><path d="M9 38V4M3 10l6-6 6 6" fill="none" stroke="#FFC93C" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>밀어<br>올리기</div>`;
const addSheet = toggle => `<div class="addsh"><div class="nv"><span>취소</span><b>홈 화면에 추가</b><span class="ok" data-hl>추가</span></div>
  <div class="card"><i class="ico"></i><div class="f"><b>One a Day</b><small>https://oneaday.kr/</small></div></div>
  <div class="note">홈 화면에 아이콘이 추가되어 바로 열 수 있어요.</div>
  ${toggle ? `<div class="tg" data-soft><span>웹 앱으로 열기</span><i class="tog"></i></div>` : ''}</div>`;
const homeIOS = saf => `<div class="home">${SB()}<div class="grid">${Array.from({ length: 14 }, (_, i) => i === 9 && !saf ? '<div class="me" data-hl><i></i>One a Day</div>' : '<div><i></i>&nbsp;</div>').join('')}</div><div class="dock"><i></i><i></i>${saf ? `<i class="saf" data-hl>${IC.safari}</i>` : '<i></i>'}<i></i></div><div class="homebar"></div></div>`;
const homeAnd = () => `<div class="home and">${SBA()}<div class="grid" style="margin-top:20px">${Array.from({ length: 14 }, (_, i) => i === 9 ? '<div class="me" data-hl><i></i>One a Day</div>' : '<div><i></i>&nbsp;</div>').join('')}</div><div class="dock"><i></i><i></i><i></i><i></i></div><div class="navbar" style="background:transparent"></div></div>`;
const oldSafari = (hl, o) => `${page(o)}<div class="obot"><div class="url">${IC.aA} oneaday.kr</div><div class="tb"><span class="ic">${IC.back}</span><span class="ic off">${IC.fwd}</span><span class="ic" ${hl ? 'data-hl' : ''}>${IC.share}</span><span class="ic">${IC.book}</span><span class="ic">${IC.tabs}</span></div></div><div class="homebar dk"></div>`;
const iosChrome = (hl, o = {}) => `<div class="otop" style="height:92px"><div class="url"><span class="ic" style="padding:0">${IC.lock}</span><span class="t">oneaday.kr</span><span class="ic" ${hl ? 'data-hl' : ''}>${IC.share}</span></div></div>${page({ ...o, pt: 104 })}<div class="obot chrome" style="padding-top:12px"><div class="tb"><span class="ic">${IC.back}</span><span class="ic off">${IC.fwd}</span><span class="ic">${IC.plus}</span><span class="ic">${IC.tabs}</span><span class="ic">${IC.dotsH}</span></div></div><div class="homebar dk"></div>`;
const andTop = hl => `<div class="atop"><span class="ic" style="padding:3px">${IC.home}</span><div class="url"><span class="ic" style="padding:0;width:16px;height:16px">${IC.lock}</span>oneaday.kr</div><span class="tabn">1</span><span class="ic" ${hl ? 'data-hl' : ''}>${IC.dotsV}</span></div>`;
const andMenu = () => `<div class="amenu"><div class="ic-row">${IC.fwd}${IC.star}${IC.dl}${IC.reload}</div><div class="it faded">${IC.plus}새 탭</div><div class="it faded">${IC.hist}기록</div><div class="it faded">${IC.dl}다운로드</div><div class="it faded">${IC.share}공유…</div><div class="it faded">${IC.find}페이지에서 찾기</div><div class="it" data-hl>${IC.install}앱 설치</div><div class="it faded">${IC.globe}데스크톱 사이트</div><div class="it faded">${IC.gear}설정</div></div>`;
const andDlg = () => `<div class="adim"></div><div class="adlg"><h4>앱을 설치할까요?</h4><div class="who"><i></i><div><b>One a Day</b><small>oneaday.kr</small></div></div><div class="bt"><span>취소</span><span class="pri" data-hl>설치</span></div></div>`;
const andChoice = () => `<div class="adim"></div><div class="adlg"><h4>홈 화면에 추가</h4><div class="who"><i></i><div><b>One a Day</b><small>oneaday.kr</small></div></div><div class="opt" data-hl><i class="rad on"></i><div><b>설치</b><small>앱처럼 꽉 찬 화면으로 열려요</small></div></div><div class="opt faded"><i class="rad"></i><div><b>바로가기 만들기</b><small>브라우저 화면으로 열려요</small></div></div><div class="bt"><span>취소</span><span class="pri">설치</span></div></div>`;
const samTop = () => `<div class="stop"><div class="url"><span class="ic" style="width:16px;height:16px">${IC.lock}</span>oneaday.kr</div></div>`;
const samBot = hl => `<div class="sbot"><span class="ic">${IC.back}</span><span class="ic" style="color:#bbb">${IC.fwd}</span><span class="ic">${IC.home}</span><span class="ic">${IC.star}</span><span class="ic">${IC.tabs}</span><span class="ic" ${hl ? 'data-hl' : ''}>${IC.menu}</span></div>`;
const samPanel = () => `<div class="adim"></div><div class="spanel"><div class="grid">${[['star', '북마크'], ['hist', '방문 기록'], ['dl', '다운로드'], ['plusSq', '현재 페이지 추가', 1], ['shield', '광고 차단'], ['moon', '다크 모드'], ['find', '페이지 내 검색'], ['gear', '설정']].map(([i, t, h]) => `<div ${h ? 'data-hl' : 'class="faded"'}>${IC[i]}${t}</div>`).join('')}</div><div class="dots"><i class="on"></i><i></i></div><div class="bt">${IC.back}${IC.home}${IC.star}${IC.tabs}${IC.x}</div></div>`;
const samList = () => `<div class="adim"></div><div class="slist"><h4>현재 페이지 추가</h4><div class="it faded">${IC.star}북마크</div><div class="it faded">${IC.plus}빠른 실행</div><div class="it" data-hl>${IC.home}홈 화면</div><div class="it faded">${IC.dl}저장된 페이지</div></div>`;
const samDlg = () => `<div class="adim"></div><div class="adlg"><h4>홈 화면에 추가</h4><div class="who"><i style="border-radius:12px"></i><div><b>One a Day</b><small>oneaday.kr</small></div></div><div class="bt"><span>취소</span><span class="pri" data-hl>추가</span></div></div>`;
const gTop = sub => `<div class="ktop" style="background:#F1F3F4"><span class="ic">${IC.x}</span><div class="t">oneaday.kr<small>${sub || '구글 앱 · 인스타 · 스레드 등'}</small></div><span class="ic">${IC.dotsH}</span></div>`;
const pasteBar = () => `<div class="paste" data-hl>붙여넣고 이동</div><div class="s26bar"><div class="circ glass">${IC.back}</div><div class="url glass" style="justify-content:flex-start;padding-left:16px;color:#999">검색 또는 웹 사이트 이름</div><div class="circ glass">${IC.dotsH}</div></div><div class="homebar dk"></div>`;
const kTop = andHl => `<div class="ktop"><span class="ic">${IC.x}</span><div class="t">One a Day · 하루 한 게임<small>oneaday.kr</small></div><span class="ic" ${andHl ? 'data-hl' : ''}>${andHl !== undefined ? IC.dotsV : IC.share}</span></div>`;
const kBot = hl => `<div class="kbot"><span class="ic">${IC.back}</span><span class="ic off">${IC.fwd}</span><span class="ic">${IC.reload}</span><span class="ic">${IC.share}</span><span class="ic" ${hl ? 'data-hl' : ''}>${IC.dotsH}</span></div><div class="homebar dk"></div>`;
const kSheet = () => `<div class="adim"></div><div class="ksheet"><div class="g"><div class="it faded">채팅방에 공유</div><div class="it faded">링크 복사</div><div class="it" data-hl>Safari로 열기</div><div class="it faded">새로고침</div></div><div class="g"><div class="it cancel">취소</div></div></div>`;
const kAndMenu = () => `<div class="amenu" style="top:30px"><div class="it faded">${IC.reload}새로고침</div><div class="it faded">${IC.share}공유하기</div><div class="it faded">${IC.copy}링크 복사</div><div class="it" data-hl>${IC.globe}다른 브라우저로 열기</div></div>`;
const ios = h => `<div class="scr">${h}</div>`, and = h => `<div class="scr android and">${h}</div>`;

// ── 단계 표 ──  t: 한 문장 · s: 보조 한 줄 · sc: 그림 · act: 이 단계에서 실제로 할 일(버튼) · last: 마지막 확인 장
const done = a => ({ last: 1, t: '홈 화면에 🌙 아이콘이 생겼나요?', s: a ? '아이콘으로 열면 골드 50을 드려요' : '아이콘으로 열고 로그인하면 기록이 그대로 · 골드 50', sc: a ? and(homeAnd()) : ios(homeIOS()) });
const otherSteps = (head, sub) => [
  { t: '‘주소 복사’를 누르세요', s: head === 1 ? '이 앱 안에서는 추가가 안 돼요' : '이 브라우저에서는 추가가 안 될 수 있어요', sc: ios(`${SB(1)}${gTop(sub)}${page({ pt: 98, copy: head })}`), act: 'copy' },
  { t: '사파리 앱을 여세요', s: '홈 화면의 나침반 아이콘이에요', sc: ios(`${homeIOS(1)}<div class="toastm">🔗 주소를 복사했어요</div>`) },
  { t: '주소창을 꾹 눌러 ‘붙여넣고 이동’', s: '', sc: ios(`${SB()}<div class="mp" style="background:#fff"></div>${pasteBar()}`) },
  { t: '‘추가하기’를 누르세요', s: '이어서 사파리 안내가 나와요', sc: ios(`${SB()}${page({ banner: 'hl' })}${s26bar()}`), end: 1 }];
const andApp = (app, btn) => [
  { t: `‘${btn}로 열기’를 누르세요`, s: `${app} 안에서는 추가가 안 돼요`, sc: and(`${SBA(1)}${kTop(false)}${page({ pt: 88, panel: btn, app })}<div class="navbar"></div>`), act: 'ext' },
  { t: '안 열리면 ⋮ → ‘다른 브라우저로 열기’', s: '', sc: and(`${SBA(1)}${kTop(false)}${page({ pt: 88, panel: btn, app })}<div class="adim" style="background:rgba(0,0,0,.2)"></div>${kAndMenu()}<div class="navbar"></div>`) },
  { t: '브라우저에서 ‘설치’를 누르세요', s: '이어서 안내가 나와요', sc: and(`${SBA(1)}${andTop()}${page({ banner: 'hl', bannerBtn: '설치' })}<div class="navbar"></div>`), end: 1 }];
const andSteps = [
  { t: '‘설치’ 버튼을 누르세요', s: '', sc: and(`${SBA(1)}${andTop()}${page({ banner: 'hl', bannerBtn: '설치' })}<div class="navbar"></div>`), act: 'prompt' },
  { t: '뜬 창에서 ‘설치’를 누르세요', s: '아이콘이 생기면 끝이에요', sc: and(`${SBA(1)}${andTop()}${page({ banner: 1, bannerBtn: '설치' })}${andDlg()}<div class="navbar"></div>`) },
  { t: '창이 안 뜨면 오른쪽 위 ⋮ 를 누르세요', s: '', sc: and(`${SBA(1)}${andTop(1)}${page()}<div class="navbar"></div>`) },
  { t: '‘앱 설치’를 누르세요', s: '‘홈 화면에 추가’로 보일 수도 있어요', sc: and(`${SBA(1)}${andTop()}${page()}<div class="adim" style="background:rgba(0,0,0,.2)"></div>${andMenu()}<div class="navbar"></div>`) },
  { t: '‘설치’를 고르세요', s: '‘바로가기 만들기’가 아니에요', sc: and(`${SBA(1)}${andTop()}${page()}${andChoice()}<div class="navbar"></div>`) },
  done(1)];
const GUIDES = {
  safari26: { name: '아이폰 · 사파리', how: 'ios_safari26', steps: [
    { lay: 1, t: l => l === 'top' ? '위쪽 주소창 옆 ⋯ 를 누르세요' : l === 'bottom' ? '아래 가운데 공유 버튼을 누르세요' : '오른쪽 아래 ⋯ 를 누르세요', s: l => l === 'bottom' ? '공유 버튼이 보이면 바로 3번으로 가요' : '내 화면과 같은 그림을 위에서 골라요',
      sc: l => l === 'top' ? ios(`${SB(1)}<div class="s26top"></div>${page({ pt: 100 })}${s26bar(1, 1)}<div class="homebar"></div>`) : l === 'bottom' ? ios(`${SB()}${oldSafari(1)}`) : ios(`${SB()}${page()}${s26bar(1)}`) },
    { t: '‘공유’를 누르세요', s: '', sc: ios(`${SB()}${page()}<div class="adim" style="background:rgba(0,0,0,.25)"></div>${s26bar()}${s26pop()}`) },
    { t: '아래로 내려 ‘홈 화면에 추가’를 누르세요', s: '안 보이면 목록 맨 아래 ‘더 보기’', sc: ios(`${SB()}${page()}<div class="adim"></div>${shareSheet()}`) },
    { t: '‘웹 앱으로 열기’는 켠 채로 ‘추가’', s: '초록색이면 켜진 거예요', sc: ios(`${SB()}${page()}<div class="adim"></div>${addSheet(1)}`) },
    done() ] },
  safariOld: { name: '아이폰 · 사파리(iOS 18 이하)', how: 'ios_safari', steps: [
    { t: '아래 가운데 공유 버튼을 누르세요', s: '아래 줄이 안 보이면 화면을 살짝 내려요', sc: ios(`${SB()}${oldSafari(1)}`) },
    { t: '아래로 내려 ‘홈 화면에 추가’를 누르세요', s: '안 보이면 목록 맨 아래 ‘작업 편집’', sc: ios(`${SB()}${oldSafari()}<div class="adim"></div>${shareSheet()}`) },
    { t: '오른쪽 위 ‘추가’를 누르세요', s: '', sc: ios(`${SB()}${oldSafari()}<div class="adim"></div>${addSheet(0)}`) },
    done() ] },
  ipad: { name: '아이패드 · 사파리', how: 'ios_ipad', steps: [
    { t: '오른쪽 위 공유 버튼을 누르세요', s: '주소창 오른쪽에 있어요', sc: ios(`${SB(1)}${iosChrome(1)}`) },
    { t: '아래로 내려 ‘홈 화면에 추가’를 누르세요', s: '안 보이면 목록 맨 아래 ‘작업 편집’', sc: ios(`${SB(1)}${iosChrome()}<div class="adim"></div>${shareSheet()}`) },
    { t: '오른쪽 위 ‘추가’를 누르세요', s: '', sc: ios(`${SB(1)}${iosChrome()}<div class="adim"></div>${addSheet(0)}`) },
    done() ] },
  iosChrome: { name: '아이폰 · 크롬', how: 'ios_chrome', steps: [
    { t: '주소창 오른쪽 공유 버튼을 누르세요', s: '', sc: ios(`${SB(1)}${iosChrome(1)}`) },
    { t: '아래로 내려 ‘홈 화면에 추가’를 누르세요', s: '', sc: ios(`${SB(1)}${iosChrome()}<div class="adim"></div>${shareSheet()}`) },
    { t: '오른쪽 위 ‘추가’를 누르세요', s: '', sc: ios(`${SB(1)}${iosChrome()}<div class="adim"></div>${addSheet(0)}`) },
    done() ] },
  android: { name: '안드로이드 · 크롬', how: 'prompt', steps: andSteps },
  androidMenu: { name: '안드로이드 · 크롬', how: 'and_chrome_menu', steps: andSteps.slice(2).map((s, i) => i === 0 ? { ...s, t: '오른쪽 위 ⋮ 를 누르세요', s: '툴바가 아래면 아래 오른쪽이에요' } : s) },
  samsung: { name: '삼성 인터넷', how: 'and_samsung', steps: [
    { t: '오른쪽 아래 ☰ 를 누르세요', s: '툴바를 위로 옮겼다면 위 오른쪽이에요', sc: and(`${SBA(1)}${samTop()}${page({ pt: 92 })}${samBot(1)}<div class="navbar"></div>`) },
    { t: '‘현재 페이지 추가’를 누르세요', s: '안 보이면 옆으로 넘겨 보세요', sc: and(`${SBA(1)}${samTop()}${page({ pt: 92 })}${samPanel()}<div class="navbar"></div>`) },
    { t: '‘홈 화면’을 누르세요', s: '', sc: and(`${SBA(1)}${samTop()}${page({ pt: 92 })}${samBot()}${samList()}<div class="navbar"></div>`) },
    { t: '‘추가’를 누르세요', s: '', sc: and(`${SBA(1)}${samTop()}${page({ pt: 92 })}${samBot()}${samDlg()}<div class="navbar"></div>`) },
    done(1) ] },
  andInstalled: { name: '안드로이드 · 크롬', how: 'and_installed', steps: [
    { last: 1, t: '이미 설치돼 있어요', s: '홈 화면의 🌙 아이콘으로 열어 주세요', sc: and(homeAnd()) } ] },
  inappIOS: { name: '카카오톡 안(아이폰)', how: 'inapp_kakao', ios: 1, steps: [
    { t: '‘사파리로 열기’를 누르세요', s: '카카오톡 안에서는 추가가 안 돼요', sc: ios(`${SB(1)}${kTop()}${page({ pt: 98, panel: '사파리' })}${kBot()}`), act: 'ext' },
    { t: '안 열리면 오른쪽 아래 ⋯ 를 누르세요', s: '', sc: ios(`${SB(1)}${kTop()}${page({ pt: 98, panel: '사파리' })}${kBot(1)}`) },
    { t: '‘Safari로 열기’를 누르세요', s: '', sc: ios(`${SB(1)}${kTop()}${page({ pt: 98, panel: '사파리' })}${kBot()}${kSheet()}`) },
    { t: '사파리에서 ‘추가하기’를 누르세요', s: '이어서 사파리 안내가 나와요', sc: ios(`${SB()}${page({ banner: 'hl' })}${s26bar()}`), end: 1 } ] },
  inappOther: { name: '다른 앱 안(아이폰)', how: 'inapp_other', ios: 1, steps: otherSteps(1) },
  iosOther: { name: '다른 브라우저(아이폰)', how: 'ios_other', ios: 1, steps: otherSteps('이 브라우저에서는 추가가 안 될 수 있어요', '웨일 · 파이어폭스 · 엣지 · 네이버') },
  inappAnd: { name: '카카오톡 안(안드로이드)', how: 'inapp_kakao', steps: andApp('카카오톡', '크롬') },
  inappAndOther: { name: '다른 앱 안(안드로이드)', how: 'inapp_other', steps: andApp('이 앱', '브라우저') },
};
/* 환경 칩(▾)에서 고를 수 있는 것 — 판별이 틀렸을 때의 탈출구 */
const PICK = ['safari26', 'safariOld', 'iosChrome', 'android', 'samsung', 'inappIOS', 'inappAnd', 'inappOther'];
export function guideOf(h) {
  const e = I.env;
  return { ios_safari26: 'safari26', ios_safari: 'safariOld', ios_ipad: 'ipad', ios_chrome: 'iosChrome', ios_other: 'iosOther', ios_old_nonsafari: 'iosOther',
    inapp_kakao: e.ios ? 'inappIOS' : 'inappAnd', inapp_line: e.ios ? 'inappIOS' : 'inappAnd', inapp_other: e.ios ? 'inappOther' : 'inappAndOther',
    prompt: 'android', and_chrome_menu: 'androidMenu', and_whale: 'androidMenu', and_firefox: 'androidMenu', and_samsung: 'samsung', and_installed: 'andInstalled' }[h] || null;
}
export const hasGuide = h => !!guideOf(h);

// ── 겹창 ──
let root = null, onKey = null;
function mount(html, over) {
  close();
  root = document.createElement('div'); root.className = 'ig' + (over ? ' over' : ''); root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
  root.innerHTML = `<div class="wrap">${html}</div>`;
  document.body.appendChild(root);
  return root;
}
export function close() {
  if (onKey) { removeEventListener('keydown', onKey); onKey = null; }
  removeEventListener('resize', fitNow);
  if (root) { root.remove(); root = null; }
}
const $ = s => root && root.querySelector(s);
function toast(msg) { if (!root) return; const t = document.createElement('div'); t.className = 'tst'; t.textContent = msg; root.querySelector('.wrap').appendChild(t); setTimeout(() => t.remove(), 1900); }
const keys = (map) => { onKey = e => { const f = map[e.key]; if (f) { e.preventDefault(); f(); } }; addEventListener('keydown', onKey); };

/* 그림 맞추기 + 고리 · 손가락 (대상 요소의 실제 위치를 재서 덧그림) */
function fitNow() {
  const ph = $('#igph'); if (!ph) return;
  const st = ph.parentElement, k = Math.min(st.clientHeight / 640, st.clientWidth / 300, 1.1);
  ph.style.transform = `translate(-50%,-50%) scale(${k})`;
  const scr = ph.querySelector('.scr'); scr.querySelectorAll('.ring,.finger,.ripple,.tagn').forEach(e => e.remove());
  const base = scr.getBoundingClientRect();
  const put = (el, soft) => {
    const r = el.getBoundingClientRect(); const x = (r.left - base.left) / k, y = (r.top - base.top) / k, w = r.width / k, h = r.height / k;
    const ring = document.createElement('div'); ring.className = 'ring' + (soft ? ' soft' : ''); Object.assign(ring.style, { left: x - 3 + 'px', top: y - 3 + 'px', width: w + 6 + 'px', height: h + 6 + 'px', borderRadius: Math.min(h / 2 + 3, 16) + 'px' }); scr.appendChild(ring);
    return { x, y, w, h };
  };
  scr.querySelectorAll('[data-soft]').forEach(el => { const b = put(el, 1); const t = document.createElement('div'); t.className = 'tagn'; t.textContent = '켠 채로 ✓'; Object.assign(t.style, { left: b.x + b.w - 92 + 'px', top: b.y + b.h + 8 + 'px' }); scr.appendChild(t); });
  scr.querySelectorAll('[data-hl]').forEach(el => {
    const b = put(el); const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const rp = document.createElement('div'); rp.className = 'ripple'; Object.assign(rp.style, { left: cx + 'px', top: cy + 'px' }); scr.appendChild(rp);
    const f = document.createElement('div'); f.innerHTML = FINGER; const fe = f.firstChild;
    let fx = cx - 26; const fy = cy - 8; if (fx + 58 > 280) fx = 280 - 58; fe.style.left = fx + 'px'; fe.style.top = Math.min(fy, 600) + 'px'; scr.appendChild(fe);
  });
}

/* ── 단계 안내 ── opts: { where, cover, title, lay }  → Promise<'yes'|'no'|'close'|'accepted'|'opened'> */
export async function openGuide(h, opts = {}) {
  await css();
  let id = GUIDES[h] ? h : guideOf(h);
  if (!id) return 'none';
  const where = opts.where || '';
  I.rememberForStart(GUIDES[id].how);
  T('install_guide', { where, how: GUIDES[id].how });
  let i = Math.max(0, Math.min((opts.step | 0), GUIDES[id].steps.length - 1)), L = opts.lay || 'small';
  return new Promise(resolve => {
    const finish = r => { close(); resolve(r); };
    const render = () => {
      const g = GUIDES[id], st = g.steps[i], n = g.steps.length, last = i === n - 1, v = x => typeof x === 'function' ? x(L) : x;
      const actLabel = st.act === 'ext' && I.env.inApp ? `🌐 ${I.extLabel()}` : st.act === 'copy' ? '🔗 주소 복사' : st.act === 'prompt' && I.canPrompt() ? '📲 설치' : '';
      const fin = last || st.end;
      const nav = st.last ? `<div class="nav"><button class="btn ghost" style="flex:0 0 44%" data-ig="no">${id === 'andInstalled' ? '닫기' : '아니요, 안 돼요'}</button><button class="btn" data-ig="yes">${id === 'andInstalled' ? '알겠어요' : '네, 생겼어요'}</button></div><div class="help" style="text-decoration:none">${id === 'andInstalled' ? '&nbsp;' : '‘아니요’를 누르면 내 폰 정보가 함께 전달돼요'}</div>`
        : `<div class="nav">${i ? '<button class="btn ghost" data-ig="prev">‹ 이전</button>' : '<button class="btn ghost" data-ig="close">닫기</button>'}<button class="btn" data-ig="${actLabel ? 'act' : fin ? 'end' : 'next'}">${actLabel || (fin ? '열었어요' : '다음 ›')}</button></div><button class="help" data-ig="help">설치가 안 돼요</button>`;
      const html = `<div class="guide" style="${opts.cover ? `--ig-cover:url('${opts.cover}')` : ''}"><div class="ghead"><h3>홈 화면에 추가</h3><button class="chip env" data-ig="env">${g.name}</button><button class="x" data-ig="close" aria-label="닫기">✕</button></div>
        <div class="prog">${g.steps.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        ${i === 0 && n > 1 ? '<div class="sub10">⏱ 10초면 끝나요 · 그림대로 누르면 돼요</div>' : ''}
        ${st.lay ? `<div class="seg">${[['small', '아래 작게'], ['bottom', '아래 넓게'], ['top', '위']].map(([k, t]) => `<span class="${k === L ? 'on' : ''}" data-lay="${k}">${t}</span>`).join('')}</div>` : ''}
        <div class="stage"><div class="phone" id="igph">${v(st.sc)}</div></div>
        <div class="cap" aria-live="polite"><span class="n">${i + 1}</span><h2>${v(st.t)}</h2><p>${v(st.s) || '&nbsp;'}</p></div>${nav}</div>`;
      if (!root) { mount(html); addEventListener('resize', fitNow); bind(); } else root.querySelector('.wrap').innerHTML = html;
      requestAnimationFrame(fitNow);
    };
    const go = d => { const n = GUIDES[id].steps.length, j = Math.max(0, Math.min(n - 1, i + d)); if (j === i) return; i = j; T('install_guide', { where, how: GUIDES[id].how, what: 'step_' + (i + 1) }); render(); };
    const act = async () => {
      const st = GUIDES[id].steps[i];
      if (st.act === 'prompt') { const r = await I.prompt(); T('install_prompt', { where: 'guide', ok: r === 'accepted' ? 1 : r === 'error' ? -1 : 0 }); if (r === 'accepted') return finish('accepted'); if (r === null) go(1); return; }
      if (st.act === 'copy') { const ok = await I.copyLink(); T('install_click', { where: 'guide', how: GUIDES[id].how, what: 'copy' }); toast(ok ? '주소를 복사했어요 · 사파리에 붙여넣어요' : '복사가 안 돼요 · 주소창을 길게 눌러 복사해요'); setTimeout(() => go(1), 900); return; }
      if (st.act === 'ext') { const r = await I.openExt(); T('install_click', { where: 'guide', how: GUIDES[id].how, what: 'ext' }); if (r === 'copied') toast('주소를 복사했어요 · 브라우저에 붙여넣어요'); setTimeout(() => go(1), 1200); }
    };
    const pickEnv = () => {
      const w = root.querySelector('.wrap');
      w.insertAdjacentHTML('beforeend', `<div class="pickdim" data-ig="pickx"></div><div class="pick"><h3>내 휴대폰 · 브라우저 고르기</h3>${PICK.map(k => `<div class="${k === id ? 'on' : ''}" data-pick="${k}">${GUIDES[k].name}<span>${k === id ? '✓' : ''}</span></div>`).join('')}</div>`);
    };
    function bind() {
      root.addEventListener('click', e => {
        const t = e.target.closest('[data-ig],[data-lay],[data-pick]'); if (!t) return;
        if (t.dataset.lay) { L = t.dataset.lay; T('install_click', { where: 'guide', how: GUIDES[id].how, what: 'layout_' + L }); return render(); }
        if (t.dataset.pick) { id = t.dataset.pick; i = 0; T('install_guide', { where, how: GUIDES[id].how, what: 'env' }); I.rememberForStart(GUIDES[id].how); return render(); }
        const a = t.dataset.ig;
        if (a === 'next') go(1); else if (a === 'prev') go(-1); else if (a === 'act') act();
        else if (a === 'close') { T('install_click', { where: 'guide', how: GUIDES[id].how, what: 'close' }); finish('close'); }
        else if (a === 'end') finish('opened');
        else if (a === 'env') pickEnv();
        else if (a === 'pickx') render();
        else if (a === 'yes') { if (id !== 'andInstalled') { I.markDone(); T('install_click', { where: 'guide', how: GUIDES[id].how, what: 'done' }); } finish('yes'); }
        else if (a === 'no') { if (id === 'andInstalled') return finish('close'); T('install_click', { where: 'guide', how: GUIDES[id].how, what: 'no' }); close(); resolve('no'); openHelp({ how: GUIDES[id].how }); }
        else if (a === 'help') { close(); resolve('help'); openHelp({ how: GUIDES[id].how }); }
      });
      /* 좌우로 밀어 넘기기 */
      let sx = null, sy = 0;
      root.addEventListener('pointerdown', e => { if (e.target.closest('.stage')) { sx = e.clientX; sy = e.clientY; } });
      root.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1); });
      keys({ ArrowRight: () => go(1), ArrowLeft: () => go(-1), Escape: () => finish('close') });
    }
    render();
  });
}

/* ── 권유 시트 ── kind: 'first'(첫 게임 끝) · 'day2'(다음 날 재방문) · 'day3'(3일 연속) / opts: { where, reward } → Promise<'accept'|'later'> */
const preview = reward => `<div class="preview"><div class="grid">${'<i></i>'.repeat(8)}</div><div class="me"><span></span>One a Day</div>${reward ? '<div class="plus">+50 <i class="coin"></i></div>' : ''}</div>`;
const WD = ['일', '월', '화', '수', '목', '금', '토'];
export async function openOffer(kind = 'first', opts = {}) {
  await css();
  const reward = opts.reward !== false, inApp = I.env.inApp;
  const okBtn = reward ? '50골드 받고 추가하기' : '홈 화면에 추가';
  let body;
  if (kind === 'first' && inApp) {
    const ext = I.extLabel();
    body = `<div class="sheet"><div class="grab"></div><h2>💬 ${I.env.kakao ? '카톡' : '앱'} 안에서는 화면이 작아요</h2><p class="lead">${I.env.ios ? '사파리' : '브라우저'}로 열면 꽉 찬 화면에<br>홈 화면 추가까지 돼요</p>${preview(reward)}
      <div class="stack"><button class="btn" data-ig="ok">${ext === '주소 복사' ? '🔗 주소 복사 (사파리에 붙여넣기)' : '🌐 ' + ext}</button><button class="later" data-ig="later">나중에</button></div></div>`;
  } else if (kind === 'first') {
    body = `<div class="sheet"><div class="grab"></div><h2>📲 내일 게임, 한 번에 열기</h2><p class="lead">홈 화면에 두면 검색 없이 바로 들어와요</p>${preview(reward)}
      <div class="benefits">${reward ? '<span>🎁 설치하고 열면 50골드</span>' : '<span>🌙 아이콘 한 번에</span>'}<span>⏱ 10초면 끝</span></div>
      <div class="stack"><button class="btn" data-ig="ok">${okBtn}</button><button class="later" data-ig="later">나중에</button></div></div>`;
  } else {
    const n = kind === 'day3' ? 3 : 2, today = new Date();
    const days = Array.from({ length: 7 }, (_, k) => { const d = new Date(today); d.setDate(d.getDate() + k - (n - 1)); return WD[d.getDay()]; });
    body = `<div class="sheet streak"><div class="grab"></div><div class="flame">🔥</div><h2 style="margin-top:8px">${n}일 연속이에요!</h2><p class="lead">${n === 2 ? '어제도 오늘도 왔어요. 멋져요' : '사흘째 빠짐없이 왔어요. 대단해요'}</p>
      <div class="days">${days.map((d, k) => `<div class="${k < n ? 'on' : k === n ? 'nx' : ''}"><i>${k < n ? '✓' : k === n ? '?' : ''}</i>${d}</div>`).join('')}</div>
      <div class="tip"><i class="ico"></i><div>${n === 2 ? `<b class="jua" style="font-size:16px;font-weight:400">내일은 홈 화면에서 한 번에</b><br>${reward ? '설치하고 열면 50골드 <i class="coin"></i>' : '아이콘 하나로 바로 들어와요'}` : `<b class="jua" style="font-size:16px;font-weight:400">🔥 연속 출석, 놓치지 않게</b><br>${opts.keeper ? '앱으로 3일 들어오면 연속 지킴이 1장' : reward ? '설치하고 열면 50골드 <i class="coin"></i>' : '홈 화면에서 한 번에 들어와요'}`}</div></div>
      <div class="stack"><button class="btn" data-ig="ok">${inApp ? '🌐 ' + I.extLabel() : okBtn}</button><button class="later" data-ig="later">나중에</button></div></div>`;
  }
  const nth = opts.nth ? { nth: opts.nth } : {};
  T('install_view', { where: opts.where || 'nudge', how: I.how(), ...nth });
  return new Promise(resolve => {
    mount(`<div class="dim" data-ig="later"></div>${body}`);
    const fin = r => { T('install_click', { where: opts.where || 'nudge', how: I.how(), what: r === 'accept' ? (inApp ? 'ext' : 'install') : 'later', ...nth }); close(); resolve(r); };
    root.addEventListener('click', e => { const t = e.target.closest('[data-ig]'); if (!t) return; fin(t.dataset.ig === 'ok' ? 'accept' : 'later'); });
    keys({ Escape: () => fin('later') });
  });
}

/* ── 설치 앱 첫 실행 ── opts: { loggedIn, reward, claim: async () => ({ ok, used, gold, error }), login: () => void } */
export async function openInstalled(opts = {}) {
  await css();
  const iosNoLogin = I.env.ios && !opts.loggedIn, reward = opts.reward !== false;
  const sp = '<span class="spark" style="left:18%;top:20%">✦</span><span class="spark" style="right:20%;top:26%;font-size:12px">✦</span><span class="spark" style="left:26%;top:44%;font-size:10px">✦</span><span class="spark" style="right:16%;top:46%">✦</span>';
  const html = iosNoLogin
    ? `<div class="done"><span class="spark" style="left:18%;top:14%">✦</span><span class="spark" style="right:20%;top:18%;font-size:12px">✦</span>
      <div class="big" style="width:92px;height:92px;border-radius:24px"></div><h1 style="margin-top:20px">설치 완료!</h1><p class="lead">이제 홈 화면에서 한 번에 열려요</p>
      <div class="move"><b class="jua">🛡 사파리에서 하던 기록 가져오기</b><p>아이폰은 사파리와 이 앱의 저장 공간이 따로예요.<br>로그인하면 골드 · 소장 · 운세 정보가 그대로 와요.</p></div>
      <div class="stack"><button class="btn" data-ig="login">${reward ? '로그인하고 50골드 받기' : '로그인하고 기록 가져오기'}</button><button class="btn ghost small" data-ig="skip">새로 시작할게요</button></div></div>`
    : `<div class="done">${sp}<div class="big"></div><h1>설치 완료!</h1><p class="lead">이제 홈 화면에서 한 번에 열려요</p>
      ${reward ? '<div class="reward"><i class="coin"></i>+50</div>' : '<div style="height:24px"></div>'}
      <div class="stack"><button class="btn" data-ig="${opts.loggedIn ? (reward ? 'claim' : 'skip') : 'login'}">${!reward ? '시작하기' : opts.loggedIn ? '골드 50 받기' : '로그인하고 골드 50 받기'}</button>${opts.loggedIn ? '' : '<button class="btn ghost small" data-ig="skip">나중에 받을게요</button>'}</div>
      <p class="lead" style="font-size:13px;margin-top:14px">${reward ? '로그인한 계정에 한 번 드려요 · ' : ''}내일 0시에 새 게임이 열려요</p></div>`;
  return new Promise(resolve => {
    mount(html, true);
    let busy = false;
    root.addEventListener('click', async e => {
      const t = e.target.closest('[data-ig]'); if (!t || busy) return;
      const a = t.dataset.ig;
      if (a === 'skip') { close(); return resolve('skip'); }
      if (a === 'login') { close(); resolve('login'); if (opts.login) opts.login(); return; }
      if (a === 'claim' && opts.claim) {
        busy = true; t.disabled = true; t.textContent = '받는 중…';
        const r = await opts.claim().catch(() => ({ ok: false }));
        if (r && r.ok) { toast('골드 50을 받았어요!'); setTimeout(() => { close(); resolve('claimed'); }, 1100); }
        else if (r && r.used) { toast('이미 받은 선물이에요'); setTimeout(() => { close(); resolve('used'); }, 1300); }
        else { busy = false; t.disabled = false; t.textContent = '다시 받기'; toast((r && r.error) || '잠시 뒤 다시 해 주세요'); }
      }
    });
  });
}

/* ── 진단 ── 개인정보 없음: 버전 · 기기 · 브라우저 · 열린 모양 · 설치 창 · 표시 · SW · manifest · 저장 공간 · 화면 */
const CODE_OS = e => e.inApp ? 'IN' : e.ios ? 'IO' : e.android ? 'AN' : 'PC';
const CODE_BR = { safari: 'SAF', chrome: 'CHR', samsung: 'SAM', whale: 'WHL', firefox: 'FFX', edge: 'EDG', kakao: 'KKO', naver: 'NAV', insta: 'IGM', band: 'BND', line: 'LIN', fb: 'FBK', gsa: 'GSA', threads: 'THR', tiktok: 'TTK', wv: 'WV', other: 'ETC' };
export async function diagnose() {
  const e = I.env, h = I.how(), sa = I.standalone(), q = new URLSearchParams(location.search);
  let ls = true; try { localStorage.setItem('oad_t', '1'); localStorage.removeItem('oad_t'); } catch { ls = false; }
  let sw = '없음';
  try { if ('serviceWorker' in navigator) { const r = await navigator.serviceWorker.getRegistration(); sw = r ? (navigator.serviceWorker.controller ? '등록됨 · 제어 중' : '등록됨') : '등록 안 됨'; } else sw = '지원 안 함'; } catch { sw = '확인 실패'; }
  let mf = '확인 실패';
  try { const r = await fetch('manifest.webmanifest', { cache: 'no-store', credentials: 'include' }); const m = r.ok ? await r.json() : null; const ic = m && m.icons && m.icons[0] ? await fetch(m.icons[0].src, { cache: 'no-store' }).then(x => x.ok) : false; mf = m ? (ic ? '받기 성공' : 'manifest 성공 · 아이콘 실패') : `실패(${r.status})`; } catch { /* */ }
  const marked = (() => { try { return localStorage.getItem('oad_installed') === '1' || Number(localStorage.getItem('oad_install_done') || 0) > Date.now(); } catch { return false; } })();
  const fromHome = q.get('utm_source') === 'home';
  /* 판정 (ops 1-2 증상 코드) */
  let v = ['OK', '아직 설치하지 않았어요', '안내대로 홈 화면에 추가해 보세요.', 'guide'];
  if (sa) v = ['OK', '지금 설치 앱으로 열려 있어요 ✅', '이미 설치가 끝났어요. 홈 화면의 🌙 아이콘으로 열면 돼요.', ''];
  else if (e.inApp) v = ['C1', `${e.kakao ? '카카오톡' : e.br === 'naver' ? '네이버 앱' : '앱'} 안에서 열려 있어요`, '이 안에서는 추가가 안 돼요.', 'ext'];
  else if (h === 'ios_old_nonsafari') v = ['B1', '이 아이폰은 사파리에서만 추가돼요', '주소를 복사해 사파리에서 열어 주세요.', 'copy'];
  else if (h === 'ios_other') v = ['B2', '이 브라우저는 추가가 안 될 수 있어요', '주소를 복사해 사파리에서 열어 주세요.', 'copy'];
  else if (e.ios && fromHome) v = ['B6', '사파리 탭으로 열렸어요', '아이콘을 지우고 ‘웹 앱으로 열기’를 켠 채 다시 추가해 주세요.', 'guide'];
  else if (e.android && fromHome) v = ['B7', '바로가기로 열렸어요', '아이콘을 지우고 메뉴에서 ‘설치’를 골라 다시 추가해 주세요.', 'guide'];
  else if (I.relatedInstalled()) v = ['A5', '이미 설치돼 있어요', '홈 화면의 🌙 아이콘으로 열어 주세요.', ''];
  else if (I.canPrompt()) v = ['OK', '설치 창을 띄울 수 있어요', '버튼 한 번이면 끝나요.', 'prompt'];
  else if (e.android && marked) v = ['A1', '설치 표시가 남아 있어요', '앱을 지운 적이 있다면 표시를 지우고 다시 시도해 주세요.', 'reset'];
  else if (h === 'unsupported') v = ['A3', '이 브라우저는 설치를 지원하지 않아요', '크롬이나 엣지에서 열어 주세요.', 'copy'];
  else if (e.android && !e.firefox) v = ['A4', '설치 창이 아직 준비되지 않았어요', '이미 설치돼 있거나, 잠시 뒤 다시 뜰 수 있어요. 홈 화면에 🌙 아이콘이 있는지 먼저 봐 주세요.', 'guide'];
  if (!ls) v = ['S1', '저장 공간을 쓸 수 없어요', '개인 정보 보호(비공개) 모드라면 일반 창에서 열어 주세요.', 'copy'];
  const ver = window.OAD_VERSION || '', envName = window.OAD_ENV === 'prod' ? '실서버' : window.OAD_ENV === 'test' ? '테스트' : '개발';
  const brName = { safari: '사파리', chrome: '크롬', samsung: '삼성 인터넷', whale: '웨일', firefox: '파이어폭스', edge: '엣지', kakao: '카카오톡', naver: '네이버 앱', insta: '인스타그램', band: '밴드', line: '라인', fb: '페이스북', gsa: '구글 앱', threads: '스레드', tiktok: '틱톡', wv: '앱 속 브라우저', other: '기타' }[e.br] || e.br;
  const os = e.ios ? `${e.ipad ? 'iPad' : 'iPhone'} · ${e.safari ? '사파리 ' + e.osv : 'iOS ' + e.osv}` : e.android ? `안드로이드 ${e.osv}` : 'PC';
  const code = `OAD-${CODE_OS(e)}-${e.osv || 0}-${CODE_BR[e.br] || 'ETC'}-${v[0]}`;
  const vs = ver ? `v${ver}` : '버전 모름';
  const rows = [['앱 버전', `${vs} · ${envName}`], ['기기 · 브라우저', `${os} · ${brName}`], ['안내 종류', h], ['열린 모양', sa ? '설치 앱' : '브라우저 탭'],
    ['설치 창 준비', I.canPrompt() ? '예' : '아니요'], ['설치 표시', marked ? '켜짐' : '꺼짐'], ['이미 설치 확인', I.relatedInstalled() ? '있음' : '없음'],
    ['서비스 워커', sw], ['아이콘 · manifest', mf], ['저장 공간', `${ls ? '쓰기 가능' : '쓸 수 없음'} · 쿠키 ${navigator.cookieEnabled ? '허용' : '막힘'}`], ['화면', `${innerWidth}×${innerHeight} · 글자 ${Math.round((parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16 * 100)}%`]];
  return { code, verdict: { code: v[0], title: v[1], body: v[2], act: v[3] }, rows, marked, how: h, ua: navigator.userAgent, summary: `${code} · ${brName} · ${os} · ${vs}` };
}
const actBtn = a => a === 'ext' ? `🌐 ${I.extLabel()}` : a === 'copy' ? '🔗 주소 복사' : a === 'prompt' ? '📲 지금 설치' : a === 'guide' ? '📲 그림 안내 보기' : a === 'reset' ? '표시 지우기' : '';
async function doAct(a, d) {
  if (a === 'ext') { const r = await I.openExt(); if (r === 'copied') toast('주소를 복사했어요 · 사파리에 붙여넣어요'); else if (r === 'failed') toast('주소창을 길게 눌러 복사해 주세요'); }
  else if (a === 'copy') toast((await I.copyLink()) ? '주소를 복사했어요 · 사파리에 붙여넣어요' : '주소창을 길게 눌러 복사해 주세요');
  else if (a === 'prompt') { const r = await I.prompt(); T('install_prompt', { where: 'diag', ok: r === 'accepted' ? 1 : r === 'error' ? -1 : 0 }); if (r === 'accepted') { close(); } }
  else if (a === 'guide') { close(); openGuide(d.how, { where: 'diag' }); }
  else if (a === 'reset') { I.clearMarks(); T('install_diag', { what: 'reset', how: d.verdict.code }); toast('표시를 지웠어요 · 다시 시도해 주세요'); }
}
async function send(d) {
  T('install_diag', { what: 'send', how: d.verdict.code, msg: `${d.summary} | ${d.ua}`.slice(0, 200) });
  try { const m = await import('./track.js?v=0.92.3'); m.flush && m.flush(); } catch { /* */ }
  toast('보냈어요. 고마워요! 빨리 살펴볼게요');
}
/* 자주 막히는 3가지 (환경마다 다름) */
const FAQ = e => e.inApp ? [['카톡 · 네이버 앱 안에서 열었어요', `그 앱 안에서는 안 돼요. ${e.ios ? '사파리' : '크롬'}로 열어 주세요.`], ['‘사파리로 열기’를 눌러도 그대로예요', '주소가 복사됐어요. 사파리를 열고 주소창을 꾹 눌러 붙여넣어요.'], ['다시 열었더니 또 카톡이에요', '카톡 링크 말고 사파리 · 크롬에서 oneaday.kr 을 직접 열어 주세요.']]
  : e.ios ? [['카톡 · 네이버 앱 안에서 열었어요', '그 앱 안에서는 안 돼요. 사파리로 열어 주세요.'], ['‘홈 화면에 추가’가 안 보여요', '공유 목록을 끝까지 내려요. 맨 아래 ‘작업 편집’에서 켤 수 있어요.'], ['추가했는데 사파리 화면으로 열려요', '아이콘을 지우고 ‘웹 앱으로 열기’를 켠 채 다시 추가해요.']]
  : e.android ? [['메뉴에 ‘앱 설치’가 없어요', '이미 설치돼 있을 수 있어요. 홈 화면에서 🌙 아이콘을 찾아봐요.'], ['설치했는데 브라우저 화면으로 열려요', '‘바로가기 만들기’로 추가된 거예요. 지우고 ‘설치’로 다시 해요.'], ['‘브라우저로 열기’를 눌러도 반응이 없어요', '오른쪽 위 ⋮ 에서 ‘다른 브라우저로 열기’를 눌러 주세요.']]
  : [['설치 아이콘이 안 보여요', '크롬 · 엣지에서만 돼요. 주소창 오른쪽이나 메뉴 ⋮ 에 있어요.'], ['맥 사파리예요', '메뉴 막대의 ‘파일’ → ‘Dock에 추가’를 눌러요.'], ['파이어폭스예요', '설치를 지원하지 않아요. 크롬이나 엣지로 열어 주세요.']];

/* ── '설치가 안 돼요' ── */
export async function openHelp(opts = {}) {
  await css();
  const d = await diagnose();
  T('install_diag', { what: 'open', how: d.verdict.code, where: 'help' });
  const e = I.env, envName = GUIDES[guideOf(opts.how || d.how)] ? GUIDES[guideOf(opts.how || d.how)].name : (e.ios ? '아이폰' : e.android ? '안드로이드' : 'PC');
  mount(`<div class="helpv"><div class="ghead"><button class="x" data-ig="close" aria-label="닫기">‹</button><h3 style="flex:1;font-size:17px;color:var(--sub)">홈 화면에 추가</h3><span class="chip env" style="pointer-events:none">${envName}</span></div>
    <h2>설치가 안 되나요?</h2>
    <div class="verdict${d.verdict.code === 'OK' || d.verdict.code === 'A4' ? ' ok' : ''}"><span>🔎 지금 상태</span><b>${d.verdict.title}</b>${d.verdict.act ? `<div class="mini" data-ig="act">${actBtn(d.verdict.act)}</div>` : `<p>${d.verdict.body}</p>`}</div>
    <p class="lead" style="margin-top:12px">자주 막히는 세 가지</p>
    ${FAQ(e).map(([q, a], k) => `<div class="qa"><b><em>${k + 1}</em>${q}</b><p>${a}</p></div>`).join('')}
    <div class="envbox"><div class="k">그래도 안 되면 내 폰 정보를 보내 주세요</div><code>${d.summary}</code>
    <div class="row2"><button class="btn small ghost" data-ig="copy">📋 복사</button><button class="btn small" data-ig="send">💬 보내기</button></div></div></div>`);
  bindDiag(d);
}
/* ── 설정 · 설치 진단 ── */
export async function openDiag() {
  await css();
  const d = await diagnose();
  T('install_diag', { what: 'open', how: d.verdict.code, where: 'settings' });
  mount(`<div class="helpv"><div class="ghead"><button class="x" data-ig="close" aria-label="닫기">‹</button><h3 style="flex:1;font-size:17px;color:var(--sub)">설정 · 설치 진단</h3></div>
    <div class="verdict${d.verdict.code === 'OK' || d.verdict.code === 'A4' ? ' ok' : ''}"><span>🔎 자동 판정</span><b>${d.verdict.title}</b><p>${d.verdict.body}</p>${d.verdict.act && d.verdict.act !== 'reset' ? `<div class="mini" data-ig="act">${actBtn(d.verdict.act)}</div>` : ''}</div>
    <div class="kv">${d.rows.map(([k, v]) => `<div><span>${k}</span><b>${v}${k === '설치 표시' && d.marked ? ' <u data-ig="reset">표시 지우기</u>' : ''}</b></div>`).join('')}<details><summary>브라우저 정보 원문</summary><p>${d.ua.replace(/</g, '&lt;')}</p></details></div>
    <div class="code">진단 코드 <b>${d.code}</b></div>
    <div class="row3"><button class="btn small ghost" data-ig="copy">📋 복사</button><button class="btn small ghost" data-ig="again">↻ 다시 확인</button><button class="btn small" data-ig="send">💬 보내기</button></div></div>`);
  bindDiag(d, true);
}
function bindDiag(d, isDiag) {
  root.addEventListener('click', async e => {
    const t = e.target.closest('[data-ig]'); if (!t) return;
    const a = t.dataset.ig;
    if (a === 'close') close();
    else if (a === 'act') doAct(d.verdict.act, d);
    else if (a === 'reset') { await doAct('reset', d); openDiag(); }
    else if (a === 'again') openDiag();
    else if (a === 'copy') { const ok = await I.copyText(`${d.summary}\n${d.rows.map(r => r.join(': ')).join('\n')}\n${d.ua}`); T('install_diag', { what: 'copy', how: d.verdict.code }); toast(ok ? '복사했어요 · 문의 창에 붙여넣어 주세요' : '복사가 안 돼요'); }
    else if (a === 'send') send(d);
  });
  keys({ Escape: () => close() });
  void isDiag;
}
