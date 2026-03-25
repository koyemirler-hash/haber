const firebaseConfig = {
    apiKey: "AIzaSyDUagdaIoJmkgGjWFv2avYsC7n_-4AJ7s0",
    authDomain: "emirler-c5638.firebaseapp.com",
    projectId: "emirler-c5638",
    storageBucket: "emirler-c5638.firebasestorage.app", // Storage linki düzeltildi
    appId: "1:426225264136:web:ca5184984fc71b1e63853bd"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

let role = 'user';

// ROL VE ONLİNE KONTROLÜ
auth.onAuthStateChanged(async user => {
    if(user) {
        const uDoc = await db.collection("users").doc(user.uid).get();
        role = (user.email === "koyemirler@gmail.com") ? "admin" : (uDoc.data()?.role || "user");
        if(role === 'admin' || role === 'muhtar') document.getElementById('admin-post-area').classList.remove('hidden');
        
        db.collection("users").doc(user.uid).update({ online: true });
        akisGetir();
        onlineListesi();
    }
});

// FİRMA SİLME
async function firmaSil(id) {
    if(confirm("Silinsin mi?")) {
        await db.collection("businesses").doc(id).delete();
    }
}

// ONLİNE LİSTESİ
function onlineListesi() {
    db.collection("users").where("online", "==", true).onSnapshot(snap => {
        let html = "<b>Online Kişiler:</b>";
        snap.forEach(doc => html += `<div>🟢 ${doc.data().name}</div>`);
        document.getElementById('online-list').innerHTML = html;
    });
}

function tabDegistir(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-' + viewId).classList.remove('hidden');
}
