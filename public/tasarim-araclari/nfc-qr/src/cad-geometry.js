import * as THREE from 'three';

/**
 * Watertight 2-Manifold Parametric CAD Geometry Engine (1 unit = 1.00 mm, Z-up)
 * - True Smooth Vector 3D Typography & Icons via High-Res Sub-Pixel Marching Squares
 *   + Even-Odd Contour Inclusion Tree (crisp diagonals, smooth curves, exact inner counter-holes,
 *   full Turkish ÇĞİÖŞÜçğıöşü support, wide 3D signage tracking, zero voxel staircasing!)
 * - Sub-micron rectilinear anti-pinch 3D QR Matrix
 * - 6 Customizable Silhouettes, 3 Aspect Ratios, 3 Border Styles, 4 Keyhole Positions
 * - Internal sealed Ø26x1.2mm NFC pocket + live topological manifold verifier
 */

export const MATERIALS_DB = {
  PLA:   { label: 'PLA Mat / Pro (1.24 g/cm³)', density: 1.24, pricePerKgTry: 680 },
  PETG:  { label: 'PETG Endüstriyel (1.27 g/cm³)', density: 1.27, pricePerKgTry: 760 },
  ABS:   { label: 'ABS Teknik (1.04 g/cm³)', density: 1.04, pricePerKgTry: 720 },
  ASA:   { label: 'ASA Dış Mekan UV (1.07 g/cm³)', density: 1.07, pricePerKgTry: 940 },
  ALU:   { label: 'Alüminyum 6061 Referans (2.70 g/cm³)', density: 2.70, pricePerKgTry: 1400 },
  SS304: { label: 'Paslanmaz Çelik 304 Referans (8.00 g/cm³)', density: 8.00, pricePerKgTry: 2200 }
};

// Open-aperture DIN / Wayfinding signage font stacks (wide counters, zero slashed-zero clutter, high 3D relief legibility)
const FONT_CONFIGS = {
  Kalin_Tabela:  { weight: '700', family: '"Segoe UI", "Plus Jakarta Sans", Arial, sans-serif', trackingEm: 0.085, bolsterFactor: 0.016 },
  Modern_Sans:   { weight: '700', family: 'Arial, "Helvetica Neue", "Segoe UI", sans-serif', trackingEm: 0.075, bolsterFactor: 0.012 },
  Teknik_Mono:   { weight: '700', family: 'Bahnschrift, "Segoe UI", Arial, sans-serif', trackingEm: 0.090, bolsterFactor: 0.014 },
  Klasik_Serif:  { weight: '700', family: 'Georgia, "Times New Roman", serif', trackingEm: 0.070, bolsterFactor: 0.022 },
  Yuvarlak_Soft: { weight: '700', family: 'Verdana, "Trebuchet MS", "Segoe UI", sans-serif', trackingEm: 0.065, bolsterFactor: 0.010 }
};

export function computeSlicerPlan(params) {
  const layerH = Math.max(0.08, Math.min(0.36, Number(params.Katman_Yuksekligi_mm) || 0.20));
  const nominalPocketH = 1.20;
  const pocketLayers = Math.max(2, Math.ceil((nominalPocketH - 1e-6) / layerH));
  const pocketHeightMm = +(pocketLayers * layerH).toFixed(3);

  const rawBaseT = Math.max(2.4, Math.min(8.0, Number(params.Taban_Kalinligi_mm) || 3.2));
  const baseLayers = Math.max(pocketLayers + 4, Math.round(rawBaseT / layerH));
  const actualBaseMm = +(baseLayers * layerH).toFixed(3);

  const rawEmboss = Math.max(0.4, Math.min(3.0, Number(params.QR_Kabartma_mm) || 1.0));
  const embossLayers = Math.max(1, Math.round(rawEmboss / layerH));
  const actualEmbossMm = +(embossLayers * layerH).toFixed(3);

  const totalLayers = baseLayers + embossLayers;
  const totalHeightMm = +(totalLayers * layerH).toFixed(3);

  const solidLayers = baseLayers - pocketLayers;
  const bottomFloorLayers = Math.max(2, Math.min(solidLayers - 2, Math.round(solidLayers * 0.4)));
  const topBridgeLayers = solidLayers - bottomFloorLayers;

  const zNfcBottom = +(bottomFloorLayers * layerH).toFixed(3);
  const zNfcTop = +((bottomFloorLayers + pocketLayers) * layerH).toFixed(3);

  const nfcPauseLayer = bottomFloorLayers + pocketLayers + 1;
  const nfcPauseBedZ = zNfcTop;
  const nfcPauseSlicerRulerZ = +(nfcPauseLayer * layerH).toFixed(3);

  const m600PauseLayer = baseLayers + 1;
  const m600PauseBedZ = actualBaseMm;
  const m600PauseSlicerRulerZ = +(m600PauseLayer * layerH).toFixed(3);

  return {
    layerH,
    pocketLayers,
    pocketHeightMm,
    baseLayers,
    actualBaseMm,
    embossLayers,
    actualEmbossMm,
    totalLayers,
    totalHeightMm,
    bottomFloorLayers,
    topBridgeLayers,
    zNfcBottom,
    zNfcTop,
    nfcPauseLayer,
    nfcPauseBedZ,
    nfcPauseSlicerRulerZ,
    m600PauseLayer,
    m600PauseBedZ,
    m600PauseSlicerRulerZ
  };
}

/**
 * Draws bold FDM-printable vector icons onto 2D canvas context centered at (cx, cy) with box `size`.
 */
function drawProceduralIcon(ctx, iconType, cx, cy, size) {
  if (!iconType || iconType === 'Yok' || size < 8) return;
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const r = size * 0.45;
  const lw = Math.max(4.0, size * 0.145);
  ctx.lineWidth = lw;

  if (iconType === 'NFC_Dalga') {
    ctx.beginPath();
    ctx.arc(cx - r * 0.45, cy, lw * 0.68, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 1; k <= 3; k++) {
      ctx.beginPath();
      ctx.arc(cx - r * 0.48, cy, r * (0.35 * k), -0.68, 0.68);
      ctx.stroke();
    }
  } else if (iconType === 'WiFi_Sinyal') {
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.55, lw * 0.70, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 1; k <= 3; k++) {
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.58, r * (0.36 * k), -Math.PI * 0.76, -Math.PI * 0.24);
      ctx.stroke();
    }
  } else if (iconType === 'Kahve_Fincan') {
    const cupW = r * 1.25;
    const cupH = r * 0.95;
    const cupLeft = cx - cupW * 0.58;
    const cupTop = cy - cupH * 0.12;
    ctx.fillRect(cupLeft, cupTop, cupW, cupH * 0.70);
    ctx.beginPath();
    ctx.arc(cupLeft + cupW * 0.5, cupTop + cupH * 0.66, cupW * 0.5, 0, Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cupLeft + cupW, cupTop + cupH * 0.40, r * 0.30, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
    ctx.lineWidth = Math.max(3.2, lw * 0.75);
    for (const dx of [-0.22, 0.22]) {
      ctx.beginPath();
      ctx.moveTo(cupLeft + cupW * (0.5 + dx), cupTop - r * 0.16);
      ctx.lineTo(cupLeft + cupW * (0.5 + dx), cupTop - r * 0.56);
      ctx.stroke();
    }
  } else if (iconType === 'Instagram_Kamera') {
    const box = r * 1.66;
    const rad = box * 0.26;
    const x0 = cx - box * 0.5;
    const y0 = cy - box * 0.5;
    ctx.beginPath();
    ctx.roundRect(x0, y0, box, box, rad);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, box * 0.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x0 + box * 0.76, y0 + box * 0.24, lw * 0.52, 0, Math.PI * 2);
    ctx.fill();
  } else if (iconType === 'Konum_Pin') {
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.22, r * 0.58, Math.PI * 0.88, Math.PI * 0.12, false);
    ctx.lineTo(cx, cy + r * 0.88);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.24, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  } else if (iconType === 'Yildiz_VIP') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI * 0.5 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? r * 0.96 : r * 0.44;
      const px = cx + Math.cos(ang) * rad;
      const py = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Measures & draws character-by-character wide-tracked 3D signage text so adjacent letters
 * never crowd or fuse together when 3D embossed!
 */
function measureTrackedText(ctx, text, trackingPx) {
  const chars = Array.from(text);
  if (chars.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < chars.length; i++) {
    total += ctx.measureText(chars[i]).width;
    if (i < chars.length - 1) total += trackingPx;
  }
  return total;
}

function fillTrackedText(ctx, text, startX, centerY, trackingPx, strokeBolsterPx = 0) {
  const chars = Array.from(text);
  let curX = startX;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (strokeBolsterPx > 0) {
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = strokeBolsterPx;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeText(ch, curX, centerY);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillText(ch, curX, centerY);
    curX += ctx.measureText(ch).width + trackingPx;
  }
}

function signedArea2D(pts) {
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    area += a.x * b.y - b.x * a.y;
  }
  return area * 0.5;
}

