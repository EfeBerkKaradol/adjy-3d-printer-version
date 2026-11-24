/* ==========================================================================
   İSİMLİ YILBAŞI ÇELENGİ

   Kapı ve duvar çelengi; dört renk, hepsi tablaya yatık:
     yaprak → taban (yapraklı halka + şeridin ve fiyongun altı + askı
              halkası, T kalınlık) ve üstünde damarlı kabartma yapraklar (+1)
     meyve  → kokina salkımları (+2, basamaklı kubbe) ve fiyonk (+1,6)
     şerit  → çelengin ortasından geçen kırlangıç uçlu isim şeridi (+0,8)
     yazı   → şeridin üstünde isim (+1)

   Taban tek parça: şerit ve fiyonk onun üstüne oturur, çelenk sağlam
   kalır. Renkler üst üste binmez (her biri diğerinin alanından kesilir).
   Desteksiz.
   ========================================================================== */
import {
  THREE, el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, maske, maskeBirlestir, maskeDoluMu, asindir,
  maskedenKati, hacim, olcum, stl, indir, dosyaAdi, csv, formBagla, alanlariYaz, tabloYaz, sureYaz,
  pahliKati, maskeCiz, maskeKopya, genislet, yaziSigdir, yuvarlakKutu, yaziTipleriniBekle, rastgele,
} from "../../_adjy/arac-ortak.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

const RENK = {
  yesil: 0x1f6b3a, koyuyesil: 0x12432a, beyaz: 0xf3f1ea, gumus: 0xb9bcc2, kirmizi: 0xc4202b,
  altin: 0xd2a347, lacivert: 0x1d2a52, krem: 0xece4cd, siyah: 0x25262a,
};
const YAZI_TIPI = {
  elyazisi: { aile: '"Pacifico"', agirlik: 400 },
  yuvarlak: { aile: '"Baloo 2"', agirlik: 800 },
  modern: { aile: '"Geist"', agirlik: 800 },
};

function oku() {
  return {
    serit: el("yc-serit").checked,
    isim: el("yc-isim").value.trim(),
    tip: el("yc-tip").value,
    D: clamp(sayi("yc-cap", 140), 90, 200),
    yaprak: Math.round(clamp(sayi("yc-yaprak", 22), 14, 36)),
    meyve: Math.round(clamp(sayi("yc-meyve", 6), 0, 9)),
    fiyonk: el("yc-fiyonk").value,
    aski: el("yc-aski").checked,
    renkYaprak: el("yc-renk-yaprak").value,
    renkMeyve: el("yc-renk-meyve").value,
    renkSerit: el("yc-renk-serit").value,
    renkYazi: el("yc-renk-yazi").value,
    T: clamp(sayi("yc-kalin", 2.4), 1.6, 4),
    px: clamp(sayi("yc-px", 6), 4, 8),
  };
}

/** Sivri uçlu yaprak: merkez (x, y), eksen açısı a, boy L, en w. damar: yalnız orta çizgi */
function yaprakCiz(c, x, y, a, L, w, damar) {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  c.beginPath();
  if (damar) {
    c.moveTo(-L * 0.42, 0);
    c.lineTo(L * 0.42, 0);
    c.stroke();
  } else {
    c.moveTo(-L / 2, 0);
    c.quadraticCurveTo(0, w, L / 2, 0);
    c.quadraticCurveTo(0, -w, -L / 2, 0);
    c.closePath();
    c.fill();
  }
  c.restore();
}

