# 너랑 아이콘 시안 A · B · C (2026-11-04 · 아트·브랜드 세션)

아직 적용 안 함 — 탭 바(index.html)·manifest·상단 로고는 그대로. 대표가 한 안을 고르면 그때 붙인다.
비교: `compare.png` (안마다 폰 홈 화면 · 실제 4탭 줄 켜짐/꺼짐 · 1024/192/마스커블/64/24 · 상단 바 가로 로고 어두운/밝은)
다시 만들기: `node lab/neorang-ux/tools/icons.mjs` (SVG 를 코드로 그리고 Chrome 으로 PNG·compare.png 를 찍음)

색 = 승인 UX 시안 D: 밤 남색 #16133A·#201C4B·#2C2762 · 보라 #5B48E2·#9C8CFF · 종이 #F6F4F0 · 금 별 #E7B24A

| 안 | 모양 | 한 줄 |
|---|---|---|
| A | 펼친 책 위로 보라 말풍선(…) | 읽고 → 캐릭터가 먼저 말 건다. 무슨 앱인지 가장 바로 읽힘 |
| B | 종이 책갈피 + 보라 초승달 + 금 별 | 매일 밤 9시 새 화. 실루엣이 가장 단순해서 24px 에서 가장 또렷 |
| C | 「너」 글자가 든 말풍선, 꼬리가 펜촉(틈 + 숨구멍) | 이름 그대로 글자 마크. 같이 쓰는 이야기. 기억에 남는 정도가 가장 강함 |

## 파일 (각 a · b · c 폴더)
- `app.svg` 원본 · `app_1024.png` `app_512.png` `app_192.png` `app_180.png`(apple-touch) — 꽉 찬 정사각, 모서리는 OS 가 자름(투명 없음)
- `maskable.svg` `maskable_512.png` `maskable_192.png` — 배경은 끝까지, 그림은 80% (안전 원 안)
- `tab_off.svg` `tab_on.svg` — 24 격자, **채움 단색**(지금 탭 게임·운세·보관함과 같은 꽉 찬 스타일), `fill="currentColor"` 라 색은 탭 바 CSS 가 정함(꺼짐 --mute, 켜짐 .nr.on --moon + 알약). 켜짐은 모양도 조금 달라짐: A 말풍선 안 점 3개 · B 초승달 옆 별 · C 펜촉 숨구멍
- `logo_dark.svg` `logo_light.svg` — 상단 왼쪽 가로 로고(아이콘 + 「너랑」), 330×120 비율, 상단 바에선 높이 28px(지금 원어데이 'One a Day' Jua 22px 줄과 같은 높이). 워드마크는 글꼴 없이 둥근 획 path(어디서나 같은 모양, 글꼴 라이선스 걱정 없음), 「ㅇ」만 보라
  - 주의: 로고 SVG 안에 앱 그림이 들어 있어 id(bg·glow·vi…)가 겹침 → `<img src>` 로 쓸 것(인라인 여러 개 X)

## 적용할 때(나중에)
- 탭: index.html 의 `data-tab="neorang"` 안 svg 를 tab_off 의 path 로(켜짐 모양까지 쓰려면 두 svg 를 넣고 `.on` 으로 바꿔 보이기)
- 독립 앱: manifest icons 에 app_512/192 + maskable_512/192(purpose maskable), `<link rel="apple-touch-icon" href="app_180.png">`

## 상표 유사 자체 점검(짧게)
- 카카오페이지·카카오톡: 노란 바탕/노란 말풍선 + 영문 글자 → 우리 남색 바탕·보라/종이색, 말풍선에 한글 「너」(C)라 다름. C 는 '말풍선 안 글자' 범주라 셋 중 가장 가까움 — 노란색·TALK 류는 절대 쓰지 말 것
- 네이버 시리즈·웹툰(초록 N 계열), 리디(파란 글자 로고): 색·형태 모두 다름. N 글자 안은 이 때문에 버림
- 제타·크랙·Character.AI·Talkie: 캐릭터 얼굴/영문 글자 로고 계열 → 책·책갈피·한글 마크라 겹치지 않음
- Apple Books(주황 바탕 흰 펼친 책)와 A 의 펼친 책: 바탕색·말풍선 결합이 달라 혼동 낮음. 책 단독으로는 쓰지 말 것
- 정식 출원 전에는 KIPRIS 도형 검색(9류·41류, 말풍선·책·초승달)을 한 번 돌릴 것

---

# A 다듬기 — 말풍선 「너랑」 글꼴 4안 (2026-11-04 · 대표 선택 A)

