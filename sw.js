// 서비스 워커: 홈 화면 설치 + 오프라인.
// 항상 서버에 새 버전이 있는지 확인(cache: 'no-cache')하고 받아 쓰며, 연결이 없을 때만 저장해 둔 사본을 쓴다.
// (GitHub Pages 는 파일을 10분간 캐시하라고 보내므로, 그냥 fetch 하면 설치한 앱이 옛 버전을 보여 줄 수 있음)
const CACHE = 'one-a-day-v3';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  /* 페이지 이동은 그대로 서버에 (테스트 서버 입구의 로그인 이동(302)을 그대로 따라가게) · 연결이 없을 때만 저장본 */
  if (req.mode === 'navigate') { e.respondWith(fetch(req).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./')))); return; }
  e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
    if (res.redirected) return fetch(req);   /* 로그인 화면으로 돌려보낸 응답은 저장 안 함 */
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })));
});
