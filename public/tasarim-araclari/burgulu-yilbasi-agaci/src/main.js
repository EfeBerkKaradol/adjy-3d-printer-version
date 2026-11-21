/* ==========================================================================
   BURGULU YILBAŞI AĞACI

   Gövde, yıldız kesitli halkaların üst üste dizilmesiyle kurulur
   (tek kapalı ağ, CSG yok):

     r(z, φ) = R · zarf(t) · kesit(φ − burgu·t)        t = z / H
     kesit    → K kollu yumuşak yıldız: 1 − d·(1 − cos Kφ)/2
     zarf     → konik, kavisli ya da kademeli (katlar)

   Desteksiz baskı:
     - Kademeli biçimde her katın altı 45°'den dik olmayan bir pahla
       genişler, katın üstü içe basamak yapar (yukarı bakan yüzey).
     - LED yuvalı ağaçta iç boşluk dış yüzeyi duvar kalınlığı kadar
       içeriden izler; tavanı 45° koni, düz tavan yok. Alttan Ø40 mm'lik
       mum LED'i sığar.
     - Yıldız ayrı basılır (yatık, tablaya düz), dili tepedeki yuvaya
       geçer.

   Birim mm, Z yukarı.
   ========================================================================== */
import {
  THREE, el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, hacim, olcum, stl, indir, csv,
  formBagla, alanlariYaz, tabloYaz, sureYaz,
} from "../../_adjy/arac-ortak.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

const RENK = {
  yesil: 0x1f6b3a, cam: 0x2f7d4f, beyaz: 0xf3f1ea, altin: 0xd2a347, kirmizi: 0xc4202b,
  gumus: 0xb9bcc2, sari: 0xf0c23a, lacivert: 0x1d2a52,
};
const LED_CAP = 40; // mum LED (tealight) Ø38 + boşluk
// Yıldız dili ve yuvası. Dil yıldızla aynı ekstrüzyonda: pah her yönde
// 0,5 mm büyütür → dilin dış ölçüsü (en + 1) × (kal + 1) = 3,8 × 4,2 mm.
// Yuva 0,4 mm boşlukla 4,2 × 4,6 mm; köşegeni 6,2 mm, tepe Ø10,4 mm →
// yuvanın çevresinde en az 2 mm et kalır.
const DIL = { en: 2.8, kal: 3.2, pah: 0.5 };
const YUVA = { en: DIL.en + 2 * DIL.pah + 0.4, boy: DIL.kal + 2 * DIL.pah + 0.4, derin: 9 };
const TEPE_R = 5.2; // yıldızlı ağacın tepe yarıçapı (mm)
const YILDIZ_ARA = 0.8; // yıldızın en alt ucu ile tepe arasındaki boşluk (mm)
// Kollar tepeye yaklaşırken yuvarlağa döner: yuvanın çevresi her yönde dolu
const TEPE_YUMUSAK = 0.16;

function oku() {
  return {
    H: clamp(sayi("ag-yukseklik", 160), 80, 260),
    D: clamp(sayi("ag-cap", 100), 50, 160),
    K: Math.round(clamp(sayi("ag-kol", 7), 4, 12)),
    d: clamp(sayi("ag-derinlik", 32), 10, 60) / 100,
    burgu: clamp(sayi("ag-burgu", 180), 0, 540),
    bicim: el("ag-bicim").value,
    kat: Math.round(clamp(sayi("ag-kat", 5), 3, 9)),
    led: el("ag-led").checked,
    yildiz: el("ag-yildiz").checked,
    yildizCap: clamp(sayi("ag-yildiz-cap", 42), 25, 70),
    renk: el("ag-renk").value,
    renkYildiz: el("ag-renk-yildiz").value,
    toplar: el("ag-toplar").checked,
    doku: el("ag-doku").checked,
    renkTop: el("ag-renk-top").value,
    duvar: clamp(sayi("ag-duvar", 2.2), 1.2, 4),
    adim: clamp(sayi("ag-adim", 1.2), 0.6, 3),
  };
}

