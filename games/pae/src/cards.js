// 패 그림 합성 (부팅 때 한 번): 원화 + 테두리(종류 색) + 달 표시 + 종류 도장 + 띠 리본 → 'card_<id>' 텍스처
//   그림 속엔 글자가 없고, 판정에 쓰는 정보(달 · 종류 · 띠 색)는 전부 여기서 코드로 그림 (그림=판정)
//   덱 데이터(kinds · ribbons · months)만 읽으므로 덱을 바꿔도 그대로
import { FONT, C } from './config.js?v=0.88.0';
import { rr } from './ui.js?v=0.88.0';
import { audio } from './audio.js?v=0.88.0';

export const CW = 330, CH = 495;   /* 텍스처 크기 (화면에선 줄여 씀) */
// 표시 방식: 2 = 왼쪽 위 달 색 꼬리표(기본 — 대표 결정 2026-10-28: 부채꼴로 겹쳐도 달 · 종류가 크게 보임) · 1 = 예전 작은 원(?cardv=1)
export const CARD_OPT = { marks: /[?&]cardv=1/.test(typeof location !== 'undefined' ? location.search : '') ? 1 : 2 };

function face(scene, deck, c) {
  const key = 'card_' + c.id;
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, CW, CH), g = tex.getContext();
  const K = deck.kinds[c.kind], R = c.ribbon ? deck.ribbons[c.ribbon] : null, M = deck.months.find(m => m.n === c.month);
  const r = 26, bw = c.kind === 'gwang' ? 14 : 11;
  // 바깥 테두리 (종류 색)
  rr(g, 0, 0, CW, CH, r);
  if (c.kind === 'gwang') { const gg = g.createLinearGradient(0, 0, CW, CH); gg.addColorStop(0, '#FFE8A8'); gg.addColorStop(0.35, '#C99A45'); gg.addColorStop(0.6, '#FFF1C4'); gg.addColorStop(1, '#9C6E26'); g.fillStyle = gg; }
  else if (c.kind === 'yeol') g.fillStyle = '#9E2620';
  else if (c.kind === 'tti') g.fillStyle = R ? R.color : K.color;
  else g.fillStyle = '#1A1412';
  g.fill();
  // 원화
  const img = scene.textures.get(c.art).getSourceImage();
  g.save(); rr(g, bw, bw, CW - bw * 2, CH - bw * 2, r - 6); g.clip();
  const iw = CW - bw * 2, ih = CH - bw * 2;
  if (c.flip) { g.translate(CW, 0); g.scale(-1, 1); }
  const z = c.flip === 2 ? 1.18 : c.flip === 1 && c.kind === 'pi' ? 1.06 : 1;
  const sw = img.width / z, sh = img.height / z, sx = (img.width - sw) / 2, sy = c.flip === 2 ? (img.height - sh) * 0.15 : (img.height - sh) / 2;
  g.drawImage(img, sx, sy, sw, sh, bw, bw, iw, ih);
  // 피는 살짝 바랜 한지 톤 (광 · 열 · 띠와 한눈에 구분)
  if (c.kind === 'pi') { g.fillStyle = 'rgba(243,233,210,0.16)'; g.fillRect(0, 0, CW, CH); }
  if (c.kind === 'gwang') { const gl = g.createLinearGradient(0, 0, CW, CH * 0.6); gl.addColorStop(0, 'rgba(255,230,160,0.28)'); gl.addColorStop(0.5, 'rgba(255,230,160,0)'); g.fillStyle = gl; g.fillRect(0, 0, CW, CH); }
  g.restore();
  if (c.flip) { /* 뒤집힌 그림 위에 글자를 바로 그리기 위해 변환 초기화 */ g.setTransform(1, 0, 0, 1, 0, 0); }
  // 띠 리본: 세로로 늘어진 비단 띠
  if (R) {
    g.save();
    const x0 = CARD_OPT.marks === 2 ? CW * 0.5 : CW * 0.42, w = 62, y0 = 46, y1 = CH * 0.68;
    g.translate(x0, y0); g.rotate(-0.06);
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 10; g.shadowOffsetX = 4;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, y1 - y0); g.lineTo(w / 2, y1 - y0 - 26); g.lineTo(0, y1 - y0); g.closePath();
    const rg = g.createLinearGradient(0, 0, w, 0); rg.addColorStop(0, R.color); rg.addColorStop(0.5, shade(R.color, 1.25)); rg.addColorStop(1, shade(R.color, 0.8));
    g.fillStyle = rg; g.fill(); g.shadowColor = 'transparent';
    g.lineWidth = 3; g.strokeStyle = R.edge; g.stroke();
    /* 무늬: 금박 점선 두 줄 */
    g.strokeStyle = R.edge; g.globalAlpha = 0.7; g.setLineDash([6, 8]); g.lineWidth = 2;
    g.beginPath(); g.moveTo(11, 10); g.lineTo(11, y1 - y0 - 16); g.moveTo(w - 11, 10); g.lineTo(w - 11, y1 - y0 - 16); g.stroke();
    g.setLineDash([]); g.globalAlpha = 1;
    g.restore();
  }
  // 안쪽 금선
  rr(g, bw - 2, bw - 2, CW - (bw - 2) * 2, CH - (bw - 2) * 2, r - 5); g.lineWidth = 2.5; g.strokeStyle = c.kind === 'gwang' ? '#FFF4D0' : 'rgba(232,194,122,0.85)'; g.stroke();
  if (CARD_OPT.marks === 2) { marksV2(g, deck, c, K, R, M); tex.refresh(); return key; }
  // 달 표시 (왼쪽 위): 옻칠 원 + 금 숫자
  const mx = 50, my = 52;
  g.beginPath(); g.arc(mx, my, 34, 0, Math.PI * 2); g.fillStyle = 'rgba(14,10,10,0.88)'; g.fill(); g.lineWidth = 3; g.strokeStyle = M ? M.color : C.gold; g.stroke();
  g.beginPath(); g.arc(mx, my, 28, 0, Math.PI * 2); g.lineWidth = 1.5; g.strokeStyle = 'rgba(232,194,122,0.7)'; g.stroke();
  g.fillStyle = '#F6E3B0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${c.month >= 10 ? 32 : 38}px ${FONT}`; g.fillText(String(c.month), mx, my + 2);
  // 종류 도장: 달 표시 바로 아래 (손패가 겹쳐도 왼쪽 띠는 늘 보임)
  const sx2 = mx, sy2 = my + 74, lab = c.kind === 'pi' && c.pi > 1 ? '쌍피' : K.label;
  g.beginPath(); g.arc(sx2, sy2, 31, 0, Math.PI * 2);
  const sc = c.kind === 'gwang' ? '#C9962E' : c.kind === 'yeol' ? '#B3262B' : c.kind === 'tti' ? (R ? R.color : K.color) : '#3B3226';
  g.fillStyle = sc; g.fill(); g.lineWidth = 3; g.strokeStyle = c.kind === 'gwang' ? '#FFF1C4' : '#F3E9D2'; g.stroke();
  g.fillStyle = '#FFFFFF'; g.font = `900 ${lab.length > 1 ? 22 : 34}px ${FONT}`; g.fillText(lab, sx2, sy2 + 2);
  // 새 · 비 표시 (족보 단서): 종류 도장 아래
  const tg = c.tags.filter(t => deck.tags[t]);
  tg.forEach((t, i) => { const tx = mx, ty = sy2 + 66 + i * 58; g.beginPath(); g.arc(tx, ty, 25, 0, Math.PI * 2); g.fillStyle = 'rgba(14,10,10,0.85)'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#E8C27A'; g.stroke(); g.fillStyle = '#F6E3B0'; g.font = `900 25px ${FONT}`; g.fillText(deck.tags[t], tx, ty + 1); });
  tex.refresh();
  return key;
}
// 시안 v2 표시: 왼쪽 위 꼬리표(달마다 다른 색) — 큰 달 숫자 + 종류 글자 + 새/비 · 손패에서 보이는 왼쪽 70px 안에 전부
function marksV2(g, deck, c, K, R, M) {
  const tw = 84, col = (M && (M.tab || M.color)) || '#333';
  const lab = c.kind === 'pi' && c.pi > 1 ? '쌍피' : K.label, tg = c.tags.filter(t => deck.tags[t]);
  const th = 196 + tg.length * 44;
  g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 8; g.shadowOffsetX = 3;
  rr(g, 6, 6, tw, th, 18); g.fillStyle = col; g.fill(); g.restore();
  rr(g, 6, 6, tw, th, 18); g.lineWidth = 3; g.strokeStyle = '#F6E3B0'; g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#FFFFFF'; g.font = `900 ${c.month >= 10 ? 50 : 64}px ${FONT}`; g.fillText(String(c.month), 6 + tw / 2, 62);
  /* 종류: 흰 원 안에 종류 색 글자 (광은 금) */
  const ky = 140, kc = c.kind === 'gwang' ? '#B07A12' : c.kind === 'yeol' ? '#B3262B' : c.kind === 'tti' ? (R ? R.color : K.color) : '#2A2420';
  g.beginPath(); g.arc(6 + tw / 2, ky, 32, 0, Math.PI * 2); g.fillStyle = c.kind === 'gwang' ? '#FFE9A8' : '#FFFFFF'; g.fill(); g.lineWidth = 3; g.strokeStyle = kc; g.stroke();
  g.fillStyle = kc; g.font = `900 ${lab.length > 1 ? 24 : 38}px ${FONT}`; g.fillText(lab, 6 + tw / 2, ky + 2);
  tg.forEach((t, i) => { const ty = 196 + i * 44; g.fillStyle = '#FFFFFF'; g.font = `900 30px ${FONT}`; g.fillText(deck.tags[t], 6 + tw / 2, ty); });
  if (c.kind === 'gwang') { rr(g, 3, 3, CW - 6, CH - 6, 24); g.lineWidth = 6; g.strokeStyle = '#FFE29A'; g.stroke(); }
}
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }

