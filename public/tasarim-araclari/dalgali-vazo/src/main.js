/* ==========================================================================
   DALGALI VAZO

   Zambak soğanı biçimli, yivli vazo (özgün model: Ø160 × 240 mm, 24 yiv).
   Gövde tek kapalı ağdır (bkz. ../_adjy/arac-ortak.js → kapKur): dış yüzey
   r(t, φ), iç yüzey duvar kalınlığı kadar içeride ve dalgayı izler; taban
   dolu. Desteksiz, tabanı üstüne basılır.

     biçim   → profil eğrisi: lilyum (geniş karın, dar boyun, açılan ağız),
               lale, sütun
     dalga   → yön: dikey yiv · sağa / sola burgu · yatay halka
               yer: bütün gövde · karın · boyun · ağız
               sayı ve derinlik; dalganın tepesi dış ölçüyü belirler
               (derinlik içe doğrudur: çap değişmez)
     yüzey   → pürüzsüz ya da pürüzlü. Pürüz ağda değil dilimlemededir (dış
               duvar titretilir); önizlemede kabartma dokusu olarak görünür
     sızdırmazlık → duvar üç çevreyle, taban tam dolu basılır (üretim
               projesinde kayıtlı); ağız kenarı yuvarlatılmış, taban kenarı
               pahlı

   Sarkma sınırı: dış yüzeyin düşeyle açısı 50°'yi geçerse çap ve dalga
   derinliği kendiliğinden kısılır (uyarıyla).
   ========================================================================== */
import {
  THREE, el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, hacim, olcum, stl, indir, csv,
  formBagla, alanlariYaz, tabloYaz, sureYaz, kapKur,
} from "../../_adjy/arac-ortak.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

const RENK = {
  beyaz: 0xf3f1ea, krem: 0xe8e0cf, terakota: 0xc85a3a, adacayi: 0x9caf88, antrasit: 0x3a3d42, siyah: 0x1b1b1f,
  lacivert: 0x1f2f5c, turkuaz: 0x21b5b0, sari: 0xf6c927, pembe: 0xef6fa5, mor: 0x6a3fa0, kirmizi: 0xc8242b,
};

// Profil eğrileri: [t (0 taban … 1 ağız), yarıçap / en geniş yarıçap]
const BICIM = {
  // Özgün modelin dış hattından ölçüldü (yiv tepeleri)
  lilyum: [[0, 0.916], [0.02, 0.967], [0.041, 0.993], [0.061, 1], [0.112, 0.964], [0.153, 0.9025], [0.214, 0.7856], [0.275, 0.6655],
    [0.336, 0.5623], [0.418, 0.4562], [0.5, 0.3826], [0.58, 0.3383], [0.662, 0.3192], [0.703, 0.3177], [0.764, 0.324],
    [0.846, 0.3449], [0.928, 0.3757], [1, 0.4044]],
  lale: [[0, 0.52], [0.06, 0.6], [0.2, 0.82], [0.36, 0.97], [0.46, 1], [0.6, 0.95], [0.76, 0.84], [0.88, 0.8], [1, 0.86]],
  sutun: [[0, 0.8], [0.05, 0.86], [0.2, 0.84], [0.45, 0.76], [0.62, 0.75], [0.8, 0.83], [1, 1]],
};

/** Kontrol noktalarından pürüzsüz eğri (Catmull–Rom, düzensiz aralık) */
function egri(noktalar) {
  const n = noktalar.length;
  const egim = noktalar.map((p, i) => {
    const a = noktalar[Math.max(0, i - 1)], b = noktalar[Math.min(n - 1, i + 1)];
    return (b[1] - a[1]) / (b[0] - a[0]);
  });
  return (t) => {
    t = clamp(t, 0, 1);
    let i = 0;
    while (i < n - 2 && t > noktalar[i + 1][0]) i++;
    const [x0, y0] = noktalar[i], [x1, y1] = noktalar[i + 1];
    const h = x1 - x0, u = (t - x0) / h;
    const u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * h * egim[i] + (-2 * u3 + 3 * u2) * y1 + (u3 - u2) * h * egim[i + 1];
  };
}
const yumusak = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/** Dalganın gövdedeki yeri: 0 … 1 */
const YER = {
  tumu: () => 1,
  karin: (t) => 1 - yumusak(0.3, 0.52, t),
  boyun: (t) => yumusak(0.2, 0.38, t) * (1 - yumusak(0.74, 0.9, t)),
  agiz: (t) => yumusak(0.5, 0.72, t),
};

