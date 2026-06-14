const CACHE_NAME = 'cratetv-cache-v3';
const urlsToCache = [];

self.addEventListener('install', event => {
  // Activate the new service worker immediately, don't wait for old tabs to close
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      )
    ).then(() => self.clients.claim()) // take control of open pages immediately
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Never cache API requests or cross-origin resources (CDN, Firebase, etc.)
  if (requestUrl.pathname.startsWith('/api/') || requestUrl.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // NETWORK-FIRST for navigation and the app shell (HTML/JS/CSS).
  // This is the critical fix: previously these were cache-first, so once the
  // app shell was cached, users could be stuck on an old build indefinitely
  // even after new code was deployed. Now the browser always tries the
  // network first and only falls back to cache if offline.
  const isAppShell = event.request.mode === 'navigate' ||
    requestUrl.pathname.endsWith('.js') ||
    requestUrl.pathname.endsWith('.css') ||
    requestUrl.pathname.endsWith('.html') ||
    requestUrl.pathname === '/';

  if (isAppShell) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // CACHE-FIRST for static assets (images, fonts, etc.) — these are fine to
  // cache aggressively since they rarely change.
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        return networkResponse;
      });
    }).catch(() => {})
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
