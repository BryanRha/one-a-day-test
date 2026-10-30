// 업적 62 (원작 칭호 목록 · 한국어로 다시 씀) · 오늘의 작전 3
import { T } from './data.js?v=0.94.1';
import { unitMax, heroMax } from './meta.js?v=0.94.1';

const ch = c => [...Array(10)].map((_, i) => c * 10 + i);
const allCleared = (d, list) => list.every(s => d.cleared[s]);
const maxed = (m, idx) => idx.every(i => m.unit[i] >= unitMax(m));
const crossMaps = () => T.maps.slice(0, 50).map((m, i) => m.move.some(v => { let n = 0; for (let b = 0; b < 8; b++) if (v & (1 << b)) n++; return n >= 2; }) ? i : -1).filter(i => i >= 0);
let CROSS = null;
// [제목, 설명, 점수, 확인(d, run)] — run 은 방금 끝난 판 (없을 수 있음)
export const AWARDS = [
  ['숲의 정화', '1장 숲을 모두 깼어요', 10, d => allCleared(d, ch(0))],
  ['늪의 정화', '2장 늪을 모두 깼어요', 10, d => allCleared(d, ch(1))],
  ['사막의 정화', '3장 사막을 모두 깼어요', 10, d => allCleared(d, ch(2))],
  ['화산의 정화', '4장 화산을 모두 깼어요', 10, d => allCleared(d, ch(3))],
  ['마계의 정화', '5장 마계를 모두 깼어요', 10, d => allCleared(d, ch(4))],
  ['크라스토의 수호자', '모든 스테이지를 깼어요', 15, d => allCleared(d, [...Array(50).keys()])],
  ['전능한 자', '모든 스테이지를 별 3개로', 20, d => [...Array(50).keys()].every(s => d.stars[s] >= 3)],
  ['성문 파괴자', '성문 부수기를 모두 깼어요', 20, d => [...Array(50).keys()].every(s => d.gateCleared[s])],
  ['챔피언', '영웅 챔피언과 함께', 10, d => d.meta.owned[0]],
  ['보우 마스터', '영웅 보우 마스터와 함께', 10, d => d.meta.owned[1]],
  ['아크메이지', '영웅 아크메이지와 함께', 10, d => d.meta.owned[2]],
  ['강화 입문', '강화를 3번 넘게', 5, d => d.meta.unit.reduce((a, b) => a + b, 0) + d.meta.hero.flat().reduce((a, b) => a + b, 0) >= 3],
  ['완벽한 강화', '강화 하나를 끝까지', 15, d => d.meta.unit.some(v => v >= unitMax(d.meta))],
  ['투사', '전사 강화를 모두 끝까지', 20, d => maxed(d.meta, [0, 1, 2, 3, 4, 5])],
  ['로빈 후드', '궁수 강화를 모두 끝까지', 20, d => maxed(d.meta, [6, 7, 8, 9, 10, 11])],
  ['현자', '마법사 강화를 모두 끝까지', 20, d => maxed(d.meta, [12, 13, 14, 15, 16, 17])],
  ['전설의 영웅', '영웅 한 명의 강화를 모두 끝까지', 20, d => d.meta.hero.some((h, g) => d.meta.owned[g] && h.every(v => v >= heroMax(d.meta)))],
  ['드높은 기상', '모든 강화를 끝까지', 20, d => maxed(d.meta, [...Array(18).keys()]) && d.meta.hero.every(h => h.every(v => v >= heroMax(d.meta)))],
  ['용감한 자', '명예 1,000 넘게 모으기', 10, d => d.heroism >= 1000],
  ['투지', '명예 5,000 넘게 모으기', 15, d => d.heroism >= 5000],
  ['완전 무장', '영웅 모두 장비 착용', 10, d => d.meta.owned.every((o, g) => !o || d.meta.equip[g].every(i => i >= 0))],
  ['부자', '한 판에 골드 5,000', 10, (d, r) => r && r.maxGold >= 5000],
  ['큰 부자', '한 판에 골드 10,000', 15, (d, r) => r && r.maxGold >= 10000],
  ['휴, 아슬아슬', '목숨 3 이하로 깼어요', 10, (d, r) => r && r.win && r.life <= 3],
  ['깨어난 영웅', '영웅을 5레벨까지', 10, (d, r) => r && r.heroMax >= 5],
  ['놀던 병사?', '한 번도 안 싸운 병사가 있는 채로 깼어요', 5, (d, r) => r && r.win && r.idle > 0],
  ['모두 모여', '한 판에 12직업 모두', 10, (d, r) => r && r.details >= 12],
  ['전사들의 행진', '전사 계열만으로 깼어요', 10, (d, r) => r && r.win && r.only === 0],
  ['저격수의 축제', '궁수 계열만으로 깼어요', 10, (d, r) => r && r.win && r.only === 1],
  ['마법사들의 집회', '마법사 계열만으로 깼어요', 10, (d, r) => r && r.win && r.only === 2],
  ['칭호 10개', '업적 10개 달성', 10, d => Object.keys(d.awards).length >= 10],
  ['칭호 20개', '업적 20개 달성', 15, d => Object.keys(d.awards).length >= 20],
  ['칭호 30개', '업적 30개 달성', 20, d => Object.keys(d.awards).length >= 30],
  ...[100, 500, 1000, 2000, 5000, 10000].map((n, i) => [`${n.toLocaleString()} 처치`, `몬스터 ${n.toLocaleString()}마리 물리치기`, [5, 5, 10, 10, 15, 20][i], d => d.kills >= n]),
  ...[['전장의 수호자', 3], ['전장의 저격수', 7], ['전장의 빛', 11], ['공포의 철퇴', 1], ['공포의 눈길', 5], ['얼음 여왕', 9]].map(([t, det]) => [t, `${['전사', '철퇴병', '기사', '대장군', '궁수', '성안 궁수', '연사수', '천궁수', '마법사', '얼음 마법사', '마녀', '폭염술사'][det]} 최고 레벨`, 5, (d, r) => r && r.maxLv && r.maxLv[det] >= 3]),
  ...['챔피언', '보우 마스터', '아크메이지'].map((n, g) => [`${n} 최고 레벨`, `${n}을(를) 5레벨까지`, 5, (d, r) => r && r.heroLv && r.heroLv[g] >= 5]),
  ...['칼날의 연회', '죽음의 화살비', '얼어붙은 심장'].map((t, g) => [t, '필살기로 5마리 넘게 한 번에', 10, (d, r) => r && r.specialBest && r.specialBest[g] >= 5]),
  ['운명의 갈림길', '갈림길이 있는 맵에 처음 들어감', 10, (d, r) => { CROSS ||= crossMaps(); return r && CROSS.includes(r.stage); }],
  ['꺾이지 않는 마음', '한 스테이지에 3번 넘게 도전', 10, d => Object.values(d.tries).some(n => n >= 3)],
  ['완벽주의자', '1~15 스테이지를 별 3개로', 10, d => [...Array(15).keys()].every(s => d.stars[s] >= 3)],
  ...[[0.5, '아마추어 수비대', 5], [2, '숙련 수비대', 5], [5, '프로 수비대', 10], [10, '세계적 수비대', 10], [20, '수비의 달인', 15], [50, '수비의 영웅', 15], [100, '수비의 왕', 20], [200, '수비의 신', 20]].map(([h, t, sc]) => [t, `${h < 1 ? '30분' : h + '시간'} 넘게 플레이`, sc, d => d.playSec >= h * 3600]),
];
export const AWARD_HEROISM = 5;   // 점수 × 5 명예
export function checkAwards(d, run) {
  const got = [];
  for (let pass = 0; pass < 2; pass++) AWARDS.forEach((a, i) => { if (!d.awards[i] && a[3](d, run)) { d.awards[i] = 1; d.heroism += a[2] * AWARD_HEROISM; got.push(i); } });
  return got;
}

