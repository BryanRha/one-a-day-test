// 소장 게임 클라우드 저장: 게임 코드는 그대로, 앱이 게임의 저장 키(catalog SAVES)를 묶어 계정에 올리고 내림
//   내려받기 = 게임 화면을 띄우기 직전 · 올리기 = 게임을 닫은 뒤 / 앱을 내릴 때 / 소장한 순간
//   충돌 판정은 서버 판 번호(rev) + 내용 해시 · 두 기기 모두 바뀌었을 때만 물어봄 · 직전본 1개는 서버에 남음(되돌리기)
import { SAVES, SAVES_ALWAYS } from './catalog.js?v=0.81.4';
import * as A from './account.js?v=0.81.4';

const META = 'oad_sync';
const meta = () => { try { return JSON.parse(localStorage.getItem(META) || '{}'); } catch { return {}; } };
const setMeta = (g, v) => { const m = meta(); m[g] = v; try { localStorage.setItem(META, JSON.stringify(m)); } catch { /* */ } };
const owned = g => { const m = A.current(); return !!(m && (m.items || []).includes('own:' + g)); };
export const on = g => !!(SAVES[g] && owned(g));

// 이 기기의 게임 저장 키 목록 (test 빌드는 localStorage 가 test: 를 알아서 붙이고 떼 줌)
function keysOf(g) {
  const pats = SAVES[g] || [], out = [];
  for (let i = 0; ; i++) { const k = localStorage.key(i); if (k == null) break; if (pats.some(p => p.endsWith('*') ? k.startsWith(p.slice(0, -1)) : k === p)) out.push(k); }
  return out.sort();
}
const pack = g => { const keys = {}; for (const k of keysOf(g)) keys[k] = localStorage.getItem(k); return keys; };
async function hashOf(obj) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(obj)));
  return [...new Uint8Array(buf)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
}
// 요약 한 줄 (충돌 창 · 소장 연출): 저장 안의 레벨/스테이지 같은 숫자를 찾아서
function summary(keys) {
  const pick = { lv: 'Lv', level: 'Lv', stage: '스테이지', maxStage: '스테이지', chapter: '챕터', day: '', best: '최고' };
  const found = [];
  for (const v of Object.values(keys)) {
    let o; try { o = JSON.parse(v); } catch { continue; }
    const scan = (x, depth) => { if (!x || typeof x !== 'object' || depth > 1) return; for (const [k, y] of Object.entries(x)) { if (pick[k] !== undefined && Number.isFinite(y) && y > 0 && !found.some(f => f[0] === pick[k])) found.push([pick[k], y]); else if (typeof y === 'object') scan(y, depth + 1); } };
    scan(o, 0);
  }
  return found.slice(0, 2).map(([l, n]) => l ? `${l} ${n.toLocaleString('ko-KR')}` : '').filter(Boolean).join(' · ');
}
// 압축 (지원 안 하는 브라우저면 그대로)
async function zip(s) {
  if (typeof CompressionStream === 'undefined') return { data: s, z: false };
  const b = await new Response(new Blob([s]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
  let bin = ''; const u = new Uint8Array(b); for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return { data: btoa(bin), z: true };
}
async function unzip(data, z) {
  if (!z) return data;
  const u = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
const serverOf = g => ((A.current() || {}).saves || []).find(s => s.game === g) || null;

// 올리기: force 면 서버 것을 덮어씀(직전본은 서버에 남음)
export async function push(g, { force = false, keepalive = false } = {}) {
  if (!on(g)) return { skip: true };
  const keys = pack(g); if (!Object.keys(keys).length) return { skip: true };
  const h = await hashOf(keys), m = meta()[g] || { rev: 0 };
  if (!force && m.hash === h && m.rev) return { same: true };
  const { data, z } = await zip(JSON.stringify({ keys }));
  let r;
  if (keepalive) { const t = await A.token(); fetch('/api/me', { method: 'POST', keepalive: true, headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ act: 'push', game: g, base: m.rev || 0, data, z, hash: h, sum: summary(keys), ver: window.OAD_VERSION || '', force }) }).catch(() => {}); return { sent: true }; }
  try { r = await A.call({ act: 'push', game: g, base: m.rev || 0, data, z, hash: h, sum: summary(keys), ver: window.OAD_VERSION || '', force }); }
  catch (e) { if (e.conflict) return { conflict: true, server: { rev: e.rev, sum: e.sum, at: e.at }, local: { sum: summary(keys) } }; return { error: e.message }; }
  setMeta(g, { rev: r.rev, hash: h, at: Date.now() });
  const me = A.current(); if (me) { me.saves = (me.saves || []).filter(s => s.game !== g).concat({ game: g, rev: r.rev, hash: h, sum: summary(keys), at: new Date().toISOString() }); }
  return { ok: true, rev: r.rev };
}
// 내려받아 이 기기 저장을 바꿈 (그 게임 키만)
export async function pull(g) {
  const r = await A.call({ act: 'pull', game: g }); if (!r.rev) return { empty: true };
  const box = JSON.parse(await unzip(r.data, r.z)), pats = SAVES[g] || [];
  const ok = k => pats.some(p => p.endsWith('*') ? k.startsWith(p.slice(0, -1)) : k === p);
  for (const k of keysOf(g)) if (!(k in box.keys)) localStorage.removeItem(k);
  for (const [k, v] of Object.entries(box.keys)) if (ok(k) && typeof v === 'string') localStorage.setItem(k, v);
  setMeta(g, { rev: r.rev, hash: r.hash, at: Date.now() });
  return { ok: true, sum: r.sum };
}
// 게임 열기 직전: 할 일 판단 → 'pull' 했음 · 'push' 했음 · 'ask' (두 기기 모두 바뀜) · 'none'
//   네트워크가 1.5초 넘게 걸리면 기다리지 않고 이 기기 것으로 시작
export async function beforePlay(g) {
  if (!on(g)) return { act: 'none' };
  try {
    await withTimeout(A.refresh(), 1500);
    const sv = serverOf(g), m = meta()[g] || {}, keys = pack(g), h = Object.keys(keys).length ? await hashOf(keys) : '';
    if (!sv) { if (h) await push(g); return { act: 'push' }; }
    if (sv.hash === h) { setMeta(g, { rev: sv.rev, hash: h, at: Date.now() }); return { act: 'none' }; }
    const localChanged = h && h !== m.hash, serverChanged = sv.rev !== m.rev;
    if (serverChanged && !localChanged) { await withTimeout(pull(g), 4000); return { act: 'pull', sum: sv.sum }; }
    if (localChanged && !serverChanged) { push(g); return { act: 'push' }; }
    return { act: 'ask', server: { sum: sv.sum, at: sv.at }, local: { sum: summary(keys), at: m.at || null } };
  } catch { return { act: 'none', offline: true }; }
}
export const afterPlay = g => on(g) ? push(g) : Promise.resolve({ skip: true });
export const undo = g => A.call({ act: 'undo', game: g }).then(() => pull(g));
export const canUndo = g => { const sv = serverOf(g); return !!(sv && (sv.rev > 1 || sv.prev_at)); };
export const lastSaved = g => { const sv = serverOf(g); return sv ? new Date(sv.at) : null; };
export const localSummary = g => summary(pack(g));
export const hasLocal = g => keysOf(g).length > 0;

// ── 늘 계정에 두는 키 (결제 기록 · 뽑기 천장): 로그인만 하면 소장과 상관없이 · 충돌 땐 계정 쪽을 받고 게임이 합침 ──
const AKEY = g => g + ':always';
const alwaysPats = g => SAVES_ALWAYS[g] || [];
function packAlways(g) { const keys = {}; for (const k of alwaysPats(g)) { const v = localStorage.getItem(k); if (v != null) keys[k] = v; } return keys; }
export const alwaysOn = g => !!(alwaysPats(g).length && A.current());
export async function syncAlways(g, phase) {
  if (!alwaysOn(g)) return;
  try {
    if (phase === 'before') await withTimeout(A.refresh(), 1500).catch(() => {});
    const sv = serverOf(AKEY(g)), m = meta()[AKEY(g)] || {}, keys = packAlways(g), h = Object.keys(keys).length ? await hashOf(keys) : '';
    if (phase === 'before' && sv && sv.hash !== h && sv.rev !== m.rev) {
      const r = await withTimeout(A.call({ act: 'pull', game: g, always: true }), 3000);
      if (r.rev) { const box = JSON.parse(await unzip(r.data, r.z)); for (const [k, v] of Object.entries(box.keys)) if (alwaysPats(g).includes(k) && typeof v === 'string') localStorage.setItem(k, v); setMeta(AKEY(g), { rev: r.rev, hash: r.hash, at: Date.now() }); }
      return;
    }
    if (!h || (sv && sv.hash === h)) return;
    const { data, z } = await zip(JSON.stringify({ keys }));
    const r = await A.call({ act: 'push', game: g, always: true, base: (sv && sv.rev) || 0, data, z, hash: h, sum: '', ver: window.OAD_VERSION || '', force: true });
    setMeta(AKEY(g), { rev: r.rev, hash: h, at: Date.now() });
  } catch { /* 다음 기회에 */ }
}
