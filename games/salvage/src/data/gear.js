// 수달 인양단 — 장비 5단 · 부적 2칸 · 난이도 3 (M3-A · v0.6) — data.js 가 다시 내보냄
//  장비: 한 번 만들면 계속 · 쓰러져도 안 잃음 · 작업대 단계 필요 / 부적: 기억 진열장에서 만듦 · 이야기 물건(기억 도감)과 이어짐

export const GEAR = {
  vest:   { name: '방어구', tiers: [
    { txt: '없음', armor: 0 },
    { txt: '받는 피해 −12%', armor: 0.12, bench: 2, cost: { shells: 60,   cloth: 4,  bolt: 2 } },
    { txt: '받는 피해 −22%', armor: 0.22, bench: 3, cost: { shells: 340,  cloth: 12, bolt: 10 } },
    { txt: '받는 피해 −32%', armor: 0.32, bench: 4, cost: { shells: 850,  cloth: 20, bolt: 16, core: 1 } },
    { txt: '받는 피해 −40%', armor: 0.40, bench: 5, cost: { shells: 1900, cloth: 28, bolt: 22, core: 1, chest: 1 } },
    { txt: '받는 피해 −47%', armor: 0.47, bench: 5, cost: { shells: 3600, cloth: 36, bolt: 30, core: 2, crown: 1 } } ] },
  helmet: { name: '헬멧', tiers: [
    { txt: '없음', hp: 0 },
    { txt: '체력 +15', hp: 15, bench: 2, cost: { shells: 50,   bolt: 4,  cloth: 1 } },
    { txt: '체력 +30', hp: 30, bench: 3, cost: { shells: 300,  bolt: 12, glass: 2 } },
    { txt: '체력 +50', hp: 50, bench: 4, cost: { shells: 750,  bolt: 18, glass: 4, core: 1 } },
    { txt: '체력 +70', hp: 70, bench: 5, cost: { shells: 1700, bolt: 24, glass: 6, core: 1, lens: 2 } },
    { txt: '체력 +95 · 헤드램프 둘', hp: 95, vision: 1.06, bench: 5, cost: { shells: 3300, bolt: 30, glass: 10, core: 2, beacon: 1 } } ] },
  bag:    { name: '가방', tiers: [
    { txt: '4×3 · 편한 무게 12kg', w: 4, h: 3, comfy: 12 },
    { txt: '5×3 · 편한 무게 16kg', w: 5, h: 3, comfy: 16, bench: 2, cost: { shells: 70,   cloth: 4 } },
    { txt: '5×4 · 편한 무게 20kg', w: 5, h: 4, comfy: 20, bench: 3, cost: { shells: 400,  cloth: 14, bolt: 6 } },
    { txt: '6×4 · 편한 무게 26kg', w: 6, h: 4, comfy: 26, bench: 4, cost: { shells: 900,  cloth: 22, bolt: 10 } },
    { txt: '6×5 · 편한 무게 32kg', w: 6, h: 5, comfy: 32, bench: 5, cost: { shells: 2000, cloth: 30, bolt: 16, rope: 4 } },
    { txt: '6×5 · 편한 무게 42kg · 무거워도 덜 느림', w: 6, h: 5, comfy: 42, slow: 0.6, bench: 5, cost: { shells: 3400, cloth: 40, bolt: 22, core: 1, tarp: 4 } } ] },
};
export const GEAR_MAX = 5;
export const ROMAN = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'];

/* ───── 부적 2칸 (작은 패시브) — 기억 진열장(shelf) 1단계 = 1칸 · 2단계 = 2칸 · 3단계 = 효과 ×1.5 ─────
 *  need: 기억 도감(S.story.codex)에 그 물건이 한 번이라도 들어와야 만들 수 있음 (= 이야기 물건과 이어짐) · cost: 만들 때 드는 것(그 물건 포함)
 *  fx 키(loadout 이 읽음): search 뒤지기 빠르기 · vision 시야 · loot 상자 값 · hp 체력 · stam 기력 회복 · roll 구르기 기력 · o2 산소 줄어듦
 *    · hold 탈출 버티기 시간 · boss 보스 피해 · appraise 감정 · keep 쓰러져도 지킬 물건 수 · water 물속 걸음 · dark 정전 · 밤 시야 */
