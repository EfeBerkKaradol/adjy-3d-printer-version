/* ==========================================================================
   RENKLİ BASKI PAKETİ (yalnız atölye kipi)

   Müşterinin sitede kurduğu model (ölçüler, biçim, renkler) atölyede
   aynen yüklenir. Buradan iki şey çıkar:

   ÜRETİM PROJESİ (ADJY_RENKLI.uretim): aracın baskı yönündeki parça
   STL'lerinden, renge göre ayrı tablalara dizilmiş ve sipariş adedi
   kadar çoğaltılmış çok tablalı dilimleyici projesi. Basılan budur.

   RENK PAKETİ: modeli ekrandaki (montajlı) hâliyle, renge göre
   ayrılmış dosyalar olarak indirir:

     <arac>_renkli.3mf          Dilimleyici projesi: bütün renkler tek nesne,
                                her renk ayrı parça ve kendi filament
                                yuvasına atanmış; filament renkleri ve
                                yazıcı profili (dilimleyici-profil.json)
                                içinde. Anycubic Slicer Next, OrcaSlicer,
                                Bambu Studio: aç, dilimle, bas.
     <arac>_renk-1_<ad>.stl     Her renk ayrı STL, aynı orijine göre:
                                hepsi birlikte sürüklenip "tek nesne
                                olarak yükle" denirse yine yerine oturur.
     <arac>_renkler.txt         Hangi dosya hangi renk.

   Geometri sahnedeki modelden alınır (olcu.js → ADJY_OLCU.model()):
   ölçü çizgileriyle aynı kök, aynı süzgeç (gölge, zemin, düzenleme
   tutamacı yok). Birim mm, Z yukarı, model tablaya (Z=0) oturur.

   Paket kopru.js'in dosya toplama düzeneğiyle yakalanır: gizli
   #adjy-renkli-paket (hepsi) ve #adjy-renkli-3mf (yalnız 3MF) düğmeleri
   catalog.ts'te her aracın çıktılarında.
   ========================================================================== */
