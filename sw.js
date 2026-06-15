/* SkyGlobe Group — Service Worker
   Network-first for navigation & API (always fresh content),
   cache-first for static assets (fast repeat loads, offline-friendly). */
const CACHE = 'skyglobe-v3';
const STATIC_ASSETS = ['/', '/index.html', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon-32.png', '/stamp.svg', '/signature.png', '/manifest.json'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC_ASSETS).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never cache API calls — always go to network.
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(req).catch(() => new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // Navigation requests: network-first, fall back to cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('/index.html', copy));
        return res;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: cache-first, then network (and cache it).
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => {
        if (res.ok && (url.origin === location.origin)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit)
    )
  );
});
