// 수달 인양단 — 은신처 시설 12 · 42단계 (M3-A · v0.6) — data.js 가 다시 내보냄
//  S.fac[k] = 지은 단계 수 (0 = 아직 없음). levels[i] = (i+1)단계 짓는 비용 · 시간(초) · 효과(econ.loadout 이 읽음)
//  cost 키: shells · 재료(MATS) · 부품 아이템(ITEMS 키, 창고에서 꺼냄)
//  열림: unlock(이 의뢰를 끝내야) 또는 req(시설 단계 · 지도) — 새 시설 4개는 의뢰 번호에 기대지 않음(의뢰는 M3-C 가 늘림)
//  art: 시설 카드 그림(ui.js FAC_ART) · tint: 카드 색 · who: 그 자리 인물(이야기)
//  근거: docs/BALANCE.md 5장 — 시뮬 300명 × 45일 7일 차 25~35% · 21일 차 60% 안팎

export const FACILITIES = {
  bench: { name: '작업대', icon: '🔧', tint: '#c98a4a', who: 'moru', desc: '무기 · 장비 제작', start: 1, levels: [
    { txt: '작살 권총 · 기본 장비', short: '권총' },
    { cost: { shells: 90, bolt: 6 },                         time: 300,   txt: '소총 · 렌치 · 장비Ⅰ 제작', short: '소총 · 장비Ⅰ' },
    { cost: { shells: 600, bolt: 13, wire: 6, spring: 2 },    time: 72000,  txt: '산탄 · 리벳 · 망원 · 잠수 · 장비Ⅱ 제작', short: '무기 4 · 장비Ⅱ' },
    { cost: { shells: 1840, bolt: 24, wire: 14, core: 1 },    time: 129600, txt: '대형 작살 · 전류 · 장비Ⅲ 제작', short: '무기 2 · 장비Ⅲ' },
    { cost: { shells: 7950, bolt: 48, wire: 29, core: 2, motor: 1 }, time: 266400, txt: '조명탄 발사기 · 장비Ⅳ · Ⅴ 제작', short: '조명탄 · 장비Ⅳ·Ⅴ' } ] },
  store: { name: '창고', icon: '📦', tint: '#b8925a', who: 'gombang', desc: '보관 칸 · 안전 칸', start: 1, levels: [
    { txt: '보관 30칸 · 안전 1칸', cap: 30, safe: [1, 1], short: '30칸' },
    { cost: { shells: 50, cloth: 3 },                         time: 120,   txt: '보관 50칸 · 출격 때 연고 1개', cap: 50, safe: [1, 1], kit: 1, short: '50칸 · 연고' },
    { cost: { shells: 370, cloth: 10, bolt: 7 },              time: 43200,  txt: '보관 80칸 · 안전 칸 2×1', cap: 80, safe: [2, 1], kit: 1, short: '80칸 · 안전 2' },
    { cost: { shells: 1150, cloth: 18, bolt: 13, wire: 6 },   time: 108000, txt: '보관 120칸 · 안전 칸 3×1 · 연고 2개', cap: 120, safe: [3, 1], kit: 2, short: '120칸 · 안전 3' },
    { cost: { shells: 5720, cloth: 38, bolt: 29, core: 1 },   time: 216000, txt: '보관 180칸 · 안전 칸 2×2 · 연고 2개', cap: 180, safe: [2, 2], kit: 2, short: '180칸 · 안전 2×2' } ] },
  rack: { name: '무기대', icon: '🎯', tint: '#7fb7d9', who: 'moru', desc: '개조 부품 제작', unlock: 'q2', levels: [
    { cost: { shells: 80, bolt: 6 },                         time: 300,   txt: '개조 Mk1 (조준경 · 총열 · 탄창 · 약실 · 손잡이)', mk: 1, short: 'Mk1' },
    { cost: { shells: 480, bolt: 11, wire: 6 },               time: 57600,  txt: '개조 Mk2 · 보조 무기 칸', mk: 2, side: true, short: 'Mk2 · 보조' },
    { cost: { shells: 1590, bolt: 20, wire: 12, core: 1 },    time: 126000, txt: '개조 Mk3', mk: 3, side: true, short: 'Mk3' },
    { cost: { shells: 6970, bolt: 43, wire: 24, core: 2 },    time: 244800, txt: '특수 부품 (보스 보물로 · 칸마다 하나)', mk: 4, side: true, short: '특수 부품' } ] },
  clinic: { name: '의무실', icon: '💊', tint: '#7fb48a', who: 'haedam', desc: '체력 · 회복약', unlock: 'q3', levels: [
    { cost: { shells: 90, cloth: 4, herb: 4 },               time: 300,   txt: '연고 제작 · 체력 +10', hp: 10, short: '연고 · 체력+10' },
    { cost: { shells: 440, cloth: 8, herb: 6 },              time: 50400,  txt: '큰 붕대 제작 · 체력 +25', hp: 25, short: '붕대 · +25' },
    { cost: { shells: 1150, cloth: 13, herb: 11, core: 1 },   time: 108000, txt: '체력 +40 · 쓰러질 때 한 번 버팀', hp: 40, last: true, short: '+40 · 한 번 버팀' },
    { cost: { shells: 5140, cloth: 28, herb: 24, core: 1 },   time: 205200, txt: '체력 +55 · 회복약 효과 +25%', hp: 55, last: true, heal: 1.25, short: '+55 · 회복 +25%' } ] },
  lab: { name: '연구대', icon: '🔬', tint: '#8fb3d9', who: 'seori', desc: '감정 · 투척물', unlock: 'q4', levels: [
    { cost: { shells: 120, wire: 6, glass: 2 },               time: 300,   txt: '연막탄 제작 · 상자 등급 빛', glow: true, short: '연막 · 등급 빛' },
    { cost: { shells: 530, wire: 10, glass: 5 },              time: 61200,  txt: '수류탄 제작 · 보물 감정 +15%', glow: true, appraise: 0.15, short: '수류탄 · 감정' },
    { cost: { shells: 860, wire: 16, glass: 8, core: 1 },   time: 97200, txt: '감정 +30% · 발전기 · 금고실 위치 표시', glow: true, appraise: 0.3, hints: true, short: '감정 +30%' } ] },
  kitchen: { name: '주방', icon: '🍲', tint: '#d9a66a', who: 'neuru', desc: '출격 전 요리', unlock: 'q5', levels: [
    { cost: { shells: 80, bolt: 4, herb: 6 },                time: 300,   txt: '생선 수프 (기력 회복 +35%)', meal: 1, short: '수프' },
    { cost: { shells: 410, herb: 8, cloth: 5 },              time: 50400,  txt: '해초 주먹밥 (이동 +7%)', meal: 2, short: '주먹밥' },
    { cost: { shells: 970, herb: 13, glass: 3, core: 1 },     time: 100800, txt: '조개 구이 (뒤지기 1.4배 · 체력 +15)', meal: 3, short: '조개 구이' } ] },
  aquarium: { name: '수족관', icon: '🦦', tint: '#6fc7c0', who: 'neuru', desc: '반려 수달 몽이', unlock: 'q7', levels: [
    { cost: { shells: 200, glass: 4, cloth: 6 },              time: 1800,  txt: '몽이 합류 · 주머니 1×2 (무게 0)', pet: [1, 2], short: '몽이 · 1×2' },
    { cost: { shells: 880, glass: 6, cloth: 8 },             time: 97200, txt: '주머니 2×2 · 귀한 상자 알려 줌', pet: [2, 2], sniff: true, short: '2×2 · 냄새' },
    { cost: { shells: 2840, glass: 11, core: 2 },             time: 154800, txt: '주머니 3×2 · 쓰러져도 몽이가 지켜 옴', pet: [3, 2], sniff: true, petSafe: true, short: '3×2 · 지켜 옴' } ] },
  lights: { name: '조명', icon: '💡', tint: '#ffc861', who: 'moru', desc: '시야 · 정전 대비', unlock: 'q8', levels: [
    { cost: { shells: 150, wire: 8, glass: 2 },               time: 1800,  txt: '헤드램프: 시야 +15%', vision: 1.15, short: '시야 +15%' },
    { cost: { shells: 790, wire: 11, glass: 5 },              time: 93600, txt: '정전 때도 반만 어두움 · 원뿔 밖 적 표시', vision: 1.15, blackout: 0.5, sense: true, short: '정전 반 · 적 표시' },
    { cost: { shells: 2540, wire: 19, glass: 9, core: 1 },   time: 147600, txt: '시야 +30% · 은신처 불빛', vision: 1.3, blackout: 0.5, sense: true, short: '시야 +30%' } ] },
  /* ── M3-A 새 시설 4 ── */
  ammo: { name: '탄약대', icon: '🧨', tint: '#c9604a', who: 'moru', desc: '관통 · 전기 작살촉', req: { fac: ['bench', 3] }, levels: [
    { cost: { shells: 320, bolt: 9, powder: 3 },             time: 39600,  txt: '관통 작살촉 상자 만들기', ammo: 1, short: '관통탄' },
    { cost: { shells: 1060, bolt: 13, powder: 6, wire: 5 },    time: 104400, txt: '전기 작살촉 상자 만들기', ammo: 2, short: '전기탄' },
    { cost: { shells: 4310, bolt: 26, powder: 15, core: 1 },  time: 187200, txt: '한 번에 상자 2개씩', ammo: 2, twice: true, short: '상자 ×2' } ] },
  gym: { name: '잠수 훈련장', icon: '🏊', tint: '#5fa8d3', who: 'haedam', desc: '기력 · 구르기 · 숨', req: { fac: ['clinic', 2] }, levels: [
    { cost: { shells: 380, cloth: 7, bolt: 5 },               time: 46800,  txt: '기력 최대 +15', stamMax: 15, short: '기력 +15' },
    { cost: { shells: 1280, cloth: 11, bolt: 10 },            time: 111600, txt: '구르기 기력 −15% · 산소 +15', stamMax: 15, roll: 0.15, o2: 15, short: '구르기 · 숨' },
    { cost: { shells: 4850, cloth: 23, bolt: 21, core: 1 },   time: 198000, txt: '이동 +5% · 기력 회복 +15%', stamMax: 15, roll: 0.15, o2: 15, speed: 1.05, stam: 1.15, short: '이동 +5%' } ] },
  shelf: { name: '기억 진열장', icon: '🏺', tint: '#9a8fb5', who: 'seori', desc: '부적 (이야기 물건으로)', req: { fac: ['lab', 1] }, levels: [
    { cost: { shells: 280, glass: 2, cloth: 4 },              time: 36000,  txt: '부적 만들기 · 부적 1칸', charm: 1, short: '부적 1칸' },
    { cost: { shells: 970, glass: 5, cloth: 6 },              time: 100800, txt: '부적 2칸', charm: 2, short: '부적 2칸' },
    { cost: { shells: 4060, glass: 13, core: 1 },             time: 180000, txt: '부적 효과 ×1.5', charm: 2, charmMul: 1.5, short: '효과 ×1.5' } ] },
  dock: { name: '선착장', icon: '⛵', tint: '#6b8fb5', who: 'baram', desc: '행상 · 구조 보트', req: { map: 'harbor' }, levels: [
    { cost: { shells: 410, bolt: 8, cloth: 8 },             time: 50400,  txt: '바람 행상이 들러요 (요일마다 물건이 바뀜)', trader: 1, short: '행상' },
    { cost: { shells: 1410, bolt: 14, cloth: 11, wire: 6 },   time: 118800, txt: '행상 물건 +2 · 상인 값 −10%', trader: 2, discount: 0.1, short: '물건 +2 · −10%' },
    { cost: { shells: 5140, bolt: 31, wire: 17, core: 1 },    time: 205200, txt: '구조 보트: 쓰러져도 가방에서 가장 값진 것 1개를 건져 옴', trader: 2, discount: 0.1, rescue: 1, short: '구조 보트' } ] },
};
export const FAC_KEYS = Object.keys(FACILITIES);
export const FAC_TOTAL = FAC_KEYS.reduce((s, k) => s + FACILITIES[k].levels.length, 0);
