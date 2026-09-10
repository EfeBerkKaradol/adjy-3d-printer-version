// ==========================================
// SİLUET SAĞLAYICISI
//
// Fotoğrafı tarayıcıda çözümler: objeyi zeminden ayırır,
// dış hattını çıkarır ve tabandan tepeye genişlik profilini
// ölçer. Model bu profilden kurulur — yani ekrana gelen
// biçim gerçekten yüklenen fotoğraftan gelir, hazır bir
// kalıp değildir.
//
// Sınırı açıkça şudur: tek kareden gerçek derinlik ölçülemez.
// Derinlik, simetri varsayımıyla tahmin edilir; kullanıcı
// bildiği bir ölçüyü girerek bunu düzeltebilir.
// ==========================================

import type {
  GeneratedModel,
  ModelParameter,
  PhotoAnalysis,
  PhotoIssue,
} from "../types";
import { GenerationError } from "./types";
import type { ImageAnalysisProvider, ModelGenerationProvider } from "./types";

/** Çözümleme çözünürlüğü — hız için küçültülür */
const WORK_SIZE = 320;
/** Profilden alınan kesit sayısı */
const PROFILE_SAMPLES = 72;
/** Fotoğraftan ölçü bilinemez; başlangıç yüksekliği varsayılır */
const ASSUMED_HEIGHT_MM = 150;

// ---------------------------------------------------------------
// Görüntüyü çöz
// ---------------------------------------------------------------
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file);
  } catch {
    // Bazı biçimleri (özellikle HEIC) createImageBitmap çözemez;
    // tarayıcının kendi çözücüsü destekliyorsa <img> üzerinden gelir.
    return await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new GenerationError("Bu fotoğraf açılamadı. Farklı bir fotoğraf deneyebilirsin."));
      };
      img.src = url;
    });
  }
}

function drawToCanvas(source: ImageBitmap | HTMLImageElement) {
  const sw = "width" in source ? source.width : 0;
  const sh = "height" in source ? source.height : 0;
  if (!sw || !sh) throw new GenerationError("Bu fotoğraf açılamadı.");

  const scale = Math.min(1, WORK_SIZE / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new GenerationError("Fotoğraf işlenemedi.");
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h);
  return { canvas, ctx, w, h };
}

// ---------------------------------------------------------------
// Zemin / obje ayrımı
// ---------------------------------------------------------------

/** Kenar piksellerinin ortancası — zemin rengi varsayımı */
function estimateBackground(data: Uint8ClampedArray, w: number, h: number) {
  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  const push = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]);
  };
  for (let x = 0; x < w; x += 2) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y += 2) { push(0, y); push(w - 1, y); }
  const mid = (a: number[]) => a.sort((p, q) => p - q)[Math.floor(a.length / 2)] ?? 0;
  return { r: mid(rs), g: mid(gs), b: mid(bs) };
}

/**
 * Otsu eşiği — zemine olan uzaklık dağılımını ikiye böler.
 * Sabit bir eşik, açık zeminde koyu objeyle koyu zeminde açık
 * objeyi aynı anda yakalayamıyordu.
 */
function otsuThreshold(hist: Int32Array, total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i += 1) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, bestVar = -1;
  for (let t = 0; t < 256; t += 1) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > bestVar) { bestVar = between; best = t; }
  }
  return best;
}

interface MaskResult {
  mask: Uint8Array;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  fraction: number;
  extraObjects: boolean;
  meanLuma: number;
  separation: number;
}

