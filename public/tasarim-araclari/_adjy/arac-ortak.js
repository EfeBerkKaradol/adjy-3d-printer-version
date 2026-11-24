/* ==========================================================================
   TASARIM ARAÇLARI — ORTAK MODÜL (genel)

   Yılbaşı araçlarıyla başlayan ortak parçalar (yilbasi-ortak.js: sahne,
   tuval konturu, STL, form) ve onlara eklenen genel katı üreticileri:

     kapKur      → kap / tüp: dış yüzey r(t, φ), iç yüzey duvar kadar içeride,
                   dolu taban ya da açık alt, isteğe bağlı taç (dişli ağız)
                   ve eğri eksen. Tek kapalı ağ, CSG yok.
     yuzeyKur    → yükseklik alanı (kabartma pano): üst yüzey h(x, y),
                   düz taban, dört yan duvar. Tek kapalı ağ.
     genislet    → tuval maskesini birleşik dış hattından dışa büyütür.

   Birim mm, Z yukarı. Bütün yüzeyler dışa bakar (işaretli hacim pozitif).
   ========================================================================== */
import { THREE, clamp, konturlar, asindir, maskedenKati } from "./yilbasi-ortak.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
export * from "./yilbasi-ortak.js";

const ayrinti = (t) => t * t * (3 - 2 * t);

// ---------------------------------------------------------------- AĞ YARDIMCILARI
function agYazici() {
  const pos = [];
  const tri = (a, b, c) => pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  /** İki halka arası şerit (A'dan B'ye). disa=true: tanjant × (B−A) yönünde normal */
  function serit(A, B, disa = true) {
    const M = A.length;
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
  /** Halka ile merkez arası yelpaze. asagi: normal −Z */
  function yelpaze(merkez, H, asagi) {
    const M = H.length;
    for (let j = 0; j < M; j++) {
      const j1 = (j + 1) % M;
      if (asagi) tri(merkez, H[j1], H[j]);
      else tri(merkez, H[j], H[j1]);
    }
  }
  function geometri() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }
  return { tri, serit, yelpaze, geometri, pos };
}

// ---------------------------------------------------------------- KAP / TÜP
/**
 * @param {object} o
 *   H        yükseklik (taç hariç)
 *   M        halka nokta sayısı
 *   n        halka sayısı (dikey)
 *   dis      (t, φ) → dış yarıçap (t: 0 taban … 1 ağız)
 *   ic       (t, φ) → iç yarıçap; verilmezse dis − duvar
 *   duvar    duvar kalınlığı (ic verilmezse)
 *   taban    dolu taban kalınlığı; 0 ise alt açık (tüp)
 *   tac      φ → ağızdaki ek yükseklik (dişler); tacBas'tan itibaren yumuşakça açılır
 *   tacBas   tacın başladığı t (vars. 0.82)
 *   eksen    t → [x, y] gövde ekseninin kayması (eğri gövde)
 */
export function kapKur(o) {
  const { H, M, n, dis } = o;
  const duvar = o.duvar ?? 2;
  const ic = o.ic || ((t, f) => Math.max(0.3, dis(t, f) - duvar));
  const taban = o.taban ?? 0;
  const tacBas = o.tacBas ?? 0.82;
  const eksen = o.eksen || (() => [0, 0]);
  const W = agYazici();
  const fi = (j) => (j / M) * Math.PI * 2;
  const tacZ = (t, f) => (o.tac ? o.tac(f) * ayrinti(clamp((t - tacBas) / (1 - tacBas), 0, 1)) : 0);
  const nokta = (t, j, rFn, zEk = 0) => {
    const f = fi(j);
    const r = rFn(t, f);
    const [cx, cy] = eksen(t);
    return [cx + r * Math.cos(f), cy + r * Math.sin(f), t * H + tacZ(t, f) + zEk];
  };
  const halka = (t, rFn) => {
    const h = new Array(M);
    for (let j = 0; j < M; j++) h[j] = nokta(t, j, rFn);
    return h;
  };

  const disH = [];
  for (let i = 0; i <= n; i++) disH.push(halka(i / n, dis));
  for (let i = 0; i < n; i++) W.serit(disH[i], disH[i + 1], true);

  // İç yüzey: tabandan (ya da alttan) ağza
  const tb = taban > 0 ? taban / H : 0;
  const icH = [];
  const ni = Math.max(2, Math.round(n * (1 - tb)));
  for (let i = 0; i <= ni; i++) icH.push(halka(tb + ((1 - tb) * i) / ni, ic));
  for (let i = 0; i < ni; i++) W.serit(icH[i], icH[i + 1], false);

  // Ağız: dış ve iç üst halkalar arası
  W.serit(disH[n], icH[ni], true);

  if (taban > 0) {
    const [cx, cy] = eksen(0);
    W.yelpaze([cx, cy, 0], disH[0], true); // dış taban (−Z)
    const [ix, iy] = eksen(tb);
    W.yelpaze([ix, iy, taban], icH[0], false); // iç taban (+Z)
  } else {
    W.serit(disH[0], icH[0], false); // alt halka (−Z)
  }
  return W.geometri();
}

