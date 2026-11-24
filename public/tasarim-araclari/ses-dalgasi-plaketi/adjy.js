/* Ses dalgası plaketi — mağaza köprüsü ayarı (bkz. ../_adjy/kopru.js) */
(function () {
  function d() { return window.__ADJY_SD; }

  window.ADJY_ARAC = {
    id: "ses-dalgasi-plaketi",
    ad: "Ses Dalgası Plaketi",
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Ses", baslik: "Sesinizi kaydedin", ipucu: "Birkaç saniye yeter: bir söz, bir kahkaha, bir şarkının nakaratı. Ses tarayıcınızdan çıkmaz.", yer: "sol", sec: ["#grup-ses .param-row"] },
      { ad: "Dalga", baslik: "Dalga ve yazı", ipucu: "Dalganın biçimini seçin, altına bir söz ya da tarih yazın.", yer: "sol", sec: ["#grup-hazir .yb-hazirlar", "#grup-dalga .param-row"] },
      { ad: "Ölçü", baslik: "Ölçü ve duruş", ipucu: "Masada ayağıyla durur ya da iki delikten duvara asılır.", yer: "sag", sec: ["#grup-olcu .param-row"] },
      { ad: "Renk", baslik: "Renkleri seçin", ipucu: "Her renk ayrı filamentle, tek seferde basılır.", yer: "sag", sec: ["#grup-renk .param-row"] },
    ],

    gizle: [".yb-atolye"],
    kutularHep: true,
    etiketler: { "sd-yazi": "Yazı" },

    // Ses dosyası depoya gönderilmez: sipariş yalnız dalganın 240 örneğini taşır
    dosyaHaric: ["sd-ses"],
    ozetHaric: ["sd-dalga"],

    ozetEk: function () {
      var h = d();
      return h && h.olcu ? [{ ad: "Plaket ölçüsü", deger: h.olcu }, { ad: "Dalga kaynağı", deger: "Kayıtlı dalga biçimi (240 örnek)" }] : [];
    },

    olcum: {
      kutleG: { oku: function () { return d() ? d().olcum.kutleG : null; } },
      sureSaat: { oku: function () { return d() ? d().olcum.sureSaat : null; } },
    },

    hazirMi: function () {
      return !!(d() && d().hazir);
    },

    olcuCizgisi: {
      kok: function (sahne) { return sahne.getObjectByName("model") || null; },
    },
  };
})();
