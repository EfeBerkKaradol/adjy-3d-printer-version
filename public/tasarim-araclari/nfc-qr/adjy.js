/* NFC / QR stand ve anahtarlık — mağaza köprüsü ayarı */
window.ADJY_ARAC = {
  id: "nfc-qr",

  // Düğmelerdeki değişken adları — iki kipte de okunur adla gösterilir
  ceviri: {
      "Urun_Tipi": "Ürün tipi",
      "Angled_Stand / Keychain": "Stand ya da anahtarlık",
      "Angled_Stand (68° Stand)": "Masa standı",
      "En_Boy_Orani": "En-boy oranı",
      "[ 01 / HAZIR ÖZEL TASARIM ŞABLONLARI ]": "Hazır tasarımlar",
      "[ 02 / TEMEL PARAMETRİK GİRDİLER ]": "Bağlantı ve yazı",
      "[ DIŞ GÖVDE SİLÜETİ / ŞEKİL SEÇİMİ ]": "Gövde şekli",
      "[ M600 ÇİFT RENK & MALZEME ]": "Renk",
      "[ YERLEŞİM DÜZENİ & METİN İÇERİĞİ ]": "Alt yazı ve simge",
      "[ HASSAS KONUM & ÖLÇEK AYARI ]": "İnce ayar",
  },

  tema: { oznitelik: "data-theme", acik: "light", koyu: "dark", ilk: "dark", dugme: "#btn-theme-toggle" },

  gizle: [
    ".topbar",
    ".param-group:has(#num-taban-kalinlik)",
    ".param-group:has(#num-qr-kabartma)",
    ".param-group:has(#num-katman-yukseklik)",
    ".param-group:has(#num-nfc-cap)",
    ".param-group:has(#num-siparis-adedi)",
    ".param-group:has(#num-tabla-boyutu)",
    ".cad-toolbar .toolbar-group:first-child",
    '[data-display="xray"]',
    '[data-display="blueprint"]',
    '[data-display="wireframe"]',
    "#vp-plate",
    "#btn-pose-flat",
    "#vp-part-vol",
    "#btn-jump-nfc",
    "#btn-jump-m600",
    ".panel-right",
    "#antet-modal",
    '#sel-material option[value="ALU"]',
    '#sel-material option[value="SS304"]',
    // Sadeleştirme: kamera, kesit ve gösterim araçları müşteriye kapalı
    ".studio-tabs",
    ".cad-toolbar",
    ".clipping-bar",
    "#btn-pose-assembled",
    "#btn-pose-exploded",
    ".param-group:has(#inp-ust-baslik-2)",
    ".param-unit",
    ".vp-index",
  ],

  // Sade görünümde kapalı duran ayrıntı ayarları. Müşteri "Tüm ayarlar"
  // derse açılır; atölye kipinde hep açıktır ve sipariş metnine her
  // durumda girer.
  gelismis: [
    ".param-group:has(#seg-aspect)",
    ".param-group:has(#rng-kose-radyus)",
    ".param-group:has(#sel-border-style)",
    ".param-group:has(#sel-lug-pos)",
    ".param-group:has(#sel-material)",
    ".custom-color-pickers",
    ".param-group:has(#sel-layout)",
    ".two-col-row:has(#sel-font)",
    ".panel-section:has(#rng-qr-scale)",
    ".vp-quick-nudge",
  ],

  gruplar: [
    { kap: ".preset-grid", oz: "data-preset", yazma: true },
    { kap: "#seg-urun-tipi", oz: "data-val", etiket: "Ürün tipi" },
    { kap: "#shape-selector-grid", oz: "data-shape", etiket: "Gövde şekli" },
    { kap: "#seg-aspect", oz: "data-aspect", etiket: "Oran" },
  ],

  etiketler: {
    "qr-url": "QR bağlantısı",
    "ust-baslik": "Üst başlık",
    "ust-baslik-2": "Üst başlık",
    "alt-metin": "Alt metin",
    "taban-en-boy": "Plaka ölçüsü",
    "kose-radyus": "Köşe yuvarlaklığı",
    "qr-scale": "QR boyutu",
    "qr-off-x": "QR yatay konum",
    "qr-off-y": "QR dikey konum",
    "txt-scale": "Yazı boyutu",
    "txt-off-x": "Yazı yatay konum",
    "txt-off-y": "Yazı dikey konum",
    "border-style": "Çerçeve",
    "lug-pos": "Askı halkası",
    layout: "Yerleşim",
    font: "Yazı tipi",
    align: "Hizalama",
    icon: "Simge",
    "icon-pos": "Simge konumu",
    material: "Malzeme",
    "custom-base": "Gövde rengi",
    "custom-emboss": "Kabartma rengi",
  },
  birimler: {
    "taban-en-boy": "mm",
    "kose-radyus": "mm",
    "qr-scale": "%",
    "qr-off-x": "mm",
    "qr-off-y": "mm",
    "txt-scale": "%",
    "txt-off-x": "mm",
    "txt-off-y": "mm",
  },

  ozetHaric: ["clip-axis", "clip-offset"],

  olcum: {
    kutleG: { sec: "#vp-part-vol", desen: "Kütle:\\s*([\\d.]+)" },
    // Araç birim süreyi yazmıyor; kendi hesabındaki debiyle türetilir
    // (hacim × 0,84 doluluk ÷ 9,5 mm³/sn).
    sureSaat: {
      oku: function () {
        var el = document.getElementById("vp-part-vol");
        var m = el && /Hacim:\s*([\d.]+)/.exec(el.textContent);
        if (!m) return null;
        return (parseFloat(m[1]) * 0.84 * 1000) / 9.5 / 3600;
      },
    },
  },

  hazirMi: function () {
    var el = document.getElementById("vp-part-vol");
    return !!el && /Kütle:\s*\d/.test(el.textContent);
  },

  // Tabla dizilimi atölyenin işi; müşteri yalnızca tek parçayı görür
  hazir: function (o) {
    if (o.uretim) return;
    var tek = document.querySelector('[data-layout="part"]');
    if (tek) tek.click();
  },
};