function pointInPolygon2D(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Ramer-Douglas-Peucker closed-loop simplification + gentle Laplacian smoothing
 * for crisp straight letter strokes and silky curved arcs without self-intersection.
 */
function smoothAndSimplifyClosedLoop(pts, smoothPasses = 2, rdpEps = 0.022) {
  let cur = pts;
  const n0 = cur.length;
  if (n0 < 5) return cur;

  // Light Taubin/Laplacian smoothing to remove sub-pixel grid ripple while preserving sharp corners (> 50° turn)
  for (let pass = 0; pass < smoothPasses; pass++) {
    const next = new Array(cur.length);
    const weight = pass % 2 === 0 ? 0.34 : -0.18;
    for (let i = 0; i < cur.length; i++) {
      const prev = cur[(i - 1 + cur.length) % cur.length];
      const me = cur[i];
      const nxt = cur[(i + 1) % cur.length];

      const v1x = me.x - prev.x, v1y = me.y - prev.y;
      const v2x = nxt.x - me.x, v2y = nxt.y - me.y;
      const l1 = Math.hypot(v1x, v1y);
      const l2 = Math.hypot(v2x, v2y);
      const cosAng = (l1 > 1e-6 && l2 > 1e-6) ? (v1x * v2x + v1y * v2y) / (l1 * l2) : 1;

      // Preserve sharp corners (like tips of A, V, N, M, E, 4) when turning angle > ~48 deg
      if (cosAng < 0.66) {
        next[i] = me.clone();
      } else {
        const midX = 0.5 * (prev.x + nxt.x);
        const midY = 0.5 * (prev.y + nxt.y);
        next[i] = new THREE.Vector2(
          me.x + (midX - me.x) * weight,
          me.y + (midY - me.y) * weight
        );
      }
    }
    cur = next;
  }

  // Collinear / RDP simplification on two halves of closed loop so straight strokes use minimal clean segments
  const simplifySegment = (arr, s, e, eps, out) => {
    let maxDist = 0;
    let maxIdx = -1;
    const pS = arr[s];
    const pE = arr[e];
    const dx = pE.x - pS.x;
    const dy = pE.y - pS.y;
    const len2 = dx * dx + dy * dy;

    for (let i = s + 1; i < e; i++) {
      const p = arr[i];
      let t = len2 > 1e-10 ? ((p.x - pS.x) * dx + (p.y - pS.y) * dy) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(p.x - (pS.x + t * dx), p.y - (pS.y + t * dy));
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }

    if (maxDist > eps && maxIdx !== -1) {
      simplifySegment(arr, s, maxIdx, eps, out);
      out.push(arr[maxIdx]);
      simplifySegment(arr, maxIdx, e, eps, out);
    }
  };

  const half = Math.floor(cur.length / 2);
  const simplified = [cur[0]];
  simplifySegment(cur, 0, half, rdpEps, simplified);
  simplified.push(cur[half]);
  const closedArr = [...cur.slice(half), cur[0]];
  simplifySegment(closedArr, 0, closedArr.length - 1, rdpEps, simplified);

  const rawOut = simplified.length >= 4 ? simplified : cur;
  const cleanOut = [];
  for (let i = 0; i < rawOut.length; i++) {
    const prev = cleanOut[cleanOut.length - 1];
    if (!prev || prev.distanceTo(rawOut[i]) > 4e-3) cleanOut.push(rawOut[i]);
  }
  if (cleanOut.length > 2 && cleanOut[0].distanceTo(cleanOut[cleanOut.length - 1]) <= 4e-3) {
    cleanOut.pop();
  }
  return cleanOut;
}

/**
 * Renders crisp high-resolution vector typography & icons onto an offscreen canvas (`~12 px/mm`),
 * applies a smooth binomial SDF filter, and extracts exact sub-pixel closed vector contours
 * via Saddle-Consistent Linear-Interpolated Marching Squares + Even-Odd Inclusion Tree!
 */
function extractVectorGraphicsContourTree({
  xGfxMin,
  xGfxMax,
  yGfxMin,
  yGfxMax,
  qrExcludeRect, // { xMin, xMax, yMin, yMax } strictly cleared with moat
  headerText,
  footerText,
  fontKey,
  textAlign,
  textScalePct,
  iconType,
  iconPlacement,
  borderStyle,
  layoutBlocks
}) {
  const spanX = xGfxMax - xGfxMin;
  const spanY = yGfxMax - yGfxMin;
  if (spanX < 6 || spanY < 6) return [];

  // Ultra-high resolution ~13–15 px/mm (~70-micron sub-pixel vector precision!)
  const pxPerMm = Math.min(15.0, Math.max(11.0, 960 / Math.max(spanX, spanY)));
  const cw = Math.max(64, Math.round(spanX * pxPerMm));
  const ch = Math.max(64, Math.round(spanY * pxPerMm));

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  const mmToPxX = (xMm) => ((xMm - xGfxMin) / spanX) * cw;
  const mmToPxY = (yMm) => ((yGfxMax - yMm) / spanY) * ch;
  const mmLenPx = (mm) => mm * pxPerMm;

  ctx.clearRect(0, 0, cw, ch);

  // 1. Optional Inner Decorative Pinstripe Frame
  if (borderStyle === 'Cift_Cizgi_Cerceve') {
    const strokePx = Math.max(7, mmLenPx(1.15));
    const inset = strokePx * 0.95 + 4;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = strokePx;
    ctx.beginPath();
    ctx.roundRect(inset, inset, cw - 2 * inset, ch - 2 * inset, Math.max(6, mmLenPx(2.8)));
    ctx.stroke();
  }

  const fontCfg = FONT_CONFIGS[fontKey] || FONT_CONFIGS.Modern_Sans;
  const userScale = Math.max(0.60, Math.min(1.50, (Number(textScalePct) || 100) / 100));

  const drawTextBlock = (rawStr, box, withInlineIcon) => {
    const clean = (rawStr || '').trim();
    const hasIconHere = withInlineIcon && iconType && iconType !== 'Yok';
    if (!clean && !hasIconHere) return;

    const padPx = 4;
    const bx0 = mmToPxX(box.xMin) + padPx;
    const bx1 = mmToPxX(box.xMax) - padPx;
    const by0 = mmToPxY(box.yMax) + padPx;
    const by1 = mmToPxY(box.yMin) - padPx;
    const bw = Math.max(16, bx1 - bx0);
    const bh = Math.max(14, by1 - by0);
    const cy = 0.5 * (by0 + by1);

    if (!clean && hasIconHere) {
      drawProceduralIcon(ctx, iconType, 0.5 * (bx0 + bx1), cy, Math.min(bw, bh) * 0.88);
      return;
    }

    let fontPx = Math.max(18, Math.min(Math.floor(bh * 0.88), Math.floor(bh * 0.78 * userScale)));
    ctx.font = `${fontCfg.weight} ${fontPx}px ${fontCfg.family}`;
    let trackingPx = fontPx * fontCfg.trackingEm;
    let iconSizePx = hasIconHere ? Math.min(bh * 0.88, fontPx * 1.15) : 0;
    let iconGapPx = hasIconHere ? iconSizePx * 0.38 : 0;

    let textW = measureTrackedText(ctx, clean, trackingPx);
    const maxW = bw * 0.96;
    if (textW + iconSizePx + iconGapPx > maxW && textW > 0) {
      const fitRatio = Math.max(0.32, (maxW - iconSizePx - iconGapPx) / textW);
      fontPx = Math.max(15, Math.floor(fontPx * fitRatio));
      ctx.font = `${fontCfg.weight} ${fontPx}px ${fontCfg.family}`;
      trackingPx = fontPx * fontCfg.trackingEm;
      iconSizePx = hasIconHere ? Math.min(bh * 0.85, fontPx * 1.12) : 0;
      iconGapPx = hasIconHere ? iconSizePx * 0.36 : 0;
      textW = measureTrackedText(ctx, clean, trackingPx);
    }

    const totalGroupW = textW + (hasIconHere ? iconSizePx + iconGapPx : 0);
    let startX = bx0 + (bw - totalGroupW) * 0.5;
    if (textAlign === 'Sol') startX = bx0 + bw * 0.02;
    else if (textAlign === 'Sag') startX = bx1 - bw * 0.02 - totalGroupW;

    if (hasIconHere) {
      drawProceduralIcon(ctx, iconType, startX + iconSizePx * 0.5, cy, iconSizePx);
    }

    // Per-font gentle bolster keeps thin serif stems printable without closing open counters (A, B, 8, #)
    const bolsterPx = Math.max(0.45, fontPx * (fontCfg.bolsterFactor ?? 0.014));
    fillTrackedText(
      ctx,
      clean,
      startX + (hasIconHere ? iconSizePx + iconGapPx : 0),
      cy + fontPx * 0.03,
      trackingPx,
      bolsterPx
    );
  };

  if (layoutBlocks.hdrBox) {
    drawTextBlock(headerText, layoutBlocks.hdrBox, iconPlacement === 'Baslik_Solu');
  }
  if (layoutBlocks.ftrBox) {
    drawTextBlock(footerText, layoutBlocks.ftrBox, false);
  }
  if (layoutBlocks.iconBox && iconType && iconType !== 'Yok' && iconPlacement !== 'Baslik_Solu') {
    const ix0 = mmToPxX(layoutBlocks.iconBox.xMin);
    const ix1 = mmToPxX(layoutBlocks.iconBox.xMax);
    const iy0 = mmToPxY(layoutBlocks.iconBox.yMax);
    const iy1 = mmToPxY(layoutBlocks.iconBox.yMin);
    drawProceduralIcon(
      ctx,
      iconType,
      0.5 * (ix0 + ix1),
      0.5 * (iy0 + iy1),
      Math.min(ix1 - ix0, iy1 - iy0) * 0.86
    );
  }

  // Clear QR Quiet Zone + moat so no contour ever touches qrCollarCCW
  if (qrExcludeRect) {
    const qx0 = Math.floor(mmToPxX(qrExcludeRect.xMin)) - 3;
    const qx1 = Math.ceil(mmToPxX(qrExcludeRect.xMax)) + 3;
    const qy0 = Math.floor(mmToPxY(qrExcludeRect.yMax)) - 3;
    const qy1 = Math.ceil(mmToPxY(qrExcludeRect.yMin)) + 3;
    ctx.clearRect(qx0, qy0, qx1 - qx0, qy1 - qy0);
  }

  // Extract alpha field & apply 1 pass of 3x3 [1,2,1] binomial smoothing
  const rgba = ctx.getImageData(0, 0, cw, ch).data;
  const rawField = new Float32Array(cw * ch);
  for (let i = 0; i < cw * ch; i++) {
    rawField[i] = rgba[i * 4 + 3] / 255.0;
  }

  const field = new Float32Array(cw * ch);
  for (let r = 2; r < ch - 2; r++) {
    const rowOff = r * cw;
    for (let c = 2; c < cw - 2; c++) {
      const idx = rowOff + c;
      field[idx] = (
        rawField[idx - cw - 1] + 2 * rawField[idx - cw] + rawField[idx - cw + 1] +
        2 * rawField[idx - 1]  + 4 * rawField[idx]      + 2 * rawField[idx + 1] +
        rawField[idx + cw - 1] + 2 * rawField[idx + cw] + rawField[idx + cw + 1]
      ) * 0.0625;
    }
  }

  // Enforce strict 0 moat around outer 2 pixels & inside qrExcludeRect
  if (qrExcludeRect) {
    const qx0 = Math.max(0, Math.floor(mmToPxX(qrExcludeRect.xMin)) - 2);
    const qx1 = Math.min(cw - 1, Math.ceil(mmToPxX(qrExcludeRect.xMax)) + 2);
    const qy0 = Math.max(0, Math.floor(mmToPxY(qrExcludeRect.yMax)) - 2);
    const qy1 = Math.min(ch - 1, Math.ceil(mmToPxY(qrExcludeRect.yMin)) + 2);
    for (let r = qy0; r <= qy1; r++) {
      const ro = r * cw;
      for (let c = qx0; c <= qx1; c++) field[ro + c] = 0;
    }
  }

  // Saddle-Consistent Linear-Interpolated Marching Squares
  const iso = 0.45;
  const safeVal = (v) => (Math.abs(v - iso) < 1e-5 ? iso + 1e-5 : v);

  // Unique integer IDs for grid edges:
  // Horizontal edge (c, r)-(c+1, r): id = r * cw + c
  // Vertical edge (c, r)-(c, r+1):   id = horizCount + r * (cw + 1) + c
  const horizCount = (ch + 1) * cw;
  const hEdgeId = (c, r) => r * cw + c;
  const vEdgeId = (c, r) => horizCount + r * (cw + 1) + c;

  const pxToMmPt = (px, py) => new THREE.Vector2(
    xGfxMin + (px / cw) * spanX,
    yGfxMax - (py / ch) * spanY
  );

  // Directed segment map: startEdgeId -> Array<{ endEdgeId, startPt }>
  // (Array handles rare saddle cells cleanly; visited flag consumes each segment once)
  const adj = new Map();
  const addDirectedSeg = (eStart, ptStart, eEnd) => {
    let list = adj.get(eStart);
    if (!list) {
      list = [];
      adj.set(eStart, list);
    }
    list.push({ eEnd, ptStart, used: false });
  };

  for (let r = 0; r < ch - 1; r++) {
    const r0 = r * cw;
    const r1 = (r + 1) * cw;
    for (let c = 0; c < cw - 1; c++) {
      const v00 = safeVal(field[r0 + c]);
      const v10 = safeVal(field[r0 + c + 1]);
      const v11 = safeVal(field[r1 + c + 1]);
      const v01 = safeVal(field[r1 + c]);

      const mask =
        (v00 > iso ? 1 : 0) |
        (v10 > iso ? 2 : 0) |
        (v11 > iso ? 4 : 0) |
        (v01 > iso ? 8 : 0);

      if (mask === 0 || mask === 15) continue;

      const eTop = () => ({ id: hEdgeId(c, r), pt: pxToMmPt(c + (iso - v00) / (v10 - v00), r) });
      const eRight = () => ({ id: vEdgeId(c + 1, r), pt: pxToMmPt(c + 1, r + (iso - v10) / (v11 - v10)) });
      const eBot = () => ({ id: hEdgeId(c, r + 1), pt: pxToMmPt(c + (iso - v01) / (v11 - v01), r + 1) });
      const eLeft = () => ({ id: vEdgeId(c, r), pt: pxToMmPt(c, r + (iso - v00) / (v01 - v00)) });

      const emit = (fnA, fnB) => {
        const A = fnA();
        const B = fnB();
        addDirectedSeg(A.id, A.pt, B.id);
      };

      switch (mask) {
        case 1:  emit(eLeft, eTop); break;
        case 2:  emit(eTop, eRight); break;
        case 3:  emit(eLeft, eRight); break;
        case 4:  emit(eRight, eBot); break;
        case 5: {
          const vc = 0.25 * (v00 + v10 + v11 + v01);
          if (vc > iso) { emit(eLeft, eBot); emit(eRight, eTop); }
          else { emit(eLeft, eTop); emit(eRight, eBot); }
          break;
        }
        case 6:  emit(eTop, eBot); break;
        case 7:  emit(eLeft, eBot); break;
        case 8:  emit(eBot, eLeft); break;
        case 9:  emit(eBot, eTop); break;
        case 10: {
          const vc = 0.25 * (v00 + v10 + v11 + v01);
          if (vc > iso) { emit(eTop, eLeft); emit(eBot, eRight); }
          else { emit(eTop, eRight); emit(eBot, eLeft); }
          break;
        }
        case 11: emit(eBot, eRight); break;
        case 12: emit(eRight, eLeft); break;
        case 13: emit(eRight, eTop); break;
        case 14: emit(eTop, eLeft); break;
      }
    }
  }

  // Stitch closed loops
  const rawContours = [];
  for (const [startId, segList] of adj.entries()) {
    for (const firstSeg of segList) {
      if (firstSeg.used) continue;
      firstSeg.used = true;
      const loopPts = [firstSeg.ptStart];
      let curEdge = firstSeg.eEnd;
      let guard = 0;

      while (curEdge !== startId && guard++ < 50000) {
        const nextList = adj.get(curEdge);
        if (!nextList) break;
        const nextSeg = nextList.find((s) => !s.used);
        if (!nextSeg) break;
        nextSeg.used = true;
        loopPts.push(nextSeg.ptStart);
        curEdge = nextSeg.eEnd;
      }

      if (curEdge === startId && loopPts.length >= 4) {
        const smoothed = smoothAndSimplifyClosedLoop(loopPts, 2, 0.018);
        if (smoothed.length >= 3) {
          const area = signedArea2D(smoothed);
          if (Math.abs(area) >= 0.045) {
            // Normalize all contours to strict CCW (signedArea > 0) for uniform tree logic
            if (area < 0) smoothed.reverse();
            rawContours.push({
              pts: smoothed,
              absArea: Math.abs(area),
              depth: 0,
              parent: null,
              children: []
            });
          }
        }
      }
    }
  }

  // Build Even-Odd Nesting Inclusion Tree (sort descending by area so parents precede children)
  rawContours.sort((a, b) => b.absArea - a.absArea);
  for (let i = 0; i < rawContours.length; i++) {
    const child = rawContours[i];
    const testPt = child.pts[0];
    let bestParent = null;
    let depthCount = 0;
    for (let j = 0; j < i; j++) {
      const cand = rawContours[j];
      if (pointInPolygon2D(testPt.x, testPt.y, cand.pts)) {
        depthCount++;
        bestParent = cand; // smallest-area ancestor because sorted descending!
      }
    }
    child.depth = depthCount;
    child.parent = bestParent;
    if (bestParent) bestParent.children.push(child);
  }

  return rawContours;
}

/**
 * Expands a boolean [rows x cols] QR grid into a [3*rows x 3*cols] anti-pinch manifold grid.
 */
function buildAntiPinchSubgrid(cellGrid, rows, cols, xMin, xMax, yMin, yMax, eps = 0.032) {
  const cellW = (xMax - xMin) / cols;
  const cellH = (yMax - yMin) / rows;
  const safeEpsX = Math.min(eps, cellW * 0.18);
  const safeEpsY = Math.min(eps, cellH * 0.18);

  const subCols = cols * 3;
  const subRows = rows * 3;
  const xs = new Float64Array(subCols + 1);
  const ys = new Float64Array(subRows + 1);

  for (let c = 0; c < cols; c++) {
    const x0 = xMin + c * cellW;
    const x1 = c === cols - 1 ? xMax : xMin + (c + 1) * cellW;
    xs[c * 3] = x0;
    xs[c * 3 + 1] = x0 + safeEpsX;
    xs[c * 3 + 2] = x1 - safeEpsX;
  }
  xs[subCols] = xMax;

  for (let j = 0; j < rows; j++) {
    const y0 = yMin + j * cellH;
    const y1 = j === rows - 1 ? yMax : yMin + (j + 1) * cellH;
    ys[j * 3] = y0;
    ys[j * 3 + 1] = y0 + safeEpsY;
    ys[j * 3 + 2] = y1 - safeEpsY;
  }
  ys[subRows] = yMax;

  const getCell = (jAsc, c) => {
    if (jAsc < 0 || jAsc >= rows || c < 0 || c >= cols) return 0;
    const rTopDown = rows - 1 - jAsc;
    return cellGrid[rTopDown * cols + c] ? 1 : 0;
  };

  const raised = new Uint8Array(subRows * subCols);
  for (let j = 0; j < rows; j++) {
    for (let c = 0; c < cols; c++) {
      if (!getCell(j, c)) continue;
      const n = getCell(j + 1, c);
      const s = getCell(j - 1, c);
      const w = getCell(j, c - 1);
      const e = getCell(j, c + 1);
      const nw = getCell(j + 1, c - 1);
      const ne = getCell(j + 1, c + 1);
      const sw = getCell(j - 1, c - 1);
      const se = getCell(j - 1, c + 1);

      const bJ = j * 3;
      const bI = c * 3;

      raised[(bJ + 1) * subCols + (bI + 1)] = 1;
      if (n) raised[(bJ + 2) * subCols + (bI + 1)] = 1;
      if (s) raised[(bJ + 0) * subCols + (bI + 1)] = 1;
      if (w) raised[(bJ + 1) * subCols + (bI + 0)] = 1;
      if (e) raised[(bJ + 1) * subCols + (bI + 2)] = 1;
      if (n && w && nw) raised[(bJ + 2) * subCols + (bI + 0)] = 1;
      if (n && e && ne) raised[(bJ + 2) * subCols + (bI + 2)] = 1;
      if (s && w && sw) raised[(bJ + 0) * subCols + (bI + 0)] = 1;
      if (s && e && se) raised[(bJ + 0) * subCols + (bI + 2)] = 1;
    }
  }

  return { xs, ys, subCols, subRows, raised };
}

function compressRectilinearGrid(xsIn, ysIn, gridIn) {
  const M0 = xsIn.length - 1;
  const K0 = ysIn.length - 1;

  const keepX = [xsIn[0]];
  const colRep = [0];
  for (let i = 1; i < M0; i++) {
    const prev = colRep[colRep.length - 1];
    let identical = true;
    for (let j = 0; j < K0; j++) {
      if (gridIn[j * M0 + i] !== gridIn[j * M0 + prev]) {
        identical = false;
        break;
      }
    }
    if (!identical) {
      keepX.push(xsIn[i]);
      colRep.push(i);
    }
  }
  keepX.push(xsIn[M0]);
  const M1 = colRep.length;

  const keepY = [ysIn[0]];
  const rowRep = [0];
  for (let j = 1; j < K0; j++) {
    const prev = rowRep[rowRep.length - 1];
    let identical = true;
    for (let m = 0; m < M1; m++) {
      const c = colRep[m];
      if (gridIn[j * M0 + c] !== gridIn[prev * M0 + c]) {
        identical = false;
        break;
      }
    }
    if (!identical) {
      keepY.push(ysIn[j]);
      rowRep.push(j);
    }
  }
  keepY.push(ysIn[K0]);
  const K1 = rowRep.length;

  const outGrid = new Uint8Array(K1 * M1);
  for (let j = 0; j < K1; j++) {
    const origJ = rowRep[j];
    for (let i = 0; i < M1; i++) {
      outGrid[j * M1 + i] = gridIn[origJ * M0 + colRep[i]];
    }
  }

  return { xs: keepX, ys: keepY, M: M1, K: K1, cellRaised: outGrid };
}

export function buildBaseShapeSilhouette(W, L, shapeType, cornerRadiusMm) {
  const hw = W * 0.5;
  const hl = L * 0.5;
  const pts = [];

  const addArc = (cx, cy, rx, ry, aStart, aEnd, segs, skipFirst = false) => {
    for (let i = skipFirst ? 1 : 0; i <= segs; i++) {
      const t = aStart + ((aEnd - aStart) * i) / segs;
      pts.push(new THREE.Vector2(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry));
    }
  };

  if (shapeType === 'Daire_Madalyon') {
    const segs = 72;
    for (let i = 0; i < segs; i++) {
      const t = (i / segs) * Math.PI * 2;
      pts.push(new THREE.Vector2(Math.cos(t) * hw, Math.sin(t) * hl));
    }
  } else if (shapeType === 'Sekizgen_Plaka') {
    const c = Math.min(hw, hl) * 0.34;
    const raw = [
      new THREE.Vector2(-hw + c, -hl),
      new THREE.Vector2(hw - c, -hl),
      new THREE.Vector2(hw, -hl + c),
      new THREE.Vector2(hw, hl - c),
      new THREE.Vector2(hw - c, hl),
      new THREE.Vector2(-hw + c, hl),
      new THREE.Vector2(-hw, hl - c),
      new THREE.Vector2(-hw, -hl + c)
    ];
    return subdividePolygonEdges(raw, 4.0);
  } else if (shapeType === 'Altigen_Rozet') {
    const raw = [
      new THREE.Vector2(-hw * 0.62, -hl),
      new THREE.Vector2(hw * 0.62, -hl),
      new THREE.Vector2(hw, 0),
      new THREE.Vector2(hw * 0.62, hl),
      new THREE.Vector2(-hw * 0.62, hl),
      new THREE.Vector2(-hw, 0)
    ];
    return subdividePolygonEdges(raw, 4.0);
  } else if (shapeType === 'Kemer_Stand') {
    const rBot = Math.min(5.0, hw * 0.16);
    const ySpring = hl * 0.18;
    addArc(-hw + rBot, -hl + rBot, rBot, rBot, Math.PI, Math.PI * 1.5, 6, false);
    addArc(hw - rBot, -hl + rBot, rBot, rBot, -Math.PI * 0.5, 0, 6, false);
    addArc(0, ySpring, hw, hl - ySpring, 0, Math.PI, 36, false);
    return subdividePolygonEdges(dedupContour(pts), 4.5);
  } else if (shapeType === 'Kalkan_Rozet') {
    const rTop = Math.min(6.0, hw * 0.18);
    const raw = [
      new THREE.Vector2(-hw * 0.38, -hl),
      new THREE.Vector2(hw * 0.38, -hl),
      new THREE.Vector2(hw * 0.86, -hl * 0.52),
      new THREE.Vector2(hw, hl * 0.15)
    ];
    for (const p of raw) pts.push(p);
    addArc(hw - rTop, hl - rTop, rTop, rTop, 0, Math.PI * 0.5, 6, false);
    addArc(-hw + rTop, hl - rTop, rTop, rTop, Math.PI * 0.5, Math.PI, 6, false);
    pts.push(new THREE.Vector2(-hw, hl * 0.15));
    pts.push(new THREE.Vector2(-hw * 0.86, -hl * 0.52));
    return subdividePolygonEdges(dedupContour(pts), 4.0);
  } else {
    const r = Math.max(1.5, Math.min(Number(cornerRadiusMm) || 6.5, Math.min(hw, hl) * 0.46));
    const segs = Math.max(8, Math.round(r * 1.1));
    addArc(-hw + r, -hl + r, r, r, Math.PI, Math.PI * 1.5, segs, false);
    addArc(hw - r, -hl + r, r, r, -Math.PI * 0.5, 0, segs, false);
    addArc(hw - r, hl - r, r, r, 0, Math.PI * 0.5, segs, false);
    addArc(-hw + r, hl - r, r, r, Math.PI * 0.5, Math.PI, segs, false);
    return subdividePolygonEdges(dedupContour(pts), 5.0);
  }

  return dedupContour(pts);
}

function dedupContour(pts) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = out[out.length - 1];
    if (!prev || prev.distanceTo(pts[i]) > 1e-3) out.push(pts[i]);
  }
  if (out.length > 2 && out[0].distanceTo(out[out.length - 1]) < 1e-3) out.pop();
  return out;
}

