/* ==========================================================================
   İSİMLİ YILBAŞI SOFRA KARTI

   Üç parça:
     kart  → yuvarlak köşeli plaka, T kalınlık (tablaya yatık basılır)
     yazı  → isim, alt satır, motif ve çerçeve; kartın üstünde (2. renk)
     ayak  → yan profili (yuvalı) X boyunca çekilir; yuva yukarı açık,
             desteksiz. Kart yuvaya dik oturur (boşluk atölyede ayarlı).
   Ekranda kart ayağın içinde dik durur; dosyalar baskı yönünde iner.
   ========================================================================== */
import {
  THREE, el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, hacim, stl, indir, csv,
  formBagla, alanlariYaz, tabloYaz, sureYaz, maske, maskeBirlestir, maskeDoluMu, asindir,
  maskedenKati, dosyaAdi, PLA,
} from "../../_adjy/arac-ortak.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

const RENK = {
  kirmizi: 0xc4202b, yesil: 0x1f6b3a, beyaz: 0xf3f1ea, altin: 0xd2a347,
  gumus: 0xb9bcc2, pembe: 0xe58fb0, mavi: 0x5d9bd8, siyah: 0x25262a,
};
const YAZI_TIPI = {
  yuvarlak: { aile: '"Baloo 2"', agirlik: 800 },
  elyazisi: { aile: '"Pacifico"', agirlik: 400 },
  modern: { aile: '"Geist"', agirlik: 800 },
};
const AYAK = { derin: 16, yuk: 9, yuva: 5.5, pah: 1 };

function cizgi(c, pts, w) {
  c.save(); c.lineWidth = w; c.lineCap = "round"; c.lineJoin = "round";
  c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.restore();
}
// Motifler: birim kare (−0.5 … 0.5)
const MOTIF = {
  agac(c) {
    c.beginPath();
    for (const [g, y0, y1] of [[0.92, -0.3, 0.04], [0.72, -0.08, 0.26], [0.52, 0.12, 0.48]]) {
      c.moveTo(-g / 2, y0); c.lineTo(g / 2, y0); c.lineTo(0, y1); c.closePath();
    }
    c.rect(-0.08, -0.48, 0.16, 0.2);
    c.fill();
  },
  yildiz(c) {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? 0.21 : 0.5;
      i ? c.lineTo(q * Math.cos(a), q * Math.sin(a) - 0.04) : c.moveTo(q * Math.cos(a), q * Math.sin(a) - 0.04);
    }
    c.closePath(); c.fill();
  },
  kar(c) {
    for (let i = 0; i < 6; i++) {
      c.save(); c.rotate((i * Math.PI) / 3);
      cizgi(c, [[0, 0], [0, 0.45]], 0.08);
      cizgi(c, [[0, 0.26], [0.12, 0.38]], 0.065);
      cizgi(c, [[0, 0.26], [-0.12, 0.38]], 0.065);
      c.restore();
    }
    c.beginPath(); c.arc(0, 0, 0.1, 0, Math.PI * 2); c.fill();
  },
  can(c) {
    c.beginPath();
    c.moveTo(0, 0.36);
    c.bezierCurveTo(0.2, 0.36, 0.26, 0.2, 0.27, 0.02);
    c.bezierCurveTo(0.28, -0.15, 0.35, -0.21, 0.45, -0.27);
    c.lineTo(0.45, -0.33); c.lineTo(-0.45, -0.33); c.lineTo(-0.45, -0.27);
    c.bezierCurveTo(-0.35, -0.21, -0.28, -0.15, -0.27, 0.02);
    c.bezierCurveTo(-0.26, 0.2, -0.2, 0.36, 0, 0.36);
    c.closePath(); c.fill();
    c.beginPath(); c.arc(0, -0.4, 0.07, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(0, 0.42, 0.055, 0, Math.PI * 2); c.fill();
  },
  hediye(c) {
    c.fillRect(-0.4, -0.45, 0.8, 0.55);
    c.fillRect(-0.45, 0.12, 0.9, 0.16);
    c.save();
    c.globalCompositeOperation = "destination-out";
    c.fillRect(-0.05, -0.47, 0.1, 0.78);
    c.restore();
    cizgi(c, [[0, 0.3], [-0.18, 0.46], [-0.28, 0.36], [0, 0.3]], 0.06);
    cizgi(c, [[0, 0.3], [0.18, 0.46], [0.28, 0.36], [0, 0.3]], 0.06);
  },
};

