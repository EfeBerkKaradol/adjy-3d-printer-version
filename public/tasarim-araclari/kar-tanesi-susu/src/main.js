/* ==========================================================================
   KAR TANESİ SÜSÜ

   Altı kollu, simetrik kar tanesi. Bir kol çizilir, altı kez 60° döndürülür:
     ana kol  → merkezden uca kalın çizgi
     dallar   → kol boyunca n çift, dışa doğru açılır, uca doğru kısalır
     uç       → kristal, yuvarlak, çatal ya da düz
     merkez   → altıgen, daire, yıldız ya da halka
   "Desen" numarası dalların yerini, boyunu ve açısını küçük oranlarda
   değiştirir; aynı numara her zaman aynı kar tanesini verir.

   Çizim tuvalde birleşir, dış hattı çıkarılıp ekstrüde edilir (bkz.
   ../_adjy/yilbasi-ortak.js). Tek parça, tek renk, desteksiz; çizgi
   kalınlığı en az 1,6 mm (dört perimetre).
   ========================================================================== */
import {
  THREE, el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, maske,
  hacim, olcum, stl, indir, csv, formBagla, alanlariYaz, tabloYaz, sureYaz, pahliKati,
} from "../../_adjy/arac-ortak.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

const RENK = {
  beyaz: 0xf4f3ee, mavi: 0x8fc3ea, gumus: 0xb9bcc2, altin: 0xd2a347,
  kirmizi: 0xc4202b, lacivert: 0x1d2a52, yesil: 0x1f6b3a,
};

/** Desen numarasından tekrar üretilebilir sayı dizisi (mulberry32) */
function rastgele(tohum) {
  let a = (tohum * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function oku() {
  return {
    D: clamp(sayi("kt-cap", 80), 40, 130),
    T: clamp(sayi("kt-kalinlik", 3), 2, 5),
    k: clamp(sayi("kt-kol", 2.6), 1.6, 4.5),
    dal: Math.round(clamp(sayi("kt-dal", 3), 0, 5)),
    aci: clamp(sayi("kt-aci", 50), 25, 75),
    boy: clamp(sayi("kt-boy", 40), 15, 70),
    uc: el("kt-uc").value,
    merkez: el("kt-merkez").value,
    halka: el("kt-ic-halka").checked,
    desen: Math.round(clamp(sayi("kt-desen", 7), 1, 99)),
    aski: el("kt-aski").value,
    renk: el("kt-renk").value,
    delik: clamp(sayi("kt-delik", 3.5), 2.5, 6),
    px: clamp(sayi("kt-cozunurluk", 10), 6, 16),
  };
}

// En ince çizgi: 0,4 mm memeyle en az üç-dört perimetre
const EN_INCE = 1.4;

function cizgi(c, x0, y0, x1, y1, w) {
  c.lineWidth = Math.max(EN_INCE, w);
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.stroke();
}

/** Bir kol (+Y yönünde) */
function kolCiz(c, P, R, dallar) {
  const k = P.k;
  c.lineCap = "round";
  c.lineJoin = "round";
  cizgi(c, 0, 0, 0, R, k);
  for (const d of dallar) {
    const y = d.t * R;
    const a = (d.aci * Math.PI) / 180;
    const L = d.L;
    const dx = Math.sin(a) * L, dy = Math.cos(a) * L;
    cizgi(c, 0, y, dx, y + dy, k * d.w);
    cizgi(c, 0, y, -dx, y + dy, k * d.w);
    // Uzun dalda dalın ortasından uca doğru küçük bir filiz
    if (d.alt && L > k * 5) {
      const l2 = L * 0.4;
      for (const s of [1, -1]) {
        const bx = s * dx * 0.55, by = y + dy * 0.55;
        cizgi(c, bx, by, bx + s * l2 * 0.18, by + l2, k * 0.7);
      }
    }
  }
  // Uç
  const u = k * 1.15;
  if (P.uc === "kristal") {
    c.beginPath();
    c.moveTo(0, R + u * 1.9);
    c.lineTo(u * 1.25, R);
    c.lineTo(0, R - u * 1.9);
    c.lineTo(-u * 1.25, R);
    c.closePath();
    c.fill();
  } else if (P.uc === "yuvarlak") {
    c.beginPath();
    c.arc(0, R, u * 1.35, 0, Math.PI * 2);
    c.fill();
  } else if (P.uc === "catal") {
    const l = Math.max(k * 2.4, R * 0.12);
    cizgi(c, 0, R, l * 0.6, R + l * 0.8, k * 0.85);
    cizgi(c, 0, R, -l * 0.6, R + l * 0.8, k * 0.85);
  }
}

function merkezCiz(c, P, R) {
  const r = Math.max(P.k * 2.2, R * 0.17);
  c.beginPath();
  if (P.merkez === "daire") {
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
  } else if (P.merkez === "yildiz") {
    for (let i = 0; i < 12; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 6;
      const q = i % 2 ? r * 0.55 : r * 1.15;
      i ? c.lineTo(q * Math.cos(a), q * Math.sin(a)) : c.moveTo(q * Math.cos(a), q * Math.sin(a));
    }
    c.closePath();
    c.fill();
  } else {
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      i ? c.lineTo(r * Math.cos(a), r * Math.sin(a)) : c.moveTo(r * Math.cos(a), r * Math.sin(a));
    }
    c.closePath();
    c.fill();
    if (P.merkez === "halka") {
      c.save();
      c.globalCompositeOperation = "destination-out";
      c.beginPath();
      const ri = r - P.k * 1.1;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + Math.PI / 6;
        i ? c.lineTo(ri * Math.cos(a), ri * Math.sin(a)) : c.moveTo(ri * Math.cos(a), ri * Math.sin(a));
      }
      c.closePath();
      c.fill();
      c.restore();
      // Kollar halkanın ortasında birleşmesin: yıldız göbeği küçük altıgen
      c.beginPath();
      const rc = P.k * 1.2;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        i ? c.lineTo(rc * Math.cos(a), rc * Math.sin(a)) : c.moveTo(rc * Math.cos(a), rc * Math.sin(a));
      }
      c.closePath();
      c.fill();
    }
  }
}

