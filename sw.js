// Emirler Köyü PWA - Service Worker v11
const CACHE_NAME = "emirler-v19";
const STATIC_ASSETS = ["./index.html","./style.css","./app.js","./manifest.json","./ikon_192.png","./karekod.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(STATIC_ASSETS)).catch(()=>{})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
    const url = new URL(e.request.url);
    if (["firestore.googleapis.com","firebase.com","firebaseapp.com","cloudinary.com","googleapis.com","gstatic.com","aladhan.com","open-meteo.com"].some(h=>url.hostname.includes(h))) return;
    e.respondWith(caches.match(e.request).then(cached => { if (cached) return cached; return fetch(e.request).then(res => { if (res.ok&&e.request.method==="GET") { const clone=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(e.request,clone)); } return res; }).catch(()=>{ if (e.request.destination==="document") return caches.match("./index.html"); }); }));
});
self.addEventListener("push", e => { let d={title:"Emirler Köyü",body:"Yeni bir şey var!",icon:"./ikon_192.png"}; try{d={...d,...e.data.json()};}catch(ex){} e.waitUntil(self.registration.showNotification(d.title,{body:d.body,icon:d.icon||"./ikon_192.png",badge:"./ikon_192.png",vibrate:[200,100,200],tag:d.tag||"emirler",data:{url:d.url||"./"}})); });
self.addEventListener("notificationclick", e => { e.notification.close(); const url=e.notification.data?.url||"./"; e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{ for(const c of list){if(c.url.includes("emirler")&&"focus"in c)return c.focus();} if(clients.openWindow)return clients.openWindow(url); })); });
self.addEventListener("message", e => { if(e.data?.type==="SHOW_NOTIFICATION") self.registration.showNotification(e.data.title||"Emirler Köyü",{body:e.data.body||"",icon:"./ikon_192.png",badge:"./ikon_192.png",vibrate:[150,80,150],tag:e.data.tag||"msg",data:{url:"./"}}); });
