// 판 로직 (화면과 분리 · Node 에서 봇으로도 돌림)
// 원작 좌표계 그대로: 판 675×450px(15×10칸, 칸 45px), 위치 단위 = px×50, 1틱 = 1/41초
// 화면은 이 좌표를 시계 방향 90° 돌려 세로로 그린다 (view.js)
import { T, nameOfChar } from './data.js?v=0.95.1';
import { HPS } from './balance.js?v=0.95.1';

export const TICK = 41;
const TILE = 45, U = 50;
const DIR = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];   // 북 북동 동 남동 남 남서 서 북서
const cen = t => (t * TILE + 22) * U;

// 결정적 난수 (봇 · 재현용)
export function rng(seed) { let s = seed >>> 0 || 1; return n => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return n ? s % n : 0; }; }

export const CHAR = { PRICE: 0, UP_PRICE: 1, PWR: 2, RATE: 3, RANGE: 4, TARGET: 5, EFFECT: 6, SUC: 7, CONT: 8, ATT_TYPE: 9, ATT_FX: 10, CLASS: 11, DETAIL: 12 };
// 직업(0~11) → 그림 묶음 번호 (원작 렌더러 표)
export const DETAIL_SPRITE = [200, 203, 201, 202, 204, 207, 205, 206, 208, 211, 209, 210];
export const HERO_SPRITE = [300, 301, 302];
// 처음 살 수 있는 병사 (계열마다 기본 직업 1레벨 행)
export const BUY_ROWS = { warrior: 0, archer: 12, wizard: 24 };
// 공격 소리 / 맞는 소리 (직업별, 원작 표)
const VOICE = [21, 23, 21, 22, 24, 26, 24, 25, 27, 29, 28, 28];
const HITSND = [1, 2, 1, 1, 3, 4, 3, 3, 5, 7, 6, 6];

// 원어데이 다듬기 (모두에게 같은 값 · 봇으로 정함)
export let HP_SCALE = 1;
export let GATE_SCALE = 2;   /* 성문 체력 배율 (봇: 성문 부수기 한 판 5~8분 · 한 번에 깨는 비율 약 75%) */
export let SPECIAL_COOL_SCALE = 0.5;   /* 원작 125초 → 약 60초 (봇: 판당 필살기 8~12번 · tools/campaign.mjs) */
export function tune(o) { if (o.gate != null) GATE_SCALE = o.gate; if (o.hp != null) HP_SCALE = o.hp; if (o.cool != null) SPECIAL_COOL_SCALE = o.cool; }
export function emptyMeta() { return { unit: Array(18).fill(0), hero: [Array(6).fill(0), Array(6).fill(0), Array(6).fill(0)], items: [[-1, -1], [-1, -1], [-1, -1]], heroes: [true, false, false], special: true, skill: false }; }

export class Sim {
  constructor(stage = 0, opt = {}) {
    this.stage = stage; this.rand = rng(opt.seed || 12345);
    this.mode = opt.mode || 0;            // 0 일반 · 1 무한 · 2 성문 부수기
    this.meta = opt.meta || emptyMeta();  // 강화 · 장비 · 해금 (판 밖 성장)
    this.bundle = opt.bundle || 1;  /* 원어데이 판 길이 맞춤: 몬스터가 나오는 간격 ÷ bundle */ this.hpScale = opt.hpScale;        // 웨이브 묶기 (원어데이 판 길이 맞춤): 2면 두 웨이브씩 이어서 나옴
    this.stats = { details: new Set(), specialBest: 0, spBest: [0, 0, 0], minLife: 20, heroUsed: false, maxGold: 0, objects: 0, early: 0, levels: 0, maxLv: Array(12).fill(0), heroLv: [0, 0, 0], classes: new Set() };
    this.events = [];   // 화면 쪽에 넘길 일 (소리 · 효과 · 숫자)
    const st = T.stage[stage];
    this.money = st[0]; this.mana = st[1]; this.life = 20; this.maxLife = 20;
    this.wave = 0; this.waveTotal = T.waveCount[stage]; this.kills = 0; this.leaks = 0; this.perfectWaves = 0;
    this.time = 0; this.state = 'ready'; this.startDelay = 90; this.waveDelay = 0;
    this.monsters = []; this.towers = []; this.objects = []; this.arrows = []; this.fx = [];
    this.focus = null;   // 사용자가 누른 몬스터/물건
    this.loadMap(stage);
    this.mob = T.mobs[stage];
    this.special = null;  // 진행 중인 필살기 연출
    if (this.mode === 2) for (const o of this.objects) if (o.role === 'start') { o.destroyable = true; o.hp = o.maxHp = Math.floor(T.gateHp[stage] * GATE_SCALE / (this.starts.length === 2 ? 2 : 1)); }
    if (opt.startGold > 0) this.money += opt.startGold;
  }
  emit(type, o = {}) { this.events.push({ type, ...o }); }

