/* ==========================================================================
   İSİMLİ YILBAŞI SÜSÜ

   İki parça, iki renk:
     gövde  → şekil (top, yıldız, çam, çan, kalp) + askı halkası, T kalınlık
     yazı   → isim, yıl ve kenar çerçevesi; gövdenin üstünde H yüksekliğinde

   Şekil ve yazı 2B olarak tuvale çizilir, dış hatları çıkarılıp ekstrüde
   edilir (bkz. ../_adjy/yilbasi-ortak.js). Yazı gövdenin içinde kalacak
   şekilde kırpılır; çerçeve açıksa yazı çerçeveye değmez.

   Baskı: gövde tablaya yatar, Z=T'de renk değişir (tek memede duraklatıp
   filament değiştirme ya da çok renkli yazıcı). Desteksiz.
   ========================================================================== */
import {
  THREE, el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, maske, maskeBirlestir, maskeDoluMu, asindir,
  maskedenKati, hacim, olcum, stl, indir, dosyaAdi, csv, formBagla, alanlariYaz, tabloYaz, sureYaz,
  pahliKati,
} from "../../_adjy/arac-ortak.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

const RENK = {
  kirmizi: 0xc4202b, yesil: 0x1f6b3a, beyaz: 0xf3f1ea, altin: 0xd2a347, gumus: 0xb9bcc2,
  lacivert: 0x1d2a52, siyah: 0x25262a, pembe: 0xe58fb0, mavi: 0x5d9bd8,
};
const YAZI_TIPI = {
  yuvarlak: { aile: '"Baloo 2"', agirlik: 800, ad: "Yuvarlak" },
  elyazisi: { aile: '"Pacifico"', agirlik: 400, ad: "El yazısı" },
  modern: { aile: '"Geist"', agirlik: 800, ad: "Modern" },
};

// ---------------------------------------------------------------- ŞEKİLLER
// Birim genişlikte (1) çizilir, orijin ortada, +Y yukarı. yuvarla: köşe
// yuvarlama yarıçapı (birim). ust: askının oturacağı tepe noktası.
// isim / yil: yazı kutuları [merkezX, merkezY, genişlik, yükseklik].
const SEKIL = {
  top: {
    ad: "Top",
    yol(c) {
      c.moveTo(0.5, 0);
      c.arc(0, 0, 0.5, 0, Math.PI * 2);
      c.rect(-0.13, 0.44, 0.26, 0.11);
    },
    yuvarla: 0.012,
    ust: 0.555,
    alt: -0.5,
    isim: [0, 0.04, 0.78, 0.3],
    yil: [0, -0.22, 0.44, 0.13],
  },
  yildiz: {
    ad: "Yıldız",
    yol(c) {
      const R = 0.5257 - 0.03, r = R * 0.48;
      for (let i = 0; i < 10; i++) {
        const a = Math.PI / 2 + (i * Math.PI) / 5;
        const q = i % 2 ? r : R;
        i ? c.lineTo(q * Math.cos(a), q * Math.sin(a)) : c.moveTo(q * Math.cos(a), q * Math.sin(a));
      }
      c.closePath();
    },
    yuvarla: 0.03,
    ust: 0.5257,
    alt: -0.425,
    isim: [0, 0.02, 0.44, 0.16],
    yil: [0, -0.12, 0.26, 0.08],
  },
  agac: {
    ad: "Çam ağacı",
    yol(c) {
      const kat = [[1.0, -0.36, 0.02], [0.8, -0.12, 0.26], [0.58, 0.1, 0.48]];
      for (const [g, y0, y1] of kat) {
        c.moveTo(-g / 2 + 0.03, y0);
        c.lineTo(g / 2 - 0.03, y0);
        c.lineTo(0, y1);
        c.closePath();
      }
      c.rect(-0.08, -0.5, 0.16, 0.16);
    },
    yuvarla: 0.025,
    ust: 0.505,
    alt: -0.5,
    isim: [0, -0.255, 0.56, 0.13],
    yil: [0, 0.02, 0.24, 0.07],
  },
  can: {
    ad: "Çan",
    yol(c) {
      c.moveTo(0, 0.4);
      c.bezierCurveTo(0.2, 0.4, 0.27, 0.24, 0.28, 0.05);
      c.bezierCurveTo(0.29, -0.13, 0.36, -0.2, 0.47, -0.27);
      c.lineTo(0.47, -0.33);
      c.lineTo(-0.47, -0.33);
      c.lineTo(-0.47, -0.27);
      c.bezierCurveTo(-0.36, -0.2, -0.29, -0.13, -0.28, 0.05);
      c.bezierCurveTo(-0.27, 0.24, -0.2, 0.4, 0, 0.4);
      c.closePath();
      c.moveTo(0.075, -0.4);
      c.arc(0, -0.4, 0.075, 0, Math.PI * 2);
      c.moveTo(0.06, 0.45);
      c.arc(0, 0.45, 0.06, 0, Math.PI * 2);
    },
    yuvarla: 0.02,
    ust: 0.51,
    alt: -0.475,
    isim: [0, 0.0, 0.44, 0.17],
    yil: [0, -0.2, 0.42, 0.075],
  },
  kalp: {
    ad: "Kalp",
    yol(c) {
      c.moveTo(0, -0.44);
      c.bezierCurveTo(-0.16, -0.31, -0.48, -0.1, -0.48, 0.15);
      c.bezierCurveTo(-0.48, 0.36, -0.31, 0.45, -0.2, 0.45);
      c.bezierCurveTo(-0.08, 0.45, -0.01, 0.38, 0, 0.3);
      c.bezierCurveTo(0.01, 0.38, 0.08, 0.45, 0.2, 0.45);
      c.bezierCurveTo(0.31, 0.45, 0.48, 0.36, 0.48, 0.15);
      c.bezierCurveTo(0.48, -0.1, 0.16, -0.31, 0, -0.44);
      c.closePath();
    },
    yuvarla: 0.015,
    ust: 0.33,
    alt: -0.44,
    isim: [0, 0.07, 0.62, 0.22],
    yil: [0, -0.15, 0.32, 0.09],
  },
};