(function () {
  "use strict";

  if (location.pathname.indexOf("/admin/") !== 0) return;

  var AYAR = window.ADJY_ARAC || {};
  // Araç ayarı (adjy.js): ADJY_ARAC.renkliPaket = {
  //   haric: function (mesh) { return true },  // basılmayan parça
  //   tekRenk: true                             // tek filament (renkler yalnız ekran için)
  // }
  var PAKET = AYAR.renkliPaket || {};

  /**
   * Basılmayan parçalar pakete girmez: satın alınan metal parçalar
   * (pirinç yuva, vida, duy, NFC etiketi; metalik malzeme), cam ve ışık
   * kaynağı (saydam ya da parlayan malzeme), aracın kendi listesi.
   */
  function basilmaz(o, mt) {
    if ((mt.metalness || 0) >= 0.6) return true;
    if ((mt.transmission || 0) > 0 || (mt.transparent && mt.opacity < 0.5)) return true;
    if (mt.emissive && (mt.emissiveIntensity || 0) > 0.5) {
      var e = mt.emissive;
      if (e.r + e.g + e.b > 0.6) return true;
    }
    if (typeof PAKET.haric === "function" && PAKET.haric(o)) return true;
    return false;
  }

  // ---------- Renk adı ----------
  var RENKLER = [
    ["Siyah", 20, 20, 22], ["Antrasit", 60, 62, 66], ["Gri", 128, 128, 128], ["Açık gri", 190, 190, 190],
    ["Beyaz", 245, 245, 245], ["Krem", 236, 228, 205], ["Bej", 214, 196, 160], ["Kahverengi", 120, 78, 45],
    ["Pişmiş toprak", 190, 95, 60], ["Turuncu", 240, 110, 40], ["Kırmızı", 200, 35, 35], ["Bordo", 120, 25, 35],
    ["Pembe", 235, 140, 170], ["Mor", 120, 60, 160], ["Lacivert", 30, 40, 90], ["Mavi", 40, 100, 200],
    ["Açık mavi", 120, 180, 230], ["Turkuaz", 40, 170, 170], ["Yeşil", 50, 140, 70], ["Adaçayı yeşili", 140, 165, 130],
    ["Açık yeşil", 140, 200, 90], ["Sarı", 240, 205, 40], ["Altın", 200, 160, 60], ["Gümüş", 170, 172, 176]
  ];
  function renkAdi(r, g, b) {
    var en = null;
    var uzak = Infinity;
    RENKLER.forEach(function (k) {
      // "redmean" uzaklığı: göze yakın, koyu tonlarda maviye kaymaz
      var rm = (k[1] + r) / 2;
      var dr = k[1] - r, dg = k[2] - g, db = k[3] - b;
      var d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
      if (d < uzak) {
        uzak = d;
        en = k[0];
      }
    });
    return en;
  }
  function dosyaAdi(s) {
    return String(s)
      .toLocaleLowerCase("tr-TR")
      .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /**
   * Ekranda parçaları ayırt etmek için kullanılan yakın tonlar (gövde koyu
   * gri, kapak bir ton açık) aynı filamenttir. Ağırlığa göre sıralı renk
   * listesinde her renk, kendinden ağır ve yeterince yakın ilk renge bağlanır.
   * @param agirlikli [[hex, ağırlık], …]
   * @returns Map hex → temsilci hex
   */
  function yakinRenkler(agirlikli) {
    var sirali = agirlikli.slice().sort(function (a, b) { return b[1] - a[1]; });
    var temsilci = new Map();
    var secilen = [];
    sirali.forEach(function (e) {
      var h = e[0];
      var r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
      var bulunan = null;
      for (var i = 0; i < secilen.length && !bulunan; i++) {
        var q = secilen[i];
        if (Math.hypot(q.r - r, q.g - g, q.b - b) <= 48) bulunan = q.h;
      }
      if (bulunan) temsilci.set(h, bulunan);
      else {
        secilen.push({ h: h, r: r, g: g, b: b });
        temsilci.set(h, h);
      }
    });
    return temsilci;
  }

  // ---------- Geometri ----------
  /** Sahnedeki basılacak ağlar: [{ hex, u: [x, y, z, …] }] (mm, Z yukarı, sahnedeki yerinde) */
  function sahneAglari() {
    var m = window.ADJY_OLCU && window.ADJY_OLCU.model();
    if (!m || !m.aglar.length) throw new Error("Model sahnesi bulunamadı");
    var T = m.T;
    var up = m.kamera ? m.kamera.up : new T.Vector3(0, 1, 0);
    var zYukari = Math.abs(up.z) > Math.abs(up.y);
    var olcek = m.birim;
    var aglar = [];
    var v = new T.Vector3();

    // Tek filamentli araçta bütün parçalar en çok yüzeyi olan rengi alır
    var tekRenk = null;
    if (PAKET.tekRenk) {
      var say = new Map();
      m.aglar.forEach(function (o) {
        var mt = Array.isArray(o.material) ? o.material[0] : o.material;
        if (!mt || !mt.color || basilmaz(o, mt)) return;
        var h = "#" + mt.color.getHexString();
        var n = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
        say.set(h, (say.get(h) || 0) + n);
      });
      tekRenk = Array.from(say.entries()).sort(function (a, b) { return b[1] - a[1]; })[0];
      tekRenk = tekRenk ? tekRenk[0] : "#f4f1ea";
    }

    m.aglar.forEach(function (o) {
      var g = o.geometry;
      var poz = g && g.attributes && g.attributes.position;
      if (!poz) return;
      var malz = Array.isArray(o.material) ? o.material : [o.material];
      // Malzeme grupları varsa her grup kendi rengini alır
      var parcalar = g.groups && g.groups.length && Array.isArray(o.material)
        ? g.groups.map(function (gr) { return { bas: gr.start, say: gr.count, m: malz[gr.materialIndex] || malz[0] }; })
        : [{ bas: 0, say: g.index ? g.index.count : poz.count, m: malz[0] }];

      var orneklerSayisi = o.isInstancedMesh ? o.count : 1;
      var orneklik = new T.Matrix4();
      var dunya = new T.Matrix4();

      for (var s = 0; s < orneklerSayisi; s++) {
        if (o.isInstancedMesh) {
          o.getMatrixAt(s, orneklik);
          dunya.multiplyMatrices(o.matrixWorld, orneklik);
        } else {
          dunya.copy(o.matrixWorld);
        }
        // Aynalanmış dönüşüm (negatif ölçek) üçgen yönünü ters çevirir
        var ters = dunya.determinant() < 0;

        parcalar.forEach(function (pc) {
          var mt = pc.m;
          if (!mt || !mt.color || mt.visible === false) return;
          if (basilmaz(o, mt)) return;
          var hex = PAKET.tekRenk ? tekRenk : "#" + mt.color.getHexString();
          var hedef = [];
          aglar.push({ hex: hex, u: hedef });
          var idx = g.index;
          var bitis = pc.bas + pc.say;
          for (var i = pc.bas; i + 2 < bitis; i += 3) {
            var sira = ters ? [0, 2, 1] : [0, 1, 2];
            for (var j = 0; j < 3; j++) {
              var k = idx ? idx.getX(i + sira[j]) : i + sira[j];
              v.fromBufferAttribute(poz, k).applyMatrix4(dunya);
              // Y yukarı sahne → Z yukarı baskı (sağ el kuralı korunur)
              if (zYukari) hedef.push(v.x * olcek, v.y * olcek, v.z * olcek);
              else hedef.push(v.x * olcek, -v.z * olcek, v.y * olcek);
            }
          }
        });
      }
    });

    return aglar;
  }

  /** Renk → dünya koordinatlarında üçgen dizisi (mm, Z yukarı) */
  function renkGruplari() {
    var gruplar = new Map();
    var aglar = sahneAglari();
    var agirlik = new Map();
    aglar.forEach(function (a) { agirlik.set(a.hex, (agirlik.get(a.hex) || 0) + a.u.length); });
    var temsilci = yakinRenkler(Array.from(agirlik.entries()));
    aglar.forEach(function (a) {
      var hex = temsilci.get(a.hex) || a.hex;
      if (!gruplar.has(hex)) gruplar.set(hex, []);
      var h = gruplar.get(hex);
      for (var i = 0; i < a.u.length; i++) h.push(a.u[i]);
    });

    // Tablaya oturt ve XY'de ortala
    var min = [Infinity, Infinity, Infinity];
    var max = [-Infinity, -Infinity, -Infinity];
    gruplar.forEach(function (d) {
      for (var i = 0; i < d.length; i += 3) {
        for (var a = 0; a < 3; a++) {
          if (d[i + a] < min[a]) min[a] = d[i + a];
          if (d[i + a] > max[a]) max[a] = d[i + a];
        }
      }
    });
    var kayX = (min[0] + max[0]) / 2;
    var kayY = (min[1] + max[1]) / 2;
    var kayZ = min[2];
    gruplar.forEach(function (d) {
      for (var i = 0; i < d.length; i += 3) {
        d[i] -= kayX;
        d[i + 1] -= kayY;
        d[i + 2] -= kayZ;
      }
    });

    // Büyükten küçüğe, hacme göre (en çok filament giden renk 1 numara;
    // üretim projesindeki filament sırasıyla aynı)
    function hacmi(u) {
      var v = 0;
      for (var q = 0; q + 8 < u.length; q += 9) {
        v += (u[q] * (u[q + 4] * u[q + 8] - u[q + 5] * u[q + 7]) -
          u[q + 1] * (u[q + 3] * u[q + 8] - u[q + 5] * u[q + 6]) +
          u[q + 2] * (u[q + 3] * u[q + 7] - u[q + 4] * u[q + 6])) / 6;
      }
      return Math.abs(v);
    }
    return Array.from(gruplar.entries())
      .filter(function (e) { return e[1].length >= 9; })
      .map(function (e) { return [e[0], e[1], hacmi(e[1])]; })
      .sort(function (a, b) { return b[2] - a[2]; })
      .map(function (e, i) {
        var r = parseInt(e[0].slice(1, 3), 16);
        var gg = parseInt(e[0].slice(3, 5), 16);
        var b = parseInt(e[0].slice(5, 7), 16);
        return { no: i + 1, hex: e[0].toUpperCase(), ad: renkAdi(r, gg, b), ucgenler: new Float32Array(e[1]), boyut: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
      });
  }

  // ---------- STL (ikili) ----------
  function stl(ucgenler, baslik) {
    var n = ucgenler.length / 9;
    var buf = new ArrayBuffer(84 + n * 50);
    var dv = new DataView(buf);
    var bas = String(baslik || "ADJY").slice(0, 79);
    for (var i = 0; i < bas.length; i++) dv.setUint8(i, bas.charCodeAt(i) & 0x7f);
    dv.setUint32(80, n, true);
    var o = 84;
    for (var t = 0; t < n; t++) {
      var p = t * 9;
      var ax = ucgenler[p], ay = ucgenler[p + 1], az = ucgenler[p + 2];
      var bx = ucgenler[p + 3], by = ucgenler[p + 4], bz = ucgenler[p + 5];
      var cx = ucgenler[p + 6], cy = ucgenler[p + 7], cz = ucgenler[p + 8];
      var ux = bx - ax, uy = by - ay, uz = bz - az;
      var wx = cx - ax, wy = cy - ay, wz = cz - az;
      var nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      var l = Math.hypot(nx, ny, nz) || 1;
      dv.setFloat32(o, nx / l, true); dv.setFloat32(o + 4, ny / l, true); dv.setFloat32(o + 8, nz / l, true);
      for (var k = 0; k < 9; k++) dv.setFloat32(o + 12 + k * 4, ucgenler[p + k], true);
      dv.setUint16(o + 48, 0, true);
      o += 50;
    }
    return new Blob([buf], { type: "model/stl" });
  }

  // ---------- 3MF (dilimleyici projesi) ----------
  // Dosya Bambu Studio / OrcaSlicer ailesinin (Anycubic Slicer Next dâhil)
  // proje biçiminde yazılır:
  //   3D/3dmodel.model               her renk ayrı ağ, hepsi tek nesnenin parçası
  //   Metadata/model_settings.config parça → filament yuvası (1, 2, 3…)
  //   Metadata/project_settings.config  yazıcı + işlem + filament profili;
  //                                  filament renkleri modelin renkleri
  // Açınca parçalar filamentlerine atanmış, filament renkleri ayarlı gelir.
  // Çekirdek 3MF renk tablosu (basematerials) da yazılır: başka dilimleyici
  // renkleri oradan okur.
  var PROFIL = null;
  var profilSozu = fetch(new URL("../_adjy/dilimleyici-profil.json", location.href))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (pr) { PROFIL = pr && pr.ayar ? pr : null; return PROFIL; })
    .catch(function () { return null; });

  function xmlKacis(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function sayi(x) {
    return (Math.round(x * 10000) / 10000).toString();
  }
  function parcaAdi(g) {
    return g.no + " " + g.ad + " " + g.hex;
  }
  function tablaOrtasi() {
    var t = PROFIL && PROFIL.tabla ? PROFIL.tabla : [250, 250];
    return [t[0] / 2, t[1] / 2];
  }

  function model3mf(gruplar, nesneAdi) {
    var parcalar = [];
    parcalar.push(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<model unit="millimeter" xml:lang="tr-TR" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021">\n' +
        ' <metadata name="Application">BambuStudio-2.0.0.0</metadata>\n' +
        ' <metadata name="BambuStudio:3mfVersion">1</metadata>\n' +
        ' <metadata name="Title">' + xmlKacis(nesneAdi) + '</metadata>\n' +
        ' <metadata name="Designer">ADJY</metadata>\n' +
        ' <resources>\n  <basematerials id="100">\n'
    );
    gruplar.forEach(function (g) {
      parcalar.push('   <base name="' + xmlKacis(g.ad + " " + g.hex) + '" displaycolor="' + g.hex + 'FF"/>\n');
    });
    parcalar.push("  </basematerials>\n");

    gruplar.forEach(function (g, gi) {
      var id = gi + 1;
      var harita = new Map();
      var kose = [];
      var ucgen = [];
      var u = g.ucgenler;
      for (var t = 0; t < u.length; t += 9) {
        var ix = [];
        for (var j = 0; j < 3; j++) {
          var x = u[t + j * 3], y = u[t + j * 3 + 1], z = u[t + j * 3 + 2];
          var key = Math.round(x * 1e4) + "," + Math.round(y * 1e4) + "," + Math.round(z * 1e4);
          var n = harita.get(key);
          if (n === undefined) {
            n = kose.length;
            harita.set(key, n);
            kose.push('<vertex x="' + sayi(x) + '" y="' + sayi(y) + '" z="' + sayi(z) + '"/>');
          }
          ix.push(n);
        }
        if (ix[0] === ix[1] || ix[1] === ix[2] || ix[0] === ix[2]) continue;
        ucgen.push('<triangle v1="' + ix[0] + '" v2="' + ix[1] + '" v3="' + ix[2] + '"/>');
      }
      parcalar.push(
        '  <object id="' + id + '" type="model" pid="100" pindex="' + gi + '" name="' + xmlKacis(parcaAdi(g)) +
          '">\n   <mesh>\n    <vertices>\n' +
          kose.join("\n") + "\n    </vertices>\n    <triangles>\n" + ucgen.join("\n") +
          "\n    </triangles>\n   </mesh>\n  </object>\n"
      );
    });

    // Tek nesne, her renk bir parça; tablanın ortasına yerleşir
    var montaj = gruplar.length + 1;
    var orta = tablaOrtasi();
    parcalar.push('  <object id="' + montaj + '" type="model" name="' + xmlKacis(nesneAdi) + '">\n   <components>\n');
    gruplar.forEach(function (g, gi) {
      parcalar.push('    <component objectid="' + (gi + 1) + '" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>\n');
    });
    parcalar.push(
      "   </components>\n  </object>\n </resources>\n <build>\n  <item objectid=\"" + montaj +
        '" transform="1 0 0 0 1 0 0 0 1 ' + orta[0] + " " + orta[1] + ' 0" printable="1"/>\n </build>\n</model>\n'
    );
    return parcalar.join("");
  }

  /** Parça → filament yuvası (renk sırası = filament numarası) */
  function parcaAyari(gruplar, nesneAdi) {
    var montaj = gruplar.length + 1;
    var s = '<?xml version="1.0" encoding="UTF-8"?>\n<config>\n  <object id="' + montaj + '">\n' +
      '    <metadata key="name" value="' + xmlKacis(nesneAdi) + '"/>\n    <metadata key="extruder" value="1"/>\n';
    gruplar.forEach(function (g, gi) {
      s += '    <part id="' + (gi + 1) + '" subtype="normal_part">\n' +
        '      <metadata key="name" value="' + xmlKacis(parcaAdi(g)) + '"/>\n' +
        '      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n' +
        '      <metadata key="extruder" value="' + g.no + '"/>\n    </part>\n';
    });
    return s + "  </object>\n</config>\n";
  }

  // Renk değişiminde memeden atılacak filament (mm³): açık renge geçiş
  // daha çok temizlik ister. Kaba bir başlangıç değeri; dilimleyicideki
  // "otomatik hesapla" ile istenirse yeniden hesaplanır.
  function parlaklik(hex) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  function yikama(a, b) {
    if (a === b) return 0;
    var fark = 0;
    for (var i = 1; i < 7; i += 2) fark += Math.abs(parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16));
    fark /= 765;
    return Math.round(120 + 260 * fark + 380 * Math.max(0, parlaklik(b) - parlaklik(a)));
  }

  /** Profil şablonunu modelin renk sayısına ve renklerine göre doldurur */
  function projeAyari(gruplar) {
    if (!PROFIL) return null;
    var n = gruplar.length;
    var a = JSON.parse(JSON.stringify(PROFIL.ayar));
    (PROFIL.filamentAlanlari || []).forEach(function (k) {
      if (!Array.isArray(a[k]) || !a[k].length) return;
      var ilk = a[k][0];
      a[k] = gruplar.map(function () { return ilk; });
    });
    var renkler = gruplar.map(function (g) { return g.hex; });
    a.filament_colour = renkler;
    if (Array.isArray(a.filament_colour_info)) a.filament_colour_info = renkler.slice();
    var matris = [];
    renkler.forEach(function (x) { renkler.forEach(function (y) { matris.push(String(yikama(x, y))); }); });
    a.flush_volumes_matrix = matris;
    a.flush_volumes_vector = renkler.concat(renkler).map(function () { return "140"; });
    // Stok Anycubic PLA profili meme sertliği 3 ister, pirinç meme 2'dir: her
    // dilimlemede yersiz uyarı çıkar. PLA aşındırıcı değil; şart kaldırılır.
    var filFark = "";
    if (Array.isArray(a.required_nozzle_HRC)) {
      a.required_nozzle_HRC = a.required_nozzle_HRC.map(function () { return "0"; });
      filFark = "required_nozzle_HRC";
    }
    var genel = AYAR.baskiAyar || {};
    Object.keys(genel).forEach(function (k) { a[k] = genel[k]; });
    // Dilimleyici arayüzü sistem profilini açıp yalnız burada sayılan farkları uygular
    a.different_settings_to_system = [Object.keys(genel).join(";")].concat(renkler.map(function () { return filFark; }), [""]);
    // Tek renkte temizleme kulesi gereksiz
    if (n < 2 && "enable_prime_tower" in a) a.enable_prime_tower = "0";
    return JSON.stringify(a, null, 1);
  }

  // ---------- ZIP (sıkıştırmasız; 3MF bir ZIP paketidir) ----------
  var CRC = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(b) {
    var c = 0xffffffff;
    for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function zip(dosyalar) {
    var enc = new TextEncoder();
    var parcalar = [];
    var merkez = [];
    var konum = 0;
    dosyalar.forEach(function (d) {
      var ad = enc.encode(d.ad);
      var veri = typeof d.veri === "string" ? enc.encode(d.veri) : d.veri;
      var crc = crc32(veri);
      var yerel = new DataView(new ArrayBuffer(30));
      yerel.setUint32(0, 0x04034b50, true);
      yerel.setUint16(4, 20, true);
      yerel.setUint16(6, 0x0800, true); // UTF-8 ad
      yerel.setUint16(8, 0, true);
      yerel.setUint32(14, crc, true);
      yerel.setUint32(18, veri.length, true);
      yerel.setUint32(22, veri.length, true);
      yerel.setUint16(26, ad.length, true);
      parcalar.push(new Uint8Array(yerel.buffer), ad, veri);
      var m = new DataView(new ArrayBuffer(46));
      m.setUint32(0, 0x02014b50, true);
      m.setUint16(4, 20, true);
      m.setUint16(6, 20, true);
      m.setUint16(8, 0x0800, true);
      m.setUint32(16, crc, true);
      m.setUint32(20, veri.length, true);
      m.setUint32(24, veri.length, true);
      m.setUint16(28, ad.length, true);
      m.setUint32(42, konum, true);
      merkez.push(new Uint8Array(m.buffer), ad);
      konum += 30 + ad.length + veri.length;
    });
    var merkezBoyu = merkez.reduce(function (s, p) { return s + p.length; }, 0);
    var son = new DataView(new ArrayBuffer(22));
    son.setUint32(0, 0x06054b50, true);
    son.setUint16(8, dosyalar.length, true);
    son.setUint16(10, dosyalar.length, true);
    son.setUint32(12, merkezBoyu, true);
    son.setUint32(16, konum, true);
    return new Blob(parcalar.concat(merkez, [new Uint8Array(son.buffer)]), { type: "model/3mf" });
  }

  function paket3mf(gruplar, nesneAdi) {
    var dosyalar = [
      {
        ad: "[Content_Types].xml",
        veri:
          '<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'
      },
      {
        ad: "_rels/.rels",
        veri:
          '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'
      },
      { ad: "3D/3dmodel.model", veri: model3mf(gruplar, nesneAdi) },
      { ad: "Metadata/model_settings.config", veri: parcaAyari(gruplar, nesneAdi) }
    ];
    var proje = projeAyari(gruplar);
    if (proje) dosyalar.push({ ad: "Metadata/project_settings.config", veri: proje });
    return zip(dosyalar);
  }

  // ---------- İndirme ----------
  function indir(blob, ad) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = ad;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 4000);
  }

  function adlar() {
    return { on: dosyaAdi(AYAR.id || "model"), nesneAdi: (AYAR.ad || AYAR.id || "ADJY model") + "" };
  }
  function stlAdi(on, g) {
    return on + "_renk-" + g.no + "_" + dosyaAdi(g.ad) + "-" + g.hex.slice(1).toLowerCase() + ".stl";
  }

  /** Yalnız renk ayarlı 3MF: dilimleyicide açılıp basılacak tek dosya */
  function ucMfIndir() {
    var gruplar = renkGruplari();
    var a = adlar();
    indir(paket3mf(gruplar, a.nesneAdi), a.on + "_renkli.3mf");
    return gruplar;
  }

  /** 3MF + renk başına STL + renk listesi */
  function paketiIndir() {
    var gruplar = renkGruplari();
    var a = adlar();
    var on = a.on;
    gruplar.forEach(function (g) {
      indir(stl(g.ucgenler, "ADJY " + on + " renk " + g.no + " " + g.hex), stlAdi(on, g));
    });
    var b = gruplar[0] ? gruplar[0].boyut : [0, 0, 0];
    var satirlar = [
      "RENKLİ BASKI PAKETİ — " + a.nesneAdi,
      "Müşterinin sitede kurduğu model; ölçüler mm, Z yukarı, parçalar birbirine göre yerinde.",
      "Toplam ölçü: " + b.map(function (x) { return x.toFixed(1); }).join(" × ") + " mm",
      "",
      "Filament yuvaları:"
    ];
    gruplar.forEach(function (g) {
      satirlar.push(
        "  Filament " + g.no + " → " + g.ad + " (" + g.hex + ") — " + (g.ucgenler.length / 9) + " üçgen — " + stlAdi(on, g)
      );
    });
    satirlar.push(
      "",
      "Bu STL'ler modelin ekrandaki (montajlı) duruşudur: renkleri görmek ve elle düzenlemek için.",
      "Basmak için üretim projesini kullanın (…_uretim_Nadet.3mf): parçalar baskı yönünde,",
      "renge göre ayrı tablalarda ve sipariş adedi kadar dizilidir.",
      "STL ile: bütün renk STL'lerini birlikte sürükleyin, 'tek nesne olarak yükle' sorusuna Evet deyin.",
      "Ayrı basılan parçalar (vida, kapak vb.) için aracın kendi parça STL'leri baskı yönüne göre hazırdır."
    );
    indir(new Blob(["\ufeff" + satirlar.join("\r\n") + "\r\n"], { type: "text/plain;charset=utf-8" }), on + "_renkler.txt");
    return gruplar;
  }

  /** Renk listesi (üçgenleri taşımadan): yönetim panelindeki filament şeridi */
  function renkListesi() {
    return renkGruplari().map(function (g) {
      return { no: g.no, hex: g.hex, ad: g.ad };
    });
  }

  // ---------- ÜRETİM DÜZENİ ----------
  // Renkli 3MF modeli sahnedeki (montajlı) duruşuyla verir: vidası gövdenin
  // içinde, parçalar dik. Öyle basılınca her katmanda renk değişir, baskı
  // günlerce sürer. Üretim projesi ise aracın kendi parça STL'lerinden
  // kurulur; onlar baskı yönünde, tablaya yatık ve ayrı ayrıdır:
  //
  //   · her parça dosyası ayrı nesne (katalogda aynı "nesne" adını taşıyan
  //     dosyalar aynı orijinde üst üste oturur: tek nesnenin renk parçaları)
  //   · renkler sahneden okunur: STL'deki her kabuk, sahnedeki eş kabukla
  //     (üçgen sayısı + hacim; dönmeden etkilenmez) eşlenir
  //   · sipariş adedi kadar çoğaltılır
  //   · hepsi tek tablaya sığıyorsa tek tabla: farklı renkte parçalar
  //     aralıklı dizilip NESNE NESNE basılır (filament yalnız parçalar
  //     arasında değişir; tek kelepçe 12 sa yerine 2,5 sa)
  //   · sığmıyorsa tek renkli nesneler rengine göre ayrı tablalara dizilir:
  //     o tablada filament hiç değişmez, temizleme kulesi gerekmez;
  //     çok renkli nesneler (kabartma yazılı levha gibi) kendi tablasında
  var TABLA_PAYI = 6; // tabla kenarından ve nesneler arası boşluk (mm)

  // ---------- BASKI SINIFLARI ----------
  // Proje dosyası her nesneye kendi dilimleme ayarını taşır: atölye dosyayı
  // açıp dilimler, ayar girmez. Sınıf, nesnenin işine göre seçilir:
  //   levha      ön yüzü üstte kabartmalı levha: 4 üst kat yeter, 5. kat ve
  //              1 mm üst kalınlık şartı filament israfı
  //   arkaLevha  fotoğraf yüzü tablada basılan levha: üstte kalan yüz arka
  //              yüzdür, 3 kat yeter; ortası seyrek
  //   takoz      ayak, takoz: içi %10
  //   kap        ince duvarlı kutu gövdesi: 3 çevre (duvar dolu çıkar, araya
  //              dolgu zikzağı girmez)
  //   islev      görünüşü değil ölçüsü önemli parça (fikstür, devre kutusu):
  //              tabla tek renkse 0,28 mm katman
  //   saglam     yük taşıyan parça (kelepçe, vida): 3 çevre, %20 dolgu
  //   dolu       litofan: duvar içi tam dolu olmazsa ışıkta dolgu deseni görünür
  // Araç, ADJY_ARAC.baski = [{ ad: "<düzenli ifade>", sinif: "…", ayar: {…} }]
  // ile kendi nesnelerini sınıflandırır; bildirmediği nesnede yükseklik
  // 6 mm'yi geçmiyorsa "levha", adı ayak/stand ise "takoz" uygulanır.
  var SINIF = {
    levha: { top_shell_layers: "4", top_shell_thickness: "0.8", bottom_shell_layers: "3", sparse_infill_density: "20%" },
    arkaLevha: { top_shell_layers: "3", top_shell_thickness: "0.6", bottom_shell_layers: "3", sparse_infill_density: "20%" },
    takoz: { sparse_infill_density: "10%", top_shell_layers: "4", top_shell_thickness: "0.8" },
    kap: { wall_loops: "3", top_shell_layers: "4", top_shell_thickness: "0.8" },
    islev: { sparse_infill_density: "12%", top_shell_layers: "3", top_shell_thickness: "0.8", kaba: "0.28" },
    saglam: { wall_loops: "3", sparse_infill_density: "20%" },
    dolu: { sparse_infill_density: "100%", wall_loops: "3" }
  };
  var VARSAYILAN_KURAL = [{ ad: "ayak|stand|takoz", sinif: "takoz" }];

  /** Nesnenin dilimleme ayarı: { anahtar: değer }. tekRenkTabla: tablada tek filament var */
  function nesneAyari(n, tekRenkTabla, hizli) {
    var kural = null;
    (AYAR.baski || []).concat(VARSAYILAN_KURAL).some(function (k) {
      try {
        if (new RegExp(k.ad, "i").test(n.ad)) { kural = k; return true; }
      } catch (e) { /* bozuk ifade: yok say */ }
      return false;
    });
    var sinif = kural ? kural.sinif : n.h <= 6.2 ? "levha" : null;
    var a = {};
    var kaynak = sinif && SINIF[sinif] ? SINIF[sinif] : {};
    Object.keys(kaynak).forEach(function (k) { a[k] = kaynak[k]; });
    if (kural && kural.ayar) Object.keys(kural.ayar).forEach(function (k) { a[k] = kural.ayar[k]; });
    // Kalın katman yalnız tek renkli tablada: temizleme kulesi bütün nesnelerde aynı katmanı ister
    if (a.kaba) {
      if (tekRenkTabla) a.layer_height = a.kaba;
      delete a.kaba;
    }
    // Atölye "Hızlı" seçtiyse: tek renkli tabladaki yüksek parçalar 0,28 mm.
    // Levhalar (renk katı 0,2'nin katı) ve litofan (ayrıntı) 0,20 mm kalır.
    if (hizli && tekRenkTabla && n.h > 6.2 && sinif !== "dolu") a.layer_height = "0.28";
    // Renk değişiminde atılan filament, varsa nesnenin dolgusuna gitsin
    if (n.parcalar.length > 1 || !tekRenkTabla) a.flush_into_infill = "1";
    return { sinif: sinif, ayar: a };
  }

  function stlOku(buf) {
    var dv = new DataView(buf);
    var n = buf.byteLength >= 84 ? dv.getUint32(80, true) : 0;
    if (buf.byteLength === 84 + n * 50) {
      var u = new Float32Array(n * 9);
      for (var t = 0; t < n; t++) {
        var o = 84 + t * 50 + 12;
        for (var k = 0; k < 9; k++) u[t * 9 + k] = dv.getFloat32(o + k * 4, true);
      }
      return u;
    }
    // Metin STL
    var metin = new TextDecoder().decode(buf);
    var sayilar = [];
    var re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g;
    var e;
    while ((e = re.exec(metin))) sayilar.push(+e[1], +e[2], +e[3]);
    return new Float32Array(sayilar.slice(0, Math.floor(sayilar.length / 9) * 9));
  }

  /** Üçgen çorbasını bağlı kabuklara ayırır: [{ u, n, hacim }] */
  function kabuklar(u) {
    var nt = u.length / 9;
    var harita = new Map();
    var ust = [];
    var kose = new Int32Array(nt * 3);
    for (var i = 0; i < nt * 3; i++) {
      var key = Math.round(u[i * 3] * 500) + "," + Math.round(u[i * 3 + 1] * 500) + "," + Math.round(u[i * 3 + 2] * 500);
      var id = harita.get(key);
      if (id === undefined) {
        id = ust.length;
        harita.set(key, id);
        ust.push(id);
      }
      kose[i] = id;
    }
    function bul(a) {
      while (ust[a] !== a) {
        ust[a] = ust[ust[a]];
        a = ust[a];
      }
      return a;
    }
    for (var t = 0; t < nt; t++) {
      var a = bul(kose[t * 3]), b = bul(kose[t * 3 + 1]), c = bul(kose[t * 3 + 2]);
      if (b !== a) ust[b] = a;
      c = bul(c);
      if (c !== a) ust[c] = a;
    }
    var grup = new Map();
    for (var t2 = 0; t2 < nt; t2++) {
      var kok = bul(kose[t2 * 3]);
      var l = grup.get(kok);
      if (!l) grup.set(kok, (l = []));
      l.push(t2);
    }
    var cikti = [];
    grup.forEach(function (l) {
      var w = new Float32Array(l.length * 9);
      var hacim = 0;
      for (var j = 0; j < l.length; j++) {
        var q = l[j] * 9;
        for (var k = 0; k < 9; k++) w[j * 9 + k] = u[q + k];
        hacim +=
          (u[q] * (u[q + 4] * u[q + 8] - u[q + 5] * u[q + 7]) -
            u[q + 1] * (u[q + 3] * u[q + 8] - u[q + 5] * u[q + 6]) +
            u[q + 2] * (u[q + 3] * u[q + 7] - u[q + 4] * u[q + 6])) / 6;
      }
      var k = kutu([{ u: w }]);
      cikti.push({ u: w, n: l.length, hacim: Math.abs(hacim), mn: k.mn, mx: k.mx });
    });
    return cikti;
  }

  /**
   * Kabukları adalara ayırır: kutuları birbirine değen kabuklar aynı parçadır
   * (kutu + içindeki dikmeler), değmeyenler ayrı parça (tablaya dizilmiş kutular).
   */
  function adalar(ks) {
    var ust = ks.map(function (_, i) { return i; });
    function bul(a) {
      while (ust[a] !== a) { ust[a] = ust[ust[a]]; a = ust[a]; }
      return a;
    }
    var pay = 0.3;
    for (var i = 0; i < ks.length; i++) {
      for (var j = i + 1; j < ks.length; j++) {
        var a = ks[i], b = ks[j];
        if (a.mn[0] - pay <= b.mx[0] && b.mn[0] - pay <= a.mx[0] &&
            a.mn[1] - pay <= b.mx[1] && b.mn[1] - pay <= a.mx[1] &&
            a.mn[2] - pay <= b.mx[2] && b.mn[2] - pay <= a.mx[2]) {
          var ra = bul(i), rb = bul(j);
          if (ra !== rb) ust[rb] = ra;
        }
      }
    }
    var grup = new Map();
    ks.forEach(function (k, i) {
      var r = bul(i);
      var l = grup.get(r);
      if (!l) grup.set(r, (l = []));
      l.push(k);
    });
    return Array.from(grup.values());
  }

  /** Sahne kabuklarından renk bulucu: (kabuk) → hex | null */
  function renkBulucu() {
    var dizin = new Map();
    sahneAglari().forEach(function (a) {
      kabuklar(new Float32Array(a.u)).forEach(function (k) {
        var l = dizin.get(k.n);
        if (!l) dizin.set(k.n, (l = []));
        l.push({ hacim: k.hacim, hex: a.hex.toUpperCase() });
      });
    });
    var baskin = null, enBuyuk = -1;
    var toplam = new Map();
    dizin.forEach(function (l) {
      l.forEach(function (x) { toplam.set(x.hex, (toplam.get(x.hex) || 0) + x.hacim + 1e-6); });
    });
    // Yakın tonlar tek filament
    var temsilci = yakinRenkler(Array.from(toplam.entries()));
    var birlesik = new Map();
    dizin.forEach(function (l) {
      l.forEach(function (x) {
        x.hex = temsilci.get(x.hex) || x.hex;
        var t = (birlesik.get(x.hex) || 0) + x.hacim + 1e-6;
        birlesik.set(x.hex, t);
        if (t > enBuyuk) { enBuyuk = t; baskin = x.hex; }
      });
    });
    renkBulucu.baskin = baskin;
    return function (k) {
      var l = dizin.get(k.n);
      if (!l) return null;
      var en = null, fark = Infinity;
      l.forEach(function (x) {
        var d = Math.abs(x.hacim - k.hacim);
        if (d < fark) { fark = d; en = x; }
      });
      return en && fark <= Math.max(0.5, k.hacim * 0.004) ? en.hex : null;
    };
  }

  function kutu(parcalar) {
    var mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    parcalar.forEach(function (pc) {
      var u = pc.u;
      for (var i = 0; i < u.length; i += 3) {
        for (var a = 0; a < 3; a++) {
          if (u[i + a] < mn[a]) mn[a] = u[i + a];
          if (u[i + a] > mx[a]) mx[a] = u[i + a];
        }
      }
    });
    return { mn: mn, mx: mx };
  }

  /**
   * @param dosyalar [{ ad, u: Float32Array, nesne? }]  aracın parça STL'leri
   * @param adet     sipariş adedi
   * @param duzen    "oto": tek tablaya sığıyor ve filament değişimi makulse tek tabla, değilse
   *                 renge göre ayrı (varsayılan) · "tek": sığıyorsa hep tek tabla · "ayri": hep ayrı
   * @returns { nesneler, renkler, tablalar, eslesmeyen }
   */
  function uretimPlani(dosyalar, adet, duzen) {
    var bul = renkBulucu();
    var tabla = PROFIL && PROFIL.tabla ? PROFIL.tabla : [250, 250];
    var hacimler = new Map();
    var eslesmeyen = 0;
    var kaynaklar = [];

    // 1) Dosyalar → nesneler (aynı "nesne" adı: tek nesnenin parçaları)
    var nesneMap = new Map();
    dosyalar.forEach(function (d, di) {
      var ks = kabuklar(d.u);
      var oy = new Map();
      ks.forEach(function (k) {
        k.hex = bul(k);
        if (k.hex) oy.set(k.hex, (oy.get(k.hex) || 0) + k.hacim + 1e-6);
      });
      var kk = kutu(ks);
      kaynaklar.push({ ad: d.ad, kabuk: ks.length, eslesen: ks.filter(function (k) { return k.hex; }).length, mn: kk.mn, mx: kk.mx });
      var cogunluk = null, enCok = -1;
      oy.forEach(function (v, h) { if (v > enCok) { enCok = v; cogunluk = h; } });
      // Aynı "nesne" adını taşıyan dosyalar tek nesnedir (yerinde, üst üste);
      // adsız dosya adalarına ayrılır: her ada ayrı dizilir
      var obek = d.nesne ? [ks] : adalar(ks);
      obek.forEach(function (ada, ai) {
        var anahtar = d.nesne ? "n:" + d.nesne : "d:" + di + ":" + ai;
        var nesne = nesneMap.get(anahtar);
        if (!nesne) nesneMap.set(anahtar, (nesne = { ad: d.nesne ? d.nesneAdi || d.nesne : d.ad.replace(/\.stl$/i, ""), renk: new Map() }));
        ada.forEach(function (k) {
          // tekRenk: dosyanın tamamı bir filament (fotoğrafın bir rengi); çoğunluk karar verir
          var hex = d.tekRenk ? cogunluk || k.hex : k.hex || cogunluk;
          if (!hex) { hex = "?"; eslesmeyen++; }
          var l = nesne.renk.get(hex);
          if (!l) nesne.renk.set(hex, (l = []));
          l.push(k);
          hacimler.set(hex, (hacimler.get(hex) || 0) + k.hacim);
        });
      });
    });

    // Rengi bulunamayan kabuklar en çok kullanılan rengi alır
    var sirali = Array.from(hacimler.entries()).filter(function (e) { return e[0] !== "?"; })
      .sort(function (a, b) { return b[1] - a[1]; });
    var yedek = sirali.length ? sirali[0][0] : renkBulucu.baskin || "#B4B4B4";
    if (hacimler.has("?")) hacimler.set(yedek, (hacimler.get(yedek) || 0) + hacimler.get("?"));
    hacimler.delete("?");
    var renkler = Array.from(hacimler.entries()).sort(function (a, b) { return b[1] - a[1]; }).map(function (e, i) {
      var h = e[0];
      return { no: i + 1, hex: h, ad: renkAdi(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)) };
    });
    var renkNo = new Map(renkler.map(function (r) { return [r.hex, r.no]; }));

    // 2) Nesneyi kendi orijinine oturt (XY ortada, Z tablada); geniş kenar X'te
    var nesneler = [];
    nesneMap.forEach(function (n) {
      var parcalar = [];
      n.renk.forEach(function (ks, hex) {
        if (hex === "?") hex = yedek;
        var toplam = ks.reduce(function (t, k) { return t + k.u.length; }, 0);
        var u = new Float32Array(toplam);
        var o = 0;
        ks.forEach(function (k) { u.set(k.u, o); o += k.u.length; });
        var var_ = parcalar.find(function (pc) { return pc.hex === hex; });
        if (var_) {
          var b = new Float32Array(var_.u.length + u.length);
          b.set(var_.u);
          b.set(u, var_.u.length);
          var_.u = b;
        } else parcalar.push({ hex: hex, no: renkNo.get(hex), u: u });
      });
      if (!parcalar.length) return;
      var k0 = kutu(parcalar);
      var w = k0.mx[0] - k0.mn[0], d = k0.mx[1] - k0.mn[1];
      var cevir = d > w; // uzun kenar X'e
      var cx = (k0.mn[0] + k0.mx[0]) / 2, cy = (k0.mn[1] + k0.mx[1]) / 2, z0 = k0.mn[2];
      parcalar.forEach(function (pc) {
        var u = pc.u;
        for (var i = 0; i < u.length; i += 3) {
          var x = u[i] - cx, y = u[i + 1] - cy;
          u[i] = cevir ? y : x;
          u[i + 1] = cevir ? -x : y;
          u[i + 2] -= z0;
        }
      });
      parcalar.forEach(function (pc) {
        var u = pc.u, a = Infinity, b = -Infinity;
        for (var i = 2; i < u.length; i += 3) {
          if (u[i] < a) a = u[i];
          if (u[i] > b) b = u[i];
        }
        pc.z0 = a;
        pc.z1 = b;
      });
      parcalar.sort(function (a, b) { return a.no - b.no; });
      nesneler.push({
        ad: n.ad,
        parcalar: parcalar,
        w: cevir ? d : w,
        d: cevir ? w : d,
        h: k0.mx[2] - z0,
        anahtar: parcalar.map(function (pc) { return pc.no; }).join("+")
      });
    });

    // 3) Tablalar
    /** Nesneleri raf raf dizer; sığmayan sonraki tablaya geçer. kule: temizleme kulesine yer bırak */
    function diz(liste, kule) {
      var W = tabla[0] - 2 * TABLA_PAYI;
      var D = tabla[1] - 2 * TABLA_PAYI - (kule ? 45 : 0);
      var sirali = liste.slice().sort(function (a, b) { return nesneler[b].d - nesneler[a].d; });
      var cikti = [], simdi = null, x = 0, y = 0, raf = 0;
      function yeniTabla() {
        simdi = { ogeler: [] };
        cikti.push(simdi);
        x = 0; y = 0; raf = 0;
      }
      sirali.forEach(function (ni) {
        var n = nesneler[ni];
        if (!simdi) yeniTabla();
        if (x > 0 && x + n.w > W) { x = 0; y += raf + TABLA_PAYI; raf = 0; }
        if (y > 0 && y + n.d > D) { yeniTabla(); }
        var buyuk = n.w > W || n.d > D;
        simdi.ogeler.push({
          nesne: ni,
          x: buyuk ? tabla[0] / 2 : TABLA_PAYI + x + n.w / 2,
          y: buyuk ? tabla[1] / 2 : TABLA_PAYI + y + n.d / 2,
          tasiyor: n.w > tabla[0] || n.d > tabla[1]
        });
        x += n.w + TABLA_PAYI;
        raf = Math.max(raf, n.d);
      });
      return cikti;
    }
    function renkNolari(t) {
      var g = new Set();
      t.ogeler.forEach(function (o) { nesneler[o.nesne].parcalar.forEach(function (pc) { g.add(pc.no); }); });
      return Array.from(g).sort(function (a, b) { return a - b; });
    }

    /** Katman katman baskıda tahmini filament değişimi: her 0,2 mm'de o yükseklikteki renk sayısı − 1 */
    function katmanDegisimi(nesneNolari) {
      var araliklar = [], tepe = 0;
      nesneNolari.forEach(function (ni) {
        nesneler[ni].parcalar.forEach(function (pc) {
          araliklar.push(pc);
          if (pc.z1 > tepe) tepe = pc.z1;
        });
      });
      var degisim = 0;
      for (var z = 0.1; z < tepe; z += 0.2) {
        var var_ = new Set();
        for (var i = 0; i < araliklar.length; i++) if (araliklar[i].z0 <= z && z < araliklar[i].z1) var_.add(araliklar[i].no);
        if (var_.size > 1) degisim += var_.size - 1;
      }
      return degisim;
    }

    /**
     * Nesne nesne baskı dizilimi: her nesne baştan sona basılır, filament
     * yalnız nesneler arasında değişir. Dilimleyicinin çarpışma kuralları:
     *   · nesneler arası boşluk ≥ kafa yarıçapı (extruder_clearance_radius)
     *   · köprü çubuğundan (height_to_rod) yüksek nesne, Y'de başka hiçbir
     *     nesneyle aynı hizada olamaz: kendi sırasında tek başına durur
     *   · kapaktan (height_to_lid) yüksek nesne basılamaz
     * Hepsi tek tablaya sığmazsa null.
     */
    function dizNesne(liste) {
      var ay = (PROFIL && PROFIL.ayar) || {};
      var G = (parseFloat(ay.extruder_clearance_radius) || 60) + 3;
      var cubuk = (parseFloat(ay.extruder_clearance_height_to_rod) || 40) - 2;
      var kapak = (parseFloat(ay.extruder_clearance_height_to_lid) || 240) - 5;
      var W = tabla[0] - 2 * TABLA_PAYI, D = tabla[1] - 2 * TABLA_PAYI;
      var sira = function (a, b) {
        return nesneler[a].anahtar < nesneler[b].anahtar ? -1 : nesneler[a].anahtar > nesneler[b].anahtar ? 1 : nesneler[b].d - nesneler[a].d;
      };
      var kisa = liste.filter(function (ni) { return nesneler[ni].h <= cubuk; }).sort(sira);
      var uzun = liste.filter(function (ni) { return nesneler[ni].h > cubuk; }).sort(sira);
      var ogeler = [], x = 0, y = 0, raf = 0, sigmadi = false;
      function koy(ni) {
        var n = nesneler[ni];
        if (n.h > kapak || n.w > W || n.d > D || y + n.d > D) { sigmadi = true; return; }
        ogeler.push({ nesne: ni, x: TABLA_PAYI + x + n.w / 2, y: TABLA_PAYI + y + n.d / 2, tasiyor: false });
        x += n.w + G;
        raf = Math.max(raf, n.d);
      }
      kisa.forEach(function (ni) {
        if (x > 0 && x + nesneler[ni].w > W) { x = 0; y += raf + G; raf = 0; }
        koy(ni);
      });
      uzun.forEach(function (ni) {
        if (ogeler.length) { x = 0; y += raf + G; raf = 0; }
        koy(ni);
      });
      if (sigmadi) return null;
      // Değişim: her nesnenin kendi içindeki + nesneler arası renk geçişleri
      var degisim = 0, onceki = null;
      kisa.concat(uzun).forEach(function (ni) {
        degisim += katmanDegisimi([ni]);
        if (onceki !== null && nesneler[ni].anahtar !== onceki) degisim += 1;
        onceki = nesneler[ni].anahtar;
      });
      return { ogeler: ogeler, nesneNesne: true, degisim: degisim };
    }

    var tablalar = [];
    var hepsi = [];
    nesneler.forEach(function (n, ni) { for (var k = 0; k < adet; k++) hepsi.push(ni); });

    // Tek tabla adayları: katman katman (sıkı dizilim) ve nesne nesne (aralıklı)
    var tekKatman = null, tekNesne = null;
    if (duzen !== "ayri") {
      var k1 = diz(hepsi, renkler.length > 1);
      if (k1.length === 1 && !k1[0].ogeler.some(function (o) { return o.tasiyor; })) {
        tekKatman = k1[0];
        tekKatman.degisim = katmanDegisimi(hepsi);
        // Nesne nesne baskı yalnız belirgin kazanç varsa (aralıklı dizilim yer yer)
        var k2 = hepsi.length > 1 && tekKatman.degisim > 30 ? dizNesne(hepsi) : null;
        if (k2 && k2.degisim + 30 <= tekKatman.degisim) tekNesne = k2;
      }
    }
    // "oto": tek tabla, filament değişimi makul kalıyorsa; yoksa renge göre ayrı
    // "tek": sığıyorsa her durumda tek tabla · "ayri": her durumda renge göre
    var EN_COK_DEGISIM = 40;
    if (tekNesne) tablalar = [tekNesne];
    else if (tekKatman && (duzen === "tek" || tekKatman.degisim <= EN_COK_DEGISIM)) tablalar = [tekKatman];
    else {
      // Renk takımına göre öbekle: tek renkli tablada filament hiç değişmez
      var obekler = new Map();
      hepsi.forEach(function (ni) {
        var l = obekler.get(nesneler[ni].anahtar);
        if (!l) obekler.set(nesneler[ni].anahtar, (l = []));
        l.push(ni);
      });
      // Tek renkli öbek (ayak), o rengi zaten kullanan çok renkli öbeğin (çerçeve +
      // yazısı) tablasına sığıyor ve filament değişimini pek artırmıyorsa oraya
      // katılır: bir tabla, bir baskı işi eksilir
      var degisimSay = function (liste) {
        return diz(liste, true).reduce(function (t, tb) { return t + katmanDegisimi(tb.ogeler.map(function (o) { return o.nesne; })); }, 0);
      };
      if (duzen !== "ayri") {
        Array.from(obekler.keys()).filter(function (a) { return a.indexOf("+") < 0; }).forEach(function (tek) {
          var en = null;
          obekler.forEach(function (liste, cok) {
            if (cok === tek || cok.split("+").indexOf(tek) < 0) return;
            var once = diz(liste, true), birlesik = liste.concat(obekler.get(tek)), sonra = diz(birlesik, true);
            if (sonra.length > once.length || sonra.some(function (tb) { return tb.ogeler.some(function (o) { return o.tasiyor; }); })) return;
            var artis = degisimSay(birlesik) - degisimSay(liste);
            if (artis <= 6 && (!en || artis < en.artis)) en = { cok: cok, birlesik: birlesik, artis: artis };
          });
          if (en) {
            obekler.set(en.cok, en.birlesik);
            obekler.delete(tek);
          }
        });
      }
      Array.from(obekler.keys())
        .sort(function (a, b) { return a.split("+").length - b.split("+").length || parseInt(a, 10) - parseInt(b, 10); })
        .forEach(function (anahtar) {
          diz(obekler.get(anahtar), anahtar.indexOf("+") >= 0).forEach(function (t) {
            t.degisim = katmanDegisimi(t.ogeler.map(function (o) { return o.nesne; }));
            tablalar.push(t);
          });
        });
    }
    tablalar.forEach(function (t) { t.renkNo = renkNolari(t); });
    // Tek tablaya sığdığı hâlde ayrılanlar için: tek tablada kaç değişim olurdu
    var tekTablaDegisimi = tekKatman && tablalar.length > 1 ? tekKatman.degisim : null;
    return { nesneler: nesneler, renkler: renkler, tablalar: tablalar, eslesmeyen: eslesmeyen, tabla: tabla, adet: adet, kaynaklar: kaynaklar, tekTablaDegisimi: tekTablaDegisimi };
  }

  function agXml(u) {
    var harita = new Map(), kose = [], ucgen = [];
    for (var t = 0; t < u.length; t += 9) {
      var ix = [];
      for (var j = 0; j < 3; j++) {
        var x = u[t + j * 3], y = u[t + j * 3 + 1], z = u[t + j * 3 + 2];
        var key = Math.round(x * 1e4) + "," + Math.round(y * 1e4) + "," + Math.round(z * 1e4);
        var n = harita.get(key);
        if (n === undefined) {
          n = kose.length;
          harita.set(key, n);
          kose.push('<vertex x="' + sayi(x) + '" y="' + sayi(y) + '" z="' + sayi(z) + '"/>');
        }
        ix.push(n);
      }
      if (ix[0] === ix[1] || ix[1] === ix[2] || ix[0] === ix[2]) continue;
      ucgen.push('<triangle v1="' + ix[0] + '" v2="' + ix[1] + '" v3="' + ix[2] + '"/>');
    }
    return "   <mesh>\n    <vertices>\n" + kose.join("\n") + "\n    </vertices>\n    <triangles>\n" + ucgen.join("\n") + "\n    </triangles>\n   </mesh>\n";
  }


  /** Planı çok tablalı dilimleyici projesine yazar */
  function uretim3mf(plan, nesneAdi) {
    var model = [
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<model unit="millimeter" xml:lang="tr-TR" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021">\n' +
        ' <metadata name="Application">BambuStudio-2.0.0.0</metadata>\n' +
        ' <metadata name="BambuStudio:3mfVersion">1</metadata>\n' +
        ' <metadata name="Title">' + xmlKacis(nesneAdi) + '</metadata>\n' +
        ' <metadata name="Designer">ADJY</metadata>\n <resources>\n  <basematerials id="10000">\n'
    ];
    plan.renkler.forEach(function (r) {
      model.push('   <base name="' + xmlKacis(r.ad + " " + r.hex) + '" displaycolor="' + r.hex + 'FF"/>\n');
    });
    model.push("  </basematerials>\n");

    // Ağlar: nesnenin her renk parçası bir kez yazılır, kopyalar aynı ağı paylaşır
    var id = 0;
    plan.nesneler.forEach(function (n) {
      n.parcalar.forEach(function (pc) {
        pc.id = ++id;
        model.push('  <object id="' + pc.id + '" type="model" pid="10000" pindex="' + (pc.no - 1) + '" name="' +
          xmlKacis(pc.no + " " + plan.renkler[pc.no - 1].ad) + '">\n' + agXml(pc.u) + "  </object>\n");
      });
    });

    var cols = Math.ceil(Math.sqrt(plan.tablalar.length));
    var adimX = plan.tabla[0] * 1.2, adimY = plan.tabla[1] * 1.2;
    var ayar = ['<?xml version="1.0" encoding="UTF-8"?>\n<config>\n'];
    var tablaXml = [];
    var yapi = [];
    var sayac = 0;
    plan.tablalar.forEach(function (t, ti) {
      var ox = (ti % cols) * adimX, oy = -Math.floor(ti / cols) * adimY;
      var ornekler = [];
      t.ogeler.forEach(function (o) {
        var n = plan.nesneler[o.nesne];
        var oid = ++id;
        sayac++;
        model.push('  <object id="' + oid + '" type="model" name="' + xmlKacis(n.ad) + '">\n   <components>\n');
        n.parcalar.forEach(function (pc) {
          model.push('    <component objectid="' + pc.id + '" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>\n');
        });
        model.push("   </components>\n  </object>\n");
        yapi.push('  <item objectid="' + oid + '" transform="1 0 0 0 1 0 0 0 1 ' + sayi(ox + o.x) + " " + sayi(oy + o.y) + ' 0" printable="1"/>\n');
        ayar.push('  <object id="' + oid + '">\n    <metadata key="name" value="' + xmlKacis(n.ad) + '"/>\n' +
          '    <metadata key="extruder" value="' + n.parcalar[0].no + '"/>\n');
        var na = nesneAyari(n, t.renkNo.length < 2, !!plan.hizli);
        o.sinif = na.sinif;
        Object.keys(na.ayar).forEach(function (k) {
          ayar.push('    <metadata key="' + k + '" value="' + xmlKacis(na.ayar[k]) + '"/>\n');
        });
        n.parcalar.forEach(function (pc) {
          ayar.push('    <part id="' + pc.id + '" subtype="normal_part">\n' +
            '      <metadata key="name" value="' + xmlKacis(pc.no + " " + plan.renkler[pc.no - 1].ad + " " + pc.hex) + '"/>\n' +
            '      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n' +
            '      <metadata key="extruder" value="' + pc.no + '"/>\n    </part>\n');
        });
        ayar.push("  </object>\n");
        ornekler.push('    <model_instance>\n      <metadata key="object_id" value="' + oid + '"/>\n' +
          '      <metadata key="instance_id" value="0"/>\n      <metadata key="identify_id" value="' + (1000 + sayac) + '"/>\n    </model_instance>\n');
      });
      tablaXml.push('  <plate>\n    <metadata key="plater_id" value="' + (ti + 1) + '"/>\n' +
        '    <metadata key="plater_name" value=""/>\n' +
        '    <metadata key="locked" value="false"/>\n' +
        // Nesne nesne baskı: her parça baştan sona, filament yalnız parçalar arasında değişir
        (t.nesneNesne ? '    <metadata key="print_sequence" value="by object"/>\n' : "") +
        ornekler.join("") + "  </plate>\n");
    });
    model.push(" </resources>\n <build>\n" + yapi.join("") + " </build>\n</model>\n");
    ayar.push(tablaXml.join("") + "</config>\n");

    var dosyalar = [
      {
        ad: "[Content_Types].xml",
        veri:
          '<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'
      },
      {
        ad: "_rels/.rels",
        veri:
          '<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'
      },
      { ad: "3D/3dmodel.model", veri: model.join("") },
      { ad: "Metadata/model_settings.config", veri: ayar.join("") }
    ];
    var proje = projeAyari(plan.renkler);
    if (proje) dosyalar.push({ ad: "Metadata/project_settings.config", veri: proje });
    return zip(dosyalar);
  }

  /** Planın okunur özeti (yönetim ekranı ve tabla listesi dosyası) */
  function planOzeti(plan) {
    return plan.tablalar.map(function (t, ti) {
      var say = new Map();
      t.ogeler.forEach(function (o) {
        var ad = plan.nesneler[o.nesne].ad;
        say.set(ad, (say.get(ad) || 0) + 1);
      });
      return {
        no: ti + 1,
        renkler: t.renkNo.map(function (no) { return plan.renkler[no - 1]; }),
        parcalar: Array.from(say.entries()).map(function (e) { return { ad: e[0], adet: e[1] }; }),
        tasiyor: t.ogeler.some(function (o) { return o.tasiyor; }),
        degisim: t.degisim || 0,
        nesneNesne: !!t.nesneNesne
      };
    });
  }

  /**
   * Aracın parça STL'lerinden üretim projesi.
   * @param kaynak [{ ad, blob, nesne? }]
   * @param secenek { adet, duzen: "oto" | "tek" | "ayri" }
   * @returns Promise<{ dosyalar: [{ ad, blob }], ozet, renkler, eslesmeyen }>
   */
  function uretimPaketi(kaynak, secenek) {
    var adet = Math.max(1, Math.min(60, Math.round((secenek && secenek.adet) || 1)));
    return profilSozu
      .then(function () {
        return Promise.all((kaynak || []).map(function (k) {
          return k.blob.arrayBuffer().then(function (b) { return { ad: k.ad, nesne: k.nesne || null, tekRenk: !!k.tekRenk, u: stlOku(b) }; });
        }));
      })
      .then(function (dosyalar) {
        dosyalar = dosyalar.filter(function (d) { return d.u.length >= 9; });
        if (!dosyalar.length) throw new Error("Araç basılacak parça üretmedi");
        var duzen = secenek && (secenek.duzen === "ayri" || secenek.duzen === "tek") ? secenek.duzen : "oto";
        var plan = uretimPlani(dosyalar, adet, duzen);
        plan.hizli = !!(secenek && secenek.katman === "hizli");
        var a = adlar();
        var ozet = planOzeti(plan);
        var satirlar = [
          "ÜRETİM PROJESİ — " + a.nesneAdi + " × " + adet + " adet",
          "Parçalar baskı yönünde ve tablaya yatık. Hepsi tek tablaya sığıyorsa tek tablada:",
          "farklı renkte parçalar aralıklı dizilip NESNE NESNE basılır (filament yalnız parçalar",
          "arasında değişir). Sığmıyorsa tek renkli parçalar rengine göre ayrı tablada dizilir:",
          "o tablada filament hiç değişmez.",
          "",
          "Filament yuvaları:"
        ];
        plan.renkler.forEach(function (r) { satirlar.push("  Filament " + r.no + " → " + r.ad + " (" + r.hex + ")"); });
        satirlar.push("", "Tablalar:");
        ozet.forEach(function (t) {
          satirlar.push("  Tabla " + t.no + " — " + t.renkler.map(function (r) { return r.ad; }).join(" + ") + ": " +
            t.parcalar.map(function (pc) { return pc.adet + " × " + pc.ad; }).join(", ") +
            (t.degisim ? "  [≈ " + t.degisim + " filament değişimi" + (t.nesneNesne ? ", nesne nesne baskı: parçaların yerini değiştirmeyin" : "") + "]" : "  [filament değişmez]") +
            (t.tasiyor ? "  (!) tablaya sığmıyor: elle bölün ya da büyük makinede basın" : ""));
        });
        if (plan.eslesmeyen) satirlar.push("", "(!) " + plan.eslesmeyen + " parçanın rengi sahneden okunamadı; en çok kullanılan renge atandı. Dilimleyicide kontrol edin.");
        satirlar.push(
          "",
          "Dilimleyicide Dosya → Projeyi aç ile açın" + (PROFIL ? " (" + PROFIL.ad + ", " + PROFIL.islem + ")." : "."),
          "Dilimleme ayarları dosyada kayıtlı: yazıcı ve filament profili, parça başına katman,",
          "çevre, dolgu ve üst/alt kat sayısı; destek kapalı. Ayar girmeden Dilimle → Yazdır.",
          "Her tablayı ayrı dilimleyip basın; makaraları yukarıdaki sıraya takın."
        );
        var on = a.on + "_uretim_" + adet + "adet";
        // Dilimleyici bir projede en çok 36 tabla açar: fazlası ayrı projeye
        var EN_COK = 30;
        var projeler = [];
        for (var b = 0; b < plan.tablalar.length; b += EN_COK) {
          var dilim = Object.assign({}, plan, { tablalar: plan.tablalar.slice(b, b + EN_COK) });
          var ek = plan.tablalar.length > EN_COK ? "_" + (b / EN_COK + 1) : "";
          projeler.push({ ad: on + ek + ".3mf", blob: uretim3mf(dilim, a.nesneAdi + " × " + adet) });
        }
        return {
          dosyalar: projeler.concat([
            { ad: on + "_tablalar.txt", blob: new Blob(["\ufeff" + satirlar.join("\r\n") + "\r\n"], { type: "text/plain;charset=utf-8" }) }
          ]),
          ozet: ozet,
          renkler: plan.renkler,
          eslesmeyen: plan.eslesmeyen,
          tekTablaDegisimi: plan.tekTablaDegisimi,
          kaynaklar: plan.kaynaklar,
          nesneler: plan.nesneler.map(function (n) {
            return { ad: n.ad, w: n.w, d: n.d, h: n.h, renkNo: n.parcalar.map(function (pc) { return pc.no; }) };
          })
        };
      });
  }

  function dugme(id, is) {
    if (document.getElementById(id)) return;
    var d = document.createElement("button");
    d.type = "button";
    d.id = id;
    d.hidden = true;
    d.addEventListener("click", function () {
      // Profil şablonu inmeden basılırsa beklenir (proje ayarı dosyaya girsin)
      profilSozu.then(function () {
        try {
          is();
        } catch (e) {
          console.error("[renkli paket]", e);
        }
      });
    });
    document.body.appendChild(d);
  }
  function kur() {
    dugme("adjy-renkli-paket", paketiIndir);
    dugme("adjy-renkli-3mf", ucMfIndir);
    // Yönetim paneli aracın köprüsü (window.ADJY) üzerinden çağırır
    if (window.ADJY) {
      window.ADJY.uretimProjesi = uretimPaketi;
      window.ADJY.renkListesi = renkListesi;
    }
  }
  if (document.body) kur();
  else document.addEventListener("DOMContentLoaded", kur);

  window.ADJY_RENKLI = {
    gruplar: renkGruplari,
    renkler: renkListesi,
    indir: paketiIndir,
    ucMf: ucMfIndir,
    paket3mf: paket3mf,
    uretim: uretimPaketi,
    profil: function () { return profilSozu; }
  };
})();
