const CACHE = 'cook-v3-3';

const STATIC_ASSETS = [
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // Για την εφαρμογή και το index.html:
  // ΠΡΩΤΑ Internet, cache μόνο αν δεν υπάρχει σύνδεση.
  if (
    request.mode === 'navigate' ||
    new URL(request.url).pathname.endsWith('/index.html')
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Για εικονίδιο / manifest κλπ:
  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request);
    })
  );
});;