// ---------------------------------------------------------------- PARAMETRE
function oku() {
  return {
    sekil: SEKIL[el("yb-sekil").value] ? el("yb-sekil").value : "top",
    W: clamp(sayi("yb-boyut", 80), 50, 120),
    T: clamp(sayi("yb-kalinlik", 3.6), 2.4, 6),
    isim: el("yb-isim").value.trim().slice(0, 16),
    yil: el("yb-yil").value.trim().slice(0, 12),
    tip: YAZI_TIPI[el("yb-yazi-tipi").value] ? el("yb-yazi-tipi").value : "yuvarlak",
    kenar: el("yb-kenar").checked,
    aski: el("yb-aski").value,
    renkGovde: el("yb-renk-govde").value,
    renkYazi: el("yb-renk-yazi").value,
    H: clamp(sayi("yb-yazi-yuksek", 1.2), 0.6, 2.4),
    kenarG: clamp(sayi("yb-kenar-genislik", 2), 1.2, 4),
    delik: clamp(sayi("yb-delik", 4), 2.5, 6),
    px: clamp(sayi("yb-cozunurluk", 10), 6, 16),
  };
}

// ---------------------------------------------------------------- 2B ÇİZİM
function sekilCiz(c, P, S) {
  // Birim çizimi W ölçeğine taşı; dolgu + yuvarlak birleşimli çizgi:
  // dış köşeler yuvarlanır. İçe daraltma için asindir() (ortak modül).
  const W = P.W;
  c.save();
  c.scale(W, W);
  c.beginPath();
  S.yol(c);
  c.restore();
  c.save();
  c.fill("nonzero");
  if (S.yuvarla > 0) {
    c.lineJoin = "round";
    c.lineCap = "round";
    c.lineWidth = S.yuvarla * 2 * W;
    c.stroke();
  }
  c.restore();
}

/** Askı halkası (gövdeye eklenir) ve deliği */
function askiYeri(P, S) {
  const ustY = S.ust * P.W;
  if (P.aski === "halka") return { x: 0, y: ustY + P.delik / 2 + 0.6, dis: P.delik / 2 + 2.4, ic: P.delik / 2 };
  if (P.aski === "delik") return { x: 0, y: ustY - P.delik / 2 - 2.6, dis: 0, ic: P.delik / 2 };
  return null;
}

function cerceve(P, S) {
  const a = askiYeri(P, S);
  const ust = Math.max(S.ust * P.W, a && a.dis ? a.y + a.dis : 0);
  const alt = S.alt * P.W;
  const gen = P.W + 4;
  const yuk = Math.max(Math.abs(ust), Math.abs(alt)) * 2 + 4;
  return { gen, yuk, a };
}

