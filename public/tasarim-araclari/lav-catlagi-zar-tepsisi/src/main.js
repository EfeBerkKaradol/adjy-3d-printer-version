/* ==========================================================================
   LAV ÇATLAĞI ZAR TEPSİSİ

   Çatlak taş zeminli zar tepsisi; iki renk:
     lav  → tepsinin iç tabanı, en altta düz bir kat (tL)
     taş  → lav katının üstünde çatlaklı zemin (tT), düz yükselen duvar
            ve köşelerde basamaklı dişler
   Çatlaklar, rünler ve mühür taş katını boydan boya keser: altındaki lav
   rengi görünür. Taş adacıkları lav katına oturur, havada kalan yer yok.

   Çatlak ağı: rastgele tohum noktalarının Voronoi kenarları; genişliği
   gürültüyle değişir (taş kırığı gibi). Piksel başına en yakın iki tohum
   bulunur, kenara olan gerçek uzaklık hesaplanır.

   Birim mm, Z yukarı, taban tablaya oturur, desteksiz.
   ========================================================================== */
import {
  THREE, el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, maske, maskeBirlestir, maskeDoluMu, asindir,
  maskedenKati, hacim, olcum, stl, indir, csv, formBagla, alanlariYaz, tabloYaz, sureYaz,
  pahliKati, maskeCiz, maskeKopya, cokgen, rastgele, gurultu,
} from "../../_adjy/arac-ortak.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

const RENK = {
  antrasit: 0x2f3033, siyah: 0x1b1b1f, gri: 0x7b7d82, bordo: 0x5a1a22, kemik: 0xddd3bd,
  turuncu: 0xff6a1a, kirmizi: 0xd6201f, sari: 0xffc21a, yesil: 0x63d13a, mavi: 0x2f9bff,
};
const KOSE = { altigen: 6, sekizgen: 8, daire: 0 };
// Rünler: 1 × 1,5 kutuda çizgi parçaları [x1, y1, x2, y2]
const RUN = [
  [[0, 0, 0, 1.5], [0, 1.5, 0.8, 1.0], [0, 0.9, 0.8, 0.4]],
  [[0, 0, 1, 1.5], [1, 0, 0, 1.5]],
  [[0.5, 0, 0.5, 1.5], [0.5, 1.5, 0, 0.9], [0.5, 1.5, 1, 0.9]],
  [[0, 1.5, 1, 1.0], [1, 1.0, 0, 0.5], [0, 0.5, 1, 0]],
  [[0.5, 0, 1, 0.75], [1, 0.75, 0.5, 1.5], [0.5, 1.5, 0, 0.75], [0, 0.75, 0.5, 0]],
  [[0, 0, 0, 1.5], [1, 0, 1, 1.5], [0, 1.1, 1, 0.4]],
  [[0.1, 0, 0.1, 1.5], [0.1, 1.5, 0.9, 1.1], [0.9, 1.1, 0.1, 0.7], [0.1, 0.7, 0.9, 0]],
  [[0, 0, 0.5, 1.5], [0.5, 1.5, 1, 0], [0.2, 0.6, 0.8, 0.6]],
  [[0.5, 0, 0.5, 1.5], [0, 0.4, 1, 1.1]],
];

function oku() {
  return {
    bicim: el("lt-bicim").value,
    D: clamp(sayi("lt-cap", 150), 100, 200),
    Hd: clamp(sayi("lt-duvar", 18), 10, 30),
    dis: el("lt-dis").checked,
    hucre: Math.round(clamp(sayi("lt-hucre", 28), 8, 40)),
    genis: clamp(sayi("lt-genis", 2), 0.8, 3),
    tohum: Math.round(clamp(sayi("lt-tohum", 13), 1, 99)),
    run: el("lt-run").checked,
    muhur: el("lt-muhur").checked,
    renkTas: el("lt-renk-tas").value,
    renkLav: el("lt-renk-lav").value,
    tL: clamp(sayi("lt-lav-kat", 1.2), 0.8, 2),
    tT: clamp(sayi("lt-tas-kat", 1.6), 1.2, 3),
    dk: clamp(sayi("lt-duvar-kal", 3.2), 2.4, 5),
    px: clamp(sayi("lt-px", 6), 4, 8),
  };
}

