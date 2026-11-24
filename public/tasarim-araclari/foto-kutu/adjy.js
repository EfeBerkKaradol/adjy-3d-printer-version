/* Fotoğraflı hediye kutusu — mağaza köprüsü ayarı (bkz. ../_adjy/kopru.js) */
(function () {
  function d() { return window.__ADJY_FK; }

  window.ADJY_ARAC = {
    id: "foto-kutu",
    ad: "Fotoğraflı Hediye Kutusu",
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Fotoğraf", baslik: "Fotoğrafınızı yükleyin", ipucu: "Fotoğraf kapağın üstüne, çevresinde bir kenarlıkla basılır.", yer: "sol", sec: ["#grup-foto .param-row"] },
      { ad: "Kutu", baslik: "Kutunun ölçüsü", ipucu: "Genişlik, derinlik ve kapalı yüksekliği seçin; iç ölçü modelin üstünde yazar.", yer: "sol", sec: ["#grup-hazir .yb-hazirlar", "#grup-olcu .param-row"] },
      { ad: "Renk", baslik: "Renkleri seçin", ipucu: "Kapak ve kutu, fotoğrafın renklerinden biriyle basılır: fazladan filament gerekmez.", yer: "sag", sec: ["#grup-renk .param-row"] },
    ],

    gizle: [".yb-atolye"],
    kutularHep: false,
    etiketler: { "fk-foto": "Fotoğraf" },

    dosyaGirisi: "fk-foto",
    dosyaVarkenAtla: ["fk-ornek"],
    // Önizleme düğmesi bir seçim değil
    ozetHaric: ["fk-acik", "fk-ornek"],

    ozetEk: function () {
      var h = d();
      return h && h.olcu ? [{ ad: "Kutu", deger: h.olcu }, { ad: "Filamentler", deger: h.renkler }] : [];
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
