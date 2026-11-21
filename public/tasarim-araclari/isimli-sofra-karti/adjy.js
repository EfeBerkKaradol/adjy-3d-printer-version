/* İsimli yılbaşı sofra kartı — mağaza köprüsü ayarı (bkz. ../_adjy/kopru.js) */
(function () {
  function d() { return window.__ADJY_SK; }

  window.ADJY_ARAC = {
    id: "isimli-sofra-karti",
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Başla", baslik: "Bir kartla başlayın", ipucu: "Hazır kartlardan birini seçin; ismi ve renkleri sonra değiştirin.", yer: "sol", sec: ["#grup-hazir .yb-hazirlar"] },
      { ad: "Yazı", baslik: "Misafirin adı", ipucu: "Türkçe harfler olduğu gibi basılır; yazı kartın içine kendiliğinden sığar.", yer: "sol", sec: ["#grup-yazi .param-row"] },
      { ad: "Motif", baslik: "Motifi seçin", ipucu: "Motif ismin solunda, yazı renginde kabarır.", yer: "sag", sec: ["#grup-motif .param-row"] },
      { ad: "Ölçü", baslik: "Kartın ölçüsü", ipucu: "Kart ayağın yuvasına dik oturur; ayak kartla birlikte basılır.", yer: "sag", sec: ["#grup-olcu .param-row"] },
      { ad: "Renk", baslik: "Renkleri seçin", ipucu: "Kart, yazı ve ayak ayrı renkte basılabilir.", yer: "alt", sec: ["#grup-renk .param-row"] },
    ],

    gizle: [".yb-atolye"],
    devreDisiAtla: true,
    kutularHep: true,
    etiketler: {"sk-alt":"Alt satır","sk-isim":"İsim"},

    ozetEk: function () {
      var h = d();
      return h && h.olcu ? [{ ad: "Kart ölçüsü", deger: h.olcu }] : [];
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