  loadMap(n) {
    const m = T.maps[n];
    this.tiles = []; this.move = [];
    for (let y = 0; y < 10; y++) for (let x = 0; x < 15; x++) { (this.tiles[x] ||= [])[y] = m.tiles[y * 15 + x]; (this.move[x] ||= [])[y] = m.move[y * 15 + x]; }
    const seen = new Set(); this.starts = [];
    for (const s of m.starts) { const k = s.join(','); if (!seen.has(k)) { seen.add(k); this.starts.push(s); } }
    this.ends = m.ends; this.startLoop = 0;
    for (let y = 0; y < 10; y++) for (let x = 0; x < 15; x++) { const o = m.objs[y * 15 + x]; if (o >= 0) this.addObject(o, x, y); }
    for (const [x, y] of this.starts) {
      const mv = this.move[x][y];
      this.addObject(mv & 4 ? 207 : mv & 16 ? 200 : 201, x, y, 'start');
    }
    for (const [x, y] of this.ends) {
      if (x - 1 >= 0 && this.move[x - 1][y] & 4) this.addObject(203, x, y, 'goal');
      else if (x + 1 < 15 && this.move[x + 1][y] & 64) this.addObject(208, x, y, 'goal');
      else this.addObject(202, x, y + 1, 'goal');
    }
  }
  addObject(serial, bx, by, role) {
    const idx = T.object.findIndex(r => r[0] === serial); if (idx < 0) return;
    const r = T.object[idx], size = r[5];
    const o = { id: this.objects.length, type: idx, serial, role: role || (serial >= 200 ? 'gate' : 'obj'), bx, by, size, hp: r[2], maxHp: r[2], destroyable: r[1] === 0 && r[2] > 0, reward: r[3], rewardValue: r[4], alive: true };
    if (size === 0 || size >= 3) { o.x = cen(bx); o.y = cen(by); }
    else if (size === 1) { o.x = cen(bx); o.y = cen(by + 1); }
    else { o.x = (bx + 1) * TILE * U; o.y = cen(by + 1); }
    this.objects.push(o);
  }
  // 이 칸을 물건이 차지하나 (원작 배치 검사와 같은 발자국)
  objectAt(i, j) {
    for (const o of this.objects) {
      if (!o.alive) continue;
      const px = Math.floor(o.x / U / TILE), py = Math.floor(o.y / U / TILE);
      if (o.size === 0 && i === px && j === py) return o;
      if (o.size === 1 && i === px && j >= py - 1 && j <= py) return o;
      if (o.size === 2 && i >= px - 1 && i <= px && j >= py - 1 && j <= py) return o;
      if (o.size === 3 && i >= px && i <= px + 1 && j >= py - 1 && j <= py + 1) return o;
      if (o.size === 4 && i >= px - 1 && i <= px && j >= py - 1 && j <= py + 1) return o;
      if (o.size === 5 && i >= px - 1 && i <= px + 1 && j >= py - 1 && j <= py) return o;
    }
    return null;
  }
  canPlace(i, j) {
    if (i < 0 || j < 0 || i >= 15 || j >= 10) return false;
    if (this.tiles[i][j] !== -1) return false;
    if (this.towers.some(t => t.bx === i && t.by === j)) return false;
    return !this.objectAt(i, j);
  }
  towerAt(i, j) { return this.towers.find(t => t.bx === i && t.by === j) || null; }

  // ---------- 판 밖 성장 (원작 강화 · 장비 표) ----------
  unitRate(cls, type) { let r = 0; T.upUnit.forEach((u, i) => { if ((u[5] === cls || u[5] === 0) && u[4] === type) r += (this.meta.unit[i] || 0) * u[0]; }); return r; }
  heroRate(g, type) { let r = 0; T.upHero.forEach((u, i) => { if (u[4] === type) r += (this.meta.hero[g]?.[i] || 0) * u[0]; }); return r; }
  itemRate(g, type) { let r = 0; for (const it of this.meta.items[g] || []) if (it >= 0 && T.item[it][5] === type) r += T.item[it][2]; return r; }