// ---------------------------------------------------------------- YÜKSEKLİK ALANI
/**
 * Dikdörtgen kabartma: üst yüzey z = taban + h(x, y), alt yüzey z = 0.
 * x ∈ [−W/2, W/2], y ∈ [−D/2, D/2]. Alt yüzey kenar noktalarına bağlı
 * yelpaze (dikdörtgen dışbükey olduğu için geçerli).
 */
export function yuzeyKur({ W, D, adim, h, taban }) {
  const nx = Math.max(2, Math.ceil(W / adim));
  const ny = Math.max(2, Math.ceil(D / adim));
  const P = (i, j) => {
    const x = -W / 2 + (W * i) / nx;
    const y = -D / 2 + (D * j) / ny;
    return [x, y, taban + Math.max(0, h(x, y))];
  };
  const ust = [];
  for (let j = 0; j <= ny; j++) {
    const satir = [];
    for (let i = 0; i <= nx; i++) satir.push(P(i, j));
    ust.push(satir);
  }
  const Wr = agYazici();
  // Üst yüzey (+Z)
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = ust[j][i], b = ust[j][i + 1], c = ust[j + 1][i + 1], d = ust[j + 1][i];
      Wr.tri(a, b, c);
      Wr.tri(a, c, d);
    }
  }
  // Kenar: saat yönünün tersine çevre (üstten bakınca)
  const cevre = [];
  for (let i = 0; i < nx; i++) cevre.push(ust[0][i]);
  for (let j = 0; j < ny; j++) cevre.push(ust[j][nx]);
  for (let i = nx; i > 0; i--) cevre.push(ust[ny][i]);
  for (let j = ny; j > 0; j--) cevre.push(ust[j][0]);
  const alt = cevre.map((p) => [p[0], p[1], 0]);
  // Yan duvarlar: alt halkadan üst halkaya, dışa bakar
  Wr.serit(alt, cevre, true);
  // Taban (−Z)
  Wr.yelpaze([0, 0, 0], alt, true);
  return Wr.geometri();
}

// ---------------------------------------------------------------- MASKE
/** Maskeyi mm kadar dışa büyütür (birleşik dış hattı kalınca çizer) */
export function genislet(m, mm) {
  if (!(mm > 0)) return m;
  const donguler = konturlar(m, 0.02);
  const c = m.ctx;
  c.save();
  c.translate(m.w / 2, m.h / 2);
  c.scale(m.pxMm, -m.pxMm);
  c.lineJoin = "round";
  c.lineCap = "round";
  c.lineWidth = mm * 2;
  c.strokeStyle = "#fff";
  c.beginPath();
  for (const d of donguler) {
    d.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
    c.closePath();
  }
  c.stroke();
  c.restore();
  return m;
}

/** Maskenin kopyası (birleştirme işlemleri asıl maskeyi bozmasın) */
export function maskeKopya(m) {
  const tuval = document.createElement("canvas");
  tuval.width = m.w;
  tuval.height = m.h;
  const ctx = tuval.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(m.tuval, 0, 0);
  return { tuval, ctx, w: m.w, h: m.h, pxMm: m.pxMm };
}

/**
 * Pahlı ekstrüzyon: maske z0'dan kalınlık kadar yükselir; üstteki "pah"
 * kadarlık kısım "adim" katmanda, her katta pah/adim kadar içe çekilerek
 * basamaklanır. 0,2 mm katmanla basılınca gerçek pah gibi görünür; her
 * kat bir alttakinin içinde kaldığı için sarkma yok. Katlar ayrı kapalı
 * katılar, tek geometride birleşir.
 */
