/* ═══════════════════════════════════════════════════════════
   app_additions.js — Emirler Köyü v4.2
   Hamburger Sidebar | PWA Tespit | Dernek | Muhtar | Widget
   app.js'den SONRA yüklenir
═══════════════════════════════════════════════════════════ */

// ─── 1. PWA / BROWSER MOD TESPİTİ ────────────────────────────
(function detectMode() {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true ||
                  document.referrer.startsWith('android-app://');

    document.body.classList.add(isPWA ? 'pwa-mode' : 'browser-mode');
    console.log('[Emirler] Mod:', isPWA ? 'PWA' : 'Tarayıcı');
})();

// ─── 2. SIDEBAR AÇMA / KAPAMA ────────────────────────────────
function sidebarToggle() {
    const nav = document.getElementById('sidebarNav');
    const overlay = document.getElementById('sidebarOverlay');
    const btn = document.getElementById('hamburgerBtn');
    const isOpen = nav.classList.contains('sidebar-open');

    if (isOpen) {
        sidebarKapat();
    } else {
        nav.classList.add('sidebar-open');
        overlay.classList.add('visible');
        if (btn) btn.classList.add('open');
        document.body.style.overflow = 'hidden'; // Arka plan kaymasını engelle
    }
}

function sidebarKapat() {
    const nav = document.getElementById('sidebarNav');
    const overlay = document.getElementById('sidebarOverlay');
    const btn = document.getElementById('hamburgerBtn');

    nav.classList.remove('sidebar-open');
    overlay.classList.remove('visible');
    if (btn) btn.classList.remove('open');
    document.body.style.overflow = '';
}

// Sidebar'dan sekme değiştir + kapat
function sidebarTabGit(t) {
    tabDegistir(t);
    // Küçük gecikme ile kapat (geçiş daha akıcı görünür)
    setTimeout(sidebarKapat, 180);
}

// ESC tuşu ile kapat
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') sidebarKapat();
});

// ─── 3. tabDegistir OVERRIDE (Sidebar Senkronizasyonu) ───────
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

    // Floating reklam
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
        if (document.body.classList.contains('browser-mode')) {
            feedHavaMiniYukle();
            feedNamazMiniYukle();
        }
    }
    if (t === 'dernek') dernekDinle();
    if (t === 'muhtar') muhtarYukle();
};

// ─── 4. AUTH — Sidebar Görünürlüğü (giriş yapınca göster) ───
(function() {
    if (typeof firebase === 'undefined') return;
    firebase.auth().onAuthStateChanged(function(user) {
        // Browser modunda sidebar zaten CSS ile gizli/açık
        // Sadece feed'e gidince mini widget yükle
        if (user && document.body.classList.contains('browser-mode')) {
            setTimeout(() => {
                feedHavaMiniYukle();
                feedNamazMiniYukle();
            }, 800);
        }
    });
})();

