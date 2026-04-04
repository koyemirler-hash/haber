// ══════════════════════════════════════════
//  EMİRLER KÖYÜ PORTALI - app.js v4.0
// ══════════════════════════════════════════

const firebaseConfig = {
    apiKey: "AIzaSyDUagdaIoJmkgGjWFv2avYsC7n_-4AJ7s0",
    authDomain: "emirler-c5638.firebaseapp.com",
    projectId: "emirler-c5638",
    appId: "1:426225264136:web:ca5184984fc71b1e63853bd"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

const CLOUD_NAME = "ddt11vhyb";
const ONESIGNAL_APP_ID = "0c68275c-fc83-4b1e-a945-2516c19c63d4";
const ONESIGNAL_API_KEY = "os_v2_app_brucoxh4qnfr5kkfeulmdhdd2q5byifinq3umv52j46a7vfvj2zkm4k74gez2lmoitj4q6mqrkzulpxjpm2bjapbi6s5hrwcu5bgcza";
const UPLOAD_PRESET = "koyapp";
const ADMIN_EMAIL = "koyemirler@gmail.com";
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

// ═══════════════════════════════════════════
//  PWA
// ═══════════════════════════════════════════

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
    // OneSignal başlat
    oneSignalBaslat();
});

function oneSignalBaslat() {
    if (typeof OneSignalDeferred === "undefined") return;
    OneSignalDeferred.push(async function(OneSignal) {
        try {
            await OneSignal.init({
                appId: ONESIGNAL_APP_ID,
                notifyButton: { enable: false },
                allowLocalhostAsSecureOrigin: true,
            });
            const opted = OneSignal.User?.PushSubscription?.optedIn;
            if (!opted) await OneSignal.Slidedown.promptPush().catch(()=>{});
        } catch(e) { console.warn("OneSignal:", e); }
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

// İlk dokunuşta ses + bildirim izni
function ilkDokunusIzinleri() {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === "suspended") ctx.resume();
    bildirimiIzniAl();
}
document.addEventListener("touchstart", ilkDokunusIzinleri, { once: true });
document.addEventListener("click", ilkDokunusIzinleri, { once: true });

// ═══════════════════════════════════════════
//  SES SİSTEMİ
// ═══════════════════════════════════════════

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

// ═══════════════════════════════════════════
//  BİLDİRİM
// ═══════════════════════════════════════════

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

// ═══════════════════════════════════════════
//  YARDIMCILAR
// ═══════════════════════════════════════════

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

// ═══════════════════════════════════════════
//  KULLANIM ŞARTLARI
// ═══════════════════════════════════════════

if (localStorage.getItem("termsAccepted")) {
    document.getElementById("termsOverlay").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
}
function onayVer() {
    try {
        if (!document.getElementById("termsCheck").checked) { alert("Şartları kabul etmelisiniz!"); return; }
        localStorage.setItem("termsAccepted","true");
        document.getElementById("termsOverlay").classList.add("hidden");
        document.getElementById("loginPage").classList.remove("hidden");
    } catch(e) { console.error("onayVer:", e); alert("Hata: "+e.message); }
}

// ═══════════════════════════════════════════
//  GİRİŞ / KAYIT
// ═══════════════════════════════════════════

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

// ═══════════════════════════════════════════
//  AUTH STATE
// ═══════════════════════════════════════════

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

        window.addEventListener("beforeunload", () => navigator.sendBeacon(`https://firestore.googleapis.com/v1/projects/emirler-c5638/databases/(default)/documents/users/${user.uid}`, JSON.stringify({ fields:{ online:{ booleanValue:false } } })));

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
        // OneSignal'a kullanıcı ID'sini bildir
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

// ═══════════════════════════════════════════
//  NAVİGASYON + AKORDEON
// ═══════════════════════════════════════════

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
    if (t === "ilan" && !ilanlarDinleBasladi) {
