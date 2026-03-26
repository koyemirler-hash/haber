self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('emirler-v1').then(cache => cache.addAll(['index.html','style.css','app.js','manifest.json']))
  );
});
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
