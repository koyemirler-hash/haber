/* ═══════════════════════════════════════════════════════════
   app_additions.js — Emirler Köyü v4.4 (EN GÜVENLİ)
   ✓ tabDegistir'e DOKUNMAZ
   ✓ Firebase auth'a DOKUNMAZ
   ✓ Dernek/Muhtar kendi show fonksiyonlarına sahip
   ✓ Sidebar event delegation ile senkronize
═══════════════════════════════════════════════════════════ */

/* 1. PWA / BROWSER MODU TESPİTİ — hemen çalışır */
(function() {
    try {
        var isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    window.navigator.standalone === true ||
                    document.referrer.startsWith('android-app://');
        document.body.classList.add(isPWA ? 'pwa-mode' : 'browser-mode');
    } catch(e) {
        document.body.classList.add('browser-mode');
    }
})();

/* 2. SIDEBAR AÇ/KAPAT */
function sidebarToggle() {
    try {
        var nav = document.getElementById('sidebarNav');
        var ov  = document.getElementById('sidebarOverlay');
        if (!nav) return;
        var isOpen = nav.classList.contains('sidebar-open');
        if (isOpen) {
            nav.classList.remove('sidebar-open');
            if (ov) ov.classList.remove('visible');
            document.body.style.overflow = '';
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

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') sidebarKapat();
});

/* 3. SIDEBAR SENKRON — tabDegistir yerine navBar click dinler */
document.addEventListener('DOMContentLoaded', function() {

    /* navBar'a tıklanınca sidebar aktif öğesini güncelle */
    var navBar = document.getElementById('navBar');
    if (navBar) {
        navBar.addEventListener('click', function(e) {
            var item = e.target.closest('.nav-item');
            if (!item || !item.id) return;
            var t = item.id.replace('nav-', '');
            syncSidebar(t);
        });
    }

    /* Browser modunda feed açılınca widget yükle */
    if (document.body.classList.contains('browser-mode')) {
        /* auth.onAuthStateChanged'ı beklemek için küçük gecikme */
        setTimeout(function() {
            feedHavaMiniYukle();
            feedNamazMiniYukle();
        }, 1500);
    }
});

function syncSidebar(t) {
    try {
        document.querySelectorAll('.sidebar-item').forEach(function(s) {
            s.classList.remove('active');
        });
        var el = document.getElementById('snav-' + t);
        if (el) el.classList.add('active');
    } catch(e) {}
}

/* Sidebar'dan sekmeye git */
function sidebarTabGit(t) {
    sidebarKapat();
    setTimeout(function() {
        if (t === 'dernek') { showDernek(); return; }
        if (t === 'muhtar') { showMuhtar(); return; }
        try { tabDegistir(t); } catch(e) {}
        syncSidebar(t);
    }, 180);
}

/* 4. DERNEK VE MUHTAR GÖSTERİM — tabDegistir'e bağlı değil */
function showDernek() {
    try {
        /* Tüm view'ları gizle (tabDegistir ile aynı mantık) */
        document.querySelectorAll('.view').forEach(function(v) {
            v.classList.add('hidden');
        });
        var view = document.getElementById('view-dernek');
        if (view) view.classList.remove('hidden');

        /* Nav güncelle */
        document.querySelectorAll('.nav-item').forEach(function(n) {
            n.classList.remove('active');
        });
        var navEl = document.getElementById('nav-dernek');
        if (navEl) navEl.classList.add('active');

        syncSidebar('dernek');
        window.scrollTo(0, 0);

        /* Floating reklam */
        var fr = document.getElementById('floatingReklam');
        if (fr) fr.style.visibility = '';

        dernekDinle();
    } catch(e) { console.warn('[Emirler] showDernek hata:', e); }
}

function showMuhtar() {
    try {
        document.querySelectorAll('.view').forEach(function(v) {
            v.classList.add('hidden');
        });
        var view = document.getElementById('view-muhtar');
        if (view) view.classList.remove('hidden');

        document.querySelectorAll('.nav-item').forEach(function(n) {
            n.classList.remove('active');
        });
        var navEl = document.getElementById('nav-muhtar');
        if (navEl) navEl.classList.add('active');

        syncSidebar('muhtar');
        window.scrollTo(0, 0);

        var fr = document.getElementById('floatingReklam');
        if (fr) fr.style.visibility = '';

        muhtarYukle();
    } catch(e) { console.warn('[Emirler] showMuhtar hata:', e); }
}

/* 5. FEED MİNİ HAVA WIDGET */
var _feedHavaYuklendi = false;
function feedHavaMiniYukle() {
    var el = document.getElementById('feedHavaMini');
    if (!el || _feedHavaYuklendi) return;
    var KOY_LAT = 39.72, KOY_LNG = 33.52;
    var HAVA = {
        0:'☀️ Açık', 1:'🌤️ Az Bulutlu', 2:'⛅ Parçalı', 3:'☁️ Kapalı',
        45:'🌫️ Sis', 51:'🌦️ Çisenti', 61:'🌧️ Yağmurlu', 63:'🌧️ Yağmurlu',
        71:'🌨️ Karlı', 80:'🌦️ Sağanak', 95:'⛈️ Fırtına'
    };
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + KOY_LAT + '&longitude=' + KOY_LNG +
          '&current=temperature_2m,relative_humidity_2m,weathercode&timezone=Europe%2FIstanbul')
    .then(function(r) { return r.json(); })
    .then(function(d) {
        var cur = d.current;
        var durum = HAVA[cur.weathercode] || '🌡️';
        var p = durum.split(' ');
        el.innerHTML =
            '<div class="feed-hava-ana">' +
            '<span class="feed-hava-icon">' + p[0] + '</span>' +
            '<div><div class="feed-hava-temp">' + Math.round(cur.temperature_2m) + '°C</div>' +
            '<div class="feed-hava-durum">' + p.slice(1).join(' ') + ' · %' + cur.relative_humidity_2m + '</div></div>' +
            '</div><div class="feed-hava-yer">📍 Emirler Köyü</div>';
        _feedHavaYuklendi = true;
    })
    .catch(function() {
        el.innerHTML = '<span style="font-size:12px;color:#888;">⚠️ Hava verisi alınamadı</span>';
    });
}

