// Coin Jar offline support. Bump CACHE when you change any file so phones pick up the new version.
const CACHE = 'coin-jar-v1';
const CORE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-64.png'
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve from the cache first, and refresh the cached copy in the background.
// Fonts from Google are cached the first time they load, so they work offline after that.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: sameOrigin });
    const refresh = fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      })
      .catch(() => null);
    if (hit) {
      e.waitUntil(refresh);
      return hit;
    }
    const res = await refresh;
    if (res) return res;
    return req.mode === 'navigate' ? (await cache.match('index.html')) || Response.error() : Response.error();
  })());
});
