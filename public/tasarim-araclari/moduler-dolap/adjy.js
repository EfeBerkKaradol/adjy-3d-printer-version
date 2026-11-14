/* Oda ve modüler dolap maketi — mağaza köprüsü ayarı */

// Araç son taslağı tarayıcıda saklayıp açılışta geri yüklüyor. Atölye
// tarafında bu istenmez: açılan her sipariş kendi kaydıyla kurulmalı,
// bir önceki siparişin kalıntısıyla değil.
if (location.pathname.indexOf("/admin/") === 0) {
  try {
    localStorage.removeItem("oda_cad_autosave_v2");
  } catch (e) {
    /* depolama kapalıysa yapacak bir şey yok */
  }
}

window.ADJY_ARAC = {
  id: "moduler-dolap",

  // Araçtaki başlıklar değişken adı; okunur adla gösterilir
  ceviri: {
      "Adim_01_Oda_Secimi_ve_Olcek": "1 · Oda ve ölçek",
      "Aktif_Oda_Modulu": "Oda",
      "Hazir_Oda_ve_Modul_Ornekleri": "Hazır örnekler",
      "Oda_Kabuk_Tipi": "Oda kabuğu",
      "Oda_Buyut_Kucult (Duvarlar Modülleri Taşır)": "Odayı büyüt / küçült",
      "Baski_Olcegi": "Maket ölçeği",
      "Adim_02_Parametrik_Dolap_ve_Sehpa": "2 · Dolap ve sehpa",
      "Odaya_Yeni_Modul_Ekle": "Odaya modül ekle",
      "Odadaki_Moduller (Tıkla & Düzenle)": "Odadaki modüller",
      "Modul_Tipi_Degistir": "Modül tipi",
      "Genislik_mm": "Genişlik (mm)",
      "Derinlik_mm": "Derinlik (mm)",
      "Yukseklik_mm": "Yükseklik (mm)",
      "Govde_ve_Kapak_Malzemesi": "Gövde ve kapak",
      "Tezgah_ve_Sehpa_Yuzeyi": "Tezgâh ve sehpa yüzeyi",
      "Oda_Ici_Duvar_Miknatislama": "Duvara yasla",
      "Yon_Dondur": "Döndür",
      "Yerden_Yukseklik_Y_mm (Üst Dolap Kotu)": "Yerden yükseklik (mm)",
      "Adim_02B_Oda_Boyutu_ve_Baski_DFM": "3 · Oda boyutu",
      "Oda_En_mm": "Oda eni (mm)",
      "Oda_Boy_mm": "Oda boyu (mm)",
      "Duvar_Yukseklik_mm": "Duvar yüksekliği (mm)",
      "Patlatilmis_Gorunum_mm": "Parçaları ayır (önizleme)",
      "Kendi_Modellerinle_Ozellestir": "Kendi modelini ekle",
      "Cephe_Karsidan": "Karşıdan",
      "Kesit_Analiz": "Kesit",
      "Ust_Plan": "Üstten"
  },

  gizle: [
    ".right-cad-panel",
    ".status-bar",
    "#Adim_05_Uretim_Ciktilari",
    "#Adim_03_DFM_Geometri_Motoru",
    "#partInspectorCard",
    "#advDfmAccordion",
    "#tgl_Oda_Birlestirme_Kilidi",
    "#Kendi_Modellerinle_Ozellestir > div:last-child",
    "#btnModExportSingleSTL",
    "#moduleListContainer [data-mstl]",
    "#btnTopSaveDraft",
    "#btnTopOrderNow",
    "#topDfmPill",
    "#lblAutoSaveBadge",
    "#gorunumModuSwitch",
    ".top-lbl-hide",
    "#uiComplexitySwitch",
    ".mobile-cad-export-bar",
    "#mobChipSingleSTL",
    "#mobChipExportSTL",
    "#mobChipBedView",
    '[data-mobnav="cad"]',
    '[data-mobnav="order"]',
    ".scale-cell:has(#readClampedWall)",
    ".scale-cell:has(#readModuleSummary)",
  ],

  // Oda ve modüller form alanı değil, bir veri yapısı: düzenleyicideki
  // alanlar yalnızca o an seçili modülü gösteriyor. Kayıt aracın kendi
  // anlık görüntüsüyle taşınır.
  alanYok: true,

  dosyaGirisi: "fileCustom3D",
  cokluDosya: true,
  dosyaHaric: ["fileImportConfigJson"],
  etiketler: { fileCustom3D: "Yüklenen modeller" },

  durumOku: function () {
    return window.__ADJY_ODA ? window.__ADJY_ODA.al() : null;
  },

  // Yüklenen özel modeller sırayla ayrıştırılıyor; konumları ancak hepsi
  // sahneye girdikten sonra yazılabilir.
  durumYaz: function (ek) {
    var oda = window.__ADJY_ODA;
    if (!oda || !ek) return null;
    oda.yaz(ek);
    var modeller = Array.isArray(ek.ozelModeller) ? ek.ozelModeller : [];
    if (modeller.length === 0) return null;
    return new Promise(function (bitti) {
      var deneme = 0;
      var t = setInterval(function () {
        deneme += 1;
        if (oda.ozelModelSayisi() >= modeller.length || deneme > 40) {
          clearInterval(t);
          oda.ozelModelleriYaz(modeller);
          bitti();
        }
      }, 250);
    });
  },

  ozetEk: function () {
    return window.__ADJY_ODA ? window.__ADJY_ODA.ozet() : [];
  },

  olcum: {
    // Alt toplam satırı: [3] gram, [4] dakika
    kutleG: {
      oku: function () {
        var h = document.querySelectorAll("#bomTableFoot tr td");
        var m = h[3] && /([\d.]+)\s*g/.exec(h[3].textContent);
        if (m) return parseFloat(m[1]);
        var ozet = document.getElementById("readModuleSummary");
        var m2 = ozet && /\(([\d.]+)\s*g/.exec(ozet.textContent);
        return m2 ? parseFloat(m2[1]) : null;
      },
    },
    sureSaat: {
      oku: function () {
        var h = document.querySelectorAll("#bomTableFoot tr td");
        var m = h[4] && /([\d.]+)\s*dk/.exec(h[4].textContent);
        return m ? parseFloat(m[1]) / 60 : null;
      },
    },
  },

  hazirMi: function () {
    return !!window.__ADJY_ODA && window.ADJY_ARAC.olcum.kutleG.oku() !== null;
  },

  hazir: function (o) {
    if (o.uretim) return;
    // Sade arayüz: kesit ve DFM denetimleri müşteriye bir şey söylemiyor
    var sade = document.querySelector('[data-uilevel="simple"]');
    if (sade) sade.click();
  },
};
