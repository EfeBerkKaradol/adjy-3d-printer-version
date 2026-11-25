/* ==========================================================================
   FOTOĞRAFLI HEDİYE KUTUSU

   Omuzlu kutu: kapak dıştan gövdeyle aynı hizada kapanır.
     gövde  → taban + dış duvar (omuza kadar) + ince boyun; isteğe bağlı
              iç bölmeler. Tabanı üstüne, desteksiz basılır. Duvar düz ya da
              yivli: yivler duvara 0,8 mm gömülüdür (dış ölçü ve kapak hizası
              değişmez), altta ve omuzun altında düz bir kuşak kalır. Taban
              kenarı iki basamak pahlıdır: ilk katman taşması kenarı bozmaz.
     kapak  → fotoğraflı üst levha (2–4 renk, çevresinde kenarlık) + boyna
              geçen etek. Fotoğraf yüzü tablaya basılır: renkler yalnız ilk
              katmanlarda değişir, etek yukarı doğru yükselir (desteksiz).

   Kapak boşluğu (etek ↔ boyun) atölyeden ayarlanır; varsayılan 0,25 mm.
   ========================================================================== */
import {
  THREE, el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, maske, asindir, hacim, olcum, stl, indir, dosyaAdi, csv,
  formBagla, alanlariYaz, tabloYaz, sureYaz, maskeKopya, yuvarlakKutu,
} from "../../_adjy/arac-ortak.js";
import {
  FILAMENT_AD, fotoModeli, inceEtiket, alfaOku, etiketKatisi, yuzAsagi, gecikmeli, yuvaDugmeleriniBoya,
} from "../../_adjy/foto-ortak.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

const ORNEK = {
  portre: "../_adjy/ornek-foto/portre.jpg", sehir: "../_adjy/ornek-foto/sehir.jpg", dag: "../_adjy/ornek-foto/dag.jpg",
  gunbatimi: "../_adjy/ornek-foto/gunbatimi.jpg", balon: "../_adjy/ornek-foto/balon.jpg", cicek: "../_adjy/ornek-foto/cicek.jpg",
};
const TABAN = 1.6;

function oku() {
  const W = clamp(sayi("fk-gen", 120), 80, 200), D = clamp(sayi("fk-der", 90), 60, 200);
  const H = clamp(sayi("fk-yuk", 50), 30, 120);
  return {
    W, D, H,
    kose: clamp(sayi("fk-kose", 10), 4, Math.min(20, Math.min(W, D) / 2 - 6)),
    bolme: el("fk-bolme").value,
    doku: el("fk-doku").value,
    kenarlik: clamp(sayi("fk-kenarlik", 4), 2, 8),
    renkKapak: Math.round(clamp(sayi("fk-renk-kapak", 1), 1, 4)) - 1,
    renkKutu: Math.round(clamp(sayi("fk-renk-kutu", 1), 1, 4)) - 1,
    acik: el("fk-acik").checked,
    duvar: clamp(sayi("fk-duvar", 1.2), 1.2, 2),
    bosluk: clamp(sayi("fk-bosluk", 0.25), 0.15, 0.4),
    Tl: clamp(sayi("fk-kapak-kal", 2), 1.6, 3),
    tc: clamp(sayi("fk-renk-kat", 0.8), 0.4, 1.2),
    px: clamp(sayi("fk-px", 5), 4, 6),
  };
}

