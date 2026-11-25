/* ==========================================================================
   FOTOĞRAF DUVAR PANOSU

   Fotoğraf 2–4 filament rengine ayrılır; ince, hafif bir pano olarak
   basılır. Tablaya sığmayan genişlikte 2 ya da 3 panele bölünür
   (fotoğraf panellerin üstünden kesintisiz geçer).
     pano   → her panel ayrı nesne: renk katı + tek renk gövde, isteğe
              bağlı kenarlık. Fotoğraf yüzü tablaya basılır.
     kasnak → arka yüzde çevre kaburgası: panoyu burulmaya karşı tutar,
              duvardan 2,4 mm önde durdurur; üst kaburgadaki çentikler
              çiviye ya da vida başına oturur (delik, yapıştırma yok).
     ayak   → tek panelde masa için iki eğik yarıklı ayak.
   ========================================================================== */
import {
  el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, maske, asindir, hacim, olcum, stl, indir, dosyaAdi, csv,
  formBagla, alanlariYaz, tabloYaz, sureYaz, maskeKopya, yuvarlakKutu, maskeBirlestir, maskeCiz, maskedenKati,
} from "../../_adjy/arac-ortak.js";
import {
  FILAMENT_AD, fotoModeli, inceEtiket, alfaOku, etiketKatisi, yuzAsagi, egikAyak, gecikmeli, yuvaDugmeleriniBoya,
} from "../../_adjy/foto-ortak.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

const ORNEK = {
  portre: "../_adjy/ornek-foto/portre.jpg", sehir: "../_adjy/ornek-foto/sehir.jpg", dag: "../_adjy/ornek-foto/dag.jpg",
  gunbatimi: "../_adjy/ornek-foto/gunbatimi.jpg", balon: "../_adjy/ornek-foto/balon.jpg", cicek: "../_adjy/ornek-foto/cicek.jpg",
};
const ORAN = { yatay: [4, 3], dikey: [3, 4], kare: [1, 1], genis: [2, 1] };
const EN_BUYUK = 240; // bir panelin tablaya sığan en uzun kenarı
const ARALIK = 8; // önizlemede paneller arası (duvardaki boşluk)
const KASNAK = { ic: 5, en: 3.2, yuk: 2.4 }; // kenardan içeride, kaburga eni ve yüksekliği

/** Arka kasnak: çevre kaburgası, geniş panelde orta dikme; üstte çivi çentikleri. z ∈ [−yuk, 0] */
function kasnakKur(pw, H, kose, px) {
  const K = KASNAK;
  const dis = (c) => { c.beginPath(); yuvarlakKutu(c, -pw / 2 + K.ic, -H / 2 + K.ic, pw - 2 * K.ic, H - 2 * K.ic, Math.max(1, kose - K.ic)); c.fill(); };
  const ic = (c) => { c.beginPath(); yuvarlakKutu(c, -pw / 2 + K.ic + K.en, -H / 2 + K.ic + K.en, pw - 2 * (K.ic + K.en), H - 2 * (K.ic + K.en), Math.max(0.6, kose - K.ic - K.en)); c.fill(); };
  const m = maske(pw, H, px, dis);
  maskeCiz(m, ic, "destination-out");
  // Orta dikme: 150 mm'den geniş panel ortadan da desteklenir
  if (pw >= 150) maskeCiz(m, (c) => c.fillRect(-K.en / 2, -H / 2 + K.ic, K.en, H - 2 * K.ic));
  // Çivi çentikleri: üst kaburgada, ortada ve iki yanda (V biçimli, çivi kendini ortalar)
  const y = H / 2 - K.ic;
  maskeCiz(m, (c) => {
    for (const x of pw >= 150 ? [-pw * 0.28, pw * 0.28] : [0]) {
      c.beginPath();
      c.moveTo(x - 3.2, y - K.en - 0.2);
      c.lineTo(x, y - 0.9);
      c.lineTo(x + 3.2, y - K.en - 0.2);
      c.closePath();
      c.fill();
    }
  }, "destination-out");
  return maskedenKati(m, K.yuk, -K.yuk);
}

