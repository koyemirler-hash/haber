/* ═══════════════════════════════════════════════════════════
   app_additions.js — Emirler Köyü v4.5
   ✓ tabDegistir'e DOKUNMAZ
   ✓ Kayan haber bandı (hava + namaz + duyurular)
   ✓ Dernek: orderBy kaldırıldı, JS'de sıralama (index hatası yok)
   ✓ Firestore güvenlik kuralı yoksa graceful fallback
═══════════════════════════════════════════════════════════ */

/* 1. PWA / BROWSER MOD */
(function() {
    try {
        var isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    window.navigator.standalone === true ||
                    document.referrer.startsWith('android-app://');
        document.body.classList.add(isPWA ? 'pwa-mode' : 'browser-mode');
    } catch(e) { document.body.classList.add('browser-mode'); }
})();

/* 2. SIDEBAR */
function sidebarToggle() {
    try {
        var nav=document.getElementById('sidebarNav'), ov=document.getElementById('sidebarOverlay');
        if (!nav) return;
        if (nav.classList.contains('sidebar-open')) { sidebarKapat(); }
        else {
            nav.classList.add('sidebar-open');
            if(typeof sidebarPwaPanelGuncelle==='function')setTimeout(sidebarPwaPanelGuncelle,150);
            if(ov) ov.classList.add('visible');
            document.body.style.overflow='hidden';
        }
    } catch(e) {}
}
function sidebarKapat() {
    try {
        var nav=document.getElementById('sidebarNav'), ov=document.getElementById('sidebarOverlay');
        if(nav) nav.classList.remove('sidebar-open');
        if(ov)  ov.classList.remove('visible');
        document.body.style.overflow='';
    } catch(e) {}
}
document.addEventListener('keydown', function(e){ if(e.key==='Escape') sidebarKapat(); });

document.addEventListener('DOMContentLoaded', function() {
    /* navBar tıklama → sidebar senkron */
    var nb = document.getElementById('navBar');
    if (nb) {
        nb.addEventListener('click', function(e) {
            var item = e.target.closest('.nav-item');
            if (item && item.id) syncSidebar(item.id.replace('nav-',''));
        });
    }
    /* Browser modunda ticker yükle */
    if (document.body.classList.contains('browser-mode')) {
        setTimeout(function(){ tickerBaslat(); }, 800);
    }
});

function syncSidebar(t) {
    try {
        document.querySelectorAll('.sidebar-item').forEach(function(s){ s.classList.remove('active'); });
        var el = document.getElementById('snav-'+t);
        if (el) el.classList.add('active');
    } catch(e) {}
}

function sidebarTabGit(t) {
    sidebarKapat();
    setTimeout(function() {
        if (t==='dernek') { showDernek(); return; }
        if (t==='muhtar') { showMuhtar(); return; }
        if (t==='ozel')   { try { tabDegistir('ozel'); } catch(e) {} syncSidebar('ozel'); return; }
        try { tabDegistir(t); } catch(e) {}
        syncSidebar(t);
    }, 180);
}

/* 3. DERNEK / MUHTAR GÖSTERİM */
function showDernek() {
    try {
        document.querySelectorAll('.view').forEach(function(v){ v.classList.add('hidden'); });
        var v=document.getElementById('view-dernek'); if(v) v.classList.remove('hidden');
        document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
        var n=document.getElementById('nav-dernek'); if(n) n.classList.add('active');
        syncSidebar('dernek');
        window.scrollTo(0,0);
        var fr=document.getElementById('floatingReklam'); if(fr) fr.style.visibility='';
        dernekDinle();
        // Yönetim kurulu admin butonu göster
        var adminBtn=document.getElementById('dernekYonetimAdminBtn');
        if(adminBtn) adminBtn.style.display=(typeof ayricaliklimi==='function'&&ayricaliklimi())?'':'none';
    } catch(e) {}
}
function showMuhtar() {
    try {
        document.querySelectorAll('.view').forEach(function(v){ v.classList.add('hidden'); });
        var v=document.getElementById('view-muhtar'); if(v) v.classList.remove('hidden');
        document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
        var n=document.getElementById('nav-muhtar'); if(n) n.classList.add('active');
        syncSidebar('muhtar');
        window.scrollTo(0,0);
        var fr=document.getElementById('floatingReklam'); if(fr) fr.style.visibility='';
        muhtarYukle();
    } catch(e) {}
}

