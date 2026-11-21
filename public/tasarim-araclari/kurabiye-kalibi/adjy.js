/* Yılbaşı kurabiye kalıbı — mağaza köprüsü ayarı (bkz. ../_adjy/kopru.js) */
(function () {
  function d() { return window.__ADJY_KK; }

  window.ADJY_ARAC = {
    id: "kurabiye-kalibi",
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Şekil", baslik: "Kurabiyenin şekli", ipucu: "On şekilden birini seçin; kalıp kurabiyeyi tam bu şekilde keser.", yer: "sol", sec: ["#grup-sekil .param-row"] },
      { ad: "Ölçü", baslik: "Kurabiyenin ölçüsü", ipucu: "Uzun kenar bu ölçüde kesilir. Derinlik hamurun kalınlığından en az 3 mm fazla olmalı.", yer: "sag", sec: ["#grup-olcu .param-row"] },
      { ad: "Ayrıntı", baslik: "Tutma kenarı", ipucu: "Üstteki kenar bastırırken parmakları korur; delikle kalıplar bir ipe dizilip asılır.", yer: "sag", sec: ["#grup-ayrinti .param-row"] },
      { ad: "Renk", baslik: "Rengi seçin", ipucu: "Kalıp tek parça basılır. Elde ılık suyla yıkayın; bulaşık makinesine ve sıcak fırına koymayın.", yer: "alt", sec: ["#grup-renk .param-row"] },
    ],

    gizle: [".yb-atolye"],
    devreDisiAtla: true,
    kutularHep: true,

    ozetEk: function () {
      var h = d();
      return h && h.olcu ? [{ ad: "Kalıp ölçüsü", deger: h.olcu }] : [];
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
