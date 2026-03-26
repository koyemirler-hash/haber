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

// 1. Cihaz ID ve Onay
if(localStorage.getItem('termsAccepted')) {
    document.getElementById('termsOverlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
}
function onayVer() {
    if(!document.getElementById('termsCheck').checked) return alert("Şartları onayla!");
    localStorage.setItem('termsAccepted', 'true');
    location.reload();
}

// 2. Auth Takibi
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const doc = await db.collection("users").doc(user.uid).get();
        if(!doc.exists) return auth.signOut();
        const data = doc.data();

        if(data.isBlocked) { alert("Engellendiniz!"); return auth.signOut(); }

        // Cihaz Kilidi
        let myId = localStorage.getItem('e_id') || 'd' + Math.random().toString(36).substr(2,7);
        localStorage.setItem('e_id', myId);
        if(data.rol !== 'admin') {
            if(!data.deviceId) await db.collection("users").doc(user.uid).update({deviceId: myId});
            else if(data.deviceId !== myId) { alert("Başka cihaz yasak!"); return auth.signOut(); }
        }

        currentUserData = data;
        initApp();
    } else { showAuth(); }
});

function initApp() {
    document.getElementById('authPage').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    document.getElementById('navBar').classList.remove('hidden');
    document.getElementById('userMailInfo').innerText = auth.currentUser.email;
    
    if(['admin','muhtar','yardimci'].includes(currentUserData.rol)) document.getElementById('adminPostPanel').classList.remove('hidden');
    if(currentUserData.rol === 'admin') document.getElementById('adminMasterPanel').classList.remove('hidden');
    tabDegistir('feed');
}

// 3. Meydan, Sohbet, Firmalar
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
        time: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Paylaşıldı!");
}

db.collection("announcements").orderBy("time","desc").onSnapshot(snap => {
    let h = "";
    snap.forEach(d => {
        const p = d.data();
        h += `<div class="post-card"><div class="post-header">${p.author}</div><div class="post-content">${p.text}</div>${p.media ? `<img src="${p.media}" class="post-img">`:""}</div>`;
    });
    document.getElementById('feedList').innerHTML = h;
});

function mesajGonder() {
    const t = document.getElementById('chatInput').value;
    if(!t) return;
    db.collection("chat").add({
        uid: auth.currentUser.uid,
        name: currentUserData.name,
        text: t,
        time: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('chatInput').value = "";
}

db.collection("chat").orderBy("time","asc").onSnapshot(snap => {
    const b = document.getElementById('chatBox');
    b.innerHTML = "";
    snap.forEach(d => {
        const m = d.data();
        b.innerHTML += `<div class="msg-bubble ${m.uid === auth.currentUser.uid ? 'me':'other'}"><small>${m.name}</small><br>${m.text}</div>`;
    });
    b.scrollTop = b.scrollHeight;
});

function tabDegistir(t) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-' + t).classList.remove('hidden');
}

async function girisYap() {
    const e = document.getElementById('logEmail').value;
    const p = document.getElementById('logPass').value;
    await auth.signInWithEmailAndPassword(e, p).catch(err => alert(err.message));
}
function cikisYap() { auth.signOut(); location.reload(); }
function showAuth() { document.getElementById('authPage').classList.remove('hidden'); }
function toggleAuth(r) {
    document.getElementById('loginForm').classList.toggle('hidden', r);
    document.getElementById('registerForm').classList.toggle('hidden', !r);
}
