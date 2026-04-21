/* ═══════════════════════════════════════════════════════════════════
   app_additions.js — Emirler Köyü v4.6
   ✓ Uygulama direkt açılır — login ekranı BLOKLAMAMAZ
   ✓ Giriş/Kayıt sidebar'dan yapılır
   ✓ Beğeni/Yorum/Sohbet → auth modal popup
   ✓ SMS OTP telefon doğrulama
   ✓ Ticker DÜZELTME — hava + namaz bağımsız yüklenir
   ✓ tabDegistir'e DOKUNMAZ
═══════════════════════════════════════════════════════════════════ */

/* ─── 1. PWA / BROWSER MOD ─── */
(function() {
    try {
        var isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    window.navigator.standalone === true ||
                    document.referrer.startsWith('android-app://');
        document.body.classList.add(isPWA ? 'pwa-mode' : 'browser-mode');
    } catch(e) { document.body.classList.add('browser-mode'); }
})();

/* ─── 2. UYGULAMA BAŞLANGICI ─── */
/*
   SORUN: app.js, loginPage div'ini arıyor ve göstermeye çalışıyor.
   Bu div artık gizli ama var. app.js onAuthStateChanged'da
   user yoksa sadece currentUser=null yapar — başka bir şey yapmaz.
   Biz loginPage'i daima gizli tutarak uygulamayı direkt açıyoruz.
*/

window.addEventListener('DOMContentLoaded', function() {

    /* loginPage'i her zaman gizli tut (app.js onu göstermeye çalışır) */
    var lp = document.getElementById('loginPage');
    if (lp) { lp.style.cssText = 'display:none!important'; }

    /* Terms daha önce kabul edilmişse direkt aç */
    if (localStorage.getItem('termsAccepted')) {
        var to = document.getElementById('termsOverlay');
        if (to) to.classList.add('hidden');
        /* Firebase hazır olunca içerikleri yükle */
        _bekleVeYukle();
    }

    /* NavBar — PWA'da göster */
    var nb = document.getElementById('navBar');
    if (nb) nb.style.display = document.body.classList.contains('pwa-mode') ? 'flex' : 'none';

    /* navBar → sidebar senkron */
    if (nb) nb.addEventListener('click', function(e) {
        var item = e.target.closest('.nav-item');
        if (item && item.id) syncSidebar(item.id.replace('nav-', ''));
    });

    /* Ticker — 2 saniye bekle */
    setTimeout(tickerBaslat, 2000);
});

/* Firebase ve app.js hazır olunca içerikleri yükle */
function _bekleVeYukle() {
    /* app.js yüklenmesini bekle (en fazla 3 saniye) */
    var deneme = 0;
    var interval = setInterval(function() {
        deneme++;
        if (typeof db !== 'undefined' && typeof akisDinle === 'function') {
            clearInterval(interval);
            _icerikYukle();
        } else if (deneme > 30) {
            clearInterval(interval);
            console.warn('[Emirler] Firebase veya app.js yüklenemedi');
        }
    }, 100);
}

function _icerikYukle() {
    /* loginPage'i tekrar gizle (app.js göstermiş olabilir) */
    var lp = document.getElementById('loginPage');
    if (lp) lp.style.cssText = 'display:none!important';

    try { if (typeof akisDinle === 'function') akisDinle(); } catch(e) {}
    try { if (typeof nostaljiDinle === 'function') nostaljiDinle(); } catch(e) {}
    try { if (typeof isletmeleriYukle === 'function') isletmeleriYukle(); } catch(e) {}
    try { if (typeof hakkimizdaYukle === 'function') hakkimizdaYukle(); } catch(e) {}
    try { if (typeof hikayeleriYukle === 'function') hikayeleriYukle(); } catch(e) {}
    try { if (typeof reklamYukle === 'function') reklamYukle(); } catch(e) {}
    try { if (typeof floatReklamYukle === 'function') floatReklamYukle(); } catch(e) {}
}

/* onayVer override — terms kabul edilince direkt aç */
window.onayVer = function() {
    if (!document.getElementById('termsCheck').checked) {
        alert('Şartları kabul etmelisiniz!');
        return;
    }
    localStorage.setItem('termsAccepted', 'true');
    var to = document.getElementById('termsOverlay');
    if (to) to.classList.add('hidden');
    _bekleVeYukle();
};

/* ─── 3. SIDEBAR ─── */
function sidebarToggle() {
    try {
        var nav = document.getElementById('sidebarNav');
        var ov  = document.getElementById('sidebarOverlay');
        if (!nav) return;
        if (nav.classList.contains('sidebar-open')) {
            sidebarKapat();
        } else {
            nav.classList.add('sidebar-open');
            if (ov) ov.classList.add('visible');
            document.body.style.overflow = 'hidden';
        }
    } catch(e) {}
}
function sidebarKapat() {
    try {
        var nav = document.getElementById('sidebarNav');
        var ov  = document.getElementById('sidebarOverlay');
        if (nav) nav.classList.remove('sidebar-open');
        if (ov)  ov.classList.remove('visible');
        document.body.style.overflow = '';
    } catch(e) {}
}
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') sidebarKapat(); });