/* ════════════════════════════════════════════════════════════
   4. KAYAN HABER BANDI (TICKER)
   Hem browser hem PWA'da feed sayfasında gösterilir
   Hava + Namaz + Son duyurular
════════════════════════════════════════════════════════════ */
var _tickerHavaMetin   = '🌤️ Yükleniyor...';
var _tickerNamazMetin  = [];  // [{ad, saat, aktif}]
var _tickerDuyurular   = [];  // [{baslik}]
var _tickerReady       = 0;   // 0/1/2/3 → hepsi gelince render

function tickerBaslat() {
    var el = document.getElementById('tickerInner');
    if (!el) return;

    _tickerReady = 0;
    _tickerHavaMetin  = '🌤️ Yükleniyor...';
    _tickerNamazMetin = [];
    _tickerDuyurular  = [];

    tickerHavaYukle();
    tickerNamazYukle();
    tickerDuyurularYukle();
}

function tickerRender() {
    _tickerReady++;
    if (_tickerReady < 3) return; // 3 kaynak da gelsin

    var el = document.getElementById('tickerInner');
    if (!el) return;

    var items = [];

    /* Hava */
    items.push('<span class="ticker-item hava-item">' + _tickerHavaMetin + '</span>');

    /* Namaz */
    if (_tickerNamazMetin.length > 0) {
        items.push('<span class="ticker-item namaz-item" style="font-size:11px;color:#c4a0ff;font-weight:700;padding-right:4px;">🕌</span>');
        _tickerNamazMetin.forEach(function(vk) {
            items.push('<span class="ticker-item namaz-item' + (vk.aktif?' aktif-vakit':'') + '">' +
                vk.ikon + ' ' + vk.ad + ' ' + vk.saat + '</span>');
        });
    }

    /* Duyurular */
    if (_tickerDuyurular.length > 0) {
        items.push('<span class="ticker-item" style="color:#a8d8f0;font-weight:700;">📢 SON DUYURULAR:</span>');
        _tickerDuyurular.forEach(function(d) {
            items.push('<span class="ticker-item duyuru-item">📌 ' + d.baslik + '</span>');
        });
    }

    /* İçeriği 2 kez tekrarla → sonsuz döngü etkisi */
    var html = items.join('') + items.join('');
    el.innerHTML = html;

    /* Animasyon süresini içerik uzunluğuna göre ayarla */
    var itemCount = items.length * 2;
    var sureSn = Math.max(8, itemCount * 1.8); // her item için ~1.8 saniye
    el.style.animationDuration = sureSn + 's';
}

