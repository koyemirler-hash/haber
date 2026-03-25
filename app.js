/* app.js */
// Firma Silme İşlemi
async function firmaSil(id) {
    if(confirm("Bu firmayı rehberden silmek istediğine emin misin?")) {
        await db.collection("businesses").doc(id).delete();
        alert("Firma silindi!");
    }
}

// Online Kullanıcıları Takip Et
function onlineListesiGuncelle() {
    db.collection("users").where("online", "==", true).onSnapshot(snap => {
        let html = "";
        snap.forEach(doc => {
            html += `<div class="user-item">🟢 ${doc.data().name}</div>`;
        });
        const container = document.getElementById('onlineUsers');
        if(container) container.innerHTML = html;
    });
}

// Köy Meydanı: Sadece Yönetim Paylaşır, Herkes Yorum Yapar
function akisYukle() {
    db.collection("announcements").orderBy("time", "desc").onSnapshot(snap => {
        let html = "";
        snap.forEach(doc => {
            const p = doc.data();
            html += `
            <div class="post-card">
                <b>${p.title}</b>
                ${p.image ? `<img src="${p.image}" style="width:100%">` : ''}
                <div class="post-actions">
                    <span onclick="beğen('${doc.id}')">👍 Beğen</span>
                    <span onclick="yorumAc('${doc.id}')">💬 Yorum Yap</span>
                </div>
            </div>`;
        });
        document.getElementById('feedList').innerHTML = html;
    });
}

