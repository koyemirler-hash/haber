// ══════════════════════════════════════════
//  EMİRLER KÖYÜ PORTALI - app.js v2.0
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
// Cloudinary panelinden "unsigned" yükleme şablonu oluşturun:
// Settings > Upload > Upload presets > Add upload preset > Unsigned
const CLOUD_NAME = "ddt1tvhyb";
const UPLOAD_PRESET = "koyapp"; // Cloudinary'de bu isimde unsigned preset oluşturun

// ─── SABITLER ───
const ADMIN_EMAIL = "koyemirler@gmail.com";
const EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];
const YASAKLi_KELIMELER = ["küfür", "aptal", "salak", "mal", "orospu", "siktir", "oç", "amk", "amq"];

// ─── DURUM ───
let currentUser = null;
let userProfile = null;
let chatMediaFile = null;
let currentPostId = null;
let commentsUnsubscribe = null;

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

        // Engel kontrolü
        if (userProfile.blocked) {
            await auth.signOut();
            alert("❌ Hesabınız engellenmiştir. Yönetici ile iletişime geçin.");
            location.reload();
            return;
        }

        // Uygulamayı göster
        document.getElementById("loginPage").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        document.getElementById("navBar").classList.remove("hidden");

        // Yetkili kullanıcılar için gönderi panelini göster
        if (ayricaliklimi()) {
            document.getElementById("postPanel").classList.remove("hidden");
        }

        // Admin panelini göster
        if (adminMi()) {
            document.getElementById("adminPanel").classList.remove("hidden");
        }

        // Sayfa kapatıldığında offline yap
        window.addEventListener("beforeunload", () => {
            navigator.sendBeacon(
                "https://firestore.googleapis.com/v1/projects/emirler-c5638/databases/(default)/documents/users/" + user.uid,
                JSON.stringify({ fields: { online: { booleanValue: false } } })
            );
        });

        // İlk tab
        tabDegistir("feed");
        akisDinle();
        mesajlariDinle();
        isletmeleriYukle();
        onlineListesiYukle();

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

            // Emoji sayıları
            const emojiSayilari = {};
            Object.values(reactions).forEach(e => { emojiSayilari[e] = (emojiSayilari[e] || 0) + 1; });

            const reactionHTML = EMOJIS.map(e => {
                const count = emojiSayilari[e] || 0;
                return `<span class="reaction-btn ${myReaction === e ? "active" : ""}" onclick="reaksiyon('${pid}','${e}')">
                    ${e}<span class="reaction-count">${count > 0 ? count : ""}</span>
                </span>`;
            }).join("");

            // Medya
            const mediaHTML = p.mediaUrl ? (
                p.mediaType === "video"
                    ? `<video src="${p.mediaUrl}" controls class="post-media" preload="metadata"></video>`
                    : `<img src="${p.mediaUrl}" class="post-media" onclick="resimTamEkran('${p.mediaUrl}')" loading="lazy">`
            ) : "";

            // Rol rozeti
            const rolHTML = p.senderRole && p.senderRole !== "user"
                ? `<span class="post-role">${p.senderRole === "muhtar" ? "Muhtar" : p.senderRole === "yardimci" ? "Yardımcı" : "Admin"}</span>`
                : "";

            // Silme butonu
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
                        <span class="post-sender">${p.sender || "Anonim"}${rolHTML}</span>
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
                        <button class="comment-count-btn" onclick="yorumModalAc('${pid}')">
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

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
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
        let mediaUrl = "";
        let mediaType = "";
        if (file) {
            const result = await cloudinaryYukle(file);
            mediaUrl = result.url;
            mediaType = result.type;
        }
        await db.collection("announcements").add({
            sender: userProfile.name,
            senderUid: currentUser.uid,
            senderRole: userProfile.role || "user",
            title,
            text,
            mediaUrl,
            mediaType,
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

async function reaksiyon(postId, emoji) {
    if (!currentUser) return alert("Lütfen giriş yapın!");
    const ref = db.collection("announcements").doc(postId);
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
//  YORUMLAR
// ═══════════════════════════════════════════

function yorumModalAc(postId) {
    currentPostId = postId;
    document.getElementById("commentsModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";

    if (commentsUnsubscribe) commentsUnsubscribe();

    commentsUnsubscribe = db.collection("announcements").doc(postId)
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
        await db.collection("announcements").doc(currentPostId).collection("comments").add({
            text,
            sender: userProfile.name,
            uid: currentUser.uid,
            time: firebase.firestore.FieldValue.serverTimestamp()
        });
        await db.collection("announcements").doc(currentPostId).update({
            commentCount: firebase.firestore.FieldValue.increment(1)
        });
        document.getElementById("commentInput").value = "";
    } catch(e) { alert("Yorum gönderilemedi!"); }
}

async function yorumSil(postId, commentId) {
    if (!confirm("Yorumu silmek istiyor musunuz?")) return;
    try {
        await db.collection("announcements").doc(postId).collection("comments").doc(commentId).delete();
        await db.collection("announcements").doc(postId).update({
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
        const atBottom = box.scrollHeight - box.scrollTop - b
