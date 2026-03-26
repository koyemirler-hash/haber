const CACHE_NAME = "emirler-v2";

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  caches.keys().then(keys => {
    keys.forEach(k => {
      if(k !== CACHE_NAME) caches.delete(k);
    });
  });
});

self.addEventListener("fetch", e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
