// Firebase referansları
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Kullanıcı ve UI referansları
const termsOverlay = document.getElementById('termsOverlay');
const loginPage = document.getElementById('loginPage');
const appDiv = document.getElementById('app');
const navBar = document.getElementById('navBar');

// Açılış şartları onay
function onayVer() {
  if(document.getElementById('termsCheck').checked){
    termsOverlay.classList.add('hidden');
    loginPage.classList.remove('hidden');
  } else {
    alert('Lütfen kullanım şartlarını kabul edin.');
  }
}

// Sekme geçişleri
function tabDegistir(tab) {
  ['view-feed','view-chat','view-biz','view-settings'].forEach(id=>{
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById('view-'+tab).classList.remove('hidden');
}

// Giriş yap
function girisYap(){
  const email = document.getElementById('logEmail').value;
  const pass = document.getElementById('logPass').value;
  auth.signInWithEmailAndPassword(email, pass)
    .then(() => {
      loginPage.classList.add('hidden');
      appDiv.classList.remove('hidden');
      navBar.classList.remove('hidden');
      kullaniciBilgiGetir();
      postlariGetir();
      chatDinle();
      onlineKullanicilar();
    })
    .catch(e => document.getElementById('errorMsg').innerText = e.message);
}

// Kayıt ol
function kayitOl(){
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const pass = document.getElementById('regPass').value;

  auth.createUserWithEmailAndPassword(email, pass)
    .then(cred => {
      return db.collection('users').doc(cred.user.uid).set({
        name: name,
        email: email,
        role: 'user',
        online: true
      });
    })
    .then(() => {
      loginPage.classList.add('hidden');
      appDiv.classList.remove('hidden');
      navBar.classList.remove('hidden');
      kullaniciBilgiGetir();
      postlariGetir();
      chatDinle();
      onlineKullanicilar();
    })
    .catch(e => document.getElementById('regError').innerText = e.message);
}

// Çıkış yap
function cikisYap(){
  const uid = auth.currentUser.uid;
  db.collection('users').doc(uid).update({online:false});
  auth.signOut().then(()=>{
    appDiv.classList.add('hidden');
    loginPage.classList.remove('hidden');
    navBar.classList.add('hidden');
  });
}

// Kullanıcı bilgilerini getir ve admin paneli göster
function kullaniciBilgiGetir(){
  const uid = auth.currentUser.uid;
  db.collection('users').doc(uid).get().then(doc=>{
    if(doc.exists){
      const role = doc.data().role;
      if(role==='admin' || role==='muhtar' || role==='yardimci'){
        document.getElementById('adminPanel').classList.remove('hidden');
      }
    }
  });
}

// Online kullanıcıları göster
function onlineKullanicilar(){
  db.collection('users').where('online','==',true).onSnapshot(snap=>{
    const list = document.getElementById('userList');
    list.innerHTML = '';
    snap.forEach(doc=>{
      const u = doc.data();
      list.innerHTML += `<p>${u.name} (${u.role})</p>`;
    });
  });
}

// Akış paylaşımları
function akisPaylas(){
  const title = document.getElementById('postTitle').value;
  const file = document.getElementById('postFile').files[0];
  if(!title || !file) return alert('Başlık ve dosya gerekli');

  const fileRef = storage.ref('posts/'+Date.now()+'_'+file.name);
  fileRef.put(file).then(() => fileRef.getDownloadURL())
    .then(url => {
      return db.collection('posts').add({
        title: title,
        media: url,
        creatorUid: auth.currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        likes: [],
        comments: []
      });
    })
    .then(()=>{ document.getElementById('postTitle').value=''; document.getElementById('postFile').value=''; })
    .catch(e=>alert(e.message));
}

// Postları listele
function postlariGetir(){
  db.collection('posts').orderBy('createdAt','desc').onSnapshot(snap=>{
    const list = document.getElementById('postList');
    list.innerHTML = '';
    snap.forEach(doc=>{
      const data = doc.data();
      const liked = data.likes.includes(auth.currentUser.uid);
      const commentsHtml = data.comments.map(c=>`<p><b>${c.name}:</b> ${c.text}</p>`).join('');
      list.innerHTML += `
        <div class="card">
          <h4>${data.title}</h4>
          ${data.media ? `<img src="${data.media}" style="max-width:100%">` : ''}
          <button onclick="postLike('${doc.id}')">${liked?'❤️':'🤍'} Beğen ${data.likes.length}</button>
          <div>
            ${commentsHtml}
            <input id="comment_${doc.id}" placeholder="Yorum yazın...">
            <button onclick="postComment('${doc.id}')">Yorumu Gönder</button>
          </div>
        </div>
      `;
    });
  });
}

// Post beğeni
function postLike(postId){
  const postRef = db.collection('posts').doc(postId);
  postRef.get().then(doc=>{
    let likes = doc.data().likes || [];
    if(likes.includes(auth.currentUser.uid)){
      likes = likes.filter(u=>u!==auth.currentUser.uid);
    } else likes.push(auth.currentUser.uid);
    postRef.update({likes});
  });
}

// Post yorum
function postComment(postId){
  const input = document.getElementById('comment_'+postId);
  const text = input.value;
  if(!text) return;
  const user = auth.currentUser;
  const userName = user.displayName || user.email;
  db.collection('posts').doc(postId).update({
    comments: firebase.firestore.FieldValue.arrayUnion({uid:user.uid,name:userName,text:text})
  });
  input.value='';
}

// Canlı sohbet
function mesajGonder(){
  const text = document.getElementById('msgInput').value;
  if(!text) return;
  db.collection('chatMessages').add({
    uid: auth.currentUser.uid,
    name: auth.currentUser.displayName || auth.currentUser.email,
    text: text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  document.getElementById('msgInput').value='';
}

function chatDinle(){
  db.collection('chatMessages').orderBy('createdAt','asc').onSnapshot(snap=>{
    const box = document.getElementById('chatBox');
    box.innerHTML = '';
    snap.forEach(doc=>{
      const m = doc.data();
      box.innerHTML += `<p><b>${m.name}:</b> ${m.text}</p>`;
    });
    box.scrollTop = box.scrollHeight;
  });
}

// Admin yetki verme
function yetkiVer(){
  const email = document.getElementById('targetEmail').value;
  const role = document.getElementById('targetRole').value;
  db.collection('users').where('email','==',email).get().then(snap=>{
    snap.forEach(doc=>{
      doc.ref.update({role: role});
    });
  });
}

// Reklam kaydet
function reklamKaydet(){
  const txt = document.getElementById('adTxt').value;
  const lnk = document.getElementById('adLnk').value;
  const active = document.getElementById('adActive').checked;
  if(active){
    const ad = document.getElementById('adBanner');
    ad.innerHTML = txt;
    ad.onclick = ()=>{ window.open(lnk,'_blank'); };
    ad.classList.remove('hidden');
  } else document.getElementById('adBanner').classList.add('hidden');
}
