/* ==========================================================================
   FOTOĞRAF ARAÇLARI — ORTAK MODÜL

   Fotoğraflı yapboz, duvar panosu ve hediye kutusunun ortak parçaları:

     fotoModeli   → fotoğraf (müşterinin dosyası ya da örnek), kırpma,
                    2–4 filament rengine ayırma, renk önerisi.
     inceEtiket   → kaba renk ızgarasını baskı çözünürlüğüne yumuşatarak
                    büyütür (köşeli piksel değil, eğik sınır).
     etiketKatisi → bir rengin bölgeleri: hızlı "marching squares" kontur,
                    iç içe şekiller, ekstrüzyon. Komşu renklerin sınırı
                    aynı çizgiden geçer; renkler üst üste binmez.
     yapbozKes    → gerçek geçmeli yapboz kesimi (her kenarda rastgele
                    yönlü, biraz oynak çıkıntı).
     yuzAsagi     → görünüş yönündeki katıyı baskı yönüne çevirir
                    (fotoğraf yüzü tablaya).
     egikAyak     → eğik yarıklı masa ayağı.

   Renk katı incedir (0,8 mm): fotoğraf yüzü tablaya basılır, renkler
   yalnız ilk dört katmanda değişir, gövde tek renk devam eder.
   Birim mm, Z yukarı.
   ========================================================================== */
import { THREE, el, clamp, ekstrude, alanlariYaz, sayi } from "./arac-ortak.js";

// ---------------------------------------------------------------- FİLAMENT
/** Gerçek PLA renkleri. Aralarındaki uzaklık, üretim projesinin "yakın ton
 *  tek filament" eşiğinden (RGB 48) büyük: iki seçim tek renge düşmez. */
export const FILAMENT = [
  ["siyah", "Siyah", "#1b1b1f"], ["antrasit", "Antrasit", "#4a4d52"], ["gri", "Gri", "#8a8d91"],
  ["acikgri", "Açık gri", "#c4c7cb"], ["beyaz", "Beyaz", "#f3f1ea"], ["kahve", "Kahverengi", "#5b3a26"],
  ["ten", "Ten", "#e0b48c"], ["kirmizi", "Kırmızı", "#c8242b"], ["turuncu", "Turuncu", "#f07a1f"],
  ["sari", "Sarı", "#f6c927"], ["yesil", "Yeşil", "#2f8f46"], ["acikyesil", "Açık yeşil", "#8cc152"],
  ["lacivert", "Lacivert", "#1f2f5c"], ["mavi", "Mavi", "#2a6fd6"], ["acikmavi", "Açık mavi", "#7fb8e6"],
  ["turkuaz", "Turkuaz", "#21b5b0"], ["mor", "Mor", "#6a3fa0"], ["pembe", "Pembe", "#ef6fa5"],
];
export const FILAMENT_HEX = Object.fromEntries(FILAMENT.map(([k, , h]) => [k, h]));
export const FILAMENT_AD = Object.fromEntries(FILAMENT.map(([k, a]) => [k, a]));
const NOTR = ["siyah", "antrasit", "gri", "acikgri", "beyaz"];

