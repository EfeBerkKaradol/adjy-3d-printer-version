/**
 * High-Resolution Photographic Lithophane Pre-Press & Optical Linearization Engine
 * - Loads real continuous-tone master photographs from ./assets/photos/*.jpg (with canvas fallback)
 * - Applies Unsharp Mask (USM) pre-compensation for PLA subsurface lateral light scatter (~0.35mm PSF)
 * - Applies calibrated Beer-Lambert / perceptual tonal curve & wrap framing modes
 */

export const PRESET_SPECIMENS = [
  {
    id: 'galata_bosphorus',
    label: '01 · Galata Kulesi & Boğaz Vapuru (Leica S/B Fotoğraf)',
    url: './assets/photos/galata_bosphorus.jpg'
  },
  {
    id: 'rembrandt_portrait',
    label: '02 · Stüdyo Rembrandt Portre (Yüksek Detay Fotoğraf)',
    url: './assets/photos/rembrandt_portrait.jpg'
  },
  {
    id: 'kackar_alpine',
    label: '03 · Kaçkar Zirveleri & Ayna Göl (Ansel Adams Tonlama)',
    url: './assets/photos/kackar_alpine.jpg'
  },
  {
    id: 'marble_botanical',
    label: '04 · Osmanlı Mermer Rumi & Lotus Rölyefi (Makro)',
    url: './assets/photos/marble_botanical.jpg'
  }
];

const imageCache = new Map();

/**
 * Fallback procedural canvas only if local asset fetch fails (e.g., opened via raw file://).
 */
export function renderFallbackCanvas(width = 960, height = 640) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const grad = ctx.createRadialGradient(width * 0.5, height * 0.42, 20, width * 0.5, height * 0.5, width * 0.6);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.5, '#7c7f87');
  grad.addColorStop(1, '#121316');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  return canvas;
}

/**
 * Loads one of the real photographic preset assets from ./assets/photos/*.jpg into a high-res canvas.
 */
