/* 単語スタンプ Service Worker
   방침:
   - 앱 셸(index.html, 아이콘, manifest)은 네트워크 우선 + 캐시 폴백
     → 온라인이면 항상 최신 버전, 오프라인이면 캐시로 열림
   - script.google.com(GAS 기록 API)은 절대 캐시하지 않고 그대로 통과
   - 앱을 갱신할 때는 아래 VERSION 숫자만 올리면 됨
*/
const VERSION = 'tango-std-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // GAS API・외부 요청은 개입하지 않음 (기록 전송을 방해하지 않기 위해)
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;

  // 같은 오리진의 앱 셸: 네트워크 우선, 실패 시 캐시
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((hit) => hit || caches.match('./index.html'))
      )
  );
});
