/* ==========================================================================
   NEON SAHİL İSİMLİK

   Gün batımı tabelası; dört parça, dört renk, hepsi tablaya yatık:
     zemin    → köşeleri yuvarlak levha, T kalınlık
     güneş    → yazının arkasında doğan şeritli güneş (+0,8 mm)
     palmiye  → kenarlarda palmiye silüetleri (+1,2 mm)
     yazı     → isim, alt satır ve neon çerçeve (+kabartma)
   Ayrıca masa ayağı: eğik yarıklı takoz, tabela içine oturur.

   Her şey 2B tuvale çizilir, dış hatları çıkarılıp ekstrüde edilir
   (bkz. ../_adjy/arac-ortak.js). Renkler üst üste binmez: yazı güneşten
   ve palmiyeden, palmiye güneşten kesilir; aralarında zemin rengi ince
   bir kontur kalır. Desteksiz; üst kenarlar basamaklı pahlı.
   ========================================================================== */
import {
  THREE, el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, maske, maskeBirlestir, maskeDoluMu, asindir,
  maskedenKati, hacim, olcum, stl, indir, dosyaAdi, csv, formBagla, alanlariYaz, tabloYaz, sureYaz,
  pahliKati, maskeCiz, maskeKopya, genislet, yaziSigdir, yuvarlakKutu, yaziTipleriniBekle,
} from "../../_adjy/arac-ortak.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

const RENK = {
  gece: 0x161a2e, siyah: 0x1b1b1f, mor: 0x4a2a7a, beyaz: 0xf3f1ea, turuncu: 0xff7a2f,
  sari: 0xffd23f, mercan: 0xff5e62, pembe: 0xff4fa3, turkuaz: 0x21c8c2,
};
const YAZI_TIPI = {
  elyazisi: { aile: '"Pacifico"', agirlik: 400 },
  blok: { aile: '"Bungee"', agirlik: 400 },
  retro: { aile: '"Righteous"', agirlik: 400 },
};
const KOSE = 6; // zemin köşe yarıçapı
const AYAK = { derin: 24, yuk: 11, egim: 12 }; // masa ayağı kesiti (mm, derece)

function oku() {
  return {
    isim: el("ns-isim").value.trim(),
    alt: el("ns-alt").value.trim(),
    tip: el("ns-tip").value,
    gunes: el("ns-gunes").checked,
    serit: Math.round(clamp(sayi("ns-serit", 5), 2, 7)),
    palmiye: el("ns-palmiye").value,
    cerceve: el("ns-cerceve").checked,
    W: clamp(sayi("ns-gen", 160), 100, 220),
    H: clamp(sayi("ns-yuk", 80), 50, 120),
    durus: el("ns-durus").value,
    renkZemin: el("ns-renk-zemin").value,
    renkGunes: el("ns-renk-gunes").value,
    renkPalmiye: el("ns-renk-palmiye").value,
    renkYazi: el("ns-renk-yazi").value,
    T: clamp(sayi("ns-kalin", 2.4), 1.6, 4),
    kab: clamp(sayi("ns-kabartma", 1.6), 0.8, 3),
    px: clamp(sayi("ns-px", 7), 5, 10),
  };
}

/** Duvar delikleri: üst köşelerde iki vida deliği */
function delikler(P) {
  if (P.durus !== "delik") return [];
  const x = P.W / 2 - 9, y = P.H / 2 - 9;
  return [[-x, y], [x, y]];
}

/** Şeritli güneş: alt yarıda aşağı doğru kalınlaşan boşluklar */
function gunesCiz(c, P) {
  const R = P.H * 0.45;
  const cy = -P.H * 0.14;
  c.beginPath();
  c.arc(0, cy, R, 0, Math.PI * 2);
  c.fill();
  c.save();
  c.globalCompositeOperation = "destination-out";
  for (let i = 0; i < P.serit; i++) {
    const t = (i + 0.5) / P.serit;
    const y = cy + R * 0.12 - R * 1.1 * t;
    const kalin = Math.max(1.0, R * (0.035 + 0.075 * t));
    c.fillRect(-R - 1, y - kalin / 2, 2 * R + 2, kalin);
  }
  c.restore();
}

