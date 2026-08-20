const CACHE='swati-mini-oil-mill-alpha37-stable';
const APP_SHELL=[
  './','./index.html','./styles.css?v=ui-alpha37','./file-tools.js?v=ui-alpha37','./business-core.js?v=ui-alpha37','./business-core-bridge.js?v=ui-alpha37','./ui-i18n.js?v=ui-alpha37','./app.js?v=ui-alpha37','./sync-config.js?v=ui-alpha37','./offline-sync.js?v=ui-alpha37','./pwa.js?v=ui-alpha37',
  './manifest.webmanifest?v=alpha37-stable','./swati-icon-v2-192.png?v=alpha33-brand-v2','./swati-icon-v2-512.png?v=alpha33-brand-v2','./swati-icon-maskable-v2-192.png?v=alpha33-brand-v2','./swati-icon-maskable-v2-512.png?v=alpha33-brand-v2'
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