function tickerHavaYukle() {
    var KOY_LAT=39.72, KOY_LNG=33.52;
    var HAVA={0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',51:'🌦️',61:'🌧️',71:'🌨️',80:'🌦️',95:'⛈️'};
    var HAVA_AD={0:'Açık',1:'Az Bulutlu',2:'Parçalı',3:'Kapalı',45:'Sis',51:'Çisenti',61:'Yağmurlu',71:'Karlı',80:'Sağanak',95:'Fırtına'};
    fetch('https://api.open-meteo.com/v1/forecast?latitude='+KOY_LAT+'&longitude='+KOY_LNG+'&current=temperature_2m,weathercode&timezone=Europe%2FIstanbul')
    .then(function(r){return r.json();})
    .then(function(d){
        var cur=d.current;
        var ikon=HAVA[cur.weathercode]||'🌡️';
        var ad=HAVA_AD[cur.weathercode]||'';
        _tickerHavaMetin = ikon+' '+Math.round(cur.temperature_2m)+'°C · '+ad+' · Emirler Köyü';
        tickerRender();
    })
    .catch(function(){ _tickerHavaMetin='🌡️ Hava verisi alınamadı'; tickerRender(); });
}

function tickerNamazYukle() {
    var KOY_LAT=39.72, KOY_LNG=33.52;
    var b=new Date();
    fetch('https://api.aladhan.com/v1/timings/'+b.getDate()+'-'+(b.getMonth()+1)+'-'+b.getFullYear()+'?latitude='+KOY_LAT+'&longitude='+KOY_LNG+'&method=13')
    .then(function(r){return r.json();})
    .then(function(d){
        var v=d.data.timings;
        var fmt=function(s){return s.split(' ')[0];};
        var vak=[
            {ikon:'🌅',ad:'İmsak', saat:fmt(v.Fajr)},
            {ikon:'☀️',ad:'Güneş', saat:fmt(v.Sunrise)},
            {ikon:'🌞',ad:'Öğle',  saat:fmt(v.Dhuhr)},
            {ikon:'🌇',ad:'İkindi',saat:fmt(v.Asr)},
            {ikon:'🌆',ad:'Akşam', saat:fmt(v.Maghrib)},
            {ikon:'🌙',ad:'Yatsı', saat:fmt(v.Isha)}
        ];
        var now=('0'+b.getHours()).slice(-2)+':'+('0'+b.getMinutes()).slice(-2);
        var nextIdx=vak.length-1;
        for(var i=0;i<vak.length;i++){if(vak[i].saat>now){nextIdx=i;break;}}
        _tickerNamazMetin=vak.map(function(vk,i){return{ikon:vk.ikon,ad:vk.ad,saat:vk.saat,aktif:i===nextIdx};});
        tickerRender();
    })
    .catch(function(){ _tickerNamazMetin=[]; tickerRender(); });
}

function tickerDuyurularYukle() {
    if (typeof db==='undefined') { _tickerDuyurular=[]; tickerRender(); return; }
    /* orderBy YOK → index gerekmez, JS'de sırala */
    db.collection('announcements').limit(10).get()
    .then(function(snap){
        var docs=[];
        snap.forEach(function(doc){ docs.push(doc.data()); });
        /* JS'de zaman sırala */
        docs.sort(function(a,b){
            var ta=a.time&&a.time.toDate?a.time.toDate().getTime():0;
            var tb=b.time&&b.time.toDate?b.time.toDate().getTime():0;
            return tb-ta;
        });
        _tickerDuyurular=docs.slice(0,6).filter(function(d){return d.title||d.text;}).map(function(d){
            var baslik=d.title||d.text||'';
            return {baslik:baslik.length>50?baslik.substring(0,50)+'…':baslik};
        });
        tickerRender();
    })
    .catch(function(){ _tickerDuyurular=[]; tickerRender(); });
}

/* Feed açılınca ticker yükle — her modda */
var _tickerYuklendi = false;
var _origTabDegistir_ref = null;
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        _origTabDegistir_ref = window.tabDegistir;
        if (typeof window.tabDegistir === 'function') {
            var orig = window.tabDegistir;
            window.tabDegistir = function(t) {
                try { orig(t); } catch(e) {}
                if (t === 'feed' && !_tickerYuklendi) {
                    _tickerYuklendi = true;
                    setTimeout(tickerBaslat, 300);
                }
                syncSidebar(t);
            };
        }
    }, 500);
});

/* 5. DERNEK ÇALIŞMALARI
   ⚠️ orderBy KULLANILMAZ → Firestore index hatası olmaz
   Sıralama JavaScript'te yapılır */
var _dernekFiltre = 'hepsi';

function dernekFormToggle() {
    var d=document.getElementById('dernekFormDiv'); if(d) d.classList.toggle('hidden');
}
function dernekFiltre(tip, el) {
    _dernekFiltre=tip;
    document.querySelectorAll('#view-dernek .ilan-filtre-btn').forEach(function(b){b.classList.remove('active');});
    if(el) el.classList.add('active');
    dernekDinle();
}

