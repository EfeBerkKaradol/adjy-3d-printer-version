/* ==========================================================================
   ÇÖL UFKU KATMANLI PANO

   Kat kat kum tepeleri, gökte iki ay. Dört renk, hepsi tablaya yatık:
     gök    → panonun tabanı (T0 kalınlık)
     ay     → gökte bir ya da iki disk (+0,8 mm)
     kum    → N kat; k. kat bir öncekinin önünde ve bir kat daha yüksek.
              Katlar açık / koyu kum renginde sırayla değişir, en öndeki koyu.
     çerçeve→ koyu kum renginde, bütün katlardan 0,8 mm yüksek

   Her katın alanı bir öncekinin içinde kalır (sırt çizgisi en az 1,6 mm
   aşağıda): üstteki kat her yerde alttakine oturur, sarkma yok. Gezgin
   figürü bütün alt katlara da eklenir (altı dolu bir sütun).
   ========================================================================== */
import {
  THREE, el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, maske, maskeBirlestir, maskeDoluMu, asindir,
  maskedenKati, hacim, olcum, stl, indir, csv, formBagla, alanlariYaz, tabloYaz, sureYaz,
  pahliKati, maskeCiz, yuvarlakKutu, gurultu,
} from "../../_adjy/arac-ortak.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

// gök, ay, açık kum, koyu kum
const PALET = {
  gunbatimi: { ad: "Gün batımı", gok: 0xf2c078, ay: 0xfff3d6, acik: 0xd98a4a, koyu: 0x8a4b2d },
  gece: { ad: "Gece", gok: 0x16203d, ay: 0xf0e9d2, acik: 0x7c8fb8, koyu: 0x3b4a78 },
  baharat: { ad: "Baharat", gok: 0xf6e2b8, ay: 0xc9541f, acik: 0xe0a35c, koyu: 0xa65a24 },
  kemik: { ad: "Kemik", gok: 0xd9cdb4, ay: 0xf7f3e8, acik: 0xb89f7a, koyu: 0x6e5a43 },
};
const CERCEVE = 3; // çerçeve genişliği (mm)
const ARA = 1.6; // iki sırt arasında en az görünen şerit (mm)

function oku() {
  const bicim = el("cu-bicim").value;
  const W = clamp(sayi("cu-gen", 130), 80, 220);
  let H = clamp(sayi("cu-yuk", 180), 80, 240);
  if (bicim === "daire") H = W;
  if (bicim === "kemer") H = Math.max(H, Math.round(W * 0.8));
  return {
    bicim, W, H,
    cerceve: el("cu-cerceve").checked,
    aski: el("cu-aski").checked,
    katman: Math.round(clamp(sayi("cu-katman", 5), 3, 7)),
    dalga: clamp(sayi("cu-dalga", 60), 10, 100),
    tohum: Math.round(clamp(sayi("cu-tohum", 7), 1, 99)),
    ay: el("cu-ay").value,
    gezgin: el("cu-gezgin").checked,
    palet: el("cu-palet").value,
    T0: clamp(sayi("cu-taban", 1.6), 1.2, 3),
    adim: clamp(sayi("cu-adim", 1), 0.6, 2),
    px: clamp(sayi("cu-px", 6), 4, 8),
  };
}

function sekilYolu(c, P) {
  const { W, H } = P;
  c.beginPath();
  if (P.bicim === "daire") c.arc(0, 0, W / 2, 0, Math.PI * 2);
  else if (P.bicim === "kemer") {
    const y0 = H / 2 - W / 2;
    c.moveTo(-W / 2, -H / 2);
    c.lineTo(W / 2, -H / 2);
    c.lineTo(W / 2, y0);
    c.arc(0, y0, W / 2, 0, Math.PI);
    c.closePath();
  } else yuvarlakKutu(c, -W / 2, -H / 2, W, H, 4);
  c.fill();
}

