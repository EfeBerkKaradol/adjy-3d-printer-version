/* ==========================================================================
   ÖLÇÜ ÇİZGİLERİ

   Modelin dış hatlarını saran kutunun genişlik, derinlik ve yüksekliğini
   sahnenin üstüne teknik çizim gibi çizer. Çizgiler kutunun kameraya
   bakan kenarlarında durur; model değiştikçe ya da kamera döndükçe
   kendiliğinden yeniden yerleşir.

   Sahneye hiçbir şey eklenmez: çizim tuvalin üstündeki bir SVG'de.
   Böylece STL / GLB çıktıları ve ürün kareleri etkilenmez.

   Bağlantı: araçlar three'yi import map'le "three" adıyla alıyor; o ad
   _adjy/three.js'e yönlendirildi. Oradaki WebGLRenderer her kurulduğunda
   ADJY_OLCU.bagla() çağrılır ve render() sarılır. three'yi kendi içinde
   taşıyan araçlar (organizator) genel adlarından bağlanır (aşağıda).

   Araç ayarı (adjy.js, window.ADJY_ARAC.olcuCizgisi):
     false                → kapalı
     { birim: 10 }        → bir sahne birimi kaç mm (varsayılan 1)
     { kok: function (sahne) { return nesne } }  → yalnız bu nesneyi ölç
     { haric: function (nesne) { return true } } → bu nesneleri sayma
   ========================================================================== */
