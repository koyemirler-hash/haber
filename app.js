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
});

// ─── MOBİL SES + BİLDİRİM İZİNLERİ ───
// İlk dokunuşta hem sesi uyandır hem de bildirim izni iste
function ilkDokunusIzinleri() {
    // Ses uyandır
    const ctx = getAudioCtx();
    if (ctx && ctx.state === "suspended") ctx.resume();
    // Bildirim izni iste
    bildirimiIzniAl();
}
document.addEventListener("touchstart", ilkDokunusIzinleri, { once: true });
document.addEventListener("click", ilkDokunusIzinleri, { once: true });

// ─── BİLDİRİM İZNİ ───
async function bildirimiIzniAl() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") return;
    if (Notification.permission === "denied") return;
    try {
        const izin = await Notification.requestPermission();
        console.log("Bildirim izni:", izin);
    } catch(e) {}
}

// Telefon bildirimi göster (service worker üzerinden - arka planda da çalışır)
function telefonBildirimi(baslik, mesaj, tag) {
    if (!("serviceWorker" in navigator)) return;
    if (Notification.permission !== "granted") return;
    navigator.serviceWorker.ready.then(reg => {
        reg.active && reg.active.postMessage({
            type: "SHOW_NOTIFICATION",
            title: baslik,
            body: mesaj,
            tag: tag || "emirler"
        });
    });
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
        reklamYukle();

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
            senderRole: userProfile.role || "user",
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
            card.innerHTML = `
                ${b.imageUrl
                    ? `<img src="${b.imageUrl}" class="biz-img" loading="lazy" alt="${escapeHtml(b.name)}">`
                    : `<div class="biz-img-placeholder">🏢</div>`
                }
                <div class="biz-body">
                    <div class="biz-cat">${escapeHtml(b.category || "İşletme")}</div>
                    <h3 class="biz-name">${escapeHtml(b.name)}</h3>
                    ${b.description ? `<p class="biz-desc">${escapeHtml(b.description)}</p>` : ""}
                    ${b.phone ? `<a href="tel:${b.phone}" class="biz-phone">📞 ${escapeHtml(b.phone)}</a>` : ""}
                    ${b.address ? `<p class="biz-addr">📍 ${escapeHtml(b.address)}</p>` : ""}
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
            address: document.getElementById("bizAddr").value.trim(),
            description: document.getElementById("bizDesc").value.trim(),
            imageUrl,
            time: firebase.firestore.FieldValue.serverTimestamp()
        });
        ["bizName", "bizCat", "bizPhone", "bizAddr", "bizDesc"].forEach(id => {
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
