/* Lazer / UV baskı hizalama fikstürü — mağaza köprüsü ayarı */
window.ADJY_ARAC = {
  id: "lazer-uv-fikstur",

  // Düğmelerdeki değişken adları — iki kipte de okunur adla gösterilir
  ceviri: {
      "01 // Urun_Sekli": "01 // Ürün şekli",
      "Rect_Card": "Kart",
      "Cylindrical_Pen": "Kalem",
      "Round_Token": "Yuvarlak",
      "Custom_Model": "Kendi modelin",
      "Parmak_Alma_Oyugu": "Parmak oyuğu",
      "PARAMETRİK KONTROLLER": "Fikstürünüzü kurun",
      "00 // KENDİ MODELİNİ YÜKLE": "Kendi modelini yükle",
      "01 // Ürün şekli": "Ürün şekli",
      "02 // Ürün Nominal Ölçüleri": "Ürün ölçüsü",
      "04 // Çoklu Dizilim Matrisi": "Kaç yuva",
      "05 // Optik Masa & Ergonomi": "Masa ve tutuş",
      "06 // Gövde Et Kalınlığı & Malzeme": "Malzeme",
  },

  tema: { oznitelik: "data-theme", acik: "light", koyu: "dark", ilk: "dark", dugme: "#btnThemeToggle" },

  gizle: [
    ".panel-right",
    "#btnExportSTLTop",
    "#btnExportLightBurnTop",
    "#btnThemeToggle",
    ".pane-2d",
    ".workspace-tabs",
    ".tele-pill:has(#hudFocusZ)",
    ".spec-index",
    ".panel-left .panel-header .mono-badge",
    "section.ctrl-group:has(#num_Yuva_Derinligi_mm)",
    ".param-field:has(#num_Taban_Kalinligi_mm)",
    ".param-field:has(#num_Ara_Duvar_mm)",
    ".hud-chk:has(#chkShowFocusPlane)",
    ".vp-corner-tag",
    '[data-display="blueprint"]',
    '[data-display="xray"]',
    '[data-display="wire"]',
    '#sel_Malzeme option[value="DELRIN_POM"]',
    '#sel_Malzeme option[value="ALU_6061"]',
    // Sadeleştirme: kamera, kesit ve gösterim araçları müşteriye kapalı
    ".vp-toolbar",
    ".vp-bottom-hud",
    ".ctrl-hint",
  ],

  // Sade görünümde kapalı duran ayrıntı ayarları. Müşteri "Tüm ayarlar"
  // derse açılır; atölye kipinde hep açıktır ve sipariş metnine her
  // durumda girer.
  gelismis: [
    "section.upload-group",
    "#btnUploadModelTop",
    '[data-shape="Custom_Model"]',
    "section.ctrl-group:has(.pitch-segmented)",
  ],

  gruplar: [
    { kap: ".shape-segmented", oz: "data-shape", etiket: "Ürün şekli", metinSec: ".seg-sub" },
    { kap: ".pitch-segmented", oz: "data-grid", etiket: "Masa delik aralığı (mm)" },
    { kap: ".cm-mode-pills", oz: "data-cmpocket" },
  ],

  durumHaric: ["presetSelect"],

  dosyaGirisi: "fileCustomModel",
  // Model önce gelmeli: ölçüler ve yuva derinliği modele göre yeniden kurulur
  dosyaSirasi: "ilk",

  etiketler: {
    Urun_En_mm: "Ürün eni",
    Urun_Boy_mm: "Ürün boyu",
    Urun_Kalinligi_mm: "Ürün kalınlığı",
    Satir_Adedi: "Satır",
    Sutun_Adedi: "Sütun",
    Parmak_Alma_Oyugu: "Parmak oyuğu",
    Malzeme: "Malzeme",
    selCustomUnitScale: "Model birimi",
    fileCustomModel: "Yüklenen model",
  },
  birimler: { Urun_En_mm: "mm", Urun_Boy_mm: "mm", Urun_Kalinligi_mm: "mm", Satir_Adedi: "", Sutun_Adedi: "" },
  kutularHep: true,

  ozetHaric: ["selCustomUnitScale", "chkShowLoadedParts", "chkShowBreadboard", "rngExplode", "selClipAxis", "rngClipOffset"],

  // Yüklenen modelin dönüşü form alanlarında durmuyor
  durumOku: function () {
    var d = window.__ADJY_LAZER && window.__ADJY_LAZER.durum();
    var cm = d && d.customModel;
    if (!cm) return null;
    return { donus: { x: cm.rotXDeg || 0, y: cm.rotYDeg || 0, z: cm.rotZDeg || 0 } };
  },
  durumYaz: function (ek) {
    if (!ek || !ek.donus) return;
    ["x", "y", "z"].forEach(function (eksen) {
      var adim = Math.round((Number(ek.donus[eksen]) || 0) / 90) % 4;
      var dugme = document.querySelector('[data-cmrot="' + eksen + '"]');
      for (var i = 0; dugme && i < adim; i += 1) dugme.click();
    });
  },
  ozetEk: function () {
    var d = window.__ADJY_LAZER && window.__ADJY_LAZER.durum();
    var cm = d && d.customModel;
    if (!cm) return [];
    return [
      {
        ad: "Model dönüşü",
        deger: "X " + (cm.rotXDeg || 0) + "°, Y " + (cm.rotYDeg || 0) + "°, Z " + (cm.rotZDeg || 0) + "°",
      },
    ];
  },

  olcum: {
    kutleG: { sec: "#metMass", desen: "([\\d.]+)\\s*g" },
    sureSaat: { sec: "#metCycleTime", desen: "([\\d.]+)\\s*dk", carpan: 1 / 60 },
  },

  hazirMi: function () {
    var el = document.getElementById("metMass");
    return !!el && /\d\s*g/.test(el.textContent) && !!window.__ADJY_LAZER;
  },

  hazir: function (o) {
    // Müşteri hazır şekle dönerse yüklediği model siparişe girmemeli
    function birak() {
      if (window.ADJY) window.ADJY.dosyalariBirak("fileCustomModel");
    }
    var temizle = document.getElementById("btnClearCustomModel");
    if (temizle) temizle.addEventListener("click", birak);
    var ornek = document.getElementById("btnLoadDemoCustom");
    if (ornek) ornek.addEventListener("click", birak);
    var sablon = document.getElementById("presetSelect");
    if (sablon) sablon.addEventListener("change", birak);
    Array.prototype.slice
      .call(document.querySelectorAll(".shape-segmented [data-shape]"))
      .forEach(function (b) {
        if (b.getAttribute("data-shape") !== "Custom_Model") b.addEventListener("click", birak);
      });

    if (o.uretim) return;
    // LightBurn ve pafta atölyenin işi; müşteri yalnızca 3B görünümü görür
    var uc = document.querySelector('.ws-tab[data-layout="3d"]');
    if (uc) uc.click();
  },
};
