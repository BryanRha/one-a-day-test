// 화면 크기: 가로 1080 고정, 세로는 기기 비율에 맞춰 늘어남 (최소 1920)
export const VERSION = '0.2.0';
export const TITLE = '오늘의 패';
export const GAME_ID = 'pae';
export const W = 1080;
export const BASE_H = 1920;
export let H = BASE_H;
export function setH(h) { H = Math.round(h); }
export const FONT = 'Pretendard, sans-serif';
// 나전칠기 팔레트: 옻칠 검정 · 금박 · 주칠 · 자개 · 한지
export const C = {
  ink: '#0A0809', lacquer: '#15100F', lacquer2: '#231A17', gold: '#E8C27A', gold2: '#B8893A', goldHi: '#FFE6A8',
  ivory: '#F3E9D2', dim: '#A99E8A', red: '#B3262B', red2: '#7A1418', jade: '#5FA88A', pearl: '#BFD8E8', blue: '#7FA8D9', pink: '#F2A2B8',
};
export const N = s => parseInt(s.slice(1), 16);
