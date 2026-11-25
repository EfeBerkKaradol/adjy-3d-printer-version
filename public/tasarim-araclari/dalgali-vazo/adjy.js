/* Dalgalı vazo — mağaza köprüsü ayarı (bkz. ../_adjy/kopru.js) */
(function () {
  function d() { return window.__ADJY_DV; }

  window.ADJY_ARAC = {
    id: "dalgali-vazo",
    ad: "Dalgalı Vazo",
    // Sızdırmazlık dilimleme ayarındadır (bkz. ../_adjy/renkli.js): duvar üç
    // çevreyle tam dolu, taban tam dolu; dikiş hizalı (bir yivin dibinde kalır)
    // Pürüzlü yüzey geometride değil dilimlemededir: dış duvar rastgele titretilir
    // ("fuzzy skin"); iç iki çevre düz kalır, vazo yine su tutar.
    baski: function () {
      var a = { wall_loops: "3", sparse_infill_density: "100%", bottom_shell_layers: "5", seam_position: "aligned" };
      var y = d() && d().yuzey;
      if (y === "hafif" || y === "belirgin") {
        a.fuzzy_skin = "external";
        a.fuzzy_skin_thickness = y === "hafif" ? "0.2" : "0.4";
        a.fuzzy_skin_point_distance = y === "hafif" ? "0.6" : "0.8";
      }
      return [{ ad: ".", ayar: a }];
    },
    yerlesim: { kap: ".yb-izgara", panel: ".yb-panel", sahne: ".yb-sahne" },

    adimlar: [
      { ad: "Biçim", baslik: "Biçim ve ölçü", ipucu: "Hazır bir vazoyla başlayın; biçimi, boyu ve çapı sonra değiştirirsiniz.", yer: "sol", sec: ["#grup-hazir .yb-hazirlar", "#grup-bicim .param-row"] },
      { ad: "Dalga", baslik: "Dalgaları kurun", ipucu: "Yivler dikey durabilir, sağa ya da sola burulabilir, yatay halkalara dönebilir; gövdenin yalnız bir bölümünde de kalabilir.", yer: "sag", sec: ["#grup-dalga .param-row"] },
      { ad: "Renk", baslik: "Rengi seçin", ipucu: "Vazo tek renk, tek parça basılır.", yer: "alt", sec: ["#grup-renk .param-row"] },
    ],

    gizle: [".yb-atolye"],
    kutularHep: true,

    ozetEk: function () {
      var h = d();
      return h && h.olcu ? [{ ad: "Vazo ölçüsü", deger: h.olcu }] : [];
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
