import { MATERIALS_DB } from './cad-geometry.js';

/**
 * 220x220mm Build Plate Multi-Part Auto-Nesting, B2B Batch Costing,
 * ISO "Imalat_Anteti" (.SVG) Operator Sheet, CSV Quotation, DXF & OpenSCAD Exporters.
 * Dynamically adapts to all custom shapes, aspect ratios, corner lugs, and free QR/Text positions!
 */

function packFreeRectangles(freeRects, itemW, itemH, countNeeded, gap) {
  const placements = [];
  const rects = freeRects.map((r) => ({ ...r }));

  for (let n = 0; n < countNeeded; n++) {
    let bestIdx = -1;
    let bestRot = false;
    let bestScore = Infinity;

    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (itemW <= r.w + 1e-6 && itemH <= r.h + 1e-6) {
        const score = Math.min(r.w - itemW, r.h - itemH);
        if (score < bestScore) {
          bestScore = score;
          bestIdx = i;
          bestRot = false;
        }
      }
      if (itemH <= r.w + 1e-6 && itemW <= r.h + 1e-6) {
        const score = Math.min(r.w - itemH, r.h - itemW);
        if (score < bestScore) {
          bestScore = score;
          bestIdx = i;
          bestRot = true;
        }
      }
    }

    if (bestIdx === -1) return null;

    const chosen = rects[bestIdx];
    const pw = bestRot ? itemH : itemW;
    const ph = bestRot ? itemW : itemH;

    placements.push({
      cx: +(chosen.x + pw * 0.5).toFixed(2),
      cy: +(chosen.y + ph * 0.5).toFixed(2),
      w: pw,
      h: ph,
      rotZDeg: bestRot ? 90 : 0
    });

    rects.splice(bestIdx, 1);
    const remRightW = chosen.w - pw - gap;
    const remTopH = chosen.h - ph - gap;

    if (remRightW >= remTopH) {
      if (remRightW > 4) {
        rects.push({ x: chosen.x + pw + gap, y: chosen.y, w: remRightW, h: chosen.h });
      }
      if (remTopH > 4) {
        rects.push({ x: chosen.x, y: chosen.y + ph + gap, w: pw, h: remTopH });
      }
    } else {
      if (remTopH > 4) {
        rects.push({ x: chosen.x, y: chosen.y + ph + gap, w: chosen.w, h: remTopH });
      }
      if (remRightW > 4) {
        rects.push({ x: chosen.x + pw + gap, y: chosen.y, w: remRightW, h: ph });
      }
    }
  }

  return placements;
}

export function computePlateNesting(params, plaqueMeta, footMeta) {
  const bedSize = Math.max(150, Math.min(400, Number(params.Tabla_Boyutu_mm) || 220));
  const orderQty = Math.max(1, Math.min(100000, Math.round(Number(params.Siparis_Adedi) || 50)));
  const isStand = params.Urun_Tipi === 'Angled_Stand';

  const edgeMargin = 4.0;
  const partGap = 3.0;
  const usable = bedSize - 2 * edgeMargin;

  const pW = plaqueMeta.plaqueWidthMm;
  const pH = plaqueMeta.plaqueLengthMm;
  const bboxShiftX = 0.5 * ((plaqueMeta.bboxMinX ?? -pW * 0.5) + (plaqueMeta.bboxMaxX ?? pW * 0.5));
  const bboxShiftY = 0.5 * (plaqueMeta.bboxMinY + plaqueMeta.bboxMaxY);

  let bestLayout = null;

  for (const rotPlaque of [false, true]) {
    const uw = rotPlaque ? pH : pW;
    const uh = rotPlaque ? pW : pH;
    const maxCols = Math.floor((usable + partGap) / (uw + partGap));
    const maxRows = Math.floor((usable + partGap) / (uh + partGap));

    for (let cols = maxCols; cols >= 1; cols--) {
      for (let rows = maxRows; rows >= 1; rows--) {
        const count = cols * rows;
        if (bestLayout && count <= bestLayout.maxPerPlate) continue;

        const gridW = cols * uw + (cols - 1) * partGap;
        const gridH = rows * uh + (rows - 1) * partGap;
        const startX = -usable * 0.5;
        const startY = -usable * 0.5;

        let feetPlacements = [];
        if (isStand && footMeta) {
          const freeRects = [];
          const rightW = usable - gridW - partGap;
          const topH = usable - gridH - partGap;
          if (rightW > 4) {
            freeRects.push({ x: startX + gridW + partGap, y: startY, w: rightW, h: usable });
          }
          if (topH > 4) {
            freeRects.push({ x: startX, y: startY + gridH + partGap, w: gridW, h: topH });
          }
          const packedFeet = packFreeRectangles(freeRects, footMeta.widthX, footMeta.heightY, count * 2, partGap);
          if (!packedFeet) continue;
          feetPlacements = packedFeet;
        }

        const plaques = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const boxCx = startX + c * (uw + partGap) + uw * 0.5;
            const boxCy = startY + r * (uh + partGap) + uh * 0.5;
            plaques.push({
              boxCx,
              boxCy,
              w: uw,
              h: uh,
              rotZDeg: rotPlaque ? 90 : 0
            });
          }
        }

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of plaques) {
          minX = Math.min(minX, p.boxCx - p.w * 0.5);
          maxX = Math.max(maxX, p.boxCx + p.w * 0.5);
          minY = Math.min(minY, p.boxCy - p.h * 0.5);
          maxY = Math.max(maxY, p.boxCy + p.h * 0.5);
        }
        for (const f of feetPlacements) {
          minX = Math.min(minX, f.cx - f.w * 0.5);
          maxX = Math.max(maxX, f.cx + f.w * 0.5);
          minY = Math.min(minY, f.cy - f.h * 0.5);
          maxY = Math.max(maxY, f.cy + f.h * 0.5);
        }

        const shiftX = -0.5 * (minX + maxX);
        const shiftY = -0.5 * (minY + maxY);

        const centeredPlaques = plaques.map((p, idx) => {
          const cx = +(p.boxCx + shiftX).toFixed(2);
          const cy = +(p.boxCy + shiftY).toFixed(2);
          // After rotZ(90°), local (bx, by) becomes (-by, bx)
          const originX = p.rotZDeg === 90 ? +(cx + bboxShiftY).toFixed(2) : +(cx - bboxShiftX).toFixed(2);
          const originY = p.rotZDeg === 90 ? +(cy - bboxShiftX).toFixed(2) : +(cy - bboxShiftY).toFixed(2);
          const nfcWorldX = p.rotZDeg === 90
            ? +(originX - plaqueMeta.nfcCenterY).toFixed(2)
            : +(originX + plaqueMeta.nfcCenterX).toFixed(2);
          const nfcWorldY = p.rotZDeg === 90
            ? +(originY + plaqueMeta.nfcCenterX).toFixed(2)
            : +(originY + plaqueMeta.nfcCenterY).toFixed(2);

          return {
            index: idx + 1,
            cx,
            cy,
            originX,
            originY,
            w: p.w,
            h: p.h,
            rotZDeg: p.rotZDeg,
            nfcWorldX,
            nfcWorldY
          };
        });

        const centeredFeet = feetPlacements.map((f, idx) => ({
          index: idx + 1,
          cx: +(f.cx + shiftX).toFixed(2),
          cy: +(f.cy + shiftY).toFixed(2),
          w: f.w,
          h: f.h,
          rotZDeg: f.rotZDeg
        }));

        bestLayout = {
          maxPerPlate: count,
          cols,
          rows,
          plaques: centeredPlaques,
          feet: centeredFeet,
          envelopeW: +(maxX - minX).toFixed(1),
          envelopeH: +(maxY - minY).toFixed(1)
        };
      }
    }
  }

  if (!bestLayout) {
    bestLayout = {
      maxPerPlate: 1,
      cols: 1,
      rows: 1,
      plaques: [{
        index: 1,
        cx: 0,
        cy: 0,
        originX: +(-bboxShiftX).toFixed(2),
        originY: +(-bboxShiftY).toFixed(2),
        w: pW,
        h: pH,
        rotZDeg: 0,
        nfcWorldX: +(plaqueMeta.nfcCenterX - bboxShiftX).toFixed(2),
        nfcWorldY: +(plaqueMeta.nfcCenterY - bboxShiftY).toFixed(2)
      }],
      feet: isStand && footMeta
        ? [
            { index: 1, cx: -footMeta.widthX * 0.55, cy: pH * 0.58, w: footMeta.widthX, h: footMeta.heightY, rotZDeg: 0 },
            { index: 2, cx: footMeta.widthX * 0.55, cy: pH * 0.58, w: footMeta.widthX, h: footMeta.heightY, rotZDeg: 0 }
          ]
        : [],
      envelopeW: pW,
      envelopeH: pH
    };
  }

  const maxPerPlate = bestLayout.maxPerPlate;
  const totalPlates = Math.ceil(orderQty / maxPerPlate);
  const fullPlates = Math.floor(orderQty / maxPerPlate);
  const lastPlateCount = orderQty % maxPerPlate === 0 ? maxPerPlate : orderQty % maxPerPlate;
  const activeFirstPlateCount = Math.min(orderQty, maxPerPlate);

  const usedAreaMm2 = bestLayout.plaques.length * (pW * pH) +
    bestLayout.feet.reduce((s, f) => s + f.w * f.h, 0);
  const bedUtilizationPct = +((usedAreaMm2 / (bedSize * bedSize)) * 100).toFixed(1);

  return {
    bedSizeMm: bedSize,
    edgeMarginMm: edgeMargin,
    partGapMm: partGap,
    orderQty,
    maxPerPlate,
    totalPlates,
    fullPlates,
    lastPlateCount,
    activeFirstPlateCount,
    bedUtilizationPct,
    ...bestLayout
  };
}

