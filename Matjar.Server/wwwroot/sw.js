const CACHE_NAME = 'altasawuq-shell-v4.8';
const SHELL_ASSETS = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './locale.js',
  './governance.js',
  './commerce.js',
  './chat-design.js',
  './appearance-notices.js',
  './maps-support.js',
  './icon.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Network-first for API, dynamic manifest, dynamic icon, and app shell so updates & icons sync immediately
  if (url.pathname.startsWith('/api/') || url.pathname.endsWith('manifest.webmanifest') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname === '/' || url.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          if (res.ok && !url.pathname.startsWith('/api/')) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
