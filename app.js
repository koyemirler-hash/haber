// ══════════════════════════════════════════
//  EMİRLER KÖYÜ PORTALI - app.js v3.0
//  + PWA Yükleme | Sesler | Nostalji | Onay Sistemi
// ══════════════════════════════════════════

// ─── FIREBASE CONFIG ───
const firebaseConfig = {
    apiKey: "AIzaSyDUagdaIoJmkgGjWFv2avYsC7n_-4AJ7s0",
    authDomain: "emirler-c5638.firebaseapp.com",
    projectId: "emirler-c5638",
    appId: "1:426225264136:web:ca5184984fc71b1e63853bd"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ─── CLOUDINARY CONFIG ───
const CLOUD_NAME = "ddt11vhyb";
const UPLOAD_PRESET = "koyapp";

// ─── SABİTLER ───
const ADMIN_EMAIL = "koyemirler@gmail.com";
const EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];
const YASAKLi_KELIMELER = ["küfür", "aptal", "salak", "mal", "orospu", "siktir", "oç", "amk", "amq"];

// ─── DURUM ───
let currentUser = null;
let userProfile = null;
let chatMediaFile = null;
let currentPostId = null;
let currentCollection = "announcements";
let commentsUnsubscribe = null;
let deferredInstallPrompt = null;
let chatDocCount = -1;
let soundEnabled = localStorage.getItem("soundEnabled") !== "false";
let audioCtx = null;

// ═══════════════════════════════════════════
//  PWA YÜKLEME
// ═══════════════════════════════════════════

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    document.getElementById("pwaInstallBanner").classList.remove("hidden");
    document.body.classList.add("pwa-banner-acik");
    const sb = document.getElementById("settingsInstallBtn");
    if (sb) sb.style.display = "";
});

window.addEventListener("appinstalled", () => {
    document.getElementById("pwaInstallBanner").classList.add("hidden");
    document.body.classList.remove("pwa-banner-acik");
    deferredInstallPrompt = null;
    const sb = document.getElementById("settingsInstallBtn");
    if (sb) sb.textContent = "✅ Uygulama Yüklendi!";
});

function pwaYukle() {
    if (!deferredInstallPrompt) {
        alert("📱 Uygulamayı yüklemek için tarayıcınızın 'Ana Ekrana Ekle' özelliğini kullanın.");
        return;
    }
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(result => {
        if (result.outcome === "accepted") {
            document.getElementById("pwaInstallBanner").classList.add("hidden");
        }
        deferredInstallPrompt = null;
    });
}

function pwaYukleSettings() {
    if (!deferredInstallPrompt) {
        alert("📱 Uygulama zaten yüklü ya da tarayıcınız otomatik yüklemeyi desteklemiyor.\n\nManuel olarak: Tarayıcı menüsü → 'Ana Ekrana Ekle'");
        return;
    }
    pwaYukle();
}

function pwaBannerKapat() {
    document.getElementById("pwaInstallBanner").classList.add("hidden");
    document.body.classList.remove("pwa-banner-acik");
}

// Settings install butonu başlangıçta gizli
window.addEventListener("DOMContentLoaded", () => {
    const sb = document.getElementById("settingsInstallBtn");
    if (sb) sb.style.display = "none";
    updateSoundBtn();
    // Kısa süre sonra bildirim izni iste (sayfa yüklendikten sonra)
    setTimeout(() => {
        if ("Notification" in window && Notification.permission === "default") {
            bildirimiIzniAl();
        }
    }, 3000);
});

// ─── MOBİL SES + BİLDİRİM İZİNLERİ ───
function ilkDokunusIzinleri() {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === "suspended") ctx.resume();
    bildirimiIzniAl();
}
document.addEventListener("touchstart", ilkDokunusIzinleri, { once: true });
document.addEventListener("click", ilkDokunusIzinleri, { once: true });

// ─── BİLDİRİM İZNİ ───
async function bildirimiIzniAl() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
        bildirimBtnGuncelle("granted");
        return;
    }
    if (Notification.permission === "denied") {
        bildirimBtnGuncelle("denied");
        return;
    }
    try {
        const izin = await Notification.requestPermission();
        bildirimBtnGuncelle(izin);
    } catch(e) {}
}

async function bildirimIzniIste() {
    if (!("Notification" in window)) {
        alert("Bu tarayıcı bildirimleri desteklemiyor.");
        return;
    }
    if (Notification.permission === "denied") {
        alert("Bildirim izni reddedilmiş.\n\nTarayıcı ayarlarından manuel olarak açmanız gerekiyor:\nAyarlar → Site Ayarları → Bildirimler → Emirler → İzin Ver");
        return;
    }
    const izin = await Notification.requestPermission();
    bildirimBtnGuncelle(izin);
    if (izin === "granted") {
        // Test bildirimi gönder
        setTimeout(() => {
            telefonBildirimi("✅ Emirler Köyü", "Bildirimler başarıyla etkinleştirildi!", "test");
        }, 500);
    }
}

function bildirimBtnGuncelle(durum) {
    const btn = document.getElementById("bildirimBtn");
    const text = document.getElementById("bildirimDurumText");
    if (!btn) return;
    if (durum === "granted") {
        btn.textContent = "✅ Açık";
        btn.className = "izin-btn izin-btn-aktif";
        if (text) text.textContent = "Bildirimler aktif ✓";
    } else if (durum === "denied") {
        btn.textContent = "🚫 Kapalı";
        btn.className = "izin-btn izin-btn-kapali";
        if (text) text.textContent = "Tarayıcı ayarlarından açın";
    } else {
        btn.textContent = "İzin Ver";
        btn.className = "izin-btn";
        if (text) text.textContent = "Yeni mesaj ve duyurularda haber al";
    }
}

// Telefon bildirimi göster - hem arka planda hem açıkken çalışır
function telefonBildirimi(baslik, mesaj, tag) {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    // Service Worker üzerinden göster (arka planda da çalışır)
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then(reg => {
            if (reg.active) {
                reg.active.postMessage({
                    type: "SHOW_NOTIFICATION",
                    title: baslik,
                    body: mesaj,
                    tag: tag || "emirler"
                });
            }
        }).catch(() => {
            // SW yoksa direkt göster
            new Notification(baslik, {
                body: mesaj,
                icon: "./ikon_192.png",
                badge: "./ikon_192.png",
                tag: tag || "emirler"
            });
        });
    } else {
        new Notification(baslik, {
            body: mesaj,
            icon: "./ikon_192.png",
            tag: tag || "emirler"
        });
    }
}

// ═══════════════════════════════════════════
//  SES SİSTEMİ
// ═══════════════════════════════════════════

function getAudioCtx() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) { return null; }
    }
    return audioCtx;
}

// Beğeni sesi – neşeli "ding" tonu
function playLikeSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);       // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
        gain.gain.setValueAtTime(0.0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
    } catch(e) {}
}

// Mesaj sesi – WhatsApp tarzı çift bip
function playMessageSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();

        [0, 0.13].forEach(delay => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.0, ctx.currentTime + delay);
            gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + delay + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.11);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.11);
        });
    } catch(e) {}
}

// Onay sesi – duyuru tonu
function playApproveSound() {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioCtx();
        if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();

        [440, 554.37, 659.25].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.value = freq;
            const t = ctx.currentTime + i * 0.12;
            gain.gain.setValueAtTime(0.0, t);
            gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            osc.start(t);
            osc.stop(t + 0.15);
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
    // Header butonu
    const btn = document.getElementById("soundToggleBtn");
    if (btn) btn.textContent = soundEnabled ? "🔔" : "🔕";
    // Ayarlar sayfası butonu
    const sesBtn = document.getElementById("sesBtn");
    if (sesBtn) {
        sesBtn.textContent = soundEnabled ? "Açık" : "Kapalı";
        sesBtn.className = soundEnabled ? "izin-btn izin-btn-aktif" : "izin-btn";
    }
}

// ═══════════════════════════════════════════
//  YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════

function ayricaliklimi() {
    if (!userProfile) return false;
    if (currentUser && currentUser.email === ADMIN_EMAIL) return true;
    // Firestore'da alan "rol" (Türkçe) olarak kayıtlı
    const r = userProfile.rol || userProfile.role || "";
    return ["admin", "muhtar", "yardimci"].includes(r);
}

function adminMi() {
    if (currentUser && currentUser.email === ADMIN_EMAIL) return true;
    const r = userProfile ? (userProfile.rol || userProfile.role || "") : "";
    return r === "admin";
}

function zamanFarki(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime();
    const sn = Math.floor(diff / 1000);
    if (sn < 60) return "Az önce";
    const dk = Math.floor(sn / 60);
    if (dk < 60) return `${dk} dk önce`;
    const sa = Math.floor(dk / 60);
    if (sa < 24) return `${sa} sa önce`;
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

function kufurKontrol(metin) {
    const temiz = metin.toLowerCase();
    return YASAKLi_KELIMELER.some(k => temiz.includes(k));
}

function previewFile(input, previewId) {
    const preview = document.getElementById(previewId);
    if (!input.files[0]) { preview.innerHTML = ""; return; }
    const file = input.files[0];
    const url = URL.createObjectURL(file);
    if (file.type.startsWith("video")) {
        preview.innerHTML = `<video src="${url}" controls style="max-width:100%;border-radius:10px;max-height:180px;"></video>`;
    } else {
        preview.innerHTML = `<img src="${url}" style="max-width:100%;border-radius:10px;max-height:180px;object-fit:cover;">`;
    }
}

async function cloudinaryYukle(file) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
        method: "POST",
        body: fd
    });
    if (!res.ok) throw new Error("Yükleme başarısız! Cloudinary preset ayarını kontrol edin.");
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return {
        url: data.secure_url,
        type: file.type.startsWith("video") ? "video" : "image"
    };
}

