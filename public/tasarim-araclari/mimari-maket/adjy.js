/* Mimari maket — mağaza köprüsü ayarı */
window.ADJY_ARAC = {
  id: "mimari-maket",

  // Geniş ekranda model ortada, ayarlar iki yanda (bkz. kopru.css)
  yerlesim: { kap: ".workspace-grid", panel: ".panel-controls .controls-scroll", sahne: ".panel-viewport", gecis: [".panel-controls"] },

  // Ayarlar numaralı adımlara ayrılır. yer: adımın modelin neresinde duracağı
  // (sol | sag | alt). sec: o adıma taşınan öğeler. ad: rehber çubuğundaki kısa ad.
  adimlar: [
    {"ad":"Ölçek","baslik":"Ölçeği seçin","ipucu":"Maket, binanın kaçta kaçı olsun.","yer":"sol","sec":[".ctrl-group.highlight-scale"]},
    {"ad":"Bina","baslik":"Bina ölçüsü","ipucu":"Binanın gerçek eni ve boyu (metre).","yer":"sol","sec":[".ctrl-group:has(#Bina_En_m_range)",".ctrl-group:has(#Bina_Boy_m_range)"]},
    {"ad":"Katlar","baslik":"Katlar","ipucu":"Kat sayısı ve kat yüksekliği; her kat ayrı basılır ve sökülür.","yer":"sag","sec":[".ctrl-group:has(#Kat_Sayisi_range)",".ctrl-group:has(#Kat_Yuksekligi_m_range)"]},
    {"ad":"Cephe","baslik":"Cephe","ipucu":"Balkonların çıkması ve pencerelerin oranı.","yer":"sag","sec":[".ctrl-group:has(#Balkon_Cikma_m_range)",".ctrl-group:has(#Pencere_Orani_Yuzde_range)"]},
    {"ad":"Kendi modeliniz","baslik":"Kendi modeliniz varsa","ipucu":"Binanızın 3B dosyasını yükleyin; katlarına ayrılıp ölçeklenir.","yer":"alt","sec":[".ctrl-group.upload-card"]},
  ],

  // Başlık ve düğmelerdeki teknik adlar — okunur adla gösterilir
  ceviri: {
      "01 · MODEL YÜKLE & PARAMETRİK DFM": "Maketinizi kurun",
      "00 · Kendi 3B Modelini Yükle": "Kendi 3B modelini yükle",
  },

  tema: { oznitelik: "data-theme", acik: "paper", koyu: "dark", ilk: "dark", dugme: "#btn-theme-toggle" },

  gizle: [
    ".panel-outputs",
    "#svg-modal",
    "#btn-top-svg",
    "#btn-top-csv",
    "#btn-theme-toggle",
    "#dfm-status-badge",
    ".index-tag",
    ".unit-badge",
    "#build-ms-tag",
    ".tele-cell:has(#hud-wall-clamp)",
    ".tele-cell:has(#hud-pin-spec)",
    ".tele-cell:has(#hud-b2b-price)",
    "section.ctrl-group.dfm-highlight",
    ".dfm-audit-card",
    ".floating-metrology",
    "#btn-insp-download",
    "#btn-clip-pin-axis",
    '[data-mode="blueprint"]',
    '[data-mode="xray"]',
    '[data-mode="wire"]',
    // Sadeleştirme: kamera, kesit ve gösterim araçları müşteriye kapalı
    ".topbar",
    ".viewport-toolbar",
    ".viewport-dock",
    "#tier-Floating-Inspector",
    "section.ctrl-group.compact",
    ".tr-desc",
  ],

  // Sade görünümde kapalı duran ayrıntı ayarları. Müşteri "Tüm ayarlar"
  // derse açılır; atölye kipinde hep açıktır ve sipariş metnine her
  // durumda girer.
  gelismis: [
    "section.upload-card",
    "section.ctrl-group:has(#Kat_Yuksekligi_m)",
    "section.ctrl-group:has(#Balkon_Cikma_m)",
    "section.ctrl-group:has(#Pencere_Orani_Yuzde)",
  ],

  gruplar: [
    { kap: ".scale-segmented", oz: "data-scale", etiket: "Maket ölçeği" },
    { kap: "#example-cards-strip", oz: "data-example", yazma: true },
  ],

  durumHaric: ["preset-select", "inspect-tier-select"],

  dosyaGirisi: "custom-model-file-input",

  etiketler: {
    Maket_Olcegi: "Maket ölçeği",
    Bina_En_m: "Bina eni",
    Bina_Boy_m: "Bina boyu",
    Kat_Sayisi: "Kat sayısı",
    Kat_Yuksekligi_m: "Kat yüksekliği",
    Balkon_Cikma_m: "Balkon çıkması",
    Pencere_Orani_Yuzde: "Pencere oranı",
    "finish-appearance-select": "Görünüm",
    "custom-unit-select": "Model birimi",
    "custom-zup": "Z ekseni yukarı",
    "custom-model-file-input": "Yüklenen model",
  },
  birimler: {
    Maket_Olcegi: "",
    Bina_En_m: "m",
    Bina_Boy_m: "m",
    Kat_Sayisi: "kat",
    Kat_Yuksekligi_m: "m",
    Balkon_Cikma_m: "m",
    Pencere_Orani_Yuzde: "%",
  },

  ozetHaric: ["custom-unit-select", "custom-zup", "explode-range", "explode", "clip-offset-range", "clip-offset", "pin-axes"],

  // Yüklenen modelin çeyrek dönüşleri form alanlarında durmuyor
  durumOku: function () {
    var d = window.__ADJY_MIMARI && window.__ADJY_MIMARI.durum();
    var cm = d && d.customModel;
    if (!cm) return null;
    return { donus: { x: cm.rotX || 0, y: cm.rotY || 0, z: cm.rotZ || 0 } };
  },
  durumYaz: function (ek) {
    if (!ek || !ek.donus) return;
    ["x", "y", "z"].forEach(function (eksen) {
      var adim = (Number(ek.donus[eksen]) || 0) % 4;
      var dugme = document.querySelector('[data-crot="' + eksen + '"]');
      for (var i = 0; dugme && i < adim; i += 1) dugme.click();
    });
  },
  ozetEk: function () {
    var d = window.__ADJY_MIMARI && window.__ADJY_MIMARI.durum();
    var cm = d && d.customModel;
    if (!cm) return [];
    return [
      {
        ad: "Model dönüşü",
        deger: "X " + (cm.rotX || 0) * 90 + "°, Y " + (cm.rotY || 0) * 90 + "°, Z " + (cm.rotZ || 0) * 90 + "°",
      },
    ];
  },

  olcum: {
    kutleG: { sec: "#qs-mass", desen: "([\\d.]+)\\s*g" },
    sureSaat: { sec: "#qs-hours", desen: "([\\d.]+)\\s*saat" },
  },

  hazirMi: function () {
    var el = document.getElementById("qs-mass");
    return !!el && /\d\s*g/.test(el.textContent) && !!window.__ADJY_MIMARI;
  },

  hazir: function () {
    // Müşteri hazır örneğe dönerse yüklediği model siparişe girmemeli
    function birak() {
      if (window.ADJY) window.ADJY.dosyalariBirak("custom-model-file-input");
    }
    ["btn-clear-custom-model", "btn-load-demo-custom"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", birak);
    });
    var sablon = document.getElementById("preset-select");
    if (sablon) sablon.addEventListener("change", birak);
    var serit = document.getElementById("example-cards-strip");
    if (serit) serit.addEventListener("click", birak);
  },
};