function yaziSatirlari(P, S) {
  const satirlar = [];
  if (P.isim) satirlar.push({ metin: P.isim, kutu: S.isim });
  if (P.yil) satirlar.push({ metin: P.yil, kutu: S.yil });
  return satirlar;
}

/** Yazıyı kutuya sığdırır; sığmıyorsa küçültür. Harf boyu (mm) döner. */
function yaziCiz(c, P, satir) {
  const tip = YAZI_TIPI[P.tip];
  const [kx, ky, kw, kh] = satir.kutu.map((v) => v * P.W);
  let boy = kh * 1.25;
  c.save();
  c.font = `${tip.agirlik} ${boy}px ${tip.aile}`;
  let m = c.measureText(satir.metin);
  const yuk = (m.actualBoundingBoxAscent || boy * 0.72) + (m.actualBoundingBoxDescent || 0);
  const olcek = Math.min(1, kw / Math.max(1e-6, m.width), kh / Math.max(1e-6, yuk));
  boy *= olcek;
  c.font = `${tip.agirlik} ${boy}px ${tip.aile}`;
  m = c.measureText(satir.metin);
  const asc = m.actualBoundingBoxAscent || boy * 0.72;
  const desc = m.actualBoundingBoxDescent || 0;
  c.translate(kx, ky);
  c.scale(1, -1); // tuval mm'de ters; yazı düz okunsun
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.fillText(satir.metin, 0, (asc - desc) / 2);
  // Kalınlaştırma: ince el yazısı çizgileri 0,8 mm altına inmesin
  // (0,4 mm meme iki perimetre); harfler her yönde 0,22 mm kalınlaşır.
  c.lineJoin = "round";
  c.lineWidth = 0.45;
  c.strokeText(satir.metin, 0, (asc - desc) / 2);
  c.restore();
  return asc + desc;
}

