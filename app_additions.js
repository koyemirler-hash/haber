/* ═══════════════════════════════════════════════════════════
   app_additions.js — Emirler Köyü v4.3 (GÜVENLI VERSİYON)
   ✓ Orijinal tabDegistir'i BOZMAZ — sadece saplar/genişletir
   ✓ İkinci Firebase listener YOK
   ✓ Tüm try/catch ile korumalı
   app.js'den SONRA yüklenir
═══════════════════════════════════════════════════════════ */

/* ─── 1. PWA / BROWSER MOD TESPİTİ ─────────────────────── */
(function detectMode() {
    try {
        const isPWA =
            window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true ||
            document.referrer.startsWith('android-app://');
        document.body.classList.add(isPWA ? 'pwa-mode' : 'browser-mode');
    } catch(e) {
        // Hata olursa browser-mode varsay
        document.body.classList.add('browser-mode');
    }
})();

/* ─── 2. SIDEBAR AÇMA / KAPAMA ─────────────────────────── */
function sidebarToggle() {
    try {
        var nav = document.getElementById('sidebarNav');
        var overlay = document.getElementById('sidebarOverlay');
        var isOpen = nav && nav.classList.contains('sidebar-open');
        if (isOpen) {
            sidebarKapat();
        } else {
            if (nav) nav.classList.add('sidebar-open');
            if (overlay) overlay.classList.add('visible');
            document.body.style.overflow = 'hidden';
        }
    } catch(e) {}
}

function sidebarKapat() {
    try {
        var nav = document.getElementById('sidebarNav');
        var overlay = document.getElementById('sidebarOverlay');
        if (nav) nav.classList.remove('sidebar-open');
        if (overlay) overlay.classList.remove('visible');
        document.body.style.overflow = '';
    } catch(e) {}
}

/* Sidebar'dan sekme değiştir + kapat */
function sidebarTabGit(t) {
    try {
        tabDegistir(t);
    } catch(e) {}
    setTimeout(sidebarKapat, 200);
}

/* ESC ile kapat */
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') sidebarKapat();
});

/* ─── 3. tabDegistir SARMA (replace değil, genişlet) ───── */
window.addEventListener('load', function() {
    try {
        var _orijinal = window.tabDegistir;
        if (typeof _orijinal !== 'function') return;

        window.tabDegistir = function(t) {
            /* --- YENİ SEKMELER (dernek, muhtar) --- */
            if (t === 'dernek' || t === 'muhtar') {
                // Orijinal kodu taklit et
                document.querySelectorAll('.view').forEach(function(v) {
                    v.classList.add('hidden');
                });
                var view = document.getElementById('view-' + t);
                if (view) view.classList.remove('hidden');

                document.querySelectorAll('.nav-item').forEach(function(n) {
                    n.classList.remove('active');
                });
                var navEl = document.getElementById('nav-' + t);
                if (navEl) navEl.classList.add('active');

                document.querySelectorAll('.sidebar-item').forEach(function(s) {
                    s.classList.remove('active');
                });
                var snavEl = document.getElementById('snav-' + t);
                if (snavEl) snavEl.classList.add('active');

                window.scrollTo(0, 0);

                var fr = document.getElementById('floatingReklam');
                if (fr) fr.style.visibility = '';

                if (t === 'dernek') { try { dernekDinle(); } catch(e) {} }
                if (t === 'muhtar') { try { muhtarYukle(); } catch(e) {} }
                return;
            }

            /* --- ESKİ SEKMELER: orijinal fonksiyonu çağır --- */
            try {
                _orijinal(t);
            } catch(e) {
                console.warn('[Emirler] tabDegistir hatası:', e);
            }

            /* Orijinalden sonra sidebar aktif güncelle */
            document.querySelectorAll('.sidebar-item').forEach(function(s) {
                s.classList.remove('active');
            });
            var sEl = document.getElementById('snav-' + t);
            if (sEl) sEl.classList.add('active');

            /* Feed açılınca mini widget yükle (browser modda) */
            if (t === 'feed' && document.body.classList.contains('browser-mode')) {
                feedHavaMiniYukle();
                feedNamazMiniYukle();
            }
        };
    } catch(e) {
        console.warn('[Emirler] tabDegistir sarma hatası:', e);
    }
});