function buildMask(data: Uint8ClampedArray, w: number, h: number): MaskResult {
  const bg = estimateBackground(data, w, h);
  const dist = new Uint8Array(w * h);
  const hist = new Int32Array(256);

  for (let p = 0; p < w * h; p += 1) {
    const i = p * 4;
    const d =
      Math.abs(data[i] - bg.r) + Math.abs(data[i + 1] - bg.g) + Math.abs(data[i + 2] - bg.b);
    const v = Math.min(255, Math.round(d / 3));
    dist[p] = v;
    hist[v] += 1;
  }

  const t = Math.max(12, otsuThreshold(hist, w * h));
  const raw = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p += 1) raw[p] = dist[p] > t ? 1 : 0;

  // Bağlantılı bileşenler — en büyüğü obje kabul edilir.
  // Yığınla gezilir; özyineleme büyük fotoğrafta yığını taşırıyordu.
  const label = new Int32Array(w * h).fill(-1);
  const sizes: number[] = [];
  const stack: number[] = [];
  for (let start = 0; start < w * h; start += 1) {
    if (raw[start] === 0 || label[start] !== -1) continue;
    const id = sizes.length;
    let size = 0;
    stack.push(start);
    label[start] = id;
    while (stack.length) {
      const p = stack.pop() as number;
      size += 1;
      const x = p % w, y = (p / w) | 0;
      if (x > 0 && raw[p - 1] && label[p - 1] === -1) { label[p - 1] = id; stack.push(p - 1); }
      if (x < w - 1 && raw[p + 1] && label[p + 1] === -1) { label[p + 1] = id; stack.push(p + 1); }
      if (y > 0 && raw[p - w] && label[p - w] === -1) { label[p - w] = id; stack.push(p - w); }
      if (y < h - 1 && raw[p + w] && label[p + w] === -1) { label[p + w] = id; stack.push(p + w); }
    }
    sizes.push(size);
  }

  if (!sizes.length) {
    throw new GenerationError(
      "Bu fotoğrafta objeyi zeminden ayıramadık. Daha sade bir arka planda tekrar deneyebilirsin."
    );
  }

  let main = 0;
  for (let i = 1; i < sizes.length; i += 1) if (sizes[i] > sizes[main]) main = i;
  const mainSize = sizes[main];
  const extraObjects = sizes.some((s, i) => i !== main && s > mainSize * 0.35);

  const mask = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p += 1) mask[p] = label[p] === main ? 1 : 0;

  // Delik doldurma: kenardan ulaşılamayan boşluklar objenin içidir.
  const outside = new Uint8Array(w * h);
  const q: number[] = [];
  const seed = (p: number) => { if (!mask[p] && !outside[p]) { outside[p] = 1; q.push(p); } };
  for (let x = 0; x < w; x += 1) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y += 1) { seed(y * w); seed(y * w + w - 1); }
  while (q.length) {
    const p = q.pop() as number;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) seed(p - 1);
    if (x < w - 1) seed(p + 1);
    if (y > 0) seed(p - w);
    if (y < h - 1) seed(p + w);
  }
  for (let p = 0; p < w * h; p += 1) if (!outside[p]) mask[p] = 1;

  let x0 = w, y0 = h, x1 = -1, y1 = -1, count = 0, luma = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (!mask[p]) continue;
      count += 1;
      const i = p * 4;
      luma += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new GenerationError("Bu fotoğrafta bir obje seçemedik.");

  return {
    mask,
    bbox: { x0, y0, x1, y1 },
    fraction: count / (w * h),
    extraObjects,
    meanLuma: luma / Math.max(1, count),
    separation: t,
  };
}

