// 서비스 워커: 홈 화면 설치 + 오프라인.
// 항상 서버에 새 버전이 있는지 확인(cache: 'no-cache')하고 받아 쓰며, 연결이 없을 때만 저장해 둔 사본을 쓴다.
// (GitHub Pages 는 파일을 10분간 캐시하라고 보내므로, 그냥 fetch 하면 설치한 앱이 옛 버전을 보여 줄 수 있음)
const CACHE = 'one-a-day-v4';
/* 저장본도 없을 때(설치 직후 바로 오프라인)의 마지막 화면 */
const OFFLINE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>One a Day</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#14102E;color:#F6F2FF;font:16px/1.5 -apple-system,sans-serif;text-align:center"><div><div style="font-size:48px">🌙</div><p>인터넷에 연결되면 오늘의 게임이 열려요</p><button onclick="location.reload()" style="border:0;border-radius:14px;padding:12px 20px;background:#FFC93C;color:#3A2200;font-size:16px">다시 열기</button></div></body>';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const req = e.request;
  const u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin) return;
  /* 서버 API · 운영실은 손대지 않음 (로그인 헤더를 그대로 보내야 하고, 사용자 데이터를 저장하면 안 됨) */
  if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/admin')) return;
  /* 페이지 이동은 그대로 서버에 (테스트 서버 입구의 로그인 이동(302)을 그대로 따라가게) · 연결이 없을 때만 저장본 */
  /* 페이지 문서도 정상 응답(리다이렉트 · 로그인 화면 아님)이면 사본을 둠 → 연결이 없을 때 설치 앱이 마지막 메인으로 열림 (2026-10-28 설치 안내 ops D3) */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      if (res.ok && !res.redirected && res.type === 'basic' && /\/(index\.html)?$/.test(u.pathname) && (res.headers.get('content-type') || '').includes('text/html')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(new URL('./', location).href, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match(new URL('./', location).href)).then(r => r || new Response(OFFLINE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))));
    return;
  }
  e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
    if (res.redirected) return fetch(req);   /* 로그인 화면으로 돌려보낸 응답은 저장 안 함 */
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })));
});
