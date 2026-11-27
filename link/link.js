// 바깥 브라우저 로그인 → 원스토어 앱 (2026-11-27 대표 "브라우저에서 로그인 하고 뒤로가기하면 다시 원어데이로")
//   원스토어 앱이 한 번 쓰는 열쇠(10분)를 받아 이 주소(/link/?k=)를 바깥 브라우저로 엶 → 여기서 구글 로그인 → 서버가 열쇠에 이 계정을 묶음 → 앱이 물어서 받아 감
//   이 화면은 앱 세션을 받지 않음 · 열쇠는 이 브라우저에 잠깐만(로그인으로 다녀오는 동안) 둠 · 묶은 뒤 지움
const KK = 'oad_link_kb';
const $ = id => document.getElementById(id);
const show = id => ['go', 'done', 'bad'].forEach(x => { $(x).hidden = x !== id; });
const q = new URLSearchParams(location.search);
const qk = q.get('k');
if (qk && /^[A-Za-z0-9_-]{32}$/.test(qk)) { try { localStorage.setItem(KK, JSON.stringify({ k: qk, at: Date.now() })); } catch { /* */ } history.replaceState(null, '', location.pathname); }
const pend = () => { try { const x = JSON.parse(localStorage.getItem(KK) || 'null'); return x && Date.now() - x.at < 10 * 60e3 ? x.k : ''; } catch { return ''; } };
const bad = msg => { $('why').textContent = msg; show('bad'); };

async function client() {
  const cfg = await fetch('/api/admin/config').then(r => r.json()).catch(() => null);
  if (!cfg || !cfg.url || !cfg.anon) return null;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  return createClient(cfg.url, cfg.anon);
}
async function bind(token, k) {
  const r = await fetch('/api/me', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ act: 'link', sub: 'bind', k }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) return bad(j.error || '잠시 뒤 다시 해 주세요');
  try { localStorage.removeItem(KK); } catch { /* */ }
  show('done');
}
(async () => {
  const k = pend();
  if (!k) return bad('주소가 지났거나 맞지 않아요 · 원스토어 앱에서 다시 눌러 주세요');
  const c = await client(); if (!c) return bad('로그인을 준비하고 있어요 · 잠시 뒤 다시 열어 주세요');
  const { data } = await c.auth.getSession().catch(() => ({ data: {} }));
  const s = data && data.session;
  if (s) return bind(s.access_token, k);
  show('go');
  $('gbtn').onclick = () => c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/link/' } });
})();