// 뒷면: 원화 + 둥근 테두리 (꾸미기: back · back_red(주칠 · 골드) · back_gold(소장자))
export function backTex(scene, id) {
  const key = 'cardback_' + id;
  if (scene.textures.exists(key)) return key;
  const src = scene.textures.get(id === 'back_red' ? 'back' : id).getSourceImage();
  const tex = scene.textures.createCanvas(key, CW, CH), g = tex.getContext();
  rr(g, 0, 0, CW, CH, 26); g.fillStyle = id === 'back_gold' ? '#C99A45' : '#120C0C'; g.fill();
  g.save(); rr(g, 8, 8, CW - 16, CH - 16, 20); g.clip(); g.drawImage(src, 8, 8, CW - 16, CH - 16);
  if (id === 'back_red') { g.globalCompositeOperation = 'color'; g.fillStyle = '#9E1C20'; g.fillRect(0, 0, CW, CH); g.globalCompositeOperation = 'source-over'; }
  g.restore();
  rr(g, 6, 6, CW - 12, CH - 12, 22); g.lineWidth = 3; g.strokeStyle = '#E8C27A'; g.stroke();
  tex.refresh();
  return key;
}
export function makeCardTextures(scene, deck) { for (const c of deck.cards) face(scene, deck, c); }

