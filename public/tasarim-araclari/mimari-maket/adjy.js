/* Mimari maket — mağaza köprüsü ayarı */
window.ADJY_ARAC = {
  id: "mimari-maket",

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