// ---------------------------------------------------------------
// Profil ve dış hat
// ---------------------------------------------------------------
function extractProfile(m: MaskResult, w: number) {
  const { mask, bbox } = m;
  const bw = bbox.x1 - bbox.x0 + 1;
  const bh = bbox.y1 - bbox.y0 + 1;

  const halfWidths: number[] = [];
  const lefts: number[] = [];
  const rights: number[] = [];

  for (let s = 0; s < PROFILE_SAMPLES; s += 1) {
    // Tabandan tepeye: görüntüde y aşağı doğru büyür
    const y = bbox.y1 - Math.round((s / (PROFILE_SAMPLES - 1)) * (bh - 1));
    let lo = -1, hi = -1;
    for (let x = bbox.x0; x <= bbox.x1; x += 1) {
      if (mask[y * w + x]) { if (lo < 0) lo = x; hi = x; }
    }
    if (lo < 0) { halfWidths.push(0); lefts.push(0); rights.push(0); continue; }
    halfWidths.push((hi - lo + 1) / 2 / bw);
    lefts.push((lo - bbox.x0) / bw);
    rights.push((bbox.x1 - hi) / bw);
  }

  // Simetri: her kesitte sol ve sağ boşluğun birbirine yakınlığı
  let symSum = 0, symN = 0;
  for (let i = 0; i < PROFILE_SAMPLES; i += 1) {
    if (halfWidths[i] <= 0.02) continue;
    const l = lefts[i], r = rights[i];
    symSum += 1 - Math.abs(l - r) / Math.max(0.001, l + r + 0.02);
    symN += 1;
  }
  const symmetry = symN ? Math.max(0, Math.min(1, symSum / symN)) : 0;

  // Dış hat: sağ kenar yukarı, sol kenar aşağı — kapalı çokgen
  const outline: Array<[number, number]> = [];
  for (let i = 0; i < PROFILE_SAMPLES; i += 1) {
    const t = i / (PROFILE_SAMPLES - 1);
    outline.push([0.5 + halfWidths[i], t]);
  }
  for (let i = PROFILE_SAMPLES - 1; i >= 0; i -= 1) {
    const t = i / (PROFILE_SAMPLES - 1);
    outline.push([0.5 - halfWidths[i], t]);
  }

  return { halfWidths, symmetry, aspectRatio: bw / bh };
}

