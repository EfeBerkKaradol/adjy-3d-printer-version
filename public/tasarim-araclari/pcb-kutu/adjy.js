/* PCB elektronik kutusu — mağaza köprüsü ayarı */
window.ADJY_ARAC = {
  id: "pcb-kutu",

  // Düğmelerdeki değişken adları — iki kipte de okunur adla gösterilir
  ceviri: {
      "Pirinc_Insert_Tipi": "Vida yuvası"
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
