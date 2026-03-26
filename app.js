// ══════════════════════════════════════════
//  EMİRLER KÖYÜ PORTALI - app.js v2.1 (Full Güncel)
// ══════════════════════════════════════════

// ─── FIREBASE CONFIG ───
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
const UPLOAD_PRESET = "emirler_preset"; 

// ─── SESLER ───
const playMsgSnd = () => document.getElementById('sndMsg')?.play().catch(() => {});
const playNotifSnd = () => document.getElementById('sndNotif')?.play().catch(() => {});
const playLikeSnd = () => document.getElementById('sndLike')?.play().catch(() => {});

// ─── PWA YÜKLEME ───
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById('pwaBanner');
    if(banner) banner.classList.remove('hidden');
});

const pwaBtn = document.getElementById('pwaBtn');
if(pwaBtn) {
    pwaBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') document.getElementById('pwaBanner').classList.add('hidden');
            deferredPrompt = null;
        }
    });
}

// ─── SABITLER & DURUM ───
const ADMIN_EMAIL = "koyemirler@gmail.com";
const EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];
const YASAKLi_KELIMELER = ["küfür", "aptal", "salak", "mal", "orospu", "siktir", "oç", "amk", "amq"];

let currentUser = null;
let userProfile = null;
let currentPostId = null;

// ─── YARDIMCI FONKSİYONLAR ───
function ayricaliklimi() {
    if (!userProfile) return false;
    if (currentUser && currentUser.email === ADMIN_EMAIL) return true;
    return ["admin", "muhtar", "yardimci"].includes(userProfile.role);
}