  // ---------- 병사 · 영웅 ----------
  buyPrice(row) { const c = T.char[row], p = c[CHAR.PRICE]; return p + Math.floor(p * this.unitRate(c[CHAR.CLASS] + 1, 6) / 100); }
  heroCost(row) { const g = T.hero[row][13], p = T.hero[row][0]; return Math.max(1, p + Math.floor(p * (this.heroRate(g, 6) + this.itemRate(g, 1)) / 100)); }
  heroAvailable(g) { return !!this.meta.heroes[g] && !this.towers.some(t => t.hero && t.group === g); }
  place(kind, i, j) {
    if (!this.canPlace(i, j)) return { ok: false, why: '여기에는 둘 수 없어요' };
    if (kind.startsWith('hero')) {
      const g = +kind.slice(4) || 0;
      if (!this.heroAvailable(g)) return { ok: false, why: '이미 세운 영웅이에요' };
      const row = g * 5, cost = this.heroCost(row);
      if (this.mana < cost) return { ok: false, why: `마나 ${cost} 필요` };
      this.mana -= cost; this.stats.heroUsed = true;
      const t = this.newTower(i, j, row, true); this.emit('place', { t, hero: true }); return { ok: true, t };
    }
    const row = BUY_ROWS[kind], cost = this.buyPrice(row);
    if (this.money < cost) return { ok: false, why: `골드 ${cost} 필요` };
    this.money -= cost;
    const t = this.newTower(i, j, row, false); t.spent = cost; t.placedAt = this.time; this.stats.details.add(t.detail); this.emit('place', { t }); return { ok: true, t };
  }
  noteLv(t) { if (t.hero) this.stats.heroLv[t.group] = Math.max(this.stats.heroLv[t.group], t.level); else { this.stats.maxLv[t.detail] = Math.max(this.stats.maxLv[t.detail], t.level); this.stats.classes.add(t.cls); } }
  newTower(i, j, row, hero) {
    const t = { id: Math.random(), bx: i, by: j, x: cen(i), y: cen(j), ox: cen(i), oy: cen(j), row, hero, status: 0, sc: 0, cool: 0, look: 2, lock: [], attackCount: 0, spent: 0, specialCool: 0 };
    this.restat(t); this.towers.push(t); this.noteLv(t); return t;
  }
  restat(t) {
    if (!t.hero) {
      const c = T.char[t.row];
      t.coolMax = Math.max(1, c[CHAR.RATE]); t.range = c[CHAR.RANGE]; t.targetMax = c[CHAR.TARGET];
      t.power = c[CHAR.PWR]; t.attType = c[CHAR.ATT_TYPE]; t.effect = c[CHAR.EFFECT]; t.attFx = c[CHAR.ATT_FX];
      t.detail = c[CHAR.DETAIL]; t.cls = c[CHAR.CLASS]; t.level = t.row % 3 + 1;
      if (t.targetMax > 1 && t.effect === -1) t.effect = 7;
      t.sprite = DETAIL_SPRITE[t.detail];
      const k = t.cls + 1;
      t.coolMax = Math.max(1, t.coolMax - Math.floor(t.coolMax * this.unitRate(k, 8) / 100));
      t.range += Math.floor(t.range * this.unitRate(k, 9) / 100);
      t.dmgUp = this.unitRate(k, 7);
    } else {
      const h = T.hero[t.row];
      t.coolMax = Math.max(1, h[2]); t.range = h[3]; t.targetMax = h[4]; t.power = h[1]; t.attType = h[11]; t.effect = -1; t.attFx = h[12];
      t.specialType = h[5]; t.specialMana = h[6]; t.specialPower = h[7]; t.specialCount = h[8]; t.specialCoolMax = h[9] * TICK;
      t.group = h[13]; t.level = t.row % 5 + 1; t.sprite = HERO_SPRITE[t.group];
      const g = t.group;
      t.coolMax = Math.max(1, t.coolMax - Math.floor(t.coolMax * (this.heroRate(g, 8) + this.itemRate(g, 3)) / 100));
      t.range += Math.floor(t.range * this.itemRate(g, 4) / 100);
      t.dmgUp = this.heroRate(g, 7) + this.itemRate(g, 2);
      t.specialMana += Math.floor(t.specialMana * (this.heroRate(g, 17) - this.itemRate(g, 7)) / 100);
      t.specialPower += Math.floor(t.specialPower * (this.heroRate(g, 16) + this.itemRate(g, 5)) / 100);
      t.specialCoolMax += Math.floor(t.specialCoolMax * (this.heroRate(g, 18) - this.itemRate(g, 6)) / 100);
      t.specialCoolMax = Math.round(t.specialCoolMax * SPECIAL_COOL_SCALE);
      if (this.meta.skill) { if (g === 1) { t.targetMax = 2; t.effect = 8; } else t.effect = 1; }
    }
    t.dist = ((t.range * TILE / 100) + 22) * U; t.dist2 = t.dist * t.dist;
  }
  levelInfo(t) {
    if (t.hero) { const nx = t.row % 5 < 4 ? t.row + 1 : -1; return nx < 0 ? null : { cost: this.heroCost(nx), cur: 'mana', next: nx }; }
    const nx = t.row % 3 < 2 ? t.row + 1 : -1; return nx < 0 ? null : { cost: this.buyPrice(nx), cur: 'money', next: nx };
  }
  classInfo(t) {
    if (t.hero) return null;
    const to = { 0: 6, 2: 9, 4: 18, 6: 21, 8: 30, 10: 33 }[t.detail];
    if (to === undefined) return null;
    return { cost: T.char[t.row][CHAR.UP_PRICE], next: to, name: nameOfChar(T.char[to][CHAR.DETAIL]) };
  }
  levelUp(t) {
    const li = this.levelInfo(t); if (!li) return false;
    if (li.cur === 'money') { if (this.money < li.cost) return false; this.money -= li.cost; t.spent += li.cost; }
    else { if (this.mana < li.cost) return false; this.mana -= li.cost; }
    t.row = li.next; this.restat(t); this.stats.levels++; this.noteLv(t); this.emit('levelup', { t }); return true;
  }
  classChange(t) {
    const ci = this.classInfo(t); if (!ci || this.money < ci.cost) return false;
    this.money -= ci.cost; t.spent += ci.cost; t.row = ci.next; this.restat(t); this.noteLv(t); this.stats.details.add(t.detail); this.emit('levelup', { t, cls: true }); return true;
  }
  sellValue(t) { return t.hero ? 0 : (this.time - (t.placedAt ?? -1e9) < 3 * TICK ? t.spent : Math.floor(t.spent / 2)); }
  sell(t) {
    if (t.hero) return false;
    this.money += this.sellValue(t); this.towers.splice(this.towers.indexOf(t), 1); this.emit('sell', { t }); return true;
  }
  heroes() { return this.towers.filter(t => t.hero); }
  readyHero() { return this.heroes().find(h => h.specialCool <= 0 && this.mana >= h.specialMana) || null; }
  canSpecial() { return !!this.meta.special && !this.special && this.state === 'play' && !!this.readyHero(); }
  useSpecial() {
    if (!this.canSpecial()) return false;
    const h = this.readyHero();
    this.mana -= h.specialMana; h.specialCool = h.specialCoolMax;
    this.special = { hero: h, t: 0, hitAt: 65, end: 150, kills: 0 }; this.stats.specials = (this.stats.specials || 0) + 1;
    this.emit('special', { hero: h });
    return true;
  }

