/* Çöl kurdu kalemlik — mağaza köprüsü ayarı (bkz. ../_adjy/kopru.js) */
(function () {
  function d() { return window.__ADJY_CK; }

  window.ADJY_ARAC = {
    id: "col-kurdu-kalemlik",
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Biçim", baslik: "Bir kurtla başlayın", ipucu: "Hazır biçimlerden birini seçin; sonra boğumları, ağzı ve dişleri değiştirin.", yer: "sol", sec: ["#grup-hazir .yb-hazirlar"] },
      { ad: "Gövde", baslik: "Gövdenin ölçüsü", ipucu: "Eğrilik gövdeyi kum içinden yükselir gibi bir yana büker.", yer: "sag", sec: ["#grup-govde .param-row"] },
      { ad: "Boğum", baslik: "Boğumları ayarlayın", ipucu: "Boğumlar gövdeyi halka halka böler; derinleştikçe kurt yaşlanır.", yer: "sag", sec: ["#grup-bogum .param-row"] },
      { ad: "Ağız", baslik: "Ağız ve dişler", ipucu: "Dişler ağzın içine doğru eğilir; kalemleri tutar, dışarı taşmaz.", yer: "sag", sec: ["#grup-agiz .param-row"] },
      { ad: "Renk", baslik: "Rengi seçin", ipucu: "Kalemlik tek parça, bu renkte basılır.", yer: "alt", sec: ["#grup-renk .param-row"] },
    ],

    gizle: [".yb-atolye"],
    devreDisiAtla: true,
    kutularHep: true,

    ozetEk: function () {
      var h = d();
      return h && h.olcu ? [{ ad: "Kalemlik ölçüsü", deger: h.olcu }] : [];
    },

    olcum: {
      kutleG: { oku: function () { return d() ? d().olcum.kutleG : null; } },
      sureSaat: { oku: function () { return d() ? d().olcum.sureSaat : null; } },
    },

    hazirMi: function () {
      return !!(d() && d().hazir);
    },

    // Ölçü çizgileri ve renkli baskı paketi: sahnedeki "model" grubu
    olcuCizgisi: {
      kok: function (sahne) { return sahne.getObjectByName("model") || null; },
    },
  };
})();
