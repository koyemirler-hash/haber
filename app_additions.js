/* ═══════════════════════════════════════════════════════════════
   app_additions.js — Emirler Köyü v4.1
   PWA Tespiti | Sidebar | Dernek | Muhtar | Feed Mini Widget
   app.js'den SONRA yüklenir
═══════════════════════════════════════════════════════════════ */

// ─── 1. PWA TESPİTİ ───────────────────────────────────────────
(function detectAndApplyMode() {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true ||
                  document.referrer.startsWith('android-app://');

    if (isPWA) {
        document.body.classList.add('pwa-mode');
        console.log('[Emirler] Mod: PWA (Standalone)');
    } else {
        document.body.classList.add('browser-mode');
        console.log('[Emirler] Mod: Tarayıcı');
    }
})();

// ─── 2. tabDegistir OVERRIDE ──────────────────────────────────
//   Orijinal fonksiyonu genişletir; sidebar senkronizasyonu +
//   yeni sekme yüklemeleri eklenir.
const _origTabDegistir = window.tabDegistir;

window.tabDegistir = function(t) {
    // Tüm view'ları gizle
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const view = document.getElementById('view-' + t);
    if (view) view.classList.remove('hidden');

    // Alt nav aktif
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navEl = document.getElementById('nav-' + t);
    if (navEl) navEl.classList.add('active');

    // Sidebar aktif
    document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
    const snavEl = document.getElementById('snav-' + t);
    if (snavEl) snavEl.classList.add('active');

    window.scrollTo(0, 0);

    // Floating reklam gizle/göster
    const fr = document.getElementById('floatingReklam');
    if (fr) fr.style.visibility = (t === 'biz') ? 'hidden' : '';

    // Sekmeye özgü yüklemeler
    if (t === 'ilan' && !window.ilanlarDinleBasladi) {
        window.ilanlarDinleBasladi = true;
        if (typeof ilanlarDinle === 'function') ilanlarDinle();
    }
    if (t === 'koy') {
        if (typeof havaDurumuYukle === 'function') havaDurumuYukle();
        if (typeof namazYukle === 'function') namazYukle();
        if (typeof tarimDinle === 'function') tarimDinle();
        if (typeof asiYukle === 'function') asiYukle();
        if (typeof hastalikYukle === 'function') hastalikYukle();
    }
    if (t === 'settings') {
        if (typeof anketDinle === 'function') anketDinle();
    }
    if (t === 'ozel') {
        if (typeof koyluListesiYukle === 'function') koyluListesiYukle();
    }
    if (t === 'feed') {
        if (typeof hikayeleriYukle === 'function') hikayeleriYukle();
        // Browser modda feed üst widget
        if (document.body.classList.contains('browser-mode')) {
            feedHavaMiniYukle();
            feedNamazMiniYukle();
        }
    }
    if (t === 'dernek') dernekDinle();
    if (t === 'muhtar') muhtarYukle();
};

// ─── 3. AUTH STATE DEĞİŞİKLİĞİ – Sidebar Görünürlüğü ────────
//   Firebase auth listener ile koordineli sidebar aç/kapat.
//   Not: app.js'deki onAuthStateChanged zaten varsa buna ek olarak.
(function() {
    if (typeof firebase === 'undefined') return;
    firebase.auth().onAuthStateChanged(function(user) {
        const sidebar = document.getElementById('sidebarNav');
        if (!sidebar) return;
        if (user && document.body.classList.contains('browser-mode')) {
            sidebar.classList.remove('hidden');
        } else {
            sidebar.classList.add('hidden');
        }
    });
})();