function bicimYolu(c, P, R) {
  c.beginPath();
  const n = KOSE[P.bicim];
  if (!n) c.arc(0, 0, R, 0, Math.PI * 2);
  else cokgen(c, n, R, n === 6 ? 0 : Math.PI / 8);
  c.fill();
}

/** Çatlak ağı: Voronoi kenarlarına yakın pikseller dolu (alfa), mm cinsinden yumuşak kenar */
function catlakMaskesi(P, gen, yuk, Ric) {
  const m = maske(gen, yuk, P.px, () => {});
  const R = rastgele(P.tohum * 97 + 3);
  const gr = gurultu(P.tohum * 13 + 1);
  const tx = [], ty = [];
  // Tohumlar: iç alanın biraz dışına da taşar ki kenardaki taşlar kesik dursun
  let deneme = 0;
  while (tx.length < P.hucre && deneme++ < 4000) {
    const x = (R() * 2 - 1) * Ric * 1.05, y = (R() * 2 - 1) * Ric * 1.05;
    if (x * x + y * y > Ric * Ric * 1.1) continue;
    let yakin = false;
    for (let i = 0; i < tx.length; i++) if ((tx[i] - x) ** 2 + (ty[i] - y) ** 2 < (Ric * 0.16) ** 2) { yakin = true; break; }
    if (!yakin) { tx.push(x); ty.push(y); }
  }
  const n = tx.length;
  const img = m.ctx.createImageData(m.w, m.h);
  const d = img.data;
  const runIc = Ric * 0.5, runDis = Ric * 0.72, muhurR = Ric * 0.4;
  for (let j = 0; j < m.h; j++) {
    const y = -(j + 0.5 - m.h / 2) / m.pxMm;
    for (let i = 0; i < m.w; i++) {
      const x = (i + 0.5 - m.w / 2) / m.pxMm;
      const rr = Math.hypot(x, y);
      if (rr > Ric + 2) continue;
      // Rün kuşağında ve mühürde çatlak yok (işaretler temiz okunur)
      if (P.run && rr > runIc - 1.5 && rr < runDis + 1.5) continue;
      if (P.muhur && rr < muhurR + 1.5) continue;
      let d1 = Infinity, d2 = Infinity, i1 = 0, i2 = 0;
      for (let k = 0; k < n; k++) {
        const q = (tx[k] - x) ** 2 + (ty[k] - y) ** 2;
        if (q < d1) { d2 = d1; i2 = i1; d1 = q; i1 = k; } else if (q < d2) { d2 = q; i2 = k; }
      }
      const ara = Math.hypot(tx[i1] - tx[i2], ty[i1] - ty[i2]) || 1;
      const uzak = (d2 - d1) / (2 * ara); // kenara dik uzaklık (mm)
      const w = P.genis * (0.55 + 0.9 * gr(x / 9 + 40, y / 9 + 40));
      const a = clamp((w / 2 - uzak) * m.pxMm + 0.5, 0, 1);
      if (a > 0) {
        const o = (j * m.w + i) * 4;
        d[o] = d[o + 1] = d[o + 2] = 255;
        d[o + 3] = Math.round(a * 255);
      }
    }
  }
  m.ctx.putImageData(img, 0, 0);
  return m;
}

/** Rün halkası ve merkez mühür: çizgi olarak (taştan kesilir) */
function runCiz(c, P, Ric) {
  const R = rastgele(P.tohum * 53 + 7);
  c.lineCap = "round";
  c.lineJoin = "round";
  if (P.run) {
    const r1 = Ric * 0.5, r2 = Ric * 0.72;
    c.lineWidth = 1.2;
    for (const r of [r1, r2]) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
    const boy = (r2 - r1) * 0.56, en = boy / 1.5;
    const adet = Math.max(8, Math.floor((Math.PI * (r1 + r2)) / (en * 2.3)));
    c.lineWidth = Math.max(1.1, boy * 0.13);
    for (let i = 0; i < adet; i++) {
      const a = (i / adet) * Math.PI * 2;
      const g = RUN[Math.floor(R() * RUN.length)];
      c.save();
      c.rotate(a - Math.PI / 2);
      c.translate(-en / 2, (r1 + r2) / 2 - boy / 2);
      c.beginPath();
      for (const [x1, y1, x2, y2] of g) { c.moveTo(x1 * en, (y1 * boy) / 1.5); c.lineTo(x2 * en, (y2 * boy) / 1.5); }
      c.stroke();
      c.restore();
    }
  }
  if (P.muhur) {
    const r = Ric * 0.36;
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    cokgen(c, 3, r * 0.94, Math.PI / 2);
    c.stroke();
    c.beginPath();
    cokgen(c, 3, r * 0.46, -Math.PI / 2);
    c.stroke();
    // Ortada dikey yarık (göz bebeği)
    c.beginPath();
    c.ellipse(0, 0, r * 0.07, r * 0.2, 0, 0, Math.PI * 2);
    c.fill();
  }
}

