// 판 안 피해 숫자 (v0.6.1 · 검수 M3 Top 6) — fx.num 대신 판(raid)이 씀
//  · 같은 적에 0.25초 안 숫자는 하나로 더함 → 커지며 다시 튀어 오름 (산탄 · 연사 · 전류 연쇄가 한 숫자)
//  · '막힘'은 글자 대신 회색 방패 아이콘 + 작은 숫자 (불꽃은 raid.damage 가 fx.burst 로)
//  · 숫자는 왼쪽 · 오른쪽 번갈아 흩뿌림 · 치명 = 노랑 '!' · 약점 = 금색 크게 + '약점'
//  v0.7.1 검수 M4 Top 2: 서로 다른 적 · 연쇄 · 약점 숫자 겹침 없앰
//  · 화면 좌표 충돌 칸: 먼저 뜬 숫자와 가까우면(가로 36 · 세로 24px 안) 위로 22px씩 밀어 쌓음 (부드럽게 따라감)
//  · 보스 약점 숫자는 떠다니지 않고 보스 체력 줄 바로 아래 고정 자리에 '약점 ×2 · 108' 한 줄로 더해 보여 줌
//  · 전류 연쇄는 raid 가 첫 적(chainTo)으로 합쳐 넘김 → 첫 적에 합계 하나만
import * as THREE from 'three';

const MERGE = 0.25, LIFE = 0.85;
const RANK = { block: 0, '': 1, crit: 2, weak: 3 };
const v = new THREE.Vector3();
export class HitNums {
  constructor(hud) { this.hud = hud; this.list = []; this.t = 0; this.side = 1; this.log = []; }
  /* kind: '' · 'crit' · 'weak' · 'block' */
  hit(e, pos, d, kind = '', mul = 2) {
    if (kind === 'weak' && e?.D?.boss && this.weak(d, mul)) return;
    let o = e ? this.list.find(x => x.e === e && this.t - x.t0 < MERGE) : null;
    if (o) {
      o.v += d; o.n++; if (RANK[kind] > RANK[o.kind]) o.kind = kind; if (kind !== 'block') o.allBlock = false; else o.anyBlock = true;
      o.age = Math.min(o.age, 0.06); o.bump = 1; o.p.copy(pos);
    } else {
      this.side = -this.side; const el = document.createElement('div'); this.hud.appendChild(el);
      o = { e, el, p: pos.clone(), sx: this.side * (16 + Math.random() * 16), v: d, n: 1, kind, allBlock: kind === 'block', anyBlock: kind === 'block', t0: this.t, age: 0, bump: 0 };
      this.list.push(o); if (this.list.length > 24) this.drop(0);
    }
    this.draw(o); this.log.push(o.n); if (this.log.length > 60) this.log.shift();
  }
  draw(o) {
    const k = o.allBlock ? 'blk' : o.kind === 'block' ? '' : o.kind;
    o.el.className = 'num ' + k;
    o.el.innerHTML = o.allBlock ? `<i class="shd"></i><small>${o.v}</small>` : `${o.v}${o.kind === 'crit' ? '!' : ''}${o.kind === 'weak' ? '<em>약점</em>' : ''}${o.anyBlock ? '<i class="shd sm"></i>' : ''}`;
  }
  weak(d, mul) {
    const bb = document.querySelector('#bossbar.show'); if (!bb) return false; /* 체력 줄이 안 보이면 떠다니는 숫자로 */
    let el = bb.querySelector('.weakln'); if (!el) { el = document.createElement('b'); el.className = 'weakln'; bb.appendChild(el); }
    const w = this.wk && this.t - this.wk.t < 1.4 ? this.wk : (this.wk = { v: 0, n: 0 }); w.v += d; w.n++; w.t = this.t; w.el = el;
    el.innerHTML = `약점 ×${mul} · <span>${w.v}</span>`; el.classList.add('on'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    this.log.push(w.n); if (this.log.length > 60) this.log.shift(); return true;
  }
  drop(i) { this.list[i].el.remove(); this.list.splice(i, 1); }
  tick(dt, camera) {
    this.t += dt; const W = innerWidth, H = innerHeight;
    if (this.wk && this.t - this.wk.t > 1.4 && this.wk.el) { this.wk.el.classList.remove('on'); this.wk.el = null; }
    for (let i = this.list.length - 1; i >= 0; i--) { const o = this.list[i]; o.age += dt; if (o.age > LIFE) this.drop(i); }
    const placed = []; /* 먼저 뜬 숫자부터 자리 잡기 → 나중 숫자가 겹치면 위로 밀림 */
    for (let i = 0; i < this.list.length; i++) {
      const o = this.list[i];
      v.copy(o.p); v.y += 1.8 + o.age * 1.1; v.project(camera);
      const out = Math.min(1, o.age * 7); const x = (v.x * 0.5 + 0.5) * W + o.sx * out, y0 = (-v.y * 0.5 + 0.5) * H;
      let lift = 0; for (let k = 0; k < 8; k++) { const yy = y0 - lift; if (!placed.some(q => Math.abs(q.x - x) < 36 && Math.abs(q.y - yy) < 24)) break; lift += 22; }
      o.lift = o.lift == null ? lift : o.lift + (lift - o.lift) * Math.min(1, dt * 16); const y = y0 - o.lift; placed.push({ x, y: y0 - lift });
      o.bump = Math.max(0, o.bump - dt * 5);
      const pop = o.age < 0.08 ? 0.6 + o.age * 7 : 1.16 - Math.min(0.22, (o.age - 0.08) * 0.8);
      const sc = pop * (1 + o.bump * 0.35) * (o.n > 1 ? Math.min(1.3, 1 + o.n * 0.04) : 1);
      o.el.style.transform = `translate(${x | 0}px,${y | 0}px) translate(-50%,-50%) scale(${sc.toFixed(3)})`;
      o.el.style.opacity = o.age > LIFE - 0.25 ? (LIFE - o.age) / 0.25 : 1;
    }
  }
  clear() { for (const o of this.list) o.el.remove(); this.list.length = 0; this.wk?.el?.classList.remove('on'); this.wk = null; }
}
