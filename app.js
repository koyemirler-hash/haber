// 🏢 Firma Silme (Sadece Admin/Muhtar/Yardımcı)
async function firmaSil(docId) {
    if (confirm("Bu firmayı silmek istediğine emin misin?")) {
        try {
            await db.collection("businesses").doc(docId).delete();
            alert("Firma başarıyla silindi!");
        } catch (e) { alert("Hata: " + e.message); }
    }
}

// 🟢 Online Üyeleri Ayarlar'da Göster
function onlineTakip() {
    db.collection("users").where("online", "==", true).onSnapshot(snap => {
        let html = "";
        snap.forEach(doc => {
            html += `<div style="padding:5px;"><span class="online-dot"></span>${doc.data().name}</div>`;
        });
        const area = document.getElementById("onlineUsersArea");
        if(area) area.innerHTML = html || "Kimse online değil.";
    });
}

// 📢 Köy Meydanı Akışı (WhatsApp Tarzı Etkileşim)
function akisYukle() {
    db.collection("announcements").orderBy("time", "desc").onSnapshot(snap => {
        let html = "";
        snap.forEach(doc => {
            const data = doc.data();
            html += `
            <div class="post-card">
                <div class="post-header">👤 ${data.sender || 'Yönetim'}</div>
                <div class="post-content">
                    <p>${data.title}</p>
                    ${data.image ? `<img src="${data.image}" style="width:100%">` : ''}
                </div>
                <div class="post-footer">
                    <span onclick="postBegen('${doc.id}')">❤️ Beğen</span>
                    <span onclick="yorumYap('${doc.id}')">💬 Yorum Yap</span>
                </div>
            </div>`;
        });
        document.getElementById("feedContainer").innerHTML = html;
    });
}