/** Köşeleri yuvarlak dikdörtgen yolu (THREE), içe doğru "ic" kadar daraltılmış */
function kutuYolu(yol, W, D, r, ic = 0) {
  const w = W - 2 * ic, d = D - 2 * ic, rr = Math.max(0.6, r - ic);
  const x = -w / 2, y = -d / 2;
  yol.moveTo(x + rr, y);
  yol.lineTo(x + w - rr, y);
  yol.absarc(x + w - rr, y + rr, rr, -Math.PI / 2, 0, false);
  yol.lineTo(x + w, y + d - rr);
  yol.absarc(x + w - rr, y + d - rr, rr, 0, Math.PI / 2, false);
  yol.lineTo(x + rr, y + d);
  yol.absarc(x + rr, y + d - rr, rr, Math.PI / 2, Math.PI, false);
  yol.lineTo(x, y + rr);
  yol.absarc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5, false);
  return yol;
}
/** dis içe "a" kadar, delik içe "b" kadar (b verilmezse dolu) → z0'dan h kadar */
function halka(W, D, r, a, b, z0, h) {
  const s = kutuYolu(new THREE.Shape(), W, D, r, a);
  if (b != null) {
    const delik = kutuYolu(new THREE.Path(), W, D, r, b);
    s.holes.push(new THREE.Path(delik.getPoints(10).reverse()));
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, z0);
  return g;
}
/**
 * Yivli dış hat: köşeleri yuvarlak dikdörtgenin düz kenarlarına, içe doğru
 * yarım daire kesitli yivler. Yiv köşelerde söner; en dış ölçü değişmez.
 */
function yivliHat(W, D, r, derin, adim) {
  const pts = [];
  const duz = [W - 2 * r, D - 2 * r];
  const kenar = (uz, bas, yon, nrm) => {
    const n = Math.max(1, Math.round(uz / adim)), gercek = uz / n;
    const N = Math.max(8, Math.ceil(uz / 0.8)); // 0,8 mm kiriş: sapma < 0,05 mm, yazıcı kısa hamlelerde yavaşlamaz
    for (let i = 0; i < N; i++) {
      const s = (i / N) * uz;
      const f = (s / gercek) % 1; // yiv içindeki konum
      const sonme = Math.min(1, s / 3, (uz - s) / 3); // köşeye 3 mm kala söner
      const ic = derin * Math.max(0, sonme) * Math.pow(Math.sin(Math.PI * f), 2);
      pts.push(new THREE.Vector2(bas[0] + yon[0] * s - nrm[0] * ic, bas[1] + yon[1] * s - nrm[1] * ic));
    }
  };
  const yay = (cx, cy, a0) => {
    for (let i = 0; i < 12; i++) {
      const a = a0 + (i / 12) * (Math.PI / 2);
      pts.push(new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)));
    }
  };
  const x = W / 2, y = D / 2;
  kenar(duz[0], [-x + r, -y], [1, 0], [0, -1]);
  yay(x - r, -y + r, -Math.PI / 2);
  kenar(duz[1], [x, -y + r], [0, 1], [1, 0]);
  yay(x - r, y - r, 0);
  kenar(duz[0], [x - r, y], [-1, 0], [0, 1]);
  yay(-x + r, y - r, Math.PI / 2);
  kenar(duz[1], [-x, y - r], [0, -1], [-1, 0]);
  yay(-x + r, -y + r, Math.PI);
  return pts;
}
/** Yivli halka: dış hat yivli, iç hat düz (içe "b" kadar) */
function yivliHalka(W, D, r, b, z0, h) {
  const s = new THREE.Shape(yivliHat(W, D, r, 0.8, 5.2));
  s.holes.push(kutuYolu(new THREE.Path(), W, D, r, b));
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, z0);
  return g;
}

function kutuGeo(w, d, h, x, y, z) {
  const g = new THREE.BoxGeometry(w, d, h).toNonIndexed();
  g.translate(x, y, z + h / 2);
  return g;
}
const birlestir = (liste) => {
  const g = mergeGeometries(liste.filter(Boolean).map((x) => {
    const n = x.index ? x.toNonIndexed() : x;
    n.deleteAttribute("uv");
    n.deleteAttribute("normal");
    return n;
  }), false);
  g.computeVertexNormals();
  return g;
};

