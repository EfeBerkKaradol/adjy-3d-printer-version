/* ==========================================================================
   KUM TEPESİ KABARTMA PANO

   Rüzgârın biçimlendirdiği kum tepeleri, yükseklik alanı olarak:
     a = rüzgâr yönündeki konum, b = ona dik
     sırt  → a' = a + kıvrım (b boyunca dalgalanma + gürültü)
     kesit → rüzgâr yüzü yumuşak yükselir, kayma yüzü dik iner (gerçek
             kum tepeleri gibi asimetrik); kayma dikliği ayarlanır
     tepe  → sırt boyunca yükseklik gürültüyle değişir
     dalgacık → rüzgâra dik ince kum çizgileri (yalnız rüzgâr yüzünde)

   Üst yüzey yükseklik alanı olduğu için sarkma yok: desteksiz basılır.
   Tek kapalı ağ (bkz. ../_adjy/arac-ortak.js → yuzeyKur).
   ========================================================================== */
import {
  THREE, el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, hacim, stl, indir, csv,
  formBagla, alanlariYaz, tabloYaz, sureYaz, yuzeyKur, gurultu, ayrinti, PLA,
} from "../../_adjy/arac-ortak.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

const RENK = {
  kum: 0xd8b98a, okra: 0xc9965a, baharat: 0xc77b2a, pas: 0xa4532f,
  kemik: 0xece3cf, gece: 0x24324d, antrasit: 0x2f3033,
};
const CERCEVE = { gen: 6, pay: 10 }; // pervaz genişliği, tepelerin pervaza kadar söndüğü bant

function oku() {
  return {
    desen: Math.round(clamp(sayi("kp-desen", 12), 1, 99)),
    yon: clamp(sayi("kp-yon", 35), 0, 360),
    siklik: clamp(sayi("kp-siklik", 42), 18, 90),
    kivrim: clamp(sayi("kp-kivrim", 55), 0, 100) / 100,
    kayma: clamp(sayi("kp-kayma", 70), 0, 100) / 100,
    W: clamp(sayi("kp-gen", 160), 80, 220),
    D: clamp(sayi("kp-der", 100), 60, 160),
    Y: clamp(sayi("kp-yuk", 11), 3, 22),
    dalgacik: el("kp-dalgacik").checked,
    cerceve: el("kp-cerceve").checked,
    renk: el("kp-renk").value,
    taban: clamp(sayi("kp-taban", 3), 2, 6),
    adim: clamp(sayi("kp-adim", 0.5), 0.4, 1.5),
  };
}

/** Kum tepesi kesiti: u ∈ [0,1) bir dalga boyu. Rüzgâr yüzü (0 → tepe) yumuşak, kayma yüzü dik. */
function kesit(u, kayma) {
  const sf = 0.5 - 0.36 * kayma; // kayma yüzünün dalga boyuna oranı
  const tepe = 1 - sf;
  if (u < tepe) {
    const x = u / tepe;
    return Math.pow(ayrinti(x), 1.15);
  }
  const x = (u - tepe) / sf;
  return 1 - ayrinti(x);
}