// ---------------------------------------------------------------- PROFİL
function zarfFn(P) {
  const R = P.D / 2;
  const tepe = P.yildiz ? TEPE_R : 1.6; // tepe yarıçapı (mm)
  const tepeOran = tepe / R;
  const N = P.kat;
  const katH = P.H / N;
  return (t) => {
    let e;
    if (P.bicim === "kavisli") e = tepeOran + (1 - tepeOran) * Math.pow(1 - t, 1.3);
    else e = tepeOran + (1 - tepeOran) * (1 - t);
    if (P.bicim === "kademeli" && t < 1) {
      // Her katta: altta kısa 45° pah ile genişler, sonra katın üstüne doğru incelir
      const u = (t * N) % 1;
      const r = R * e;
      const son = clamp((1 - t) / TEPE_YUMUSAK, 0, 1); // tepede basamak yok
      const basamak = son * Math.min(0.22, (0.9 * 0.28 * katH) / Math.max(1, r)); // pah ≤ ~42°
      const a = 0.28;
      const f = u < a ? 1 - basamak + basamak * (u / a) : 1 - basamak * ((u - a) / (1 - a));
      e *= f;
      // Tepe yarıçapının altına inmesin
      e = Math.max(e, tepeOran);
    }
    return e;
  };
}

/** Kol kesiti; t: yükseklik oranı. Tepeye yakın kollar yumuşakça yuvarlağa döner. */
function kesit(P, phi, t = 0) {
  const u = clamp((1 - t) / TEPE_YUMUSAK, 0, 1);
  const yumusak = u * u * (3 - 2 * u);
  return 1 - P.d * yumusak * (1 - Math.cos(P.K * phi)) * 0.5;
}

/**
 * İğne yaprağı dokusu (mm): kolların üstünde ince oluklar. Oluk sayısı kol
 * başına 7; kolların sırtında belirgin, aralarında söner; tabanın ilk
 * 2 mm'sinde ve tepede yok (taban düz otursun, yuva temiz kalsın).
 */
function doku(P, phi, t, z) {
  if (!P.doku) return 0;
  const u = clamp((1 - t) / TEPE_YUMUSAK, 0, 1);
  const sirt = 0.5 + 0.5 * Math.cos(P.K * phi); // kol sırtında 1
  const altSon = clamp(z / 2, 0, 1);
  return 0.38 * Math.sin(P.K * 7 * phi) * sirt * u * altSon;
}

