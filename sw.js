// Emirler K\u00f6y\u00fc PWA - Service Worker v12
// OneSignal entegrasyonu - \u00e7ak\u0131\u015fma giderildi
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = "emirler-v13";
const STATIC_ASSETS = ["./index.html","./style.css","./app.js","./manifest.json","./ikon_192.png","./ikon_512.png","./karekod.png"];

self.addEventListener("install", e => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)).catch(() => {}));
    self.skipWaiting();
});

self.addEventListener("activate", e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
    self.clients.claim();
});

self.addEventListener("fetch", e => {
    const url = new URL(e.request.url);
    if (["firestore.googleapis.com","firebase.com","firebaseapp.com","cloudinary.com","googleapis.com","gstatic.com","aladhan.com","open-meteo.com","onesignal.com"].some(h => url.hostname.includes(h))) return;
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).then(res => {
                if (res.ok && e.request.method === "GET") {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                }
                return res;
            }).catch(() => {
                if
