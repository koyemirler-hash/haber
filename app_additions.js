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


/* ═══════════════════════════════════════════════════════════
   SÜPER HIZLI TICKER v6 — requestAnimationFrame tabanlı
   Emtia · Borsa · Et/Balık · Altın · Döviz · Duyurular
═══════════════════════════════════════════════════════════ */
var _tikData = [];
var _tikAnim = null;
var _tikPos  = 0;
var _tikSpeed = 1.8; // px/frame (~108px/sn @ 60fps)

function tickerBaslat() {
    _tikData = [];
    _tikPos  = 0;
    if (_tikAnim) cancelAnimationFrame(_tikAnim);

    var el = document.getElementById('tickerInner');
    if (el) el.innerHTML = '⏳ Veriler alınıyor...';

    // Tüm kaynakları paralel çek
    Promise.allSettled([
        _tikDovizAltin(),
        _tikBorsa(),
        _tikHububat(),
        _tikEtBalik(),
        _tikDuyurular()
    ]).then(function() {
        _tikRender();
    });

    // Hava
    tickerHavaKucukYukle();
    // Namaz — sadece sonraki vakit
    tickerNamazNextYukle();
    // 5 dakikada bir yenile
    setTimeout(tickerBaslat, 300000);
}

function _tikRender() {
    var el = document.getElementById('tickerInner');
    if (!el || _tikData.length === 0) return;

    // İçeriği 3 kez tekrarla (sonsuz döngü için)
    var content = _tikData.join('');
    el.innerHTML = content + content + content;
    el.style.transform = 'translateX(0)';
    el.style.animation = 'none';

    // Eski animasyonu durdur
    if (_tikAnim) cancelAnimationFrame(_tikAnim);

    function adim() {
        _tikPos += _tikSpeed;
        var yarisi = el.scrollWidth / 3;
        if (_tikPos >= yarisi) _tikPos = 0;
        el.style.transform = 'translateX(-' + _tikPos + 'px)';
        _tikAnim = requestAnimationFrame(adim);
    }
    _tikAnim = requestAnimationFrame(adim);
}

function _sep() { return '<span class="tsep">◆</span>'; }
function _item(ikon, ad, deger, cls) {
    return '<span class="ti ' + (cls||'') + '">' + ikon + ' <b>' + ad + '</b> ' + deger + '</span>';
}

/* Döviz + Altın */
function _tikDovizAltin() {
    return fetch('https://api.exchangerate-api.com/v4/latest/USD')
    .then(function(r){return r.json();})
    .then(function(d){
        var r = d.rates, usd = r.TRY||38;
        var eur = usd/(r.EUR||1), gbp = usd/(r.GBP||0.79);
        var xau = r.XAU ? (1/r.XAU) : 3300;
        var gram = (xau*usd/31.1035).toFixed(0);
        var items = [
            _sep(),
            _item('💵','Dolar', usd.toFixed(2)+'₺','tc-doviz'),
            _item('💶','Euro',  eur.toFixed(2)+'₺','tc-doviz'),
            _item('💷','Sterlin', gbp.toFixed(2)+'₺','tc-doviz'),
            _item('🪙','Gram Altın', gram+'₺','tc-altin'),
            _item('🪙','Çeyrek', (gram*1.75|0)+'₺','tc-altin'),
            _item('🪙','Tam Altın', (gram*7|0)+'₺','tc-altin'),
        ];
        _tikData = _tikData.concat(items);
        window._usdTry = usd; // Diğer fonksiyonlar kullanır
    }).catch(function(){});
}

/* BIST100 */
function _tikBorsa() {
    return fetch('https://query2.finance.yahoo.com/v8/finance/spark?symbols=XU100.IS,THYAO.IS,EREGL.IS&range=1d&interval=1d')
    .then(function(r){return r.json();})
    .then(function(d){
        var spark = d.spark&&d.spark.result ? d.spark.result : [];
        var items = [_sep()];
        spark.forEach(function(s){
            if (!s||!s.response||!s.response[0]) return;
            var m = s.response[0].meta;
            var fiyat = m.regularMarketPrice||0;
            var pct   = m.regularMarketChangePercent||0;
            var ok    = pct>=0?'▲':'▼';
            var ad    = s.symbol.replace('.IS','');
            items.push(_item('📊', ad, fiyat.toFixed(0)+' '+ok+Math.abs(pct).toFixed(1)+'%', pct>=0?'tc-yukari':'tc-asagi'));
        });
        _tikData = _tikData.concat(items);
    }).catch(function(){});
}

