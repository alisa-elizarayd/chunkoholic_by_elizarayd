const CACHE_NAME = 'chunkoholic-3.0-v3';

const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './supabase.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const isPageRequest =
    event.request.mode === 'navigate' ||
    event.request.url.endsWith('/index.html') ||
    event.request.url.endsWith('/');

  if (isPageRequest) {
    // Always prefer the newest published HTML. Fall back to cache offline.
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then(
          cachedResponse => cachedResponse || caches.match('./index.html')
        ))
    );
    return;
  }

  // Static assets use cache-first for offline support.
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then(networkResponse => {
        if (
          networkResponse.ok &&
          event.request.url.startsWith(self.location.origin)
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }

        return networkResponse;
      });
    }).catch(() => Response.error())
  );
});