/** Palmiye silüeti: eğri gövde + yedi yaprak. yon: gövdenin eğildiği taraf (±1) */
function palmiyeCiz(c, x0, y0, h, yon) {
  const egim = 0.2 * h * yon;
  const ux = x0 + egim, uy = y0 + h * 0.7;
  const wA = Math.max(1.3, h * 0.04), wU = Math.max(0.8, h * 0.02);
  c.beginPath();
  c.moveTo(x0 - wA, y0);
  c.quadraticCurveTo(x0 - wA + egim * 0.15, y0 + h * 0.42, ux - wU, uy);
  c.lineTo(ux + wU, uy);
  c.quadraticCurveTo(x0 + wA + egim * 0.15, y0 + h * 0.42, x0 + wA, y0);
  c.closePath();
  c.fill();
  const n = 7;
  c.lineJoin = "round";
  c.lineWidth = 0.6;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.04 + (0.92 * i) / (n - 1));
    const L = h * (0.36 + 0.05 * Math.sin(i * 2.3 + 1));
    const kx = Math.cos(a), ky = Math.sin(a) * 0.62;
    const sark = L * 0.5 * Math.abs(kx);
    const tx = ux + kx * L, ty = uy + ky * L - sark;
    const cx1 = ux + kx * L * 0.55, cy1 = uy + ky * L * 0.55 + L * 0.3;
    c.beginPath();
    c.moveTo(ux, uy);
    c.quadraticCurveTo(cx1, cy1, tx, ty);
    c.quadraticCurveTo(cx1, cy1 - L * 0.26, ux, uy);
    c.closePath();
    c.fill();
    c.stroke(); // ince uçlar basılabilir kalsın
  }
  // Hindistan cevizleri
  c.beginPath();
  c.arc(ux - yon * h * 0.03, uy - h * 0.035, Math.max(1, h * 0.03), 0, Math.PI * 2);
  c.arc(ux + yon * h * 0.035, uy - h * 0.05, Math.max(1, h * 0.028), 0, Math.PI * 2);
  c.fill();
}

