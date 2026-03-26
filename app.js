// Firebase Config (Senin Bilgilerin)
const firebaseConfig = {
    apiKey: "AIzaSyDUagdaIoJmkgGjWFv2avYsC7n_-4AJ7s0",
    authDomain: "emirler-c5638.firebaseapp.com",
    projectId: "emirler-c5638",
    storageBucket: "emirler-c5638.firebasestorage.app",
    appId: "1:426225264136:web:ca5184984fc71b1e63853bd"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 1. OTURUM KONTROLÜ
auth.onAuthStateChanged(user => {
    if (user) {
        // Giriş yapılmışsa uygulamayı göster
        document.getElementById('authPage').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        tabDegistir('feed');
    } else {
        // Giriş yoksa auth sayfasını göster
        document.getElementById('authPage').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }
});

// 2. YAN MENÜ KONTROLÜ
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// 3. SAYFA DEĞİŞTİRME (TAB SİSTEMİ)
function tabDegistir(tabName) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-' + tabName).classList.remove('hidden');
    
    // Sayfa başlığını güncelle
    const titles = { feed: 'Köy Meydanı', chat: 'Canlı Sohbet', biz: 'Firmalar', settings: 'Ayarlar' };
    document.getElementById('pageTitle').innerText = titles[tabName];
    
    // Menüyü kapat
    document.getElementById('sidebar').classList.remove('active');
}

// 4. GİRİŞ YAPMA FONKSİYONU
async function girisYap() {
    const email = document.getElementById('logEmail').value;
    const pass = document.getElementById('logPass').value;
    try {
        await auth.signInWithEmailAndPassword(email, pass);
    } catch (error) {
        alert("Giriş Hatası: " + error.message);
    }
}

// 5. ÇIKIŞ YAPMA
function cikisYap() {
    auth.signOut().then(() => location.reload());
}