비교: `compare_a.png` · 폴더 `a1/ a2/ a3/ a4/` (파일 구성은 위와 같음, 기존 `a/` 는 보존)
- 말풍선 '…' → 「너랑」(흰 글자, 외곽선 path — SVG 에 글꼴 의존 없음). 말풍선을 키우고(596×320) 색을 조금 짙게(#7C69F6→#4E3BD4, 흰 글자 대비), 책은 84% 로
- 탭 아이콘은 A 그대로 복사(글자 없이 책 + 말풍선 실루엣, 켜짐만 점 3개) — 24px 에선 두 글자의 획이 1px 아래로 뭉개져 오히려 지저분해서
- 가로 로고 워드마크도 같은 글꼴(외곽선)로, 높이 28px 에 맞춤
- 다시 만들기: `python3 -I lab/neorang-ux/tools/neorang_glyphs.py <글꼴폴더> lab/neorang-ux/tools/neorang_glyphs.json` (fonttools 필요, 글꼴은 저장소에 안 넣음) → `node lab/neorang-ux/tools/icons_a.mjs` (REC 환경변수에 추천 문구)

| 안 | 글꼴 | 결 | 라이선스 |
|---|---|---|---|
| **A1 (추천)** | 고운바탕 Gowun Batang Bold | 부드러운 바탕(명조) | SIL OFL 1.1 · https://fonts.google.com/specimen/Gowun+Batang · https://github.com/google/fonts/tree/main/ofl/gowunbatang |
| A2 | 나눔명조 Nanum Myeongjo ExtraBold | 정통 명조 | SIL OFL 1.1 · https://fonts.google.com/specimen/Nanum+Myeongjo · https://github.com/google/fonts/tree/main/ofl/nanummyeongjo |
| A3 | 개구 Gaegu Bold | 손글씨 | SIL OFL 1.1 · https://fonts.google.com/specimen/Gaegu · https://github.com/google/fonts/tree/main/ofl/gaegu |
| A4 | 고운돋움 Gowun Dodum (외곽선 덧칠로 굵게) | 둥근 고딕 | SIL OFL 1.1 · https://fonts.google.com/specimen/Gowun+Dodum · https://github.com/google/fonts/tree/main/ofl/gowundodum |

OFL 1.1: 상업 사용·로고(외곽선으로 바꾼 그림)에 사용 가능, 글꼴 파일 자체를 단독 판매하는 것만 금지. 로고·아이콘은 '글꼴로 만든 결과물'이라 OFL 고지 의무 없음.

추천 A1: 밤에 펼치는 소설책(바탕체) 결 + 둥근 획 끝의 다정함, 프리미엄하면서 차갑지 않음. 획이 고르게 굵어 192·64px 에서도 「너랑」 이 또렷하고, 상단 로고가 원어데이 Jua 와 결이 확실히 구분됨.
A2 는 가장 고급스럽지만 64px 아래에서 가로획이 사라짐 · A3 은 다정하지만 귀여움 쪽 · A4 는 가장 잘 읽히지만 개성이 약함.

---

# 새 방향 D~I (2026-11-04 · 대표 "시안 몇 개 더")

비교: `compare_more.png` (새 6안 + 기준 A1 · B — 폰 홈 화면 · 192/64/29 · 24 탭 꺼짐/켜짐 · 실제 4탭 줄 · 상단 로고 어두운/밝은)
다시 만들기: `node lab/neorang-ux/tools/icons_more.mjs` (REC 환경변수 = 추천 문구). 파일 구성은 위와 같음(D 는 app.svg 대신 생성 원본 `src_gen.png`).

| 안 | 모양 | 한 줄 | 탭 켜짐 | 워드마크 |
|---|---|---|---|---|
| D | 일러스트: 빛나는 책에서 보라 말풍선·편지가 날아오름 | Figma generate_image(gpt-image-2.5-sunburst, 파일 "너랑 아이콘 - Art Generation" cSNX3lnfFiuRij0XrSSmUo). 원어데이 다른 앱처럼 그림 한 장. `src_gen_window.png` = 창가 장면 1차안(작은 크기에 너무 복잡해 버림) | 편지 봉투 V | 고운바탕 |
| E | 밀랍 봉인 편지 + 금 초승달 | 캐릭터가 먼저 보낸 편지 | 봉인에 초승달 | 나눔명조 |
| F | 펜촉 + 잉크 하트 말풍선 | 너랑 쓰는 이야기 | 잉크 방울 → 하트 | 개구 |
| G | 책장이 열린 문, 안은 밤하늘 | 이야기 속으로 들어감 | 문 안에 달 | 고운바탕 |
| H | 금 테 책 표지에 「너/랑」 세로 + 책갈피 리본 | 모노그램(나눔명조 외곽선). ㄴㄹ 직접 그림은 'L2' 로 읽혀 버림 | 표지에 반짝임 | 나눔명조 |
| I | 두 말풍선(종이 · 보라)이 겹쳐 하트, 겹친 자리가 빛남 | 너와 나 | 겹친 자리가 채워짐 + 반짝임 | 고운돋움 |

추천 ① **I** — 29·24px 에서도 가장 또렷하고 아이콘·탭·로고가 한 모양. 하트라 '연애 앱' 처럼 보일 수 있음(로맨스 중심이면 장점).
추천 ② **D** — 원어데이 다른 앱 아이콘(그림 한 장)과 같은 결, 감성 전달 최강. 대신 29px 아래에선 뭉개지고 탭·로고는 별도 단순 모양.

상표 자체 점검(새 6안):
- I 하트 + 말풍선: 데이팅·메신저 앱에 흔한 조합이지만 종이/보라 두 말풍선이 겹친 하트(가운데 렌즈)는 특정 로고와 같지 않음. 빨강·분홍 단색 하트는 피할 것
- E 편지: Gmail(빨간 M 봉투)·우편 앱과 달리 밀랍 봉인 + 초승달이 중심. 빨간 봉투는 피할 것
- F 펜촉: 글쓰기 앱에 흔한 모티프, 하트 잉크 결합은 겹치는 상표 모름
- G 아치 문: 특정 브랜드와 닮지 않음(에어비앤비 등은 모양 다름)
- H 책 표지 + 한글: 리디·밀리의서재 등은 영문/색 로고라 다름
- D 생성 이미지: 실존 인물·브랜드 없음(프롬프트에서 글자·로고 금지)
- 정식 출원 전 KIPRIS 도형 검색 권장