/* 6. FEED MİNİ NAMAZ WIDGET */
var _feedNamazYuklendi = false;
function feedNamazMiniYukle() {
    var el = document.getElementById('feedNamazMini');
    if (!el || _feedNamazYuklendi) return;
    var KOY_LAT = 39.72, KOY_LNG = 33.52;
    var b = new Date();
    fetch('https://api.aladhan.com/v1/timings/' + b.getDate() + '-' + (b.getMonth()+1) + '-' + b.getFullYear() +
          '?latitude=' + KOY_LAT + '&longitude=' + KOY_LNG + '&method=13')
    .then(function(r) { return r.json(); })
    .then(function(d) {
        var v = d.data.timings;
        var fmt = function(s) { return s.split(' ')[0]; };
        var vak = [
            {ikon:'🌅',ad:'İmsak', saat:fmt(v.Fajr)},
            {ikon:'☀️',ad:'Güneş', saat:fmt(v.Sunrise)},
            {ikon:'🌞',ad:'Öğle',  saat:fmt(v.Dhuhr)},
            {ikon:'🌇',ad:'İkindi',saat:fmt(v.Asr)},
            {ikon:'🌆',ad:'Akşam', saat:fmt(v.Maghrib)},
            {ikon:'🌙',ad:'Yatsı', saat:fmt(v.Isha)}
        ];
        var now = ('0'+b.getHours()).slice(-2) + ':' + ('0'+b.getMinutes()).slice(-2);
        var next = 0;
        for (var i=0; i<vak.length; i++) { if (vak[i].saat > now) { next = i; break; } }
        var html = '<div class="feed-namaz-baslik">🕌 Namaz Vakitleri</div>';
        vak.forEach(function(vk, i) {
            html += '<div class="feed-namaz-satir' + (i===next?' feed-namaz-aktif':'') + '">' +
                    '<span>' + vk.ikon + ' ' + vk.ad + '</span>' +
                    '<span class="feed-namaz-vakt">' + vk.saat + '</span></div>';
        });
        el.innerHTML = html;
        _feedNamazYuklendi = true;
    })
    .catch(function() {
        el.innerHTML = '<span style="font-size:12px;color:#888;">⚠️ Vakit alınamadı</span>';
    });
}

/* 7. DERNEK ÇALIŞMALARI */
var _dernekFiltre = 'hepsi';

