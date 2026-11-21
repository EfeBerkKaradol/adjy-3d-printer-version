/* Kum tepesi kabartma pano — mağaza köprüsü ayarı (bkz. ../_adjy/kopru.js) */
(function () {
  function d() { return window.__ADJY_KP; }

  window.ADJY_ARAC = {
    id: "kum-tepesi-pano",
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Manzara", baslik: "Bir çölle başlayın", ipucu: "Hazır manzaralardan birini seçin ya da ✦ Yeni çöl ile her biri ayrı tepeler üretin.", yer: "sol", sec: ["#grup-manzara .yb-hazirlar","#grup-manzara .param-row"] },
      { ad: "Rüzgâr", baslik: "Rüzgârı ayarlayın", ipucu: "Tepeler rüzgârın geldiği yöne yayılır, öbür yüzleri dik iner. Sıklık sırtlar arasındaki uzaklıktır.", yer: "sag", sec: ["#grup-ruzgar .param-row"] },
      { ad: "Ölçü", baslik: "Panonun ölçüsü", ipucu: "Tepe yüksekliği kabartmanın derinliğidir; taban kalınlığı buna eklenir.", yer: "sag", sec: ["#grup-olcu .param-row"] },
      { ad: "Doku", baslik: "Kum dokusu ve çerçeve", ipucu: "Dalgacıklar rüzgârın kumda bıraktığı ince çizgilerdir; ışıkta belirginleşir.", yer: "sag", sec: ["#grup-doku .param-row"] },
      { ad: "Renk", baslik: "Rengi seçin", ipucu: "Pano tek parça, bu renkte basılır. Kum ve okra tonları gölgeleri en iyi gösterir.", yer: "alt", sec: ["#grup-renk .param-row"] },
    ],

    gizle: [".yb-atolye"],
    devreDisiAtla: true,
    kutularHep: true,

    ozetEk: function () {
      var h = d();
      return h && h.olcu ? [{ ad: "Pano ölçüsü", deger: h.olcu }] : [];
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
