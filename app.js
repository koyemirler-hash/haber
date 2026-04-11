/* Emirler Köyü Portalı - Protected Build
 * © 2026 Emirler Köyü. Tüm hakları saklıdır.
 * Bu dosya koruma altındadır. İzinsiz kopyalanamaz.
 */
const firebaseConfig = {
    apiKey: "\x41\x49\x7a\x61\x53\x79\x44\x55\x61\x67\x64\x61\x49\x6f\x4a\x6d\x6b\x67\x47\x6a\x57\x46\x76\x32\x61\x76\x59\x73\x43\x37\x6e\x5f\x2d\x34\x41\x4a\x37\x73\x30",
    authDomain: "\x65\x6d\x69\x72\x6c\x65\x72\x2d\x63\x35\x36\x33\x38\x2e\x66\x69\x72\x65\x62\x61\x73\x65\x61\x70\x70\x2e\x63\x6f\x6d",
    projectId: "\x65\x6d\x69\x72\x6c\x65\x72\x2d\x63\x35\x36\x33\x38",
    appId: "\x31\x3a\x34\x32\x36\x32\x32\x35\x32\x36\x34\x31\x33\x36\x3a\x77\x65\x62\x3a\x63\x61\x35\x31\x38\x34\x39\x38\x34\x66\x63\x37\x31\x62\x31\x65\x36\x33\x38\x35\x33\x62\x64"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

const CLOUD_NAME = "\x64\x64\x74\x31\x31\x76\x68\x79\x62";
const ONESIGNAL_APP_ID = "\x30\x63\x36\x38\x32\x37\x35\x63\x2d\x66\x63\x38\x33\x2d\x34\x62\x31\x65\x2d\x61\x39\x34\x35\x2d\x32\x35\x31\x36\x63\x31\x39\x63\x36\x33\x64\x34";
const ONESIGNAL_API_KEY = "\x6f\x73\x5f\x76\x32\x5f\x61\x70\x70\x5f\x62\x72\x75\x63\x6f\x78\x68\x34\x71\x6e\x66\x72\x35\x6b\x6b\x66\x65\x75\x6c\x6d\x64\x68\x64\x64\x32\x71\x35\x62\x79\x69\x66\x69\x6e\x71\x33\x75\x6d\x76\x35\x32\x6a\x34\x36\x61\x37\x76\x66\x76\x6a\x32\x7a\x6b\x6d\x34\x6b\x37\x34\x67\x65\x7a\x32\x6c\x6d\x6f\x69\x74\x6a\x34\x71\x36\x6d\x71\x72\x6b\x7a\x75\x6c\x70\x78\x6a\x70\x6d\x32\x62\x6a\x61\x70\x62\x69\x36\x73\x35\x68\x72\x77\x63\x75\x35\x62\x67\x63\x7a\x61";
const UPLOAD_PRESET = "\x6b\x6f\x79\x61\x70\x70";
const ADMIN_EMAIL = "\x6b\x6f\x79\x65\x6d\x69\x72\x6c\x65\x72\x40\x67\x6d\x61\x69\x6c\x2e\x63\x6f\x6d";
const EMOJIS = ["❤️","😂","😮","😢","😡","👍"];
const YASAKLi_KELIMELER = ["küfür","aptal","salak","orospu","siktir","amk","amq"];
const KOY_LAT = 39.72, KOY_LNG = 33.52;

let currentUser = null, userProfile = null;
let chatMediaFile = null, currentPostId = null, currentCollection = "announcements";
let commentsUnsubscribe = null, deferredInstallPrompt = null;
let chatDocCount = -1, akisDocCount = -1, soundEnabled = localStorage.getItem("soundEnabled") !== "false";
let audioCtx = null, ilanlarDinleBasladi = false, aktifIlanFiltre = "hepsi";
let havaYuklendi = false, namazYuklendi = false, ilanUnsubscribe = null;
let floatReklamKapatildi = false, ozelSohbetKisiUid = null, anketCountdownInterval = null;
let secilenDurum = "", secilenAvatarDosya = null, aktifHikayeId = null;

window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault(); deferredInstallPrompt = e;
    document.getElementById("pwaInstallBanner").classList.remove("hidden");
    document.body.classList.add("pwa-banner-acik");
    const sb = document.getElementById("settingsInstallBtn");
    if (sb) sb.style.display = "";
});
window.addEventListener("appinstalled", () => {
    document.getElementById("pwaInstallBanner").classList.add("hidden");
    document.body.classList.remove("pwa-banner-acik");
    deferredInstallPrompt = null;
});
function pwaYukle() {
    if (!deferredInstallPrompt) { alert("📱 Tarayıcı menüsü → 'Ana Ekrana Ekle'"); return; }
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(r => {
        if (r.outcome === "accepted") { document.getElementById("pwaInstallBanner").classList.add("hidden"); document.body.classList.remove("pwa-banner-acik"); }
        deferredInstallPrompt = null;
    });
}
function pwaYukleSettings() { if (!deferredInstallPrompt) { alert("📱 Uygulama zaten yüklü veya tarayıcınız desteklemiyor.\n\nManuel: Tarayıcı menüsü → Ana Ekrana Ekle"); return; } pwaYukle(); }
function pwaBannerKapat() { document.getElementById("pwaInstallBanner").classList.add("hidden"); document.body.classList.remove("pwa-banner-acik"); }

window.addEventListener("DOMContentLoaded", () => {
    const sb = document.getElementById("settingsInstallBtn");
    if (sb) sb.style.display = "none";
    updateSoundBtn();
    setTimeout(() => { if ("Notification" in window && Notification.permission === "default") bildirimiIzniAl(); }, 3000);

    oneSignalBaslat();
});

function oneSignalBaslat() {
    if (typeof OneSignalDeferred === "undefined") return;
    OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            safari_web_id: "",
            notifyButton: { enable: false },
            allowLocalhostAsSecureOrigin: true,
        });
    });
}

async function oneSignalBildirimGonder(baslik, mesaj, url) {
    if (!ONESIGNAL_API_KEY) return;
    try {
        await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Basic " + ONESIGNAL_API_KEY
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                included_segments: ["All"],
                headings: { tr: baslik, en: baslik },
                contents: { tr: mesaj, en: mesaj },
                url: url || "https://koyemirler-hash.github.io/haber",
                chrome_web_icon: "https://koyemirler-hash.github.io/haber/ikon_192.png"
            })
        });
    } catch(e) { console.warn("OneSignal bildirim hatası:", e); }
}

function ilkDokunusIzinleri() {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === "suspended") ctx.resume();
    bildirimiIzniAl();
}
document.addEventListener("touchstart", ilkDokunusIzinleri, { once: true });
document.addEventListener("click", ilkDokunusIzinleri, { once: true });

function getAudioCtx() {
    if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { return null; } }
    return audioCtx;
}
function playLikeSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioCtx(); if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
    } catch(e) {}
}
function playMessageSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioCtx(); if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();
        [0, 0.13].forEach(delay => {
            const osc = ctx.createOscillator(), gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = "sine"; osc.frequency.value = 880;
            gain.gain.setValueAtTime(0, ctx.currentTime + delay);
            gain.gain.linearRampToValueAtTime(0.65, ctx.currentTime + delay + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.11);
            osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.11);
        });
    } catch(e) {}
}
function playApproveSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioCtx(); if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();
        [440, 554.37, 659.25].forEach((freq, i) => {
            const osc = ctx.createOscillator(), gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = "sine"; osc.frequency.value = freq;
            const t = ctx.currentTime + i * 0.12;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.6, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            osc.start(t); osc.stop(t + 0.15);
        });
    } catch(e) {}
}
function sesToggle() {
    soundEnabled = !soundEnabled;
    localStorage.setItem("soundEnabled", soundEnabled ? "true" : "false");
    updateSoundBtn();
    if (soundEnabled) playLikeSound();
}
function updateSoundBtn() {
    const btn = document.getElementById("soundToggleBtn");
    if (btn) btn.textContent = soundEnabled ? "🔔" : "🔕";
    const sesBtn = document.getElementById("sesBtn");
    if (sesBtn) { sesBtn.textContent = soundEnabled ? "Açık" : "Kapalı"; sesBtn.className = soundEnabled ? "izin-btn izin-btn-aktif" : "izin-btn"; }
}

async function bildirimiIzniAl() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") { bildirimBtnGuncelle("granted"); return; }
    if (Notification.permission === "denied") { bildirimBtnGuncelle("denied"); return; }
    try { const izin = await Notification.requestPermission(); bildirimBtnGuncelle(izin); } catch(e) {}
}
async function bildirimIzniIste() {
    if (!("Notification" in window)) { alert("Bu tarayıcı bildirimleri desteklemiyor."); return; }
    if (Notification.permission === "denied") { alert("Bildirim izni reddedilmiş.\n\nTarayıcı Ayarları → Site Ayarları → Bildirimler → Emirler → İzin Ver"); return; }
    const izin = await Notification.requestPermission();
    bildirimBtnGuncelle(izin);
    if (izin === "granted") setTimeout(() => telefonBildirimi("✅ Emirler Köyü","Bildirimler etkinleştirildi!","test"), 500);
}
function bildirimBtnGuncelle(durum) {
    const btn = document.getElementById("bildirimBtn"), text = document.getElementById("bildirimDurumText");
    if (!btn) return;
    if (durum === "granted") { btn.textContent = "✅ Açık"; btn.className = "izin-btn izin-btn-aktif"; if (text) text.textContent = "Bildirimler aktif ✓"; }
    else if (durum === "denied") { btn.textContent = "🚫 Kapalı"; btn.className = "izin-btn izin-btn-kapali"; if (text) text.textContent = "Tarayıcı ayarlarından açın"; }
    else { btn.textContent = "İzin Ver"; btn.className = "izin-btn"; }
}
function telefonBildirimi(baslik, mesaj, tag) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then(reg => {
            if (reg.active) reg.active.postMessage({ type:"SHOW_NOTIFICATION", title:baslik, body:mesaj, tag:tag||"emirler" });
        }).catch(() => new Notification(baslik, { body:mesaj, icon:"./ikon_192.png" }));
    } else new Notification(baslik, { body:mesaj, icon:"./ikon_192.png" });
}

function ayricaliklimi() {
    if (!userProfile) return false;
    if (currentUser && currentUser.email === ADMIN_EMAIL) return true;
    const r = userProfile.rol || userProfile.role || "";
    return ["admin","muhtar","yardimci"].includes(r);
}
function adminMi() {
    if (currentUser && currentUser.email === ADMIN_EMAIL) return true;
    const r = userProfile ? (userProfile.rol || userProfile.role || "") : "";
    return r === "admin";
}
function zamanFarki(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime(), sn = Math.floor(diff/1000);
    if (sn < 60) return "Az önce";
    const dk = Math.floor(sn/60); if (dk < 60) return `${dk} dk önce`;
    const sa = Math.floor(dk/60); if (sa < 24) return `${sa} sa önce`;
    return d.toLocaleDateString("tr-TR", { day:"numeric", month:"long" });
}
function kufurKontrol(metin) { const m=metin.toLowerCase(); return YASAKLi_KELIMELER.some(k => { const re=new RegExp("(^|\\s|,|!|\\.)"+k+"($|\\s|,|!|\\.)"); return re.test(" "+m+" "); }); }
function escapeHtml(str) { return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function previewFile(input, previewId) {
    const preview = document.getElementById(previewId);
    if (!input.files[0]) { preview.innerHTML = ""; return; }
    const file = input.files[0], url = URL.createObjectURL(file);
    preview.innerHTML = file.type.startsWith("video") ? `<video src="${url}" controls style="max-width:100%;border-radius:10px;max-height:180px;"></video>` : `<img src="${url}" style="max-width:100%;border-radius:10px;max-height:180px;object-fit:cover;">`;
}
async function cloudinaryYukle(file) {
    const fd = new FormData();
    fd.append("file", file); fd.append("upload_preset", UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method:"POST", body:fd });
    if (!res.ok) throw new Error("Cloudinary yükleme başarısız! Preset: " + UPLOAD_PRESET);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return { url:data.secure_url, type:file.type.startsWith("video") ? "video" : "image" };
}
function resimTamEkran(src) { document.getElementById("imgFullscreenSrc").src = src; document.getElementById("imgFullscreen").classList.remove("hidden"); }

if (localStorage.getItem("termsAccepted")) {
    document.getElementById("termsOverlay").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
}
function onayVer() {
    if (!document.getElementById("termsCheck").checked) { alert("Şartları kabul etmelisiniz!"); return; }
    localStorage.setItem("termsAccepted","true");
    document.getElementById("termsOverlay").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
}

