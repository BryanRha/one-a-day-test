// 작전 조언 (v0.12 · 테스터 시트 #5 · #7): 지도를 읽어 '강 건너는 법'과 '이번 작전에 필요한 유닛'을 알려 줌 (화면과 무관 — Node 시험에서도 씀)
import { TCH } from './core/sim.js?v=0.99.22';
import { UNITS } from './core/data.js?v=0.99.22';

// 강 건너기 안내 (보병 · 차량 · 하늘) — 지도에 강이 있을 때
export const RIVER_HOW = [
  ['inf', '소총병 · 바주카병은 강을 걸어서 건너요 (소총병은 2칸 몫)'],
  ['ltank', '전차 · 차량은 강에 못 들어가요 → 다리(=) 칸으로'],
  ['heli', '헬기 · 비행기는 강 위를 그대로 날아가요'],
];

export function mapAdvice(map) {
  const cells = (map.rows || []).flatMap(r => r.trim().split(/\s+/));
  const has = t => cells.some(c => TCH[c[0]] === t);
  const own = (t, p) => cells.some(c => TCH[c[0]] === t && +(c[1] || 0) === p);
  const neutral = cells.filter(c => ['city', 'base', 'air', 'port'].includes(TCH[c[0]]) && !+(c[1] || 0)).length;
  const foes = (map.units || []).filter(u => u.p === 2).map(u => u.t).concat(((map.camp && map.camp.extra) || []).map(u => u.t));
  const fk = t => foes.includes(t), river = has('river'), bridge = has('bridge');
  const out = [], add = (t, why) => { if (!out.some(o => o.t === t)) out.push({ t, why }); };
  if (neutral >= 2) add('inf', `빈 건물 ${neutral}곳 점령 → 자금`);
  if (foes.some(t => ['ltank', 'htank', 'mega', 'recon'].includes(t))) add('bazooka', '적 전차를 잡아요');
  if (foes.some(t => UNITS[t] && UNITS[t].dom === 'air')) add('aa', '적 헬기 · 비행기 대응');
  if (foes.some(t => ['arty', 'rocket', 'piper', 'battleship'].includes(t))) add('ltank', '적 포병에 빠르게 돌격');
  if (river && !out.some(o => o.t === 'inf')) add('inf', '강을 걸어서 건너요');
  if (has('mountain') && !out.some(o => o.t === 'inf')) add('inf', '산을 넘을 수 있어요');
  if (map.fog) add('recon', '안개 속 정찰');
  if (has('sea') && own('port', 1)) add('lander', '바다 건너 상륙');
  if (has('silo')) add('inf', '보병이 미사일 기지를 쏴요');
  if (fk('sub')) add('cruiser', '잠수함 사냥');
  if (out.length < 2) add('ltank', '쓸모 많은 주력');
  if (out.length < 3) add('inf', '싸고 점령 가능');
  return { river, bridge, units: out.slice(0, 3) };
}
