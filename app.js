// Firebase Config
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

let currentUserRole = 'user';

// 🔐 ROL KONTROLÜ (Admin, Muhtar, Yardımcı)
auth.onAuthStateChanged(async user => {
    if(user) {
        const doc = await db.collection("users").doc(user.uid).get();
        const data = doc.data();
        currentUserRole = data?.role || 'user';
        
        // 3 Pozisyondaki kişiler admin panelini görür
        if(["admin", "muhtar", "yardimci"].includes(currentUserRole)) {
            document.getElementById('admin-post-panel').classList.remove('hidden');
        }
        
        // Online Durumu
        db.collection("users").doc(user.uid).update({ online: true });
        akisDinle();
        sohbetDinle();
        onlineListesi();
    }
});

// 🏢 FİRMA SİLME FONKSİYONU
async function firmaSil(id) {
    if(confirm("Bu firmayı silmek istediğine emin misin?")) {
        await db.collection("businesses").doc(id).delete();
        alert("Firma silindi!");
    }
}

// 🟢 ONLİNE LİSTESİ
function onlineListesi() {
    db.collection("users").where("online", "==", true).onSnapshot(snap => {
        let html = "<b>Şu an Online:</b><br>";
        snap.forEach(doc => { html += `🟢 ${doc.data().name}<br>`; });
        document.getElementById('online-users-list').innerHTML = html;
    });
}

// 📂 AYARLAR ACCORDION
function toggleAcc(id) {
    document.getElementById(id).classList.toggle('hidden');
}

function tabGit(t) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-'+t).classList.remove('hidden');
}

// 📸 AKIŞ (BEĞENİ & YORUM DAHİL)
function akisDinle() {
    db.collection("announcements").orderBy("time", "desc").onSnapshot(snap => {
        let h = "";
        snap.forEach(doc => {
            const p = doc.data();
            h += `<div class="card">
                <b>${p.sender}</b>
                <p>${p.title}</p>
                ${p.image ? `<img src="${p.image}" width="100%">` : ''}
                <div style="margin-top:10px; color:gray;">
                    <span onclick="begen('${doc.id}')">❤️ ${p.likes || 0}</span> | 
                    <span onclick="yorumAc('${doc.id}')">💬 Yorumlar</span>
                </div>
            </div>`;
        });
        document.getElementById('feed-container').innerHTML = h;
    });
}