/* ─── 4. FEED MİNİ HAVA WIDGET ─────────────────────────── */
var _feedHavaYuklendi = false;

function feedHavaMiniYukle() {
    var el = document.getElementById('feedHavaMini');
    if (!el || _feedHavaYuklendi) return;

    var KOY_LAT = (typeof KOY_LAT !== 'undefined' ? KOY_LAT : null) || 39.72;
    var KOY_LNG = (typeof KOY_LNG !== 'undefined' ? KOY_LNG : null) || 33.52;

    var HAVA = {
        0:'☀️ Açık', 1:'🌤️ Az Bulutlu', 2:'⛅ Parçalı', 3:'☁️ Kapalı',
        45:'🌫️ Sis', 51:'🌦️ Çisenti', 61:'🌧️ Yağmurlu', 63:'🌧️ Yağmurlu',
        71:'🌨️ Karlı', 80:'🌦️ Sağanak', 95:'⛈️ Fırtına'
    };

    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + KOY_LAT +
          '&longitude=' + KOY_LNG +
          '&current=temperature_2m,relative_humidity_2m,weathercode&timezone=Europe%2FIstanbul')
        .then(function(r) { return r.json(); })
        .then(function(d) {
            var cur = d.current;
            var durum = HAVA[cur.weathercode] || '🌡️';
            var parcalar = durum.split(' ');
            var ikon = parcalar[0];
            var metin = parcalar.slice(1).join(' ');
            el.innerHTML =
                '<div class="feed-hava-ana">' +
                '  <span class="feed-hava-icon">' + ikon + '</span>' +
                '  <div>' +
                '    <div class="feed-hava-temp">' + Math.round(cur.temperature_2m) + '°C</div>' +
                '    <div class="feed-hava-durum">' + metin + ' · %' + cur.relative_humidity_2m + '</div>' +
                '  </div>' +
                '</div>' +
                '<div class="feed-hava-yer">📍 Emirler Köyü</div>';
            _feedHavaYuklendi = true;
        })
        .catch(function() {
            el.innerHTML = '<span style="font-size:12px;color:#888;">⚠️ Hava verisi alınamadı</span>';
        });
}

/* ─── 5. FEED MİNİ NAMAZ WIDGET ────────────────────────── */
var _feedNamazYuklendi = false;

function feedNamazMiniYukle() {
    var el = document.getElementById('feedNamazMini');
    if (!el || _feedNamazYuklendi) return;

    var KOY_LAT = 39.72;
    var KOY_LNG = 33.52;
    var b = new Date();

    fetch('https://api.aladhan.com/v1/timings/' + b.getDate() + '-' + (b.getMonth()+1) + '-' + b.getFullYear() +
          '?latitude=' + KOY_LAT + '&longitude=' + KOY_LNG + '&method=13')
        .then(function(r) { return r.json(); })
        .then(function(d) {
            var v = d.data.timings;
            var fmt = function(s) { return s.split(' ')[0]; };
            var vakitler = [
                {ikon:'🌅', ad:'İmsak',  saat: fmt(v.Fajr)   },
                {ikon:'☀️', ad:'Güneş',  saat: fmt(v.Sunrise) },
                {ikon:'🌞', ad:'Öğle',   saat: fmt(v.Dhuhr)   },
                {ikon:'🌇', ad:'İkindi', saat: fmt(v.Asr)     },
                {ikon:'🌆', ad:'Akşam',  saat: fmt(v.Maghrib) },
                {ikon:'🌙', ad:'Yatsı',  saat: fmt(v.Isha)    }
            ];
            var simdi = String(b.getHours()).padStart(2,'0') + ':' + String(b.getMinutes()).padStart(2,'0');
            var sonrakiIdx = vakitler.findIndex(function(vk) { return vk.saat > simdi; });
            if (sonrakiIdx === -1) sonrakiIdx = 0;

            var html = '<div class="feed-namaz-baslik">🕌 Namaz Vakitleri</div>';
            vakitler.forEach(function(vk, i) {
                html += '<div class="feed-namaz-satir' + (i === sonrakiIdx ? ' feed-namaz-aktif' : '') + '">' +
                        '<span>' + vk.ikon + ' ' + vk.ad + '</span>' +
                        '<span class="feed-namaz-vakt">' + vk.saat + '</span>' +
                        '</div>';
            });
            el.innerHTML = html;
            _feedNamazYuklendi = true;
        })
        .catch(function() {
            el.innerHTML = '<span style="font-size:12px;color:#888;">⚠️ Vakit alınamadı</span>';
        });
}

