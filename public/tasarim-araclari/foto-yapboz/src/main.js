/* ==========================================================================
   FOTOĞRAFLI YAPBOZ

   Fotoğraf 2–4 filament rengine ayrılır, gerçek geçmeli parçalara kesilir.
     yapboz   → bütün parçalar çözülmüş dizilişte, aralarında geçme boşluğu.
                Fotoğraf yüzü tablaya basılır: renkler yalnız ilk katmanlarda
                değişir, gövde tek renk devam eder (pürüzsüz ön yüz).
     çerçeve  → parçaların oturduğu tepsi: taban + kenar, altta yazı bandı,
                kalp ya da yıldız kabartması, parmak boşluğu.
     ayak     → çerçeveyi 15° yatık tutan eğik yarıklı takoz.

   Görünüş yönünde (fotoğraf üstte) kurulur; STL baskı yönünde çıkar
   (bkz. ../_adjy/foto-ortak.js).
   ========================================================================== */
import {
  THREE, el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, maske, maskeBirlestir, maskeDoluMu, asindir,
  maskedenKati, hacim, olcum, stl, indir, dosyaAdi, csv, formBagla, alanlariYaz, tabloYaz, sureYaz,
  pahliKati, maskeCiz, maskeKopya, yaziSigdir, yuvarlakKutu, yaziTipleriniBekle,
} from "../../_adjy/arac-ortak.js";
import {
  FILAMENT_HEX, FILAMENT_AD, fotoModeli, inceEtiket, alfaOku, etiketKatisi, yuzAsagi, yapbozKes, egikAyak,
  gecikmeli, yuvaDugmeleriniBoya,
} from "../../_adjy/foto-ortak.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

const ORNEK = {
  portre: "../_adjy/ornek-foto/portre.jpg", sehir: "../_adjy/ornek-foto/sehir.jpg", dag: "../_adjy/ornek-foto/dag.jpg",
  gunbatimi: "../_adjy/ornek-foto/gunbatimi.jpg", balon: "../_adjy/ornek-foto/balon.jpg", cicek: "../_adjy/ornek-foto/cicek.jpg",
};
const YAZI_TIPI = { yazi: { aile: '"Righteous"', agirlik: 400 } };
const CERCEVE = { taban: 1.2, pay: 0.5, kenar: 9, bant: 17, ust: 0.4, kabartma: 0.8 };
const ORAN = { yatay: [4, 3], dikey: [3, 4], kare: [1, 1] };

function oku() {
  const [ox, oy] = ORAN[el("fy-oran").value] || ORAN.yatay;
  const boy = clamp(sayi("fy-boy", 180), 100, 200);
  const W = ox >= oy ? boy : Math.round((boy * ox) / oy), H = oy >= ox ? boy : Math.round((boy * oy) / ox);
  const sutun = Math.round(clamp(sayi("fy-sutun", 8), 3, Math.min(12, Math.floor(W / 10))));
  const satir = Math.round(clamp((sutun * H) / W, 2, 16));
  const cerceve = el("fy-cerceve").value;
  return {
    W, H, sutun, satir,
    tohum: Math.round(clamp(sayi("fy-tohum", 7), 1, 99)),
    cerceve,
    yazi: cerceve === "yok" ? "" : el("fy-yazi").value.trim(),
    ayak: cerceve !== "yok" && el("fy-ayak").checked,
    govde: Math.round(clamp(sayi("fy-govde", 1), 1, 4)) - 1,
    renkCerceve: Math.round(clamp(sayi("fy-renk-cerceve", 1), 1, 4)) - 1,
    renkYazi: Math.round(clamp(sayi("fy-renk-yazi", 4), 1, 4)) - 1,
    T: clamp(sayi("fy-kalin", 2.4), 2, 3.2),
    tc: clamp(sayi("fy-renk-kat", 0.8), 0.4, 1.2),
    bosluk: clamp(sayi("fy-bosluk", 0.3), 0.2, 0.5),
    px: clamp(sayi("fy-px", 5), 4, 6),
  };
}

