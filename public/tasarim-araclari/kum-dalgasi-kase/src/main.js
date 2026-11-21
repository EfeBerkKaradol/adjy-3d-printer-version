/* ==========================================================================
   KUM DALGASI KASE

   Kap üreticisiyle (../_adjy/arac-ortak.js → kapKur) tek kapalı ağ:
     profil → kase, lale ya da düz; tabandan ağza yarıçap. Açılma eğimi
              sayısal olarak sınırlanır: duvar hiçbir yerde 43,5°'den
              fazla açılmaz (desteksiz). İstenen ağız çapına
              ulaşılamazsa ulaşılan çap yazılır.
     dalga  → kum dalgacığı gibi asimetrik sırtlar: bir yüzü yumuşak,
              öbürü dik; burgu sırtları gövde boyunca döndürür
     ağız   → isteğe bağlı dalgalı kenar

   Birim mm, Z yukarı, taban tablaya oturur.
   ========================================================================== */
import {
  THREE, el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, hacim, stl, indir, csv,
  formBagla, alanlariYaz, tabloYaz, sureYaz, kapKur, ayrinti, gurultu, PLA,
} from "../../_adjy/arac-ortak.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

const RENK = {
  kum: 0xd8b98a, okra: 0xc9965a, baharat: 0xc77b2a, pas: 0xa4532f,
  kemik: 0xece3cf, gece: 0x24324d, antrasit: 0x2f3033,
};
// Dış yüzeyin aşağı bakma eğimi ≤ 0.95 (≈ 43,5°)
const EGIM = 0.95;

function oku() {
  return {
    profil: el("kd-profil").value,
    D: clamp(sayi("kd-cap", 170), 70, 220),
    H: clamp(sayi("kd-yuk", 65), 25, 180),
    tabanOran: clamp(sayi("kd-taban-oran", 60), 35, 95) / 100,
    dalga: Math.round(clamp(sayi("kd-dalga", 22), 6, 48)),
    derin: clamp(sayi("kd-derin", 2.6), 0, 6),
    burgu: clamp(sayi("kd-burgu", 55), 0, 180),
    kayma: clamp(sayi("kd-kayma", 65), 0, 100) / 100,
    dalgaliAgiz: el("kd-dalgali-agiz").checked,
    renk: el("kd-renk").value,
    duvar: clamp(sayi("kd-duvar", 2.0), 1.6, 3.2),
    taban: clamp(sayi("kd-taban", 2.4), 1.6, 4),
  };
}

/** Kum dalgacığı kesiti: u ∈ [0,1); yumuşak yükselir, dik iner */
function dalgaKesit(u, kayma) {
  const sf = 0.5 - 0.38 * kayma;
  const tepe = 1 - sf;
  return u < tepe ? ayrinti(u / tepe) : 1 - ayrinti((u - tepe) / sf);
}

/**
 * Profil tablosu: t → yarıçap. Dış yüzey = profil + W(t, f) (dalgalar,
 * dudak). Her satırda, ağın tam köşe noktalarında, yüzeyin aşağı bakma
 * eğimi ölçülür: dr/dz ≤ EGIM · √(1 + (∂r/r∂φ)²) (yana yatık yüzey daha çok
 * yükselebilir). Profilin büyümesi bu bütçeyle sınırlanır.
 */
function profilTablosu(P, n, M, W) {
  const R = P.D / 2;
  const r0 = P.profil === "silindir" ? R : R * P.tabanOran;
  const iste = (t) => {
    if (P.profil === "silindir") return R;
    if (P.profil === "lale") return r0 + (R - r0) * Math.pow(t, 1.7);
    return r0 + (R - r0) * Math.sin((t * Math.PI) / 2); // kase
  };
  const tab = new Float32Array(n + 1);
  tab[0] = iste(0);
  const dz = P.H / n;
  const df = (Math.PI * 2) / M;
  let once = new Float32Array(M);
  let simdi = new Float32Array(M);
  for (let j = 0; j < M; j++) once[j] = W(0, j * df);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    for (let j = 0; j < M; j++) simdi[j] = W(t, j * df);
    const r = tab[i - 1];
    let butce = Infinity;
    for (let j = 0; j < M; j++) {
      const artis = simdi[j] - once[j];
      if (artis <= 0) continue;
      const yan = Math.min(
        Math.abs(simdi[(j + 1) % M] - simdi[j]),
        Math.abs(simdi[j] - simdi[(j + M - 1) % M]),
      ) / (r * df);
      butce = Math.min(butce, EGIM * dz * Math.sqrt(1 + yan * yan) - artis);
    }
    tab[i] = Math.min(iste(t), tab[i - 1] + Math.max(0, butce));
    [once, simdi] = [simdi, once];
  }
  return tab;
}

