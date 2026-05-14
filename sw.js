const CACHE = "emirler-v21";
const STATIC = [
    "/", "/index.html", "/style.css", "/additions.css",
    "/app.js", "/app_additions.js", "/manifest.json",
    "/ikon_192.png", "/ikon_512.png",
    "/muhtar_ikon.png", "/agemder_ikon.png"
];

// Kurulum — statik dosyaları önbelleğe al
self.addEventListener("install", e => {
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
    );
});

// Aktivasyon — eski cache'leri temizle
self.addEventListener("activate", e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch — network first, cache fallback
self.addEventListener("fetch", e => {
    const url = new URL(e.request.url);

    // Dış servisler için direkt ağa git
    const external = [
        "firestore.googleapis.com","firebase","googleapis.com",
        "gstatic.com","cloudinary.com","aladhan.com",
        "open-meteo.com","onesignal.com","openweathermap.org"
    ];
    if (external.some(h => url.hostname.includes(h))) {
        e.respondWith(fetch(e.request));
        return;
    }

    // Statik dosyalar için cache-first
    if (e.request.method === "GET") {
        e.respondWith(
            caches.match(e.request).then(cached => {
                if (cached) return cached;
                return fetch(e.request).then(resp => {
                    if (resp && resp.status === 200 && resp.type === "basic") {
                        const clone = resp.clone();
                        caches.open(CACHE).then(c => c.put(e.request, clone));
                    }
                    return resp;
                }).catch(() => caches.match("/index.html"));
            })
        );
    }
});

// Push bildirimleri
self.addEventListener("push", e => {
    const data = e.data ? e.data.json() : {};
    self.registration.showNotification(data.title || "Emirler Köyü", {
        body: data.body || "",
        icon: "/ikon_192.png",
        badge: "/ikon_192.png",
        tag: data.tag || "emirler",
        data: { url: data.url || "/" }
    });
});

self.addEventListener("notificationclick", e => {
    e.notification.close();
    e.waitUntil(clients.openWindow(e.notification.data.url || "/"));
});
