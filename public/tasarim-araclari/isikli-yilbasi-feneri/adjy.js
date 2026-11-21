/* Işıklı yılbaşı feneri — mağaza köprüsü ayarı (bkz. ../_adjy/kopru.js) */
(function () {
  function d() { return window.__ADJY_YF; }

  window.ADJY_ARAC = {
    id: "isikli-yilbasi-feneri",
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Desen", baslik: "Deseni seçin", ipucu: "Desen duvarın kalınlığına işlenir: içine LED konunca ince yerler parlar, kalın yerler gölge olur.", yer: "sol", sec: ["#grup-desen .yb-hazirlar","#grup-desen .param-row"] },
      { ad: "Yazı", baslik: "Feneri isimlendirin", ipucu: "Yazı fenerin ön yüzünde, desenin ortasında durur. Boş bırakabilirsiniz.", yer: "sag", sec: ["#grup-yazi .param-row"] },
      { ad: "Ölçü", baslik: "Fenerin ölçüsü", ipucu: "Fener pilli mum LED'in üstüne kapatılır; iç çapı her ölçüde mum LED'e yeter.", yer: "sag", sec: ["#grup-olcu .param-row"] },
      { ad: "Renk", baslik: "Rengi seçin", ipucu: "Işık en iyi beyaz ve açık renklerden geçer.", yer: "alt", sec: ["#grup-renk .param-row"] },
    ],

    gizle: [".yb-atolye"],
    devreDisiAtla: true,
    kutularHep: true,
    etiketler: {"yf-isim":"Yazı"},

    ozetEk: function () {
      var h = d();
      return h && h.olcu ? [{ ad: "Fener ölçüsü", deger: h.olcu }] : [];
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