// ─── 4. FEED MİNİ HAVA WIDGET ─────────────────────────────────
let _feedHavaYuklendi = false;
async function feedHavaMiniYukle() {
    const el = document.getElementById('feedHavaMini');
    if (!el || _feedHavaYuklendi) return;

    try {
        const KOY_LAT = window.KOY_LAT || 39.72;
        const KOY_LNG = window.KOY_LNG || 33.52;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${KOY_LAT}&longitude=${KOY_LNG}&current=temperature_2m,relative_humidity_2m,weathercode&timezone=Europe%2FIstanbul`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('API hatası');
        const d = await res.json();
        const cur = d.current;

        const HAVA = window.HAVA_KODLAR || {
            0:'☀️ Açık', 1:'🌤️ Az Bulutlu', 2:'⛅ Parçalı', 3:'☁️ Kapalı',
            45:'🌫️ Sis', 51:'🌦️ Çisenti', 61:'🌧️ Yağmurlu', 63:'🌧️ Yağmurlu',
            71:'🌨️ Karlı', 80:'🌦️ Sağanak', 95:'⛈️ Fırtına'
        };
        const durum = HAVA[cur.weathercode] || '🌡️ Belirsiz';
        const parcalar = durum.split(' ');
        const ikon = parcalar[0];
        const metin = parcalar.slice(1).join(' ');

        el.innerHTML = `
            <div class="feed-hava-ana">
                <span class="feed-hava-icon">${ikon}</span>
                <div>
                    <div class="feed-hava-temp">${Math.round(cur.temperature_2m)}°C</div>
                    <div class="feed-hava-durum">${metin} · Nem %${cur.relative_humidity_2m}</div>
                </div>
            </div>
            <div class="feed-hava-yer">📍 Emirler Köyü</div>
        `;
        _feedHavaYuklendi = true;
    } catch(e) {
        el.innerHTML = '<span style="font-size:12px;color:#888;">⚠️ Hava verisi alınamadı</span>';
    }
}

// ─── 5. FEED MİNİ NAMAZ WIDGET ────────────────────────────────
let _feedNamazYuklendi = false;
async function feedNamazMiniYukle() {
    const el = document.getElementById('feedNamazMini');
    if (!el || _feedNamazYuklendi) return;

    try {
        const KOY_LAT = window.KOY_LAT || 39.72;
        const KOY_LNG = window.KOY_LNG || 33.52;
        const b = new Date();
        const res = await fetch(
            `https://api.aladhan.com/v1/timings/${b.getDate()}-${b.getMonth()+1}-${b.getFullYear()}` +
            `?latitude=${KOY_LAT}&longitude=${KOY_LNG}&method=13`
        );
        const d = await res.json();
        const v = d.data.timings;
        const fmt = s => s.split(' ')[0];

        const vakitler = [
            { ikon: '🌅', ad: 'İmsak',  saat: fmt(v.Fajr)    },
            { ikon: '☀️', ad: 'Güneş',  saat: fmt(v.Sunrise)  },
            { ikon: '🌞', ad: 'Öğle',   saat: fmt(v.Dhuhr)    },
            { ikon: '🌇', ad: 'İkindi', saat: fmt(v.Asr)      },
            { ikon: '🌆', ad: 'Akşam',  saat: fmt(v.Maghrib)  },
            { ikon: '🌙', ad: 'Yatsı',  saat: fmt(v.Isha)     }
        ];

        const simdi = b.getHours().toString().padStart(2,'0') + ':' + b.getMinutes().toString().padStart(2,'0');
        let sonrakiIdx = vakitler.findIndex(vk => vk.saat > simdi);
        if (sonrakiIdx === -1) sonrakiIdx = 0; // gece yarısı sonrası → İmsak

        el.innerHTML = `
            <div class="feed-namaz-baslik">🕌 Namaz Vakitleri</div>
            ${vakitler.map((vk, i) => `
                <div class="feed-namaz-satir ${i === sonrakiIdx ? 'feed-namaz-aktif' : ''}">
                    <span>${vk.ikon} ${vk.ad}</span>
                    <span class="feed-namaz-vakt">${vk.saat}</span>
                </div>
            `).join('')}
        `;
        _feedNamazYuklendi = true;
    } catch(e) {
        el.innerHTML = '<span style="font-size:12px;color:#888;">⚠️ Vakit alınamadı</span>';
    }
}

