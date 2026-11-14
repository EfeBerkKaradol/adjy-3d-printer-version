/* ==========================================================================
   ADJY KÖPRÜSÜ

   Tasarım araçları kendi başına çalışan sayfalar; mağaza ise onları bir
   çerçevenin içinde gösteriyor. Bu dosya ikisinin arasındaki tek bağ.

   İki kipte çalışır ve kipi adres belirler, sorgu parametresi değil:

     /tasarim-araclari/...      → müşteri. Yalnızca ürünü biçimlendiren
                                  kontroller ve model görünür.
     /admin/uretim-araci/...    → atölye. STL, pafta ve maliyet dâhil her
                                  şey açık. Bu adres admin oturumu olmadan
                                  sunulmuyor (middleware).

   Aracın kendi koduna dokunmaz: durumu form alanlarından okur, geri
   yüklerken aynı alanlara yazıp aracın zaten dinlediği olayları tetikler.
   Böylece araç güncellendiğinde köprünün yeniden yazılması gerekmez.

   Her aracın ayarı index.html'de bu dosyadan ÖNCE tanımlanır:
     window.ADJY_ARAC = { id, gruplar, olcum, etiketler, ... }
   ========================================================================== */
(function () {
  "use strict";

  var AYAR = window.ADJY_ARAC || {};
  var html = document.documentElement;
  var URETIM = location.pathname.indexOf("/admin/") === 0;
  var sorgu = new URLSearchParams(location.search);

  html.setAttribute("data-adjy-mod", URETIM ? "uretim" : "musteri");
  html.setAttribute("data-adjy-arac", AYAR.id || "");

  // ---------- TEMA ----------
  // Aracın kendi tema düğmesi gizli; tema mağazadan gelir.
  // Bazı araçlar 3B sahnenin renklerini de temaya göre kuruyor; onlarda
  // öznitelik yetmez, aracın kendi tema düğmesine basmak gerekir.
  var aracTemasi = AYAR.tema ? AYAR.tema.ilk : null;
  var yuklendi = false;

  function temaUygula(tema) {
    var koyu = tema === "koyu";
    html.setAttribute("data-adjy-tema", koyu ? "koyu" : "acik");
    if (AYAR.tema && AYAR.tema.oznitelik) {
      var hedef = koyu ? AYAR.tema.koyu : AYAR.tema.acik;
      var dugme = AYAR.tema.dugme && yuklendi ? document.querySelector(AYAR.tema.dugme) : null;
      if (dugme) {
        if (aracTemasi !== hedef) {
          dugme.click();
          aracTemasi = hedef;
        }
      } else if (!AYAR.tema.dugme || !yuklendi) {
        html.setAttribute(AYAR.tema.oznitelik, hedef);
      }
    }
    try {
      window.dispatchEvent(new CustomEvent("adjy:tema", { detail: { koyu: koyu } }));
    } catch (e) { /* yok say */ }
  }
  temaUygula(sorgu.get("tema") === "koyu" ? "koyu" : "acik");

  // ---------- MÜŞTERİ KİPİNDE İNDİRME YOK ----------
  // Araçların bütün çıktıları (STL, pafta, tablo) geçici bir bağlantıya
  // "tıklanarak" iniyor. Müşteri kipinde bu tıklama hiçbir şey yapmaz:
  // çıktı düğmeleri gizli, ama gizliliği aşan biri de dosya alamasın.
  if (!URETIM) {
    var asilTikla = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.hasAttribute("download")) return;
      return asilTikla.call(this);
    };
  }

  // ---------- EKRAN GÖRÜNTÜSÜ ----------
  // WebGL tamponu çizimden sonra boşaltılır; sepetteki küçük görsel için
  // tamponun korunması gerekiyor.
  var asilGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (tur, secenek) {
    if (tur === "webgl" || tur === "webgl2" || tur === "experimental-webgl") {
      secenek = Object.assign({}, secenek || {}, { preserveDrawingBuffer: true });
    }
    return asilGetContext.call(this, tur, secenek);
  };

  function gorsel(genislik) {
    var tuvaller = Array.prototype.slice.call(document.querySelectorAll("canvas"));
    var enBuyuk = null;
    var alan = 0;
    tuvaller.forEach(function (c) {
      var r = c.getBoundingClientRect();
      if (r.width * r.height > alan && c.width > 0) {
        alan = r.width * r.height;
        enBuyuk = c;
      }
    });
    if (!enBuyuk) return null;
    try {
      var g = genislik || 640;
      // Kare kırpım: kartlar ve sepet küçük görseli kare kullanıyor.
      var kenar = Math.min(enBuyuk.width, enBuyuk.height);
      var sx = (enBuyuk.width - kenar) / 2;
      var sy = (enBuyuk.height - kenar) / 2;
      var t = document.createElement("canvas");
      t.width = g;
      t.height = g;
      var ctx = asilGetContext.call(t, "2d");
      ctx.fillStyle = html.getAttribute("data-adjy-tema") === "koyu" ? "#1b1c20" : "#EBE9E3";
      ctx.fillRect(0, 0, g, g);
      ctx.drawImage(enBuyuk, sx, sy, kenar, kenar, 0, 0, g, g);
      return t.toDataURL("image/jpeg", 0.86);
    } catch (e) {
      return null;
    }
  }

  // ---------- ALANLAR ----------
  var GIZLI = (AYAR.gizle || []).join(",");

  // Üretici bölümleri sayfa çizilmeden gizlenir; müşteri bir an bile görmez.
  // Aynı liste özetten de düşülür: gizlenen alan sipariş metnine yazılmaz.
  if (GIZLI) {
    var stil = document.createElement("style");
    stil.textContent = (AYAR.gizle || [])
      .map(function (sec) {
        return 'html[data-adjy-mod="musteri"] ' + sec;
      })
      .join(",") + "{display:none!important}";
    document.head.appendChild(stil);
  }
  var HARIC = AYAR.durumHaric || [];

  /** Üretici bölümünün içinde mi — müşteri özetine girmez */
  function ureticiMi(el) {
    if (!GIZLI) return false;
    // Üretici panelinde durduğu hâlde müşterinin seçtiği alanlar (malzeme)
    if ((AYAR.musteriAlanlari || []).indexOf(el.id) !== -1) return false;
    try {
      return !!el.closest(GIZLI);
    } catch (e) {
      return false;
    }
  }

  function alanlar() {
    // Durumu form alanlarında değil kendi veri yapısında tutan araçlar
    // (modüler dolap) kaydı durumOku/durumYaz ile taşır.
    if (AYAR.alanYok) return [];
    return Array.prototype.slice
      .call(document.querySelectorAll("input[id], select[id], textarea[id]"))
      .filter(function (el) {
        if (el.type === "file" || el.type === "button" || el.type === "submit" || el.type === "hidden") return false;
        if (HARIC.indexOf(el.id) !== -1) return false;
        return true;
      });
  }

  function alanDegeri(el) {
    if (el.type === "checkbox") return !!el.checked;
    if (el.type === "radio") return !!el.checked;
    return el.value;
  }

  function temizMetin(s) {
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  /** Alanın insanın okuyacağı adı */
  function anahtar(id) {
    return String(id)
      .replace(/^(num|rng|sel|chk|inp|val|clr|range|slider|input|txt|opt)[-_]/i, "")
      .replace(/[-_](num|rng|range)$/i, "");
  }

  function ayardan(harita, el) {
    if (!harita) return undefined;
    if (harita[el.id] !== undefined) return harita[el.id];
    return harita[anahtar(el.id)];
  }

  function etiket(el) {
    var ozel = ayardan(AYAR.etiketler, el);
    if (ozel) return ozel;
    var lbl = document.querySelector('label[for="' + el.id + '"]') || el.closest("label");
    if (lbl) {
      var tr = lbl.querySelector(AYAR.etiketSecici || ".param-tr, .lbl-tr, .ctrl-name, .label-text");
      if (tr) return temizMetin(tr.textContent);
      var kopya = lbl.cloneNode(true);
      Array.prototype.slice
        .call(kopya.querySelectorAll("code, input, select, textarea, output, .unit, .val, .value, small"))
        .forEach(function (n) { n.remove(); });
      var m = temizMetin(kopya.textContent);
      if (m) return m;
    }
    var sarmal = el.closest(AYAR.kontrolSarmal || ".param-control, .ctrl-row, .control-row, .field, .param-row");
    if (sarmal) {
      var bas = sarmal.querySelector(
        AYAR.etiketSecici || ".param-tr, .lbl-tr, .ctrl-name, .label-text, label, .param-label"
      );
      if (bas) {
        var k2 = bas.cloneNode(true);
        Array.prototype.slice
          .call(k2.querySelectorAll("code, input, select, output, .unit, .val, .value, small"))
          .forEach(function (n) { n.remove(); });
        var m2 = temizMetin(k2.textContent);
        if (m2) return m2;
      }
    }
    return el.getAttribute("aria-label") || el.title || el.id;
  }

  function birim(el) {
    var ozel = ayardan(AYAR.birimler, el);
    if (ozel !== undefined) return ozel;
    var sarmal = el.closest(".num-wrap, .param-control, .ctrl-row, .control-row, .field, .param-row");
    var u = sarmal && sarmal.querySelector(".unit");
    return u ? temizMetin(u.textContent) : "";
  }

  function okunurDeger(el) {
    if (el.tagName === "SELECT") {
      var o = el.options[el.selectedIndex];
      return o ? temizMetin(o.textContent) : el.value;
    }
    if (el.type === "checkbox" || el.type === "radio") return el.checked ? "Evet" : "Hayır";
    var v = String(el.value);
    if (v === "") return "";
    var b = birim(el);
    return b ? v + " " + b : v;
  }

  // ---------- DÜĞME GRUPLARI ----------
  // { kap, oz, etiket, gorunum, sinif } — gorunum: kamera/gösterim, özete girmez
  function grupDurumu(g) {
    var kap = document.querySelector(g.kap);
    if (!kap) return null;
    var sinif = g.sinif || "active";
    var aktif = kap.querySelector("[" + g.oz + "]." + sinif);
    if (!aktif && g.basili) aktif = kap.querySelector("[" + g.oz + '][aria-pressed="true"]');
    if (!aktif) return null;
    // Düğmenin içinde hem kısa ad hem açıklama varsa hangisinin özete
    // gireceğini ayar söyler (metinSec).
    var kaynak = g.metinSec ? aktif.querySelector(g.metinSec) : null;
    return {
      deger: aktif.getAttribute(g.oz),
      metin: temizMetin(
        kaynak
          ? kaynak.textContent
          : aktif.getAttribute("title") || aktif.getAttribute("aria-label") || aktif.textContent
      ),
    };
  }

  // ---------- ÖLÇÜM ----------
  function sayiOku(metin, desen) {
    if (!metin) return null;
    var m = desen ? new RegExp(desen).exec(metin) : /(-?[\d.,]+)/.exec(metin);
    if (!m) return null;
    var s = m[1];
    // "1.234,5" → 1234.5 ; "1,5" → 1.5 ; "1.234" (binlik) korunmaz, ondalık sayılır
    if (s.indexOf(",") !== -1 && s.indexOf(".") !== -1) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(",", ".");
    var n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  function olcumOku(t) {
    if (!t) return null;
    if (typeof t.oku === "function") {
      try { return t.oku(); } catch (e) { return null; }
    }
    var el = document.querySelector(t.sec);
    if (!el) return null;
    var n = sayiOku(el.textContent, t.desen);
    if (n === null) return null;
    return n * (t.carpan || 1);
  }

  function olcum() {
    var o = AYAR.olcum || {};
    var sonuc = {};
    Object.keys(o).forEach(function (k) {
      var v = olcumOku(o[k]);
      if (v !== null) sonuc[k] = Math.round(v * 100) / 100;
    });
    return sonuc;
  }

  // ---------- DOSYALAR ----------
  // Müşterinin yüklediği fotoğraf ya da model: sipariş verildiğinde atölyenin
  // aynı dosyaya ihtiyacı var, yoksa yapılandırma yeniden kurulamaz.
  //
  // Araçlar dosyayı okur okumaz girişi boşaltıyor; bu yüzden olay yakalama
  // aşamasında, aracın kendi dinleyicisinden önce okunur.
  var dosyalar = {}; // inputId → [{ dosya, url, ad, boyut }]
  var COKLU = !!AYAR.cokluDosya;

  function dosyaEkle(id, liste) {
    var yeniler = Array.prototype.slice.call(liste || []).map(function (f) {
      return { dosya: f, url: null, ad: f.name, boyut: f.size };
    });
    if (yeniler.length === 0) return;
    dosyalar[id] = COKLU ? (dosyalar[id] || []).concat(yeniler) : [yeniler[0]];
  }

  document.addEventListener(
    "change",
    function (e) {
      var el = e.target;
      if (!el || el.type !== "file" || !el.id) return;
      if (el.__adjyYukleniyor) return;
      if ((AYAR.dosyaHaric || []).indexOf(el.id) !== -1) return;
      dosyaEkle(el.id, el.files);
    },
    true
  );

  // Sürükle-bırak dosya girişini atlıyor; aynı kayda düşsün.
  document.addEventListener(
    "drop",
    function (e) {
      if (!AYAR.dosyaGirisi || !e.dataTransfer || !e.dataTransfer.files) return;
      dosyaEkle(AYAR.dosyaGirisi, e.dataTransfer.files);
      planla();
    },
    true
  );

  /** Araç dosyayı bıraktıysa (model temizlendi, örnek seçildi) kayıt da silinir */
  function dosyalariBirak(id) {
    if (id) delete dosyalar[id];
    else dosyalar = {};
  }

  function dosyaOzeti() {
    var o = {};
    Object.keys(dosyalar).forEach(function (id) {
      o[id] = dosyalar[id].map(function (d) {
        return { ad: d.ad, boyut: d.boyut, url: d.url };
      });
    });
    return o;
  }

  function dosyaSayisi() {
    var n = 0;
    Object.keys(dosyalar).forEach(function (id) { n += dosyalar[id].length; });
    return n;
  }

  /** Bekleyen dosyaları depoya gönderir; sepete eklemeden önce çağrılır */
  function dosyalariYukle() {
    var bekleyen = [];
    Object.keys(dosyalar).forEach(function (id) {
      dosyalar[id].forEach(function (d) {
        if (!d.url && d.dosya) bekleyen.push(d);
      });
    });
    if (bekleyen.length === 0) return Promise.resolve(dosyaOzeti());

    return fetch("/api/upload-model", { method: "POST" })
      .then(function (r) {
        if (!r.ok) throw new Error("Dosya yükleme şu an kullanılamıyor");
        return r.json();
      })
      .then(function (imza) {
        return Promise.all(
          bekleyen.map(function (d) {
            var fd = new FormData();
            fd.append("file", d.dosya);
            fd.append("api_key", imza.apiKey);
            fd.append("timestamp", String(imza.timestamp));
            fd.append("signature", imza.signature);
            fd.append("folder", imza.folder);
            return fetch("https://api.cloudinary.com/v1_1/" + imza.cloudName + "/raw/upload", {
              method: "POST",
              body: fd,
            })
              .then(function (r) {
                if (!r.ok) throw new Error("Dosya yüklenemedi: " + d.ad);
                return r.json();
              })
              .then(function (yanit) {
                d.url = yanit.secure_url;
              });
          })
        );
      })
      .then(dosyaOzeti);
  }

  /** Kayıtlı dosyaları indirip aynı girişe geri koyar (atölye tarafı) */
  function dosyaGeriYukle(id, kayitlar) {
    var el = document.getElementById(id);
    var liste = (Array.isArray(kayitlar) ? kayitlar : [kayitlar]).filter(function (k) {
      return k && k.url;
    });
    if (!el || liste.length === 0) return Promise.resolve(false);
    return Promise.all(
      liste.map(function (kayit) {
        return fetch(kayit.url)
          .then(function (r) {
            if (!r.ok) throw new Error("indirilemedi");
            return r.blob();
          })
          .then(function (blob) {
            return {
              dosya: new File([blob], kayit.ad || "dosya", { type: blob.type }),
              url: kayit.url,
              ad: kayit.ad,
              boyut: kayit.boyut,
            };
          });
      })
    )
      .then(function (hazirlar) {
        var dt = new DataTransfer();
        hazirlar.forEach(function (h) { dt.items.add(h.dosya); });
        el.__adjyYukleniyor = true;
        el.files = dt.files;
        dosyalar[id] = hazirlar;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.__adjyYukleniyor = false;
        return true;
      })
      .catch(function () {
        return false;
      });
  }

  // ---------- DURUM ----------
  function durum() {
    var a = {};
    alanlar().forEach(function (el) {
      if (el.type === "radio" && !el.checked) return;
      a[el.id] = alanDegeri(el);
    });
    var g = {};
    (AYAR.gruplar || []).forEach(function (grup) {
      var d = grupDurumu(grup);
      if (d) g[grup.kap + "|" + grup.oz] = d.deger;
    });
    var ek = null;
    if (typeof AYAR.durumOku === "function") {
      try { ek = AYAR.durumOku(); } catch (e) { ek = null; }
    }
    return { surum: 1, alanlar: a, gruplar: g, dosyalar: dosyaOzeti(), ek: ek };
  }

  /** Atölyenin okuyacağı metin: müşterinin seçtiği her şey, satır satır */
  function ozet() {
    var satirlar = [];
    var gorulen = {};
    function ekle(ad, deger) {
      ad = temizMetin(ad);
      deger = temizMetin(deger);
      if (!ad || deger === "" || gorulen[ad]) return;
      gorulen[ad] = true;
      satirlar.push({ ad: ad, deger: deger });
    }
    (AYAR.gruplar || []).forEach(function (grup) {
      if (grup.gorunum || !grup.etiket) return;
      var d = grupDurumu(grup);
      if (d) ekle(grup.etiket, d.metin);
    });
    alanlar().forEach(function (el) {
      if (ureticiMi(el)) return;
      if ((AYAR.ozetHaric || []).indexOf(el.id) !== -1) return;
      if ((AYAR.ozetHaric || []).indexOf(anahtar(el.id)) !== -1) return;
      if (el.type === "radio" && !el.checked) return;
      if (el.type === "checkbox" && !el.checked && !AYAR.kutularHep) return;
      ekle(etiket(el), okunurDeger(el));
    });
    Object.keys(dosyalar).forEach(function (id) {
      var adlar = dosyalar[id].map(function (d) { return d.ad; }).join(", ");
      ekle((AYAR.etiketler && AYAR.etiketler[id]) || "Yüklenen dosya", adlar);
    });
    if (typeof AYAR.ozetEk === "function") {
      try {
        (AYAR.ozetEk() || []).forEach(function (s) { ekle(s.ad, s.deger); });
      } catch (e) { /* yok say */ }
    }
    return satirlar;
  }

  function olay(el, tur) {
    el.dispatchEvent(new Event(tur, { bubbles: true }));
  }

  function alanlariYaz(a, atla) {
    // Kaydırıcılar önce, sayı alanları sonra: bazı araçlarda kaydırıcının
    // adımı sayı alanından kaba, son sözü sayı alanı söylemeli.
    var kimlikler = Object.keys(a || {}).sort(function (x, y) {
      var ex = document.getElementById(x);
      var ey = document.getElementById(y);
      var rx = ex && ex.type === "range" ? 0 : 1;
      var ry = ey && ey.type === "range" ? 0 : 1;
      return rx - ry;
    });
    kimlikler.forEach(function (id) {
      if (atla && atla.indexOf(id) !== -1) return;
      var el = document.getElementById(id);
      if (!el || el.type === "file") return;
      var v = a[id];
      if (el.type === "checkbox" || el.type === "radio") {
        if (el.checked === !!v) return;
        el.checked = !!v;
        olay(el, "input");
        olay(el, "change");
        return;
      }
      if (String(el.value) === String(v)) return;
      el.value = v;
      olay(el, "input");
      olay(el, "change");
    });
  }

  function gruplariYaz(g) {
    (AYAR.gruplar || []).forEach(function (grup) {
      if (grup.yazma) return; // hazır şablonlar: değerleri zaten alanlar taşıyor
      var deger = (g || {})[grup.kap + "|" + grup.oz];
      if (deger === undefined || deger === null) return;
      var kap = document.querySelector(grup.kap);
      if (!kap) return;
      var hedef = kap.querySelector("[" + grup.oz + '="' + String(deger).replace(/"/g, '\\"') + '"]');
      var sinif = grup.sinif || "active";
      if (hedef && !hedef.classList.contains(sinif)) hedef.click();
    });
  }

  var yukleniyor = false;

  function yukle(d) {
    if (!d || typeof d !== "object") return Promise.resolve(false);
    yukleniyor = true;
    var bekle = function (ms) {
      return new Promise(function (r) { setTimeout(r, ms); });
    };
    var dosyaKimlikleri = Object.keys(d.dosyalar || {}).filter(function (id) {
      var k = d.dosyalar[id];
      return (Array.isArray(k) ? k : [k]).some(function (x) { return x && x.url; });
    });
    // Dosya yüklendiyse, hazır örnek seçen alan yazılmaz: yazılırsa araç
    // örneği yeniden yükleyip müşterinin dosyasının üstüne koyar.
    var atla = dosyaKimlikleri.length ? AYAR.dosyaVarkenAtla || [] : [];
    function dosyalariKoy() {
      return Promise.all(
        dosyaKimlikleri.map(function (id) { return dosyaGeriYukle(id, d.dosyalar[id]); })
      ).then(function () { return bekle(dosyaKimlikleri.length ? 900 : 0); });
    }
    function ek() {
      if (typeof AYAR.durumYaz === "function" && d.ek) {
        try { return Promise.resolve(AYAR.durumYaz(d.ek)); } catch (e) { /* yok say */ }
      }
      return Promise.resolve();
    }
    var dosyaOnce = AYAR.dosyaSirasi === "ilk";
    return (dosyaOnce ? dosyalariKoy() : Promise.resolve())
      .then(function () {
        gruplariYaz(d.gruplar);
        alanlariYaz(d.alanlar, atla);
        return bekle(350);
      })
      .then(function () {
        // İkinci geçiş: bir alan diğerinin sınırını değiştiriyorsa ilk yazım
        // kırpılmış olabilir.
        gruplariYaz(d.gruplar);
        alanlariYaz(d.alanlar, atla);
        return bekle(300);
      })
      .then(function () { return dosyaOnce ? null : dosyalariKoy(); })
      .then(ek)
      .then(function () {
        // Dosya ya da ek durum (model dönüşü gibi) ölçüleri sıfırlamış
        // olabilir; son söz kayıttaki değerlerin.
        if (!dosyaKimlikleri.length && !d.ek) return null;
        return bekle(300).then(function () {
          alanlariYaz(d.alanlar, atla);
          return bekle(300);
        });
      })
      .then(function () {
        yukleniyor = false;
        sonGonderilen = "";
        bildir();
        return true;
      });
  }

  // ---------- MAĞAZAYA BİLDİRİM ----------
  var zamanlayici = null;
  var sonGonderilen = "";

  function paket() {
    return { durum: durum(), ozet: ozet(), olcum: olcum() };
  }

  function bildir() {
    musteriMetinleri();
    if (yukleniyor || window.parent === window) return;
    var p = paket();
    var imza = JSON.stringify(p);
    if (imza === sonGonderilen) return;
    sonGonderilen = imza;
    window.parent.postMessage(
      { kaynak: "adjy-arac", tur: "durum", arac: AYAR.id, veri: p },
      location.origin
    );
  }

  function planla() {
    clearTimeout(zamanlayici);
    zamanlayici = setTimeout(bildir, 350);
    // Bazı araçlar modeli gecikmeli kuruyor; ölçüm o zaman değişir.
    setTimeout(bildir, 1400);
  }

  ["input", "change", "click", "pointerup", "keyup"].forEach(function (t) {
    document.addEventListener(t, planla, true);
  });

  // ---------- ÇIKTILAR (atölye) ----------
  function tikla(secici) {
    if (!URETIM) return false;
    var el = document.querySelector(secici);
    if (!el) return false;
    el.click();
    return true;
  }

  // ---------- DIŞA AÇILAN ARAYÜZ ----------
  window.ADJY = {
    uretim: URETIM,
    durum: durum,
    ozet: ozet,
    olcum: olcum,
    paket: paket,
    yukle: yukle,
    gorsel: gorsel,
    tema: temaUygula,
    tikla: tikla,
    dosyalariYukle: dosyalariYukle,
    dosyaVar: function (id) { return !!(dosyalar[id] && dosyalar[id].length); },
    dosyaSayisi: dosyaSayisi,
    dosyalariBirak: dosyalariBirak,
    hazirMi: function () {
      if (typeof AYAR.hazirMi !== "function") return yuklendi;
      try { return !!AYAR.hazirMi(); } catch (e) { return false; }
    },
  };

  /**
   * Araçlar mühendis için yazılmış: etiketlerin çoğu değişken adı
   * ("Avize_Capi_mm"). Müşteriye aynı alan okunur adıyla gösterilir;
   * atölye kipinde özgün adlar kalır, çünkü pafta ve STL adları onlarla
   * eşleşiyor.
   */
  /**
   * Düğme ve seçenek adlarındaki değişken adları ("Rect_Card"). Her iki
   * kipte de çevrilir: sipariş metni müşteri kipinde bu adlarla yazılıyor,
   * atölye kipindeki doğrulama aynı metni üretebilmeli.
   */
  function ceviriUygula() {
    var ceviri = AYAR.ceviri;
    if (!ceviri) return;
    Array.prototype.slice
      .call(document.querySelectorAll("label, span, strong, b, button, h2, h3, h4, div, p, summary"))
      .forEach(function (n) {
        if (n.children.length > 0) return;
        var t = (n.textContent || "").trim();
        if (t && Object.prototype.hasOwnProperty.call(ceviri, t)) n.textContent = ceviri[t];
      });
  }

  function musteriMetinleri() {
    ceviriUygula();
    if (URETIM) return;
    var harita = AYAR.etiketler || {};
    var sarmalSec = AYAR.kontrolSarmal || ".param-control, .param-row, .param-field, .param-group, .ctrl-row, .field";
    var etiketSec = AYAR.gorunenEtiket || ".param-label, .param-tr, .param-code, .param-key";
    function yaz(hedef, ad) {
      // Bazı araçlar etiketi kendisi yeniden yazıyor (şekil değişince);
      // metin farklıysa yeniden çevrilir.
      if (hedef.textContent !== ad) hedef.textContent = ad;
      hedef.classList.add("adjy-etiket");
    }
    alanlar().forEach(function (el) {
      var ad = ayardan(harita, el);
      if (!ad) return;
      var lbl = document.querySelector('label[for="' + el.id + '"]');
      if (lbl) {
        var ic = lbl.querySelector(etiketSec);
        yaz(ic || lbl, ad);
        return;
      }
      var sarmal = el.closest(sarmalSec);
      if (!sarmal) return;
      // Aynı sarmaldaki eş alan (kaydırıcı + sayı) etiketi zaten çevirdiyse
      if (sarmal.querySelector(".adjy-etiket")) return;
      var hedef = sarmal.querySelector(etiketSec);
      if (hedef) yaz(hedef, ad);
    });
    // Form alanına bağlı olmayan etiketler (dosya girişi, düğme grubu)
    Object.keys(harita).forEach(function (kimlik) {
      var l = document.querySelector('label[for="' + kimlik + '"]');
      if (l && !l.classList.contains("adjy-etiket")) yaz(l.querySelector(etiketSec) || l, harita[kimlik]);
    });
    (AYAR.metinler || []).forEach(function (m) {
      Array.prototype.slice.call(document.querySelectorAll(m.sec)).forEach(function (n) {
        if (n.textContent !== m.metin) n.textContent = m.metin;
      });
    });
  }

  function hazirBildir() {
    if (window.parent === window) return;
    window.parent.postMessage({ kaynak: "adjy-arac", tur: "hazir", arac: AYAR.id }, location.origin);
  }

  function hazir() {
    yuklendi = true;
    musteriMetinleri();
    if (typeof AYAR.hazir === "function") {
      try { AYAR.hazir({ uretim: URETIM }); } catch (e) { /* yok say */ }
    }
    // Model CDN'den gelen modüller yüklenince kuruluyor; ölçüm o zamana
    // kadar boş ya da sayfadaki örnek değerdir.
    var deneme = 0;
    var bildirildi = false;
    var t = setInterval(function () {
      deneme += 1;
      var tamam = true;
      if (typeof AYAR.hazirMi === "function") {
        try { tamam = !!AYAR.hazirMi(); } catch (e) { tamam = false; }
      }
      if (tamam || deneme > 40) {
        if (!bildirildi) {
          bildirildi = true;
          temaUygula(html.getAttribute("data-adjy-tema"));
          musteriMetinleri();
          window.dispatchEvent(new Event("resize"));
          hazirBildir();
        }
        bildir();
      }
      if (deneme > 60) clearInterval(t);
    }, 400);
  }

  if (document.readyState === "complete") hazir();
  else window.addEventListener("load", hazir);

  // Mağaza çerçeveyi yeniden boyutlandırınca araç tuvalini güncellesin.
  window.addEventListener("message", function (e) {
    if (e.origin !== location.origin || !e.data || e.data.kaynak !== "adjy-magaza") return;
    if (e.data.tur === "tema") temaUygula(e.data.tema);
    if (e.data.tur === "boyut") window.dispatchEvent(new Event("resize"));
  });
})();
