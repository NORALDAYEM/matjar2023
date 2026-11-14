const CACHE_NAME = 'altasawuq-shell-v7.1.0';
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

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'FORCE_APP_UPDATE_NOW') {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => self.skipWaiting())
    );
    return;
  }
  if (data.type === 'SHOW_INCOMING_CALL' && self.registration?.showNotification) {
    const call = data.call || {};
    const title = data.title || `📲 مكالمة ${call.callKind === 'video' ? 'فيديو 🎥' : 'صوتية 📞'} واردة من ${call.callerName || 'الإدارة'}`;
    const options = {
      body: data.body || 'يرن الآن... اضغط للرد وفتح المكالمة المباشرة',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: 'incoming-call-' + (call.id || 'live'),
      renotify: true,
      requireInteraction: true,
      vibrate: [600, 250, 600, 250, 600, 250, 800],
      data: { callId: call.id || '', url: './#call=' + (call.id || '') },
      actions: [
        { action: 'answer', title: '🟢 رد على المكالمة' },
        { action: 'decline', title: '🔴 رفض' }
      ]
    };
    event.waitUntil(self.registration.showNotification(title, options).catch(() => {}));
  }
});

self.addEventListener('notificationclick', event => {
  const notif = event.notification;
  const data = notif?.data || {};
  const action = event.action || 'answer';
  notif.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'INCOMING_CALL_ACTION',
            action,
            callId: data.callId || ''
          });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(data.url || './');
      }
    })
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

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
