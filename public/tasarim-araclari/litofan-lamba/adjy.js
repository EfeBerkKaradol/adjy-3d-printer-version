/* Fotoğraflı litofan lamba — mağaza köprüsü ayarı */
window.ADJY_ARAC = {
  id: "litofan-lamba",

  // Düğmelerdeki değişken adları — iki kipte de okunur adla gösterilir
  ceviri: {
      "Form_Tipi": "Form",
      "Cylinder": "Silindir",
      "Curved_Panel": "Kavisli panel",
      "Hexagon": "Altıgen",
      "Ic_Isik_Test_Slider": "Işık önizlemesi",
      "Fotograf_Yukle": "Fotoğrafınız",
      "01 · PARAMETRİK KONTROLLER": "Lambanızı kurun",
  },

  gizle: [
    ".topbar",
    "#build-ms-tag",
    "#active-photo-stats",
    ".param-field:has(#Min_Cidar_mm)",
    ".param-field:has(#Maks_Cidar_mm)",
    ".param-field:has(#Cerceve_Kalinlik_mm)",
    ".param-field:has(#Taban_Gecme_Toleransi_mm)",
    ".dual-mini-grid > div:has(#sel-mesh-quality)",
    ".vp-hud-bottom .hud-chip:nth-child(2)",
    ".vp-hud-bottom .hud-chip:nth-child(3)",
    '.vp-btn[data-view="joint"]',
    ".sheet-bom-pane",
    "#antet-modal",
    "#render-modal",
    '#sel-render-mode option[value="cad_edges"]',
    '#sel-render-mode option[value="xray"]',
    '#sel-render-mode option[value="wireframe"]',
    "label:has(#chk-section-cut)",
    "#rng-section-offset",
    // Sadeleştirme: kamera, kesit ve gösterim araçları müşteriye kapalı
    ".vp-toolbar",
    ".vp-subbar",
    ".kelvin-pills",
    ".param-sub",
  ],

  // Sade görünümde kapalı duran ayrıntı ayarları. Müşteri "Tüm ayarlar"
  // derse açılır; atölye kipinde hep açıktır ve sipariş metnine her
  // durumda girer.
  gelismis: [
    ".micro-toggles",
    ".sub-ctrl-row:has(#sel-wrap-mode)",
  ],

  gruplar: [{ kap: ".segmented-form", oz: "data-form", etiket: "Form" }],

  // Müşterinin fotoğrafı: sipariş kaydına girer, atölyede geri yüklenir
  dosyaGirisi: "Fotograf_Yukle",
  // Fotoğraf yüklendiyse örnek seçici yazılmaz; yazılırsa araç örneği
  // yeniden yükleyip müşterinin fotoğrafının üstüne koyar.
  dosyaVarkenAtla: ["preset-specimen-select"],

  etiketler: {
    Fotograf_Yukle: "Fotoğraf",
    Capi_veya_En_mm: "Çap / genişlik",
    Yukseklik_mm: "Yükseklik",
    "wrap-mode": "Fotoğraf yerleşimi",
    "invert-image": "Negatif görüntü",
    "image-contrast": "Kontrast",
    "smooth-pass": "Keskinlik",
    material: "Malzeme",
  },
  birimler: { Capi_veya_En_mm: "mm", Yukseklik_mm: "mm" },

  ozetHaric: [
    "preset-specimen-select",
    "Ic_Isik_Test_Slider",
    "render-mode",
    "studio-lighting",
    "assembly-mode",
    "show-grid",
    "section-cut",
    "section-offset",
  ],

  olcum: {
    kutleG: { sec: "#hud-filament-time", desen: "([\\d.]+)\\s*g" },
    // "5 sa 12 dk" ya da "38 dk"
    sureSaat: {
      oku: function () {
        var el = document.getElementById("hud-filament-time");
        if (!el) return null;
        var t = el.textContent;
        var sa = /(\d+)\s*sa/.exec(t);
        var dk = /(\d+)\s*dk/.exec(t);
        if (!sa && !dk) return null;
        return (sa ? parseInt(sa[1], 10) : 0) + (dk ? parseInt(dk[1], 10) : 0) / 60;
      },
    },
  },

  // İlk model, örnek fotoğraf yüklendikten sonra kurulur
  hazirMi: function () {
    var el = document.getElementById("hud-filament-time");
    return !!el && /\d/.test(el.textContent) && el.textContent.indexOf("--") === -1;
  },

  hazir: function () {
    // Müşteri örnek fotoğrafa dönerse kendi fotoğrafı siparişe girmemeli
    var ornek = document.getElementById("preset-specimen-select");
    if (ornek) {
      ornek.addEventListener("change", function () {
        if (window.ADJY) window.ADJY.dosyalariBirak("Fotograf_Yukle");
      });
    }
  },
};