// ─── 6. DERNEK ÇALIŞMALARI ────────────────────────────────────
let _aktifDernekFiltre = 'hepsi';

function dernekFormToggle() {
    const div = document.getElementById('dernekFormDiv');
    if (div) div.classList.toggle('hidden');
}

function dernekFiltre(tip, el) {
    _aktifDernekFiltre = tip;
    document.querySelectorAll('#view-dernek .ilan-filtre-btn').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
    dernekDinle();
}

async function dernekDinle() {
    const list = document.getElementById('dernekList');
    if (!list) return;
    list.innerHTML = '<div class="loading-spinner">⏳ Yükleniyor...</div>';

    // Admin butonu göster
    if (typeof ayricaliklimi === 'function' && ayricaliklimi()) {
        const btn = document.getElementById('dernekEkleBtn');
        if (btn) btn.style.display = '';
    }

    try {
        const snap = await db.collection('dernek').orderBy('time', 'desc').get();
        let docs = [];
        snap.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));

        if (_aktifDernekFiltre !== 'hepsi') {
            docs = docs.filter(item => item.tip === _aktifDernekFiltre);
        }

        if (docs.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-icon">🤝</div><p>Bu kategoride henüz kayıt yok</p></div>';
            return;
        }

        const TIP_METINLER = {
            toplanti: '📅 Toplantı', karar: '⚖️ Karar',
            proje: '🏗️ Proje', etkinlik: '🎉 Etkinlik', diger: '📌 Diğer'
        };
        const TIP_RENKLER = {
            toplanti: 'tip-toplanti', karar: 'tip-karar',
            proje: 'tip-proje', etkinlik: 'tip-etkinlik', diger: ''
        };

        list.innerHTML = '';
        docs.forEach(item => {
            const tipMetin = TIP_METINLER[item.tip] || '📌 Diğer';
            const tipRenk  = TIP_RENKLER[item.tip] || '';
            const isAdmin  = typeof ayricaliklimi === 'function' && ayricaliklimi();
            const esc      = typeof escapeHtml === 'function' ? escapeHtml : s => String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;');

            const kart = document.createElement('div');
            kart.className = `dernek-kart dernek-tip-${item.tip || 'diger'}`;
            kart.innerHTML = `
                <div class="dernek-kart-ust">
                    <span class="dernek-tip-badge ${tipRenk}">${tipMetin}</span>
                    <span class="dernek-baslik">${esc(item.baslik || '')}</span>
                </div>
                ${item.tarih ? `<div class="dernek-tarih">📅 ${esc(item.tarih)}</div>` : ''}
                ${item.aciklama ? `<div class="dernek-aciklama">${esc(item.aciklama)}</div>` : ''}
                ${item.imageUrl ? `<img src="${item.imageUrl}" style="width:100%;max-height:220px;object-fit:cover;cursor:pointer;border-top:1px solid #f0f0f0;" onclick="resimTamEkran('${item.imageUrl}')" loading="lazy">` : ''}
                ${isAdmin ? `<div class="dernek-footer"><button class="btn btn-danger btn-sm" onclick="dernekSil('${item.id}')">🗑️ Sil</button></div>` : ''}
            `;
            list.appendChild(kart);
        });
    } catch(e) {
        list.innerHTML = `<div style="text-align:center;padding:24px;color:#888;">⚠️ Yüklenemedi<br><small>${e.message}</small></div>`;
    }
}