function subdividePolygonEdges(pts, maxSegLen) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const dist = a.distanceTo(b);
    const steps = Math.max(1, Math.ceil(dist / maxSegLen));
    for (let s = 0; s < steps; s++) {
      out.push(a.clone().lerp(b, s / steps));
    }
  }
  return out;
}

function unionPolygonWithCircularLug(poly, lugCenter, lugR) {
  const n = poly.length;
  const inside = poly.map((p) => p.distanceTo(lugCenter) <= lugR + 1e-5);
  if (!inside.some(Boolean) || inside.every(Boolean)) return poly;

  let enterEdgeIdx = -1;
  let exitEdgeIdx = -1;
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    if (!inside[i] && inside[next]) enterEdgeIdx = i;
    if (inside[i] && !inside[next]) exitEdgeIdx = i;
  }
  if (enterEdgeIdx === -1 || exitEdgeIdx === -1) return poly;

  const intersectSegCircle = (p0, p1) => {
    let lo = 0;
    let hi = 1;
    const p0In = p0.distanceTo(lugCenter) <= lugR;
    for (let it = 0; it < 24; it++) {
      const mid = 0.5 * (lo + hi);
      const pm = p0.clone().lerp(p1, mid);
      const mIn = pm.distanceTo(lugCenter) <= lugR;
      if (mIn === p0In) lo = mid;
      else hi = mid;
    }
    return p0.clone().lerp(p1, 0.5 * (lo + hi));
  };

  const pEnter = intersectSegCircle(poly[enterEdgeIdx], poly[(enterEdgeIdx + 1) % n]);
  const pExit = intersectSegCircle(poly[exitEdgeIdx], poly[(exitEdgeIdx + 1) % n]);

  const result = [];
  let idx = (exitEdgeIdx + 1) % n;
  while (true) {
    result.push(poly[idx]);
    if (idx === enterEdgeIdx) break;
    idx = (idx + 1) % n;
  }
  result.push(pEnter);

  let aStart = Math.atan2(pEnter.y - lugCenter.y, pEnter.x - lugCenter.x);
  let aEnd = Math.atan2(pExit.y - lugCenter.y, pExit.x - lugCenter.x);
  while (aEnd <= aStart) aEnd += Math.PI * 2;

  const arcSteps = 22;
  for (let s = 1; s < arcSteps; s++) {
    const ang = aStart + ((aEnd - aStart) * s) / arcSteps;
    result.push(new THREE.Vector2(lugCenter.x + Math.cos(ang) * lugR, lugCenter.y + Math.sin(ang) * lugR));
  }
  result.push(pExit);

  return dedupContour(result);
}