function syncSidebar(t) {
    try {
        document.querySelectorAll('.sidebar-item').forEach(function(s) { s.classList.remove('active'); });
        var el = document.getElementById('snav-' + t);
        if (el) el.classList.add('active');
    } catch(e) {}
}

function sidebarTabGit(t) {
    sidebarKapat();
    setTimeout(function() {
        if (t === 'dernek') { showDernek(); return; }
        if (t === 'muhtar') { showMuhtar(); return; }
        if (t === 'chat')   { chatSayfasiAc(); return; }
        if (t === 'settings') { settingsSayfasiAc(); return; }
        try { tabDegistir(t); } catch(e) {}
        syncSidebar(t);
    }, 160);
}

/* ─── 4. GİRİŞ YAPILMAMIŞSA SIDEBAR AUTH BLOK ─── */
function sidebarAuthGuncelle(user) {
    var blok = document.getElementById('sidebarAuthBlok');
    if (!blok) return;
    if (user) {
        /* Giriş yapılmış — profil bilgisi göster */
        var ad = (window.userProfile && window.userProfile.name) || user.email || 'Kullanıcı';
        blok.innerHTML =
            '<div class="sidebar-profil">' +
            '  <div class="sidebar-profil-avatar">' + ad[0].toUpperCase() + '</div>' +
            '  <div class="sidebar-profil-bilgi">' +
            '    <div class="sidebar-profil-ad">' + ad + '</div>' +
            '    <button class="sidebar-cikis-btn" onclick="cikisYap()">Çıkış Yap</button>' +
            '  </div>' +
            '</div>';
        /* Sadece üyelere görünen menü itemlarını göster */
        document.querySelectorAll('.sidebar-sadece-uye').forEach(function(el) {
            el.style.display = 'flex';
        });
    } else {
        /* Giriş yapılmamış */
        blok.innerHTML = '<button class="sidebar-login-btn" onclick="loginModalAc()">🔑 Giriş Yap / Kayıt Ol</button>';
        document.querySelectorAll('.sidebar-sadece-uye').forEach(function(el) {
            el.style.display = 'none';
        });
    }
}

/* Firebase auth değişimini dinle — sidebar güncelle */
if (typeof firebase !== 'undefined') {
    firebase.auth().onAuthStateChanged(function(user) {
        sidebarAuthGuncelle(user || null);
        if (user) {
            /* Giriş yapıldı — ayarlar + sohbet açılsın */
            var nb = document.getElementById('navBar');
            if (nb && document.body.classList.contains('pwa-mode')) nb.style.display = 'flex';
        }
    });
}

/* ─── 5. LOGIN MODAL ─── */
function loginModalAc(mesaj) {
    var modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('hidden');
        if (mesaj) {
            var errEl = document.getElementById('authError');
            if (errEl) errEl.textContent = mesaj;
        }
    }
    sidebarKapat();
}
function loginModalKapat() {
    var modal = document.getElementById('loginModal');
    if (modal) modal.classList.add('hidden');
    var errEl = document.getElementById('authError');
    if (errEl) errEl.textContent = '';
    /* OTP sıfırla */
    otpTemizle();
}

/* app.js'in switchAuthTab'ını kullan */
function switchAuthTabSafe(tab) {
    try { switchAuthTab(tab); } catch(e) {
        var lf = document.getElementById('loginForm');
        var rf = document.getElementById('registerForm');
        if (lf) lf.classList.toggle('hidden', tab !== 'login');
        if (rf) rf.classList.toggle('hidden', tab !== 'register');
    }
}

/* ─── 6. AUTH GEREKLİ MODAL ─── */
function authGerekli(mesaj) {
    var modal = document.getElementById('authGerekliModal');
    var mesajEl = document.getElementById('authGerekliMesaj');
    if (mesajEl) mesajEl.textContent = mesaj || 'Bu özelliği kullanmak için giriş yapmanız gerekiyor.';
    if (modal) modal.classList.remove('hidden');
}
function authModalKapat() {
    var modal = document.getElementById('authGerekliModal');
    if (modal) modal.classList.add('hidden');
}
function authModalGirisGit() {
    authModalKapat();
    loginModalAc();
}

/* ─── 7. KORUNAN AKSIYONLAR ─── */
function profilAvatarTikla() {
    if (window.currentUser) {
        try { profilDuzenleAc(); } catch(e) {}
    } else {
        loginModalAc();
    }
}