// ---------------------------------------------------------------- KUR
const S_ = sahneKur({ tuval: el("lt-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.2, -0.75, 0.85);
const mat = { tas: malzeme(RENK.antrasit, { roughness: 0.7 }), lav: malzeme(RENK.turuncu, { roughness: 0.4 }) };
let SON = null;

function kur() {
  const P = oku();
  const R = P.D / 2;
  const gen = P.D + 4, yuk = P.D + 4, px = P.px;
  const dis = () => maske(gen, yuk, px, (c) => bicimYolu(c, P, R));
  const ic = asindir(dis(), P.dk);
  const n = KOSE[P.bicim];
  // İç alanın yarıçapı (çokgende kenara kadar)
  const Ric = (n ? R * Math.cos(Math.PI / n) : R) - P.dk;

  const duvar = dis();
  maskeBirlestir(duvar, ic, "destination-out");

  const catlak = catlakMaskesi(P, gen, yuk, Ric);
  maskeCiz(catlak, (c) => runCiz(c, P, Ric));
  const tas = maskeKopya(ic);
  maskeBirlestir(tas, catlak, "destination-out");

  // Köşe dişleri: duvarın üstünde, köşelerde
  let gDis = null;
  if (P.dis) {
    const adet = n || 8;
    const a0 = n === 6 ? 0 : Math.PI / 8;
    const dm = maske(gen, yuk, px, (c) => {
      c.beginPath();
      for (let i = 0; i < adet; i++) {
        const a = a0 + (i * Math.PI * 2) / adet;
        const r = R - P.dk * 0.5;
        c.moveTo(r * Math.cos(a) + P.dk * 1.7, r * Math.sin(a));
        c.arc(r * Math.cos(a), r * Math.sin(a), P.dk * 1.7, 0, Math.PI * 2);
      }
      c.fill();
    });
    maskeBirlestir(dm, duvar, "destination-in");
    const boy = clamp(P.Hd * 0.3, 3, 7);
    gDis = pahliKati(dm, boy, P.Hd, Math.min(boy * 0.6, P.dk * 0.42), 5);
  }

  const gLav = maskedenKati(ic, P.tL, 0);
  const gTas = maskedenKati(tas, P.tT, P.tL);
  const gDuvar = pahliKati(duvar, P.Hd, 0, P.dis ? 0 : 0.8, 3);

  mat.tas.color.setHex(RENK[P.renkTas] ?? RENK.antrasit);
  mat.lav.color.setHex(RENK[P.renkLav] ?? RENK.turuncu);
  const aglar = [ag(gLav, mat.lav, "lav"), ag(gTas, mat.tas, "tas"), ag(gDuvar, mat.tas, "duvar")];
  if (gDis) aglar.push(ag(gDis, mat.tas, "disler"));
  S_.modeliYaz(aglar);

  const v = { lav: hacim(gLav), tas: hacim(gTas) + hacim(gDuvar) + hacim(gDis) };
  const o = olcum(v.lav + v.tas, 1);
  const boyut = S_.kutu.getSize(new THREE.Vector3());
  SON = { P, gLav, gTas, gDuvar, gDis, v, olcum: o, boyut, Ric };

  bilgiYaz();
  if (!S_.elleOynandi) S_.ortala();
  window.__ADJY_LT = {
    hazir: true,
    olcum: o,
    olcu: `${boyut.x.toFixed(0)} × ${boyut.y.toFixed(0)} × ${boyut.z.toFixed(0)} mm`,
  };
}

function bilgiYaz() {
  const { P, v, olcum: o, boyut, Ric } = SON;
  el("lt-olcu").textContent = `Ø${P.D} × ${boyut.z.toFixed(0)} mm`;
  const u = el("lt-uyari");
  u.hidden = true;
  tabloYaz(el("lt-tablo"), [
    ["Dış ölçü", `${boyut.x.toFixed(1)} × ${boyut.y.toFixed(1)} × ${boyut.z.toFixed(1)} mm`],
    ["İç alan ≈", `Ø${(Ric * 2).toFixed(0)} mm · derinlik ${(P.Hd - P.tL - P.tT).toFixed(1)} mm`],
    ["Zemin", `lav ${P.tL} + taş ${P.tT} mm`],
    ["Çatlak", `${P.hucre} taş · ${P.genis} mm · no ${P.tohum}`],
    ["Taş", `${(v.tas / 1000).toFixed(1)} cm³`],
    ["Lav", `${(v.lav / 1000).toFixed(1)} cm³`],
    ["Filament (PLA)", `${o.kutleG.toFixed(0)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
  ]);
}

function onEk() {
  const P = SON.P;
  return `LAV_TEPSI_${P.bicim}_D${P.D}_H${P.Hd}_no${P.tohum}`;
}
el("lt-stl-tas").addEventListener("click", () => {
  if (!SON) return;
  indir(stl([SON.gTas, SON.gDuvar, SON.gDis].filter(Boolean), "tas"), `${onEk()}_tas_${SON.P.renkTas}.stl`, "model/stl");
});
el("lt-stl-lav").addEventListener("click", () => {
  if (!SON) return;
  indir(stl([SON.gLav], "lav"), `${onEk()}_lav_${SON.P.renkLav}.stl`, "model/stl");
});
el("lt-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, boyut, olcum: o } = SON;
  indir(csv([
    ["Alan", "Deger"], ["Bicim", P.bicim], ["Cap_mm", P.D], ["Duvar_yukseklik_mm", P.Hd], ["Duvar_kalinlik_mm", P.dk],
    ["Kose_disleri", P.dis ? "evet" : "hayir"], ["Tas_sayisi", P.hucre], ["Catlak_mm", P.genis], ["Desen_no", P.tohum],
    ["Run_halkasi", P.run ? "evet" : "hayir"], ["Muhur", P.muhur ? "evet" : "hayir"], ["Lav_kati_mm", P.tL], ["Tas_kati_mm", P.tT],
    ["Renk_tas", P.renkTas], ["Renk_lav", P.renkLav], ["Olcu_mm", `${boyut.x.toFixed(1)} x ${boyut.y.toFixed(1)} x ${boyut.z.toFixed(1)}`],
    ["Kutle_g_PLA", o.kutleG.toFixed(0)], ["Sure_sa", o.sureSaat.toFixed(2)],
  ]), `${onEk()}_bilgi.csv`, "text/csv;charset=utf-8");
});

const HAZIR = {
  cehennem: { "lt-bicim": "altigen", "lt-cap": 150, "lt-duvar": 18, "lt-dis": true, "lt-hucre": 28, "lt-genis": 2, "lt-tohum": 13, "lt-run": true, "lt-muhur": true, "lt-renk-tas": "antrasit", "lt-renk-lav": "turuncu" },
  volkan: { "lt-bicim": "daire", "lt-cap": 160, "lt-duvar": 22, "lt-dis": false, "lt-hucre": 34, "lt-genis": 2.2, "lt-tohum": 58, "lt-run": false, "lt-muhur": false, "lt-renk-tas": "siyah", "lt-renk-lav": "kirmizi" },
  plazma: { "lt-bicim": "sekizgen", "lt-cap": 140, "lt-duvar": 16, "lt-dis": true, "lt-hucre": 22, "lt-genis": 1.8, "lt-tohum": 31, "lt-run": true, "lt-muhur": true, "lt-renk-tas": "gri", "lt-renk-lav": "mavi" },
  asit: { "lt-bicim": "altigen", "lt-cap": 130, "lt-duvar": 14, "lt-dis": true, "lt-hucre": 26, "lt-genis": 1.8, "lt-tohum": 77, "lt-run": true, "lt-muhur": false, "lt-renk-tas": "siyah", "lt-renk-lav": "yesil" },
};
document.querySelectorAll("[data-hazir]").forEach((b) => {
  b.addEventListener("click", () => {
    alanlariYaz(HAZIR[b.dataset.hazir] || {});
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.toggle("on", x === b));
    S_.elleOynandi = false;
  });
});

formBagla((t) => {
  if (t && ["lt-cap", "lt-duvar", "lt-bicim"].includes(t.id)) S_.elleOynandi = false;
  S_.yenile?.();
});
S_.dongu(kur);
