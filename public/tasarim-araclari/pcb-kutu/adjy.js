/* PCB elektronik kutusu — mağaza köprüsü ayarı */
window.ADJY_ARAC = {
  id: "pcb-kutu",

  // Geniş ekranda model ortada, ayarlar iki yanda (bkz. kopru.css)
  yerlesim: { kap: ".studio-grid", panel: ".left-panel", sahne: ".viewport-stage" },

  // Ayarlar numaralı adımlara ayrılır. yer: adımın modelin neresinde duracağı
  // (sol | sag | alt). sec: o adıma taşınan öğeler. ad: rehber çubuğundaki kısa ad.
  adimlar: [
    {"ad":"Kart","baslik":"Kartınızın ölçüsü","ipucu":"Kartın enini, boyunu ve üstündeki en yüksek parçayı girin.","yer":"sol","sec":[".param-control:has(#rng-pcb-en)",".param-control:has(#rng-pcb-boy)",".param-control:has(#rng-ic-yukseklik)"]},
    {"ad":"Gövde","baslik":"Gövde ve vidalar","ipucu":"Duvar kalınlığı ve kartı tutan vida yuvaları.","yer":"sol","sec":[".param-control:has(#rng-duvar)",".param-control:has(#insert-type-group)",".param-control:has(#rng-kenar-mesafe)"]},
    {"ad":"Hava ve USB","baslik":"Havalandırma ve USB","ipucu":"Izgarayı ve USB kesitini açıp kapatın.","yer":"sag","sec":[".left-panel label.toggle-row","#usb-config-box"]},
    {"ad":"Kesitler","baslik":"Yan kesitler","ipucu":"Güç, anten ya da düğme için duvarlara delik ekleyin.","yer":"sag","sec":[".left-panel .io-builder"]},
    {"ad":"Malzeme","baslik":"Malzemeyi seçin","ipucu":"Kutunun basılacağı malzeme.","yer":"alt","sec":[".material-row"]},
  ],

  // Düğmelerdeki değişken adları — iki kipte de okunur adla gösterilir
  ceviri: {
      "Pirinc_Insert_Tipi": "Vida yuvası",
      "TÜRKÇE CAD PARAMETRELERİ": "Kart ve kutu ölçüsü",
      "DFM PANJUR & G/Ç KESİTLERİ": "Havalandırma ve kesitler",
      "ŞABLON": "Hazır model",
  },

  tema: { oznitelik: "data-theme", acik: "paper", koyu: "dark", ilk: "dark", dugme: "#btn-theme-toggle" },

  // Malzeme seçimi üretici panelinde duruyor ama müşterinin seçimi
  musteriAlanlari: ["sel-material"],

  gizle: [
    "#dfm-status-pill",
    "#sku-pill",
    "#btn-theme-toggle",
    "#btn-reset-wall",
    "#dfm-warnings-box",
    ".viewport-telemetry",
    "#btn-inspect-insert",
    '[data-mode="blueprint"]',
    '[data-mode="xray"]',
    '[data-mode="wireframe"]',
    ".right-panel",
    "#blueprint-modal",
    '#sel-material option[value="AL6061"]',
    // Sadeleştirme: kamera, kesit ve gösterim araçları müşteriye kapalı
    ".cad-toolbar.top-overlay",
    ".cad-rig-bar.bottom-overlay",
    ".section-idx",
    "#insert-bore-badge",
  ],

  // Sade görünümde kapalı duran ayrıntı ayarları. Müşteri "Tüm ayarlar"
  // derse açılır; atölye kipinde hep açıktır ve sipariş metnine her
  // durumda girer.
  gelismis: [
    ".param-control:has(#num-duvar)",
    ".param-control:has(#num-kenar-mesafe)",
    ".io-builder",
  ],

  gruplar: [{ kap: "#insert-type-group", oz: "data-insert", etiket: "Vida yuvası" }],

  durumHaric: ["preset-select", "sel-io-preset"],

  etiketler: {
    "pcb-en": "Kart genişliği",
    "pcb-boy": "Kart derinliği",
    "ic-yukseklik": "İç yükseklik",
    duvar: "Duvar kalınlığı",
    "kenar-mesafe": "Vida deliği kenar mesafesi",
    havalandirma: "Havalandırma ızgarası",
    usb: "USB kesiti",
    "usb-wall": "USB duvarı",
    "usb-offset": "USB kayması",
    material: "Malzeme",
  },
  birimler: {
    "pcb-en": "mm",
    "pcb-boy": "mm",
    "ic-yukseklik": "mm",
    duvar: "mm",
    "kenar-mesafe": "mm",
    "usb-offset": "mm",
  },
  kutularHep: true,

  ozetHaric: ["explode", "section"],

  // Yan G/Ç kesitleri form alanı değil, bir liste
  durumOku: function () {
    return window.__ADJY_PCB ? { portlar: window.__ADJY_PCB.portlar() } : null;
  },
  durumYaz: function (ek) {
    if (window.__ADJY_PCB && ek && Array.isArray(ek.portlar)) window.__ADJY_PCB.portlariYaz(ek.portlar);
  },
  ozetEk: function () {
    if (!window.__ADJY_PCB) return [];
    var duvar = { front: "ön", back: "arka", left: "sol", right: "sağ" };
    return window.__ADJY_PCB.portlar().map(function (p, i) {
      return {
        ad: "Yan kesit " + (i + 1),
        deger:
          p.label + " — " + (duvar[p.wall] || p.wall) + " duvar, kayma " + p.offsetMm + " mm, " +
          p.width + " × " + p.height + " mm",
      };
    });
  },

  olcum: {
    kutleG: {
      oku: function () {
        var toplam = 0;
        ["m-base-vol", "m-lid-vol"].forEach(function (id) {
          var el = document.getElementById(id);
          var m = el && /([\d.]+)\s*g/.exec(el.textContent);
          if (m) toplam += parseFloat(m[1]);
        });
        return toplam > 0 ? toplam : null;
      },
    },
    // Araç süre yazmıyor; kendi maliyet hesabındaki hızı kullanıyor (18 g/saat)
    sureSaat: {
      oku: function () {
        var k = window.ADJY_ARAC.olcum.kutleG.oku();
        return k ? k / 18 : null;
      },
    },
  },

  hazirMi: function () {
    var el = document.getElementById("m-base-vol");
    return !!el && /\d\s*g/.test(el.textContent) && !!window.__ADJY_PCB;
  },

  // Malzeme seçimi maliyet panelinde duruyor; müşteri için sol panele taşınır
  hazir: function (o) {
    if (o.uretim) return;
    var satir = document.querySelector(".material-row");
    var sol = document.querySelector(".left-panel .panel-section");
    if (satir && sol) sol.appendChild(satir);
  },
};

// Renkli baskı paketi (../_adjy/renkli.js): devre kartı tertibatı
// (kart, bileşenler) basılmaz; yalnız kutu ve kapak.
window.ADJY_ARAC = window.ADJY_ARAC || {};
window.ADJY_ARAC.renkliPaket = {
  haric: function (o) {
    for (var n = o; n; n = n.parent) if (n.name === "PCB_Tertibati") return true;
    return false;
  },
};