const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
const fLab = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
/** sRGB (0–255) → CIE Lab */
export function lab(r, g, b) {
  const R = LIN[r], G = LIN[g], B = LIN[b];
  const x = fLab((0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047);
  const y = fLab(0.2126729 * R + 0.7151522 * G + 0.072175 * B);
  const z = fLab((0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const F_LAB = FILAMENT.map(([k, , h]) => ({ k, lab: lab(...hexRgb(h)) }));

/** Küme merkezlerine en yakın filamentler; her filament bir kez kullanılır */
export function filamentOner(merkez, sb) {
  const adaylar = F_LAB.filter((f) => !sb || NOTR.includes(f.k));
  const secilen = new Array(merkez.length).fill(null);
  const kullanilan = new Set();
  merkez
    .map((m, i) => ({ m, i }))
    .sort((a, b) => b.m.pay - a.m.pay)
    .forEach(({ m, i }) => {
      let en = null, uz = Infinity;
      for (const f of adaylar) {
        if (kullanilan.has(f.k)) continue;
        const d = Math.hypot(f.lab[0] - m.L, f.lab[1] - m.a, f.lab[2] - m.b);
        if (d < uz) { uz = d; en = f.k; }
      }
      secilen[i] = en || "gri";
      kullanilan.add(secilen[i]);
    });
  // Nötr tonlar (siyah → beyaz) kümelerin açıklık sırasını izlesin:
  // "tek tek en yakın" seçimi koyu kümeye antrasit, bir açığına siyah verebilir
  const notr = secilen.map((k, i) => i).filter((i) => NOTR.includes(secilen[i]));
  const sirali = notr.map((i) => secilen[i]).sort((x, y) => NOTR.indexOf(x) - NOTR.indexOf(y));
  notr.forEach((i, j) => (secilen[i] = sirali[j]));
  return secilen;
}

// ---------------------------------------------------------------- FOTOĞRAF
/** Dosya gelmezse ya da örnek inmezse: çizilmiş gün batımı */
function yedekResim() {
  const t = document.createElement("canvas");
  t.width = 800;
  t.height = 600;
  const c = t.getContext("2d");
  const g = c.createLinearGradient(0, 0, 0, 600);
  g.addColorStop(0, "#1f2f5c");
  g.addColorStop(0.55, "#f07a1f");
  g.addColorStop(1, "#f6c927");
  c.fillStyle = g;
  c.fillRect(0, 0, 800, 600);
  c.fillStyle = "#f3f1ea";
  c.beginPath();
  c.arc(400, 330, 110, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#1b1b1f";
  c.beginPath();
  c.moveTo(0, 600);
  c.lineTo(0, 430);
  c.lineTo(180, 300);
  c.lineTo(330, 440);
  c.lineTo(520, 260);
  c.lineTo(800, 470);
  c.lineTo(800, 600);
  c.closePath();
  c.fill();
  return t;
}

/**
 * Fotoğrafı cw × ch hücreye kırparak örnekler ("kapla" yerleşimi).
 * zoom ≥ 1; kx, ky ∈ [−1, 1]: taşan kısmın içinde kaydırma.
 * parlak, kontrast ∈ [−50, 50].
 */
function ornekle(resim, cw, ch, o) {
  const t = document.createElement("canvas");
  t.width = cw;
  t.height = ch;
  const c = t.getContext("2d", { willReadFrequently: true });
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  const s = Math.max(cw / resim.width, ch / resim.height) * o.zoom;
  const dw = resim.width * s, dh = resim.height * s;
  c.drawImage(resim, (cw - dw) / 2 - (o.kx * (dw - cw)) / 2, (ch - dh) / 2 + (o.ky * (dh - ch)) / 2, dw, dh);
  const veri = c.getImageData(0, 0, cw, ch).data;
  const k = Math.tan(((clamp(o.kontrast, -50, 50) / 50) * 0.38 + 0.5) * (Math.PI / 2)); // 1 → nötr
  const p = (clamp(o.parlak, -50, 50) / 50) * 70;
  if (Math.abs(k - 1) > 1e-3 || Math.abs(p) > 1e-3) {
    for (let i = 0; i < veri.length; i += 4) {
      for (let j = 0; j < 3; j++) veri[i + j] = clamp((veri[i + j] - 128) * k + 128 + p, 0, 255);
    }
  }
  return veri;
}

/**
 * Renklere ayırma: Lab uzayında k-ortalama. Başlangıç merkezleri açıklık
 * sırasındaki dilimlerden alınır (rastgelelik yok: aynı fotoğraf her
 * yerde aynı sonucu verir). Kümeler koyudan açığa sıralı döner.
 */
function renkAyir(rgba, w, h, n, sb) {
  const N = w * h;
  const L = new Float32Array(N), A = new Float32Array(N), B = new Float32Array(N);
  for (let i = 0, j = 0; i < N; i++, j += 4) {
    const q = lab(rgba[j], rgba[j + 1], rgba[j + 2]);
    L[i] = q[0];
    if (!sb) { A[i] = q[1]; B[i] = q[2]; }
  }
  const adim = Math.max(1, Math.floor(N / 16000));
  const ornek = [];
  for (let i = 0; i < N; i += adim) ornek.push(i);
  ornek.sort((x, y) => L[x] - L[y]);
  const mer = [];
  for (let k = 0; k < n; k++) {
    const a = Math.floor((ornek.length * k) / n), b = Math.max(a + 1, Math.floor((ornek.length * (k + 1)) / n));
    let sl = 0, sa = 0, sb2 = 0;
    for (let i = a; i < b; i++) { sl += L[ornek[i]]; sa += A[ornek[i]]; sb2 += B[ornek[i]]; }
    mer.push([sl / (b - a), sa / (b - a), sb2 / (b - a)]);
  }
  const yakin = (i) => {
    let en = 0, uz = Infinity;
    for (let k = 0; k < n; k++) {
      const dl = L[i] - mer[k][0], da = A[i] - mer[k][1], db = B[i] - mer[k][2];
      const d = dl * dl + da * da + db * db;
      if (d < uz) { uz = d; en = k; }
    }
    return en;
  };
  for (let tur = 0; tur < 16; tur++) {
    const top = mer.map(() => [0, 0, 0, 0]);
    for (const i of ornek) {
      const k = yakin(i);
      top[k][0] += L[i]; top[k][1] += A[i]; top[k][2] += B[i]; top[k][3]++;
    }
    for (let k = 0; k < n; k++) if (top[k][3]) mer[k] = [top[k][0] / top[k][3], top[k][1] / top[k][3], top[k][2] / top[k][3]];
  }
  // Koyudan açığa
  const sira = mer.map((m, k) => k).sort((x, y) => mer[x][0] - mer[y][0]);
  const yeni = new Array(n);
  sira.forEach((eski, i) => (yeni[eski] = i));
  const et = new Uint8Array(N);
  const say = new Array(n).fill(0);
  for (let i = 0; i < N; i++) {
    const k = yeni[yakin(i)];
    et[i] = k;
    say[k]++;
  }
  return { et, merkez: sira.map((eski, i) => ({ L: mer[eski][0], a: mer[eski][1], b: mer[eski][2], pay: say[i] / N })) };
}

/**
 * Baskıya uygun bölgeler: 3×3 çoğunluk süzgeci tek pikselleri siler,
 * ardından "enAz" hücreden küçük adalar çevresindeki renge katılır
 * (0,4 mm meme, 1 mm²'den küçük lekeyi basamaz).
 */
function etiketTemizle(et, w, h, n, enAz) {
  const N = w * h;
  const cikti = new Uint8Array(N);
  const say = new Uint8Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      say.fill(0);
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy < 0 ? 0 : y + dy >= h ? h - 1 : y + dy;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx < 0 ? 0 : x + dx >= w ? w - 1 : x + dx;
          say[et[yy * w + xx]]++;
        }
      }
      const kendi = et[y * w + x];
      let en = kendi, c = say[kendi];
      for (let k = 0; k < n; k++) if (say[k] > c) { c = say[k]; en = k; }
      cikti[y * w + x] = en;
    }
  }
  // Küçük adalar
  const ada = new Int32Array(N).fill(-1);
  const yigin = new Int32Array(N);
  const komsuSay = new Int32Array(n);
  let adaNo = 0;
  for (let b = 0; b < N; b++) {
    if (ada[b] >= 0) continue;
    const renk = cikti[b];
    let uc = 0, boy = 0;
    yigin[uc++] = b;
    ada[b] = adaNo;
    const uyeler = [];
    komsuSay.fill(0);
    while (uc) {
      const i = yigin[--uc];
      boy++;
      if (uyeler.length < enAz) uyeler.push(i);
      const x = i % w, y = (i / w) | 0;
      const bak = (j) => {
        if (cikti[j] === renk) {
          if (ada[j] < 0) { ada[j] = adaNo; yigin[uc++] = j; }
        } else komsuSay[cikti[j]]++;
      };
      if (x > 0) bak(i - 1);
      if (x < w - 1) bak(i + 1);
      if (y > 0) bak(i - w);
      if (y < h - 1) bak(i + w);
    }
    if (boy < enAz) {
      let en = renk, c = 0;
      for (let k = 0; k < n; k++) if (komsuSay[k] > c) { c = komsuSay[k]; en = k; }
      for (const i of uyeler) cikti[i] = en;
    }
    adaNo++;
  }
  return cikti;
}

/**
 * Fotoğraf durumu: `${on}-foto` (dosya), `${on}-ornek`, `${on}-zoom`,
 * `${on}-kx`, `${on}-ky`, `${on}-parlak`, `${on}-kontrast`, `${on}-mod`
 * (renkli | sb), `${on}-renk-sayi` ve `${on}-renk-1…4` alanlarını okur.
 *
 * Filament önerisi yalnız müşterinin kendi hareketiyle yazılır (fotoğraf
 * seçti, renk sayısını değiştirdi, "öner"e bastı): kayıtlı sipariş
 * yüklenirken seçilmiş renklerin üstüne yazılmaz.
 */
export function fotoModeli(on, yenile, ornekler) {
  const d = { resim: null, hazir: false, kullanici: false, onerBekliyor: false };
  const giris = el(`${on}-foto`), secim = el(`${on}-ornek`);
  let sira = 0;

  function yukle(url, kullanici, sonra) {
    const no = ++sira;
    const img = new Image();
    const bitti = (resim) => {
      if (no !== sira) return;
      d.resim = resim;
      d.kullanici = kullanici;
      d.hazir = true;
      sonra?.();
      yenile();
    };
    img.onload = () => {
      const k = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
      const t = document.createElement("canvas");
      t.width = Math.max(1, Math.round(img.naturalWidth * k));
      t.height = Math.max(1, Math.round(img.naturalHeight * k));
      t.getContext("2d").drawImage(img, 0, 0, t.width, t.height);
      bitti(t);
    };
    img.onerror = () => bitti(d.resim || yedekResim());
    img.src = url;
  }
  const ornekYukle = () => yukle(ornekler[secim.value] || Object.values(ornekler)[0], false);

  giris.addEventListener("change", () => {
    const f = giris.files && giris.files[0];
    if (!f) return;
    if (!giris.__adjyYukleniyor) d.onerBekliyor = true;
    const url = URL.createObjectURL(f);
    const ad = el(`${on}-foto-ad`);
    if (ad) ad.textContent = f.name;
    yukle(url, true, () => URL.revokeObjectURL(url));
  });
  secim.addEventListener("change", ornekYukle);
  // Örnek düğmesi: müşterinin kendi fotoğrafı bırakılır
  document.addEventListener(
    "click",
    (e) => {
      if (!e.isTrusted) return;
      const b = e.target.closest?.("[data-secim] [data-v]");
      if (!b) return;
      const id = b.closest("[data-secim]").dataset.secim;
      if (id === `${on}-ornek`) {
        giris.value = "";
        window.ADJY?.dosyalariBirak?.(giris.id);
        const ad = el(`${on}-foto-ad`);
        if (ad) ad.textContent = "Örnek fotoğraf gösteriliyor";
        d.onerBekliyor = true;
        if (secim.value === b.dataset.v) ornekYukle(); // aynı örneğe dönüş: seçim değişmez
      }
      if (id === `${on}-mod` || id === `${on}-renk-sayi`) d.onerBekliyor = true;
    },
    true
  );
  el(`${on}-oner`)?.addEventListener("click", () => {
    d.onerBekliyor = true;
    yenile();
  });

  /**
   * gw × gh mm alan için kaba renk ızgarası (hücre mm).
   * @returns { et, cw, ch, n, slot: [filament anahtarı], hex: [..], pay: [..] }
   */
  d.etiketle = function (gw, gh, hucre = 0.5) {
    const cw = Math.max(8, Math.round(gw / hucre)), ch = Math.max(8, Math.round(gh / hucre));
    const n = Math.round(clamp(sayi(`${on}-renk-sayi`, 4), 2, 4));
    const sb = el(`${on}-mod`).value === "sb";
    const rgba = ornekle(d.resim || yedekResim(), cw, ch, {
      zoom: clamp(sayi(`${on}-zoom`, 1), 1, 3),
      kx: clamp(sayi(`${on}-kx`, 0), -1, 1),
      ky: clamp(sayi(`${on}-ky`, 0), -1, 1),
      parlak: sayi(`${on}-parlak`, 0),
      kontrast: sayi(`${on}-kontrast`, 0),
    });
    const r = renkAyir(rgba, cw, ch, n, sb);
    const et = etiketTemizle(r.et, cw, ch, n, Math.max(4, Math.round(1.2 / (hucre * hucre))));
    const say = new Array(n).fill(0);
    for (let i = 0; i < et.length; i++) say[et[i]]++;
    if (d.onerBekliyor) {
      d.onerBekliyor = false;
      const oneri = filamentOner(r.merkez, sb);
      const yaz = {};
      oneri.forEach((k, i) => (yaz[`${on}-renk-${i + 1}`] = k));
      // Gövde: en çok yer tutan renk (en az filament değişimi)
      let enCok = 0;
      for (let i = 1; i < n; i++) if (say[i] > say[enCok]) enCok = i;
      if (el(`${on}-govde`)) yaz[`${on}-govde`] = String(enCok + 1);
      setTimeout(() => alanlariYaz(yaz), 0);
    }
    const slot = [];
    for (let i = 0; i < n; i++) slot.push(el(`${on}-renk-${i + 1}`).value);
    return { et, cw, ch, n, slot, hex: slot.map((k) => FILAMENT_HEX[k] || "#8a8d91"), pay: say.map((s) => s / et.length) };
  };

  ornekYukle();
  return d;
}

// ---------------------------------------------------------------- İNCE ETİKET
/**
 * Kaba renk ızgarasını (cw × ch, gw × gh mm'yi kaplar) W × H ince ızgaraya
 * büyütür. Her ince piksel, çevresindeki dört kaba hücrenin çift doğrusal
 * ağırlıklarından en ağır rengi alır: sınırlar basamak değil, eğik çıkar.
 * İnce ızgara merkezde, pxMm çözünürlükte; fotoğraf alanının dışı en yakın
 * kenar rengini alır (dış hat maskesi keser).
 */
export function inceEtiket(et, cw, ch, gw, gh, W, H, pxMm) {
  const cikti = new Uint8Array(W * H);
  const ux = new Float32Array(W), x0 = new Int32Array(W);
  for (let ix = 0; ix < W; ix++) {
    const mm = (ix + 0.5 - W / 2) / pxMm;
    const u = clamp(((mm + gw / 2) / gw) * cw - 0.5, 0, cw - 1);
    x0[ix] = Math.min(cw - 2, Math.floor(u));
    ux[ix] = u - x0[ix];
  }
  const agir = new Float32Array(4);
  for (let iy = 0; iy < H; iy++) {
    // Tuval satırı yukarıdan aşağı: fotoğrafın üst satırı iy = 0
    const mm = (iy + 0.5 - H / 2) / pxMm;
    const v = clamp(((mm + gh / 2) / gh) * ch - 0.5, 0, ch - 1);
    const y0 = Math.min(ch - 2, Math.floor(v));
    const ty = v - y0;
    for (let ix = 0; ix < W; ix++) {
      const i = y0 * cw + x0[ix];
      const a = et[i], b = et[i + 1], c = et[i + cw], e = et[i + cw + 1];
      if (a === b && a === c && a === e) { cikti[iy * W + ix] = a; continue; }
      const tx = ux[ix];
      agir.fill(0);
      agir[a] += (1 - tx) * (1 - ty);
      agir[b] += tx * (1 - ty);
      agir[c] += (1 - tx) * ty;
      agir[e] += tx * ty;
      let en = a, w = agir[a];
      if (agir[b] > w) { w = agir[b]; en = b; }
      if (agir[c] > w) { w = agir[c]; en = c; }
      if (agir[e] > w) en = e;
      cikti[iy * W + ix] = en;
    }
  }
  return cikti;
}

/** Maskenin (tuval) alfa kanalı: 255 dolu, 0 boş */
export function alfaOku(m) {
  const veri = m.ctx.getImageData(0, 0, m.w, m.h).data;
  const a = new Uint8Array(m.w * m.h);
  for (let i = 0, j = 3; i < a.length; i++, j += 4) a[i] = veri[j];
  return a;
}

// ---------------------------------------------------------------- KONTUR
/**
 * Hızlı "marching squares": F (W × H, 0–255) alanının 127,5 eş düzey
 * eğrileri. Kenar noktaları tamsayı kimlikli; komşuluk iki tipli dizide
 * tutulur (dizgi anahtarı yok: milyon piksellik maskede anlık).
 * Döngüler mm, orijin ortada, +Y yukarı; RDP ile sadeleşir.
 */
export function alanKonturu(F, W, H, pxMm, tol = 0.06, enAzAlan = 0.25) {
  const W2 = W + 2, H2 = H + 2;
  const P = new Uint8Array(W2 * H2);
  for (let y = 0; y < H; y++) P.set(F.subarray(y * W, y * W + W), (y + 1) * W2 + 1);
  const N = W2 * H2 * 2;
  const k1 = new Int32Array(N).fill(-1), k2 = new Int32Array(N).fill(-1);
  const baslar = [];
  const bagla = (p, q) => {
    if (k1[p] < 0) k1[p] = q; else k2[p] = q;
    if (k1[q] < 0) k1[q] = p; else k2[q] = p;
    baslar.push(p);
  };
  for (let y = 0; y < H2 - 1; y++) {
    for (let x = 0; x < W2 - 1; x++) {
      const i = y * W2 + x;
      const a = P[i], b = P[i + 1], d = P[i + W2 + 1], e = P[i + W2];
      const c = (a >= 128 ? 8 : 0) | (b >= 128 ? 4 : 0) | (d >= 128 ? 2 : 0) | (e >= 128 ? 1 : 0);
      if (c === 0 || c === 15) continue;
      const U = 2 * i, D = 2 * (i + W2), L = 2 * i + 1, R = 2 * (i + 1) + 1;
      switch (c) {
        case 1: case 14: bagla(L, D); break;
        case 2: case 13: bagla(D, R); break;
        case 3: case 12: bagla(L, R); break;
        case 4: case 11: bagla(U, R); break;
        case 6: case 9: bagla(U, D); break;
        case 7: case 8: bagla(L, U); break;
        case 5:
          if (a + b + d + e >= 510) { bagla(L, U); bagla(D, R); } else { bagla(U, R); bagla(L, D); }
          break;
        case 10:
          if (a + b + d + e >= 510) { bagla(U, R); bagla(L, D); } else { bagla(L, U); bagla(D, R); }
          break;
      }
    }
  }
  const nokta = (id) => {
    const i = id >> 1;
    const x = i % W2, y = (i / W2) | 0;
    let px = x, py = y;
    if (id & 1) {
      const a = P[i], b = P[i + W2];
      py += b !== a ? clamp((127.5 - a) / (b - a), 0, 1) : 0.5;
    } else {
      const a = P[i], b = P[i + 1];
      px += b !== a ? clamp((127.5 - a) / (b - a), 0, 1) : 0.5;
    }
    // Dolgulu ızgara → piksel merkezi → mm
    return new THREE.Vector2((px - 1 + 0.5 - W / 2) / pxMm, -(py - 1 + 0.5 - H / 2) / pxMm);
  };
  const gorulen = new Uint8Array(N);
  const donguler = [];
  for (const bas of baslar) {
    if (gorulen[bas]) continue;
    const yol = [];
    let onceki = -1, simdi = bas;
    for (;;) {
      gorulen[simdi] = 1;
      yol.push(simdi);
      const sonraki = k1[simdi] !== onceki ? k1[simdi] : k2[simdi];
      if (sonraki < 0 || sonraki === bas || gorulen[sonraki]) break;
      onceki = simdi;
      simdi = sonraki;
    }
    if (yol.length < 5) continue;
    const sade = rdpKapali(yol.map(nokta), tol);
    if (sade.length >= 3 && Math.abs(THREE.ShapeUtils.area(sade)) > enAzAlan) donguler.push(sade);
  }
  return donguler;
}

function rdpKapali(pts, tol) {
  if (pts.length < 8) return pts;
  let ib = 0, en = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = pts[i].distanceToSquared(pts[0]);
    if (d > en) { en = d; ib = i; }
  }
  const a = rdp(pts, 0, ib, tol);
  const b = rdp(pts.concat([pts[0]]), ib, pts.length, tol);
  return a.slice(0, -1).concat(b.slice(0, -1));
}
/** Yinelemesiz RDP (uzun konturda yığın taşmasın) */
function rdp(p, bas, son, tol) {
  const tut = new Uint8Array(son - bas + 1);
  tut[0] = tut[son - bas] = 1;
  const yigin = [bas, son];
  while (yigin.length) {
    const s = yigin.pop(), b = yigin.pop();
    if (s - b < 2) continue;
    const ax = p[b].x, ay = p[b].y, dx = p[s].x - ax, dy = p[s].y - ay;
    const L = Math.hypot(dx, dy) || 1e-9;
    let en = -1, ix = -1;
    for (let i = b + 1; i < s; i++) {
      const d = Math.abs((p[i].x - ax) * dy - (p[i].y - ay) * dx) / L;
      if (d > en) { en = d; ix = i; }
    }
    if (en > tol) {
      tut[ix - bas] = 1;
      yigin.push(b, ix, ix, s);
    }
  }
  const c = [];
  for (let i = bas; i <= son; i++) if (tut[i - bas]) c.push(p[i]);
  return c;
}