/** Desen numarası + ayarlar → dallar */
function dallar(P, R) {
  const rnd = rastgele(P.desen);
  const n = P.dal;
  const d = [];
  for (let i = 0; i < n; i++) {
    const t0 = 0.3 + (0.58 * (i + 0.5)) / Math.max(1, n);
    const t = clamp(t0 + (rnd() - 0.5) * 0.08, 0.22, 0.9);
    const kucul = 1 - (0.55 * i) / Math.max(1, n);
    const L = Math.max(P.k * 1.6, R * (P.boy / 100) * kucul * (0.8 + rnd() * 0.4));
    const aci = clamp(P.aci + (rnd() - 0.5) * 16, 20, 80);
    d.push({ t, L: Math.min(L, R * (1 - t) * 1.6 + P.k), aci, w: 0.8 + rnd() * 0.15, alt: rnd() > 0.3 });
  }
  return d;
}

const S_ = sahneKur({ tuval: el("kt-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.08, -0.6, 0.95);
const mat = malzeme(RENK.beyaz, { roughness: 0.42 });
let SON = null;

function kur() {
  const P = oku();
  const R = P.D / 2 - P.k * 1.6; // uç süsü çapa dahil
  const dl = dallar(P, R);
  const ring = P.aski === "halka" ? { y: R + P.k * 2.2 + P.delik / 2 + 0.4, dis: P.delik / 2 + 2.2, ic: P.delik / 2 } : null;
  const delik = P.aski === "delik" ? { y: R, dis: P.delik / 2 + 2.2, ic: P.delik / 2 } : null;
  const ustY = Math.max(R + P.k * 3, ring ? ring.y + ring.dis : 0);
  const gen = P.D + 6;
  const yuk = Math.max(gen, ustY * 2 + 6);

  const m = maske(gen, yuk, P.px, (c) => {
    for (let i = 0; i < 6; i++) {
      c.save();
      c.rotate((i * Math.PI) / 3);
      kolCiz(c, P, R, dl);
      c.restore();
    }
    merkezCiz(c, P, R);
    if (P.halka) {
      // Kolları birbirine bağlayan iç altıgen: daha sağlam, dantel görünüm
      const rh = R * 0.42;
      c.lineWidth = P.k * 0.85;
      c.lineJoin = "round";
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 2 + (i * Math.PI) / 3;
        i ? c.lineTo(rh * Math.cos(a), rh * Math.sin(a)) : c.moveTo(rh * Math.cos(a), rh * Math.sin(a));
      }
      c.closePath();
      c.stroke();
    }
    const h = ring || delik;
    if (h) {
      c.beginPath();
      c.arc(0, h.y, h.dis, 0, Math.PI * 2);
      c.fill();
      if (ring) c.fillRect(-P.k / 2, R, P.k, ring.y - R);
      c.save();
      c.globalCompositeOperation = "destination-out";
      c.beginPath();
      c.arc(0, h.y, h.ic, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  });

  // Kristal fasetleri: üst kenar kol genişliğinin ~%38'i kadar pahlanır
  const g = pahliKati(m, P.T, 0, Math.min(1.0, P.k * 0.38, P.T * 0.45), 4);
  mat.color.setHex(RENK[P.renk] ?? RENK.beyaz);
  S_.modeliYaz([ag(g, mat, "kar-tanesi")]);
  const v = hacim(g);
  const o = olcum(v);
  const boyut = S_.kutu.getSize(new THREE.Vector3());
  SON = { P, g, v, olcum: o, boyut };
  bilgiYaz();
  if (!S_.elleOynandi) S_.ortala();
  window.__ADJY_KT = {
    hazir: true,
    olcum: o,
    olcu: `${boyut.x.toFixed(0)} × ${boyut.y.toFixed(0)} × ${boyut.z.toFixed(1)} mm`,
  };
}

function bilgiYaz() {
  const { P, boyut, olcum: o, v } = SON;
  el("kt-olcu").textContent = `${boyut.x.toFixed(0)} × ${boyut.y.toFixed(0)} mm · ${P.T.toFixed(1)} mm kalınlık`;
  const u = el("kt-uyari");
  const uyar = P.k < 2 && P.D > 100 ? "İnce kollu büyük tane: kalınlığı artırmanızı öneririz" : "";
  u.hidden = !uyar;
  u.textContent = uyar;
  tabloYaz(el("kt-tablo"), [
    ["Dış ölçü", `${boyut.x.toFixed(1)} × ${boyut.y.toFixed(1)} × ${boyut.z.toFixed(1)} mm`],
    ["Desen", `#${P.desen} · ${P.dal} dal · ${P.aci}°`],
    ["Kol kalınlığı", `${P.k.toFixed(1)} mm (${Math.floor(P.k / 0.42)} perimetre)`],
    ["Hacim", `${(v / 1000).toFixed(2)} cm³`],
    ["Filament (PLA)", `${o.kutleG.toFixed(1)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
  ]);
}

function onEk() {
  const P = SON.P;
  return `KAR_TANESI_D${Math.round(P.D)}_desen${P.desen}_${P.dal}dal_${P.renk}`;
}
el("kt-stl").addEventListener("click", () => {
  if (!SON) return;
  indir(stl([SON.g], onEk()), `${onEk()}.stl`, "model/stl");
});
el("kt-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, boyut, olcum: o } = SON;
  indir(
    csv([
      ["Alan", "Deger"],
      ["Cap_mm", P.D], ["Kalinlik_mm", P.T], ["Kol_mm", P.k], ["Dal", P.dal], ["Aci", P.aci],
      ["Dal_boyu_yuzde", P.boy], ["Uc", P.uc], ["Merkez", P.merkez], ["Ic_halka", P.halka ? "evet" : "hayir"],
      ["Desen", P.desen], ["Aski", P.aski], ["Renk", P.renk],
      ["Olcu_mm", `${boyut.x.toFixed(1)} x ${boyut.y.toFixed(1)} x ${boyut.z.toFixed(1)}`],
      ["Kutle_g_PLA", o.kutleG.toFixed(1)], ["Sure_sa", o.sureSaat.toFixed(2)],
    ]),
    `${onEk()}_bilgi.csv`,
    "text/csv;charset=utf-8"
  );
});

// Hazır desenler
const HAZIR = {
  klasik: { "kt-dal": 3, "kt-aci": 50, "kt-boy": 40, "kt-uc": "kristal", "kt-merkez": "altigen", "kt-ic-halka": false, "kt-desen": 7, "kt-kol": 2.6 },
  dantel: { "kt-dal": 4, "kt-aci": 42, "kt-boy": 34, "kt-uc": "yuvarlak", "kt-merkez": "halka", "kt-ic-halka": true, "kt-desen": 23, "kt-kol": 2.2 },
  kristal: { "kt-dal": 2, "kt-aci": 60, "kt-boy": 52, "kt-uc": "kristal", "kt-merkez": "yildiz", "kt-ic-halka": false, "kt-desen": 41, "kt-kol": 3.2 },
  yalin: { "kt-dal": 1, "kt-aci": 38, "kt-boy": 58, "kt-uc": "catal", "kt-merkez": "daire", "kt-ic-halka": false, "kt-desen": 3, "kt-kol": 3 },
};
document.querySelectorAll("[data-hazir]").forEach((b) => {
  b.addEventListener("click", () => {
    alanlariYaz(HAZIR[b.dataset.hazir] || {});
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.toggle("on", x === b));
  });
});
el("kt-yeni").addEventListener("click", () => {
  const simdi = sayi("kt-desen", 7);
  let n = simdi;
  while (n === simdi) n = 1 + Math.floor(Math.random() * 99);
  alanlariYaz({ "kt-desen": n });
  document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.remove("on"));
});

formBagla((t) => {
  if (t && t.id === "kt-cap") S_.elleOynandi = false;
  S_.yenile?.();
});
S_.dongu(kur);
