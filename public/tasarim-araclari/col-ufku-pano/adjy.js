/* Çöl ufku katmanlı pano — mağaza köprüsü ayarı (bkz. ../_adjy/kopru.js) */
(function () {
  function d() { return window.__ADJY_CU; }

  window.ADJY_ARAC = {
    id: "col-ufku-pano",
    ad: "Çöl Ufku Katmanlı Pano",
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Manzara", baslik: "Bir manzarayla başlayın", ipucu: "Hazır manzaralardan birini seçin; biçimi, kum tepelerini ve ayları sonra değiştirirsiniz.", yer: "sol", sec: ["#grup-hazir .yb-hazirlar"] },
      { ad: "Biçim", baslik: "Panonun biçimi ve ölçüsü", ipucu: "Kemer, dikdörtgen ya da daire. Ölçüyü duvarınıza göre seçin.", yer: "sol", sec: ["#grup-bicim .param-row"] },
      { ad: "Kum", baslik: "Kum tepeleri", ipucu: "Her kat bir öncekinin önünde, bir kat daha kabarık durur. Desen numarası tepelerin yerini değiştirir.", yer: "sag", sec: ["#grup-kum .param-row"] },
      { ad: "Gök", baslik: "Aylar ve gezgin", ipucu: "Gökte bir ya da iki ay; tepelerin üstünde pelerinli küçük bir gezgin.", yer: "sag", sec: ["#grup-gok .param-row"] },
      { ad: "Renk", baslik: "Renk paletini seçin", ipucu: "Dört renk: gök, ay ve iki kum tonu. Tek seferde, dört filamentle basılır.", yer: "alt", sec: ["#grup-renk .param-row"] },
    ],

    gizle: [".yb-atolye"],
    kutularHep: true,

    ozetEk: function () {
      var h = d();
      return h && h.olcu ? [{ ad: "Pano ölçüsü", deger: h.olcu }] : [];
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
