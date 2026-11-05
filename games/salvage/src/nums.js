// 판 안 피해 숫자 (v0.6.1 · 검수 M3 Top 6) — fx.num 대신 판(raid)이 씀
//  · 같은 적에 0.25초 안 숫자는 하나로 더함 → 커지며 다시 튀어 오름 (산탄 · 연사 · 전류 연쇄가 한 숫자)
//  · '막힘'은 글자 대신 회색 방패 아이콘 + 작은 숫자 (불꽃은 raid.damage 가 fx.burst 로)
//  · 숫자는 왼쪽 · 오른쪽 번갈아 흩뿌림 · 치명 = 노랑 '!' · 약점 = 금색 크게 + '약점'
import * as THREE from 'three';

const MERGE = 0.25, LIFE = 0.85;
const RANK = { block: 0, '': 1, crit: 2, weak: 3 };
const v = new THREE.Vector3();
export class HitNums {
  constructor(hud) { this.hud = hud; this.list = []; this.t = 0; this.side = 1; this.log = []; }
  /* kind: '' · 'crit' · 'weak' · 'block' */
  hit(e, pos, d, kind = '') {
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
  drop(i) { this.list[i].el.remove(); this.list.splice(i, 1); }
  tick(dt, camera) {
    this.t += dt; const W = innerWidth, H = innerHeight;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const o = this.list[i]; o.age += dt; if (o.age > LIFE) { this.drop(i); continue; }
      v.copy(o.p); v.y += 1.8 + o.age * 1.1; v.project(camera);
      const out = Math.min(1, o.age * 7); const x = (v.x * 0.5 + 0.5) * W + o.sx * out, y = (-v.y * 0.5 + 0.5) * H;
      o.bump = Math.max(0, o.bump - dt * 5);
      const pop = o.age < 0.08 ? 0.6 + o.age * 7 : 1.16 - Math.min(0.22, (o.age - 0.08) * 0.8);
      const sc = pop * (1 + o.bump * 0.35) * (o.n > 1 ? Math.min(1.3, 1 + o.n * 0.04) : 1);
      o.el.style.transform = `translate(${x | 0}px,${y | 0}px) translate(-50%,-50%) scale(${sc.toFixed(3)})`;
      o.el.style.opacity = o.age > LIFE - 0.25 ? (LIFE - o.age) / 0.25 : 1;
    }
  }
  clear() { for (const o of this.list) o.el.remove(); this.list.length = 0; }
}