function minClearanceInsidePolygon(px, py, poly) {
  if (!pointInPolygon2D(px, py, poly)) return -100;
  let minDist = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const len2 = abx * abx + aby * aby;
    let t = len2 > 1e-9 ? ((px - a.x) * abx + (py - a.y) * aby) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(px - (a.x + t * abx), py - (a.y + t * aby));
    if (d < minDist) minDist = d;
  }
  return minDist;
}

function fitInscribedCanvasHalfDims(basePoly, initWx, initLy, minWallMm) {
  let wx = initWx;
  let ly = initLy;
  for (let iter = 0; iter < 40; iter++) {
    const testPts = [
      [-wx, -ly], [wx, -ly], [wx, ly], [-wx, ly],
      [0, ly], [0, -ly], [wx, 0], [-wx, 0]
    ];
    let worst = Infinity;
    for (const [px, py] of testPts) {
      worst = Math.min(worst, minClearanceInsidePolygon(px, py, basePoly));
    }
    if (worst >= minWallMm) break;
    wx *= 0.94;
    ly *= 0.94;
  }
  return {
    Wx: +Math.max(14, wx).toFixed(3),
    Ly: +Math.max(14, ly).toFixed(3)
  };
}

class ManifoldTriAccumulator {
  constructor() {
    this.tris0 = [];
    this.tris1 = [];
  }

  pushTri(ax, ay, az, bx, by, bz, cx, cy, cz, matIdx = 0) {
    const target = matIdx === 1 ? this.tris1 : this.tris0;
    target.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  }

