// ⑦ 안내 하나 (DESIGN 6-4): 화살표 1개 + 글 한 줄 (16자 안팎) · 3초 동안 진척이 없을 때만 뜨고, 그 방향으로 움직이면 흐려짐
//   표 8줄 = 우선순위 · 맨 위에서 맞는 것 하나만
import { S } from './state.js?v=0.99.20';
import { isDesk } from './pads.js?v=0.99.20';

const TUT = ['oven', 'pick', 'place', 'cash'];
export class Guide {
  constructor(g) { this.g = g; this.cur = null; this.calm = 0; this.lastKey = ''; this.t = 0; this.prog = 0; }
  /* 지금 할 일 하나 → { key, text, at:[x,z] } */
  pick() {
    const g = this.g, sp = g.sp, pl = g.pl, pads = g.pads.list.filter(p => !p.done);
    // 1. 처음 1분 튜토리얼
    if (!g.bought('oven')) return { key: 'tut0', text: '오븐 자리에 잠깐 서요', hi: '오븐', at: pads.find(p => p.o.id === 'oven')?.at };
    if (!g.bought('counter')) return { key: 'tut1', text: '계산대 자리에 잠깐 서요', hi: '계산대', at: pads.find(p => p.o.id === 'counter')?.at };
    if (!g.bought('door')) return { key: 'tut2', text: '문을 열어 손님을 받아요', hi: '문', at: pads.find(p => p.o.id === 'door')?.at };
    if (!(S.tut || 0)) { const sold = S.totalSold || 0; if (!pl.stack.length && !sold && g.trayCount('oven')) return { key: 'tut3', text: '구운 베이글을 집어요', hi: '베이글', at: sp.nodes.oven.pick };
      if (pl.stack.length && !sold) return { key: 'tut4', text: '계산대에 놓아요', hi: '계산대', at: sp.counter.drop };
      if (!sold && g.dispCount('bagel') && !g.hasStaff('cashier')) return { key: 'tut5', text: '계산 자리에 서요', hi: '계산', at: sp.counter.till };
      const pile = g.piles.find(p => p.v > 0); if (pile && !g.lastCollect) return { key: 'tut6', text: '돈 더미를 주워요', hi: '돈 더미', at: [pile.x, pile.z] };
      if (g.lastCollect) S.tut = 1; }
    // 2. 줄 맨 앞 손님이 기다리는 메뉴가 진열 0
    const front = g.cust.find(c => c.state === 'order'); if (front) { const o = front.order.find(o => o.got < o.n && g.dispCount(o.k) === 0); const src = o && { bagel: 'oven', cream: 'top', coffee: 'cream', drink: 'coffee' }[o.k];
      if (o && !pl.stack.some(s => s.k === o.k) && g.trayCount(src)) return { key: 'need' + o.k, text: `${sp.nodes[src].name}에서 집어요`, hi: sp.nodes[src].name, at: sp.nodes[src].pick };
      if (o && pl.stack.some(s => s.k === o.k)) return { key: 'put' + o.k, text: '계산대에 놓아요', hi: '계산대', at: sp.counter.drop };
      if (!g.hasStaff('cashier') && !o && Math.hypot(pl.pos.x - sp.counter.till[0], pl.pos.z - sp.counter.till[1]) > 60) return { key: 'till', text: '계산 자리에 서요', hi: '계산', at: sp.counter.till }; }
    // 3. 다음 칸 값 이상 돈 + 10초
    const nx = pads[0]; if (nx && S.coins >= nx.cost - nx.paid && this.richT > 10) return { key: 'pad' + nx.o.id, text: `${nx.name} 자리에 잠깐 서요`, hi: nx.name, at: nx.at };
    const desk = g.pads.order.find(o => !g.bought(o.id) && isDesk(o) && g.pads.req(o) && S.coins >= o.cost); if (desk && this.richT > 10 && (!nx || nx.cost > S.coins)) { const room = desk.kind === 'hire' || /^s(walk|carry)/.test(desk.id) ? 'crew' : 'boss'; return { key: 'desk' + desk.id, text: `${sp.rooms[room].name} 책상에 서요`, hi: sp.rooms[room].name, at: sp.rooms[room].desk }; }
    // 4. 바닥 돈 ≥ 다음 칸 값의 50%
    const big = [...g.piles].sort((a, b) => b.v - a.v)[0]; if (big && nx && big.v >= (nx.cost - nx.paid) * 0.5) return { key: 'cash' + big.id, text: '돈 더미를 주워요', hi: '돈 더미', at: [big.x, big.z] };
    // 5. 쓰레기 때문에 빈자리 0
    if (!g.hasStaff('cleaner') && g.seats.length && g.custSys.freeSeats().length === 0) { const t = Object.values(g.tables).find(t => t.trash > 0 && !t.y); if (t) return pl.stack.some(s => s.k === 'trash') ? { key: 'bin', text: '쓰레기통에 버려요', hi: '쓰레기통', at: sp.bin.at } : { key: 'trash', text: '테이블을 치워요', hi: '테이블', at: [t.x, t.z] }; }
    // 6. 통화 손님 · 7. 조는 직원
    const ph = g.cust.find(c => c.phone); if (ph) return { key: 'phone', text: '전화하는 손님 — 다가가요', hi: '전화', at: [ph.pos.x, ph.pos.z] };
    const zz = g.staff.find(w => w.rest); if (zz) return { key: 'zz', text: '직원을 깨워요', hi: '깨워요', at: [zz.pos.x, zz.pos.z] };
    // 8. 별채 책상에 새 카드
    const hire = g.pads.order.find(o => o.kind === 'hire' && !g.bought(o.id) && g.pads.req(o) && S.coins >= o.cost); if (hire) return { key: 'hire', text: '크루룸에서 새 직원', hi: '크루룸', at: sp.rooms.crew.desk };
    return null;
  }
  update(dt) {
    const g = this.g; this.t -= dt; const nx = g.pads.list.find(p => !p.done); this.richT = nx && S.coins >= nx.cost - nx.paid ? (this.richT || 0) + dt : 0;
    // 진척: 판매 · 돈 · 칸이 늘면 calm 초기화 → 3초 동안 진척이 없을 때 뜸
    const prog = (S.totalSold || 0) + g.br.own.length * 1000 + Math.floor(S.earned || 0); if (prog !== this.prog) { this.prog = prog; this.calm = 0; } else this.calm += dt;
    if (this.t > 0) return; this.t = 0.4;
    const c = this.pick(), tut = c && c.key.startsWith('tut');
    this.cur = c && (tut || this.calm >= 3) ? c : null;
  }
}
