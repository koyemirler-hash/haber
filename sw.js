const CACHE = "emirler-v22";
const CORE = ["/", "/index.html", "/style.css", "/additions.css",
              "/app.js", "/app_additions.js", "/manifest.json",
              "/ikon_192.png", "/ikon_512.png"];

self.addEventListener("install", e => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
});

self.addEventListener("activate", e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", e => {
    if (e.request.method !== "GET") return;
    const url = new URL(e.request.url);
    // Dış servisler → ağa bırak
    if (!url.hostname.includes("emirler") && !url.hostname.includes("localhost") && !url.hostname.includes("127.0.0.1") && url.hostname !== location.hostname) {
        return;
    }
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(resp => {
                if (resp && resp.status === 200) {
                    const clone = resp.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return resp;
            }).catch(() => caches.match("/index.html"));
        })
    );
});

self.addEventListener("push", e => {
    const d = e.data ? e.data.json() : {};
    e.waitUntil(self.registration.showNotification(d.title || "Emirler Köyü", {
        body: d.body || "", icon: "/ikon_192.png", badge: "/ikon_192.png",
        tag: d.tag || "emirler", data: { url: d.url || "/" }
    }));
});

self.addEventListener("notificationclick", e => {
    e.notification.close();
    e.waitUntil(clients.openWindow(e.notification.data?.url || "/"));
});
