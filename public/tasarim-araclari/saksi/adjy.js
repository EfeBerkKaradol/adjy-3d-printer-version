/* Dokulu saksı — mağaza köprüsü ayarı */
window.ADJY_ARAC = {
  id: "saksi",

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
