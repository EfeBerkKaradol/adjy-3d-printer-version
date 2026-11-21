/* İsimli yılbaşı süsü — mağaza köprüsü ayarı */
(function () {
  function yb() { return window.__ADJY_YB; }

  window.ADJY_ARAC = {
    id: "isimli-yilbasi-susu",

    // Geniş ekranda model ortada, ayarlar iki yanda (bkz. kopru.css)
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Şekil", baslik: "Süsün şeklini seçin", ipucu: "Hazır bir süsle başlayabilir ya da şekli kendiniz seçebilirsiniz.", yer: "sol", sec: ["#grup-hazir .yb-hazirlar", "#grup-sekil .param-row"] },
      { ad: "Yazı", baslik: "İsmi yazın", ipucu: "Türkçe harfler olduğu gibi basılır. Alt satıra yıl ya da kısa bir söz yazabilirsiniz.", yer: "sol", sec: ["#grup-yazi .param-row"] },
      { ad: "Ölçü", baslik: "Ölçüyü seçin", ipucu: "Yazı süsün içine sığacak şekilde kendiliğinden büyür ya da küçülür.", yer: "sag", sec: ["#grup-olcu .param-row"] },
      { ad: "Ayrıntı", baslik: "Çerçeve ve askı", ipucu: "Çerçeve yazıyla aynı renkte kabarır. Halkadan ip ya da kurdele geçer.", yer: "sag", sec: ["#grup-ayrinti .param-row"] },
      { ad: "Renk", baslik: "Renkleri seçin", ipucu: "Gövde ve yazı ayrı renkte basılır.", yer: "alt", sec: ["#grup-renk .param-row"] },
    ],

    gizle: [".yb-atolye"],
    kutularHep: true,
    etiketler: { "yb-yil": "Alt satır", "yb-isim": "İsim" },

    ozetEk: function () {
      var h = yb();
      return h && h.olcu ? [{ ad: "Süs ölçüsü", deger: h.olcu }] : [];
    },

    olcum: {
      kutleG: { oku: function () { return yb() ? yb().olcum.kutleG : null; } },
      sureSaat: { oku: function () { return yb() ? yb().olcum.sureSaat : null; } },
    },

    hazirMi: function () {
      return !!(yb() && yb().hazir);
    },

    // Ölçü çizgileri ve renkli paket: sahnedeki "model" grubu
    olcuCizgisi: {
      kok: function (sahne) { return sahne.getObjectByName("model") || null; },
    },
  };
})();
