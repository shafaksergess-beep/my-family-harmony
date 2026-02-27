const CACHE_NAME = 'kinsroot-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/logo.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'Kinsroot Notification';
  const options = {
    body: data.body ?? 'You have a new update in your family group.',
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    data: data.url ?? '/'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
  
  // Set badge if supported
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(1).catch(console.error);
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