/** Fiyonk: merkez (0, y0), boy s. delik=true: yalnız ilmek boşlukları */
function fiyonkCiz(c, y0, s, delik) {
  c.save();
  c.translate(0, y0);
  for (const yon of [1, -1]) {
    c.save();
    c.scale(yon, 1);
    c.beginPath();
    if (delik) {
      c.moveTo(s * 0.3, 0);
      c.bezierCurveTo(s * 0.5, s * 0.26, s * 0.78, s * 0.22, s * 0.76, 0);
      c.bezierCurveTo(s * 0.78, -s * 0.22, s * 0.5, -s * 0.26, s * 0.3, 0);
    } else {
      c.moveTo(0, 0);
      c.bezierCurveTo(s * 0.45, s * 0.6, s * 1.08, s * 0.5, s * 1.0, 0);
      c.bezierCurveTo(s * 1.08, -s * 0.5, s * 0.45, -s * 0.6, 0, 0);
      // Kuyruk: kırlangıç uçlu
      c.moveTo(0, 0);
      c.lineTo(s * 0.24, -s * 0.04);
      c.lineTo(s * 0.7, -s * 0.82);
      c.lineTo(s * 0.5, -s * 0.74);
      c.lineTo(s * 0.4, -s * 0.95);
      c.lineTo(-s * 0.02, -s * 0.12);
    }
    c.closePath();
    c.fill();
    c.restore();
  }
  if (!delik) {
    c.beginPath();
    yuvarlakKutu(c, -s * 0.17, -s * 0.19, s * 0.34, s * 0.38, s * 0.1);
    c.fill();
  }
  c.restore();
}

/** Kırlangıç uçlu şerit */
function seritCiz(c, w, h) {
  const k = h * 0.32;
  c.beginPath();
  c.moveTo(-w / 2, h / 2);
  c.lineTo(w / 2, h / 2);
  c.lineTo(w / 2 - k, 0);
  c.lineTo(w / 2, -h / 2);
  c.lineTo(-w / 2, -h / 2);
  c.lineTo(-w / 2 + k, 0);
  c.closePath();
  c.fill();
}

