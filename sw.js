const CACHE='swati-job-work-alpha31-v1';
const APP_SHELL=[
  './','./index.html','./styles.css?v=alpha31','./file-tools.js?v=alpha31','./app.js?v=alpha31','./sync-config.js?v=alpha31','./offline-sync.js?v=alpha31','./pwa.js?v=alpha31',
  './manifest.webmanifest?v=alpha31','./swati-icon-v2-192.png','./swati-icon-v2-512.png','./swati-icon-maskable-v2-192.png','./swati-icon-maskable-v2-512.png'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;
  // Network-first while online so new Alpha files appear immediately; cached fallback keeps offline mode working.
  event.respondWith(fetch(req).then(resp=>{
    const copy=resp.clone();
    caches.open(CACHE).then(c=>c.put(req,copy));
    return resp;
  }).catch(()=>caches.match(req).then(hit=>hit||caches.match('./index.html'))));
});