export function pahliKati(m, kalinlik, z0 = 0, pah = 0.6, adim = 3, tol) {
  pah = Math.min(pah, kalinlik * 0.6);
  if (!(pah > 0.05) || adim < 1) return maskedenKati(m, kalinlik, z0, tol);
  const govde = kalinlik - pah;
  const parcalar = [];
  const alt = maskedenKati(m, govde, z0, tol);
  if (alt) parcalar.push(alt);
  for (let k = 1; k <= adim; k++) {
    const mk = asindir(maskeKopya(m), (pah * k) / adim);
    const g = maskedenKati(mk, pah / adim, z0 + govde + (pah * (k - 1)) / adim, tol);
    if (g) parcalar.push(g);
  }
  if (!parcalar.length) return null;
  if (parcalar.length === 1) return parcalar[0];
  const birlesik = mergeGeometries(parcalar.map((g) => (g.index ? g.toNonIndexed() : g)), false);
  birlesik.computeVertexNormals();
  return birlesik;
}

/** Tekrarlanabilir rastgele dizi (desen numarası) */
export function rastgele(tohum) {
  let a = (tohum * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pürüzsüz değer gürültüsü (2B), [0, 1] */
export function gurultu(tohum) {
  const R = rastgele(tohum);
  const P = new Float32Array(512);
  for (let i = 0; i < 512; i++) P[i] = R();
  const h = (x, y) => P[(((x * 73856093) ^ (y * 19349663)) >>> 0) % 512];
  return (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = ayrinti(x - x0), fy = ayrinti(y - y0);
    const a = h(x0, y0), b = h(x0 + 1, y0), c = h(x0, y0 + 1), d = h(x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

// ---------------------------------------------------------------- KATMANLI (ÇOK RENKLİ) PARÇALAR
/**
 * Var olan maskeye mm koordinatında çizer (orijin ortada, +Y yukarı).
 * islem "source-over": ekler · "destination-out": keser.
 */
export function maskeCiz(m, ciz, islem = "source-over") {
  const c = m.ctx;
  c.save();
  c.translate(m.w / 2, m.h / 2);
  c.scale(m.pxMm, -m.pxMm);
  c.globalCompositeOperation = islem;
  c.fillStyle = "#fff";
  c.strokeStyle = "#fff";
  ciz(c);
  c.restore();
  return m;
}

/**
 * Yazıyı [merkezX, merkezY, genişlik, yükseklik] (mm) kutusuna sığdırır;
 * sığmıyorsa küçültür. kalin: harflerin her yönde kalınlaşması (ince
 * çizgiler 0,8 mm'nin altına inmesin). Harf boyu (mm) döner.
 */
export function yaziSigdir(c, metin, kutu, tip, kalin = 0.45) {
  if (!metin) return 0;
  const [kx, ky, kw, kh] = kutu;
  let boy = kh * 1.25;
  c.save();
  c.font = `${tip.agirlik} ${boy}px ${tip.aile}`;
  let m = c.measureText(metin);
  const yuk = (m.actualBoundingBoxAscent || boy * 0.72) + (m.actualBoundingBoxDescent || 0);
  boy *= Math.min(1, kw / Math.max(1e-6, m.width), kh / Math.max(1e-6, yuk));
  c.font = `${tip.agirlik} ${boy}px ${tip.aile}`;
  m = c.measureText(metin);
  const asc = m.actualBoundingBoxAscent || boy * 0.72;
  const desc = m.actualBoundingBoxDescent || 0;
  c.translate(kx, ky);
  c.scale(1, -1); // tuval mm'de ters; yazı düz okunsun
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.fillText(metin, 0, (asc - desc) / 2);
  if (kalin > 0) {
    c.lineJoin = "round";
    c.lineWidth = kalin;
    c.strokeText(metin, 0, (asc - desc) / 2);
  }
  c.restore();
  return asc + desc;
}

/** Köşeleri yuvarlak dikdörtgen yolu (mm, merkez orijinde) */
export function yuvarlakKutu(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r);
  c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h);
  c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r);
  c.arcTo(x, y, x + r, y, r);
  c.closePath();
}

/** Düzgün çokgen yolu; n kenar, R köşe yarıçapı, a0 ilk köşenin açısı */
export function cokgen(c, n, R, a0 = Math.PI / 2, cx = 0, cy = 0) {
  for (let i = 0; i < n; i++) {
    const a = a0 + (i * Math.PI * 2) / n;
    i ? c.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a)) : c.moveTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
  }
  c.closePath();
}

/** Yazı tipleri inince model yeniden kurulsun (ilk karede yedek yazı tipi olabilir) */
export function yaziTipleriniBekle(tipler, yenile) {
  if (!document.fonts) return;
  const yukle = Object.values(tipler).map((t) => document.fonts.load(`${t.agirlik} 40px ${t.aile}`, "ĞğŞşİıÖöÜüÇç2027"));
  Promise.allSettled(yukle).then(() => yenile());
  document.fonts.addEventListener?.("loadingdone", () => yenile());
}

export { ayrinti };
