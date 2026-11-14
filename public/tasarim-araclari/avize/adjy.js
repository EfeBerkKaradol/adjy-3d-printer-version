/* Parametrik avize — mağaza köprüsü ayarı */
window.ADJY_ARAC = {
  id: "avize",

  // Düğmelerdeki değişken adları — iki kipte de okunur adla gösterilir
  ceviri: {
      "Duy_Tipi": "Duy tipi"
  },

  // Malzeme seçimi üretici panelinde duruyor ama müşterinin seçimi
  musteriAlanlari: ["material-selector"],

  gizle: [
    ".status-cluster",
    '[data-view="bed"]',
    ".param-row:has(#num-Cidar_Kalinligi_mm)",
    ".param-row:has(#num-Isi_Tahliye_Delik_Sayisi)",
    "#collar-fitment-readout",
    ".toggle-line:has(#chk-support-free-lock)",
    ".toggle-line:has(#chk-clip-enable)",
    ".param-row:has(#rng-clip-offset)",
    '[data-mode="overhang"]',
    '[data-mode="xray"]',
    '[data-mode="wire"]',
    ".telemetry-hud",
    ".right-rail",
    "#antet-modal",
  ],

  gruplar: [{ kap: ".duy-selector", oz: "data-duy", etiket: "Duy tipi" }],

  // Hazır şablon kaydedilmez: değerleri alanların kendisi taşıyor ve
  // şablon elle değişiklikten sonra da eski adını göstermeye devam ediyor.
  durumHaric: ["preset-selector"],

  etiketler: {
    Avize_Capi_mm: "Avize çapı",
    Avize_Yuksekligi_mm: "Avize yüksekliği",
    Dalga_Frekansi: "Dalga sıklığı",
    Burulma_Derecesi: "Burgu açısı",
    Kanat_Sayisi: "Dilim sayısı",
    "material-selector": "Malzeme",
  },
  birimler: {
    Avize_Capi_mm: "mm",
    Avize_Yuksekligi_mm: "mm",
    Dalga_Frekansi: "x",
    Burulma_Derecesi: "°",
    Kanat_Sayisi: "adet",
  },
  gorunenEtiket: ".param-label",

  ozetHaric: ["light-power", "clip-offset", "light-on", "show-fixture", "clip-enable", "support-free-lock"],

  olcum: {
    kutleG: { sec: "#bom-net-mass", desen: "([\\d.]+)\\s*g" },
    sureSaat: { sec: "#bom-print-time", desen: "([\\d.]+)\\s*saat" },
  },

  hazirMi: function () {
    var el = document.getElementById("bom-net-mass");
    var m = document.getElementById("material-selector");
    return !!el && /\d/.test(el.textContent) && !!m && m.options.length > 0;
  },

  // Malzeme seçimi üretim reçetesinin içinde duruyor; müşteri için sol
  // raya taşınır. Düğümün kendisi taşındığı için dinleyicileri korunur.
  hazir: function (o) {
    if (o.uretim) return;
    var secim = document.getElementById("material-selector");
    var sol = document.querySelector(".left-rail");
    if (!secim || !sol) return;
    var kutu = document.createElement("div");
    kutu.className = "panel-section adjy-malzeme";
    var baslik = document.createElement("label");
    baslik.setAttribute("for", "material-selector");
    baslik.className = "adjy-etiket";
    baslik.textContent = "Malzeme";
    kutu.appendChild(baslik);
    kutu.appendChild(secim);
    sol.insertBefore(kutu, sol.children[2] || null);
  },
};