// ─── 5. FEED MİNİ HAVA WIDGET ────────────────────────────────
let _feedHavaYuklendi = false;
async function feedHavaMiniYukle() {
    const el = document.getElementById('feedHavaMini');
    if (!el || _feedHavaYuklendi) return;

    const KOY_LAT = window.KOY_LAT || 39.72;
    const KOY_LNG = window.KOY_LNG || 33.52;

    try {
        const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${KOY_LAT}&longitude=${KOY_LNG}` +
            `&current=temperature_2m,relative_humidity_2m,weathercode&timezone=Europe%2FIstanbul`
        );
        if (!res.ok) throw new Error('API hatası');
        const d = await res.json();
        const cur = d.current;

        const HAVA = window.HAVA_KODLAR || {
            0:'☀️ Açık',1:'🌤️ Az Bulutlu',2:'⛅ Parçalı',3:'☁️ Kapalı',
            45:'🌫️ Sis',51:'🌦️ Çisenti',61:'🌧️ Yağmurlu',63:'🌧️ Yağmurlu',
            71:'🌨️ Karlı',80:'🌦️ Sağanak',81:'⛈️ Fırtına',95:'⛈️ Fırtına'
        };
        const durum = HAVA[cur.weathercode] || '🌡️';
        const [ikon, ...metin] = durum.split(' ');

        el.innerHTML = `
            <div class="feed-hava-ana">
                <span class="feed-hava-icon">${ikon}</span>
                <div>
                    <div class="feed-hava-temp">${Math.round(cur.temperature_2m)}°C</div>
                    <div class="feed-hava-durum">${metin.join(' ')} · %${cur.relative_humidity_2m} nem</div>
                </div>
            </div>
            <div class="feed-hava-yer">📍 Emirler Köyü</div>
        `;
        _feedHavaYuklendi = true;
    } catch(e) {
        el.innerHTML = '<span style="font-size:12px;color:#888;">⚠️ Hava verisi alınamadı</span>';
    }
}

// ─── 6. FEED MİNİ NAMAZ WIDGET ───────────────────────────────
let _feedNamazYuklendi = false;
async function feedNamazMiniYukle() {
    const el = document.getElementById('feedNamazMini');
    if (!el || _feedNamazYuklendi) return;

    const KOY_LAT = window.KOY_LAT || 39.72;
    const KOY_LNG = window.KOY_LNG || 33.52;

    try {
        const b = new Date();
        const res = await fetch(
            `https://api.aladhan.com/v1/timings/${b.getDate()}-${b.getMonth()+1}-${b.getFullYear()}` +
            `?latitude=${KOY_LAT}&longitude=${KOY_LNG}&method=13`
        );
        const d = await res.json();
        const v = d.data.timings;
        const fmt = s => s.split(' ')[0];

        const vakitler = [
            {ikon:'🌅', ad:'İmsak',  saat: fmt(v.Fajr)   },
            {ikon:'☀️', ad:'Güneş',  saat: fmt(v.Sunrise) },
            {ikon:'🌞', ad:'Öğle',   saat: fmt(v.Dhuhr)   },
            {ikon:'🌇', ad:'İkindi', saat: fmt(v.Asr)     },
            {ikon:'🌆', ad:'Akşam',  saat: fmt(v.Maghrib) },
            {ikon:'🌙', ad:'Yatsı',  saat: fmt(v.Isha)    }
        ];

        const simdi = b.getHours().toString().padStart(2,'0') + ':' + b.getMinutes().toString().padStart(2,'0');
        let sonrakiIdx = vakitler.findIndex(vk => vk.saat > simdi);
        if (sonrakiIdx === -1) sonrakiIdx = 0;

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

// ─── 7. DERNEK ÇALIŞMALARI ───────────────────────────────────
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

    if (typeof ayricaliklimi === 'function' && ayricaliklimi()) {
        const btn = document.getElementById('dernekEkleBtn');
        if (btn) btn.style.display = '';
    }

    try {
        const snap = await db.collection('dernek').orderBy('time', 'desc').get();
        let docs = [];
        snap.forEach(doc => docs.push({id: doc.id, ...doc.data()}));

        if (_aktifDernekFiltre !== 'hepsi') {
            docs = docs.filter(d => d.tip === _aktifDernekFiltre);
        }

        if (docs.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-icon">🤝</div><p>Bu kategoride kayıt yok</p></div>';
            return;
        }

        const TM = { toplanti:'📅 Toplantı', karar:'⚖️ Karar', proje:'🏗️ Proje', etkinlik:'🎉 Etkinlik', diger:'📌 Diğer' };
        const TR = { toplanti:'tip-toplanti', karar:'tip-karar', proje:'tip-proje', etkinlik:'tip-etkinlik', diger:'' };
        const esc = typeof escapeHtml === 'function' ? escapeHtml : s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

        list.innerHTML = '';
        docs.forEach(item => {
            const isAdmin = typeof ayricaliklimi === 'function' && ayricaliklimi();
            const kart = document.createElement('div');
            kart.className = `dernek-kart dernek-tip-${item.tip || 'diger'}`;
            kart.innerHTML = `
                <div class="dernek-kart-ust">
                    <span class="dernek-tip-badge ${TR[item.tip] || ''}">${TM[item.tip] || '📌 Diğer'}</span>
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
    if (typeof ayricaliklimi !== 'function' || !ayricaliklimi()) return alert('Yetkiniz yok!');
    const baslik = document.getElementById('dernekBaslik')?.value.trim();
    if (!baslik) return alert('Başlık zorunludur!');

    const btn = document.getElementById('dernekGonderBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Yükleniyor...'; }

    try {
        let imageUrl = '';
        const file = document.getElementById('dernekDosya')?.files[0];
        if (file && typeof cloudinaryYukle === 'function') {
            const r = await cloudinaryYukle(file); imageUrl = r.url;
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
        ['dernekBaslik','dernekAciklama','dernekTarih','dernekDosya'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
        const prev = document.getElementById('dernekOnizle');
        if (prev) prev.innerHTML = '';
        document.getElementById('dernekFormDiv')?.classList.add('hidden');
        dernekDinle();
        alert('✅ Başarıyla eklendi!');
    } catch(e) { alert('Hata: ' + e.message); }
    finally { if (btn) { btn.disabled = false; btn.textContent = '✅ Yayınla'; } }
}

async function dernekSil(id) {
    if (typeof ayricaliklimi !== 'function' || !ayricaliklimi()) return;
    if (!confirm('Bu kaydı silmek istiyor musunuz?')) return;
    try { await db.collection('dernek').doc(id).delete(); dernekDinle(); }
    catch(e) { alert('Silinemedi!'); }
}

// ─── 8. MUHTAR HAKKINDA ──────────────────────────────────────
let _muhtarVerisi = null;

function muhtarEditToggle() {
    const panel = document.getElementById('muhtarEditPanel');
    if (!panel) return;
    const gizliydi = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    if (gizliydi && _muhtarVerisi) {
        const v = _muhtarVerisi;
        const sv = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        sv('muhtarAd', v.ad); sv('muhtarUnvan', v.unvan); sv('muhtarBio', v.bio);
        sv('muhtarTel', v.tel); sv('muhtarWa', v.whatsapp); sv('muhtarEmail', v.email);
    }
}

async function muhtarYukle() {
    const profilEl      = document.getElementById('muhtarProfilKart');
    const hizmetEl      = document.getElementById('muhtarHizmetlerList');
    const iletisimEl    = document.getElementById('muhtarIletisimBolum');
    const iletisimBasEl = document.getElementById('muhtarIletisimBaslik');

    if (typeof ayricaliklimi === 'function' && ayricaliklimi()) {
        const btn = document.getElementById('muhtarDuzenleBtn');
        if (btn) btn.style.display = '';
    }

    const esc = typeof escapeHtml === 'function' ? escapeHtml
        : s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    try {
        const snap = await db.collection('settings').doc('muhtar').get();
        if (snap.exists) {
            _muhtarVerisi = snap.data();
            const v = _muhtarVerisi;

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
                    </div>`;
            }

            const hizmetler = v.hizmetler || [];
            const isAdmin = typeof ayricaliklimi === 'function' && ayricaliklimi();
            if (hizmetEl) {
                hizmetEl.innerHTML = hizmetler.length === 0
                    ? '<div style="color:#aaa;font-size:14px;padding:10px 4px;text-align:center;">Henüz hizmet bilgisi girilmemiş</div>'
                    : hizmetler.map((h, i) => `
                        <div class="muhtar-hizmet-kart">
                            <div class="muhtar-hizmet-yil">${esc(String(h.yil || '—'))}</div>
                            <div class="muhtar-hizmet-icerik">
                                <div class="muhtar-hizmet-baslik">${esc(h.baslik || '')}</div>
                                ${h.aciklama ? `<div class="muhtar-hizmet-aciklama">${esc(h.aciklama)}</div>` : ''}
                            </div>
                            ${isAdmin ? `<button class="muhtar-hizmet-sil" onclick="muhtarHizmetSil(${i})">🗑️</button>` : ''}
                        </div>`).join('');
            }

            const ilt = [];
            if (v.tel)      ilt.push(`<a href="tel:${v.tel}" class="contact-btn phone-btn"><span class="contact-icon">📞</span><span>Telefon</span></a>`);
            if (v.whatsapp) ilt.push(`<a href="https://wa.me/${v.whatsapp.replace(/[^0-9]/g,'')}" target="_blank" class="contact-btn whatsapp-btn"><span class="contact-icon">💬</span><span>WhatsApp</span></a>`);
            if (v.email)    ilt.push(`<a href="mailto:${v.email}" class="contact-btn email-btn"><span class="contact-icon">✉️</span><span>E-Posta</span></a>`);

            if (ilt.length > 0) {
                if (iletisimBasEl) iletisimBasEl.style.display = '';
                if (iletisimEl)   iletisimEl.innerHTML = `<div class="contact-buttons">${ilt.join('')}</div>`;
            } else {
                if (iletisimBasEl) iletisimBasEl.style.display = 'none';
            }
        } else {
            _muhtarVerisi = {};
            if (profilEl) profilEl.innerHTML = `
                <div class="muhtar-profil-foto-placeholder">👤</div>
                <div class="muhtar-profil-bilgi">
                    <div class="muhtar-ad">Emirler Köyü Muhtarı</div>
                    <div class="muhtar-unvan">Köy Muhtarı</div>
                    <div class="muhtar-bio" style="color:#aaa;">Muhtar bilgileri henüz eklenmemiştir.</div>
                </div>`;
            if (hizmetEl) hizmetEl.innerHTML = '<div style="color:#aaa;font-size:14px;padding:10px;text-align:center;">Henüz hizmet bilgisi girilmemiş</div>';
            if (iletisimBasEl) iletisimBasEl.style.display = 'none';
        }
    } catch(e) {
        if (profilEl) profilEl.innerHTML = `<div style="padding:24px;text-align:center;color:#888;">⚠️ Yüklenemedi<br><small>${e.message}</small></div>`;
    }
}

async function muhtarKaydet() {
    if (typeof ayricaliklimi !== 'function' || !ayricaliklimi()) return alert('Yetkiniz yok!');
    const btn = document.getElementById('muhtarKaydetBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Kaydediliyor...'; }
    try {
        const snap = await db.collection('settings').doc('muhtar').get();
        const eskiVeri = snap.exists ? snap.data() : {};
        let fotoUrl = eskiVeri.fotoUrl || '';
        const fotoFile = document.getElementById('muhtarFoto')?.files[0];
        if (fotoFile && typeof cloudinaryYukle === 'function') {
            const r = await cloudinaryYukle(fotoFile); fotoUrl = r.url;
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
        document.getElementById('muhtarEditPanel')?.classList.add('hidden');
        muhtarYukle();
        alert('✅ Muhtar profili kaydedildi!');
    } catch(e) { alert('Hata: ' + e.message); }
    finally { if (btn) { btn.disabled = false; btn.textContent = '💾 Profili Kaydet'; } }
}

async function muhtarHizmetEkle() {
    if (typeof ayricaliklimi !== 'function' || !ayricaliklimi()) return alert('Yetkiniz yok!');
    const baslik = document.getElementById('muhtarHizmetBa