export const CHARMS = {
  c_tag:     { name: '이름표 매듭',     need: 'tagbox',   from: '창고 이름표 상자', fx: { search: 0.12 }, txt: '뒤지기 +12%', story: '손글씨 이름표를 끊지 않고 매듭으로 묶었다. 주인을 찾을 때까지.', cost: { shells: 120, cloth: 4 } },
  c_kelp:    { name: '느루의 해초 끈',  need: 'kelp',     from: '해초 다발',       fx: { stam: 0.12 },   txt: '기력 회복 +12%', story: '"먹고 가" 하며 손목에 감아 준 끈.', cost: { shells: 80, kelp: 3 } },
  c_coin:    { name: '소원 동전',       need: 'coins',    from: '옛 동전',         fx: { loot: 0.05 },   txt: '상자 값 +5%', story: '축제 날 분수에 던진 동전. 소원은 아직 젖어 있다.', cost: { shells: 150, coins: 3 } },
  c_glass:   { name: '등롱 유리 조각',  need: 'gem',      from: '바다 유리',       fx: { vision: 0.08 }, txt: '시야 +8%', story: '깨진 축제 등롱. 파도가 7년 동안 둥글게 깎았다.', cost: { shells: 180, gem: 2 } },
  c_mongi:   { name: '몽이의 조개',     need: 'kelp', fac: ['aquarium', 1], from: '수족관 1단계', fx: { roll: 0.12 }, txt: '구르기 기력 −12%', story: '몽이가 물어다 준 작은 조개. 매일 하나씩.', cost: { shells: 160, glass: 2 } },
  c_compass: { name: '언덕 나침반',     need: 'compass',  from: '금 나침반',       fx: { hold: 0.15 },   txt: '탈출 버티기 −15%', story: '북쪽 대신 언덕을 가리키도록 바늘을 고쳐 놓았다.', cost: { shells: 260, compass: 1 } },
  c_pearl:   { name: '흑진주 귀걸이',   need: 'pearl',    from: '흑진주',          fx: { appraise: 0.06 }, txt: '보물 팔 때 +6%', story: '연구소 산호 수조에서만 자라던 것.', cost: { shells: 300, pearl: 2 } },
  c_crown:   { name: '첫 대장 배지',    need: 'crown',    from: '잠수왕의 투구',   fx: { hp: 12 },       txt: '체력 +12', story: '투구 안쪽에 새겨진 대원 이름들 맨 위의 것.', cost: { shells: 400, crown: 1 } },
  c_spy:     { name: '마지막 배 망원경 끈', need: 'spyglass', from: '선장의 망원경', fx: { boss: 0.08 }, txt: '보스 피해 +8%', story: '떠나는 배를 마지막까지 본 사람의 끈.', cost: { shells: 350, spyglass: 1 } },
  c_beacon:  { name: '등대 빛 조각',    need: 'beacon',   from: '등대 렌즈',       fx: { dark: 0.15 },   txt: '정전 · 밤 시야 +15%', story: '축제의 밤 꺼진 빛. 아직 따뜻한 것 같다.', cost: { shells: 400, beacon: 1 } },
  c_ticket:  { name: '돌아올 표',       need: 'ticket',   from: '옛 승차권',       fx: { keep: 1 },      txt: '쓰러져도 가방에서 가장 값진 것 1개 지킴', story: '날짜가 축제 다음 날. 돌아올 생각이었던 거다.', cost: { shells: 450, ticket: 3 } },
  c_fang:    { name: '장어 이빨 목걸이', need: 'fang',    from: '장어 이빨',       fx: { o2: 0.15, water: 0.06 }, txt: '산소 −15% · 물속 걸음 +6%', story: '터널을 지키던 것. 집이 무너지면 누구든 사나워진다.', cost: { shells: 500, fang: 1 } },
};
export const CHARM_KEYS = Object.keys(CHARMS);

/* ───── 난이도 3 — 은신처에서 언제든 바꿈 · 보상 차이는 작게(몰래 바꾸지 않음 · 고른 대로만) ───── */
export const DIFF = {
  easy:   { name: '편하게', txt: '적이 약하고 덜 아파요 · 보상 −8%', foeHp: 0.8, foeDmg: 0.65, loot: 0.92, icon: '🌤' },
  normal: { name: '보통',   txt: '기본', foeHp: 1, foeDmg: 1, loot: 1, icon: '🌊' },
  deep:   { name: '깊게',   txt: '적이 세고 더 아파요 · 보상 +10%', foeHp: 1.2, foeDmg: 1.3, loot: 1.1, icon: '🌀' },
};
export const DIFF_KEYS = Object.keys(DIFF);

/* ───── 맵 장비 3 (M4-B · 판 상태 대응) — 작업대에서 한 번 만들면 계속 · 출격 준비에서 하나만 챙김(S.mgSel) · 예보에 맞는 것을 '권장' ─────
 *  가진 것: S.gear[키] = 1 (저장 옮기기 그대로) · 효과 숫자는 data/weather.js (COLD.suit · TOXIC.filter · LAMP_GEAR) */
export const MAP_GEAR = {
  drysuit: { name: '방한 잠수복', icon: '🧥', wx: ['cold'], txt: '한파: 체온이 1/3만 줄고 얼음에 덜 미끄러워요', bench: 2, cost: { shells: 220, cloth: 10, wire: 4 } },
  filter:  { name: '해독 필터', icon: '😷', wx: ['toxic'], txt: '독수: 독이 1/3만 오르고 2.5배 빨리 빠져요', bench: 2, cost: { shells: 200, glass: 3, herb: 6 } },
  hlamp:   { name: '고성능 헤드램프', icon: '🔦', wx: ['night', 'fog'], txt: '밤 · 안개 · 정전: 시야 +25% · 어둠이 옅어져요', bench: 3, cost: { shells: 320, lens: 1, wire: 6, glass: 2 } },
};
export const MAP_GEAR_KEYS = Object.keys(MAP_GEAR);
