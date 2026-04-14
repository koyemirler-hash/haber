/* ═══════════════════════════════════════════════════════════
   EMİRLER KÖYÜ — WEB SİTESİ JAVASCRIPT
   Sohbet ve Ayarlar dahil değil (bunlar sadece PWA'da)
═══════════════════════════════════════════════════════════ */

// ─── FİREBASE YAPILANDIRMA ───────────────────────────────
const firebaseConfig = {
    apiKey: "\x41\x49\x7a\x61\x53\x79\x44\x55\x61\x67\x64\x61\x49\x6f\x4a\x6d\x6b\x67\x47\x6a\x57\x46\x76\x32\x61\x76\x59\x73\x43\x37\x6e\x5f\x2d\x34\x41\x4a\x37\x73\x30",
    authDomain: "\x65\x6d\x69\x72\x6c\x65\x72\x2d\x63\x35\x36\x33\x38\x2e\x66\x69\x72\x65\x62\x61\x73\x65\x61\x70\x70\x2e\x63\x6f\x6d",
    projectId: "\x65\x6d\x69\x72\x6c\x65\x72\x2d\x63\x35\x36\x33\x38",
    appId: "\x31\x3a\x34\x32\x36\x32\x32\x35\x32\x36\x34\x31\x33\x36\x3a\x77\x65\x62\x3a\x63\x61\x35\x31\x38\x34\x39\x38\x34\x66\x63\x37\x31\x62\x31\x65\x36\x33\x38\x35\x33\x62\x64"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ─── SABİTLER ────────────────────────────────────────────
const CLOUD_NAME = "\x64\x64\x74\x31\x31\x76\x68\x79\x62";
const UPLOAD_PRESET = "\x6b\x6f\x79\x61\x70\x70";
const ADMIN_EMAIL = "\x6b\x6f\x79\x65\x6d\x69\x72\x6c\x65\x72\x40\x67\x6d\x61\x69\x6c\x2e\x63\x6f\x6d";
const EMOJIS = ["❤️","😂","😮","😢","😡","👍"];
const YASAKLi_KELIMELER = ["küfür","aptal","salak","orospu","siktir","amk","amq"];
const KOY_LAT = 39.72, KOY_LNG = 33.52;
const HAVA_KODLAR = {0:"☀️ Açık",1:"🌤️ Az Bulutlu",2:"⛅ Parçalı",3:"☁️ Kapalı",45:"🌫️ Sis",51:"🌦️ Çisenti",61:"🌧️ Yağmurlu",63:"🌧️ Yağmurlu",71:"🌨️ Karlı",73:"❄️ Karlı",80:"🌦️ Sağanak",81:"⛈️ Fırtına",95:"⛈️ Fırtına"};
const GUNLER = ["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];
const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const ILAN_KAT = { satilik:"🏷️ Satılık", kiralik:"🔑 Kiralık", araniyor:"🔍 Aranıyor", kayip:"⚠️ Kayıp", diger:"📌 Diğer" };
const TARIM_VARSAYILAN = [{ay:"Ocak",is:"❄️ Budama dönemi"},{ay:"Şubat",is:"🌱 Tohum hazırlığı, gübre"},{ay:"Mart",is:"🌾 Buğday ekimi, fide dikimi"},{ay:"Nisan",is:"🌸 Bahar bakımı, sulama"},{ay:"Mayıs",is:"🌿 Çapalama, ilaçlama"},{ay:"Haziran",is:"☀️ Biçerdöver hazırlığı"},{ay:"Temmuz",is:"🌾 Buğday hasadı, saman"},{ay:"Ağustos",is:"🍎 Meyve hasadı, kış ekimi"},{ay:"Eylül",is:"🍂 Üzüm hasadı, soğan ekimi"},{ay:"Ekim",is:"🌱 Sonbahar ekimleri"},{ay:"Kasım",is:"🍂 Ağaç bakımı, depolama"},{ay:"Aralık",is:"❄️ Kış dinlendirme, planlama"}];
const ASI_LISTESI = [{hayvan:"🐄 Sığır",asi:"Şap Aşısı",ay:"Şubat - Nisan",periyot:"Yılda 2 kez"},{hayvan:"🐄 Sığır",asi:"Brucella",ay:"Mart - Mayıs",periyot:"Doğumdan 3-6 ay sonra"},{hayvan:"🐄 Sığır",asi:"Mavi Dil",ay:"Eylül - Ekim",periyot:"Yılda 1 kez"},{hayvan:"🐑 Koyun/Keçi",asi:"Şap Aşısı",ay:"Şubat - Nisan",periyot:"Yılda 2 kez"},{hayvan:"🐑 Koyun/Keçi",asi:"Enterotoksemi",ay:"Ekim - Kasım",periyot:"Kuzuluğa 1 ay kala"},{hayvan:"🐑 Koyun/Keçi",asi:"Çiçek Aşısı",ay:"Eylül - Ekim",periyot:"Yılda 1 kez"},{hayvan:"🐔 Kümes",asi:"Newcastle",ay:"Her mevsim",periyot:"3 ayda bir"},{hayvan:"🐕 Köpek",asi:"Kuduz (zorunlu)",ay:"Yıl boyu",periyot:"Yılda 1 kez"}];
const HASTALIK_LISTESI = [{isim:"🦠 Şap Hastalığı",belirtiler:"Ağız/ayaklarda kabarcıklar, ateş, yemek yiyememe",onlem:"Aşılama, hasta hayvanı ayır, hijyen"},{isim:"🫁 Solunum Enfeksiyonu",belirtiler:"Öksürük, burun akıntısı, ateş, iştahsızlık",onlem:"Veteriner çağır, sıcak tut, aşı uygula"},{isim:"🦠 Brucella",belirtiler:"Yavru atma, süt azalması, kısırlık",onlem:"Aşılama zorunlu, çiğ süt içme!"},{isim:"💊 Mastitis",belirtiler:"Memede şişlik, sertlik, sütün değişmesi",onlem:"Düzenli sağım, temizlik, antibiyotik"},{isim:"🐛 İç Parazitler",belirtiler:"Zayıflama, mat kıl, ishal, karın şişliği",onlem:"3 ayda bir ilaçlama, temiz su"},{isim:"🦟 Dış Parazitler",belirtiler:"Kaşıntı, deri döküntüsü, tüy dökülmesi",onlem:"İlaçlı banyo, ahır dezenfeksiyonu"},{isim:"⚠️ ACİL: Hemen Veteriner!",belirtiler:"Yürüyememe, zorlu doğum, uzun süre yememe, bayılma",onlem:"Alo Gıda: 174 · Veteriner hekime gidin!",vurgu:true}];

// ─── DURUM DEĞİŞKENLERİ ───────────────────────────────────
let currentUser = null, userProfile = null;
let currentPostId = null, currentCollection = "announcements";
let commentsUnsubscribe = null, deferredInstallPrompt = null;
let ilanUnsubscribe = null, aktifIlanFiltre = "hepsi";
let havaYuklendi = false, namazYuklendi = false;
let namazVakitleri = null;
let aktifSection = "feed";

// ─── PWA INSTALL ─────────────────────────────────────────
window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    document.getElementById("pwaInstallBanner").classList.remove("hidden");
});
window.addEventListener("appinstalled", () => {
    document.getElementById("pwaInstallBanner").classList.add("hidden");
    deferredInstallPrompt = null;
});
function pwaYukle() {
    if (!deferredInstallPrompt) {
        alert("📱 Tarayıcı menüsü → 'Ana Ekrana Ekle'\n\niOS için: Paylaş butonu → Ana Ekrana Ekle");
        return;
    }
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(r => {
        if (r.outcome === "accepted") document.getElementById("pwaInstallBanner").classList.add("hidden");
        deferredInstallPrompt = null;
    });
}
function pwaBannerKapat() { document.getElementById("pwaInstallBanner").classList.add("hidden"); }

