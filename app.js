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

// Başlangıç Kontrolü
if(localStorage.getItem('termsAccepted')) {
    document.getElementById('termsOverlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
}

function onayVer() {
    if(!document.getElementById('termsCheck').checked) return alert("Şartları kabul etmelisiniz!");
    localStorage.setItem('termsAccepted', 'true');
    location.reload();
}

// Oturum Takibi
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userDoc = await db.collection("users").doc(user.uid).get();
        if(!userDoc.exists) return auth.signOut();
        const data = userDoc.data();

        if(data.isBlocked) {
            alert("Hesabınız engellendi!");
            auth.signOut();
            return;
        }

        // Cihaz Kısıtlaması (Admin hariç)
        const myDeviceId = getDeviceId();
        if(data.rol !== 'admin') {
            if(!data.deviceId) {
                await db.collection("users").doc(user.uid).update({ deviceId: myDeviceId });
            } else if(data.deviceId !== myDeviceId) {
                alert("Bu hesap başka bir cihaza tanımlıdır!");
                auth.signOut();
                return;
            }
        }

        currentUserData = data;
        showMainApp();
    } else {
        showAuthPage();
    }
});

function getDeviceId() {
    let id = localStorage.getItem('emirler_device_id');
    if(!id) {
        id = 'dev_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('emirler_device_id', id);
    }
    return id;
}

// Auth İşlemleri
async function kayitOl() {
    const email = document.getElementById('regEmail').value;
    const pass = document.getElementById('regPass').value;
    const name = document.getElementById('regName').value;
    if(pass.length < 6) return alert("Şifre zayıf!");
    try {
        const res = await auth.createUserWithEmailAndPassword(email, pass);
        await db.collection("users").doc(res.user.uid).set({
            name, email, rol: 'user', isBlocked: false, deviceId: null
        });
    } catch(e) { alert(e.message); }
}

async function girisYap() {
    const e = document.getElementById('logEmail').value;
    const p = document.getElementById('logPass').value;
    try { await auth.signInWithEmailAndPassword(e, p); } catch(e) { alert("Hatalı giriş!"); }
}

function cikisYap() { auth.signOut(); location.reload(); }

// UI Yönetimi
function toggleAuth(showReg) {
    document.getElementById('loginForm').classList.toggle('hidden', showReg);
    document.getElementById('registerForm').classList.toggle('hidden', !showReg);
}

function showMainApp() {
    document.getElementById('authPage').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    document.getElementById('navBar').classList.remove('hidden');
    document.getElementById('userMailInfo').innerText = auth.currentUser.email;
    
    const isSpecial = ['admin','muhtar','yardimci'].includes(currentUserData.rol);
    document.getElementById('adminPostPanel').classList.toggle('hidden', !isSpecial);
    document.getElementById('adminMasterPanel').classList.toggle('hidden', currentUserData.rol !== 'admin');
    tabDegistir('feed');
}

function showAuthPage() {
    document.getElementById('authPage').classList.remove('hidden');
    document.getElementById('mainContent').classList.add('hidden');
    document.getElementById('navBar').classList.add('hidden');
}

function tabDegistir(tab) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-' + tab).classList.remove('hidden');
    if(tab === 'biz') firmalariYukle();
    if(tab === 'settings' && currentUserData.rol === 'admin') adminListele();
}

// Fonksiyonlar (Meydan, Sohbet, Firma)
async function paylas() {
    const title = document.getElementById('postTitle').value;
    const file = document.getElementById('postFile').files[0];
    let url = "";
    if(file) {
        const ref = storage.ref(`posts/${Date.now()}`);
        await ref.put(file);
        url = await ref.getDownloadURL();
    }
    await db.collection("announcements").add({
        author: currentUserData.name,
        text: title,
        media: url,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Paylaşıldı!");
}

db.collection("announcements").orderBy("timestamp","desc").onSnapshot(snap => {
    let html = "";
    snap.forEach(doc => {
        const p = doc.data();
        html += `<div class="card"><b>${p.author}</b><p>${p.text}</p>${p.media ? `<img src="${p.media}" style="width:100%; border-radius:10px;">` : ""}</div>`;
    });
    document.getElementById('feedList').innerHTML = html;
});

function mesajGonder() {
    const txt = document.getElementById('chatInput').value;
    if(!txt) return;
    db.collection("chat").add({
        uid: auth.currentUser.uid,
        name: currentUserData.name,
        text: txt,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('chatInput').value = "";
}

db.collection("chat").orderBy("timestamp","asc").onSnapshot(snap => {
    const box = document.getElementById('chatBox');
    box.innerHTML = "";
    snap.forEach(doc => {
        const m = doc.data();
        const isMe = m.uid === auth.currentUser.uid;
        box.innerHTML += `<div class="msg-bubble ${isMe ? 'me' : 'other'}"><small>${m.name}</small>${m.text}</div>`;
    });
    box.scrollTop = box.scrollHeight;
});

async function firmalariYukle() {
    const snap = await db.collection("businesses").get();
    let docs = []; snap.forEach(d => docs.push(d.data()));
    docs.sort(() => Math.random() - 0.5);
    document.getElementById('bizList').innerHTML = docs.map(b => `
        <div class="biz-item"><div class="biz-content"><h2>${b.name}</h2><p>${b.desc}</p><a href="tel:${b.phone}" class="btn">ARA: ${b.phone}</a></div></div>
    `).join('');
}

async function firmaEkle() {
    await db.collection("businesses").add({
        name: document.getElementById('bizName').value,
        desc: document.getElementById('bizDesc').value,
        phone: document.getElementById('bizPhone').value
    });
    alert("Eklendi!");
}

async function yetkiGuncelle() {
    const email = document.getElementById('targetEmail').value;
    const rol = document.getElementById('targetRole').value;
    const snap = await db.collection("users").where("email","==",email).get();
    if(snap.empty) return alert("Yok!");
    await db.collection("users").doc(snap.docs[0].id).update({ rol });
    alert("Tamam!");
}

function adminListele() {
    db.collection("users").limit(10).onSnapshot(snap => {
        let h = "";
        snap.forEach(d => {
            const u = d.data();
            h += `<div style="display:flex; justify-content:space-between; margin-top:5px;">
                <span>${u.name}</span>
                <button onclick="db.collection('users').doc('${d.id}').update({isBlocked:${!u.isBlocked}})">${u.isBlocked ? 'Aç' : 'Engelle'}</button>
            </div>`;
        });
        document.getElementById('adminUserList').innerHTML = h;
    });
}