// ---------------------------------------------------------------- KUR
const S_ = sahneKur({ tuval: el("yc-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.08, -0.55, 0.95);
const mat = { yaprak: malzeme(RENK.yesil), meyve: malzeme(RENK.kirmizi, { roughness: 0.35 }), serit: malzeme(RENK.krem), yazi: malzeme(RENK.kirmizi) };
let SON = null;

function kur() {
  const P = oku();
  const R = P.D / 2, px = P.px;
  const gen = P.D + 8, yuk = P.D + 30;
  const rc = R * 0.74, hw = R * 0.2; // halkanın orta yarıçapı ve yarı eni
  const n = P.yaprak;
  const L = ((Math.PI * 2 * rc) / n) * 2.0, w = L * 0.5;
  const fy = P.fiyonk === "yok" ? null : (P.fiyonk === "alt" ? -rc : rc);
  const fs = R * 0.36;
  const sw = 2 * (rc + hw * 0.35), sh = clamp(R * 0.36, 16, 34);
  const halka = { y: R + 2.4, dis: 5.5, ic: 2.2 };

  const yapraklar = (c) => {
    c.beginPath();
    c.arc(0, 0, rc + hw * 0.6, 0, Math.PI * 2);
    c.arc(0, 0, rc - hw * 0.6, 0, Math.PI * 2, true);
    c.fill("evenodd");
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      yaprakCiz(c, (rc + hw * 0.5) * ca, (rc + hw * 0.5) * sa, a + Math.PI / 2 - 0.62, L, w);
      yaprakCiz(c, (rc - hw * 0.5) * ca, (rc - hw * 0.5) * sa, a + Math.PI / 2 + 0.62, L * 0.9, w * 0.9);
    }
  };

  // Şerit ve yazı
  const serit = maske(gen, yuk, px, (c) => { if (P.serit) seritCiz(c, sw, sh); });
  let harfBoyu = 0;
  const yazi = maske(gen, yuk, px, (c) => {
    if (P.serit && P.isim) harfBoyu = yaziSigdir(c, P.isim, [0, 0, sw - sh * 1.1, sh * 0.6], YAZI_TIPI[P.tip], 0.5);
  });
  if (P.serit) maskeBirlestir(yazi, asindir(maskeKopya(serit), 1.2), "destination-in");

  // Fiyonk
  const fiyonk = maske(gen, yuk, px, (c) => { if (fy !== null) fiyonkCiz(c, fy, fs, false); });
  const fiyonkDolu = maskeKopya(fiyonk);
  if (fy !== null) maskeCiz(fiyonk, (c) => fiyonkCiz(c, fy, fs, true), "destination-out");
  maskeBirlestir(fiyonk, genislet(maskeKopya(serit), 0.6), "destination-out");

  // Taban: yapraklı halka + şerit + fiyonk + askı
  const taban = maske(gen, yuk, px, (c) => {
    yapraklar(c);
    if (P.aski) {
      c.beginPath();
      c.arc(0, halka.y, halka.dis, 0, Math.PI * 2);
      c.fill();
      c.fillRect(-halka.dis * 0.6, R - hw * 0.5, halka.dis * 1.2, halka.y - R + hw * 0.5);
    }
  });
  maskeBirlestir(taban, serit, "source-over");
  maskeBirlestir(taban, fiyonkDolu, "source-over");
  if (P.aski) maskeCiz(taban, (c) => { c.beginPath(); c.arc(0, halka.y, halka.ic, 0, Math.PI * 2); c.fill(); }, "destination-out");

  const seritCevresi = genislet(maskeKopya(serit), 0.7);
  const fiyonkCevresi = genislet(maskeKopya(fiyonkDolu), 0.7);

  // Kokina salkımları: halkanın üstünde, fiyonktan ve şeritten uzak
  const Rr = rastgele(P.meyve * 17 + n);
  const mr = clamp(R * 0.058, 2.2, 4.6);
  const meyve = maske(gen, yuk, px, (c) => {
    c.beginPath();
    for (let i = 0; i < P.meyve; i++) {
      const a = Math.PI / 2 + ((i + 0.5) / P.meyve) * Math.PI * 2;
      const r = rc + (Rr() - 0.5) * hw * 0.5;
      const mx = r * Math.cos(a), my = r * Math.sin(a);
      const d = Rr() * Math.PI * 2;
      for (let k = 0; k < 3; k++) {
        const x = mx + mr * 1.05 * Math.cos(d + (k * Math.PI * 2) / 3), y = my + mr * 1.05 * Math.sin(d + (k * Math.PI * 2) / 3);
        c.moveTo(x + mr, y);
        c.arc(x, y, mr, 0, Math.PI * 2);
      }
    }
    c.fill();
  });
  maskeBirlestir(meyve, asindir(maskeKopya(taban), 0.8), "destination-in");
  maskeBirlestir(meyve, seritCevresi, "destination-out");
  maskeBirlestir(meyve, fiyonkCevresi, "destination-out");

  // Kabartma yapraklar: taban yapraklarının arasında, damarlı
  const ust = maske(gen, yuk, px, (c) => {
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * Math.PI * 2;
      yaprakCiz(c, rc * Math.cos(a), rc * Math.sin(a), a + Math.PI / 2 + (i % 2 ? 0.35 : -0.35), L * 0.86, w * 0.8);
    }
  });
  maskeCiz(ust, (c) => {
    c.lineWidth = 0.7;
    c.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * Math.PI * 2;
      yaprakCiz(c, rc * Math.cos(a), rc * Math.sin(a), a + Math.PI / 2 + (i % 2 ? 0.35 : -0.35), L * 0.86, w * 0.8, true);
    }
  }, "destination-out");
  maskeBirlestir(ust, asindir(maskeKopya(taban), 0.6), "destination-in");
  maskeBirlestir(ust, genislet(maskeKopya(meyve), 0.6), "destination-out");
  maskeBirlestir(ust, seritCevresi, "destination-out");
  maskeBirlestir(ust, fiyonkCevresi, "destination-out");

  const gTaban = maskedenKati(taban, P.T, 0);
  const gUst = maskeDoluMu(ust) ? pahliKati(ust, 1.0, P.T, 0.3, 2) : null;
  const gMeyve = maskeDoluMu(meyve) ? pahliKati(meyve, 2.0, P.T, Math.min(1.1, mr * 0.45), 5) : null;
  const gFiyonk = maskeDoluMu(fiyonk) ? pahliKati(fiyonk, 1.6, P.T, 0.4, 2) : null;
  const gSerit = maskeDoluMu(serit) ? maskedenKati(serit, 0.8, P.T) : null;
  const gYazi = maskeDoluMu(yazi) ? pahliKati(yazi, 1.0, P.T + 0.8, 0.3, 2) : null;

  mat.yaprak.color.setHex(RENK[P.renkYaprak] ?? RENK.yesil);
  mat.meyve.color.setHex(RENK[P.renkMeyve] ?? RENK.kirmizi);
  mat.serit.color.setHex(RENK[P.renkSerit] ?? RENK.krem);
  mat.yazi.color.setHex(RENK[P.renkYazi] ?? RENK.kirmizi);
  const aglar = [ag(gTaban, mat.yaprak, "taban")];
  if (gUst) aglar.push(ag(gUst, mat.yaprak, "yapraklar"));
  if (gMeyve) aglar.push(ag(gMeyve, mat.meyve, "kokina"));
  if (gFiyonk) aglar.push(ag(gFiyonk, mat.meyve, "fiyonk"));
  if (gSerit) aglar.push(ag(gSerit, mat.serit, "serit"));
  if (gYazi) aglar.push(ag(gYazi, mat.yazi, "yazi"));
  S_.modeliYaz(aglar);

  const v = {
    yaprak: hacim(gTaban) + hacim(gUst), meyve: hacim(gMeyve) + hacim(gFiyonk), serit: hacim(gSerit), yazi: hacim(gYazi),
  };
  const renkSayisi = new Set([P.renkYaprak, (gMeyve || gFiyonk) && P.renkMeyve, gSerit && P.renkSerit, gYazi && P.renkYazi].filter(Boolean)).size;
  const o = olcum(v.yaprak + v.meyve + v.serit + v.yazi, renkSayisi - 1);
  const boyut = S_.kutu.getSize(new THREE.Vector3());
  SON = { P, gTaban, gUst, gMeyve, gFiyonk, gSerit, gYazi, v, olcum: o, renkSayisi, boyut, harfBoyu };

  bilgiYaz();
  if (!S_.elleOynandi) S_.ortala();
  window.__ADJY_YC = {
    hazir: true,
    olcum: o,
    olcu: `${boyut.x.toFixed(0)} × ${boyut.y.toFixed(0)} × ${boyut.z.toFixed(1)} mm`,
  };
}