function oku() {
  return {
    bicim: el("dv-bicim").value,
    H: clamp(sayi("dv-boy", 240), 100, 240),
    D: clamp(sayi("dv-cap", 160), 70, 220),
    yon: el("dv-yon").value,
    burgu: clamp(sayi("dv-burgu", 120), 20, 360),
    N: Math.round(clamp(sayi("dv-sayi", 24), 6, 40)),
    derin: clamp(sayi("dv-derin", 3.8), 0, 7),
    yer: el("dv-yer").value,
    renk: el("dv-renk").value,
    yuzey: el("dv-yuzey").value,
    duvar: clamp(sayi("dv-duvar", 2), 1.6, 3.2),
    taban: clamp(sayi("dv-taban", 2.4), 1.6, 6),
  };
}

const EGIM_SINIRI = Math.tan((50 * Math.PI) / 180); // dr/dz

/** Dış yüzey r(t, φ) ve kullanılan (kısılmış olabilen) ölçüler */
function yuzey(P) {
  const prof = egri(BICIM[P.bicim] || BICIM.lilyum);
  const yer = YER[P.yer] || YER.tumu;
  const yatay = P.yon === "yatay";
  const halka = Math.max(2, Math.round(P.N / 2)); // yatay dalgada gövde boyunca halka sayısı
  const isaret = P.yon === "saga" ? 1 : P.yon === "sola" ? -1 : 0;
  const burgu = (isaret * P.burgu * Math.PI) / 180;

  // Profilin en dik yeri: çapı sınırlar
  let enDik = 0;
  for (let i = 0; i < 200; i++) enDik = Math.max(enDik, Math.abs(prof((i + 1) / 200) - prof(i / 200)) * 200);
  let R = P.D / 2;
  const Rmax = (EGIM_SINIRI * 0.86 * P.H) / enDik;
  const capKisildi = R > Rmax;
  if (capKisildi) R = Rmax;

  // Dalga genliği (yarım derinlik); dar yerde orantılı küçülür
  let A = P.derin / 2;
  // Komşu yivler birbirine girmesin: genlik, yiv aralığının (en dar yerde) üçte birini geçmez
  let rMin = 1;
  for (let i = 0; i <= 50; i++) rMin = Math.min(rMin, prof(i / 50));
  if (!yatay) A = Math.min(A, (2 * Math.PI * R * rMin) / P.N / 3 / Math.pow(rMin, 0.7));
  // Yatay halkada sarkma: genlik · 2π · halka / H ≤ payı
  if (yatay) A = Math.min(A, (0.62 * P.H) / (2 * Math.PI * halka));
  const dalgaKisildi = A < P.derin / 2 - 0.05;

  const dis = (t, f) => {
    const p = prof(t);
    const w = yatay ? Math.cos(2 * Math.PI * halka * t) : Math.cos(P.N * (f - burgu * t));
    let r = R * p - A * Math.pow(p, 0.7) * yer(t) * (1 - w);
    // Taban kenarı pahlı (ilk katman taşması), ağız kenarı yuvarlak
    const s0 = clamp(1 - (t * P.H) / 1.2, 0, 1);
    const s1 = clamp((t * P.H - (P.H - 1.6)) / 1.6, 0, 1);
    return r - 0.8 * s0 * s0 - 0.35 * P.duvar * s1 * s1;
  };
  const ic = (t, f) => {
    const s1 = clamp((t * P.H - (P.H - 1.6)) / 1.6, 0, 1);
    // Ağızda iç kenar da yuvarlanır: 0,7 · duvar kadar dudak kalır
    return Math.max(2, dis(t, f) + 0.35 * P.duvar * s1 * s1 - P.duvar + 0.35 * P.duvar * s1 * s1);
  };
  return { dis, ic, R, A, capKisildi, dalgaKisildi, halka, yatay };
}

/** Pürüz dokusu: tekrarlanan gri benek; kabartma haritası olarak kullanılır */
const DOKU = (() => {
  const t = document.createElement("canvas");
  t.width = t.height = 128;
  const c = t.getContext("2d");
  const v = c.createImageData(128, 128);
  let a = 1234567;
  for (let i = 0; i < v.data.length; i += 4) {
    a = (a * 1664525 + 1013904223) >>> 0;
    const g = 60 + ((a >>> 24) / 255) * 195;
    v.data[i] = v.data[i + 1] = v.data[i + 2] = g;
    v.data[i + 3] = 255;
  }
  c.putImageData(v, 0, 0);
  const d = new THREE.CanvasTexture(t);
  d.wrapS = d.wrapT = THREE.RepeatWrapping;
  return d;
})();
const DOKU_BOYU = 9; // mm: dokunun bir tekrarı

