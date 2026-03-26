// 1. FİREBASE YAPILANDIRMASI
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

// 2. OTURUM VE CİHAZ KONTROLÜ
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (!userDoc.exists) return auth.signOut();
        
        const data = userDoc.data();
        
        // Kara Liste Kontrolü
        if(data.isBlocked) {
            alert("Hesabınız engellenmiştir!");
            auth.signOut();
            return;
        }

        // Cihaz Kısıtlaması (Admin hariç herkese)
        const canPass = await checkDevice(user.uid, data.rol);
        if (!canPass) return;

        currentUserData = data;
        initApp(); // Uygulama arayüzünü yükle
    } else {
        showAuthPages(); // Giriş ekranına dön
    }
});

async function checkDevice(userUid, userRole) {
    let myId = localStorage.getItem('device_id');
    if(!myId) {
        myId = 'dev_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('device_id', myId);
    }

    if (userRole === 'admin') return true;

    const userDoc = await db.collection("users").doc(userUid).get();
    const storedId = userDoc.data().deviceId;

    if (!storedId) {
        await db.collection("users").doc(userUid).update({ deviceId: myId });
        return true;
    } else if (storedId !== myId) {
        alert("Bu hesap başka bir cihaza kayıtlıdır!");
        auth.signOut();
        return false;
    }
    return true;
}

// 3. KÖY MEYDANI (PAYLAŞIM SİSTEMİ)
async function paylas() {
    const title = document.getElementById('postTitle').value;
    const file = document.getElementById('postFile').files[0];
    const role = currentUserData.rol;

    if (!['admin', 'muhtar', 'yardimci'].includes(role)) {
        return alert("Sadece yetkililer paylaşım yapabilir!");
    }

    let url = "";
    if (file) {
        const ref = storage.ref(`posts/${Date.now()}_${file.name}`);
        await ref.put(file);
        url = await ref.getDownloadURL();
    }

    await db.collection("announcements").add({
        author: currentUserData.name || "İsimsiz",
        text: title,
        media: url,
        type: file?.type.includes('video') ? 'video' : 'image',
        likes: [],
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById('postTitle').value = "";
    document.getElementById('postFile').value = "";
    alert("Paylaşıldı!");
}

// 4. CANLI SOHBET (WHATSAPP TARZI)
function mesajGonder() {
    const msg = document.getElementById('chatInput').value;
    if (!msg) return;

    db.collection("chat").add({
        uid: auth.currentUser.uid,
        name: currentUserData.name,
        text: msg,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('chatInput').value = "";
}

// Mesajları Dinle
db.collection("chat").orderBy("timestamp", "asc").onSnapshot(snap => {
    const box = document.getElementById('chatBox');
    if(!box) return;
    box.innerHTML = "";
    snap.forEach(doc => {
        const m = doc.data();
        const isMe = m.uid === auth.currentUser.uid;
        const canDelete = ['admin', 'muhtar'].includes(currentUserData.rol);

        box.innerHTML += `
            <div class="msg-wrapper ${isMe ? 'me' : 'other'}">
                <div class="msg-bubble">
                    <small>${m.name}</small>
                    <p>${m.text}</p>
                    ${canDelete ? `<span onclick="mesajSil('${doc.id}')">🗑️</span>` : ""}
                </div>
            </div>`;
    });
    box.scrollTop = box.scrollHeight;
});

// 5. FİRMALAR (SLIDER)
async function firmalariYukle() {
    const snap = await db.collection("businesses").get();
    let liste = [];
    snap.forEach(doc => liste.push(doc.data()));
    
    liste.sort(() => Math.random() - 0.5); // Her seferinde farklı sıra

    const alan = document.getElementById('bizList');
    if(!alan) return;
    alan.innerHTML = liste.map(f => `
        <div class="biz-item">
            <div class="biz-content">
                <h2>${f.name}</h2>
                <p>${f.desc}</p>
                <a href="tel:${f.phone}" class="btn">📞 ARA: ${f.phone}</a>
            </div>
        </div>
    `).join('');
}

// 6. ADMİN FONKSİYONLARI (KARA LİSTE VE YETKİ)
async function yetkiGuncelle() {
    const email = document.getElementById('targetEmail').value;
    const yeniRol = document.getElementById('targetRole').value;
    const snap = await db.collection("users").where("email", "==", email).get();
    
    if(snap.empty) return alert("Kullanıcı bulunamadı!");
    await db.collection("users").doc(snap.docs[0].id).update({ rol: yeniRol });
    alert("Yetki güncellendi!");
}

async function kullaniciEngel(userId, durum) {
    await db.collection("users").doc(userId).update({ isBlocked: durum });
    alert(durum ? "Engellendi" : "Engel Kaldırıldı");
}

// 7. YARDIMCI FONKSİYONLAR
function tabDegistir(tabName) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-' + tabName).classList.remove('hidden');
    if(tabName === 'biz') firmalariYukle();
}

function initApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    document.getElementById('navBar').classList.remove('hidden');
    // Admin paneli sadece admine görünsün
    if(currentUserData.rol === 'admin') {
        document.getElementById('adminMasterPanel')?.classList.remove('hidden');
    }
    tabDegistir('feed');
}

function showAuthPages() {
    document.getElementById('mainContent').classList.add('hidden');
    document.getElementById('navBar').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
}

async function cikisYap() {
    await auth.signOut();
    location.reload();
}