  pushQuad(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, matIdx = 0) {
    this.pushTri(ax, ay, az, bx, by, bz, cx, cy, cz, matIdx);
    this.pushTri(ax, ay, az, cx, cy, cz, dx, dy, dz, matIdx);
  }

  toBufferGeometry() {
    const len0 = this.tris0.length;
    const len1 = this.tris1.length;
    const positions = new Float32Array(len0 + len1);
    positions.set(this.tris0, 0);
    positions.set(this.tris1, len0);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.clearGroups();
    if (len0 > 0) geom.addGroup(0, len0 / 3, 0);
    if (len1 > 0) geom.addGroup(len0 / 3, len1 / 3, 1);
    geom.computeVertexNormals();
    geom.computeBoundingBox();
    return geom;
  }
}

function triangulateCapWithExactWinding(acc, outerPts, holePtsArray, zVal, wantPositiveZ, matIdx) {
  const outerClone = outerPts.map((p) => new THREE.Vector2(p.x, p.y));
  const holesClone = holePtsArray.map((h) => h.map((p) => new THREE.Vector2(p.x, p.y)));
  const tris = THREE.ShapeUtils.triangulateShape(outerClone, holesClone);
  const allPts = [...outerClone];
  for (const h of holesClone) {
    for (const p of h) allPts.push(p);
  }

  for (let i = 0; i < tris.length; i++) {
    const [ia, ib, ic] = tris[i];
    const pA = allPts[ia];
    const pB = allPts[ib];
    const pC = allPts[ic];
    const crossZ = (pB.x - pA.x) * (pC.y - pA.y) - (pB.y - pA.y) * (pC.x - pA.x);
    if (Math.abs(crossZ) < 1e-10) continue;
    if ((wantPositiveZ && crossZ > 0) || (!wantPositiveZ && crossZ < 0)) {
      acc.pushTri(pA.x, pA.y, zVal, pB.x, pB.y, zVal, pC.x, pC.y, zVal, matIdx);
    } else {
      acc.pushTri(pA.x, pA.y, zVal, pC.x, pC.y, zVal, pB.x, pB.y, zVal, matIdx);
    }
  }
}

/**
 * Computes generous, legible layout boxes (in mm) for QR, Header, Footer, and Icon.
 */
function computeDesignLayoutBoxes(params, Wx, Ly) {
  const qMargin = Math.max(1.4, Math.min(Wx, Ly) * 0.045);
  const cXMin = -Wx + qMargin;
  const cXMax = Wx - qMargin;
  const cYMin = -Ly + qMargin;
  const cYMax = Ly - qMargin;
  const availW = cXMax - cXMin;
  const availH = cYMax - cYMin;

  const hasHdr = (params.Ust_Baslik_Metni || '').trim().length > 0;
  const hasFtr = (params.Alt_Metin || '').trim().length > 0;
  const hasIcon = params.Sembol_Ikon && params.Sembol_Ikon !== 'Yok';
  const iconPlace = params.Ikon_Konumu || 'Baslik_Solu';
  const layout = params.Yerlesim_Duzeni || 'Ust_Baslik_Alt_QR';

  const qrScale = Math.max(0.50, Math.min(1.02, (Number(params.QR_Olcek_Yuzde) || 85) / 100));
  const txtScaleBand = Math.max(0.82, Math.min(1.26, (Number(params.Yazi_Boyut_Yuzde) || 100) / 100));
  const qrOffX = Number(params.QR_Kaydir_X_mm) || 0;
  const qrOffY = Number(params.QR_Kaydir_Y_mm) || 0;
  const txtOffX = Number(params.Yazi_Kaydir_X_mm) || 0;
  const txtOffY = Number(params.Yazi_Kaydir_Y_mm) || 0;

  let baseQrSize = Math.min(availW, availH) * 0.76;
  let qrCx = 0;
  let qrCy = 0;
  let hdrBox = null;
  let ftrBox = null;
  let iconBox = null;

  if (layout === 'Sol_QR_Sag_Metin' || layout === 'Sag_QR_Sol_Metin') {
    const isLeft = layout === 'Sol_QR_Sag_Metin';
    baseQrSize = Math.min(availH * 0.86, availW * 0.50);
    const qrSize = Math.max(19, Math.min(availW * 0.68, availH * 0.90, baseQrSize * qrScale));
    qrCx = isLeft ? (cXMin + qrSize * 0.54) : (cXMax - qrSize * 0.54);
    qrCy = 0;

    const sideXMin = isLeft ? (qrCx + qrSize * 0.5 + 2.8) : cXMin;
    const sideXMax = isLeft ? cXMax : (qrCx - qrSize * 0.5 - 2.8);
    if (sideXMax - sideXMin > 8) {
      if (hasIcon && iconPlace === 'Ust_Merkez') {
        const topY = Math.min(cYMax, availH * 0.44);
        const iconBotY = Math.max(8.5, topY - Math.min(11.5, availH * 0.24));
        iconBox = { xMin: sideXMin, xMax: sideXMax, yMin: iconBotY, yMax: topY };
        hdrBox = { xMin: sideXMin, xMax: sideXMax, yMin: -2.0, yMax: iconBotY - 1.6 };
        ftrBox = { xMin: sideXMin, xMax: sideXMax, yMin: Math.max(cYMin, -14.5), yMax: -3.6 };
      } else {
        hdrBox = { xMin: sideXMin, xMax: sideXMax, yMin: 0.4, yMax: Math.min(cYMax, 13.0) };
        ftrBox = { xMin: sideXMin, xMax: sideXMax, yMin: Math.max(cYMin, -13.0), yMax: -1.4 };
      }
    }
    baseQrSize = qrSize / qrScale;
  } else {
    // Generous vertical signage band heights scaled smoothly with Yazi_Boyut_Yuzde
    const hdrH = hasHdr || (hasIcon && iconPlace === 'Baslik_Solu')
      ? Math.min(16.0, Math.max(8.4, availH * 0.225 * txtScaleBand))
      : 0;
    const ftrH = (hasFtr || layout === 'Cift_Satir_Simetrik')
      ? Math.min(13.2, Math.max(7.4, availH * 0.18 * txtScaleBand))
      : 0;
    const topIconH = (hasIcon && iconPlace === 'Ust_Merkez')
      ? Math.min(11.0, availH * 0.17)
      : 0;
    const gaps = (hdrH > 0 ? 2.0 : 0) + (ftrH > 0 ? 2.0 : 0) + (topIconH > 0 ? 1.6 : 0);

    baseQrSize = Math.min(availW * 0.92, availH - hdrH - ftrH - topIconH - gaps);

    if (layout === 'Ust_QR_Alt_Baslik') {
      const qrS = Math.max(19, Math.min(availW * 0.92, availH * 0.88, baseQrSize * qrScale));
      qrCy = cYMax - topIconH - (topIconH > 0 ? 1.6 : 0) - qrS * 0.5 - 1.0;
      if (topIconH > 0) {
        iconBox = { xMin: cXMin, xMax: cXMax, yMin: cYMax - topIconH, yMax: cYMax };
      }
      const remBotTop = qrCy - qrS * 0.5 - 2.0;
      if (hasHdr) {
        hdrBox = { xMin: cXMin, xMax: cXMax, yMin: Math.max(cYMin + (hasFtr ? ftrH + 1.2 : 0), remBotTop - hdrH), yMax: remBotTop };
      }
      if (hasFtr) {
        ftrBox = { xMin: cXMin, xMax: cXMax, yMin: cYMin, yMax: cYMin + ftrH };
      }
    } else {
      let cursorTop = cYMax;
      if (topIconH > 0) {
        iconBox = { xMin: cXMin, xMax: cXMax, yMin: cursorTop - topIconH, yMax: cursorTop };
        cursorTop -= topIconH + 1.5;
      }
      if (hdrH > 0) {
        hdrBox = { xMin: cXMin, xMax: cXMax, yMin: cursorTop - hdrH, yMax: cursorTop };
        cursorTop -= hdrH + 2.0;
      }
      const cursorBot = ftrH > 0 ? (cYMin + ftrH + 2.0) : cYMin;
      qrCy = 0.5 * (cursorTop + cursorBot);
      if (ftrH > 0) {
        ftrBox = { xMin: cXMin, xMax: cXMax, yMin: cYMin, yMax: cYMin + ftrH };
      }
    }
  }

  const qrSizeMm = +Math.max(18.5, Math.min(availW * 0.90, availH * 0.90, baseQrSize * qrScale)).toFixed(3);
  const halfQr = qrSizeMm * 0.5;
  // Leave at least 1.5mm margin inside [cXMin, cXMax] x [cYMin, cYMax] so qrCollarCCW fits strictly inside Root
  const qrClampPad = 1.5;
  qrCx = Math.max(cXMin + halfQr + qrClampPad, Math.min(cXMax - halfQr - qrClampPad, qrCx + qrOffX));
  qrCy = Math.max(cYMin + halfQr + qrClampPad, Math.min(cYMax - halfQr - qrClampPad, qrCy + qrOffY));

  const shiftBox = (box) => {
    if (!box) return null;
    const bw = box.xMax - box.xMin;
    const bh = box.yMax - box.yMin;
    let x0 = Math.max(cXMin, Math.min(cXMax - bw, box.xMin + txtOffX));
    let y0 = Math.max(cYMin, Math.min(cYMax - bh, box.yMin + txtOffY));
    return { xMin: +x0.toFixed(3), xMax: +(x0 + bw).toFixed(3), yMin: +y0.toFixed(3), yMax: +(y0 + bh).toFixed(3) };
  };

  if (hasIcon && iconPlace === 'Alt_Kose' && !iconBox) {
    const s = Math.min(10.5, availW * 0.18);
    iconBox = { xMin: cXMax - s, xMax: cXMax, yMin: cYMin, yMax: cYMin + s };
  }

  return {
    cXMin: +cXMin.toFixed(3),
    cXMax: +cXMax.toFixed(3),
    cYMin: +cYMin.toFixed(3),
    cYMax: +cYMax.toFixed(3),
    qrSizeMm,
    xQrMin: +(qrCx - halfQr).toFixed(3),
    xQrMax: +(qrCx + halfQr).toFixed(3),
    yQrMin: +(qrCy - halfQr).toFixed(3),
    yQrMax: +(qrCy + halfQr).toFixed(3),
    hdrBox: shiftBox(hdrBox),
    ftrBox: shiftBox(ftrBox),
    iconBox: shiftBox(iconBox)
  };
}