// 화면의 패 한 장 (그림자 + 앞면 + 금박/자개 표시 + 고름 빛)
export class CardView extends Phaser.GameObjects.Container {
  constructor(scene, x, y, card, scale = 0.56, backKey = 'cardback_back') {
    super(scene, x, y);
    this.card = card; this.uid = card.uid; this.s = scale; this.backKey = backKey;
    this.glow = scene.add.image(0, 0, 'card_glow').setAlpha(0).setScale(scale);
    this.shadow = scene.add.image(8, 14, 'card_shadow').setScale(scale).setAlpha(0.6);
    this.img = scene.add.image(0, 0, 'card_' + card.id).setScale(scale);
    this.add([this.glow, this.shadow, this.img]);
    this.marks = [];
    this.refreshMarks();
    this.setSize(CW * scale, CH * scale);
    scene.add.existing(this);
    this.selected = false; this.faceUp = true;
  }
  refreshMarks() {
    for (const m of this.marks) m.destroy(); this.marks = [];
    const s = this.s, c = this.card;
    if (c.gold) { const f = this.scene.add.image(0, 0, 'mark_gold').setScale(s); this.add(f); this.marks.push(f); this.scene.tweens.add({ targets: f, alpha: { from: 0.75, to: 1 }, duration: 900, yoyo: true, repeat: -1 }); }
    if (c.pearl) { const f = this.scene.add.image(0, 0, 'mark_pearl').setScale(s); this.add(f); this.marks.push(f); this.scene.tweens.add({ targets: f, alpha: { from: 0.55, to: 1 }, duration: 1300, yoyo: true, repeat: -1 }); }
  }
  setBack(on) { this.faceUp = !on; this.img.setTexture(on ? this.backKey : 'card_' + this.card.id); for (const m of this.marks) m.setVisible(!on); return this; }
  // 넘기기: 가로로 접혔다 펴짐
  flip(toFace = true, delay = 0, dur = 200) {
    return new Promise(res => {
      this.scene.tweens.add({ targets: this, scaleX: 0, duration: dur / 2, delay, ease: 'Quad.in', onComplete: () => {
        this.setBack(!toFace); if (toFace) audio.play('sfx_flip', { volume: 0.5, gap: 25 });
        this.scene.tweens.add({ targets: this, scaleX: 1, duration: dur / 2, ease: 'Quad.out', onComplete: res });
      } });
    });
  }
  setSelected(on) { this.selected = on; this.glow.setAlpha(on ? 1 : 0); return this; }
}

