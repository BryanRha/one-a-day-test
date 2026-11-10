// 수달 인양단 — 반려 2 (M5-C · v0.8): 몽이 5단 성장 + 두 번째 반려 '반디'(빛 해마) — data.js 가 다시 내보냄
//  S.pets = { mong: 0~5, bandi: 0~3 } · 0 = 아직 없음. 몽이는 수족관 1단계에 1단(합류) · 반디는 이야기 5장 '조용한 수조'(b_tank)를 끝내면 1단(합류)
//  단계 올리기 = 조개 + 먹이(말린 생선 · 빛이끼 표본 …) — 단계 상한은 시설(각 단계 cap = econ.petCap 의 유일한 기준): 몽이 수족관 1 → 2단 · 수족관 2 → 3 · 4단 · 수족관 3 → 5단 / 반디 쉼터 1 → 2단 · 쉼터 2 → 3단
//  M6-C (검수 M5 목록 9): 엔딩(약 48일) 전에 몽이 4~5단을 보게 값 · 상한을 앞당김 — 숫자 근거 docs/BALANCE.md 9장
//  능력 = 판 안 보조(작고 눈에 보이게 · 한 판 한 번짜리는 판 아래 작은 칩으로 남은 수 표시). 단계 능력은 쌓임(2단 능력은 3 · 4 · 5단에도)
//  외형: 몽이 = 크기 + 단계 장식(목도리 → 가방 → 고글 → 등불) · 반디 = 크기 + 빛 세기 + 갈기 색
export const PETS = {
  mong: { name: '몽이', kind: '반려 수달', color: '#8a6a4c', stages: [null,
    { name: '아기 몽이',   scale: 0.30, txt: '주머니에 물건을 넣어 줘요', fx: {} },
    { name: '꼬마 몽이',   scale: 0.33, wear: ['f_scarf_coral'], txt: '뒤에서 오는 적을 알려 줘요 (끽!)', fx: { warn: 6 }, cost: { shells: 220, herb: 6 }, cap: ['aquarium', 1] },
    { name: '씩씩한 몽이', scale: 0.36, wear: ['f_scarf_coral', 'bag0'], txt: '상자를 같이 뒤져요 (뒤지기 +15%)', fx: { search: 0.15 }, cost: { shells: 560, fish: 1, herb: 10, cloth: 6 }, cap: ['aquarium', 2] },
    { name: '든든한 몽이', scale: 0.39, wear: ['f_scarf_coral', 'bag0', 'h_mechanic'], txt: '한 판에 한 번 — 체력이 35% 아래면 연고를 꺼내 줘요 (+30)', fx: { medic: 0.35, heal: 30 }, cost: { shells: 800, herb: 12, cloth: 8, glass: 3 }, cap: ['aquarium', 2] },
    { name: '대장 몽이',   scale: 0.42, wear: ['f_scarf_coral', 'bag1', 'h_mechanic'], txt: '한 판에 한 번 — 바짝 다가온 적을 물어 2초 멈추게 해요', fx: { bite: 2 }, cost: { shells: 1100, herb: 16, glass: 4, cloth: 10 }, cap: ['aquarium', 3] },
  ] },
  bandi: { name: '반디', kind: '빛 해마', color: '#5fe0d0', beat: 'b_tank', stages: [null,
    { name: '아기 반디', scale: 0.8, glow: 0.6, txt: '어두운 곳에서 둘레를 밝혀요 (시야 +8%)', fx: { vision: 0.08 } },
    { name: '반디',      scale: 1.0, glow: 0.85, txt: '5초마다 가까운 적에 빛 표시 · 시야 +12%', fx: { vision: 0.12, ping: 5 }, cost: { shells: 1200, sample: 3, coral: 1, glass: 6 }, cap: ['den', 1] },
    { name: '등불 반디', scale: 1.2, glow: 1.1, txt: '한 판에 한 번 — 체력이 30% 아래면 빛을 터뜨려 둘레 적을 2초 멈추게 해요', fx: { vision: 0.15, ping: 4, flash: 2 }, cost: { shells: 2600, sample: 5, coral: 2, battery: 2 }, cap: ['den', 2] },
  ] },
};
export const PET_KEYS = Object.keys(PETS);
export const PET_MAX = { mong: 5, bandi: 3 };