/** Sırt çizgileri: her kat için x boyunca yükseklik; k. kat (k−1).'nin en az ARA altında */
function sirtlar(P) {
  const gr = gurultu(P.tohum * 31 + 5);
  const adim = 0.5;
  const n = Math.ceil((P.W + 4) / adim) + 1;
  const x0 = -P.W / 2 - 2;
  const yUst = P.H * 0.13, yAlt = -P.H * 0.38;
  const R = [];
  for (let k = 1; k <= P.katman; k++) {
    const t = (k - 1) / (P.katman - 1);
    const orta = yUst + (yAlt - yUst) * t;
    const A = (P.dalga / 100) * P.H * 0.105 * (0.75 + 0.6 * t);
    const lam = P.W * (0.7 - 0.3 * t);
    const r = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = (x0 + i * adim) / lam + k * 3.7;
      const yumusak = gr(u, k * 5.1) * 2 - 1;
      const keskin = 1 - Math.abs(gr(u * 2.3 + 9, k * 2.7 + 4) * 2 - 1); // rüzgârın bıçak gibi kestiği sırt
      r[i] = orta + A * (0.75 * yumusak + 0.7 * (keskin - 0.5));
      if (k > 1) r[i] = Math.min(r[i], R[k - 2][i] - ARA);
    }
    R.push(r);
  }
  const y = (k, x) => {
    const f = clamp((x - x0) / adim, 0, n - 1.001);
    const i = Math.floor(f);
    return R[k - 1][i] + (R[k - 1][i + 1] - R[k - 1][i]) * (f - i);
  };
  return { R, x0, adim, n, y };
}

/** Pelerinli, asalı küçük gezgin; ayakları (x, y0) noktasında */
function gezginCiz(c, x, y0, h) {
  c.beginPath();
  c.moveTo(x - h * 0.24, y0 - 1);
  c.lineTo(x + h * 0.2, y0 - 1);
  c.lineTo(x + h * 0.07, y0 + h * 0.78);
  c.lineTo(x - h * 0.07, y0 + h * 0.78);
  c.closePath();
  c.fill();
  c.beginPath();
  c.arc(x, y0 + h * 0.86, Math.max(1, h * 0.12), 0, Math.PI * 2);
  c.fill();
  c.lineWidth = Math.max(0.9, h * 0.07);
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(x + h * 0.3, y0 - 1);
  c.lineTo(x + h * 0.34, y0 + h * 1.05);
  c.stroke();
}

