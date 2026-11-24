/* ==========================================================================
   KAHRAMAN AMBLEMİ

   Çizgi roman kalkanı; üç parça, üç renk, hepsi tablaya yatık:
     zemin   → biçim (daire, kalkan, altıgen, elmas) + askı halkası, T kalınlık
     ikinci  → bordür (+1,2), iç kontur çizgisi, patlama yıldızı (+0,8) ve
               aşağı doğru büyüyen baskı noktaları (+0,5)
     simge   → baş harf, yıldırım ya da taç (+kabartma), patlamanın üstünde

   Renkler üst üste binmez: simge patlamadan, patlama noktalardan kesilir;
   aralarında zemin renginde kontur kalır (çizgi roman mürekkebi gibi).
   Desteksiz; bordür ve simgenin üst kenarı basamaklı pahlı.
   ========================================================================== */
import {
  el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, maske, maskeBirlestir, maskeDoluMu, asindir,
  maskedenKati, hacim, olcum, stl, indir, dosyaAdi, csv, formBagla, alanlariYaz, tabloYaz, sureYaz,
  pahliKati, maskeCiz, maskeKopya, genislet, yaziSigdir, cokgen, yaziTipleriniBekle,
} from "../../_adjy/arac-ortak.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

const RENK = {
  kirmizi: 0xc4202b, lacivert: 0x1d2a52, mavi: 0x2a6fdb, siyah: 0x1b1b1f, yesil: 0x1f7a3d,
  mor: 0x5b2d8e, beyaz: 0xf3f1ea, sari: 0xf5c518, gumus: 0xb9bcc2,
};
const YAZI_TIPI = {
  cizgi: { aile: '"Bangers"', agirlik: 400 },
  blok: { aile: '"Bungee"', agirlik: 400 },
};
// Birim genişlikte (1) biçimler; ust/alt: dikey sınırlar, orta: içeriğin merkezi, ic: patlamanın sığdığı yarıçap
const SEKIL = {
  daire: { ad: "Daire", ust: 0.5, alt: -0.5, orta: 0, ic: 0.36, yol: (c) => c.arc(0, 0, 0.5, 0, Math.PI * 2) },
  kalkan: {
    ad: "Kalkan", ust: 0.56, alt: -0.64, orta: 0.06, ic: 0.33,
    yol(c) {
      c.moveTo(-0.5, 0.56);
      c.lineTo(0.5, 0.56);
      c.lineTo(0.5, 0.12);
      c.bezierCurveTo(0.5, -0.26, 0.26, -0.5, 0, -0.64);
      c.bezierCurveTo(-0.26, -0.5, -0.5, -0.26, -0.5, 0.12);
      c.closePath();
    },
  },
  altigen: { ad: "Altıgen", ust: 0.5774, alt: -0.5774, orta: 0, ic: 0.34, yol: (c) => cokgen(c, 6, 0.5774, Math.PI / 2) },
  elmas: {
    ad: "Elmas", ust: 0.62, alt: -0.62, orta: 0, ic: 0.27,
    yol(c) { c.moveTo(0, 0.62); c.lineTo(0.5, 0); c.lineTo(0, -0.62); c.lineTo(-0.5, 0); c.closePath(); },
  },
};
const YILDIRIM = [[0.12, 0.5], [-0.28, -0.07], [-0.03, -0.07], [-0.14, -0.5], [0.28, 0.09], [0.03, 0.09]];
const TAC = [[-0.5, -0.32], [0.5, -0.32], [0.5, 0.3], [0.25, -0.02], [0, 0.38], [-0.25, -0.02], [-0.5, 0.3]];

function oku() {
  return {
    sekil: el("ka-sekil").value,
    D: clamp(sayi("ka-boyut", 90), 50, 160),
    aski: el("ka-aski").checked,
    simge: el("ka-simge").value,
    harf: el("ka-harf").value.trim().toLocaleUpperCase("tr-TR"),
    tip: el("ka-tip").value,
    patlama: el("ka-patlama").checked,
    dis: Math.round(clamp(sayi("ka-dis", 14), 8, 22)),
    nokta: el("ka-nokta").checked,
    bordur: clamp(sayi("ka-bordur", 4), 2, 8),
    renkZemin: el("ka-renk-zemin").value,
    renkIkinci: el("ka-renk-ikinci").value,
    renkSimge: el("ka-renk-simge").value,
    T: clamp(sayi("ka-kalin", 2.4), 1.6, 4),
    kab: clamp(sayi("ka-kabartma", 1.6), 0.8, 3),
    px: clamp(sayi("ka-px", 8), 5, 10),
  };
}