function bilgiYaz() {
  const { P, v, olcum: o, renkSayisi, boyut, harfBoyu } = SON;
  el("yc-olcu").textContent = `Ø${P.D} mm`;
  for (const id of ["yc-isim-satir", "yc-tip-satir", "yc-renk-serit-satir", "yc-renk-yazi-satir"]) el(id).hidden = !P.serit;
  el("yc-renk-meyve-satir").hidden = !SON.gMeyve && !SON.gFiyonk;
  const uyarilar = [];
  if (P.serit && !P.isim) uyarilar.push("İsim boş: şerit yazısız basılır");
  else if (P.serit && harfBoyu && harfBoyu < 5) uyarilar.push("Yazı çok küçük kaldı: ismi kısaltın ya da çelengi büyütün");
  const u = el("yc-uyari");
  u.hidden = !uyarilar.length;
  u.textContent = uyarilar.join(" · ");
  el("yc-stl-meyve").hidden = !SON.gMeyve && !SON.gFiyonk;
  el("yc-stl-serit").hidden = !SON.gSerit;
  el("yc-stl-yazi").hidden = !SON.gYazi;
  tabloYaz(el("yc-tablo"), [
    ["Dış ölçü", `${boyut.x.toFixed(1)} × ${boyut.y.toFixed(1)} × ${boyut.z.toFixed(1)} mm`],
    ["Renk", `${renkSayisi} filament`],
    ["Taban + yapraklar", `${(v.yaprak / 1000).toFixed(1)} cm³`],
    ["Kokina + fiyonk", `${(v.meyve / 1000).toFixed(1)} cm³`],
    ["Şerit + yazı", `${((v.serit + v.yazi) / 1000).toFixed(1)} cm³${harfBoyu ? ` · harf ${harfBoyu.toFixed(0)} mm` : ""}`],
    ["Filament (PLA)", `${o.kutleG.toFixed(0)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
  ]);
}

function onEk() {
  const P = SON.P;
  return `CELENK_${dosyaAdi(P.serit && P.isim ? P.isim : "sade")}_D${P.D}`;
}
for (const [id, al, ad] of [
  ["yc-stl-yaprak", (s) => [s.gTaban, s.gUst], "yaprak"], ["yc-stl-meyve", (s) => [s.gMeyve, s.gFiyonk], "kokina_fiyonk"],
  ["yc-stl-serit", (s) => [s.gSerit], "serit"], ["yc-stl-yazi", (s) => [s.gYazi], "yazi"],
]) {
  el(id).addEventListener("click", () => {
    if (!SON) return;
    const l = al(SON).filter(Boolean);
    if (l.length) indir(stl(l, ad), `${onEk()}_${ad}.stl`, "model/stl");
  });
}
el("yc-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, boyut, olcum: o } = SON;
  indir(csv([
    ["Alan", "Deger"], ["Isim", P.serit ? P.isim : ""], ["Yazi_tipi", P.tip], ["Cap_mm", P.D], ["Yaprak", P.yaprak], ["Kokina_salkimi", P.meyve],
    ["Fiyonk", P.fiyonk], ["Aski", P.aski ? "evet" : "hayir"], ["Taban_mm", P.T], ["Renk_yaprak", P.renkYaprak], ["Renk_meyve", P.renkMeyve],
    ["Renk_serit", P.renkSerit], ["Renk_yazi", P.renkYazi], ["Olcu_mm", `${boyut.x.toFixed(1)} x ${boyut.y.toFixed(1)} x ${boyut.z.toFixed(1)}`],
    ["Kutle_g_PLA", o.kutleG.toFixed(0)], ["Sure_sa", o.sureSaat.toFixed(2)],
  ]), `${onEk()}_bilgi.csv`, "text/csv;charset=utf-8");
});

const HAZIR = {
  klasik: { "yc-serit": true, "yc-tip": "elyazisi", "yc-yaprak": 22, "yc-meyve": 6, "yc-fiyonk": "alt", "yc-renk-yaprak": "yesil", "yc-renk-meyve": "kirmizi", "yc-renk-serit": "krem", "yc-renk-yazi": "kirmizi" },
  altin: { "yc-serit": true, "yc-tip": "yuvarlak", "yc-yaprak": 26, "yc-meyve": 8, "yc-fiyonk": "alt", "yc-renk-yaprak": "koyuyesil", "yc-renk-meyve": "altin", "yc-renk-serit": "krem", "yc-renk-yazi": "yesil" },
  kar: { "yc-serit": true, "yc-tip": "modern", "yc-yaprak": 20, "yc-meyve": 5, "yc-fiyonk": "ust", "yc-renk-yaprak": "beyaz", "yc-renk-meyve": "lacivert", "yc-renk-serit": "kirmizi", "yc-renk-yazi": "beyaz" },
  sade: { "yc-serit": false, "yc-yaprak": 24, "yc-meyve": 7, "yc-fiyonk": "ust", "yc-renk-yaprak": "yesil", "yc-renk-meyve": "kirmizi" },
};
document.querySelectorAll("[data-hazir]").forEach((b) => {
  b.addEventListener("click", () => {
    alanlariYaz(HAZIR[b.dataset.hazir] || {});
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.toggle("on", x === b));
    S_.elleOynandi = false;
  });
});

function sayac() {
  el("yc-isim-sayac").textContent = `${el("yc-isim").value.length}/16`;
}
formBagla((t) => {
  if (t && t.id === "yc-isim") sayac();
  if (t && ["yc-cap", "yc-aski"].includes(t.id)) S_.elleOynandi = false;
  S_.yenile?.();
});
sayac();
S_.dongu(kur);
yaziTipleriniBekle(YAZI_TIPI, () => S_.yenile?.());
