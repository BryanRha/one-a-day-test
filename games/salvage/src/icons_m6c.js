// M6-C (검수 M5 목록 9) 렌더 아이콘 — 무기 19 · 시설 14 · 몽이 5단 · 반디 3단을 Blender 로 찍은 한 장 시트(assets/icons/m6c.webp · 8열 × 96px)
//  만드는 길: tools/npc3d/render_icons.py → finish_icons.py (ORDER 가 이 파일과 같아야 함 — m6c_a11y 시험이 대조)
//  쓰는 곳: 시설 카드(ui_grow facArt) · 무기 고르기(ui_m5c wselHtml) · 무기 머리(ui_grow tabGun) · 반려 줄(ui_m5c petHtml)
const W = ['pistol', 'rifle', 'wrench', 'shotgun', 'rivet', 'longshot', 'diver', 'harpoon', 'volt', 'flare', 'twin', 'net', 'crossbow', 'hose', 'anchor', 'scatter', 'rocket', 'hook', 'oar'];
const F = ['bench', 'store', 'rack', 'clinic', 'lab', 'kitchen', 'aquarium', 'lights', 'ammo', 'gym', 'shelf', 'dock', 'forge', 'den'];
export const ORDER = [...W.map(k => 'w_' + k), ...F.map(k => 'f_' + k), ...[1, 2, 3, 4, 5].map(n => 'p_mong' + n), ...[1, 2, 3].map(n => 'p_bandi' + n)];
const IDX = Object.fromEntries(ORDER.map((k, i) => [k, i]));
const COLS = 8, ROWS = Math.ceil(ORDER.length / COLS);
export const SHEET = 'assets/icons/m6c.webp';
let css = false;
function inject() {
  if (css || typeof document === 'undefined') return; css = true; const s = document.createElement('style');
  s.textContent = `.m6i{display:inline-block;flex:none;width:var(--z,44px);height:var(--z,44px);background:url(${SHEET}) 0 0/${COLS * 100}% ${ROWS * 100}% no-repeat;vertical-align:middle;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}
.fart.m6f{padding:1px}.fart.m6f .m6i{width:100%;height:100%}
.wsel button .m6i,.wfl button .m6i{--z:34px;display:block;margin:-4px auto -2px}.petrow .pico.m6p{font-size:0;width:46px;height:46px;flex:none;display:grid;place-items:center}.pico.m6p .m6i{width:100%;height:100%}
.wico{--z:56px;margin-right:6px}`;
  document.head.appendChild(s);
}
/* 키 하나 → <i> (없는 키면 '') — 배경 칸 위치는 % (칸 수 기준이라 크기와 무관) */
export function ico(key, cls = '', z) {
  const i = IDX[key]; if (i == null) return ''; inject();
  const x = (i % COLS) / (COLS - 1) * 100, y = Math.floor(i / COLS) / (ROWS - 1) * 100;
  return `<i class="m6i ${cls}" style="background-position:${x.toFixed(3)}% ${y.toFixed(3)}%${z ? `;--z:${z}px` : ''}" aria-hidden="true"></i>`;
}
export const wIco = (wk, cls, z) => ico('w_' + wk, cls, z);
export const fIco = (k, cls, z) => ico('f_' + k, cls, z);
export const pIco = (k, n, cls, z) => ico(`p_${k}${Math.max(1, Math.min(k === 'mong' ? 5 : 3, n || 1))}`, cls, z);
export const hasIco = key => key in IDX;