const S_ = sahneKur({ tuval: el("kd-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.3, -0.9, 0.85);
const mat = malzeme(RENK.kum, { roughness: 0.66 });
let SON = null;

function kur() {
  const P = oku();
  const n = Math.max(40, Math.round(P.H / 0.7));
  const M = Math.min(720, Math.max(240, P.dalga * 18));
  // Burgu sırtları yana yatırır: yatıklık (R·burgu/H) ≤ 0.9 (~42°)
  const burguIste = (P.burgu * Math.PI) / 180;
  const burguSinir = (0.9 * P.H) / (P.D / 2 + P.derin);
  const burgu = Math.min(burguIste, burguSinir);
  const burguKisildi = burguIste > burguSinir + 0.01;
  const dalgaFn = (t, f) => {
    const faz = (((f + burgu * t) * P.dalga) / (Math.PI * 2)) % 1;
    return dalgaKesit((faz + 1) % 1, P.kayma);
  };
  // Dalga yüksekliği gürültüyle değişir (kumda her sırt başka), üstüne
  // ince ikincil dalgacık; tabanda dalga yavaşça başlar (taban düzgün otursun)
  const gr = gurultu(P.dalga * 17 + Math.round(P.burgu));
  const ince = (t, f) => {
    const faz = (((f + burgu * t * 1.4) * P.dalga * 3) / (Math.PI * 2)) % 1;
    return dalgaKesit((faz + 1) % 1, P.kayma) - 0.5;
  };
  const rampaH = Math.max(0.12 * P.H, 6);
  const dalgaW = (t, f) => {
    const ac = ayrinti(clamp((t * P.H) / rampaH, 0, 1));
    const genlik = 0.7 + 0.6 * gr(Math.cos(f) * 2.2 + 3, Math.sin(f) * 2.2 + t * 2.5);
    return P.derin * ac * (genlik * dalgaFn(t, f) + 0.18 * ince(t, f));
  };
  const dudakFn = (t) => {
    const tl = (t - 0.955) / 0.045;
    if (tl <= 0) return 0;
    return tl < 0.8 ? ayrinti(tl / 0.8) : 1 - 0.4 * ayrinti((tl - 0.8) / 0.2);
  };
  let tab = profilTablosu(P, n, M, dalgaW);
  // Ağız dudağı: yalnız ağızda profil dikken (eğim küçük) dışa yuvarlanır
  const tepeEgim = (tab[n] - tab[Math.max(0, n - 4)]) / ((4 * P.H) / n);
  const dudak = tepeEgim < 0.45 ? 1.2 : 0;
  if (dudak) tab = profilTablosu(P, n, M, (t, f) => dalgaW(t, f) + dudak * dudakFn(t));
  const rp = (t) => {
    const x = clamp(t, 0, 1) * n;
    const i = Math.min(n - 1, Math.floor(x));
    return tab[i] + (tab[i + 1] - tab[i]) * (x - i);
  };
  const dis = (t, f) => rp(t) + dalgaW(t, f) + (dudak ? dudak * dudakFn(t) : 0);
  const g = kapKur({
    H: P.H,
    M,
    n,
    dis,
    // İç yüzey düz: dalgalar yalnız dışta (içte sırtlar tavan yapardı)
    ic: (t) => rp(t) - P.duvar + (dudak ? dudak * ayrinti(clamp((t - 0.955) / 0.036, 0, 1)) : 0),
    taban: P.taban,
    tac: P.dalgaliAgiz ? (f) => P.derin * 1.6 * dalgaFn(1, f) : null,
    tacBas: 0.88,
  });
  mat.color.setHex(RENK[P.renk] ?? RENK.kum);
  S_.modeliYaz([ag(g, mat, "kase")]);
  const v = hacim(g);
  const kutleG = (v / 1000) * PLA;
  const sureSaat = v / 8 / 3600 + 0.25;
  const boyut = S_.kutu.getSize(new THREE.Vector3());
  const ulasilanCap = tab[n] * 2;
  SON = { P, g, v, olcum: { kutleG, sureSaat }, boyut, ulasilanCap, burguGercek: Math.round((burgu * 180) / Math.PI), burguKisildi };
  bilgiYaz();
  if (!S_.elleOynandi) S_.ortala();
  window.__ADJY_KD = {
    hazir: true,
    olcum: SON.olcum,
    olcu: `Ø${boyut.x.toFixed(0)} × ${boyut.z.toFixed(0)} mm`,
  };
}

function bilgiYaz() {
  const { P, boyut, olcum: o, v, ulasilanCap } = SON;
  el("kd-olcu").textContent = `Ø${boyut.x.toFixed(0)} × ${boyut.z.toFixed(0)} mm`;
  const uyarilar = [];
  if (ulasilanCap < P.D - 1) uyarilar.push(`Duvar 45°'den fazla açılmasın diye ağız Ø${ulasilanCap.toFixed(0)} mm'de kaldı: yüksekliği artırın ya da tabanı genişletin`);
  if (SON.burguKisildi) uyarilar.push(`Burgu desteksiz baskı için ${SON.burguGercek}°'de tutuldu`);
  const uyar = uyarilar.join(" · ");
  const u = el("kd-uyari");
  u.hidden = !uyar;
  u.textContent = uyar;
  tabloYaz(el("kd-tablo"), [
    ["Dış ölçü", `${boyut.x.toFixed(1)} × ${boyut.y.toFixed(1)} × ${boyut.z.toFixed(1)} mm`],
    ["Profil", `${P.profil} · taban Ø${(P.D * (P.profil === "silindir" ? 1 : P.tabanOran)).toFixed(0)} mm`],
    ["Dalga", `${P.dalga} × ${P.derin} mm · burgu ${SON.burguGercek}°`],
    ["Hacim", `${(v / 1000).toFixed(1)} cm³`],
    ["Filament (PLA)", `${o.kutleG.toFixed(0)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
  ]);
}

function onEk() {
  const P = SON.P;
  return `KUM_DALGASI_${P.profil}_D${Math.round(P.D)}_H${Math.round(P.H)}_${P.dalga}dalga_${P.renk}`;
}
el("kd-stl").addEventListener("click", () => {
  if (!SON) return;
  indir(stl([SON.g], onEk()), `${onEk()}.stl`, "model/stl");
});
el("kd-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, boyut, olcum: o } = SON;
  indir(csv([
    ["Alan", "Deger"], ["Profil", P.profil], ["Agiz_cap_mm", SON.ulasilanCap.toFixed(1)], ["Yukseklik_mm", P.H],
    ["Taban_oran", P.tabanOran], ["Dalga", P.dalga], ["Dalga_derinlik_mm", P.derin], ["Burgu_derece", P.burgu],
    ["Dalgali_agiz", P.dalgaliAgiz ? "evet" : "hayir"], ["Duvar_mm", P.duvar], ["Renk", P.renk],
    ["Olcu_mm", `${boyut.x.toFixed(1)} x ${boyut.y.toFixed(1)} x ${boyut.z.toFixed(1)}`],
    ["Kutle_g_PLA", o.kutleG.toFixed(0)], ["Sure_sa", o.sureSaat.toFixed(2)],
  ]), `${onEk()}_bilgi.csv`, "text/csv;charset=utf-8");
});

const HAZIR = {
  meyve: { "kd-profil": "kase", "kd-cap": 170, "kd-yuk": 65, "kd-taban-oran": 60, "kd-dalga": 22, "kd-derin": 2.6, "kd-burgu": 55, "kd-dalgali-agiz": false },
  anahtar: { "kd-profil": "kase", "kd-cap": 110, "kd-yuk": 30, "kd-taban-oran": 72, "kd-dalga": 16, "kd-derin": 1.8, "kd-burgu": 30, "kd-dalgali-agiz": true },
  derin: { "kd-profil": "silindir", "kd-cap": 130, "kd-yuk": 90, "kd-taban-oran": 90, "kd-dalga": 28, "kd-derin": 3, "kd-burgu": 90, "kd-dalgali-agiz": false },
  vazo: { "kd-profil": "lale", "kd-cap": 110, "kd-yuk": 170, "kd-taban-oran": 55, "kd-dalga": 14, "kd-derin": 4, "kd-burgu": 160, "kd-dalgali-agiz": true },
};
document.querySelectorAll("[data-hazir]").forEach((b) => {
  b.addEventListener("click", () => {
    alanlariYaz(HAZIR[b.dataset.hazir] || {});
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.toggle("on", x === b));
    S_.elleOynandi = false;
  });
});

formBagla((t) => {
  if (t && ["kd-cap", "kd-yuk", "kd-profil"].includes(t.id)) S_.elleOynandi = false;
  S_.yenile?.();
});
S_.dongu(kur);