function switchAuthTab(tab) {
    document.getElementById("loginForm").classList.toggle("hidden", tab !== "login");
    document.getElementById("registerForm").classList.toggle("hidden", tab !== "register");
    document.getElementById("loginTabBtn").classList.toggle("active", tab === "login");
    document.getElementById("registerTabBtn").classList.toggle("active", tab === "register");
    document.getElementById("authError").textContent = "";
}
async function girisYap() {
    const email = document.getElementById("logEmail").value.trim(), pass = document.getElementById("logPass").value;
    if (!email || !pass) return;
    try { await auth.signInWithEmailAndPassword(email, pass); }
    catch(e) {
        const m = {"auth/user-not-found":"Bu e-posta ile kayıt bulunamadı!","auth/wrong-password":"Şifre hatalı!","auth/invalid-email":"Geçersiz e-posta!","auth/too-many-requests":"Çok fazla deneme. Lütfen bekleyin."};
        document.getElementById("authError").textContent = m[e.code] || "Giriş başarısız!";
    }
}
async function kayitOl() {
    const name = document.getElementById("regName").value.trim();
    const phone = document.getElementById("regPhone").value.trim().replace(/\s/g,"");
    const email = document.getElementById("regEmail").value.trim();
    const pass = document.getElementById("regPass").value;
    const errEl = document.getElementById("authError");
    if (!name || !phone || !email || !pass) { errEl.textContent = "Tüm alanları doldurun!"; return; }
    if (pass.length < 6) { errEl.textContent = "Şifre en az 6 karakter!"; return; }
    if (!/^[0-9+]{10,13}$/.test(phone.replace(/[^0-9+]/g,""))) { errEl.textContent = "Geçerli telefon numarası girin!"; return; }
    errEl.textContent = "⏳ Kontrol ediliyor...";
    try {
        const telKontrol = await db.collection("users").where("phone","==",phone).get();
        if (!telKontrol.empty) { errEl.textContent = "❌ Bu telefon zaten kayıtlı!"; return; }
        const res = await auth.createUserWithEmailAndPassword(email, pass);
        await db.collection("users").doc(res.user.uid).set({ name, phone, email, rol: email === ADMIN_EMAIL ? "admin" : "user", online:true, blocked:false, lastSeen:firebase.firestore.FieldValue.serverTimestamp() });
        errEl.textContent = "";
    } catch(e) {
        const m = {"auth/email-already-in-use":"❌ Bu e-posta zaten kayıtlı!","auth/invalid-email":"❌ Geçersiz e-posta!"};
        errEl.textContent = m[e.code] || "Kayıt başarısız: " + e.message;
    }
}
async function cikisYap() {
    if (currentUser) { try { await db.collection("users").doc(currentUser.uid).update({ online:false }); } catch(e) {} }
    await auth.signOut(); location.reload();
}

auth.onAuthStateChanged(async user => {
    if (user) {
        currentUser = user;
        const docRef = db.collection("users").doc(user.uid);
        let docSnap = await docRef.get();
        if (!docSnap.exists) {
            await docRef.set({ name:user.displayName||user.email.split("@")[0], email:user.email, rol:user.email===ADMIN_EMAIL?"admin":"user", online:true, blocked:false, lastSeen:firebase.firestore.FieldValue.serverTimestamp() });
            docSnap = await docRef.get();
        } else { await docRef.update({ online:true, lastSeen:firebase.firestore.FieldValue.serverTimestamp() }); }
        userProfile = docSnap.data();
        if (userProfile.blocked) { await auth.signOut(); alert("❌ Hesabınız engellenmiştir."); location.reload(); return; }

        document.getElementById("loginPage").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        document.getElementById("navBar").classList.remove("hidden");

        if (ayricaliklimi()) {
            document.getElementById("postPanel").classList.remove("hidden");
            document.getElementById("nostaljiPendingSection").classList.remove("hidden");
            document.getElementById("nostaljiApprovalNote").classList.add("hidden");
            document.getElementById("ilanOnaySection").classList.remove("hidden");
            document.getElementById("ilanOnayNotu").classList.add("hidden");
            const avp = document.getElementById("anketYonetimPanel"); if (avp) avp.style.display = "";
        }
        if (adminMi()) {
            document.getElementById("adminPanel").classList.remove("hidden");
        }

        window.addEventListener("beforeunload", () => navigator.sendBeacon(`https://firestore.googleapis.com/v1/projects/\x65\x6d\x69\x72\x6c\x65\x72\x2d\x63\x35\x36\x33\x38/databases/(default)/documents/users/${user.uid}`, JSON.stringify({ fields:{ online:{ booleanValue:false } } })));

        bildirimBtnGuncelle(("Notification" in window) ? Notification.permission : "denied");
        updateSoundBtn();
        resetTalepYukle();
        hakkimizdaYukle();
        reklamYukle();
        floatReklamYukle();
        profilGorunurlukYukle();
        anketDinle();
        setTimeout(() => anketKatilimKontrol(), 2500);

        settingsProfilGuncelle();

        if (typeof OneSignalDeferred !== "undefined") {
            OneSignalDeferred.push(async function(OneSignal) {
                try { await OneSignal.login(user.uid); } catch(e) {}
            });
        }
        tabDegistir("feed");
        akisDinle();
        hikayeleriYukle();
        mesajlariDinle();
        isletmeleriYukle();
        nostaljiDinle();
        if (ayricaliklimi()) { nostaljiOnayBekleyenleriDinle(); ilanOnayBekleyenleriDinle(); }
        if (adminMi()) { onlineListesiYukle(); resetTalepleriniDinle(); }

    } else { currentUser = null; userProfile = null; }
});

function tabDegistir(t) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    const view = document.getElementById("view-" + t);
    if (view) view.classList.remove("hidden");
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    const navEl = document.getElementById("nav-" + t);
    if (navEl) navEl.classList.add("active");
    window.scrollTo(0, 0);
    const fr = document.getElementById("floatingReklam");
    if (fr) fr.style.visibility = (t === "biz") ? "hidden" : "";
    if (t === "ilan" && !ilanlarDinleBasladi) { ilanlarDinleBasladi = true; ilanlarDinle(); }
    if (t === "koy") { havaDurumuYukle(); namazYukle(); tarimDinle(); asiYukle(); hastalikYukle(); }
    if (t === "settings") anketDinle();
    if (t === "ozel") { koyluListesiYukle(); }
    if (t === "feed") hikayeleriYukle();
}

function akordeonToggle(id) {
    const icerik = document.getElementById("icerik-" + id), ok = document.getElementById("ok-" + id);
    if (!icerik) return;
    const acik = !icerik.classList.contains("hidden");
    icerik.classList.toggle("hidden", acik);
    if (ok) ok.textContent = acik ? "▼" : "▲";
    if (!acik) {
        if (id === "hava") havaDurumuYukle();
        if (id === "namaz") namazYukle();
        if (id === "tarim") tarimDinle();
        if (id === "asi") asiYukle();
        if (id === "hastalik") hastalikYukle();
    }
}

function ayarToggle(id) {
    const icerik = document.getElementById("icerik-" + id), ok = document.getElementById("ok-" + id);
    if (!icerik) return;
    const acik = !icerik.classList.contains("hidden");
    icerik.classList.toggle("hidden", acik);
    if (ok) ok.textContent = acik ? "▼" : "▲";
    if (!acik && id === "kullanici") onlineListesiYukle();
    if (!acik && id === "anketkullanici") anketDinle();
}

function akisDinle() {
    db.collection("announcements").orderBy("time","desc").onSnapshot(snap => {
        const newCount = snap.size;
        if (akisDocCount >= 0 && newCount > akisDocCount) {
            const newest = snap.docs[0]?.data();
            if (newest && newest.senderUid !== currentUser?.uid && document.hidden) telefonBildirimi("📢 " + (newest.sender||"Yeni Duyuru"), newest.title||newest.text||"Yeni paylaşım","duyuru");
        }
        akisDocCount = newCount;
        const list = document.getElementById("postList");
        if (snap.empty) { list.innerHTML = `<div class="empty-state"><div class="empty-icon">📢</div><p>Henüz duyuru yok</p></div>`; return; }
        list.innerHTML = "";
        snap.forEach(doc => {
            const p = doc.data(), pid = doc.id;
            const reactions = p.reactions || {}, myReaction = currentUser ? reactions[currentUser.uid] : null;
            const emojiS = {}; Object.values(reactions).forEach(e => { emojiS[e] = (emojiS[e]||0)+1; });
            const reactionHTML = EMOJIS.map(e => { const c = emojiS[e]||0; return `<span class="reaction-btn ${myReaction===e?"active":""}" onclick="reaksiyon('${pid}','${e}','announcements')">${e}<span class="reaction-count">${c>0?c:""}</span></span>`; }).join("");
            const mediaHTML = p.mediaUrl ? (p.mediaType==="video" ? `<video src="${p.mediaUrl}" controls class="post-media" preload="metadata"></video>` : `<img src="${p.mediaUrl}" class="post-media" onclick="resimTamEkran('${p.mediaUrl}')" loading="lazy">`) : "";
            const rolHTML = p.senderRole && p.senderRole!=="user" ? `<span class="post-role">${p.senderRole==="muhtar"?"Muhtar":p.senderRole==="yardimci"?"Yardımcı":"Admin"}</span>` : "";
            const silBtn = ayricaliklimi() ? `<button class="icon-btn delete-post-btn" onclick="postSil('${pid}')">🗑️</button>` : "";
            const card = document.createElement("div");
            card.className = "post-card"; card.id = "post-" + pid;
            card.innerHTML = `<div class="post-header"><div class="post-avatar">${(p.sender||"?")[0].toUpperCase()}</div><div class="post-meta"><span class="post-sender">${escapeHtml(p.sender||"Anonim")}${rolHTML}</span><span class="post-time">${zamanFarki(p.time)}</span></div>${silBtn}</div>${p.title?`<div class="post-title">${escapeHtml(p.title)}</div>`:""}${p.text?`<div class="post-text">${escapeHtml(p.text)}</div>`:""}${mediaHTML}<div class="post-actions"><div class="reactions-bar">${reactionHTML}</div><div class="post-btns-row"><button class="comment-count-btn" onclick="yorumModalAc('${pid}','announcements')">💬 ${p.commentCount||0} Yorum</button></div></div>`;
            list.appendChild(card);
        });
    }, err => { document.getElementById("postList").innerHTML = `<div class="empty-state"><p>⚠️ Yükleme hatası</p></div>`; });
}

async function akisPaylas() {
    if (!ayricaliklimi()) return alert("Yetkiniz yok!");
    const title = document.getElementById("postTitle").value.trim(), text = document.getElementById("postText").value.trim(), file = document.getElementById("postFile").files[0];
    if (!title && !text && !file) return alert("En az bir şey ekleyin!");
    if (kufurKontrol(title+" "+text)) return alert("⚠️ Uygunsuz içerik!");
    const btn = document.getElementById("postBtn"); btn.disabled = true; btn.textContent = "⏳ Yükleniyor...";
    try {
        let mediaUrl="", mediaType="";
        if (file) { const r = await cloudinaryYukle(file); mediaUrl=r.url; mediaType=r.type; }
        await db.collection("announcements").add({ sender:userProfile.name, senderUid:currentUser.uid, senderRole:userProfile.rol||userProfile.role||"user", title, text, mediaUrl, mediaType, reactions:{}, commentCount:0, time:firebase.firestore.FieldValue.serverTimestamp() });
        document.getElementById("postTitle").value="";
        oneSignalBildirimGonder("📢 " + userProfile.name, title||text||"Yeni duyuru paylaştı", "https://koyemirler-hash.github.io/haber"); document.getElementById("postText").value=""; document.getElementById("postFile").value=""; document.getElementById("postPreview").innerHTML="";
    } catch(e) { alert("⚠️ Paylaşım başarısız: " + e.message); }
    btn.disabled=false; btn.textContent="📢 Paylaş";
}

async function reaksiyon(postId, emoji, collection) {
    if (!currentUser) return alert("Lütfen giriş yapın!");
    playLikeSound();
    const ref = db.collection(collection).doc(postId), snap = await ref.get();
    const reactions = { ...(snap.data().reactions||{}) };
    if (reactions[currentUser.uid] === emoji) delete reactions[currentUser.uid];
    else reactions[currentUser.uid] = emoji;
    await ref.update({ reactions });
}

async function postSil(postId) {
    if (!ayricaliklimi()) return;
    if (!confirm("Bu gönderiyi silmek istiyor musunuz?")) return;
    try { await db.collection("announcements").doc(postId).delete(); } catch(e) { alert("Silme hatası: " + e.message); }
}

function nostaljiDinle() {
    db.collection("nostalgia").where("status","==","published").orderBy("time","desc").onSnapshot(snap => {
        const list = document.getElementById("nostaljiList");
        if (snap.empty) { list.innerHTML = `<div class="empty-state"><div class="empty-icon">📸</div><p>Henüz nostalji anısı yok.</p></div>`; return; }
        list.innerHTML = "";
        snap.forEach(doc => list.appendChild(buildNostaljiCard(doc.id, doc.data(), false)));
    }, err => console.error("Nostalji hatası:", err));
}

function nostaljiOnayBekleyenleriDinle() {
    db.collection("nostalgia").where("status","==","pending").orderBy("time","desc").onSnapshot(snap => {
        const list = document.getElementById("nostaljiPendingList"), badge = document.getElementById("nostalji-badge"), countText = document.getElementById("pendingCountText");
        const count = snap.size;
        if (count > 0) { badge.classList.remove("hidden"); badge.textContent = count; if (countText) countText.textContent = count; }
        else { badge.classList.add("hidden"); if (countText) countText.textContent = "0"; }
        if (!list) return;
        if (snap.empty) { list.innerHTML = `<div style="text-align:center;color:#888;padding:14px;font-size:13px;">✅ Onay bekleyen yok</div>`; return; }
        list.innerHTML = "";
        snap.forEach(doc => list.appendChild(buildNostaljiCard(doc.id, doc.data(), true)));
    });
}