function dernekFormToggle() {
    var d = document.getElementById('dernekFormDiv');
    if (d) d.classList.toggle('hidden');
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

    try {
        if (typeof ayricaliklimi === 'function' && ayricaliklimi()) {
            var btn = document.getElementById('dernekEkleBtn');
            if (btn) btn.style.display = '';
        }
    } catch(e) {}

    db.collection('dernek').orderBy('time', 'desc').get()
    .then(function(snap) {
        var docs = [];
        snap.forEach(function(doc) { docs.push(Object.assign({id:doc.id}, doc.data())); });
        if (_dernekFiltre !== 'hepsi') {
            docs = docs.filter(function(d) { return d.tip === _dernekFiltre; });
        }
        if (docs.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-icon">🤝</div><p>Bu kategoride kayıt yok</p></div>';
            return;
        }
        var TM = {toplanti:'📅 Toplantı',karar:'⚖️ Karar',proje:'🏗️ Proje',etkinlik:'🎉 Etkinlik',diger:'📌 Diğer'};
        var TR = {toplanti:'tip-toplanti',karar:'tip-karar',proje:'tip-proje',etkinlik:'tip-etkinlik',diger:''};
        var esc = typeof escapeHtml==='function' ? escapeHtml : function(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
        var isAdm = typeof ayricaliklimi==='function' && ayricaliklimi();
        list.innerHTML = '';
        docs.forEach(function(item) {
            var d = document.createElement('div');
            d.className = 'dernek-kart dernek-tip-' + (item.tip||'diger');
            d.innerHTML =
                '<div class="dernek-kart-ust">' +
                '<span class="dernek-tip-badge '+(TR[item.tip]||'')+'">'+(TM[item.tip]||'📌 Diğer')+'</span>' +
                '<span class="dernek-baslik">'+esc(item.baslik||'')+'</span></div>' +
                (item.tarih?'<div class="dernek-tarih">📅 '+esc(item.tarih)+'</div>':'') +
                (item.aciklama?'<div class="dernek-aciklama">'+esc(item.aciklama)+'</div>':'') +
                (item.imageUrl?'<img src="'+item.imageUrl+'" style="width:100%;max-height:220px;object-fit:cover;cursor:pointer;" onclick="resimTamEkran(\''+item.imageUrl+'\')" loading="lazy">':'') +
                (isAdm?'<div class="dernek-footer"><button class="btn btn-danger btn-sm" onclick="dernekSil(\''+item.id+'\')">🗑️ Sil</button></div>':'');
            list.appendChild(d);
        });
    })
    .catch(function(e) {
        list.innerHTML = '<div style="text-align:center;padding:24px;color:#888;">⚠️ Yüklenemedi<br><small>'+e.message+'</small></div>';
    });
}

function dernekEkle() {
    if (typeof ayricaliklimi!=='function'||!ayricaliklimi()) return alert('Yetkiniz yok!');
    var baslik = ((document.getElementById('dernekBaslik')||{}).value||'').trim();
    if (!baslik) return alert('Başlık zorunludur!');
    var btn = document.getElementById('dernekGonderBtn');
    if (btn) { btn.disabled=true; btn.textContent='⏳'; }
    var file = document.getElementById('dernekDosya') && document.getElementById('dernekDosya').files[0];
    function kaydet(imgUrl) {
        db.collection('dernek').add({
            tip:      (document.getElementById('dernekTip')||{}).value||'diger',
            baslik:   baslik,
            tarih:    ((document.getElementById('dernekTarih')||{}).value||''),
            aciklama: (((document.getElementById('dernekAciklama')||{}).value||'').trim()),
            imageUrl: imgUrl||'',
            ekleyen:  (window.userProfile&&window.userProfile.name)||'',
            time:     firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
            ['dernekBaslik','dernekAciklama','dernekTarih','dernekDosya'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
            var pv=document.getElementById('dernekOnizle'); if(pv)pv.innerHTML='';
            var fm=document.getElementById('dernekFormDiv'); if(fm)fm.classList.add('hidden');
            dernekDinle(); alert('✅ Başarıyla eklendi!');
        }).catch(function(e){alert('Hata: '+e.message);})
        .finally(function(){if(btn){btn.disabled=false;btn.textContent='✅ Yayınla';}});
    }
    if (file && typeof cloudinaryYukle==='function') {
        cloudinaryYukle(file).then(function(r){kaydet(r.url);}).catch(function(){kaydet('');});
    } else { kaydet(''); }
}

function dernekSil(id) {
    if (typeof ayricaliklimi!=='function'||!ayricaliklimi()) return;
    if (!confirm('Bu kaydı silmek istiyor musunuz?')) return;
    db.collection('dernek').doc(id).delete().then(function(){dernekDinle();}).catch(function(){alert('Silinemedi!');});
}

/* 8. MUHTAR HAKKINDA */
var _muhtarVerisi = null;

function muhtarEditToggle() {
    var panel = document.getElementById('muhtarEditPanel');
    if (!panel) return;
    var gizli = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    if (gizli && _muhtarVerisi) {
        var v = _muhtarVerisi;
        function sv(id,val){var e=document.getElementById(id);if(e)e.value=val||'';}
        sv('muhtarAd',v.ad); sv('muhtarUnvan',v.unvan); sv('muhtarBio',v.bio);
        sv('muhtarTel',v.tel); sv('muhtarWa',v.whatsapp); sv('muhtarEmail',v.email);
    }
}

function muhtarYukle() {
    if (typeof db==='undefined') return;
    var pEl=document.getElementById('muhtarProfilKart');
    var hEl=document.getElementById('muhtarHizmetlerList');
    var iEl=document.getElementById('muhtarIletisimBolum');
    var ibEl=document.getElementById('muhtarIletisimBaslik');
    try { if(typeof ayricaliklimi==='function'&&ayricaliklimi()){var mb=document.getElementById('muhtarDuzenleBtn');if(mb)mb.style.display='';} }catch(e){}
    var esc=typeof escapeHtml==='function'?escapeHtml:function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
    var isAdm=typeof ayricaliklimi==='function'&&ayricaliklimi();
    db.collection('settings').doc('muhtar').get()
    .then(function(snap) {
        if (snap.exists) {
            _muhtarVerisi=snap.data(); var v=_muhtarVerisi;
            if(pEl) pEl.innerHTML=(v.fotoUrl?'<img src="'+v.fotoUrl+'" class="muhtar-profil-foto">':'<div class="muhtar-profil-foto-placeholder">👤</div>')+
                '<div class="muhtar-profil-bilgi"><div class="muhtar-ad">'+esc(v.ad||'Emirler Köyü Muhtarı')+'</div>'+
                '<div class="muhtar-unvan">'+esc(v.unvan||'Köy Muhtarı')+'</div>'+
                (v.bio?'<div class="muhtar-bio">'+esc(v.bio)+'</div>':'')+'</div>';
            var hz=v.hizmetler||[];
            if(hEl) hEl.innerHTML=hz.length===0?'<div style="color:#aaa;font-size:14px;padding:10px;text-align:center;">Henüz hizmet bilgisi girilmemiş</div>':
                hz.map(function(h,i){return '<div class="muhtar-hizmet-kart"><div class="muhtar-hizmet-yil">'+esc(String(h.yil||'—'))+'</div>'+
                    '<div class="muhtar-hizmet-icerik"><div class="muhtar-hizmet-baslik">'+esc(h.baslik||'')+'</div>'+
                    (h.aciklama?'<div class="muhtar-hizmet-aciklama">'+esc(h.aciklama)+'</div>':'')+
                    '</div>'+(isAdm?'<button class="muhtar-hizmet-sil" onclick="muhtarHizmetSil('+i+')">🗑️</button>':'')+'</div>';}).join('');
            var ilt=[];
            if(v.tel)      ilt.push('<a href="tel:'+v.tel+'" class="contact-btn phone-btn"><span class="contact-icon">📞</span><span>Telefon</span></a>');
            if(v.whatsapp) ilt.push('<a href="https://wa.me/'+v.whatsapp.replace(/[^0-9]/g,'')+'" target="_blank" class="contact-btn whatsapp-btn"><span class="contact-icon">💬</span><span>WhatsApp</span></a>');
            if(v.email)    ilt.push('<a href="mailto:'+v.email+'" class="contact-btn email-btn"><span class="contact-icon">✉️</span><span>E-Posta</span></a>');
            if(ilt.length>0){if(ibEl)ibEl.style.display='';if(iEl)iEl.innerHTML='<div class="contact-buttons">'+ilt.join('')+'</div>';}
            else{if(ibEl)ibEl.style.display='none';}
        } else {
            _muhtarVerisi={};
            if(pEl)pEl.innerHTML='<div class="muhtar-profil-foto-placeholder">👤</div><div class="muhtar-profil-bilgi"><div class="muhtar-ad">Emirler Köyü Muhtarı</div><div class="muhtar-unvan">Köy Muhtarı</div><div class="muhtar-bio" style="color:#aaa;">Muhtar bilgileri henüz eklenmemiştir.</div></div>';
            if(hEl)hEl.innerHTML='<div style="color:#aaa;font-size:14px;padding:10px;text-align:center;">Henüz hizmet bilgisi girilmemiş</div>';
            if(ibEl)ibEl.style.display='none';
        }
    })
    .catch(function(){if(pEl)pEl.innerHTML='<div style="padding:24px;text-align:center;color:#888;">⚠️ Yüklenemedi</div>';});
}

function muhtarKaydet() {
    if(typeof ayricaliklimi!=='function'||!ayricaliklimi()) return alert('Yetkiniz yok!');
    var btn=document.getElementById('muhtarKaydetBtn');
    if(btn){btn.disabled=true;btn.textContent='⏳';}
    db.collection('settings').doc('muhtar').get().then(function(snap){
        var eski=snap.exists?snap.data():{};
        var fUrl=eski.fotoUrl||'';
        var ff=document.getElementById('muhtarFoto')&&document.getElementById('muhtarFoto').files[0];
        function kaydet(fu){
            var veri=Object.assign({},eski,{
                ad:((document.getElementById('muhtarAd')||{}).value||'').trim(),
                unvan:((document.getElementById('muhtarUnvan')||{}).value||'Köy Muhtarı').trim(),
                bio:((document.getElementById('muhtarBio')||{}).value||'').trim(),
                tel:((document.getElementById('muhtarTel')||{}).value||'').trim(),
                whatsapp:((document.getElementById('muhtarWa')||{}).value||'').trim(),
                email:((document.getElementById('muhtarEmail')||{}).value||'').trim(),
                fotoUrl:fu
            });
            db.collection('settings').doc('muhtar').set(veri).then(function(){
                _muhtarVerisi=veri;
                var p=document.getElementById('muhtarEditPanel');if(p)p.classList.add('hidden');
                muhtarYukle(); alert('✅ Kaydedildi!');
            }).catch(function(e){alert('Hata: '+e.message);})
            .finally(function(){if(btn){btn.disabled=false;btn.textContent='💾 Profili Kaydet';}});
        }
        if(ff&&typeof cloudinaryYukle==='function'){cloudinaryYukle(ff).then(function(r){kaydet(r.url);}).catch(function(){kaydet(fUrl);});}
        else{kaydet(fUrl);}
    }).catch(function(e){alert('Hata: '+e.message);if(btn){btn.disabled=false;btn.textContent='💾 Profili Kaydet';}});
}

function muhtarHizmetEkle() {
    if(typeof ayricaliklimi!=='function'||!ayricaliklimi()) return alert('Yetkiniz yok!');
    var b=((document.getElementById('muhtarHizmetBaslik')||{}).value||'').trim();
    if(!b) return alert('Başlık zorunludur!');
    db.collection('settings').doc('muhtar').get().then(function(snap){
        var eski=snap.exists?snap.data():{};
        var hz=Array.isArray(eski.hizmetler)?[].concat(eski.hizmetler):[];
        hz.unshift({baslik:b,aciklama:((document.getElementById('muhtarHizmetAciklama')||{}).value||'').trim(),yil:((document.getElementById('muhtarHizmetYil')||{}).value||String(new Date().getFullYear()))});
        return db.collection('settings').doc('muhtar').set(Object.assign({},eski,{hizmetler:hz}));
    }).then(function(){
        ['muhtarHizmetBaslik','muhtarHizmetAciklama','muhtarHizmetYil'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
        muhtarYukle(); alert('✅ Hizmet eklendi!');
    }).catch(function(e){alert('Hata: '+e.message);});
}

function muhtarHizmetSil(idx) {
    if(typeof ayricaliklimi!=='function'||!ayricaliklimi()) return;
    if(!confirm('Silmek istiyor musunuz?')) return;
    db.collection('settings').doc('muhtar').get().then(function(snap){
        if(!snap.exists) return;
        var v=snap.data(); var hz=Array.isArray(v.hizmetler)?[].concat(v.hizmetler):[];
        hz.splice(idx,1);
        return db.collection('settings').doc('muhtar').set(Object.assign({},v,{hizmetler:hz}));
    }).then(function(){muhtarYukle();}).catch(function(e){alert('Silinemedi: '+e.message);});
}

console.log('[Emirler] app_additions.js v4.4 yüklendi ✓');