// ---------------------------------------------------------------- KUR
const S_ = sahneKur({ tuval: el("yb-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.08, -0.62, 0.95);
const matGovde = malzeme(RENK.kirmizi);
const matYazi = malzeme(RENK.beyaz);
let SON = null;

function kur() {
  const P = oku();
  const S = SEKIL[P.sekil];
  const { gen, yuk, a } = cerceve(P, S);
  const px = P.px;

  // Gövde: şekil + halka, delik açık
  const govde = maske(gen, yuk, px, (c) => {
    sekilCiz(c, P, S);
    if (a && a.dis) {
      c.beginPath();
      c.arc(a.x, a.y, a.dis, 0, Math.PI * 2);
      c.fill();
      // Halkayı gövdeye bağlayan boyun
      c.fillRect(a.x - a.dis * 0.7, S.ust * P.W - 2, a.dis * 1.4, a.y - S.ust * P.W + 2);
    }
    if (a) {
      c.save();
      c.globalCompositeOperation = "destination-out";
      c.beginPath();
      c.arc(a.x, a.y, a.ic, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  });

  // Yazının duracağı alan: şeklin içi, çerçeve ve askı deliğinden uzak
  const pay = (P.kenar ? P.kenarG : 0) + 1.2;
  const icAlan = asindir(maske(gen, yuk, px, (c) => sekilCiz(c, P, S)), pay);
  icAlan.ctx.save();
  icAlan.ctx.translate(icAlan.w / 2, icAlan.h / 2);
  icAlan.ctx.scale(px, -px);
  ((c) => {
    if (a) {
      c.save();
      c.globalCompositeOperation = "destination-out";
      c.beginPath();
      c.arc(a.x, a.y, a.ic + 2, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  })(icAlan.ctx);
  icAlan.ctx.restore();

  let harfBoyu = Infinity;
  const yazi = maske(gen, yuk, px, (c) => {
    for (const satir of yaziSatirlari(P, S)) harfBoyu = Math.min(harfBoyu, yaziCiz(c, P, satir));
  });
  maskeBirlestir(yazi, icAlan, "destination-in");

  // Çerçeve: şekil eksi içe kaydırılmış şekil (askı deliği dışında)
  if (P.kenar) {
    const bant = maske(gen, yuk, px, (c) => sekilCiz(c, P, S));
    const ic = asindir(maske(gen, yuk, px, (c) => sekilCiz(c, P, S)), P.kenarG);
    maskeBirlestir(bant, ic, "destination-out");
    maskeBirlestir(yazi, bant, "lighter");
  }
  // Askı deliği yazı katmanında da açık kalsın (çerçeve deliğin üstünü kapatmasın)
  if (a) {
    const c = yazi.ctx;
    c.save();
    c.translate(yazi.w / 2, yazi.h / 2);
    c.scale(px, -px);
    c.globalCompositeOperation = "destination-out";
    c.beginPath();
    c.arc(a.x, a.y, a.ic + 0.8, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  // Pahlı kenarlar: yazı ve çerçeve 0,4 mm. Gövdenin üst kenarı yalnız
  // çerçevesizken pahlanır (çerçeve kenarı örter; pah çerçevenin altında
  // kalsa çerçevenin dış şeridi havada kalırdı).
  const gGovde = pahliKati(govde, P.T, 0, P.kenar ? 0 : 0.6, 3);
  const yaziVar = maskeDoluMu(yazi);
  const gYazi = yaziVar ? pahliKati(yazi, P.H, P.T, Math.min(0.4, P.H * 0.4), 2) : null;

  matGovde.color.setHex(RENK[P.renkGovde] ?? RENK.kirmizi);
  matYazi.color.setHex(RENK[P.renkYazi] ?? RENK.beyaz);
  const aglar = [ag(gGovde, matGovde, "govde")];
  if (gYazi) aglar.push(ag(gYazi, matYazi, "yazi"));
  S_.modeliYaz(aglar);

  const vGovde = hacim(gGovde), vYazi = hacim(gYazi);
  const toplam = vGovde + vYazi;
  const o = olcum(toplam, gYazi ? 1 : 0);
  const kutu = S_.kutu.clone();
  const boyut = kutu.getSize(new THREE.Vector3());
  SON = { P, S, gGovde, gYazi, vGovde, vYazi, olcum: o, boyut, harfBoyu: Number.isFinite(harfBoyu) ? harfBoyu : 0 };

  bilgiYaz();
  if (!S_.elleOynandi) S_.ortala();

  window.__ADJY_YB = {
    hazir: true,
    olcum: o,
    olcu: `${boyut.x.toFixed(0)} × ${boyut.y.toFixed(0)} × ${boyut.z.toFixed(1)} mm`,
  };
}

function bilgiYaz() {
  const { P, boyut, olcum: o, harfBoyu, vGovde, vYazi } = SON;
  el("yb-olcu").textContent = `${boyut.x.toFixed(0)} × ${boyut.y.toFixed(0)} mm · ${(P.T + (SON.gYazi ? P.H : 0)).toFixed(1)} mm kalınlık`;
  const uyarilar = [];
  if (SON.gYazi && harfBoyu < 4.5) uyarilar.push("Yazı küçük kaldı: süsü büyütün ya da yazıyı kısaltın");
  if (!P.isim && !P.yil) uyarilar.push("Yazı yok: süs düz basılır");
  const u = el("yb-uyari");
  u.hidden = !uyarilar.length;
  u.textContent = uyarilar.join(" · ");
  const not = el("yb-yazi-not");
  if (not) {
    not.textContent = SON.gYazi && harfBoyu < 4.5 ? "Harfler küçük: daha kısa bir yazı ya da daha büyük süs daha net basılır." : "";
    not.classList.toggle("uyari", !!not.textContent);
  }
  const katman = Math.round(P.T / 0.2);
  tabloYaz(el("yb-tablo"), [
    ["Şekil", SEKIL[P.sekil].ad],
    ["Dış ölçü", `${boyut.x.toFixed(1)} × ${boyut.y.toFixed(1)} × ${boyut.z.toFixed(1)} mm`],
    ["Gövde hacmi", `${(vGovde / 1000).toFixed(2)} cm³`],
    ["Yazı + çerçeve", `${(vYazi / 1000).toFixed(2)} cm³`],
    ["Filament (PLA)", `${o.kutleG.toFixed(1)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
    ["Renk değişimi", SON.gYazi ? `Z = ${P.T.toFixed(2)} mm (${katman + 1}. katman, 0,2 mm)` : "yok"],
    ["En küçük harf", SON.gYazi ? `${harfBoyu.toFixed(1)} mm` : "—"],
  ]);
}

// ---------------------------------------------------------------- ÇIKTILAR
function onEk() {
  const P = SON.P;
  return `SUS_${P.sekil}_${dosyaAdi(P.isim || "yazisiz")}_${Math.round(P.W)}mm`;
}
el("yb-stl-govde").addEventListener("click", () => {
  if (!SON) return;
  indir(stl([SON.gGovde], onEk() + " govde"), `${onEk()}_1_govde_${SON.P.renkGovde}.stl`, "model/stl");
});
el("yb-stl-yazi").addEventListener("click", () => {
  if (!SON || !SON.gYazi) return;
  indir(stl([SON.gYazi], onEk() + " yazi"), `${onEk()}_2_yazi_${SON.P.renkYazi}.stl`, "model/stl");
});
el("yb-stl-tek").addEventListener("click", () => {
  if (!SON) return;
  indir(stl([SON.gGovde, SON.gYazi], onEk() + " tek renk"), `${onEk()}_tek_parca.stl`, "model/stl");
});
el("yb-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, boyut, olcum: o } = SON;
  indir(
    csv([
      ["Alan", "Deger"],
      ["Sekil", SEKIL[P.sekil].ad],
      ["Isim", P.isim],
      ["Yil", P.yil],
      ["Yazi_tipi", YAZI_TIPI[P.tip].ad],
      ["Olcu_mm", `${boyut.x.toFixed(1)} x ${boyut.y.toFixed(1)} x ${boyut.z.toFixed(1)}`],
      ["Govde_kalinlik_mm", P.T],
      ["Yazi_yukseklik_mm", P.H],
      ["Renk_degisim_Z_mm", SON.gYazi ? P.T : "-"],
      ["Govde_renk", P.renkGovde],
      ["Yazi_renk", P.renkYazi],
      ["Kutle_g_PLA", o.kutleG.toFixed(1)],
      ["Sure_sa", o.sureSaat.toFixed(2)],
    ]),
    `${onEk()}_bilgi.csv`,
    "text/csv;charset=utf-8"
  );
});

// ---------------------------------------------------------------- HAZIR SÜSLER
const HAZIR = {
  aile: { "yb-sekil": "top", "yb-isim": "Yılmaz Ailesi", "yb-yil": "2027", "yb-yazi-tipi": "elyazisi", "yb-renk-govde": "kirmizi", "yb-renk-yazi": "altin", "yb-kenar": true },
  bebek: { "yb-sekil": "yildiz", "yb-isim": "Defne", "yb-yil": "İlk yılbaşım", "yb-yazi-tipi": "yuvarlak", "yb-renk-govde": "beyaz", "yb-renk-yazi": "pembe", "yb-kenar": true },
  cam: { "yb-sekil": "agac", "yb-isim": "Mutlu Yıllar", "yb-yil": "2027", "yb-yazi-tipi": "yuvarlak", "yb-renk-govde": "yesil", "yb-renk-yazi": "beyaz", "yb-kenar": false },
  ask: { "yb-sekil": "kalp", "yb-isim": "Ece & Can", "yb-yil": "2027", "yb-yazi-tipi": "elyazisi", "yb-renk-govde": "kirmizi", "yb-renk-yazi": "beyaz", "yb-kenar": true },
};
document.querySelectorAll("[data-hazir]").forEach((b) => {
  b.addEventListener("click", () => {
    alanlariYaz(HAZIR[b.dataset.hazir] || {});
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.toggle("on", x === b));
  });
});

// İsim sayacı
function sayac() {
  const s = el("yb-isim-sayac");
  if (s) s.textContent = `${el("yb-isim").value.length}/16`;
}

formBagla((t) => {
  if (t && t.id === "yb-isim") sayac();
  if (t && t.closest && !t.closest("[data-hazir]") && ["yb-sekil", "yb-isim", "yb-yil"].includes(t.id)) {
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.remove("on"));
  }
  if (t && ["yb-sekil", "yb-boyut"].includes(t.id)) S_.elleOynandi = false;
  S_.yenile?.();
});
sayac();

S_.dongu(kur);
// Yazı tipleri inince yazı yeniden çizilsin (ilk karede yedek yazı tipi olabilir)
if (document.fonts) {
  const yukle = Object.values(YAZI_TIPI).map((t) => document.fonts.load(`${t.agirlik} 40px ${t.aile}`, "ĞğŞşİıÖöÜüÇç2027"));
  Promise.allSettled(yukle).then(() => S_.yenile?.());
  document.fonts.addEventListener?.("loadingdone", () => S_.yenile?.());
}
