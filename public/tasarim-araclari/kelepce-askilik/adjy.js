/* Masa kelepçeli askı — mağaza köprüsü ayarı */
window.ADJY_ARAC = {
  id: "kelepce-askilik",

  gizle: [
    ".status-cluster",
    ".mode-switch-group",
    ".param-row:has(#num-Kelepce_Et_Kalinligi_mm)",
    ".param-row:has(#num-Ic_Kose_Radyus_mm)",
    ".panel-section:has(#num-Dis_Bosluk_Toleransi_mm)",
    ".dual-inline-fields",
    "#btn-reset-defaults",
    '#sel-material option[value="alu6061"]',
    '#sel-material option[value="ss304"]',
    ".hud-top-left",
    ".hud-bottom-left",
    ".hud-bottom-right",
    '[data-display="blueprint"]',
    '[data-display="xray"]',
    '[data-display="wireframe"]',
    ".panel-right",
    "#antet-modal",
  ],

  gruplar: [{ kap: ".arch-grid", oz: "data-style", etiket: "Model" }],

  durumHaric: ["preset-selector"],

  etiketler: {
    Maks_Masa_Kalinligi_mm: "Masa kalınlığı (en fazla)",
    Aparat_Eni_mm: "Gövde genişliği",
    Aski_Kolu_Uzunlugu_mm: "Askı kolu uzunluğu",
    Alt_J_Derinlik_mm: "Alt kanca derinliği",
    Sikma_Pozisyonu_pct: "Sıkma konumu (önizleme)",
    material: "Malzeme",
  },
  birimler: {
    Maks_Masa_Kalinligi_mm: "mm",
    Aparat_Eni_mm: "mm",
    Aski_Kolu_Uzunlugu_mm: "mm",
    Alt_J_Derinlik_mm: "mm",
  },
  gorunenEtiket: ".param-code",

  ozetHaric: ["Sikma_Pozisyonu_pct", "desk-preview", "exploded"],

  olcum: {
    kutleG: { sec: "#val-total-cost", desen: "([\\d.]+)\\s*g" },
    sureSaat: { sec: "#val-total-cost", desen: "([\\d.]+)\\s*dk", carpan: 1 / 60 },
  },

  hazirMi: function () {
    var el = document.getElementById("val-safe-load");
    return !!el && el.textContent.indexOf("N)") !== -1;
  },
};
