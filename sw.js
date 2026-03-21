const CACHE_NAME='hokago-camera-v9';
const CORE=['./','./index.html?v=9','./manifest.webmanifest?v=9','./icon-192.png?v=9','./icon-512.png?v=9','./apple-touch-icon.png?v=9','./favicon-32.png?v=9'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  if(new URL(req.url).origin!==location.origin) return;
  event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE_NAME).then(cache=>cache.put(req,copy));return res;}).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html?v=9'))));
});