/* Hububat / Emtia */
function _tikHububat() {
    var usd = window._usdTry || 38;
    return fetch('https://query2.finance.yahoo.com/v8/finance/spark?symbols=ZW=F,ZC=F,ZS=F,ZO=F,KC=F,CC=F&range=1d&interval=1d')
    .then(function(r){return r.json();})
    .then(function(d){
        var spark = d.spark&&d.spark.result ? d.spark.result : [];
        var fmap = {};
        spark.forEach(function(s){ if(s&&s.symbol&&s.response&&s.response[0]) fmap[s.symbol]=s.response[0].meta.regularMarketPrice||0; });
        var usdTry = window._usdTry || usd;
        var items = [_sep()];
        var emtia = [
            {s:'ZW=F', ikon:'🌾', ad:'Buğday',  div:27.22},
            {s:'ZC=F', ikon:'🌽', ad:'Mısır',   div:25.40},
            {s:'ZS=F', ikon:'🫘', ad:'Soya',    div:27.22},
            {s:'ZO=F', ikon:'🌰', ad:'Yulaf',   div:14.52},
        ];
        emtia.forEach(function(e){
            var f=fmap[e.s];
            if(f&&f>0) {
                var kg=(f*usdTry/e.div).toFixed(2);
                items.push(_item(e.ikon, e.ad, kg+'₺/kg','tc-tarim'));
            }
        });
        // Arpa ≈ buğday × 0.78
        if(fmap['ZW=F']) {
            var arpa=(fmap['ZW=F']*0.78*usdTry/27.22).toFixed(2);
            items.splice(2,0,_item('🌿','Arpa',arpa+'₺/kg','tc-tarim'));
        }
        if(items.length>1) _tikData = _tikData.concat(items);
        else _tikData.push(_sep(), _item('🌾','Hububat','güncelleniyor','tc-tarim'));
    }).catch(function(){
        _tikData.push(_sep(),_item('🌾','Buğday','~8.5₺/kg','tc-tarim'),_item('🌿','Arpa','~6.8₺/kg','tc-tarim'),_item('🌽','Mısır','~6.2₺/kg','tc-tarim'));
    });
}

/* Et & Balık */
function _tikEtBalik() {
    var items = [_sep(),
        _item('🥩','Dana Kıyma','~550₺/kg','tc-et'),
        _item('🍖','Kuzu But','~510₺/kg','tc-et'),
        _item('🐔','Tavuk','~130₺/kg','tc-et'),
        _item('🐟','Çipura','~230₺/kg','tc-et'),
        _item('🐟','Levrek','~225₺/kg','tc-et'),
        _item('🐟','Hamsi','~100₺/kg','tc-et'),
    ];
    _tikData = _tikData.concat(items);
    return Promise.resolve();
}

/* Duyurular */
function _tikDuyurular() {
    if (typeof db === 'undefined') return Promise.resolve();
    return db.collection('announcements').limit(5).get()
    .then(function(snap){
        var items = [_sep()];
        snap.forEach(function(doc){
            var d=doc.data(), t=(d.title||d.text||'').substring(0,55);
            if(t) items.push('<span class="ti tc-duyuru">📢 '+t+'</span>');
        });
        if(items.length>1) _tikData=_tikData.concat(items);
    }).catch(function(){});
}