function kalpCiz(c, x, y, s) {
  c.moveTo(x, y - s * 0.95);
  c.bezierCurveTo(x - s * 1.5, y - s * 0.05, x - s * 0.8, y + s * 1.05, x, y + s * 0.4);
  c.bezierCurveTo(x + s * 0.8, y + s * 1.05, x + s * 1.5, y - s * 0.05, x, y - s * 0.95);
  c.closePath();
}
function yildizCiz(c, x, y, s) {
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.45 : s;
    i ? c.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)) : c.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  c.closePath();
}

/** Çerçeve: taban + kenar (tek renk) ve bant kabartması (ikinci renk) */
function cerceveKur(P) {
  const C = CERCEVE;
  const bant = P.yazi || P.cerceve === "kalp" || P.cerceve === "yildiz" ? C.bant : C.kenar;
  const gen = P.W + 2 * C.pay + 2 * C.kenar, yuk = P.H + 2 * C.pay + C.kenar + bant;
  const kayY = (bant - C.kenar) / 2; // yuvanın çerçeve merkezine göre yukarı kayması
  const px = 5;
  const dis = (c) => { c.beginPath(); yuvarlakKutu(c, -gen / 2, -yuk / 2, gen, yuk, 6); c.fill(); };
  const yuva = (c) => { c.beginPath(); yuvarlakKutu(c, -P.W / 2 - C.pay, kayY - P.H / 2 - C.pay, P.W + 2 * C.pay, P.H + 2 * C.pay, 2.4); c.fill(); };
  const hKenar = P.T + C.ust;

  const taban = maske(gen + 2, yuk + 2, px, dis);
  const kenar = maske(gen + 2, yuk + 2, px, dis);
  maskeCiz(kenar, yuva, "destination-out");
  // Parmak boşluğu: sağ kenarın ortasında, parçayı kaldırmak için
  maskeCiz(kenar, (c) => { c.beginPath(); c.arc(gen / 2 - C.kenar, kayY, 8, 0, Math.PI * 2); c.fill(); }, "destination-out");

  const yb = -yuk / 2 + bant / 2;
  const sus = maske(gen + 2, yuk + 2, px, (c) => {
    if (P.yazi) yaziSigdir(c, P.yazi, [0, yb, gen * 0.6, bant * 0.5], YAZI_TIPI.yazi, 0.4);
    const ciz = P.cerceve === "kalp" ? kalpCiz : P.cerceve === "yildiz" ? yildizCiz : null;
    if (!ciz) return;
    const s = bant * 0.24;
    c.beginPath();
    if (P.yazi) {
      for (const x of [-gen * 0.42, -gen * 0.355, gen * 0.355, gen * 0.42]) ciz(c, x, yb, s);
    } else {
      const n = Math.max(5, Math.round(gen / 26) | 1);
      for (let i = 0; i < n; i++) ciz(c, -gen * 0.42 + (gen * 0.84 * i) / (n - 1), yb, i % 2 ? s * 0.72 : s);
    }
    c.fill();
  });
  maskeBirlestir(sus, asindir(maskeKopya(kenar), 1.4), "destination-in");

  const gTaban = maskedenKati(taban, C.taban, 0);
  const gKenar = pahliKati(kenar, hKenar, C.taban, 0.6, 3);
  const gSus = maskeDoluMu(sus) ? pahliKati(sus, C.kabartma, C.taban + hKenar, 0.2, 1) : null;
  const govde = mergeGeometries([gTaban, gKenar].map((g) => (g.index ? g.toNonIndexed() : g)), false);
  govde.computeVertexNormals();
  for (const g of [govde, gSus]) g?.translate(0, -kayY, 0);
  return { govde, sus: gSus, gen, yuk, kalin: C.taban + hKenar, kayY };
}

