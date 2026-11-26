const CACHE='cook-v2-10';
const INDEX=new URL('./index.html',self.registration.scope).href;
const ASSETS=[INDEX,'./manifest.webmanifest','./icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('cook-v2-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||req.headers.has('range'))return;
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(req);
        if(response.ok&&response.headers.get('content-type')?.includes('text/html')&&(url.pathname==='/'||url.pathname.endsWith('/index.html'))){
          const cache=await caches.open(CACHE);await cache.put(INDEX,response.clone()).catch(()=>{});
        }
        return response;
      }catch{
        return (await caches.match(INDEX))||new Response('Offline — άνοιξε την εφαρμογή με σύνδεση πρώτα.',{status:503});
      }
    })());
    return;
  }
  if(!['image','style','script','font','manifest'].includes(req.destination))return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(req);
      if(response.ok&&response.status===200&&response.type==='basic'){
        const cache=await caches.open(CACHE);await cache.put(req,response.clone()).catch(()=>{});
      }
      return response;
    }catch{return (await caches.match(req))||new Response('',{status:503});}
  })());
});

self.addEventListener('push', event => {

  const title='🍳 Τι να μαγειρέψω σήμερα;';

  const options={
    body:'Μην ξεχάσεις να καταγράψεις τα σημερινά γεύματα.',
    icon:'./icon.svg',
    badge:'./icon.svg',
    tag:'evening-reminder',
    renotify:true
  };

  event.waitUntil(
    self.registration.showNotification(title,options)
  );

});

self.addEventListener('notificationclick', event => {

  event.notification.close();

  event.waitUntil(
    clients.matchAll({
      type:'window',
      includeUncontrolled:true
    }).then(windowClients=>{

      for(const client of windowClients){

        if('focus' in client){
          return client.focus();
        }

      }

      if(clients.openWindow){
        return clients.openWindow('./');
      }

    })
  );

});
