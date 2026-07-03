// This service worker previously cached the app shell with a cache-first
// strategy that served stale JS/HTML forever once installed, and nothing in
// the app actually re-registers it (serviceWorkerRegistration.register() is
// never called anywhere in index.tsx). Net effect: any device that installed
// it on a past visit stays stuck on whatever version of the site was cached
// back then — no future deploy, however many times it's pushed, ever reaches
// that device — while devices that never installed it see fresh code every
// time. That's exactly the "fix shows up on iPhone but not Android" pattern.
//
// Rather than try to keep a caching layer alive and correct, this version
// self-destructs: it takes over immediately, wipes every cache it (or the
// old version of itself) created, and unregisters so the browser stops
// running a service worker for this site at all. After this runs once on an
// affected device, that device goes back to normal network requests like
// everyone else, and future deploys reach it immediately.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      await self.registration.unregister();

      const clientsList = await self.clients.matchAll({ type: 'window' });
      clientsList.forEach((client) => client.navigate(client.url));
    })()
  );
});
