const CACHE='swati-job-work-ui-alpha3-v1';
const APP_SHELL=[
  './','./index.html','./styles.css?v=ui-alpha3','./file-tools.js?v=ui-alpha3','./app.js?v=ui-alpha3','./sync-config.js?v=ui-alpha3','./offline-sync.js?v=ui-alpha3','./pwa.js?v=ui-alpha3',
  './manifest.webmanifest?v=ui-alpha3','./swati-icon-v2-192.png','./swati-icon-v2-512.png','./swati-icon-maskable-v2-192.png','./swati-icon-maskable-v2-512.png'
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