function oku() {
  return {
    isim: el("sk-isim").value.trim().slice(0, 14),
    alt: el("sk-alt").value.trim().slice(0, 20),
    tip: YAZI_TIPI[el("sk-yazi-tipi").value] ? el("sk-yazi-tipi").value : "elyazisi",
    motif: el("sk-motif").value,
    cerceve: el("sk-cerceve").checked,
    W: clamp(sayi("sk-gen", 95), 70, 130),
    Hk: clamp(sayi("sk-yuk", 42), 32, 60),
    ayak: el("sk-ayak").checked,
    renkKart: el("sk-renk-kart").value,
    renkYazi: el("sk-renk-yazi").value,
    renkAyak: el("sk-renk-ayak").value,
    T: clamp(sayi("sk-kal", 2.4), 2, 4),
    h: clamp(sayi("sk-yazi-yuksek", 1.0), 0.6, 1.6),
    bosluk: clamp(sayi("sk-bosluk", 0.35), 0.15, 0.6),
    px: clamp(sayi("sk-cozunurluk", 10), 6, 16),
  };
}

/** Metni kutuya sığdırır; harf boyunu döner */
function yazi(c, P, metin, kx, ky, kw, kh) {
  if (!metin) return Infinity;
  const tip = YAZI_TIPI[P.tip];
  let boy = kh * 1.3;
  c.save();
  c.font = `${tip.agirlik} ${boy}px ${tip.aile}`;
  let m = c.measureText(metin);
  const yk = (m.actualBoundingBoxAscent || boy * 0.72) + (m.actualBoundingBoxDescent || 0);
  boy *= Math.min(1, kw / Math.max(1e-6, m.width), kh / Math.max(1e-6, yk));
  c.font = `${tip.agirlik} ${boy}px ${tip.aile}`;
  m = c.measureText(metin);
  const asc = m.actualBoundingBoxAscent || boy * 0.72, desc = m.actualBoundingBoxDescent || 0;
  c.translate(kx, ky);
  c.scale(1, -1);
  c.textAlign = "center";
  c.fillText(metin, 0, (asc - desc) / 2);
  c.lineJoin = "round";
  c.lineWidth = 0.4; // ince el yazısı çizgileri basılabilir kalsın
  c.strokeText(metin, 0, (asc - desc) / 2);
  c.restore();
  return asc + desc;
}