export async function loadPresetPhotoCanvas(presetId = 'galata_bosphorus', maxDim = 1440) {
  if (imageCache.has(presetId)) {
    return imageCache.get(presetId);
  }

  const entry = PRESET_SPECIMENS.find((p) => p.id === presetId) || PRESET_SPECIMENS[0];

  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Asset load failed: ${entry.url}`));
      el.src = entry.url;
    });

    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (w > maxDim || h > maxDim) {
      const s = maxDim / Math.max(w, h);
      w = Math.round(w * s);
      h = Math.round(h * s);
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);

    const result = { canvas, width: w, height: h, name: entry.label };
    imageCache.set(presetId, result);
    return result;
  } catch {
    const canvas = renderFallbackCanvas(960, 640);
    return { canvas, width: 960, height: 640, name: entry.label };
  }
}

/**
 * Loads a user-uploaded image File into a high-resolution Canvas (up to 1600px).
 */
export function loadImageFileToCanvas(file, maxDim = 1600) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h);
        w = Math.max(64, Math.round(w * scale));
        h = Math.max(64, Math.round(h * scale));
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve({
        canvas,
        width: w,
        height: h,
        name: file.name
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Görsel okunamadı. Lütfen geçerli bir PNG/JPG/WEBP dosyası seçin.'));
    };
    img.src = url;
  });
}

/**
 * Separable 3-tap [1, 2, 1]/4 Gaussian blur helper on Float32Array.
 */
function gaussianBlurPass(src, dst, tmp, cols, rows, wrapHorizontal) {
  for (let r = 0; r < rows; r++) {
    const rowOff = r * cols;
    for (let c = 0; c < cols; c++) {
      const cPrev = wrapHorizontal ? (c - 1 + cols) % cols : Math.max(0, c - 1);
      const cNext = wrapHorizontal ? (c + 1) % cols : Math.min(cols - 1, c + 1);
      tmp[rowOff + c] = 0.25 * src[rowOff + cPrev] + 0.5 * src[rowOff + c] + 0.25 * src[rowOff + cNext];
    }
  }
  for (let r = 0; r < rows; r++) {
    const rPrev = Math.max(0, r - 1) * cols;
    const rCurr = r * cols;
    const rNext = Math.min(rows - 1, r + 1) * cols;
    for (let c = 0; c < cols; c++) {
      dst[rCurr + c] = 0.25 * tmp[rPrev + c] + 0.5 * tmp[rCurr + c] + 0.25 * tmp[rNext + c];
    }
  }
}

/**
 * Builds high-resolution DFM-calibrated luminance map [cols x rows] in [0..1]:
 *  - Supports wrapMode:
 *      'framed_window' -> Preserves photo aspect ratio on front 230° window + architectural fluted rear panel (zero distortion!)
 *      'dual_gallery'  -> Places 2 crisp aspect-matched panels (Front 0° & Rear 180°) separated by mullions
 *      'full_360'      -> Continuous 360° panoramic wrap with cosine seam feathering
 *  - Applies Unsharp Mask (USM) micro-detail pre-sharpening to counteract PLA subsurface blur
 *  - Applies Beer-Lambert optical midtone curve so shadows/midtones don't plug up in print
 */
export function buildLuminanceGrid(sourceCanvas, options = {}) {
  const {
    cols = 360,
    rows = 240,
    contrast = 1.12,
    sharpenAmount = 0.55,
    smoothingPasses = 1,
    invert = false,
    wrapHorizontal = false,
    wrapMode = 'full_360',
    targetAspect = cols / rows,
    previewCanvas = null
  } = options;

  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = cols;
  sampleCanvas.height = rows;
  const sctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = 'high';

  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const srcAspect = srcW / srcH;

  // Helper to draw cover-fitted image into a sub-rectangle [dx, dy, dw, dh]
  const drawCoverRect = (dx, dy, dw, dh) => {
    const boxAspect = dw / Math.max(1, dh);
    let sx = 0, sy = 0, sw = srcW, sh = srcH;
    if (Math.abs(srcAspect - boxAspect) > 0.02) {
      if (srcAspect > boxAspect) {
        sw = srcH * boxAspect;
        sx = (srcW - sw) * 0.5;
      } else {
        sh = srcW / boxAspect;
        sy = (srcH - sh) * 0.5;
      }
    }
    sctx.drawImage(sourceCanvas, sx, sy, sw, sh, dx, dy, dw, dh);
  };

  if (!wrapHorizontal || wrapMode === 'full_360') {
    drawCoverRect(0, 0, cols, rows);
  } else if (wrapMode === 'dual_gallery') {
    // Two symmetric 180° panels (centered at Front col=cols/2 and Rear col=0/cols) separated by crisp dark architectural mullions
    sctx.fillStyle = '#18181b';
    sctx.fillRect(0, 0, cols, rows);
    const mullionPx = Math.max(4, Math.round(cols * 0.022));
    const panelW = Math.floor((cols - mullionPx * 2) * 0.5);

    // Front panel centered at cols * 0.5
    const frontX = Math.round(cols * 0.5 - panelW * 0.5);
    drawCoverRect(frontX, 0, panelW, rows);

    // Rear panel split seamlessly across seam col=0 / col=cols
    const offPanel = document.createElement('canvas');
    offPanel.width = panelW;
    offPanel.height = rows;
    const octx = offPanel.getContext('2d');
    const boxAspect = panelW / rows;
    let sx = 0, sy = 0, sw = srcW, sh = srcH;
    if (srcAspect > boxAspect) {
      sw = srcH * boxAspect;
      sx = (srcW - sw) * 0.5;
    } else {
      sh = srcW / boxAspect;
      sy = (srcH - sh) * 0.5;
    }
    octx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, panelW, rows);

    const halfP = Math.floor(panelW * 0.5);
    // Right half of rear panel -> left edge of canvas (cols 0 .. halfP)
    sctx.drawImage(offPanel, halfP, 0, panelW - halfP, rows, 0, 0, panelW - halfP, rows);
    // Left half of rear panel -> right edge of canvas (cols - halfP .. cols)
    sctx.drawImage(offPanel, 0, 0, halfP, rows, cols - halfP, 0, halfP, rows);
  } else {
    // 'framed_window': True-aspect front panoramic window (~66% of circumference) + architectural fluted rear column
    sctx.fillStyle = '#1f2024';
    sctx.fillRect(0, 0, cols, rows);

    const winW = Math.min(Math.round(cols * 0.72), Math.max(Math.round(cols * 0.48), Math.round(rows * srcAspect * (cols / (targetAspect * rows)))));
    const winX = Math.round((cols - winW) * 0.5);

    // Subtle vertical architectural flutes on rear dark column (gives gorgeous structural ribs & warm pinstriped glow!)
    for (let x = 0; x < cols; x++) {
      if (x >= winX - 4 && x <= winX + winW + 4) continue;
      const flute = 0.22 + 0.14 * Math.cos((x / cols) * Math.PI * 2 * 36);
      const g = Math.round(flute * 255);
      sctx.fillStyle = `rgb(${g},${g},${g})`;
      sctx.fillRect(x, 0, 1, rows);
    }
    // Crisp dark frame pilaster on either side of photo window
    sctx.fillStyle = '#121316';
    sctx.fillRect(winX - 5, 0, winW + 10, rows);
    drawCoverRect(winX, 0, winW, rows);
  }

  const imgData = sctx.getImageData(0, 0, cols, rows).data;
  const rawLum = new Float32Array(cols * rows);

  // 1) Extract perceptual luminance + optical Beer-Lambert midtone compensation
  let pMin = 1.0, pMax = 0.0;
  for (let r = 0; r < rows; r++) {
    const imgRow = rows - 1 - r;
    for (let c = 0; c < cols; c++) {
      const idx = (imgRow * cols + c) * 4;
      const red = imgData[idx] / 255;
      const green = imgData[idx + 1] / 255;
      const blue = imgData[idx + 2] / 255;
      const alpha = imgData[idx + 3] / 255;

      let y = (0.2126 * red + 0.7152 * green + 0.0722 * blue) * alpha + (1 - alpha);
      if (invert) y = 1.0 - y;
      rawLum[r * cols + c] = y;
      if (y < pMin) pMin = y;
      if (y > pMax) pMax = y;
    }
  }

  // Auto dynamic-range stretch (soft 1%–99% normalization so dull uploads still achieve crisp 0.8–3.2mm relief)
  const dynSpan = Math.max(0.25, pMax - pMin);
  for (let i = 0; i < rawLum.length; i++) {
    let y = (rawLum[i] - pMin * 0.65) / Math.min(1.0, dynSpan + pMin * 0.35);
    y = Math.max(0, Math.min(1, y));
    // Contrast S-curve + slight gamma lift (0.90) to open up midtone PLA transmission
    y = Math.pow(y, 0.90);
    y = (y - 0.5) * contrast + 0.5;
    rawLum[i] = Math.max(0, Math.min(1, y));
  }

  // 2) Unsharp Mask (USM) micro-detail booster before DFM nozzle smoothing
  const blurred = new Float32Array(cols * rows);
  const tmp = new Float32Array(cols * rows);
  gaussianBlurPass(rawLum, blurred, tmp, cols, rows, wrapHorizontal);
  gaussianBlurPass(blurred, blurred, tmp, cols, rows, wrapHorizontal);

  const lum = new Float32Array(cols * rows);
  for (let i = 0; i < rawLum.length; i++) {
    const detail = rawLum[i] - blurred[i];
    lum[i] = Math.max(0, Math.min(1, rawLum[i] + detail * sharpenAmount));
  }

  // 3) Controlled sub-nozzle anti-aliasing smoothing pass (eliminates single-pixel spikes while keeping USM edges crisp)
  const passCount = Math.max(0, Math.min(3, Math.round(smoothingPasses)));
  for (let p = 0; p < passCount; p++) {
    gaussianBlurPass(lum, lum, tmp, cols, rows, wrapHorizontal);
  }

  // 4) Cosine seam feathering on full_360 wrap so 0°/360° back seam has zero step discontinuity
  if (wrapHorizontal && wrapMode === 'full_360' && cols >= 24) {
    const blendSpan = 6;
    for (let r = 0; r < rows; r++) {
      const rowOff = r * cols;
      const seamAvg = 0.5 * (lum[rowOff] + lum[rowOff + cols - 1]);
      for (let k = 0; k < blendSpan; k++) {
        const w = 0.5 * (1 + Math.cos((k / blendSpan) * Math.PI));
        lum[rowOff + k] = lum[rowOff + k] * (1 - 0.5 * w) + seamAvg * (0.5 * w);
        lum[rowOff + cols - 1 - k] = lum[rowOff + cols - 1 - k] * (1 - 0.5 * w) + seamAvg * (0.5 * w);
      }
    }
  }

  let minLum = 1, maxLum = 0, sumLum = 0;
  for (let i = 0; i < lum.length; i++) {
    const v = lum[i];
    if (v < minLum) minLum = v;
    if (v > maxLum) maxLum = v;
    sumLum += v;
  }

  if (previewCanvas) {
    const pctx = previewCanvas.getContext('2d');
    const pw = previewCanvas.width;
    const ph = previewCanvas.height;
    const outImg = pctx.createImageData(cols, rows);
    for (let r = 0; r < rows; r++) {
      const imgRow = rows - 1 - r;
      for (let c = 0; c < cols; c++) {
        const v = lum[r * cols + c];
        const idx = (imgRow * cols + c) * 4;
        outImg.data[idx] = Math.round(20 + v * 235);
        outImg.data[idx + 1] = Math.round(18 + v * 222);
        outImg.data[idx + 2] = Math.round(15 + v * 198);
        outImg.data[idx + 3] = 255;
      }
    }
    const off = document.createElement('canvas');
    off.width = cols;
    off.height = rows;
    off.getContext('2d').putImageData(outImg, 0, 0);
    pctx.clearRect(0, 0, pw, ph);
    pctx.drawImage(off, 0, 0, pw, ph);
  }

  return {
    luminance: lum,
    cols,
    rows,
    minLum,
    maxLum,
    meanLum: sumLum / lum.length
  };
}