// 금박 · 자개 표시 · 고름 빛 · 그림자 텍스처
export function makeCardFx(scene) {
  const mk = (key, w, h, draw) => { if (scene.textures.exists(key)) return; const t = scene.textures.createCanvas(key, w, h); draw(t.getContext()); t.refresh(); };
  mk('card_shadow', CW + 40, CH + 40, g => { g.filter = 'blur(12px)'; rr(g, 20, 20, CW, CH, 26); g.fillStyle = 'rgba(0,0,0,0.75)'; g.fill(); });
  mk('card_glow', CW + 60, CH + 60, g => { g.filter = 'blur(10px)'; rr(g, 18, 18, CW + 24, CH + 24, 34); g.lineWidth = 16; g.strokeStyle = 'rgba(255,214,120,0.95)'; g.stroke(); g.filter = 'none'; rr(g, 28, 28, CW + 4, CH + 4, 28); g.lineWidth = 5; g.strokeStyle = '#FFF0C0'; g.stroke(); });
  mk('mark_gold', CW, CH, g => {
    rr(g, 3, 3, CW - 6, CH - 6, 24); g.lineWidth = 8; const gg = g.createLinearGradient(0, 0, CW, CH); gg.addColorStop(0, '#FFF1C4'); gg.addColorStop(0.5, '#D4A24C'); gg.addColorStop(1, '#FFE29A'); g.strokeStyle = gg; g.stroke();
    /* 금박 잎 조각 */
    g.fillStyle = '#F5CF73'; for (const [x, y, s] of [[CW - 58, 120, 18], [CW - 40, 150, 11], [CW - 70, 160, 9]]) { g.save(); g.translate(x, y); g.rotate(0.6); g.beginPath(); g.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  });
  mk('mark_pearl', CW, CH, g => {
    rr(g, 7, 7, CW - 14, CH - 14, 22); g.lineWidth = 6; const pg = g.createLinearGradient(0, 0, CW, CH); ['#E8F7FF', '#B9D8F2', '#F4D9F0', '#C9F0E0', '#E8F7FF'].forEach((c, i) => pg.addColorStop(i / 4, c)); g.strokeStyle = pg; g.stroke();
    for (const [x, y, s] of [[60, CH - 60, 12], [80, CH - 84, 7], [44, CH - 92, 6]]) { g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); const rg = g.createRadialGradient(x - 2, y - 2, 1, x, y, s); rg.addColorStop(0, '#FFFFFF'); rg.addColorStop(1, '#9FC6E6'); g.fillStyle = rg; g.fill(); }
  });
}
