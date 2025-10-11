const CACHE = 'pali-v1';
const ASSETS = [ '/', '/index.html', '/style.css', '/app.js', '/firebase.js', '/manifest.webmanifest' ];
self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))); });
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(keys=> Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))) });
self.addEventListener('fetch', e=>{
  const {request} = e; if(request.method!=='GET') return;
  e.respondWith(
    caches.match(request).then(cached=> cached || fetch(request).then(r=>{ const c=r.clone(); caches.open(CACHE).then(cc=>cc.put(request,c)); return r; }))
  );
});