/**
 * Builds the NFC-Embedded & Smooth-Vector 3D-Embossed QR Plaque Geometry (100% Watertight 2-Manifold).
 */
export function buildPlaqueManifoldGeometry(params, qrData, slicerPlan) {
  const baseDim = Math.max(60, Math.min(120, Number(params.Taban_En_Boy_mm) || 85));
  const aspectMode = params.En_Boy_Orani || '1:1';
  let W = baseDim;
  let L = baseDim;
  if (aspectMode === '3:4') {
    L = Math.min(136, +(baseDim * 1.24).toFixed(1));
  } else if (aspectMode === '4:3') {
    W = Math.min(136, +(baseDim * 1.24).toFixed(1));
  }

  const shapeType = params.Govde_Sekli || 'Yuvarlatilmis_Kare';
  const cornerR = Math.max(1.5, Math.min(26, Number(params.Kose_Radyus_mm) || 6.5));
  const borderStyle = params.Cerceve_Stili || 'Kabartma_Cerceve';
  const isRaisedBezel = borderStyle === 'Kabartma_Cerceve';

  const zBase = slicerPlan.actualBaseMm;
  const zTop = slicerPlan.totalHeightMm;
  const zBezel = isRaisedBezel ? zTop : zBase;
  const bezelMatIdx = isRaisedBezel ? 1 : 0;

  // 1. Base outer silhouette + optional Keychain Lug union
  const baseSilhouetteCCW = buildBaseShapeSilhouette(W, L, shapeType, cornerR);

  const isKeychainProduct = params.Urun_Tipi === 'Keychain';
  const lugMode = params.Halka_Konumu || (isKeychainProduct ? 'Ust_Orta' : 'Yok');
  const wantKeyhole = isKeychainProduct ? (lugMode !== 'Yok') : (lugMode !== 'Yok' && lugMode !== 'Otomatik');

  let outerLoopCCW = baseSilhouetteCCW;
  const keyholeLoopCCW = [];
  let keyholeCenter = null;
  const holeR = 2.6;

  if (wantKeyhole) {
    let rayAng = Math.PI * 0.5;
    if (lugMode === 'Sol_Ust') rayAng = Math.PI * 0.75;
    else if (lugMode === 'Sag_Ust') rayAng = Math.PI * 0.25;

    const rDirX = Math.cos(rayAng);
    const rDirY = Math.sin(rayAng);
    let bestProj = -Infinity;
    let anchorPt = new THREE.Vector2(0, L * 0.5);
    for (const p of baseSilhouetteCCW) {
      const proj = p.x * rDirX + p.y * rDirY;
      if (proj > bestProj) {
        bestProj = proj;
        anchorPt = p;
      }
    }
    keyholeCenter = new THREE.Vector2(
      +(anchorPt.x + rDirX * 3.0).toFixed(3),
      +(anchorPt.y + rDirY * 3.0).toFixed(3)
    );
    outerLoopCCW = unionPolygonWithCircularLug(baseSilhouetteCCW, keyholeCenter, 7.2);

    const holeSegs = 24;
    for (let s = 0; s < holeSegs; s++) {
      const ang = (s / holeSegs) * Math.PI * 2;
      keyholeLoopCCW.push(
        new THREE.Vector2(keyholeCenter.x + Math.cos(ang) * holeR, keyholeCenter.y + Math.sin(ang) * holeR)
      );
    }
  }

  // 2. Fit safe inscribed interior canvas Root = [-Wx, +Wx] x [-Ly, +Ly] (4 vertices!)
  const targetBezel = Math.max(2.6, Math.min(W, L) * 0.042);
  const { Wx, Ly } = fitInscribedCanvasHalfDims(
    baseSilhouetteCCW,
    W * 0.5 - targetBezel,
    L * 0.5 - targetBezel,
    2.2
  );

  // 3. Layout boxes + Exact QR Subgrid + Smooth Vector Typography/Icons Contour Tree
  const layoutBoxes = computeDesignLayoutBoxes(params, Wx, Ly);
  const { xQrMin, xQrMax, yQrMin, yQrMax, qrSizeMm } = layoutBoxes;

  // Build QR subgrid padded by a 0.35mm quiet border ring at z = zBase, surrounded by 0.40mm 4-vertex collar
  const qrBorderPad = 0.35;
  const qrCollarPad = 0.40;
  const qGridXMin = +(xQrMin - qrBorderPad).toFixed(4);
  const qGridXMax = +(xQrMax + qrBorderPad).toFixed(4);
  const qGridYMin = +(yQrMin - qrBorderPad).toFixed(4);
  const qGridYMax = +(yQrMax + qrBorderPad).toFixed(4);

  const qrSub = buildAntiPinchSubgrid(
    qrData.modules,
    qrData.size,
    qrData.size,
    xQrMin,
    xQrMax,
    yQrMin,
    yQrMax,
    0.030
  );

  const rawQrXs = [qGridXMin, ...qrSub.xs, qGridXMax];
  const rawQrYs = [qGridYMin, ...qrSub.ys, qGridYMax];
  const Mq0 = rawQrXs.length - 1;
  const Kq0 = rawQrYs.length - 1;
  const rawQrRaised = new Uint8Array(Kq0 * Mq0);
  for (let j = 0; j < qrSub.subRows; j++) {
    for (let i = 0; i < qrSub.subCols; i++) {
      rawQrRaised[(j + 1) * Mq0 + (i + 1)] = qrSub.raised[j * qrSub.subCols + i];
    }
  }
  const qrCompressed = compressRectilinearGrid(rawQrXs, rawQrYs, rawQrRaised);

  const qrCollarBL = new THREE.Vector2(+(qGridXMin - qrCollarPad).toFixed(4), +(qGridYMin - qrCollarPad).toFixed(4));
  const qrCollarBR = new THREE.Vector2(+(qGridXMax + qrCollarPad).toFixed(4), +(qGridYMin - qrCollarPad).toFixed(4));
  const qrCollarTR = new THREE.Vector2(+(qGridXMax + qrCollarPad).toFixed(4), +(qGridYMax + qrCollarPad).toFixed(4));
  const qrCollarTL = new THREE.Vector2(+(qGridXMin - qrCollarPad).toFixed(4), +(qGridYMax + qrCollarPad).toFixed(4));
  const qrCollarCCW = [qrCollarBL, qrCollarBR, qrCollarTR, qrCollarTL];

  // Extract Smooth Vector Contours for Typography, Icons & Optional Pinstripe Frame
  const qzProtect = Math.max(1.3, (qrSizeMm / qrData.size) * 1.4, qrBorderPad + qrCollarPad + 0.45);
  const hasAnyGraphics =
    ((params.Ust_Baslik_Metni || '').trim().length > 0) ||
    ((params.Alt_Metin || '').trim().length > 0) ||
    (params.Sembol_Ikon && params.Sembol_Ikon !== 'Yok') ||
    (borderStyle === 'Cift_Cizgi_Cerceve');

  const vectorContours = hasAnyGraphics
    ? extractVectorGraphicsContourTree({
        xGfxMin: -Wx,
        xGfxMax: Wx,
        yGfxMin: -Ly,
        yGfxMax: Ly,
        qrExcludeRect: {
          xMin: xQrMin - qzProtect,
          xMax: xQrMax + qzProtect,
          yMin: yQrMin - qzProtect,
          yMax: yQrMax + qzProtect
        },
        headerText: params.Ust_Baslik_Metni,
        footerText: params.Alt_Metin,
        fontKey: params.Yazi_Fontu || 'Modern_Sans',
        textAlign: params.Yazi_Hizalama || 'Orta',
        textScalePct: params.Yazi_Boyut_Yuzde || 100,
        iconType: params.Sembol_Ikon || 'Yok',
        iconPlacement: params.Ikon_Konumu || 'Baslik_Solu',
        borderStyle,
        layoutBlocks: layoutBoxes
      })
    : [];

  const acc = new ManifoldTriAccumulator();

  // 4. Emit QR Grid Quads + Vertical QR Walls + 4-Trapezoid Collar to qrCollarCCW (at z = zBase)
  const { xs: qXs, ys: qYs, M: qM, K: qK, cellRaised: qRaised } = qrCompressed;
  for (let j = 0; j < qK; j++) {
    const y0 = qYs[j];
    const y1 = qYs[j + 1];
    for (let i = 0; i < qM; i++) {
      const isUp = qRaised[j * qM + i] === 1;
      const z = isUp ? zTop : zBase;
      acc.pushQuad(qXs[i], y0, z, qXs[i + 1], y0, z, qXs[i + 1], y1, z, qXs[i], y1, z, isUp ? 1 : 0);
    }
  }
  for (let j = 0; j < qK; j++) {
    const y0 = qYs[j];
    const y1 = qYs[j + 1];
    for (let i = 1; i < qM; i++) {
      const rL = qRaised[j * qM + (i - 1)];
      const rR = qRaised[j * qM + i];
      if (rL !== rR) {
        const zL = rL ? zTop : zBase;
        const zR = rR ? zTop : zBase;
        const x = qXs[i];
        acc.pushQuad(x, y1, zL, x, y0, zL, x, y0, zR, x, y1, zR, 1);
      }
    }
  }
  for (let j = 1; j < qK; j++) {
    const y = qYs[j];
    for (let i = 0; i < qM; i++) {
      const rS = qRaised[(j - 1) * qM + i];
      const rN = qRaised[j * qM + i];
      if (rS !== rN) {
        const zS = rS ? zTop : zBase;
        const zN = rN ? zTop : zBase;
        acc.pushQuad(qXs[i], y, zS, qXs[i + 1], y, zS, qXs[i + 1], y, zN, qXs[i], y, zN, 1);
      }
    }
  }

  // 4-Trapezoid Collar connecting qrCollarCCW (at zBase) to QR grid perimeter (at zBase)
  for (let i = 0; i < qM; i++) {
    acc.pushTri(qrCollarBL.x, qrCollarBL.y, zBase, qXs[i + 1], qYs[0], zBase, qXs[i], qYs[0], zBase, 0);
  }
  acc.pushTri(qrCollarBL.x, qrCollarBL.y, zBase, qrCollarBR.x, qrCollarBR.y, zBase, qXs[qM], qYs[0], zBase, 0);

  for (let j = 0; j < qK; j++) {
    acc.pushTri(qrCollarBR.x, qrCollarBR.y, zBase, qXs[qM], qYs[j + 1], zBase, qXs[qM], qYs[j], zBase, 0);
  }
  acc.pushTri(qrCollarBR.x, qrCollarBR.y, zBase, qrCollarTR.x, qrCollarTR.y, zBase, qXs[qM], qYs[qK], zBase, 0);

  for (let i = qM; i > 0; i--) {
    acc.pushTri(qrCollarTR.x, qrCollarTR.y, zBase, qXs[i - 1], qYs[qK], zBase, qXs[i], qYs[qK], zBase, 0);
  }
  acc.pushTri(qrCollarTR.x, qrCollarTR.y, zBase, qrCollarTL.x, qrCollarTL.y, zBase, qXs[0], qYs[qK], zBase, 0);

  for (let j = qK; j > 0; j--) {
    acc.pushTri(qrCollarTL.x, qrCollarTL.y, zBase, qXs[0], qYs[j - 1], zBase, qXs[0], qYs[j], zBase, 0);
  }
  acc.pushTri(qrCollarTL.x, qrCollarTL.y, zBase, qrCollarBL.x, qrCollarBL.y, zBase, qXs[0], qYs[0], zBase, 0);

  // 5. Emit Smooth Vector Contours (Even-Odd Tree) + Floor Root [-Wx, +Wx] x [-Ly, +Ly]
  const rootRectCCW = [
    new THREE.Vector2(-Wx, -Ly),
    new THREE.Vector2(Wx, -Ly),
    new THREE.Vector2(Wx, Ly),
    new THREE.Vector2(-Wx, Ly)
  ];

  // Determine which floor region encloses qrCollarCCW (Root, or an odd-depth inner frame hole)
  let qrFloorOwner = null;
  for (const node of vectorContours) {
    if (node.depth % 2 === 1 && pointInPolygon2D(qrCollarBL.x, qrCollarBL.y, node.pts)) {
      qrFloorOwner = node; // smallest enclosing odd-depth hole because sorted descending by area
    }
  }

  const rootHoles = vectorContours.filter((n) => n.depth === 0).map((n) => n.pts);
  if (!qrFloorOwner) rootHoles.push(qrCollarCCW);
  triangulateCapWithExactWinding(acc, rootRectCCW, rootHoles, zBase, true, 0);

  for (const node of vectorContours) {
    const childHoles = node.children.map((ch) => ch.pts);
    if (node === qrFloorOwner) childHoles.push(qrCollarCCW);

    if (node.depth % 2 === 0) {
      // Raised smooth vector glyph / icon / frame stroke (z = zTop, matIdx = 1)
      triangulateCapWithExactWinding(acc, node.pts, childHoles, zTop, true, 1);
      const pts = node.pts;
      for (let k = 0; k < pts.length; k++) {
        const A = pts[k];
        const B = pts[(k + 1) % pts.length];
        acc.pushQuad(A.x, A.y, zBase, B.x, B.y, zBase, B.x, B.y, zTop, A.x, A.y, zTop, 1);
      }
    } else {
      // Counter-hole floor inside O, A, B, D, P, R, 0, 4, 6, 8, 9, &, #, Pinstripe (z = zBase, matIdx = 0)
      triangulateCapWithExactWinding(acc, node.pts, childHoles, zBase, true, 0);
      const pts = node.pts;
      for (let k = 0; k < pts.length; k++) {
        const A = pts[k];
        const B = pts[(k + 1) % pts.length];
        acc.pushQuad(A.x, A.y, zTop, B.x, B.y, zTop, B.x, B.y, zBase, A.x, A.y, zBase, 1);
      }
    }
  }

  // 6. Bezel Inner Step Wall (4 clean quads when zBezel > zBase) + Top Bezel Ring + Bottom Cap + Outer Walls
  if (isRaisedBezel) {
    for (let k = 0; k < 4; k++) {
      const A = rootRectCCW[k];
      const B = rootRectCCW[(k + 1) % 4];
      acc.pushQuad(A.x, A.y, zBezel, B.x, B.y, zBezel, B.x, B.y, zBase, A.x, A.y, zBase, 1);
    }
  }

  const topBezelHoles = [rootRectCCW];
  if (wantKeyhole) topBezelHoles.push(keyholeLoopCCW);
  triangulateCapWithExactWinding(acc, outerLoopCCW, topBezelHoles, zBezel, true, bezelMatIdx);

  const bottomHoles = wantKeyhole ? [keyholeLoopCCW] : [];
  triangulateCapWithExactWinding(acc, outerLoopCCW, bottomHoles, 0, false, 0);

  for (let k = 0; k < outerLoopCCW.length; k++) {
    const A = outerLoopCCW[k];
    const B = outerLoopCCW[(k + 1) % outerLoopCCW.length];
    acc.pushQuad(A.x, A.y, 0, B.x, B.y, 0, B.x, B.y, zBase, A.x, A.y, zBase, 0);
    if (isRaisedBezel) {
      acc.pushQuad(A.x, A.y, zBase, B.x, B.y, zBase, B.x, B.y, zBezel, A.x, A.y, zBezel, 1);
    }
  }

  if (wantKeyhole) {
    for (let k = 0; k < keyholeLoopCCW.length; k++) {
      const A = keyholeLoopCCW[k];
      const B = keyholeLoopCCW[(k + 1) % keyholeLoopCCW.length];
      acc.pushQuad(B.x, B.y, 0, A.x, A.y, 0, A.x, A.y, zBase, B.x, B.y, zBase, 0);
      if (isRaisedBezel) {
        acc.pushQuad(B.x, B.y, zBase, A.x, A.y, zBase, A.x, A.y, zBezel, B.x, B.y, zBezel, 1);
      }
    }
  }

  // 7. Internal Sealed Cylindrical NFC Pocket
  let nfcCx = +(0.5 * (xQrMin + xQrMax)).toFixed(3);
  let nfcCy = +(0.5 * (yQrMin + yQrMax)).toFixed(3);
  const clearAtQr = minClearanceInsidePolygon(nfcCx, nfcCy, baseSilhouetteCCW);
  const reqNfcDia = Math.max(15.0, Number(params.NFC_Yuva_Capi_mm) || 26.0);

  if (clearAtQr < reqNfcDia * 0.5 + 2.8) {
    nfcCx *= 0.35;
    nfcCy *= 0.35;
  }
  const safeClearance = Math.max(10.0, minClearanceInsidePolygon(nfcCx, nfcCy, baseSilhouetteCCW) - 2.6);
  const nfcDia = +Math.max(14.0, Math.min(reqNfcDia, safeClearance * 2.0)).toFixed(2);
  const nfcR = nfcDia * 0.5;

  const zNfcBot = slicerPlan.zNfcBottom;
  const zNfcTop = slicerPlan.zNfcTop;
  const nfcSegs = 64;
  const nfcPts = [];
  for (let s = 0; s < nfcSegs; s++) {
    const ang = (s / nfcSegs) * Math.PI * 2;
    nfcPts.push({ x: nfcCx + Math.cos(ang) * nfcR, y: nfcCy + Math.sin(ang) * nfcR });
  }
  for (let s = 0; s < nfcSegs; s++) {
    const A = nfcPts[s];
    const B = nfcPts[(s + 1) % nfcSegs];
    acc.pushTri(nfcCx, nfcCy, zNfcTop, B.x, B.y, zNfcTop, A.x, A.y, zNfcTop, 0);
    acc.pushTri(nfcCx, nfcCy, zNfcBot, A.x, A.y, zNfcBot, B.x, B.y, zNfcBot, 0);
    acc.pushQuad(B.x, B.y, zNfcBot, A.x, A.y, zNfcBot, A.x, A.y, zNfcTop, B.x, B.y, zNfcTop, 0);
  }

  const geometry = acc.toBufferGeometry();
  const bbox = geometry.boundingBox;

  const footSpreadX = shapeType === 'Daire_Madalyon' || shapeType === 'Kalkan_Rozet'
    ? W * 0.20
    : W * 0.28;
  let bottomYAtFoot = -L * 0.5;
  for (let i = 0; i < outerLoopCCW.length; i++) {
    const a = outerLoopCCW[i];
    const b = outerLoopCCW[(i + 1) % outerLoopCCW.length];
    if ((a.x <= footSpreadX && b.x >= footSpreadX) || (b.x <= footSpreadX && a.x >= footSpreadX)) {
      const dx = b.x - a.x;
      const t = Math.abs(dx) > 1e-6 ? (footSpreadX - a.x) / dx : 0.5;
      const yCross = a.y + t * (b.y - a.y);
      if (yCross < 0) bottomYAtFoot = yCross;
    }
  }

  return {
    geometry,
    meta: {
      plaqueWidthMm: +(bbox.max.x - bbox.min.x).toFixed(2),
      plaqueLengthMm: +(bbox.max.y - bbox.min.y).toFixed(2),
      nominalW: W,
      nominalL: L,
      shapeType,
      borderStyle,
      lugMode: wantKeyhole ? lugMode : 'Yok',
      keyholeCenter,
      outerLoopCCW,
      bboxMinX: +bbox.min.x.toFixed(2),
      bboxMaxX: +bbox.max.x.toFixed(2),
      bboxMinY: +bbox.min.y.toFixed(2),
      bboxMaxY: +bbox.max.y.toFixed(2),
      footSpreadX: +footSpreadX.toFixed(2),
      bottomYAtFoot: +bottomYAtFoot.toFixed(2),
      qrSizeMm,
      modulePitchMm: +(qrSizeMm / qrData.size).toFixed(3),
      nfcDiaMm: nfcDia,
      nfcCenterX: nfcCx,
      nfcCenterY: nfcCy,
      zNfcBot,
      zNfcTop,
      Wx,
      Ly,
      cornerR,
      xQrMin,
      xQrMax,
      yQrMin,
      yQrMax,
      hdrBox: layoutBoxes.hdrBox,
      ftrBox: layoutBoxes.ftrBox,
      iconBox: layoutBoxes.iconBox
    }
  };
}

