/* Kar tanesi süsü — mağaza köprüsü ayarı */
(function () {
  function kt() { return window.__ADJY_KT; }

  window.ADJY_ARAC = {
    id: "kar-tanesi-susu",
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Desen", baslik: "Bir desenle başlayın", ipucu: "Hazır desenlerden birini seçin ya da ✦ Yeni desen ile kendinize özgü bir kar tanesi üretin.", yer: "sol", sec: ["#grup-desen .yb-hazirlar", "#grup-desen .param-row"] },
      { ad: "Dallar", baslik: "Dalları biçimlendirin", ipucu: "Dal sayısı, açısı ve uzunluğu kar tanesinin karakterini belirler.", yer: "sag", sec: ["#grup-dal .param-row"] },
      { ad: "Merkez", baslik: "Merkezi seçin", ipucu: "İç halka kolları birbirine bağlar; ince desenlerde süsü sağlamlaştırır.", yer: "sag", sec: ["#grup-merkez .param-row"] },
      { ad: "Ölçü", baslik: "Ölçü ve askı", ipucu: "Ağaç süsü için 60–90 mm; cam ya da kapı süsü için daha büyük.", yer: "sag", sec: ["#grup-olcu .param-row"] },
      { ad: "Renk", baslik: "Rengi seçin", ipucu: "Kar tanesi tek parça, bu renkte basılır.", yer: "alt", sec: ["#grup-renk .param-row"] },
    ],

    gizle: [".yb-atolye"],
    kutularHep: true,

    ozetEk: function () {
      var h = kt();
      return h && h.olcu ? [{ ad: "Süs ölçüsü", deger: h.olcu }] : [];
    },

    olcum: {
      kutleG: { oku: function () { return kt() ? kt().olcum.kutleG : null; } },
      sureSaat: { oku: function () { return kt() ? kt().olcum.sureSaat : null; } },
    },

    hazirMi: function () {
      return !!(kt() && kt().hazir);
    },

    olcuCizgisi: {
      kok: function (sahne) { return sahne.getObjectByName("model") || null; },
    },
  };
})();