/* ─── 6. DERNEK ÇALIŞMALARI ────────────────────────────── */
var _aktifDernekFiltre = 'hepsi';

function dernekFormToggle() {
    try {
        var div = document.getElementById('dernekFormDiv');
        if (div) div.classList.toggle('hidden');
    } catch(e) {}
}

function dernekFiltre(tip, el) {
    _aktifDernekFiltre = tip;
    document.querySelectorAll('#view-dernek .ilan-filtre-btn').forEach(function(b) {
        b.classList.remove('active');
    });
    if (el) el.classList.add('active');
    dernekDinle();
}

function dernekDinle() {
    var list = document.getElementById('dernekList');
    if (!list || typeof db === 'undefined') return;
    list.innerHTML = '<div class="loading-spinner">⏳ Yükleniyor...</div>';

    try {
        if (typeof ayricaliklimi === 'function' && ayricaliklimi()) {
            var btn = document.getElementById('dernekEkleBtn');
            if (btn) btn.style.display = '';
        }
    } catch(e) {}

    db.collection('dernek').orderBy('time', 'desc').get()
        .then(function(snap) {
            var docs = [];
            snap.forEach(function(doc) { docs.push(Object.assign({id: doc.id}, doc.data())); });

            if (_aktifDernekFiltre !== 'hepsi') {
                docs = docs.filter(function(d) { return d.tip === _aktifDernekFiltre; });
            }

            if (docs.length === 0) {
                list.innerHTML = '<div class="empty-state"><div class="empty-icon">🤝</div><p>Bu kategoride kayıt yok</p></div>';
                return;
            }

            var TM = { toplanti:'📅 Toplantı', karar:'⚖️ Karar', proje:'🏗️ Proje', etkinlik:'🎉 Etkinlik', diger:'📌 Diğer' };
            var TR = { toplanti:'tip-toplanti', karar:'tip-karar', proje:'tip-proje', etkinlik:'tip-etkinlik', diger:'' };
            var esc = (typeof escapeHtml === 'function') ? escapeHtml : function(s) {
                return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            };
            var isAdmin = (typeof ayricaliklimi === 'function') && ayricaliklimi();

            list.innerHTML = '';
            docs.forEach(function(item) {
                var kart = document.createElement('div');
                kart.className = 'dernek-kart dernek-tip-' + (item.tip || 'diger');
                kart.innerHTML =
                    '<div class="dernek-kart-ust">' +
                    '  <span class="dernek-tip-badge ' + (TR[item.tip]||'') + '">' + (TM[item.tip]||'📌 Diğer') + '</span>' +
                    '  <span class="dernek-baslik">' + esc(item.baslik||'') + '</span>' +
                    '</div>' +
                    (item.tarih ? '<div class="dernek-tarih">📅 ' + esc(item.tarih) + '</div>' : '') +
                    (item.aciklama ? '<div class="dernek-aciklama">' + esc(item.aciklama) + '</div>' : '') +
                    (item.imageUrl ? '<img src="' + item.imageUrl + '" style="width:100%;max-height:220px;object-fit:cover;cursor:pointer;border-top:1px solid #f0f0f0;" onclick="resimTamEkran(\'' + item.imageUrl + '\')" loading="lazy">' : '') +
                    (isAdmin ? '<div class="dernek-footer"><button class="btn btn-danger btn-sm" onclick="dernekSil(\'' + item.id + '\')">🗑️ Sil</button></div>' : '');
                list.appendChild(kart);
            });
        })
        .catch(function(e) {
            list.innerHTML = '<div style="text-align:center;padding:24px;color:#888;">⚠️ Yüklenemedi<br><small>' + e.message + '</small></div>';
        });
}

