/* Kahraman amblemi — mağaza köprüsü ayarı (bkz. ../_adjy/kopru.js) */
(function () {
  function d() { return window.__ADJY_KA; }

  window.ADJY_ARAC = {
    id: "kahraman-amblemi",
    ad: "Kahraman Amblemi",
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Tarz", baslik: "Bir amblemle başlayın", ipucu: "Hazır amblemlerden birini seçin; biçimi, simgeyi ve renkleri sonra değiştirirsiniz.", yer: "sol", sec: ["#grup-hazir .yb-hazirlar"] },
      { ad: "Biçim", baslik: "Amblemin biçimi ve ölçüsü", ipucu: "Daire, kalkan, altıgen ya da elmas. Küçük ölçüde anahtarlık, büyük ölçüde duvar süsü olur.", yer: "sol", sec: ["#grup-bicim .param-row"] },
      { ad: "Simge", baslik: "Simgenizi seçin", ipucu: "Baş harfiniz, yıldırım ya da taç. Simge amblemin ortasında, en üstte kabarır.", yer: "sag", sec: ["#grup-simge .param-row"] },
      { ad: "Süsleme", baslik: "Patlama, noktalar ve bordür", ipucu: "Patlama yıldızı simgenin arkasında durur; noktalar eski çizgi roman baskılarını hatırlatır.", yer: "sag", sec: ["#grup-susleme .param-row"] },
      { ad: "Renk", baslik: "Renkleri seçin", ipucu: "Üç renk, tek seferde üç filamentle basılır.", yer: "alt", sec: ["#grup-renk .param-row"] },
    ],

    gizle: [".yb-atolye"],
    kutularHep: true,
    etiketler: { "ka-harf": "Baş harf" },

    ozetEk: function () {
      var h = d();
      return h && h.olcu ? [{ ad: "Amblem ölçüsü", deger: h.olcu }] : [];
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
