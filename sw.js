// Emirler Köyü PWA - Service Worker v2
const CACHE_NAME = "emirler-v2";
const STATIC_ASSETS = [
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json",
    "./ikon_192.png",
    "./ikon_512.png",
    "./karekod.png",
    "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js"
];

// Kurulum
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS.slice(0, 7)); // Sadece yerel dosyalar
        }).catch(err => console.warn("Cache error:", err))
    );
    self.skipWaiting();
});

// Aktivasyon - eski cache temizle
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

// Fetch - Cache first for static, network first for API
self.addEventListener("fetch", event => {
    const url = new URL(event.request.url);
    
    // Firebase ve Cloudinary isteklerini direkt geç
    if (url.hostname.includes("firestore.googleapis.com") ||
        url.hostname.includes("firebase.com") ||
        url.hostname.includes("cloudinary.com") ||
        url.hostname.includes("googleapis.com")) {
        return;
    }
    
    // Statik dosyalar için cache-first
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                // Başarılı cevabı cache'e ekle
                if (response.ok && event.request.method === "GET") {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                // Offline - index.html döndür
                if (event.request.destination === "document") {
                    return caches.match("./index.html");
                }
            });
        })
    );
});