function dominantColor(data: Uint8ClampedArray, m: MaskResult): string {
  let r = 0, g = 0, b = 0, n = 0;
  for (let p = 0; p < m.mask.length; p += 1) {
    if (!m.mask[p]) continue;
    const i = p * 4;
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n += 1;
  }
  if (!n) return "#d8d5cd";
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function cropPreview(
  canvas: HTMLCanvasElement,
  bbox: MaskResult["bbox"]
): string {
  const pad = 0.08;
  const bw = bbox.x1 - bbox.x0 + 1;
  const bh = bbox.y1 - bbox.y0 + 1;
  const px = Math.round(bw * pad), py = Math.round(bh * pad);
  const sx = Math.max(0, bbox.x0 - px), sy = Math.max(0, bbox.y0 - py);
  const sw = Math.min(canvas.width - sx, bw + px * 2);
  const sh = Math.min(canvas.height - sy, bh + py * 2);

  const out = document.createElement("canvas");
  out.width = sw;
  out.height = sh;
  const ctx = out.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/jpeg", 0.82);
  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return out.toDataURL("image/jpeg", 0.82);
}

function collectIssues(m: MaskResult, w: number, h: number): PhotoIssue[] {
  const issues: PhotoIssue[] = [];
  if (m.meanLuma < 42) {
    issues.push({
      code: "too-dark",
      message: "Fotoğraf biraz karanlık. Daha aydınlık bir ortamda çekersen sonuç daha iyi olur.",
      blocking: false,
    });
  }
  if (m.fraction < 0.03) {
    issues.push({
      code: "object-too-small",
      message: "Obje karede çok küçük kalmış. Biraz daha yakından çekmeyi dene.",
      blocking: true,
    });
  }
  if (m.fraction > 0.9 || m.separation < 14) {
    issues.push({
      code: "low-contrast",
      message: "Obje zeminden yeterince ayrılmıyor. Daha sade bir arka plan işe yarayabilir.",
      blocking: false,
    });
  }
  if (m.extraObjects) {
    issues.push({
      code: "multiple-objects",
      message: "Karede birden fazla obje var. Tek bir objeye odaklanırsan daha doğru bir model çıkar.",
      blocking: false,
    });
  }
  const touching =
    (m.bbox.x0 <= 1 ? 1 : 0) + (m.bbox.y0 <= 1 ? 1 : 0) +
    (m.bbox.x1 >= w - 2 ? 1 : 0) + (m.bbox.y1 >= h - 2 ? 1 : 0);
  if (touching >= 2) {
    issues.push({
      code: "cropped",
      message: "Obje karenin dışına taşıyor. Tamamı görünecek şekilde çekersen ölçüler daha isabetli olur.",
      blocking: false,
    });
  }
  return issues;
}

// ---------------------------------------------------------------
// Sağlayıcılar
// ---------------------------------------------------------------
export const silhouetteImageAnalysis: ImageAnalysisProvider = {
  id: "silhouette",
  async analyze(file) {
    const source = await decode(file);
    const { canvas, ctx, w, h } = drawToCanvas(source);
    const { data } = ctx.getImageData(0, 0, w, h);

    const m = buildMask(data, w, h);
    const { halfWidths, symmetry, aspectRatio } = extractProfile(m, w);

    const outline: Array<[number, number]> = [];
    for (let i = 0; i < halfWidths.length; i += 1)
      outline.push([0.5 + halfWidths[i], i / (halfWidths.length - 1)]);
    for (let i = halfWidths.length - 1; i >= 0; i -= 1)
      outline.push([0.5 - halfWidths[i], i / (halfWidths.length - 1)]);

    return {
      aspectRatio,
      profile: halfWidths,
      outline,
      symmetry,
      color: dominantColor(data, m),
      issues: collectIssues(m, w, h),
      previewDataUrl: cropPreview(canvas, m.bbox),
    };
  },
};

export const silhouetteModelGeneration: ModelGenerationProvider = {
  id: "silhouette",
  async generate(analysis: PhotoAnalysis): Promise<GeneratedModel> {
    const maxHalf = Math.max(...analysis.profile, 0.001);
    // Dönme simetrisi yüksekse profil kendi ekseninde döndürülür;
    // değilse dış hat kalınlaştırılır.
    const kind = analysis.symmetry >= 0.8 ? "revolve" : "extrude";

    const heightMm = ASSUMED_HEIGHT_MM;
    const widthMm = Math.round(heightMm * analysis.aspectRatio);
    // Tek fotoğraftan derinlik ölçülemez: simetrik objede genişliğe
    // eşit, düz objede genişliğin bir bölümü olarak tahmin edilir.
    const depthMm = kind === "revolve" ? widthMm : Math.round(widthMm * 0.38);

    const topHalf = analysis.profile[analysis.profile.length - 1] ?? 0;
    const bottomHalf = analysis.profile[0] ?? 0;
    const isVessel = kind === "revolve" && topHalf > maxHalf * 0.45;

    const parameters: ModelParameter[] = [
      {
        id: "height", label: "Yükseklik", unit: "mm",
        min: 30, max: 300, step: 1,
        value: heightMm, defaultValue: heightMm,
      },
      {
        id: "width", label: "Genişlik", unit: "mm",
        min: 20, max: 300, step: 1,
        value: widthMm, defaultValue: widthMm,
      },
    ];

    if (kind === "extrude") {
      parameters.push({
        id: "depth", label: "Derinlik", unit: "mm",
        hint: "Tek fotoğraftan ölçülemez — tahmin",
        min: 5, max: 300, step: 1,
        value: depthMm, defaultValue: depthMm,
      });
    } else {
      parameters.push({
        id: "mouth", label: "Ağız çapı", unit: "%",
        hint: "En geniş yere oranla",
        min: 10, max: 120, step: 1,
        value: Math.max(10, Math.round((topHalf / maxHalf) * 100)),
        defaultValue: Math.max(10, Math.round((topHalf / maxHalf) * 100)),
      });
      parameters.push({
        id: "base", label: "Taban çapı", unit: "%",
        hint: "En geniş yere oranla",
        min: 15, max: 120, step: 1,
        value: Math.max(15, Math.round((bottomHalf / maxHalf) * 100)),
        defaultValue: Math.max(15, Math.round((bottomHalf / maxHalf) * 100)),
      });
      if (isVessel) {
        parameters.push({
          id: "wall", label: "Duvar kalınlığı", unit: "mm",
          min: 1.2, max: 6, step: 0.2,
          value: 2.4, defaultValue: 2.4,
        });
      }
    }

    return {
      kind,
      profile: analysis.profile,
      outline: analysis.outline,
      parameters,
      dimensions: { widthMm, depthMm, heightMm },
      color: analysis.color,
      dimensionsConfirmed: false,
    };
  },
};
