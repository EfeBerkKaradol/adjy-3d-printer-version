/* ==========================================================================
   ÇÖL KURDU KALEMLİK

   Boğumlu gövde, dişli ağız. Kap üreticisiyle tek kapalı ağ
   (bkz. ../_adjy/arac-ortak.js → kapKur):
     boğum  → her halkada yarıçap altta 45°'yi aşmadan genişler, üstte
              içe basamak yapar (yukarı bakan yüzey, sarkma yok)
     pul    → boğumların üstünde ince boyuna çizgiler
     ağız   → üçgen dişler; ağzın içine doğru eğilir (≤ 40°)
     eğri   → gövde ekseni yukarı doğru bir yana kayar (≤ 30°)

   Birim mm, Z yukarı, taban tablaya oturur, desteksiz.
   ========================================================================== */
import {
  THREE, el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, hacim, stl, indir, csv,
  formBagla, alanlariYaz, tabloYaz, sureYaz, kapKur, ayrinti, PLA,
} from "../../_adjy/arac-ortak.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

const RENK = {
  kum: 0xd8b98a, okra: 0xc9965a, baharat: 0xc77b2a, pas: 0xa4532f,
  kemik: 0xece3cf, gece: 0x24324d, antrasit: 0x2f3033,
};

function oku() {
  return {
    H: clamp(sayi("ck-yuk", 110), 60, 160),
    D: clamp(sayi("ck-cap", 72), 50, 120),
    egri: clamp(sayi("ck-egri", 12), 0, 30),
    bogum: Math.round(clamp(sayi("ck-bogum", 8), 3, 14)),
    bogumDerin: clamp(sayi("ck-bogum-derin", 14), 0, 30) / 100,
    pul: el("ck-pul").checked,
    dis: Math.round(clamp(sayi("ck-dis", 18), 0, 28)),
    disBoy: clamp(sayi("ck-dis-boy", 12), 0, 24),
    disEgim: clamp(sayi("ck-dis-egim", 22), 0, 40),
    renk: el("ck-renk").value,
    duvar: clamp(sayi("ck-duvar", 2.2), 1.6, 3.2),
    taban: clamp(sayi("ck-taban", 2.4), 1.6, 4),
  };
}

/** Diş biçimi: φ → 0..1 (üçgen, uçları hafif yuvarlak) */
function disFn(P) {
  if (!P.dis || !P.disBoy) return null;
  return (f) => {
    const u = ((f * P.dis) / (Math.PI * 2)) % 1;
    const tri = 1 - Math.abs(2 * u - 1);
    return Math.pow(tri, 1.25);
  };
}