// ─── SPLASH SCREEN ───────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    const splash = document.getElementById("splash");
    setTimeout(() => {
        splash.classList.add("fade-out");
        setTimeout(() => { splash.style.display = "none"; }, 700);
    }, 3000);

    saatveTarihGuncelle();
    setInterval(saatveTarihGuncelle, 1000);
    havaDurumuYukle();
    namazYukle();
    akisDinle();
    isletmeleriYukle();
    hakkimizdaYukle();
});

// ─── TARIH & SAAT ────────────────────────────────────────
function saatveTarihGuncelle() {
    const simdi = new Date();
    const saatStr = simdi.toLocaleTimeString("tr-TR", { hour:"2-digit", minute:"2-digit" });
    const tarihStr = simdi.toLocaleDateString("tr-TR", { weekday:"short", day:"numeric", month:"long" });
    const saatEl = document.getElementById("saatMetin");
    const tarihEl = document.getElementById("tarihMetin");
    if (saatEl) saatEl.textContent = saatStr;
    if (tarihEl) tarihEl.textContent = tarihStr;
    if (namazVakitleri) namazInfoBarGuncelle();
}

function namazInfoBarGuncelle() {
    if (!namazVakitleri) return;
    const simdi = new Date();
    const vakitSiralama = [
        { ad: "İmsak", saat: namazVakitleri.Fajr },
        { ad: "Güneş", saat: namazVakitleri.Sunrise },
        { ad: "Öğle", saat: namazVakitleri.Dhuhr },
        { ad: "İkindi", saat: namazVakitleri.Asr },
        { ad: "Akşam", saat: namazVakitleri.Maghrib },
        { ad: "Yatsı", saat: namazVakitleri.Isha }
    ];
    const simdikiDakika = simdi.getHours() * 60 + simdi.getMinutes();
    let sonrakiVakit = null;
    for (const v of vakitSiralama) {
        const [h, m] = v.saat.split(":").map(Number);
        const dk = h * 60 + m;
        if (dk > simdikiDakika) { sonrakiVakit = v; break; }
    }
    if (!sonrakiVakit) sonrakiVakit = vakitSiralama[0];
    const el = document.getElementById("namazKisa");
    if (el) el.textContent = `${sonrakiVakit.ad}: ${sonrakiVakit.saat.split(" ")[0]}`;
}

// ─── NAVIGATION ──────────────────────────────────────────
function tabGoster(section) {
    // Sections
    ["feed", "ilan", "nostalji", "koy", "firmalar", "hakkimizda"].forEach(s => {
        const el = document.getElementById("section-" + s);
        if (el) el.classList.toggle("hidden", s !== section);
    });
    // Desktop nav links
    document.querySelectorAll(".nav-link").forEach((l, i) => {
        const sections = ["feed", "ilan", "nostalji", "koy", "firmalar", "hakkimizda"];
        l.classList.toggle("active", sections[i] === section);
    });
    // Mobile nav links
    document.querySelectorAll(".mobile-nav-link").forEach((l, i) => {
        const sections = ["feed", "ilan", "nostalji", "koy", "firmalar", "hakkimizda"];
        l.classList.toggle("active", sections[i] === section);
    });
    aktifSection = section;
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Lazy loads
    if (section === "ilan" && !ilanUnsubscribe) ilanlarDinle();
    if (section === "nostalji") nostaljiDinle();
    if (section === "koy") {
        // Open hava and namaz by default
        if (!havaYuklendi) {
            koyCardToggle("hava-detail");
            koyCardToggle("namaz-detail");
        }
    }
}

function koyCardToggle(id) {
    const body = document.getElementById(id);
    const arrow = document.getElementById("arrow-" + id);
    if (!body) return;
    const isOpen = !body.classList.contains("hidden");
    body.classList.toggle("hidden", isOpen);
    if (arrow) arrow.textContent = isOpen ? "▼" : "▲";
    if (!isOpen) {
        if (id === "hava-detail") havaDurumuKoy();
        if (id === "namaz-detail") namazKoy();
        if (id === "tarim-detail") tarimKoy();
        if (id === "asi-detail") asiKoy();
        if (id === "hastalik-detail") hastalikKoy();
    }
}

function mobileMenuToggle() {
    const nav = document.getElementById("mobileNav");
    const btn = document.getElementById("hamburgerBtn");
    const isOpen = !nav.classList.contains("hidden");
    nav.classList.toggle("hidden", isOpen);
    btn.classList.toggle("open", !isOpen);
}
function mobileMenuKapat() {
    const nav = document.getElementById("mobileNav");
    const btn = document.getElementById("hamburgerBtn");
    nav.classList.add("hidden");
    btn.classList.remove("open");
}

