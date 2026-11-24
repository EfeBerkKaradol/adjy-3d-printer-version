/* ==========================================================================
   RENKLİ BASKI PAKETİ (yalnız atölye kipi)

   Müşterinin sitede kurduğu model (ölçüler, biçim, renkler) atölyede
   aynen yüklenir; bu paket o modeli ekrandaki hâliyle, RENGE GÖRE
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

  // ---------- Geometri ----------
  /** Renk → dünya koordinatlarında üçgen dizisi (mm, Z yukarı) */
  function renkGruplari() {
    var m = window.ADJY_OLCU && window.ADJY_OLCU.model();
    if (!m || !m.aglar.length) throw new Error("Model sahnesi bulunamadı");
    var T = m.T;
    var up = m.kamera ? m.kamera.up : new T.Vector3(0, 1, 0);
    var zYukari = Math.abs(up.z) > Math.abs(up.y);
    var olcek = m.birim;
    var gruplar = new Map();
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
          if (!gruplar.has(hex)) gruplar.set(hex, []);
          var hedef = gruplar.get(hex);
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

    // Büyükten küçüğe (en çok üçgenli renk gövdedir)
    return Array.from(gruplar.entries())
      .filter(function (e) { return e[1].length >= 9; })
      .sort(function (a, b) { return b[1].length - a[1].length; })
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
    a.different_settings_to_system = [""].concat(renkler.map(function () { return ""; }), [""]);
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
    indir(paket3mf(gruplar, a.nesneAdi), on + "_renkli.3mf");
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
      on + "_renkli.3mf: dilimleyici projesi" + (PROFIL ? " (" + PROFIL.ad + ", " + PROFIL.islem + ", " + PROFIL.filament + ")." : "."),
      "Anycubic Slicer Next, OrcaSlicer ya da Bambu Studio'da Dosya → Projeyi aç ile açın:",
      "  · tek nesne gelir, her renk ayrı parça ve kendi filament yuvasına atanmıştır,",
      "  · filament renkleri yukarıdaki listeyle aynı sırada ayarlıdır,",
      "  · makinedeki makaraları aynı sıraya takın (ya da yuvaları eşleyin), dilimleyip basın.",
      "Başka yazıcıda: projeyi açtıktan sonra yazıcıyı ve filamenti değiştirin; parça atamaları kalır.",
      "Parçalar atanmış gelmezse (eski sürüm): parça adları filament numarasıyla başlar; elle atayın.",
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
  }
  if (document.body) kur();
  else document.addEventListener("DOMContentLoaded", kur);

  window.ADJY_RENKLI = {
    gruplar: renkGruplari,
    renkler: renkListesi,
    indir: paketiIndir,
    ucMf: ucMfIndir,
    paket3mf: paket3mf,
    profil: function () { return profilSozu; }
  };
})();