const S_ = sahneKur({ tuval: el("fk-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.32, -0.72, 0.62);
const mat = [0, 1, 2, 3].map(() => malzeme(0x888888));
const matKutu = malzeme(0x888888);
let SON = null;
const yenile = gecikmeli(() => S_.yenile?.(), 120);
const FOTO = fotoModeli("fk", yenile, ORNEK);

function kur() {
  if (!FOTO.hazir) return;
  const P = oku();
  const etek = clamp(P.H * 0.24, 8, 16); // eteğin (ve boynun) yüksekliği
  const tw = P.duvar * 2 + P.bosluk; // alt duvar: etek + boşluk + boyun
  const Hsh = P.H - P.Tl - etek; // omuz
  const fw = P.W - 2 * P.kenarlik, fd = P.D - 2 * P.kenarlik; // fotoğraf alanı
  const R = FOTO.etiketle(fw, fd, 0.5);
  if (P.renkKapak >= R.n) P.renkKapak = 0;
  if (P.renkKutu >= R.n) P.renkKutu = 0;

  // ---- Gövde
  // Taban kenarı iki basamak pahlı (0,6 → 0,3 → 0): ilk katman taşması gizlenir
  const parcalar = [
    halka(P.W, P.D, P.kose, 0.6, null, 0, 0.2),
    halka(P.W, P.D, P.kose, 0.3, null, 0.2, 0.2),
    halka(P.W, P.D, P.kose, 0, null, 0.4, TABAN - 0.4),
    halka(P.W, P.D, P.kose, P.duvar + P.bosluk, tw, Hsh, etek - 0.5),
  ];
  const alt = 3, ust = 2.4; // yivsiz kuşaklar
  if (P.doku === "yivli" && Hsh - TABAN > alt + ust + 6) {
    parcalar.push(
      halka(P.W, P.D, P.kose, 0, tw, TABAN, alt),
      yivliHalka(P.W, P.D, P.kose, tw, TABAN + alt, Hsh - TABAN - alt - ust),
      halka(P.W, P.D, P.kose, 0, tw, Hsh - ust, ust)
    );
  } else parcalar.push(halka(P.W, P.D, P.kose, 0, tw, TABAN, Hsh - TABAN));
  const icW = P.W - 2 * tw, icD = P.D - 2 * tw, hB = Hsh + etek - 0.5 - TABAN - 3;
  const B = 1.2;
  if (P.bolme === "2" || P.bolme === "4") parcalar.push(kutuGeo(B, icD + 0.6, hB, 0, 0, TABAN));
  if (P.bolme === "4") parcalar.push(kutuGeo(icW + 0.6, B, hB, 0, 0, TABAN));
  if (P.bolme === "3") for (const s of [-1, 1]) parcalar.push(kutuGeo(B, icD + 0.6, hB, (s * icW) / 6, 0, TABAN));
  const gGovde = birlestir(parcalar);

  // ---- Kapak (kendi ekseninde: levha z ∈ [0, Tl], etek aşağı)
  const dis = (c) => { c.beginPath(); yuvarlakKutu(c, -P.W / 2, -P.D / 2, P.W, P.D, P.kose); c.fill(); };
  const tut = maske(P.W, P.D, P.px, dis);
  const alfa = alfaOku(tut);
  const ince = inceEtiket(R.et, R.cw, R.ch, fw, fd, tut.w, tut.h, P.px);
  const ic = alfaOku(asindir(maskeKopya(tut), P.kenarlik));
  for (let i = 0; i < ince.length; i++) if (ic[i] < 128) ince[i] = P.renkKapak;
  const kapak = [];
  for (let k = 0; k < R.n; k++) kapak.push(etiketKatisi(ince, tut.w, tut.h, P.px, alfa, k, P.tc, P.Tl - P.tc));
  kapak[P.renkKapak] = birlestir([
    kapak[P.renkKapak],
    etiketKatisi(ince, tut.w, tut.h, P.px, alfa, -1, P.Tl - P.tc, 0),
    halka(P.W, P.D, P.kose, 0, P.duvar, -etek, etek),
  ]);

  // ---- Sahne
  const aglar = [];
  matKutu.color.set(R.hex[P.renkKutu]);
  aglar.push(ag(gGovde, matKutu, "govde"));
  const zKapak = P.H - P.Tl + (P.acik ? etek + 26 : 0);
  kapak.forEach((g, k) => {
    if (!g) return;
    mat[k].color.set(R.hex[k]);
    const m = ag(g, mat[k], `kapak${k + 1}`);
    m.position.set(P.acik ? P.W * 0.18 : 0, P.acik ? P.D * 0.1 : 0, zKapak);
    if (P.acik) m.rotation.set(0.16, -0.1, 0);
    aglar.push(m);
  });
  S_.modeliYaz(aglar);

  const vKapak = kapak.map((g) => hacim(g));
  const vGovde = hacim(gGovde);
  const katman = Math.round(P.tc / 0.2);
  // Kutu duvarları ince: hacim gerçek dolu hacimdir
  const o = olcum(vKapak.reduce((a, b) => a + b, 0) + vGovde, 0);
  o.sureSaat += (katman * (R.n - 1) * 1.6) / 60;
  SON = { P, R, kapak, gGovde, vKapak, vGovde, olcum: o, etek, icW, icD, icH: Hsh + etek - 0.5 - TABAN };

  bilgiYaz();
  if (!S_.elleOynandi) S_.ortala();
  window.__ADJY_FK = {
    hazir: true,
    olcum: o,
    olcu: `${P.W} × ${P.D} × ${P.H} mm (iç ${icW.toFixed(0)} × ${icD.toFixed(0)} × ${SON.icH.toFixed(0)} mm)`,
    renkler: R.slot.map((k) => FILAMENT_AD[k]).join(", "),
  };
}

function bilgiYaz() {
  const { P, R, vKapak, vGovde, olcum: o, etek, icW, icD, icH } = SON;
  el("fk-olcu").textContent = `${P.W} × ${P.D} × ${P.H} mm`;
  for (let i = 1; i <= 4; i++) el(`fk-renk-${i}-satir`).hidden = i > R.n;
  for (const on of ["fk-renk-kapak", "fk-renk-kutu"]) yuvaDugmeleriniBoya(on, R.hex);
  const uyarilar = [];
  if (!FOTO.kullanici) uyarilar.push("Örnek fotoğraf: kendi fotoğrafınızı yükleyin");
  const u = el("fk-uyari");
  u.hidden = !uyarilar.length;
  u.textContent = uyarilar.join(" · ");
  for (let k = 1; k <= 4; k++) el(`fk-stl-kapak-r${k}`).hidden = !SON.kapak[k - 1];
  tabloYaz(el("fk-tablo"), [
    ["Dış ölçü", `${P.W} × ${P.D} × ${P.H} mm`],
    ["İç ölçü", `${icW.toFixed(1)} × ${icD.toFixed(1)} × ${icH.toFixed(1)} mm`],
    ["Kapak", `levha ${P.Tl.toFixed(1)} mm · etek ${etek.toFixed(1)} mm · boşluk ${P.bosluk.toFixed(2)} mm`],
    ["Renkler", R.slot.map((k, i) => `${i + 1} ${FILAMENT_AD[k]} %${Math.round(R.pay[i] * 100)}`).join(" · ")],
    ["Kapak / kutu rengi", `${FILAMENT_AD[R.slot[P.renkKapak]]} / ${FILAMENT_AD[R.slot[P.renkKutu]]}`],
    ["Renk katı", `${P.tc.toFixed(1)} mm · ≈ ${Math.round(P.tc / 0.2) * (R.n - 1)} değişim`],
    ["Kapak / gövde", `${(vKapak.reduce((a, b) => a + b, 0) / 1000).toFixed(1)} / ${(vGovde / 1000).toFixed(1)} cm³`],
    ["Bölme", P.bolme === "yok" ? "yok" : `${P.bolme} göz`],
    ["Duvar", P.doku === "yivli" ? "yivli (0,8 mm gömük, 5 mm aralık)" : "düz"],
    ["Filament (PLA)", `${o.kutleG.toFixed(0)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
  ]);
}

function onEk() {
  const P = SON.P;
  return `FOTO_KUTU_${P.W}x${P.D}x${P.H}`;
}
for (let k = 1; k <= 4; k++) {
  el(`fk-stl-kapak-r${k}`).addEventListener("click", () => {
    const g = SON && SON.kapak[k - 1];
    if (!g) return;
    indir(stl([yuzAsagi(g, SON.P.Tl)], `kapak${k}`), `${onEk()}_kapak_renk${k}_${dosyaAdi(FILAMENT_AD[SON.R.slot[k - 1]])}.stl`, "model/stl");
  });
}
el("fk-stl-govde").addEventListener("click", () => {
  if (SON) indir(stl([SON.gGovde], "govde"), `${onEk()}_govde.stl`, "model/stl");
});
el("fk-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, R, olcum: o, etek, icW, icD, icH } = SON;
  indir(csv([
    ["Alan", "Deger"], ["Dis_mm", `${P.W}x${P.D}x${P.H}`], ["Ic_mm", `${icW.toFixed(1)}x${icD.toFixed(1)}x${icH.toFixed(1)}`],
    ["Kose_mm", P.kose], ["Bolme", P.bolme], ["Duvar_dokusu", P.doku], ["Kenarlik_mm", P.kenarlik], ["Duvar_mm", P.duvar], ["Kapak_boslugu_mm", P.bosluk],
    ["Kapak_levha_mm", P.Tl], ["Etek_mm", etek.toFixed(1)], ["Renk_kati_mm", P.tc],
    ...R.slot.map((k, i) => [`Renk_${i + 1}`, `${FILAMENT_AD[k]} ${R.hex[i]} %${Math.round(R.pay[i] * 100)}`]),
    ["Kapak_rengi", P.renkKapak + 1], ["Kutu_rengi", P.renkKutu + 1],
    ["Baski_yonu", "Kapak: fotograf yuzu tablada, etek yukari; govde: taban tablada"],
    ["Kutle_g_PLA", o.kutleG.toFixed(0)], ["Sure_sa", o.sureSaat.toFixed(2)],
  ]), `${onEk()}_bilgi.csv`, "text/csv;charset=utf-8");
});

// Hazır kutular fotoğrafa dokunmaz: yalnız ölçü, bölme ve renk düzeni
const HAZIR = {
  hatira: { "fk-doku": "yivli", "fk-gen": 120, "fk-der": 90, "fk-yuk": 50, "fk-kose": 10, "fk-bolme": "yok", "fk-kenarlik": 4, "fk-mod": "renkli", "fk-renk-sayi": 4 },
  taki: { "fk-doku": "yivli", "fk-gen": 90, "fk-der": 90, "fk-yuk": 36, "fk-kose": 12, "fk-bolme": "4", "fk-kenarlik": 4, "fk-mod": "renkli", "fk-renk-sayi": 4 },
  kalem: { "fk-doku": "duz", "fk-gen": 190, "fk-der": 80, "fk-yuk": 44, "fk-kose": 8, "fk-bolme": "3", "fk-kenarlik": 3, "fk-mod": "renkli", "fk-renk-sayi": 4 },
  klasik: { "fk-doku": "duz", "fk-gen": 140, "fk-der": 105, "fk-yuk": 64, "fk-kose": 6, "fk-bolme": "yok", "fk-kenarlik": 6, "fk-mod": "sb", "fk-renk-sayi": 4 },
};
document.querySelectorAll("[data-hazir]").forEach((b) => {
  b.addEventListener("click", (e) => {
    if (e.isTrusted) FOTO.onerBekliyor = true;
    alanlariYaz(HAZIR[b.dataset.hazir] || {});
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.toggle("on", x === b));
  });
});

formBagla((t) => {
  if (t && ["fk-gen", "fk-der", "fk-yuk", "fk-acik"].includes(t.id)) S_.elleOynandi = false;
  yenile();
});
S_.dongu(kur);
window.__ADJY_FK_ONER = () => { FOTO.onerBekliyor = true; yenile(); };
window.__ADJY_SAHNE_MODEL = () => S_.model;