// ---------------------------------------------------------------- AĞ
function agKur(P) {
  const R = P.D / 2;
  const zarf = zarfFn(P);
  const M = clamp(P.K * 22, 120, 264);
  const n = Math.ceil(P.H / P.adim);
  const burgu = (P.burgu * Math.PI) / 180;
  const pos = [];
  const tri = (a, b, c) => pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  /** İki halka arasında şerit; ust A'dan B'ye doğru. disa: standart yön */
  function serit(A, B, disa = true) {
    for (let j = 0; j < M; j++) {
      const j1 = (j + 1) % M;
      if (disa) {
        tri(A[j], A[j1], B[j1]);
        tri(A[j], B[j1], B[j]);
      } else {
        tri(A[j], B[j1], A[j1]);
        tri(A[j], B[j], B[j1]);
      }
    }
  }
  function yelpaze(merkez, H, asagi) {
    for (let j = 0; j < M; j++) {
      const j1 = (j + 1) % M;
      if (asagi) tri(merkez, H[j1], H[j]);
      else tri(merkez, H[j], H[j1]);
    }
  }
  const disR = (z, j) => {
    const t = clamp(z / P.H, 0, 1);
    const phi = (j / M) * Math.PI * 2;
    return R * zarf(t) * kesit(P, phi - burgu * t, t) + doku(P, phi - burgu * t, t, z);
  };
  const halka = (z, rFn) => {
    const h = new Array(M);
    for (let j = 0; j < M; j++) {
      const phi = (j / M) * Math.PI * 2;
      const r = rFn(j);
      h[j] = [r * Math.cos(phi), r * Math.sin(phi), z];
    }
    return h;
  };

  // Dış yüzey
  const dis = [];
  for (let i = 0; i <= n; i++) {
    const z = (P.H * i) / n;
    dis.push(halka(z, (j) => disR(z, j)));
  }
  for (let i = 0; i < n; i++) serit(dis[i], dis[i + 1], true);

  // Taban
  let ledUygun = false;
  let icHacimTepe = 0;
  if (P.led) {
    // İç boşluk: dış yüzeyden duvar kadar içeride, tavanı 45° koni
    const tepeZ = Math.min(P.H * 0.72, P.H - (P.yildiz ? YUVA.derin + 6 : 10));
    const icR = (z, j) => Math.min(disR(z, j) - P.duvar * 1.15, Math.max(0, tepeZ - z));
    // Alt ağızdan LED sığıyor mu (iç kesitin en dar yeri)
    let enDar = Infinity;
    for (let j = 0; j < M; j++) enDar = Math.min(enDar, icR(0, j));
    ledUygun = enDar * 2 >= LED_CAP;
    if (ledUygun) {
      const ic = [];
      let son = 0;
      for (let i = 0; i <= n; i++) {
        const z = (P.H * i) / n;
        if (z > tepeZ) break;
        const h = halka(z, (j) => Math.max(0.05, icR(z, j)));
        ic.push(h);
        son = z;
        let enBuyuk = 0;
        for (let j = 0; j < M; j++) enBuyuk = Math.max(enBuyuk, icR(z, j));
        if (enBuyuk < 0.6) break;
      }
      for (let i = 0; i < ic.length - 1; i++) serit(ic[i], ic[i + 1], false);
      // Boşluğun tepesi: son halkadan tek noktaya
      yelpaze([0, 0, son + 0.5], ic[ic.length - 1], true);
      // Taban halkası
      serit(dis[0], ic[0], false);
      icHacimTepe = son;
    }
  }
  if (!ledUygun) yelpaze([0, 0, 0], dis[0], true);

  // Tepe: yıldız yuvası ya da kapak
  const ust = dis[n];
  if (P.yildiz) {
    const dikdortgen = (z) => {
      const h = new Array(M);
      const a = YUVA.en / 2, b = YUVA.boy / 2;
      for (let j = 0; j < M; j++) {
        const phi = (j / M) * Math.PI * 2;
        const c = Math.cos(phi), s = Math.sin(phi);
        const k = Math.min(Math.abs(c) > 1e-9 ? a / Math.abs(c) : Infinity, Math.abs(s) > 1e-9 ? b / Math.abs(s) : Infinity);
        h[j] = [k * c, k * s, z];
      }
      return h;
    };
    const yt = dikdortgen(P.H), ya = dikdortgen(P.H - YUVA.derin);
    serit(ust, yt, true); // üst halka yüzeyi (+Z)
    serit(yt, ya, true); // yuva duvarı (içe bakar)
    yelpaze([0, 0, P.H - YUVA.derin], ya, false); // yuva tabanı (+Z)
  } else {
    yelpaze([0, 0, P.H], ust, false);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // Yumuşak gölgelendirme için yakın noktaları birleştir
  return { g, ledUygun, icHacimTepe };
}

/** Yıldız: tablaya yatık (Z 0..kalınlık), dili −Y yönünde */
function yildizKur(P) {
  const Rs = P.yildizCap / 2;
  const ri = Rs * 0.44;
  const s = new THREE.Shape();
  const nokta = [];
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const q = i % 2 ? ri : Rs;
    nokta.push(new THREE.Vector2(q * Math.cos(a), q * Math.sin(a)));
  }
  // Alt iç köşeye dil. Yıldızın en alt uçları (−Rs·cos36°) tepenin
  // YILDIZ_ARA üstünde dursun; dil oradan yuvanın dibine 0,6 mm kala
  // biter (pah dili 0,5 mm uzatır).
  // Pah uçları biraz uzatır (ölçülen ≈ 1,2 × pah)
  const altUc = Rs * Math.cos(Math.PI / 5) + DIL.pah * 1.2;
  const dilSonu = -(altUc + YILDIZ_ARA + YUVA.derin - 0.6 - DIL.pah);
  const alt = 5; // i=5 → a = 270°, iç köşe tam altta
  const yeni = [];
  for (let i = 0; i < nokta.length; i++) {
    if (i === alt) {
      const y0 = -ri + 1.2;
      yeni.push(new THREE.Vector2(-DIL.en / 2, y0), new THREE.Vector2(-DIL.en / 2, dilSonu), new THREE.Vector2(DIL.en / 2, dilSonu), new THREE.Vector2(DIL.en / 2, y0));
    } else yeni.push(nokta[i]);
  }
  s.setFromPoints(yeni);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: DIL.kal,
    bevelEnabled: true,
    bevelThickness: DIL.pah,
    bevelSize: DIL.pah,
    bevelSegments: 2,
    curveSegments: 1,
  });
  g.translate(0, 0, DIL.pah); // tabla Z=0
  g.computeVertexNormals();
  return { g, ri, altUc };
}

