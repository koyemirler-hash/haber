// Firebase Ayarların
const firebaseConfig = {
    apiKey: "AIzaSyDUagdaIoJmkgGjWFv2avYsC7n_-4AJ7s0",
    authDomain: "emirler-c5638.firebaseapp.com",
    projectId: "emirler-c5638",
    storageBucket: "emirler-c5638.firebasestorage.app",
    appId: "1:426225264136:web:ca5184984fc71b1e63853bd"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

let currentUserData = null;
let deferredPrompt;

// PWA Yükleme Butonu Mantığı
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('pwaBtn').classList.remove('hidden');
});

document.getElementById('pwaBtn')?.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') deferredPrompt = null;
    }
});

// Açılış Onayı
function onayVer(){
    if(!document.getElementById('termsCheck').checked) return alert("Şartları kabul etmelisiniz!");
    localStorage.setItem('termsAccepted','true');
    location.reload();
}

if(localStorage.getItem('termsAccepted')) {
    document.getElementById('termsOverlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
}

// Cihaz Kimliği Oluşturma (Cihaz Kısıtlaması İçin)
function getDeviceId() {
    let id = localStorage.getItem('emirler_device_id');
    if(!id) {
        id = 'dev_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('emirler_device_id', id);
    }
    return id;
}

// Auth Takibi
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userDoc = await db.collection("users").doc(user.uid).get();
        const data = userDoc.data();

        // 1. Kara Liste Kontrolü
        if(data.isBlocked) {
            alert("Hesabınız askıya alınmıştır!");
            auth.signOut();
            return;
        }

        // 2. Cihaz Kısıtlaması (Admin Muaf)
        const myDevice = getDeviceId();
        if(data.rol !== 'admin') {
            if(!data.deviceId) {
                await db.collection("users").doc(user.uid).update({ deviceId: myDevice });
            } else if(data.deviceId !== myDevice) {
                alert("Bu hesaba sadece kayıtlı cihazdan girilebilir!");
                auth.signOut();
                return;
            }
        }

        currentUserData = data;
        uiGuncelle(data);
    } else {
        showPage('loginPage');
        document.getElementById('navBar').classList.add('hidden');
        document.getElementById('mainContent').classList.add('hidden');
    }
});

function uiGuncelle(data) {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('registerPage').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    document.getElementById('navBar').classList.remove('hidden');
    document.getElementById('userMailInfo').innerText = auth.currentUser.email + " (" + (data.rol || 'Üye') + ")";

    // Admin/Muhtar Paneli Görünürlüğü
    const canPost = ['admin', 'muhtar', 'yardimci'].includes(data.rol);
    document.getElementById('adminPostPanel').classList.toggle('hidden', !canPost);
    document.getElementById('adminMasterPanel').classList.toggle('hidden', data.rol !== 'admin');
    
    tabDegistir('feed');
    firmalariYukle();
    onlineListesiYukle();
}

