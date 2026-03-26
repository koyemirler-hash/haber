// ══════════════════════════════════════════
//  EMİRLER KÖYÜ PORTALI - app.js v2.2 (Giriş Fix)
// ══════════════════════════════════════════

// ─── FIREBASE BAŞLATMA ───
const firebaseConfig = {
    apiKey: "AIzaSyDUagdaIoJmkgGjWFv2avYsC7n_-4AJ7s0",
    authDomain: "emirler-c5638.firebaseapp.com",
    projectId: "emirler-c5638",
    appId: "1:426225264136:web:ca5184984fc71b1e63853bd"
};

// Mükerrer başlatmayı önle
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// ─── SABİTLER ───
const ADMIN_EMAIL = "koyemirler@gmail.com";
const CLOUD_NAME = "ddt11vhyb";
const UPLOAD_PRESET = "emirler_preset";
const EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

let currentUser = null;
let userProfile = null;

// Ses Fonksiyonları
const playSnd = (id) => {
    const s = document.getElementById(id);
    if(s) s.play().catch(() => {});
};

// ─── AUTH STATE (ANA GİRİŞ MOTORU) ───
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        try {
            // Kullanıcı verisini çek
            const doc = await db.collection("users").doc(user.uid).get();
            
            if (doc.exists) {
                userProfile = doc.data();
                // Eğer engelliyse direkt at
                if (userProfile.blocked) {
                    alert("❌ Hesabınız engellenmiştir.");
                    auth.signOut();
                    return;
                }
            } else {
                // Kaydı yoksa (yeni kayıt) oluştur
                userProfile = {
                    name: user.displayName || user.email.split("@")[0],
                    email: user.email,
                    role: user.email === ADMIN_EMAIL ? "admin" : "user",
                    online: true,
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                };
                await db.collection("users").doc(user.uid).set(userProfile);
            }

            // Arayüzü Hazırla
            showApp();
        } catch (err) {
            console.error("Profil yükleme hatası:", err);
            // Hata olsa bile anonim gibi devam etsin ki kilitlenmesin
            showApp();
        }
    } else {
        showLogin();
    }
});

function showApp() {
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    document.getElementById("navBar").classList.remove("hidden");
    
    // Yetki panellerini aç
    if (ayricaliklimi()) {
        document.getElementById("postPanel")?.classList.remove("hidden");
        document.getElementById("adminPanel")?.classList.remove("hidden");
    }
    
    tabDegistir("feed");
    akisDinle();
}

function showLogin() {
    document.getElementById("app").classList.add("hidden");
    document.getElementById("navBar").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
}

// ─── GİRİŞ / KAYIT FONKSİYONLARI ───
async function girisYap() {
    const email = document.getElementById("logEmail").value.trim();
    const pass = document.getElementById("logPass").value;
    if (!email || !pass) return alert("Bilgileri gir kanki!");

    try {
        await auth.signInWithEmailAndPassword(email, pass);
    } catch (e) {
        alert("Giriş Hatası: " + e.message);
    }
}

async function kayitOl() {
    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const pass = document.getElementById("regPass").value;

    if (!name || !email || !pass) return alert("Boş bırakma!");

    try {
        const res = await auth.createUserWithEmailAndPassword(email, pass);
        await db.collection("users").doc(res.user.uid).set({
            name,
            email,
            role: email === ADMIN_EMAIL ? "admin" : "user",
            online: true,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        alert("Kayıt Hatası: " + e.message);
    }
}

// ─── DİĞER FONKSİYONLAR ───
function ayricaliklimi() {
    if (!userProfile) return false;
    return (currentUser && currentUser.email === ADMIN_EMAIL) || ["admin", "muhtar", "yardimci"].includes(userProfile.role);
}

function tabDegistir(t) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById("view-" + t).classList.remove("hidden");
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    document.getElementById("nav-" + t)?.classList.add("active");
}

// Akış Dinleyici (Onaylılar + Ses)
function akisDinle() {
    db.collection("announcements")
      .where("status", "==", "approved")
      .orderBy("time", "desc")
      .onSnapshot(snap => {
        const list = document.getElementById("postList");
        if(!list) return;
        list.innerHTML = snap.empty ? "<p class='empty-state'>Henüz duyuru yok.</p>" : "";
        
        snap.forEach(doc => {
            const p = doc.data();
            const pid = doc.id;
            const div = document.createElement("div");
            div.className = "post-card";
            div.innerHTML = `
                <div class="post-header">
                    <div class="post-avatar">${p.sender[0]}</div>
                    <div class="post-meta">
                        <span class="post-sender">${p.sender}</span>
                        <span class="post-time">Yeni</span>
                    </div>
                </div>
                <div class="post-text">${p.text || ""}</div>
                ${p.mediaUrl ? `<img src="${p.mediaUrl}" class="post-media">` : ""}
            `;
            list.appendChild(div);
        });

        // Yeni onaylı post gelince bildirim sesi
        if (!snap.metadata.hasPendingWrites) playSnd('sndNotif');
    });
}
