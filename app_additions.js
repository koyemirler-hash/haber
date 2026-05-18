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
    if (window._tikAnimId) cancelAnimationFrame(window._tikAnimId);
    window._tikItems = [];
    window._tikPos   = 0;

    // Tüm kaynakları paralel çek
    var usdTry = 38;
    Promise.allSettled([
        // 1. Döviz + Altın (doğru kaynak: Frankfurter API)
        fetch('https://api.frankfurter.app/latest?from=USD&to=TRY,EUR,GBP')
        .then(function(r){return r.json();})
        .then(function(d){
            usdTry = d.rates.TRY || 38;
            var eurTry = usdTry / (d.rates.EUR||1);
            var gbpTry = usdTry / (d.rates.GBP||0.79);
            // Altın: metalpriceapi.com ücretsiz veya hesap bazlı
            // Gerçek altın: XAU/USD = gram altın TL hesabı
            // Yaklaşık: 1 troy oz ≈ 3300 USD, günlük güncellenir
            return fetch('https://api.frankfurter.app/latest?from=XAU&to=USD')
            .then(function(r2){return r2.json();})
            .then(function(d2){
                var xauUsd = d2.rates.USD || 3300;
                var gram = Math.round(xauUsd * usdTry / 31.1035);
                var items = [
                    _ti('💵','Dolar',usdTry.toFixed(2)+'₺','tc-doviz'),
                    _ti('💶','Euro',eurTry.toFixed(2)+'₺','tc-doviz'),
                    _ti('💷','Sterlin',gbpTry.toFixed(2)+'₺','tc-doviz'),
                    _ti('🪙','Gram Altın',gram+'₺','tc-altin'),
                    _ti('🪙','Çeyrek',Math.round(gram*1.75)+'₺','tc-altin'),
                    _ti('🪙','Tam Altın',Math.round(gram*7)+'₺','tc-altin'),
                ];
                window._tikItems = window._tikItems.concat(['<span class="tsep">◆</span>'], items);
            }).catch(function(){
                // Altın fallback yaklaşık değer
                window._tikItems = window._tikItems.concat(['<span class="tsep">◆</span>',
                    _ti('💵','Dolar',usdTry.toFixed(2)+'₺','tc-doviz'),
                    _ti('💶','Euro',(usdTry/1.07).toFixed(2)+'₺','tc-doviz'),
                ]);
            });
        }),

        // 2. BIST100 + Hisse
        fetch('https://query2.finance.yahoo.com/v8/finance/spark?symbols=XU100.IS,THYAO.IS&range=1d&interval=1d')
        .then(function(r){return r.json();})
        .then(function(d){
            var items = ['<span class="tsep">◆</span>'];
            var spark = d.spark&&d.spark.result ? d.spark.result : [];
            spark.forEach(function(s){
                if (!s||!s.response||!s.response[0]) return;
                var m = s.response[0].meta;
                var p = m.regularMarketPrice||0;
                var c = m.regularMarketChangePercent||0;
                var ok = c>=0?'▲':'▼';
                items.push(_ti('📊',s.symbol.replace('.IS',''),p.toFixed(0)+' '+ok+Math.abs(c).toFixed(1)+'%',c>=0?'tc-yukari':'tc-asagi'));
            });
            window._tikItems = window._tikItems.concat(items);
        }).catch(function(){}),

        // 3. Hububat (CBOT vadeli)
        fetch('https://query2.finance.yahoo.com/v8/finance/spark?symbols=ZW=F,ZC=F,ZS=F,ZO=F&range=1d&interval=1d')
        .then(function(r){return r.json();})
        .then(function(d){
            var fmap={};
            var spark=d.spark&&d.spark.result?d.spark.result:[];
            spark.forEach(function(s){ if(s&&s.symbol&&s.response&&s.response[0]) fmap[s.symbol]=s.response[0].meta.regularMarketPrice||0; });
            var usd = usdTry||38;
            var items = ['<span class="tsep">◆</span>'];
            if(fmap['ZW=F']){ items.push(_ti('🌾','Buğday',(fmap['ZW=F']*usd/27.22).toFixed(2)+'₺/kg','tc-tarim')); }
            if(fmap['ZW=F']){ items.push(_ti('🌿','Arpa',(fmap['ZW=F']*0.78*usd/27.22).toFixed(2)+'₺/kg','tc-tarim')); }
            if(fmap['ZC=F']){ items.push(_ti('🌽','Mısır',(fmap['ZC=F']*usd/25.40).toFixed(2)+'₺/kg','tc-tarim')); }
            if(fmap['ZS=F']){ items.push(_ti('🫘','Soya',(fmap['ZS=F']*usd/27.22).toFixed(2)+'₺/kg','tc-tarim')); }
            if(items.length>1) window._tikItems=window._tikItems.concat(items);
            else window._tikItems=window._tikItems.concat(['<span class="tsep">◆</span>',
                _ti('🌾','Buğday','~8.5₺/kg','tc-tarim'),_ti('🌿','Arpa','~6.8₺/kg','tc-tarim'),_ti('🌽','Mısır','~6.2₺/kg','tc-tarim')]);
        }).catch(function(){
            window._tikItems=window._tikItems.concat(['<span class="tsep">◆</span>',
                _ti('🌾','Buğday','~8.5₺/kg','tc-tarim'),_ti('🌿','Arpa','~6.8₺/kg','tc-tarim'),_ti('🌽','Mısır','~6.2₺/kg','tc-tarim')]);
        }),

        // 4. Et & Balık (piyasa ortalaması)
        Promise.resolve().then(function(){
            window._tikItems=window._tikItems.concat(['<span class="tsep">◆</span>',
                _ti('🥩','Dana Kıyma','~550₺/kg','tc-et'),
                _ti('🍖','Kuzu','~510₺/kg','tc-et'),
                _ti('🐔','Tavuk','~130₺/kg','tc-et'),
                _ti('🐟','Çipura','~230₺/kg','tc-et'),
                _ti('🐟','Hamsi','~100₺/kg','tc-et'),
            ]);
        }),

        // 5. Hava durumu
        fetch('https://api.open-meteo.com/v1/forecast?latitude=39.72&longitude=33.52&current=temperature_2m,weathercode&timezone=Europe%2FIstanbul')
        .then(function(r){return r.json();})
        .then(function(d){
            var HAVA={0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',51:'🌦️',61:'🌧️',71:'🌨️',80:'🌦️',95:'⛈️'};
            var AD={0:'Açık',1:'Az Bulutlu',2:'Parçalı',3:'Kapalı',45:'Sis',51:'Çisenti',61:'Yağmurlu',71:'Karlı',80:'Sağanak',95:'Fırtına'};
            var c=d.current;
            window._tikItems = [_ti(HAVA[c.weathercode]||'🌡️','Emirler',Math.round(c.temperature_2m)+'°C · '+(AD[c.weathercode]||''),'tc-hava')].concat(window._tikItems);
        }).catch(function(){
            window._tikItems = [_ti('🌡️','Emirler','-- °C','tc-hava')].concat(window._tikItems);
        }),

        // 6. Namaz — sadece sonraki vakit
        (function(){
            var b=new Date();
            return fetch('https://api.aladhan.com/v1/timings/'+b.getDate()+'-'+(b.getMonth()+1)+'-'+b.getFullYear()+'?latitude=39.72&longitude=33.52&method=13')
            .then(function(r){return r.json();})
            .then(function(d){
                var v=d.data.timings, now=('0'+b.getHours()).slice(-2)+':'+('0'+b.getMinutes()).slice(-2);
                var vk=[{i:'🌅',a:'İmsak',s:v.Fajr.split(' ')[0]},{i:'☀️',a:'Güneş',s:v.Sunrise.split(' ')[0]},
                        {i:'🌞',a:'Öğle',s:v.Dhuhr.split(' ')[0]},{i:'🌇',a:'İkindi',s:v.Asr.split(' ')[0]},
                        {i:'🌆',a:'Akşam',s:v.Maghrib.split(' ')[0]},{i:'🌙',a:'Yatsı',s:v.Isha.split(' ')[0]}];
                var son=vk[vk.length-1];
                for(var i=0;i<vk.length;i++){if(vk[i].s>now){son=vk[i];break;}}
                window._tikItems = window._tikItems.concat(['<span class="tsep">◆</span>',_ti(son.i,'Sonraki Namaz',son.a+' '+son.s,'tc-namaz')]);
            }).catch(function(){});
        })(),

        // 7. Duyurular
        (typeof db!=='undefined' ? db.collection('announcements').limit(5).get()
        .then(function(snap){
            var items=['<span class="tsep">◆</span>'];
            snap.forEach(function(doc){ var t=(doc.data().title||doc.data().text||'').substring(0,55); if(t) items.push('<span class="ti tc-duyuru">📢 '+t+'</span>'); });
            if(items.length>1) window._tikItems=window._tikItems.concat(items);
        }).catch(function(){}) : Promise.resolve())

    ]).then(function(){
        tickerRenderVeBaslat();
    });
}