function dernekDinle() {
    var list=document.getElementById('dernekList');
    if (!list || typeof db==='undefined') return;
    list.innerHTML='<div class="loading-spinner">⏳ Yükleniyor...</div>';
    try { if(typeof ayricaliklimi==='function'&&ayricaliklimi()){var b=document.getElementById('dernekEkleBtn');if(b)b.style.display='';} }catch(e){}

    /* ⚠️ orderBy YOK — Firestore index gerektirmez */
    db.collection('dernek').get()
    .then(function(snap){
        var docs=[];
        snap.forEach(function(doc){ docs.push(Object.assign({id:doc.id},doc.data())); });

        /* JS'de zaman sırala (yeniden eskiye) */
        docs.sort(function(a,b){
            var ta=a.time&&a.time.toDate?a.time.toDate().getTime():0;
            var tb=b.time&&b.time.toDate?b.time.toDate().getTime():0;
            return tb-ta;
        });

        if (_dernekFiltre!=='hepsi') {
            docs=docs.filter(function(d){return d.tip===_dernekFiltre;});
        }
        if (docs.length===0) {
            list.innerHTML='<div class="empty-state"><div class="empty-icon">🤝</div><p>Bu kategoride kayıt yok</p></div>';
            return;
        }
        var TM={toplanti:'📅 Toplantı',karar:'⚖️ Karar',proje:'🏗️ Proje',etkinlik:'🎉 Etkinlik',diger:'📌 Diğer'};
        var TR={toplanti:'tip-toplanti',karar:'tip-karar',proje:'tip-proje',etkinlik:'tip-etkinlik',diger:''};
        var esc=typeof escapeHtml==='function'?escapeHtml:function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
        var isAdm=typeof ayricaliklimi==='function'&&ayricaliklimi();
        list.innerHTML='';
        docs.forEach(function(item){
            var d=document.createElement('div');
            d.className='dernek-kart dernek-tip-'+(item.tip||'diger');
            d.innerHTML='<div class="dernek-kart-ust"><span class="dernek-tip-badge '+(TR[item.tip]||'')+'">'+(TM[item.tip]||'📌 Diğer')+'</span>'+
                '<span class="dernek-baslik">'+esc(item.baslik||'')+'</span></div>'+
                (item.tarih?'<div class="dernek-tarih">📅 '+esc(item.tarih)+'</div>':'')+
                (item.aciklama?'<div class="dernek-aciklama">'+esc(item.aciklama)+'</div>':'')+
                (item.imageUrl?'<img src="'+item.imageUrl+'" style="width:100%;max-height:220px;object-fit:cover;cursor:pointer;" onclick="resimTamEkran(\''+item.imageUrl+'\')" loading="lazy">':'')+
                (isAdm?'<div class="dernek-footer"><button class="btn btn-danger btn-sm" onclick="dernekSil(\''+item.id+'\')">🗑️ Sil</button></div>':'');
            list.appendChild(d);
        });
    })
    .catch(function(e){
        /* Firestore kuralı yoksa açıklayıcı hata göster */
        var msg = e.code==='permission-denied'
            ? '🔒 Firestore kurallarına "dernek" koleksiyonu eklenmemiş.<br><small>Firebase Console → Firestore → Rules bölümüne<br><code>match /dernek/{doc} { allow read: if request.auth!=null; allow write: if ... }</code> ekleyin.</small>'
            : '⚠️ Yüklenemedi: '+e.message;
        list.innerHTML='<div style="text-align:center;padding:24px;color:#888;line-height:1.8;">'+msg+'</div>';
    });
}