function govdeKur(P) {
  const R = P.D / 2;
  const dis = disFn(P);
  const tacBas = 0.86;
  // Boğumlar yalnız gövdede (dudağın altı); dudak ve ağız düz sırtta başlar
  const govdeSon = dis ? tacBas - 0.075 : 1;
  const segH = (P.H * govdeSon) / P.bogum;
  // Dış yüzeyin eğimi = boğumun yükselişi + eksenin yatıklığı (eğri gövde)
  // ≤ 0.92 (~43°). Boğumun yükselen kısmı a; ayrinti() en dik yerde 1,5×.
  const a = 0.55; // boğumun yükselen kısmı
  const eksenEgim = Math.tan((P.egri * Math.PI) / 180);
  const boguEgim = Math.max(0.12, 0.92 - eksenEgim - 0.12 /* pul payı */);
  const dbMax = (boguEgim * a * segH) / (1.5 * R);
  const db = Math.min(P.bogumDerin, dbMax);
  const egimTan = Math.tan((P.disEgim * Math.PI) / 180);
  const Kp = Math.max(12, Math.round((Math.PI * P.D) / 5.5)); // pul çizgisi sayısı
  const egriTan = Math.tan((P.egri * Math.PI) / 180);
  // Dudak yüksekliği: yükselişi (1,5 × dudakH / boy) + eksen yatıklığı ≤ 0.85
  const dudakBoy = 0.5 * 0.075 * P.H;
  const dudakH = clamp(((0.85 - egriTan) * dudakBoy) / 1.5, 0, 1.6);
  const r = (t, f) => {
    let k = 1;
    if (t < govdeSon) {
      const tb = t / govdeSon;
      const u = (tb * P.bogum) % 1;
      const son = tb * P.bogum >= P.bogum - 1; // son boğum dudağa kadar düz gider
      if (u < a) k = ayrinti(u / a);
      else if (u < 0.86 || son) k = 1;
      else k = 1 - ayrinti((u - 0.86) / 0.14); // üstte içe basamak (yukarı bakan yüzey)
    }
    let rr = R * (1 - db + db * k);
    // Pullar: baklava örgüsü (iki yöne eğik dalganın toplamı), boğumların sırtında
    if (P.pul) {
      const z = t * P.H;
      const dz = (z / 4.2) * Math.PI * 2;
      // Yalnız boğumun düz sırtında (k³): eğimli kısımda boğum eğimine eklenip 45°'yi aşmasın
      // Dudağa yaklaşırken söner (dudağın yükselişine eklenmesin)
      const sonum = clamp((govdeSon - t) / 0.03, 0, 1);
      rr += 0.42 * k * k * k * sonum * 0.5 * (Math.cos(f * Kp + dz) + Math.cos(f * Kp - dz));
    }
    // Dudak: dişlerin altında kalın halka. Altı ≤ ~40° açılır, üstü içe döner.
    if (dis) {
      const tl = (t - (tacBas - 0.075)) / 0.075;
      if (tl > 0 && tl < 1) rr += dudakH * (tl < 0.5 ? ayrinti(tl / 0.5) : 1 - ayrinti((tl - 0.5) / 0.5));
    }
    // Dişler ağza doğru içe eğilir
    if (dis) {
      const tac = P.disBoy * dis(f) * ayrinti(clamp((t - tacBas) / (1 - tacBas), 0, 1));
      rr -= tac * egimTan;
    }
    return rr;
  };
  // İç yüzey: gövdede düz (boğumların içte tavan yapması desteksiz
  // basılmazdı), dudak ve dişlerde dış yüzeyi duvar kadar içeriden izler.
  const icSabit = R * (1 - db) - P.duvar - 0.6;
  const icBas = tacBas - 0.075;
  const ic = (t, f) => {
    const izle = r(t, f) - P.duvar;
    if (t <= icBas) return Math.min(icSabit, izle);
    // İç yüzey yukarı doğru eksen yatıklığıyla birlikte ≤ 0.8 eğimle açılır
    return Math.min(izle, icSabit + (t - icBas) * P.H * Math.max(0.25, 0.8 - egriTan));
  };
  const g = kapKur({
    H: P.H,
    ic,
    M: Math.max(160, Math.min(360, (P.dis || 1) * 14, Math.round(Math.PI * P.D / 0.8))),
    n: Math.round(P.H / 0.8),
    dis: r,
    duvar: P.duvar,
    taban: P.taban,
    tac: dis ? (f) => P.disBoy * dis(f) : null,
    tacBas,
    eksen: (t) => [P.H * egriTan * t * t * 0.5, 0],
  });
  return { g, db };
}

