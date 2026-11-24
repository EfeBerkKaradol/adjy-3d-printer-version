/* İsimli yılbaşı çelengi — mağaza köprüsü ayarı (bkz. ../_adjy/kopru.js) */
(function () {
  function d() { return window.__ADJY_YC; }

  window.ADJY_ARAC = {
    id: "isimli-yilbasi-celengi",
    ad: "İsimli Yılbaşı Çelengi",
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Tarz", baslik: "Bir çelenkle başlayın", ipucu: "Hazır çelenklerden birini seçin; ismi, yaprakları ve renkleri sonra değiştirirsiniz.", yer: "sol", sec: ["#grup-hazir .yb-hazirlar"] },
      { ad: "İsim", baslik: "Şeride ismi yazın", ipucu: "Aile adı, bir isim ya da kısa bir dilek. Türkçe harfler olduğu gibi basılır.", yer: "sol", sec: ["#grup-yazi .param-row"] },
      { ad: "Çelenk", baslik: "Çap, yaprak ve kokina", ipucu: "Yaprak sıklığı çelengi doldurur; kokina salkımları yaprakların üstünde kabarır.", yer: "sag", sec: ["#grup-celenk .param-row"] },
      { ad: "Fiyonk", baslik: "Fiyonk ve askı", ipucu: "Fiyonk altta ya da üstte durur. Askı halkasından kurdele geçer.", yer: "sag", sec: ["#grup-sus .param-row"] },
      { ad: "Renk", baslik: "Renkleri seçin", ipucu: "Dört renk, tek seferde dört filamentle basılır.", yer: "alt", sec: ["#grup-renk .param-row"] },
    ],

    gizle: [".yb-atolye"],
    kutularHep: true,
    etiketler: { "yc-isim": "İsim" },

    ozetEk: function () {
      var h = d();
      return h && h.olcu ? [{ ad: "Çelenk ölçüsü", deger: h.olcu }] : [];
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
