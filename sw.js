const CACHE='swati-job-work-alpha20-v1';
const APP_SHELL=[
  './','./index.html','./styles.css','./app.js','./sync-config.js','./offline-sync.js','./pwa.js',
  './manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-192.png','./icons/icon-maskable-512.png'
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
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(resp=>{
      const copy=resp.clone(); caches.open(CACHE).then(c=>c.put('./index.html',copy)); return resp;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  if(url.origin===self.location.origin){
    event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(resp=>{
      const copy=resp.clone(); caches.open(CACHE).then(c=>c.put(req,copy)); return resp;
    })));
  }
});