function headerMenuToggle() {
    const dd = document.getElementById("userDropdown");
    dd.classList.toggle("hidden");
}
document.addEventListener("click", e => {
    const btn = document.getElementById("userAvatarBtn");
    const dd = document.getElementById("userDropdown");
    if (dd && !dd.classList.contains("hidden") && !btn?.contains(e.target) && !dd.contains(e.target)) {
        dd.classList.add("hidden");
    }
});

// ─── AUTH / LOGIN ─────────────────────────────────────────
function loginModalAc() {
    document.getElementById("loginModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
}
function loginModalKapat(e) {
    if (e && e.target !== document.getElementById("loginModal")) return;
    document.getElementById("loginModal").classList.add("hidden");
    document.body.style.overflow = "";
}

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
    document.getElementById("authError").textContent = "⏳ Giriş yapılıyor...";
    try {
        await auth.signInWithEmailAndPassword(email, pass);
        loginModalKapat();
    } catch(e) {
        const mesajlar = {
            "auth/user-not-found": "Bu e-posta ile kayıt bulunamadı!",
            "auth/wrong-password": "Şifre hatalı!",
            "auth/invalid-email": "Geçersiz e-posta!",
            "auth/too-many-requests": "Çok fazla deneme. Lütfen bekleyin.",
            "auth/invalid-credential": "E-posta veya şifre hatalı!"
        };
        document.getElementById("authError").textContent = mesajlar[e.code] || "Giriş başarısız!";
    }
}