/** Masa ayağı: eğik yarıklı takoz. Kesit (derinlik, yükseklik), boy X boyunca. */
function ayakKur(P) {
  const { derin: D, yuk: Y, egim } = AYAK;
  const s = P.T + 0.35; // yarık: zemin kalınlığı + boşluk
  const kay = Math.tan((egim * Math.PI) / 180) * (Y - 3);
  const u0 = D * 0.42;
  const sek = new THREE.Shape();
  sek.moveTo(0, 0);
  sek.lineTo(D, 0);
  sek.lineTo(D, 3);
  sek.lineTo(D - 3, Y);
  sek.lineTo(u0 + s + kay, Y);
  sek.lineTo(u0 + s, 3);
  sek.lineTo(u0, 3);
  sek.lineTo(u0 + kay, Y);
  sek.lineTo(3, Y);
  sek.lineTo(0, 3);
  sek.closePath();
  const boy = clamp(P.W * 0.55, 50, 110);
  const g = new THREE.ExtrudeGeometry(sek, { depth: boy, bevelEnabled: false, curveSegments: 1 });
  // (kesit x, kesit y, boy) → (Y, Z, X)
  g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  g.translate(-boy / 2, -P.H / 2 - 10 - D, 0);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- KUR
const S_ = sahneKur({ tuval: el("ns-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.1, -0.62, 0.95);
const mat = {
  zemin: malzeme(RENK.gece), gunes: malzeme(RENK.turuncu), palmiye: malzeme(RENK.siyah),
  yazi: malzeme(RENK.pembe), ayak: malzeme(RENK.gece),
};
let SON = null;

function kur() {
  const P = oku();
  const gen = P.W + 4, yuk = P.H + 4, px = P.px;
  const govdeYolu = (c) => {
    c.beginPath();
    yuvarlakKutu(c, -P.W / 2, -P.H / 2, P.W, P.H, KOSE);
    c.fill();
  };
  const dl = delikler(P);
  const delikKes = (m, r) => {
    if (dl.length) maskeCiz(m, (c) => { c.beginPath(); for (const [x, y] of dl) { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); } c.fill(); }, "destination-out");
    return m;
  };

  const zemin = delikKes(maske(gen, yuk, px, govdeYolu), 2.2);
  // Süslerin durabileceği alan: kenardan (ve çerçeveden) içeride
  const icAlan = delikKes(asindir(maske(gen, yuk, px, govdeYolu), P.cerceve ? 3.4 : 1.6), 4.2);

  // Yazı
  let harfBoyu = Infinity;
  const tip = YAZI_TIPI[P.tip];
  const yazi = maske(gen, yuk, px, (c) => {
    const tek = !P.alt;
    if (P.isim) harfBoyu = Math.min(harfBoyu, yaziSigdir(c, P.isim, [0, tek ? 0 : P.H * 0.08, P.W * 0.74, P.H * (tek ? 0.5 : 0.42)], tip, 0.5));
    if (P.alt) harfBoyu = Math.min(harfBoyu, yaziSigdir(c, P.alt, [0, -P.H * 0.31, P.W * 0.6, P.H * 0.12], YAZI_TIPI.retro, 0.4));
  });
  maskeBirlestir(yazi, icAlan, "destination-in");
  const yaziCevresi = genislet(maskeKopya(yazi), 0.9);

  // Palmiyeler
  const palmiye = maske(gen, yuk, px, (c) => {
    const h = P.H * 0.86;
    const x = P.W / 2 - Math.max(12, P.H * 0.2);
    if (P.palmiye === "sol" || P.palmiye === "iki") palmiyeCiz(c, -x, -P.H / 2, h, 1);
    if (P.palmiye === "sag" || P.palmiye === "iki") palmiyeCiz(c, x, -P.H / 2, h * 0.92, -1);
  });
  maskeBirlestir(palmiye, icAlan, "destination-in");
  maskeBirlestir(palmiye, yaziCevresi, "destination-out");

  // Güneş
  const gunes = maske(gen, yuk, px, (c) => { if (P.gunes) gunesCiz(c, P); });
  maskeBirlestir(gunes, icAlan, "destination-in");
  maskeBirlestir(gunes, yaziCevresi, "destination-out");
  maskeBirlestir(gunes, genislet(maskeKopya(palmiye), 0.5), "destination-out");

  // Neon çerçeve: yazı renginde, kenar boyunca
  if (P.cerceve) {
    const bant = asindir(maske(gen, yuk, px, govdeYolu), 0.8);
    maskeBirlestir(bant, asindir(maske(gen, yuk, px, govdeYolu), 2.4), "destination-out");
    maskeBirlestir(yazi, delikKes(bant, 4.2), "lighter");
  }

  const gZemin = pahliKati(zemin, P.T, 0, P.cerceve ? 0 : 0.6, 3);
  const gGunes = maskeDoluMu(gunes) ? maskedenKati(gunes, 0.8, P.T) : null;
  const gPalmiye = maskeDoluMu(palmiye) ? pahliKati(palmiye, 1.2, P.T, 0.3, 2) : null;
  const gYazi = maskeDoluMu(yazi) ? pahliKati(yazi, P.kab, P.T, Math.min(0.4, P.kab * 0.4), 2) : null;
  const gAyak = P.durus === "ayak" ? ayakKur(P) : null;

  mat.zemin.color.setHex(RENK[P.renkZemin] ?? RENK.gece);
  mat.ayak.color.setHex(RENK[P.renkZemin] ?? RENK.gece);
  mat.gunes.color.setHex(RENK[P.renkGunes] ?? RENK.turuncu);
  mat.palmiye.color.setHex(RENK[P.renkPalmiye] ?? RENK.siyah);
  mat.yazi.color.setHex(RENK[P.renkYazi] ?? RENK.pembe);
  const aglar = [ag(gZemin, mat.zemin, "levha")];
  if (gGunes) aglar.push(ag(gGunes, mat.gunes, "gunes"));
  if (gPalmiye) aglar.push(ag(gPalmiye, mat.palmiye, "palmiye"));
  if (gYazi) aglar.push(ag(gYazi, mat.yazi, "yazi"));
  if (gAyak) aglar.push(ag(gAyak, mat.ayak, "ayak"));
  S_.modeliYaz(aglar);

  const v = { zemin: hacim(gZemin), gunes: hacim(gGunes), palmiye: hacim(gPalmiye), yazi: hacim(gYazi), ayak: hacim(gAyak) };
  const renkSayisi = new Set([P.renkZemin, gGunes && P.renkGunes, gPalmiye && P.renkPalmiye, gYazi && P.renkYazi].filter(Boolean)).size;
  const o = olcum(v.zemin + v.gunes + v.palmiye + v.yazi + v.ayak, renkSayisi - 1);
  SON = { P, gZemin, gGunes, gPalmiye, gYazi, gAyak, v, olcum: o, renkSayisi, harfBoyu: Number.isFinite(harfBoyu) ? harfBoyu : 0 };

  bilgiYaz();
  if (!S_.elleOynandi) S_.ortala();
  window.__ADJY_NS = {
    hazir: true,
    olcum: o,
    olcu: `${P.W} × ${P.H} × ${(P.T + P.kab).toFixed(1)} mm`,
  };
}

function bilgiYaz() {
  const { P, v, olcum: o, renkSayisi, harfBoyu } = SON;
  el("ns-olcu").textContent = `${P.W} × ${P.H} mm`;
  el("ns-serit-satir").hidden = !P.gunes;
  el("ns-renk-gunes-satir").hidden = !P.gunes;
  el("ns-renk-palmiye-satir").hidden = P.palmiye === "yok";
  const uyarilar = [];
  if (!P.isim && !P.alt) uyarilar.push("Yazı boş: tabela yalnız sahneyle basılır");
  else if (harfBoyu && harfBoyu < 5) uyarilar.push("Yazı çok küçük kaldı: kısaltın ya da tabelayı büyütün");
  const u = el("ns-uyari");
  u.hidden = !uyarilar.length;
  u.textContent = uyarilar.join(" · ");
  for (const [id, g] of [["ns-stl-gunes", SON.gGunes], ["ns-stl-palmiye", SON.gPalmiye], ["ns-stl-yazi", SON.gYazi], ["ns-stl-ayak", SON.gAyak]]) el(id).hidden = !g;
  tabloYaz(el("ns-tablo"), [
    ["Dış ölçü", `${P.W} × ${P.H} × ${(P.T + P.kab).toFixed(1)} mm`],
    ["Renk", `${renkSayisi} filament`],
    ["Zemin", `${(v.zemin / 1000).toFixed(1)} cm³`],
    ["Güneş + palmiye", `${((v.gunes + v.palmiye) / 1000).toFixed(1)} cm³`],
    ["Yazı", `${(v.yazi / 1000).toFixed(1)} cm³ · harf ${SON.harfBoyu.toFixed(0)} mm`],
    ["Ayak", SON.gAyak ? `${(v.ayak / 1000).toFixed(1)} cm³, ${AYAK.egim}° yatık` : "yok"],
    ["Filament (PLA)", `${o.kutleG.toFixed(0)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
  ]);
}

function onEk() {
  const P = SON.P;
  return `NEON_SAHIL_${dosyaAdi(P.isim || "tabela")}_${P.W}x${P.H}`;
}
for (const [id, anahtar, ad] of [["ns-stl-zemin", "gZemin", "zemin"], ["ns-stl-gunes", "gGunes", "gunes"], ["ns-stl-palmiye", "gPalmiye", "palmiye"], ["ns-stl-yazi", "gYazi", "yazi"], ["ns-stl-ayak", "gAyak", "ayak"]]) {
  el(id).addEventListener("click", () => {
    if (!SON || !SON[anahtar]) return;
    indir(stl([SON[anahtar]], ad), `${onEk()}_${ad}.stl`, "model/stl");
  });
}
el("ns-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, olcum: o } = SON;
  indir(csv([
    ["Alan", "Deger"], ["Yazi", P.isim], ["Alt_satir", P.alt], ["Yazi_tipi", P.tip], ["Genislik_mm", P.W], ["Yukseklik_mm", P.H],
    ["Gunes", P.gunes ? `${P.serit} serit` : "yok"], ["Palmiye", P.palmiye], ["Cerceve", P.cerceve ? "evet" : "hayir"], ["Durus", P.durus],
    ["Zemin_mm", P.T], ["Kabartma_mm", P.kab], ["Renk_zemin", P.renkZemin], ["Renk_gunes", P.renkGunes],
    ["Renk_palmiye", P.renkPalmiye], ["Renk_yazi", P.renkYazi], ["Kutle_g_PLA", o.kutleG.toFixed(0)], ["Sure_sa", o.sureSaat.toFixed(2)],
  ]), `${onEk()}_bilgi.csv`, "text/csv;charset=utf-8");
});

const HAZIR = {
  gunbatimi: { "ns-tip": "elyazisi", "ns-gunes": true, "ns-serit": 5, "ns-palmiye": "iki", "ns-cerceve": true, "ns-renk-zemin": "gece", "ns-renk-gunes": "turuncu", "ns-renk-palmiye": "turkuaz", "ns-renk-yazi": "pembe" },
  gece: { "ns-tip": "retro", "ns-gunes": true, "ns-serit": 6, "ns-palmiye": "sag", "ns-cerceve": true, "ns-renk-zemin": "siyah", "ns-renk-gunes": "mor", "ns-renk-palmiye": "turkuaz", "ns-renk-yazi": "pembe" },
  sahil: { "ns-tip": "elyazisi", "ns-gunes": true, "ns-serit": 4, "ns-palmiye": "sol", "ns-cerceve": false, "ns-renk-zemin": "beyaz", "ns-renk-gunes": "sari", "ns-renk-palmiye": "turkuaz", "ns-renk-yazi": "mercan" },
  sade: { "ns-tip": "blok", "ns-gunes": false, "ns-palmiye": "iki", "ns-cerceve": true, "ns-renk-zemin": "siyah", "ns-renk-palmiye": "turkuaz", "ns-renk-yazi": "sari" },
};
document.querySelectorAll("[data-hazir]").forEach((b) => {
  b.addEventListener("click", () => {
    alanlariYaz(HAZIR[b.dataset.hazir] || {});
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.toggle("on", x === b));
  });
});

function sayac() {
  el("ns-isim-sayac").textContent = `${el("ns-isim").value.length}/14`;
}
formBagla((t) => {
  if (t && t.id === "ns-isim") sayac();
  if (t && ["ns-gen", "ns-yuk", "ns-durus"].includes(t.id)) S_.elleOynandi = false;
  S_.yenile?.();
});
sayac();
S_.dongu(kur);
yaziTipleriniBekle(YAZI_TIPI, () => S_.yenile?.());