function oku() {
  const [ox, oy] = ORAN[el("fp-oran").value] || ORAN.yatay;
  const n = Math.round(clamp(sayi("fp-bolme", 1), 1, 3));
  let W = clamp(sayi("fp-gen", 200), 100, EN_BUYUK * n);
  let H = (W * oy) / ox;
  if (H > EN_BUYUK) { H = EN_BUYUK; W = (H * ox) / oy; }
  W = Math.round(W);
  H = Math.round(H);
  return {
    W, H, n, pw: W / n,
    kose: clamp(sayi("fp-kose", 4), 0, 12),
    kenarlik: clamp(sayi("fp-kenarlik", 3), 0, 8),
    renkKenarlik: Math.round(clamp(sayi("fp-renk-kenarlik", 1), 1, 4)) - 1,
    govde: Math.round(clamp(sayi("fp-govde", 1), 1, 4)) - 1,
    ayak: el("fp-asma").value === "ayak" && n === 1,
    kasnak: el("fp-asma").value === "civi",
    T: clamp(sayi("fp-kalin", 2), 1.6, 3),
    tc: clamp(sayi("fp-renk-kat", 0.8), 0.4, 1.2),
    px: clamp(sayi("fp-px", 5), 4, 6),
  };
}

const S_ = sahneKur({ tuval: el("fp-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.06, -0.42, 0.95);
const mat = [0, 1, 2, 3].map(() => malzeme(0x888888));
const matAyak = malzeme(0x888888);
let SON = null;
const yenile = gecikmeli(() => S_.yenile?.(), 120);
const FOTO = fotoModeli("fp", yenile, ORNEK);

function kur() {
  if (!FOTO.hazir) return;
  const P = oku();
  const R = FOTO.etiketle(P.W, P.H, 0.5);
  if (P.govde >= R.n) P.govde = 0;
  if (P.renkKenarlik >= R.n) P.renkKenarlik = 0;

  const paneller = [];
  for (let p = 0; p < P.n; p++) {
    // Panelin kaba ızgaradaki dilimi
    const c0 = Math.round((p * R.cw) / P.n), c1 = Math.round(((p + 1) * R.cw) / P.n);
    const scw = c1 - c0;
    const alt = new Uint8Array(scw * R.ch);
    for (let y = 0; y < R.ch; y++) alt.set(R.et.subarray(y * R.cw + c0, y * R.cw + c1), y * scw);

    const dis = (c) => { c.beginPath(); yuvarlakKutu(c, -P.pw / 2, -P.H / 2, P.pw, P.H, Math.max(0.4, P.kose)); c.fill(); };
    const tut = maske(P.pw, P.H, P.px, dis);
    const alfa = alfaOku(tut);
    const ince = inceEtiket(alt, scw, R.ch, P.pw, P.H, tut.w, tut.h, P.px);
    if (P.kenarlik > 0) {
      const ic = alfaOku(asindir(maskeKopya(tut), P.kenarlik));
      for (let i = 0; i < ince.length; i++) if (ic[i] < 128) ince[i] = P.renkKenarlik;
    }
    const geo = [];
    for (let k = 0; k < R.n; k++) geo.push(etiketKatisi(ince, tut.w, tut.h, P.px, alfa, k, P.tc, P.T - P.tc));
    const govde = etiketKatisi(ince, tut.w, tut.h, P.px, alfa, -1, P.T - P.tc, 0);
    const kasnak = P.kasnak ? kasnakKur(P.pw, P.H, P.kose, P.px) : null;
    geo[P.govde] = mergeGeometries([geo[P.govde], govde, kasnak].filter(Boolean), false);
    geo[P.govde].computeVertexNormals();
    paneller.push(geo);
  }

  let A = null;
  if (P.ayak) {
    const a = egikAyak({ boy: 24, yarik: P.T + 0.35, egim: 12, levha: P.H });
    const sag = a.geo.clone();
    a.geo.translate(-P.W * 0.27, 0, 0);
    sag.translate(P.W * 0.27, 0, 0);
    const geo = mergeGeometries([a.geo, sag], false);
    geo.computeVertexNormals();
    A = { geo, derinlik: a.derinlik };
  }

  const aglar = [];
  const toplamGen = P.W + (P.n - 1) * ARALIK;
  paneller.forEach((geo, p) => {
    const x = -toplamGen / 2 + P.pw / 2 + p * (P.pw + ARALIK);
    geo.forEach((g, k) => {
      if (!g) return;
      mat[k].color.set(R.hex[k]);
      const m = ag(g, mat[k], `p${p + 1}r${k + 1}`);
      m.position.x = x;
      if (P.kasnak) m.position.z = KASNAK.yuk; // kasnak arkada: pano zeminden o kadar yukarıda durur
      aglar.push(m);
    });
  });
  if (A) {
    matAyak.color.set(R.hex[P.govde]);
    const m = ag(A.geo, matAyak, "ayak");
    m.position.y = -P.H / 2 - 10 - A.derinlik / 2;
    aglar.push(m);
  }
  S_.modeliYaz(aglar);

  const vRenk = new Array(R.n).fill(0);
  paneller.forEach((geo) => geo.forEach((g, k) => (vRenk[k] += hacim(g))));
  const vAyak = A ? hacim(A.geo) : 0;
  const katman = Math.round(P.tc / 0.2);
  const o = olcum(vRenk.reduce((a, b) => a + b, 0) + vAyak, 0);
  o.sureSaat += (P.n * katman * (R.n - 1) * 1.6) / 60;
  SON = { P, R, paneller, A, vRenk, vAyak, olcum: o };

  bilgiYaz();
  if (!S_.elleOynandi) S_.ortala();
  window.__ADJY_FP = {
    hazir: true,
    olcum: o,
    olcu: P.n > 1 ? `${P.W} × ${P.H} mm · ${P.n} panel (her biri ${P.pw.toFixed(0)} mm)` : `${P.W} × ${P.H} mm`,
    renkler: R.slot.map((k) => FILAMENT_AD[k]).join(", "),
    enUzun: Math.max(P.pw, P.H),
  };
}

function bilgiYaz() {
  const { P, R, A, vRenk, vAyak, olcum: o } = SON;
  el("fp-olcu").textContent = P.n > 1 ? `${P.W} × ${P.H} mm · ${P.n} panel` : `${P.W} × ${P.H} mm`;
  for (let i = 1; i <= 4; i++) el(`fp-renk-${i}-satir`).hidden = i > R.n;
  el("fp-renk-kenarlik-satir").hidden = !(P.kenarlik > 0);
  for (const on of ["fp-govde", "fp-renk-kenarlik"]) yuvaDugmeleriniBoya(on, R.hex);
  const uyarilar = [];
  const istenen = sayi("fp-gen", 200);
  if (Math.abs(istenen - P.W) > 1) uyarilar.push(`Genişlik ${P.W} mm'ye çekildi: bir panel en çok ${EN_BUYUK} mm`);
  if (el("fp-asma").value === "ayak" && P.n > 1) uyarilar.push("Masa ayağı yalnız tek panelde");
  if (!FOTO.kullanici) uyarilar.push("Örnek fotoğraf: kendi fotoğrafınızı yükleyin");
  const u = el("fp-uyari");
  u.hidden = !uyarilar.length;
  u.textContent = uyarilar.join(" · ");
  for (let p = 1; p <= 3; p++) for (let k = 1; k <= 4; k++) el(`fp-stl-p${p}-r${k}`).hidden = !(SON.paneller[p - 1] && SON.paneller[p - 1][k - 1]);
  el("fp-stl-ayak").hidden = !A;
  tabloYaz(el("fp-tablo"), [
    ["Pano", `${P.W} × ${P.H} × ${P.T.toFixed(1)} mm`],
    ["Panel", P.n > 1 ? `${P.n} × ${P.pw.toFixed(0)} × ${P.H} mm` : "tek parça"],
    ["Renkler", R.slot.map((k, i) => `${i + 1} ${FILAMENT_AD[k]} %${Math.round(R.pay[i] * 100)}`).join(" · ")],
    ["Gövde", `${P.govde + 1} ${FILAMENT_AD[R.slot[P.govde]]}`],
    ["Renk katı", `${P.tc.toFixed(1)} mm · ${Math.round(P.tc / 0.2)} katman · panel başı ≈ ${Math.round(P.tc / 0.2) * (R.n - 1)} değişim`],
    ["Hacim", `${(vRenk.reduce((a, b) => a + b, 0) / 1000).toFixed(1)} cm³`],
    ["Arka kasnak", P.kasnak ? `${KASNAK.en} × ${KASNAK.yuk} mm kaburga, çivi çentikli` : "yok"],
    ["Ayak", A ? `2 adet · ${(vAyak / 1000).toFixed(1)} cm³` : "yok"],
    ["Filament (PLA)", `${o.kutleG.toFixed(0)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
  ]);
}

function onEk() {
  const P = SON.P;
  return `DUVAR_PANOSU_${P.W}x${P.H}`;
}
for (let p = 1; p <= 3; p++) {
  for (let k = 1; k <= 4; k++) {
    el(`fp-stl-p${p}-r${k}`).addEventListener("click", () => {
      const g = SON && SON.paneller[p - 1] && SON.paneller[p - 1][k - 1];
      if (!g) return;
      indir(stl([yuzAsagi(g, SON.P.T)], `p${p}r${k}`), `${onEk()}_panel${p}_renk${k}_${dosyaAdi(FILAMENT_AD[SON.R.slot[k - 1]])}.stl`, "model/stl");
    });
  }
}
el("fp-stl-ayak").addEventListener("click", () => {
  if (SON && SON.A) indir(stl([SON.A.geo], "ayak"), `${onEk()}_ayak.stl`, "model/stl");
});
el("fp-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, R, olcum: o } = SON;
  indir(csv([
    ["Alan", "Deger"], ["Pano_mm", `${P.W}x${P.H}x${P.T}`], ["Panel", P.n], ["Panel_genisligi_mm", P.pw.toFixed(1)],
    ["Kose_mm", P.kose], ["Kenarlik_mm", P.kenarlik], ["Renk_kati_mm", P.tc],
    ...R.slot.map((k, i) => [`Renk_${i + 1}`, `${FILAMENT_AD[k]} ${R.hex[i]} %${Math.round(R.pay[i] * 100)}`]),
    ["Govde_rengi", P.govde + 1], ["Asma", P.ayak ? "masa ayagi" : P.kasnak ? "civi / vida: arka kasnagin ust centikleri" : "cift tarafli bant"],
    ["Baski_yonu", "Fotograf yuzu tablada; paneller soldan saga 1, 2, 3"],
    ["Kutle_g_PLA", o.kutleG.toFixed(0)], ["Sure_sa", o.sureSaat.toFixed(2)],
  ]), `${onEk()}_bilgi.csv`, "text/csv;charset=utf-8");
});

// Hazır panolar fotoğrafa dokunmaz: yalnız biçim, bölme ve renk düzeni
const HAZIR = {
  tek: { "fp-oran": "yatay", "fp-gen": 200, "fp-bolme": "1", "fp-kose": 4, "fp-kenarlik": 3, "fp-asma": "civi", "fp-mod": "renkli", "fp-renk-sayi": 4 },
  triptik: { "fp-oran": "genis", "fp-gen": 450, "fp-bolme": "3", "fp-kose": 2, "fp-kenarlik": 0, "fp-asma": "civi", "fp-mod": "renkli", "fp-renk-sayi": 4 },
  kare: { "fp-oran": "kare", "fp-gen": 180, "fp-bolme": "1", "fp-kose": 8, "fp-kenarlik": 4, "fp-asma": "bant", "fp-mod": "sb", "fp-renk-sayi": 4 },
  masa: { "fp-oran": "dikey", "fp-gen": 130, "fp-bolme": "1", "fp-kose": 6, "fp-kenarlik": 3, "fp-asma": "ayak", "fp-mod": "renkli", "fp-renk-sayi": 4 },
};
document.querySelectorAll("[data-hazir]").forEach((b) => {
  b.addEventListener("click", (e) => {
    if (e.isTrusted) FOTO.onerBekliyor = true;
    alanlariYaz(HAZIR[b.dataset.hazir] || {});
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.toggle("on", x === b));
  });
});

formBagla((t) => {
  if (t && ["fp-oran", "fp-gen", "fp-bolme", "fp-asma"].includes(t.id)) S_.elleOynandi = false;
  yenile();
});
S_.dongu(kur);
window.__ADJY_FP_ONER = () => { FOTO.onerBekliyor = true; yenile(); };
window.__ADJY_SAHNE_MODEL = () => S_.model;
