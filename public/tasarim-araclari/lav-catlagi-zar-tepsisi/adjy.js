/* Lav çatlağı zar tepsisi — mağaza köprüsü ayarı (bkz. ../_adjy/kopru.js) */
(function () {
  function d() { return window.__ADJY_LT; }

  window.ADJY_ARAC = {
    id: "lav-catlagi-zar-tepsisi",
    ad: "Lav Çatlağı Zar Tepsisi",
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Tarz", baslik: "Bir tepsiyle başlayın", ipucu: "Hazır tepsilerden birini seçin; biçimi, çatlakları ve rünleri sonra değiştirirsiniz.", yer: "sol", sec: ["#grup-hazir .yb-hazirlar"] },
      { ad: "Biçim", baslik: "Tepsinin biçimi ve ölçüsü", ipucu: "Çap zarların yuvarlanacağı alanı, duvar yüksekliği zarların dışarı kaçmamasını belirler.", yer: "sol", sec: ["#grup-bicim .param-row"] },
      { ad: "Çatlak", baslik: "Çatlak ağı", ipucu: "Taş sayısı arttıkça çatlaklar sıklaşır. Desen numarası ağı baştan kurar.", yer: "sag", sec: ["#grup-catlak .param-row"] },
      { ad: "Rün", baslik: "Rün halkası ve mühür", ipucu: "İşaretler taşı boydan boya keser; altından lav rengi görünür.", yer: "sag", sec: ["#grup-run .param-row"] },
      { ad: "Renk", baslik: "Taş ve lav rengi", ipucu: "İki renk: çatlaklardan görünen lav ve üstündeki taş.", yer: "alt", sec: ["#grup-renk .param-row"] },
    ],

    gizle: [".yb-atolye"],
    kutularHep: true,

    ozetEk: function () {
      var h = d();
      return h && h.olcu ? [{ ad: "Tepsi ölçüsü", deger: h.olcu }] : [];
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