// ---------------------------------------------------------------- KUR
const S_ = sahneKur({ tuval: el("cu-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.1, -0.55, 0.95);
const mat = { gok: malzeme(0xf2c078), ay: malzeme(0xfff3d6), acik: malzeme(0xd98a4a), koyu: malzeme(0x8a4b2d) };
let SON = null;

function kur() {
  const P = oku();
  const pal = PALET[P.palet] ?? PALET.gunbatimi;
  const ust = P.bicim === "daire" ? P.W / 2 : P.H / 2;
  const gen = P.W + 4, yuk = P.H + 20, px = P.px;
  const halka = { x: 0, y: ust + 2.4, dis: 5.5, ic: 2.2 };

  // Bütün pano: şekil + askı halkası (deliği açık)
  const tam = maske(gen, yuk, px, (c) => {
    sekilYolu(c, P);
    if (P.aski) {
      c.beginPath();
      c.arc(halka.x, halka.y, halka.dis, 0, Math.PI * 2);
      c.fill();
    }
  });
  if (P.aski) maskeCiz(tam, (c) => { c.beginPath(); c.arc(halka.x, halka.y, halka.ic, 0, Math.PI * 2); c.fill(); }, "destination-out");

  // Resim alanı: çerçevenin içi
  const ic = asindir(maske(gen, yuk, px, (c) => sekilYolu(c, P)), P.cerceve ? CERCEVE : 0);
  let cerceve = null;
  let gok = tam;
  if (P.cerceve) {
    cerceve = maske(gen, yuk, px, () => {});
    maskeBirlestir(cerceve, tam, "source-over");
    maskeBirlestir(cerceve, ic, "destination-out");
    gok = maske(gen, yuk, px, () => {});
    maskeBirlestir(gok, ic, "source-over");
  }

  // Kum katları
  const S = sirtlar(P);
  const kG = Math.max(1, P.katman - 2);
  const gx = -P.W * 0.2;
  const gh = clamp(P.H * 0.075, 7, 15);
  const katlar = [];
  for (let k = 1; k <= P.katman; k++) {
    const m = maske(gen, yuk, px, (c) => {
      c.beginPath();
      c.moveTo(S.x0, -P.H / 2 - 4);
      for (let i = 0; i < S.n; i++) c.lineTo(S.x0 + i * S.adim, S.R[k - 1][i]);
      c.lineTo(S.x0 + (S.n - 1) * S.adim, -P.H / 2 - 4);
      c.closePath();
      c.fill();
      if (P.gezgin && k <= kG) gezginCiz(c, gx, S.y(kG, gx), gh);
    });
    maskeBirlestir(m, ic, "destination-in");
    katlar.push(m);
  }

  // Aylar: gökte, ilk kum katının arkasında
  const ay = maske(gen, yuk, px, (c) => {
    if (P.ay === "yok") return;
    // Gökte, ilk sırtın üstünde kalacak yükseklikte; ölçü kısa kenara göre
    const kisa = Math.min(P.W, P.H);
    const yOrta = P.bicim === "daire" ? P.W * 0.22
      : P.bicim === "kemer" ? clamp(P.H * 0.5 - P.W * 0.42, P.H * 0.22, P.H * 0.31)
      : P.H * 0.31;
    c.beginPath();
    c.arc(P.W * 0.1, yOrta, kisa * 0.115, 0, Math.PI * 2);
    c.fill();
    if (P.ay === "cift") {
      c.beginPath();
      c.arc(P.W * 0.1 + kisa * 0.17, yOrta + kisa * 0.1, kisa * 0.05, 0, Math.PI * 2);
      c.fill();
    }
  });
  maskeBirlestir(ay, asindir(maske(gen, yuk, px, (c) => sekilYolu(c, P)), (P.cerceve ? CERCEVE : 0) + 1.2), "destination-in");
  maskeBirlestir(ay, katlar[0], "destination-out");

  const zUst = P.T0 + P.katman * P.adim;
  const gGok = maskedenKati(gok, P.T0, 0);
  const gAy = maskeDoluMu(ay) ? pahliKati(ay, 0.8, P.T0, 0.3, 2) : null;
  const gAcik = [], gKoyu = [];
  katlar.forEach((m, i) => {
    if (!maskeDoluMu(m)) return;
    const g = maskedenKati(m, P.adim, P.T0 + i * P.adim);
    if (!g) return;
    ((P.katman - (i + 1)) % 2 === 0 ? gKoyu : gAcik).push(g);
  });
  const gCerceve = cerceve ? pahliKati(cerceve, zUst + 0.8, 0, 0.5, 2) : null;
  if (gCerceve) gKoyu.push(gCerceve);

  mat.gok.color.setHex(pal.gok);
  mat.ay.color.setHex(pal.ay);
  mat.acik.color.setHex(pal.acik);
  mat.koyu.color.setHex(pal.koyu);
  const aglar = [ag(gGok, mat.gok, "gok")];
  if (gAy) aglar.push(ag(gAy, mat.ay, "ay"));
  gAcik.forEach((g, i) => aglar.push(ag(g, mat.acik, `kum-acik-${i + 1}`)));
  gKoyu.forEach((g, i) => aglar.push(ag(g, mat.koyu, `kum-koyu-${i + 1}`)));
  S_.modeliYaz(aglar);

  const topla = (l) => l.reduce((s, g) => s + hacim(g), 0);
  const v = { gok: hacim(gGok), ay: hacim(gAy), acik: topla(gAcik), koyu: topla(gKoyu) };
  const renkSayisi = 1 + (gAy ? 1 : 0) + (gAcik.length ? 1 : 0) + (gKoyu.length ? 1 : 0);
  const o = olcum(v.gok + v.ay + v.acik + v.koyu, renkSayisi - 1);
  const boyut = S_.kutu.getSize(new THREE.Vector3());
  SON = { P, pal, gGok, gAy, gAcik, gKoyu, v, olcum: o, renkSayisi, boyut };

  bilgiYaz();
  if (!S_.elleOynandi) S_.ortala();
  window.__ADJY_CU = {
    hazir: true,
    olcum: o,
    olcu: `${boyut.x.toFixed(0)} × ${boyut.y.toFixed(0)} × ${boyut.z.toFixed(1)} mm`,
  };
}

function bilgiYaz() {
  const { P, pal, v, olcum: o, renkSayisi, boyut } = SON;
  el("cu-olcu").textContent = P.bicim === "daire" ? `Ø${P.W} mm` : `${P.W} × ${P.H} mm`;
  el("cu-yuk-satir").hidden = P.bicim === "daire";
  const u = el("cu-uyari");
  const kemerUyari = P.bicim === "kemer" && sayi("cu-yuk", 180) < P.W * 0.8;
  u.hidden = !kemerUyari;
  u.textContent = kemerUyari ? `Kemer için yükseklik ${P.H} mm'ye çıkarıldı` : "";
  el("cu-stl-ay").hidden = !SON.gAy;
  tabloYaz(el("cu-tablo"), [
    ["Dış ölçü", `${boyut.x.toFixed(1)} × ${boyut.y.toFixed(1)} × ${boyut.z.toFixed(1)} mm`],
    ["Kat", `${P.katman} × ${P.adim} mm · gök ${P.T0} mm`],
    ["Palet", `${pal.ad} · ${renkSayisi} filament`],
    ["Gök + ay", `${((v.gok + v.ay) / 1000).toFixed(1)} cm³`],
    ["Açık kum", `${(v.acik / 1000).toFixed(1)} cm³`],
    ["Koyu kum + çerçeve", `${(v.koyu / 1000).toFixed(1)} cm³`],
    ["Filament (PLA)", `${o.kutleG.toFixed(0)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
  ]);
}

function onEk() {
  const P = SON.P;
  return `COL_UFKU_${P.bicim}_${P.W}x${P.H}_${P.katman}kat_no${P.tohum}_${P.palet}`;
}
for (const [id, al, ad] of [
  ["cu-stl-gok", (s) => [s.gGok], "gok"], ["cu-stl-ay", (s) => (s.gAy ? [s.gAy] : []), "ay"],
  ["cu-stl-acik", (s) => s.gAcik, "kum_acik"], ["cu-stl-koyu", (s) => s.gKoyu, "kum_koyu"],
]) {
  el(id).addEventListener("click", () => {
    if (!SON) return;
    const l = al(SON);
    if (l.length) indir(stl(l, ad), `${onEk()}_${ad}.stl`, "model/stl");
  });
}
el("cu-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, boyut, olcum: o } = SON;
  indir(csv([
    ["Alan", "Deger"], ["Bicim", P.bicim], ["Genislik_mm", P.W], ["Yukseklik_mm", P.H], ["Cerceve", P.cerceve ? "evet" : "hayir"],
    ["Aski", P.aski ? "evet" : "hayir"], ["Kat", P.katman], ["Tepe_yuksekligi", P.dalga], ["Desen_no", P.tohum], ["Ay", P.ay],
    ["Gezgin", P.gezgin ? "evet" : "hayir"], ["Palet", P.palet], ["Gok_mm", P.T0], ["Kat_mm", P.adim],
    ["Olcu_mm", `${boyut.x.toFixed(1)} x ${boyut.y.toFixed(1)} x ${boyut.z.toFixed(1)}`],
    ["Kutle_g_PLA", o.kutleG.toFixed(0)], ["Sure_sa", o.sureSaat.toFixed(2)],
  ]), `${onEk()}_bilgi.csv`, "text/csv;charset=utf-8");
});

const HAZIR = {
  ikiay: { "cu-bicim": "kemer", "cu-gen": 130, "cu-yuk": 180, "cu-katman": 5, "cu-dalga": 60, "cu-tohum": 7, "cu-ay": "cift", "cu-gezgin": false, "cu-cerceve": true, "cu-palet": "gunbatimi" },
  gece: { "cu-bicim": "dikdortgen", "cu-gen": 180, "cu-yuk": 120, "cu-katman": 6, "cu-dalga": 70, "cu-tohum": 23, "cu-ay": "cift", "cu-gezgin": true, "cu-cerceve": true, "cu-palet": "gece" },
  baharat: { "cu-bicim": "daire", "cu-gen": 150, "cu-katman": 6, "cu-dalga": 80, "cu-tohum": 41, "cu-ay": "tek", "cu-gezgin": true, "cu-cerceve": true, "cu-palet": "baharat" },
  sessiz: { "cu-bicim": "dikdortgen", "cu-gen": 120, "cu-yuk": 160, "cu-katman": 4, "cu-dalga": 40, "cu-tohum": 64, "cu-ay": "yok", "cu-gezgin": false, "cu-cerceve": false, "cu-palet": "kemik" },
};
document.querySelectorAll("[data-hazir]").forEach((b) => {
  b.addEventListener("click", () => {
    alanlariYaz(HAZIR[b.dataset.hazir] || {});
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.toggle("on", x === b));
    S_.elleOynandi = false;
  });
});

formBagla((t) => {
  if (t && ["cu-gen", "cu-yuk", "cu-bicim"].includes(t.id)) S_.elleOynandi = false;
  S_.yenile?.();
});
S_.dongu(kur);
