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
let currentUser = null;

// Küfür listesi
const bannedWords = ["amk","aq","orospu","piç","sik","yarrak"];
function temizle(text){ return bannedWords.some(w => text.toLowerCase().includes(w)); }

// Device ID
function getDeviceId(){
    let id = localStorage.getItem("deviceId");
    if(!id){ id="dev-"+Math.random().toString(36).substr(2,9); localStorage.setItem("deviceId",id);}
    return id;
}

// AUTH
auth.onAuthStateChanged(async user=>{
    if(!user) return;
    currentUser = user;
    const ref = db.collection("users").doc(user.uid);
    const doc = await ref.get();

    if(!doc.exists){
        await ref.set({name:user.email,role:"user",deviceId:getDeviceId(),online:true});
    } else {
        const data=doc.data();
        if(data.deviceId!==getDeviceId()){
            alert("Bu cihazda başka hesap kullanamazsın!"); auth.signOut(); return;
        }
        currentUserRole = data.role;
        ref.update({online:true});
    }

    if(["admin","muhtar","yardimci"].includes(currentUserRole))
        document.getElementById('admin-post-panel').classList.remove('hidden');

    akisDinle(); sohbetDinle(); durumDinle(); onlineListesi();
});

// TAB
function tabGit(t){
    document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
    document.getElementById('view-'+t).classList.remove('hidden');
}

// AKIŞ
function akisDinle(){
    db.collection("announcements").orderBy("time","desc").onSnapshot(snap=>{
        let h="";
        snap.forEach(doc=>{
            const p=doc.data();
            h+=`<div class="card">
                <b>${p.sender}</b>
                <p>${p.title}</p>
                ${p.image?`<img src="${p.image}" width="100%">`:''}
                <div>
                    <span onclick="begen('${doc.id}')">❤️ ${p.likes||0}</span> | 
                    <span onclick="yorumAc('${doc.id}')">💬 Yorumlar</span>
                </div>
            </div>`;
        });
        document.getElementById('feed-container').innerHTML=h;
    });
}

// BEĞEN
async function begen(id){
    await db.collection("announcements").doc(id).update({
        likes:firebase.firestore.FieldValue.increment(1)
    });
}

// PAYLAŞ
async function akisPaylas(){
    if(!["admin","muhtar","yardimci"].includes(currentUserRole)) return alert("Paylaşamazsınız!");
    let title = document.getElementById("post-title").value;
    if(!title) return alert("Başlık gerekli!");
    if(temizle(title)) return alert("Küfür yasak!");

    let file = document.getElementById("post-file").files[0];
    let imgUrl="";
    if(file){
        const snap = await storage.ref('posts/'+Date.now()+"-"+file.name).put(file);
        imgUrl = await snap.ref.getDownloadURL();
    }

    await db.collection("announcements").add({
        sender:currentUser.email, title, image:imgUrl, likes:0, time:Date.now()
    });
    document.getElementById("post-title").value=""; document.getElementById("post-file").value="";
}

// SOHBET
function sohbetDinle(){
    db.collection("chat").orderBy("time").onSnapshot(snap=>{
        let h="";
        snap.forEach(doc=>{
            const m=doc.data();
            const cls=m.uid===currentUser.uid?"me":"other";
            h+=`<div class="msg ${cls}">${m.text||''}${m.image?`<img src="${m.image}" width="150">`:''}</div>`;
        });
        document.getElementById('chat-messages').innerHTML=h;
    });
}

// MESAJ
async function mesajGonder(){
    let text=document.getElementById("chat-msg").value;
    if(!text) return;
    if(temizle(text)) return alert("Küfür yasak!");
    await db.collection("chat").add({text, uid:currentUser.uid, time:Date.now()});
    document.getElementById("chat-msg").value="";
}

// ONLINE
function onlineListesi(){
    db.collection("users").where("online","==",true).onSnapshot(snap=>{
        let h="";
        snap.forEach(doc=>{
            const u=doc.data();
            h+=`🟢 ${u.name} ${currentUserRole==="admin"?`<button onclick="ban('${doc.id}')">❌</button>`:''}<br>`;
        });
        document.getElementById('online-users-list').innerHTML=h;
    });
}

// BAN
async function ban(uid){ await db.collection("users").doc(uid).update({banned:true}); }

// DURUM / STORY
function durumDinle(){
    db.collection("status").orderBy("time","desc").onSnapshot(snap=>{
        let h="";
        snap.forEach(doc=>{
            const s=doc.data();
            h+=`<div class="status-item">${s.name}</div>`;
        });
        document.getElementById('statusList').innerHTML=h;
    });
}

// ACCORDION
function toggleAcc(id){ document.getElementById(id).classList.toggle('hidden'); }

// FİRMA
async function firmaEkle(){
    if(currentUserRole!=="admin") return alert("Yetkisiz!");
    let name=document.getElementById("f-name").value;
    let tel=document.getElementById("f-tel").value;
    if(!name) return alert("Firma adı gerekli");
    await db.collection("businesses").add({name,tel,time:Date.now()});
    document.getElementById("f-name").value=""; document.getElementById("f-tel").value="";
}