/** Döngülerden şekiller (dış hat + delikler); kutu ön elemesiyle hızlı */
export function sekillerHizli(donguler) {
  const kayit = donguler.map((d) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of d) {
      if (p.x < x0) x0 = p.x;
      if (p.x > x1) x1 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.y > y1) y1 = p.y;
    }
    return { d, alan: Math.abs(THREE.ShapeUtils.area(d)), x0, x1, y0, y1, derinlik: 0, ebeveyn: null, delik: [] };
  }).sort((a, b) => b.alan - a.alan);
  for (let i = 0; i < kayit.length; i++) {
    const k = kayit[i], p = k.d[0];
    for (let j = 0; j < i; j++) {
      const q = kayit[j];
      if (p.x < q.x0 || p.x > q.x1 || p.y < q.y0 || p.y > q.y1) continue;
      if (icinde(p, q.d)) {
        k.derinlik++;
        k.ebeveyn = q; // alanı küçülerek gelir: son bulunan en yakın ebeveyn
      }
    }
  }
  for (const k of kayit) if (k.derinlik % 2 === 1 && k.ebeveyn) k.ebeveyn.delik.push(k);
  const sonuc = [];
  for (const k of kayit) {
    if (k.derinlik % 2 !== 0) continue;
    const s = new THREE.Shape(THREE.ShapeUtils.isClockWise(k.d) ? k.d.slice().reverse() : k.d);
    for (const h of k.delik) s.holes.push(new THREE.Path(THREE.ShapeUtils.isClockWise(h.d) ? h.d : h.d.slice().reverse()));
    sonuc.push(s);
  }
  return sonuc;
}
function icinde(p, poly) {
  let ic = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) ic = !ic;
  }
  return ic;
}