function dernekEkle() {
    if(typeof ayricaliklimi!=='function'||!ayricaliklimi()) return alert('Yetkiniz yok!');
    var baslik=((document.getElementById('dernekBaslik')||{}).value||'').trim();
    if(!baslik) return alert('Başlık zorunludur!');
    var btn=document.getElementById('dernekGonderBtn');
    if(btn){btn.disabled=true;btn.textContent='⏳';}
    var file=document.getElementById('dernekDosya')&&document.getElementById('dernekDosya').files[0];
    function kaydet(imgUrl){
        db.collection('dernek').add({
            tip:(document.getElementById('dernekTip')||{}).value||'diger',
            baslik:baslik,
            tarih:((document.getElementById('dernekTarih')||{}).value||''),
            aciklama:(((document.getElementById('dernekAciklama')||{}).value||'').trim()),
            imageUrl:imgUrl||'',
            ekleyen:(window.userProfile&&window.userProfile.name)||'',
            time:firebase.firestore.FieldValue.serverTimestamp()
        }).then(function(){
            ['dernekBaslik','dernekAciklama','dernekTarih','dernekDosya'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
            var pv=document.getElementById('dernekOnizle');if(pv)pv.innerHTML='';
            var fm=document.getElementById('dernekFormDiv');if(fm)fm.classList.add('hidden');
            dernekDinle(); alert('✅ Başarıyla eklendi!');
        }).catch(function(e){alert('Hata: '+e.message);})
        .finally(function(){if(btn){btn.disabled=false;btn.textContent='✅ Yayınla';}});
    }
    if(file&&typeof cloudinaryYukle==='function'){cloudinaryYukle(file).then(function(r){kaydet(r.url);}).catch(function(){kaydet('');});}
    else{kaydet('');}
}
function dernekSil(id){
    if(typeof ayricaliklimi!=='function'||!ayricaliklimi()) return;
    if(!confirm('Bu kaydı silmek istiyor musunuz?')) return;
    db.collection('dernek').doc(id).delete().then(function(){dernekDinle();}).catch(function(){alert('Silinemedi!');});
}

/* 6. MUHTAR */
var _muhtarVerisi=null;
function muhtarEditToggle(){
    var p=document.getElementById('muhtarEditPanel');if(!p) return;
    var g=p.classList.contains('hidden'); p.classList.toggle('hidden');
    if(g&&_muhtarVerisi){var v=_muhtarVerisi;function sv(id,val){var e=document.getElementById(id);if(e)e.value=val||'';}sv('muhtarAd',v.ad);sv('muhtarUnvan',v.unvan);sv('muhtarBio',v.bio);sv('muhtarTel',v.tel);sv('muhtarWa',v.whatsapp);sv('muhtarEmail',v.email);}
}
function muhtarYukle(){
    if(typeof db==='undefined') return;
    var pEl=document.getElementById('muhtarProfilKart'),hEl=document.getElementById('muhtarHizmetlerList'),iEl=document.getElementById('muhtarIletisimBolum'),ibEl=document.getElementById('muhtarIletisimBaslik');
    try{if(typeof ayricaliklimi==='function'&&ayricaliklimi()){var mb=document.getElementById('muhtarDuzenleBtn');if(mb)mb.style.display='';}}catch(e){}
    var esc=typeof escapeHtml==='function'?escapeHtml:function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
    var isAdm=typeof ayricaliklimi==='function'&&ayricaliklimi();
    db.collection('settings').doc('muhtar').get()
    .then(function(snap){
        if(snap.exists){
            _muhtarVerisi=snap.data();var v=_muhtarVerisi;
            if(pEl)pEl.innerHTML=(v.fotoUrl?'<img src="'+v.fotoUrl+'" class="muhtar-profil-foto">':'<div class="muhtar-profil-foto-placeholder">👤</div>')+'<div class="muhtar-profil-bilgi"><div class="muhtar-ad">'+esc(v.ad||'Emirler Köyü Muhtarı')+'</div><div class="muhtar-unvan">'+esc(v.unvan||'Köy Muhtarı')+'</div>'+(v.bio?'<div class="muhtar-bio">'+esc(v.bio)+'</div>':'')+'</div>';
            var hz=v.hizmetler||[];
            if(hEl)hEl.innerHTML=hz.length===0?'<div style="color:#aaa;font-size:14px;padding:10px;text-align:center;">Henüz hizmet bilgisi girilmemiş</div>':hz.map(function(h,i){
                var fotoHtml=h.fotoUrl?'<img src="'+h.fotoUrl+'" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin-top:8px;cursor:pointer;" onclick="resimTamEkran(\''+h.fotoUrl+'\')" loading="lazy">':'';
                return '<div class="muhtar-hizmet-kart"><div class="muhtar-hizmet-yil">'+esc(String(h.yil||'—'))+'</div><div class="muhtar-hizmet-icerik"><div class="muhtar-hizmet-baslik">'+esc(h.baslik||'')+'</div>'+(h.aciklama?'<div class="muhtar-hizmet-aciklama">'+esc(h.aciklama)+'</div>':'')+fotoHtml+'</div>'+(isAdm?'<button class="muhtar-hizmet-sil" onclick="muhtarHizmetSil('+i+')">🗑️</button>':'')+'</div>';
            }).join('');
            var ilt=[];if(v.tel)ilt.push('<a href="tel:'+v.tel+'" class="contact-btn phone-btn"><span class="contact-icon">📞</span><span>Telefon</span></a>');if(v.whatsapp)ilt.push('<a href="https://wa.me/'+v.whatsapp.replace(/[^0-9]/g,'')+'" target="_blank" class="contact-btn whatsapp-btn"><span class="contact-icon">💬</span><span>WhatsApp</span></a>');if(v.email)ilt.push('<a href="mailto:'+v.email+'" class="contact-btn email-btn"><span class="contact-icon">✉️</span><span>E-Posta</span></a>');
            if(ilt.length>0){if(ibEl)ibEl.style.display='';if(iEl)iEl.innerHTML='<div class="contact-buttons">'+ilt.join('')+'</div>';}else{if(ibEl)ibEl.style.display='none';}
        }else{
            _muhtarVerisi={};
            if(pEl)pEl.innerHTML='<div class="muhtar-profil-foto-placeholder">👤</div><div class="muhtar-profil-bilgi"><div class="muhtar-ad">Emirler Köyü Muhtarı</div><div class="muhtar-unvan">Köy Muhtarı</div><div class="muhtar-bio" style="color:#aaa;">Muhtar bilgileri henüz eklenmemiştir.</div></div>';
            if(hEl)hEl.innerHTML='<div style="color:#aaa;font-size:14px;padding:10px;text-align:center;">Henüz hizmet bilgisi girilmemiş</div>';
            if(ibEl)ibEl.style.display='none';
        }
    }).catch(function(){if(pEl)pEl.innerHTML='<div style="padding:24px;text-align:center;color:#888;">⚠️ Yüklenemedi</div>';});
}
function muhtarKaydet(){
    if(typeof ayricaliklimi!=='function'||!ayricaliklimi()) return alert('Yetkiniz yok!');
    var btn=document.getElementById('muhtarKaydetBtn');if(btn){btn.disabled=true;btn.textContent='⏳';}
    db.collection('settings').doc('muhtar').get().then(function(snap){
        var eski=snap.exists?snap.data():{};var fUrl=eski.fotoUrl||'';
        var ff=document.getElementById('muhtarFoto')&&document.getElementById('muhtarFoto').files[0];
        function kaydet(fu){
            var veri=Object.assign({},eski,{ad:((document.getElementById('muhtarAd')||{}).value||'').trim(),unvan:((document.getElementById('muhtarUnvan')||{}).value||'Köy Muhtarı').trim(),bio:((document.getElementById('muhtarBio')||{}).value||'').trim(),tel:((document.getElementById('muhtarTel')||{}).value||'').trim(),whatsapp:((document.getElementById('muhtarWa')||{}).value||'').trim(),email:((document.getElementById('muhtarEmail')||{}).value||'').trim(),fotoUrl:fu});
            db.collection('settings').doc('muhtar').set(veri).then(function(){_muhtarVerisi=veri;var p=document.getElementById('muhtarEditPanel');if(p)p.classList.add('hidden');muhtarYukle();alert('✅ Kaydedildi!');}).catch(function(e){alert('Hata: '+e.message);}).finally(function(){if(btn){btn.disabled=false;btn.textContent='💾 Profili Kaydet';}});
        }
        if(ff&&typeof cloudinaryYukle==='function'){cloudinaryYukle(ff).then(function(r){kaydet(r.url);}).catch(function(){kaydet(fUrl);});}else{kaydet(fUrl);}
    }).catch(function(e){alert('Hata: '+e.message);if(btn){btn.disabled=false;btn.textContent='💾 Profili Kaydet';}});
}
function muhtarHizmetEkle(){
    if(typeof ayricaliklimi!=='function'||!ayricaliklimi()) return alert('Yetkiniz yok!');
    var b=((document.getElementById('muhtarHizmetBaslik')||{}).value||'').trim();if(!b)return alert('Başlık zorunludur!');
    var btn=document.getElementById('muhtarHizmetEkleBtn');if(btn){btn.disabled=true;btn.textContent='⏳ Yükleniyor...';}
    var fotoFile=document.getElementById('muhtarHizmetFoto')&&document.getElementById('muhtarHizmetFoto').files[0];
    function kaydetHizmet(fotoUrl){
        db.collection('settings').doc('muhtar').get().then(function(snap){
            var eski=snap.exists?snap.data():{};var hz=Array.isArray(eski.hizmetler)?[].concat(eski.hizmetler):[];
            hz.unshift({baslik:b,aciklama:((document.getElementById('muhtarHizmetAciklama')||{}).value||'').trim(),yil:((document.getElementById('muhtarHizmetYil')||{}).value||String(new Date().getFullYear())),fotoUrl:fotoUrl||''});
            return db.collection('settings').doc('muhtar').set(Object.assign({},eski,{hizmetler:hz}));
        }).then(function(){
            ['muhtarHizmetBaslik','muhtarHizmetAciklama','muhtarHizmetYil'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
            var fi=document.getElementById('muhtarHizmetFoto');if(fi)fi.value='';
            var fp=document.getElementById('muhtarHizmetFotoOnizle');if(fp)fp.innerHTML='';
            muhtarYukle();alert('✅ Hizmet eklendi!');
        }).catch(function(e){alert('Hata: '+e.message);})
        .finally(function(){if(btn){btn.disabled=false;btn.textContent='+ Hizmet Ekle';}});
    }
    if(fotoFile&&typeof cloudinaryYukle==='function'){cloudinaryYukle(fotoFile).then(function(r){kaydetHizmet(r.url);}).catch(function(){kaydetHizmet('');});}
    else{kaydetHizmet('');}
}
function muhtarHizmetSil(idx){
    if(typeof ayricaliklimi!=='function'||!ayricaliklimi()) return;if(!confirm('Silmek istiyor musunuz?')) return;
    db.collection('settings').doc('muhtar').get().then(function(snap){if(!snap.exists)return;var v=snap.data();var hz=Array.isArray(v.hizmetler)?[].concat(v.hizmetler):[];hz.splice(idx,1);return db.collection('settings').doc('muhtar').set(Object.assign({},v,{hizmetler:hz}));}).then(function(){muhtarYukle();}).catch(function(e){alert('Silinemedi: '+e.message);});
}

function dernekYonetimToggle(){
    var ic=document.getElementById('dernekYonetimIcerik'), ok=document.getElementById('dernekYonetimOk');
    if(!ic) return;
    var acik=ic.classList.toggle('hidden');
    if(ok) ok.textContent=acik?'▼':'▲';
    if(!acik) dernekYonetimYukle();
}

function dernekYonetimYukle(){
    var list=document.getElementById('dernekYonetimList');
    if(!list) return;
    var isAdm=typeof ayricaliklimi==='function'&&ayricaliklimi();
    var adminBtn=document.getElementById('dernekYonetimAdminBtn');
    if(adminBtn) adminBtn.style.display=isAdm?'':'none';
    var esc=typeof escapeHtml==='function'?escapeHtml:function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
    db.collection('settings').doc('dernekYonetim').get()
    .then(function(snap){
        var uyeler=snap.exists&&Array.isArray(snap.data().uyeler)?snap.data().uyeler:[];
        if(uyeler.length===0){
            list.innerHTML='<div style="text-align:center;color:#aaa;font-size:13px;padding:12px;">Henüz yönetim kurulu bilgisi girilmemiş.</div>';
            return;
        }
        list.innerHTML='<div class="dy-grid">'+uyeler.map(function(u,i){
            return '<div class="dy-kart">'+
                (u.fotoUrl?'<img src="'+u.fotoUrl+'" class="dy-foto" onclick="resimTamEkran(\''+u.fotoUrl+'\')" loading="lazy">':'<div class="dy-foto-placeholder">👤</div>')+
                '<div class="dy-ad">'+esc(u.ad||'')+'</div>'+
                '<div class="dy-gore">'+esc(u.gore||'')+'</div>'+
                (isAdm?'<button class="dy-sil-btn" onclick="dernekYonetimUyeSil('+i+')">🗑️</button>':'')+'</div>';
        }).join('')+'</div>';
    })
    .catch(function(){ list.innerHTML='<div style="color:#aaa;text-align:center;padding:12px;font-size:13px;">⚠️ Yüklenemedi</div>'; });
}

function dernekYonetimUyeEkle(){
    if(typeof ayricaliklimi!=='function'||!ayricaliklimi()) return alert('Yetkiniz yok!');
    var ad=((document.getElementById('dyAd')||{}).value||'').trim();
    if(!ad) return alert('Ad Soyad zorunludur!');
    var gore=((document.getElementById('dyGore')||{}).value||'').trim();
    var btn=document.getElementById('dyEkleBtn');
    if(btn){btn.disabled=true;btn.textContent='⏳ Yükleniyor...';}
    var fotoFile=document.getElementById('dyFoto')&&document.getElementById('dyFoto').files[0];
    function kaydet(fotoUrl){
        db.collection('settings').doc('dernekYonetim').get().then(function(snap){
            var eski=snap.exists?snap.data():{};
            var uyeler=Array.isArray(eski.uyeler)?[].concat(eski.uyeler):[];
            uyeler.push({ad:ad,gore:gore,fotoUrl:fotoUrl||''});
            return db.collection('settings').doc('dernekYonetim').set({uyeler:uyeler});
        }).then(function(){
            ['dyAd','dyGore'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
            var df=document.getElementById('dyFoto');if(df)df.value='';
            var dp=document.getElementById('dyFotoOnizle');if(dp)dp.innerHTML='';
            document.getElementById('dernekYonetimFormDiv').classList.add('hidden');
            dernekYonetimYukle();
            alert('✅ Üye eklendi!');
        }).catch(function(e){alert('Hata: '+e.message);})
        .finally(function(){if(btn){btn.disabled=false;btn.textContent='+ Üye Ekle';}});
    }
    if(fotoFile&&typeof cloudinaryYukle==='function'){cloudinaryYukle(fotoFile).then(function(r){kaydet(r.url);}).catch(function(){kaydet('');});}
    else{kaydet('');}
}

function dernekYonetimUyeSil(idx){
    if(typeof ayricaliklimi!=='function'||!ayricaliklimi()) return;
    if(!confirm('Bu üyeyi silmek istiyor musunuz?')) return;
    db.collection('settings').doc('dernekYonetim').get().then(function(snap){
        if(!snap.exists) return;
        var v=snap.data();
        var uyeler=Array.isArray(v.uyeler)?[].concat(v.uyeler):[];
        uyeler.splice(idx,1);
        return db.collection('settings').doc('dernekYonetim').set({uyeler:uyeler});
    }).then(function(){dernekYonetimYukle();}).catch(function(e){alert('Silinemedi: '+e.message);});
}

console.log('[Emirler] v4.5 yüklendi ✓');