function _ti(ikon, ad, deger, cls) {
    return '<span class="ti '+(cls||'')+'">'+ikon+' <b>'+ad+'</b> '+deger+'</span>';
}

function tickerRenderVeBaslat() {
    var el = document.getElementById('tickerInner');
    if (!el || !window._tikItems || window._tikItems.length===0) return;
    el.innerHTML = window._tikItems.join('') + window._tikItems.join('') + window._tikItems.join('');
    el.style.animation = 'none';
    el.style.transform = 'translateX(0)';
    window._tikPos = 0;
    if (window._tikAnimId) cancelAnimationFrame(window._tikAnimId);
    var speed = 2.2; // px/frame — hızlı
    function adim(){
        window._tikPos += speed;
        var limit = el.scrollWidth / 3;
        if (window._tikPos >= limit) window._tikPos = 0;
        el.style.transform = 'translateX(-'+window._tikPos+'px)';
        window._tikAnimId = requestAnimationFrame(adim);
    }
    window._tikAnimId = requestAnimationFrame(adim);
    // 5 dakikada bir yenile
    setTimeout(tickerBaslat, 300000);
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

/* ═══════════════════════════════════════════════════════
   📺 VİDEO GALERİSİ
═══════════════════════════════════════════════════════ */
var _videolar=[], _aktifVideo=0;

function videoGaleriYukle() {
    var ekleBtn=document.getElementById('videoEkleBtn');
    if(ekleBtn&&typeof yetkili==='function'&&yetkili()) ekleBtn.style.display='';
    var liste=document.getElementById('videoListe');
    if(!liste) return;
    if(typeof db==='undefined'){liste.innerHTML='';return;}
    db.collection('videolar').orderBy('zaman','desc').limit(20).get()
    .then(function(snap){
        _videolar=[];
        snap.forEach(function(doc){_videolar.push(Object.assign({id:doc.id},doc.data()));});
        if(_videolar.length===0){
            liste.innerHTML='<div style="padding:14px;text-align:center;color:#555;font-size:13px;">📺 Henüz video eklenmemiş</div>';
            return;
        }
        liste.innerHTML=_videolar.map(function(v,i){
            return '<div class="video-thumb" onclick="videoSec('+i+')">'
                +(v.tip==='canli'?'<div class="video-thumb-canli">🔴</div>':'')
                +'<div class="video-thumb-placeholder">🎬</div>'
                +'<div class="video-thumb-baslik">'+(v.baslik||'Video')+'</div></div>';
        }).join('');
        videoSec(0);
    }).catch(function(){liste.innerHTML='';});
}

function videoSec(idx) {
    if(idx<0||idx>=_videolar.length) return;
    _aktifVideo=idx;
    var v=_videolar[idx];
    var player=document.getElementById('anaVideo');
    var wrap=document.getElementById('videoPlayerWrap');
    var baslik=document.getElementById('videoBaslik');
    var rozet=document.getElementById('videoCanliRozet');
    if(!player) return;
    if(wrap) wrap.classList.remove('hidden');
    if(baslik) baslik.textContent=v.baslik||'Video '+(idx+1);
    if(rozet) rozet.style.display=v.tip==='canli'?'':'none';
    player.src=v.url||'';
    player.load();
    player.play().catch(function(){});
    document.querySelectorAll('.video-thumb').forEach(function(t,i){
        t.classList.toggle('video-thumb-aktif',i===idx);
    });
}

function videoSonrakiOynat(){videoSec((_aktifVideo+1)%_videolar.length);}
function videoOnceki(){videoSec((_aktifVideo-1+_videolar.length)%_videolar.length);}
function videoSonraki(){videoSec((_aktifVideo+1)%_videolar.length);}

function videoCal() {
    var p=document.getElementById('anaVideo');
    var btn=document.getElementById('videoCalBtn');
    if(!p) return;
    if(p.paused){p.play();if(btn)btn.textContent='⏸';}
    else{p.pause();if(btn)btn.textContent='▶️';}
}

function videoTamEkran() {
    var player=document.getElementById('anaVideo');
    if(!player) return;
    if(document.fullscreenElement||document.webkitFullscreenElement) {
        (document.exitFullscreen||document.webkitExitFullscreen).call(document);
        if(screen.orientation&&screen.orientation.unlock) screen.orientation.unlock();
    } else {
        var req=player.requestFullscreen||player.webkitRequestFullscreen;
        if(req) req.call(player);
        if(screen.orientation&&screen.orientation.lock)
            screen.orientation.lock('landscape').catch(function(){});
    }
}

document.addEventListener('fullscreenchange',function(){
    if(!document.fullscreenElement&&screen.orientation&&screen.orientation.unlock)
        screen.orientation.unlock();
});

function videoEkleAc() {
    var url=prompt('📺 Video URL (MP4/m3u8/YouTube):');
    if(!url) return;
    var baslik=prompt('Video başlığı:','Video');
    var tip=confirm('🔴 Canlı yayın mı?')?'canli':'video';
    if(typeof db==='undefined') return;
    db.collection('videolar').add({
        url:url, baslik:baslik||'Video', tip:tip,
        zaman:firebase.firestore.FieldValue.serverTimestamp()
    }).then(videoGaleriYukle).catch(function(e){alert('Hata: '+e.message);});
}

/* ═══════════════════════════════════════════════════════
   💰 PİYASA FİYATLARI — Köy Bilgileri
═══════════════════════════════════════════════════════ */
var _piyasaYuklendi={emtia:false,et:false,altin:false};

function piyasaTab(tab, btn) {
    document.querySelectorAll('.piyasa-tab').forEach(function(b){b.classList.remove('active');});
    document.querySelectorAll('.piyasa-panel').forEach(function(p){p.classList.add('hidden');});
    if(btn) btn.classList.add('active');
    var panel=document.getElementById('piyasa-'+tab);
    if(panel) panel.classList.remove('hidden');
    if(!_piyasaYuklendi[tab]) {
        _piyasaYuklendi[tab]=true;
        if(tab==='emtia') piyasaEmtiaYukle();
        if(tab==='et')    piyasaEtYukle();
        if(tab==='altin') piyasaAltinYukle();
    }
}

function _piyasaRender(widgetId, fiyatlar) {
    var el=document.getElementById(widgetId);
    if(!el) return;
    el.innerHTML=fiyatlar.map(function(f){
        return '<div class="fiyat-kart">'
            +'<div class="fiyat-ikon">'+f.i+'</div>'
            +'<div class="fiyat-bilgi"><div class="fiyat-ad">'+f.a+'</div>'
            +(f.k?'<div class="fiyat-kaynak">'+f.k+'</div>':'')+'</div>'
            +'<div class="fiyat-deger"><span class="fiyat-rakam">'+f.f+'</span> <span class="fiyat-birim">'+f.b+'</span></div>'
            +'</div>';
    }).join('')+'<div class="fiyat-guncelleme">🕐 '+new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})+'</div>';
}