export function computeB2BPricing(params, plaqueMetrology, footMetrology, slicerPlan, nesting) {
  const matKey = MATERIALS_DB[params.Malzeme_Tipi] ? params.Malzeme_Tipi : 'PLA';
  const mat = MATERIALS_DB[matKey];
  const isStand = params.Urun_Tipi === 'Angled_Stand';

  const infillFactor = 0.84;
  const plaqueVolCm3 = plaqueMetrology.volCm3;
  const feetVolCm3 = isStand && footMetrology ? footMetrology.volCm3 * 2 : 0;
  const unitTotalVolCm3 = plaqueVolCm3 + feetVolCm3;

  const unitMassG = +(unitTotalVolCm3 * mat.density * infillFactor).toFixed(2);
  const embossMassG = +(plaqueVolCm3 * plaqueMetrology.embossRatio * mat.density).toFixed(2);
  const baseMassG = +(Math.max(0.5, unitMassG - embossMassG)).toFixed(2);

  const printSecondsPerUnit = (unitTotalVolCm3 * 1000 * infillFactor) / 9.5;
  const plateSetupAndPausesMin = 6.5;
  const fullPlatePrintMin = Math.round((printSecondsPerUnit * nesting.maxPerPlate) / 60 + plateSetupAndPausesMin);

  const calcForQty = (qty) => {
    const plates = Math.ceil(qty / nesting.maxPerPlate);
    const totalPrintHours = +(((printSecondsPerUnit * qty) / 3600) + (plates * plateSetupAndPausesMin) / 60).toFixed(2);

    const filamentWasteFactor = 1.06;
    const unitFilamentCostTry = (unitMassG * filamentWasteFactor / 1000) * mat.pricePerKgTry;
    const nfcTagUnitCostTry = qty >= 500 ? 11.50 : qty >= 100 ? 13.80 : 16.50;
    const machineHourlyTry = 85.0;
    const operatorPerPlateTry = 55.0;

    const batchMachineCostTry = totalPrintHours * machineHourlyTry;
    const batchOperatorCostTry = plates * operatorPerPlateTry;
    const unitMfgOverheadTry = (batchMachineCostTry + batchOperatorCostTry) / qty;
    const unitRawCostTry = unitFilamentCostTry + nfcTagUnitCostTry + unitMfgOverheadTry;

    let marginMultiplier = 1.85;
    let discountLabel = 'Standart B2B';
    if (qty >= 1000) { marginMultiplier = 1.38; discountLabel = 'Kurumsal Kontrat (-%25)'; }
    else if (qty >= 500) { marginMultiplier = 1.46; discountLabel = 'Toptan Kademe 3 (-%21)'; }
    else if (qty >= 250) { marginMultiplier = 1.55; discountLabel = 'Toptan Kademe 2 (-%16)'; }
    else if (qty >= 100) { marginMultiplier = 1.66; discountLabel = 'Toptan Kademe 1 (-%10)'; }
    else if (qty >= 50) { marginMultiplier = 1.75; discountLabel = 'Başlangıç B2B (-%5)'; }

    const unitSaleNetTry = +(unitRawCostTry * marginMultiplier).toFixed(2);
    const totalNetTry = +(unitSaleNetTry * qty).toFixed(2);
    const vatTry = +(totalNetTry * 0.20).toFixed(2);
    const grandTotalTry = +(totalNetTry + vatTry).toFixed(2);

    return {
      qty,
      plates,
      totalPrintHours,
      totalFilamentKg: +((unitMassG * filamentWasteFactor * qty) / 1000).toFixed(3),
      unitFilamentCostTry: +unitFilamentCostTry.toFixed(2),
      nfcTagUnitCostTry: +nfcTagUnitCostTry.toFixed(2),
      unitMfgOverheadTry: +unitMfgOverheadTry.toFixed(2),
      unitRawCostTry: +unitRawCostTry.toFixed(2),
      discountLabel,
      unitSaleNetTry,
      totalNetTry,
      vatTry,
      grandTotalTry
    };
  };

  const activeQuote = calcForQty(nesting.orderQty);
  const tierQuantities = [25, 50, 100, 250, 500, 1000];
  const tiers = tierQuantities.map((q) => calcForQty(q));

  return {
    materialKey: matKey,
    materialLabel: mat.label,
    density: mat.density,
    unitVolCm3: +unitTotalVolCm3.toFixed(2),
    unitMassG,
    baseMassG,
    embossMassG,
    fullPlatePrintMin,
    activeQuote,
    tiers
  };
}

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SHAPE_TR_NAMES = {
  Yuvarlatilmis_Kare: 'Yuvarlatılmış Kare',
  Daire_Madalyon: 'Daire / Madalyon',
  Kemer_Stand: 'Kemer Üstlü Stand',
  Sekizgen_Plaka: 'Mimari Sekizgen',
  Altigen_Rozet: 'Altıgen Rozet',
  Kalkan_Rozet: 'Kurumsal Arma'
};

