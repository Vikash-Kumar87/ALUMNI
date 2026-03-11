// Minimal service worker — required for PWA install prompt on some browsers
const CACHE = 'alumni-connect-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(['/', '/favicon.svg', '/manifest.json'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Network-first: always try network, fall back to cache
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