// ---------------------------------------------------------------- SAHNE
const S_ = sahneKur({ tuval: el("ag-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.35, -0.95, 0.42);
const matAgac = malzeme(RENK.yesil, { roughness: 0.5 });
const matYildiz = malzeme(RENK.altin, { roughness: 0.38 });
const matTop = malzeme(RENK.kirmizi, { roughness: 0.25, metalness: 0.0 });
let SON = null;

function kur() {
  const P = oku();
  const { g, ledUygun } = agKur(P);
  matAgac.color.setHex(RENK[P.renk] ?? RENK.yesil);
  matYildiz.color.setHex(RENK[P.renkYildiz] ?? RENK.altin);
  const aglar = [ag(g, matAgac, "agac")];
  let ys = null;
  if (P.yildiz) {
    ys = yildizKur(P);
    // Ekranda: dik durur, dili yuvada
    const goster = ys.g.clone();
    goster.translate(0, 0, -(DIL.kal / 2 + DIL.pah));
    goster.rotateX(Math.PI / 2);
    // En alt uçlar tepenin YILDIZ_ARA üstünde, dil yuvada
    goster.translate(0, 0, P.H + YILDIZ_ARA + ys.altUc);
    aglar.push(ag(goster, matYildiz, "yildiz"));
  }
  // Süs topları: kol sırtlarına, spiral boyunca. Topun büyük kısmı
  // gövdeye gömülü (merkez yüzeyin 0,15·r dışında): açıkta kalan alt
  // kısım küçük, desteksiz basılır.
  let gToplar = null;
  if (P.toplar) {
    const R = P.D / 2;
    const zarf = zarfFn(P);
    const burgu = (P.burgu * Math.PI) / 180;
    const rb = clamp(R * 0.075, 2.4, 4.2);
    const katSayisi = Math.max(3, Math.round(P.H / 28));
    const parca = [];
    for (let i = 0; i < katSayisi; i++) {
      const t = 0.12 + (0.72 * i) / Math.max(1, katSayisi - 1);
      const z = t * P.H;
      for (let k = 0; k < P.K; k += 2) {
        const kol = (k + (i % 2)) % P.K;
        const phi = burgu * t + (kol * Math.PI * 2) / P.K;
        const r = R * zarf(t) * kesit(P, 0, t) + rb * 0.15;
        const s = new THREE.SphereGeometry(rb, 14, 10);
        s.translate(r * Math.cos(phi), r * Math.sin(phi), z);
        parca.push(s);
      }
    }
    if (parca.length) {
      gToplar = mergeGeometries(parca, false);
      matTop.color.setHex(RENK[P.renkTop] ?? RENK.kirmizi);
      aglar.push(ag(gToplar, matTop, "toplar"));
    }
  }
  S_.modeliYaz(aglar);

  const vAgac = hacim(g);
  const vYildiz = ys ? hacim(ys.g) : 0;
  const o = olcum(vAgac + vYildiz, ys ? 1 : 0);
  // Büyük ağaçta dolgu %15: dolu hacmin tamamı basılmaz
  if (!P.led) {
    const kabuk = Math.min(1, 0.32 + 6000 / Math.max(1, vAgac));
    o.kutleG = ((vAgac * kabuk + vYildiz) / 1000) * 1.24;
    o.sureSaat = (vAgac * kabuk + vYildiz) / 8 / 3600 + 0.25;
  }
  const boyut = S_.kutu.getSize(new THREE.Vector3());

  // Burgu eğimi: kolun yana kayması / yükselme ≤ 1 (≈45°)
  const egim = ((P.D / 2) * (P.burgu * Math.PI / 180)) / P.H;
  SON = { P, g, ys, gToplar, vAgac, vYildiz, olcum: o, boyut, ledUygun, egim };
  bilgiYaz();
  if (!S_.elleOynandi) S_.ortala();
  window.__ADJY_AG = {
    hazir: true,
    olcum: o,
    olcu: `${boyut.x.toFixed(0)} × ${boyut.y.toFixed(0)} × ${boyut.z.toFixed(0)} mm`,
  };
}

function bilgiYaz() {
  const { P, boyut, olcum: o, vAgac, vYildiz, ledUygun, egim } = SON;
  el("ag-olcu").textContent = `Ø${boyut.x.toFixed(0)} × ${boyut.z.toFixed(0)} mm yükseklik`;
  const uyarilar = [];
  if (P.led && !ledUygun) uyarilar.push(`LED yuvası için taban çapını büyütün (mum LED Ø${LED_CAP - 2} mm)`);
  if (egim > 1.2) uyarilar.push("Burgu çok sert: azaltın ya da ağacı uzatın");
  const u = el("ag-uyari");
  u.hidden = !uyarilar.length;
  u.textContent = uyarilar.join(" · ");
  const ledNot = el("ag-led-not");
  ledNot.textContent = P.led && !ledUygun
    ? `Bu taban çapında mum LED (Ø${LED_CAP - 2} mm) sığmıyor; çapı büyütün ya da kol derinliğini azaltın.`
    : "Ağaç içi boş basılır; alttan pilli mum LED (Ø38 mm) konur, ışık gövdeden süzülür. Beyaz ya da açık renk önerilir.";
  ledNot.classList.toggle("uyari", P.led && !ledUygun);
  tabloYaz(el("ag-tablo"), [
    ["Dış ölçü", `${boyut.x.toFixed(1)} × ${boyut.y.toFixed(1)} × ${boyut.z.toFixed(1)} mm`],
    ["Biçim", `${P.bicim}${P.bicim === "kademeli" ? " · " + P.kat + " kat" : ""} · ${P.K} kol`],
    ["Burgu", `${P.burgu}° (eğim ${(Math.atan(egim) * 180 / Math.PI).toFixed(0)}°)`],
    ["Gövde", P.led && ledUygun ? `içi boş, duvar ${P.duvar} mm` : "dolu (dolgu %15)"],
    ["Ağaç hacmi", `${(vAgac / 1000).toFixed(1)} cm³`],
    ["Yıldız", P.yildiz ? `Ø${P.yildizCap} mm · ${(vYildiz / 1000).toFixed(1)} cm³` : "yok"],
    ["Filament (PLA)", `${o.kutleG.toFixed(0)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
    ["Baskı", P.led && ledUygun ? "vazo değil; 2–3 perimetre, desteksiz" : "desteksiz, dolgu %15"],
  ]);
}

// ---------------------------------------------------------------- ÇIKTILAR
function onEk() {
  const P = SON.P;
  return `AGAC_H${Math.round(P.H)}_D${Math.round(P.D)}_${P.K}kol_${P.bicim}${P.led ? "_LED" : ""}`;
}
el("ag-stl").addEventListener("click", () => {
  if (!SON) return;
  indir(stl([SON.g], onEk()), `${onEk()}_${SON.P.renk}.stl`, "model/stl");
});
el("ag-stl-yildiz").addEventListener("click", () => {
  if (!SON || !SON.ys) return;
  indir(stl([SON.ys.g], "yildiz"), `${onEk()}_yildiz_D${Math.round(SON.P.yildizCap)}_${SON.P.renkYildiz}.stl`, "model/stl");
});
el("ag-stl-toplar").addEventListener("click", () => {
  if (!SON || !SON.gToplar) return;
  indir(stl([SON.gToplar], "toplar"), `${onEk()}_toplar_${SON.P.renkTop}.stl`, "model/stl");
});
el("ag-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, boyut, olcum: o } = SON;
  indir(
    csv([
      ["Alan", "Deger"],
      ["Yukseklik_mm", P.H], ["Taban_cap_mm", P.D], ["Kol", P.K], ["Kol_derinlik", P.d],
      ["Burgu_derece", P.burgu], ["Bicim", P.bicim], ["Kat", P.kat], ["LED", P.led && SON.ledUygun ? "evet" : "hayir"],
      ["Yildiz", P.yildiz ? `D${P.yildizCap}` : "yok"], ["Renk", P.renk], ["Yildiz_renk", P.renkYildiz],
      ["Olcu_mm", `${boyut.x.toFixed(1)} x ${boyut.y.toFixed(1)} x ${boyut.z.toFixed(1)}`],
      ["Kutle_g_PLA", o.kutleG.toFixed(0)], ["Sure_sa", o.sureSaat.toFixed(2)],
    ]),
    `${onEk()}_bilgi.csv`,
    "text/csv;charset=utf-8"
  );
});

// Hazır ağaçlar
const HAZIR = {
  klasik: { "ag-bicim": "kademeli", "ag-kat": 5, "ag-kol": 7, "ag-derinlik": 30, "ag-burgu": 120, "ag-yukseklik": 160, "ag-cap": 100, "ag-renk": "yesil", "ag-led": false, "ag-yildiz": true },
  isikli: { "ag-bicim": "konik", "ag-kol": 9, "ag-derinlik": 22, "ag-burgu": 150, "ag-yukseklik": 180, "ag-cap": 110, "ag-renk": "beyaz", "ag-led": true, "ag-yildiz": true },
  modern: { "ag-bicim": "kavisli", "ag-kol": 5, "ag-derinlik": 45, "ag-burgu": 220, "ag-yukseklik": 150, "ag-cap": 80, "ag-renk": "altin", "ag-led": false, "ag-yildiz": false },
  mini: { "ag-bicim": "kademeli", "ag-kat": 4, "ag-kol": 6, "ag-derinlik": 35, "ag-burgu": 90, "ag-yukseklik": 90, "ag-cap": 60, "ag-renk": "kirmizi", "ag-led": false, "ag-yildiz": true, "ag-yildiz-cap": 30 },
};
document.querySelectorAll("[data-hazir]").forEach((b) => {
  b.addEventListener("click", () => {
    alanlariYaz(HAZIR[b.dataset.hazir] || {});
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.toggle("on", x === b));
    S_.elleOynandi = false;
  });
});

function gorunurluk() {
  const kademeli = el("ag-bicim").value === "kademeli";
  el("ag-kat-satir").hidden = !kademeli;
  el("ag-kat").disabled = !kademeli;
  const yildiz = el("ag-yildiz").checked;
  el("ag-yildiz-cap-satir").hidden = !yildiz;
  el("ag-yildiz-cap").disabled = !yildiz;
  el("ag-renk-yildiz-satir").hidden = !yildiz;
  el("ag-renk-top-satir").hidden = !el("ag-toplar").checked;
}

formBagla((t) => {
  if (t && ["ag-yukseklik", "ag-cap"].includes(t.id)) S_.elleOynandi = false;
  gorunurluk();
  S_.yenile?.();
});
gorunurluk();
S_.dongu(kur);