async function dernekEkle() {
    if (typeof ayricaliklimi !== 'function' || !ayricaliklimi()) {
        return alert('Yetkiniz yok!');
    }
    const baslik = document.getElementById('dernekBaslik')?.value.trim();
    if (!baslik) return alert('Başlık zorunludur!');

    const btn = document.getElementById('dernekGonderBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Yükleniyor...'; }

    try {
        let imageUrl = '';
        const file = document.getElementById('dernekDosya')?.files[0];
        if (file && typeof cloudinaryYukle === 'function') {
            const r = await cloudinaryYukle(file);
            imageUrl = r.url;
        }

        await db.collection('dernek').add({
            tip:      document.getElementById('dernekTip')?.value || 'diger',
            baslik,
            tarih:    document.getElementById('dernekTarih')?.value || '',
            aciklama: document.getElementById('dernekAciklama')?.value.trim() || '',
            imageUrl,
            ekleyen:  window.userProfile?.name || '',
            time:     firebase.firestore.FieldValue.serverTimestamp()
        });

        // Formu temizle
        ['dernekBaslik','dernekAciklama','dernekTarih','dernekDosya'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        const prev = document.getElementById('dernekOnizle');
        if (prev) prev.innerHTML = '';
        document.getElementById('dernekFormDiv')?.classList.add('hidden');

        dernekDinle();
        alert('✅ Başarıyla eklendi!');
    } catch(e) {
        alert('Hata: ' + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '✅ Yayınla'; }
    }
}

async function dernekSil(id) {
    if (typeof ayricaliklimi !== 'function' || !ayricaliklimi()) return;
    if (!confirm('Bu kaydı silmek istiyor musunuz?')) return;
    try {
        await db.collection('dernek').doc(id).delete();
        dernekDinle();
    } catch(e) {
        alert('Silinemedi!');
    }
}

// ─── 7. MUHTAR HAKKINDA ───────────────────────────────────────
let _muhtarVerisi = null;

function muhtarEditToggle() {
    const panel = document.getElementById('muhtarEditPanel');
    if (!panel) return;
    const gizli = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');

    // Açılıyorsa mevcut verileri formlara doldur
    if (gizli && _muhtarVerisi) {
        const v = _muhtarVerisi;
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };
        setVal('muhtarAd',    v.ad);
        setVal('muhtarUnvan', v.unvan);
        setVal('muhtarBio',   v.bio);
        setVal('muhtarTel',   v.tel);
        setVal('muhtarWa',    v.whatsapp);
        setVal('muhtarEmail', v.email);
    }
}

