// 공용 상태 — 데이터(D) · 원어데이 연결 정보(H) · 지금 손님 판(cur)
export const D = { items: {}, cast: {}, weeks: [], reserve: [], extras: [], specials: [] };
export const H = { ok: false, owned: false, gold: 0, prices: {}, ads: {} };
export const cur = { v: null };
export const face = (cast, f) => `assets/g/${cast}_${f}.webp`;
export const sil = cast => `assets/g/${cast}_s.webp`;
export const itemImg = id => `assets/i/${id}.webp`;
export const nameOf = g => (D.cast[g.cast] || {}).name || '';
export const tagOf = g => g.tag || (D.cast[g.cast] || {}).tag || '';
export async function loadData() {
  const get = f => fetch(`data/${f}.json`).then(r => { if (!r.ok) throw new Error(f + ' ' + r.status); return r.json(); });
  /* 첫 화면에 필요한 것만 기다림 · 예비 손님 · 특별 단편은 뒤에서 (4G 첫 화면 2026-11-03) */
  const [items, cast, weeks, extras] = await Promise.all(['items', 'cast', 'weeks', 'extras'].map(get));
  Object.assign(D, { items, cast, weeks, extras });
  D.later = Promise.all(['reserve', 'specials'].map(f => get(f).catch(() => []))).then(([reserve, specials]) => Object.assign(D, { reserve, specials }));
  return D;
}
/* 뒤에서 미리 받기: 첫 화면이 뜬 뒤 쉬는 틈에 하나씩(한 번에 2개) · 이미 받은 건 건너뜀 */
const fetched = new Set();
export function prefetch(urls) {
  const q = urls.filter(u => u && !fetched.has(u)); q.forEach(u => fetched.add(u));
  const idle = window.requestIdleCallback || (f => setTimeout(f, 200));
  const one = () => { const u = q.shift(); if (!u) return; const im = new Image(); im.decoding = 'async'; im.onload = im.onerror = () => idle(one); im.src = u; };
  idle(one); idle(one);
}
/* 꾸미기 — 겉모습만(능력치 0) · 골목 동전(플레이) 또는 원어데이 골드(gold.js SHOP.hanson 고정 ID) */
export const DECO = [
  { id: 'lamp', slot: 'lamp', name: '호박빛 등불', desc: '천장 등에 따뜻한 빛이 돌아요', coins: 400, sku: 'd_lamp', size: '소' },
  { id: 'plant', slot: 'plant', name: '창가 화분', desc: '청자 화분에 푸른 잎', coins: 400, sku: 'd_plant', size: '소', img: 'assets/p_0.webp' },
  { id: 'bell', slot: 'bell', name: '계산대 놋쇠 종', desc: '손님이 오면 같이 울려요', coins: 600, sku: 'd_bell', size: '소', img: 'assets/p_1.webp' },
  { id: 'cushion', slot: 'cushion', name: '먼지 비단 방석', desc: '먼지가 계산대에서 낮잠을 자요', coins: 600, sku: 'd_cushion', size: '소', img: 'assets/p_2.webp' },
  { id: 'cabinet', slot: 'cabinet', name: '자개 진열장', desc: '가게 한쪽이 반짝여요', coins: 1500, sku: 'd_cabinet', size: '대', img: 'assets/p_3.webp' },
  { id: 'blossom', slot: 'season', name: '벚꽃 골목', desc: '창밖으로 꽃잎이 흩날려요', coins: 2500, sku: 'd_blossom', size: '대' },
  { id: 'winter', slot: 'season', name: '첫눈 골목', desc: '계절 테마 · 골목에 눈이 내려요', coins: 3000, sku: 'd_winter', size: '대표' },
  { id: 'najeon', slot: 'sign', name: '자개 간판', desc: '대표 꾸미기 · 무지갯빛 간판', coins: 3000, sku: 'd_sign', size: '대표' },
  { id: 'calico', slot: 'fur', name: '먼지 털빛 · 삼색', desc: '먼지가 삼색 털옷을 입어요', coins: 800, sku: 'fur_calico', size: '털빛' },
  { id: 'gilt', slot: 'sign', name: '금빛 간판', desc: '소장자 전용', owner: true, size: '소장' },
  { id: 'silver', slot: 'fur', name: '먼지 털빛 · 은빛', desc: '소장자 전용', owner: true, size: '소장' },
];
export const FUR = { base: '', calico: 'sepia(.35) saturate(2.2) hue-rotate(-12deg) contrast(1.05)', silver: 'grayscale(1) brightness(1.25) contrast(1.05)' };
