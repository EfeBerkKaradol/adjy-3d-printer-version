/* Neon sahil isimlik — mağaza köprüsü ayarı (bkz. ../_adjy/kopru.js) */
(function () {
  function d() { return window.__ADJY_NS; }

  window.ADJY_ARAC = {
    id: "neon-sahil-tabela",
    ad: "Neon Sahil İsimlik",
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Tarz", baslik: "Bir tabelayla başlayın", ipucu: "Hazır tabelalardan birini seçin; yazıyı, güneşi ve palmiyeleri sonra değiştirirsiniz.", yer: "sol", sec: ["#grup-hazir .yb-hazirlar"] },
      { ad: "Yazı", baslik: "Adınızı yazın", ipucu: "Türkçe harfler olduğu gibi basılır. Alt satıra kısa bir söz ya da yıl yazabilirsiniz.", yer: "sol", sec: ["#grup-yazi .param-row"] },
      { ad: "Sahne", baslik: "Güneş ve palmiyeler", ipucu: "Şeritli güneş yazının arkasında doğar; palmiyeler kenarlarda durur.", yer: "sag", sec: ["#grup-sahne .param-row"] },
      { ad: "Ölçü", baslik: "Ölçü ve duruş", ipucu: "Masada ayağıyla durur ya da iki delikten duvara asılır.", yer: "sag", sec: ["#grup-olcu .param-row"] },
      { ad: "Renk", baslik: "Renkleri seçin", ipucu: "Her renk ayrı filamentle, tek seferde basılır.", yer: "alt", sec: ["#grup-renk .param-row"] },
    ],

    gizle: [".yb-atolye"],
    kutularHep: true,
    etiketler: { "ns-isim": "Yazı", "ns-alt": "Alt satır" },

    ozetEk: function () {
      var h = d();
      return h && h.olcu ? [{ ad: "Tabela ölçüsü", deger: h.olcu }] : [];
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
