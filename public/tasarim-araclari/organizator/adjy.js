/* Çekmece organizeri ve duvar ızgarası — mağaza köprüsü ayarı */
(function () {
  // Aracın durumu form alanlarında değil, betiğin kendi değişkenlerinde
  // duruyor (P: ölçüler, ST: kutular) ve panel her sistem değişiminde
  // baştan çiziliyor. Araç klasik bir <script>; üst düzey const/let'leri
  // bu dosyadan da görünür. Betik henüz çalışmadıysa erişim hata verir.
  function ic() {
    try {
      return { P: P, ST: ST };
    } catch (e) {
      return null;
    }
  }

  // Sisteme göre kaydedilen ölçüler. Patlatma kaydırıcısı ve yazıcı tablası
  // görünüm ayarı; siparişin parçası değil.
  var ORTAK = ["U", "maxPlate", "strategy"];
  var OLCU = { 1: ["W", "D", "H", "tol"], 2: ["WW", "WH", "BD", "T", "dd", "wtol"] };

  function tam(v, en, ust) {
    v = Math.round(Number(v));
    if (!isFinite(v)) v = en;
    return Math.min(ust, Math.max(en, v));
  }

  function kutular(a) {
    return a.P.sys === 1
      ? a.ST.bins1.map(function (b) { return { x: b.x, y: b.y, w: b.w, d: b.d, div: b.div || 1 }; })
      : a.ST.boxes2.map(function (b) { return { x: b.x, top: b.top, w: b.w, h: b.h, div: b.div || 1 }; });
  }

  function yenidenKur() {
    DIRTY = false;
    rebuild();
  }

  // Aracın koduna dokunmadan yapılan üç düzeltme. Araç güncellenip
  // index.html yeniden kopyalandığında bunlar kendiliğinden geçerli kalır.
  document.addEventListener("DOMContentLoaded", function () {
    if (!ic()) return;

    // 1) Araç gösterim kipini kurarken sahnenin sınıfını baştan yazıyor ve
    //    dar ekranda sahneyi açık tutan sınıfı da siliyor: telefonda model
    //    ilk çizimden sonra kayboluyordu.
    var asilKip = window.applyMode;
    window.applyMode = function () {
      asilKip.apply(this, arguments);
      var sahne = document.getElementById("view");
      if (sahne) sahne.classList.toggle("mob-active", (ST.mobilePanel || "view") === "view");
    };

    // 2) Otomatik yerleşim, tabla kilitleri görünsün diye çekmecenin
    //    ortasında 12 hücrelik bir boşluk bırakıyor. Tanıtım için iyi,
    //    ama müşteri dolu bir çekmece bekler; boşluk bırakılmaz.
    var asilDoldur = window.autoFill1;
    window.autoFill1 = function (Nx, Ny) {
      var l = LAY;
      if (!l) return asilDoldur(Nx, Ny);
      var vj = l.vj;
      var hj = l.hj;
      l.vj = [];
      l.hj = [];
      try {
        return asilDoldur(Nx, Ny);
      } finally {
        l.vj = vj;
        l.hj = hj;
      }
    };

    // 3) Sistem değişince panel baştan çiziliyor; müşteri kipinde adlar
    //    çizimin hemen ardından çevrilir, bir an bile değişken adı görünmez.
    if (location.pathname.indexOf("/admin/") !== 0) {
      var asilPanel = window.renderParams;
      window.renderParams = function () {
        asilPanel.apply(this, arguments);
        if (window.ADJY && window.ADJY.metinleriYenile) window.ADJY.metinleriYenile();
      };
    }

    DIRTY = true;
  });

  window.ADJY_ARAC = {
    id: "organizator",

    // Bütün durum durumOku/durumYaz ile taşınır
    alanYok: true,

    gizle: [
      ".brand",
      ".hud",
      "#sheet",
      "#bottom",
      "#errbox",
      "#insp",
      ".legend",
      "#calc",
      "#sysw button i",
      ".sec h3 em",
      ".prm:has(.seg) .rng",
      '#camChips [data-cam="section"]',
      '#camChips [data-cam="key"]',
      "#modeChips button",
      '#mobNav [data-panel="sheet"]',
      // Telefonda kutu araçlarının üstüne biniyor; "Ölçüler" sekmesi aynı işi görüyor
      "#mobQuickParams",
      // Tablanın kaç parçaya bölüneceği ve geçme payları atölyenin kararı
      '.prm:has([data-k="maxPlate"])',
      '.prm:has([data-k="strategy"])',
      ".prm:has(#r_tol)",
      ".prm:has(#r_T)",
      ".prm:has(#r_dd)",
      ".prm:has(#r_wtol)",
    ],

    // Sade görünümde kapalı duran ayrıntı ayarları
    gelismis: [
      '.sec:has([data-k="U"])',
      ".sec:has(#r_explode)",
      ".sec:has(#r_wexplode)",
      "#modeChips",
    ],

    // Araçtaki adlar değişken adı; müşteriye okunur adıyla gösterilir.
    // Atölye kipinde özgün adlar kalır: pafta ve parça listesi onlarla eşleşir.
    metinler: [
      { sec: '#sysw [data-sys="1"] .full-txt', metin: "Çekmece organizeri" },
      { sec: '#sysw [data-sys="2"] .full-txt', metin: "Duvar ızgarası ve askılı kutular" },
      { sec: '#sysw [data-sys="2"] .mob-txt', metin: "Duvar" },
      { sec: '#mobNav [data-panel="view"] span', metin: "Model" },
      { sec: '#mobNav [data-panel="params"] span', metin: "Ölçüler" },
      { sec: "#mobBackTo3d", metin: "‹ Modele dön" },
      { sec: ".sec:has(#r_W) h3", metin: "Çekmecenizin iç ölçüsü" },
      { sec: 'label[for="r_W"]', metin: "Genişlik (mm)" },
      { sec: 'label[for="r_D"]', metin: "Derinlik (mm)" },
      { sec: ".sec:has(#r_WW) h3", metin: "Duvardaki alan" },
      { sec: 'label[for="r_WW"]', metin: "Genişlik (mm)" },
      { sec: 'label[for="r_WH"]', metin: "Yükseklik (mm)" },
      { sec: '.sec:has([data-k="U"]) h3', metin: "Izgara" },
      { sec: '.prm:has([data-k="U"]) label', metin: "Hücre boyu (mm)" },
      { sec: ".sec:has(#r_H) h3", metin: "Kutular" },
      { sec: 'label[for="r_H"]', metin: "Kutu yüksekliği (mm)" },
      { sec: ".sec:has(#r_BD) h3", metin: "Kutular" },
      { sec: 'label[for="r_BD"]', metin: "Kutu derinliği (mm)" },
      { sec: ".sec:has(#r_explode) h3", metin: "Görünüm" },
      { sec: 'label[for="r_explode"]', metin: "Parçaları ayır (önizleme)" },
      { sec: ".sec:has(#r_wexplode) h3", metin: "Görünüm" },
      { sec: 'label[for="r_wexplode"]', metin: "Parçaları ayır (önizleme)" },
      { sec: ".sec:has(#calc) h3", metin: "Kutuları düzenleyin" },
      {
        sec: ".sec:has(#calc) .note",
        metin:
          "Kutular otomatik yerleşir. Değiştirmek için modelin altındaki araçları kullanın: Kutu Ekle ile boş hücreye kutu koyun, Böl ile kutuya iç bölme ekleyin, Sil ile kaldırın.",
      },
      { sec: '#camChips [data-cam="top"]', metin: "Üstten" },
      { sec: '#toolChips [data-tool="inspect"]', metin: "◎ Gezin" },
      { sec: "#sizeChips .sz:first-child", metin: "Yeni kutu" },
      { sec: "#hint", metin: "Sürükle: döndür · Teker: yakınlaş · Araç seçip hücreye tıkla: düzenle" },
    ],

    durumOku: function () {
      var a = ic();
      if (!a) return null;
      var olcu = {};
      ORTAK.concat(OLCU[a.P.sys]).forEach(function (k) { olcu[k] = a.P[k]; });
      return {
        sys: a.P.sys,
        olcu: olcu,
        oto: a.P.sys === 1 ? !!a.ST.auto1 : !!a.ST.auto2,
        kutular: kutular(a),
      };
    },

    // Kayıttaki kutular olduğu gibi kurulur; otomatik yerleşim kapatılır ki
    // atölyede açılan model müşterinin gördüğüyle hücresi hücresine aynı olsun.
    durumYaz: function (ek) {
      var a = ic();
      if (!a || !ek || (ek.sys !== 1 && ek.sys !== 2)) return;
      if (a.P.sys !== ek.sys) switchSys(ek.sys);
      var olcu = ek.olcu || {};
      ORTAK.concat(OLCU[ek.sys]).forEach(function (k) {
        var v = olcu[k];
        if (k === "strategy") {
          if (v === "Dengeli_Bolme" || v === "Maks_Tabla") a.P[k] = v;
        } else if (typeof v === "number" && isFinite(v)) {
          a.P[k] = v;
        }
      });
      var liste = Array.isArray(ek.kutular) ? ek.kutular : [];
      if (ek.sys === 1) {
        a.ST.bins1 = liste.map(function (b) {
          return { x: tam(b.x, 0, 99), y: tam(b.y, 0, 99), w: tam(b.w, 1, 6), d: tam(b.d, 1, 6), div: tam(b.div, 1, 4) };
        });
        a.ST.auto1 = false;
      } else {
        a.ST.boxes2 = liste.map(function (b) {
          return { x: tam(b.x, 0, 99), top: tam(b.top, 0, 99), w: tam(b.w, 1, 6), h: tam(b.h, 1, 6), div: tam(b.div, 1, 4) };
        });
        a.ST.auto2 = false;
      }
      a.ST.sel = null;
      a.ST.selId = null;
      renderParams();
      yenidenKur();
    },

    // Sepette kısa kalsın: hangi ürün, ölçüsü, kutu yüksekliği ve sayısı.
    // Izgara ve kutu dökümü atölye içindir (ayrıntı).
    ozetEk: function () {
      var a = ic();
      if (!a) return [];
      var p = a.P;
      var s1 = p.sys === 1;
      var liste = kutular(a);
      var satirlar = [
        { ad: "Ürün", deger: s1 ? "Çekmece organizeri" : "Duvar ızgarası ve askılı kutular" },
        s1
          ? { ad: "Çekmece iç ölçüsü", deger: p.W + " × " + p.D + " mm" }
          : { ad: "Duvardaki alan", deger: p.WW + " × " + p.WH + " mm" },
        s1
          ? { ad: "Kutu yüksekliği", deger: p.H + " mm" }
          : { ad: "Kutu derinliği", deger: p.BD + " mm" },
        { ad: "Kutu sayısı", deger: String(liste.length) },
        { ad: "Hücre boyu", deger: p.U + " mm", ayrinti: true },
      ];
      try {
        if (LAY) satirlar.push({ ad: "Izgara", deger: LAY.Nx + " × " + LAY.Ny + " hücre", ayrinti: true });
      } catch (e) { /* model henüz kurulmadı */ }
      var boylar = {};
      var bolmeli = 0;
      liste.forEach(function (b) {
        var ad = b.w + "×" + (s1 ? b.d : b.h);
        boylar[ad] = (boylar[ad] || 0) + 1;
        if (b.div > 1) bolmeli += 1;
      });
      // "2×1: 12" → 2 × 1 hücrelik kutudan 12 adet. Sipariş kaydı her satırı
      // 240 harfte kesiyor; uzun döküm ikinci satıra taşınır.
      var parcalar = Object.keys(boylar)
        .sort()
        .map(function (ad) { return ad + ": " + boylar[ad]; });
      var satir = [];
      var no = 1;
      function dokumYaz() {
        if (!satir.length) return;
        satirlar.push({
          ad: no === 1 ? "Kutu dökümü (hücre: adet)" : "Kutu dökümü " + no,
          deger: satir.join(", "),
          ayrinti: true,
        });
        satir = [];
        no += 1;
      }
      parcalar.forEach(function (parca) {
        if (satir.join(", ").length + parca.length > 200) dokumYaz();
        satir.push(parca);
      });
      dokumYaz();
      if (bolmeli) satirlar.push({ ad: "İç bölmeli kutu", deger: bolmeli + " adet", ayrinti: true });
      return satirlar;
    },

    // Aracın kendi metrajı: bütün parçaların hacminden
    olcum: {
      kutleG: { oku: function () { return PARTS.length ? totals().g : null; } },
      sureSaat: { oku: function () { return PARTS.length ? totals().mins / 60 : null; } },
    },

    hazirMi: function () {
      if (!ic()) return false;
      // Model ilk karede kuruluyor; sekme arka plandaysa kare gelmez.
      if (!PARTS.length && DIRTY) yenidenKur();
      return PARTS.length > 0;
    },
  };
})();
