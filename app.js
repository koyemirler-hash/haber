// app.js

// Firebase yapılandırması
const firebaseConfig = {
  apiKey: "BURAYA_KEY",
  authDomain: "BURAYA_AUTHDOMAIN",
  projectId: "BURAYA_PROJECTID",
  storageBucket: "BURAYA_BUCKET",
  messagingSenderId: "BURAYA_SENDERID",
  appId: "BURAYA_APPID"
};
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Kullanıcı durumu ve sekme yönetimi
let currentUser = null;

function onayVer() {
  if (document.getElementById("termsCheck").checked) {
    document.getElementById("termsOverlay").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
  } else {
    alert("Şartları kabul etmelisiniz.");
  }
}

// Giriş ve kayıt
function girisYap() {
  const email = document.getElementById("logEmail").value;
  const pass = document.getElementById("logPass").value;
  auth.signInWithEmailAndPassword(email, pass)
    .then(res => {
      currentUser = res.user;
      appAc();
    })
    .catch(err => document.getElementById("errorMsg").innerText = err.message);
}

function kayitOl() {
  const name = document.getElementById("regName").value;
  const email = document.getElementById("regEmail").value;
  const pass = document.getElementById("regPass").value;
  auth.createUserWithEmailAndPassword(email, pass)
    .then(res => {
      currentUser = res.user;
      db.collection("users").doc(currentUser.uid).set({
        name: name,
        role: "user",
        online: true
      });
      appAc();
    })
    .catch(err => document.getElementById("regError").innerText = err.message);
}

// Uygulama açılışı
function appAc() {
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("navBar").classList.remove("hidden");
  loadPosts();
  loadChat();
  loadUsers();
}

// Tab yönetimi
function tabDegistir(tab) {
  ["feed", "chat", "biz", "settings"].forEach(t => {
    const view = document.getElementById(`view-${t}`);
    if (view) view.classList.add("hidden");
  });
  document.getElementById(`view-${tab}`).classList.remove("hidden");
}

// Paylaşım akışı
function akisPaylas() {
  const title = document.getElementById("postTitle").value;
  const fileInput = document.getElementById("postFile");
  if (!title || !fileInput.files[0]) return alert("Başlık ve dosya gerekli");
  const file = fileInput.files[0];
  const fileRef = storage.ref(`posts/${Date.now()}_${file.name}`);
  fileRef.put(file).then(snapshot => snapshot.ref.getDownloadURL()).then(url => {
    db.collection("posts").add({
      title,
      file: url,
      user: currentUser.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      likes: [],
      comments: []
    });
    fileInput.value = "";
    document.getElementById("postTitle").value = "";
  });
}

// Postları yükle
function loadPosts() {
  db.collection("posts").orderBy("timestamp", "desc").onSnapshot(snapshot => {
    const postList = document.getElementById("postList");
    postList.innerHTML = "";
    snapshot.forEach(doc => {
      const post = doc.data();
      const div = document.createElement("div");
      div.classList.add("card");
      div.innerHTML = `
        <b>${post.title}</b><br>
        ${post.file.endsWith(".mp4") ? `<video src="${post.file}" controls width="100%"></video>` : `<img src="${post.file}" width="100%">`}
        <div>
          <button onclick="likePost('${doc.id}')">❤️ ${post.likes.length}</button>
          <button onclick="showComments('${doc.id}')">💬 ${post.comments.length}</button>
        </div>
        <div id="comments-${doc.id}" class="hidden">
          <input id="commentInput-${doc.id}" placeholder="Yorum yazın...">
          <button onclick="addComment('${doc.id}')">Gönder</button>
          <div id="commentList-${doc.id}"></div>
        </div>
      `;
      postList.appendChild(div);
    });
  });
}

// Beğeni
function likePost(postId) {
  const postRef = db.collection("posts").doc(postId);
  postRef.get().then(doc => {
    const post = doc.data();
    let likes = post.likes || [];
    if (likes.includes(currentUser.uid)) likes = likes.filter(u => u !== currentUser.uid);
    else likes.push(currentUser.uid);
    postRef.update({ likes });
  });
}

// Yorumlar
function showComments(postId) {
  const div = document.getElementById(`comments-${postId}`);
  div.classList.toggle("hidden");
  loadComments(postId);
}

function loadComments(postId) {
  const commentList = document.getElementById(`commentList-${postId}`);
  db.collection("posts").doc(postId).onSnapshot(doc => {
    const post = doc.data();
    commentList.innerHTML = "";
    post.comments.forEach(c => {
      const p = document.createElement("p");
      p.innerHTML = `<b>${c.userName}:</b> ${c.text}`;
      commentList.appendChild(p);
    });
  });
}

function addComment(postId) {
  const input = document.getElementById(`commentInput-${postId}`);
  const text = input.value;
  if (!text) return;
  db.collection("posts").doc(postId).get().then(doc => {
    const post = doc.data();
    const comments = post.comments || [];
    comments.push({ userId: currentUser.uid, userName: currentUser.email, text });
    db.collection("posts").doc(postId).update({ comments });
    input.value = "";
  });
}

// Canlı Sohbet
function loadChat() {
  const chatBox = document.getElementById("chatBox");
  db.collection("chat").orderBy("timestamp").onSnapshot(snapshot => {
    chatBox.innerHTML = "";
    snapshot.forEach(doc => {
      const msg = doc.data();
      const div = document.createElement("div");
      div.innerHTML = `<b>${msg.userName}:</b> ${msg.text}`;
      chatBox.appendChild(div);
      chatBox.scrollTop = chatBox.scrollHeight;
    });
  });
}

function mesajGonder() {
  const input = document.getElementById("msgInput");
  const text = input.value;
  if (!text) return;
  db.collection("chat").add({
    userId: currentUser.uid,
    userName: currentUser.email,
    text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
  input.value = "";
}

// Admin yetkileri
function yetkiVer() {
  const email = document.getElementById("targetEmail").value;
  const role = document.getElementById("targetRole").value;
  db.collection("users").where("email", "==", email).get().then(snap => {
    snap.forEach(doc => doc.ref.update({ role }));
  });
}

// Online kullanıcılar
function loadUsers() {
  db.collection("users").onSnapshot(snapshot => {
    const userList = document.getElementById("userList");
    userList.innerHTML = "";
    snapshot.forEach(doc => {
      const user = doc.data();
      const div = document.createElement("div");
      div.innerText = `${user.name} - ${user.role} ${user.online ? "🟢" : "⚪"}`;
      userList.appendChild(div);
    });
  });
}

// Çıkış
function cikisYap() {
  auth.signOut().then(() => location.reload());
}

// Reklam
function reklamKaydet() {
  const txt = document.getElementById("adTxt").value;
  const lnk = document.getElementById("adLnk").value;
  const active = document.getElementById("adActive").checked;
  db.collection("ads").doc("main").set({ txt, lnk, active });
}

function reklamGit() {
  db.collection("ads").doc("main").get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      if (data.active && data.lnk) window.open(data.lnk, "_blank");
    }
  });
}

// Kullanıcı online durum
auth.onAuthStateChanged(user => {
  if (user) currentUser = user;
  else currentUser = null;
});
