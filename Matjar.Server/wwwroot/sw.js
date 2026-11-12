const CACHE_NAME = 'altasawuq-shell-v3.3';
const SHELL_ASSETS = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './maps-support.js',
  './appearance-notices.js',
  './chat-design.js',
  './locale.js',
  './commerce.js',
  './governance.js',
  './config.json',
  './currencies.json',
  './icon.svg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './manifest.webmanifest',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/leaflet.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

/* استراتيجية التحديث الفوري: Network-First لجلب أحدث التعديلات والملفات فوراً من السيرفر */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
  );
});


/* ========================================================
   Mobile Phone Push Notifications & Notification Shade
   ======================================================== */
self.addEventListener('push', event => {
  let data = { title: 'متجر التسوق', message: 'لديك تنبيه جديد في المتجر' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.message = event.data.text();
    }
  }

  const title = data.title || 'متجر التسوق';
  const options = {
    body: data.message || data.body || 'تنبيه جديد وصل إلى حسابك',
    icon: './icon-192.png',
    badge: './apple-touch-icon.png',
    image: data.image || undefined,
    vibrate: [250, 100, 250, 100, 250],
    tag: data.tag || 'matjar-notification',
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || './'
    },
    actions: [
      { action: 'open', title: 'عرض الإشعار' },
      { action: 'close', title: 'إغلاق' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'close') return;

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_PHONE_NOTIFICATION') {
    const { title, body, url } = event.data;
    const options = {
      body: body || 'تنبيه جديد من متجر التسوق',
      icon: './icon-192.png',
      badge: './apple-touch-icon.png',
      vibrate: [300, 150, 300],
      tag: 'matjar-alert-' + Date.now(),
      renotify: true,
      data: { url: url || './' },
      actions: [
        { action: 'open', title: 'فتح التطبيق' }
      ]
    };
    self.registration.showNotification(title || 'متجر التسوق', options);
  }
});