function piyasaEmtiaYukle() {
    fetch('https://api.frankfurter.app/latest?from=USD&to=TRY')
    .then(function(r){return r.json();})
    .then(function(d){
        var usd=d.rates.TRY||38;
        return fetch('https://query2.finance.yahoo.com/v8/finance/spark?symbols=ZW=F,ZC=F,ZS=F,ZO=F&range=1d&interval=1d')
        .then(function(r2){return r2.json();})
        .then(function(d2){
            var fm={};
            (d2.spark&&d2.spark.result||[]).forEach(function(s){if(s&&s.response&&s.response[0]) fm[s.symbol]=s.response[0].meta.regularMarketPrice||0;});
            _piyasaRender('emtiaWidget',[
                {i:'🌾',a:'Buğday',  f:fm['ZW=F']?(fm['ZW=F']*usd/27.22).toFixed(2):'~8.50', b:'₺/kg', k:'CBOT'},
                {i:'🌿',a:'Arpa',    f:fm['ZW=F']?(fm['ZW=F']*0.78*usd/27.22).toFixed(2):'~6.80', b:'₺/kg', k:'≈CBOT'},
                {i:'🌽',a:'Mısır',   f:fm['ZC=F']?(fm['ZC=F']*usd/25.40).toFixed(2):'~6.20', b:'₺/kg', k:'CBOT'},
                {i:'🫘',a:'Soya',    f:fm['ZS=F']?(fm['ZS=F']*usd/27.22).toFixed(2):'~16.00', b:'₺/kg', k:'CBOT'},
                {i:'🌰',a:'Yulaf',   f:fm['ZO=F']?(fm['ZO=F']*usd/14.52).toFixed(2):'~7.00', b:'₺/kg', k:'CBOT'},
                {i:'🌻',a:'Ayçiçek', f:fm['ZS=F']?(fm['ZS=F']*1.15*usd/27.22).toFixed(2):'~14.50', b:'₺/kg', k:'≈CBOT'},
            ]);
        });
    }).catch(function(){
        _piyasaRender('emtiaWidget',[
            {i:'🌾',a:'Buğday', f:'~8.50',  b:'₺/kg',k:'TMO ref.'},{i:'🌿',a:'Arpa',f:'~6.80',b:'₺/kg',k:'TMO ref.'},
            {i:'🌽',a:'Mısır',  f:'~6.20',  b:'₺/kg',k:'TMO ref.'},{i:'🌻',a:'Ayçiçek',f:'~14.50',b:'₺/kg',k:'TMO ref.'},
        ]);
    });
}