export function generateImalatAntetiSvg(params, qrData, plaqueMeta, slicerPlan, nesting, pricing) {
  const W = plaqueMeta.plaqueWidthMm;
  const L = plaqueMeta.plaqueLengthMm;
  const isStand = params.Urun_Tipi === 'Angled_Stand';
  const shapeLabel = SHAPE_TR_NAMES[plaqueMeta.shapeType] || plaqueMeta.shapeType;
  const productLabel = `${isStand ? '68° Stand' : 'Anahtarlık'} · ${shapeLabel}`;
  const nowStr = new Date().toISOString().slice(0, 10);

  // 1. Top Orthographic View SVG elements (exact custom outerLoopCCW polygon + keyhole + QR + texts!)
  const topScale = Math.min(205 / W, 205 / L);
  const topCx = 230;
  const topCy = 262;
  const mmToSvgX = (x) => +(topCx + x * topScale).toFixed(2);
  const mmToSvgY = (y) => +(topCy - y * topScale).toFixed(2);

  const polyPointsAttr = plaqueMeta.outerLoopCCW
    .map((p) => `${mmToSvgX(p.x)},${mmToSvgY(p.y)}`)
    .join(' ');

  const keyholeSvg = plaqueMeta.keyholeCenter
    ? `<circle cx="${mmToSvgX(plaqueMeta.keyholeCenter.x)}" cy="${mmToSvgY(plaqueMeta.keyholeCenter.y)}" r="${(2.6 * topScale).toFixed(2)}" fill="#FFFFFF" stroke="#111214" stroke-width="1.5"/>`
    : '';

  let qrRectsSvg = '';
  const qrDrawSize = plaqueMeta.qrSizeMm * topScale;
  const modPx = qrDrawSize / qrData.size;
  const qrLeft = mmToSvgX(plaqueMeta.xQrMin);
  const qrTop = mmToSvgY(plaqueMeta.yQrMax);

  for (let r = 0; r < qrData.size; r++) {
    for (let c = 0; c < qrData.size; c++) {
      if (qrData.get(r, c)) {
        const x = (qrLeft + c * modPx).toFixed(2);
        const y = (qrTop + r * modPx).toFixed(2);
        qrRectsSvg += `<rect x="${x}" y="${y}" width="${(modPx + 0.15).toFixed(2)}" height="${(modPx + 0.15).toFixed(2)}" fill="#111214"/>`;
      }
    }
  }

  let textsSvg = '';
  if ((params.Ust_Baslik_Metni || '').trim() && plaqueMeta.hdrBox) {
    const bx = 0.5 * (plaqueMeta.hdrBox.xMin + plaqueMeta.hdrBox.xMax);
    const by = 0.5 * (plaqueMeta.hdrBox.yMin + plaqueMeta.hdrBox.yMax);
    const fs = Math.max(9.5, Math.min(15.5, (plaqueMeta.hdrBox.yMax - plaqueMeta.hdrBox.yMin) * topScale * 0.68));
    textsSvg += `<text x="${mmToSvgX(bx)}" y="${(mmToSvgY(by) + fs * 0.34).toFixed(1)}" text-anchor="middle" font-family="Segoe UI, Bahnschrift, Arial, sans-serif" font-weight="700" letter-spacing="0.06em" font-size="${fs.toFixed(1)}" fill="#111214">${escapeXml(params.Ust_Baslik_Metni.trim())}</text>`;
  }
  if ((params.Alt_Metin || '').trim() && plaqueMeta.ftrBox) {
    const fbx = 0.5 * (plaqueMeta.ftrBox.xMin + plaqueMeta.ftrBox.xMax);
    const by = 0.5 * (plaqueMeta.ftrBox.yMin + plaqueMeta.ftrBox.yMax);
    const fs = Math.max(9.0, Math.min(13.5, (plaqueMeta.ftrBox.yMax - plaqueMeta.ftrBox.yMin) * topScale * 0.65));
    textsSvg += `<text x="${mmToSvgX(fbx)}" y="${(mmToSvgY(by) + fs * 0.34).toFixed(1)}" text-anchor="middle" font-family="Segoe UI, Bahnschrift, Arial, sans-serif" font-weight="700" letter-spacing="0.06em" font-size="${fs.toFixed(1)}" fill="#111214">${escapeXml(params.Alt_Metin.trim())}</text>`;
  }

  const nfcDrawCx = mmToSvgX(plaqueMeta.nfcCenterX);
  const nfcDrawCy = mmToSvgY(plaqueMeta.nfcCenterY);
  const nfcDrawR = (plaqueMeta.nfcDiaMm * 0.5 * topScale).toFixed(2);

  // 2. Z-Layer Cross-Section Diagram
  const secX = 535;
  const secW = 240;
  const secBotY = 380;
  const zScale = 48;
  const yZ0 = secBotY;
  const yZNfcBot = +(secBotY - slicerPlan.zNfcBottom * zScale).toFixed(1);
  const yZNfcTop = +(secBotY - slicerPlan.zNfcTop * zScale).toFixed(1);
  const yZBase = +(secBotY - slicerPlan.actualBaseMm * zScale).toFixed(1);
  const yZTotal = +(secBotY - slicerPlan.totalHeightMm * zScale).toFixed(1);
  const nfcSecW = Math.min(secW * 0.62, plaqueMeta.nfcDiaMm * (secW / Math.max(60, W)));
  const nfcSecX = +(secX + (secW - nfcSecW) * 0.5).toFixed(1);

  let secTeethSvg = '';
  const teethCount = 9;
  const toothStep = (secW - 36) / teethCount;
  for (let t = 0; t < teethCount; t++) {
    if (t % 2 === 0) {
      const tx = (secX + 18 + t * toothStep).toFixed(1);
      secTeethSvg += `<rect x="${tx}" y="${yZTotal}" width="${(toothStep * 0.75).toFixed(1)}" height="${(yZBase - yZTotal).toFixed(1)}" fill="#E04F33" stroke="#111214" stroke-width="1.2"/>`;
    }
  }

  // 3. 220x220mm Nested Build Plate Map
  const mapSizePx = 230;
  const mapLeft = 910;
  const mapTop = 125;
  const bedScale = mapSizePx / nesting.bedSizeMm;
  const mapCx = mapLeft + mapSizePx * 0.5;
  const mapCy = mapTop + mapSizePx * 0.5;

  let nestedItemsSvg = '';
  for (const p of nesting.plaques) {
    const rw = (p.w * bedScale).toFixed(1);
    const rh = (p.h * bedScale).toFixed(1);
    const rxPos = (mapCx + p.cx * bedScale - p.w * bedScale * 0.5).toFixed(1);
    const ryPos = (mapCy - p.cy * bedScale - p.h * bedScale * 0.5).toFixed(1);
    const nfcPx = (mapCx + p.nfcWorldX * bedScale).toFixed(1);
    const nfcPy = (mapCy - p.nfcWorldY * bedScale).toFixed(1);
    const nfcR = (plaqueMeta.nfcDiaMm * 0.5 * bedScale).toFixed(1);
    nestedItemsSvg += `
      <rect x="${rxPos}" y="${ryPos}" width="${rw}" height="${rh}" rx="3" fill="#EAE6DC" stroke="#111214" stroke-width="1.2"/>
      <circle cx="${nfcPx}" cy="${nfcPy}" r="${nfcR}" fill="rgba(212,168,67,0.22)" stroke="#B87A14" stroke-width="1" stroke-dasharray="2.5,2"/>
      <text x="${nfcPx}" y="${(+nfcPy + 3.5).toFixed(1)}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="9" fill="#111214">#${p.index}</text>
    `;
  }
  for (const f of nesting.feet) {
    const fw = (f.w * bedScale).toFixed(1);
    const fh = (f.h * bedScale).toFixed(1);
    const fxPos = (mapCx + f.cx * bedScale - f.w * bedScale * 0.5).toFixed(1);
    const fyPos = (mapCy - f.cy * bedScale - f.h * bedScale * 0.5).toFixed(1);
    nestedItemsSvg += `
      <rect x="${fxPos}" y="${fyPos}" width="${fw}" height="${fh}" rx="2" fill="#D5D8DE" stroke="#474A52" stroke-width="1"/>
    `;
  }

  const dimLeft = mmToSvgX(plaqueMeta.bboxMinX);
  const dimRight = mmToSvgX(plaqueMeta.bboxMaxX);
  const dimBotY = mmToSvgY(plaqueMeta.bboxMinY) + 24;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1190 842" width="1190" height="842">
  <defs>
    <pattern id="hatchBase" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#9A9EA6" stroke-width="1.1"/>
    </pattern>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#111214"/>
    </marker>
  </defs>

  <rect x="0" y="0" width="1190" height="842" fill="#F6F4EE"/>
  <rect x="20" y="20" width="1150" height="802" fill="#FFFFFF" stroke="#111214" stroke-width="2.4"/>
  <rect x="28" y="28" width="1134" height="786" fill="none" stroke="#111214" stroke-width="0.8"/>

  <rect x="28" y="28" width="1134" height="44" fill="#111214"/>
  <text x="44" y="55" font-family="Space Grotesk, Segoe UI, Arial, sans-serif" font-weight="700" font-size="16" fill="#F6F4EE" letter-spacing="1">İMALAT ANTETİ — NFC GÖMÜLÜ &amp; M600 ÇİFT RENK 3D QR OPERATÖR FÖYÜ</text>
  <text x="1146" y="55" text-anchor="end" font-family="JetBrains Mono, Consolas, monospace" font-size="12" fill="#E04F33">ÖLÇÜ BİRİMİ: MM (ISO 2768-m) | TARİH: ${nowStr}</text>

  <!-- View 1: Custom Silhouette Top View -->
  <text x="48" y="98" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="12" fill="#111214">[ 01 / ÜST GÖRÜNÜŞ: ${escapeXml(shapeLabel.toUpperCase())} ]</text>
  <polygon points="${polyPointsAttr}" fill="#F8F6F0" stroke="#111214" stroke-width="2"/>
  <rect x="${mmToSvgX(-plaqueMeta.Wx)}" y="${mmToSvgY(plaqueMeta.Ly)}" width="${(2 * plaqueMeta.Wx * topScale).toFixed(1)}" height="${(2 * plaqueMeta.Ly * topScale).toFixed(1)}" fill="#FFFFFF" stroke="#B6BAC2" stroke-width="0.8" stroke-dasharray="3,2"/>
  ${keyholeSvg}
  ${textsSvg}
  ${qrRectsSvg}
  <circle cx="${nfcDrawCx}" cy="${nfcDrawCy}" r="${nfcDrawR}" fill="none" stroke="#D9381E" stroke-width="1.8" stroke-dasharray="6,4"/>
  <line x1="${nfcDrawCx - 8}" y1="${nfcDrawCy}" x2="${nfcDrawCx + 8}" y2="${nfcDrawCy}" stroke="#D9381E" stroke-width="1"/>
  <line x1="${nfcDrawCx}" y1="${nfcDrawCy - 8}" x2="${nfcDrawCx}" y2="${nfcDrawCy + 8}" stroke="#D9381E" stroke-width="1"/>

  <line x1="${dimLeft}" y1="${dimBotY.toFixed(1)}" x2="${dimRight}" y2="${dimBotY.toFixed(1)}" stroke="#111214" stroke-width="1.2" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
  <text x="${topCx}" y="${(dimBotY + 17).toFixed(1)}" text-anchor="middle" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="11.5" fill="#111214">Zarf Ölçüsü: ${W.toFixed(1)} × ${L.toFixed(1)} mm (${escapeXml(params.En_Boy_Orani || '1:1')})</text>
  <text x="${topCx}" y="${(dimBotY + 35).toFixed(1)}" text-anchor="middle" font-family="JetBrains Mono, Consolas, monospace" font-size="10.5" fill="#D9381E">Gizli İç NFC: Ø${plaqueMeta.nfcDiaMm.toFixed(1)}×${slicerPlan.pocketHeightMm.toFixed(2)}mm | QR V${qrData.version}-${qrData.ecLevel} (${qrData.size}×${qrData.size})</text>

  <line x1="455" y1="72" x2="455" y2="465" stroke="#D4D6DC" stroke-width="1"/>

  <!-- View 2: Magnified Z-Pause Cross Section A-A -->
  <text x="475" y="98" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="12" fill="#111214">[ 02 / KESİT A-A — SLICER Z-DURAKLATMA HARİTASI (ÖLÇEKLİ Z) ]</text>
  <line x1="485" y1="${yZ0}" x2="855" y2="${yZ0}" stroke="#111214" stroke-width="2.2"/>
  <text x="485" y="${yZ0 + 16}" font-family="JetBrains Mono, Consolas, monospace" font-size="10.5" fill="#555860">Z = 0.00 mm (Isıtmalı Tabla Yüzeyi)</text>

  <rect x="${secX}" y="${yZBase}" width="${secW}" height="${(yZ0 - yZBase).toFixed(1)}" fill="url(#hatchBase)" stroke="#111214" stroke-width="1.8"/>
  <rect x="${nfcSecX}" y="${yZNfcTop}" width="${nfcSecW.toFixed(1)}" height="${(yZNfcBot - yZNfcTop).toFixed(1)}" fill="#FFF8E6" stroke="#B87A14" stroke-width="1.8"/>
  <text x="${(secX + secW * 0.5).toFixed(1)}" y="${((yZNfcBot + yZNfcTop) * 0.5 + 4).toFixed(1)}" text-anchor="middle" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="10.5" fill="#8E5B08">NFC YUVA Ø${plaqueMeta.nfcDiaMm.toFixed(0)}×${slicerPlan.pocketHeightMm.toFixed(2)}mm</text>

  ${plaqueMeta.borderStyle === 'Kabartma_Cerceve' ? `
  <rect x="${secX}" y="${yZTotal}" width="12" height="${(yZBase - yZTotal).toFixed(1)}" fill="#E04F33" stroke="#111214" stroke-width="1.2"/>
  <rect x="${secX + secW - 12}" y="${yZTotal}" width="12" height="${(yZBase - yZTotal).toFixed(1)}" fill="#E04F33" stroke="#111214" stroke-width="1.2"/>` : ''}
  ${secTeethSvg}

  <line x1="485" y1="${yZNfcTop}" x2="862" y2="${yZNfcTop}" stroke="#B87A14" stroke-width="2" stroke-dasharray="7,4"/>
  <rect x="480" y="${yZNfcTop - 36}" width="375" height="28" rx="3" fill="#FFF3D1" stroke="#B87A14" stroke-width="1.2"/>
  <text x="490" y="${yZNfcTop - 18}" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="11" fill="#7A4B00">DURAKLATMA #1 (NFC YERLEŞTİR - M601): KATMAN #${slicerPlan.nfcPauseLayer} (Z=${slicerPlan.nfcPauseBedZ.toFixed(2)}mm)</text>

  <line x1="485" y1="${yZBase}" x2="862" y2="${yZBase}" stroke="#D9381E" stroke-width="2.2" stroke-dasharray="7,4"/>
  <rect x="480" y="${yZTotal - 42}" width="375" height="28" rx="3" fill="#FFE8E3" stroke="#D9381E" stroke-width="1.2"/>
  <text x="490" y="${yZTotal - 24}" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="11" fill="#9E1F0B">DURAKLATMA #2 (RENK DEĞİŞİMİ - M600): KATMAN #${slicerPlan.m600PauseLayer} (Z=${slicerPlan.m600PauseBedZ.toFixed(2)}mm)</text>

  <text x="485" y="426" font-family="JetBrains Mono, Consolas, monospace" font-size="11" fill="#111214">• Katman 1–${slicerPlan.bottomFloorLayers}: Alt Taban (${slicerPlan.zNfcBottom.toFixed(2)}mm) | Katman ${slicerPlan.bottomFloorLayers + 1}–${slicerPlan.bottomFloorLayers + slicerPlan.pocketLayers}: Açık NFC Yuvası</text>
  <text x="485" y="445" font-family="JetBrains Mono, Consolas, monospace" font-size="11" fill="#111214">• Katman ${slicerPlan.nfcPauseLayer}–${slicerPlan.baseLayers}: NFC Üst Köprü (${slicerPlan.actualBaseMm.toFixed(2)}mm) | Katman ${slicerPlan.m600PauseLayer}–${slicerPlan.totalLayers}: 2. Renk QR (Z=${slicerPlan.totalHeightMm.toFixed(2)}mm)</text>

  <line x1="878" y1="72" x2="878" y2="465" stroke="#D4D6DC" stroke-width="1"/>

  <!-- View 3: Nested Plate Map -->
  <text x="895" y="98" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="12" fill="#111214">[ 03 / ${nesting.bedSizeMm}×${nesting.bedSizeMm}mm TABLA DİZİLİMİ ]</text>
  <rect x="${mapLeft}" y="${mapTop}" width="${mapSizePx}" height="${mapSizePx}" fill="#F2F3F5" stroke="#111214" stroke-width="1.8"/>
  <rect x="${(mapLeft + nesting.edgeMarginMm * bedScale).toFixed(1)}" y="${(mapTop + nesting.edgeMarginMm * bedScale).toFixed(1)}" width="${((nesting.bedSizeMm - 2 * nesting.edgeMarginMm) * bedScale).toFixed(1)}" height="${((nesting.bedSizeMm - 2 * nesting.edgeMarginMm) * bedScale).toFixed(1)}" fill="none" stroke="#9A9EA6" stroke-width="0.8" stroke-dasharray="4,3"/>
  ${nestedItemsSvg}
  <text x="${mapCx}" y="${mapTop + mapSizePx + 22}" text-anchor="middle" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="11.5" fill="#111214">Maks. Kapasite: ${nesting.maxPerPlate} Adet / Tabla (%${nesting.bedUtilizationPct} Doluluk)</text>
  <text x="${mapCx}" y="${mapTop + mapSizePx + 40}" text-anchor="middle" font-family="JetBrains Mono, Consolas, monospace" font-size="11" fill="#474A52">Sipariş: ${nesting.orderQty} Adet → Toplam ${nesting.totalPlates} Tabla Baskı</text>
  ${isStand ? `<text x="${mapCx}" y="${mapTop + mapSizePx + 57}" text-anchor="middle" font-family="JetBrains Mono, Consolas, monospace" font-size="10.5" fill="#D9381E">+ ${nesting.feet.length} Adet 68° Geçmeli Stand Ayağı Dahil</text>` : ''}

  <line x1="28" y1="472" x2="1162" y2="472" stroke="#111214" stroke-width="1.6"/>

  <!-- Bottom Left: Operator SOP -->
  <text x="48" y="502" font-family="Space Grotesk, Segoe UI, Arial, sans-serif" font-weight="700" font-size="14" fill="#111214">OPERATÖR ÜRETİM TALİMATI &amp; SLICER KURULUM ADIMLARI</text>
  <rect x="48" y="516" width="615" height="278" fill="#FAF9F5" stroke="#111214" stroke-width="1.2"/>
  <text x="64" y="542" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="11.5" fill="#111214">1. SLICER AYARLARI (PrusaSlicer / Bambu Studio / OrcaSlicer / Cura):</text>
  <text x="64" y="562" font-family="Plus Jakarta Sans, Segoe UI, Arial, sans-serif" font-size="12" fill="#222428">• Katman Yüksekliği: ${slicerPlan.layerH.toFixed(2)} mm | Nozzle: 0.40 mm | İç Dolgu: %25 Gyroid | Destek (Support): KAPALI</text>
  <text x="64" y="582" font-family="Plus Jakarta Sans, Segoe UI, Arial, sans-serif" font-size="12" fill="#222428">• Köprüleme (Bridging) Hızı: 25 mm/s, Fan %100 (NFC etiketi üzerini temiz kapatmak için).</text>

  <text x="64" y="612" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="11.5" fill="#8E5B08">2. ADIM — KATMAN #${slicerPlan.nfcPauseLayer} DURAKLATMA (Z = ${slicerPlan.nfcPauseBedZ.toFixed(2)} mm → Slicer Cetveli ${slicerPlan.nfcPauseSlicerRulerZ.toFixed(2)} mm):</text>
  <text x="64" y="632" font-family="Plus Jakarta Sans, Segoe UI, Arial, sans-serif" font-size="12" fill="#222428">• Katman #${slicerPlan.nfcPauseLayer}'e sağ tıklayıp "Add Pause Print (M601 / M0)" ekleyin.</text>
  <text x="64" y="651" font-family="Plus Jakarta Sans, Segoe UI, Arial, sans-serif" font-size="12" fill="#222428">• Yazıcı durduğunda tabladaki #1..#${nesting.maxPerPlate} numaralı Ø${plaqueMeta.nfcDiaMm.toFixed(1)}mm yuvalara NTAG213/215 NFC etiketleri yerleştirin.</text>
  <text x="64" y="670" font-family="Plus Jakarta Sans, Segoe UI, Arial, sans-serif" font-size="12" fill="#222428">• Etiketin üst yüzeyinin Z = ${slicerPlan.nfcPauseBedZ.toFixed(2)} mm sınırını aşmadığını doğrulayıp DEVAM (Resume) tuşuna basın.</text>

  <text x="64" y="700" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="11.5" fill="#9E1F0B">3. ADIM — KATMAN #${slicerPlan.m600PauseLayer} ÇİFT RENK DEĞİŞİMİ (Z = ${slicerPlan.m600PauseBedZ.toFixed(2)} mm → Slicer Cetveli ${slicerPlan.m600PauseSlicerRulerZ.toFixed(2)} mm):</text>
  <text x="64" y="720" font-family="Plus Jakarta Sans, Segoe UI, Arial, sans-serif" font-size="12" fill="#222428">• Katman #${slicerPlan.m600PauseLayer}'e sağ tıklayıp "Change Filament (M600)" ekleyin ve zıt kontrastlı 2. renk filamenti yükleyin.</text>
  <text x="64" y="739" font-family="Plus Jakarta Sans, Segoe UI, Arial, sans-serif" font-size="12" fill="#222428">• Şekil: ${escapeXml(shapeLabel)} | Çerçeve: ${escapeXml(plaqueMeta.borderStyle)} | Yerleşim: ${escapeXml(params.Yerlesim_Duzeni || 'Ust_Baslik_Alt_QR')}</text>

  <text x="64" y="772" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="11" fill="#1E6F4E">[  ] KALİTE KONTROL: Telefon kamerası ile 3D QR okutma testi   [  ] NFC Okuma/URL doğrulama testi</text>

  <!-- Bottom Right: ISO Formal Title Block -->
  <g transform="translate(682, 492)">
    <rect x="0" y="0" width="460" height="302" fill="#FFFFFF" stroke="#111214" stroke-width="1.8"/>
    <rect x="0" y="0" width="460" height="34" fill="#111214"/>
    <text x="14" y="22" font-family="Space Grotesk, Segoe UI, Arial, sans-serif" font-weight="700" font-size="13.5" fill="#FFFFFF">TEKNİK İMALAT ANTETİ &amp; PARTİ ÖZETİ</text>

    <line x1="0" y1="68" x2="460" y2="68" stroke="#111214" stroke-width="1"/>
    <line x1="0" y1="102" x2="460" y2="102" stroke="#111214" stroke-width="1"/>
    <line x1="0" y1="136" x2="460" y2="136" stroke="#111214" stroke-width="1"/>
    <line x1="0" y1="170" x2="460" y2="170" stroke="#111214" stroke-width="1"/>
    <line x1="0" y1="204" x2="460" y2="204" stroke="#111214" stroke-width="1"/>
    <line x1="0" y1="238" x2="460" y2="238" stroke="#111214" stroke-width="1"/>
    <line x1="0" y1="270" x2="460" y2="270" stroke="#111214" stroke-width="1"/>
    <line x1="165" y1="34" x2="165" y2="302" stroke="#111214" stroke-width="1"/>

    <text x="12" y="55" font-family="JetBrains Mono, monospace" font-size="11" fill="#555860">Tip &amp; Gövde Şekli</text>
    <text x="177" y="55" font-family="JetBrains Mono, monospace" font-weight="700" font-size="11" fill="#111214">${escapeXml(productLabel)}</text>

    <text x="12" y="89" font-family="JetBrains Mono, monospace" font-size="11" fill="#555860">QR_Baglanti_URL</text>
    <text x="177" y="89" font-family="JetBrains Mono, monospace" font-weight="700" font-size="10.5" fill="#111214">${escapeXml(qrData.text.slice(0, 38))}</text>

    <text x="12" y="123" font-family="JetBrains Mono, monospace" font-size="11" fill="#555860">Başlık / Alt Metin</text>
    <text x="177" y="123" font-family="JetBrains Mono, monospace" font-weight="700" font-size="10.5" fill="#111214">${escapeXml([params.Ust_Baslik_Metni, params.Alt_Metin].filter(Boolean).join(' / ') || '(Yok)')}</text>

    <text x="12" y="157" font-family="JetBrains Mono, monospace" font-size="11" fill="#555860">Boyut &amp; Kalınlık</text>
    <text x="177" y="157" font-family="JetBrains Mono, monospace" font-weight="700" font-size="11" fill="#111214">${W.toFixed(1)}×${L.toFixed(1)} mm | Taban ${slicerPlan.actualBaseMm.toFixed(2)} + QR ${slicerPlan.actualEmbossMm.toFixed(2)} mm</text>

    <text x="12" y="191" font-family="JetBrains Mono, monospace" font-size="11" fill="#555860">Duraklatma Katmanları</text>
    <text x="177" y="191" font-family="JetBrains Mono, monospace" font-weight="700" font-size="11" fill="#D9381E">NFC: #${slicerPlan.nfcPauseLayer} (${slicerPlan.nfcPauseBedZ.toFixed(2)}mm) | M600: #${slicerPlan.m600PauseLayer} (${slicerPlan.m600PauseBedZ.toFixed(2)}mm)</text>

    <text x="12" y="225" font-family="JetBrains Mono, monospace" font-size="11" fill="#555860">Malzeme &amp; Birim Kütle</text>
    <text x="177" y="225" font-family="JetBrains Mono, monospace" font-weight="700" font-size="11" fill="#111214">${escapeXml(pricing.materialKey)} | ${pricing.unitMassG.toFixed(2)} g (${pricing.baseMassG}g + ${pricing.embossMassG}g)</text>

    <text x="12" y="258" font-family="JetBrains Mono, monospace" font-size="11" fill="#555860">Siparis_Adedi / Tabla</text>
    <text x="177" y="258" font-family="JetBrains Mono, monospace" font-weight="700" font-size="11" fill="#111214">${nesting.orderQty} Adet | ${nesting.totalPlates} Tabla (${nesting.maxPerPlate} Adet/Tabla)</text>

    <text x="12" y="290" font-family="JetBrains Mono, monospace" font-size="11" fill="#555860">Toplam Süre &amp; B2B Net</text>
    <text x="177" y="290" font-family="JetBrains Mono, monospace" font-weight="700" font-size="11" fill="#1E6F4E">${pricing.activeQuote.totalPrintHours} Saat | ${pricing.activeQuote.totalNetTry.toLocaleString('tr-TR')} TL + KDV</text>
  </g>
</svg>`;
}

export function generateB2BPricingCsv(params, qrData, slicerPlan, nesting, pricing) {
  const sep = ';';
  const q = pricing.activeQuote;
  const rows = [
    ['B2B PROMOSYON NFC GÖMÜLÜ & 3D KABARTMALI QR ÜRETİM VE MALİYET TEKLİFİ'],
    ['Oluşturma Tarihi', new Date().toISOString().slice(0, 19).replace('T', ' ')],
    [],
    ['1. PARAMETRİK ÜRÜN, TASARIM VE SLICER ÖZETİ', 'DEĞER', 'BİRİM / AÇIKLAMA'],
    ['Urun_Tipi', params.Urun_Tipi, params.Urun_Tipi === 'Angled_Stand' ? '68° Masaüstü Stand (+2 Geçmeli Ayak)' : 'Anahtarlık / Rozet'],
    ['Govde_Sekli & En_Boy_Orani', `${params.Govde_Sekli || 'Yuvarlatilmis_Kare'} (${params.En_Boy_Orani || '1:1'})`, `Çerçeve: ${params.Cerceve_Stili || 'Kabartma_Cerceve'} | Halka: ${params.Halka_Konumu || '-'}`],
    ['QR_Baglanti_URL', qrData.text, `QR Versiyon V${qrData.version}-${qrData.ecLevel} (${qrData.size}x${qrData.size} Modül)`],
    ['Ust_Baslik_Metni', params.Ust_Baslik_Metni || '-', `Font: ${params.Yazi_Fontu || 'Modern_Sans'} | İkon: ${params.Sembol_Ikon || 'Yok'}`],
    ['Alt_Metin', params.Alt_Metin || '-', `Yerleşim: ${params.Yerlesim_Duzeni || 'Ust_Baslik_Alt_QR'}`],
    ['Taban_En_Boy_mm', params.Taban_En_Boy_mm, 'mm'],
    ['Taban_Kalinligi_mm', slicerPlan.actualBaseMm.toFixed(2), `mm (${slicerPlan.baseLayers} Katman)`],
    ['QR_Kabartma_mm', slicerPlan.actualEmbossMm.toFixed(2), `mm (${slicerPlan.embossLayers} Katman)`],
    ['Katman_Yuksekligi_mm', slicerPlan.layerH.toFixed(2), `mm (Toplam ${slicerPlan.totalLayers} Katman / ${slicerPlan.totalHeightMm.toFixed(2)} mm)`],
    ['NFC_Yuva_Capi_mm', `${params.NFC_Yuva_Capi_mm} x ${slicerPlan.pocketHeightMm.toFixed(2)}`, `mm (Duraklatma #1: Katman #${slicerPlan.nfcPauseLayer} / Z=${slicerPlan.nfcPauseBedZ.toFixed(2)}mm)`],
    ['M600 Renk Geçişi', `Katman #${slicerPlan.m600PauseLayer}`, `Z=${slicerPlan.m600PauseBedZ.toFixed(2)}mm (Slicer Cetveli ${slicerPlan.m600PauseSlicerRulerZ.toFixed(2)}mm)`],
    ['Tabla_Boyutu_mm', `${nesting.bedSizeMm}x${nesting.bedSizeMm}`, `Maks. ${nesting.maxPerPlate} Adet/Tabla (%${nesting.bedUtilizationPct} Doluluk)`],
    ['Malzeme ve Birim Ağırlık', pricing.materialLabel, `${pricing.unitMassG} g/adet (Taban: ${pricing.baseMassG}g + Kabartma: ${pricing.embossMassG}g)`],
    [],
    ['2. AKTİF SİPARİŞ MALİYET KIRILIMI', 'DEĞER', 'PARA BİRİMİ / DETAY'],
    ['Siparis_Adedi', q.qty, 'Adet'],
    ['Gereken Toplam Tabla Baskısı', q.plates, `Tabla (${nesting.maxPerPlate} adet/tabla kapasite)`],
    ['Toplam Tahmini Baskı Süresi', String(q.totalPrintHours).replace('.', ','), 'Saat'],
    ['Toplam Filament Tüketimi (%6 Fire Dahil)', String(q.totalFilamentKg).replace('.', ','), 'kg'],
    ['Birim Filament Maliyeti', String(q.unitFilamentCostTry).replace('.', ','), 'TRY / Adet'],
    ['Birim NFC Etiket Maliyeti (NTAG213/215)', String(q.nfcTagUnitCostTry).replace('.', ','), 'TRY / Adet'],
    ['Birim Makine + Operatör İşçilik Payı', String(q.unitMfgOverheadTry).replace('.', ','), 'TRY / Adet'],
    ['Birim Toplam Üretim Maliyeti', String(q.unitRawCostTry).replace('.', ','), 'TRY / Adet'],
    ['Uygulanan B2B İskonto Kademesi', q.discountLabel, 'Hacimsel Fiyatlandırma'],
    ['Birim B2B Net Satış Fiyatı', String(q.unitSaleNetTry).replace('.', ','), 'TRY / Adet (KDV Hariç)'],
    ['Sipariş Ara Toplam (Net)', String(q.totalNetTry).replace('.', ','), 'TRY'],
    ['KDV (%20)', String(q.vatTry).replace('.', ','), 'TRY'],
    ['GENEL TOPLAM (KDV DAHİL)', String(q.grandTotalTry).replace('.', ','), 'TRY'],
    [],
    ['3. B2B KADEMELİ ADET FİYAT TABLOSU', 'TABLA SAYISI', 'SÜRE (SAAT)', 'BİRİM MALİYET (TRY)', 'BİRİM SATIŞ NET (TRY)', 'TOPLAM NET (TRY)', 'KDV DAHİL TOPLAM (TRY)', 'KADEME']
  ];

  for (const t of pricing.tiers) {
    rows.push([
      `${t.qty} Adet`,
      t.plates,
      String(t.totalPrintHours).replace('.', ','),
      String(t.unitRawCostTry).replace('.', ','),
      String(t.unitSaleNetTry).replace('.', ','),
      String(t.totalNetTry).replace('.', ','),
      String(t.grandTotalTry).replace('.', ','),
      t.discountLabel
    ]);
  }

  const csvContent = rows
    .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(sep))
    .join('\r\n');

  return '\uFEFF' + csvContent;
}