  // ---------- 웨이브 ----------
  setWave() {
    let i = this.wave;
    if (i >= this.waveTotal) { if (this.mode === 1) i %= this.waveTotal; else return this.mode === 2 ? 'fail' : 'clear'; }
    const w = this.mob[i];
    if (this.mode === 0 || this.mode === 2) this.snap = this.snapshot();
    this.spawn = [
      { type: w[0], left: w[1], show: w[0] >= 0 ? Math.floor(T.monster[w[0]][8] / 3) * w[2] / 100 / this.bundle : 0, cur: 0 },
      { type: w[3], left: w[4], show: w[3] >= 0 ? Math.floor(T.monster[w[3]][8] / 3) * w[5] / 100 / this.bundle : 0, cur: 0 },
    ];
    this.spawnPos = 0; this.pattern = w[6]; this.gatePattern = w[7]; this.wavePerfect = true;
    this.emit('wave', { n: this.wave + 1, boss: w[6] >= 2 });
    return 'ok';
  }
  spawnUpdate() {
    const s = this.spawn, p = this.pattern;
    const cur = s[this.spawnPos];
    if (cur.left <= 0 || cur.type < 0) {
      if (p === 1) { this.spawnPos = 1 - this.spawnPos; if (s[this.spawnPos].left <= 0) return; }
      else { if (this.spawnPos === 0) this.spawnPos = 1; return; }
    }
    const c = s[this.spawnPos]; if (c.left <= 0 || c.type < 0) return;
    if (++c.cur >= c.show) {
      this.addMonster(c.type, (p === 2 || p === 3) && this.spawnPos === 0);
      c.left--; c.cur -= c.show;
      if (p === 1) { this.spawnPos = 1 - this.spawnPos; if (s[this.spawnPos].left === 0) this.spawnPos = 1 - this.spawnPos; }
    }
  }
  // 웨이브 곡선 한 줄 (60 넘으면 원작 무한 증가분을 더함)
  curve(wave) {
    const w = T.wave[Math.min(wave, 59)]; if (wave < 60) return w;
    const inf = T.wave[60], n = wave - 59; return w.map((v, k) => v + inf[k] * n);
  }
  addMonster(type, boss) {
    const w = this.curve(this.wave), st = T.stage[this.stage], md = T.monster[type];
    let hp = md[1];
    hp = boss ? Math.floor(Math.floor(hp * w[8] / 100) * st[3] / 100) : Math.floor(Math.floor(hp * w[0] / 100) * st[2] / 100);
    hp = Math.max(1, Math.round(hp * HP_SCALE * (this.hpScale ?? HPS[this.stage] ?? 1)));
    if (this.mode === 1 && this.wave >= this.waveTotal) hp = Math.round(hp * 1.06 ** (this.wave - this.waveTotal + 1));   /* 무한: 한 바퀴 뒤부터 웨이브마다 6%씩 단단해짐 */
    if (this.gatePattern === 0) this.startLoop = 0; else if (this.gatePattern === 1) this.startLoop = Math.min(1, this.starts.length - 1);
    const [sx, sy] = this.starts[this.startLoop];
    this.startLoop = (this.startLoop + 1) % this.starts.length;
    let speed = Math.floor(Math.floor(150 * md[4] * (boss ? w[10] : w[2]) / 100) / 100);
    let minSpeed = Math.min(speed, Math.floor(speed * (boss ? w[11] : w[3]) / 1000));
    this.monsterSeq = (this.monsterSeq || 0) + 1;
    const m = { id: this.monsterSeq, monster: true, type, boss, hp, maxHp: hp, def: Math.min(90, md[3] + (boss ? w[9] : w[1])), body: md[2], speed, minSpeed,
      x: cen(sx), y: cen(sy), fx: sx, fy: sy, status: 0, sc: 0, look: 2, dir: 0, stun: 0, slow: 0, holy: 0, holyDmg: 0, alive: true };
    m.dir = this.randomDir(sx, sy); if (m.dir < 0) m.dir = 2;
    m.tx = sx + DIR[m.dir][0]; m.ty = sy + DIR[m.dir][1];
    this.monsters.push(m);
    this.emit('spawn', { m });
  }
  randomDir(x, y) {
    const mv = this.move[x]?.[y] ?? 0, opts = [];
    for (let i = 0; i < 8; i++) if (mv & (1 << i)) opts.push(i);
    return opts.length ? opts[this.rand(opts.length)] : -1;
  }