async function muhtarYukle() {
    const profilEl      = document.getElementById('muhtarProfilKart');
    const hizmetEl      = document.getElementById('muhtarHizmetlerList');
    const iletisimEl    = document.getElementById('muhtarIletisimBolum');
    const iletisimBasEl = document.getElementById('muhtarIletisimBaslik');

    // Admin düzenle butonu
    if (typeof ayricaliklimi === 'function' && ayricaliklimi()) {
        const btn = document.getElementById('muhtarDuzenleBtn');
        if (btn) btn.style.display = '';
    }

    const esc = typeof escapeHtml === 'function' ? escapeHtml : s => String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;');

    try {
        const snap = await db.collection('settings').doc('muhtar').get();

        if (snap.exists) {
            _muhtarVerisi = snap.data();
            const v = _muhtarVerisi;

            // ── Profil Kartı ──
            if (profilEl) {
                profilEl.innerHTML = `
                    ${v.fotoUrl
                        ? `<img src="${v.fotoUrl}" class="muhtar-profil-foto" alt="${esc(v.ad||'')}">`
                        : '<div class="muhtar-profil-foto-placeholder">👤</div>'
                    }
                    <div class="muhtar-profil-bilgi">
                        <div class="muhtar-ad">${esc(v.ad || 'Emirler Köyü Muhtarı')}</div>
                        <div class="muhtar-unvan">${esc(v.unvan || 'Köy Muhtarı')}</div>
                        ${v.bio ? `<div class="muhtar-bio">${esc(v.bio)}</div>` : ''}
                    </div>
                `;
            }

            // ── Hizmetler ──
            if (hizmetEl) {
                const hizmetler = v.hizmetler || [];
                const isAdmin = typeof ayricaliklimi === 'function' && ayricaliklimi();

                if (hizmetler.length === 0) {
                    hizmetEl.innerHTML = '<div style="color:#aaa;font-size:14px;padding:10px 4px;text-align:center;">Henüz hizmet bilgisi girilmemiş</div>';
                } else {
                    hizmetEl.innerHTML = hizmetler.map((h, i) => `
                        <div class="muhtar-hizmet-kart">
                            <div class="muhtar-hizmet-yil">${esc(String(h.yil || '—'))}</div>
                            <div class="muhtar-hizmet-icerik">
                                <div class="muhtar-hizmet-baslik">${esc(h.baslik || '')}</div>
                                ${h.aciklama ? `<div class="muhtar-hizmet-aciklama">${esc(h.aciklama)}</div>` : ''}
                            </div>
                            ${isAdmin ? `<button class="muhtar-hizmet-sil" onclick="muhtarHizmetSil(${i})" title="Sil">🗑️</button>` : ''}
                        </div>
                    `).join('');
                }
            }

            // ── İletişim ──
            const iletisimler = [];
            if (v.tel)      iletisimler.push(`<a href="tel:${v.tel}" class="contact-btn phone-btn"><span class="contact-icon">📞</span><span>Telefon</span></a>`);
            if (v.whatsapp) iletisimler.push(`<a href="https://wa.me/${v.whatsapp.replace(/[^0-9]/g,'')}" target="_blank" class="contact-btn whatsapp-btn"><span class="contact-icon">💬</span><span>WhatsApp</span></a>`);
            if (v.email)    iletisimler.push(`<a href="mailto:${v.email}" class="contact-btn email-btn"><span class="contact-icon">✉️</span><span>E-Posta</span></a>`);

            if (iletisimler.length > 0) {
                if (iletisimBasEl) iletisimBasEl.style.display = '';
                if (iletisimEl)   iletisimEl.innerHTML = `<div class="contact-buttons">${iletisimler.join('')}</div>`;
            } else {
                if (iletisimBasEl) iletisimBasEl.style.display = 'none';
            }

        } else {
            // Boş durum
            _muhtarVerisi = {};
            if (profilEl) {
                profilEl.innerHTML = `
                    <div class="muhtar-profil-foto-placeholder">👤</div>
                    <div class="muhtar-profil-bilgi">
                        <div class="muhtar-ad">Emirler Köyü Muhtarı</div>
                        <div class="muhtar-unvan">Köy Muhtarı</div>
                        <div class="muhtar-bio" style="color:#aaa;">Muhtar bilgileri henüz eklenmemiştir.<br>Admin bu bölümü doldurabilir.</div>
                    </div>
                `;
            }
            if (hizmetEl) hizmetEl.innerHTML = '<div style="color:#aaa;font-size:14px;padding:10px 4px;text-align:center;">Henüz hizmet bilgisi girilmemiş</div>';
            if (iletisimBasEl) iletisimBasEl.style.display = 'none';
        }
    } catch(e) {
        if (profilEl) profilEl.innerHTML = `<div style="padding:24px;text-align:center;color:#888;">⚠️ Yüklenemedi<br><small>${e.message}</small></div>`;
    }
}