function zamanFarki(ts) {
    if (!ts) return "Az önce";
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

async function cloudinaryYukle(file) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${file.type.startsWith("video") ? "video" : "image"}/upload`, {
        method: "POST",
        body: fd
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return { url: data.secure_url, type: file.type.startsWith("video") ? "video" : "image" };
}

// ─── AUTH STATE ───
auth.onAuthStateChanged(async user => {
    if (user) {
        currentUser = user;
        const docRef = db.collection("users").doc(user.uid);
        let docSnap = await docRef.get();
        userProfile = docSnap.data();

        document.getElementById("loginPage").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
        document.getElementById("navBar").classList.remove("hidden");

        if (ayricaliklimi()) {
            document.getElementById("postPanel").classList.remove("hidden");
            document.getElementById("adminPanel")?.classList.remove("hidden");
        }

        tabDegistir("feed");
        akisDinle();
        pendingDinle(); // Admin için onay bekleyenleri dinle
    } else {
        document.getElementById("loginPage").classList.remove("hidden");
    }
});

// ─── AKIŞ VE PAYLAŞIM ───
async function akisPaylas() {
    const title = document.getElementById("postTitle").value.trim();
    const text = document.getElementById("postText").value.trim();
    const file = document.getElementById("postFile").files[0];
    
    if (!title && !text && !file) return alert("Boş paylaşım yapılamaz!");

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

        // Gönderi 'pending' (beklemede) olarak kaydedilir
        await db.collection("announcements").add({
            sender: userProfile.name,
            senderUid: currentUser.uid,
            title, text, mediaUrl, mediaType,
            reactions: {},
            commentCount: 0,
            status: "pending", // Onay mekanizması
            category: document.getElementById('view-nostalgia').classList.contains('hidden') ? "genel" : "nostalji",
            time: firebase.firestore.FieldValue.serverTimestamp()
        });

        playMsgSnd(); // Mesaj gönderim sesi
        alert("Gönderiniz yönetici onayına gönderildi!");
        
        document.getElementById("postTitle").value = "";
        document.getElementById("postText").value = "";
        document.getElementById("postFile").value = "";
        document.getElementById("postPreview").innerHTML = "";
    } catch(e) {
        alert("Hata: " + e.message);
    }
    btn.disabled = false;
    btn.textContent = "📢 Paylaş";
}

function akisDinle() {
    // Sadece status == "approved" olanları göster
    db.collection("announcements")
      .where("status", "==", "approved")
      .orderBy("time", "desc")
      .onSnapshot(snap => {
        renderPosts(snap, "postList");
        
        // Yeni bir onaylı gönderi geldiğinde bildirim sesi çal
        snap.docChanges().forEach(change => {
            if (change.type === "added" && !snap.metadata.hasPendingWrites) {
                playNotifSnd();
            }
        });
    });
}

function pendingDinle() {
    if(!ayricaliklimi()) return;
    // Admin için onay bekleyenleri listele
    db.collection("announcements")
      .where("status", "==", "pending")
      .onSnapshot(snap => {
        const container = document.getElementById("pendingPosts");
        if(!container) return;
        if(snap.empty) { container.innerHTML = "Bekleyen yok."; return; }
        
        container.innerHTML = "";
        snap.forEach(doc => {
            const p = doc.data();
            const div = document.createElement("div");
            div.className = "pending-card";
            div.innerHTML = `
                <p><strong>${p.sender}:</strong> ${p.text || p.title}</p>
                <button onclick="onayla('${doc.id}')" style="color:green">✅ Onayla</button>
                <button onclick="postSil('${doc.id}')" style="color:red">🗑️ Reddet</button>
            `;
            container.appendChild(div);
        });
    });
}

async function onayla(id) {
    await db.collection("announcements").doc(id).update({ status: "approved" });
    alert("Onaylandı!");
}

async function reaksiyon(postId, emoji) {
    const ref = db.collection("announcements").doc(postId);
    const snap = await ref.get();
    const reactions = { ...(snap.data().reactions || {}) };
    
    if (reactions[currentUser.uid] === emoji) {
        delete reactions[currentUser.uid];
    } else {
        reactions[currentUser.uid] = emoji;
        playLikeSnd(); // Emoji/Beğeni sesi
    }
    await ref.update({ reactions });
}

// ─── SEKME YÖNETİMİ ───
function tabDegistir(t) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById("view-" + t).classList.remove("hidden");
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    document.getElementById("nav-" + t)?.classList.add("active");

    if (t === "nostalgia") {
        db.collection("announcements")
          .where("category", "==", "nostalji")
          .where("status", "==", "approved")
          .orderBy("time", "desc")
          .onSnapshot(snap => renderPosts(snap, "nostalgiaList"));
    }
}

function renderPosts(snap, containerId) {
    const list = document.getElementById(containerId);
    if (!list) return;
    list.innerHTML = snap.empty ? "<p>İçerik yok.</p>" : "";
    
    snap.forEach(doc => {
        const p = doc.data();
        const pid = doc.id;
        const card = document.createElement("div");
        card.className = "post-card";
        card.innerHTML = `
            <div class="post-header"><b>${p.sender}</b> <span>${zamanFarki(p.time)}</span></div>
            <div class="post-text">${p.text || ""}</div>
            ${p.mediaUrl ? (p.mediaType === "video" ? `<video src="${p.mediaUrl}" controls></video>` : `<img src="${p.mediaUrl}">`) : ""}
            <div class="reactions-bar">
                ${EMOJIS.map(e => `<span onclick="reaksiyon('${pid}','${e}')">${e} ${Object.values(p.reactions||{}).filter(x=>x===e).length || ""}</span>`).join("")}
            </div>
        `;
        list.appendChild(card);
    });
}

// ─── DİĞER FONKSİYONLAR (Eksiksiz Devam) ───
function onayVer() {
    if (!document.getElementById("termsCheck").checked) return alert("Şartları kabul edin!");
    localStorage.setItem("termsAccepted", "true");
    document.getElementById("termsOverlay").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
}

async function postSil(id) {
    if(confirm("Silmek istediğine emin misin?")) {
        await db.collection("announcements").doc(id).delete();
    }
}

// Preview, Comment vb. diğer fonksiyonlarını buraya ekleyebilirsin...