function alanFn(P) {
  const n1 = gurultu(P.desen);
  const n2 = gurultu(P.desen * 7 + 3);
  const n3 = gurultu(P.desen * 13 + 5);
  const yon = (P.yon * Math.PI) / 180;
  const wx = Math.cos(yon), wy = Math.sin(yon);
  const L = P.siklik;
  const ic = P.cerceve ? CERCEVE.gen : 0;
  return (x, y) => {
    // Çerçeve: pervaz düz; içinde tepeler kenara doğru söner
    if (P.cerceve) {
      const kx = P.W / 2 - Math.abs(x), ky = P.D / 2 - Math.abs(y);
      const k = Math.min(kx, ky);
      if (k < ic) return P.Y * 0.42 + 1.2; // pervaz yüksekliği
    }
    const a = x * wx + y * wy;
    const b = -x * wy + y * wx;
    // Kıvrım: sırtlar düz değil, hilal gibi kıvrılır
    const kv = P.kivrim * L * (0.55 * Math.sin((b / (L * 1.7)) * Math.PI * 2 + n1(b / L, 0.3) * 4) + 0.6 * (n2(b / (L * 0.8), a / (L * 2.2)) - 0.5));
    const a2 = a + kv;
    const u = ((a2 / L) % 1 + 1) % 1;
    const sirt = Math.floor(a2 / L);
    const genlik = 0.45 + 0.55 * n3(b / (L * 1.3) + sirt * 3.1, sirt * 0.7);
    let h = P.Y * genlik * kesit(u, P.kayma);
    // İkinci ölçek: büyük tepelerin üstüne binen küçük tepeler (biraz
    // başka yönden esen rüzgâr), asıl tepelerin rüzgâr yüzünde belirgin
    {
      const y2 = yon + 0.45;
      const a3 = x * Math.cos(y2) + y * Math.sin(y2) + 0.35 * L * (n2(b / (L * 0.5), a / L) - 0.5);
      const u2 = ((a3 / (L * 0.42)) % 1 + 1) % 1;
      const sf = 0.5 - 0.36 * P.kayma;
      const yuz = u < 1 - sf ? 1 : 0.35;
      h += P.Y * 0.2 * yuz * (0.5 + 0.5 * n1(x / 22, y / 22)) * kesit(u2, P.kayma * 0.8);
    }
    // Taban kumu: tepeler arası çukurlar sıfıra inmesin
    h += P.Y * 0.08 * n2(x / 30, y / 30);
    // Dalgacıklar: rüzgâra dik, yalnız rüzgâr yüzünde belirgin
    if (P.dalgacik) {
      const sf = 0.5 - 0.36 * P.kayma;
      const yuz = u < 1 - sf ? 1 : 0.15;
      const d = Math.sin(((a + 1.4 * n1(b / 9, a / 9)) / 2.4) * Math.PI * 2);
      h += 0.32 * yuz * d;
    }
    if (P.cerceve) {
      const kx = P.W / 2 - Math.abs(x), ky = P.D / 2 - Math.abs(y);
      const k = Math.min(kx, ky) - ic;
      const son = ayrinti(clamp(k / CERCEVE.pay, 0, 1));
      h = h * son + (1 - son) * Math.min(h, P.Y * 0.2);
      // Pervazın iç kenarı 45° pahla tarlaya iner (yukarı bakan yüzey)
      h = Math.max(h, P.Y * 0.42 + 1.2 - k);
    }
    return Math.max(0, h);
  };
}