export function buildStandFootManifoldGeometry(params, slicerPlan) {
  const W = Math.max(60, Math.min(120, Number(params.Taban_En_Boy_mm) || 85));
  const zFootThickness = slicerPlan.actualBaseMm;
  const isRaisedBezel = (params.Cerceve_Stili || 'Kabartma_Cerceve') === 'Kabartma_Cerceve';
  const plaqueOuterRimT = isRaisedBezel ? slicerPlan.totalHeightMm : slicerPlan.actualBaseMm;
  const slotWidth = plaqueOuterRimT + 0.18;
  const tiltRad = (68 * Math.PI) / 180;
  const dirX = Math.cos(tiltRad);
  const dirY = Math.sin(tiltRad);
  const nX = -dirY;
  const nY = dirX;

  const frontNoseLen = 11.5;
  const rearTailLen = Math.max(30.0, +(W * 0.42).toFixed(1));
  const spineH = Math.max(22.0, +(W * 0.28).toFixed(1));
  const slotDepth = 13.5;

  const sBotX = -3.0;
  const sBotY = 3.4;
  const sBotBackX = sBotX - nX * slotWidth;
  const sBotBackY = sBotY - nY * slotWidth;

  const frontMouthX = sBotX + dirX * slotDepth;
  const frontMouthY = sBotY + dirY * slotDepth;
  const backMouthX = sBotBackX + dirX * (slotDepth + 5.5);
  const backMouthY = sBotBackY + dirY * (slotDepth + 5.5);

  const rawPts = [
    new THREE.Vector2(-frontNoseLen, 0),
    new THREE.Vector2(rearTailLen, 0),
    new THREE.Vector2(rearTailLen, 3.6),
    new THREE.Vector2(Math.max(backMouthX + 5.0, rearTailLen * 0.45), spineH),
    new THREE.Vector2(backMouthX, Math.max(backMouthY, spineH * 0.92)),
    new THREE.Vector2(sBotBackX, Math.max(2.6, sBotBackY)),
    new THREE.Vector2(sBotX, sBotY),
    new THREE.Vector2(frontMouthX, frontMouthY),
    new THREE.Vector2(frontMouthX - 3.2, frontMouthY),
    new THREE.Vector2(-frontNoseLen, 4.2)
  ];

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of rawPts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const cx = 0.5 * (minX + maxX);
  const cy = 0.5 * (minY + maxY);
  const pts = rawPts.map((p) => new THREE.Vector2(+(p.x - cx).toFixed(4), +(p.y - cy).toFixed(4)));

  const acc = new ManifoldTriAccumulator();
  triangulateCapWithExactWinding(acc, pts, [], zFootThickness, true, 0);
  triangulateCapWithExactWinding(acc, pts, [], 0, false, 0);
  for (let k = 0; k < pts.length; k++) {
    const A = pts[k];
    const B = pts[(k + 1) % pts.length];
    acc.pushQuad(A.x, A.y, 0, B.x, B.y, 0, B.x, B.y, zFootThickness, A.x, A.y, zFootThickness, 0);
  }

  const geometry = acc.toBufferGeometry();
  return {
    geometry,
    footMeta: {
      widthX: +(maxX - minX).toFixed(2),
      heightY: +(maxY - minY).toFixed(2),
      thicknessZ: zFootThickness,
      plaqueOuterRimT,
      slotAnchorLocalX: +(sBotX - cx).toFixed(3),
      slotAnchorLocalY: +(sBotY - cy).toFixed(3),
      baseYOffset: +(-cy).toFixed(3),
      tiltDeg: 68
    }
  };
}