// --- Kayıt ve Giriş ---
async function kayitOl() {
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;
    const name = document.getElementById('regName').value;
    if(pass.length < 6) return alert("Şifre en az 6 karakter olmalı.");
    
    try {
        const res = await auth.createUserWithEmailAndPassword(email, pass);
        await db.collection("users").doc(res.user.uid).set({
            name: name,
            email: email,
            rol: 'user',
            isBlocked: false,
            deviceId: getDeviceId(),
            joinDate: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch(e) { alert("Hata: " + e.message); }
}

async function girisYap() {
    const email = document.getElementById('logEmail').value;
    const pass = document.getElementById('logPass').value;
    try { await auth.signInWithEmailAndPassword(email, pass); } 
    catch(e) { alert("Giriş başarısız!"); }
}

function cikisYap() { auth.signOut(); }
function toggleAuth() {
    document.getElementById('loginPage').classList.toggle('hidden');
    document.getElementById('registerPage').classList.toggle('hidden');
}

// --- Köy Meydanı (Paylaşım) ---
async function paylas() {
    const title = document.getElementById('postTitle').value;
    const file = document.getElementById('postFile').files[0];
    if(!title) return;

    let url = "";
    if(file) {
        const ref = storage.ref(`posts/${Date.now()}_${file.name}`);
        await ref.put(file);
        url = await ref.getDownloadURL();
    }

    await db.collection("announcements").add({
        author: currentUserData.name,
        text: title,
        media: url,
        type: file?.type.includes('video') ? 'video' : 'image',
        likes: [],
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('postTitle').value = "";
}

db.collection("announcements").orderBy("timestamp", "desc").onSnapshot(snap => {
    let html = "";
    snap.forEach(doc => {
        const post = doc.data();
        html += `
            <div class="card post-card">
                <b>${post.author}</b>
                <p>${post.text}</p>
                ${post.media ? (post.type === 'video' ? `<video src="${post.media}" controls></video>` : `<img src="${post.media}">`) : ""}
                <div class="post-actions">
                    <button onclick="begen('${doc.id}')">❤️ ${post.likes?.length || 0}</button>
                </div>
            </div>`;
    });
    document.getElementById('feedList').innerHTML = html;
});

// --- Sohbet (WhatsApp Tarzı) ---
function mesajGonder() {
    const msg = document.getElementById('chatInput').value;
    if(!msg) return;
    db.collection("chat").add({
        uid: auth.currentUser.uid,
        name: currentUserData.name,
        text: msg,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('chatInput').value = "";
}

db.collection("chat").orderBy("timestamp", "asc").onSnapshot(snap => {
    const box = document.getElementById('chatBox');
    box.innerHTML = "";
    snap.forEach(doc => {
        const m = doc.data();
        const isMe = m.uid === auth.currentUser.uid;
        const canDelete = ['admin','muhtar','yardimci'].includes(currentUserData.rol);
        
        box.innerHTML += `
            <div class="msg-wrapper ${isMe ? 'me' : 'other'}">
                <div class="msg-bubble">
                    <small>${m.name}</small>
                    <p>${m.text}</p>
                    ${canDelete ? `<span class="del-btn" onclick="mesajSil('${doc.id}')">🗑️</span>` : ""}
                </div>
            </div>`;
    });
    box.scrollTop = box.scrollHeight;
});

async function mesajSil(id) {
    if(confirm("Bu mesajı silmek istiyor musunuz?")) await db.collection("chat").doc(id).delete();
}

// --- Firmalar (Slider) ---
async function firmalariYukle() {
    const snap = await db.collection("businesses").get();
    let docs = [];
    snap.forEach(d => docs.push(d.data()));
    
    // Her açılışta farklı gelmesi için karıştır
    docs.sort(() => Math.random() - 0.5);

    let html = "";
    docs.forEach(b => {
        html += `
            <div class="biz-item">
                <div class="biz-content">
                    <h2>${b.name}</h2>
                    <p>${b.desc}</p>
                    <a href="tel:${b.phone}" class="btn">Hemen Ara: ${b.phone}</a>
                </div>
            </div>`;
    });
    document.getElementById('bizList').innerHTML = html || "<p style='padding:20px'>Firma bulunamadı.</p>";
}

async function firmaEkle() {
    const n = document.getElementById('bizName').value;
    const d = document.getElementById('bizDesc').value;
    const p = document.getElementById('bizPhone').value;
    await db.collection("businesses").add({ name: n, desc: d, phone: p });
    alert("Firma eklendi!");
}

// --- Admin Paneli Fonksiyonları ---
async function yetkiVer() {
    const email = document.getElementById('targetEmail').value;
    const rol = document.getElementById('targetRole').value;
    const snap = await db.collection("users").where("email","==",email).get();
    if(snap.empty) return alert("Kullanıcı bulunamadı!");
    
    await db.collection("users").doc(snap.docs[0].id).update({ rol: rol });
    alert("Yetki güncellendi!");
}

function onlineListesiYukle() {
    db.collection("users").limit(20).onSnapshot(snap => {
        let html = "";
        snap.forEach(doc => {
            const u = doc.data();
            html += `
                <div class="admin-user-item">
                    <span>${u.name} (${u.rol})</span>
                    <div>
                        <button onclick="kullaniciEngel('${doc.id}', ${!u.isBlocked})">${u.isBlocked ? '✅ Aç' : '🚫 Engelle'}</button>
                        <button onclick="kullaniciSil('${doc.id}')">🗑️ Sil</button>
                    </div>
                </div>`;
        });
        document.getElementById('adminUserList').innerHTML = html;
    });
}

async function kullaniciEngel(id, stat) {
    await db.collection("users").doc(id).update({ isBlocked: stat });
}

async function kullaniciSil(id) {
    if(confirm("Kullanıcıyı tamamen silmek istiyor musunuz?")) await db.collection("users").doc(id).delete();
}

// Navigasyon
function tabDegistir(tab) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-' + tab).classList.remove('hidden');
}