/** Silindirik doku koordinatı (çevre boyunca tam sayıda tekrar; dikiş üçgenleri düzeltilir) */
function uvEkle(g, R) {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  const tekrar = Math.max(1, Math.round((2 * Math.PI * R) / DOKU_BOYU));
  for (let i = 0; i < p.count; i += 3) {
    const u = [0, 1, 2].map((k) => Math.atan2(p.getY(i + k), p.getX(i + k)) / (2 * Math.PI));
    if (Math.max(...u) - Math.min(...u) > 0.5) for (let k = 0; k < 3; k++) if (u[k] < 0) u[k] += 1;
    for (let k = 0; k < 3; k++) {
      uv[(i + k) * 2] = u[k] * tekrar;
      uv[(i + k) * 2 + 1] = p.getZ(i + k) / DOKU_BOYU;
    }
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

const S_ = sahneKur({ tuval: el("dv-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.5, -0.82, 0.3);
const mat = malzeme(RENK.beyaz, { roughness: 0.46 });
let SON = null;

function kur() {
  const P = oku();
  const Y = yuzey(P);
  // Çevrede yiv başına en az 12 nokta; yükseklikte ~1,2 mm
  const M = Y.yatay ? 160 : clamp(P.N * 14, 168, 392);
  const n = Math.round(clamp(P.H / (Y.yatay ? 0.9 : 1.2), 90, 260));
  const g = kapKur({ H: P.H, M, n, dis: Y.dis, ic: Y.ic, taban: P.taban });

  // En dik dış yüzey açısı (düşeyden)
  let enDik = 0;
  for (let i = 4; i < 196; i++) {
    for (const f of [0, Math.PI / P.N, 0.7]) {
      const d = Math.abs(Y.dis((i + 1) / 200, f) - Y.dis(i / 200, f)) / (P.H / 200);
      if (d > enDik) enDik = d;
    }
  }
  const egim = (Math.atan(enDik) * 180) / Math.PI;

  mat.color.setHex(RENK[P.renk] ?? RENK.beyaz);
  const puruz = P.yuzey === "hafif" ? 1 : P.yuzey === "belirgin" ? 2 : 0;
  if (puruz) uvEkle(g, Y.R);
  mat.bumpMap = puruz ? DOKU : null;
  mat.bumpScale = puruz * 1.1;
  mat.roughness = [0.46, 0.72, 0.88][puruz];
  mat.needsUpdate = true;
  S_.modeliYaz([ag(g, mat, "vazo")]);
  const v = hacim(g);
  const o = olcum(v, 0);
  // Üç çevreli ince duvar akış hızında değil duvar hızında basılır: dilimleyicide
  // ölçülen süre (Ø160 × 240: 7 sa 05 dk) hacim tahmininin 1,25 katı
  o.sureSaat *= 1.25;
  const agizCap = 2 * Y.ic(1 - 3 / P.H, 0);
  SON = { P, Y, g, v, olcum: o, egim, agizCap, cap: 2 * Y.R };

  bilgiYaz();
  if (!S_.elleOynandi) S_.ortala();
  window.__ADJY_DV = {
    hazir: true,
    olcum: o,
    olcu: `Ø${(2 * Y.R).toFixed(0)} × ${P.H} mm`,
    yuzey: P.yuzey,
  };
}

function bilgiYaz() {
  const { P, Y, v, olcum: o, egim, agizCap, cap } = SON;
  el("dv-olcu").textContent = `Ø${cap.toFixed(0)} × ${P.H} mm`;
  el("dv-burgu-satir").hidden = !(P.yon === "saga" || P.yon === "sola");
  const uyarilar = [];
  if (Y.capKisildi) uyarilar.push(`Çap ${cap.toFixed(0)} mm'ye çekildi: bu boyda daha genişi desteksiz basılmaz`);
  if (Y.dalgaKisildi) uyarilar.push(`Dalga derinliği ${(Y.A * 2).toFixed(1)} mm'ye çekildi`);
  const u = el("dv-uyari");
  u.hidden = !uyarilar.length;
  u.textContent = uyarilar.join(" · ");
  tabloYaz(el("dv-tablo"), [
    ["Dış ölçü", `Ø${cap.toFixed(1)} × ${P.H} mm`],
    ["Ağız iç çapı", `${agizCap.toFixed(0)} mm`],
    ["Dalga", P.derin > 0 ? `${Y.yatay ? Y.halka + " halka" : P.N + " yiv"} · ${(Y.A * 2).toFixed(1)} mm derin` : "yok"],
    ["Yüzey", P.yuzey === "puruzsuz" ? "pürüzsüz" : `pürüzlü (${P.yuzey === "hafif" ? "0,2" : "0,4"} mm, dilimleyicide dış duvar)`],
    ["Duvar / taban", `${P.duvar.toFixed(1)} / ${P.taban.toFixed(1)} mm`],
    ["En dik yüzey", `${egim.toFixed(0)}° (sınır 50°)`],
    ["Su hacmi ≈", `${suHacmi().toFixed(2)} L`],
    ["Hacim", `${(v / 1000).toFixed(0)} cm³`],
    ["Filament (PLA)", `${o.kutleG.toFixed(0)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
  ]);
}

/** İç hacim (litre): ağzın 10 mm altına kadar */
function suHacmi() {
  const { P, Y } = SON;
  let v = 0;
  const adim = 100, ust = P.H - 10;
  for (let i = 0; i < adim; i++) {
    const z = P.taban + ((ust - P.taban) * (i + 0.5)) / adim;
    let r2 = 0;
    for (let k = 0; k < 24; k++) { const r = Y.ic(z / P.H, (k / 24) * Math.PI * 2); r2 += r * r; }
    v += Math.PI * (r2 / 24) * ((ust - P.taban) / adim);
  }
  return v / 1e6;
}

function onEk() {
  const { P, cap } = SON;
  return `DALGALI_VAZO_${P.bicim}_D${cap.toFixed(0)}xH${P.H}`;
}
el("dv-stl").addEventListener("click", () => {
  if (SON) indir(stl([SON.g], "vazo"), `${onEk()}.stl`, "model/stl");
});
el("dv-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, Y, olcum: o, egim, cap } = SON;
  indir(csv([
    ["Alan", "Deger"], ["Bicim", P.bicim], ["Cap_mm", cap.toFixed(1)], ["Boy_mm", P.H], ["Dalga_yonu", P.yon], ["Burgu_derece", P.burgu],
    ["Dalga_sayisi", P.N], ["Dalga_derinligi_mm", (Y.A * 2).toFixed(1)], ["Dalga_yeri", P.yer], ["Renk", P.renk], ["Yuzey", P.yuzey],
    ["Duvar_mm", P.duvar], ["Taban_mm", P.taban], ["En_dik_yuzey_derece", egim.toFixed(0)], ["Su_hacmi_L", suHacmi().toFixed(2)],
    ["Baski", "Tabani ustune, desteksiz; 3 cevre, taban tam dolu (sizdirmaz)"],
    ["Kutle_g_PLA", o.kutleG.toFixed(0)], ["Sure_sa", o.sureSaat.toFixed(2)],
  ]), `${onEk()}_bilgi.csv`, "text/csv;charset=utf-8");
});

const HAZIR = {
  lilyum: { "dv-bicim": "lilyum", "dv-boy": 240, "dv-cap": 160, "dv-yon": "dikey", "dv-sayi": 24, "dv-derin": 3.8, "dv-yer": "tumu", "dv-renk": "beyaz", "dv-yuzey": "puruzsuz" },
  burgu: { "dv-bicim": "lilyum", "dv-boy": 220, "dv-cap": 150, "dv-yon": "saga", "dv-burgu": 140, "dv-sayi": 16, "dv-derin": 5, "dv-yer": "tumu", "dv-renk": "terakota", "dv-yuzey": "hafif" },
  halka: { "dv-bicim": "lale", "dv-boy": 200, "dv-cap": 130, "dv-yon": "yatay", "dv-sayi": 28, "dv-derin": 2.8, "dv-yer": "tumu", "dv-renk": "adacayi", "dv-yuzey": "puruzsuz" },
  yalin: { "dv-bicim": "sutun", "dv-boy": 180, "dv-cap": 110, "dv-yon": "dikey", "dv-sayi": 32, "dv-derin": 3, "dv-yer": "karin", "dv-renk": "antrasit", "dv-yuzey": "belirgin" },
};
document.querySelectorAll("[data-hazir]").forEach((b) => {
  b.addEventListener("click", () => {
    alanlariYaz(HAZIR[b.dataset.hazir] || {});
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.toggle("on", x === b));
  });
});

let z = null;
formBagla((t) => {
  if (t && ["dv-boy", "dv-cap", "dv-bicim"].includes(t.id)) S_.elleOynandi = false;
  // Ağ büyük: kaydırıcı sürüklenirken her adımda kurma
  if (z) clearTimeout(z);
  z = setTimeout(() => { z = null; S_.yenile?.(); }, 90);
});
S_.dongu(kur);
window.__ADJY_SAHNE_MODEL = () => S_.model;