(function () {
  "use strict";

  var AYAR = (window.ADJY_ARAC && window.ADJY_ARAC.olcuCizgisi) || {};
  var sorgu = new URLSearchParams(location.search);
  // Ürün kareleri (?vitrin) ölçüsüz çekilir
  var KAPALI = AYAR === false || (window.ADJY_ARAC && window.ADJY_ARAC.olcuCizgisi === false) || sorgu.has("vitrin");

  var ANAHTAR = "adjy-olcu-gorunur";
  var gorunur = true;
  try {
    gorunur = localStorage.getItem(ANAHTAR) !== "0";
  } catch (e) {}

  var HARIC_AD = /zemin|ground|floor|grid|shadow|golge|gölge|helper|skybox|backdrop/i;

  // Tutamaç, gizmo gibi düzenleme yardımcıları (ör. moduler-dolap
  // isRoomResizeHandle) modelin parçası değil
  var YARDIMCI_ANAHTAR = /handle|gizmo|helper/i;

  var svg = null;
  var dugme = null;
  var kutu = null; // { min:[x,y,z], max:[x,y,z] }
  var sonKutuZamani = 0;
  var bekleyen = null;
  var planli = false;
  // Bazı araçlar her karede birden çok sahne çizer (ön izleme, kaplama
  // katmanı). Ölçülen, içinde model bulunan ilk sahnedir.
  var anaSahne = null;
  var anaKamera = null;
  var hedefSahne = null;
  var hedefKamera = null;
  var T = null;

  function birim() {
    var b = Number(AYAR.birim);
    return Number.isFinite(b) && b > 0 ? b : 1;
  }

  function cmYaz(mm) {
    var cm = mm / 10;
    var basamak = cm < 10 ? 1 : cm < 100 ? 1 : 0;
    return cm.toLocaleString("tr-TR", { maximumFractionDigits: basamak }) + " cm";
  }

  // ---------- Model kutusu ----------

  function gorunurMu(o) {
    for (var n = o; n; n = n.parent) if (n.visible === false) return false;
    return true;
  }

  function sayilir(o) {
    if (!o.isMesh) return false;
    if (!gorunurMu(o)) return false;
    var m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m) return false;
    if (m.isShadowMaterial) return false;
    if (m.transparent && m.opacity < 0.2) return false;
    if (m.colorWrite === false) return false;
    if (o.geometry && o.geometry.type === "PlaneGeometry") return false;
    for (var n = o; n; n = n.parent) {
      if (n.userData && n.userData.adjyOlcuHaric) return false;
      if (n.userData) {
        for (var k in n.userData) if (YARDIMCI_ANAHTAR.test(k) && n.userData[k]) return false;
      }
      if (n.name && HARIC_AD.test(n.name) && n.type !== "Scene") return false;
    }
    if (typeof AYAR.haric === "function" && AYAR.haric(o)) return false;
    return true;
  }

  function kutuHesapla(sahne) {
    var kok = typeof AYAR.kok === "function" ? AYAR.kok(sahne) : sahne;
    if (!kok) return null;
    var b = new T.Box3();
    var gecici = new T.Box3();
    kok.updateMatrixWorld(true);
    kok.traverse(function (o) {
      if (!sayilir(o)) return;
      var g = o.geometry;
      if (!g) return;
      if (!g.boundingBox) g.computeBoundingBox();
      if (!g.boundingBox || g.boundingBox.isEmpty()) return;
      if (o.isInstancedMesh) {
        var mat = new T.Matrix4();
        for (var i = 0; i < o.count; i++) {
          o.getMatrixAt(i, mat);
          gecici.copy(g.boundingBox).applyMatrix4(mat).applyMatrix4(o.matrixWorld);
          b.union(gecici);
        }
      } else {
        gecici.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
        b.union(gecici);
      }
    });
    if (b.isEmpty()) return null;
    return { min: b.min.toArray(), max: b.max.toArray() };
  }

  // ---------- Katman ----------

  function katmanKur(tuval) {
    if (svg && svg.isConnected) return;
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("data-adjy-olcu", "");
    svg.setAttribute("aria-hidden", "true");
    document.body.appendChild(svg);

    dugme = document.createElement("button");
    dugme.type = "button";
    dugme.setAttribute("data-adjy-olcu-dugme", "");
    dugme.addEventListener("click", function () {
      gorunur = !gorunur;
      try {
        localStorage.setItem(ANAHTAR, gorunur ? "1" : "0");
      } catch (e) {}
      dugmeYaz();
      if (sonCizim) ciz.apply(null, sonCizim);
    });
    document.body.appendChild(dugme);
    dugmeYaz();
  }

  function dugmeYaz() {
    if (!dugme) return;
    dugme.setAttribute("aria-pressed", gorunur ? "true" : "false");
    dugme.textContent = gorunur ? "Ölçüleri gizle" : "Ölçüleri göster";
  }

  // ---------- Çizim ----------

  var sonCizim = null;

  function el(ad, ozellik, ebeveyn) {
    var e = document.createElementNS("http://www.w3.org/2000/svg", ad);
    for (var k in ozellik) e.setAttribute(k, ozellik[k]);
    (ebeveyn || svg).appendChild(e);
    return e;
  }

  function ciz(renderer, sahne, kamera) {
    sonCizim = [renderer, sahne, kamera];
    var tuval = renderer.domElement;
    if (!tuval || !tuval.isConnected) return;
    katmanKur(tuval);

    var r = tuval.getBoundingClientRect();
    if (r.width < 80 || r.height < 80) {
      svg.style.display = "none";
      dugme.style.display = "none";
      return;
    }
    svg.style.cssText =
      "overflow:hidden;position:fixed;left:" + r.left + "px;top:" + r.top + "px;width:" + r.width + "px;height:" + r.height + "px;";
    dugme.style.right = Math.max(0, document.documentElement.clientWidth - r.right) + 12 + "px";
    dugme.style.top = r.top + 12 + "px";
    dugme.style.display = "";
    svg.setAttribute("viewBox", "0 0 " + r.width + " " + r.height);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!gorunur) return;

    // Kutu sık hesaplanmaz: sürekli çizen sahnelerde her karede
    // bütün ağacı dolaşmamak için 250 ms'de bir.
    var simdi = performance.now();
    if (!kutu || simdi - sonKutuZamani > 250) {
      try {
        kutu = kutuHesapla(sahne);
      } catch (e) {
        kutu = null;
      }
      sonKutuZamani = simdi;
    }
    if (!kutu) return;

    var W = r.width;
    var H = r.height;
    var v = new T.Vector3();

    function izdus(p) {
      v.set(p[0], p[1], p[2]).project(kamera);
      if (v.z > 1 || v.z < -1) return null;
      return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
    }

    // Yukarı ekseni kameradan: çoğu araç Y, bazı CAD araçları Z
    var up = kamera.up;
    var u = Math.abs(up.z) > Math.abs(up.y) && Math.abs(up.z) > Math.abs(up.x) ? 2 : Math.abs(up.x) > Math.abs(up.y) ? 0 : 1;
    var a = u === 0 ? 1 : 0; // genişlik
    var b = u === 2 ? 1 : u === 1 ? 2 : 2; // derinlik
    if (u === 0) b = 2;

    var mn = kutu.min;
    var mx = kutu.max;
    var olc = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
    var enBuyuk = Math.max(olc[0], olc[1], olc[2]);
    if (!(enBuyuk > 0)) return;
    var mrk = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];

    var kp = new T.Vector3();
    kamera.getWorldPosition(kp);
    var kam = kp.toArray();
    var dik = kamera.isOrthographicCamera;
    if (dik) {
      // Dik izdüşümde konum yerine bakış yönü belirleyici
      var yon = new T.Vector3();
      kamera.getWorldDirection(yon);
      kam = [mrk[0] - yon.x * 1e6, mrk[1] - yon.y * 1e6, mrk[2] - yon.z * 1e6];
    }

    var yakinA = kam[a] >= mrk[a] ? mx[a] : mn[a];
    var yakinB = kam[b] >= mrk[b] ? mx[b] : mn[b];
    var isA = yakinA === mx[a] ? 1 : -1;
    var isB = yakinB === mx[b] ? 1 : -1;
    var pay = enBuyuk * 0.09;
    var tabanU = mn[u];

    function nokta(da, db, du) {
      var p = [0, 0, 0];
      p[a] = da;
      p[b] = db;
      p[u] = du;
      return p;
    }

    var mmBirim = birim();
    var g = el("g", { class: "adjy-olcu" });

    function olcuCizgisi(p1, p2, uzat1, uzat2, deger) {
      var s1 = izdus(p1);
      var s2 = izdus(p2);
      if (!s1 || !s2) return;
      var dx = s2[0] - s1[0];
      var dy = s2[1] - s1[1];
      var boy = Math.hypot(dx, dy);
      if (boy < 36) return false;
      // Yazı tuvalin dışına düşüyorsa çizilmez; çağıran öbür kenarı dener
      var ox = (s1[0] + s2[0]) / 2;
      var oy = (s1[1] + s2[1]) / 2;
      if (ox < 30 || ox > W - 30 || oy < 14 || oy > H - 14) return false;
      // Uzatma çizgileri: kenardan ölçü çizgisine
      var e1 = izdus(uzat1);
      var e2 = izdus(uzat2);
      if (e1) el("line", { x1: e1[0], y1: e1[1], x2: s1[0], y2: s1[1], class: "uzatma" }, g);
      if (e2) el("line", { x1: e2[0], y1: e2[1], x2: s2[0], y2: s2[1], class: "uzatma" }, g);
      el("line", { x1: s1[0], y1: s1[1], x2: s2[0], y2: s2[1], class: "cizgi" }, g);
      // Uçlarda mimari çentik (45°)
      var ux = dx / boy;
      var uy = dy / boy;
      var cx = (ux - uy) * 5;
      var cy = (uy + ux) * 5;
      [s1, s2].forEach(function (s) {
        el("line", { x1: s[0] - cx, y1: s[1] - cy, x2: s[0] + cx, y2: s[1] + cy, class: "centik" }, g);
      });
      var yazi = cmYaz(deger * mmBirim);
      var mx_ = (s1[0] + s2[0]) / 2;
      var my_ = (s1[1] + s2[1]) / 2;
      var gen = yazi.length * 6.6 + 14;
      var etiket = el("g", { class: "etiket", transform: "translate(" + mx_ + "," + my_ + ")" }, g);
      el("rect", { x: -gen / 2, y: -10, width: gen, height: 20, rx: 10 }, etiket);
      var t = el("text", { x: 0, y: 4, "text-anchor": "middle" }, etiket);
      t.textContent = yazi;
      return true;
    }

    // Genişlik ve derinlik: kameraya bakan alt kenarlar boyunca, dışarı
    // kaydırılmış. Alt kenar tuvalin dışında kalıyorsa (model kadrajın
    // altına taşmışsa) aynı ölçü üst kenara yazılır.
    var bCizgi = yakinB + isB * pay;
    var aCizgi = yakinA + isA * pay;
    [tabanU, mx[u]].some(function (du) {
      return olcuCizgisi(
        nokta(mn[a], bCizgi, du),
        nokta(mx[a], bCizgi, du),
        nokta(mn[a], yakinB, du),
        nokta(mx[a], yakinB, du),
        olc[a]
      );
    });
    [tabanU, mx[u]].some(function (du) {
      return olcuCizgisi(
        nokta(aCizgi, mn[b], du),
        nokta(aCizgi, mx[b], du),
        nokta(yakinA, mn[b], du),
        nokta(yakinA, mx[b], du),
        olc[b]
      );
    });

    // Yükseklik: ekranda en sağdaki dikey kenar; olmazsa en soldaki
    var koseler = [
      [mn[a], mn[b]],
      [mn[a], mx[b]],
      [mx[a], mn[b]],
      [mx[a], mx[b]],
    ]
      .map(function (k) {
        var s = izdus(nokta(k[0], k[1], tabanU));
        return { k: k, x: s ? s[0] : null };
      })
      .filter(function (o) {
        return o.x !== null;
      })
      .sort(function (p, q) {
        return q.x - p.x;
      });
    var adaylar = koseler.length ? [koseler[0].k, koseler[koseler.length - 1].k] : [];
    adaylar.some(function (k) {
      // Köşeden merkezden uzağa, yatayda kaydır
      var ka = k[0] + (k[0] >= mrk[a] ? 1 : -1) * pay * 0.7;
      var kb = k[1] + (k[1] >= mrk[b] ? 1 : -1) * pay * 0.7;
      return olcuCizgisi(
        nokta(ka, kb, mn[u]),
        nokta(ka, kb, mx[u]),
        nokta(k[0], k[1], mn[u]),
        nokta(k[0], k[1], mx[u]),
        olc[u]
      );
    });
  }

  // ---------- Bağlama ----------

  function bagla(renderer, three) {
    if (KAPALI || !renderer || renderer.__adjyOlcu) return;
    renderer.__adjyOlcu = true;
    T = T || three;
    var asil = renderer.render;
    renderer.render = function (sahne, kamera) {
      var ekrana = !renderer.getRenderTarget();
      var sonuc = asil.apply(this, arguments);
      try {
        if (!sahne || !kamera) return sonuc;
        // Son işlem (EffectComposer) kullanan araçlar sahneyi önce bir
        // dokuya, sonra ekrana tam ekran bir dörtgen çizer: o durumda
        // sahne ve kamera dokuya yapılan son çizimden alınır. Ortam
        // haritası (RoomEnvironment) gibi yalnız dokuya çizilen
        // sahneler kendi başına seçilmez.
        if (!ekrana) {
          if (sahne.isScene) {
            hedefSahne = sahne;
            hedefKamera = kamera;
          }
          return sonuc;
        }
        var s = sahne.isScene ? sahne : hedefSahne;
        var k = sahne.isScene ? kamera : hedefKamera;
        // Model sahnesi bir kez seçilir: köşedeki yön küpü gibi ikinci
        // bir sahne aynı tuvale çizilse de ölçü ona atlamaz.
        if (s && !anaSahne && kutuHesapla(s)) anaSahne = s;
        if (s && s === anaSahne) anaKamera = k;
        if (anaSahne && anaKamera && renderer.domElement && renderer.domElement.isConnected) {
          bekleyen = [renderer, anaSahne, anaKamera];
          if (!planli) {
            planli = true;
            (window.queueMicrotask || setTimeout)(function () {
              planli = false;
              ciz(bekleyen[0], bekleyen[1], bekleyen[2]);
            });
          }
        }
      } catch (e) {}
      return sonuc;
    };
  }

  window.ADJY_OLCU = {
    bagla: bagla,
    /** Tanı için: son çizilen sahne, kamera ve three */
    durum: function () {
      return { sahne: sonCizim && sonCizim[1], kamera: sonCizim && sonCizim[2], T: T, kutu: kutu };
    },
    /** Tanı: sahnenin üst düzey nesneleri ve ölçülen kutu */
    tani: function () {
      if (!sonCizim) return "henüz çizim yok";
      var sahne = sonCizim[1];
      var liste = sahne.children.map(function (c) {
        var bb = new T.Box3().setFromObject(c);
        var s = bb.isEmpty() ? null : bb.getSize(new T.Vector3()).toArray().map(function (x) {
          return Math.round(x * 100) / 100;
        });
        return c.type + ":" + (c.name || "-") + " " + JSON.stringify(s) + (c.visible ? "" : " (gizli)");
      });
      return { kutu: kutu, kameraUp: sonCizim[2].up.toArray(), nesneler: liste };
    },
  };

  // three'yi kendi içinde taşıyan araçlar: genel adlardan bağlan
  function geneldenBagla() {
    try {
      /* global renderer, THREE */
      if (typeof renderer !== "undefined" && typeof THREE !== "undefined" && renderer && renderer.render) {
        bagla(renderer, THREE);
      }
    } catch (e) {}
  }
  if (document.readyState === "complete") geneldenBagla();
  else window.addEventListener("load", geneldenBagla);

  // Pencere boyutu değişince tuvalin yeri değişir
  window.addEventListener("resize", function () {
    if (sonCizim) ciz.apply(null, sonCizim);
  });
})();