// ---------- 오늘의 작전 ----------
export const MISSION_POOL = [
  { id: 'clear', text: '스테이지 하나 깨기', goal: 1 },
  { id: 'kills', text: '몬스터 300마리 물리치기', goal: 300 },
  { id: 'special', text: '필살기 3번 쓰기', goal: 3 },
  { id: 'perfect', text: '목숨 20으로 깨기', goal: 1 },
  { id: 'objects', text: '상자 · 바위 5개 부수기', goal: 5 },
  { id: 'early', text: '웨이브 당기기 5번', goal: 5 },
  { id: 'levels', text: '병사 강화 10번', goal: 10 },
  { id: 'inf', text: '무한 모드 웨이브 15 넘기', goal: 15, need: d => Object.keys(d.cleared).length >= 1 },
  { id: 'gate', text: '성문 부수기 한 번 깨기', goal: 1, need: d => Object.keys(d.cleared).length >= 3 },
];
export const MISSION_REWARD = 60, MISSION_BONUS = 120;
export function missions(d, day) {
  if (d.missions.date === day) return d.missions;
  let h = 0; for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pool = MISSION_POOL.filter(m => !m.need || m.need(d)), pick = [];
  while (pick.length < 3 && pool.length) { h = (h * 1103515245 + 12345) >>> 0; pick.push(pool.splice(h % pool.length, 1)[0]); }
  d.missions = { date: day, list: pick.map(m => ({ id: m.id, text: m.text, goal: m.goal, n: 0, done: false, got: false })), bonus: false };
  return d.missions;
}
// 판 결과를 작전에 반영 → 새로 끝난 것 수
export function noteMissions(d, day, r) {
  const ms = missions(d, day); let n = 0;
  for (const m of ms.list) {
    if (m.done) continue;
    const add = { clear: r.win ? 1 : 0, kills: r.kills, special: r.specials, perfect: r.win && r.life >= 20 ? 1 : 0, objects: r.objects, early: r.early, levels: r.levels, inf: r.mode === 1 ? r.wave : 0, gate: r.mode === 2 && r.win ? 1 : 0 }[m.id] || 0;
    m.n = m.id === 'inf' ? Math.max(m.n, add) : m.n + add;
    if (m.n >= m.goal) { m.n = m.goal; m.done = true; n++; }
  }
  return n;
}
export function claimMission(d, i) {
  const m = d.missions.list[i]; if (!m || !m.done || m.got) return 0;
  m.got = true; d.heroism += MISSION_REWARD;
  let v = MISSION_REWARD;
  if (!d.missions.bonus && d.missions.list.every(x => x.got)) { d.missions.bonus = true; d.heroism += MISSION_BONUS; v += MISSION_BONUS; }
  return v;
}
