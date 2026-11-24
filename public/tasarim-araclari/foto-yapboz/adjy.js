/* Fotoğraflı yapboz — mağaza köprüsü ayarı (bkz. ../_adjy/kopru.js) */
(function () {
  function d() { return window.__ADJY_FY; }

  window.ADJY_ARAC = {
    id: "foto-yapboz",
    ad: "Fotoğraflı Yapboz",
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Fotoğraf", baslik: "Fotoğrafınızı yükleyin", ipucu: "Kendi fotoğrafınızı seçin; yakınlaştırıp kaydırarak yapboza girecek kısmı ayarlayın.", yer: "sol", sec: ["#grup-foto .param-row"] },
      { ad: "Parça", baslik: "Ölçü ve parça sayısı", ipucu: "Biçimi ve uzun kenarı seçin; parça sayısı arttıkça yapboz zorlaşır.", yer: "sol", sec: ["#grup-hazir .yb-hazirlar", "#grup-olcu .param-row"] },
      { ad: "Renk", baslik: "Renkleri seçin", ipucu: "Fotoğraf seçtiğiniz kadar filament rengine ayrılır. Öneriyi beğenmezseniz renkleri tek tek değiştirin.", yer: "sag", sec: ["#grup-renk .param-row"] },
      { ad: "Çerçeve", baslik: "Çerçeve ve ayak", ipucu: "Çerçevenin alt bandına bir isim ya da tarih yazabilirsiniz.", yer: "alt", sec: ["#grup-cerceve .param-row"] },
    ],

    gizle: [".yb-atolye"],
    kutularHep: true,
    etiketler: { "fy-foto": "Fotoğraf", "fy-yazi": "Çerçeve yazısı" },

    // Müşterinin fotoğrafı: sipariş kaydına girer, atölyede geri yüklenir
    dosyaGirisi: "fy-foto",
    dosyaVarkenAtla: ["fy-ornek"],
    // Örnek seçimi bir sipariş bilgisi değil: müşteri kendi fotoğrafını yükler
    ozetHaric: ["fy-ornek"],

    ozetEk: function () {
      var h = d();
      return h && h.olcu ? [{ ad: "Yapboz", deger: h.olcu }, { ad: "Filamentler", deger: h.renkler }] : [];
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
