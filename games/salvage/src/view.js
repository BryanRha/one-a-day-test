// 게임 판 크기 (v0.9.1 · QA 시트 1 · 5번)
//   판(#frame)은 PC 에서 가운데 폭 520px 로 놓이는데, 예전엔 그림 · 화살표 · 피해 숫자 · 시야를 창 크기(innerWidth)로 계산해
//   PC 에서 3D 그림이 가로로 눌리고(세로로 길어 보임) 화면 표시가 판 밖으로 나갔음 → 화면 좌표는 모두 이 값으로
//   main.js resize() 가 창 크기가 바뀔 때만 다시 잼 (매 프레임 레이아웃 읽기 X)
export const V = { w: innerWidth, h: innerHeight };
export function measure() { const f = document.getElementById('frame'); V.w = f?.clientWidth || innerWidth; V.h = f?.clientHeight || innerHeight; return V; }
