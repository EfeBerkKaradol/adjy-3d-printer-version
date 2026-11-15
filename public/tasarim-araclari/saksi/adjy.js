/* Dokulu saksı — mağaza köprüsü ayarı */
window.ADJY_ARAC = {
  id: "saksi",

  // Geniş ekranda model ortada, ayarlar iki yanda (bkz. kopru.css)
  yerlesim: { kap: ".studio-grid", panel: ".panel-left", sahne: ".viewport-panel" },

  // Ayarlar numaralı adımlara ayrılır. yer: adımın modelin neresinde duracağı
  // (sol | sag | alt). sec: o adıma taşınan öğeler. ad: rehber çubuğundaki kısa ad.
  adimlar: [
    {"ad":"Boy","baslik":"Hazır bir boyla başlayın","ipucu":"Size en yakın boyu seçin; ölçüyü sonra ince ayarlarsınız.","yer":"sol","sec":[".panel-left .preset-row"]},
    {"ad":"Ölçü","baslik":"Ölçüyü ayarlayın","ipucu":"Çapı bitkinize, yüksekliği rafınıza göre verin.","yer":"sol","sec":[".param-control:has(#rng-Saksi_Capi_mm)",".param-control:has(#rng-Saksi_Yuksekligi_mm)",".param-control:has(#rng-Alt_Tabak_Yukseklik_mm)"]},
    {"ad":"Doku","baslik":"Dokuyu kurun","ipucu":"Dilim sayısı ve burgu açısı gövdenin görünüşünü belirler.","yer":"sag","sec":[".param-control:has(#rng-Doku_Kanat_Sayisi)",".param-control:has(#rng-Kanat_Derinligi_mm)",".param-control:has(#rng-Burulma_Acisi_Derece)"]},
    {"ad":"Renk","baslik":"Malzeme ve renk seçin","ipucu":"Renk kutusuna tıklayın; model anında o renge döner.","yer":"alt","sec":[".panel-left .mat-row"]},
  ],

  tema: { oznitelik: "data-theme", acik: "light", koyu: "dark", ilk: "dark", dugme: "#btn-theme-toggle" },

  // Müşterinin görmediği her şey: üretim çıktıları, maliyet, tolerans
  gizle: [
    ".header-telemetry",
    ".param-control:has(#num-Kilit_Toleransi_mm)",
    ".param-control:has(#num-Cidar_Kalinligi_mm)",
    "#twist-dfm-note",
    "#vp-lock-readout",
    "#vp-drain-readout",
    '[data-disp="dfm"]',
    '[data-disp="blueprint"]',
    '[data-disp="xray"]',
    '[data-disp="wire"]',
    '[data-asm="sml"]',
    "#sml-overlay-container",
    ".clip-controls",
    ".panel-right",
    "#svg-modal",
    ".range-minmax",
    // Sadeleştirme: kamera, kesit ve gösterim araçları müşteriye kapalı
    ".vp-bar-top",
    ".vp-bar-bottom",
  ],

  // Sade görünümde kapalı duran ayrıntı ayarları. Müşteri "Tüm ayarlar"
  // derse açılır; atölye kipinde hep açıktır ve sipariş metnine her
  // durumda girer.
  gelismis: [
    ".param-control:has(#num-Kanat_Derinligi_mm)",
    ".param-control:has(#num-Alt_Tabak_Yukseklik_mm)",
  ],

  gruplar: [
    { kap: ".preset-row", oz: "data-preset", yazma: true },
    { kap: "#swatch-group", oz: "data-finish", etiket: "Renk" },
    { kap: "#assembly-mode-group", oz: "data-asm", gorunum: true, yazma: true },
    { kap: "#display-mode-group", oz: "data-disp", gorunum: true, yazma: true },
  ],

  etiketler: {
    Saksi_Capi_mm: "Saksı çapı",
    Saksi_Yuksekligi_mm: "Saksı yüksekliği",
    Doku_Kanat_Sayisi: "Dilim sayısı",
    Kanat_Derinligi_mm: "Dilim derinliği",
    Burulma_Acisi_Derece: "Burgu açısı",
    Alt_Tabak_Yukseklik_mm: "Alt tabak yüksekliği",
    material: "Malzeme",
  },
  gorunenEtiket: ".param-tr",

  metinler: [
    { sec: ".panel-left > .panel-section:nth-child(1) .mono-label", metin: "Hazır boylar" },
    { sec: ".controls-scroll > .section-header:first-child .mono-label", metin: "Ölçü ve doku" },
    { sec: ".controls-scroll > .section-header.mt-sm .mono-label", metin: "Malzeme ve renk" },
    { sec: "#btn-reset-params", metin: "Sıfırla" },
  ],

  ozetHaric: ["section", "section-axis", "section-offset", "sale-price", "filament-kg", "pack-cost"],

  olcum: {
    kutleG: { sec: "#kpi-mass", desen: "([\\d.]+)\\s*g" },
    sureSaat: { sec: "#kpi-mass-split", desen: "~\\s*([\\d.]+)\\s*sa" },
  },

  // Sayfadaki ilk değerler örnek metin; gerçek ölçüm model kurulunca yazılır
  hazirMi: function () {
    var el = document.getElementById("inp-sale-price");
    return !!el && /^Oto: \d/.test(el.placeholder || "");
  },
};