  // ---------- 한 틱 ----------
  step() {
    this.events.length = 0;
    if (this.state === 'clear' || this.state === 'over') return;
    this.time++;
    if (this.special) { this.stepSpecial(); return; }
    if (this.state === 'ready') { if (--this.startDelay <= 0) { this.state = 'play'; this.setWave(); } return; }
    if (this.waveDelay > 0) { if (--this.waveDelay === 0) { const r = this.setWave(); if (r !== 'ok') { this.finish(r === 'clear'); return; } } }
    else {
      this.spawnUpdate();
    }
    if (this.stepMonsters()) { this.finish(false); return; }
    this.stepTowers(); this.stepArrows();
    if (this.state !== 'play') return;
    for (const t of this.towers) if (t.specialCool > 0) t.specialCool--;
    this.monsters = this.monsters.filter(m => m.alive);
    this.stats.minLife = Math.min(this.stats.minLife, this.life); if (this.money > this.stats.maxGold) this.stats.maxGold = this.money;
    if (this.waveDelay === 0 && this.monsters.length === 0 && this.spawnDone()) {
      if (this.wavePerfect) this.perfectWaves++;
      this.wave++;
      if (this.wave >= this.waveTotal && this.mode === 0) { this.finish(true); return; }
      if (this.wave >= this.waveTotal && this.mode === 2) { this.finish(false); return; }
      this.waveDelay = 60;
    }
  }
  // 다음 웨이브 당기기 (원어데이 추가): 지금 웨이브 몬스터가 다 나온 뒤면 언제든 · 앞당긴 만큼 골드 보너스
  spawnDone() { return !!this.spawn && this.spawn.every(s => s.left <= 0 || s.type < 0); }
  canCallEarly() { return this.state === 'play' && !this.special && this.spawnDone() && (this.mode === 1 || this.wave + 1 < this.waveTotal) && (this.waveDelay > 0 || this.monsters.some(m => m.alive && m.status === 0)); }
  earlyBonus() { const alive = this.monsters.filter(m => m.alive && m.status === 0).length; return 10 + Math.min(40, alive * 3) + Math.floor(this.wave / 2) * 2; }
  callEarly() {
    if (!this.canCallEarly()) return 0;
    const bonus = this.earlyBonus();
    this.money += bonus; this.stats.early++; this.emit('early', { bonus });
    if (this.wavePerfect && this.waveDelay === 0) this.carryPerfect = true;
    this.wave++; this.waveDelay = 0; this.setWave(); return bonus;
  }
  finish(win) {
    if (this.state === 'clear' || this.state === 'over') return;
    this.state = win ? 'clear' : 'over';
    this.idle = this.towers.filter(t => !t.hero && t.attackCount === 0).length;
    this.emit(win ? 'clear' : 'over', {});
  }
  // 웨이브 시작 때 판 상태 저장 (판 중간 이어하기)
  snapshot() {
    return { v: 1, stage: this.stage, mode: this.mode, wave: this.wave, money: this.money, mana: this.mana, life: this.life, kills: this.kills, leaks: this.leaks, perfectWaves: this.perfectWaves, time: this.time,
      towers: this.towers.map(t => [t.row, t.hero ? 1 : 0, t.bx, t.by, t.spent, t.specialCool]),
      objects: this.objects.map(o => [o.alive ? 1 : 0, o.hp]), details: [...this.stats.details], heroUsed: this.stats.heroUsed };
  }
  restore(sn) {
    Object.assign(this, { wave: sn.wave, money: sn.money, mana: sn.mana, life: sn.life, kills: sn.kills, leaks: sn.leaks, perfectWaves: sn.perfectWaves, time: sn.time });
    this.objects.forEach((o, i) => { const r = sn.objects[i]; if (r) { o.alive = !!r[0]; o.hp = r[1]; } });
    for (const [row, hero, bx, by, spent, sc] of sn.towers) { const t = this.newTower(bx, by, row, !!hero); t.spent = spent; t.specialCool = sc || 0; }
    for (const d of sn.details || []) this.stats.details.add(d);
    this.stats.heroUsed = !!sn.heroUsed;
    this.state = 'play'; this.startDelay = 0; this.waveDelay = 60; this.spawn = [{ left: 0, type: -1 }, { left: 0, type: -1 }];
  }
  stepMonsters() {
    for (const m of this.monsters) {
      if (!m.alive) continue;
      m.sc++;
      if (m.stun > 0) m.stun--;
      if (m.holy > 0) { m.holy--; this.damage(m, m.holyDmg, null); }
      if (m.slow > 0) m.slow = Math.max(0, m.slow - 1);
      if (m.status === 1) { if (m.sc >= 10) m.alive = false; continue; }
      let v = m.speed;
      if (m.slow > 0) v = Math.max(m.minSpeed, Math.floor(v * (100 - m.slow) / 100));
      if (m.stun > 0) v = 0;
      let guard = 0;
      while (v > 0 && guard++ < 20) {
        const tx = cen(m.tx), ty = cen(m.ty);
        if (tx !== m.x) { const d = tx - m.x; const s = Math.min(Math.abs(d), v); m.x += Math.sign(d) * s; v -= s; m.look = d > 0 ? 2 : 6; }
        else if (ty !== m.y) { const d = ty - m.y; const s = Math.min(Math.abs(d), v); m.y += Math.sign(d) * s; v -= s; }
        else {
          m.fx = m.tx; m.fy = m.ty;
          const d = this.randomDir(m.fx, m.fy); m.dir = d;
          if (d < 0) break;
          m.tx = m.fx + DIR[d][0]; m.ty = m.fy + DIR[d][1];
        }
      }
      for (const [ex, ey] of this.ends) {
        if (m.x === cen(ex) && m.y === cen(ey)) {
          m.alive = false; this.leaks++; this.wavePerfect = false;
          const loss = this.pattern === 2 ? 3 : (this.pattern === 3 && m.boss ? this.life : 1);
          this.life = Math.max(0, this.life - loss);
          this.emit('leak', { m, loss });
          if (this.life <= 0) return true;
        }
      }
    }
    return false;
  }
  inRange(t, x, y) { const dx = t.x - x, dy = t.y - y; return Math.abs(dx) + Math.abs(dy) <= t.dist * 2 && dx * dx + dy * dy <= t.dist2; }
  stepTowers() {
    for (const t of this.towers) {
      t.sc++;
      if (t.cool > 0) t.cool--;
      if (t.status === 1) {
        const tg = t.lock[0];
        if (tg && t.attType === 0 && t.sc <= 6) {
          t.x = t.ox + Math.floor((tg.x - t.x) * t.sc / 6 * 0.5); t.y = t.oy + Math.floor((tg.y - t.y) * t.sc / 6 * 0.5);
        }
        if (tg) { if (t.x < tg.x) t.look = 2; else if (t.x > tg.x) t.look = 6; t.lookY = tg.y; }
        if (t.sc === 6) {
          const live = t.lock.filter(x => x && (x.monster ? x.status === 0 && x.alive : x.alive));
          if (live.length) {
            t.attackCount++; t.cool = t.coolMax;
            if (t.attType === 0) {
              this.emit('sound', { id: t.hero ? 1 : HITSND[t.detail] });
              for (const x of live.slice(0, 3)) { this.emit('fx', { kind: t.attFx, x: x.x, y: x.y }); if (x.monster) this.hit(t, x); else this.hitObject(t, x); }
            } else {
              for (const x of live.slice(0, 3)) this.arrows.push({ t, target: x, x: t.x, y: t.y, speed: 750, kind: t.attFx, alive: true });
            }
          } else { t.status = 0; t.sc = 0; t.cool = 0; t.x = t.ox; t.y = t.oy; }
        }
        if (t.sc === 15) { t.status = 0; t.sc = 0; t.cool = t.coolMax; t.x = t.ox; t.y = t.oy; }
        continue;
      }
      if (t.cool > 0) continue;
      const near = this.monsters.filter(m => m.alive && m.status === 0 && this.inRange(t, m.x, m.y));
      t.lock = [];
      if (near.length) {
        if (this.focus && this.focus.monster && near.includes(this.focus)) t.lock.push(this.focus);
        for (const m of near) { if (t.lock.length >= t.targetMax) break; if (!t.lock.includes(m)) t.lock.push(m); }
      }
      if (t.lock.length < t.targetMax && this.focus && !this.focus.monster && this.focus.alive && this.inRange(t, this.focus.x, this.focus.y)) t.lock.push(this.focus);
      if (this.mode === 2 && t.lock.length < t.targetMax) { const gt = this.objects.find(o => o.role === 'start' && o.alive && this.inRange(t, o.x, o.y)); if (gt && !t.lock.includes(gt)) t.lock.push(gt); }
      if (t.lock.length) { t.status = 1; t.sc = 0; this.emit('sound', { id: t.hero ? [22, 26, 29][t.group] : VOICE[t.detail], soft: true }); }
    }
  }
  stepArrows() {
    for (const a of this.arrows) {
      const tg = a.target;
      if (!tg.alive || (tg.monster && tg.status !== 0)) { a.alive = false; continue; }
      const dx = tg.x - a.x, dy = tg.y - a.y;
      if (Math.abs(dx) <= a.speed && Math.abs(dy) <= a.speed) {
        a.alive = false; this.emit('fx', { kind: a.kind, x: tg.x, y: tg.y });
        if (tg.monster) this.hit(a.t, tg); else this.hitObject(a.t, tg);
        continue;
      }
      const d = Math.hypot(dx, dy); a.x += dx / d * a.speed; a.y += dy / d * a.speed; a.ang = Math.atan2(dy, dx);
    }
    this.arrows = this.arrows.filter(a => a.alive);
  }
  hitDamage(t, m) {
    let def = m.def;
    if (!t.hero && t.level <= 3 && [0, 4, 8].includes(t.detail)) def += this.wave >= 40 ? 30 : this.wave >= 30 ? 20 : this.wave >= 20 ? 10 : 0;
    const d = Math.max(1, Math.floor(t.power * (100 - Math.min(95, def)) / 100));
    return d + Math.floor(d * (t.dmgUp || 0) / 100);
  }
  damage(m, dmg, t) {
    if (m.status !== 0) return;
    m.hp -= dmg; this.emit('dmg', { m, dmg });
    if (m.hp <= 0) this.kill(m, t);
  }
  kill(m, t) {
    m.status = 1; m.sc = 0; this.kills++;
    const w = this.curve(this.wave);
    let g = m.boss ? w[14] : w[6], mana = m.boss ? w[15] : w[7];
    if (t && t.hero) { const b = this.itemRate(t.group, 8); g += Math.floor(w[6] * b / 100); mana += Math.floor(w[7] * b / 100); }
    if (this.special) this.special.kills++;
    this.money += g; this.mana += mana;
    this.emit('kill', { m, gold: g, mana });
    if (this.focus === m) this.focus = null;
  }
  hit(t, m) {
    if (m.status !== 0) return;
    this.damage(m, this.hitDamage(t, m), t);
    const c = t.hero ? null : T.char[t.row], md = T.monster[m.type], w = this.curve(this.wave);
    if (t.effect === 0 && c) {   // 기절
      const p = Math.floor(c[CHAR.SUC] * (this.unitRate(1, 10) + 100) / 100) - Math.floor(md[6] * ((m.boss ? w[12] : w[4]) + 100) / 100);
      if (m.stun <= 0 && this.rand(100) < p) { const d = Math.floor(c[CHAR.CONT] * (this.unitRate(1, 11) + 100) / 100); m.stun = m.boss ? d >> 1 : d; this.emit('stun', { m }); }
    } else if (t.effect === 1) {   // 광역
      for (const o of this.monsters) {
        if (o === m || !o.alive || o.status !== 0) continue;
        const ax = Math.abs(m.x - o.x) / U, ay = Math.abs(m.y - o.y) / U;
        if (ax * ax + ay * ay <= 4556) { this.emit('fx', { kind: 37, x: o.x, y: o.y }); this.damage(o, this.hitDamage(t, m), t); }
      }
    } else if (t.effect === 2 && c) {   // 신성 도트
      m.holy = Math.floor(c[CHAR.CONT] * (this.unitRate(2, 13) + 100) / 100); m.holyDmg = Math.max(1, Math.floor(this.hitDamage(t, m) * (this.unitRate(2, 12) + 100) / 100 / 20));
    } else if (t.effect === 3 && c) {   // 둔화
      const p = Math.floor(c[CHAR.SUC] * (this.unitRate(3, 14) + 100) / 100) - Math.floor(md[7] * ((m.boss ? w[13] : w[5]) + 100) / 100);
      if (this.rand(100) < p) { m.slow = Math.min(80, m.slow + Math.floor(c[CHAR.CONT] * (this.unitRate(3, 15) + 100) / 100)); this.emit('slow', { m }); }
    }
    // 영웅 장비 효과 (신성 · 즉사 · 기절 · 둔화)
    if (t.hero && m.status === 0) {
      const g = t.group;
      if (this.itemRate(g, 10) > 0 && this.rand(100) < this.itemRate(g, 10)) { m.holy = 90; m.holyDmg = Math.max(1, Math.floor(this.hitDamage(t, m) * 3 / 100)); }
      if (this.itemRate(g, 11) > 0 && !m.boss && this.rand(100) < this.itemRate(g, 11)) { this.damage(m, m.hp, t); return; }
      if (this.itemRate(g, 12) > 0 && m.stun <= 0 && this.rand(100) < this.itemRate(g, 12)) m.stun = m.boss ? 45 : 90;
      if (this.itemRate(g, 13) > 0 && this.rand(100) < this.itemRate(g, 13)) m.slow = Math.min(80, m.slow + 40);
    }
  }
  hitObject(t, o) {
    if (!o.alive || !o.destroyable) return;
    const dmg = t.power + Math.floor(t.power * (t.dmgUp || 0) / 100);
    o.hp -= dmg; this.emit('ohit', { o, dmg });
    if (o.hp <= 0) {
      o.alive = false;
      if (o.role === 'start') { this.emit('gatebreak', { o }); if (!this.objects.some(x => x.role === 'start' && x.alive)) this.finish(true); return; }
      if (o.reward === 0) this.money += o.rewardValue; else if (o.reward === 1) this.mana += o.rewardValue;
      this.stats.objects++;
      this.emit('obreak', { o, gold: o.reward === 0 ? o.rewardValue : 0, mana: o.reward === 1 ? o.rewardValue : 0 });
      if (this.focus === o) this.focus = null;
    }
  }
  setFocus(x) { this.focus = this.focus === x ? null : x; }
  stepSpecial() {
    const s = this.special; s.t++;
    if (s.t === s.hitAt) {
      const h = s.hero, kind = h.specialType; let n = 0;
      for (const m of this.monsters) {
        if (!m.alive || m.status !== 0) continue;
        this.emit('fx', { kind: [15, 33, 5][kind] ?? 15, x: m.x, y: m.y });
        const dmg = Math.max(1, Math.floor(Math.floor(h.power * h.specialPower / 100) * (100 - m.def) / 100));
        for (let k = 0; k < h.specialCount && m.status === 0; k++) this.damage(m, dmg, h);
        if (m.status === 0 && kind === 1) { m.holy = T.hero[h.row][10]; m.holyDmg = Math.max(1, Math.floor(dmg / 20)); }
        if (m.status === 0 && kind === 2) m.slow = Math.min(80, Math.max(m.slow, T.hero[h.row][10]));
        n++;
      }
      this.emit('specialHit', { n, kind });
    }
    if (s.t >= s.end) { this.stats.specialBest = Math.max(this.stats.specialBest, s.kills); this.stats.spBest[s.hero.group] = Math.max(this.stats.spBest[s.hero.group], s.kills); this.special = null; this.monsters = this.monsters.filter(m => m.alive); }
  }
  // 웨이브 진행 정도 (0~1)
  progress() { return this.mode === 1 ? (this.wave % this.waveTotal) / this.waveTotal : Math.min(1, this.wave / this.waveTotal); }
}

// 판 결과 요약 (업적 · 작전 · 명예 계산용)
export function runSummary(s) {
  const st = s.stats, cls = [...st.classes];
  return { stage: s.stage, mode: s.mode, win: s.state === 'clear', life: s.life, wave: s.wave, progress: s.progress(), kills: s.kills, maxGold: st.maxGold, idle: s.idle || 0,
    details: st.details.size, only: cls.length === 1 && !st.heroUsed ? cls[0] : -1, maxLv: st.maxLv, heroLv: st.heroLv, heroMax: Math.max(...st.heroLv), specialBest: st.spBest,
    specials: st.specials || 0, objects: st.objects, early: st.early, levels: st.levels, sec: Math.round(s.time / TICK) };
}