function buildNostaljiCard(pid, p, isPending) {
    const reactions = p.reactions||{}, myReaction = currentUser ? reactions[currentUser.uid] : null;
    const emojiS = {}; Object.values(reactions).forEach(e => { emojiS[e]=(emojiS[e]||0)+1; });
    const reactionHTML = EMOJIS.map(e => { const c=emojiS[e]||0; return `<span class="reaction-btn ${myReaction===e?"active":""}" onclick="reaksiyon('${pid}','${e}','nostalgia')">${e}<span class="reaction-count">${c>0?c:""}</span></span>`; }).join("");
    const mediaHTML = p.mediaUrl ? (p.mediaType==="video" ? `<video src="${p.mediaUrl}" controls class="post-media" preload="metadata"></video>` : `<img src="${p.mediaUrl}" class="post-media nostalji-img" onclick="resimTamEkran('${p.mediaUrl}')" loading="lazy">`) : "";
    const approvalBtns = isPending && ayricaliklimi() ? `<div class="approval-btns"><button class="btn-approve" onclick="nostaljiGonderiOnayla('${pid}')">✅ Onayla</button><button class="btn-reject" onclick="nostaljiGonderiReddet('${pid}')">❌ Reddet</button></div>` : "";
    const silBtn = (ayricaliklimi() && !isPending) ? `<button class="icon-btn delete-post-btn" onclick="nostaljiSil('${pid}')">🗑️</button>` : "";
    const card = document.createElement("div");
    card.className = `post-card nostalji-card ${isPending?"nostalji-pending-card":""}`;
    card.innerHTML = `${isPending?`<div class="pending-label">⏳ Onay Bekliyor · ${escapeHtml(p.sender||"Anonim")}</div>`:""}<div class="post-header"><div class="post-avatar nostalji-avatar">📸</div><div class="post-meta"><span class="post-sender">${escapeHtml(p.sender||"Anonim")}${p.year?`<span class="nostalji-year-badge">📅 ${escapeHtml(p.year)}</span>`:""}</span><span class="post-time">${zamanFarki(p.time)}</span></div>${silBtn}</div>${p.title?`<div class="post-title nostalji-title">${escapeHtml(p.title)}</div>`:""}${p.text?`<div class="post-text">${escapeHtml(p.text)}</div>`:""}${mediaHTML}${!isPending?`<div class="post-actions"><div class="reactions-bar">${reactionHTML}</div><div class="post-btns-row"><button class="comment-count-btn" onclick="yorumModalAc('${pid}','nostalgia')">💬 ${p.commentCount||0} Yorum</button></div></div>`:""}${approvalBtns}`;
    return card;
}

async function nostaljiPaylas() {
    if (!currentUser) return alert("Giriş yapmalısınız!");
    const title=document.getElementById("nostaljiTitle").value.trim(), year=document.getElementById("nostaljiYear").value.trim(), text=document.getElementById("nostaljiText").value.trim(), file=document.getElementById("nostaljiFile").files[0];
    if (!title && !text && !file) return alert("En az bir şey ekleyin!");
    if (kufurKontrol(title+" "+text)) return alert("⚠️ Uygunsuz içerik!");
    const btn=document.getElementById("nostaljiBtn"); btn.disabled=true; btn.textContent="⏳ Yükleniyor...";
    try {
        let mediaUrl="", mediaType="";
        if (file) { const r=await cloudinaryYukle(file); mediaUrl=r.url; mediaType=r.type; }
        const isPrivileged = ayricaliklimi();
        await db.collection("nostalgia").add({ sender:userProfile.name, senderUid:currentUser.uid, senderRole:userProfile.rol||userProfile.role||"user", title, year, text, mediaUrl, mediaType, reactions:{}, commentCount:0, status:isPrivileged?"published":"pending", time:firebase.firestore.FieldValue.serverTimestamp() });
        ["nostaljiTitle","nostaljiYear","nostaljiText"].forEach(id => document.getElementById(id).value="");
        document.getElementById("nostaljiFile").value=""; document.getElementById("nostaljiPreview").innerHTML="";
        if (isPrivileged) { playApproveSound(); alert("✅ Anı yayınlandı!"); }
        else alert("✅ Anınız gönderildi! Onay sonrası yayınlanacak.");
    } catch(e) { alert("⚠️ Gönderilemedi: " + e.message); }
    btn.disabled=false; btn.textContent="📸 Anıyı Gönder";
}
async function nostaljiGonderiOnayla(docId) {
    if (!ayricaliklimi()) return;
    try { await db.collection("nostalgia").doc(docId).update({ status:"published", approvedBy:currentUser.uid, approvedAt:firebase.firestore.FieldValue.serverTimestamp() }); playApproveSound(); alert("✅ Onaylandı!"); }
    catch(e) { alert("Hata: " + e.message); }
}
async function nostaljiGonderiReddet(docId) {
    if (!ayricaliklimi() || !confirm("Reddedilsin mi?")) return;
    try { await db.collection("nostalgia").doc(docId).delete(); } catch(e) { alert("Hata: " + e.message); }
}
async function nostaljiSil(docId) {
    if (!ayricaliklimi() || !confirm("Bu anıyı silmek istiyor musunuz?")) return;
    try { await db.collection("nostalgia").doc(docId).delete(); } catch(e) { alert("Silinemedi!"); }
}

const ILAN_KAT = { satilik:"🏷️ Satılık", kiralik:"🔑 Kiralık", araniyor:"🔍 Aranıyor", kayip:"⚠️ Kayıp", diger:"📌 Diğer" };