export function generateProfileDxf(plaqueMeta, qrData) {
  const lines = [
    '0', 'SECTION', '2', 'HEADER',
    '9', '$INSUNITS', '70', '4',
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES'
  ];

  // Exact custom outer silhouette LWPOLYLINE
  const outer = plaqueMeta.outerLoopCCW;
  lines.push('0', 'LWPOLYLINE', '8', 'OUTER_SILHOUETTE_MM', '90', String(outer.length), '70', '1');
  for (const p of outer) {
    lines.push('10', p.x.toFixed(3), '20', p.y.toFixed(3));
  }

  if (plaqueMeta.keyholeCenter) {
    lines.push(
      '0', 'CIRCLE', '8', 'KEYHOLE_BORE',
      '10', plaqueMeta.keyholeCenter.x.toFixed(3),
      '20', plaqueMeta.keyholeCenter.y.toFixed(3),
      '40', '2.600'
    );
  }

  lines.push(
    '0', 'CIRCLE', '8', 'NFC_POCKET_HIDDEN',
    '10', plaqueMeta.nfcCenterX.toFixed(3),
    '20', plaqueMeta.nfcCenterY.toFixed(3),
    '40', (plaqueMeta.nfcDiaMm * 0.5).toFixed(3)
  );

  const addRectLwPolyline = (x0, y0, x1, y1, layer) => {
    lines.push(
      '0', 'LWPOLYLINE', '8', layer, '90', '4', '70', '1',
      '10', x0.toFixed(3), '20', y0.toFixed(3),
      '10', x1.toFixed(3), '20', y0.toFixed(3),
      '10', x1.toFixed(3), '20', y1.toFixed(3),
      '10', x0.toFixed(3), '20', y1.toFixed(3)
    );
  };

  const mod = plaqueMeta.qrSizeMm / qrData.size;
  const xMin = plaqueMeta.xQrMin;
  const yMax = plaqueMeta.yQrMax;
  for (let r = 0; r < qrData.size; r++) {
    for (let c = 0; c < qrData.size; c++) {
      if (qrData.get(r, c)) {
        const x0 = xMin + c * mod;
        const y1 = yMax - r * mod;
        addRectLwPolyline(x0, y1 - mod, x0 + mod, y1, 'QR_EMBOSS');
      }
    }
  }

  lines.push('0', 'ENDSEC', '0', 'EOF');
  return lines.join('\r\n');
}