const S_ = sahneKur({ tuval: el("kp-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.25, -0.8, 0.62);
const mat = malzeme(RENK.kum, { roughness: 0.78 });
let SON = null;

function kur() {
  const P = oku();
  const g = yuzeyKur({ W: P.W, D: P.D, adim: P.adim, h: alanFn(P), taban: P.taban });
  mat.color.setHex(RENK[P.renk] ?? RENK.kum);
  S_.modeliYaz([ag(g, mat, "pano")]);
  // Alçak, yandan gelen güneş: kum tepeleri gölgeyle belirginleşir
  {
    const c = S_.kutu.getCenter(new THREE.Vector3());
    const r = Math.max(P.W, P.D);
    S_.gunes.position.set(c.x - r * 1.1, c.y - r * 0.35, c.z + r * 0.42);
    S_.gunes.intensity = 2.6;
  }
  const v = hacim(g);
  // Pano dolu basılmaz: 3 perimetre + %15 dolgu ≈ kabuk + iç
  const kabukOran = Math.min(1, 0.35 + 8000 / Math.max(1, v));
  const kutleG = ((v * kabukOran) / 1000) * PLA;
  const sureSaat = (v * kabukOran) / 7 / 3600 + 0.3;
  const boyut = S_.kutu.getSize(new THREE.Vector3());
  SON = { P, g, v, olcum: { kutleG, sureSaat }, boyut };
  bilgiYaz();
  if (!S_.elleOynandi) S_.ortala();
  window.__ADJY_KP = {
    hazir: true,
    olcum: SON.olcum,
    olcu: `${boyut.x.toFixed(0)} × ${boyut.y.toFixed(0)} × ${boyut.z.toFixed(1)} mm`,
  };
}

function bilgiYaz() {
  const { P, boyut, olcum: o, v, g } = SON;
  el("kp-olcu").textContent = `${boyut.x.toFixed(0)} × ${boyut.y.toFixed(0)} mm · ${boyut.z.toFixed(1)} mm yükseklik`;
  const u = el("kp-uyari");
  const uyar = P.siklik < P.Y * 2.2 ? "Tepeler çok sık ve yüksek: aralığı açın ya da yüksekliği azaltın" : "";
  u.hidden = !uyar;
  u.textContent = uyar;
  tabloYaz(el("kp-tablo"), [
    ["Dış ölçü", `${boyut.x.toFixed(1)} × ${boyut.y.toFixed(1)} × ${boyut.z.toFixed(1)} mm`],
    ["Desen", `#${P.desen} · rüzgâr ${P.yon}° · aralık ${P.siklik} mm`],
    ["Hacim", `${(v / 1000).toFixed(1)} cm³`],
    ["Filament (PLA)", `${o.kutleG.toFixed(0)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
    ["Üçgen", `${(g.attributes.position.count / 3).toLocaleString("tr-TR")}`],
  ]);
}

function onEk() {
  const P = SON.P;
  return `KUM_TEPESI_${Math.round(P.W)}x${Math.round(P.D)}_desen${P.desen}_${P.renk}`;
}
el("kp-stl").addEventListener("click", () => {
  if (!SON) return;
  indir(stl([SON.g], onEk()), `${onEk()}.stl`, "model/stl");
});
el("kp-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, boyut, olcum: o } = SON;
  indir(csv([
    ["Alan", "Deger"], ["Desen", P.desen], ["Ruzgar_derece", P.yon], ["Tepe_araligi_mm", P.siklik],
    ["Kivrim", P.kivrim], ["Kayma", P.kayma], ["Tepe_yuksekligi_mm", P.Y], ["Dalgacik", P.dalgacik ? "evet" : "hayir"],
    ["Cerceve", P.cerceve ? "evet" : "hayir"], ["Renk", P.renk],
    ["Olcu_mm", `${boyut.x.toFixed(1)} x ${boyut.y.toFixed(1)} x ${boyut.z.toFixed(1)}`],
    ["Kutle_g_PLA", o.kutleG.toFixed(0)], ["Sure_sa", o.sureSaat.toFixed(2)],
  ]), `${onEk()}_bilgi.csv`, "text/csv;charset=utf-8");
});

const HAZIR = {
  hilal: { "kp-yon": 35, "kp-siklik": 46, "kp-kivrim": 70, "kp-kayma": 75, "kp-yuk": 12, "kp-desen": 12 },
  deniz: { "kp-yon": 0, "kp-siklik": 26, "kp-kivrim": 25, "kp-kayma": 55, "kp-yuk": 7, "kp-desen": 31 },
  kivrik: { "kp-yon": 60, "kp-siklik": 58, "kp-kivrim": 100, "kp-kayma": 40, "kp-yuk": 14, "kp-desen": 57 },
  yalniz: { "kp-yon": 20, "kp-siklik": 90, "kp-kivrim": 45, "kp-kayma": 85, "kp-yuk": 18, "kp-desen": 4 },
};
document.querySelectorAll("[data-hazir]").forEach((b) => {
  b.addEventListener("click", () => {
    alanlariYaz(HAZIR[b.dataset.hazir] || {});
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.toggle("on", x === b));
  });
});
el("kp-yeni").addEventListener("click", () => {
  const simdi = sayi("kp-desen", 12);
  let n = simdi;
  while (n === simdi) n = 1 + Math.floor(Math.random() * 99);
  alanlariYaz({ "kp-desen": n });
  document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.remove("on"));
});

formBagla((t) => {
  if (t && ["kp-gen", "kp-der"].includes(t.id)) S_.elleOynandi = false;
  S_.yenile?.();
});
S_.dongu(kur);
