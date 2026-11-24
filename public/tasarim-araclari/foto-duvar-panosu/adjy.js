/* Fotoğraf duvar panosu — mağaza köprüsü ayarı (bkz. ../_adjy/kopru.js) */
(function () {
  function d() { return window.__ADJY_FP; }

  window.ADJY_ARAC = {
    id: "foto-duvar-panosu",
    ad: "Fotoğraf Duvar Panosu",
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Fotoğraf", baslik: "Fotoğrafınızı yükleyin", ipucu: "Kendi fotoğrafınızı seçin; yakınlaştırıp kaydırarak panoya girecek kısmı ayarlayın.", yer: "sol", sec: ["#grup-foto .param-row"] },
      { ad: "Ölçü", baslik: "Ölçü ve panel sayısı", ipucu: "Geniş pano 2 ya da 3 panele bölünür; fotoğraf panellerin üstünden kesintisiz geçer.", yer: "sol", sec: ["#grup-hazir .yb-hazirlar", "#grup-olcu .param-row"] },
      { ad: "Renk", baslik: "Renkleri seçin", ipucu: "Fotoğraf seçtiğiniz kadar filament rengine ayrılır. Öneriyi beğenmezseniz renkleri tek tek değiştirin.", yer: "sag", sec: ["#grup-renk .param-row"] },
    ],

    gizle: [".yb-atolye"],
    kutularHep: true,
    etiketler: { "fp-foto": "Fotoğraf" },

    // Müşterinin fotoğrafı: sipariş kaydına girer, atölyede geri yüklenir
    dosyaGirisi: "fp-foto",
    dosyaVarkenAtla: ["fp-ornek"],
    // Örnek seçimi bir sipariş bilgisi değil: müşteri kendi fotoğrafını yükler
    ozetHaric: ["fp-ornek"],

    ozetEk: function () {
      var h = d();
      return h && h.olcu ? [{ ad: "Pano", deger: h.olcu }, { ad: "Filamentler", deger: h.renkler }] : [];
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