/**
 * Bir rengin katısı. ince: etiket ızgarası; deger: renk no (−1: hepsi);
 * tut: dış hat ve kesimlerin alfa maskesi (255 kalır, 0 kesilir) ya da null.
 */
export function etiketKatisi(ince, W, H, pxMm, tut, deger, kalinlik, z0, tol) {
  const F = new Uint8Array(W * H);
  let dolu = false;
  for (let i = 0; i < F.length; i++) {
    if (deger < 0 || ince[i] === deger) {
      F[i] = tut ? tut[i] : 255;
      if (F[i] >= 128) dolu = true;
    }
  }
  if (!dolu) return null;
  const s = sekillerHizli(alanKonturu(F, W, H, pxMm, tol));
  return s.length ? ekstrude(s, kalinlik, z0) : null;
}

/** Görünüş yönündeki katıyı baskı yönüne çevirir: üst yüz (zUst) tablaya */
export function yuzAsagi(geo, zUst) {
  if (!geo) return null;
  const g = geo.clone();
  g.rotateY(Math.PI);
  g.translate(0, 0, zUst);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- YAPBOZ
function tekrarsiz(tohum) {
  let a = (tohum * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Yapboz kesim çizgileri (mm, orijin ortada). Her iç kenarda bir geçme:
 * boyun dar, baş geniş; yönü ve oturuşu rastgele. Geçme, parçanın kısa
 * kenarına göre ölçeklenir. Çizgi kalınlığı parçalar arası boşluktur.
 */
export function yapbozKes(c, W, H, sutun, satir, tohum, bosluk) {
  const R = tekrarsiz(tohum);
  const cw = W / sutun, ch = H / satir;
  const S = Math.min(cw, ch);
  const t = 0.1, j = 0.035;
  const oynak = () => (R() * 2 - 1) * j;
  c.lineWidth = bosluk;
  c.lineJoin = "round";
  c.lineCap = "butt";
  /** (ax, ay) → (bx, by) kenarı; geçme ortada S boyunda */
  function kenar(ax, ay, bx, by) {
    const L = Math.hypot(bx - ax, by - ay);
    const ex = (bx - ax) / L, ey = (by - ay) / L;
    const yon = R() < 0.5 ? 1 : -1;
    const nx = -ey * yon, ny = ex * yon;
    const [a, b, cc, d2, e] = [oynak(), oynak(), oynak(), oynak(), oynak()];
    const o = (L - S) / 2;
    const Q = (l, w) => [ax + ex * (o + l * S) + nx * w * S, ay + ey * (o + l * S) + ny * w * S];
    const p = [
      Q(0, 0), Q(0.2, a), Q(0.5 + b + d2, -t + cc), Q(0.5 - t + b, t + cc), Q(0.5 - 2 * t + b - d2, 3 * t + cc),
      Q(0.5 + 2 * t + b - d2, 3 * t + cc), Q(0.5 + t + b, t + cc), Q(0.5 + b + d2, -t + cc), Q(0.8, e), Q(1, 0),
    ];
    c.lineTo(p[0][0], p[0][1]);
    c.bezierCurveTo(p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1]);
    c.bezierCurveTo(p[4][0], p[4][1], p[5][0], p[5][1], p[6][0], p[6][1]);
    c.bezierCurveTo(p[7][0], p[7][1], p[8][0], p[8][1], p[9][0], p[9][1]);
    c.lineTo(bx, by);
  }
  for (let r = 1; r < satir; r++) {
    const y = H / 2 - r * ch;
    c.beginPath();
    c.moveTo(-W / 2 - 1, y);
    c.lineTo(-W / 2, y);
    for (let i = 0; i < sutun; i++) kenar(-W / 2 + i * cw, y, -W / 2 + (i + 1) * cw, y);
    c.lineTo(W / 2 + 1, y);
    c.stroke();
  }
  for (let s = 1; s < sutun; s++) {
    const x = -W / 2 + s * cw;
    c.beginPath();
    c.moveTo(x, H / 2 + 1);
    c.lineTo(x, H / 2);
    for (let i = 0; i < satir; i++) kenar(x, H / 2 - i * ch, x, H / 2 - (i + 1) * ch);
    c.lineTo(x, -H / 2 - 1);
    c.stroke();
  }
}

// ---------------------------------------------------------------- AYAK
/**
 * Eğik yarıklı masa ayağı. Kesit (derinlik × yükseklik) X boyunca uzar;
 * taban tablada, yarık yukarı açık (desteksiz). Arka uzantı, yaslanan
 * levhanın ağırlık merkezini taşıyacak kadar uzundur.
 *   boy: X uzunluğu · yarik: yarık genişliği · egim: derece
 *   levha: yaslanacak levhanın yüksekliği (denge için)
 */
export function egikAyak({ boy, yarik, egim, levha }) {
  const Y = clamp(levha * 0.09, 11, 18);
  const taban = 3;
  const kay = Math.tan((egim * Math.PI) / 180) * (Y - taban);
  const on = 9;
  const arka = Math.max(12, (levha / 2) * Math.sin((egim * Math.PI) / 180) + 9 + kay);
  const D = on + yarik + arka;
  const sek = new THREE.Shape();
  sek.moveTo(0, 0);
  sek.lineTo(D, 0);
  sek.lineTo(D, taban);
  sek.lineTo(D - 3, Math.min(Y, taban + 5));
  sek.lineTo(on + yarik + kay + 4, Y);
  sek.lineTo(on + yarik + kay, Y);
  sek.lineTo(on + yarik, taban);
  sek.lineTo(on, taban);
  sek.lineTo(on + kay, Y);
  sek.lineTo(3, Y);
  sek.lineTo(0, taban);
  sek.closePath();
  const g = new THREE.ExtrudeGeometry(sek, { depth: boy, bevelEnabled: false, curveSegments: 1 });
  // (kesit x, kesit y, boy) → (Y, Z, X)
  g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  g.translate(-boy / 2, -D / 2, 0);
  g.computeVertexNormals();
  return { geo: g, derinlik: D, yukseklik: Y };
}

/** Kaydırıcı sürüklenirken ağır modeli her adımda kurma */
export function gecikmeli(is, ms = 140) {
  let z = null;
  return () => {
    if (z) clearTimeout(z);
    z = setTimeout(() => { z = null; is(); }, ms);
  };
}

/** Renk yuvalarını gösteren düğmeleri (1–4) seçili filament rengine boyar */
export function yuvaDugmeleriniBoya(on, hex) {
  document.querySelectorAll(`[data-yuva="${on}"] [data-v]`).forEach((b) => {
    const i = parseInt(b.dataset.v, 10) - 1;
    b.hidden = i >= hex.length;
    if (hex[i]) b.style.setProperty("--r", hex[i]);
  });
}
