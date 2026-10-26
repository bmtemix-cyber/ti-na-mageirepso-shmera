const CACHE='cook-v2-8';

const ASSETS=[
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install',event=>{
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(ASSETS))
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>
      Promise.all(
        keys
          .filter(key=>key!==CACHE)
          .map(key=>caches.delete(key))
      )
    ).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{

  if(event.request.mode==='navigate'){
    event.respondWith(
      fetch(event.request)
  self.addEventListener('fetch',event=>{

  const url=new URL(event.request.url);

  // Τα API requests πάνε απευθείας στον Worker.
  // Δεν τα αγγίζει καθόλου το Service Worker.
  if(url.pathname.startsWith('/api/')){
    return;
  }

  // Δεν κάνουμε cache POST ή άλλα non-GET requests.
  if(event.request.method!=='GET'){
    return;
  }

  if(event.request.mode==='navigate'){
    event.respondWith(
      fetch(event.request)
        .catch(()=>caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>{
      return cached || fetch(event.request);
    })
  );
});
self.addEventListener('push', event => {
  const title = '🍳 Τι να μαγειρέψω σήμερα;';

  const options = {
    body: 'Μην ξεχάσεις να καταγράψεις τα σημερινά γεύματα.',
    icon: './icon.svg',
    badge: './icon.svg',
    tag: 'evening-reminder',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {

      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});
