// Emirler Köyü PWA - Service Worker v5
const CACHE_NAME = "emirler-v9";
const STATIC_ASSETS = [
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json",
    "./ikon_192.png",
    "./ikon_512.png",
    "./karekod.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => {})
    );
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        ))
    );
    self.clients.claim();
});

self.addEventListener("fetch", event => {
    const url = new URL(event.request.url);
    if (url.hostname.includes("firestore.googleapis.com") ||
        url.hostname.includes("firebase.com") ||
        url.hostname.includes("firebaseapp.com") ||
        url.hostname.includes("cloudinary.com") ||
        url.hostname.includes("googleapis.com") ||
        url.hostname.includes("gstatic.com")) {
        return;
    }
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (response.ok && event.request.method === "GET") {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                if (event.request.destination === "document") {
                    return caches.match("./index.html");
                }
            });
        })
    );
});

// ─── BİLDİRİM GÖSTER ───
self.addEventListener("push", event => {
    let data = { title: "Emirler Köyü", body: "Yeni bir şey var!", icon: "./ikon_192.png" };
    try { data = { ...data, ...event.data.json() }; } catch(e) {}
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon || "./ikon_192.png",
            badge: "./ikon_192.png",
            vibrate: [200, 100, 200],
            tag: data.tag || "emirler",
            data: { url: data.url || "./" }
        })
    );
});

// Bildirimi tıklayınca uygulamayı aç
self.addEventListener("notificationclick", event => {
    event.notification.close();
    const url = event.notification.data?.url || "./";
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
            for (const client of list) {
                if (client.url.includes("emirler") && "focus" in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});

// App'ten gelen mesajla bildirim göster (foreground → background köprüsü)
self.addEventListener("message", event => {
    if (event.data && event.data.type === "SHOW_NOTIFICATION") {
        const d = event.data;
        self.registration.showNotification(d.title || "Emirler Köyü", {
            body: d.body || "",
            icon: "./ikon_192.png",
            badge: "./ikon_192.png",
            vibrate: [150, 80, 150],
            tag: d.tag || "msg",
            data: { url: "./" }
        });
    }
});