async function kayitOl() {
    const name = document.getElementById("regName").value.trim();
    const phone = document.getElementById("regPhone").value.trim().replace(/\s/g, "");
    const email = document.getElementById("regEmail").value.trim();
    const pass = document.getElementById("regPass").value;
    const errEl = document.getElementById("authError");
    if (!name || !phone || !email || !pass) { errEl.textContent = "Tüm alanları doldurun!"; return; }
    if (pass.length < 6) { errEl.textContent = "Şifre en az 6 karakter!"; return; }
    if (!/^[0-9+]{10,13}$/.test(phone.replace(/[^0-9+]/g, ""))) { errEl.textContent = "Geçerli telefon numarası girin!"; return; }
    errEl.textContent = "⏳ Kontrol ediliyor...";
    try {
        const telKontrol = await db.collection("users").where("phone", "==", phone).get();
        if (!telKontrol.empty) { errEl.textContent = "❌ Bu telefon zaten kayıtlı!"; return; }
        const res = await auth.createUserWithEmailAndPassword(email, pass);
        await db.collection("users").doc(res.user.uid).set({
            name, phone, email,
            rol: email === ADMIN_EMAIL ? "admin" : "user",
            online: true, blocked: false,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
        errEl.textContent = "";
        loginModalKapat();
    } catch(e) {
        const m = { "auth/email-already-in-use": "❌ Bu e-posta zaten kayıtlı!", "auth/invalid-email": "❌ Geçersiz e-posta!" };
        errEl.textContent = m[e.code] || "Kayıt başarısız: " + e.message;
    }
}

async function cikisYap() {
    if (currentUser) {
        try { await db.collection("users").doc(currentUser.uid).update({ online: false }); } catch(e) {}
    }
    await auth.signOut();
    currentUser = null; userProfile = null;
    kullaniciArayuzGuncelle(null);
    location.reload();
}

auth.onAuthStateChanged(async user => {
    if (user) {
        currentUser = user;
        const docRef = db.collection("users").doc(user.uid);
        let docSnap = await docRef.get();
        if (!docSnap.exists) {
            await docRef.set({ name: user.displayName || user.email.split("@")[0], email: user.email, rol: user.email === ADMIN_EMAIL ? "admin" : "user", online: true, blocked: false, lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
            docSnap = await docRef.get();
        } else {
            await docRef.update({ online: true, lastSeen: firebase.firestore.FieldValue.serverTimestamp() });
        }
        userProfile = docSnap.data();
        if (userProfile.blocked) { await auth.signOut(); alert("❌ Hesabınız engellenmiştir."); return; }
        kullaniciArayuzGuncelle(userProfile);
        // Show admin post panel
        if (ayricaliklimi()) {
            const pp = document.getElementById("postPanel");
            if (pp) pp.classList.remove("hidden");
            const an = document.getElementById("nostaljiApprovalNote");
            if (an) an.classList.add("hidden");
        }
        window.addEventListener("beforeunload", () => {
            navigator.sendBeacon(`https://firestore.googleapis.com/v1/projects/emirler-c5638/databases/(default)/documents/users/${user.uid}`, JSON.stringify({ fields: { online: { booleanValue: false } } }));
        });
    } else {
        currentUser = null; userProfile = null;
        kullaniciArayuzGuncelle(null);
    }
});

function kullaniciArayuzGuncelle(profile) {
    const loginBtn = document.getElementById("headerLoginBtn");
    const userBtn = document.getElementById("headerUserBtn");
    const avatarBtn = document.getElementById("userAvatarBtn");
    const dropdownName = document.getElementById("dropdownUserName");
    const mobileLogin = document.getElementById("mobileLoginBtn");
    const mobileUserSec = document.getElementById("mobileUserSection");
    const mobileUserName = document.getElementById("mobileUserName");
    if (profile) {
        if (loginBtn) loginBtn.classList.add("hidden");
        if (userBtn) userBtn.classList.remove("hidden");
        if (avatarBtn) avatarBtn.textContent = (profile.name || "?")[0].toUpperCase();
        if (dropdownName) dropdownName.textContent = profile.name || "Kullanıcı";
        if (mobileLogin) mobileLogin.classList.add("hidden");
        if (mobileUserSec) mobileUserSec.classList.remove("hidden");
        if (mobileUserName) mobileUserName.textContent = profile.name || "Kullanıcı";
    } else {
        if (loginBtn) loginBtn.classList.remove("hidden");
        if (userBtn) userBtn.classList.add("hidden");
        if (mobileLogin) mobileLogin.classList.remove("hidden");
        if (mobileUserSec) mobileUserSec.classList.add("hidden");
    }
}

// ─── YARDIMCI FONKSİYONLAR ───────────────────────────────
function escapeHtml(str) { return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function zamanFarki(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime(), sn = Math.floor(diff / 1000);
    if (sn < 60) return "Az önce";
    const dk = Math.floor(sn / 60); if (dk < 60) return `${dk} dk önce`;
    const sa = Math.floor(dk / 60); if (sa < 24) return `${sa} sa önce`;
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}
function kufurKontrol(metin) {
    const m = metin.toLowerCase();
    return YASAKLi_KELIMELER.some(k => { const re = new RegExp("(^|\\s|,|!|\\.)"+k+"($|\\s|,|!|\\.)"); return re.test(" "+m+" "); });
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
function previewFile(input, previewId) {
    const preview = document.getElementById(previewId);
    if (!input.files[0]) { preview.innerHTML = ""; return; }
    const file = input.files[0], url = URL.createObjectURL(file);
    preview.innerHTML = file.type.startsWith("video")
        ? `<video src="${url}" controls style="max-width:100%;border-radius:8px;max-height:180px;"></video>`
        : `<img src="${url}" style="max-width:100%;border-radius:8px;max-height:180px;object-fit:cover;">`;
}
async function cloudinaryYukle(file) {
    const fd = new FormData();
    fd.append("file", file); fd.append("upload_preset", UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: "POST", body: fd });
    if (!res.ok) throw new Error("Cloudinary yükleme başarısız!");
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return { url: data.secure_url, type: file.type.startsWith("video") ? "video" : "image" };
}
function resimTamEkran(src) {
    document.getElementById("imgFullscreenSrc").src = src;
    document.getElementById("imgFullscreen").classList.remove("hidden");
}

// ─── AKIŞ / FEED ─────────────────────────────────────────
function akisDinle() {
    db.collection("announcements").orderBy("time", "desc").onSnapshot(snap => {
        const list = document.getElementById("postList");
        if (snap.empty) {
            list.innerHTML = `<div class="empty-state"><div class="empty-icon">📢</div><p>Henüz duyuru yok</p></div>`;
            return;
        }
        list.innerHTML = "";
        snap.forEach(doc => {
            const p = doc.data(), pid = doc.id;
            const reactions = p.reactions || {};
            const myReaction = currentUser ? reactions[currentUser.uid] : null;
            const emojiS = {}; Object.values(reactions).forEach(e => { emojiS[e] = (emojiS[e]||0)+1; });
            const reactionHTML = EMOJIS.map(e => {
                const c = emojiS[e] || 0;
                return `<span class="reaction-btn ${myReaction===e?"active":""}" onclick="reaksiyon('${pid}','${e}','announcements')">${e}<span class="reaction-count">${c>0?c:""}</span></span>`;
            }).join("");
            const mediaHTML = p.mediaUrl
                ? (p.mediaType === "video"
                    ? `<video src="${p.mediaUrl}" controls class="post-media" preload="metadata"></video>`
                    : `<img src="${p.mediaUrl}" class="post-media" onclick="resimTamEkran('${p.mediaUrl}')" loading="lazy">`)
                : "";
            const rolHTML = p.senderRole && p.senderRole !== "user"
                ? `<span class="post-role">${p.senderRole==="muhtar"?"Muhtar":p.senderRole==="yardimci"?"Yardımcı":"Admin"}</span>` : "";
            const silBtn = ayricaliklimi()
                ? `<button class="delete-post-btn" onclick="postSil('${pid}')">🗑️</button>` : "";
            const card = document.createElement("div");
            card.className = "post-card"; card.id = "post-" + pid;
            card.innerHTML = `<div class="post-header"><div class="post-avatar">${(p.sender||"?")[0].toUpperCase()}</div><div class="post-meta"><span class="post-sender">${escapeHtml(p.sender||"Anonim")}${rolHTML}</span><span class="post-time">${zamanFarki(p.time)}</span></div>${silBtn}</div>${p.title?`<div class="post-title">${escapeHtml(p.title)}</div>`:""}${p.text?`<div class="post-text">${escapeHtml(p.text)}</div>`:""}${mediaHTML}<div class="post-actions"><div class="reactions-bar">${reactionHTML}</div><div class="post-btns-row"><button class="comment-count-btn" onclick="yorumModalAc('${pid}','announcements')">💬 ${p.commentCount||0} Yorum</button></div></div>`;
            list.appendChild(card);
        });
    }, () => {
        document.getElementById("postList").innerHTML = `<div class="empty-state"><p>⚠️ Yükleme hatası. Sayfayı yenileyin.</p></div>`;
    });
}

async function akisPaylas() {
    if (!currentUser) return loginModalAc();
    if (!ayricaliklimi()) return alert("Yetkiniz yok!");
    const title = document.getElementById("postTitle").value.trim();
    const text = document.getElementById("postText").value.trim();
    const file = document.getElementById("postFile").files[0];
    if (!title && !text && !file) return alert("En az bir şey ekleyin!");
    if (kufurKontrol(title+" "+text)) return alert("⚠️ Uygunsuz içerik!");
    const btn = document.getElementById("postBtn"); btn.disabled = true; btn.textContent = "⏳ Yükleniyor...";
    try {
        let mediaUrl = "", mediaType = "";
        if (file) { const r = await cloudinaryYukle(file); mediaUrl = r.url; mediaType = r.type; }
        await db.collection("announcements").add({
            sender: userProfile.name, senderUid: currentUser.uid,
            senderRole: userProfile.rol || userProfile.role || "user",
            title, text, mediaUrl, mediaType, reactions: {}, commentCount: 0,
            time: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById("postTitle").value = "";
        document.getElementById("postText").value = "";
        document.getElementById("postFile").value = "";
        document.getElementById("postPreview").innerHTML = "";
    } catch(e) { alert("⚠️ Paylaşım başarısız: " + e.message); }
    btn.disabled = false; btn.textContent = "📢 Paylaş";
}

async function reaksiyon(postId, emoji, collection) {
    if (!currentUser) { loginModalAc(); return; }
    const ref = db.collection(collection).doc(postId), snap = await ref.get();
    const reactions = { ...(snap.data().reactions||{}) };
    if (reactions[currentUser.uid] === emoji) delete reactions[currentUser.uid];
    else reactions[currentUser.uid] = emoji;
    await ref.update({ reactions });
}

async function postSil(postId) {
    if (!ayricaliklimi() || !confirm("Bu gönderiyi silmek istiyor musunuz?")) return;
    try { await db.collection("announcements").doc(postId).delete(); } catch(e) { alert("Silme hatası!"); }
}

// ─── NOSTALJİ ────────────────────────────────────────────
function nostaljiDinle() {
    const list = document.getElementById("nostaljiList");
    if (!list) return;
    list.innerHTML = `<div class="posts-loading">⏳ Anılar yükleniyor...</div>`;
    db.collection("nostalgia").where("status","==","published").orderBy("time","desc").onSnapshot(snap => {
        if (snap.empty) { list.innerHTML = `<div class="empty-state"><div class="empty-icon">📸</div><p>Henüz nostalji anısı yok.</p></div>`; return; }
        list.innerHTML = "";
        snap.forEach(doc => list.appendChild(buildNostaljiCard(doc.id, doc.data())));
    });
}
function buildNostaljiCard(pid, p) {
    const reactions = p.reactions||{}, myReaction = currentUser ? reactions[currentUser.uid] : null;
    const emojiS = {}; Object.values(reactions).forEach(e => { emojiS[e]=(emojiS[e]||0)+1; });
    const reactionHTML = EMOJIS.map(e => {
        const c = emojiS[e]||0;
        return `<span class="reaction-btn ${myReaction===e?"active":""}" onclick="reaksiyon('${pid}','${e}','nostalgia')">${e}<span class="reaction-count">${c>0?c:""}</span></span>`;
    }).join("");
    const mediaHTML = p.mediaUrl
        ? (p.mediaType==="video"
            ? `<video src="${p.mediaUrl}" controls class="post-media" preload="metadata"></video>`
            : `<img src="${p.mediaUrl}" class="post-media" onclick="resimTamEkran('${p.mediaUrl}')" loading="lazy">`)
        : "";
    const silBtn = ayricaliklimi() ? `<button class="delete-post-btn" onclick="nostaljiSil('${pid}')">🗑️</button>` : "";
    const card = document.createElement("div");
    card.className = "post-card";
    card.innerHTML = `<div class="post-header"><div class="post-avatar nostalji-avatar">📸</div><div class="post-meta"><span class="post-sender">${escapeHtml(p.sender||"Anonim")}${p.year?`<span class="nostalji-year-badge">📅 ${escapeHtml(p.year)}</span>`:""}</span><span class="post-time">${zamanFarki(p.time)}</span></div>${silBtn}</div>${p.title?`<div class="post-title">${escapeHtml(p.title)}</div>`:""}${p.text?`<div class="post-text">${escapeHtml(p.text)}</div>`:""}${mediaHTML}<div class="post-actions"><div class="reactions-bar">${reactionHTML}</div><div class="post-btns-row"><button class="comment-count-btn" onclick="yorumModalAc('${pid}','nostalgia')">💬 ${p.commentCount||0} Yorum</button></div></div>`;
    return card;
}
async function nostaljiPaylas() {
    if (!currentUser) return loginModalAc();
    const title = document.getElementById("nostaljiTitle").value.trim();
    const year = document.getElementById("nostaljiYear").value.trim();
    const text = document.getElementById("nostaljiText").value.trim();
    const file = document.getElementById("nostaljiFile").files[0];
    if (!title && !text && !file) return alert("En az bir şey ekleyin!");
    if (kufurKontrol(title+" "+text)) return alert("⚠️ Uygunsuz içerik!");
    const btn = document.getElementById("nostaljiBtn"); btn.disabled = true; btn.textContent = "⏳ Yükleniyor...";
    try {
        let mediaUrl = "", mediaType = "";
        if (file) { const r = await cloudinaryYukle(file); mediaUrl = r.url; mediaType = r.type; }
        const isPrivileged = ayricaliklimi();
        await db.collection("nostalgia").add({
            title, year, text, mediaUrl, mediaType,
            sender: userProfile.name, uid: currentUser.uid,
            status: isPrivileged ? "published" : "pending",
            reactions: {}, commentCount: 0,
            time: firebase.firestore.FieldValue.serverTimestamp()
        });
        ["nostaljiTitle","nostaljiYear","nostaljiText"].forEach(id => document.getElementById(id).value = "");
        document.getElementById("nostaljiFile").value = "";
        document.getElementById("nostaljiPreview").innerHTML = "";
        alert(isPrivileged ? "✅ Paylaşıldı!" : "✅ Gönderildi! Onaydan sonra yayınlanacak.");
    } catch(e) { alert("Hata: " + e.message); }
    btn.disabled = false; btn.textContent = "📸 Anıyı Gönder";
}
async function nostaljiSil(pid) {
    if (!ayricaliklimi() || !confirm("Bu anıyı silmek istiyor musunuz?")) return;
    try { await db.collection("nostalgia").doc(pid).delete(); } catch(e) { alert("Silinemedi!"); }
}

// ─── İLANLAR ─────────────────────────────────────────────
function ilanFormToggle() {
    if (!currentUser) { loginModalAc(); return; }
    const div = document.getElementById("ilanFormDiv");
    div.classList.toggle("hidden");
}
function ilanFotoOnizle(input) {
    const div = document.getElementById("ilanFotoOnizleDiv"); div.innerHTML = "";
    Array.from(input.files).slice(0,5).forEach(f => {
        const url = URL.createObjectURL(f); div.innerHTML += `<img src="${url}" style="width:70px;height:70px;object-fit:cover;border-radius:6px;">`;
    });
}
function ilanFiltre(kat, btn) {
    aktifIlanFiltre = kat;
    document.querySelectorAll(".filtre-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    if (ilanUnsubscribe) { ilanUnsubscribe(); ilanUnsubscribe = null; }
    ilanlarDinle();
}
function ilanlarDinle() {
    const list = document.getElementById("ilanList");
    if (!list) return;
    if (ilanUnsubscribe) ilanUnsubscribe();
    ilanUnsubscribe = db.collection("ilanlar").where("status","==","published").orderBy("time","desc").onSnapshot(snap => {
        let docs = [];
        snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
        if (aktifIlanFiltre !== "hepsi") docs = docs.filter(d => d.kategori === aktifIlanFiltre);
        if (docs.length === 0) { list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Bu kategoride ilan yok</p></div>`; return; }
        list.innerHTML = "";
        docs.forEach(il => {
            const silBtn = (ayricaliklimi() || (currentUser && il.uid === currentUser.uid))
                ? `<button class="delete-post-btn" onclick="ilanSil('${il.id}')">🗑️</button>` : "";
            const fotograflar = il.fotograflar || (il.fotografUrl ? [il.fotografUrl] : []);
            const fotoHTML = fotograflar.length > 0
                ? `<div class="ilan-foto-slayt">${fotograflar.map(url=>`<img src="${url}" class="ilan-foto-img" onclick="resimTamEkran('${url}')" loading="lazy">`).join("")}</div>` : "";
            const div = document.createElement("div"); div.className = "post-card";
            div.innerHTML = `<div class="post-header"><div class="post-avatar" style="background:linear-gradient(135deg,#ff9800,#e65100);">${(il.sender||"?")[0].toUpperCase()}</div><div class="post-meta"><span class="post-sender">${escapeHtml(il.sender||"Anonim")} <span class="ilan-kat-badge">${ILAN_KAT[il.kategori]||"📌"}</span></span><span class="post-time">${zamanFarki(il.time)}</span></div>${silBtn}</div>${fotoHTML}<div class="post-title">${escapeHtml(il.baslik||"")}</div>${il.aciklama?`<div class="post-text">${escapeHtml(il.aciklama)}</div>`:""}${il.telefon?`<div style="padding:8px 16px 14px;"><a href="tel:${il.telefon}" class="ilan-tel-btn">📞 ${escapeHtml(il.telefon)}</a></div>`:""}`;
            list.appendChild(div);
        });
    });
}
async function ilanPaylas() {
    if (!currentUser) return loginModalAc();
    const baslik = document.getElementById("ilanBaslik").value.trim();
    const aciklama = document.getElementById("ilanAciklama").value.trim();
    const telefon = document.getElementById("ilanTelefon").value.trim();
    const kategori = document.getElementById("ilanKategori").value;
    const files = Array.from(document.getElementById("ilanFotolar").files).slice(0,5);
    if (!baslik) return alert("Başlık zorunludur!");
    if (kufurKontrol(baslik+" "+aciklama)) return alert("⚠️ Uygunsuz içerik!");
    const btn = document.getElementById("ilanPaylasBtnMain"); btn.disabled = true; btn.textContent = "⏳ Yükleniyor...";
    try {
        const fotograflar = [];
        for (const f of files) { const r = await cloudinaryYukle(f); fotograflar.push(r.url); }
        const isPrivileged = ayricaliklimi();
        await db.collection("ilanlar").add({
            baslik, aciklama, telefon, kategori, fotograflar,
            sender: userProfile.name, uid: currentUser.uid,
            status: isPrivileged ? "published" : "pending",
            time: firebase.firestore.FieldValue.serverTimestamp()
        });
        ["ilanBaslik","ilanAciklama","ilanTelefon"].forEach(id => document.getElementById(id).value = "");
        document.getElementById("ilanFotolar").value = "";
        document.getElementById("ilanFotoOnizleDiv").innerHTML = "";
        document.getElementById("ilanFormDiv").classList.add("hidden");
        alert(isPrivileged ? "✅ İlanınız yayınlandı!" : "✅ İlanınız gönderildi! Admin onayından sonra yayınlanacak.");
    } catch(e) { alert("Hata: " + e.message); }
    btn.disabled = false; btn.textContent = "📋 İlanı Gönder";
}
async function ilanSil(id) {
    if (!confirm("İlanı silmek istiyor musunuz?")) return;
    try { await db.collection("ilanlar").doc(id).delete(); } catch(e) { alert("Silinemedi!"); }
}

// ─── FİRMALAR ────────────────────────────────────────────
function isletmeleriYukle() {
    db.collection("businesses").orderBy("time","desc").onSnapshot(snap => {
        const container = document.getElementById("bizList");
        const empty = document.getElementById("bizEmpty");
        if (!container) return;
        if (snap.empty) { container.innerHTML = ""; if (empty) empty.classList.remove("hidden"); return; }
        if (empty) empty.classList.add("hidden");
        container.innerHTML = "";
        snap.forEach(doc => {
            const b = { id: doc.id, ...doc.data() };
            const iletisim = [];
            if (b.phone) iletisim.push(`<a href="tel:${b.phone}" class="biz-iletisim-link">📞 ${escapeHtml(b.phone)}</a>`);
            if (b.whatsapp) iletisim.push(`<a href="https://wa.me/${b.whatsapp.replace(/[^0-9]/g,'')}" target="_blank" class="biz-iletisim-link">💬 WhatsApp</a>`);
            if (b.url) iletisim.push(`<a href="${b.url}" target="_blank" class="biz-iletisim-link">🌐 Web</a>`);
            if (b.email) iletisim.push(`<a href="mailto:${b.email}" class="biz-iletisim-link">✉️ E-posta</a>`);
            const card = document.createElement("div"); card.className = "biz-card";
            card.innerHTML = `${b.imageUrl?`<img src="${b.imageUrl}" class="biz-img" loading="lazy" alt="${escapeHtml(b.name)}">`:`<div class="biz-img-placeholder">🏢</div>`}<div class="biz-body"><div class="biz-cat">${escapeHtml(b.category||"İşletme")}</div><h3 class="biz-name">${escapeHtml(b.name)}</h3>${b.description?`<p class="biz-desc">${escapeHtml(b.description)}</p>`:""}${b.address?`<p class="biz-addr">📍 ${escapeHtml(b.address)}</p>`:""} ${iletisim.length>0?`<div class="biz-iletisim-bar">${iletisim.join("")}</div>`:""}</div>`;
            container.appendChild(card);
        });
    });
}

// ─── HAKKIMIZDA ───────────────────────────────────────────
async function hakkimizdaYukle() {
    const el = document.getElementById("hakkimizdaIcerik"); if (!el) return;
    try {
        const snap = await db.collection("settings").doc("hakkimizda").get();
        if (snap.exists) {
            const d = snap.data();
            el.innerHTML = `${d.metin?`<p class="about-text">${escapeHtml(d.metin)}</p>`:""}${d.konum?`<p class="about-text">📍 ${escapeHtml(d.konum)}</p>`:""}${d.telefon?`<p class="about-text"><a href="tel:${d.telefon}" style="color:#2d4a35;">📞 ${escapeHtml(d.telefon)}</a></p>`:""}${d.url?`<p class="about-text"><a href="${d.url}" target="_blank" style="color:#2d4a35;">🌐 ${escapeHtml(d.url)}</a></p>`:""}`;
        } else {
            el.innerHTML = `<p class="about-text" style="font-size:17px;font-weight:700;color:#2d4a35;">🏡 Emirler Köyü Portalı</p><p class="about-text">Emirler Köyü Portalı; köy sakinlerini tek bir çatı altında buluşturmak, duyuruları anında iletmek ve komşuluk ruhunu dijital dünyaya taşımak amacıyla kurulmuştur.</p><p class="about-text">📢 <b>Köy Meydanı</b> ile muhtar ve yetkililerin duyuruları anında herkesin ekranına ulaşır.</p><p class="about-text">📸 <b>Nostalji</b> bölümünde eski fotoğraflar, anılar ve köyün geçmişi bir araya gelir.</p><p class="about-text">📋 <b>İlan Tahtası</b> ile satılık, kiralık, kayıp ve aranan ilanlarınızı köy içinde kolayca paylaşabilirsiniz.</p><p class="about-text">🌾 <b>Köy Bilgileri</b> bölümünde hava durumu, namaz vakitleri, tarım takvimi ve hayvan sağlığı rehberi hep güncel.</p><p class="about-text" style="font-size:14px;color:#888;margin-top:16px;padding-top:12px;border-top:1px solid #eee;">📍 Emirler Köyü, Türkiye<br><br>Sürüm 4.0 · Bu portal köylüler için yapılmıştır. 💚</p>`;
        }
    } catch(e) { el.innerHTML = `<p class="about-text">Emirler Köyü Portalı</p>`; }
}

// ─── YORUMLAR ─────────────────────────────────────────────
function yorumModalAc(postId, collection) {
    currentPostId = postId; currentCollection = collection || "announcements";
    document.getElementById("commentsModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
    if (commentsUnsubscribe) commentsUnsubscribe();
    commentsUnsubscribe = db.collection(currentCollection).doc(postId).collection("comments").orderBy("time","asc").onSnapshot(snap => {
        const list = document.getElementById("commentsList");
        if (snap.empty) { list.innerHTML = `<p class="no-comments">💬 Henüz yorum yok. İlk yorumu siz yapın!</p>`; return; }
        list.innerHTML = "";
        snap.forEach(doc => {
            const c = doc.data();
            const isMe = currentUser && c.uid === currentUser.uid;
            const canDelete = ayricaliklimi() || isMe;
            const item = document.createElement("div"); item.className = "comment-item";
            item.innerHTML = `<div class="comment-avatar">${(c.sender||"?")[0].toUpperCase()}</div><div class="comment-body"><span class="comment-sender">${escapeHtml(c.sender||"Anonim")}</span><div class="comment-text">${escapeHtml(c.text)}</div><span class="comment-time">${zamanFarki(c.time)}</span></div>${canDelete?`<button style="background:none;border:none;font-size:14px;cursor:pointer;opacity:0.5;padding:4px;" onclick="yorumSil('${postId}','${doc.id}')">🗑️</button>`:""}`;
            list.appendChild(item);
        });
        list.scrollTop = list.scrollHeight;
    });
}
function yorumModalKapat(e) {
    if (e && e.target !== document.getElementById("commentsModal")) return;
    document.getElementById("commentsModal").classList.add("hidden");
    document.body.style.overflow = "";
    if (commentsUnsubscribe) { commentsUnsubscribe(); commentsUnsubscribe = null; }
}
async function yorumGonder() {
    if (!currentUser) { loginModalAc(); return; }
    const input = document.getElementById("commentInput");
    const text = input.value.trim();
    if (!text || !currentPostId) return;
    if (kufurKontrol(text)) { alert("⚠️ Uygunsuz kelime kullanılamaz!"); return; }
    try {
        input.value = "";
        await db.collection(currentCollection).doc(currentPostId).collection("comments").add({
            text, sender: userProfile.name, uid: currentUser.uid,
            time: firebase.firestore.FieldValue.serverTimestamp()
        });
        await db.collection(currentCollection).doc(currentPostId).update({
            commentCount: firebase.firestore.FieldValue.increment(1)
        });
    } catch(e) { alert("Yorum gönderilemedi: " + e.message); }
}
async function yorumSil(postId, commentId) {
    try {
        await db.collection(currentCollection).doc(postId).collection("comments").doc(commentId).delete();
        await db.collection(currentCollection).doc(postId).update({ commentCount: firebase.firestore.FieldValue.increment(-1) });
    } catch(e) { alert("Silinemedi!"); }
}

// ─── HAVA DURUMU ─────────────────────────────────────────
async function havaDurumuYukle() {
    if (havaYuklendi) return;
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${KOY_LAT}&longitude=${KOY_LNG}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FIstanbul&forecast_days=7`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("API hatası");
        const d = await res.json();
        const cur = d.current, daily = d.daily;
        const durum = HAVA_KODLAR[cur.weathercode] || "🌡️";
        const sicaklik = Math.round(cur.temperature_2m);

        // Info bar
        const havaKisa = document.getElementById("havaKisa");
        if (havaKisa) havaKisa.textContent = `${sicaklik}°C · ${durum.split(" ")[0]}`;

        // Sidebar widget
        let gunlerHTML = "";
        for (let i = 0; i < 7; i++) {
            const t = new Date(daily.time[i]);
            const g = i === 0 ? "Bug." : GUNLER[t.getDay()];
            const ikon = (HAVA_KODLAR[daily.weathercode[i]] || "🌡️").split(" ")[0];
            gunlerHTML += `<div class="hava-mini-gun"><div class="hava-gun-ad">${g}</div><span class="hava-mini-gun-ikon">${ikon}</span><div class="hava-mini-gun-temp">${Math.round(daily.temperature_2m_max[i])}°</div><div style="font-size:10px;color:#aaa;">${Math.round(daily.temperature_2m_min[i])}°</div></div>`;
        }
        const sidebarWidget = document.getElementById("havaWidgetSidebar");
        if (sidebarWidget) {
            sidebarWidget.innerHTML = `<div class="hava-sidebar-main"><div class="hava-sidebar-temp">${sicaklik}°C</div><div class="hava-sidebar-durum">${durum}</div><div class="hava-sidebar-detail"><span>💧 %${cur.relative_humidity_2m}</span><span>💨 ${Math.round(cur.wind_speed_10m)} km/h</span></div></div><div class="hava-mini-gunler">${gunlerHTML}</div>`;
        }
        havaYuklendi = true;
    } catch(e) {
        const el = document.getElementById("havaKisa");
        if (el) el.textContent = "Bilgi alınamadı";
    }
}

// Köy sayfasındaki hava widget (detaylı)
async function havaDurumuKoy() {
    const w = document.getElementById("havaWidgetKoy");
    if (!w) return;
    if (havaYuklendi) {
        // Use same sidebar content
        const sidebar = document.getElementById("havaWidgetSidebar");
        if (sidebar) { w.innerHTML = sidebar.innerHTML; return; }
    }
    w.innerHTML = `<div class="widget-loading">⏳</div>`;
    await havaDurumuYukle();
    const sidebar = document.getElementById("havaWidgetSidebar");
    if (sidebar && w) { w.innerHTML = sidebar.innerHTML; }
}

// ─── NAMAZ VAKİTLERİ ────────────────────────────────────
async function namazYukle() {
    if (namazYuklendi) return;
    try {
        const b = new Date();
        const res = await fetch(`https://api.aladhan.com/v1/timings/${b.getDate()}-${b.getMonth()+1}-${b.getFullYear()}?latitude=${KOY_LAT}&longitude=${KOY_LNG}&method=13`);
        const d = await res.json();
        const v = d.data.timings;
        namazVakitleri = v;
        const fmt = s => s.split(" ")[0];

        // Info bar update
        namazInfoBarGuncelle();

        // Sidebar widget
        const simdi = new Date();
        const simdikiDakika = simdi.getHours() * 60 + simdi.getMinutes();
        const vakitler = [
            { ikon:"🌅", ad:"İmsak", saat:fmt(v.Fajr) },
            { ikon:"☀️", ad:"Güneş", saat:fmt(v.Sunrise) },
            { ikon:"🌞", ad:"Öğle", saat:fmt(v.Dhuhr) },
            { ikon:"🌇", ad:"İkindi", saat:fmt(v.Asr) },
            { ikon:"🌆", ad:"Akşam", saat:fmt(v.Maghrib) },
            { ikon:"🌙", ad:"Yatsı", saat:fmt(v.Isha) }
        ];
        const vakit_html = vakitler.map(vv => {
            const [h, m] = vv.saat.split(":").map(Number);
            const dk = h * 60 + m;
            const aktif = Math.abs(dk - simdikiDakika) < 30;
            return `<div class="namaz-satir-sidebar ${aktif?"aktif-vakit":""}"><span class="namaz-ad-sidebar">${vv.ikon} ${vv.ad}</span><span class="namaz-saat-sidebar">${vv.saat}</span></div>`;
        }).join("");
        const sidebarWidget = document.getElementById("namazWidgetSidebar");
        if (sidebarWidget) sidebarWidget.innerHTML = `<div style="font-size:11px;color:#aaa;font-family:var(--font-ui);margin-bottom:8px;">📅 ${d.data.date.readable}</div>${vakit_html}`;
        namazYuklendi = true;
    } catch(e) {
        const el = document.getElementById("namazKisa");
        if (el) el.textContent = "Bilgi alınamadı";
    }
}

// Köy sayfasındaki namaz widget
async function namazKoy() {
    const w = document.getElementById("namazWidgetKoy");
    if (!w) return;
    if (namazYuklendi) {
        const sidebar = document.getElementById("namazWidgetSidebar");
        if (sidebar) { w.innerHTML = sidebar.innerHTML; return; }
    }
    w.innerHTML = `<div class="widget-loading">⏳</div>`;
    await namazYukle();
    const sidebar = document.getElementById("namazWidgetSidebar");
    if (sidebar && w) { w.innerHTML = sidebar.innerHTML; }
}

// ─── TARIM & HAYVAN BİLGİLERİ ────────────────────────────
async function tarimKoy() {
    const w = document.getElementById("tarimWidgetKoy"); if (!w) return;
    try {
        const snap = await db.collection("settings").doc("tarim").get();
        const liste = (snap.exists && snap.data().liste?.length > 0) ? snap.data().liste : TARIM_VARSAYILAN;
        const buAy = AYLAR[new Date().getMonth()];
        w.innerHTML = liste.map(t =>
            `<div class="tarim-satir ${t.ay===buAy?"tarim-bu-ay":""}"><span class="tarim-ay">${t.ay}</span><span class="tarim-is">${t.is}</span></div>`
        ).join("");
    } catch(e) {
        w.innerHTML = TARIM_VARSAYILAN.map(t =>
            `<div class="tarim-satir"><span class="tarim-ay">${t.ay}</span><span class="tarim-is">${t.is}</span></div>`
        ).join("");
    }
}
function asiKoy() {
    const w = document.getElementById("asiWidgetKoy"); if (!w) return;
    w.innerHTML = ASI_LISTESI.map(a =>
        `<div class="asi-satir"><div class="asi-hayvan">${a.hayvan}</div><div class="asi-bilgi"><div class="asi-ad">${a.asi}</div><div class="asi-detay">📅 ${a.ay} · ${a.periyot}</div></div></div>`
    ).join("");
}
function hastalikKoy() {
    const w = document.getElementById("hastalikWidgetKoy"); if (!w) return;
    w.innerHTML = HASTALIK_LISTESI.map(h =>
        `<div class="hastalik-kart ${h.vurgu?"hastalik-acil":""}"><div class="hastalik-isim">${h.isim}</div><div class="hastalik-satir"><span class="hastalik-etiket">Belirtiler:</span> ${h.belirtiler}</div><div class="hastalik-satir"><span class="hastalik-etiket">Önlem:</span> ${h.onlem}</div></div>`
    ).join("");
}

// ─── SERVICE WORKER ───────────────────────────────────────
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(err => console.warn("SW:", err));
}
