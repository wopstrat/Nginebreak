/* ============================================================
   NGINEBREAK — Web Push Service Worker Event Listener
   ============================================================ */

self.addEventListener('push', (event) => {
  let data = {
    title: 'NGINEBREAK',
    body: 'Vehicle update available.',
    icon: '/pwa-192x192.png',
    badge: '/favicon.ico',
    tag: 'nginebreak-alert',
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (_) {
      try {
        data.body = event.data.text();
      } catch (__) {}
    }
  }

  const notificationOptions = {
    body: data.body || 'Vehicle update available.',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || 'nginebreak-alert',
    data: data.data || { url: '/' },
    vibrate: [100, 50, 100],
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'NGINEBREAK', notificationOptions)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing NGINEBREAK tab if open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