const S_ = sahneKur({ tuval: el("ck-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.45, -0.95, 0.55);
const mat = malzeme(RENK.okra, { roughness: 0.62 });
let SON = null;

function kur() {
  const P = oku();
  const { g, db } = govdeKur(P);
  mat.color.setHex(RENK[P.renk] ?? RENK.okra);
  S_.modeliYaz([ag(g, mat, "kalemlik")]);
  const v = hacim(g);
  const kutleG = (v / 1000) * PLA;
  const sureSaat = v / 7.5 / 3600 + 0.25;
  const boyut = S_.kutu.getSize(new THREE.Vector3());
  SON = { P, g, v, db, olcum: { kutleG, sureSaat }, boyut };
  bilgiYaz();
  if (!S_.elleOynandi) S_.ortala();
  window.__ADJY_CK = {
    hazir: true,
    olcum: SON.olcum,
    olcu: `${boyut.x.toFixed(0)} × ${boyut.y.toFixed(0)} × ${boyut.z.toFixed(0)} mm`,
  };
}

function bilgiYaz() {
  const { P, boyut, olcum: o, v, db } = SON;
  el("ck-olcu").textContent = `Ø${P.D} × ${boyut.z.toFixed(0)} mm`;
  const uyarilar = [];
  if (db < P.bogumDerin - 0.015) uyarilar.push(`Boğum derinliği desteksiz baskı için %${Math.round(db * 100)}'e indirildi`);
  const icCap = P.D * (1 - db) - 2 * P.duvar - 2 * P.disBoy * Math.tan((P.disEgim * Math.PI) / 180);
  if (icCap < 22) uyarilar.push("Ağız çok daralıyor: dişleri kısaltın ya da eğimi azaltın");
  const u = el("ck-uyari");
  u.hidden = !uyarilar.length;
  u.textContent = uyarilar.join(" · ");
  tabloYaz(el("ck-tablo"), [
    ["Dış ölçü", `${boyut.x.toFixed(1)} × ${boyut.y.toFixed(1)} × ${boyut.z.toFixed(1)} mm`],
    ["Boğum", `${P.bogum} × %${Math.round(db * 100)}`],
    ["Diş", P.dis && P.disBoy ? `${P.dis} × ${P.disBoy} mm, ${P.disEgim}° içe` : "yok"],
    ["Ağız iç çapı ≈", `${Math.max(0, icCap).toFixed(0)} mm`],
    ["Hacim", `${(v / 1000).toFixed(1)} cm³`],
    ["Filament (PLA)", `${o.kutleG.toFixed(0)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
  ]);
}

function onEk() {
  const P = SON.P;
  return `COL_KURDU_H${Math.round(P.H)}_D${Math.round(P.D)}_${P.bogum}bogum_${P.dis}dis_${P.renk}`;
}
el("ck-stl").addEventListener("click", () => {
  if (!SON) return;
  indir(stl([SON.g], onEk()), `${onEk()}.stl`, "model/stl");
});
el("ck-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, boyut, olcum: o } = SON;
  indir(csv([
    ["Alan", "Deger"], ["Yukseklik_mm", P.H], ["Cap_mm", P.D], ["Egri_derece", P.egri], ["Bogum", P.bogum],
    ["Bogum_derinlik", SON.db.toFixed(2)], ["Pul", P.pul ? "evet" : "hayir"], ["Dis", P.dis], ["Dis_boy_mm", P.disBoy],
    ["Dis_egim_derece", P.disEgim], ["Duvar_mm", P.duvar], ["Taban_mm", P.taban], ["Renk", P.renk],
    ["Olcu_mm", `${boyut.x.toFixed(1)} x ${boyut.y.toFixed(1)} x ${boyut.z.toFixed(1)}`],
    ["Kutle_g_PLA", o.kutleG.toFixed(0)], ["Sure_sa", o.sureSaat.toFixed(2)],
  ]), `${onEk()}_bilgi.csv`, "text/csv;charset=utf-8");
});

const HAZIR = {
  klasik: { "ck-yuk": 110, "ck-cap": 72, "ck-egri": 12, "ck-bogum": 8, "ck-bogum-derin": 12, "ck-dis": 18, "ck-dis-boy": 12, "ck-dis-egim": 22, "ck-pul": true },
  yasli: { "ck-yuk": 130, "ck-cap": 78, "ck-egri": 18, "ck-bogum": 7, "ck-bogum-derin": 16, "ck-dis": 24, "ck-dis-boy": 16, "ck-dis-egim": 30, "ck-pul": true },
  yavru: { "ck-yuk": 80, "ck-cap": 60, "ck-egri": 6, "ck-bogum": 5, "ck-bogum-derin": 12, "ck-dis": 12, "ck-dis-boy": 7, "ck-dis-egim": 18, "ck-pul": false },
  saksi: { "ck-yuk": 100, "ck-cap": 110, "ck-egri": 0, "ck-bogum": 6, "ck-bogum-derin": 10, "ck-dis": 22, "ck-dis-boy": 8, "ck-dis-egim": 10, "ck-pul": true },
};
document.querySelectorAll("[data-hazir]").forEach((b) => {
  b.addEventListener("click", () => {
    alanlariYaz(HAZIR[b.dataset.hazir] || {});
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.toggle("on", x === b));
    S_.elleOynandi = false;
  });
});

formBagla((t) => {
  if (t && ["ck-yuk", "ck-cap"].includes(t.id)) S_.elleOynandi = false;
  S_.yenile?.();
});
S_.dongu(kur);