function dernekEkle() {
    if (typeof ayricaliklimi !== 'function' || !ayricaliklimi()) return alert('Yetkiniz yok!');
    var baslik = (document.getElementById('dernekBaslik') || {}).value;
    if (!baslik || !baslik.trim()) return alert('Başlık zorunludur!');
    baslik = baslik.trim();

    var btn = document.getElementById('dernekGonderBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

    var dosyaEl = document.getElementById('dernekDosya');
    var file = dosyaEl && dosyaEl.files[0];

    var kaydet = function(imageUrl) {
        db.collection('dernek').add({
            tip:      (document.getElementById('dernekTip')||{}).value || 'diger',
            baslik:   baslik,
            tarih:    ((document.getElementById('dernekTarih')||{}).value || ''),
            aciklama: (((document.getElementById('dernekAciklama')||{}).value || '').trim()),
            imageUrl: imageUrl || '',
            ekleyen:  (window.userProfile && window.userProfile.name) || '',
            time:     firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
            ['dernekBaslik','dernekAciklama','dernekTarih','dernekDosya'].forEach(function(id) {
                var el = document.getElementById(id); if (el) el.value = '';
            });
            var prev = document.getElementById('dernekOnizle'); if (prev) prev.innerHTML = '';
            var form = document.getElementById('dernekFormDiv'); if (form) form.classList.add('hidden');
            dernekDinle();
            alert('✅ Başarıyla eklendi!');
        }).catch(function(e) { alert('Hata: ' + e.message); })
        .finally(function() { if (btn) { btn.disabled = false; btn.textContent = '✅ Yayınla'; } });
    };

    if (file && typeof cloudinaryYukle === 'function') {
        cloudinaryYukle(file).then(function(r) { kaydet(r.url); }).catch(function() { kaydet(''); });
    } else {
        kaydet('');
    }
}

function dernekSil(id) {
    if (typeof ayricaliklimi !== 'function' || !ayricaliklimi()) return;
    if (!confirm('Bu kaydı silmek istiyor musunuz?')) return;
    db.collection('dernek').doc(id).delete()
        .then(function() { dernekDinle(); })
        .catch(function() { alert('Silinemedi!'); });
}

/* ─── 7. MUHTAR HAKKINDA ────────────────────────────────── */
var _muhtarVerisi = null;

function muhtarEditToggle() {
    try {
        var panel = document.getElementById('muhtarEditPanel');
        if (!panel) return;
        var gizliydi = panel.classList.contains('hidden');
        panel.classList.toggle('hidden');
        if (gizliydi && _muhtarVerisi) {
            var v = _muhtarVerisi;
            var sv = function(id, val) { var el = document.getElementById(id); if (el) el.value = val || ''; };
            sv('muhtarAd', v.ad); sv('muhtarUnvan', v.unvan); sv('muhtarBio', v.bio);
            sv('muhtarTel', v.tel); sv('muhtarWa', v.whatsapp); sv('muhtarEmail', v.email);
        }
    } catch(e) {}
}

function muhtarYukle() {
    if (typeof db === 'undefined') return;

    var profilEl      = document.getElementById('muhtarProfilKart');
    var hizmetEl      = document.getElementById('muhtarHizmetlerList');
    var iletisimEl    = document.getElementById('muhtarIletisimBolum');
    var iletisimBasEl = document.getElementById('muhtarIletisimBaslik');

    try {
        if (typeof ayricaliklimi === 'function' && ayricaliklimi()) {
            var btn = document.getElementById('muhtarDuzenleBtn');
            if (btn) btn.style.display = '';
        }
    } catch(e) {}

    var esc = (typeof escapeHtml === 'function') ? escapeHtml : function(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    };
    var isAdmin = (typeof ayricaliklimi === 'function') && ayricaliklimi();

    db.collection('settings').doc('muhtar').get()
        .then(function(snap) {
            if (snap.exists) {
                _muhtarVerisi = snap.data();
                var v = _muhtarVerisi;

                if (profilEl) {
                    profilEl.innerHTML =
                        (v.fotoUrl
                            ? '<img src="' + v.fotoUrl + '" class="muhtar-profil-foto" alt="' + esc(v.ad||'') + '">'
                            : '<div class="muhtar-profil-foto-placeholder">👤</div>') +
                        '<div class="muhtar-profil-bilgi">' +
                        '  <div class="muhtar-ad">' + esc(v.ad || 'Emirler Köyü Muhtarı') + '</div>' +
                        '  <div class="muhtar-unvan">' + esc(v.unvan || 'Köy Muhtarı') + '</div>' +
                        (v.bio ? '<div class="muhtar-bio">' + esc(v.bio) + '</div>' : '') +
                        '</div>';
                }

                var hizmetler = v.hizmetler || [];
                if (hizmetEl) {
                    if (hizmetler.length === 0) {
                        hizmetEl.innerHTML = '<div style="color:#aaa;font-size:14px;padding:10px;text-align:center;">Henüz hizmet bilgisi girilmemiş</div>';
                    } else {
                        hizmetEl.innerHTML = hizmetler.map(function(h, i) {
                            return '<div class="muhtar-hizmet-kart">' +
                                '<div class="muhtar-hizmet-yil">' + esc(String(h.yil||'—')) + '</div>' +
                                '<div class="muhtar-hizmet-icerik">' +
                                '  <div class="muhtar-hizmet-baslik">' + esc(h.baslik||'') + '</div>' +
                                (h.aciklama ? '<div class="muhtar-hizmet-aciklama">' + esc(h.aciklama) + '</div>' : '') +
                                '</div>' +
                                (isAdmin ? '<button class="muhtar-hizmet-sil" onclick="muhtarHizmetSil(' + i + ')">🗑️</button>' : '') +
                                '</div>';
                        }).join('');
                    }
                }

                var ilt = [];
                if (v.tel)      ilt.push('<a href="tel:' + v.tel + '" class="contact-btn phone-btn"><span class="contact-icon">📞</span><span>Telefon</span></a>');
                if (v.whatsapp) ilt.push('<a href="https://wa.me/' + v.whatsapp.replace(/[^0-9]/g,'') + '" target="_blank" class="contact-btn whatsapp-btn"><span class="contact-icon">💬</span><span>WhatsApp</span></a>');
                if (v.email)    ilt.push('<a href="mailto:' + v.email + '" class="contact-btn email-btn"><span class="contact-icon">✉️</span><span>E-Posta</span></a>');

                if (ilt.length > 0) {
                    if (iletisimBasEl) iletisimBasEl.style.display = '';
                    if (iletisimEl)   iletisimEl.innerHTML = '<div class="contact-buttons">' + ilt.join('') + '</div>';
                } else {
                    if (iletisimBasEl) iletisimBasEl.style.display = 'none';
                }

            } else {
                _muhtarVerisi = {};
                if (profilEl) profilEl.innerHTML =
                    '<div class="muhtar-profil-foto-placeholder">👤</div>' +
                    '<div class="muhtar-profil-bilgi">' +
                    '  <div class="muhtar-ad">Emirler Köyü Muhtarı</div>' +
                    '  <div class="muhtar-unvan">Köy Muhtarı</div>' +
                    '  <div class="muhtar-bio" style="color:#aaa;">Muhtar bilgileri henüz eklenmemiştir.</div>' +
                    '</div>';
                if (hizmetEl) hizmetEl.innerHTML = '<div style="color:#aaa;font-size:14px;padding:10px;text-align:center;">Henüz hizmet bilgisi girilmemiş</div>';
                if (iletisimBasEl) iletisimBasEl.style.display = 'none';
            }
        })
        .catch(function(e) {
            if (profilEl) profilEl.innerHTML = '<div style="padding:24px;text-align:center;color:#888;">⚠️ Yüklenemedi</div>';
        });
}

function muhtarKaydet() {
    if (typeof ayricaliklimi !== 'function' || !ayricaliklimi()) return alert('Yetkiniz yok!');
    var btn = document.getElementById('muhtarKaydetBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

    db.collection('settings').doc('muhtar').get().then(function(snap) {
        var eskiVeri = snap.exists ? snap.data() : {};
        var fotoUrl = eskiVeri.fotoUrl || '';
        var fotoFile = d