function ilanFormGirisKontrol() {
    if (!window.currentUser) { authGerekli('İlan vermek için giriş yapmanız gerekiyor.'); return; }
    try { ilanFormToggle(); } catch(e) {}
}

function hikayeEkleGirisKontrol() {
    if (!window.currentUser) { authGerekli('Hikaye paylaşmak için giriş yapmanız gerekiyor.'); return; }
    try { hikayeEkleAc(); } catch(e) {}
}

function chatSayfasiAc() {
    if (!window.currentUser) {
        /* Sohbeti göster ama giriş uyarısını da göster */
        try { tabDegistir('chat'); } catch(e) {}
        syncSidebar('chat');
        var uyari = document.getElementById('chatLoginUyari');
        var chatBox = document.getElementById('chatBox');
        var inputBar = document.getElementById('chatInputBar');
        if (uyari) uyari.classList.remove('hidden');
        if (chatBox) chatBox.style.display = 'none';
        if (inputBar) inputBar.style.display = 'none';
        return;
    }
    try { tabDegistir('chat'); } catch(e) {}
    syncSidebar('chat');
    var uyari = document.getElementById('chatLoginUyari');
    var chatBox = document.getElementById('chatBox');
    var inputBar = document.getElementById('chatInputBar');
    if (uyari) uyari.classList.add('hidden');
    if (chatBox) chatBox.style.display = '';
    if (inputBar) inputBar.style.display = '';
    try { mesajlariDinle(); } catch(e) {}
}

function settingsSayfasiAc() {
    if (!window.currentUser) { authGerekli('Ayarlara girmek için giriş yapmanız gerekiyor.'); return; }
    try { tabDegistir('settings'); } catch(e) {}
    syncSidebar('settings');
}

/* app.js reaksiyon + yorumModalAc + yorumGonder + mesajGonder intercept */
window.addEventListener('load', function() {
    setTimeout(function() {

        if (typeof window.reaksiyon === 'function' && !window._rxWrapped) {
            var _rx = window.reaksiyon;
            window.reaksiyon = function(p, e, c) {
                if (!window.currentUser) { authGerekli('Beğeni için giriş yapmanız gerekiyor.'); return; }
                return _rx(p, e, c);
            };
            window._rxWrapped = true;
        }

        if (typeof window.yorumModalAc === 'function' && !window._ymWrapped) {
            var _ym = window.yorumModalAc;
            window.yorumModalAc = function(p, c) {
                if (!window.currentUser) { authGerekli('Yorum yapmak için giriş yapmanız gerekiyor.'); return; }
                return _ym(p, c);
            };
            window._ymWrapped = true;
        }

        if (typeof window.yorumGonder === 'function' && !window._ygWrapped) {
            var _yg = window.yorumGonder;
            window.yorumGonder = function() {
                if (!window.currentUser) { authGerekli('Yorum yapmak için giriş yapmanız gerekiyor.'); return; }
                return _yg();
            };
            window._ygWrapped = true;
        }

        if (typeof window.mesajGonder === 'function' && !window._mgWrapped) {
            var _mg = window.mesajGonder;
            window.mesajGonder = function() {
                if (!window.currentUser) { authGerekli('Mesaj göndermek için giriş yapmanız gerekiyor.'); return; }
                return _mg();
            };
            window._mgWrapped = true;
        }

    }, 1500);
});

