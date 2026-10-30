// 화면: 가로 1080 고정, 세로는 기기 비율대로 늘어남 (최소 1920) · 390×844 폰이면 1080×2337
export const VERSION = '0.1.0';
export const TITLE = '판타지 디펜스';
export const TITLE_EN = 'Fantasy Defense';
export const W = 1080;
export const BASE_H = 1920;
export let H = BASE_H;
export function setH(h) { H = Math.round(h); }
export const FONT = 'Pretendard, sans-serif';
export const C = { ink: '#F4EEDC', mute: '#A9A391', gold: '#FFC94A', mana: '#7FD8FF', life: '#FF6B6B', panel: 0x141821, panel2: 0x1E2430, line: 0x3A4256, accent: 0xFFC94A, ok: 0x7BE38C };
export const SCALE = 2.4;   // 아틀라스 그림 배율 (원작 1px → 2.4px)