function resimTamEkran(src) {
    document.getElementById("imgFullscreenSrc").src = src;
    document.getElementById("imgFullscreen").classList.remove("hidden");
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ═══════════════════════════════════════════
//  KULLANIM ŞARTLARI
// ═══════════════════════════════════════════

if (localStorage.getItem("termsAccepted")) {
    document.getElementById("termsOverlay").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
}

function onayVer() {
    if (!document.getElementById("termsCheck").checked) {
        alert("Devam etmek için şartları kabul etmelisiniz!");
        return;
    }
    localStorage.setItem("termsAccepted", "true");
    document.getElementById("termsOverlay").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
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
    const email = document.getElementById("logEmail").value.trim();
    const pass = document.getElementById("logPass").value;
    if (!email || !pass) return;
    try {
        await auth.signInWithEmailAndPassword(email, pass);
    } catch(e) {
        const mesajlar = {
            "auth/user-not-found": "Bu e-posta ile kayıt bulunamadı!",
            "auth/wrong-password": "Şifre hatalı!",
            "auth/invalid-email": "Geçersiz e-posta!",
            "auth/too-many-requests": "Çok fazla hatalı deneme. Lütfen bekleyin."
        };
        document.getElementById("authError").textContent = mesajlar[e.code] || "Giriş başarısız!";
    }
}

async function kayitOl() {
    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const pass = document.getElementById("regPass").value;
    if (!name || !email || !pass) return alert("Tüm alanları doldurun!");
    if (pass.length < 6) return alert("Şifre en az 6 karakter olmalı!");
    try {
        const res = await auth.createUserWithEmailAndPassword(email, pass);
        await db.collection("users").doc(res.user.uid).set({
            name,
            email,
            role: email === ADMIN_EMAIL ? "admin" : "user",
            online: true,
            blocked: false,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch(e) {
        const mesajlar = {
            "auth/email-already-in-use": "Bu e-posta zaten kayıtlı!",
            "auth/invalid-email": "Geçersiz e-posta!"
        };
        document.getElementById("authError").textContent = mesajlar[e.code] || "Kayıt başarısız: " + e.message;
    }
}

async function cikisYap() {
    if (currentUser) {
        try { await db.collection("users").doc(currentUser.uid).update({ online: false }); } catch(e) {}
    }
    await auth.signOut();
    location.reload();
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
            await docRef.set({
                name: user.displayName || user.email.split("@")[0],
                email: user.email,
                role: user.email === ADMIN_EMAIL ? "admin" : "user",
                online: true,
                blocked: false,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
            docSnap = await docRef.get();
        } else {
            await docRef.update({
                online: true,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        userProfile = docSnap.data();

        if (userProfile.blocked) {
            await auth.signOut();
            alert("❌ Hesabınız engellenmiştir. Yönetici ile iletişime geçin.");
            location.reload();
            return;
        }

        document.getElementById("loginPage").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        document.getElementById("navBar").classList.remove("hidden");

        // Yetkili kullanıcılar için gönderi paneli
        if (ayricaliklimi()) {
            document.getElementById("postPanel").classList.remove("hidden");
            document.getElementById("nostaljiPendingSection").classList.remove("hidden");
            document.getElementById("nostaljiApprovalNote").classList.add("hidden");
            // Köy hizmetleri admin panelleri
            const ilanPend = document.getElementById("ilanPendingSection");
            if (ilanPend) ilanPend.classList.remove("hidden");
            const rehberPend = document.getElementById("rehberPendingSection");
            if (rehberPend) rehberPend.classList.remove("hidden");
            const anketPanel = document.getElementById("anketOlusturPanel");
            if (anketPanel) anketPanel.classList.remove("hidden");
            const tarimPanel = document.getElementById("tarimEklePanel");
            if (tarimPanel) tarimPanel.classList.remove("hidden");
        }

        if (adminMi()) {
            document.getElementById("adminPanel").classList.remove("hidden");
        }

        window.addEventListener("beforeunload", () => {
            navigator.sendBeacon(
                "https://firestore.googleapis.com/v1/projects/emirler-c5638/databases/(default)/documents/users/" + user.uid,
                JSON.stringify({ fields: { online: { booleanValue: false } } })
            );
        });

        // İzin durumlarını ayarlar sayfasında göster
        bildirimBtnGuncelle(("Notification" in window) ? Notification.permission : "denied");
        updateSoundBtn();

        tabDegistir("feed");
        akisDinle();
        mesajlariDinle();
        isletmeleriYukle();
        onlineListesiYukle();
        nostaljiDinle();
        reklamYukle();
        floatReklamYukle();
        koyKoordYukle();
        kesfetYukle();

        // Yetkililere onay bekleyenleri dinlet
        if (ayricaliklimi()) {
            nostaljiOnayBekleyenleriDinle();
        }

    } else {
        currentUser = null;
        userProfile = null;
    }
});

// ═══════════════════════════════════════════
//  NAVİGASYON
// ═══════════════════════════════════════════

function tabDegistir(t) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    const view = document.getElementById("view-" + t);
    if (view) view.classList.remove("hidden");
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    const navEl = document.getElementById("nav-" + t);
    if (navEl) navEl.classList.add("active");
    window.scrollTo(0, 0);
    // Floating reklam: firmalar sayfasında gizle
    const fr = document.getElementById("floatingReklam");
    if (fr) fr.style.visibility = (t === "biz") ? "hidden" : "";
    // İlan sayfası açılınca yükle
    if (t === "ilan" && !ilanlarDinleBasladi) { ilanlarDinleBasladi = true; ilanlarDinle(); }
    // Köy sayfası açılınca hava+namaz yükle
    if (t === "koy") { havaDurumuYukle(); namazYukle(); tarimDinle(); asiYukle(); hastalikYukle(); anketDinle(); liderYukle(); }
}

let aktifKoyTab = "hava";
function koyTabDegistir(tab) {
    aktifKoyTab = tab;
    document.querySelectorAll(".koy-panel").forEach(p => p.classList.add("hidden"));
    const panel = document.getElementById("kpanel-" + tab);
    if (panel) panel.classList.remove("hidden");
    document.querySelectorAll(".koy-tab").forEach(t => t.classList.remove("active"));
    const tabEl = document.getElementById("ktab-" + tab);
    if (tabEl) tabEl.classList.add("active");
    // Veriyi yükle
    if (tab === "hava") havaDurumuYukle();
    if (tab === "namaz") namazYukle();
    if (tab === "ilan") ilanDinle();
    if (tab === "rehber") rehberDinle();
    if (tab === "anket") anketDinle();
    if (tab === "tarim") tarimDinle();
    if (tab === "lider") liderYukle();
}

// ═══════════════════════════════════════════
//  AKIŞ (FEED)
// ═══════════════════════════════════════════

let akisDocCount = -1;

function akisDinle() {
    db.collection("announcements").orderBy("time", "desc").onSnapshot(snap => {
        // 📲 Yeni duyuru bildirimi
        const newCount = snap.size;
        if (akisDocCount >= 0 && newCount > akisDocCount) {
            const docs = snap.docs;
            const newest = docs[0]?.data(); // desc sıralı, ilk = en yeni
            if (newest && newest.senderUid !== currentUser?.uid && document.hidden) {
                telefonBildirimi(
                    "📢 " + (newest.sender || "Yeni Duyuru"),
                    newest.title || newest.text || "Yeni bir paylaşım var",
                    "duyuru"
                );
            }
        }
        akisDocCount = newCount;

        const list = document.getElementById("postList");
        if (snap.empty) {
            list.innerHTML = `<div class="empty-state"><div class="empty-icon">📢</div><p>Henüz duyuru yok</p></div>`;
            return;
        }
        list.innerHTML = "";
        snap.forEach(doc => {
            const p = doc.data();
            const pid = doc.id;
            const reactions = p.reactions || {};
            const myReaction = currentUser ? reactions[currentUser.uid] : null;

            const emojiSayilari = {};
            Object.values(reactions).forEach(e => { emojiSayilari[e] = (emojiSayilari[e] || 0) + 1; });

            const reactionHTML = EMOJIS.map(e => {
                const count = emojiSayilari[e] || 0;
                return `<span class="reaction-btn ${myReaction === e ? "active" : ""}" onclick="reaksiyon('${pid}','${e}','announcements')">
                    ${e}<span class="reaction-count">${count > 0 ? count : ""}</span>
                </span>`;
            }).join("");

            const mediaHTML = p.mediaUrl ? (
                p.mediaType === "video"
                    ? `<video src="${p.mediaUrl}" controls class="post-media" preload="metadata"></video>`
                    : `<img src="${p.mediaUrl}" class="post-media" onclick="resimTamEkran('${p.mediaUrl}')" loading="lazy">`
            ) : "";

            const rolHTML = p.senderRole && p.senderRole !== "user"
                ? `<span class="post-role">${p.senderRole === "muhtar" ? "Muhtar" : p.senderRole === "yardimci" ? "Yardımcı" : "Admin"}</span>`
                : "";

            const silBtn = ayricaliklimi()
                ? `<button class="icon-btn delete-post-btn" onclick="postSil('${pid}')">🗑️</button>`
                : "";

            const card = document.createElement("div");
            card.className = "post-card";
            card.id = "post-" + pid;
            card.innerHTML = `
                <div class="post-header">
                    <div class="post-avatar">${(p.sender || "?")[0].toUpperCase()}</div>
                    <div class="post-meta">
                        <span class="post-sender">${escapeHtml(p.sender || "Anonim")}${rolHTML}</span>
                        <span class="post-time">${zamanFarki(p.time)}</span>
                    </div>
                    ${silBtn}
                </div>
                ${p.title ? `<div class="post-title">${escapeHtml(p.title)}</div>` : ""}
                ${p.text ? `<div class="post-text">${escapeHtml(p.text)}</div>` : ""}
                ${mediaHTML}
                <div class="post-actions">
                    <div class="reactions-bar">${reactionHTML}</div>
                    <div class="post-btns-row">
                        <button class="comment-count-btn" onclick="yorumModalAc('${pid}','announcements')">
                            💬 ${p.commentCount || 0} Yorum
                        </button>
                    </div>
                </div>
            `;
            list.appendChild(card);
        });
    }, err => {
        console.error("Akış hatası:", err);
        document.getElementById("postList").innerHTML = `<div class="empty-state"><p>⚠️ Yükleme hatası</p></div>`;
    });
}

async function akisPaylas() {
    if (!ayricaliklimi()) return alert("Yetkiniz yok!");
    const title = document.getElementById("postTitle").value.trim();
    const text = document.getElementById("postText").value.trim();
    const file = document.getElementById("postFile").files[0];
    if (!title && !text && !file) return alert("En az bir şey ekleyin!");
    if (kufurKontrol(title + " " + text)) return alert("⚠️ Uygunsuz içerik tespit edildi!");

    const btn = document.getElementById("postBtn");
    btn.disabled = true;
    btn.textContent = "⏳ Yükleniyor...";

    try {
        let mediaUrl = "", mediaType = "";
        if (file) {
            const result = await cloudinaryYukle(file);
            mediaUrl = result.url;
            mediaType = result.type;
        }
        await db.collection("announcements").add({
            sender: userProfile.name,
            senderUid: currentUser.uid,
            senderRole: userProfile.rol || userProfile.role || "user",
            title, text, mediaUrl, mediaType,
            reactions: {},
            commentCount: 0,
            time: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById("postTitle").value = "";
        document.getElementById("postText").value = "";
        document.getElementById("postFile").value = "";
        document.getElementById("postPreview").innerHTML = "";
    } catch(e) {
        alert("⚠️ Paylaşım başarısız: " + e.message);
    }

    btn.disabled = false;
    btn.textContent = "📢 Paylaş";
}

async function reaksiyon(postId, emoji, collection) {
    if (!currentUser) return alert("Lütfen giriş yapın!");
    playLikeSound(); // 🔊 Beğeni sesi
    const ref = db.collection(collection).doc(postId);
    const snap = await ref.get();
    const reactions = { ...(snap.data().reactions || {}) };
    if (reactions[currentUser.uid] === emoji) {
        delete reactions[currentUser.uid];
    } else {
        reactions[currentUser.uid] = emoji;
    }
    await ref.update({ reactions });
}

async function postSil(postId) {
    if (!ayricaliklimi()) return;
    if (!confirm("Bu gönderiyi silmek istiyor musunuz?")) return;
    try {
        await db.collection("announcements").doc(postId).delete();
    } catch(e) { alert("Silme hatası: " + e.message); }
}

// ═══════════════════════════════════════════
//  NOSTALJİ
// ═══════════════════════════════════════════

function nostaljiDinle() {
    db.collection("nostalgia")
        .where("status", "==", "published")
        .orderBy("time", "desc")
        .onSnapshot(snap => {
            const list = document.getElementById("nostaljiList");
            if (snap.empty) {
                list.innerHTML = `<div class="empty-state"><div class="empty-icon">📸</div><p>Henüz nostalji anısı yok.<br>İlk anıyı siz paylaşın!</p></div>`;
                return;
            }
            list.innerHTML = "";
            snap.forEach(doc => {
                const card = buildNostaljiCard(doc.id, doc.data(), false);
                list.appendChild(card);
            });
        }, err => {
            console.error("Nostalji hatası:", err);
        });
}

function nostaljiOnayBekleyenleriDinle() {
    db.collection("nostalgia")
        .where("status", "==", "pending")
        .orderBy("time", "asc")
        .onSnapshot(snap => {
            const list = document.getElementById("nostaljiPendingList");
            const badge = document.getElementById("nostalji-badge");
            const countText = document.getElementById("pendingCountText");

            const count = snap.size;

            // Badge güncelle
            if (count > 0) {
                badge.classList.remove("hidden");
                badge.textContent = count;
                if (countText) countText.textContent = count;
            } else {
                badge.classList.add("hidden");
                if (countText) countText.textContent = "0";
            }

            if (!list) return;
            if (snap.empty) {
                list.innerHTML = `<div style="text-align:center;color:#888;padding:14px;font-size:13px;">✅ Onay bekleyen gönderi yok</div>`;
                return;
            }

            list.innerHTML = "";
            snap.forEach(doc => {
                const card = buildNostaljiCard(doc.id, doc.data(), true);
                list.appendChild(card);
            });
        });
}

function buildNostaljiCard(pid, p, isPending) {
    const reactions = p.reactions || {};
    const myReaction = currentUser ? reactions[currentUser.uid] : null;
    const emojiSayilari = {};
    Object.values(reactions).forEach(e => { emojiSayilari[e] = (emojiSayilari[e] || 0) + 1; });

    const reactionHTML = EMOJIS.map(e => {
        const count = emojiSayilari[e] || 0;
        return `<span class="reaction-btn ${myReaction === e ? "active" : ""}" onclick="reaksiyon('${pid}','${e}','nostalgia')">
            ${e}<span class="reaction-count">${count > 0 ? count : ""}</span>
        </span>`;
    }).join("");

    const mediaHTML = p.mediaUrl ? (
        p.mediaType === "video"
            ? `<video src="${p.mediaUrl}" controls class="post-media" preload="metadata"></video>`
            : `<img src="${p.mediaUrl}" class="post-media nostalji-img" onclick="resimTamEkran('${p.mediaUrl}')" loading="lazy">`
    ) : "";

    const approvalButtons = isPending && ayricaliklimi() ? `
        <div class="approval-btns">
            <button class="btn-approve" onclick="nostaljiGonderiOnayla('${pid}')">✅ Onayla</button>
            <button class="btn-reject" onclick="nostaljiGonderiReddet('${pid}')">❌ Reddet</button>
        </div>
    ` : "";

    const silBtn = (ayricaliklimi() && !isPending)
        ? `<button class="icon-btn delete-post-btn" onclick="nostaljiSil('${pid}')">🗑️</button>`
        : "";

    const card = document.createElement("div");
    card.className = `post-card nostalji-card ${isPending ? "nostalji-pending-card" : ""}`;
    card.innerHTML = `
        ${isPending ? `<div class="pending-label">⏳ Onay Bekliyor · ${escapeHtml(p.sender || "Anonim")} gönderdi</div>` : ""}
        <div class="post-header">
            <div class="post-avatar nostalji-avatar">📸</div>
            <div class="post-meta">
                <span class="post-sender">${escapeHtml(p.sender || "Anonim")}</span>
                ${p.year ? `<span class="nostalji-year-badge">📅 ${escapeHtml(p.year)}</span>` : ""}
                <span class="post-time">${zamanFarki(p.time)}</span>
            </div>
            ${silBtn}
        </div>
        ${p.title ? `<div class="post-title nostalji-title">${escapeHtml(p.title)}</div>` : ""}
        ${p.text ? `<div class="post-text">${escapeHtml(p.text)}</div>` : ""}
        ${mediaHTML}
        ${!isPending ? `
        <div class="post-actions">
            <div class="reactions-bar">${reactionHTML}</div>
            <div class="post-btns-row">
                <button class="comment-count-btn" onclick="yorumModalAc('${pid}','nostalgia')">
                    💬 ${p.commentCount || 0} Yorum
                </button>
            </div>
        </div>
        ` : ""}
        ${approvalButtons}
    `;
    return card;
}

async function nostaljiPaylas() {
    if (!currentUser) return alert("Giriş yapmalısınız!");
    const title = document.getElementById("nostaljiTitle").value.trim();
    const year = document.getElementById("nostaljiYear").value.trim();
    const text = document.getElementById("nostaljiText").value.trim();
    const file = document.getElementById("nostaljiFile").files[0];

    if (!title && !text && !file) return alert("En az bir şey ekleyin!");
    if (kufurKontrol(title + " " + text)) return alert("⚠️ Uygunsuz içerik tespit edildi!");

    const btn = document.getElementById("nostaljiBtn");
    btn.disabled = true;
    btn.textContent = "⏳ Yükleniyor...";

    try {
        let mediaUrl = "", mediaType = "";
        if (file) {
            const result = await cloudinaryYukle(file);
            mediaUrl = result.url;
            mediaType = result.type;
        }

        // Yetkililer direkt yayınlanır, normal üyeler onay bekler
        const isPrivileged = ayricaliklimi();
        const status = isPrivileged ? "published" : "pending";

        await db.collection("nostalgia").add({
            sender: userProfile.name,
            senderUid: currentUser.uid,
            senderRole: userProfile.rol || userProfile.role || "user",
            title, year, text,
            mediaUrl, mediaType,
            reactions: {},
            commentCount: 0,
            status,
            time: firebase.firestore.FieldValue.serverTimestamp()
        });

        ["nostaljiTitle", "nostaljiYear", "nostaljiText"].forEach(id => {
            document.getElementById(id).value = "";
        });
        document.getElementById("nostaljiFile").value = "";
        document.getElementById("nostaljiPreview").innerHTML = "";

        if (isPrivileged) {
            playApproveSound();
            alert("✅ Anı başarıyla yayınlandı!");
        } else {
            alert("✅ Anınız gönderildi!\n\nYetkililer onayladıktan sonra yayınlanacak.");
        }
    } catch(e) {
        alert("⚠️ Gönderilemedi: " + e.message);
    }

    btn.disabled = false;
    btn.textContent = "📸 Anıyı Gönder";
}

async function nostaljiGonderiOnayla(docId) {
    if (!ayricaliklimi()) return;
    try {
        await db.collection("nostalgia").doc(docId).update({
            status: "published",
            approvedBy: currentUser.uid,
            approvedByName: userProfile.name,
            approvedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        playApproveSound();
        alert("✅ Gönderi onaylandı ve yayınlandı!");
    } catch(e) { alert("Hata: " + e.message); }
}

async function nostaljiGonderiReddet(docId) {
    if (!ayricaliklimi()) return;
    if (!confirm("Bu gönderiyi reddetmek ve silmek istiyor musunuz?")) return;
    try {
        await db.collection("nostalgia").doc(docId).delete();
    } catch(e) { alert("Hata: " + e.message); }
}

async function nostaljiSil(docId) {
    if (!ayricaliklimi()) return;
    if (!confirm("Bu anıyı silmek istiyor musunuz?")) return;
    try {
        await db.collection("nostalgia").doc(docId).delete();
    } catch(e) { alert("Silinemedi: " + e.message); }
}

// ═══════════════════════════════════════════
//  YORUMLAR
// ═══════════════════════════════════════════

function yorumModalAc(postId, collection) {
    currentPostId = postId;
    currentCollection = collection || "announcements";
    document.getElementById("commentsModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";

    if (commentsUnsubscribe) commentsUnsubscribe();

    commentsUnsubscribe = db.collection(currentCollection).doc(postId)
        .collection("comments").orderBy("time", "asc")
        .onSnapshot(snap => {
            const list = document.getElementById("commentsList");
            if (snap.empty) {
                list.innerHTML = `<p class="no-comments">💬 Henüz yorum yok. İlk yorumu siz yapın!</p>`;
                return;
            }
            list.innerHTML = "";
            snap.forEach(doc => {
                const c = doc.data();
                const isMe = currentUser && c.uid === currentUser.uid;
                const canDelete = ayricaliklimi() || isMe;
                const item = document.createElement("div");
                item.className = "comment-item";
                item.innerHTML = `
                    <div class="comment-avatar">${(c.sender || "?")[0].toUpperCase()}</div>
                    <div class="comment-body">
                        <span class="comment-sender">${escapeHtml(c.sender || "Anonim")}</span>
                        <div class="comment-text">${escapeHtml(c.text)}</div>
                        <span class="comment-time">${zamanFarki(c.time)}</span>
                    </div>
                    ${canDelete ? `<button class="icon-btn-sm" style="color:#dc3545;" onclick="yorumSil('${postId}','${doc.id}')">🗑️</button>` : ""}
                `;
                list.appendChild(item);
            });
            list.scrollTop = list.scrollHeight;
        });
}

function modalKapat() {
    document.getElementById("commentsModal").classList.add("hidden");
    document.body.style.overflow = "";
    if (commentsUnsubscribe) { commentsUnsubscribe(); commentsUnsubscribe = null; }
    currentPostId = null;
}

async function yorumGonder() {
    if (!currentPostId || !currentUser) return;
    const text = document.getElementById("commentInput").value.trim();
    if (!text) return;
    if (kufurKontrol(text)) return alert("⚠️ Uygunsuz içerik!");

    try {
        await db.collection(currentCollection).doc(currentPostId).collection("comments").add({
            text,
            sender: userProfile.name,
            uid: currentUser.uid,
            time: firebase.firestore.FieldValue.serverTimestamp()
        });
        await db.collection(currentCollection).doc(currentPostId).update({
            commentCount: firebase.firestore.FieldValue.increment(1)
        });
        document.getElementById("commentInput").value = "";
    } catch(e) { alert("Yorum gönderilemedi!"); }
}

async function yorumSil(postId, commentId) {
    if (!confirm("Yorumu silmek istiyor musunuz?")) return;
    try {
        await db.collection(currentCollection).doc(postId).collection("comments").doc(commentId).delete();
        await db.collection(currentCollection).doc(postId).update({
            commentCount: firebase.firestore.FieldValue.increment(-1)
        });
    } catch(e) { alert("Silinemedi: " + e.message); }
}

// ═══════════════════════════════════════════
//  SOHBET (CHAT)
// ═══════════════════════════════════════════

function chatMediaSec(input) {
    chatMediaFile = input.files[0] || null;
    const bar = document.getElementById("chatMediaBar");
    const preview = document.getElementById("chatMediaPreview");
    if (!chatMediaFile) { bar.classList.add("hidden"); preview.innerHTML = ""; return; }
    bar.classList.remove("hidden");
    const url = URL.createObjectURL(chatMediaFile);
    if (chatMediaFile.type.startsWith("video")) {
        preview.innerHTML = `<video src="${url}" style="max-height:70px;border-radius:8px;" controls></video>`;
    } else {
        preview.innerHTML = `<img src="${url}" style="max-height:70px;border-radius:8px;">`;
    }
}

function chatMediaTemizle() {
    chatMediaFile = null;
    document.getElementById("chatFile").value = "";
    document.getElementById("chatMediaBar").classList.add("hidden");
    document.getElementById("chatMediaPreview").innerHTML = "";
}

function mesajlariDinle() {
    db.collection("chat").orderBy("time", "asc").limitToLast(60).onSnapshot(snap => {
        const box = document.getElementById("chatBox");
        const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;

        // 🔊 Yeni gelen mesaj sesi + 📲 Telefon bildirimi
        const newCount = snap.size;
        if (chatDocCount >= 0 && newCount > chatDocCount) {
            const docs = snap.docs;
            const newest = docs[docs.length - 1]?.data();
            if (newest && newest.uid !== currentUser?.uid) {
                playMessageSound();
                // Uygulama arka plandaysa telefon bildirimi gönder
                if (document.hidden) {
                    telefonBildirimi(
                        "💬 " + (newest.user || "Biri") + " mesaj gönderdi",
                        newest.text || "📷 Fotoğraf/Video",
                        "chat"
                    );
                }
            }
        }
        chatDocCount = newCount;

        box.innerHTML = "";
        if (snap.empty) {
            box.innerHTML = `<div style="text-align:center;color:#888;padding:20px;font-size:14px;">💬 İlk mesajı siz gönderin!</div>`;
            return;
        }
        snap.forEach(doc => {
            const m = doc.data();
            const isMe = currentUser && m.uid === currentUser.uid;
            const canDelete = ayricaliklimi() || isMe;

            const mediaHTML = m.mediaUrl ? (
                m.mediaType === "video"
                    ? `<video src="${m.mediaUrl}" controls class="chat-media" preload="metadata"></video>`
                    : `<img src="${m.mediaUrl}" class="chat-media" onclick="resimTamEkran('${m.mediaUrl}')" loading="lazy">`
            ) : "";

            const wrapper = document.createElement("div");
            wrapper.className = `msg-wrapper ${isMe ? "me" : "them"}`;
            wrapper.innerHTML = `
                <div class="msg-bubble">
                    ${!isMe ? `<span class="msg-sender">${escapeHtml(m.user || "Anonim")}</span>` : ""}
                    ${m.text ? `<span class="msg-text">${escapeHtml(m.text)}</span>` : ""}
                    ${mediaHTML}
                    <div class="msg-footer">
                        <span class="msg-time">${zamanFarki(m.time)}</span>
                        ${canDelete ? `<button class="msg-delete-btn" onclick="mesajSil('${doc.id}')" title="Sil">🗑️</button>` : ""}
                    </div>
                </div>
            `;
            box.appendChild(wrapper);
        });
        if (atBottom) box.scrollTop = box.scrollHeight;
    });
}

function enterMesaj(e) {
    if (e.key === "Enter" && !e.shiftKey) mesajGonder();
}

async function mesajGonder() {
    const text = document.getElementById("msgInput").value.trim();
    if (!text && !chatMediaFile) return;
    if (!currentUser) return alert("Giriş yapmalısınız!");
    if (kufurKontrol(text)) return alert("⚠️ Uygunsuz içerik!");

    const btn = document.getElementById("chatSendBtn");
    btn.disabled = true;

    try {
        let mediaUrl = "", mediaType = "";
        if (chatMediaFile) {
            const result = await cloudinaryYukle(chatMediaFile);
            mediaUrl = result.url;
            mediaType = result.type;
            chatMediaTemizle();
        }
        await db.collection("chat").add({
            text: text || "",
            mediaUrl, mediaType,
            user: userProfile.name,
            uid: currentUser.uid,
            time: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById("msgInput").value = "";
        const box = document.getElementById("chatBox");
        setTimeout(() => box.scrollTop = box.scrollHeight, 300);
    } catch(e) {
        alert("⚠️ Mesaj gönderilemedi: " + e.message);
    }

    btn.disabled = false;
}

async function mesajSil(msgId) {
    if (!confirm("Bu mesajı silmek istiyor musunuz?")) return;
    try { await db.collection("chat").doc(msgId).delete(); }
    catch(e) { alert("Silinemedi!"); }
}

// ═══════════════════════════════════════════
//  İŞLETMELER (FİRMALAR)
// ═══════════════════════════════════════════

function karistir(dizi) {
    const arr = [...dizi];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function isletmeleriYukle() {
    db.collection("businesses").onSnapshot(snap => {
        const container = document.getElementById("bizList");
        const empty = document.getElementById("bizEmpty");
        container.innerHTML = "";

        if (snap.empty) {
            empty.classList.remove("hidden");
            return;
        }
        empty.classList.add("hidden");

        let items = [];
        snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        items = karistir(items);

        items.forEach(b => {
            const card = document.createElement("div");
            card.className = "biz-card";
            // İletişim butonları - sadece dolu olanlar gösterilir
            const iletisimBtnleri = [];
            if (b.phone) iletisimBtnleri.push(`<a href="tel:${b.phone}" class="biz-iletisim-btn biz-btn-tel" title="Ara"><span>📞</span></a>`);
            if (b.whatsapp) iletisimBtnleri.push(`<a href="https://wa.me/${b.whatsapp.replace(/[^0-9]/g,'')}" target="_blank" class="biz-iletisim-btn biz-btn-wp" title="WhatsApp"><span>💬</span></a>`);
            if (b.email) iletisimBtnleri.push(`<a href="mailto:${b.email}" class="biz-iletisim-btn biz-btn-mail" title="E-posta"><span>✉️</span></a>`);
            if (b.url) iletisimBtnleri.push(`<a href="${b.url}" target="_blank" class="biz-iletisim-btn biz-btn-url" title="Web Sitesi"><span>🌐</span></a>`);

            card.innerHTML = `
                ${b.imageUrl
                    ? `<img src="${b.imageUrl}" class="biz-img" loading="lazy" alt="${escapeHtml(b.name)}">`
                    : `<div class="biz-img-placeholder">🏢</div>`
                }
                <div class="biz-body">
                    <div class="biz-cat">${escapeHtml(b.category || "İşletme")}</div>
                    <h3 class="biz-name">${escapeHtml(b.name)}</h3>
                    ${b.description ? `<p class="biz-desc">${escapeHtml(b.description)}</p>` : ""}
                    ${b.address ? `<p class="biz-addr">📍 ${escapeHtml(b.address)}</p>` : ""}
                    ${iletisimBtnleri.length > 0 ? `<div class="biz-iletisim-bar">${iletisimBtnleri.join("")}</div>` : ""}
                    ${adminMi() ? `
                        <div class="biz-admin-btns">
                            <button class="btn btn-danger btn-sm" onclick="firmaSil('${b.id}')">🗑️ Sil</button>
                        </div>
                    ` : ""}
                </div>
            `;
            container.appendChild(card);
        });
    });
}

async function firmaEkle() {
    if (!adminMi()) return alert("Yetkiniz yok!");
    const name = document.getElementById("bizName").value.trim();
    if (!name) return alert("Firma adı zorunludur!");

    const btn = document.getElementById("bizAddBtn");
    btn.disabled = true;
    btn.textContent = "⏳ Ekleniyor...";

    try {
        let imageUrl = "";
        const file = document.getElementById("bizFile").files[0];
        if (file) {
            const result = await cloudinaryYukle(file);
            imageUrl = result.url;
        }
        await db.collection("businesses").add({
            name,
            category: document.getElementById("bizCat").value.trim(),
            phone: document.getElementById("bizPhone").value.trim(),
            whatsapp: document.getElementById("bizWhatsapp").value.trim(),
            email: document.getElementById("bizEmail").value.trim(),
            url: document.getElementById("bizUrl").value.trim(),
            address: document.getElementById("bizAddr").value.trim(),
            description: document.getElementById("bizDesc").value.trim(),
            imageUrl,
            time: firebase.firestore.FieldValue.serverTimestamp()
        });
        ["bizName","bizCat","bizPhone","bizWhatsapp","bizEmail","bizUrl","bizAddr","bizDesc"].forEach(id => {
            document.getElementById(id).value = "";
        });
        document.getElementById("bizFile").value = "";
        document.getElementById("bizPreview").innerHTML = "";
        alert("✅ Firma başarıyla eklendi!");
    } catch(e) {
        alert("⚠️ Hata: " + e.message);
    }

    btn.disabled = false;
    btn.textContent = "🏢 Firma Ekle";
}

async function firmaSil(id) {
    if (!adminMi()) return;
    if (!confirm("Bu firmayı silmek istiyor musunuz?")) return;
    try { await db.collection("businesses").doc(id).delete(); }
    catch(e) { alert("Silinemedi!"); }
}

// ═══════════════════════════════════════════
//  AYARLAR - KULLANICI YÖNETİMİ
// ═══════════════════════════════════════════

function onlineListesiYukle() {
    db.collection("users").orderBy("lastSeen", "desc").onSnapshot(snap => {
        const list = document.getElementById("userList");
        if (snap.empty) { list.innerHTML = "<p style='color:#999;font-size:14px;'>Kullanıcı yok</p>"; return; }

        list.innerHTML = "";
        snap.forEach(doc => {
            const u = doc.data();
            const uid = doc.id;
            const basCelim = (u.name || "?")[0].toUpperCase();
            const isOnline = u.online === true;

            let rolBadge = "";
            if (u.role === "admin") rolBadge = `<span class="role-badge">Admin</span>`;
            else if (u.role === "muhtar") rolBadge = `<span class="role-badge muhtar">Muhtar</span>`;
            else if (u.role === "yardimci") rolBadge = `<span class="role-badge yardimci">Yardımcı</span>`;

            let adminBtns = "";
            if (adminMi() && uid !== currentUser?.uid) {
                adminBtns = `
                    <div class="user-admin-btns">
                        <button onclick="kullaniciBlokkla('${uid}', ${!u.blocked})"
                            class="icon-btn-sm" title="${u.blocked ? "Engeli Kaldır" : "Engelle"}">
                            ${u.blocked ? "🔓" : "🚫"}
                        </button>
                        <button onclick="kullaniciSil('${uid}')" class="icon-btn-sm" title="Sil" style="color:#dc3545;">🗑️</button>
                    </div>
                `;
            }

            const item = document.createElement("div");
            item.className = `user-item ${u.blocked ? "user-blocked" : ""}`;
            item.innerHTML = `
                <div class="user-avatar">${basCelim}</div>
                <div class="user-info">
                    <span class="user-name">${escapeHtml(u.name || "İsimsiz")}${rolBadge}</span>
                    <span class="user-status ${isOnline ? "status-online" : "status-offline"}">
                        ${isOnline ? "🟢 Çevrimiçi" : "⚫ Çevrimdışı"}
                        ${u.blocked ? " · 🚫 Engellenmiş" : ""}
                    </span>
                </div>
                ${adminBtns}
            `;
            list.appendChild(item);
        });
    });
}

async function kullaniciBlokkla(uid, shouldBlock) {
    if (!adminMi()) return;
    try {
        await db.collection("users").doc(uid).update({ blocked: shouldBlock });
        alert(shouldBlock ? "🚫 Kullanıcı engellendi!" : "✅ Engel kaldırıldı!");
    } catch(e) { alert("İşlem başarısız: " + e.message); }
}

async function kullaniciSil(uid) {
    if (!adminMi()) return;
    if (!confirm("Bu kullanıcıyı silmek istiyor musunuz? Bu işlem geri alınamaz!")) return;
    try {
        await db.collection("users").doc(uid).delete();
        alert("✅ Kullanıcı silindi.");
    } catch(e) { alert("Silinemedi: " + e.message); }
}

async function yetkiVer() {
    if (!adminMi()) return alert("Yetkiniz yok!");
    const email = document.getElementById("targetEmail").value.trim();
    const role = document.getElementById("targetRole").value;
    if (!email) return alert("E-posta girin!");
    try {
        const snap = await db.collection("users").where("email", "==", email).get();
        if (snap.empty) return alert("Kullanıcı bulunamadı!");
        const promises = [];
        snap.forEach(doc => promises.push(db.collection("users").doc(doc.id).update({ role })));
        await Promise.all(promises);
        document.getElementById("targetEmail").value = "";
        alert(`✅ ${email} kullanıcısına "${role}" yetkisi verildi!`);
    } catch(e) { alert("Hata: " + e.message); }
}

// ═══════════════════════════════════════════
//  GÖRÜŞ & ÖNERİ
// ═══════════════════════════════════════════

async function gorusBildir() {
    const text = document.getElementById("feedbackText").value.trim();
    if (!text) return alert("Lütfen bir şeyler yazın!");
    try {
        await db.collection("questions").add({
            text,
            sender: userProfile ? userProfile.name : "Anonim",
            uid: currentUser ? currentUser.uid : null,
            time: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById("feedbackText").value = "";
        alert("✅ Görüşünüz iletildi! Teşekkürler 🙏");
    } catch(e) { alert("Gönderilemedi: " + e.message); }
}

// ═══════════════════════════════════════════
//  PWA - SERVICE WORKER
// ═══════════════════════════════════════════

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(err => console.warn("SW:", err));
}


// ═══════════════════════════════════════════
//  REKLAM ALANI
// ═══════════════════════════════════════════

async function reklamYukle() {
    try {
        const snap = await db.collection("settings").doc("reklam").get();
        if (!snap.exists) return;
        const r = snap.data();
        if (!r.aktif) return;

        const alan = document.getElementById("reklamAlani");
        if (!alan) return;
        alan.classList.remove("hidden");

        const metin = document.getElementById("reklamMetin");
        const gorsel = document.getElementById("reklamGorsel");
        const link = document.getElementById("reklamLink");

        if (r.metin) metin.textContent = r.metin;
        if (r.gorselUrl) {
            gorsel.src = r.gorselUrl;
            gorsel.classList.remove("hidden");
        }
        if (r.link) {
            link.href = r.link;
        } else {
            link.style.pointerEvents = "none";
        }

        // Admin panelindeki checkbox'ı da güncelle
        const cb = document.getElementById("reklamAktif");
        if (cb) cb.checked = r.aktif;
        const metinInput = document.getElementById("reklamMetinInput");
        if (metinInput && r.metin) metinInput.value = r.metin;
        const linkInput = document.getElementById("reklamLinkInput");
        if (linkInput && r.link) linkInput.value = r.link;
    } catch(e) {
        console.warn("Reklam yüklenemedi:", e);
    }
}

async function reklamToggle() {
    if (!ayricaliklimi()) return;
    const aktif = document.getElementById("reklamAktif").checked;
    try {
        await db.collection("settings").doc("reklam").set({ aktif }, { merge: true });
        const alan = document.getElementById("reklamAlani");
        if (alan) alan.classList.toggle("hidden", !aktif);
    } catch(e) {
        alert("Hata: " + e.message);
    }
}

async function reklamKaydet() {
    if (!ayricaliklimi()) return alert("Yetkiniz yok!");
    const metin = document.getElementById("reklamMetinInput").value.trim();
    const link = document.getElementById("reklamLinkInput").value.trim();
    const aktif = document.getElementById("reklamAktif").checked;
    const file = document.getElementById("reklamFile").files[0];

    const btn = document.getElementById("reklamKaydetBtn");
    btn.disabled = true;
    btn.textContent = "⏳ Kaydediliyor...";

    try {
        let gorselUrl = "";
        if (file) {
            const result = await cloudinaryYukle(file);
            gorselUrl = result.url;
        }

        const veri = { aktif, metin, link };
        if (gorselUrl) veri.gorselUrl = gorselUrl;

        try {
            await db.collection("settings").doc("reklam").set(veri, { merge: true });
        } catch(permErr) {
            // Firebase Rules'da settings koleksiyonu izni yoksa uyar
            alert("⚠️ Firebase kurallarını güncellemelisiniz!\n\nFirestore → Rules sayfasına gidin ve 'settings' koleksiyonuna yazma izni ekleyin.\n\nDetay: " + permErr.message);
            btn.disabled = false;
            btn.textContent = "💾 Reklamı Kaydet";
            return;
        }

        // Görseli güncelle
        const alan = document.getElementById("reklamAlani");
        if (aktif) {
            alan.classList.remove("hidden");
            document.getElementById("reklamMetin").textContent = metin;
            const gorselEl = document.getElementById("reklamGorsel");
            if (gorselUrl) {
                gorselEl.src = gorselUrl;
                gorselEl.classList.remove("hidden");
            }
            const linkEl = document.getElementById("reklamLink");
            if (link) { linkEl.href = link; linkEl.style.pointerEvents = ""; }
        } else {
            alan.classList.add("hidden");
        }

        document.getElementById("reklamFile").value = "";
        document.getElementById("reklamPreview").innerHTML = "";
        alert("✅ Reklam kaydedildi!");
    } catch(e) {
        alert("Hata: " + e.message);
    }

    btn.disabled = false;
    btn.textContent = "💾 Reklamı Kaydet";
}

// ═══════════════════════════════════════════
//  FLOATING KÖŞE REKLAM
// ═══════════════════════════════════════════

let floatReklamKapatildi = false;

async function floatReklamYukle() {
    try {
        const snap = await db.collection("settings").doc("floatReklam").get();
        if (!snap.exists) return;
        const r = snap.data();
        if (!r.aktif) return;

        const alan = document.getElementById("floatingReklam");
        if (!alan) return;

        const metin = document.getElementById("floatingReklamMetin");
        const gorsel = document.getElementById("floatingReklamGorsel");
        const link = document.getElementById("floatingReklamLink");

        if (r.metin) metin.textContent = r.metin;
        if (r.gorselUrl) { gorsel.src = r.gorselUrl; gorsel.classList.remove("hidden"); }
        if (r.link) { link.href = r.link; link.style.pointerEvents = ""; }
        else link.style.pointerEvents = "none";

        if (!floatReklamKapatildi) alan.classList.remove("hidden");

        // Admin panelini güncelle
        const cb = document.getElementById("floatReklamAktif");
        if (cb) cb.checked = r.aktif;
        const mi = document.getElementById("floatReklamMetinInput");
        if (mi && r.metin) mi.value = r.metin;
        const li = document.getElementById("floatReklamLinkInput");
        if (li && r.link) li.value = r.link;
    } catch(e) { console.warn("Float reklam yüklenemedi:", e); }
}

function floatingReklamKapat() {
    floatReklamKapatildi = true;
    const alan = document.getElementById("floatingReklam");
    if (alan) alan.classList.add("hidden");
}

async function floatReklamToggle() {
    if (!ayricaliklimi()) return;
    const aktif = document.getElementById("floatReklamAktif").checked;
    try {
        await db.collection("settings").doc("floatReklam").set({ aktif }, { merge: true });
        const alan = document.getElementById("floatingReklam");
        if (alan) alan.classList.toggle("hidden", !aktif);
    } catch(e) { alert("Hata: " + e.message); }
}

async function floatReklamKaydet() {
    if (!ayricaliklimi()) return alert("Yetkiniz yok!");
    const metin = document.getElementById("floatReklamMetinInput").value.trim();
    const link = document.getElementById("floatReklamLinkInput").value.trim();
    const aktif = document.getElementById("floatReklamAktif").checked;
    const file = document.getElementById("floatReklamFile").files[0];

    const btn = document.getElementById("floatReklamKaydetBtn");
    btn.disabled = true; btn.textContent = "⏳ Kaydediliyor...";

    try {
        let gorselUrl = "";
        if (file) { const r = await cloudinaryYukle(file); gorselUrl = r.url; }
        const veri = { aktif, metin, link };
        if (gorselUrl) veri.gorselUrl = gorselUrl;

        await db.collection("settings").doc("floatReklam").set(veri, { merge: true });

        // UI güncelle
        document.getElementById("floatingReklamMetin").textContent = metin;
        const g = document.getElementById("floatingReklamGorsel");
        if (gorselUrl) { g.src = gorselUrl; g.classList.remove("hidden"); }
        const l = document.getElementById("floatingReklamLink");
        if (link) { l.href = link; l.style.pointerEvents = ""; }
        const alan = document.getElementById("floatingReklam");
        if (aktif) { floatReklamKapatildi = false; alan.classList.remove("hidden"); }
        else alan.classList.add("hidden");

        document.getElementById("floatReklamFile").value = "";
        document.getElementById("floatReklamPreview").innerHTML = "";
        alert("✅ Köşe reklam kaydedildi!");
    } catch(e) { alert("⚠️ Firebase kurallarını güncelleyin!\n\nDetay: " + e.message); }

    btn.disabled = false; btn.textContent = "💾 Kaydet";
}

// ═══════════════════════════════════════════
//  KÖY KOORDİNATLARI
// ═══════════════════════════════════════════



async function koyKoordYukle() {
    try {
        const snap = await db.collection("settings").doc("koordinat").get();
        if (snap.exists) {
            const d = snap.data();
            if (d.lat) koyLat = parseFloat(d.lat);
            if (d.lng) koyLng = parseFloat(d.lng);
            const latEl = document.getElementById("koyLat");
            const lngEl = document.getElementById("koyLng");
            if (latEl) latEl.value = koyLat;
            if (lngEl) lngEl.value = koyLng;
        }
    } catch(e) {}
}

async function koyKoordKaydet() {
    if (!ayricaliklimi()) return;
    const lat = parseFloat(document.getElementById("koyLat").value);
    const lng = parseFloat(document.getElementById("koyLng").value);
    if (isNaN(lat) || isNaN(lng)) return alert("Geçerli koordinat girin!");
    try {
        await db.collection("settings").doc("koordinat").set({ lat, lng });
        koyLat = lat; koyLng = lng;
        alert("✅ Koordinatlar kaydedildi!");
    } catch(e) { alert("Hata: " + e.message); }
}

// ═══════════════════════════════════════════
//  HAVA DURUMU (Open-Meteo API - Ücretsiz)
// ═══════════════════════════════════════════



async function havaDurumuYukle() {
    const w = document.getElementById("havaWidget");
    if (!w || w.dataset.loaded) return;
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${koyLat}&longitude=${koyLng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FIstanbul&forecast_days=7`;
        const res = await fetch(url);
        const d = await res.json();
        const cur = d.current;
        const daily = d.daily;
        const durum = HAVA_KODLAR[cur.weathercode] || "🌡️";
        
        let gunlerHTML = "";
        for (let i = 0; i < 7; i++) {
            const tarih = new Date(daily.time[i]);
            const gun = GUNLER[tarih.getDay()];
            const kod = daily.weathercode[i];
            const ikon = (HAVA_KODLAR[kod] || "🌡️").split(" ")[0];
            gunlerHTML += `
                <div class="hava-gun-kart">
                    <div class="hava-gun-ad">${gun}</div>
                    <div class="hava-gun-ikon">${ikon}</div>
                    <div class="hava-gun-sicak">${Math.round(daily.temperature_2m_max[i])}°</div>
                    <div style="font-size:11px;color:#aaa;">${Math.round(daily.temperature_2m_min[i])}°</div>
                </div>`;
        }
        
        w.innerHTML = `
            <div class="hava-kart">
                <div class="hava-sehir">📍 Emirler Köyü</div>
                <div class="hava-sicaklik">${Math.round(cur.temperature_2m)}°C</div>
                <div class="hava-durum">${durum}</div>
                <div class="hava-detay">
                    <div class="hava-detay-item">💧 Nem: %${cur.relative_humidity_2m}</div>
                    <div class="hava-detay-item">💨 Rüzgar: ${Math.round(cur.wind_speed_10m)} km/h</div>
                </div>
            </div>
            <div class="hava-gunler">${gunlerHTML}</div>`;
        w.dataset.loaded = "1";
    } catch(e) {
        w.innerHTML = `<div class="empty-state"><p>⚠️ Hava bilgisi alınamadı</p></div>`;
    }
}

// ═══════════════════════════════════════════
//  NAMAZ VAKİTLERİ (Aladhan API - Ücretsiz)
// ═══════════════════════════════════════════

async function namazYukle() {
    const w = document.getElementById("namazWidget");
    if (!w || w.dataset.loaded) return;
    try {
        const bugun = new Date();
        const gun = bugun.getDate();
        const ay = bugun.getMonth() + 1;
        const yil = bugun.getFullYear();
        const url = `https://api.aladhan.com/v1/timings/${gun}-${ay}-${yil}?latitude=${koyLat}&longitude=${koyLng}&method=13`;
        const res = await fetch(url);
        const d = await res.json();
        const t = d.data.timings;
        const vakitler = [
            { ad: "İmsak",   saat: t.Imsak },
            { ad: "Güneş",   saat: t.Sunrise },
            { ad: "Öğle",    saat: t.Dhuhr },
            { ad: "İkindi",  saat: t.Asr },
            { ad: "Akşam",   saat: t.Maghrib },
            { ad: "Yatsı",   saat: t.Isha }
        ];
        
        const simdi = bugun.getHours() * 60 + bugun.getMinutes();
        let siradaki = null;
        let aktifIdx = -1;
        
        vakitler.forEach((v, i) => {
            const [h, m] = v.saat.split(":").map(Number);
            const toplamDk = h * 60 + m;
            if (simdi < toplamDk && !siradaki) {
                siradaki = v;
                aktifIdx = i;
            }
        });
        
        const satirlar = vakitler.map((v, i) => `
            <div class="namaz-satir ${i === aktifIdx ? "aktif-vakit" : ""}">
                <span class="namaz-ad">${v.ad}</span>
                <span class="namaz-saat">${v.saat.substring(0,5)}</span>
            </div>`).join("");

        const tarihStr = bugun.toLocaleDateString("tr-TR", { weekday:"long", day:"numeric", month:"long" });
        
        w.innerHTML = `
            <div class="namaz-kart">
                <div class="namaz-tarih">📅 ${tarihStr}</div>
                <div class="namaz-listesi">${satirlar}</div>
            </div>
            ${siradaki ? `<div class="siradaki-vakit">⏰ Sıradaki vakit: <b>${siradaki.ad} - ${siradaki.saat.substring(0,5)}</b></div>` : ""}`;
        w.dataset.loaded = "1";
    } catch(e) {
        w.innerHTML = `<div class="empty-state"><p>⚠️ Namaz vakitleri alınamadı</p></div>`;
    }
}

// ═══════════════════════════════════════════
//  İLAN TAHTASI
// ═══════════════════════════════════════════

let ilanLoaded = false;
function ilanDinle() {
    if (ilanLoaded) return;
    ilanLoaded = true;
    
    // Onay bekleyenler (admin)
    if (ayricaliklimi()) {
        db.collection("ilanlar").where("status","==","pending").orderBy("time","asc")
        .onSnapshot(snap => {
            const list = document.getElementById("ilanPendingList");
            const badge = document.getElementById("ilanPendingCount");
            if (badge) badge.textContent = snap.size;
            if (!list) return;
            if (snap.empty) { list.innerHTML = `<div style="text-align:center;color:#888;padding:14px;font-size:13px;">✅ Bekleyen ilan yok</div>`; return; }
            list.innerHTML = "";
            snap.forEach(doc => list.appendChild(ilanKartOlustur(doc.id, doc.data(), true)));
        });
    }
    
    // Yayınlanmış ilanlar
    db.collection("ilanlar").where("status","==","published").orderBy("time","desc")
    .onSnapshot(snap => {
        const list = document.getElementById("ilanList");
        if (snap.empty) { list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Henüz ilan yok</p></div>`; return; }
        list.innerHTML = "";
        snap.forEach(doc => list.appendChild(ilanKartOlustur(doc.id, doc.data(), false)));
    }, () => {
        // Index yoksa filtresiz yükle
        db.collection("ilanlar").orderBy("time","desc").onSnapshot(snap => {
            const list = document.getElementById("ilanList");
            list.innerHTML = "";
            snap.forEach(doc => { if (doc.data().status === "published") list.appendChild(ilanKartOlustur(doc.id, doc.data(), false)); });
        });
    });
}

function ilanKartOlustur(id, d, isPending) {
    const div = document.createElement("div");
    div.className = "post-card ilan-kart";
    const mediaHTML = d.mediaUrl ? `<img src="${d.mediaUrl}" class="post-media" onclick="resimTamEkran('${d.mediaUrl}')" loading="lazy">` : "";
    const onayBtn = isPending && ayricaliklimi() ? `
        <div class="approval-btns">
            <button class="btn-approve" onclick="ilanOnayla('${id}')">✅ Onayla</button>
            <button class="btn-reject" onclick="ilanReddet('${id}')">❌ Reddet</button>
        </div>` : "";
    const silBtn = ayricaliklimi() && !isPending ? `<button class="icon-btn delete-post-btn" onclick="ilanSil('${id}')">🗑️</button>` : "";
    div.innerHTML = `
        ${isPending ? `<div class="pending-label">⏳ Onay Bekliyor · ${escapeHtml(d.sender||"")}</div>` : ""}
        <div class="ilan-kategori">${escapeHtml(d.kategori||"İlan")}</div>
        <div class="post-header" style="padding-top:6px;">
            <div class="post-meta">
                <span class="post-sender">${escapeHtml(d.baslik||"")}</span>
                <span class="post-time">${zamanFarki(d.time)}</span>
            </div>${silBtn}
        </div>
        ${d.metin ? `<div class="post-text">${escapeHtml(d.metin)}</div>` : ""}
        ${mediaHTML}
        ${d.telefon ? `<a href="tel:${d.telefon}" class="ilan-tel">📞 ${escapeHtml(d.telefon)}</a>` : ""}
        ${onayBtn}`;
    return div;
}

async function ilanPaylas() {
    if (!currentUser) return alert("Giriş yapın!");
    const kategori = document.getElementById("ilanKategori").value;
    const baslik = document.getElementById("ilanBaslik").value.trim();
    const metin = document.getElementById("ilanMetin").value.trim();
    const telefon = document.getElementById("ilanTelefon").value.trim();
    const file = document.getElementById("ilanFile").files[0];
    if (!kategori) return alert("Kategori seçin!");
    if (!baslik) return alert("Başlık zorunlu!");
    if (kufurKontrol(baslik + " " + metin)) return alert("⚠️ Uygunsuz içerik!");
    const btn = document.getElementById("ilanBtn");
    btn.disabled = true; btn.textContent = "⏳ Gönderiliyor...";
    try {
        let mediaUrl = "";
        if (file) { const r = await cloudinaryYukle(file); mediaUrl = r.url; }
        const isPriv = ayricaliklimi();
        await db.collection("ilanlar").add({
            kategori, baslik, metin, telefon, mediaUrl,
            sender: userProfile.name, senderUid: currentUser.uid,
            status: isPriv ? "published" : "pending",
            time: firebase.firestore.FieldValue.serverTimestamp()
        });
        ["ilanBaslik","ilanMetin","ilanTelefon"].forEach(id => document.getElementById(id).value = "");
        document.getElementById("ilanKategori").value = "";
        document.getElementById("ilanFile").value = "";
        document.getElementById("ilanPreview").innerHTML = "";
        alert(isPriv ? "✅ İlan yayınlandı!" : "✅ İlanınız admin onayına gönderildi!");
    } catch(e) { alert("Hata: " + e.message); }
    btn.disabled = false; btn.textContent = "📋 İlan Ver";
}

async function ilanOnayla(id) {
    if (!ayricaliklimi()) return;
    await db.collection("ilanlar").doc(id).update({ status: "published" });
    playApproveSound();
}
async function ilanReddet(id) {
    if (!confirm("Reddet ve sil?")) return;
    await db.collection("ilanlar").doc(id).delete();
}
async function ilanSil(id) {
    if (!confirm("İlanı sil?")) return;
    await db.collection("ilanlar").doc(id).delete();
}

// ═══════════════════════════════════════════
//  KÖYLÜ REHBERİ
// ═══════════════════════════════════════════

let rehberLoaded = false;
function rehberDinle() {
    if (rehberLoaded) return;
    rehberLoaded = true;
    if (ayricaliklimi()) {
        db.collection("rehber").where("status","==","pending").onSnapshot(snap => {
            const list = document.getElementById("rehberPendingList");
            if (!list) return;
            if (snap.empty) { list.innerHTML = `<div style="text-align:center;color:#888;padding:14px;font-size:13px;">✅ Bekleyen kayıt yok</div>`; return; }
            list.innerHTML = "";
            snap.forEach(doc => {
                const d = doc.data();
                const div = document.createElement("div");
                div.className = "post-card";
                div.innerHTML = `
                    <div class="pending-label">⏳ Onay Bekliyor</div>
                    <div class="post-header">
                        <div class="post-meta">
                            <span class="post-sender">${escapeHtml(d.ad)}</span>
                            <span class="post-time">${escapeHtml(d.telefon)}</span>
                        </div>
                    </div>
                    <div class="approval-btns">
                        <button class="btn-approve" onclick="rehberOnayla('${doc.id}')">✅ Onayla</button>
                        <button class="btn-reject" onclick="rehberReddet('${doc.id}')">❌ Reddet</button>
                    </div>`;
                list.appendChild(div);
            });
        });
    }
    db.collection("rehber").where("status","==","published").orderBy("ad","asc")
    .onSnapshot(snap => {
        const list = document.getElementById("rehberList");
        if (snap.empty) { list.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>Henüz rehberde kimse yok</p></div>`; return; }
        list.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement("div");
            div.className = "rehber-kart";
            div.innerHTML = `
                <div class="rehber-avatar">${(d.ad||"?")[0].toUpperCase()}</div>
                <div style="flex:1;min-width:0;">
                    <div class="rehber-ad">${escapeHtml(d.ad)}</div>
                    <div class="rehber-bilgi">${d.mahalle ? "📍 " + escapeHtml(d.mahalle) : ""}${d.meslek ? " · " + escapeHtml(d.meslek) : ""}</div>
                </div>
                <a href="tel:${d.telefon}" class="rehber-tel">📞</a>
                ${ayricaliklimi() ? `<button class="icon-btn-sm" style="color:#dc3545;" onclick="rehberSil('${doc.id}')">🗑️</button>` : ""}`;
            list.appendChild(div);
        });
    }, () => {
        db.collection("rehber").onSnapshot(snap => {
            const list = document.getElementById("rehberList");
            list.innerHTML = "";
            snap.forEach(doc => {
                if (doc.data().status !== "published") return;
                const d = doc.data();
                const div = document.createElement("div");
                div.className = "rehber-kart";
                div.innerHTML = `<div class="rehber-avatar">${(d.ad||"?")[0].toUpperCase()}</div><div style="flex:1;"><div class="rehber-ad">${escapeHtml(d.ad)}</div><div class="rehber-bilgi">${d.mahalle||""}</div></div><a href="tel:${d.telefon}" class="rehber-tel">📞</a>`;
                list.appendChild(div);
            });
        });
    });
}

async function rehbereKayit() {
    if (!currentUser) return alert("Giriş yapın!");
    const ad = document.getElementById("rehberAd").value.trim();
    const telefon = document.getElementById("rehberTelefon").value.trim();
    const mahalle = document.getElementById("rehberMahalle").value.trim();
    const meslek = document.getElementById("rehberMeslek").value.trim();
    if (!ad || !telefon) return alert("Ad ve telefon zorunlu!");
    const btn = document.getElementById("rehberBtn");
    btn.disabled = true; btn.textContent = "⏳...";
    try {
        const isPriv = ayricaliklimi();
        await db.collection("rehber").add({ ad, telefon, mahalle, meslek, senderUid: currentUser.uid, status: isPriv ? "published" : "pending", time: firebase.firestore.FieldValue.serverTimestamp() });
        ["rehberAd","rehberTelefon","rehberMahalle","rehberMeslek"].forEach(id => document.getElementById(id).value = "");
        alert(isPriv ? "✅ Rehbere eklendi!" : "✅ Admin onayına gönderildi!");
    } catch(e) { alert("Hata: " + e.message); }
    btn.disabled = false; btn.textContent = "👥 Kayıt İste";
}
async function rehberOnayla(id) { await db.collection("rehber").doc(id).update({ status: "published" }); playApproveSound(); }
async function rehberReddet(id) { if (confirm("Reddet?")) await db.collection("rehber").doc(id).delete(); }
async function rehberSil(id) { if (confirm("Sil?")) await db.collection("rehber").doc(id).delete(); }

// ═══════════════════════════════════════════
//  ANKET
// ═══════════════════════════════════════════

let anketLoaded = false;
function anketDinle() {
    if (anketLoaded) return;
    anketLoaded = true;
    db.collection("anketler").orderBy("time","desc").onSnapshot(snap => {
        const list = document.getElementById("anketList");
        if (snap.empty) { list.innerHTML = `<div class="empty-state"><div class="empty-icon">🗳️</div><p>Henüz anket yok</p></div>`; return; }
        list.innerHTML = "";
        snap.forEach(doc => list.appendChild(anketKartOlustur(doc.id, doc.data())));
    });
}

function anketKartOlustur(id, d) {
    const div = document.createElement("div");
    div.className = "post-card anket-kart";
    const secenekler = d.secenekler || [];
    const oylar = d.oylar || {};
    const benimOyum = currentUser ? oylar[currentUser.uid] : null;
    const toplamOy = Object.keys(oylar).length;
    
    const secenekHTML = secenekler.map((s, i) => {
        const oy = Object.values(oylar).filter(v => v === i).length;
        const yuzde = toplamOy > 0 ? Math.round((oy/toplamOy)*100) : 0;
        return `<button class="anket-secenek ${benimOyum === i ? 'secildi' : ''}" onclick="anketOy('${id}',${i})">
            <span>${escapeHtml(s)}</span>
            <span style="font-weight:700;">${benimOyum !== null ? yuzde + '%' : ''}</span>
        </button>
        ${benimOyum !== null ? `<div class="anket-bar" style="width:${yuzde}%;max-width:100%;margin:0 14px 6px;"></div>` : ''}`;
    }).join("");
    
    div.innerHTML = `
        <div class="post-header">
            <div class="post-meta">
                <span class="post-sender">🗳️ Köy Anketi</span>
                <span class="post-time">${zamanFarki(d.time)}</span>
            </div>
            ${ayricaliklimi() ? `<button class="icon-btn delete-post-btn" onclick="anketSil('${id}')">🗑️</button>` : ""}
        </div>
        <div class="anket-soru">${escapeHtml(d.soru)}</div>
        <div style="padding:0 14px 6px;">${secenekHTML}</div>
        <div class="anket-katilimci" style="padding:0 14px 12px;">👥 ${toplamOy} katılımcı</div>`;
    return div;
}

async function anketOy(anketId, secenekIndex) {
    if (!currentUser) return alert("Giriş yapın!");
    const ref = db.collection("anketler").doc(anketId);
    const snap = await ref.get();
    const oylar = { ...(snap.data().oylar || {}) };
    if (oylar[currentUser.uid] === secenekIndex) delete oylar[currentUser.uid];
    else oylar[currentUser.uid] = secenekIndex;
    await ref.update({ oylar });
    playLikeSound();
}

async function anketOlustur() {
    if (!ayricaliklimi()) return alert("Yetkiniz yok!");
    const soru = document.getElementById("anketSoru").value.trim();
    const s1 = document.getElementById("anketSecenek1").value.trim();
    const s2 = document.getElementById("anketSecenek2").value.trim();
    const s3 = document.getElementById("anketSecenek3").value.trim();
    const s4 = document.getElementById("anketSecenek4").value.trim();
    if (!soru || !s1 || !s2) return alert("Soru ve en az 2 seçenek zorunlu!");
    const secenekler = [s1, s2, ...(s3 ? [s3] : []), ...(s4 ? [s4] : [])];
    const btn = document.getElementById("anketBtn");
    btn.disabled = true; btn.textContent = "⏳...";
    try {
        await db.collection("anketler").add({ soru, secenekler, oylar: {}, sender: userProfile.name, time: firebase.firestore.FieldValue.serverTimestamp() });
        ["anketSoru","anketSecenek1","anketSecenek2","anketSecenek3","anketSecenek4"].forEach(id => document.getElementById(id).value = "");
        playApproveSound();
    } catch(e) { alert("Hata: " + e.message); }
    btn.disabled = false; btn.textContent = "🗳️ Anketi Yayınla";
}
async function anketSil(id) { if (confirm("Anketi sil?")) await db.collection("anketler").doc(id).delete(); }

// ═══════════════════════════════════════════
//  TARIM TAKVİMİ
// ═══════════════════════════════════════════

let tarimLoaded = false;
function tarimDinle() {
    if (tarimLoaded) return;
    tarimLoaded = true;
    db.collection("tarim").orderBy("time","desc").onSnapshot(snap => {
        const list = document.getElementById("tarimList");
        if (snap.empty) { list.innerHTML = `<div class="empty-state"><div class="empty-icon">🌾</div><p>Tarım takvimi henüz boş</p></div>`; return; }
        list.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            const div = document.createElement("div");
            div.className = "post-card tarim-kart";
            div.innerHTML = `
                <div class="tarim-ay">${escapeHtml(d.ay || "")}</div>
                <div class="post-header">
                    <div class="post-meta">
                        <span class="post-sender">${escapeHtml(d.baslik)}</span>
                        <span class="post-time">${zamanFarki(d.time)}</span>
                    </div>
                    ${ayricaliklimi() ? `<button class="icon-btn delete-post-btn" onclick="tarimSil('${doc.id}')">🗑️</button>` : ""}
                </div>
                ${d.metin ? `<div class="post-text">${escapeHtml(d.metin)}</div>` : ""}`;
            list.appendChild(div);
        });
    });
}

async function tarimNotuEkle() {
    if (!ayricaliklimi()) return alert("Yetkiniz yok!");
    const ay = document.getElementById("tarimAy").value;
    const baslik = document.getElementById("tarimBaslik").value.trim();
    const metin = document.getElementById("tarimMetin").value.trim();
    if (!ay || !baslik) return alert("Ay ve başlık zorunlu!");
    try {
        await db.collection("tarim").add({ ay, baslik, metin, sender: userProfile.name, time: firebase.firestore.FieldValue.serverTimestamp() });
        document.getElementById("tarimAy").value = "";
        document.getElementById("tarimBaslik").value = "";
        document.getElementById("tarimMetin").value = "";
        playApproveSound();
    } catch(e) { alert("Hata: " + e.message); }
}
async function tarimSil(id) { if (confirm("Sil?")) await db.collection("tarim").doc(id).delete(); }

// ═══════════════════════════════════════════
//  LİDER TABLOSU
// ═══════════════════════════════════════════

async function liderYukle() {
    const list = document.getElementById("liderList");
    if (!list || list.dataset.loaded) return;
    list.dataset.loaded = "1";
    try {
        // Kullanıcıları al ve puan hesapla
        const [usersSnap, chatSnap, nostalSnap] = await Promise.all([
            db.collection("users").get(),
            db.collection("chat").get(),
            db.collection("nostalgia").where("status","==","published").get()
        ]);
        
        const puanlar = {};
        // Chat mesajı başına 1 puan
        chatSnap.forEach(doc => {
            const uid = doc.data().uid;
            if (uid) puanlar[uid] = (puanlar[uid] || 0) + 1;
        });
        // Nostalji paylaşımı başına 3 puan
        nostalSnap.forEach(doc => {
            const uid = doc.data().senderUid;
            if (uid) puanlar[uid] = (puanlar[uid] || 0) + 3;
        });
        
        const kullanicilar = [];
        usersSnap.forEach(doc => {
            const d = doc.data();
            const puan = puanlar[doc.id] || 0;
            if (puan > 0) kullanicilar.push({ ad: d.name || "İsimsiz", puan });
        });
        kullanicilar.sort((a,b) => b.puan - a.puan);
        const top = kullanicilar.slice(0, 10);
        
        const MADALYALAR = ["🥇","🥈","🥉"];
        list.innerHTML = "";
        top.forEach((k, i) => {
            const div = document.createElement("div");
            div.className = "lider-kart";
            div.innerHTML = `
                <div class="lider-siralama">${MADALYALAR[i] || (i+1)}</div>
                <div class="lider-avatar">${k.ad[0].toUpperCase()}</div>
                <div>
                    <div class="lider-ad">${escapeHtml(k.ad)}</div>
                    <div class="lider-puan">⭐ ${k.puan} puan</div>
                </div>`;
            list.appendChild(div);
        });
        if (top.length === 0) list.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><p>Henüz sıralama yok</p></div>`;
    } catch(e) {
        list.innerHTML = `<div class="empty-state"><p>⚠️ Yüklenemedi</p></div>`;
    }
}

// ═══════════════════════════════════════════
//  AKORDEON (Köy sayfası açmalı-kapatmalı)
// ═══════════════════════════════════════════

const akordeonAcik = {};

function akordeonToggle(id) {
    const icerik = document.getElementById("icerik-" + id);
    const ok = document.getElementById("ok-" + id);
    if (!icerik) return;
    const acik = !icerik.classList.contains("hidden");
    icerik.classList.toggle("hidden", acik);
    if (ok) ok.textContent = acik ? "▼" : "▲";
    akordeonAcik[id] = !acik;
}

// ═══════════════════════════════════════════
//  İLAN TAHTASI (Ayrı sekme)
// ═══════════════════════════════════════════

let ilanlarDinleBasladi = false;
let aktifIlanFiltre = "hepsi";
const ILAN_KAT = { satilik:"🏷️ Satılık", kiralik:"🔑 Kiralık", araniyor:"🔍 Aranıyor", kayip:"⚠️ Kayıp", diger:"📌 Diğer" };

function ilanFormToggle() {
    const f = document.getElementById("ilanFormDiv");
    f.classList.toggle("hidden");
}

function ilanFiltre(kat, btn) {
    aktifIlanFiltre = kat;
    document.querySelectorAll(".ilan-filtre-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    ilanlarDinle();
}

let ilanUnsubscribe = null;
function ilanlarDinle() {
    if (ilanUnsubscribe) ilanUnsubscribe();
    let q = db.collection("ilanlar").orderBy("time","desc");
    ilanUnsubscribe = q.onSnapshot(snap => {
        const list = document.getElementById("ilanList");
        if (!list) return;
        let docs = [];
        snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
        if (aktifIlanFiltre !== "hepsi") docs = docs.filter(d => d.kategori === aktifIlanFiltre);
        if (docs.length === 0) { list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Bu kategoride ilan yok</p></div>`; return; }
        list.innerHTML = "";
        docs.forEach(il => {
            const silBtn = (ayricaliklimi() || (currentUser && il.uid === currentUser.uid)) ? `<button class="ilan-sil-btn" onclick="ilanSil('${il.id}')">🗑️</button>` : "";
            const fotograflar = il.fotograflar || (il.fotografUrl ? [il.fotografUrl] : []);
            const fotoHTML = fotograflar.length > 0 ? `
                <div class="ilan-foto-slayt">
                    ${fotograflar.map(url => `<img src="${url}" class="ilan-foto-img" onclick="resimTamEkran('${url}')" loading="lazy">`).join("")}
                </div>` : "";
            const div = document.createElement("div");
            div.className = "post-card";
            div.innerHTML = `
                <div class="post-header">
                    <div class="post-avatar" style="background:linear-gradient(135deg,#ff9800,#e65100);">${(il.sender||"?")[0].toUpperCase()}</div>
                    <div class="post-meta">
                        <span class="post-sender">${escapeHtml(il.sender||"Anonim")} <span class="ilan-kat-badge">${ILAN_KAT[il.kategori]||"📌"}</span></span>
                        <span class="post-time">${zamanFarki(il.time)}</span>
                    </div>
                    ${silBtn}
                </div>
                ${fotoHTML}
                <div class="post-title">${escapeHtml(il.baslik||"")}</div>
                ${il.aciklama ? `<div class="post-text">${escapeHtml(il.aciklama)}</div>` : ""}
                ${il.telefon ? `<div style="padding:8px 14px 12px;"><a href="tel:${il.telefon}" class="ilan-tel-btn">📞 ${escapeHtml(il.telefon)}</a></div>` : ""}
            `;
            list.appendChild(div);
        });
    });
}

function ilanFotoOnizle(input) {
    const div = document.getElementById("ilanFotoOnizleDiv");
    div.innerHTML = "";
    const files = Array.from(input.files).slice(0, 5);
    files.forEach(f => {
        const url = URL.createObjectURL(f);
        div.innerHTML += `<img src="${url}" class="ilan-onizle-img">`;
    });
}

async function ilanPaylas() {
    if (!currentUser) return alert("Giriş yapmalısınız!");
    const baslik = document.getElementById("ilanBaslik").value.trim();
    const aciklama = document.getElementById("ilanAciklama").value.trim();
    const telefon = document.getElementById("ilanTelefon").value.trim();
    const kategori = document.getElementById("ilanKategori").value;
    const files = Array.from(document.getElementById("ilanFotolar").files).slice(0, 5);
    if (!baslik) return alert("Başlık zorunludur!");
    if (kufurKontrol(baslik + " " + aciklama)) return alert("⚠️ Uygunsuz içerik!");
    const btn = document.getElementById("ilanPaylasBtnMain");
    btn.disabled = true; btn.textContent = "⏳ Yükleniyor...";
    try {
        const fotograflar = [];
        for (const f of files) {
            const r = await cloudinaryYukle(f);
            fotograflar.push(r.url);
        }
        await db.collection("ilanlar").add({ baslik, aciklama, telefon, kategori, fotograflar, sender: userProfile.name, uid: currentUser.uid, time: firebase.firestore.FieldValue.serverTimestamp() });
        ["ilanBaslik","ilanAciklama","ilanTelefon"].forEach(id => document.getElementById(id).value = "");
        document.getElementById("ilanFotolar").value = "";
        document.getElementById("ilanFotoOnizleDiv").innerHTML = "";
        document.getElementById("ilanFormDiv").classList.add("hidden");
        alert("✅ İlanınız yayınlandı!");
    } catch(e) { alert("Hata: " + e.message); }
    btn.disabled = false; btn.textContent = "📋 İlanı Yayınla";
}

async function ilanSil(id) {
    if (!confirm("İlanı silmek istiyor musunuz?")) return;
    try { await db.collection("ilanlar").doc(id).delete(); } catch(e) { alert("Silinemedi!"); }
}

// ═══════════════════════════════════════════
//  NUMARA PAYLAŞIMI
// ═══════════════════════════════════════════

async function numaramiYukle() {
    if (!currentUser) return;
    try {
        const snap = await db.collection("rehber").doc(currentUser.uid).get();
        const div = document.getElementById("benimNumaramDiv");
        if (!div) return;
        if (snap.exists) {
            const d = snap.data();
            div.innerHTML = `<div class="mevcut-numara">✅ Kayıtlı numaranız: <b>${escapeHtml(d.tel)}</b> ${d.not ? `(${escapeHtml(d.not)})` : ""}</div>`;
            document.getElementById("numaraInput").value = d.tel;
            document.getElementById("numaraNotInput").value = d.not || "";
        } else {
            div.innerHTML = "";
        }
    } catch(e) {}
}

async function numaramiPaylas() {
    if (!currentUser) return alert("Giriş yapmalısınız!");
    const tel = document.getElementById("numaraInput").value.trim();
    const not = document.getElementById("numaraNotInput").value.trim();
    if (!tel) return alert("Telefon numarası zorunludur!");
    try {
        await db.collection("rehber").doc(currentUser.uid).set({ ad: userProfile.name, tel, not, uid: currentUser.uid, time: firebase.firestore.FieldValue.serverTimestamp() });
        numaramiYukle();
        alert("✅ Numaranız kaydedildi!");
    } catch(e) { alert("Hata: " + e.message); }
}

// ═══════════════════════════════════════════
//  HAVA DURUMU (düzeltilmiş)
// ═══════════════════════════════════════════

const HAVA_KODLAR = {
    0:"☀️ Açık",1:"🌤️ Az Bulutlu",2:"⛅ Parçalı",3:"☁️ Kapalı",
    45:"🌫️ Sis",51:"🌦️ Çisenti",61:"🌧️ Yağmurlu",63:"🌧️ Yağmurlu",
    71:"🌨️ Karlı",73:"❄️ Karlı",80:"🌦️ Sağanak",81:"⛈️ Fırtına",95:"⛈️ Fırtına"
};
const GUNLER = ["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];
// Köy koordinatları yukarıda tanımlandı

let havaYuklendi = false;
async function havaDurumuYukle() {
    const w = document.getElementById("havaWidget");
    if (!w) return;
    if (havaYuklendi) return;
    w.innerHTML = `<div class="loading-spinner">⏳ Yükleniyor...</div>`;
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${koyLat}&longitude=${koyLng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FIstanbul&forecast_days=7`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("API hatası");
        const d = await res.json();
        const cur = d.current;
        const daily = d.daily;
        const durum = HAVA_KODLAR[cur.weathercode] || "🌡️";
        let gunlerHTML = "";
        for (let i = 0; i < 7; i++) {
            const tarih = new Date(daily.time[i]);
            const gun = i === 0 ? "Bug." : GUNLER[tarih.getDay()];
            const ikon = (HAVA_KODLAR[daily.weathercode[i]] || "🌡️").split(" ")[0];
            gunlerHTML += `<div class="hava-gun-kart"><div class="hava-gun-ad">${gun}</div><div class="hava-gun-ikon">${ikon}</div><div class="hava-gun-sicak">${Math.round(daily.temperature_2m_max[i])}°</div><div style="font-size:11px;color:#aaa;">${Math.round(daily.temperature_2m_min[i])}°</div></div>`;
        }
        w.innerHTML = `
            <div class="hava-kart">
                <div class="hava-sehir">📍 Emirler Köyü</div>
                <div class="hava-sicaklik">${Math.round(cur.temperature_2m)}°C</div>
                <div class="hava-durum">${durum}</div>
                <div class="hava-detay">
                    <div class="hava-detay-item">💧 Nem: %${cur.relative_humidity_2m}</div>
                    <div class="hava-detay-item">💨 Rüzgar: ${Math.round(cur.wind_speed_10m)} km/h</div>
                </div>
            </div>
            <div class="hava-gunler">${gunlerHTML}</div>`;
        havaYuklendi = true;
    } catch(e) {
        w.innerHTML = `<div style="text-align:center;padding:20px;color:#888;">⚠️ Hava bilgisi alınamadı<br><small>İnternet bağlantınızı kontrol edin</small></div>`;
        havaYuklendi = false;
    }
}

// ═══════════════════════════════════════════
//  NAMAZ VAKİTLERİ
// ═══════════════════════════════════════════

let namazYuklendi = false;
async function namazYukle() {
    const w = document.getElementById("namazWidget");
    if (!w || namazYuklendi) return;
    w.innerHTML = `<div class="loading-spinner">⏳ Yükleniyor...</div>`;
    try {
        const bugun = new Date();
        const url = `https://api.aladhan.com/v1/timings/${bugun.getDate()}-${bugun.getMonth()+1}-${bugun.getFullYear()}?latitude=${koyLat}&longitude=${koyLng}&method=13`;
        const res = await fetch(url);
        const d = await res.json();
        const v = d.data.timings;
        const fmt = s => s.split(" ")[0];
        const satir = (ikon, ad, saat) => `<div class="namaz-satir"><span class="namaz-ikon">${ikon}</span><span class="namaz-ad">${ad}</span><span class="namaz-saat">${fmt(saat)}</span></div>`;
        w.innerHTML = `
            <div class="namaz-tarih">📅 ${d.data.date.readable}</div>
            ${satir("🌅","İmsak",v.Fajr)}${satir("☀️","Güneş",v.Sunrise)}
            ${satir("🌞","Öğle",v.Dhuhr)}${satir("🌇","İkindi",v.Asr)}
            ${satir("🌆","Akşam",v.Maghrib)}${satir("🌙","Yatsı",v.Isha)}`;
        namazYuklendi = true;
    } catch(e) {
        w.innerHTML = `<div style="text-align:center;padding:16px;color:#888;">⚠️ Vakit bilgisi alınamadı</div>`;
    }
}

// ═══════════════════════════════════════════
//  TARIM TAKVİMİ
// ═══════════════════════════════════════════

const TARIM_VARSAYILAN = [
    {ay:"Ocak",is:"❄️ Budama dönemi, meyve ağaçlarını budayın"},
    {ay:"Şubat",is:"🌱 Tohum hazırlığı, gübre takviyesi"},
    {ay:"Mart",is:"🌾 Buğday ekimi, sebze fidesi dikimi"},
    {ay:"Nisan",is:"🌸 Bahar bakımı, sulama başlangıcı"},
    {ay:"Mayıs",is:"🌿 Çapalama, ilaçlama dönemi"},
    {ay:"Haziran",is:"☀️ Biçerdöver hazırlığı, hasat başlangıcı"},
    {ay:"Temmuz",is:"🌾 Buğday hasadı, saman toplama"},
    {ay:"Ağustos",is:"🍎 Meyve hasadı, kış sebzesi ekimi"},
    {ay:"Eylül",is:"🍂 Üzüm hasadı, soğan ekimi"},
    {ay:"Ekim",is:"🌱 Sonbahar ekimleri, kışlık bakım"},
    {ay:"Kasım",is:"🍂 Ağaç bakımı, depolama hazırlığı"},
    {ay:"Aralık",is:"❄️ Kış dinlendirme, planlama dönemi"}
];
const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

async function tarimDinle() {
    const w = document.getElementById("tarimWidget");
    if (!w) return;
    try {
        const snap = await db.collection("settings").doc("tarim").get();
        const liste = (snap.exists && snap.data().liste?.length > 0) ? snap.data().liste : TARIM_VARSAYILAN;
        const buAy = AYLAR[new Date().getMonth()];
        w.innerHTML = liste.map((t, i) => `
            <div class="tarim-satir ${t.ay === buAy ? "tarim-bu-ay" : ""}">
                <span class="tarim-ay">${t.ay}</span>
                <span class="tarim-is">${t.is}</span>
                ${ayricaliklimi() ? `<button class="ilan-sil-btn" onclick="tarimSil(${i})">🗑️</button>` : ""}
            </div>`).join("");
    } catch(e) { if (w) w.innerHTML = TARIM_VARSAYILAN.map(t => `<div class="tarim-satir"><span class="tarim-ay">${t.ay}</span><span class="tarim-is">${t.is}</span></div>`).join(""); }
}

async function tarimEkle() {
    if (!ayricaliklimi()) return alert("Yetkiniz yok!");
    const ay = document.getElementById("tarimAy").value.trim();
    const is = document.getElementById("tarimIs").value.trim();
    if (!ay || !is) return alert("Ay ve iş açıklaması zorunludur!");
    try {
        const snap = await db.collection("settings").doc("tarim").get();
        const liste = (snap.exists && snap.data().liste) ? snap.data().liste : [...TARIM_VARSAYILAN];
        liste.push({ ay, is });
        await db.collection("settings").doc("tarim").set({ liste }, { merge: true });
        document.getElementById("tarimAy").value = "";
        document.getElementById("tarimIs").value = "";
        tarimDinle(); alert("✅ Takvime eklendi!");
    } catch(e) { alert("Hata: " + e.message); }
}

async function tarimSil(index) {
    if (!ayricaliklimi()) return;
    try {
        const snap = await db.collection("settings").doc("tarim").get();
        const liste = snap.exists ? [...(snap.data().liste || [])] : [];
        liste.splice(index, 1);
        await db.collection("settings").doc("tarim").set({ liste }, { merge: true });
        tarimDinle();
    } catch(e) { alert("Silinemedi!"); }
}

// ═══════════════════════════════════════════
//  HAYVAN AŞI TAKVİMİ
// ═══════════════════════════════════════════

const ASI_LISTESI = [
    {hayvan:"🐄 Sığır", asi:"Şap Aşısı", ay:"Şubat - Nisan", periyot:"Yılda 2 kez"},
    {hayvan:"🐄 Sığır", asi:"Brucella Aşısı", ay:"Mart - Mayıs", periyot:"Doğumdan 3-6 ay sonra"},
    {hayvan:"🐄 Sığır", asi:"Mavi Dil Aşısı", ay:"Eylül - Ekim", periyot:"Yılda 1 kez"},
    {hayvan:"🐑 Koyun/Keçi", asi:"Şap Aşısı", ay:"Şubat - Nisan", periyot:"Yılda 2 kez"},
    {hayvan:"🐑 Koyun/Keçi", asi:"Enterotoksemi", ay:"Ekim - Kasım", periyot:"Kuzuluğa 1 ay kala"},
    {hayvan:"🐑 Koyun/Keçi", asi:"Çiçek Aşısı", ay:"Eylül - Ekim", periyot:"Yılda 1 kez"},
    {hayvan:"🐔 Kümes", asi:"Newcastle Aşısı", ay:"Her mevsim", periyot:"3 ayda bir"},
    {hayvan:"🐔 Kümes", asi:"Marek Aşısı", ay:"Kuluçka çıkışı", periyot:"Tek doz"},
    {hayvan:"🐕 Köpek", asi:"Kuduz Aşısı", ay:"Yıl boyu", periyot:"Yılda 1 kez (zorunlu)"},
];

function asiYukle() {
    const w = document.getElementById("asiWidget");
    if (!w) return;
    w.innerHTML = ASI_LISTESI.map(a => `
        <div class="asi-satir">
            <div class="asi-hayvan">${a.hayvan}</div>
            <div class="asi-bilgi">
                <div class="asi-ad">${a.asi}</div>
                <div class="asi-detay">📅 ${a.ay} · ${a.periyot}</div>
            </div>
        </div>`).join("");
}

// ═══════════════════════════════════════════
//  HAYVAN HASTALIKLARI
// ═══════════════════════════════════════════

const HASTALIK_LISTESI = [
    {isim:"🦠 Şap Hastalığı", belirtiler:"Ağız ve ayaklarda yaralı kabarcıklar, yüksek ateş, yemek yiyememe", onlem:"Aşılama, hasta hayvanı ayır, hijyen"},
    {isim:"🫁 Solunum Yolu Enfeksiyonları", belirtiler:"Öksürük, burun akıntısı, ateş, iştahsızlık", onlem:"Veteriner çağır, sıcak tutun, aşı uygula"},
    {isim:"🦠 Brucella (Malta Humması)", belirtiler:"Yavru atma, süt azalması, kısırlık", onlem:"Aşılama zorunlu, süt içme, veteriner"},
    {isim:"💊 Mastitis (Meme İltihabı)", belirtiler:"Memede şişlik, sertlik, sütün koyulaşması", onlem:"Düzenli sağım, temizlik, antibiyotik"},
    {isim:"🐛 İç Parazitler", belirtiler:"Zayıflama, mat kıl, ishal, karın şişliği", onlem:"3 ayda bir ilaçlama, temiz su"},
    {isim:"🦟 Dış Parazitler", belirtiler:"Kaşıntı, deri döküntüsü, tüy/kıl dökülmesi", onlem:"İlaçlı banyo, ahır dezenfeksiyonu"},
    {isim:"⚠️ Acil: Veteriner Çağır!", belirtiler:"Yürüyememe, zorlu doğum, uzun süre yememe, bayılma", onlem:"Hemen veteriner: 174 (ALO Gıda)", vurgu:true},
];

function hastalikYukle() {
    const w = document.getElementById("hastalikWidget");
    if (!w) return;
    w.innerHTML = HASTALIK_LISTESI.map(h => `
        <div class="hastalik-kart ${h.vurgu ? 'hastalik-acil' : ''}">
            <div class="hastalik-isim">${h.isim}</div>
            <div class="hastalik-satir"><span class="hastalik-etiket">Belirtiler:</span> ${h.belirtiler}</div>
            <div class="hastalik-satir"><span class="hastalik-etiket">Önlem:</span> ${h.onlem}</div>
        </div>`).join("");
}

// ═══════════════════════════════════════════
//  ANKET
// ═══════════════════════════════════════════

async function anketDinle() {
    const el = document.getElementById("anketWidget");
    if (!el) return;
    try {
        const snap = await db.collection("settings").doc("anket").get();
        if (!snap.exists || !snap.data().aktif) { el.innerHTML = `<div style="text-align:center;color:#888;padding:16px;font-size:13px;">Şu an aktif anket yok</div>`; return; }
        const a = snap.data();
        const oylar = a.oylar || {};
        const benimOyum = currentUser ? oylar[currentUser.uid] : null;
        const secenekler = [a.secA, a.secB, a.secC, a.secD].filter(Boolean);
        const toplamOy = Object.values(oylar).length;
        el.innerHTML = `
            <div class="anket-soru">${escapeHtml(a.soru)}</div>
            ${secenekler.map((sec,i) => {
                const harf = ["A","B","C","D"][i];
                const bu = Object.values(oylar).filter(v => v===harf).length;
                const yuzde = toplamOy > 0 ? Math.round((bu/toplamOy)*100) : 0;
                return `<div class="anket-secenek ${benimOyum===harf?"anket-secildi":""}" onclick="anketOy('${harf}')">
                    <div class="anket-sec-ust"><span class="anket-harf">${harf}</span><span class="anket-sec-text">${escapeHtml(sec)}</span><span class="anket-yuzde">${yuzde}%</span></div>
                    <div class="anket-bar"><div class="anket-bar-dolu" style="width:${yuzde}%"></div></div>
                </div>`;
            }).join("")}
            <div class="anket-toplam">Toplam ${toplamOy} oy</div>`;
    } catch(e) { console.warn("Anket yüklenemedi"); }
}

async function anketOy(harf) {
    if (!currentUser) return alert("Oy vermek için giriş yapın!");
    try { await db.collection("settings").doc("anket").update({ [`oylar.${currentUser.uid}`]: harf }); anketDinle(); }
    catch(e) { alert("Hata: " + e.message); }
}

async function anketOlustur() {
    if (!ayricaliklimi()) return alert("Yetkiniz yok!");
    const soru = document.getElementById("anketSoru").value.trim();
    const secA = document.getElementById("anketSecA").value.trim();
    const secB = document.getElementById("anketSecB").value.trim();
    if (!soru || !secA || !secB) return alert("Soru ve en az 2 seçenek zorunludur!");
    const veri = { soru, secA, secB, aktif:true, oylar:{}, time: firebase.firestore.FieldValue.serverTimestamp() };
    const secC = document.getElementById("anketSecC").value.trim();
    if (secC) veri.secC = secC;
    try {
        await db.collection("settings").doc("anket").set(veri);
        ["anketSoru","anketSecA","anketSecB","anketSecC"].forEach(id => document.getElementById(id).value = "");
        anketDinle(); alert("✅ Anket yayınlandı!");
    } catch(e) { alert("Hata: " + e.message); }
}

async function anketSil() {
    if (!ayricaliklimi()) return;
    if (!confirm("Anketi kaldırmak istiyor musunuz?")) return;
    try { await db.collection("settings").doc("anket").update({ aktif:false }); anketDinle(); }
    catch(e) { alert("Hata: " + e.message); }
}

// ═══════════════════════════════════════════
//  LİDER TABLOSU
// ═══════════════════════════════════════════

async function liderYukle() {
    const el = document.getElementById("liderWidget");
    if (!el) return;
    try {
        const usersSnap = await db.collection("users").get();
        const yorumSnap = await db.collection("announcements").get();
        const yorumSayilari = {};
        const proms = [];
        yorumSnap.forEach(doc => proms.push(db.collection("announcements").doc(doc.id).collection("comments").get()));
        const sonuclar = await Promise.all(proms);
        sonuclar.forEach(s => s.forEach(c => { const uid = c.data().uid; if (uid) yorumSayilari[uid] = (yorumSayilari[uid]||0)+1; }));
        const liste = [];
        usersSnap.forEach(doc => { const u = doc.data(); liste.push({ uid: doc.id, name: u.name||"İsimsiz", puan: yorumSayilari[doc.id]||0 }); });
        liste.sort((a,b) => b.puan - a.puan);
        const med = ["🥇","🥈","🥉"];
        el.innerHTML = liste.slice(0,10).map((u,i) => `
            <div class="lider-satir ${currentUser && u.uid===currentUser.uid ? "lider-ben":""}">
                <span class="lider-siralama">${med[i]||`${i+1}.`}</span>
                <div class="lider-avatar">${(u.name[0]||"?").toUpperCase()}</div>
                <span class="lider-isim">${escapeHtml(u.name)}</span>
                <span class="lider-puan">${u.puan} yorum</span>
            </div>`).join("");
    } catch(e) { if (el) el.innerHTML = `<p style="text-align:center;color:#888;padding:12px;">⚠️ Yüklenemedi</p>`; }
}
