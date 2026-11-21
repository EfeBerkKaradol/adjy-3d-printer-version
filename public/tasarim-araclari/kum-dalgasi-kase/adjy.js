/* Kum dalgası kase — mağaza köprüsü ayarı (bkz. ../_adjy/kopru.js) */
(function () {
  function d() { return window.__ADJY_KD; }

  window.ADJY_ARAC = {
    id: "kum-dalgasi-kase",
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Biçim", baslik: "Bir kaseyle başlayın", ipucu: "Meyve kasesinden anahtarlık tabağına; her biri sonra değiştirilebilir.", yer: "sol", sec: ["#grup-hazir .yb-hazirlar","#grup-hazir .param-row"] },
      { ad: "Ölçü", baslik: "Ölçüsünü verin", ipucu: "Taban oranı tabanın ağıza göre genişliğidir; dar taban daha zarif, geniş taban daha sağlam.", yer: "sag", sec: ["#grup-olcu .param-row"] },
      { ad: "Doku", baslik: "Kum dalgaları", ipucu: "Dalgalar rüzgârın kumda bıraktığı sırtlar gibi bir yüzü yumuşak, öbür yüzü dik iner; burgu onları gövde boyunca döndürür.", yer: "sag", sec: ["#grup-dalga .param-row"] },
      { ad: "Renk", baslik: "Rengi seçin", ipucu: "Kase tek parça, bu renkte basılır.", yer: "alt", sec: ["#grup-renk .param-row"] },
    ],

    gizle: [".yb-atolye"],
    devreDisiAtla: true,
    kutularHep: true,

    ozetEk: function () {
      var h = d();
      return h && h.olcu ? [{ ad: "Kase ölçüsü", deger: h.olcu }] : [];
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
