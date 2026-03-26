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
const storage = firebase.storage();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

const ADMIN_EMAIL = "koyemirler@gmail.com";
const PRIV_ROLES = ["admin", "muhtar", "yardimci"];

const state = {
  user: null,
  role: "user",
  previewMode: false,
  posts: [],
  messages: [],
  businesses: [],
  users: [],
  openComments: {},
  replyTo: null,
  unsubs: []
};

const BAD_WORDS = [
  "amk", "aq", "orospu", "piç", "sik", "yarrak", "göt", "salak", "şerefsiz", "ibne"
];

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getDeviceId() {
  let id = localStorage.getItem("emirler_device_id");
  if (!id) {
    id = "dev_" + Math.random().toString(36).slice(2) + "_" + Date.now();
    localStorage.setItem("emirler_device_id", id);
  }
  return id;
}

function hasBadWords(text = "") {
  const low = text.toLowerCase();
  return BAD_WORDS.some(w => low.includes(w));
}

function isPrivilegedRole(role) {
  return PRIV_ROLES.includes(role);
}

function uiRole() {
  return state.previewMode ? "user" : state.role;
}

function canManageFeed() {
  return isPrivilegedRole(uiRole());
}

function canManageUsers() {
  return uiRole() === "admin";
}

function canManageBusinesses() {
  return uiRole() === "admin";
}

function canDeleteAllContent() {
  return isPrivilegedRole(uiRole());
}

function switchAuthTab(tab) {
  document.getElementById("loginTab").classList.toggle("hidden", tab !== "login");
  document.getElementById("registerTab").classList.toggle("hidden", tab !== "register");
  document.getElementById("loginTabBtn").classList.toggle("active", tab === "login");
  document.getElementById("registerTabBtn").classList.toggle("active", tab === "register");
}

function toggleAcc(id) {
  const el = document.getElementById(id);
  el.classList.toggle("hidden");
}

function tabDegistir(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById("view-" + view).classList.remove("hidden");
}

function setLoginRemember(email) {
  if (email) {
    localStorage.setItem("emirler_last_email", email);
  }
}

function showLogin() {
  document.getElementById("termsOverlay").classList.add("hidden");
  document.getElementById("loginPage").classList.remove("hidden");
}

function showApp() {
  document.getElementById("loginPage").classList.add("hidden");
  document.getElementById("termsOverlay").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("navBar").classList.remove("hidden");
}

function hideApp() {
  document.getElementById("app").classList.add("hidden");
  document.getElementById("navBar").classList.add("hidden");
  document.getElementById("loginPage").classList.remove("hidden");
}

function onayVer() {
  const adminHint = document.getElementById("termsAdminEmail").value.trim().toLowerCase();
  if (adminHint && adminHint === ADMIN_EMAIL.toLowerCase()) {
    localStorage.setItem("termsAccepted", "1");
    showLogin();
    return;
  }

  if (!document.getElementById("termsCheck").checked) {
    alert("Şartları kabul etmelisin.");
    return;
  }

  localStorage.setItem("termsAccepted", "1");
  showLogin();
}

function setAuthErrors(loginMsg = "", registerMsg = "") {
  document.getElementById("loginError").textContent = loginMsg;
  document.getElementById("registerError").textContent = registerMsg;
}

function canUseThisDevice(email) {
  const locked = localStorage.getItem("emirler_device_owner_email");
  if (!locked) return true;
  if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return true;
  return locked.toLowerCase() === email.toLowerCase();
}

async function girisYap() {
  setAuthErrors("", "");
  const email = document.getElementById("logEmail").value.trim().toLowerCase();
  const pass = document.getElementById("logPass").value;

  if (!email || !pass) {
    setAuthErrors("E-posta ve şifre gerekli.");
    return;
  }

  if (!canUseThisDevice(email)) {
    setAuthErrors("Bu cihaz başka bir hesapla kilitli.");
    return;
  }

  try {
    const res = await auth.signInWithEmailAndPassword(email, pass);
    setLoginRemember(email);
    localStorage.setItem("emirler_device_owner_email", email);
    localStorage.setItem("emirler_device_owner_uid", res.user.uid);
  } catch (err) {
    setAuthErrors("Giriş başarısız.");
  }
}