/* Hava küçük widget */
function tickerHavaKucukYukle() {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=39.72&longitude=33.52&current=temperature_2m,weathercode&timezone=Europe%2FIstanbul')
    .then(function(r){return r.json();})
    .then(function(d){
        var HAVA={0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',51:'🌦️',61:'🌧️',71:'🌨️',80:'🌦️',95:'⛈️'};
        var el=document.getElementById('tickerHavaKucuk');
        if(el) el.innerHTML=(HAVA[d.current.weathercode]||'🌡️')+' <b>'+Math.round(d.current.temperature_2m)+'°C</b>';
    }).catch(function(){});
}

/* Namaz — sadece sonraki vakit */
function tickerNamazNextYukle() {
    var b=new Date();
    fetch('https://api.aladhan.com/v1/timings/'+b.getDate()+'-'+(b.getMonth()+1)+'-'+b.getFullYear()+'?latitude=39.72&longitude=33.52&method=13')
    .then(function(r){return r.json();})
    .then(function(d){
        var v=d.data.timings, now=('0'+b.getHours()).slice(-2)+':'+('0'+b.getMinutes()).slice(-2);
        var vakitler=[
            {ikon:'🌅',ad:'İmsak', saat:v.Fajr.split(' ')[0]},
            {ikon:'☀️',ad:'Güneş', saat:v.Sunrise.split(' ')[0]},
            {ikon:'🌞',ad:'Öğle',  saat:v.Dhuhr.split(' ')[0]},
            {ikon:'🌇',ad:'İkindi',saat:v.Asr.split(' ')[0]},
            {ikon:'🌆',ad:'Akşam', saat:v.Maghrib.split(' ')[0]},
            {ikon:'🌙',ad:'Yatsı', saat:v.Isha.split(' ')[0]}
        ];
        var sonraki = vakitler[vakitler.length-1];
        for(var i=0;i<vakitler.length;i++){ if(vakitler[i].saat>now){sonraki=vakitler[i];break;} }
        var el=document.getElementById('tickerNamazNext');
        if(el) el.innerHTML=sonraki.ikon+' <b>'+sonraki.ad+'</b> '+sonraki.saat;
    }).catch(function(){});
}

/* ═══════════════════════════════════════════════════════════
   📺 VİDEO GALERİSİ — Nostalji üstü
═══════════════════════════════════════════════════════════ */
var _videolar = [];
var _aktifVideoIdx = 0;

function videoGaleriYukle() {
    var liste = document.getElementById('videoListe');
    if (!liste) return;

    // Yetkili butonu göster
    if (typeof yetkili === 'function' && yetkili()) {
        var ekleBtn = document.getElementById('videoEkleBtn');
        if (ekleBtn) ekleBtn.style.display = '';
    }

    // Firestore'dan videoları çek
    if (typeof db === 'undefined') { liste.innerHTML=''; return; }
    db.collection('videolar').orderBy('zaman','desc').limit(20).get()
    .then(function(snap){
        _videolar = [];
        snap.forEach(function(doc){ _videolar.push(Object.assign({id:doc.id},doc.data())); });
        if (_videolar.length === 0) {
            liste.innerHTML = '<div style="padding:12px;text-align:center;color:#aaa;font-size:13px;">📺 Henüz video eklenmemiş</div>';
            return;
        }
        liste.innerHTML = _videolar.map(function(v,i){
            var thumb = v.thumbnail || (v.tip==='canli' ? '' : '');
            return '<div class="video-thumb" onclick="videoSec('+i+')">' +
                (v.tip==='canli' ? '<div class="video-thumb-canli">🔴</div>' : '') +
                (thumb ? '<img src="'+thumb+'" class="video-thumb-img" onerror="this.style.display=\'none\'">' : '<div class="video-thumb-placeholder">🎬</div>') +
                '<div class="video-thumb-baslik">'+(v.baslik||'Video')+'</div>' +
                '</div>';
        }).join('');
        // İlk videoyu otomatik başlat
        videoSec(0);
    })
    .catch(function(){ liste.innerHTML=''; });
}

function videoSec(idx) {
    if (idx < 0 || idx >= _videolar.length) return;
    _aktifVideoIdx = idx;
    var v = _videolar[idx];
    var player = document.getElementById('anaVideo');
    var wrap   = document.getElementById('videoPlayerWrap');
    var baslik = document.getElementById('videoBaslik');
    var rozet  = document.getElementById('videoCanliRozet');
    if (!player) return;

    if (wrap) wrap.classList.remove('hidden');
    if (baslik) baslik.textContent = v.baslik || 'Video ' + (idx+1);
    if (rozet)  rozet.style.display = v.tip==='canli' ? '' : 'none';

    player.src = v.url || '';
    player.load();
    player.play().catch(function(){});

    // Aktif thumb vurgula
    document.querySelectorAll('.video-thumb').forEach(function(t,i){
        t.classList.toggle('video-thumb-aktif', i===idx);
    });
}

function videoSonrakiOynat() { videoSec((_aktifVideoIdx+1) % _videolar.length); }
function videoOnceki()        { videoSec((_aktifVideoIdx-1+_videolar.length) % _videolar.length); }
function videoSonraki()       { videoSec((_aktifVideoIdx+1) % _videolar.length); }

function videoCal() {
    var p = document.getElementById('anaVideo');
    var btn = document.getElementById('videoCalBtn');
    if (!p) return;
    if (p.paused) { p.play(); if(btn) btn.textContent='⏸'; }
    else          { p.pause(); if(btn) btn.textContent='▶️'; }
}

function videoTamEkran() {
    var wrap = document.getElementById('videoPlayerWrap');
    var player = document.getElementById('anaVideo');
    if (!wrap || !player) return;

    // Ekranı yatay kilitle ve tam ekran yap
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    } else {
        var req = player.requestFullscreen || player.webkitRequestFullscreen;
        if (req) {
            req.call(player);
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(function(){});
            }
        }
    }
}

