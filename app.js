// Firebase
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

// 🚫 Küfür listesi
const bannedWords = ["amk","aq","orospu","piç","sik","yarrak"];
function temizle(text){
    return bannedWords.some(w => text.toLowerCase().includes(w));
}

// 📱 Cihaz ID
function getDeviceId(){
    let id = localStorage.getItem("deviceId");
    if(!id){
        id = "dev-" + Math.random().toString(36).substr(2,9);
        localStorage.setItem("deviceId", id);
    }
    return id;
}

// 🔐 AUTH
auth.onAuthStateChanged(async user => {
    if(user){
        currentUser = user;
        const ref = db.collection("users").doc(user.uid);
        const doc = await ref.get();

        if(!doc.exists){
            await ref.set({
                name: user.email,
                role: "user",
                deviceId: getDeviceId(),
                online: true
            });
        } else {
            const data = doc.data();

            // TEK CİHAZ KONTROL
            if(data.deviceId !== getDeviceId()){
                alert("Bu cihazda başka hesap kullanamazsın!");
                auth.signOut();
                return;
            }

            currentUserRole = data.role;
            ref.update({online:true});
        }

        if(["admin","muhtar","yardimci"].includes(currentUserRole)){
            document.getElementById('admin-post-panel').classList.remove('hidden');
        }

        akisDinle();
        sohbetDinle();
        durumDinle();
        onlineListesi();
    }
});

// 📢 AKIŞ
function akisDinle(){
    db.collection("announcements").orderBy("time","desc")
    .onSnapshot(snap=>{
        let h="";
        snap.forEach(doc=>{
            const p=doc.data();
            h+=`
            <div class="card">
                <b>${p.sender}</b>
                <p>${p.title}</p>
                ${p.image?`<img src="${p.image}" width="100%">`:''}
                <div>
                    <span onclick="begen('${doc.id}')">❤️ ${p.likes||0}</span>
                    <span onclick="yorumAc('${doc.id}')">💬</span>
                </div>
            </div>`;
        });
        feed-container.innerHTML=h;
    });
}

// ❤️ BEĞEN
async function begen(id){
    const ref = db.collection("announcements").doc(id);
    await ref.update({
        likes: firebase.firestore.FieldValue.increment(1)
    });
}

// 💬 SOHBET
function sohbetDinle(){
    db.collection("chat").orderBy("time")
    .onSnapshot(snap=>{
        let h="";
        snap.forEach(doc=>{
            const m=doc.data();
            const cls = m.uid===currentUser.uid?"me":"other";

            h+=`<div class="msg ${cls}">
                ${m.text || ''}
                ${m.image?`<img src="${m.image}" width="150">`:''}
            </div>`;
        });
        chat-messages.innerHTML=h;
    });
}

// 📤 MESAJ
async function mesajGonder(){
    let text = document.getElementById("chat-msg").value;
    if(temizle(text)) return alert("Küfür yasak!");

    await db.collection("chat").add({
        text,
        uid: currentUser.uid,
        time: Date.now()
    });

    document.getElementById("chat-msg").value="";
}

// 🟢 ONLINE
function onlineListesi(){
    db.collection("users").where("online","==",true)
    .onSnapshot(snap=>{
        let h="";
        snap.forEach(doc=>{
            const u=doc.data();
            h+=`🟢 ${u.name} 
            ${currentUserRole==="admin"?`<button onclick="ban('${doc.id}')">❌</button>`:''}<br>`;
        });
        online-users-list.innerHTML=h;
    });
}

// 🚫 BAN
async function ban(uid){
    await db.collection("users").doc(uid).update({banned:true});
}

// 📲 DURUM
function durumDinle(){
    db.collection("status").orderBy("time","desc")
    .onSnapshot(snap=>{
        let h="";
        snap.forEach(doc=>{
            const s=doc.data();
            h+=`<div class="status-item">${s.name}</div>`;
        });
        statusList.innerHTML=h;
    });
}
