/* Oyuncak araba yolu — mağaza köprüsü ayarı */
(function () {
  // Yolda her parçanın kendi değeri olan alanlar. Birden çok parça varsa
  // formda yalnızca seçili parça durur; özete parça listesi yazılır.
  var PARCA_ALAN = [
    "hw-tip", "hw-uzunluk", "hw-yaricap", "hw-aci", "hw-cap", "hw-yukselme",
    "hw-inis", "hw-egim", "hw-korkuluk", "hw-yon", "hw-ayak",
  ];
  function hw() { return window.__ADJY_HW; }
  function cokParca() { var h = hw(); return !!(h && h.n > 1); }

  window.ADJY_ARAC = {
    id: "araba-yolu",

    // Geniş ekranda model ortada, ayarlar iki yanda (bkz. kopru.css)
    yerlesim: { kap: ".hw-izgara", panel: ".hw-panel", sahne: ".hw-sahne" },

    // Ayarlar numaralı adımlara ayrılır. yer: adımın modelin neresinde duracağı
    // (sol | sag | alt). sec: o adıma taşınan öğeler. ad: rehber çubuğundaki kısa ad.
    adimlar: [
      { ad: "Başla", baslik: "Kendi yolunuzu kurun ya da hazır bir pistle başlayın", ipucu: "＋ Kendi yolun tek bir düzle başlar; parçaları siz eklersiniz. Hazır pistlerin de her parçası değiştirilebilir.", yer: "sol", sec: ["#grup-yollar .hw-yollar"] },
      { ad: "Yol", baslik: "Parçaları uç uca ekleyin", ipucu: "Her yeni parça seçili parçanın ucuna takılır. × ile çıkarın, ← → ile sırasını değiştirin, Geri al ile vazgeçin. Değiştirmek istediğiniz parçaya dokunun; sonraki adımlar o parçayı değiştirir.", yer: "alt", sec: ["#grup-yolum .hw-zincir-kap"] },
      { ad: "Parça", baslik: "Seçili parçanın tipi", ipucu: "Viraj döner, düz yol uzar, rampa yükselir ya da iner, looping tam tur atar.", yer: "sol", sec: ["#grup-tip .param-row", "#grup-hazir .hw-hazir-kap"] },
      { ad: "Ölçü", baslik: "Ölçüyü verin", ipucu: "Uzunluğu, viraj yarıçapını, looping çapını ve ne kadar yükselip ineceğini ayarlayın.", yer: "sag", sec: ["#grup-olcu .param-row"] },
      { ad: "Yön", baslik: "Yön ve viraj", ipucu: "Dönüş yönünü seçin. Virajda yan yatış ve dış kenar korkuluğu arabayı yolda tutar.", yer: "sag", sec: ["#grup-viraj .param-row"] },
      { ad: "Kenar", baslik: "Kenar ve bağlantı", ipucu: "Bütün yol için geçerlidir. Kenar yükseldikçe araba yoldan çıkmaz. Orijinal uyumlu uçlarda parçaları birleştiren bağlantı parçaları da basılır.", yer: "sag", sec: ["#grup-kenar .param-row"] },
      { ad: "Renk", baslik: "Rengi seçin", ipucu: "Yol bu renkte basılır. ▶ ile arabayı yolun başından sonuna sürün.", yer: "alt", sec: ["#grup-renk .param-row"] },
    ],

    // Atölye bölümü: üretim tablosu, toleranslar ve STL
    gizle: [".hw-atolye"],

    // Parça tipine ait olmayan (gizli, devre dışı) ayarlar sipariş özetine yazılmaz
    devreDisiAtla: true,
    kutularHep: true,

    // Çok parçalı yolda seçili parçanın alanları özete girmez; yerine bütün parçalar yazılır
    get ozetHaric() { return cokParca() ? PARCA_ALAN : []; },

    ozetEk: function () {
      var h = hw();
      if (!h || !h.olcu) return [];
      var bag = h.baglayici ? [{ ad: "Bağlantı parçası", deger: h.baglayiciDetay }] : [];
    if (!(h.n > 1)) return [{ ad: "Parça ölçüsü", deger: h.olcu }].concat(bag);
      var r = [{ ad: "Yol düzeni", deger: h.duzen }];
      (h.parcalar || []).forEach(function (t, i) { r.push({ ad: (i + 1) + ". parça", deger: t }); });
      r.push({ ad: "Yol ölçüsü", deger: h.olcu });
      return r.concat(bag);
    },

    // Parça listesi form alanlarında durmaz; kayıtla ayrıca taşınır
    durumOku: function () { var h = hw(); return h && h.durum ? h.durum() : null; },
    durumYaz: function (ek) {
      var h = hw();
      if (h && h.yaz) h.yaz(ek);
      return new Promise(function (r) { setTimeout(r, 120); });
    },

    olcum: {
      kutleG: { oku: function () { return hw() ? hw().olcum.kutleG : null; } },
      sureSaat: { oku: function () { return hw() ? hw().olcum.sureSaat : null; } },
    },

    hazirMi: function () {
      return !!(hw() && hw().hazir);
    },
  };
})();