export function generateOpenScadScript(params, qrData, plaqueMeta, slicerPlan) {
  const rowsStr = [];
  for (let r = 0; r < qrData.size; r++) {
    const rowVals = [];
    for (let c = 0; c < qrData.size; c++) rowVals.push(qrData.get(r, c));
    rowsStr.push(`  [${rowVals.join(',')}]`);
  }

  const polyPts = plaqueMeta.outerLoopCCW.map((p) => `[${p.x.toFixed(3)},${p.y.toFixed(3)}]`).join(', ');

  return `// Özelleştirilmiş NFC & 3D QR Konfigüratörü — Parametrik OpenSCAD Çıktısı (1 birim = 1 mm)
// Şekil: ${plaqueMeta.shapeType} | Urun_Tipi: ${params.Urun_Tipi} | URL: ${qrData.text}

Taban_Kalinligi_mm = ${slicerPlan.actualBaseMm};
QR_Kabartma_mm = ${slicerPlan.actualEmbossMm};
NFC_Yuva_Capi_mm = ${plaqueMeta.nfcDiaMm};
NFC_Yuva_Yuksekligi_mm = ${slicerPlan.pocketHeightMm};
NFC_Alt_Z_mm = ${slicerPlan.zNfcBottom};
QR_Alan_mm = ${plaqueMeta.qrSizeMm};
QR_Boyut = ${qrData.size};
$fn = 64;

outer_pts = [${polyPts}];
qr_matrix = [
${rowsStr.join(',\n')}
];

difference() {
  union() {
    linear_extrude(height = Taban_Kalinligi_mm)
      polygon(points = outer_pts);
    mod_p = QR_Alan_mm / QR_Boyut;
    for (r = [0 : QR_Boyut - 1])
      for (c = [0 : QR_Boyut - 1])
        if (qr_matrix[r][c] == 1)
          translate([${plaqueMeta.xQrMin} + c*mod_p, ${plaqueMeta.yQrMax} - (r+1)*mod_p, Taban_Kalinligi_mm])
            cube([mod_p + 0.01, mod_p + 0.01, QR_Kabartma_mm]);
  }
  translate([${plaqueMeta.nfcCenterX}, ${plaqueMeta.nfcCenterY}, NFC_Alt_Z_mm])
    cylinder(d = NFC_Yuva_Capi_mm, h = NFC_Yuva_Yuksekligi_mm);
  ${plaqueMeta.keyholeCenter ? `translate([${plaqueMeta.keyholeCenter.x}, ${plaqueMeta.keyholeCenter.y}, -0.1]) cylinder(r = 2.6, h = Taban_Kalinligi_mm + QR_Kabartma_mm + 1);` : ''}
}
`;
}