export function computeMeshMetrology(geometry) {
  const pos = geometry.attributes.position;
  let totalVolumeMm3 = 0;
  let totalAreaMm2 = 0;
  let embossVolumeApproxMm3 = 0;

  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const cross = new THREE.Vector3();

  const groups = geometry.groups && geometry.groups.length > 0
    ? geometry.groups
    : [{ start: 0, count: pos.count, materialIndex: 0 }];

  for (const g of groups) {
    let groupVol = 0;
    const end = g.start + g.count;
    for (let i = g.start; i < end; i += 3) {
      p1.fromBufferAttribute(pos, i);
      p2.fromBufferAttribute(pos, i + 1);
      p3.fromBufferAttribute(pos, i + 2);
      const signedTet = p1.dot(cross.crossVectors(p2, p3)) / 6.0;
      totalVolumeMm3 += signedTet;
      groupVol += signedTet;

      ab.subVectors(p2, p1);
      ac.subVectors(p3, p1);
      totalAreaMm2 += cross.crossVectors(ab, ac).length() * 0.5;
    }
    if (g.materialIndex === 1) {
      embossVolumeApproxMm3 += Math.max(0, groupVol);
    }
  }

  const volMm3 = Math.abs(totalVolumeMm3);
  return {
    volumeMm3: volMm3,
    volCm3: volMm3 / 1000.0,
    areaMm2: totalAreaMm2,
    areaCm2: totalAreaMm2 / 100.0,
    triangleCount: pos.count / 3,
    embossRatio: volMm3 > 0 ? Math.min(0.35, Math.max(0.04, embossVolumeApproxMm3 / volMm3)) : 0.12
  };
}

export function verifyWatertightManifold(geometry) {
  const pos = geometry.attributes.position;
  const vertMap = new Map();
  const vertIds = new Int32Array(pos.count);
  let nextId = 0;

  for (let i = 0; i < pos.count; i++) {
    const key = `${Math.round(pos.getX(i) * 10000)},${Math.round(pos.getY(i) * 10000)},${Math.round(pos.getZ(i) * 10000)}`;
    let id = vertMap.get(key);
    if (id === undefined) {
      id = nextId++;
      vertMap.set(key, id);
    }
    vertIds[i] = id;
  }

  const edgeMap = new Map();
  let degenerateTris = 0;

  for (let i = 0; i < pos.count; i += 3) {
    const a = vertIds[i];
    const b = vertIds[i + 1];
    const c = vertIds[i + 2];
    if (a === b || b === c || c === a) {
      degenerateTris++;
      continue;
    }
    const pairs = [[a, b], [b, c], [c, a]];
    for (let e = 0; e < 3; e++) {
      const u = pairs[e][0];
      const v = pairs[e][1];
      const minV = u < v ? u : v;
      const maxV = u < v ? v : u;
      const key = `${minV}_${maxV}`;
      let entry = edgeMap.get(key);
      if (!entry) {
        entry = [0, 0];
        edgeMap.set(key, entry);
      }
      if (u < v) entry[0]++;
      else entry[1]++;
    }
  }

  let boundaryEdges = 0;
  let nonManifoldEdges = 0;
  for (const [fwd, rev] of edgeMap.values()) {
    const sum = fwd + rev;
    if (sum === 1) boundaryEdges++;
    else if (sum !== 2 || fwd !== 1 || rev !== 1) nonManifoldEdges++;
  }

  return {
    isWatertight: boundaryEdges === 0 && nonManifoldEdges === 0 && degenerateTris === 0,
    uniqueVertices: nextId,
    totalEdges: edgeMap.size,
    boundaryEdges,
    nonManifoldEdges,
    degenerateTris
  };
}

export function buildBinaryStlBuffer(positionedParts) {
  let totalTriangles = 0;
  for (const item of positionedParts) {
    totalTriangles += item.geometry.attributes.position.count / 3;
  }

  const buffer = new ArrayBuffer(84 + totalTriangles * 50);
  const view = new DataView(buffer);

  const headerStr = 'NFC-QR B2B CAD STUDIO - WATERTIGHT METRIC MM STL';
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < headerStr.length ? headerStr.charCodeAt(i) : 32);
  }
  view.setUint32(80, totalTriangles, true);

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();
  let offset = 84;

  for (const item of positionedParts) {
    const pos = item.geometry.attributes.position;
    const mat4 = item.matrix || null;

    for (let i = 0; i < pos.count; i += 3) {
      vA.fromBufferAttribute(pos, i);
      vB.fromBufferAttribute(pos, i + 1);
      vC.fromBufferAttribute(pos, i + 2);
      if (mat4) {
        vA.applyMatrix4(mat4);
        vB.applyMatrix4(mat4);
        vC.applyMatrix4(mat4);
      }

      cb.subVectors(vC, vB);
      ab.subVectors(vA, vB);
      cb.cross(ab).normalize();

      view.setFloat32(offset, cb.x, true); offset += 4;
      view.setFloat32(offset, cb.y, true); offset += 4;
      view.setFloat32(offset, cb.z, true); offset += 4;

      view.setFloat32(offset, vA.x, true); offset += 4;
      view.setFloat32(offset, vA.y, true); offset += 4;
      view.setFloat32(offset, vA.z, true); offset += 4;

      view.setFloat32(offset, vB.x, true); offset += 4;
      view.setFloat32(offset, vB.y, true); offset += 4;
      view.setFloat32(offset, vB.z, true); offset += 4;

      view.setFloat32(offset, vC.x, true); offset += 4;
      view.setFloat32(offset, vC.y, true); offset += 4;
      view.setFloat32(offset, vC.z, true); offset += 4;

      view.setUint16(offset, 0, true); offset += 2;
    }
  }

  return buffer;
}