const S_ = sahneKur({ tuval: el("sk-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.35, -0.95, 0.45);
const matKart = malzeme(RENK.yesil);
const matYazi = malzeme(RENK.altin);
const matAyak = malzeme(RENK.altin);
let SON = null;

function kur() {
  const P = oku();
  const gen = P.W + 4, yuk = P.Hk + 4;
  const plaka = (c) => {
    c.beginPath();
    c.roundRect(-P.W / 2, -P.Hk / 2, P.W, P.Hk, Math.min(5, P.Hk * 0.12));
    c.fill();
  };
  const kart = maske(gen, yuk, P.px, plaka);
  const cerceveG = 1.6;
  const pay = (P.cerceve ? cerceveG : 0) + 2.4;

  // Yerleşim: motif solda, yazı sağında. Ayaklı kartta altın
  // yuva derinliği kadarı ayağın içinde kalır; içerik görünen alana.
  const altSinir = -P.Hk / 2 + (P.ayak ? AYAK.yuva + 1.2 : pay);
  const ustSinir = P.Hk / 2 - pay;
  const gH = ustSinir - altSinir, gY = (ustSinir + altSinir) / 2;
  const motifVar = P.motif !== "yok" && MOTIF[P.motif];
  const m = Math.min(P.Hk * 0.62, gH * 0.92);
  const mx = -P.W / 2 + pay + 1 + m / 2;
  const yx0 = motifVar ? mx + m / 2 + 3 : -P.W / 2 + pay + 1;
  const yx1 = P.W / 2 - pay - 1;
  const yw = yx1 - yx0, ycx = (yx0 + yx1) / 2;
  let harf = Infinity;
  const yaziM = maske(gen, yuk, P.px, (c) => {
    if (motifVar) {
      c.save();
      c.translate(mx, gY);
      c.scale(m, m);
      MOTIF[P.motif](c);
      c.restore();
    }
    if (P.alt) {
      harf = Math.min(harf, yazi(c, P, P.isim, ycx, gY + gH * 0.17, yw, gH * 0.52));
      harf = Math.min(harf, yazi(c, P, P.alt, ycx, gY - gH * 0.3, yw * 0.85, gH * 0.24));
    } else {
      harf = Math.min(harf, yazi(c, P, P.isim, ycx, gY, yw, gH * 0.7));
    }
  });
  const ic = asindir(maske(gen, yuk, P.px, plaka), pay);
  maskeBirlestir(yaziM, ic, "destination-in");
  if (P.cerceve) {
    const bant = maske(gen, yuk, P.px, plaka);
    maskeBirlestir(bant, asindir(maske(gen, yuk, P.px, plaka), cerceveG), "destination-out");
    maskeBirlestir(yaziM, bant, "lighter");
  }
  const gKart = maskedenKati(kart, P.T, 0);
  const gYazi = maskeDoluMu(yaziM) ? maskedenKati(yaziM, P.h, P.T) : null;

  // Ayak: yan profil (y, z), X boyunca çekilir
  let gAyak = null;
  const L = Math.max(40, P.W * 0.6);
  const s = P.T + P.bosluk;
  if (P.ayak) {
    const d = AYAK.derin / 2, Hs = AYAK.yuk, p = AYAK.pah;
    const sh = new THREE.Shape([
      new THREE.Vector2(-d, 0), new THREE.Vector2(d, 0), new THREE.Vector2(d, Hs - p), new THREE.Vector2(d - p, Hs),
      new THREE.Vector2(s / 2 + 0.6, Hs), new THREE.Vector2(s / 2, Hs - 0.6), new THREE.Vector2(s / 2, Hs - AYAK.yuva),
      new THREE.Vector2(-s / 2, Hs - AYAK.yuva), new THREE.Vector2(-s / 2, Hs - 0.6), new THREE.Vector2(-s / 2 - 0.6, Hs),
      new THREE.Vector2(-d + p, Hs), new THREE.Vector2(-d, Hs - p),
    ]);
    gAyak = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false });
    // (x_s, y_s, z_s) → (z_s − L/2, x_s, y_s): profil YZ düzleminde, X boyunca
    gAyak.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, -L / 2, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
    gAyak.computeVertexNormals();
  }

  matKart.color.setHex(RENK[P.renkKart] ?? RENK.yesil);
  matYazi.color.setHex(RENK[P.renkYazi] ?? RENK.altin);
  matAyak.color.setHex(RENK[P.renkAyak] ?? RENK.altin);
  const aglar = [];
  const yerlestir = (g) => {
    const k = g.clone();
    if (P.ayak) {
      k.rotateX(Math.PI / 2); // plaka dik: yazı −Y'ye bakar
      k.translate(0, P.T / 2, AYAK.yuk - AYAK.yuva + 0.2 + P.Hk / 2);
    }
    return k;
  };
  aglar.push(ag(yerlestir(gKart), matKart, "kart"));
  if (gYazi) aglar.push(ag(yerlestir(gYazi), matYazi, "yazi"));
  if (gAyak) aglar.push(ag(gAyak.clone(), matAyak, "ayak"));
  S_.modeliYaz(aglar);

  const v = hacim(gKart) + hacim(gYazi) + hacim(gAyak);
  const kutleG = (v / 1000) * PLA;
  const sureSaat = v / 7 / 3600 + 0.2 + (gYazi ? 0.08 : 0);
  const boyut = S_.kutu.getSize(new THREE.Vector3());
  SON = { P, gKart, gYazi, gAyak, v, olcum: { kutleG, sureSaat }, boyut, harf, L };
  bilgiYaz();
  if (!S_.elleOynandi) S_.ortala();
  window.__ADJY_SK = {
    hazir: true,
    olcum: SON.olcum,
    olcu: `Kart ${P.W} × ${P.Hk} mm${P.ayak ? " · ayaklı" : ""}`,
  };
}

function bilgiYaz() {
  const { P, olcum: o, v, harf, L } = SON;
  el("sk-olcu").textContent = `Kart ${P.W} × ${P.Hk} mm${P.ayak ? ` · ayak ${L.toFixed(0)} mm` : ""}`;
  const u = el("sk-uyari");
  const uyar = Number.isFinite(harf) && harf < 4.5 ? "Yazı küçük kaldı: kartı büyütün ya da yazıyı kısaltın" : "";
  u.hidden = !uyar;
  u.textContent = uyar;
  el("sk-renk-ayak-satir").hidden = !P.ayak;
  tabloYaz(el("sk-tablo"), [
    ["Kart", `${P.W} × ${P.Hk} × ${P.T} mm`],
    ["Yazı", `${P.h} mm kabartma · en küçük harf ${Number.isFinite(harf) ? harf.toFixed(1) : "—"} mm`],
    ["Renk değişimi", SON.gYazi ? `Z = ${P.T.toFixed(2)} mm (${Math.round(P.T / 0.2) + 1}. katman)` : "yok"],
    ["Ayak", P.ayak ? `${L.toFixed(0)} × ${AYAK.derin} × ${AYAK.yuk} mm · yuva ${(P.T + P.bosluk).toFixed(2)} mm` : "yok"],
    ["Hacim", `${(v / 1000).toFixed(1)} cm³`],
    ["Filament (PLA)", `${o.kutleG.toFixed(1)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
  ]);
}

function onEk() {
  const P = SON.P;
  return `SOFRA_KARTI_${P.motif}_${dosyaAdi(P.isim || "isimsiz")}_${P.W}x${P.Hk}`;
}
el("sk-stl-kart").addEventListener("click", () => {
  if (!SON) return;
  indir(stl([SON.gKart], onEk()), `${onEk()}_1_kart_${SON.P.renkKart}.stl`, "model/stl");
});
el("sk-stl-yazi").addEventListener("click", () => {
  if (!SON || !SON.gYazi) return;
  indir(stl([SON.gYazi], onEk()), `${onEk()}_2_yazi_${SON.P.renkYazi}.stl`, "model/stl");
});
el("sk-stl-ayak").addEventListener("click", () => {
  if (!SON || !SON.gAyak) return;
  indir(stl([SON.gAyak], onEk()), `${onEk()}_3_ayak_${SON.P.renkAyak}.stl`, "model/stl");
});
el("sk-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, olcum: o } = SON;
  indir(csv([
    ["Alan", "Deger"], ["Isim", P.isim], ["Alt_satir", P.alt], ["Motif", P.motif], ["Kart_mm", `${P.W} x ${P.Hk} x ${P.T}`],
    ["Ayak", P.ayak ? "evet" : "hayir"], ["Yuva_mm", (P.T + P.bosluk).toFixed(2)], ["Renk_kart", P.renkKart],
    ["Renk_yazi", P.renkYazi], ["Renk_ayak", P.renkAyak], ["Kutle_g_PLA", o.kutleG.toFixed(1)], ["Sure_sa", o.sureSaat.toFixed(2)],
  ]), `${onEk()}_bilgi.csv`, "text/csv;charset=utf-8");
});

const HAZIR = {
  klasik: { "sk-motif": "agac", "sk-yazi-tipi": "elyazisi", "sk-renk-kart": "yesil", "sk-renk-yazi": "altin", "sk-renk-ayak": "altin", "sk-alt": "Mutlu Yıllar" },
  yildizli: { "sk-motif": "yildiz", "sk-yazi-tipi": "modern", "sk-renk-kart": "siyah", "sk-renk-yazi": "altin", "sk-renk-ayak": "siyah", "sk-alt": "2027" },
  kar: { "sk-motif": "kar", "sk-yazi-tipi": "yuvarlak", "sk-renk-kart": "beyaz", "sk-renk-yazi": "mavi", "sk-renk-ayak": "beyaz", "sk-alt": "Hoş geldin" },
  can: { "sk-motif": "can", "sk-yazi-tipi": "elyazisi", "sk-renk-kart": "kirmizi", "sk-renk-yazi": "beyaz", "sk-renk-ayak": "beyaz", "sk-alt": "Mutlu Yıllar" },
};
document.querySelectorAll("[data-hazir]").forEach((b) => {
  b.addEventListener("click", () => {
    alanlariYaz(HAZIR[b.dataset.hazir] || {});
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.toggle("on", x === b));
  });
});
function sayac() {
  const s = el("sk-isim-sayac");
  if (s) s.textContent = `${el("sk-isim").value.length}/14`;
}
formBagla((t) => {
  if (t && t.id === "sk-isim") sayac();
  if (t && ["sk-gen", "sk-yuk", "sk-ayak"].includes(t.id)) S_.elleOynandi = false;
  S_.yenile?.();
});
sayac();
S_.dongu(kur);
if (document.fonts) {
  const yukle = Object.values(YAZI_TIPI).map((t) => document.fonts.load(`${t.agirlik} 40px ${t.aile}`, "ĞğŞşİıÖöÜüÇç2027"));
  Promise.allSettled(yukle).then(() => S_.yenile?.());
  document.fonts.addEventListener?.("loadingdone", () => S_.yenile?.());
}