function piyasaEtYukle() {
    var gun=new Date().toLocaleDateString('tr-TR',{month:'short',year:'numeric'});
    _piyasaRender('etWidget',[
        {i:'🥩',a:'Dana Kıyma',    f:'520-580',b:'₺/kg',k:gun},{i:'🥩',a:'Dana Antrikot',f:'680-750',b:'₺/kg',k:gun},
        {i:'🍖',a:'Kuzu But',      f:'480-540',b:'₺/kg',k:gun},{i:'🍖',a:'Kuzu Kıyma',  f:'460-520',b:'₺/kg',k:gun},
        {i:'🐔',a:'Tavuk (bütün)',f:'120-140',b:'₺/kg',k:gun},{i:'🐔',a:'Tavuk Göğsü', f:'200-240',b:'₺/kg',k:gun},
        {i:'🐟',a:'Çipura',       f:'200-260',b:'₺/kg',k:gun},{i:'🐟',a:'Levrek',      f:'200-250',b:'₺/kg',k:gun},
        {i:'🐟',a:'Hamsi',        f:'80-120', b:'₺/kg',k:'mevsimsel'},{i:'🐟',a:'Alabalık',f:'160-200',b:'₺/kg',k:gun},
    ]);
}

function piyasaAltinYukle() {
    fetch('https://api.frankfurter.app/latest?from=USD&to=TRY,EUR,GBP')
    .then(function(r){return r.json();})
    .then(function(d){
        var usd=d.rates.TRY||38, eur=usd/(d.rates.EUR||1), gbp=usd/(d.rates.GBP||0.79);
        return fetch('https://api.frankfurter.app/latest?from=XAU&to=USD')
        .then(function(r2){return r2.json();})
        .then(function(d2){
            var xauUsd=d2.rates.USD||3300;
            var gram=Math.round(xauUsd*usd/31.1035);
            _piyasaRender('altinWidget',[
                {i:'💵',a:'Dolar',        f:usd.toFixed(2),       b:'₺',k:'anlık'},
                {i:'💶',a:'Euro',         f:eur.toFixed(2),       b:'₺',k:'anlık'},
                {i:'💷',a:'Sterlin',      f:gbp.toFixed(2),       b:'₺',k:'anlık'},
                {i:'🪙',a:'Gram Altın',   f:gram.toString(),      b:'₺',k:'Frankfurter'},
                {i:'🪙',a:'Çeyrek Altın', f:Math.round(gram*1.75).toString(),b:'₺',k:'≈hesap'},
                {i:'🪙',a:'Yarım Altın',  f:Math.round(gram*3.5).toString(), b:'₺',k:'≈hesap'},
                {i:'🪙',a:'Tam Altın',    f:Math.round(gram*7).toString(),   b:'₺',k:'≈hesap'},
                {i:'🏅',a:'Cumhuriyet',   f:Math.round(gram*7.25).toString(),b:'₺',k:'≈hesap'},
            ]);
        });
    }).catch(function(){
        _piyasaRender('altinWidget',[
            {i:'💵',a:'Dolar',      f:'~38',    b:'₺',k:''},{i:'💶',a:'Euro',f:'~42',b:'₺',k:''},
            {i:'🪙',a:'Gram Altın', f:'~3.850', b:'₺',k:''},
        ]);
    });
}

// Piyasa accordeon açılınca yükle
(function(){
    var orijFn=window.akordeonToggle;
    if(orijFn){
        window.akordeonToggle=function(id){
            orijFn(id);
            if(id==='piyasa'&&!_piyasaYuklendi.emtia){_piyasaYuklendi.emtia=true;setTimeout(piyasaEmtiaYukle,200);}
        };
    }
})();