async function muhtarKaydet() {
    if (typeof ayricaliklimi !== 'function' || !ayricaliklimi()) {
        return alert('Yetkiniz yok!');
    }
    const btn = document.getElementById('muhtarKaydetBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Kaydediliyor...'; }

    try {
        // Mevcut veriyi koru (hizmetler listesi vb.)
        const snap = await db.collection('settings').doc('muhtar').get();
        const eskiVeri = snap.exists ? snap.data() : {};

        // Fotoğraf yükle (varsa)
        let fotoUrl = eskiVeri.fotoUrl || '';
        const fotoFile = document.getElementById('muhtarFoto')?.files[0];
        if (fotoFile && typeof cloudinaryYukle === 'function') {
            const r = await cloudinaryYukle(fotoFile);
            fotoUrl = r.url;
        }

        const veri = {
            ...eskiVeri,
            ad:       document.getElementById('muhtarAd')?.value.trim() || '',
            unvan:    document.getElementById('muhtarUnvan')?.value.trim() || 'Köy Muhtarı',
            bio:      document.getElementById('muhtarBio')?.value.trim() || '',
            tel:      document.getElementById('muhtarTel')?.value.trim() || '',
            whatsapp: document.getElementById('muhtarWa')?.value.trim() || '',
            email:    document.getElementById('muhtarEmail')?.value.trim() || '',
            fotoUrl,
            guncellendi: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('settings').doc('muhtar').set(veri);
        _muhtarVerisi = veri;

        // Formu kapat ve sayfayı yenile
        document.getElementById('muhtarEditPanel')?.classList.add('hidden');
        muhtarYukle();
        alert('✅ Muhtar profili kaydedildi!');
    } catch(e) {
        alert('Hata: ' + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '💾 Profili Kaydet'; }
    }
}

async function muhtarHizmetEkle() {
    if (typeof ayricaliklimi !== 'function' || !ayricaliklimi()) {
        return alert('Yetkiniz yok!');
    }
    const baslik = document.getElementById('muhtarHizmetBaslik')?.value.trim();
    if (!baslik) return alert('Hizmet başlığı zorunludur!');

    try {
        const snap = await db.collection('settings').doc('muhtar').get();
        const eskiVeri = snap.exists ? snap.data() : {};
        const hizmetler = Array.isArray(eskiVeri.hizmetler) ? [...eskiVeri.hizmetler] : [];

        // Başa ekle (en yeni üstte)
        hizmetler.unshift({
            baslik,
            aciklama: document.getElementById('muhtarHizmetAciklama')?.value.trim() || '',
            yil:      document.getElementById('muhtarHizmetYil')?.value || String(new Date().getFullYear())
        });

        await db.collection('settings').doc('muhtar').set(
            { ...eskiVeri, hizmetler },
            { merge: true }
        );

        // Temizle
        ['muhtarHizmetBaslik','muhtarHizmetAciklama','muhtarHizmetYil'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });

        _muhtarVerisi = { ...eskiVeri, hizmetler };
        muhtarYukle();
        alert('✅ Hizmet eklendi!');
    } catch(e) {
        alert('Hata: ' + e.message);
    }
}

async function muhtarHizmetSil(index) {
    if (typeof ayricaliklimi !== 'function' || !ayricaliklimi()) return;
    if (!confirm('Bu hizmeti silmek istiyor musunuz?')) return;

    try {
        const snap = await db.collection('settings').doc('muhtar').get();
        if (!snap.exists) return;
        const veri = snap.data();
        const hizmetler = Array.isArray(veri.hizmetler) ? [...veri.hizmetler] : [];
        hizmetler.splice(index, 1);
        await db.collection('settings').doc('muhtar').set({ ...veri, hizmetler });
        _muhtarVerisi = { ...veri, hizmetler };
        muhtarYukle();
    } catch(e) {
        alert('Silinemedi: ' + e.message);
    }
}

// ─── 8. BROWSER MODUNDA SOHBET TAB GİZLEME ───────────────────
//   Chat sekmesine tarayıcıdan gidilirse uyarı göster
const _chatOrigClick = function(t) {
    if (t === 'chat' && document.body.classList.contains('browser-mode')) {
        // Chat uyarısını göster, gerçek chat içeriğini gizle
        const uyari = document.getElementById('chatBrowserUyari');
        if (uyari) uyari.style.display = 'block';
        const chatBox = document.getElementById('chatBox');
        if (chatBox) chatBox.style.display = 'none';
        const chatInput = document.querySelector('.chat-input-bar');
        if (chatInput) chatInput.style.display = 'none';
    }
};

// tabDegistir'e ek hook
const _tabWithChat = window.tabDegistir;
window.tabDegistir = function(t) {
    _tabWithChat(t);
    _chatOrigClick(t);
};

// ─── 9. SAYFA YÜKLENİNCE (Browser Mode) ─────────────────────
window.addEventListener('DOMContentLoaded', function() {
    // Browser modunda feed yüklenince mini widget yükle
    if (document.body.classList.contains('browser-mode')) {
        // Giriş tamamlandıktan sonra otomatik yüklenecek (tabDegistir içinde)
    }
});

console.log('[Emirler] app_additions.js yüklendi. v4.1');
