/* Burgulu yılbaşı ağacı — mağaza köprüsü ayarı */
(function () {
  function ag() { return window.__ADJY_AG; }

  window.ADJY_ARAC = {
    id: "burgulu-yilbasi-agaci",
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Biçim", baslik: "Ağacın biçimi", ipucu: "Hazır bir ağaçla başlayın ya da kat kat, konik ve kavisli biçimlerden birini seçin.", yer: "sol", sec: ["#grup-hazir .yb-hazirlar", "#grup-bicim .param-row"] },
      { ad: "Ölçü", baslik: "Ölçüsünü verin", ipucu: "Masaüstü için 12–18 cm, konsol ve şömine üstü için daha uzun.", yer: "sag", sec: ["#grup-olcu .param-row"] },
      { ad: "Kollar", baslik: "Kollar ve burgu", ipucu: "Kol sayısı ve derinliği ağacın dokusunu, burgu kolların ne kadar döneceğini belirler.", yer: "sag", sec: ["#grup-kol .param-row"] },
      { ad: "Işık", baslik: "Işık ve yıldız", ipucu: "LED yuvalı ağaç içi boş basılır; alttan konan mum LED gövdeyi aydınlatır.", yer: "sag", sec: ["#grup-isik .param-row"] },
      { ad: "Renk", baslik: "Renkleri seçin", ipucu: "Ağaç ve yıldız ayrı renkte basılır.", yer: "alt", sec: ["#grup-renk .param-row"] },
    ],

    gizle: [".yb-atolye"],
    devreDisiAtla: true,
    kutularHep: true,

    ozetEk: function () {
      var h = ag();
      return h && h.olcu ? [{ ad: "Ağaç ölçüsü", deger: h.olcu }] : [];
    },

    olcum: {
      kutleG: { oku: function () { return ag() ? ag().olcum.kutleG : null; } },
      sureSaat: { oku: function () { return ag() ? ag().olcum.sureSaat : null; } },
    },

    hazirMi: function () {
      return !!(ag() && ag().hazir);
    },

    olcuCizgisi: {
      kok: function (sahne) { return sahne.getObjectByName("model") || null; },
    },
  };
})();