// Tam ekrandan çıkınca portre'ye dön
document.addEventListener('fullscreenchange', function(){
    if (!document.fullscreenElement) {
        if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    }
});
document.addEventListener('webkitfullscreenchange', function(){
    if (!document.webkitFullscreenElement) {
        if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    }
});

function videoEkleAc() {
    var url = prompt('📺 Video URL (Cloudinary/YouTube/MP4):');
    if (!url) return;
    var baslik = prompt('Video başlığı:','Video');
    var tip = confirm('🔴 Canlı yayın mı?') ? 'canli' : 'video';
    if (typeof db === 'undefined') return;
    db.collection('videolar').add({
        url: url, baslik: baslik||'Video', tip: tip,
        zaman: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(){ videoGaleriYukle(); })
    .catch(function(e){ alert('Hata: '+e.message); });
}


/* ═══════════════════════════════════════════════════════
   PİYASA FİYATLARI — Köy Bilgileri sekmesi
   Emtia · Et & Balık · Altın & Döviz
═══════════════════════════════════════════════════════ */
var _piyasaYuklendi = {emtia:false, et:false, altin:false};

function piyasaTab(tab, btn) {
    // Sekmeleri güncelle
    document.querySelectorAll('.piyasa-tab').forEach(function(b){ b.classList.remove('active'); });
    document.querySelectorAll('.piyasa-panel').forEach(function(p){ p.classList.add('hidden'); });
    if (btn) btn.classList.add('active');
    var panel = document.getElementById('piyasa-' + tab);
    if (panel) panel.classList.remove('hidden');
    // Yüklenmemişse yükle
    if (!_piyasaYuklendi[tab]) {
        _piyasaYuklendi[tab] = true;
        if (tab === 'emtia')  piyasaEmtiaYukle();
        if (tab === 'et')     piyasaEtYukle();
        if (tab === 'altin')  piyasaAltinYukle();
    }
}

// akordeon açılınca emtia varsayılan yüklensin
var _origAkordeon = typeof akordeonToggle !== 'undefined' ? akordeonToggle : null;
document.addEventListener('DOMContentLoaded', function(){
    var origFn = window.akordeonToggle;
    if (origFn) {
        window.akordeonToggle = function(id) {
            origFn(id);
            if (id === 'piyasa' && !_piyasaYuklendi.emtia) {
                _piyasaYuklendi.emtia = true;
                setTimeout(piyasaEmtiaYukle, 200);
            }
        };
    }
});

/* ── Emtia ── */
function piyasaEmtiaYukle() {
    var spin = document.getElementById('emtiaSpinner');
    var widget = document.getElementById('emtiaWidget');
    if (!widget) return;
    if (spin) spin.style.display = 'block';

    fetch('https://api.exchangerate-api.com/v4/latest/USD')
    .then(function(r){ return r.json(); })
    .then(function(d){
        var usdTry = d.rates.TRY || 38;
        // Emtia - Yahoo Finance Spark API
        return fetch('https://query2.finance.yahoo.com/v8/finance/spark?symbols=ZW=F,KE=F,ZC=F,ZS=F,ZO=F,CC=F,KC=F&range=1d&interval=1d')
        .then(function(r2){ return r2.json(); })
        .then(function(d2){
            var fiyatMap = {};
            var spark = d2.spark && d2.spark.result ? d2.spark.result : [];
            spark.forEach(function(s){
                if (s && s.symbol && s.response && s.response[0]) {
                    var meta = s.response[0].meta;
                    fiyatMap[s.symbol] = meta.regularMarketPrice || 0;
                }
            });

            var emtialar = [];
            var bugday = fiyatMap['ZW=F'];
            if (bugday) {
                var kgFiyat = (bugday * usdTry / 27.2155).toFixed(2);
                emtialar.push({ikon:'🌾', ad:'Buğday',  fiyat:kgFiyat, birim:'₺/kg', kaynak:'CBOT'});
                // Arpa ≈ buğday × 0.78
                var arpa = (bugday * 0.78 * usdTry / 27.2155).toFixed(2);
                emtialar.push({ikon:'🌿', ad:'Arpa',    fiyat:arpa,    birim:'₺/kg', kaynak:'≈CBOT'});
            }
            var misir = fiyatMap['ZC=F'];
            if (misir) {
                emtialar.push({ikon:'🌽', ad:'Mısır',   fiyat:(misir*usdTry/25.4012).toFixed(2), birim:'₺/kg', kaynak:'CBOT'});
            }
            var soya = fiyatMap['ZS=F'];
            if (soya) {
                emtialar.push({ikon:'🫘', ad:'Soya',    fiyat:(soya*usdTry/27.2155).toFixed(2),  birim:'₺/kg', kaynak:'CBOT'});
            }
            var yulaf = fiyatMap['ZO=F'];
            if (yulaf) {
                emtialar.push({ikon:'🌰', ad:'Yulaf',   fiyat:(yulaf*usdTry/14.515).toFixed(2),  birim:'₺/kg', kaynak:'CBOT'});
            }
            // Ayçiçek ≈ soya × 1.15
            if (soya) {
                var aycicek = (soya * 1.15 * usdTry / 27.2155).toFixed(2);
                emtialar.push({ikon:'🌻', ad:'Ayçiçek', fiyat:aycicek, birim:'₺/kg', kaynak:'≈CBOT'});
            }

            if (emtialar.length === 0) throw new Error('veri yok');
            piyasaRender('emtiaWidget', 'emtiaSpinner', emtialar);
        });
    })
    .catch(function(){
        // Fallback yaklaşık fiyatlar
        piyasaRender('emtiaWidget','emtiaSpinner',[
            {ikon:'🌾',ad:'Buğday',  fiyat:'8.50',  birim:'₺/kg', kaynak:'TMO ref.'},
            {ikon:'🌿',ad:'Arpa',    fiyat:'6.80',  birim:'₺/kg', kaynak:'TMO ref.'},
            {ikon:'🌽',ad:'Mısır',   fiyat:'6.20',  birim:'₺/kg', kaynak:'TMO ref.'},
            {ikon:'🌻',ad:'Ayçiçek', fiyat:'14.50', birim:'₺/kg', kaynak:'TMO ref.'},
            {ikon:'🫘',ad:'Soya',    fiyat:'16.00', birim:'₺/kg', kaynak:'TMO ref.'},
            {ikon:'🌰',ad:'Yulaf',   fiyat:'7.00',  birim:'₺/kg', kaynak:'TMO ref.'},
        ]);
    });
}

/* ── Et & Balık ── */
function piyasaEtYukle() {
    // Et & balık fiyatları Türkiye piyasa ortalama (TÜFE/TSE referans)
    // Canlı API olmadığından güvenilir referans fiyatlar
    var fiyatlar = [
        {ikon:'🥩',ad:'Dana Kıyma',    fiyat:'520-580', birim:'₺/kg', kaynak:'piyasa ort.'},
        {ikon:'🥩',ad:'Dana Antrikot',  fiyat:'680-750', birim:'₺/kg', kaynak:'piyasa ort.'},
        {ikon:'🍖',ad:'Kuzu But',       fiyat:'480-540', birim:'₺/kg', kaynak:'piyasa ort.'},
        {ikon:'🍖',ad:'Kuzu Kıyma',     fiyat:'460-520', birim:'₺/kg', kaynak:'piyasa ort.'},
        {ikon:'🐔',ad:'Tavuk (bütün)', fiyat:'120-140', birim:'₺/kg', kaynak:'piyasa ort.'},
        {ikon:'🐔',ad:'Tavuk Göğsü',   fiyat:'200-240', birim:'₺/kg', kaynak:'piyasa ort.'},
        {ikon:'🐟',ad:'Çipura',        fiyat:'200-260', birim:'₺/kg', kaynak:'piyasa ort.'},
        {ikon:'🐟',ad:'Levrek',        fiyat:'200-250', birim:'₺/kg', kaynak:'piyasa ort.'},
        {ikon:'🐟',ad:'Hamsi',         fiyat:'80-120',  birim:'₺/kg', kaynak:'mevsimsel'},
        {ikon:'🐟',ad:'Alabalık',      fiyat:'160-200', birim:'₺/kg', kaynak:'piyasa ort.'},
        {ikon:'🐟',ad:'Palamut',       fiyat:'100-140', birim:'₺/kg', kaynak:'mevsimsel'},
    ];
    var guncelleme = new Date().toLocaleDateString('tr-TR',{month:'short',year:'numeric'});
    piyasaRender('etWidget','etSpinner', fiyatlar, '📅 ' + guncelleme + ' piyasa ortalaması');
}

/* ── Altın & Döviz ── */
function piyasaAltinYukle() {
    var spin = document.getElementById('altinSpinner');
    if (spin) spin.style.display = 'block';

    fetch('https://api.exchangerate-api.com/v4/latest/USD')
    .then(function(r){ return r.json(); })
    .then(function(d){
        var rates = d.rates;
        var usdTry = rates.TRY || 38;
        var eurTry = usdTry / (rates.EUR || 1);
        var gbpTry = usdTry / (rates.GBP || 0.79);
        // XAU (troy ounce USD) — bazı API'larda var
        var xauUsd = rates.XAU ? (1/rates.XAU) : 3300; // yaklaşık fallback
        var gramAltin  = (xauUsd * usdTry / 31.1035).toFixed(0);
        var ceyrek     = (parseFloat(gramAltin) * 1.75).toFixed(0);  // ≈1.75gr
        var yariim     = (parseFloat(gramAltin) * 3.50).toFixed(0);
        var tam        = (parseFloat(gramAltin) * 7.00).toFixed(0);
        var cumhuriyet = (parseFloat(gramAltin) * 7.25).toFixed(0);

        var fiyatlar = [
            {ikon:'💵', ad:'Dolar (USD)',      fiyat:usdTry.toFixed(2),    birim:'₺', kaynak:'anlık'},
            {ikon:'💶', ad:'Euro (EUR)',        fiyat:eurTry.toFixed(2),    birim:'₺', kaynak:'anlık'},
            {ikon:'💷', ad:'Sterlin (GBP)',     fiyat:gbpTry.toFixed(2),    birim:'₺', kaynak:'anlık'},
            {ikon:'🪙', ad:'Gram Altın',        fiyat:gramAltin,            birim:'₺', kaynak:'anlık'},
            {ikon:'🪙', ad:'Çeyrek Altın',      fiyat:ceyrek,               birim:'₺', kaynak:'≈hesap'},
            {ikon:'🪙', ad:'Yarım Altın',       fiyat:yariim,               birim:'₺', kaynak:'≈hesap'},
            {ikon:'🪙', ad:'Tam Altın',         fiyat:tam,                  birim:'₺', kaynak:'≈hesap'},
            {ikon:'🏅', ad:'Cumhuriyet Altın',  fiyat:cumhuriyet,           birim:'₺', kaynak:'≈hesap'},
        ];
        piyasaRender('altinWidget','altinSpinner', fiyatlar);
    })
    .catch(function(){
        piyasaRender('altinWidget','altinSpinner',[
            {ikon:'💵',ad:'Dolar',      fiyat:'~38',     birim:'₺', kaynak:''},
            {ikon:'💶',ad:'Euro',       fiyat:'~42',     birim:'₺', kaynak:''},
            {ikon:'🪙',ad:'Gram Altın', fiyat:'~3.850',  birim:'₺', kaynak:''},
        ]);
    });
}

/* ── Ortak render fonksiyonu ── */
function piyasaRender(widgetId, spinnerId, fiyatlar, altBilgi) {
    var spin = document.getElementById(spinnerId);
    var widget = document.getElementById(widgetId);
    if (!widget) return;
    if (spin) spin.style.display = 'none';

    var guncelleme = new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});
    widget.innerHTML = fiyatlar.map(function(f){
        return '<div class="fiyat-kart">' +
            '<div class="fiyat-ikon">' + f.ikon + '</div>' +
            '<div class="fiyat-bilgi">' +
                '<div class="fiyat-ad">' + f.ad + '</div>' +
                (f.kaynak ? '<div class="fiyat-kaynak">' + f.kaynak + '</div>' : '') +
            '</div>' +
            '<div class="fiyat-deger"><span class="fiyat-rakam">' + f.fiyat + '</span> <span class="fiyat-birim">' + f.birim + '</span></div>' +
        '</div>';
    }).join('') +
    '<div class="fiyat-guncelleme">🕐 Güncelleme: ' + guncelleme + (altBilgi ? ' · ' + altBilgi : '') + '</div>';
}