function ilanFormToggle() { document.getElementById("ilanFormDiv").classList.toggle("hidden"); }
function ilanFiltre(kat, btn) {
    aktifIlanFiltre = kat;
    document.querySelectorAll(".ilan-filtre-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    ilanlarDinle();
}

function ilanOnayBekleyenleriDinle() {
    db.collection("ilanlar").where("status","==","pending").orderBy("time","desc").onSnapshot(snap => {
        const list = document.getElementById("ilanOnayList"), badge = document.getElementById("ilan-badge"), countEl = document.getElementById("ilanOnayCount");
        const count = snap.size;
        if (count > 0) { badge.classList.remove("hidden"); badge.textContent = count; if (countEl) countEl.textContent = count; }
        else { badge.classList.add("hidden"); if (countEl) countEl.textContent = "0"; }
        if (!list) return;
        list.innerHTML = "";
        snap.forEach(doc => {
            const il = doc.data();
            const div = document.createElement("div");
            div.className = "post-card" ; div.style.margin = "0 12px 10px";
            div.innerHTML = `<div class="post-header"><div class="post-avatar" style="background:linear-gradient(135deg,#ff9800,#e65100);">${(il.sender||"?")[0].toUpperCase()}</div><div class="post-meta"><span class="post-sender">${escapeHtml(il.sender||"Anonim")} <span class="ilan-kat-badge">${ILAN_KAT[il.kategori]||"📌"}</span></span><span class="post-time">${zamanFarki(il.time)}</span></div></div><div class="post-title">${escapeHtml(il.baslik||"")}</div>${il.aciklama?`<div class="post-text">${escapeHtml(il.aciklama)}</div>`:""}<div class="approval-btns"><button class="btn-approve" onclick="ilanOnayla('${doc.id}')">✅ Onayla</button><button class="btn-reject" onclick="ilanReddet('${doc.id}')">❌ Reddet</button></div>`;
            list.appendChild(div);
        });
    });
}

function ilanlarDinle() {
    if (ilanUnsubscribe) ilanUnsubscribe();
    ilanUnsubscribe = db.collection("ilanlar").where("status","==","published").orderBy("time","desc").onSnapshot(snap => {
        const list = document.getElementById("ilanList");
        if (!list) return;
        let docs = [];
        snap.forEach(d => docs.push({ id:d.id, ...d.data() }));
        if (aktifIlanFiltre !== "hepsi") docs = docs.filter(d => d.kategori === aktifIlanFiltre);
        if (docs.length === 0) { list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Bu kategoride ilan yok</p></div>`; return; }
        list.innerHTML = "";
        docs.forEach(il => {
            const silBtn = (ayricaliklimi()||(currentUser&&il.uid===currentUser.uid)) ? `<button class="icon-btn delete-post-btn" onclick="ilanSil('${il.id}')">🗑️</button>` : "";
            const fotograflar = il.fotograflar||(il.fotografUrl?[il.fotografUrl]:[]);
            const fotoHTML = fotograflar.length>0 ? `<div class="ilan-foto-slayt">${fotograflar.map(url=>`<img src="${url}" class="ilan-foto-img" onclick="resimTamEkran('${url}')" loading="lazy">`).join("")}</div>` : "";
            const div = document.createElement("div"); div.className = "post-card";
            div.innerHTML = `<div class="post-header"><div class="post-avatar" style="background:linear-gradient(135deg,#ff9800,#e65100);">${(il.sender||"?")[0].toUpperCase()}</div><div class="post-meta"><span class="post-sender">${escapeHtml(il.sender||"Anonim")} <span class="ilan-kat-badge">${ILAN_KAT[il.kategori]||"📌"}</span></span><span class="post-time">${zamanFarki(il.time)}</span></div>${silBtn}</div>${fotoHTML}<div class="post-title">${escapeHtml(il.baslik||"")}</div>${il.aciklama?`<div class="post-text">${escapeHtml(il.aciklama)}</div>`:""}${il.telefon?`<div style="padding:8px 14px 12px;"><a href="tel:${il.telefon}" class="ilan-tel-btn">📞 ${escapeHtml(il.telefon)}</a></div>`:""}`;
            list.appendChild(div);
        });
    });
}

function ilanFotoOnizle(input) {
    const div = document.getElementById("ilanFotoOnizleDiv"); div.innerHTML = "";
    Array.from(input.files).slice(0,5).forEach(f => { const url = URL.createObjectURL(f); div.innerHTML += `<img src="${url}" class="ilan-onizle-img">`; });
}

async function ilanPaylas() {
    if (!currentUser) return alert("Giriş yapmalısınız!");
    const baslik=document.getElementById("ilanBaslik").value.trim(), aciklama=document.getElementById("ilanAciklama").value.trim(), telefon=document.getElementById("ilanTelefon").value.trim(), kategori=document.getElementById("ilanKategori").value;
    const files = Array.from(document.getElementById("ilanFotolar").files).slice(0,5);
    if (!baslik) return alert("Başlık zorunludur!");
    if (kufurKontrol(baslik+" "+aciklama)) return alert("⚠️ Uygunsuz içerik!");
    const btn=document.getElementById("ilanPaylasBtnMain"); btn.disabled=true; btn.textContent="⏳ Yükleniyor...";
    try {
        const fotograflar = [];
        for (const f of files) { const r = await cloudinaryYukle(f); fotograflar.push(r.url); }
        const isPrivileged = ayricaliklimi();
        await db.collection("ilanlar").add({ baslik, aciklama, telefon, kategori, fotograflar, sender:userProfile.name, uid:currentUser.uid, status:isPrivileged?"published":"pending", time:firebase.firestore.FieldValue.serverTimestamp() });
        ["ilanBaslik","ilanAciklama","ilanTelefon"].forEach(id => document.getElementById(id).value="");
        document.getElementById("ilanFotolar").value=""; document.getElementById("ilanFotoOnizleDiv").innerHTML="";
        document.getElementById("ilanFormDiv").classList.add("hidden");
        alert(isPrivileged ? "✅ İlanınız yayınlandı!" : "✅ İlanınız gönderildi! Admin onayından sonra yayınlanacak.");
    } catch(e) { alert("Hata: " + e.message); }
    btn.disabled=false; btn.textContent="📋 İlanı Gönder";
}

async function ilanOnayla(id) {
    if (!ayricaliklimi()) return;
    try { await db.collection("ilanlar").doc(id).update({ status:"published", approvedBy:currentUser.uid, approvedAt:firebase.firestore.FieldValue.serverTimestamp() }); playApproveSound(); }
    catch(e) { alert("Hata: " + e.message); }
}
async function ilanReddet(id) {
    if (!ayricaliklimi() || !confirm("Reddedilsin mi?")) return;
    try { await db.collection("ilanlar").doc(id).delete(); } catch(e) { alert("Hata!"); }
}
async function ilanSil(id) {
    if (!confirm("İlanı silmek istiyor musunuz?")) return;
    try { await db.collection("ilanlar").doc(id).delete(); } catch(e) { alert("Silinemedi!"); }
}

function yorumModalAc(postId, collection) {
    currentPostId=postId; currentCollection=collection||"announcements";
    document.getElementById("commentsModal").classList.remove("hidden"); document.body.style.overflow="hidden";
    if (commentsUnsubscribe) commentsUnsubscribe();
    commentsUnsubscribe = db.collection(currentCollection).doc(postId).collection("comments").orderBy("time","asc").onSnapshot(snap => {
        const list = document.getElementById("commentsList");
        if (snap.empty) { list.innerHTML = `<p class="no-comments">💬 Henüz yorum yok.</p>`; return; }
        list.innerHTML = "";
        snap.forEach(doc => {
            const c=doc.data(), isMe=currentUser&&c.uid===currentUser.uid, canDelete=ayricaliklimi()||isMe;
            const item=document.createElement("div"); item.className="comment-item";
            item.innerHTML=`<div class="comment-avatar">${(c.sender||"?")[0].toUpperCase()}</div><div class="comment-body"><span class="comment-sender">${escapeHtml(c.sender||"Anonim")}</span><div class="comment-text">${escapeHtml(c.text)}</div><span class="comment-time">${zamanFarki(c.time)}</span></div>${canDelete?`<button class="icon-btn-sm" style="color:#dc3545;" onclick="yorumSil('${postId}','${doc.id}')">🗑️</button>`:""}`;
            list.appendChild(item);
        });
        list.scrollTop = list.scrollHeight;
    });
}
function modalKapat() { document.getElementById("commentsModal").classList.add("hidden"); document.body.style.overflow=""; if (commentsUnsubscribe) { commentsUnsubscribe(); commentsUnsubscribe=null; } currentPostId=null; }
async function yorumGonder() {
    if (!currentPostId||!currentUser) return;
    const text=document.getElementById("commentInput").value.trim();
    if (!text || kufurKontrol(text)) return alert("⚠️ Yorum gönderilemedi!");
    try {
        await db.collection(currentCollection).doc(currentPostId).collection("comments").add({ text, sender:userProfile.name, uid:currentUser.uid, time:firebase.firestore.FieldValue.serverTimestamp() });
        await db.collection(currentCollection).doc(currentPostId).update({ commentCount:firebase.firestore.FieldValue.increment(1) });
        document.getElementById("commentInput").value="";
    } catch(e) { alert("Yorum gönderilemedi!"); }
}
async function yorumSil(postId, commentId) {
    if (!confirm("Yorumu silmek istiyor musunuz?")) return;
    try { await db.collection(currentCollection).doc(postId).collection("comments").doc(commentId).delete(); await db.collection(currentCollection).doc(postId).update({ commentCount:firebase.firestore.FieldValue.increment(-1) }); }
    catch(e) { alert("Silinemedi!"); }
}

function chatMediaSec(input) {
    chatMediaFile=input.files[0]||null;
    const bar=document.getElementById("chatMediaBar"), preview=document.getElementById("chatMediaPreview");
    if (!chatMediaFile) { bar.classList.add("hidden"); preview.innerHTML=""; return; }
    bar.classList.remove("hidden");
    const url=URL.createObjectURL(chatMediaFile);
    preview.innerHTML=chatMediaFile.type.startsWith("video")?`<video src="${url}" style="max-height:70px;border-radius:8px;" controls></video>`:`<img src="${url}" style="max-height:70px;border-radius:8px;">`;
}
function chatMediaTemizle() { chatMediaFile=null; document.getElementById("chatFile").value=""; document.getElementById("chatMediaBar").classList.add("hidden"); document.getElementById("chatMediaPreview").innerHTML=""; }

function mesajlariDinle() {
    db.collection("chat").orderBy("time","asc").limitToLast(60).onSnapshot(snap => {
        const box=document.getElementById("chatBox");
        const atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<60;
        const newCount=snap.size;
        if (chatDocCount>=0 && newCount>chatDocCount) {
            const newest=snap.docs[snap.docs.length-1]?.data();
            if (newest && newest.uid!==currentUser?.uid) {
                playMessageSound();
                if (document.hidden) telefonBildirimi("💬 "+(newest.user||"Biri")+" mesaj gönderdi", newest.text||"📷 Medya","chat");
            }
        }
        chatDocCount=newCount;
        box.innerHTML="";
        if (snap.empty) { box.innerHTML=`<div style="text-align:center;color:#888;padding:20px;font-size:14px;">💬 İlk mesajı siz gönderin!</div>`; return; }
        snap.forEach(doc => {
            const m=doc.data(), isMe=currentUser&&m.uid===currentUser.uid, canDelete=ayricaliklimi()||isMe;
            const mediaHTML=m.mediaUrl?(m.mediaType==="video"?`<video src="${m.mediaUrl}" controls class="chat-media" preload="metadata"></video>`:`<img src="${m.mediaUrl}" class="chat-media" onclick="resimTamEkran('${m.mediaUrl}')" loading="lazy">`):"";
            const wrapper=document.createElement("div"); wrapper.className=`msg-wrapper ${isMe?"me":"them"}`;
            wrapper.innerHTML=`<div class="msg-bubble">${!isMe?`<span class="msg-sender">${escapeHtml(m.user||"Anonim")}</span>`:""} ${m.text?`<span class="msg-text">${escapeHtml(m.text)}</span>`:""}${mediaHTML}<div class="msg-footer"><span class="msg-time">${zamanFarki(m.time)}</span>${canDelete?`<button class="msg-delete-btn" onclick="mesajSil('${doc.id}')">🗑️</button>`:""}</div></div>`;
            box.appendChild(wrapper);
        });
        if (atBottom) box.scrollTop=box.scrollHeight;
    });
}
function enterMesaj(e) { if (e.key==="Enter"&&!e.shiftKey) mesajGonder(); }
async function mesajGonder() {
    const text=document.getElementById("msgInput").value.trim();
    if (!text&&!chatMediaFile) return;
    if (!currentUser) return alert("Giriş yapmalısınız!");
    if (kufurKontrol(text)) return alert("⚠️ Uygunsuz içerik!");
    const btn=document.getElementById("chatSendBtn"); btn.disabled=true;
    try {
        let mediaUrl="", mediaType="";
        if (chatMediaFile) { const r=await cloudinaryYukle(chatMediaFile); mediaUrl=r.url; mediaType=r.type; chatMediaTemizle(); }
        await db.collection("chat").add({ text:text||"", mediaUrl, mediaType, user:userProfile.name, uid:currentUser.uid, time:firebase.firestore.FieldValue.serverTimestamp() });
        document.getElementById("msgInput").value="";
        oneSignalBildirimGonder("💬 " + userProfile.name, text||"📷 Medya paylaştı", "https://koyemirler-hash.github.io/haber");
        const box=document.getElementById("chatBox"); setTimeout(()=>box.scrollTop=box.scrollHeight,300);
    } catch(e) { alert("⚠️ Mesaj gönderilemedi: " + e.message); }
    btn.disabled=false;
}
async function mesajSil(msgId) { if (!confirm("Bu mesajı silmek istiyor musunuz?")) return; try { await db.collection("chat").doc(msgId).delete(); } catch(e) { alert("Silinemedi!"); } }

async function profilGorunurlukYukle() {
    if (!currentUser) return;
    const toggle=document.getElementById("profilGorunurToggle"); if (!toggle) return;
    try {
        const snap=await db.collection("rehber").doc(currentUser.uid).get();
        toggle.checked = snap.exists && snap.data().gorunur !== false;
    } catch(e) {}
}

async function profilGorunurlukDegistir() {
    if (!currentUser) return;
    const gorunur=document.getElementById("profilGorunurToggle").checked;
    try {
        await db.collection("rehber").doc(currentUser.uid).set({
            uid:currentUser.uid, name:userProfile.name,
            gorunur, time:firebase.firestore.FieldValue.serverTimestamp()
        }, { merge:true });
        alert(gorunur ? "✅ Profiliniz listede görünüyor!" : "Profiliniz gizlendi.");
    } catch(e) { alert("Hata: " + e.message); }
}

function koyluListesiYukle() {
    const el=document.getElementById("koyluListesi"); if (!el) return;

    db.collection("users").orderBy("lastSeen","desc").onSnapshot(snap => {
        if (snap.empty) {
            el.innerHTML='<div style="text-align:center;color:#888;padding:24px;font-size:14px;">Henüz kullanıcı yok</div>';
            return;
        }
        el.innerHTML="";
        snap.forEach(doc => {
            const u=doc.data(), uid=doc.id;
            if (uid===currentUser?.uid) return;
            const div=document.createElement("div"); div.className="koylular-satir";
            const telBtn = u.phone
                ? `<a href="tel:${u.phone}" style="background:#e8f5e9;color:#2e7d32;font-size:18px;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none;flex-shrink:0;">📞</a>`
                : "";
            const adSafe = (u.name||"İsimsiz").replace(/'/g,"").replace(/"/g,"");
            const avHtml = u.avatar ? `<div class="koylular-avatar" style="background:none;padding:0;overflow:hidden;"><img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div>` : `<div class="koylular-avatar">${(u.name||"?")[0].toUpperCase()}</div>`;
            const durumHtml = u.durum ? `<div style="font-size:11px;color:#555;margin-top:1px;">${escapeHtml(u.durum)}</div>` : "";
            const bioHtml = u.bio ? `<div style="font-size:11px;color:#999;font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;">${escapeHtml(u.bio)}</div>` : "";
            div.innerHTML=`${avHtml}<div class="koylular-bilgi"><div class="koylular-ad">${escapeHtml(u.name||"İsimsiz")}</div>${durumHtml}${bioHtml}<div class="${u.online?"status-online":"status-offline"}" style="font-size:11px;">${u.online?"🟢 Çevrimiçi":"⚫ Çevrimdışı"}</div></div><div style="display:flex;gap:6px;align-items:center;">${telBtn}<button class="mesaj-btn" onclick="ozelSohbetAc('${uid}','${adSafe}')">✉️</button></div>`;
            el.appendChild(div);
        });
    });
}

let ozelSohbetUnsubscribe = null;
let ozelSohbetMedyaFile = null;

function ozelSohbetAc(kisiUid, kisiAd) {
    ozelSohbetKisiUid=kisiUid;
    document.getElementById("koyluListesi").classList.add("hidden");
    document.getElementById("ozelSohbet").classList.remove("hidden");
    document.getElementById("ozelSohbetBaslik").textContent = kisiAd;
    if (ozelSohbetUnsubscribe) ozelSohbetUnsubscribe();

    const konusmaId=[currentUser.uid, kisiUid].sort().join("_");
    const on10GunOnce = new Date(Date.now() - 10*24*60*60*1000);

    ozelSohbetUnsubscribe = db.collection("ozelMesajlar")
        .doc(konusmaId)
        .collection("mesajlar")
        .orderBy("time","asc")
        .onSnapshot(snap => {
            const box=document.getElementById("ozelMesajBox");
            const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
            box.innerHTML="";
            let eskiMesajlar=[];

            const prevCount = snap.metadata.fromCache ? -1 : 0;
        snap.docChanges().forEach(change => {
            if (change.type === "added") {
                const m = change.doc.data();
                if (m.gonderen !== currentUser?.uid && !snap.metadata.hasPendingWrites) {
                    playMessageSound();
                    if (document.hidden) {
                        telefonBildirimi("✉️ " + (m.gonderenAd||"Biri"), m.metin||"📷 Medya", "ozel");
                    }
                }
            }
        });

        snap.forEach(doc => {
                const m=doc.data();

                if (m.time && m.time.toDate && m.time.toDate() < on10GunOnce) {
                    eskiMesajlar.push(doc.id); return;
                }
                const isMe=m.gonderen===currentUser.uid;
                const mediaHTML = m.mediaUrl ? (m.mediaType==="video"
                    ? `<video src="${m.mediaUrl}" controls class="chat-media" preload="metadata"></video>`
                    : `<img src="${m.mediaUrl}" class="chat-media" onclick="resimTamEkran('${m.mediaUrl}')" loading="lazy">`) : "";
                const wrapper=document.createElement("div");
                wrapper.className=`msg-wrapper ${isMe?"me":"them"}`;
                wrapper.innerHTML=`<div class="msg-bubble">
                    ${!isMe?`<span class="msg-sender">${escapeHtml(m.gonderenAd||"")}</span>`:""}
                    ${m.metin?`<span class="msg-text">${escapeHtml(m.metin)}</span>`:""}
                    ${mediaHTML}
                    <div class="msg-footer"><span class="msg-time">${zamanFarki(m.time)}</span></div>
                </div>`;
                box.appendChild(wrapper);
            });

            if (atBottom) box.scrollTop=box.scrollHeight;

            if (eskiMesajlar.length>0) {
                eskiMesajlar.forEach(id => {
                    db.collection("ozelMesajlar").doc(konusmaId).collection("mesajlar").doc(id).delete().catch(()=>{});
                });
            }
        }, err => {
            console.error("Özel mesaj hatası:", err.message);
            const box=document.getElementById("ozelMesajBox");
            box.innerHTML=`<div style="text-align:center;color:#888;padding:20px;">⚠️ Mesajlar yüklenemedi<br><small>${err.message}</small></div>`;
        });
}

function ozelSohbetKapat() {
    ozelSohbetKisiUid=null;
    document.getElementById("koyluListesi").classList.remove("hidden");
    document.getElementById("ozelSohbet").classList.add("hidden");
    if (ozelSohbetUnsubscribe) { ozelSohbetUnsubscribe(); ozelSohbetUnsubscribe=null; }
}

async function ozelMesajGonder() {
    if (!ozelSohbetKisiUid||!currentUser) return;
    const input=document.getElementById("ozelMsgInput");
    const metin=input.value.trim();
    if (!metin && !ozelSohbetMedyaFile) return;
    if (metin && kufurKontrol(metin)) return alert("⚠️ Uygunsuz içerik!");

    const konusmaId=[currentUser.uid,ozelSohbetKisiUid].sort().join("_");
    const btn=document.getElementById("ozelSendBtn"); if(btn) btn.disabled=true;

    try {
        let mediaUrl="", mediaType="";
        if (ozelSohbetMedyaFile) {
            const r=await cloudinaryYukle(ozelSohbetMedyaFile);
            mediaUrl=r.url; mediaType=r.type;
            ozelSohbetMedyaFile=null;
            const prev=document.getElementById("ozelMedyaOnizle");
            if(prev){prev.innerHTML=""; prev.classList.add("hidden");}
        }
        await db.collection("ozelMesajlar").doc(konusmaId).collection("mesajlar").add({
            metin:metin||"", mediaUrl, mediaType,
            gonderen:currentUser.uid, gonderenAd:userProfile.name,
            alici:ozelSohbetKisiUid,
            time:firebase.firestore.FieldValue.serverTimestamp()
        });
        input.value="";
        playMessageSound();

        try {
            await fetch("https://onesignal.com/api/v1/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Basic " + ONESIGNAL_API_KEY },
                body: JSON.stringify({
                    app_id: ONESIGNAL_APP_ID,
                    filters: [{ field:"external_id", relation:"=", value: ozelSohbetKisiUid }],
                    headings: { tr: "✉️ " + userProfile.name, en: "✉️ " + userProfile.name },
                    contents: { tr: metin||"📷 Medya gönderdi", en: metin||"📷 Medya gönderdi" },
                    url: "https://koyemirler-hash.github.io/haber",
                    chrome_web_icon: "https://koyemirler-hash.github.io/haber/ikon_192.png"
                })
            });
        } catch(e) {}
    } catch(e) {
        alert("Mesaj gönderilemedi: " + e.message);
    }
    if(btn) btn.disabled=false;
}

function ozelMedyaSec(input) {
    ozelSohbetMedyaFile = input.files[0] || null;
    const prev=document.getElementById("ozelMedyaOnizle");
    if (!prev) return;
    if (!ozelSohbetMedyaFile) { prev.innerHTML=""; prev.classList.add("hidden"); return; }
    prev.classList.remove("hidden");
    const url=URL.createObjectURL(ozelSohbetMedyaFile);
    prev.innerHTML=ozelSohbetMedyaFile.type.startsWith("video")
        ? `<video src="${url}" style="max-height:60px;border-radius:8px;" controls></video><button onclick="ozelMedyaTemizle()" class="media-clear-btn" style="margin-left:8px;">✕</button>`
        : `<img src="${url}" style="max-height:60px;border-radius:8px;"><button onclick="ozelMedyaTemizle()" class="media-clear-btn" style="margin-left:8px;">✕</button>`;
}
function ozelMedyaTemizle() {
    ozelSohbetMedyaFile=null;
    const prev=document.getElementById("ozelMedyaOnizle");
    if(prev){prev.innerHTML=""; prev.classList.add("hidden");}
    const fi=document.getElementById("ozelMedyaInput");
    if(fi) fi.value="";
}

function karistir(dizi) { const arr=[...dizi]; for(let i=arr.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }

function isletmeleriYukle() {
    db.collection("businesses").onSnapshot(snap => {
        const container=document.getElementById("bizList"), empty=document.getElementById("bizEmpty");
        container.innerHTML="";
        if (snap.empty) { empty.classList.remove("hidden"); return; }
        empty.classList.add("hidden");
        let items=[]; snap.forEach(doc=>items.push({id:doc.id,...doc.data()})); items=karistir(items);
        items.forEach(b => {
            const iletisim=[];
            if (b.phone) iletisim.push(`<a href="tel:${b.phone}" class="biz-iletisim-btn biz-btn-tel" title="Ara">📞</a>`);
            if (b.whatsapp) iletisim.push(`<a href="https://wa.me/${b.whatsapp.replace(/[^0-9]/g,'')}" target="_blank" class="biz-iletisim-btn biz-btn-wp" title="WhatsApp">💬</a>`);
            if (b.email) iletisim.push(`<a href="mailto:${b.email}" class="biz-iletisim-btn biz-btn-mail" title="E-posta">✉️</a>`);
            if (b.url) iletisim.push(`<a href="${b.url}" target="_blank" class="biz-iletisim-btn biz-btn-url" title="Web Sitesi">🌐</a>`);
            const card=document.createElement("div"); card.className="biz-card";
            card.innerHTML=`${b.imageUrl?`<img src="${b.imageUrl}" class="biz-img" loading="lazy" alt="${escapeHtml(b.name)}">`:`<div class="biz-img-placeholder">🏢</div>`}<div class="biz-body"><div class="biz-cat">${escapeHtml(b.category||"İşletme")}</div><h3 class="biz-name">${escapeHtml(b.name)}</h3>${b.description?`<p class="biz-desc">${escapeHtml(b.description)}</p>`:""}${b.address?`<p class="biz-addr">📍 ${escapeHtml(b.address)}</p>`:""} ${iletisim.length>0?`<div class="biz-iletisim-bar">${iletisim.join("")}</div>`:""} ${adminMi()?`<div class="biz-admin-btns"><button class="btn btn-danger btn-sm" onclick="firmaSil('${b.id}')">🗑️ Sil</button></div>`:""}</div>`;
            container.appendChild(card);
        });
    });
}

async function firmaEkle() {
    if (!adminMi()) return alert("Yetkiniz yok!");
    const name=document.getElementById("bizName").value.trim(); if (!name) return alert("Firma adı zorunludur!");
    const btn=document.getElementById("bizAddBtn"); btn.disabled=true; btn.textContent="⏳ Ekleniyor...";
    try {
        let imageUrl=""; const file=document.getElementById("bizFile").files[0];
        if (file) { const r=await cloudinaryYukle(file); imageUrl=r.url; }
        await db.collection("businesses").add({ name, category:document.getElementById("bizCat").value.trim(), phone:document.getElementById("bizPhone").value.trim(), whatsapp:document.getElementById("bizWhatsapp").value.trim(), email:document.getElementById("bizEmail").value.trim(), url:document.getElementById("bizUrl").value.trim(), address:document.getElementById("bizAddr").value.trim(), description:document.getElementById("bizDesc").value.trim(), imageUrl, time:firebase.firestore.FieldValue.serverTimestamp() });
        ["bizName","bizCat","bizPhone","bizWhatsapp","bizEmail","bizUrl","bizAddr","bizDesc"].forEach(id=>document.getElementById(id).value="");
        document.getElementById("bizFile").value=""; document.getElementById("bizPreview").innerHTML="";
        alert("✅ Firma eklendi!");
    } catch(e) { alert("⚠️ Hata: " + e.message); }
    btn.disabled=false; btn.textContent="🏢 Firma Ekle";
}
async function firmaSil(id) { if (!adminMi()||!confirm("Bu firmayı silmek istiyor musunuz?")) return; try { await db.collection("businesses").doc(id).delete(); } catch(e) { alert("Silinemedi!"); } }

function onlineListesiYukle() {
    db.collection("users").orderBy("lastSeen","desc").onSnapshot(snap => {
        const list=document.getElementById("userList"); if (!list) return;
        if (snap.empty) { list.innerHTML="<p style='color:#999;font-size:14px;'>Kullanıcı yok</p>"; return; }
        list.innerHTML="";
        snap.forEach(doc => {
            const u=doc.data(), uid=doc.id;
            const r=u.rol||u.role||"";
            let rolBadge="";
            if (r==="admin") rolBadge=`<span class="role-badge">Admin</span>`;
            else if (r==="muhtar") rolBadge=`<span class="role-badge muhtar">Muhtar</span>`;
            else if (r==="yardimci") rolBadge=`<span class="role-badge yardimci">Yardımcı</span>`;
            let adminBtns="";
            if (adminMi() && uid!==currentUser?.uid) {
                adminBtns=`<div class="user-admin-btns"><button onclick="kullaniciBlokkla('${uid}',${!u.blocked})" class="icon-btn-sm" title="${u.blocked?"Engeli Kaldır":"Engelle"}">${u.blocked?"🔓":"🚫"}</button><button onclick="kullaniciSil('${uid}')" class="icon-btn-sm" title="Sil" style="color:#dc3545;">🗑️</button></div>`;
            }
            const item=document.createElement("div"); item.className=`user-item ${u.blocked?"user-blocked":""}`;
            item.innerHTML=`<div class="user-avatar">${(u.name||"?")[0].toUpperCase()}</div><div class="user-info"><span class="user-name">${escapeHtml(u.name||"İsimsiz")}${rolBadge}</span><span class="user-status ${u.online?"status-online":"status-offline"}">${u.online?"🟢 Çevrimiçi":"⚫ Çevrimdışı"}${u.blocked?" · 🚫 Engellenmiş":""}</span>${u.phone?`<span style="font-size:11px;color:#888;">📞 ${escapeHtml(u.phone)}</span>`:""}</div>${adminBtns}`;
            list.appendChild(item);
        });
    });
}

async function kullaniciBlokkla(uid, shouldBlock) {
    if (!adminMi()) return;
    try { await db.collection("users").doc(uid).update({ blocked:shouldBlock }); alert(shouldBlock?"🚫 Engellendi!":"✅ Engel kaldırıldı!"); }
    catch(e) { alert("İşlem başarısız: " + e.message); }
}
async function kullaniciSil(uid) {
    if (!adminMi()||!confirm("Bu kullanıcıyı silmek istiyor musunuz?")) return;
    try { await db.collection("users").doc(uid).delete(); alert("✅ Silindi."); }
    catch(e) { alert("Silinemedi: " + e.message); }
}
async function yetkiVer() {
    if (!adminMi()) return alert("Yetkiniz yok!");
    const email=document.getElementById("targetEmail").value.trim(), role=document.getElementById("targetRole").value;
    if (!email) return alert("E-posta girin!");
    try {
        const snap=await db.collection("users").where("email","==",email).get();
        if (snap.empty) return alert("Kullanıcı bulunamadı!");
        const proms=[]; snap.forEach(doc=>proms.push(db.collection("users").doc(doc.id).update({ rol:role })));
        await Promise.all(proms);
        document.getElementById("targetEmail").value="";
        alert(`✅ "${role}" yetkisi verildi!`);
    } catch(e) { alert("Hata: " + e.message); }
}

async function gorusBildir() {
    const text=document.getElementById("feedbackText").value.trim(); if (!text) return alert("Lütfen bir şeyler yazın!");
    try { await db.collection("questions").add({ text, sender:userProfile?userProfile.name:"Anonim", uid:currentUser?currentUser.uid:null, time:firebase.firestore.FieldValue.serverTimestamp() }); document.getElementById("feedbackText").value=""; alert("✅ Görüşünüz iletildi! Teşekkürler 🙏"); }
    catch(e) { alert("Gönderilemedi: " + e.message); }
}

async function hakkimizdaYukle() {
    const el=document.getElementById("hakkimizdaIcerik"); if (!el) return;
    try {
        const snap=await db.collection("settings").doc("hakkimizda").get();
        if (snap.exists) {
            const d=snap.data();
            el.innerHTML=`${d.metin?`<p class="about-text">${escapeHtml(d.metin)}</p>`:""}${d.konum?`<p class="about-text">📍 ${escapeHtml(d.konum)}</p>`:""}${d.telefon?`<p class="about-text"><a href="tel:${d.telefon}" style="color:var(--green-dark);">📞 ${escapeHtml(d.telefon)}</a></p>`:""}${d.url?`<p class="about-text"><a href="${d.url}" target="_blank" style="color:var(--green-dark);">🌐 ${escapeHtml(d.url)}</a></p>`:""}`;

            if (adminMi()) {
                const mi=document.getElementById("hakkimizdaMetin"); if (mi) mi.value=d.metin||"";
                const ki=document.getElementById("hakkimizdaKonum"); if (ki) ki.value=d.konum||"";
                const ui=document.getElementById("hakkimizdaUrl"); if (ui) ui.value=d.url||"";
                const ti=document.getElementById("hakkimizdaTelefon"); if (ti) ti.value=d.telefon||"";
            }
        } else {
            el.innerHTML=`
                <p class="about-text" style="font-size:15px;font-weight:700;color:#2d6a4f;">🏡 Emirler Köyü Portalı</p>
                <p class="about-text">Emirler Köyü Portalı; köy sakinlerini tek bir çatı altında buluşturmak, duyuruları anında iletmek ve komşuluk ruhunu dijital dünyaya taşımak amacıyla kurulmuştur.</p>
                <p class="about-text">📢 <b>Köy Meydanı</b> ile muhtar ve yetkililerin duyuruları anında herkesin ekranına ulaşır. Artık "duymadım" diye bir şey kalmaz.</p>
                <p class="about-text">📸 <b>Nostalji</b> bölümünde eski fotoğraflar, anılar ve köyün geçmişi bir araya gelir. Bugünleri yarına taşırken dünleri de unutmuyoruz.</p>
                <p class="about-text">📋 <b>İlan Tahtası</b> ile satılık, kiralık, kayıp ve aranan ilanlarınızı köy içinde kolayca paylaşabilirsiniz.</p>
                <p class="about-text">💬 <b>Köy Sohbeti</b> ve özel mesajlaşma ile komşunuza ulaşmak artık çok daha kolay. Telefon defterinden isim arayıp durmak yok.</p>
                <p class="about-text">🌾 <b>Köy Bilgileri</b> bölümünde hava durumu, namaz vakitleri, tarım takvimi ve hayvan sağlığı rehberi hep güncel şekilde sizinle.</p>
                <p class="about-text">🗳️ <b>Köy Anketi</b> ile köy meselelerinde herkesin sesi var. Karar vermeden önce komşuya sor!</p>
                <p class="about-text" style="margin-top:16px;padding-top:12px;border-top:1px solid #eee;font-size:12px;color:#999;">📍 Emirler Köyü, Türkiye<br>✉️ \x6b\x6f\x79\x65\x6d\x69\x72\x6c\x65\x72\x40\x67\x6d\x61\x69\x6c\x2e\x63\x6f\x6d<br><br>Sürüm 4.0 · Bu uygulama köylüler için, köylüler tarafından yapılmıştır. 💚</p>`;
        }
    } catch(e) { el.innerHTML=`<p class="about-text">Emirler Köyü Portalı</p>`; }
}

async function hakkimizdaKaydet() {
    if (!adminMi()) return alert("Yetkiniz yok!");
    const metin=document.getElementById("hakkimizdaMetin").value.trim();
    const konum=document.getElementById("hakkimizdaKonum").value.trim();
    const url=document.getElementById("hakkimizdaUrl").value.trim();
    const telefon=document.getElementById("hakkimizdaTelefon").value.trim();
    try { await db.collection("settings").doc("hakkimizda").set({ metin,konum,url,telefon }); hakkimizdaYukle(); alert("✅ Kaydedildi!"); }
    catch(e) { alert("Hata: " + e.message); }
}

async function numaramiYukle() {
    if (!currentUser) return;
    const div=document.getElementById("benimNumaramDiv"); if (!div) return;
    try {
        const snap=await db.collection("rehber").doc(currentUser.uid).get();
        if (snap.exists) { const d=snap.data(); div.innerHTML=`<div class="mevcut-numara">✅ Kayıtlı: <b>${escapeHtml(d.tel||"")}</b></div>`; document.getElementById("numaraInput").value=d.tel||""; document.getElementById("numaraNotInput").value=d.not||""; }
        else div.innerHTML="";
    } catch(e) {}
}
async function numaramiPaylas() {
    if (!currentUser) return alert("Giriş yapmalısınız!");
    const tel=document.getElementById("numaraInput").value.trim(), not=document.getElementById("numaraNotInput").value.trim();
    if (!tel) return alert("Telefon numarası zorunludur!");
    try { await db.collection("rehber").doc(currentUser.uid).set({ ad:userProfile.name, tel, not, uid:currentUser.uid, gorunur:true, time:firebase.firestore.FieldValue.serverTimestamp() }); numaramiYukle(); alert("✅ Numaranız kaydedildi!"); }
    catch(e) { alert("Hata: " + e.message); }
}

async function resetTalepYukle() {
    if (!currentUser) return;
    const div=document.getElementById("resetTalepDurumu"); if (!div) return;
    try {
        const snap=await db.collection("resetTalepleri").where("uid","==",currentUser.uid).where("durum","==","bekliyor").get();
        div.innerHTML=snap.empty?"":"<div class='reset-bekliyor'>⏳ Sıfırlama talebiniz admin onayı bekliyor...</div>";
    } catch(e) {}
}
async function resetTalepGonder() {
    if (!currentUser) return alert("Giriş yapmalısınız!");
    try {
        const mevcut=await db.collection("resetTalepleri").where("uid","==",currentUser.uid).where("durum","==","bekliyor").get();
        if (!mevcut.empty) { alert("⏳ Zaten bekleyen bir talebiniz var."); return; }
        if (!confirm("E-posta sıfırlama talebi göndermek istiyor musunuz?")) return;
        await db.collection("resetTalepleri").add({ uid:currentUser.uid, name:userProfile.name, email:currentUser.email, phone:userProfile.phone||"", durum:"bekliyor", time:firebase.firestore.FieldValue.serverTimestamp() });
        resetTalepYukle(); alert("✅ Talebiniz gönderildi!");
        telefonBildirimi("🔄 E-posta Sıfırlama Talebi",`${userProfile.name} sıfırlama talep etti`,"reset");
    } catch(e) { alert("Hata: " + e.message); }
}
function resetTalepleriniDinle() {
    db.collection("resetTalepleri").where("durum","==","bekliyor").orderBy("time","asc").onSnapshot(snap => {
        const div=document.getElementById("resetTalepListesi"); if (!div) return;
        if (snap.empty) { div.innerHTML=`<div style="color:#888;font-size:13px;">Bekleyen talep yok ✓</div>`; return; }
        div.innerHTML="";
        snap.forEach(doc => {
            const t=doc.data(); const item=document.createElement("div"); item.className="reset-talep-item";
            item.innerHTML=`<div class="reset-talep-bilgi"><div class="reset-talep-ad">${escapeHtml(t.name)}</div><div class="reset-talep-detay">📧 ${escapeHtml(t.email)} · 📞 ${escapeHtml(t.phone||"—")}</div><div class="reset-talep-zaman">${zamanFarki(t.time)}</div></div><div class="reset-talep-btns"><button class="btn-approve" onclick="resetOnayla('${doc.id}','${t.uid}')">✅ Onayla</button><button class="btn-reject" onclick="resetReddet('${doc.id}')">❌ Reddet</button></div>`;
            div.appendChild(item);
        });
    });
}
async function resetOnayla(talepId, kullaniciUid) {
    if (!adminMi()||!confirm("Hesabı sıfırlamak istiyor musunuz?")) return;
    try {
        await db.collection("users").doc(kullaniciUid).delete();
        await db.collection("resetTalepleri").doc(talepId).update({ durum:"onaylandi", onayZaman:firebase.firestore.FieldValue.serverTimestamp() });
        playApproveSound(); alert("✅ Hesap sıfırlandı!\n\nNot: Firebase Console → Authentication → Users'tan eski kaydı da silin.");
    } catch(e) { alert("Hata: " + e.message); }
}
async function resetReddet(talepId) {
    if (!adminMi()) return;
    try { await db.collection("resetTalepleri").doc(talepId).update({ durum:"reddedildi" }); }
    catch(e) { alert("Hata: " + e.message); }
}

async function reklamYukle() {
    try {
        const snap=await db.collection("settings").doc("reklam").get(); if (!snap.exists) return;
        const r=snap.data(); if (!r.aktif) return;
        const alan=document.getElementById("reklamAlani"); if (!alan) return;
        alan.classList.remove("hidden");
        const metin=document.getElementById("reklamMetin"), gorsel=document.getElementById("reklamGorsel"), link=document.getElementById("reklamLink");
        if (r.metin) metin.textContent=r.metin;
        if (r.gorselUrl) { gorsel.src=r.gorselUrl; gorsel.classList.remove("hidden"); }
        if (r.link) link.href=r.link; else link.style.pointerEvents="none";
        const cb=document.getElementById("reklamAktif"); if (cb) cb.checked=r.aktif;
        const mi=document.getElementById("reklamMetinInput"); if (mi&&r.metin) mi.value=r.metin;
        const li=document.getElementById("reklamLinkInput"); if (li&&r.link) li.value=r.link;
    } catch(e) { console.warn("Reklam:", e); }
}
async function reklamToggle() {
    if (!ayricaliklimi()) return;
    const aktif=document.getElementById("reklamAktif").checked;
    try { await db.collection("settings").doc("reklam").set({ aktif },{ merge:true }); const alan=document.getElementById("reklamAlani"); if (alan) alan.classList.toggle("hidden",!aktif); }
    catch(e) { alert("Hata: " + e.message); }
}
async function reklamKaydet() {
    if (!ayricaliklimi()) return alert("Yetkiniz yok!");
    const metin=document.getElementById("reklamMetinInput").value.trim(), link=document.getElementById("reklamLinkInput").value.trim(), aktif=document.getElementById("reklamAktif").checked, file=document.getElementById("reklamFile").files[0];
    const btn=document.getElementById("reklamKaydetBtn"); btn.disabled=true; btn.textContent="⏳";
    try {
        let gorselUrl=""; if (file) { const r=await cloudinaryYukle(file); gorselUrl=r.url; }
        const veri={aktif,metin,link}; if (gorselUrl) veri.gorselUrl=gorselUrl;
        await db.collection("settings").doc("reklam").set(veri,{ merge:true });
        document.getElementById("reklamFile").value=""; document.getElementById("reklamPreview").innerHTML="";
        reklamYukle(); alert("✅ Reklam kaydedildi!");
    } catch(e) { alert("⚠️ Firebase kurallarını güncelleyin!\n" + e.message); }
    btn.disabled=false; btn.textContent="💾 Kaydet";
}

async function floatReklamYukle() {
    try {
        const snap=await db.collection("settings").doc("floatReklam").get(); if (!snap.exists) return;
        const r=snap.data(); if (!r.aktif) return;
        const alan=document.getElementById("floatingReklam"); if (!alan||floatReklamKapatildi) return;
        alan.classList.remove("hidden");
        const metin=document.getElementById("floatingReklamMetin"), gorsel=document.getElementById("floatingReklamGorsel"), link=document.getElementById("floatingReklamLink");
        if (r.metin) metin.textContent=r.metin;
        if (r.gorselUrl) { gorsel.src=r.gorselUrl; gorsel.classList.remove("hidden"); }
        if (r.link) link.href=r.link; else link.style.pointerEvents="none";
        const cb=document.getElementById("floatReklamAktif"); if (cb) cb.checked=r.aktif;
        const mi=document.getElementById("floatReklamMetinInput"); if (mi&&r.metin) mi.value=r.metin;
        const li=document.getElementById("floatReklamLinkInput"); if (li&&r.link) li.value=r.link;
    } catch(e) {}
}
function floatingReklamKapat() { floatReklamKapatildi=true; const alan=document.getElementById("floatingReklam"); if (alan) alan.classList.add("hidden"); }
async function floatReklamToggle() {
    if (!ayricaliklimi()) return;
    const aktif=document.getElementById("floatReklamAktif").checked;
    try { await db.collection("settings").doc("floatReklam").set({ aktif },{ merge:true }); const alan=document.getElementById("floatingReklam"); if (alan) alan.classList.toggle("hidden",!aktif); }
    catch(e) { alert("Hata: " + e.message); }
}
async function floatReklamKaydet() {
    if (!ayricaliklimi()) return alert("Yetkiniz yok!");
    const metin=document.getElementById("floatReklamMetinInput").value.trim(), link=document.getElementById("floatReklamLinkInput").value.trim(), aktif=document.getElementById("floatReklamAktif").checked, file=document.getElementById("floatReklamFile").files[0];
    const btn=document.getElementById("floatReklamKaydetBtn"); btn.disabled=true; btn.textContent="⏳";
    try {
        let gorselUrl=""; if (file) { const r=await cloudinaryYukle(file); gorselUrl=r.url; }
        const veri={aktif,metin,link}; if (gorselUrl) veri.gorselUrl=gorselUrl;
        await db.collection("settings").doc("floatReklam").set(veri,{ merge:true });
        document.getElementById("floatReklamFile").value=""; document.getElementById("floatReklamPreview").innerHTML="";
        floatReklamYukle(); alert("✅ Köşe reklam kaydedildi!");
    } catch(e) { alert("⚠️ " + e.message); }
    btn.disabled=false; btn.textContent="💾 Kaydet";
}

const HAVA_KODLAR = {0:"☀️ Açık",1:"🌤️ Az Bulutlu",2:"⛅ Parçalı",3:"☁️ Kapalı",45:"🌫️ Sis",51:"🌦️ Çisenti",61:"🌧️ Yağmurlu",63:"🌧️ Yağmurlu",71:"🌨️ Karlı",73:"❄️ Karlı",80:"🌦️ Sağanak",81:"⛈️ Fırtına",95:"⛈️ Fırtına"};
const GUNLER=["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];
const AYLAR=["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

async function havaDurumuYukle() {
    const w=document.getElementById("havaWidget"); if (!w||havaYuklendi) return;
    w.innerHTML=`<div class="loading-spinner">⏳ Yükleniyor...</div>`;
    try {
        const url=`https://api.open-meteo.com/v1/forecast?latitude=${KOY_LAT}&longitude=${KOY_LNG}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FIstanbul&forecast_days=7`;
        const res=await fetch(url); if (!res.ok) throw new Error("API hatası "+res.status);
        const d=await res.json(); const cur=d.current, daily=d.daily;
        const durum=HAVA_KODLAR[cur.weathercode]||"🌡️";
        let gunlerHTML="";
        for (let i=0;i<7;i++) { const t=new Date(daily.time[i]), g=i===0?"Bug.":GUNLER[t.getDay()], ikon=(HAVA_KODLAR[daily.weathercode[i]]||"🌡️").split(" ")[0]; gunlerHTML+=`<div class="hava-gun-kart"><div class="hava-gun-ad">${g}</div><div class="hava-gun-ikon">${ikon}</div><div class="hava-gun-sicak">${Math.round(daily.temperature_2m_max[i])}°</div><div style="font-size:11px;color:#aaa;">${Math.round(daily.temperature_2m_min[i])}°</div></div>`; }
        w.innerHTML=`<div class="hava-kart"><div class="hava-sehir">📍 Emirler Köyü</div><div class="hava-sicaklik">${Math.round(cur.temperature_2m)}°C</div><div class="hava-durum">${durum}</div><div class="hava-detay"><div class="hava-detay-item">💧 Nem: %${cur.relative_humidity_2m}</div><div class="hava-detay-item">💨 Rüzgar: ${Math.round(cur.wind_speed_10m)} km/h</div></div></div><div class="hava-gunler">${gunlerHTML}</div>`;
        havaYuklendi=true;
    } catch(e) { w.innerHTML=`<div style="text-align:center;padding:20px;color:#888;">⚠️ Hava bilgisi alınamadı<br><small>İnternet bağlantınızı kontrol edin</small></div>`; havaYuklendi=false; }
}

async function namazYukle() {
    const w=document.getElementById("namazWidget"); if (!w||namazYuklendi) return;
    w.innerHTML=`<div class="loading-spinner">⏳ Yükleniyor...</div>`;
    try {
        const b=new Date();
        const res=await fetch(`https://api.aladhan.com/v1/timings/${b.getDate()}-${b.getMonth()+1}-${b.getFullYear()}?latitude=${KOY_LAT}&longitude=${KOY_LNG}&method=13`);
        const d=await res.json(); const v=d.data.timings, fmt=s=>s.split(" ")[0];
        const satir=(ikon,ad,saat)=>`<div class="namaz-satir"><span class="namaz-ikon">${ikon}</span><span class="namaz-ad">${ad}</span><span class="namaz-saat">${fmt(saat)}</span></div>`;
        w.innerHTML=`<div class="namaz-tarih">📅 ${d.data.date.readable}</div>${satir("🌅","İmsak",v.Fajr)}${satir("☀️","Güneş",v.Sunrise)}${satir("🌞","Öğle",v.Dhuhr)}${satir("🌇","İkindi",v.Asr)}${satir("🌆","Akşam",v.Maghrib)}${satir("🌙","Yatsı",v.Isha)}`;
        namazYuklendi=true;
    } catch(e) { w.innerHTML=`<div style="text-align:center;padding:16px;color:#888;">⚠️ Vakit bilgisi alınamadı</div>`; }
}

const TARIM_VARSAYILAN=[{ay:"Ocak",is:"❄️ Budama dönemi"},{ay:"Şubat",is:"🌱 Tohum hazırlığı, gübre"},{ay:"Mart",is:"🌾 Buğday ekimi, fide dikimi"},{ay:"Nisan",is:"🌸 Bahar bakımı, sulama"},{ay:"Mayıs",is:"🌿 Çapalama, ilaçlama"},{ay:"Haziran",is:"☀️ Biçerdöver hazırlığı"},{ay:"Temmuz",is:"🌾 Buğday hasadı, saman"},{ay:"Ağustos",is:"🍎 Meyve hasadı, kış ekimi"},{ay:"Eylül",is:"🍂 Üzüm hasadı, soğan ekimi"},{ay:"Ekim",is:"🌱 Sonbahar ekimleri"},{ay:"Kasım",is:"🍂 Ağaç bakımı, depolama"},{ay:"Aralık",is:"❄️ Kış dinlendirme, planlama"}];

async function tarimDinle() {
    const w=document.getElementById("tarimWidget"); if (!w) return;
    try {
        const snap=await db.collection("settings").doc("tarim").get();
        const liste=(snap.exists&&snap.data().liste?.length>0)?snap.data().liste:TARIM_VARSAYILAN;
        const buAy=AYLAR[new Date().getMonth()];
        w.innerHTML=liste.map((t,i)=>`<div class="tarim-satir ${t.ay===buAy?"tarim-bu-ay":""}"><span class="tarim-ay">${t.ay}</span><span class="tarim-is">${t.is}</span>${ayricaliklimi()?`<button class="ilan-sil-btn" onclick="tarimSil(${i})">🗑️</button>`:""}</div>`).join("");
    } catch(e) { const w2=document.getElementById("tarimWidget"); if (w2) w2.innerHTML=TARIM_VARSAYILAN.map(t=>`<div class="tarim-satir"><span class="tarim-ay">${t.ay}</span><span class="tarim-is">${t.is}</span></div>`).join(""); }
}
async function tarimEkle() {
    if (!ayricaliklimi()) return alert("Yetkiniz yok!");
    const ay=document.getElementById("tarimAy").value.trim(), is=document.getElementById("tarimIs").value.trim();
    if (!ay||!is) return alert("Ay ve iş zorunludur!");
    try {
        const snap=await db.collection("settings").doc("tarim").get();
        const liste=(snap.exists&&snap.data().liste)?[...snap.data().liste]:[...TARIM_VARSAYILAN];
        liste.push({ay,is});
        await db.collection("settings").doc("tarim").set({liste},{merge:true});
        document.getElementById("tarimAy").value=""; document.getElementById("tarimIs").value="";
        tarimDinle(); alert("✅ Takvime eklendi!");
    } catch(e) { alert("Hata: " + e.message); }
}
async function tarimSil(index) {
    if (!ayricaliklimi()) return;
    try {
        const snap=await db.collection("settings").doc("tarim").get();
        const liste=snap.exists?[...(snap.data().liste||[])]:[...TARIM_VARSAYILAN];
        liste.splice(index,1);
        await db.collection("settings").doc("tarim").set({liste},{merge:true});
        tarimDinle();
    } catch(e) { alert("Silinemedi!"); }
}

const ASI_LISTESI=[{hayvan:"🐄 Sığır",asi:"Şap Aşısı",ay:"Şubat - Nisan",periyot:"Yılda 2 kez"},{hayvan:"🐄 Sığır",asi:"Brucella",ay:"Mart - Mayıs",periyot:"Doğumdan 3-6 ay sonra"},{hayvan:"🐄 Sığır",asi:"Mavi Dil",ay:"Eylül - Ekim",periyot:"Yılda 1 kez"},{hayvan:"🐑 Koyun/Keçi",asi:"Şap Aşısı",ay:"Şubat - Nisan",periyot:"Yılda 2 kez"},{hayvan:"🐑 Koyun/Keçi",asi:"Enterotoksemi",ay:"Ekim - Kasım",periyot:"Kuzuluğa 1 ay kala"},{hayvan:"🐑 Koyun/Keçi",asi:"Çiçek Aşısı",ay:"Eylül - Ekim",periyot:"Yılda 1 kez"},{hayvan:"🐔 Kümes",asi:"Newcastle",ay:"Her mevsim",periyot:"3 ayda bir"},{hayvan:"🐕 Köpek",asi:"Kuduz (zorunlu)",ay:"Yıl boyu",periyot:"Yılda 1 kez"}];
function asiYukle() { const w=document.getElementById("asiWidget"); if (!w) return; w.innerHTML=ASI_LISTESI.map(a=>`<div class="asi-satir"><div class="asi-hayvan">${a.hayvan}</div><div class="asi-bilgi"><div class="asi-ad">${a.asi}</div><div class="asi-detay">📅 ${a.ay} · ${a.periyot}</div></div></div>`).join(""); }

const HASTALIK_LISTESI=[{isim:"🦠 Şap Hastalığı",belirtiler:"Ağız/ayaklarda kabarcıklar, ateş, yemek yiyememe",onlem:"Aşılama, hasta hayvanı ayır, hijyen"},{isim:"🫁 Solunum Enfeksiyonu",belirtiler:"Öksürük, burun akıntısı, ateş, iştahsızlık",onlem:"Veteriner çağır, sıcak tut, aşı uygula"},{isim:"🦠 Brucella",belirtiler:"Yavru atma, süt azalması, kısırlık",onlem:"Aşılama zorunlu, çiğ süt içme!"},{isim:"💊 Mastitis",belirtiler:"Memede şişlik, sertlik, sütün değişmesi",onlem:"Düzenli sağım, temizlik, antibiyotik"},{isim:"🐛 İç Parazitler",belirtiler:"Zayıflama, mat kıl, ishal, karın şişliği",onlem:"3 ayda bir ilaçlama, temiz su"},{isim:"🦟 Dış Parazitler",belirtiler:"Kaşıntı, deri döküntüsü, tüy dökülmesi",onlem:"İlaçlı banyo, ahır dezenfeksiyonu"},{isim:"⚠️ ACİL: Hemen Veteriner!",belirtiler:"Yürüyememe, zorlu doğum, uzun süre yememe, bayılma",onlem:"Alo Gıda: 174 · Veteriner hekime gidin!",vurgu:true}];
function hastalikYukle() { const w=document.getElementById("hastalikWidget"); if (!w) return; w.innerHTML=HASTALIK_LISTESI.map(h=>`<div class="hastalik-kart ${h.vurgu?"hastalik-acil":""}"><div class="hastalik-isim">${h.isim}</div><div class="hastalik-satir"><span class="hastalik-etiket">Belirtiler:</span> ${h.belirtiler}</div><div class="hastalik-satir"><span class="hastalik-etiket">Önlem:</span> ${h.onlem}</div></div>`).join(""); }

async function anketDinle() {
    const el = document.getElementById("anketSettingsWidget"); if (!el) return;
    if (anketCountdownInterval) { clearInterval(anketCountdownInterval); anketCountdownInterval = null; }
    try {
        const snap = await db.collection("settings").doc("anket").get();
        if (!snap.exists || !snap.data().aktif) {
            el.innerHTML = `<div style="text-align:center;color:#888;padding:16px;font-size:13px;">Şu an aktif anket yok</div>`; return;
        }
        const a = snap.data(), oylar = a.oylar || {}, toplamOy = Object.values(oylar).length;
        const secenekler = [a.secA,a.secB,a.secC,a.secD].filter(Boolean);
        const bitisZaman = a.bitis ? (a.bitis.toDate ? a.bitis.toDate() : new Date(a.bitis)) : null;
        const simdi = new Date(), bitti = bitisZaman && simdi >= bitisZaman;

        if (bitti && !a.sonucYayinlandi) {
            const sonucBitis = new Date((bitisZaman||simdi).getTime() + 24*60*60*1000);
            try { await db.collection("settings").doc("anket").update({ sonucYayinlandi:true, sonucBitis:firebase.firestore.Timestamp.fromDate(sonucBitis) }); } catch(e2) {}
            setTimeout(() => anketDinle(), 500); return;
        }

        if (a.sonucYayinlandi) {
            const sb = a.sonucBitis ? (a.sonucBitis.toDate ? a.sonucBitis.toDate() : new Date(a.sonucBitis)) : null;
            if (sb && simdi >= sb) {
                try { await db.collection("settings").doc("anket").update({ aktif:false }); } catch(e2) {}
                el.innerHTML = `<div style="text-align:center;color:#888;padding:16px;font-size:13px;">Şu an aktif anket yok</div>`; return;
            }
            const kalanSaat = sb ? Math.max(0, Math.ceil((sb.getTime()-simdi.getTime())/3600000)) : 0;
            const benimOyum = currentUser ? oylar[currentUser.uid] : null;
            el.innerHTML = `<div style="background:#e8f5e9;padding:8px 12px;border-radius:8px;margin-bottom:12px;font-size:12px;color:#2e7d32;text-align:center;">✅ Anket Sonuçları Açıklandı${kalanSaat>0?` · ${kalanSaat} saat sonra kaldırılacak`:''}</div>
            <div class="anket-soru">${escapeHtml(a.soru)}</div>
            ${secenekler.map((sec,i)=>{ const harf=["A","B","C","D"][i],bu=Object.values(oylar).filter(v=>v===harf).length,yuzde=toplamOy>0?Math.round((bu/toplamOy)*100):0; return `<div class="anket-secenek ${benimOyum===harf?'anket-secildi':''}" style="cursor:default;"><div class="anket-sec-ust"><span class="anket-harf">${harf}</span><span class="anket-sec-text">${escapeHtml(sec)}</span><span class="anket-yuzde">${yuzde}% (${bu} oy)</span></div><div class="anket-bar"><div class="anket-bar-dolu" style="width:${yuzde}%"></div></div></div>`; }).join("")}
            <div class="anket-toplam">Toplam ${toplamOy} oy</div>`;
            return;
        }

        const benimOyum = currentUser ? oylar[currentUser.uid] : null;
        const ilkSure = (() => { if (!bitisZaman) return ''; const r=bitisZaman.getTime()-simdi.getTime(); if(r<=0) return ''; const g=Math.floor(r/(24*3600*1000)),s=Math.floor((r%(24*3600*1000))/3600000),d=Math.floor((r%3600000)/60000),sn=Math.floor((r%60000)/1000); return g>0?`${g}g ${s}s ${d}dk`:`${s}:${String(d).padStart(2,'0')}:${String(sn).padStart(2,'0')}`; })();

        el.innerHTML = `${bitisZaman?`<div class="anket-geri-sayim" id="anketCountdown">⏱️ Kalan süre: <b>${ilkSure||'Süre doldu!'}</b></div>`:''}
        <div class="anket-soru">${escapeHtml(a.soru)}</div>
        ${secenekler.map((sec,i)=>{ const harf=["A","B","C","D"][i],bu=Object.values(oylar).filter(v=>v===harf).length,yuzde=toplamOy>0?Math.round((bu/toplamOy)*100):0; return `<div class="anket-secenek ${benimOyum===harf?'anket-secildi':''}" onclick="anketOy('${harf}')"><div class="anket-sec-ust"><span class="anket-harf">${harf}</span><span class="anket-sec-text">${escapeHtml(sec)}</span><span class="anket-yuzde">${yuzde}%</span></div><div class="anket-bar"><div class="anket-bar-dolu" style="width:${yuzde}%"></div></div></div>`; }).join("")}
        <div class="anket-toplam">Toplam ${toplamOy} oy · Canlı sonuçlar</div>`;

        if (bitisZaman) {
            anketCountdownInterval = setInterval(() => {
                const cdEl = document.getElementById("anketCountdown"); if (!cdEl) { clearInterval(anketCountdownInterval); anketCountdownInterval=null; return; }
                const rem = bitisZaman.getTime()-Date.now();
                if (rem <= 0) { clearInterval(anketCountdownInterval); anketCountdownInterval=null; cdEl.innerHTML='⏱️ Süre doldu!'; setTimeout(()=>anketDinle(),1500); return; }
                const g=Math.floor(rem/(24*3600*1000)),s=Math.floor((rem%(24*3600*1000))/3600000),d=Math.floor((rem%3600000)/60000),sn=Math.floor((rem%60000)/1000);
                cdEl.innerHTML=`⏱️ Kalan süre: <b>${g>0?`${g}g ${s}s ${d}dk`:`${s}:${String(d).padStart(2,'0')}:${String(sn).padStart(2,'0')}`}</b>`;
            }, 1000);
        }
    } catch(e) { console.warn("Anket:", e); }
}

async function anketOy(harf) {
    if (!currentUser) return alert("Oy vermek için giriş yapın!");
    try { await db.collection("settings").doc("anket").update({ [`oylar.${currentUser.uid}`]:harf }); anketDinle(); }
    catch(e) { alert("Hata: " + e.message); }
}

async function anketOlustur() {
    if (!ayricaliklimi()) return alert("Yetkiniz yok!");
    const soru=document.getElementById("anketSoru").value.trim(), secA=document.getElementById("anketSecA").value.trim(), secB=document.getElementById("anketSecB").value.trim();
    if (!soru||!secA||!secB) return alert("Soru ve en az 2 seçenek zorunludur!");
    const bitisInput=document.getElementById("anketBitis").value;
    if (!bitisInput) return alert("Bitiş tarihi ve saati zorunludur!");
    const bitis=new Date(bitisInput);
    if (bitis<=new Date()) return alert("Bitiş tarihi gelecekte olmalı!");
    const veri={soru,secA,secB,aktif:true,oylar:{},sonucYayinlandi:false,sonucBitis:null,bitis:firebase.firestore.Timestamp.fromDate(bitis),time:firebase.firestore.FieldValue.serverTimestamp()};
    const secC=document.getElementById("anketSecC").value.trim(); if(secC) veri.secC=secC;
    const secDEl=document.getElementById("anketSecD"); const secD=secDEl?secDEl.value.trim():""; if(secD) veri.secD=secD;
    try {
        await db.collection("settings").doc("anket").set(veri);
        ["anketSoru","anketSecA","anketSecB","anketSecC","anketSecD","anketBitis"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
        anketDinle(); alert("✅ Anket yayınlandı!");
    } catch(e) { alert("Hata: " + e.message); }
}

async function anketToggle() {
    if (!ayricaliklimi()) return;
    try {
        const snap=await db.collection("settings").doc("anket").get();
        if (!snap.exists) return alert("Önce anket oluşturun!");
        const yeni=!snap.data().aktif;
        await db.collection("settings").doc("anket").update({aktif:yeni});
        anketDinle(); alert(yeni?"✅ Anket aktif edildi!":"Anket durduruldu.");
    } catch(e) { alert("Hata: " + e.message); }
}

async function anketSil() {
    if (!ayricaliklimi()||!confirm("Aktif anketi kaldırmak istiyor musunuz?")) return;
    try { await db.collection("settings").doc("anket").update({aktif:false}); anketDinle(); }
    catch(e) { alert("Hata: " + e.message); }
}

async function anketKatilimKontrol() {
    if (!currentUser) return;
    try {
        const snap=await db.collection("settings").doc("anket").get();
        if (!snap.exists||!snap.data().aktif||snap.data().sonucYayinlandi) return;
        const a=snap.data();
        const bitisZaman=a.bitis?(a.bitis.toDate?a.bitis.toDate():new Date(a.bitis)):null;
        if (bitisZaman&&new Date()>=bitisZaman) return;
        const anketId=a.time?a.time.seconds:"default";
        if (localStorage.getItem(`anketSoruldu_${anketId}`)) return;
        const popup=document.getElementById("anketPopup"); if(!popup) return;
        const soruEl=document.getElementById("anketPopupSoru"); if(soruEl) soruEl.textContent=a.soru;
        popup.setAttribute("data-anket-id",anketId);
        popup.classList.remove("hidden");
    } catch(e) {}
}

function anketKatilimEvet() {
    const popup=document.getElementById("anketPopup"); if(!popup) return;
    const anketId=popup.getAttribute("data-anket-id");
    if(anketId) localStorage.setItem(`anketSoruldu_${anketId}`,"evet");
    popup.classList.add("hidden");
    tabDegistir("settings");
    const icerik=document.getElementById("icerik-anketkullanici"), ok=document.getElementById("ok-anketkullanici");
    if(icerik) icerik.classList.remove("hidden"); if(ok) ok.textContent="▲";
    setTimeout(()=>{ anketDinle(); const el=document.getElementById("anketSettingsWidget"); if(el) el.scrollIntoView({behavior:"smooth"}); },400);
}

function anketKatilimHayir() {
    const popup=document.getElementById("anketPopup"); if(!popup) return;
    const anketId=popup.getAttribute("data-anket-id");
    if(anketId) localStorage.setItem(`anketSoruldu_${anketId}`,"hayir");
    popup.classList.add("hidden");
}

function settingsProfilGuncelle() {
    if (!userProfile) return;
    const av=document.getElementById("settingsAvatar");
    const ad=document.getElementById("settingsAd");
    const dr=document.getElementById("settingsDurum");
    const bi=document.getElementById("settingsBio");
    const btnEl=document.getElementById("profilAvatarBtn");
    if (av) {
        if (userProfile.avatar) { av.innerHTML=`<img src="${userProfile.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`; av.style.background="none"; av.style.padding="0"; }
        else { av.textContent=(userProfile.name||"?")[0].toUpperCase(); av.style.background=""; av.style.padding=""; }
    }
    if (btnEl) {
        if (userProfile.avatar) { btnEl.innerHTML=`<img src="${userProfile.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`; btnEl.style.padding="0"; }
        else { btnEl.textContent="👤"; btnEl.style.padding=""; }
    }
    if (ad) ad.textContent=userProfile.name||"";
    if (dr) dr.textContent=userProfile.durum||"";
    if (bi) bi.textContent=userProfile.bio||"";
}

function profilDuzenleAc() {
    if (!currentUser) return;
    secilenDurum=userProfile?.durum||"";
    secilenAvatarDosya=null;
    document.getElementById("profilDuzenleModal").classList.remove("hidden");
    const av=document.getElementById("profilDuzenleAvatar");
    if (userProfile?.avatar) { av.innerHTML=`<img src="${userProfile.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`; av.style.background="none"; av.style.padding="0"; }
    else { av.textContent=(userProfile?.name||"?")[0].toUpperCase(); av.style.background=""; av.style.padding=""; }
    document.getElementById("profilBio").value=userProfile?.bio||"";
    document.querySelectorAll(".durum-btn").forEach(b=>b.classList.toggle("durum-btn-secili",b.textContent.trim()===secilenDurum));
    document.getElementById("profilKaydetHata").style.display="none";
}

function profilDuzenleKapat() { document.getElementById("profilDuzenleModal").classList.add("hidden"); secilenAvatarDosya=null; }

function durumSec(durum, btn) {
    secilenDurum=durum;
    document.querySelectorAll(".durum-btn").forEach(b=>b.classList.remove("durum-btn-secili"));
    btn.classList.add("durum-btn-secili");
}

function profilAvatarOnizle(input) {
    if (!input.files[0]) return;
    secilenAvatarDosya=input.files[0];
    const url=URL.createObjectURL(secilenAvatarDosya);
    const el=document.getElementById("profilDuzenleAvatar");
    el.innerHTML=`<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`; el.style.background="none"; el.style.padding="0";
}

async function profilKaydet() {
    if (!currentUser) return;
    const btn=document.getElementById("profilKaydetBtn");
    const hata=document.getElementById("profilKaydetHata");
    btn.textContent="⏳ Kaydediliyor..."; btn.disabled=true; hata.style.display="none";
    try {
        const bio=document.getElementById("profilBio").value.trim().slice(0,150);
        const guncelle={bio,durum:secilenDurum};
        if (secilenAvatarDosya) { const s=await cloudinaryYukle(secilenAvatarDosya); guncelle.avatar=s.url; }
        await db.collection("users").doc(currentUser.uid).update(guncelle);
        userProfile={...userProfile,...guncelle};
        settingsProfilGuncelle();
        profilDuzenleKapat();
        hikayeleriYukle();
        alert("✅ Profiliniz güncellendi!");
    } catch(e) { hata.textContent="Hata: "+e.message; hata.style.display="block"; }
    btn.textContent="💾 Kaydet"; btn.disabled=false;
}

async function hikayeleriYukle() {
    const liste=document.getElementById("hikayeListesi");
    if (!liste||!currentUser) return;
    try {
        const simdi=new Date();
        const snap=await db.collection("stories").orderBy("time","desc").get();

        snap.forEach(d=>{
            const exp=d.data().expireAt;
            if (exp&&(exp.toDate?exp.toDate():new Date(exp))<=simdi) d.ref.delete().catch(()=>{});
        });
        liste.innerHTML="";
        const kb={};
        snap.forEach(doc=>{
            const d=doc.data();
            const exp=d.expireAt?(d.expireAt.toDate?d.expireAt.toDate():new Date(d.expireAt)):null;
            if (exp&&exp<=simdi) return;
            if (!kb[d.uid]) kb[d.uid]={list:[],info:d};
            kb[d.uid].list.push({id:doc.id,...d});
        });
        Object.values(kb).forEach(({list,info})=>{
            const benimMi=info.uid===currentUser?.uid;
            const gorundu=list.every(h=>h.viewers&&h.viewers[currentUser?.uid]);
            const item=document.createElement("div"); item.className="hikaye-item";
            const avHtml=info.avatarUrl?`<img src="${info.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`:`<span style="font-size:20px;font-weight:700;color:#fff;">${(info.senderName||"?")[0].toUpperCase()}</span>`;
            item.innerHTML=`<div class="hikaye-daire ${benimMi?"hikaye-benim":gorundu?"hikaye-goruldu":"hikaye-yeni"}" onclick="hikayeGoruntule('${list[0].id}')">${avHtml}</div><span class="hikaye-isim">${escapeHtml((info.senderName||"?").split(" ")[0])}</span>`;
            liste.appendChild(item);
        });
    } catch(e) { console.warn("Hikaye:", e.message); }
}

function hikayeEkleAc() {
    document.getElementById("hikayeEkleModal").classList.remove("hidden");
    document.getElementById("hikayeOnizleDiv").innerHTML="";
    document.getElementById("hikayeMetin").value="";
    document.getElementById("hikayeDosya").value="";
}
function hikayeEkleKapat() { document.getElementById("hikayeEkleModal").classList.add("hidden"); }
function hikayeOnizle(input) {
    if (!input.files[0]) return;
    const url=URL.createObjectURL(input.files[0]);
    document.getElementById("hikayeOnizleDiv").innerHTML=input.files[0].type.startsWith("video")?`<video src="${url}" controls style="max-width:100%;border-radius:10px;max-height:200px;"></video>`:`<img src="${url}" style="max-width:100%;border-radius:10px;max-height:200px;object-fit:cover;">`;
}

async function hikayeGonder() {
    if (!currentUser) return;
    const dosya=document.getElementById("hikayeDosya").files[0];
    const metin=document.getElementById("hikayeMetin").value.trim();
    if (!dosya) return alert("Lütfen bir fotoğraf veya video seçin!");
    const btn=document.getElementById("hikayeGonderBtn"); btn.textContent="⏳ Yükleniyor..."; btn.disabled=true;
    try {
        const sonuc=await cloudinaryYukle(dosya);
        const bitis=new Date(Date.now()+24*60*60*1000);
        await db.collection("stories").add({
            uid:currentUser.uid, senderName:userProfile?.name||"Anonim",
            avatarUrl:userProfile?.avatar||"", mediaUrl:sonuc.url, mediaType:sonuc.type,
            metin, time:firebase.firestore.FieldValue.serverTimestamp(),
            expireAt:firebase.firestore.Timestamp.fromDate(bitis), viewers:{}
        });
        hikayeEkleKapat(); hikayeleriYukle();
    } catch(e) { alert("Hata: "+e.message); }
    btn.textContent="🚀 Hikaye Paylaş"; btn.disabled=false;
}

async function hikayeGoruntule(storyId) {
    aktifHikayeId=storyId;
    try {
        const doc=await db.collection("stories").doc(storyId).get();
        if (!doc.exists) { hikayeleriYukle(); return; }
        const d=doc.data();
        document.getElementById("hikayeModal").classList.remove("hidden");
        const avEl=document.getElementById("hikayeModalAvatar");
        if (d.avatarUrl) { avEl.innerHTML=`<img src="${d.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`; avEl.style.background="none"; }
        else { avEl.textContent=(d.senderName||"?")[0].toUpperCase(); avEl.style.background=""; }
        document.getElementById("hikayeModalAd").textContent=d.senderName||"Anonim";
        document.getElementById("hikayeModalZaman").textContent=d.time?zamanFarki(d.time):"";
        const med=document.getElementById("hikayeModalMedya");
        med.innerHTML=d.mediaType==="video"?`<video src="${d.mediaUrl}" controls autoplay playsinline style="width:100%;max-height:60vh;object-fit:contain;border-radius:12px;background:#000;"></video>`:`<img src="${d.mediaUrl}" style="width:100%;max-height:60vh;object-fit:contain;border-radius:12px;" onclick="resimTamEkran('${d.mediaUrl}')">`;
        document.getElementById("hikayeModalMetin").textContent=d.metin||"";
        const viewers=d.viewers||{};
        document.getElementById("hikayeModalIzleyenler").textContent=`👁 ${Object.keys(viewers).length} kişi izledi`;
        document.getElementById("hikayeSilBtn").style.display=(d.uid===currentUser?.uid||adminMi())?"":"none";
        if (currentUser&&!viewers[currentUser.uid]) db.collection("stories").doc(storyId).update({[`viewers.${currentUser.uid}`]:true}).catch(()=>{});
        hikayeleriYukle();
    } catch(e) { console.warn("Hikaye görüntüle:", e); }
}

function hikayeKapat() { document.getElementById("hikayeModal").classList.add("hidden"); aktifHikayeId=null; }

async function hikayeSil() {
    if (!aktifHikayeId||!confirm("Bu hikayeyi silmek istediğinize emin misiniz?")) return;
    try { await db.collection("stories").doc(aktifHikayeId).delete(); hikayeKapat(); hikayeleriYukle(); }
    catch(e) { alert("Hata: "+e.message); }
}

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(err => console.warn("SW:", err));
}