/** İki ayrı ayak: tek uzun takoz yerine az filament, geniş basış */
function ikiAyak(gen, kalin, yuk) {
  const a = egikAyak({ boy: 26, yarik: kalin + 0.35, egim: 15, levha: yuk });
  const sag = a.geo.clone();
  a.geo.translate(-gen * 0.27, 0, 0);
  sag.translate(gen * 0.27, 0, 0);
  const geo = mergeGeometries([a.geo, sag], false);
  geo.computeVertexNormals();
  return { geo, derinlik: a.derinlik, yukseklik: a.yukseklik };
}

// ---------------------------------------------------------------- KUR
const S_ = sahneKur({ tuval: el("fy-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.08, -0.5, 0.95);
const mat = [0, 1, 2, 3].map(() => malzeme(0x888888));
const matCerceve = malzeme(0x888888), matSus = malzeme(0x888888), matAyak = malzeme(0x888888);
let SON = null;
const yenile = gecikmeli(() => S_.yenile?.(), 120);
const FOTO = fotoModeli("fy", yenile, ORNEK);

function kur() {
  if (!FOTO.hazir) return;
  const P = oku();
  const R = FOTO.etiketle(P.W, P.H, 0.5);
  if (P.govde >= R.n) P.govde = 0;
  if (P.renkCerceve >= R.n) P.renkCerceve = 0;
  if (P.renkYazi >= R.n) P.renkYazi = R.n - 1;

  // Dış hat ve geçme kesimleri
  const tut = maske(P.W, P.H, P.px, (c) => { c.beginPath(); yuvarlakKutu(c, -P.W / 2, -P.H / 2, P.W, P.H, 1.6); c.fill(); });
  maskeCiz(tut, (c) => yapbozKes(c, P.W, P.H, P.sutun, P.satir, P.tohum, P.bosluk), "destination-out");
  const alfa = alfaOku(tut);
  const ince = inceEtiket(R.et, R.cw, R.ch, P.W, P.H, tut.w, tut.h, P.px);

  const renkGeo = [];
  for (let k = 0; k < R.n; k++) renkGeo.push(etiketKatisi(ince, tut.w, tut.h, P.px, alfa, k, P.tc, P.T - P.tc));
  const govde = etiketKatisi(ince, tut.w, tut.h, P.px, alfa, -1, P.T - P.tc, 0);
  renkGeo[P.govde] = renkGeo[P.govde] ? mergeGeometries([renkGeo[P.govde], govde], false) : govde;
  renkGeo[P.govde].computeVertexNormals();

  const C = P.cerceve !== "yok" ? cerceveKur(P) : null;
  const A = P.ayak && C ? ikiAyak(C.gen, C.kalin, C.yuk) : null;

  // Sahne: yapboz çerçevenin yuvasında
  const z0 = C ? CERCEVE.taban : 0;
  const aglar = [];
  renkGeo.forEach((g, k) => {
    if (!g) return;
    mat[k].color.set(R.hex[k]);
    const m = ag(g, mat[k], `renk${k + 1}`);
    m.position.z = z0;
    aglar.push(m);
  });
  if (C) {
    matCerceve.color.set(R.hex[P.renkCerceve]);
    matSus.color.set(R.hex[P.renkYazi]);
    aglar.push(ag(C.govde, matCerceve, "cerceve"));
    if (C.sus) aglar.push(ag(C.sus, matSus, "cerceveYazi"));
  }
  if (A) {
    matAyak.color.set(R.hex[P.renkCerceve]);
    const m = ag(A.geo, matAyak, "ayak");
    m.position.y = -(C.yuk / 2 + C.kayY) - 10 - A.derinlik / 2;
    aglar.push(m);
  }
  S_.modeliYaz(aglar);

  const vRenk = renkGeo.map((g) => hacim(g));
  const vCerceve = C ? hacim(C.govde) + hacim(C.sus) : 0;
  const vAyak = A ? hacim(A.geo) : 0;
  const katman = Math.round(P.tc / 0.2);
  const o = olcum(vRenk.reduce((a, b) => a + b, 0) + vCerceve + vAyak, 0);
  o.sureSaat += (katman * (R.n - 1) * 1.6) / 60; // renk değişimi ≈ 1,6 dk
  SON = { P, R, renkGeo, C, A, vRenk, vCerceve, vAyak, olcum: o };

  bilgiYaz();
  if (!S_.elleOynandi) S_.ortala();
  window.__ADJY_FY = {
    hazir: true,
    olcum: o,
    olcu: `${P.W} × ${P.H} mm · ${P.sutun * P.satir} parça`,
    renkler: R.slot.map((k) => FILAMENT_AD[k]).join(", "),
  };
}

function bilgiYaz() {
  const { P, R, C, A, vRenk, vCerceve, vAyak, olcum: o } = SON;
  const parca = P.sutun * P.satir;
  el("fy-olcu").textContent = `${P.W} × ${P.H} mm · ${parca} parça`;
  for (let i = 1; i <= 4; i++) el(`fy-renk-${i}-satir`).hidden = i > R.n;
  for (const id of ["fy-yazi-satir", "fy-renk-cerceve-satir", "fy-renk-yazi-satir", "fy-ayak-satir"]) el(id).hidden = !C;
  for (const on of ["fy-govde", "fy-renk-cerceve", "fy-renk-yazi"]) yuvaDugmeleriniBoya(on, R.hex);
  const uyarilar = [];
  const S = Math.min(P.W / P.sutun, P.H / P.satir);
  if (S < 13) uyarilar.push("Parçalar 13 mm'den küçük: geçmeler ince kalır");
  if (!FOTO.kullanici) uyarilar.push("Örnek fotoğraf: kendi fotoğrafınızı yükleyin");
  const u = el("fy-uyari");
  u.hidden = !uyarilar.length;
  u.textContent = uyarilar.join(" · ");
  for (let i = 1; i <= 4; i++) el(`fy-stl-r${i}`).hidden = !SON.renkGeo[i - 1];
  el("fy-stl-cerceve").hidden = !C;
  el("fy-stl-cerceve-yazi").hidden = !(C && C.sus);
  el("fy-stl-ayak").hidden = !A;
  tabloYaz(el("fy-tablo"), [
    ["Yapboz", `${P.W} × ${P.H} × ${P.T.toFixed(1)} mm`],
    ["Parça", `${P.sutun} × ${P.satir} = ${parca} · ≈ ${S.toFixed(0)} mm`],
    ["Renkler", R.slot.map((k, i) => `${i + 1} ${FILAMENT_AD[k]} %${Math.round(R.pay[i] * 100)}`).join(" · ")],
    ["Gövde", `${P.govde + 1} ${FILAMENT_AD[R.slot[P.govde]]}`],
    ["Renk katı", `${P.tc.toFixed(1)} mm · ${Math.round(P.tc / 0.2)} katman · ≈ ${Math.round(P.tc / 0.2) * (R.n - 1)} değişim`],
    ["Yapboz hacmi", `${(vRenk.reduce((a, b) => a + b, 0) / 1000).toFixed(1)} cm³`],
    ["Çerçeve", C ? `${C.gen.toFixed(0)} × ${C.yuk.toFixed(0)} × ${C.kalin.toFixed(1)} mm · ${(vCerceve / 1000).toFixed(1)} cm³` : "yok"],
    ["Ayak", A ? `2 adet · ${(vAyak / 1000).toFixed(1)} cm³, 15° yatık` : "yok"],
    ["Filament (PLA)", `${o.kutleG.toFixed(0)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
  ]);
}

function onEk() {
  const P = SON.P;
  return `YAPBOZ_${P.W}x${P.H}_${P.sutun * P.satir}parca`;
}
for (let i = 1; i <= 4; i++) {
  el(`fy-stl-r${i}`).addEventListener("click", () => {
    const g = SON && SON.renkGeo[i - 1];
    if (!g) return;
    indir(stl([yuzAsagi(g, SON.P.T)], `renk${i}`), `${onEk()}_renk${i}_${dosyaAdi(FILAMENT_AD[SON.R.slot[i - 1]])}.stl`, "model/stl");
  });
}
for (const [id, al, ad] of [
  ["fy-stl-cerceve", () => SON.C && SON.C.govde, "cerceve"],
  ["fy-stl-cerceve-yazi", () => SON.C && SON.C.sus, "cerceve-yazi"],
  ["fy-stl-ayak", () => SON.A && SON.A.geo, "ayak"],
]) {
  el(id).addEventListener("click", () => {
    const g = SON && al();
    if (g) indir(stl([g], ad), `${onEk()}_${ad}.stl`, "model/stl");
  });
}
el("fy-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, R, olcum: o } = SON;
  indir(csv([
    ["Alan", "Deger"], ["Yapboz_mm", `${P.W}x${P.H}x${P.T}`], ["Parca", `${P.sutun}x${P.satir}`], ["Kesim_deseni", P.tohum],
    ["Gecme_boslugu_mm", P.bosluk], ["Renk_kati_mm", P.tc],
    ...R.slot.map((k, i) => [`Renk_${i + 1}`, `${FILAMENT_AD[k]} ${R.hex[i]} %${Math.round(R.pay[i] * 100)}`]),
    ["Govde_rengi", P.govde + 1], ["Cerceve", P.cerceve], ["Cerceve_yazisi", P.yazi], ["Ayak", P.ayak ? "evet" : "hayir"],
    ["Baski_yonu", "Yapboz: fotograf yuzu tablada; cerceve ve ayak: taban tablada"],
    ["Kutle_g_PLA", o.kutleG.toFixed(0)], ["Sure_sa", o.sureSaat.toFixed(2)],
  ]), `${onEk()}_bilgi.csv`, "text/csv;charset=utf-8");
});

// Hazır yapbozlar fotoğrafa dokunmaz: yalnız biçim, parça ve çerçeve
const HAZIR = {
  aile: { "fy-mod": "renkli", "fy-renk-sayi": 4, "fy-oran": "yatay", "fy-boy": 180, "fy-sutun": 8, "fy-cerceve": "kalp", "fy-ayak": true },
  manzara: { "fy-mod": "renkli", "fy-renk-sayi": 4, "fy-oran": "yatay", "fy-boy": 200, "fy-sutun": 8, "fy-cerceve": "duz", "fy-ayak": true },
  yuz: { "fy-mod": "sb", "fy-renk-sayi": 4, "fy-oran": "kare", "fy-boy": 200, "fy-sutun": 10, "fy-cerceve": "duz", "fy-ayak": false },
  mini: { "fy-mod": "renkli", "fy-renk-sayi": 3, "fy-oran": "kare", "fy-boy": 120, "fy-sutun": 4, "fy-cerceve": "yok" },
};
document.querySelectorAll("[data-hazir]").forEach((b) => {
  b.addEventListener("click", (e) => {
    if (e.isTrusted) FOTO.onerBekliyor = true;
    alanlariYaz(HAZIR[b.dataset.hazir] || {});
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.toggle("on", x === b));
  });
});

formBagla((t) => {
  if (t && ["fy-oran", "fy-boy", "fy-cerceve", "fy-ayak"].includes(t.id)) S_.elleOynandi = false;
  yenile();
});
S_.dongu(kur);
yaziTipleriniBekle(YAZI_TIPI, yenile);
// Üretim araçları (renkli 3MF) ve sınama için
window.__ADJY_FY_ONER = () => { FOTO.onerBekliyor = true; yenile(); };
window.__ADJY_SAHNE_MODEL = () => S_.model;