async function uyeOl() {
  setAuthErrors("", "");
  const name = document.getElementById("regName").value.trim();
  const surname = document.getElementById("regSurname").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const email = document.getElementById("regEmail").value.trim().toLowerCase();
  const pass = document.getElementById("regPass").value;

  if (!name || !surname || !phone || !email || !pass) {
    setAuthErrors("", "Tüm alanları doldur.");
    return;
  }

  if (pass.length < 6) {
    setAuthErrors("", "Şifre en az 6 karakter olmalı.");
    return;
  }

  if (!canUseThisDevice(email)) {
    setAuthErrors("", "Bu cihaz başka bir hesapla kilitli.");
    return;
  }

  try {
    const res = await auth.createUserWithEmailAndPassword(email, pass);
    const uid = res.user.uid;
    const role = email === ADMIN_EMAIL.toLowerCase() ? "admin" : "user";

    await db.collection("users").doc(uid).set({
      name,
      surname,
      fullName: `${name} ${surname}`,
      phone,
      email,
      role,
      deviceId: getDeviceId(),
      banned: false,
      online: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    setLoginRemember(email);
    localStorage.setItem("emirler_device_owner_email", email);
    localStorage.setItem("emirler_device_owner_uid", uid);
    alert("Kayıt tamam.");
  } catch (err) {
    setAuthErrors("", "Kayıt yapılamadı.");
  }
}

async function cikisYap() {
  if (state.user) {
    try {
      await db.collection("users").doc(state.user.uid).set({
        online: false,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (_) {}
    await auth.signOut();
  }
  state.user = null;
  state.role = "user";
  state.previewMode = false;
  stopListeners();
  hideApp();
  showLogin();
}

function togglePreviewMode() {
  if (!isPrivilegedRole(state.role)) return;
  state.previewMode = !state.previewMode;
  document.getElementById("previewBtn").textContent = state.previewMode ? "Normal Geri Dön" : "Başkasının Gözünden Gör";
  renderAll();
  renderSettingsOnly();
}

function stopListeners() {
  state.unsubs.forEach(fn => {
    try { fn(); } catch (_) {}
  });
  state.unsubs = [];
}

function loadFeed() {
  const unsub = db.collection("posts").orderBy("createdAt", "desc").limit(100).onSnapshot(snap => {
    state.posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderPosts();
  });
  state.unsubs.push(unsub);
}

function loadChat() {
  const unsub = db.collection("chatMessages").orderBy("createdAt", "asc").limitToLast(120).onSnapshot(snap => {
    state.messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderChat();
  });
  state.unsubs.push(unsub);
}

function loadBusinesses() {
  const unsub = db.collection("businesses").where("active", "==", true).onSnapshot(snap => {
    state.businesses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderBusinesses();
    renderBusinessAdminList();
  });
  state.unsubs.push(unsub);
}

function loadUsers() {
  const unsub = db.collection("users").orderBy("online", "desc").onSnapshot(snap => {
    state.users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderUsers();
  });
  state.unsubs.push(unsub);
}

function loadAuthUi() {
  const email = localStorage.getItem("emirler_last_email") || "";
  document.getElementById("logEmail").value = email;
  document.getElementById("regEmail").value = email;
}

function renderUserBadge() {
  const badge = document.getElementById("userBadge");
  if (!state.user) {
    badge.textContent = "Giriş bekleniyor";
    return;
  }
  const name = state.userProfile?.fullName || state.user.email;
  const roleText = state.previewMode ? "Kullanıcı görünümü" : state.role;
  badge.textContent = `${name} • ${roleText}`;
}

function renderComposerVisibility() {
  const feedComposer = document.getElementById("feedComposer");
  const adminPanel = document.getElementById("adminPanel");
  const adminTools = document.getElementById("acc-admin");
  const canShare = canManageFeed();
  const canAdmin = canManageUsers();

  feedComposer.classList.toggle("hidden", !canShare);
  adminPanel.classList.toggle("hidden", !canAdmin);
  adminTools.classList.toggle("hidden", !canAdmin);
}

function renderAll() {
  renderUserBadge();
  renderComposerVisibility();
  renderPosts();
  renderChat();
  renderBusinesses();
  renderBusinessAdminList();
  renderUsers();
}

function renderPosts() {
  const host = document.getElementById("postList");
  if (!state.posts.length) {
    host.innerHTML = `<div class="card muted">Henüz paylaşım yok.</div>`;
    return;
  }

  const currentUid = state.user?.uid || "";
  const role = uiRole();

  host.innerHTML = state.posts.map(post => {
    const reactions = post.reactions || {};
    const reactionCounts = countReactions(reactions);
    const myReaction = reactions[currentUid] || "";
    const comments = Array.isArray(post.comments) ? post.comments : [];
    const canEdit = isPrivilegedRole(role) || post.creatorUid === currentUid;
    const commentsOpen = !!state.openComments[post.id];

    return `
      <div class="feed-post">
        <div class="post-title">${escapeHtml(post.title || "")}</div>
        <div class="post-meta">${escapeHtml(post.creatorName || "Anonim")} • ${formatTime(post.createdAt)}</div>
        ${post.body ? `<div class="post-body">${escapeHtml(post.body)}</div>` : ""}
        ${renderMedia(post.mediaUrl, post.mediaType, "post-media")}
        <div class="actions">
          <button class="action-btn ${myReaction === "❤️" ? "active" : ""}" onclick="reactPost('${post.id}','❤️')">❤️ ${reactionCounts["❤️"] || 0}</button>
          <button class="action-btn ${myReaction === "😂" ? "active" : ""}" onclick="reactPost('${post.id}','😂')">😂 ${reactionCounts["😂"] || 0}</button>
          <button class="action-btn ${myReaction === "😮" ? "active" : ""}" onclick="reactPost('${post.id}','😮')">😮 ${reactionCounts["😮"] || 0}</button>
          <button class="action-btn ${myReaction === "😢" ? "active" : ""}" onclick="reactPost('${post.id}','😢')">😢 ${reactionCounts["😢"] || 0}</button>
          <button class="action-btn" onclick="toggleComments('${post.id}')">💬 Yorum ${comments.length}</button>
          ${canEdit ? `<button class="action-btn" onclick="editPost('${post.id}')">✏️ Düzenle</button>` : ""}
          ${canEdit ? `<button class="action-btn" onclick="deletePost('${post.id}')">🗑 Sil</button>` : ""}
        </div>

        <div class="comment-box ${commentsOpen ? "" : "hidden"}" id="comments-${post.id}">
          <div class="small" style="margin-bottom:8px;">Yorumlar</div>
          <div id="commentsList-${post.id}">
            ${comments.map(c => renderComment(c, post.id)).join("")}
          </div>
          <textarea id="commentInput-${post.id}" class="input textarea" placeholder="Yorum yaz..."></textarea>
          <button class="btn" onclick="addComment('${post.id}')">Yorum Ekle</button>
        </div>
      </div>
    `;
  }).join("");
}

function renderComment(comment, postId) {
  return `
    <div class="comment-item">
      <div><b>${escapeHtml(comment.name || "Anonim")}</b> <span class="small">• ${formatTime(comment.createdAt)}</span></div>
      <div class="small">${escapeHtml(comment.text || "")}</div>
    </div>
  `;
}

function toggleComments(postId) {
  state.openComments[postId] = !state.openComments[postId];
  renderPosts();
}

function countReactions(map) {
  const result = {};
  Object.values(map || {}).forEach(emoji => {
    result[emoji] = (result[emoji] || 0) + 1;
  });
  return result;
}

function formatTime(value) {
  if (!value) return "";
  const d = value.toDate ? value.toDate() : new Date(value);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

function renderMedia(url, type, className) {
  if (!url) return "";
  if ((type || "").startsWith("video")) {
    return `<video class="${className}" controls src="${url}"></video>`;
  }
  return `<img class="${className}" src="${url}" alt="" />`;
}

async function akisPaylas() {
  if (!canManageFeed()) {
    alert("Bu alana paylaşım yetkin yok.");
    return;
  }

  const title = document.getElementById("postTitle").value.trim();
  const body = document.getElementById("postBody").value.trim();
  const file = document.getElementById("postMedia").files[0];

  if (!title && !body && !file) {
    alert("En az bir içerik gir.");
    return;
  }

  if (hasBadWords(title + " " + body)) {
    alert("Küfürlü içerik yasak.");
    return;
  }

  let mediaUrl = "";
  let mediaType = "";

  if (file) {
    const path = `posts/${Date.now()}_${file.name}`;
    const ref = storage.ref().child(path);
    await ref.put(file);
    mediaUrl = await ref.getDownloadURL();
    mediaType = file.type || "";
  }

  const creatorName = state.userProfile?.fullName || state.user.email;

  await db.collection("posts").add({
    title,
    body,
    mediaUrl,
    mediaType,
    creatorUid: state.user.uid,
    creatorName,
    creatorRole: state.role,
    reactions: {},
    comments: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  document.getElementById("postTitle").value = "";
  document.getElementById("postBody").value = "";
  document.getElementById("postMedia").value = "";
}

async function reactPost(postId, emoji) {
  if (!state.user) return;
  const ref = db.collection("posts").doc(postId);
  await ref.update({ [`reactions.${state.user.uid}`]: emoji });
}

async function addComment(postId) {
  const input = document.getElementById(`commentInput-${postId}`);
  const text = input.value.trim();
  if (!text) return;

  if (hasBadWords(text)) {
    alert("Küfürlü yorum yasak.");
    return;
  }

  const ref = db.collection("posts").doc(postId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const post = snap.data();
  const comments = Array.isArray(post.comments) ? post.comments : [];
  comments.push({
    uid: state.user.uid,
    name: state.userProfile?.fullName || state.user.email,
    text,
    createdAt: Date.now()
  });

  await ref.update({ comments });
  input.value = "";
}

async function editPost(postId) {
  const snap = await db.collection("posts").doc(postId).get();
  if (!snap.exists) return;
  const post = snap.data();
  const newTitle = prompt("Yeni başlık", post.title || "");
  if (newTitle === null) return;
  const newBody = prompt("Yeni yazı", post.body || "");
  if (newBody === null) return;

  if (hasBadWords(newTitle + " " + newBody)) {
    alert("Küfürlü içerik yasak.");
    return;
  }

  await db.collection("posts").doc(postId).update({
    title: newTitle.trim(),
    body: newBody.trim()
  });
}

async function deletePost(postId) {
  if (!confirm("Bu paylaşım silinsin mi?")) return;
  await db.collection("posts").doc(postId).delete();
}

function renderChat() {
  const host = document.getElementById("chatBox");
  if (!state.messages.length) {
    host.innerHTML = `<div class="small muted">Henüz sohbet mesajı yok.</div>`;
    return;
  }

  const currentUid = state.user?.uid || "";
  const role = uiRole();

  host.innerHTML = state.messages.map(msg => {
    const isMe = msg.uid === currentUid;
    const reactions = msg.reactions || {};
    const reactionCounts = countReactions(reactions);
    const myReaction = reactions[currentUid] || "";
    const canDelete = isPrivilegedRole(role) || msg.uid === currentUid;

    return `
      <div class="chat-item ${isMe ? "me" : "other"}">
        ${msg.replyTo ? `<div class="reply-preview"><b>Yanıt:</b> ${escapeHtml(msg.replyTo.name || "")} — ${escapeHtml(msg.replyTo.text || "")}</div>` : ""}
        <div class="msg-meta">${escapeHtml(msg.name || "Anonim")} • ${formatTime(msg.createdAt)}</div>
        ${msg.text ? `<div class="chat-text">${escapeHtml(msg.text)}</div>` : ""}
        ${renderMedia(msg.mediaUrl, msg.mediaType, "msg-media")}
        <div class="msg-actions">
          <button class="action-btn ${myReaction === "❤️" ? "active" : ""}" onclick="reactMessage('${msg.id}','❤️')">❤️ ${reactionCounts["❤️"] || 0}</button>
          <button class="action-btn ${myReaction === "😂" ? "active" : ""}" onclick="reactMessage('${msg.id}','😂')">😂 ${reactionCounts["😂"] || 0}</button>
          <button class="action-btn ${myReaction === "😮" ? "active" : ""}" onclick="reactMessage('${msg.id}','😮')">😮 ${reactionCounts["😮"] || 0}</button>
          <button class="action-btn" onclick="setReply('${msg.id}','${escapeJs(msg.name || "")}','${escapeJs(msg.text || "")}')">↩️ Cevapla</button>
          ${canDelete ? `<button class="action-btn" onclick="deleteMessage('${msg.id}')">🗑 Sil</button>` : ""}
        </div>
      </div>
    `;
  }).join("");

  host.scrollTop = host.scrollHeight;
}

function escapeJs(str = "") {
  return String(str).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function clearReply() {
  state.replyTo = null;
  document.getElementById("chatReplyPreview").classList.add("hidden");
  document.getElementById("chatReplyPreview").innerHTML = "";
}

function setReply(id, name, text) {
  state.replyTo = { id, name, text };
  const box = document.getElementById("chatReplyPreview");
  box.classList.remove("hidden");
  box.innerHTML = `<b>Yanıtlanıyor:</b> ${escapeHtml(name)} — ${escapeHtml(text)}`;
}

async function mesajGonder() {
  if (!state.user) return;

  const text = document.getElementById("msgInput").value.trim();
  const file = document.getElementById("chatMedia").files[0];

  if (!text && !file) {
    alert("Mesaj veya medya gir.");
    return;
  }

  if (hasBadWords(text)) {
    alert("Küfürlü mesaj yasak.");
    return;
  }

  let mediaUrl = "";
  let mediaType = "";

  if (file) {
    const path = `chat/${Date.now()}_${file.name}`;
    const ref = storage.ref().child(path);
    await ref.put(file);
    mediaUrl = await ref.getDownloadURL();
    mediaType = file.type || "";
  }

  await db.collection("chatMessages").add({
    uid: state.user.uid,
    name: state.userProfile?.fullName || state.user.email,
    text,
    mediaUrl,
    mediaType,
    replyTo: state.replyTo || null,
    reactions: {},
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  document.getElementById("msgInput").value = "";
  document.getElementById("chatMedia").value = "";
  clearReply();
}

async function reactMessage(messageId, emoji) {
  if (!state.user) return;
  const ref = db.collection("chatMessages").doc(messageId);
  await ref.update({ [`reactions.${state.user.uid}`]: emoji });
}

async function deleteMessage(messageId) {
  if (!confirm("Bu mesaj silinsin mi?")) return;
  await db.collection("chatMessages").doc(messageId).delete();
}

function renderBusinesses() {
  const host = document.getElementById("bizList");
  const featureHost = document.getElementById("businessFeature");

  if (!state.businesses.length) {
    host.innerHTML = `<div class="card muted">Henüz firma yok.</div>`;
    featureHost.classList.add("hidden");
    featureH