/* ─── 8. KAYIT (Basit — SMS olmadan) ─── */
/*
   Firebase Phone Auth, Blaze planı gerektirir.
   Şimdilik e-posta + şifre + telefon (kayıt doğrulaması olmadan).
   İleride Blaze planına geçilince SMS aktif edilebilir.
*/
function kayitOlModal() {
    var name  = ((document.getElementById('regName')  || {}).value || '').trim();
    var phone = ((document.getElementById('regPhone') || {}).value || '').replace(/\s/g, '');
    var email = ((document.getElementById('regEmail') || {}).value || '').trim();
    var pass  = ((document.getElementById('regPass')  || {}).value || '');
    var errEl = document.getElementById('authError');

    if (!name || !phone || !email || !pass) { errEl.textContent = 'Tüm alanları doldurun!'; return; }
    if (pass.length < 6) { errEl.textContent = 'Şifre en az 6 karakter!'; return; }
    if (!/^(\+90|0)?[5][0-9]{9}$/.test(phone.replace(/[^0-9+]/g, ''))) {
        errEl.textContent = 'Geçerli telefon girin! (05XX XXX XX XX)'; return;
    }

    errEl.textContent = '⏳ Kontrol ediliyor...';

    /* Telefon daha önce kayıtlı mı? */
    db.collection('users').where('phone', '==', phone).get()
    .then(function(snap) {
        if (!snap.empty) { errEl.textContent = '❌ Bu telefon numarası zaten kayıtlı!'; return Promise.reject('telefon_kayitli'); }
        return firebase.auth().createUserWithEmailAndPassword(email, pass);
    })
    .then(function(res) {
        var ADMIN_VAL = typeof ADMIN_EMAIL !== 'undefined' ? ADMIN_EMAIL : 'koyemirler@gmail.com';
        return db.collection('users').doc(res.user.uid).set({
            name: name, phone: phone, email: email,
            rol: email === ADMIN_VAL ? 'admin' : 'user',
            online: true, blocked: false,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
    })
    .then(function() {
        errEl.textContent = '';
        loginModalKapat();
        /* Firebase auth state değişir, app.js gerisini halleder */
    })
    .catch(function(e) {
        if (e === 'telefon_kayitli') return;
        var msgs = {
            'auth/email-already-in-use': '❌ Bu e-posta zaten kayıtlı!',
            'auth/invalid-email':        '❌ Geçersiz e-posta!',
            'auth/weak-password':        '❌ Şifre çok zayıf!'
        };
        errEl.textContent = msgs[e.code] || '❌ ' + (e.message || e);
    });
}

/* app.js kayitOl'u override — Modal'daki butonu kullan */
window.kayitOl = function() { kayitOlModal(); };

/* ─── 9. KAYAN TICKER — DÜZELTME ─── */
/*
   Sorun: 3 kaynak için sayaç kullanılıyor ama async hatada
   sayaç yanlış artıyor. Şimdi her kaynak bağımsız render ediyor.
*/
var _tickerHava  = null;  /* {ikon, sicak, durum} */
var _tickerNamaz = null;  /* [{ikon, ad, saat, aktif}] */
var _tickerDuyurular = []; /* [{baslik}] */

function tickerBaslat() {
    _tickerHava = null;
    _tickerNamaz = null;
    _tickerDuyurular = [];
    tickerHavaYukle();
    tickerNamazYukle();
    tickerDuyurularYukle();
}

function tickerRenderle() {
    var el = document.getElementById('tickerInner');
    if (!el) return;

    var items = [];

    /* Hava */
    if (_tickerHava) {
        items.push('<span class="ticker-item hava-item">' +
            _tickerHava.ikon + ' ' + _tickerHava.sicak + '°C · ' +
            _tickerHava.durum + ' · 📍 Emirler Köyü</span>');
    }

    /* Namaz */
    if (_tickerNamaz && _tickerNamaz.length > 0) {
        items.push('<span class="ticker-item" style="color:rgba(255,255,255,0.4);padding:0 8px;">|</span>');
        items.push('<span class="ticker-item" style="color:#c4a0ff;font-weight:800;font-size:11px;">🕌 NAMAZ</span>');
        _tickerNamaz.forEach(function(vk) {
            items.push('<span class="ticker-item namaz-item' + (vk.aktif ? ' aktif-vakit' : '') + '">' +
                vk.ikon + ' ' + vk.ad + ': ' + vk.saat + '</span>');
        });
    }

    /* Duyurular */
    if (_tickerDuyurular.length > 0) {
        items.push('<span class="ticker-item" style="color:rgba(255,255,255,0.4);padding:0 8px;">|</span>');
        items.push('<span class="ticker-item" style="color:#ffd180;font-weight:800;font-size:11px;">📢 DUYURULAR</span>');
        _tickerDuyurular.forEach(function(d) {
            items.push('<span class="ticker-item duyuru-item">📌 ' + d.baslik + '</span>');
        });
    }

    if (items.length === 0) return;

    /* 2x tekrar → sonsuz döngü */
    var html = items.join('') + items.join('');
    el.innerHTML = html;

    /* Süreyi içerik sayısına göre ayarla — her item ~2 sn */
    var sureSn = Math.max(12, items.length * 2);
    el.style.animationDuration = sureSn + 's';
}

function tickerHavaYukle() {
    var KOY_LAT = 39.72, KOY_LNG = 33.52;
    var HAVA_IKON = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',51:'🌦️',61:'🌧️',71:'🌨️',80:'🌦️',95:'⛈️'};
    var HAVA_AD   = {0:'Açık',1:'Az Bulutlu',2:'Parçalı',3:'Kapalı',45:'Sis',51:'Çisenti',61:'Yağmurlu',71:'Karlı',80:'Sağanak',95:'Fırtına'};

    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + KOY_LAT +
          '&longitude=' + KOY_LNG +
          '&current=temperature_2m,weathercode&timezone=Europe%2FIstanbul')
    .then(function(r) { return r.json(); })
    .then(function(d) {
        var cur = d.current;
        _tickerHava = {
            ikon:  HAVA_IKON[cur.weathercode] || '🌡️',
            sicak: Math.round(cur.temperature_2m),
            durum: HAVA_AD[cur.weathercode] || ''
        };
        tickerRenderle();
    })
    .catch(function() {
        _tickerHava = { ikon: '🌡️', sicak: '--', durum: 'Veri yok' };
        tickerRenderle();
    });
}

function tickerNamazYukle() {
    var KOY_LAT = 39.72, KOY_LNG = 33.52;
    var b = new Date();
    fetch('https://api.aladhan.com/v1/timings/' +
          b.getDate() + '-' + (b.getMonth() + 1) + '-' + b.getFullYear() +
          '?latitude=' + KOY_LAT + '&longitude=' + KOY_LNG + '&method=13')
    .then(function(r) { return r.json(); })
    .then(function(d) {
        var v   = d.data.timings;
        var fmt = function(s) { return s.split(' ')[0]; };
        var vak = [
            {ikon:'🌅', ad:'İmsak',  saat: fmt(v.Fajr)   },
            {ikon:'☀️', ad:'Güneş',  saat: fmt(v.Sunrise) },
            {ikon:'🌞', ad:'Öğle',   saat: fmt(v.Dhuhr)   },
            {ikon:'🌇', ad:'İkindi', saat: fmt(v.Asr)     },
            {ikon:'🌆', ad:'Akşam',  saat: fmt(v.Maghrib) },
            {ikon:'🌙', ad:'Yatsı',  saat: fmt(v.Isha)    }
        ];
        var now = ('0' + b.getHours()).slice(-2) + ':' + ('0' + b.getMinutes()).slice(-2);
        var next = 0;
        for (var i = 0; i < vak.length; i++) {
            if (vak[i].saat > now) { next = i; break; }
        }
        _tickerNamaz = vak.map(function(vk, i) {
            return { ikon: vk.ikon, ad: vk.ad, saat: vk.saat, aktif: i === next };
        });
        tickerRenderle();
    })
    .catch(function() {
        _tickerNamaz = [];
        tickerRenderle();
    });
}

function tickerDuyurularYukle() {
    if (typeof db === 'undefined') { tickerRenderle(); return; }
    db.collection('announcements').limit(8).get()
    .then(function(snap) {
        var docs = [];
        snap.forEach(function(doc) { docs.push(doc.data()); });
        docs.sort(function(a, b) {
            var ta = a.time && a.time.toDate ? a.time.toDate().getTime() : 0;
            var tb = b.time && b.time.toDate ? b.time.toDate().getTime() : 0;
            return tb - ta;
        });
        _tickerDuyurular = docs.slice(0, 5)
            .filter(function(d) { return d.title || d.text; })
            .map(function(d) {
                var b = (d.title || d.text || '');
                return { baslik: b.length > 60 ? b.substring(0, 60) + '…' : b };
            });
        tickerRenderle();
    })
    .catch(function() {
        _tickerDuyurular = [];
        tickerRenderle();
    });
}

/* ─── 10. DERNEK / MUHTAR GÖSTERİM ─── */
function showDernek() {
    try {
        document.querySelectorAll('.view').forEach(function(v) { v.classList.add('hidden'); });
        var v = document.getElementById('view-dernek'); if (v) v.classList.remove('hidden');
        document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
        var n = document.getElementById('nav-dernek'); if (n) n.classList.add('active');
        syncSidebar('dernek');
        window.scrollTo(0, 0);
        dernekDinle();
    } catch(e) {}
}

function showMuhtar() {
    try {
        document.querySelectorAll('.view').forEach(function(v) { v.classList.add('hidden'); });
        var v = document.getElementById('view-muhtar'); if (v) v.classList.remove('hidden');
        document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
        var n = document.getElementById('nav-muhtar'); if (n) n.classList.add('active');
        syncSidebar('muhtar');
        window.scrollTo(0, 0);
        muhtarYukle();
    } catch(e) {}
}

/* ─── 11. DERNEK ÇALIŞMALARI ─── */
var _dernekFiltre = 'hepsi';

function dernekFormToggle() {
    var d = document.getElementById('dernekFormDiv'); if (d) d.classList.toggle('hidden');
}
function dernekFiltre(tip, el) {
    _dernekFiltre = tip;
    document.querySelectorAll('#view-dernek .ilan-filtre-btn').forEach(function(b) { b.classList.remove('active'); });
    if (el) el.classList.add('active');
    dernekDinle();
}
function dernekDinle() {
    var list = document.getElementById('dernekList');
    if (!list || typeof db === 'undefined') return;
    list.innerHTML = '<div class="loading-spinner">⏳ Yükleniyor...</div>';
    try { if (typeof ayricaliklimi === 'function' && ayricaliklimi()) { var b = document.getElementById('dernekEkleBtn'); if (b) b.style.display = ''; } } catch(e) {}

    db.collection('dernek').get()
    .then(function(snap) {
        var docs = [];
        snap.forEach(function(doc) { docs.push(Object.assign({id: doc.id}, doc.data())); });
        docs.sort(function(a, b) {
            var ta = a.time && a.time.toDate ? a.time.toDate().getTime() : 0;
            var tb = b.time && b.time.toDate ? b.time.toDate().getTime() : 0;
            return tb - ta;
        });
        if (_dernekFiltre !== 'hepsi') docs = docs.filter(function(d) { return d.tip === _dernekFiltre; });
        if (docs.length === 0) { list.innerHTML = '<div class="empty-state"><div class="empty-icon">🤝</div><p>Bu kategoride kayıt yok</p></div>'; return; }

        var TM = {toplanti:'📅 Toplantı', karar:'⚖️ Karar', proje:'🏗️ Proje', etkinlik:'🎉 Etkinlik', diger:'📌 Diğer'};
        var TR = {toplanti:'tip-toplanti', karar:'tip-karar', proje:'tip-proje', etkinlik:'tip-etkinlik', diger:''};
        var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
        var isAdm = typeof ayricaliklimi === 'function' && ayricaliklimi();

        list.innerHTML = '';
        docs.forEach(function(item) {
            var d = document.createElement('div');
            d.className = 'dernek-kart dernek-tip-' + (item.tip || 'diger');
            d.innerHTML =
                '<div class="dernek-kart-ust"><span class="dernek-tip-badge ' + (TR[item.tip] || '') + '">' + (TM[item.tip] || '📌 Diğer') + '</span>' +
                '<span class="dernek-baslik">' + esc(item.baslik || '') + '</span></div>' +
                (item.tarih   ? '<div class="dernek-tarih">📅 ' + esc(item.tarih) + '</div>' : '') +
                (item.aciklama? '<div class="dernek-aciklama">' + esc(item.aciklama) + '</div>' : '') +
                (item.imageUrl? '<img src="' + item.imageUrl + '" style="width:100%;max-height:220px;object-fit:cover;cursor:pointer;" onclick="resimTamEkran(\'' + item.imageUrl + '\')" loading="lazy">' : '') +
                (isAdm ? '<div class="dernek-footer"><button class="btn btn-danger btn-sm" onclick="dernekSil(\'' + item.id + '\')">🗑️ Sil</button></div>' : '');
            list.appendChild(d);
        });
    })
    .catch(function(e) {
        list.innerHTML = '<div style="text-align:center;padding:24px;color:#888;">⚠️ Yüklenemedi: ' + e.message + '</div>';
    });
}

function dernekEkle() {
    if (typeof ayricaliklimi !== 'function' || !ayricaliklimi()) return alert('Yetkiniz yok!');
    var baslik = ((document.getElementById('dernekBaslik') || {}).value || '').trim();
    if (!baslik) return alert('Başlık zorunludur!');
    var btn = document.getElementById('dernekGonderBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
    var file = document.getElementById('dernekDosya') && document.getElementById('dernekDosya').files[0];
    function kaydet(imgUrl) {
        db.collection('dernek').add({
            tip:      (document.getElementById('dernekTip') || {}).value || 'diger',
            baslik:   baslik,
            tarih:    ((document.getElementById('dernekTarih') || {}).value || ''),
            aciklama: (((document.getElementById('dernekAciklama') || {}).value || '').trim()),
            imageUrl: imgUrl || '',
            ekleyen:  (window.userProfile && window.userProfile.name) || '',
            time:     firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
            ['dernekBaslik','dernekAciklama','dernekTarih','dernekDosya'].forEach(function(id) { var e = document.getElementById(id); if (e) e.value = ''; });
            var pv = document.getElementById('dernekOnizle'); if (pv) pv.innerHTML = '';
            var fm = document.getElementById('dernekFormDiv'); if (fm) fm.classList.add('hidden');
            dernekDinle(); alert('✅ Başarıyla eklendi!');
        }).catch(function(e) { alert('Hata: ' + e.message); })
        .finally(function() { if (btn) { btn.disabled = false; btn.textContent = '✅ Yayınla'; } });
    }
    if (file && typeof cloudinaryYukle === 'function') { cloudinaryYukle(file).then(function(r) { kaydet(r.url); }).catch(function() { kaydet(''); }); }
    else { kaydet(''); }
}

function dernekSil(id) {
    if (typeof ayricaliklimi !== 'function' || !ayricaliklimi()) return;
    if (!confirm('Bu kaydı silmek istiyor musunuz?')) return;
    db.collection('dernek').doc(id).delete().then(function() { dernekDinle(); }).catch(function() { alert('Silinemedi!'); });
}

/* ─── 12. MUHTAR ─── */
var _muhtarVerisi = null;
function muhtarEditToggle() {
    var p = document.getElementById('muhtarEditPanel'); if (!p) return;
    var g = p.classList.contains('hidden'); p.classList.toggle('hidden');
    if (g && _muhtarVerisi) {
        var v = _muhtarVerisi;
        function sv(id, val) { var e = document.getElementById(id); if (e) e.value = val || ''; }
        sv('muhtarAd', v.ad); sv('muhtarUnvan', v.unvan); sv('muhtarBio', v.bio);
        sv('muhtarTel', v.tel); sv('muhtarWa', v.whatsapp); sv('muhtarEmail', v.email);
    }
}
function muhtarYukle() {
    if (typeof db === 'undefined') return;
    var pEl = document.getElementById('muhtarProfilKart');
    var hEl = document.getElementById('muhtarHizmetlerList');
    var iEl = document.getElementById('muhtarIletisimBolum');
    var ibEl = document.getElementById('muhtarIletisimBaslik');
    try { if (typeof ayricaliklimi === 'function' && ayricaliklimi()) { var mb = document.getElementById('muhtarDuzenleBtn'); if (mb) mb.style.display = ''; } } catch(e) {}
    var esc = typeof escapeHtml === 'function' ? escapeHtml : function(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
    var isAdm = typeof ayricaliklimi === 'function' && ayricaliklimi();

    db.collection('settings').doc('muhtar').get()
    .then(function(snap) {
        if (snap.exists) {
            _muhtarVerisi = snap.data(); var v = _muhtarVerisi;
            if (pEl) pEl.innerHTML =
                (v.fotoUrl ? '<img src="' + v.fotoUrl + '" class="muhtar-profil-foto">' : '<div class="muhtar-profil-foto-placeholder">👤</div>') +
                '<div class="muhtar-profil-bilgi"><div class="muhtar-ad">' + esc(v.ad || 'Emirler Köyü Muhtarı') + '</div>' +
                '<div class="muhtar-unvan">' + esc(v.unvan || 'Köy Muhtarı') + '</div>' +
                (v.bio ? '<div class="muhtar-bio">' + esc(v.bio) + '</div>' : '') + '</div>';
            var hz = v.hizmetler || [];
            if (hEl) hEl.innerHTML = hz.length === 0 ? '<div style="color:#aaa;font-size:14px;padding:10px;text-align:center;">Henüz hizmet bilgisi girilmemiş</div>' :
                hz.map(function(h, i) {
                    return '<div class="muhtar-hizmet-kart" style="flex-direction:column;">' +
                        '<div style="display:flex;gap:12px;align-items:flex-start;">' +
                        '<div class="muhtar-hizmet-yil">' + esc(String(h.yil || '—')) + '</div>' +
                        '<div class="muhtar-hizmet-icerik"><div class="muhtar-hizmet-baslik">' + esc(h.baslik || '') + '</div>' +
                        (h.aciklama ? '<div class="muhtar-hizmet-aciklama">' + esc(h.aciklama) + '</div>' : '') + '</div>' +
                        (isAdm ? '<button class="muhtar-hizmet-sil" onclick="muhtarHizmetSil(' + i + ')">🗑️</button>' : '') + '</div>' +
                        (h.imageUrl ? '<img src="' + h.imageUrl + '" style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;margin-top:8px;cursor:pointer;" onclick="resimTamEkran(\'' + h.imageUrl + '\')" loading="lazy">' : '') +
                        '</div>';
                }).join('');
            var ilt = [];
            if (v.tel)      ilt.push('<a href="tel:' + v.tel + '" class="contact-btn phone-btn"><span class="contact-icon">📞</span><span>Telefon</span></a>');
            if (v.whatsapp) ilt.push('<a href="https://wa.me/' + v.whatsapp.replace(/[^0-9]/g, '') + '" target="_blank" class="contact-btn whatsapp-btn"><span class="contact-icon">💬</span><span>WhatsApp</span></a>');
            if (v.email)    ilt.push('<a href="mailto:' + v.email + '" class="contact-btn email-btn"><span class="contact-icon">✉️</span><span>E-Posta</span></a>');
            if (ilt.length > 0) { if (ibEl) ibEl.style.display = ''; if (iEl) iEl.innerHTML = '<div class="contact-buttons">' + ilt.join('') + '</div>'; }
            else { if (ibEl) ibEl.style.display = 'none'; }
        } else {
            _muhtarVerisi = {};
            if (pEl) pEl.innerHTML = '<div class="muhtar-profil-foto-placeholder">👤</div><div class="muhtar-profil-bilgi"><div class="muhtar-ad">Emirler Köyü Muhtarı</div><div class="muhtar-unvan">Köy Muhtarı</div><div class="muhtar-bio" style="color:#aaa;">Muhtar bilgileri henüz eklenmemiştir.</div></div>';
            if (hEl) hEl.innerHTML = '<div style="color:#aaa;font-size:14px;padding:10px;text-align:center;">Henüz hizmet bilgisi girilmemiş</div>';
            if (ibEl) ibEl.style.display = 'none';
        }
    }).catch(function() { if (pEl) pEl.innerHTML = '<div style="padding:24px;text-align:center;color:#888;">⚠️ Yüklenemedi</div>'; });
}
function muhtarKaydet() {
    if (typeof ayricaliklimi !== 'function' || !ayricaliklimi()) return alert('Yetkiniz yok!');
    var btn = document.getElementById('muhtarKaydetBtn'); if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
    db.collection('settings').doc('muhtar').get().then(function(snap) {
        var eski = snap.exists ? snap.data() : {}; var fUrl = eski.fotoUrl || '';
        var ff = document.getElementById('muhtarFoto') && document.getElementById('muhtarFoto').files[0];
        function kaydet(fu) {
            var veri = Object.assign({}, eski, {
                ad: ((document.getElementById('muhtarAd') || {}).value || '').trim(),
                unvan: ((document.getElementById('muhtarUnvan') || {}).value || 'Köy Muhtarı').trim(),
                bio: ((document.getElementById('muhtarBio') || {}).value || '').trim(),
                tel: ((document.getElementById('muhtarTel') || {}).value || '').trim(),
                whatsapp: ((document.getElementById('muhtarWa') || {}).value || '').trim(),
                email: ((document.getElementById('muhtarEmail') || {}).value || '').trim(),
                fotoUrl: fu
            });
            db.collection('settings').doc('muhtar').set(veri)
            .then(function() { _muhtarVerisi = veri; var p = document.getElementById('muhtarEditPanel'); if (p) p.classList.add('hidden'); muhtarYukle(); alert('✅ Kaydedildi!'); })
            .catch(function(e) { alert('Hata: ' + e.message); })
            .finally(function() { if (btn) { btn.disabled = false; btn.textContent = '💾 Profili Kaydet'; } });
        }
        if (ff && typeof cloudinaryYukle === 'function') { cloudinaryYukle(ff).then(function(r) { kaydet(r.url); }).catch(function() { kaydet(fUrl); }); } else { kaydet(fUrl); }
    }).catch(function(e) { alert('Hata: ' + e.message); if (btn) { btn.disabled = false; btn.textContent = '💾 Profili Kaydet'; } });
}
function muhtarHizmetEkle() {
    if (typeof ayricaliklimi !== 'function' || !ayricaliklimi()) return alert('Yetkiniz yok!');
    var b = ((document.getElementById('muhtarHizmetBaslik') || {}).value || '').trim(); if (!b) return alert('Başlık zorunludur!');
    var file = document.getElementById('muhtarHizmetFoto') && document.getElementById('muhtarHizmetFoto').files[0];
    function kaydet(imgUrl) {
        db.collection('settings').doc('muhtar').get().then(function(snap) {
            var eski = snap.exists ? snap.data() : {};
            var hz = Array.isArray(eski.hizmetler) ? [].concat(eski.hizmetler) : [];
            hz.unshift({ baslik: b, aciklama: ((document.getElementById('muhtarHizmetAciklama') || {}).value || '').trim(), yil: ((document.getElementById('muhtarHizmetYil') || {}).value || String(new Date().getFullYear())), imageUrl: imgUrl || '' });
            return db.collection('settings').doc('muhtar').set(Object.assign({}, eski, {hizmetler: hz}));
        }).then(function() {
            ['muhtarHizmetBaslik','muhtarHizmetAciklama','muhtarHizmetYil','muhtarHizmetFoto'].forEach(function(id) { var e = document.getElementById(id); if (e) e.value = ''; });
            var pv = document.getElementById('muhtarHizmetFotoOnizle'); if (pv) pv.innerHTML = '';
            muhtarYukle(); alert('✅ Hizmet eklendi!');
        }).catch(function(e) { alert('Hata: ' + e.message); });
    }
    if (file && typeof cloudinaryYukle === 'function') { cloudinaryYukle(file).then(function(r) { kaydet(r.url); }).catch(function() { kaydet(''); }); } else { kaydet(''); }
}
function muhtarHizmetSil(idx) {
    if (typeof ayricaliklimi !== 'function' || !ayricaliklimi()) return;
    if (!confirm('Silmek istiyor musunuz?')) return;
    db.collection('settings').doc('muhtar').get().then(function(snap) {
        if (!snap.exists) return; var v = snap.data();
        var hz = Array.isArray(v.hizmetler) ? [].concat(v.hizmetler) : []; hz.splice(idx, 1);
        return db.collection('settings').doc('muhtar').set(Object.assign({}, v, {hizmetler: hz}));
    }).then(function() { muhtarYukle(); }).catch(function(e) { alert('Silinemedi: ' + e.message); });
}

console.log('[Emirler] app_additions.js v4.6 yüklendi ✓');
