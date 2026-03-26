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

// 1. Cihaz ID ve Onay Yönetimi
if(localStorage.getItem('ok_accepted')) {
    document.getElementById('termsOverlay').style.display = 'none';
    document.getElementById('app').classList.remove('hidden');
}

function onayVer() {
    localStorage.setItem('ok_accepted', 'true');
    location.reload();
}

// 2. Oturum Kontrolü
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const doc = await db.collection("users").doc(user.uid).get();
        if(!doc.exists) { auth.signOut(); return; }
        const data = doc.data();

        if(data.isBlocked) { alert("Engellendiniz!"); auth.signOut(); return; }

        // Cihaz Kilidi (Tek cihaz kuralı)
        let deviceId = localStorage.getItem('e_device') || 'dv-' + Math.random().toString(36).substr(2,9);
        localStorage.setItem('e_device', deviceId);
        
        if(data.rol !== 'admin') {
            if(!data.deviceId) await db.collection("users").doc(user.uid).update({deviceId});
            else if(data.deviceId !== deviceId) { alert("Güvenlik: Başka cihazdan giriş yapılamaz."); auth.signOut(); return; }
        }

        currentUserData = data;
        loadApp();
    } else {
        document.getElementById('authPage').classList.remove('hidden');
        document.getElementById('mainContent').classList.add('hidden');
        document.getElementById('navBar').classList.add('hidden');
    }
});

function loadApp() {
    document.getElementById('authPage').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    document.getElementById('navBar').classList.remove('hidden');
    document.getElementById('userMailInfo').innerText = auth.currentUser.email;
    
    if(['admin','muhtar','yardimci'].includes(currentUserData.rol)) document.getElementById('adminPostPanel').classList.remove('hidden');
    if(currentUserData.rol === 'admin') document.getElementById('adminMasterPanel').classList.remove('hidden');
    tabDegistir('feed');
}

// 3. Meydan Paylaşımları
async function paylas() {
    const text = document.getElementById('postTitle').value;
    const file = document.getElementById('postFile').files[0];
    if(!text && !file) return;

    let url = "";
    if(file) {
        const ref = storage.ref(`feed/${Date.now()}`);
        await ref.put(file);
        url = await ref.getDownloadURL();
    }
    await db.collection("announcements").add({
        author: currentUserData.name,
        content: text,
        img: url,
        time: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('postTitle').value = "";
    document.getElementById('postFile').value = "";
    alert("Paylaşıldı!");
}

db.collection("announcements").orderBy("time","desc").onSnapshot(snap => {
    let html = "";
    snap.forEach(d => {
        const p = d.data();
        html += `<div class="post-card">
            <div class="post-user">${p.author}</div>
            <div class="post-txt">${p.content}</div>
            ${p.img ? `<img src="${p.img}" class="post-img">` : ""}
        </div>`;
    });
    document.getElementById('feedList').innerHTML = html;
});

// 4. Sohbet İşlemleri
function mesajGonder() {
    const m = document.getElementById('chatInput').value;
    if(!m) return;
    db.collection("chat").add({
        uid: auth.currentUser.uid,
        name: currentUserData.name,
        msg: m,
        time: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('chatInput').value = "";
}

db.collection("chat").orderBy("time","asc").onSnapshot(snap => {
    const box = document.getElementById('chatBox');
    box.innerHTML = "";
    snap.forEach(d => {
        const c = d.data();
        box.innerHTML += `<div class="msg ${c.uid === auth.currentUser.uid ? 'me':'other'}">
            <small style="font-size:10px; color:gray">${c.name}</small><br>${c.msg}
        </div>`;
    });
    box.scrollTop = box.scrollHeight;
});

// 5. Fonksiyonlar
function tabDegistir(t) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-' + t).classList.remove('hidden');
}

async function girisYap() {
    const e = document.getElementById('logEmail').value;
    const p = document.getElementById('logPass').value;
    await auth.signInWithEmailAndPassword(e, p).catch(err => alert("Hata: " + err.message));
}

async function kayitOl() {
    const e = document.getElementById('regEmail').value;
    const p = document.getElementById('regPass').value;
    const n = document.getElementById('regName').value;
    const res = await auth.createUserWithEmailAndPassword(e, p);
    await db.collection("users").doc(res.user.uid).set({
        name: n, email: e, rol: 'user', isBlocked: false, deviceId: null
    });
}

function toggleAuth(r) {
    document.getElementById('loginForm').classList.toggle('hidden', r);
    document.getElementById('registerForm').classList.toggle('hidden', !r);
}

function cikisYap() { auth.signOut(); location.reload(); }