function sekilCiz(c, P, S) {
  c.save();
  c.scale(P.D, P.D);
  c.beginPath();
  S.yol(c);
  c.restore();
  c.fill();
}
function cokgenCiz(c, noktalar, olcek, cx, cy) {
  c.beginPath();
  noktalar.forEach(([x, y], i) => (i ? c.lineTo(cx + x * olcek, cy + y * olcek) : c.moveTo(cx + x * olcek, cy + y * olcek)));
  c.closePath();
  c.fill();
}

// ---------------------------------------------------------------- KUR
const S_ = sahneKur({ tuval: el("ka-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.08, -0.55, 0.95);
const mat = { zemin: malzeme(RENK.kirmizi), ikinci: malzeme(RENK.sari), simge: malzeme(RENK.beyaz) };
let SON = null;

function kur() {
  const P = oku();
  const S = SEKIL[P.sekil] ?? SEKIL.daire;
  const D = P.D, px = P.px;
  const gen = D + 4, yuk = D * 1.3 + 20;
  const cy = S.orta * D;
  const halka = { y: S.ust * D + 2.2, dis: 5.5, ic: 2.2 };
  const sekil = () => maske(gen, yuk, px, (c) => sekilCiz(c, P, S));

  const zemin = maske(gen, yuk, px, (c) => {
    sekilCiz(c, P, S);
    if (P.aski) { c.beginPath(); c.arc(0, halka.y, halka.dis, 0, Math.PI * 2); c.fill(); }
  });
  if (P.aski) maskeCiz(zemin, (c) => { c.beginPath(); c.arc(0, halka.y, halka.ic, 0, Math.PI * 2); c.fill(); }, "destination-out");

  // Simge
  let harfBoyu = 0;
  const kutuBoy = S.ic * D * 1.25;
  const simge = maske(gen, yuk, px, (c) => {
    if (P.simge === "harf") harfBoyu = yaziSigdir(c, P.harf, [0, cy, kutuBoy * 1.05, kutuBoy], YAZI_TIPI[P.tip], 0.7);
    else if (P.simge === "yildirim") cokgenCiz(c, YILDIRIM, kutuBoy * 1.15, 0, cy);
    else cokgenCiz(c, TAC, kutuBoy * 0.95, 0, cy);
  });
  maskeBirlestir(simge, asindir(sekil(), P.bordur + 1.2), "destination-in");
  const simgeCevresi = genislet(maskeKopya(simge), 1.0);

  // Patlama yıldızı: dişleri düzensiz (elle çizilmiş gibi)
  const patlama = maske(gen, yuk, px, (c) => {
    if (!P.patlama) return;
    const R1 = S.ic * D, R2 = R1 * 0.7;
    c.beginPath();
    for (let i = 0; i < P.dis * 2; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / P.dis;
      const r = i % 2 ? R2 : R1 * (0.9 + 0.1 * Math.sin(i * 2.7 + 1));
      i ? c.lineTo(r * Math.cos(a), cy + r * Math.sin(a)) : c.moveTo(r * Math.cos(a), cy + r * Math.sin(a));
    }
    c.closePath();
    c.fill();
  });
  maskeBirlestir(patlama, asindir(sekil(), P.bordur + 1.2), "destination-in");
  maskeBirlestir(patlama, simgeCevresi, "destination-out");

  // Bordür + iç kontur çizgisi
  const bordur = sekil();
  maskeBirlestir(bordur, asindir(sekil(), P.bordur), "destination-out");
  const cizgi = asindir(sekil(), P.bordur + 1.3);
  maskeBirlestir(cizgi, asindir(sekil(), P.bordur + 2.3), "destination-out");
  maskeBirlestir(cizgi, genislet(maskeKopya(patlama), 0.8), "destination-out");
  maskeBirlestir(cizgi, simgeCevresi, "destination-out");

  // Baskı noktaları: altıgen ızgara, aşağı doğru büyür
  const nokta = maske(gen, yuk, px, (c) => {
    if (!P.nokta) return;
    const adim = clamp(D * 0.05, 3.2, 6);
    const y0 = S.alt * D, y1 = S.ust * D;
    c.beginPath();
    let satir = 0;
    for (let y = y0; y <= y1; y += adim * 0.866, satir++) {
      const t = (y - y0) / (y1 - y0);
      const r = adim * 0.4 * (1 - t * 1.15);
      if (r < 0.65) continue;
      for (let x = -D / 2 + (satir % 2 ? adim / 2 : 0); x <= D / 2; x += adim) {
        c.moveTo(x + r, y);
        c.arc(x, y, r, 0, Math.PI * 2);
      }
    }
    c.fill();
  });
  maskeBirlestir(nokta, asindir(sekil(), P.bordur + 3.4), "destination-in");
  maskeBirlestir(nokta, genislet(maskeKopya(patlama), 1.0), "destination-out");
  maskeBirlestir(nokta, simgeCevresi, "destination-out");

  const gZemin = maskedenKati(zemin, P.T, 0);
  const gIkinci = [];
  const ekle = (m, h, pah) => { if (maskeDoluMu(m)) { const g = pah ? pahliKati(m, h, P.T, pah, 2) : maskedenKati(m, h, P.T); if (g) gIkinci.push(g); } };
  ekle(bordur, 1.2, 0.4);
  ekle(cizgi, 0.8, 0);
  ekle(patlama, 0.8, 0);
  ekle(nokta, 0.5, 0);
  const gSimge = maskeDoluMu(simge) ? pahliKati(simge, P.kab, P.T, Math.min(0.4, P.kab * 0.4), 2) : null;

  mat.zemin.color.setHex(RENK[P.renkZemin] ?? RENK.kirmizi);
  mat.ikinci.color.setHex(RENK[P.renkIkinci] ?? RENK.sari);
  mat.simge.color.setHex(RENK[P.renkSimge] ?? RENK.beyaz);
  const aglar = [ag(gZemin, mat.zemin, "govde")];
  gIkinci.forEach((g, i) => aglar.push(ag(g, mat.ikinci, `ikinci-${i + 1}`)));
  if (gSimge) aglar.push(ag(gSimge, mat.simge, "simge"));
  S_.modeliYaz(aglar);

  const v = { zemin: hacim(gZemin), ikinci: gIkinci.reduce((s, g) => s + hacim(g), 0), simge: hacim(gSimge) };
  const renkSayisi = new Set([P.renkZemin, gIkinci.length && P.renkIkinci, gSimge && P.renkSimge].filter(Boolean)).size;
  const o = olcum(v.zemin + v.ikinci + v.simge, renkSayisi - 1);
  const Hmm = (S.ust - S.alt) * D + (P.aski ? halka.dis + 2.2 : 0);
  SON = { P, S, gZemin, gIkinci, gSimge, v, olcum: o, renkSayisi, harfBoyu, Hmm };

  bilgiYaz();
  if (!S_.elleOynandi) S_.ortala();
  window.__ADJY_KA = {
    hazir: true,
    olcum: o,
    olcu: `${D} × ${Hmm.toFixed(0)} × ${(P.T + Math.max(P.kab, 1.2)).toFixed(1)} mm`,
  };
}

function bilgiYaz() {
  const { P, S, v, olcum: o, renkSayisi, Hmm } = SON;
  el("ka-olcu").textContent = `${P.D} × ${Hmm.toFixed(0)} mm`;
  el("ka-harf-satir").hidden = P.simge !== "harf";
  el("ka-tip-satir").hidden = P.simge !== "harf";
  el("ka-dis-satir").hidden = !P.patlama;
  const uyarilar = [];
  if (P.simge === "harf" && !P.harf) uyarilar.push("Harf boş: amblem simgesiz basılır");
  if (P.renkSimge === P.renkIkinci && P.patlama) uyarilar.push("Simge ile patlama aynı renkte: simge yalnız kabartmasıyla seçilir");
  const u = el("ka-uyari");
  u.hidden = !uyarilar.length;
  u.textContent = uyarilar.join(" · ");
  el("ka-stl-simge").hidden = !SON.gSimge;
  tabloYaz(el("ka-tablo"), [
    ["Dış ölçü", `${P.D} × ${Hmm.toFixed(0)} × ${(P.T + Math.max(P.kab, 1.2)).toFixed(1)} mm`],
    ["Biçim", `${S.ad} · bordür ${P.bordur} mm`],
    ["Renk", `${renkSayisi} filament`],
    ["Zemin", `${(v.zemin / 1000).toFixed(1)} cm³`],
    ["Bordür + patlama", `${(v.ikinci / 1000).toFixed(1)} cm³`],
    ["Simge", `${(v.simge / 1000).toFixed(1)} cm³`],
    ["Filament (PLA)", `${o.kutleG.toFixed(0)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
  ]);
}

function onEk() {
  const P = SON.P;
  return `KAHRAMAN_${P.sekil}_${P.simge === "harf" ? dosyaAdi(P.harf || "x") : P.simge}_${P.D}mm`;
}
for (const [id, al, ad] of [
  ["ka-stl-zemin", (s) => [s.gZemin], "zemin"], ["ka-stl-ikinci", (s) => s.gIkinci, "bordur_patlama"],
  ["ka-stl-simge", (s) => (s.gSimge ? [s.gSimge] : []), "simge"],
]) {
  el(id).addEventListener("click", () => {
    if (!SON) return;
    const l = al(SON);
    if (l.length) indir(stl(l, ad), `${onEk()}_${ad}.stl`, "model/stl");
  });
}
el("ka-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, olcum: o, Hmm } = SON;
  indir(csv([
    ["Alan", "Deger"], ["Bicim", P.sekil], ["Genislik_mm", P.D], ["Yukseklik_mm", Hmm.toFixed(0)], ["Simge", P.simge],
    ["Harf", P.simge === "harf" ? P.harf : ""], ["Yazi_tipi", P.tip], ["Patlama", P.patlama ? `${P.dis} dis` : "yok"],
    ["Noktalar", P.nokta ? "evet" : "hayir"], ["Bordur_mm", P.bordur], ["Aski", P.aski ? "evet" : "hayir"],
    ["Zemin_mm", P.T], ["Kabartma_mm", P.kab], ["Renk_zemin", P.renkZemin], ["Renk_ikinci", P.renkIkinci], ["Renk_simge", P.renkSimge],
    ["Kutle_g_PLA", o.kutleG.toFixed(0)], ["Sure_sa", o.sureSaat.toFixed(2)],
  ]), `${onEk()}_bilgi.csv`, "text/csv;charset=utf-8");
});

const HAZIR = {
  simsek: { "ka-sekil": "daire", "ka-simge": "yildirim", "ka-patlama": true, "ka-dis": 14, "ka-nokta": true, "ka-bordur": 4, "ka-renk-zemin": "kirmizi", "ka-renk-ikinci": "sari", "ka-renk-simge": "beyaz" },
  harf: { "ka-sekil": "kalkan", "ka-simge": "harf", "ka-tip": "cizgi", "ka-patlama": true, "ka-dis": 12, "ka-nokta": true, "ka-bordur": 4.5, "ka-renk-zemin": "lacivert", "ka-renk-ikinci": "gumus", "ka-renk-simge": "kirmizi" },
  kral: { "ka-sekil": "altigen", "ka-simge": "tac", "ka-patlama": true, "ka-dis": 18, "ka-nokta": false, "ka-bordur": 5, "ka-renk-zemin": "mor", "ka-renk-ikinci": "sari", "ka-renk-simge": "beyaz" },
  gece: { "ka-sekil": "elmas", "ka-simge": "harf", "ka-tip": "blok", "ka-patlama": false, "ka-nokta": true, "ka-bordur": 3.5, "ka-renk-zemin": "siyah", "ka-renk-ikinci": "sari", "ka-renk-simge": "beyaz" },
};
document.querySelectorAll("[data-hazir]").forEach((b) => {
  b.addEventListener("click", () => {
    alanlariYaz(HAZIR[b.dataset.hazir] || {});
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.toggle("on", x === b));
    S_.elleOynandi = false;
  });
});

formBagla((t) => {
  if (t && ["ka-boyut", "ka-sekil", "ka-aski"].includes(t.id)) S_.elleOynandi = false;
  S_.yenile?.();
});
S_.dongu(kur);
yaziTipleriniBekle(YAZI_TIPI, () => S_.yenile?.());
