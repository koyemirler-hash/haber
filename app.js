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

// Açılış onayı
if(localStorage.getItem('termsAccepted')) {
    document.getElementById('termsOverlay').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
}
function onayVer(){
    if(!document.getElementById('termsCheck').checked) return alert("Şartları kabul etmelisin!");
    localStorage.setItem('termsAccepted','true');
    document.getElementById('termsOverlay').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
}

// Giriş/Çıkış
async function girisYap(){
    const email=document.getElementById('logEmail').value;
    const pass=document.getElementById('logPass').value;
    try{
        const res=await auth.signInWithEmailAndPassword(email,pass);
        await db.collection("users").doc(res.user.uid).set({
            name: email.split('@')[0],
            email,
            online:true,
            lastSeen:firebase.firestore.FieldValue.serverTimestamp()
        },{merge:true});
        location.reload();
    }catch(e){document.getElementById('errorMsg').innerText="Hatalı giriş!";}
}
async function cikisYap(){
    await db.collection("users").doc(auth.currentUser.uid).update({online:false});
    await auth.signOut();
    location.reload();
}

// Tab değiştirme
function tabDegistir(t){
    document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
    document.getElementById('view-'+t).classList.remove('hidden');
}

// Auth state
auth.onAuthStateChanged(async user=>{
    if(user){
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('navBar').classList.remove('hidden');

        const doc=await db.collection("users").doc(user.uid).get();
        if(user.email==="koyemirler@gmail.com") document.getElementById('adminPanel').classList.remove('hidden');

        onlineListesiYukle();
        mesajlariDinle();
        akisDinle();
        reklamYukle();
    }
});

// Online liste
function onlineListesiYukle(){
    db.collection("users").onSnapshot(snap=>{
        let html="";
        snap.forEach(doc=>{
            const u=doc.data();
            html+=`<div><span class="${u.online?'status-dot online':'status-dot offline'}"></span>${u.name}</div>`;
        });
        document.getElementById('userList').innerHTML=html;
    });
}

// Sohbet
function mesajlariDinle(){
    db.collection("chat").orderBy("time","asc").limitToLast(30).onSnapshot(snap=>{
        let html="";
        snap.forEach(doc=>{
            const m=doc.data();
            const isMe=m.uid===auth.currentUser.uid;
            html+=`<div class="msg ${isMe?'sent':'received'}"><b>${m.user}:</b><br>${m.text}</div>`;
        });
        const box=document.getElementById('chatBox');
        box.innerHTML=html;
        box.scrollTop=box.scrollHeight;
    });
}
async function mesajGonder(){
    const text=document.getElementById('msgInput').value;
    if(!text) return;
    if(/küfür|badword/i.test(text)) return alert("Küfür yasak!");
    await db.collection("chat").add({
        text,
        user:auth.currentUser.email.split('@')[0],
        uid:auth.currentUser.uid,
        time:firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('msgInput').value="";
}

// Akış
function akisDinle(){
    db.collection("announcements").orderBy("time","desc").onSnapshot(snap=>{
        let html="";
        snap.forEach(doc=>{
            const p=doc.data();
            html+=`<div class="card"><b>${p.sender}</b><p>${p.title}</p>${p.image?`<img src="${p.image}" width="100%">`:''}
            <div style="margin-top:5px;color:gray;">
            <span onclick="begen('${doc.id}')">❤️ ${p.likes||0}</span> | 
            <span onclick="yorumAc('${doc.id}')">💬 Yorumlar</span>
            </div></div>`;
        });
        document.getElementById('postList').innerHTML=html;
    });
}
async function akisPaylas(){
    const title=document.getElementById('postTitle').value;
    const file=document.getElementById('postFile').files[0];
    if(!title) return alert("Başlık girin!");
    let url='';
    if(file){
        const ref=storage.ref('posts/'+Date.now()+'_'+file.name);
        await ref.put(file);
        url=await ref.getDownloadURL();
    }
    await db.collection("announcements").add({
        sender:auth.currentUser.email.split('@')[0],
        title,
        image:url,
        likes:0,
        time:firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('postTitle').value='';
    document.getElementById('postFile').value='';
}

// Reklam
async function reklamYukle(){
    const doc=await db.collection("settings").doc("ads").get();
    if(doc.exists && doc.data().active){
        const ad=document.getElementById('adBanner');
        ad.style.display="block";
        ad.innerText=doc.data().text;
        window.adLink=doc.data().link;
    }
}
async function reklamKaydet(){
    await db.collection("settings").doc("ads").set({
        text:document.getElementById('adTxt').value,
        link:document.getElementById('adLnk').value,
        active:document.getElementById('adActive').checked
    });
    alert("Reklam güncellendi!");
}

// Yetki verme
async function yetkiVer(){
    const email=document.getElementById('targetEmail').value;
    const role=document.getElementById('targetRole').value;
    const snap=await db.collection("users").where("email","==",email).get();
    if(snap.empty) return alert("Kullanıcı bulunamadı!");
    snap.forEach(async doc=>{
        await db.collection("users").doc(doc.id).update({role});
        alert("Yetki güncellendi!");
    });
}

// PWA service worker
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js');}
