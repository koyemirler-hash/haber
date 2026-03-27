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
const UPLOAD_PRESET = "emirler_preset";

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
    // Banner'ı göster
    document.getElementById("pwaInstallBanner").classList.remove("hidden");
    // Settings butonunu göster
    const sb = document.getElementById("settingsInstallBtn");
    if (sb) sb.style.display = "";
});

window.addEventListener("appinstalled", () => {
    document.getElementById("pwaInstallBanner").classList.add("hidden");
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
}

// Settings install butonu başlangıçta gizli
window.addEventListener("DOMContentLoaded", () => {
    const sb = document.getElementById("settingsInstallBtn");
    if (sb) sb.style.display = "none";
    // Ses ikonu güncelle
    updateSoundBtn();
});

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
    const btn = document.getElementById("soundToggleBtn");
    if (btn) btn.textContent = soundEnabled ? "🔔" : "🔕";
}

// ═══════════════════════════════════════════
//  YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════

function ayricaliklimi() {
    if (!userProfile) return false;
    if (currentUser && currentUser.email === ADMIN_EMAIL) return true;
    return ["admin", "muhtar", "yardimci"].includes(userProfile.role);
}

function adminMi() {
    if (currentUser && currentUser.email === ADMIN_EMAIL) return true;
    return userProfile && userProfile.role === "admin";
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
            // Nostalji onay bölümünü göster
            document.getElementById("nostaljiPendingSection").classList.remove("hidden");
            // Onay notu gizle (yetkililerin direkt paylaşacağı için)
            document.getElementById("nostaljiApprovalNote").classList.add("hidden");
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

        tabDegistir("feed");
        akisDinle();
        mesajlariDinle();
        isletmeleriYukle();
        onlineListesiYukle();
        nostaljiDinle();

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
    document.getElementById("view-" + t).classList.remove("hidden");
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    const navEl = document.getElementById("nav-" + t);
    if (navEl) navEl.classList.add("active");
    window.scrollTo(0, 0);
}

// ═══════════════════════════════════════════
//  AKIŞ (FEED)
// ═══════════════════════════════════════════

function akisDinle() {
    db.collection("announcements").orderBy("time", "desc").onSnapshot(snap => {
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
            senderRole: userProfile.role || "user",
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
    btn.t
